"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import {currentWorkspace} from "@/lib/supabase/workspace";
import {supabaseBrowser} from "@/lib/supabase/client";
import {useRealtimeRefresh} from "@/lib/use-realtime-refresh";
import {todayInTZ} from "@/lib/timezone";
import {FOOD_CATALOG,FOOD_REFERENCE_VERSION,NUTRIENTS,dateFoodLogs,estimateFood,getFood,totalsForFoodLogs,type FoodIntakeRecord,type NutrientAmounts} from "@/lib/nutrition";
import "./nutrition-intake.css";

const MEALS=["Breakfast","Lunch","Dinner","Snack","Other"];
function dayOffset(date:string,delta:number){const day=new Date(date+"T12:00:00Z");day.setUTCDate(day.getUTCDate()+delta);return day.toISOString().slice(0,10);}

export function NutritionIntakePanel(){
 const [workspace,setWorkspace]=useState("");
 const [owner,setOwner]=useState("");
 const [entries,setEntries]=useState<FoodIntakeRecord[]>([]);
 const [day,setDay]=useState(todayInTZ());
 const [foodKey,setFoodKey]=useState("egg-boiled");
 const [amount,setAmount]=useState("2");
 const [unit,setUnit]=useState<"serving"|"g">("serving");
 const [meal,setMeal]=useState("Breakfast");
 const [search,setSearch]=useState("");
 const [custom,setCustom]=useState(false);
 const [customName,setCustomName]=useState("");
 const [manualProtein,setManualProtein]=useState("");
 const [note,setNote]=useState("");
 const [saving,setSaving]=useState(false);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [expanded,setExpanded]=useState(false);
 const today=todayInTZ();
 const selected=getFood(foodKey);
 const selectedMatches=!search.trim()||!!selected&&(selected.name+" "+selected.group).toLowerCase().includes(search.trim().toLowerCase());
 const grams=Number(amount)*(!custom&&unit==="serving"&&selected?.servingGrams?selected.servingGrams:1);
 const estimated=selected&&selectedMatches&&Number.isFinite(grams)&&grams>0&&grams<=5000?estimateFood(selected,grams):{};
 const load=useCallback(async()=>{
  try{
   const sb=supabaseBrowser(),ctx=await currentWorkspace(sb);
   if(!ctx){setWorkspace("");setReady(true);return;}
   const result=await sb.from("food_intake_logs")
    .select("id,date,food_key,food_name,quantity_g,estimated_nutrients,meal_type,created_at")
    .eq("workspace_id",ctx.workspaceId).eq("created_by",ctx.user.id)
    .gte("date",dayOffset(todayInTZ(),-29))
    .order("created_at",{ascending:false}).limit(500);
   if(result.error)throw result.error;
   setEntries((result.data||[]) as FoodIntakeRecord[]);
   setWorkspace(ctx.workspaceId);setOwner(ctx.user.id);setError("");setReady(true);
  }catch(e){setReady(true);setError("Nutrition log is unavailable. The private Supabase nutrition migration may still need activation. "+(e instanceof Error?e.message:"")); }
 },[]);
 useEffect(()=>{void load();},[load]);
 useRealtimeRefresh(["food_intake_logs"],load,Boolean(workspace));

 const daily=useMemo(()=>dateFoodLogs(entries,day),[entries,day]);
 const dailyTotals=useMemo(()=>totalsForFoodLogs(daily),[daily]);
 const visibleFoods=FOOD_CATALOG.filter(f=>(f.name+" "+f.group).toLowerCase().includes(search.trim().toLowerCase()));
 const last7=Array.from({length:7},(_,i)=>{
  const date=dayOffset(today,i-6);
  return {date,values:totalsForFoodLogs(dateFoodLogs(entries,date)),count:dateFoodLogs(entries,date).length};
 });
 const todayTotal=totalsForFoodLogs(dateFoodLogs(entries,today));
 const maxDay=day;
 function choose(key:string){
  const next=getFood(key);if(!next)return;
  setFoodKey(key);setUnit(next.servingGrams?"serving":"g");setAmount(next.servingGrams?"2":"100");setCustom(false);
 }
 async function add(e:FormEvent){
  e.preventDefault();if(saving||!workspace||!owner)return;
  setError("");setNotice("");
  const quantity=Number(amount);
  if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(grams)||grams<=0||grams>5000){setError("Enter a valid food quantity between 1 and 5000 g.");return;}
  if(!custom&&!selectedMatches){setError("Choose a food from the filtered list.");return;}
  const title=custom?customName.trim():selected?.name||"";
  if(!title||title.length>120){setError("Enter a food name (up to 120 characters).");return;}
  let nutrients:NutrientAmounts={};
  if(custom){
   if(manualProtein.trim()!==""){
    const value=Number(manualProtein);
    if(!Number.isFinite(value)||value<0||value>500){setError("Protein amount is invalid.");return;}
    nutrients={protein_g:value};
   }
  }else if(selected)nutrients=estimateFood(selected,grams);
  if(day>today||day<dayOffset(today,-29)){setError("Choose a day within the past 30 days.");return;}
  setSaving(true);
  try{
   const sb=supabaseBrowser();
   const result=await sb.from("food_intake_logs").insert({
    workspace_id:workspace,created_by:owner,date:day,
    food_key:custom?"custom":foodKey,food_name:title,
    quantity_g:Math.round(grams*100)/100,meal_type:meal,
    estimated_nutrients:nutrients,reference_version:custom?"user-entered":FOOD_REFERENCE_VERSION,
    note:note.trim()||null
   });
   if(result.error)throw result.error;
   setNotice("Consumed food saved to your private LifeOS Supabase log.");
   setNote("");if(custom){setCustomName("");setManualProtein("");}
   await load();
  }catch(err){setError(err instanceof Error?err.message:"Food log could not be saved. No local entry was created.");}
  finally{setSaving(false);}
 }
 async function undo(record:FoodIntakeRecord){
  if(saving||!workspace||!owner)return;
  setSaving(true);setError("");setNotice("");
  try{
   const sb=supabaseBrowser();
   const {error:q}=await sb.from("food_intake_logs").delete()
    .eq("id",record.id).eq("workspace_id",workspace).eq("created_by",owner);
   if(q)throw q;
   setNotice("Selected food entry removed from your Supabase history.");
   await load();
  }catch(err){setError(err instanceof Error?err.message:"Could not undo entry.");}
  finally{setSaving(false);}
 }
 return <section id="nutrition-intake" className="nutrition-studio" aria-label="Daily consumed food and nutrition tracker">
  <div className="nutrition-heading"><div><span>FOOD YOU ACTUALLY ATE</span><h2>Daily nutrition tracker</h2><p>Log real portions. Estimates come from generic food references; planned meals are never counted as consumed.</p></div><div className="nutrition-head-value"><small>Protein logged for {day}</small><strong>{dailyTotals.protein_g==null?"—":dailyTotals.protein_g.toFixed(1)+" g"}</strong></div></div>
  {error&&<p className="nutrition-error" role="alert">{error}</p>}
  {notice&&<p className="nutrition-notice" role="status">{notice}</p>}
  {!ready?<p className="nutrition-empty">Loading nutrition history…</p>:
   !workspace?<p className="nutrition-empty">Your private nutrition data is not available. Sign in to your LifeOS workspace or retry. <button type="button" onClick={()=>void load()}>Retry</button></p>:
   <>
   <div className="nutrition-layout">
    <div className="nutrition-card">
     <div className="nutrition-card-header"><h3>Add what you ate</h3><div className="nutrition-switch"><button type="button" aria-pressed={!custom} onClick={()=>setCustom(false)}>Food library</button><button type="button" aria-pressed={custom} onClick={()=>{setCustom(true);setAmount("100");setUnit("g");}}>Other food</button></div></div>
     <form className="nutrition-form" onSubmit={e=>void add(e)}>
      <label>Meal<select value={meal} onChange={e=>setMeal(e.target.value)}>{MEALS.map(m=><option key={m}>{m}</option>)}</select></label>
      <label>Date<input type="date" value={day} max={today} min={dayOffset(today,-29)} onChange={e=>setDay(e.target.value)}/></label>
      {custom?<><label className="nutrition-wide">Food name<input value={customName} required maxLength={120} onChange={e=>setCustomName(e.target.value)} placeholder="Describe the food and preparation"/></label><label>Weight consumed (g)<input type="number" min={1} max={5000} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Protein in this portion (g, optional)<input type="number" min={0} max={500} step={0.1} value={manualProtein} placeholder="From package or known recipe" onChange={e=>setManualProtein(e.target.value)}/></label></>:
      <><label className="nutrition-wide">Search foods<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="egg, chicken, chana, guava…"/></label>
       <label className="nutrition-wide">Food<select value={visibleFoods.some(f=>f.key===foodKey)?foodKey:""} onChange={e=>choose(e.target.value)}>
        {!visibleFoods.some(f=>f.key===foodKey)&&<option value="">Choose a food</option>}
        {visibleFoods.map(f=><option key={f.key} value={f.key}>{f.name}</option>)}
       </select></label>
       <label>Quantity<input type="number" min="0.1" max="5000" step="0.1" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
       <label>Unit<select value={unit} disabled={!selected?.servingGrams} onChange={e=>setUnit(e.target.value as "serving"|"g")}>{selected?.servingGrams&&<option value="serving">{selected.servingName||"portion"} ({selected.servingGrams} g)</option>}<option value="g">grams (g)</option></select></label></>}
      <label className="nutrition-wide">Optional note<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="How it was cooked, brand, etc."/></label>
      <div className="nutrition-wide nutrition-preview">
       {custom?<span>Custom food: only user-entered nutrient numbers will be included.</span>:selected?<><span>{Math.round(grams*10)/10} g edible weight</span><b>{estimated.protein_g==null?"Protein unknown":"~"+estimated.protein_g.toFixed(1)+" g protein"}</b><small>{selected.note||"Generic composition estimate; not a precise analysis."}</small></>:<span>Choose a food above</span>}
      </div>
      <button type="submit" className="nutrition-save nutrition-wide" disabled={saving||(!custom&&(!selected||!selectedMatches))||grams<=0||grams>5000}>{saving?"Saving…":"＋ Log consumed food"}</button>
     </form>
     <p className="nutrition-footnote">Recipes, cooking weight and brands change nutrients. Egg servings refer to edible egg weight; chicken has separate raw and cooked entries.</p>
    </div>
    <div className="nutrition-card">
     <div className="nutrition-card-header"><h3>Daily intake estimate</h3><span>{daily.length} entries</span></div>
     <div className="nutrition-totals">{NUTRIENTS.map(n=><div key={n.key} className="nutrition-nutrient"><span>{n.name}</span><strong>{dailyTotals[n.key]==null?"—":dailyTotals[n.key]!.toFixed(n.key==="protein_g"||n.key.startsWith("omega3_")?1:2)} <small>{dailyTotals[n.key]==null?"not estimated":n.unit}</small></strong></div>)}</div>
     <p className="nutrition-footnote">A dash means no estimate was available, not zero intake. Values reflect only logged foods and only nutrients present in the reference; they are not deficiency diagnoses or daily target advice. Plant ALA and marine EPA/DHA are different omega-3 forms.</p>
     <div className="nutrition-insights-header"><h4>Last 7 days · protein</h4><small>Recorded only</small></div>
     <div className="nutrition-history">{last7.map(x=><div key={x.date} className={"nutrition-history-day"+(x.date===day?" is-active":"")}>
      <b>{x.values.protein_g==null?"—":Math.round(x.values.protein_g)+"g"}</b><span>{new Date(x.date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"})}</span>
     </div>)}</div>
     <button className="nutrition-expand" type="button" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}>{expanded?"Hide":"Show"} consumed food history {expanded?"↑":"↓"}</button>
     {expanded&&<div className="nutrition-entries">{daily.length===0?<p>No foods recorded for this day.</p>:daily.map(x=><div key={x.id} className="nutrition-entry"><div><b>{x.food_name}</b><small>{x.meal_type} · {x.quantity_g} g · {x.estimated_nutrients?.protein_g==null?"protein unknown":"~"+x.estimated_nutrients.protein_g+" g protein"}</small></div><button type="button" disabled={saving} aria-label={"Remove "+x.food_name} onClick={()=>void undo(x)}>Undo</button></div>)}</div>}
    </div>
   </div>
   <p className="nutrition-bottom">Estimates are for personal tracking. Discuss protein needs, supplement decisions, and laboratory results with a qualified clinician or dietitian. USDA FoodData Central is the general composition reference; this is not an exact laboratory analysis.</p>
   </>
  }
 </section>;
}
