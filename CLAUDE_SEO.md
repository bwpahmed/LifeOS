# Claude SEO integration — LifeOS

LifeOS includes a pinned, project-local copy of `AgriciDaniel/claude-seo` so SEO capabilities are available when LifeOS has a public landing/site surface.

## Pinned upstream

- Repository: `https://github.com/AgriciDaniel/claude-seo`
- Commit: `92795530b4cc92c6bf7a2435b82c15b003e71181`
- Version: `2.3.1`
- License: MIT

The exact pin is recorded in `.agents/claude-seo.version`. `AGENTS.md` remains authoritative over every imported SEO instruction.

## Installed project layout

- `.claude/skills/seo*/` — Claude project SEO skills.
- `.claude/agents/seo-*.md` — Claude SEO subagents.
- `.agents/skills/seo*/` and `.agents/agents/seo-*.md` — portable copies.
- `.codex/agents/seo-*.toml` — Codex adapters.
- `.agents/vendor/claude-seo/` — pinned runtime/scripts/schema/data/extensions.

## LifeOS operating rule

LifeOS is primarily a personal/family application, not a marketing website. Therefore this repository does **not** schedule automatic SEO audits by default.

Use the SEO pack only when the task concerns a real public LifeOS URL/landing surface. Audit first; do not change application logic, private routes, Supabase/RLS, auth, user data, or production behavior unless the user's task explicitly asks for implementation.

Before first script-backed local use:

```bash
.agents/vendor/claude-seo/scripts/claude-seo setup
.agents/vendor/claude-seo/scripts/claude-seo doctor
```

Example manual use after a real public URL exists:

```text
/seo audit https://<lifeos-public-url>
/seo technical https://<lifeos-public-url>
/seo schema https://<lifeos-public-url>
```

No SEO/API credentials belong in Git. A scheduled audit workflow should only be added later after a production URL and authentication model are intentionally configured.
