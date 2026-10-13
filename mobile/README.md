# LifeOS Mobile (Kotlin Multiplatform + Compose + SwiftUI)

Welcome to the **LifeOS Mobile** subsystem within the unified `bwpahmed/LifeOS` monorepo.
This project integrates both **Android** and **iOS** mobile applications with the production LifeOS Supabase backend, keeping the Next.js web application completely untouched.

---

## Architecture Overview

```text
LifeOS Monorepo
├── app/                  # Existing Next.js 14 web application (Untouched)
├── lib/                  # Shared TypeScript domain logic & web Supabase client
├── supabase/             # Postgres schemas, RLS policies, migrations
└── mobile/               # Mobile Multiplatform ecosystem
    ├── shared/           # KMP Multiplatform Core (Android + iOS)
    │   ├── domain/       # Shared models: Tasks, Habits, Workspaces, Goals, Notes
    │   ├── supabase/     # Supabase Auth, PostgREST queries, Realtime sync queue
    │   └── repository/   # Unified local-first + cloud cache repository
    ├── androidApp/       # Android Application (Jetpack Compose UI)
    └── iosApp/           # iOS Application (SwiftUI + SharedCore framework)
```

---

## Supabase Backend & Schema Findings

* **Project URL**: `https://fdtbftuxziicubztgcde.supabase.co`
* **Publishable Key**: `sb_publishable_vEduzllO2aXH9NvGBgqvfg_T3ZuROXJ` (from `lib/supabase/client.ts`)
* **Realtime Publication**: `supabase_realtime` already includes `tasks`, `habits`, and `habit_logs`. No database migrations or publication alterations are permitted.
* **Row Level Security (RLS)**: Enforced through Postgres policies calling `is_workspace_member(workspace_id)` and `can_access_module(workspace_id, module)`. The mobile client authenticates against Supabase GoTrue (`/auth/v1/token?grant_type=password`) and attaches `Authorization: Bearer <access_token>` to PostgREST queries.

### Notes & Vault Mapping
Inspection of `supabase/schema.sql` and web pages confirms:
1. **No generic `notes` table exists** in the public database schema.
2. The web application implements notes and reflections via two dedicated tables:
   - **`public.sticky_notes`**: Quick pinned notes containing `id`, `workspace_id`, `created_by`, `title`, `body`, `color`, `pinned`, `archived`, `updated_at`. RLS policy: `sticky notes select` and `sticky notes insert`.
   - **`public.journal_entries`**: Structured journal and thought captures containing `id`, `workspace_id`, `date`, `mood`, `body`, `tags`, `privacy`, `created_by`, `created_at`. RLS policy: `"private journal" on public.journal_entries`.
3. In Phase 1, mobile Vault/Notes are stored locally with zero risk of database collision, and prepared to map to `sticky_notes` and `journal_entries`.

---

## Verified Build Artifacts

1. **KMP Shared Module (`:shared`)**: Compiles to `SharedCore.aar` on Android and prepares iOS multiplatform frameworks (`SharedCore.framework`).
2. **Android Application (`:androidApp`)**: Successfully compiled and assembled into debug APK (`androidApp-debug.apk`, ~16 MB).
3. **iOS Application (`iosApp`)**: Configured with Xcode 16 project structure and native SwiftUI interface (`ContentView.swift`) consuming shared LifeOS domain models.

---

## Building Locally

### Android Application & Shared KMP Module
```bash
cd mobile
gradle :shared:assemble
gradle :androidApp:assembleDebug
```

### iOS Application
Open `mobile/iosApp/LifeOSApp.xcodeproj` in Xcode on macOS, or build via command-line:
```bash
cd mobile/iosApp
xcodebuild -project LifeOSApp.xcodeproj -scheme LifeOSApp -sdk iphonesimulator clean build CODE_SIGNING_ALLOWED=NO
```

---

## Continuous Integration (CI)
GitHub Actions workflow `.github/workflows/mobile-ci.yml` validates:
- `build-android-and-kmp` (Ubuntu runner): Compiles `:shared:assemble` and `:androidApp:assembleDebug`.
- `build-ios` (macOS-14 runner): Compiles `LifeOSApp.xcodeproj` with `xcodebuild`.
