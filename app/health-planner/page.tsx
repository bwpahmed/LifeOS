"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { PrivacyGate } from "@/components/privacy-gate";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";
import { activeForIsoDay,clampWaterGoal,parseReminderTimes,sleepMinutes,waterTotalForDate } from "@/lib/health-planner";

type Routine={id:string;kind:string;title:string;details:Record<string,any>;reminder_times:string[];days_of_week:number[];active:boolean;start_date:string|null;end_date:string|null};
type RoutineLog={id:string;routine_id:string;date:string;scheduled_time:string;status:string;value:number|null;unit:string|null;note:string|null;completed_at:string|null};
type WaterLog={id:string;date:string;amount_ml:number;created_at:string};
type Meal={id:string;meal_type:string;meal_time:string|null;title:string;details:string|null;calories:number|null;protein_g:number|null;days_of_week:number[];active:boolean};
type Sleep={id:string;date:string;bed_time:string|null;wake_time:string|null;duration_min:number|null;quality:number|null;note:string|null};

const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function dayIsoIndex(date=todayInTZ()){const d=new Date(date+"T12:00:00");return ((d.getDay()+6)%7)+1;}
function hours(min:number|null){return min==null?"—":(min/60).toFixed(1)+"h";}

function HealthPlannerContent(){
 const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");
 const[routines,setRoutines]=useState<Routine[]>([]);const[logs,setLogs]=useState<RoutineLog[]>([]);const[water,setWater]=useState<WaterLog[]>([]);const[meals,setMeals]=useState<Meal[]>([]);const[sleep,setSleep]=useState<Sleep[]>([]);
 const[error,setError]=useState("");const[msg,setMsg]=useState("");

 const[kind,setKind]=useState("water");const[title,setTitle]=useState("Drink water");const[times,setTimes]=useState("09:00, 11:00, 13:00, 15:00, 17:00, 19:00");const[details,setDetails]=useState("");const[routineDays,setRoutineDays]=useState<number[]>([1,2,3,4,5,6,7]);const[waterGoalInput,setWaterGoalInput]=useState(2500);
 const[mealType,setMealType]=useState("Breakfast");const[mealTime,setMealTime]=useState("08:00");const[mealTitle,setMealTitle]=useState("");const[mealDetails,setMealDetails]=useState("");const[mealCalories,setMealCalories]=useState<number|undefined>();const[mealProtein,setMealProtein]=useState<number|undefined>();const[mealDays,setMealDays]=useState<number[]>([1,2,3,4,5,6,7]);
 const[bedTime,setBedTime]=useState("23:00");const[wakeTime,setWakeTime]=useState("07:00");const[sleepQuality,setSleepQuality]=useState(7);const[sleepNote,setSleepNote]=useState("");

 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const[r,l,w,m,s]=await Promise.all([
   sb.from("health_routines").select("id,kind,title,details,reminder_times,days_of_week,active,start_date,end_date").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:true}),
   sb.from("health_routine_logs").select("id,routine_id,date,scheduled_time,status,value,unit,note,completed_at").eq("workspace_id",ctx.workspaceId).gte("date",new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order("date",{ascending:false}),
   sb.from("water_logs").select("id,date,amount_ml,created_at").eq("workspace_id",ctx.workspaceId).gte("date",new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order("created_at",{ascending:false}),
   sb.from("diet_plan_items").select("id,meal_type,meal_time,title,details,calories,protein_g,days_of_week,active").eq("workspace_id",ctx.workspaceId).order("meal_time",{ascending:true,nullsFirst:false}),
   sb.from("sleep_sessions").select("id,date,bed_time,wake_time,duration_min,quality,note").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(60)
  ]);for(const q of[r,l,w,m,s])if(q.error)throw q.error;const routineRows=(r.data||[]) as Routine[];setRoutines(routineRows);const wr=routineRows.find(x=>x.kind==="water"&&x.active)||routineRows.find(x=>x.kind==="water");if(wr?.details?.daily_goal_ml)setWaterGoalInput(Number(wr.details.daily_goal_ml));setLogs((l.data||[]) as RoutineLog[]);setWater((w.data||[]) as WaterLog[]);setMeals((m.data||[]) as Meal[]);setSleep((s.data||[]) as Sleep[]);
 }catch(e){setError(e instanceof Error?e.message:"Could not load health planner");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["health_routines","health_routine_logs","water_logs","diet_plan_items","sleep_sessions"],load,Boolean(workspaceId));
 function toggleDay(list:number[],setList:(next:number[])=>void,day:number){setList(list.includes(day)?list.filter(x=>x!==day):[...list,day].sort((a,b)=>a-b));}


 async function addRoutine(e:FormEvent){
  e.preventDefault();
  if(!workspaceId||!userId||!title.trim())return;
  setError("");
  if(!routineDays.length){setError("Select at least one reminder day.");return;}
  const parsedTimes=parseReminderTimes(times);
  if(parsedTimes.invalid.length){setError("Invalid reminder time: "+parsedTimes.invalid.join(", ")+". Use 24-hour HH:MM (00:00–23:59).");return;}
  const reminderTimes=parsedTimes.times;
  if(!reminderTimes.length){setError("Add at least one reminder time in HH:MM format.");return;}
  let detailObj:Record<string,any>={note:details.trim()||null};
  if(kind==="water")detailObj={...detailObj,daily_goal_ml:clampWaterGoal(waterGoalInput),default_amount_ml:250};
  if(kind==="medicine")detailObj={...detailObj,dose:details.trim()||null};
  if(kind==="sleep")detailObj={...detailObj,target_hours:8};
  const sb=supabaseBrowser();
  const{error:q}=await sb.from("health_routines").insert({
    workspace_id:workspaceId,created_by:userId,kind,title:title.trim(),details:detailObj,
    reminder_times:reminderTimes,days_of_week:routineDays,active:true,start_date:todayInTZ()
  });
  if(q)setError(q.message);else{setMsg("Health routine saved.");setDetails("");await load();}
 }

 async function toggleRoutine(r:Routine){const sb=supabaseBrowser();const{error:q}=await sb.from("health_routines").update({active:!r.active,updated_at:new Date().toISOString()}).eq("id",r.id);if(q)setError(q.message);else await load();}
 async function removeRoutine(r:Routine){if(!confirm(`Delete routine "${r.title}"?`))return;const sb=supabaseBrowser();const{error:q}=await sb.from("health_routines").delete().eq("id",r.id);if(q)setError(q.message);else await load();}
 async function doneRoutine(r:Routine,time:string){const sb=supabaseBrowser();const{error:q}=await sb.from("health_routine_logs").upsert({routine_id:r.id,workspace_id:workspaceId,created_by:userId,date:todayInTZ(),scheduled_time:time,status:"done",completed_at:new Date().toISOString()},{onConflict:"routine_id,date,scheduled_time"});if(q)setError(q.message);else await load();}

 async function addWater(amount:number){const sb=supabaseBrowser();const{error:q}=await sb.from("water_logs").insert({workspace_id:workspaceId,created_by:userId,date:todayInTZ(),amount_ml:amount});if(q)setError(q.message);else await load();}
 async function saveWaterGoal(){if(!workspaceId||!userId)return;const goal=clampWaterGoal(waterGoalInput);const sb=supabaseBrowser();const existing=routines.find(r=>r.kind==="water");if(existing){const{error:q}=await sb.from("health_routines").update({details:{...(existing.details||{}),daily_goal_ml:goal,default_amount_ml:Number(existing.details?.default_amount_ml||250)},updated_at:new Date().toISOString()}).eq("id",existing.id);if(q){setError(q.message);return;}}else{const{error:q}=await sb.from("health_routines").insert({workspace_id:workspaceId,created_by:userId,kind:"water",title:"Drink water",details:{daily_goal_ml:goal,default_amount_ml:250},reminder_times:["09:00","11:00","13:00","15:00","17:00","19:00"],days_of_week:[1,2,3,4,5,6,7],active:true,start_date:todayInTZ()});if(q){setError(q.message);return;}}setMsg("Water target saved.");await load();}
 async function ensureSleepReminder(){if(!workspaceId||!userId)return;const sb=supabaseBrowser();const existing=routines.find(r=>r.kind==="sleep");const payload={title:"Sleep reminder",details:{target_hours:8,note:"Bedtime reminder"},reminder_times:[bedTime],days_of_week:[1,2,3,4,5,6,7],active:true,start_date:todayInTZ(),updated_at:new Date().toISOString()};const q=existing?await sb.from("health_routines").update(payload).eq("id",existing.id):await sb.from("health_routines").insert({...payload,workspace_id:workspaceId,created_by:userId,kind:"sleep"});if(q.error)setError(q.error.message);else{setMsg("Sleep reminder saved.");await load();}}
 async function addMeal(e:FormEvent){
  e.preventDefault();
  if(!workspaceId||!userId||!mealTitle.trim())return;
  setError("");
  if(!mealDays.length){setError("Select at least one meal-plan day.");return;}
  if(!/^\d{2}:\d{2}$/.test(mealTime)){setError("Choose a meal time so LifeOS can remind you.");return;}
  const sb=supabaseBrowser();
  const mealId=crypto.randomUUID();
  const mealPayload={
    id:mealId,workspace_id:workspaceId,created_by:userId,meal_type:mealType,meal_time:mealTime,
    title:mealTitle.trim(),details:mealDetails.trim()||null,calories:mealCalories??null,
    protein_g:mealProtein??null,days_of_week:mealDays,active:true
  };
  const mealQ=await sb.from("diet_plan_items").insert(mealPayload);
  if(mealQ.error){setError(mealQ.error.message);return;}
  const routineQ=await sb.from("health_routines").insert({
    workspace_id:workspaceId,created_by:userId,kind:"meal",title:`${mealType}: ${mealTitle.trim()}`,
    details:{meal_id:mealId,meal_type:mealType,note:mealDetails.trim()||null},
    reminder_times:[mealTime],days_of_week:mealDays,active:true,start_date:todayInTZ()
  });
  if(routineQ.error){
    await sb.from("diet_plan_items").delete().eq("id",mealId);
    setError(routineQ.error.message);
    return;
  }
  setMealTitle("");setMealDetails("");setMealCalories(undefined);setMealProtein(undefined);
  setMsg("Meal plan and reminder saved.");
  await load();
 }
 async function toggleMeal(m:Meal){
  const sb=supabaseBrowser();const next=!m.active;
  const q=await sb.from("diet_plan_items").update({active:next,updated_at:new Date().toISOString()}).eq("id",m.id);
  if(q.error){setError(q.error.message);return;}
  const routine=await sb.from("health_routines").select("id").eq("workspace_id",workspaceId).eq("kind","meal").contains("details",{meal_id:m.id}).maybeSingle();
  if(routine.error){setError(routine.error.message);return;}
  if(routine.data?.id){const rq=await sb.from("health_routines").update({active:next,updated_at:new Date().toISOString()}).eq("id",routine.data.id);if(rq.error){setError(rq.error.message);return;}}
  await load();
 }
 async function removeMeal(m:Meal){
  if(!confirm(`Delete meal "${m.title}" and its reminder?`))return;
  const sb=supabaseBrowser();
  const routine=await sb.from("health_routines").select("id").eq("workspace_id",workspaceId).eq("kind","meal").contains("details",{meal_id:m.id});
  if(routine.error){setError(routine.error.message);return;}
  for(const row of routine.data||[]){const rq=await sb.from("health_routines").delete().eq("id",row.id);if(rq.error){setError(rq.error.message);return;}}
  const{error:q}=await sb.from("diet_plan_items").delete().eq("id",m.id);
  if(q)setError(q.message);else await load();
 }
 async function saveSleep(e:FormEvent){e.preventDefault();const duration=sleepMinutes(bedTime,wakeTime);const sb=supabaseBrowser();const existing=sleep.find(s=>s.date===todayInTZ());const payload={workspace_id:workspaceId,created_by:userId,date:todayInTZ(),bed_time:bedTime,wake_time:wakeTime,duration_min:duration,quality:sleepQuality,note:sleepNote.trim()||null,updated_at:new Date().toISOString()};const q=existing?await sb.from("sleep_sessions").update(payload).eq("id",existing.id):await sb.from("sleep_sessions").insert(payload);if(q.error)setError(q.error.message);else{setMsg("Sleep saved.");await load();}}

 const today=todayInTZ(),dow=dayIsoIndex();
 const todayWater=waterTotalForDate(water,today);
 const waterRoutine=routines.find(r=>r.kind==="water"&&r.active);
 const waterGoal=Number(waterRoutine?.details?.daily_goal_ml||2500);
 const activeToday=activeForIsoDay(routines,dow);
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
  <Panel title="Water tracker" kicker="QUICK LOG"><div className="flex items-end gap-2"><label className="text-xs text-slate-400">Daily target (ml)<input type="number" min="250" max="10000" step="250" value={waterGoalInput} onChange={e=>setWaterGoalInput(Number(e.target.value)||2500)}/></label><button onClick={saveWaterGoal} className="ghost-btn">Save target</button></div><div className="progress mt"><i style={{width:`${Math.min(100,todayWater/waterGoal*100)}%`}}/></div><div className="progress-label"><span>{todayWater} ml</span><span>{waterGoal} ml goal</span></div><div className="quick-type-grid mt"><button onClick={()=>addWater(250)}><b>＋</b><span>250 ml</span></button><button onClick={()=>addWater(500)}><b>＋</b><span>500 ml</span></button><button onClick={()=>addWater(750)}><b>＋</b><span>750 ml</span></button></div><div className="mt list-stack">{water.filter(w=>w.date===today).slice(0,8).map(w=><div key={w.id} className="priority-item"><span className="priority-number">💧</span><div><strong>{w.amount_ml} ml</strong><small>{new Date(w.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div></div>)}</div></Panel>

  <Panel title="Medicine & health reminders" kicker="TODAY"><div className="list-stack">{activeToday.map(r=><div key={r.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><b>{r.title}</b><p className="text-xs text-slate-400">{r.kind}{r.details?.dose?" · "+r.details.dose:""}</p></div><div className="flex gap-1"><button onClick={()=>toggleRoutine(r)} className="mini-btn">{r.active?"On":"Off"}</button><button onClick={()=>removeRoutine(r)} className="mini-btn text-red-300">Delete</button></div></div><div className="mt-2 flex flex-wrap gap-2">{(r.reminder_times||[]).map(t=>{const done=logKey.has(r.id+"|"+t);return <button key={t} onClick={()=>!done&&doneRoutine(r,t)} className={done?"pill green":"mini-btn"}>{t} {done?"✓":"Done"}</button>})}</div></div>)}{!activeToday.length&&<div className="empty-state"><b>No active routines</b>Add water, medicine or sleep reminders below.</div>}</div></Panel>
 </div>

 <div className="grid g2 mt">
  <Panel title="Add routine" kicker="WATER / MEDICINE / SLEEP / MEAL"><form onSubmit={addRoutine} className="space-y-2"><select value={kind} onChange={e=>{const k=e.target.value;setKind(k);setTitle(k==="water"?"Drink water":k==="medicine"?"Medicine":k==="sleep"?"Sleep routine":k==="meal"?"Meal reminder":"Health reminder");}}><option value="water">Water</option><option value="medicine">Medicine</option><option value="sleep">Sleep</option><option value="meal">Meal</option><option value="other">Other</option></select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Routine title"/><input value={times} onChange={e=>setTimes(e.target.value)} placeholder="09:00, 13:00, 21:00"/><textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder={kind==="medicine"?"Dose / instructions":"Notes / target"}/><div><span className="text-xs text-slate-400">Days</span><div className="day-picker">{DAY_LABELS.map((d,i)=><button type="button" key={d} onClick={()=>toggleDay(routineDays,setRoutineDays,i+1)} className={routineDays.includes(i+1)?"pill blue":"mini-btn"}>{d}</button>)}</div></div><button className="primary-btn w-full">Save routine</button></form></Panel>

  <Panel title="Sleep tracker" kicker="BED → WAKE"><form onSubmit={saveSleep} className="grid gap-2 md:grid-cols-2"><label className="text-xs text-slate-400">Bed time<input type="time" value={bedTime} onChange={e=>setBedTime(e.target.value)}/></label><label className="text-xs text-slate-400">Wake time<input type="time" value={wakeTime} onChange={e=>setWakeTime(e.target.value)}/></label><label className="text-xs text-slate-400">Quality {sleepQuality}/10<input type="range" min="1" max="10" value={sleepQuality} onChange={e=>setSleepQuality(Number(e.target.value))}/></label><textarea value={sleepNote} onChange={e=>setSleepNote(e.target.value)} placeholder="Sleep notes"/><button className="primary-btn">Save tonight</button><button type="button" onClick={ensureSleepReminder} className="ghost-btn">Set {bedTime} sleep reminder</button></form><div className="mt list-stack">{sleep.slice(0,7).map(s=><div key={s.id} className="priority-item"><span className="priority-number">Z</span><div><strong>{s.date} · {hours(s.duration_min)}</strong><small>{s.bed_time||"—"} → {s.wake_time||"—"} · quality {s.quality??"—"}/10</small></div></div>)}</div></Panel>
 </div>

 <div className="grid g2 mt">
  <Panel title="Diet plan" kicker="MEAL PLAN"><form onSubmit={addMeal} className="grid gap-2 md:grid-cols-2"><select value={mealType} onChange={e=>setMealType(e.target.value)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>Other</option></select><input type="time" value={mealTime} onChange={e=>setMealTime(e.target.value)}/><input className="md:col-span-2" required value={mealTitle} onChange={e=>setMealTitle(e.target.value)} placeholder="Meal / food"/><textarea className="md:col-span-2" value={mealDetails} onChange={e=>setMealDetails(e.target.value)} placeholder="Portion / notes"/><input type="number" min="0" value={mealCalories??""} onChange={e=>setMealCalories(e.target.value?Number(e.target.value):undefined)} placeholder="Calories optional"/><input type="number" min="0" step=".1" value={mealProtein??""} onChange={e=>setMealProtein(e.target.value?Number(e.target.value):undefined)} placeholder="Protein g optional"/><div className="md:col-span-2"><span className="text-xs text-slate-400">Days</span><div className="day-picker">{DAY_LABELS.map((d,i)=><button type="button" key={d} onClick={()=>toggleDay(mealDays,setMealDays,i+1)} className={mealDays.includes(i+1)?"pill green":"mini-btn"}>{d}</button>)}</div></div><button className="primary-btn md:col-span-2">Add meal</button></form></Panel>
  <Panel title="Today's meals" kicker={DAY_LABELS[dow-1]}><div className="list-stack">{todayMeals.map(m=><div key={m.id} className="priority-item"><span className="priority-number">🍽</span><div><strong>{m.meal_time||"—"} · {m.meal_type} · {m.title}</strong><small>{m.details||""}{m.calories!=null?` · ${m.calories} kcal`:""}{m.protein_g!=null?` · ${m.protein_g}g protein`:""}</small></div><div className="flex gap-1"><button onClick={()=>toggleMeal(m)} className="mini-btn">{m.active?"On":"Off"}</button><button onClick={()=>removeMeal(m)} className="mini-btn text-red-300">Delete</button></div></div>)}{!todayMeals.length&&<div className="empty-state"><b>No meal plan today</b>Add meals on the left.</div>}</div></Panel>
 </div>
 </>}
 </main>;
}

export default function HealthPlannerPage(){return <PrivacyGate><HealthPlannerContent/></PrivacyGate>;}
