const STORAGE_KEY = "equipmentTrackerState";
const TAB_STORAGE_KEY = "equipmentTrackerActiveTab";
const ADMIN_MODE_KEY = "equipmentTrackerAdminMode";
const ADMIN_PASSCODE_KEY = "equipmentTrackerAdminPasscode";
// === PCTE DEBUG TRIPWIRE v2 ===
(function tripwireV2() {
  const blockClose = function () {
    console.warn("Blocked window.close()", new Error("close stack").stack);
  };
  try {
    window.close = blockClose;
    self.close = blockClose;
  } catch (_) {}

  window.addEventListener("pagehide", () => {
    console.warn("Lifecycle: pagehide", location.href);
  });
  window.addEventListener("unload", () => {
    console.warn("Lifecycle: unload", location.href);
  });

  document.addEventListener(
    "submit",
    (e) => {
      console.warn("Form submit blocked:", e.target);
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (a && a.getAttribute("href") && a.getAttribute("href") !== "#") {
        console.warn("Link navigation blocked:", a.getAttribute("href"), a);
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
})();
// === /PCTE DEBUG TRIPWIRE v2 ===

const physicalLocations = [
  "Perth",
  "Melbourne",
  "Brisbane",
  "Sydney",
  "New Zealand",
];

const editableStatusOptions = [
  "Available",
  "On demo",
  "On hire",
  "In service / repair",
  "Quarantined",
];

const statusFilterOptions = [...editableStatusOptions, "In transit"];

const calibrationFilterOptions = [
  "All",
  "Overdue",
  "Due soon",
  "OK",
  "Unknown",
  "Not required",
];

const subscriptionFilterOptions = [
  "All",
  "OK",
  "Due soon",
  "Overdue",
  "Unknown",
  "Not required",
];

const moveConditionExemptStatuses = new Set([
  "In service / repair",
  "Quarantined",
]);

const moveTypeOptions = [
  { value: "all", label: "All types" },
  { value: "move", label: "Move" },
  { value: "calibration", label: "Calibration" },
  { value: "subscription_updated", label: "Subscription" },
  { value: "details_updated", label: "Details updated" },
  { value: "correction", label: "Correction" },
  {
    value: "condition_reference_updated",
    label: "Condition checklist",
  },
  {
    value: "received",
    label: "Received",
  },
];

function normalizeStatus(rawStatus, rawLocation) {
  const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (status && /calibration/i.test(status)) {
    return "Quarantined";
  }
  if (editableStatusOptions.includes(status)) {
    return status;
  }
  const location =
    typeof rawLocation === "string" ? rawLocation.trim().toLowerCase() : "";
  if (location === "on hire") {
    return "On hire";
  }
  return "Available";
}

function getSeedDate({ months = 0, days = 0 } = {}) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function buildDefaultState() {
  const projectionKitId = crypto.randomUUID();
  const audioDemoId = crypto.randomUUID();
  const lightingRigId = crypto.randomUUID();
  const portableControlId = crypto.randomUUID();
  return {
    equipment: [
      {
        id: projectionKitId,
        name: "Projection kit A",
        model: "Epson EB-PU1007B",
        serialNumber: "PKA-2024-0198",
        purchaseDate: getSeedDate({ months: -28 }),
        location: "Perth",
        status: "Available",
        lastMoved: "2024-05-14 09:10",
        conditionReference: {
          contentsChecklist: "",
          functionalChecklist: "",
        },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -3 }),
        subscriptionRequired: false,
        subscriptionRenewalDate: "",
      },
      {
        id: audioDemoId,
        name: "Audio demo case",
        model: "Pelican 1510",
        serialNumber: "ADC-2023-4421",
        purchaseDate: getSeedDate({ months: -18 }),
        location: "Melbourne",
        status: "On demo",
        lastMoved: "2024-05-12 16:45",
        conditionReference: {
          contentsChecklist: "",
          functionalChecklist: "",
        },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        calibrationRequired: false,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -6 }),
        subscriptionRequired: false,
        subscriptionRenewalDate: "",
      },
      {
        id: lightingRigId,
        name: "Lighting rig",
        model: "Aputure LS 600X",
        serialNumber: "LR-2022-7785",
        purchaseDate: getSeedDate({ months: -36 }),
        location: "Perth",
        status: "On hire",
        lastMoved: "2024-05-10 11:00",
        conditionReference: {
          contentsChecklist: "",
          functionalChecklist: "",
        },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -14 }),
        subscriptionRequired: false,
        subscriptionRenewalDate: "",
      },
      {
        id: portableControlId,
        name: "Portable control unit",
        model: "Q-SYS Core 8 Flex",
        serialNumber: "PCU-2024-1043",
        purchaseDate: getSeedDate({ months: -12 }),
        location: "Sydney",
        status: "In service / repair",
        lastMoved: "2024-05-11 13:25",
        conditionReference: {
          contentsChecklist: "",
          functionalChecklist: "",
        },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -10, days: -5 }),
        subscriptionRequired: false,
        subscriptionRenewalDate: "",
      },
    ],
    moves: [
      {
        id: crypto.randomUUID(),
        equipmentId: lightingRigId,
        equipmentSnapshot: {
          name: "Lighting rig",
          model: "Aputure LS 600X",
          serialNumber: "LR-2022-7785",
        },
        type: "move",
        text: "Lighting rig moved to Perth with status On hire (Client demo).",
        timestamp: "2024-05-10T11:00:00.000Z",
      },
    ],
  };
}

const defaultState = buildDefaultState();

const state = loadState();
const equipmentList = Array.isArray(state.equipment)
  ? state.equipment
  : Array.isArray(state.items)
    ? state.items
    : [];
const equipmentById = new Map(
  equipmentList.map((equipment) => [String(equipment.id), equipment])
);
const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const elements = {
  locationFilter: document.querySelector("#location-filter"),
  statusFilter: document.querySelector("#status-filter"),
  calibrationFilter: document.querySelector("#calibration-filter"),
  subscriptionFilter: document.querySelector("#subscription-filter"),
  searchInput: document.querySelector("#search-input"),
  equipmentTable: document.querySelector("#equipment-table"),
  moveForm: document.querySelector("#move-form"),
  moveEquipment: document.querySelector("#move-equipment"),
  moveLocation: document.querySelector("#move-location"),
  moveStatus: document.querySelector("#move-status"),
  moveNotes: document.querySelector("#move-notes"),
  moveShippingCarrier: document.querySelector("#move-shipping-carrier"),
  moveShippingTracking: document.querySelector("#move-shipping-tracking"),
  moveShippingShipDate: document.querySelector("#move-shipping-ship-date"),
  moveShippingEtaDate: document.querySelector("#move-shipping-eta-date"),
  moveShippingOverrideNote: document.querySelector("#move-shipping-override-note"),
  moveConditionRating: document.querySelector("#move-condition-rating"),
  moveContentsOk: document.querySelector("#move-contents-ok"),
  moveFunctionalOk: document.querySelector("#move-functional-ok"),
  moveConditionNotes: document.querySelector("#move-condition-notes"),
  moveConditionNotesError: document.querySelector(
    "#move-condition-notes-error"
  ),
  moveConditionExemptNote: document.querySelector("#move-condition-exempt-note"),
  moveContentsChecklist: document.querySelector("#move-contents-checklist"),
  moveContentsChecklistEmpty: document.querySelector(
    "#move-contents-checklist-empty"
  ),
  moveFunctionalChecklist: document.querySelector(
    "#move-functional-checklist"
  ),
  moveFunctionalChecklistEmpty: document.querySelector(
    "#move-functional-checklist-empty"
  ),
  moveChecklistLock: document.querySelector("#move-checklist-lock"),
  moveChecklistAdminLink: document.querySelector(
    "#move-checklist-admin-link"
  ),
  moveSubmitBlocked: document.querySelector("#move-submit-blocked"),
  moveSubmit: document.querySelector("#move-submit"),
  toastContainer: document.querySelector("#toast-container"),
  calibrationForm: document.querySelector("#calibration-form"),
  calibrationEquipment: document.querySelector("#calibration-equipment"),
  calibrationDate: document.querySelector("#calibration-date"),
  calibrationInterval: document.querySelector("#calibration-interval"),
  calibrationRequired: document.querySelector("#calibration-required"),
  addEquipmentForm: document.querySelector("#add-equipment-form"),
  addEquipmentName: document.querySelector("#new-equipment-name"),
  addEquipmentModel: document.querySelector("#new-equipment-model"),
  addEquipmentSerial: document.querySelector("#new-equipment-serial"),
  addEquipmentSerialWarning: document.querySelector(
    "#new-equipment-serial-warning"
  ),
  addEquipmentPurchaseDate: document.querySelector(
    "#new-equipment-purchase-date"
  ),
  addEquipmentLocation: document.querySelector("#new-equipment-location"),
  addEquipmentStatus: document.querySelector("#new-equipment-status"),
  addEquipmentCalibrationRequired: document.querySelector(
    "#new-equipment-calibration-required"
  ),
  addEquipmentCalibrationInterval: document.querySelector(
    "#new-equipment-calibration-interval"
  ),
  addEquipmentCalibrationIntervalCustom: document.querySelector(
    "#new-equipment-calibration-interval-custom"
  ),
  addEquipmentCalibrationIntervalField: document.querySelector(
    "#new-equipment-calibration-interval-field"
  ),
  addEquipmentCalibrationIntervalCustomField: document.querySelector(
    "#new-equipment-calibration-interval-custom-field"
  ),
  addEquipmentLastCalibration: document.querySelector(
    "#new-equipment-last-calibration"
  ),
  addEquipmentLastCalibrationField: document.querySelector(
    "#new-equipment-last-calibration-field"
  ),
  addEquipmentSubscriptionRequired: document.querySelector(
    "#new-equipment-subscription-required"
  ),
  addEquipmentSubscriptionDate: document.querySelector(
    "#new-equipment-subscription-date"
  ),
  addEquipmentSubscriptionDateField: document.querySelector(
    "#new-equipment-subscription-date-field"
  ),
  editEquipmentForm: document.querySelector("#edit-equipment-form"),
  editEquipmentSelect: document.querySelector("#edit-equipment-select"),
  editEquipmentName: document.querySelector("#edit-equipment-name"),
  editEquipmentNameError: document.querySelector(
    "#edit-equipment-name-error"
  ),
  editEquipmentNameWarning: document.querySelector(
    "#edit-equipment-name-warning"
  ),
  editEquipmentModel: document.querySelector("#edit-equipment-model"),
  editEquipmentSerial: document.querySelector("#edit-equipment-serial"),
  editEquipmentSerialWarning: document.querySelector(
    "#edit-equipment-serial-warning"
  ),
  editEquipmentPurchaseDate: document.querySelector(
    "#edit-equipment-purchase-date"
  ),
  editEquipmentLocation: document.querySelector("#edit-equipment-location"),
  editEquipmentStatus: document.querySelector("#edit-equipment-status"),
  editEquipmentCalibrationRequired: document.querySelector(
    "#edit-equipment-calibration-required"
  ),
  editEquipmentCalibrationInterval: document.querySelector(
    "#edit-equipment-calibration-interval"
  ),
  editEquipmentCalibrationIntervalCustom: document.querySelector(
    "#edit-equipment-calibration-interval-custom"
  ),
  editEquipmentCalibrationIntervalField: document.querySelector(
    "#edit-equipment-calibration-interval-field"
  ),
  editEquipmentCalibrationIntervalCustomField: document.querySelector(
    "#edit-equipment-calibration-interval-custom-field"
  ),
  editEquipmentLastCalibration: document.querySelector(
    "#edit-equipment-last-calibration"
  ),
  editEquipmentLastCalibrationField: document.querySelector(
    "#edit-equipment-last-calibration-field"
  ),
  editEquipmentSubscriptionRequired: document.querySelector(
    "#edit-equipment-subscription-required"
  ),
  editEquipmentSubscriptionDate: document.querySelector(
    "#edit-equipment-subscription-date"
  ),
  editEquipmentSubscriptionDateField: document.querySelector(
    "#edit-equipment-subscription-date-field"
  ),
  editEquipmentContentsChecklist: document.querySelector(
    "#edit-equipment-contents-checklist"
  ),
  editEquipmentFunctionalChecklist: document.querySelector(
    "#edit-equipment-functional-checklist"
  ),
  editEquipmentCopySource: document.querySelector(
    "#edit-equipment-copy-source"
  ),
  editEquipmentCopyButton: document.querySelector(
    "#edit-equipment-copy-button"
  ),
  editEquipmentCopyWarning: document.querySelector(
    "#edit-equipment-copy-warning"
  ),
  editEquipmentCancel: document.querySelector("#edit-equipment-cancel"),
  historyList: document.querySelector("#history-list"),
  clearHistory: document.querySelector("#clear-history"),
  statTotal: document.querySelector("#stat-total"),
  statHire: document.querySelector("#stat-hire"),
  statOverdue: document.querySelector("#stat-overdue"),
  statDueSoon: document.querySelector("#stat-due-soon"),
  statOverdueSubscription: document.querySelector(
    "#stat-overdue-subscription"
  ),
  statDueSoonSubscription: document.querySelector(
    "#stat-due-soon-subscription"
  ),
  locationSummary: document.querySelector("#location-summary"),
  operationsView: document.querySelector("#operations-view"),
  movesView: document.querySelector("#moves-view"),
  adminView: document.querySelector("#admin-view"),
  movesEquipmentFilter: document.querySelector("#moves-equipment-filter"),
  movesTypeFilter: document.querySelector("#moves-type-filter"),
  movesShowDeleted: document.querySelector("#moves-show-deleted"),
  movesSearch: document.querySelector("#moves-search"),
  movesTableHeader: document.querySelector("#moves-table-header"),
  movesTableBody: document.querySelector("#moves-table-body"),
  movesDestinationFilter: document.querySelector("#moves-destination-filter"),
  movesReceiptOnly: document.querySelector("#moves-receipt-only"),
  adminModeToggle: document.querySelector("#admin-mode-toggle"),
  adminTabButton: document.querySelector("#tab-button-admin"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab]")),
  adminTabButton: document.querySelector("#tab-button-admin"),
  adminModeToggle: document.querySelector("#admin-mode-toggle"),
  adminPasscodeDialog: document.querySelector("#admin-passcode-dialog"),
  adminPasscodeForm: document.querySelector("#admin-passcode-form"),
  adminPasscodeTitle: document.querySelector("#admin-passcode-title"),
  adminPasscodeHint: document.querySelector("#admin-passcode-hint"),
  adminPasscodeInput: document.querySelector("#admin-passcode-input"),
  adminPasscodeVerify: document.querySelector("#admin-passcode-verify"),
  adminPasscodeSetup: document.querySelector("#admin-passcode-setup"),
  adminPasscodeNew: document.querySelector("#admin-passcode-new"),
  adminPasscodeConfirm: document.querySelector("#admin-passcode-confirm"),
  adminPasscodeError: document.querySelector("#admin-passcode-error"),
  adminPasscodeCancel: document.querySelector("#admin-passcode-cancel"),
  adminPasscodeSubmit: document.querySelector("#admin-passcode-submit"),
  adminPasscodeSettingsForm: document.querySelector(
    "#admin-passcode-settings"
  ),
  adminPasscodeCurrent: document.querySelector("#admin-passcode-current"),
  adminPasscodeUpdate: document.querySelector("#admin-passcode-update"),
  adminPasscodeUpdateConfirm: document.querySelector(
    "#admin-passcode-update-confirm"
  ),
  adminPasscodeUpdateError: document.querySelector(
    "#admin-passcode-update-error"
  ),
  adminPasscodeUpdateSuccess: document.querySelector(
    "#admin-passcode-update-success"
  ),
  importTemplateButton: document.querySelector("#import-template-button"),
  importFileInput: document.querySelector("#import-file-input"),
  importDuplicateBehavior: document.querySelector(
    "#import-duplicate-behavior"
  ),
  importSummary: document.querySelector("#import-summary"),
  importTotalCount: document.querySelector("#import-total-count"),
  importValidCount: document.querySelector("#import-valid-count"),
  importInvalidCount: document.querySelector("#import-invalid-count"),
  importPreviewHeader: document.querySelector("#import-preview-header"),
  importPreviewBody: document.querySelector("#import-preview-body"),
  importPreviewTable: document.querySelector(".import-preview-table"),
  importWarnings: document.querySelector("#import-warnings"),
  importEmptyState: document.querySelector("#import-empty-state"),
  importSubmit: document.querySelector("#import-submit"),
  importClear: document.querySelector("#import-clear"),
  conditionHistoryModal: document.querySelector("#condition-history-modal"),
  conditionHistoryTitle: document.querySelector("#condition-history-title"),
  conditionHistoryList: document.querySelector("#condition-history-list"),
  conditionHistoryClose: document.querySelector("#condition-history-close"),
};

let adminModeEnabled = false;
let isMoveSaving = false;
let pendingAdminAction = null;
const moveSubmitDefaultLabel = elements.moveSubmit?.textContent?.trim() || "Record move";
const equipmentImportTemplateHeaders = [
  "name",
  "model",
  "serialNumber",
  "purchaseDate",
  "location",
  "status",
  "calibrationRequired",
  "calibrationIntervalMonths",
  "lastCalibrationDate",
];
const equipmentImportState = {
  rawRows: [],
  rows: [],
  warnings: [],
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  duplicateBehavior: "skip",
};
let editChecklistCopySourceId = "";
let editChecklistCopyMetadata = null;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function showToast(message, type = "info") {
  if (!elements.toastContainer) {
    return;
  }
  const allowedTypes = new Set(["success", "error", "info"]);
  const safeType = allowedTypes.has(type) ? type : "info";
  const toast = document.createElement("div");
  toast.className = `toast toast--${safeType}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  const timeoutId = window.setTimeout(() => {
    toast.remove();
  }, 3000);
  toast.addEventListener("click", () => {
    window.clearTimeout(timeoutId);
    toast.remove();
  });
}

function setMoveSubmitSaving(isSaving) {
  if (!elements.moveSubmit) {
    return;
  }
  if (isSaving) {
    elements.moveSubmit.textContent = "Saving...";
    elements.moveSubmit.disabled = true;
    return;
  }
  elements.moveSubmit.textContent = moveSubmitDefaultLabel;
  validateMoveConditionChecklist();
}

function resetMoveForm() {
  if (!elements.moveForm) {
    return;
  }
  if (elements.moveNotes) {
    elements.moveNotes.value = "";
  }
  if (elements.moveStatus) {
    elements.moveStatus.value = "Keep current status";
  }
  resetMoveConditionInputs();
  if (elements.moveShippingCarrier) {
    elements.moveShippingCarrier.value = "";
  }
  if (elements.moveShippingTracking) {
    elements.moveShippingTracking.value = "";
  }
  if (elements.moveShippingShipDate) {
    elements.moveShippingShipDate.value = formatDate(new Date());
  }
  if (elements.moveShippingEtaDate) {
    elements.moveShippingEtaDate.value = "";
  }
  syncMoveShippingStatusOverride();
}

function highlightEquipmentRow(equipmentId) {
  if (!equipmentId || !elements.equipmentTable || elements.operationsView?.hidden) {
    return;
  }
  const row = elements.equipmentTable.querySelector(
    `tr[data-equipment-id="${CSS.escape(equipmentId)}"]`
  );
  if (!row) {
    return;
  }
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.remove("equipment-row-highlight");
  void row.offsetWidth;
  row.classList.add("equipment-row-highlight");
  window.setTimeout(() => {
    row.classList.remove("equipment-row-highlight");
  }, 1600);
}

function getEquipmentListFromState() {
  if (Array.isArray(state.equipment)) {
    return state.equipment;
  }
  if (Array.isArray(state.items)) {
    return state.items;
  }
  return [];
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return buildSeededState();
  }
  try {
    const parsed = JSON.parse(stored);
    const { equipment, moves, log, migratedKeys } = migrateStoredState(parsed);
    if (migratedKeys.length) {
      console.warn(
        `Migrated stored state: ${migratedKeys.join(", ")}`
      );
    }

    const normalized = normalizeState({ equipment, moves, log });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.warn("Failed to load stored state", error);
    return buildSeededState();
  }
}

function buildSeededState() {
  const seededState = buildDefaultState();
  return {
    ...seededState,
    locations: [...physicalLocations],
  };
}

function findArrayFallback(data, predicate) {
  if (!data || typeof data !== "object") {
    return null;
  }
  return Object.values(data).find(
    (value) => Array.isArray(value) && predicate(value)
  );
}

function migrateStoredState(parsed) {
  const safeParsed =
    parsed && typeof parsed === "object" ? parsed : {};
  const migratedKeys = [];
  let equipment = Array.isArray(safeParsed.equipment)
    ? safeParsed.equipment
    : null;
  if (!equipment && Array.isArray(safeParsed.items)) {
    equipment = safeParsed.items;
    migratedKeys.push("items→equipment");
  }
  if (!equipment) {
    const fallback = findArrayFallback(
      safeParsed,
      (list) =>
        list.some(
          (item) =>
            item &&
            typeof item === "object" &&
            ("name" in item || "serialNumber" in item)
        )
    );
    if (fallback) {
      equipment = fallback;
      migratedKeys.push("array→equipment");
    }
  }

  let moves = Array.isArray(safeParsed.moves) ? safeParsed.moves : null;
  let log = Array.isArray(safeParsed.log) ? safeParsed.log : null;
  if (!moves && Array.isArray(safeParsed.history)) {
    moves = safeParsed.history;
    migratedKeys.push("history→moves");
  }
  if (!moves) {
    const fallback = findArrayFallback(
      safeParsed,
      (list) =>
        list.some(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            ("text" in entry || "timestamp" in entry)
        )
    );
    if (fallback) {
      moves = fallback;
      migratedKeys.push("array→moves");
    }
  }

  return {
    equipment: Array.isArray(equipment) ? equipment : [],
    moves: Array.isArray(moves) ? moves : [],
    log: Array.isArray(log) ? log : null,
    migratedKeys,
  };
}

function normalizeState({ equipment = [], moves = [], log } = {}) {
  const corrections = [];
  const normalizedEquipment = equipment.map((item) => {
    const normalizedItem = normalizeEquipment(item);
    const rawLocation = normalizedItem.location || physicalLocations[0];
    const safeLocation = physicalLocations.includes(rawLocation)
      ? rawLocation
      : physicalLocations[0];
    if (safeLocation !== rawLocation) {
      const nameLabel = normalizedItem.name?.trim()
        ? normalizedItem.name
        : "equipment";
      corrections.push({
        id: crypto.randomUUID(),
        text: `Location corrected for ${nameLabel} (was "${rawLocation}").`,
        timestamp: formatTimestamp(),
      });
    }
    const derivedStatus = normalizeStatus(
      normalizedItem.status,
      safeLocation
    );
    if (normalizedItem.status === "In transit" && derivedStatus !== "In transit") {
      corrections.push({
        id: crypto.randomUUID(),
        text: `Legacy status migrated for ${normalizedItem.name} (In transit → ${derivedStatus}).`,
        timestamp: formatTimestamp(),
      });
    }

    return {
      ...normalizedItem,
      location: safeLocation,
      status: derivedStatus,
      ...normalizeCalibrationFields(normalizedItem),
      ...normalizeSubscriptionFields(normalizedItem),
    };
  });

  const equipmentList = Array.isArray(normalizedEquipment)
    ? normalizedEquipment
    : [];
  const equipmentById = new Map(
    equipmentList.map((equipment) => [String(equipment.id), equipment])
  );
  const equipmentByName = new Map(
    equipmentList.map((equipment) => [norm(equipment.name), equipment])
  );

  const movesLegacy = Array.isArray(log) ? log : [];
  const movesNew = Array.isArray(moves) ? moves : [];
  const allMoves = [...movesLegacy, ...movesNew];

  const backfilledMoves = backfillMovesWithEquipment(
    allMoves,
    equipmentList,
    equipmentById,
    equipmentByName
  );
  const dedupedMoves = dedupeHistoryEntries(backfilledMoves);

  const normalizedMoves = normalizeHistoryEntries(
    corrections.length ? [...corrections, ...dedupedMoves] : dedupedMoves,
    normalizedEquipment
  );

  const normalizedState = {
    locations: [...physicalLocations],
    equipment: normalizedEquipment,
    moves: normalizedMoves,
  };

  normalizedState.equipment.forEach((item) => {
    const derivedCondition = getLatestConditionEntryFromMoves(
      item.id,
      normalizedMoves
    );
    if (derivedCondition) {
      applyConditionSnapshot(item, derivedCondition);
      return;
    }
    if (!item.currentCondition || !item.lastConditionCheckAt) {
      applyConditionSnapshot(item, item.currentCondition || null);
    }
  });

  if (Array.isArray(log)) {
    normalizedState.log = log;
  }

  return normalizedState;
}

function inferHistoryTypeFromText(text = "") {
  const normalized = text.toLowerCase();
  if (normalized.includes("calibration")) {
    return "calibration";
  }
  if (normalized.includes("subscription")) {
    return "subscription_updated";
  }
  if (
    normalized.includes("details updated") ||
    normalized.includes("added") ||
    normalized.includes("location corrected")
  ) {
    return "details_updated";
  }
  return "move";
}

const equipmentIdPattern =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function parseEquipmentIdFromText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  const match = text.match(equipmentIdPattern);
  return match ? match[1] : "";
}

function parseEquipmentIdFromNotes(notes) {
  if (!notes || typeof notes !== "string") {
    return "";
  }
  const match = notes.match(
    /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/i
  );
  return match ? match[1] : "";
}

function normalizeHistoryType(rawType, fallbackText = "") {
  if (typeof rawType === "string" && rawType.trim()) {
    const normalized = rawType.trim().toLowerCase();
    if (normalized === "details updated") {
      return "details_updated";
    }
    if (normalized.includes("details")) {
      return "details_updated";
    }
    if (normalized.includes("calibration")) {
      return "calibration";
    }
    if (normalized.includes("subscription")) {
      return "subscription_updated";
    }
    if (normalized.includes("correction")) {
      return "correction";
    }
    if (normalized.includes("condition_reference")) {
      return "condition_reference_updated";
    }
    if (normalized === "condition") {
      return "condition";
    }
    if (normalized.includes("condition checklist")) {
      return "condition_reference_updated";
    }
    if (normalized.includes("move")) {
      return "move";
    }
    if (normalized === "details_updated") {
      return "details_updated";
    }
    if (normalized === "subscription_updated") {
      return "subscription_updated";
    }
    if (normalized === "correction") {
      return "correction";
    }
    if (normalized === "condition_reference_updated") {
      return "condition_reference_updated";
    }
    if (normalized === "condition") {
      return "condition";
    }
  }
  return inferHistoryTypeFromText(fallbackText);
}

function normalizeConditionRating(value) {
  const allowed = [
    "Excellent",
    "Good",
    "Fair",
    "Needs attention",
    "Missing",
    "Fault",
    "Unserviceable",
  ];
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.includes(text) ? text : "";
}

function normalizeConditionCheckValue(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes" || normalized === "true") {
      return true;
    }
    if (normalized === "no" || normalized === "false") {
      return false;
    }
  }
  return null;
}

function normalizeConditionLogEntry(rawCondition = {}) {
  const safeCondition =
    rawCondition && typeof rawCondition === "object" ? rawCondition : {};
  const rating = normalizeConditionRating(safeCondition.rating);
  const contentsOk = normalizeConditionCheckValue(safeCondition.contentsOk);
  const functionalOk = normalizeConditionCheckValue(safeCondition.functionalOk);
  const notes =
    typeof safeCondition.notes === "string" ? safeCondition.notes.trim() : "";
  const checkedAt =
    typeof safeCondition.checkedAt === "string" && safeCondition.checkedAt.trim()
      ? safeCondition.checkedAt
      : "";
  const checkedBy =
    typeof safeCondition.checkedBy === "string" ? safeCondition.checkedBy.trim() : "";
  if (!rating && contentsOk === null && functionalOk === null && !notes && !checkedAt && !checkedBy) {
    return null;
  }
  return {
    rating,
    contentsOk,
    functionalOk,
    notes,
    checkedAt,
    checkedBy,
  };
}

function normalizeEquipmentConditionFields(item = {}) {
  const currentCondition = normalizeConditionLogEntry(item.currentCondition);
  const conditionRating = normalizeConditionRating(item.conditionRating);
  const conditionContentsOk = normalizeConditionCheckValue(item.conditionContentsOk);
  const conditionFunctionalOk = normalizeConditionCheckValue(item.conditionFunctionalOk);
  const conditionLastCheckedAt =
    typeof item.conditionLastCheckedAt === "string" ? item.conditionLastCheckedAt : "";
  const conditionLastCheckedBy =
    typeof item.conditionLastCheckedBy === "string" ? item.conditionLastCheckedBy : "";
  const conditionLastNotes =
    typeof item.conditionLastNotes === "string" ? item.conditionLastNotes : "";
  const fallbackCurrentCondition =
    currentCondition ||
    normalizeConditionLogEntry({
      rating: conditionRating,
      contentsOk: conditionContentsOk,
      functionalOk: conditionFunctionalOk,
      checkedAt: conditionLastCheckedAt,
      checkedBy: conditionLastCheckedBy,
      notes: conditionLastNotes,
    });
  const lastConditionCheckAtRaw =
    typeof item.lastConditionCheckAt === "string" ? item.lastConditionCheckAt : "";
  const lastConditionCheckAt =
    lastConditionCheckAtRaw ||
    fallbackCurrentCondition?.checkedAt ||
    conditionLastCheckedAt;
  return {
    conditionRating,
    conditionContentsOk,
    conditionFunctionalOk,
    conditionLastCheckedAt,
    conditionLastCheckedBy,
    conditionLastNotes,
    currentCondition: fallbackCurrentCondition,
    lastConditionCheckAt,
  };
}

function applyConditionSnapshot(item, conditionEntry) {
  const normalizedEntry = normalizeConditionLogEntry(conditionEntry);
  item.currentCondition = normalizedEntry;
  item.lastConditionCheckAt = normalizedEntry?.checkedAt || "";
  item.conditionRating = normalizedEntry?.rating || "";
  item.conditionContentsOk = normalizedEntry?.contentsOk ?? null;
  item.conditionFunctionalOk = normalizedEntry?.functionalOk ?? null;
  item.conditionLastCheckedAt = normalizedEntry?.checkedAt || "";
  item.conditionLastCheckedBy = normalizedEntry?.checkedBy || "";
  item.conditionLastNotes = normalizedEntry?.notes || "";
}

function isConditionCheckEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  if (entry.type === "condition") {
    return true;
  }
  return Boolean(normalizeConditionLogEntry(entry.condition));
}

function getConditionCheckTimestamp(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  const checkedAt =
    typeof entry.condition?.checkedAt === "string" ? entry.condition.checkedAt : "";
  if (checkedAt.trim()) {
    return checkedAt;
  }
  return typeof entry.timestamp === "string" ? entry.timestamp : "";
}

function getLatestConditionEntryFromMoves(equipmentId, moves = []) {
  if (!equipmentId || !Array.isArray(moves)) {
    return null;
  }
  const latest = moves
    .filter(
      (entry) =>
        entry.equipmentId === equipmentId &&
        isConditionCheckEntry(entry) &&
        !isEntryDeleted(entry)
    )
    .reduce((currentLatest, candidate) => {
      const candidateTime = new Date(getConditionCheckTimestamp(candidate)).getTime();
      if (!Number.isFinite(candidateTime)) {
        return currentLatest;
      }
      if (!currentLatest) {
        return candidate;
      }
      const latestTime = new Date(getConditionCheckTimestamp(currentLatest)).getTime();
      if (!Number.isFinite(latestTime) || candidateTime > latestTime) {
        return candidate;
      }
      return currentLatest;
    }, null);
  if (!latest) {
    return null;
  }
  return normalizeConditionLogEntry({
    ...(latest.condition && typeof latest.condition === "object" ? latest.condition : {}),
    checkedAt: getConditionCheckTimestamp(latest),
  });
}

function normalizeShippingDetails(shipping) {
  const safeShipping = shipping && typeof shipping === "object" ? shipping : {};
  const carrier =
    typeof safeShipping.carrier === "string" ? safeShipping.carrier.trim() : "";
  const trackingNumber =
    typeof safeShipping.trackingNumber === "string"
      ? safeShipping.trackingNumber.trim()
      : "";
  const shipDate = parseFlexibleDate(safeShipping.shipDate);
  const etaDate = parseFlexibleDate(safeShipping.etaDate);
  const deliveredAt = parseFlexibleDate(safeShipping.deliveredAt);
  const receivedAtRaw =
    typeof safeShipping.receivedAt === "string" ? safeShipping.receivedAt.trim() : "";
  const receivedAt = parseFlexibleDate(receivedAtRaw) || receivedAtRaw;
  const receivedBy =
    typeof safeShipping.receivedBy === "string" ? safeShipping.receivedBy.trim() : "";
  if (!carrier && !trackingNumber && !shipDate && !etaDate && !deliveredAt && !receivedAt) {
    return null;
  }
  return {
    carrier,
    trackingNumber,
    shipDate,
    etaDate,
    deliveredAt,
    receivedAt,
    receivedBy,
  };
}

function normalizeHistoryEntry(entry, equipmentList = []) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  const text = typeof safeEntry.text === "string" ? safeEntry.text : "";
  const timestamp =
    typeof safeEntry.timestamp === "string" && safeEntry.timestamp.trim()
      ? safeEntry.timestamp
      : formatTimestampISO();
  const rawEntryId =
    typeof safeEntry.id === "string" && safeEntry.id.trim()
      ? safeEntry.id
      : "";
  const equipmentIdFromFieldsRaw =
    typeof safeEntry.equipmentId === "string"
      ? safeEntry.equipmentId
      : typeof safeEntry.equipment_id === "string"
        ? safeEntry.equipment_id
        : typeof safeEntry.equipment === "string"
          ? safeEntry.equipment
          : safeEntry.equipment && typeof safeEntry.equipment === "object"
            ? safeEntry.equipment.id
            : "";
  const equipmentIdFromFields = equipmentIdFromFieldsRaw
    ? String(equipmentIdFromFieldsRaw)
    : "";
  const equipmentIdFromId =
    !equipmentIdFromFields &&
    rawEntryId &&
    Array.isArray(equipmentList) &&
    equipmentList.some((item) => item.id === rawEntryId)
      ? rawEntryId
      : "";
  const notesText =
    typeof safeEntry.notes === "string"
      ? safeEntry.notes
      : typeof safeEntry.message === "string"
        ? safeEntry.message
        : "";
  const parsedId =
    !equipmentIdFromFields && !equipmentIdFromId
      ? parseEquipmentIdFromText(`${notesText} ${text}`.trim())
      : "";
  const equipmentId =
    equipmentIdFromFields || equipmentIdFromId || parsedId;
  const id = equipmentIdFromId ? crypto.randomUUID() : rawEntryId || crypto.randomUUID();
  const matchedEquipment =
    equipmentId && Array.isArray(equipmentList)
      ? equipmentList.find((item) => item.id === equipmentId)
      : null;
  const type = normalizeHistoryType(safeEntry.type, text);
  const equipmentName =
    typeof safeEntry.equipmentName === "string"
    ? safeEntry.equipmentName
    : matchedEquipment?.name ?? "";
  const equipmentModel =
    typeof safeEntry.equipmentModel === "string"
    ? safeEntry.equipmentModel
    : matchedEquipment?.model ?? "";
  const equipmentSerial =
    typeof safeEntry.equipmentSerial === "string"
      ? safeEntry.equipmentSerial
      : matchedEquipment?.serialNumber ?? "";
  const snapshot =
    safeEntry.equipmentSnapshot &&
    typeof safeEntry.equipmentSnapshot === "object"
      ? safeEntry.equipmentSnapshot
      : equipmentName || equipmentModel || equipmentSerial
        ? {
            name: equipmentName,
            model: equipmentModel,
            serialNumber: equipmentSerial,
          }
        : matchedEquipment
          ? {
              name: matchedEquipment.name ?? "",
              model: matchedEquipment.model ?? "",
              serialNumber: matchedEquipment.serialNumber ?? "",
            }
          : null;
  const fromLocation =
    typeof safeEntry.fromLocation === "string" ? safeEntry.fromLocation : "";
  const toLocation =
    typeof safeEntry.toLocation === "string" ? safeEntry.toLocation : "";
  const statusFrom =
    typeof safeEntry.statusFrom === "string" ? safeEntry.statusFrom : "";
  const statusTo =
    typeof safeEntry.statusTo === "string" ? safeEntry.statusTo : "";
  const notes =
    typeof safeEntry.notes === "string" ? safeEntry.notes : "";
  const condition = normalizeConditionLogEntry(
    safeEntry.condition && typeof safeEntry.condition === "object"
      ? safeEntry.condition
      : {
          rating: safeEntry.conditionRating,
          contentsOk: safeEntry.contentsOk,
          functionalOk: safeEntry.functionalOk,
          notes: safeEntry.conditionNotes,
          checkedAt: safeEntry.timestamp,
          checkedBy: safeEntry.checkedBy,
        }
  );
  const shipping = normalizeShippingDetails(safeEntry.shipping);
  const receivedAt =
    typeof safeEntry.receivedAt === "string"
      ? safeEntry.receivedAt
      : typeof safeEntry.shipping?.deliveredAt === "string"
        ? safeEntry.shipping.deliveredAt
        : "";

  return {
    ...safeEntry,
    id,
    text,
    timestamp,
    type,
    equipmentId: equipmentId ? String(equipmentId) : "",
    equipmentSnapshot: snapshot,
    equipmentName,
    equipmentModel,
    equipmentSerial,
    fromLocation,
    toLocation,
    statusFrom,
    statusTo,
    notes,
    condition,
    shipping,
    receivedAt,
  };
}

function normalizeHistoryEntries(entries = [], equipmentList = []) {
  const list = Array.isArray(entries) ? entries : [];
  return list.map((entry) => normalizeHistoryEntry(entry, equipmentList));
}

function dedupeHistoryEntries(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const seenIds = new Set();
  const seenKeys = new Set();
  const deduped = [];

  list.forEach((entry) => {
    const safeEntry = entry && typeof entry === "object" ? entry : {};
    const rawId =
      typeof safeEntry.id === "string" ? safeEntry.id.trim() : "";
    if (rawId) {
      if (seenIds.has(rawId)) {
        return;
      }
      seenIds.add(rawId);
      deduped.push(entry);
      return;
    }
    const timestamp =
      typeof safeEntry.timestamp === "string" ? safeEntry.timestamp : "";
    const notes =
      typeof safeEntry.notes === "string"
        ? safeEntry.notes
        : typeof safeEntry.text === "string"
          ? safeEntry.text
          : "";
    const type = normalizeHistoryType(safeEntry.type, safeEntry.text ?? "");
    const dedupeKey = `${timestamp}::${notes}::${type}`;
    if (seenKeys.has(dedupeKey)) {
      return;
    }
    seenKeys.add(dedupeKey);
    deduped.push(entry);
  });

  return deduped;
}

function norm(value) {
  if (value == null) {
    return "";
  }
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function extractCandidateName(notes) {
  if (!notes) {
    return "";
  }
  const lowerNotes = notes.toLowerCase();
  const movedIndex = lowerNotes.indexOf(" moved");
  const colonIndex = lowerNotes.indexOf(":");
  const indexes = [movedIndex, colonIndex].filter((index) => index >= 0);
  if (indexes.length) {
    const cutIndex = Math.min(...indexes);
    return notes.slice(0, cutIndex).trim();
  }
  return notes.trim();
}

function getEquipmentIdFromEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  if (typeof entry.equipmentId === "string" && entry.equipmentId.trim()) {
    return entry.equipmentId.trim();
  }
  if (typeof entry.equipment_id === "string" && entry.equipment_id.trim()) {
    return entry.equipment_id.trim();
  }
  if (typeof entry.equipment === "string" && entry.equipment.trim()) {
    return entry.equipment.trim();
  }
  if (entry.equipment && typeof entry.equipment === "object") {
    const equipmentId =
      typeof entry.equipment.id === "string" ? entry.equipment.id.trim() : "";
    if (equipmentId) {
      return equipmentId;
    }
  }
  return "";
}

function backfillMovesWithEquipment(
  entries,
  equipmentList,
  equipmentById,
  equipmentByName
) {
  const list = Array.isArray(entries) ? entries : [];
  return list.map((entry) => {
    const safeEntry = entry && typeof entry === "object" ? { ...entry } : {};
    let equipmentId = getEquipmentIdFromEntry(safeEntry);

    const notesText =
      typeof safeEntry.notes === "string"
        ? safeEntry.notes
        : typeof safeEntry.text === "string"
          ? safeEntry.text
          : typeof safeEntry.message === "string"
            ? safeEntry.message
            : "";

    if (!equipmentId) {
      const parsedId = parseEquipmentIdFromNotes(notesText);
      if (parsedId && equipmentById.has(parsedId)) {
        equipmentId = parsedId;
      }
    }

    if (!equipmentId) {
      const candidateName = extractCandidateName(notesText);
      const normalizedCandidate = norm(candidateName);
      if (normalizedCandidate && equipmentByName.has(normalizedCandidate)) {
        equipmentId = String(equipmentByName.get(normalizedCandidate).id);
      }
    }

    if (!equipmentId && notesText) {
      const normalizedNotes = norm(notesText);
      const matchedEquipment = equipmentList.find((equipment) => {
        const equipmentName = norm(equipment.name);
        return equipmentName && normalizedNotes.includes(equipmentName);
      });
      if (matchedEquipment) {
        equipmentId = String(matchedEquipment.id);
      }
    }

    if (equipmentId) {
      const matchedEquipment = equipmentById.get(String(equipmentId));
      safeEntry.equipmentId = String(equipmentId);
      if (matchedEquipment) {
        safeEntry.equipmentSnapshot = {
          name: matchedEquipment.name ?? "",
          model: matchedEquipment.model ?? "",
          serialNumber: matchedEquipment.serialNumber ?? "",
        };
      }
    }

    return safeEntry;
  });
}

function syncEquipmentById() {
  equipmentById.clear();
  getEquipmentListFromState().forEach((item) => {
    equipmentById.set(String(item.id), item);
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadAdminMode() {
  return (
    localStorage.getItem(ADMIN_MODE_KEY) === "true" &&
    hasAdminPasscodeRecord()
  );
}

function saveAdminMode(isEnabled) {
  localStorage.setItem(ADMIN_MODE_KEY, String(Boolean(isEnabled)));
}

function readAdminPasscodeRecord() {
  const raw = localStorage.getItem(ADMIN_PASSCODE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.value === "string"
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse stored admin passcode record", error);
  }
  return {
    method: "plain",
    value: raw,
  };
}

function hasAdminPasscodeRecord() {
  const record = readAdminPasscodeRecord();
  return Boolean(record?.value);
}

function saveAdminPasscodeRecord(record) {
  localStorage.setItem(ADMIN_PASSCODE_KEY, JSON.stringify(record));
}

async function hashPasscode(passcode) {
  if (!window.crypto?.subtle || !window.TextEncoder) {
    return passcode;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildPasscodeRecord(passcode) {
  if (window.crypto?.subtle && window.TextEncoder) {
    return {
      method: "sha256",
      value: await hashPasscode(passcode),
    };
  }
  return {
    method: "plain",
    value: passcode,
  };
}

async function verifyAdminPasscode(passcode) {
  const record = readAdminPasscodeRecord();
  if (!record || !record.value) {
    return false;
  }
  if (record.method === "sha256") {
    const hash = await hashPasscode(passcode);
    return hash === record.value;
  }
  return record.value === passcode;
}

function applyAdminMode(isEnabled, { focus = false } = {}) {
  adminModeEnabled = Boolean(isEnabled);
  saveAdminMode(adminModeEnabled);

  if (elements.adminModeToggle) {
    elements.adminModeToggle.checked = adminModeEnabled;
  }
  if (elements.adminTabButton) {
    elements.adminTabButton.hidden = !adminModeEnabled;
    elements.adminTabButton.setAttribute(
      "aria-hidden",
      String(!adminModeEnabled)
    );
  }

  if (!adminModeEnabled) {
    setActiveTab("operations", { focus });
  } else {
    const storedTab = localStorage.getItem(TAB_STORAGE_KEY) ?? "operations";
    setActiveTab(storedTab, { focus });
  }
  refreshUI();
}

function requestAdminModeEnable(action) {
  if (adminModeEnabled) {
    if (typeof action === "function") {
      action();
    }
    return;
  }
  pendingAdminAction = typeof action === "function" ? action : null;
  openAdminPasscodeDialog();
}

function resetAdminPasscodeDialog() {
  if (elements.adminPasscodeInput) {
    elements.adminPasscodeInput.value = "";
  }
  if (elements.adminPasscodeNew) {
    elements.adminPasscodeNew.value = "";
  }
  if (elements.adminPasscodeConfirm) {
    elements.adminPasscodeConfirm.value = "";
  }
  if (elements.adminPasscodeError) {
    elements.adminPasscodeError.textContent = "";
    elements.adminPasscodeError.classList.add("is-hidden");
  }
}

function openAdminPasscodeDialog() {
  if (!elements.adminPasscodeDialog) {
    return;
  }
  const hasPasscode = hasAdminPasscodeRecord();
  const mode = hasPasscode ? "verify" : "setup";
  elements.adminPasscodeDialog.dataset.mode = mode;
  if (elements.adminPasscodeTitle) {
    elements.adminPasscodeTitle.textContent = hasPasscode
      ? "Enable Admin mode"
      : "Set admin passcode";
  }
  if (elements.adminPasscodeHint) {
    elements.adminPasscodeHint.textContent = hasPasscode
      ? "Enter the local browser passcode to unlock Admin mode."
      : "Create a local browser passcode to protect Admin mode.";
  }
  if (elements.adminPasscodeVerify) {
    elements.adminPasscodeVerify.classList.toggle("is-hidden", !hasPasscode);
  }
  if (elements.adminPasscodeSetup) {
    elements.adminPasscodeSetup.classList.toggle("is-hidden", hasPasscode);
  }
  if (elements.adminPasscodeSubmit) {
    elements.adminPasscodeSubmit.textContent = hasPasscode
      ? "Enable Admin mode"
      : "Set passcode & enable";
  }
  resetAdminPasscodeDialog();
  elements.adminPasscodeDialog.showModal();
  const focusTarget = hasPasscode
    ? elements.adminPasscodeInput
    : elements.adminPasscodeNew;
  focusTarget?.focus();
}

function closeAdminPasscodeDialog() {
  elements.adminPasscodeDialog?.close();
}

function setAdminPasscodeDialogError(message) {
  if (!elements.adminPasscodeError) {
    return;
  }
  elements.adminPasscodeError.textContent = message;
  elements.adminPasscodeError.classList.toggle("is-hidden", !message);
}

function resetAdminPasscodeSettingsStatus() {
  if (elements.adminPasscodeUpdateError) {
    elements.adminPasscodeUpdateError.textContent = "";
    elements.adminPasscodeUpdateError.classList.add("is-hidden");
  }
  if (elements.adminPasscodeUpdateSuccess) {
    elements.adminPasscodeUpdateSuccess.classList.add("is-hidden");
  }
}

function setAdminPasscodeSettingsError(message) {
  if (!elements.adminPasscodeUpdateError) {
    return;
  }
  elements.adminPasscodeUpdateError.textContent = message;
  elements.adminPasscodeUpdateError.classList.toggle("is-hidden", !message);
}

async function handleAdminPasscodeFormSubmit(event) {
  event.preventDefault();
  event.stopPropagation();
  resetAdminPasscodeSettingsStatus();
  setAdminPasscodeDialogError("");
  const mode = elements.adminPasscodeDialog?.dataset.mode ?? "verify";
  if (mode === "setup") {
    const newPasscode = elements.adminPasscodeNew?.value.trim() ?? "";
    const confirmPasscode = elements.adminPasscodeConfirm?.value.trim() ?? "";
    if (!newPasscode || !confirmPasscode) {
      setAdminPasscodeDialogError("Enter and confirm a new passcode.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setAdminPasscodeDialogError("Passcodes do not match.");
      return;
    }
    const record = await buildPasscodeRecord(newPasscode);
    saveAdminPasscodeRecord(record);
    applyAdminMode(true, { focus: true });
    const nextAction = pendingAdminAction;
    pendingAdminAction = null;
    if (typeof nextAction === "function") {
      nextAction();
    }
    closeAdminPasscodeDialog();
    showToast("Admin passcode set.", "success");
    return;
  }

  const passcode = elements.adminPasscodeInput?.value.trim() ?? "";
  if (!passcode) {
    setAdminPasscodeDialogError("Enter the admin passcode to continue.");
    return;
  }
  const isValid = await verifyAdminPasscode(passcode);
  if (!isValid) {
    setAdminPasscodeDialogError("Incorrect passcode.");
    return;
  }
  applyAdminMode(true, { focus: true });
  const nextAction = pendingAdminAction;
  pendingAdminAction = null;
  if (typeof nextAction === "function") {
    nextAction();
  }
  closeAdminPasscodeDialog();
}

async function handleAdminPasscodeSettingsSubmit(event) {
  event.preventDefault();
  resetAdminPasscodeSettingsStatus();
  const currentPasscode = elements.adminPasscodeCurrent?.value.trim() ?? "";
  const newPasscode = elements.adminPasscodeUpdate?.value.trim() ?? "";
  const confirmPasscode =
    elements.adminPasscodeUpdateConfirm?.value.trim() ?? "";
  if (!currentPasscode || !newPasscode || !confirmPasscode) {
    setAdminPasscodeSettingsError("Complete all passcode fields.");
    return;
  }
  if (newPasscode !== confirmPasscode) {
    setAdminPasscodeSettingsError("New passcodes do not match.");
    return;
  }
  const isValid = await verifyAdminPasscode(currentPasscode);
  if (!isValid) {
    setAdminPasscodeSettingsError("Current passcode is incorrect.");
    return;
  }
  const record = await buildPasscodeRecord(newPasscode);
  saveAdminPasscodeRecord(record);
  if (elements.adminPasscodeUpdateSuccess) {
    elements.adminPasscodeUpdateSuccess.classList.remove("is-hidden");
  }
  if (elements.adminPasscodeCurrent) {
    elements.adminPasscodeCurrent.value = "";
  }
  if (elements.adminPasscodeUpdate) {
    elements.adminPasscodeUpdate.value = "";
  }
  if (elements.adminPasscodeUpdateConfirm) {
    elements.adminPasscodeUpdateConfirm.value = "";
  }
  showToast("Admin passcode updated.", "success");
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimestampISO(date = new Date()) {
  return date.toISOString();
}

function formatDateTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" && value.trim() ? value : "—";
  }
  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderLocationOptions() {
  const locations = state.locations;
  const currentFilterValue = elements.locationFilter
    ? elements.locationFilter.value
    : "All locations";
  const options = ["All locations", ...locations]
    .map((location) => {
      const safeLocation = escapeHTML(location);
      return `<option value="${safeLocation}">${safeLocation}</option>`;
    })
    .join("");

  if (elements.locationFilter) {
    elements.locationFilter.innerHTML = options;
    elements.locationFilter.value = locations.includes(currentFilterValue)
      ? currentFilterValue
      : "All locations";
  }

  const selectionOptions = locations
    .map((location) => {
      const safeLocation = escapeHTML(location);
      return `<option value="${safeLocation}">${safeLocation}</option>`;
    })
    .join("");

  if (elements.moveLocation) {
    elements.moveLocation.innerHTML = selectionOptions;
  }
  if (elements.addEquipmentLocation) {
    elements.addEquipmentLocation.innerHTML = selectionOptions;
  }
  if (elements.editEquipmentLocation) {
    elements.editEquipmentLocation.innerHTML = selectionOptions;
  }
}

function renderStatusOptions() {
  const currentFilterValue = elements.statusFilter
    ? elements.statusFilter.value
    : "All statuses";
  const filterOptions = ["All statuses", ...statusFilterOptions]
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  if (elements.statusFilter) {
    elements.statusFilter.innerHTML = filterOptions;
    elements.statusFilter.value = statusFilterOptions.includes(currentFilterValue)
      ? currentFilterValue
      : "All statuses";
  }

  const selectionOptions = editableStatusOptions
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  if (elements.moveStatus) {
    elements.moveStatus.innerHTML = `<option value="Keep current status">Keep current status</option>${selectionOptions}`;
  }
  if (elements.addEquipmentStatus) {
    elements.addEquipmentStatus.innerHTML = selectionOptions;
    elements.addEquipmentStatus.value = "Available";
  }
  if (elements.editEquipmentStatus) {
    elements.editEquipmentStatus.innerHTML = selectionOptions;
  }
}

function renderCalibrationOptions() {
  const currentFilterValue = elements.calibrationFilter
    ? elements.calibrationFilter.value
    : "All";
  const filterOptions = calibrationFilterOptions
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  if (elements.calibrationFilter) {
    elements.calibrationFilter.innerHTML = filterOptions;
    elements.calibrationFilter.value = calibrationFilterOptions.includes(
      currentFilterValue
    )
      ? currentFilterValue
      : "All";
  }
}

function renderSubscriptionOptions() {
  const currentFilterValue = elements.subscriptionFilter
    ? elements.subscriptionFilter.value
    : "All";
  const filterOptions = subscriptionFilterOptions
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  if (elements.subscriptionFilter) {
    elements.subscriptionFilter.innerHTML = filterOptions;
    elements.subscriptionFilter.value = subscriptionFilterOptions.includes(
      currentFilterValue
    )
      ? currentFilterValue
      : "All";
  }
}

function renderEquipmentOptions() {
  const equipmentList = state.equipment;
  [
    elements.moveEquipment,
    elements.calibrationEquipment,
    elements.editEquipmentSelect,
  ].forEach((selectEl) => {
    populateEquipmentSelect(selectEl, equipmentList, selectEl?.value);
  });
  renderChecklistCopySourceOptions({ resetSelection: false });
}

function updateCopyChecklistButtonState() {
  if (!elements.editEquipmentCopyButton) {
    return;
  }
  elements.editEquipmentCopyButton.disabled =
    !elements.editEquipmentCopySource?.value;
}

function renderChecklistCopySourceOptions({
  resetSelection = false,
} = {}) {
  if (!elements.editEquipmentCopySource) {
    return;
  }
  const currentEquipmentId = elements.editEquipmentSelect?.value ?? "";
  const sourceList = state.equipment.filter(
    (item) => item.id !== currentEquipmentId
  );
  if (!sourceList.length) {
    elements.editEquipmentCopySource.innerHTML =
      '<option value="" disabled selected>No other equipment available</option>';
    elements.editEquipmentCopySource.value = "";
    updateCopyChecklistButtonState();
    return;
  }
  const options = [
    '<option value="">Select equipment...</option>',
    ...sourceList.map((item) => {
      const label = formatEquipmentLabel(item);
      return `<option value="${escapeHTML(
        item.id
      )}">${escapeHTML(label)}</option>`;
    }),
  ].join("");
  elements.editEquipmentCopySource.innerHTML = options;
  const nextSelection =
    !resetSelection &&
    editChecklistCopySourceId &&
    sourceList.some((item) => item.id === editChecklistCopySourceId)
      ? editChecklistCopySourceId
      : "";
  elements.editEquipmentCopySource.value = nextSelection;
  updateCopyChecklistButtonState();
}

function renderMovesFilters() {
  renderMovesEquipmentFilter();
  renderMovesTypeFilter();
  renderMovesDestinationFilter();
}

function renderMovesEquipmentFilter() {
  if (!elements.movesEquipmentFilter) {
    return;
  }
  const equipmentList = state.equipment;
  const currentValue = elements.movesEquipmentFilter.value || "all";
  if (!equipmentList.length) {
    elements.movesEquipmentFilter.innerHTML =
      '<option value="all">All equipment</option><option value="" disabled>No equipment found</option>';
    elements.movesEquipmentFilter.value = "all";
    return;
  }
  const options = [
    '<option value="all">All equipment</option>',
    ...equipmentList.map((item) => {
      const name = item.name?.trim() ? item.name : "";
      const modelLabel = item.model?.trim() ? item.model : "—";
      const serialLabel = item.serialNumber?.trim()
        ? item.serialNumber
        : "—";
      const label = `${name} — ${modelLabel} — ${serialLabel}`;
      return `<option value="${escapeHTML(
        item.id
      )}">${escapeHTML(label)}</option>`;
    }),
  ].join("");
  elements.movesEquipmentFilter.innerHTML = options;
  elements.movesEquipmentFilter.value = equipmentList.some(
    (item) => item.id === currentValue
  )
    ? currentValue
    : "all";
}

function renderMovesTypeFilter() {
  if (!elements.movesTypeFilter) {
    return;
  }
  const currentValue = elements.movesTypeFilter.value || "all";
  const options = moveTypeOptions
    .map((option) => {
      return `<option value="${escapeHTML(
        option.value
      )}">${escapeHTML(option.label)}</option>`;
    })
    .join("");
  elements.movesTypeFilter.innerHTML = options;
  elements.movesTypeFilter.value = moveTypeOptions.some(
    (option) => option.value === currentValue
  )
    ? currentValue
    : "all";
}

function renderMovesDestinationFilter() {
  if (!elements.movesDestinationFilter) {
    return;
  }
  const currentValue = elements.movesDestinationFilter.value || "All offices";
  const options = ["All offices", ...physicalLocations]
    .map((location) => {
      const safeLocation = escapeHTML(location);
      return `<option value="${safeLocation}">${safeLocation}</option>`;
    })
    .join("");
  elements.movesDestinationFilter.innerHTML = options;
  elements.movesDestinationFilter.value = physicalLocations.includes(currentValue)
    ? currentValue
    : "All offices";
}

function populateEquipmentSelect(selectEl, equipmentList, selectedId) {
  if (!selectEl) {
    return;
  }
  const list = Array.isArray(equipmentList) ? equipmentList : [];
  if (!list.length) {
    selectEl.innerHTML =
      '<option value="" disabled selected>No equipment found</option>';
    return;
  }
  const options = list
    .map((item) => {
      const name = item.name?.trim() ? item.name : "";
      const modelLabel = item.model?.trim() ? item.model : "—";
      const serialLabel = item.serialNumber?.trim()
        ? item.serialNumber
        : "—";
      const label = `${name} — ${modelLabel} — ${serialLabel}`;
      return `<option value="${escapeHTML(
        item.id
      )}">${escapeHTML(label)}</option>`;
    })
    .join("");
  selectEl.innerHTML = options;
  const selectedValue = list.some((item) => item.id === selectedId)
    ? selectedId
    : list[0].id;
  selectEl.value = selectedValue;
}

function renderStats(filtered = [], now = new Date()) {
  const list = Array.isArray(filtered) ? filtered : [];
  if (elements.statTotal) {
    elements.statTotal.textContent = list.length;
  }
  const hireCount = list.filter(
    (item) => getEffectiveStatus(item).toLowerCase() === "on hire"
  ).length;
  if (elements.statHire) {
    elements.statHire.textContent = hireCount;
  }
  const overdueCount = list.filter(
    (item) => getCalibrationInfo(item, now).status === "Overdue"
  ).length;
  if (elements.statOverdue) {
    elements.statOverdue.textContent = overdueCount;
  }
  const dueSoonCount = list.filter(
    (item) => getCalibrationInfo(item, now).status === "Due soon"
  ).length;
  if (elements.statDueSoon) {
    elements.statDueSoon.textContent = dueSoonCount;
  }
  const overdueSubscriptionCount = list.filter(
    (item) => getSubscriptionInfo(item, now).status === "Overdue"
  ).length;
  if (elements.statOverdueSubscription) {
    elements.statOverdueSubscription.textContent =
      overdueSubscriptionCount;
  }
  const dueSoonSubscriptionCount = list.filter(
    (item) => getSubscriptionInfo(item, now).status === "Due soon"
  ).length;
  if (elements.statDueSoonSubscription) {
    elements.statDueSoonSubscription.textContent =
      dueSoonSubscriptionCount;
  }
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function parseSubscriptionDate(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    const parsedDate = parseDate(value);
    if (parsedDate) {
      return parsedDate;
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseFlexibleDate(value) {
  if (!value) {
    return "";
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const parsed = parseDate(trimmed);
    return parsed ? trimmed : "";
  }
  const altMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (altMatch) {
    const [, day, month, year] = altMatch;
    const normalized = `${year}-${month}-${day}`;
    const parsed = parseDate(normalized);
    return parsed ? normalized : "";
  }
  return "";
}

function parseCsvText(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      const nextChar = text[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((value) => String(value).trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  row.push(current);
  if (row.some((value) => String(value).trim() !== "")) {
    rows.push(row);
  }

  return rows.map((columns) => columns.map((value) => String(value).trim()));
}

function normalizeImportHeader(value) {
  return String(value).trim().toLowerCase();
}

function normalizeImportSerial(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseCalibrationRequired(value) {
  if (value == null || value === "") {
    return true;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return true;
}

function parseCalibrationInterval(value) {
  if (value == null || value === "") {
    return 12;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 12;
}

function hashString(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function buildStableEquipmentId(row, rowNumber) {
  const serial = normalizeImportSerial(row.serialNumber);
  const name = String(row.name || "").trim().toLowerCase();
  const model = String(row.model || "").trim().toLowerCase();
  const key = [serial || name, model, row.purchaseDate || ""].join("|");
  return `import-${hashString(key)}-${rowNumber}`;
}

function buildEquipmentImportTemplate() {
  const headerLine = equipmentImportTemplateHeaders.join(",");
  const rows = [
    [
      "Projection kit B",
      "Epson EB-PU1007B",
      "PKB-2024-0201",
      "2023-03-10",
      "Perth",
      "Available",
      "TRUE",
      "12",
      "2024-03-01",
    ],
    [
      "Audio demo pack",
      "Pelican 1510",
      "ADC-2024-0202",
      "10/02/2024",
      "Melbourne",
      "On demo",
      "FALSE",
      "",
      "",
    ],
  ];
  const body = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          if (text.includes(",") || text.includes('"')) {
            return `"${text.replace(/"/g, '""')}"`;
          }
          return text;
        })
        .join(",")
    )
    .join("\n");
  return `${headerLine}\n${body}\n`;
}

function normalizeEquipment(item = {}) {
  const safeItem = item && typeof item === "object" ? item : {};
  const { subscriptionIntervalMonths, ...normalizedBase } = safeItem;
  const conditionReference = normalizeConditionReference(
    normalizedBase.conditionReference
  );
  const name =
    typeof normalizedBase.name === "string"
      ? normalizedBase.name
      : normalizedBase.name != null
        ? String(normalizedBase.name)
        : "";
  const location =
    typeof normalizedBase.location === "string"
      ? normalizedBase.location
      : normalizedBase.location != null
        ? String(normalizedBase.location)
        : "";
  const status =
    typeof normalizedBase.status === "string"
      ? normalizedBase.status
      : normalizedBase.status != null
        ? String(normalizedBase.status)
        : "";
  const model =
    typeof normalizedBase.model === "string"
      ? normalizedBase.model
      : normalizedBase.model != null
        ? String(normalizedBase.model)
        : "";
  const serialNumber =
    typeof normalizedBase.serialNumber === "string"
      ? normalizedBase.serialNumber
      : normalizedBase.serialNumber != null
        ? String(normalizedBase.serialNumber)
        : "";
  const purchaseDate =
    typeof normalizedBase.purchaseDate === "string"
      ? normalizedBase.purchaseDate
      : normalizedBase.purchaseDate != null
        ? String(normalizedBase.purchaseDate)
        : "";
  const lastCalibrationDate =
    typeof normalizedBase.lastCalibrationDate === "string"
      ? normalizedBase.lastCalibrationDate
      : normalizedBase.lastCalibrationDate != null
        ? String(normalizedBase.lastCalibrationDate)
        : "";
  const subscriptionRenewalDate =
    typeof normalizedBase.subscriptionRenewalDate === "string"
      ? normalizedBase.subscriptionRenewalDate
      : normalizedBase.subscriptionRenewalDate != null
        ? String(normalizedBase.subscriptionRenewalDate)
        : "";
  const calibrationRequired =
    typeof normalizedBase.calibrationRequired === "boolean"
      ? normalizedBase.calibrationRequired
      : false;
  const subscriptionRequired =
    typeof normalizedBase.subscriptionRequired === "boolean"
      ? normalizedBase.subscriptionRequired
      : false;

  return {
    ...normalizedBase,
    id:
      typeof normalizedBase.id === "string" && normalizedBase.id.trim()
        ? normalizedBase.id
        : crypto.randomUUID(),
    name: name?.trim() ? name : "Unnamed",
    location: location?.trim() ? location : physicalLocations[0],
    status: status?.trim() ? status : "Available",
    model,
    serialNumber,
    purchaseDate,
    conditionReference,
    calibrationRequired,
    calibrationIntervalMonths:
      typeof safeItem.calibrationIntervalMonths === "number"
        ? safeItem.calibrationIntervalMonths
        : Number(safeItem.calibrationIntervalMonths) || 12,
    lastCalibrationDate,
    subscriptionRequired,
    subscriptionRenewalDate,
    ...normalizeEquipmentConditionFields(normalizedBase),
    lastMoved:
      typeof safeItem.lastMoved === "string"
        ? safeItem.lastMoved
        : formatTimestamp(),
  };
}

function normalizeConditionReference(reference = {}) {
  const safeReference =
    reference && typeof reference === "object" ? reference : {};
  const contentsChecklist =
    typeof safeReference.contentsChecklist === "string"
      ? safeReference.contentsChecklist
      : safeReference.contentsChecklist != null
        ? String(safeReference.contentsChecklist)
        : "";
  const functionalChecklist =
    typeof safeReference.functionalChecklist === "string"
      ? safeReference.functionalChecklist
      : safeReference.functionalChecklist != null
        ? String(safeReference.functionalChecklist)
        : "";
  return {
    contentsChecklist,
    functionalChecklist,
  };
}

function hasChecklistDefined(reference = {}) {
  const normalized = normalizeConditionReference(reference);
  return Boolean(
    normalized.contentsChecklist.trim() &&
      normalized.functionalChecklist.trim()
  );
}

function normalizeCalibrationFields(item) {
  const calibrationRequired = Boolean(item.calibrationRequired);
  const intervalValue = Number(item.calibrationIntervalMonths);
  const calibrationIntervalMonths =
    Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : 12;
  const lastCalibrationDate = parseDate(item.lastCalibrationDate)
    ? item.lastCalibrationDate
    : "";

  return {
    calibrationRequired,
    calibrationIntervalMonths,
    lastCalibrationDate,
  };
}

function normalizeSubscriptionFields(item) {
  const subscriptionRequired = Boolean(item.subscriptionRequired);
  const renewalDate = parseSubscriptionDate(item.subscriptionRenewalDate)
    ? item.subscriptionRenewalDate
    : "";

  return {
    subscriptionRequired,
    subscriptionRenewalDate: renewalDate,
  };
}

function parseEquipmentImportRows(rows) {
  const [headerRow, ...dataRows] = rows;
  const headerMap = new Map(
    headerRow.map((header, index) => [normalizeImportHeader(header), index])
  );
  const missingHeaders = equipmentImportTemplateHeaders.filter(
    (header) => !headerMap.has(normalizeImportHeader(header))
  );
  if (missingHeaders.length) {
    return {
      rawRows: [],
      warnings: [
        `Missing required headers: ${missingHeaders.join(", ")}.`,
      ],
      totalRows: 0,
    };
  }

  const parsedRows = dataRows.map((row, rowIndex) => {
    const getValue = (key) =>
      row[headerMap.get(normalizeImportHeader(key))] ?? "";
    const rawName = getValue("name");
    const rawModel = getValue("model");
    const rawSerial = getValue("serialNumber");
    const rawPurchaseDate = getValue("purchaseDate");
    const rawLocation = getValue("location");
    const rawStatus = getValue("status");
    const rawCalibrationRequired = getValue("calibrationRequired");
    const rawCalibrationInterval = getValue("calibrationIntervalMonths");
    const rawLastCalibration = getValue("lastCalibrationDate");

    const issues = [];
    const name = String(rawName || "").trim();
    if (!name) {
      issues.push("Missing equipment name.");
    }

    const model = String(rawModel || "").trim();
    const serialNumber = String(rawSerial || "").trim();
    const purchaseDate = parseFlexibleDate(rawPurchaseDate);
    if (rawPurchaseDate && !purchaseDate) {
      issues.push("Invalid purchase date.");
    }

    let location = String(rawLocation || "").trim();
    if (!location) {
      location = physicalLocations[0];
    }
    if (!physicalLocations.includes(location)) {
      issues.push(`Unknown location "${location}", defaulted to Perth.`);
      location = physicalLocations[0];
    }

    let status = String(rawStatus || "").trim();
    if (!status) {
      status = "Available";
    }
    if (!editableStatusOptions.includes(status)) {
      issues.push(`Unknown status "${status}", defaulted to Available.`);
      status = "Available";
    }

    const calibrationRequired = parseCalibrationRequired(
      rawCalibrationRequired
    );
    const calibrationIntervalMonths = calibrationRequired
      ? parseCalibrationInterval(rawCalibrationInterval)
      : parseCalibrationInterval(rawCalibrationInterval);

    const lastCalibrationDate = calibrationRequired
      ? parseFlexibleDate(rawLastCalibration)
      : "";
    if (rawLastCalibration && !lastCalibrationDate) {
      issues.push("Invalid last calibration date.");
    }

    return {
      rowNumber: rowIndex + 2,
      data: {
        name,
        model,
        serialNumber,
        purchaseDate,
        location,
        status,
        calibrationRequired,
        calibrationIntervalMonths,
        lastCalibrationDate,
      },
      issues,
      isValid: Boolean(name),
      duplicateNote: "",
    };
  });

  return {
    rawRows: parsedRows,
    warnings: [],
    totalRows: parsedRows.length,
  };
}

function applyDuplicateHandling(parsedRows, duplicateBehavior) {
  const existingSerials = new Map();
  state.equipment.forEach((item) => {
    const serial = normalizeImportSerial(item.serialNumber);
    if (serial) {
      existingSerials.set(serial, item);
    }
  });
  const seenSerials = new Map();
  const warnings = [];
  const rows = parsedRows.map((entry) => {
    const cloned = {
      ...entry,
      issues: [...entry.issues],
      isValid: entry.isValid,
      duplicateNote: "",
    };
    const serial = normalizeImportSerial(entry.data.serialNumber);
    if (serial) {
      if (existingSerials.has(serial)) {
        const existingItem = existingSerials.get(serial);
        const warning = `Row ${entry.rowNumber}: serial number matches existing item "${existingItem.name}".`;
        warnings.push(warning);
        cloned.issues.push(warning);
        cloned.duplicateNote = "Existing serial";
        if (duplicateBehavior === "skip") {
          cloned.isValid = false;
        }
      }
      if (seenSerials.has(serial)) {
        const firstRow = seenSerials.get(serial);
        const warning = `Row ${entry.rowNumber}: duplicate serial also appears on row ${firstRow}.`;
        warnings.push(warning);
        cloned.issues.push(warning);
        cloned.duplicateNote = "Duplicate in file";
        if (duplicateBehavior === "skip") {
          cloned.isValid = false;
        }
      } else {
        seenSerials.set(serial, entry.rowNumber);
      }
    }
    return cloned;
  });

  const validRows = rows.filter((row) => row.isValid);
  return {
    rows,
    warnings,
    validRows,
    invalidRows: rows.length - validRows.length,
  };
}

function renderImportPreview() {
  if (
    !elements.importTotalCount ||
    !elements.importValidCount ||
    !elements.importInvalidCount ||
    !elements.importPreviewHeader ||
    !elements.importPreviewBody ||
    !elements.importWarnings ||
    !elements.importPreviewTable ||
    !elements.importEmptyState ||
    !elements.importSubmit
  ) {
    return;
  }

  elements.importTotalCount.textContent = String(
    equipmentImportState.totalRows
  );
  elements.importValidCount.textContent = String(
    equipmentImportState.validRows
  );
  elements.importInvalidCount.textContent = String(
    equipmentImportState.invalidRows
  );

  if (!equipmentImportState.totalRows) {
    elements.importEmptyState.classList.remove("is-hidden");
    elements.importPreviewTable.classList.add("is-hidden");
  } else {
    elements.importEmptyState.classList.add("is-hidden");
    elements.importPreviewTable.classList.remove("is-hidden");
  }

  const previewRows = equipmentImportState.rows.slice(0, 20);
  const headerCells = [
    "Row",
    "Name",
    "Model",
    "Serial",
    "Purchase date",
    "Location",
    "Status",
    "Calibration",
    "Interval",
    "Last calibration",
    "Result",
  ]
    .map((label) => `<th>${escapeHTML(label)}</th>`)
    .join("");
  elements.importPreviewHeader.innerHTML = `<tr>${headerCells}</tr>`;
  elements.importPreviewBody.innerHTML = previewRows
    .map((row) => {
      const data = row.data;
      const resultLabel = row.isValid ? "Ready" : "Skipped";
      return `
        <tr class="${row.isValid ? "" : "import-row-invalid"}">
          <td>${row.rowNumber}</td>
          <td>${escapeHTML(data.name)}</td>
          <td>${escapeHTML(data.model)}</td>
          <td>${escapeHTML(data.serialNumber)}</td>
          <td>${escapeHTML(data.purchaseDate)}</td>
          <td>${escapeHTML(data.location)}</td>
          <td>${escapeHTML(data.status)}</td>
          <td>${data.calibrationRequired ? "Yes" : "No"}</td>
          <td>${escapeHTML(String(data.calibrationIntervalMonths))}</td>
          <td>${escapeHTML(data.lastCalibrationDate)}</td>
          <td>${escapeHTML(resultLabel)}</td>
        </tr>
      `;
    })
    .join("");

  const warningItems = equipmentImportState.warnings.length
    ? equipmentImportState.warnings.map(
        (warning) => `<li>${escapeHTML(warning)}</li>`
      )
    : ['<li class="import-empty">No warnings.</li>'];
  elements.importWarnings.innerHTML = warningItems.join("");

  elements.importSubmit.disabled = equipmentImportState.validRows === 0;
}

function resetImportState() {
  equipmentImportState.rawRows = [];
  equipmentImportState.rows = [];
  equipmentImportState.warnings = [];
  equipmentImportState.totalRows = 0;
  equipmentImportState.validRows = 0;
  equipmentImportState.invalidRows = 0;
  equipmentImportState.duplicateBehavior =
    elements.importDuplicateBehavior?.value ?? "skip";
  renderImportPreview();
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getAgeLabel(purchaseDate, now) {
  const start = parseDate(purchaseDate);
  if (!start) {
    return "Unknown";
  }
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) -
    (now.getDate() < start.getDate() ? 1 : 0);
  const safeMonths = Math.max(totalMonths, 0);
  const years = Math.floor(safeMonths / 12);
  const remainingMonths = safeMonths % 12;
  const yearPart = years > 0 ? `${years}y` : "";
  const monthPart =
    remainingMonths > 0 || years === 0 ? `${remainingMonths}m` : "";
  return [yearPart, monthPart].filter(Boolean).join(" ");
}

function getCalibrationInfo(item, now) {
  if (!item.calibrationRequired) {
    return {
      status: "Not required",
      dueDate: null,
    };
  }
  const lastCalibration = parseDate(item.lastCalibrationDate);
  if (!lastCalibration) {
    return {
      status: "Unknown",
      dueDate: null,
    };
  }
  const interval = item.calibrationIntervalMonths ?? 12;
  const dueDate = addMonths(lastCalibration, interval);
  const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      status: "Overdue",
      dueDate,
    };
  }
  if (diffDays <= 60) {
    return {
      status: "Due soon",
      dueDate,
    };
  }
  return {
    status: "OK",
    dueDate,
  };
}

function getSubscriptionInfo(item, now) {
  if (!item.subscriptionRequired) {
    return {
      status: "Not required",
      renewalDate: null,
    };
  }
  const renewalDate = parseSubscriptionDate(item.subscriptionRenewalDate);
  if (!renewalDate) {
    return {
      status: "Unknown",
      renewalDate: null,
    };
  }
  const diffDays = Math.ceil(
    (renewalDate - now) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return {
      status: "Overdue",
      renewalDate,
    };
  }
  if (diffDays <= 30) {
    return {
      status: "Due soon",
      renewalDate,
    };
  }
  return {
    status: "OK",
    renewalDate,
  };
}

function hasShippingCoreDetails(shipping) {
  if (!shipping || typeof shipping !== "object") {
    return false;
  }
  const hasCarrierOrTracking = Boolean(
    shipping.carrier?.trim() || shipping.trackingNumber?.trim()
  );
  return hasCarrierOrTracking && Boolean(parseFlexibleDate(shipping.shipDate));
}

function hasShippingReceiptDetails(shipping) {
  if (!shipping || typeof shipping !== "object") {
    return false;
  }
  return Boolean(
    shipping.carrier?.trim() ||
      shipping.trackingNumber?.trim() ||
      parseFlexibleDate(shipping.shipDate) ||
      parseFlexibleDate(shipping.etaDate)
  );
}

function getMoveReceivedAt(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  const shippingReceivedAt =
    typeof entry.shipping?.receivedAt === "string"
      ? entry.shipping.receivedAt.trim()
      : "";
  if (shippingReceivedAt) {
    return shippingReceivedAt;
  }
  const receivedAt =
    typeof entry.receivedAt === "string" ? entry.receivedAt.trim() : "";
  if (receivedAt) {
    return receivedAt;
  }
  const deliveredAt = parseFlexibleDate(entry.shipping?.deliveredAt);
  return deliveredAt || "";
}

function hasReceivedLogAfterMove(moveEntry) {
  if (!moveEntry || typeof moveEntry !== "object") {
    return false;
  }
  const moveTime = Date.parse(moveEntry.timestamp || "");
  return getAllMovesFromState().some((entry) => {
    if (entry.equipmentId !== moveEntry.equipmentId || entry.type !== "received") {
      return false;
    }
    if (!Number.isFinite(moveTime)) {
      return true;
    }
    const entryTime = Date.parse(entry.timestamp || "");
    if (!Number.isFinite(entryTime)) {
      return true;
    }
    return entryTime >= moveTime;
  });
}

function getLatestShippingMoveEntryForEquipment(equipmentId) {
  if (!equipmentId) {
    return null;
  }
  const shippingMoves = getAllMovesFromState().filter(
    (entry) =>
      entry.equipmentId === equipmentId &&
      entry.type === "move" &&
      hasShippingCoreDetails(entry.shipping)
  );
  if (!shippingMoves.length) {
    return null;
  }
  return shippingMoves.reduce((latest, entry) => {
    const latestTime = Date.parse(latest.timestamp || "");
    const entryTime = Date.parse(entry.timestamp || "");
    if (Number.isFinite(entryTime) && !Number.isFinite(latestTime)) {
      return entry;
    }
    return entryTime > latestTime ? entry : latest;
  }, shippingMoves[0]);
}

function isShippingActive(item) {
  if (!item || !item.id) {
    return false;
  }
  const shippingMove = getLatestShippingMoveEntryForEquipment(item.id);
  if (!shippingMove || !shippingMove.shipping) {
    return false;
  }
  if (!hasShippingCoreDetails(shippingMove.shipping)) {
    return false;
  }
  if (getMoveReceivedAt(shippingMove)) {
    return false;
  }
  return !hasReceivedLogAfterMove(shippingMove);
}

function getActiveShippingMoveEntryForEquipment(equipmentId) {
  if (!equipmentId) {
    return null;
  }
  const equipment = equipmentById.get(String(equipmentId));
  if (!equipment || !isShippingActive(equipment)) {
    return null;
  }
  const shippingMove = getLatestShippingMoveEntryForEquipment(String(equipmentId));
  if (!shippingMove || !shippingMove.shipping) {
    return null;
  }
  return shippingMove;
}

function getEffectiveStatus(item) {
  return isShippingActive(item) ? "In transit" : item.status;
}

function getFilteredEquipment(now = new Date()) {
  const searchTerm = elements.searchInput
    ? elements.searchInput.value.trim().toLowerCase()
    : "";
  const locationFilter = elements.locationFilter
    ? elements.locationFilter.value
    : "All locations";
  const statusFilter = elements.statusFilter
    ? elements.statusFilter.value
    : "All statuses";
  const calibrationFilter = elements.calibrationFilter
    ? elements.calibrationFilter.value
    : "All";
  const subscriptionFilter = elements.subscriptionFilter
    ? elements.subscriptionFilter.value
    : "All";

  return state.equipment.filter((item) => {
    const calibrationInfo = getCalibrationInfo(item, now);
    const subscriptionInfo = getSubscriptionInfo(item, now);
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.location.toLowerCase().includes(searchTerm) ||
      getEffectiveStatus(item).toLowerCase().includes(searchTerm) ||
      (() => {
        const shippingMove = getActiveShippingMoveEntryForEquipment(item.id);
        if (!shippingMove || !shippingMove.shipping) {
          return false;
        }
        const shippingText = `${shippingMove.shipping.carrier ?? ""} ${shippingMove.shipping.trackingNumber ?? ""}`
          .trim()
          .toLowerCase();
        return shippingText.includes(searchTerm);
      })();
    const matchesLocation =
      locationFilter === "All locations" || item.location === locationFilter;
    const matchesStatus =
      statusFilter === "All statuses" || getEffectiveStatus(item) === statusFilter;
    const matchesCalibration =
      calibrationFilter === "All" ||
      calibrationInfo.status === calibrationFilter;
    const matchesSubscription =
      subscriptionFilter === "All" ||
      subscriptionInfo.status === subscriptionFilter;
    return (
      matchesSearch &&
      matchesLocation &&
      matchesStatus &&
      matchesCalibration &&
      matchesSubscription
    );
  });
}

function formatConditionCheckLabel(value) {
  if (value === true) {
    return "OK";
  }
  if (value === false) {
    return "Not OK";
  }
  return "—";
}

function formatConditionSummary(condition) {
  if (!condition) {
    return "—";
  }
  const parts = [];
  if (condition.rating) {
    parts.push(condition.rating);
  }
  if (condition.contentsOk !== null) {
    parts.push(`Contents ${condition.contentsOk ? "OK" : "Not OK"}`);
  }
  if (condition.functionalOk !== null) {
    parts.push(`Functional ${condition.functionalOk ? "OK" : "Not OK"}`);
  }
  return parts.length ? parts.join(" • ") : "—";
}

function buildEquipmentConditionCell(item) {
  const currentCondition = normalizeConditionLogEntry(item.currentCondition);
  const rating = currentCondition?.rating || "Not checked";
  const checkedDate = item.lastConditionCheckAt
    ? formatDateTime(item.lastConditionCheckAt)
    : "—";
  const metaText = `Last checked: ${checkedDate}`;
  const styleClass =
    rating === "Excellent" || rating === "Good"
      ? "condition-badge--good"
      : rating === "Needs attention" ||
          rating === "Missing" ||
          rating === "Fault" ||
          rating === "Unserviceable"
        ? "condition-badge--bad"
        : rating === "Not checked"
          ? "condition-badge--neutral"
          : "condition-badge--warn";
  return `<div class="status-with-meta"><button class="tag tag--status condition-badge ${styleClass}" type="button" data-action="view-condition-history" data-equipment-id="${escapeHTML(item.id)}">${escapeHTML(rating)}</button><small class="status-meta">${escapeHTML(metaText)}</small></div>`;
}

function getConditionHistoryEntries(equipmentId) {
  const moves = getAllMovesFromState();
  return moves
    .filter(
      (entry) =>
        entry.equipmentId === equipmentId &&
        isConditionCheckEntry(entry)
    )
    .sort(
      (a, b) =>
        new Date(getConditionCheckTimestamp(b)).getTime() -
        new Date(getConditionCheckTimestamp(a)).getTime()
    );
}

function openConditionHistory(equipmentId) {
  if (!elements.conditionHistoryModal || !elements.conditionHistoryList || !elements.conditionHistoryTitle) {
    return;
  }
  const equipment = state.equipment.find((item) => item.id === equipmentId);
  const title = equipment ? equipment.name : "Equipment";
  elements.conditionHistoryTitle.textContent = `${title} condition history`;
  const entries = getConditionHistoryEntries(equipmentId);
  if (!entries.length) {
    elements.conditionHistoryList.innerHTML = "<li>No condition checks recorded yet.</li>";
  } else {
    elements.conditionHistoryList.innerHTML = entries.map((entry) => {
      const c = entry.condition;
      return `<li><strong>${escapeHTML(formatDateTime(entry.timestamp))}</strong> — ${escapeHTML(c.rating || "—")} • Contents ${escapeHTML(formatConditionCheckLabel(c.contentsOk))} • Functional ${escapeHTML(formatConditionCheckLabel(c.functionalOk))}${c.checkedBy ? ` • Checked by ${escapeHTML(c.checkedBy)}` : ""}${c.notes ? `<br>${escapeHTML(c.notes)}` : ""}</li>`;
    }).join("");
  }
  elements.conditionHistoryModal.showModal();
}

function renderTable() {
  const now = new Date();
  const filtered = getFilteredEquipment(now);
  renderStats(filtered, now);

  if (filtered.length === 0) {
    if (elements.equipmentTable) {
      elements.equipmentTable.innerHTML =
        '<tr><td colspan="9">No equipment matches the current filter.</td></tr>';
    }
    return;
  }

  if (elements.equipmentTable) {
    elements.equipmentTable.innerHTML = filtered
      .map(
        (item) => {
          const ageLabel = getAgeLabel(item.purchaseDate, now);
          const calibrationInfo = getCalibrationInfo(item, now);
          const calibrationMeta = calibrationInfo.dueDate
            ? `Due ${formatDate(calibrationInfo.dueDate)}`
            : calibrationInfo.status === "Unknown"
              ? "Last calibration needed"
              : "No calibration required";
          const calibrationCell = `<span class="tag tag--status" title="${escapeHTML(
            calibrationMeta
          )}">${escapeHTML(calibrationInfo.status)}</span>`;
          const subscriptionInfo = getSubscriptionInfo(item, now);
          const subscriptionMeta = subscriptionInfo.renewalDate
            ? `Renewal ${formatDate(subscriptionInfo.renewalDate)}`
            : subscriptionInfo.status === "Unknown"
              ? "Renewal date needed"
              : "Subscription not required";
          const subscriptionDateLabel = subscriptionInfo.renewalDate
            ? formatDate(subscriptionInfo.renewalDate)
            : "";
          const subscriptionCell = `<div class="status-with-meta"><span class="tag tag--status" title="${escapeHTML(
            subscriptionMeta
          )}">${escapeHTML(subscriptionInfo.status)}</span>${
            subscriptionDateLabel
              ? `<small class="status-meta">${escapeHTML(subscriptionDateLabel)}</small>`
              : ""
          }</div>`;
          const modelLabel = item.model?.trim() ? item.model : "—";
          const serialLabel = item.serialNumber?.trim()
            ? item.serialNumber
            : "—";
          const locationDisplay = getEquipmentLocationDisplay(item);
          const activeShippingMove = getActiveShippingMoveEntryForEquipment(item.id);
          const compactShippingMeta = getCompactShippingMeta(activeShippingMove?.shipping);
          const hasDetailsAction = Boolean(activeShippingMove && compactShippingMeta);
          return `
        <tr data-equipment-id="${escapeHTML(item.id)}">
          <td>${escapeHTML(item.name)}</td>
          <td>${escapeHTML(modelLabel)}</td>
          <td>${escapeHTML(serialLabel)}</td>
          <td>
            <div class="status-with-meta">
              <span class="tag tag--status ${getEffectiveStatus(item) === "In transit" ? "tag--in-transit" : ""}">${escapeHTML(
            getEffectiveStatus(item)
          )}</span>
              ${compactShippingMeta ? `<small class="status-meta">${escapeHTML(compactShippingMeta)}</small>` : ""}
              ${hasDetailsAction ? `<button class="icon-button icon-button--inline" type="button" data-action="toggle-equipment-shipping-details" data-equipment-id="${escapeHTML(item.id)}">View</button>` : ""}
            </div>
          </td>
          <td><span class="tag">${escapeHTML(locationDisplay.text)}</span>${locationDisplay.inTransit ? " <span class=\"tag tag--status\">In transit</span>" : ""}</td>
          <td>${calibrationCell}</td>
          <td>${subscriptionCell}</td>
          <td>${buildEquipmentConditionCell(item)}</td>
          <td>${escapeHTML(item.lastMoved)}</td>
        </tr>
        ${hasDetailsAction ? `<tr class="equipment-shipping-details-row is-hidden" data-shipping-details-for="${escapeHTML(item.id)}"><td colspan="9"><div class="shipping-details-card"><div class="shipping-details-grid"><div><strong>Carrier</strong><span>${escapeHTML(activeShippingMove.shipping?.carrier || "—")}</span></div><div><strong>Tracking number</strong><span>${escapeHTML(activeShippingMove.shipping?.trackingNumber || "—")}</span><button class="icon-button icon-button--inline" type="button" data-action="copy-tracking" data-tracking-number="${escapeHTML(activeShippingMove.shipping?.trackingNumber || "")}">Copy</button></div><div><strong>Ship date</strong><span>${escapeHTML(activeShippingMove.shipping?.shipDate || "—")}</span></div><div><strong>ETA</strong><span>${escapeHTML(activeShippingMove.shipping?.etaDate || "—")}</span></div><div><strong>Delivered</strong><span>${escapeHTML(activeShippingMove.shipping?.deliveredAt || "—")}</span></div><div><strong>Route</strong><span>${escapeHTML(activeShippingMove.fromLocation || "—")} → ${escapeHTML(activeShippingMove.toLocation || "—")}</span></div><div><strong>Notes</strong><span>${escapeHTML(activeShippingMove.notes || "—")}</span></div></div></div></td></tr>` : ""}
      `;
        }
      )
      .join("");
  }
}

function renderHistory() {
  const allMoves = getAllMovesFromState().filter(
    (entry) => !isEntryDeleted(entry)
  );
  if (allMoves.length === 0) {
    if (elements.historyList) {
      elements.historyList.innerHTML = "<li>No moves logged yet.</li>";
    }
    return;
  }

  if (elements.historyList) {
    elements.historyList.innerHTML = allMoves
      .slice(0, 8)
      .map(
        (entry) => {
          const timestamp = entry.timestamp ?? "";
          const message =
            entry.text ?? entry.notes ?? entry.message ?? "Update logged.";
          return `<li><strong>${escapeHTML(
            timestamp
          )}</strong> — ${escapeHTML(message)}</li>`;
        }
      )
      .join("");
  }
}

function formatEquipmentLabel({ name, model, serialNumber } = {}) {
  const safeName = name?.trim() ? name.trim() : "";
  if (!safeName) {
    return "Unknown equipment";
  }
  const parts = [safeName];
  if (model?.trim()) {
    parts.push(model.trim());
  }
  if (serialNumber?.trim()) {
    parts.push(serialNumber.trim());
  }
  return parts.join(" — ");
}

function resolveEquipmentForLog(entry) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  if (
    safeEntry.equipmentSnapshot &&
    typeof safeEntry.equipmentSnapshot === "object"
  ) {
    return safeEntry.equipmentSnapshot;
  }
  const equipmentId =
    typeof safeEntry.equipmentId === "string" && safeEntry.equipmentId.trim()
      ? String(safeEntry.equipmentId)
      : "";
  if (equipmentId) {
    const equipmentMatch = equipmentById.get(equipmentId);
    if (equipmentMatch) {
      return {
        name: equipmentMatch.name ?? "",
        model: equipmentMatch.model ?? "",
        serialNumber: equipmentMatch.serialNumber ?? "",
      };
    }
  }

  const notesText =
    typeof safeEntry.notes === "string"
      ? safeEntry.notes
      : typeof safeEntry.message === "string"
        ? safeEntry.message
        : "";
  const text = typeof safeEntry.text === "string" ? safeEntry.text : "";
  const parsedId = parseEquipmentIdFromText(
    `${notesText} ${text}`.trim()
  );
  if (parsedId) {
    const equipmentMatch = equipmentById.get(parsedId);
    if (equipmentMatch) {
      return {
        name: equipmentMatch.name ?? "",
        model: equipmentMatch.model ?? "",
        serialNumber: equipmentMatch.serialNumber ?? "",
      };
    }
  }

  return null;
}

function getEquipmentSummary(entry) {
  const resolved = resolveEquipmentForLog(entry);
  if (resolved) {
    return formatEquipmentLabel(resolved);
  }
  return "Unknown equipment";
}

function getStatusChangeLabel(entry) {
  const statusFrom = entry.statusFrom?.trim() ? entry.statusFrom : "";
  const statusTo = entry.statusTo?.trim() ? entry.statusTo : "";
  if (statusFrom && statusTo && statusFrom !== statusTo) {
    return `${statusFrom} → ${statusTo}`;
  }
  if (statusTo) {
    return statusTo;
  }
  return "";
}

function getAllMovesFromState() {
  const movesLegacy = Array.isArray(state.log) ? state.log : [];
  const movesNew = Array.isArray(state.moves) ? state.moves : [];
  const allMoves = [...movesLegacy, ...movesNew];
  return dedupeHistoryEntries(allMoves);
}

function isEntryDeleted(entry) {
  return Boolean(entry && typeof entry === "object" && entry.deletedAt);
}

function buildCorrectionsByEntryId(entries, { includeDeleted = false } = {}) {
  const corrections = new Map();
  const list = Array.isArray(entries) ? entries : [];
  list.forEach((entry) => {
    if (!entry || entry.type !== "correction") {
      return;
    }
    if (!includeDeleted && isEntryDeleted(entry)) {
      return;
    }
    const targetId =
      typeof entry.correctionOf === "string" && entry.correctionOf.trim()
        ? entry.correctionOf.trim()
        : "";
    if (!targetId) {
      return;
    }
    if (!corrections.has(targetId)) {
      corrections.set(targetId, []);
    }
    corrections.get(targetId).push(entry);
  });
  return corrections;
}

function getFilteredMoves() {
  const equipmentFilter = elements.movesEquipmentFilter?.value ?? "all";
  const typeFilter = elements.movesTypeFilter?.value ?? "all";
  const destinationFilter = elements.movesDestinationFilter?.value ?? "All offices";
  const receiptOnly = elements.movesReceiptOnly?.checked ?? false;
  const showDeleted = elements.movesShowDeleted?.checked ?? false;
  const subscriptionFilter = elements.subscriptionFilter
    ? elements.subscriptionFilter.value
    : "All";
  const searchTerm = elements.movesSearch
    ? elements.movesSearch.value.trim().toLowerCase()
    : "";

  const allMoves = getAllMovesFromState();
  const now = new Date();
  const filtered = allMoves.filter((entry) => {
    if (!showDeleted && isEntryDeleted(entry)) {
      return false;
    }
    if (equipmentFilter !== "all" && entry.equipmentId !== equipmentFilter) {
      return false;
    }
    if (typeFilter !== "all" && entry.type !== typeFilter) {
      return false;
    }
    if (receiptOnly) {
      if (!isMoveAwaitingReceipt(entry)) {
        return false;
      }
    }
    if (destinationFilter !== "All offices") {
      if (entry.type !== "move") {
        return false;
      }
      const destination = entry.toLocation?.trim() || "";
      if (destination !== destinationFilter) {
        return false;
      }
    }
    if (subscriptionFilter !== "All") {
      const equipment = entry.equipmentId
        ? equipmentById.get(entry.equipmentId)
        : null;
      const subscriptionStatus = equipment
        ? getSubscriptionInfo(equipment, now).status
        : "Unknown";
      if (subscriptionStatus !== subscriptionFilter) {
        return false;
      }
    }
    if (!searchTerm) {
      return true;
    }
    const equipmentLabel = getEquipmentSummary(entry).toLowerCase();
    const notesLabel = `${entry.notes ?? ""} ${entry.text ?? ""}`.toLowerCase();
    const shippingLabel = `${entry.shipping?.carrier ?? ""} ${entry.shipping?.trackingNumber ?? ""}`
      .trim()
      .toLowerCase();
    return (
      equipmentLabel.includes(searchTerm) ||
      notesLabel.includes(searchTerm) ||
      shippingLabel.includes(searchTerm)
    );
  });
  return filtered;
}

function isMoveAwaitingReceipt(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  if (entry.type !== "move") {
    return false;
  }
  if (!entry.shipping || !hasShippingReceiptDetails(entry.shipping)) {
    return false;
  }
  return !getMoveReceivedAt(entry);
}

function getReceiptIndicator(entry) {
  const receivedAt = getMoveReceivedAt(entry);
  if (receivedAt) {
    return `Received ${formatDateTime(receivedAt)}`;
  }
  if (entry?.shipping && hasShippingReceiptDetails(entry.shipping)) {
    return "Awaiting receipt";
  }
  return "—";
}

function getLatestMoveEntryForEquipment(equipmentId) {
  if (!equipmentId) {
    return null;
  }
  const entries = getAllMovesFromState().filter(
    (entry) =>
      entry.equipmentId === equipmentId &&
      entry.type === "move" &&
      !isEntryDeleted(entry)
  );
  if (!entries.length) {
    return null;
  }
  return entries.reduce((latest, entry) => {
    const latestTime = Date.parse(latest.timestamp || "");
    const entryTime = Date.parse(entry.timestamp || "");
    if (Number.isFinite(entryTime) && !Number.isFinite(latestTime)) {
      return entry;
    }
    return entryTime > latestTime ? entry : latest;
  }, entries[0]);
}

function getEquipmentLocationDisplay(item) {
  const latestMove = getLatestMoveEntryForEquipment(item.id);
  if (
    latestMove &&
    isShippingActive(item) &&
    latestMove.fromLocation?.trim() &&
    latestMove.toLocation?.trim() &&
    latestMove.fromLocation !== latestMove.toLocation
  ) {
    return {
      text: `In transit (${latestMove.fromLocation} → ${latestMove.toLocation})`,
      inTransit: true,
    };
  }
  return {
    text: item.location,
    inTransit: isShippingActive(item),
  };
}

function getCompactShippingMeta(shipping) {
  if (!shipping || typeof shipping !== "object") {
    return "";
  }
  const parts = [shipping.carrier, shipping.trackingNumber].filter(
    (value) => typeof value === "string" && value.trim()
  );
  const etaDate = parseFlexibleDate(shipping.etaDate);
  if (etaDate) {
    parts.push(`ETA ${etaDate}`);
  }
  return parts.join(" • ");
}

function getMovesShippingSummary(entry) {
  const shipping =
    entry && typeof entry === "object" ? normalizeShippingDetails(entry.shipping) : null;
  if (!shipping) {
    return "—";
  }
  const carrierTrackingParts = [shipping.carrier, shipping.trackingNumber].filter(
    (value) => typeof value === "string" && value.trim()
  );
  const topLine = carrierTrackingParts.length
    ? carrierTrackingParts.join(": ")
    : "—";
  const timelineParts = [];
  if (shipping.shipDate) {
    timelineParts.push(`Shipped ${shipping.shipDate}`);
  }
  if (shipping.etaDate) {
    timelineParts.push(`ETA ${shipping.etaDate}`);
  }
  const bottomLine = timelineParts.join(" • ");
  return bottomLine ? `${topLine}
${bottomLine}` : topLine;
}

function formatDeletedMeta(entry) {
  if (!isEntryDeleted(entry)) {
    return "";
  }
  const deletedAt =
    typeof entry.deletedAt === "string" && entry.deletedAt.trim()
      ? entry.deletedAt
      : "Unknown time";
  const deletedBy =
    typeof entry.deletedBy === "string" && entry.deletedBy.trim()
      ? entry.deletedBy
      : "Admin";
  const reason =
    typeof entry.deleteReason === "string" && entry.deleteReason.trim()
      ? entry.deleteReason.trim()
      : "";
  const reasonLabel = reason ? `Reason: ${reason}` : "No reason provided.";
  return `Deleted ${deletedAt} by ${deletedBy}. ${reasonLabel}`;
}

function buildNotesHtml({ baseNotes, corrections, deletedMeta, referenceLabel }) {
  const parts = [];
  if (baseNotes) {
    parts.push(`<div>${escapeHTML(baseNotes)}</div>`);
  }
  if (referenceLabel) {
    parts.push(
      `<div class="moves-note-meta">${escapeHTML(referenceLabel)}</div>`
    );
  }
  if (Array.isArray(corrections) && corrections.length) {
    const items = corrections
      .map((correction) => {
        const note =
          correction.notes?.trim() ||
          correction.text?.trim() ||
          "Correction logged.";
        const timestamp = correction.timestamp ?? "";
        return `<li><strong>${escapeHTML(
          timestamp
        )}</strong> — ${escapeHTML(note)}</li>`;
      })
      .join("");
    parts.push(
      `<div class="moves-corrections"><p>Corrections</p><ul>${items}</ul></div>`
    );
  }
  if (deletedMeta) {
    parts.push(
      `<div class="moves-note-meta moves-note-meta--deleted">${escapeHTML(
        deletedMeta
      )}</div>`
    );
  }
  if (!parts.length) {
    return "—";
  }
  return parts.join("");
}

function renderMovesView() {
  if (!elements.movesTableBody || !elements.movesTableHeader) {
    return;
  }
  syncEquipmentById();
  const showDeleted = elements.movesShowDeleted?.checked ?? false;
  const allMoves = getAllMovesFromState();
  const correctionsByEntryId = buildCorrectionsByEntryId(allMoves, {
    includeDeleted: showDeleted,
  });
  const entryById = new Map(
    allMoves
      .filter((entry) => entry && entry.id)
      .map((entry) => [entry.id, entry])
  );
  const filteredMoves = getFilteredMoves();
  const showDeleteActions = adminModeEnabled;
  const hasCorrectionAction = filteredMoves.some(
    (entry) => entry.type !== "correction" && !isEntryDeleted(entry)
  );
  const hasReceivableMove = filteredMoves.some(
    (entry) => isMoveAwaitingReceipt(entry)
  );
  const showActions = showDeleteActions || hasReceivableMove || hasCorrectionAction;

  const headers = [
    "Timestamp",
    "Equipment",
    "From location",
    "To location",
    "Status change",
    "Shipping",
    "Receipt",
    "Condition",
    "Notes",
    "Type",
  ];

  if (showActions) {
    headers.push("Actions");
  }

  elements.movesTableHeader.innerHTML = `
    <tr>
      ${headers.map((label) => `<th>${escapeHTML(label)}</th>`).join("")}
    </tr>
  `;

  if (filteredMoves.length === 0) {
    elements.movesTableBody.innerHTML = `
      <tr>
        <td colspan="${headers.length}">No moves found.</td>
      </tr>
    `;
    return;
  }

  elements.movesTableBody.innerHTML = filteredMoves
    .map((entry) => {
      const equipmentLabel = getEquipmentSummary(entry);
      const fromLocation = entry.fromLocation?.trim()
        ? entry.fromLocation
        : "";
      const toLocation = entry.toLocation?.trim() ? entry.toLocation : "";
      const baseNotes =
        entry.notes?.trim() ||
        entry.text?.trim() ||
        entry.message?.trim() ||
        "";
      const conditionSummary = formatConditionSummary(entry.condition);
      const shippingSummary = getMovesShippingSummary(entry);
      const receiptIndicator = getReceiptIndicator(entry);
      const typeLabel =
        entry.type === "details_updated"
          ? "Details updated"
          : entry.type === "calibration"
            ? "Calibration"
            : entry.type === "subscription_updated"
              ? "Subscription"
              : entry.type === "correction"
                ? "Correction"
              : entry.type === "condition_reference_updated"
                ? "Condition checklist"
                : entry.type === "received"
                  ? "Received"
                  : "Move";
      const canMarkReceived = isMoveAwaitingReceipt(entry);
      const actions = [];
      if (canMarkReceived) {
        actions.push(
          `<button class="icon-button" type="button" data-action="mark-received" data-id="${escapeHTML(entry.id)}">Mark received</button>`
        );
      }
      if (entry.type !== "correction" && !isEntryDeleted(entry)) {
        actions.push(
          `<button class="icon-button" type="button" data-action="add-correction" data-id="${escapeHTML(entry.id)}">Add correction</button>`
        );
      }
      if (showDeleteActions) {
        actions.push(
          `<button class="icon-button" type="button" data-action="delete-move" data-id="${escapeHTML(entry.id)}">Soft delete</button>`
        );
      }
      const actionCell = showActions ? `<td>${actions.join(" ")}</td>` : "";
      const corrections = correctionsByEntryId.get(entry.id) ?? [];
      const deletedMeta = formatDeletedMeta(entry);
      const targetEntry =
        entry.type === "correction" && entry.correctionOf
          ? entryById.get(entry.correctionOf)
          : null;
      const referenceLabel =
        entry.type === "correction" && entry.correctionOf
          ? `Correction for entry ${
              targetEntry?.timestamp ? targetEntry.timestamp : entry.correctionOf
            }.`
          : "";
      const notesHtml = buildNotesHtml({
        baseNotes,
        corrections,
        deletedMeta,
        referenceLabel,
      });
      return `
        <tr class="${isEntryDeleted(entry) ? "moves-row--deleted" : ""}">
          <td>${escapeHTML(entry.timestamp)}</td>
          <td>${escapeHTML(equipmentLabel)}</td>
          <td>${escapeHTML(fromLocation)}</td>
          <td>${escapeHTML(toLocation)}</td>
          <td>${escapeHTML(getStatusChangeLabel(entry))}</td>
          <td><div class="moves-shipping-cell">${escapeHTML(shippingSummary)}</div></td>
          <td>${escapeHTML(receiptIndicator)}</td>
          <td>${escapeHTML(conditionSummary)}</td>
          <td>${notesHtml}</td>
          <td>${escapeHTML(typeLabel)}</td>
          ${actionCell}
        </tr>
      `;
    })
    .join("");
}

function renderLocationSummary() {
  const summaries = state.locations.map((location) => {
    const items = state.equipment.filter((item) => item.location === location);
    const safeLocation = escapeHTML(location);
    const listItems = items.length
      ? items
          .map(
            (item) => `
              <li class="summary-item">
                <span class="summary-item-name">${escapeHTML(item.name)}</span>
                <span class="summary-item-meta">${escapeHTML(
                  item.lastMoved
                )}</span>
              </li>
            `
          )
          .join("")
      : '<li class="summary-empty">No equipment assigned.</li>';

    return `
      <article class="summary-card">
        <div class="summary-card-header">
          <h4>${safeLocation}</h4>
          <button class="summary-action" type="button" data-location="${safeLocation}">
            Filter table
          </button>
        </div>
        <div class="summary-count">${items.length} item${
          items.length === 1 ? "" : "s"
        }</div>
        <ul class="summary-list">${listItems}</ul>
      </article>
    `;
  });

  if (elements.locationSummary) {
    elements.locationSummary.innerHTML = summaries.join("");
  }
}

function refreshUI() {
  syncEquipmentById();
  renderLocationOptions();
  renderStatusOptions();
  renderCalibrationOptions();
  renderSubscriptionOptions();
  renderEquipmentOptions();
  renderMovesFilters();
  renderTable();
  renderHistory();
  renderLocationSummary();
  renderMovesView();
  syncMoveConditionReference();
  syncMoveConditionNotesError();
  syncMoveShippingDefaults();
  if (elements.clearHistory) {
    elements.clearHistory.classList.toggle("is-hidden", !adminModeEnabled);
    elements.clearHistory.disabled = !adminModeEnabled;
  }
  syncCalibrationForm();
  syncAddSubscriptionInputs({ clearWhenDisabled: false });
  syncEditForm();
}

function getAvailableTabButtons() {
  return elements.tabButtons.filter((button) => !button.hidden);
}

function getAvailableTabs() {
  return getAvailableTabButtons().map((button) => button.dataset.tab);
}

function normalizeTabName(tabName) {
  const name =
    typeof tabName === "string" ? tabName.trim().toLowerCase() : "";
  if (!name) {
    return "operations";
  }
  return ["operations", "moves", "admin"].includes(name)
    ? name
    : "operations";
}

function setActiveTab(tabName, { focus = false } = {}) {
  const normalizedTab = normalizeTabName(tabName);
  const allowedTab =
    normalizedTab === "admin" && !adminModeEnabled
      ? "operations"
      : normalizedTab;
  const resolvedTab = normalizeTabName(allowedTab);
  const hasViews = Boolean(
    elements.operationsView || elements.movesView || elements.adminView
  );
  const hasButtons = elements.tabButtons.length > 0;

  if (!hasViews && !hasButtons) {
    return;
  }

  const visibleButtons = hasButtons
    ? elements.tabButtons.filter((button) => !button.hidden)
    : [];
  const nextTabButton = visibleButtons.length
    ? visibleButtons.find((button) => button.dataset.tab === resolvedTab) ||
      visibleButtons[0]
    : null;
  const nextName = nextTabButton?.dataset.tab ?? resolvedTab;

  if (elements.operationsView) {
    elements.operationsView.hidden = nextName !== "operations";
  }
  if (elements.movesView) {
    elements.movesView.hidden = nextName !== "moves";
  }
  if (elements.adminView) {
    elements.adminView.hidden = nextName !== "admin";
  }

  if (hasButtons) {
    elements.tabButtons.forEach((button) => {
      if (button.hidden) {
        return;
      }
      const isActive = button.dataset.tab === nextName;
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
      button.classList.toggle("is-active", isActive);
    });
  }

  localStorage.setItem(TAB_STORAGE_KEY, normalizeTabName(nextName));
  if (focus && nextTabButton) {
    nextTabButton.focus();
  }
}

function goToAdminEditEquipment(equipmentId) {
  if (!equipmentId) {
    return;
  }
  requestAdminModeEnable(() => {
    setActiveTab("admin", { focus: true });
    if (elements.editEquipmentSelect) {
      elements.editEquipmentSelect.value = equipmentId;
      syncEditForm();
    }
  });
}

function initTabs() {
  const stored = normalizeTabName(localStorage.getItem(TAB_STORAGE_KEY));
  const availableTabs = elements.tabButtons
    .filter((button) => !button.hidden)
    .map((button) => button.dataset.tab);
  const fallbackTab = availableTabs[0] ?? "operations";
  const initialTab = availableTabs.includes(stored)
    ? stored
    : normalizeTabName(fallbackTab);
  setActiveTab(initialTab);

  if (!elements.tabButtons.length) {
    return;
  }

  elements.tabButtons.forEach((button, index) => {
    if (!button) {
      return;
    }
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab, { focus: true });
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const visibleButtons = getAvailableTabButtons();
      const currentIndex = visibleButtons.indexOf(button);
      if (currentIndex === -1) {
        return;
      }
      const nextIndex =
        (currentIndex + direction + availableButtons.length) %
        availableButtons.length;
      const nextButton = availableButtons[nextIndex];
      setActiveTab(nextButton.dataset.tab, { focus: true });
    });
  });
}

function logHistory(entry) {
  const baseEntry =
    typeof entry === "string" ? { text: entry } : entry || {};
  const equipmentId = baseEntry.equipmentId
    ? String(baseEntry.equipmentId)
    : "";
  const equipmentSnapshot =
    baseEntry.equipmentSnapshot && typeof baseEntry.equipmentSnapshot === "object"
      ? baseEntry.equipmentSnapshot
      : equipmentId && equipmentById.get(equipmentId)
        ? {
            name: equipmentById.get(equipmentId).name ?? "",
            model: equipmentById.get(equipmentId).model ?? "",
            serialNumber: equipmentById.get(equipmentId).serialNumber ?? "",
          }
        : null;
  const historyEntry = normalizeHistoryEntry(
    {
      ...baseEntry,
      equipmentId,
      equipmentSnapshot,
      type: normalizeHistoryType(baseEntry.type, baseEntry.text ?? ""),
      id: crypto.randomUUID(),
      timestamp: formatTimestampISO(),
    },
    state.equipment
  );
  state.moves.unshift(historyEntry);
}

function buildSubscriptionNotes({
  subscriptionRequired,
  subscriptionRenewalDate,
}) {
  const renewalLabel = subscriptionRenewalDate
    ? subscriptionRenewalDate
    : "unknown";
  return `Subscription required: ${
    subscriptionRequired ? "true" : "false"
  }, renewal date: ${renewalLabel}.`;
}

function parseChecklistEntries(rawText = "") {
  const normalized = String(rawText || "").replace(/•/g, "\n");
  return normalized
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
    )
    .filter(Boolean);
}

function renderChecklistList(listElement, emptyElement, entries) {
  if (!listElement || !emptyElement) {
    return;
  }
  const items = Array.isArray(entries) ? entries : [];
  listElement.innerHTML = items
    .map((entry) => `<li>${escapeHTML(entry)}</li>`)
    .join("");
  emptyElement.classList.toggle("is-hidden", items.length > 0);
}

function isMoveConditionChecklistComplete() {
  if (!elements.moveConditionRating || !elements.moveContentsOk || !elements.moveFunctionalOk) {
    return false;
  }
  return Boolean(
    elements.moveConditionRating.value &&
      elements.moveContentsOk.value &&
      elements.moveFunctionalOk.value
  );
}

function hasMoveConditionFailures() {
  if (!elements.moveConditionRating || !elements.moveContentsOk || !elements.moveFunctionalOk) {
    return false;
  }
  return (
    elements.moveConditionRating.value === "Needs attention" ||
    elements.moveConditionRating.value === "Unserviceable" ||
    elements.moveContentsOk.value === "No" ||
    elements.moveFunctionalOk.value === "No"
  );
}

function validateMoveConditionChecklist({ showErrors = false } = {}) {
  if (!elements.moveEquipment || !elements.moveSubmit || !elements.moveChecklistLock) {
    return false;
  }
  const equipmentId = elements.moveEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    elements.moveSubmit.disabled = true;
    return false;
  }
  const conditionRequired = isMoveConditionRequired(item);
  const completeChecklist = isMoveConditionChecklistComplete();
  const failedChecks = hasMoveConditionFailures();
  const hasNotes = Boolean(elements.moveConditionNotes?.value.trim());
  const requiresFailureNotes = conditionRequired && failedChecks;
  const notesValid = !requiresFailureNotes || hasNotes;
  const canSubmit = conditionRequired ? completeChecklist && notesValid : true;

  elements.moveSubmit.disabled = !canSubmit;
  if (elements.moveSubmitBlocked) {
    const showBlocked = conditionRequired && !completeChecklist;
    elements.moveSubmitBlocked.classList.toggle("is-hidden", !showBlocked);
  }
  if (elements.moveConditionNotesError) {
    const shouldShowError =
      showErrors && requiresFailureNotes && !hasNotes;
    elements.moveConditionNotesError.classList.toggle("is-hidden", !shouldShowError);
  }
  if (elements.moveConditionExemptNote) {
    elements.moveConditionExemptNote.classList.toggle(
      "is-hidden",
      conditionRequired
    );
  }
  return canSubmit;
}

function resetMoveConditionInputs() {
  if (elements.moveConditionNotes) {
    elements.moveConditionNotes.value = "";
  }
  if (elements.moveContentsOk) {
    elements.moveContentsOk.value = "";
  }
  if (elements.moveFunctionalOk) {
    elements.moveFunctionalOk.value = "";
  }
  if (elements.moveConditionRating) {
    elements.moveConditionRating.value = "";
  }
  validateMoveConditionChecklist();
}

function updateMoveChecklistLock() {
  if (
    !elements.moveEquipment ||
    !elements.moveChecklistLock ||
    !elements.moveSubmit
  ) {
    return;
  }
  const equipmentId = elements.moveEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  const checklistDefined = item
    ? hasChecklistDefined(item.conditionReference)
    : false;
  elements.moveChecklistLock.classList.toggle("is-hidden", checklistDefined);
  if (elements.moveChecklistAdminLink) {
    elements.moveChecklistAdminLink.dataset.equipmentId = equipmentId;
  }
  validateMoveConditionChecklist();
}

function syncMoveConditionReference() {
  if (
    !elements.moveEquipment ||
    !elements.moveContentsChecklist ||
    !elements.moveContentsChecklistEmpty ||
    !elements.moveFunctionalChecklist ||
    !elements.moveFunctionalChecklistEmpty
  ) {
    return;
  }
  const equipmentId = elements.moveEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  const conditionReference = normalizeConditionReference(
    item?.conditionReference
  );
  const contentsEntries = parseChecklistEntries(
    conditionReference.contentsChecklist
  );
  const functionalEntries = parseChecklistEntries(
    conditionReference.functionalChecklist
  );
  renderChecklistList(
    elements.moveContentsChecklist,
    elements.moveContentsChecklistEmpty,
    contentsEntries
  );
  renderChecklistList(
    elements.moveFunctionalChecklist,
    elements.moveFunctionalChecklistEmpty,
    functionalEntries
  );
  updateMoveChecklistLock();
}

function syncMoveShippingStatusOverride() {
  if (
    !elements.moveStatus ||
    !elements.moveShippingCarrier ||
    !elements.moveShippingTracking ||
    !elements.moveShippingShipDate ||
    !elements.moveShippingOverrideNote
  ) {
    return;
  }
  const shippingActive = isMoveShippingActive();
  elements.moveStatus.disabled = shippingActive;
  if (shippingActive) {
    elements.moveStatus.value = "Keep current status";
    elements.moveShippingOverrideNote.classList.remove("is-hidden");
  } else {
    elements.moveShippingOverrideNote.classList.add("is-hidden");
  }
  validateMoveConditionChecklist();
}

function syncMoveShippingDefaults() {
  if (!elements.moveShippingShipDate) {
    return;
  }
  if (!parseFlexibleDate(elements.moveShippingShipDate.value)) {
    elements.moveShippingShipDate.value = formatDate(new Date());
  }
  syncMoveShippingStatusOverride();
}

function syncMoveConditionNotesError() {
  validateMoveConditionChecklist();
}

function isMoveShippingActive() {
  if (
    !elements.moveShippingCarrier ||
    !elements.moveShippingTracking ||
    !elements.moveShippingShipDate
  ) {
    return false;
  }
  const hasCarrierOrTracking = Boolean(
    elements.moveShippingCarrier.value.trim() ||
      elements.moveShippingTracking.value.trim()
  );
  const hasShipDate = Boolean(
    parseFlexibleDate(elements.moveShippingShipDate.value)
  );
  return hasCarrierOrTracking && hasShipDate;
}

function getMoveConditionStatus(item) {
  if (isMoveShippingActive()) {
    return "In transit";
  }
  if (!elements.moveStatus) {
    return item?.status ?? "";
  }
  const selectedStatus = elements.moveStatus.value;
  if (selectedStatus && selectedStatus !== "Keep current status") {
    return selectedStatus;
  }
  return item?.status ?? "";
}

function isMoveConditionRequired(item) {
  const status = getMoveConditionStatus(item);
  return !moveConditionExemptStatuses.has(status);
}

function handleMoveSubmit(event) {
  event.preventDefault();
  if (
    !elements.moveEquipment ||
    !elements.moveLocation ||
    !elements.moveStatus ||
    !elements.moveNotes ||
    !elements.moveConditionRating ||
    !elements.moveContentsOk ||
    !elements.moveFunctionalOk ||
    !elements.moveConditionNotes ||
    !elements.moveShippingCarrier ||
    !elements.moveShippingTracking ||
    !elements.moveShippingShipDate ||
    !elements.moveShippingEtaDate
  ) {
    return;
  }
  if (isMoveSaving) {
    return;
  }
  const equipmentId = elements.moveEquipment.value;
  const newLocation = elements.moveLocation.value;
  const newStatus = elements.moveStatus.value;
  const notes = elements.moveNotes.value.trim();
  const conditionRating = elements.moveConditionRating.value;
  const contentsOk = elements.moveContentsOk.value;
  const functionalOk = elements.moveFunctionalOk.value;
  const conditionNotes = elements.moveConditionNotes.value.trim();
  const shippingCarrier = elements.moveShippingCarrier.value.trim();
  const shippingTracking = elements.moveShippingTracking.value.trim();
  const shippingShipDate = parseFlexibleDate(elements.moveShippingShipDate.value);
  const shippingEtaDate = parseFlexibleDate(elements.moveShippingEtaDate.value);

  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }
  const conditionRequired = isMoveConditionRequired(item);
  const failedChecks = [
    conditionRating === "Needs attention",
    conditionRating === "Unserviceable",
    contentsOk === "No",
    functionalOk === "No",
  ].some(Boolean);
  const checklistValid = validateMoveConditionChecklist({ showErrors: true });
  if (!checklistValid) {
    if (conditionRequired) {
      if (elements.moveSubmitBlocked) {
        elements.moveSubmitBlocked.classList.remove("is-hidden");
      }
      showToast("Move not recorded: complete the condition check.", "error");
    }
    if (conditionRequired && failedChecks && !conditionNotes && elements.moveConditionNotes) {
      elements.moveConditionNotes.focus();
    }
    return;
  }
  isMoveSaving = true;
  setMoveSubmitSaving(true);
  try {
    const previousLocation = item.location;
    const previousStatus = item.status;
    item.location = newLocation;
    if (newStatus && newStatus !== "Keep current status") {
      item.status = newStatus;
    }
    item.lastMoved = formatTimestamp();

    const statusNote =
      newStatus && newStatus !== "Keep current status"
        ? ` with status ${item.status}`
        : "";
    const message = `${item.name} moved to ${newLocation}${statusNote}${
      notes ? ` (${notes}).` : "."
    }`;

    const conditionEntry = conditionRequired
      ? {
          rating: conditionRating,
          contentsOk: contentsOk === "Yes",
          functionalOk: functionalOk === "Yes",
          notes: conditionNotes,
          checkedAt: formatTimestampISO(),
          checkedBy: "",
        }
      : null;
    if (conditionEntry) {
      applyConditionSnapshot(item, conditionEntry);
    }

    logHistory({
      type: "move",
      text: message,
      equipmentId: String(item.id),
      equipmentSnapshot: {
        name: item.name,
        model: item.model,
        serialNumber: item.serialNumber,
      },
      fromLocation: previousLocation,
      toLocation: newLocation,
      statusFrom: previousStatus,
      statusTo: getEffectiveStatus(item),
      notes,
      condition: conditionEntry,
      receivedAt: "",
      shipping: {
        carrier: shippingCarrier,
        trackingNumber: shippingTracking,
        shipDate: shippingShipDate,
        etaDate: shippingEtaDate,
        deliveredAt: "",
      },
    });
    resetMoveForm();
    saveState();
    refreshUI();
    const statusSummary = `Now: ${getEffectiveStatus(item)} in ${getEquipmentLocationDisplay(item).text}.`;
    showToast(`Move recorded for ${item.name}. ${statusSummary}`, "success");
    window.requestAnimationFrame(() => {
      highlightEquipmentRow(item.id);
    });
  } catch (error) {
    console.error("Failed to record move", error);
    showToast("Something went wrong while recording the move.", "error");
  } finally {
    isMoveSaving = false;
    setMoveSubmitSaving(false);
  }
}

function syncCalibrationForm() {
  if (
    !elements.calibrationEquipment ||
    !elements.calibrationDate ||
    !elements.calibrationRequired
  ) {
    return;
  }
  const equipmentId = elements.calibrationEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }
  elements.calibrationRequired.checked = Boolean(item.calibrationRequired);
  if (!elements.calibrationDate.value) {
    elements.calibrationDate.value = formatDate(new Date());
  }
}

function handleCalibrationSubmit(event) {
  event.preventDefault();
  if (
    !elements.calibrationEquipment ||
    !elements.calibrationDate ||
    !elements.calibrationRequired
  ) {
    return;
  }

  const equipmentId = elements.calibrationEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

  const calibrationDate = elements.calibrationDate.value;
  if (calibrationDate) {
    item.lastCalibrationDate = calibrationDate;
  }
  const intervalValue = elements.calibrationInterval?.value ?? "";
  if (String(intervalValue).trim()) {
    const parsedInterval = Number(intervalValue);
    if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
      item.calibrationIntervalMonths = parsedInterval;
    }
  }

  item.calibrationRequired = elements.calibrationRequired.checked;
  item.lastMoved = formatTimestamp();
  logHistory({
    type: "calibration",
    text: `${item.name} calibration recorded.`,
    equipmentId: String(item.id),
    equipmentSnapshot: {
      name: item.name,
      model: item.model,
      serialNumber: item.serialNumber,
    },
  });
  if (elements.calibrationInterval) {
    elements.calibrationInterval.value = "";
  }
  saveState();
  refreshUI();
}

function handleAddEquipment(event) {
  event.preventDefault();
  if (
    !elements.addEquipmentName ||
    !elements.addEquipmentModel ||
    !elements.addEquipmentSerial ||
    !elements.addEquipmentPurchaseDate ||
    !elements.addEquipmentLocation ||
    !elements.addEquipmentStatus
  ) {
    return;
  }
  const name = elements.addEquipmentName.value.trim();
  const model = elements.addEquipmentModel.value.trim();
  const serialNumber = elements.addEquipmentSerial.value.trim();
  const purchaseDate = elements.addEquipmentPurchaseDate.value;
  const location = elements.addEquipmentLocation.value;
  const status = elements.addEquipmentStatus.value;
  const calibrationRequired =
    elements.addEquipmentCalibrationRequired?.checked ?? true;
  const calibrationInterval = getSelectedCalibrationInterval();
  const lastCalibrationDate = calibrationRequired
    ? elements.addEquipmentLastCalibration?.value ?? ""
    : "";
  const subscriptionRequired =
    elements.addEquipmentSubscriptionRequired?.checked ?? false;
  const subscriptionRenewalDate = subscriptionRequired
    ? elements.addEquipmentSubscriptionDate?.value ?? ""
    : "";
  if (!name) {
    return;
  }

  toggleSerialWarning(
    elements.addEquipmentSerialWarning,
    serialNumber,
    state.equipment
  );

  const calibrationDetails = normalizeCalibrationFields({
    calibrationRequired,
    calibrationIntervalMonths: calibrationInterval,
    lastCalibrationDate,
  });
  const subscriptionDetails = normalizeSubscriptionFields({
    subscriptionRequired,
    subscriptionRenewalDate,
  });

  const newItemId = crypto.randomUUID();
  state.equipment.push({
    id: newItemId,
    name,
    model,
    serialNumber,
    purchaseDate,
    conditionReference: {
      contentsChecklist: "",
      functionalChecklist: "",
    },
    ...calibrationDetails,
    ...subscriptionDetails,
    location,
    status,
    lastMoved: formatTimestamp(),
  });

  logHistory({
    type: "details_updated",
    text: `${name} added to ${location} with status ${status}.`,
    equipmentId: String(newItemId),
    equipmentSnapshot: {
      name,
      model,
      serialNumber,
    },
    toLocation: location,
    statusTo: status,
  });
  if (
    subscriptionDetails.subscriptionRequired ||
    subscriptionDetails.subscriptionRenewalDate
  ) {
    logHistory({
      type: "subscription_updated",
      text: `${name} subscription updated.`,
      equipmentId: String(newItemId),
      equipmentSnapshot: {
        name,
        model,
        serialNumber,
      },
      notes: buildSubscriptionNotes(subscriptionDetails),
    });
  }
  elements.addEquipmentName.value = "";
  elements.addEquipmentModel.value = "";
  elements.addEquipmentSerial.value = "";
  elements.addEquipmentPurchaseDate.value = "";
  if (elements.addEquipmentCalibrationRequired) {
    elements.addEquipmentCalibrationRequired.checked = true;
  }
  if (elements.addEquipmentCalibrationInterval) {
    elements.addEquipmentCalibrationInterval.value = "12";
  }
  if (elements.addEquipmentCalibrationIntervalCustom) {
    elements.addEquipmentCalibrationIntervalCustom.value = "";
  }
  if (elements.addEquipmentLastCalibration) {
    elements.addEquipmentLastCalibration.value = "";
  }
  if (elements.addEquipmentSubscriptionRequired) {
    elements.addEquipmentSubscriptionRequired.checked = false;
  }
  if (elements.addEquipmentSubscriptionDate) {
    elements.addEquipmentSubscriptionDate.value = "";
  }
  syncAddSubscriptionInputs({ clearWhenDisabled: false });
  toggleSerialWarning(
    elements.addEquipmentSerialWarning,
    "",
    state.equipment
  );
  saveState();
  refreshUI();
  syncCalibrationInputs();
}

function downloadImportTemplateCSV() {
  const template = buildEquipmentImportTemplate();
  const blob = new Blob([template], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "equipment-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function updateImportPreviewWithDuplicates() {
  const duplicateBehavior =
    elements.importDuplicateBehavior?.value ?? "skip";
  equipmentImportState.duplicateBehavior = duplicateBehavior;
  const result = applyDuplicateHandling(
    equipmentImportState.rawRows,
    duplicateBehavior
  );
  const issueWarnings = result.rows.flatMap((row) =>
    row.issues.map((issue) =>
      issue.startsWith("Row")
        ? issue
        : `Row ${row.rowNumber}: ${issue}`
    )
  );
  const combinedWarnings = [
    ...equipmentImportState.warnings,
    ...issueWarnings,
    ...result.warnings,
  ];
  const uniqueWarnings = Array.from(new Set(combinedWarnings));
  equipmentImportState.rows = result.rows;
  equipmentImportState.warnings = uniqueWarnings;
  equipmentImportState.validRows = result.validRows.length;
  equipmentImportState.invalidRows = result.invalidRows;
  renderImportPreview();
}

function handleImportFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    resetImportState();
    return;
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    equipmentImportState.rawRows = [];
    equipmentImportState.rows = [];
    equipmentImportState.totalRows = 0;
    equipmentImportState.validRows = 0;
    equipmentImportState.invalidRows = 0;
    equipmentImportState.warnings = [
      "Only CSV files are supported in this importer.",
    ];
    renderImportPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const rows = parseCsvText(text);
    if (rows.length < 2) {
      equipmentImportState.rawRows = [];
      equipmentImportState.rows = [];
      equipmentImportState.totalRows = 0;
      equipmentImportState.validRows = 0;
      equipmentImportState.invalidRows = 0;
      equipmentImportState.warnings = [
        "No data rows found in the CSV.",
      ];
      renderImportPreview();
      return;
    }
    const parsed = parseEquipmentImportRows(rows);
    equipmentImportState.rawRows = parsed.rawRows;
    equipmentImportState.totalRows = parsed.totalRows;
    equipmentImportState.warnings = parsed.warnings;
    updateImportPreviewWithDuplicates();
  };
  reader.onerror = () => {
    equipmentImportState.rawRows = [];
    equipmentImportState.rows = [];
    equipmentImportState.totalRows = 0;
    equipmentImportState.validRows = 0;
    equipmentImportState.invalidRows = 0;
    equipmentImportState.warnings = [
      "Failed to read the CSV file. Please try again.",
    ];
    renderImportPreview();
  };
  reader.readAsText(file);
}

function handleImportSubmit() {
  if (!equipmentImportState.rows.length) {
    return;
  }
  const itemsToImport = equipmentImportState.rows.filter((row) => row.isValid);
  if (!itemsToImport.length) {
    return;
  }
  const now = formatTimestamp();
  const importedItems = itemsToImport.map((row) => {
    const data = row.data;
    const calibrationDetails = normalizeCalibrationFields(data);
    const subscriptionDetails = normalizeSubscriptionFields(data);
    return {
      id: buildStableEquipmentId(data, row.rowNumber),
      name: data.name,
      model: data.model,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      location: data.location,
      status: data.status,
      conditionReference: {
        contentsChecklist: "",
        functionalChecklist: "",
      },
      calibrationRequired: calibrationDetails.calibrationRequired,
      calibrationIntervalMonths: calibrationDetails.calibrationIntervalMonths,
      lastCalibrationDate: calibrationDetails.lastCalibrationDate,
      subscriptionRequired: subscriptionDetails.subscriptionRequired,
      subscriptionRenewalDate: subscriptionDetails.subscriptionRenewalDate,
      lastMoved: now,
    };
  });

  state.equipment.push(...importedItems);
  logHistory({
    type: "Details updated",
    text: `Imported equipment (${importedItems.length} items).`,
  });
  saveState();
  refreshUI();
  resetImportState();
  if (elements.importFileInput) {
    elements.importFileInput.value = "";
  }
}

function handleImportClear() {
  resetImportState();
  if (elements.importFileInput) {
    elements.importFileInput.value = "";
  }
}

function syncEditForm() {
  if (
    !elements.editEquipmentSelect ||
    !elements.editEquipmentName ||
    !elements.editEquipmentModel ||
    !elements.editEquipmentSerial ||
    !elements.editEquipmentPurchaseDate ||
    !elements.editEquipmentLocation ||
    !elements.editEquipmentStatus ||
    !elements.editEquipmentCalibrationRequired ||
    !elements.editEquipmentCalibrationInterval ||
    !elements.editEquipmentCalibrationIntervalCustom ||
    !elements.editEquipmentLastCalibration ||
    !elements.editEquipmentSubscriptionRequired ||
    !elements.editEquipmentSubscriptionDate ||
    !elements.editEquipmentContentsChecklist ||
    !elements.editEquipmentFunctionalChecklist
  ) {
    return;
  }

  const equipmentId = elements.editEquipmentSelect.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    resetEditForm();
    return;
  }

  elements.editEquipmentName.value = item.name ?? "";
  elements.editEquipmentModel.value = item.model ?? "";
  elements.editEquipmentSerial.value = item.serialNumber ?? "";
  elements.editEquipmentPurchaseDate.value = item.purchaseDate ?? "";
  elements.editEquipmentLocation.value = item.location ?? "";
  elements.editEquipmentStatus.value = item.status ?? "";
  elements.editEquipmentCalibrationRequired.checked = Boolean(
    item.calibrationRequired
  );

  const intervalValue = Number(item.calibrationIntervalMonths);
  if (intervalValue === 12 || intervalValue === 24) {
    elements.editEquipmentCalibrationInterval.value = String(intervalValue);
    elements.editEquipmentCalibrationIntervalCustom.value = "";
  } else {
    elements.editEquipmentCalibrationInterval.value = "custom";
    elements.editEquipmentCalibrationIntervalCustom.value = Number.isFinite(
      intervalValue
    )
      ? String(intervalValue)
      : "";
  }

  elements.editEquipmentLastCalibration.value = item.lastCalibrationDate ?? "";
  const subscriptionRequired = Boolean(item.subscriptionRequired);
  if (elements.editEquipmentSubscriptionRequired) {
    elements.editEquipmentSubscriptionRequired.checked = subscriptionRequired;
  }
  if (elements.editEquipmentSubscriptionDate) {
    elements.editEquipmentSubscriptionDate.value = subscriptionRequired
      ? item.subscriptionRenewalDate ?? ""
      : "";
  }
  const conditionReference = normalizeConditionReference(
    item.conditionReference
  );
  elements.editEquipmentContentsChecklist.value =
    conditionReference.contentsChecklist;
  elements.editEquipmentFunctionalChecklist.value =
    conditionReference.functionalChecklist;
  editChecklistCopySourceId = "";
  editChecklistCopyMetadata = null;
  renderChecklistCopySourceOptions({ resetSelection: true });
  clearEditChecklistCopyWarning();
  syncEditCalibrationInputs();
  syncEditSubscriptionInputs({ clearWhenDisabled: false });
  clearEditNameError();
  toggleNameWarning(
    elements.editEquipmentNameWarning,
    item.name ?? "",
    state.equipment,
    item.id
  );
  toggleSerialWarning(
    elements.editEquipmentSerialWarning,
    item.serialNumber ?? "",
    state.equipment,
    item.id
  );
}

function resetEditForm() {
  if (
    !elements.editEquipmentName ||
    !elements.editEquipmentModel ||
    !elements.editEquipmentSerial ||
    !elements.editEquipmentPurchaseDate ||
    !elements.editEquipmentLocation ||
    !elements.editEquipmentStatus ||
    !elements.editEquipmentCalibrationRequired ||
    !elements.editEquipmentCalibrationInterval ||
    !elements.editEquipmentCalibrationIntervalCustom ||
    !elements.editEquipmentLastCalibration ||
    !elements.editEquipmentSubscriptionRequired ||
    !elements.editEquipmentSubscriptionDate ||
    !elements.editEquipmentContentsChecklist ||
    !elements.editEquipmentFunctionalChecklist
  ) {
    return;
  }

  elements.editEquipmentName.value = "";
  elements.editEquipmentModel.value = "";
  elements.editEquipmentSerial.value = "";
  elements.editEquipmentPurchaseDate.value = "";
  if (elements.editEquipmentLocation) {
    elements.editEquipmentLocation.value = "";
  }
  if (elements.editEquipmentStatus) {
    elements.editEquipmentStatus.value = "";
  }
  elements.editEquipmentCalibrationRequired.checked = false;
  elements.editEquipmentCalibrationInterval.value = "12";
  elements.editEquipmentCalibrationIntervalCustom.value = "";
  elements.editEquipmentLastCalibration.value = "";
  if (elements.editEquipmentSubscriptionRequired) {
    elements.editEquipmentSubscriptionRequired.checked = false;
  }
  if (elements.editEquipmentSubscriptionDate) {
    elements.editEquipmentSubscriptionDate.value = "";
  }
  elements.editEquipmentContentsChecklist.value = "";
  elements.editEquipmentFunctionalChecklist.value = "";
  editChecklistCopySourceId = "";
  editChecklistCopyMetadata = null;
  renderChecklistCopySourceOptions({ resetSelection: true });
  clearEditChecklistCopyWarning();
  syncEditCalibrationInputs();
  syncEditSubscriptionInputs({ clearWhenDisabled: false });
  clearEditNameError();
  clearNameWarning(elements.editEquipmentNameWarning);
  clearSerialWarning(elements.editEquipmentSerialWarning);
}

function handleCopyChecklist() {
  if (
    !elements.editEquipmentCopySource ||
    !elements.editEquipmentContentsChecklist ||
    !elements.editEquipmentFunctionalChecklist
  ) {
    return;
  }
  const sourceId = elements.editEquipmentCopySource.value;
  if (!sourceId) {
    return;
  }
  const source = state.equipment.find((entry) => entry.id === sourceId);
  if (!source) {
    return;
  }
  const sourceReference = normalizeConditionReference(
    source.conditionReference
  );
  const sourceHasChecklist =
    Boolean(sourceReference.contentsChecklist.trim()) ||
    Boolean(sourceReference.functionalChecklist.trim());
  if (!sourceHasChecklist) {
    showEditChecklistCopyWarning(
      "The selected equipment does not have a checklist defined."
    );
    return;
  }
  const currentHasChecklist =
    Boolean(elements.editEquipmentContentsChecklist.value.trim()) ||
    Boolean(elements.editEquipmentFunctionalChecklist.value.trim());
  if (currentHasChecklist) {
    const confirmed = window.confirm(
      "This will overwrite the current checklist for this equipment. Continue?"
    );
    if (!confirmed) {
      return;
    }
  }
  elements.editEquipmentContentsChecklist.value =
    sourceReference.contentsChecklist;
  elements.editEquipmentFunctionalChecklist.value =
    sourceReference.functionalChecklist;
  editChecklistCopyMetadata = {
    id: source.id,
    label: formatEquipmentLabel(source),
  };
  clearEditChecklistCopyWarning();
}

function syncEditCalibrationInputs() {
  if (
    !elements.editEquipmentCalibrationRequired ||
    !elements.editEquipmentCalibrationInterval ||
    !elements.editEquipmentLastCalibration ||
    !elements.editEquipmentCalibrationIntervalCustom
  ) {
    return;
  }
  const isRequired = elements.editEquipmentCalibrationRequired.checked;
  const isCustom =
    elements.editEquipmentCalibrationInterval.value === "custom";
  elements.editEquipmentCalibrationInterval.disabled = !isRequired;
  elements.editEquipmentCalibrationIntervalCustom.disabled =
    !isRequired || !isCustom;
  elements.editEquipmentLastCalibration.disabled = !isRequired;
  if (elements.editEquipmentCalibrationIntervalField) {
    elements.editEquipmentCalibrationIntervalField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
  if (elements.editEquipmentCalibrationIntervalCustomField) {
    elements.editEquipmentCalibrationIntervalCustomField.classList.toggle(
      "is-hidden",
      !isRequired || !isCustom
    );
  }
  if (elements.editEquipmentLastCalibrationField) {
    elements.editEquipmentLastCalibrationField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
}

function syncAddSubscriptionInputs({ clearWhenDisabled = true } = {}) {
  if (
    !elements.addEquipmentSubscriptionRequired ||
    !elements.addEquipmentSubscriptionDate
  ) {
    return;
  }
  const isRequired = elements.addEquipmentSubscriptionRequired.checked;
  elements.addEquipmentSubscriptionDate.disabled = !isRequired;
  if (elements.addEquipmentSubscriptionDateField) {
    elements.addEquipmentSubscriptionDateField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
  if (!isRequired && clearWhenDisabled) {
    elements.addEquipmentSubscriptionDate.value = "";
  }
}

function syncEditSubscriptionInputs({ clearWhenDisabled = true } = {}) {
  if (
    !elements.editEquipmentSubscriptionRequired ||
    !elements.editEquipmentSubscriptionDate
  ) {
    return;
  }
  const isRequired = elements.editEquipmentSubscriptionRequired.checked;
  elements.editEquipmentSubscriptionDate.disabled = !isRequired;
  if (elements.editEquipmentSubscriptionDateField) {
    elements.editEquipmentSubscriptionDateField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
  if (!isRequired && clearWhenDisabled) {
    elements.editEquipmentSubscriptionDate.value = "";
  }
}

function getSelectedEditCalibrationInterval() {
  const calibrationRequired =
    elements.editEquipmentCalibrationRequired?.checked ?? false;
  if (!calibrationRequired) {
    return 12;
  }
  const intervalSelection =
    elements.editEquipmentCalibrationInterval?.value ?? "12";
  if (intervalSelection === "custom") {
    const customValue = Number(
      elements.editEquipmentCalibrationIntervalCustom?.value ?? ""
    );
    if (Number.isFinite(customValue) && customValue > 0) {
      return customValue;
    }
    return 12;
  }
  const parsed = Number(intervalSelection);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

function clearEditNameError() {
  if (elements.editEquipmentNameError) {
    elements.editEquipmentNameError.classList.add("is-hidden");
  }
}

function showEditNameError() {
  if (elements.editEquipmentNameError) {
    elements.editEquipmentNameError.classList.remove("is-hidden");
  }
}

function clearEditChecklistCopyWarning() {
  if (elements.editEquipmentCopyWarning) {
    elements.editEquipmentCopyWarning.textContent = "";
    elements.editEquipmentCopyWarning.classList.add("is-hidden");
  }
}

function showEditChecklistCopyWarning(message) {
  if (elements.editEquipmentCopyWarning) {
    elements.editEquipmentCopyWarning.textContent = message;
    elements.editEquipmentCopyWarning.classList.remove("is-hidden");
  }
}

function normalizeSerialNumber(serialNumber) {
  if (serialNumber == null) {
    return "";
  }
  return String(serialNumber).trim().toLowerCase();
}

function normalizeEquipmentName(name) {
  if (name == null) {
    return "";
  }
  return String(name).trim().toLowerCase();
}

function findDuplicateSerial(
  serialNumber,
  equipmentList,
  excludeEquipmentId
) {
  const normalized = normalizeSerialNumber(serialNumber);
  if (!normalized) {
    return null;
  }
  const list = Array.isArray(equipmentList) ? equipmentList : [];
  return (
    list.find((item) => {
      if (excludeEquipmentId && item.id === excludeEquipmentId) {
        return false;
      }
      const itemSerial = normalizeSerialNumber(item.serialNumber);
      return itemSerial && itemSerial === normalized;
    }) || null
  );
}

function findDuplicateName(name, equipmentList, excludeEquipmentId) {
  const normalized = normalizeEquipmentName(name);
  if (!normalized) {
    return null;
  }
  const list = Array.isArray(equipmentList) ? equipmentList : [];
  return (
    list.find((item) => {
      if (excludeEquipmentId && item.id === excludeEquipmentId) {
        return false;
      }
      const itemName = normalizeEquipmentName(item.name);
      return itemName && itemName === normalized;
    }) || null
  );
}

function toggleNameWarning(
  warningElement,
  name,
  equipmentList,
  excludeEquipmentId
) {
  if (!warningElement) {
    return;
  }
  const match = findDuplicateName(
    name,
    equipmentList,
    excludeEquipmentId
  );
  if (!match) {
    warningElement.classList.add("is-hidden");
    return;
  }
  const nameLabel = match.name?.trim()
    ? match.name.trim()
    : "Unnamed equipment";
  const modelLabel = match.model?.trim() ? match.model.trim() : "—";
  const serialLabel = match.serialNumber?.trim()
    ? match.serialNumber.trim()
    : "no serial";
  const locationLabel = match.location?.trim()
    ? match.location.trim()
    : "—";
  warningElement.textContent = `Another item already uses this name: ${nameLabel} (${modelLabel}, ${serialLabel}, ${locationLabel})`;
  warningElement.classList.remove("is-hidden");
}

function toggleSerialWarning(
  warningElement,
  serialNumber,
  equipmentList,
  excludeEquipmentId
) {
  if (!warningElement) {
    return;
  }
  const match = findDuplicateSerial(
    serialNumber,
    equipmentList,
    excludeEquipmentId
  );
  if (!match) {
    warningElement.classList.add("is-hidden");
    return;
  }
  const name = match.name?.trim() ? match.name.trim() : "Unnamed equipment";
  const model = match.model?.trim() ? match.model.trim() : "—";
  const location = match.location?.trim() ? match.location.trim() : "—";
  warningElement.textContent = `Serial number already used by: ${name} (${model}, ${location})`;
  warningElement.classList.remove("is-hidden");
}

function clearSerialWarning(warningElement) {
  if (warningElement) {
    warningElement.classList.add("is-hidden");
  }
}

function clearNameWarning(warningElement) {
  if (warningElement) {
    warningElement.classList.add("is-hidden");
  }
}

function handleEditEquipmentSubmit(event) {
  event.preventDefault();
  if (
    !elements.editEquipmentSelect ||
    !elements.editEquipmentName ||
    !elements.editEquipmentModel ||
    !elements.editEquipmentSerial ||
    !elements.editEquipmentPurchaseDate ||
    !elements.editEquipmentLocation ||
    !elements.editEquipmentStatus ||
    !elements.editEquipmentContentsChecklist ||
    !elements.editEquipmentFunctionalChecklist
  ) {
    return;
  }

  const equipmentId = elements.editEquipmentSelect.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

  const name = elements.editEquipmentName.value.trim();
  if (!name) {
    showEditNameError();
    elements.editEquipmentName.focus();
    return;
  }

  clearEditNameError();
  const model = elements.editEquipmentModel.value.trim();
  const serialNumber = elements.editEquipmentSerial.value.trim();
  const purchaseDate = elements.editEquipmentPurchaseDate.value;
  const location = elements.editEquipmentLocation.value;
  const status = elements.editEquipmentStatus.value;
  const calibrationRequired =
    elements.editEquipmentCalibrationRequired?.checked ?? false;
  const calibrationInterval = getSelectedEditCalibrationInterval();
  const lastCalibrationDate = calibrationRequired
    ? elements.editEquipmentLastCalibration?.value ?? ""
    : "";
  const subscriptionRequired =
    elements.editEquipmentSubscriptionRequired?.checked ?? false;
  const subscriptionRenewalDate = subscriptionRequired
    ? elements.editEquipmentSubscriptionDate?.value ?? ""
    : "";
  const conditionReference = normalizeConditionReference({
    contentsChecklist:
      elements.editEquipmentContentsChecklist?.value ?? "",
    functionalChecklist:
      elements.editEquipmentFunctionalChecklist?.value ?? "",
  });
  const previousConditionReference = normalizeConditionReference(
    item.conditionReference
  );
  const contentsChecklistChanged =
    previousConditionReference.contentsChecklist !==
    conditionReference.contentsChecklist;
  const functionalChecklistChanged =
    previousConditionReference.functionalChecklist !==
    conditionReference.functionalChecklist;
  const checklistChanged =
    contentsChecklistChanged || functionalChecklistChanged;

  const calibrationDetails = normalizeCalibrationFields({
    calibrationRequired,
    calibrationIntervalMonths: calibrationInterval,
    lastCalibrationDate,
  });
  const subscriptionDetails = normalizeSubscriptionFields({
    subscriptionRequired,
    subscriptionRenewalDate,
  });
  const subscriptionChanged =
    Boolean(item.subscriptionRequired) !==
      subscriptionDetails.subscriptionRequired ||
    (item.subscriptionRenewalDate ?? "") !==
      subscriptionDetails.subscriptionRenewalDate;

  const updatedFields = {
    name,
    model,
    serialNumber,
    purchaseDate,
    location,
    status,
    calibrationRequired: calibrationDetails.calibrationRequired,
    calibrationIntervalMonths:
      calibrationDetails.calibrationIntervalMonths,
    lastCalibrationDate: calibrationDetails.lastCalibrationDate,
  };
  const changedFields = Object.keys(updatedFields).filter((field) => {
    const currentValue = item[field];
    const nextValue = updatedFields[field];
    if (typeof currentValue === "number" || typeof nextValue === "number") {
      return Number(currentValue) !== Number(nextValue);
    }
    return currentValue !== nextValue;
  });
  if (contentsChecklistChanged) {
    changedFields.push("contents checklist reference");
  }
  if (functionalChecklistChanged) {
    changedFields.push("functional check guide reference");
  }

  item.name = name;
  item.model = model;
  item.serialNumber = serialNumber;
  item.purchaseDate = purchaseDate;
  item.location = location;
  item.status = status;
  item.calibrationRequired = calibrationDetails.calibrationRequired;
  item.calibrationIntervalMonths =
    calibrationDetails.calibrationIntervalMonths;
  item.lastCalibrationDate = calibrationDetails.lastCalibrationDate;
  item.subscriptionRequired = subscriptionDetails.subscriptionRequired;
  item.subscriptionRenewalDate =
    subscriptionDetails.subscriptionRequired
      ? subscriptionDetails.subscriptionRenewalDate
      : "";
  item.conditionReference = conditionReference;

  if (changedFields.length > 0) {
    const changedLabel = changedFields.join(", ");
    logHistory({
      type: "details_updated",
      text: `Details updated for ${name} (${item.id}): ${changedLabel}.`,
      equipmentId: String(item.id),
      equipmentSnapshot: {
        name,
        model: item.model,
        serialNumber: item.serialNumber,
      },
      notes: changedLabel,
    });
  }
  if (checklistChanged) {
    const copyNote = editChecklistCopyMetadata
      ? `Copied from ${editChecklistCopyMetadata.label}.`
      : "Updated manually.";
    logHistory({
      type: "condition_reference_updated",
      text: `Condition checklist updated for ${name}.`,
      equipmentId: String(item.id),
      equipmentSnapshot: {
        name,
        model: item.model,
        serialNumber: item.serialNumber,
      },
      notes: copyNote,
    });
    editChecklistCopyMetadata = null;
  }
  if (subscriptionChanged) {
    logHistory({
      type: "subscription_updated",
      text: `${name} subscription updated.`,
      equipmentId: String(item.id),
      equipmentSnapshot: {
        name,
        model: item.model,
        serialNumber: item.serialNumber,
      },
      notes: buildSubscriptionNotes({
        subscriptionRequired: item.subscriptionRequired,
        subscriptionRenewalDate: item.subscriptionRenewalDate,
      }),
    });
  }

  toggleSerialWarning(
    elements.editEquipmentSerialWarning,
    serialNumber,
    state.equipment,
    item.id
  );
  toggleNameWarning(
    elements.editEquipmentNameWarning,
    name,
    state.equipment,
    item.id
  );
  saveState();
  refreshUI();
}

function handleEditEquipmentCancel() {
  syncEditForm();
}

function getSelectedCalibrationInterval() {
  const calibrationRequired =
    elements.addEquipmentCalibrationRequired?.checked ?? true;
  if (!calibrationRequired) {
    return 12;
  }
  const intervalSelection =
    elements.addEquipmentCalibrationInterval?.value ?? "12";
  if (intervalSelection === "custom") {
    const customValue = Number(
      elements.addEquipmentCalibrationIntervalCustom?.value ?? ""
    );
    if (Number.isFinite(customValue) && customValue > 0) {
      return customValue;
    }
    return 12;
  }
  const parsed = Number(intervalSelection);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

function syncCalibrationInputs() {
  if (
    !elements.addEquipmentCalibrationRequired ||
    !elements.addEquipmentCalibrationInterval ||
    !elements.addEquipmentLastCalibration ||
    !elements.addEquipmentCalibrationIntervalCustom
  ) {
    return;
  }
  const isRequired = elements.addEquipmentCalibrationRequired.checked;
  const isCustom =
    elements.addEquipmentCalibrationInterval.value === "custom";
  elements.addEquipmentCalibrationInterval.disabled = !isRequired;
  elements.addEquipmentCalibrationIntervalCustom.disabled =
    !isRequired || !isCustom;
  elements.addEquipmentLastCalibration.disabled = !isRequired;
  if (elements.addEquipmentCalibrationIntervalField) {
    elements.addEquipmentCalibrationIntervalField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
  if (elements.addEquipmentCalibrationIntervalCustomField) {
    elements.addEquipmentCalibrationIntervalCustomField.classList.toggle(
      "is-hidden",
      !isRequired || !isCustom
    );
  }
  if (elements.addEquipmentLastCalibrationField) {
    elements.addEquipmentLastCalibrationField.classList.toggle(
      "is-hidden",
      !isRequired
    );
  }
}

function handleClearHistory() {
  if (!adminModeEnabled) {
    return;
  }
  const reason = window.prompt(
    "Provide a reason for archiving all moves:",
    "Bulk archive"
  );
  if (!reason || !reason.trim()) {
    return;
  }
  const trimmedReason = reason.trim();
  const timestamp = formatTimestampISO();
  state.moves = state.moves.map((entry) =>
    entry && typeof entry === "object"
      ? {
          ...entry,
          deletedAt: entry.deletedAt || timestamp,
          deletedBy: entry.deletedBy || "Admin",
          deleteReason: entry.deleteReason || trimmedReason,
        }
      : entry
  );
  if (Array.isArray(state.log)) {
    state.log = state.log.map((entry) =>
      entry && typeof entry === "object"
        ? {
          ...entry,
          deletedAt: entry.deletedAt || timestamp,
          deletedBy: entry.deletedBy || "Admin",
          deleteReason: entry.deleteReason || trimmedReason,
        }
      : entry
    );
  }
  saveState();
  refreshUI();
}

function handleMarkReceived(moveEntryId) {
  if (!moveEntryId) {
    return;
  }
  const moveEntry =
    state.moves.find((entry) => entry.id === moveEntryId) ||
    (Array.isArray(state.log)
      ? state.log.find((entry) => entry.id === moveEntryId)
      : null);
  if (!moveEntry || moveEntry.type !== "move") {
    return;
  }
  if (isEntryDeleted(moveEntry)) {
    return;
  }
  if (!moveEntry.shipping || !hasShippingReceiptDetails(moveEntry.shipping)) {
    return;
  }
  if (getMoveReceivedAt(moveEntry)) {
    return;
  }
  const receivedTimestamp = formatTimestampISO();
  moveEntry.receivedAt = receivedTimestamp;
  moveEntry.shipping = {
    ...moveEntry.shipping,
    receivedAt: receivedTimestamp,
    receivedBy: "local",
  };

  const equipmentId = moveEntry.equipmentId;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (item) {
    if (moveEntry.toLocation?.trim()) {
      item.location = moveEntry.toLocation;
      item.currentLocation = moveEntry.toLocation;
    }
    if (moveEntry.statusTo === "In transit") {
      const nextStatus =
        moveEntry.shipping?.postReceiptStatus?.trim() || "Available";
      item.status = nextStatus;
    }
    item.lastMoved = formatTimestamp();
    logHistory({
      type: "received",
      text: `${item.name} marked as received at ${item.location}.`,
      equipmentId: String(item.id),
      equipmentSnapshot: {
        name: item.name,
        model: item.model,
        serialNumber: item.serialNumber,
      },
      fromLocation: moveEntry.fromLocation,
      toLocation: moveEntry.toLocation || item.location,
      statusFrom: "In transit",
      statusTo: item.status,
      notes: "Shipping completed",
    });
  }
  saveState();
  refreshUI();
  showToast("Marked received", "success");
}

function handleDeleteHistoryEntry(entryId) {
  if (!entryId) {
    return;
  }
  const entry =
    state.moves.find((item) => item.id === entryId) ||
    (Array.isArray(state.log)
      ? state.log.find((item) => item.id === entryId)
      : null);
  if (!entry || isEntryDeleted(entry)) {
    return;
  }
  const reason = window.prompt(
    "Provide a reason for soft deleting this entry:"
  );
  if (!reason || !reason.trim()) {
    return;
  }
  const trimmedReason = reason.trim();
  entry.deletedAt = formatTimestampISO();
  entry.deletedBy = "Admin";
  entry.deleteReason = trimmedReason;
  saveState();
  renderHistory();
  renderMovesView();
}

function handleAddCorrection(entryId) {
  if (!entryId) {
    return;
  }
  const entry = getAllMovesFromState().find((item) => item.id === entryId);
  if (!entry || isEntryDeleted(entry)) {
    return;
  }
  const reason = window.prompt("Describe the correction:");
  if (!reason || !reason.trim()) {
    return;
  }
  const trimmedReason = reason.trim();
  logHistory({
    type: "correction",
    correctionOf: entry.id,
    notes: trimmedReason,
    equipmentId: entry.equipmentId,
    equipmentSnapshot: entry.equipmentSnapshot,
  });
  saveState();
  refreshUI();
}

function handleCopyTrackingNumber(trackingNumber) {
  const value = typeof trackingNumber === "string" ? trackingNumber.trim() : "";
  if (!value) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {
      window.prompt("Copy tracking number:", value);
    });
    return;
  }
  window.prompt("Copy tracking number:", value);
}

if (elements.searchInput) {
  elements.searchInput.addEventListener("input", refreshUI);
}

if (elements.locationFilter) {
  elements.locationFilter.addEventListener("change", refreshUI);
}

if (elements.statusFilter) {
  elements.statusFilter.addEventListener("change", refreshUI);
}

if (elements.calibrationFilter) {
  elements.calibrationFilter.addEventListener("change", refreshUI);
}

if (elements.subscriptionFilter) {
  elements.subscriptionFilter.addEventListener("change", refreshUI);
}

if (elements.movesEquipmentFilter) {
  elements.movesEquipmentFilter.addEventListener("change", renderMovesView);
}

if (elements.movesTypeFilter) {
  elements.movesTypeFilter.addEventListener("change", renderMovesView);
}

if (elements.movesShowDeleted) {
  elements.movesShowDeleted.addEventListener("change", renderMovesView);
}

if (elements.movesSearch) {
  elements.movesSearch.addEventListener("input", renderMovesView);
}

if (elements.movesDestinationFilter) {
  elements.movesDestinationFilter.addEventListener("change", renderMovesView);
}

if (elements.movesReceiptOnly) {
  elements.movesReceiptOnly.addEventListener("change", renderMovesView);
}

if (elements.movesTableBody) {
  elements.movesTableBody.addEventListener("click", (event) => {
    const receiveButton = event.target.closest(
      'button[data-action="mark-received"]'
    );
    if (receiveButton) {
      const moveEntryId = receiveButton.dataset.id;
      if (!moveEntryId) {
        return;
      }
      handleMarkReceived(moveEntryId);
      return;
    }

    const deleteButton = event.target.closest(
      'button[data-action="delete-move"]'
    );
    if (!deleteButton || !adminModeEnabled) {
      const correctionButton = event.target.closest(
        'button[data-action="add-correction"]'
      );
      if (!correctionButton) {
        return;
      }
      const entryId = correctionButton.dataset.id;
      if (!entryId) {
        return;
      }
      handleAddCorrection(entryId);
      return;
    }
    const entryId = deleteButton.dataset.id;
    if (!entryId) {
      return;
    }
    handleDeleteHistoryEntry(entryId);
  });
}

if (elements.equipmentTable) {
  elements.equipmentTable.addEventListener("click", (event) => {
    const toggleButton = event.target.closest(
      'button[data-action="toggle-equipment-shipping-details"]'
    );
    if (toggleButton) {
      const equipmentId = toggleButton.dataset.equipmentId;
      if (!equipmentId) {
        return;
      }
      const detailRow = elements.equipmentTable.querySelector(
        `tr[data-shipping-details-for="${CSS.escape(equipmentId)}"]`
      );
      if (!detailRow) {
        return;
      }
      const isHidden = detailRow.classList.toggle("is-hidden");
      toggleButton.textContent = isHidden ? "View" : "Hide";
      return;
    }

    const copyButton = event.target.closest('button[data-action="copy-tracking"]');
    if (copyButton) {
      handleCopyTrackingNumber(copyButton.dataset.trackingNumber || "");
      return;
    }

    const conditionButton = event.target.closest(
      'button[data-action="view-condition-history"]'
    );
    if (conditionButton) {
      openConditionHistory(conditionButton.dataset.equipmentId || "");
    }
  });
}

if (elements.locationSummary) {
  elements.locationSummary.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-location]");
    if (!button || !elements.locationFilter) {
      return;
    }
    const location = button.dataset.location;
    elements.locationFilter.value = location;
    refreshUI();
  });
}

if (elements.moveForm) {
  elements.moveForm.addEventListener("submit", handleMoveSubmit);
}

if (elements.moveEquipment) {
  elements.moveEquipment.addEventListener("change", () => {
    syncMoveConditionReference();
    resetMoveConditionInputs();
  });
}

if (elements.moveStatus) {
  elements.moveStatus.addEventListener("change", () => {
    validateMoveConditionChecklist();
  });
}

[elements.moveShippingCarrier, elements.moveShippingTracking, elements.moveShippingShipDate].forEach((input) => {
  if (!input) {
    return;
  }
  input.addEventListener("change", syncMoveShippingStatusOverride);
  input.addEventListener("input", syncMoveShippingStatusOverride);
});

if (elements.moveChecklistAdminLink) {
  elements.moveChecklistAdminLink.addEventListener("click", () => {
    const equipmentId =
      elements.moveChecklistAdminLink?.dataset.equipmentId ?? "";
    goToAdminEditEquipment(equipmentId);
  });
}

if (elements.moveConditionRating) {
  elements.moveConditionRating.addEventListener(
    "change",
    syncMoveConditionNotesError
  );
}

if (elements.moveContentsOk) {
  elements.moveContentsOk.addEventListener(
    "change",
    syncMoveConditionNotesError
  );
}

if (elements.moveFunctionalOk) {
  elements.moveFunctionalOk.addEventListener(
    "change",
    syncMoveConditionNotesError
  );
}

if (elements.moveConditionNotes) {
  elements.moveConditionNotes.addEventListener(
    "input",
    syncMoveConditionNotesError
  );
}

if (elements.calibrationForm) {
  elements.calibrationForm.addEventListener(
    "submit",
    handleCalibrationSubmit
  );
}

if (elements.calibrationEquipment) {
  elements.calibrationEquipment.addEventListener(
    "change",
    syncCalibrationForm
  );
}

if (elements.addEquipmentForm) {
  elements.addEquipmentForm.addEventListener("submit", handleAddEquipment);
}

if (elements.addEquipmentCalibrationRequired) {
  elements.addEquipmentCalibrationRequired.addEventListener(
    "change",
    syncCalibrationInputs
  );
}

if (elements.addEquipmentCalibrationInterval) {
  elements.addEquipmentCalibrationInterval.addEventListener(
    "change",
    syncCalibrationInputs
  );
}

if (elements.addEquipmentSubscriptionRequired) {
  elements.addEquipmentSubscriptionRequired.addEventListener(
    "change",
    syncAddSubscriptionInputs
  );
}

if (elements.addEquipmentSerial) {
  const handleAddSerialInput = () => {
    toggleSerialWarning(
      elements.addEquipmentSerialWarning,
      elements.addEquipmentSerial.value,
      state.equipment
    );
  };
  elements.addEquipmentSerial.addEventListener("input", handleAddSerialInput);
  elements.addEquipmentSerial.addEventListener("change", handleAddSerialInput);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("#import-template-button");
  if (!button) {
    return;
  }
  event.preventDefault();
  console.log("Downloading import template...");
  downloadImportTemplateCSV();
});

if (elements.importFileInput) {
  elements.importFileInput.addEventListener("change", handleImportFileChange);
}

if (elements.importDuplicateBehavior) {
  elements.importDuplicateBehavior.addEventListener(
    "change",
    updateImportPreviewWithDuplicates
  );
}

if (elements.importSubmit) {
  elements.importSubmit.addEventListener("click", handleImportSubmit);
}

if (elements.importClear) {
  elements.importClear.addEventListener("click", handleImportClear);
}

if (elements.editEquipmentForm) {
  elements.editEquipmentForm.addEventListener(
    "submit",
    handleEditEquipmentSubmit
  );
}

if (elements.editEquipmentSelect) {
  elements.editEquipmentSelect.addEventListener("change", syncEditForm);
}

if (elements.editEquipmentCopySource) {
  elements.editEquipmentCopySource.addEventListener("change", () => {
    editChecklistCopySourceId = elements.editEquipmentCopySource.value;
    editChecklistCopyMetadata = null;
    clearEditChecklistCopyWarning();
    updateCopyChecklistButtonState();
  });
}

if (elements.editEquipmentCopyButton) {
  elements.editEquipmentCopyButton.addEventListener(
    "click",
    handleCopyChecklist
  );
}

if (elements.editEquipmentCalibrationRequired) {
  elements.editEquipmentCalibrationRequired.addEventListener(
    "change",
    syncEditCalibrationInputs
  );
}

if (elements.editEquipmentCalibrationInterval) {
  elements.editEquipmentCalibrationInterval.addEventListener(
    "change",
    syncEditCalibrationInputs
  );
}

if (elements.editEquipmentSubscriptionRequired) {
  elements.editEquipmentSubscriptionRequired.addEventListener(
    "change",
    syncEditSubscriptionInputs
  );
}

if (elements.editEquipmentSerial) {
  const handleEditSerialInput = () => {
    toggleSerialWarning(
      elements.editEquipmentSerialWarning,
      elements.editEquipmentSerial.value,
      state.equipment,
      elements.editEquipmentSelect?.value
    );
  };
  elements.editEquipmentSerial.addEventListener("input", handleEditSerialInput);
  elements.editEquipmentSerial.addEventListener(
    "change",
    handleEditSerialInput
  );
}

if (elements.editEquipmentName) {
  const handleEditNameInput = () => {
    const currentName = elements.editEquipmentName.value;
    if (currentName.trim()) {
      clearEditNameError();
    }
    toggleNameWarning(
      elements.editEquipmentNameWarning,
      currentName,
      state.equipment,
      elements.editEquipmentSelect?.value
    );
  };
  elements.editEquipmentName.addEventListener("input", handleEditNameInput);
  elements.editEquipmentName.addEventListener(
    "change",
    handleEditNameInput
  );
}

if (elements.editEquipmentCancel) {
  elements.editEquipmentCancel.addEventListener(
    "click",
    handleEditEquipmentCancel
  );
}

if (elements.clearHistory) {
  elements.clearHistory.addEventListener("click", handleClearHistory);
}

const storedAdminMode = loadAdminMode();
applyAdminMode(storedAdminMode);
initTabs();

if (elements.adminPasscodeForm) {
  elements.adminPasscodeForm.addEventListener(
    "submit",
    handleAdminPasscodeFormSubmit
  );
}

if (elements.adminPasscodeCancel) {
  elements.adminPasscodeCancel.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAdminPasscodeDialog();
  });
}

if (elements.adminPasscodeDialog) {
  elements.adminPasscodeDialog.addEventListener("close", () => {
    pendingAdminAction = null;
    if (!adminModeEnabled && elements.adminModeToggle) {
      elements.adminModeToggle.checked = false;
    }
    resetAdminPasscodeDialog();
  });
}

if (elements.adminPasscodeSettingsForm) {
  elements.adminPasscodeSettingsForm.addEventListener(
    "submit",
    handleAdminPasscodeSettingsSubmit
  );
}

if (elements.conditionHistoryClose) {
  elements.conditionHistoryClose.addEventListener("click", () => {
    elements.conditionHistoryModal?.close();
  });
}
refreshUI();
syncCalibrationInputs();
syncEditCalibrationInputs();
syncAddSubscriptionInputs();
syncEditSubscriptionInputs();
resetImportState();

if (elements.adminModeToggle) {
  elements.adminModeToggle.addEventListener("change", () => {
    if (elements.adminModeToggle.checked) {
      elements.adminModeToggle.checked = false;
      requestAdminModeEnable();
      return;
    }
    applyAdminMode(false, { focus: true });
  });
}
