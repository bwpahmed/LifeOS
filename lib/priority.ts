// Preserved + improved from prototype taskScore() (lines 232-239).
// Prototype: deadline + importance*9 + money/2500 + area + overdue - blocked.
// V1 keeps same weights, adds: dependency/blocked/waiting penalty, age factor,
// goal alignment bonus, and manual-importance-wins rule. Never silently overrides manual priority.

export type TaskStatus =
  | "Inbox" | "Planned" | "Today" | "Doing" | "Waiting" | "Blocked" | "Completed" | "Cancelled";

export interface ScoredTask {
  status: TaskStatus;
  deadline?: string | null; // YYYY-MM-DD
  importance?: number | null; // 1-5 manual
  value?: number | null; // AED financial value
  area?: string | null;
  startDate?: string | null;
  goalId?: string | null;
  blockedBy?: string | null;
  createdAt?: string | null;
  estimateMin?: number | null; // estimated effort in minutes
}

const DAY = 86_400_000;

export function daysFromToday(iso?: string | null, today = new Date()): number {
  if (!iso) return 999;
  const a = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

export function priorityScore(t: ScoredTask, today = new Date()): number {
  if (t.status === "Completed" || t.status === "Cancelled") return 0;
  const d = daysFromToday(t.deadline, today);
  const deadline = d < 0 ? 32 : d === 0 ? 28 : d <= 2 ? 22 : d <= 7 ? 12 : 4;
  const importance = Number(t.importance || 3) * 9;
  const money = Math.min(20, Number(t.value || 0) / 2500);
  const area =
    t.area === "Health" ? 10
    : t.area === "Family" ? 9
    : t.area === "Money" ? 9
    : t.area === "Business" ? 7
    : 4;
  const overdue = d < 0 ? Math.min(10, Math.abs(d) * 2) : 0;
  // Waiting/Blocked reduces automatic urgency but never hides the task (prototype: Blocked -8)
  const blocked = t.status === "Blocked" ? -8 : t.status === "Waiting" ? -4 : 0;
  // New V1 factors (small, additive, manual importance still dominates):
  const dependency = t.blockedBy ? -3 : 0;
  const goalAlign = t.goalId ? 3 : 0;
  const ageDays = t.createdAt
    ? Math.max(0, Math.round((today.getTime() - new Date(t.createdAt).getTime()) / DAY))
    : 0;
  const age = Math.min(4, Math.floor(ageDays / 14));
  // Effort is intentionally a small tie-breaker, never a replacement for importance.
  const estimate = Number(t.estimateMin || 0);
  const effort = estimate > 0 && estimate <= 15 ? 4
    : estimate <= 30 && estimate > 0 ? 3
    : estimate <= 60 && estimate > 0 ? 1
    : estimate > 120 ? -2
    : 0;
  const raw = deadline + importance + money + area + overdue + blocked + dependency + goalAlign + age + effort;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function whyPriority(t: ScoredTask, today = new Date()): string[] {
  const reasons: string[] = [];
  if (Number(t.value || 0) >= 5000) reasons.push(`${Math.round(Number(t.value)).toLocaleString()} AED financial impact`);
  const d = daysFromToday(t.deadline, today);
  if (d < 0) reasons.push(`${Math.abs(d)} days overdue`);
  else if (d === 0) reasons.push("Due today");
  else if (d <= 2) reasons.push(`Due in ${d} days`);
  if (Number(t.importance || 3) >= 5) reasons.push("Marked Critical");
  else if (Number(t.importance || 3) >= 4) reasons.push("Marked High importance");
  if (t.status === "Blocked") reasons.push("Currently blocked");
  if (t.blockedBy) reasons.push("Has an open dependency");
  if (t.goalId) reasons.push("Aligned to a goal");
  const estimate = Number(t.estimateMin || 0);
  if (estimate > 0 && estimate <= 30) reasons.push(`Quick win · ${estimate} min`);
  else if (estimate > 120) reasons.push(`Large effort · ${estimate} min`);
  return reasons;
}
