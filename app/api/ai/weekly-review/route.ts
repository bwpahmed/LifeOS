import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { coachAnswer,type AIContext } from "@/lib/ai/service";
import { remaining } from "@/lib/money";
import { todayInTZ } from "@/lib/timezone";

function daysLate(date:string|null,today:string){if(!date||date>=today)return 0;return Math.max(0,Math.floor((new Date(today+"T12:00:00").getTime()-new Date(date+"T12:00:00").getTime())/86400000));}

export async function POST(){
 const sb=await supabaseServer();const ctx=await currentWorkspace(sb);if(!ctx)return NextResponse.json({error:"Unauthorized"},{status:401});const today=todayInTZ();
 const[tasks,recs,goals,family,docs]=await Promise.all([
  sb.from("tasks").select("name,status,deadline,importance,financial_value").eq("workspace_id",ctx.workspaceId).not("status","in",'("Cancelled")').limit(200),
  sb.from("receivables").select("name,total,next_followup,status,receivable_payments(amount,date)").eq("workspace_id",ctx.workspaceId).limit(100),
  sb.from("goals").select("name,progress,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed").limit(25),
  sb.from("family_tasks").select("title,due_date,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed").limit(25),
  sb.from("migration_documents").select("name,status").eq("workspace_id",ctx.workspaceId).neq("status","Ready").limit(25)
 ]);for(const q of[tasks,recs,goals,family,docs])if(q.error)return NextResponse.json({error:q.error.message},{status:500});
 const taskRows=tasks.data||[];const recRows=(recs.data||[]) as any[];
 const context:AIContext={
  today_tasks:taskRows.filter((t:any)=>t.status==="Today"||t.deadline===today).slice(0,25).map((t:any)=>({title:t.name,due:t.deadline,score:Number(t.importance||3)*20})),
  overdue_tasks:taskRows.filter((t:any)=>t.deadline&&t.deadline<today&&!["Completed","Cancelled"].includes(t.status)).slice(0,25).map((t:any)=>({title:t.name,days:daysLate(t.deadline,today)})),
  money_due:recRows.filter((r:any)=>r.status!=="Paid").map((r:any)=>({name:r.name,remaining:remaining(Number(r.total||0),(r.receivable_payments||[]).map((p:any)=>({amount:Number(p.amount||0),date:p.date}))),nextFollowUp:r.next_followup})).filter((r:any)=>r.remaining>0).slice(0,25),
  active_goals:(goals.data||[]).map((g:any)=>({name:g.name,progress:Number(g.progress||0)})).slice(0,25),
  upcoming_family:(family.data||[]).filter((x:any)=>x.due_date).map((x:any)=>({title:x.title,due:x.due_date})).slice(0,25),
  migration_blockers:(docs.data||[]).map((d:any)=>d.name+": "+d.status).slice(0,25)
 };
 const result=await coachAnswer("Prepare a concise weekly review: Winning, Problems, and next week top 3 focus areas. Use only supplied facts.",context,process.env);
 return NextResponse.json({answer:result.answer,provider:result.provider,live:result.live,label:result.live?"Live AI weekly review via "+result.provider:"Deterministic factual fallback"});
}
