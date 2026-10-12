import {describe,it,expect} from "vitest";
import {orderPinnedHabits,addOrRemovePin} from "./habit-pins";
describe("Habit pins are a personal view projection",()=>{
 const habits=[{id:"a",name:"Water"},{id:"b",name:"Read"},{id:"c",name:"Exercise"}];
 it("shows pinned habits first, without mutating shared habits",()=>{
  expect(orderPinnedHabits(habits,["c","a"]).map(h=>h.id)).toEqual(["c","a","b"]);
  expect(habits.map(h=>h.id)).toEqual(["a","b","c"]);
 });
 it("pin and unpin are idempotent with no duplicates",()=>{
  expect(addOrRemovePin(["a"],"a",true)).toEqual(["a"]);
  expect(addOrRemovePin(["a","b"],"a",false)).toEqual(["b"]);
 });
});
