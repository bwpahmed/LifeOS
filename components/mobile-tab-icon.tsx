import type { ReactNode } from "react";

type TabName = "home" | "habits" | "add" | "progress" | "more";

export function MobileTabIcon({name}:{name:TabName}) {
  const paths:Record<TabName,ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    habits: <><circle cx="12" cy="12" r="9"/><path d="m7.5 12.4 3.1 3.1 6-6"/></>,
    add: <><path d="M12 5v14M5 12h14"/></>,
    progress: <><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    more: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  };
  return <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
