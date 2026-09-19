"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackHome, Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";

type NotificationRow={id:string;title:string;body:string;severity:string;read_at:string|null;snoozed_until:string|null;created_at:string};

function decodeKey(input:string){
  const s=input.replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(s+"=".repeat((4-s.length%4)%4));
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

export default function NotificationsPage(){
  const[rows,setRows]=useState<NotificationRow[]>([]);const[error,setError]=useState("");const[msg,setMsg]=useState("");const[supported,setSupported]=useState(false);const[subscribed,setSubscribed]=useState(false);const[signedIn,setSignedIn]=useState<boolean|null>(null);

  const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setSignedIn(false);return;}setSignedIn(true);const{data,error:q}=await sb.from("notifications").select("id,title,body,severity,read_at,snoozed_until,created_at").eq("user_id",ctx.user.id).order("created_at",{ascending:false}).limit(100);if(q)throw q;setRows((data||[]) as NotificationRow[]);}catch(e){setError(e instanceof Error?e.message:"Could not load notifications");}},[]);
  useEffect(()=>{void load();const ok="serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;setSupported(ok);if(ok)navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription()).then(s=>setSubscribed(Boolean(s))).catch(()=>{});},[load]);

  async function enablePush(){setError("");setMsg("");try{if(!supported)throw new Error("Push notifications are not supported on this browser.");const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notification permission was not granted.");const keyResponse=await fetch("/api/push/vapid-public");const keyData=await keyResponse.json();if(!keyResponse.ok||!keyData.publicKey)throw new Error("Server push keys are not configured.");const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(keyData.publicKey)});const json=sub.toJSON();const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,keys:json.keys})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save subscription");setSubscribed(true);setMsg("Background push enabled on this device.");}catch(e){setError(e instanceof Error?e.message:"Push setup failed");}}
  async function disablePush(){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await fetch("/api/push/subscribe",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}setSubscribed(false);setMsg("Push disabled on this device.");}catch(e){setError(e instanceof Error?e.message:"Could not disable push");}}
  async function markRead(id:string){const sb=supabaseBrowser();const{error:q}=await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);if(q)setError(q.message);else await load();}
  async function snooze(id:string,hours:number){const until=new Date(Date.now()+hours*3600000).toISOString();const sb=supabaseBrowser();const{error:q}=await sb.from("notifications").update({snoozed_until:until}).eq("id",id);if(q)setError(q.message);else await load();}

  return <main className="mx-auto max-w-3xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">NOTIFICATIONS</p><h1 className="text-2xl font-bold">Reminder inbox</h1>{error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{msg&&<p className="mt-3 text-sm text-emerald-300">{msg}</p>}
  {signedIn===false?<p className="panel mt-4 p-5 text-sm">Sign in first. <Link href="/login" className="text-[#8ab6ff]">Login →</Link></p>:<div className="mt-4 grid gap-4"><Panel title="Background push" kicker={supported?"SUPPORTED":"NOT SUPPORTED"}><p className="text-sm text-slate-400">Push permission is requested only when you press the button. Sensitive health/self-control reminders use generic lock-screen text.</p><button onClick={subscribed?disablePush:enablePush} className="mt-3 rounded-lg bg-[#77adff] px-4 py-2 font-bold text-[#06101f]">{subscribed?"Disable on this device":"Enable on this device"}</button></Panel><Panel title={`Inbox (${rows.filter(r=>!r.read_at).length} unread)`}>{rows.length===0?<p className="text-sm text-slate-400">No notifications yet.</p>:<div className="space-y-2">{rows.map(r=><div key={r.id} className={`rounded-xl border p-3 ${r.read_at?"border-white/5 opacity-60":"border-white/10"}`}><div className="flex justify-between gap-3"><div><span className="text-[10px] uppercase tracking-wider text-slate-500">{r.severity}</span><b className="block text-sm">{r.title}</b><p className="text-xs text-slate-400">{r.body}</p><small className="text-slate-600">{new Date(r.created_at).toLocaleString()}</small></div><div className="flex h-fit gap-1">{!r.read_at&&<button onClick={()=>markRead(r.id)} className="rounded border border-white/10 px-2 py-1 text-xs">Done</button>}<button onClick={()=>snooze(r.id,1)} className="rounded border border-white/10 px-2 py-1 text-xs">1h</button><button onClick={()=>snooze(r.id,24)} className="rounded border border-white/10 px-2 py-1 text-xs">Tomorrow</button></div></div></div>)}</div>}</Panel></div>}
  </main>;
}
