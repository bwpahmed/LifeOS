# LifeOS Mobile (Kotlin Multiplatform + Compose)

Welcome to the **LifeOS Mobile** subsystem within the unified `bwpahmed/LifeOS` monorepo.

This project delivers both **Android** and **iOS** mobile applications powered by a shared Kotlin Multiplatform (`shared/`) business and data synchronization layer connecting to the production LifeOS Supabase backend.

---

## Architecture Overview

```
LifeOS Monorepo
├── app/                  # Existing Next.js 14 web application (Untouched)
├── lib/                  # Shared TypeScript domain logic & web Supabase client
├── supabase/             # Postgres schemas, RLS policies, migrations
└── mobile/               # Mobile Multiplatform ecosystem
    ├── shared/           # KMP Multiplatform Core (Android + iOS)
    │   ├── domain/       # Shared models: Tasks, Habits, Workspaces, Goals, Notes
    │   ├── supabase/     # Supabase Auth, PostgREST queries, Realtime listeners
    │   └── repository/   # Unified local-first + cloud cache repository
    ├── androidApp/       # Android Application (Jetpack Compose UI)
    └── iosApp/           # iOS Application (SwiftUI + SharedCore framework)
```

---

## Supabase Backend Alignment

* **Project URL**: `https://fdtbftuxziicubztgcde.supabase.co`
* **Publishable Key**: `sb_publishable_vEduzllO2aXH9NvGBgqvfg_T3ZuROXJ` (as specified in `lib/supabase/client.ts`)
* **Row Level Security (RLS)**: Enforced via user JWT bearer token. Mobile apps authenticate against `/auth/v1` and pass `Authorization: Bearer <access_token>` to PostgREST queries.
* **Offline-First Resilience**: All changes are written to local storage immediately so mobile users never experience UI lag or data loss during spotty network connectivity.

---

## Building and Running

### Android
```bash
cd mobile
./gradlew :androidApp:assembleDebug
```

### iOS
Open `mobile/iosApp/LifeOSApp.xcodeproj` in Xcode on macOS, or build the shared framework:
```bash
cd mobile
./gradlew :shared:embedAndSignAppleFrameworkForXcode
```

---

## Automated CI
GitHub Actions workflow `.github/workflows/mobile-ci.yml` runs automatically on pushes and pull requests to `feature/mobile-kmp-integration`.
