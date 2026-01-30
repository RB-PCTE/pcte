const STORAGE_KEY = "equipmentTrackerState";

const defaultState = {
  locations: [
    "Office 1",
    "Office 2",
    "Office 3",
    "Office 4",
    "Workshop",
    "On hire",
  ],
  equipment: [
    {
      id: crypto.randomUUID(),
      name: "Projection kit A",
      location: "Office 1",
      lastMoved: "2024-05-14 09:10",
    },
    {
      id: crypto.randomUUID(),
      name: "Audio demo case",
      location: "Workshop",
      lastMoved: "2024-05-12 16:45",
    },
    {
      id: crypto.randomUUID(),
      name: "Lighting rig",
      location: "On hire",
      lastMoved: "2024-05-10 11:00",
    },
    {
      id: crypto.randomUUID(),
      name: "Portable control unit",
      location: "Office 3",
      lastMoved: "2024-05-11 13:25",
    },
  ],
  history: [
    {
      id: crypto.randomUUID(),
      text: "Lighting rig moved to On hire (Client demo).",
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
  searchInput: document.querySelector("#search-input"),
  equipmentTable: document.querySelector("#equipment-table"),
  moveForm: document.querySelector("#move-form"),
  moveEquipment: document.querySelector("#move-equipment"),
  moveLocation: document.querySelector("#move-location"),
  moveNotes: document.querySelector("#move-notes"),
  addEquipmentForm: document.querySelector("#add-equipment-form"),
  addEquipmentName: document.querySelector("#new-equipment-name"),
  addEquipmentLocation: document.querySelector("#new-equipment-location"),
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
    return {
      locations: parsed.locations ?? defaultState.locations,
      equipment: parsed.equipment ?? defaultState.equipment,
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
    (item) => item.location.toLowerCase() === "on hire"
  ).length;
  elements.statHire.textContent = hireCount;
}

function renderTable() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const locationFilter = elements.locationFilter.value;

  const filtered = state.equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.location.toLowerCase().includes(searchTerm);
    const matchesLocation =
      locationFilter === "All locations" || item.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  if (filtered.length === 0) {
    elements.equipmentTable.innerHTML =
      '<tr><td colspan="3">No equipment matches the current filter.</td></tr>';
    return;
  }

  elements.equipmentTable.innerHTML = filtered
    .map(
      (item) => `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td><span class="tag">${escapeHTML(item.location)}</span></td>
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
  const notes = elements.moveNotes.value.trim();

  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) {
    return;
  }

  item.location = newLocation;
  item.lastMoved = formatTimestamp();

  const message = `${item.name} moved to ${newLocation}${
    notes ? ` (${notes}).` : "."
  }`;

  logHistory(message);
  elements.moveNotes.value = "";
  saveState();
  refreshUI();
}

function handleAddEquipment(event) {
  event.preventDefault();
  const name = elements.addEquipmentName.value.trim();
  const location = elements.addEquipmentLocation.value;
  if (!name) {
    return;
  }

  state.equipment.push({
    id: crypto.randomUUID(),
    name,
    location,
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
