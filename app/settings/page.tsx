"use client";
import { useState } from "react";
import { previewLegacyImport } from "@/lib/legacy-import";

// Settings → Data → Import Old LifeOS Backup: summary first, confirm before commit, no silent dupes.
export default function SettingsPage() {
  const [preview, setPreview] = useState<string>("");
  async function onFile(f: File) {
    const data = JSON.parse(await f.text());
    const p = previewLegacyImport(data);
    setPreview(
      `Tasks: ${p.counts.tasks}, Habits: ${p.counts.habits}, Goals: ${p.counts.goals}, Receivables: ${p.counts.receivables}, Family: ${p.counts.familyTasks}, Health: ${p.counts.healthEntries}\n` +
        (p.warnings.join("\n") || "No warnings. Confirm to import (dedupe on name+date).")
    );
  }
  return (
    <main className="pt-6">
      <p className="text-[11px] tracking-widest text-slate-400">SETTINGS → DATA</p>
      <h1 className="text-2xl font-bold">Import Old LifeOS Backup</h1>
      <div className="panel mt-4 p-5">
        <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} aria-label="Choose LifeOS JSON backup" />
        <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">{preview || "Choose a lifeos-backup-*.json file to preview."}</pre>
      </div>
    </main>
  );
}
