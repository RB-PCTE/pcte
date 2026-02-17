export const STORAGE_KEY = "equipmentTrackerState";
export const SCHEMA_VERSION = 2;
export const TAB_STORAGE_KEY = "equipmentTrackerActiveTab";
export const ADMIN_MODE_KEY = "equipmentTrackerAdminMode";
export const ADMIN_PASSCODE_KEY = "equipmentTrackerAdminPasscode";
export const CONDITION_MIGRATION_V1_FLAG = "pcteConditionMigrationV1";

export function migrateStateIfNeeded(parsed, migrateStoredState, normalizeState, runConditionHistoryMigrationV1) {
  const { equipment, moves, log, corrections, schemaVersion, migratedKeys } = migrateStoredState(parsed);
  const normalized = normalizeState({ equipment, moves, log, corrections, schemaVersion });
  runConditionHistoryMigrationV1(normalized);
  return { normalized, migratedKeys };
}
