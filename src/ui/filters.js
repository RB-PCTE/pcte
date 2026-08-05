// src/ui/filters.js — read filter values from the DOM, apply them to state.
//
// No rendering. Render modules call these and build the DOM from the result.
//
// The corrections overlay that used to sit in front of every read
// (applyCorrectionsToMoves) was removed in step 7a along with the rest of the
// corrections feature — moves are now filtered directly.

import { FILTER_ALL } from "../model.js";

// ── Equipment ─────────────────────────────────────────────────────────────────

/**
 * Read the current equipment filter values from the DOM.
 * Returns safe defaults when elements are absent.
 * @returns {{search: string, location: string, status: string, calibration: string}}
 */
export function readEquipmentFilters() {
  return {
    search:      document.getElementById("search-input")?.value.trim().toLowerCase() ?? "",
    location:    document.getElementById("location-filter")?.value    || FILTER_ALL,
    status:      document.getElementById("status-filter")?.value      || FILTER_ALL,
    calibration: document.getElementById("calibration-filter")?.value || FILTER_ALL,
  };
}

/**
 * Filter state.equipment using the current DOM filter values.
 *
 * Every comparison is against a backend enum value, not a display label — the
 * filter <select> options carry the enum value and render the label.
 *
 * @param {object} state
 * @param {object} [filters] - output of readEquipmentFilters(); reads the DOM if omitted
 * @returns {object[]}
 */
export function getFilteredEquipment(state, filters) {
  const f = filters ?? readEquipmentFilters();

  return (state.equipment ?? []).filter((item) => {
    // Location — matched on id, so renaming a location doesn't break the filter.
    if (f.location !== FILTER_ALL && item.current_location_id !== f.location) return false;

    // Status. "in_transit" is a derived state rather than a stored status, so
    // it's checked against the server's in_transit flag; every other value is a
    // real equipment_status, and an in-transit item is excluded from those
    // because that's not what the table is showing for it.
    if (f.status !== FILTER_ALL) {
      if (f.status === "in_transit") {
        if (!item.in_transit) return false;
      } else if (item.in_transit || item.status !== f.status) {
        return false;
      }
    }

    // Calibration health. `calibration: null` is the "not required" case.
    if (f.calibration !== FILTER_ALL) {
      const status = item.calibration?.status ?? "not_required";
      if (status !== f.calibration) return false;
    }

    // Full-text search across name, serial, category and location.
    if (f.search) {
      const haystack = [
        item.name,
        item.serial,
        item.category,
        item.current_location_name,
        item.home_location_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(f.search)) return false;
    }

    return true;
  });
}

// ── Moves ─────────────────────────────────────────────────────────────────────

/**
 * Read the current moves filter values from the DOM.
 * @returns {{equipment: string, type: string, destination: string,
 *            receiptOnly: boolean, search: string}}
 */
export function readMovesFilters() {
  return {
    equipment:   document.getElementById("moves-equipment-filter")?.value   ?? FILTER_ALL,
    type:        document.getElementById("moves-type-filter")?.value        ?? FILTER_ALL,
    destination: document.getElementById("moves-destination-filter")?.value ?? FILTER_ALL,
    receiptOnly: document.getElementById("moves-receipt-only")?.checked     ?? false,
    search:      document.getElementById("moves-search")?.value.trim().toLowerCase() ?? "",
  };
}

/**
 * Return true when a move is still open — shipped but not yet receipted.
 *
 * A move_logistics row is created alongside every move, so `logistics` being
 * present says nothing; `received_at` being null is what marks it open.
 *
 * @param {object} entry - MoveOut
 * @returns {boolean}
 */
export function isMoveAwaitingReceipt(entry) {
  return Boolean(entry) && !entry.logistics?.received_at;
}

/**
 * Filter state.moves using the current DOM filter values.
 * @param {object} state
 * @param {object} [filters] - output of readMovesFilters(); reads the DOM if omitted
 * @param {Map<string, object>} [equipmentById]
 * @returns {object[]}
 */
export function getFilteredMoves(state, filters, equipmentById) {
  const f = filters ?? readMovesFilters();

  const eqMap =
    equipmentById instanceof Map
      ? equipmentById
      : new Map((state.equipment ?? []).map((eq) => [String(eq.id), eq]));

  return (state.moves ?? []).filter((entry) => {
    if (f.equipment !== FILTER_ALL && String(entry.equipment_id) !== f.equipment) return false;
    if (f.type !== FILTER_ALL && entry.move_type !== f.type) return false;
    if (f.receiptOnly && !isMoveAwaitingReceipt(entry)) return false;
    if (f.destination !== FILTER_ALL && entry.to_location_id !== f.destination) return false;

    if (f.search) {
      const eq = eqMap.get(String(entry.equipment_id ?? ""));
      const eqLabel = eq ? `${eq.name} ${eq.serial ?? ""} ${eq.category}`.toLowerCase() : "";
      const notes = (entry.notes ?? "").toLowerCase();
      const shipping = `${entry.logistics?.carrier ?? ""} ${entry.logistics?.tracking_number ?? ""}`
        .toLowerCase();
      const places = `${entry.from_location_name ?? ""} ${entry.to_location_name ?? ""}`
        .toLowerCase();

      if (
        !eqLabel.includes(f.search) &&
        !notes.includes(f.search) &&
        !shipping.includes(f.search) &&
        !places.includes(f.search)
      ) return false;
    }

    return true;
  });
}
