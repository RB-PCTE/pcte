// src/auth.js — Supabase authentication + admin mode gating.
//
// Responsibilities:
//   1. Wire the Sign In / Sign Out buttons in the Admin panel.
//   2. Listen to "auth:changed" DOM events (fired by main.js from supabase.auth.onAuthStateChange).
//   3. After login, query profiles.role to determine admin access.
//   4. Fire "auth:admin-changed" so main.js and other modules know the admin state.
//   5. Show/hide the Admin nav button (#nav-admin) based on admin state.
//   6. Update auth status labels in the UI.
//   7. Handle the dev-mode passcode dialog (Shift+click version ×3 → "devmode:request").
//
// This module is self-contained — it imports supabase directly (via main.js re-export
// is not possible for circular reasons), and fires custom DOM events instead of calling
// other modules directly.
//
// Called once from main.js: initAuth()

import { supabase } from "./supabaseClient.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const PASSCODE_KEY = "equipmentTrackerAdminPasscode";
const DEV_MODE_KEY = "equipmentTrackerDevMode";

// ── State ─────────────────────────────────────────────────────────────────────

let _session  = null;   // current Supabase session
let _isAdmin  = false;  // true when either Supabase role = 'admin' OR dev passcode active

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireAdminChanged(isAdmin) {
  _isAdmin = isAdmin;
  document.dispatchEvent(
    new CustomEvent("auth:admin-changed", { detail: { isAdmin } })
  );
}

function setNavAdminVisible(visible) {
  const btn = document.getElementById("nav-admin");
  if (btn) btn.hidden = !visible;
}

function updateAuthUI(session, isAdmin) {
  const statusEl       = document.getElementById("auth-status");
  const headerStatusEl = document.getElementById("auth-status-header");
  const logoutBtn      = document.getElementById("auth-logout-button-admin");
  const loginEmailEl   = document.getElementById("auth-email");
  const loginPasswordEl = document.getElementById("auth-password");
  const loginBtn       = document.getElementById("auth-login-button");

  if (session) {
    const email = session.user?.email ?? "Signed in";
    const label = isAdmin ? `${email} (admin)` : email;

    if (statusEl)       statusEl.textContent = label;
    if (headerStatusEl) headerStatusEl.textContent = label;
    if (logoutBtn)      logoutBtn.disabled = false;
    if (loginBtn)       loginBtn.disabled  = true;
    if (loginEmailEl)   loginEmailEl.disabled = true;
    if (loginPasswordEl) loginPasswordEl.disabled = true;
  } else {
    // Dev mode active (passcode, no Supabase session)
    if (isAdmin && !session) {
      if (statusEl)       statusEl.textContent = "Dev mode (admin)";
      if (headerStatusEl) headerStatusEl.textContent = "Dev mode";
    } else {
      if (statusEl)       statusEl.textContent = "Not signed in";
      if (headerStatusEl) headerStatusEl.textContent = "";
    }
    if (logoutBtn)       logoutBtn.disabled = true;
    if (loginBtn)        loginBtn.disabled  = false;
    if (loginEmailEl)    loginEmailEl.disabled = false;
    if (loginPasswordEl) loginPasswordEl.disabled = false;
  }
}

// ── Role check ────────────────────────────────────────────────────────────────

async function checkAdminRole(session) {
  if (!session) return false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (error) {
      console.warn("auth.js: could not read profiles.role —", error.message);
      return false;
    }
    return data?.role === "admin";
  } catch {
    return false;
  }
}

// ── Auth state handler ────────────────────────────────────────────────────────

async function handleAuthChanged(session) {
  _session = session;

  if (session) {
    const isAdmin = await checkAdminRole(session);
    fireAdminChanged(isAdmin);
    setNavAdminVisible(isAdmin);
    updateAuthUI(session, isAdmin);
  } else {
    // No Supabase session — check if dev passcode mode is active
    const devActive = localStorage.getItem(DEV_MODE_KEY) === "true";
    fireAdminChanged(devActive);
    setNavAdminVisible(devActive);
    updateAuthUI(null, devActive);
  }
}

// ── Login / logout ────────────────────────────────────────────────────────────

async function handleLogin(showToast) {
  const email    = (document.getElementById("auth-email")?.value    ?? "").trim();
  const password = (document.getElementById("auth-password")?.value ?? "").trim();

  if (!email || !password) {
    showToast("Please enter your email and password.", "error");
    return;
  }

  const loginBtn = document.getElementById("auth-login-button");
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = "Signing in…"; }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = "Sign in"; }

  if (error) {
    showToast(`Sign in failed: ${error.message}`, "error");
  } else {
    showToast("Signed in.", "success");
    // auth:changed event fires automatically via onAuthStateChange → main.js
  }
}

async function handleLogout(showToast) {
  await supabase.auth.signOut();
  // Clear dev mode too when explicitly signing out
  localStorage.removeItem(DEV_MODE_KEY);
  fireAdminChanged(false);
  setNavAdminVisible(false);
  updateAuthUI(null, false);
  showToast("Signed out.", "success");
}

// ── Dev mode passcode dialog ──────────────────────────────────────────────────
// Triggered by Shift+click the build version label ×3 (fired by main.js as "devmode:request").
// Two modes:
//   Setup — no passcode stored yet; user creates one.
//   Verify — passcode exists; user enters it to enable admin mode.

function getStoredPasscode() {
  return localStorage.getItem(PASSCODE_KEY) ?? null;
}

function openPasscodeDialog() {
  const dialog   = document.getElementById("admin-passcode-dialog");
  const hintEl   = document.getElementById("admin-passcode-hint");
  const errorEl  = document.getElementById("admin-passcode-error");
  const verifyEl = document.getElementById("admin-passcode-verify");
  const setupEl  = document.getElementById("admin-passcode-setup");
  const submitEl = document.getElementById("admin-passcode-submit");

  if (!dialog) return;

  // Clear previous state
  document.getElementById("admin-passcode-form")?.reset();
  errorEl?.classList.add("is-hidden");

  const hasPasscode = !!getStoredPasscode();
  if (hasPasscode) {
    // Verify mode
    verifyEl?.classList.remove("is-hidden");
    setupEl?.classList.add("is-hidden");
    if (hintEl)   hintEl.textContent  = "Enter your admin passcode to enable admin mode.";
    if (submitEl) submitEl.textContent = "Enable";
  } else {
    // Setup mode (first time)
    verifyEl?.classList.add("is-hidden");
    setupEl?.classList.remove("is-hidden");
    if (hintEl)   hintEl.textContent  = "No passcode set yet. Create one to enable dev admin mode.";
    if (submitEl) submitEl.textContent = "Set passcode";
  }

  dialog.showModal();
}

function initPasscodeDialog(showToast) {
  // Cancel
  document.getElementById("admin-passcode-cancel")
    ?.addEventListener("click", () => {
      document.getElementById("admin-passcode-dialog")?.close();
    });

  // Click outside
  document.getElementById("admin-passcode-dialog")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });

  // Reset passcode link (visible in Verify mode)
  document.getElementById("admin-passcode-reset")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("This will delete the stored passcode. You will need to set a new one.")) return;
      localStorage.removeItem(PASSCODE_KEY);
      localStorage.removeItem(DEV_MODE_KEY);
      openPasscodeDialog(); // re-opens in Setup mode since no passcode is stored
    });

  // Submit
  document.getElementById("admin-passcode-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("admin-passcode-error");
      const storedPasscode = getStoredPasscode();

      if (!storedPasscode) {
        // Setup mode
        const newPass     = document.getElementById("admin-passcode-new")?.value     ?? "";
        const confirmPass = document.getElementById("admin-passcode-confirm")?.value ?? "";

        if (!newPass) {
          errorEl?.classList.remove("is-hidden");
          if (errorEl) errorEl.textContent = "Please enter a passcode.";
          return;
        }
        if (newPass !== confirmPass) {
          errorEl?.classList.remove("is-hidden");
          if (errorEl) errorEl.textContent = "Passcodes do not match.";
          return;
        }

        localStorage.setItem(PASSCODE_KEY, newPass);
        localStorage.setItem(DEV_MODE_KEY, "true");
        document.getElementById("admin-passcode-dialog")?.close();
        fireAdminChanged(true);
        setNavAdminVisible(true);
        updateAuthUI(_session, true);
        showToast("Passcode set. Admin mode enabled.", "success");

      } else {
        // Verify mode
        const entered = document.getElementById("admin-passcode-input")?.value ?? "";

        if (entered !== storedPasscode) {
          errorEl?.classList.remove("is-hidden");
          if (errorEl) errorEl.textContent = "Incorrect passcode.";
          return;
        }

        localStorage.setItem(DEV_MODE_KEY, "true");
        document.getElementById("admin-passcode-dialog")?.close();
        fireAdminChanged(true);
        setNavAdminVisible(true);
        updateAuthUI(_session, true);
        showToast("Admin mode enabled.", "success");
      }
    });
}

// ── Public init ───────────────────────────────────────────────────────────────

/**
 * Initialise the auth module. Call once at startup from main.js.
 * @param {{ showToast: Function }} deps
 */
export function initAuth({ showToast }) {
  // Wire auth:changed from main.js (fires on Supabase session changes)
  document.addEventListener("auth:changed", (e) => {
    handleAuthChanged(e.detail?.session ?? null);
  });

  // Wire login / logout buttons
  document.getElementById("auth-login-button")
    ?.addEventListener("click", () => handleLogin(showToast));

  document.getElementById("auth-logout-button-admin")
    ?.addEventListener("click", () => handleLogout(showToast));

  // Also wire the header sign-out button if it exists
  document.getElementById("auth-logout-button")
    ?.addEventListener("click", () => handleLogout(showToast));

  // Passcode dialog (dev mode)
  initPasscodeDialog(showToast);

  // Open passcode dialog on Shift+click ×3 (fired by main.js as "devmode:request").
  // Registered here — not inside initPasscodeDialog — so it is only attached once.
  document.addEventListener("devmode:request", openPasscodeDialog);

  // Restore dev mode from a previous session
  if (localStorage.getItem(DEV_MODE_KEY) === "true") {
    fireAdminChanged(true);
    setNavAdminVisible(true);
    updateAuthUI(null, true);
  }
}
