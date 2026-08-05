// src/api.js — the only module that talks to the FastAPI backend.
//
// Everything goes through `apiFetch`, which attaches the Supabase bearer token
// and turns a non-2xx response into an Error carrying the server's own message.
// Supabase itself is still used for auth — see src/auth.js — but no longer for
// data: there are no `supabase.from(...)` calls anywhere in the app.

import { API_BASE } from "./config.js";
import { supabase } from "./supabaseClient.js";

/** Error carrying the HTTP status and the parsed response body. */
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Read FastAPI's error shape into one readable sentence.
 *
 * `detail` is a plain string for `HTTPException`, but a list of
 * `{loc, msg, type}` objects for a 422 validation failure — which is exactly
 * what we get if a request sends a field the Pydantic model doesn't declare
 * (every request model uses `extra="forbid"`). Rendering the field path makes
 * that immediately diagnosable instead of "Unprocessable Entity".
 */
function describeError(status, body) {
  const detail = body?.detail;

  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      // loc is like ["body", "status_from"] — drop the "body" prefix.
      const field = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
      return field ? `${field}: ${d.msg}` : d.msg;
    });
    return `Invalid request — ${parts.join("; ")}`;
  }

  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof body === "string" && body.trim()) return body;

  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 409) return "That conflicts with the current state of the record.";
  return `Request failed (HTTP ${status}).`;
}

/** Current Supabase access token, or throw a 401-shaped ApiError. */
async function authorization() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) {
    throw new ApiError("Please sign in to continue.", 401, null);
  }
  return `Bearer ${data.session.access_token}`;
}

/**
 * Call the backend.
 *
 * @param {string} path      - leading-slash path, e.g. "/moves"
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.body] - serialised as JSON when present
 * @returns {Promise<any>} parsed JSON, or null for an empty body
 * @throws {ApiError}
 */
export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = { Authorization: await authorization() };
  const init = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    // fetch only rejects on network-level failure — the API being down, or
    // CORS rejecting the request before it is sent.
    throw new ApiError(
      `Could not reach the API at ${API_BASE}. Is the backend running?`,
      0,
      null
    );
  }

  const text = await res.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) throw new ApiError(describeError(res.status, parsed), res.status, parsed);
  return parsed;
}

/**
 * Load the whole app state.
 *
 * Two calls, because `GET /state` returns equipment and moves only — locations
 * are reference data served separately by `GET /locations`.
 *
 * Inactive locations are kept in state rather than filtered here; the callers
 * that need only active ones (move destination, location summary, filters)
 * filter at the point of use, so a future locations-management screen can still
 * see everything.
 *
 * @returns {Promise<{equipment: object[], moves: object[], locations: object[]}>}
 */
export async function loadState() {
  const [state, locations] = await Promise.all([
    apiFetch("/state"),
    apiFetch("/locations"),
  ]);

  return {
    equipment: state?.equipment ?? [],
    moves:     state?.moves ?? [],
    locations: locations ?? [],
  };
}
