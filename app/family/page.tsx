"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";

type Member={id:string;name:string;relation:string|null};
type FamilyTask={id:string;title:string;due_date:string|null;responsible:string|null;status:string;member_id:string|null};
type BabyRecord={id:string;date:string;type:string|null;title:string;value:string|null};

export default function FamilyPage(){
  const[workspaceId,setWorkspaceId]=useState("");const[userId,setUserId]=useState("");
  const[members,setMembers]=useState<Member[]>([]);const[tasks,setTasks]=useState<FamilyTask[]>([]);const[baby,setBaby]=useState<BabyRecord[]>([]);
  const[error,setError]=useState("");const[memberName,setMemberName]=useState("");const[relation,setRelation]=useState("Family");
  const[taskTitle,setTaskTitle]=useState("");const[memberId,setMemberId]=useState("");const[due,setDue]=useState(todayInTZ());
  const[babyTitle,setBabyTitle]=useState("");const[babyType,setBabyType]=useState("Milestone");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);
    const[m,t,b]=await Promise.all([
      sb.from("family_members").select("id,name,relation").eq("workspace_id",ctx.workspaceId).order("created_at"),
      sb.from("family_tasks").select("id,title,due_date,responsible,status,member_id").eq("workspace_id",ctx.workspaceId).order("due_date",{ascending:true,nullsFirst:false}),
      sb.from("baby_records").select("id,date,type,title,value").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).limit(30)
    ]);if(m.error)throw m.error;if(t.error)throw t.error;if(b.error)throw b.error;setMembers((m.data||[]) as Member[]);setTasks((t.data||[]) as FamilyTask[]);setBaby((b.data||[]) as BabyRecord[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load family data");}},[]);
  useEffect(()=>{void load();},[load]);useRealtimeRefresh(["family_members","family_tasks","baby_records"],load,Boolean(workspaceId));

  async function addMember(e:FormEvent){e.preventDefault();if(!workspaceId||!memberName.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("family_members").insert({workspace_id:workspaceId,created_by:userId,name:memberName.trim(),relation});if(x)setError(x.message);else{setMemberName("");await load();}}
  async function addTask(e:FormEvent){e.preventDefault();if(!workspaceId||!taskTitle.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("family_tasks").insert({workspace_id:workspaceId,created_by:userId,title:taskTitle.trim(),member_id:memberId||null,due_date:due||null,responsible:"Me",status:"Pending"});if(x)setError(x.message);else{setTaskTitle("");await load();}}
  async function toggle(t:FamilyTask){const sb=supabaseBrowser();const{error:x}=await sb.from("family_tasks").update({status:t.status==="Completed"?"Pending":"Completed",updated_at:new Date().toISOString()}).eq("id",t.id);if(x)setError(x.message);else await load();}
  async function addBaby(e:FormEvent){e.preventDefault();if(!workspaceId||!babyTitle.trim())return;const sb=supabaseBrowser();const{error:x}=await sb.from("baby_records").insert({workspace_id:workspaceId,created_by:userId,date:todayInTZ(),type:babyType,title:babyTitle.trim()});if(x)setError(x.message);else{setBabyTitle("");await load();}}

  return <main className="pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">FAMILY OS</p><h1 className="text-2xl font-bold">Shared responsibilities</h1>
    {error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!workspaceId?<p className="panel mt-4 p-5 text-sm">Sign in to use Family OS. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Panel title="Family members"><form onSubmit={addMember} className="flex gap-2"><input required value={memberName} onChange={e=>setMemberName(e.target.value)} placeholder="Name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a1524] p-2"/><input value={relation} onChange={e=>setRelation(e.target.value)} placeholder="Relation" className="w-32 rounded-lg border border-white/10 bg-[#0a1524] p-2"/><button className="rounded-lg border border-white/10 px-3">Add</button></form>
        <div className="mt-3 flex flex-wrap gap-2">{members.map(m=><span key={m.id} className="rounded-full border border-white/10 px-3 py-1 text-xs">{m.name} · {m.relation||"Family"}</span>)}</div>
      </Panel>
      <Panel title="Add family task"><form onSubmit={addTask} className="space-y-2"><input required value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Task" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/><div className="grid grid-cols-2 gap-2"><select value={memberId} onChange={e=>setMemberId(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2"><option value="">General family</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/></div><button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">Save task</button></form></Panel>
      <Panel title="Upcoming family tasks"><div className="space-y-2">{tasks.map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-2 text-sm"><div><b className={t.status==="Completed"?"line-through text-slate-500":""}>{t.title}</b><p className="text-xs text-slate-500">{t.due_date||"No date"} · {members.find(m=>m.id===t.member_id)?.name||"Family"}</p></div><button onClick={()=>toggle(t)} className="rounded-lg border border-white/10 px-2 py-1 text-xs">{t.status==="Completed"?"Reopen":"Done"}</button></div>)}</div></Panel>
      <Panel title="Baby dashboard"><form onSubmit={addBaby} className="grid grid-cols-[1fr_130px_auto] gap-2"><input required value={babyTitle} onChange={e=>setBabyTitle(e.target.value)} placeholder="Baby record" className="rounded-lg border border-white/10 bg-[#0a1524] p-2"/><select value={babyType} onChange={e=>setBabyType(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1524] p-2">{["Weight","Doctor Visit","Vaccination","Feeding","Sleep","Milestone","Medicine","Document"].map(x=><option key={x}>{x}</option>)}</select><button className="rounded-lg border border-white/10 px-3">Add</button></form><div className="mt-3 space-y-2">{baby.slice(0,10).map(r=><div key={r.id} className="rounded-lg border border-white/10 p-2 text-sm"><b>{r.title}</b><p className="text-xs text-slate-500">{r.date} · {r.type}</p></div>)}</div></Panel>
    </div>}
  </main>;
}
