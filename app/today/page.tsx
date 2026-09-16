import { BackHome, Empty, Panel } from "@/components/ui";
import { priorityScore } from "@/lib/priority";

// Phase 1 Today: server component placeholder wired to Supabase in next iteration.
// Preserves prototype buildPlan ordering (score desc, top 6 into time slots).
const SLOTS = ["9:00", "10:00", "12:00", "2:00", "4:00", "Evening"];

export default function TodayPage() {
  return (
    <main className="pt-6">
      <BackHome />
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">DAILY PLANNER</p>
      <h1 className="text-2xl font-bold">Your plan today</h1>
      <div className="mt-4 grid gap-4">
        <Panel title="Must Win Today" kicker="TOP 3 BY PRIORITY SCORE">
          <Empty title="Connect Supabase to load plan" sub={`Top tasks ordered by priorityScore() into ${SLOTS.join(", ")}. Accepts pin / reorder / complete without auto-overwriting calendar.`} />
        </Panel>
        <Panel title="Focus Mode" kicker="25 / 45 / 60 MIN">
          <p className="text-sm text-slate-400">Task selector + pause/resume/complete. Sessions log actual focus minutes to focus_sessions. See prototype timer logic preserved in lib.</p>
        </Panel>
      </div>
      <p className="mt-3 text-xs text-slate-500">Scoring: {String(priorityScore({ status: "Today", deadline: "2026-09-17", importance: 5, value: 25000, area: "Money" }))}/100 sample (prototype parity + dependency/goal-age factors).</p>
    </main>
  );
}
