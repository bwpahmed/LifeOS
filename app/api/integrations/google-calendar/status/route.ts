import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { googleConfigured } from "@/lib/google-calendar";

export async function GET(){
  const sb=await supabaseServer();
  const auth=await sb.auth.getUser();
  if(!auth.data.user)return NextResponse.json({authenticated:false,configured:googleConfigured(),connected:false,mode:null});

  const [oauth,mirror]=await Promise.all([
    sb.from("external_connections")
      .select("account_email,updated_at").eq("user_id",auth.data.user.id).eq("provider","google_calendar").maybeSingle(),
    sb.from("calendar_items")
      .select("external_account,external_updated_at")
      .eq("external_provider","google_calendar")
      .eq("created_by",auth.data.user.id)
      .order("external_updated_at",{ascending:false,nullsFirst:false})
      .limit(1)
      .maybeSingle()
  ]);
  if(oauth.error)return NextResponse.json({error:oauth.error.message},{status:500});
  if(mirror.error)return NextResponse.json({error:mirror.error.message},{status:500});

  const oauthRow=oauth.data;
  const mirrorRow=mirror.data;
  const mode=oauthRow?"oauth":mirrorRow?"bridge":null;
  return NextResponse.json({
    authenticated:true,
    configured:googleConfigured(),
    connected:Boolean(oauthRow||mirrorRow),
    mode,
    accountEmail:oauthRow?.account_email||mirrorRow?.external_account||null,
    updatedAt:oauthRow?.updated_at||mirrorRow?.external_updated_at||null
  });
}
