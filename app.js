const STORAGE_KEY = "equipmentTrackerState";
const TAB_STORAGE_KEY = "equipmentTrackerActiveTab";
const ADMIN_MODE_KEY = "equipmentTrackerAdminMode";

const physicalLocations = [
  "Perth",
  "Melbourne",
  "Brisbane",
  "Sydney",
  "New Zealand",
];

const statusOptions = [
  "Available",
  "On demo",
  "On hire",
  "In transit",
  "In service / repair",
  "Quarantined",
];

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

const moveTypeOptions = [
  { value: "all", label: "All types" },
  { value: "move", label: "Move" },
  { value: "calibration", label: "Calibration" },
  { value: "subscription_updated", label: "Subscription" },
  { value: "details_updated", label: "Details updated" },
];

function normalizeStatus(rawStatus, rawLocation) {
  const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (status && /calibration/i.test(status)) {
    return "Quarantined";
  }
  if (statusOptions.includes(status)) {
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
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -3 }),
        subscriptionRequired: false,
        subscriptionIntervalMonths: 12,
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
        calibrationRequired: false,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -6 }),
        subscriptionRequired: false,
        subscriptionIntervalMonths: 12,
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
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -14 }),
        subscriptionRequired: false,
        subscriptionIntervalMonths: 12,
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
        calibrationRequired: true,
        calibrationIntervalMonths: 12,
        lastCalibrationDate: getSeedDate({ months: -10, days: -5 }),
        subscriptionRequired: false,
        subscriptionIntervalMonths: 12,
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
  calibrationForm: document.querySelector("#calibration-form"),
  calibrationEquipment: document.querySelector("#calibration-equipment"),
  calibrationDate: document.querySelector("#calibration-date"),
  calibrationInterval: document.querySelector("#calibration-interval"),
  calibrationRequired: document.querySelector("#calibration-required"),
  subscriptionForm: document.querySelector("#subscription-form"),
  subscriptionEquipment: document.querySelector("#subscription-equipment"),
  subscriptionDate: document.querySelector("#subscription-date"),
  subscriptionInterval: document.querySelector("#subscription-interval"),
  subscriptionRequired: document.querySelector("#subscription-required"),
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
  movesSearch: document.querySelector("#moves-search"),
  movesTableHeader: document.querySelector("#moves-table-header"),
  movesTableBody: document.querySelector("#moves-table-body"),
  adminModeToggle: document.querySelector("#admin-mode-toggle"),
  adminTabButton: document.querySelector("#tab-button-admin"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab]")),
  adminTabButton: document.querySelector("#tab-button-admin"),
  adminModeToggle: document.querySelector("#admin-mode-toggle"),
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
};

let adminModeEnabled = false;
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

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
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
    if (normalized.includes("move")) {
      return "move";
    }
    if (normalized === "details_updated") {
      return "details_updated";
    }
    if (normalized === "subscription_updated") {
      return "subscription_updated";
    }
  }
  return inferHistoryTypeFromText(fallbackText);
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
  return localStorage.getItem(ADMIN_MODE_KEY) === "true";
}

function saveAdminMode(isEnabled) {
  localStorage.setItem(ADMIN_MODE_KEY, String(Boolean(isEnabled)));
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
  const filterOptions = ["All statuses", ...statusOptions]
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  if (elements.statusFilter) {
    elements.statusFilter.innerHTML = filterOptions;
    elements.statusFilter.value = statusOptions.includes(currentFilterValue)
      ? currentFilterValue
      : "All statuses";
  }

  const selectionOptions = statusOptions
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
    elements.subscriptionEquipment,
    elements.editEquipmentSelect,
  ].forEach((selectEl) => {
    populateEquipmentSelect(selectEl, equipmentList, selectEl?.value);
  });
}

function renderMovesFilters() {
  renderMovesEquipmentFilter();
  renderMovesTypeFilter();
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
    (item) => item.status.toLowerCase() === "on hire"
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
  const name =
    typeof safeItem.name === "string"
      ? safeItem.name
      : safeItem.name != null
        ? String(safeItem.name)
        : "";
  const location =
    typeof safeItem.location === "string"
      ? safeItem.location
      : safeItem.location != null
        ? String(safeItem.location)
        : "";
  const status =
    typeof safeItem.status === "string"
      ? safeItem.status
      : safeItem.status != null
        ? String(safeItem.status)
        : "";
  const model =
    typeof safeItem.model === "string"
      ? safeItem.model
      : safeItem.model != null
        ? String(safeItem.model)
        : "";
  const serialNumber =
    typeof safeItem.serialNumber === "string"
      ? safeItem.serialNumber
      : safeItem.serialNumber != null
        ? String(safeItem.serialNumber)
        : "";
  const purchaseDate =
    typeof safeItem.purchaseDate === "string"
      ? safeItem.purchaseDate
      : safeItem.purchaseDate != null
        ? String(safeItem.purchaseDate)
        : "";
  const lastCalibrationDate =
    typeof safeItem.lastCalibrationDate === "string"
      ? safeItem.lastCalibrationDate
      : safeItem.lastCalibrationDate != null
        ? String(safeItem.lastCalibrationDate)
        : "";
  const subscriptionRenewalDate =
    typeof safeItem.subscriptionRenewalDate === "string"
      ? safeItem.subscriptionRenewalDate
      : safeItem.subscriptionRenewalDate != null
        ? String(safeItem.subscriptionRenewalDate)
        : "";
  const calibrationRequired =
    typeof safeItem.calibrationRequired === "boolean"
      ? safeItem.calibrationRequired
      : false;
  const subscriptionRequired =
    typeof safeItem.subscriptionRequired === "boolean"
      ? safeItem.subscriptionRequired
      : false;

  return {
    ...safeItem,
    id:
      typeof safeItem.id === "string" && safeItem.id.trim()
        ? safeItem.id
        : crypto.randomUUID(),
    name: name?.trim() ? name : "Unnamed",
    location: location?.trim() ? location : physicalLocations[0],
    status: status?.trim() ? status : "Available",
    model,
    serialNumber,
    purchaseDate,
    calibrationRequired,
    calibrationIntervalMonths:
      typeof safeItem.calibrationIntervalMonths === "number"
        ? safeItem.calibrationIntervalMonths
        : Number(safeItem.calibrationIntervalMonths) || 12,
    lastCalibrationDate,
    subscriptionRequired,
    subscriptionIntervalMonths:
      typeof safeItem.subscriptionIntervalMonths === "number"
        ? safeItem.subscriptionIntervalMonths
        : Number(safeItem.subscriptionIntervalMonths) || 12,
    subscriptionRenewalDate,
    lastMoved:
      typeof safeItem.lastMoved === "string"
        ? safeItem.lastMoved
        : formatTimestamp(),
  };
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
  const intervalValue = Number(item.subscriptionIntervalMonths);
  const subscriptionIntervalMonths =
    Number.isFinite(intervalValue) && intervalValue > 0
      ? intervalValue
      : 12;
  const renewalDate = parseSubscriptionDate(item.subscriptionRenewalDate)
    ? item.subscriptionRenewalDate
    : "";

  return {
    subscriptionRequired,
    subscriptionIntervalMonths,
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
    if (!statusOptions.includes(status)) {
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
      item.status.toLowerCase().includes(searchTerm);
    const matchesLocation =
      locationFilter === "All locations" || item.location === locationFilter;
    const matchesStatus =
      statusFilter === "All statuses" || item.status === statusFilter;
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

function renderTable() {
  const now = new Date();
  const filtered = getFilteredEquipment(now);
  renderStats(filtered, now);

  if (filtered.length === 0) {
    if (elements.equipmentTable) {
      elements.equipmentTable.innerHTML =
        '<tr><td colspan="8">No equipment matches the current filter.</td></tr>';
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
          const subscriptionCell = `<span class="tag tag--status" title="${escapeHTML(
            subscriptionMeta
          )}">${escapeHTML(subscriptionInfo.status)}</span>`;
          const modelLabel = item.model?.trim() ? item.model : "—";
          const serialLabel = item.serialNumber?.trim()
            ? item.serialNumber
            : "—";
          return `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td>${escapeHTML(modelLabel)}</td>
          <td>${escapeHTML(serialLabel)}</td>
          <td><span class="tag tag--status">${escapeHTML(
            item.status
          )}</span></td>
          <td><span class="tag">${escapeHTML(item.location)}</span></td>
          <td>${calibrationCell}</td>
          <td>${subscriptionCell}</td>
          <td>${escapeHTML(item.lastMoved)}</td>
        </tr>
      `;
        }
      )
      .join("");
  }
}

function renderHistory() {
  const allMoves = getAllMovesFromState();
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

function getFilteredMoves() {
  const equipmentFilter = elements.movesEquipmentFilter?.value ?? "all";
  const typeFilter = elements.movesTypeFilter?.value ?? "all";
  const subscriptionFilter = elements.subscriptionFilter
    ? elements.subscriptionFilter.value
    : "All";
  const searchTerm = elements.movesSearch
    ? elements.movesSearch.value.trim().toLowerCase()
    : "";

  const allMoves = getAllMovesFromState();
  const now = new Date();
  const filtered = allMoves.filter((entry) => {
    if (equipmentFilter !== "all" && entry.equipmentId !== equipmentFilter) {
      return false;
    }
    if (typeFilter !== "all" && entry.type !== typeFilter) {
      return false;
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
    return (
      equipmentLabel.includes(searchTerm) || notesLabel.includes(searchTerm)
    );
  });
  return filtered;
}

function renderMovesView() {
  if (!elements.movesTableBody || !elements.movesTableHeader) {
    return;
  }
  syncEquipmentById();
  const filteredMoves = getFilteredMoves();
  const showActions = adminModeEnabled;

  const headers = [
    "Timestamp",
    "Equipment",
    "From location",
    "To location",
    "Status change",
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
      const notes =
        entry.notes?.trim() ||
        entry.text?.trim() ||
        entry.message?.trim() ||
        "";
      const typeLabel =
        entry.type === "details_updated"
          ? "Details updated"
          : entry.type === "calibration"
            ? "Calibration"
            : entry.type === "subscription_updated"
              ? "Subscription"
            : "Move";
      const actionCell = showActions
        ? `<td><button class="icon-button" type="button" data-action="delete-move" data-id="${escapeHTML(
            entry.id
          )}">Delete</button></td>`
        : "";
      return `
        <tr>
          <td>${escapeHTML(entry.timestamp)}</td>
          <td>${escapeHTML(equipmentLabel)}</td>
          <td>${escapeHTML(fromLocation)}</td>
          <td>${escapeHTML(toLocation)}</td>
          <td>${escapeHTML(getStatusChangeLabel(entry))}</td>
          <td>${escapeHTML(notes)}</td>
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
  syncCalibrationForm();
  syncSubscriptionForm();
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

function handleMoveSubmit(event) {
  event.preventDefault();
  if (
    !elements.moveEquipment ||
    !elements.moveLocation ||
    !elements.moveStatus ||
    !elements.moveNotes
  ) {
    return;
  }
  const equipmentId = elements.moveEquipment.value;
  const newLocation = elements.moveLocation.value;
  const newStatus = elements.moveStatus.value;
  const notes = elements.moveNotes.value.trim();

  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

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
    statusTo: item.status,
    notes,
  });
  elements.moveNotes.value = "";
  elements.moveStatus.value = "Keep current status";
  saveState();
  refreshUI();
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

function syncSubscriptionForm() {
  if (
    !elements.subscriptionEquipment ||
    !elements.subscriptionDate ||
    !elements.subscriptionRequired
  ) {
    return;
  }
  const equipmentId = elements.subscriptionEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }
  elements.subscriptionRequired.checked = Boolean(item.subscriptionRequired);
  elements.subscriptionDate.value = item.subscriptionRenewalDate ?? "";
  if (!elements.subscriptionDate.value) {
    elements.subscriptionDate.value = formatDate(new Date());
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

function handleSubscriptionSubmit(event) {
  event.preventDefault();
  if (
    !elements.subscriptionEquipment ||
    !elements.subscriptionDate ||
    !elements.subscriptionRequired
  ) {
    return;
  }

  const equipmentId = elements.subscriptionEquipment.value;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

  const subscriptionRequired = elements.subscriptionRequired.checked;
  const renewalDate = elements.subscriptionDate.value;
  item.subscriptionRequired = subscriptionRequired;
  item.subscriptionRenewalDate = subscriptionRequired ? renewalDate : "";

  const intervalValue = elements.subscriptionInterval?.value ?? "";
  if (String(intervalValue).trim()) {
    const parsedInterval = Number(intervalValue);
    if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
      item.subscriptionIntervalMonths = parsedInterval;
    }
  }

  item.lastMoved = formatTimestamp();
  const notes = `Subscription updated: renewalDate=${
    item.subscriptionRenewalDate || "unknown"
  }, interval=${item.subscriptionIntervalMonths ?? 12} months, required=${
    subscriptionRequired ? "true" : "false"
  }`;
  logHistory({
    type: "subscription_updated",
    text: `${item.name} subscription updated.`,
    equipmentId: String(item.id),
    equipmentSnapshot: {
      name: item.name,
      model: item.model,
      serialNumber: item.serialNumber,
    },
    notes,
  });
  if (elements.subscriptionInterval) {
    elements.subscriptionInterval.value = "";
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
  const subscriptionDetails = normalizeSubscriptionFields({});

  const newItemId = crypto.randomUUID();
  state.equipment.push({
    id: newItemId,
    name,
    model,
    serialNumber,
    purchaseDate,
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
      calibrationRequired: calibrationDetails.calibrationRequired,
      calibrationIntervalMonths: calibrationDetails.calibrationIntervalMonths,
      lastCalibrationDate: calibrationDetails.lastCalibrationDate,
      subscriptionRequired: subscriptionDetails.subscriptionRequired,
      subscriptionIntervalMonths:
        subscriptionDetails.subscriptionIntervalMonths,
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
    !elements.editEquipmentLastCalibration
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
  syncEditCalibrationInputs();
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
    !elements.editEquipmentLastCalibration
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
  syncEditCalibrationInputs();
  clearEditNameError();
  clearNameWarning(elements.editEquipmentNameWarning);
  clearSerialWarning(elements.editEquipmentSerialWarning);
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
    !elements.editEquipmentStatus
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

  const calibrationDetails = normalizeCalibrationFields({
    calibrationRequired,
    calibrationIntervalMonths: calibrationInterval,
    lastCalibrationDate,
  });

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
  state.moves = [];
  saveState();
  refreshUI();
}

function handleDeleteHistoryEntry(entryId) {
  if (!entryId) {
    return;
  }
  state.moves = state.moves.filter((entry) => entry.id !== entryId);
  saveState();
  renderHistory();
  renderMovesView();
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

if (elements.movesSearch) {
  elements.movesSearch.addEventListener("input", renderMovesView);
}

if (elements.movesTableBody) {
  elements.movesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-action="delete-move"]'
    );
    if (!button || !adminModeEnabled) {
      return;
    }
    const entryId = button.dataset.id;
    if (!entryId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this log entry? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    handleDeleteHistoryEntry(entryId);
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

if (elements.calibrationForm) {
  elements.calibrationForm.addEventListener(
    "submit",
    handleCalibrationSubmit
  );
}

if (elements.subscriptionForm) {
  elements.subscriptionForm.addEventListener(
    "submit",
    handleSubscriptionSubmit
  );
}

if (elements.calibrationEquipment) {
  elements.calibrationEquipment.addEventListener(
    "change",
    syncCalibrationForm
  );
}

if (elements.subscriptionEquipment) {
  elements.subscriptionEquipment.addEventListener(
    "change",
    syncSubscriptionForm
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
refreshUI();
syncCalibrationInputs();
syncEditCalibrationInputs();
resetImportState();

if (elements.adminModeToggle) {
  elements.adminModeToggle.addEventListener("change", () => {
    applyAdminMode(elements.adminModeToggle.checked, { focus: true });
  });
}
