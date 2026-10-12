import {describe,expect,it} from "vitest";
import {dueForQuickLog,isHabitLogged,isRoutineTaken,ownCareRoutines,quickHabitDue,validWaterAmount,medicineDoseState,localHHMM,orderMedicineDoses,type QuickRoutine} from "./home-health-quick";
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

describe("Medicine dashboard urgent reminder states",()=>{
 it("highlights overdue and due-soon schedules without claiming they were taken",()=>{
  expect(medicineDoseState("08:00","08:50",false)).toBe("overdue");
  expect(medicineDoseState("09:00","09:03",false)).toBe("due-now");
  expect(medicineDoseState("09:30","09:10",false)).toBe("due-soon");
  expect(medicineDoseState("19:00","09:10",false)).toBe("upcoming");
  expect(medicineDoseState("08:00","08:50",true)).toBe("taken");
 });
 it("orders missed before imminent, future and completed doses",()=>{
  const rows=[{time:"10:00",state:"taken" as const},{time:"09:00",state:"due-soon" as const},
   {time:"07:00",state:"overdue" as const},{time:"11:00",state:"upcoming" as const}];
  expect(orderMedicineDoses(rows).map(x=>x.state)).toEqual(["overdue","due-soon","upcoming","taken"]);
 });
 it("formats current time for user timezone, including Dubai",()=>{
  expect(localHHMM("Asia/Dubai",new Date("2026-10-11T07:10:00Z"))).toBe("11:10");
 });
 it("ignores invalid scheduled time without treating it as missed",()=>{
  expect(medicineDoseState("bad","08:00",false)).toBe("upcoming");
 });
});

describe("Optional, unscheduled hair-care actions",()=>{
 it("allows manually logging serum/dermastamp without treating it as a daily medication",()=>{
  const optional={...routine,id:"care",kind:"other",days_of_week:[],details:{source:"lifeos-hair-recovery"}};
  expect(ownCareRoutines([optional],"owner","2026-10-12","hair").map(x=>x.id)).toEqual(["care"]);
  expect(ownCareRoutines([optional],"owner","2026-10-12","medicine")).toEqual([]);
  expect(dueForQuickLog(optional,"2026-10-12")).toBe(false);
 });
 it("never exposes paused or another person's optional hair routine",()=>{
  const optional={...routine,id:"care",kind:"other",days_of_week:[],details:{source:"lifeos-hair-recovery"}};
  expect(ownCareRoutines([{...optional,active:false},{...optional,id:"other",created_by:"someone"}],"owner","2026-10-12","hair")).toEqual([]);
 });
});
