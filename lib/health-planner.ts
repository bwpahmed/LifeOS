export const HEALTH_TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseReminderTimes(input:string){
  const tokens=input.split(",").map(x=>x.trim()).filter(Boolean);
  const valid=Array.from(new Set(tokens.filter(x=>HEALTH_TIME_RE.test(x))));
  const invalid=tokens.filter(x=>!HEALTH_TIME_RE.test(x));
  return{times:valid,invalid};
}

export function clampWaterGoal(value:number|undefined|null){
  const n=Number(value);
  if(!Number.isFinite(n))return 2500;
  return Math.max(250,Math.min(10000,n));
}

export function sleepMinutes(bed:string,wake:string){
  if(!HEALTH_TIME_RE.test(bed)||!HEALTH_TIME_RE.test(wake))return null;
  const[bh,bm]=bed.split(":").map(Number);
  const[wh,wm]=wake.split(":").map(Number);
  const start=bh*60+bm;
  let end=wh*60+wm;
  if(end<start)end+=1440;
  return end-start;
}

export function waterTotalForDate(rows:{date:string;amount_ml:number}[],date:string){
  return rows.filter(r=>r.date===date).reduce((sum,r)=>sum+Number(r.amount_ml||0),0);
}

export function activeForIsoDay<T extends {active:boolean;days_of_week:number[]}>(rows:T[],day:number){
  return rows.filter(r=>r.active&&(r.days_of_week||[]).includes(day));
}
