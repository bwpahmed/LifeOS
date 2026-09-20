"use client";

import { useEffect,useState } from "react";
import { listWorkspaces,selectWorkspace,type WorkspaceOption } from "@/lib/supabase/workspace";
import { supabaseBrowser } from "@/lib/supabase/client";

export function WorkspaceSwitcher(){
 const[items,setItems]=useState<WorkspaceOption[]>([]);const[current,setCurrent]=useState("");
 useEffect(()=>{listWorkspaces(supabaseBrowser()).then(rows=>{setItems(rows);try{const saved=localStorage.getItem("lifeos_selected_workspace_v1")||rows[0]?.workspaceId||"";setCurrent(rows.some(r=>r.workspaceId===saved)?saved:(rows[0]?.workspaceId||""));}catch{setCurrent(rows[0]?.workspaceId||"");}}).catch(()=>{});},[]);
 if(items.length<2)return null;
 return <label className="workspace-switcher">Workspace<select value={current} onChange={e=>{setCurrent(e.target.value);selectWorkspace(e.target.value);location.reload();}}>{items.map(w=><option key={w.workspaceId} value={w.workspaceId}>{w.name} · {w.role}</option>)}</select></label>;
}
