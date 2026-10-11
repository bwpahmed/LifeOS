# LifeOS consumed-food and nutrient intake — 2026-10-12

## Goal and baseline
Continue PR #21 / `feature/lifeos-hydration-hair-recovery-20261011` (original baseline `main@249b15bd998e6bf57a48c4c32f20ec8265a2808e`) to let the user track *actual* consumed protein and selected nutrients, not merely a planned diet.

## Single authoritative database and migration
- Existing LifeOS Supabase remains the **single cloud source of truth**, not localStorage or an external food account.
- Current `diet_plan_items` stores *plans*, and `health_entries.protein` is an unstructured note. Neither safely records per-food consumed grams, nutrients or food history. Therefore the smallest safe additive table is `food_intake_logs`.
- Schema and ordered migration: `supabase/schema.sql` + `supabase/migrations/20261012_food_intake_logs.sql`.
- Minimal columns: user/workspace ID, date, consumed food identity and name, edible grams, meal type, computed reference-version nutrient snapshot, optional note, timestamp.
- Per-user RLS uses BOTH `created_by=auth.uid()` and existing workspace Health module membership; mutations additionally require workspace write permission. No change to existing table RLS, migration carries no backfills or bulk data writes.
- No production migration applied: LifeOS project `fdtbftuxziicubztgcde` is not in the currently connected Supabase account. This release MUST remain draft until SQL applied and real-account QA passes.

## UX
- Reusable `NutritionIntakePanel` appears in both existing private `/health-planner` and `/hair` pages (shared Supabase rows, not duplicate counters).
- Choose *what was actually eaten* from 30+ recognizable foods (eggs, cooked/raw chicken, fish, mutton, lentils, chana, dairy, palak, sesame, nuts, guava etc).
- Egg default portion is 50 g edible. Three eggs yields `150g * 12.6g protein/100g = 18.9g estimated protein`. Cooked roasted chicken 200g estimates `62.04g protein` based on USDA FDC 171477. Raw-weight chicken is a separate selection; mixed dishes vary.
- Enter custom grams, date, meal and note. Unlisted recipes can be entered as user-typed custom food and *optional manually known protein for the eaten portion*, clearly labelled non-reference.
- Each entry is stored in one canonical table only **after successful Supabase insert**; later can be deleted/undone and history/7-day protein summaries refresh.
- Nutrient dashboard: protein, iron, vitamin B12, folate, zinc, vitamin D, vitamin C, separate plant omega-3 ALA and fish EPA/DHA, and magnesium. **Missing reference values are blank; not zero**.
- No new body-specific protein target, deficiency calculation, or medical advice. Estimates only include user-logged foods and available data.
- Existing Hair module keeps clinician-discussion lab checklist, food-source reference, tracked routines, monthly private photos and water from `water_logs`. Existing Diet Planner remains planned food and is explicitly not counted as consumed.

## Source / precision caveats
- General USDA FoodData Central: https://fdc.nal.usda.gov/
- Chicken breast roasted meat only, SR Legacy **FDC 171477**, 31.02 g protein / 100 g cooked and 1.04 mg iron: https://whatyoueat.io/foods/171477
- Lentils cooked boiled, **FDC 172421**, 9.02 g protein / 100 g cooked: https://whatyoueat.io/foods/172421
- Other catalog values are **rounded representative estimates**, *not a complete verified USDA reproduction*. Do not use estimates for diagnosis, deficiency correction or supplement decisions. Packaged brand/recipe labels may be more appropriate. No API calls, licensing dependencies or dynamic untrusted food AI needed.
- Some nutrients have no estimate for some foods (including vitamin D); the UI must never treat missing numbers as zeros or state nutritional sufficiency. Plant ALA and marine EPA/DHA cannot be directly equated.
- User-supplied lists of tests/treatments are for planning with a clinician. No auto prescription for topical minoxidil or microneedling; unclear 0.1% active ingredient remains unspecified.

## QA gates / acceptance
- Unit tests validate 3 eggs, 200g cooked chicken, custom/manual or absent estimates, unsafe portion rejection, date filtering, and omega-3 type separation.
- Run `npm run typecheck`, `npm test`, `npm run verify:features`, `npm run verify:sql`, `npm run build`.
- Confirm no schema changes outside additive `food_intake_logs`; verify ownership/creator RLS for cross-workspace/cross-user writes after project is accessible.
- Real project migration, actual browser write/read/undo and mobile screenshots remain blockers. Feature can be preview-built, **do not merge to production until authorized DB and RLS validation**.
