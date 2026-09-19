"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BackHome, Panel } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const next = new URLSearchParams(location.search).get("next");
    if (next && next.startsWith("/")) setNextPath(next);
  }, []);

  async function magicLink() {
    setLoading(true);
    setMsg("");
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
      });
      if (error) throw error;
      setMsg("Magic link sent. Check your email.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md pt-10">
      <BackHome />
      <Panel title="Sign in" kicker="AUTH">
        <label className="text-xs text-slate-400">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a1524] p-2 text-white"
          />
        </label>
        <button
          onClick={magicLink}
          disabled={loading || !email}
          className="mt-3 w-full rounded-lg bg-[#77adff] p-2 font-bold text-[#06101f] disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
        {msg && <p className="mt-2 text-sm text-slate-300">{msg}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Magic-link sign-in is active. Password, Google and Apple sign-in can be added separately when enabled in Supabase.
        </p>
      </Panel>
    </main>
  );
}
