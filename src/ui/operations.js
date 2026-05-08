// src/ui/operations.js — Operations view: equipment table, location summary, move form.
//
// Public surface:
//   renderOperationsView(state)          — called on every state:changed
//   bindOperationsEvents({ repository, showToast }) — called once at startup

import {
  escapeHTML,
  formatDate,
  formatDateTime,
  getAgeLabel,
  getCalibrationInfo,
  getSubscriptionInfo,
  getEffectiveStatus,
  getEquipmentLocationDisplay,
  getLatestConditionForItem,
  conditionBadgeClass,
  statusPillClass,
  healthPillClass,
} from "./computed.js";

import { getFilteredEquipment } from "./filters.js";
import { renderStats } from "./stats.js";

import {
  editableStatusOptions,
  statusFilterOptions,
  calibrationFilterOptions,
  subscriptionFilterOptions,
  physicalLocations,
  moveConditionExemptStatuses,
} from "../model.js";

import { supabase, getSupabaseLocationID } from "../supabaseClient.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOVE_CREATE_ENDPOINT =
  "https://eugdravtvewpnwkkpkzl.supabase.co/functions/v1/move_create";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Set innerHTML of an element by ID safely. */
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Build an <option> string. */
function opt(value, label, selected = false) {
  return `<option value="${escapeHTML(value)}"${selected ? " selected" : ""}>${escapeHTML(label)}</option>`;
}

/** Populate a <select> from an array, preserving the current value. */
function populateSelect(id, options, current = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = el.value || current;
  el.innerHTML = options.join("");
  if ([...el.options].some((o) => o.value === prev)) el.value = prev;
}

// ── Filter dropdowns ──────────────────────────────────────────────────────────

function renderFilterSelects(state) {
  const locations = Array.isArray(state.locations) ? state.locations : [];

  // Location filter
  populateSelect("location-filter", [
    opt("All locations", "All locations"),
    ...locations.map((l) => opt(l, l)),
  ]);

  // Status filter
  populateSelect("status-filter", [
    opt("All statuses", "All statuses"),
    ...statusFilterOptions.map((s) => opt(s, s)),
  ]);

  // Calibration filter
  populateSelect("calibration-filter", calibrationFilterOptions.map((s) => opt(s, s)));

  // Subscription filter
  populateSelect("subscription-filter", subscriptionFilterOptions.map((s) => opt(s, s)));
}

// ── Move form selects ─────────────────────────────────────────────────────────

function renderMoveFormSelects(state) {
  const equipment = Array.isArray(state.equipment) ? state.equipment : [];
  const locations  = Array.isArray(state.locations)  ? state.locations  : [];

  // Equipment dropdown
  populateSelect("move-equipment", [
    opt("", "Select equipment…"),
    ...equipment.map((item) => {
      const label = [item.name, item.model, item.serialNumber]
        .filter(Boolean)
        .join(" — ");
      return opt(item.id, label);
    }),
  ]);

  // Destination dropdown (locations only, no "all" option)
  populateSelect("move-location", [
    opt("", "Select location…"),
    ...locations.map((l) => opt(l, l)),
  ]);

  // Status-after-move
  populateSelect("move-status", [
    opt("", "No change"),
    ...editableStatusOptions.map((s) => opt(s, s)),
  ]);
}

// ── Equipment table ───────────────────────────────────────────────────────────

function buildConditionCell(item) {
  const cond = getLatestConditionForItem(item);
  const rating   = cond?.grade ?? "Not checked";
  const checkedAt = cond?.checkedAt ? formatDateTime(cond.checkedAt) : "—";
  const cls = conditionBadgeClass(rating);
  return `
    <div class="status-with-meta">
      <button
        class="condition-badge ${cls}"
        type="button"
        data-action="view-condition-history"
        data-equipment-id="${escapeHTML(item.id)}"
        title="Last checked: ${escapeHTML(checkedAt)}"
      >${escapeHTML(rating)}</button>
      <small class="status-meta">Last checked: ${escapeHTML(checkedAt)}</small>
    </div>`;
}

function buildTableRow(item, moves, now) {
  const effectiveStatus  = getEffectiveStatus(item, moves);
  const locationDisplay  = getEquipmentLocationDisplay(item, moves);
  const calibInfo        = getCalibrationInfo(item, now);
  const subInfo          = getSubscriptionInfo(item, now);
  const ageLabel         = getAgeLabel(item.purchaseDate, now);

  // Calibration cell
  const calMeta = calibInfo.dueDate
    ? `Due ${formatDate(calibInfo.dueDate)}`
    : calibInfo.status === "Unknown" ? "No calibration date recorded" : "Not required";
  const calCell = `<span class="pill ${healthPillClass(calibInfo.status)}" title="${escapeHTML(calMeta)}">${escapeHTML(calibInfo.status)}</span>`;

  // Subscription cell
  const subMeta = subInfo.renewalDate
    ? `Renewal ${formatDate(subInfo.renewalDate)}`
    : subInfo.status === "Unknown" ? "No renewal date recorded" : "Not required";
  const subDateLabel = subInfo.renewalDate ? formatDate(subInfo.renewalDate) : "";
  const subCell = `
    <div class="status-with-meta">
      <span class="pill ${healthPillClass(subInfo.status)}" title="${escapeHTML(subMeta)}">${escapeHTML(subInfo.status)}</span>
      ${subDateLabel ? `<small class="status-meta">${escapeHTML(subDateLabel)}</small>` : ""}
    </div>`;

  return `
    <tr data-equipment-id="${escapeHTML(item.id)}">
      <td>
        <div class="status-with-meta">
          <strong>${escapeHTML(item.name)}</strong>
          <small class="status-meta">${escapeHTML(ageLabel)}</small>
        </div>
      </td>
      <td>${escapeHTML(item.model || "—")}</td>
      <td>${escapeHTML(item.serialNumber || "—")}</td>
      <td>
        <span class="pill ${statusPillClass(effectiveStatus)}">${escapeHTML(effectiveStatus)}</span>
      </td>
      <td>${escapeHTML(locationDisplay.text)}</td>
      <td>${calCell}</td>
      <td>${subCell}</td>
      <td>${buildConditionCell(item)}</td>
      <td>${escapeHTML(item.lastMoved || "—")}</td>
    </tr>`;
}

function renderEquipmentTable(filteredEquipment, state, now) {
  const tbody = document.getElementById("equipment-table");
  if (!tbody) return;

  if (!filteredEquipment.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: var(--space-4); color: var(--color-text-muted);">No equipment matches the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredEquipment
    .map((item) => buildTableRow(item, state.moves, now))
    .join("");
}

// ── Location summary ──────────────────────────────────────────────────────────

function renderLocationSummary(state) {
  const container = document.getElementById("location-summary");
  if (!container) return;

  const locations = Array.isArray(state.locations) ? state.locations : [];
  const equipment  = Array.isArray(state.equipment)  ? state.equipment  : [];

  if (!locations.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = locations
    .map((location) => {
      const items = equipment.filter((item) => item.location === location);
      const listItems = items.length
        ? items.map((item) => `
            <li class="summary-item">
              <span class="summary-item-name">${escapeHTML(item.name)}</span>
              <small class="summary-item-meta">${escapeHTML(item.lastMoved || "—")}</small>
            </li>`).join("")
        : '<li class="summary-item summary-empty">No equipment here.</li>';

      return `
        <article class="location-card" tabindex="0" data-location="${escapeHTML(location)}">
          <div class="location-card-header">
            <h4>${escapeHTML(location)}</h4>
            <span class="location-card-count">${items.length}</span>
          </div>
          <ul class="summary-list">${listItems}</ul>
        </article>`;
    })
    .join("");
}

// ── Move form — conditional UI ────────────────────────────────────────────────

/** True when the move is between two different physical offices (requires shipping). */
function isInterOfficeMove(fromLocation, toLocation) {
  const from = String(fromLocation ?? "").trim();
  const to   = String(toLocation   ?? "").trim();
  return (
    from &&
    to &&
    from !== to &&
    physicalLocations.includes(from) &&
    physicalLocations.includes(to)
  );
}

/** True when the destination status means a condition check isn't required. */
function isConditionExempt(statusValue) {
  return moveConditionExemptStatuses.has(statusValue);
}

/** Derive the edge-function move_type from from/to locations. */
function deriveMoveType(fromLocation, toLocation) {
  const to   = String(toLocation   ?? "").trim();
  const from = String(fromLocation ?? "").trim();
  if (to === "On hire")   return "hire_out";
  if (from === "On hire") return "hire_return";
  return "office_transfer";
}

/** Show or hide the shipping section based on the current form values. */
function syncShippingSection(state) {
  const equipmentId = document.getElementById("move-equipment")?.value ?? "";
  const toLocation  = document.getElementById("move-location")?.value  ?? "";
  const item = (state.equipment ?? []).find((e) => e.id === equipmentId);
  const section = document.getElementById("move-shipping-section");
  if (!section) return;

  const required = isInterOfficeMove(item?.location, toLocation);
  section.classList.toggle("is-hidden", !required);

  // Pre-fill ship date with today if blank
  if (required) {
    const shipDateEl = document.getElementById("move-shipping-ship-date");
    if (shipDateEl && !shipDateEl.value) {
      shipDateEl.value = formatDate(new Date());
    }
  }
}

/** Show or hide the condition check section based on equipment + status selection. */
function syncConditionSection(state) {
  const equipmentId  = document.getElementById("move-equipment")?.value ?? "";
  const statusValue  = document.getElementById("move-status")?.value    ?? "";
  const section      = document.getElementById("move-condition-section");
  const exemptNote   = document.getElementById("move-condition-exempt-note");
  if (!section) return;

  const item = (state.equipment ?? []).find((e) => e.id === equipmentId);
  if (!item) {
    section.classList.add("is-hidden");
    return;
  }

  const effectiveStatus = statusValue || item.status;
  const exempt = isConditionExempt(effectiveStatus);

  section.classList.remove("is-hidden");
  exemptNote?.classList.toggle("is-hidden", !exempt);

  // Disable condition inputs when exempt
  ["move-condition-rating", "move-contents-ok", "move-functional-ok"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = exempt;
  });
  const notesEl = document.getElementById("move-condition-notes");
  if (notesEl) notesEl.disabled = exempt;
}

// ── Move form — validation ─────────────────────────────────────────────────

function validateShipping() {
  const carrier  = document.getElementById("move-shipping-carrier")?.value.trim()  ?? "";
  const tracking = document.getElementById("move-shipping-tracking")?.value.trim() ?? "";
  const validEl  = document.getElementById("move-shipping-validation");
  const section  = document.getElementById("move-shipping-section");

  if (section?.classList.contains("is-hidden")) return true;

  const missing = [];
  if (!carrier)  missing.push(document.getElementById("move-shipping-carrier"));
  if (!tracking) missing.push(document.getElementById("move-shipping-tracking"));

  missing.forEach((el) => {
    el?.classList.add("field-input-error");
    el?.setAttribute("aria-invalid", "true");
  });

  const invalid = document.querySelectorAll("#move-shipping-section .field-input-error");
  // Clear errors on valid fields
  document.querySelectorAll("#move-shipping-section input, #move-shipping-section select")
    .forEach((el) => {
      if (!missing.includes(el)) {
        el.classList.remove("field-input-error");
        el.removeAttribute("aria-invalid");
      }
    });

  if (validEl) {
    validEl.textContent = missing.length
      ? "Carrier and tracking number are required for inter-office moves."
      : "";
    validEl.classList.toggle("is-hidden", !missing.length);
  }

  return missing.length === 0;
}

function clearShippingValidation() {
  document.querySelectorAll("#move-shipping-section .field-input-error")
    .forEach((el) => {
      el.classList.remove("field-input-error");
      el.removeAttribute("aria-invalid");
    });
  const validEl = document.getElementById("move-shipping-validation");
  if (validEl) { validEl.textContent = ""; validEl.classList.add("is-hidden"); }
}

// ── Move form — submit ────────────────────────────────────────────────────────

let _isSaving = false;

function setSubmitSaving(isSaving) {
  const btn = document.getElementById("move-submit");
  if (!btn) return;
  btn.disabled   = isSaving;
  btn.textContent = isSaving ? "Saving…" : "Record move";
}

function setSubmitStatus(message, type = "info") {
  const el = document.getElementById("move-submit-status");
  if (!el) return;
  el.textContent = message;
  el.className = `move-submit-status field-${type}`;
  el.classList.toggle("is-hidden", !message);
}

function resetMoveForm() {
  const form = document.getElementById("move-form");
  if (!form) return;
  form.reset();
  document.getElementById("move-shipping-section")?.classList.add("is-hidden");
  document.getElementById("move-condition-section")?.classList.add("is-hidden");
  clearShippingValidation();
  setSubmitStatus("");
}

async function handleMoveSubmit(event, state, { showToast, repository }) {
  event.preventDefault();
  if (_isSaving) return;

  const equipmentId = document.getElementById("move-equipment")?.value ?? "";
  const toLocation  = document.getElementById("move-location")?.value  ?? "";
  const statusValue = document.getElementById("move-status")?.value    ?? "";
  const notes       = document.getElementById("move-notes")?.value.trim() ?? "";
  const carrier     = document.getElementById("move-shipping-carrier")?.value.trim()  ?? "";
  const tracking    = document.getElementById("move-shipping-tracking")?.value.trim() ?? "";
  const shipDate    = document.getElementById("move-shipping-ship-date")?.value ?? "";
  const etaDate     = document.getElementById("move-shipping-eta-date")?.value  ?? "";
  const condRating  = document.getElementById("move-condition-rating")?.value   ?? "";
  const contentsOk  = document.getElementById("move-contents-ok")?.value        ?? "";
  const funcOk      = document.getElementById("move-functional-ok")?.value      ?? "";
  const condNotes   = document.getElementById("move-condition-notes")?.value.trim() ?? "";

  const item = (state.equipment ?? []).find((e) => e.id === equipmentId);
  if (!item) {
    showToast("Select a piece of equipment first.", "error");
    return;
  }
  if (!toLocation) {
    showToast("Select a destination.", "error");
    return;
  }

  // Shipping validation
  const shippingSection = document.getElementById("move-shipping-section");
  const needsShipping   = !shippingSection?.classList.contains("is-hidden");
  if (needsShipping && !validateShipping()) {
    showToast("Add carrier and tracking number before saving.", "error");
    document.getElementById("move-shipping-carrier")?.focus();
    return;
  }

  // Auth check
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError || !authData.session) {
    showToast("Please sign in to record a move.", "error");
    return;
  }

  _isSaving = true;
  setSubmitSaving(true);
  setSubmitStatus("Submitting…");

  try {
    const moveType = deriveMoveType(item.location, toLocation);

    const payload = {
      equipment_id:     equipmentId,
      from_location_id: await getSupabaseLocationID(item.location),
      to_location_id:   await getSupabaseLocationID(toLocation),
      move_type:        moveType,
      moved_at:         shipDate ? new Date(`${shipDate}T00:00:00.000Z`).toISOString() : new Date().toISOString(),
      notes:            notes || null,
      carrier:          carrier  || null,
      tracking_number:  tracking || null,
      booked_at:        new Date().toISOString(),
    };

    const res = await fetch(MOVE_CREATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    let body = null;
    try { body = await res.json(); } catch { /* empty body */ }

    if (!res.ok) {
      const msg = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      setSubmitStatus(`Error: ${msg}`, "error");
      showToast(`Move failed: ${msg}`, "error");
      return;
    }

    const moveId = body?.move?.id ?? body?.id ?? crypto.randomUUID();

    // Record in local state so the table updates immediately
    repository.recordMove({
      id:              moveId,
      equipmentId:     equipmentId,
      equipmentSnapshot: { name: item.name, model: item.model, serialNumber: item.serialNumber },
      type:            "move",
      fromLocation:    item.location,
      toLocation:      toLocation,
      statusTo:        statusValue || "Available",
      condition: condRating ? {
        rating:      condRating,
        contentsOk:  contentsOk === "Yes" ? true : contentsOk === "No" ? false : null,
        functionalOk: funcOk    === "Yes" ? true : funcOk    === "No" ? false : null,
        notes:       condNotes,
        checkedAt:   new Date().toISOString(),
      } : null,
      text:      `${item.name} moved to ${toLocation}`,
      timestamp: new Date().toISOString(),
    });

    resetMoveForm();
    setSubmitStatus(`Move recorded.`);
    showToast("Move recorded.", "success");

    // Briefly highlight the moved equipment row
    const row = document.querySelector(`tr[data-equipment-id="${CSS.escape(equipmentId)}"]`);
    if (row) {
      row.classList.add("equipment-row-highlight");
      setTimeout(() => row.classList.remove("equipment-row-highlight"), 2000);
    }

  } catch (err) {
    console.error("Move submit error:", err);
    setSubmitStatus(`Error: ${err.message}`, "error");
    showToast("Something went wrong. Check your connection.", "error");
  } finally {
    _isSaving = false;
    setSubmitSaving(false);
  }
}

// ── Main render entry point ───────────────────────────────────────────────────

/**
 * Re-render everything in the Operations view.
 * Called from main.js on every state:changed event.
 * @param {object} state - full app state from repository.getState()
 */
export function renderOperationsView(state) {
  const now      = new Date();
  const filtered = getFilteredEquipment(state);

  renderStats(filtered, state.moves, now);
  renderFilterSelects(state);
  renderMoveFormSelects(state);
  renderEquipmentTable(filtered, state, now);
  renderLocationSummary(state);
}

// ── Event binding (called once at startup) ────────────────────────────────────

/**
 * Wire all Operations view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 */
export function bindOperationsEvents({ repository, showToast }) {
  // Hold a reference to latest state for event handlers
  let _state = { equipment: [], moves: [], locations: [] };
  document.addEventListener("state:sync", (e) => { _state = e.detail ?? _state; });

  // Filter changes → re-render
  ["search-input", "location-filter", "status-filter", "calibration-filter", "subscription-filter"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () =>
        renderOperationsView(_state)
      );
    });

  // Equipment / location change → sync conditional sections
  document.getElementById("move-equipment")?.addEventListener("change", () => {
    syncShippingSection(_state);
    syncConditionSection(_state);
  });
  document.getElementById("move-location")?.addEventListener("change", () => {
    syncShippingSection(_state);
  });
  document.getElementById("move-status")?.addEventListener("change", () => {
    syncConditionSection(_state);
  });

  // Clear shipping errors when user types
  ["move-shipping-carrier", "move-shipping-tracking"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", clearShippingValidation);
  });

  // Location summary card click → filter table to that location
  document.getElementById("location-summary")?.addEventListener("click", (e) => {
    const card = e.target.closest("[data-location]");
    if (!card) return;
    const locFilter = document.getElementById("location-filter");
    if (locFilter) {
      locFilter.value = card.dataset.location;
      renderOperationsView(_state);
    }
  });

  // Equipment table click → condition history button
  document.getElementById("equipment-table")?.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="view-condition-history"]');
    if (!btn) return;
    document.dispatchEvent(
      new CustomEvent("modal:condition-history", {
        detail: { equipmentId: btn.dataset.equipmentId },
      })
    );
  });

  // Move form submit
  document.getElementById("move-form")?.addEventListener("submit", (e) =>
    handleMoveSubmit(e, _state, { showToast, repository })
  );

  // Expose state sync so renderOperationsView can push state to handlers
  return {
    /** Call this whenever state changes to keep event handlers current. */
    syncState(state) {
      _state = state;
      document.dispatchEvent(new CustomEvent("state:sync", { detail: state }));
    },
  };
}
