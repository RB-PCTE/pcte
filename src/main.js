// src/main.js — application startup, navigation wiring, and state orchestration.
// This file is intentionally thin: it owns hydration, nav switching, and the
// state:changed → renderAll pipeline. All rendering lives in src/ui/*.js.

import { on, emit } from "./events.js";
import { createRepository } from "./repository/index.js";
import { createSupabaseStorageAdapter, supabase } from "./supabaseClient.js";
import { loadActiveView, saveActiveView } from "./preferences.js";
import { renderOperationsView, bindOperationsEvents } from "./ui/operations.js";
import { renderMovesView, bindMovesEvents } from "./ui/moves.js";
import { renderAdminView, bindAdminEvents } from "./ui/admin.js";
import { bindModalsEvents } from "./ui/modals.js";
import { initDevtools } from "./ui/devtools.js";
import { initAuth } from "./auth.js";
import { showToast } from "./ui/toast.js";

// ── Build version ─────────────────────────────────────────────────────────────
// Update this string before each deployment.
export const BUILD_VERSION = "2026-05-08.v03  — Steps 13+14: legacy + devtools";

// ── Repository ────────────────────────────────────────────────────────────────
// Single shared repository instance used by all UI modules.
export const repository = createRepository({ adapter: createSupabaseStorageAdapter() });

// ── View navigation ───────────────────────────────────────────────────────────

const VIEW_TITLES = {
  operations: "Operations",
  moves:      "Moves Log",
  admin:      "Admin",
};

const VALID_VIEWS = new Set(Object.keys(VIEW_TITLES));

function normalizeView(name) {
  const n = typeof name === "string" ? name.trim().toLowerCase() : "";
  return VALID_VIEWS.has(n) ? n : "operations";
}

/**
 * Switch the visible view and update sidebar active states + header title.
 * Called by nav buttons and (later) by auth.js when admin mode changes.
 * @param {string} viewName
 */
export function showView(viewName) {
  const resolved = normalizeView(viewName);

  // Show/hide content sections
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.classList.toggle("is-view-hidden", section.dataset.view !== resolved);
  });

  // Highlight active nav button
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.navTarget === resolved);
    btn.setAttribute("aria-current", btn.dataset.navTarget === resolved ? "page" : "false");
  });

  // Update the top header title
  const titleEl = document.getElementById("view-title");
  if (titleEl) titleEl.textContent = VIEW_TITLES[resolved] ?? resolved;

  saveActiveView(resolved);
}

function initNav() {
  // Restore last active view from localStorage
  showView(loadActiveView());

  // Wire every visible nav button.
  // The Admin nav button (#nav-admin) starts hidden; auth.js reveals it once
  // the user has admin mode active, so we don't need a guard here.
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.navTarget));
  });
}

// ── Build version display + dev mode Easter egg ───────────────────────────────
// Shift+click the build version label three times within 2 s to fire
// "devmode:request". src/auth.js (Step 12) listens and opens the passcode dialog.

let shiftClickCount = 0;
let shiftClickTimer  = null;

function initBuildVersion() {
  const el = document.getElementById("build-version");
  if (!el) return;

  el.textContent = BUILD_VERSION;
  document.documentElement.setAttribute("data-build-stamp", BUILD_VERSION);

  el.addEventListener("click", (e) => {
    if (!e.shiftKey) {
      // Non-shift click resets the counter
      shiftClickCount = 0;
      return;
    }

    shiftClickCount++;
    clearTimeout(shiftClickTimer);
    shiftClickTimer = setTimeout(() => { shiftClickCount = 0; }, 2000);

    if (shiftClickCount >= 3) {
      shiftClickCount = 0;
      // auth.js handles the actual admin passcode flow
      document.dispatchEvent(new CustomEvent("devmode:request"));
    }
  });
}

// ── State → UI pipeline ───────────────────────────────────────────────────────
// Each UI module exports a render function and registers it here once created.
// Stubs are left as comments so the build order is clear.

function renderAll(state) {
  // Step 7+8 ✅ operations view (includes stats + table + location summary)
  renderOperationsView(state);
  _opsController?.syncState(state);

  // Step 9 ✅ moves log
  renderMovesView(state, { isAdmin: _isAdmin });
  _movesController?.syncState(state, { isAdmin: _isAdmin });

  // Step 10 ✅ admin view (add/edit equipment, calibration, CSV import)
  renderAdminView(state);
  _adminController?.syncState(state);

  // Step 11 ✅ modals (event-driven — syncState keeps their internal state fresh)
  _modalsController?.syncState(state);

  // Step 14 ✅ devtools (hidden unless admin/dev mode active)
  _devtoolsController?.syncState(state);
}

on("state:changed", (newState) => {
  renderAll(newState ?? repository.getState());
});

// ── Auth state forwarding ─────────────────────────────────────────────────────
// main.js holds the only direct Supabase import. Auth UI (login/logout panel,
// admin mode gating) lives in src/auth.js (Step 12) and reacts to this event.

supabase.auth.onAuthStateChange((_event, session) => {
  document.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { session: session ?? null } })
  );
});

// ── Startup ───────────────────────────────────────────────────────────────────

initNav();
initBuildVersion();

// Admin mode flag — updated by auth.js (Step 12) via "auth:admin-changed" event
let _isAdmin = false;
document.addEventListener("auth:admin-changed", (e) => { _isAdmin = Boolean(e.detail?.isAdmin); });

// Bind event listeners; keep controllers for state sync
let _opsController    = bindOperationsEvents({ repository, showToast });
let _movesController  = bindMovesEvents({ repository, showToast });
let _adminController  = bindAdminEvents({ repository, showToast });
let _modalsController  = bindModalsEvents({ repository, showToast });
let _devtoolsController = initDevtools();

// Step 12 ✅ auth — login/logout, role check, dev mode passcode
initAuth({ showToast });

(async function init() {
  // Fire the initial auth state immediately so auth.js can render the correct
  // logged-in / logged-out state before data arrives.
  const { data } = await supabase.auth.getSession();
  document.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { session: data?.session ?? null } })
  );

  // Load all data from Supabase and trigger the first render.
  await repository.hydrate();
  emit("state:changed", repository.getState());
})();
