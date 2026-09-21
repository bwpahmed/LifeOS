"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark"|"light">("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("lifeos-theme") as "dark"|"light"|null) || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("lifeos-theme", next);
    document.documentElement.dataset.theme = next;
  }
  return <button onClick={toggle} className="theme-toggle" aria-label="Toggle light and dark mode">{theme === "dark" ? "☀ Light" : "☾ Dark"}</button>;
}
