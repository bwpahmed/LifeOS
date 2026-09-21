"use client";

import { useEffect,useState } from "react";
import { supabaseBrowser,supabaseEmailAuthClient } from "@/lib/supabase/client";
import { Panel } from "@/components/ui";
import { safeNextPath } from "@/lib/auth-routing";

const LIFEOS_EMAIL="bwpahmed@gmail.com";

export default function LoginPage(){
  const[email]=useState(LIFEOS_EMAIL);
  const[password,setPassword]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPassword,setShowPassword]=useState(false);
  const[nextPath,setNextPath]=useState("/");

  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    setNextPath(safeNextPath(params.get("next")));
    const err=params.get("error");
    if(err==="auth_callback")setMsg("Sign-in link expired or could not be verified. Send a fresh magic/reset link below.");
    if(err==="missing_code")setMsg("That sign-in link is incomplete. Send a fresh magic/reset link below.");
  },[]);

  async function signIn(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseBrowser();
      const{error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      sessionStorage.removeItem("lifeos_auth_mode");
      sessionStorage.removeItem("lifeos_auth_next");
      location.assign(nextPath);
    }catch(e){
      const raw=e instanceof Error?e.message:"Sign-in failed";
      setMsg(/invalid login credentials/i.test(raw)
        ?"Password does not match this LifeOS account. Use “Reset password” below."
        :raw);
    }finally{setLoading(false);}
  }

  async function sendPasswordReset(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseEmailAuthClient();
      sessionStorage.setItem("lifeos_auth_mode","recovery");
      sessionStorage.setItem("lifeos_auth_next","/");
      const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/"});
      if(error)throw error;
      setMsg("Password reset email sent. Open the newest email, set a new password, then LifeOS will return you to the dashboard.");
    }catch(e){sessionStorage.removeItem("lifeos_auth_mode");sessionStorage.removeItem("lifeos_auth_next");setMsg(e instanceof Error?e.message:"Could not send password reset email");}
    finally{setLoading(false);}
  }

  async function magicLink(){
    setLoading(true);setMsg("");
    try{
      const sb=supabaseEmailAuthClient();
      sessionStorage.setItem("lifeos_auth_mode","magic");
      sessionStorage.setItem("lifeos_auth_next",nextPath);
      const{error}=await sb.auth.signInWithOtp({
        email,
        options:{emailRedirectTo:location.origin+"/",shouldCreateUser:false}
      });
      if(error)throw error;
      setMsg("Magic sign-in link sent to your Gmail.");
    }catch(e){sessionStorage.removeItem("lifeos_auth_mode");sessionStorage.removeItem("lifeos_auth_next");setMsg(e instanceof Error?e.message:"Magic-link sign-in failed");}
    finally{setLoading(false);}
  }

  return <main className="mx-auto max-w-md pt-8">
    <Panel title="Sign in to LifeOS" kicker="PRIVATE OWNER ACCOUNT">
      <p className="mb-4 text-sm text-slate-400">Sign in first. After authentication LifeOS opens your private dashboard and cloud-synced modules.</p>
      <label className="text-xs text-slate-400">Email
        <input value={email} readOnly type="email" autoComplete="username" className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 opacity-80"/>
      </label>
      <label className="mt-3 block text-xs text-slate-400">Password
        <div className="mt-1 flex gap-2">
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&password.length>0)void signIn();}} type={showPassword?"text":"password"} autoComplete="current-password" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a1524] p-2"/>
          <button type="button" onClick={()=>setShowPassword(v=>!v)} className="ghost-btn">{showPassword?"Hide":"Show"}</button>
        </div>
      </label>
      <button onClick={signIn} disabled={loading||password.length===0} className="mt-3 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50">{loading?"Working…":"Sign in"}</button>
      <button onClick={sendPasswordReset} disabled={loading} className="mt-2 w-full rounded-lg border border-white/10 p-2 text-sm">Reset password</button>
      <button onClick={magicLink} disabled={loading} className="mt-2 w-full rounded-lg border border-white/10 p-2 text-sm">Send magic sign-in link</button>
      {msg&&<p role="status" className="mt-3 rounded-lg border border-white/10 p-3 text-sm text-slate-300">{msg}</p>}
      <p className="mt-3 text-xs text-slate-500">Your password goes directly to Supabase Auth and is never stored by LifeOS application tables.</p>
    </Panel>
  </main>;
}