/** Source-of-truth projections for the existing LifeOS health records.
 * These helpers never infer deficiencies, prescribe treatments, or create records.
 */
export const HAIR_LAB_CHECKLIST=[
 {key:"cbc",label:"Complete Blood Count (CBC)",patterns:[/\bcbc\b/i,/complete blood count/i]},
 {key:"ferritin",label:"Ferritin",patterns:[/ferritin/i]},
 {key:"serum_iron",label:"Serum iron",patterns:[/serum iron/i]},
 {key:"tibc",label:"TIBC",patterns:[/\btibc\b/i,/total iron binding/i]},
 {key:"saturation",label:"Transferrin saturation",patterns:[/transferrin saturation/i,/\btsat\b/i,/\biron saturation\b/i]},
 {key:"tsh",label:"TSH",patterns:[/\btsh\b/i]},
 {key:"t4",label:"Free T4",patterns:[/free t4/i,/\bft4\b/i]},
 {key:"vit_d",label:"Vitamin D",patterns:[/vitamin d/i,/25[- ]?oh/i]},
 {key:"b12",label:"Vitamin B12",patterns:[/vitamin b12/i,/\bb12\b/i]},
 {key:"folate",label:"Folate / B9",patterns:[/folate/i,/folic acid/i,/\bvitamin b9\b/i]},
 {key:"zinc",label:"Zinc",patterns:[/\bzinc\b/i]},
 {key:"cmp",label:"CMP / metabolic panel",patterns:[/\bcmp\b/i,/comprehensive metabolic panel/i]},
 {key:"lft",label:"Liver function (LFT)",patterns:[/\blft\b/i,/liver function/i,/hepatic panel/i]},
 {key:"kft",label:"Kidney function (KFT)",patterns:[/\bkft\b/i,/kidney function/i,/renal function/i]}
] as const;

export type HairLabRow={id:string;test_name:string|null;result:string|null;date:string|null;unit:string|null;ref_range:string|null};
export function latestHairLabResults(rows:HairLabRow[]){
 return HAIR_LAB_CHECKLIST.map(test=>{
  const match=rows.filter(row=>test.patterns.some(pattern=>pattern.test(row.test_name||"")))
   .sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0]||null;
  return {key:test.key,label:test.label,record:match};
 });
}
export function parseProteinGrams(value:string|null|undefined):number|null{
 const found=(value||"").trim().match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?)$/i);
 if(!found)return null;
 const n=Number(found[1]);return Number.isFinite(n)&&n>=0&&n<=500? n : null;
}
export function waterByDay(rows:{date:string;amount_ml:number}[],days:string[]){
 const totals=new Map<string,number>();
 for(const row of rows){const n=Number(row.amount_ml);if(Number.isFinite(n)&&n>0)totals.set(row.date,(totals.get(row.date)||0)+n);}
 return days.map(date=>({date,ml:totals.get(date)||0}));
}
export function clampHairSheddingScore(value:number){
 return Number.isFinite(value)?Math.max(1,Math.min(5,Math.round(value))):3;
}
