// src/ui/filters.js — filter state helpers + getFilteredEquipment / getFilteredMoves.
//
// Responsibilities:
//   1. Read current filter values from the DOM (readEquipmentFilters / readMovesFilters)
//   2. Apply them to the in-memory state arrays (getFilteredEquipment / getFilteredMoves)
//   3. Apply corrections on top of raw moves before filtering (applyCorrectionsToMoves)
//
// No rendering here — just pure data filtering. Render modules call these functions
// and then build the DOM from the returned arrays.

import {
  getCalibrationInfo,
  getSubscriptionInfo,
  getEffectiveStatus,
} from "./computed.js";

// ── Corrections ───────────────────────────────────────────────────────────────
// Corrections are stored separately in state.corrections and applied on top of
// the raw moves at read time. The original move row is never mutated.

/**
 * Normalise one raw correction entry from the DB into a consistent shape.
 * @param {object} entry
 * @returns {object}
 */
function normalizeCorrectionEntry(entry = {}) {
  const safe = entry && typeof entry === "object" ? entry : {};
  const changes =
    safe.changes && typeof safe.changes === "object"
      ? Object.entries(safe.changes).reduce((acc, [field, value]) => {
          if (!value || typeof value !== "object") return acc;
          acc[field] = { from: value.from ?? null, to: value.to ?? null };
          return acc;
        }, {})
      : {};

  return {
    id: typeof safe.id === "string" && safe.id.trim() ? safe.id : crypto.randomUUID(),
    ts: typeof safe.ts === "string" && safe.ts.trim() ? safe.ts : new Date().toISOString(),
    targetType: safe.targetType === "move" ? "move" : "",
    targetId: typeof safe.targetId === "string" ? safe.targetId.trim() : "",
    reason: typeof safe.reason === "string" ? safe.reason.trim() : "",
    changes,
    createdBy:
      typeof safe.createdBy === "string" && safe.createdBy.trim()
        ? safe.createdBy.trim()
        : "",
  };
}

/**
 * Apply a correction's field changes to a move entry (mutates in place).
 * @param {object} move
 * @param {string} fieldName
 * @param {string} value
 */
function applyMoveFieldValue(move, fieldName, value) {
  switch (fieldName) {
    case "shippingTracking":
      move.shipping = { ...(move.shipping ?? {}), trackingNumber: value || "" };
      break;
    case "receiptDate":
      move.receivedAt = value || "";
      move.shipping = { ...(move.shipping ?? {}), receivedAt: value || "" };
      break;
    case "fromLocationId":
      move.fromLocation = value || "";
      break;
    case "toLocationId":
      move.toLocation = value || "";
      break;
    case "condition":
      move.condition = { ...(move.condition ?? {}), rating: value || "" };
      break;
    case "notes":
      move.notes = value || "";
      break;
  }
}

/**
 * Return a copy of `moves` with all applicable corrections merged in.
 * Each returned move gets a `_corrections` array listing which corrections
 * were applied so the UI can show correction badges.
 *
 * @param {object[]} moves        - raw moves from state.moves
 * @param {object[]} corrections  - raw corrections from state.corrections
 * @returns {object[]}
 */
export function applyCorrectionsToMoves(moves = [], corrections = []) {
  const baseMoves = Array.isArray(moves) ? moves : [];
  const effective = baseMoves.map((m) => ({ ...m, _corrections: [] }));
  const byId = new Map(effective.map((m) => [m.id, m]));

  const sorted = (Array.isArray(corrections) ? corrections : [])
    .map(normalizeCorrectionEntry)
    .filter(
      (c) =>
        c.targetType === "move" &&
        c.targetId &&
        c.reason &&
        Object.keys(c.changes).length
    )
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  sorted.forEach((correction) => {
    const target = byId.get(correction.targetId);
    if (!target) return;
    Object.entries(correction.changes).forEach(([field, change]) => {
      applyMoveFieldValue(target, field, change.to ?? "");
    });
    target._corrections.push(correction);
  });

  return effective;
}

// ── Equipment filter state ────────────────────────────────────────────────────

/**
 * Read the current equipment filter values from the DOM.
 * Returns safe defaults when elements are absent.
 * @returns {{ search: string, location: string, status: string,
 *             calibration: string, subscription: string }}
 */
export function readEquipmentFilters() {
  return {
    search:       document.getElementById("search-input")?.value.trim().toLowerCase() ?? "",
    location:     document.getElementById("location-filter")?.value ?? "All locations",
    status:       document.getElementById("status-filter")?.value   ?? "All statuses",
    calibration:  document.getElementById("calibration-filter")?.value ?? "All",
    subscription: document.getElementById("subscription-filter")?.value ?? "All",
  };
}

/**
 * Filter state.equipment using the current DOM filter values.
 * Uses `getEffectiveStatus`, `getCalibrationInfo`, `getSubscriptionInfo`
 * from computed.js — no DOM access inside the filter predicate itself.
 *
 * @param {object}  state   - full app state from repository.getState()
 * @param {object}  [filters] - output of readEquipmentFilters(); reads DOM if omitted
 * @param {Date}    [now]
 * @returns {object[]}  filtered equipment items
 */
export function getFilteredEquipment(state, filters, now = new Date()) {
  const f = filters ?? readEquipmentFilters();
  const moves = state.moves ?? [];

  return (state.equipment ?? []).filter((item) => {
    const effectiveStatus  = getEffectiveStatus(item, moves);
    const calibrationInfo  = getCalibrationInfo(item, now);
    const subscriptionInfo = getSubscriptionInfo(item, now);

    // Location
    if (f.location !== "All locations" && item.location !== f.location) return false;

    // Status (includes "In transit")
    if (f.status !== "All statuses" && effectiveStatus !== f.status) return false;

    // Calibration health
    if (f.calibration !== "All" && calibrationInfo.status !== f.calibration) return false;

    // Subscription health
    if (f.subscription !== "All" && subscriptionInfo.status !== f.subscription) return false;

    // Full-text search across name, location, status, model, serial, asset tag
    if (f.search) {
      const haystack = [
        item.name,
        item.model,
        item.serialNumber,
        item.assetTag,
        item.location,
        effectiveStatus,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(f.search)) return false;
    }

    return true;
  });
}

// ── Moves filter state ────────────────────────────────────────────────────────

/**
 * Read the current moves filter values from the DOM.
 * @returns {{ equipment: string, type: string, destination: string,
 *             receiptOnly: boolean, showDeleted: boolean, search: string }}
 */
export function readMovesFilters() {
  return {
    equipment:   document.getElementById("moves-equipment-filter")?.value ?? "all",
    type:        document.getElementById("moves-type-filter")?.value       ?? "all",
    destination: document.getElementById("moves-destination-filter")?.value ?? "All locations",
    receiptOnly: document.getElementById("moves-receipt-only")?.checked    ?? false,
    showDeleted: document.getElementById("moves-show-deleted")?.checked    ?? false,
    search:      document.getElementById("moves-search")?.value.trim().toLowerCase() ?? "",
  };
}

/**
 * Return true when a move entry has been soft-deleted.
 * @param {object} entry
 * @returns {boolean}
 */
export function isEntryDeleted(entry) {
  return Boolean(entry?.deletedAt);
}

/**
 * Return true when a move is awaiting a receipt (shipped but not yet received).
 * In the new Supabase model this means: type is a shipping move type AND
 * no receiptData has been recorded yet.
 * @param {object} entry - move entry (possibly with corrections applied)
 * @returns {boolean}
 */
export function isMoveAwaitingReceipt(entry) {
  if (!entry || entry.type !== "move") return false;
  return !entry.receiptData;
}

/**
 * Filter state.moves using the current DOM filter values.
 * Corrections are applied before filtering so search/display reflects
 * the corrected values.
 *
 * @param {object}  state    - full app state
 * @param {object}  [filters] - output of readMovesFilters(); reads DOM if omitted
 * @param {object}  [equipmentById] - Map<id, item> for fast equipment lookups
 * @returns {object[]}  filtered, corrections-applied move entries
 */
export function getFilteredMoves(state, filters, equipmentById) {
  const f = filters ?? readMovesFilters();
  const corrected = applyCorrectionsToMoves(state.moves ?? [], state.corrections ?? []);

  // Build equipment lookup map if not supplied
  const eqMap =
    equipmentById instanceof Map
      ? equipmentById
      : new Map((state.equipment ?? []).map((eq) => [String(eq.id), eq]));

  return corrected.filter((entry) => {
    // Soft-deleted entries
    if (!f.showDeleted && isEntryDeleted(entry)) return false;

    // Equipment filter
    if (f.equipment !== "all" && entry.equipmentId !== f.equipment) return false;

    // Move type
    if (f.type !== "all" && entry.type !== f.type) return false;

    // Receipt-only
    if (f.receiptOnly && !isMoveAwaitingReceipt(entry)) return false;

    // Destination (only applies to "move" type entries)
    if (f.destination !== "All locations") {
      if (entry.type !== "move") return false;
      if ((entry.toLocation ?? "").trim() !== f.destination) return false;
    }

    // Full-text search
    if (f.search) {
      const eq = eqMap.get(String(entry.equipmentId ?? ""));
      const eqLabel = eq
        ? `${eq.name} ${eq.model} ${eq.serialNumber} ${eq.assetTag}`.toLowerCase()
        : "";
      const notes = `${entry.notes ?? ""} ${entry.text ?? ""}`.toLowerCase();
      const shipping = `${entry.shipping?.carrier ?? ""} ${entry.shipping?.trackingNumber ?? ""}`.toLowerCase();
      if (
        !eqLabel.includes(f.search) &&
        !notes.includes(f.search) &&
        !shipping.includes(f.search)
      ) return false;
    }

    return true;
  });
}
