# LifeOS implementation + verification matrix — 2026-09-20

This is the canonical engineering checklist for the uploaded LifeOS Advanced specification and the supplied reference screenshots.

## Verification rule

A feature is marked **Verified** only when all applicable evidence exists:
1. implementation is present and wired to Supabase;
2. CI passes tests, TypeScript, SQL verification, feature coverage and production build;
3. production schema/migration exists with RLS where data is persistent;
4. critical new paths have live transactional smoke evidence when they touch production data.

Supabase is the persistent source of truth. Browser storage is limited to cache, offline queues and device-only preferences/locks.

## Workstream 1 — Screenshot / navigation parity

| Area | Status | Evidence |
|---|---|---|
| Home command center | Verified | canonical hero, Must Win, alerts, waiting, goals, system health |
| Today | Verified | planner, morning check-in, rebuild, focus, recovery |
| Tasks | Verified | CRUD, status filters, score, edit/delete, attachments/dependencies |
| Goals | Verified | CRUD, milestones, progress/status/reason |
| Projects | Verified | CRUD, linked tasks/progress |
| Money | Verified | receivables, payments, follow-ups, history, evidence |
| Health | Verified | daily health, labs, hair, self-control, vault, planner |
| Family | Verified | members, tasks, reminders, baby records |
| Europe | Verified | countries, routes, documents/readiness |
| Calendar | Verified | Day / Week / Month / Timeline + task drag/reschedule |
| Timeline | Verified | chronological app activity |
| Automations | Verified | templates + WHEN/IF/THEN conditions + run/delete |
| Reviews | Verified | daily, weekly AI review, monthly comparison, weekly planning |
| Settings | Verified | appearance, focus, DND, backup/import, feature directory |
| Advanced routes | Verified | Sticky Notes, Matrix, Waiting, Health Planner, Vault, Hair, Self-Control, Progress, AI Coach, Notifications, Privacy |

## Workstream 2 — 64-section LifeOS Advanced specification

All 64 specification sections are covered by `scripts/verify-feature-coverage.mjs` and the current CI gate. Key implementation areas:

- hierarchy: Life Area → Goal → Project → Milestone → Task/Habit
- deterministic priority + reasons + manual importance
- AI planner / coach / weekly review with user approval for writes
- full task system, recurrence, dependencies, delegation labels, attachments
- focus/time/energy tracking
- health/hair/labs/vault/self-control
- receivables/escalation/history
- business/waiting/family/baby/Europe
- flexible habits + bad-habit reduction modes
- morning + night + weekly + monthly review flows
- notifications, smart snooze, escalation and DND
- calendar day/week/month/timeline
- private areas, global search and universal timeline
- configurable Home widgets
- PWA/offline/multi-device/backup/security
- automation rules, achievements and weekly planning

Future-agent hooks from section 61 are present as planner/coach/review architecture. Fully autonomous Gmail scanning remains an optional future external integration, consistent with the source specification.

## Workstream 3 — User-requested additions

| Request | Status | Evidence |
|---|---|---|
| Waste-of-money memory | Verified | `/expenses`, `money_expenses`, waste reason, avoid-next-time rule, recurring waste |
| Waste memory on phone | Verified | `/mobile` shows latest anti-waste lessons |
| Light mode readable | Verified | global contrast hardening for text, icons, controls and legacy Tailwind utility colors |
| Mobile tasks/notes | Verified web equivalent | compact `/mobile` route + installed PWA shortcuts |
| Water tracker/reminders | Verified | target, quick logs, scheduled routine notifications |
| Medicine reminders | Verified | dose/details, times/days, completion logs, scheduler |
| Diet plan | Verified | meals, days/times, optional calories/protein, linked reminder routine |
| Sleep tracker | Verified | bed/wake, duration, quality, notes, bedtime reminder |
| Sticky permanent notes | Verified | edit/pin/archive; no DELETE RLS policy |
| Single source of truth | Verified | Supabase authoritative; unexpected persistent localStorage fails feature verifier |
| Google Calendar code | Implemented | OAuth/token encryption/event merge exists |
| Google Calendar account actually linked | **External action still required** | production `external_connections` currently has no Google Calendar connection row |
| Native Android/iOS home-screen widget | **Platform limitation** | normal PWA APIs do not expose a true native widget; compact mobile screen + shortcuts are provided |

## Live production verification evidence

Production project: `fdtbftuxziicubztgcde`

- owner account has one personal owner workspace
- application tables including Waste Guard / Health Planner / Time / DND have RLS enabled
- live transactional owner CRUD smoke passed for Waste Guard, health routines/logs, water, diet, sleep, tasks, time entries, morning check-in, Sticky Notes, calendar and private journal
- Sticky Note hard-delete protection was proven in transaction
- cross-user RLS denial was proven for Waste Guard, Health Planner and Sticky Notes
- invalid health clock value `99:99` is rejected at database level
- health reminder scheduler generated the expected medicine notification
- general scheduler generated the expected critical task notification
- cron jobs active:
  - `lifeos-health-reminders-15m`
  - `lifeos-general-reminders-hourly`
  - `lifeos-push-dispatch-5m`
- `lifeos-push-dispatch` Edge Function is ACTIVE
- VAPID/project cron secrets are present in Supabase Vault

All smoke-test rows were executed inside transactions and rolled back.

## CI / deployment gate

Current required checks:
- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run verify:sql`
- `npm run verify:features`
- `npm run build`
- AI Policy Gate
- Vercel deployment status

The latest verified head before this documentation update passed all code checks and Vercel deployment.

## Security advisor notes

Two advisor categories remain:
- authenticated SECURITY DEFINER helper warnings for the intentional RLS helper functions used by policies;
- Supabase Auth leaked-password protection is disabled. That setting is controlled in the Supabase Auth dashboard and is not exposed by the connected Supabase tool.

## Merge policy

Do not merge PR #4 into `main` without explicit user approval.
