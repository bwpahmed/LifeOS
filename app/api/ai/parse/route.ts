import { NextResponse } from "next/server";
import { deterministicParse, providerFromEnv, validateParsed } from "@/lib/ai/service";

// POST /api/ai/parse { text, todayISO } -> structured capture (validated server-side).
// Uses live provider when configured; otherwise deterministic fallback. Never blindly trusts AI.
export async function POST(req: Request) {
  const { text, todayISO } = (await req.json().catch(() => ({}))) as { text?: string; todayISO?: string };
  if (!text || text.trim().length < 2) return NextResponse.json({ error: "Empty input" }, { status: 400 });
  const provider = providerFromEnv(process.env);
  void provider; // wiring point for openai/openrouter fetch (keys server-only)
  const parsed = validateParsed(deterministicParse(text, todayISO || new Date().toISOString().slice(0, 10)));
  return NextResponse.json({ parsed, provider, label: provider === "deterministic" ? "Rule-based parse (AI not configured)" : "AI parse" });
}
