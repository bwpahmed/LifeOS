"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { loadOfflineCache, saveOfflineCache } from "@/lib/offline";
import { priorityScore, whyPriority, type TaskStatus } from "@/lib/priority";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

const SLOTS=["9:00","10:00","12:00","2:00","4:00","Evening"];
type TaskRow={id:string;name:string;area:string|null;status:TaskStatus;importance:number|null;deadline:string|null;financial_value:number|null;goal_id:string|null;blocked_by:string|null;created_at:string|null;estimate_min:number|null};
type Checkin={sleep_hours:number|null;energy:number|null;mood:number|null;sleep_quality:number|null;main_goal:string|null};

export default function TodayPage(){
 const[tasks,setTasks]=useState<TaskRow[]>([]);const[checkin,setCheckin]=useState<Checkin|null>(null);const[signedIn,setSignedIn]=useState<boolean|null>(null);const[error,setError]=useState("");const[msg,setMsg]=useState("");const[offline,setOffline]=useState(false);const[aiPlan,setAiPlan]=useState("");const[aiLabel,setAiLabel]=useState("");const[aiLoading,setAiLoading]=useState(false);
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){const cached=loadOfflineCache<TaskRow[]>("today");if(cached){setTasks(cached);setOffline(true);}else setSignedIn(false);return;}setSignedIn(true);const[tq,cq]=await Promise.all([sb.from("tasks").select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at,estimate_min").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(200),sb.from("morning_checkins").select("sleep_hours,energy,mood,sleep_quality,main_goal").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",todayInTZ()).maybeSingle()]);if(tq.error)throw tq.error;if(cq.error)throw cq.error;const rows=(tq.data||[]) as TaskRow[];setTasks(rows);setCheckin((cq.data||null) as Checkin|null);saveOfflineCache("today",rows);setOffline(false);}catch(e){const cached=loadOfflineCache<TaskRow[]>("today");if(cached){setTasks(cached);setOffline(true);}else setError(e instanceof Error?e.message:"Could not load today plan");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["tasks","morning_checkins"],load,signedIn===true);
 const plan=useMemo(()=>{const main=(checkin?.main_goal||"").toLowerCase().trim();const limit=Number(checkin?.energy||7)<=4?4:6;return tasks.filter(t=>t.status!=="Waiting"&&t.status!=="Blocked").map(task=>{const base=priorityScore({status:task.status,deadline:task.deadline,importance:task.importance,value:task.financial_value,area:task.area,goalId:task.goal_id,blockedBy:task.blocked_by,createdAt:task.created_at});const boost=main&&task.name.toLowerCase().includes(main)?15:0;return{task,score:Math.min(100,base+boost)};}).sort((a,b)=>b.score-a.score).slice(0,limit);},[tasks,checkin]);
 const recovery=useMemo(()=>tasks.filter(t=>t.status==="Waiting"||t.status==="Blocked"||Boolean(t.deadline&&t.deadline<new Date().toISOString().slice(0,10))).slice(0,6),[tasks]);
 async function complete(id:string){const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({status:"Completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}
 async function morningCheckIn(){
  const sleepRaw=prompt("Sleep hours",String(checkin?.sleep_hours??7));if(sleepRaw==null)return;const sleepHours=Math.max(0,Math.min(16,Number(sleepRaw)));if(!Number.isFinite(sleepHours))return;
  const energyRaw=prompt("Morning energy 1–10",String(checkin?.energy??7));if(energyRaw==null)return;const energy=Math.max(1,Math.min(10,Number(energyRaw)));if(!Number.isFinite(energy))return;
  const moodRaw=prompt("Mood 1–10",String(checkin?.mood??7));if(moodRaw==null)return;const mood=Math.max(1,Math.min(10,Number(moodRaw)));if(!Number.isFinite(mood))return;
  const qualityRaw=prompt("Sleep quality 1–10",String(checkin?.sleep_quality??7));if(qualityRaw==null)return;const sleepQuality=Math.max(1,Math.min(10,Number(qualityRaw)));if(!Number.isFinite(sleepQuality))return;
  const mainGoal=prompt("Main goal today",checkin?.main_goal||tasks[0]?.name||"")||"";
  try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)throw new Error("Sign in first.");const date=todayInTZ();const check=await sb.from("morning_checkins").upsert({workspace_id:ctx.workspaceId,created_by:ctx.user.id,date,sleep_hours:sleepHours,energy,mood,sleep_quality:sleepQuality,main_goal:mainGoal.trim()||null,updated_at:new Date().toISOString()},{onConflict:"workspace_id,created_by,date"});if(check.error)throw check.error;const existing=await sb.from("health_entries").select("id").eq("workspace_id",ctx.workspaceId).eq("date",date).maybeSingle();const h=existing.data?await sb.from("health_entries").update({sleep:sleepHours,energy,mood}).eq("id",existing.data.id):await sb.from("health_entries").insert({workspace_id:ctx.workspaceId,created_by:ctx.user.id,date,sleep:sleepHours,energy,mood,privacy:"private"});if(h.error)throw h.error;setMsg("Morning check-in saved. Today plan adjusted to your energy and main goal.");await load();}catch(e){setError(e instanceof Error?e.message:"Could not save check-in");}
 }
 async function rebuildPlan(){await load();setMsg("Plan rebuilt from current priorities.");}
 async function buildAiPlan(){setAiLoading(true);setError("");try{const r=await fetch("/api/ai/daily-plan",{method:"POST"});const j=await r.json();if(!r.ok)throw new Error(j.error||"AI planner failed");setAiPlan(j.answer||"");setAiLabel(j.label||"");}catch(e){setError(e instanceof Error?e.message:"AI planner failed");}finally{setAiLoading(false);}}

 return <main className="page-root">
   <BackHome/>
   <div className="section-heading">
     <div><span className="label">DAILY PLANNER</span><h2>Your plan today</h2></div>
     <div className="section-actions">
       <button onClick={morningCheckIn} className="ghost-btn">Morning check-in</button>
       <button onClick={rebuildPlan} className="ghost-btn">Rebuild plan</button>
       <button onClick={buildAiPlan} disabled={aiLoading} className="ghost-btn">{aiLoading?"Planning…":"AI plan"}</button>
       <Link href="/reviews" className="primary-btn">Night Review</Link>
     </div>
   </div>

   {msg&&<p className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{msg}</p>}
   {offline&&<p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Offline cached plan shown. Completion changes need a connection.</p>}
   {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
   {signedIn===false&&<p className="panel p-5 text-sm">Sign in to build your plan. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>}

   {aiPlan&&<div className="panel mb-4 p-4"><span className="label">{aiLabel}</span><p className="mt-2 whitespace-pre-wrap text-sm">{aiPlan}</p><small>Suggestion only. Nothing was moved, completed or saved by AI.</small></div>}
   {checkin&&<div className="panel mb-4 p-3 text-sm"><b>Morning check-in</b><span className="ml-3 text-slate-400">Sleep {checkin.sleep_hours??"—"}h · Energy {checkin.energy??"—"}/10 · Quality {checkin.sleep_quality??"—"}/10{checkin.main_goal?" · Main goal: "+checkin.main_goal:""}</span></div>}
   <div className="timeline">
     {plan.length?plan.map(({task,score},i)=><div key={task.id} className="timeline-item">
       <span className="timeline-time">{SLOTS[i]}</span>
       <span className="timeline-dot"/>
       <div>
         <strong>{task.name}</strong>
         <small>{task.estimate_min||30} min · {task.area||"Personal"} · {whyPriority({status:task.status,deadline:task.deadline,importance:task.importance,value:task.financial_value,area:task.area,goalId:task.goal_id,blockedBy:task.blocked_by,createdAt:task.created_at}).slice(0,2).join(" · ")||"Priority engine"}</small>
       </div>
       <span className={`pill ${i===0?"red":"blue"}`}>{score>=85?"Critical":`${score}/100`}</span>
     </div>):<div className="empty-state"><b>No plan needed</b>Add tasks and LifeOS will build the day.</div>}
   </div>

   <article className="panel focus-panel mt">
     <div>
       <span className="label">FOCUS MODE</span>
       <h3 style={{fontSize:22,margin:"7px 0"}}>{plan[0]?.task.name||"Choose your next task"}</h3>
       <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,maxWidth:650}}>One task, one timer. Focus sessions persist across refreshes and completed sessions are saved to Supabase.</p>
     </div>
     <div style={{textAlign:"center",minWidth:200}}>
       <strong style={{display:"block",fontSize:30,letterSpacing:.5}}>45 min</strong>
       <Link href="/focus" className="primary-btn" style={{display:"inline-block",marginTop:9}}>Open Focus Mode</Link>
     </div>
   </article>

   <div className="grid g2 mt">
     <Panel title="Quick status" kicker="TODAY">
       <div className="list-stack">
         <Link href="/habits" className="priority-item"><span className="priority-number">↻</span><div><strong>Habits</strong><small>Open today’s habit checklist and recovery tracking.</small></div><span className="pill green">Open</span></Link>
         <Link href="/quick-add" className="priority-item"><span className="priority-number">＋</span><div><strong>Quick Add</strong><small>Capture task, habit, payment, note, health or family item.</small></div><span className="pill blue">Capture</span></Link>
       </div>
     </Panel>
     <Panel title="Missed / overdue" kicker="RECOVERY">
       <div className="list-stack">
         {recovery.length?recovery.map(task=><Link href="/tasks" key={task.id} className="priority-item">
           <span className="priority-number">!</span>
           <div><strong>{task.name}</strong><small>{task.status} · {task.deadline||"No deadline"}</small></div>
           <span className="pill amber">Review</span>
         </Link>):<div className="empty-state"><b>No recovery items</b>Nothing is waiting, blocked or overdue.</div>}
       </div>
     </Panel>
   </div>

   <div className="grid g2 mt">
     <Panel title="Must Win Today" kicker="TOP 3">
       <div className="priority-list">
         {plan.slice(0,3).map(({task,score},i)=><div key={task.id} className="priority-item">
           <span className="priority-number">{i+1}</span>
           <div><strong>{task.name}</strong><small>{task.deadline||"No deadline"} · {task.area||"Personal"}</small></div>
           <button disabled={offline} onClick={()=>complete(task.id)} className="mini-btn">{offline?"Offline":"Done"}</button>
         </div>)}
       </div>
     </Panel>
     <Panel title="Plan tools" kicker="CONTROL">
       <div className="list-stack">
         <button onClick={rebuildPlan} className="priority-item text-left"><span className="priority-number">↻</span><div><strong>Rebuild plan</strong><small>Recalculate from live task priorities.</small></div><span className="pill blue">Now</span></button>
         <Link href="/reviews" className="priority-item"><span className="priority-number">↗</span><div><strong>Night review</strong><small>Close the day and record what changed.</small></div><span className="pill green">Open</span></Link>
       </div>
     </Panel>
   </div>
 </main>;
}
