"use client";

import { FormEvent,useEffect,useState } from "react";
import { Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

function strongEnough(v:string){
  return v.length>=12&&/[a-z]/.test(v)&&/[A-Z]/.test(v)&&/\d/.test(v)&&/[^A-Za-z0-9]/.test(v);
}

export default function UpdatePasswordPage(){
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[ready,setReady]=useState(false);
  const[loading,setLoading]=useState(false);
  const[msg,setMsg]=useState("Checking recovery session…");

  useEffect(()=>{void(async()=>{
    const sb=supabaseBrowser();
    const{data,error}=await sb.auth.getUser();
    if(error||!data.user){
      setReady(false);
      setMsg("Recovery session is missing or expired. Return to Login and send a fresh reset email.");
      return;
    }
    setReady(true);
    setMsg("Recovery session verified. Choose a new password.");
  })();},[]);

  async function save(e:FormEvent){
    e.preventDefault();
    if(!ready)return;
    if(password!==confirmPassword){setMsg("Passwords do not match.");return;}
    if(!strongEnough(password)){setMsg("Use at least 12 characters with uppercase, lowercase, number and symbol.");return;}
    setLoading(true);setMsg("");
    try{
      const sb=supabaseBrowser();
      const{error}=await sb.auth.updateUser({password});
      if(error)throw error;
      setMsg("Password updated. Opening LifeOS…");
      setTimeout(()=>location.assign("/"),500);
    }catch(e){setMsg(e instanceof Error?e.message:"Could not update password");}
    finally{setLoading(false);}
  }

  return <main className="mx-auto max-w-md pt-8">
    <Panel title="Set a new LifeOS password" kicker="SECURE RECOVERY">
      <p className="mb-4 text-sm text-slate-400">{msg}</p>
      <form onSubmit={save} className="space-y-3">
        <label className="block text-xs text-slate-400">New password
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="new-password" disabled={!ready||loading} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
        </label>
        <label className="block text-xs text-slate-400">Confirm new password
          <input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" disabled={!ready||loading} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
        </label>
        <button disabled={!ready||loading||!password||!confirmPassword} className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{loading?"Updating…":"Save new password"}</button>
      </form>
      <p className="mt-3 text-xs text-slate-500">Minimum: 12 characters with uppercase, lowercase, number and symbol.</p>
      <a href="/login" className="mt-3 inline-block text-sm text-[#8ab6ff]">Back to Login</a>
    </Panel>
  </main>;
}