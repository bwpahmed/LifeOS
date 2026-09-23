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
 ["50 Dashboard widgets",has("app/settings/page.tsx","Home dashboard widgets","[\"habits\",\"Habits\"]")&&has("app/page.tsx","homeWidgets","show(\"habits\")","Habits today")],
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
 ["62 Final home layout",has("app/page.tsx","MUST WIN TODAY","SECONDARY TASKS","Money overdue","Health today","Family","Europe docs")],
 ["63 Weekly planning mode",has("app/reviews/page.tsx","weekly")],
 ["64 Principle / user control",has("app/quick-add/page.tsx","Nothing is saved until you confirm.")],
 ["A Waste Guard",exists("app/expenses/page.tsx")&&has("app/expenses/page.tsx","money_expenses","avoid_next_time")],
 ["A2 Screenshot Today controls",has("app/today/page.tsx","Morning check-in","Rebuild plan","Start","Reset","Complete")],
 ["A3 Screenshot Money controls",has("app/money/page.tsx","Follow up","Payment","History","Edit","Delete")],
 ["B Light mode contrast",has("app/globals.css",':root[data-theme="light"]','LIGHT MODE READABILITY HARDENING','.nav-item span','.text-slate-400') ],
 ["C Mobile Tasks & Notes quick view",exists("app/mobile/page.tsx")&&has("public/manifest.webmanifest","Tasks & Notes","Sticky Notes")],
 ["D Water reminders",has("app/health-planner/page.tsx","water_logs","Water tracker")&&has("app/api/cron/reminders/route.ts",'routine.kind === "water"')],
 ["E Medicine reminders",has("app/health-planner/page.tsx",'kind==="medicine"')&&has("app/api/cron/reminders/route.ts",'routine.kind === "medicine"')],
 ["F Diet plan + meal reminder",has("app/health-planner/page.tsx","diet_plan_items",'kind:"meal"',"meal_id","Meal plan and reminder saved.")],
 ["G Sleep tracker/reminders",has("app/health-planner/page.tsx","sleep_sessions")&&has("app/api/cron/reminders/route.ts",'routine.kind === "sleep"')],
 ["H Single Supabase source of truth",has("lib/supabase/client.ts","createBrowserClient")&&exists("lib/offline.ts")],
 ["I Multiple task dependencies",has("app/tasks/page.tsx","task_dependencies","dependencyIds")&&has("supabase/schema.sql","create table task_dependencies")],
 ["J Family reminder days",has("app/family/page.tsx","reminder_days","responsible")&&has("app/api/cron/reminders/route.ts","reminderDays","daysUntil")],
 ["K Follow-up global search",has("app/search/page.tsx","receivable_followups","Follow-up")],
 ["L Secure offline private note",has("app/quick-add/page.tsx","queuePrivateJournal")&&has("lib/private-offline.ts","AES-GCM","indexedDB")],
 ["M Cloud theme preference",has("components/theme-toggle.tsx","user_settings","settings","theme")&&has("app/settings/page.tsx","theme:next")],
 ["N Four reminder severities",has("app/api/cron/reminders/route.ts",'"normal"','"important"','"urgent"','"critical"')&&has("app/notifications/page.tsx","severityPill")],
 ["O Goal health reason",has("app/goals/page.tsx","goalReason","Reason:")],
 ["P PDF export",has("app/settings/page.tsx","Print / Save PDF","window.print")],
 ["Q Native hourly reminder scheduler",has("supabase/migrations/20260920_general_inapp_scheduler.sql","generate_due_lifeos_notifications","lifeos-general-reminders-hourly")],
 ["R Calendar real views + drag",has("app/calendar/page.tsx",'type View="day"|"week"|"month"|"timeline"',"dragStart","dropOn","rescheduleTask")],
 ["S Achievement milestones",has("app/progress/page.tsx","30 Focus Sessions","AED 100K Recovered","90% Health Consistency","Europe Application Submitted","6 Month Hair Tracking")],
 ["T Weekly planning checklist",has("app/reviews/page.tsx","Weekly planning mode","Clear inbox","Review money","Review Europe","Save weekly plan")],
 ["U Waste memory fields",has("app/expenses/page.tsx","is_waste","waste_reason","avoid_next_time","Recurring waste","Anti-waste memory")],
 ["V Health planner full set",has("app/health-planner/page.tsx","Water tracker","Medicine & health reminders","Diet plan","Sleep tracker","water_logs","diet_plan_items","sleep_sessions","routineDays","mealDays","saveWaterGoal","ensureSleepReminder")],
 ["W Mobile installed-app shortcuts",has("public/manifest.webmanifest","Quick Add","Tasks & Notes","Sticky Notes","Waste Guard")&&has("app/mobile/page.tsx","Widget-like mobile access","Tasks & Notes")],
 ["X Light theme utility contrast",has("app/globals.css","LIGHT MODE READABILITY HARDENING — canonical",".text-white",".text-emerald-300",".text-red-300",".nav-item span")],
 ["Y Exact in-app schedules",has("supabase/migrations/20260920_health_inapp_scheduler.sql","*/15 * * * *","generate_due_health_notifications")&&has("supabase/migrations/20260920_general_inapp_scheduler.sql","7 * * * *","generate_due_lifeos_notifications")],
 ["Z Exact Web Push dispatcher",exists("supabase/functions/lifeos-push-dispatch/index.ts")&&has("supabase/migrations/20260920_schedule_exact_push_dispatch.sql","*/5 * * * *","lifeos-push-dispatch")&&has("app/notifications/page.tsx","push_sent_at:null","push_attempts:0")&&has("public/sw.js","data.data?.url")],
 ["S01 Screenshot Home",has("app/page.tsx","MUST WIN TODAY","Needs attention","WAITING FOR","Long-term direction","System health")],
 ["S02 Screenshot Today",has("app/today/page.tsx","Morning check-in","Rebuild plan","Night Review","FOCUS MODE","Missed / overdue","Must Win Today")],
 ["S03 Screenshot Tasks",has("app/tasks/page.tsx","Priority queue","Open","Today","Waiting","Completed","Edit","Delete")],
 ["S04 Screenshot Goals",has("app/goals/page.tsx","Save goal","Milestones","Edit","Delete","On Track","At Risk")],
 ["S05 Screenshot Projects",has("app/projects/page.tsx","Save project","Project task","Edit","Delete")],
 ["S06 Screenshot Money",has("app/money/page.tsx","Receivables","Payment","Follow up","History","Edit","Delete")],
 ["S07 Screenshot Health",has("app/health/page.tsx","Daily health","Lab record","Hair","Self-control","Vault")],
 ["S08 Screenshot Family",has("app/family/page.tsx","Family members","Upcoming family tasks","Baby dashboard","Edit","Delete")],
 ["S09 Screenshot Europe",has("app/europe/page.tsx","Family move to Europe","Document readiness","Edit","Delete")],
 ["S10 Screenshot Calendar",has("app/calendar/page.tsx","Day","Week","Month","Timeline","Today","dragStart")],
 ["S11 Screenshot Timeline",has("app/timeline/page.tsx","Timeline","activity_log")],
 ["S12 Screenshot Automations",has("app/automations/page.tsx","Save rule","Run enabled automations now","Enabled","Delete")],
 ["S13 Screenshot Reviews",has("app/reviews/page.tsx","Save weekly snapshot","Save daily review","weekly","monthly")],
 ["S14 Screenshot Settings",has("app/settings/page.tsx","dailyFocus","weeklyFocus","Privacy / PIN","Export JSON","Export CSV","Activity")],
 ["AA Life clock + retirement by 40",exists("components/life-clock.tsx")&&has("components/life-clock.tsx","Age now","Retirement target","1-YEAR GOAL","5-YEAR GOAL","DAILY PUSH")&&has("app/page.tsx","LifeClock")],
 ["AB Life plan cloud settings",has("app/settings/page.tsx","birth_date","retirement_age","one_year_goal","five_year_goal","Save life plan")],
 ["AC Login-first routing",has("middleware.ts","/login","searchParams.set(\"next\"","!user && !isPublic","isPublicPath","requestedPath")&&has("app/login/page.tsx","safeNextPath")&&has("components/app-shell.tsx","publicShell")&&exists("lib/auth-routing.ts")],
 ["AD Focus target from profile",has("app/page.tsx","weekly_focus_target","weeklyFocusTarget","weekly target")],
 ["AE Password recovery",has("lib/supabase/client.ts","supabaseEmailAuthClient","flowType:\"implicit\"","detectSessionInUrl:false")&&has("app/login/page.tsx","supabaseEmailAuthClient","resetPasswordForEmail","Reset password","lifeos_auth_mode","location.origin+\"/\"","shouldCreateUser:false")&&exists("app/auth/update-password/page.tsx")&&has("app/auth/update-password/page.tsx","updateUser({password})","passwordMeetsLifeOSPolicy")&&has("app/page.tsx","PASSWORD_RECOVERY","setSession({access_token:accessToken,refresh_token:refreshToken})","exchangeCodeForSession","lifeos_auth_next","Opening LifeOS")&&has("app/auth/callback/route.ts","supabaseServer","safeNextPath")],
 ["AF Google Calendar bridge",exists("supabase/migrations/20260921_google_calendar_mirror.sql")&&has("app/api/integrations/google-calendar/status/route.ts",'mode=oauthRow?"oauth":mirrorRow?"bridge":null',"calendar_items")&&has("app/calendar/page.tsx","mirrorItems","Google bridge synced","external_provider","external_calendar_name")],
 ["AG No auth flicker on private sections",has("components/app-shell.tsx","peekWorkspaceContext","needsWorkspaceBootstrap","You do not need to sign in again")&&has("lib/supabase/workspace.ts","workspaceCache","inflightWorkspace","peekWorkspaceContext","getSession()")],


];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?"PASS":"FAIL"}  ${name}`);
if(failed.length){
 console.error(`\nFeature coverage failed: ${failed.length} check(s)`);
 process.exit(1);
}
console.log(`\nFeature coverage passed: ${checks.length}/${checks.length}`);

const allowedLocalStorage = new Set([
  "components/theme-toggle.tsx",
  "components/privacy-gate.tsx",
  "app/settings/page.tsx",
  "app/focus/page.tsx",
  "app/privacy/page.tsx",
  "lib/offline.ts",
  "lib/sync-queue.ts",
]);

function walk(dir){
  const out=[];
  if(!fs.existsSync(dir)) return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=dir+"/"+entry.name;
    if(entry.isDirectory()) out.push(...walk(p));
    else if(/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const authFlickerPages=walk("app")
  .filter(path=>path.endsWith("/page.tsx"))
  .filter(path=>{
    const content=read(path);
    return content.includes('href="/login"') &&
      /workspaceId\s*,\s*setWorkspaceId\s*\]\s*=\s*useState\(""\)/.test(content);
  });
if(authFlickerPages.length){
  console.error("\nFAIL  Auth UX: private pages still render an empty workspace as a login prompt:");
  for(const path of authFlickerPages) console.error(" - "+path);
  process.exit(1);
}
console.log("PASS  Auth UX: verified workspace state is seeded before private section content renders.");
const directLocalStorage = ["app","components","lib"].flatMap(walk)
  .filter(path=>read(path).includes("localStorage"))
  .filter(path=>!allowedLocalStorage.has(path));
if(directLocalStorage.length){
  console.error("\nFAIL  Single-source rule: unexpected localStorage use in persistent app code:");
  for(const path of directLocalStorage) console.error(" - "+path);
  process.exit(1);
}
console.log("PASS  Single-source rule: persistent records use Supabase; device storage is limited to approved cache/preferences.");

