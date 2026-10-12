# LifeOS holistic change audit — 12 October 2026

**Repository:** `bwpahmed/LifeOS`  
**Development:** `feature/lifeos-hydration-hair-recovery-20261011` / draft PR #21  
**Production baseline:** `main@34ecd357ae727d2d49f1786353548eb5620d4910`  
**Audited development head:** `dcd3d7db1298250d030a9e7accdf3c3a7ebf087d`  
**Change scope:** 42 files in development-versus-main diff, including four additive Supabase migrations.

## QA status and limitations

- **PASS (developer QA):** `npm run typecheck`, `npm test` (**62/62**, including 3 API context privacy tests), `npm run verify:sql`, `npm run verify:features` (**113/113**), and `npm run build` (58 page entries); GitHub `verify` and `verify-ai-policy` succeeded; Vercel preview deployment success.
- **PASS (repository comparison):** current main Habits CSS and draft-branch Habits CSS have identical GitHub blob SHA `e19a863d1d7fbb78b247eb39b325a0219b07fa92`. The draft is one commit behind main **in history**, but current mobile styling was not lost.
- **NOT VERIFIED (production blocker):** Supabase project `fdtbftuxziicubztgcde` yields permission denied to the currently connected plugin; the four migrations have not been applied to that production project. Cannot perform authenticated write/read/undo, cross-user RLS or actual notification delivery QA.
- **NOT VERIFIED:** signed-in iPhone Safari, push subscription service-worker permission/receipts, startup/disabled browser and near-midnight reminder behavior, preview auth/password recovery. A successful preview build does not prove any of these.
- **NOT production:** draft PR #21 remains unmerged. Production only contains previously deployed mobile Habits CSS-only PR #22.

## Per-module audit matrix

| Module | Existing canonical source | Audited status | Risk before release |
| --- | --- | --- | --- |
| Home one-tap | `water_logs`, `health_routine_logs`, `habit_logs`, `food_intake_logs` | Components wired with server-confirmed writes; typecheck/build PASS | Login and CRUD not tested |
| Habits add/remove | `habits`, `habit_logs` | Creator-check and destructive confirmation; history cascades on delete | Requires real RLS/write permissions |
| Habit pin/unpin | New `user_habit_pins` in SAME Supabase | Creator-scoped policy, pin sort and unpin implemented; unit tests | Table not installed; buttons may be disabled |
| Water and hydration | `water_logs`, existing water target in `health_routines` | Presets/custom ml, totals, 7-day view, same-day undo | Individual creator filters; authenticated write not tested |
| Consumed food | New `food_intake_logs` in SAME Supabase | 30+ foods, quantities, 7-day protein, nutrient snapshots, undo, creator RLS | Missing table until migration; estimates are approximate |
| Hair care | `health_routines`, `health_routine_logs`, `hair_photos` | Serum and dermastamp manual log, no invented schedule | Existing underlying health RLS may allow permitted workspace members to read data |
| Lab records | `lab_results`, existing Vault | User-entered results/checklist, no algorithmic diagnosis | Clinician interpretation and privacy review required |
| Oral minoxidil | `health_routines` | Prescription-only optional template; no automatic dose/time | No real prescription verified; must not activate by assumption |
| Medicine reminder Home | `health_routines` + `health_routine_logs` | Due/overdue statuses, exact user-confirmed Taken slot, owner-filtered reads | Actual time-critical push delivery unverified |
| Reminder worker | Supabase function and pg_cron; existing push dispatcher | Owner-scoped 5-min checks; exact-slot dedup and suppression of Taken slots | Migration not applied; late-night/cadence boundary must be tested |
| AI Personal Coach | Existing `tasks`, `habits`, health totals; `/api/ai/coach` | Deterministic daily brief + explicit Ask AI action | Provider-specific live answer and factual quality not tested |
| Daily digest/overdue | New pg_cron SQL + existing `notifications` | Scoped notifications and quiet-hour filtering in source | Runtime/permission/duplicate multi-workspace tests needed |
| Mobile UI | `app/habits/habits-v2.css` | Verified same as production after separate PR #22 | Signed-in iPhone layout still needs end-user validation |

## Bugs confirmed and fixed during audit

1. **AI context oversharing risk:** `app/api/ai/coach/route.ts` used `...context`, passing unknown nested user-provided keys to model payload. Replaced with `sanitizeCoachContext()` strict recursive allowlist, bounded arrays and 3 regression tests; raw prescriptions/labs are discarded.
2. **Cross-member task summaries:** `HomeDailyCoach` previously fetched every workspace task. Now filters on `created_by` or `assigned_to` equal to current user.
3. **Second dose suppression:** old reminder notification dedup used only `ref_id=r.id` within 16 minutes and could suppress a different scheduled dose of the same medicine. The draft SQL now explodes exact reminder slots, checks `health_routine_logs` for that slot and deduplicates by owner, routine, slot-specific message and local date. SQL guardrails added. This is source-reviewed, **not real database-tested**.

## High-priority open risks

1. **Database authorization and activation:** reconnect the correct LifeOS Supabase project without disconnecting unrelated account; inspect installed migration history before applying these additive migrations. Back up first and apply in a controlled order. Confirm creator-only reads/writes with two real accounts.
2. **Legacy Health RLS:** the current `health_routines`, `lab_results` and related health tables have workspace-level access architecture. Creator-scoped client queries and the PIN are *not* a substitute for server-enforced personal RLS. Avoid representing all legacy health information as per-user private until a privacy policy review and authorized migration.
3. **Reminder boundary conditions:** test 23:56–23:59 local reminders, close-together doses, DND, daylight changes/timezone, push received when tab closed, and recheck when phone offline. Current 5-minute SQL schedule and 5-minute push dispatcher are not an exact-second guarantee; near-midnight edge cases may need further refinement before activation.
4. **Source-of-truth consistency:** Water and medicine logs are canonical domain records; arbitrary identically named habits are **not** automatically marked complete (intentional: prevents false completions). Planned meals are distinct from actually eaten food.
5. **Sign-in and full device UX:** prior wrong-password/connection issue and signed-in mobile Safari have not been re-verified from available authentication. Do not claim fixed.

## Release checklist

- [x] Review branch scope, repo instructions, Supabase ownership, SQL security and privacy paths.
- [x] Run local automated suite and GitHub/Vercel preview checks.
- [x] Fix AI API privacy, owner task scoping and per-dose dedup issues; add regression guards.
- [ ] Obtain authorized LifeOS Supabase project access and check migrations/backups.
- [ ] Apply and independently QA `food_intake_logs`, `user_habit_pins`, private reminder and coach digest migrations.
- [ ] Multi-account RLS: own vs other user's food, pins, doses, labs and health routines.
- [ ] Signed-in iPhone (320–430px): Home cards, pin/remove, food log, hair/medicine, notifications, AI output, dark mode.
- [ ] Verify actual push and scheduled dose delivery with permitted nonmedical test routine.
- [ ] Reconcile feature branch against latest `main` and only then request release approval.

**Release recommendation:** keep PR #21 as **draft / no production merge** until all high-risk gates above pass. This report is source-backed code/test audit, **not certification of a working live installation**.


## Database activation follow-up — 12 October 2026

- User re-authorized the exact LifeOS Supabase project `fdtbftuxziicubztgcde`; `list_projects`, `get_project`, `list_migrations`, read-only SQL and advisor checks now succeed.
- Four migrations have been **applied successfully to the real LifeOS project**, tracked in `supabase_migrations.schema_migrations`: `food_intake_logs`, `user_habit_pins`, `personal_health_reminder_safety`, `personal_coach_digest`.
- Post-apply SQL audit confirms **4/4 installed**; two new tables have **RLS on**, food table has four owner policies, pins table three owner policies. Both new tables have zero user records so far, no fabricated testing data.
- Supabase cron jobs verified active: `lifeos-health-reminders-owner-5m`, `lifeos-daily-coach-5m`, `lifeos-push-dispatch-5m`, plus existing general reminders hourly. Old `lifeos-health-reminders-15m` no longer appears.
- Existing actual water logs stayed intact (2 entries). At check time there were 0 health routines; we therefore **did not test** actual push delivery, two-dose suppression, or pharmacy reminder behavior.
- Existing Health Planner / lab RLS still uses workspace-wide health module access for multiple legacy tables. This is the main privacy-hardening task before multi-user release, not solved by owner filters in React.
- Signed-in browser CRUD/RLS for food, pins, water, notifications and push permission remains unverified; `main` deployment of PR #21 should be gated on those checks. Supabase backup restore and auth UX must also be verified.
- Supabase Security Advisor reported existing `authenticated_security_definer_function_executable` warnings (8 functions) and disabled leaked password protection. These are separate hardening tasks requiring care to avoid breaking RLS helper calls.


## Final activation and privacy verification follow-up — 12 October 2026
- **Correct Supabase project access restored.** Applied six migrations in the existing LifeOS project: original food logging, habit pinning, owner-specific 5-minute medicine reminder, private Daily Coach digest, `health_record_owner_privacy`, and `health_reminder_midnight`. The latter two are new defensive migrations and are included in the canonical `supabase/schema.sql`.
- Verified with SQL under **`SET LOCAL ROLE authenticated`** and a real account claim: existing two water records readable to the owner, **zero visible to a stranger claim**. All eight affected Health tables have four owner RLS policies, including routine-to-log owner checks.
- Checked Storage owner permissions for the canonical `lifeos-private` hair file path: **owner = allowed, simulated stranger = denied**. Storage currently contains no objects, so this is permission testing, not a real signed-photo fetch.
- Transaction-only CRUD test created a **temporary food entry and a pinned temporary habit** as authenticated owner; both inserts/reads succeeded. The transaction explicitly **rolled back** and postcheck confirmed **zero** new food, pins or habit entries; both pre-existing water rows remain.
- The midnight fix computes dose-local timestamp from current and prior local dates and deduplicates by exact scheduled date/time, preventing 23:56–23:59 dose omissions at the next five-minute scheduler.
- Server-side push Edge Function `lifeos-push-dispatch` upgraded from version 1 to **version 2**, retaining JWT verification, so Health and Daily Coach notifications link to Home. All four current LifeOS cron jobs report recent **succeeded** runs; function smoke check returned **0 notifications** while no medicine routine is defined.
- Limitations remain: 1 real registered user, so these are **role simulations**, not a second human's signed-in session; no confirmed medicine routines and no verified push receipt on a phone. Supabase auth password behavior and actual signed-in web flows are not proven by database checks.
- Password leak-protection advisor warning and several intentional `SECURITY DEFINER` helper warnings remain for separate administrator review; do not revoke permission helpers blindly or RLS could break.
- Deployment of PR #21 needs latest GitHub checks, app build, actual browser UX and production release review. No arbitrary medicine dose or minoxidil schedule was created.
