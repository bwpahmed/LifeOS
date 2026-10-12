"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabaseBrowser} from "@/lib/supabase/client";
import {currentWorkspace,peekWorkspaceContext} from "@/lib/supabase/workspace";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {todayInTZ} from "@/lib/timezone";
import {waterTotalForDate} from "@/lib/health-planner";
import {latestHairLabResults,parseProteinGrams,waterByDay,clampHairSheddingScore,type HairLabRow} from "@/lib/hair-recovery";
import "./hair-recovery.css";

type WaterRow={id:string;date:string;amount_ml:number;created_at:string};
type DailyHealth={id:string;date:string;protein:string|null};
type Routine={id:string;kind:string;title:string;details:{source?:string;care_step?:string}};
type CareLog={routine_id:string;date:string;scheduled_time:string;value:number|null;note:string|null;status:string};
type PlannedMeal={id:string;title:string;protein_g:number|null;active:boolean;days_of_week:number[]};
type CareStep="serum"|"dermastamp"|"shedding";
const CARE_DETAILS:Record<CareStep,{name:string;description:string}>={
 serum:{name:"Topical serum check-in",description:"Only if you already use a clinician-approved topical product"},
 dermastamp:{name:"Dermastamp check-in",description:"Only if your dermatologist has advised and explained safe use"},
 shedding:{name:"Hair shedding rating",description:"A subjective daily 1–5 self-rating; not a medical diagnosis"}
};
const NUTRITION=[
 {nutrient:"Protein",foods:"Eggs, poultry, fish, meat, paneer, milk, curd, legumes"},
 {nutrient:"Iron",foods:"Meat, lentils, chana, beans, greens, sesame"},
 {nutrient:"B12",foods:"Eggs, dairy, fish, poultry, meat"},
 {nutrient:"Folate",foods:"Leafy greens, chana, rajma, oranges"},
 {nutrient:"Zinc",foods:"Meat, dairy, eggs, pumpkin seeds, legumes"},
 {nutrient:"Vitamin D",foods:"Fatty fish, egg yolk, fortified foods; food alone may not be enough"},
 {nutrient:"Vitamin C",foods:"Amla, guava, citrus, tomatoes, capsicum"},
 {nutrient:"Omega-3",foods:"Fish, walnuts, flax and chia seeds"},
 {nutrient:"Magnesium",foods:"Pumpkin seeds, nuts, beans, greens, whole grains"}
];
function isoShift(date:string,days:number){
 const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
function localDay(date:string){return new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"});}
function checked(logs:CareLog[],routine:Routine|undefined,date:string){
 return Boolean(routine&&logs.some(l=>l.routine_id===routine.id&&l.date===date&&l.status==="done"));
}

export function HairRecoveryTracker(){
 const initial=peekWorkspaceContext();
 const[workspaceId,setWorkspaceId]=useState(initial?.workspaceId||"");
 const[userId,setUserId]=useState(initial?.user.id||"");
 const[today,setToday]=useState(todayInTZ());
 const[water,setWater]=useState<WaterRow[]>([]);
 const[waterGoal,setWaterGoal]=useState<number|null>(null);
 const[health,setHealth]=useState<DailyHealth[]>([]);
 const[routines,setRoutines]=useState<Routine[]>([]);
 const[logs,setLogs]=useState<CareLog[]>([]);
 const[labs,setLabs]=useState<HairLabRow[]>([]);
 const[meals,setMeals]=useState<PlannedMeal[]>([]);
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const[notice,setNotice]=useState("");
 const[customWater,setCustomWater]=useState(300);
 const[proteinInput,setProteinInput]=useState("");
 const[shedding,setShedding]=useState(3);
 const[sheddingNote,setSheddingNote]=useState("");

 const load=useCallback(async()=>{
  try{
   const sb=supabaseBrowser();
   const ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspaceId("");setLoading(false);return;}
   const tz=await sb.from("profiles").select("timezone").eq("id",ctx.user.id).maybeSingle();
   const day=todayInTZ(tz.data?.timezone||"Asia/Dubai");
   const since=isoShift(day,-89);
   const [waterResult,healthResult,routineResult,labResult,mealResult,waterGoalResult]=await Promise.all([
    sb.from("water_logs").select("id,date,amount_ml,created_at").eq("workspace_id",ctx.workspaceId).gte("date",since).lte("date",day).order("created_at",{ascending:false}).limit(1000),
    sb.from("health_entries").select("id,date,protein").eq("workspace_id",ctx.workspaceId).gte("date",since).lte("date",day).order("date",{ascending:false}).limit(120),
    sb.from("health_routines").select("id,kind,title,details").eq("workspace_id",ctx.workspaceId).eq("kind","other").contains("details",{source:"hair_recovery"}),
    sb.from("lab_results").select("id,test_name,result,date,unit,ref_range").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(120),
    sb.from("diet_plan_items").select("id,title,protein_g,active,days_of_week").eq("workspace_id",ctx.workspaceId),
    sb.from("health_routines").select("details,active").eq("workspace_id",ctx.workspaceId).eq("kind","water")
   ]);
   for(const result of [waterResult,healthResult,routineResult,labResult,mealResult,waterGoalResult])if(result.error)throw result.error;
   const care=(routineResult.data||[]) as Routine[];
   let routineLogs:CareLog[]=[];
   if(care.length){
    const result=await sb.from("health_routine_logs").select("routine_id,date,scheduled_time,value,note,status")
     .eq("workspace_id",ctx.workspaceId).in("routine_id",care.map(r=>r.id)).gte("date",since).lte("date",day).limit(300);
    if(result.error)throw result.error;
    routineLogs=(result.data||[]) as CareLog[];
   }
   const healthRows=(healthResult.data||[]) as DailyHealth[];
   const current=healthRows.find(x=>x.date===day);
   const dailyRating=routineLogs.find(l=>l.date===day&&l.routine_id===care.find(r=>r.details?.care_step==="shedding")?.id);
   setWorkspaceId(ctx.workspaceId);
   setUserId(ctx.user.id);
   setToday(day);
   setWater((waterResult.data||[]) as WaterRow[]);
   const waterRoutine=(waterGoalResult.data||[]).find(r=>r.active)||(waterGoalResult.data||[])[0];
   const recordedGoal=Number(waterRoutine?.details?.daily_goal_ml);
   setWaterGoal(Number.isFinite(recordedGoal)&&recordedGoal>=250&&recordedGoal<=10000?recordedGoal:null);
   setHealth(healthRows);
   setRoutines(care);
   setLabs((labResult.data||[]) as HairLabRow[]);
   setMeals((mealResult.data||[]) as PlannedMeal[]);
   setLogs(routineLogs);
   setProteinInput(current?.protein&&parseProteinGrams(current.protein)!==null?String(parseProteinGrams(current.protein)):"");
   if(dailyRating?.value)setShedding(clampHairSheddingScore(Number(dailyRating.value)));
   setSheddingNote(dailyRating?.note||"");
   setError("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to load the connected health records.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 useRealtimeRefresh(["water_logs","health_entries","health_routines","health_routine_logs","lab_results","diet_plan_items"],load,Boolean(workspaceId));

 const todayWater=waterTotalForDate(water,today);
 const sevenDays=useMemo(()=>Array.from({length:7},(_,i)=>isoShift(today,i-6)),[today]);
 const sevenWater=waterByDay(water,sevenDays);
 const waterSevenTotal=sevenWater.reduce((sum,x)=>sum+x.ml,0);
 const waterScale=Math.max(1000,waterGoal||0,...sevenWater.map(x=>x.ml));
 const todayProtein=health.find(h=>h.date===today);
 const recordedProtein=parseProteinGrams(todayProtein?.protein);
 const actualProteinDays=health.filter(h=>parseProteinGrams(h.protein)!==null).length;
 const doctorChecklist=latestHairLabResults(labs);
 const recordedLabs=doctorChecklist.filter(x=>x.record).length;
 const routineBy=(step:CareStep)=>routines.find(r=>r.details?.care_step===step);
 const sheddingRoutine=routineBy("shedding");
 const dailyShedding=logs.find(l=>l.date===today&&l.routine_id===sheddingRoutine?.id);
 const series=Array.from({length:14},(_,i)=>{
  const day=isoShift(today,i-13);
  const log=logs.find(l=>l.date===day&&l.routine_id===sheddingRoutine?.id);
  return {day,score:log?.value==null?null:Number(log.value)};
 });
 const careItems=([{step:"serum",label:"Serum used",icon:"🧴"},{step:"dermastamp",label:"Dermastamp used",icon:"🌱"}] as const);

 async function logWater(amount:number){
  if(busy||!workspaceId||!userId||!Number.isInteger(amount)||amount<1||amount>5000){setError("Enter a positive water amount up to 5000 mL per entry.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const sb=supabaseBrowser();
   const {error:q}=await sb.from("water_logs").insert({workspace_id:workspaceId,created_by:userId,date:today,amount_ml:amount});
   if(q)throw q;
   setNotice(amount+" mL saved to the same Water Tracker.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Water entry was not saved.");}
  finally{setBusy(false);}
 }

 async function saveProtein(e:FormEvent){
  e.preventDefault();
  const value=Number(proteinInput);
  if(busy||!workspaceId||!userId||!Number.isFinite(value)||value<0||value>500){setError("Enter actual protein consumed, 0–500 g.");return;}
  if(todayProtein?.protein && parseProteinGrams(todayProtein.protein)===null){
   setError("Your Health dashboard already has free-text nutrition notes today. Edit that entry there before converting it to grams, so nothing is overwritten.");return;
  }
  setBusy(true);setError("");setNotice("");
  try{
   const sb=supabaseBrowser();
   const payload={protein:value+" g"};
   const result=todayProtein
    ?await sb.from("health_entries").update(payload).eq("id",todayProtein.id).eq("workspace_id",workspaceId)
    :await sb.from("health_entries").insert({...payload,workspace_id:workspaceId,created_by:userId,date:today,privacy:"private"});
   if(result.error)throw result.error;
   setNotice("Actual protein saved in your existing daily Health record.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Protein entry was not saved.");}
  finally{setBusy(false);}
 }
 async function getOrCreateRoutine(step:CareStep):Promise<Routine>{
  const existing=routineBy(step);if(existing)return existing;
  const sb=supabaseBrowser();
  const {data,error:q}=await sb.from("health_routines").insert({
   workspace_id:workspaceId,created_by:userId,kind:"other",title:CARE_DETAILS[step].name,
   details:{source:"hair_recovery",care_step:step},reminder_times:[],days_of_week:[1,2,3,4,5,6,7],
   active:true,start_date:today
  }).select("id,kind,title,details").single();
  if(q)throw q;
  return data as Routine;
 }
 async function toggleCare(step:"serum"|"dermastamp"){
  if(busy||!workspaceId||!userId)return;
  setBusy(true);setError("");setNotice("");
  try{
   const sb=supabaseBrowser();
   const routine=await getOrCreateRoutine(step);
   const done=checked(logs,routine,today);
   // 00:00 is a valid, reserved manual daily key; actual timestamp comes from completed_at.
   const result=done
    ?await sb.from("health_routine_logs").delete().eq("workspace_id",workspaceId).eq("routine_id",routine.id).eq("date",today).eq("scheduled_time","00:00")
    :await sb.from("health_routine_logs").upsert({
      routine_id:routine.id,workspace_id:workspaceId,created_by:userId,date:today,scheduled_time:"00:00",
      status:"done",value:1,unit:"check-in",completed_at:new Date().toISOString()
     },{onConflict:"routine_id,date,scheduled_time"});
   if(result.error)throw result.error;
   setNotice(done?"Care check-in removed.":"Care check-in saved. This records use, not a treatment recommendation.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Care check-in could not be saved.");}
  finally{setBusy(false);}
 }
 async function saveShedding(e:FormEvent){
  e.preventDefault();
  if(busy||!workspaceId||!userId)return;
  setBusy(true);setError("");setNotice("");
  try{
   const routine=await getOrCreateRoutine("shedding");
   const sb=supabaseBrowser();
   const {error:q}=await sb.from("health_routine_logs").upsert({
    routine_id:routine.id,workspace_id:workspaceId,created_by:userId,date:today,scheduled_time:"00:00",
    status:"done",value:clampHairSheddingScore(shedding),unit:"self-rating-1-5",
    note:sheddingNote.trim().slice(0,350)||null,completed_at:new Date().toISOString()
   },{onConflict:"routine_id,date,scheduled_time"});
   if(q)throw q;
   setNotice("Today's subjective hair shedding check-in saved.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Shedding check-in could not be saved.");}
  finally{setBusy(false);}
 }

 if(loading)return <section className="hrx-root" aria-live="polite"><p className="hrx-alert">Loading your private health records…</p></section>;
 if(!workspaceId)return <section className="hrx-root"><p className="hrx-alert">Your verified LifeOS workspace is required. Refresh after signing in.</p></section>;
 return <section className="hrx-root" aria-label="Connected hair recovery and nutrition tracking">
  <div className="hrx-heading">
   <div><span className="hrx-eyebrow">YOUR HEALTH · ONE SOURCE OF TRUTH</span><h2>Hair & nutrition tracking</h2>
    <p>Track your actual habits and symptoms, not just check boxes. All records use existing private LifeOS health tables.</p></div>
   <Link href="/health-planner" className="hrx-link">Full Health Planner ↗</Link>
  </div>
  {error&&<p className="hrx-error" role="alert">{error}</p>}
  {notice&&<p className="hrx-notice" role="status">{notice}</p>}
  <div className="hrx-summary">
   <div><span>WATER · TODAY</span><strong>{todayWater.toLocaleString()} <small>mL</small></strong><p>{waterGoal?Math.round(todayWater/waterGoal*100)+"% of your "+waterGoal.toLocaleString()+" mL goal": "Set your personal daily goal in Health Planner"}. Last 7 days: {waterSevenTotal.toLocaleString()} mL.</p></div>
   <div><span>PROTEIN · TODAY</span><strong>{recordedProtein===null?"—":recordedProtein} <small>{recordedProtein===null?"not logged":"g"}</small></strong><p>{actualProteinDays} days with numeric protein records (last 90 days)</p></div>
   <div><span>LAB TESTS · IN LIFEOS</span><strong>{recordedLabs}<small>/{doctorChecklist.length}</small></strong><p>Tests with a recorded result; not an indication of normality</p></div>
  </div>

  <div className="hrx-grid">
   <article className="hrx-card">
    <div className="hrx-cardhead"><span className="hrx-icon">💧</span><div><h3>Water intake</h3><p>Tap whenever you drink. Each amount adds to the same water log.</p></div></div>
    <div className="hrx-quick">
     {[150,250,500,750].map(ml=><button type="button" disabled={busy} key={ml} onClick={()=>void logWater(ml)}>+ {ml} mL</button>)}
    </div>
    <form className="hrx-inline" onSubmit={e=>{e.preventDefault();void logWater(customWater);}}>
     <label>Custom amount (mL)<input type="number" required min={1} max={5000} step={1} value={customWater} onChange={e=>setCustomWater(Number(e.target.value))}/></label>
     <button type="submit" disabled={busy}>Add water</button>
    </form>
    {waterGoal&&<div className="hrx-progress" role="progressbar" aria-label="Water target progress" aria-valuenow={Math.min(100,Math.round(todayWater/waterGoal*100))} aria-valuemin={0} aria-valuemax={100}><span style={{width:Math.min(100,Math.round(todayWater/waterGoal*100))+"%"}}/></div>}
    <div className="hrx-water-days" aria-label="Last 7 days water intake">
     {sevenWater.map(d=><div key={d.date} title={d.date+" • "+d.ml+" mL"}><span style={{height:(d.ml?Math.max(10,Math.min(100,d.ml/waterScale*100)):4)+"%"}}/><small>{localDay(d.date)}</small><b>{d.ml?d.ml:"—"}</b></div>)}
    </div>
    <Link href="/health-planner">See water goal, detailed entries and reminders →</Link>
   </article>

   <article className="hrx-card">
    <div className="hrx-cardhead"><span className="hrx-icon">🥚</span><div><h3>Protein eaten</h3><p>Enter real grams consumed today, not just a planned meal target.</p></div></div>
    <form className="hrx-inline" onSubmit={saveProtein}>
     <label>Protein today (g)<input type="number" step=".5" min={0} max={500} required value={proteinInput} placeholder="e.g. 95" onChange={e=>setProteinInput(e.target.value)}/></label>
     <button type="submit" disabled={busy||proteinInput===""}>Save grams</button>
    </form>
    <p className="hrx-caption">Saved to <strong>Health → Daily Health → Protein/nutrition</strong>. If you already wrote nutrition notes there, those notes stay untouched.</p>
    <div className="hrx-food-plan">
     <h4>Existing planned meals</h4>
     {meals.filter(m=>m.active).slice(0,4).map(m=><div key={m.id}><span>{m.title}</span><b>{m.protein_g==null?"No protein estimate":Number(m.protein_g)+" g planned"}</b></div>)}
     {!meals.some(m=>m.active)&&<p>No meal plan yet. Add meals in your existing Health Planner.</p>}
    </div>
    <Link href="/health-planner">Plan meals and nutrition →</Link>
   </article>

   <article className="hrx-card">
    <div className="hrx-cardhead"><span className="hrx-icon">🌿</span><div><h3>Daily hair check-in</h3><p>Rate perceived shedding consistently. It's subjective, not a diagnosis.</p></div></div>
    <form className="hrx-shedding" onSubmit={saveShedding}>
     <label>Today's self-rating: <b>{shedding} / 5</b>
      <input type="range" min={1} max={5} value={shedding} onChange={e=>setShedding(Number(e.target.value))}/></label>
     <div className="hrx-rating-captions"><span>Less than usual</span><span>More than usual</span></div>
     <label>Notes (optional)<textarea maxLength={350} rows={2} value={sheddingNote} onChange={e=>setSheddingNote(e.target.value)} placeholder="Example: after shower / scalp itching / how it felt"/></label>
     <button disabled={busy}>Save today's rating</button>
    </form>
    <p className="hrx-caption">{dailyShedding?"Today's check-in is recorded.":"No shedding rating saved for today."} Compare trends over several weeks rather than interpreting a single day.</p>
    <div className="hrx-shedding-history">{series.map(day=><div key={day.day} title={day.day+": "+(day.score==null?"not recorded":day.score+"/5")}>
     <span style={{height:(day.score==null?4:Number(day.score)*20)+"%",opacity:day.score==null?.17:1}}/><small>{Number(day.day.slice(-2))}</small></div>)}</div>
   </article>

   <article className="hrx-card">
    <div className="hrx-cardhead"><span className="hrx-icon">🧴</span><div><h3>Hair-care adherence</h3><p>Record only care steps already agreed with your clinician.</p></div></div>
    <div className="hrx-care">
     {careItems.map(({step,label,icon})=>{
      const done=checked(logs,routineBy(step),today);
      return <button key={step} type="button" aria-pressed={done} disabled={busy} onClick={()=>void toggleCare(step)}>
       <span>{icon}</span><span><b>{label}</b><small>{CARE_DETAILS[step].description}</small></span><strong>{done?"✓ Done today":"Record"}</strong>
      </button>;
     })}
    </div>
    <p className="hrx-caption">Dermastamping can irritate or injure skin, and topical medications have risks. LifeOS does not schedule or recommend either automatically.</p>
   </article>
  </div>

  <article className="hrx-card hrx-labs">
   <div className="hrx-cardhead"><span className="hrx-icon">🧪</span><div><h3>Blood test checklist</h3><p>These are tests from your notes to discuss with a clinician. A check only means a result exists in LifeOS.</p></div></div>
   <div className="hrx-lab-grid">{doctorChecklist.map(test=><div key={test.key}>
    <span className={test.record?"hrx-found":"hrx-missing"}>{test.record?"✓":"○"}</span>
    <div><b>{test.label}</b><small>{test.record?test.record.date+" · "+(test.record.result||"Result saved")+(test.record.unit?" "+test.record.unit:""):"No result recorded in LifeOS"}</small></div>
   </div>)}</div>
   <p className="hrx-caption">Do not interpret a result without the laboratory's units/reference range and clinical context. Do not take iron, zinc or other supplements solely because a checkbox is empty.</p>
   <Link href="/health">Add or review lab results in the existing Health dashboard →</Link>
  </article>

  <article className="hrx-card hrx-food-guide">
   <div className="hrx-cardhead"><span className="hrx-icon">🥗</span><div><h3>Nutrition food-source guide</h3><p>Food ideas from your notes; not a personalized deficiency diagnosis or prescription.</p></div></div>
   <div className="hrx-nutrients">{NUTRITION.map(item=><div key={item.nutrient}><b>{item.nutrient}</b><span>{item.foods}</span></div>)}</div>
   <p className="hrx-caption">If shedding persists, a dermatologist can assess causes and discuss treatment options. The “0.1% topical” in your notes is not an identified medicine, so it has deliberately not been made into a treatment plan.</p>
  </article>
 </section>;
}
