# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step — open `index.html` directly in a browser (or serve it with any static file server, e.g. `npx serve .`). The app uses native ES modules via `<script type="module">`.

`app.js` is a legacy shim that re-exports `src/main.js` for old bookmarks.

## Running tests

Tests are plain JS scripts with no framework. Run them with Node:

```sh
node tests/applyCorrectionsToMoves.test.js
node tests/conditionPillLastCheck.test.js
```

Each script throws on failure and prints a success message on pass. There is no test runner — add new tests as standalone scripts that follow the same pattern.

## Architecture overview

The app is a single-page equipment tracker (three tabs: Operations, Moves, Admin) backed primarily by `localStorage`, with optional Supabase sync.

### Data flow

```
index.html  ──loads──►  src/main.js   (orchestrates everything)
                              │
                    ┌─────────┼─────────────┐
                    ▼         ▼             ▼
              repository/  admin.js      supabaseClient.js
              index.js
                    │
                    ▼
              storage.js  ◄──►  localStorage
              (adapter)
                    │
                    ▼
              model.js  (state schema, constants, migrations)
```

**`src/main.js`** is the monolithic application shell — it wires DOM elements, event handlers, and calls into the modules below. Most business logic currently lives here.

**`src/repository/index.js`** — Repository pattern over a storage adapter. All state mutations go through `mutate(draft => ...)`, which persists and emits `"state:changed"`. Key operations: `addEquipment`, `updateEquipment`, `recordMove`, `recordReceipt`, `recordCalibration`, `addCorrection`, `archiveHistory`.

**`src/model.js`** — Canonical constants (locations, status options, filter options), `buildDefaultState()`, and `migrateStateIfNeeded()` for schema upgrades. `STATE_VERSION` is currently `2`.

**`src/storage.js`** — `createLocalStorageStorageAdapter()` (production) and `createMockApiStorageAdapter()` (testing). Exports storage keys and helpers (`readStoredAppState`, `loadActiveTab`, etc.).

**`src/events.js`** — Minimal pub/sub (`on(eventName, handler)` / `emit(eventName, payload)`). `"state:changed"` is the main application event.

**`src/admin.js`** — Admin mode controller (passcode dialog, diagnostics log). Admin mode is browser-local, not server-side auth.

**`src/supabaseClient.js`** — Supabase JS client (CDN import) plus helper functions: `getSupabaseLocationID`, `getEquipmentSnapshot`, `handleAddEquipmentSupabase`. The Supabase edge function endpoint for move creation is `move_create`.

### State schema

State is stored as JSON in `localStorage` under key `equipmentTrackerState`. Top-level shape:

```js
{
  schemaVersion: 2,
  locations: string[],
  equipment: EquipmentItem[],
  moves: MoveEntry[],
  corrections: CorrectionEntry[],
}
```

### Key domain rules

- **Physical locations**: Perth, Melbourne, Brisbane, Sydney, New Zealand, On Hire, Workshop
- **Editable statuses**: Available, On demo, On hire, In service / repair, Quarantined
- **Computed status**: "In transit" is derived from shipping data — it cannot be set directly
- **Condition check exemptions**: moves to "In service / repair" or "Quarantined" skip the condition check
- **Calibration**: per-item flag + interval (months) + last calibration date; overdue/due-soon thresholds are computed at render time
- **Corrections**: stored as an audit trail in `state.corrections`; applied on top of move records at read time (non-destructive)

### Build version

`BUILD_VERSION` is a string constant near the top of `src/main.js`. Update it manually before each deployment — it is displayed in the page header.
