"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Task={id:string;name:string;actual_min:number|null;status:string};
type Session={id:string;date:string;minutes:number;task_id:string|null;created_at:string};
const KEY="lifeos_focus_active_v1";

type Active={taskId:string;startedAt:number;pausedAt:number|null;pausedMs:number};

export default function FocusPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[tasks,setTasks]=useState<Task[]>([]);const[sessions,setSessions]=useState<Session[]>([]);
  const[taskId,setTaskId]=useState("");const[active,setActive]=useState<Active|null>(null);const[now,setNow]=useState(Date.now());const[error,setError]=useState("");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const[t,s]=await Promise.all([
    sb.from("tasks").select("id,name,actual_min,status").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').order("deadline",{ascending:true,nullsFirst:false}),
    sb.from("focus_sessions").select("id,date,minutes,task_id,created_at").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(50)
  ]);if(t.error)throw t.error;if(s.error)throw s.error;setTasks((t.data||[]) as Task[]);setSessions((s.data||[]) as Session[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load focus data");}},[]);
  useEffect(()=>{void load();const raw=localStorage.getItem(KEY);if(raw){try{setActive(JSON.parse(raw));}catch{}}},[load]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
  useEffect(()=>{if(active)localStorage.setItem(KEY,JSON.stringify(active));else localStorage.removeItem(KEY);},[active]);

  const elapsed=useMemo(()=>{if(!active)return 0;const end=active.pausedAt??now;return Math.max(0,end-active.startedAt-active.pausedMs);},[active,now]);
  const minutes=Math.floor(elapsed/60000);const seconds=Math.floor(elapsed/1000)%60;
  const todayMin=sessions.filter(s=>s.date===todayInTZ()).reduce((a,s)=>a+Number(s.minutes||0),0);

  function start(){if(!taskId)return;setActive({taskId,startedAt:Date.now(),pausedAt:null,pausedMs:0});}
  function pause(){if(!active)return;if(active.pausedAt)setActive({...active,pausedMs:active.pausedMs+(Date.now()-active.pausedAt),pausedAt:null});else setActive({...active,pausedAt:Date.now()});}
  async function finish(){if(!active||!workspaceId||!userId)return;const mins=Math.max(1,Math.round(elapsed/60000));const sb=supabaseBrowser();const task=tasks.find(t=>t.id===active.taskId);
    const{error:sErr}=await sb.from("focus_sessions").insert({workspace_id:workspaceId,created_by:userId,task_id:active.taskId,date:todayInTZ(),minutes:mins});if(sErr){setError(sErr.message);return;}
    if(task){const{error:tErr}=await sb.from("tasks").update({actual_min:Number(task.actual_min||0)+mins,status:task.status==="Inbox"?"Doing":task.status,updated_at:new Date().toISOString()}).eq("id",task.id);if(tErr)setError(tErr.message);}
    setActive(null);await load();
  }

  return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">FOCUS MODE</p><h1 className="text-2xl font-bold">One task. One timer.</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-2">
      <Panel title={active?"Focus session running":"Start focus"} kicker={`TODAY: ${todayMin} MIN`}>
        {!active?<><select value={taskId} onChange={e=>setTaskId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"><option value="">Select task</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button onClick={start} disabled={!taskId} className="mt-3 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">Start</button></>:<><div className="py-6 text-center"><p className="text-sm text-slate-400">{tasks.find(t=>t.id===active.taskId)?.name||"Focus"}</p><div className="mt-2 text-5xl font-black tabular-nums">{String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}</div></div><div className="grid grid-cols-2 gap-2"><button onClick={pause} className="rounded-lg border border-white/10 p-2">{active.pausedAt?"Resume":"Pause"}</button><button onClick={finish} className="rounded-lg bg-emerald-300/20 p-2 font-bold text-emerald-200">Complete</button></div></>}
      </Panel>
      <Panel title="Recent sessions">{sessions.length===0?<p className="text-sm text-slate-400">No focus sessions yet.</p>:<div className="space-y-2">{sessions.slice(0,12).map(s=><div key={s.id} className="rounded-lg border border-white/10 p-2 text-sm"><b>{tasks.find(t=>t.id===s.task_id)?.name||"Task"}</b><span className="float-right">{s.minutes} min</span><p className="text-xs text-slate-500">{s.date}</p></div>)}</div>}</Panel>
    </div>}
  </main>;
}
