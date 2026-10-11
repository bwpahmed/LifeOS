import {describe,expect,it} from "vitest";
import {dueForQuickLog,isHabitLogged,isRoutineTaken,ownCareRoutines,quickHabitDue,validWaterAmount,type QuickRoutine} from "./home-health-quick";
const routine:QuickRoutine={id:"r1",title:"A prescribed medicine",kind:"medicine",active:true,created_by:"owner",days_of_week:[1,2,3,4,5,6,7],reminder_times:["09:00"],start_date:null,end_date:null,details:{}};
describe("home health actions reuse canonical schedules",()=>{
 it("checks weekdays and active dates before showing medicine",()=>{
  expect(dueForQuickLog(routine,"2026-10-12")).toBe(true);
  expect(dueForQuickLog({...routine,days_of_week:[2]},"2026-10-12")).toBe(false);
  expect(dueForQuickLog({...routine,start_date:"2026-10-13"},"2026-10-12")).toBe(false);
 });
 it("only shows logged-in owner's medication and tagged hair care",()=>{
  const routines=[routine,{...routine,id:"r2",created_by:"other"},{...routine,id:"r3",kind:"other",details:{source:"lifeos-hair-recovery"}},{...routine,id:"r4",kind:"other",details:{}}];
  expect(ownCareRoutines(routines,"owner","2026-10-12","medicine").map(x=>x.id)).toEqual(["r1"]);
  expect(ownCareRoutines(routines,"owner","2026-10-12","hair").map(x=>x.id)).toEqual(["r3"]);
 });
 it("does not infer taken from scheduled reminder or other slots",()=>{
  const logs=[{routine_id:"r1",date:"2026-10-12",scheduled_time:"09:00",status:"done"}];
  expect(isRoutineTaken(logs,"r1","2026-10-12","09:00")).toBe(true);
  expect(isRoutineTaken(logs,"r1","2026-10-12","21:00")).toBe(false);
  expect(isRoutineTaken([{...logs[0],status:"skipped"}],"r1","2026-10-12","09:00")).toBe(false);
 });
 it("does not infer habit completions from false values",()=>{
  expect(isHabitLogged([{habit_id:"h",date:"2026-10-12",value:0}],"h","2026-10-12")).toBe(false);
  expect(quickHabitDue({id:"h",name:"Read",frequency:"Specific days:Mon,Wed",kind:"build",area:"Health",target:1},"2026-10-12")).toBe(true);
  expect(quickHabitDue({id:"h",name:"Read",frequency:"Specific days:Mon,Wed",kind:"build",area:"Health",target:1},"2026-10-13")).toBe(false);
 });
 it("rejects invalid water quantities",()=>{
  expect(validWaterAmount(250)).toBe(true);
  for(const n of [0,-2,5001,NaN,Infinity,1.4])expect(validWaterAmount(n)).toBe(false);
 });
});
