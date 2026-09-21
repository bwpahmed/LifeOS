"use client";

import { useEffect,useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BackHome,Panel } from "@/components/ui";
import { safeNextPath } from "@/lib/auth-routing";

const LIFEOS_EMAIL="bwpahmed@gmail.com";

export default function LoginPage(){
  const[email]=useState(LIFEOS_EMAIL);
  const[password,setPassword]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(false);
  const[nextPath,setNextPath]=useState("/");

  useEffect(()=>{
    const next=new URLSearchParams(location.search).get("next");
    setNextPath(safeNextPath(next));
  },[]);

  async function signIn(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseBrowser();
      const{error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      location.href=nextPath;
    }catch(e){setMsg(e instanceof Error?e.message:"Sign-in failed");}
    finally{setLoading(false);}
  }

  async function createAccount(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseBrowser();
      const{data,error}=await sb.auth.signUp({
        email,password,
        options:{data:{display_name:"Ahmed"}}
      });
      if(error)throw error;
      if(data.session){
        location.href=nextPath;
        return;
      }
      setMsg("Account created. If email confirmation is enabled, check Gmail once, then sign in with your password.");
    }catch(e){setMsg(e instanceof Error?e.message:"Account creation failed");}
    finally{setLoading(false);}
  }

  async function magicLink(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseBrowser();
      const{error}=await sb.auth.signInWithOtp({
        email,
        options:{emailRedirectTo:`${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`}
      });
      if(error)throw error;
      setMsg("Magic link sent to your Gmail.");
    }catch(e){setMsg(e instanceof Error?e.message:"Magic-link sign-in failed");}
    finally{setLoading(false);}
  }

  return <main className="mx-auto max-w-md pt-4">
    <BackHome/>
    <Panel title="Your LifeOS account" kicker="SINGLE USER">
      <p className="mb-4 text-sm text-slate-400">This LifeOS is configured for one owner account.</p>
      <label className="text-xs text-slate-400">Email
        <input value={email} readOnly type="email" className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 opacity-80"/>
      </label>
      <label className="mt-3 block text-xs text-slate-400">Password
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
      </label>
      <button onClick={signIn} disabled={loading||password.length<8} className="mt-3 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{loading?"Working…":"Sign in"}</button>
      <button onClick={createAccount} disabled={loading||password.length<8} className="mt-2 w-full rounded-lg border border-white/10 p-2 disabled:opacity-50">Create my account</button>
      <button onClick={magicLink} disabled={loading} className="mt-2 w-full rounded-lg border border-white/10 p-2 text-sm">Send magic link instead</button>
      {msg&&<p className="mt-3 text-sm text-slate-300">{msg}</p>}
      <p className="mt-3 text-xs text-slate-500">Password is sent directly from your browser to Supabase Auth. LifeOS does not save it in the app database.</p>
    </Panel>
  </main>;
}
