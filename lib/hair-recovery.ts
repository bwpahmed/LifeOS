/** This module only matches user-entered lab names and calculates logged activity.
 * It never interprets test values or recommends doses/treatments.
 */
export const HAIR_LAB_CHECKLIST=[
 {id:"cbc",name:"CBC",keywords:["cbc","complete blood count"]},
 {id:"ferritin",name:"Ferritin",keywords:["ferritin"]},
 {id:"iron",name:"Serum iron",keywords:["serum iron","iron serum"]},
 {id:"tibc",name:"TIBC",keywords:["tibc","total iron binding"]},
 {id:"transferrin",name:"Transferrin saturation",keywords:["transferrin saturation","tsat","iron saturation"]},
 {id:"tsh",name:"TSH",keywords:["tsh","thyroid stimulating hormone"]},
 {id:"ft4",name:"Free T4",keywords:["free t4","ft4","free thyroxine"]},
 {id:"vitamind",name:"Vitamin D",keywords:["vitamin d","25 oh vitamin d","25 hydroxy vitamin d"]},
 {id:"b12",name:"Vitamin B12",keywords:["vitamin b12","b12","cobalamin"]},
 {id:"folate",name:"Folate (B9)",keywords:["folate","folic acid","vitamin b9"]},
 {id:"zinc",name:"Serum zinc",keywords:["serum zinc","zinc"]},
 {id:"cmp",name:"CMP / LFT / KFT",keywords:["cmp","comprehensive metabolic","lft","liver function","kft","kidney function","renal function"]},
] as const;

export type HairLab={test_name:string;date:string;result:string|null;unit:string|null;ref_range?:string|null};
export type HairRoutineLog={routine_id:string;date:string;status:string};

function norm(text:string){return text.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
export function matchHairLab(name:string,recorded:HairLab[]):HairLab|null {
 const item=HAIR_LAB_CHECKLIST.find(x=>x.name===name);
 if(!item)return null;
 const matching=recorded.filter(x=>{
  const normal=norm(x.test_name);
  return item.keywords.some(k=>{
   const key=norm(k);
   return (" "+normal+" ").includes(" "+key+" ");
  });
 });
 return matching.sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}
export function hairRoutineDone(logs:HairRoutineLog[],id:string,date:string):boolean {
 return logs.some(x=>x.routine_id===id&&x.date===date&&x.status==="done");
}
export function hairActivityDays(logs:HairRoutineLog[],ids:string[],start:string,end:string):number {
 return new Set(logs.filter(x=>ids.includes(x.routine_id)&&x.status==="done"&&x.date>=start&&x.date<=end).map(x=>x.date)).size;
}
