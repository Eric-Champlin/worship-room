# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, and worship music.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, and community support.

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
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - All detailed user experience flows (Daily Hub, Prayer, Journal, Meditate, Prayer Wall, etc.)

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Complete Feature List

Full launch targets a complete feature set; features may ship incrementally (alpha/beta) for early feedback.

**Prerequisites Cheatsheet** (build features in any order, just satisfy dependencies first):

- **AI features** require: safety checks + rate limiting + logging + backend crisis detection
- **Community features** (prayer wall) require: auth + moderation + admin audit log + email notifications
- **Analytics** require: mood tracking persisted to database
- **Audio features** require: TTS API integration (OpenAI TTS or browser Speech Synthesis for MVP)
- **Email notifications** require: SMTP configured + failure handling
- **Data encryption** require: key management + env/secret manager

**Non-Goals for MVP**: No multi-language, no payments, no OAuth (email/password only), no real-time chat, no Spotify OAuth, no mobile apps (web-responsive only), no complex user profiles, no multi-admin, no human-narrated audio (TTS only), no prayer groups, no church portal, no Apple Health/Google Fit, no standalone Listen page, no points/leaderboard.

**Key Decisions:**

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si). "Follow our playlist on Spotify" CTA links to this URL.

### Foundation

1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, Journey to Healing timeline, starting point quiz, values section, impact counter, CTA, footer)
4. **Dashboard Skeleton** - Logged-in user view with widgets
5. **PostgreSQL + Docker** - Database setup with Docker Compose
6. **Design System** - Colors, typography, responsive components

### Core Features

7. **Mood Selector** - 5 buttons (Terrible, Bad, Neutral, Good, Excellent) + text input for custom descriptions
8. **Scripture Display** - AI-matched scripture with fade-in animation
9. **AI Scripture Reflection** - AI-generated reflection notes below each verse
10. **Scripture Database** - PostgreSQL with 100 seeded scriptures (20 per mood; WEB translation — public domain)
11. **AI Pre-Tagging** - OpenAI API to tag scriptures with mood/theme mappings
12. **Mood Tracking** - Save mood selections with timestamp and scripture shown

### Journaling & Music

13. **Journal Page** - Text editor with save functionality
14. **AI Journaling Prompts** - Auto-generated prompts based on mood
15. **Saved Journal Entries** - View past entries at `/journal/my-entries`
16. **Spotify Integration** - Embed player + "Open in Spotify" deep link. Uses Worship Room playlist: https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si. No Spotify API required — iframe embeds with hardcoded track IDs.
17. **Music Page** - Dedicated `/music` page with playlist

### AI-Powered Features

18. **AI-Generated Prayers** - Available on `/daily?tab=pray` and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs
21. **AI Scripture Follow-Up Chat** - Conversational follow-up after scripture display ("Dig Deeper" — context-aware cross-references, historical context, practical applications)

### Audio Features (Distributed — No Standalone Page)

Audio is a feature layer that enhances existing pages, not a standalone destination.

22. **Audio Scripture Playback** - "Read Aloud" TTS on Daily Hub Pray tab (browser Speech Synthesis API for MVP, upgrade to OpenAI TTS or ElevenLabs later)
23. **Audio Prayer Playback** - "Read Aloud" TTS on AI-generated prayers and reflections
24. **Ambient Background Sounds** - Dedicated page under Music section (`/music/ambient`). Nature sounds, gentle piano, rain, ocean, forest soundscapes.
25. **Sleep & Bedtime Content** - Dedicated page under Music section (`/music/sleep`). Calming narrated scripture with ambient sounds, sleep timer with audio fade-out, "Wind Down" dimmed UI mode.
26. **Read Aloud Button** - Available on all text content (scriptures, prayers, reflections, meditations) for accessibility

### Community Features

27. **Prayer Wall** - Community prayer feed with inline composer, inline comments, share functionality, public user profiles (`/prayer-wall/user/:id`), private dashboard (`/prayer-wall/dashboard`), auth modal for login/register gates, report dialog, answered prayer tracking with testimony sharing, and standalone detail page (`/prayer-wall/:id`) for shared links. Frontend implemented with mock data (no backend wiring yet). No candle/light-a-candle feature.
28. **AI Auto-Moderation** - Flag inappropriate content (profanity, abuse, spam)
29. **Admin Moderation Interface** - Simple CRUD at `/admin/prayer-wall` for reviewing, editing, deleting posts
30. **Email Notifications** - Send flagged posts to admin email from `ADMIN_EMAIL` env var
31. **User Reporting** - Report button on each prayer post
32. **Answered Prayer Tracking** - "Mark as Answered" button, answered prayers log / gratitude journal, optional testimony sharing to prayer wall

### Locator Features

33. **Church Locator** - Google Maps Places API real-time search at `/local-support/churches`. Search UI is auth-gated; logged-out users see hero with "Sign In to Search" CTA. Frontend implemented with mock data and Leaflet map; Google Places API wiring is Phase 3+.
34. **Christian Counselor Locator** - Google Maps Places API real-time search at `/local-support/counselors`. Same auth-gated pattern. Includes disclaimer banner.
35. **Celebrate Recovery Locator** - Google Maps Places API real-time search at `/local-support/celebrate-recovery`. Same auth-gated pattern. Includes CR explainer section in hero.

### Content Features

36. **Guided Meditations** - 6 text-based meditations (Breathing, Scripture Soaking, Gratitude, ACTS, Psalm Reading, Examen) with audio playback via TTS
37. **Verse of the Day** - Daily scripture on `/daily` page, homepage, and dashboard
38. **Song of the Day** - Daily worship song recommendation on `/daily` page with Spotify embed
39. **Guided Reading Plans** - 7-day and 21-day themed plans ("Overcoming Anxiety," "Healing from Grief," etc.) with daily scripture + reflection + journal prompt + prayer

### Analytics & Personalization

40. **Mood History Dashboard** - 7-day snapshot on `/dashboard`
41. **Mood Insights Page** - Full history with calendar heatmap and line charts at `/insights` (accessible from dashboard, not top-level nav)
42. **Trend Analysis** - AI-generated insights ("Your mood is improving this week!")
43. **Mood Correlations** - "You tend to feel better on days you journal"
44. **Personalized Recommendations** - Scripture/music suggestions based on mood history
45. **Monthly Mood Report** - Email or in-app summary of mood patterns

### Engagement & Retention

46. **Daily Streak Tracking** - Consecutive days using any feature (prayer, journal, meditation, etc.) with visual streak display
47. **Streak Recovery Grace Period** - Miss one day without losing streak
48. **Weekly Summary** - "You prayed 5 times this week and journaled 3 times"
49. **Shareable Scripture Cards** - Auto-generated branded images with verse text, share to social/messaging
50. **Saved / Favorited Content** - Bookmark button on scriptures, prayers, reflections; "My Favorites" page
51. **Dark Mode** - System-preference-aware toggle, auto-switch at bedtime

### Landing Page Sections

52. **Growth Teasers Section** - "See How You're Growing" — 3 blurred preview cards (Mood Insights, Streaks & Faith Points, Friends & Leaderboard) showing logged-out visitors what they unlock with an account. Dark purple gradient background with frosted glass card previews. CTA to register.
53. **Starting Point Quiz** - 5-question points-based quiz ("Not Sure Where to Start?") that recommends a personalized entry point. Client-side only, no data persistence for logged-out users.
54. **Footer** - Nav columns (Daily, Music, Support), crisis resources, app download badges (Coming Soon), "Listen on Spotify" badge, copyright.

### Polish & Launch Prep

57. **Personalized Onboarding Flow** - 3-5 question onboarding at signup to curate starting experience
58. **Performance Optimization** - Lazy loading, code splitting, caching
59. **Security Audit** - Vulnerability scanning, penetration testing
60. **SEO Optimization** - Meta tags, sitemap, structured data
61. **Production Deployment** - Production setup with CI/CD
62. **User Testing** - Beta testing with real users

### Post-Launch Growth Features

63. **Community Prayer Groups** — Private small groups with group prayer requests
64. **Church Partnership Portal** — Church admin dashboard, congregation-wide prayer wall
65. **Kids / Family Mode** — Age-appropriate scripture, bedtime Bible stories
66. **Apple Health / Google Fit Sync** — Sync meditation minutes (app only)
67. **AI Pastoral Companion** — Persistent conversational AI with session memory
68. **Faith Points & Leaderboard** — Gamification with encouraging tone, friends-only leaderboard

---

## Navigation Structure

### Desktop Navbar

```
[Worship Room logo]   Daily Hub   Prayer Wall   [Music ▾]   [Local Support ▾]   [Log In]  [Get Started]
```

**Top-level links (2):** Daily Hub (single link to `/daily`) and Prayer Wall — both always visible, no dropdowns.

**"Music" dropdown** (clickable label goes to `/music`; dropdown expands on hover/click):
```
├── Worship Playlists
├── Ambient Sounds
├── Sleep & Rest
```

**"Local Support" dropdown** (clickable label goes to `/local-support/churches`; dropdown expands on hover/click):
```
├── Churches
├── Counselors
├── Celebrate Recovery
```

### Mobile Drawer

```
Daily Hub
──────────────
Prayer Wall
──────────────
MUSIC
  Worship Playlists
  Ambient Sounds
  Sleep & Rest
──────────────
LOCAL SUPPORT
  Churches
  Counselors
  Celebrate Recovery
──────────────
[Log In]
[Get Started]
```

### Post-Login Navbar

Replace "Log In / Get Started" with user avatar dropdown:
```
├── Dashboard
├── My Journal Entries
├── My Prayer Requests
├── My Favorites
├── Mood Insights
├── Settings
├── ─────────────────
└── Log Out
```

---

## Routes

### Public Routes (No Authentication Required)

| Route | Component | Status | Description |
|-------|-----------|--------|-------------|
| `/` | `Home` | Built | Landing page (hero, journey timeline, growth teasers, quiz, footer) |
| `/daily` | `DailyHub` | Built | Tabbed daily experience: Pray \| Journal \| Meditate (default: `?tab=pray`) |
| `/pray` | Redirect → `/daily?tab=pray` | Built | Legacy route redirect |
| `/journal` | Redirect → `/daily?tab=journal` | Built | Legacy route redirect |
| `/meditate` | Redirect → `/daily?tab=meditate` | Built | Legacy route redirect |
| `/scripture` | Redirect → `/daily?tab=pray` | Built | Legacy route redirect |
| `/meditate/breathing` | `BreathingExercise` | Built | 4-7-8 breathing with scripture phases |
| `/meditate/soaking` | `ScriptureSoaking` | Built | Single verse contemplation timer |
| `/meditate/gratitude` | `GratitudeReflection` | Built | Gratitude journaling with affirmations |
| `/meditate/acts` | `ActsPrayerWalk` | Built | ACTS prayer framework walkthrough |
| `/meditate/psalms` | `PsalmReading` | Built | Psalm reading with historical context |
| `/meditate/examen` | `ExamenReflection` | Built | Ignatian Examen daily reflection |
| `/verse/:id` | `SharedVerse` | Built | Shareable verse card (social sharing) |
| `/prayer/:id` | `SharedPrayer` | Built | Shareable prayer card (social sharing) |
| `/prayer-wall` | `PrayerWall` | Built | Community prayer feed (mock data, 274 tests) |
| `/prayer-wall/:id` | `PrayerDetail` | Built | Standalone prayer detail page |
| `/prayer-wall/user/:id` | `PrayerWallProfile` | Built | Public user profile |
| `/prayer-wall/dashboard` | `PrayerWallDashboard` | Built | Private prayer wall dashboard |
| `/local-support/churches` | `Churches` | Built | Church locator (Leaflet map, mock data) |
| `/local-support/counselors` | `Counselors` | Built | Counselor locator (Leaflet map, mock data) |
| `/local-support/celebrate-recovery` | `CelebrateRecovery` | Built | CR locator (Leaflet map, mock data) |
| `/music` | `ComingSoon` | Stub | Music hub placeholder |
| `/music/playlists` | `ComingSoon` | Stub | Worship playlists placeholder |
| `/music/ambient` | `ComingSoon` | Stub | Ambient sounds placeholder |
| `/music/sleep` | `ComingSoon` | Stub | Sleep & rest placeholder |
| `/login` | `ComingSoon` | Stub | Login page placeholder |
| `/register` | `ComingSoon` | Stub | Registration page placeholder |
| `/health` | `Health` | Built | Backend health check (dev utility) |
| `/insights` | `Insights` | Stub | Mood insights placeholder ("Reflect — Coming Soon") |
| `*` | `NotFound` | Built | 404 page |

### Protected Routes (Phase 3+)

- `/dashboard` - Personalized dashboard with widgets
- `/journal/my-entries` - Saved journal entries
- `/favorites` - Saved/bookmarked scriptures, prayers, and reflections

### Admin Routes (Phase 3+)

- `/admin/prayer-wall` - Moderation interface

---

## Landing Page Structure

```
1. Navbar (transparent glassmorphic pill — Daily Hub link, Prayer Wall link, Music dropdown, Local Support dropdown)
2. Hero Section (dark purple gradient, "How're You Feeling Today?", typewriter input → /daily?tab=pray, quiz teaser link scrolls to #quiz)
3. Journey Section (6-step vertical timeline: Pray → Journal → Meditate → Music → Prayer Wall → Local Support)
4. Growth Teasers Section ("See How You're Growing" — 3 blurred preview cards. Dark purple gradient. CTA: "Create a Free Account")
5. Starting Point Quiz (id="quiz" — 5 questions, points-based scoring, result card routes to recommended feature)
6. Footer (nav columns, crisis resources, app download badges, "Listen on Spotify" badge, copyright)
```

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

### Implementation Phases

**Phase 1 — Landing Page & Navigation** ✅ COMPLETE
- Navbar: glassmorphic pill with Daily Hub link, Prayer Wall link, Music dropdown, Local Support dropdown
- JourneySection: 6-step vertical timeline
- Hero section with typewriter input → `/daily?tab=pray`
- GrowthTeasers, StartingPointQuiz, SiteFooter, HeadingDivider

**Phase 2 — Daily Experience (Pray, Journal, Meditate)** ✅ COMPLETE
- Daily Hub tabbed layout (`/daily` with `?tab=pray|journal|meditate`)
- Pray tab: "What's On Your Heart?", starter chips, crisis banner, mock prayer generation, KaraokeText, action buttons, cross-tab CTA
- Journal tab: "What's On Your Mind?", Guided/Free Write, draft auto-save, saved entries, AI reflection
- Meditate tab: "What's On Your Spirit?", 6 auth-gated meditation cards, completion tracking
- 6 meditation sub-pages, SongPickSection (Spotify embed), shared verse/prayer pages
- Legacy route redirects, completion tracking, auth gating via AuthModal
- Prayer Wall frontend (274 tests), Local Support (3 locators with Leaflet)
- 424+ frontend tests passing

**Phase 3 — Auth & Backend Wiring** (NEXT)
- Spring Security + JWT auth system (login/register pages)
- Real OpenAI API integration (replace mock data)
- Backend crisis detection (classifier + keyword fallback, fail-closed)
- Prayer Wall + Local Support backend API wiring
- Journal entry persistence (encrypted database)
- Mood tracking to database, Dashboard, Rate limiting

**Phase 4 — Music & Polish**
- `/music` hub page with sub-routes (playlists, ambient, sleep)
- Dark mode, streaks, shareable scripture cards, favorites, reading plans, expanded insights

---

## Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help (see `01-ai-safety.md`)
- **Ask before coding** if requirements are unclear; **ask before commits** unless obvious completion point
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — test mobile/tablet/desktop; semantic HTML, ARIA labels, keyboard nav
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — this app touches emotional/spiritual topics; approach with care and respect
