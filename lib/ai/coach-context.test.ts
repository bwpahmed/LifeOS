import {describe,expect,it} from "vitest";
import {sanitizeCoachContext} from "./coach-context";
describe("AI coach context privacy boundary",()=>{
 it("drops unknown medical and identifying context keys at the API boundary",()=>{
  const input={today_tasks:[{title:"Review work",score:70,due:"2026-10-12",secret:"abc"}],
   daily_health:{habits_done:2,habits_due:4,water_logged_ml:500,protein_estimated_g:null,
    prescription:"secret product",lab_results:[{test:"private"}]},raw_health:{diagnosis:"private"},
   hiddenToken:"secret",upcoming_family:[]};
  const x=sanitizeCoachContext(input);
  const encoded=JSON.stringify(x);
  for(const secret of ["secret","private","prescription","raw_health","hiddenToken"])expect(encoded).not.toContain(secret);
  expect(x.today_tasks[0].title).toBe("Review work");
  expect(x.daily_health?.habits_done).toBe(2);
 });
 it("clamps untrusted numbers and limits oversized nested arrays",()=>{
  const x=sanitizeCoachContext({today_tasks:Array.from({length:40},()=>({title:"x".repeat(500),score:Infinity,due:"bad"})),daily_health:{water_logged_ml:-999,medicine_slots_unlogged:50000}});
  expect(x.today_tasks).toHaveLength(25);
  expect(x.today_tasks[0].title.length).toBe(180);
  expect(x.today_tasks[0].score).toBe(0);
  expect(x.today_tasks[0].due).toBeNull();
  expect(x.daily_health?.water_logged_ml).toBe(0);
  expect(x.daily_health?.medicine_slots_unlogged).toBe(100);
 });
 it("handles malformed inputs without throwing or manufacturing facts",()=>{
  for(const raw of [null,0,"hello",[],{today_tasks:"oops",daily_health:[]}])
   expect(()=>sanitizeCoachContext(raw)).not.toThrow();
  expect(sanitizeCoachContext({}).today_tasks).toEqual([]);
  expect(sanitizeCoachContext({}).daily_health).toBeUndefined();
 });
});
