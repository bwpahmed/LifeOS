"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { priorityScore,type TaskStatus } from "@/lib/priority";
import { remaining } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { LifeClock } from "@/components/life-clock";

type Task={
  id:string;name:string;area:string|null;status:TaskStatus;importance:number|null;
  deadline:string|null;financial_value:number|null;goal_id:string|null;blocked_by:string|null;
  created_at:string|null;waiting_for:string|null;start_date:string|null;estimate_min:number|null
};
type Rec={id:string;total:number;due_date:string|null;status:string;receivable_payments:{amount:number;date:string}[]};
type Habit={id:string;name:string;area:string|null};
type Doc={id:string;name:string;status:string;expiry_date:string|null};
type Goal={id:string;name:string;progress:number|null;status:string};
type FamilyTask={id:string;title:string;due_date:string|null;status:string;reminder_days:number|null};
type WasteLesson={id:string;amount:number;category:string;merchant:string|null;avoid_next_time:string|null;waste_reason:string|null;date:string};

function isoAddDays(iso:string,days:number){
  const d=new Date(iso+"T12:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function weekStart(iso:string){
  const d=new Date(iso+"T12:00:00");
  const mondayOffset=(d.getDay()+6)%7;
  d.setDate(d.getDate()-mondayOffset);
  return d.toISOString().slice(0,10);
}
function daysBetween(from:string|null,to:string){
  if(!from)return 0;
  return Math.max(0,Math.floor((new Date(to+"T12:00:00").getTime()-new Date(from+"T12:00:00").getTime())/86400000));
}
function clamp(n:number,min=0,max=100){return Math.max(min,Math.min(max,n));}
function aed(n:number){return "AED "+Math.round(n).toLocaleString("en-US");}

export default function Home(){
  const[signedIn,setSignedIn]=useState<boolean|null>(null);
  const[workspaceId,setWorkspaceId]=useState("");
  const[tasks,setTasks]=useState<Task[]>([]);
  const[recs,setRecs]=useState<Rec[]>([]);
  const[habits,setHabits]=useState<Habit[]>([]);
  const[habitDone,setHabitDone]=useState<Set<string>>(new Set());
  const[focusWeek,setFocusWeek]=useState(0);
  const[familyTasks,setFamilyTasks]=useState<FamilyTask[]>([]);
  const[docs,setDocs]=useState<Doc[]>([]);
  const[goals,setGoals]=useState<Goal[]>([]);
  const[completedWeek,setCompletedWeek]=useState(0);
  const[activityWeek,setActivityWeek]=useState(0);
  const[wasteMonth,setWasteMonth]=useState(0);
  const[wasteLessons,setWasteLessons]=useState<WasteLesson[]>([]);
  const[homeWidgets,setHomeWidgets]=useState<string[]>(["top3","money","health","habits","focus","family","europe","business","calendar","alerts","waiting","goals","week","waste"]);const[lifeScoreEnabled,setLifeScoreEnabled]=useState(true);
  const[timezone,setTimezone]=useState("Asia/Dubai");
  const[weeklyFocusTarget,setWeeklyFocusTarget]=useState(600);
  const[error,setError]=useState("");

  const today=todayInTZ(timezone);
  const startOfWeek=weekStart(today);

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setSignedIn(false);return;}
      setSignedIn(true);setWorkspaceId(ctx.workspaceId);

      const profile=await sb.from("profiles").select("timezone,weekly_focus_target").eq("id",ctx.user.id).maybeSingle();
      if(profile.error)throw profile.error;
      const tz=profile.data?.timezone||"Asia/Dubai";
      setWeeklyFocusTarget(Math.max(60,Number(profile.data?.weekly_focus_target||600)));
      setTimezone(tz);
      const localToday=todayInTZ(tz);
      const localWeekStart=weekStart(localToday);

      const[t,r,h,fl,fam,d,g,done,activity,expenses,us]=await Promise.all([
        sb.from("tasks")
          .select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at,waiting_for,start_date,estimate_min")
          .eq("workspace_id",ctx.workspaceId)
          .not("status","in",'("Completed","Cancelled")')
          .limit(250),
        sb.from("receivables")
          .select("id,total,due_date,status,receivable_payments(amount,date)")
          .eq("workspace_id",ctx.workspaceId)
          .neq("status","Paid"),
        sb.from("habits").select("id,name,area").eq("workspace_id",ctx.workspaceId),
        sb.from("focus_sessions").select("minutes").eq("workspace_id",ctx.workspaceId).gte("date",localWeekStart).lte("date",localToday),
        sb.from("family_tasks").select("id,title,due_date,status,reminder_days").eq("workspace_id",ctx.workspaceId).neq("status","Completed"),
        sb.from("migration_documents").select("id,name,status,expiry_date").eq("workspace_id",ctx.workspaceId),
        sb.from("goals").select("id,name,progress,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed").order("deadline",{ascending:true,nullsFirst:false}).limit(6),
        sb.from("tasks").select("id").eq("workspace_id",ctx.workspaceId).eq("status","Completed").gte("completed_at",localWeekStart+"T00:00:00Z"),
        sb.from("activity_log").select("id").eq("workspace_id",ctx.workspaceId).gte("created_at",localWeekStart+"T00:00:00Z"),
        sb.from("money_expenses").select("id,amount,category,merchant,avoid_next_time,waste_reason,date,is_waste").eq("workspace_id",ctx.workspaceId).gte("date",localToday.slice(0,7)+"-01").lte("date",localToday),
        sb.from("user_settings").select("settings").eq("user_id",ctx.user.id).maybeSingle()
      ]);
      for(const q of[t,r,h,fl,fam,d,g,done,activity,expenses,us])if(q.error)throw q.error;

      const habitRows=(h.data||[]) as Habit[];
      setTasks((t.data||[]) as Task[]);
      setRecs((r.data||[]) as Rec[]);
      setHabits(habitRows);
      setFocusWeek((fl.data||[]).reduce((a:any,x:any)=>a+Number(x.minutes||0),0));
      setFamilyTasks((fam.data||[]) as FamilyTask[]);
      setDocs((d.data||[]) as Doc[]);
      setGoals((g.data||[]) as Goal[]);
      setCompletedWeek((done.data||[]).length);
      setActivityWeek((activity.data||[]).length);
      const expenseRows=(expenses.data||[]) as any[];
      setWasteMonth(expenseRows.filter((x:any)=>x.is_waste).reduce((a:any,x:any)=>a+Number(x.amount||0),0));
      setWasteLessons(expenseRows.filter((x:any)=>x.is_waste&&(x.avoid_next_time||x.waste_reason)).sort((a:any,b:any)=>String(b.date).localeCompare(String(a.date))).slice(0,3) as WasteLesson[]);const settings=(us.data?.settings||{}) as any;const hw=settings.home_widgets;if(Array.isArray(hw))setHomeWidgets(hw.map(String));setLifeScoreEnabled(settings.life_score_enabled!==false);

      const ids=habitRows.map(x=>x.id);
      if(ids.length){
        const logs=await sb.from("habit_logs").select("habit_id,value").in("habit_id",ids).eq("date",localToday);
        if(logs.error)throw logs.error;
        setHabitDone(new Set((logs.data||[]).filter((x:any)=>Number(x.value)>0).map((x:any)=>x.habit_id)));
      }else setHabitDone(new Set());
    }catch(e){
      setError(e instanceof Error?e.message:"Could not load dashboard");
    }
  },[]);

  useEffect(()=>{void load();},[load]);
  useRealtimeRefresh(
    ["tasks","receivables","receivable_payments","money_expenses","habits","habit_logs","focus_sessions","family_tasks","migration_documents","goals","activity_log","user_settings"],
    load,
    Boolean(workspaceId)
  );

  const ranked=useMemo(()=>tasks
    .filter(t=>t.status!=="Waiting"&&t.status!=="Blocked")
    .map(task=>({task,score:priorityScore({
      status:task.status,deadline:task.deadline,importance:task.importance,value:task.financial_value,
      area:task.area,goalId:task.goal_id,blockedBy:task.blocked_by,createdAt:task.created_at,estimateMin:task.estimate_min
    })}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,6),[tasks]);
  const top=ranked.slice(0,3);
  const secondary=ranked.slice(3,6);

  const money=useMemo(()=>{
    let overdue=0,count=0,totalOpen=0;
    for(const r of recs){
      const rem=remaining(Number(r.total||0),(r.receivable_payments||[]).map(p=>({amount:Number(p.amount),date:p.date})));
      totalOpen+=rem;
      if(rem>0&&r.due_date&&r.due_date<today){overdue+=rem;count++;}
    }
    return{overdue,count,totalOpen};
  },[recs,today]);

  const healthHabits=habits.filter(h=>h.area==="Health");
  const healthDone=healthHabits.filter(h=>habitDone.has(h.id)).length;
  const allHabitDone=habits.filter(h=>habitDone.has(h.id)).length;
  const readyDocs=docs.filter(d=>d.status==="Ready").length;
  const overdueBusiness=tasks.filter(t=>["Business","Work"].includes(t.area||"")&&t.deadline&&t.deadline<today).length;
  const overdueFamily=familyTasks.filter(t=>t.due_date&&t.due_date<today).length;

  const scores=useMemo(()=>{
    const health=healthHabits.length?Math.round(healthDone/healthHabits.length*100):70;
    const work=clamp(100-overdueBusiness*18,25,100);
    const moneyScore=money.totalOpen?clamp(Math.round((1-money.overdue/money.totalOpen)*100),25,100):100;
    const family=clamp(100-overdueFamily*20,30,100);
    const europe=docs.length?Math.round(readyDocs/docs.length*100):60;
    const growth=clamp(Math.round(focusWeek/weeklyFocusTarget*100),35,100);
    const life=Math.round((health+work+moneyScore+family+europe+growth)/6);
    return{health,work,money:moneyScore,family,europe,growth,life};
  },[healthHabits.length,healthDone,overdueBusiness,money,overdueFamily,docs.length,readyDocs,focusWeek,weeklyFocusTarget]);

  const show=(key:string)=>homeWidgets.includes(key);
  const familyPending=familyTasks.filter(x=>x.status!=="Completed").length;
  const calendarToday=tasks.filter(t=>t.deadline===today).length+familyTasks.filter(t=>t.due_date===today).length;

  const alerts=useMemo(()=>{
    const arr:{kind:"critical"|"important"|"reminder";icon:string;title:string;meta:string;href:string}[]=[];
    for(const t of tasks.filter(t=>Number(t.importance||0)>=5||Boolean(t.deadline&&t.deadline<=isoAddDays(today,1))).slice(0,4)){
      const overdue=Boolean(t.deadline&&t.deadline<today);
      arr.push({
        kind:overdue?"critical":"important",icon:"!",title:t.name,
        meta:`Task · ${overdue?"Overdue":t.deadline===today?"Today":t.deadline||"No deadline"}`,href:"/tasks"
      });
    }
    if(money.count)arr.push({kind:"critical",icon:"₳",title:`${aed(money.overdue)} overdue`,meta:`${money.count} account${money.count===1?"":"s"} need follow-up`,href:"/money"});
    if(wasteMonth>0)arr.push({kind:"important",icon:"⊘",title:`${aed(wasteMonth)} marked as waste this month`,meta:"Review the reason and avoid-next-time rules.",href:"/expenses"});
    if(wasteLessons[0])arr.push({kind:"reminder",icon:"↺",title:"Waste Guard lesson",meta:wasteLessons[0].avoid_next_time||wasteLessons[0].waste_reason||"Review the last waste expense.",href:"/expenses"});
    for(const f of familyTasks.filter(f=>f.due_date&&f.due_date<=isoAddDays(today,Number(f.reminder_days||2))).slice(0,2)){
      arr.push({kind:"reminder",icon:"⌁",title:f.title,meta:`Family · ${f.due_date}`,href:"/family"});
    }
    for(const d of docs.filter(d=>["Missing","Needs Attestation","Expired"].includes(d.status)).slice(0,2)){
      arr.push({kind:"reminder",icon:"◈",title:`Europe document: ${d.name}`,meta:d.status,href:"/europe"});
    }
    return arr.slice(0,8);
  },[tasks,money,wasteMonth,wasteLessons,familyTasks,docs,today]);

  const waiting=useMemo(()=>tasks
    .filter(t=>t.status==="Waiting")
    .sort((a,b)=>daysBetween(b.start_date,today)-daysBetween(a.start_date,today))
    .slice(0,4),[tasks,today]);

  if(signedIn===false){
    return <main className="page-root"><div className="hero-card"><div><div className="hero-kicker">PERSONAL + FAMILY COMMAND CENTER</div><h2>Do the right thing first.</h2><p>Sign in to activate your private cloud command center, reminders, recovery CRM and family system.</p></div><Link href="/login" className="primary-btn" style={{position:"relative",zIndex:2}}>Sign in</Link></div></main>;
  }

  return <main className="page-root">
    {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

    <div className="hero-card">
      <div>
        <div className="hero-kicker">TODAY&apos;S MISSION</div>
        <h2>Do the right thing first.</h2>
        <p>LifeOS keeps money, work, health, family and long-term goals visible until the important things are actually done.</p>
      </div>
      {lifeScoreEnabled&&<div className="life-score">
        <div className="ring" style={{"--p":scores.life} as React.CSSProperties}><span>{scores.life}%</span></div>
        <small>Life Score<br/><span style={{opacity:.6}}>directional</span></small>
      </div>}
    </div>

    <div className="grid g4 mt">
      {show("money")&&<Link href="/money" className="metric-card accent-red"><span>Money overdue</span><strong>{aed(money.overdue)}</strong><small>{money.count} overdue account{money.count===1?"":"s"}</small></Link>}
      {show("health")&&<Link href="/health" className="metric-card accent-green"><span>Health today</span><strong>{healthDone} / {healthHabits.length}</strong><small>{scores.health}% health habits completed</small></Link>}
      {show("habits")&&<Link href="/habits" className="metric-card accent-green"><span>Habits today</span><strong>{allHabitDone} / {habits.length}</strong><small>all scheduled habits logged today</small></Link>}
      {show("focus")&&<Link href="/focus" className="metric-card accent-blue"><span>Deep work</span><strong>{Math.floor(focusWeek/60)}h {focusWeek%60}m</strong><small>of {Math.floor(weeklyFocusTarget/60)}h {weeklyFocusTarget%60}m weekly target</small></Link>}
      {show("europe")&&<Link href="/europe" className="metric-card accent-amber"><span>Europe docs</span><strong>{readyDocs}/{docs.length}</strong><small>{scores.europe}% ready</small></Link>}
      {show("family")&&<Link href="/family" className="metric-card"><span>Family</span><strong>{familyPending}</strong><small>pending responsibilities</small></Link>}
      {show("business")&&<Link href="/business" className="metric-card"><span>Business</span><strong>{overdueBusiness}</strong><small>overdue business tasks</small></Link>}
      {show("calendar")&&<Link href="/calendar" className="metric-card"><span>Calendar today</span><strong>{calendarToday}</strong><small>task + family obligations</small></Link>}
      {show("waste")&&<Link href="/expenses" className="metric-card accent-red"><span>Waste guard</span><strong>{aed(wasteMonth)}</strong><small>marked waste this month</small></Link>}
    </div>

    <div className="grid wide mt">
      {show("top3")&&<article className="panel">
        <div className="panel-head">
          <div><span className="label">MUST WIN TODAY</span><h3>Top priorities</h3></div>
          <Link className="text-btn" href="/today">Open day →</Link>
        </div>
        <div className="priority-list">
          {top.length?top.map(({task,score},i)=><Link href="/tasks" className="priority-item" key={task.id}>
            <span className="priority-number">{i+1}</span>
            <div><strong>{task.name}</strong><small>{task.area||"Personal"} · {task.deadline||"No deadline"}</small></div>
            <span className="priority-score">{score}/100</span>
          </Link>):<div className="empty-state"><b>No open priorities</b>Add a task and LifeOS will rank it here.</div>}
          {secondary.length>0&&<><div className="label" style={{marginTop:10}}>SECONDARY TASKS</div>{secondary.map(({task,score},i)=><Link href="/tasks" className="priority-item" key={task.id}>
            <span className="priority-number">{i+4}</span>
            <div><strong>{task.name}</strong><small>{task.area||"Personal"} · {task.deadline||"No deadline"}</small></div>
            <span className="priority-score">{score}/100</span>
          </Link>)}</>}
        </div>
      </article>}

      {show("alerts")&&<article className="panel">
        <div className="panel-head">
          <div><span className="label">ALERTS</span><h3>Needs attention</h3></div>
          <Link href="/notifications" className="pill red">{alerts.length} active</Link>
        </div>
        <div className="alerts">
          {alerts.length?alerts.slice(0,4).map((a,i)=><Link href={a.href} className={`alert ${a.kind}`} key={i}>
            <div className="alert-icon">{a.icon}</div>
            <div><strong>{a.title}</strong><small>{a.meta}</small></div>
          </Link>):<div className="empty-state"><b>No urgent alerts</b>Nothing requires immediate attention.</div>}
        </div>
      </article>}
    </div>

    <div className="grid g3 mt">
      {show("waiting")&&<article className="panel">
        <div className="panel-head">
          <div><span className="label">WAITING FOR</span><h3>Dependencies</h3></div>
          <Link className="text-btn" href="/waiting">View all</Link>
        </div>
        <div className="list-stack">
          {waiting.length?waiting.map(t=><Link href="/waiting" key={t.id} className="priority-item">
            <span className="priority-number">…</span>
            <div><strong>{t.waiting_for||"Someone"}</strong><small>{t.name}</small></div>
            <span className="pill amber">{daysBetween(t.start_date,today)}d</span>
          </Link>):<div className="empty-state"><b>Nothing waiting</b>No external dependency is blocking you.</div>}
        </div>
      </article>}

      {show("goals")&&<article className="panel">
        <div className="panel-head">
          <div><span className="label">GOALS</span><h3>Long-term direction</h3></div>
          <Link className="text-btn" href="/goals">Open</Link>
        </div>
        {goals.length?goals.slice(0,3).map(g=><div key={g.id}>
          <div className="progress-label"><span>{g.name}</span><b>{Math.round(Number(g.progress||0))}%</b></div>
          <div className="progress"><i style={{width:`${clamp(Number(g.progress||0))}%`}}/></div>
        </div>):<div className="empty-state"><b>No active goals</b>Create a goal to keep long-term direction visible.</div>}
      </article>}

      {show("week")&&<article className="panel">
        <div className="panel-head"><div><span className="label">THIS WEEK</span><h3>System health</h3></div></div>
        <div className="stat-pair">
          <div className="stat-box"><b>{completedWeek}</b><span>tasks completed</span></div>
          <div className="stat-box"><b>{focusWeek}m</b><span>focus logged</span></div>
          <div className="stat-box"><b>{activityWeek}</b><span>actions logged</span></div>
          <div className="stat-box"><b>{scores.life}%</b><span>life score</span></div>
        </div>
      </article>}
    </div>

    <LifeClock/>

    {wasteLessons.length>0&&<article className="panel mt">
      <div className="panel-head"><div><span className="label">WASTE GUARD MEMORY</span><h3>Rules worth remembering</h3></div><Link className="text-btn" href="/expenses">Open Waste Guard →</Link></div>
      <div className="grid g3">{wasteLessons.map(x=><Link href="/expenses" key={x.id} className="priority-item">
        <span className="priority-number">⊘</span>
        <div><strong>{x.avoid_next_time||"Avoid repeating this expense"}</strong><small>{aed(Number(x.amount||0))} · {x.category}{x.merchant?" · "+x.merchant:""}{x.waste_reason?" · "+x.waste_reason:""}</small></div>
      </Link>)}</div>
    </article>}

    <div className="mt" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <Link href="/expenses" className="ghost-btn">Waste Guard · {aed(wasteMonth)}</Link>
      <Link href="/health-planner" className="ghost-btn">Health Planner</Link>
      <Link href="/mobile" className="ghost-btn">Mobile Tasks & Notes</Link>
      <Link href="/matrix" className="ghost-btn">Priority Matrix</Link>
      <Link href="/habits" className="ghost-btn">Habits</Link>
      <Link href="/coach" className="ghost-btn">AI Coach</Link>
      <Link href="/progress" className="ghost-btn">Progress</Link>
      <Link href="/access" className="ghost-btn">Access</Link>
      <Link href="/privacy" className="ghost-btn">Privacy</Link>
    </div>
  </main>;
}
