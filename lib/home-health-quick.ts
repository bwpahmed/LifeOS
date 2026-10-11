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

export type MedicineDoseState="taken"|"overdue"|"due-now"|"due-soon"|"upcoming";
/** Return status using the user's selected timezone, not server/browser default. */
export function medicineDoseState(time:string,nowHHMM:string,taken:boolean):MedicineDoseState {
 if(taken)return "taken";
 const minutes=(hhmm:string)=>{
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hhmm))return NaN;
  const [h,m]=hhmm.split(":").map(Number);return h*60+m;
 };
 const due=minutes(time),now=minutes(nowHHMM);
 if(!Number.isFinite(due)||!Number.isFinite(now))return "upcoming";
 const difference=due-now;
 if(difference < -14)return "overdue";
 if(difference<=0)return "due-now";
 if(difference<=30)return "due-soon";
 return "upcoming";
}
export function localHHMM(timeZone:string,instant=new Date()){
 try{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(instant);
  const obj=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return obj.hour+":"+obj.minute;
 }catch{return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",hour:"2-digit",minute:"2-digit",hour12:false}).format(instant);}
}
export function orderMedicineDoses<T extends {state:MedicineDoseState;time:string}>(doses:T[]):T[]{
 const rank:Record<MedicineDoseState,number>={"overdue":0,"due-now":1,"due-soon":2,"upcoming":3,"taken":4};
 return [...doses].sort((a,b)=>rank[a.state]-rank[b.state]||a.time.localeCompare(b.time));
}
