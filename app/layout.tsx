import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { OfflineSync } from "@/components/offline-sync";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOS — Personal & Family Command Center",
  description: "Right thing. Right time. Consistently.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LifeOS" },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <OfflineSync />
        <WorkspaceSwitcher />
        <div className="mx-auto max-w-6xl px-4 pb-24 md:pb-10">{children}</div>
        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#07101d]/95 p-2 md:hidden">
          <a className="text-center text-xs text-slate-300" href="/">Home</a>
          <a className="text-center text-xs text-slate-300" href="/today">Today</a>
          <a className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-black text-[#06101f]" href="/quick-add" aria-label="Quick add">+</a>
          <a className="text-center text-xs text-slate-300" href="/progress">Progress</a>
          <a className="text-center text-xs text-slate-300" href="/settings">More</a>
        </nav>
      </body>
    </html>
  );
}
