"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace,peekWorkspaceContext } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

type Item={id:string;date:string;title:string;kind:string;editable?:boolean;sourceId?:string;url?:string|null;calendarName?:string};
type GoogleStatus={authenticated:boolean;configured:boolean;connected:boolean;mode?:"oauth"|"bridge"|null;accountEmail?:string|null;updatedAt?:string|null;error?:string};
type View="day"|"week"|"month"|"timeline";

function addDays(iso:string,n:number){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function isoStart(iso:string){return new Date(iso+"T00:00:00").toISOString();}
function isoEnd(iso:string){return new Date(iso+"T23:59:59").toISOString();}
function monthStart(iso:string){return iso.slice(0,7)+"-01";}
function weekStart(iso:string){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10);}
function shiftMonth(iso:string,n:number){const d=new Date(iso+"T12:00:00");d.setMonth(d.getMonth()+n,1);return d.toISOString().slice(0,10);}
function monthCells(first:string){
  const d=new Date(first+"T12:00:00");
  const mondayIndex=(d.getDay()+6)%7;
  const start=new Date(d);start.setDate(d.getDate()-mondayIndex);
  return Array.from({length:42},(_,i)=>{const x=new Date(start);x.setDate(start.getDate()+i);return x.toISOString().slice(0,10);});
}
function kindClass(kind:string){return kind==="Money"?"money":kind==="Family"?"family":kind==="Google"?"google":"";}
function dateInDubai(value:string){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export default function CalendarPage(){
  const cachedWorkspace=peekWorkspaceContext();const[workspaceId,setWorkspaceId]=useState(cachedWorkspace?.workspaceId||"");
  const[items,setItems]=useState<Item[]>([]);
  const[googleItems,setGoogleItems]=useState<Item[]>([]);
  const[mirrorItems,setMirrorItems]=useState<Item[]>([]);
  const[google,setGoogle]=useState<GoogleStatus>({authenticated:false,configured:false,connected:false});
  const[error,setError]=useState("");
  const[range,setRange]=useState<"7"|"30"|"90">("30");
  const[view,setView]=useState<View>("month");
  const[cursor,setCursor]=useState(()=>monthStart(todayInTZ()));
  const[selectedDate,setSelectedDate]=useState(todayInTZ());
  const[loadingGoogle,setLoadingGoogle]=useState(false);

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setWorkspaceId("");return;}
      setWorkspaceId(ctx.workspaceId);
      const from=addDays(todayInTZ(),-120),to=addDays(todayInTZ(),400);
      const[t,r,f,m,c]=await Promise.all([
        sb.from("tasks").select("id,name,deadline,status").eq("workspace_id",ctx.workspaceId).gte("deadline",from).lte("deadline",to).not("status","in",'("Completed","Cancelled")'),
        sb.from("receivables").select("id,name,next_followup,status").eq("workspace_id",ctx.workspaceId).gte("next_followup",from).lte("next_followup",to).neq("status","Paid"),
        sb.from("family_tasks").select("id,title,due_date,status").eq("workspace_id",ctx.workspaceId).gte("due_date",from).lte("due_date",to).neq("status","Completed"),
        sb.from("migration_documents").select("id,name,expiry_date,status").eq("workspace_id",ctx.workspaceId).gte("expiry_date",from).lte("expiry_date",to),
        sb.from("calendar_items")
          .select("id,title,starts_at,ends_at,external_account,external_calendar_name,external_url,external_updated_at")
          .eq("workspace_id",ctx.workspaceId)
          .eq("external_provider","google_calendar")
          .gte("starts_at",from+"T00:00:00+04:00")
          .lte("starts_at",to+"T23:59:59+04:00")
          .order("starts_at")
      ]);
      for(const q of[t,r,f,m,c])if(q.error)throw q.error;
      setMirrorItems((c.data||[]).map((x:any)=>({
        id:`google-mirror-${x.id}`,date:dateInDubai(x.starts_at),title:x.title||"(No title)",kind:"Google",
        url:x.external_url||null,calendarName:x.external_calendar_name||"Google Calendar"
      })));
      setItems([
        ...(t.data||[]).map((x:any)=>({id:`task-${x.id}`,date:x.deadline,title:x.name,kind:"Task",editable:true,sourceId:x.id})),
        ...(r.data||[]).map((x:any)=>({id:`money-${x.id}`,date:x.next_followup,title:`Follow up: ${x.name}`,kind:"Money"})),
        ...(f.data||[]).map((x:any)=>({id:`family-${x.id}`,date:x.due_date,title:x.title,kind:"Family"})),
        ...(m.data||[]).map((x:any)=>({id:`doc-${x.id}`,date:x.expiry_date,title:`Document: ${x.name}`,kind:"Europe"}))
      ].filter((x:any)=>x.date).sort((a:any,b:any)=>a.date.localeCompare(b.date)));
    }catch(e){setError(e instanceof Error?e.message:"Could not load calendar");}
  },[]);

  const loadGoogle=useCallback(async()=>{
    setLoadingGoogle(true);
    try{
      const statusRes=await fetch("/api/integrations/google-calendar/status",{cache:"no-store"});
      const status=await statusRes.json() as GoogleStatus;
      setGoogle(status);
      if(!status.connected||status.mode!=="oauth"){setGoogleItems([]);return;}
      const from=addDays(todayInTZ(),-120),to=addDays(todayInTZ(),400);
      const res=await fetch(`/api/integrations/google-calendar/events?from=${encodeURIComponent(isoStart(from))}&to=${encodeURIComponent(isoEnd(to))}`,{cache:"no-store"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Google Calendar sync failed");
      setGoogleItems((data.events||[]).map((x:any)=>({
        id:x.id,date:dateInDubai(String(x.start)),title:x.title,kind:"Google",
        url:x.url||null,calendarName:x.calendarName||"Google Calendar"
      })));
    }catch(e){setError(e instanceof Error?e.message:"Google Calendar sync failed");}
    finally{setLoadingGoogle(false);}
  },[]);

  useEffect(()=>{void load();void loadGoogle();},[load,loadGoogle]);
  useRealtimeRefresh(["calendar_items","tasks","receivables","family_tasks","migration_documents"],load,Boolean(workspaceId));

  const displayedGoogleItems=google.mode==="oauth"?googleItems:mirrorItems;
  const allItems=useMemo(()=>[...items,...displayedGoogleItems].sort((a,b)=>a.date.localeCompare(b.date)),[items,displayedGoogleItems]);
  const visible=useMemo(()=>{const end=addDays(todayInTZ(),Number(range));return allItems.filter(x=>x.date>=todayInTZ()&&x.date<=end);},[allItems,range]);
  const grouped=useMemo(()=>visible.reduce<Record<string,Item[]>>((a,x)=>{(a[x.date]??=[]).push(x);return a;},{}),[visible]);
  const cells=useMemo(()=>monthCells(cursor),[cursor]);
  const cellMap=useMemo(()=>allItems.reduce<Record<string,Item[]>>((a,x)=>{(a[x.date]??=[]).push(x);return a;},{}),[allItems]);
  const monthLabel=new Date(cursor+"T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const cursorMonth=cursor.slice(0,7);

  async function reschedule(i:Item,date:string){if(!i.sourceId)return;await rescheduleTask(i.sourceId,date);}
  async function rescheduleTask(id:string,date:string){const sb=supabaseBrowser();const{error:q}=await sb.from("tasks").update({deadline:date,status:"Planned",updated_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}
  function dragStart(e:React.DragEvent,item:Item){if(item.editable&&item.sourceId)e.dataTransfer.setData("text/lifeos-task-id",item.sourceId);}
  function dropOn(e:React.DragEvent,date:string){e.preventDefault();const id=e.dataTransfer.getData("text/lifeos-task-id");if(id)void rescheduleTask(id,date);}

  return <main className="page-root">
    <BackHome/>
    <div className="section-heading">
      <div><span className="label">CALENDAR</span><h2>One timeline for obligations</h2></div>
      <div className="section-actions">
        <button onClick={()=>setView("day")} className={view==="day"?"primary-btn":"ghost-btn"}>Day</button>
        <button onClick={()=>setView("week")} className={view==="week"?"primary-btn":"ghost-btn"}>Week</button>
        <button onClick={()=>setView("month")} className={view==="month"?"primary-btn":"ghost-btn"}>Month</button>
        <button onClick={()=>setView("timeline")} className={view==="timeline"?"primary-btn":"ghost-btn"}>Timeline</button>
        {google.mode==="oauth"?<button onClick={()=>loadGoogle()} className="ghost-btn">{loadingGoogle?"Syncing…":"Sync Google"}</button>:
          google.mode==="bridge"?<span className="pill blue">Google bridge synced</span>:
          google.configured?<Link href="/api/integrations/google-calendar/connect?next=/calendar" className="primary-btn">Connect Google Calendar</Link>:
          <Link href="/settings#google-calendar" className="ghost-btn">Google setup</Link>}
      </div>
    </div>

    <div className="grid g3">
      <article className="metric-card accent-blue"><span>Google Calendar</span><strong>{google.connected?"Connected":"Not connected"}</strong><small>{google.accountEmail||"Primary Gmail calendar"}{google.mode==="bridge"?" · secure bridge":google.mode==="oauth"?" · direct OAuth":""}</small></article>
      <article className="metric-card accent-green"><span>LifeOS items</span><strong>{items.length}</strong><small>Tasks, money, family and documents</small></article>
      <article className="metric-card accent-amber"><span>Google events</span><strong>{displayedGoogleItems.length}</strong><small>{google.updatedAt?`Last sync ${new Date(google.updatedAt).toLocaleString()}`:"Owned calendars in sync window"}</small></article>
    </div>

    {!google.configured&&!google.connected&&<div className="panel mt">
      <span className="label">GOOGLE OAUTH</span><h3 style={{margin:"6px 0"}}>Calendar code is ready, server credentials are not configured yet</h3>
      <p className="small-copy">Add GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET and GOOGLE_CALENDAR_TOKEN_KEY in Vercel. Then connect your Gmail calendar here.</p>
    </div>}

    {error&&<p className="mt text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:
    view==="day"?<section className="panel mt"><div className="calendar-toolbar"><div className="section-actions"><button onClick={()=>setSelectedDate(addDays(selectedDate,-1))} className="ghost-btn">←</button><button onClick={()=>setSelectedDate(todayInTZ())} className="ghost-btn">Today</button><button onClick={()=>setSelectedDate(addDays(selectedDate,1))} className="ghost-btn">→</button></div><div className="calendar-title">{selectedDate}</div></div><div onDragOver={e=>e.preventDefault()} onDrop={e=>dropOn(e,selectedDate)} className="cal-day today" style={{minHeight:320}}><div className="cal-items">{(cellMap[selectedDate]||[]).map(i=>i.url?<a key={i.id} href={i.url} target="_blank" rel="noreferrer" className={`cal-item ${kindClass(i.kind)}`}>{i.title}</a>:<div key={i.id} draggable={Boolean(i.editable)} onDragStart={e=>dragStart(e,i)} className={`cal-item ${kindClass(i.kind)}`}>{i.title}{i.editable&&<input type="date" value={i.date} onChange={e=>reschedule(i,e.target.value)} style={{marginLeft:8,width:"auto"}}/>}</div>)}</div></div></section>:view==="week"?<section className="panel mt"><div className="calendar-toolbar"><div className="section-actions"><button onClick={()=>setSelectedDate(addDays(selectedDate,-7))} className="ghost-btn">← Week</button><button onClick={()=>setSelectedDate(todayInTZ())} className="ghost-btn">This week</button><button onClick={()=>setSelectedDate(addDays(selectedDate,7))} className="ghost-btn">Week →</button></div><div className="calendar-title">{weekStart(selectedDate)} → {addDays(weekStart(selectedDate),6)}</div></div><div className="calendar-week-grid">{Array.from({length:7},(_,idx)=>addDays(weekStart(selectedDate),idx)).map(date=><div key={date} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOn(e,date)} className={`cal-day ${date===todayInTZ()?"today":""}`}><b className="cal-date">{new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",day:"numeric"})}</b><div className="cal-items">{(cellMap[date]||[]).map(i=>i.url?<a key={i.id} href={i.url} target="_blank" rel="noreferrer" className={`cal-item ${kindClass(i.kind)}`}>{i.title}</a>:<span key={i.id} draggable={Boolean(i.editable)} onDragStart={e=>dragStart(e,i)} className={`cal-item ${kindClass(i.kind)}`}>{i.title}</span>)}</div></div>)}</div></section>:view==="month"?<section className="panel mt"><div className="calendar-toolbar"><div className="section-actions"><button onClick={()=>setCursor(shiftMonth(cursor,-1))} className="ghost-btn">← Prev</button><button onClick={()=>setCursor(monthStart(todayInTZ()))} className="ghost-btn">Today</button><button onClick={()=>setCursor(shiftMonth(cursor,1))} className="ghost-btn">Next →</button></div><div className="calendar-title">{monthLabel}</div></div><div className="calendar-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className="cal-head">{d}</div>)}{cells.map(date=>{const rows=cellMap[date]||[];const muted=date.slice(0,7)!==cursorMonth;return <div key={date} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOn(e,date)} className={`cal-day ${muted?"muted-day":""} ${date===todayInTZ()?"today":""}`}><span className="cal-date">{Number(date.slice(-2))}</span><div className="cal-items">{rows.slice(0,4).map(i=>i.url?<a key={i.id} href={i.url} target="_blank" rel="noreferrer" title={i.title} className={`cal-item ${kindClass(i.kind)}`}>{i.title}</a>:<span key={i.id} draggable={Boolean(i.editable)} onDragStart={e=>dragStart(e,i)} title={i.title+(i.editable?" · drag to reschedule":"")} className={`cal-item ${kindClass(i.kind)}`}>{i.title}</span>)}{rows.length>4&&<span className="cal-item">+{rows.length-4} more</span>}</div></div>})}</div></section>:<section className="mt"><div className="calendar-toolbar"><div className="calendar-title">Timeline</div><select value={range} onChange={e=>setRange(e.target.value as any)} className="ghost-btn"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></div><div className="list-stack">{Object.entries(grouped).map(([date,rows])=><Panel key={date} title={date} kicker={date===todayInTZ()?"TODAY":new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"})}><div className="list-stack">{rows.map(i=><div key={i.id} className="priority-item"><span className="priority-number">{i.kind==="Google"?"G":i.kind.slice(0,1)}</span><div><strong>{i.title}</strong><small>{i.kind}{i.calendarName?" · "+i.calendarName:""}</small></div>{i.editable?<input type="date" value={i.date} onChange={e=>reschedule(i,e.target.value)} className="mini-btn"/>:i.url?<a href={i.url} target="_blank" rel="noreferrer" className="mini-btn">Open</a>:<span/>}</div>)}</div></Panel>)}{visible.length===0&&<div className="empty-state"><b>Nothing scheduled</b>No LifeOS or Google items in this window.</div>}</div></section>}
  </main>;
}
