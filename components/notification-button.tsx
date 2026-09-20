"use client";

import Link from "next/link";
import { useCallback,useEffect,useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

export function NotificationButton(){
  const[count,setCount]=useState(0);
  const[userId,setUserId]=useState("");

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setCount(0);setUserId("");return;}
      setUserId(ctx.user.id);
      const{count,error}=await sb
        .from("notifications")
        .select("id",{count:"exact",head:true})
        .eq("user_id",ctx.user.id)
        .is("read_at",null);
      if(error)throw error;
      setCount(count||0);
    }catch{
      setCount(0);
    }
  },[]);

  useEffect(()=>{void load();},[load]);
  useRealtimeRefresh(["notifications"],load,Boolean(userId));

  const label=count ? String(count)+" unread notifications" : "Notifications";
  return <Link className="icon-btn" href="/notifications" title="Notifications" aria-label={label}>
    <span>◉</span>
    {count>0&&<b className="counter">{count>99?"99+":count}</b>}
  </Link>;
}
