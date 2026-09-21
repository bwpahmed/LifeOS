import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { googleConfigured,googleRedirectUri,signState } from "@/lib/google-calendar";
import { currentWorkspace } from "@/lib/supabase/workspace";

export async function GET(request:Request){
  const url=new URL(request.url);
  if(!googleConfigured()) return NextResponse.json({error:"Google Calendar OAuth is not configured on the server."},{status:503});
  const sb=await supabaseServer();
  const ctx=await currentWorkspace(sb);
  if(!ctx) return NextResponse.redirect(new URL("/login?next=/calendar",url.origin));
  const next=url.searchParams.get("next")||"/calendar";
  const state=signState({userId:ctx.user.id,workspaceId:ctx.workspaceId,next});
  const redirectUri=googleRedirectUri(url.origin);
  const params=new URLSearchParams({
    client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri:redirectUri,
    response_type:"code",
    access_type:"offline",
    prompt:"consent",
    include_granted_scopes:"true",
    scope:"openid email https://www.googleapis.com/auth/calendar.readonly",
    state
  });
  return NextResponse.redirect("https://accounts.google.com/o/oauth2/v2/auth?"+params.toString());
}
