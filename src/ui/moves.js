// src/ui/moves.js — Moves Log view: filter bar, table, mark-received, soft-delete.
//
// Public surface:
//   renderMovesView(state, { isAdmin })         — called on every state:changed
//   bindMovesEvents({ repository, showToast })  — called once at startup

import {
  escapeHTML,
  formatDateTime,
  conditionBadgeClass,
} from "./computed.js";

import {
  getFilteredMoves,
  readMovesFilters,
  isEntryDeleted,
  isMoveAwaitingReceipt,
} from "./filters.js";

import { moveTypeOptions } from "../model.js";
import { supabase } from "../supabaseClient.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOVE_RECEIPT_ENDPOINT =
  "https://eugdravtvewpnwkkpkzl.supabase.co/functions/v1/move_receipt";

// ── Helpers ───────────────────────────────────────────────────────────────────

function opt(value, label) {
  return `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`;
}

function populateSelect(id, options, current = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = el.value || current;
  el.innerHTML = options.join("");
  if ([...el.options].some((o) => o.value === prev)) el.value = prev;
}

// ── Filter dropdowns ──────────────────────────────────────────────────────────

function renderMovesFilterSelects(state) {
  const equipment = Array.isArray(state.equipment) ? state.equipment : [];
  const locations  = Array.isArray(state.locations)  ? state.locations  : [];

  // Equipment
  populateSelect("moves-equipment-filter", [
    opt("all", "All equipment"),
    ...equipment.map((item) => {
      const label = [item.name, item.model, item.serialNumber].filter(Boolean).join(" — ");
      return opt(item.id, label);
    }),
  ]);

  // Move type
  populateSelect("moves-type-filter", [
    opt("all", "All types"),
    ...moveTypeOptions
      .filter((t) => t.value !== "all")
      .map((t) => opt(t.value, t.label)),
  ]);

  // Destination
  populateSelect("moves-destination-filter", [
    opt("All locations", "All destinations"),
    ...locations.map((l) => opt(l.id, l.name)),
  ]);
}

// ── Row builders ──────────────────────────────────────────────────────────────

function getTypeLabel(type) {
  const found = moveTypeOptions.find((t) => t.value === type);
  return found ? found.label : (type ?? "Move");
}

function getStatusChangeLabel(entry) {
  const from = entry.statusFrom?.trim() ?? "";
  const to   = entry.statusTo?.trim()   ?? "";
  if (from && to && from !== to) return `${from} → ${to}`;
  if (to) return to;
  return "—";
}

function getReceiptDisplay(entry) {
  // New Supabase model: receiptData comes from move_receipts join
  if (entry.receiptData?.received_at) {
    return `Received ${formatDateTime(entry.receiptData.received_at)}`;
  }
  if (isMoveAwaitingReceipt(entry)) {
    return "Awaiting receipt";
  }
  return "—";
}

function buildConditionPill(entry) {
  // Use receiptData condition if available (new model), fall back to inline condition
  const rating =
    entry.receiptData?.condition_result ??
    entry.condition?.rating ??
    null;

  if (!rating) {
    return '<span class="condition-badge condition-badge--neutral">Not checked</span>';
  }

  const cls = conditionBadgeClass(rating);
  return `<span class="condition-badge ${cls}">${escapeHTML(rating)}</span>`;
}

function buildNotesCell(entry) {
  const parts = [];
  const baseNotes = entry.notes?.trim() || entry.text?.trim() || "";
  if (baseNotes) parts.push(`<div>${escapeHTML(baseNotes)}</div>`);

  // Corrections applied by filters.js applyCorrectionsToMoves
  const corrections = entry._corrections ?? [];
  if (corrections.length) {
    const items = corrections.map((c) => {
      const changes = Object.entries(c.changes ?? {})
        .map(([f, v]) => `${f}: ${v.from ?? "—"} → ${v.to ?? "—"}`)
        .join("; ");
      return `<li><strong>${escapeHTML(c.ts ?? "")}</strong> — ${escapeHTML(c.reason ?? "No reason")}${changes ? ` (${escapeHTML(changes)})` : ""}</li>`;
    }).join("");
    parts.push(`<div class="moves-corrections"><p>Corrections</p><ul>${items}</ul></div>`);
  }

  // Soft-delete reason
  if (entry.deletedAt) {
    const meta = `Deleted ${formatDateTime(entry.deletedAt)}${entry.deleteReason ? ` — ${entry.deleteReason}` : ""}`;
    parts.push(`<div class="moves-note-meta moves-note-meta--deleted">${escapeHTML(meta)}</div>`);
  }

  return parts.length ? parts.join("") : "—";
}

function buildEquipmentLabel(entry, equipmentById) {
  const eq = equipmentById.get(String(entry.equipmentId ?? ""));
  if (eq) {
    return [eq.name, eq.model, eq.serialNumber].filter(Boolean).join(" — ");
  }
  // Fall back to snapshot stored on move (if present)
  const snap = entry.equipmentSnapshot;
  if (snap?.name) {
    return [snap.name, snap.model, snap.serialNumber].filter(Boolean).join(" — ");
  }
  return "Unknown equipment";
}

// Per-move in-flight receipt state (cleared on re-render)
const _receiptStatus = new Map(); // moveId → { state, message }

function buildActionsCell(entry, isAdmin) {
  const actions = [];
  const awaiting = isMoveAwaitingReceipt(entry) && !isEntryDeleted(entry);

  if (awaiting) {
    const rs = _receiptStatus.get(entry.id);
    const isSending = rs?.state === "sending";
    actions.push(
      `<button class="btn btn-sm" type="button" data-action="mark-received" data-id="${escapeHTML(entry.id)}" ${isSending ? "disabled" : ""}>
        ${isSending ? "Saving…" : "Mark received"}
      </button>`
    );
    if (rs?.message) {
      actions.push(`<span class="field-note">${escapeHTML(rs.message)}</span>`);
    }
  }

  if (isAdmin && !isEntryDeleted(entry)) {
    actions.push(
      `<button class="btn btn-sm btn-secondary" type="button" data-action="add-correction" data-id="${escapeHTML(entry.id)}">Correct</button>`
    );
  }

  if ((entry._corrections ?? []).length) {
    actions.push(
      `<button class="btn btn-sm btn-secondary" type="button" data-action="view-corrections" data-id="${escapeHTML(entry.id)}">View corrections</button>`
    );
  }

  if (isAdmin && !isEntryDeleted(entry)) {
    actions.push(
      `<button class="btn btn-sm btn-danger" type="button" data-action="delete-move" data-id="${escapeHTML(entry.id)}">Delete</button>`
    );
  }

  return actions.join(" ");
}

function buildRow(entry, equipmentById, locById, isAdmin, showActions) {
  const deleted = isEntryDeleted(entry);
  const corrections = entry._corrections ?? [];
  const fromLocation = locById.get(entry.fromLocationId) ?? "—";
  const toLocation   = locById.get(entry.toLocationId)   ?? "—";

  return `
    <tr class="${deleted ? "moves-row--deleted" : ""}">
      <td>${escapeHTML(formatDateTime(entry.timestamp))}</td>
      <td>${escapeHTML(buildEquipmentLabel(entry, equipmentById))}</td>
      <td>${escapeHTML(fromLocation)}</td>
      <td>${escapeHTML(toLocation)}</td>
      <td>${escapeHTML(getStatusChangeLabel(entry))}</td>
      <td>${escapeHTML(getReceiptDisplay(entry))}</td>
      <td>${buildConditionPill(entry)}</td>
      <td>${buildNotesCell(entry)}</td>
      <td>
        ${escapeHTML(getTypeLabel(entry.type))}
        ${corrections.length ? `<span class="moves-corrected-badge">Corrected</span>` : ""}
      </td>
      ${showActions ? `<td>${buildActionsCell(entry, isAdmin)}</td>` : ""}
    </tr>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

/**
 * Re-render the Moves Log view.
 * @param {object}  state
 * @param {object}  [opts]
 * @param {boolean} [opts.isAdmin=false]
 */
export function renderMovesView(state, { isAdmin = false } = {}) {
  renderMovesFilterSelects(state);

  const filters      = readMovesFilters();
  const corrected    = getFilteredMoves(state, filters);
  const equipmentById = new Map((state.equipment ?? []).map((eq) => [String(eq.id), eq]));
  const locById = new Map((state.locations ?? []).map((l) => [l.id, l.name]));

  const showActions = isAdmin || corrected.some((e) => isMoveAwaitingReceipt(e) && !isEntryDeleted(e));

  // Header
  const headers = [
    "Timestamp", "Equipment", "From", "To",
    "Status change", "Receipt", "Condition", "Notes", "Type",
  ];
  if (showActions) headers.push("Actions");

  const thead = document.getElementById("moves-table-header");
  if (thead) {
    thead.innerHTML = `<tr>${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr>`;
  }

  // Body
  const tbody = document.getElementById("moves-table-body");
  if (!tbody) return;

  if (!corrected.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding: var(--space-4); color: var(--color-text-muted);">No moves found.</td></tr>`;
    return;
  }

  tbody.innerHTML = corrected
    .map((entry) => buildRow(entry, equipmentById, locById, isAdmin, showActions))
    .join("");
}

// ── Mark received ─────────────────────────────────────────────────────────────

async function handleMarkReceived(moveId, state, { showToast, repository, rerenderFn }) {
  if (_receiptStatus.get(moveId)?.state === "sending") return;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    showToast("Please sign in to receipt a move.", "error");
    return;
  }

  _receiptStatus.set(moveId, { state: "sending", message: "Saving…" });
  rerenderFn();

  try {
    const receivedAt = new Date().toISOString();
    const res = await fetch(MOVE_RECEIPT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        move_id: moveId,
        received_at: receivedAt,
        condition_result: "pass",
        condition_notes: "",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    // Update local state
    repository.recordReceipt(moveId, {
      receivedAt,
      conditionResult: "pass",
      conditionNotes: "",
    });

    _receiptStatus.set(moveId, { state: "success", message: "Received ✓" });
    showToast("Move marked as received.", "success");
  } catch (err) {
    _receiptStatus.set(moveId, { state: "error", message: `Error: ${err.message}` });
    showToast(`Receipt failed: ${err.message}`, "error");
  } finally {
    rerenderFn();
  }
}

// ── Soft delete ───────────────────────────────────────────────────────────────

function handleSoftDelete(moveId, state, { showToast, repository }) {
  const entry = (state.moves ?? []).find((m) => m.id === moveId);
  if (!entry || isEntryDeleted(entry)) return;

  const reason = window.prompt("Reason for deleting this move entry:");
  if (!reason?.trim()) return;

  repository.mutate((draft) => {
    const move = draft.moves.find((m) => m.id === moveId);
    if (move) {
      move.deletedAt    = new Date().toISOString();
      move.deletedBy    = "Admin";
      move.deleteReason = reason.trim();
    }
  });
  showToast("Move entry deleted.", "success");
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire all Moves view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state, opts): void }}
 */
export function bindMovesEvents({ repository, showToast }) {
  let _state  = { equipment: [], moves: [], corrections: [], locations: [] };
  let _isAdmin = false;

  function rerender() {
    renderMovesView(_state, { isAdmin: _isAdmin });
  }

  // Filter controls → re-render
  [
    "moves-search",
    "moves-equipment-filter",
    "moves-type-filter",
    "moves-destination-filter",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.tagName === "INPUT" ? "input" : "change", rerender);
  });

  ["moves-receipt-only", "moves-show-deleted"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", rerender);
  });

  // Table action buttons (delegated)
  document.getElementById("moves-table-body")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === "mark-received") {
      await handleMarkReceived(id, _state, { showToast, repository, rerenderFn: rerender });
    }

    if (action === "add-correction") {
      document.dispatchEvent(
        new CustomEvent("modal:correction", { detail: { moveId: id } })
      );
    }

    if (action === "view-corrections") {
      const entry = (_state.moves ?? []).find((m) => m.id === id);
      document.dispatchEvent(
        new CustomEvent("modal:correction-details", { detail: { moveId: id, entry } })
      );
    }

    if (action === "delete-move") {
      handleSoftDelete(id, _state, { showToast, repository });
    }
  });

  return {
    syncState(state, { isAdmin = false } = {}) {
      _state   = state;
      _isAdmin = isAdmin;
    },
  };
}
