// src/ui/stats.js — renders the six metric cards in the Operations view header.
//
// The stats reflect the currently-filtered equipment list, so they stay in sync
// with whatever location / status / calibration filters the user has set.
//
// Call renderStats(filteredEquipment, state.moves) after every filter change
// or state:changed event.

import { getCalibrationInfo, getSubscriptionInfo, getEffectiveStatus } from "./computed.js";

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Set the text content of an element by ID, safely ignoring missing elements.
 * @param {string} id
 * @param {string|number} value
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/**
 * Toggle the danger/warn modifier class on a metric card based on whether
 * its count is non-zero. This lets the card go visually "quiet" when there's
 * nothing to flag.
 *
 * @param {string}  statId   - the id of the <p> count element
 * @param {number}  count
 * @param {string}  modifier - CSS class without the leading dot, e.g. "metric-card--danger"
 */
function syncCardState(statId, count, modifier) {
  const el = document.getElementById(statId);
  const card = el?.closest(".metric-card");
  if (!card) return;
  card.classList.toggle(modifier, count > 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render all six metric cards.
 *
 * @param {object[]} filteredEquipment  - output of getFilteredEquipment()
 * @param {object[]} moves              - state.moves (needed for getEffectiveStatus)
 * @param {Date}     [now]
 */
export function renderStats(filteredEquipment, moves, now = new Date()) {
  const list  = Array.isArray(filteredEquipment) ? filteredEquipment : [];
  const mvs   = Array.isArray(moves) ? moves : [];

  // 1 — Total tracked items
  setText("stat-total", list.length);

  // 2 — On hire
  const hireCount = list.filter(
    (item) => getEffectiveStatus(item, mvs).toLowerCase() === "on hire"
  ).length;
  setText("stat-hire", hireCount);

  // 3 — Calibration overdue
  const calOverdue = list.filter(
    (item) => getCalibrationInfo(item, now).status === "Overdue"
  ).length;
  setText("stat-overdue", calOverdue);
  syncCardState("stat-overdue", calOverdue, "metric-card--danger");

  // 4 — Calibration due soon
  const calDueSoon = list.filter(
    (item) => getCalibrationInfo(item, now).status === "Due soon"
  ).length;
  setText("stat-due-soon", calDueSoon);
  syncCardState("stat-due-soon", calDueSoon, "metric-card--warn");

  // 5 — Subscription overdue
  const subOverdue = list.filter(
    (item) => getSubscriptionInfo(item, now).status === "Overdue"
  ).length;
  setText("stat-overdue-subscription", subOverdue);
  syncCardState("stat-overdue-subscription", subOverdue, "metric-card--danger");

  // 6 — Subscription due soon
  const subDueSoon = list.filter(
    (item) => getSubscriptionInfo(item, now).status === "Due soon"
  ).length;
  setText("stat-due-soon-subscription", subDueSoon);
  syncCardState("stat-due-soon-subscription", subDueSoon, "metric-card--warn");
}
