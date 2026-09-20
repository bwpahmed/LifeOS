"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { previewLegacyImport } from "@/lib/legacy-import";
import { commitLegacyImport,type LegacyImportResult } from "@/lib/legacy-import-commit";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function csvCell(v:unknown){const s=String(v??"");return `"${s.replace(/"/g,'""')}"`;}

const featureLinks=[
 ["Home","/"],["Today","/today"],["Tasks","/tasks"],["Goals","/goals"],["Projects","/projects"],
 ["Money","/money"],["Waste Guard","/expenses"],["Business","/business"],["Health","/health"],["Health Planner","/health-planner"],["Family","/family"],["Europe","/europe"],
 ["Calendar","/calendar"],["Timeline","/timeline"],["Automations","/automations"],["Reviews","/reviews"],
 ["Journal","/journal"],["Sticky Notes","/sticky-notes"],["Habits","/habits"],["Focus","/focus"],["Time Tracking","/time"],
 ["Priority Matrix","/matrix"],["Waiting For","/waiting"],["Health Vault","/health-vault"],["Hair Recovery","/hair"],
 ["Self-Control","/self-control"],["Progress","/progress"],["AI Coach","/coach"],["Notifications","/notifications"],
 ["Privacy / PIN","/privacy"],["Access","/access"],["Search","/search"],["Quick Add","/quick-add"],["Mobile Tasks & Notes","/mobile"]
];

type GoogleStatus={authenticated:boolean;configured:boolean;connected:boolean;accountEmail?:string|null};
type DndBlock={id:string;label:string;start_time:string;end_time:string;days_of_week:number[];active:boolean};

export default function SettingsPage(){
 const[preview,setPreview]=useState("");const[backup,setBackup]=useState<Record<string,unknown>|null>(null);const[result,setResult]=useState<LegacyImportResult|null>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[msg,setMsg]=useState("");
 const[timezone,setTimezone]=useState("Asia/Dubai");const[currency,setCurrency]=useState("AED");const[dailyFocus,setDailyFocus]=useState(120);const[weeklyFocus,setWeeklyFocus]=useState(600);const[quietStart,setQuietStart]=useState("22:30");const[quietEnd,setQuietEnd]=useState("07:00");const[allowCritical,setAllowCritical]=useState(false);const[userId,setUserId]=useState("");
 const[theme,setTheme]=useState<"dark"|"light">("dark");const[google,setGoogle]=useState<GoogleStatus>({authenticated:false,configured:false,connected:false});const[counts,setCounts]=useState({tasks:0,receivables:0,activity:0,notes:0});const[dnd,setDnd]=useState<DndBlock[]>([]);const[dndLabel,setDndLabel]=useState("Deep Work");const[dndStart,setDndStart]=useState("09:00");const[dndEnd,setDndEnd]=useState("11:00");

 useEffect(()=>{(async()=>{try{
   const saved=(localStorage.getItem("lifeos_theme") as "dark"|"light"|null)||"dark";setTheme(saved);
   const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)return;setUserId(ctx.user.id);
   const[p,n,t,r,a,s,g,d]=await Promise.all([
     sb.from("profiles").select("timezone,currency,daily_focus_target,weekly_focus_target").eq("id",ctx.user.id).maybeSingle(),
     sb.from("notification_preferences").select("quiet_start,quiet_end,allow_critical_in_quiet").eq("user_id",ctx.user.id).maybeSingle(),
     sb.from("tasks").select("id",{count:"exact",head:true}).eq("workspace_id",ctx.workspaceId),
     sb.from("receivables").select("id",{count:"exact",head:true}).eq("workspace_id",ctx.workspaceId),
     sb.from("activity_log").select("id",{count:"exact",head:true}).eq("workspace_id",ctx.workspaceId),
     sb.from("sticky_notes").select("id",{count:"exact",head:true}).eq("workspace_id",ctx.workspaceId),
     fetch("/api/integrations/google-calendar/status",{cache:"no-store"}).then(x=>x.json()).catch(()=>({authenticated:true,configured:false,connected:false})),
     sb.from("notification_dnd_blocks").select("id,label,start_time,end_time,days_of_week,active").eq("user_id",ctx.user.id).order("created_at")
   ]);
   if(p.data){setTimezone(p.data.timezone||"Asia/Dubai");setCurrency(p.data.currency||"AED");setDailyFocus(Number(p.data.daily_focus_target||120));setWeeklyFocus(Number(p.data.weekly_focus_target||600));}
   if(n.data){setQuietStart(n.data.quiet_start||"22:30");setQuietEnd(n.data.quiet_end||"07:00");setAllowCritical(Boolean(n.data.allow_critical_in_quiet));}
   if(d.error)throw d.error;setCounts({tasks:t.count||0,receivables:r.count||0,activity:a.count||0,notes:s.count||0});setGoogle(g as GoogleStatus);setDnd((d.data||[]) as DndBlock[]);
 }catch(e){setError(e instanceof Error?e.message:"Could not load settings");}})();},[]);

 function applyTheme(next:"dark"|"light"){setTheme(next);localStorage.setItem("lifeos_theme",next);document.documentElement.dataset.theme=next;}

 async function saveProfile(){if(!userId)return;setError("");const sb=supabaseBrowser();const[p,n]=await Promise.all([sb.from("profiles").update({timezone,currency,daily_focus_target:dailyFocus,weekly_focus_target:weeklyFocus,updated_at:new Date().toISOString()}).eq("id",userId),sb.from("notification_preferences").upsert({user_id:userId,quiet_start:quietStart,quiet_end:quietEnd,allow_critical_in_quiet:allowCritical},{onConflict:"user_id"})]);if(p.error||n.error)setError(p.error?.message||n.error?.message||"Save failed");else setMsg("Settings saved.");}

 async function onFile(file:File){setError("");setResult(null);try{const data=JSON.parse(await file.text()) as Record<string,unknown>;const p=previewLegacyImport(data);setBackup(data);setPreview(`Tasks: ${p.counts.tasks}, Habits: ${p.counts.habits}, Goals: ${p.counts.goals}, Receivables: ${p.counts.receivables}, Family tasks: ${p.counts.familyTasks}, Health: ${p.counts.healthEntries}, Hair photos: ${p.counts.hairPhotos}\n`+(p.warnings.join("\n")||"No preview warnings."));}catch(e){setBackup(null);setPreview("");setError(e instanceof Error?e.message:"Could not read backup");}}
 async function importNow(){if(!backup||!confirm("Import this backup into your current LifeOS workspace? Existing matching records will be skipped."))return;setLoading(true);setError("");try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)throw new Error("Sign in before importing.");setResult(await commitLegacyImport({sb,data:backup as Record<string,any>,workspaceId:ctx.workspaceId,userId:ctx.user.id}));}catch(e){setError(e instanceof Error?e.message:"Import failed");}finally{setLoading(false);}}

 async function exportJSON(){setLoading(true);setError("");try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)throw new Error("Sign in first.");const tables=["goals","projects","tasks","habits","focus_sessions","health_entries","lab_results","hair_photos","urge_logs","receivables","money_expenses","health_routines","health_routine_logs","water_logs","diet_plan_items","sleep_sessions","time_entries","morning_checkins","family_members","family_tasks","baby_records","migration_countries","migration_documents","calendar_items","journal_entries","daily_reviews","weekly_reviews","monthly_reviews","automation_rules","notifications","sticky_notes"];const out:Record<string,unknown>={exported_at:new Date().toISOString(),workspace_id:ctx.workspaceId};for(const table of tables){const q=await sb.from(table).select("*").eq("workspace_id",ctx.workspaceId);if(q.error)throw new Error(`${table}: ${q.error.message}`);out[table]=q.data||[];}const recIds=((out.receivables||[]) as any[]).map(r=>r.id);if(recIds.length){for(const table of["receivable_payments","receivable_followups"]){const q=await sb.from(table).select("*").in("receivable_id",recIds);if(q.error)throw q.error;out[table]=q.data||[];}}const habitIds=((out.habits||[]) as any[]).map(h=>h.id);if(habitIds.length){const q=await sb.from("habit_logs").select("*").in("habit_id",habitIds);if(q.error)throw q.error;out.habit_logs=q.data||[];}download(`lifeos-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(out,null,2),"application/json");setMsg("JSON backup exported.");}catch(e){setError(e instanceof Error?e.message:"Export failed");}finally{setLoading(false);}}

 async function exportCSV(){setLoading(true);setError("");try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)throw new Error("Sign in first.");const[t,r,e]=await Promise.all([sb.from("tasks").select("name,area,status,importance,deadline,financial_value,waiting_for").eq("workspace_id",ctx.workspaceId),sb.from("receivables").select("name,company,total,due_date,next_followup,status").eq("workspace_id",ctx.workspaceId),sb.from("money_expenses").select("date,amount,category,merchant,is_waste,waste_reason,avoid_next_time").eq("workspace_id",ctx.workspaceId)]);if(t.error)throw t.error;if(r.error)throw r.error;if(e.error)throw e.error;let csv="TYPE,NAME,AREA_COMPANY,STATUS,DATE,VALUE,WAITING_NEXT\n";for(const x of t.data||[])csv+=["Task",x.name,x.area,x.status,x.deadline,x.financial_value,x.waiting_for].map(csvCell).join(",")+"\n";for(const x of r.data||[])csv+=["Receivable",x.name,x.company,x.status,x.due_date,x.total,x.next_followup].map(csvCell).join(",")+"\n";for(const x of e.data||[])csv+=["Expense",x.merchant||x.category,x.category,x.is_waste?"Waste":"Useful",x.date,x.amount,x.avoid_next_time||x.waste_reason].map(csvCell).join(",")+"\n";download(`lifeos-export-${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv");setMsg("CSV export created.");}catch(e){setError(e instanceof Error?e.message:"CSV export failed");}finally{setLoading(false);}}

 async function addDnd(){if(!userId||!dndLabel.trim())return;setError("");const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx)return;const q=await sb.from("notification_dnd_blocks").insert({workspace_id:ctx.workspaceId,user_id:userId,label:dndLabel.trim(),start_time:dndStart,end_time:dndEnd,days_of_week:[1,2,3,4,5,6,7],active:true});if(q.error)setError(q.error.message);else{const r=await sb.from("notification_dnd_blocks").select("id,label,start_time,end_time,days_of_week,active").eq("user_id",userId).order("created_at");setDnd((r.data||[]) as DndBlock[]);}}
 async function toggleDnd(b:DndBlock){const sb=supabaseBrowser();const q=await sb.from("notification_dnd_blocks").update({active:!b.active,updated_at:new Date().toISOString()}).eq("id",b.id);if(q.error)setError(q.error.message);else setDnd(v=>v.map(x=>x.id===b.id?{...x,active:!x.active}:x));}
 async function removeDnd(id:string){if(!confirm("Delete this Do Not Disturb block?"))return;const sb=supabaseBrowser();const q=await sb.from("notification_dnd_blocks").delete().eq("id",id);if(q.error)setError(q.error.message);else setDnd(v=>v.filter(x=>x.id!==id));}
 async function signOut(){await supabaseBrowser().auth.signOut();location.href="/login";}

 const inserted=result?Object.values(result.inserted).reduce((a,b)=>a+b,0):0;const skipped=result?Object.values(result.skipped).reduce((a,b)=>a+b,0):0;

 return <main className="page-root">
  <div className="section-heading"><div><span className="label">SETTINGS & BACKUP</span><h2>Control the system</h2></div><button onClick={signOut} className="ghost-btn">Sign out</button></div>
  {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
  {msg&&<p className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{msg}</p>}

  <div className="settings-grid">
   <section className="panel settings-section"><h3>Appearance</h3><p className="small-copy">LifeOS now supports both dark and light mode.</p><div className="section-actions mt"><button onClick={()=>applyTheme("dark")} className={theme==="dark"?"primary-btn":"ghost-btn"}>Dark</button><button onClick={()=>applyTheme("light")} className={theme==="light"?"primary-btn":"ghost-btn"}>Light</button></div></section>

   <section id="google-calendar" className="panel settings-section"><h3>Google Calendar</h3><p className="small-copy">{google.connected?`Connected: ${google.accountEmail||"Google account"}`:google.configured?"OAuth is configured. Connect your Gmail calendar.":"Calendar sync code is installed. Google OAuth server credentials still need to be added in Vercel."}</p><div className="section-actions mt">{google.connected?<><Link href="/calendar" className="primary-btn">Open synced calendar</Link><Link href="/api/integrations/google-calendar/connect?next=/calendar" className="ghost-btn">Reconnect</Link></>:google.configured?<Link href="/api/integrations/google-calendar/connect?next=/calendar" className="primary-btn">Connect Google Calendar</Link>:<span className="pill amber">Configuration required</span>}</div></section>

   <section className="panel settings-section"><h3>Focus & notifications</h3><div className="settings-row"><span>Timezone</span><input value={timezone} onChange={e=>setTimezone(e.target.value)}/></div><div className="settings-row"><span>Currency</span><input value={currency} onChange={e=>setCurrency(e.target.value)}/></div><div className="settings-row"><span>Daily deep work target</span><input type="number" min="15" value={dailyFocus} onChange={e=>setDailyFocus(Number(e.target.value)||15)}/></div><div className="settings-row"><span>Weekly focus target</span><input type="number" min="60" value={weeklyFocus} onChange={e=>setWeeklyFocus(Number(e.target.value)||60)}/></div><div className="settings-row"><span>Quiet hours start</span><input type="time" value={quietStart} onChange={e=>setQuietStart(e.target.value)}/></div><div className="settings-row"><span>Quiet hours end</span><input type="time" value={quietEnd} onChange={e=>setQuietEnd(e.target.value)}/></div><label className="settings-row"><span>Critical alerts in quiet hours</span><input type="checkbox" checked={allowCritical} onChange={e=>setAllowCritical(e.target.checked)}/></label><button onClick={saveProfile} className="primary-btn mt">Save settings</button></section><section className="panel settings-section"><h3>Do Not Disturb intelligence</h3><p className="small-copy">Use blocks for sleep, family time or deep work. Critical alerts can still pass only when you allow them above.</p><div className="grid grid-cols-3 gap-2 mt"><input value={dndLabel} onChange={e=>setDndLabel(e.target.value)} placeholder="Label"/><input type="time" value={dndStart} onChange={e=>setDndStart(e.target.value)}/><input type="time" value={dndEnd} onChange={e=>setDndEnd(e.target.value)}/></div><button type="button" onClick={addDnd} className="primary-btn mt">Add DND block</button><div className="list-stack mt">{dnd.map(b=><div key={b.id} className="priority-item"><span className="priority-number">☾</span><div><strong>{b.label}</strong><small>{b.start_time} → {b.end_time} · {b.active?"Active":"Paused"}</small></div><div className="flex gap-1"><button onClick={()=>toggleDnd(b)} className="mini-btn">{b.active?"Pause":"Enable"}</button><button onClick={()=>removeDnd(b.id)} className="mini-btn text-red-300">Delete</button></div></div>)}</div></section>

   <section className="panel settings-section"><h3>Privacy & important notes</h3><p className="small-copy">PIN/device privacy lives in Privacy. Sticky Notes are cloud-synced and intentionally have no permanent delete permission.</p><div className="section-actions mt"><Link href="/privacy" className="ghost-btn">Privacy / PIN</Link><Link href="/sticky-notes" className="primary-btn">Sticky Notes</Link><Link href="/notifications" className="ghost-btn">Push alerts</Link></div></section>

   <section className="panel settings-section"><h3>Backup & portability</h3><p className="small-copy">Export your cloud data as JSON or CSV. Sticky notes are included in JSON backup.</p><div className="section-actions"><button onClick={exportJSON} disabled={loading} className="ghost-btn">Export JSON</button><button onClick={exportCSV} disabled={loading} className="ghost-btn">Export CSV</button><button onClick={()=>document.getElementById("legacy-import")?.scrollIntoView({behavior:"smooth"})} className="ghost-btn">Import JSON</button></div></section>

   <section className="panel settings-section"><h3>Maintenance</h3><div className="settings-row"><span>Tasks</span><b>{counts.tasks}</b></div><div className="settings-row"><span>Receivables</span><b>{counts.receivables}</b></div><div className="settings-row"><span>Sticky notes</span><b>{counts.notes}</b></div><div className="settings-row"><span>Activity log</span><b>{counts.activity}</b></div><div className="section-actions mt"><Link href="/timeline" className="ghost-btn">View activity</Link><Link href="/progress" className="ghost-btn">Progress</Link></div></section>
  </div>

  <section className="panel mt"><div className="panel-head"><div><span className="label">ALL LIFEOS OPTIONS</span><h3>Feature directory</h3></div><span className="pill blue">{featureLinks.length} modules</span></div><div className="feature-directory">{featureLinks.map(([name,href])=><Link key={href} href={href} className="feature-link">{name}<span>→</span></Link>)}</div></section>

  <section id="legacy-import" className="panel mt"><div className="panel-head"><div><span className="label">RESTORE</span><h3>Import old standalone backup</h3></div></div><input type="file" accept="application/json,.json" onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/><pre className="mt whitespace-pre-wrap text-xs text-slate-300">{preview||"Choose a lifeos-backup-*.json file to preview."}</pre>{backup&&<button onClick={importNow} disabled={loading} className="primary-btn mt">{loading?"Working…":"Confirm cloud import"}</button>}</section>

  {result&&<section className="panel mt"><h3>Import complete</h3><p className="small-copy">{inserted} records inserted · {skipped} matching records skipped.</p>{result.warnings.length>0&&<div className="mt rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">{result.warnings.map(w=><div key={w}>{w}</div>)}</div>}</section>}
 </main>;
}
