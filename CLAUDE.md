# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## ⚠️ Documentation maintenance (REQUIRED on every code change)

After **every** code change — no matter how small — you must update the following files to reflect what changed:

- **`redesignPlan.md`** — update if any UI element, event listener, CSS class, view structure, or file was added, removed, or renamed.
- **`backendLogic.md`** — update if any function, module, parameter, return value, or file path changed.
- **`src/**/README.md`** — update the README in the affected directory if any function signature, parameter, return value, purpose, or file in that directory changed. Each directory has its own README; update only the section(s) that changed.

All three are organised by directory/file. Update only the relevant section(s). Do not rewrite sections that did not change. This rule applies to all changes including: new files, deleted files, renamed files, new functions, changed function signatures, new HTML elements, new CSS classes, and moved code.

---

## Running the app

No build step — open `index.html` directly in a browser (or serve with any static file server):

```sh
npx serve .
```

The app uses native ES modules via `<script type="module">`. Opening without a Supabase connection will show an empty equipment list.

`app.js` is a legacy shim that re-exports `src/main.js` for old bookmarks. Do not delete it.

## Running the backend

The frontend needs the FastAPI backend running. From `backend/`:

```sh
uvicorn app.main:app --reload
```

`src/config.js` points `API_BASE` at `http://localhost:8000`. Swagger UI is at `/docs`.

Two things must line up or every request 401s:

- The origin the frontend is served from must be in the backend's `ALLOWED_ORIGINS`.
- The Supabase project in `src/supabaseClient.js` must be the same project the backend's `SUPABASE_JWKS_URL` points at — the backend validates the token's `iss` claim.

## Running tests

Backend tests are pytest, under `backend/tests/`:

```sh
cd backend && pytest
```

The two standalone frontend test scripts were removed in step 7a — both tested logic (corrections overlay, the old condition-rating vocabulary) that no longer exists.

## Edge functions — retired

`move_create` and `move_receipt` were replaced by `POST /moves` and `POST /moves/{id}/receipt` in step 7a. Nothing in the frontend references their URLs. Source stays in `supabase/functions/` and in git history until REBUILD_PLAN.md step 8 undeploys them.

`supabase/SCHEMA.md` predates `migrations/001_db_simplification.sql` and is stale; the migrations are the schema reference.

---

## Architecture overview

The app is a single-page equipment tracker backed by a **FastAPI backend** (`backend/`) over Supabase Postgres. The UI uses a **dark sidebar + main content** layout matching the Subscription Tracker design system.

The backend is the only writer and the only place business logic lives. `GET /state` returns a ready-to-render view model — computed status, calibration health, age labels and in-transit flags all arrive already calculated. Supabase JS is used **only** for the auth session.

### Data flow

```
index.html  ──loads──►  src/main.js     (startup: auth → hydrate → listen → render)
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
        src/repository/   src/auth.js       src/supabaseClient.js
        index.js          (login/logout)    (auth session only)
              │                                   │
              ▼                                   ▼
          src/api.js  ──HTTP──►  FastAPI  ──►  Supabase Postgres
              │                 (backend/)
              ▼
        emit("state:changed")
              │
              ▼
        src/ui/*.js   (render functions update the DOM)
```

### Startup sequence

1. `createRepository()` — initialises with the empty state from `buildDefaultState()`
2. `supabase.auth.getSession()` fires `"auth:changed"`
3. With a session, `repository.hydrate()` calls `loadState()` — `GET /state` + `GET /locations` in parallel
4. `emit("state:changed", state)` triggers all registered render functions
5. Sidebar nav switching calls `loadActiveView()` to restore the last-used view

Without a session nothing is fetched: every endpoint requires a bearer token. Signing in re-fires `"auth:changed"` and loads the data then.

### Mutation flow

Every mutation is: call one endpoint → refetch the whole state → emit. No local draft, no optimistic patching, no whole-table upsert. This is what step 7a replaced.

### File structure

```
src/
├── main.js             Startup only — auth gate, hydrate, state listener, nav switching
├── config.js           API_BASE — the one environment-dependent value
├── api.js              apiFetch + loadState — the only module that calls the backend
├── enums.js            Backend enum value ⇄ display label maps
├── events.js           pub/sub: on(event, handler) / emit(event, payload)
├── model.js            buildDefaultState + the two filter vocabularies
├── supabaseClient.js   Supabase clients — auth session only, no data access
├── auth.js             Supabase login/logout + role check + dev mode toggle
├── preferences.js      loadActiveView / saveActiveView (localStorage)
│
├── repository/
│   └── index.js        State store — one endpoint per mutation, then refetch
│
└── ui/
    ├── computed.js     Pure formatting + CSS-class selection (no DOM access)
    ├── filters.js      Filter state + getFilteredEquipment / getFilteredMoves
    ├── toast.js        showToast + toast container
    ├── stats.js        Render 4 metric cards (Operations view header)
    ├── operations.js   Equipment table, location summary cards, move form
    ├── moves.js        Moves log table + filter bar
    ├── admin.js        Add/edit equipment, calibration, auth panel
    ├── modals.js       Mark-received dialog
    └── devtools.js     Diagnostics log + API health check (hidden, admin only)
```

### Key modules

**`src/main.js`** — Startup only. Creates the repository, gates hydration on an auth session, registers the `"state:changed"` listener, and wires sidebar navigation. `BUILD_VERSION` near the top should be updated before each deployment.

**`src/api.js`** — `apiFetch(path, options)` attaches the Supabase bearer token and throws `ApiError` carrying the server's own message (including FastAPI's 422 field detail). `loadState()` runs `GET /state` and `GET /locations` in parallel.

**`src/enums.js`** — The single translation point between the backend's snake_case enum values and display labels. Nothing outside this file may hardcode or compare against a display string. CSS-class lookups key on the backend values, so labels are safe to reword.

**`src/repository/index.js`** — One endpoint per mutation, then `hydrate()` and emit. Methods: `addEquipment`, `updateEquipment`, `recordMove`, `recordReceipt`, `recordCalibration`.

**`src/supabaseClient.js`** — Two Supabase clients. Only the auth session is used; `subscriptionSupabase` (DB B) is currently unused.

**`src/model.js`** — `buildDefaultState()`, `FILTER_ALL`, `statusFilterOptions`, `calibrationFilterOptions`.

**`src/auth.js`** — Wraps `supabase.auth.signInWithPassword` / `signOut`. Checks `profiles.role` for admin access — the one remaining `supabase.from(...)` call, gating UI visibility only; the backend enforces admin access independently. Handles dev mode (Shift+click build version ×3).

**`src/ui/computed.js`** — Pure functions, no DOM access. Formatting and CSS-class selection only; the domain calculations moved to the backend.

### CSS / design system

**`styles.css`** — All styles live here. Follows the Subscription Tracker design system exactly (same CSS variables, sidebar layout, card styles, status pills, metric cards). The key layout classes are:

- `.app-shell` — grid: 260px sidebar + 1fr main
- `.sidebar` / `.nav-item` / `.nav-item.is-active` — dark sidebar navigation
- `.app-main` / `.content-area` — scrollable main area
- `.card` / `.metric-card` — white card with 18px radius
- `.pill` + modifier (e.g. `.pill--available`) — equipment status badges
- `.condition-badge` + modifier — condition check results
- `.is-view-hidden` — hides inactive view sections (matches Sub Tracker pattern)
- `.is-hidden` — generic utility hide

### Databases

The `migrations/` directory is the schema reference. `supabase/SCHEMA.md` predates `001_db_simplification.sql` and is stale.

**Database A — Fleet Tracker**
- `equipment` + `equipment_state` (1:1) — static data and dynamic state (`status`, `current_location_id`, `current_move_id`, `condition`)
- `moves` + `move_logistics` (1:1) — movement history; `move_logistics` replaced `move_shipping` + `move_receipts`
- `locations` — reference data, with a `category` enum (`customer` / `warehouse` / `office`)
- `profiles` — user roles (`role = 'admin'` gates admin features)

**Database B — Subscription Tracker** — no longer read by this app. The subscription UI was removed in step 7a; there is no backend endpoint covering DB B yet.

### Enums (migrations 001–003)

| Enum | Values |
|---|---|
| `equipment_status` | `available`, `on_demo`, `on_hire`, `in_service_repair`, `quarantined` |
| `equipment_category` | `INDT`, `CNDT`, `geotech`, `GPR`, `lab` |
| `location_category` | `customer`, `warehouse`, `office` |
| `move_type` | `office_transfer`, `hire_out`, `hire_return`, `workshop`, `move` |
| `condition_assessment` | `pass`, `needs_attention`, `fail` |

All display labels live in `src/enums.js`. Never hardcode one elsewhere.

### State schema

```js
{
  equipment: EquipmentOut[],   // GET /state — includes computed view-model fields
  moves:     MoveOut[],        // GET /state — each with its move_logistics row
  locations: LocationOut[],    // GET /locations — active AND inactive
}
```

Field names are the backend's own. `EquipmentOut` carries `age_label`, `calibration` (`null` when not required), `in_transit`, `location_display` and `condition` (`null` when never assessed) already computed.

### Key domain rules

- **In transit** is derived from `equipment_state.current_move_id` — server-side, never set directly
- **Location and status change only on receipt.** `POST /moves` opens a move and flags it in transit; `POST /moves/{id}/receipt` applies the destination and status, and sets `condition`
- **`status_from`, `from_location_id`, `created_by`, `received_by`** are server-derived; sending them is a 422
- **Condition** is assessed at receipt only, never edited directly — it's absent from `EquipmentPatchIn`
- **Shipping is required for office → office moves**, keyed on each location's `category`
- **Calibration** health is computed server-side; `calibration: null` means not required
- **One open move per item** — a second `POST /moves` returns 409
- **Admin access**: `profiles.role = 'admin'`, enforced by the backend's `require_admin`; the frontend check only hides UI. Dev mode (Shift+click version ×3) affects local UI visibility only and does **not** grant API access
