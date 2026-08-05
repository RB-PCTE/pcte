# `src/ui/`

Every module that touches the DOM. Each view module exports a `renderX(state)` and a `bindXEvents(deps)` pair; `bindXEvents` is called once at startup and returns a `{ syncState(state) }` controller that `main.js` feeds on every `"state:changed"`. No file here modifies state directly — mutations go through repository methods passed in as parameters, and view modules communicate with each other through DOM custom events.

All data comes from `GET /state`, which returns a ready-to-render view model — `age_label`, `calibration`, `in_transit`, `location_display`, `condition` are all computed server-side. Field names in this directory are the backend's own (`serial`, `category`, `current_location_id`, …), not a renamed copy.

---

## `computed.js`

Pure presentation helpers. No DOM access, no side effects. This file used to compute domain values; since step 7a the backend does that and these functions only format.

### `escapeHTML(value)`
Escape a value for safe insertion into HTML. **Returns** `string`.

### `formatDate(value)`
Format a date-only value (`"YYYY-MM-DD"` from the API, or a `Date`) as `DD/MM/YYYY`. Parsed component-wise rather than with `new Date(string)`, which reads a bare date as UTC midnight and can render the previous day in a negative timezone offset. **Returns** `"—"` for empty/unparseable.

### `formatDateTime(value)`
Format a timestamp as `DD/MM/YYYY, HH:mm`. **Returns** `"—"` for empty/unparseable.

### `equipmentLabel(item)`
One-line label — `"Name — Category — Serial"`. Used by every dropdown and the moves table so they can't drift apart. **Returns** `string`.

### `statusDisplay(item)`
The status to show: `"In transit"` wins over the stored status while a move is open, matching what the location column shows. **Returns** display label.

### `statusPillClass(item)`
`.pill` modifier for the item's status. Keyed on the backend enum value, not the display label. **Returns** e.g. `"pill--available"`.

### `calibrationPillClass(status)`
`.pill` modifier for `"ok"` / `"due_soon"` / `"overdue"` / `"unknown"`. `null` (calibration not required) maps to `"pill--n-a"`.

### `conditionBadgeClass(condition)`
`.condition-badge` modifier for `"pass"` / `"needs_attention"` / `"fail"`. `null` (never assessed) maps to `"condition-badge--neutral"`.

---

## `filters.js`

Read filter values from the DOM and apply them to state. No rendering. Every comparison is against a backend enum value — the filter `<select>` options carry the value and render the label.

### `readEquipmentFilters()`
**Returns** `{ search, location, status, calibration }`, safe defaults when elements are absent.

### `getFilteredEquipment(state, filters?)`
Filter `state.equipment`. Location matches on **id**, so renaming a location doesn't break the filter. `status` accepts the special value `"in_transit"`, checked against the server's flag; selecting a real status excludes in-transit items, because that isn't what the table shows for them. `calibration` treats `calibration: null` as `"not_required"`. **Returns** `object[]`.

### `readMovesFilters()`
**Returns** `{ equipment, type, destination, receiptOnly, search }`.

### `isMoveAwaitingReceipt(entry)`
True when the move is still open. A `move_logistics` row is created alongside every move, so `logistics` being present says nothing — `received_at` being null is what marks it open. **Returns** `boolean`.

### `getFilteredMoves(state, filters?, equipmentById?)`
Filter `state.moves`. Search covers equipment label, notes, carrier/tracking, and both location names. **Returns** `object[]`.

---

## `toast.js`

### `showToast(message, type?)`
Append a toast to `#toast-container`; auto-dismisses after 3.5 s, click to dismiss early. `type` is `"success"`, `"error"`, or `"info"` (default).

---

## `stats.js`

### `renderStats(filteredEquipment)`
Fill the **four** metric cards: total, in transit, on hire + on demo, calibration (overdue + due soon). Counts reflect the filtered list, so they stay in sync with the toolbar.

### `syncCombinedCard(statId, overdueCount, dueSoonCount)` *(internal)*
Colour a card red when anything is overdue, amber when only due soon.

---

## `operations.js`

Operations view: equipment table, location summary, and the move-creation form.

### `renderOperationsView(state)`
Re-render filter selects, stats, move-form selects, the equipment table, and the location summary.

### `renderFilterSelects(state)` *(internal)*
Location (active only, valued by id), status, and calibration dropdowns.

### `renderMoveFormSelects(state)` *(internal)*
Equipment, destination (active locations), move type, and status-after-move. There is no "no change" status option — `POST /moves` requires `status_to`, so the form defaults to Available.

### `renderEquipmentTable(filteredEquipment)` *(internal)*
Seven columns: Equipment, Category, Serial, Status, Location, Calibration, Condition.

### `renderLocationSummary(state)` *(internal)*
One card per active location, grouping equipment by `current_location_id`.

### `isInterOfficeMove(state, fromLocationId, toLocationId)` *(internal)*
True when the move runs between two different **offices**, which is what makes shipping details mandatory. Keyed on each location's `category` rather than the hardcoded name list used before step 7a, so a new office gets the shipping requirement without a code change.

### `deriveMoveType(state, fromLocationId, toLocationId)` *(internal)*
Default move type from the two locations: destination is a customer → `hire_out`; origin is a customer → `hire_return`; office → office → `office_transfer`; otherwise `move`. `workshop` has no heuristic and is only ever chosen explicitly.

### `syncShippingSection(state)` *(internal)*
Show or hide the shipping fieldset from the current form values.

### `syncMoveType(state)` *(internal)*
Re-apply the derived move type — **only while the user hasn't chosen one themselves**. Without the `_moveTypeDirty` guard, picking `workshop` and then adjusting the destination would silently throw the choice away.

### `validateShipping()` / `clearShippingValidation()` *(internal)*
Carrier and tracking number are required whenever the shipping fieldset is visible.

### `handleMoveSubmit(event, state, { showToast, repository })` *(internal)*
Validate, build the `MoveCreateIn` payload, and call `repository.recordMove`. `status_from`, `from_location_id` and `created_by` are **not** sent — they're derived server-side and the request model forbids them.

### `bindOperationsEvents({ repository, showToast })`
Wire filters, the two conditional-section triggers, the move-type dirty flag, location-card click-to-filter, and form submit. **Returns** `{ syncState(state) }`.

---

## `moves.js`

Moves Log view. The corrections and soft-delete actions were removed in step 7a: neither had a backend endpoint, and the soft delete never persisted past a reload.

### `renderMovesView(state)`
Render the filter selects and the table. The Actions column appears only when at least one move is awaiting receipt. Receipting is everyday operational work, not an admin action — the backend gates it on authentication only.

### `renderMovesFilterSelects(state)` *(internal)*
Equipment, move type, and destination. The destination list includes **inactive** locations: a move to a since-deactivated location is still in the log and still worth filtering to.

### `buildRow(entry, equipmentById, showActions)` *(internal)*
Nine columns (ten with Actions): Timestamp, Equipment, From, To, Status change, Receipt, Condition, Notes, Type. From/To read `from_location_name` / `to_location_name` straight off the response — no client-side id→name lookup.

### `buildNotesCell(entry)` *(internal)*
Notes, then carrier/tracking, then condition notes, each on its own line.

### `bindMovesEvents()`
Wire the filter controls and the delegated "Mark received" button, which dispatches `"modal:mark-received"`. **Returns** `{ syncState(state) }`.

---

## `admin.js`

Admin view: add equipment, edit equipment, record calibration, manage locations.

Everything in this file lives inside `#admin-panels-grid`, which `auth.js` hides wholesale for non-admins. There is no per-control gating — the backend enforces admin access on the write endpoints independently, so the visibility rule here is UX rather than security.

Removed in step 7a: CSV import (no bulk-create endpoint), subscription fields (no DB-B data), the condition checklist (no backend concept), and the status/location controls (owned by `equipment_state`, changed only through moves).

### `renderAdminView(state)`
Populate the category, location, and equipment selects in all forms, and render the locations table.

### `locationOptions(state, current?)` / `categoryOptions(current?)` / `locationCategoryOptions(current?)` / `equipmentOptions(equipment, current?)` *(internal)*
Option builders. `locationOptions` (which locations an item can live at) filters to `active`; `locationCategoryOptions` builds the `location_category` select for the locations card.

### `getCalibrationIntervalMonths(prefix)` *(internal)*
Read the interval select, resolving `"custom"` against the paired number input. **Returns** `number|null`.

### `syncAddCalibrationFields()` / `syncEditCalibrationFields()` *(internal)*
Show or hide the interval and last-calibration fields from the "calibration required" checkbox.

### `populateEditForm(equipmentId, equipment)` *(internal)*
Fill the edit form from the selected item, or clear it when nothing is selected.

### `handleAddEquipmentSubmit(e, state, { repository, showToast })` *(internal)*
Validate name, category, and serial uniqueness, then `repository.addEquipment`. Builds an `EquipmentCreateIn` payload — no `status`, no `current_location_id`.

### `handleEditEquipmentSubmit(e, state, { repository, showToast, editId })` *(internal)*
Validate, then `repository.updateEquipment` with an `EquipmentPatchIn` payload. `purchase_date` is absent from that model, so the form field is display-only and not sent.

### `handleCalibrationSubmit(e, state, { repository, showToast })` *(internal)*
Call `repository.recordCalibration`, which PATCHes the equipment row. This no longer creates a Moves-log entry.

### Locations

Unlike equipment, locations are a short, slow-changing list, so the whole table is on screen and edited **in place** rather than loaded into a form.

#### `renderLocationsTable(state)` *(internal)*
Four columns: Name, Category (mapped through `LOCATION_CATEGORY`), Status, Actions. Sorted active-first then alphabetically. Inactive rows are **shown**, dimmed with `.locations-row--inactive` and an "Inactive" pill — a deactivated location still owns move history, and hiding it makes "why can't I pick Perth any more?" unanswerable from the UI.

#### `_editingLocationId` *(module state)*
The row currently open in the inline editor. `renderAdminView` re-runs on every `"state:changed"` — including changes this card didn't cause — which would otherwise wipe an open editor mid-typing. Rendering re-opens the row this points at.

#### `buildLocationRow(location)` / `locationRowActions(location)` *(internal)*
In edit mode the Name and Category cells become an `<input>` and a `<select>`, and the actions become Save / Cancel. Otherwise: Edit, plus Deactivate or Reactivate depending on `active`.

#### `handleAddLocationSubmit(e, { repository, showToast })` *(internal)*
Validate name and category, then `repository.createLocation({ name, category })`. `active` is not sent — the server defaults it.

#### `handleSaveLocation(id, state, { repository, showToast })` *(internal)*
Always sends the complete `{ name, category, active }`, because PUT is a full replace. `active` is carried over unchanged — editing never flips it; that's what Deactivate/Reactivate are for.

`_editingLocationId` is cleared **before** the call, not after: `updateLocation` refetches and emits, which re-renders the table. Clearing afterwards would render the row as an open editor one last time. On failure the flag is restored and the DOM is left alone, so what was typed isn't discarded.

#### `handleDeactivateLocation` / `handleReactivateLocation` *(internal)*
`window.confirm()` then `deactivateLocation` (soft delete) or `updateLocation` with `active: true` and the row's existing name and category.

### `bindAdminEvents({ repository, showToast })`
Wire the calibration toggles, live duplicate-name/serial warnings, the edit-form select, cancel, all three equipment submits, the add-location form, and a delegated click handler on `#locations-table` for the five `data-action` values. **Returns** `{ syncState(state) }`.

---

## `modals.js`

Only the mark-received dialog remains. The correction and correction-details dialogs went with the corrections feature; the condition-history dialog went because condition is now a single current value on the equipment row, shown by the badge in the equipment table.

### `bindModalsEvents({ repository, showToast })`
Wire the dialog. **Returns** `{ syncState() }` — a no-op kept so `main.js`'s controller wiring stays uniform; `moves.js` passes everything the dialog needs in the event detail.

### `initMarkReceivedModal({ repository, showToast })` *(internal)*
Open on `"modal:mark-received"`, populate the condition select from `CONDITION`, validate that a condition was chosen, then `repository.recordReceipt`. `received_by` is not sent — it's the authenticated caller server-side.

### `populateConditionSelect()` *(internal)*
Fill `#receipt-condition-result` with the three `condition_assessment` values.

---

## `devtools.js`

Diagnostics panel, hidden until admin/dev mode is active. The two edge-function test buttons were replaced in step 7a — `move_create` and `move_receipt` are retired.

### `devLog(message)`
Append a timestamped line to the diagnostics textarea. Safe to call when the panel doesn't exist.

### `initDevtools()`
Wire the admin-mode visibility listener, the log toggle, and the "Check API" button. **Returns** `{ syncState() }`.

### `checkApi()` *(internal)*
`GET /auth/whoami` — proves three things at once: the API is up, CORS allows this origin, and the Supabase token validates.

### `setDevtoolsVisible(visible)` / `showOutput(elId, text)` *(internal)*
Card visibility; write to a `<pre>` and unhide it.
