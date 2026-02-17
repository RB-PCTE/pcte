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

export function buildDefaultState(schemaVersion) {
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
        conditionReference: { contentsChecklist: "", functionalChecklist: "" },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        lastConditionCheck: null,
        conditionHistory: [],
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
        conditionReference: { contentsChecklist: "", functionalChecklist: "" },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        lastConditionCheck: null,
        conditionHistory: [],
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
        conditionReference: { contentsChecklist: "", functionalChecklist: "" },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        lastConditionCheck: null,
        conditionHistory: [],
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
        conditionReference: { contentsChecklist: "", functionalChecklist: "" },
        conditionRating: "",
        conditionContentsOk: null,
        conditionFunctionalOk: null,
        conditionLastCheckedAt: "",
        conditionLastCheckedBy: "",
        conditionLastNotes: "",
        currentCondition: null,
        lastConditionCheckAt: "",
        lastConditionCheck: null,
        conditionHistory: [],
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
        equipmentSnapshot: { name: "Lighting rig", model: "Aputure LS 600X", serialNumber: "LR-2022-7785" },
        type: "move",
        text: "Lighting rig moved to Perth with status On hire (Client demo).",
        timestamp: "2024-05-10T11:00:00.000Z",
      },
    ],
    corrections: [],
    schemaVersion,
  };
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
