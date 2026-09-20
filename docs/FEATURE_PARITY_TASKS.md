# LifeOS parity task split

This checklist is the implementation plan for the uploaded LifeOS Advanced specification plus the supplied screenshots. The repository remains Supabase-first: cloud records live in Supabase; local device storage is limited to cache, offline queues and device preferences.

## Part 1 — Visual / screenshot parity
- [x] Canonical sidebar/topbar/mobile navigation
- [x] Home command center
- [x] Today timeline + focus controls
- [x] Tasks, Goals, Projects, Money, Health, Family, Europe, Calendar, Timeline, Automations, Reviews, Settings
- [x] Advanced modules exposed instead of hidden
- [x] Light and dark themes
- [x] Light-theme text/icon/form contrast hardening

## Part 2 — Money
- [x] Money Recovery CRM
- [x] Follow-up history
- [x] Escalation
- [x] Payment history
- [x] Waste Guard / unnecessary expense memory
- [x] Waste reason + avoid-next-time rule + recurring waste

## Part 3 — Health
- [x] Health command center
- [x] Hair recovery
- [x] Labs / Health Vault
- [x] Self-control
- [x] Water tracker
- [x] Water reminders
- [x] Medicine reminders
- [x] Diet plan
- [x] Sleep tracker
- [x] Sleep reminders
- [x] Health reminder scheduler

## Part 4 — Planning / productivity
- [x] Priority engine with reasons
- [x] Morning check-in
- [x] Daily plan + AI plan suggestion
- [x] Focus timer / pause / blocked / distraction log
- [x] Eisenhower matrix
- [x] Waiting For
- [x] Dependencies
- [x] Delegation / responsible person
- [x] Time tracking
- [x] Weekly planning
- [x] Daily / weekly / monthly reviews
- [x] Achievement milestones

## Part 5 — Capture / notes / search
- [x] Quick Add
- [x] Voice capture
- [x] Sticky Notes with no hard-delete policy
- [x] Journal text / voice / photo
- [x] Global search
- [x] Universal timeline

## Part 6 — Calendar / reminders
- [x] Day view
- [x] Week view
- [x] Month view
- [x] Timeline view
- [x] Drag task to reschedule
- [x] Google Calendar OAuth integration code
- [x] Smart snooze
- [x] Four severity levels
- [x] Quiet hours / DND
- [x] General hourly in-app scheduler
- [x] Health 15-minute in-app scheduler

## Part 7 — Mobile / offline / data
- [x] Installable PWA
- [x] Mobile bottom navigation
- [x] Compact Tasks & Notes mobile screen
- [x] Installed-app shortcuts
- [x] Offline task creation
- [x] Offline habit completion
- [x] Encrypted private offline journal text queue
- [x] Realtime multi-device refresh
- [x] JSON / CSV / Print-PDF export
- [x] Automatic server backup path

## Part 8 — Security / source of truth
- [x] Supabase Auth
- [x] Single-owner guard
- [x] RLS on application tables
- [x] Private module policies
- [x] Private storage
- [x] Encrypted OAuth token storage
- [x] Supabase is persistent source of truth
- [x] Local storage limited to approved cache/preferences/queues

## Verification gates
- [x] CI tests
- [x] TypeScript
- [x] SQL verifier
- [x] Feature coverage verifier
- [x] Production build
- [x] AI policy gate
- [ ] Vercel deployment status
- [x] Live Supabase reminder functions smoke-tested
- [x] Live cron jobs confirmed active


## Remaining external blockers
- [ ] Latest Vercel preview deployment is currently blocked by Vercel build-rate-limit. GitHub CI production build itself passes.
- [ ] Google Calendar website OAuth cannot be activated until the Vercel project has GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET and GOOGLE_CALENDAR_TOKEN_KEY configured. The integration code is already present.
- [ ] A true native Android/iOS home-screen widget is not available to a normal PWA. LifeOS provides the closest web-supported equivalent: installable PWA + Tasks & Notes compact screen + app shortcuts.
