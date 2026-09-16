# LifeOS AI Usage Guide

For most tasks, write the problem naturally. The repository policy decides which specialist/capability is relevant.

## Recommended master prompt

> Read `AGENTS.md`, `AI_TEAM.md`, and `AI_CAPABILITY_STACK.md` first. Inspect the current implementation and source of truth before changing anything. Use only the minimum relevant skills/agents. Do not create parallel logic or touch unrelated code. After implementation run relevant tests/typecheck/build and independent QA when risk warrants it. Final report: root cause/goal, files changed, verification, remaining risks.
>
> Task: [describe the task]

## Audit only

> Follow LifeOS repository rules. Audit only — do not change code. Map the current source of truth, data flow, permissions, defects, duplicate logic and risks. Cite the relevant files/behavior.

## New substantial feature

> Follow LifeOS rules. First create/confirm requirements, acceptance criteria and implementation plan. Use Spec Kit where useful. Do not implement until the plan is coherent with the existing architecture.

## Supabase / auth / RLS

> Inspect the current schema, auth flow and RLS first. Explain migration/security risk and rollback implications. Do not mutate production data or weaken RLS. Implement only the smallest verified change.

## AI / smart capture

> Treat model output as untrusted. Preserve deterministic validation and user review. Do not invent or silently save financial, health, deadline, payment or other factual records.

## UI-only change

> Preserve data logic, API behavior, Supabase calls and permission rules. Establish a baseline, change only necessary UI files, then verify the diff and responsive behavior.

## High-risk task

Add:

> Use an independent security/data/QA reviewer after implementation. Do not deploy or perform destructive operations without explicit approval.
