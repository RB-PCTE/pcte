// src/ui/admin.js — Admin view: add/edit equipment, calibration, CSV import.
//
// Public surface:
//   renderAdminView(state)                      — called on every state:changed
//   bindAdminEvents({ repository, showToast })  — called once at startup

import { escapeHTML, formatDate } from "./computed.js";

import {
  editableStatusOptions,
  physicalLocations,
  normalizeStatus,
} from "../model.js";

import { createSubscriptionRecord } from "../supabaseClient.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function opt(value, label, selected = false) {
  return `<option value="${escapeHTML(value)}"${selected ? " selected" : ""}>${escapeHTML(label)}</option>`;
}

function populateSelect(id, options, currentValue = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = currentValue || el.value;
  el.innerHTML = options.join("");
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

// ── Location + status option builders ─────────────────────────────────────────

function locationOptions(locations, current = "") {
  const locs = locations?.length ? locations : physicalLocations;
  return [
    opt("", "Select…"),
    ...locs.map((l) => opt(l, l, l === current)),
  ];
}

function statusOptions(current = "") {
  return [
    opt("", "Select…"),
    ...editableStatusOptions.map((s) => opt(s, s, s === current)),
  ];
}

function equipmentOptions(equipment, current = "", placeholder = "Select…") {
  return [
    opt("", placeholder),
    ...equipment.map((eq) => {
      const label = [eq.name, eq.model, eq.serialNumber].filter(Boolean).join(" — ");
      return opt(eq.id, label, eq.id === current);
    }),
  ];
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Refresh all admin form dropdowns from current state.
 * @param {object} state
 */
export function renderAdminView(state) {
  const equipment = Array.isArray(state.equipment) ? state.equipment : [];
  const locations  = Array.isArray(state.locations)  ? state.locations  : [];

  // Add-equipment form dropdowns
  populateSelect("new-equipment-location", locationOptions(locations));
  populateSelect("new-equipment-status",   statusOptions());

  // Edit-equipment form: equipment select (preserve current selection)
  const editCurrent = val("edit-equipment-select");
  populateSelect("edit-equipment-select", equipmentOptions(equipment, editCurrent));
  populateSelect("edit-equipment-copy-source", equipmentOptions(equipment, "", "Select…"));
  populateSelect("edit-equipment-location", locationOptions(locations));
  populateSelect("edit-equipment-status",   statusOptions());

  // Calibration form: equipment select
  const calCurrent = val("calibration-equipment");
  populateSelect("calibration-equipment", equipmentOptions(equipment, calCurrent));
}

// ── Add-equipment logic ───────────────────────────────────────────────────────

function syncAddCalibrationFields() {
  const required = checked("new-equipment-calibration-required");
  required ? show("new-equipment-calibration-interval-field")
           : hide("new-equipment-calibration-interval-field");
  required ? show("new-equipment-last-calibration-field")
           : hide("new-equipment-last-calibration-field");

  const interval = val("new-equipment-calibration-interval");
  interval === "custom"
    ? show("new-equipment-calibration-interval-custom-field")
    : hide("new-equipment-calibration-interval-custom-field");
}

function syncAddSubscriptionFields() {
  const required = checked("new-equipment-subscription-required");
  required ? show("new-equipment-subscription-date-field")  : hide("new-equipment-subscription-date-field");
  required ? show("new-equipment-billing-cycle-field")      : hide("new-equipment-billing-cycle-field");
}

function getCalibrationIntervalMonths(prefix) {
  const intervalVal = val(`${prefix}-calibration-interval`);
  if (intervalVal === "custom") {
    const custom = parseInt(val(`${prefix}-calibration-interval-custom`), 10);
    return isNaN(custom) || custom < 1 ? null : custom;
  }
  const parsed = parseInt(intervalVal, 10);
  return isNaN(parsed) ? null : parsed;
}

async function handleAddEquipmentSubmit(e, state, { repository, showToast }) {
  e.preventDefault();

  const name   = val("new-equipment-name");
  const serial = val("new-equipment-serial");

  if (!name) {
    showToast("Equipment name is required.", "error");
    return;
  }

  // Duplicate serial check
  if (serial) {
    const duplicate = (state.equipment ?? []).some(
      (eq) => eq.serialNumber && eq.serialNumber.toLowerCase() === serial.toLowerCase()
    );
    if (duplicate) {
      show("new-equipment-serial-warning");
      showToast("A duplicate serial number was found.", "error");
      return;
    }
  }
  hide("new-equipment-serial-warning");

  const calibrationRequired = checked("new-equipment-calibration-required");
  const subscriptionRequired = checked("new-equipment-subscription-required");
  const billingCycle = val("new-equipment-billing-cycle") || "monthly";

  const newItem = {
    name,
    model:                   val("new-equipment-model"),
    serialNumber:            serial,
    purchaseDate:            val("new-equipment-purchase-date"),
    location:                val("new-equipment-location"),
    status:                  val("new-equipment-status") || "Available",
    calibrationRequired,
    calibrationIntervalMonths: calibrationRequired
      ? getCalibrationIntervalMonths("new-equipment")
      : null,
    lastCalibrationDate: calibrationRequired
      ? val("new-equipment-last-calibration")
      : null,
    subscriptionRequired,
    subscriptionRenewalDate: subscriptionRequired
      ? val("new-equipment-subscription-date")
      : null,
    conditionReference: {},
    conditionHistory: [],
  };

  try {
    await repository.addEquipment(newItem);

    if (subscriptionRequired && newItem.serialNumber) {
      await createSubscriptionRecord(newItem, billingCycle);
    }

    showToast(`${name} added successfully.`, "success");
    document.getElementById("add-equipment-form")?.reset();
    syncAddCalibrationFields();
    syncAddSubscriptionFields();
  } catch (err) {
    showToast(`Failed to add equipment: ${err.message}`, "error");
  }
}

// ── Edit-equipment logic ──────────────────────────────────────────────────────

function syncEditCalibrationFields() {
  const required = checked("edit-equipment-calibration-required");
  required ? show("edit-equipment-calibration-interval-field")
           : hide("edit-equipment-calibration-interval-field");
  required ? show("edit-equipment-last-calibration-field")
           : hide("edit-equipment-last-calibration-field");

  const interval = val("edit-equipment-calibration-interval");
  interval === "custom"
    ? show("edit-equipment-calibration-interval-custom-field")
    : hide("edit-equipment-calibration-interval-custom-field");
}

function syncEditSubscriptionFields() {
  const required = checked("edit-equipment-subscription-required");
  required ? show("edit-equipment-subscription-date-field")
           : hide("edit-equipment-subscription-date-field");
}

/**
 * Populate all edit-form fields from the selected equipment item.
 * @param {string} equipmentId
 * @param {object[]} equipment
 */
function populateEditForm(equipmentId, equipment) {
  const item = equipment.find((eq) => eq.id === equipmentId);

  const nameError   = document.getElementById("edit-equipment-name-error");
  const nameWarning = document.getElementById("edit-equipment-name-warning");
  const serialWarn  = document.getElementById("edit-equipment-serial-warning");
  [nameError, nameWarning, serialWarn].forEach((el) => el?.classList.add("is-hidden"));

  if (!item) {
    // Clear all fields if nothing selected
    ["edit-equipment-name", "edit-equipment-model", "edit-equipment-serial",
     "edit-equipment-purchase-date", "edit-equipment-contents-checklist",
     "edit-equipment-functional-checklist"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    return;
  }

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };
  const setCheck = (id, bool) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!bool;
  };

  setVal("edit-equipment-name",          item.name);
  setVal("edit-equipment-model",         item.model);
  setVal("edit-equipment-serial",        item.serialNumber);
  setVal("edit-equipment-purchase-date", item.purchaseDate);

  // Location + status — set after renderAdminView has populated their options
  setTimeout(() => {
    setVal("edit-equipment-location", item.location);
    setVal("edit-equipment-status",   item.status);
  }, 0);

  // Calibration
  setCheck("edit-equipment-calibration-required", item.calibrationRequired);
  const interval = item.calibrationIntervalMonths;
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
  setVal("edit-equipment-last-calibration", item.lastCalibrationDate);
  syncEditCalibrationFields();

  // Subscription
  setCheck("edit-equipment-subscription-required", item.subscriptionRequired);
  setVal("edit-equipment-subscription-date", item.subscriptionRenewalDate);
  syncEditSubscriptionFields();

  // Condition checklist (contents + functional arrays stored as conditionReference)
  const ref = item.conditionReference ?? {};
  const contentsLines = Array.isArray(ref.contents) ? ref.contents.join("\n") : "";
  const functionalLines = Array.isArray(ref.functional) ? ref.functional.join("\n") : "";
  setVal("edit-equipment-contents-checklist",  contentsLines);
  setVal("edit-equipment-functional-checklist", functionalLines);
}

async function handleEditEquipmentSubmit(e, state, { repository, showToast, _editId }) {
  e.preventDefault();

  const equipmentId = _editId();
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
      (eq) => eq.id !== equipmentId &&
              eq.serialNumber &&
              eq.serialNumber.toLowerCase() === serial.toLowerCase()
    );
    if (duplicate) {
      show("edit-equipment-serial-warning");
      showToast("Another item already has this serial number.", "error");
      return;
    }
  }
  hide("edit-equipment-serial-warning");

  const calibrationRequired = checked("edit-equipment-calibration-required");
  const subscriptionRequired = checked("edit-equipment-subscription-required");

  // Build condition reference from textareas
  const contentsRaw   = document.getElementById("edit-equipment-contents-checklist")?.value ?? "";
  const functionalRaw = document.getElementById("edit-equipment-functional-checklist")?.value ?? "";
  const parseLines = (raw) => raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const patch = {
    name,
    model:         val("edit-equipment-model"),
    serialNumber:  serial,
    purchaseDate:  val("edit-equipment-purchase-date"),
    location:      val("edit-equipment-location"),
    status:        val("edit-equipment-status") || "Available",
    calibrationRequired,
    calibrationIntervalMonths: calibrationRequired
      ? getCalibrationIntervalMonths("edit-equipment")
      : null,
    lastCalibrationDate: calibrationRequired
      ? val("edit-equipment-last-calibration")
      : null,
    subscriptionRequired,
    subscriptionRenewalDate: subscriptionRequired
      ? val("edit-equipment-subscription-date")
      : null,
    conditionReference: {
      contents:   parseLines(contentsRaw),
      functional: parseLines(functionalRaw),
    },
  };

  try {
    await repository.updateEquipment(equipmentId, patch);
    showToast(`${name} updated.`, "success");
  } catch (err) {
    showToast(`Failed to update: ${err.message}`, "error");
  }
}

// ── Calibration logic ─────────────────────────────────────────────────────────

async function handleCalibrationSubmit(e, state, { repository, showToast }) {
  e.preventDefault();

  const equipmentId = val("calibration-equipment");
  const dateRaw     = val("calibration-date");

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
  const calibrationRequired = checked("calibration-required");

  const payload = {
    equipmentId,
    timestamp:                new Date().toISOString(),
    lastCalibrationDate:      dateRaw,
    calibrationIntervalMonths: (newInterval && newInterval > 0)
      ? newInterval
      : (item?.calibrationIntervalMonths ?? null),
    calibrationRequired:     calibrationRequired,
    toLocation:              item?.location ?? "",
    fromLocation:            item?.location ?? "",
  };

  try {
    await repository.recordCalibration(payload);
    // Also persist interval / required flag onto the equipment record itself
    await repository.updateEquipment(equipmentId, {
      lastCalibrationDate:      dateRaw,
      calibrationIntervalMonths: payload.calibrationIntervalMonths,
      calibrationRequired,
    });
    showToast("Calibration recorded.", "success");
    document.getElementById("calibration-form")?.reset();
  } catch (err) {
    showToast(`Failed to record calibration: ${err.message}`, "error");
  }
}

// ── CSV import logic ──────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  "name", "model", "serial", "purchaseDate",
  "location", "status",
  "calibrationRequired", "calibrationIntervalMonths", "lastCalibrationDate",
];

const CSV_TEMPLATE_HEADER = CSV_COLUMNS.join(",");
const CSV_TEMPLATE_EXAMPLE =
  "RIEGL VZ-400i,Terrestrial LiDAR,12345678,2022-01-15," +
  "Perth,Available,true,24,2024-01-15";

let _importRows = [];      // parsed + validated rows
let _importWarnings = [];  // per-row warning strings

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], warnings: ["CSV has no data rows."] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const warnings = [];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const row = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ""]));

    if (!row.name) {
      warnings.push(`Row ${i}: missing name — skipped.`);
      continue;
    }

    // Normalize booleans
    const calRequired = row.calibrationrequired ?? row.calibration_required ?? "";
    const parsed = {
      name:                     row.name,
      model:                    row.model ?? "",
      serialNumber:             row.serial ?? "",
      purchaseDate:             row.purchasedate ?? row.purchase_date ?? "",
      location:                 row.location ?? "",
      status:                   normalizeStatus(row.status ?? "", row.location ?? ""),
      calibrationRequired:      /^(true|yes|1)$/i.test(calRequired),
      calibrationIntervalMonths: parseInt(row.calibrationintervalmonths ?? row.calibration_interval_months, 10) || null,
      lastCalibrationDate:      row.lastcalibrationdate ?? row.last_calibration_date ?? "",
      conditionReference:       {},
      conditionHistory:         [],
      id:                       crypto.randomUUID(),
    };

    rows.push(parsed);
  }

  return { rows, warnings };
}

function renderImportPreview(state) {
  const totalEl   = document.getElementById("import-total-count");
  const validEl   = document.getElementById("import-valid-count");
  const invalidEl = document.getElementById("import-invalid-count");
  const warningsEl = document.getElementById("import-warnings");
  const previewTable = document.getElementById("import-preview-table");
  const emptyState = document.getElementById("import-empty-state");
  const submitBtn = document.getElementById("import-submit");

  if (!_importRows.length && !_importWarnings.length) {
    // Nothing loaded
    hide("import-preview-stats");
    hide("import-preview-table");
    hide("import-warnings");
    show("import-empty-state");
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  // Stats
  show("import-preview-stats");
  if (totalEl) totalEl.textContent = _importRows.length + _importWarnings.length;
  if (validEl) validEl.textContent = _importRows.length;
  if (invalidEl) invalidEl.textContent = _importWarnings.length;

  // Warnings list
  if (_importWarnings.length) {
    show("import-warnings");
    if (warningsEl) {
      warningsEl.innerHTML = _importWarnings
        .map((w) => `<li>${escapeHTML(w)}</li>`)
        .join("");
    }
  } else {
    hide("import-warnings");
  }

  hide("import-empty-state");

  // Preview table — first 10 rows
  if (_importRows.length) {
    show("import-preview-table");
    const thead = document.getElementById("import-preview-header");
    const tbody = document.getElementById("import-preview-body");
    const displayCols = ["name", "model", "serialNumber", "location", "status", "calibrationRequired"];
    const displayLabels = ["Name", "Model", "Serial", "Location", "Status", "Cal?"];

    if (thead) {
      thead.innerHTML = `<tr>${displayLabels.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr>`;
    }
    if (tbody) {
      const preview = _importRows.slice(0, 10);
      tbody.innerHTML = preview.map((row) =>
        `<tr>${displayCols.map((col) => `<td>${escapeHTML(String(row[col] ?? ""))}</td>`).join("")}</tr>`
      ).join("");
    }

    // Check duplicate serials against existing equipment
    const existingSerials = new Set(
      (state.equipment ?? [])
        .map((eq) => eq.serialNumber?.toLowerCase())
        .filter(Boolean)
    );
    const dupMode = document.getElementById("import-duplicate-behavior")?.value ?? "skip";
    const dups = _importRows.filter(
      (r) => r.serialNumber && existingSerials.has(r.serialNumber.toLowerCase())
    );
    if (dups.length) {
      show("import-warnings");
      if (warningsEl) {
        const dupWarnings = dups.map(
          (d) => `Serial "${d.serialNumber}" already exists — will ${dupMode === "skip" ? "be skipped" : "be imported anyway"}.`
        );
        warningsEl.innerHTML =
          [..._importWarnings, ...dupWarnings].map((w) => `<li>${escapeHTML(w)}</li>`).join("");
      }
    }

    if (submitBtn) submitBtn.disabled = false;
  } else {
    hide("import-preview-table");
    if (submitBtn) submitBtn.disabled = true;
  }
}

function downloadCSVTemplate() {
  const content = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`;
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "equipment-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImportSubmit(state, { repository, showToast }) {
  if (!_importRows.length) return;

  const dupMode = document.getElementById("import-duplicate-behavior")?.value ?? "skip";
  const existingSerials = new Set(
    (state.equipment ?? [])
      .map((eq) => eq.serialNumber?.toLowerCase())
      .filter(Boolean)
  );

  let rows = _importRows;
  if (dupMode === "skip") {
    rows = rows.filter(
      (r) => !r.serialNumber || !existingSerials.has(r.serialNumber.toLowerCase())
    );
  }

  if (!rows.length) {
    showToast("No rows to import after filtering duplicates.", "error");
    return;
  }

  try {
    await repository.importEquipment(rows);
    showToast(`${rows.length} item(s) imported.`, "success");
    // Reset import state
    _importRows = [];
    _importWarnings = [];
    const fileInput = document.getElementById("import-file-input");
    if (fileInput) fileInput.value = "";
    renderImportPreview(state);
  } catch (err) {
    showToast(`Import failed: ${err.message}`, "error");
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire all Admin view event listeners.
 * @param {{ repository: object, showToast: Function }} deps
 * @returns {{ syncState(state): void }}
 */
export function bindAdminEvents({ repository, showToast }) {
  let _state   = { equipment: [], moves: [], corrections: [], locations: [] };
  let _editId  = () => val("edit-equipment-select");

  // ── Add-equipment toggles ──────────────────────────────────────────────────

  document.getElementById("new-equipment-calibration-required")
    ?.addEventListener("change", syncAddCalibrationFields);
  document.getElementById("new-equipment-calibration-interval")
    ?.addEventListener("change", syncAddCalibrationFields);
  document.getElementById("new-equipment-subscription-required")
    ?.addEventListener("change", syncAddSubscriptionFields);

  // Duplicate serial warning (live)
  document.getElementById("new-equipment-serial")?.addEventListener("input", () => {
    const serial = val("new-equipment-serial");
    const duplicate = serial && (_state.equipment ?? []).some(
      (eq) => eq.serialNumber && eq.serialNumber.toLowerCase() === serial.toLowerCase()
    );
    duplicate ? show("new-equipment-serial-warning") : hide("new-equipment-serial-warning");
  });

  // Add-equipment form submit
  document.getElementById("add-equipment-form")?.addEventListener("submit", (e) => {
    handleAddEquipmentSubmit(e, _state, { repository, showToast });
  });

  // Initial sync of add-form toggle visibility
  syncAddCalibrationFields();
  syncAddSubscriptionFields();

  // ── Edit-equipment ─────────────────────────────────────────────────────────

  // Populate fields when a different item is selected
  document.getElementById("edit-equipment-select")?.addEventListener("change", () => {
    populateEditForm(_editId(), _state.equipment ?? []);
  });

  // Calibration toggles
  document.getElementById("edit-equipment-calibration-required")
    ?.addEventListener("change", syncEditCalibrationFields);
  document.getElementById("edit-equipment-calibration-interval")
    ?.addEventListener("change", syncEditCalibrationFields);

  // Subscription toggle
  document.getElementById("edit-equipment-subscription-required")
    ?.addEventListener("change", syncEditSubscriptionFields);

  // Duplicate name warning (live)
  document.getElementById("edit-equipment-name")?.addEventListener("input", () => {
    const name = val("edit-equipment-name");
    const id   = _editId();
    const duplicate = name && (_state.equipment ?? []).some(
      (eq) => eq.id !== id && eq.name.toLowerCase() === name.toLowerCase()
    );
    duplicate ? show("edit-equipment-name-warning") : hide("edit-equipment-name-warning");
  });

  // Duplicate serial warning (live)
  document.getElementById("edit-equipment-serial")?.addEventListener("input", () => {
    const serial = val("edit-equipment-serial");
    const id     = _editId();
    const duplicate = serial && (_state.equipment ?? []).some(
      (eq) => eq.id !== id && eq.serialNumber &&
              eq.serialNumber.toLowerCase() === serial.toLowerCase()
    );
    duplicate ? show("edit-equipment-serial-warning") : hide("edit-equipment-serial-warning");
  });

  // Copy-checklist: enable button when source is selected
  document.getElementById("edit-equipment-copy-source")?.addEventListener("change", () => {
    const sourceId = val("edit-equipment-copy-source");
    const btn = document.getElementById("edit-equipment-copy-button");
    if (btn) btn.disabled = !sourceId;
    hide("edit-equipment-copy-warning");
  });

  // Copy-checklist: button click
  document.getElementById("edit-equipment-copy-button")?.addEventListener("click", () => {
    const sourceId = val("edit-equipment-copy-source");
    const source = (_state.equipment ?? []).find((eq) => eq.id === sourceId);
    if (!source) return;

    const ref = source.conditionReference ?? {};
    const contents  = Array.isArray(ref.contents)   ? ref.contents.join("\n")   : "";
    const functional = Array.isArray(ref.functional) ? ref.functional.join("\n") : "";

    const contentsEl   = document.getElementById("edit-equipment-contents-checklist");
    const functionalEl = document.getElementById("edit-equipment-functional-checklist");
    if (contentsEl) contentsEl.value = contents;
    if (functionalEl) functionalEl.value = functional;

    show("edit-equipment-copy-warning");
  });

  // Cancel button
  document.getElementById("edit-equipment-cancel")?.addEventListener("click", () => {
    document.getElementById("edit-equipment-form")?.reset();
    populateEditForm("", _state.equipment ?? []);
    syncEditCalibrationFields();
    syncEditSubscriptionFields();
    hide("edit-equipment-name-error");
    hide("edit-equipment-name-warning");
    hide("edit-equipment-serial-warning");
    hide("edit-equipment-copy-warning");
  });

  // Edit-equipment form submit
  document.getElementById("edit-equipment-form")?.addEventListener("submit", (e) => {
    handleEditEquipmentSubmit(e, _state, { repository, showToast, _editId });
  });

  // ── Calibration form ───────────────────────────────────────────────────────

  document.getElementById("calibration-form")?.addEventListener("submit", (e) => {
    handleCalibrationSubmit(e, _state, { repository, showToast });
  });

  // ── CSV import ─────────────────────────────────────────────────────────────

  document.getElementById("import-template-button")
    ?.addEventListener("click", downloadCSVTemplate);

  document.getElementById("import-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, warnings } = parseCSV(ev.target.result);
      _importRows    = rows;
      _importWarnings = warnings;
      renderImportPreview(_state);
    };
    reader.readAsText(file);
  });

  document.getElementById("import-duplicate-behavior")?.addEventListener("change", () => {
    renderImportPreview(_state);
  });

  document.getElementById("import-submit")?.addEventListener("click", () => {
    handleImportSubmit(_state, { repository, showToast });
  });

  document.getElementById("import-clear")?.addEventListener("click", () => {
    _importRows    = [];
    _importWarnings = [];
    const fileInput = document.getElementById("import-file-input");
    if (fileInput) fileInput.value = "";
    renderImportPreview(_state);
  });

  // Initial preview state
  renderImportPreview(_state);

  return {
    syncState(state) {
      _state = state;
    },
  };
}
