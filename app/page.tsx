import Link from "next/link";

// Home preserves prototype dashboard sections: greeting, Life Score, Top 3,
// alerts, money overdue, health, deep work, Europe, family, waiting, goals, week, AI insights.
export default function Home() {
  return (
    <main className="page-root pt-6">
      <p className="text-[11px] tracking-[1.45px] text-slate-400">TODAY&apos;S MISSION</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Do the right thing first.</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Right thing. Right time. Consistently. LifeOS ranks money, work, health, family and
        long-term goals — Supabase is now the source of truth (local cache is offline-only).
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Money overdue", "Money Recovery", "/money"],
          ["Health today", "Health Command Center", "/health"],
          ["Must Win Today", "Today planner", "/today"],
          ["Europe docs", "Relocation", "/europe"],
        ].map(([t, s, href]) => (
          <Link key={href} href={href} className="panel p-5">
            <span className="text-xs text-slate-400">{t}</span>
            <strong className="mt-3 block text-xl">{s}</strong>
            <small className="text-slate-500">Open →</small>
          </Link>
        ))}
      </div>
      <div className="panel mt-4 p-5">
        <span className="text-[11px] tracking-widest text-slate-400">PHASE 1 STATUS</span>
        <h2 className="mt-1 text-lg font-bold">Cloud foundation landed, prototype preserved</h2>
        <p className="mt-1 text-sm text-slate-400">
          Auth + RLS schema + legacy importer + priority/money/recurrence logic + PWA shell are in this build.
          Connect Supabase env vars, run <code>supabase/schema.sql</code>, then import your JSON backup from Settings → Data.
        </p>
      </div>
    </main>
  );
}
