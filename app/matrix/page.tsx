"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { daysFromToday } from "@/lib/priority";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type Task={id:string;name:string;area:string|null;importance:number|null;deadline:string|null;financial_value:number|null;status:string};
type Quadrant="Do Now"|"Schedule"|"Delegate"|"Remove";

function classify(t:Task):Quadrant{
 const urgent=daysFromToday(t.deadline)<=2;
 const important=Number(t.importance||3)>=4||Number(t.financial_value||0)>=5000||["Health","Family","Money"].includes(t.area||"");
 if(urgent&&important)return"Do Now";
 if(!urgent&&important)return"Schedule";
 if(urgent&&!important)return"Delegate";
 return"Remove";
}

export default function MatrixPage(){
 const[tasks,setTasks]=useState<Task[]>([]);const[signedIn,setSignedIn]=useState<boolean|null>(null);const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const{data,error:q}=await sb.from("tasks").select("id,name,area,importance,deadline,financial_value,status").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').limit(200);if(q)throw q;setTasks((data||[]) as Task[]);}catch(e){setError(e instanceof Error?e.message:"Could not load matrix");}},[]);useEffect(()=>{void load();},[load]);
 const groups=useMemo(()=>tasks.reduce<Record<Quadrant,Task[]>>((a,t)=>{a[classify(t)].push(t);return a;},{"Do Now":[],"Schedule":[],"Delegate":[],"Remove":[]}),[tasks]);
 async function act(t:Task,q:Quadrant){const sb=supabaseBrowser();if(q==="Do Now"){const x=await sb.from("tasks").update({status:"Today",importance:Math.max(4,Number(t.importance||3)),updated_at:new Date().toISOString()}).eq("id",t.id);if(x.error)setError(x.error.message);}
 else if(q==="Schedule"){const date=prompt("Schedule date (YYYY-MM-DD):",t.deadline||"");if(!date)return;const x=await sb.from("tasks").update({status:"Planned",deadline:date,updated_at:new Date().toISOString()}).eq("id",t.id);if(x.error)setError(x.error.message);}
 else if(q==="Delegate"){const person=prompt("Who are you waiting for / delegating to?");if(!person)return;const x=await sb.from("tasks").update({status:"Waiting",waiting_for:person,updated_at:new Date().toISOString()}).eq("id",t.id);if(x.error)setError(x.error.message);}
 else{if(!confirm("Cancel this low-priority task?"))return;const x=await sb.from("tasks").update({status:"Cancelled",updated_at:new Date().toISOString()}).eq("id",t.id);if(x.error)setError(x.error.message);}
 await load();}
 return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">EISENHOWER MATRIX</p><h1 className="text-2xl font-bold">Urgency without chaos</h1><p className="mt-1 text-sm text-slate-400">Classification is deterministic. Nothing moves until you press the action.</p>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}{signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4 md:grid-cols-2">{(["Do Now","Schedule","Delegate","Remove"] as Quadrant[]).map(q=><Panel key={q} title={q} kicker={q==="Do Now"?"URGENT + IMPORTANT":q==="Schedule"?"IMPORTANT":q==="Delegate"?"URGENT, LOWER IMPACT":"LOWER IMPACT"}>{groups[q].length===0?<p className="text-sm text-slate-500">Empty.</p>:<div className="space-y-2">{groups[q].map(t=><div key={t.id} className="rounded-lg border border-white/10 p-3"><b className="text-sm">{t.name}</b><p className="text-xs text-slate-500">{t.area||"Personal"} · due {t.deadline||"—"} · importance {t.importance||3}</p><button onClick={()=>act(t,q)} className="mt-2 rounded border border-white/10 px-2 py-1 text-xs">{q==="Do Now"?"Move to Today":q==="Schedule"?"Pick date":q==="Delegate"?"Delegate / Waiting":"Cancel"}</button></div>)}</div>}</Panel>)}</div>}</main>;
}
