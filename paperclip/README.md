# LifeOS Paperclip package

This folder makes LifeOS ready to be added as a project in an existing Paperclip company/control plane.

The repository remains authoritative:

`Paperclip task -> agent opens LifeOS -> AGENTS.md -> AI_TEAM.md -> AI_CAPABILITY_STACK.md -> relevant skills/agents -> inspect -> implement -> tests -> QA`

Recommended initial mode:

- assignment/on-demand runs only;
- isolated branch/worktree;
- no production deploy or production DB writes by default;
- no timer heartbeats until a recurring workflow has been proven;
- human review before risky merges.

Example dry-run import from a machine that has Paperclip installed:

```bash
npx paperclipai company import ./paperclip --target existing --company-id <COMPANY_ID> --include projects --dry-run
```

Then repeat without `--dry-run` after reviewing the proposed import. Configure the actual local workspace path on the Paperclip host; do not hard-code machine paths or secrets into this repository.
