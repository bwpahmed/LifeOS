"use client";
import { useState } from "react";
import { BackHome, Panel } from "@/components/ui";
import type { ParsedCapture } from "@/lib/ai/service";

export default function QuickAddPage() {
  const [text, setText] = useState("Kal subah Mustafa ko 25000 AED payment ke liye call karna");
  const [out, setOut] = useState<ParsedCapture | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);

  async function parse() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, todayISO: new Date().toISOString().slice(0, 10) }) });
      const j = await r.json();
      setOut(j.parsed); setProvider(`${j.provider} — ${j.label}`);
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-xl pt-6">
      <BackHome />
      <Panel title="Capture anything" kicker="QUICK ADD + SMART CAPTURE">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white" />
        <button onClick={parse} disabled={loading} className="mt-2 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{loading ? "Parsing…" : "Smart Capture"}</button>
        {provider && <p className="mt-2 text-xs text-slate-500">{provider}. Low confidence? Review before save — nothing saves until you confirm.</p>}
        {out && <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-200">{JSON.stringify(out, null, 2)}</pre>}
      </Panel>
    </main>
  );
}
