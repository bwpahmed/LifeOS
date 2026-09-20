"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Manual={id:string;date:string;category:string;minutes:number;task_id:string|null;note:string|null;source:string;created_at:string};
type Session={id:string;date:string;minutes:number;task_id:string|null;created_at:string};
type Task={id:string;name:string;area:string|null};
const CATS=["Work","Family","Health","Growth","Social media","Admin","Other"];
function addDays(iso:string,n:number){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function hm(min:number){return Math.floor(min/60)+"h "+(min%60)+"m";}

export default function TimePage(){
 const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[manual,setManual]=useState<Manual[]>([]);const[sessions,setSessions]=useState<Session[]>([]);const[tasks,setTasks]=useState<Task[]>([]);const[error,setError]=useState("");
 const[date,setDate]=useState(todayInTZ());const[category,setCategory]=useState("Work");const[minutes,setMinutes]=useState(30);const[taskId,setTaskId]=useState("");const[note,setNote]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const from=addDays(todayInTZ(),-90);const[m,s,t]=await Promise.all([
  sb.from("time_entries").select("id,date,category,minutes,task_id,note,source,created_at").eq("workspace_id",ctx.workspaceId).gte("date",from).order("date",{ascending:false}),
  sb.from("focus_sessions").select("id,date,minutes,task_id,created_at").eq("workspace_id",ctx.workspaceId).gte("date",from).order("date",{ascending:false}),
  sb.from("tasks").select("id,name,area").eq("workspace_id",ctx.workspaceId).limit(500)
 ]);for(const q of[m,s,t])if(q.error)throw q.error;setManual((m.data||[]) as Manual[]);setSessions((s.data||[]) as Session[]);setTasks((t.data||[]) as Task[]);}catch(e){setError(e instanceof Error?e.message:"Could not load time tracking");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["time_entries","focus_sessions"],load,Boolean(workspaceId));
 async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!userId||minutes<=0)return;const sb=supabaseBrowser();const q=await sb.from("time_entries").insert({workspace_id:workspaceId,created_by:userId,date,category,minutes,task_id:taskId||null,note:note.trim()||null,source:"manual"});if(q.error)setError(q.error.message);else{setMinutes(30);setTaskId("");setNote("");await load();}}
 async function remove(id:string){if(!confirm("Delete this manual time entry?"))return;const sb=supabaseBrowser();const q=await sb.from("time_entries").delete().eq("id",id);if(q.error)setError(q.error.message);else await load();}
 const taskMap=useMemo(()=>new Map(tasks.map(t=>[t.id,t])),[tasks]);
 const weekFrom=addDays(todayInTZ(),-6);
 const totals=useMemo(()=>{const out=new Map<string,number>(CATS.map(c=>[c,0]));for(const x of manual.filter(x=>x.date>=weekFrom))out.set(x.category,(out.get(x.category)||0)+Number(x.minutes));for(const s of sessions.filter(x=>x.date>=weekFrom)){const area=taskMap.get(s.task_id||"")?.area||"Work";const cat=area==="Family"?"Family":area==="Health"||area==="Self-control"?"Health":area==="Growth"?"Growth":"Work";out.set(cat,(out.get(cat)||0)+Number(s.minutes));}return out;},[manual,sessions,weekFrom,taskMap]);
 const weekTotal=Array.from(totals.values()).reduce((a,b)=>a+b,0);
 return <main className="page-root"><BackHome/><div className="section-heading"><div><span className="label">TIME TRACKING</span><h2>Where your week actually went</h2></div><Link href="/focus" className="primary-btn">Focus timer</Link></div>{error&&<p className="mb-4 text-sm text-red-300">{error}</p>}
 {!workspaceId?<p className="panel p-5 text-sm">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:<>
  <div className="grid g4">{CATS.slice(0,4).map(cat=><article key={cat} className="metric-card"><span>{cat}</span><strong>{hm(totals.get(cat)||0)}</strong><small>last 7 days</small></article>)}</div>
  <div className="grid g2 mt"><Panel title="Manual time" kicker="FOCUS TIMER IS AUTOMATIC"><form onSubmit={add} className="grid gap-2 md:grid-cols-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={category} onChange={e=>setCategory(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select><input type="number" min="1" max="1440" value={minutes} onChange={e=>setMinutes(Number(e.target.value)||1)} placeholder="Minutes"/><select value={taskId} onChange={e=>setTaskId(e.target.value)}><option value="">No linked task</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you spend the time on?" className="md:col-span-2"/><button className="primary-btn md:col-span-2">Add time</button></form></Panel>
  <Panel title="7-day breakdown" kicker={"TOTAL "+hm(weekTotal)}><div className="list-stack">{CATS.map(cat=>{const v=totals.get(cat)||0;return <div key={cat}><div className="progress-label"><span>{cat}</span><b>{hm(v)}</b></div><div className="progress"><i style={{width:(weekTotal?Math.round(v/weekTotal*100):0)+"%"}}/></div></div>})}</div></Panel></div>
  <Panel title="Recent entries" kicker="MANUAL + FOCUS"><div className="list-stack">{manual.slice(0,30).map(x=><div key={x.id} className="priority-item"><span className="priority-number">T</span><div><strong>{x.category} · {hm(x.minutes)}</strong><small>{x.date}{x.task_id?" · "+(taskMap.get(x.task_id)?.name||"Task"):""}{x.note?" · "+x.note:""}</small></div><button onClick={()=>remove(x.id)} className="mini-btn text-red-300">Delete</button></div>)}{sessions.slice(0,20).map(x=><div key={"f-"+x.id} className="priority-item"><span className="priority-number">F</span><div><strong>Focus · {hm(x.minutes)}</strong><small>{x.date} · {taskMap.get(x.task_id||"")?.name||"Task"}</small></div><span className="pill blue">Automatic</span></div>)}</div></Panel>
 </>}</main>;
}
