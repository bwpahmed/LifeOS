# LifeOS Health Single Source — Water & Hair Recovery Tracking

Date: 2026-10-11
Baseline: \`main@249b15bd998e6bf57a48c4c32f20ec8265a2808e\`
Implementation branch: \`feature/lifeos-health-single-source-20261011\`

## Intent
Make “I drank water” quantifiable in mL; make daily protein, hair shedding, hair-care adherence, nutrition plans, blood tests and private photos understandable in one existing LifeOS health experience.

## Source of truth / no migration
- \`water_logs\` measures intake in actual mL. The existing \`health_routines.details.daily_goal_ml\` owns configurable water targets. No duplicate water table.
- \`health_entries.protein\` remains the actual daily protein/nutrition log as a text field; this flow saves explicit quantities like \`95 g\` and never silently overwrites pre-existing free-text nutrition notes.
- \`diet_plan_items.protein_g\` remains a **meal plan estimate**, not actual eaten protein. Do not sum it as the daily consumed total.
- \`health_routines\` with kind \`other\` and details marker \`source:"hair_recovery"\` own manually added care/check-in definitions. \`health_routine_logs\` owns check-in results, with one row per step and date. This does not automatically schedule serum or dermastamp reminders.
- \`lab_results\` is the sole owner of test values. The checklist displays whether matching rows were recorded, not whether users have undergone testing elsewhere or whether results are normal.
- \`hair_photos\` and private Supabase Storage retain existing comparison photos. Nothing migrates.
- \`profiles.timezone\` is used for user-local daily boundaries; Supabase Auth/workspace/RLS authorize reads and writes.
- \`lib/hair-recovery.ts\` pure projections; \`lib/health-planner.ts\` existing water sum helper.
- No schema/RLS/auth/permission edits or new network services.

## Functionality
1. Health Planner quick water amounts 150/250/500/750 mL, custom 1–5000 mL event, safe Undo for own workspace event, daily progress.
2. Hair page with live water day/7-day event totals, and quick event buttons that save into the same canonical Water Tracker.
3. Daily actual protein grams saved into existing Health entry. Explicitly distinguish from planned meal protein estimates; preserve other daily metrics and unstructured nutrition notes.
4. Daily subjective shedding rating 1–5 with optional note and 14-day trend. It is a self-observation, not a medical diagnosis.
5. Optional manual-use check-ins for topical serum and dermastamp **only if previously clinician-approved**; the app never automatically prescribes medications, microneedling, doses or schedules.
6. List of user-provided candidate labs with latest matching LifeOS record; view/re-enter lab results through existing Health page.
7. Educational nutrition food-source guide, clearly not a replacement for individualized lab interpretation or treatment.
8. Private before/after photos continue as-is.
9. Responsive mobile interface, accessible labels, busy/disabled states and success/error feedback; no simulated cloud saves.

## Safety & QA
- No defaults that represent new treatment instructions. The unspecified “0.1% topical” from user notes is not assigned a medicine; no automatic minoxidil/supplement start. Consult dermatologist for individualized diagnosis, workup and treatment, especially microneedling.
- UI handles missing records as “not recorded in LifeOS” not “not done,” and does not classify lab values.
- All mutations go to existing Supabase tables and preserve RLS.
- Run typecheck, tests, feature-coverage, optimized build, and manual mobile QA. Real user-account E2E requires connected LifeOS Supabase project and authorization; do not claim verified until tested.
- Keep isolated from main until verified and user approves production publishing.
