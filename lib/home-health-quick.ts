import {scheduledForDay} from "./habit-planner";

export type QuickRoutine={
 id:string;title:string;kind:string;active:boolean;
 created_by:string;days_of_week:number[];reminder_times:string[];
 start_date:string|null;end_date:string|null;details:Record<string,unknown>|null;
};
export type QuickRoutineLog={routine_id:string;date:string;scheduled_time:string;status:string};
export type QuickHabit={id:string;name:string;frequency:string;kind:string|null;target:number|null;area:string|null};
export type QuickHabitLog={habit_id:string;date:string;value:number};

export function isoWeekday(date:string){
 const day=new Date(date+"T12:00:00Z").getUTCDay();
 return (day+6)%7+1;
}
export function dueForQuickLog(r:QuickRoutine,day:string):boolean{
 return r.active && (r.days_of_week||[]).includes(isoWeekday(day)) &&
 (!r.start_date||r.start_date<=day)&&(!r.end_date||r.end_date>=day);
}
export function ownCareRoutines(rows:QuickRoutine[],userId:string,day:string,kind:"medicine"|"hair"){
 return rows.filter(r=>r.created_by===userId&&dueForQuickLog(r,day)&&(
  kind==="medicine"?r.kind==="medicine":
  r.kind==="other"&&r.details?.source==="lifeos-hair-recovery"
 ));
}
export function isRoutineTaken(logs:QuickRoutineLog[],routineId:string,day:string,slot:string){
 return logs.some(x=>x.routine_id===routineId&&x.date===day&&x.scheduled_time===slot&&x.status==="done");
}
export function isHabitLogged(logs:QuickHabitLog[],id:string,day:string){
 return logs.some(l=>l.habit_id===id&&l.date===day&&Number(l.value)>0);
}
export function quickHabitDue(h:QuickHabit,date:string){
 return scheduledForDay(h.frequency,date);
}
export function validWaterAmount(n:number){
 return Number.isInteger(n)&&n>=1&&n<=5000;
}
