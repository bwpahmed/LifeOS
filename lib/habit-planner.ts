/**
 * Planner calculations derived from the canonical LifeOS habits/habit_logs rows.
 * No parallel database, local truth or new scheduling engine.
 */
export type PlannerHabit = {
  id:string; name:string; area:string|null; frequency:string;
  target:number|null; kind:string|null; unit:string|null;
};
export type PlannerLog = { habit_id:string; date:string; value:number };

export function shiftHabitDate(iso:string, offset:number):string {
  const date=new Date(iso+"T12:00:00Z");
  date.setUTCDate(date.getUTCDate()+offset);
  return date.toISOString().slice(0,10);
}

export function mondayOf(iso:string):string {
  const date=new Date(iso+"T12:00:00Z");
  return shiftHabitDate(iso,-((date.getUTCDay()+6)%7));
}

export function weekDates(iso:string):string[] {
  const monday=mondayOf(iso);
  return Array.from({length:7},(_,i)=>shiftHabitDate(monday,i));
}

const weekdayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function scheduledForDay(frequency:string,iso:string):boolean {
  if(frequency.startsWith("Specific days:")){
    const selected=frequency.slice("Specific days:".length).split(",").map(x=>x.trim());
    const day=weekdayNames[new Date(iso+"T12:00:00Z").getUTCDay()];
    return selected.includes(day);
  }
  // Weekly, X/week and Monthly are flexible goals; available each day.
  return true;
}

export function periodTarget(habit:PlannerHabit,iso:string):number {
  const frequency=habit.frequency;
  if(frequency==="X times per week")return Math.min(7,Math.max(1,Number(habit.target||1)));
  if(frequency==="Weekly"||frequency==="Monthly")return 1;
  if(frequency.startsWith("Specific days:"))return weekDates(iso).filter(d=>scheduledForDay(frequency,d)).length;
  return 1;
}

export function periodDates(habit:PlannerHabit,iso:string):string[] {
  if(habit.frequency==="Monthly"){
    const start=iso.slice(0,7)+"-01";
    const month=new Date(start+"T12:00:00Z").getUTCMonth();
    const dates:string[]=[];
    for(let d=start;new Date(d+"T12:00:00Z").getUTCMonth()===month;d=shiftHabitDate(d,1))dates.push(d);
    return dates;
  }
  if(habit.frequency==="Daily")return [iso];
  const days=weekDates(iso);
  return habit.frequency.startsWith("Specific days:")?days.filter(d=>scheduledForDay(habit.frequency,d)):days;
}

export function logDone(logs:PlannerLog[],habitId:string,iso:string):boolean {
  return logs.some(l=>l.habit_id===habitId&&l.date===iso&&Number(l.value)>0);
}

export function periodProgress(habit:PlannerHabit,logs:PlannerLog[],iso:string):{done:number;target:number} {
  const dates=periodDates(habit,iso);
  const done=dates.reduce((n,d)=>n+(logDone(logs,habit.id,d)?1:0),0);
  return {done:Math.min(done,periodTarget(habit,iso)),target:periodTarget(habit,iso)};
}

export function habitDueOn(habit:PlannerHabit,logs:PlannerLog[],iso:string):boolean {
  if(!scheduledForDay(habit.frequency,iso))return false;
  if(habit.frequency==="Daily"||habit.frequency.startsWith("Specific days:"))return true;
  const progress=periodProgress(habit,logs,iso);
  // Keep completed habits visible on dates where already logged.
  return progress.done<progress.target || logDone(logs,habit.id,iso);
}

export function dayProgress(habits:PlannerHabit[],logs:PlannerLog[],iso:string):{done:number;total:number} {
  const eligible=habits.filter(h=>habitDueOn(h,logs,iso));
  return {
    done:eligible.filter(h=>logDone(logs,h.id,iso)).length,
    total:eligible.length,
  };
}

export function plannerCompletionTrend(habits:PlannerHabit[],logs:PlannerLog[],endDate:string,days=28):{date:string;done:number;total:number}[]{
  return Array.from({length:Math.max(1,Math.min(days,90))},(_,index)=>{
    const date=shiftHabitDate(endDate,index-(days-1));
    return {date,...dayProgress(habits,logs,date)};
  });
}
