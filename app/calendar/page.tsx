"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { todayInTZ } from "@/lib/timezone";

type Item={id:string;date:string;title:string;kind:string;editable?:boolean;sourceId?:string;url?:string|null;calendarName?:string};
type GoogleStatus={authenticated:boolean;configured:boolean;connected:boolean;accountEmail?:string|null;error?:string};

function addDays(iso:string,n:number){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function isoStart(iso:string){return new Date(iso+"T00:00:00").toISOString();}
function isoEnd(iso:string){return new Date(iso+"T23:59:59").toISOString();}

export default function CalendarPage(){
  const[workspaceId,setWorkspaceId]=useState("");
  const[items,setItems]=useState<Item[]>([]);
  const[googleItems,setGoogleItems]=useState<Item[]>([]);
  const[google,setGoogle]=useState<GoogleStatus>({authenticated:false,configured:false,connected:false});
  const[error,setError]=useState("");
  const[range,setRange]=useState<"7"|"30"|"90">("30");
  const[loadingGoogle,setLoadingGoogle]=useState(false);

  const load=useCallback(async()=>{
    try{
      const sb=supabaseBrowser();
      const ctx=await currentWorkspace(sb);
      if(!ctx){setWorkspaceId("");return;}
      setWorkspaceId(ctx.workspaceId);
      const from=addDays(todayInTZ(),-7),to=addDays(todayInTZ(),120);
      const[t,r,f,m]=await Promise.all([
        sb.from("tasks").select("id,name,deadline,status").eq("workspace_id",ctx.workspaceId).gte("deadline",from).lte("deadline",to).not("status","in",'("Completed","Cancelled")'),
        sb.from("receivables").select("id,name,next_followup,status").eq("workspace_id",ctx.workspaceId).gte("next_followup",from).lte("next_followup",to).neq("status","Paid"),
        sb.from("family_tasks").select("id,title,due_date,status").eq("workspace_id",ctx.workspaceId).gte("due_date",from).lte("due_date",to).neq("status","Completed"),
        sb.from("migration_documents").select("id,name,expiry_date,status").eq("workspace_id",ctx.workspaceId).gte("expiry_date",from).lte("expiry_date",to)
      ]);
      for(const q of[t,r,f,m])if(q.error)throw q.error;
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
      if(!status.connected){setGoogleItems([]);return;}
      const from=todayInTZ(),to=addDays(from,120);
      const res=await fetch(`/api/integrations/google-calendar/events?from=${encodeURIComponent(isoStart(from))}&to=${encodeURIComponent(isoEnd(to))}`,{cache:"no-store"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Google Calendar sync failed");
      setGoogleItems((data.events||[]).map((x:any)=>({
        id:x.id,date:String(x.start).slice(0,10),title:x.title,kind:"Google",
        url:x.url||null,calendarName:x.calendarName||"Google Calendar"
      })));
    }catch(e){setError(e instanceof Error?e.message:"Google Calendar sync failed");}
    finally{setLoadingGoogle(false);}
  },[]);

  useEffect(()=>{void load();void loadGoogle();},[load,loadGoogle]);

  const allItems=useMemo(()=>[...items,...googleItems].sort((a,b)=>a.date.localeCompare(b.date)),[items,googleItems]);
  const visible=useMemo(()=>{const end=addDays(todayInTZ(),Number(range));return allItems.filter(x=>x.date>=todayInTZ()&&x.date<=end);},[allItems,range]);
  const grouped=useMemo(()=>visible.reduce<Record<string,Item[]>>((a,x)=>{(a[x.date]??=[]).push(x);return a;},{}),[visible]);

  async function reschedule(i:Item,date:string){
    if(!i.sourceId)return;
    const sb=supabaseBrowser();
    const{error:q}=await sb.from("tasks").update({deadline:date,updated_at:new Date().toISOString()}).eq("id",i.sourceId);
    if(q)setError(q.message);else await load();
  }

  return <main className="page-root">
    <BackHome/>
    <div className="section-heading">
      <div><span className="label">CALENDAR</span><h2>One timeline for obligations</h2></div>
      <div className="section-actions">
        <select value={range} onChange={e=>setRange(e.target.value as any)} className="ghost-btn">
          <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
        </select>
        {google.configured&&google.connected?<button onClick={()=>loadGoogle()} className="ghost-btn">{loadingGoogle?"Syncing…":"Sync Google"}</button>:
          google.configured?<Link href="/api/integrations/google-calendar/connect?next=/calendar" className="primary-btn">Connect Google Calendar</Link>:
          <Link href="/settings#google-calendar" className="ghost-btn">Configure Google Calendar</Link>}
      </div>
    </div>

    <div className="grid g3">
      <article className="metric-card accent-blue"><span>Google Calendar</span><strong>{google.connected?"Connected":"Not connected"}</strong><small>{google.accountEmail||"Primary Gmail calendar"}</small></article>
      <article className="metric-card accent-green"><span>LifeOS items</span><strong>{items.length}</strong><small>Tasks, money, family and documents</small></article>
      <article className="metric-card accent-amber"><span>Google events</span><strong>{googleItems.length}</strong><small>Owned calendars in current sync window</small></article>
    </div>

    {!google.configured&&<div className="panel mt">
      <span className="label">GOOGLE OAUTH</span><h3 style={{margin:"6px 0"}}>Calendar code is ready, server credentials are not configured yet</h3>
      <p className="small-copy">Add GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET and GOOGLE_CALENDAR_TOKEN_KEY in Vercel. Then use Connect Google Calendar here.</p>
    </div>}

    {error&&<p className="mt text-sm text-red-300">{error}</p>}
    {!workspaceId?<p className="panel mt">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:
      <div className="mt list-stack">
        {Object.entries(grouped).map(([date,rows])=><Panel key={date} title={date} kicker={date===todayInTZ()?"TODAY":new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"})}>
          <div className="list-stack">{rows.map(i=><div key={i.id} className="priority-item">
            <span className="priority-number">{i.kind==="Google"?"G":i.kind.slice(0,1)}</span>
            <div><strong>{i.title}</strong><small>{i.kind}{i.calendarName?" · "+i.calendarName:""}</small></div>
            {i.editable?<input type="date" value={i.date} onChange={e=>reschedule(i,e.target.value)} className="mini-btn"/>:
              i.url?<a href={i.url} target="_blank" rel="noreferrer" className="mini-btn">Open</a>:<span/>}
          </div>)}</div>
        </Panel>)}
        {visible.length===0&&<div className="empty-state"><b>Nothing scheduled</b>No LifeOS or Google items in this window.</div>}
      </div>}
  </main>;
}
