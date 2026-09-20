"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PrivacyGate } from "@/components/privacy-gate";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Urge={id:string;date:string;time:string|null;level:number|null;trigger:string|null;response:string|null;outcome:string|null;notes:string|null};
const triggers=["Boredom","Stress","Porn","Social media","Loneliness","Late-night phone","Habit","Other"];
const responses=["Ignored","Walk","Exercise","Shower","Phone away","Family time","Work","Sleep","Other"];

function SelfControlContent(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[rows,setRows]=useState<Urge[]>([]);const[error,setError]=useState("");
  const[level,setLevel]=useState(5);const[trigger,setTrigger]=useState("Boredom");const[response,setResponse]=useState("Phone away");const[outcome,setOutcome]=useState("Controlled");const[notes,setNotes]=useState("");
  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const{data,error:q}=await sb.from("urge_logs").select("id,date,time,level,trigger,response,outcome,notes").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(100);if(q)throw q;setRows((data||[]) as Urge[]);}catch(e){setError(e instanceof Error?e.message:"Could not load urge log");}},[]);
  useEffect(()=>{void load();},[load]);
  async function add(e:FormEvent){e.preventDefault();const d=new Date();const time=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);const sb=supabaseBrowser();const{error:q}=await sb.from("urge_logs").insert({workspace_id:workspaceId,created_by:userId,date:todayInTZ(),time,level,trigger,response,outcome,notes:notes||null,privacy:"private"});if(q)setError(q.message);else{setNotes("");await load();}}
  const insight=useMemo(()=>{const counts=(items:Urge[],key:"trigger"|"response")=>items.reduce<Record<string,number>>((a,r)=>{const v=String(r[key]||"Unknown");a[v]=(a[v]||0)+1;return a;},{});const top=(o:Record<string,number>)=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";const controlledRows=rows.filter(r=>r.outcome==="Controlled");const hourCounts=rows.reduce<Record<string,number>>((a,r)=>{const h=(r.time||"").split(":")[0];if(/^\\d{2}$/.test(h))a[h]=(a[h]||0)+1;return a;},{});const typicalHour=Object.entries(hourCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]??null;return{topTrigger:top(counts(rows,"trigger")),topResponse:top(counts(controlledRows,"response")),typicalHour,success:rows.length?Math.round(controlledRows.length/rows.length*100):0};},[rows]);

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">SELF-CONTROL</p><h1 className="text-2xl font-bold">Track triggers, not shame</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-2">
      <Panel title="Log urge"><form onSubmit={add} className="space-y-3"><label className="block text-xs text-slate-400">Intensity 1–10<input type="range" min="1" max="10" value={level} onChange={e=>setLevel(Number(e.target.value))} className="w-full"/><b className="text-white">{level}/10</b></label>
        <div className="grid grid-cols-2 gap-2"><select value={trigger} onChange={e=>setTrigger(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{triggers.map(x=><option key={x}>{x}</option>)}</select><select value={response} onChange={e=>setResponse(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{responses.map(x=><option key={x}>{x}</option>)}</select></div>
        <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"><option>Controlled</option><option>Masturbated</option></select><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional note" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save privately</button></form></Panel>
      <Panel title="Patterns" kicker="RECENT LOGS"><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Top trigger</span><b className="block">{insight.topTrigger}</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Best response</span><b className="block">{insight.topResponse}</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Control rate</span><b className="block">{insight.success}%</b></div><div className="rounded-lg border border-white/10 p-3"><span className="text-xs text-slate-500">Typical hour</span><b className="block">{insight.typicalHour==null?"—":`${insight.typicalHour}:00`}</b></div></div>
        <div className="mt-3 space-y-2">{rows.slice(0,10).map(r=><div key={r.id} className="rounded-lg border border-white/10 p-2 text-xs"><b>{r.trigger}</b> · {r.level}/10 · {r.response} → {r.outcome}<span className="float-right text-slate-500">{r.date} {r.time}</span></div>)}</div></Panel>
    </div>}
  </main>;
}


export default function SelfControlPage(){return <PrivacyGate><SelfControlContent/></PrivacyGate>;}
