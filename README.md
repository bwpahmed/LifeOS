# LifeOS

Personal & Family Command Center built with Next.js, Supabase and an optional AI provider.

## AI agent entry point

Any AI coding agent working in this repository must read `AGENTS.md` first. For non-trivial work, continue with `AI_TEAM.md` and `AI_CAPABILITY_STACK.md` before changing code.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. For a fresh Supabase project, run `supabase/schema.sql`.
4. For an existing project created from the older baseline schema, apply `supabase/migrations/20260919_security_bootstrap.sql`.
5. Optionally configure `OPENAI_API_KEY` or `OPENROUTER_API_KEY`.
6. Run `npm ci` and `npm run dev`.

The security migration enables RLS across application tables, creates a personal workspace for existing/new users, and creates the private storage bucket used for sensitive legacy hair-photo imports.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

GitHub CI runs the same checks for pull requests and pushes to `main`.

## Data migration

The original standalone app is preserved at `legacy/LifeOS_Standalone.html`.

Settings → Data can preview and import a legacy LifeOS JSON backup into Supabase. Matching core records are skipped to reduce accidental duplicates. Hair photos are uploaded to the private `lifeos-private` bucket.

## AI behavior

Smart Capture and AI Coach use a configured provider only when a live provider call succeeds. If no key is configured or the provider fails, LifeOS clearly reports and uses the deterministic fallback. AI output is validated and Smart Capture never saves until the user confirms.

Paperclip project metadata lives under `paperclip/`.
