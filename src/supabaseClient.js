import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://eugdravtvewpnwkkpkzl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "SUPABASE_PUBLISHABLE_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
