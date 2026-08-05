# Fleet Tracker backend

FastAPI backend that becomes the single writer to the Fleet Tracker Supabase
Postgres DB. See `REBUILD_PLAN.md` in the project root for the full plan;
this covers Phase A steps 3–4 (foundation + auth) so far.

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

## Structure

```
app/
  main.py        FastAPI app, CORS, router registration, /health
  config.py      env settings (DB URLs, JWKS URL, allowed origins)
  db.py          asyncpg connection pools (DB A live, DB B scaffolded)
  auth.py        JWT validation — added in step 4
  computed.py    ported view-model logic — added in step 5
  services/      business logic per domain (equipment, moves, ...)
  routers/       one router per resource
tests/
```
