"use client";

import { useEffect,useState } from "react";
import { currentWorkspace,listWorkspaces,selectWorkspace,type WorkspaceOption } from "@/lib/supabase/workspace";
import { supabaseBrowser } from "@/lib/supabase/client";

export function WorkspaceSwitcher(){
  const[items,setItems]=useState<WorkspaceOption[]>([]);
  const[current,setCurrent]=useState("");
  const[busy,setBusy]=useState(false);

  useEffect(()=>{
    const sb=supabaseBrowser();
    Promise.all([listWorkspaces(sb),currentWorkspace(sb)])
      .then(([rows,ctx])=>{
        setItems(rows);
        setCurrent(ctx?.workspaceId||rows[0]?.workspaceId||"");
      })
      .catch(()=>{});
  },[]);

  if(items.length<2)return null;

  async function change(workspaceId:string){
    setBusy(true);
    try{
      const sb=supabaseBrowser();
      await selectWorkspace(workspaceId,sb);
      setCurrent(workspaceId);
      location.reload();
    }finally{
      setBusy(false);
    }
  }

  return <label className="workspace-switcher">
    Workspace
    <select value={current} disabled={busy} onChange={e=>void change(e.target.value)}>
      {items.map(w=><option key={w.workspaceId} value={w.workspaceId}>{w.name} · {w.role}</option>)}
    </select>
  </label>;
}
