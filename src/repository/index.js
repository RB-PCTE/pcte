// src/repository/index.js — the app's single state store.
//
// Every mutation is: call one backend endpoint, then refetch the whole state
// and emit it. There is no local draft, no optimistic patch, and no partial
// update — the server is the only thing that decides what the state is, so
// what the UI renders after a write is always what the database actually holds.
//
// This is the point of the step-7 rebuild. The previous version mutated a local
// draft and re-upserted every table on every change, which is what produced the
// blank-location and clobbered-status bugs.

import { emit } from "../events.js";
import { buildDefaultState } from "../model.js";
import { apiFetch, loadState } from "../api.js";

/**
 * @param {object} [deps]
 * @param {{apiFetch: Function, loadState: Function}} [deps.api] - injectable for tests
 */
export function createRepository({ api = { apiFetch, loadState } } = {}) {
  let state = buildDefaultState();

  async function hydrate() {
    state = await api.loadState();
    return state;
  }

  function getState() {
    return state;
  }

  /**
   * Run a write, then replace local state with the server's truth and notify
   * the UI. Every mutation below funnels through here, so no caller can
   * accidentally skip the refetch.
   * @param {() => Promise<any>} write
   * @returns {Promise<any>} whatever the endpoint returned
   */
  async function commit(write) {
    const result = await write();
    await hydrate();
    emit("state:changed", state);
    return result;
  }

  /**
   * Create equipment. Admin-only server-side (403 otherwise).
   * The backend also creates the equipment_state row, starting at
   * `available` with `current_location_id = home_location_id`.
   * @param {object} payload - EquipmentCreateIn shape
   */
  function addEquipment(payload) {
    return commit(() => api.apiFetch("/equipment", { method: "POST", body: payload }));
  }

  /**
   * Patch structural equipment fields. `status`, `current_location_id` and
   * `condition` are owned by the move endpoints and are rejected here (422).
   * @param {string} id
   * @param {object} patch - EquipmentPatchIn shape
   */
  function updateEquipment(id, patch) {
    return commit(() => api.apiFetch(`/equipment/${id}`, { method: "PATCH", body: patch }));
  }

  /**
   * Open a move. `status_from`, `from_location_id` and `created_by` are
   * server-derived and must not be sent — the request model forbids them.
   * 409 if the equipment already has an unreceipted move.
   * @param {object} payload - MoveCreateIn shape
   */
  function recordMove(payload) {
    return commit(() => api.apiFetch("/moves", { method: "POST", body: payload }));
  }

  /**
   * Confirm arrival. Applies the move's destination and status to the
   * equipment and sets `equipment_state.condition` from `condition_result`.
   * @param {string} moveId
   * @param {{condition_result: string, condition_notes?: string|null}} receiptData
   */
  function recordReceipt(moveId, receiptData) {
    return commit(() =>
      api.apiFetch(`/moves/${moveId}/receipt`, { method: "POST", body: receiptData })
    );
  }

  /**
   * Record a calibration.
   *
   * This is a PATCH of the equipment row, not a move: there is no `calibration`
   * member in the move_type enum and no calibration endpoint, so a calibration
   * no longer produces a Moves-log entry the way it did pre-step-7.
   *
   * @param {string} equipmentId
   * @param {{last_calibration_date: string, calibration_interval_months: number|null,
   *          calibration_required: boolean}} payload
   */
  function recordCalibration(equipmentId, payload) {
    return updateEquipment(equipmentId, payload);
  }

  /**
   * Create a location. Admin-only server-side.
   * `active` is omitted deliberately — the server defaults it to true, and
   * there is no reason to create a location already switched off.
   * @param {{name: string, category: string}} payload
   */
  function createLocation(payload) {
    return commit(() => api.apiFetch("/locations", { method: "POST", body: payload }));
  }

  /**
   * Replace a location.
   *
   * PUT is a **full replace**, not a partial patch: `name`, `category` and
   * `active` are all required on every call, even when only one of them
   * changed. Callers must send the row's current values for the fields they
   * aren't touching.
   *
   * This is also how a location is reactivated — same endpoint, `active: true`.
   * A separate `reactivateLocation` wrapping the identical call would only add
   * somewhere for the two to drift apart.
   *
   * @param {string} id
   * @param {{name: string, category: string, active: boolean}} payload
   */
  function updateLocation(id, payload) {
    return commit(() => api.apiFetch(`/locations/${id}`, { method: "PUT", body: payload }));
  }

  /**
   * Deactivate a location. Soft delete — the server sets `active = false` and
   * returns the updated row; it is never removed, and every move referencing it
   * stays intact.
   * @param {string} id
   */
  function deactivateLocation(id) {
    return commit(() => api.apiFetch(`/locations/${id}`, { method: "DELETE" }));
  }

  return {
    hydrate,
    getState,
    addEquipment,
    updateEquipment,
    recordMove,
    recordReceipt,
    recordCalibration,
    createLocation,
    updateLocation,
    deactivateLocation,
  };
}
