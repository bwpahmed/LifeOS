"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabaseBrowser} from "@/lib/supabase/client";
import {currentWorkspace} from "@/lib/supabase/workspace";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {habitDueOn,logDone,type PlannerHabit,type PlannerLog} from "@/lib/habit-planner";
import {clampWaterGoal,waterTotalForDate} from "@/lib/health-planner";
import {FOOD_CATALOG,FOOD_REFERENCE_VERSION,estimateFood,getFood,totalsForFoodLogs,type FoodIntakeRecord} from "@/lib/nutrition";
import {isRoutineTaken,ownCareRoutines,validWaterAmount,type QuickRoutine,type QuickRoutineLog} from "@/lib/home-health-quick";
import "./home-health-quick-log.css";

type WaterEntry={id:string;amount_ml:number;date:string;created_at:string};
function isoShift(day:string,n:number){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function weekday(day:string){return ((new Date(day+"T12:00:00Z").getUTCDay()+6)%7)+1;}
const STARTER_FOODS=["egg-boiled","chicken-roasted","chicken-raw","milk","paneer","chana-cooked","lentils-boiled"];

export function HomeHealthQuickLog({day}:{day:string}){
 const[workspace,setWorkspace]=useState("");
 const[owner,setOwner]=useState("");
 const[loaded,setLoaded]=useState(false);
 const[water,setWater]=useState<WaterEntry[]>([]);
 const[routines,setRoutines]=useState<QuickRoutine[]>([]);
 const[routineLogs,setRoutineLogs]=useState<QuickRoutineLog[]>([]);
 const[habitRows,setHabitRows]=useState<PlannerHabit[]>([]);
 const[habitLogs,setHabitLogs]=useState<PlannerLog[]>([]);
 const[foodLogs,setFoodLogs]=useState<FoodIntakeRecord[]>([]);
 const[foodAvailable,setFoodAvailable]=useState(true);
 const[waterGoal,setWaterGoal]=useState(2500);
 const[customWater,setCustomWater]=useState("300");
 const[foodKey,setFoodKey]=useState("egg-boiled");
 const[foodQty,setFoodQty]=useState("2");
 const[foodUnit,setFoodUnit]=useState<"pieces"|"g">("pieces");
 const[busy,setBusy]=useState("");
 const[error,setError]=useState("");
 const[notice,setNotice]=useState("");
 const[showMoreHabits,setShowMoreHabits]=useState(false);
 const load=useCallback(async()=>{
  try{
   const sb=supabaseBrowser(),ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspace("");setLoaded(true);return;}
   const monthStart=day.slice(0,7)+"-01";
   const [w,r,rl,h,hl,fl]=await Promise.all([
    sb.from("water_logs").select("id,amount_ml,date,created_at")
      .eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",day)
      .order("created_at",{ascending:false}).limit(200),
    sb.from("health_routines").select("id,title,kind,active,created_by,days_of_week,reminder_times,start_date,end_date,details")
      .eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("active",true).in("kind",["medicine","other","water"]),
    sb.from("health_routine_logs").select("routine_id,date,scheduled_time,status")
      .eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",day),
    sb.from("habits").select("id,name,area,frequency,target,kind,unit").eq("workspace_id",ctx.workspaceId).order("created_at").limit(250),
    sb.from("habit_logs").select("habit_id,date,value").gte("date",isoShift(monthStart,-7)).lte("date",day).limit(3000),
    sb.from("food_intake_logs").select("id,date,food_key,food_name,quantity_g,estimated_nutrients,meal_type,created_at")
      .eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",day)
      .order("created_at",{ascending:false}).limit(200)
   ]);
   for(const q of [w,r,rl,h,hl])if(q.error)throw q.error;
   const ownR=(r.data||[]) as QuickRoutine[];
   setWater((w.data||[]) as WaterEntry[]);
   setRoutines(ownR);
   setRoutineLogs((rl.data||[]) as QuickRoutineLog[]);
   setHabitRows((h.data||[]) as PlannerHabit[]);
   setHabitLogs((hl.data||[]) as PlannerLog[]);
   const goal=ownR.find(x=>x.kind==="water"&&x.created_by===ctx.user.id)?.details?.daily_goal_ml;
   setWaterGoal(goal==null?2500:clampWaterGoal(Number(goal)));
   // Nutrition migration might not be installed in the connected project yet:
   // keep existing medicine/water/hair/habit controls usable.
   setFoodAvailable(!fl.error);
   setFoodLogs(fl.error?[]:(fl.data||[]) as FoodIntakeRecord[]);
   setWorkspace(ctx.workspaceId);setOwner(ctx.user.id);setLoaded(true);setError("");
  }catch(e){setLoaded(true);setError(e instanceof Error?e.message:"Could not load quick health actions.");}
 },[day]);
 useEffect(()=>{void load();},[load]);
 useRealtimeRefresh(["water_logs","health_routines","health_routine_logs","habits","habit_logs","food_intake_logs"],load,Boolean(workspace));

 const waterMl=waterTotalForDate(water,day);
 const medicine=useMemo(()=>ownCareRoutines(routines,owner,day,"medicine"),[routines,owner,day]);
 const care=useMemo(()=>ownCareRoutines(routines,owner,day,"hair"),[routines,owner,day]);
 const dueHabits=useMemo(()=>habitRows.filter(h=>habitDueOn(h,habitLogs,day)),[habitRows,habitLogs,day]);
 const completedHabits=dueHabits.filter(h=>logDone(habitLogs,h.id,day)).length;
 const foodTotal=totalsForFoodLogs(foodLogs);
 const selectedFood=getFood(foodKey);
 const foodGrams=Number(foodQty)*(foodUnit==="pieces"&&selectedFood?.servingGrams?selectedFood.servingGrams:1);
 const foodProtein=selectedFood&&foodGrams>0&&foodGrams<=5000?estimateFood(selectedFood,foodGrams).protein_g:null;
 const medicineSlots=medicine.flatMap(r=>r.reminder_times.filter(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)).map(time=>({routine:r,time})));
 const medicinesTaken=medicineSlots.filter(x=>isRoutineTaken(routineLogs,x.routine.id,day,x.time)).length;
 const hairDone=care.filter(r=>isRoutineTaken(routineLogs,r.id,day,"")).length;
 const visibleHabits=showMoreHabits?dueHabits:dueHabits.slice(0,4);

 async function act(id:string,job:()=>Promise<void>,success:string){
  if(busy)return;setBusy(id);setError("");setNotice("");
  try{await job();await load();setNotice(success);}
  catch(e){setError(e instanceof Error?e.message:"Could not save. No completion was recorded.");}
  finally{setBusy("");}
 }
 function addWater(ml:number){
  if(!validWaterAmount(ml)){setError("Choose a whole-number amount from 1–5000 ml.");return;}
  void act("water",async()=>{
   const sb=supabaseBrowser();
   const {error:q}=await sb.from("water_logs").insert({workspace_id:workspace,created_by:owner,date:day,amount_ml:ml});
   if(q)throw q;
  },ml+" ml saved to Water Tracker.");
 }
 function logMedicine(r:QuickRoutine,time:string){
  const taken=isRoutineTaken(routineLogs,r.id,day,time);
  // Undo is explicit and confirmed; a scheduled dose is NOT automatically marked taken.
  if(taken&&!confirm("Undo this recorded medicine intake?"))return;
  void act(r.id+"|"+time,async()=>{
   const sb=supabaseBrowser();
   const result=taken?
    await sb.from("health_routine_logs").delete().eq("workspace_id",workspace).eq("created_by",owner).eq("routine_id",r.id).eq("date",day).eq("scheduled_time",time):
    await sb.from("health_routine_logs").upsert({routine_id:r.id,workspace_id:workspace,created_by:owner,date:day,scheduled_time:time,status:"done",completed_at:new Date().toISOString()},{onConflict:"routine_id,date,scheduled_time"});
   if(result.error)throw result.error;
  },taken?"Medicine entry removed.":"Medicine recorded as taken.");
 }
 function logCare(r:QuickRoutine){
  const done=isRoutineTaken(routineLogs,r.id,day,"");
  void act(r.id,async()=>{
   const sb=supabaseBrowser();
   const result=done?
    await sb.from("health_routine_logs").delete().eq("workspace_id",workspace).eq("created_by",owner).eq("routine_id",r.id).eq("date",day).eq("scheduled_time",""):
    await sb.from("health_routine_logs").upsert({routine_id:r.id,workspace_id:workspace,created_by:owner,date:day,scheduled_time:"",status:"done",completed_at:new Date().toISOString()},{onConflict:"routine_id,date,scheduled_time"});
   if(result.error)throw result.error;
  },done?"Care completion removed.":"Hair care recorded for today.");
 }
 function logHabit(h:PlannerHabit){
  const done=logDone(habitLogs,h.id,day);
  void act(h.id,async()=>{
   const sb=supabaseBrowser();
   const result=done?
    await sb.from("habit_logs").delete().eq("habit_id",h.id).eq("date",day):
    await sb.from("habit_logs").upsert({habit_id:h.id,date:day,value:1},{onConflict:"habit_id,date"});
   if(result.error)throw result.error;
  },done?"Habit completion undone.":"Habit completion synced.");
 }
 function logFood(e:FormEvent){
  e.preventDefault();
  if(!foodAvailable){setError("Nutrition table is awaiting activation. Water and care actions are still available.");return;}
  if(!selectedFood||!Number.isFinite(foodGrams)||foodGrams<=0||foodGrams>5000){setError("Enter a valid food portion.");return;}
  const nutrientSnapshot=estimateFood(selectedFood,foodGrams);
  void act("food",async()=>{
   const sb=supabaseBrowser();
   const {error:q}=await sb.from("food_intake_logs").insert({
    workspace_id:workspace,created_by:owner,date:day,food_key:selectedFood.key,food_name:selectedFood.name,
    quantity_g:Math.round(foodGrams*100)/100,meal_type:"Other",estimated_nutrients:nutrientSnapshot,
    reference_version:FOOD_REFERENCE_VERSION
   });
   if(q)throw q;
  },selectedFood.name+" added to consumed-food history.");
 }
 return <section className="lifeos-home-quick" aria-label="Private daily health and habit logging">
  <div className="lifeos-quick-title">
   <div><span className="lifeos-quick-eyebrow">✳ ONE-TAP DAILY LOGGING</span><h2>Log it in seconds.</h2><p>Water, medicine, food, hair care and habits — directly from Home.</p></div>
   <Link href="/health-planner" className="lifeos-quick-all-link">Full Health Planner ↗</Link>
  </div>
  {error&&<p className="lifeos-quick-error" role="alert">{error}</p>}
  {notice&&<p className="lifeos-quick-notice" role="status">{notice}</p>}
  {!loaded?<div className="lifeos-quick-wait">Loading your daily records…</div>:
   !workspace?<div className="lifeos-quick-wait">Private workspace not available. <button type="button" onClick={()=>void load()}>Retry</button></div>:
   <>
   <div className="lifeos-quick-cards">
    <article className="lifeos-quick-card lifeos-quick-water">
     <div className="lifeos-quick-card-title"><span className="lifeos-quick-emoji" aria-hidden="true">💧</span><div><h3>Water</h3><small>{Math.min(100,Math.round(waterMl/waterGoal*100))}% of personal target</small></div><Link href="/health-planner" aria-label="Open full water history">↗</Link></div>
     <strong className="lifeos-quick-number">{waterMl.toLocaleString()}<span> / {waterGoal.toLocaleString()} ml</span></strong>
     <div className="lifeos-quick-meter"><span style={{width:Math.min(100,Math.round(waterMl/waterGoal*100))+"%"}}/></div>
     <div className="lifeos-quick-presets"><button type="button" disabled={!!busy} onClick={()=>addWater(250)}>+ 250 ml</button><button type="button" disabled={!!busy} onClick={()=>addWater(500)}>+ 500 ml</button></div>
     <form className="lifeos-quick-inline" onSubmit={e=>{e.preventDefault();addWater(Number(customWater));}}>
      <input type="number" aria-label="Custom water amount in ml" min={1} max={5000} step={1} value={customWater} onChange={e=>setCustomWater(e.target.value)}/>
      <button type="submit" disabled={!!busy}>Add ml</button>
     </form>
    </article>
    <article className="lifeos-quick-card lifeos-quick-food">
     <div className="lifeos-quick-card-title"><span className="lifeos-quick-emoji" aria-hidden="true">🍽️</span><div><h3>Food & protein</h3><small>Only actually eaten food</small></div><Link href="/health-planner#nutrition-intake" aria-label="Open full food tracker">↗</Link></div>
     <strong className="lifeos-quick-number">{foodAvailable?(foodTotal.protein_g==null?"—":foodTotal.protein_g.toFixed(1)+" g"):"Not active"}</strong>
     <span className="lifeos-quick-meta">{foodLogs.length} consumed entries today · estimated protein</span>
     {foodAvailable?<form className="lifeos-quick-food-form" onSubmit={logFood}>
      <select aria-label="Select food consumed" value={foodKey} onChange={e=>{const f=getFood(e.target.value);setFoodKey(e.target.value);setFoodUnit(f?.servingGrams?"pieces":"g");setFoodQty(f?.servingGrams?"2":"100");}}>
       {STARTER_FOODS.map(k=>{const f=getFood(k);return f?<option key={k} value={k}>{f.name}</option>:null;})}
      </select>
      <div className="lifeos-quick-inline"><input type="number" aria-label="Food quantity" step="0.1" min="0.1" value={foodQty} onChange={e=>setFoodQty(e.target.value)}/>
       <select aria-label="Food quantity units" value={foodUnit} disabled={!selectedFood?.servingGrams} onChange={e=>setFoodUnit(e.target.value as "pieces"|"g")}>
        {selectedFood?.servingGrams&&<option value="pieces">eggs / pcs</option>}<option value="g">grams</option>
       </select><button type="submit" disabled={!!busy||!foodGrams||foodGrams>5000}>Log</button></div>
      <small className="lifeos-quick-estimate">{foodProtein==null?"No reliable protein estimate":"~"+foodProtein.toFixed(1)+" g estimated protein for selected portion"}</small>
     </form>:<p className="lifeos-quick-help">Food logs activate after the private Supabase nutrition migration is applied. No fake entries shown.</p>}
     <Link href="/hair#nutrition-intake" className="lifeos-quick-bottom-link">All foods & nutrients →</Link>
    </article>
    <article className="lifeos-quick-card lifeos-quick-medicine">
     <div className="lifeos-quick-card-title"><span className="lifeos-quick-emoji" aria-hidden="true">💊</span><div><h3>Medicine</h3><small>Only your configured schedule</small></div><Link href="/health-planner" aria-label="Manage medicine schedules">↗</Link></div>
     <strong className="lifeos-quick-number">{medicinesTaken}<span> / {medicineSlots.length} logged taken</span></strong>
     {medicineSlots.length?<div className="lifeos-quick-rows">{medicineSlots.slice(0,5).map(({routine,time})=>{
      const done=isRoutineTaken(routineLogs,routine.id,day,time);
      return <div className="lifeos-quick-row" key={routine.id+"|"+time}><div><b>{routine.title}</b><small>{time} · {done?"Taken (recorded)":"Not logged"}</small></div>
       <button type="button" disabled={!!busy} aria-pressed={done} onClick={()=>logMedicine(routine,time)}>{done?"✓ Undo":"Taken"}</button></div>;
     })}</div>:<p className="lifeos-quick-help">No medicine schedules configured for today. Add a clinician-prescribed routine in Health Planner first.</p>}
     {medicineSlots.length>5&&<Link className="lifeos-quick-bottom-link" href="/health-planner">View all {medicineSlots.length} scheduled doses →</Link>}
     <p className="lifeos-quick-disclaimer">Taking medicine is never assumed. Tap Taken only after a dose was actually taken.</p>
    </article>
    <article className="lifeos-quick-card lifeos-quick-hair">
     <div className="lifeos-quick-card-title"><span className="lifeos-quick-emoji" aria-hidden="true">🌱</span><div><h3>Hair care</h3><small>Your own approved routines</small></div><Link href="/hair" aria-label="Open full hair recovery tracker">↗</Link></div>
     <strong className="lifeos-quick-number">{hairDone}<span> / {care.length} completed</span></strong>
     {care.length?<div className="lifeos-quick-rows">{care.slice(0,4).map(r=>{
      const done=isRoutineTaken(routineLogs,r.id,day,"");
      return <div className="lifeos-quick-row" key={r.id}><div><b>{r.title}</b><small>{done?"Logged today":"Not logged"}</small></div>
       <button type="button" disabled={!!busy} aria-pressed={done} onClick={()=>logCare(r)}>{done?"✓ Undo":"Done"}</button>
      </div>;
     })}</div>:<p className="lifeos-quick-help">No care routines active. Set up tracking once in Hair Recovery, then use Home every day.</p>}
     <Link className="lifeos-quick-bottom-link" href="/hair">Photos, labs & all care →</Link>
    </article>
   </div>
   <div className="lifeos-quick-habits">
    <div className="lifeos-quick-habits-top"><div><span>YOUR DAILY CHECKLIST</span><h3>Today's habits <small>{completedHabits}/{dueHabits.length} done</small></h3></div><Link href="/habits/planner">Full Habit Studio ↗</Link></div>
    {dueHabits.length?<div className="lifeos-quick-habit-grid">{visibleHabits.map(h=>{
     const done=logDone(habitLogs,h.id,day);
     return <button type="button" className={"lifeos-quick-habit"+(done?" done":"")} key={h.id} aria-pressed={done} disabled={!!busy} onClick={()=>logHabit(h)}>
      <span className="lifeos-quick-habit-check">{done?"✓":"+"}</span><span><strong>{h.name}</strong><small>{h.area||"Personal"} · {h.frequency}</small></span>
     </button>;
    })}</div>:<p className="lifeos-quick-help">No habits due right now. <Link href="/habits">Create one →</Link></p>}
    {dueHabits.length>4&&<button className="lifeos-quick-toggle" type="button" onClick={()=>setShowMoreHabits(x=>!x)}>{showMoreHabits?"Show fewer ↑":("Show all "+dueHabits.length+" habits ↓")}</button>}
   </div>
   </>
  }
 </section>;
}
