# Phase A Manual Checklist

Backend running (`cd backend && uvicorn app.main:app --reload`), frontend served from an
origin listed in the backend's `ALLOWED_ORIGINS`.

## Setup

- [ ] `GET /health` returns `{"status":"ok"}`.
- [ ] The Supabase project in `src/supabaseClient.js` matches the project the backend's
      `SUPABASE_JWKS_URL` points at. A mismatch means every request 401s with
      "Token issuer is invalid".

## Load and auth

- [ ] Signed out: the app renders empty with no console errors and makes no API calls.
- [ ] Sign in: `GET /state` and `GET /locations` both fire; equipment table and moves log populate.
- [ ] Admin → Developer tools → **Check API** reports the signed-in email.
- [ ] Sign out clears the tables.

## Display

- [ ] All five statuses render with their own pill colour; an in-transit item shows the
      "In transit" pill and `In transit (location)` in the Location column.
- [ ] Category renders as a label (e.g. "Geotech"), not the raw enum value.
- [ ] Calibration shows "Not required" for items that don't need it, and a due date
      tooltip for those that do.
- [ ] Condition shows "Not assessed" for equipment with no receipted move.

## Equipment

- [ ] Add equipment: category select offers the five real values; there is no
      "Starting status" field. New item appears as **Available**, at its home location,
      condition **Not assessed**.
- [ ] Edit equipment: purchase date is disabled. Network tab shows no
      `current_location_id`, `status`, `condition` or `purchase_date` in the PATCH body.
- [ ] Record calibration updates the equipment's calibration pill. (It does **not**
      add a Moves-log entry — there is no calibration move type.)
- [ ] As a non-admin, add/edit surface a 403 message rather than failing silently.

## Moves

- [ ] Record a move: request body has no `status_from`, `from_location_id` or `created_by`.
- [ ] Office → office reveals the shipping fieldset and requires carrier + tracking;
      any other pair does not.
- [ ] Move type auto-fills from the locations, but a manual choice (e.g. **Workshop**)
      survives a later destination change.
- [ ] The item shows as In transit immediately; its location does not change yet.
- [ ] A second move on the same item fails with a readable 409 message.

## Receipt

- [ ] Mark received: condition offers exactly Pass / Needs attention / Fail and is required.
- [ ] Request body has no `condition_contents_ok`, `condition_functional_ok` or `received_by`.
- [ ] After receipt: location, status and the condition badge all update.

## Locations (admin only)

- [ ] Create a location — it appears in the table with its category as a label
      (e.g. "Office", not `office`).
- [ ] Edit one location's category only — the `PUT` body still carries the
      unchanged `name` and `active` (full replace, not a partial patch).
- [ ] Deactivate — `confirm()` fires; the row stays in the table, dimmed, with an
      "Inactive" pill. Reactivate returns it to Active.
- [ ] A new location is immediately selectable as an equipment home location and
      a move destination; a deactivated one drops out of both, but still appears
      in the Moves-log destination filter.
- [ ] Empty name or unselected category blocks submit with an inline error and
      fires no network request.

## Regression

- [ ] No UI element anywhere references corrections; no console errors on any view.
- [ ] Hard reload after a move + receipt — location and status both persist.
- [ ] No forced `Leave site?` dialogs and no tab/window closes triggered by app code.
