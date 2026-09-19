"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { priorityScore,type TaskStatus } from "@/lib/priority";
import { remaining } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { InstallPWA } from "@/components/install-pwa";

type Task={id:string;name:string;area:string|null;status:TaskStatus;importance:number|null;deadline:string|null;financial_value:number|null;goal_id:string|null;blocked_by:string|null;created_at:string|null};
type Rec={id:string;total:number;due_date:string|null;status:string;receivable_payments:{amount:number;date:string}[]};
type Habit={id:string;name:string;area:string|null};
type Doc={id:string;name:string;status:string;expiry_date:string|null};

const modules=[
 ["Tasks","Cloud task system","/tasks"],["Matrix","Do / Schedule / Delegate","/matrix"],["Waiting For","Oldest follow-ups first","/waiting"],["Habits","Consistency & recovery","/habits"],["Focus","Persistent deep-work timer","/focus"],["Money","Receivables & follow-ups","/money"],["Business","Operations command center","/business"],["Health","Private health tracking","/health"],["Health Vault","Private reports & documents","/health-vault"],["Hair","Private photo comparison","/hair"],["Self-Control","Trigger & response analytics","/self-control"],["Family","Family & baby records","/family"],["Europe","Relocation documents","/europe"],["Goals","Long-term outcomes","/goals"],["Projects","Execution layer","/projects"],["Calendar","Unified obligations","/calendar"],["Notifications","Push + reminder inbox","/notifications"],["Automations","Visible rule engine","/automations"],["Reviews","Daily / weekly / monthly","/reviews"],["Progress","Activity signals","/progress"],["Journal","Private notes","/journal"],["Timeline","Activity history","/timeline"],["Search","Find anything","/search"],["AI Coach","Data-grounded planning","/coach"],["Quick Add","AI / deterministic capture","/quick-add"],["Settings","Import & configuration","/settings"],["Access","Family / team permissions","/access"],["Privacy","PIN / device lock","/privacy"],
];

export default function Home(){
 const[signedIn,setSignedIn]=useState<boolean|null>(null);const[workspaceId,setWorkspaceId]=useState("");const[tasks,setTasks]=useState<Task[]>([]);const[recs,setRecs]=useState<Rec[]>([]);const[habits,setHabits]=useState<Habit[]>([]);const[habitDone,setHabitDone]=useState<Set<string>>(new Set());const[focus,setFocus]=useState(0);const[familyPending,setFamilyPending]=useState(0);const[docs,setDocs]=useState<Doc[]>([]);const[timezone,setTimezone]=useState("Asia/Dubai");const[error,setError]=useState("");
 const today=todayInTZ(timezone);

 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);setWorkspaceId(ctx.workspaceId);const profile=await sb.from("profiles").select("timezone").eq("id",ctx.user.id).maybeSingle();const tz=profile.data?.timezone||"Asia/Dubai";setTimezone(tz);const localToday=todayInTZ(tz);
  const[t,r,h,fl,fam,d]=await Promise.all([
   sb.from("tasks").select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(200),
   sb.from("receivables").select("id,total,due_date,status,receivable_payments(amount,date)").eq("workspace_id",ctx.workspaceId).neq("status","Paid"),
   sb.from("habits").select("id,name,area").eq("workspace_id",ctx.workspaceId),
   sb.from("focus_sessions").select("minutes").eq("workspace_id",ctx.workspaceId).eq("date",localToday),
   sb.from("family_tasks").select("id,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed"),
   sb.from("migration_documents").select("id,name,status,expiry_date").eq("workspace_id",ctx.workspaceId)
  ]);for(const q of[t,r,h,fl,fam,d])if(q.error)throw q.error;const habitRows=(h.data||[]) as Habit[];setTasks((t.data||[]) as Task[]);setRecs((r.data||[]) as Rec[]);setHabits(habitRows);setFocus((fl.data||[]).reduce((a:any,x:any)=>a+Number(x.minutes||0),0));setFamilyPending((fam.data||[]).length);setDocs((d.data||[]) as Doc[]);
  const ids=habitRows.map(x=>x.id);if(ids.length){const logs=await sb.from("habit_logs").select("habit_id,value").in("habit_id",ids).eq("date",localToday);if(logs.error)throw logs.error;setHabitDone(new Set((logs.data||[]).filter((x:any)=>Number(x.value)>0).map((x:any)=>x.habit_id)));}else setHabitDone(new Set());
 }catch(e){setError(e instanceof Error?e.message:"Could not load dashboard");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["tasks","receivables","receivable_payments","habits","habit_logs","focus_sessions","family_tasks","migration_documents"],load,Boolean(workspaceId));

 const top=useMemo(()=>tasks.map(task=>({task,score:priorityScore({status:task.status,deadline:task.deadline,importance:task.importance,value:task.financial_value,area:task.area,goalId:task.goal_id,blockedBy:task.blocked_by,createdAt:task.created_at})})).sort((a,b)=>b.score-a.score).slice(0,3),[tasks]);
 const money=useMemo(()=>{let overdue=0,count=0;for(const r of recs){const rem=remaining(Number(r.total||0),(r.receivable_payments||[]).map(p=>({amount:Number(p.amount),date:p.date})));if(rem>0&&r.due_date&&r.due_date<today){overdue+=rem;count++;}}return{overdue,count};},[recs,today]);
 const healthHabits=habits.filter(h=>h.area==="Health");const healthDone=healthHabits.filter(h=>habitDone.has(h.id)).length;const growthOpen=tasks.filter(t=>t.area==="Growth").length;const readyDocs=docs.filter(d=>d.status==="Ready").length;
 const alerts=useMemo(()=>{const arr:{kind:string;text:string}[]=[];for(const t of tasks.filter(t=>Number(t.importance||0)>=5||Boolean(t.deadline&&t.deadline<today)).slice(0,5))arr.push({kind:Number(t.importance||0)>=5?"Critical":"Important",text:t.name});if(money.count)arr.push({kind:"Critical",text:`${money.count} overdue receivable${money.count===1?"":"s"} · AED ${money.overdue.toLocaleString()}`});const soon=new Date(today+"T12:00:00");soon.setDate(soon.getDate()+7);const soonISO=soon.toISOString().slice(0,10);for(const d of docs.filter(d=>d.expiry_date&&d.expiry_date>=today&&d.expiry_date<=soonISO))arr.push({kind:"Important",text:`${d.name} expires ${d.expiry_date}`});return arr.slice(0,8);},[tasks,money,docs,today]);
 const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:timezone,hour:"2-digit",hour12:false}).format(new Date()));const greeting=hour<12?"Good Morning":hour<18?"Good Afternoon":"Good Evening";

 return <main className="page-root pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] tracking-[1.45px] text-slate-400">LIFEOS · {today}</p><h1 className="text-3xl font-extrabold tracking-tight">{greeting}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Right thing. Right time. Consistently.</p></div><div className="flex flex-wrap gap-2"><InstallPWA/><Link href="/search" className="rounded-lg border border-white/10 px-3 py-2 text-sm">Search</Link><Link href="/notifications" className="rounded-lg border border-white/10 px-3 py-2 text-sm">Alerts</Link><Link href="/login" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">Account</Link></div></div>
 {error&&<p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
 {signedIn===false&&<div className="panel mt-5 p-5 text-sm">Sign in to activate the live command center. <Link href="/login" className="text-[#9fc4ff]">Open login →</Link></div>}
 {signedIn&&<><div className="mt-5 grid gap-4 md:grid-cols-[1.15fr_.85fr]"><section className="panel p-5"><p className="text-[11px] tracking-widest text-slate-400">MUST WIN TODAY</p><div className="mt-3 space-y-2">{top.length?top.map(({task,score},i)=><Link href="/tasks" key={task.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#77adff]/15 font-bold text-[#9fc4ff]">{i+1}</span><div className="min-w-0 flex-1"><b>{task.name}</b><p className="text-xs text-slate-500">{task.area||"Personal"} · {task.deadline||"no deadline"}</p></div><span className="text-xs text-slate-400">{score}</span></Link>):<p className="text-sm text-slate-400">No open tasks.</p>}</div></section><section className="panel p-5"><p className="text-[11px] tracking-widest text-slate-400">ALERTS</p><div className="mt-3 space-y-2">{alerts.length?alerts.map((a,i)=><div key={i} className="rounded-lg border border-white/10 p-3"><span className={`text-[10px] uppercase ${a.kind==="Critical"?"text-red-300":"text-amber-200"}`}>{a.kind}</span><p className="text-sm">{a.text}</p></div>):<p className="text-sm text-slate-400">No critical alerts.</p>}</div></section></div>
 <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">{[
  ["Health",healthHabits.length?`${healthDone}/${healthHabits.length} habits`:"No health habits","/health"],
  ["Work",`${focus} focus min`,"/focus"],
  ["Money",money.count?`AED ${money.overdue.toLocaleString()} overdue`:"No overdue","/money"],
  ["Family",`${familyPending} pending`,"/family"],
  ["Europe",`${readyDocs}/${docs.length} docs ready`,"/europe"],
  ["Growth",`${growthOpen} open tasks`,"/tasks"],
 ].map(([k,v,href])=><Link key={k} href={href} className="panel p-4"><span className="text-xs text-slate-500">{k}</span><b className="mt-2 block text-sm">{v}</b></Link>)}</div></>}
 <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{modules.map(([title,sub,href])=><Link key={href} href={href} className="panel p-5 transition hover:border-white/20"><span className="text-xs text-slate-400">{title}</span><strong className="mt-3 block text-base">{sub}</strong><small className="text-slate-500">Open →</small></Link>)}</div>
 <div className="panel mt-4 p-5"><span className="text-[11px] tracking-widest text-slate-400">PRODUCTION SETUP</span><h2 className="mt-1 text-lg font-bold">Supabase + Push secrets are required for full cloud behavior</h2><p className="mt-1 text-sm text-slate-400">Apply the latest Supabase migration, configure environment variables, then sign in. Generate VAPID keys with <code>node scripts/generate-vapid.mjs</code>. The preserved standalone app remains under legacy/.</p></div>
 </main>;
}
