# LifeOS Advanced Habit Studio — acceptance plan and parity audit

**Baseline:** \`main@38b34b3d1bff91ed9adc8354b28e9f2ebe7cc76f\` (premium UI production release).
**Branch:** \`feature/lifeos-advanced-habit-planner-20261011\`
**Policies reviewed:** \`AGENTS.md\`, \`AI_PROJECT_MAP.md\`, \`AI_TEAM.md\`, \`AI_CAPABILITY_STACK.md\`.

## Source of truth
All habit writes and reads use **existing** \`habits\` and \`habit_logs\` tables in the **current Supabase workspace**, resolved through \`currentWorkspace\` and Supabase RLS. \`lib/habits.ts\` remains authoritative for consistency/streak/recovery math; \`lib/habit-planner.ts\` is a pure date/period projection, not a new database. No localStorage, browser-only canonical habit state, duplicate account data, migrations, or parallel reminder scheduler.

## Existing LifeOS capabilities preserved
- Daily/weekly/monthly/flexible target/specific weekdays, build/reduce/limit/avoid/replace
- One-tap current day completion and undo in original tracker
- 30-day historical view, consistency, period streak, recovery score
- Existing app-wide goals, focus, sleep, water, diet, health, automation, calendar, notes, cloud theme and PWA/offline queues
- Existing \`/habits\` offline upsert flow and UI, with real-time workspace refresh

## Added in this branch
- Responsive weekly habit planner and selected date view
- Daily tasks separated by incomplete/completed, with future-day write protection
- History backfill/undo up to 180 days with direct cloud writes
- Due schedule logic for specific weekdays, weekly targets and monthly targets; due list updates as period goals are achieved
- 28-day history trend, daily and period progress, data-backed analytics
- Editable routine name, life area, frequency, weekday schedule, X/week target, habit type
- Five starter habits via canonical habit create flow, with duplicate-name prevention
- Search, area filters, optional unscheduled habits, cross-links to existing health/reminders/goals
- Pure date/period helper tests, and link from the existing Habits page

## Guardrails and remaining follow-up
- Do not claim full parity with an unnamed reference video/repository; exact source repo URL is still required for a line-by-line import/comparison.
- Advanced planner mutations are **online-only**; original tracker continues to own offline queue writes. Avoid a competing offline write path.
- No new per-habit reminder dispatcher: reuse existing Automation/Notification integration after reviewing stored reminder policies and real user workspace.
- Health metrics (water, sleep, steps), dose adherence, and focus progress are owned by existing health/focus modules; never independently invent or duplicate clinical records in habit logs.
- Before production, run typecheck, unit tests, feature/auth verification, optimized build, responsive visual QA, full diff review, and real signed-in Supabase write/read checks where authorized.
- Production can only be promoted once QA and intended behavior are verified, and the user explicitly approves publishing that feature batch.

## Acceptance checklist
- [x] Isolated branch from exact main baseline
- [x] No database migrations or new persistent client store
- [x] Existing feature modules untouched
- [x] Added pure schedule helper unit tests
- [ ] \`npm run typecheck\`
- [ ] \`npm test\`
- [ ] \`npm run verify:features\`
- [ ] \`npm run build\`
- [ ] Signed-in and mobile browser QA with correct Supabase project connection
- [ ] GitHub checks, PR review, production release
