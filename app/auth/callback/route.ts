import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-routing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const safeNext = safeNextPath(url.searchParams.get("next"));
  const redirectTo = new URL(safeNext, url.origin);

  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));

  return NextResponse.redirect(redirectTo);
}
