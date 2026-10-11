/**
 * Versioned, approximate representative food composition references.
 * Values per 100g EDIBLE food, not personalized medical advice.
 * null/omitted means no reliable estimate in this compact reference, NOT zero.
 * Mixed recipes, brands, cooking methods and portions vary substantially.
 *
 * Reference: USDA FoodData Central (public-domain SR Legacy generic items).
 * Specifically grounded examples: chicken breast roasted FDC 171477,
 * boiled lentils FDC 172421. Others are rounded representative estimates;
 * check packaged labels or a dietitian when precision matters.
 * See docs/design/2026-10-12-nutrition-intake.md.
 */
export const FOOD_REFERENCE_VERSION="lifeos-food-reference-v1";
export const NUTRIENTS=[
 {key:"protein_g",name:"Protein",unit:"g"},
 {key:"iron_mg",name:"Iron",unit:"mg"},
 {key:"b12_ug",name:"Vitamin B12",unit:"µg"},
 {key:"folate_ug",name:"Folate (B9)",unit:"µg"},
 {key:"zinc_mg",name:"Zinc",unit:"mg"},
 {key:"vitd_ug",name:"Vitamin D",unit:"µg"},
 {key:"vitc_mg",name:"Vitamin C",unit:"mg"},
 {key:"omega3_g",name:"Omega-3",unit:"g"},
 {key:"magnesium_mg",name:"Magnesium",unit:"mg"},
] as const;
export type NutrientKey=(typeof NUTRIENTS)[number]["key"];
export type NutrientAmounts=Partial<Record<NutrientKey,number>>;
export type FoodReference={key:string;name:string;group:string;servingGrams?:number;servingName?:string;per100:NutrientAmounts;note?:string;source?:string};
export const FOOD_CATALOG:FoodReference[]=[
 {key:"egg-boiled",name:"Egg, boiled (large)",group:"Protein",servingGrams:50,servingName:"egg",per100:{protein_g:12.6,iron_mg:1.2,b12_ug:1.1,folate_ug:44,zinc_mg:1.05,vitd_ug:2.2},note:"50 g edible portion per egg"},
 {key:"chicken-roasted",name:"Chicken breast, roasted (cooked)",group:"Protein",per100:{protein_g:31.02,iron_mg:1.04,magnesium_mg:29},source:"USDA SR Legacy FDC 171477"},
 {key:"chicken-raw",name:"Chicken breast (raw weight)",group:"Protein",per100:{protein_g:22.5},note:"Use raw grams, not cooked grams"},
 {key:"mutton-cooked",name:"Mutton / lamb, cooked",group:"Protein",per100:{protein_g:25},note:"Fat/cut and cooking method vary"},
 {key:"fish-rohu",name:"Rohu fish (cooked)",group:"Protein",per100:{protein_g:19}},
 {key:"salmon-cooked",name:"Salmon (cooked)",group:"Protein",per100:{protein_g:22,vitd_ug:10,omega3_g:1.8},note:"Omega-3 includes marine EPA/DHA; amounts vary"},
 {key:"sardines",name:"Sardines (canned, drained)",group:"Protein",per100:{protein_g:24.6,omega3_g:1.5,b12_ug:8.9}},
 {key:"milk",name:"Milk, whole (unfortified)",group:"Dairy",per100:{protein_g:3.2,b12_ug:0.45},note:"Do not assume vitamin D is added"},
 {key:"curd",name:"Plain curd / yogurt",group:"Dairy",per100:{protein_g:3.5},note:"Protein differs by product"},
 {key:"paneer",name:"Paneer",group:"Dairy",per100:{protein_g:18},note:"Brand and fat content vary"},
 {key:"spinach-cooked",name:"Palak / spinach (cooked)",group:"Vegetables",per100:{protein_g:3,iron_mg:3.6,folate_ug:146,vitc_mg:9.8,magnesium_mg:87}},
 {key:"methi",name:"Methi leaves",group:"Vegetables",per100:{protein_g:4.4}},
 {key:"rajma-cooked",name:"Rajma (boiled)",group:"Legumes",per100:{protein_g:8.7,iron_mg:2.9,folate_ug:130}},
 {key:"chana-cooked",name:"Chana / chickpeas (boiled)",group:"Legumes",per100:{protein_g:8.9,iron_mg:2.9,folate_ug:172,magnesium_mg:48}},
 {key:"black-chana",name:"Black chana (boiled)",group:"Legumes",per100:{protein_g:8.9},note:"Representative cooked chickpea protein"},
 {key:"lentils-boiled",name:"Lentils (boiled)",group:"Legumes",per100:{protein_g:9.02,iron_mg:3.33,folate_ug:181,magnesium_mg:36},source:"USDA SR Legacy FDC 172421"},
 {key:"pumpkin-seeds",name:"Pumpkin seeds (dried)",group:"Seeds & nuts",per100:{protein_g:30.2,iron_mg:8.8,zinc_mg:7.8,magnesium_mg:592}},
 {key:"sesame-seeds",name:"Sesame seeds",group:"Seeds & nuts",per100:{protein_g:17.7,iron_mg:14.6,zinc_mg:7.8,magnesium_mg:351}},
 {key:"cashews",name:"Cashew nuts",group:"Seeds & nuts",per100:{protein_g:18.2,iron_mg:6.7,zinc_mg:5.8,magnesium_mg:292}},
 {key:"almonds",name:"Almonds",group:"Seeds & nuts",per100:{protein_g:21.2,magnesium_mg:268}},
 {key:"peanuts",name:"Peanuts (raw)",group:"Seeds & nuts",per100:{protein_g:25.8,magnesium_mg:168}},
 {key:"walnuts",name:"Walnuts",group:"Seeds & nuts",per100:{protein_g:15.2,omega3_g:9.1,magnesium_mg:158},note:"Omega-3 is plant ALA, not EPA/DHA"},
 {key:"flaxseed",name:"Flaxseed",group:"Seeds & nuts",per100:{protein_g:18.3,omega3_g:22.8,magnesium_mg:392},note:"Omega-3 is plant ALA, not EPA/DHA"},
 {key:"chia-seeds",name:"Chia seeds",group:"Seeds & nuts",per100:{protein_g:16.5,omega3_g:17.8,magnesium_mg:335},note:"Omega-3 is plant ALA, not EPA/DHA"},
 {key:"orange",name:"Orange (fresh)",group:"Fruit",per100:{protein_g:0.9,vitc_mg:53}},
 {key:"guava",name:"Guava",group:"Fruit",per100:{protein_g:2.6,vitc_mg:228}},
 {key:"amla",name:"Amla / Indian gooseberry",group:"Fruit",per100:{protein_g:0.9},note:"Vitamin C content varies; not calculated"},
 {key:"avocado",name:"Avocado",group:"Fruit",per100:{protein_g:2,folate_ug:81,magnesium_mg:29}},
 {key:"tomato",name:"Tomato (raw)",group:"Vegetables",per100:{protein_g:0.9,vitc_mg:13.7}},
 {key:"capsicum",name:"Red capsicum (raw)",group:"Vegetables",per100:{protein_g:1,vitc_mg:128}},
 {key:"whole-grains",name:"Whole wheat bread",group:"Grains",per100:{protein_g:13},note:"Specific brand may be quite different"}
];

export type FoodIntakeRecord={
 id:string;date:string;food_key:string;food_name:string;quantity_g:number;
 estimated_nutrients:NutrientAmounts;meal_type:string;created_at:string;
};
export function getFood(key:string){return FOOD_CATALOG.find(f=>f.key===key)||null;}
export function estimateFood(food:FoodReference,grams:number):NutrientAmounts {
 if(!Number.isFinite(grams)||grams<=0||grams>5000)throw new Error("Quantity must be 0–5000 g (exclusive of zero).");
 const calculated:NutrientAmounts={};
 for(const nutrient of NUTRIENTS){
  const value=food.per100[nutrient.key];
  if(value!==undefined && Number.isFinite(value))calculated[nutrient.key]=Math.round(value*grams/100*100)/100;
 }
 return calculated;
}
/** Missing catalog values are explicitly omitted, never counted as known zeros. */
export function totalsForFoodLogs(rows:Pick<FoodIntakeRecord,"estimated_nutrients">[]):NutrientAmounts {
 const result:NutrientAmounts={};
 for(const row of rows)for(const item of NUTRIENTS){
  const value=row.estimated_nutrients?.[item.key];
  if(value!==undefined&&Number.isFinite(value)&&value>=0)result[item.key]=Math.round(((result[item.key]||0)+value)*100)/100;
 }
 return result;
}
export function dateFoodLogs(rows:FoodIntakeRecord[],date:string){return rows.filter(r=>r.date===date);}
