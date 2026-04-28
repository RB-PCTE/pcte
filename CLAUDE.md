# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step — open `index.html` directly in a browser (or serve it with any static file server, e.g. `npx serve .`). The app uses native ES modules via `<script type="module">`.

`app.js` is a legacy shim that re-exports `src/main.js` for old bookmarks.

The app requires a Supabase connection to load data. Opening it without network access or with invalid credentials will result in an empty equipment list.

## Running tests

Tests are plain JS scripts with no framework. Run them with Node:

```sh
node tests/applyCorrectionsToMoves.test.js
node tests/conditionPillLastCheck.test.js
```

Each script throws on failure and prints a success message on pass. There is no test runner — add new tests as standalone scripts that follow the same pattern.

## Deploying edge functions

The Supabase CLI (installed via Scoop on Windows) is used to deploy edge functions:

```sh
supabase link --project-ref eugdravtvewpnwkkpkzl
supabase functions deploy move_create
supabase functions deploy move_receipt
```

Edge functions live in `supabase/functions/`. See `supabase/SCHEMA.md` for the full database schema reference.

## Architecture overview

The app is a single-page equipment tracker (three tabs: Operations, Moves, Admin) backed by **Supabase as the primary data source**. On startup the app loads all state from Supabase; all mutations are persisted back to Supabase via the repository adapter.

### Data flow

```
index.html  ──loads──►  src/main.js   (orchestrates everything)
                              │
                    ┌─────────┼──────────────────┐
                    ▼         ▼                  ▼
              repository/  admin.js       supabaseClient.js
              index.js                          │
                    │                  ┌────────┴────────┐
                    ▼                  ▼                 ▼
          createSupabaseStorage   Database A        Database B
              Adapter()          Fleet Tracker    Subscription
              (load/save)        Supabase         Tracker Supabase
                    │
                    ▼
              model.js  (state schema, constants)
```

### Startup sequence

1. `createRepository({ adapter: createSupabaseStorageAdapter() })` — repository initialises with empty state
2. `initFromSupabase()` async IIFE calls `repository.hydrate()`, which calls `adapter.load()`
3. `adapter.load()` fetches equipment (joined with `equipment_state` + locations), moves, corrections from **Database A**, and `renewal_date` from **Database B** matched by serial number
4. `emit("state:changed", loaded)` triggers `refreshUI()` which renders the full UI

### Key modules

**`src/main.js`** — Monolithic application shell. Wires DOM elements, event handlers, and calls into modules below. Contains a local `buildDefaultState()` that returns empty arrays (the real data comes from Supabase). `BUILD_VERSION` near the top should be updated before each deployment.

**`src/repository/index.js`** — Repository pattern over a storage adapter. All state mutations go through `mutate(draft => ...)`, which persists via `adapter.save()` and emits `"state:changed"`. Key operations: `addEquipment`, `updateEquipment`, `recordMove`, `recordReceipt`, `recordCalibration`, `addCorrection`, `archiveHistory`.

**`src/supabaseClient.js`** — Two Supabase clients (`supabase` for Database A, `subscriptionSupabase` for Database B), all DB↔app field mapping functions, `createSupabaseStorageAdapter()`, and `createSubscriptionRecord()`. The adapter's `save()` upserts equipment, equipment_state, moves, and corrections to Database A. Subscription fields are never written back to Database B except on equipment creation.

**`src/model.js`** — Canonical constants (status options, filter options, move types), `buildDefaultState()` (returns empty state), and `migrateStateIfNeeded()`. `STATE_VERSION` is currently `2`.

**`src/storage.js`** — Legacy localStorage adapter and helpers (`readStoredAppState`, `loadActiveTab`, etc.). The localStorage adapter is no longer used as the primary store but helpers like `loadActiveTab` and `saveActiveTab` are still used for UI preferences.

**`src/events.js`** — Minimal pub/sub (`on(eventName, handler)` / `emit(eventName, payload)`). `"state:changed"` is the main application event.

**`src/admin.js`** — Admin mode controller (passcode dialog, diagnostics log). Admin mode is browser-local, not server-side auth.

### Databases

Full schema documentation is in `supabase/SCHEMA.md`.

**Database A — Fleet Tracker** (`eugdravtvewpnwkkpkzl.supabase.co`)
- `equipment` + `equipment_state` (1:1) — equipment static data and dynamic state
- `moves` + `move_shipping` + `move_receipts` — movement history
- `locations` — location reference data
- `corrections` — audit trail for move corrections
- `profiles` — user roles

**Database B — Subscription Tracker** (`ezsqpiwzcuczgqdqyuqx.supabase.co`)
- Read: `subscriptions.renewal_date` matched to equipment via `serial_number` ↔ `equipment.serial`
- Write: new `subscriptions` row created when equipment is added with subscription required (`customer = 'PCTE Fleet Equipment'`, billing cycle from Add Equipment form)

### State schema

Top-level in-memory state shape (assembled from Supabase on load):

```js
{
  schemaVersion: 2,
  locations: string[],          // from locations table (active only)
  equipment: EquipmentItem[],   // from equipment + equipment_state + DB B subscriptions
  moves: MoveEntry[],           // from moves + move_receipts
  corrections: CorrectionEntry[],
}
```

### Key domain rules

- **Physical locations**: defined in the Supabase `locations` table (active rows); Perth, Melbourne, Brisbane, Sydney, New Zealand, On Hire, Workshop
- **Editable statuses**: Available, On demo, On hire, In service / repair, Quarantined
- **Computed status**: "In transit" is derived from shipping data — it cannot be set directly
- **Condition check exemptions**: moves to "In service / repair" or "Quarantined" skip the condition check
- **Calibration**: per-item flag + interval (months) + last calibration date; overdue/due-soon thresholds are computed at render time
- **Corrections**: stored as an audit trail in `state.corrections`; applied on top of move records at read time (non-destructive)
- **Subscriptions**: `subscriptionRequired` and `subscriptionRenewalDate` are derived from Database B at load time — never manually edited in this app
