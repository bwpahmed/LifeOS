"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { remaining } from "@/lib/money";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Task={id:string;name:string;status:string;deadline:string|null;importance:number|null;waiting_for:string|null};
type Project={id:string;name:string;status:string;deadline:string|null};
type Rec={id:string;name:string;total:number;due_date:string|null;receivable_payments:{amount:number;date:string}[]};

export default function BusinessPage(){
 const[tasks,setTasks]=useState<Task[]>([]);const[projects,setProjects]=useState<Project[]>([]);const[recs,setRecs]=useState<Rec[]>([]);const[signedIn,setSignedIn]=useState<boolean|null>(null);const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const[t,p,r]=await Promise.all([sb.from("tasks").select("id,name,status,deadline,importance,waiting_for").eq("workspace_id",ctx.workspaceId).eq("area","Business").not("status","in",'("Completed","Cancelled")').limit(100),sb.from("projects").select("id,name,status,deadline").eq("workspace_id",ctx.workspaceId).eq("area","Business").not("status","in",'("Completed","Cancelled")').limit(100),sb.from("receivables").select("id,name,total,due_date,receivable_payments(amount,date)").eq("workspace_id",ctx.workspaceId).neq("status","Paid").limit(100)]);for(const q of[t,p,r])if(q.error)throw q.error;setTasks((t.data||[]) as Task[]);setProjects((p.data||[]) as Project[]);setRecs((r.data||[]) as Rec[]);}catch(e){setError(e instanceof Error?e.message:"Could not load business command center");}},[]);useEffect(()=>{void load();},[load]);
 const openMoney=useMemo(()=>recs.reduce((a,r)=>a+remaining(Number(r.total||0),(r.receivable_payments||[]).map(p=>({amount:Number(p.amount),date:p.date}))),0),[recs]);
 return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">BUSINESS COMMAND CENTER</p><h1 className="text-2xl font-bold">Operations that need attention</h1>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}{signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<><div className="mt-4 grid gap-4 md:grid-cols-4">{[["Open business tasks",tasks.length],["Active projects",projects.length],["Waiting",tasks.filter(t=>t.status==="Waiting"||t.waiting_for).length],["Receivable",`AED ${openMoney.toLocaleString()}`]].map(([k,v])=><div key={String(k)} className="panel p-4"><span className="text-xs text-slate-500">{k}</span><b className="mt-2 block text-xl">{v}</b></div>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><Panel title="Priority operations">{tasks.sort((a,b)=>Number(b.importance||0)-Number(a.importance||0)).slice(0,12).map(t=><div key={t.id} className="mb-2 rounded-lg border border-white/10 p-2 text-sm"><b>{t.name}</b><p className="text-xs text-slate-500">{t.status} · due {t.deadline||"—"}{t.waiting_for?` · waiting for ${t.waiting_for}`:""}</p></div>)}</Panel><Panel title="Projects">{projects.map(p=><div key={p.id} className="mb-2 rounded-lg border border-white/10 p-2 text-sm"><b>{p.name}</b><p className="text-xs text-slate-500">{p.status} · due {p.deadline||"—"}</p></div>)}</Panel></div></>}</main>;
}
