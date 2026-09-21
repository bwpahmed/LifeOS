// Habit metrics support Daily, Weekly, Monthly, X-times/week and Specific days.
// Missing one day/period reduces consistency; it does not reset historical progress.

export function habitConsistency(logs: Record<string, number>, days: string[]): number {
  if (!days.length) return 0;
  const done = days.filter((d) => Number(logs?.[d] || 0) > 0).length;
  return Math.round((done / days.length) * 100);
}

function mondayKey(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function weekday(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
}

function expectedGroups(days: string[], frequency: string, target = 1): { key: string; days: string[]; target: number }[] {
  const specific = frequency.startsWith("Specific days:")
    ? frequency.slice("Specific days:".length).split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const eligible = specific.length ? days.filter((d) => specific.includes(weekday(d))) : days;
  if (frequency === "Monthly") {
    const map = new Map<string, string[]>();
    for (const d of eligible) (map.get(d.slice(0, 7)) || (map.set(d.slice(0, 7), []), map.get(d.slice(0, 7))!)).push(d);
    return Array.from(map, ([key, ds]) => ({ key, days: ds, target: 1 }));
  }
  if (frequency === "Weekly" || frequency === "X times per week") {
    const map = new Map<string, string[]>();
    for (const d of eligible) {
      const key = mondayKey(d);
      const list = map.get(key) || [];
      list.push(d);
      map.set(key, list);
    }
    return Array.from(map, ([key, ds]) => ({ key, days: ds, target: frequency === "Weekly" ? 1 : Math.max(1, target) }));
  }
  return eligible.map((d) => ({ key: d, days: [d], target: 1 }));
}

export function habitConsistencyForFrequency(
  logs: Record<string, number>,
  days: string[],
  frequency: string,
  target = 1
): number {
  const groups = expectedGroups(days, frequency, target);
  if (!groups.length) return 0;
  let achieved = 0;
  let expected = 0;
  for (const g of groups) {
    const done = g.days.reduce((a, d) => a + (Number(logs?.[d] || 0) > 0 ? 1 : 0), 0);
    achieved += Math.min(done, g.target);
    expected += g.target;
  }
  return expected ? Math.round((achieved / expected) * 100) : 0;
}

export function habitPeriodStreak(
  logs: Record<string, number>,
  days: string[],
  frequency: string,
  target = 1
): number {
  const groups = expectedGroups(days, frequency, target);
  if (!groups.length) return 0;
  const met = (g: { days: string[]; target: number }) =>
    g.days.filter((d) => Number(logs?.[d] || 0) > 0).length >= g.target;
  let i = groups.length - 1;
  if (i >= 0 && !met(groups[i])) i -= 1; // current period may still be in progress
  let streak = 0;
  for (; i >= 0; i -= 1) {
    if (!met(groups[i])) break;
    streak += 1;
  }
  return streak;
}

export function recoveryScore(
  logs: Record<string, number>,
  days: string[],
  frequency: string,
  target = 1
): number {
  const groups = expectedGroups(days, frequency, target);
  const met = (g: { days: string[]; target: number }) =>
    g.days.filter((d) => Number(logs?.[d] || 0) > 0).length >= g.target;
  let misses = 0;
  let recovered = 0;
  for (let i = 0; i < groups.length - 1; i += 1) {
    if (!met(groups[i])) {
      misses += 1;
      if (met(groups[i + 1])) recovered += 1;
    }
  }
  return misses ? Math.round((recovered / misses) * 100) : 100;
}

export function currentStreak(logs: Record<string, number>, todayISO: string): number {
  let streak = 0;
  const d = new Date(todayISO + "T12:00:00");
  if (!Number(logs?.[todayISO] || 0)) d.setDate(d.getDate() - 1);
  while (true) {
    const local = new Date(d);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    const key = local.toISOString().slice(0, 10);
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
