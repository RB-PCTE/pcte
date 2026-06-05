// src/legacy/localStorage.js — Legacy storage adapters and migration helpers.
//
// These were the original storage implementations before Supabase was added.
// They are NO LONGER used in the main data flow (src/main.js uses the Supabase
// adapter from src/supabaseClient.js). They are kept here for:
//
//   • Offline / fallback development without a Supabase connection
//   • The mock adapter (createMockApiStorageAdapter) for unit testing
//   • Migration flag helpers (condition history v1 migration)
//
// To use the mock adapter during development, swap the adapter in main.js:
//
//   import { createMockApiStorageAdapter } from "./legacy/localStorage.js";
//   const repository = createRepository({ adapter: createMockApiStorageAdapter() });
//
// Do NOT import this file in production code paths.

import { buildDefaultState, migrateStateIfNeeded, STATE_VERSION } from "../model.js";

// ── Storage keys ──────────────────────────────────────────────────────────────

export const STORAGE_KEY               = "equipmentTrackerState";
export const TAB_STORAGE_KEY           = "equipmentTrackerActiveTab";
export const ADMIN_MODE_KEY            = "equipmentTrackerAdminMode";
export const ADMIN_PASSCODE_KEY        = "equipmentTrackerAdminPasscode";
export const CONDITION_MIGRATION_V1_FLAG = "pcteConditionMigrationV1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParseState(raw) {
  if (!raw) return buildDefaultState(STATE_VERSION);
  try {
    return migrateStateIfNeeded(JSON.parse(raw));
  } catch {
    return buildDefaultState(STATE_VERSION);
  }
}

// ── localStorage adapter ──────────────────────────────────────────────────────
// Reads and writes the full app state to localStorage as a JSON blob.
// Useful as a fallback when Supabase is unavailable.

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

// ── Mock in-memory adapter ────────────────────────────────────────────────────
// Stores state in a JS variable with a simulated network delay.
// Useful for unit tests and offline UI development.

export function createMockApiStorageAdapter({ latencyMs = 80 } = {}) {
  let memory = buildDefaultState(STATE_VERSION);
  const withDelay = (fn) =>
    new Promise((resolve) => setTimeout(() => resolve(fn()), latencyMs));

  return {
    async load()        { return withDelay(() => migrateStateIfNeeded(memory)); },
    async save(state)   { return withDelay(() => { memory = migrateStateIfNeeded(state); }); },
    async clear()       { return withDelay(() => { memory = buildDefaultState(STATE_VERSION); }); },
  };
}

// ── Direct state read/write ───────────────────────────────────────────────────
// Low-level helpers used by migration scripts. Not part of normal app flow.

export function readStoredAppState() {
  return safeParseState(localStorage.getItem(STORAGE_KEY));
}

export function writeStoredAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Tab preference (superseded by src/preferences.js) ────────────────────────
// Kept here for reference. The active code uses loadActiveView / saveActiveView.

export function loadActiveTab() {
  return localStorage.getItem(TAB_STORAGE_KEY) ?? "operations";
}

export function saveActiveTab(tab) {
  localStorage.setItem(TAB_STORAGE_KEY, tab);
}

// ── Condition migration flag ──────────────────────────────────────────────────
// Guards a one-time data migration so it only runs once per browser session.

export function hasConditionMigrationFlag() {
  return localStorage.getItem(CONDITION_MIGRATION_V1_FLAG) === "true";
}

export function setConditionMigrationFlag() {
  localStorage.setItem(CONDITION_MIGRATION_V1_FLAG, "true");
}
