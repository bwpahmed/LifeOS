// Habit metrics: missing one day must not zero progress.
// consistency = done-days / expected-days over window; streaks computed on daily logs.

export function habitConsistency(logs: Record<string, number>, days: string[]): number {
  if (!days.length) return 0;
  const done = days.filter((d) => Number(logs?.[d] || 0) > 0).length;
  return Math.round((done / days.length) * 100);
}

export function currentStreak(logs: Record<string, number>, todayISO: string): number {
  let streak = 0;
  const d = new Date(todayISO + "T12:00:00");
  // allow today missing: start from yesterday if today not done
  if (!Number(logs?.[todayISO] || 0)) d.setDate(d.getDate() - 1);
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    // toISOString is UTC — adjust like prototype localISO
    const local = new Date(d); local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    const key = local.toISOString().slice(0, 10);
    void iso;
    if (Number(logs?.[key] || 0) > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
    if (streak > 3650) break;
  }
  return streak;
}

export function goalProgressFromTasks(completed: number, total: number): number {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}
