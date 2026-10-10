"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabaseBrowser, supabaseEmailAuthClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth-routing";
import "./login-premium.css";

type Message = { text: string; type: "info" | "error" | "success" };

function readableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
  if (/invalid login credentials/i.test(message)) return "Supabase could not verify these login details. Check your email, or use Forgot password to recover access.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email address before signing in.";
  if (/rate limit|too many requests|security purposes/i.test(message)) return "Too many attempts. Please wait a few minutes before trying again.";
  if (/failed to fetch|network|fetch failed|load failed/i.test(message)) return "Could not connect to LifeOS. Check your connection and try again.";
  return message;
}

export default function LoginPage() {
  // Preserve the existing owner-login convenience without locking other authorized users out.
  const [email, setEmail] = useState("bwpahmed@gmail.com");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState<"password" | "reset" | "magic" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setNextPath(safeNextPath(params.get("next")));
    if (params.get("error") === "auth_callback")
      setMessage({text:"This sign-in link has expired or could not be verified. Request a new link below.", type:"error"});
    if (params.get("error") === "missing_code")
      setMessage({text:"This sign-in link is incomplete. Request a fresh link below.", type:"error"});
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading("password"); setMessage(null);
    try {
      // Password managers may autofill the DOM without dispatching React onChange.
      // Read the submitted form itself; do not rely on possibly stale state.
      const form = new FormData(event.currentTarget);
      const submittedEmail = String(form.get("email") || "").trim().toLowerCase();
      const submittedPassword = String(form.get("password") || "");
      if (!submittedEmail || !submittedPassword) {
        setMessage({text:"Enter your email address and password to sign in.", type:"error"});
        setLoading(null);
        return;
      }
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({
        email: submittedEmail, password: submittedPassword
      });
      if (error) throw error;
      if (!data.session) throw new Error("Sign-in did not establish a session. Try again.");
      sessionStorage.removeItem("lifeos_auth_mode");
      sessionStorage.removeItem("lifeos_auth_next");
      location.replace(nextPath);
    } catch (error) {
      setMessage({text: readableAuthError(error), type:"error"});
      setLoading(null);
    }
  }

  async function sendPasswordReset() {
    if (loading) return;
    const recoveryEmail = (emailInputRef.current?.value || email).trim().toLowerCase();
    if (!recoveryEmail) { setMessage({text:"Enter your account email first.",type:"error"}); return; }
    setLoading("reset"); setMessage(null);
    try {
      const sb = supabaseEmailAuthClient();
      sessionStorage.setItem("lifeos_auth_mode", "recovery");
      sessionStorage.setItem("lifeos_auth_next", "/");
      const {error} = await sb.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: location.origin + "/auth/update-password"
      });
      if (error) throw error;
      setMessage({text:"If this email belongs to your LifeOS account, check your inbox for a reset link. Open it on this same website to set a new password.", type:"success"});
    } catch (error) {
      sessionStorage.removeItem("lifeos_auth_mode");
      sessionStorage.removeItem("lifeos_auth_next");
      setMessage({text:readableAuthError(error), type:"error"});
    } finally { setLoading(null); }
  }

  async function magicLink() {
    if (loading) return;
    const linkEmail = (emailInputRef.current?.value || email).trim().toLowerCase();
    if (!linkEmail) { setMessage({text:"Enter your account email first.",type:"error"}); return; }
    setLoading("magic"); setMessage(null);
    try {
      const sb = supabaseEmailAuthClient();
      sessionStorage.setItem("lifeos_auth_mode", "magic");
      sessionStorage.setItem("lifeos_auth_next", nextPath);
      const {error} = await sb.auth.signInWithOtp({
        email: linkEmail,
        options: {emailRedirectTo: location.origin + "/", shouldCreateUser:false}
      });
      if (error) throw error;
      setMessage({text:"If your account is eligible, a sign-in link has been requested. Check your inbox.", type:"success"});
    } catch (error) {
      sessionStorage.removeItem("lifeos_auth_mode");
      sessionStorage.removeItem("lifeos_auth_next");
      setMessage({text:readableAuthError(error), type:"error"});
    } finally { setLoading(null); }
  }

  return (
    <main className="lifeos-signin">
      <div className="lifeos-signin-backdrop" aria-hidden="true"><span/><span/><span/></div>
      <section className="lifeos-signin-card" aria-labelledby="signin-title">
        <div className="lifeos-signin-art" aria-hidden="true">
          <div className="lifeos-signin-brand"><span className="lifeos-signin-logo">✳</span> LifeOS <span className="lifeos-signin-brand-pill">Personal space</span></div>
          <div className="lifeos-signin-art-inner">
            <span className="lifeos-signin-art-kicker">YOUR DAY, IN BALANCE</span>
            <h2>Make space for<br/><em>what matters.</em></h2>
            <p>Your goals, habits, health and plans, beautifully together in one private place.</p>
            <div className="lifeos-signin-art-preview">
              <span className="lifeos-signin-preview-dots">● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●</span>
              <strong>Every day counts.</strong><small>A calmer, clearer way to grow.</small>
            </div>
          </div>
          <span className="lifeos-signin-art-foot">PRIVATE BY DESIGN · SYNCED WITH YOUR WORKSPACE</span>
        </div>
        <div className="lifeos-signin-main">
          <div className="lifeos-signin-mobile-logo"><span>✳</span> LifeOS</div>
          <span className="lifeos-signin-eyebrow">WELCOME BACK</span>
          <h1 id="signin-title">Your space awaits.</h1>
          <p className="lifeos-signin-intro">Sign in securely to pick up right where you left off.</p>
          <form onSubmit={signIn} className="lifeos-signin-form">
            <label htmlFor="lifeos-email">Email address</label>
            <input ref={emailInputRef} id="lifeos-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com" disabled={loading!==null}/>
            <div className="lifeos-signin-password-label"><label htmlFor="lifeos-password">Password</label><button type="button" onClick={()=>void sendPasswordReset()} disabled={loading!==null} className="lifeos-signin-link">Forgot password?</button></div>
            <div className="lifeos-signin-password-wrap">
              <input id="lifeos-password" name="password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password}
                onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" disabled={loading!==null}/>
              <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} disabled={loading!==null}>{showPassword?"Hide":"Show"}</button>
            </div>
            <button type="submit" className="lifeos-signin-primary" disabled={loading!==null}>{loading==="password"?"Signing you in…":"Sign in to LifeOS"} <span aria-hidden="true">→</span></button>
          </form>
          <div className="lifeos-signin-divider"><span>or continue with</span></div>
          <button type="button" className="lifeos-signin-alternative" disabled={loading!==null} onClick={()=>void magicLink()}>
            <span aria-hidden="true">✉</span> {loading==="magic"?"Sending…":"Email sign-in link"}
          </button>
          {message&&<p role="status" aria-live="polite" className={"lifeos-signin-message "+message.type}>{message.text}</p>}
          <p className="lifeos-signin-note">No new account is created here. Only people with authorized LifeOS access can sign in.</p>
        </div>
      </section>
    </main>
  );
}
