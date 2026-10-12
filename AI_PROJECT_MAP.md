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


### Hair recovery and water/protein monitoring (2026-10-11)
- The connected hair dashboard lives in `components/hair-recovery-tracker.tsx` and is rendered inside the existing private `app/hair/page.tsx` with its photo comparison. The code never stores a second authoritative habit/health record.
- Hydration writes are **always** `public.water_logs` (both `/health-planner` and `/hair`). Daily target is stored in the existing `health_routines.details.daily_goal_ml`; don't mix target with measured intake. Water history and totals are projections from actual event rows.
- Daily protein grams write to **existing** `health_entries.protein` (stored as `<number> g`). Existing free-text protein notes aren't overwritten automatically. Existing planned meal protein in `diet_plan_items.protein_g` is clearly labeled planned, not consumed.
- Hair-care actions and subjective shedding check-ins use existing `health_routines` (`kind="other"`, `details.source="hair_recovery"`) and `health_routine_logs` (one record per step/date, `scheduled_time="00:00"` as valid sentinel, actual UTC `completed_at` timestamp). Creating manual-only steps must **not** schedule drug/device use or claim clinician approval.
- Hair photo capture/compare remains `hair_photos` and the `lifeos-private` Supabase Storage bucket, with signed URLs. Blood tests remain `lab_results` and `/health`; the hair checklist merely locates existing rows, and does not auto-diagnose or infer "normal" from missing data.
- Pure source-of-truth projections: `lib/hair-recovery.ts` plus `lib/hair-recovery.test.ts`.
- Authorization: reuse `currentWorkspace`, existing Supabase RLS and `PrivacyGate`; never use browser-local state as a canonical record.
