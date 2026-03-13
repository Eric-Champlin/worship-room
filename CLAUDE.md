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
17. **Music Page** - Dedicated `/music` page with 3 tabs: Worship Playlists, Ambient Sounds (default), Sleep & Rest

### AI-Powered Features

18. **AI-Generated Prayers** - Available on `/daily?tab=pray` and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs
21. **AI Scripture Follow-Up Chat** - Conversational follow-up after scripture display ("Dig Deeper" — context-aware cross-references, historical context, practical applications)

### Audio Features — Music Page (`/music`)

The Music page is a fully built 3-tab experience with global audio infrastructure:

22. **Audio Infrastructure** — Global `AudioProvider` wrapping the app with split contexts (`AudioStateContext`, `AudioDispatchContext`, `AudioEngineContext`, `SleepTimerControlsContext`). `AudioEngineService` using Web Audio API with `<audio>` elements for foreground content and `AudioBufferSourceNode` for ambient mixing with crossfade looping. Floating `AudioPill` with waveform bars and progress arc. Slide-up `AudioDrawer` (bottom sheet mobile, side panel desktop) with `DrawerNowPlaying` and `DrawerTabs` (Mixer, Timer, Saved).
23. **Ambient Sound Mixer** — 24 sounds across 4 categories (Nature, Environments, Spiritual, Instruments). Icon grid (3-col mobile, 4-col tablet, 6-col desktop). Tap-to-toggle with 60% default volume, crossfade looping, 6-sound hard limit with toast. `SoundGrid` with roving tabindex arrow key navigation.
24. **Ambient Scene Presets** — 8 curated scene presets (Garden of Gethsemane, Still Waters, Midnight Rain, Ember & Stone, Morning Mist, The Upper Room, Starfield, Mountain Refuge). Featured scene carousel, scene grid, search bar, tag filtering (mood/activity/intensity/scriptureTheme — OR within dimension, AND across). Scene crossfade transitions with 5-second undo toast. Scene artwork in drawer with CSS animations (drift/pulse/glow) respecting `prefers-reduced-motion`.
25. **Sleep & Rest Content** — 24 scripture readings (WEB translation) across 4 collections (Psalms of Peace, Comfort & Rest, Trust in God, God's Promises) with male/female voice alternation. 12 bedtime stories (4 short, 5 medium, 3 long). "Tonight's Scripture" daily rotation. Foreground audio via `<audio>` element with progress bar, scrub, and scripture text toggle with verse-level highlighting. Content switching confirmation dialog. Currently using placeholder MP3s — real TTS audio sourced via Spec 10 content guide.
26. **Sleep Timer** — Preset durations (15/30/45/60/90 min) + custom (5-480 min). Configurable fade (5/10/15/30 min, default 10). Smart fade: foreground fades over first 60% of fade period, ambient starts at 40%. Self-correcting wall-clock timer using `Date.now()`. SVG progress ring. Pause/resume during fade with gain freeze/restore. Timer tab with notification dot. `SleepTimerControlsContext` running in AudioProvider for persistence across drawer close.
27. **Worship Playlists** — 8 Spotify playlist embeds (4 Worship & Praise + 4 Explore) via `<iframe>` with lazy loading and error fallback. Hero playlist at 500px height with follower count. Spotify auto-pause detection with manual fallback toggle. Lofi cross-reference card on Ambient tab linking to Playlists tab.
28. **User Features (localStorage)** — `StorageService` abstraction with `LocalStorageService` implementation (keys prefixed `wr_`). Favorites (heart icon on scene/sleep cards, optimistic UI with revert on error). Saved mixes (inline drawer input, 50-char max, edit/delete/duplicate/share via three-dot menu). Shareable mix URLs (Base64url-encoded sound IDs + volumes in query params, "Play This Mix" hero). Session persistence (60s auto-save + `beforeunload`, resume prompt within 24h). Listening analytics (capped 100 entries). Time-of-day recommendations (4 brackets: morning/afternoon/evening/night). Personalization section (Continue Listening, Favorites, Saved Mixes).
29. **Bedtime Routines** — `/music/routines` dedicated page (NOT in nav dropdown). 3 pre-built templates (Evening Peace, Scripture & Sleep, Deep Rest). Visual step builder with up/down reorder buttons, content picker modal, transition gap inputs, sleep timer config. `useRoutinePlayer` hook orchestrating sequential step execution with scene loading, foreground playback, transition gaps with ambient breathe-up, error retry (3x with backoff then skip), and sleep timer start at routine end. Enhanced `RoutineStepper` in drawer with content type icons and ARIA progressbar. Pill routine shortcut mode. Routine interrupt dialog when manually loading content during active routine.
30. **Accessibility Audit** — `useAnnounce` hook with dual live regions (polite 300ms debounce, assertive immediate). Full ARIA coverage: `aria-valuetext` on sliders, `role="list"`/`role="listitem"` on mixer, Arrow key menu navigation, SoundGrid roving tabindex grid navigation, AudioPill keyboard activation. 44px minimum touch targets on all interactive elements. Color contrast fixes (`text-white/40` → `text-white/60` minimum on dark backgrounds). Reduced motion: all music animations in `@media (prefers-reduced-motion: reduce)` CSS block + `motion-safe:` Tailwind prefix. Focus management: drawer returns focus to pill, dialogs return focus to trigger.
31. **Read Aloud Button** - Available on all text content (scriptures, prayers, reflections, meditations) for accessibility

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
[Worship Room logo]   Daily Hub   Prayer Wall   Music   [Local Support ▾]   [Log In]  [Get Started]
```

**Top-level links (3):** Daily Hub, Prayer Wall, and Music — all always visible, no dropdowns. Music links directly to `/music`.

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
Music
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

| Route                               | Component                         | Status | Description                                                                                                                                                              |
| ----------------------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                 | `Home`                            | Built  | Landing page (hero, journey timeline, growth teasers, quiz, footer)                                                                                                      |
| `/daily`                            | `DailyHub`                        | Built  | Tabbed daily experience: Pray \| Journal \| Meditate (default: `?tab=pray`)                                                                                              |
| `/pray`                             | Redirect → `/daily?tab=pray`      | Built  | Legacy route redirect                                                                                                                                                    |
| `/journal`                          | Redirect → `/daily?tab=journal`   | Built  | Legacy route redirect                                                                                                                                                    |
| `/meditate`                         | Redirect → `/daily?tab=meditate`  | Built  | Legacy route redirect                                                                                                                                                    |
| `/scripture`                        | Redirect → `/daily?tab=pray`      | Built  | Legacy route redirect                                                                                                                                                    |
| `/meditate/breathing`               | `BreathingExercise`               | Built  | 4-7-8 breathing with scripture phases                                                                                                                                    |
| `/meditate/soaking`                 | `ScriptureSoaking`                | Built  | Single verse contemplation timer                                                                                                                                         |
| `/meditate/gratitude`               | `GratitudeReflection`             | Built  | Gratitude journaling with affirmations                                                                                                                                   |
| `/meditate/acts`                    | `ActsPrayerWalk`                  | Built  | ACTS prayer framework walkthrough                                                                                                                                        |
| `/meditate/psalms`                  | `PsalmReading`                    | Built  | Psalm reading with historical context                                                                                                                                    |
| `/meditate/examen`                  | `ExamenReflection`                | Built  | Ignatian Examen daily reflection                                                                                                                                         |
| `/verse/:id`                        | `SharedVerse`                     | Built  | Shareable verse card (social sharing)                                                                                                                                    |
| `/prayer/:id`                       | `SharedPrayer`                    | Built  | Shareable prayer card (social sharing)                                                                                                                                   |
| `/prayer-wall`                      | `PrayerWall`                      | Built  | Community prayer feed (mock data, 274 tests)                                                                                                                             |
| `/prayer-wall/:id`                  | `PrayerDetail`                    | Built  | Standalone prayer detail page                                                                                                                                            |
| `/prayer-wall/user/:id`             | `PrayerWallProfile`               | Built  | Public user profile                                                                                                                                                      |
| `/prayer-wall/dashboard`            | `PrayerWallDashboard`             | Built  | Private prayer wall dashboard                                                                                                                                            |
| `/local-support/churches`           | `Churches`                        | Built  | Church locator (Leaflet map, mock data)                                                                                                                                  |
| `/local-support/counselors`         | `Counselors`                      | Built  | Counselor locator (Leaflet map, mock data)                                                                                                                               |
| `/local-support/celebrate-recovery` | `CelebrateRecovery`               | Built  | CR locator (Leaflet map, mock data)                                                                                                                                      |
| `/music`                            | `MusicPage`                       | Built  | 3-tab music hub: Worship Playlists, Ambient Sounds (default), Sleep & Rest. Tab state via `?tab=playlists\|ambient\|sleep`. Night mode (10pm-6am) defaults to sleep tab. |
| `/music/playlists`                  | Redirect → `/music?tab=playlists` | Built  | Legacy route redirect                                                                                                                                                    |
| `/music/ambient`                    | Redirect → `/music?tab=ambient`   | Built  | Legacy route redirect                                                                                                                                                    |
| `/music/sleep`                      | Redirect → `/music?tab=sleep`     | Built  | Legacy route redirect                                                                                                                                                    |
| `/music/routines`                   | `RoutinesPage`                    | Built  | Bedtime routine builder and templates (NOT in nav dropdown, accessed via direct links)                                                                                   |
| `/login`                            | `ComingSoon`                      | Stub   | Login page placeholder                                                                                                                                                   |
| `/register`                         | `ComingSoon`                      | Stub   | Registration page placeholder                                                                                                                                            |
| `/health`                           | `Health`                          | Built  | Backend health check (dev utility)                                                                                                                                       |
| `/insights`                         | `Insights`                        | Stub   | Mood insights placeholder ("Reflect — Coming Soon")                                                                                                                      |
| `*`                                 | `NotFound`                        | Built  | 404 page                                                                                                                                                                 |

### Protected Routes (Phase 3+)

- `/dashboard` - Personalized dashboard with widgets
- `/journal/my-entries` - Saved journal entries
- `/favorites` - Saved/bookmarked scriptures, prayers, and reflections

### Admin Routes (Phase 3+)

- `/admin/prayer-wall` - Moderation interface

---

## Landing Page Structure

```
1. Navbar (transparent glassmorphic pill — Daily Hub link, Prayer Wall link, Music link, Local Support dropdown)
2. Hero Section (dark purple gradient, "How're You Feeling Today?", typewriter input → /daily?tab=pray, quiz teaser link scrolls to #quiz)
3. Journey Section (6-step vertical timeline: Pray → Journal → Meditate → Music → Prayer Wall → Local Support)
4. Growth Teasers Section ("See How You're Growing" — 3 blurred preview cards. Dark purple gradient. CTA: "Create a Free Account")
5. Starting Point Quiz (id="quiz" — 5 questions, points-based scoring, result card routes to recommended feature)
6. Footer (nav columns, crisis resources, app download badges, "Listen on Spotify" badge, copyright)
```

---

## Music Feature — Technical Architecture

### Audio Provider & Context System

The global `AudioProvider` wraps the entire app (between `AuthModalProvider` and `Routes` in `App.tsx`). It exposes 4 React contexts:

- `AudioStateContext` — read-only state via `useAudioState()`
- `AudioDispatchContext` — actions via `useAudioDispatch()` (wraps reducer with engine side effects)
- `AudioEngineContext` — Web Audio API service via `useAudioEngine()`
- `SleepTimerControlsContext` — timer controls via `useSleepTimerControls()`

**AudioState** includes: `activeSounds`, `masterVolume`, `isPlaying`, `pillVisible`, `drawerOpen`, `currentSceneName`, `foregroundContent`, `sleepTimer`, `activeRoutine`.

**AudioEngineService** manages a single `AudioContext` (suspend/resume, never destroy/recreate). Ambient sounds use `AudioBufferSourceNode` with crossfade looping (double-buffer, 1.5s overlap). Foreground content uses `<audio>` elements via `MediaElementAudioSourceNode` for mobile background survival. Smart fade uses `linearRampToValueAtTime` on the Web Audio API timeline.

### Key Audio Components

| Component          | Location            | Description                                                                                                               |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `AudioPill`        | `components/audio/` | Floating pill (z-9999). 3 states: hidden, routine shortcut, now-playing. Keyboard-accessible with `role="button"`.        |
| `AudioDrawer`      | `components/audio/` | Bottom sheet (70vh mobile) / side panel (400px desktop). Focus-trapped. Contains DrawerNowPlaying + DrawerTabs.           |
| `DrawerNowPlaying` | `components/audio/` | Scene artwork with animations, play/pause, master volume, foreground progress bar, scripture text toggle, balance slider. |
| `DrawerTabs`       | `components/audio/` | Mixer \| Timer \| Saved. ARIA tablist with roving tabindex. Timer tab shows notification dot when active.                 |
| `AmbientBrowser`   | `components/audio/` | Search bar, filter chips, featured scenes, scene grid, sound grid, lofi cross-reference.                                  |
| `SleepBrowse`      | `components/audio/` | Tonight's Scripture, 4 scripture collection rows, bedtime stories grid, routine CTA.                                      |
| `RoutineStepper`   | `components/audio/` | Horizontal step progress with content type icons, ARIA progressbar.                                                       |

### Key Audio Hooks

| Hook                  | Location | Description                                                                                                            |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `useSoundToggle`      | `hooks/` | Auth-gated sound play/toggle with loading/retry/6-sound limit.                                                         |
| `useScenePlayer`      | `hooks/` | Scene loading with crossfade, undo, routine interrupt check.                                                           |
| `useForegroundPlayer` | `hooks/` | Foreground playback with content-switch dialog, routine interrupt check. Dispatches `FOREGROUND_ENDED` on natural end. |
| `useSleepTimer`       | `hooks/` | Wall-clock timer, phase tracking, smart fade scheduling via Web Audio API timeline. Runs in AudioProvider.             |
| `useRoutinePlayer`    | `hooks/` | Routine step sequencing, transition gaps, error retry, sleep timer start.                                              |
| `useAmbientSearch`    | `hooks/` | Client-side search + tag filtering (OR within dimension, AND across).                                                  |
| `useAnnounce`         | `hooks/` | Dual aria-live regions (polite debounced, assertive immediate) for screen reader announcements.                        |

### Data Files

| File                    | Location      | Contents                                                          |
| ----------------------- | ------------- | ----------------------------------------------------------------- |
| `sound-catalog.ts`      | `data/`       | 24 sounds, `SOUND_BY_ID` Map, `SOUND_CATEGORIES` grouped array    |
| `scenes.ts`             | `data/`       | 8 scene presets, `SCENE_BY_ID` Map, `FEATURED_SCENE_IDS`          |
| `scripture-readings.ts` | `data/music/` | 24 WEB scripture readings across 4 collections                    |
| `bedtime-stories.ts`    | `data/music/` | 12 bedtime stories (4 short, 5 medium, 3 long)                    |
| `playlists.ts`          | `data/music/` | 8 Spotify playlists (4 Worship & Praise, 4 Explore)               |
| `routines.ts`           | `data/music/` | 3 template routines (Evening Peace, Scripture & Sleep, Deep Rest) |

### Storage Service

`StorageService` interface with `LocalStorageService` implementation in `services/storage-service.ts`. All keys prefixed `wr_`:

- `wr_favorites` — favorited scenes, sleep sessions, custom mixes
- `wr_saved_mixes` — user-created ambient sound mixes
- `wr_listening_history` — listening sessions (capped 100)
- `wr_session_state` — auto-saved session for resume (24h expiry)
- `wr_routines` — user-created/cloned routine definitions

All writes are auth-gated. Abstraction designed to swap to API calls in Phase 3+ without changing consumers.

### Audio Constants (`constants/audio.ts`)

`MAX_SIMULTANEOUS_SOUNDS: 6`, `DEFAULT_SOUND_VOLUME: 0.6`, `MASTER_VOLUME: 0.8`, `SCENE_CROSSFADE_MS: 3000`, `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`, `LOAD_RETRY_MAX: 3`, `LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000]`, `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]`.

### Audio Files

Placeholder silent MP3s in `public/audio/` (gitignored). Subdirectories: `ambient/` (24 sounds), `scripture/` (24 readings), `stories/` (12 stories), `artwork/` (8 scene SVG placeholders). Real TTS audio to be generated via Spec 10 content guide using Google Cloud TTS WaveNet (Male: en-US-Wavenet-D, Female: en-US-Wavenet-F). CDN target: Cloudflare R2 (zero egress fees), base URL in `VITE_AUDIO_BASE_URL` env var.

### Known Issues

- **1024x768 horizontal overflow**: `FeaturedSceneCard` `sm:min-w-[340px]` causes 1px overflow at exactly 1024px viewport. Fix: remove `sm:min-w-[340px]` or change `lg:grid-cols-3` to `xl:grid-cols-3`.
- **Footer touch targets**: Crisis resource links (988, SAMHSA) are undersized on mobile. Pre-existing, not Music-specific.

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

- Navbar: glassmorphic pill with Daily Hub link, Prayer Wall link, Music link, Local Support dropdown
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

**Phase 2.5 — Music Feature** ✅ COMPLETE

- Audio infrastructure: AudioProvider, AudioEngineService, AudioPill, AudioDrawer (Spec 1)
- Ambient sound mixer: 24 sounds, icon grid, crossfade looping, 6-sound limit (Spec 2)
- Scene presets: 8 scenes, crossfade transitions, search, tag filtering (Spec 3)
- Sleep & rest: 24 scripture readings, 12 bedtime stories, foreground audio, content switching (Spec 4)
- Sleep timer: smart fade, self-correcting wall-clock timer, pause/resume during fade (Spec 5)
- Music page shell: 3-tab page, Spotify playlists, nav update, time-of-day recommendations (Spec 6)
- User features: favorites, saved mixes, sharing, analytics, session persistence (Spec 7)
- Bedtime routines: builder, playback engine, 3 templates, routine interrupt (Spec 8)
- Accessibility audit: ARIA, focus management, reduced motion, touch targets, contrast, announcements (Spec 9)
- Content guide: TTS generation, Cloudflare R2 setup, sound sourcing reference (Spec 10 — manual reference)
- 959+ frontend tests passing across 100+ test files

**Phase 3 — Auth & Backend Wiring** (NEXT)

- Spring Security + JWT auth system (login/register pages)
- Real OpenAI API integration (replace mock data)
- Backend crisis detection (classifier + keyword fallback, fail-closed)
- Prayer Wall + Local Support backend API wiring
- Journal entry persistence (encrypted database)
- Mood tracking to database, Dashboard, Rate limiting
- Swap StorageService from localStorage to API calls

**Phase 4 — Polish**

- Dark mode, streaks, shareable scripture cards, expanded insights
- Real TTS audio (replace placeholder MP3s using Spec 10 guide)
- Performance optimization, SEO, production deployment

---

## Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help (see `01-ai-safety.md`)
- **Ask before coding** if requirements are unclear; **ask before commits** unless obvious completion point
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — test mobile/tablet/desktop; semantic HTML, ARIA labels, keyboard nav
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — this app touches emotional/spiritual topics; approach with care and respect
