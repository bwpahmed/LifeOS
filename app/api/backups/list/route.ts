import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentWorkspace } from "@/lib/supabase/workspace";

export async function GET(){
 const sb=await supabaseServer();const ctx=await currentWorkspace(sb);if(!ctx)return NextResponse.json({error:"Unauthorized"},{status:401});
 const admin=supabaseAdmin();const prefix=ctx.workspaceId+"/"+ctx.user.id+"/backups";
 const list=await admin.storage.from("lifeos-private").list(prefix,{limit:30,sortBy:{column:"name",order:"desc"}});
 if(list.error)return NextResponse.json({error:list.error.message},{status:500});
 return NextResponse.json({backups:(list.data||[]).filter(x=>x.name.endsWith(".json")).map(x=>({name:x.name,updated_at:x.updated_at,created_at:x.created_at}))});
}
