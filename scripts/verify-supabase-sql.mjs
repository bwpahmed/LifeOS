import fs from "node:fs";

const files = [
  "supabase/schema.sql",
  "supabase/migrations/20260919_security_bootstrap.sql",
];

let failed = false;

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  const lines = sql.split(/\r?\n/);
  const malformed = lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((x) => x.text === "do $" || x.text === "end $;");

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
}

if (failed) process.exit(1);
console.log("Supabase SQL sanity checks passed.");
