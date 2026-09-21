"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace } from "@/lib/supabase/workspace";
import { DEFAULT_BIRTH_DATE,DEFAULT_RETIREMENT_AGE,ageParts,dailyPush,daysLived,daysUntilRetirement,retirementDate,retirementProgress } from "@/lib/life-clock";

type PlanSettings={
  birth_date?:string;
  retirement_age?:number;
  one_year_goal?:string;
  five_year_goal?:string;
};

function niceDate(iso:string){
  return new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso+"T12:00:00Z"));
}

export function LifeClock(){
  const[plan,setPlan]=useState<PlanSettings>({birth_date:DEFAULT_BIRTH_DATE,retirement_age:DEFAULT_RETIREMENT_AGE});
  useEffect(()=>{let dead=false;void(async()=>{try{
    const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx||dead)return;
    const q=await sb.from("user_settings").select("settings").eq("user_id",ctx.user.id).maybeSingle();
    if(q.error)throw q.error;
    const s=(q.data?.settings||{}) as Record<string,unknown>;
    if(!dead)setPlan({
      birth_date:typeof s.birth_date==="string"?s.birth_date:DEFAULT_BIRTH_DATE,
      retirement_age:Number.isFinite(Number(s.retirement_age))?Number(s.retirement_age):DEFAULT_RETIREMENT_AGE,
      one_year_goal:typeof s.one_year_goal==="string"?s.one_year_goal:"",
      five_year_goal:typeof s.five_year_goal==="string"?s.five_year_goal:""
    });
  }catch{/* defaults remain useful offline */}})();return()=>{dead=true;};},[]);
  const birth=plan.birth_date||DEFAULT_BIRTH_DATE;
  const retireAge=Number(plan.retirement_age||DEFAULT_RETIREMENT_AGE);
  const age=ageParts(birth);
  const target=retirementDate(birth,retireAge);
  const left=daysUntilRetirement(birth,retireAge);
  const yearsLeft=Math.floor(left/365.2425);
  const monthsLeft=Math.max(0,Math.floor((left-yearsLeft*365.2425)/30.44));
  const progress=retirementProgress(birth,retireAge);

  return <section className="panel mt life-clock">
    <div className="panel-head">
      <div><span className="label">LIFE CLOCK</span><h3>Retire by {retireAge}</h3></div>
      <Link href="/settings#life-plan" className="text-btn">Edit plan →</Link>
    </div>
    <div className="life-clock-grid">
      <div className="life-clock-stat"><span>Age now</span><b>{age.years}y {age.months}m {age.days}d</b><small>{daysLived(birth).toLocaleString()} days lived</small></div>
      <div className="life-clock-stat"><span>Retirement target</span><b>{niceDate(target)}</b><small>{left.toLocaleString()} days · about {yearsLeft}y {monthsLeft}m left</small></div>
      <div className="life-clock-stat"><span>Journey to 40</span><b>{progress}%</b><div className="progress"><i style={{width:progress+"%"}}/></div></div>
    </div>
    <div className="life-plan-grid">
      <div><span className="label">1-YEAR GOAL</span><p>{plan.one_year_goal?.trim()||"Set the one outcome that would make the next 12 months count."}</p></div>
      <div><span className="label">5-YEAR GOAL</span><p>{plan.five_year_goal?.trim()||"Define what financial independence and family life should look like in five years."}</p></div>
    </div>
    <blockquote className="daily-push"><span>DAILY PUSH</span><p>“{dailyPush()}”</p></blockquote>
  </section>;
}
