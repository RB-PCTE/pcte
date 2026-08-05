// src/ui/operations.js — Operations view: equipment table, location summary, move form.
//
// Public surface:
//   renderOperationsView(state)                      — called on every state:changed
//   bindOperationsEvents({ repository, showToast })  — called once at startup

import {
  escapeHTML,
  formatDate,
  equipmentLabel,
  statusDisplay,
  statusPillClass,
  calibrationPillClass,
  conditionBadgeClass,
} from "./computed.js";

import { getFilteredEquipment } from "./filters.js";
import { renderStats } from "./stats.js";

import {
  FILTER_ALL,
  statusFilterOptions,
  calibrationFilterOptions,
} from "../model.js";

import {
  EQUIPMENT_STATUS,
  EQUIPMENT_CATEGORY,
  MOVE_TYPE,
  CONDITION,
  CONDITION_NOT_ASSESSED,
  CALIBRATION_STATUS,
  CALIBRATION_NOT_REQUIRED,
  display,
  options,
} from "../enums.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build an <option> string. */
function opt(value, label, selected = false) {
  return `<option value="${escapeHTML(value)}"${selected ? " selected" : ""}>${escapeHTML(label)}</option>`;
}

/** Populate a <select> from an array of option strings, preserving the current value. */
function populateSelect(id, optionStrings, current = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = el.value || current;
  el.innerHTML = optionStrings.join("");
  if ([...el.options].some((o) => o.value === prev)) el.value = prev;
}

/** Locations that can be selected as a destination or filtered on. */
function activeLocations(state) {
  return (state.locations ?? []).filter((l) => l.active);
}

// ── Filter dropdowns ──────────────────────────────────────────────────────────

function renderFilterSelects(state) {
  populateSelect("location-filter", [
    opt(FILTER_ALL, "All locations"),
    ...activeLocations(state).map((l) => opt(l.id, l.name)),
  ]);

  populateSelect(
    "status-filter",
    statusFilterOptions.map((o) => opt(o.value, o.label))
  );

  populateSelect(
    "calibration-filter",
    calibrationFilterOptions.map((o) => opt(o.value, o.label))
  );
}

// ── Move form selects ─────────────────────────────────────────────────────────

function renderMoveFormSelects(state) {
  const equipment = state.equipment ?? [];

  populateSelect("move-equipment", [
    opt("", "Select equipment…"),
    ...equipment.map((item) => opt(item.id, equipmentLabel(item))),
  ]);

  populateSelect("move-location", [
    opt("", "Select location…"),
    ...activeLocations(state).map((l) => opt(l.id, l.name)),
  ]);

  populateSelect(
    "move-type",
    options(MOVE_TYPE).map((o) => opt(o.value, o.label))
  );

  // status_to is required by POST /moves, so there is no "no change" option —
  // the form defaults to Available, matching the pre-step-7 behaviour of
  // sending "Available" when the field was left blank.
  populateSelect(
    "move-status",
    options(EQUIPMENT_STATUS).map((o) => opt(o.value, o.label)),
    "available"
  );
}

// ── Equipment table ───────────────────────────────────────────────────────────

function buildConditionCell(item) {
  const label = display(CONDITION, item.condition, CONDITION_NOT_ASSESSED);
  const cls = conditionBadgeClass(item.condition);
  return `<span class="condition-badge ${cls}" title="Set when a move is receipted">${escapeHTML(label)}</span>`;
}

function buildCalibrationCell(item) {
  const info = item.calibration;
  const label = info
    ? display(CALIBRATION_STATUS, info.status, "Unknown")
    : CALIBRATION_NOT_REQUIRED;

  const meta = info?.due_date
    ? `Due ${formatDate(info.due_date)}`
    : info
      ? "No calibration date recorded"
      : "Not required";

  return `<span class="pill ${calibrationPillClass(info?.status ?? null)}" title="${escapeHTML(meta)}">${escapeHTML(label)}</span>`;
}

function buildTableRow(item) {
  return `
    <tr data-equipment-id="${escapeHTML(item.id)}">
      <td>
        <div class="status-with-meta">
          <strong>${escapeHTML(item.name)}</strong>
          <small class="status-meta">${escapeHTML(item.age_label || "Unknown")}</small>
        </div>
      </td>
      <td>${escapeHTML(display(EQUIPMENT_CATEGORY, item.category))}</td>
      <td>${escapeHTML(item.serial || "—")}</td>
      <td>
        <span class="pill ${statusPillClass(item)}">${escapeHTML(statusDisplay(item))}</span>
      </td>
      <td>${escapeHTML(item.location_display?.text ?? "Unknown")}</td>
      <td>${buildCalibrationCell(item)}</td>
      <td>${buildConditionCell(item)}</td>
    </tr>`;
}

function renderEquipmentTable(filteredEquipment) {
  const tbody = document.getElementById("equipment-table");
  if (!tbody) return;

  if (!filteredEquipment.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center; padding: var(--space-4); color: var(--color-text-muted);">No equipment matches the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredEquipment.map(buildTableRow).join("");
}

// ── Location summary ──────────────────────────────────────────────────────────

function renderLocationSummary(state) {
  const container = document.getElementById("location-summary");
  if (!container) return;

  const locations = activeLocations(state);
  const equipment = state.equipment ?? [];

  if (!locations.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = locations
    .map((location) => {
      const items = equipment.filter((item) => item.current_location_id === location.id);
      const listItems = items.length
        ? items
            .map(
              (item) => `
            <li class="summary-item">
              <span class="summary-item-name">${escapeHTML(item.name)}</span>
              <small class="summary-item-meta">${escapeHTML(statusDisplay(item))}</small>
            </li>`
            )
            .join("")
        : '<li class="summary-item summary-empty">No equipment here.</li>';

      return `
        <article class="location-card" tabindex="0" data-location-id="${escapeHTML(location.id)}">
          <div class="location-card-header">
            <h4>${escapeHTML(location.name)}</h4>
            <span class="location-card-count">${items.length}</span>
          </div>
          <ul class="summary-list">${listItems}</ul>
        </article>`;
    })
    .join("");
}

// ── Move form — conditional UI ────────────────────────────────────────────────

/**
 * True when the move runs between two different offices, which is what makes
 * shipping details mandatory.
 *
 * Keyed on each location's `category` rather than the hardcoded name list this
 * used before step 7a, so a new office added through the locations table gets
 * the shipping requirement without a code change.
 */
function isInterOfficeMove(state, fromLocationId, toLocationId) {
  if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) return false;
  const byId = new Map((state.locations ?? []).map((l) => [l.id, l]));
  return byId.get(fromLocationId)?.category === "office" &&
         byId.get(toLocationId)?.category === "office";
}

/** Derive a sensible default move type from the two locations. */
function deriveMoveType(state, fromLocationId, toLocationId) {
  const byId = new Map((state.locations ?? []).map((l) => [l.id, l]));
  const to = byId.get(toLocationId);
  const from = byId.get(fromLocationId);

  if (to?.category === "customer") return "hire_out";
  if (from?.category === "customer") return "hire_return";
  if (isInterOfficeMove(state, fromLocationId, toLocationId)) return "office_transfer";
  return "move";
}

function selectedEquipment(state) {
  const id = document.getElementById("move-equipment")?.value ?? "";
  return (state.equipment ?? []).find((e) => e.id === id) ?? null;
}

/** Show or hide the shipping section based on the current form values. */
function syncShippingSection(state) {
  const section = document.getElementById("move-shipping-section");
  if (!section) return;

  const item = selectedEquipment(state);
  const toLocationId = document.getElementById("move-location")?.value ?? "";

  const required = isInterOfficeMove(state, item?.current_location_id, toLocationId);
  section.classList.toggle("is-hidden", !required);
  if (!required) clearShippingValidation();
}

/**
 * Re-apply the derived move type — but only while the user hasn't chosen one
 * themselves. `workshop` has no location heuristic that implies it, so without
 * this guard picking it and then adjusting the destination would silently
 * throw the choice away.
 */
let _moveTypeDirty = false;

function syncMoveType(state) {
  if (_moveTypeDirty) return;
  const el = document.getElementById("move-type");
  if (!el) return;

  const item = selectedEquipment(state);
  const toLocationId = document.getElementById("move-location")?.value ?? "";
  if (!item || !toLocationId) return;

  el.value = deriveMoveType(state, item.current_location_id, toLocationId);
}

// ── Move form — validation ────────────────────────────────────────────────────

function validateShipping() {
  const section = document.getElementById("move-shipping-section");
  if (section?.classList.contains("is-hidden")) return true;

  const carrierEl = document.getElementById("move-shipping-carrier");
  const trackingEl = document.getElementById("move-shipping-tracking");

  const missing = [];
  if (!carrierEl?.value.trim()) missing.push(carrierEl);
  if (!trackingEl?.value.trim()) missing.push(trackingEl);

  [carrierEl, trackingEl].forEach((el) => {
    if (!el) return;
    const bad = missing.includes(el);
    el.classList.toggle("field-input-error", bad);
    if (bad) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  });

  const validEl = document.getElementById("move-shipping-validation");
  if (validEl) {
    validEl.textContent = missing.length
      ? "Carrier and tracking number are required for inter-office moves."
      : "";
    validEl.classList.toggle("is-hidden", !missing.length);
  }

  return missing.length === 0;
}

function clearShippingValidation() {
  document.querySelectorAll("#move-shipping-section .field-input-error").forEach((el) => {
    el.classList.remove("field-input-error");
    el.removeAttribute("aria-invalid");
  });
  const validEl = document.getElementById("move-shipping-validation");
  if (validEl) {
    validEl.textContent = "";
    validEl.classList.add("is-hidden");
  }
}

// ── Move form — submit ────────────────────────────────────────────────────────

let _isSaving = false;

function setSubmitSaving(isSaving) {
  const btn = document.getElementById("move-submit");
  if (!btn) return;
  btn.disabled = isSaving;
  btn.textContent = isSaving ? "Saving…" : "Record move";
}

function setSubmitStatus(message, type = "note") {
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
  _moveTypeDirty = false;
  document.getElementById("move-shipping-section")?.classList.add("is-hidden");
  clearShippingValidation();
  setSubmitStatus("");
}

async function handleMoveSubmit(event, state, { showToast, repository }) {
  event.preventDefault();
  if (_isSaving) return;

  const item = selectedEquipment(state);
  const toLocationId = document.getElementById("move-location")?.value ?? "";
  const moveType = document.getElementById("move-type")?.value ?? "";
  const statusTo = document.getElementById("move-status")?.value || "available";
  const notes = document.getElementById("move-notes")?.value.trim() ?? "";
  const carrier = document.getElementById("move-shipping-carrier")?.value.trim() ?? "";
  const tracking = document.getElementById("move-shipping-tracking")?.value.trim() ?? "";

  if (!item) {
    showToast("Select a piece of equipment first.", "error");
    return;
  }
  if (!toLocationId) {
    showToast("Select a destination.", "error");
    return;
  }
  if (!moveType) {
    showToast("Select a move type.", "error");
    return;
  }
  if (!validateShipping()) {
    showToast("Add carrier and tracking number before saving.", "error");
    document.getElementById("move-shipping-carrier")?.focus();
    return;
  }

  const shippingRequired = !document
    .getElementById("move-shipping-section")
    ?.classList.contains("is-hidden");

  // status_from, from_location_id and created_by are all derived server-side
  // under a row lock. MoveCreateIn forbids unknown fields, so sending them
  // would be a 422 rather than a silently ignored value.
  const payload = {
    equipment_id:   item.id,
    to_location_id: toLocationId,
    move_type:      moveType,
    status_to:      statusTo,
    notes:          notes || null,
    carrier:         shippingRequired ? carrier : null,
    tracking_number: shippingRequired ? tracking : null,
    booked_at:       shippingRequired ? new Date().toISOString() : null,
  };

  _isSaving = true;
  setSubmitSaving(true);
  setSubmitStatus("Submitting…");

  try {
    await repository.recordMove(payload);
    resetMoveForm();
    setSubmitStatus("Move recorded.");
    showToast("Move recorded.", "success");

    const row = document.querySelector(`tr[data-equipment-id="${CSS.escape(item.id)}"]`);
    if (row) {
      row.classList.add("equipment-row-highlight");
      setTimeout(() => row.classList.remove("equipment-row-highlight"), 2000);
    }
  } catch (err) {
    setSubmitStatus(err.message, "error");
    showToast(err.message, "error");
  } finally {
    _isSaving = false;
    setSubmitSaving(false);
  }
}

// ── Main render entry point ───────────────────────────────────────────────────

/**
 * Re-render everything in the Operations view.
 * @param {object} state - full app state from repository.getState()
 */
export function renderOperationsView(state) {
  renderFilterSelects(state);
  const filtered = getFilteredEquipment(state);

  renderStats(filtered);
  renderMoveFormSelects(state);
  renderEquipmentTable(filtered);
  renderLocationSummary(state);
}

// ── Event binding (called once at startup) ────────────────────────────────────

/**
 * Wire all Operations view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindOperationsEvents({ repository, showToast }) {
  let _state = { equipment: [], moves: [], locations: [] };

  // Filter changes → re-render
  ["search-input", "location-filter", "status-filter", "calibration-filter"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () =>
      renderOperationsView(_state)
    );
  });

  // Equipment / destination change → re-derive the conditional sections
  ["move-equipment", "move-location"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      syncShippingSection(_state);
      syncMoveType(_state);
    });
  });

  // A manual move-type choice sticks for the rest of this form session.
  document.getElementById("move-type")?.addEventListener("change", () => {
    _moveTypeDirty = true;
  });

  // Clear shipping errors as the user types
  ["move-shipping-carrier", "move-shipping-tracking"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", clearShippingValidation);
  });

  // Location summary card click → filter the table to that location
  document.getElementById("location-summary")?.addEventListener("click", (e) => {
    const card = e.target.closest("[data-location-id]");
    if (!card) return;
    const locFilter = document.getElementById("location-filter");
    if (locFilter) {
      locFilter.value = card.dataset.locationId;
      renderOperationsView(_state);
    }
  });

  document.getElementById("move-form")?.addEventListener("submit", (e) =>
    handleMoveSubmit(e, _state, { showToast, repository })
  );

  return {
    syncState(state) {
      _state = state;
    },
  };
}
