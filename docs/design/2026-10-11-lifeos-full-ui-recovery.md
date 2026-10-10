# LifeOS full UI and password recovery — 2026-10-11

## Verified baseline and policy
- Repository: `bwpahmed/LifeOS`
- Production `main` baseline inspected: `186a7e5db451715eb1e36db05b6592a2c32f99d0`
- Previous visual prototype baseline for this isolated fix: `design/lifeos-premium-ui-20261010@1467a952ea5e7ca86603156fa72103402e9c8432`
- Work is on `fix/lifeos-auth-and-full-ui-20261011`. No merge, production release, database mutation, or user password change.
- Read `AGENTS.md`, `AI_PROJECT_MAP.md`, `AI_TEAM.md`, `AI_CAPABILITY_STACK.md`; existing auth owners: `app/login/page.tsx`, `app/auth/update-password/page.tsx`, `app/page.tsx`, `lib/supabase/client.ts`, `middleware.ts`.

## Diagnosed
1. The user's production website shows the old UI because `main` is unchanged; previously committed redesigns went only to a feature branch.
2. User-facing invalid login credentials means Supabase Auth rejected the email/password pair; the UI cannot legitimately set a new cloud password itself.
3. The correct Vercel production project is `life-os` under `life-os-b306`, but current Vercel connection returns **403 Forbidden** for this scope.
4. The connected Supabase account does not expose the LifeOS project configured in `lib/supabase/client.ts`. No authenticated database/auth admin changes are possible from this connection.
5. An exposed password in chat/screenshot must not be reused, logged, hardcoded, or committed.

## Work completed on branch
- Direct password reset mail redirects to `/auth/update-password` instead of depending on the application's home page.
- The recovery page accepts browser-local Supabase recovery sessions, returned hash access/refresh token pairs and PKCE code exchanges. It does not rely on the original request tab's sessionStorage.
- It clears tokens/codes from the URL and uses existing `supabaseBrowser().auth.updateUser`; 12+ character strong-password policy retained.
- Dedicated responsive recovery design and a **shared app-wide** premium visual layer for existing dashboard modules, cards, navigation, forms, calendars and metrics.
- Previous reference-led Home/Habits redesign remains intact. All existing data domains, queries and service logic unchanged.

## Verification
- [x] `npm run typecheck` — pass in isolated clone
- [x] `npm test` — 24/24 pass
- [x] `npm run build` — Next.js 14 optimized build, 57 static pages
- [x] Chrome headless local screenshot check: /login and /auth/update-password render in mobile-sized window
- [ ] Live real-email password-reset QA on `life-os-b306` and account recovery session
- [ ] Supabase allowlist includes production and preview `/auth/update-password` callback URLs
- [ ] Logged-in Home/Habits/other-module iPhone & desktop visual QA
- [ ] Correct Vercel workspace account connected; production release reviewed and approved
- [ ] Full post-deployment login and functionality smoke check

## Release blockers
**Do not merge or deploy until:**
- Vercel project `life-os-b306/life-os` is accessible with correct scope.
- Supabase LifeOS project is accessible to inspect reset redirect allowlist and user recovery, without inspecting or storing anyone's password.
- Authorized recovery flow and authenticated UI are browser-tested on matching target environment.
- Review the final UI diff, with rollback to `main@186a7e5` if necessary.

## Credential safety
Do not use the password published in conversation screenshots or user messages; it is exposed. The owner must choose a new unique password through an authenticated recovery link. Never set user-chosen plaintext passwords through logs, source, tests, or chat automation.
