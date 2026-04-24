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
    const { move_id, received_at, condition_result, condition_notes } = body ?? {};

    if (!move_id) return json(req, 400, { error: "Missing required field: move_id" });

    const receivedAt = received_at ?? new Date().toISOString();

    const { data: move, error: moveErr } = await supabase
      .from("moves")
      .select("id, equipment_id, to_location_id")
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
          condition_result: condition_result ?? null,
          condition_notes: condition_notes ?? null,
        },
      ])
      .select()
      .single();

    if (receiptErr) throw receiptErr;

    return json(req, 200, { success: true, receipt, move });
  } catch (err) {
    return json(req, 500, { error: (err as Error).message });
  }
});
