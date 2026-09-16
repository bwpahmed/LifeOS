// Offline queue: IndexedDB/local cache holds unsynced ops only; Supabase is source of truth.
// Last-write-wins by updated_at for simple rows; complex edits surface conflict UI.

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

export function enqueue(op: QueuedOp): QueuedOp[] {
  const q = [...loadQueue(), op];
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
  return q;
}

export function dequeue(id: string): QueuedOp[] {
  const q = loadQueue().filter((o) => o.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
  return q;
}

/** Simple-row conflict: server row wins if server.updated_at >= client.updated_at. */
export function serverWins(serverUpdatedAt: string, clientUpdatedAt: string): boolean {
  return new Date(serverUpdatedAt).getTime() >= new Date(clientUpdatedAt).getTime();
}
