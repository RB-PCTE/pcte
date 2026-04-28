export const STATE_VERSION = 2;

export const physicalLocations = [
  "Perth",
  "Melbourne",
  "Brisbane",
  "Sydney",
  "New Zealand",
];

export const editableStatusOptions = [
  "Available",
  "On demo",
  "On hire",
  "In service / repair",
  "Quarantined",
];

export const statusFilterOptions = [...editableStatusOptions, "In transit"];

export const calibrationFilterOptions = ["All", "Overdue", "Due soon", "OK", "Unknown", "Not required"];
export const subscriptionFilterOptions = ["All", "OK", "Due soon", "Overdue", "Unknown", "Not required"];

export const moveConditionExemptStatuses = new Set(["In service / repair", "Quarantined"]);

export const moveTypeOptions = [
  { value: "all", label: "All types" },
  { value: "move", label: "Move" },
  { value: "calibration", label: "Calibration" },
  { value: "subscription_updated", label: "Subscription" },
  { value: "details_updated", label: "Details updated" },
  { value: "condition_reference_updated", label: "Condition checklist" },
  { value: "received", label: "Received" },
];

export function normalizeStatus(rawStatus, rawLocation) {
  const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (status && /calibration/i.test(status)) return "Quarantined";
  if (editableStatusOptions.includes(status)) return status;
  const location = typeof rawLocation === "string" ? rawLocation.trim().toLowerCase() : "";
  if (location === "on hire") return "On hire";
  return "Available";
}

export function getSeedDate({ months = 0, days = 0 } = {}) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDefaultState(schemaVersion = STATE_VERSION) {
  return { schemaVersion, equipment: [], moves: [], corrections: [], locations: [] };
}


export function migrateStateIfNeeded(inputState) {
  const parsed = inputState && typeof inputState === "object" ? inputState : {};
  const equipment = Array.isArray(parsed.equipment)
    ? parsed.equipment
    : Array.isArray(parsed.items)
      ? parsed.items
      : [];
  const moves = Array.isArray(parsed.moves)
    ? parsed.moves
    : Array.isArray(parsed.log)
      ? parsed.log
      : [];


  return {
    ...buildDefaultState(STATE_VERSION),
    ...parsed,
    stateVersion: Number.isInteger(parsed.stateVersion)
      ? parsed.stateVersion
      : Number.isInteger(parsed.schemaVersion)
        ? parsed.schemaVersion
        : STATE_VERSION,
    schemaVersion: Number.isInteger(parsed.schemaVersion) ? parsed.schemaVersion : STATE_VERSION,
    locations: Array.isArray(parsed.locations) && parsed.locations.length ? parsed.locations : [...physicalLocations],
    equipment,
    moves,
    corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
  };
}
