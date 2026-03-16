# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application (with native mobile apps on the roadmap) that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, and personal growth tracking.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, community support, and measurable spiritual growth.

---

## Implementation Details

**All technical standards, security policies, coding conventions, design system details, UX flows, and component architecture are in `.claude/rules/`. Read the relevant rule file before implementing any feature.**

- 🚨 **[AI Safety & Ethics](.claude/rules/01-ai-safety.md)** - Crisis detection, content boundaries, moderation
- 🔒 **[Security](.claude/rules/02-security.md)** - Auth, rate limiting, encryption, input validation, auth gating strategy, demo mode data policy
- ⚙️ **[Backend Standards](.claude/rules/03-backend-standards.md)** - Spring Boot conventions, API contract
- 🎨 **[Frontend Standards](.claude/rules/04-frontend-standards.md)** - React patterns, accessibility, responsive design
- 🗄️ **[Database](.claude/rules/05-database.md)** - Schema, indexes, data retention
- ✅ **[Testing](.claude/rules/06-testing.md)** - Testing strategy, coverage requirements, definition of done
- 📊 **[Logging & Monitoring](.claude/rules/07-logging-monitoring.md)** - Structured logging, PII handling
- 🚀 **[Deployment](.claude/rules/08-deployment.md)** - Environment variables, deployment platforms, dev commands
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities, Music architecture
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - Navigation structure, all user flows (Daily Hub, Prayer, Journal, Meditate, Prayer Wall, Dashboard, etc.)

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Complete Feature List

Full launch targets a complete feature set; features may ship incrementally (alpha/beta) for early feedback.

**Prerequisites Cheatsheet** (build features in any order, just satisfy dependencies first):

- **AI features** require: safety checks + rate limiting + logging + backend crisis detection
- **Community features** (prayer wall) require: auth + moderation + admin audit log + email notifications
- **Analytics** require: mood tracking persisted to database (localStorage for frontend-first build)
- **Audio features** require: TTS API integration (OpenAI TTS or browser Speech Synthesis for MVP)
- **Email notifications** require: SMTP configured + failure handling
- **Data encryption** require: key management + env/secret manager
- **Dashboard & Growth features** require: mood check-in system + localStorage (frontend-first), API persistence in Phase 3+
- **Friends & Leaderboard** require: user auth + friend data model (mock data for frontend-first build)

**Non-Goals for MVP**: No multi-language, no payments, no OAuth (email/password only), no real-time chat, no Spotify OAuth, no complex user profiles, no multi-admin, no human-narrated audio (TTS only), no prayer groups, no church portal, no Apple Health/Google Fit, no standalone Listen page.

**Future Platform Goals** (post-MVP):

- **Native iOS & Android apps** — on the roadmap. Web app is the primary platform; native apps will add phone contacts friend discovery, push notifications, and native audio background playback. Architecture decisions should be made with native apps in mind (API-first data layer, platform-agnostic friend system).

**Key Decisions:**

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si). "Follow our playlist on Spotify" CTA links to this URL.
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Framing is encouragement and growth, not competition or guilt. Mood data is always private; only engagement data (streaks, points, level) is visible to friends.

### Foundation

1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, Journey to Healing timeline, starting point quiz, values section, impact counter, CTA, footer)
4. **Dashboard** - Logged-in user home at `/` (replaces landing page when authenticated). Dark theme with frosted glass cards and vibrant accent colors for charts/data.
5. **PostgreSQL + Docker** - Database setup with Docker Compose
6. **Design System** - Colors, typography, responsive components

### Core Features

7. **Daily Mood Check-In** - Full-screen takeover on first daily visit. "How are you feeling today, [Name]?" with 5 mood buttons using soft labels: Struggling, Heavy, Okay, Good, Thriving. Optional text input ("Want to share what's on your heart?"). Skippable via "Not right now" link. Once per day (resets at midnight). Transitions to dashboard with brief scripture encouragement matching selected mood. Dark background, warm typography, gentle animations.
8. **Scripture Display** - AI-matched scripture with fade-in animation
9. **AI Scripture Reflection** - AI-generated reflection notes below each verse
10. **Scripture Database** - PostgreSQL with 100 seeded scriptures (20 per mood; WEB translation — public domain)
11. **AI Pre-Tagging** - OpenAI API to tag scriptures with mood/theme mappings
12. **Mood Tracking** - Save mood selections with timestamp, selected mood level, optional text, and scripture shown. localStorage for frontend-first build, API persistence in Phase 3+.

### Journaling & Music

13. **Journal Page** - Text editor with save functionality
14. **AI Journaling Prompts** - Auto-generated prompts based on mood
15. **Saved Journal Entries** - View past entries at `/journal/my-entries`
16. **Spotify Integration** - Embed player + "Open in Spotify" deep link. Uses Worship Room playlist. No Spotify API required.
17. **Music Page** - Dedicated `/music` page with 3 tabs: Worship Playlists (default), Ambient Sounds, Sleep & Rest.

### AI-Powered Features

18. **AI-Generated Prayers** - Available on `/daily?tab=pray` and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs
21. **AI Scripture Follow-Up Chat** - Conversational follow-up after scripture display ("Dig Deeper")

### Audio Features — Music Page (`/music`) ✅ COMPLETE

Fully built 3-tab experience. See `09-design-system.md` for Music architecture details.

22. **Audio Infrastructure** — Global `AudioProvider`, Web Audio API, `AudioPill`, `AudioDrawer`.
23. **Ambient Sound Mixer** — 24 sounds, 4 categories, crossfade looping, 6-sound limit.
24. **Ambient Scene Presets** — 8 scenes with CSS background patterns, crossfade transitions.
25. **Sleep & Rest Content** — 24 scripture readings (WEB), 12 bedtime stories, foreground audio. Placeholder MP3s.
26. **Sleep Timer** — Smart fade, self-correcting wall-clock, SVG progress ring.
27. **Worship Playlists** — 7 Spotify iframe embeds, hero + grid layout.
28. **User Features (localStorage)** — Favorites, saved mixes, shareable URLs, session persistence. `StorageService` abstraction.
29. **Bedtime Routines** — `/music/routines` page, 3 templates, `useRoutinePlayer`.
30. **Accessibility Audit** — `useAnnounce`, full ARIA, 44px touch targets, `prefers-reduced-motion`.
31. **Read Aloud Button** — TTS for all text content.

### Dashboard & Growth Features — Personal Dashboard (`/`)

The Dashboard is the logged-in user's home page (replaces the landing page at `/` when authenticated). All-dark theme with frosted glass cards and vibrant accent colors. Fixed layout with collapsible/expandable cards. 2-column desktop, single-column mobile.

**Full specifications in `dashboard-growth-spec-plan-v2.md`.** See `10-ux-flows.md` for dashboard UX flow.

32. **Mood Check-In** — Full-screen daily check-in, 5 soft labels, crisis keyword detection, encouragement verse, auto-advance. Once per day, skippable.
33. **Mood Insights Widget** — 7-day mood line chart on dashboard (Recharts), "See More" → `/insights`.
34. **Mood Insights Page (`/insights`)** — Heatmap + line chart + AI insight cards + correlations. Default 30-day.
35. **AI Mood Insights** — Trend summaries, activity correlations, scripture connections, monthly report. Mock data for frontend-first.
36. **Streak System** — 6 trackable activities. No grace period. Gentle reset messaging. Current + longest streak.
37. **Faith Points** — Weighted points (5-25) + daily multiplier tiers (1x/1.25x/1.5x/2x). ~170 pts/day max.
38. **Faith Levels** — 6 levels: Seedling (0) → Sprout (100) → Blooming (500) → Flourishing (1,500) → Oak (4,000) → Lighthouse (10,000+).
39. **Badges** — ~35 badges across 6 categories. Welcome badge on signup. Scaled celebrations.
40. **Friends (`/friends`)** — Mutual friend model, search/invite, two tabs: Friends + Leaderboard.
41. **Leaderboard** — Friends (weekly + all-time) + global (weekly only, resets Monday).
42. **Social Interactions** — Encouragements, milestone feed, nudges, weekly community recap.
43. **Notifications** — In-app bell, toasts, push stubs, email stubs. 7 types. User-controllable.
44. **Profile & Avatars** — `/profile/:userId`. 16 presets + 4 unlockable + photo upload. Initials fallback.
45. **Settings (`/settings`)** — Profile, Notifications, Privacy (6 controls), Account.
46. **Empty States** — Ghosted preview + CTA for every empty widget. Welcome badge on signup.

### Community Features

47. **Prayer Wall** - Community prayer feed, inline composer/comments, public profiles, auth modal gates. Frontend with mock data (274 tests).
48. **AI Auto-Moderation** - Flag inappropriate content
49. **Admin Moderation Interface** - `/admin/prayer-wall`
50. **Email Notifications** - Flagged posts to admin
51. **User Reporting** - Report button on posts
52. **Answered Prayer Tracking** - Mark as answered, testimony sharing

### Locator Features

53. **Church Locator** - `/local-support/churches`, Leaflet + mock data
54. **Christian Counselor Locator** - `/local-support/counselors`
55. **Celebrate Recovery Locator** - `/local-support/celebrate-recovery`

### Content Features

56. **Guided Meditations** - 6 text-based meditations with TTS
57. **Verse of the Day** - Daily scripture on `/daily`, homepage, dashboard
58. **Song of the Day** - Daily worship song with Spotify embed
59. **Guided Reading Plans** - 7-day and 21-day themed plans

### Additional Engagement Features

60. **Shareable Scripture Cards** - Branded images for social sharing
61. **Saved / Favorited Content** - "My Favorites" page
62. **Dark Mode** - System-preference-aware toggle

### Landing Page Sections

63. **Growth Teasers Section** - 3 blurred preview cards, dark purple, CTA to register
64. **Starting Point Quiz** - 5-question points-based quiz
65. **Footer** - Nav columns, crisis resources, Spotify badge, copyright

### Polish & Launch Prep

66. **Personalized Onboarding Flow** — 3-5 questions at signup
67. **Performance Optimization** — Lazy loading, code splitting, caching
68. **Security Audit** — Vulnerability scanning, penetration testing
69. **SEO Optimization** — Meta tags, sitemap, structured data
70. **Production Deployment** — CI/CD
71. **User Testing** — Beta testing

### Post-Launch Growth Features

72. **Community Prayer Groups** — Private small groups
73. **Church Partnership Portal** — Church admin dashboard
74. **Kids / Family Mode** — Age-appropriate content
75. **Apple Health / Google Fit Sync** — Native app only
76. **AI Pastoral Companion** — Persistent conversational AI
77. **Native iOS & Android Apps** — Phone contacts, push notifications, App Store/Play Store
78. **Social Platform OAuth** — Facebook/Google friend import

---

## Routes

### Public Routes (No Authentication Required)

| Route | Component | Status | Description |
|-------|-----------|--------|-------------|
| `/` | `Home` / `Dashboard` | Built / Planned | Landing (logged-out) / Dashboard (logged-in) |
| `/daily` | `DailyHub` | Built | Tabbed: Pray \| Journal \| Meditate |
| `/pray` | Redirect → `/daily?tab=pray` | Built | Legacy redirect |
| `/journal` | Redirect → `/daily?tab=journal` | Built | Legacy redirect |
| `/meditate` | Redirect → `/daily?tab=meditate` | Built | Legacy redirect |
| `/scripture` | Redirect → `/daily?tab=pray` | Built | Legacy redirect |
| `/meditate/breathing` | `BreathingExercise` | Built | 4-7-8 breathing |
| `/meditate/soaking` | `ScriptureSoaking` | Built | Verse contemplation |
| `/meditate/gratitude` | `GratitudeReflection` | Built | Gratitude journaling |
| `/meditate/acts` | `ActsPrayerWalk` | Built | ACTS framework |
| `/meditate/psalms` | `PsalmReading` | Built | Psalm reading |
| `/meditate/examen` | `ExamenReflection` | Built | Ignatian Examen |
| `/verse/:id` | `SharedVerse` | Built | Shareable verse card |
| `/prayer/:id` | `SharedPrayer` | Built | Shareable prayer card |
| `/prayer-wall` | `PrayerWall` | Built | Community prayer feed |
| `/prayer-wall/:id` | `PrayerDetail` | Built | Prayer detail page |
| `/prayer-wall/user/:id` | `PrayerWallProfile` | Built | Public prayer profile |
| `/prayer-wall/dashboard` | `PrayerWallDashboard` | Built | Private prayer dashboard |
| `/local-support/churches` | `Churches` | Built | Church locator |
| `/local-support/counselors` | `Counselors` | Built | Counselor locator |
| `/local-support/celebrate-recovery` | `CelebrateRecovery` | Built | CR locator |
| `/music` | `MusicPage` | Built | 3-tab music hub |
| `/music/playlists` | Redirect → `/music?tab=playlists` | Built | Legacy redirect |
| `/music/ambient` | Redirect → `/music?tab=ambient` | Built | Legacy redirect |
| `/music/sleep` | Redirect → `/music?tab=sleep` | Built | Legacy redirect |
| `/music/routines` | `RoutinesPage` | Built | Bedtime routines |
| `/login` | `ComingSoon` | Stub | Login placeholder |
| `/register` | `ComingSoon` | Stub | Register placeholder |
| `/health` | `Health` | Built | Backend health check |
| `*` | `NotFound` | Built | 404 page |

### Protected Routes (Requires Authentication)

| Route | Component | Status | Description |
|-------|-----------|--------|-------------|
| `/insights` | `MoodInsights` | Planned | Full mood analytics |
| `/insights/monthly` | `MonthlyReport` | Planned | Monthly mood report |
| `/friends` | `Friends` | Planned | Friends + Leaderboard tabs |
| `/profile/:userId` | `GrowthProfile` | Planned | Public growth profile |
| `/settings` | `Settings` | Planned | User settings (4 sections) |
| `/journal/my-entries` | `SavedJournalEntries` | Planned | Saved journal entries |
| `/favorites` | `Favorites` | Planned | Bookmarked content |

### Admin Routes (Phase 3+)

- `/admin/prayer-wall` - Moderation interface

---

## Build Approach

### Spec-Driven Workflow

Use this workflow for all new features:

1. **`/spec <feature description>`** — Generates a spec file in `_specs/`, switches to a new feature branch
2. **`/plan _specs/<feature>.md`** — Reads spec, explores codebase, generates implementation plan in `_plans/YYYY-MM-DD-<feature>.md`
3. **Review** — User reviews and approves the plan before implementation begins
4. **`/execute-plan _plans/<plan>.md`** — Implements the feature step-by-step following the approved plan
5. **`/code-review`** — Runs accessibility + code quality review on uncommitted changes. Pass plan path for plan-aware review.
6. **`/verify-with-playwright`** — Visual verification of frontend changes using Playwright browser automation (rendering, interactions, responsive breakpoints, console errors)

### Development Strategy

1. **Build logged-out experience first** — All features work in "demo mode" without login. Prompt to create account when trying to save data. Implement AI safety from day one.
2. **Then add authentication and personalization** — Spring Security + JWT, data saving, protected routes, mood tracking.
3. **Dashboard & Growth features built frontend-first** — localStorage with mock data, same pattern as Music and Prayer Wall. Backend wiring in Phase 3+.

### Implementation Phases

**Phase 1 — Landing Page & Navigation** ✅ COMPLETE

- Navbar, JourneySection, Hero, GrowthTeasers, StartingPointQuiz, SiteFooter, HeadingDivider

**Phase 2 — Daily Experience (Pray, Journal, Meditate)** ✅ COMPLETE

- Daily Hub tabbed layout, 3 tabs with full content, 6 meditation sub-pages, Prayer Wall (274 tests), Local Support (3 locators), 424+ tests

**Phase 2.5 — Music Feature** ✅ COMPLETE

- 10 specs: Audio infrastructure, ambient mixer, scenes, sleep content, sleep timer, music page shell, user features, bedtime routines, accessibility, visual polish. 960+ tests across 100+ test files.

**Phase 2.75 — Dashboard & Growth Feature** (NEXT — 16 specs, frontend-first with localStorage/mock data)

**Full spec details in `dashboard-growth-spec-plan-v2.md`.** Summary:

- Specs 1-2: Mood check-in, dashboard shell + auth provider + navbar logged-in state
- Specs 3-4: Mood insights widget + `/insights` full page
- Specs 5-6: Streak/points engine + dashboard widgets + activity integration
- Specs 7-8: Badge definitions + celebrations/badge UI
- Specs 9-10: Friends system + leaderboard
- Specs 11-12: Social interactions + notifications
- Specs 13-14: Settings/privacy + profile/avatars
- Specs 15-16: AI insights/monthly report + empty states/polish

**Phase 3 — Auth & Backend Wiring**

- Spring Security + JWT, OpenAI API, backend crisis detection, Prayer Wall + Local Support API wiring, journal encryption, mood tracking to DB, dashboard data persistence (localStorage → API), friends backend, leaderboard backend, notifications backend, photo moderation, rate limiting

**Phase 4 — Polish & Native Prep**

- Dark mode, real TTS audio, re-enable personalization/recommendations, real AI insights, performance/SEO, native app planning

---

## Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help (see `01-ai-safety.md`)
- **Ask before coding** if requirements are unclear; **ask before commits** unless obvious completion point
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — test mobile/tablet/desktop; semantic HTML, ARIA labels, keyboard nav
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — this app touches emotional/spiritual topics; approach with care and respect
- **Gentle gamification** — celebrate presence, never punish absence; frame everything as encouragement, not competition
- **Privacy by default** — mood data is always private; users control visibility of engagement data; provide full privacy controls
