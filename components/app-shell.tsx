"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { InstallPWA } from "@/components/install-pwa";
import { NotificationButton } from "@/components/notification-button";

const nav = [
  { section: "COMMAND" },
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/today", icon: "◷", label: "Today" },
  { href: "/tasks", icon: "✓", label: "Tasks" },
  { href: "/goals", icon: "◎", label: "Goals" },
  { href: "/projects", icon: "▦", label: "Projects" },

  { section: "LIFE AREAS" },
  { href: "/money", icon: "₳", label: "Money" },
  { href: "/business", icon: "▤", label: "Business" },
  { href: "/health", icon: "♥", label: "Health" },
  { href: "/family", icon: "⌁", label: "Family" },
  { href: "/europe", icon: "◈", label: "Europe" },

  { section: "TOOLS" },
  { href: "/habits", icon: "↻", label: "Habits" },
  { href: "/focus", icon: "◉", label: "Focus" },
  { href: "/calendar", icon: "□", label: "Calendar" },
  { href: "/timeline", icon: "≡", label: "Timeline" },
  { href: "/automations", icon: "⚡", label: "Automations" },
  { href: "/reviews", icon: "↗", label: "Reviews" },
  { href: "/journal", icon: "✎", label: "Journal" },
  { href: "/settings", icon: "⚙", label: "Settings" },
] as const;

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/today": "Today",
  "/tasks": "Tasks",
  "/goals": "Goals",
  "/projects": "Projects",
  "/money": "Money Recovery",
  "/business": "Business",
  "/health": "Health",
  "/health-vault": "Health Vault",
  "/hair": "Hair Recovery",
  "/self-control": "Self-Control",
  "/family": "Family",
  "/europe": "Europe Move",
  "/habits": "Habits",
  "/focus": "Focus",
  "/calendar": "Calendar",
  "/timeline": "Timeline",
  "/automations": "Automations",
  "/reviews": "Reviews",
  "/journal": "Journal",
  "/settings": "Settings",
  "/notifications": "Notifications",
  "/search": "Search",
  "/progress": "Progress",
  "/coach": "AI Coach",
  "/quick-add": "Quick Add",
  "/access": "Access",
  "/privacy": "Privacy",
  "/waiting": "Waiting For",
  "/matrix": "Priority Matrix",
};

function pageTitle(pathname: string) {
  return pageTitles[pathname] || "LifeOS";
}

function formatDateLine(date:Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const[clock,setClock]=useState({date:"",greeting:"LifeOS"});
  useEffect(()=>{
    const update=()=>{const now=new Date();const hour=now.getHours();setClock({date:formatDateLine(now),greeting:hour<12?"Good Morning":hour<18?"Good Afternoon":"Good Evening"});};
    update();
    const timer=setInterval(update,60_000);
    return()=>clearInterval(timer);
  },[]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/" className="brand-wrap">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand">LifeOS</div>
            <div className="brand-sub">Personal Command Center</div>
          </div>
        </Link>

        <nav className="side-nav">
          {nav.map((item, index) =>
            "section" in item ? (
              <div className="nav-section" key={`section-${index}`}>{item.section}</div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <WorkspaceSwitcher />
          <InstallPWA />
          <Link href="/notifications" className="ghost-btn small">Notifications</Link>
          <div className="focus-chip">
            <span className="status-dot" />
            <span>Cloud workspace</span>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="title-block">
            <p className="eyebrow">{clock.date||"PERSONAL + FAMILY COMMAND CENTER"}</p>
            <h1>{pathname === "/" ? clock.greeting : title}</h1>
          </div>
          <div className="top-actions">
            <Link className="icon-btn" href="/search" title="Search" aria-label="Search">⌕</Link>
            <NotificationButton />
            <Link className="quick-add-btn" href="/quick-add"><span>＋</span> Quick Add</Link>
            <Link className="avatar" href="/settings" title="Settings" aria-label="Settings">ME</Link>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link className={`mobile-item ${pathname === "/" ? "active" : ""}`} href="/"><span>⌂</span>Home</Link>
        <Link className={`mobile-item ${pathname === "/today" ? "active" : ""}`} href="/today"><span>◷</span>Today</Link>
        <Link className="mobile-add" href="/quick-add" aria-label="Quick Add">＋</Link>
        <Link className={`mobile-item ${pathname === "/money" ? "active" : ""}`} href="/money"><span>₳</span>Money</Link>
        <Link className={`mobile-item ${pathname === "/settings" ? "active" : ""}`} href="/settings"><span>☰</span>More</Link>
      </nav>
    </div>
  );
}
