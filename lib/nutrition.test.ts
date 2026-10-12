import {describe,expect,it} from "vitest";
import {estimateFood,getFood,totalsForFoodLogs,dateFoodLogs,FOOD_REFERENCE_VERSION,FOOD_CATALOG} from "./nutrition";
describe("Nutrition estimates from real logged consumed foods",()=>{
 it("turns three edible eggs into 150 g and estimates protein from catalog",()=>{
  const eggs=getFood("egg-boiled")!;
  expect(eggs.servingGrams).toBe(50);
  expect(estimateFood(eggs,3*eggs.servingGrams!).protein_g).toBe(18.9);
 });
 it("calculates cooked chicken weighed after cooking",()=>{
  const chicken=getFood("chicken-roasted")!;
  expect(estimateFood(chicken,200).protein_g).toBe(62.04);
  expect(estimateFood(chicken,200).iron_mg).toBe(2.08);
 });
 it("does not invent nutrient values when not in reference",()=>{
  const curd=getFood("curd")!;
  expect(estimateFood(curd,200).protein_g).toBe(7);
  expect(estimateFood(curd,200).vitd_ug).toBeUndefined();
  expect(totalsForFoodLogs([{estimated_nutrients:estimateFood(curd,200)}]).vitd_ug).toBeUndefined();
 });
 it("rejects invalid or extreme log quantities",()=>{
  const egg=getFood("egg-boiled")!;
  for(const n of [0,-10,NaN,Infinity,5001])expect(()=>estimateFood(egg,n)).toThrow();
 });
 it("aggregates only user-recorded entries for the chosen date",()=>{
  const today="2026-10-12";
  const sample=[{id:"1",date:today,food_key:"egg-boiled",food_name:"Egg",quantity_g:150,meal_type:"Breakfast",created_at:"2026-10-12T08:00Z",estimated_nutrients:{protein_g:18.9}},{id:"2",date:"2026-10-11",food_key:"chicken-roasted",food_name:"Chicken",quantity_g:200,meal_type:"Lunch",created_at:"2026-10-11T08:00Z",estimated_nutrients:{protein_g:62.04}}];
  expect(totalsForFoodLogs(dateFoodLogs(sample,today)).protein_g).toBe(18.9);
  expect(FOOD_REFERENCE_VERSION).toBeTruthy();
  expect(FOOD_CATALOG.length).toBeGreaterThan(25);
 });
 it("never treats plant ALA as marine EPA/DHA",()=>{
  const flax=estimateFood(getFood("flaxseed")!,20);
  const salmon=estimateFood(getFood("salmon-cooked")!,150);
  expect(flax.omega3_ala_g).toBeGreaterThan(0);
  expect(flax.omega3_marine_g).toBeUndefined();
  expect(salmon.omega3_marine_g).toBeGreaterThan(0);
  expect(salmon.omega3_ala_g).toBeUndefined();
 });
});
