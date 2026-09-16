import Link from "next/link";

export function Panel({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      {kicker && <p className="text-[11px] tracking-widest text-slate-400">{kicker}</p>}
      <h2 className="mt-1 text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
      <b className="block text-slate-200">{title}</b>{sub}
    </div>
  );
}

export function BackHome() {
  return <Link href="/" className="text-sm text-[#8ab6ff]">← Home</Link>;
}
