import type {AIContext} from "./service";

/** A server-side allowlist: client context is advisory, never trusted.
 * Completely discards undeclared objects like raw_health, lab_results,
 * prescription, tokens, etc before invoking an external AI provider.
 */
export function sanitizeCoachContext(input: unknown): AIContext {
 const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
 const x=obj(input);
 const str=(v:unknown,max=160)=>typeof v==="string"?v.replace(/[\u0000-\u001f]/g," ").trim().slice(0,max):"";
 const num=(v:unknown,max=1_000_000)=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
 const nullableNum=(v:unknown,max=1_000_000):number|null=>v==null?null:typeof v==="number"&&Number.isFinite(v)?num(v,max):null;
 const iso=(v:unknown)=>{const s=str(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;};
 const rows=(key:string,n=25)=>Array.isArray(x[key])?(x[key] as unknown[]).slice(0,n).map(obj):[];
 const today_tasks=rows("today_tasks").map(r=>({title:str(r.title,180),due:iso(r.due),score:num(r.score,100)})).filter(r=>r.title);
 const overdue_tasks=rows("overdue_tasks").map(r=>({title:str(r.title,180),days:num(r.days,3650)})).filter(r=>r.title);
 const money_due=rows("money_due").map(r=>({name:str(r.name,120),remaining:num(r.remaining,1e9),nextFollowUp:iso(r.nextFollowUp)})).filter(r=>r.name);
 const active_goals=rows("active_goals").map(r=>({name:str(r.name,160),progress:num(r.progress,100)})).filter(r=>r.name);
 const upcoming_family=rows("upcoming_family").map(r=>({title:str(r.title,180),due:iso(r.due)||""})).filter(r=>r.title&&r.due);
 const migration_blockers=Array.isArray(x.migration_blockers)?(x.migration_blockers as unknown[]).slice(0,25).map(v=>str(v,180)).filter(Boolean):[];
 const calendar_items=rows("calendar_items").map(r=>({title:str(r.title,180),date:str(r.date,30),kind:str(r.kind,50)})).filter(r=>r.title);
 const er=obj(x.energy);
 const energy=x.energy&&typeof x.energy==="object"?{
  score:nullableNum(er.score,100),sleepHours:nullableNum(er.sleepHours,24),mainGoal:er.mainGoal==null?null:str(er.mainGoal,180)
 }:undefined;
 const dr=obj(x.daily_health);
 const daily_health=x.daily_health&&typeof x.daily_health==="object"&&!Array.isArray(x.daily_health)?{
  habits_done:num(dr.habits_done,500),habits_due:num(dr.habits_due,500),
  water_logged_ml:num(dr.water_logged_ml,100000),water_user_goal_ml:num(dr.water_user_goal_ml,100000),
  protein_estimated_g:nullableNum(dr.protein_estimated_g,5000),medicine_slots_unlogged:num(dr.medicine_slots_unlogged,100),
  hair_care_done:num(dr.hair_care_done,100),hair_care_count:num(dr.hair_care_count,100)
 }:undefined;
 return {today_tasks,overdue_tasks,money_due,active_goals,upcoming_family,migration_blockers,energy,calendar_items,daily_health};
}
