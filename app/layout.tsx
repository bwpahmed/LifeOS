import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { OfflineSync } from "@/components/offline-sync";
import { AppShell } from "@/components/app-shell";
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
