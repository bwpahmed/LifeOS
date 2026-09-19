"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Country={id:string;country:string;route:string|null;status:string;progress:number|null;notes:string|null};
type Doc={id:string;country_id:string|null;name:string;owner:string|null;status:string;expiry_date:string|null;needs_attestation:boolean};

export default function EuropePage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[countries,setCountries]=useState<Country[]>([]);const[docs,setDocs]=useState<Doc[]>([]);
  const[error,setError]=useState("");const[country,setCountry]=useState("");const[route,setRoute]=useState("Study");const[docName,setDocName]=useState("");const[docCountry,setDocCountry]=useState("");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);
    const[c,d]=await Promise.all([sb.from("migration_countries").select("id,country,route,status,progress,notes").eq("workspace_id",ctx.workspaceId).order("created_at"),sb.from("migration_documents").select("id,country_id,name,owner,status,expiry_date,needs_attestation").eq("workspace_id",ctx.workspaceId).order("created_at")]);
    if(c.error)throw c.error;if(d.error)throw d.error;setCountries((c.data||[]) as Country[]);setDocs((d.data||[]) as Doc[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load relocation data");}},[]);
  useEffect(()=>{void load();},[load]);

  const ready=useMemo(()=>docs.filter(d=>d.status==="Ready").length,[docs]);
  async function addCountry(e:FormEvent){e.preventDefault();if(!workspaceId||!country.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("migration_countries").insert({workspace_id:workspaceId,created_by:userId,country:country.trim(),route,status:"Research",progress:0});if(x)setError(x.message);else{setCountry("");await load();}}
  async function addDoc(e:FormEvent){e.preventDefault();if(!workspaceId||!docName.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("migration_documents").insert({workspace_id:workspaceId,created_by:userId,country_id:docCountry||null,name:docName.trim(),status:"Missing"});if(x)setError(x.message);else{setDocName("");await load();}}
  async function setDocStatus(id:string,status:string){const sb=supabaseBrowser();const{error:x}=await sb.from("migration_documents").update({status}).eq("id",id);if(x)setError(x.message);else await load();}

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">RELOCATION COMMAND CENTER</p><h1 className="text-2xl font-bold">Family move to Europe</h1>
    {error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in to track relocation. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:
    <>
      <div className="mt-4 grid gap-4 md:grid-cols-3">{countries.map(c=><div key={c.id} className="panel p-4"><b>{c.country}</b><p className="text-xs text-slate-400">{c.route||"Route not set"} · {c.status}</p><div className="mt-3 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-[#77adff]" style={{width:`${Math.max(0,Math.min(100,Number(c.progress||0)))}%`}}/></div><p className="mt-1 text-xs text-slate-500">{c.progress||0}% progress</p></div>)}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel title="Add country route"><form onSubmit={addCountry} className="grid grid-cols-[1fr_130px_auto] gap-2"><input required value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country" className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/><select value={route} onChange={e=>setRoute(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Study","Work","Business","Investment","Family"].map(x=><option key={x}>{x}</option>)}</select><button className="rounded-lg border border-white/10 px-3">Add</button></form></Panel>
        <Panel title="Document readiness" kicker={docs.length?`${ready}/${docs.length} READY`:"NO DOCUMENTS"}><form onSubmit={addDoc} className="grid grid-cols-[1fr_150px_auto] gap-2"><input required value={docName} onChange={e=>setDocName(e.target.value)} placeholder="Document" className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/><select value={docCountry} onChange={e=>setDocCountry(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2"><option value="">General</option>{countries.map(c=><option key={c.id} value={c.id}>{c.country}</option>)}</select><button className="rounded-lg border border-white/10 px-3">Add</button></form><div className="mt-3 space-y-2">{docs.map(d=><div key={d.id} className="grid grid-cols-[1fr_160px] items-center gap-2 rounded-lg border border-white/10 p-2 text-sm"><div><b>{d.name}</b><p className="text-xs text-slate-500">{countries.find(c=>c.id===d.country_id)?.country||"General"}</p></div><select value={d.status} onChange={e=>setDocStatus(d.id,e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-1">{["Ready","Missing","Pending","Needs Attestation","Expired"].map(x=><option key={x}>{x}</option>)}</select></div>)}</div></Panel>
      </div>
    </>}
  </main>;
}
