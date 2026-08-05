// src/ui/computed.js — pure presentation helpers.
//
// No DOM access. No side effects. Safe to call in tests.
//
// This file used to compute domain values (calibration health, effective
// status, in-transit detection, age labels). As of step 7a the backend does all
// of that and GET /state returns the answers — `age_label`, `calibration`,
// `in_transit`, `location_display`, `condition`. What's left here is formatting
// and CSS-class selection: turning a value the server already decided into
// something renderable.
//
// Equipment shape (EquipmentOut, backend/app/routers/state.py):
//   { id, name, serial, category, active, notes, purchase_date, age_label,
//     calibration_required, calibration_interval_months, last_calibration_date,
//     calibration: {status, due_date}|null, home_location_id, home_location_name,
//     current_location_id, current_location_name, current_move_id, status,
//     condition, in_transit, location_display: {text, in_transit},
//     created_at, updated_at }
//
// Move shape (MoveOut):
//   { id, equipment_id, move_type, from_location_id, from_location_name,
//     to_location_id, to_location_name, status_from, status_to, moved_at,
//     created_by, created_by_name, notes, created_at,
//     logistics: {carrier, tracking_number, booked_at, received_at,
//                 received_by, condition_result, condition_notes}|null }

import {
  EQUIPMENT_STATUS,
  EQUIPMENT_CATEGORY,
  IN_TRANSIT_DISPLAY,
  display,
} from "../enums.js";

// ── Labels ────────────────────────────────────────────────────────────────────

/**
 * One-line label for an equipment item — "Name — Category — Serial".
 * Used by every dropdown and by the moves table, so they can't drift apart.
 * @param {object} item - EquipmentOut
 * @returns {string}
 */
export function equipmentLabel(item) {
  return [item?.name, display(EQUIPMENT_CATEGORY, item?.category, ""), item?.serial]
    .filter(Boolean)
    .join(" — ");
}

// ── HTML safety ───────────────────────────────────────────────────────────────

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape a value for safe insertion into HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// ── Date formatting ───────────────────────────────────────────────────────────

/**
 * Format a date-only value ("YYYY-MM-DD" from the API, or a Date) as DD/MM/YYYY.
 * Returns "—" for empty or unparseable values.
 *
 * Parsed component-wise rather than with `new Date(string)`, which reads a bare
 * "YYYY-MM-DD" as UTC midnight and can render the previous day in a negative
 * timezone offset.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "—";

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return "—";
    date = new Date(year, month - 1, day);
  } else {
    return "—";
  }

  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format a timestamp as "DD/MM/YYYY, HH:mm". Returns "—" for empty or
 * unparseable values.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" && value.trim() ? value : "—";
  }
  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * The status to show for an item: "In transit" wins over the stored status
 * while a move is open, matching what the location column shows.
 *
 * `in_transit` is derived server-side from `equipment_state.current_move_id`,
 * so unlike the pre-step-7 version this needs no `moves` array to work it out.
 *
 * @param {object} item - EquipmentOut
 * @returns {string} display label
 */
export function statusDisplay(item) {
  if (item?.in_transit) return IN_TRANSIT_DISPLAY;
  return display(EQUIPMENT_STATUS, item?.status, "Unknown");
}

/**
 * `.pill` modifier for an equipment item's status. Keyed on the backend enum
 * value, not the display label — the labels are free to change without
 * silently dropping a pill's colour.
 * @param {object} item - EquipmentOut
 * @returns {string} e.g. "pill--available"
 */
export function statusPillClass(item) {
  if (item?.in_transit) return "pill--in-transit";
  const map = {
    available:         "pill--available",
    on_demo:           "pill--on-demo",
    on_hire:           "pill--on-hire",
    in_service_repair: "pill--in-service",
    quarantined:       "pill--quarantined",
  };
  return map[item?.status] ?? "pill--unknown";
}

// ── Calibration ───────────────────────────────────────────────────────────────

/**
 * `.pill` modifier for a calibration status.
 * `null` means calibration isn't required — the API omits the whole object.
 * @param {string|null|undefined} status - "ok" | "due_soon" | "overdue" | "unknown" | null
 * @returns {string}
 */
export function calibrationPillClass(status) {
  if (status === null || status === undefined) return "pill--n-a";
  const map = {
    ok:       "pill--ok",
    due_soon: "pill--due-soon",
    overdue:  "pill--overdue",
    unknown:  "pill--unknown",
  };
  return map[status] ?? "pill--unknown";
}

// ── Condition ─────────────────────────────────────────────────────────────────

/**
 * `.condition-badge` modifier for a condition_assessment value.
 * `null` means never assessed — no move has been receipted for this item.
 * @param {string|null|undefined} condition - "pass" | "needs_attention" | "fail" | null
 * @returns {string}
 */
export function conditionBadgeClass(condition) {
  const map = {
    pass:            "condition-badge--good",
    needs_attention: "condition-badge--warn",
    fail:            "condition-badge--bad",
  };
  return map[condition] ?? "condition-badge--neutral";
}
