import { NextResponse } from "next/server";
import { coachAnswer, type AIContext } from "@/lib/ai/service";
import { supabaseServer } from "@/lib/supabase/server";

const EMPTY_CONTEXT: AIContext = {
  today_tasks: [],
  overdue_tasks: [],
  money_due: [],
  active_goals: [],
  upcoming_family: [],
  migration_blockers: [],
};

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, context } = (await req.json().catch(() => ({}))) as {
    question?: string;
    context?: Partial<AIContext>;
  };

  if (!question || question.trim().length < 2) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Question is too long" }, { status: 413 });
  }

  // User-facing coaching can share only bounded aggregate health counts, not raw medical data.
  const numeric=(v:unknown,max=10000)=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,Math.min(v,max)):0;
  const d=context?.daily_health;
  const dailyHealth=d&&typeof d==="object"?{
    habits_done:numeric(d.habits_done,500),habits_due:numeric(d.habits_due,500),
    water_logged_ml:numeric(d.water_logged_ml,100000),water_user_goal_ml:numeric(d.water_user_goal_ml,100000),
    protein_estimated_g:typeof d.protein_estimated_g==="number"&&Number.isFinite(d.protein_estimated_g)?numeric(d.protein_estimated_g,5000):null,
    medicine_slots_unlogged:numeric(d.medicine_slots_unlogged,100),
    hair_care_done:numeric(d.hair_care_done,100),hair_care_count:numeric(d.hair_care_count,100)
  }:undefined;
  const safeContext: AIContext = {
    ...EMPTY_CONTEXT,
    ...context,
    daily_health:dailyHealth,
    today_tasks: Array.isArray(context?.today_tasks) ? context!.today_tasks!.slice(0, 25) : [],
    overdue_tasks: Array.isArray(context?.overdue_tasks) ? context!.overdue_tasks!.slice(0, 25) : [],
    money_due: Array.isArray(context?.money_due) ? context!.money_due!.slice(0, 25) : [],
    active_goals: Array.isArray(context?.active_goals) ? context!.active_goals!.slice(0, 25) : [],
    upcoming_family: Array.isArray(context?.upcoming_family) ? context!.upcoming_family!.slice(0, 25) : [],
    migration_blockers: Array.isArray(context?.migration_blockers) ? context!.migration_blockers!.slice(0, 25) : [],
    energy: context?.energy && typeof context.energy === "object" ? context.energy : undefined,
    calendar_items: Array.isArray(context?.calendar_items) ? context!.calendar_items!.slice(0,25) : [],
  };

  const result = await coachAnswer(question.trim(), safeContext, process.env);
  return NextResponse.json({
    answer: result.answer,
    provider: result.provider,
    live: result.live,
    label: result.live ? `Live AI coach via ${result.provider}` : "Deterministic factual fallback",
  });
}
