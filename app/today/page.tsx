"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { loadOfflineCache, saveOfflineCache } from "@/lib/offline";
import { priorityScore, whyPriority, type TaskStatus } from "@/lib/priority";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

const SLOTS=["9:00","10:00","12:00","2:00","4:00","Evening"];
type TaskRow={id:string;name:string;area:string|null;status:TaskStatus;importance:number|null;deadline:string|null;financial_value:number|null;goal_id:string|null;blocked_by:string|null;created_at:string|null;estimate_min:number|null};

export default function TodayPage(){
 const[tasks,setTasks]=useState<TaskRow[]>([]);const[signedIn,setSignedIn]=useState<boolean|null>(null);const[error,setError]=useState("");const[offline,setOffline]=useState(false);
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){const cached=loadOfflineCache<TaskRow[]>("today");if(cached){setTasks(cached);setOffline(true);}else setSignedIn(false);return;}setSignedIn(true);const{data,error:q}=await sb.from("tasks").select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at,estimate_min").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(200);if(q)throw q;const rows=(data||[]) as TaskRow[];setTasks(rows);saveOfflineCache("today",rows);setOffline(false);}catch(e){const cached=loadOfflineCache<TaskRow[]>("today");if(cached){setTasks(cached);setOffline(true);}else setError(e instanceof Error?e.message:"Could not load today plan");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["tasks"],load,signedIn===true);
 const plan=useMemo(()=>tasks.filter(t=>t.status!=="Waiting"&&t.status!=="Blocked").map(task=>({task,score:priorityScore({status:task.status,deadline:task.deadline,importance:task.importance,value:task.financial_value,area:task.area,goalId:task.goal_id,blockedBy:task.blocked_by,createdAt:task.created_at})})).sort((a,b)=>b.score-a.score).slice(0,6),[tasks]);
 const recovery=useMemo(()=>tasks.filter(t=>t.status==="Waiting"||t.status==="Blocked"||Boolean(t.deadline&&t.deadline<new Date().toISOString().slice(0,10))).slice(0,6),[tasks]);
 async function complete(id:string){const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({status:"Completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}

 return <main className="page-root">
   <BackHome/>
   <div className="section-heading">
     <div><span className="label">DAILY PLANNER</span><h2>Your plan today</h2></div>
     <div className="section-actions">
       <Link href="/quick-add" className="ghost-btn">Quick Add</Link>
       <Link href="/reviews" className="primary-btn">Night Review</Link>
     </div>
   </div>

   {offline&&<p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Offline cached plan shown. Completion changes need a connection.</p>}
   {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
   {signedIn===false&&<p className="panel p-5 text-sm">Sign in to build your plan. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>}

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
       <strong style={{display:"block",fontSize:36,letterSpacing:1}}>45:00</strong>
       <Link href="/focus" className="primary-btn" style={{display:"inline-block",marginTop:9}}>Open Focus Mode</Link>
     </div>
   </article>

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
 </main>;
}
