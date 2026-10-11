"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {currentWorkspace,peekWorkspaceContext} from "@/lib/supabase/workspace";
import {supabaseBrowser} from "@/lib/supabase/client";
import {todayInTZ} from "@/lib/timezone";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {hairActivityDays,hairRoutineDone,HAIR_LAB_CHECKLIST,matchHairLab,type HairLab,type HairRoutineLog} from "@/lib/hair-recovery";
import "./hair-recovery-tracker.css";

type HairRoutine={id:string;title:string;kind:string;details:Record<string,unknown>;active:boolean;created_by:string};
type WaterLog={date:string;amount_ml:number};
type HealthEntry={date:string;protein:string|null};
type PlannedMeal={title:string;protein_g:number|null;days_of_week:number[];active:boolean};
const TRACKING_IDEAS=[
 {title:"Protein-rich meals",category:"nutrition",description:"Track meals you actually ate; enter detailed foods in Diet Planner."},
 {title:"Hair care / serum routine",category:"care",description:"Only log treatments that your clinician has approved."},
 {title:"Hair shedding observation",category:"observation",description:"Note changes without estimating missing measurements."},
 {title:"Scalp procedure check-in",category:"procedure",description:"Only if specifically advised by a dermatologist."},
];
const FOOD_GROUPS=[
 ["Iron","Mutton, chicken, eggs, spinach, rajma, chana, sesame seeds"],
 ["Vitamin B12","Eggs, milk, yogurt, paneer, fish, chicken, mutton"],
 ["Folate (B9)","Leafy greens, chana, rajma, oranges, avocado"],
 ["Zinc","Eggs, meat, dairy, pumpkin seeds, sesame seeds, cashews"],
 ["Vitamin D","Fortified foods, oily fish, egg yolks; dietary intake may not be sufficient"],
 ["Protein","Eggs, chicken, fish, meat, paneer, lentils, curd, milk"],
 ["Vitamin C","Amla, guava, citrus, tomatoes, capsicum"],
 ["Omega-3","Fatty fish, walnuts, flax or chia seeds"],
 ["Magnesium","Pumpkin seeds, nuts, spinach, whole grains"],
] as const;

function shift(iso:string,n:number){const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}

export function HairRecoveryTracker(){
 const cached=peekWorkspaceContext();
 const [workspaceId,setWorkspaceId]=useState(cached?.workspaceId||"");
 const [userId,setUserId]=useState(cached?.user.id||"");
 const [routines,setRoutines]=useState<HairRoutine[]>([]);
 const [logs,setLogs]=useState<HairRoutineLog[]>([]);
 const [labs,setLabs]=useState<HairLab[]>([]);
 const [water,setWater]=useState<WaterLog[]>([]);
 const [health,setHealth]=useState<HealthEntry[]>([]);
 const [meals,setMeals]=useState<PlannedMeal[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [pending,setPending]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [custom,setCustom]=useState("");
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [showFoods,setShowFoods]=useState(false);

 const load=useCallback(async()=>{
  try{
   const sb=supabaseBrowser(),ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspaceId("");setLoaded(true);return;}
   const start=shift(todayInTZ(),-89);
   const [r,l,b,w,h,m]=await Promise.all([
    sb.from("health_routines").select("id,title,kind,details,active,created_by").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("kind","other"),
    sb.from("health_routine_logs").select("routine_id,date,status").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).gte("date",start),
    sb.from("lab_results").select("test_name,date,result,unit,ref_range").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).order("date",{ascending:false}).limit(200),
    sb.from("water_logs").select("date,amount_ml").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).gte("date",shift(todayInTZ(),-13)),
    sb.from("health_entries").select("date,protein").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).order("date",{ascending:false}).limit(30),
    sb.from("diet_plan_items").select("title,protein_g,days_of_week,active").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("active",true)
   ]);
   for(const q of [r,l,b,w,h,m])if(q.error)throw q.error;
   const own=((r.data||[]) as HairRoutine[]).filter(x=>x.details?.source==="lifeos-hair-recovery");
   setRoutines(own);
   setLogs((l.data||[]) as HairRoutineLog[]);
   setLabs((b.data||[]) as HairLab[]);
   setWater((w.data||[]) as WaterLog[]);
   setHealth((h.data||[]) as HealthEntry[]);
   setMeals((m.data||[]) as PlannedMeal[]);
   setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);setError("");setLoaded(true);
  }catch(e){setLoaded(true);setError(e instanceof Error?e.message:"Could not load health tracking. Retry online.");}
 },[]);
 useEffect(()=>{void load();},[load]);
 useRealtimeRefresh(["health_routines","health_routine_logs","lab_results","water_logs","health_entries","diet_plan_items"],load,Boolean(workspaceId));

 const today=todayInTZ();
 const completed=routines.filter(r=>r.active&&hairRoutineDone(logs,r.id,today)).length;
 const active=routines.filter(r=>r.active);
 const daysTracked=hairActivityDays(logs,routines.map(r=>r.id),shift(today,-29),today);
 const waterToday=water.filter(x=>x.date===today).reduce((n,x)=>n+Number(x.amount_ml||0),0);
 const proteinToday=health.find(x=>x.date===today)?.protein;
 const dayIndex=((new Date(today+"T12:00:00Z").getUTCDay()+6)%7)+1;
 const mealsToday=meals.filter(x=>x.active&&(x.days_of_week||[]).includes(dayIndex));
 const plannedProtein=mealsToday.reduce((sum,x)=>sum+Number(x.protein_g||0),0);
 const labStatus=useMemo(()=>HAIR_LAB_CHECKLIST.map(x=>({...x,recorded:matchHairLab(x.name,labs)})),[labs]);
 const labCount=labStatus.filter(x=>x.recorded).length;

 async function create(title:string,category:string){
  const clean=title.trim();
  if(!workspaceId||!userId||!clean||pending)return;
  if(routines.some(r=>r.title.toLowerCase()===clean.toLowerCase())){setNotice("Already in your routine list.");return;}
  setPending("add");setError("");setNotice("");
  try{
   const sb=supabaseBrowser();
   const q=await sb.from("health_routines").insert({
    workspace_id:workspaceId,created_by:userId,kind:"other",title:clean,
    details:{source:"lifeos-hair-recovery",category},reminder_times:[],
    days_of_week:[1,2,3,4,5,6,7],active:true,start_date:today
   });
   if(q.error)throw q.error;
   setCustom("");setNotice("Added to your Supabase health routines. No automatic treatment reminders were set.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not add routine.");}
  finally{setPending("");}
 }
 async function toggleLog(r:HairRoutine){
  if(!workspaceId||!userId||pending)return;
  setPending(r.id);setError("");setNotice("");
  const done=hairRoutineDone(logs,r.id,today);
  try{
   const sb=supabaseBrowser();
   const q=done?
    await sb.from("health_routine_logs").delete().eq("workspace_id",workspaceId).eq("routine_id",r.id).eq("date",today).eq("scheduled_time",""):
    await sb.from("health_routine_logs").upsert({routine_id:r.id,workspace_id:workspaceId,created_by:userId,date:today,scheduled_time:"",status:"done",note:notes[r.id]?.trim()||null,completed_at:new Date().toISOString()},{onConflict:"routine_id,date,scheduled_time"});
   if(q.error)throw q.error;
   setNotice(done?"Today's entry removed.":"Today's routine saved.");
   setNotes(old=>({...old,[r.id]:""}));
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not save today.");}
  finally{setPending("");}
 }
 async function toggleActive(r:HairRoutine){
  if(pending||!workspaceId)return;
  setPending(r.id);
  try{
   const sb=supabaseBrowser();
   const q=await sb.from("health_routines").update({active:!r.active,updated_at:new Date().toISOString()}).eq("workspace_id",workspaceId).eq("created_by",userId).eq("id",r.id);
   if(q.error)throw q.error;
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not change routine.");}
  finally{setPending("");}
 }

 return <section className="hair-hub" aria-label="Connected hair recovery dashboard">
  <div className="hair-hub-heading">
   <div><span>CONNECTED HEALTH JOURNAL</span><h2>My hair recovery routine</h2><p>One Supabase record per action. Logs, nutrition, hydration and test records connect to your existing LifeOS pages.</p></div>
   <Link href="/health-planner" className="hair-link">Hydration & Diet →</Link>
  </div>
  {error&&<p role="alert" className="hair-alert">{error}</p>}
  {notice&&<p role="status" className="hair-notice">{notice}</p>}
  {!loaded?<p className="hair-wait">Loading your workspace…</p>:!workspaceId?<p className="hair-wait">Your private workspace is unavailable. <button type="button" onClick={()=>void load()}>Retry</button></p>:<>
   <div className="hair-summary">
    <div><span>CARE ROUTINES TODAY</span><strong>{completed}<small>/{active.length}</small></strong><p>Only actions you have logged</p></div>
    <div><span>DAYS TRACKED · 30D</span><strong>{daysTracked}</strong><p>Days with recorded routine activity</p></div>
    <div><span>WATER TODAY</span><strong>{waterToday}<small> ml</small></strong><p>From Water Tracker, not a second counter</p></div>
    <div><span>LAB RESULTS ENTERED</span><strong>{labCount}<small>/{labStatus.length}</small></strong><p>Recorded in Health, not interpreted</p></div>
   </div>
   <div className="hair-dual">
    <section className="hair-box">
     <div className="hair-box-head"><h3>Daily care checklist</h3><span>{active.length} active</span></div>
     <p className="hair-sub">Tap Done only after you actually complete an activity. Notes are saved on the log.</p>
     {!routines.length&&<p className="hair-muted">Select a starter below to begin, or add your own routine.</p>}
     <div className="hair-routines">
      {routines.map(r=>{
       const done=hairRoutineDone(logs,r.id,today);
       return <article key={r.id} className={"hair-routine"+(done?" is-done":"")}>
        <div className="hair-routine-top"><button type="button" aria-pressed={done} className="hair-check" disabled={!!pending||!r.active} onClick={()=>void toggleLog(r)}>{done?"✓":"+"}</button>
         <div><b>{r.title}</b><small>{String(r.details?.category||"care")} · {r.active?"Active":"Paused"} · {done?"Done today":"Not logged today"}</small></div>
         <button className="hair-pause" type="button" disabled={!!pending} onClick={()=>void toggleActive(r)}>{r.active?"Pause":"Resume"}</button>
        </div>
        {r.active&&!done&&<label className="hair-notefield">Optional note<input placeholder="e.g., what I did today" value={notes[r.id]||""} maxLength={400} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))}/></label>}
       </article>
      })}
     </div>
     <h4>Starter tracking ideas</h4>
     <div className="hair-starters">{TRACKING_IDEAS.map(x=><button type="button" key={x.title} disabled={!!pending||routines.some(r=>r.title===x.title)} onClick={()=>void create(x.title,x.category)}>
       <span><b>{x.title}</b><small>{x.description}</small></span><span>{routines.some(r=>r.title===x.title)?"✓":"＋"}</span>
      </button>)}</div>
     <form className="hair-custom" onSubmit={(e:FormEvent)=>{e.preventDefault();void create(custom,"custom");}}>
      <label>Custom routine<input value={custom} onChange={e=>setCustom(e.target.value)} maxLength={110} placeholder="A personal activity you want to track"/></label>
      <button type="submit" disabled={!!pending||!custom.trim()}>Add</button>
     </form>
     <p className="hair-sub">Scalp procedures and topical medicines should only be tracked if a qualified clinician has advised them. No treatments are automatically prescribed, scheduled or started here.</p>
    </section>
    <section className="hair-box">
     <div className="hair-box-head"><h3>Lab test record checklist</h3><span>{labCount} recorded</span></div>
     <p className="hair-sub">Possible tests to discuss with a clinician—not a mandatory panel. “Not recorded” does not mean you have not done the test.</p>
     <div className="hair-labs">{labStatus.map(x=><div className="hair-lab" key={x.id}>
      <div><b>{x.name}</b><small>{x.recorded?("Last recorded: "+x.recorded.date):"Not recorded in LifeOS"}</small></div>
      <span className={x.recorded?"hair-recorded":"hair-not-recorded"}>{x.recorded?"Recorded":"—"}</span>
     </div>)}</div>
     <div className="hair-box-links"><Link href="/health">Enter/view lab results →</Link><Link href="/health-vault">Upload original reports →</Link></div>
     <p className="hair-sub">LifeOS does not mark blood results as normal or abnormal. Reference intervals depend on the lab, your history and clinician review.</p>
    </section>
   </div>
   <div className="hair-dual">
    <section className="hair-box">
     <div className="hair-box-head"><h3>Nutrition & hydration</h3><Link href="#nutrition-intake">Log actual food ↓</Link></div>
     <p className="hair-sub">Protein entry for today: <strong>{proteinToday||"Not logged"}</strong>. This note comes from the Health journal.</p>
     <p className="hair-sub">Today's planned meals: <strong>{mealsToday.length}</strong>{mealsToday.some(x=>x.protein_g!=null)?(" · "+plannedProtein.toFixed(1)+" g protein planned (not confirmed eaten)"):""}.</p>
     {!!mealsToday.length&&<div className="hair-planned-meals">{mealsToday.map((m,i)=><div key={i}><span>🍽</span><b>{m.title}</b><small>{m.protein_g!=null?Number(m.protein_g)+" g planned":"Protein not entered"}</small></div>)}</div>}
     <p className="hair-sub">Log foods you actually ate in Daily Nutrition Tracker below. Diet Planner continues to hold planned meals only.</p>
     <button type="button" className="hair-food-toggle" aria-expanded={showFoods} onClick={()=>setShowFoods(v=>!v)}>{showFoods?"Hide food-source reference ↑":"Show food-source reference ↓"}</button>
     {showFoods&&<div className="hair-food-groups">{FOOD_GROUPS.map(([name,foods])=><div key={name}><b>{name}</b><p>{foods}</p></div>)}</div>}
     <p className="hair-sub">Food lists are general examples. Supplements or correction of deficiencies require lab results and clinician advice.</p>
    </section>
    <section className="hair-box">
     <div className="hair-box-head"><h3>Evidence over time</h3><Link href="#hair-photo-evidence">Compare photos ↓</Link></div>
     <p className="hair-sub">Keep monthly photos consistent in angle, lighting and distance. Photos remain in your existing private LifeOS storage.</p>
     <div className="hair-box-links"><Link href="/health">Health journal →</Link><Link href="/habits/planner">Habit planner →</Link><Link href="/notifications">Reminders →</Link></div>
     <p className="hair-sub">If hair shedding is sudden, patchy, accompanied by scalp inflammation, or persists, seek clinical evaluation rather than starting medications on your own.</p>
    </section>
   </div>
  </>}
 </section>;
}
