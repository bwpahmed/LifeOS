import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth-routing";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const safeNext = safeNextPath(url.searchParams.get("next"));
  const redirectTo = new URL(safeNext, url.origin);

  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items: CookieToSet[]) => {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));

  return NextResponse.redirect(redirectTo);
}
