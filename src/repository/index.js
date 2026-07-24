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
      const item = draft.equipment.find((e) => e.id === payload.equipmentId);
      if (item) {
        // Keep local location in sync with the destination so the table and the
        // next adapter.save() match what move_create wrote to the DB.
        if (payload.toLocation) item.location = payload.toLocation;
        if (payload.condition?.rating) {
          item.conditionRating        = payload.condition.rating;
          item.conditionLastCheckedAt = payload.condition.checkedAt;
          item.conditionContentsOk    = payload.condition.contentsOk  ?? null;
          item.conditionFunctionalOk  = payload.condition.functionalOk ?? null;
          item.conditionLastNotes     = payload.condition.notes        ?? null;
        }
      }
    });
  }

  function recordReceipt(moveId, receiptData) {
    return mutate((draft) => {
      const move = draft.moves.find((entry) => entry.id === moveId);
      if (move) {
        // On receipt the item has arrived — settle its location on the destination.
        if (move.toLocation) {
          const arrived = draft.equipment.find((e) => e.id === move.equipmentId);
          if (arrived) arrived.location = move.toLocation;
        }
        move.receiptData = {
          received_at:          receiptData.receivedAt,
          condition_result:     receiptData.conditionResult  ?? null,
          condition_notes:      receiptData.conditionNotes   ?? null,
          condition_contents_ok:  receiptData.contentsOk    ?? null,
          condition_functional_ok: receiptData.functionalOk ?? null,
          received_by:          receiptData.receivedBy       ?? null,
        };
        if (receiptData.conditionResult) {
          const item = draft.equipment.find((e) => e.id === move.equipmentId);
          if (item) {
            item.conditionRating        = receiptData.conditionResult;
            item.conditionLastCheckedAt = new Date().toISOString();
            item.conditionContentsOk    = receiptData.contentsOk   ?? null;
            item.conditionFunctionalOk  = receiptData.functionalOk ?? null;
            item.conditionLastNotes     = receiptData.conditionNotes ?? null;
          }
        }
      }
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
