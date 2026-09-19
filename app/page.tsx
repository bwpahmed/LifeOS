import Link from "next/link";

const modules = [
  ["Today", "Must Win + live priority plan", "/today"],
  ["Tasks", "Cloud task system", "/tasks"],
  ["Habits", "Consistency & recovery", "/habits"],
  ["Focus", "Persistent deep-work timer", "/focus"],
  ["Money", "Receivables & follow-ups", "/money"],
  ["Health", "Private health tracking", "/health"],
  ["Hair", "Private photo comparison", "/hair"],
  ["Self-Control", "Trigger & response analytics", "/self-control"],
  ["Family", "Family & baby records", "/family"],
  ["Europe", "Relocation documents", "/europe"],
  ["Goals", "Long-term outcomes", "/goals"],
  ["Projects", "Execution layer", "/projects"],
  ["Calendar", "Unified obligations", "/calendar"],
  ["Notifications", "Push + reminder inbox", "/notifications"],
  ["Automations", "Visible rule engine", "/automations"],
  ["Reviews", "Daily / weekly / monthly", "/reviews"],
  ["Journal", "Private notes", "/journal"],
  ["Timeline", "Activity history", "/timeline"],
  ["Search", "Find anything", "/search"],
  ["AI Coach", "Data-grounded planning", "/coach"],
  ["Quick Add", "AI / deterministic capture", "/quick-add"],
  ["Settings", "Import & configuration", "/settings"],
];

export default function Home() {
  return (
    <main className="page-root pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[1.45px] text-slate-400">LIFEOS</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Do the right thing first.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Right thing. Right time. Consistently. Cloud data is protected by workspace RLS; AI suggestions remain review-before-save.</p>
        </div>
        <Link href="/login" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">Account</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {modules.map(([title, sub, href]) => (
          <Link key={href} href={href} className="panel p-5 transition hover:border-white/20">
            <span className="text-xs text-slate-400">{title}</span>
            <strong className="mt-3 block text-base">{sub}</strong>
            <small className="text-slate-500">Open →</small>
          </Link>
        ))}
      </div>

      <div className="panel mt-4 p-5">
        <span className="text-[11px] tracking-widest text-slate-400">PRODUCTION SETUP</span>
        <h2 className="mt-1 text-lg font-bold">Supabase + Push secrets are required for full cloud behavior</h2>
        <p className="mt-1 text-sm text-slate-400">Apply the latest Supabase migration, configure the environment variables, then sign in. Generate VAPID keys with <code>node scripts/generate-vapid.mjs</code>. The preserved standalone app remains under legacy/.</p>
      </div>
    </main>
  );
}
