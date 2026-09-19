"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { remaining, type PaymentTx } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type PaymentRow = { id: string; amount: number; date: string; method: string | null; note: string | null };
type ReceivableRow = {
  id: string;
  name: string;
  company: string | null;
  total: number;
  due_date: string | null;
  next_followup: string | null;
  promise_date: string | null;
  status: string;
  receivable_payments: PaymentRow[];
};

function aed(value: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value);
}

export default function MoneyPage() {
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [total, setTotal] = useState(0);
  const [dueDate, setDueDate] = useState(todayInTZ());
  const [nextFollowup, setNextFollowup] = useState(todayInTZ());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sb = supabaseBrowser();
      const ctx = await currentWorkspace(sb);
      if (!ctx) {
        setWorkspaceId("");
        setRows([]);
        return;
      }
      setWorkspaceId(ctx.workspaceId);
      setUserId(ctx.user.id);
      const { data, error: queryError } = await sb
        .from("receivables")
        .select("id,name,company,total,due_date,next_followup,promise_date,status,receivable_payments(id,amount,date,method,note)")
        .eq("workspace_id", ctx.workspaceId)
        .order("next_followup", { ascending: true, nullsFirst: false })
        .limit(200);
      if (queryError) throw queryError;
      setRows((data || []) as ReceivableRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load receivables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);useRealtimeRefresh(["receivables","receivable_payments","receivable_followups"],load,Boolean(workspaceId));

  const calcRemaining = (r: ReceivableRow) =>
    remaining(Number(r.total || 0), (r.receivable_payments || []).map((p) => ({ amount: Number(p.amount), date: p.date } satisfies PaymentTx)));

  const stats = useMemo(() => {
    const today = todayInTZ();
    const seven = new Date(today + "T12:00:00");
    seven.setDate(seven.getDate() + 7);
    const weekEnd = seven.toISOString().slice(0, 10);
    let open = 0, overdue = 0, dueWeek = 0, monthReceived = 0;
    const month = today.slice(0, 7);
    rows.forEach((r) => {
      const rem = calcRemaining(r);
      open += rem;
      if (rem > 0 && r.due_date && r.due_date < today) overdue += rem;
      if (rem > 0 && r.due_date && r.due_date >= today && r.due_date <= weekEnd) dueWeek += rem;
      (r.receivable_payments || []).forEach((p) => { if (p.date?.startsWith(month)) monthReceived += Number(p.amount || 0); });
    });
    return { open, overdue, dueWeek, monthReceived };
  }, [rows]);

  async function addReceivable(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !userId || !name.trim() || total <= 0) return;
    const sb = supabaseBrowser();
    const { error: insertError } = await sb.from("receivables").insert({
      workspace_id: workspaceId,
      created_by: userId,
      name: name.trim(),
      total,
      due_date: dueDate || null,
      next_followup: nextFollowup || null,
      status: "Due",
    });
    if (insertError) setError(insertError.message);
    else {
      setName(""); setTotal(0);
      await load();
    }
  }

  async function recordPayment(r: ReceivableRow) {
    const rem = calcRemaining(r);
    const raw = window.prompt(`Payment received from ${r.name}. Remaining ${aed(rem)}. Enter amount:`);
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > rem) {
      setError("Payment amount must be greater than 0 and cannot exceed remaining balance.");
      return;
    }
    const sb = supabaseBrowser();
    const { error: insertError } = await sb.from("receivable_payments").insert({
      receivable_id: r.id,
      amount,
      date: todayInTZ(),
      method: "Other",
      note: "Payment received",
      created_by: userId,
    });
    if (insertError) setError(insertError.message);
    else {
      const newRemaining = rem - amount;
      await sb.from("receivables").update({
        status: newRemaining <= 0 ? "Paid" : "Partially Paid",
        updated_at: new Date().toISOString(),
      }).eq("id", r.id);
      await load();
    }
  }

  async function addFollowup(r: ReceivableRow) {
    const note = window.prompt(`Follow-up note for ${r.name}:`);
    if (!note?.trim()) return;
    const next = window.prompt("Next follow-up date (YYYY-MM-DD):", r.next_followup || todayInTZ()) || r.next_followup || todayInTZ();
    const sb = supabaseBrowser();
    const { error: insertError } = await sb.from("receivable_followups").insert({
      receivable_id: r.id,
      date: todayInTZ(),
      method: "Call",
      note: note.trim(),
      next_followup: next,
      status: "Follow-up",
      created_by: userId,
    });
    if (insertError) { setError(insertError.message); return; }
    const { error: updateError } = await sb.from("receivables").update({
      last_followup: todayInTZ(),
      next_followup: next,
      status: "Follow-up",
      updated_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  return (
    <main className="pt-6">
      <BackHome />
      <p className="mt-2 text-[11px] tracking-widest text-slate-400">MONEY RECOVERY CRM</p>
      <h1 className="text-2xl font-bold">Receivables</h1>
      {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

      {!loading && !workspaceId ? (
        <p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              ["Total receivable", aed(stats.open)],
              ["Received this month", aed(stats.monthReceived)],
              ["Overdue", aed(stats.overdue)],
              ["Due this week", aed(stats.dueWeek)],
            ].map(([t, v]) => (
              <div key={t} className="panel p-4"><span className="text-xs text-slate-400">{t}</span><strong className="mt-2 block text-xl">{v}</strong></div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[.7fr_1.3fr]">
            <Panel title="Add receivable" kicker="NEW">
              <form onSubmit={addReceivable} className="space-y-3">
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Person / company" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2" />
                <input required type="number" min="1" value={total || ""} onChange={(e) => setTotal(Number(e.target.value))} placeholder="Total AED" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2" />
                <label className="block text-xs text-slate-400">Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white" /></label>
                <label className="block text-xs text-slate-400">Next follow-up<input type="date" value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white" /></label>
                <button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save receivable</button>
              </form>
            </Panel>

            <Panel title={loading ? "Loading…" : "Follow-up queue"}>
              <div className="space-y-2">
                {rows.length === 0 && !loading && <p className="text-sm text-slate-400">No receivables yet.</p>}
                {rows.map((r) => {
                  const rem = calcRemaining(r);
                  return (
                    <div key={r.id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <strong>{r.name}</strong>
                          <p className="text-xs text-slate-400">
                            {aed(rem)} remaining of {aed(Number(r.total))} · due {r.due_date || "—"} · next {r.next_followup || "—"} · {rem <= 0 ? "Paid" : r.status}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {rem > 0 && <button onClick={() => recordPayment(r)} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Payment</button>}
                          {rem > 0 && <button onClick={() => addFollowup(r)} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Follow up</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </>
      )}
    </main>
  );
}
