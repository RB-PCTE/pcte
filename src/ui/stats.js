// src/ui/stats.js — renders the five metric cards in the Operations view header.
//
// The stats reflect the currently-filtered equipment list, so they stay in sync
// with whatever location / status / calibration filters the user has set.
//
// Call renderStats(filteredEquipment, state.moves) after every filter change
// or state:changed event.

import { getCalibrationInfo, getSubscriptionInfo, getEffectiveStatus } from "./computed.js";

// ── Internal helpers ──────────────────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// Sets danger/warn/neither on a combined card based on overdue vs due-soon counts.
function syncCombinedCard(statId, overdueCount, dueSoonCount) {
  const el = document.getElementById(statId);
  const card = el?.closest(".metric-card");
  if (!card) return;
  card.classList.toggle("metric-card--danger", overdueCount > 0);
  card.classList.toggle("metric-card--warn",   overdueCount === 0 && dueSoonCount > 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render all five metric cards.
 *
 * @param {object[]} filteredEquipment  - output of getFilteredEquipment()
 * @param {object[]} moves              - state.moves (needed for getEffectiveStatus)
 * @param {Date}     [now]
 */
export function renderStats(filteredEquipment, moves, now = new Date()) {
  const list = Array.isArray(filteredEquipment) ? filteredEquipment : [];
  const mvs  = Array.isArray(moves) ? moves : [];

  // 1 — Total tracked items
  setText("stat-total", list.length);

  // 2 — In transit
  const transitCount = list.filter(
    (item) => getEffectiveStatus(item, mvs) === "In transit"
  ).length;
  setText("stat-in-transit", transitCount);

  // 3 — On hire + On demo
  const hireCount = list.filter((item) => {
    const s = getEffectiveStatus(item, mvs).toLowerCase();
    return s === "on hire" || s === "on demo";
  }).length;
  setText("stat-hire", hireCount);

  // 4 — Calibration (overdue + due soon combined)
  const calOverdue  = list.filter((item) => getCalibrationInfo(item, now).status === "Overdue").length;
  const calDueSoon  = list.filter((item) => getCalibrationInfo(item, now).status === "Due soon").length;
  setText("stat-calibration", calOverdue + calDueSoon);
  syncCombinedCard("stat-calibration", calOverdue, calDueSoon);

  // 5 — Subscription (overdue + due soon combined)
  const subOverdue  = list.filter((item) => getSubscriptionInfo(item, now).status === "Overdue").length;
  const subDueSoon  = list.filter((item) => getSubscriptionInfo(item, now).status === "Due soon").length;
  setText("stat-subscription", subOverdue + subDueSoon);
  syncCombinedCard("stat-subscription", subOverdue, subDueSoon);
}
