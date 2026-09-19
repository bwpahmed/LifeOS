"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type HealthEntry = { id:string; date:string; sleep:number|null; energy:number|null; mood:number|null; stress:number|null; steps:number|null; weight:number|null; waist:number|null; notes:string|null };
type Lab = { id:string; test_name:string; date:string; result:string|null; unit:string|null; ref_range:string|null };

export default function HealthPage() {
  const [workspaceId,setWorkspaceId]=useState("");
  const [userId,setUserId]=useState("");
  const [entries,setEntries]=useState<HealthEntry[]>([]);
  const [labs,setLabs]=useState<Lab[]>([]);
  const [error,setError]=useState("");
  const [sleep,setSleep]=useState(7);
  const [energy,setEnergy]=useState(7);
  const [mood,setMood]=useState(7);
  const [stress,setStress]=useState(4);
  const [steps,setSteps]=useState(0);
  const [weight,setWeight]=useState<number|undefined>();
  const [testName,setTestName]=useState("");
  const [result,setResult]=useState("");
  const [unit,setUnit]=useState("");

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setWorkspaceId("");return;}
      setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);
      const [e,l]=await Promise.all([
        sb.from("health_entries").select("id,date,sleep,energy,mood,stress,steps,weight,waist,notes").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(30),
        sb.from("lab_results").select("id,test_name,date,result,unit,ref_range").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(50)
      ]);
      if(e.error) throw e.error;if(l.error) throw l.error;
      setEntries((e.data||[]) as HealthEntry[]);setLabs((l.data||[]) as Lab[]);
    }catch(err){setError(err instanceof Error?err.message:"Could not load health data");}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function saveDaily(e:FormEvent){
    e.preventDefault();if(!workspaceId||!userId)return;
    const sb=supabaseBrowser();const date=todayInTZ();
    const existing=entries.find(x=>x.date===date);
    const payload={workspace_id:workspaceId,created_by:userId,date,sleep,energy,mood,stress,steps,weight:weight??null,privacy:"private"};
    const q=existing?sb.from("health_entries").update(payload).eq("id",existing.id):sb.from("health_entries").insert(payload);
    const {error:saveError}=await q;if(saveError)setError(saveError.message);else await load();
  }

  async function addLab(e:FormEvent){
    e.preventDefault();if(!workspaceId||!userId||!testName.trim()||!result.trim())return;
    const sb=supabaseBrowser();
    const {error:saveError}=await sb.from("lab_results").insert({workspace_id:workspaceId,created_by:userId,test_name:testName.trim(),date:todayInTZ(),result:result.trim(),unit:unit.trim()||null,privacy:"private"});
    if(saveError)setError(saveError.message);else{setTestName("");setResult("");setUnit("");await load();}
  }

  return <main className="pt-6">
    <BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">HEALTH COMMAND CENTER</p><h1 className="text-2xl font-bold">Track useful signals</h1>
    {error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in to use private health tracking. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Panel title="Daily health" kicker={todayInTZ()}>
        <form onSubmit={saveDaily} className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">Sleep hours<input type="number" step=".1" min="0" max="16" value={sleep} onChange={e=>setSleep(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <label className="text-xs text-slate-400">Energy 1–10<input type="number" min="1" max="10" value={energy} onChange={e=>setEnergy(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <label className="text-xs text-slate-400">Mood 1–10<input type="number" min="1" max="10" value={mood} onChange={e=>setMood(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <label className="text-xs text-slate-400">Stress 1–10<input type="number" min="1" max="10" value={stress} onChange={e=>setStress(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <label className="text-xs text-slate-400">Steps<input type="number" min="0" value={steps} onChange={e=>setSteps(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <label className="text-xs text-slate-400">Weight<input type="number" step=".1" min="0" value={weight??""} onChange={e=>setWeight(e.target.value?Number(e.target.value):undefined)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"/></label>
          <button className="col-span-2 rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save today</button>
        </form>
      </Panel>
      <Panel title="Lab result" kicker="PRIVATE">
        <form onSubmit={addLab} className="space-y-3">
          <input required value={testName} onChange={e=>setTestName(e.target.value)} placeholder="Test name" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
          <div className="grid grid-cols-2 gap-3"><input required value={result} onChange={e=>setResult(e.target.value)} placeholder="Result" className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/><input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="Unit" className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/></div>
          <button className="w-full rounded-lg border border-white/10 p-2">Add lab result</button>
        </form>
        <div className="mt-4 space-y-2">{labs.slice(0,8).map(l=><div key={l.id} className="rounded-lg border border-white/10 p-2 text-sm"><b>{l.test_name}</b><span className="float-right text-slate-300">{l.result} {l.unit||""}</span><p className="text-xs text-slate-500">{l.date}</p></div>)}</div>
      </Panel>
      <Panel title="Recent trend" kicker="LAST ENTRIES">
        <div className="space-y-2">{entries.slice(0,10).map(x=><div key={x.id} className="grid grid-cols-5 gap-2 rounded-lg border border-white/10 p-2 text-xs"><b>{x.date}</b><span>{x.sleep??"—"}h sleep</span><span>E {x.energy??"—"}</span><span>M {x.mood??"—"}</span><span>{x.steps??0} steps</span></div>)}</div>
      </Panel>
      <Panel title="Hair & self-control" kicker="NEXT SAFE SLICE">
        <p className="text-sm text-slate-400">Database + privacy policies are ready for hair photos and urge logs. Their full upload/analytics UI is intentionally not faked here; it remains a separate implementation slice.</p>
      </Panel>
    </div>}
  </main>;
}
