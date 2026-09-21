"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function useRealtimeRefresh(tables:string[],onChange:()=>void,enabled=true){
 useEffect(()=>{
  if(!enabled||!tables.length)return;
  const sb=supabaseBrowser();
  let timer:number|undefined;
  const channel=sb.channel(`lifeos-live-${tables.join("-")}-${Math.random().toString(36).slice(2)}`);
  const refresh=()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>{if(document.visibilityState==="visible")onChange();},250);};
  for(const table of tables)channel.on("postgres_changes",{event:"*",schema:"public",table},refresh);
  channel.subscribe();
  return()=>{window.clearTimeout(timer);void sb.removeChannel(channel);};
 },[enabled,onChange,tables.join("|")]);
}
