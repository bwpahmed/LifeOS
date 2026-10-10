# LifeOS Premium UI — isolated redesign (2026-10-10)

## Baseline and guardrails
- Source repository: `bwpahmed/LifeOS`
- Exact untouched base: `main@186a7e5db451715eb1e36db05b6592a2c32f99d0`
- Working branch: `design/lifeos-premium-ui-20261010`
- Read before implementation: `AGENTS.md`, `AI_PROJECT_MAP.md`, `AI_TEAM.md`, `AI_CAPABILITY_STACK.md`.
- Design reference: user-supplied mobile habit-tracking video; simple light surfaces, large daily progress visualization, clear streaks, mobile-first controls, green accents.
- Only UI-layer changes on this branch. No Supabase migrations, cloud writes, auth/RLS changes, offline queue edits, API changes, production deployment, merge or main-branch edits.
- Existing selected dark/light theme persists; light is the fallback for accounts without a saved theme choice.

## Changes
1. **Habits page**: premium responsive daily summary/progress ring, active streak and completion metrics, day-level activity, one-tap completion, clean habit cards with existing consistency/recovery calculations, collapsible creation form.
2. **Scoped habits CSS**: controls and appearance for both light and dark themes, keyboard focus, reduced-motion support, responsive breakpoints.
3. **App-wide presentation-only CSS**: softer panels/sidebar, mint/green accents, improved mobile navigation and tap targets across existing modules.
4. **Theme fallback**: light for new users, without replacing persisted local/cloud choice.

## Preservation checks
- Habit loading still uses `currentWorkspace`, `supabaseBrowser`, original queries and `load()`.
- Create habit still calls original `add` with cloud insert and offline queuing unchanged.
- Complete habit still calls original `toggle` and preserves offline/remove limitations unchanged.
- Existing `habitConsistencyForFrequency`, `habitPeriodStreak`, `recoveryScore` used unchanged.
- AppShell routing, auth bootstrap, workspace selection, notifications, quick add, PWA/offline and permissions unchanged.

## Acceptance checklist
- [x] `npm run typecheck` — PASS in isolated QA clone at commit `146c162`
- [x] `npm test` — PASS, 24/24 tests in isolated QA clone
- [x] `npm run build` — PASS, Next.js 14 production compile and 57 static routes
- [ ] Responsive browser/manual QA (phone, desktop, and both themes)
- [ ] Validate habit create/completion and offline-state behavior in an authenticated test workspace
- [x] Review base-vs-branch diff and ensure no schema/auth/business code touched — 5 intended UI/documentation files only
- [x] Separate working branch created from exact baseline
- [x] Required AI policy read
- [x] No deployment / no merge to main

This document describes the UI implementation and remaining validation; it does not claim functional browser testing before it has occurred.
