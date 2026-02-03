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

const moveTypeOptions = ["All types", "Move", "Calibration", "Details updated"];

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
  return {
    locations: [...physicalLocations],
    equipment: [
      {
        id: crypto.randomUUID(),
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
      },
      {
        id: crypto.randomUUID(),
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
      },
      {
        id: crypto.randomUUID(),
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
      },
      {
        id: crypto.randomUUID(),
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
      },
    ],
    history: [
      {
        id: crypto.randomUUID(),
        text: "Lighting rig moved to Perth with status On hire (Client demo).",
        timestamp: "2024-05-10 11:00",
      },
    ],
  };
}

const defaultState = buildDefaultState();

const state = loadState();
let isAdminModeEnabled = loadAdminMode();
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
};

let adminModeEnabled = false;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function loadAdminMode() {
  return localStorage.getItem(ADMIN_MODE_KEY) === "true";
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(stored);
    const equipment = Array.isArray(parsed.equipment)
      ? parsed.equipment
      : defaultState.equipment;
    const history = Array.isArray(parsed.history)
      ? parsed.history
      : defaultState.history;
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
      };
    });

    const normalizedHistory = normalizeHistoryEntries(
      corrections.length ? [...corrections, ...history] : history,
      normalizedEquipment
    );
    const normalizedState = {
      locations: [...physicalLocations],
      equipment: normalizedEquipment,
      history: normalizedHistory,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
    return normalizedState;
  } catch (error) {
    console.warn("Failed to load stored state", error);
    return structuredClone(defaultState);
  }
}

function inferHistoryTypeFromText(text = "") {
  const normalized = text.toLowerCase();
  if (normalized.includes("calibration")) {
    return "Calibration";
  }
  if (
    normalized.includes("details updated") ||
    normalized.includes("added") ||
    normalized.includes("location corrected")
  ) {
    return "Details updated";
  }
  return "Move";
}

function normalizeHistoryEntry(entry, equipmentList = []) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  const text = typeof safeEntry.text === "string" ? safeEntry.text : "";
  const timestamp =
    typeof safeEntry.timestamp === "string" && safeEntry.timestamp.trim()
      ? safeEntry.timestamp
      : formatTimestamp();
  const id =
    typeof safeEntry.id === "string" && safeEntry.id.trim()
      ? safeEntry.id
      : crypto.randomUUID();
  const equipmentId =
    typeof safeEntry.equipmentId === "string" ? safeEntry.equipmentId : "";
  const matchedEquipment =
    equipmentId && Array.isArray(equipmentList)
      ? equipmentList.find((item) => item.id === equipmentId)
      : null;
  const type =
    typeof safeEntry.type === "string" && safeEntry.type.trim()
      ? safeEntry.type
      : inferHistoryTypeFromText(text);
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
    equipmentId,
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

function renderEquipmentOptions() {
  const equipmentList = state.equipment;
  [
    elements.moveEquipment,
    elements.calibrationEquipment,
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
      const value = option === "All types" ? "all" : option;
      return `<option value="${escapeHTML(value)}">${escapeHTML(
        option
      )}</option>`;
    })
    .join("");
  elements.movesTypeFilter.innerHTML = options;
  elements.movesTypeFilter.value = moveTypeOptions.some(
    (option) => (option === "All types" ? "all" : option) === currentValue
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
  const calibrationRequired =
    typeof safeItem.calibrationRequired === "boolean"
      ? safeItem.calibrationRequired
      : true;

  return {
    ...safeItem,
    id:
      typeof safeItem.id === "string" && safeItem.id.trim()
        ? safeItem.id
        : crypto.randomUUID(),
    name,
    location,
    status,
    model,
    serialNumber,
    purchaseDate,
    calibrationRequired,
    calibrationIntervalMonths:
      typeof safeItem.calibrationIntervalMonths === "number"
        ? safeItem.calibrationIntervalMonths
        : Number(safeItem.calibrationIntervalMonths) || 12,
    lastCalibrationDate,
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

  return state.equipment.filter((item) => {
    const calibrationInfo = getCalibrationInfo(item, now);
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
    return (
      matchesSearch &&
      matchesLocation &&
      matchesStatus &&
      matchesCalibration
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
        '<tr><td colspan="7">No equipment matches the current filter.</td></tr>';
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
          <td>${escapeHTML(item.lastMoved)}</td>
        </tr>
      `;
        }
      )
      .join("");
  }
}

function renderHistory() {
  if (state.history.length === 0) {
    if (elements.historyList) {
      elements.historyList.innerHTML = "<li>No moves logged yet.</li>";
    }
    return;
  }

  if (elements.historyList) {
    elements.historyList.innerHTML = state.history
      .slice(0, 8)
      .map(
        (entry) =>
          `<li><strong>${escapeHTML(
            entry.timestamp
          )}</strong> — ${escapeHTML(entry.text)}</li>`
      )
      .join("");
  }
}

function getEquipmentSummary(entry) {
  const equipmentMatch = entry.equipmentId
    ? state.equipment.find((item) => item.id === entry.equipmentId)
    : null;
  const name =
    equipmentMatch?.name ||
    (entry.equipmentName?.trim() ? entry.equipmentName : "Unknown equipment");
  const model =
    equipmentMatch?.model ||
    (entry.equipmentModel?.trim() ? entry.equipmentModel : "—");
  const serial =
    equipmentMatch?.serialNumber ||
    (entry.equipmentSerial?.trim() ? entry.equipmentSerial : "—");
  return `${name} — ${model} — ${serial}`;
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
  return "—";
}

function getFilteredMoves() {
  const equipmentFilter = elements.movesEquipmentFilter?.value ?? "all";
  const typeFilter = elements.movesTypeFilter?.value ?? "all";
  const searchTerm = elements.movesSearch
    ? elements.movesSearch.value.trim().toLowerCase()
    : "";

  return state.history.filter((entry) => {
    if (equipmentFilter !== "all" && entry.equipmentId !== equipmentFilter) {
      return false;
    }
    if (typeFilter !== "all" && entry.type !== typeFilter) {
      return false;
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
}

function renderMovesView() {
  if (!elements.movesTableBody || !elements.movesTableHeader) {
    return;
  }
  const filteredMoves = getFilteredMoves();
  const showActions = isAdminModeEnabled;

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
        : "—";
      const toLocation = entry.toLocation?.trim() ? entry.toLocation : "—";
      const notes = entry.notes?.trim() ? entry.notes : entry.text ?? "—";
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
          <td>${escapeHTML(entry.type ?? "Move")}</td>
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
  renderLocationOptions();
  renderStatusOptions();
  renderCalibrationOptions();
  renderEquipmentOptions();
  renderMovesFilters();
  renderTable();
  renderHistory();
  renderLocationSummary();
  renderMovesView();
  syncCalibrationForm();
  syncEditForm();
}

function getAvailableTabButtons() {
  return elements.tabButtons.filter((button) => !button.hidden);
}

function getAvailableTabs() {
  return getAvailableTabButtons().map((button) => button.dataset.tab);
}

function setActiveTab(tabName, { focus = false } = {}) {
  const allowedTab =
    tabName === "admin" && !adminModeEnabled ? "operations" : tabName;
  const resolvedTab =
    allowedTab === "admin" || allowedTab === "operations"
      ? allowedTab
      : "operations";
  const hasViews = Boolean(elements.operationsView || elements.adminView);
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

  localStorage.setItem(TAB_STORAGE_KEY, nextName);
  if (focus && nextTabButton) {
    nextTabButton.focus();
  }
}

function initTabs() {
  const stored = localStorage.getItem(TAB_STORAGE_KEY);
  const availableTabs = elements.tabButtons
    .filter((button) => !button.hidden)
    .map((button) => button.dataset.tab);
  const fallbackTab = availableTabs[0] ?? "operations";
  const initialTab = availableTabs.includes(stored) ? stored : fallbackTab;
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
      const availableButtons = elements.tabButtons.filter(
        (tabButton) => !tabButton.hidden
      );
      const currentIndex = availableButtons.indexOf(button);
      if (currentIndex === -1) {
        return;
      }
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
  const historyEntry = normalizeHistoryEntry(
    {
      ...baseEntry,
      id: crypto.randomUUID(),
      timestamp: formatTimestamp(),
    },
    state.equipment
  );
  state.history.unshift(historyEntry);
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
    type: "Move",
    text: message,
    equipmentId: item.id,
    equipmentName: item.name,
    equipmentModel: item.model,
    equipmentSerial: item.serialNumber,
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
    type: "Calibration",
    text: `${item.name} calibration recorded.`,
    equipmentId: item.id,
    equipmentName: item.name,
    equipmentModel: item.model,
    equipmentSerial: item.serialNumber,
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

  const newItemId = crypto.randomUUID();
  state.equipment.push({
    id: newItemId,
    name,
    model,
    serialNumber,
    purchaseDate,
    ...calibrationDetails,
    location,
    status,
    lastMoved: formatTimestamp(),
  });

  logHistory({
    type: "Details updated",
    text: `${name} added to ${location} with status ${status}.`,
    equipmentId: newItemId,
    equipmentName: name,
    equipmentModel: model,
    equipmentSerial: serialNumber,
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
      type: "Details updated",
      text: `Details updated for ${name} (${item.id}): ${changedLabel}.`,
      equipmentId: item.id,
      equipmentName: name,
      equipmentModel: item.model,
      equipmentSerial: item.serialNumber,
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
  state.history = [];
  saveState();
  refreshUI();
}

function handleDeleteHistoryEntry(entryId) {
  if (!entryId) {
    return;
  }
  state.history = state.history.filter((entry) => entry.id !== entryId);
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
    if (!button || !isAdminModeEnabled) {
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

if (elements.adminModeToggle) {
  elements.adminModeToggle.addEventListener("change", () => {
    applyAdminMode(elements.adminModeToggle.checked, { focus: true });
  });
}
