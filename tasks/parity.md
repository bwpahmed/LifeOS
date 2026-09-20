# LifeOS Screenshot + 64-Section Parity Matrix

Status legend:
- **Working**: implementation exists and is wired to Supabase/current app flow; final smoke evidence still tracked in Task 24.
- **Partial**: meaningful implementation exists but one or more requested behaviors are missing.
- **Future/platform**: the source specification itself labels it later/future or the web platform cannot provide the exact native behavior.
- **Principle**: architecture/product rule rather than a separate screen.

## Screenshot routes

| Screenshot | Route | Current status | Notes |
|---|---|---|---|
| Home command center | `/` | Working | Must Win, alerts, money/health/focus/Europe, waiting, goals, week |
| Today | `/today` | Working | Daily plan, morning check-in, rebuild, focus link, recovery |
| Tasks | `/tasks` | Working | CRUD/status/priority/filtering |
| Goals | `/goals` | Working | Goal CRUD, milestones, derived progress |
| Projects | `/projects` | Working | Project CRUD, linked tasks/progress |
| Money Recovery | `/money` | Working | Receivables, payments, followups, history, evidence |
| Health | `/health` | Working | Daily entries, habits, labs, trends; links to planner/private modules |
| Family | `/family` | Working | Members/tasks/baby records |
| Europe | `/europe` | Working | Countries/routes/docs/readiness |
| Calendar | `/calendar` | Partial | Month + Agenda implemented; Day/Week and drag/drop still to close |
| Timeline | `/timeline` | Working | Chronological activity |
| Automations | `/automations` | Partial | Rules + run/delete; full WHEN/IF/THEN builder still to close |
| Reviews | `/reviews` | Working | Daily + weekly/monthly snapshots; AI narrative parity pending |
| Settings | `/settings` | Working | theme, focus, quiet hours, backup/import, feature directory |

## 64-section functional specification

| # | Spec | Route/data | Status | Gap / evidence target |
|---:|---|---|---|---|
| 1 | Core Idea | whole app | Principle | Supabase source of truth + hierarchy present |
| 2 | Main Dashboard | `/` | Working | screenshot hierarchy present |
| 3 | AI Priority Engine | `lib/priority.ts`, tasks/home | Working | deterministic 0-100 + reasons + manual importance |
| 4 | Daily AI Planner | `/today`, AI planner API | Partial | priority plan works; adaptive AI calendar-aware planner requires final audit |
| 5 | Inbox / Brain Dump | `/quick-add` | Working | smart parse + review-before-save + voice |
| 6 | Task System | `/tasks` | Partial | core fields/statuses work; verify attachment/dependency/delegation UI |
| 7 | Eisenhower + AI Priority | `/matrix` | Working | 4-box matrix |
| 8 | Focus Mode | `/focus` | Working | timer/session persistence |
| 9 | Health Command Center | `/health`, `/hair` | Working | health + hair routes |
| 10 | Testosterone / Fitness | `/health` | Working | sleep/steps/weight/waist/protein/stress/energy/labs/trends |
| 11 | Health Vault | `/health-vault` | Working | private document storage |
| 12 | Self-Control | `/self-control` | Working | urge/trigger/response/outcome analytics |
| 13 | Money Recovery CRM | `/money` | Working | receivables/payment/followup/evidence |
| 14 | Follow-Up Escalation | reminders + `lib/money.ts` | Working | Normal→Critical logic |
| 15 | Follow-Up History | `/money` | Working | immutable followup/payment history |
| 16 | Business Command Center | `/business` | Working | business sections/tasks/projects |
| 17 | Waiting For | `/waiting` | Working | waiting age/dependencies |
| 18 | Family OS | `/family` | Working | members/tasks/records |
| 19 | Baby Dashboard | `/family` | Working | weight/doctor/vaccine/feed/sleep/milestone/medicine/docs types |
| 20 | Family Responsibility | `/family` | Working | responsible/due/reminder fields |
| 21 | Europe Relocation | `/europe` | Working | countries/routes/documents |
| 22 | Europe Pipeline | `/europe` | Working | statuses |
| 23 | Document Checklist | `/europe` | Working | readiness/status/expiry |
| 24 | Goal System | `/goals` | Working | target/deadline/why/milestones/progress |
| 25 | Goal Health Indicator | `/goals` | Working | On Track/At Risk/Behind/Paused/Completed |
| 26 | Habit System | `/habits` | Working | daily/weekly/specific/X-times/monthly |
| 27 | Flexible Streak | `lib/habits.ts`, `/habits` | Working | consistency/recovery |
| 28 | Bad Habit Reduction | habits + `/self-control` | Partial | self-control works; general reduce/limit/avoid/replace habit UI audit pending |
| 29 | Time Tracking | `/time`, focus sessions | Working | manual/focus time categories |
| 30 | Energy Tracking | `/today`, `morning_checkins`, health | Working | energy/mood/sleep quality |
| 31 | AI Personal Coach | `/coach` | Working | grounded app-data coach |
| 32 | AI Weekly Review | `/reviews` | Partial | metrics/recommendation exist; verify AI-generated grounded narrative |
| 33 | Monthly Life Review | `/reviews` | Working | current vs previous |
| 34 | Life Score | `/`, `/progress` | Working | directional/optional score |
| 35 | Morning Check-In | `/today` | Working | under-60s fields |
| 36 | Night Review | `/reviews` | Working | accomplishment/incomplete/blocker/energy/improve |
| 37 | Notification Engine | `/notifications`, cron | Working | severity levels and references |
| 38 | Smart Snooze | `/notifications` | Working | Done/10m/1h/Tonight/Tomorrow/Reschedule/Delegate |
| 39 | Escalating Reminders | cron/schedulers | Working | task/money escalation |
| 40 | Don't Disturb Intelligence | settings + `notification_dnd_blocks` | Working | quiet hours + family/deep-work/sleep blocks |
| 41 | Calendar | `/calendar` | Partial | Month/Agenda + Google; Day/Week + drag/drop missing |
| 42 | Projects | `/projects` | Working | progress from tasks |
| 43 | Dependencies | tasks/`task_dependencies` | Partial | data model + blocked state; verify full dependency UI |
| 44 | Delegation | tasks/notifications | Partial | responsible/assigned fields; verify assignment UI + notification |
| 45 | Shared Family Tasks | `/family` | Partial | shared workspace model exists; single-owner deployment means external assignee notifications limited |
| 46 | Private Areas | PrivacyGate + RLS | Working | PIN/passkey UI + server RLS |
| 47 | Journal | `/journal` | Partial | text/edit/delete; voice/photo capture needs closure |
| 48 | Search Everything | `/search` | Partial | core entities searchable; verify attachments/followups/notes coverage |
| 49 | Universal Timeline | `/timeline` | Working | activity/payment/followup/journal events |
| 50 | Dashboard Widgets | home/settings | Missing | user-selectable widgets not yet implemented |
| 51 | Mobile App Experience | PWA/mobile nav | Working | installable shell, Home/Today/+/Progress/More |
| 52 | Offline Mode | cache + sync queue | Partial | tasks/habits supported; private/offline-note scope intentionally constrained |
| 53 | Multi-Device | Supabase realtime | Working | cloud + realtime |
| 54 | Data Backup | settings + server backup | Partial | JSON/CSV/print/daily backups; separate health/finance export audit pending |
| 55 | Security | Supabase/RLS/private storage | Working | RLS/auth/encrypted connection storage |
| 56 | Database Structure | Supabase schema | Working | listed domains represented |
| 57 | AI Architecture | AI service/routes | Working | suggestions/review gate; no silent factual writes |
| 58 | Automation Engine | `/automations` | Working | predefined conditions/actions execute |
| 59 | Smart Rules Builder | `/automations` | Partial | raw trigger/action form exists; structured WHEN/IF/THEN builder missing |
| 60 | Achievement System | none | Missing | meaningful milestone achievements not yet implemented |
| 61 | Future AI Agent | future | Future/platform | source spec explicitly says later advanced agent |
| 62 | Home Final Layout | `/` | Working | canonical command center |
| 63 | Weekly Planning Mode | reviews/planner | Partial | reviews exist; Sunday planning checklist/outcomes missing |
| 64 | Main Principle | product | Principle | Right thing, right time, consistently |

## User-requested additions in current task

| Feature | Current implementation | Status |
|---|---|---|
| Waste-of-money memory | `/expenses` + `money_expenses` | Implemented, verification/visibility polish pending |
| Light mode readability | global theme overrides | Implemented, consolidation/route audit pending |
| Mobile task/note widget-like access | `/mobile` + PWA shortcuts | Implemented; true native OS widget is not exposed by standard PWA APIs |
| Water reminder/tracker | `/health-planner` + scheduler | Implemented, configurable goal polish pending |
| Diet plan | `/health-planner` | Implemented |
| Medicine reminder | `/health-planner` + scheduler | Implemented |
| Sleep tracker | `/health-planner` | Implemented |
| One source of truth | Supabase | Working; local storage only theme/cache/offline queue |
