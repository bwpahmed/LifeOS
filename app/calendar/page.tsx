"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Item={id:string;date:string;title:string;kind:string;editable?:boolean;sourceId?:string};

function addDays(iso:string,n:number){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

export default function CalendarPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[items,setItems]=useState<Item[]>([]);const[error,setError]=useState("");const[range,setRange]=useState<"7"|"30"|"90">("30");
  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);const from=addDays(todayInTZ(),-7);const to=addDays(todayInTZ(),120);
    const[t,r,f,m]=await Promise.all([
      sb.from("tasks").select("id,name,deadline,status").eq("workspace_id",ctx.workspaceId).gte("deadline",from).lte("deadline",to).not("status","in",'("Completed","Cancelled")'),
      sb.from("receivables").select("id,name,next_followup,status").eq("workspace_id",ctx.workspaceId).gte("next_followup",from).lte("next_followup",to).neq("status","Paid"),
      sb.from("family_tasks").select("id,title,due_date,status").eq("workspace_id",ctx.workspaceId).gte("due_date",from).lte("due_date",to).neq("status","Completed"),
      sb.from("migration_documents").select("id,name,expiry_date,status").eq("workspace_id",ctx.workspaceId).gte("expiry_date",from).lte("expiry_date",to)
    ]);for(const q of[t,r,f,m])if(q.error)throw q.error;
    const next:Item[]=[
      ...(t.data||[]).map((x:any)=>({id:`task-${x.id}`,date:x.deadline,title:x.name,kind:"Task",editable:true,sourceId:x.id})),
      ...(r.data||[]).map((x:any)=>({id:`money-${x.id}`,date:x.next_followup,title:`Follow up: ${x.name}`,kind:"Money"})),
      ...(f.data||[]).map((x:any)=>({id:`family-${x.id}`,date:x.due_date,title:x.title,kind:"Family"})),
      ...(m.data||[]).map((x:any)=>({id:`doc-${x.id}`,date:x.expiry_date,title:`Document: ${x.name}`,kind:"Europe"}))
    ].filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
    setItems(next);
  }catch(e){setError(e instanceof Error?e.message:"Could not load calendar");}},[]);
  useEffect(()=>{void load();},[load]);
  const visible=useMemo(()=>{const end=addDays(todayInTZ(),Number(range));return items.filter(x=>x.date>=todayInTZ()&&x.date<=end);},[items,range]);
  const grouped=useMemo(()=>visible.reduce<Record<string,Item[]>>((a,x)=>{(a[x.date]??=[]).push(x);return a;},{}),[visible]);
  async function reschedule(i:Item,date:string){if(!i.sourceId)return;const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({deadline:date,updated_at:new Date().toISOString()}).eq("id",i.sourceId);if(q)setError(q.message);else await load();}

  return <main className="pt-6"><BackHome/><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] tracking-widest text-slate-400">CALENDAR</p><h1 className="text-2xl font-bold">One timeline for obligations</h1></div><select value={range} onChange={e=>setRange(e.target.value as any)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2 text-sm"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></div>
    {error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 space-y-3">{Object.entries(grouped).map(([date,rows])=><Panel key={date} title={date} kicker={date===todayInTZ()?"TODAY":new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"})}><div className="space-y-2">{rows.map(i=><div key={i.id} className="grid grid-cols-[85px_1fr_auto] items-center gap-3 rounded-lg border border-white/10 p-2 text-sm"><span className="text-xs text-slate-500">{i.kind}</span><b>{i.title}</b>{i.editable?<input type="date" value={i.date} onChange={e=>reschedule(i,e.target.value)} className="rounded border border-white/10 bg-[#0a1524] p-1 text-xs"/>:<span/>}</div>)}</div></Panel>)}{visible.length===0&&<div className="panel p-6 text-sm text-slate-400">Nothing scheduled in this window.</div>}</div>}
  </main>;
}
