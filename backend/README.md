# Fleet Tracker backend

FastAPI backend that becomes the single writer to the Fleet Tracker Supabase
Postgres DB. See `REBUILD_PLAN.md` in the project root for the full plan;
this covers Phase A steps 3–5 (foundation + auth + the `GET /state` read
path) so far.

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
  routers/
    state.py     GET /state route + response models — added in step 5
tests/
```
