// src/ui/stats.js — the four metric cards in the Operations view header.
//
// The counts reflect the currently-filtered equipment list, so they stay in
// sync with whatever location / status / calibration filters are set.
//
// Every value read here is computed server-side (`in_transit`, `status`,
// `calibration`), so this file only counts and formats.

// ── Internal helpers ──────────────────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/** Colour a card red when anything is overdue, amber when only due soon. */
function syncCombinedCard(statId, overdueCount, dueSoonCount) {
  const card = document.getElementById(statId)?.closest(".metric-card");
  if (!card) return;
  card.classList.toggle("metric-card--danger", overdueCount > 0);
  card.classList.toggle("metric-card--warn", overdueCount === 0 && dueSoonCount > 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render all four metric cards.
 * @param {object[]} filteredEquipment - output of getFilteredEquipment()
 */
export function renderStats(filteredEquipment) {
  const list = Array.isArray(filteredEquipment) ? filteredEquipment : [];

  setText("stat-total", list.length);
  setText("stat-in-transit", list.filter((item) => item.in_transit).length);

  setText(
    "stat-hire",
    list.filter((item) => item.status === "on_hire" || item.status === "on_demo").length
  );

  const calOverdue = list.filter((item) => item.calibration?.status === "overdue").length;
  const calDueSoon = list.filter((item) => item.calibration?.status === "due_soon").length;
  setText("stat-calibration", calOverdue + calDueSoon);
  syncCombinedCard("stat-calibration", calOverdue, calDueSoon);
}
