// AI abstraction: app -> AI service -> configured provider.
// Provider keys stay server-side. Model output is untrusted and validated before use.

export type AIProvider = "openai" | "openrouter" | "deterministic";

export interface ParsedCapture {
  type: "task" | "payment_followup" | "habit" | "note";
  title: string;
  life_area: string;
  priority: string;
  due_date: string | null;
  reminder_time: string | null;
  amount: number | null;
  person: string;
  project: string;
  notes: string;
  confidence: number;
}

export interface AIContext {
  today_tasks: { title: string; due: string | null; score: number }[];
  overdue_tasks: { title: string; days: number }[];
  money_due: { name: string; remaining: number; nextFollowUp: string | null }[];
  active_goals: { name: string; progress: number }[];
  upcoming_family: { title: string; due: string }[];
  migration_blockers: string[];
}

export interface ParseCaptureResult {
  parsed: ParsedCapture;
  provider: AIProvider;
  live: boolean;
  attemptedProvider?: AIProvider;
  error?: string;
}

export interface CoachResult {
  answer: string;
  provider: AIProvider;
  live: boolean;
  error?: string;
}

export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): AIProvider {
  if (env.OPENAI_API_KEY) return "openai";
  if (env.OPENROUTER_API_KEY) return "openrouter";
  return "deterministic";
}

export function deterministicParse(input: string, todayISO: string): ParsedCapture {
  const q = input.trim();
  const low = q.toLowerCase();
  let life_area = "Business";
  if (/payment|aed|paisa|pese|money|collect|invoice/i.test(low)) life_area = "Money";
  else if (/hair|health|doctor|walk|gym|sleep|lab|testosterone/i.test(low)) life_area = "Health";
  else if (/wife|baby|ammi|sister|brother|family/i.test(low)) life_area = "Family";
  else if (/europe|finland|ireland|germany|visa|passport|ielts/i.test(low)) life_area = "Europe";
  else if (/learn|course|study|growth|book/i.test(low)) life_area = "Growth";

  let due_date: string | null = null;
  if (/tomorrow|kal/i.test(low)) {
    const d = new Date(todayISO + "T12:00:00");
    d.setDate(d.getDate() + 1);
    due_date = d.toISOString().slice(0, 10);
  } else if (/next week/i.test(low)) {
    const d = new Date(todayISO + "T12:00:00");
    d.setDate(d.getDate() + 7);
    due_date = d.toISOString().slice(0, 10);
  }

  const m = q.match(/(?:aed\s*)?([0-9][0-9,]{2,})/i);
  const amount = m ? Number(m[1].replace(/,/g, "")) : null;
  const priority = /(urgent|critical|expiry|expire|payment|doctor|renewal)/i.test(low)
    ? "Critical"
    : /(important|follow)/i.test(low)
      ? "High"
      : "Medium";

  const urduPerson = q.match(/\b([A-Z][a-zA-Z]{1,50})\s+ko\b/);
  const knownPerson = q.match(/\b(mustafa|accountant|partner)\b/i);
  const actionPerson = q.match(/\b(?:call|contact|ask|follow(?:\s*up)?)\s+([A-Z][a-zA-Z]{1,50})\b/i);
  const person = urduPerson?.[1] || knownPerson?.[1] || actionPerson?.[1] || "";

  return {
    type: life_area === "Money" ? "payment_followup" : "task",
    title: q.replace(/\s+/g, " ").trim().slice(0, 200),
    life_area,
    priority,
    due_date,
    reminder_time: /evening|shaam/i.test(low) ? "19:00" : /afternoon|dopahar/i.test(low) ? "15:00" : "09:00",
    amount,
    person,
    project: "",
    notes: "Smart captured (deterministic fallback)",
    confidence: 0.55,
  };
}

const ALLOWED_TYPES = new Set(["task", "payment_followup", "habit", "note"]);
const ALLOWED_PRIORITIES = new Set(["Low", "Medium", "High", "Critical"]);
const ALLOWED_AREAS = new Set(["Business", "Money", "Health", "Family", "Europe", "Growth", "Personal", "Self-control"]);

export function validateParsed(input: ParsedCapture): ParsedCapture {
  const p: ParsedCapture = { ...input };
  if (!p.title || p.title.trim().length < 2) throw new Error("AI returned empty title");
  p.title = p.title.trim().slice(0, 200);
  if (!ALLOWED_TYPES.has(p.type)) p.type = "task";
  if (!ALLOWED_PRIORITIES.has(p.priority)) p.priority = "Medium";
  if (!ALLOWED_AREAS.has(p.life_area)) p.life_area = "Personal";
  if (p.amount != null && (!Number.isFinite(Number(p.amount)) || Number(p.amount) < 0)) {
    throw new Error("Invalid amount from AI");
  }
  p.amount = p.amount == null ? null : Number(p.amount);
  if (p.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(p.due_date)) throw new Error("Invalid due_date from AI");
  if (p.reminder_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.reminder_time)) p.reminder_time = null;
  p.person = String(p.person || "").slice(0, 120);
  p.project = String(p.project || "").slice(0, 120);
  p.notes = String(p.notes || "").slice(0, 500);
  p.confidence = Math.max(0, Math.min(1, Number(p.confidence || 0)));
  return p;
}

function configFor(provider: AIProvider, env: NodeJS.ProcessEnv) {
  if (provider === "openai") {
    return {
      url: env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions",
      key: env.OPENAI_API_KEY || "",
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      extraHeaders: {} as Record<string, string>,
    };
  }
  if (provider === "openrouter") {
    const extraHeaders: Record<string, string> = { "X-Title": "LifeOS" };
    if (env.NEXT_PUBLIC_SITE_URL) extraHeaders["HTTP-Referer"] = env.NEXT_PUBLIC_SITE_URL;
    return {
      url: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions",
      key: env.OPENROUTER_API_KEY || "",
      model: env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      extraHeaders,
    };
  }
  throw new Error("No live AI provider configured");
}

async function chat(
  provider: Exclude<AIProvider, "deterministic">,
  messages: { role: "system" | "user"; content: string }[],
  env: NodeJS.ProcessEnv,
  jsonMode = false
): Promise<string> {
  const cfg = configFor(provider, env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.1,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`${provider} returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | { text?: string }[] } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((x) => x.text || "").join("");
  throw new Error(`${provider} returned no message content`);
}

function parseJsonObject(text: string): unknown {
  const cleaned = text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "");
  return JSON.parse(cleaned);
}

export async function parseCapture(
  input: string,
  todayISO: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<ParseCaptureResult> {
  const provider = providerFromEnv(env);
  if (provider === "deterministic") {
    return { parsed: validateParsed(deterministicParse(input, todayISO)), provider, live: false };
  }

  const system = [
    "You parse LifeOS brain-dump text into one JSON object.",
    "Never invent a person, amount, date, project, or deadline not supported by the text.",
    `Today is ${todayISO}. Convert relative dates using that date.`,
    "Allowed type: task, payment_followup, habit, note.",
    "Allowed life_area: Business, Money, Health, Family, Europe, Growth, Personal, Self-control.",
    "Allowed priority: Low, Medium, High, Critical.",
    "reminder_time must be HH:MM 24-hour or null. due_date must be YYYY-MM-DD or null.",
    "Return exactly these keys: type,title,life_area,priority,due_date,reminder_time,amount,person,project,notes,confidence.",
    "confidence is 0 to 1. Return JSON only.",
  ].join("\n");

  try {
    const raw = await chat(provider, [{ role: "system", content: system }, { role: "user", content: input }], env, true);
    const parsed = validateParsed(parseJsonObject(raw) as ParsedCapture);
    return { parsed, provider, live: true };
  } catch (error) {
    return {
      parsed: validateParsed(deterministicParse(input, todayISO)),
      provider: "deterministic",
      attemptedProvider: provider,
      live: false,
      error: error instanceof Error ? error.message : "AI provider failed",
    };
  }
}

export async function coachAnswer(
  question: string,
  context: AIContext,
  env: NodeJS.ProcessEnv = process.env
): Promise<CoachResult> {
  const provider = providerFromEnv(env);
  const fallback = () => {
    const money = context.money_due.map((m) => `${m.name}: AED ${m.remaining}`).join("; ");
    const overdue = context.overdue_tasks.map((t) => t.title).join("; ");
    return [
      money ? `Outstanding: ${money}.` : "No outstanding-money context provided.",
      overdue ? `Overdue: ${overdue}.` : "No overdue-task context provided.",
    ].join(" ");
  };

  if (provider === "deterministic") return { answer: fallback(), provider, live: false };

  const system = [
    "You are the LifeOS planning coach.",
    "Use ONLY facts present in the provided structured context.",
    "Never invent money, health results, deadlines, people, or completed work.",
    "Give concise, prioritized actions and explain the factual reason for each.",
    "If the context does not support an answer, say that plainly.",
  ].join("\n");

  try {
    const answer = await chat(
      provider,
      [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ question, context }) },
      ],
      env,
      false
    );
    return { answer: answer.trim(), provider, live: true };
  } catch (error) {
    return {
      answer: fallback(),
      provider: "deterministic",
      live: false,
      error: error instanceof Error ? error.message : "AI provider failed",
    };
  }
}
