// src/model.js — app-level shape and filter vocabularies.
//
// The domain constants that used to live here (physicalLocations,
// editableStatusOptions, moveTypeOptions, …) moved to src/enums.js in step 7a,
// where they're defined once against the backend's real enum values instead of
// being duplicated as display strings. What's left is the empty-state shape and
// the two filter lists, which are UI vocabularies rather than domain values.

import {
  EQUIPMENT_STATUS,
  IN_TRANSIT_DISPLAY,
  CALIBRATION_STATUS,
  CALIBRATION_NOT_REQUIRED,
  options,
} from "./enums.js";

/** Sentinel used by every filter <select> for "don't filter on this". */
export const FILTER_ALL = "all";

/**
 * Status filter options. "In transit" is derived server-side from
 * `current_move_id`, so it filters on `in_transit` rather than on `status` —
 * see getFilteredEquipment.
 */
export const statusFilterOptions = [
  { value: FILTER_ALL, label: "All statuses" },
  ...options(EQUIPMENT_STATUS),
  { value: "in_transit", label: IN_TRANSIT_DISPLAY },
];

/**
 * Calibration filter options.
 *
 * `not_required` has no backend counterpart — the API sends
 * `calibration: null` for items that don't need calibrating. It's a rendered
 * state, and a useful thing to filter on, so it's a local filter value.
 */
export const calibrationFilterOptions = [
  { value: FILTER_ALL, label: "All" },
  ...options(CALIBRATION_STATUS),
  { value: "not_required", label: CALIBRATION_NOT_REQUIRED },
];

/**
 * The empty state the repository starts from, before the first hydrate.
 * Matches what src/api.js loadState() returns.
 */
export function buildDefaultState() {
  return { equipment: [], moves: [], locations: [] };
}
