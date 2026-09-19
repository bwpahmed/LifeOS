"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Result={id:string;kind:string;title:string;sub:string;href:string};

export default function SearchPage(){
 const[q,setQ]=useState("");const[rows,setRows]=useState<Result[]>([]);const[loading,setLoading]=useState(false);const[error,setError]=useState("");
 async function search(e:FormEvent){e.preventDefault();const term=q.trim();if(term.length<2)return;setLoading(true);setError("");try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)throw new Error("Sign in first.");const like=`%${term.replace(/[%_]/g,"")}%`;
   const[t,r,g,p,f,c,j]=await Promise.all([
    sb.from("tasks").select("id,name,area,status").eq("workspace_id",ctx.workspaceId).ilike("name",like).limit(20),
    sb.from("receivables").select("id,name,company,status").eq("workspace_id",ctx.workspaceId).or(`name.ilike.${like},company.ilike.${like}`).limit(20),
    sb.from("goals").select("id,name,area,status").eq("workspace_id",ctx.workspaceId).ilike("name",like).limit(20),
    sb.from("projects").select("id,name,area,status").eq("workspace_id",ctx.workspaceId).ilike("name",like).limit(20),
    sb.from("family_tasks").select("id,title,status").eq("workspace_id",ctx.workspaceId).ilike("title",like).limit(20),
    sb.from("migration_countries").select("id,country,route,status").eq("workspace_id",ctx.workspaceId).ilike("country",like).limit(20),
    sb.from("journal_entries").select("id,body,mood,date").eq("workspace_id",ctx.workspaceId).ilike("body",like).limit(20)
   ]);for(const x of[t,r,g,p,f,c,j])if(x.error)throw x.error;setRows([
    ...(t.data||[]).map((x:any)=>({id:`t-${x.id}`,kind:"Task",title:x.name,sub:`${x.area||""} · ${x.status}`,href:"/tasks"})),
    ...(r.data||[]).map((x:any)=>({id:`r-${x.id}`,kind:"Money",title:x.name,sub:`${x.company||""} · ${x.status}`,href:"/money"})),
    ...(g.data||[]).map((x:any)=>({id:`g-${x.id}`,kind:"Goal",title:x.name,sub:`${x.area||""} · ${x.status}`,href:"/goals"})),
    ...(p.data||[]).map((x:any)=>({id:`p-${x.id}`,kind:"Project",title:x.name,sub:`${x.area||""} · ${x.status}`,href:"/projects"})),
    ...(f.data||[]).map((x:any)=>({id:`f-${x.id}`,kind:"Family",title:x.title,sub:x.status,href:"/family"})),
    ...(c.data||[]).map((x:any)=>({id:`c-${x.id}`,kind:"Europe",title:x.country,sub:`${x.route||""} · ${x.status}`,href:"/europe"})),
    ...(j.data||[]).map((x:any)=>({id:`j-${x.id}`,kind:"Journal",title:String(x.body).slice(0,80),sub:`${x.date} · ${x.mood||""}`,href:"/journal"}))
   ]);}catch(e){setError(e instanceof Error?e.message:"Search failed");}finally{setLoading(false);}}
 return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">GLOBAL SEARCH</p><h1 className="text-2xl font-bold">Find anything in LifeOS</h1><Panel title="Search"><form onSubmit={search} className="flex gap-2"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Task, person, project, journal…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button disabled={loading} className="rounded-lg bg-[#77adff] px-4 font-bold text-[#06101f]">{loading?"…":"Search"}</button></form>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}<div className="mt-4 space-y-2">{rows.map(r=><Link key={r.id} href={r.href} className="block rounded-lg border border-white/10 p-3"><span className="text-[10px] uppercase tracking-wider text-slate-500">{r.kind}</span><b className="block text-sm">{r.title}</b><p className="text-xs text-slate-400">{r.sub}</p></Link>)}</div></Panel></main>;
}
