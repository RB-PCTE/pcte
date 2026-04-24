import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      origin === "http://localhost:3000" ? "http://localhost:3000" : "https://rb-pcte.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) return json(401, { error: "Missing Authorization bearer token" }, origin);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !authData?.user) return json(401, { error: "Invalid token" }, origin);
    const userId = authData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    const {
      equipment_id,
      move_type,
      from_location_id,
      to_location_id,
      moved_at,
      notes,
      carrier,
      tracking_number,
      booked_at,
    } = body;

    if (!equipment_id || !move_type || !to_location_id || !moved_at) {
      return json(400, { error: "Missing required fields" }, origin);
    }

    const shippingRequired =
      move_type === "office_transfer" ||
      move_type === "hire_out" ||
      move_type === "hire_return";

    if (shippingRequired && (!carrier || !tracking_number)) {
      return json(400, { error: "Shipping details required for this move type" }, origin);
    }

    const { data: move, error: moveError } = await supabase
      .from("moves")
      .insert([
        {
          equipment_id,
          move_type,
          from_location_id: from_location_id ?? null,
          to_location_id,
          moved_at,
          created_by: userId,
          notes: notes ?? null,
          requires_receipt: move_type !== "workshop",
        },
      ])
      .select()
      .single();

    if (moveError) throw moveError;

    if (carrier && tracking_number) {
      const { error: shipError } = await supabase.from("move_shipping").insert([
        {
          move_id: move.id,
          carrier,
          tracking_number,
          booked_at: booked_at ?? null,
        },
      ]);
      if (shipError) throw shipError;
    }

    const { error: stateError } = await supabase.from("equipment_state").upsert([
      {
        equipment_id,
        current_location_id: to_location_id,
        current_move_id: move.id,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (stateError) throw stateError;

    return json(200, { success: true, move }, origin);
  } catch (err) {
    return json(500, { error: (err as Error).message }, origin);
  }
});
