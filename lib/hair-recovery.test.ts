import {describe,it,expect} from "vitest";
import {latestHairLabResults,parseProteinGrams,waterByDay,clampHairSheddingScore} from "./hair-recovery";

describe("Hair recovery dashboard reads existing LifeOS health records",()=>{
 it("matches existing lab results without inventing a status",()=>{
  const status=latestHairLabResults([
   {id:"1",test_name:"Ferritin",date:"2026-10-01",result:"25",unit:"ng/mL",ref_range:"",},
   {id:"2",test_name:"Ferritin",date:"2026-10-09",result:"30",unit:"ng/mL",ref_range:"",},
   {id:"3",test_name:"TSH",date:"2026-10-02",result:"2.1",unit:"mIU/L",ref_range:"",}
  ]);
  expect(status.find(x=>x.key==="ferritin")?.record?.id).toBe("2");
  expect(status.find(x=>x.key==="t4")?.record).toBeNull();
  expect(status.find(x=>x.key==="tsh")?.record?.result).toBe("2.1");
 });
 it("protein input requires explicit grams and cannot mistake free-text notes for a value",()=>{
  expect(parseProteinGrams("90 g")).toBe(90);
  expect(parseProteinGrams("42.5 grams")).toBe(42.5);
  expect(parseProteinGrams("target met")).toBeNull();
  expect(parseProteinGrams("1500 g")).toBeNull();
 });
 it("aggregates actual water events and leaves unrecorded days at zero",()=>{
  expect(waterByDay([{date:"2026-10-10",amount_ml:250},{date:"2026-10-10",amount_ml:500}],["2026-10-09","2026-10-10"])).toEqual([{date:"2026-10-09",ml:0},{date:"2026-10-10",ml:750}]);
 });
 it("clamps a subjective shedding rating without diagnosing it",()=>{
  expect(clampHairSheddingScore(7)).toBe(5);
  expect(clampHairSheddingScore(0)).toBe(1);
  expect(clampHairSheddingScore(NaN)).toBe(3);
 });
});
