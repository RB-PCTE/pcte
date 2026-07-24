# `src/repository/`

This directory contains the central state store for the entire application. It is the single place all data mutations go through. No UI module is ever allowed to modify `state` directly — they call repository methods, which persist changes and fire `"state:changed"` so every render function is notified.

---

## `index.js`

The repository wraps a storage adapter (Supabase in production, mock/localStorage in tests) and exposes named mutation methods. It holds one private `state` variable. Every mutation goes through `mutate()`, which saves to the adapter and fires `"state:changed"`.

---

### `createRepository({ adapter })`

**Purpose:** Factory that creates and returns the repository object. Called once at startup in `main.js`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `adapter` | `object` | `~/src/supabaseClient.js → createSupabaseStorageAdapter()` | Storage adapter implementing `{ load(), save(), clear() }` |

**Returns:** Repository object with all methods listed below.

---

### `hydrate()`

**Purpose:** Load all data from the adapter (Supabase) into the in-memory `state`. Called once at startup before the first render.

**Parameters:** None

**Returns:** `Promise<object>` — the loaded state object.

---

### `getState()`

**Purpose:** Return the current in-memory state without any async operations. Use inside `"state:changed"` handlers to read the latest data.

**Parameters:** None

**Returns:** `object` — `{ schemaVersion, equipment[], moves[], corrections[], locations[] }`

---

### `persist()`

**Purpose:** Internal. Save the current `state` to the adapter, then fire `"state:changed"` to trigger all render functions. Called automatically by every mutation method — not called directly by UI code.

**Parameters:** None

**Returns:** `Promise<void>`

---

### `mutate(mutatorFn)`

**Purpose:** The safe, internal path for changing state. Accepts a function that edits the state directly, then calls `persist()`. All named mutation methods use this internally.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `mutatorFn` | `Function` | Caller (UI module) | A function that receives the live `state` object and mutates it in place |

**Returns:** `Promise<object>` — the state after mutation.

---

### `addEquipment(payload)`

**Purpose:** Add a new piece of equipment to the tracker. Generates a UUID for the new item.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/admin.js → handleAddEquipmentSubmit()` | Equipment fields: `name`, `model`, `serialNumber`, `purchaseDate`, `location`, `status`, `calibrationRequired`, `calibrationIntervalMonths`, `lastCalibrationDate`, `subscriptionRequired`, `subscriptionRenewalDate`, `conditionReference` |

**Returns:** `Promise<object>` — updated state.

---

### `updateEquipment(id, patch)`

**Purpose:** Update any fields on an existing piece of equipment by merging a patch object.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `id` | `string` | `~/src/ui/admin.js → handleEditEquipmentSubmit()` | UUID of the equipment item to update |
| `patch` | `object` | `~/src/ui/admin.js → handleEditEquipmentSubmit()` | Partial equipment object — only supplied keys are updated |

**Returns:** `Promise<object>` — updated state.

---

### `importEquipment(rows)`

**Purpose:** Bulk-add multiple equipment items at once, used by the CSV import panel.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `rows` | `object[]` | `~/src/ui/admin.js → handleImportSubmit()` | Array of equipment objects (each pre-assigned a UUID by `parseCSV`) |

**Returns:** `Promise<object>` — updated state.

---

### `recordMove(payload)`

**Purpose:** Add a new move entry to the moves log (prepended so newest is first). Also sets the equipment item's `location` to the destination (`payload.toLocation`) so the table and the next `save()` match the DB, and patches the item's condition fields immediately when condition data is present.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/operations.js → handleMoveSubmit()` | `{ equipmentId, type, timestamp, fromLocation, toLocation, notes, condition?: { rating, checkedAt, contentsOk, functionalOk, notes }, … }` |

**Side effect:** When `payload.condition.rating` is truthy, patches `item.conditionRating`, `item.conditionLastCheckedAt`, `item.conditionContentsOk`, `item.conditionFunctionalOk`, and `item.conditionLastNotes` on the matching equipment item so the table re-renders instantly.

**Returns:** `Promise<object>` — updated state.

---

### `recordReceipt(moveId, receiptData)`

**Purpose:** Record that equipment has been physically received at its destination, including condition data. Settles the equipment item's `location` on the received move's `toLocation`, and also patches the item's condition fields immediately when condition data is present.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `moveId` | `string` | `~/src/ui/moves.js → handleMarkReceived()` | UUID of the move entry to update |
| `receiptData` | `object` | `~/src/ui/moves.js → handleMarkReceived()` | `{ receivedAt, conditionResult, conditionNotes, receivedBy? }` — mapped to `move.receiptData` with snake_case keys to match the Supabase join shape |

**Side effect:** When `receiptData.conditionResult` is truthy, patches `item.conditionRating`, `item.conditionLastCheckedAt`, and `item.conditionLastNotes` on the matching equipment item so the table re-renders instantly.

**Returns:** `Promise<object>` — updated state.

---

### `recordCalibration(payload)`

**Purpose:** Log a calibration event. Internally calls `recordMove` with `type: "calibration"`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/admin.js → handleCalibrationSubmit()` | `{ equipmentId, timestamp, lastCalibrationDate, calibrationIntervalMonths, calibrationRequired, toLocation, fromLocation }` |

**Returns:** `Promise<object>` — updated state.

---

### `recordSubscriptionUpdate(payload)`

**Purpose:** Log a subscription update event. Internally calls `recordMove` with `type: "subscription_updated"`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | Internal call | Subscription event fields |

**Returns:** `Promise<object>` — updated state.

---

### `addCorrection(payload)`

**Purpose:** Store a non-destructive correction to a move record. The original move is never changed — the correction is applied on top at render time by `applyCorrectionsToMoves`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/modals.js → initCorrectionModal()` | `{ id, ts, targetType: "move", targetId, reason, changes: { field: { from, to } }, createdBy }` |

**Returns:** `Promise<object>` — updated state.

---

### `archiveHistory()`

**Purpose:** Mark all existing moves as archived so they no longer appear in the main moves list. Admin-only action.

**Parameters:** None

**Returns:** `Promise<object>` — updated state.
