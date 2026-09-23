"use client";

import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace,peekWorkspaceContext } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { InstallPWA } from "@/components/install-pwa";

type Task={id:string;name:string;status:string;deadline:string|null};
type Note={id:string;title:string;body:string;pinned:boolean;archived:boolean;updated_at:string};
type WasteLesson={id:string;amount:number;category:string;merchant:string|null;avoid_next_time:string|null;waste_reason:string|null;date:string};

export default function MobileCompactPage(){
 const cachedWorkspace=peekWorkspaceContext();const[workspaceId,setWorkspaceId]=useState(cachedWorkspace?.workspaceId||"");const[tasks,setTasks]=useState<Task[]>([]);const[notes,setNotes]=useState<Note[]>([]);const[wasteLessons,setWasteLessons]=useState<WasteLesson[]>([]);const[error,setError]=useState("");
 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);const[t,n,w]=await Promise.all([
   sb.from("tasks").select("id,name,status,deadline").eq("workspace_id",ctx.workspaceId).not("status","in",'("Completed","Cancelled")').order("deadline",{ascending:true,nullsFirst:false}).limit(8),
   sb.from("sticky_notes").select("id,title,body,pinned,archived,updated_at").eq("workspace_id",ctx.workspaceId).eq("archived",false).order("pinned",{ascending:false}).order("updated_at",{ascending:false}).limit(6),
   sb.from("money_expenses").select("id,amount,category,merchant,avoid_next_time,waste_reason,date").eq("workspace_id",ctx.workspaceId).eq("is_waste",true).order("date",{ascending:false}).limit(4)
 ]);if(t.error)throw t.error;if(n.error)throw n.error;if(w.error)throw w.error;setTasks((t.data||[]) as Task[]);setNotes((n.data||[]) as Note[]);setWasteLessons((w.data||[]) as WasteLesson[]);}catch(e){setError(e instanceof Error?e.message:"Could not load compact view");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["tasks","sticky_notes","money_expenses"],load,Boolean(workspaceId));
 async function done(id:string){const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({status:"Completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}
 return <main className="mobile-compact">
   <div className="mobile-compact-head"><div><span className="label">PHONE QUICK VIEW</span><h2>Tasks & Notes</h2></div><Link href="/quick-add" className="primary-btn">＋ Add</Link></div>
   <div className="sticky-info"><b>Widget-like mobile access:</b> install LifeOS as a PWA, then use its app shortcuts for Tasks & Notes, Tasks, Sticky Notes and Waste Guard. Browsers do not expose a true native home-screen widget API to a normal PWA.</div>
   <div className="mt"><InstallPWA/></div>
   {error&&<p className="text-sm text-red-300">{error}</p>}
   {!workspaceId?<p className="panel p-4 text-sm">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:<>
    <section className="panel"><div className="panel-head"><div><span className="label">NEXT</span><h3>Tasks</h3></div><Link href="/tasks" className="text-btn">All</Link></div><div className="list-stack">{tasks.map(t=><div key={t.id} className="priority-item"><span className="priority-number">✓</span><div><strong>{t.name}</strong><small>{t.status} · {t.deadline||"No deadline"}</small></div><button onClick={()=>done(t.id)} className="mini-btn">Done</button></div>)}{!tasks.length&&<div className="empty-state"><b>No open tasks</b>Suspiciously peaceful.</div>}</div></section>
    <section className="panel mt"><div className="panel-head"><div><span className="label">PERMANENT</span><h3>Sticky Notes</h3></div><Link href="/sticky-notes" className="text-btn">All</Link></div><div className="mobile-note-grid">{notes.map(n=><Link href="/sticky-notes" key={n.id} className="mobile-note"><b>{n.title}</b><p>{n.body}</p></Link>)}{!notes.length&&<div className="empty-state"><b>No sticky notes</b>Add something worth remembering.</div>}</div></section>
    {wasteLessons.length>0&&<section className="panel mt"><div className="panel-head"><div><span className="label">DON'T REPEAT</span><h3>Waste Guard memory</h3></div><Link href="/expenses" className="text-btn">All</Link></div><div className="list-stack">{wasteLessons.map(x=><Link href="/expenses" key={x.id} className="priority-item"><span className="priority-number">⊘</span><div><strong>{x.avoid_next_time||"Review this waste expense"}</strong><small>AED {Number(x.amount||0).toLocaleString()} · {x.category}{x.merchant?" · "+x.merchant:""}</small></div></Link>)}</div></section>}
    <div className="quick-type-grid mt"><Link href="/today"><b>◷</b><span>Today</span></Link><Link href="/expenses"><b>⊘</b><span>Waste</span></Link><Link href="/health-planner"><b>✚</b><span>Health</span></Link><Link href="/notifications"><b>◉</b><span>Alerts</span></Link></div>
   </>}
 </main>;
}
