// src/ui/modals.js — Condition history, correction, and correction-details dialogs.
//
// All three dialogs are driven purely by DOM custom events — no render cycle needed.
// This module wires listeners once at startup (bindModalsEvents) and keeps a local
// reference to state that it receives via syncState().
//
// Events consumed (from moves.js / operations.js):
//   "modal:condition-history"   → detail: { item }
//   "modal:correction"          → detail: { moveId }
//   "modal:correction-details"  → detail: { moveId, entry }
//
// Public surface:
//   bindModalsEvents({ repository, showToast }) — called once at startup

import { escapeHTML, formatDateTime } from "./computed.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function openDialog(id) {
  document.getElementById(id)?.showModal();
}

function closeDialog(id) {
  document.getElementById(id)?.close();
}

function show(id) {
  document.getElementById(id)?.classList.remove("is-hidden");
}

function hide(id) {
  document.getElementById(id)?.classList.add("is-hidden");
}

// ── Condition history modal ───────────────────────────────────────────────────
// Opened by clicking an equipment row's condition badge (operations.js dispatches
// "modal:condition-history" with the full equipment item).

function renderConditionHistory(item) {
  const listEl = document.getElementById("condition-history-list");
  if (!listEl) return;

  const history = Array.isArray(item?.conditionHistory) ? item.conditionHistory : [];

  if (!history.length) {
    listEl.innerHTML = `<li class="condition-history-empty">No condition history recorded.</li>`;
    return;
  }

  listEl.innerHTML = [...history]
    .sort((a, b) => Date.parse(b.ts ?? 0) - Date.parse(a.ts ?? 0))
    .map((entry) => {
      const grade  = entry.grade ?? entry.rating ?? "—";
      const ts     = entry.ts ?? entry.checkedAt ?? "";
      const by     = entry.checkedBy ?? "";
      const notes  = entry.notes ?? entry.conditionNotes ?? "";
      const contOk = entry.contentsOk;
      const funcOk = entry.functionalOk;

      const checks = [];
      if (contOk !== null && contOk !== undefined)
        checks.push(`Contents: ${contOk ? "✓ OK" : "✗ Issues"}`);
      if (funcOk !== null && funcOk !== undefined)
        checks.push(`Functional: ${funcOk ? "✓ OK" : "✗ Issues"}`);

      return `
        <li class="condition-history-entry">
          <div class="condition-history-meta">
            <strong>${escapeHTML(grade)}</strong>
            <span class="condition-history-date">${escapeHTML(formatDateTime(ts))}</span>
            ${by ? `<span class="condition-history-by">by ${escapeHTML(by)}</span>` : ""}
          </div>
          ${checks.length ? `<div class="condition-history-checks">${checks.map(escapeHTML).join(" · ")}</div>` : ""}
          ${notes ? `<div class="condition-history-notes">${escapeHTML(notes)}</div>` : ""}
        </li>`;
    })
    .join("");
}

function initConditionHistoryModal() {
  document.addEventListener("modal:condition-history", (e) => {
    const item = e.detail?.item;
    renderConditionHistory(item);
    openDialog("condition-history-modal");
  });

  document.getElementById("condition-history-close")
    ?.addEventListener("click", () => closeDialog("condition-history-modal"));

  // Click outside closes
  document.getElementById("condition-history-modal")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDialog("condition-history-modal");
    });
}

// ── Correction modal ──────────────────────────────────────────────────────────
// Opened from moves.js "Correct" button (admin only).
// Allows an admin to apply a non-destructive correction to any field on a move.
// The correction is stored in state.corrections and overlaid at render time.

const CORRECTION_FIELDS = [
  { checkId: "correction-field-shipping",  inputId: "correction-shipping-tracking", key: "shippingTracking" },
  { checkId: "correction-field-receipt",   inputId: "correction-receipt-date",       key: "receiptDate" },
  { checkId: "correction-field-from",      inputId: "correction-from-location",      key: "fromLocationId" },
  { checkId: "correction-field-to",        inputId: "correction-to-location",        key: "toLocationId" },
  { checkId: "correction-field-condition", inputId: "correction-condition-rating",   key: "condition" },
  { checkId: "correction-field-notes",     inputId: "correction-notes",              key: "notes" },
];

function populateCorrectionLocationSelects(state) {
  const locations = Array.isArray(state.locations) ? state.locations : [];
  const opts = ['<option value="">Select…</option>', ...locations.map((l) => `<option value="${escapeHTML(l.id)}">${escapeHTML(l.name)}</option>`)].join("");
  const fromEl = document.getElementById("correction-from-location");
  const toEl   = document.getElementById("correction-to-location");
  if (fromEl) fromEl.innerHTML = opts;
  if (toEl)   toEl.innerHTML   = opts;
}

function resetCorrectionForm(state) {
  document.getElementById("correction-form")?.reset();
  CORRECTION_FIELDS.forEach(({ inputId }) => hide(inputId));
  hide("correction-error");
  populateCorrectionLocationSelects(state);
}

function getCurrentMoveValues(move) {
  // Return current field values from the move for the "from" side of the correction
  return {
    shippingTracking: move?.shipping?.trackingNumber ?? "",
    receiptDate:      move?.receiptData?.received_at ?? move?.receivedAt ?? "",
    fromLocationId:   move?.fromLocation ?? "",
    toLocationId:     move?.toLocation ?? "",
    condition:        move?.receiptData?.condition_result ?? move?.condition?.rating ?? "",
    notes:            move?.notes ?? move?.text ?? "",
  };
}

function initCorrectionModal(getDeps) {
  let _openMoveId = null;

  // Wire each checkbox to show/hide its paired input
  CORRECTION_FIELDS.forEach(({ checkId, inputId }) => {
    document.getElementById(checkId)?.addEventListener("change", (e) => {
      e.target.checked ? show(inputId) : hide(inputId);
    });
  });

  // Open
  document.addEventListener("modal:correction", (e) => {
    const { state, repository } = getDeps();
    _openMoveId = e.detail?.moveId ?? null;

    resetCorrectionForm(state);

    // Label the target move
    const move = (state.moves ?? []).find((m) => m.id === _openMoveId);
    const equipment = (state.equipment ?? []).find((eq) => eq.id === move?.equipmentId);
    const label = equipment
      ? [equipment.name, equipment.model, equipment.serialNumber].filter(Boolean).join(" — ")
      : "Unknown equipment";

    const labelEl = document.getElementById("correction-target-label");
    if (labelEl) {
      labelEl.textContent = move
        ? `Move on ${formatDateTime(move.timestamp)} — ${label}`
        : "Move not found";
    }

    openDialog("correction-modal");
  });

  // Cancel / close
  document.getElementById("correction-cancel")
    ?.addEventListener("click", () => closeDialog("correction-modal"));

  document.getElementById("correction-modal")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDialog("correction-modal");
    });

  // Submit
  document.getElementById("correction-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { state, repository, showToast } = getDeps();

      const errorEl = document.getElementById("correction-error");

      const reason = (document.getElementById("correction-reason")?.value ?? "").trim();
      if (!reason) {
        if (errorEl) { errorEl.textContent = "Reason is required."; show("correction-error"); }
        return;
      }

      const move = (state.moves ?? []).find((m) => m.id === _openMoveId);
      const currentVals = getCurrentMoveValues(move);

      // Build changes object — only include checked fields
      const changes = {};
      CORRECTION_FIELDS.forEach(({ checkId, inputId, key }) => {
        const isChecked = document.getElementById(checkId)?.checked;
        if (!isChecked) return;
        const newVal = (document.getElementById(inputId)?.value ?? "").trim();
        changes[key] = { from: currentVals[key] ?? "", to: newVal };
      });

      if (!Object.keys(changes).length) {
        if (errorEl) { errorEl.textContent = "Select at least one field to correct."; show("correction-error"); }
        return;
      }

      hide("correction-error");

      const payload = {
        id:         crypto.randomUUID(),
        ts:         new Date().toISOString(),
        targetType: "move",
        targetId:   _openMoveId,
        reason,
        changes,
        createdBy:  "Admin",
      };

      try {
        await repository.addCorrection(payload);
        showToast("Correction saved.", "success");
        closeDialog("correction-modal");
      } catch (err) {
        showToast(`Failed to save correction: ${err.message}`, "error");
      }
    });
}

// ── Correction details modal ──────────────────────────────────────────────────
// Opened from moves.js "View corrections" button.
// Shows the audit trail of all corrections applied to a specific move.

const FIELD_LABELS = {
  shippingTracking: "Tracking number",
  receiptDate:      "Receipt date",
  fromLocationId:   "From location",
  toLocationId:     "To location",
  condition:        "Condition rating",
  notes:            "Notes",
};

function renderCorrectionDetails(corrections) {
  const listEl = document.getElementById("correction-details-list");
  if (!listEl) return;

  if (!corrections?.length) {
    listEl.innerHTML = `<li class="condition-history-empty">No corrections recorded.</li>`;
    return;
  }

  listEl.innerHTML = [...corrections]
    .sort((a, b) => Date.parse(b.ts ?? 0) - Date.parse(a.ts ?? 0))
    .map((c) => {
      const changeItems = Object.entries(c.changes ?? {}).map(([field, v]) => {
        const label = FIELD_LABELS[field] ?? field;
        return `<div class="correction-change">
          <span class="correction-field">${escapeHTML(label)}</span>
          <span class="correction-from">${escapeHTML(v.from ?? "—")}</span>
          <span class="correction-arrow">→</span>
          <span class="correction-to">${escapeHTML(v.to ?? "—")}</span>
        </div>`;
      });

      return `
        <li class="condition-history-entry">
          <div class="condition-history-meta">
            <span class="condition-history-date">${escapeHTML(formatDateTime(c.ts ?? ""))}</span>
            ${c.createdBy ? `<span class="condition-history-by">by ${escapeHTML(c.createdBy)}</span>` : ""}
          </div>
          <div class="correction-reason">${escapeHTML(c.reason ?? "")}</div>
          ${changeItems.length ? `<div class="correction-changes">${changeItems.join("")}</div>` : ""}
        </li>`;
    })
    .join("");
}

function initCorrectionDetailsModal() {
  document.addEventListener("modal:correction-details", (e) => {
    const { moveId, entry } = e.detail ?? {};
    renderCorrectionDetails(entry?._corrections ?? []);
    openDialog("correction-details-modal");
  });

  document.getElementById("correction-details-close")
    ?.addEventListener("click", () => closeDialog("correction-details-modal"));

  document.getElementById("correction-details-modal")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDialog("correction-details-modal");
    });
}

// ── Main binding ──────────────────────────────────────────────────────────────

/**
 * Wire all modal event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindModalsEvents({ repository, showToast }) {
  let _state = { equipment: [], moves: [], corrections: [], locations: [] };

  const getDeps = () => ({ state: _state, repository, showToast });

  initConditionHistoryModal();
  initCorrectionModal(getDeps);
  initCorrectionDetailsModal();

  return {
    syncState(state) {
      _state = state;
    },
  };
}
