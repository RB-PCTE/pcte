import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://eugdravtvewpnwkkpkzl.supabase.co",
  "sb_publishable_n2xhgXcQ1K2cEnk8g_JXsA_UKKBLhUH"
);

window.supabase = supabase; // 👈 add this line
console.log("Supabase initialised:", supabase);
