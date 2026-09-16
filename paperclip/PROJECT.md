---
schema: agentcompanies/v1
kind: project
slug: lifeos
name: LifeOS
description: Paperclip project package for bwpahmed/LifeOS
metadata:
  repository: https://github.com/bwpahmed/LifeOS
  defaultBranch: main
---

# Paperclip operating contract

This package seeds the project identity for Paperclip. It does not replace the repository's engineering instructions.

When Paperclip assigns work in this project:

1. Execute from the repository workspace/root and read root `AGENTS.md` completely before planning or editing.
2. For non-trivial work, also read `AI_TEAM.md`, `AI_CAPABILITY_STACK.md`, and relevant project documentation.
3. Treat `AGENTS.md` as canonical. Paperclip goals, tasks, prompts and role text must not weaken repository privacy/security rules.
4. Inspect the current implementation and extend the existing source of truth rather than creating duplicate data/business logic.
5. Use an isolated task branch/worktree for code changes and keep unrelated refactors out.
6. Do not deploy, mutate production data, alter RLS/auth, rotate secrets or perform destructive/external actions unless the user explicitly requests it.
7. Start with assignment/on-demand execution. Keep timer heartbeats disabled until a human intentionally enables a proven recurring workflow.
8. Run relevant tests/checks and require human review before merging risky or cross-cutting work.
9. Finish each task with files changed, checks actually run, unresolved risks, and remaining manual/production steps.
