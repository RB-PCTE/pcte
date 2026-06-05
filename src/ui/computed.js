// src/ui/computed.js — pure computed-value functions.
//
// No DOM access. No side effects. No imports from other UI modules.
// Pass data in, get a value out. Every function here is safe to call in tests.
//
// Equipment shape (from mapEquipmentFromDb):
//   { id, name, model, serialNumber, purchaseDate, location, status,
//     conditionRating, conditionLastCheckedAt, conditionContentsOk,
//     conditionFunctionalOk, conditionLastCheckedBy,
//     calibrationRequired, calibrationIntervalMonths, lastCalibrationDate,
//     subscriptionRequired, subscriptionRenewalDate, conditionHistory, ... }
//
// Move shape (from mapMoveFromDb):
//   { id, equipmentId, type, text, timestamp, archived, receiptData }

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

// ── Date helpers (private) ─────────────────────────────────────────────────

/**
 * Parse a "YYYY-MM-DD" string into a local Date, avoiding timezone shift.
 * Returns null if the string is absent or malformed.
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * More permissive parser for subscription renewal dates, which can arrive as
 * either "YYYY-MM-DD" strings or ISO-8601 timestamps from Supabase.
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
function parseSubscriptionDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const simple = parseDate(value);
    if (simple) return simple;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Return a new Date with `months` added to `date`.
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ── Date formatting ───────────────────────────────────────────────────────────

/**
 * Format a Date object to a "YYYY-MM-DD" string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Format a timestamp value (ISO string, Date, or any parseable value) into
 * a compact human-readable string: "DD/MM/YYYY, HH:mm".
 * Returns "—" for invalid or empty values.
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

// ── Equipment age ─────────────────────────────────────────────────────────────

/**
 * Return a compact age label such as "2y 3m" or "5m" from a purchase date.
 * Returns "Unknown" if the date is absent or unparseable.
 * @param {string|null|undefined} purchaseDate - "YYYY-MM-DD"
 * @param {Date} [now]
 * @returns {string}
 */
export function getAgeLabel(purchaseDate, now = new Date()) {
  const start = parseDate(purchaseDate);
  if (!start) return "Unknown";

  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) -
    (now.getDate() < start.getDate() ? 1 : 0);

  const safeMonths = Math.max(totalMonths, 0);
  const years = Math.floor(safeMonths / 12);
  const months = safeMonths % 12;

  const yearPart = years > 0 ? `${years}y` : "";
  const monthPart = months > 0 || years === 0 ? `${months}m` : "";
  return [yearPart, monthPart].filter(Boolean).join(" ");
}

// ── Calibration ───────────────────────────────────────────────────────────────

/**
 * @typedef {"Not required"|"Unknown"|"Overdue"|"Due soon"|"OK"} CalibrationStatus
 *
 * @typedef {{ status: CalibrationStatus, dueDate: Date|null }} CalibrationInfo
 */

/**
 * Compute the calibration health of one equipment item.
 * "Due soon" = within 60 days; "Overdue" = past due date.
 * @param {object} item  - Equipment object from state.equipment
 * @param {Date} [now]
 * @returns {CalibrationInfo}
 */
export function getCalibrationInfo(item, now = new Date()) {
  if (!item.calibrationRequired) {
    return { status: "Not required", dueDate: null };
  }

  const lastCalibration = parseDate(item.lastCalibrationDate);
  if (!lastCalibration) {
    return { status: "Unknown", dueDate: null };
  }

  const intervalMonths = item.calibrationIntervalMonths ?? 12;
  const dueDate = addMonths(lastCalibration, intervalMonths);
  const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { status: "Overdue",  dueDate };
  if (diffDays <= 60) return { status: "Due soon", dueDate };
  return { status: "OK", dueDate };
}

// ── Subscription ──────────────────────────────────────────────────────────────

/**
 * @typedef {"Not required"|"Unknown"|"Overdue"|"Due soon"|"OK"} SubscriptionStatus
 *
 * @typedef {{ status: SubscriptionStatus, renewalDate: Date|null }} SubscriptionInfo
 */

/**
 * Compute the subscription health of one equipment item.
 * "Due soon" = within 30 days; "Overdue" = past renewal date.
 * Renewal date is sourced from DB B (Subscription Tracker) at load time.
 * @param {object} item  - Equipment object from state.equipment
 * @param {Date} [now]
 * @returns {SubscriptionInfo}
 */
export function getSubscriptionInfo(item, now = new Date()) {
  if (!item.subscriptionRequired) {
    return { status: "Not required", renewalDate: null };
  }

  const renewalDate = parseSubscriptionDate(item.subscriptionRenewalDate);
  if (!renewalDate) {
    return { status: "Unknown", renewalDate: null };
  }

  const diffDays = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { status: "Overdue",  renewalDate };
  if (diffDays <= 30) return { status: "Due soon", renewalDate };
  return { status: "OK", renewalDate };
}

// ── Condition ─────────────────────────────────────────────────────────────────

/**
 * Return the latest known condition snapshot for an equipment item.
 * Reads from the flat `conditionRating` / `conditionLastCheckedAt` fields
 * that are kept in sync by the repository (sourced from equipment_state).
 *
 * Returns null if no condition check has ever been recorded.
 *
 * @param {object} item  - Equipment object from state.equipment
 * @returns {{ grade: string, checkedAt: string, contentsOk: boolean|null,
 *             functionalOk: boolean|null, checkedBy: string|null } | null}
 */
export function getLatestConditionForItem(item) {
  if (!item.conditionRating && !item.conditionLastCheckedAt) return null;
  return {
    grade:       item.conditionRating ?? "Not checked",
    checkedAt:   item.conditionLastCheckedAt ?? "",
    contentsOk:  item.conditionContentsOk  ?? null,
    functionalOk: item.conditionFunctionalOk ?? null,
    checkedBy:   item.conditionLastCheckedBy ?? null,
  };
}

/**
 * Map a condition rating string to the matching CSS modifier for `.condition-badge`.
 * @param {string|null|undefined} rating
 * @returns {string}  e.g. "condition-badge--good"
 */
export function conditionBadgeClass(rating) {
  if (!rating || rating === "Not checked") return "condition-badge--neutral";
  if (rating === "Excellent" || rating === "Good") return "condition-badge--good";
  if (
    rating === "Needs attention" ||
    rating === "Missing" ||
    rating === "Fault" ||
    rating === "Unserviceable"
  ) return "condition-badge--bad";
  return "condition-badge--warn";
}

// ── In-transit detection ──────────────────────────────────────────────────────

// Move types that require a receipt (match move_create edge function logic).
// Until a receipt is recorded, equipment moved with these types is "in transit".
const RECEIPT_REQUIRED_TYPES = new Set([
  "office_transfer",
  "hire_out",
  "hire_return",
  // Legacy type used before the edge function was introduced:
  "move",
]);

/**
 * Return true if the equipment item is currently in transit.
 *
 * Detection: the most recent RECEIPT_REQUIRED_TYPES move for this item
 * has no `receiptData` yet.
 *
 * Note: this is an approximation until `move_shipping` rows are included
 * in the Supabase load query (which would let us verify carrier details exist).
 *
 * @param {object}   item  - Equipment object from state.equipment
 * @param {object[]} moves - state.moves array
 * @returns {boolean}
 */
export function isShippingActive(item, moves) {
  if (!item?.id || !Array.isArray(moves)) return false;

  const relevant = moves
    .filter(
      (m) =>
        m.equipmentId === item.id &&
        RECEIPT_REQUIRED_TYPES.has(m.type) &&
        !m.archived
    )
    .sort(
      (a, b) =>
        Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "")
    );

  const latest = relevant[0];
  if (!latest) return false;

  // Has a receipt been recorded for this move?
  return !latest.receiptData;
}

/**
 * Return the display status of an item, substituting "In transit" when the
 * item has an active unreceipted move.
 * @param {object}   item
 * @param {object[]} moves - state.moves array
 * @returns {string}
 */
export function getEffectiveStatus(item, moves) {
  return isShippingActive(item, moves) ? "In transit" : (item.status ?? "Unknown");
}

/**
 * Return a display-ready location object for an item.
 * When in transit, the text becomes "In transit (From → To)".
 *
 * Requires the latest relevant move to have `fromLocation` / `toLocation`
 * populated (these come from the move row via the edge function or the old
 * localStorage moves that stored location names directly).
 *
 * @param {object}   item
 * @param {object[]} moves - state.moves array
 * @returns {{ text: string, inTransit: boolean }}
 */
export function getEquipmentLocationDisplay(item, moves) {
  if (!isShippingActive(item, moves)) {
    return { text: item.location ?? "Unknown", inTransit: false };
  }

  // Find the latest relevant move to extract from/to names
  const relevant = moves
    .filter(
      (m) =>
        m.equipmentId === item.id &&
        RECEIPT_REQUIRED_TYPES.has(m.type) &&
        !m.archived
    )
    .sort(
      (a, b) =>
        Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "")
    );

  const latest = relevant[0];
  const from = latest?.fromLocation?.trim();
  const to   = latest?.toLocation?.trim();

  if (from && to && from !== to) {
    return { text: `In transit (${from} → ${to})`, inTransit: true };
  }

  return { text: item.location ?? "In transit", inTransit: true };
}

// ── Status → CSS modifier ─────────────────────────────────────────────────────

/**
 * Map a status string to the matching CSS modifier for `.pill`.
 * @param {string} status
 * @returns {string}  e.g. "pill--available"
 */
export function statusPillClass(status) {
  const map = {
    "Available":           "pill--available",
    "On demo":             "pill--on-demo",
    "On hire":             "pill--on-hire",
    "In service / repair": "pill--in-service",
    "Quarantined":         "pill--quarantined",
    "In transit":          "pill--in-transit",
  };
  return map[status] ?? "pill--unknown";
}

/**
 * Map a calibration/subscription status to a `.pill` modifier.
 * @param {CalibrationStatus|SubscriptionStatus} status
 * @returns {string}
 */
export function healthPillClass(status) {
  const map = {
    "Overdue":      "pill--overdue",
    "Due soon":     "pill--due-soon",
    "OK":           "pill--ok",
    "Unknown":      "pill--unknown",
    "Not required": "pill--n-a",
  };
  return map[status] ?? "pill--unknown";
}
