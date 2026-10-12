# AI PROJECT MAP — LifeOS

This is the canonical repository map for AI-assisted work. It tells an agent where the current implementation lives, which files own important behavior, and which stores are authoritative. It does **not** replace reading the code. When this map and the implementation disagree, verify the implementation and update this map in the same change.

**Map baseline:** `main@894cf76269f784f329072e9e949bee7331f14c7a` (2026-09-23).  
**Repository purpose:** Next.js personal/family command center with Supabase-backed workspaces, private data, offline support, AI-assisted capture/coaching, reminders, integrations, and PWA behavior.

## Runtime shape

| Layer | Primary locations | Role |
| --- | --- | --- |
| Next.js App Router | `app/` | Pages, route handlers, authenticated/public surfaces |
| Shared business/domain logic | `lib/` | Reusable domain rules; pages/components should not fork this logic |
| Shared UI / PWA | `components/`, `public/` | App shell, privacy gate, install/offline UX, service worker assets |
| Authentication edge | `middleware.ts`, `lib/auth-routing.ts` | Session refresh and route protection |
| Supabase clients | `lib/supabase/client.ts`, `server.ts`, `admin.ts` | Browser/server/admin DB access |
| Workspace resolution | `lib/supabase/workspace.ts` | Current workspace membership and selected workspace |
| Database model | `supabase/schema.sql`, `supabase/migrations/` | Cloud schema, RLS intent, scheduled/edge behavior |
| AI service | `lib/ai/service.ts`, `app/api/ai/*` | Provider abstraction, deterministic fallback, output validation |
| Offline/cache/sync | `lib/offline.ts`, `lib/sync-queue.ts`, `components/offline-sync.tsx` | Local cache/queue; never replaces Supabase authority |
| Reminders/notifications | `app/api/cron/reminders/route.ts`, Supabase functions/migrations | Notification creation and exact push dispatch |
| External integrations | `app/api/integrations/`, `lib/google-calendar.ts` | Calendar/connection integrations |
| Verification | `lib/*.test.ts`, `scripts/verify-*.mjs`, project npm scripts | Unit, type, build, SQL/feature checks |

## Sources of truth

### Authentication and route access
- **Primary:** `middleware.ts` + `lib/auth-routing.ts`.
- **Cloud authorization:** Supabase Auth + RLS. Client-side UI locks are not authorization.
- Browser/server clients come from `lib/supabase/client.ts` and `lib/supabase/server.ts`.
- Do not create an alternate auth/session store.

### Workspace membership and active workspace
- **Primary application logic:** `lib/supabase/workspace.ts`.
- **Cloud data:** `workspace_members` plus `user_settings.settings.selected_workspace_id`.
- Workspace cache is an optimization only; membership in Supabase is authoritative.
- Do not invent a second “current workspace” state machine in pages.

### Database and permissions
- **Canonical cloud model:** `supabase/schema.sql` plus ordered files under `supabase/migrations/`.
- RLS/permissions in Supabase are the security boundary for cloud data.
- Before changing a table/column/policy/function, search migrations and current callers.

### Domain business logic
- Pages live under `app/<domain>/`; reusable calculations and domain rules belong under `lib/`.
- Existing examples include `lib/money.ts`, `lib/habits.ts`, `lib/health-planner.ts`, `lib/priority.ts`, `lib/recurrence.ts`, `lib/timezone.ts`.
- Reuse an existing module before adding page-local duplicate calculations.

### AI capture and coaching
- **Primary:** `lib/ai/service.ts`.
- **HTTP boundary:** `app/api/ai/parse/route.ts`, `coach/route.ts`, `daily-plan/route.ts`, `weekly-review/route.ts`.
- Provider selection is environment-driven; deterministic fallback exists.
- AI output is untrusted and must pass deterministic validation before use. Never create factual financial/health/deadline data from unsupported model guesses.

### Offline behavior
- **Cache:** `lib/offline.ts` uses localStorage with bounded age.
- **Write queue:** `lib/sync-queue.ts` stores queued upserts/deletes and replays them to Supabase.
- Supabase remains authoritative. Local data is cache/queue, not a competing database.

### Private-module UI lock
- `components/privacy-gate.tsx` is an **on-device UI lock only**.
- Its own copy explicitly states that Supabase RLS is the real cloud authorization boundary.
- Never treat the local PIN/passkey flag as permission to read cloud data.

### Reminders and push
- `app/api/cron/reminders/route.ts` authenticates with `CRON_SECRET`, evaluates due work/quiet hours, and writes notification records.
- Exact push delivery/snooze behavior is delegated to scheduled Supabase Edge Function infrastructure as documented in code/migrations.
- Avoid adding a parallel reminder dispatcher without first proving the existing path cannot support the requirement.

## Critical flows

### Signed-in request
`Browser -> Next.js middleware -> Supabase Auth -> public/private route decision -> App Router page -> workspace/domain logic -> Supabase RLS`

### Workspace-scoped page
`Authenticated user -> currentWorkspace() -> workspace_members + user_settings -> domain query filtered by workspace -> UI`

### AI smart capture
`User text -> /api/ai/parse -> authenticated supabaseServer() -> lib/ai/service.parseCapture -> provider or deterministic fallback -> validateParsed -> response -> user/app review path`

### Offline write
`UI/domain action -> local queue when needed -> lib/sync-queue.ts -> reconnect/replay -> Supabase -> remaining failures stay queued`

### Reminder delivery
`Vercel/authorized cron -> /api/cron/reminders -> service-role/admin queries -> quiet/DND + dedupe logic -> notifications table -> scheduled Supabase push dispatcher`

## Data / trust boundaries

1. **Browser:** user-visible state, local cache, privacy UI lock, service worker.
2. **Next.js server:** authenticated route handlers, AI provider calls, cron authorization.
3. **Supabase:** durable records, memberships, RLS, functions, scheduled/edge workflows.
4. **External providers:** AI and calendar/push integrations; send only the minimum data needed.
5. **Local agent tooling:** Graphify/Archify/Chrome DevTools are development aids and must not receive private production data by default.

## Change impact map

| If changing... | Inspect at minimum... | Required validation |
| --- | --- | --- |
| Auth/login/route protection | `middleware.ts`, `lib/auth-routing.ts`, Supabase auth/RLS | typecheck + auth flow tests/build + browser QA when user-visible |
| Workspace behavior | `lib/supabase/workspace.ts`, memberships/settings schema, callers | targeted tests + typecheck + RLS/data review |
| Schema/RLS | `supabase/schema.sql`, relevant migrations, all callers | SQL verifier + typecheck/tests + rollback/risk review |
| AI parse/coach | `lib/ai/service.ts`, matching API routes, consumer UI | unit tests + validation/fallback tests; no invented facts |
| Money/health/private data | domain lib/page + schema/RLS + privacy boundary | targeted tests + security/privacy review |
| Offline/sync | `lib/offline.ts`, `lib/sync-queue.ts`, consumers | queue/replay tests + browser offline/reconnect QA |
| Notifications/reminders | cron route, timezone/money helpers, notification/push migrations/functions | targeted tests + schedule/dedupe/quiet-hours review |
| PWA/browser behavior | components/public service worker/manifest + page | build + Chrome DevTools/browser QA |
| Major architecture | all owners above + this map | update this file + refresh Graphify/Archify view + independent QA |

## Existing-code-first rule

Before creating new logic:

1. Search this map for the owning area.
2. Search the repository for similar behavior/callers.
3. Query Graphify when relationships are unclear.
4. Read the current implementation and tests.
5. Reuse or extend the existing owner.
6. Create a new owner only when the current architecture cannot represent the requirement; explain why and update this map.

## Derived understanding artifacts

- **Graphify:** queryable code graph generated on demand; derived, not canonical.
- **Archify source:** `.ai/architecture/system.architecture.json`.
- **Archify HTML:** may be generated from the source for human review.
- Never edit a derived graph/diagram to “make reality true”; change the implementation or this canonical map, then regenerate.


### Habit Planner / Tracker (added 2026-10-11)
- **Canonical cloud data:** existing \`supabase/schema.sql\` tables \`habits\` (workspace/owner/schedule/target/privacy) and \`habit_logs\` (habit/date/value), covered by existing RLS. No new schema.
- **Original tracker:** \`app/habits/page.tsx\` (create habits, daily completion, built-in offline upserts, period metrics).
- **Advanced planner:** \`app/habits/planner/page.tsx\` (read/write through \`supabaseBrowser\`, resolve membership using \`currentWorkspace\`, target the current workspace, week/date planner, backfill/undo, starter habits, editing, trend analytics).
- **Shared pure schedule projections:** \`lib/habit-planner.ts\` (period/week math and forecast), tested by \`lib/habit-planner.test.ts\`. Preserve and reuse \`lib/habits.ts\` for canonical streak/consistency/recovery calculations.
- **Real-time refresh:** existing \`useRealtimeRefresh(["habits","habit_logs"], ...)\`; no parallel habit store.
- **Offline:** existing \`/habits\` page remains the offline write-queue implementation; advanced planner is online-only for mutations, rather than introducing a second offline queue. Its error message must not claim new writes are queued.
- **Reminders / health / goals:** continue to live in \`/automations\`, \`/notifications\`, \`/health-planner\`, and \`/goals\`. The planner links to them; it does not introduce a second notification dispatcher or duplicate health/goal facts.
- **Release verification:** unauthenticated/real-account UI smoke QA is still required; link/PR merges do not prove user data interactions without project access.

### Connected hydration and hair recovery tracking (added 2026-10-11)
- **Existing source of truth:** Supabase `water_logs` owns individual water intakes and dates; `health_routines` owns the editable water goal and approved-care reminders; `health_routine_logs` owns completion; `lab_results` owns results; `health_entries` owns the nutrition note; `diet_plan_items` owns meal plans; `hair_photos` and the `lifeos-private` bucket own evidence. No duplicate database or localStorage records.
- **Hydration UI:** `components/hydration-panel.tsx` inside `app/health-planner/page.tsx`. Uses existing water_logs reads/writes, displays actual 7-day history, custom entries and server-confirmed undo; existing `lib/health-planner.ts` calculates totals.
- **Hair UI:** `components/hair-recovery-tracker.tsx` inside `app/hair/page.tsx`, behind its existing `PrivacyGate`. User must explicitly create trackers. Only `health_routines.kind='other'` records with `details.source='lifeos-hair-recovery'` are rendered in the new tracker; each completed action is one `health_routine_logs` row with an empty scheduled_time, preventing new scheduler paths or inferred medication dosing.
- **Lab checklist matching:** `lib/hair-recovery.ts` lists the names the user wants to discuss and matches existing recorded tests. Never uses reference ranges to diagnose or display normal/abnormal.
- **Security/privacy:** Read queries for the new hair board are both `workspace_id` and `created_by` scoped; current Supabase RLS continues as the actual authorization boundary. This UI filtering does NOT add private-per-user RLS to workspace tables and must not be misrepresented as such.
- **Future work:** authenticated Supabase data/save QA requires access to LifeOS project; do not merge or deploy new health workflows until this and existing RLS are reviewed.

### Consumed food nutrition (added 2026-10-12)
- **Canonical, user-private health records:** `public.food_intake_logs` in existing LifeOS Supabase, created through `supabase/migrations/20261012_food_intake_logs.sql` and included in `supabase/schema.sql`. Each entry stores the actual consumed food, grams, date, meal type, nutrition-estimate snapshot and reference version. A single table is used by both Health Planner and Hair Recovery; it is not a second backend.
- **Privacy:** new per-creator RLS policies enforce `created_by=auth.uid()` **plus** `can_access_module(workspace_id,'health')` for selects and writer restriction for mutations. Stronger than old shared-workspace Health RLS; unchanged old policies still apply to other health records. No production migration has been run.
- **Presentation:** `components/nutrition-intake.tsx` reads and writes once per action through `supabaseBrowser()` and `currentWorkspace()`. Mounted inside `/health-planner` and `/hair` (both behind current PrivacyGate). UI has recent history, custom/user-entered foods, quantity conversion and undo; no local DB.
- **Calculation:** `lib/nutrition.ts` contains a versioned approximate catalog and immutable consumed nutrient snapshots; missing nutrient estimates are omitted, not zero. `lib/nutrition.test.ts` tests measured-portion conversion, historical dates, null/missing values and separate omega-3 types.
- **Planned vs consumed:** `diet_plan_items` remains planned-only. `food_intake_logs` represents actual user-entered consumption. The UI must not silently count planned food as consumed; no automatic diagnosis, target or prescribed dosage is generated.
- **Release blocker:** authenticated LifeOS Supabase connection, migration application, RLS checks, real create/delete and mobile QA are required before production. See `docs/design/2026-10-12-nutrition-intake.md`.

### Home quick health + habits (added 2026-10-12)
- **User flow:** authenticated `/` now mounts `components/home-health-quick-log.tsx` before the large Home hero so it is visible immediately on mobile. Sensitive health details are behind the existing session-scoped `PrivacyGate` (the PIN is only an extra UI lock; Supabase RLS is authoritative).
- **Read/write ownership:** Home quick logging writes to exactly the SAME canonical tables already used elsewhere: `water_logs` (ml), `health_routine_logs` (medication/hair routine slot completion), `food_intake_logs` (consumed food, pending nutrition migration), `habit_logs` (explicit habit completion). Their underlying routine definitions remain in `health_routines` and `habits`. This does NOT automatically manufacture a habit event when drinking water; existing unlinked habits remain manually checkable from Home, so no false inferred log.
- **Schedule and security projections:** `lib/home-health-quick.ts` handles active medicine/approved hair routine and owner/date checks; `lib/habit-planner.ts` handles canonical schedule evaluation. The Home quick widget scopes water, routines, medicine logs and nutrition logs to both workspace and creator. Existing table RLS remains the actual authorization layer.
- **Operational safeguards:** Only configured medicine reminder slots are shown; a pill is marked taken **only after an explicit user tap and successful Supabase upsert**. Undo requires confirmation. Hair routines are only existing opted-in `details.source='lifeos-hair-recovery'` records. Food UI shows an explicit inactive state until the nutrition migration is applied, without disabling existing water and medicine quick actions.
- **No parallel state:** React UI state and ephemeral loading flags only; no second local database, new health target, new medicines, or background medication automation. Records refresh through existing `useRealtimeRefresh`.
- **QA:** `lib/home-health-quick.test.ts` verifies date-scoped medicine, hair-only tags and habit/water validations. Authenticated/locked browser and real RLS QA still required before production promotion.

### Medicine due-time dashboard and owner-private reminders (added 2026-10-12)
- **Home is the medicine action surface:** `components/home-health-quick-log.tsx` shows the user's configured medicine schedule with timezone-aware overdue / due-now / due-soon / upcoming / recorded states, one-tap Taken and explicit undo. `lib/home-health-quick.ts` is the pure status/projection logic. The user can create a confirmed prescribed medicine schedule from Home (name/time/day pattern); it never invents a drug, dosage or interval.
- **Actual confirmed dose:** `health_routine_logs` `(routine_id,date,scheduled_time)` remains the only source of recorded ingestion. Clicking Taken uses exactly the configured slot and only shows success after Supabase writes. `app/notifications/page.tsx` no longer forges a log at the current hour; it links to Home for exact dose confirmation.
- **Clock:** Home passes the logged-in profile timezone from `app/page.tsx`; status refreshes each minute. Due-now and overdue are UI classifications of *not logged*, NOT proof of missed ingestion. No auto double-dose instruction.
- **Background notifications:** existing Supabase `generate_due_health_notifications` 5-minute owner-private job + existing 5-minute push dispatcher; `20261012_personal_health_reminder_safety.sql` replaces workspace-broadcast with `health_routines.created_by` as recipient and suppresses notifications when the specific slot is already `done`. `app/api/cron/reminders/route.ts` also blocks cross-member health notifications and premature daily-cron health alerts. Push health notifications open Home. Push requires installed/allowed device subscription and deployed scheduler/Edge Function; do not claim receipt until verified.
- **Safety:** never treat user-listed hair serum, dermastamp or conditional minoxidil as a currently prescribed medicine. Name, scheduled time and chosen repeat schedule must be entered from a real prescription or clinician instructions. Existing medicine RLS must be audited before production deployment; Supabase project connection currently inaccessible.

### Personal Habit Pinning + AI Daily Coach (added 2026-10-12)
- **Habit canonical rows:** `habits` + `habit_logs`. Add custom habits on Home or Habits. Remove is explicitly confirmed and restricted to `habits.created_by=auth.uid()` (deletion cascades historical logs). The existing Habit Planner remains the edit/schedule engine, and existing offline queue remains reserved for pre-existing creation/completions.
- **Pin preferences:** separate private, additive `user_habit_pins` table *inside the same LifeOS Supabase project* (migration `20261012_user_habit_pins.sql`, duplicated in `supabase/schema.sql` for fresh bootstrap). Owner-specific RLS. Pin/unpin from Home or Habits, Home prioritizes pinned habits; pin never changes shared underlying habit. Deleting a habit cascades its pin(s).
- **AI Personal Coach Home brief:** `components/home-daily-coach.tsx` reads the same canonical `tasks`, `habits`, `habit_logs`, `water_logs`, `health_routines`, `health_routine_logs`, `food_intake_logs` tables, with user-specific health ownership. It recalculates factual summary/overdue recommendations from `lib/daily-coach.ts` on realtime updates and a 60-second refresh. No new database for the summary, no fake logged completions.
- **Optional AI improvement:** only a real user click sends task titles and aggregate numeric health counts to existing authenticated `/api/ai/coach`; no raw lab results or medicine names/doses. New `daily_health` AI context validated and bounded server-side. If no provider configured, `coachAnswer` returns a disclosed deterministic factual fallback, not a fake live model.
- **Oral minoxidil:** optional Home medicine name template only, **not active** until user explicitly confirms doctor-prescribed treatment and enters actual schedule. No guessed strength or frequency, no automatic medication/reminder record.
- **Alert state:** Existing task notification system remains the scheduler for due tasks; Home Coach flags overdue work directly. Existing owner-scoped medicine reminder fixes and device push activation from PR #21 must be deployed/verified separately.
- **Safe staging:** main/prod unchanged until correct LifeOS Supabase connector is accessible, food/pin/reminder migrations run with explicit approval and end-to-end account, RLS and mobile push tests pass. Do not automatically enable production or invent medicine doses.

### Full security/QA audit follow-up (2026-10-12)
- AI coach request handling in `app/api/ai/coach/route.ts` now uses `lib/ai/coach-context.ts` as a **strict runtime allowlist**; no `...context` pass-through, raw medical record or arbitrary nested field sent to providers. Regression tests in `lib/ai/coach-context.test.ts`.
- Home Daily Coach task queries explicitly select `created_by=auth user OR assigned_to=auth user` inside the authorized workspace; other workspace members' tasks no longer appear in personal coaching summaries.
- `supabase/migrations/20261012_personal_health_reminder_safety.sql` now deduplicates by **specific medicine reminder time**, not just routine ID, so nearby intended doses aren't silently suppressed by a preceding alert. This remains blocked on real DB/notification QA.
- Full review and release gate matrix: `docs/qa/2026-10-12-lifeos-full-audit.md`. The existing workspace Health RLS is not a new per-user privacy boundary.
