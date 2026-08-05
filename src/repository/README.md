# `src/repository/`

The app's single state store. Since Phase A step 7a it is a thin client over the FastAPI backend: every mutation calls one endpoint, refetches the whole state, and emits `"state:changed"`. No UI module modifies state directly.

There is no local draft, no optimistic patch, and no `save()`. The previous version mutated an in-memory draft and re-upserted every table on each change, which is what produced the blank-location and clobbered-status bugs. The server is now the only thing that decides what the state is.

---

## `index.js`

### `createRepository({ api })`

**Purpose:** Create the shared repository instance. Called once from `main.js`.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api` | `{apiFetch, loadState}` | the real `~/src/api.js` | Injection seam for tests |

**Returns:** `object` with `hydrate`, `getState`, `addEquipment`, `updateEquipment`, `recordMove`, `recordReceipt`, `recordCalibration`.

---

### `hydrate()`

**Purpose:** Replace local state with `loadState()` — `GET /state` plus `GET /locations`. Does **not** emit; `main.js` emits after awaiting it, and `commit()` emits internally.

**Returns:** `Promise<object>` — the new state.

---

### `getState()`

**Purpose:** Return the current state snapshot synchronously.

**Returns:** `object` — `{ equipment[], moves[], locations[] }`

---

### `commit(write)` *(internal)*

**Purpose:** Run a write, then `hydrate()` and `emit("state:changed", state)`. Every mutation below funnels through it, so no caller can skip the refetch.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `write` | `() => Promise<any>` | The endpoint call |

**Returns:** `Promise<any>` — whatever the endpoint returned.

---

### `addEquipment(payload)`

**Purpose:** `POST /equipment`. Admin-only server-side (403 otherwise). The backend also creates the `equipment_state` row, starting at `available` with `current_location_id = home_location_id`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/admin.js → handleAddEquipmentSubmit()` | `EquipmentCreateIn` shape: `name`, `category`, `serial`, `home_location_id`, `notes`, `purchase_date`, `calibration_*` |

**Returns:** `Promise<object>` — the created `EquipmentRecordOut`.

> `status` and `current_location_id` are **not** accepted on create.

---

### `updateEquipment(id, patch)`

**Purpose:** `PATCH /equipment/{id}`. Structural fields only.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `id` | `string` | `~/src/ui/admin.js` | Equipment UUID |
| `patch` | `object` | `~/src/ui/admin.js → handleEditEquipmentSubmit()` | `EquipmentPatchIn` shape |

**Returns:** `Promise<object>`

> `status`, `current_location_id`, `condition` and `purchase_date` are all absent from `EquipmentPatchIn`; sending any of them is a 422.

---

### `recordMove(payload)`

**Purpose:** `POST /moves`. Opens a move — flags the equipment in-transit but does not move it; that happens on receipt.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `payload` | `object` | `~/src/ui/operations.js → handleMoveSubmit()` | `MoveCreateIn`: `equipment_id`, `to_location_id`, `move_type`, `status_to`, `notes`, `carrier`, `tracking_number`, `booked_at` |

**Returns:** `Promise<object>` — the created `MoveRecordOut`.

> `status_from`, `from_location_id` and `created_by` are derived server-side under a row lock and are **forbidden** in the request body. 409 if the equipment already has an unreceipted move.

---

### `recordReceipt(moveId, receiptData)`

**Purpose:** `POST /moves/{move_id}/receipt`. Applies the move's destination and status to the equipment and sets `equipment_state.condition` from `condition_result`.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `moveId` | `string` | `~/src/ui/modals.js` | Move UUID |
| `receiptData` | `object` | `~/src/ui/modals.js` | `{ condition_result, condition_notes }` — `condition_result` is required and must be `pass` / `needs_attention` / `fail` |

**Returns:** `Promise<object>`

> `received_by` is the authenticated caller, set server-side. 409 if this isn't the equipment's active move.

---

### `recordCalibration(equipmentId, payload)`

**Purpose:** Record a calibration. Delegates to `updateEquipment` — this is a PATCH of the equipment row, **not** a move: there is no `calibration` member in the `move_type` enum and no calibration endpoint, so a calibration no longer produces a Moves-log entry the way it did before step 7a.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `equipmentId` | `string` | `~/src/ui/admin.js → handleCalibrationSubmit()` | Equipment UUID |
| `payload` | `object` | same | `{ last_calibration_date, calibration_interval_months, calibration_required }` |

**Returns:** `Promise<object>`

---

## Removed in step 7a

| Method | Why |
|---|---|
| `mutate` / `persist` | The draft-and-upsert pattern is gone; use the named methods. |
| `addCorrection` | No corrections endpoint; the feature was removed. |
| `importEquipment` | No bulk-create endpoint (`POST` and `PATCH` only). |
| `recordSubscriptionUpdate` | No DB-B endpoint. |
| `archiveHistory` | `moves.archived` no longer exists in the schema. |
