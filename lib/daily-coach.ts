/** Pure, evidence-based Daily Brief. No generated completions, diagnoses or recommendations for medication dosing. */
export type DailyCoachSnapshot={
 date:string;
 tasks:{open:number;dueToday:number;overdue:number;completedToday:number;overdueTitles:string[];topTitles:string[]};
 habits:{due:number;done:number};
 water:{loggedMl:number;goalMl:number};
 nutrition:{proteinG:number|null;entries:number;available:boolean};
 medicines:{scheduled:number;taken:number;overdue:number};
 hair:{routines:number;done:number};
};
export type DailyCoachTip={title:string;detail:string;href:string;priority:number};
export function dailyCoachTips(x:DailyCoachSnapshot):DailyCoachTip[]{
 const tips:DailyCoachTip[]=[];
 if(x.medicines.overdue)tips.push({title:"Review your medicine log",detail:x.medicines.overdue+" scheduled slot(s) have no Taken record. Check whether you took them; do not double-dose without pharmacist advice.",href:"/health-planner",priority:100});
 if(x.tasks.overdue)tips.push({title:"Clear one overdue task",detail:x.tasks.overdue+" open task(s) have passed their deadlines. Start with "+(x.tasks.overdueTitles[0]||"the oldest outstanding task")+".",href:"/tasks",priority:90});
 if(x.tasks.dueToday)tips.push({title:"Prioritize today's work",detail:x.tasks.dueToday+" open task(s) are due today. Choose your next realistic work block.",href:"/tasks",priority:80});
 if(x.habits.due&&x.habits.done<x.habits.due)tips.push({title:"Complete one small habit",detail:(x.habits.due-x.habits.done)+" scheduled habits are not recorded done yet. Pick an achievable one.",href:"/habits/planner",priority:70});
 if(x.water.loggedMl<x.water.goalMl)tips.push({title:"Review your water log",detail:x.water.loggedMl+" ml recorded against your editable "+x.water.goalMl+" ml target. Log what you actually drank; targets are not medical prescriptions.",href:"/health-planner",priority:50});
 if(!x.nutrition.available||x.nutrition.entries===0)tips.push({title:"Record actual food intake",detail:x.nutrition.available?"No consumed foods recorded today. Log what you actually ate to see protein estimates.":"Nutrition logging awaits Supabase activation; no intake is assumed.",href:"/health-planner",priority:40});
 if(x.hair.routines&&x.hair.done<x.hair.routines)tips.push({title:"Keep hair-care notes factual",detail:"Record serum or procedure use only when actually done; do not infer a daily treatment schedule.",href:"/hair",priority:25});
 if(!tips.length)tips.push({title:"Keep today's momentum",detail:"Your currently tracked daily items have no outstanding alerts. Plan tomorrow's top priority.",href:"/goals",priority:10});
 return tips.sort((a,b)=>b.priority-a.priority);
}
export function dailyCoachSummary(x:DailyCoachSnapshot):string{
 const habit=x.habits.due?x.habits.done+" of "+x.habits.due+" due habits recorded complete":"No due habits recorded";
 const medication=x.medicines.scheduled?x.medicines.taken+" of "+x.medicines.scheduled+" scheduled medicine slots recorded taken":"No scheduled medicine slots";
 const protein=x.nutrition.proteinG==null?"protein not estimated":x.nutrition.proteinG.toFixed(1)+" g estimated protein logged";
 return x.date+": "+x.tasks.completedToday+" tasks completed, "+x.tasks.overdue+" overdue; "+habit+"; "+x.water.loggedMl+" ml water recorded; "+protein+"; "+medication+".";
}
