import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ROLES=new Set(["admin","member","viewer"]);
const MODULES=new Set(["tasks","money","health","self_control","journal","family","baby","calendar","europe","business"]);

export async function POST(request:Request){
 const client=supabaseServer();const{data:auth,error:authError}=await client.auth.getUser();if(authError||!auth.user?.email)return NextResponse.json({error:"Sign in first"},{status:401});
 const body=await request.json().catch(()=>({})) as {token?:string};if(!body.token)return NextResponse.json({error:"Missing invitation token"},{status:400});
 const admin=supabaseAdmin();const{data:invite,error}=await admin.from("workspace_invitations").select("id,workspace_id,email,role,modules,expires_at,accepted_at").eq("token",body.token).maybeSingle();if(error||!invite)return NextResponse.json({error:"Invitation not found"},{status:404});
 if(invite.accepted_at)return NextResponse.json({error:"Invitation was already accepted"},{status:409});
 if(new Date(invite.expires_at).getTime()<Date.now())return NextResponse.json({error:"Invitation expired"},{status:410});
 if(String(invite.email).trim().toLowerCase()!==auth.user.email.trim().toLowerCase())return NextResponse.json({error:"This invitation belongs to a different email address"},{status:403});
 const role=ROLES.has(String(invite.role))?String(invite.role):"viewer";const modules=(Array.isArray(invite.modules)?invite.modules:[]).map(String).filter(m=>MODULES.has(m));
 const member=await admin.from("workspace_members").upsert({workspace_id:invite.workspace_id,user_id:auth.user.id,role,modules},{onConflict:"workspace_id,user_id"});if(member.error)return NextResponse.json({error:member.error.message},{status:400});
 const mark=await admin.from("workspace_invitations").update({accepted_at:new Date().toISOString(),accepted_by:auth.user.id}).eq("id",invite.id);if(mark.error)return NextResponse.json({error:mark.error.message},{status:400});
 return NextResponse.json({ok:true,workspaceId:invite.workspace_id,role,modules});
}
