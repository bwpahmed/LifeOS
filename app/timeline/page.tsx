"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Row={id:string;at:string;kind:string;title:string;detail?:string};

export default function TimelinePage(){
 const[workspaceId,setWorkspaceId]=useState("");const[rows,setRows]=useState<Row[]>([]);const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);
  const[activity,focus,journal,receivables]=await Promise.all([
   sb.from("activity_log").select("id,action,detail,created_at").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(100),
   sb.from("focus_sessions").select("id,minutes,task_id,created_at,date").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(100),
   sb.from("journal_entries").select("id,body,mood,created_at,date").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(100),
   sb.from("receivables").select("id,name").eq("workspace_id",ctx.workspaceId)
  ]);for(const q of[activity,focus,journal,receivables])if(q.error)throw q.error;const recs=receivables.data||[];const ids=recs.map((r:any)=>r.id);
  const[payments,followups]=ids.length?await Promise.all([sb.from("receivable_payments").select("id,receivable_id,amount,date,created_at").in("receivable_id",ids).order("created_at",{ascending:false}).limit(100),sb.from("receivable_followups").select("id,receivable_id,note,date,created_at").in("receivable_id",ids).order("created_at",{ascending:false}).limit(100)]):[{data:[],error:null},{data:[],error:null}] as any;
  if(payments.error)throw payments.error;if(followups.error)throw followups.error;const recName=new Map(recs.map((r:any)=>[r.id,r.name]));
  const all:Row[]=[
   ...(activity.data||[]).map((x:any)=>({id:`a-${x.id}`,at:x.created_at,kind:"Activity",title:x.action,detail:x.detail||""})),
   ...(focus.data||[]).map((x:any)=>({id:`f-${x.id}`,at:x.created_at,kind:"Focus",title:`${x.minutes} min focus`,detail:x.date})),
   ...(journal.data||[]).map((x:any)=>({id:`j-${x.id}`,at:x.created_at,kind:"Journal",title:x.mood||"Journal",detail:String(x.body||"").slice(0,100)})),
   ...(payments.data||[]).map((x:any)=>({id:`p-${x.id}`,at:x.created_at,kind:"Payment",title:`AED ${Number(x.amount).toLocaleString()} received`,detail:recName.get(x.receivable_id)||""})),
   ...(followups.data||[]).map((x:any)=>({id:`u-${x.id}`,at:x.created_at,kind:"Follow-up",title:`Follow-up: ${recName.get(x.receivable_id)||"Receivable"}`,detail:x.note||""}))
  ].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,200);setRows(all);
 }catch(e){setError(e instanceof Error?e.message:"Could not load timeline");}},[]);useEffect(()=>{void load();},[load]);
 return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">TIMELINE</p><h1 className="text-2xl font-bold">What changed, chronologically</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}{!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<Panel title="Recent activity">{rows.length===0?<p className="text-sm text-slate-400">No activity yet.</p>:<div className="space-y-2">{rows.map(r=><div key={r.id} className="rounded-lg border border-white/10 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">{r.kind} · {new Date(r.at).toLocaleString()}</span><b className="mt-1 block text-sm">{r.title}</b>{r.detail&&<p className="text-xs text-slate-400">{r.detail}</p>}</div>)}</div>}</Panel>}</main>;
}
