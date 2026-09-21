"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import type { AIContext } from "@/lib/ai/service";
import { priorityScore, daysFromToday, type TaskStatus } from "@/lib/priority";
import { remaining } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

export default function CoachPage() {
  const [question, setQuestion] = useState("What should I do right now?");
  const [context, setContext] = useState<AIContext | null>(null);
  const [answer, setAnswer] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const loadContext = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) { setSignedIn(false); return; }
      setSignedIn(true);

      const [tasksQ, moneyQ, goalsQ, familyQ, docsQ] = await Promise.all([
        sb.from("tasks").select("name,status,importance,deadline,financial_value,area,goal_id,blocked_by,created_at,estimate_min").eq("workspace_id", ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(100),
        sb.from("receivables").select("name,total,next_followup,receivable_payments(amount,date)").eq("workspace_id", ctx.workspaceId).limit(100),
        sb.from("goals").select("name,progress,status").eq("workspace_id", ctx.workspaceId).not("status","eq","Completed").limit(50),
        sb.from("family_tasks").select("title,due_date,status").eq("workspace_id", ctx.workspaceId).neq("status","Completed").limit(50),
        sb.from("migration_documents").select("name,status").eq("workspace_id", ctx.workspaceId).neq("status","Ready").limit(50),
      ]);
      for (const q of [tasksQ,moneyQ,goalsQ,familyQ,docsQ]) if (q.error) throw q.error;

      const taskRows = (tasksQ.data || []) as any[];
      const todayTasks = taskRows
        .map((t) => ({
          title: t.name,
          due: t.deadline,
          score: priorityScore({
            status: t.status as TaskStatus,
            deadline: t.deadline,
            importance: t.importance,
            value: t.financial_value,
            area: t.area,
            goalId: t.goal_id,
            blockedBy: t.blocked_by,
            createdAt: t.created_at,
            estimateMin: t.estimate_min,
          }),
        }))
        .sort((a,b)=>b.score-a.score)
        .slice(0,10);

      const overdue = taskRows
        .filter((t) => t.deadline && daysFromToday(t.deadline) < 0)
        .map((t) => ({ title: t.name, days: Math.abs(daysFromToday(t.deadline)) }))
        .slice(0,20);

      const money = ((moneyQ.data || []) as any[]).map((r) => ({
        name: r.name,
        remaining: remaining(Number(r.total || 0), (r.receivable_payments || []).map((p:any)=>({amount:Number(p.amount||0),date:p.date||todayInTZ()}))),
        nextFollowUp: r.next_followup,
      })).filter((r)=>r.remaining>0).slice(0,30);

      setContext({
        today_tasks: todayTasks,
        overdue_tasks: overdue,
        money_due: money,
        active_goals: ((goalsQ.data || []) as any[]).map(g=>({name:g.name,progress:Number(g.progress||0)})),
        upcoming_family: ((familyQ.data || []) as any[]).filter(f=>f.due_date).map(f=>({title:f.title,due:f.due_date})),
        migration_blockers: ((docsQ.data || []) as any[]).map(d=>`${d.name}: ${d.status}`),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build AI context");
    }
  }, []);

  useEffect(()=>{void loadContext();},[loadContext]);

  async function ask() {
    if (!context || !question.trim()) return;
    setLoading(true); setError("");
    try {
      const r=await fetch("/api/ai/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,context})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Coach failed");
      setAnswer(j.answer);setLabel(j.label);
    } catch(e) { setError(e instanceof Error?e.message:"Coach failed"); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto max-w-3xl pt-6">
    <BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">AI PERSONAL COACH</p><h1 className="text-2xl font-bold">What deserves your attention?</h1>
    {signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:
    <Panel title="Ask LifeOS" kicker={context?"CONTEXT READY":"BUILDING CONTEXT"}>
      <textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
      <button onClick={ask} disabled={loading||!context} className="mt-2 rounded-lg bg-[#77adff] px-4 py-2 font-bold text-[#06101f] disabled:opacity-50">{loading?"Thinking…":"Ask coach"}</button>
      {label&&<p className="mt-2 text-xs text-slate-500">{label}</p>}
      {answer&&<><div className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[.02] p-4 text-sm leading-6">{answer}</div>{context&&context.today_tasks.length>0&&<div className="mt-4 rounded-xl border border-white/10 p-4"><span className="label">WHY THESE PRIORITIES?</span><div className="mt-2 space-y-2">{context.today_tasks.slice(0,3).map((t:any,i:number)=><div key={i} className="priority-item"><span className="priority-number">{i+1}</span><div><strong>{t.title}</strong><small>{t.due?"Due "+t.due+" · ":""}Priority score {t.score}/100</small></div><span className="pill blue">{t.score}</span></div>)}</div></div>}</>}
      {error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    </Panel>}
  </main>;
}
