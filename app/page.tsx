import Link from "next/link";

const modules = [
  ["Must Win Today", "Live priority planner", "/today"],
  ["Tasks", "Cloud task system", "/tasks"],
  ["Money", "Receivables & follow-ups", "/money"],
  ["Health", "Private health tracking", "/health"],
  ["Family", "Family & baby records", "/family"],
  ["Europe", "Relocation documents", "/europe"],
  ["Goals", "Long-term outcomes", "/goals"],
  ["Projects", "Execution layer", "/projects"],
  ["AI Coach", "Data-grounded planning", "/coach"],
  ["Quick Add", "AI / deterministic capture", "/quick-add"],
  ["Settings", "Legacy cloud import", "/settings"],
  ["Sign in", "Supabase magic link", "/login"],
];

export default function Home() {
  return (
    <main className="page-root pt-6">
      <p className="text-[11px] tracking-[1.45px] text-slate-400">LIFEOS</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Do the right thing first.</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Right thing. Right time. Consistently. Cloud data is protected by workspace RLS; AI suggestions remain review-before-save.
      </p>

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
        <span className="text-[11px] tracking-widest text-slate-400">SECURITY & SETUP</span>
        <h2 className="mt-1 text-lg font-bold">Supabase is the source of truth</h2>
        <p className="mt-1 text-sm text-slate-400">
          Apply the baseline schema or the latest Supabase migration, configure environment variables, then sign in. The preserved standalone app remains under legacy/ for migration/reference.
        </p>
      </div>
    </main>
  );
}
