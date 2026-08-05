// src/enums.js — the single translation point between the backend's snake_case
// enum values and the Title-Case strings this UI displays.
//
// Rule: no module outside this file may contain a hardcoded display string for
// an enum value, and no module may compare against one. Import the map, or use
// `display()` / `valueOf()` / `options()`.
//
// The labels here are display-only and safe to reword. The CSS-class lookups in
// ui/computed.js deliberately key on the backend values instead, so renaming a
// label can't silently cost a pill its colour — which is exactly what the
// pre-step-7 version, keyed on Title-Case strings, was vulnerable to.

// ── Maps: backend value → display label ──────────────────────────────────────

/** `equipment_status` (migrations/001). */
export const EQUIPMENT_STATUS = {
  available:         "Available",
  on_demo:           "On demo",
  on_hire:           "On hire",
  in_service_repair: "In service / repair",
  quarantined:       "Quarantined",
};

/**
 * Not a stored status — the server derives `in_transit` from
 * `equipment_state.current_move_id` and we substitute this for display.
 */
export const IN_TRANSIT_DISPLAY = "In transit";

/**
 * `equipment_category` (migrations/001). The casing really is inconsistent in
 * the database — three uppercase acronyms, two lowercase words. These are the
 * exact stored values; only the labels are ours.
 */
export const EQUIPMENT_CATEGORY = {
  INDT:    "INDT",
  CNDT:    "CNDT",
  geotech: "Geotech",
  GPR:     "GPR",
  lab:     "Lab",
};

/** `location_category` (migrations/001). */
export const LOCATION_CATEGORY = {
  customer:  "Customer",
  warehouse: "Warehouse",
  office:    "Office",
};

/** `move_type` (migrations/002). */
export const MOVE_TYPE = {
  office_transfer: "Office transfer",
  hire_out:        "Hire out",
  hire_return:     "Hire return",
  workshop:        "Workshop",
  move:            "Move",
};

/** `condition_assessment` (migrations/003). NULL means never assessed. */
export const CONDITION = {
  pass:            "Pass",
  needs_attention: "Needs attention",
  fail:            "Fail",
};

/** Shown when `equipment.condition` is null. */
export const CONDITION_NOT_ASSESSED = "Not assessed";

/**
 * `CalibrationInfoOut.status` (backend/app/routers/state.py).
 *
 * There is no `not_required` member: the backend sends `calibration: null`
 * when the item doesn't need calibrating at all. That null is rendered as
 * CALIBRATION_NOT_REQUIRED — a local display decision, not a mapped value.
 */
export const CALIBRATION_STATUS = {
  ok:       "OK",
  due_soon: "Due soon",
  overdue:  "Overdue",
  unknown:  "Unknown",
};

export const CALIBRATION_NOT_REQUIRED = "Not required";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Backend value → display label.
 * Unknown values fall through unchanged rather than becoming "undefined", so a
 * value added to the database before it's added here is still legible on screen.
 * @param {Record<string,string>} map
 * @param {string|null|undefined} value
 * @param {string} [fallback] - returned for null/undefined
 * @returns {string}
 */
export function display(map, value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return map[value] ?? String(value);
}

/**
 * Display label → backend value. Returns null when the label isn't in the map.
 * @param {Record<string,string>} map
 * @param {string} label
 * @returns {string|null}
 */
export function valueOf(map, label) {
  const found = Object.entries(map).find(([, l]) => l === label);
  return found ? found[0] : null;
}

/**
 * Map → `[{ value, label }]`, for building <select> options.
 * @param {Record<string,string>} map
 * @returns {{value: string, label: string}[]}
 */
export function options(map) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}
