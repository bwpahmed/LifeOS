import type { SupabaseClient } from "@supabase/supabase-js";

export interface QueuedOp {
  id: string;
  table: string;
  op: "upsert" | "delete";
  row: Record<string, unknown>;
  clientUpdatedAt: string;
  attempts?: number;
}

const KEY = "lifeos_sync_queue_v1";

export function loadQueue(): QueuedOp[] {
  try {
    if (typeof localStorage === "undefined") return [];
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch { return []; }
}

function saveQueue(q: QueuedOp[]) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
}

export function enqueue(op: QueuedOp): QueuedOp[] {
  const current = loadQueue();
  const q = [...current.filter((x) => x.id !== op.id), op];
  saveQueue(q);
  return q;
}

export function dequeue(id: string): QueuedOp[] {
  const q = loadQueue().filter((o) => o.id !== id);
  saveQueue(q);
  return q;
}

export function queueUpsert(table: string, row: Record<string, unknown>, id?: string) {
  const opId = id || `${table}:${String(row.id || globalThis.crypto?.randomUUID?.() || Date.now())}`;
  return enqueue({ id: opId, table, op: "upsert", row, clientUpdatedAt: new Date().toISOString(), attempts: 0 });
}

export function queueDelete(table: string, row: Record<string, unknown>, id?: string) {
  const opId = id || `${table}:delete:${String(row.id || Date.now())}`;
  return enqueue({ id: opId, table, op: "delete", row, clientUpdatedAt: new Date().toISOString(), attempts: 0 });
}

export async function replayQueue(client: SupabaseClient) {
  const queue = loadQueue();
  let synced = 0;
  const remaining: QueuedOp[] = [];
  for (const op of queue) {
    try {
      let error: { message?: string } | null = null;
      if (op.op === "delete") {
        if (!op.row.id) throw new Error("Queued delete is missing row.id");
        const result = await client.from(op.table).delete().eq("id", op.row.id);
        error = result.error;
      } else {
        const conflict = op.table === "habit_logs" ? "habit_id,date" : "id";
        const result = await client.from(op.table).upsert(op.row, { onConflict: conflict });
        error = result.error;
      }
      if (error) throw new Error(error.message || "Sync failed");
      synced += 1;
    } catch {
      remaining.push({ ...op, attempts: Number(op.attempts || 0) + 1 });
    }
  }
  saveQueue(remaining);
  return { synced, remaining: remaining.length };
}

export function serverWins(serverUpdatedAt: string, clientUpdatedAt: string): boolean {
  return new Date(serverUpdatedAt).getTime() >= new Date(clientUpdatedAt).getTime();
}
