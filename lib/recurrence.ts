// Recurrence: generate the NEXT occurrence only (never bulk-create hundreds).
// Supports Daily / Weekly / Monthly / Yearly / Every X days / Specific weekdays.

export type Recurrence =
  | { kind: "none" }
  | { kind: "daily" }
  | { kind: "weekly" }
  | { kind: "monthly" }
  | { kind: "yearly" }
  | { kind: "everyXDays"; days: number }
  | { kind: "weekdays"; days: number[] }; // 0=Sun..6=Sat

export function iso(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

export function nextOccurrence(fromISO: string, r: Recurrence): string | null {
  const base = new Date(fromISO + "T12:00:00");
  if (r.kind === "none") return null;
  if (r.kind === "daily") { base.setDate(base.getDate() + 1); return iso(base); }
  if (r.kind === "weekly") { base.setDate(base.getDate() + 7); return iso(base); }
  if (r.kind === "monthly") { base.setMonth(base.getMonth() + 1); return iso(base); }
  if (r.kind === "yearly") { base.setFullYear(base.getFullYear() + 1); return iso(base); }
  if (r.kind === "everyXDays") { base.setDate(base.getDate() + Math.max(1, r.days)); return iso(base); }
  if (r.kind === "weekdays") {
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      if (r.days.includes(d.getDay())) return iso(d);
    }
    return null;
  }
  return null;
}

export function parseLegacyRecurring(s?: string): Recurrence {
  const v = (s || "").toLowerCase();
  if (v === "daily") return { kind: "daily" };
  if (v === "weekly") return { kind: "weekly" };
  if (v === "monthly") return { kind: "monthly" };
  if (v === "yearly") return { kind: "yearly" };
  return { kind: "none" };
}
