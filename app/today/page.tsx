"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { priorityScore, whyPriority, type TaskStatus } from "@/lib/priority";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

const SLOTS = ["9:00", "10:00", "12:00", "2:00", "4:00", "Evening"];

type TaskRow = {
  id: string;
  name: string;
  area: string | null;
  status: TaskStatus;
  importance: number | null;
  deadline: string | null;
  financial_value: number | null;
  goal_id: string | null;
  blocked_by: string | null;
  created_at: string | null;
  estimate_min: number | null;
};

export default function TodayPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) { setSignedIn(false); return; }
      setSignedIn(true);
      const { data, error: queryError } = await sb
        .from("tasks")
        .select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at,estimate_min")
        .eq("workspace_id", ctx.workspaceId)
        .not("status", "in", '("Completed","Cancelled")')
        .limit(200);
      if (queryError) throw queryError;
      setTasks((data || []) as TaskRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load today plan");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const plan = useMemo(
    () =>
      tasks
        .map((task) => ({
          task,
          score: priorityScore({
            status: task.status,
            deadline: task.deadline,
            importance: task.importance,
            value: task.financial_value,
            area: task.area,
            goalId: task.goal_id,
            blockedBy: task.blocked_by,
            createdAt: task.created_at,
          }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [tasks]
  );

  async function complete(id: string) {
    const sb = supabaseBrowser();
    const { error: updateError } = await sb
      .from("tasks")
      .update({ status: "Completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  return (
    <main className="pt-6">
      <BackHome />
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">DAILY PLANNER</p>
      <h1 className="text-2xl font-bold">Your plan today</h1>
      {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {signedIn === false && <p className="panel mt-4 p-5 text-sm">Sign in to build your plan. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>}

      <div className="mt-4 grid gap-4">
        <Panel title="Must Win Today" kicker="TOP 3 BY PRIORITY SCORE">
          {plan.slice(0, 3).length === 0 ? (
            <p className="text-sm text-slate-400">{signedIn === null ? "Loading…" : "No open tasks yet."}</p>
          ) : (
            <div className="space-y-2">
              {plan.slice(0, 3).map(({ task, score }, i) => (
                <div key={task.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#77adff]/15 font-bold text-[#9fc4ff]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <strong>{task.name}</strong>
                    <p className="text-xs text-slate-400">
                      {score}/100 · {whyPriority({
                        status: task.status,
                        deadline: task.deadline,
                        importance: task.importance,
                        value: task.financial_value,
                        area: task.area,
                        goalId: task.goal_id,
                        blockedBy: task.blocked_by,
                        createdAt: task.created_at,
                      }).join(" · ") || "Priority engine"}
                    </p>
                  </div>
                  <button onClick={() => complete(task.id)} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Done</button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Suggested day" kicker="AUTO ORDER · USER CONTROL">
          <div className="space-y-2">
            {plan.map(({ task, score }, i) => (
              <div key={task.id} className="grid grid-cols-[70px_1fr_auto] gap-3 rounded-xl border border-white/10 p-3 text-sm">
                <b className="text-[#9fc4ff]">{SLOTS[i]}</b>
                <div><strong>{task.name}</strong><p className="text-xs text-slate-400">{task.estimate_min || 30} min · {task.area || "Personal"}</p></div>
                <span className="text-xs text-slate-400">{score}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Focus Mode" kicker="NEXT STEP">
          <p className="text-sm text-slate-400">
            The live priority plan is now wired. Focus-session timer persistence remains the next implementation slice; no fake timer controls are shown meanwhile.
          </p>
        </Panel>
      </div>
    </main>
  );
}
