import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://eugdravtvewpnwkkpkzl.supabase.co",
  "sb_publishable_n2xhgXcQ1K2cEnk8g_JXsA_UKKBLhUH"
);

export const subscriptionSupabase = createClient(
  "https://ezsqpiwzcuczgqdqyuqx.supabase.co",
  "sb_publishable_itlE-rs2TjRxoYxCemX05g_op6LZMYW"
);

window.supabaseClient = supabase;

// ---------------------------------------------------------------------------
// Legacy helpers (still used by existing main.js call sites)
// ---------------------------------------------------------------------------

export async function handleAddEquipmentSupabase(payload, dataBaseName) {
  const { error } = await supabase
    .from(dataBaseName)
    .insert(payload)
    .select();
  if (error) console.error("Error appending database: ", error);
}

export async function getSupabaseLocationID(locationName) {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("name", locationName)
    .single();
  if (error) {
    console.error("Error fetching location ID: ", error);
    return null;
  }
  return data.id;
}

export async function getEquipmentSnapshot(equipmentID) {
  const { data, error } = await supabase
    .from("equipment")
    .select("name, asset_tag, serial")
    .eq("id", equipmentID)
    .single();
  if (error) {
    console.error("Error fetching equipment snapshot: ", error);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Field mapping: DB rows → local app format
// ---------------------------------------------------------------------------

function mapEquipmentFromDb(row, subscriptionBySerial) {
  const state = row.equipment_state ?? {};
  const serial = row.serial ?? "";
  const sub = subscriptionBySerial[serial] ?? null;
  return {
    id: row.id,
    name: row.name,
    model: row.category ?? "",
    serialNumber: serial,
    assetTag: row.asset_tag ?? "",
    purchaseDate: row.purchase_date ?? "",
    notes: row.notes ?? "",
    active: row.active ?? true,
    homeLocation: row.home_location?.name ?? "",
    // dynamic state from equipment_state
    location: state.current_location?.name ?? "",
    status: state.status ?? "Available",
    conditionRating: state.last_condition_result ?? null,
    conditionLastCheckedAt: state.last_condition_at ?? null,
    conditionContentsOk: state.condition_contents_ok ?? null,
    conditionFunctionalOk: state.condition_functional_ok ?? null,
    conditionLastCheckedBy: state.condition_last_checked_by ?? null,
    conditionLastNotes: state.condition_last_notes ?? null,
    conditionReference: state.condition_reference ?? {},
    conditionHistory: state.condition_history ?? [],
    lastConditionCheck: state.last_condition_check ?? null,
    // calibration (static, stored on equipment row)
    calibrationRequired: row.calibration_required ?? false,
    calibrationIntervalMonths: row.calibration_interval_months ?? null,
    lastCalibrationDate: row.last_calibration_date ?? null,
    // subscription — read-only from DB B, matched by serial number
    subscriptionRequired: !!sub,
    subscriptionRenewalDate: sub?.renewal_date ?? null,
  };
}

function mapEquipmentToDb(eq) {
  return {
    id: eq.id,
    name: eq.name,
    category: eq.model ?? "",
    serial: eq.serialNumber ?? null,
    asset_tag: eq.assetTag || null,
    notes: eq.notes ?? null,
    purchase_date: eq.purchaseDate || null,
    calibration_required: eq.calibrationRequired ?? false,
    calibration_interval_months: eq.calibrationIntervalMonths ?? null,
    last_calibration_date: eq.lastCalibrationDate || null,
  };
}

function mapEquipmentStateToDb(eq) {
  return {
    equipment_id: eq.id,
    status: eq.status ?? "Available",
    last_condition_result: eq.conditionRating ?? null,
    last_condition_at: eq.conditionLastCheckedAt ?? null,
    condition_contents_ok: eq.conditionContentsOk ?? null,
    condition_functional_ok: eq.conditionFunctionalOk ?? null,
    condition_last_checked_by: eq.conditionLastCheckedBy ?? null,
    condition_last_notes: eq.conditionLastNotes ?? null,
    condition_reference: eq.conditionReference ?? {},
    condition_history: eq.conditionHistory ?? [],
    last_condition_check: eq.lastConditionCheck ?? null,
  };
}

function mapMoveFromDb(row) {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentSnapshot: { name: "", model: "", serialNumber: "" },
    type: row.move_type,
    text: row.notes ?? "",
    timestamp: row.moved_at,
    archived: row.archived ?? false,
    fromLocationId: row.from_location_id ?? null,  
    toLocationId:   row.to_location_id   ?? null,
    receiptData: row.move_receipts?.[0] ?? null,
  };
}

function mapMoveToDb(move) {
  return {
    id: move.id,
    equipment_id: move.equipmentId,
    move_type: move.type,
    notes: move.text ?? null,
    moved_at: move.timestamp,
    archived: move.archived ?? false,
    ...(move.fromLocationId ? { from_location_id: move.fromLocationId } : {}),
    ...(move.toLocationId ? { to_location_id: move.toLocationId } : {}),
  };
}

function mapCorrectionFromDb(row) {
  return {
    id: row.id,
    moveId: row.move_id,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    correctedAt: row.corrected_at,
    correctedBy: row.corrected_by,
  };
}

function mapCorrectionToDb(c) {
  return {
    id: c.id,
    move_id: c.moveId,
    field: c.field,
    old_value: c.oldValue,
    new_value: c.newValue,
    reason: c.reason,
    corrected_at: c.correctedAt,
    corrected_by: c.correctedBy,
  };
}

// ---------------------------------------------------------------------------
// Storage adapter — implements { load(), save(), clear() } for the repository
// ---------------------------------------------------------------------------

export function createSupabaseStorageAdapter() {
  console.log("Creating Storage Adaptor")
  return {
    async load() {
      const [eqRes, movesRes, corrRes, subsRes, locRes] = await Promise.all([
        supabase.from("equipment").select(`
          *,
          equipment_state (
            *,
            current_location:current_location_id ( name )
          ),
          home_location:home_location_id ( name )
        `),
        supabase
          .from("moves")
          .select(`
            *,
            move_receipts ( condition_result, condition_notes, received_at, received_by )
          `)
          .order("moved_at", { ascending: false }),
        supabase.from("corrections").select("*"),
        subscriptionSupabase
          .from("subscriptions")
          .select("serial_number, renewal_date"),
        supabase
          .from("locations")
          .select("id, name")
          .eq("active", true).order("name"),
      ]);

      if (eqRes.error) console.error("Supabase load equipment:", eqRes.error);
      if (movesRes.error) console.error("Supabase load moves:", movesRes.error);
      if (corrRes.error) console.error("Supabase load corrections:", corrRes.error);
      if (subsRes.error) console.error("Subscription tracker load:", subsRes.error);
      if (locRes.error) console.error("Supabase load locations:", locRes.error);

      const subscriptionBySerial = Object.fromEntries(
        (subsRes.data ?? []).map((s) => [s.serial_number, s])
      );

      return {
        schemaVersion: 2,
        locations: (locRes.data ?? []).map((r) => ({ id: r.id, name: r.name })),
        equipment: (eqRes.data ?? []).map((row) =>
          mapEquipmentFromDb(row, subscriptionBySerial)
        ),
        moves: (movesRes.data ?? []).map(mapMoveFromDb),
        corrections: (corrRes.data ?? []).map(mapCorrectionFromDb),
      };
    },

    async save(state) {
      const results = await Promise.all([
        supabase
          .from("equipment")
          .upsert(state.equipment.map(mapEquipmentToDb), { onConflict: "id" }),
        supabase
          .from("equipment_state")
          .upsert(state.equipment.map(mapEquipmentStateToDb), {
            onConflict: "equipment_id",
          }),
        supabase
          .from("moves")
          .upsert(state.moves.map(mapMoveToDb), { onConflict: "id" }),
        supabase
          .from("corrections")
          .upsert((state.corrections ?? []).map(mapCorrectionToDb), {
            onConflict: "id",
          }),
      ]);
      results.forEach(({ error }, i) => {
        if (error) console.error(`Supabase save error [table ${i}]:`, error);
      });
    },

    async clear() {
      // no-op: Supabase data is not cleared from the client
    },
  };
}

// ---------------------------------------------------------------------------
// Subscription tracker write — called on equipment creation only
// ---------------------------------------------------------------------------

export async function createSubscriptionRecord(equipment, billingCycle = "monthly") {
  if (!equipment.serialNumber) return;
  const { error } = await subscriptionSupabase
    .from("subscriptions")
    .upsert(
      {
        serial_number: equipment.serialNumber,
        product_name: equipment.name,
        customer: "PCTE Fleet Equipment",
        billing_cycle: billingCycle,
      },
      { onConflict: "serial_number", ignoreDuplicates: true }
    );
  if (error) console.error("Failed to create subscription record:", error);
}
