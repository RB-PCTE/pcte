// src/main.js — application startup, navigation wiring, and state orchestration.
// This file is intentionally thin: it owns hydration, nav switching, and the
// state:changed → renderAll pipeline. All rendering lives in src/ui/*.js.

import { on, emit } from "./events.js";
import { createRepository } from "./repository/index.js";
import { supabase } from "./supabaseClient.js";
import { loadActiveView, saveActiveView } from "./preferences.js";
import { renderOperationsView, bindOperationsEvents } from "./ui/operations.js";
import { renderMovesView, bindMovesEvents } from "./ui/moves.js";
import { renderAdminView, bindAdminEvents } from "./ui/admin.js";
import { bindModalsEvents } from "./ui/modals.js";
import { initDevtools } from "./ui/devtools.js";
import { initAuth } from "./auth.js";
import { showToast } from "./ui/toast.js";
import { buildDefaultState } from "./model.js";

// ── Build version ─────────────────────────────────────────────────────────────
// Update this string before each deployment.
export const BUILD_VERSION = "2026-08-05.v05  — Step 7a: FastAPI backend";

// ── Repository ────────────────────────────────────────────────────────────────
// Single shared repository instance used by all UI modules.
// Reads and writes go to the FastAPI backend (src/api.js); Supabase is used
// only for the auth session.
export const repository = createRepository();

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
  // Controllers get the state snapshot before rendering, so any handler that
  // fires mid-render is already looking at the current data.
  _opsController?.syncState(state);
  _movesController?.syncState(state);
  _adminController?.syncState(state);
  _modalsController?.syncState(state);
  _devtoolsController?.syncState(state);

  renderOperationsView(state);
  renderMovesView(state);
  renderAdminView(state);
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

// Bind event listeners; keep controllers for state sync
let _opsController    = bindOperationsEvents({ repository, showToast });
let _movesController  = bindMovesEvents({ repository, showToast });
let _adminController  = bindAdminEvents({ repository, showToast });
let _modalsController  = bindModalsEvents({ repository, showToast });
let _devtoolsController = initDevtools();

// Step 12 ✅ auth — login/logout, role check, dev mode passcode
initAuth({ showToast });

/**
 * Load state from the API and render.
 *
 * Every endpoint requires a bearer token, so there is nothing to fetch until
 * the user is signed in — signing in re-fires "auth:changed" and brings us
 * back here. Signing out clears the state so the previous user's data doesn't
 * stay on screen.
 */
let _loadedForUser = null;

async function loadAndRender(session) {
  const userId = session?.user?.id ?? null;

  if (!userId) {
    _loadedForUser = null;
    emit("state:changed", buildDefaultState());
    return;
  }

  // onAuthStateChange also fires on every silent token refresh. Refetching the
  // whole state each time would be pointless traffic, so only load when the
  // signed-in user actually changes.
  if (userId === _loadedForUser) return;
  _loadedForUser = userId;

  try {
    await repository.hydrate();
    emit("state:changed", repository.getState());
  } catch (err) {
    _loadedForUser = null;
    showToast(err.message, "error");
  }
}

document.addEventListener("auth:changed", (e) => {
  loadAndRender(e.detail?.session ?? null);
});

(async function init() {
  // Fire the initial auth state so auth.js renders the correct logged-in /
  // logged-out state; the listener above then loads data if there's a session.
  const { data } = await supabase.auth.getSession();
  document.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { session: data?.session ?? null } })
  );
})();
