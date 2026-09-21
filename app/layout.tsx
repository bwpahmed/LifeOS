import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "LifeOS — Personal & Family Command Center", description: "Right thing. Right time. Consistently.", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LifeOS" } };
export const viewport: Viewport = { themeColor: "#0b1220", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return <html lang="en" suppressHydrationWarning><body>
  <div className="fixed right-3 top-3 z-50"><ThemeToggle/></div>
  <div className="mx-auto max-w-6xl px-4 pb-28 md:pb-10">{children}</div>
  <aside className="mobile-widgets md:hidden" aria-label="Mobile quick widgets"><a href="/tasks">✓ Tasks</a><a href="/quick-add">✎ Note</a><a href="/health">♥ Health</a><a href="/expenses">₳ Expense</a></aside>
  <nav aria-label="Mobile navigation" className="mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 p-2 md:hidden"><a href="/">Home</a><a href="/today">Today</a><a className="quick-plus" href="/quick-add" aria-label="Quick add">+</a><a href="/health">Health</a><a href="/settings">More</a></nav>
 </body></html>;
}