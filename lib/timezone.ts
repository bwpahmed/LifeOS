// Timezone: DB stores UTC; UI displays Asia/Dubai default (user-configurable).
// Reminder jobs must be timezone-aware — always compare in the user's TZ.

export const DEFAULT_TIMEZONE = "Asia/Dubai";
export const DEFAULT_CURRENCY = "AED";

export function todayInTZ(tz = DEFAULT_TIMEZONE, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  return parts; // YYYY-MM-DD
}

export function isInQuietHours(hm: string, start: string, end: string): boolean {
  if (!start || !end) return false;
  return start < end ? hm >= start && hm < end : hm >= start || hm < end;
}
