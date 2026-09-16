// AI abstraction: app -> AI service -> configured provider. Never hardcode provider in UI.
// Server route calls this; keys stay server-side (OPENAI_API_KEY / OPENROUTER_API_KEY).

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

export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): AIProvider {
  if (env.OPENAI_API_KEY) return "openai";
  if (env.OPENROUTER_API_KEY) return "openrouter";
  return "deterministic";
}

/** Deterministic fallback (prototype smartCapture keyword logic, improved + validated). */
export function deterministicParse(input: string, todayISO: string): ParsedCapture {
  const q = input.trim();
  const low = q.toLowerCase();
  let life_area = "Business";
  if (/payment|aed|paisa|money|collect|invoice|mustafa/i.test(q)) life_area = "Money";
  else if (/hair|health|doctor|walk|gym|sleep|lab/i.test(low)) life_area = "Health";
  else if (/wife|baby|ammi|sister|brother|family/i.test(low)) life_area = "Family";
  else if (/europe|finland|ireland|germany|visa|passport|ielts/i.test(low)) life_area = "Europe";
  else if (/learn|course|study|growth|book/i.test(low)) life_area = "Growth";
  let due_date: string | null = null;
  if (/tomorrow|kal/i.test(low)) {
    const d = new Date(todayISO + "T12:00:00"); d.setDate(d.getDate() + 1);
    due_date = d.toISOString().slice(0, 10);
  } else if (/next week/i.test(low)) {
    const d = new Date(todayISO + "T12:00:00"); d.setDate(d.getDate() + 7);
    due_date = d.toISOString().slice(0, 10);
  }
  const m = q.match(/(?:aed\s*)?([0-9][0-9,]{2,})/i);
  const amount = m ? Number(m[1].replace(/,/g, "")) : null;
  const priority = /(urgent|critical|expiry|payment|doctor|renewal)/i.test(low) ? "Critical" : /(important|follow)/i.test(low) ? "High" : "Medium";
  const person = (q.match(/(mustafa|accountant|partner)/i) || [])[1] || "";
  return {
    type: life_area === "Money" ? "payment_followup" : "task",
    title: q.replace(/\s+/g, " ").trim().slice(0, 200),
    life_area, priority, due_date,
    reminder_time: /morning|subah/i.test(low) ? "09:00" : "09:00",
    amount, person, project: "", notes: "Smart captured (deterministic fallback)",
    confidence: 0.55,
  };
}

export function validateParsed(p: ParsedCapture): ParsedCapture {
  if (!p.title || p.title.length < 2) throw new Error("AI returned empty title");
  if (p.amount != null && (!Number.isFinite(p.amount) || p.amount < 0)) throw new Error("Invalid amount from AI");
  if (p.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(p.due_date)) throw new Error("Invalid due_date from AI");
  p.confidence = Math.max(0, Math.min(1, Number(p.confidence || 0)));
  return p;
}

/** Minimal structured context sent to AI — never the whole DB. */
export interface AIContext {
  today_tasks: { title: string; due: string | null; score: number }[];
  overdue_tasks: { title: string; days: number }[];
  money_due: { name: string; remaining: number; nextFollowUp: string | null }[];
  active_goals: { name: string; progress: number }[];
  upcoming_family: { title: string; due: string }[];
  migration_blockers: string[];
}
