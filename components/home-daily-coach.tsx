"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabaseBrowser} from "@/lib/supabase/client";
import {currentWorkspace} from "@/lib/supabase/workspace";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {dayProgress,type PlannerHabit,type PlannerLog} from "@/lib/habit-planner";
import {dailyCoachSummary,dailyCoachTips,type DailyCoachSnapshot} from "@/lib/daily-coach";
import {todayInTZ} from "@/lib/timezone";
import {localHHMM,medicineDoseState,ownCareRoutines,isRoutineTaken,type QuickRoutine,type QuickRoutineLog} from "@/lib/home-health-quick";
import {totalsForFoodLogs,type FoodIntakeRecord} from "@/lib/nutrition";
import "./home-daily-coach.css";

type CoachTask={name:string;status:string;deadline:string|null;completed_at:string|null;importance:number|null};
const initial=(date:string):DailyCoachSnapshot=>({
 date,tasks:{open:0,dueToday:0,overdue:0,completedToday:0,overdueTitles:[],topTitles:[]},
 habits:{due:0,done:0},water:{loggedMl:0,goalMl:2500},
 nutrition:{proteinG:null,entries:0,available:false},
 medicines:{scheduled:0,taken:0,overdue:0},hair:{routines:0,done:0}
});

export function HomeDailyCoach({timeZone="Asia/Dubai"}:{timeZone?:string}){
 const today=todayInTZ(timeZone);
 const[workspaceId,setWorkspaceId]=useState("");
 const[snapshot,setSnapshot]=useState<DailyCoachSnapshot>(initial(today));
 const[taskNames,setTaskNames]=useState<{title:string;due:string|null;score:number}[]>([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[insight,setInsight]=useState("");
 const[provider,setProvider]=useState("");
 const[asking,setAsking]=useState(false);
 const[clock,setClock]=useState(()=>new Date());
 const load=useCallback(async()=>{
  try{
   const sb=supabaseBrowser(),ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspaceId("");setLoading(false);return;}
   const todayDate=todayInTZ(timeZone);
   const start=new Date(todayDate+"T12:00:00Z");start.setUTCDate(start.getUTCDate()-8);
   const weekStart=start.toISOString().slice(0,10);
   const [tasks,habits,water,routines,healthLogs,food,habitLogs]=await Promise.all([
    sb.from("tasks").select("name,status,deadline,completed_at,importance").eq("workspace_id",ctx.workspaceId).limit(350),
    sb.from("habits").select("id,name,area,frequency,target,kind,unit").eq("workspace_id",ctx.workspaceId).limit(250),
    sb.from("water_logs").select("amount_ml").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",todayDate),
    sb.from("health_routines").select("id,title,kind,active,created_by,days_of_week,reminder_times,start_date,end_date,details").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("active",true).in("kind",["water","medicine","other"]),
    sb.from("health_routine_logs").select("routine_id,date,scheduled_time,status").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",todayDate),
    sb.from("food_intake_logs").select("id,date,food_key,food_name,quantity_g,estimated_nutrients,meal_type,created_at").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",todayDate),
    sb.from("habit_logs").select("habit_id,date,value").gte("date",weekStart).lte("date",todayDate).limit(1500)
   ]);
   for(const q of [tasks,habits,water,routines,healthLogs,habitLogs])if(q.error)throw q.error;
   const taskRows=(tasks.data||[]) as CoachTask[];
   const open=taskRows.filter(x=>!["Completed","Cancelled"].includes(x.status));
   const overdue=open.filter(x=>x.deadline&&x.deadline<todayDate).sort((a,b)=>String(a.deadline).localeCompare(String(b.deadline)));
   const completedToday=taskRows.filter(t=>t.status==="Completed"&&t.completed_at&&todayInTZ(timeZone,new Date(t.completed_at))===todayDate).length;
   const hs=(habits.data||[]) as PlannerHabit[];
   const hp=dayProgress(hs,(habitLogs.data||[]) as PlannerLog[],todayDate);
   const rr=(routines.data||[]) as QuickRoutine[];
   const hl=(healthLogs.data||[]) as QuickRoutineLog[];
   const meds=ownCareRoutines(rr,ctx.user.id,todayDate,"medicine");
   const care=ownCareRoutines(rr,ctx.user.id,todayDate,"hair");
   const now=localHHMM(timeZone,new Date());
   const slots=meds.flatMap(r=>r.reminder_times.map(time=>({
    routine:r,time,state:medicineDoseState(time,now,isRoutineTaken(hl,r.id,todayDate,time))
   })));
   const fr=food.error?[]:(food.data||[]) as FoodIntakeRecord[];
   const protein=totalsForFoodLogs(fr).protein_g;
   const savedGoal=rr.find(x=>x.kind==="water")?.details?.daily_goal_ml;
   const goal=typeof savedGoal==="number"&&savedGoal>=250&&savedGoal<=10000?savedGoal:2500;
   const snap:DailyCoachSnapshot={
    date:todayDate,
    tasks:{open:open.length,dueToday:open.filter(t=>t.deadline===todayDate).length,
      overdue:overdue.length,completedToday,
      overdueTitles:overdue.slice(0,3).map(t=>t.name),
      topTitles:open.slice(0,5).map(t=>t.name)},
    habits:{due:hp.total,done:hp.done},
    water:{loggedMl:(water.data||[]).reduce((n,x)=>n+Number(x.amount_ml||0),0),goalMl:goal},
    nutrition:{proteinG:protein==null?null:protein,entries:fr.length,available:!food.error},
    medicines:{scheduled:slots.length,taken:slots.filter(x=>x.state==="taken").length,
      overdue:slots.filter(x=>x.state==="overdue"||x.state==="due-now").length},
    hair:{routines:care.length,done:care.filter(x=>isRoutineTaken(hl,x.id,todayDate,"")).length}
   };
   setTaskNames(open.filter(x=>!["Blocked","Waiting"].includes(x.status)).sort((a,b)=>Number(b.importance||0)-Number(a.importance||0)).slice(0,10).map(x=>({title:x.name,due:x.deadline,score:Math.max(0,Math.min(100,Number(x.importance||1)*20))})));
   setSnapshot(snap);setWorkspaceId(ctx.workspaceId);setError("");setLoading(false);
  }catch(e){setError(e instanceof Error?e.message:"Daily Brief could not load from Supabase.");setLoading(false);}
 },[timeZone]);
 useEffect(()=>{void load();},[load,clock]);
 useEffect(()=>{const id=window.setInterval(()=>setClock(new Date()),60000);return()=>window.clearInterval(id);},[]);
 useRealtimeRefresh(["tasks","habits","habit_logs","water_logs","food_intake_logs","health_routines","health_routine_logs"],load,Boolean(workspaceId));
 const tips=useMemo(()=>dailyCoachTips(snapshot),[snapshot]);
 const summary=useMemo(()=>dailyCoachSummary(snapshot),[snapshot]);
 async function askAi(){
  if(asking||!workspaceId)return;
  setAsking(true);setError("");setInsight("");
  try{
   // Explicit user action only: task names and aggregate health totals may be
   // sent to the configured AI provider. Never send lab values, medication names or doses.
   const context={
    today_tasks:taskNames.slice(0,10),
    overdue_tasks:snapshot.tasks.overdueTitles.map(title=>({title,days:1})),
    money_due:[],active_goals:[],upcoming_family:[],migration_blockers:[],
    daily_health:{habits_done:snapshot.habits.done,habits_due:snapshot.habits.due,
      water_logged_ml:snapshot.water.loggedMl,water_user_goal_ml:snapshot.water.goalMl,
      protein_estimated_g:snapshot.nutrition.proteinG,
      medicine_slots_unlogged:snapshot.medicines.scheduled-snapshot.medicines.taken,
      hair_care_done:snapshot.hair.done,hair_care_count:snapshot.hair.routines}
   };
   const r=await fetch("/api/ai/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    question:"Give me a short, actionable coaching plan for today. Prioritize due work, unfinished habits and factual health logs. Do not suggest medicines, dosing or diagnose illness. No invented achievements.",
    context
   })});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"AI coach unavailable.");
   setInsight(data.answer);setProvider(data.label||"Coach response");
  }catch(e){setError(e instanceof Error?e.message:"Could not get coaching suggestion.");}
  finally{setAsking(false);}
 }
 return <section className="lifeos-daily-coach" aria-label="AI Personal Coach daily brief">
  <div className="coach-top"><div><span>✦ AI PERSONAL COACH</span><h2>Today's LifeOS brief</h2><p>Based on your actual tasks, habits and private health activity; refreshed from Supabase.</p></div><Link href="/coach">Full AI Coach ↗</Link></div>
  {error&&<p className="coach-error" role="alert">{error}</p>}
  {loading?<p className="coach-loading">Compiling your recorded day…</p>:!workspaceId?<p className="coach-loading">Sign in to see your personal daily brief.</p>:
   <>
    <div className="coach-stats">
     <div><b>{snapshot.tasks.completedToday}</b><span>Tasks done today</span></div>
     <div><b>{snapshot.tasks.overdue}</b><span>Overdue work</span></div>
     <div><b>{snapshot.habits.done}/{snapshot.habits.due}</b><span>Habits done</span></div>
     <div><b>{snapshot.water.loggedMl} ml</b><span>Water recorded</span></div>
    </div>
    <p className="coach-summary">{summary}</p>
    <div className="coach-tips">{tips.slice(0,4).map(t=><Link key={t.title} href={t.href} className="coach-tip"><span>✦</span><div><strong>{t.title}</strong><small>{t.detail}</small></div><span>↗</span></Link>)}</div>
    <div className="coach-actions">
     <button type="button" disabled={asking} onClick={()=>void askAi()}>{asking?"Thinking…":"Ask AI to improve my day ✦"}</button>
     <Link href="/notifications">Reminders & alerts ↗</Link>
    </div>
    <p className="coach-disclosure">Daily counts and suggestions are automatically calculated from recorded data (not AI-generated facts). Clicking Ask AI sends task titles and aggregate health counts to your configured AI provider; no lab results or medicine names are included.</p>
    {insight&&<div className="coach-ai-answer"><small>{provider}</small><p>{insight}</p></div>}
   </>
  }
 </section>;
}
