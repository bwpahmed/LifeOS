const PREFIX = "lifeos_cache_v1:";

export function saveOfflineCache<T>(key: string, value: T) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {}
}

export function loadOfflineCache<T>(key: string, maxAgeMs = 7 * 86400000): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (!parsed.at || Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function isProbablyNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = error instanceof Error ? error.message : String(error || "");
  return /fetch|network|offline|failed to connect|load failed/i.test(msg);
}
