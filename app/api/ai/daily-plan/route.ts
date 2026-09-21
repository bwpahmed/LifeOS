import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { coachAnswer,type AIContext } from "@/lib/ai/service";
import { remaining } from "@/lib/money";
import { todayInTZ } from "@/lib/timezone";
import { priorityScore } from "@/lib/priority";

function daysLate(date:string|null,today:string){if(!date||date>=today)return 0;return Math.max(0,Math.floor((new Date(today+"T12:00:00").getTime()-new Date(date+"T12:00:00").getTime())/86400000));}

export async function POST(){
 const sb=await supabaseServer();const ctx=await currentWorkspace(sb);if(!ctx)return NextResponse.json({error:"Unauthorized"},{status:401});const today=todayInTZ();
 const[tasks,recs,goals,family,docs,checkin]=await Promise.all([
  sb.from("tasks").select("id,name,status,deadline,estimate_min,importance,financial_value,area,goal_id,blocked_by,created_at").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(100),
  sb.from("receivables").select("name,total,next_followup,status,receivable_payments(amount,date)").eq("workspace_id",ctx.workspaceId).neq("status","Paid").limit(50),
  sb.from("goals").select("name,progress,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed").limit(25),
  sb.from("family_tasks").select("title,due_date,status").eq("workspace_id",ctx.workspaceId).neq("status","Completed").gte("due_date",today).limit(25),
  sb.from("migration_documents").select("name,status,expiry_date").eq("workspace_id",ctx.workspaceId).neq("status","Ready").limit(25),
  sb.from("morning_checkins").select("sleep_hours,energy,main_goal").eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id).eq("date",today).maybeSingle()
 ]);for(const q of[tasks,recs,goals,family,docs,checkin])if(q.error)return NextResponse.json({error:q.error.message},{status:500});
 const taskRows=(tasks.data||[]) as any[];
 const context:AIContext={
  today_tasks:taskRows.filter(t=>!["Waiting","Blocked"].includes(t.status)).map(t=>({title:t.name+" ("+Number(t.estimate_min||30)+" min)",due:t.deadline,score:priorityScore({status:t.status,deadline:t.deadline,importance:t.importance,value:t.financial_value,area:t.area,goalId:t.goal_id,blockedBy:t.blocked_by,createdAt:t.created_at,estimateMin:t.estimate_min})})).sort((a,b)=>b.score-a.score).slice(0,25),
  overdue_tasks:taskRows.filter(t=>t.deadline&&t.deadline<today).map(t=>({title:t.name,days:daysLate(t.deadline,today)})).slice(0,25),
  money_due:((recs.data||[]) as any[]).map(r=>({name:r.name,remaining:remaining(Number(r.total||0),(r.receivable_payments||[]).map((p:any)=>({amount:Number(p.amount||0),date:p.date}))),nextFollowUp:r.next_followup})).filter(x=>x.remaining>0).slice(0,25),
  active_goals:(goals.data||[]).map((g:any)=>({name:g.name,progress:Number(g.progress||0)})).slice(0,25),
  upcoming_family:(family.data||[]).map((x:any)=>({title:x.title,due:x.due_date})).slice(0,25),
  migration_blockers:(docs.data||[]).map((d:any)=>d.name+": "+d.status+(d.expiry_date?" · expiry "+d.expiry_date:"")).slice(0,25),
  energy:{score:checkin.data?.energy==null?null:Number(checkin.data.energy),sleepHours:checkin.data?.sleep_hours==null?null:Number(checkin.data.sleep_hours),mainGoal:checkin.data?.main_goal||null},
  calendar_items:[...(family.data||[]).map((x:any)=>({title:x.title,date:x.due_date,kind:"Family"})),...(docs.data||[]).filter((d:any)=>d.expiry_date).map((d:any)=>({title:d.name,date:d.expiry_date,kind:"Document"}))].slice(0,25)
 };
 const result=await coachAnswer("Create a realistic plan for today. Consider task durations, current energy/sleep, deadlines, money impact, family obligations and main goal. Use time blocks. Do not claim to reschedule or complete anything.",context,process.env);
 return NextResponse.json({answer:result.answer,provider:result.provider,live:result.live,label:result.live?"Live AI daily planner via "+result.provider:"Deterministic factual fallback"});
}
