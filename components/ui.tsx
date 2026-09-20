import Link from "next/link";

export function Panel({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          {kicker && <span className="label">{kicker}</span>}
          <h3>{title}</h3>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="empty-state">
      <b>{title}</b>{sub}
    </div>
  );
}

export function BackHome() {
  return <Link href="/" className="back-home-link">← Home</Link>;
}
