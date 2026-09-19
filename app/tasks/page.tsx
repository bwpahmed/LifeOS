"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { priorityScore, whyPriority, type TaskStatus } from "@/lib/priority";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

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
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("Business");
  const [importance, setImportance] = useState(3);
  const [deadline, setDeadline] = useState(todayInTZ());
  const [value, setValue] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) {
        setWorkspaceId("");
        setUserId("");
        setTasks([]);
        return;
      }
      setWorkspaceId(ctx.workspaceId);
      setUserId(ctx.user.id);
      const { data, error: queryError } = await sb
        .from("tasks")
        .select("id,name,area,status,importance,deadline,financial_value,goal_id,blocked_by,created_at")
        .eq("workspace_id", ctx.workspaceId)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(200);
      if (queryError) throw queryError;
      setTasks((data || []) as TaskRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
        .map((t) => ({
          task: t,
          score: priorityScore({
            status: t.status,
            deadline: t.deadline,
            importance: t.importance,
            value: t.financial_value,
            area: t.area,
            goalId: t.goal_id,
            blockedBy: t.blocked_by,
            createdAt: t.created_at,
          }),
        }))
        .sort((a, b) => b.score - a.score),
    [tasks]
  );

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !userId || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const sb = supabaseBrowser();
      const { error: insertError } = await sb.from("tasks").insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: name.trim(),
        area,
        status: "Inbox",
        importance,
        deadline: deadline || null,
        financial_value: Number(value || 0),
        start_date: todayInTZ(),
        recurrence: { kind: "none" },
      });
      if (insertError) throw insertError;
      setName("");
      setValue(0);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: TaskStatus) {
    setError("");
    const sb = supabaseBrowser();
    const { error: updateError } = await sb
      .from("tasks")
      .update({
        status,
        completed_at: status === "Completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function remove(id: string, taskName: string) {
    if (!window.confirm(`Delete task "${taskName}"?`)) return;
    const sb = supabaseBrowser();
    const { error: deleteError } = await sb.from("tasks").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  return (
    <main className="pt-6">
      <BackHome />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-widest text-slate-400">TASK SYSTEM</p>
          <h1 className="text-2xl font-bold">Priority queue</h1>
        </div>
        <Link href="/today" className="text-sm text-[#8ab6ff]">Open Today →</Link>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

      {!loading && !workspaceId ? (
        <div className="panel mt-4 p-6 text-sm text-slate-300">
          Sign in first. <Link className="text-[#8ab6ff]" href="/login">Open login →</Link>
        </div>
      ) : (
        <>
          <Panel title="Add task" kicker="QUICK CREATE">
            <form onSubmit={addTask} className="grid gap-3 md:grid-cols-5">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Task name" className="rounded-lg border border-white/10 bg-[#0a1524] p-2 md:col-span-2" />
              <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">
                {["Business","Money","Health","Family","Europe","Growth","Personal"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2" />
              <button disabled={saving || !workspaceId} className="rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{saving ? "Saving…" : "Add task"}</button>
              <label className="text-xs text-slate-400">Importance
                <select value={importance} onChange={(e) => setImportance(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white">
                  <option value={5}>Critical</option><option value={4}>High</option><option value={3}>Medium</option><option value={2}>Low</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">Financial value AED
                <input type="number" min="0" value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white" />
              </label>
            </form>
          </Panel>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.35fr_.65fr]">
            <Panel title={loading ? "Loading…" : `Open tasks (${ranked.length})`}>
              <div className="space-y-2">
                {ranked.length === 0 && !loading && <p className="text-sm text-slate-400">No open tasks.</p>}
                {ranked.map(({ task, score }) => (
                  <div key={task.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>{task.name}</strong>
                        <p className="mt-1 text-xs text-slate-400">
                          {task.area || "Personal"} · {task.deadline || "No deadline"} · Priority {score}/100
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setStatus(task.id, "Completed")} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Done</button>
                        <button onClick={() => remove(task.id, task.name)} className="rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-300">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Why this order?" kicker="PRIORITY ENGINE">
              {ranked.slice(0, 3).map(({ task, score }, i) => (
                <div key={task.id} className="mb-3 rounded-xl border border-white/10 p-3">
                  <b>#{i + 1} · {score}/100</b>
                  <p className="text-sm">{task.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {whyPriority({
                      status: task.status,
                      deadline: task.deadline,
                      importance: task.importance,
                      value: task.financial_value,
                      area: task.area,
                      goalId: task.goal_id,
                      blockedBy: task.blocked_by,
                      createdAt: task.created_at,
                    }).join(" · ") || "Manual priority and area weight"}
                  </p>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}
    </main>
  );
}
