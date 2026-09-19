"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Project={id:string;name:string;area:string|null;deadline:string|null;status:string;owner:string|null;goal_id:string|null};
type Goal={id:string;name:string};

export default function ProjectsPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[projects,setProjects]=useState<Project[]>([]);const[goals,setGoals]=useState<Goal[]>([]);
  const[name,setName]=useState("");const[area,setArea]=useState("Business");const[goalId,setGoalId]=useState("");const[deadline,setDeadline]=useState(()=>{const d=new Date(todayInTZ()+"T12:00:00");d.setDate(d.getDate()+30);return d.toISOString().slice(0,10);});const[error,setError]=useState("");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const[p,g]=await Promise.all([sb.from("projects").select("id,name,area,deadline,status,owner,goal_id").eq("workspace_id",ctx.workspaceId).order("deadline",{ascending:true,nullsFirst:false}),sb.from("goals").select("id,name").eq("workspace_id",ctx.workspaceId)]);if(p.error)throw p.error;if(g.error)throw g.error;setProjects((p.data||[]) as Project[]);setGoals((g.data||[]) as Goal[]);}catch(e){setError(e instanceof Error?e.message:"Could not load projects");}},[]);
  useEffect(()=>{void load();},[load]);useRealtimeRefresh(["projects"],load,Boolean(workspaceId));
  async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!name.trim())return;const sb=supabaseBrowser();const{error:q}=await sb.from("projects").insert({workspace_id:workspaceId,created_by:userId,name:name.trim(),area,goal_id:goalId||null,deadline,owner:"Me",status:"Active",privacy:"family"});if(q)setError(q.message);else{setName("");await load();}}
  async function setStatus(id:string,status:string){const sb=supabaseBrowser();const{error:q}=await sb.from("projects").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">PROJECTS</p><h1 className="text-2xl font-bold">Execution layer</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-[.7fr_1.3fr]">
      <Panel title="Add project"><form onSubmit={add} className="space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><select value={area} onChange={e=>setArea(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Business","Money","Health","Family","Europe","Growth","Personal"].map(x=><option key={x}>{x}</option>)}</select><select value={goalId} onChange={e=>setGoalId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"><option value="">No linked goal</option>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save project</button></form></Panel>
      <Panel title="Projects"><div className="space-y-2">{projects.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><b>{p.name}</b><p className="text-xs text-slate-500">{p.area} · {p.status} · due {p.deadline||"—"} · {goals.find(g=>g.id===p.goal_id)?.name||"No goal"}</p></div><select value={p.status} onChange={e=>setStatus(p.id,e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-1 text-xs"><option>Active</option><option>Paused</option><option>Completed</option><option>Cancelled</option></select></div>)}</div></Panel>
    </div>}
  </main>;
}
