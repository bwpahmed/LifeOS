"use client";

import { useEffect,useState } from "react";

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>};

export function InstallPWA(){
 const[event,setEvent]=useState<InstallEvent|null>(null);const[installed,setInstalled]=useState(false);
 useEffect(()=>{const onPrompt=(e:Event)=>{e.preventDefault();setEvent(e as InstallEvent);};const onInstalled=()=>{setInstalled(true);setEvent(null);};window.addEventListener("beforeinstallprompt",onPrompt);window.addEventListener("appinstalled",onInstalled);setInstalled(window.matchMedia("(display-mode: standalone)").matches);return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled);};},[]);
 if(installed||!event)return null;
 return <button onClick={async()=>{await event.prompt();const choice=await event.userChoice;if(choice.outcome==="accepted")setEvent(null);}} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">Install LifeOS</button>;
}
