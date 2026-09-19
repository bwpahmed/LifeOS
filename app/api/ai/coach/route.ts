import { NextResponse } from "next/server";
import { coachAnswer, type AIContext } from "@/lib/ai/service";

const EMPTY_CONTEXT: AIContext = {
  today_tasks: [],
  overdue_tasks: [],
  money_due: [],
  active_goals: [],
  upcoming_family: [],
  migration_blockers: [],
};

export async function POST(req: Request) {
  const { question, context } = (await req.json().catch(() => ({}))) as {
    question?: string;
    context?: Partial<AIContext>;
  };

  if (!question || question.trim().length < 2) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  const safeContext: AIContext = {
    ...EMPTY_CONTEXT,
    ...context,
    today_tasks: Array.isArray(context?.today_tasks) ? context!.today_tasks! : [],
    overdue_tasks: Array.isArray(context?.overdue_tasks) ? context!.overdue_tasks! : [],
    money_due: Array.isArray(context?.money_due) ? context!.money_due! : [],
    active_goals: Array.isArray(context?.active_goals) ? context!.active_goals! : [],
    upcoming_family: Array.isArray(context?.upcoming_family) ? context!.upcoming_family! : [],
    migration_blockers: Array.isArray(context?.migration_blockers) ? context!.migration_blockers! : [],
  };

  const result = await coachAnswer(question.trim(), safeContext, process.env);
  return NextResponse.json({
    answer: result.answer,
    provider: result.provider,
    live: result.live,
    label: result.live ? `Live AI coach via ${result.provider}` : "Deterministic factual fallback",
    ...(result.error ? { providerError: result.error } : {}),
  });
}
