import fs from 'node:fs';

const required = [
  'AGENTS.md',
  'AI_TEAM.md',
  'AI_CAPABILITY_STACK.md',
  'AI_USAGE_GUIDE.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.cursor/rules/00-master-policy.mdc',
  '.codex/agents/lifeos-orchestrator.toml',
  '.opencode/agents/lifeos-orchestrator.md',
  'paperclip/PROJECT.md',
];

const missing = required.filter((f) => !fs.existsSync(f));
if (missing.length) {
  console.error(`AI policy files missing: ${missing.join(', ')}`);
  process.exit(1);
}

const agents = fs.readFileSync('AGENTS.md', 'utf8');
if (!agents.includes('CANONICAL AI POLICY')) {
  console.error('AGENTS.md is not marked canonical');
  process.exit(1);
}

for (const f of [
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.cursor/rules/00-master-policy.mdc',
  '.codex/agents/lifeos-orchestrator.toml',
  '.opencode/agents/lifeos-orchestrator.md',
  'paperclip/PROJECT.md',
]) {
  if (!fs.readFileSync(f, 'utf8').includes('AGENTS.md')) {
    console.error(`${f} is disconnected from AGENTS.md`);
    process.exit(1);
  }
}

console.log('LifeOS AI policy wiring verified.');
