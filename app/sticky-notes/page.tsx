"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Empty,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

type Sticky={
  id:string;title:string;body:string;color:string;pinned:boolean;archived:boolean;
  created_at:string;updated_at:string
};

const COLORS=["yellow","blue","green","pink"];

export default function StickyNotesPage(){
  const[workspaceId,setWorkspaceId]=useState("");
  const[userId,setUserId]=useState("");
  const[rows,setRows]=useState<Sticky[]>([]);
  const[title,setTitle]=useState("");
  const[body,setBody]=useState("");
  const[color,setColor]=useState("yellow");
  const[showArchived,setShowArchived]=useState(false);
  const[error,setError]=useState("");
  const[msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setWorkspaceId("");return;}
      setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);
      const{data,error:q}=await sb.from("sticky_notes")
        .select("id,title,body,color,pinned,archived,created_at,updated_at")
        .eq("workspace_id",ctx.workspaceId)
        .order("pinned",{ascending:false})
        .order("updated_at",{ascending:false});
      if(q)throw q;
      setRows((data||[]) as Sticky[]);
    }catch(e){setError(e instanceof Error?e.message:"Could not load sticky notes");}
  },[]);

  useEffect(()=>{void load();},[load]);
  useRealtimeRefresh(["sticky_notes"],load,Boolean(workspaceId));

  async function add(e:FormEvent){
    e.preventDefault();
    if(!workspaceId||!userId||!body.trim())return;
    setError("");setMsg("");
    const sb=supabaseBrowser();
    const{error:q}=await sb.from("sticky_notes").insert({
      workspace_id:workspaceId,created_by:userId,
      title:title.trim()||"Important note",body:body.trim(),color,pinned:true,archived:false
    });
    if(q){setError(q.message);return;}
    setTitle("");setBody("");setColor("yellow");setMsg("Sticky note saved permanently.");await load();
  }

  async function patch(id:string,changes:Partial<Sticky>){
    setError("");
    const sb=supabaseBrowser();
    const{error:q}=await sb.from("sticky_notes").update({...changes,updated_at:new Date().toISOString()}).eq("id",id);
    if(q)setError(q.message);else await load();
  }

  const visible=useMemo(()=>rows.filter(r=>showArchived?true:!r.archived),[rows,showArchived]);

  return <main className="page-root">
    <BackHome/>
    <div className="section-heading">
      <div><span className="label">PERMANENT NOTES</span><h2>Sticky Notes</h2></div>
      <button className="ghost-btn" onClick={()=>setShowArchived(v=>!v)}>{showArchived?"Hide archived":"Show archived"}</button>
    </div>

    <div className="sticky-info">
      Important notes cannot be permanently deleted. You can edit them, pin/unpin them, or archive them.
    </div>

    {error&&<p className="mt rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {msg&&<p className="mt rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{msg}</p>}

    {!workspaceId?<div className="panel mt"><p>Sign in first. <Link href="/login" className="text-btn">Open login →</Link></p></div>:
    <>
      <div className="grid g2 mt">
        <Panel title="New sticky note" kicker="IMPORTANT">
          <form onSubmit={add} className="sticky-form">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title"/>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} placeholder="Write something important that should not disappear…"/>
            <div className="sticky-toolbar">
              <select value={color} onChange={e=>setColor(e.target.value)}>{COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <button className="primary-btn" disabled={!body.trim()}>Save sticky note</button>
            </div>
          </form>
        </Panel>

        <Panel title="How this works" kicker="SAFE NOTES">
          <div className="list-stack">
            <div className="priority-item"><span className="priority-number">1</span><div><strong>No hard delete</strong><small>Database has no DELETE policy for sticky notes.</small></div></div>
            <div className="priority-item"><span className="priority-number">2</span><div><strong>Archive instead</strong><small>Hide old notes without losing them.</small></div></div>
            <div className="priority-item"><span className="priority-number">3</span><div><strong>Cloud synced</strong><small>Your notes follow your LifeOS account across devices.</small></div></div>
          </div>
        </Panel>
      </div>

      <div className="sticky-grid mt">
        {visible.length?visible.map(n=><article key={n.id} className={"sticky-note sticky-"+n.color+(n.archived?" archived":"")}>
          <div className="sticky-head">
            <input value={n.title} onChange={e=>setRows(rs=>rs.map(x=>x.id===n.id?{...x,title:e.target.value}:x))} onBlur={()=>patch(n.id,{title:n.title})}/>
            <button className="mini-btn" onClick={()=>patch(n.id,{pinned:!n.pinned})}>{n.pinned?"Pinned":"Pin"}</button>
          </div>
          <textarea value={n.body} rows={7} onChange={e=>setRows(rs=>rs.map(x=>x.id===n.id?{...x,body:e.target.value}:x))} onBlur={()=>patch(n.id,{body:n.body})}/>
          <div className="sticky-foot">
            <small>Updated {new Date(n.updated_at).toLocaleString()}</small>
            <button className="mini-btn" onClick={()=>patch(n.id,{archived:!n.archived})}>{n.archived?"Restore":"Archive"}</button>
          </div>
        </article>):<Empty title="No sticky notes" sub="Add an important note and it will stay here until you archive it."/>}
      </div>
    </>}
  </main>;
}
