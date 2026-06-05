// src/ui/toast.js — lightweight toast notification system.
//
// Usage:
//   import { showToast } from "./toast.js";
//   showToast("Move recorded.", "success");
//   showToast("Something went wrong.", "error");
//   showToast("Loading…");   // defaults to "info"

const VALID_TYPES  = new Set(["success", "error", "info"]);
const DISMISS_MS   = 3500;  // auto-dismiss after this many milliseconds

/**
 * Show a brief notification toast at the bottom-right of the screen.
 *
 * @param {string} message  - text to display
 * @param {"success"|"error"|"info"} [type="info"]
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const safeType = VALID_TYPES.has(type) ? type : "info";

  const toast = document.createElement("div");
  toast.className = `toast toast--${safeType}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = String(message ?? "");

  container.appendChild(toast);

  // Auto-dismiss
  const timerId = window.setTimeout(() => dismiss(toast), DISMISS_MS);

  // Click anywhere on the toast to dismiss early
  toast.addEventListener("click", () => {
    window.clearTimeout(timerId);
    dismiss(toast);
  });
}

/**
 * Fade out and remove a toast element.
 * @param {HTMLElement} toast
 */
function dismiss(toast) {
  // Use a short CSS transition if the stylesheet defines one; otherwise just remove.
  toast.classList.add("toast--dismissing");
  // Remove after transition (or immediately if no transition is defined)
  const duration = getTransitionDuration(toast);
  window.setTimeout(() => toast.remove(), duration);
}

/**
 * Read the CSS transition-duration of an element in milliseconds.
 * Falls back to 0 when the value can't be read (e.g. in tests).
 * @param {HTMLElement} el
 * @returns {number}
 */
function getTransitionDuration(el) {
  try {
    const raw = window.getComputedStyle(el).transitionDuration ?? "0s";
    const seconds = parseFloat(raw);
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0;
  } catch {
    return 0;
  }
}
