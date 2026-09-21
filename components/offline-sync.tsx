"use client";

import { useEffect } from "react";
import { replayQueue } from "@/lib/sync-queue";
import { supabaseBrowser } from "@/lib/supabase/client";
import { replayPrivateQueue } from "@/lib/private-offline";

export function OfflineSync() {
  useEffect(() => {
    let stopped = false;
    async function sync() {
      if (stopped || !navigator.onLine) return;
      try { const client=supabaseBrowser(); await replayQueue(client); await replayPrivateQueue(client); } catch {}
    }
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(sync, 30000);
    return () => {
      stopped = true;
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, []);
  return null;
}
