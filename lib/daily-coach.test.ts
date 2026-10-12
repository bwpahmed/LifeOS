import {describe,it,expect} from "vitest";
import {dailyCoachTips,dailyCoachSummary,type DailyCoachSnapshot} from "./daily-coach";
const sample:DailyCoachSnapshot={date:"2026-10-12",tasks:{open:3,dueToday:1,overdue:2,completedToday:1,overdueTitles:["Invoice"],topTitles:["Invoice"]},habits:{due:4,done:2},water:{loggedMl:450,goalMl:2400},nutrition:{proteinG:null,entries:0,available:true},medicines:{scheduled:1,taken:0,overdue:1},hair:{routines:2,done:1}};
describe("Factual personal-coach brief from canonical LifeOS records",()=>{
 it("prioritizes missing medicine log review but never says to double dose",()=>{
  const tips=dailyCoachTips(sample);
  expect(tips[0].title).toContain("medicine");
  expect(tips[0].detail).toContain("do not double-dose");
 });
 it("does not interpret no logged food as zero grams of consumed protein",()=>{
  expect(dailyCoachSummary(sample)).toContain("protein not estimated");
  expect(dailyCoachTips(sample).some(x=>x.title==="Record actual food intake")).toBe(true);
 });
 it("states actual recorded task, habit, water and medicine totals",()=>{
  const s=dailyCoachSummary(sample);
  expect(s).toContain("1 tasks completed");
  expect(s).toContain("2 of 4 due habits");
  expect(s).toContain("450 ml");
  expect(s).toContain("0 of 1 scheduled medicine");
 });
 it("does not fabricate advice when everything recorded",()=>{
  const x={...sample,tasks:{open:0,dueToday:0,overdue:0,completedToday:4,overdueTitles:[],topTitles:[]},habits:{due:2,done:2},water:{loggedMl:2500,goalMl:2500},nutrition:{proteinG:65,entries:3,available:true},medicines:{scheduled:1,taken:1,overdue:0},hair:{routines:1,done:1}};
  expect(dailyCoachTips(x)).toHaveLength(1);
  expect(dailyCoachTips(x)[0].title).toContain("momentum");
 });
});
