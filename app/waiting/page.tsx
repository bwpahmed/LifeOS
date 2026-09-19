"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Task={id:string;name:string;waiting_for:string|null;created_at:string;deadline:string|null;importance:number|null;status:string};

export default function WaitingPage(){
 const[rows,setRows]=useState<Task[]>([]);const[signedIn,setSignedIn]=useState<boolean|null>(null);const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const{data,error:q}=await sb.from("tasks").select("id,name,waiting_for,created_at,deadline,importance,status").eq("workspace_id",ctx.workspaceId).or('status.eq.Waiting,waiting_for.not.is.null').not("status","in",'("Completed","Cancelled")').order("created_at");if(q)throw q;setRows((data||[]) as Task[]);}catch(e){setError(e instanceof Error?e.message:"Could not load waiting list");}},[]);useEffect(()=>{void load();},[load]);
 const sorted=useMemo(()=>rows.map(r=>({...r,days:Math.max(0,Math.floor((Date.now()-new Date(r.created_at).getTime())/86400000))})).sort((a,b)=>b.days-a.days),[rows]);
 async function chase(r:Task){const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({status:"Today",importance:Math.max(4,Number(r.importance||3)),updated_at:new Date().toISOString()}).eq("id",r.id);if(q)setError(q.message);else await load();}
 return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">WAITING FOR</p><h1 className="text-2xl font-bold">Nothing disappears into “I’ll follow up”</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}{signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<Panel title={`Waiting items (${rows.length})`} kicker="OLDEST FIRST">{sorted.length===0?<p className="text-sm text-slate-400">Nothing waiting.</p>:<div className="space-y-2">{sorted.map(r=><div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3"><div><b>{r.name}</b><p className="text-xs text-slate-500">Waiting for {r.waiting_for||"someone"} · {r.days} days · due {r.deadline||"—"}</p></div><button onClick={()=>chase(r)} className="rounded-lg border border-white/10 px-3 py-1 text-xs">Chase today</button></div>)}</div>}</Panel>}</main>;
}
