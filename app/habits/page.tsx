"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./habits-v2.css";
import { ProgressHalo } from "@/components/progress-halo";
import { BackHome, Panel } from "@/components/ui";
import { habitConsistencyForFrequency,habitPeriodStreak,recoveryScore } from "@/lib/habits";
import { loadOfflineCache,saveOfflineCache,isProbablyNetworkError } from "@/lib/offline";
import { queueUpsert } from "@/lib/sync-queue";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace,peekWorkspaceContext } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Habit={id:string;name:string;area:string|null;frequency:string;target:number|null;unit:string|null;kind:string|null};
type Log={habit_id:string;date:string;value:number};type Cache={habits:Habit[];logs:Log[]};
function lastDays(n:number){const today=todayInTZ();return Array.from({length:n},(_,i)=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-(n-1-i));return d.toISOString().slice(0,10);});}

export default function HabitsPage(){
 const cachedWorkspace=peekWorkspaceContext();const[workspaceId,setWorkspaceId]=useState(cachedWorkspace?.workspaceId||"");const[userId,setUserId]=useState(cachedWorkspace?.user.id||"");const[habits,setHabits]=useState<Habit[]>([]);const[logs,setLogs]=useState<Log[]>([]);const[name,setName]=useState("");const[area,setArea]=useState("Health");const[frequency,setFrequency]=useState("Daily");const[target,setTarget]=useState(1);const[specificDays,setSpecificDays]=useState<string[]>(["Mon","Wed","Fri"]);const[kind,setKind]=useState("build");const[error,setError]=useState("");const[notice,setNotice]=useState("");const[offline,setOffline]=useState(false);const[showComposer,setShowComposer]=useState(false);const days=useMemo(()=>lastDays(30),[]);
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){const c=loadOfflineCache<Cache>("habits");if(c){setHabits(c.habits);setLogs(c.logs);setOffline(true);}else setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const[h,l]=await Promise.all([sb.from("habits").select("id,name,area,frequency,target,unit,kind").eq("workspace_id",ctx.workspaceId).order("created_at"),sb.from("habit_logs").select("habit_id,date,value").gte("date",days[0]).lte("date",days[days.length-1])]);if(h.error)throw h.error;if(l.error)throw l.error;const bundle={habits:(h.data||[]) as Habit[],logs:(l.data||[]) as Log[]};setHabits(bundle.habits);setLogs(bundle.logs);saveOfflineCache("habits",bundle);setOffline(false);}catch(e){const c=loadOfflineCache<Cache>("habits");if(c){setHabits(c.habits);setLogs(c.logs);setOffline(true);setNotice("Offline habit cache shown.");}else setError(e instanceof Error?e.message:"Could not load habits");}},[days]);useEffect(()=>{void load();},[load]);useRealtimeRefresh(["habits","habit_logs"],load,Boolean(workspaceId));
 async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!name.trim())return;setError("");setNotice("");const id=crypto.randomUUID();const storedFrequency=frequency==="Specific days"?`Specific days:${specificDays.join(",")}`:frequency;const row={id,workspace_id:workspaceId,created_by:userId,name:name.trim(),area,frequency:storedFrequency,target:Math.max(1,target),unit:"done",kind,privacy:area==="Health"||area==="Self-control"?"private":"family"};try{const sb=supabaseBrowser();const{error:q}=await sb.from("habits").insert(row);if(q)throw q;setName("");await load();}catch(e){if(isProbablyNetworkError(e)){queueUpsert("habits",row,`habits:${id}`);const next=[...habits,{id,name:row.name,area,frequency:storedFrequency,target:Math.max(1,target),unit:"done",kind}];setHabits(next);saveOfflineCache("habits",{habits:next,logs});setName("");setNotice("Habit saved offline and queued for sync.");}else setError(e instanceof Error?e.message:"Could not save habit");}}
 async function toggle(h:Habit){if(offline){const date=todayInTZ();const existing=logs.find(x=>x.habit_id===h.id&&x.date===date);if(existing){setNotice("Removing an existing habit log needs a connection.");return;}const id=crypto.randomUUID();const row={id,habit_id:h.id,date,value:1};queueUpsert("habit_logs",row,`habit_logs:${id}`);const next=[...logs,{habit_id:h.id,date,value:1}];setLogs(next);saveOfflineCache("habits",{habits,logs:next});setNotice("Habit completion saved offline and queued.");return;}const date=todayInTZ();const existing=logs.find(x=>x.habit_id===h.id&&x.date===date);const sb=supabaseBrowser();if(existing){const{error:q}=await sb.from("habit_logs").delete().eq("habit_id",h.id).eq("date",date);if(q)setError(q.message);}else{const{error:q}=await sb.from("habit_logs").upsert({habit_id:h.id,date,value:1},{onConflict:"habit_id,date"});if(q)setError(q.message);}await load();}

 const today=todayInTZ();
 const doneToday=habits.filter(h=>logs.some(l=>l.habit_id===h.id&&l.date===today&&Number(l.value)>0)).length;
 const completionPct=habits.length?Math.round(doneToday/habits.length*100):0;
 const longestActiveStreak=habits.reduce((best,h)=>{
   const map:Record<string,number>={};
   logs.filter(l=>l.habit_id===h.id).forEach(l=>map[l.date]=Number(l.value));
   return Math.max(best,habitPeriodStreak(map,days,h.frequency,Number(h.target||1)));
 },0);
 const weeklyDays=days.slice(-7);
 const areaIcons:Record<string,string>={Health:"🌿",Business:"💼",Family:"💛",Growth:"✨",Europe:"🌍",Personal:"☀️","Self-control":"🧘"};
 return (
  <main className="habits-v2">
   <BackHome/>
   <header className="habit-heading">
    <div>
     <span className="habit-overline">Your daily rhythm</span>
     <h1>Your daily momentum.</h1>
     <p className="habit-lede">Your daily progress, beautiful and simple. Build consistency one moment at a time.</p>
    </div>
    <div className="habit-heading-actions"><Link href="/habits/planner" className="habit-add-btn habit-planner-link">Open advanced planner ↗</Link><button type="button" className="habit-add-btn" onClick={()=>setShowComposer(v=>!v)} aria-expanded={showComposer} aria-controls="habit-new-form">
     <span aria-hidden="true">{showComposer?"−":"+"}</span>{showComposer?"Close form":"New habit"}
    </button></div>
   </header>
   {error&&<p role="alert" className="habit-feedback error">{error}</p>}
   {notice&&<p role="status" className="habit-feedback">{notice}</p>}
   {!workspaceId&&!habits.length?(
    <section className="habit-empty habit-signin">Sign in to view and track your habits. <Link href="/login">Login →</Link></section>
   ):(
    <>
     <section className="habit-dashboard" aria-label="Daily progress overview">
      <div className="habit-summary">
       <div className="habit-summary-copy">
        <span className="habit-summary-label">TODAY'S PROGRESS</span>
        <h2>{completionPct===100&&habits.length?"You're on a roll!":"Keep your momentum going."}</h2>
        <p>{habits.length?doneToday+" of "+habits.length+" habits completed today.":"Create your first habit and start your journey today."} {completionPct===100&&habits.length?"Wonderful work!":"You've got this."}</p>
       </div>
       <ProgressHalo value={completionPct} label="TODAY" caption="Every little win counts" compact/>
      </div>
      <div className="habit-metrics">
       <div className="habit-metric">
        <span className="habit-metric-icon" aria-hidden="true">✓</span>
        <div><strong>{doneToday}/{habits.length}</strong><p>Habits done today</p></div>
       </div>
       <div className="habit-metric">
        <span className="habit-metric-icon" aria-hidden="true">✦</span>
        <div><strong>{longestActiveStreak}</strong><p>Best current period streak</p></div>
       </div>
      </div>
     </section>
     {showComposer&&(
      <section id="habit-new-form" className="habit-editor" aria-label="Create a habit">
       <div className="habit-editor-head"><h2>Create a new habit</h2><button type="button" className="habit-close" onClick={()=>setShowComposer(false)} aria-label="Close habit form">×</button></div>
       <form onSubmit={add} className="habit-form">
        <div className="habit-field wide"><label htmlFor="habit-name">Habit name</label><input id="habit-name" required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Read for 20 minutes"/></div>
        <div className="habit-field"><label htmlFor="habit-area">Life area</label><select id="habit-area" value={area} onChange={e=>setArea(e.target.value)}>{["Health","Business","Family","Growth","Europe","Personal","Self-control"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="habit-field"><label htmlFor="habit-frequency">Frequency</label><select id="habit-frequency" value={frequency} onChange={e=>setFrequency(e.target.value)}>{["Daily","Weekly","Specific days","X times per week","Monthly"].map(x=><option key={x}>{x}</option>)}</select></div>
        {frequency==="X times per week"&&<div className="habit-field wide"><label htmlFor="habit-target">Target per week</label><input id="habit-target" type="number" min="1" max="7" value={target} onChange={e=>setTarget(Number(e.target.value))}/></div>}
        {frequency==="Specific days"&&<div className="habit-field wide"><span className="habit-field-label">Repeat on</span><div className="habit-days">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><button type="button" key={d} className="habit-day-choice" aria-pressed={specificDays.includes(d)} onClick={()=>setSpecificDays(v=>v.includes(d)?v.filter(x=>x!==d):[...v,d])}>{d}</button>)}</div></div>}
        <div className="habit-field wide"><label htmlFor="habit-kind">Habit style</label><select id="habit-kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="build">Build habit</option><option value="reduce">Reduce habit</option><option value="limit">Limit habit</option><option value="avoid">Avoid habit</option><option value="replace">Replace habit</option></select></div>
        <button className="habit-add-btn habit-save" disabled={!workspaceId} type="submit">Save habit →</button>
       </form>
      </section>
     )}
     <div className="habit-section-heading">
      <h2>Your habits</h2>
      <span>{habits.length} active {habits.length===1?"habit":"habits"}</span>
     </div>
     {habits.length===0?(
      <section className="habit-empty">
       <span className="habit-empty-icon" aria-hidden="true">🌱</span>
       <h2>Every journey starts somewhere.</h2>
       <p>Add one small daily habit and watch your progress grow.</p>
       {!showComposer&&<button type="button" className="habit-add-btn" onClick={()=>setShowComposer(true)}>+ Create your first habit</button>}
      </section>
     ):(
      <section className="habit-list" aria-label="Habit checklist">
       {habits.map(h=>{
        const map:Record<string,number>={};
        logs.filter(l=>l.habit_id===h.id).forEach(l=>map[l.date]=Number(l.value));
        const done=Boolean(map[today]);
        const consistency=habitConsistencyForFrequency(map,days,h.frequency,Number(h.target||1));
        const streak=habitPeriodStreak(map,days,h.frequency,Number(h.target||1));
        const recovery=recoveryScore(map,days,h.frequency,Number(h.target||1));
        return <article key={h.id} data-area={h.area||"Personal"} className={done?"habit-card habit-card-done":"habit-card"}>
         <div className="habit-card-top">
          <span className="habit-category-icon" aria-hidden="true">{areaIcons[h.area||""]||"⭐"}</span>
          <div className="habit-card-title">
           <h3>{h.name}</h3>
           <p className="habit-card-sub">{h.area||"Personal"} · {h.kind==="reduce"?"Reduce":h.kind==="limit"?"Limit":h.kind==="avoid"?"Avoid":h.kind==="replace"?"Replace":"Build"} · {h.frequency}</p>
          </div>
          <button type="button" className="habit-toggle" aria-label={(done?"Undo completion for ":"Mark as done: ")+h.name} aria-pressed={done} onClick={()=>void toggle(h)}>
           {done?"✓":"+"}
          </button>
         </div>
         <div className="habit-heatmap" aria-label="Last 14 days">
          {days.slice(-14).map(d=><span key={d} className="habit-heat" title={d} aria-label={map[d]?"Completed":"Not completed"}/>)}
         </div>
         <div className="habit-card-footer">
          <span className="habit-pill">↗ {consistency}% consistency</span>
          <span className="habit-pill">✦ {streak} streak</span>
          <span className="habit-pill">↺ {recovery}% recovery</span>
         </div>
        </article>;
       })}
      </section>
     )}
     <section className="habit-week" aria-label="Your last seven days">
      {weeklyDays.map(d=>{
       const count=logs.filter(l=>l.date===d&&Number(l.value)>0&&habits.some(h=>h.id===l.habit_id)).length;
       return <div className="habit-week-day" key={d}>
        <span>{new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"})}</span>
        <b className={(count?"has-done ":"")+(d===today?"is-today":"")} title={count+" habits done on "+d}>{count?"✓":Number(d.slice(-2))}</b>
       </div>;
      })}
     </section>
    </>
   )}
  </main>
 );
}
