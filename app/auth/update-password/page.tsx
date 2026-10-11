"use client";

import {FormEvent, useEffect, useState} from "react";
import Link from "next/link";
import {supabaseBrowser} from "@/lib/supabase/client";
import {LIFEOS_PASSWORD_HINT, passwordMeetsLifeOSPolicy} from "@/lib/password-policy";
import "./recovery.css";

/** Recovery can be opened in a different browser than the email-request tab.
 * Never depend on sessionStorage from the original tab or expose recovery tokens.
 */
export default function UpdatePasswordPage(){
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [ready,setReady]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("Verifying your secure recovery link…");
  const [error,setError]=useState(false);
  const [showPassword,setShowPassword]=useState(false);

  useEffect(()=>{
    let alive=true;
    const supabase=supabaseBrowser();
    function readyWithSession(){
      if(!alive)return;
      setReady(true);
      setError(false);
      setMessage("Your account is verified. Choose a strong, unique new password.");
    }
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if((event==="PASSWORD_RECOVERY" || event==="SIGNED_IN") && session){
        readyWithSession();
      }
    });

    void (async()=>{
      try {
        const url=new URL(location.href);
        const fragment=new URLSearchParams(url.hash.replace(/^#/,""));
        const code=url.searchParams.get("code");
        const accessToken=fragment.get("access_token");
        const refreshToken=fragment.get("refresh_token");
        const reportedError=fragment.get("error_description") || url.searchParams.get("error_description");
        if(reportedError) throw new Error("This recovery link has expired or could not be verified. Please request a fresh one.");
        // @supabase/ssr may have already consumed the recovery redirect.
        const first=await supabase.auth.getUser();
        if(first.data.user){
          readyWithSession();
          return;
        }
        if(accessToken && refreshToken){
          const restored=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
          if(restored.error) throw restored.error;
        }else if(code){
          const exchanged=await supabase.auth.exchangeCodeForSession(code);
          if(exchanged.error) throw exchanged.error;
        }
        const verified=await supabase.auth.getUser();
        if(!verified.data.user)throw new Error("Recovery session missing or expired. Request a new password reset link.");
        readyWithSession();
      } catch (e){
        if(!alive)return;
        setReady(false);
        setError(true);
        setMessage(e instanceof Error ? e.message : "Unable to verify this recovery link.");
      } finally {
        // Remove tokens and authorization codes from the address bar, never from the account session.
        if(alive && (location.search || location.hash)){
          history.replaceState(null,"",location.pathname);
        }
      }
    })();
    return ()=>{alive=false;subscription.unsubscribe();};
  },[]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!ready||loading)return;
    if(password!==confirmPassword){
      setError(true);setMessage("The two passwords do not match.");return;
    }
    if(!passwordMeetsLifeOSPolicy(password)){
      setError(true);setMessage(LIFEOS_PASSWORD_HINT);return;
    }
    setLoading(true);setError(false);setMessage("Saving your new password securely…");
    try{
      const sb=supabaseBrowser();
      const {error:updateError}=await sb.auth.updateUser({password});
      if(updateError)throw updateError;
      setPassword("");setConfirmPassword("");
      setMessage("Password updated. Opening your LifeOS dashboard…");
      setTimeout(()=>location.replace("/"),800);
    }catch(e){
      setError(true);
      setMessage(e instanceof Error?e.message:"Could not save your password. Request a new reset link.");
    }finally{setLoading(false);}
  }

  return <main className="lifeos-recovery">
    <div className="lifeos-recovery-card">
      <div className="lifeos-recovery-brand"><span aria-hidden="true">✳</span> LifeOS</div>
      <div className="lifeos-recovery-symbol" aria-hidden="true">✦</div>
      <span className="lifeos-recovery-eyebrow">PRIVATE ACCOUNT RECOVERY</span>
      <h1>Set a new password.</h1>
      <p className="lifeos-recovery-caption">Secure access to your personal LifeOS space.</p>
      <p className={"lifeos-recovery-message"+(error?" is-error":"")} role="status">{message}</p>
      <form onSubmit={save}>
        <label htmlFor="lifeos-new-password">New password</label>
        <div className="lifeos-recovery-password">
          <input id="lifeos-new-password" type={showPassword?"text":"password"} autoComplete="new-password"
            value={password} onChange={e=>setPassword(e.target.value)}
            disabled={!ready||loading} required minLength={12}/>
          <button type="button" disabled={!ready||loading}
            onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button>
        </div>
        <label htmlFor="lifeos-confirm-password">Confirm new password</label>
        <input id="lifeos-confirm-password" type="password" autoComplete="new-password"
          value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
          disabled={!ready||loading} required minLength={12}/>
        <p className="lifeos-recovery-hint">{LIFEOS_PASSWORD_HINT}</p>
        <button className="lifeos-recovery-submit" type="submit"
          disabled={!ready||loading||!password||!confirmPassword}>{loading?"Saving…":"Save new password →"}</button>
      </form>
      <Link href="/login" className="lifeos-recovery-back">← Return to login</Link>
    </div>
  </main>;
}
