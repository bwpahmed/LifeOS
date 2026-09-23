"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { BackHome,Panel } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentWorkspace,peekWorkspaceContext } from "@/lib/supabase/workspace";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { todayInTZ } from "@/lib/timezone";
import { expenseMonthStats } from "@/lib/waste";

type Expense={id:string;date:string;amount:number;category:string;merchant:string|null;note:string|null;is_waste:boolean;waste_reason:string|null;avoid_next_time:string|null;recurring:boolean;created_at:string};
const CATEGORIES=["Food","Shopping","Subscriptions","Transport","Entertainment","Fees","Business","Family","Health","Other"];
function aed(n:number){return new Intl.NumberFormat("en-AE",{style:"currency",currency:"AED",maximumFractionDigits:0}).format(n);}

export default function ExpensesPage(){
 const cachedWorkspace=peekWorkspaceContext();const[workspaceId,setWorkspaceId]=useState(cachedWorkspace?.workspaceId||"");const[userId,setUserId]=useState(cachedWorkspace?.user.id||"");const[rows,setRows]=useState<Expense[]>([]);const[error,setError]=useState("");const[msg,setMsg]=useState("");
 const[date,setDate]=useState(todayInTZ());const[amount,setAmount]=useState<number|undefined>();const[category,setCategory]=useState("Other");const[merchant,setMerchant]=useState("");const[note,setNote]=useState("");const[isWaste,setIsWaste]=useState(true);const[reason,setReason]=useState("");const[avoid,setAvoid]=useState("");const[recurring,setRecurring]=useState(false);

 const load=useCallback(async()=>{try{const sb=supabaseBrowser();const ctx=await currentWorkspace(sb);if(!ctx){setWorkspaceId("");return;}setWorkspaceId(ctx.workspaceId);setUserId(ctx.user.id);const{data,error:q}=await sb.from("money_expenses").select("id,date,amount,category,merchant,note,is_waste,waste_reason,avoid_next_time,recurring,created_at").eq("workspace_id",ctx.workspaceId).order("date",{ascending:false}).order("created_at",{ascending:false}).limit(500);if(q)throw q;setRows((data||[]) as Expense[]);}catch(e){setError(e instanceof Error?e.message:"Could not load expenses");}},[]);
 useEffect(()=>{void load();},[load]);useRealtimeRefresh(["money_expenses"],load,Boolean(workspaceId));

 async function add(e:FormEvent){e.preventDefault();if(!workspaceId||!userId||!amount||amount<=0)return;const sb=supabaseBrowser();const{error:q}=await sb.from("money_expenses").insert({workspace_id:workspaceId,created_by:userId,date,amount,category,merchant:merchant.trim()||null,note:note.trim()||null,is_waste:isWaste,waste_reason:isWaste?(reason.trim()||null):null,avoid_next_time:isWaste?(avoid.trim()||null):null,recurring});if(q)setError(q.message);else{setAmount(undefined);setMerchant("");setNote("");setReason("");setAvoid("");setRecurring(false);setMsg("Expense saved.");await load();}}
 async function edit(r:Expense){const raw=prompt("Amount AED",String(r.amount));if(raw==null)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0)return;const reason=prompt("Why was this waste? Leave blank if not waste.",r.waste_reason||"");if(reason==null)return;const avoid=prompt("How will you avoid it next time?",r.avoid_next_time||"");if(avoid==null)return;const sb=supabaseBrowser();const{error:q}=await sb.from("money_expenses").update({amount,is_waste:Boolean(reason.trim()),waste_reason:reason.trim()||null,avoid_next_time:avoid.trim()||null,updated_at:new Date().toISOString()}).eq("id",r.id);if(q)setError(q.message);else await load();}
 async function remove(r:Expense){if(!confirm(`Delete expense ${aed(r.amount)}?`))return;const sb=supabaseBrowser();const{error:q}=await sb.from("money_expenses").delete().eq("id",r.id);if(q)setError(q.message);else await load();}

 const month=todayInTZ().slice(0,7);
 const stats=useMemo(()=>expenseMonthStats(rows,month),[rows,month]);
 const wasteRows=rows.filter(r=>r.is_waste);

 return <main className="page-root"><BackHome/><div className="section-heading"><div><span className="label">MONEY WASTE GUARD</span><h2>Remember what not to waste money on</h2></div><Link href="/money" className="ghost-btn">Receivables</Link></div>
 {error&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{msg&&<p className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{msg}</p>}
 {!workspaceId?<p className="panel p-5 text-sm">Sign in first. <Link href="/login" className="text-btn">Login →</Link></p>:<>
 <div className="grid g4"><article className="metric-card"><span>Total spent this month</span><strong>{aed(stats.spent)}</strong><small>all tracked expenses</small></article><article className="metric-card accent-red"><span>Waste this month</span><strong>{aed(stats.waste)}</strong><small>{stats.wastePct}% of tracked spending</small></article><article className="metric-card accent-amber"><span>Recurring waste</span><strong>{aed(stats.recurringWaste)}</strong><small>subscriptions / repeating leaks</small></article><article className="metric-card accent-green"><span>Lessons saved</span><strong>{stats.lessons}</strong><small>avoid-next-time notes</small></article></div>

 <div className="grid wide mt"><Panel title="Add expense" kicker="NORMAL OR WASTE"><form onSubmit={add} className="grid gap-2 md:grid-cols-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><input required type="number" min="0.01" step=".01" value={amount??""} onChange={e=>setAmount(e.target.value?Number(e.target.value):undefined)} placeholder="Amount AED"/><select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select><input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="Merchant / place"/><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you spend on?" className="md:col-span-2"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isWaste} onChange={e=>setIsWaste(e.target.checked)}/>Mark as unnecessary / waste</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>Recurring expense</label>{isWaste&&<><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why was this waste? e.g. impulse order, unused subscription"/><textarea value={avoid} onChange={e=>setAvoid(e.target.value)} placeholder="Next time: what rule will stop this?"/></>}<button className="primary-btn md:col-span-2">Save expense</button></form></Panel>
 <Panel title="Anti-waste memory" kicker="DON'T REPEAT IT"><div className="list-stack">{wasteRows.slice(0,12).map(r=><div key={r.id} className="priority-item"><span className="priority-number">₳</span><div><strong>{aed(r.amount)} · {r.category}{r.merchant?" · "+r.merchant:""}</strong><small>{r.date}{r.waste_reason?" · "+r.waste_reason:""}{r.avoid_next_time?" · Next time: "+r.avoid_next_time:""}</small></div><div className="flex gap-1"><button onClick={()=>edit(r)} className="mini-btn">Edit</button><button onClick={()=>remove(r)} className="mini-btn text-red-300">Delete</button></div></div>)}{!wasteRows.length&&<div className="empty-state"><b>No waste recorded</b>That is the preferred state, strangely enough.</div>}</div></Panel></div>

 <Panel title="Expense history" kicker="ALL TRACKED SPENDING"><div className="list-stack">{rows.map(r=><div key={r.id} className="priority-item"><span className="priority-number">{r.is_waste?"!":"✓"}</span><div><strong>{aed(r.amount)} · {r.category}</strong><small>{r.date}{r.merchant?" · "+r.merchant:""}{r.note?" · "+r.note:""}</small></div><span className={`pill ${r.is_waste?"red":"green"}`}>{r.is_waste?"Waste":"Useful"}</span></div>)}</div></Panel>
 </>}</main>;
}
