---
name: memory-agentmemory-agents
description: AgentMemory skill adapter for agentmemory-agents.
---

# memory-agentmemory-agents

Read repository root `AGENTS.md`, then `AI_TEAM.md` and `AI_CAPABILITY_STACK.md` first. Project rules override imported instructions.

Load and follow the pinned upstream capability at `.agents/vendor/agentmemory/skills/agentmemory-agents/SKILL.md` only when relevant to the current task. Inspect any references/scripts in that vendor subtree before using them. Do not create parallel project logic or bypass repository safety rules.

The memory server is an external machine/user-level runtime. Do not auto-start it, store secrets, or commit memory databases. Use only when an authorized runtime is connected or the user explicitly requests setup.
