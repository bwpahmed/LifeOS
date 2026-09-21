"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";

const HASH_KEY="lifeos_privacy_pin_hash_v1";
const PASSKEY_KEY="lifeos_privacy_passkey_v1";
const UNLOCK_KEY="lifeos_private_unlocked_v1";

function b64url(bytes:ArrayBuffer|Uint8Array){
 const arr=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 let s="";for(const b of Array.from(arr))s+=String.fromCharCode(b);
 return btoa(s).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function fromB64url(s:string){const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));return Uint8Array.from(Array.from(raw).map(c=>c.charCodeAt(0)));}
async function hashPin(pin:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`LifeOS:${pin}`));return b64url(digest);}

export function PrivacyGate({children}:{children:ReactNode}){
 const[ready,setReady]=useState(false);const[unlocked,setUnlocked]=useState(false);const[hasPin,setHasPin]=useState(false);const[hasPasskey,setHasPasskey]=useState(false);const[pin,setPin]=useState("");const[confirmPin,setConfirmPin]=useState("");const[msg,setMsg]=useState("");
 useEffect(()=>{setHasPin(Boolean(localStorage.getItem(HASH_KEY)));setHasPasskey(Boolean(localStorage.getItem(PASSKEY_KEY)));setUnlocked(sessionStorage.getItem(UNLOCK_KEY)==="1");setReady(true);},[]);
 async function submit(e:FormEvent){e.preventDefault();setMsg("");if(!hasPin){if(pin.length<4){setMsg("Use at least 4 digits/characters.");return;}if(pin!==confirmPin){setMsg("PINs do not match.");return;}localStorage.setItem(HASH_KEY,await hashPin(pin));setHasPin(true);sessionStorage.setItem(UNLOCK_KEY,"1");setUnlocked(true);return;}const expected=localStorage.getItem(HASH_KEY);if(await hashPin(pin)===expected){sessionStorage.setItem(UNLOCK_KEY,"1");setUnlocked(true);setPin("");}else setMsg("Wrong PIN.");}
 async function biometric(){setMsg("");try{const saved=localStorage.getItem(PASSKEY_KEY);if(!saved)throw new Error("Device biometric is not enrolled yet.");const cred=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{id:fromB64url(saved),type:"public-key"}],userVerification:"required",timeout:60000}});if(!cred)throw new Error("Authentication cancelled.");sessionStorage.setItem(UNLOCK_KEY,"1");setUnlocked(true);}catch(e){setMsg(e instanceof Error?e.message:"Device authentication failed.");}}
 if(!ready)return <div className="panel mt-6 p-6 text-sm text-slate-400">Checking privacy lock…</div>;
 if(unlocked)return <>{children}</>;
 return <main className="mx-auto max-w-md pt-10"><section className="panel p-6"><p className="text-[11px] tracking-widest text-slate-400">PRIVATE MODULE</p><h1 className="mt-1 text-xl font-bold">{hasPin?"Unlock private data":"Create privacy PIN"}</h1><p className="mt-2 text-sm text-slate-400">This is an extra on-device UI lock. Supabase RLS remains the actual cloud authorization boundary.</p><form onSubmit={submit} className="mt-4 space-y-2"><input autoFocus type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>{!hasPin&&<input type="password" value={confirmPin} onChange={e=>setConfirmPin(e.target.value)} placeholder="Confirm PIN" className="w-full rounded-lg border border-white/10 bg-[#0a1524] p-2"/>}<button className="w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f]">{hasPin?"Unlock":"Set PIN & unlock"}</button></form>{hasPasskey&&<button onClick={biometric} className="mt-2 w-full rounded-lg border border-white/10 p-2">Use device biometric/passkey</button>}{msg&&<p className="mt-3 text-sm text-amber-200">{msg}</p>}</section></main>;
}

export function PrivacySettings(){
 const[hasPin,setHasPin]=useState(false);const[hasPasskey,setHasPasskey]=useState(false);const[msg,setMsg]=useState("");
 useEffect(()=>{setHasPin(Boolean(localStorage.getItem(HASH_KEY)));setHasPasskey(Boolean(localStorage.getItem(PASSKEY_KEY)));},[]);
 async function enroll(){setMsg("");try{if(!("credentials" in navigator))throw new Error("WebAuthn is not supported on this device.");const userId=crypto.getRandomValues(new Uint8Array(16));const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:"LifeOS"},user:{id:userId,name:"lifeos-private",displayName:"LifeOS Private"},pubKeyCredParams:[{alg:-7,type:"public-key"}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:60000,attestation:"none"}}) as PublicKeyCredential|null;if(!cred)throw new Error("Enrollment cancelled.");localStorage.setItem(PASSKEY_KEY,b64url(cred.rawId));setHasPasskey(true);setMsg("Device biometric/passkey enrolled.");}catch(e){setMsg(e instanceof Error?e.message:"Enrollment failed.");}}
 function lock(){sessionStorage.removeItem(UNLOCK_KEY);setMsg("Private modules locked for this session.");}
 function reset(){if(!confirm("Reset local privacy PIN and biometric enrollment on this device?"))return;localStorage.removeItem(HASH_KEY);localStorage.removeItem(PASSKEY_KEY);sessionStorage.removeItem(UNLOCK_KEY);setHasPin(false);setHasPasskey(false);setMsg("Local privacy lock reset.");}
 return <div><p className="text-sm text-slate-400">PIN: {hasPin?"Configured":"Not configured"} · Device biometric: {hasPasskey?"Configured":"Not configured"}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={enroll} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Enroll device biometric</button><button onClick={lock} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Lock now</button><button onClick={reset} className="rounded-lg border border-red-300/20 px-3 py-2 text-sm text-red-300">Reset local lock</button></div>{msg&&<p className="mt-2 text-sm text-slate-300">{msg}</p>}</div>;
}
