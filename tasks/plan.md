# Implementation Plan: LifeOS Full Parity + Personal Guardrails

## Overview
Bring the current LifeOS production branch into verified parity with the user's screenshots and the 64-section LifeOS Advanced specification, while keeping Supabase as the single cloud source of truth. Complete and verify the requested Waste Guard, readable Light Mode, mobile task/note quick access, and Health Planner (water, medicine, diet, sleep) without creating duplicate data paths.

## Baseline
- Branch: `fix/production-core-20260919`
- Baseline commit: `6885f3732149ec6a6d6b80ddcfbf262801d682f8`
- Cloud source of truth: Supabase
- Offline/local state: cache/queue only
- Canonical visual reference: uploaded LifeOS screenshots
- Canonical functional reference: uploaded `LifeOS Advanced` 64-section specification

## Architecture Decisions
- Reuse existing `money_expenses`, `health_routines`, `health_routine_logs`, `water_logs`, `diet_plan_items`, and `sleep_sessions`; no duplicate expense/health stores.
- Keep all persistent records in Supabase with RLS. LocalStorage remains theme/cache/queue only.
- PWA cannot provide a true Android/iOS native home-screen widget. Provide the closest standards-based working path: installable PWA shortcuts + compact Tasks & Notes route, and document the native-widget boundary.
- Health reminder content stays privacy-safe on lock screens.
- Medical features track routines/observations; they do not diagnose or prescribe.
- Every phase ends with focused verification before moving on.

## Task List

### Phase 1: Audit & parity map
- [ ] Task 1: Build screenshot + 64-section feature parity matrix
  - Acceptance: every screenshot route and every numbered spec section is mapped to a route/table/implementation status.
  - Verification: no spec section is omitted.
- [ ] Task 2: Verify one-source-of-truth data flow
  - Acceptance: persistent business/personal records resolve to Supabase; local state is only cache/preferences/offline queue.
  - Verification: schema, pages, realtime, offline queue reviewed.

### Checkpoint A
- [ ] Parity map committed
- [ ] No duplicate data path introduced
- [ ] Current migrations/live schema status documented

### Phase 2: Money Waste Guard
- [ ] Task 3: Verify/fix Waste Guard end-to-end
  - Acceptance: add/edit/delete expense; flag waste; record why; record avoid-next-time; recurring flag; monthly waste stats; Money route links to it.
  - Verification: RLS/table live, realtime works, build/typecheck pass.
- [ ] Task 4: Add Waste Guard memory surfaces
  - Acceptance: dashboard/compact mobile surface shows recent avoid-next-time reminders; no shaming language.
  - Verification: seeded/real record renders from Supabase.

### Phase 3: Health Planner
- [ ] Task 5: Verify/fix water tracker
  - Acceptance: configurable water goal, quick log amounts, daily progress, history, reminders.
- [ ] Task 6: Verify/fix medicine reminders
  - Acceptance: title, dose/instructions, times, days, active toggle, Done log, privacy-safe notifications.
- [ ] Task 7: Verify/fix diet plan
  - Acceptance: meal type/time/title/details/calories/protein, active toggle, day schedule, meal reminders.
- [ ] Task 8: Verify/fix sleep tracker
  - Acceptance: bed/wake/quality/notes, duration calculation, 7-day average, sleep reminder routine.
- [ ] Task 9: Verify health reminder scheduler
  - Acceptance: due reminders are generated without duplicate spam and respect quiet/DND windows.

### Checkpoint B
- [ ] All four health flows work from UI to Supabase
- [ ] Notifications are generated from the same health source
- [ ] Private health RLS verified

### Phase 4: Light Mode & visual accessibility
- [ ] Task 10: Light-mode readability pass across all screenshot routes
  - Acceptance: headings, body text, muted text, icons, inputs, pills, links, calendar items are readable with adequate contrast.
  - Verification: CSS audit and route-level visual checks; no dark-only hardcoded text remains on key surfaces.
- [ ] Task 11: Preserve canonical dark mode
  - Acceptance: no visual regression to supplied dark screenshots.

### Phase 5: Mobile/PWA quick access
- [ ] Task 12: Verify compact Tasks & Notes mobile route
  - Acceptance: realtime tasks + permanent sticky notes, Done action, Quick Add links.
- [ ] Task 13: Verify PWA shortcuts
  - Acceptance: manifest shortcuts for Quick Add, Tasks, Sticky Notes, Tasks & Notes, Waste Guard.
- [ ] Task 14: Improve phone usability
  - Acceptance: touch targets, text size, no horizontal overflow on compact route and critical forms.

### Checkpoint C
- [ ] Mobile compact route works from same Supabase data
- [ ] PWA manifest/build valid
- [ ] Light and dark modes both usable on mobile

### Phase 6: Full 64-section spec closure
- [ ] Task 15: Close screenshot-route action parity
  - Home, Today, Tasks, Goals, Projects, Money, Health, Family, Europe, Calendar, Timeline, Automations, Reviews, Settings.
- [ ] Task 16: Close task/planning/focus/time-tracking gaps
  - Priority/manual override, planner, focus controls, recurrence, matrix, waiting/dependencies, delegation, time tracking, energy check-in.
- [ ] Task 17: Close health/private-area gaps
  - Hair, labs, Health Vault, Self-Control, private locks, journal text/voice/photo where supported.
- [ ] Task 18: Close money/business/family/Europe gaps
  - Follow-up history/escalation, business sections, family profiles/responsibility, baby records, Europe route/document pipeline.
- [ ] Task 19: Close review/notification/calendar/search/timeline gaps
  - Weekly/monthly reviews, Life Score, smart snooze/escalation/DND, calendar views, global search, universal timeline.
- [ ] Task 20: Close PWA/offline/backup/security gaps
  - installability, cache/queue behavior, multi-device realtime, exports/backups, RLS/private storage.
- [ ] Task 21: Classify future-only/externally blocked items
  - Future AI agent and any platform-native widget capability must be explicitly marked as future/platform-bound, never falsely shown as working.

### Phase 7: Independent verification
- [ ] Task 22: Full automated verification
  - `npm test`, `npm run typecheck`, `npm run verify:sql`, `npm run build`.
- [ ] Task 23: Supabase verification
  - Live tables/migrations, RLS/security advisor, reminder scheduler health, no unrelated CRM project changes.
- [ ] Task 24: Route/action smoke matrix
  - Every parity row gets evidence: automated test, DB evidence, build evidence, or explicit manual/browser limitation.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Spec contains future/native capabilities | High | Mark honestly; do not fake working status |
| Duplicate health/money logic | High | Reuse existing tables/routes only |
| Production RLS regression | High | Apply additive migrations only; advisors after changes |
| Light theme CSS overrides conflict | Medium | Consolidate tokens and route-level contrast checks |
| Reminder duplication | High | Dedupe by ref/time and scheduler verification |
| PWA mistaken for native widgets | Medium | Provide shortcuts/compact view; state platform limit clearly |

## Definition of Done
Do not report “OK” until all checklist items are either verified working or explicitly classified as future/platform/external dependency with evidence. No unrelated functionality is intentionally changed.
