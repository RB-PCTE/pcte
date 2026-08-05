// src/ui/modals.js — the mark-received dialog.
//
// Step 7a removed the other three dialogs this module used to own. The
// correction and correction-details dialogs went with the corrections feature
// (no backend endpoint, and the payload never matched what was stored); the
// condition-history dialog went because condition is now a single current value
// on the equipment row, not a history — it's shown by the badge in the
// equipment table instead.
//
// Events consumed (from moves.js):
//   "modal:mark-received"  → detail: { moveId, equipmentName }
//
// Public surface:
//   bindModalsEvents({ repository, showToast }) — called once at startup

import { escapeHTML } from "./computed.js";
import { CONDITION, options } from "../enums.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(id) {
  document.getElementById(id)?.classList.remove("is-hidden");
}

function hide(id) {
  document.getElementById(id)?.classList.add("is-hidden");
}

/** Fill the condition select with the three condition_assessment values. */
function populateConditionSelect() {
  const el = document.getElementById("receipt-condition-result");
  if (!el) return;
  el.innerHTML = [
    '<option value="">Select…</option>',
    ...options(CONDITION).map(
      (o) => `<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`
    ),
  ].join("");
}

// ── Mark received ─────────────────────────────────────────────────────────────

function initMarkReceivedModal({ repository, showToast }) {
  const dialog = document.getElementById("mark-received-modal");

  document.addEventListener("modal:mark-received", (e) => {
    const { moveId, equipmentName } = e.detail ?? {};

    const moveIdEl = document.getElementById("receipt-move-id");
    if (moveIdEl) moveIdEl.value = moveId ?? "";

    const nameEl = document.getElementById("receipt-equipment-name");
    if (nameEl) nameEl.textContent = equipmentName ?? "";

    document.getElementById("mark-received-form")?.reset();
    populateConditionSelect();
    hide("receipt-error");

    dialog?.showModal();
  });

  document.getElementById("receipt-cancel-btn")
    ?.addEventListener("click", () => dialog?.close());

  dialog?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  document.getElementById("mark-received-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const moveId = document.getElementById("receipt-move-id")?.value ?? "";
    const conditionResult = document.getElementById("receipt-condition-result")?.value ?? "";
    const conditionNotes = (document.getElementById("receipt-condition-notes")?.value ?? "").trim();
    const errorEl = document.getElementById("receipt-error");

    if (!conditionResult) {
      if (errorEl) errorEl.textContent = "Condition on arrival is required.";
      show("receipt-error");
      return;
    }
    hide("receipt-error");

    const submitBtn = document.getElementById("receipt-submit-btn");
    const originalLabel = submitBtn?.textContent ?? "Confirm receipt";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";
    }

    try {
      // received_by is the authenticated caller, set server-side. The request
      // model forbids unknown fields, so sending it would be a 422.
      await repository.recordReceipt(moveId, {
        condition_result: conditionResult,
        condition_notes:  conditionNotes || null,
      });

      showToast("Move marked as received.", "success");
      dialog?.close();
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message;
      show("receipt-error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });
}

// ── Main binding ──────────────────────────────────────────────────────────────

/**
 * Wire all modal event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindModalsEvents({ repository, showToast }) {
  initMarkReceivedModal({ repository, showToast });

  return {
    syncState() {
      // No modal currently needs a state snapshot — moves.js passes everything
      // the receipt dialog needs in the event detail. Kept so main.js's
      // controller wiring stays uniform across modules.
    },
  };
}
