"use client";

import { useEffect,useState } from "react";
import { listWorkspaces,selectWorkspace,type WorkspaceOption } from "@/lib/supabase/workspace";
import { supabaseBrowser } from "@/lib/supabase/client";

export function WorkspaceSwitcher(){
 const[items,setItems]=useState<WorkspaceOption[]>([]);const[current,setCurrent]=useState("");
 useEffect(()=>{listWorkspaces(supabaseBrowser()).then(rows=>{setItems(rows);try{const saved=localStorage.getItem("lifeos_selected_workspace_v1")||rows[0]?.workspaceId||"";setCurrent(saved);}catch{setCurrent(rows[0]?.workspaceId||"");}}).catch(()=>{});},[]);
 if(items.length<2)return null;
 return <div className="mx-auto max-w-6xl px-4 pt-2"><label className="flex items-center justify-end gap-2 text-xs text-slate-500">Workspace<select value={current} onChange={e=>{setCurrent(e.target.value);selectWorkspace(e.target.value);location.reload();}} className="rounded-lg border border-white/10 bg-[#0a1524] px-2 py-1 text-xs text-white">{items.map(w=><option key={w.workspaceId} value={w.workspaceId}>{w.name} · {w.role}</option>)}</select></label></div>;
}
