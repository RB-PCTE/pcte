# Fleet Tracker backend

FastAPI backend that becomes the single writer to the Fleet Tracker Supabase
Postgres DB. See `REBUILD_PLAN.md` in the project root for the full plan;
this covers Phase A steps 3–6 (foundation + auth + the `GET /state` read path
+ the equipment/location/move write path) so far.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# fill in DB_A_URL with the real Supabase connection string
```

## Run

```bash
uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

## Auth

JWTs issued by Supabase Auth are verified locally against the project's
JWKS endpoint (`SUPABASE_JWKS_URL`) — no per-request round-trip to Supabase.

- `get_current_user` (in `app/auth.py`): reads the `Authorization: Bearer
  <token>` header, verifies the signature against the cached JWKS, and checks
  the `aud` (`"authenticated"`) and `iss` (Supabase project issuer URL,
  derived from `SUPABASE_JWKS_URL`) claims. Returns
  `{"user_id": ..., "email": ...}`. Returns 401 with a specific reason
  (missing header, expired token, bad signature, invalid audience/issuer,
  malformed token, unresolvable signing key) rather than one generic message.
- `require_admin`: `get_current_user` plus a `profiles.role` lookup against
  DB A. Returns 403 if the caller isn't an admin, and 403 (not 404) if the
  caller has no `profiles` row at all — so an unauthenticated caller can't
  probe which user IDs exist.
- `GET /auth/whoami`: temporary manual-testing endpoint — depends on
  `get_current_user` and echoes back the resolved `user_id`/`email`. Remove
  this route once real routers exist (Phase A step 5+) and there's a proper
  authenticated endpoint to test against instead.

## State

`GET /state` replaces the old frontend's `adapter.load()` — it's the single
read endpoint the frontend calls to get everything it needs to render.
Depends on `get_current_user` only (no admin gating): every authenticated
user gets the identical full response, there's no per-role filtering.

At a high level, the response has two lists:

- **`equipment`** — every equipment row joined with its `equipment_state`
  and with `home_location_id`/`current_location_id` resolved to location
  names. Each item also carries computed fields the frontend used to work
  out itself: an `age_label` (from `purchase_date`), a `calibration` object
  (`null` unless calibration is required — otherwise `status` of `ok` /
  `due_soon` / `overdue` / `unknown` plus the computed `due_date`), an
  `in_transit` flag (true iff `equipment_state.current_move_id` is set —
  this is the only source of "in transit", not a stored status value), and
  a `location_display` object with display-ready text.
- **`moves`** — every move row joined with its `move_logistics` row (`null`
  until a move has been booked/received), with `from_location_id`/
  `to_location_id` resolved to names and `created_by` resolved to the
  creating user's `display_name`.

`corrections` is not queried or included in this response — out of scope
for this endpoint.

## Equipment

Both endpoints are admin-only (`require_admin`). There is no `GET /equipment`
— reads go through `GET /state`, which has the computed view model.

- **`POST /equipment`** creates the equipment row **and its
  `equipment_state` row in the same transaction**, with `status = 'available'`,
  `current_move_id = null`, and `current_location_id = home_location_id` —
  equipment starts at its home base until something actually moves it. Nothing
  else in the system creates that state row, and `GET /state` LEFT JOINs it, so
  without this new equipment would render with a blank location and no status
  (the original blank-location bug, fixed at the source). `home_location_id` is
  optional because the column is nullable; omit it and the equipment starts
  with no known location. `calibration_required` is always written as a real
  boolean (default `false`) — the column is nullable but `GET /state` types it
  as non-optional, so new rows never introduce a null there.
- **`PATCH /equipment/{id}`** is **structural fields only**: `name`,
  `category`, `serial`, `home_location_id`, `active`, `notes`,
  `calibration_required`, `calibration_interval_months`,
  `last_calibration_date`. All optional — a field left out is untouched, a
  field sent as `null` is set to null. `updated_at` is bumped explicitly
  (there's no trigger on the table).

  `current_location_id`, `status`, and `condition` are **rejected with a
  422**, not silently ignored. They live on `equipment_state` and change only
  via `POST /moves` and the receipt endpoint (which also sets `condition` —
  see Moves below); letting an admin set them directly would desynchronise
  the move history from where the equipment actually is. Every step-6
  request model uses `extra="forbid"`, so an unknown or misspelled field is
  a 422 too.

Responses are the record as stored (equipment columns plus its
`equipment_state` fields) — no `age_label` / `calibration` /
`location_display`. Refetch `GET /state` for the rendered view.

## Locations

`GET /locations` needs only `get_current_user`; the writes are admin-only.

- **`GET /locations`** returns every location ordered by name, **including
  inactive ones** — the frontend needs them to render location names on
  historical moves, and has the `active` flag to filter its own pickers with.
- **`POST /locations`** — `name`, `category`, `active` (default `true`).
  `category` is the `location_category` enum: `customer`, `warehouse`,
  `office`. Note the column is `category`, not `type`.
- **`PUT /locations/{id}`** is a full replace — `name`, `category` and `active`
  are all required.
- **`DELETE /locations/{id}` is a soft delete**: it sets `active = false` and
  returns the updated row with a 200, never `DELETE FROM`. Locations are
  referenced by `equipment.home_location_id`,
  `equipment_state.current_location_id` and both ends of every move, so a hard
  delete would either fail on the foreign keys or destroy history. Idempotent.

## Moves

Both endpoints need only `get_current_user` — **not** admin. Recording where
equipment went is everyday operational work.

The key invariant: **`equipment_state.current_move_id` is the single flag
meaning "this equipment is mid-move"**, and `GET /state` derives `in_transit`
from it and nothing else. Both endpoints take `SELECT … FOR UPDATE` on the
`equipment_state` row *before* testing it, inside the transaction that acts on
the result. A plain read-then-write is a race: two concurrent requests both see
`null`, both insert a move, and the equipment ends up with two open moves.

- **`POST /moves`** records *intent*. Required: `equipment_id`,
  `to_location_id`, `move_type`, `status_to`. Optional: `notes`, `moved_at`
  (omitted ⇒ server `now()`; supplied ⇒ used as given, so backdating works),
  and `carrier` / `tracking_number` / `booked_at`.

  `status_to` is **not** derived from `move_type` — they're independent
  choices the caller makes explicitly.

  Three fields are server-derived and **rejected with a 422** if sent:
  `status_from` (read from `equipment_state.status` under the lock),
  `from_location_id` (from `equipment_state.current_location_id`, same lock),
  and `created_by` (the authenticated user). Silently ignoring a client-supplied
  `status_from` would let a caller believe they'd recorded something they
  hadn't.

  On success, in one transaction: insert the move, insert its `move_logistics`
  row, set `equipment_state.current_move_id`. **`current_location_id` and
  `status` are deliberately untouched** — the equipment is still physically
  where it was until someone confirms receipt. If the equipment already has an
  unreceipted move, the request is a **409**.

- **`POST /moves/{id}/receipt`** records *arrival*, and is mandatory for every
  move — `requires_receipt` no longer exists, there's no partial receiving.
  Body: `condition_result` (required) and `condition_notes` (optional);
  `received_by` is the authenticated user, so sending it is a 422.

  `condition_result` is required by this API. It's also enum-constrained at
  the database level as of `migrations/003_equipment_condition.sql`
  (`pass` / `needs_attention` / `fail`), and rejected with a 422 by
  `MoveReceiptIn` before it ever reaches the database if it's anything else.
  Receipting is the only record of what condition the equipment arrived in,
  so closing a move without one isn't allowed here.

  Under the same lock, it confirms `current_move_id` is actually this move —
  **409** if not, rather than a silent no-op, which is what makes a double
  receipt fail. Then it fills in the receipt half of `move_logistics` and
  applies the move's `to_location_id` and `status_to` to `equipment_state`
  (read back from the stored `moves` row, never from the request), clearing
  `current_move_id`. In the same `UPDATE`, it also writes
  `equipment_state.condition = condition_result` — the value just saved to
  `move_logistics` in this same transaction. (The legacy `move_receipt` edge
  function never cleared `current_move_id`, which under the current schema
  would leave equipment reading as "In transit" forever.)

  `equipment_state.condition` and `move_logistics.condition_result` are
  different things that happen to share a value at the moment of receipt:
  `condition_result` is a permanent, per-move record of what that specific
  receipt assessed; `condition` is the equipment's current/ongoing condition,
  overwritten by every new receipt. `equipment_state.condition` is `NULL`
  until the equipment's first move is ever receipted.

**`move_logistics` is seeded unconditionally at move creation**, not at receipt
time — with the shipping half populated if supplied and the receipt half null.
`move_id` is that table's PRIMARY KEY, so the relationship is strictly 1:1 and
the receipt endpoint can `UPDATE` a row it knows exists — no insert, no upsert.
If that update matches nothing the invariant is broken, and the endpoint says
so with a 500 rather than papering over it by creating a row.

`POST /corrections` and `POST /equipment/import` (CSV) are **not** built — both
deferred. Nothing here reads or writes `move_shipping` or `move_receipts` —
those tables don't exist after `migrations/001_db_simplification.sql`.
`equipment_state.condition` **does** exist, as of
`migrations/003_equipment_condition.sql` — see above.

## Tests

```bash
pip install -r requirements-dev.txt
```

**Run pytest from `backend/`.** `app/config.py` resolves `.env` relative to the
working directory, so from anywhere else the settings the integration teardown
needs won't load.

### Fast run — no tokens, no database

```bash
pytest -m "not integration"
```

Until unit tests exist this deselects everything and pytest exits with **code 5
("no tests ran")**. That's expected, not a failure. A plain `pytest` with no
tokens set is the more useful check today: it collects the integration tests and
reports them as *skipped*, so it's visible that they exist and why they didn't
run.

### Integration run — real API, real database

```bash
# in one shell
uvicorn app.main:app --reload

# in another, from backend/
export ADMIN_TOKEN=...   # PowerShell: $env:ADMIN_TOKEN = "..."
export USER_TOKEN=...
pytest -m integration -v
```

`BASE_URL` is optional and defaults to `http://localhost:8000`.

`tests/integration/test_moves.py` walks the whole step-6 write path end to end:
equipment creation seeding its `equipment_state` row, admin-gating on equipment
and location writes, 422 rejection of the fields the server derives for itself,
and the full move lifecycle — open, mid-move state, 409 on a concurrent move,
receipt, state reconciliation, 409 on a double receipt. It finishes with a
`GET /state` reconciliation, which doubles as the end-to-end test of the read
path.

Assertions that check *computed* read-path fields (`in_transit`,
`location_display`, the resolved location names) are marked `# STEP-5 (read
path)` in the source, so a failure there can be triaged as a read-path bug
rather than a write-path one without re-deriving the distinction.

**Getting tokens is manual** — there's no scripted path today. Either mint one
against Supabase directly:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'      # take .access_token
```

or copy the session token out of browser devtools after signing into the app.
`ADMIN_TOKEN` needs a user with `profiles.role = 'admin'`; `USER_TOKEN` needs a
non-admin — `staff`, `salesperson`, or no `profiles` row at all, since all three
produce the 403 the tests expect.

> **This writes to and deletes from the real database.** There is no separate
> test database. Every row the suite creates is tagged `VERIFY-<epoch>-<uuid>`
> in a text column (`locations.name`, `equipment.name`, `moves.notes`), and a
> session fixture deletes them all afterwards in FK-safe order, then asserts
> nothing survived. If the process is killed mid-run the teardown won't fire —
> find the residue with `SELECT * FROM public.equipment WHERE name LIKE
> 'VERIFY-%'` and the equivalent on `locations` and `moves`.

## Structure

```
app/
  main.py        FastAPI app, CORS, router registration, /health
  config.py      env settings (DB URLs, JWKS URL, allowed origins)
  db.py          asyncpg connection pools (DB A live, DB B scaffolded)
  auth.py        JWT validation — added in step 4
  computed.py    ported view-model logic — added in step 5
  services/
    state.py     GET /state query + assembly logic — added in step 5
    equipment.py equipment + equipment_state writes — added in step 6
    locations.py location CRUD (soft delete) — added in step 6
    moves.py     move create/receipt, row locking — added in step 6
  routers/
    state.py     GET /state route + response models — added in step 5
    equipment.py POST/PATCH /equipment — added in step 6
    locations.py GET/POST/PUT/DELETE /locations — added in step 6
    moves.py     POST /moves + /moves/{id}/receipt — added in step 6
tests/
  conftest.py    shared fixtures: HTTP client, tokens, run tagging + DB teardown
  integration/
    test_moves.py  end-to-end write-path suite (needs tokens + a running API)
pyproject.toml       pytest config (markers, testpaths, pythonpath)
requirements-dev.txt test-only dependencies
```
