# `src/ui/`

This directory contains all rendering and DOM interaction code. Each file is responsible for one logical section of the interface. No file here modifies `state` directly — mutations are made by calling repository methods passed in as parameters. Files communicate with each other only through DOM custom events, never by importing each other.

---

## `computed.js`

Pure functions with no DOM access and no side effects. Takes data in, returns a value. Every function is safe to call in unit tests. Imported by most other UI modules to compute derived values before rendering.

### `escapeHTML(value)`

**Purpose:** Escape a value for safe insertion into HTML strings, preventing XSS.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `value` | `any` | Any caller | Value to escape; coerced to string first |

**Returns:** `string` — HTML-safe string with `&`, `<`, `>`, `"`, `'` replaced by entities.

---

### `formatDate(date)`

**Purpose:** Format a `Date` object to a `"YYYY-MM-DD"` string.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `date` | `Date` | Date to format |

**Returns:** `string`

---

### `formatDateTime(value)`

**Purpose:** Format a timestamp (ISO string, Date, or any parseable value) to a compact `"DD/MM/YYYY, HH:mm"` string. Returns `"—"` for null/invalid values.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `value` | `string\|Date\|null` | `~/src/repository/index.js → getState().moves[].timestamp` | Timestamp to format |

**Returns:** `string`

---

### `getAgeLabel(purchaseDate, now?)`

**Purpose:** Calculate the age of a piece of equipment from its purchase date and return a compact label such as `"2y 3m"` or `"5m"`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `purchaseDate` | `string\|null` | `~/src/repository/index.js → getState().equipment[].purchaseDate` | `"YYYY-MM-DD"` purchase date |
| `now` | `Date` | Optional, defaults to `new Date()` | Reference date for age calculation |

**Returns:** `string` — e.g. `"2y 3m"`, `"11m"`, or `"Unknown"`.

---

### `getCalibrationInfo(item, now?)`

**Purpose:** Compute the calibration health of one equipment item based on `lastCalibrationDate` and `calibrationIntervalMonths`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item object |
| `now` | `Date` | Optional, defaults to `new Date()` | Reference date |

**Returns:** `{ status: "Not required"|"Unknown"|"Overdue"|"Due soon"|"OK", dueDate: Date|null }`

---

### `getSubscriptionInfo(item, now?)`

**Purpose:** Compute the subscription health of one equipment item based on `subscriptionRenewalDate` (sourced from Database B at load time).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item object |
| `now` | `Date` | Optional, defaults to `new Date()` | Reference date |

**Returns:** `{ status: "Not required"|"Unknown"|"Overdue"|"Due soon"|"OK", renewalDate: Date|null }`

---

### `getLatestConditionForItem(item)`

**Purpose:** Return the most recent condition snapshot for an equipment item from the flat fields stored in `equipment_state`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item object |

**Returns:** `{ grade, checkedAt, contentsOk, functionalOk, checkedBy } | null` — `null` if no condition check has been recorded.

---

### `conditionBadgeClass(rating)`

**Purpose:** Map a condition rating string to the corresponding CSS modifier class for `.condition-badge`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `rating` | `string\|null` | `~/src/repository/index.js → getState().equipment[].conditionRating` | Condition rating string |

**Returns:** `string` — e.g. `"condition-badge--good"`, `"condition-badge--bad"`, `"condition-badge--warn"`, `"condition-badge--neutral"`.

---

### `isShippingActive(item, moves)`

**Purpose:** Return `true` if the equipment item is currently in transit (has an unreceipted move of a receipt-required type).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item |
| `moves` | `object[]` | `~/src/repository/index.js → getState().moves` | Full moves array |

**Returns:** `boolean`

---

### `getEffectiveStatus(item, moves)`

**Purpose:** Return the display status of an item, substituting `"In transit"` when `isShippingActive` is true.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item |
| `moves` | `object[]` | `~/src/repository/index.js → getState().moves` | Full moves array |

**Returns:** `string` — effective status for display.

---

### `getEquipmentLocationDisplay(item, moves)`

**Purpose:** Return a display-ready location string. When in transit, returns `"In transit (From → To)"`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `~/src/repository/index.js → getState().equipment[]` | Equipment item |
| `moves` | `object[]` | `~/src/repository/index.js → getState().moves` | Full moves array |

**Returns:** `{ text: string, inTransit: boolean }`

---

### `statusPillClass(status)`

**Purpose:** Map an equipment status string to the CSS modifier class for `.pill`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `status` | `string` | `~/src/ui/computed.js → getEffectiveStatus()` | Status string |

**Returns:** `string` — e.g. `"pill--available"`, `"pill--in-transit"`.

---

### `healthPillClass(status)`

**Purpose:** Map a calibration or subscription health status to a `.pill` CSS modifier class.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `status` | `string` | `~/src/ui/computed.js → getCalibrationInfo()` or `getSubscriptionInfo()` | Health status string |

**Returns:** `string` — e.g. `"pill--overdue"`, `"pill--ok"`, `"pill--n-a"`.

---

---

## `filters.js`

Reads filter values from the DOM and applies them to in-memory state arrays. Also applies corrections on top of raw moves before filtering. No DOM writes — purely data transformation.

### `applyCorrectionsToMoves(moves, corrections)`

**Purpose:** Return a copy of the moves array with all matching corrections merged in non-destructively. Each returned move gets a `_corrections[]` array listing which corrections were applied.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `moves` | `object[]` | `~/src/repository/index.js → getState().moves` | Raw moves from state |
| `corrections` | `object[]` | `~/src/repository/index.js → getState().corrections` | Raw corrections from state |

**Returns:** `object[]` — corrected moves, each with `_corrections: CorrectionEntry[]` appended.

---

### `readEquipmentFilters()`

**Purpose:** Read the current equipment filter values from the DOM filter controls.

**Parameters:** None

**Returns:** `{ search: string, location: string, status: string, calibration: string, subscription: string }`

---

### `getFilteredEquipment(state, filters?, now?)`

**Purpose:** Filter `state.equipment` using the supplied (or DOM-read) filter values. Uses computed functions for effective status, calibration, and subscription health — no DOM access inside the predicate.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |
| `filters` | `object` | `~/src/ui/filters.js → readEquipmentFilters()` (optional) | Filter values; reads DOM if omitted |
| `now` | `Date` | Optional | Reference date for health calculations |

**Returns:** `object[]` — filtered equipment items.

---

### `readMovesFilters()`

**Purpose:** Read the current moves filter values from the DOM filter controls in the Moves tab.

**Parameters:** None

**Returns:** `{ equipment: string, type: string, destination: string, receiptOnly: boolean, showDeleted: boolean, search: string }`

---

### `isEntryDeleted(entry)`

**Purpose:** Return `true` if a move entry has been soft-deleted (has a `deletedAt` timestamp).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `entry` | `object` | `~/src/repository/index.js → getState().moves[]` | Move entry |

**Returns:** `boolean`

---

### `isMoveAwaitingReceipt(entry)`

**Purpose:** Return `true` if a move entry is a physical move type (`"move"`, `"hire_out"`, `"hire_return"`, `"office_transfer"`, `"workshop"`) and has not yet been receipted (`receiptData` is null/falsy).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `entry` | `object` | `~/src/repository/index.js → getState().moves[]` | Move entry |

**Returns:** `boolean`

---

### `getFilteredMoves(state, filters?, equipmentById?)`

**Purpose:** Apply corrections to moves, then filter using the supplied (or DOM-read) filter values.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |
| `filters` | `object` | `~/src/ui/filters.js → readMovesFilters()` (optional) | Filter values; reads DOM if omitted |
| `equipmentById` | `Map` | Optional | Pre-built `Map<id, item>` for fast lookups |

**Returns:** `object[]` — corrected and filtered move entries.

---

---

## `toast.js`

Manages the toast notification system. Appends dismissible toast elements to `#toast-container`, auto-dismisses after 3.5 s, and supports click-to-dismiss.

### `showToast(message, type?)`

**Purpose:** Display a non-blocking notification at the bottom of the screen. Accessible via `aria-live="polite"`.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | — | Text to display in the toast |
| `type` | `string` | `"info"` | One of `"success"`, `"error"`, `"info"` — controls colour |

**Returns:** `void`

---

---

## `stats.js`

Renders the six metric cards in the Operations view header. Reflects the currently-filtered equipment list so cards update when filters change.

### `renderStats(filteredEquipment, moves, now?)`

**Purpose:** Fill the six stat card counts and toggle their colour variants (amber/red) when counts are non-zero.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `filteredEquipment` | `object[]` | `~/src/ui/filters.js → getFilteredEquipment()` | Filtered equipment list |
| `moves` | `object[]` | `~/src/repository/index.js → getState().moves` | Full moves array (needed for effective status) |
| `now` | `Date` | Optional | Reference date for health calculations |

**Returns:** `void`

---

### `syncCardState(statId, count, modifier)` *(internal)*

**Purpose:** Toggle a CSS modifier class on a metric card element based on whether its count is non-zero.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `statId` | `string` | ID of the `<p>` count element inside the card |
| `count` | `number` | Current count value |
| `modifier` | `string` | CSS class to toggle, e.g. `"metric-card--danger"` |

**Returns:** `void`

---

---

## `operations.js`

The largest UI module. Owns the entire Operations view: equipment table, location summary cards, and the move console form. All event listeners for this view are wired in `bindOperationsEvents`.

### `renderOperationsView(state)`

**Purpose:** Main entry point called on every `"state:changed"` event. Orchestrates all sub-renders for the Operations view.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `renderFilterSelects(state)` *(internal)*

**Purpose:** Populate the location, status, calibration, and subscription filter `<select>` dropdowns from state data, preserving current selections.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/ui/operations.js → renderOperationsView()` | Full app state |

**Returns:** `void`

---

### `renderMoveFormSelects(state)` *(internal)*

**Purpose:** Populate the equipment, destination, and status dropdowns in the move console form.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/ui/operations.js → renderOperationsView()` | Full app state |

**Returns:** `void`

---

### `renderEquipmentTable(filtered, state, now)` *(internal)*

**Purpose:** Build and insert all equipment table rows with pills, condition badges, age labels, and calibration/subscription health indicators.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `filtered` | `object[]` | `~/src/ui/filters.js → getFilteredEquipment()` | Filtered equipment list |
| `state` | `object` | `~/src/repository/index.js → getState()` | Full state (for moves) |
| `now` | `Date` | `new Date()` | Reference date |

**Returns:** `void`

---

### `renderLocationSummary(state)` *(internal)*

**Purpose:** Render location cards below the table showing equipment counts per site. Clicking a card sets the location filter.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `syncShippingSection(state)` *(internal)*

**Purpose:** Show or hide the shipping fieldset in the move form based on whether the selected destination is in a different city (inter-office move).

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `syncConditionSection(state)` *(internal)*

**Purpose:** Show or hide the condition check section in the move form. Disables inputs when the selected destination status is condition-exempt.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `handleMoveSubmit(event, state, { showToast, repository })` *(internal)*

**Purpose:** Handle the move form submit. Validates required fields, calls the `move_create` Supabase edge function with the user's JWT, then calls `repository.recordMove()` to sync local state.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `event` | `SubmitEvent` | DOM | Form submit event |
| `state` | `object` | `~/src/repository/index.js → getState()` | Current app state |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For success/error feedback |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `recordMove()` |

**Returns:** `Promise<void>`

---

### `bindOperationsEvents({ repository, showToast })`

**Purpose:** Wire all Operations view event listeners (filter changes, table row clicks, move form field changes, move form submit). Called once at startup.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | Passed from `main.js` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | Passed from `main.js` |

**Returns:** `{ syncState(state): void }` — controller; call `syncState` on every `"state:changed"` to keep the module's internal `_state` reference current.

---

---

## `moves.js`

Renders the Moves Log view and handles the mark-received and soft-delete actions.

### `renderMovesView(state, { isAdmin })`

**Purpose:** Re-render the entire Moves Log view: filter selects and table rows with corrections applied.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |
| `isAdmin` | `boolean` | `~/src/main.js → _isAdmin` | Whether admin controls should be shown |

**Returns:** `void`

---

### `renderMovesFilterSelects(state)` *(internal)*

**Purpose:** Populate the equipment, type, and destination filter dropdowns in the Moves tab, preserving current selections.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `buildRow(entry, equipmentById, isAdmin, showActions)` *(internal)*

**Purpose:** Build the HTML string for a single moves table row, including correction badge, condition pill, notes, and action buttons.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `entry` | `object` | `~/src/ui/filters.js → getFilteredMoves()` | Single move entry (corrections already applied) |
| `equipmentById` | `Map` | `~/src/repository/index.js → getState().equipment` | Equipment lookup map |
| `isAdmin` | `boolean` | `~/src/main.js → _isAdmin` | Show admin-only buttons |
| `showActions` | `boolean` | `~/src/ui/moves.js → renderMovesView()` | Whether the Actions column is present |

**Returns:** `string` — HTML `<tr>` string.

---

### `handleMarkReceived(moveId, state)` *(internal)*

**Purpose:** Dispatch a `"modal:mark-received"` custom event to open the receipt condition modal. The actual API call and state update happen inside `modals.js` once the user confirms.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `moveId` | `string` | DOM button `data-id` attribute | UUID of the move to receipt |
| `state` | `object` | `~/src/repository/index.js → getState()` | Current app state (used to look up equipment name for modal title) |

**Returns:** `void`

---

### `handleSoftDelete(moveId, state, { showToast, repository })` *(internal)*

**Purpose:** Prompt the user for a deletion reason, then soft-delete a move entry by setting `deletedAt`, `deletedBy`, and `deleteReason` via `repository.mutate`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `moveId` | `string` | DOM button `data-id` attribute | UUID of the move to delete |
| `state` | `object` | `~/src/repository/index.js → getState()` | Current app state |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `mutate()` |

**Returns:** `void`

---

### `bindMovesEvents({ repository, showToast })`

**Purpose:** Wire all Moves view event listeners (filter changes, delegated table button clicks). Called once at startup.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | Passed from `main.js` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | Passed from `main.js` |

**Returns:** `{ syncState(state, { isAdmin }): void }` — controller for keeping internal state and admin flag current.

---

---

## `admin.js`

Handles the Admin tab: adding equipment, editing equipment (including condition checklists), recording calibrations, and CSV import.

### `renderAdminView(state)`

**Purpose:** Refresh all dropdown selects in the Admin tab so they reflect the latest equipment and location data.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | Full app state |

**Returns:** `void`

---

### `syncAddCalibrationFields()` *(internal)*

**Purpose:** Show or hide the calibration interval and last-calibration-date fields in the Add Equipment form based on the calibration-required checkbox.

**Parameters:** None

**Returns:** `void`

---

### `syncAddSubscriptionFields()` *(internal)*

**Purpose:** Show or hide the subscription renewal date and billing cycle fields in the Add Equipment form based on the subscription-required checkbox.

**Parameters:** None

**Returns:** `void`

---

### `syncEditCalibrationFields()` *(internal)*

**Purpose:** Same as `syncAddCalibrationFields` but for the Edit Equipment form.

**Parameters:** None

**Returns:** `void`

---

### `syncEditSubscriptionFields()` *(internal)*

**Purpose:** Same as `syncAddSubscriptionFields` but for the Edit Equipment form.

**Parameters:** None

**Returns:** `void`

---

### `getCalibrationIntervalMonths(prefix)` *(internal)*

**Purpose:** Read the calibration interval from the form, handling the "custom" option by falling back to the custom number input.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `prefix` | `string` | Form ID prefix: `"new-equipment"` or `"edit-equipment"` |

**Returns:** `number|null` — interval in months, or `null` if invalid.

---

### `populateEditForm(equipmentId, equipment)` *(internal)*

**Purpose:** Fill all Edit Equipment form fields from a selected equipment item, including calibration settings, subscription settings, and condition checklist textareas.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `equipmentId` | `string` | `#edit-equipment-select` value | UUID of the selected item |
| `equipment` | `object[]` | `~/src/repository/index.js → getState().equipment` | Full equipment array |

**Returns:** `void`

---

### `handleAddEquipmentSubmit(e, state, { repository, showToast })` *(internal)*

**Purpose:** Validate and submit the Add Equipment form. Calls `repository.addEquipment()` then optionally `createSubscriptionRecord()`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `e` | `SubmitEvent` | DOM | Form submit event |
| `state` | `object` | `~/src/repository/index.js → getState()` | For duplicate serial check |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `addEquipment()` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |

**Returns:** `Promise<void>`

---

### `handleEditEquipmentSubmit(e, state, { repository, showToast, _editId })` *(internal)*

**Purpose:** Validate and submit the Edit Equipment form. Rebuilds `conditionReference` from textareas. Calls `repository.updateEquipment()`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `e` | `SubmitEvent` | DOM | Form submit event |
| `state` | `object` | `~/src/repository/index.js → getState()` | For duplicate serial check |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `updateEquipment()` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |
| `_editId` | `Function` | `~/src/ui/admin.js → bindAdminEvents()` | Returns the currently selected equipment ID |

**Returns:** `Promise<void>`

---

### `handleCalibrationSubmit(e, state, { repository, showToast })` *(internal)*

**Purpose:** Validate and submit the Record Calibration form. Calls `repository.recordCalibration()` and `repository.updateEquipment()` to persist the date back onto the equipment record.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `e` | `SubmitEvent` | DOM | Form submit event |
| `state` | `object` | `~/src/repository/index.js → getState()` | For current equipment data |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `recordCalibration()` and `updateEquipment()` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |

**Returns:** `Promise<void>`

---

### `parseCSV(text)` *(internal)*

**Purpose:** Convert raw CSV text to an array of equipment objects. Skips rows without a name and returns per-row warning strings for invalid rows.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `text` | `string` | `FileReader.onload` result from `#import-file-input` | Raw CSV file content |

**Returns:** `{ rows: object[], warnings: string[] }`

---

### `renderImportPreview(state)` *(internal)*

**Purpose:** Refresh the import preview table, stats counters, and warnings list based on the current `_importRows` and `_importWarnings` module-level variables.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | For duplicate serial detection against existing equipment |

**Returns:** `void`

---

### `downloadCSVTemplate()` *(internal)*

**Purpose:** Trigger a browser download of a CSV template file with the correct column headers and one example row.

**Parameters:** None

**Returns:** `void`

---

### `handleImportSubmit(state, { repository, showToast })` *(internal)*

**Purpose:** Filter `_importRows` by the selected duplicate-serial mode, then call `repository.importEquipment()` to persist them. Resets the form on success.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | For duplicate serial filtering |
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `importEquipment()` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |

**Returns:** `Promise<void>`

---

### `bindAdminEvents({ repository, showToast })`

**Purpose:** Wire all Admin view event listeners. Called once at startup.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | Passed from `main.js` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | Passed from `main.js` |

**Returns:** `{ syncState(state): void }` — controller for keeping internal `_state` current.

---

---

## `modals.js`

All dialog (modal) behaviour. Three dialogs are managed here, each opened by a DOM custom event fired from another module. No render cycle — all state is kept current via `syncState`.

### `bindModalsEvents({ repository, showToast })`

**Purpose:** Initialise all four dialog listeners (condition history, correction, correction details, mark received). Called once at startup. Returns a controller for state sync.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `repository` | `object` | `~/src/repository/index.js → createRepository()` | For `addCorrection()` |
| `showToast` | `Function` | `~/src/ui/toast.js → showToast` | For feedback |

**Returns:** `{ syncState(state): void }`

---

### `initConditionHistoryModal()` *(internal)*

**Purpose:** Register the `"modal:condition-history"` DOM event listener. On open, calls `renderConditionHistory(item)` and calls `dialog.showModal()`.

**Parameters:** None

**Returns:** `void`

---

### `renderConditionHistory(item)` *(internal)*

**Purpose:** Build and insert the condition history list into `#condition-history-list`, sorted newest-first.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `item` | `object` | `"modal:condition-history"` event `detail.item` | Equipment item with `conditionHistory[]` |

**Returns:** `void`

---

### `initCorrectionModal(getDeps)` *(internal)*

**Purpose:** Register the `"modal:correction"` DOM event listener. Wires checkbox-to-input show/hide pairs and the correction form submit.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `getDeps` | `Function` | `~/src/ui/modals.js → bindModalsEvents()` | Returns `{ state, repository, showToast }` at call time |

**Returns:** `void`

---

### `populateCorrectionLocationSelects(state)` *(internal)*

**Purpose:** Populate the from-location and to-location `<select>` elements in the correction modal with current locations from state.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | For `state.locations[]` |

**Returns:** `void`

---

### `getCurrentMoveValues(move)` *(internal)*

**Purpose:** Extract the current field values from a move entry to populate the "from" side of each correction change object.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `move` | `object\|undefined` | `~/src/repository/index.js → getState().moves[]` | The move being corrected |

**Returns:** `{ shippingTracking, receiptDate, fromLocationId, toLocationId, condition, notes }`

---

### `initCorrectionDetailsModal()` *(internal)*

**Purpose:** Register the `"modal:correction-details"` DOM event listener. On open, calls `renderCorrectionDetails(corrections)`.

**Parameters:** None

**Returns:** `void`

---

### `renderCorrectionDetails(corrections)` *(internal)*

**Purpose:** Build and insert the correction audit trail into `#correction-details-list`, sorted newest-first.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `corrections` | `object[]` | `"modal:correction-details"` event `detail.entry._corrections` | Corrections already applied to the move |

**Returns:** `void`

---

---

## `devtools.js`

Developer tools panel. Hidden by default — revealed when admin/dev mode is activated. Provides a timestamped diagnostics log and buttons to manually test the two Supabase edge functions.

### `devLog(message)`

**Purpose:** Append a timestamped line to the `#admin-diagnostics-log` textarea. Safe to call even if the panel doesn't exist. Exported so other modules can write diagnostic messages.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `message` | `string` | Line to append |

**Returns:** `void`

---

### `initDevtools()`

**Purpose:** Wire all devtools event listeners. Called once at startup from `main.js`. Returns a state sync controller.

**Parameters:** None

**Returns:** `{ syncState(state): void }` — call on every `"state:changed"` to keep internal `_state` current.

---

### `setDevtoolsVisible(visible)` *(internal)*

**Purpose:** Show or hide `#devtools-card` and log an entry when it opens.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `visible` | `boolean` | `"auth:admin-changed"` event `detail.isAdmin` | Whether to show the card |

**Returns:** `void`

---

### `testMoveCreate(state)` *(internal)*

**Purpose:** Fire a test POST to the `move_create` edge function using the first equipment item in state. Requires an active Supabase session. Logs the HTTP status and response body.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | For the first equipment item's ID |

**Returns:** `Promise<void>`

---

### `testMoveReceipt(state)` *(internal)*

**Purpose:** Fire a test POST to the `move_receipt` edge function using the most recent unreceived move in state. Requires an active Supabase session. Logs the HTTP status and response body.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | `~/src/repository/index.js → getState()` | For the first unreceived move |

**Returns:** `Promise<void>`

---

### `getAccessToken()` *(internal)*

**Purpose:** Return the current Supabase session's JWT access token, used to authenticate edge function calls.

**Parameters:** None

**Returns:** `Promise<string|null>` — JWT string, or `null` if not signed in.

---

### `showOutput(elId, text)` *(internal)*

**Purpose:** Write a response string to a `<pre>` output element and un-hide it.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `elId` | `string` | ID of the `<pre>` element |
| `text` | `string` | Content to display |

**Returns:** `void`
