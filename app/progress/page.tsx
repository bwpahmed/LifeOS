"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { remaining } from "@/lib/money";
import { habitConsistencyForFrequency } from "@/lib/habits";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Scores={Health:number|null;Work:number|null;Money:number|null;Growth:number|null;Family:number|null;"Long-term":number|null};
type Achievement={title:string;detail:string;earned:boolean};

function daysAgo(n:number){const d=new Date(todayInTZ()+"T12:00:00");d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
function pct(a:number,b:number){return b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):null;}

export default function ProgressPage(){
 const[signedIn,setSignedIn]=useState<boolean|null>(null);const[lifeScoreEnabled,setLifeScoreEnabled]=useState(true);const[scores,setScores]=useState<Scores|null>(null);const[achievements,setAchievements]=useState<Achievement[]>([]);const[stats,setStats]=useState({focus:0,money:0,healthDays:0,hairMonths:0,goals:0,docs:0});const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const from=daysAgo(29);
  const[tasks,habits,focus,health,recs,family,docs,goals,hair,countries,settings]=await Promise.all([
   sb.from("tasks").select("id,area,status,completed_at").eq("workspace_id",ctx.workspaceId),
   sb.from("habits").select("id,area,frequency,target").eq("workspace_id",ctx.workspaceId),
   sb.from("focus_sessions").select("minutes,date").eq("workspace_id",ctx.workspaceId).gte("date",from),
   sb.from("health_entries").select("date").eq("workspace_id",ctx.workspaceId).gte("date",from),
   sb.from("receivables").select("id,total,next_followup,status,receivable_payments(amount,date)").eq("workspace_id",ctx.workspaceId),
   sb.from("family_tasks").select("status").eq("workspace_id",ctx.workspaceId),
   sb.from("migration_documents").select("status").eq("workspace_id",ctx.workspaceId),
   sb.from("goals").select("status,progress").eq("workspace_id",ctx.workspaceId),
   sb.from("hair_photos").select("date").eq("workspace_id",ctx.workspaceId),
   sb.from("migration_countries").select("status").eq("workspace_id",ctx.workspaceId),
   sb.from("user_settings").select("settings").eq("user_id",ctx.user.id).maybeSingle()
  ]);for(const q of[tasks,habits,focus,health,recs,family,docs,goals,hair,countries,settings])if(q.error)throw q.error;setLifeScoreEnabled((settings.data?.settings as any)?.life_score_enabled!==false);
  const taskRows=(tasks.data||[]) as any[];const recentCompleted=taskRows.filter(t=>t.status==="Completed"&&t.completed_at&&String(t.completed_at).slice(0,10)>=from);
  const openWork=taskRows.filter(t=>["Business","Work"].includes(t.area)&&!["Cancelled"].includes(t.status));const doneWork=openWork.filter(t=>t.status==="Completed");
  const growth=taskRows.filter(t=>t.area==="Growth"&&!["Cancelled"].includes(t.status));const growthDone=growth.filter(t=>t.status==="Completed");
  const habitRows=(habits.data||[]) as {id:string;area:string|null;frequency:string;target:number|null}[];const hids=habitRows.map(h=>h.id);let healthHabitRatio:number|null=null;if(hids.length){const hl=await sb.from("habit_logs").select("habit_id,date,value").in("habit_id",hids).gte("date",from).lte("date",todayInTZ());if(hl.error)throw hl.error;const healthHabits=habitRows.filter(h=>h.area==="Health");if(healthHabits.length){const days:string[]=[];for(let d=new Date(from+"T12:00:00");d<=new Date(todayInTZ()+"T12:00:00");d.setDate(d.getDate()+1))days.push(d.toISOString().slice(0,10));const scores=healthHabits.map(h=>{const map=Object.fromEntries((hl.data||[]).filter((l:any)=>l.habit_id===h.id).map((l:any)=>[l.date,Number(l.value||0)]));return habitConsistencyForFrequency(map,days,h.frequency||"Daily",Number(h.target||1));});healthHabitRatio=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);}}
  const healthDays=new Set((health.data||[]).map((h:any)=>h.date)).size;const healthScore=healthHabitRatio??pct(healthDays,20);
  const recRows=(recs.data||[]) as any[];let moneyRecovered=0,moneyRecoveredAll=0;const openRecs=recRows.filter(r=>r.status!=="Paid"&&remaining(Number(r.total||0),(r.receivable_payments||[]).map((p:any)=>({amount:Number(p.amount),date:p.date})))>0);for(const r of recRows)for(const p of r.receivable_payments||[]){moneyRecoveredAll+=Number(p.amount||0);if(p.date>=from)moneyRecovered+=Number(p.amount||0);}const moneyScore=openRecs.length?pct(openRecs.filter(r=>Boolean(r.next_followup)).length,openRecs.length):(recRows.length?100:null);
  const familyRows=family.data||[];const familyScore=familyRows.length?pct(familyRows.filter((x:any)=>x.status==="Completed").length,familyRows.length):null;
  const goalRows=goals.data||[];const longScore=goalRows.length?Math.round(goalRows.reduce((a:any,g:any)=>a+Number(g.progress||0),0)/goalRows.length):null;
  const nextScores:Scores={Health:healthScore,Work:pct(doneWork.length,openWork.length),Money:moneyScore,Growth:pct(growthDone.length,growth.length),Family:familyScore,"Long-term":longScore};setScores(nextScores);
  const focusMin=(focus.data||[]).reduce((a:any,x:any)=>a+Number(x.minutes||0),0);const focusSessions=(focus.data||[]).length;const hairMonths=new Set((hair.data||[]).map((p:any)=>String(p.date||"").slice(0,7)).filter(Boolean)).size;const completedGoals=goalRows.filter((g:any)=>g.status==="Completed").length;const readyDocs=(docs.data||[]).filter((d:any)=>d.status==="Ready").length;setStats({focus:focusMin,money:moneyRecovered,healthDays,hairMonths,goals:completedGoals,docs:readyDocs});
  const europeSubmitted=(countries.data||[]).some((x:any)=>["Submitted","Waiting","Approved"].includes(x.status));
  setAchievements([
   {title:"30 Focus Sessions",detail:`${focusSessions} focus sessions logged in the last 30 days`,earned:focusSessions>=30},
   {title:"AED 100K Recovered",detail:`AED ${moneyRecoveredAll.toLocaleString()} recorded as recovered`,earned:moneyRecoveredAll>=100000},
   {title:"90% Health Consistency",detail:`${healthHabitRatio??0}% health habit consistency in the current window`,earned:Number(healthHabitRatio||0)>=90},
   {title:"Europe Application Submitted",detail:europeSubmitted?"A Europe route reached Submitted / Waiting / Approved":"No route submitted yet",earned:europeSubmitted},
   {title:"6 Month Hair Tracking",detail:`${hairMonths} distinct months with hair photos`,earned:hairMonths>=6},
   {title:"Goal Finished",detail:`${completedGoals} completed goals`,earned:completedGoals>0},
  ]);
  void recentCompleted;
 }catch(e){setError(e instanceof Error?e.message:"Could not build progress dashboard");}},[]);
 useEffect(()=>{void load();},[load]);
 const overall=useMemo(()=>{if(!scores)return null;const vals=Object.values(scores).filter((x):x is number=>typeof x==="number");return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;},[scores]);

 return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">PROGRESS</p><h1 className="text-2xl font-bold">Consistency signals</h1><p className="mt-1 text-sm text-slate-400">These scores summarize logged activity. They are not a judgment of you, your family, health, or worth.</p>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
 {signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<><div className="mt-4 grid gap-4 md:grid-cols-[.35fr_.65fr]">{lifeScoreEnabled?<div className="panel grid place-items-center p-6 text-center"><span className="text-xs text-slate-500">Activity-based Life Score</span><b className="mt-2 text-5xl">{overall??"—"}</b><span className="text-xs text-slate-500">available categories only</span></div>:<div className="panel grid place-items-center p-6 text-center"><span className="text-xs text-slate-500">Life Score is disabled in Settings</span></div>}<Panel title="Area signals" kicker="0–100 WHEN DATA EXISTS"><div className="grid grid-cols-2 gap-2 md:grid-cols-3">{scores&&Object.entries(scores).map(([k,v])=><div key={k} className="rounded-lg border border-white/10 p-3"><div className="flex justify-between text-xs"><b>{k}</b><span>{v??"N/A"}</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-[#77adff]" style={{width:`${v??0}%`}}/></div></div>)}</div></Panel></div>
 <div className="mt-4 grid gap-4 md:grid-cols-2"><Panel title="Meaningful achievements">{achievements.map(a=><div key={a.title} className={`mb-2 rounded-lg border p-3 ${a.earned?"border-emerald-300/20 bg-emerald-300/5":"border-white/10 opacity-60"}`}><b className="text-sm">{a.earned?"✓ ":""}{a.title}</b><p className="text-xs text-slate-500">{a.detail}</p></div>)}</Panel><Panel title="30-day facts"><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Focus</span><b className="block">{stats.focus} min</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Recovered</span><b className="block">AED {stats.money.toLocaleString()}</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Health days</span><b className="block">{stats.healthDays}</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Ready Europe docs</span><b className="block">{stats.docs}</b></div></div><Link href="/reviews" className="mt-3 inline-block rounded border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">Open reviews →</Link></Panel></div></>}
 </main>;
}
