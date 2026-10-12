import { NextResponse } from "next/server";
import { coachAnswer, type AIContext } from "@/lib/ai/service";
import {sanitizeCoachContext} from "@/lib/ai/coach-context";
import { supabaseServer } from "@/lib/supabase/server";

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

  // Strict field-level whitelist before the external AI provider. No spreading
  // untrusted request context, nested lab results, medication names or secrets.
  const safeContext:AIContext=sanitizeCoachContext(context);

  const result = await coachAnswer(question.trim(), safeContext, process.env);
  return NextResponse.json({
    answer: result.answer,
    provider: result.provider,
    live: result.live,
    label: result.live ? `Live AI coach via ${result.provider}` : "Deterministic factual fallback",
  });
}
