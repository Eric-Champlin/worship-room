# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application (with native mobile apps on the roadmap) that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, Bible reading, daily devotionals, community challenges, and personal growth tracking.

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
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - Navigation structure, all user flows
- 💾 **[localStorage Keys](.claude/rules/11-localstorage-keys.md)** - Complete inventory of all `wr_*` storage keys with types and descriptions

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Key Decisions

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required. Full 66-book Bible available via lazy-loaded JSON files.
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si).
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Grace-based streak repair (1 free/week, 50 pts for additional). Mood data always private; only engagement data visible to friends.
- **Visual Growth Metaphor**: Animated SVG garden on dashboard that grows through 6 stages matching faith levels.
- **Content Strategy**: All AI content (prayers, devotionals, insights, chat) is mock/hardcoded for frontend-first build. Real AI generation via OpenAI API in Phase 3.
- **Liturgical Calendar**: Algorithmic Easter calculation (Computus) with automatic season detection. Seasons affect dashboard greeting, devotional priority, Verse of the Day, landing page banner, QOTD, and navbar icon.

---

## Feature Summary

### Foundation

- Authentication (mock/simulated, real JWT in Phase 3), React Router, Landing Page (hero with AI TypewriterInput, journey timeline, Verse of the Day section, quiz, growth teasers, seasonal banner), Dashboard (visual garden, frosted glass widgets), Design System

### Daily Experience

- **Mood Check-In** — 5 moods, crisis detection, KaraokeText verse reveal, mood-to-content recommendations
- **Prayer** — AI generation with ambient auto-play, KaraokeText reveal, post-prayer reflection, save to prayer list
- **Journal** — Guided/Free Write modes, voice input (Web Speech API), search/filter, milestones, draft auto-save
- **Meditation** — 6 types (breathing, soaking, gratitude, ACTS, psalms, examen), minutes tracking, completion history
- **Audio-Guided Prayer** — 8 sessions (5/10/15 min), TTS narration, silence intervals, ambient pairing

### Bible & Scripture

- **Bible Reader** — 66-book WEB Bible, book/chapter/verse browser with search, lazy-loaded JSON
- **Highlighting & Notes** — 4-color verse highlighting, personal notes, "My Highlights & Notes" feed
- **Bible Audio** — TTS chapter playback with verse tracking, speed control, ambient ducking, sleep timer integration
- **Verse of the Day** — 60 verses, daily rotation, dashboard widget, Daily Hub banner, landing page section, shareable Canvas image

### Devotional & Reading

- **Daily Devotional** — `/devotional` with quote, passage, reflection, prayer, question. 50 devotionals (30 general + 20 seasonal). Dashboard widget, mood personalization, weekly summary
- **Reading Plans** — 10 multi-day plans (7/14/21 days), progress tracking, AI plan generation, dashboard widget, gamification integration
- **Gratitude Journal** — Dashboard widget with 3 daily inputs, rotating placeholders, insights correlation

### Community

- **Prayer Wall** — 9 categories, QOTD, ceremony animation on "Pray for this", cross-feature CTAs, challenge prayer tagging
- **Community Challenges** — 5 seasonal challenges (Lent/Easter/Pentecost/Advent/New Year), daily content, progress tracking, social sharing, milestone celebrations, mock community activity
- **Question of the Day** — 72 rotating questions (60 general + 12 seasonal), response composer, Discussion category

### Personal Growth

- **Streak System** — 12 trackable activities, grace-based repair, evening reflection keeps streak alive
- **Faith Points** — Weighted points (5-25 per activity), daily multiplier tiers (1x/1.25x/1.5x/2x)
- **Faith Levels** — 6 levels: Seedling → Sprout → Blooming → Flourishing → Oak → Lighthouse
- **Badges** — ~45 badges across streak, level, activity, community, reading plan, and challenge categories
- **Visual Garden** — Animated SVG with 6 growth stages, ambient animations, streak-responsive sun/clouds
- **Insights** — Mood heatmap, trend chart, activity correlations, meditation history, morning/evening comparison

### Social

- **Friends** — Mutual model, search/invite, encouragements (4 presets, 3/day limit), nudges
- **Leaderboard** — Friends (weekly + all-time) + global (weekly, resets Monday)
- **Notifications** — In-app bell, toasts, prayer reminders, challenge nudges

### Personal Prayer

- **My Prayers** — `/my-prayers` with private prayer tracking, 8 categories, answered celebrations, reminders, dashboard widget

### AI Features

- **AI Bible Chat** — `/ask` for life questions with Scripture-grounded answers, verse linking to Bible reader, follow-up question chips, conversation threading
- **AI Prayer Generation** — Enhanced with ambient sound, KaraokeText, reflection prompt
- **AI Plan Generation** — Keyword-matched to preset plans (real AI in Phase 3)

### Music & Audio

- **Ambient Mixer** — 24 sounds + 3 Bible reading scenes, 11 scene presets, crossfade looping
- **Sleep & Rest** — Scripture readings, bedtime stories, "Bible Before Bed" routine, smart sleep timer
- **Worship Playlists** — 7 Spotify embeds
- **Cross-Pollination** — "Enhance with sound" pills on Pray, Journal, Meditate tabs

### Local Support

- **Church/Counselor/CR Locators** — No auth required for search, cross-feature CTAs, "I visited" check-in with notes and faith points

### Onboarding

- **Welcome Wizard** — 4 screens (greeting/name, avatar, quiz, results)
- **Progressive Disclosure Tooltips** — Contextual first-time tips on dashboard, Daily Hub, Prayer Wall, Music
- **Getting Started Checklist** — 6-item dashboard widget with auto-completion, celebration on finish

### Evening Experience

- **End-of-Day Reflection** — After 6 PM, 4-step flow (evening mood, highlights, gratitude, closing prayer), keeps streak alive

### Infrastructure

- **PWA** — Manifest, service worker, offline fallback, content caching (sounds, Bible, devotionals), install prompt
- **SEO** — Per-page titles/descriptions, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt
- **Seasonal Calendar** — Liturgical season detection via Computus algorithm, useLiturgicalSeason hook

---

## Routes

### Public Routes (No Authentication Required)

| Route                               | Component                        | Status | Description                                   |
| ----------------------------------- | -------------------------------- | ------ | --------------------------------------------- |
| `/`                                 | `Home` / `Dashboard`             | Built  | Landing (logged-out) / Dashboard (logged-in)  |
| `/daily`                            | `DailyHub`                       | Built  | Tabbed: Devotional \| Pray \| Journal \| Meditate |
| `/pray`                             | Redirect → `/daily?tab=pray`     | Built  | Legacy redirect                               |
| `/journal`                          | Redirect → `/daily?tab=journal`  | Built  | Legacy redirect                               |
| `/meditate`                         | Redirect → `/daily?tab=meditate` | Built  | Legacy redirect                               |
| `/scripture`                        | Redirect → `/daily?tab=pray`     | Built  | Legacy redirect                               |
| `/meditate/breathing`               | `BreathingExercise`              | Built  | 4-7-8 breathing                               |
| `/meditate/soaking`                 | `ScriptureSoaking`               | Built  | Verse contemplation                           |
| `/meditate/gratitude`               | `GratitudeReflection`            | Built  | Gratitude journaling                          |
| `/meditate/acts`                    | `ActsPrayerWalk`                 | Built  | ACTS framework                                |
| `/meditate/psalms`                  | `PsalmReading`                   | Built  | Psalm reading                                 |
| `/meditate/examen`                  | `ExamenReflection`               | Built  | Ignatian Examen                               |
| `/verse/:id`                        | `SharedVerse`                    | Built  | Shareable verse card                          |
| `/prayer/:id`                       | `SharedPrayer`                   | Built  | Shareable prayer card                         |
| `/prayer-wall`                      | `PrayerWall`                     | Built  | Community prayer feed with QOTD               |
| `/prayer-wall/:id`                  | `PrayerDetail`                   | Built  | Prayer detail page                            |
| `/prayer-wall/user/:id`             | `PrayerWallProfile`              | Built  | Public prayer profile                         |
| `/prayer-wall/dashboard`            | `PrayerWallDashboard`            | Built  | Private prayer dashboard                      |
| `/local-support/churches`           | `Churches`                       | Built  | Church locator (no auth for search)           |
| `/local-support/counselors`         | `Counselors`                     | Built  | Counselor locator                             |
| `/local-support/celebrate-recovery` | `CelebrateRecovery`              | Built  | CR locator                                    |
| `/music`                            | `MusicPage`                      | Built  | 3-tab music hub                               |
| `/music/routines`                   | `RoutinesPage`                   | Built  | Bedtime routines (4 templates)                |
| `/bible`                            | `BibleBrowser`                   | Built  | 66-book Bible browser with search             |
| `/bible/:book/:chapter`             | `BibleChapter`                   | Built  | Chapter reading with audio, highlights, notes |
| `/ask`                              | `AskGodsWord`                    | Built  | AI Bible chat with follow-ups                 |
| `/devotional`                       | Redirect → `/daily?tab=devotional` | Built  | Legacy redirect                             |
| `/grow`                             | `GrowPage`                       | Built  | Tabbed: Reading Plans \| Challenges           |
| `/reading-plans`                    | Redirect → `/grow?tab=plans`     | Built  | Legacy redirect                               |
| `/reading-plans/:planId`            | `ReadingPlanDetail`              | Built  | Plan detail with daily progress               |
| `/challenges`                       | Redirect → `/grow?tab=challenges` | Built | Legacy redirect                               |
| `/challenges/:challengeId`          | `ChallengeDetail`                | Built  | Challenge daily content + progress            |
| `/login`                            | `ComingSoon`                     | Stub   | Login placeholder                             |
| `/register`                         | `ComingSoon`                     | Stub   | Register placeholder                          |
| `/health`                           | `Health`                         | Built  | Backend health check                          |
| `*`                                 | `NotFound`                       | Built  | 404 page                                      |

### Protected Routes (Requires Authentication)

| Route               | Component       | Status | Description                                        |
| ------------------- | --------------- | ------ | -------------------------------------------------- |
| `/`                 | `Dashboard`     | Built  | Dashboard with garden, widgets, onboarding         |
| `/insights`         | `MoodInsights`  | Built  | Mood analytics + meditation history + correlations |
| `/insights/monthly` | `MonthlyReport` | Built  | Monthly mood report                                |
| `/friends`          | `Friends`       | Built  | Friends + Leaderboard tabs                         |
| `/profile/:userId`  | `GrowthProfile` | Built  | Growth profile with garden                         |
| `/settings`         | `Settings`      | Built  | User settings (4 sections)                         |
| `/my-prayers`       | `MyPrayers`     | Built  | Personal prayer list                               |

---

## Implementation Phases

**Phase 1 — Landing Page & Navigation** ✅ COMPLETE

**Phase 2 — Daily Experience (Pray, Journal, Meditate)** ✅ COMPLETE

- Daily Hub, 3 tabs, 6 meditation sub-pages, Prayer Wall, Local Support. 424+ tests.

**Phase 2.5 — Music Feature** ✅ COMPLETE

- 10 specs: audio infrastructure, ambient mixer, scenes, sleep content, sleep timer, playlists, user features, routines, accessibility, polish. 960+ tests.

**Phase 2.75 — Dashboard & Growth** ✅ COMPLETE

- 16 specs: mood check-in, dashboard shell, insights, streaks/points, badges, celebrations, friends, leaderboard, social, notifications, settings, profiles, AI insights, monthly report, empty states. 2000+ tests.

**Phase 2.85 — UX Polish & Enhancement** ✅ COMPLETE

- 14 specs: streak repair, onboarding (wizard/tooltips/checklist), mood recommendations, ambient cross-pollination, Prayer Wall filtering, pray ceremony animation, dashboard animations, KaraokeText, journal search/filter/voice, meditation tracking, prayer generation enhancement.

**Phase 2.9 — Content & Feature Expansion** ✅ COMPLETE

- 18 specs: Verse of the Day, daily devotional (page + dashboard), personal prayer list (page + enhancements), reading plans (browser + progress + AI generation), Bible reader (browser + highlights/notes + audio), audio-guided prayer, gratitude journal, QOTD, evening reflection, liturgical calendar, PWA (manifest + caching).

**Phase 2.95 — Vision Expansion** ✅ COMPLETE

- 9 specs: community challenges (browser + progress + social), AI Bible chat (input + follow-ups), visual garden, local support enhancements, Bible audio integration, SEO.

**Bible Content Migration** — Full 66-book WEB Bible via lazy-loaded JSON (scrollmapper/bible_databases).

**Phase 3 — Auth & Backend Wiring** (NEXT)

- Spring Security + JWT, OpenAI API, backend crisis detection, API wiring for all features, journal encryption, data persistence (localStorage → API), real AI generation (prayers, chat, devotionals, insights, plan generation), photo moderation, rate limiting.

**Phase 4 — Polish & Native Prep**

- Dark mode, real TTS audio files, performance optimization, UX/UI cleanup pass, native app planning.

---

## Build Approach

### Spec-Driven Workflow

1. **`/spec <feature description>`** — Generates spec file + feature branch
2. **`/plan _specs/<feature>.md`** — Generates implementation plan
3. **Review** — User approves plan
4. **`/execute-plan _plans/<plan>.md`** — Implements step-by-step
5. **`/code-review`** — Pre-commit quality check
6. **`/verify-with-playwright`** — Visual verification

### Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — mobile-first, semantic HTML, ARIA, keyboard nav, 44px touch targets
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — emotional/spiritual topics require care and respect
- **Gentle gamification** — celebrate presence, never punish absence
- **Privacy by default** — mood data always private; users control engagement data visibility
- **Bible translation** — all scripture uses WEB (World English Bible)
- **Seasonal awareness** — useLiturgicalSeason hook provides current season; features respect seasonal content priority
