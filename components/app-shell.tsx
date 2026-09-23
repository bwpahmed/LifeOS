"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { InstallPWA } from "@/components/install-pwa";
import { NotificationButton } from "@/components/notification-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { currentWorkspace,peekWorkspaceContext } from "@/lib/supabase/workspace";
import { supabaseBrowser } from "@/lib/supabase/client";

const nav = [
  { section: "COMMAND" },
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/today", icon: "◷", label: "Today" },
  { href: "/tasks", icon: "✓", label: "Tasks" },
  { href: "/goals", icon: "◎", label: "Goals" },
  { href: "/projects", icon: "▦", label: "Projects" },

  { section: "LIFE AREAS" },
  { href: "/money", icon: "₳", label: "Money" },
  { href: "/expenses", icon: "⊘", label: "Waste Guard" },
  { href: "/business", icon: "▤", label: "Business" },
  { href: "/health", icon: "♥", label: "Health" },
  { href: "/family", icon: "⌁", label: "Family" },
  { href: "/europe", icon: "◈", label: "Europe" },

  { section: "TOOLS" },
  { href: "/habits", icon: "↻", label: "Habits" },
  { href: "/focus", icon: "◉", label: "Focus" },
  { href: "/time", icon: "◴", label: "Time" },
  { href: "/calendar", icon: "□", label: "Calendar" },
  { href: "/timeline", icon: "≡", label: "Timeline" },
  { href: "/automations", icon: "⚡", label: "Automations" },
  { href: "/reviews", icon: "↗", label: "Reviews" },
  { href: "/journal", icon: "✎", label: "Journal" },
  { href: "/settings", icon: "⚙", label: "Settings" },

  { section: "ADVANCED" },
  { href: "/sticky-notes", icon: "▰", label: "Sticky Notes" },
  { href: "/matrix", icon: "◆", label: "Priority Matrix" },
  { href: "/waiting", icon: "…", label: "Waiting For" },
  { href: "/health-planner", icon: "✚", label: "Health Planner" },
  { href: "/health-vault", icon: "▣", label: "Health Vault" },
  { href: "/hair", icon: "◌", label: "Hair Recovery" },
  { href: "/self-control", icon: "◇", label: "Self-Control" },
  { href: "/progress", icon: "↗", label: "Progress" },
  { href: "/coach", icon: "✦", label: "AI Coach" },
  { href: "/notifications", icon: "◉", label: "Notifications" },
  { href: "/privacy", icon: "⌾", label: "Privacy" },
  { href: "/access", icon: "♙", label: "Access" },
] as const;

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/today": "Today",
  "/tasks": "Tasks",
  "/goals": "Goals",
  "/projects": "Projects",
  "/money": "Money Recovery",
  "/expenses": "Waste Guard",
  "/business": "Business",
  "/health": "Health",
  "/health-planner": "Health Planner",
  "/health-vault": "Health Vault",
  "/hair": "Hair Recovery",
  "/self-control": "Self-Control",
  "/family": "Family",
  "/europe": "Europe Move",
  "/habits": "Habits",
  "/focus": "Focus",
  "/time": "Time Tracking",
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
  "/sticky-notes": "Sticky Notes",
  "/mobile": "Tasks & Notes",
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
  const[readyPath,setReadyPath]=useState<string|null>(null);
  const publicShell=pathname==="/login"||pathname.startsWith("/auth/")||pathname.startsWith("/join");
  const rootAuthLanding=pathname==="/";
  const workspaceReady=Boolean(peekWorkspaceContext());
  const needsWorkspaceBootstrap=!publicShell&&!rootAuthLanding&&!workspaceReady&&readyPath!==pathname;
  useEffect(()=>{
    const update=()=>{const now=new Date();const hour=now.getHours();setClock({date:formatDateLine(now),greeting:hour<12?"Good Morning":hour<18?"Good Afternoon":"Good Evening"});};
    update();
    const timer=setInterval(update,60_000);
    return()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(publicShell||rootAuthLanding){
      setReadyPath(null);
      return;
    }
    if(peekWorkspaceContext()){
      setReadyPath(pathname);
      return;
    }

    let alive=true;
    void currentWorkspace(supabaseBrowser())
      .then(ctx=>{
        if(!alive)return;
        if(!ctx){
          const next=encodeURIComponent(pathname);
          location.replace("/login?next="+next);
          return;
        }
        setReadyPath(pathname);
      })
      .catch(()=>{
        if(!alive)return;
        const next=encodeURIComponent(pathname);
        location.replace("/login?next="+next);
      });

    return()=>{alive=false;};
  },[pathname,publicShell,rootAuthLanding]);

  if(publicShell)return <div className="auth-shell">{children}</div>;

  if(needsWorkspaceBootstrap)return <div className="auth-shell"><div className="panel w-full max-w-md p-6"><span className="label">LIFEOS CLOUD</span><h2 className="mt-2 text-xl font-bold">Opening {title}…</h2><p className="mt-2 text-sm text-slate-400">Restoring your private workspace. You do not need to sign in again.</p></div></div>;

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
            <ThemeToggle />
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
        <Link className={`mobile-item ${pathname === "/progress" ? "active" : ""}`} href="/progress"><span>↗</span>Progress</Link>
        <Link className={`mobile-item ${pathname === "/settings" ? "active" : ""}`} href="/settings"><span>☰</span>More</Link>
      </nav>
    </div>
  );
}
