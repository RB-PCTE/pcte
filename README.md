# Fleet Tracker

An internal equipment tracking app for PCTE. Tracks physical location, movement, calibration, and software subscription status of field equipment across all offices.

Sister project to [Subscription Tracker](https://github.com/RB-PCTE/Subscription-Tracker) — shares the same design system and Supabase organisation.

## Project layout

```
pcte/
├── index.html              Static frontend shell (sidebar layout)
├── styles.css              Design system — based on Subscription Tracker
├── app.js                  Legacy shim re-exporting src/main.js (keep for old bookmarks)
│
├── src/
│   ├── main.js             App startup: hydrate → listen → render
│   ├── events.js           Minimal pub/sub (on / emit)
│   ├── model.js            State constants, buildDefaultState, migrateStateIfNeeded
│   ├── supabaseClient.js   Two Supabase clients + all DB↔app field mapping + adapter
│   ├── auth.js             Supabase login/logout, role check, dev mode toggle
│   ├── preferences.js      loadActiveView / saveActiveView (localStorage)
│   │
│   ├── repository/
│   │   └── index.js        Central state store — all mutations go through here
│   │
│   ├── legacy/
│   │   └── localStorage.js Old localStorage adapter + migration helpers (isolated)
│   │
│   └── ui/
│       ├── computed.js     Pure functions: calibration/subscription status, effective status, age
│       ├── filters.js      Filter state + getFilteredEquipment / getFilteredMoves
│       ├── toast.js        showToast + toast container
│       ├── stats.js        Six metric cards (Operations tab header)
│       ├── operations.js   Equipment table, location summary, move form
│       ├── moves.js        Moves log table + filters
│       ├── admin.js        Add/edit equipment, calibration, CSV import, auth panel
│       ├── modals.js       Condition history, correction, correction details dialogs
│       └── devtools.js     Diagnostics log + test buttons (hidden, admin only)
│
├── tests/
│   ├── applyCorrectionsToMoves.test.js
│   └── conditionPillLastCheck.test.js
│
└── supabase/
    ├── SCHEMA.md           Full database schema reference
    └── functions/
        ├── move_create/    Edge function — create move + optional shipping
        └── move_receipt/   Edge function — record receipt + condition check
```

## Running the app

No build step. Open `index.html` directly in a browser, or serve with any static file server:

```sh
npx serve .
```

The app uses native ES modules (`<script type="module">`). Opening without a Supabase connection will show an empty equipment list.

## Running tests

Tests are plain Node scripts with no framework:

```sh
node tests/applyCorrectionsToMoves.test.js
node tests/conditionPillLastCheck.test.js
```

Each script throws on failure and prints a success message on pass.

## Supabase auth notes

- The frontend uses the Supabase **anon key** in browser code. That key is designed to be public — data security is enforced by Row Level Security (RLS) policies.
- Write operations (move creation, receipts) go through **edge functions** that validate a JWT token server-side before writing to the database.
- Admin UI features (corrections, edit equipment, add equipment) are gated by `profiles.role = 'admin'` in Database A.
- For auth redirects, run the app from `http://localhost` or the deployed GitHub Pages URL. Avoid `file://` URLs.

## Dev mode (testing without Supabase auth)

Hold **Shift** and click the build version number in the sidebar **3 times** to activate dev mode. This:
- Enables admin UI without a valid Supabase session
- Optionally swaps in the in-memory mock adapter (no real DB writes)
- Shows an orange `[DEV]` badge in the sidebar footer

Dev mode state is stored in `localStorage` and cleared on logout.

## Deploying edge functions

Uses the Supabase CLI (installed via Scoop on Windows):

```sh
supabase link --project-ref eugdravtvewpnwkkpkzl
supabase functions deploy move_create
supabase functions deploy move_receipt
```

## Database setup

Full schema documentation, including all tables, columns, RLS policies, and relationships, is in [`supabase/SCHEMA.md`](supabase/SCHEMA.md).

**Database A — Fleet Tracker** (`eugdravtvewpnwkkpkzl.supabase.co`)
Stores all equipment, state, moves, corrections, and locations.

**Database B — Subscription Tracker** (`ezsqpiwzcuczgqdqyuqx.supabase.co`)
Read: `subscriptions.renewal_date` matched by `serial_number` ↔ `equipment.serial`.
Write: new subscription row created when equipment is added with a subscription.

## Design system

Matches the [Subscription Tracker](https://github.com/RB-PCTE/Subscription-Tracker) visual style:

| Token | Value |
|---|---|
| Font | Inter |
| Primary | `#4f46e5` (Indigo) |
| Page background | `#f1f5f9` (Slate) |
| Sidebar background | `#111827` (Dark navy) |
| Card radius | `18px` |
| Shadow | `0 2px 8px rgba(15,23,42,0.06)` |

All CSS variables are defined in `styles.css` under `:root`.
