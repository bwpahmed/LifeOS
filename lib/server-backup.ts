import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const DIRECT_TABLES=[
 "goals","projects","tasks","habits","focus_sessions","health_entries","health_documents","lab_results","hair_photos","urge_logs",
 "contacts","receivables","family_members","family_tasks","baby_records","migration_countries","migration_documents","migration_tasks",
 "calendar_items","journal_entries","daily_reviews","weekly_reviews","monthly_reviews","automation_rules","notifications","attachments",
 "activity_log","ai_conversations","ai_suggestions","sync_queue","sticky_notes","money_expenses","health_routines","health_routine_logs",
 "water_logs","diet_plan_items","sleep_sessions","time_entries","morning_checkins","notification_dnd_blocks"
];

async function rows(admin:SupabaseClient,table:string,workspaceId:string){
 const q=await admin.from(table).select("*").eq("workspace_id",workspaceId);
 if(q.error)throw new Error(table+": "+q.error.message);
 return q.data||[];
}
export async function createDailyBackup(admin:SupabaseClient,userId:string,workspaceId:string,date:string){
 const out:Record<string,unknown>={version:1,created_at:new Date().toISOString(),workspace_id:workspaceId,user_id:userId};
 for(const table of DIRECT_TABLES)out[table]=await rows(admin,table,workspaceId);
 const goals=(out.goals||[]) as any[],projects=(out.projects||[]) as any[],tasks=(out.tasks||[]) as any[],habits=(out.habits||[]) as any[],recs=(out.receivables||[]) as any[],countries=(out.migration_countries||[]) as any[],rules=(out.automation_rules||[]) as any[];
 const children:[string,string,string[]][]=[
  ["goal_milestones","goal_id",goals.map(x=>x.id)],["goal_updates","goal_id",goals.map(x=>x.id)],["project_members","project_id",projects.map(x=>x.id)],
  ["task_dependencies","task_id",tasks.map(x=>x.id)],["task_comments","task_id",tasks.map(x=>x.id)],["task_activity","task_id",tasks.map(x=>x.id)],
  ["habit_logs","habit_id",habits.map(x=>x.id)],["receivable_payments","receivable_id",recs.map(x=>x.id)],["receivable_followups","receivable_id",recs.map(x=>x.id)],
  ["receivable_documents","receivable_id",recs.map(x=>x.id)],["migration_routes","country_id",countries.map(x=>x.id)],["automation_runs","rule_id",rules.map(x=>x.id)]
 ];
 for(const[table,key,ids]of children){if(!ids.length){out[table]=[];continue;}const q=await admin.from(table).select("*").in(key,ids);if(q.error)throw new Error(table+": "+q.error.message);out[table]=q.data||[];}
 const[prefs,settings,profile]=await Promise.all([
  admin.from("notification_preferences").select("*").eq("user_id",userId).maybeSingle(),
  admin.from("user_settings").select("*").eq("user_id",userId).maybeSingle(),
  admin.from("profiles").select("*").eq("id",userId).maybeSingle()
 ]);
 if(prefs.error)throw prefs.error;if(settings.error)throw settings.error;if(profile.error)throw profile.error;
 out.notification_preferences=prefs.data||null;out.user_settings=settings.data||null;out.profile=profile.data||null;
 const path=workspaceId+"/"+userId+"/backups/"+date+".json";
 const data=Buffer.from(JSON.stringify(out));
 const upload=await admin.storage.from("lifeos-private").upload(path,data,{contentType:"application/json",upsert:true});
 if(upload.error)throw upload.error;
 return path;
}
