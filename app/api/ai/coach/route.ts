import { NextResponse } from "next/server";

// POST /api/ai/coach { question, context } — deterministic factual summary fallback.
// Live provider wiring point (server-only keys). Never invents finances/health/deadlines:
// answers only from provided structured context, with record cites.
export async function POST(req: Request) {
  const { question, context } = (await req.json().catch(() => ({}))) as {
    question?: string; context?: { money_due?: { name: string; remaining: number }[]; overdue_tasks?: { title: string }[] };
  };
  if (!question) return NextResponse.json({ error: "Empty question" }, { status: 400 });
  const money = (context?.money_due || []).map((m) => `${m.name}: AED ${m.remaining}`).join("; ");
  const overdue = (context?.overdue_tasks || []).map((t) => t.title).join("; ");
  const answer = [
    money ? `Outstanding: ${money}.` : "No money-due context provided.",
    overdue ? `Overdue: ${overdue}.` : "No overdue context provided.",
    "This is a deterministic fallback — connect OPENAI_API_KEY/OPENROUTER_API_KEY for full coaching.",
  ].join(" ");
  return NextResponse.json({ answer, label: "Deterministic fallback (no invented data)", provider: "deterministic" });
}
