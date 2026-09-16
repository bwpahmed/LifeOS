// Legacy LifeOS JSON import (lifeos_v3): preview counts, validate, dedupe, then commit.
// Legacy keys: tasks habits receivables goals projects family familyTasks babyRecords
// healthEntries labs hairPhotos urges countries migrationDocs focusSessions
// dailyReviews weeklyReviews journal activity customRules

export const LEGACY_KEYS = [
  "tasks", "habits", "receivables", "goals", "projects", "family", "familyTasks",
  "babyRecords", "healthEntries", "labs", "hairPhotos", "urges", "countries",
  "migrationDocs", "focusSessions", "dailyReviews", "weeklyReviews", "journal",
  "activity", "customRules",
] as const;

export interface ImportPreview {
  counts: Record<string, number>;
  warnings: string[];
}

export function previewLegacyImport(data: unknown): ImportPreview {
  if (!data || typeof data !== "object") throw new Error("Not a LifeOS backup");
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.tasks) || typeof d.settings !== "object")
    throw new Error("This does not look like a LifeOS backup (tasks/settings missing)");
  const counts: Record<string, number> = {};
  for (const k of LEGACY_KEYS) counts[k] = Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0;
  const warnings: string[] = [];
  if (counts.hairPhotos > 0)
    warnings.push(`${counts.hairPhotos} hair photos are base64 in legacy backup — they will be re-uploaded to Supabase Storage (may be large).`);
  return { counts, warnings };
}

function keyOf(prefix: string, item: Record<string, unknown>): string {
  const name = String(item.name ?? item.title ?? item.test ?? "");
  const date = String(item.date ?? item.dueDate ?? item.deadline ?? item.createdAt ?? "");
  return `${prefix}|${name.trim().toLowerCase()}|${date}`;
}

/** Dedupe incoming rows against existing rows by (name/title + date). Pure + testable. */
export function dedupe<T extends Record<string, unknown>>(prefix: string, existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((e) => keyOf(prefix, e)));
  return incoming.filter((i) => {
    const k = keyOf(prefix, i);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
