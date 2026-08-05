// src/ui/admin.js — Admin view: add/edit equipment, record calibration, manage locations.
//
// Public surface:
//   renderAdminView(state)                      — called on every state:changed
//   bindAdminEvents({ repository, showToast })  — called once at startup
//
// Everything in this file lives inside #admin-panels-grid, which auth.js hides
// wholesale for non-admins. There is no per-control gating — the backend
// enforces admin access on the write endpoints independently, so the visibility
// rule here is UX rather than security.
//
// Removed in step 7a:
//   • CSV import — no bulk-create endpoint exists yet (POST and PATCH only).
//   • Subscription fields — GET /state carries no subscription data.
//   • The condition checklist — no backend concept; condition is set by receipts.
//   • "Starting status" on create and location/status on edit — both are owned
//     by equipment_state and change only through the move endpoints.

import { escapeHTML, equipmentLabel } from "./computed.js";
import { EQUIPMENT_CATEGORY, LOCATION_CATEGORY, display, options } from "../enums.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function opt(value, label, selected = false) {
  return `<option value="${escapeHTML(value)}"${selected ? " selected" : ""}>${escapeHTML(label)}</option>`;
}

function populateSelect(id, optionStrings, currentValue = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = currentValue || el.value;
  el.innerHTML = optionStrings.join("");
  if ([...el.options].some((o) => o.value === prev)) el.value = prev;
}

function show(id) {
  document.getElementById(id)?.classList.remove("is-hidden");
}

function hide(id) {
  document.getElementById(id)?.classList.add("is-hidden");
}

function val(id) {
  return (document.getElementById(id)?.value ?? "").trim();
}

function checked(id) {
  return document.getElementById(id)?.checked ?? false;
}

// ── Option builders ───────────────────────────────────────────────────────────

function locationOptions(state, current = "") {
  return [
    opt("", "Select…"),
    ...(state.locations ?? [])
      .filter((l) => l.active)
      .map((l) => opt(l.id, l.name, l.id === current)),
  ];
}

function categoryOptions(current = "") {
  return [
    opt("", "Select…"),
    ...options(EQUIPMENT_CATEGORY).map((o) => opt(o.value, o.label, o.value === current)),
  ];
}

function locationCategoryOptions(current = "") {
  return [
    opt("", "Select…"),
    ...options(LOCATION_CATEGORY).map((o) => opt(o.value, o.label, o.value === current)),
  ];
}

function equipmentOptions(equipment, current = "") {
  return [
    opt("", "Select…"),
    ...equipment.map((eq) => opt(eq.id, equipmentLabel(eq), eq.id === current)),
  ];
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Refresh all admin form dropdowns from current state.
 * @param {object} state
 */
export function renderAdminView(state) {
  const equipment = state.equipment ?? [];

  populateSelect("new-equipment-category", categoryOptions());
  populateSelect("new-equipment-location", locationOptions(state));

  const editCurrent = val("edit-equipment-select");
  populateSelect("edit-equipment-select", equipmentOptions(equipment, editCurrent));
  populateSelect("edit-equipment-category", categoryOptions());
  populateSelect("edit-equipment-location", locationOptions(state));

  const calCurrent = val("calibration-equipment");
  populateSelect("calibration-equipment", equipmentOptions(equipment, calCurrent));

  populateSelect("new-location-category", locationCategoryOptions());
  renderLocationsTable(state);
}

// ── Calibration interval ──────────────────────────────────────────────────────

function getCalibrationIntervalMonths(prefix) {
  const intervalVal = val(`${prefix}-calibration-interval`);
  if (intervalVal === "custom") {
    const custom = parseInt(val(`${prefix}-calibration-interval-custom`), 10);
    return Number.isNaN(custom) || custom < 1 ? null : custom;
  }
  const parsed = parseInt(intervalVal, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// ── Add equipment ─────────────────────────────────────────────────────────────

function syncAddCalibrationFields() {
  const required = checked("new-equipment-calibration-required");
  required ? show("new-equipment-calibration-interval-field")
           : hide("new-equipment-calibration-interval-field");
  required ? show("new-equipment-last-calibration-field")
           : hide("new-equipment-last-calibration-field");

  val("new-equipment-calibration-interval") === "custom"
    ? show("new-equipment-calibration-interval-custom-field")
    : hide("new-equipment-calibration-interval-custom-field");
}

async function handleAddEquipmentSubmit(e, state, { repository, showToast }) {
  e.preventDefault();

  const name = val("new-equipment-name");
  const category = val("new-equipment-category");
  const serial = val("new-equipment-serial");

  if (!name) {
    showToast("Equipment name is required.", "error");
    return;
  }
  if (!category) {
    showToast("Category is required.", "error");
    return;
  }

  if (serial) {
    const duplicate = (state.equipment ?? []).some(
      (eq) => eq.serial && eq.serial.toLowerCase() === serial.toLowerCase()
    );
    if (duplicate) {
      show("new-equipment-serial-warning");
      showToast("A duplicate serial number was found.", "error");
      return;
    }
  }
  hide("new-equipment-serial-warning");

  const calibrationRequired = checked("new-equipment-calibration-required");

  // Matches EquipmentCreateIn. No status and no current_location_id: the
  // backend starts every new row at 'available', located at its home location.
  const payload = {
    name,
    category,
    serial: serial || null,
    home_location_id: val("new-equipment-location") || null,
    notes: val("new-equipment-notes") || null,
    purchase_date: val("new-equipment-purchase-date") || null,
    calibration_required: calibrationRequired,
    calibration_interval_months: calibrationRequired
      ? getCalibrationIntervalMonths("new-equipment")
      : null,
    last_calibration_date: calibrationRequired
      ? val("new-equipment-last-calibration") || null
      : null,
  };

  try {
    await repository.addEquipment(payload);
    showToast(`${name} added successfully.`, "success");
    document.getElementById("add-equipment-form")?.reset();
    syncAddCalibrationFields();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── Edit equipment ────────────────────────────────────────────────────────────

function syncEditCalibrationFields() {
  const required = checked("edit-equipment-calibration-required");
  required ? show("edit-equipment-calibration-interval-field")
           : hide("edit-equipment-calibration-interval-field");
  required ? show("edit-equipment-last-calibration-field")
           : hide("edit-equipment-last-calibration-field");

  val("edit-equipment-calibration-interval") === "custom"
    ? show("edit-equipment-calibration-interval-custom-field")
    : hide("edit-equipment-calibration-interval-custom-field");
}

/**
 * Populate the edit form from the selected item.
 * @param {string} equipmentId
 * @param {object[]} equipment
 */
function populateEditForm(equipmentId, equipment) {
  const item = equipment.find((eq) => eq.id === equipmentId);

  ["edit-equipment-name-error", "edit-equipment-name-warning", "edit-equipment-serial-warning"]
    .forEach(hide);

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };
  const setCheck = (id, bool) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!bool;
  };

  if (!item) {
    ["edit-equipment-name", "edit-equipment-serial", "edit-equipment-purchase-date",
     "edit-equipment-notes", "edit-equipment-category", "edit-equipment-location"]
      .forEach((id) => setVal(id, ""));
    setCheck("edit-equipment-active", false);
    return;
  }

  setVal("edit-equipment-name", item.name);
  setVal("edit-equipment-serial", item.serial);
  setVal("edit-equipment-purchase-date", item.purchase_date);
  setVal("edit-equipment-notes", item.notes);
  setVal("edit-equipment-category", item.category);
  setVal("edit-equipment-location", item.home_location_id);
  setCheck("edit-equipment-active", item.active);

  setCheck("edit-equipment-calibration-required", item.calibration_required);
  const interval = item.calibration_interval_months;
  const intervalEl = document.getElementById("edit-equipment-calibration-interval");
  if (intervalEl) {
    const knownValues = ["12", "24"];
    if (interval && !knownValues.includes(String(interval))) {
      intervalEl.value = "custom";
      setVal("edit-equipment-calibration-interval-custom", interval);
    } else {
      intervalEl.value = interval ? String(interval) : "12";
    }
  }
  setVal("edit-equipment-last-calibration", item.last_calibration_date);
  syncEditCalibrationFields();
}

async function handleEditEquipmentSubmit(e, state, { repository, showToast, editId }) {
  e.preventDefault();

  const equipmentId = editId();
  if (!equipmentId) {
    showToast("Please select equipment to edit.", "error");
    return;
  }

  const name = val("edit-equipment-name");
  if (!name) {
    show("edit-equipment-name-error");
    showToast("Equipment name is required.", "error");
    return;
  }
  hide("edit-equipment-name-error");

  const serial = val("edit-equipment-serial");
  if (serial) {
    const duplicate = (state.equipment ?? []).some(
      (eq) => eq.id !== equipmentId && eq.serial &&
              eq.serial.toLowerCase() === serial.toLowerCase()
    );
    if (duplicate) {
      show("edit-equipment-serial-warning");
      showToast("Another item already has this serial number.", "error");
      return;
    }
  }
  hide("edit-equipment-serial-warning");

  const calibrationRequired = checked("edit-equipment-calibration-required");

  // Matches EquipmentPatchIn — structural fields only. purchase_date is absent
  // from that model, so the form field is display-only and not sent here.
  const patch = {
    name,
    category: val("edit-equipment-category") || null,
    serial: serial || null,
    home_location_id: val("edit-equipment-location") || null,
    notes: val("edit-equipment-notes") || null,
    active: checked("edit-equipment-active"),
    calibration_required: calibrationRequired,
    calibration_interval_months: calibrationRequired
      ? getCalibrationIntervalMonths("edit-equipment")
      : null,
    last_calibration_date: calibrationRequired
      ? val("edit-equipment-last-calibration") || null
      : null,
  };

  try {
    await repository.updateEquipment(equipmentId, patch);
    showToast(`${name} updated.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── Record calibration ────────────────────────────────────────────────────────

async function handleCalibrationSubmit(e, state, { repository, showToast }) {
  e.preventDefault();

  const equipmentId = val("calibration-equipment");
  const dateRaw = val("calibration-date");

  if (!equipmentId) {
    showToast("Please select equipment.", "error");
    return;
  }
  if (!dateRaw) {
    showToast("Calibration date is required.", "error");
    return;
  }

  const item = (state.equipment ?? []).find((eq) => eq.id === equipmentId);
  const intervalRaw = val("calibration-interval");
  const newInterval = intervalRaw ? parseInt(intervalRaw, 10) : null;

  try {
    await repository.recordCalibration(equipmentId, {
      last_calibration_date: dateRaw,
      calibration_interval_months:
        newInterval && newInterval > 0
          ? newInterval
          : (item?.calibration_interval_months ?? null),
      calibration_required: checked("calibration-required"),
    });
    showToast("Calibration recorded.", "success");
    document.getElementById("calibration-form")?.reset();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── Locations ─────────────────────────────────────────────────────────────────
// Unlike equipment, locations are a short, slow-changing list, so the whole
// table is on screen and edited in place rather than loaded into a form.

/**
 * The row currently being edited, if any.
 *
 * `renderAdminView` re-runs on every "state:changed" — including changes this
 * card didn't cause, like a move recorded in another tab — which would
 * otherwise wipe an open editor mid-typing. Rendering re-opens the row this
 * points at.
 */
let _editingLocationId = null;

function locationRowActions(location) {
  if (location.id === _editingLocationId) {
    return `
      <button class="btn btn-sm" type="button" data-action="save-location" data-id="${escapeHTML(location.id)}">Save</button>
      <button class="btn btn-sm btn-secondary" type="button" data-action="cancel-edit-location">Cancel</button>`;
  }

  const toggle = location.active
    ? `<button class="btn btn-sm btn-danger" type="button" data-action="deactivate-location" data-id="${escapeHTML(location.id)}">Deactivate</button>`
    : `<button class="btn btn-sm btn-secondary" type="button" data-action="reactivate-location" data-id="${escapeHTML(location.id)}">Reactivate</button>`;

  return `
    <button class="btn btn-sm btn-secondary" type="button" data-action="edit-location" data-id="${escapeHTML(location.id)}">Edit</button>
    ${toggle}`;
}

function buildLocationRow(location) {
  const editing = location.id === _editingLocationId;

  const nameCell = editing
    ? `<input type="text" class="locations-edit-input" id="edit-location-name" value="${escapeHTML(location.name)}" />`
    : escapeHTML(location.name);

  const categoryCell = editing
    ? `<select class="locations-edit-select" id="edit-location-category">${locationCategoryOptions(location.category).join("")}</select>`
    : escapeHTML(display(LOCATION_CATEGORY, location.category));

  const statusPill = location.active
    ? '<span class="pill pill--ok">Active</span>'
    : '<span class="pill pill--n-a">Inactive</span>';

  return `
    <tr class="${location.active ? "" : "locations-row--inactive"}" data-location-id="${escapeHTML(location.id)}">
      <td>${nameCell}</td>
      <td>${categoryCell}</td>
      <td>${statusPill}</td>
      <td><div class="locations-actions">${locationRowActions(location)}</div></td>
    </tr>`;
}

/**
 * Render the locations table from `state.locations`.
 *
 * Inactive rows are shown rather than hidden — a deactivated location still
 * owns move history, and hiding it makes "why can't I pick Perth any more?"
 * unanswerable from the UI.
 *
 * @param {object} state
 */
function renderLocationsTable(state) {
  const tbody = document.getElementById("locations-table");
  if (!tbody) return;

  const locations = state.locations ?? [];

  if (!locations.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding: var(--space-4); color: var(--color-text-muted);">No locations yet. Add one above.</td></tr>';
    return;
  }

  // Active first, then alphabetical — the list people actually pick from
  // shouldn't be interleaved with retired entries.
  const ordered = [...locations].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  tbody.innerHTML = ordered.map(buildLocationRow).join("");
}

async function handleAddLocationSubmit(e, { repository, showToast }) {
  e.preventDefault();

  const name = val("new-location-name");
  const category = val("new-location-category");

  hide("new-location-name-error");
  hide("new-location-category-error");

  if (!name) {
    show("new-location-name-error");
    showToast("Location name is required.", "error");
    return;
  }
  if (!category) {
    show("new-location-category-error");
    showToast("Category is required.", "error");
    return;
  }

  const btn = document.getElementById("add-location-submit");
  if (btn) btn.disabled = true;

  try {
    // `active` is omitted — the server defaults it to true.
    await repository.createLocation({ name, category });
    showToast(`${name} added.`, "success");
    document.getElementById("add-location-form")?.reset();
    populateSelect("new-location-category", locationCategoryOptions());
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Save the open inline editor.
 *
 * PUT is a full replace, so this always sends all three fields. `active` is
 * carried over from the row as it stands — editing a location never changes
 * whether it's active; that's what Deactivate/Reactivate are for.
 */
async function handleSaveLocation(id, state, { repository, showToast }) {
  const location = (state.locations ?? []).find((l) => l.id === id);
  if (!location) return;

  const name = (document.getElementById("edit-location-name")?.value ?? "").trim();
  const category = document.getElementById("edit-location-category")?.value ?? "";

  if (!name) {
    showToast("Location name is required.", "error");
    return;
  }
  if (!category) {
    showToast("Category is required.", "error");
    return;
  }

  // Cleared *before* the call, not after: updateLocation refetches and emits,
  // which re-renders this table. Clearing afterwards would render the row as an
  // open editor one last time, and the follow-up render would be working from
  // the pre-save state captured at click time.
  _editingLocationId = null;

  try {
    await repository.updateLocation(id, { name, category, active: location.active });
    showToast(`${name} updated.`, "success");
  } catch (err) {
    // The call threw before any re-render, so the editor is still on screen
    // with what was typed. Restore the flag and leave the DOM alone rather than
    // re-rendering and discarding their input.
    _editingLocationId = id;
    showToast(err.message, "error");
  }
}

async function handleDeactivateLocation(id, state, { repository, showToast }) {
  const location = (state.locations ?? []).find((l) => l.id === id);
  if (!location) return;

  const confirmed = window.confirm(
    `Deactivate "${location.name}"?\n\nIt will stop appearing as a choice for new equipment and moves. Existing move history is kept, and you can reactivate it later.`
  );
  if (!confirmed) return;

  try {
    await repository.deactivateLocation(id);
    showToast(`${location.name} deactivated.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleReactivateLocation(id, state, { repository, showToast }) {
  const location = (state.locations ?? []).find((l) => l.id === id);
  if (!location) return;

  if (!window.confirm(`Reactivate "${location.name}"?`)) return;

  try {
    // Same PUT as an edit — full replace, with the row's existing name and
    // category unchanged and only `active` flipped.
    await repository.updateLocation(id, {
      name: location.name,
      category: location.category,
      active: true,
    });
    showToast(`${location.name} reactivated.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire all Admin view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindAdminEvents({ repository, showToast }) {
  let _state = { equipment: [], moves: [], locations: [] };
  const editId = () => val("edit-equipment-select");

  // ── Add equipment ──────────────────────────────────────────────────────────

  document.getElementById("new-equipment-calibration-required")
    ?.addEventListener("change", syncAddCalibrationFields);
  document.getElementById("new-equipment-calibration-interval")
    ?.addEventListener("change", syncAddCalibrationFields);

  document.getElementById("new-equipment-serial")?.addEventListener("input", () => {
    const serial = val("new-equipment-serial");
    const duplicate = serial && (_state.equipment ?? []).some(
      (eq) => eq.serial && eq.serial.toLowerCase() === serial.toLowerCase()
    );
    duplicate ? show("new-equipment-serial-warning") : hide("new-equipment-serial-warning");
  });

  document.getElementById("add-equipment-form")?.addEventListener("submit", (e) => {
    handleAddEquipmentSubmit(e, _state, { repository, showToast });
  });

  syncAddCalibrationFields();

  // ── Edit equipment ─────────────────────────────────────────────────────────

  document.getElementById("edit-equipment-select")?.addEventListener("change", () => {
    populateEditForm(editId(), _state.equipment ?? []);
  });

  document.getElementById("edit-equipment-calibration-required")
    ?.addEventListener("change", syncEditCalibrationFields);
  document.getElementById("edit-equipment-calibration-interval")
    ?.addEventListener("change", syncEditCalibrationFields);

  document.getElementById("edit-equipment-name")?.addEventListener("input", () => {
    const name = val("edit-equipment-name");
    const id = editId();
    const duplicate = name && (_state.equipment ?? []).some(
      (eq) => eq.id !== id && eq.name.toLowerCase() === name.toLowerCase()
    );
    duplicate ? show("edit-equipment-name-warning") : hide("edit-equipment-name-warning");
  });

  document.getElementById("edit-equipment-serial")?.addEventListener("input", () => {
    const serial = val("edit-equipment-serial");
    const id = editId();
    const duplicate = serial && (_state.equipment ?? []).some(
      (eq) => eq.id !== id && eq.serial &&
              eq.serial.toLowerCase() === serial.toLowerCase()
    );
    duplicate ? show("edit-equipment-serial-warning") : hide("edit-equipment-serial-warning");
  });

  document.getElementById("edit-equipment-cancel")?.addEventListener("click", () => {
    document.getElementById("edit-equipment-form")?.reset();
    populateEditForm("", _state.equipment ?? []);
    syncEditCalibrationFields();
  });

  document.getElementById("edit-equipment-form")?.addEventListener("submit", (e) => {
    handleEditEquipmentSubmit(e, _state, { repository, showToast, editId });
  });

  // ── Calibration ────────────────────────────────────────────────────────────

  document.getElementById("calibration-form")?.addEventListener("submit", (e) => {
    handleCalibrationSubmit(e, _state, { repository, showToast });
  });

  // ── Locations ──────────────────────────────────────────────────────────────

  document.getElementById("add-location-form")?.addEventListener("submit", (e) => {
    handleAddLocationSubmit(e, { repository, showToast });
  });

  // Delegated, so the buttons survive every re-render — same pattern moves.js
  // uses for its Mark-received button.
  document.getElementById("locations-table")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === "edit-location") {
      _editingLocationId = id;
      renderLocationsTable(_state);
      document.getElementById("edit-location-name")?.focus();
    }

    if (action === "cancel-edit-location") {
      _editingLocationId = null;
      renderLocationsTable(_state);
    }

    if (action === "save-location") {
      handleSaveLocation(id, _state, { repository, showToast });
    }

    if (action === "deactivate-location") {
      handleDeactivateLocation(id, _state, { repository, showToast });
    }

    if (action === "reactivate-location") {
      handleReactivateLocation(id, _state, { repository, showToast });
    }
  });

  return {
    syncState(state) {
      _state = state;
    },
  };
}
