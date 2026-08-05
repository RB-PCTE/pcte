// src/ui/devtools.js — developer diagnostics panel.
//
// The #devtools-card is hidden by default and revealed when admin/dev mode
// becomes active.
//
// The two edge-function test buttons were replaced in step 7a: move_create and
// move_receipt are retired, and the useful check now is simply whether the
// FastAPI backend is reachable and the session token is accepted.
//
// Public surface:
//   initDevtools()   — called once at startup from main.js
//   devLog(message)  — append a line to the diagnostics textarea (importable)

import { API_BASE } from "../config.js";
import { apiFetch } from "../api.js";

// ── Diagnostics log ───────────────────────────────────────────────────────────

/**
 * Append a timestamped line to the diagnostics textarea.
 * Safe to call even if the panel doesn't exist.
 * @param {string} message
 */
export function devLog(message) {
  const logEl = document.getElementById("admin-diagnostics-log");
  if (!logEl) return;
  logEl.value += `[${new Date().toLocaleTimeString()}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Card visibility ───────────────────────────────────────────────────────────

function setDevtoolsVisible(visible) {
  const card = document.getElementById("devtools-card");
  if (!card) return;
  card.classList.toggle("is-hidden", !visible);
  if (visible) devLog(`Dev tools opened. API_BASE = ${API_BASE}`);
}

// ── API health check ──────────────────────────────────────────────────────────

function showOutput(elId, text) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("is-hidden");
}

/**
 * Hit an authenticated endpoint. /auth/whoami proves three things at once: the
 * API is up, CORS allows this origin, and the Supabase token validates.
 */
async function checkApi() {
  devLog(`GET ${API_BASE}/auth/whoami`);
  showOutput("api-health-output", "Checking…");

  try {
    const who = await apiFetch("/auth/whoami");
    const msg = `OK — authenticated as ${who?.email ?? who?.user_id ?? "unknown user"}`;
    devLog(msg);
    showOutput("api-health-output", msg);
  } catch (err) {
    const msg = `${err.name}: ${err.message}`;
    devLog(msg);
    showOutput("api-health-output", msg);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Wire all devtools event listeners. Call once at startup.
 * @returns {{ syncState(state): void }}
 */
export function initDevtools() {
  document.addEventListener("auth:admin-changed", (e) => {
    setDevtoolsVisible(Boolean(e.detail?.isAdmin));
  });

  document.getElementById("admin-diagnostics-toggle")?.addEventListener("change", (e) => {
    document.getElementById("admin-diagnostics-panel")
      ?.classList.toggle("is-hidden", !e.target.checked);
    if (e.target.checked) devLog("Diagnostics log opened.");
  });

  document.getElementById("api-health-button")?.addEventListener("click", checkApi);

  return {
    syncState() {
      // Nothing here needs a state snapshot any more — the old test buttons
      // pulled a sample equipment id out of state; the health check doesn't.
    },
  };
}
