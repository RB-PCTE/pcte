# `src/`

The application core: startup orchestration, the pub/sub event bus, the API client, the backend↔display enum mapping, authentication, and user preferences. The UI rendering modules live in `src/ui/`.

Since Phase A step 7a the frontend reads and writes **only** through the FastAPI backend. Supabase is still used, but only for the auth session.

---

## `config.js`

The only environment-dependent value in the frontend.

| Export | Type | Description |
|---|---|---|
| `API_BASE` | `string` | Base URL of the FastAPI backend. `http://localhost:8000` for local dev. |

There is deliberately no dev/prod detection. REBUILD_PLAN.md step 9 is where the production host gets decided. Whatever origin the frontend is served from must also appear in the backend's `ALLOWED_ORIGINS`.

---

## `api.js`

The only module that talks to the backend.

### `apiFetch(path, options)`

**Purpose:** Call the backend with the Supabase bearer token attached. Throws `ApiError` on any non-2xx response, carrying the server's own message.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | — | Leading-slash path, e.g. `"/moves"` |
| `options.method` | `string` | `"GET"` | HTTP method |
| `options.body` | `object` | — | Serialised as JSON when present |

**Returns:** `Promise<any>` — parsed JSON, or `null` for an empty body.

**Throws:** `ApiError` with `.status` and `.body`. A 422 from a request model's `extra="forbid"` is rendered as `Invalid request — field: message`, so a stray field is immediately diagnosable rather than an opaque "Unprocessable Entity". Network failure (API down, CORS refusal) surfaces as status `0` with a "Could not reach the API" message.

---

### `loadState()`

**Purpose:** Load the whole app state. Two calls in parallel, because `GET /state` returns equipment and moves only — locations are reference data served by `GET /locations`.

**Returns:** `Promise<{equipment[], moves[], locations[]}>`

Inactive locations are kept in state rather than filtered here; callers that need only active ones filter at the point of use.

---

### `ApiError`

`Error` subclass with `.status` (HTTP status, `0` for network failure) and `.body` (parsed response).

---

## `enums.js`

The single translation point between the backend's snake_case enum values and the strings this UI displays. No module outside this file may hardcode or compare against a display string.

The labels are display-only and safe to reword: the CSS-class lookups in `ui/computed.js` key on the backend values instead.

| Export | Backend source | Values |
|---|---|---|
| `EQUIPMENT_STATUS` | `equipment_status` (migration 001) | `available`, `on_demo`, `on_hire`, `in_service_repair`, `quarantined` |
| `IN_TRANSIT_DISPLAY` | derived, not stored | `"In transit"` — shown when `in_transit` is true |
| `EQUIPMENT_CATEGORY` | `equipment_category` (001) | `INDT`, `CNDT`, `geotech`, `GPR`, `lab` |
| `LOCATION_CATEGORY` | `location_category` (001) | `customer`, `warehouse`, `office` |
| `MOVE_TYPE` | `move_type` (002) | `office_transfer`, `hire_out`, `hire_return`, `workshop`, `move` |
| `CONDITION` | `condition_assessment` (003) | `pass`, `needs_attention`, `fail` |
| `CONDITION_NOT_ASSESSED` | — | Shown when `equipment.condition` is `null` |
| `CALIBRATION_STATUS` | `CalibrationInfoOut.status` | `ok`, `due_soon`, `overdue`, `unknown` |
| `CALIBRATION_NOT_REQUIRED` | — | Shown when `calibration` is `null` |

### `display(map, value, fallback?)`

Backend value → display label. Unknown values fall through unchanged rather than becoming `"undefined"`. `fallback` (default `"—"`) is returned for null/empty.

### `valueOf(map, label)`

Display label → backend value, or `null`.

### `options(map)`

Map → `[{ value, label }]`, for building `<select>` options.

---

## `main.js`

Startup sequencing, sidebar navigation, and the `state:changed → renderAll` pipeline.

### `showView(viewName)`

**Purpose:** Switch the visible content section, highlight the sidebar item, update the header title, and persist the choice.

**Parameters:** `viewName` — `"operations"`, `"moves"`, or `"admin"`. Anything else normalises to `"operations"`.

**Returns:** `void`

---

### `loadAndRender(session)` *(internal)*

**Purpose:** Load state from the API and render. Every endpoint requires a bearer token, so there is nothing to fetch until the user signs in — signing in re-fires `"auth:changed"` and brings us back here. Signing out clears the state so the previous user's data doesn't stay on screen.

Guarded on the signed-in user id, because `onAuthStateChange` also fires on every silent token refresh and refetching the whole state each time would be pointless traffic.

**Parameters:** `session` — Supabase session or `null`.

**Returns:** `Promise<void>`

---

### `renderAll(state)` *(internal)*

**Purpose:** Push the state snapshot into every controller, then call every render function. Controllers are synced first so a handler firing mid-render already sees current data.

---

### `initNav()` / `initBuildVersion()` *(internal)*

Restore the last-used view and wire nav buttons; write the build stamp and wire the Shift+click ×3 dev-mode Easter egg.

### Exported constants

| Export | Type | Description |
|---|---|---|
| `BUILD_VERSION` | `string` | Version stamp shown in the sidebar footer |
| `repository` | `object` | The shared repository instance |

---

## `events.js`

A minimal in-process pub/sub bus — the single wire between the data layer and the UI layer.

### `on(eventName, handler)`

Register a callback. **Returns** an unsubscribe function.

### `emit(eventName, payload)`

Invoke all handlers for `eventName` synchronously.

---

## `model.js`

The empty-state shape and the two filter vocabularies. The domain constants that used to live here moved to `enums.js`.

| Export | Type | Description |
|---|---|---|
| `FILTER_ALL` | `string` | Sentinel every filter `<select>` uses for "don't filter" |
| `statusFilterOptions` | `{value,label}[]` | All statuses plus the derived `in_transit` |
| `calibrationFilterOptions` | `{value,label}[]` | The four API statuses plus the local `not_required` |

### `buildDefaultState()`

**Returns:** `{ equipment: [], moves: [], locations: [] }` — matches what `loadState()` returns.

---

## `supabaseClient.js`

Supabase clients, for authentication only. As of step 7a this file no longer reads or writes application data.

| Export | Description |
|---|---|
| `supabase` | Client for the Fleet Tracker project. `auth.js` signs in/out through it; `api.js` reads the access token off the session. |
| `subscriptionSupabase` | Client for the Subscription Tracker project (DB B). Currently unused — the subscription UI was removed in step 7a because `GET /state` has no subscription data. |

`supabase` is also attached to `window.supabaseClient` for console debugging.

> ⚠️ The project URL here must be the same Supabase project the backend's `SUPABASE_JWKS_URL` points at. The backend validates the token's `iss` claim, so a mismatch means every request 401s with "Token issuer is invalid".

---

## `auth.js`

Supabase login/logout, role-based admin access, and the dev-mode local passcode. Fires `"auth:admin-changed"` DOM events rather than calling other modules directly.

### `initAuth({ showToast })`

**Purpose:** Wire all auth event listeners and restore dev mode from a previous session. Called once at startup.

### `handleAuthChanged(session)` *(internal)*

Checks the user's role via `checkAdminRole`, fires `"auth:admin-changed"`, shows/hides the admin form cards, updates auth status labels.

### `checkAdminRole(session)` *(internal)*

Queries `profiles.role` to determine admin access.

> This is the one remaining `supabase.from(...)` call in the app. It is a role lookup rather than application data, and it gates UI visibility only — the backend enforces admin access independently via `require_admin`, so a user who spoofed it client-side would still get a 403.

### `handleLogin` / `handleLogout` *(internal)*

Wrap `signInWithPassword` / `signOut` and update the UI.

### `openPasscodeDialog` / `initPasscodeDialog` *(internal)*

The dev-mode passcode dialog (Shift+click the build version ×3). Setup mode on first use, verify mode thereafter.

### `updateAuthUI(session, isAdmin)` *(internal)*

Update every auth-related label and button state.

---

## `preferences.js`

Thin `localStorage` wrapper for the last-active view.

### `loadActiveView()` → `string` (defaults to `"operations"`)
### `saveActiveView(view)` → `void`
