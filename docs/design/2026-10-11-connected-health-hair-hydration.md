# LifeOS connected water + hair recovery tracker — 2026-10-11

## Baseline and scope
- Baseline: `main@249b15bd998e6bf57a48c4c32f20ec8265a2808e`.
- Branch: `feature/lifeos-hydration-hair-recovery-20261011`.
- Policy: `AGENTS.md`, `AI_PROJECT_MAP.md`, `AI_TEAM.md`, `AI_CAPABILITY_STACK.md`.
- User asked for one authoritative health-information source, easy daily water logging, and hair recovery tracking for nutrition, care, labs and photos.
- No passwords, private user data or claims of personalized treatment are committed.

## Authoritative storage / privacy
- **Water consumed and dates:** pre-existing `water_logs`; aggregated in existing `lib/health-planner.ts`.
- **Water target:** `health_routines` `kind='water'`, `details.daily_goal_ml`.
- **Hair checklists:** optional *user-created* `health_routines` with `kind='other'`, tagged `details.source='lifeos-hair-recovery'`; actual completed actions in `health_routine_logs`. No migrations, new data models, or duplicate persistence.
- **Blood tests:** existing `lab_results` records. Code only marks test as **recorded/not recorded**, never interprets lab status; values and original reports remain under `/health` and `/health-vault`.
- **Meals / nutrition:** existing `diet_plan_items` and `health_entries.protein`. The new view reads existing nutrition notes and links to Diet Planner; no parallel food counter.
- **Photo evidence:** existing `hair_photos` table and `lifeos-private` Supabase Storage; privacy UI `PrivacyGate` remains in place.
- Health board reads are restricted by workspace and creator ID. **Important:** this is *not* a new per-user RLS boundary. Current workspace-level `health` policies still apply. Review workspace visibility before broad family/team use.

## Screens delivered
1. `/health-planner`: water intake card has quick 150/250/500/750 ml, validated custom ml, stored goal, same-day undo and 7-day chart. Every write goes directly to the existing table.
2. `/hair`: connected summary, opt-in daily care checklist and notes, lab checklist (CBC, ferritin, iron profile, TSH/Free T4, D, B12, folate, zinc, CMP/LFT/KFT separately), hydration from actual water logs, protein notes, food-source reference, existing monthly photo timeline.
3. Existing `/health` and `/health-vault` remain the place to enter medical results and documents; no invented results or flags.

## Medical safety
- No fixed dose or supplement automatically ordered or administered. Hair treatments, derma stamping/microneedling and topical medicines are not initiated, recommended at specific concentrations, or scheduled automatically.
- Lab checklist names are user-supplied items to discuss with a clinician, not a mandatory panel.
- “Not recorded” is not the same as “not done”; the app never evaluates healthy ranges or derives a diagnosis from arbitrary user-entered results.
- Existing 2500 ml initial target remains an editable app default rather than personalized hydration advice; water needs differ by person and health context.

## Verification and rollout
- Run `npm run typecheck`, `npm test`, `npm run verify:features`, `npm run build`.
- Verify 0 ml / negative / over-5000 ml rejects, single canonical table usage, same-day undo, mobile read/layout, and workflow navigation.
- **Do not promote health changes to production until authenticated Supabase and privacy/RLS checks are possible.** Live project may not be available to the current connector.
- No production DB modifications or data backfills are part of this branch.
