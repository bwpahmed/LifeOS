"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

type NotificationRow={id:string;title:string;body:string;severity:string;ref_table:string|null;ref_id:string|null;read_at:string|null;snoozed_until:string|null;created_at:string};

function severityPill(severity:string){
  const s=String(severity||"normal").toLowerCase();
  return s==="critical"?"pill red":s==="urgent"?"pill amber":s==="important"?"pill blue":"pill";
}

function decodeKey(input:string){
  const s=input.replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(s+"=".repeat((4-s.length%4)%4));
  return Uint8Array.from(Array.from(raw).map(c=>c.charCodeAt(0)));
}

export default function NotificationsPage(){
  const[rows,setRows]=useState<NotificationRow[]>([]);const[error,setError]=useState("");const[msg,setMsg]=useState("");const[supported,setSupported]=useState(false);const[subscribed,setSubscribed]=useState(false);const[signedIn,setSignedIn]=useState<boolean|null>(null);
  const[ios,setIos]=useState(false);const[standalone,setStandalone]=useState(false);
  const[pushKey,setPushKey]=useState("");const[pushRegistration,setPushRegistration]=useState<ServiceWorkerRegistration|null>(null);
  const[pushInitError,setPushInitError]=useState("");

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const{data,error:q}=await sb.from("notifications").select("id,title,body,severity,ref_table,ref_id,read_at,snoozed_until,created_at").eq("user_id",ctx.user.id).order("created_at",{ascending:false}).limit(100);if(q)throw q;setRows((data||[]) as NotificationRow[]);}catch(e){setError(e instanceof Error?e.message:"Could not load notifications");}},[]);
  useRealtimeRefresh(["notifications"],load,signedIn===true);
  useEffect(()=>{
    void load();
    const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    const isStandalone=window.matchMedia("(display-mode: standalone)").matches||(navigator as Navigator & {standalone?:boolean}).standalone===true;
    setIos(appleMobile);setStandalone(isStandalone);
    const ok="serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
    setSupported(ok);
    if(!ok)return;
    let cancelled=false;
    const controller=new AbortController();
    const setup=async()=>{
      try{
        const response=await fetch("/api/push/vapid-public",{signal:controller.signal});
        const data=await response.json() as {publicKey?:string};
        if(!response.ok||!data.publicKey)throw new Error("Push keys are not configured.");
        const registration=await navigator.serviceWorker.ready;
        if(cancelled)return;
        const existing=await registration.pushManager.getSubscription();
        if(cancelled)return;
        setPushKey(data.publicKey);setPushRegistration(registration);setSubscribed(Boolean(existing));
        setPushInitError("");
      }catch(e){
        if(!cancelled)setPushInitError(e instanceof Error?e.message:"Push setup could not initialize.");
      }
    };
    void setup();
    return()=>{cancelled=true;controller.abort();};
  },[load]);

  async function enablePush(){setError("");setMsg("");try{
    if(!supported)throw new Error("Push notifications are not supported on this browser.");
    if(ios&&!standalone)throw new Error("On iPhone, open LifeOS from its Home Screen icon before enabling notifications.");
    if(!pushRegistration||!pushKey)throw new Error("Push is still initializing. Try again after the setup completes.");
    if(Notification.permission==="denied")throw new Error("Notifications are blocked. Change LifeOS notification permission in your device/browser Settings.");
    // The VAPID key and service worker are loaded before the tap. No fetch is
    // performed between the user gesture, permission request, and subscribe.
    const permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Notification permission was not granted.");
    let sub=await pushRegistration.pushManager.getSubscription();
    if(!sub)sub=await pushRegistration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(pushKey)});
    const json=sub.toJSON();
    const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,keys:json.keys})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save subscription");
    setSubscribed(true);setMsg("Background push enabled on this device.");
  }catch(e){setError(e instanceof Error?e.message:"Push setup failed");}}
  async function disablePush(){try{if(!pushRegistration)throw new Error("Push setup not ready.");const sub=await pushRegistration.pushManager.getSubscription();if(sub){await fetch("/api/push/subscribe",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}setSubscribed(false);setMsg("Push disabled on this device.");}catch(e){setError(e instanceof Error?e.message:"Could not disable push");}}
  async function markRead(id:string){const sb=supabaseBrowser();const{error:q}=await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}
  async function snoozeUntil(id:string,until:Date){const sb=supabaseBrowser();const{error:q}=await sb.from("notifications").update({snoozed_until:until.toISOString(),push_sent_at:null,push_attempted_at:null,push_attempts:0,push_error:null}).eq("id",id);if(q)setError(q.message);else await load();}
  function snoozeMinutes(id:string,minutes:number){void snoozeUntil(id,new Date(Date.now()+minutes*60000));}
  function snoozeTonight(id:string){const d=new Date();d.setHours(19,0,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);void snoozeUntil(id,d);}
  function snoozeTomorrow(id:string){const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);void snoozeUntil(id,d);}
  async function doneAction(n:NotificationRow){
   const sb=supabaseBrowser();
   if(n.ref_table==="tasks"&&n.ref_id){
    const q=await sb.from("tasks").update({status:"Completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",n.ref_id);
    if(q.error){setError(q.error.message);return;}
   }
   // Never forge a completed health dose at the current hour.
   // Confirm exact scheduled slots on the private Home medicine card.
   await markRead(n.id);
  }
  async function reschedule(n:NotificationRow){if(n.ref_table!=="tasks"||!n.ref_id)return;const date=prompt("New task date (YYYY-MM-DD):");if(!date)return;const sb=supabaseBrowser();const q=await sb.from("tasks").update({deadline:date,status:"Planned",updated_at:new Date().toISOString()}).eq("id",n.ref_id);if(q.error){setError(q.error.message);return;}await markRead(n.id);}
  async function delegate(n:NotificationRow){if(n.ref_table!=="tasks"||!n.ref_id)return;const person=prompt("Waiting for / delegate to:");if(!person?.trim())return;const sb=supabaseBrowser();const q=await sb.from("tasks").update({responsible:person.trim(),status:"Planned",updated_at:new Date().toISOString()}).eq("id",n.ref_id);if(q.error){setError(q.error.message);return;}await markRead(n.id);}

  return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">NOTIFICATIONS</p><h1 className="text-2xl font-bold">Reminder inbox</h1>{error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{msg&&<p className="mt-3 text-sm text-emerald-300">{msg}</p>}
  {signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4"><Panel title="Background push" kicker={supported?"SUPPORTED":"NOT SUPPORTED"}>
    <p className="text-sm text-slate-400">Push permission is requested only when you press the button. Sensitive health/self-control reminders use generic lock-screen text.</p>
    {ios&&!standalone&&<p className="mt-2 rounded-lg border border-sky-300/20 bg-sky-300/5 p-3 text-sm text-slate-300" role="status">
      On iPhone (iOS 16.4+): open LifeOS in Safari, tap Share, select Add to Home Screen,
      then launch the installed LifeOS icon. Return here to enable notifications.
    </p>}
    {!supported&&!ios&&<p className="mt-2 text-sm text-slate-400">Use a browser that supports Web Push and allow notifications for this website.</p>}
    {pushInitError&&<p role="alert" className="mt-2 text-sm text-red-300">{pushInitError}</p>}
    <button onClick={subscribed?disablePush:enablePush} disabled={signedIn!==true||!supported||!pushRegistration||!pushKey||(ios&&!standalone)}
      className="mt-3 rounded-lg bg-[#77adff] px-4 py-2 font-bold text-[#06101f] disabled:cursor-not-allowed disabled:opacity-50">
      {subscribed?"Disable on this device":supported&&!pushRegistration?"Preparing push…":"Enable on this device"}
    </button>
    {supported&&!subscribed&&pushRegistration&&<p className="mt-2 text-xs text-slate-500">Ready to request device permission.</p>}
  </Panel><Panel title={`Inbox (${rows.filter(r=>!r.read_at).length} unread)`}>{rows.length===0?<p className="text-sm text-slate-400">No notifications yet.</p>:<div className="space-y-2">{rows.map(r=><div key={r.id} className={`rounded-xl border p-3 ${r.read_at?"border-white/5 opacity-60":"border-white/10"}`}><div className="flex justify-between gap-3"><div><span className={severityPill(r.severity)}>{String(r.severity||"normal").toUpperCase()}</span><b className="block text-sm">{r.title}</b><p className="text-xs text-slate-400">{r.body}</p><small className="text-slate-600">{new Date(r.created_at).toLocaleString()}</small></div><div className="flex h-fit gap-1">{!r.read_at&&(r.ref_table==="health_routines"?<>
 <Link href="/" className="rounded border border-white/10 px-2 py-1 text-xs">Open Home to confirm</Link>
 <button onClick={()=>markRead(r.id)} className="rounded border border-white/10 px-2 py-1 text-xs">Dismiss</button>
 </>:<button onClick={()=>doneAction(r)} className="rounded border border-white/10 px-2 py-1 text-xs">Done</button>)}<button onClick={()=>snoozeMinutes(r.id,10)} className="rounded border border-white/10 px-2 py-1 text-xs">10m</button><button onClick={()=>snoozeMinutes(r.id,60)} className="rounded border border-white/10 px-2 py-1 text-xs">1h</button><button onClick={()=>snoozeTonight(r.id)} className="rounded border border-white/10 px-2 py-1 text-xs">Tonight</button><button onClick={()=>snoozeTomorrow(r.id)} className="rounded border border-white/10 px-2 py-1 text-xs">Tomorrow</button>{r.ref_table==="tasks"&&<><button onClick={()=>reschedule(r)} className="rounded border border-white/10 px-2 py-1 text-xs">Reschedule</button><button onClick={()=>delegate(r)} className="rounded border border-white/10 px-2 py-1 text-xs">Delegate</button></>}</div></div></div>)}</div>}</Panel></div>}
  </main>;
}
