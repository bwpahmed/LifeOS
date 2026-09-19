"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Entry={id:string;date:string;mood:string|null;body:string;tags:string[]|null;created_at:string};

export default function JournalPage(){
 const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[rows,setRows]=useState<Entry[]>([]);const[body,setBody]=useState("");const[mood,setMood]=useState("Neutral");const[tags,setTags]=useState("");const[q,setQ]=useState("");const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const{data,error:x}=await sb.from("journal_entries").select("id,date,mood,body,tags,created_at").eq("workspace_id",ctx.workspaceId).order("created_at",{ascending:false}).limit(200);if(x)throw x;setRows((data||[]) as Entry[]);}catch(e){setError(e instanceof Error?e.message:"Could not load journal");}},[]);useEffect(()=>{void load();},[load]);
 async function add(e:FormEvent){e.preventDefault();if(!body.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("journal_entries").insert({workspace_id:workspaceId,created_by:userId,date:todayInTZ(),mood,body:body.trim(),tags:tags.split(",").map(x=>x.trim()).filter(Boolean),privacy:"private"});if(x)setError(x.message);else{setBody("");setTags("");await load();}}
 async function remove(id:string){if(!confirm("Delete this journal entry?"))return;const sb=supabaseBrowser();const{error:x}=await sb.from("journal_entries").delete().eq("id",id);if(x)setError(x.message);else await load();}
 const filtered=useMemo(()=>{const n=q.toLowerCase().trim();return n?rows.filter(r=>(r.body+" "+(r.tags||[]).join(" ")+" "+r.mood).toLowerCase().includes(n)):rows;},[rows,q]);

 return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">PRIVATE JOURNAL</p><h1 className="text-2xl font-bold">Notes, patterns, decisions</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
 {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-[.75fr_1.25fr]"><Panel title="New entry"><form onSubmit={add} className="space-y-2"><select value={mood} onChange={e=>setMood(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Strong","Good","Neutral","Tired","Stressed","Low"].map(x=><option key={x}>{x}</option>)}</select><textarea required rows={8} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write what happened, what you learned, or what needs attention." className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="tags, comma, separated" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save privately</button></form></Panel><Panel title="Entries"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search journal…" className="mb-3 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><div className="space-y-2">{filtered.map(r=><article key={r.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-3"><span className="text-xs text-slate-500">{r.date} · {r.mood}</span><button onClick={()=>remove(r.id)} className="text-xs text-red-300">Delete</button></div><p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>{(r.tags||[]).length>0&&<p className="mt-2 text-xs text-[#9fc4ff]">{(r.tags||[]).map(t=>`#${t}`).join(" ")}</p>}</article>)}</div></Panel></div>}
 </main>;
}
