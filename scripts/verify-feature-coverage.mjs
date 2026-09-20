import fs from "node:fs";

function read(path){return fs.existsSync(path)?fs.readFileSync(path,"utf8"):"";}
function has(path,...tokens){const c=read(path);return Boolean(c)&&tokens.every(t=>c.includes(t));}
function any(path,...tokens){const c=read(path);return Boolean(c)&&tokens.some(t=>c.includes(t));}
function exists(path){return fs.existsSync(path);}

const checks=[
 ["01 Core hierarchy",has("supabase/schema.sql","create table goals","create table projects","create table tasks","create table habits")],
 ["02 Command Center",exists("app/page.tsx")],
 ["03 AI priority engine",has("lib/priority.ts","priorityScore","whyPriority")],
 ["04 Daily AI planner",exists("app/api/ai/daily-plan/route.ts")&&exists("app/today/page.tsx")],
 ["05 Inbox / brain dump",exists("app/quick-add/page.tsx")&&has("app/quick-add/page.tsx","Smart Capture","Voice")],
 ["06 Task system",exists("app/tasks/page.tsx")&&has("app/tasks/page.tsx","deadline","recurrence","estimate_min")],
 ["07 Eisenhower matrix",exists("app/matrix/page.tsx")],
 ["08 Focus mode",exists("app/focus/page.tsx")&&has("app/focus/page.tsx","Pause","Blocked","Distraction")],
 ["09 Hair recovery",exists("app/hair/page.tsx")],
 ["10 Testosterone / fitness tracking",exists("app/health/page.tsx")&&has("app/health/page.tsx","sleep","energy")],
 ["11 Health Vault",exists("app/health-vault/page.tsx")],
 ["12 Self-control",exists("app/self-control/page.tsx")],
 ["13 Money recovery CRM",exists("app/money/page.tsx")],
 ["14 Follow-up escalation",has("app/api/cron/reminders/route.ts","escalation(","money follow-up")],
 ["15 Follow-up history",has("app/money/page.tsx","receivable_followups")],
 ["16 Business command center",exists("app/business/page.tsx")&&has("app/business/page.tsx","Today Operations","Government Documents","CRM Development")],
 ["17 Waiting For",exists("app/waiting/page.tsx")],
 ["18 Family OS",exists("app/family/page.tsx")],
 ["19 Baby dashboard",has("app/family/page.tsx","baby_records")],
 ["20 Family responsibility",has("app/family/page.tsx","family_tasks")],
 ["21 Europe command center",exists("app/europe/page.tsx")],
 ["22 Europe pipeline",has("app/europe/page.tsx","Research","Shortlisted","Preparing","Application","Submitted","Waiting","Approved","Rejected")],
 ["23 Document checklist",has("app/europe/page.tsx","migration_documents")],
 ["24 Goal system",exists("app/goals/page.tsx")&&has("app/goals/page.tsx","goal_milestones")],
 ["25 Goal health indicator",has("app/goals/page.tsx","On Track","At Risk","Behind","Paused","Completed")],
 ["26 Habit system",exists("app/habits/page.tsx")&&exists("lib/habits.ts")],
 ["27 Flexible streak",has("lib/habits.ts","recoveryScore")],
 ["28 Bad habit reduction",exists("app/self-control/page.tsx")&&exists("app/habits/page.tsx")],
 ["29 Time tracking",exists("app/time/page.tsx")&&has("app/time/page.tsx","time_entries","focus_sessions")],
 ["30 Energy tracking",has("supabase/schema.sql","morning_checkins")&&exists("app/today/page.tsx")],
 ["31 AI personal coach",exists("app/coach/page.tsx")&&exists("app/api/ai/coach/route.ts")],
 ["32 AI weekly review",exists("app/api/ai/weekly-review/route.ts")&&exists("app/reviews/page.tsx")],
 ["33 Monthly life review",has("app/reviews/page.tsx","monthly_reviews")],
 ["34 Life Score",has("app/page.tsx","lifeScoreEnabled")],
 ["35 Morning check-in",has("app/today/page.tsx","morning","check")],
 ["36 Night review",exists("app/reviews/page.tsx")&&has("app/reviews/page.tsx","daily_reviews")],
 ["37 Notification engine",exists("app/notifications/page.tsx")&&exists("app/api/cron/reminders/route.ts")],
 ["38 Smart snooze",has("app/notifications/page.tsx","10m","1h","Tonight","Tomorrow","Reschedule","Delegate")],
 ["39 Escalating reminders",has("app/api/cron/reminders/route.ts","12","17","critical")],
 ["40 DND intelligence",has("app/settings/page.tsx","Do Not Disturb")&&has("app/api/cron/reminders/route.ts","notification_dnd_blocks")],
 ["41 Calendar",exists("app/calendar/page.tsx")&&has("app/calendar/page.tsx","day","week","month","timeline")],
 ["42 Projects",exists("app/projects/page.tsx")],
 ["43 Dependencies",has("app/tasks/page.tsx","blocked_by")||exists("app/waiting/page.tsx")],
 ["44 Delegation",has("app/tasks/page.tsx","responsible")&&has("app/notifications/page.tsx","Delegate")],
 ["45 Shared family tasks",has("app/family/page.tsx","responsible","family_tasks")],
 ["46 Private areas",exists("app/privacy/page.tsx")&&exists("components/privacy-gate.tsx")],
 ["47 Journal text/voice/photo",has("app/journal/page.tsx","Voice","Photo / Camera","journal_entries")],
 ["48 Search everything",exists("app/search/page.tsx")],
 ["49 Universal timeline",exists("app/timeline/page.tsx")],
 ["50 Dashboard widgets",has("app/settings/page.tsx","Home dashboard widgets")&&has("app/page.tsx","homeWidgets")],
 ["51 Mobile PWA",exists("public/manifest.webmanifest")&&exists("app/mobile/page.tsx")],
 ["52 Offline mode",exists("lib/sync-queue.ts")&&exists("lib/private-offline.ts")&&exists("components/offline-sync.tsx")],
 ["53 Multi-device realtime",exists("lib/use-realtime-refresh.ts")],
 ["54 Data backup",exists("app/api/backups/create/route.ts")&&has("app/settings/page.tsx","Export JSON","Export CSV","Health JSON","Finance JSON")],
 ["55 Security",has("supabase/schema.sql","enable row level security")&&exists("middleware.ts")],
 ["56 Database structure",exists("supabase/schema.sql")],
 ["57 AI approval architecture",has("app/quick-add/page.tsx","Confirm & Save")],
 ["58 Automation engine",exists("app/automations/page.tsx")],
 ["59 Smart rules builder",has("app/automations/page.tsx","trigger","action")],
 ["60 Achievement system",exists("app/progress/page.tsx")],
 ["61 Future agent hooks",exists("app/api/ai/daily-plan/route.ts")&&exists("app/api/ai/weekly-review/route.ts")],
 ["62 Final home layout",exists("app/page.tsx")],
 ["63 Weekly planning mode",has("app/reviews/page.tsx","weekly")],
 ["64 Principle / user control",has("app/quick-add/page.tsx","Nothing is saved until you confirm.")],
 ["A Waste Guard",exists("app/expenses/page.tsx")&&has("app/expenses/page.tsx","money_expenses","avoid_next_time")],
 ["B Light mode contrast",has("app/globals.css",':root[data-theme="light"]','.nav-item span','.icon-btn') ],
 ["C Mobile Tasks & Notes quick view",exists("app/mobile/page.tsx")&&has("public/manifest.webmanifest","Tasks & Notes","Sticky Notes")],
 ["D Water reminders",has("app/health-planner/page.tsx","water_logs","Water tracker")&&has("app/api/cron/reminders/route.ts",'routine.kind === "water"')],
 ["E Medicine reminders",has("app/health-planner/page.tsx",'kind==="medicine"')&&has("app/api/cron/reminders/route.ts",'routine.kind === "medicine"')],
 ["F Diet plan",has("app/health-planner/page.tsx","diet_plan_items","meal")],
 ["G Sleep tracker/reminders",has("app/health-planner/page.tsx","sleep_sessions")&&has("app/api/cron/reminders/route.ts",'routine.kind === "sleep"')],
 ["H Single Supabase source of truth",has("lib/supabase/client.ts","createBrowserClient")&&exists("lib/offline.ts")],
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?"PASS":"FAIL"}  ${name}`);
if(failed.length){
 console.error(`\nFeature coverage failed: ${failed.length} check(s)`);
 process.exit(1);
}
console.log(`\nFeature coverage passed: ${checks.length}/${checks.length}`);
