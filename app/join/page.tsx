"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function JoinPage(){
 const[token,setToken]=useState("");const[signedIn,setSignedIn]=useState<boolean|null>(null);const[msg,setMsg]=useState("");const[loading,setLoading]=useState(false);
 useEffect(()=>{setToken(new URLSearchParams(location.search).get("token")||"");supabaseBrowser().auth.getUser().then(({data})=>setSignedIn(Boolean(data.user))).catch(()=>setSignedIn(false));},[]);
 async function accept(){setLoading(true);setMsg("");try{const r=await fetch("/api/workspace/invite/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not accept invitation");setMsg("Invitation accepted. This workspace is now available to your account.");}catch(e){setMsg(e instanceof Error?e.message:"Could not accept invitation");}finally{setLoading(false);}}
 const next=`/join?token=${encodeURIComponent(token)}`;
 return <main className="mx-auto max-w-md pt-8"><BackHome/><Panel title="Join LifeOS workspace" kicker="INVITATION">{!token?<p className="text-sm text-red-300">Invitation token is missing.</p>:signedIn===false?<><p className="text-sm text-slate-400">Sign in using the same email address that received this invitation.</p><Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-3 block rounded-lg bg-[#77adff] p-2 text-center font-bold text-[#06101f]">Sign in</Link></>:<button onClick={accept} disabled={loading} className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{loading?"Joining…":"Accept invitation"}</button>}{msg&&<p className="mt-3 text-sm text-slate-300">{msg}</p>}</Panel></main>;
}
