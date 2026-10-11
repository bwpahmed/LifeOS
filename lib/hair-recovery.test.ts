import {describe,it,expect} from "vitest";
import {matchHairLab,hairRoutineDone,hairActivityDays,HAIR_LAB_CHECKLIST} from "./hair-recovery";
describe("hair recovery uses recorded source data only",()=>{
 it("shows missing lab checks as unrecorded rather than normal",()=>{
  expect(matchHairLab("Ferritin",[])).toBeNull();
  expect(HAIR_LAB_CHECKLIST.length).toBe(12);
 });
 it("matches exact keywords and the latest entered value without interpreting range",()=>{
  const values=[
    {test_name:"Serum ferritin",date:"2026-09-20",result:"12",unit:"ng/mL"},
    {test_name:"Ferritin",date:"2026-10-11",result:"25",unit:"ng/mL"},
    {test_name:"Vitamin B12",date:"2026-10-11",result:"420",unit:"pg/mL"}
  ];
  expect(matchHairLab("Ferritin",values)?.result).toBe("25");
  expect(matchHairLab("Vitamin B12",values)?.result).toBe("420");
  expect(matchHairLab("Serum zinc",values)).toBeNull();
 });
 it("counts only persisted done statuses on recorded dates",()=>{
  const logs=[
   {routine_id:"a",date:"2026-10-10",status:"done"},
   {routine_id:"b",date:"2026-10-10",status:"done"},
   {routine_id:"a",date:"2026-10-11",status:"skipped"},
   {routine_id:"c",date:"2026-10-11",status:"done"}
  ];
  expect(hairRoutineDone(logs,"a","2026-10-10")).toBe(true);
  expect(hairRoutineDone(logs,"a","2026-10-11")).toBe(false);
  expect(hairActivityDays(logs,["a","b"],"2026-10-01","2026-10-11")).toBe(1);
 });
});
