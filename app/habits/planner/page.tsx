"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {BackHome} from "@/components/ui";
import {habitConsistencyForFrequency,habitPeriodStreak,recoveryScore} from "@/lib/habits";
import {currentWorkspace} from "@/lib/supabase/workspace";
import {supabaseBrowser} from "@/lib/supabase/client";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {todayInTZ} from "@/lib/timezone";
import {dayProgress,habitDueOn,logDone,mondayOf,periodProgress,plannerCompletionTrend,scheduledForDay,shiftHabitDate,weekDates,sortPlannerHabits,type HabitSortMode,type PlannerHabit,type PlannerLog} from "@/lib/habit-planner";
import "./planner.css";

const AREAS=["All areas","Health","Growth","Business","Family","Personal","Self-control","Europe"];
const WEEKDAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STARTERS=[
 {name:"Morning walk",area:"Health",frequency:"Daily",kind:"build",icon:"🚶"},
 {name:"Read every day",area:"Growth",frequency:"Daily",kind:"build",icon:"📖"},
 {name:"Weekly reflection",area:"Growth",frequency:"Weekly",kind:"build",icon:"✨"},
 {name:"Drink water",area:"Health",frequency:"Daily",kind:"build",icon:"💧"},
 {name:"No late-night scrolling",area:"Self-control",frequency:"Daily",kind:"avoid",icon:"🌙"},
 {name:"Evening reflection",area:"Growth",frequency:"Daily",kind:"build",icon:"📝"},
 {name:"Stretch for 5 minutes",area:"Health",frequency:"Daily",kind:"build",icon:"🧘"},
 {name:"Plan tomorrow",area:"Personal",frequency:"Daily",kind:"build",icon:"🗓️"},
 {name:"Family quality time",area:"Family",frequency:"Weekly",kind:"build",icon:"💛"},
 {name:"Review weekly goals",area:"Business",frequency:"Weekly",kind:"build",icon:"🎯"},
];

type Edited = {name:string;frequency:string;target:number;kind:string;area:string;specificDays:string[]};

export default function HabitPlannerPage(){
 const [workspaceId,setWorkspaceId]=useState("");
 const [userId,setUserId]=useState("");
 const [today,setToday]=useState(todayInTZ());
 const [habits,setHabits]=useState<PlannerHabit[]>([]);
 const [logs,setLogs]=useState<PlannerLog[]>([]);
 const [selected,setSelected]=useState(todayInTZ());
 const [week,setWeek]=useState(mondayOf(todayInTZ()));
 const [area,setArea]=useState("All areas");
 const [search,setSearch]=useState("");
 const [showAll,setShowAll]=useState(false);
 const [statusFilter,setStatusFilter]=useState<"all"|"todo"|"done">("all");
 const [sortBy,setSortBy]=useState<HabitSortMode>("name");
 const [trendDays,setTrendDays]=useState<7|28>(28);
 const [showAllStarters,setShowAllStarters]=useState(false);
 const [compact,setCompact]=useState(false);
 const [motionEnabled,setMotionEnabled]=useState(true);
 const [celebratedId,setCelebratedId]=useState<string|null>(null);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState<Edited|null>(null);
 const [saving,setSaving]=useState<string|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const reload=useCallback(async()=>{
  try{
   const sb=supabaseBrowser();
   const ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspaceId("");setLoaded(true);return;}
   const timezone=await sb.from("profiles").select("timezone").eq("id",ctx.user.id).maybeSingle();
   const now=todayInTZ(timezone.data?.timezone||"Asia/Dubai");
   const since=shiftHabitDate(now,-180);
   const {data:rows,error:he}=await sb.from("habits")
    .select("id,name,area,frequency,target,kind,unit")
    .eq("workspace_id",ctx.workspaceId).order("created_at");
   if(he)throw he;
   const hs=(rows||[]) as PlannerHabit[];
   let history:PlannerLog[]=[];
   const ids=hs.map(h=>h.id);
   if(ids.length){
    // The habit list scoped to current workspace limits history to rows this user can access.
    const result=await sb.from("habit_logs").select("habit_id,date,value")
     .in("habit_id",ids).gte("date",since).lte("date",now);
    if(result.error)throw result.error;
    history=(result.data||[]) as PlannerLog[];
   }
   setWorkspaceId(ctx.workspaceId);
   setUserId(ctx.user.id);
   setToday(now);
   setHabits(hs);
   setLogs(history);
   setError("");
   setLoaded(true);
  }catch(e){setLoaded(true);setError(e instanceof Error?e.message:"Could not load planner. Please retry online.");}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 useRealtimeRefresh(["habits","habit_logs"],reload,Boolean(workspaceId));

 const dates=useMemo(()=>weekDates(week),[week]);
 const thisWeek=weekDates(today);
 const todayStats=dayProgress(habits,logs,today);
 const selectedStats=dayProgress(habits,logs,selected);
 const trend=useMemo(()=>plannerCompletionTrend(habits,logs,today,28),[habits,logs,today]);
 const visibleTrend=trend.slice(-trendDays);
 const measuredDays=trend.filter(x=>x.total>0);
 const rollingAverage=measuredDays.length?Math.round(measuredDays.reduce((sum,x)=>sum+x.done/x.total*100,0)/measuredDays.length):0;
 const last30=Array.from({length:30},(_,i)=>shiftHabitDate(today,i-29));
 const weeklyFinished=habits.filter(h=>periodProgress(h,logs,today).done>=periodProgress(h,logs,today).target).length;
 const available=habits.filter(h=>(area==="All areas"||h.area===area)&&h.name.toLowerCase().includes(search.trim().toLowerCase()))
  .filter(h=>showAll||habitDueOn(h,logs,selected)||logDone(logs,h.id,selected));
 const filtered=sortPlannerHabits(available,logs,last30,sortBy).filter(h=>
   statusFilter==="all"||(statusFilter==="done"?logDone(logs,h.id,selected):!logDone(logs,h.id,selected)));
 const completed=filtered.filter(h=>logDone(logs,h.id,selected));
 const remaining=filtered.filter(h=>!logDone(logs,h.id,selected));
 const pastLimit=shiftHabitDate(today,-180);

 async function toggle(h:PlannerHabit,day=selected){
  if(saving||day>today||day<pastLimit)return;
  setSaving(h.id);setError("");setNotice("");setCelebratedId(null);
  const wasDone=logDone(logs,h.id,day);
  try{
   const sb=supabaseBrowser();
   const result=wasDone?
    await sb.from("habit_logs").delete().eq("habit_id",h.id).eq("date",day):
    await sb.from("habit_logs").upsert({habit_id:h.id,date:day,value:1},{onConflict:"habit_id,date"});
   if(result.error)throw result.error;
   setNotice(wasDone?"Completion removed.":"Progress saved to your LifeOS workspace.");
   if(!wasDone)setCelebratedId(h.id);
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not save. Please retry.");await reload();}
  finally{setSaving(null);}
 }

 async function quickStart(starter:(typeof STARTERS)[number]){
  if(saving||!workspaceId||!userId)return;
  if(habits.some(h=>h.name.toLowerCase()===starter.name.toLowerCase())){
   setNotice(starter.name+" already exists in your planner.");return;
  }
  setSaving("starter");setError("");
  try{
   const sb=supabaseBrowser();
   const row={id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,
    name:starter.name,area:starter.area,frequency:starter.frequency,target:1,unit:"done",kind:starter.kind,
    privacy:starter.area==="Health"||starter.area==="Self-control"?"private":"family"};
   const {error:writeError}=await sb.from("habits").insert(row);
   if(writeError)throw writeError;
   setNotice("Added "+starter.name+" to your existing LifeOS habits.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not create habit.");}
  finally{setSaving(null);}
 }

 function startEdit(h:PlannerHabit){
  const isSpecific=h.frequency.startsWith("Specific days:");
  const specificDays=isSpecific?h.frequency.slice("Specific days:".length).split(",").filter(Boolean):["Mon","Wed","Fri"];
  setEditing(h.id);
  setDraft({name:h.name,frequency:isSpecific?"Specific days":h.frequency,target:Number(h.target||1),
    kind:h.kind||"build",area:h.area||"Personal",specificDays});
 }
 async function saveEdit(h:PlannerHabit){
  if(saving||!draft||!workspaceId)return;
  if(!draft.name.trim()){setError("Please enter a habit name.");return;}
  if(draft.frequency==="Specific days"&&!draft.specificDays.length){setError("Select at least one weekday.");return;}
  setSaving(h.id);setError("");
  try{
   const frequency=draft.frequency==="Specific days"?
    "Specific days:"+WEEKDAYS.filter(d=>draft.specificDays.includes(d)).join(","):draft.frequency;
   const payload={name:draft.name.trim(),frequency,area:draft.area,kind:draft.kind,
    target:draft.frequency==="X times per week"?Math.min(7,Math.max(1,draft.target)):1,
    privacy:draft.area==="Health"||draft.area==="Self-control"?"private":"family",
    updated_at:new Date().toISOString()};
   const sb=supabaseBrowser();
   const {error:writeError}=await sb.from("habits").update(payload)
    .eq("id",h.id).eq("workspace_id",workspaceId);
   if(writeError)throw writeError;
   setEditing(null);setDraft(null);setNotice("Habit schedule updated in Supabase.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not update habit.");}
  finally{setSaving(null);}
 }
 function changeWeek(direction:number){
  const next=shiftHabitDate(week,direction*7);
  if(next>mondayOf(today)||next<mondayOf(pastLimit))return;
  setWeek(next);
  setSelected(next===mondayOf(today)?today:next);
 }
 const monthLabel=new Date(week+"T12:00:00Z").toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"});
 const dateLabel=new Date(selected+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
 return <main className={"habit-planner"+(compact?" hp-compact":"")+(motionEnabled?"":" hp-no-motion")}>
  <BackHome/>
  <header className="hp-head">
   <div><span className="hp-eyebrow">✳ LIFEOS · HABIT STUDIO</span>
    <h1>Plan it. Track it.<br/><em>Become it.</em></h1>
    <p>Your habits, milestones and progress — synced with your existing LifeOS workspace.</p>
   </div>
   <div className="hp-head-actions">
    <Link className="hp-outline" href="/habits">↗ Habit overview</Link>
    <Link className="hp-outline" href="/today">Today's plan ↗</Link>
    <Link className="hp-action" href="/automations">Reminders →</Link>
   </div>
  </header>
  {error&&<p className="hp-alert" role="alert">{error}</p>}
  {notice&&<p className="hp-message" role="status">{notice}</p>}
  {!loaded?<div className="hp-empty">Loading your private workspace…</div>:
  !workspaceId?<div className="hp-empty">Restoring your private LifeOS workspace. Please retry if the connection is unavailable. <button className="hp-outline" type="button" onClick={()=>void reload()}>Retry</button></div>:
  <>
   <section className="hp-stats" aria-label="Progress overview">
    <div className="hp-stat hp-primary"><span>TODAY'S SCORE</span><strong>{todayStats.total?Math.round(todayStats.done/todayStats.total*100):0}%</strong><small>{todayStats.done} of {todayStats.total} planned habits done</small></div>
    <div className="hp-stat"><span>WEEKLY GOALS</span><strong>{weeklyFinished}<small>/{habits.length}</small></strong><small>period targets met</small></div>
    <div className="hp-stat"><span>28-DAY TREND</span><strong>{rollingAverage}%</strong><small>daily completion average</small></div>
    <div className="hp-stat"><span>YOUR ROUTINES</span><strong>{habits.length}</strong><small>synced habits in your workspace</small></div>
   </section>
   <section className="hp-main-grid">
    <div className="hp-board">
     <div className="hp-panel-heading">
      <div><span>THIS IS YOUR PLAN</span><h2>Weekly planner</h2></div>
      <div className="hp-week-nav"><button type="button" className="hp-jump-today" onClick={()=>{setWeek(mondayOf(today));setSelected(today);}}>Today</button><button type="button" aria-label="Previous week" onClick={()=>changeWeek(-1)} disabled={week<=mondayOf(pastLimit)}>‹</button><b>{monthLabel}</b><button type="button" aria-label="Next week" onClick={()=>changeWeek(1)} disabled={week>=mondayOf(today)}>›</button></div>
     </div>
     <div className="hp-weekdays" role="group" aria-label="Choose a day">
      {dates.map((d,i)=>{
       const count=dayProgress(habits,logs,d);
       const isFuture=d>today;
       return <button type="button" key={d} aria-pressed={selected===d} className={"hp-weekday"+(selected===d?" active":"")+(d===today?" today":"")}
         onClick={()=>setSelected(d)} title={d+(isFuture?" (upcoming)":"")}>
         <span>{WEEKDAYS[i]}</span><b>{Number(d.slice(-2))}</b><small>{count.total?count.done+"/"+count.total:"—"}</small>
       </button>;
      })}
     </div>
     <div className="hp-selected">
      <div><span>DAILY CHECKLIST</span><h3>{dateLabel}</h3><p>{selected>today?"Upcoming plan — future completions cannot be logged":selectedStats.done+" of "+selectedStats.total+" due habits completed"}</p></div>
      <div className="hp-progress"><span style={{width:(selectedStats.total?Math.round(selectedStats.done/selectedStats.total*100):0)+"%"}}/></div>
     </div>
     <div className="hp-controls">
      <label className="hp-search">Search <input type="search" placeholder="Search routines…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label className="hp-area">Life area <select value={area} onChange={e=>setArea(e.target.value)}>{AREAS.map(a=><option key={a}>{a}</option>)}</select></label>
      <label className="hp-showall"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/> Show all schedules</label>
      <label className="hp-sort">Sort by <select aria-label="Sort habits" value={sortBy} onChange={e=>setSortBy(e.target.value as HabitSortMode)}><option value="name">Name</option><option value="streak">Best streak</option><option value="consistency">Consistency</option></select></label>
     </div>
     <div className="hp-display-bar">
      <div className="hp-status-tabs" role="group" aria-label="Filter habits by completion">
       {([{id:"all",label:"All"},{id:"todo",label:"To do"},{id:"done",label:"Completed"}] as const).map(tab=>
         <button type="button" key={tab.id} aria-pressed={statusFilter===tab.id} onClick={()=>setStatusFilter(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="hp-preference-actions">
       <button type="button" aria-pressed={compact} onClick={()=>setCompact(v=>!v)} title="Toggle compact habit cards">▤ {compact?"Comfortable":"Compact"}</button>
       <button type="button" aria-pressed={motionEnabled} onClick={()=>setMotionEnabled(v=>!v)} title="Toggle decorative animations">✦ Motion {motionEnabled?"on":"off"}</button>
      </div>
     </div>
     {habits.length===0?<div className="hp-empty">No routines yet. Choose a starter below, or <Link href="/habits">create a custom habit</Link>.</div>:
      filtered.length===0?<div className="hp-empty">No habits match these filters. <button type="button" className="hp-outline" onClick={()=>{setSearch("");setArea("All areas");setShowAll(true);setStatusFilter("all");}}>Show all habits</button></div>:
      <>
       {statusFilter!=="done"&&<h4 className="hp-list-heading">To do <span>{remaining.length}</span></h4>}
       {statusFilter!=="done"&&(remaining.length?remaining.map(h=>renderHabit(h)): <div className="hp-done-state">✦ You're all caught up for this day.</div>)}
       {!!completed.length&&<><h4 className="hp-list-heading">Completed <span>{completed.length}</span></h4>{completed.map(h=>renderHabit(h))}</>}
      </>}
    </div>
    <aside className="hp-aside">
     <div className="hp-aside-box"><span className="hp-aside-eyebrow">YOUR MOMENTUM</span><div className="hp-insights-heading"><h3>Last {trendDays} days</h3><div role="group" aria-label="History range" className="hp-trend-switch"><button type="button" aria-pressed={trendDays===7} onClick={()=>setTrendDays(7)}>7d</button><button type="button" aria-pressed={trendDays===28} onClick={()=>setTrendDays(28)}>28d</button></div></div>
      <div className="hp-trend" aria-label="Daily completion history">
       {visibleTrend.map(d=><button type="button" key={d.date} aria-label={d.date+": "+d.done+" of "+d.total+" completed"}
        title={d.date+" · "+d.done+"/"+d.total} className={"hp-trend-day"+(d.date===today?" today":"")}
        style={{opacity:d.total?(d.done/d.total>0?Math.max(.35,d.done/d.total):.14):.10}}
        onClick={()=>{setWeek(mondayOf(d.date));setSelected(d.date);}}/>)}
      </div>
      <p>Each square shows real completion data — no generated history or estimates.</p>
     </div>
     <div className="hp-aside-box"><span className="hp-aside-eyebrow">QUICK START</span><h3>Build a routine</h3>
      <p>Ready-to-use habits, stored in the same Supabase habits table.</p>
      {(showAllStarters?STARTERS:STARTERS.slice(0,5)).map(starter=><button key={starter.name} type="button" disabled={saving!==null}
       className="hp-starter" onClick={()=>void quickStart(starter)}>
       <span>{starter.icon}</span><b>{starter.name}</b><span>{habits.some(h=>h.name.toLowerCase()===starter.name.toLowerCase())?"Added ✓":"+"}</span>
      </button>)}
      <button type="button" className="hp-link hp-more-starters" aria-expanded={showAllStarters} onClick={()=>setShowAllStarters(v=>!v)}>{showAllStarters?"Show fewer templates ↑":"Explore 5 more templates ↓"}</button>
      <Link className="hp-link" href="/habits">Create a custom habit →</Link>
     </div>
     <div className="hp-aside-box"><span className="hp-aside-eyebrow">YOUR CONNECTED MODULES</span><h3>One connected LifeOS</h3>
      <p>Health planner, focus, notifications and goals remain in their existing LifeOS modules. No duplicate databases.</p>
      <div className="hp-module-links"><Link href="/health-planner">Health planner ↗</Link><Link href="/goals">Goals ↗</Link><Link href="/notifications">Notifications ↗</Link></div>
     </div>
    </aside>
   </section>
  </> }
 </main>;

 function renderHabit(h:PlannerHabit){
  const done=logDone(logs,h.id,selected);
  const frequencyDays=Array.from({length:30},(_,i)=>shiftHabitDate(today,i-29));
  const values:Record<string,number>={};
  for(const l of logs)if(l.habit_id===h.id)values[l.date]=Number(l.value);
  const consistency=habitConsistencyForFrequency(values,frequencyDays,h.frequency,Number(h.target||1));
  const streak=habitPeriodStreak(values,frequencyDays,h.frequency,Number(h.target||1));
  const recovery=recoveryScore(values,frequencyDays,h.frequency,Number(h.target||1));
  const period=periodProgress(h,logs,selected);
  const cannotLog=selected>today||selected<pastLimit||saving!==null||(!scheduledForDay(h.frequency,selected)&&!done);
  const isSpecific=h.frequency.startsWith("Specific days:");
  return <article className={"hp-habit"+(done?" completed":"")+(celebratedId===h.id?" hp-celebrate":"")} key={h.id}>
   <div className="hp-habit-main">
    <button type="button" className="hp-check" disabled={cannotLog} aria-pressed={done}
      aria-label={(done?"Undo ":"Complete ")+h.name+" on "+selected} onClick={()=>void toggle(h)}>{done?"✓":"+"}</button>
    <div className="hp-habit-details"><h4>{h.name}</h4><p>{h.area||"Personal"} · {isSpecific?"Selected weekdays":h.frequency} · {h.kind==="avoid"?"Avoid":h.kind==="reduce"?"Reduce":h.kind==="limit"?"Limit":h.kind==="replace"?"Replace":"Build"}</p>
     <div className="hp-habit-metrics"><span>✦ {streak} streak</span><span>↗ {consistency}% consistency</span><span>↺ {recovery}% recovery</span>{["Weekly","Monthly","X times per week"].includes(h.frequency)&&<span>◎ {period.done}/{period.target} period</span>}</div>
    </div>
    <button type="button" className="hp-edit" aria-label={"Edit "+h.name} aria-expanded={editing===h.id} onClick={()=>{if(editing===h.id){setEditing(null);setDraft(null);}else startEdit(h);}}>Edit</button>
   </div>
   {editing===h.id&&draft&&<form className="hp-edit-form" onSubmit={e=>{e.preventDefault();void saveEdit(h);}}>
    <label>Name<input value={draft.name} maxLength={110} onChange={e=>setDraft(v=>v&&({...v,name:e.target.value}))}/></label>
    <label>Area<select value={draft.area} onChange={e=>setDraft(v=>v&&({...v,area:e.target.value}))}>{AREAS.slice(1).map(a=><option key={a}>{a}</option>)}</select></label>
    <label>Frequency<select value={draft.frequency} onChange={e=>setDraft(v=>v&&({...v,frequency:e.target.value}))}>{["Daily","Weekly","X times per week","Monthly","Specific days"].map(a=><option key={a}>{a}</option>)}</select></label>
    {draft.frequency==="X times per week"&&<label>Times / week<input type="number" min={1} max={7} value={draft.target} onChange={e=>setDraft(v=>v&&({...v,target:Number(e.target.value)}))}/></label>}
    {draft.frequency==="Specific days"&&<div className="hp-edit-days"><span>Repeat on:</span>{WEEKDAYS.map(d=><button type="button" key={d} aria-pressed={draft.specificDays.includes(d)} onClick={()=>setDraft(v=>v&&({...v,specificDays:v.specificDays.includes(d)?v.specificDays.filter(x=>x!==d):[...v.specificDays,d]}))}>{d}</button>)}</div>}
    <label>Type<select value={draft.kind} onChange={e=>setDraft(v=>v&&({...v,kind:e.target.value}))}>{["build","reduce","limit","avoid","replace"].map(a=><option key={a}>{a}</option>)}</select></label>
    <div className="hp-edit-actions"><button type="button" className="hp-outline" onClick={()=>{setEditing(null);setDraft(null);}}>Cancel</button><button type="submit" className="hp-action" disabled={saving!==null}>Save changes</button></div>
   </form>}
  </article>;
 }
}
