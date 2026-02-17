import { buildDefaultState, migrateStateIfNeeded, STATE_VERSION } from "./model.js";

export const STORAGE_KEY = "equipmentTrackerState";
export const TAB_STORAGE_KEY = "equipmentTrackerActiveTab";
export const ADMIN_MODE_KEY = "equipmentTrackerAdminMode";
export const ADMIN_PASSCODE_KEY = "equipmentTrackerAdminPasscode";
export const CONDITION_MIGRATION_V1_FLAG = "pcteConditionMigrationV1";

function safeParseState(raw) {
  if (!raw) {
    return buildDefaultState(STATE_VERSION);
  }
  try {
    return migrateStateIfNeeded(JSON.parse(raw));
  } catch {
    return buildDefaultState(STATE_VERSION);
  }
}

export function createLocalStorageStorageAdapter() {
  return {
    async load() {
      return safeParseState(localStorage.getItem(STORAGE_KEY));
    },
    async save(state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    async clear() {
      localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export function createMockApiStorageAdapter({ latencyMs = 80 } = {}) {
  let memory = buildDefaultState(STATE_VERSION);
  const withDelay = (fn) => new Promise((resolve) => {
    setTimeout(() => resolve(fn()), latencyMs);
  });

  return {
    async load() {
      return withDelay(() => migrateStateIfNeeded(memory));
    },
    async save(state) {
      return withDelay(() => {
        memory = migrateStateIfNeeded(state);
      });
    },
    async clear() {
      return withDelay(() => {
        memory = buildDefaultState(STATE_VERSION);
      });
    },
  };
}

export function readStoredAppState() {
  return safeParseState(localStorage.getItem(STORAGE_KEY));
}

export function writeStoredAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadActiveTab() {
  return localStorage.getItem(TAB_STORAGE_KEY) ?? "operations";
}

export function saveActiveTab(tab) {
  localStorage.setItem(TAB_STORAGE_KEY, tab);
}

export function hasConditionMigrationFlag() {
  return localStorage.getItem(CONDITION_MIGRATION_V1_FLAG) === "true";
}

export function setConditionMigrationFlag() {
  localStorage.setItem(CONDITION_MIGRATION_V1_FLAG, "true");
}
