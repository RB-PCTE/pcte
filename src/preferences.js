// src/preferences.js — lightweight UI preference helpers (replaces loadActiveTab / saveActiveTab)
// Only touches localStorage keys that belong to this app's UI layer — not app state.

const VIEW_KEY = "equipmentTrackerActiveTab";

/**
 * Returns the last active view name ("operations" | "moves" | "admin"),
 * defaulting to "operations" if nothing is stored.
 */
export function loadActiveView() {
  return localStorage.getItem(VIEW_KEY) ?? "operations";
}

/**
 * Persists the active view name so it survives a page reload.
 * @param {string} view
 */
export function saveActiveView(view) {
  localStorage.setItem(VIEW_KEY, view);
}
