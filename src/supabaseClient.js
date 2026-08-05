// src/supabaseClient.js — Supabase clients, for authentication only.
//
// As of Phase A step 7 this file no longer reads or writes application data.
// The FastAPI backend is the single writer; the frontend reaches it through
// src/api.js. What remains here is the auth session, which stays on the
// Supabase JS SDK (see REBUILD_PLAN.md, "Open items"): src/auth.js signs in
// and out, and src/api.js reads the access token off the session to
// authenticate every backend call.
//
// Client B (the Subscription Tracker database) is kept wired up but currently
// unused — the subscription UI was removed in step 7a because GET /state has
// no subscription data and no backend endpoint covers DB B yet.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/*export const supabase = createClient(
  "https://eugdravtvewpnwkkpkzl.supabase.co",
  "sb_publishable_n2xhgXcQ1K2cEnk8g_JXsA_UKKBLhUH"
);*/

export const supabase = createClient(
  "https://rerwspncbyaakirlxvbx.supabase.co",
  "sb_publishable_LjlGgrv2SOyOSibMq_2bCg_cEm6vJNt"
);

export const subscriptionSupabase = createClient(
  "https://ezsqpiwzcuczgqdqyuqx.supabase.co",
  "sb_publishable_itlE-rs2TjRxoYxCemX05g_op6LZMYW"
);

window.supabaseClient = supabase;
