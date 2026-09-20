"use client";

import { useEffect,useState } from "react";

type Theme="dark"|"light";

export function ThemeToggle(){
  const[theme,setTheme]=useState<Theme>("dark");
  useEffect(()=>{
    const saved=(localStorage.getItem("lifeos_theme") as Theme|null)||"dark";
    setTheme(saved);
    document.documentElement.dataset.theme=saved;
  },[]);
  function toggle(){
    const next:Theme=theme==="dark"?"light":"dark";
    setTheme(next);
    localStorage.setItem("lifeos_theme",next);
    document.documentElement.dataset.theme=next;
  }
  return <button className="icon-btn" onClick={toggle} title={theme==="dark"?"Use light mode":"Use dark mode"} aria-label="Toggle theme">{theme==="dark"?"☀":"☾"}</button>;
}
