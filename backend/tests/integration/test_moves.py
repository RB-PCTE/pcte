"""
End-to-end coverage of the Phase A step-6 write path against a running API and
the real database.

Converted from the ad-hoc `verify_step6.py` script. Every assertion the script
made is preserved; what changed is that cleanup is now automatic (see the `run`
fixture in ../conftest.py) rather than a SQL snippet printed for a human to
review.

## Requirements

- `uvicorn app.main:app` already running (`BASE_URL`, default
  http://localhost:8000)
- `ADMIN_TOKEN`  — JWT for a user with `profiles.role = 'admin'`
- `USER_TOKEN`   — JWT for a NON-admin user

Without both tokens the whole module skips. It never falls back to
unauthenticated calls.

## Triage: STEP-5 vs STEP-6

Some assertions here read *computed* fields that `GET /state` derives rather
than stores — `in_transit`, `location_display`, the resolved `*_location_name`
fields, `age_label`, `calibration`. A failure on one of those is a read-path
(step 5) bug even though it surfaces in a write-path test suite. Those lines
carry an inline `# STEP-5 (read path)` marker so triage doesn't have to be
re-derived from scratch. Everything unmarked is step-6 write-path behaviour.

## Structure

`test_move_lifecycle` is deliberately one long function. The sequence is
stateful — a move can't be receipted before it's opened, and the
409-on-second-move check is meaningless unless `current_move_id` is actually
set — so splitting it would let later assertions pass vacuously. The other
tests are genuine guard rails with no ordering relationship to it, and the
two that *could* have been order-sensitive are written to compare against
state they read themselves rather than against hardcoded creation values.
"""

from __future__ import annotations

import os
import warnings

import pytest

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (os.environ.get("ADMIN_TOKEN") and os.environ.get("USER_TOKEN")),
        reason="integration test: set ADMIN_TOKEN and USER_TOKEN (see backend/README.md)",
    ),
]

CARRIER = "VERIFY-CARRIER"
TRACKING = "VERIFY-TRACK-1"
CONDITION = "pass"


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def _get_state(api, headers) -> dict:
    response = api.get("/state", headers=headers)
    # STEP-5 (read path): if this fails, the read endpoint is broken
    # independently of anything step 6 wrote.
    assert response.status_code == 200, (
        f"GET /state returned {response.status_code}: {response.text[:400]}"
    )
    return response.json()


def _find(items: list[dict], key: str, value) -> dict | None:
    return next((item for item in items if str(item.get(key)) == str(value)), None)


def _state_equipment(api, headers, equipment_id: str) -> dict:
    found = _find(_get_state(api, headers)["equipment"], "id", equipment_id)
    assert found is not None, f"equipment {equipment_id} is missing from GET /state"
    return found


def _state_move(api, headers, move_id: str) -> dict:
    found = _find(_get_state(api, headers)["moves"], "id", move_id)
    assert found is not None, f"move {move_id} is missing from GET /state"
    return found


# --------------------------------------------------------------------------
# Fixtures — the setup chain. Requesting any one of these builds every
# prerequisite, so a single test run with -k still executes against real state.
# --------------------------------------------------------------------------


@pytest.fixture(scope="module")
def admin_id(api, admin_headers) -> str:
    response = api.get("/auth/whoami", headers=admin_headers)
    assert response.status_code == 200, f"ADMIN_TOKEN rejected: {response.status_code} {response.text}"
    return response.json()["user_id"]


@pytest.fixture(scope="module")
def user_id(api, user_headers) -> str:
    response = api.get("/auth/whoami", headers=user_headers)
    assert response.status_code == 200, f"USER_TOKEN rejected: {response.status_code} {response.text}"
    return response.json()["user_id"]


@pytest.fixture(scope="module")
def locations(api, admin_headers, run) -> dict:
    """A home and a destination location, created by this run.

    The tests never depend on pre-existing location data — they make their own,
    so the suite works against an empty database.
    """
    made = {}
    for key, category in (("home", "warehouse"), ("dest", "office")):
        response = api.post(
            "/locations",
            headers=admin_headers,
            json={"name": run.name(key), "category": category},
        )
        assert response.status_code == 200, (
            f"could not create the {key} location: {response.status_code} {response.text}"
        )
        body = response.json()
        run.add_location(body["id"])
        made[key] = body
    return made


@pytest.fixture(scope="module")
def equipment(api, admin_headers, locations, run) -> dict:
    """Equipment created at the home location, plus a GET /state snapshot taken
    immediately afterwards.

    The snapshot exists so `test_equipment_creation_seeds_equipment_state` can
    assert on as-created state no matter when it runs — `test_move_lifecycle`
    relocates this equipment, and hardcoding the home location in that test
    would make it order-dependent.
    """
    response = api.post(
        "/equipment",
        headers=admin_headers,
        json={
            "name": run.name("rig"),
            "category": "GPR",
            "serial": run.name("SN"),
            "home_location_id": locations["home"]["id"],
            "notes": "created by tests/integration/test_moves.py",
        },
    )
    assert response.status_code == 200, (
        f"could not create equipment: {response.status_code} {response.text}"
    )
    created = response.json()
    run.add_equipment(created["id"])

    return {
        "created": created,
        "state_at_creation": _state_equipment(api, admin_headers, created["id"]),
    }


# --------------------------------------------------------------------------
# Guard rails
# --------------------------------------------------------------------------


def test_environment_is_usable(api, user_headers, admin_id, user_id, run):
    """Fail fast and specifically if the tokens or server aren't what the rest
    of the module assumes."""
    health = api.get("/health")
    assert health.status_code == 200, f"server not reachable: {health.status_code}"
    assert health.json() == {"status": "ok"}

    assert admin_id != user_id, (
        "ADMIN_TOKEN and USER_TOKEN are the same user — the 403 and created_by "
        "assertions need two different accounts"
    )

    # Confirms USER_TOKEN really lacks admin before other tests rely on 403s.
    # Tagged so the row is swept by teardown in the (misconfigured) case where
    # this unexpectedly succeeds.
    probe = api.post(
        "/locations", headers=user_headers, json={"name": run.name("probe"), "category": "office"}
    )
    if probe.status_code == 200:
        run.add_location(probe.json()["id"])
    assert probe.status_code == 403, (
        f"USER_TOKEN is not a non-admin: POST /locations returned {probe.status_code}"
    )


def test_locations_readable_by_any_user(api, user_headers, locations):
    response = api.get("/locations", headers=user_headers)
    assert response.status_code == 200, (
        f"GET /locations should be open to any authenticated user, got {response.status_code}"
    )

    listed = response.json()
    for key in ("home", "dest"):
        assert _find(listed, "id", locations[key]["id"]) is not None, (
            f"the {key} location is missing from GET /locations"
        )


def test_equipment_creation_seeds_equipment_state(equipment, locations):
    """POST /equipment must create the equipment_state row too — nothing else
    does, and GET /state LEFT JOINs it."""
    home_id = locations["home"]["id"]
    created = equipment["created"]

    assert created["current_location_id"] == home_id, (
        f"new equipment should start at its home base, got {created['current_location_id']}"
    )
    assert created["status"] == "available", f"expected 'available', got {created['status']}"
    assert created["current_move_id"] is None, "new equipment should not be mid-move"

    # The state row's existence is what's really under test: these fields are
    # null in GET /state unless equipment_state was created alongside.
    snapshot = equipment["state_at_creation"]
    assert snapshot["status"] == "available", (
        f"equipment_state row missing or wrong at creation: status={snapshot['status']}"
    )
    assert snapshot["current_location_id"] == home_id, (
        f"expected current_location_id {home_id}, got {snapshot['current_location_id']}"
    )
    assert snapshot["current_move_id"] is None
    assert snapshot["in_transit"] is False  # STEP-5 (read path): derived from current_move_id


def test_non_admin_cannot_write_equipment(api, user_headers, equipment, run):
    response = api.post(
        "/equipment", headers=user_headers, json={"name": run.name("nope"), "category": "lab"}
    )
    if response.status_code == 200:  # pragma: no cover - only on a gating regression
        run.add_equipment(response.json()["id"])
    assert response.status_code == 403, (
        f"POST /equipment must be admin-only, got {response.status_code}"
    )

    response = api.patch(
        f"/equipment/{equipment['created']['id']}",
        headers=user_headers,
        json={"notes": "should not apply"},
    )
    assert response.status_code == 403, (
        f"PATCH /equipment must be admin-only, got {response.status_code}"
    )


def test_patch_rejects_state_owned_fields(api, admin_headers, equipment, locations):
    """current_location_id, status, and condition belong to equipment_state
    and move only via POST /moves and the receipt endpoint. PATCH must reject
    them outright, not quietly drop them."""
    equipment_id = equipment["created"]["id"]

    # Read current state rather than assuming creation values — this test must
    # hold whether or not test_move_lifecycle has already relocated the rig.
    before = _state_equipment(api, admin_headers, equipment_id)

    rejected = {
        "current_location_id": {"current_location_id": locations["dest"]["id"]},
        "status": {"status": "on_hire"},
        "condition": {"condition": "pass"},
        "empty body": {},
    }
    for label, body in rejected.items():
        response = api.patch(f"/equipment/{equipment_id}", headers=admin_headers, json=body)
        assert response.status_code == 422, (
            f"PATCH with {label} should be 422, got {response.status_code}: {response.text[:200]}"
        )

    # Prove the rejections above aren't just PATCH being broken.
    response = api.patch(
        f"/equipment/{equipment_id}", headers=admin_headers, json={"notes": "patched"}
    )
    assert response.status_code == 200, (
        f"a structural-field PATCH should succeed, got {response.status_code}: {response.text[:200]}"
    )
    patched = response.json()
    assert patched["notes"] == "patched"
    assert patched["current_location_id"] == before["current_location_id"], (
        "PATCH changed current_location_id"
    )
    assert patched["status"] == before["status"], "PATCH changed status"
    assert patched["condition"] == before["condition"], "PATCH changed condition"


def test_move_creation_rejects_server_derived_fields(api, user_headers, equipment, locations, run):
    """status_from, from_location_id and created_by are read server-side. A
    client sending them must get a 422 — silently ignoring them would let a
    caller believe they'd recorded something they hadn't.

    All three attempts fail Pydantic validation before any database work, so
    this test creates no rows and has no ordering relationship to the lifecycle.
    """
    valid = {
        "equipment_id": equipment["created"]["id"],
        "to_location_id": locations["dest"]["id"],
        "move_type": "office_transfer",
        "status_to": "on_hire",
    }
    smuggled = {
        "status_from": "quarantined",
        "from_location_id": locations["dest"]["id"],
        "created_by": equipment["created"]["id"],
    }

    for field, value in smuggled.items():
        response = api.post("/moves", headers=user_headers, json={**valid, field: value})
        if response.status_code == 200:  # pragma: no cover - only on a validation regression
            run.add_move(response.json()["id"])
        assert response.status_code == 422, (
            f"POST /moves with a client-supplied {field} should be 422, "
            f"got {response.status_code}: {response.text[:200]}"
        )


# --------------------------------------------------------------------------
# The lifecycle — deliberately one function, see the module docstring
# --------------------------------------------------------------------------


def test_move_lifecycle(api, admin_headers, user_headers, user_id, equipment, locations, run):
    equipment_id = equipment["created"]["id"]
    home_id = locations["home"]["id"]
    dest_id = locations["dest"]["id"]

    before = _state_equipment(api, admin_headers, equipment_id)
    assert before["current_move_id"] is None, (
        "equipment already has an open move before the lifecycle starts"
    )
    status_before = before["status"]
    location_before = before["current_location_id"]

    # -- open the move (any authenticated user, not admin) -------------------
    move_body = {
        "equipment_id": equipment_id,
        "to_location_id": dest_id,
        "move_type": "office_transfer",
        "status_to": "on_hire",
        "notes": run.name("outbound"),
        "carrier": CARRIER,
        "tracking_number": TRACKING,
    }
    response = api.post("/moves", headers=user_headers, json=move_body)
    assert response.status_code == 200, (
        f"POST /moves should succeed for a non-admin, got {response.status_code}: "
        f"{response.text[:300]}"
    )
    move = response.json()
    run.add_move(move["id"])

    assert move["status_from"] == status_before, (
        f"status_from must come from equipment_state ({status_before}), got {move['status_from']}"
    )
    assert move["from_location_id"] == location_before, (
        f"from_location_id must come from equipment_state ({location_before}), "
        f"got {move['from_location_id']}"
    )
    assert str(move["created_by"]) == str(user_id), (
        f"created_by must be the authenticated caller ({user_id}), got {move['created_by']}"
    )
    assert move["status_to"] == "on_hire", "status_to should be exactly what the client asked for"
    assert move["moved_at"], "moved_at should have defaulted to now() server-side"

    logistics = move["logistics"]
    assert logistics is not None, "a move_logistics row must be created alongside every move"
    assert logistics["carrier"] == CARRIER
    assert logistics["tracking_number"] == TRACKING
    assert logistics["received_at"] is None
    assert logistics["received_by"] is None
    assert logistics["condition_result"] is None
    assert logistics["condition_notes"] is None

    # -- mid-move: flagged in transit, but hasn't physically moved -----------
    mid = _state_equipment(api, admin_headers, equipment_id)
    assert str(mid["current_move_id"]) == str(move["id"])
    assert mid["in_transit"] is True  # STEP-5 (read path): derived from current_move_id
    assert mid["current_location_id"] == location_before, (
        "POST /moves must not change current_location_id — the equipment hasn't arrived yet"
    )
    assert mid["status"] == status_before, (
        "POST /moves must not change status — that happens on receipt"
    )
    assert _state_move(api, admin_headers, move["id"])["logistics"] is not None

    # -- a second move while the first is open is a conflict -----------------
    response = api.post(
        "/moves",
        headers=user_headers,
        json={**move_body, "to_location_id": home_id, "carrier": None, "tracking_number": None},
    )
    if response.status_code == 200:  # pragma: no cover - only on a locking regression
        run.add_move(response.json()["id"])
    assert response.status_code == 409, (
        f"a second move on mid-move equipment should be 409, got {response.status_code}: "
        f"{response.text[:200]}"
    )

    # -- receipt -------------------------------------------------------------
    response = api.post(
        f"/moves/{move['id']}/receipt",
        headers=user_headers,
        json={"condition_result": CONDITION, "condition_notes": run.name("arrived intact")},
    )
    assert response.status_code == 200, (
        f"receipt should succeed, got {response.status_code}: {response.text[:300]}"
    )
    receipted = response.json()["logistics"]
    assert receipted["received_at"] is not None
    assert str(receipted["received_by"]) == str(user_id), (
        f"received_by must be the authenticated caller ({user_id}), got {receipted['received_by']}"
    )
    assert receipted["condition_result"] == CONDITION
    assert receipted["carrier"] == CARRIER, (
        "the receipt must UPDATE the existing move_logistics row, not replace it — "
        "the shipping fields are gone"
    )
    assert receipted["tracking_number"] == TRACKING

    # -- state after receipt -------------------------------------------------
    state = _get_state(api, admin_headers)
    assert sum(1 for m in state["moves"] if str(m["id"]) == str(move["id"])) == 1, (
        "exactly one move row expected — move_logistics.move_id is a PK, so a "
        "duplicate would mean the receipt inserted instead of updating"
    )

    after_move = _find(state["moves"], "id", move["id"])
    after_logistics = after_move["logistics"]
    assert after_logistics["received_at"] is not None
    assert after_logistics["condition_result"] == CONDITION
    assert after_logistics["condition_notes"] == run.name("arrived intact")
    assert after_logistics["carrier"] == CARRIER, "shipping fields lost — not the same row"
    assert after_logistics["tracking_number"] == TRACKING

    after_equipment = _find(state["equipment"], "id", equipment_id)
    assert after_equipment["current_move_id"] is None, (
        "receipt must clear current_move_id, or the equipment reads as in-transit forever"
    )
    assert after_equipment["current_location_id"] == dest_id, (
        f"equipment should now be at the move's to_location_id ({dest_id}), "
        f"got {after_equipment['current_location_id']}"
    )
    # Uncomment to confirm failures report clearly, then comment out again:
    # assert after_equipment["current_location_id"] == home_id
    assert after_equipment["status"] == "on_hire", (
        f"equipment status should be the move's status_to, got {after_equipment['status']}"
    )
    assert after_equipment["condition"] == CONDITION, (
        f"equipment_state.condition should be set from the receipt's condition_result, "
        f"got {after_equipment['condition']}"
    )
    assert after_equipment["in_transit"] is False  # STEP-5 (read path)

    # -- receipting twice is a conflict --------------------------------------
    response = api.post(
        f"/moves/{move['id']}/receipt",
        headers=user_headers,
        json={"condition_result": CONDITION},
    )
    assert response.status_code == 409, (
        f"receipting an already-received move should be 409, got {response.status_code}: "
        f"{response.text[:200]}"
    )

    # -- end-to-end reconciliation (this section exercises step 5) -----------
    # STEP-5 (read path): everything below reads computed/joined fields rather
    # than stored ones. A failure here is a read-path bug, not a write-path one.
    assert after_equipment["current_location_name"] == run.name("dest"), (
        f"location id not resolved to a name: {after_equipment['current_location_name']}"
    )
    assert after_equipment["location_display"]["in_transit"] is False
    assert run.name("dest") in after_equipment["location_display"]["text"], (
        f"location_display is stale: {after_equipment['location_display']}"
    )
    assert after_move["from_location_name"] == run.name("home")
    assert after_move["to_location_name"] == run.name("dest")

    # Observations, not failures — the original script flagged these for a human
    # rather than failing on them, and that judgement still stands.
    if after_equipment.get("calibration_required") is None:
        warnings.warn(
            "STEP-5 (read path): calibration_required is null, but EquipmentOut "
            "types it as a non-optional bool — GET /state will fail validation "
            "for any pre-existing row in that state",
            stacklevel=1,
        )
    if after_move.get("created_by_name") is None:
        warnings.warn(
            f"STEP-5 (read path): move.created_by_name is null — no public.profiles "
            f"row for {user_id}? Cosmetic, but the UI shows this field",
            stacklevel=1,
        )
