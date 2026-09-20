"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { PrivacyGate } from "@/components/privacy-gate";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Routine={id:string;kind:string;title:string;details:Record<string,any>;reminder_times:string[];days_of_week:number[];active:boolean;start_date:string|null;end_date:string|null};
type RoutineLog={id:string;routine_id:string;date:string;scheduled_time:string;status:string;value:number|null;unit:string|null;note:string|null;completed_at:string|null};
type WaterLog={id:string;date:string;amount_ml:number;created_at:string};
type Meal={id:string;meal_type:string;meal_time:string|null;title:string;details:string|null;calories:number|null;protein_g:number|null;days_of_week:number[];active:boolean};
type Sleep={id:string;date:string;bed_time:string|null;wake_time:string|null;duration_min:number|null;quality:number|null;note:string|null};

const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function dayIsoIndex(date=todayInTZ()){const d=new Date(date+"T12:00:00");return ((d.getDay()+6)%7)+1;}
function minutesBetween(bed:string,wake:string){if(!bed||!wake)return null;const[a,b]=bed.split(":").map(Number),[c,d]=wake.split(":").map(Number);let start=a*60+b,end=c*60+d;if(end<start)end+=1440;return end-start;}
function hours(min:number|null){return min==null?"—":(min/60).toFixed(1)+"h";}

function HealthPlannerContent(){
 const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");
 const[routines,setRoutines]=useState<Routine[]>([]);const[logs,setLogs]=useState<RoutineLog[]>([]);const[water,setWater]=useState<WaterLog[]>([]);const[meals,setMeals]=useState<Meal[]>([]);const[sleep,setSleep]=useState<Sleep[]>([]);
 const[error,setError]=useState("");const[msg,setMsg]=useState("");

 const[kind,setKind]=useState("water");const[title,setTitle]=useState("Drink water");const[times,setTimes]=useState("09:00, 11:00, 13:00, 15:00, 17:00, 19:00");const[details,setDetails]=useState("");
 const[mealType,setMealType]=useState("Breakfast");const[mealTime,setMealTime]=useState("08:00");const[mealTitle,setMealTitle]=useState("");const[mealDetails,setMealDetails]=useState("");const[mealCalories,setMealCalories]=useState<number|undefined>();const[mealProtein,setMealProtein]=useState<number|undefined>();
 const[bedTime,setBedTime]=useState("23:00");const[wakeTime,setWakeTime]=useState("07:00");const[sleepQuality,setSleepQuality]=useState(7);const[sleepNote,setSleepNote]=useState("");

 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const[r,l,w,m,s]=await Promise.all([
   sb.from("health_routines").select("id,kind,title,details,reminder_times,days_of_week,active,start_date,end_date").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:true}),
   sb.from("health_routine_logs").select("id,routine_id,date,scheduled_time,status,value,unit,note,completed_at").eq("workspace_id",ctx.workspaceId).gte("date",new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order("date",{ascending:false}),
   sb.from("water_logs").select("id,date,amount_ml,created_at").eq("workspace_id",ctx.workspaceId).gte("date",new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order("created_at",{ascending:false}),
   sb.from("diet_plan_items").select("id,meal_type,meal_time,title,details,calories,protein_g,days_of_week,active").eq("workspace_id",ctx.workspaceId).order("meal_time",{ascending:true,nullsFirst:false}),
   sb.from("sleep_sessions").select("id,date,bed_time,wake_time,duration_min,quality,note").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(60)
  ]);for(const q of[r,l,w,m,s])if(q.error)throw q.error;setRoutines((r.data||[]) as Routine[]);setLogs((l.data||[]) as RoutineLog[]);setWater((w.data||[]) as WaterLog[]);setMeals((m.data||[]) as Meal[]);setSleep((s.data||[]) as Sleep[]);
 }catch(e){setError(e instanceof Error?e.message:"Could not load health planner");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["health_routines","health_routine_logs","water_logs","diet_plan_items","sleep_sessions"],load,Boolean(workspaceId));

 async function addRoutine(e:FormEvent){e.preventDefault();if(!workspaceId||!userId||!title.trim())return;const reminderTimes=times.split(",").map(x=>x.trim()).filter(x=>/^\d{2}:\d{2}$/.test(x));let detailObj:Record<string,any>={note:details.trim()||null};if(kind==="water")detailObj={...detailObj,daily_goal_ml:2500,default_amount_ml:250};if(kind==="medicine")detailObj={...detailObj,dose:details.trim()||null};if(kind==="sleep")detailObj={...detailObj,target_hours:8};const sb=supabaseBrowser();const{error:q}=await sb.from("health_routines").insert({workspace_id:workspaceId,created_by:userId,kind,title:title.trim(),details:detailObj,reminder_times:reminderTimes,days_of_week:[1,2,3,4,5,6,7],active:true,start_date:todayInTZ()});if(q)setError(q.message);else{setMsg("Health routine saved.");await load();}}

 async function toggleRoutine(r:Routine){const sb=supabaseBrowser();const{error:q}=await sb.from("health_routines").update({active:!r.active,updated_at:new Date().toISOString()}).eq("id",r.id);if(q)setError(q.message);else await load();}
 async function removeRoutine(r:Routine){if(!confirm(`Delete routine "${r.title}"?`))return;const sb=supabaseBrowser();const{error:q}=await sb.from("health_routines").delete().eq("id",r.id);if(q)setError(q.message);else await load();}
 async function doneRoutine(r:Routine,time:string){const sb=supabaseBrowser();const{error:q}=await sb.from("health_routine_logs").upsert({routine_id:r.id,workspace_id:workspaceId,created_by:userId,date:todayInTZ(),scheduled_time:time,status:"done",completed_at:new Date().toISOString()},{onConflict:"routine_id,date,scheduled_time"});if(q)setError(q.message);else await load();}

 async function addWater(amount:number){const sb=supabaseBrowser();const{error:q}=await sb.from("water_logs").insert({workspace_id:workspaceId,created_by:userId,date:todayInTZ(),amount_ml:amount});if(q)setError(q.message);else await load();}
 async function addMeal(e:FormEvent){e.preventDefault();if(!mealTitle.trim())return;const sb=supabaseBrowser();const{error:q}=await sb.from("diet_plan_items").insert({workspace_id:workspaceId,created_by:userId,meal_type:mealType,meal_time:mealTime||null,title:mealTitle.trim(),details:mealDetails.trim()||null,calories:mealCalories??null,protein_g:mealProtein??null,days_of_week:[1,2,3,4,5,6,7],active:true});if(q)setError(q.message);else{setMealTitle("");setMealDetails("");setMealCalories(undefined);setMealProtein(undefined);await load();}}
 async function toggleMeal(m:Meal){const sb=supabaseBrowser();const{error:q}=await sb.from("diet_plan_items").update({active:!m.active,updated_at:new Date().toISOString()}).eq("id",m.id);if(q)setError(q.message);else await load();}
 async function removeMeal(m:Meal){if(!confirm(`Delete meal "${m.title}"?`))return;const sb=supabaseBrowser();const{error:q}=await sb.from("diet_plan_items").delete().eq("id",m.id);if(q)setError(q.message);else await load();}
 async function saveSleep(e:FormEvent){e.preventDefault();const duration=minutesBetween(bedTime,wakeTime);const sb=supabaseBrowser();const existing=sleep.find(s=>s.date===todayInTZ());const payload={workspace_id:workspaceId,created_by:userId,date:todayInTZ(),bed_time:bedTime,wake_time:wakeTime,duration_min:duration,quality:sleepQuality,note:sleepNote.trim()||null,updated_at:new Date().toISOString()};const q=existing?await sb.from("sleep_sessions").update(payload).eq("id",existing.id):await sb.from("sleep_sessions").insert(payload);if(q.error)setError(q.error.message);else{setMsg("Sleep saved.");await load();}}

 const today=todayInTZ(),dow=dayIsoIndex();
 const todayWater=water.filter(w=>w.date===today).reduce((a,w)=>a+Number(w.amount_ml||0),0);
 const waterRoutine=routines.find(r=>r.kind==="water"&&r.active);
 const waterGoal=Number(waterRoutine?.details?.daily_goal_ml||2500);
 const activeToday=routines.filter(r=>r.active&&(r.days_of_week||[]).includes(dow));
 const logKey=new Set(logs.filter(l=>l.date===today&&l.status==="done").map(l=>l.routine_id+"|"+l.scheduled_time));
 const todayMeals=meals.filter(m=>m.active&&(m.days_of_week||[]).includes(dow));
 const recentSleep=sleep.slice(0,7);const avgSleep=recentSleep.length?Math.round(recentSleep.reduce((a,s)=>a+Number(s.duration_min||0),0)/recentSleep.length):null;

 return <main className="page-root"><BackHome/><div className="section-heading"><div><span className="label">HEALTH PLANNER</span><h2>Water, medicine, diet and sleep</h2></div><div className="section-actions"><Link href="/health" className="ghost-btn">Health dashboard</Link><Link href="/notifications" className="ghost-btn">Notifications</Link></div></div>
 {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{msg&&<p className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{msg}</p>}
 {!workspaceId?<p className="panel p-5 text-sm">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:<>
 <div className="grid g4">
  <article className="metric-card accent-blue"><span>Water today</span><strong>{todayWater} ml</strong><small>{Math.min(100,Math.round(todayWater/waterGoal*100))}% of {waterGoal} ml</small></article>
  <article className="metric-card accent-green"><span>Active reminders</span><strong>{activeToday.length}</strong><small>water / medicine / sleep / meal</small></article>
  <article className="metric-card accent-amber"><span>Meals today</span><strong>{todayMeals.length}</strong><small>active diet-plan items</small></article>
  <article className="metric-card"><span>Avg sleep · 7 logs</span><strong>{hours(avgSleep)}</strong><small>latest quality {sleep[0]?.quality??"—"}/10</small></article>
 </div>

 <div className="grid g2 mt">
  <Panel title="Water tracker" kicker="QUICK LOG"><div className="progress"><i style={{width:`${Math.min(100,todayWater/waterGoal*100)}%`}}/></div><div className="progress-label"><span>{todayWater} ml</span><span>{waterGoal} ml goal</span></div><div className="quick-type-grid mt"><button onClick={()=>addWater(250)}><b>＋</b><span>250 ml</span></button><button onClick={()=>addWater(500)}><b>＋</b><span>500 ml</span></button><button onClick={()=>addWater(750)}><b>＋</b><span>750 ml</span></button></div><div className="mt list-stack">{water.filter(w=>w.date===today).slice(0,8).map(w=><div key={w.id} className="priority-item"><span className="priority-number">💧</span><div><strong>{w.amount_ml} ml</strong><small>{new Date(w.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div></div>)}</div></Panel>

  <Panel title="Medicine & health reminders" kicker="TODAY"><div className="list-stack">{activeToday.map(r=><div key={r.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><b>{r.title}</b><p className="text-xs text-slate-400">{r.kind}{r.details?.dose?" · "+r.details.dose:""}</p></div><div className="flex gap-1"><button onClick={()=>toggleRoutine(r)} className="mini-btn">{r.active?"On":"Off"}</button><button onClick={()=>removeRoutine(r)} className="mini-btn text-red-300">Delete</button></div></div><div className="mt-2 flex flex-wrap gap-2">{(r.reminder_times||[]).map(t=>{const done=logKey.has(r.id+"|"+t);return <button key={t} onClick={()=>!done&&doneRoutine(r,t)} className={done?"pill green":"mini-btn"}>{t} {done?"✓":"Done"}</button>})}</div></div>)}{!activeToday.length&&<div className="empty-state"><b>No active routines</b>Add water, medicine or sleep reminders below.</div>}</div></Panel>
 </div>

 <div className="grid g2 mt">
  <Panel title="Add routine" kicker="WATER / MEDICINE / SLEEP / MEAL"><form onSubmit={addRoutine} className="space-y-2"><select value={kind} onChange={e=>{const k=e.target.value;setKind(k);setTitle(k==="water"?"Drink water":k==="medicine"?"Medicine":k==="sleep"?"Sleep routine":k==="meal"?"Meal reminder":"Health reminder");}}><option value="water">Water</option><option value="medicine">Medicine</option><option value="sleep">Sleep</option><option value="meal">Meal</option><option value="other">Other</option></select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Routine title"/><input value={times} onChange={e=>setTimes(e.target.value)} placeholder="09:00, 13:00, 21:00"/><textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder={kind==="medicine"?"Dose / instructions":"Notes / target"}/><button className="primary-btn w-full">Save routine</button></form></Panel>

  <Panel title="Sleep tracker" kicker="BED → WAKE"><form onSubmit={saveSleep} className="grid gap-2 md:grid-cols-2"><label className="text-xs text-slate-400">Bed time<input type="time" value={bedTime} onChange={e=>setBedTime(e.target.value)}/></label><label className="text-xs text-slate-400">Wake time<input type="time" value={wakeTime} onChange={e=>setWakeTime(e.target.value)}/></label><label className="text-xs text-slate-400">Quality {sleepQuality}/10<input type="range" min="1" max="10" value={sleepQuality} onChange={e=>setSleepQuality(Number(e.target.value))}/></label><textarea value={sleepNote} onChange={e=>setSleepNote(e.target.value)} placeholder="Sleep notes"/><button className="primary-btn md:col-span-2">Save tonight</button></form><div className="mt list-stack">{sleep.slice(0,7).map(s=><div key={s.id} className="priority-item"><span className="priority-number">Z</span><div><strong>{s.date} · {hours(s.duration_min)}</strong><small>{s.bed_time||"—"} → {s.wake_time||"—"} · quality {s.quality??"—"}/10</small></div></div>)}</div></Panel>
 </div>

 <div className="grid g2 mt">
  <Panel title="Diet plan" kicker="MEAL PLAN"><form onSubmit={addMeal} className="grid gap-2 md:grid-cols-2"><select value={mealType} onChange={e=>setMealType(e.target.value)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>Other</option></select><input type="time" value={mealTime} onChange={e=>setMealTime(e.target.value)}/><input className="md:col-span-2" required value={mealTitle} onChange={e=>setMealTitle(e.target.value)} placeholder="Meal / food"/><textarea className="md:col-span-2" value={mealDetails} onChange={e=>setMealDetails(e.target.value)} placeholder="Portion / notes"/><input type="number" min="0" value={mealCalories??""} onChange={e=>setMealCalories(e.target.value?Number(e.target.value):undefined)} placeholder="Calories optional"/><input type="number" min="0" step=".1" value={mealProtein??""} onChange={e=>setMealProtein(e.target.value?Number(e.target.value):undefined)} placeholder="Protein g optional"/><button className="primary-btn md:col-span-2">Add meal</button></form></Panel>
  <Panel title="Today's meals" kicker={DAY_LABELS[dow-1]}><div className="list-stack">{todayMeals.map(m=><div key={m.id} className="priority-item"><span className="priority-number">🍽</span><div><strong>{m.meal_time||"—"} · {m.meal_type} · {m.title}</strong><small>{m.details||""}{m.calories!=null?` · ${m.calories} kcal`:""}{m.protein_g!=null?` · ${m.protein_g}g protein`:""}</small></div><div className="flex gap-1"><button onClick={()=>toggleMeal(m)} className="mini-btn">{m.active?"On":"Off"}</button><button onClick={()=>removeMeal(m)} className="mini-btn text-red-300">Delete</button></div></div>)}{!todayMeals.length&&<div className="empty-state"><b>No meal plan today</b>Add meals on the left.</div>}</div></Panel>
 </div>
 </>}
 </main>;
}

export default function HealthPlannerPage(){return <PrivacyGate><HealthPlannerContent/></PrivacyGate>;}
