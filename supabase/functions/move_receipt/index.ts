import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://rb-pcte.github.io",
  "http://localhost:3000",
]);

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }

  try {
    if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) return json(req, 401, { error: "Missing Authorization bearer token" });

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !authData?.user) return json(req, 401, { error: "Invalid token" });
    const userId = authData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { move_id, received_at, condition_result, condition_notes,
            condition_contents_ok, condition_functional_ok } = body ?? {};

    // move_receipts.condition_result has a check constraint (pass/fail only).
    // Map the full rating string from the UI to the constrained value.
    const PASS_RATINGS = new Set(["Excellent", "Good", "Fair"]);
    const mappedResult = condition_result
      ? (PASS_RATINGS.has(condition_result) ? "pass" : "fail")
      : null;

    if (!move_id) return json(req, 400, { error: "Missing required field: move_id" });

    const receivedAt = received_at ?? new Date().toISOString();

    const { data: move, error: moveErr } = await supabase
      .from("moves")
      .select("id, equipment_id, to_location_id, status_to")
      .eq("id", move_id)
      .single();

    if (moveErr || !move) return json(req, 404, { error: "Move not found" });

    const { data: receipt, error: receiptErr } = await supabase
      .from("move_receipts")
      .insert([
        {
          move_id,
          received_at: receivedAt,
          received_by: userId,
          condition_result: mappedResult,
          condition_notes: condition_notes ?? null,
        },
      ])
      .select()
      .single();

    if (receiptErr) throw receiptErr;

    // Apply the intended post-move status now that receipt is confirmed
    const conditionPatch = condition_result ? {
      last_condition_result:    condition_result,
      last_condition_at:        new Date().toISOString(),
      condition_last_checked_by: userId,
      condition_last_notes:     condition_notes      ?? null,
      condition_contents_ok:    condition_contents_ok  ?? null,
      condition_functional_ok:  condition_functional_ok ?? null,
    } : {};

    const { error: stateErr } = await supabase
      .from("equipment_state")
      .update({
        status:     move.status_to ?? "Available",
        updated_at: new Date().toISOString(),
        ...conditionPatch,
      })
      .eq("equipment_id", move.equipment_id);

    if (stateErr) throw stateErr;

    return json(req, 200, { success: true, receipt, move });
  } catch (err) {
    return json(req, 500, { error: (err as Error).message });
  }
});
