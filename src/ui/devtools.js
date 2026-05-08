// src/ui/devtools.js — Developer diagnostics panel and edge-function test buttons.
//
// The #devtools-card is hidden by default (class="card is-hidden" in index.html).
// This module reveals it when admin/dev mode becomes active and hides it when
// admin mode is deactivated.
//
// Features:
//   • Diagnostics log — scrollable textarea that captures timestamped messages.
//     Toggle visibility with #admin-diagnostics-toggle.
//   • Test move_create — fires the edge function with dummy data, shows raw response.
//   • Test move_receipt — fires the edge function against the most recent move.
//
// Public surface:
//   initDevtools()       — called once at startup from main.js
//   devLog(message)      — append a line to the diagnostics textarea (importable)

import { supabase } from "../supabaseClient.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOVE_CREATE_ENDPOINT  = "https://eugdravtvewpnwkkpkzl.supabase.co/functions/v1/move_create";
const MOVE_RECEIPT_ENDPOINT = "https://eugdravtvewpnwkkpkzl.supabase.co/functions/v1/move_receipt";

// ── Diagnostics log ───────────────────────────────────────────────────────────

/**
 * Append a timestamped line to the diagnostics textarea.
 * Safe to call even if the panel doesn't exist yet.
 * @param {string} message
 */
export function devLog(message) {
  const logEl = document.getElementById("admin-diagnostics-log");
  if (!logEl) return;
  const ts   = new Date().toLocaleTimeString();
  logEl.value += `[${ts}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Card visibility ───────────────────────────────────────────────────────────

function setDevtoolsVisible(visible) {
  const card = document.getElementById("devtools-card");
  if (!card) return;
  card.classList.toggle("is-hidden", !visible);
  if (visible) devLog("Dev tools panel opened.");
}

// ── Edge function tests ───────────────────────────────────────────────────────

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

function showOutput(elId, text) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("is-hidden");
}

async function testMoveCreate(state) {
  devLog("Testing move_create…");
  showOutput("auth-test-move-create-output", "Sending…");

  const token = await getAccessToken();
  if (!token) {
    const msg = "Not signed in — cannot test authenticated endpoint.";
    devLog(msg);
    showOutput("auth-test-move-create-output", msg);
    return;
  }

  const equipment = (state?.equipment ?? [])[0];
  if (!equipment) {
    const msg = "No equipment in state to test with.";
    devLog(msg);
    showOutput("auth-test-move-create-output", msg);
    return;
  }

  try {
    const body = {
      equipment_id: equipment.id,
      move_type:    "move",
      moved_at:     new Date().toISOString(),
      notes:        "[Test from devtools]",
    };

    devLog(`POST ${MOVE_CREATE_ENDPOINT}`);
    devLog(`Body: ${JSON.stringify(body)}`);

    const res  = await fetch(MOVE_CREATE_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const text = await res.text();
    const msg  = `HTTP ${res.status}\n${text}`;
    devLog(`Response: ${msg}`);
    showOutput("auth-test-move-create-output", msg);
  } catch (err) {
    const msg = `Error: ${err.message}`;
    devLog(msg);
    showOutput("auth-test-move-create-output", msg);
  }
}

async function testMoveReceipt(state) {
  devLog("Testing move_receipt…");
  showOutput("auth-test-move-receipt-output", "Sending…");

  const token = await getAccessToken();
  if (!token) {
    const msg = "Not signed in — cannot test authenticated endpoint.";
    devLog(msg);
    showOutput("auth-test-move-receipt-output", msg);
    return;
  }

  // Use the most recent move that doesn't already have a receipt
  const move = (state?.moves ?? []).find((m) => !m.receiptData?.received_at);
  if (!move) {
    const msg = "No unreceived moves found in state to test with.";
    devLog(msg);
    showOutput("auth-test-move-receipt-output", msg);
    return;
  }

  try {
    const body = {
      move_id:          move.id,
      received_at:      new Date().toISOString(),
      condition_result: "pass",
      condition_notes:  "[Test from devtools]",
    };

    devLog(`POST ${MOVE_RECEIPT_ENDPOINT}`);
    devLog(`Body: ${JSON.stringify(body)}`);

    const res  = await fetch(MOVE_RECEIPT_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const text = await res.text();
    const msg  = `HTTP ${res.status}\n${text}`;
    devLog(`Response: ${msg}`);
    showOutput("auth-test-move-receipt-output", msg);
  } catch (err) {
    const msg = `Error: ${err.message}`;
    devLog(msg);
    showOutput("auth-test-move-receipt-output", msg);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Wire all devtools event listeners. Call once at startup.
 * @returns {{ syncState(state): void }}
 */
export function initDevtools() {
  let _state = { equipment: [], moves: [], corrections: [], locations: [] };

  // Show/hide devtools card when admin mode changes
  document.addEventListener("auth:admin-changed", (e) => {
    setDevtoolsVisible(Boolean(e.detail?.isAdmin));
  });

  // Diagnostics toggle checkbox
  document.getElementById("admin-diagnostics-toggle")
    ?.addEventListener("change", (e) => {
      const panel = document.getElementById("admin-diagnostics-panel");
      panel?.classList.toggle("is-hidden", !e.target.checked);
      if (e.target.checked) devLog("Diagnostics log opened.");
    });

  // Test buttons
  document.getElementById("auth-test-move-create-button")
    ?.addEventListener("click", () => testMoveCreate(_state));

  document.getElementById("auth-test-move-receipt-button")
    ?.addEventListener("click", () => testMoveReceipt(_state));

  return {
    syncState(state) {
      _state = state;
    },
  };
}
