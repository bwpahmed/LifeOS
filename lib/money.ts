// Money Recovery CRM — transaction-row source of truth.
// Prototype mutated r.paid directly; V1 derives paid/remaining from transactions.
// paid = SUM(transactions.amount); remaining = total - paid. Never overwrite history.

export interface PaymentTx {
  amount: number;
  date: string; // YYYY-MM-DD
  method?: string;
  reference?: string;
  note?: string;
}

export function txTotal(txs: PaymentTx[]): number {
  return txs.reduce((a, x) => a + Number(x.amount || 0), 0);
}

export function remaining(total: number, txs: PaymentTx[]): number {
  return Math.max(0, Number(total || 0) - txTotal(txs));
}

export function applyPayment(
  total: number,
  txs: PaymentTx[],
  payment: PaymentTx
): { txs: PaymentTx[]; paid: number; remaining: number } {
  const amt = Number(payment.amount || 0);
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter payment amount");
  const rem = remaining(total, txs);
  if (amt - rem > 0.0001) throw new Error(`Amount exceeds remaining ${rem}`);
  const next = [{ ...payment, amount: amt }, ...txs];
  return { txs: next, paid: txTotal(next), remaining: remaining(total, next) };
}

export type Escalation = "Normal" | "Important" | "High" | "Critical";

/** Prototype defaults preserved: 0-1 Normal, 2-4 Important, 5-9 High, 10+ Critical; promise missed => Critical. */
export function escalation(opts: {
  overdueDays: number;
  promiseMissed: boolean;
}): Escalation {
  if (opts.promiseMissed) return "Critical";
  const d = opts.overdueDays;
  if (d >= 10) return "Critical";
  if (d >= 5) return "High";
  if (d >= 2) return "Important";
  return "Normal";
}
