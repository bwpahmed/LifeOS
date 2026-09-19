"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PrivacyGate } from "@/components/privacy-gate";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Photo={id:string;date:string;label:string|null;path:string;url?:string};

function HairContent(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");const[photos,setPhotos]=useState<Photo[]>([]);const[error,setError]=useState("");const[label,setLabel]=useState("Front");const[file,setFile]=useState<File|null>(null);const[left,setLeft]=useState("");const[right,setRight]=useState("");const[uploading,setUploading]=useState(false);
  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const{data,error:q}=await sb.from("hair_photos").select("id,date,label,path").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(100);if(q)throw q;const rows=(data||[]) as Photo[];const signed=await Promise.all(rows.map(async p=>{const{data:s}=await sb.storage.from("lifeos-private").createSignedUrl(p.path,3600);return{...p,url:s?.signedUrl};}));setPhotos(signed);if(signed[0]&&!left)setLeft(signed[0].id);if(signed[1]&&!right)setRight(signed[1].id);}catch(e){setError(e instanceof Error?e.message:"Could not load hair photos");}},[left,right]);
  useEffect(()=>{void load();},[load]);
  async function upload(e:FormEvent){e.preventDefault();if(!file||!workspaceId||!userId)return;setUploading(true);setError("");try{if(file.size>8*1024*1024)throw new Error("Photo must be under 8 MB.");const sb=supabaseBrowser();const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();const id=crypto.randomUUID();const path=`${userId}/hair/${id}.${ext}`;const up=await sb.storage.from("lifeos-private").upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;const ins=await sb.from("hair_photos").insert({id,workspace_id:workspaceId,created_by:userId,date:todayInTZ(),label,path,privacy:"private"});if(ins.error){await sb.storage.from("lifeos-private").remove([path]);throw ins.error;}setFile(null);await load();}catch(e){setError(e instanceof Error?e.message:"Upload failed");}finally{setUploading(false);}}
  const l=useMemo(()=>photos.find(p=>p.id===left),[photos,left]);const r=useMemo(()=>photos.find(p=>p.id===right),[photos,right]);
  async function remove(p:Photo){if(!confirm("Delete this hair photo?"))return;const sb=supabaseBrowser();const del=await sb.from("hair_photos").delete().eq("id",p.id);if(del.error){setError(del.error.message);return;}await sb.storage.from("lifeos-private").remove([p.path]);await load();}

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">HAIR RECOVERY</p><h1 className="text-2xl font-bold">Monthly evidence, same angles</h1>{error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4">
      <Panel title="Upload private photo" kicker="SAME LIGHTING · DISTANCE · ANGLE"><form onSubmit={upload} className="grid gap-2 md:grid-cols-[160px_1fr_auto]"><select value={label} onChange={e=>setLabel(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Front","Top","Crown","Left","Right","Hairline"].map(x=><option key={x}>{x}</option>)}</select><input required type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button disabled={uploading} className="rounded-lg bg-[#77adff] px-4 py-2 font-bold text-[#06101f] disabled:opacity-50">{uploading?"Uploading…":"Upload"}</button></form></Panel>
      <Panel title="Side-by-side comparison" kicker="SIGNED PRIVATE IMAGES"><div className="grid gap-3 md:grid-cols-2"><div><select value={left} onChange={e=>setLeft(e.target.value)} className="mb-2 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2">{photos.map(p=><option key={p.id} value={p.id}>{p.date} · {p.label}</option>)}</select>{l?.url?<img src={l.url} alt={l.label||"Hair comparison"} className="aspect-square w-full rounded-xl object-cover"/>:<div className="aspect-square rounded-xl bg-white/5"/>}</div><div><select value={right} onChange={e=>setRight(e.target.value)} className="mb-2 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2">{photos.map(p=><option key={p.id} value={p.id}>{p.date} · {p.label}</option>)}</select>{r?.url?<img src={r.url} alt={r.label||"Hair comparison"} className="aspect-square w-full rounded-xl object-cover"/>:<div className="aspect-square rounded-xl bg-white/5"/>}</div></div></Panel>
      <Panel title="Timeline">{photos.length===0?<p className="text-sm text-slate-400">No hair photos yet.</p>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{photos.map(p=><div key={p.id} className="rounded-xl border border-white/10 p-2">{p.url&&<img src={p.url} alt={p.label||"Hair photo"} className="aspect-square w-full rounded-lg object-cover"/>}<b className="mt-2 block text-sm">{p.label}</b><span className="text-xs text-slate-500">{p.date}</span><button onClick={()=>remove(p)} className="mt-2 block text-xs text-red-300">Delete</button></div>)}</div>}</Panel>
    </div>}
  </main>;
}


export default function HairPage(){return <PrivacyGate><HairContent/></PrivacyGate>;}
