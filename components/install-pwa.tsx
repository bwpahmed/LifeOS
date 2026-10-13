"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPWA() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (event) return (
    <button onClick={async () => {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setEvent(null);
    }} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">
      Install LifeOS
    </button>
  );
  if (!ios) return null;

  return <div className="text-sm">
    <button type="button" aria-expanded={showIosHelp}
      onClick={() => setShowIosHelp(open => !open)}
      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9fc4ff]">
      Install LifeOS on iPhone
    </button>
    {showIosHelp && <p className="mt-2 max-w-xs leading-relaxed text-slate-400" role="status">
      Open this website in Safari. Tap Share, choose Add to Home Screen, then open LifeOS
      from the new Home Screen icon. For iPhone push notifications (iOS 16.4+), enable
      them inside the installed app under Notifications.
    </p>}
  </div>;
}
