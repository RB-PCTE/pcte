// src/ui/admin.js — Admin view: add equipment, edit equipment, record calibration.
//
// Public surface:
//   renderAdminView(state)                      — called on every state:changed
//   bindAdminEvents({ repository, showToast })  — called once at startup
//
// Removed in step 7a:
//   • CSV import — no bulk-create endpoint exists yet (POST and PATCH only).
//   • Subscription fields — GET /state carries no subscription data.
//   • The condition checklist — no backend concept; condition is set by receipts.
//   • "Starting status" on create and location/status on edit — both are owned
//     by equipment_state and change only through the move endpoints.

import { escapeHTML, equipmentLabel } from "./computed.js";
import { EQUIPMENT_CATEGORY, options } from "../enums.js";

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

  return {
    syncState(state) {
      _state = state;
    },
  };
}
