import fs from "node:fs";

const files = [
  "supabase/schema.sql",
  "supabase/migrations/20260919_security_bootstrap.sql",
];

const requiredFragments = [
  "create policy \"own notifications select\"",
  "create policy \"own notification preferences\"",
  "create policy \"own push subscriptions\"",
  "create table if not exists public.workspace_invitations",
  "create policy \"workspace invitations admin select\"",
  "create policy \"lifeos private storage select\"",
  "create or replace function public.can_read_private_storage",
  "create or replace function public.can_insert_private_storage",
  "create or replace function public.can_manage_private_storage",
  "when area = ''Money'' then ''money''",
  "when area = ''Family'' then ''family''",
  "when area = ''Europe'' then ''europe''",
  "when area in (''Business'',''Work'') then ''business''",
];

let failed = false;

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  const lines = sql.split(/\r?\n/);
  const malformed = lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((x) => ["do $","end $;","as $","$;"].includes(x.text));

  if (malformed.length) {
    failed = true;
    console.error(`${file}: malformed dollar-quoted DO block`);
    for (const hit of malformed) console.error(`  line ${hit.line}: ${hit.text}`);
  }

  const tokens = sql.match(/\$\$/g)?.length ?? 0;
  if (tokens % 2 !== 0) {
    failed = true;
    console.error(`${file}: unbalanced $$ delimiters (${tokens} tokens)`);
  }

  const begin = (sql.match(/\bbegin\b/gi) || []).length;
  const commit = (sql.match(/\bcommit\s*;/gi) || []).length;
  if (file.endsWith("security_bootstrap.sql") && (begin < 1 || commit < 1)) {
    failed = true;
    console.error(`${file}: migration transaction wrapper appears incomplete`);
  }

  for (const fragment of requiredFragments) {
    if (!sql.toLowerCase().includes(fragment.toLowerCase())) {
      failed = true;
      console.error(`${file}: required security fragment missing: ${fragment}`);
    }
  }
}

if (failed) process.exit(1);
console.log("Supabase SQL syntax and security sanity checks passed.");

const nutritionMigration = fs.readFileSync("supabase/migrations/20261012_food_intake_logs.sql","utf8").toLowerCase();
const nutritionSchema=fs.readFileSync("supabase/schema.sql","utf8").toLowerCase();
const nutritionGuardrails=[
  "create table if not exists public.food_intake_logs",
  "alter table public.food_intake_logs enable row level security",
  "created_by=auth.uid()",
  "public.can_access_module(workspace_id,'health')",
  "public.is_workspace_writer(workspace_id)",
  "food intake own select",
  "food intake own insert",
  "food intake own update",
  "food intake own delete",
  "check (quantity_g > 0 and quantity_g <= 5000)"
];
for(const fragment of nutritionGuardrails){
 if(!nutritionMigration.includes(fragment)||!nutritionSchema.includes(fragment)){
  console.error("Nutrition RLS/schema guardrail missing: "+fragment);
  process.exitCode=1;
 }
}
if(process.exitCode)process.exit(process.exitCode);
console.log("Food intake RLS and canonical schema guardrails passed.");
