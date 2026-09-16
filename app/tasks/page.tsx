import { BackHome, Empty, Panel } from "@/components/ui";

export default function TasksPage() {
  return (
    <main className="pt-6">
      <BackHome />
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">TASK SYSTEM</p>
      <h1 className="text-2xl font-bold">Priority queue</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_.7fr]">
        <Panel title="Open tasks">
          <Empty title="Connect Supabase to list tasks" sub="Filters: Open / Today / Waiting / Completed. Actions: complete, edit, duplicate, reschedule, delegate, dependency, note, delete." />
        </Panel>
        <Panel title="AI Priority" kicker="0–100 + WHY?">
          <p className="text-sm text-slate-400">Deadline, overdue, financial value, importance, area, goal alignment. Manual importance always wins; AI never silently overrides.</p>
        </Panel>
      </div>
    </main>
  );
}
