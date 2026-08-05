# Rebuild Plan — FastAPI backend + React/TS frontend (fixed endpoints, no edge functions)

> A step-by-step build guide you can revise. Check items off as you go. Phase A
> (backend + repoint the current UI) delivers a working, debuggable app on its own.
> Phase B (React rewrite) is optional and separate.

---

## 0. Principles (the "why", so revisions stay on-track)

- **One writer per table.** Only the FastAPI backend writes business state. The
  frontend never writes DB rows and never computes business logic.
- **Server returns ready-to-render data.** All of today's `computed.js` lives in
  the backend; responses already include effective status, calibration status, etc.
- **Single source of truth = the API.** Frontend mutates via an endpoint, then
  refetches. No optimistic cache to fall out of sync (this is what caused every
  bug: blank location, clobbered status, FK race).
- **Change one variable at a time.** Prove the backend behind the *current* UI
  first; rewrite the UI only after the API is stable.

Confirmed decisions: keep Supabase Postgres · reuse Supabase Auth (validate JWT in
FastAPI) · repoint current frontend first.

---

## 1. Prerequisites & tooling

- [ ] Python 3.11+ and `pip`/`uv` installed.
- [ ] Get the **Supabase Postgres connection string** (Dashboard → Project Settings
      → Database → Connection string / pooler). You need this for DB A
      (`eugdravtvewpnwkkpkzl`) and DB B (`ezsqpiwzcuczgqdqyuqx`, Subscription Tracker).
- [ ] Note the JWKS URL: `https://eugdravtvewpnwkkpkzl.supabase.co/auth/v1/.well-known/jwks.json`
- [ ] Create a git branch: `git checkout -b rebuild/fastapi-backend`.
- [ ] Decide backend hosting (Railway / Render / Fly.io) — pick later, before deploy.

---

## 2. Repo layout to create

```
backend/
  app/
    main.py            # FastAPI app, CORS, router registration
    config.py          # env settings (DB URLs, JWKS URL, allowed origins)
    db.py              # asyncpg connection pools for DB A + DB B
    auth.py            # JWT validation (cached JWKS) → get_current_user, require_admin
    schemas.py         # Pydantic request/response models = the typed contract
    computed.py        # PORT of src/ui/computed.js (pure functions)
    services/
      state.py         # hydrate + attach computed fields
      equipment.py     # create/update/import + DB B subscription record
      moves.py         # move create + receipt business logic
    routers/
      state.py  equipment.py  moves.py  locations.py  corrections.py
  tests/               # pytest (port tests/*.js intent)
  requirements.txt     # fastapi, uvicorn[standard], asyncpg, pyjwt[crypto], httpx, pydantic-settings
  .env.example         # names only, no secrets
  README.md
```

Keep the existing `src/` frontend in place — Phase A edits it; Phase B replaces it.

---

## PHASE A — Backend + repoint current frontend

### 3. Backend foundation
- [ ] `requirements.txt` + virtualenv; `pip install -r requirements.txt`.
- [ ] `config.py`: `pydantic-settings` reading `DB_A_URL`, `DB_B_URL`,
      `SUPABASE_JWKS_URL`, `ALLOWED_ORIGINS` (comma-sep). Never hardcode secrets.
- [ ] `db.py`: create `asyncpg` pools on startup, close on shutdown. Two pools
      (DB A primary, DB B read/subscription-write).
- [ ] `main.py`: FastAPI app, `CORSMiddleware` with the allowlist (port the origins
      from the edge functions: `https://rb-pcte.github.io`, `http://localhost:3000`,
      plus your local dev port). Register routers. Add `GET /health`.
- [ ] Run `uvicorn app.main:app --reload`; confirm `/health` and `/docs` (Swagger) load.

**Checkpoint:** Swagger UI is your live test harness for everything below.

### 4. Auth (validate Supabase JWT locally)
- [ ] `auth.py`: fetch + cache JWKS; `get_current_user` dependency decodes the
      `Authorization: Bearer` token, verifies signature against JWKS, returns
      `{user_id: sub, email}`. Raise 401 with a **specific** message on failure
      (don't repeat the old generic "Invalid token").
- [ ] `require_admin` dependency: `get_current_user` + query `profiles.role = 'admin'`;
      403 otherwise.
- [ ] Sketch:
  ```python
  # auth.py
  jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)  # caches keys
  async def get_current_user(authorization: str = Header(...)):
      token = authorization.removeprefix("Bearer ").strip()
      try:
          key = jwks_client.get_signing_key_from_jwt(token).key
          claims = jwt.decode(token, key, algorithms=["RS256","ES256"],
                              audience="authenticated")
      except Exception as e:
          raise HTTPException(401, f"Auth failed: {e}")
      return {"user_id": claims["sub"], "email": claims.get("email")}
  ```
- [ ] Verify in Swagger: no token → 401; a real token copied from the app → 200.

### 5. Read path — `GET /state`  (replaces `adapter.load()`)
- [ ] `computed.py`: port pure functions from `src/ui/computed.js` — `getEffectiveStatus`
      / `isShippingActive`, `getCalibrationInfo`, `getSubscriptionInfo`, `getAgeLabel`,
      `getEquipmentLocationDisplay`, and `applyCorrectionsToMoves`.
- [ ] `services/state.py`: run the queries `adapter.load()` did (equipment +
      equipment_state + locations join, moves + receipts, corrections, DB B
      subscriptions by serial), map to schemas, and **attach computed fields**.
- [ ] `routers/state.py`: `GET /state` (auth required) → full state with view models.
- [ ] Verify shape matches what the frontend expects (compare to `mapEquipmentFromDb`).

**Collaboration point (TODO(human)):** the calibration due/overdue math in
`computed.py` — encodes your domain rule (interval months vs today).

### 6. Write path
Port the business logic; the edge functions + `operations.js` are the source of truth
for the rules.
- [ ] `POST /equipment` / `PATCH /equipment/{id}` — from `addEquipment`/`updateEquipment`
      + `mapEquipmentToDb`/`mapEquipmentStateToDb`. On create, also insert the DB B
      subscription row (`createSubscriptionRecord`) and the initial `equipment_state`
      row **with `current_location_id`** (fixes the original blank-location bug at the source).
- [ ] `POST /equipment/import` — move CSV parsing/validation server-side (from `admin.js`).
- [ ] `GET /locations`.
- [ ] `POST /moves` — port `move_create/index.ts` + `operations.js` rules:
      validate shipping-required (`isInterOfficeMove`), derive `move_type`
      (`deriveMoveType`), set `status_from/to`, condition patch, insert move (+ shipping),
      upsert `equipment_state.current_location_id` + `current_move_id`.
- [ ] `POST /moves/{id}/receipt` — port `move_receipt/index.ts`: insert receipt, set
      `equipment_state.status = status_to`, condition fields.
- [ ] `POST /corrections` — append a correction row.
- [ ] Test each in Swagger before touching the frontend.

**Collaboration point (TODO(human)):** `deriveMoveType` + shipping-required rules in
`services/moves.py` — your office/hire logic.

### 7. Repoint the current vanilla frontend (minimal, surgical)
- [ ] Add `API_BASE` constant (env-ish, e.g. a `config.js`): localhost for dev.
- [ ] Replace the storage adapter: `load()` → `GET /state` (keep the `state:changed`
      flow in `repository/index.js` unchanged).
- [ ] Convert each repository mutation to **call one endpoint, then `await hydrate()`**:
      `addEquipment`→`POST /equipment`, `updateEquipment`→`PATCH`, `recordMove`→`POST /moves`,
      `recordReceipt`→`POST /moves/{id}/receipt`, `addCorrection`→`POST /corrections`.
- [ ] **Delete** the optimistic patching (`item.location`/`item.status`) and the whole
      `mapEquipmentStateToDb`/`save()` upsert path — the server owns it now.
- [ ] `operations.js` + `modals.js`: point move/receipt fetches at the new endpoints
      (drop `MOVE_CREATE_ENDPOINT`/`MOVE_RECEIPT_ENDPOINT`). Keep sending the Supabase
      Bearer token from `supabase.auth.getSession()`.
- [ ] Keep Supabase JS **only** for login/session; remove all `supabase.from(...)` data reads.

**Checkpoint (the acceptance test):** create item w/ location → move → receipt →
**hard reload** → location AND status persist, with zero client-side sync code.

### 8. Retire edge functions
- [ ] Confirm nothing in the frontend references the edge-function URLs.
- [ ] Undeploy `move_create` / `move_receipt` (`supabase functions delete ...`), or
      just stop deploying them. Leave source in git history.

### 9. Deploy backend
- [ ] Pick host; set env vars (both DB URLs, JWKS URL, allowed origins incl. GitHub Pages).
- [ ] Deploy; hit `/docs` on the live URL.
- [ ] Point the frontend `API_BASE` at the deployed API; redeploy the GitHub Pages site.
- [ ] Re-run the acceptance test on production.

---

## PHASE B — React + TS rewrite (later, optional)

- [ ] Scaffold Vite + React + TS in `frontend/`.
- [ ] Generate a typed client from FastAPI's OpenAPI schema (`/openapi.json`).
- [ ] **React Query** for all data: `useQuery('/state')`, mutations that invalidate
      and refetch → single source of truth, no manual cache.
- [ ] Port `styles.css` (~1.1k lines) largely as-is; rebuild views one at a time
      (Operations → Moves → Admin), reaching parity with the vanilla app.
- [ ] Retire `src/` once parity is confirmed.

---

## Testing strategy
- [ ] `pytest backend/tests`: port `tests/applyCorrectionsToMoves.test.js` and the
      condition-pill logic into Python (pure functions in `computed.py` make this easy).
- [ ] Manual: Swagger for every endpoint (auth 401/403 paths included).
- [ ] End-to-end acceptance test (Step 7 checkpoint) after repoint and after deploy.

## Safety / rollback
- Work on the `rebuild/fastapi-backend` branch; keep `master` deployable.
- Edge functions stay deployed until Step 8 verifies — instant rollback by
  repointing the frontend back to the edge-function URLs.
- Backend is read-mostly first (`/state`) before any write endpoint goes live.

## Open items to revise (your call)
- Hosting choice (Railway vs Render vs Fly).
- DB access style: raw `asyncpg` + SQL (simplest, recommended) vs SQLAlchemy 2.0.
- Whether login also proxies through FastAPI (`POST /auth/login`) or stays on the
  Supabase JS SDK in the browser (recommended: keep it on the SDK).
- Whether to fold DB B (subscriptions) into the same backend now or later.
