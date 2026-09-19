"use client";

import { BackHome, Panel } from "@/components/ui";
import { PrivacySettings } from "@/components/privacy-gate";

export default function PrivacyPage(){
 return <main className="mx-auto max-w-2xl pt-6"><BackHome/><p className="mt-2 text-[11px] tracking-widest text-slate-400">PRIVACY</p><h1 className="text-2xl font-bold">Private module lock</h1><Panel title="On-device privacy"><PrivacySettings/></Panel><div className="panel mt-4 p-5 text-sm text-slate-400">The PIN/passkey gate prevents casual access on this device. It does not replace account security, Supabase RLS, OS device security, or encrypted cloud transport.</div></main>;
}
