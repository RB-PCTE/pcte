# `src/`

This directory contains the application core: startup orchestration, the pub/sub event bus, domain constants, the Supabase database clients and field mappers, authentication, and user preferences. The UI rendering modules live in `src/ui/`.

---

## `main.js`

The application entry point. Deliberately thin — it owns startup sequencing, sidebar navigation, the `state:changed → renderAll` pipeline, and dev-mode detection. All rendering is delegated to `src/ui/` modules.

### `showView(viewName)`

**Purpose:** Switch the visible content section and update the sidebar navigation to highlight the active item. Also updates the top header title.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `viewName` | `string` | `~/src/preferences.js → loadActiveView()` or sidebar nav button click | One of `"operations"`, `"moves"`, `"admin"` |

**Returns:** `void`

---

### `initNav()`

**Purpose:** Restore the last-used view from `localStorage` on page load, then wire click handlers to every `[data-nav-target]` sidebar button.

**Parameters:** None

**Returns:** `void`

---

### `initBuildVersion()`

**Purpose:** Write the build version string to `#build-version` and wire the Shift+click Easter egg (3 Shift+clicks within 2 s fires `"devmode:request"` to open the admin passcode dialog).

**Parameters:** None

**Returns:** `void`

---

### `renderAll(state)`

**Purpose:** Internal pipeline function. Called on every `"state:changed"` event — passes the latest state to every UI module's render function and syncs each module's internal state reference.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → createRepository().getState()` | Full app state: `{ equipment[], moves[], corrections[], locations[] }` |

**Returns:** `void`

---

### Exported constants

| Export | Type | Description |
|---|---|---|
| `BUILD_VERSION` | `string` | Human-readable version stamp shown in the sidebar footer |
| `repository` | `object` | Shared repository instance — imported by no other module (they receive it as a parameter) |

---

---

## `events.js`

A minimal in-process pub/sub bus. The single wire between the data layer and the UI layer — when the repository saves new data it calls `emit("state:changed")`, and every render function that called `on("state:changed", …)` is notified.

### `on(eventName, handler)`

**Purpose:** Register a callback to be called whenever `eventName` is emitted. Returns an unsubscribe function.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `eventName` | `string` | Caller | Arbitrary event name, e.g. `"state:changed"` |
| `handler` | `Function` | Caller | Callback invoked with the event payload |

**Returns:** `Function` — call it to unregister the handler.

---

### `emit(eventName, payload)`

**Purpose:** Invoke all registered handlers for `eventName`, passing them `payload` synchronously.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `eventName` | `string` | `~/src/repository/index.js → persist()` | Event name to fire |
| `payload` | `any` | `~/src/repository/index.js → persist()` | Data passed to each handler |

**Returns:** `void`

---

---

## `model.js`

Domain constants and pure state-management utilities. No DOM access, no side effects. Import from here whenever you need the canonical list of valid statuses, locations, or move types.

### `normalizeStatus(rawStatus, rawLocation)`

**Purpose:** Clean up a potentially messy or legacy status string into one of the valid `editableStatusOptions` values. Used during CSV import.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `rawStatus` | `string` | `~/src/ui/admin.js → parseCSV()` | Raw status string from CSV or legacy data |
| `rawLocation` | `string` | `~/src/ui/admin.js → parseCSV()` | Raw location string (used as fallback heuristic) |

**Returns:** `string` — one of `editableStatusOptions`, defaults to `"Available"`.

---

### `getSeedDate({ months, days })`

**Purpose:** Generate a `"YYYY-MM-DD"` date string offset from today. Used only to create test/seed data.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `months` | `number` | `0` | Months to add (negative = past) |
| `days` | `number` | `0` | Days to add |

**Returns:** `string` — formatted date.

---

### `buildDefaultState(schemaVersion)`

**Purpose:** Return a blank, valid state object. Used by the repository on first load and by the mock adapter on reset.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `schemaVersion` | `number` | `STATE_VERSION` (2) | Schema version to embed in the state |

**Returns:** `object` — `{ schemaVersion, equipment: [], moves: [], corrections: [], locations: [] }`

---

### `migrateStateIfNeeded(inputState)`

**Purpose:** Upgrade an old or partially-formed state object to the current schema. Renames legacy fields (`items → equipment`, `log → moves`), fills missing arrays, and sets `schemaVersion`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `inputState` | `object` | `~/src/legacy/localStorage.js → safeParseState()` | Raw parsed state object, potentially from an old localStorage snapshot |

**Returns:** `object` — fully-formed state object at `STATE_VERSION`.

---

### Exported constants

| Export | Type | Description |
|---|---|---|
| `STATE_VERSION` | `number` | Current schema version (`2`) |
| `physicalLocations` | `string[]` | Canonical list of office locations |
| `editableStatusOptions` | `string[]` | Valid user-selectable equipment statuses |
| `statusFilterOptions` | `string[]` | `editableStatusOptions` plus `"In transit"` |
| `calibrationFilterOptions` | `string[]` | Valid calibration health filter values |
| `subscriptionFilterOptions` | `string[]` | Valid subscription health filter values |
| `moveConditionExemptStatuses` | `Set<string>` | Statuses that skip the condition check on move |
| `moveTypeOptions` | `{ value, label }[]` | All move type values and display labels |

---

---

## `supabaseClient.js`

All Supabase connectivity lives here: both database clients, every DB↔app field mapping function, the storage adapter used by the repository, and the function that creates subscription records in Database B.

### `createSupabaseStorageAdapter()`

**Purpose:** Create the production storage adapter used by the repository. Implements `{ load(), save() }` by querying/upserting across all Supabase tables.

**Parameters:** None

**Returns:** `object` — adapter with:
- `load()` → `Promise<object>` — runs 5 parallel Supabase queries and assembles full state
- `save(state)` → `Promise<void>` — upserts equipment, equipment_state, moves, and corrections
- `clear()` → `Promise<void>` — no-op (Supabase data is not cleared from the client)

---

### `createSubscriptionRecord(equipment, billingCycle)`

**Purpose:** Create a subscription record in Database B (Subscription Tracker) when a new piece of equipment is added with `subscriptionRequired: true`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `equipment` | `object` | `~/src/ui/admin.js → handleAddEquipmentSubmit()` | The newly created equipment item — must have `serialNumber` and `name` |
| `billingCycle` | `string` | `~/src/ui/admin.js → handleAddEquipmentSubmit()` | `"monthly"` or `"annually"`, defaults to `"monthly"` |

**Returns:** `Promise<void>`

---

### `handleAddEquipmentSupabase(payload, dataBaseName)` ⚠️ Legacy

**Purpose:** Legacy direct-insert to Supabase. Bypasses the repository pattern entirely. Do not use in new code — all writes should go through the repository.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `payload` | `object` | Row data to insert |
| `dataBaseName` | `string` | Table name |

**Returns:** `Promise<void>`

---

### `getSupabaseLocationID(locationName)`

**Purpose:** Look up a location's UUID from the `locations` table by name. Legacy helper — the new UI uses `state.locations` loaded at startup instead.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `locationName` | `string` | Human-readable location name e.g. `"Perth"` |

**Returns:** `Promise<string|null>` — the location UUID, or `null` on error.

---

### `getEquipmentSnapshot(equipmentID)`

**Purpose:** Fetch just the name, asset tag, and serial for one equipment item. Legacy helper — the new UI always reads from `state.equipment` instead.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `equipmentID` | `string` | Equipment UUID |

**Returns:** `Promise<{ name, asset_tag, serial }|null>`

---

### Exported clients

| Export | Description |
|---|---|
| `supabase` | Supabase client for Database A (Fleet Tracker — `eugdravtvewpnwkkpkzl.supabase.co`) |
| `subscriptionSupabase` | Supabase client for Database B (Subscription Tracker — `ezsqpiwzcuczgqdqyuqx.supabase.co`) |

---

---

## `auth.js`

Handles all authentication concerns: Supabase login/logout, role-based admin access, and the dev-mode local passcode. Fires `"auth:admin-changed"` DOM events to notify the rest of the app without creating circular imports.

### `initAuth({ showToast })`

**Purpose:** Wire all auth event listeners and restore dev mode from a previous session. Called once at startup from `main.js`. Also wires the header `#auth-login-trigger` button (navigates to Admin tab) and `#auth-logout-button` (signs out), and registers the `"devmode:request"` listener once so it cannot accumulate duplicates.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | Passed from `main.js` to display login/logout feedback |

**Returns:** `void`

---

### `handleAuthChanged(session)` *(internal)*

**Purpose:** Handle a Supabase auth state change. Checks the user's role via `checkAdminRole`, fires `"auth:admin-changed"`, shows/hides the admin form cards, and updates all auth status labels.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `session` | `object\|null` | `"auth:changed"` DOM event detail | Supabase session object, or `null` when signed out |

**Returns:** `Promise<void>`

---

### `checkAdminRole(session)` *(internal)*

**Purpose:** Query `profiles.role` in Supabase to determine if the logged-in user has admin access. Filters by `user_id` (the primary key of the `profiles` table).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `session` | `object` | `~/src/auth.js → handleAuthChanged()` | Active Supabase session |

**Returns:** `Promise<boolean>` — `true` if `profiles.role === "admin"`.

---

### `handleLogin(showToast)` *(internal)*

**Purpose:** Read email/password from the login form and call `supabase.auth.signInWithPassword`. Disables the button while the request is in flight.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For login success/error feedback |

**Returns:** `Promise<void>`

---

### `handleLogout(showToast)` *(internal)*

**Purpose:** Sign out of Supabase, clear the dev mode localStorage flag, and reset all auth UI to the signed-out state.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For sign-out feedback |

**Returns:** `Promise<void>`

---

### `fireAdminChanged(isAdmin)` *(internal)*

**Purpose:** Update the internal `_isAdmin` flag and dispatch `"auth:admin-changed"` on `document` so `main.js` and `devtools.js` can react.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `isAdmin` | `boolean` | Whether admin mode is now active |

**Returns:** `void`

---

### `setAdminContentVisible(visible)` *(internal)*

**Purpose:** Show or hide `#admin-panels-grid` — the block of admin-only form cards (add/edit equipment, calibration, import). The Admin nav button is always visible; only the form content is gated behind authentication.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `visible` | `boolean` | `true` to reveal the admin form cards; `false` to hide them |

**Returns:** `void`

---

### `openPasscodeDialog()` *(internal)*

**Purpose:** Open the `#admin-passcode-dialog`. Detects whether a passcode already exists in `localStorage` and switches between Setup mode (first use) and Verify mode accordingly.

**Parameters:** None

**Returns:** `void`

---

### `initPasscodeDialog(showToast)` *(internal)*

**Purpose:** Wire the passcode dialog's cancel, close, reset, and submit behaviours. On successful verify/setup: stores passcode, sets dev mode flag, fires `"auth:admin-changed"`, reveals Admin nav. The `#admin-passcode-reset` link (visible in Verify mode) clears the stored passcode from `localStorage` and re-opens the dialog in Setup mode so a forgotten passcode can be replaced.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For passcode success/error feedback |

**Returns:** `void`

---

### `updateAuthUI(session, isAdmin)` *(internal)*

**Purpose:** Update all auth-related UI elements to reflect the current session and admin state. Controls: `#auth-status`, `#auth-status-header`, `#auth-login-trigger` (header), `#auth-logout-button` (header), and the login form field/button disabled states. When signed in, shows the user's email (with `"(admin)"` suffix if applicable). When signed out, shows `"Dev mode (admin)"` or `"Not signed in"` depending on `isAdmin`.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `session` | `object\|null` | Current Supabase session, or `null` |
| `isAdmin` | `boolean` | Whether admin mode is currently active |

**Returns:** `void`

---

---

## `preferences.js`

Thin wrapper around `localStorage` for persisting the user's last-active view across page reloads.

### `loadActiveView()`

**Purpose:** Read the last-saved view name from `localStorage`. Called at startup by `initNav()` to restore the user's previous position.

**Parameters:** None

**Returns:** `string` — view name (`"operations"`, `"moves"`, or `"admin"`), defaults to `"operations"`.

---

### `saveActiveView(view)`

**Purpose:** Persist the currently active view name to `localStorage`. Called by `showView()` every time the user switches views.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `view` | `string` | `~/src/main.js → showView()` | Normalised view name |

**Returns:** `void`
