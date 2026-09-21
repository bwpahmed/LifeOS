export const DEFAULT_BIRTH_DATE = "1992-02-25";
export const DEFAULT_RETIREMENT_AGE = 40;

export type AgeParts = { years:number; months:number; days:number };

function utcDate(iso:string){
  const [y,m,d]=iso.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d));
}
function dateOnlyUTC(input:Date){
  return new Date(Date.UTC(input.getUTCFullYear(),input.getUTCMonth(),input.getUTCDate()));
}
function addYearsClamped(date:Date,years:number){
  const y=date.getUTCFullYear()+years,m=date.getUTCMonth(),d=date.getUTCDate();
  const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  return new Date(Date.UTC(y,m,Math.min(d,last)));
}
function addMonthsClamped(date:Date,months:number){
  const baseMonth=date.getUTCMonth()+months;
  const y=date.getUTCFullYear()+Math.floor(baseMonth/12);
  const m=((baseMonth%12)+12)%12;
  const d=date.getUTCDate();
  const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  return new Date(Date.UTC(y,m,Math.min(d,last)));
}

export function ageParts(birthISO:string,now=new Date()):AgeParts{
  const birth=utcDate(birthISO);
  const today=dateOnlyUTC(now);
  if(today<birth)return {years:0,months:0,days:0};
  let years=today.getUTCFullYear()-birth.getUTCFullYear();
  let anchor=addYearsClamped(birth,years);
  if(anchor>today){years--;anchor=addYearsClamped(birth,years);}
  let months=(today.getUTCFullYear()-anchor.getUTCFullYear())*12+(today.getUTCMonth()-anchor.getUTCMonth());
  let monthAnchor=addMonthsClamped(anchor,months);
  if(monthAnchor>today){months--;monthAnchor=addMonthsClamped(anchor,months);}
  const days=Math.floor((today.getTime()-monthAnchor.getTime())/86400000);
  return {years,months,days};
}

export function retirementDate(birthISO:string,retirementAge:number){
  return addYearsClamped(utcDate(birthISO),retirementAge).toISOString().slice(0,10);
}

export function daysLived(birthISO:string,now=new Date()){
  return Math.max(0,Math.floor((dateOnlyUTC(now).getTime()-utcDate(birthISO).getTime())/86400000));
}

export function daysUntilRetirement(birthISO:string,retirementAge:number,now=new Date()){
  const target=utcDate(retirementDate(birthISO,retirementAge));
  return Math.max(0,Math.ceil((target.getTime()-dateOnlyUTC(now).getTime())/86400000));
}

export function retirementProgress(birthISO:string,retirementAge:number,now=new Date()){
  const birth=utcDate(birthISO);
  const target=utcDate(retirementDate(birthISO,retirementAge));
  const total=Math.max(1,target.getTime()-birth.getTime());
  const elapsed=Math.max(0,Math.min(total,dateOnlyUTC(now).getTime()-birth.getTime()));
  return Math.round(elapsed/total*100);
}

const DAILY_PUSH=[
  "Protect the hours that build the life you actually want.",
  "A small useful action today beats a dramatic plan next month.",
  "Money saved, health protected, and important work finished all compound.",
  "Do not spend tomorrow's freedom on today's impulse.",
  "Finish the task that keeps returning to your mind.",
  "Consistency is quieter than motivation and usually more useful.",
  "Make retirement-by-40 decisions before convenience makes them for you.",
  "Your calendar is a budget for the only resource you cannot earn back.",
  "Reduce friction for good habits and add friction to expensive mistakes.",
  "One clear priority is worth more than ten vaguely important intentions."
];

export function dailyPush(now=new Date()){
  const start=Date.UTC(now.getUTCFullYear(),0,1);
  const day=Math.floor((dateOnlyUTC(now).getTime()-start)/86400000);
  return DAILY_PUSH[((day%DAILY_PUSH.length)+DAILY_PUSH.length)%DAILY_PUSH.length];
}
