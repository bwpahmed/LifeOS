import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://fdtbftuxziicubztgcde.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vEduzllO2aXH9NvGBgqvfg_T3ZuROXJ";

function supabaseConfig(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  return {url,key};
}

export function supabaseBrowser() {
  const {url,key}=supabaseConfig();
  return createBrowserClient(url, key);
}

export function supabaseEmailAuthClient(){
  const {url,key}=supabaseConfig();
  return createClient(url,key,{
    auth:{
      flowType:"implicit",
      persistSession:false,
      autoRefreshToken:false,
      detectSessionInUrl:false,
    },
  });
}
