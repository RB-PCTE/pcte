# Backend Logic Reference

This document describes every backend and data function in the codebase. It is written in plain English so you can understand what each function does before connecting a new frontend to it.

**Necessity rating:** ★★★★★ = critical / called constantly, ★☆☆☆☆ = rarely used / can be removed

Each entry follows this format:
- **What it does** — plain English
- **How it works** — brief logic summary
- **Frontend suggestion** — how to connect or improve it in the redesign

---

## File status

| File | Status | Notes |
|---|---|---|
| `src/events.js` | ✅ Keep as-is | Untouched |
| `src/model.js` | ✅ Keep as-is | Untouched |
| `src/supabaseClient.js` | ✅ Keep as-is | Untouched |
| `src/repository/index.js` | ✅ Keep as-is | Untouched |
| `src/storage.js` | 🔄 To split | `loadActiveTab/saveActiveTab` → `src/preferences.js`; rest → `src/legacy/localStorage.js` |
| `src/auth.js` | 🆕 To create | Supabase login/logout, role check, dev mode (Shift+click ×3) |
| `src/preferences.js` | ✅ Done | `loadActiveView()` / `saveActiveView()` — persists active view name to localStorage |
| `src/main.js` | ✅ Done | Startup: hydrate, nav switching, `state:changed` pipeline, `devmode:request` event |
| `src/legacy/localStorage.js` | 🆕 To create | Old adapter, mock adapter, migration helpers |
| `src/admin.js` | 🗑️ To delete | Replaced by `src/ui/admin.js` + `src/auth.js` |
| `src/ui/computed.js` | ✅ Done | `getCalibrationInfo`, `getSubscriptionInfo`, `getEffectiveStatus`, `getAgeLabel`, `isShippingActive`, `getEquipmentLocationDisplay`, `conditionBadgeClass`, `statusPillClass`, `healthPillClass`, `escapeHTML`, `formatDateTime` |
| `src/ui/filters.js` | ✅ Done | `readEquipmentFilters`, `readMovesFilters`, `getFilteredEquipment`, `getFilteredMoves`, `applyCorrectionsToMoves`, `isEntryDeleted`, `isMoveAwaitingReceipt` |
| `src/ui/toast.js` | ✅ Done | `showToast(message, type)` — appends toast to `#toast-container`, auto-dismisses after 3.5 s, click-to-dismiss |
| `src/ui/stats.js` | ✅ Done | `renderStats(filteredEquipment, moves, now?)` — fills 6 metric card counts; syncs danger/warn card colour based on non-zero counts |
| `src/ui/operations.js` | ✅ Done | `renderOperationsView(state)` — filter selects, equipment table, location summary, move form selects; `bindOperationsEvents({repository, showToast})` — all event listeners including move form submit |
| `src/ui/moves.js` | ✅ Done | `renderMovesView(state, {isAdmin})` — filter selects + table; `bindMovesEvents({repository, showToast})` — mark-received (calls move_receipt edge fn), soft-delete, correction modal dispatch |
| `src/ui/admin.js` | ✅ Done | `renderAdminView(state)` — populates equipment/location/status selects in all admin forms; `bindAdminEvents({repository, showToast})` — add equipment, edit equipment, calibration, CSV import |
| `src/ui/modals.js` | ✅ Done | `bindModalsEvents({repository, showToast})` — condition history, correction, correction-details dialogs; all event-driven via DOM custom events |
| `src/auth.js` | ✅ Done | `initAuth({showToast})` — Supabase login/logout, `profiles.role` check, dev mode passcode, fires `"auth:admin-changed"` |
| `src/legacy/localStorage.js` | ✅ Done | Archived adapters: `createLocalStorageStorageAdapter`, `createMockApiStorageAdapter`, migration helpers — not in main flow |
| `src/ui/devtools.js` | ✅ Done | `initDevtools()` — reveals `#devtools-card` on admin mode, diagnostics log, edge-function test buttons |
| `supabase/functions/move_create/` | ✅ Keep as-is | Untouched |
| `supabase/functions/move_receipt/` | ✅ Keep as-is | Untouched |

---

## `src/events.js` — App Event System

This is the glue between the backend data layer and the frontend display layer. When data changes, the backend fires an event. The frontend listens for that event and re-draws the screen.

---

### `on(eventName, handler)` ★★★★★

**What it does:** Registers a function to run whenever a named event is fired. Returns a function you can call to unregister it.

**How it works:** Maintains a `Map` where each key is an event name and each value is an array of handler functions. When `on` is called, the handler is pushed into the array for that event name. The returned unsubscribe function removes it.

**Frontend suggestion:** The new frontend should use exactly one call:
```js
on("state:changed", (newState) => renderApp(newState));
```
This is the single wire between backend and UI — when data changes, re-draw everything.

---

### `emit(eventName, payload)` ★★★★★

**What it does:** Triggers all functions that were registered for a named event, passing them the payload data.

**How it works:** Looks up the array of handlers for the event name and calls each one in order, passing the payload. If no handlers are registered, nothing happens.

**Frontend suggestion:** The new frontend should never call `emit` directly. Only the repository calls it (after saving state). Your UI only needs to listen, not emit.

---

## `src/model.js` — Data Constants & State Builders

This file defines the canonical list of valid values (locations, statuses, etc.) and provides functions to build and upgrade the state structure.

---

### Constants ★★★★★

These are the single source of truth for all dropdown options and valid values across the app.

| Constant | Value | What it's for |
|---|---|---|
| `physicalLocations` | `["Perth", "Melbourne", "Brisbane", "Sydney", "New Zealand"]` | The five main office locations (not "On Hire" or "Workshop") |
| `editableStatusOptions` | `["Available", "On demo", "On hire", "In service / repair", "Quarantined"]` | Statuses the user can set. "In transit" is NOT here — it's computed automatically |
| `statusFilterOptions` | above + `"In transit"` | Used for the status filter dropdown only |
| `calibrationFilterOptions` | `["All", "Overdue", "Due soon", "OK", "Unknown", "Not required"]` | Options for the calibration filter |
| `subscriptionFilterOptions` | same as above | Options for the subscription filter |
| `moveConditionExemptStatuses` | `Set {"In service / repair", "Quarantined"}` | Moves to these statuses skip the condition check step |
| `moveTypeOptions` | Array of `{value, label}` pairs | All move types used in the Moves log filter |

**Frontend suggestion:** Import these directly into your new UI's select elements. Never hardcode status or location strings in HTML — always pull from these constants so a change in one place updates everywhere.

---

### `normalizeStatus(rawStatus, rawLocation)` ★★★☆☆

**What it does:** Cleans up a messy or legacy status string into one of the valid `editableStatusOptions` values.

**How it works:** Converts the input to lowercase and checks for matches. If the location string suggests "on hire", returns `"On hire"`. If the raw status matches a valid option (case-insensitive), returns the correctly-cased version. Falls back to `"Available"` if nothing matches.

**Frontend suggestion:** Only needed during CSV import to handle messy data. Not relevant to the new UI's normal flow.

---

### `getSeedDate({months, days})` ★★☆☆☆

**What it does:** Returns a date string offset from today — e.g. `getSeedDate({months: -6})` returns a date 6 months ago.

**How it works:** Takes today's date, adds/subtracts the requested months and days, and returns it as a `YYYY-MM-DD` string.

**Frontend suggestion:** Used for generating test data only. Not needed in production UI.

---

### `buildDefaultState(schemaVersion)` ★★★★☆

**What it does:** Returns a blank, valid state object with empty arrays for all data collections.

**How it works:** Pure function — just returns `{schemaVersion: 2, equipment: [], moves: [], corrections: [], locations: []}`. No side effects.

**Frontend suggestion:** Keep. The new UI should show a loading spinner while `hydrate()` runs. While loading, the state is this empty default, so the UI can render safely without crashing.

---

### `migrateStateIfNeeded(inputState)` ★★★☆☆

**What it does:** Takes old or broken state and upgrades it to the current format.

**How it works:** Checks if `schemaVersion` is missing or old. Handles renamed fields from the original app (e.g. `items` was renamed to `equipment`, `log` was renamed to `moves`). Fills in any missing fields with safe defaults using `buildDefaultState()`.

**Frontend suggestion:** Keep as-is. This runs automatically when state is loaded from localStorage (legacy path). The new frontend doesn't need to call it directly.

---

## `src/storage.js` — Browser Storage Helpers

Handles saving small UI preferences (like which tab is open) to `localStorage`, and provides legacy/mock adapters for when Supabase isn't available.

---

### `createLocalStorageStorageAdapter()` ★★☆☆☆

**What it does:** Creates a storage adapter that saves the entire app state to the browser's `localStorage`.

**How it works:** `load()` reads the `"equipmentTrackerState"` key from localStorage, parses the JSON, and runs it through `migrateStateIfNeeded()`. `save(state)` serialises the state to JSON and writes it back. `clear()` deletes the key.

**Frontend suggestion:** This was the original storage before Supabase was added. It's no longer the primary adapter but still works as a fallback for offline use. Not used directly by the new frontend.

---

### `createMockApiStorageAdapter({latencyMs})` ★★☆☆☆

**What it does:** Creates a fake storage adapter that stores data in memory with a simulated network delay.

**How it works:** Holds state in a JS variable. `load()` and `save()` both resolve after the given latency (default 80ms), simulating a slow network. Data is lost when the page is closed.

**Frontend suggestion:** Very useful for UI development — swap in this adapter to work on the frontend without touching Supabase. Just change one line in the startup code.

---

### `readStoredAppState()` / `writeStoredAppState(state)` ★★☆☆☆

**What they do:** Direct get/set for the full app state in localStorage.

**How they work:** One-liner wrappers: `getItem` + `JSON.parse` / `JSON.stringify` + `setItem`.

**Frontend suggestion:** Keep for legacy migration checks. Not needed in the normal Supabase flow.

---

### `loadActiveTab()` ★★★★☆

**What it does:** Returns the name of the tab the user had open last time (`"operations"`, `"moves"`, or `"admin"`), defaulting to `"operations"` if nothing is stored.

**How it works:** Reads `localStorage["equipmentTrackerActiveTab"]` and returns it, or `"operations"` if it's null.

**Frontend suggestion:** Call this on startup to restore the user's last tab. Especially useful so a user refreshing the page doesn't lose their place.

---

### `saveActiveTab(tab)` ★★★★☆

**What it does:** Saves the currently active tab name to localStorage so it survives a page reload.

**How it works:** Writes the tab name string to `localStorage["equipmentTrackerActiveTab"]`.

**Frontend suggestion:** Call this whenever the user switches tabs.

---

### `hasConditionMigrationFlag()` / `setConditionMigrationFlag()` ★★☆☆☆

**What they do:** Track whether a one-time data migration has already been run in this browser.

**How they work:** Read/write a `"true"` string to `localStorage["pcteConditionMigrationV1"]`.

**Frontend suggestion:** Keep as-is. The new frontend doesn't need to interact with these.

---

## `src/repository/index.js` — Central State Store

This is the heart of the data layer. All state changes go through the repository. It holds the in-memory state, persists it to Supabase, and emits events so the UI can re-render.

---

### `createRepository(adapter)` ★★★★★

**What it does:** Creates and returns the repository object — the central state store the whole app uses. Takes a storage adapter (Supabase, localStorage, or mock) and returns an object containing all the state mutation methods.

**How it works:** Holds a private `state` variable initialised to `buildDefaultState()`. All the returned methods close over this variable. The adapter is stored for use in `persist()`.

**Frontend suggestion:** Create this once at app startup and export it. The new frontend imports it and calls its methods — nothing else needs to know about adapters or the internal state variable.

---

### `hydrate()` ★★★★★

**What it does:** Loads all data from Supabase and makes it available to the app. This is the startup call.

**How it works:** Calls `adapter.load()` which runs several parallel Supabase queries. The result is the full state object. Then calls `persist()` (which emits `"state:changed"`) so the UI renders with real data.

**Frontend suggestion:** Call this once at startup, before rendering. Show a loading screen while it's running. On failure, show a user-friendly error message (currently the error just logs to console).

---

### `getState()` ★★★★★

**What it does:** Returns the current in-memory state object.

**How it works:** Simple getter — returns the private `state` variable synchronously. No network calls.

**Frontend suggestion:** Call this inside your `"state:changed"` listener to get the latest state and pass it to your render functions. Don't store your own copy of state — always read from here.

---

### `persist()` ★★★★★

**What it does:** Saves the current state to Supabase and then fires `"state:changed"` so the UI updates.

**How it works:** Calls `adapter.save(state)`, then calls `emit("state:changed", state)`. This is the end of every write operation.

**Frontend suggestion:** Never call this directly from the UI. All state mutations should go through the named methods below, which call `mutate()`, which calls `persist()`.

---

### `mutate(mutatorFn)` ★★★★★

**What it does:** The only safe way to change state. You give it a function that modifies the state, and it handles saving and notifying the UI automatically.

**How it works:** Calls your mutator function with the current state as a draft. After the function runs, calls `persist()` to save to Supabase and trigger a UI re-render. Returns the updated state.

**Frontend suggestion:** Don't call `mutate()` directly from form handlers — use the named methods below. They're clearer and easier to understand. `mutate()` is for internal use by the repository.

---

### `addEquipment(payload)` ★★★★★

**What it does:** Adds a new piece of equipment to the tracker.

**How it works:** Generates a new UUID for the equipment, merges it with the payload, and pushes the new equipment object onto `state.equipment`. Calls `persist()`.

**Frontend suggestion:** Call this from the Add Equipment form handler. Pass it the form values as an object. It handles the UUID generation.

```js
await repository.addEquipment({
  name: "RIEGL VZ-400",
  model: "Terrestrial LiDAR",
  serialNumber: "ABC-123",
  location: "Perth",
  status: "Available",
  calibrationRequired: true,
  calibrationIntervalMonths: 12,
});
```

---

### `updateEquipment(id, patch)` ★★★★★

**What it does:** Updates any fields on an existing piece of equipment without touching the rest.

**How it works:** Finds the equipment item with the matching `id` in `state.equipment` and merges the patch object into it using `Object.assign`. Calls `persist()`.

**Frontend suggestion:** Call this from the Edit Equipment form. Pass only the fields that changed — you don't need to send the whole object.

```js
await repository.updateEquipment(equipment.id, { status: "On hire", location: "Melbourne" });
```

---

### `importEquipment(rows)` ★★★☆☆

**What it does:** Adds multiple equipment items at once (bulk import from CSV).

**How it works:** Loops through the rows array and pushes each one onto `state.equipment` with a generated UUID. Calls `persist()` once after all rows are added.

**Frontend suggestion:** Called from the CSV import panel. Keep as-is.

---

### `recordMove(payload)` ★★★★★

**What it does:** Records that a piece of equipment has moved to a new location.

**How it works:** Creates a new move object with a generated UUID and unshifts it to the front of `state.moves` (so the most recent move is always first). Also updates the equipment's `location` and `status` fields. Calls `persist()`.

**Frontend suggestion:** Currently called after the `move_create` Supabase edge function succeeds. The edge function handles the DB write; this updates the in-memory state. Keep this two-step pattern for now — the edge function validates auth and does the atomic multi-table write, then this syncs the in-memory copy.

---

### `recordReceipt(moveId, receiptData)` ★★★★☆

**What it does:** Records that equipment has been physically received at its destination, along with the condition it arrived in.

**How it works:** Finds the move with the matching `moveId` and updates it with the receipt data object (received date, condition rating, notes). Calls `persist()`.

**Frontend suggestion:** Call this when a user confirms receipt of equipment. In the new UI, this could be a "Mark as received" button on the equipment card or in the Moves tab.

---

### `recordCalibration(payload)` ★★★★☆

**What it does:** Logs that a piece of equipment was calibrated on a specific date.

**How it works:** Creates a move entry with `type: "calibration"` and adds it to `state.moves`. Also updates `equipment.lastCalibrationDate` and optionally `equipment.calibrationIntervalMonths`. Calls `persist()`.

**Frontend suggestion:** Called from the Calibration form. No change needed — keep as-is.

---

### `recordSubscriptionUpdate(payload)` ★★★☆☆

**What it does:** Logs a subscription renewal or change event in the move history.

**How it works:** Creates a move entry with `type: "subscription_updated"` and pushes it to `state.moves`. Calls `persist()`.

**Frontend suggestion:** This is called automatically when subscription data changes. Not triggered directly by a UI form. Keep as-is.

---

### `addCorrection(payload)` ★★★★☆

**What it does:** Records a correction to a previously entered move — like an errata. Does not change the original move.

**How it works:** Pushes a new correction object onto `state.corrections` containing the move ID, which field was wrong, the old value, the new value, and the reason. Calls `persist()`. The corrections are applied on top of moves at read time in the Moves log.

**Frontend suggestion:** Called from the Correction modal. Keep as-is. The non-destructive approach is the right design — always prefer corrections over edits.

---

### `archiveHistory()` ★★☆☆☆

**What it does:** Hides all existing moves from the main moves list by marking them as archived.

**How it works:** Loops through every move in `state.moves` and sets `archived: true`. Calls `persist()`.

**Frontend suggestion:** Keep as an admin-only action (e.g. "Archive all moves" button in Admin tab). Not frequently needed.

---

## `src/supabaseClient.js` — Supabase Integration

This file contains everything needed to communicate with both Supabase databases: the two connection clients, functions to translate data between DB format and app format, the storage adapter, and the subscription record creator.

---

### Two Supabase Clients ★★★★★

```js
supabase              // Database A — Fleet Tracker (eugdravtvewpnwkkpkzl.supabase.co)
subscriptionSupabase  // Database B — Subscription Tracker (ezsqpiwzcuczgqdqyuqx.supabase.co)
```

**What they do:** Connection objects that all Supabase queries go through.

**How they work:** Initialised with a project URL and anon (public) key. The anon key is safe to expose in client-side code — it's limited by Supabase Row Level Security policies.

**Frontend suggestion:** The new frontend should never import these directly. All data access goes through the adapter (via repository). If you need to add auth (login/logout), import `supabase` only in an `auth.js` module.

---

### `handleAddEquipmentSupabase(payload, tableName)` ★☆☆☆☆

**What it does:** Directly inserts a row into any Supabase table. Legacy function from before the repository pattern was added.

**How it works:** Calls `supabase.from(tableName).insert(payload)` directly.

**Frontend suggestion:** Delete this. It bypasses validation, the event system, and in-memory state sync. All writes must go through `repository.addEquipment()`.

---

### `getSupabaseLocationID(locationName)` ★★★☆☆

**What it does:** Looks up the UUID of a location by its display name (e.g. "Perth" → `"abc-123-..."`).

**How it works:** Queries the `locations` table for a row where `name = locationName` and returns the `id` field.

**Frontend suggestion:** This makes an extra network call every time a form is submitted. In the new UI, use `state.locations` which is already loaded at startup — look up the location ID from there instead:

```js
const loc = state.locations.find(l => l.name === selectedLocation);
const locationId = loc?.id;
```

---

### `getEquipmentSnapshot(equipmentID)` ★★★☆☆

**What it does:** Fetches just the name, asset_tag, and serial number of one piece of equipment.

**How it works:** Direct Supabase query: `equipment.select("name, asset_tag, serial").eq("id", equipmentID)`.

**Frontend suggestion:** Not needed in the new UI — all equipment data is already in `state.equipment`. Use `state.equipment.find(e => e.id === id)` instead. Consider removing this function.

---

### `mapEquipmentFromDb(row, subscriptionBySerial)` ★★★★★

**What it does:** Converts a raw database row (snake_case) into the app's equipment object format (camelCase). Also merges in subscription renewal data from Database B.

**How it works:**
1. Takes the `equipment` row joined with `equipment_state`, `current_location`, and `home_location`
2. Renames every field from `snake_case` to `camelCase`
3. Looks up the equipment's serial number in `subscriptionBySerial` (a pre-built lookup map from DB B)
4. If found, adds `subscriptionRenewalDate` and `subscriptionRequired: true` to the object
5. Returns one flat app equipment object

**Frontend suggestion:** This is the contract between what the database stores and what your UI components receive. If you add a new field to the database and want it in the UI, add it here. Keep exactly as-is.

---

### `mapEquipmentToDb(eq)` ★★★★★

**What it does:** Converts an app equipment object back into the format the `equipment` table expects (only the fields that belong in that table).

**How it works:** Picks specific camelCase app fields and renames them to their snake_case DB column names. Only includes fields that live in the `equipment` table (not `equipment_state`).

**Frontend suggestion:** Keep as-is. If a new field needs to be saved in the `equipment` table, add it here.

---

### `mapEquipmentStateToDb(eq)` ★★★★★

**What it does:** Converts an app equipment object into the format the `equipment_state` table expects.

**How it works:** Picks the fields that belong in `equipment_state` (status, condition data, checklists, etc.) and renames them to snake_case column names.

**Frontend suggestion:** Keep as-is. The split between `equipment` and `equipment_state` is a DB design choice — this function hides that complexity from the rest of the app.

---

### `mapMoveFromDb(row)` ★★★★★

**What it does:** Converts a database move row into the app's move object format.

**How it works:** Renames fields from snake_case to camelCase. Also extracts `move_receipts[0]` (the first receipt for this move) and adds it as `receiptData` on the move object.

**Frontend suggestion:** Keep as-is. The `receiptData` extraction is important — the Moves log uses it to show condition results without a separate lookup.

---

### `mapMoveToDb(move)` ★★★★★

**What it does:** Converts an app move object into the format the `moves` table expects.

**How it works:** Picks the relevant fields and renames from camelCase to snake_case.

**Frontend suggestion:** Keep as-is.

---

### `mapCorrectionFromDb(row)` ★★★★☆

**What it does:** Converts a database correction row into the app's correction object format.

**How it works:** Simple rename of all fields from snake_case to camelCase (`move_id → moveId`, `old_value → oldValue`, etc.).

**Frontend suggestion:** Keep as-is.

---

### `mapCorrectionToDb(c)` ★★★★☆

**What it does:** Converts an app correction object back into the format the `corrections` table expects.

**How it works:** Reverse of `mapCorrectionFromDb` — renames camelCase back to snake_case.

**Frontend suggestion:** Keep as-is.

---

### `adapter.load()` ★★★★★

**What it does:** Fetches ALL data needed to run the app from Supabase in one go.

**How it works:** Fires 5 parallel queries:
1. `equipment` joined with `equipment_state`, `current_location`, and `home_location`
2. `moves` joined with `move_receipts`, ordered most-recent-first
3. `corrections`
4. `locations` (active only)
5. `subscriptions` from Database B (to get renewal dates)

Builds a `subscriptionBySerial` lookup map from the DB B results, then calls `mapEquipmentFromDb` on every equipment row (which merges in the subscription data). Maps moves and corrections similarly.

Returns one assembled state object: `{ equipment, moves, corrections, locations }`.

**Frontend suggestion:** Keep as-is. The new frontend never calls this directly — `repository.hydrate()` calls it. One improvement worth making: add a proper error handler that shows a user-friendly message if the load fails (e.g. no internet connection).

---

### `adapter.save(state)` ★★★★★

**What it does:** Writes the current in-memory state back to all the Supabase tables.

**How it works:** Fires 4 parallel upserts (create-or-update based on `id`):
1. `equipment` table — upserts using `mapEquipmentToDb`
2. `equipment_state` table — upserts using `mapEquipmentStateToDb`
3. `moves` table — upserts using `mapMoveToDb`
4. `corrections` table — upserts using `mapCorrectionToDb`

Each upsert uses `onConflict: "id"` so existing rows are updated and new rows are created.

**Frontend suggestion:** Keep as-is. One future improvement: save only the changed records (delta saves) rather than re-upsetting everything every time. This would make writes faster as the equipment list grows.

---

### `createSubscriptionRecord(equipment, billingCycle)` ★★★★☆

**What it does:** Creates a subscription record in Database B (Subscription Tracker) when a new piece of equipment is added with a subscription.

**How it works:** Upserts a row in DB B's `subscriptions` table with:
- `serial_number` (from `equipment.serialNumber`) — this is the shared key linking the two databases
- `product_name` (from `equipment.name`)
- `customer = "PCTE Fleet Equipment"` (hardcoded)
- `billing_cycle` (passed parameter, defaults to `"monthly"`)

Uses `ignoreDuplicates: true` so it won't error if a subscription already exists for that serial.

**Frontend suggestion:** Keep. Call this automatically from the Add Equipment handler when `subscriptionRequired` is checked, exactly as the current code does.

---

## `src/ui/admin.js` — Admin View ✅ Done

Handles the Admin tab: adding new equipment, editing existing equipment (including condition checklists), recording calibrations, and importing equipment from CSV.

---

### `renderAdminView(state)` ★★★★★

**What it does:** Refreshes all dropdown selects in the Admin tab so they reflect current equipment and location data.

**How it works:** Populates the equipment selects in the edit form, calibration form, and copy-checklist source; and the location/status selects in both add and edit forms. Preserves the currently-selected values where possible.

**Frontend suggestion:** Call on every `state:changed`. It is cheap — it only rebuilds `<option>` elements and restores selections.

---

### `bindAdminEvents({ repository, showToast })` ★★★★★

**What it does:** Wires all interactive controls in the Admin tab. Returns a `{ syncState(state) }` controller that keeps the module's internal `_state` reference up to date.

**How it works:**
- **Add equipment form** (`#add-equipment-form`): validates name (required) and serial (duplicate check against `state.equipment`), builds a payload object from all form fields, calls `repository.addEquipment(payload)`, then calls `createSubscriptionRecord()` if subscription is checked.
- **Edit equipment form** (`#edit-equipment-form`): when the equipment select changes, `populateEditForm()` fills every field from the selected item. On submit, patches the item via `repository.updateEquipment(id, patch)` including the rebuilt `conditionReference` from the two textareas.
- **Calibration form** (`#calibration-form`): calls `repository.recordCalibration(payload)` then also calls `repository.updateEquipment()` to persist the new `lastCalibrationDate` and `calibrationIntervalMonths` directly onto the equipment record.
- **CSV import**: parses the uploaded file, previews up to 10 rows in a table, respects the duplicate-serial mode (skip/import anyway), then calls `repository.importEquipment(rows)` on confirm.
- **Toggle fields**: calibration-required checkbox shows/hides the interval and last-calibration fields; subscription-required checkbox shows/hides date and billing cycle fields. Both add and edit forms have these.

---

### `parseCSV(text)` ★★★☆☆

**What it does:** Converts raw CSV text into an array of equipment objects ready for import.

**How it works:** Splits on newlines, uses the header row as keys, calls `normalizeStatus()` on the status column, parses booleans from the `calibrationRequired` column. Returns `{ rows, warnings }` — invalid rows are skipped with a warning message.

**CSV columns:** `name, model, serial, purchaseDate, location, status, calibrationRequired, calibrationIntervalMonths, lastCalibrationDate`

**Frontend suggestion:** A "Download template" button (`#import-template-button`) generates a pre-formatted CSV with these headers and one example row.

---

## `supabase/functions/move_create/index.ts` — Create Move Edge Function ★★★★★

**What it does:** A server-side function that securely creates a new move record, optionally with shipping details.

**How it works:**
1. Receives a POST request with move data in the JSON body
2. Validates the `Authorization: Bearer <token>` header and decodes the JWT to get the user's ID
3. Validates required fields (`equipment_id`, `move_type`, `to_location_id`, `moved_at`)
4. Checks if shipping is required based on `move_type` (required for `"office_transfer"`, `"hire_out"`, `"hire_return"`)
5. If shipping required, validates `carrier` and `tracking_number` are provided
6. Inserts a new row into `moves` with `created_by = userId`
7. Sets `requires_receipt = false` only for `"workshop"` moves; all others require a receipt
8. If shipping details are provided, inserts into `move_shipping`
9. Upserts `equipment_state` to update `current_location_id` and `current_move_id`
10. Returns `{success: true, move}` with the created move object

**Request body fields:**
| Field | Type | Required? |
|---|---|---|
| `equipment_id` | uuid | Yes |
| `move_type` | string | Yes |
| `to_location_id` | uuid | Yes |
| `moved_at` | timestamptz | Yes |
| `from_location_id` | uuid | No |
| `notes` | string | No |
| `carrier` | string | Required if shipping move type |
| `tracking_number` | string | Required if shipping move type |
| `booked_at` | timestamptz | No |

**Frontend suggestion:** Keep this pattern. The edge function runs with the user's JWT, so it can enforce that only authenticated users create moves, and it handles the multi-table write atomically. The new form submit handler should call this endpoint, then call `repository.recordMove()` to sync the in-memory state.

---

## `supabase/functions/move_receipt/index.ts` — Record Receipt Edge Function ★★★★☆

**What it does:** Records that a piece of equipment has been physically received at its destination, and optionally captures the condition it arrived in.

**How it works:**
1. Receives a POST request with `move_id` and optional condition data
2. Validates the JWT token to identify the user
3. Validates `move_id` is provided
4. Fetches the move from the DB to confirm it exists (404 if not found)
5. Inserts a new row into `move_receipts` with `received_by = userId`
6. Returns `{success: true, receipt, move}` with the created receipt and the move it belongs to

**Request body fields:**
| Field | Type | Required? |
|---|---|---|
| `move_id` | uuid | Yes |
| `received_at` | timestamptz | No (defaults to now) |
| `condition_result` | string | No |
| `condition_notes` | string | No |

**Frontend suggestion:** Keep. In the new UI, there should be a clear "Mark as received" action on any move that `requires_receipt = true`. After calling this endpoint, call `repository.recordReceipt(moveId, receiptData)` to sync the in-memory state.

---

## Supabase Schema Reference

### Database A — Fleet Tracker

| Table | Purpose | New UI reads? | New UI writes? |
|---|---|---|---|
| `equipment` | Equipment static data (name, model, serial, purchase date, calibration settings) | ★★★★★ | ★★★★★ |
| `equipment_state` | Equipment dynamic state (current location, status, condition data, checklists) | ★★★★★ | ★★★★★ |
| `moves` | Movement history log | ★★★★★ | ★★★★★ |
| `move_receipts` | Condition check at receipt for each move | ★★★★☆ | ★★★★☆ |
| `move_shipping` | Carrier and tracking number for shipped moves | ★★★★☆ | ★★★★☆ via edge fn |
| `locations` | Reference table of all physical locations | ★★★★★ | ★☆☆☆☆ |
| `corrections` | Audit trail of corrections applied to move records | ★★★★☆ | ★★★★☆ |
| `profiles` | User roles and office locations | ★★☆☆☆ via edge fn | ★☆☆☆☆ |

### Database B — Subscription Tracker

| Table | Purpose | New UI reads? | New UI writes? |
|---|---|---|---|
| `subscriptions` | Software subscription records linked to equipment by serial number | ★★★★☆ (renewal_date only) | ★★★★☆ (on equipment add) |
| `subscription_renewals` | Renewal history per subscription | ★☆☆☆☆ | ★☆☆☆☆ |
| `subscription_workflow_history` | Managed by the subscription tracker — not touched by fleet tracker | ★☆☆☆☆ | ★☆☆☆☆ |

### Key Column Mappings (DB → App State)

| DB Table | DB Column | App State Field | Notes |
|---|---|---|---|
| `equipment` | `name` | `name` | |
| `equipment` | `category` | `model` | Renamed in app |
| `equipment` | `serial` | `serialNumber` | Renamed in app |
| `equipment` | `purchase_date` | `purchaseDate` | |
| `equipment` | `calibration_required` | `calibrationRequired` | |
| `equipment` | `calibration_interval_months` | `calibrationIntervalMonths` | |
| `equipment` | `last_calibration_date` | `lastCalibrationDate` | |
| `equipment_state` | `status` | `status` | |
| `equipment_state` | `current_location_id` | `location` | UUID resolved to name |
| `equipment_state` | `last_condition_result` | `conditionRating` | |
| `equipment_state` | `last_condition_at` | `conditionLastCheckedAt` | |
| `equipment_state` | `condition_contents_ok` | `conditionContentsOk` | |
| `equipment_state` | `condition_functional_ok` | `conditionFunctionalOk` | |
| `equipment_state` | `condition_last_notes` | `conditionLastNotes` | |
| `equipment_state` | `condition_reference` | `conditionReference` | JSONB object |
| `equipment_state` | `condition_history` | `conditionHistory` | JSONB array |
| `moves` | `move_type` | `type` | |
| `moves` | `notes` | `text` | Renamed in app |
| `moves` | `moved_at` | `timestamp` | |
| `moves` | `to_location_id` | `toLocationId` | |
| `subscriptions` | `renewal_date` | `subscriptionRenewalDate` | From DB B |
| `subscriptions` | `serial_number` | — | Matched to `equipment.serial` |
