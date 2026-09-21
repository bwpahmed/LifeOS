# LifeOS parity task split

This is the execution checklist used after reviewing the repository agent instructions and the uploaded LifeOS Advanced specification.

## Part 1 — Reference parity
- [x] Reference screenshots mapped to routes
- [x] Uploaded 64-section specification mapped to implementation
- [x] Hidden advanced modules exposed
- [x] Dark and light mode
- [x] Light-mode contrast hardened

## Part 2 — Money / waste control
- [x] Money Recovery CRM
- [x] Payment + follow-up history
- [x] Escalation
- [x] Waste Guard
- [x] Waste reason
- [x] Avoid-next-time memory
- [x] Recurring waste tracking
- [x] Waste monthly calculations covered by unit tests

## Part 3 — Health
- [x] Health Command Center
- [x] Hair / labs / vault / self-control
- [x] Water target + quick logs
- [x] Water reminders
- [x] Medicine reminders + completion
- [x] Diet plan + meal reminders
- [x] Sleep tracker + reminder
- [x] 15-minute health scheduler
- [x] Valid 24-hour time enforcement in UI and DB
- [x] Health helper unit tests

## Part 4 — Planning / execution
- [x] Priority engine + reasons
- [x] Morning check-in
- [x] Daily planner + AI plan
- [x] Focus / time tracking
- [x] Matrix / Waiting / dependencies
- [x] Responsible/delegation labels
- [x] Daily/weekly/monthly review
- [x] Weekly planning
- [x] Achievements

## Part 5 — Capture / notes / search
- [x] Quick Add
- [x] Voice capture
- [x] Sticky Notes without hard delete
- [x] Journal text/voice/photo
- [x] Search tasks/payments/follow-ups/projects/journal/attachments
- [x] Universal timeline

## Part 6 — Calendar / notifications / automation
- [x] Day / Week / Month / Timeline
- [x] Drag task to reschedule
- [x] Smart snooze
- [x] Normal / Important / Urgent / Critical
- [x] Quiet hours + DND blocks
- [x] General hourly scheduler
- [x] Web Push dispatcher
- [x] Structured automation conditions

## Part 7 — Mobile / offline / backup
- [x] Installable PWA
- [x] Mobile bottom nav
- [x] Tasks & Notes compact screen
- [x] PWA shortcuts
- [x] Offline task/habit queue
- [x] Encrypted private journal offline queue
- [x] Realtime sync
- [x] JSON / CSV / Print-PDF
- [x] Separate Health / Finance exports
- [x] Automatic backup path

## Part 8 — Security / single source
- [x] Supabase Auth + single-owner guard
- [x] RLS
- [x] Private storage
- [x] Encrypted OAuth token storage
- [x] Supabase persistent source of truth
- [x] Cross-user RLS smoke
- [x] Transactional CRUD smoke
- [x] Clock validation DB constraints

## Verification gates
- [x] Unit tests
- [x] TypeScript
- [x] SQL verifier
- [x] Feature coverage verifier
- [x] Production build
- [x] AI Policy Gate
- [x] Latest Vercel deployment before docs update
- [x] Live scheduler smoke
- [x] Active cron jobs / Edge Function

## External / platform items, not falsely marked complete
- [ ] Google Calendar account connection: website OAuth code exists, but production has no Google Calendar connection row. OAuth credentials + user consent are still required.
- [ ] True native Android/iOS home-screen widget: not available through standard PWA APIs. LifeOS provides compact mobile Tasks & Notes + shortcuts instead.
- [ ] Supabase leaked-password protection: Auth dashboard setting is still disabled and cannot be toggled through the currently connected Supabase tool.
