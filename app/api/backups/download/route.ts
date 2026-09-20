import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentWorkspace } from "@/lib/supabase/workspace";

export async function GET(request:Request){
 const sb=await supabaseServer();const ctx=await currentWorkspace(sb);if(!ctx)return NextResponse.json({error:"Unauthorized"},{status:401});
 const name=new URL(request.url).searchParams.get("name")||"";
 if(!/^\d{4}-\d{2}-\d{2}\.json$/.test(name))return NextResponse.json({error:"Invalid backup name"},{status:400});
 const path=ctx.workspaceId+"/"+ctx.user.id+"/backups/"+name;const admin=supabaseAdmin();
 const signed=await admin.storage.from("lifeos-private").createSignedUrl(path,120,{download:name});
 if(signed.error||!signed.data?.signedUrl)return NextResponse.json({error:signed.error?.message||"Backup not found"},{status:404});
 return NextResponse.redirect(signed.data.signedUrl);
}
