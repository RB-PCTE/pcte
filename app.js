const STORAGE_KEY = "equipmentTrackerState";

const locations = ["Perth", "Melbourne", "Brisbane", "Sydney", "New Zealand"];
const statuses = [
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
  locations,
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
      status: "Available",
      lastMoved: "2024-05-12 16:45",
    },
    {
      id: crypto.randomUUID(),
      name: "Lighting rig",
      location: "Sydney",
      status: "On hire",
      lastMoved: "2024-05-10 11:00",
    },
    {
      id: crypto.randomUUID(),
      name: "Portable control unit",
      location: "Brisbane",
      status: "Available",
      lastMoved: "2024-05-11 13:25",
    },
  ],
  history: [
    {
      id: crypto.randomUUID(),
      text: "Lighting rig moved to Sydney (Client demo).",
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

function normalizeEquipment(items, locationsList) {
  return items.map((item) => {
    const normalized = { ...item };
    const locationLower = String(normalized.location ?? "").toLowerCase();
    if (locationLower === "on hire") {
      normalized.status = "On hire";
      normalized.location = locationsList[0];
    }

    if (!locationsList.includes(normalized.location)) {
      normalized.location = locationsList[0];
    }

    if (!statuses.includes(normalized.status)) {
      normalized.status = "Available";
    }

    return normalized;
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(stored);
    const parsedEquipment = Array.isArray(parsed.equipment)
      ? parsed.equipment
      : defaultState.equipment;
    return {
      locations: defaultState.locations,
      equipment: normalizeEquipment(parsedEquipment, defaultState.locations),
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
  const statusOptions = ["All statuses", ...statuses]
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  elements.statusFilter.innerHTML = statusOptions;

  const selectionOptions = statuses
    .map((status) => {
      const safeStatus = escapeHTML(status);
      return `<option value="${safeStatus}">${safeStatus}</option>`;
    })
    .join("");

  elements.addEquipmentStatus.innerHTML = selectionOptions;
  elements.addEquipmentStatus.value = "Available";

  elements.moveStatus.innerHTML = [
    '<option value="">Keep current status</option>',
    selectionOptions,
  ].join("");
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
    (item) => item.status === "On hire"
  ).length;
  elements.statHire.textContent = hireCount;
}

function renderTable() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const locationFilter = elements.locationFilter.value;
  const statusFilter = elements.statusFilter.value;

  const filtered = state.equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.location.toLowerCase().includes(searchTerm);
    const matchesLocation =
      locationFilter === "All locations" || item.location === locationFilter;
    const matchesStatus =
      statusFilter === "All statuses" || item.status === statusFilter;
    return matchesSearch && matchesLocation && matchesStatus;
  });

  if (filtered.length === 0) {
    elements.equipmentTable.innerHTML =
      '<tr><td colspan="4">No equipment matches the current filter.</td></tr>';
    return;
  }

  elements.equipmentTable.innerHTML = filtered
    .map(
      (item) => `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td><span class="tag">${escapeHTML(item.location)}</span></td>
          <td><span class="tag status-tag">${escapeHTML(item.status)}</span></td>
          <td>${escapeHTML(item.lastMoved)}</td>
        </tr>
      `
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
  const status = elements.moveStatus.value;
  const notes = elements.moveNotes.value.trim();

  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

  item.location = newLocation;
  if (status) {
    item.status = status;
  }
  item.lastMoved = formatTimestamp();

  const message = `${item.name} moved to ${newLocation}${
    notes ? ` (${notes}).` : "."
  }`;

  logHistory(message);
  elements.moveNotes.value = "";
  elements.moveStatus.value = "";
  saveState();
  refreshUI();
}

function handleAddEquipment(event) {
  event.preventDefault();
  const name = elements.addEquipmentName.value.trim();
  const location = elements.addEquipmentLocation.value;
  const status = elements.addEquipmentStatus.value || "Available";
  if (!name) {
    return;
  }

  state.equipment.push({
    id: crypto.randomUUID(),
    name,
    location,
    status,
    lastMoved: formatTimestamp(),
  });

  logHistory(`${name} added to ${location}.`);
  elements.addEquipmentName.value = "";
  saveState();
  refreshUI();
}

function handleAddLocation(event) {
  event.preventDefault();
  const name = elements.addLocationName.value.trim();
  if (!name) {
    return;
  }

  if (!defaultState.locations.includes(name)) {
    elements.addLocationName.value = "";
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

elements.addLocationForm.addEventListener("submit", handleAddLocation);

elements.clearHistory.addEventListener("click", handleClearHistory);

refreshUI();
