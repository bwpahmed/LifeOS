import { BackHome, Empty, Panel } from "@/components/ui";

export default function MoneyPage() {
  return (
    <main className="pt-6">
      <BackHome />
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">MONEY RECOVERY CRM</p>
      <h1 className="text-2xl font-bold">Receivables</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {["Total receivable", "Received this month", "Overdue", "Due this week"].map((t) => (
          <div key={t} className="panel p-4"><span className="text-xs text-slate-400">{t}</span><strong className="mt-2 block text-xl">—</strong></div>
        ))}
      </div>
      <div className="mt-4"><Panel title="Follow-up queue">
        <Empty title="Connect Supabase to load ledger" sub="paid/remaining derive from receivable_payments rows. Follow-ups append to receivable_followups. AI drafts messages; never auto-sends." />
      </Panel></div>
    </main>
  );
}
