import { emit } from "../events.js";
import { buildDefaultState, STATE_VERSION } from "../model.js";

export function createRepository({ adapter }) {
  let state = buildDefaultState(STATE_VERSION);

  async function hydrate() {
    state = await adapter.load();
    return state;
  }

  function getState() {
    return state;
  }

  async function persist() {
    await adapter.save(state);
    emit("state:changed", state);
  }

  async function mutate(mutator) {
    mutator(state);
    await persist();
    return state;
  }

  function addEquipment(payload) {
    return mutate((draft) => {
      draft.equipment.push({ id: crypto.randomUUID(), ...payload });
    });
  }

  function updateEquipment(id, patch) {
    return mutate((draft) => {
      const item = draft.equipment.find((entry) => entry.id === id);
      if (item) Object.assign(item, patch);
    });
  }

  function importEquipment(rows) {
    return mutate((draft) => {
      draft.equipment.push(...rows);
    });
  }

  function recordMove(payload) {
    return mutate((draft) => {
      draft.moves.unshift({ id: crypto.randomUUID(), ...payload });
    });
  }

  function recordReceipt(moveId, receiptData) {
    return mutate((draft) => {
      const move = draft.moves.find((entry) => entry.id === moveId);
      if (move) Object.assign(move, receiptData);
    });
  }

  function recordCalibration(payload) {
    return recordMove({ type: "calibration", ...payload });
  }

  function recordSubscriptionUpdate(payload) {
    return recordMove({ type: "subscription_updated", ...payload });
  }

  function addCorrection(payload) {
    return mutate((draft) => {
      draft.corrections = [...(draft.corrections || []), payload];
    });
  }

  function archiveHistory() {
    return mutate((draft) => {
      draft.moves = draft.moves.map((entry) => ({ ...entry, archived: true }));
    });
  }

  return {
    hydrate,
    getState,
    mutate,
    persist,
    addEquipment,
    updateEquipment,
    importEquipment,
    recordMove,
    recordReceipt,
    recordCalibration,
    recordSubscriptionUpdate,
    addCorrection,
    archiveHistory,
  };
}
