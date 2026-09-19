"use client";

import { useState } from "react";
import Link from "next/link";
import { previewLegacyImport } from "@/lib/legacy-import";
import { commitLegacyImport, type LegacyImportResult } from "@/lib/legacy-import-commit";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

export default function SettingsPage() {
  const [preview, setPreview] = useState("");
  const [backup, setBackup] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<LegacyImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onFile(f: File) {
    setError("");
    setResult(null);
    try {
      const data = JSON.parse(await f.text()) as Record<string, unknown>;
      const p = previewLegacyImport(data);
      setBackup(data);
      setPreview(
        `Tasks: ${p.counts.tasks}, Habits: ${p.counts.habits}, Goals: ${p.counts.goals}, Receivables: ${p.counts.receivables}, Family tasks: ${p.counts.familyTasks}, Health: ${p.counts.healthEntries}, Hair photos: ${p.counts.hairPhotos}\n` +
        (p.warnings.join("\n") || "No preview warnings.")
      );
    } catch (e) {
      setBackup(null);
      setPreview("");
      setError(e instanceof Error ? e.message : "Could not read backup");
    }
  }

  async function importNow() {
    if (!backup) return;
    if (!window.confirm("Import this backup into your current LifeOS workspace? Existing matching records will be skipped.")) return;

    setLoading(true);
    setError("");
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) throw new Error("Sign in before importing.");
      const imported = await commitLegacyImport({
        sb,
        data: backup as Record<string, any>,
        workspaceId: ctx.workspaceId,
        userId: ctx.user.id,
      });
      setResult(imported);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const insertedTotal = result ? Object.values(result.inserted).reduce((a, b) => a + b, 0) : 0;
  const skippedTotal = result ? Object.values(result.skipped).reduce((a, b) => a + b, 0) : 0;

  return (
    <main className="pt-6">
      <Link href="/" className="text-sm text-[#8ab6ff]">← Home</Link>
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">SETTINGS → DATA</p>
      <h1 className="text-2xl font-bold">Import Old LifeOS Backup</h1>

      {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="panel mt-4 p-5">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          aria-label="Choose LifeOS JSON backup"
        />
        <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">
          {preview || "Choose a lifeos-backup-*.json file to preview."}
        </pre>

        {backup && (
          <button
            onClick={importNow}
            disabled={loading}
            className="mt-4 rounded-lg bg-[#77adff] px-4 py-2 font-bold text-[#06101f] disabled:opacity-50"
          >
            {loading ? "Importing…" : "Confirm cloud import"}
          </button>
        )}
      </div>

      {result && (
        <div className="panel mt-4 p-5">
          <h2 className="font-bold">Import complete</h2>
          <p className="mt-2 text-sm text-slate-300">{insertedTotal} records inserted · {skippedTotal} matching records skipped.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <pre className="rounded-lg bg-black/20 p-3 text-xs text-slate-300">{JSON.stringify(result.inserted, null, 2)}</pre>
            <pre className="rounded-lg bg-black/20 p-3 text-xs text-slate-300">{JSON.stringify(result.skipped, null, 2)}</pre>
          </div>
          {result.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
              {result.warnings.map((w) => <div key={w}>{w}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="panel mt-4 p-5 text-sm text-slate-400">
        This import preserves the legacy standalone file. It does not delete old browser data.
        Sensitive hair photos are uploaded to the private LifeOS storage bucket created by the security migration.
      </div>
    </main>
  );
}
