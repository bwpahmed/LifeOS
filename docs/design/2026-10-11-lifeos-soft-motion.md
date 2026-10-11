# LifeOS soft typography, animations and Habit Studio options — 11 October 2026

**Baseline:** `main@e6f772d779cd35ce8da98ca2a45e7a3686be95ba`.
**Branch:** `design/lifeos-soft-type-motion-habits-20261011`.
**Reviewed:** `AGENTS.md`, `AI_PROJECT_MAP.md`, `AI_TEAM.md`, `AI_CAPABILITY_STACK.md`, existing habit planner and `lib/habits.ts`.
**Scope:** UI presentation and view filtering/sorting only; no auth, RLS, schema, Supabase migration, payment, PWA or offline queue changes.

## User feedback addressed
- Heavy dark/black fonts: softened to warmer slate-green and 500–660 weights instead of the prior 800–850 weights on global light UI and Habit Studio headings.
- Missing animations: lightweight CSS page/card arrival, hover feedback, progress width easing, a gentle animated gradient and completion celebration; all honor `prefers-reduced-motion`.
- More options: all/to-do/completed, streak/consistency/alphabetical ordering, compact/comfortable view, decorative Motion on/off switch, Today jump, 7/28-day history switch, 5 additional starter templates.

## Technical source of truth
- All habit logs, mutations, workspaces and existing user data remain in Supabase.
- Sorting is a **pure view projection** in `lib/habit-planner.ts`, using canonical `lib/habits.ts` consistency/streak metrics, with dedicated tests.
- Display preferences are ephemeral React UI state; no duplicate database or localStorage authority.
- New animations do not claim successful writes before Supabase returns. Confirmation styling is only triggered after successful cloud persistence.
- No new packages or network integrations.

## Files
- `app/premium-everywhere.css` — global soft typography and restrained motion.
- `app/habits/planner/planner.css` — warm colors, lighter type, motion + mobile controls.
- `app/habits/planner/page.tsx` — interactive options, history switch, quick Today, templates, success feedback.
- `lib/habit-planner.ts` — view sorting helper reusing current metrics.
- `lib/habit-planner.test.ts` — 3 new sorting tests.

## Verification gates
- Automated typecheck, unit tests, existing feature coverage, optimized build and mobile responsive checks.
- Authenticated feature save/edit cannot be verified without LifeOS Supabase project connection; this limitation must be called out explicitly.
- Production release should follow passing checks and explicit go-ahead; existing production commit is the rollback baseline.
