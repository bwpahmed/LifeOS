import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { googleConfigured } from "@/lib/google-calendar";

export async function GET(){
  const sb=await supabaseServer();
  const auth=await sb.auth.getUser();
  if(!auth.data.user)return NextResponse.json({authenticated:false,configured:googleConfigured(),connected:false});
  const{data,error}=await sb.from("external_connections")
    .select("account_email,updated_at").eq("user_id",auth.data.user.id).eq("provider","google_calendar").maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({
    authenticated:true,configured:googleConfigured(),connected:Boolean(data),
    accountEmail:data?.account_email||null,updatedAt:data?.updated_at||null
  });
}
