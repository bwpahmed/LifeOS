import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_SUPABASE_URL = "https://fdtbftuxziicubztgcde.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vEduzllO2aXH9NvGBgqvfg_T3ZuROXJ";

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(url, key);
}
