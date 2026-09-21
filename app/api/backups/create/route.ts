import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { createDailyBackup } from "@/lib/server-backup";
import { todayInTZ } from "@/lib/timezone";

export async function POST(){
 const sb=await supabaseServer();const ctx=await currentWorkspace(sb);if(!ctx)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{const path=await createDailyBackup(supabaseAdmin(),ctx.user.id,ctx.workspaceId,todayInTZ());return NextResponse.json({ok:true,path});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Backup failed"},{status:500});}
}
