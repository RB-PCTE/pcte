// src/ui/moves.js — Moves Log view: filter bar, table, mark-received.
//
// Public surface:
//   renderMovesView(state, { isAdmin })         — called on every state:changed
//   bindMovesEvents({ repository, showToast })  — called once at startup
//
// The corrections and soft-delete actions were removed in step 7a: neither had
// a backend endpoint, and the soft delete never persisted past a reload.

import {
  escapeHTML,
  formatDateTime,
  equipmentLabel,
  conditionBadgeClass,
} from "./computed.js";
import { getFilteredMoves, readMovesFilters, isMoveAwaitingReceipt } from "./filters.js";
import { FILTER_ALL } from "../model.js";
import {
  EQUIPMENT_STATUS,
  MOVE_TYPE,
  CONDITION,
  display,
  options,
} from "../enums.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function opt(value, label) {
  return `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`;
}

function populateSelect(id, optionStrings, current = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = el.value || current;
  el.innerHTML = optionStrings.join("");
  if ([...el.options].some((o) => o.value === prev)) el.value = prev;
}

// ── Filter dropdowns ──────────────────────────────────────────────────────────

function renderMovesFilterSelects(state) {
  populateSelect("moves-equipment-filter", [
    opt(FILTER_ALL, "All equipment"),
    ...(state.equipment ?? []).map((item) => opt(item.id, equipmentLabel(item))),
  ]);

  populateSelect("moves-type-filter", [
    opt(FILTER_ALL, "All types"),
    ...options(MOVE_TYPE).map((o) => opt(o.value, o.label)),
  ]);

  // Every location, not just active ones: a move to a since-deactivated
  // location is still in the log and still worth filtering to.
  populateSelect("moves-destination-filter", [
    opt(FILTER_ALL, "All destinations"),
    ...(state.locations ?? []).map((l) => opt(l.id, l.name)),
  ]);
}

// ── Row builders ──────────────────────────────────────────────────────────────

function getStatusChangeLabel(entry) {
  const from = display(EQUIPMENT_STATUS, entry.status_from, "");
  const to = display(EQUIPMENT_STATUS, entry.status_to, "");
  if (from && to && from !== to) return `${from} → ${to}`;
  return to || "—";
}

function getReceiptDisplay(entry) {
  const receivedAt = entry.logistics?.received_at;
  if (receivedAt) return `Received ${formatDateTime(receivedAt)}`;
  return "Awaiting receipt";
}

function buildConditionPill(entry) {
  const result = entry.logistics?.condition_result;
  if (!result) {
    return '<span class="condition-badge condition-badge--neutral">Not assessed</span>';
  }
  return `<span class="condition-badge ${conditionBadgeClass(result)}">${escapeHTML(display(CONDITION, result))}</span>`;
}

function buildNotesCell(entry) {
  const parts = [];
  if (entry.notes?.trim()) parts.push(`<div>${escapeHTML(entry.notes.trim())}</div>`);

  const carrier = entry.logistics?.carrier;
  const tracking = entry.logistics?.tracking_number;
  if (carrier || tracking) {
    const shipping = [carrier, tracking].filter(Boolean).join(" · ");
    parts.push(`<div class="moves-note-meta">${escapeHTML(shipping)}</div>`);
  }

  const conditionNotes = entry.logistics?.condition_notes;
  if (conditionNotes?.trim()) {
    parts.push(`<div class="moves-note-meta">${escapeHTML(conditionNotes.trim())}</div>`);
  }

  return parts.length ? parts.join("") : "—";
}

function buildEquipmentCell(entry, equipmentById) {
  const eq = equipmentById.get(String(entry.equipment_id ?? ""));
  return eq ? equipmentLabel(eq) : "Unknown equipment";
}

function buildActionsCell(entry) {
  if (!isMoveAwaitingReceipt(entry)) return "";
  return `<button class="btn btn-sm" type="button" data-action="mark-received" data-id="${escapeHTML(entry.id)}">
    Mark received
  </button>`;
}

function buildRow(entry, equipmentById, showActions) {
  return `
    <tr>
      <td>${escapeHTML(formatDateTime(entry.moved_at))}</td>
      <td>${escapeHTML(buildEquipmentCell(entry, equipmentById))}</td>
      <td>${escapeHTML(entry.from_location_name ?? "—")}</td>
      <td>${escapeHTML(entry.to_location_name ?? "—")}</td>
      <td>${escapeHTML(getStatusChangeLabel(entry))}</td>
      <td>${escapeHTML(getReceiptDisplay(entry))}</td>
      <td>${buildConditionPill(entry)}</td>
      <td>${buildNotesCell(entry)}</td>
      <td>${escapeHTML(display(MOVE_TYPE, entry.move_type))}</td>
      ${showActions ? `<td>${buildActionsCell(entry)}</td>` : ""}
    </tr>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

/**
 * Re-render the Moves Log view.
 * @param {object} state
 */
export function renderMovesView(state) {
  renderMovesFilterSelects(state);

  const entries = getFilteredMoves(state, readMovesFilters());
  const equipmentById = new Map((state.equipment ?? []).map((eq) => [String(eq.id), eq]));

  // Receipting is everyday operational work, not an admin action — the backend
  // gates POST /moves/{id}/receipt on authentication only.
  const showActions = entries.some(isMoveAwaitingReceipt);

  const headers = [
    "Timestamp", "Equipment", "From", "To",
    "Status change", "Receipt", "Condition", "Notes", "Type",
  ];
  if (showActions) headers.push("Actions");

  const thead = document.getElementById("moves-table-header");
  if (thead) {
    thead.innerHTML = `<tr>${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr>`;
  }

  const tbody = document.getElementById("moves-table-body");
  if (!tbody) return;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding: var(--space-4); color: var(--color-text-muted);">No moves found.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries
    .map((entry) => buildRow(entry, equipmentById, showActions))
    .join("");
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire all Moves view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindMovesEvents() {
  let _state = { equipment: [], moves: [], locations: [] };

  const rerender = () => renderMovesView(_state);

  ["moves-search", "moves-equipment-filter", "moves-type-filter", "moves-destination-filter"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", rerender);
    });

  document.getElementById("moves-receipt-only")?.addEventListener("change", rerender);

  document.getElementById("moves-table-body")?.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-action="mark-received"]');
    if (!btn) return;

    const entry = (_state.moves ?? []).find((m) => m.id === btn.dataset.id);
    const eq = (_state.equipment ?? []).find((item) => item.id === entry?.equipment_id);

    document.dispatchEvent(
      new CustomEvent("modal:mark-received", {
        detail: { moveId: btn.dataset.id, equipmentName: eq ? equipmentLabel(eq) : "" },
      })
    );
  });

  return {
    syncState(state) {
      _state = state;
    },
  };
}
