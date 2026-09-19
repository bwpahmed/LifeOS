"use client";

import { useState } from "react";
import { BackHome, Panel } from "@/components/ui";
import type { ParsedCapture } from "@/lib/ai/service";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

const IMPORTANCE: Record<string, number> = { Low: 2, Medium: 3, High: 4, Critical: 5 };

export default function QuickAddPage() {
  const [text, setText] = useState("Kal subah Mustafa ko 25000 AED payment ke liye call karna");
  const [out, setOut] = useState<ParsedCapture | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function parse() {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, todayISO: todayInTZ() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Parse failed");
      setOut(j.parsed);
      setProvider(`${j.provider} — ${j.label}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSave() {
    if (!out) return;
    setSaving(true);
    setMsg("");
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) throw new Error("Sign in before saving.");

      if (out.type === "habit") {
        const { error } = await sb.from("habits").insert({
          workspace_id: ctx.workspaceId,
          created_by: ctx.user.id,
          name: out.title,
          area: out.life_area,
          frequency: "Daily",
          target: 1,
          unit: "done",
          kind: "build",
          privacy: out.life_area === "Health" || out.life_area === "Self-control" ? "private" : "family",
        });
        if (error) throw error;
      } else if (out.type === "note") {
        const { error } = await sb.from("journal_entries").insert({
          workspace_id: ctx.workspaceId,
          created_by: ctx.user.id,
          date: out.due_date || todayInTZ(),
          mood: "Captured note",
          body: out.title + (out.notes ? `\n\n${out.notes}` : ""),
          tags: ["smart-capture"],
          privacy: "private",
        });
        if (error) throw error;
      } else {
        const { error } = await sb.from("tasks").insert({
          workspace_id: ctx.workspaceId,
          created_by: ctx.user.id,
          name: out.title,
          area: out.life_area,
          status: "Inbox",
          importance: IMPORTANCE[out.priority] || 3,
          deadline: out.due_date,
          reminder_time: out.reminder_time,
          financial_value: out.amount || 0,
          start_date: todayInTZ(),
          recurrence: { kind: "none" },
          notes: [out.notes, out.person ? `Person: ${out.person}` : ""].filter(Boolean).join("\n"),
          privacy: out.life_area === "Health" || out.life_area === "Self-control" ? "private" : "family",
        });
        if (error) throw error;
      }

      setMsg("Saved to LifeOS.");
      setOut(null);
      setText("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl pt-6">
      <BackHome />
      <Panel title="Capture anything" kicker="QUICK ADD + SMART CAPTURE">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white" />
        <button onClick={parse} disabled={loading || !text.trim()} className="mt-2 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">
          {loading ? "Parsing…" : "Smart Capture"}
        </button>
        {provider && <p className="mt-2 text-xs text-slate-500">{provider}. Nothing is saved until you confirm.</p>}
        {out && (
          <>
            <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-200">{JSON.stringify(out, null, 2)}</pre>
            <button onClick={confirmSave} disabled={saving} className="mt-2 w-full rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-2 font-bold text-emerald-100 disabled:opacity-50">
              {saving ? "Saving…" : "Confirm & Save"}
            </button>
          </>
        )}
        {msg && <p className="mt-3 text-sm text-slate-300">{msg}</p>}
      </Panel>
    </main>
  );
}
