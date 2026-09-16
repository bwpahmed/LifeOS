---
name: speckit-constitution
description: GitHub Spec Kit workflow adapter for constitution.
---

# speckit-constitution

Read repository root `AGENTS.md`, then `AI_TEAM.md` and `AI_CAPABILITY_STACK.md` first. Project rules override imported instructions.

Load and follow the pinned upstream capability at `.agents/vendor/spec-kit/templates/commands/constitution.md` only when relevant to the current task. Inspect any references/scripts in that vendor subtree before using them. Do not create parallel project logic or bypass repository safety rules.

Use Spec Kit for durable specification/planning artifacts on substantial or ambiguous work. Preserve the repository's existing architecture and source of truth.
