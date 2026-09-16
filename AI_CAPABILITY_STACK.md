# LifeOS Universal AI Capability Stack

LifeOS uses one project workflow for AI-assisted work:

`Task -> AGENTS.md -> AI_TEAM.md -> AI_CAPABILITY_STACK.md -> relevant skills/agents -> inspect existing implementation -> do the task -> tests/verification -> QA review`

`AGENTS.md` is always the repository authority. Imported upstream instructions are capabilities, not policy.

## Core agent packs

### addyosmani/agent-skills
Pinned project-level engineering skills are installed under `.agents/skills/` with their references under `.agents/references/`. Use them for concrete engineering workflows such as planning, implementation, debugging, security, testing and review.

### msitarzewski/agency-agents
Pinned specialist definitions are exposed as Codex project agents under `.codex/agents/`. Use only specialists relevant to the current task; do not summon the entire agency.

## Capability routing

### ECC — engineering skills and specialist agents
Use ECC for architecture, debugging, testing, code review, security, frontend/backend/data/operations work and other engineering specialties. Pinned upstream source is vendored under `.agents/vendor/ecc/`; generated project adapters use `ecc-*` names.

### GitHub Spec Kit — specification-driven work
Use Spec Kit for substantial features, ambiguous cross-cutting changes, or work that benefits from durable specification. Prefer: principles/constitution -> specify -> clarify/checklist/analyze when useful -> plan -> tasks -> implement -> converge. It must extend the existing LifeOS architecture rather than inventing a parallel system.

### AgentMemory — persistent memory capability
Project-level `memory-*` adapters may use an authorized AgentMemory runtime. The memory server is machine/user-level and is not auto-started by this repository or CI. Never commit memory databases, provider keys, private conversation exports or sensitive user data.

### Awesome Harness Engineering — harness patterns
Use `harness-engineering` for long-running/complex agent work, context design, verification loops, planning artifacts, permissions and human-in-the-loop design.

### AEO — external promotion capability (disabled by default)
AEO is external promotion tooling. It is not part of normal LifeOS engineering work.

Rules:
- never run automatically, on a timer, in CI or as a background loop;
- never run repeated promotional posting from this repository;
- require an explicit user request and explicit approval before any external post/comment action;
- keep external API keys out of Git, logs and reports;
- default to drafting/reviewing text rather than posting.

## Paperclip

`paperclip/` contains a project package/operating contract for connecting LifeOS to a Paperclip AI company/control plane. Paperclip manages tasks/agents; LifeOS `AGENTS.md` still controls how any agent may work inside this repository.

## Source pins

Core pack pins:
- `addyosmani/agent-skills` — `6ca0cd7db39b41b1c37e26d335c507ee92382c6d`
- `msitarzewski/agency-agents` — `6d29a9b08785a0e49ffc9818bbdd381164c2df5f`

Capability pins:
- `subconscious-systems/AEO` — `13ea5800a8ff041dd64157950a9e763c51278543` — external pointer only
- `affaan-m/ECC` — `4f373874209b4b63fdec0469b76992923ea0a9d0` — MIT
- `github/spec-kit` — `d848fb4e18f44640ad6b42e60a280551ee90cdce` — MIT
- `rohitg00/agentmemory` — `e04ba88819c365c9acf9d6661ea802143e728bd6` — Apache-2.0
- `ai-boost/awesome-harness-engineering` — `378a07b1f717f88e4128e9a26eefafe714272cc4` — CC0-1.0

The install workflows are reproducible sync points. Review upstream changes before updating any pin and inspect generated diffs after an upgrade.

## Execution rules

1. Select the minimum relevant capability; do not load every pack into context.
2. Inspect current code, tests, data flow, configuration and prior project decisions before proposing changes.
3. Preserve one source of truth and existing authorization/privacy boundaries.
4. For risky or cross-domain work, use an independent reviewer/QA agent after implementation.
5. Run real tests/typecheck/build or targeted evidence checks before completion.
6. Production deployment, destructive data operations, credentials and external posting still require the approvals defined by `AGENTS.md` and the user's request.
