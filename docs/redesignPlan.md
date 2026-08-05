# Frontend Redesign Reference

This document maps every UI element in the current app to its data source, importance rating, and a recommendation for the redesign. Use it as a blueprint — keep what's critical, redesign what's clunky, drop what isn't needed.

**Necessity rating:** ★★★★★ = essential, ★☆☆☆☆ = not needed

---

## Current file status

| File | Status | Notes |
|---|---|---|
| `index.html` | ✅ Done | Sidebar layout, all IDs preserved |
| `styles.css` | ✅ Done | Merged with Subscription Tracker design system |
| `app.js` | ✅ Keep as-is | Legacy shim only |
| `README.md` | ✅ Done | Follows Subscription Tracker convention |
| `CLAUDE.md` | ✅ Done | Updated with new architecture + doc-maintenance rule |
| `src/main.js` | ✅ Done | Startup-only: hydrate, nav, state listener, dev mode |
| `src/preferences.js` | ✅ Done | loadActiveView / saveActiveView (localStorage) |
| `src/events.js` | ✅ Keep as-is | Untouched |
| `src/model.js` | ✅ Keep as-is | Untouched |
| `src/supabaseClient.js` | ✅ Keep as-is | Untouched |
| `src/auth.js` | ✅ Done | `initAuth({showToast})` — Supabase login/logout, `profiles.role` check, admin nav show/hide, dev mode passcode dialog, fires `"auth:admin-changed"` |
| `src/repository/index.js` | ✅ Keep as-is | Untouched |
| `src/legacy/localStorage.js` | ✅ Done | Old localStorage adapter, mock adapter, migration helpers — not used in main flow, kept for testing/fallback |
| `src/storage.js` | ✅ Keep as-is | Superseded but left in place; all active code uses supabaseClient.js and preferences.js |
| `src/admin.js` | 🗑️ To delete | Replaced by src/ui/admin.js + src/auth.js |
| `src/ui/computed.js` | ✅ Done | Pure computed value functions — no DOM access |
| `src/ui/filters.js` | ✅ Done | Filter state + getFiltered* functions + applyCorrectionsToMoves |
| `src/ui/toast.js` | ✅ Done | `showToast(message, type)` — auto-dismiss with click-to-dismiss |
| `src/ui/stats.js` | ✅ Done | `renderStats(filteredEquipment, moves, now?)` — 6 metric cards |
| `src/ui/operations.js` | ✅ Done | `renderOperationsView`, `bindOperationsEvents` — table, location summary, move form |
| `src/ui/moves.js` | ✅ Done | `renderMovesView(state, {isAdmin})`, `bindMovesEvents({repository, showToast})` — filter selects, table, mark-received, soft-delete |
| `src/ui/admin.js` | ✅ Done | `renderAdminView(state)`, `bindAdminEvents({repository, showToast})` — add/edit equipment, calibration, CSV import |
| `src/ui/modals.js` | ✅ Done | `bindModalsEvents({repository, showToast})` — condition history, correction, correction-details dialogs; all event-driven |
| `src/ui/devtools.js` | ✅ Done | `initDevtools()` — diagnostics log toggle, test move_create/move_receipt buttons; card hidden until admin/dev mode active |

---

---

## Directory: `styles.css` — Design System ✅ Done

The design system has been ported from the Subscription Tracker. Key classes:

| Class | Purpose |
|---|---|
| `.app-shell` | Root grid: 260px sidebar + 1fr main |
| `.sidebar` | Dark nav panel (`#111827`) |
| `.nav-item` / `.nav-item.is-active` | Sidebar navigation buttons |
| `.sidebar-footer` | Bottom of sidebar — build version + dev badge |
| `.dev-badge` | Orange `[DEV]` indicator shown in dev mode |
| `.app-main` / `.content-area` | Scrollable main content |
| `.top-header` | White header bar with title + auth status |
| `.card` | White card, 18px radius, subtle shadow |
| `.metric-card` | Light indigo bg — for the 6 stats |
| `.metric-card--warn` | Amber background variant |
| `.metric-card--danger` | Red background variant |
| `.metrics-grid` | Auto-fit grid for metric cards |
| `.toolbar` | Filter bar grid layout |
| `.toolbar-field` | Individual filter label + input |
| `.toolbar-search` | Wide search field (spans first column) |
| `.table-wrap` | Scrollable table container with border |
| `.pill` + modifier | Status badge (see pill modifiers below) |
| `.condition-badge` + modifier | Condition check result badge |
| `.location-card` | Clickable location summary card |
| `.move-form-grid` | Move form layout |
| `.shipping-section` | Fieldset for carrier/tracking fields |
| `.condition-section` | Condition check fields section |
| `.reference-panel` | Collapsible checklist reference (`<details>`) |
| `.correction-grid` | Correction modal field layout |
| `.admin-panels-grid` | Two-column grid for admin panels |
| `.devtools-panel` | Dark console-style diagnostics panel |
| `.toast-container` / `.toast` | Fixed-position toast notifications |
| `.is-view-hidden` | Hide inactive view (matches Sub Tracker) |
| `.is-hidden` | Generic utility hide |
| `.field-error/warning/success/note` | Form field feedback text |
| `.field-input-error` | Red border + glow on invalid input |
| `.equipment-row-highlight` | Pulse animation after recording a move |
| `.sr-only` | Screen-reader only |

### Pill modifiers (`.pill--*`)
| Modifier | Use |
|---|---|
| `--available` | Green — equipment status |
| `--on-demo` | Blue |
| `--on-hire` | Indigo |
| `--in-service` | Amber |
| `--quarantined` | Pink/red |
| `--in-transit` | Orange |
| `--ok` | Green — calibration/subscription health |
| `--due-soon` | Amber |
| `--overdue` | Red |
| `--unknown` | Grey |
| `--n-a` | Light grey — not required |

---

## Directory: `index.html` — HTML Structure

### Tab / Page Layout

The app is a single HTML page with three tabbed sections. Only one tab view is visible at a time.

| Element ID | Type | What it is | Importance |
|---|---|---|---|
| `#tab-button-operations` | `<button>` | "Operations" tab button | ★★★★★ |
| `#tab-button-moves` | `<button>` | "Moves" tab button | ★★★★★ |
| `#tab-button-admin` | `<button>` | "Admin" tab button (hidden until admin mode enabled) | ★★★★☆ |
| `#admin-mode-toggle` | `<input type="checkbox">` | Checkbox that triggers the admin passcode dialog | ★★★☆☆ |
| `#operations-view` | `<div>` | Container for the entire Operations tab | ★★★★★ |
| `#moves-view` | `<div>` | Container for the entire Moves tab | ★★★★★ |
| `#admin-view` | `<div>` | Container for the entire Admin tab | ★★★★☆ |

**Redesign note:** The tab structure itself is worth keeping. Consider replacing the localStorage passcode system for admin access with a check against the Supabase `profiles.role` field instead.

---

## Directory: `index.html` → Operations Tab (`#operations-view`)

### Stats Cards

Six summary numbers shown at the top of the Operations tab. Computed from `state.equipment` at render time — no separate DB query.

| Element ID | What it shows | Source field | Importance |
|---|---|---|---|
| `#stat-total` | Total equipment items tracked | `state.equipment.length` | ★★★★★ |
| `#stat-hire` | Items currently "On hire" | `item.status === "On hire"` | ★★★★★ |
| `#stat-overdue` | Items with overdue calibration | `getCalibrationInfo().status === "Overdue"` | ★★★★★ |
| `#stat-due-soon` | Items with calibration due within 30 days | `getCalibrationInfo().status === "Due soon"` | ★★★★☆ |
| `#stat-overdue-subscription` | Items with overdue subscription | `getSubscriptionInfo().status === "Overdue"` | ★★★★★ |
| `#stat-due-soon-subscription` | Items with subscription due within 30 days | `getSubscriptionInfo().status === "Due soon"` | ★★★★☆ |

**Redesign note:** Keep all six. These are the daily health check at a glance.

---

### Equipment Filter Bar

Five controls that filter the equipment table. Filter values live in the DOM only — they reset on page reload and are not saved to Supabase.

| Element ID | Type | What it filters | Importance |
|---|---|---|---|
| `#location-filter` | `<select>` | Show equipment at a specific location | ★★★★★ |
| `#status-filter` | `<select>` | Show equipment with a specific status | ★★★★★ |
| `#calibration-filter` | `<select>` | Show equipment by calibration health (Overdue / Due soon / OK / Unknown / Not required) | ★★★★☆ |
| `#subscription-filter` | `<select>` | Show equipment by subscription health (same options as calibration) | ★★★★☆ |
| `#search-input` | `<input type="search">` | Free-text search across name, location, status, and shipping tracking number | ★★★★★ |

**Options source:** Location options come from `state.locations` (active rows from the Supabase `locations` table). Status options come from `model.editableStatusOptions` plus "In transit".

**Redesign note:** Keep all five. Consider making filters persist to localStorage so they survive a page reload.

---

### Equipment Table (`#equipment-table`)

The main list of equipment. Each row is one item from `state.equipment`. The table is re-rendered by `renderTable()` every time state changes or a filter changes.

| Column | Source field(s) | Notes |
|---|---|---|
| Name | `item.name` | Clickable → opens condition history modal |
| Model | `item.model` | Maps to `equipment.category` in DB |
| Serial | `item.serialNumber` | Maps to `equipment.serial` in DB |
| Status | `getEffectiveStatus(item)` | Computed: "In transit" if active shipping, else `item.status` |
| Location | `item.location` | Maps to `equipment_state.current_location_id` (name resolved from `locations`) |
| Calibration | `getCalibrationInfo(item)` | Computed from `item.lastCalibrationDate` + `item.calibrationIntervalMonths` vs today |
| Subscription | `getSubscriptionInfo(item)` | Computed from `item.subscriptionRenewalDate` vs today |
| Condition | `item.conditionRating` + `item.conditionLastCheckedAt` | Maps to `equipment_state.last_condition_result` + `last_condition_at` |
| Last moved | Most recent `state.moves` entry for this item | Timestamp of most recent move |
| Age | `item.purchaseDate` | Computed months/years from today |

**Importance:** ★★★★★ Keep — redesign the layout. The current table is very wide and hard to read on smaller screens.

---

### Location Summary (`#location-summary`)

A grid of cards showing how many equipment items are at each location. Clicking a card filters the equipment table to that location.

| Source | Notes |
|---|---|
| `state.locations` | One card per active location |
| `state.equipment[].location` | Counted per location |

**Importance:** ★★★★☆ Keep. Consider moving to a sidebar or collapsible panel.

---

### Move Form / Console (`#move-form`)

The primary action form — used to record that equipment has moved to a new location. This is the most used feature in the app.

#### Core Fields

| Element ID | Type | What it collects | Supabase destination | Required? | Importance |
|---|---|---|---|---|---|
| `#move-equipment` | `<select>` | Which equipment is moving | `moves.equipment_id` | Yes | ★★★★★ |
| `#move-location` | `<select>` | Destination location | `moves.to_location_id` | Yes | ★★★★★ |
| `#move-status` | `<select>` | New status for the equipment | `equipment_state.status` | No | ★★★★☆ |
| `#move-notes` | `<input>` | Customer name, demo notes, free text | `moves.notes` | No | ★★★☆☆ |

#### Shipping Sub-form (shown when moving interstate or to/from hire)

| Element ID | Type | What it collects | Supabase destination | Importance |
|---|---|---|---|---|
| `#move-shipping-carrier` | `<select>` | Carrier: TNT/FedEx, DHL, StarTrack, Toll, Other | `move_shipping.carrier` | ★★★★☆ |
| `#move-shipping-tracking` | `<input>` | Tracking number | `move_shipping.tracking_number` | ★★★★☆ |
| `#move-shipping-ship-date` | `<input type="date">` | Date shipped | `move_shipping.booked_at` | ★★★☆☆ |
| `#move-shipping-eta-date` | `<input type="date">` | Expected arrival | Not stored — UI only | ★★★☆☆ |
| `#move-shipping-override-note` | `<p>` | Info message: "Status shown as In transit until received" | Display only | ★★★☆☆ |

#### Condition Check Sub-form (shown for most moves; skipped for "In service / repair" and "Quarantined")

| Element ID | Type | What it collects | Supabase destination | Importance |
|---|---|---|---|---|
| `#move-condition-rating` | `<select>` | Excellent / Good / Fair / Needs attention / Unserviceable | `equipment_state.last_condition_result` | ★★★★☆ |
| `#move-contents-ok` | `<select>` | Yes/No — are all contents present? | `equipment_state.condition_contents_ok` | ★★★★☆ |
| `#move-functional-ok` | `<select>` | Yes/No — is it working? | `equipment_state.condition_functional_ok` | ★★★★☆ |
| `#move-condition-notes` | `<textarea>` | Notes about any issues found | `equipment_state.condition_last_notes` | ★★★★☆ |
| `#move-contents-checklist` | `<ul>` | Reference list of what should be in the case | `equipment_state.condition_reference.contents[]` (read-only display) | ★★★★☆ |
| `#move-functional-checklist` | `<ul>` | Guide for functional checks | `equipment_state.condition_reference.functional[]` (read-only display) | ★★★★☆ |

#### Form Feedback Elements

| Element ID | Purpose | Importance |
|---|---|---|
| `#move-submit` | Submit button: "Record move" | ★★★★★ |
| `#move-submit-status` | Shows success/error message during submission | ★★★★★ |
| `#move-submit-blocked` | Warning: "Condition check required" | ★★★☆☆ |
| `#move-condition-exempt-note` | Info: "Condition check not required for this status" | ★★★☆☆ |
| `#move-checklist-lock` | Warning: "No checklist defined — go to Admin to add one" | ★★★☆☆ |
| `#move-checklist-admin-link` | Button linking to Admin → Edit Equipment | ★★★☆☆ |
| `#move-condition-notes-error` | Error: "Please add notes for failed checks" | ★★★★☆ |

**Redesign note:** ★★★★★ Keep but simplify the flow. The current form shows all sections at once with conditional show/hide. Consider a multi-step flow: 1) Select equipment + destination, 2) Shipping details (if applicable), 3) Condition check. This would reduce cognitive load for field staff.

---

### History List (`#history-list`)

A short list of the most recent moves shown at the bottom of the Operations tab.

| Source | Notes |
|---|---|
| `state.moves` (most recent ~10) | Equipment name, from/to location, status, timestamp |

**Importance:** ★★★☆☆ Keep but simplify. This duplicates the Moves tab. Could become a compact "last 5 moves" widget or be removed in favour of pointing users to the Moves tab.

---

## Directory: `index.html` → Moves Tab (`#moves-view`)

### Moves Log Filters

| Element ID | Type | What it filters | Importance |
|---|---|---|---|
| `#moves-equipment-filter` | `<select>` | Filter by specific equipment item | ★★★★★ |
| `#moves-type-filter` | `<select>` | Filter by move type (Move / Calibration / Received / etc.) | ★★★★★ |
| `#moves-destination-filter` | `<select>` | Filter by destination location | ★★★★☆ |
| `#moves-show-deleted` | `<input type="checkbox">` | Include archived/deleted moves | ★★★☆☆ |
| `#moves-receipt-only` | `<input type="checkbox">` | Show only moves awaiting a receipt | ★★★★☆ |
| `#moves-search` | `<input type="search">` | Free-text search in move notes, equipment name, tracking number | ★★★★★ |

### Moves Table

| Element ID | What it shows | Source | Importance |
|---|---|---|---|
| `#moves-table-header` | Dynamic column headers | Generated at render time | ★★★★★ |
| `#moves-table-body` | One row per move entry | `state.moves` (filtered) | ★★★★★ |

**Each row shows:** Date/time, equipment name, move type, from location, to location, notes/tracking, condition result (if receipt recorded), correction badges.

Clicking a row in admin mode opens the **Correction Modal** to fix errors in that move record.

**Importance:** ★★★★★ Keep the whole Moves tab. It's the audit log.

---

## Directory: `index.html` → Admin Tab (`#admin-view`)

### Auth Panel

| Element ID | Type | Purpose | Supabase | Importance |
|---|---|---|---|---|
| `#auth-email` | `<input type="email">` | Email address for Supabase login | Supabase Auth | ★★★☆☆ |
| `#auth-password` | `<input type="password">` | Password | Supabase Auth | ★★★☆☆ |
| `#auth-login-button` | `<button>` | Signs in to Supabase | `supabase.auth.signInWithPassword()` | ★★★☆☆ |
| `#auth-logout-button` | `<button>` | Signs out | `supabase.auth.signOut()` | ★★★☆☆ |
| `#auth-status` | `<p>` | Shows current auth status | `supabase.auth.getUser()` | ★★★☆☆ |

**Redesign note:** ★★★☆☆ Keep but move it somewhere more prominent (e.g. a persistent header bar). Auth state affects what actions are available throughout the whole app, so it shouldn't be buried in the Admin tab.

### Test Buttons (Dev only)

| Element ID | Purpose | Importance |
|---|---|---|
| `#auth-test-move-create-button` | Fires a test request to the `move_create` edge function | ★☆☆☆☆ Drop |
| `#auth-test-move-receipt-button` | Fires a test request to the `move_receipt` edge function | ★☆☆☆☆ Drop |

**Redesign note:** These are debugging tools used during development. Remove from the production UI.

---

### Add Equipment Form (`#add-equipment-form`)

| Element ID | Type | What it collects | Supabase destination | Required? | Importance |
|---|---|---|---|---|---|
| `#new-equipment-name` | `<input>` | Equipment name | `equipment.name` | Yes | ★★★★★ |
| `#new-equipment-model` | `<input>` | Model/type | `equipment.category` | No | ★★★★★ |
| `#new-equipment-serial` | `<input>` | Serial number | `equipment.serial` | No | ★★★★★ |
| `#new-equipment-serial-warning` | `<span>` | Duplicate serial warning | Display only | — | ★★★★☆ |
| `#new-equipment-purchase-date` | `<input type="date">` | Purchase date | `equipment.purchase_date` | No | ★★★☆☆ |
| `#new-equipment-location` | `<select>` | Starting location | `equipment_state.current_location_id` | No | ★★★★★ |
| `#new-equipment-status` | `<select>` | Starting status | `equipment_state.status` | No | ★★★★★ |
| `#new-equipment-calibration-required` | `<input type="checkbox">` | Does this item need periodic calibration? | `equipment.calibration_required` | No | ★★★★★ |
| `#new-equipment-calibration-interval` | `<select>` | Calibration frequency: 12 months / 24 months / Custom | `equipment.calibration_interval_months` | Conditional | ★★★★☆ |
| `#new-equipment-calibration-interval-custom` | `<input type="number">` | Custom interval in months | `equipment.calibration_interval_months` | Conditional | ★★★☆☆ |
| `#new-equipment-last-calibration` | `<input type="date">` | Date of last calibration | `equipment.last_calibration_date` | Conditional | ★★★★☆ |
| `#new-equipment-subscription-required` | `<input type="checkbox">` | Does this item have a software subscription? | `equipment.subscriptionRequired` (app field) | No | ★★★★★ |
| `#new-equipment-subscription-date` | `<input type="date">` | Next renewal date | `subscriptions.renewal_date` (DB B) | Conditional | ★★★★☆ |
| `#new-equipment-billing-cycle` | `<select>` | Monthly / Annually | `subscriptions.billing_cycle` (DB B) | Conditional | ★★★☆☆ |

**Importance:** ★★★★★ Keep. Core admin function.

---

### Edit Equipment Form (`#edit-equipment-form`)

Same fields as Add Equipment, plus:

| Element ID | Type | What it collects | Supabase destination | Importance |
|---|---|---|---|---|
| `#edit-equipment-select` | `<select>` | Choose which equipment to edit | — | ★★★★★ |
| `#edit-equipment-name-error` | `<span>` | "Name is required" error | Display only | ★★★★☆ |
| `#edit-equipment-name-warning` | `<span>` | "Another item has this name" warning | Display only | ★★★★☆ |
| `#edit-equipment-contents-checklist` | `<textarea>` | Contents checklist reference (one item per line) | `equipment_state.condition_reference.contents` | ★★★★☆ |
| `#edit-equipment-functional-checklist` | `<textarea>` | Functional check guide (one item per line) | `equipment_state.condition_reference.functional` | ★★★★☆ |
| `#edit-equipment-copy-source` | `<select>` | Copy checklists from another equipment item | — (UI helper) | ★★★☆☆ |
| `#edit-equipment-copy-button` | `<button>` | Executes the checklist copy | — | ★★★☆☆ |
| `#edit-equipment-cancel` | `<button>` | Cancels editing | — | ★★★★☆ |

**Importance:** ★★★★☆ Keep. Consider merging Add and Edit into a single equipment detail panel.

---

### Calibration Form (`#calibration-form`)

| Element ID | Type | What it collects | Supabase destination | Importance |
|---|---|---|---|---|
| `#calibration-equipment` | `<select>` | Which equipment was calibrated | `moves.equipment_id` | ★★★★★ |
| `#calibration-date` | `<input type="date">` | Date calibration was performed | `equipment.last_calibration_date` | ★★★★★ |
| `#calibration-interval` | `<input type="number">` | Override calibration interval (months) | `equipment.calibration_interval_months` | ★★★☆☆ |
| `#calibration-required` | `<input type="checkbox">` | Toggle whether calibration is required | `equipment.calibration_required` | ★★★★☆ |

**Importance:** ★★★★☆ Keep.

---

### Admin Passcode Settings (`#admin-passcode-settings`)

| Element ID | Type | Purpose | Importance |
|---|---|---|---|
| `#admin-passcode-current` | `<input type="password">` | Current passcode | ★★★☆☆ |
| `#admin-passcode-update` | `<input type="password">` | New passcode | ★★★☆☆ |
| `#admin-passcode-update-confirm` | `<input type="password">` | Confirm new passcode | ★★★☆☆ |

**Importance:** ★★★☆☆ Replace. The passcode is stored in localStorage which is not secure. Replace with role-based access via Supabase `profiles.role`.

---

### Diagnostics Panel

| Element ID | Type | Purpose | Importance |
|---|---|---|---|
| `#admin-diagnostics-toggle` | `<input type="checkbox">` | Show/hide the diagnostics panel | ★★☆☆☆ |
| `#admin-diagnostics-log` | `<textarea>` | Read-only log of app events | ★★☆☆☆ |

**Importance:** ★★☆☆☆ Move to browser DevTools / console. Remove from production UI.

---

### CSV Import Panel

| Element ID | Type | Purpose | Importance |
|---|---|---|---|
| `#import-template-button` | `<button>` | Download a blank CSV template | ★★★☆☆ |
| `#import-file-input` | `<input type="file">` | Upload a CSV file | ★★★☆☆ |
| `#import-duplicate-behavior` | `<select>` | Skip or import duplicate serials | ★★★☆☆ |
| `#import-total-count` | `<strong>` | Rows detected | ★★★☆☆ |
| `#import-valid-count` | `<strong>` | Valid rows | ★★★☆☆ |
| `#import-invalid-count` | `<strong>` | Invalid rows | ★★★☆☆ |
| `#import-preview-table` | `<div>` | Preview table of parsed CSV | ★★★☆☆ |
| `#import-warnings` | `<ul>` | List of validation warnings | ★★★☆☆ |
| `#import-submit` | `<button>` | Confirm import | ★★★☆☆ |
| `#import-clear` | `<button>` | Reset the import | ★★★☆☆ |

**Importance:** ★★★☆☆ Keep but treat as lower-priority. Useful for initial data onboarding, not daily use.

---

## Directory: `index.html` → Modals & Dialogs

All modals use the native HTML `<dialog>` element. They open with `dialog.showModal()` and close with `dialog.close()`.

### Condition History Modal (`#condition-history-modal`)

Shows the full condition check history for one piece of equipment.

| Element ID | Purpose | Source | Importance |
|---|---|---|---|
| `#condition-history-title` | Modal heading with equipment name | `item.name` | ★★★★☆ |
| `#condition-history-close` | Close button | — | ★★★★☆ |
| `#condition-history-list` | List of past condition checks | `equipment_state.condition_history` (JSONB array) | ★★★★☆ |

**Trigger:** Clicking a condition badge in the equipment table.
**Importance:** ★★★★☆ Keep.

---

### Correction Modal (`#correction-modal`)

Admin-only. Allows fixing errors in a recorded move without deleting it (non-destructive audit trail).

| Element ID | Type | What it corrects | Supabase destination | Importance |
|---|---|---|---|---|
| `#correction-target-label` | `<p>` | Shows which move is being corrected | Display only | ★★★★☆ |
| `#correction-field-shipping` + `#correction-shipping-tracking` | checkbox + input | Fix the shipping tracking number | `corrections` table | ★★★★☆ |
| `#correction-field-receipt` + `#correction-receipt-date` | checkbox + date | Fix the receipt date | `corrections` table | ★★★★☆ |
| `#correction-field-from` + `#correction-from-location` | checkbox + select | Fix the origin location | `corrections` table | ★★★★☆ |
| `#correction-field-to` + `#correction-to-location` | checkbox + select | Fix the destination location | `corrections` table | ★★★★☆ |
| `#correction-field-condition` + `#correction-condition-rating` | checkbox + select | Fix the condition rating | `corrections` table | ★★★★☆ |
| `#correction-field-notes` + `#correction-notes` | checkbox + textarea | Fix the move notes | `corrections` table | ★★★★☆ |
| `#correction-reason` | `<textarea>` | Why the correction was made (required) | `corrections.reason` | ★★★★★ |
| `#correction-cancel` | `<button>` | Cancel without saving | — | ★★★★☆ |

**Trigger:** Clicking a row in the Moves table while admin mode is on.
**Importance:** ★★★★☆ Keep — admin only.

---

### Correction Details Modal (`#correction-details-modal`)

Shows the full audit trail of corrections for a move.

| Element ID | Purpose | Importance |
|---|---|---|
| `#correction-details-close` | Close button | ★★★★☆ |
| `#correction-details-list` | List of all corrections applied to this move | ★★★★☆ |

**Importance:** ★★★★☆ Keep — admin only.

---

### Admin Passcode Dialog (`#admin-passcode-dialog`)

Shown when the admin mode toggle is switched on. Two modes: initial setup (no passcode set yet) and verification (enter existing passcode).

| Element ID | Purpose | Importance |
|---|---|---|
| `#admin-passcode-input` | Passcode entry for verification mode | ★★★☆☆ |
| `#admin-passcode-new` + `#admin-passcode-confirm` | New passcode fields for setup mode | ★★★☆☆ |
| `#admin-passcode-error` | Error message | ★★★☆☆ |
| `#admin-passcode-submit` | Confirm button | ★★★☆☆ |
| `#admin-passcode-cancel` | Cancel button | ★★★☆☆ |

**Importance:** ★★★☆☆ Replace with Supabase Auth role check.

---

### Toast Container (`#toast-container`)

A floating area for temporary feedback messages (e.g. "Move recorded", "Equipment added").

**Importance:** ★★★★★ Keep. Toasts are the primary way the UI confirms that an action worked.

---

## Directory: `src/main.js` — Event Listeners

### Form Submissions ★★★★★

| Form | Event | What triggers | What it calls |
|---|---|---|---|
| `#move-form` | `submit` | "Record move" button clicked | `move_create` edge function → `repository.recordMove()` |
| `#add-equipment-form` | `submit` | "Add equipment" button clicked | `repository.addEquipment()` + `createSubscriptionRecord()` |
| `#edit-equipment-form` | `submit` | "Save changes" button clicked | `repository.updateEquipment()` |
| `#calibration-form` | `submit` | "Record calibration" button clicked | `repository.recordCalibration()` |

### Filters & Search ★★★★☆

All of these call `refreshUI()` or `renderMovesView()` which re-renders the relevant table with the new filter applied. No Supabase query happens — the data is already in memory.

| Element | Event | What it triggers |
|---|---|---|
| `#search-input` | `input` | Re-renders equipment table |
| `#location-filter` | `change` | Re-renders equipment table |
| `#status-filter` | `change` | Re-renders equipment table |
| `#calibration-filter` | `change` | Re-renders equipment table |
| `#subscription-filter` | `change` | Re-renders equipment table |
| `#moves-equipment-filter` | `change` | Re-renders moves table |
| `#moves-type-filter` | `change` | Re-renders moves table |
| `#moves-destination-filter` | `change` | Re-renders moves table |
| `#moves-show-deleted` | `change` | Re-renders moves table |
| `#moves-receipt-only` | `change` | Re-renders moves table |
| `#moves-search` | `input` | Re-renders moves table |
| `#import-duplicate-behavior` | `change` | Re-parses CSV with new duplicate rule |

### Table Click Handlers ★★★★☆

| Element | What happens on click |
|---|---|
| `#equipment-table` row | Opens condition history modal for that item |
| `#moves-table-body` row | Admin mode: opens correction modal. Otherwise: shows correction details |
| `#location-summary` card | Sets the location filter to that location |

### Move Form Conditional Changes ★★★☆☆

These listeners show/hide sections of the move form dynamically based on what the user selects. No data is saved — they just control form visibility.

| Element | Effect |
|---|---|
| `#move-equipment` change | Resets location; loads condition checklist for selected equipment |
| `#move-location` change | Shows/hides shipping section; validates shipping requirements |
| `#move-status` change | Shows/hides condition check section |
| `#move-shipping-carrier` change | Updates form validation state |
| `#move-shipping-tracking` input | Updates form validation state |
| `#move-condition-rating` change | Shows/hides condition notes requirement |
| `#move-contents-ok` change | Shows/hides condition notes requirement |
| `#move-functional-ok` change | Shows/hides condition notes requirement |
| `#move-condition-notes` input | Clears the "notes required" error state |
| `#move-checklist-admin-link` click | Navigates to Admin tab with that equipment pre-selected |

### Admin & Dialog Controls ★★★★☆

| Element | What it does |
|---|---|
| `#admin-mode-toggle` change | If enabling: opens passcode dialog. If disabling: hides admin tab |
| `#admin-passcode-form` submit | Verifies or sets the passcode; enables admin mode |
| `#admin-passcode-cancel` click | Closes passcode dialog; reverts toggle |
| `#correction-form` submit | Saves correction to `state.corrections` via `repository.addCorrection()` |
| `#correction-cancel` click | Closes correction modal |
| `#correction-details-close` click | Closes correction details modal |
| `#condition-history-close` click | Closes condition history modal |
| `#admin-passcode-settings` submit | Updates the stored admin passcode |
| `#admin-diagnostics-toggle` change | Shows/hides the diagnostics panel |

### History & Import ★★☆☆☆

| Element | What it does |
|---|---|
| `#clear-history` click | Sets all moves to `archived: true` via `repository.archiveHistory()` |
| `#import-file-input` change | Parses CSV; shows preview; validates rows |
| `#import-submit` click | Calls `repository.importEquipment(rows)` |
| `#import-clear` click | Resets import preview state |

### Auth ★★★☆☆

| Element | What it does |
|---|---|
| `#auth-login-button` click | `supabase.auth.signInWithPassword({email, password})` |
| `#auth-logout-button` click | `supabase.auth.signOut()` |
| `#auth-test-move-create-button` click | Dev: fires test POST to move_create |
| `#auth-test-move-receipt-button` click | Dev: fires test POST to move_receipt |

---

## Computed / Derived Values (not stored directly in Supabase)

These values are calculated in JavaScript at render time from stored data. They are **not** columns in the database — they are derived fresh every time the UI refreshes.

| Value | How it's computed | Source fields |
|---|---|---|
| **Calibration status** | If `calibrationRequired` is false → "Not required". If no `lastCalibrationDate` → "Unknown". Otherwise calculate next due = lastCalibration + intervalMonths. If past today → "Overdue". If within 30 days → "Due soon". Else → "OK". | `calibrationRequired`, `lastCalibrationDate`, `calibrationIntervalMonths` (default 12) |
| **Subscription status** | If `subscriptionRequired` is false → "Not required". If no `subscriptionRenewalDate` → "Unknown". If past today → "Overdue". If within 30 days → "Due soon". Else → "OK". | `subscriptionRequired`, `subscriptionRenewalDate` |
| **Effective status** | Check if the most recent move has shipping details AND no receipt yet. If yes → "In transit". Else → `item.status`. | `state.moves`, `item.status` |
| **Location display** | If in transit → "In transit (Perth → Melbourne)". Else → `item.location`. | Most recent move, `item.location` |
| **Age label** | Months and years since `purchaseDate`. If no date → "Unknown". | `purchaseDate` |
| **Condition badge** | `conditionRating` with a colour (green=Good/Excellent, yellow=Fair, red=Needs attention/Unserviceable, grey=not checked). | `conditionRating`, `conditionLastCheckedAt` |

---

## UI-to-Supabase Field Mapping

Complete mapping from what the user types in a form → what goes to the database.

| Form field | App state field | Database A table | Column |
|---|---|---|---|
| Equipment name | `name` | `equipment` | `name` |
| Model | `model` | `equipment` | `category` |
| Serial number | `serialNumber` | `equipment` | `serial` |
| Purchase date | `purchaseDate` | `equipment` | `purchase_date` |
| Calibration required | `calibrationRequired` | `equipment` | `calibration_required` |
| Calibration interval | `calibrationIntervalMonths` | `equipment` | `calibration_interval_months` |
| Last calibration date | `lastCalibrationDate` | `equipment` | `last_calibration_date` |
| Current location | `location` | `equipment_state` | `current_location_id` (UUID) |
| Status | `status` | `equipment_state` | `status` |
| Condition rating | `conditionRating` | `equipment_state` | `last_condition_result` |
| Condition checked at | `conditionLastCheckedAt` | `equipment_state` | `last_condition_at` |
| Contents OK | `conditionContentsOk` | `equipment_state` | `condition_contents_ok` |
| Functional OK | `conditionFunctionalOk` | `equipment_state` | `condition_functional_ok` |
| Condition notes | `conditionLastNotes` | `equipment_state` | `condition_last_notes` |
| Contents checklist | `conditionReference.contents` | `equipment_state` | `condition_reference` (JSONB) |
| Functional checklist | `conditionReference.functional` | `equipment_state` | `condition_reference` (JSONB) |
| Subscription required | `subscriptionRequired` | App state only (sourced from DB B) | — |
| Subscription renewal date | `subscriptionRenewalDate` | **Database B** `subscriptions` | `renewal_date` |
| Billing cycle | — | **Database B** `subscriptions` | `billing_cycle` |
| Move destination | `toLocationId` | `moves` | `to_location_id` |
| Move notes | `text` | `moves` | `notes` |
| Move timestamp | `timestamp` | `moves` | `moved_at` |
| Move type | `type` | `moves` | `move_type` |
| Shipping carrier | — | `move_shipping` | `carrier` |
| Tracking number | — | `move_shipping` | `tracking_number` |
| Ship date | — | `move_shipping` | `booked_at` |
| Correction reason | — | `corrections` | `reason` |
| Corrected field | — | `corrections` | `field` |
| Old value | — | `corrections` | `old_value` |
| New value | — | `corrections` | `new_value` |

---

## Frontend-Only State (not in Supabase)

These values exist only in the browser and reset on reload unless saved to localStorage.

| What | Storage | Key | Importance |
|---|---|---|---|
| Active tab | `localStorage` | `equipmentTrackerActiveTab` | ★★★★☆ |
| Admin mode on/off | `localStorage` | `equipmentTrackerAdminMode` | ★★★☆☆ |
| Admin passcode | `localStorage` | `equipmentTrackerAdminPasscode` | ★★★☆☆ Replace with Supabase Auth |
| All filter values | DOM only | — (not persisted) | ★★★★☆ Consider persisting |
| CSV import preview | In-memory JS object | `equipmentImportState` | ★★★☆☆ |
| Modal open/closed | `<dialog>` element state | — | ★★★★★ |

---

## State Flow

```
App starts
  → createRepository({ adapter: createSupabaseStorageAdapter() })
  → repository.hydrate()
      → adapter.load() [fetches all data from Supabase in parallel]
      → emit("state:changed", loadedState)
          → on("state:changed") listener
              → Object.assign(state, loadedState)
              → refreshUI()
                  → all render functions update the DOM

User takes action (e.g. submits move form)
  → handleMoveSubmit()
      → POST to move_create edge function [validates auth, inserts to DB]
      → repository.recordMove(moveData)
          → mutate(draft => draft.moves.unshift(newMove))
              → adapter.save(state) [upserts all tables to Supabase]
              → emit("state:changed", newState)
                  → refreshUI() [DOM re-renders with new data]

User changes a filter
  → filter change event fires
  → refreshUI() reads new filter value from DOM
  → re-renders table (no Supabase query — data is already in memory)
```

---

## Carry-Forward vs. Drop — Redesign Recommendations

| UI Section | Recommendation | Reason |
|---|---|---|
| Stats cards (6 metrics) | ★★★★★ Keep | Quick-glance KPIs; operationally essential |
| Equipment filter bar | ★★★★★ Keep | Core navigation feature |
| Equipment table | ★★★★★ Keep — redesign layout | Core view; current table is too wide and dense |
| Location summary | ★★★★☆ Keep | Good overview; consider moving to a sidebar |
| Move form | ★★★★★ Keep — simplify into steps | Core action; too many conditional sections shown at once |
| Shipping sub-form | ★★★★☆ Keep | Needed for tracking; consider as a modal step |
| Condition check | ★★★★☆ Keep | Required for quality tracking; clean it up |
| History list | ★★★☆☆ Keep — simplify | Duplicates Moves tab; could be a compact "last 5" widget |
| Moves tab + filters | ★★★★★ Keep | Essential audit log |
| Correction modal | ★★★★☆ Keep — admin only | Critical for data quality |
| Condition history modal | ★★★★☆ Keep | Useful for field staff |
| Add Equipment form | ★★★★★ Keep | Core admin function |
| Edit Equipment form | ★★★★☆ Keep | Core admin function; consider merging with Add |
| Calibration form | ★★★★☆ Keep | Core operational function |
| Admin passcode system | ★★★☆☆ Replace | localStorage passcode is not secure; use Supabase `profiles.role` |
| CSV import | ★★★☆☆ Keep — lower priority | Useful for onboarding, not daily use |
| Auth login/logout panel | ★★★☆☆ Keep — move to header | Auth affects the whole app; shouldn't be buried in Admin tab |
| Supabase test buttons | ★☆☆☆☆ Drop | Dev-only debugging tools |
| Diagnostics log | ★★☆☆☆ Drop from UI | Move to browser DevTools / console |
| Toast notifications | ★★★★★ Keep | Essential user feedback |
