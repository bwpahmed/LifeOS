import { NextResponse } from "next/server";
import { parseCapture } from "@/lib/ai/service";

export async function POST(req: Request) {
  const { text, todayISO } = (await req.json().catch(() => ({}))) as {
    text?: string;
    todayISO?: string;
  };

  if (!text || text.trim().length < 2) {
    return NextResponse.json({ error: "Empty input" }, { status: 400 });
  }

  const result = await parseCapture(
    text,
    todayISO || new Date().toISOString().slice(0, 10),
    process.env
  );

  return NextResponse.json({
    parsed: result.parsed,
    provider: result.provider,
    live: result.live,
    label: result.live
      ? `Live AI parse via ${result.provider}`
      : result.attemptedProvider
        ? `Rule-based fallback after ${result.attemptedProvider} error`
        : "Rule-based parse (AI not configured)",
    ...(result.error ? { providerError: result.error } : {}),
  });
}
