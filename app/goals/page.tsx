"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Goal={id:string;name:string;area:string|null;deadline:string|null;status:string;progress:number|null;why:string|null};

export default function GoalsPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[goals,setGoals]=useState<Goal[]>([]);
  const[name,setName]=useState("");const[area,setArea]=useState("Personal");const[deadline,setDeadline]=useState(()=>{const d=new Date(todayInTZ()+"T12:00:00");d.setDate(d.getDate()+90);return d.toISOString().slice(0,10);});const[error,setError]=useState("");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const{data,error:q}=await sb.from("goals").select("id,name,area,deadline,status,progress,why").eq("workspace_id",ctx.workspaceId).order("deadline",{ascending:true,nullsFirst:false});if(q)throw q;setGoals((data||[]) as Goal[]);}catch(e){setError(e instanceof Error?e.message:"Could not load goals");}},[]);
  useEffect(()=>{void load();},[load]);useRealtimeRefresh(["goals"],load,Boolean(workspaceId));

  async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!name.trim())return;const sb=supabaseBrowser();const{error:q}=await sb.from("goals").insert({workspace_id:workspaceId,created_by:userId,name:name.trim(),area,target:100,unit:"%",deadline,status:"On Track",progress:0,privacy:"family"});if(q)setError(q.message);else{setName("");await load();}}
  async function progress(g:Goal){const raw=window.prompt("Progress 0–100",String(g.progress||0));if(raw==null)return;const n=Math.max(0,Math.min(100,Number(raw)));if(!Number.isFinite(n))return;const status=n>=100?"Completed":g.status==="Completed"?"On Track":g.status;const sb=supabaseBrowser();const{error:q}=await sb.from("goals").update({progress:n,status,updated_at:new Date().toISOString()}).eq("id",g.id);if(q)setError(q.message);else await load();}

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">GOALS</p><h1 className="text-2xl font-bold">Long-term outcomes</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-[.7fr_1.3fr]">
      <Panel title="Add goal"><form onSubmit={add} className="space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Goal" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><div className="grid grid-cols-2 gap-2"><select value={area} onChange={e=>setArea(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Health","Work","Money","Growth","Family","Europe","Personal"].map(x=><option key={x}>{x}</option>)}</select><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/></div><button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save goal</button></form></Panel>
      <Panel title="Active goals"><div className="space-y-2">{goals.map(g=><div key={g.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-3"><div><b>{g.name}</b><p className="text-xs text-slate-500">{g.area} · {g.status} · due {g.deadline||"—"}</p></div><button onClick={()=>progress(g)} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Update</button></div><div className="mt-2 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-[#77adff]" style={{width:`${Math.max(0,Math.min(100,Number(g.progress||0)))}%`}}/></div><p className="mt-1 text-xs text-slate-400">{g.progress||0}%</p></div>)}</div></Panel>
    </div>}
  </main>;
}
