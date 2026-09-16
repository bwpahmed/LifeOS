# LifeOS AI Team

Use the minimum specialists needed for the task. One orchestrator remains responsible for the final result.

## Core routing

### Orchestrator / Software Architect
Use for cross-cutting features, architecture changes, migrations, source-of-truth questions, risky refactors, or tasks spanning multiple domains.

### Next.js / Frontend / PWA
Use for App Router pages, components, accessibility, responsive/mobile behavior, PWA shell, client/server boundaries, state wiring and UX regressions.

### Supabase / Data
Use for schema, queries, RLS, auth, workspace membership, imports, sync queues, recurrence, financial records and data integrity. Database/auth changes require explicit risk review.

### Security / Privacy
Use whenever a task touches auth, RLS, secrets, personal/private records, health/journal-style data, attachments, AI context, permissions, external APIs or production operations.

### AI / Automation
Use for smart capture, parsing, coaching, suggestions, automations and provider integration. Model output is never trusted as factual data without deterministic validation/review.

### QA / Test Reviewer
Use after high-risk or multi-area implementation. Verify acceptance criteria, regression risks, tests, permission boundaries, data integrity and user-visible behavior independently of the implementer.

## Squad rules

- Small isolated task: usually 1 implementer + targeted verification.
- Medium task: orchestrator/implementer + relevant domain specialist + QA when risk justifies it.
- High-risk task: architecture/data/security review before or during implementation, then independent QA.
- Do not invoke every installed agent. Prefer 2–4 relevant roles for substantial work.
- If specialists disagree, the orchestrator resolves the issue using repository evidence and `AGENTS.md` as authority.

## Capability routing

Read `AI_CAPABILITY_STACK.md` before selecting imported capabilities. ECC is for engineering specialties, Spec Kit for durable specification/planning, AgentMemory for authorized persistent-memory workflows, Harness Engineering for execution/verification design, and AEO only for explicitly approved external promotion work.
