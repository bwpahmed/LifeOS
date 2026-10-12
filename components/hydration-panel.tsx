"use client";

import {FormEvent,useState} from "react";
import {Panel} from "@/components/ui";
import {waterTotalForDate} from "@/lib/health-planner";
import "./hydration-panel.css";

type WaterEntry={id:string;date:string;amount_ml:number;created_at:string};
function earlier(iso:string,days:number){const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
export function HydrationPanel({water,today,goal,goalInput,onGoalChange,onSaveGoal,onAdd,onDelete,busy}:{
 water:WaterEntry[];today:string;goal:number;goalInput:number;
 onGoalChange:(next:number)=>void;onSaveGoal:()=>Promise<void>;
 onAdd:(ml:number)=>Promise<void>;onDelete:(entry:WaterEntry)=>Promise<void>;busy:boolean;
}){
 const[custom,setCustom]=useState("300");
 const total=waterTotalForDate(water,today);
 const percent=goal>0?Math.min(100,Math.round(total/goal*100)):0;
 const recent=water.filter(x=>x.date===today).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const last7=Array.from({length:7},(_,i)=>{const day=earlier(today,6-i);return {day,ml:waterTotalForDate(water,day)};});
 function customSubmit(e:FormEvent){e.preventDefault();const amount=Number(custom);if(Number.isInteger(amount)&&amount>0&&amount<=5000)void onAdd(amount);}
 return <Panel title="Daily water tracker" kicker="CLOUD-SYNCED INTAKE · ML">
  <div className="hydration-meter">
   <span>Water recorded today</span><strong>{total.toLocaleString()} <small>ml</small></strong>
   <div role="progressbar" aria-label="Daily water target" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="hydration-progress"><span style={{width:percent+"%"}}/></div>
   <p>{percent}% of your editable {goal.toLocaleString()} ml target</p>
  </div>
  <div className="hydration-presets" role="group" aria-label="Record water intake">
   {[150,250,500,750].map(amount=><button key={amount} type="button" disabled={busy} onClick={()=>void onAdd(amount)}>＋ {amount} ml</button>)}
  </div>
  <form className="hydration-custom" onSubmit={customSubmit}>
   <label>Custom amount (ml)<input type="number" min={1} max={5000} step={1} required value={custom} onChange={e=>setCustom(e.target.value)}/></label>
   <button type="submit" disabled={busy||!Number.isInteger(Number(custom))||Number(custom)<=0||Number(custom)>5000}>Add water</button>
  </form>
  <div className="hydration-goal">
   <label>My daily target (ml)<input type="number" min={250} max={10000} step={50} value={goalInput} onChange={e=>onGoalChange(Number(e.target.value))}/></label>
   <button type="button" disabled={busy} onClick={()=>void onSaveGoal()}>Save target</button>
  </div>
  <div className="hydration-week"><div className="hydration-head"><h4>Last 7 days</h4><small>Actual logged totals</small></div>
   <div className="hydration-bars">{last7.map(x=><div className="hydration-bar-day" key={x.day}><span title={x.day+" · "+x.ml+" ml"} className="hydration-bar-track"><i style={{height:Math.min(100,goal?x.ml/goal*100:0)+"%"}}/></span><strong>{new Date(x.day+"T12:00:00Z").toLocaleDateString("en-US",{timeZone:"UTC",weekday:"short"})}</strong><small>{x.ml>=1000?(x.ml/1000).toFixed(1)+"L":x.ml+"ml"}</small></div>)}</div>
  </div>
  <div className="hydration-head"><h4>Today's entries</h4><small>{recent.length} recorded</small></div>
  <div className="hydration-entries">{recent.length?recent.map(x=><div key={x.id} className="hydration-entry"><span>💧</span><div><strong>{x.amount_ml} ml</strong><small>{new Date(x.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div><button type="button" disabled={busy} onClick={()=>void onDelete(x)} aria-label={"Undo "+x.amount_ml+" ml entry"}>Undo</button></div>):<p className="hydration-empty">No water logged today. Tap the amount you actually drank.</p>}</div>
  <p className="hydration-note">Your target is editable and is not a personalized medical recommendation. Fluids needed vary with heat, activity and health conditions.</p>
 </Panel>;
}
