"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { habitConsistency, currentStreak } from "@/lib/habits";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Habit={id:string;name:string;area:string|null;frequency:string;target:number|null;unit:string|null;kind:string|null};
type Log={habit_id:string;date:string;value:number};

function lastDays(n:number){
  const today=todayInTZ();
  return Array.from({length:n},(_,i)=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-(n-1-i));return d.toISOString().slice(0,10);});
}

export default function HabitsPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");
  const[habits,setHabits]=useState<Habit[]>([]);const[logs,setLogs]=useState<Log[]>([]);
  const[name,setName]=useState("");const[area,setArea]=useState("Health");const[frequency,setFrequency]=useState("Daily");const[kind,setKind]=useState("build");const[error,setError]=useState("");
  const days=useMemo(()=>lastDays(30),[]);

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);
    const[h,l]=await Promise.all([
      sb.from("habits").select("id,name,area,frequency,target,unit,kind").eq("workspace_id",ctx.workspaceId).order("created_at"),
      sb.from("habit_logs").select("habit_id,date,value").gte("date",days[0]).lte("date",days[days.length-1])
    ]);
    if(h.error)throw h.error;if(l.error)throw l.error;setHabits((h.data||[]) as Habit[]);setLogs((l.data||[]) as Log[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load habits");}},[days]);
  useEffect(()=>{void load();},[load]);

  async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!name.trim())return;const sb=supabaseBrowser();const{error:q}=await sb.from("habits").insert({workspace_id:workspaceId,created_by:userId,name:name.trim(),area,frequency,target:1,unit:"done",kind,privacy:area==="Health"||area==="Self-control"?"private":"family"});if(q)setError(q.message);else{setName("");await load();}}
  async function toggle(h:Habit){const date=todayInTZ();const existing=logs.find(x=>x.habit_id===h.id&&x.date===date);const sb=supabaseBrowser();
    if(existing){const{error:q}=await sb.from("habit_logs").delete().eq("habit_id",h.id).eq("date",date);if(q)setError(q.message);}
    else{const{error:q}=await sb.from("habit_logs").upsert({habit_id:h.id,date,value:1},{onConflict:"habit_id,date"});if(q)setError(q.message);}
    await load();
  }

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">HABITS</p><h1 className="text-2xl font-bold">Consistency, not punishment</h1>
    {error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:
    <div className="mt-4 grid gap-4 md:grid-cols-[.7fr_1.3fr]">
      <Panel title="Add habit"><form onSubmit={add} className="space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Habit" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
        <div className="grid grid-cols-2 gap-2"><select value={area} onChange={e=>setArea(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Health","Business","Family","Growth","Europe","Personal","Self-control"].map(x=><option key={x}>{x}</option>)}</select><select value={frequency} onChange={e=>setFrequency(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Daily","Weekly","Specific days","X times per week","Monthly"].map(x=><option key={x}>{x}</option>)}</select></div>
        <select value={kind} onChange={e=>setKind(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"><option value="build">Build habit</option><option value="reduce">Reduce habit</option><option value="avoid">Avoid habit</option><option value="replace">Replace habit</option></select>
        <button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save habit</button></form></Panel>
      <Panel title="Today & 30-day consistency">{habits.length===0?<p className="text-sm text-slate-400">No habits yet.</p>:<div className="space-y-2">{habits.map(h=>{const map:Record<string,number>={};logs.filter(x=>x.habit_id===h.id).forEach(x=>map[x.date]=Number(x.value));const done=Boolean(map[todayInTZ()]);return <div key={h.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><b>{h.name}</b><p className="text-xs text-slate-500">{h.area} · {h.frequency} · {habitConsistency(map,days)}% consistency · {currentStreak(map,todayInTZ())} day streak</p></div><button onClick={()=>toggle(h)} className={`rounded-lg px-3 py-1 text-xs font-bold ${done?"bg-emerald-300/20 text-emerald-200":"border border-white/10"}`}>{done?"Done ✓":"Mark done"}</button></div><div className="mt-2 flex gap-1 overflow-hidden">{days.slice(-14).map(d=><span key={d} title={d} className={`h-3 flex-1 rounded-sm ${map[d]?"bg-emerald-300/60":"bg-white/10"}`}/>)}</div></div>})}</div>}</Panel>
    </div>}
  </main>;
}
