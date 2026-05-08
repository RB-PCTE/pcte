# `src/legacy/`

This directory contains storage adapters and helpers from before Supabase was introduced. **None of these are used in the main application flow.** They are kept for:

- Offline/fallback development without a Supabase connection
- Unit testing via the in-memory mock adapter
- One-time data migration helpers

To use the mock adapter during development, swap the adapter in `main.js`:
```js
import { createMockApiStorageAdapter } from "./legacy/localStorage.js";
const repository = createRepository({ adapter: createMockApiStorageAdapter() });
```

---

## `localStorage.js`

Provides a localStorage-backed state adapter, an in-memory mock adapter, direct state read/write helpers, tab preference helpers (now superseded by `~/src/preferences.js`), and a one-time migration flag.

---

### `createLocalStorageStorageAdapter()`

**Purpose:** Create a storage adapter that reads and writes the full app state to the browser's `localStorage` as a JSON blob. Implements the same `{ load, save, clear }` interface as the Supabase adapter.

**Parameters:** None

**Returns:** `object` — adapter with methods:
- `load()` → `Promise<object>` — parses state from `localStorage`, migrates if needed
- `save(state)` → `Promise<void>` — serialises state to JSON and writes to `localStorage`
- `clear()` → `Promise<void>` — removes the state key from `localStorage`

---

### `createMockApiStorageAdapter({ latencyMs })`

**Purpose:** Create an in-memory adapter with a simulated network delay. Useful for unit tests and offline UI development — no real database required.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `latencyMs` | `number` | `80` | Simulated round-trip delay in milliseconds |

**Returns:** `object` — adapter with methods:
- `load()` → `Promise<object>` — returns the in-memory state after `latencyMs` delay
- `save(state)` → `Promise<void>` — stores state in memory after delay
- `clear()` → `Promise<void>` — resets memory to default state after delay

---

### `readStoredAppState()`

**Purpose:** Directly read and parse the app state from `localStorage`. Used by one-off migration scripts. Not part of the normal app flow.

**Parameters:** None

**Returns:** `object` — migrated state, or `buildDefaultState()` if nothing is stored or the JSON is corrupt.

---

### `writeStoredAppState(state)`

**Purpose:** Directly write a state object to `localStorage`. Used by one-off migration scripts.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `state` | `object` | Caller | Full app state object to serialise |

**Returns:** `void`

---

### `loadActiveTab()`

**Purpose:** Read the last-active tab name from `localStorage`. Superseded by `~/src/preferences.js → loadActiveView()` — kept for reference only.

**Parameters:** None

**Returns:** `string` — tab name, defaults to `"operations"` if nothing stored.

---

### `saveActiveTab(tab)`

**Purpose:** Write the active tab name to `localStorage`. Superseded by `~/src/preferences.js → saveActiveView()` — kept for reference only.

**Parameters:**

| Parameter | Type | Source | Description |
|---|---|---|---|
| `tab` | `string` | Caller | Tab name to persist |

**Returns:** `void`

---

### `hasConditionMigrationFlag()`

**Purpose:** Check whether the one-time condition history migration has already been run in this browser. Guards against re-running a migration on every load.

**Parameters:** None

**Returns:** `boolean` — `true` if the flag is set.

---

### `setConditionMigrationFlag()`

**Purpose:** Mark the condition history migration as complete in `localStorage`. Call this once after the migration finishes.

**Parameters:** None

**Returns:** `void`

---

### Exported constants

| Constant | Value | Description |
|---|---|---|
| `STORAGE_KEY` | `"equipmentTrackerState"` | `localStorage` key for full app state |
| `TAB_STORAGE_KEY` | `"equipmentTrackerActiveTab"` | `localStorage` key for active tab |
| `ADMIN_MODE_KEY` | `"equipmentTrackerAdminMode"` | `localStorage` key for admin mode flag |
| `ADMIN_PASSCODE_KEY` | `"equipmentTrackerAdminPasscode"` | `localStorage` key for dev passcode |
| `CONDITION_MIGRATION_V1_FLAG` | `"pcteConditionMigrationV1"` | `localStorage` key for migration guard |
