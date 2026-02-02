const STORAGE_KEY = "equipmentTrackerState";

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
  "Calibration due",
  "In calibration",
  "Quarantined",
];

const defaultState = {
  locations: [...physicalLocations],
  equipment: [
    {
      id: crypto.randomUUID(),
      name: "Projection kit A",
      location: "Perth",
      status: "Available",
      lastMoved: "2024-05-14 09:10",
    },
    {
      id: crypto.randomUUID(),
      name: "Audio demo case",
      location: "Melbourne",
      status: "On demo",
      lastMoved: "2024-05-12 16:45",
    },
    {
      id: crypto.randomUUID(),
      name: "Lighting rig",
      location: "Perth",
      status: "On hire",
      lastMoved: "2024-05-10 11:00",
    },
    {
      id: crypto.randomUUID(),
      name: "Portable control unit",
      location: "Sydney",
      status: "In service / repair",
      lastMoved: "2024-05-11 13:25",
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

const state = loadState();
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
  searchInput: document.querySelector("#search-input"),
  equipmentTable: document.querySelector("#equipment-table"),
  moveForm: document.querySelector("#move-form"),
  moveEquipment: document.querySelector("#move-equipment"),
  moveLocation: document.querySelector("#move-location"),
  moveStatus: document.querySelector("#move-status"),
  moveNotes: document.querySelector("#move-notes"),
  addEquipmentForm: document.querySelector("#add-equipment-form"),
  addEquipmentName: document.querySelector("#new-equipment-name"),
  addEquipmentModel: document.querySelector("#new-equipment-model"),
  addEquipmentSerial: document.querySelector("#new-equipment-serial"),
  addEquipmentPurchaseDate: document.querySelector(
    "#new-equipment-purchase-date"
  ),
  addEquipmentLocation: document.querySelector("#new-equipment-location"),
  addEquipmentStatus: document.querySelector("#new-equipment-status"),
  addLocationForm: document.querySelector("#add-location-form"),
  addLocationName: document.querySelector("#new-location-name"),
  historyList: document.querySelector("#history-list"),
  clearHistory: document.querySelector("#clear-history"),
  statTotal: document.querySelector("#stat-total"),
  statHire: document.querySelector("#stat-hire"),
  locationSummary: document.querySelector("#location-summary"),
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(stored);
    const normalizedLocations = [...physicalLocations];
    const equipment = Array.isArray(parsed.equipment)
      ? parsed.equipment
      : defaultState.equipment;

    const normalizedEquipment = equipment.map((item) => {
      const rawLocation = item.location ?? physicalLocations[0];
      const needsLocationReset =
        rawLocation.toLowerCase() === "on hire" ||
        !physicalLocations.includes(rawLocation);
      const location = needsLocationReset
        ? physicalLocations[0]
        : rawLocation;
      const derivedStatus = statusOptions.includes(item.status)
        ? item.status
        : rawLocation.toLowerCase() === "on hire"
          ? "On hire"
          : "Available";

      return {
        ...item,
        location,
        status: derivedStatus,
      };
    });

    return {
      locations: normalizedLocations,
      equipment: normalizedEquipment,
      history: parsed.history ?? defaultState.history,
    };
  } catch (error) {
    console.warn("Failed to load stored state", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const options = ["All locations", ...locations]
    .map((location) => {
      const safeLocation = escapeHTML(location);
      return `<option value="${safeLocation}">${safeLocation}</option>`;
    })
    .join("");

  elements.locationFilter.innerHTML = options;

  const selectionOptions = locations
    .map((location) => {
      const safeLocation = escapeHTML(location);
      return `<option value="${safeLocation}">${safeLocation}</option>`;
    })
    .join("");

  elements.moveLocation.innerHTML = selectionOptions;
  elements.addEquipmentLocation.innerHTML = selectionOptions;
}

function renderStatusOptions() {
  const filterOptions = ["All statuses", ...statusOptions]
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  elements.statusFilter.innerHTML = filterOptions;

  const selectionOptions = statusOptions
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  elements.moveStatus.innerHTML = `<option value="Keep current status">Keep current status</option>${selectionOptions}`;
  elements.addEquipmentStatus.innerHTML = selectionOptions;
  elements.addEquipmentStatus.value = "Available";
}

function renderEquipmentOptions() {
  const options = state.equipment
    .map(
      (item) =>
        `<option value="${item.id}">${escapeHTML(item.name)}</option>`
    )
    .join("");
  elements.moveEquipment.innerHTML = options;
}

function renderStats() {
  elements.statTotal.textContent = state.equipment.length;
  const hireCount = state.equipment.filter(
    (item) => item.status.toLowerCase() === "on hire"
  ).length;
  elements.statHire.textContent = hireCount;
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

function renderTable() {
  const now = new Date();
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const locationFilter = elements.locationFilter.value;
  const statusFilter = elements.statusFilter.value;

  const filtered = state.equipment.filter((item) => {
    const calibrationInfo = getCalibrationInfo(item, now);
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.location.toLowerCase().includes(searchTerm) ||
      item.status.toLowerCase().includes(searchTerm);
    const matchesLocation =
      locationFilter === "All locations" || item.location === locationFilter;
    const matchesStatus =
      statusFilter === "All statuses" || item.status === statusFilter;
    return matchesSearch && matchesLocation && matchesStatus;
  });

  if (filtered.length === 0) {
    elements.equipmentTable.innerHTML =
      '<tr><td colspan="7">No equipment matches the current filter.</td></tr>';
    return;
  }

  elements.equipmentTable.innerHTML = filtered
    .map(
      (item) => {
        const ageLabel = getAgeLabel(item.purchaseDate, now);
        const calibrationInfo = getCalibrationInfo(item, now);
        const calibrationMeta = calibrationInfo.dueDate
          ? `Due ${formatDate(calibrationInfo.dueDate)}`
          : item.calibrationRequired
            ? "Last calibration needed"
            : "No calibration required";
        return `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td>${escapeHTML(item.model)}</td>
          <td>${escapeHTML(item.serialNumber)}</td>
          <td><span class="tag tag--status">${escapeHTML(
            item.status
          )}</span></td>
          <td><span class="tag">${escapeHTML(item.location)}</span></td>
          <td>
            <div><span class="tag tag--status">${escapeHTML(
              calibrationInfo.status
            )}</span></div>
            <div>${escapeHTML(calibrationMeta)}</div>
          </td>
          <td>${escapeHTML(item.lastMoved)}</td>
        </tr>
      `;
      }
    )
    .join("");
}

function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = "<li>No moves logged yet.</li>";
    return;
  }

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

  elements.locationSummary.innerHTML = summaries.join("");
}

function refreshUI() {
  renderLocationOptions();
  renderStatusOptions();
  renderEquipmentOptions();
  renderStats();
  renderTable();
  renderHistory();
  renderLocationSummary();
}

function logHistory(message) {
  state.history.unshift({
    id: crypto.randomUUID(),
    text: message,
    timestamp: formatTimestamp(),
  });
  if (state.history.length > 25) {
    state.history.pop();
  }
}

function handleMoveSubmit(event) {
  event.preventDefault();
  const equipmentId = elements.moveEquipment.value;
  const newLocation = elements.moveLocation.value;
  const newStatus = elements.moveStatus.value;
  const notes = elements.moveNotes.value.trim();

  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

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

  logHistory(message);
  elements.moveNotes.value = "";
  elements.moveStatus.value = "Keep current status";
  saveState();
  refreshUI();
}

function handleAddEquipment(event) {
  event.preventDefault();
  const name = elements.addEquipmentName.value.trim();
  const model = elements.addEquipmentModel.value.trim();
  const serialNumber = elements.addEquipmentSerial.value.trim();
  const purchaseDate = elements.addEquipmentPurchaseDate.value;
  const location = elements.addEquipmentLocation.value;
  const status = elements.addEquipmentStatus.value;
  if (!name) {
    return;
  }

  state.equipment.push({
    id: crypto.randomUUID(),
    name,
    model,
    serialNumber,
    purchaseDate,
    calibrationRequired,
    calibrationIntervalMonths: calibrationInterval,
    lastCalibrationDate,
    location,
    status,
    lastMoved: formatTimestamp(),
  });

  logHistory(`${name} added to ${location} with status ${status}.`);
  elements.addEquipmentName.value = "";
  elements.addEquipmentModel.value = "";
  elements.addEquipmentSerial.value = "";
  elements.addEquipmentPurchaseDate.value = "";
  elements.addEquipmentCalibrationRequired.checked = false;
  elements.addEquipmentCalibrationInterval.value = "12";
  elements.addEquipmentLastCalibration.value = "";
  saveState();
  refreshUI();
  syncCalibrationInputs();
}

function syncCalibrationInputs() {
  const isRequired = elements.addEquipmentCalibrationRequired.checked;
  elements.addEquipmentCalibrationInterval.disabled = !isRequired;
  elements.addEquipmentLastCalibration.disabled = !isRequired;
}

function handleAddLocation(event) {
  event.preventDefault();
  const name = elements.addLocationName.value.trim();
  if (!name) {
    return;
  }

  if (state.locations.some((location) => location === name)) {
    elements.addLocationName.value = "";
    return;
  }

  state.locations.push(name);
  logHistory(`Location "${name}" added.`);
  elements.addLocationName.value = "";
  saveState();
  refreshUI();
}

function handleClearHistory() {
  state.history = [];
  saveState();
  refreshUI();
}

elements.searchInput.addEventListener("input", renderTable);

elements.locationFilter.addEventListener("change", renderTable);

elements.statusFilter.addEventListener("change", renderTable);

elements.locationSummary.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-location]");
  if (!button) {
    return;
  }
  const location = button.dataset.location;
  elements.locationFilter.value = location;
  renderTable();
});

elements.moveForm.addEventListener("submit", handleMoveSubmit);

elements.addEquipmentForm.addEventListener("submit", handleAddEquipment);

elements.addEquipmentCalibrationRequired.addEventListener(
  "change",
  syncCalibrationInputs
);

elements.addLocationForm.addEventListener("submit", handleAddLocation);

elements.clearHistory.addEventListener("click", handleClearHistory);

refreshUI();
syncCalibrationInputs();
