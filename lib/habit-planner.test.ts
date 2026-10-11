import {describe,expect,it} from "vitest";
import {dayProgress,habitDueOn,logDone,mondayOf,periodProgress,plannerCompletionTrend,scheduledForDay,shiftHabitDate,weekDates,sortPlannerHabits,type PlannerHabit} from "./habit-planner";

const sample:PlannerHabit={id:"h1",name:"Read",area:"Growth",frequency:"Daily",target:1,unit:"done",kind:"build"};
describe("Habit planner uses canonical schedule and cloud-log semantics",()=>{
 it("uses stable Monday week and UTC-safe calendar arithmetic",()=>{
  expect(mondayOf("2026-10-11")).toBe("2026-10-05");
  expect(weekDates("2026-10-07")).toEqual(["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11"]);
  expect(shiftHabitDate("2026-12-31",1)).toBe("2027-01-01");
 });
 it("specific weekdays are due only on matching dates",()=>{
  const h={...sample,frequency:"Specific days:Mon,Wed,Fri"};
  expect(scheduledForDay(h.frequency,"2026-10-05")).toBe(true);
  expect(scheduledForDay(h.frequency,"2026-10-06")).toBe(false);
  expect(periodProgress(h,[], "2026-10-07").target).toBe(3);
 });
 it("weekly flexible goal is fulfilled after two distinct successful dates",()=>{
  const h={...sample,frequency:"X times per week",target:2};
  const logs=[{habit_id:"h1",date:"2026-10-05",value:1},{habit_id:"h1",date:"2026-10-07",value:1}];
  expect(periodProgress(h,logs,"2026-10-08")).toEqual({done:2,target:2});
  expect(habitDueOn(h,logs,"2026-10-08")).toBe(false);
  expect(habitDueOn(h,logs,"2026-10-07")).toBe(true);
 });
 it("monthly goals count each successful day only once",()=>{
  const h={...sample,frequency:"Monthly",target:1};
  const logs=[{habit_id:"h1",date:"2026-09-30",value:1},{habit_id:"h1",date:"2026-10-01",value:1}];
  expect(periodProgress(h,logs,"2026-10-15")).toEqual({done:1,target:1});
  expect(habitDueOn(h,logs,"2026-10-15")).toBe(false);
  expect(habitDueOn(h,logs,"2026-11-01")).toBe(true);
 });
 it("never treats zero or negative values as completed",()=>{
  expect(logDone([{habit_id:"h1",date:"2026-10-05",value:0}],"h1","2026-10-05")).toBe(false);
  expect(dayProgress([sample],[],"2026-10-05")).toEqual({done:0,total:1});
 });
 it("trend uses measured progress, not invented completion",()=>{
  const trend=plannerCompletionTrend([sample],[{habit_id:"h1",date:"2026-10-11",value:1}],"2026-10-11",3);
  expect(trend.map(x=>x.done)).toEqual([0,0,1]);
  expect(trend.map(x=>x.total)).toEqual([1,1,1]);
 });
});

describe("Habit studio view filters and ranking",()=>{
 const habits=[
  {...sample,id:"a",name:"Walk"},
  {...sample,id:"b",name:"Breathing"},
  {...sample,id:"c",name:"Reading"},
 ];
 const days=["2026-10-09","2026-10-10","2026-10-11"];
 const logs=[
  {habit_id:"a",date:"2026-10-09",value:1},
  {habit_id:"a",date:"2026-10-10",value:1},
  {habit_id:"b",date:"2026-10-09",value:1},
  {habit_id:"c",date:"2026-10-11",value:1}
 ];
 it("sorts alphabetically without mutating Supabase result rows",()=>{
  const input=[...habits];expect(sortPlannerHabits(input,logs,days,"name").map(h=>h.id)).toEqual(["b","c","a"]);
  expect(input.map(h=>h.id)).toEqual(["a","b","c"]);
 });
 it("ranks by actual period streak rather than fabricated score",()=>{
  const result=sortPlannerHabits(habits,logs,days,"streak");
  expect(result[0].id).toBe("a");
  expect(result.map(h=>h.id).sort()).toEqual(["a","b","c"]);
 });
 it("ranks by measured consistency with deterministic name tie-breaker",()=>{
  const result=sortPlannerHabits(habits,logs,days,"consistency");
  expect(result[0].id).toBe("a");
  expect(result[1].id).toBe("b");
  expect(result[2].id).toBe("c");
 });
});
