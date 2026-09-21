"use client";

import { useEffect,useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Theme="dark"|"light";

function applyTheme(theme:Theme){
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem("lifeos_theme",theme);}catch{}
}

export function ThemeToggle(){
  const[theme,setTheme]=useState<Theme>("dark");

  useEffect(()=>{
    let cancelled=false;
    const cached=((localStorage.getItem("lifeos_theme") as Theme|null)||"dark");
    setTheme(cached);
    applyTheme(cached);

    void (async()=>{
      try{
        const sb=supabaseBrowser();
        const ctx=await currentWorkspace(sb);
        if(!ctx||cancelled)return;
        const q=await sb.from("user_settings").select("settings").eq("user_id",ctx.user.id).maybeSingle();
        if(q.error)throw q.error;
        const cloud=(q.data?.settings as Record<string,unknown>|null)?.theme;
        if(!cancelled&&(cloud==="dark"||cloud==="light")){
          setTheme(cloud);
          applyTheme(cloud);
        }
      }catch{
        // Cached theme remains available offline.
      }
    })();

    return()=>{cancelled=true;};
  },[]);

  async function toggle(){
    const next:Theme=theme==="dark"?"light":"dark";
    setTheme(next);
    applyTheme(next);
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx)return;
      const q=await sb.from("user_settings").select("settings").eq("user_id",ctx.user.id).maybeSingle();
      if(q.error)throw q.error;
      const settings={...((q.data?.settings||{}) as Record<string,unknown>),theme:next};
      const save=await sb.from("user_settings").upsert({user_id:ctx.user.id,settings,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if(save.error)throw save.error;
    }catch{
      // The local choice remains cached and can be saved on the next change.
    }
  }

  return <button className="icon-btn" onClick={toggle} title={theme==="dark"?"Use light mode":"Use dark mode"} aria-label="Toggle theme">{theme==="dark"?"☀":"☾"}</button>;
}
