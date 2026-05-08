# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## ⚠️ Documentation maintenance (REQUIRED on every code change)

After **every** code change — no matter how small — you must update the following files to reflect what changed:

- **`redesignPlan.md`** — update if any UI element, event listener, CSS class, view structure, or file was added, removed, or renamed.
- **`backendLogic.md`** — update if any function, module, parameter, return value, or file path changed.
- **`src/**/README.md`** — update the README in the affected directory if any function signature, parameter, return value, purpose, or file in that directory changed. Each directory has its own README; update only the section(s) that changed.

All three are organised by directory/file. Update only the relevant section(s). Do not rewrite sections that did not change. This rule applies to all changes including: new files, deleted files, renamed files, new functions, changed function signatures, new HTML elements, new CSS classes, and moved code.

---

## Running the app

No build step — open `index.html` directly in a browser (or serve with any static file server):

```sh
npx serve .
```

The app uses native ES modules via `<script type="module">`. Opening without a Supabase connection will show an empty equipment list.

`app.js` is a legacy shim that re-exports `src/main.js` for old bookmarks. Do not delete it.

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

---

## Architecture overview

The app is a single-page equipment tracker backed by **Supabase as the primary data source**. The UI uses a **dark sidebar + main content** layout matching the Subscription Tracker design system.

On startup the app loads all state from Supabase; all mutations are persisted back via the repository adapter. The UI re-renders entirely whenever `"state:changed"` is emitted.

### Data flow

```
index.html  ──loads──►  src/main.js        (startup: hydrate → listen → render)
                              │
              ┌───────────────┼──────────────────────┐
              ▼               ▼                      ▼
        src/repository/   src/auth.js         src/supabaseClient.js
        index.js                                     │
              │                           ┌──────────┴──────────┐
              ▼                           ▼                     ▼
        mutate / persist           Database A              Database B
              │                  Fleet Tracker         Subscription Tracker
              ▼
        emit("state:changed")
              │
              ▼
        src/ui/*.js   (render functions update the DOM)
```

### Startup sequence

1. `createRepository({ adapter: createSupabaseStorageAdapter() })` — initialises with empty state
2. `repository.hydrate()` calls `adapter.load()` which runs parallel Supabase queries
3. `emit("state:changed", loadedState)` triggers all registered render functions
4. Sidebar nav switching calls `loadActiveView()` to restore the last-used view

### File structure

```
src/
├── main.js             Startup only — wires hydrate, state listener, nav switching
├── events.js           pub/sub: on(event, handler) / emit(event, payload)
├── model.js            Constants (statuses, locations, move types) + buildDefaultState
├── supabaseClient.js   DB clients + all field mapping functions + storage adapter
├── auth.js             Supabase login/logout + role check + dev mode toggle
├── preferences.js      loadActiveView / saveActiveView (localStorage)
│
├── repository/
│   └── index.js        Central state store — all mutations use mutate()
│
├── legacy/
│   └── localStorage.js Old localStorage adapter, mock adapter, migration helpers
│
└── ui/
    ├── computed.js     Pure functions: getCalibrationInfo, getSubscriptionInfo,
    │                   getEffectiveStatus, getAgeLabel (no DOM access)
    ├── filters.js      Filter state + getFilteredEquipment / getFilteredMoves
    ├── toast.js        showToast + toast container
    ├── stats.js        Render 6 metric cards (Operations view header)
    ├── operations.js   Equipment table, location summary cards, move form
    ├── moves.js        Moves log table + filter bar
    ├── admin.js        Add/edit equipment, calibration, CSV import, auth panel
    ├── modals.js       Condition history, correction, correction details dialogs
    └── devtools.js     Diagnostics log + test buttons (hidden, admin only)
```

### Key modules

**`src/main.js`** — Startup only. Creates the repository, calls `hydrate()`, registers the `"state:changed"` listener, and wires sidebar navigation. `BUILD_VERSION` near the top should be updated before each deployment.

**`src/repository/index.js`** — Repository pattern over a storage adapter. All state mutations go through `mutate(draft => ...)`, which persists via `adapter.save()` and emits `"state:changed"`. Key methods: `addEquipment`, `updateEquipment`, `recordMove`, `recordReceipt`, `recordCalibration`, `addCorrection`, `archiveHistory`.

**`src/supabaseClient.js`** — Two Supabase clients (`supabase` for Database A, `subscriptionSupabase` for Database B), all DB↔app field mapping functions, `createSupabaseStorageAdapter()`, and `createSubscriptionRecord()`.

**`src/model.js`** — Canonical constants (`editableStatusOptions`, `physicalLocations`, `moveConditionExemptStatuses`, etc.), `buildDefaultState()`, and `migrateStateIfNeeded()`. `STATE_VERSION` is currently `2`.

**`src/auth.js`** — Wraps `supabase.auth.signInWithPassword` / `signOut`. Checks `profiles.role` for admin access. Handles dev mode activation (Shift+click build version ×3).

**`src/ui/computed.js`** — Pure functions with no DOM access. Import these anywhere calibration status, subscription status, or effective equipment status needs to be calculated.

**`src/legacy/localStorage.js`** — Isolated legacy code. Contains the old localStorage adapter, mock adapter, migration flag helpers, and `safeParseState`. Not used in the main data flow — kept for reference and fallback.

### CSS / design system

**`styles.css`** — All styles live here. Follows the Subscription Tracker design system exactly (same CSS variables, sidebar layout, card styles, status pills, metric cards). The key layout classes are:

- `.app-shell` — grid: 260px sidebar + 1fr main
- `.sidebar` / `.nav-item` / `.nav-item.is-active` — dark sidebar navigation
- `.app-main` / `.content-area` — scrollable main area
- `.card` / `.metric-card` — white card with 18px radius
- `.pill` + modifier (e.g. `.pill--available`) — equipment status badges
- `.condition-badge` + modifier — condition check results
- `.is-view-hidden` — hides inactive view sections (matches Sub Tracker pattern)
- `.is-hidden` — generic utility hide

### Databases

Full schema documentation is in `supabase/SCHEMA.md`.

**Database A — Fleet Tracker** (`eugdravtvewpnwkkpkzl.supabase.co`)
- `equipment` + `equipment_state` (1:1) — static data and dynamic state
- `moves` + `move_shipping` + `move_receipts` — movement history
- `locations` — location reference data
- `corrections` — non-destructive audit trail
- `profiles` — user roles (`role = 'admin'` gates admin features)

**Database B — Subscription Tracker** (`ezsqpiwzcuczgqdqyuqx.supabase.co`)
- Read: `subscriptions.renewal_date` matched via `serial_number` ↔ `equipment.serial`
- Write: new row on equipment creation when subscription is required

### State schema

```js
{
  schemaVersion: 2,
  locations:   string[],          // active rows from locations table
  equipment:   EquipmentItem[],   // equipment + equipment_state + DB B subscriptions
  moves:       MoveEntry[],       // moves + move_receipts
  corrections: CorrectionEntry[],
}
```

### Key domain rules

- **Editable statuses**: Available, On demo, On hire, In service / repair, Quarantined
- **Computed status**: "In transit" is derived — never set directly
- **Condition check exemptions**: moves to "In service / repair" or "Quarantined" skip the condition check
- **Calibration**: overdue/due-soon computed at render time from `lastCalibrationDate + calibrationIntervalMonths` vs today
- **Corrections**: non-destructive — stored in `state.corrections`, applied on top of moves at read time
- **Subscriptions**: `subscriptionRenewalDate` sourced from DB B at load time — never written back from this app except on equipment creation
- **Admin access**: gated by `profiles.role = 'admin'`; dev mode (Shift+click version ×3) bypasses this locally for testing
