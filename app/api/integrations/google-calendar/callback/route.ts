import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret,googleConfigured,googleRedirectUri,verifyState } from "@/lib/google-calendar";

export async function GET(request:Request){
  const url=new URL(request.url);
  try{
    if(!googleConfigured())throw new Error("Google Calendar OAuth is not configured");
    const code=url.searchParams.get("code");
    const stateRaw=url.searchParams.get("state");
    if(!code||!stateRaw)throw new Error("Missing OAuth callback parameters");
    const state=verifyState(stateRaw);
    const redirectUri=googleRedirectUri(url.origin);
    const tokenRes=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        code,
        client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
        redirect_uri:redirectUri,
        grant_type:"authorization_code"
      }),cache:"no-store"
    });
    const token=await tokenRes.json();
    if(!tokenRes.ok||!token.access_token)throw new Error(token.error_description||token.error||"Google token exchange failed");
    const userRes=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:"Bearer "+token.access_token},cache:"no-store"});
    const user=await userRes.json();
    if(!userRes.ok)throw new Error("Could not read Google account");
    const admin=supabaseAdmin();
    const existing=await admin.from("external_connections").select("refresh_token_enc").eq("user_id",state.userId).eq("provider","google_calendar").maybeSingle();
    const refresh=token.refresh_token?encryptSecret(token.refresh_token):(existing.data?.refresh_token_enc||null);
    const{error}=await admin.from("external_connections").upsert({
      workspace_id:state.workspaceId,user_id:state.userId,provider:"google_calendar",
      account_email:user.email||null,
      access_token_enc:encryptSecret(token.access_token),
      refresh_token_enc:refresh,
      token_expires_at:token.expires_in?new Date(Date.now()+Number(token.expires_in)*1000).toISOString():null,
      scopes:String(token.scope||"").split(" ").filter(Boolean),
      updated_at:new Date().toISOString()
    },{onConflict:"user_id,provider"});
    if(error)throw error;
    return NextResponse.redirect(new URL((state.next||"/calendar")+"?google=connected",url.origin));
  }catch(e){
    const msg=e instanceof Error?e.message:"Google Calendar connection failed";
    return NextResponse.redirect(new URL("/calendar?google=error&reason="+encodeURIComponent(msg),url.origin));
  }
}
