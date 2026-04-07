# Worship Room - Project Guide
 
## Project Overview
 
**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, Bible reading, daily devotionals, community challenges, and personal growth tracking.
 
### Mission
 
Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, community support, and measurable spiritual growth.
 
### Competitive Positioning
 
Worship Room is free, ad-free, and privacy-respecting in a market where competitors charge $40–$100/yr and harvest user data. The target user is someone seeking spiritual and emotional restoration, not just information delivery. Key differentiators: AI-generated personalized prayers (no competitor has this), ambient sound crossfade mixing, grace-based streak system (never punitive), mood-to-content recommendation pipeline, visual growth garden, liturgical calendar with Computus algorithm, crisis resource integration, and local support directory.
 
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
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities, Music architecture, **Round 3 visual patterns + Daily Hub Visual Architecture**
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - Navigation structure, all user flows
- 💾 **[localStorage Keys](.claude/rules/11-local-storage-keys.md)** - Complete inventory of all `wr_*` storage keys with types and descriptions
 
**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.
 
---
 
## Key Decisions
 
- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required. Full 66-book Bible available via lazy-loaded JSON files.
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si).
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Grace-based streak repair (1 free/week, 50 pts for additional). Mood data always private; only engagement data visible to friends.
- **Visual Growth Metaphor**: Animated SVG garden on dashboard that grows through 6 stages matching faith levels.
- **Content Strategy**: All AI content (prayers, devotionals, insights, chat) is mock/hardcoded for frontend-first build. Real AI generation via OpenAI API in Phase 3.
- **Liturgical Calendar**: Algorithmic Easter calculation (Computus) with automatic season detection. Seasons affect dashboard greeting, devotional priority, Verse of the Day, landing page banner, QOTD, and navbar icon.
- **Dark Theme**: App uses dark theme throughout (cinematic dark landing page + dark dashboard + dark inner pages). Light mode deferred to Phase 4.
- **Navigation**: 5 top-level nav items (Daily Hub, Bible, Grow, Prayer Wall, Music) + Local Support dropdown + avatar dropdown for authenticated users. Mobile: grouped section drawer.
- **Sound Design**: Web Audio API synthesized sound effects (chime, ascending, harp, bell, whisper, sparkle) on by default, gated behind `wr_sound_effects_enabled` and `prefers-reduced-motion`.
- **Visual Design Authority**: All visual patterns (glow opacities, text color defaults, heading treatments, section dividers, frosted card tiers, textarea glow, FAB pattern, drawer-aware visibility, inline element layout verification, Daily Hub HorizonGlow architecture, deprecated patterns) live in `09-design-system.md`. CLAUDE.md does not duplicate them.
 
---
 
## Feature Summary
 
### Foundation
 
- Authentication (mock/simulated, real JWT in Phase 3), React Router, Landing Page (hero with AI TypewriterInput, 7-step journey timeline, animated stats bar, locked dashboard preview, differentiator cards, starting point quiz, final CTA, seasonal banner), Dashboard (visual garden, frosted glass widgets), Design System (dark theme, frosted glass cards, glow backgrounds, HorizonGlow on Daily Hub)
 
### Daily Experience
 
- **Mood Check-In** — 5 moods, crisis detection, KaraokeText verse reveal, mood-to-content recommendations
- **Prayer** — AI generation with ambient auto-play, KaraokeText reveal, post-prayer reflection, save to prayer list, draft auto-save with auth-wall persistence
- **Journal** — Guided/Free Write modes, voice input (Web Speech API), search/filter, milestones, draft auto-save with auth-wall persistence
- **Meditation** — 6 types (breathing, soaking, gratitude, ACTS, psalms, examen), minutes tracking, completion history, verse-aware navigation from devotional (Spec Z)
- **Audio-Guided Prayer** — 8 sessions (5/10/15 min), TTS narration, silence intervals, ambient pairing
- **Persistent Ambient Pill** — Sticky bottom-right floating button on Daily Hub root that opens AudioDrawer right-side flyout (Wave 7)
 
### Bible & Scripture
 
- **Bible Reader** — 66-book WEB Bible, book/chapter/verse browser with search, lazy-loaded JSON
- **Highlighting & Notes** — 4-color verse highlighting, personal notes, "My Highlights & Notes" feed
- **Bible Audio** — TTS chapter playback with verse tracking, speed control, ambient ducking, sleep timer integration
- **Verse of the Day** — 60 verses (40 general + 20 seasonal), daily rotation, dashboard widget, Daily Hub banner, landing page section, shareable Canvas image (4 templates × 3 sizes)
 
### Devotional & Reading
 
- **Daily Devotional** — `/daily?tab=devotional` with quote, passage (Tier 2 scripture callout), reflection (Tier 1 FrostedCard), reflection question with embedded Journal CTA, authentic Pray flow CTA, Meditate-on-this-passage CTA. 50 devotionals (30 general + 20 seasonal). Dashboard widget, mood personalization, weekly summary.
- **Reading Plans** — 10 multi-day plans (7/14/21 days, 119 total days), progress tracking, AI plan generation, dashboard widget, gamification integration
- **Gratitude Journal** — Dashboard widget with 3 daily inputs, rotating placeholders, insights correlation
 
### Community
 
- **Prayer Wall** — 9 categories, QOTD (72 questions), ceremony animation on "Pray for this", cross-feature CTAs, challenge prayer tagging
- **Community Challenges** — 5 seasonal challenges (Lent 40d/Easter 7d/Pentecost 21d/Advent 21d/New Year 21d = 110 total days), daily content, progress tracking, social sharing, milestone celebrations, shareable canvas images
- **Question of the Day** — 72 rotating questions (60 general + 12 liturgical), response composer, Discussion category
 
### Personal Growth
 
- **Streak System** — 12 trackable activities, grace-based repair, evening reflection keeps streak alive
- **Faith Points** — Weighted points (5-25 per activity), daily multiplier tiers (1x/1.25x/1.5x/2x)
- **Faith Levels** — 6 levels: Seedling → Sprout → Blooming → Flourishing → Oak → Lighthouse
- **Badges** — ~45 badges across streak, level, activity, community, reading plan, and challenge categories
- **Visual Garden** — Animated SVG (765 lines) with 6 growth stages, ambient animations, streak-responsive sun/clouds
- **Insights** — Mood heatmap, trend chart, activity correlations, meditation history, morning/evening comparison
 
### Social
 
- **Friends** — Mutual model, search/invite, encouragements (4 presets, 3/day limit), nudges (1/week, 3+ day inactive)
- **Leaderboard** — Friends (weekly + all-time) + global (weekly, resets Monday)
- **Notifications** — In-app bell, toasts, prayer reminders, challenge nudges
 
### Personal Prayer
 
- **My Prayers** — `/my-prayers` with private prayer tracking, 8 categories, answered celebrations, reminders, dashboard widget
 
### AI Features
 
- **AI Bible Chat** — `/ask` for life questions with Scripture-grounded answers, verse linking to Bible reader, follow-up question chips, conversation threading, save/share actions
- **AI Prayer Generation** — Enhanced with ambient sound, KaraokeText, reflection prompt, devotional-context awareness (Spec P)
- **AI Plan Generation** — Keyword-matched to preset plans (real AI in Phase 3)
 
### Music & Audio
 
- **Ambient Mixer** — 24 sounds + 3 Bible reading scenes, 11 scene presets, crossfade looping
- **Sleep & Rest** — 24 scripture readings, 12 bedtime stories, "Bible Before Bed" routine, smart sleep timer
- **Worship Playlists** — 8 Spotify embeds (4 worship + 4 explore), 4 bedtime routine templates
- **AudioDrawer Unified Entry** — Right-side flyout (desktop) / bottom sheet (mobile). Single canonical entry point on Daily Hub via the persistent ambient pill FAB (Wave 7). Inline ambient pills removed from tab content.
 
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
- **SEO** — Per-page titles/descriptions, Open Graph, Twitter Cards, JSON-LD on 7+ pages, sitemap, robots.txt
- **Seasonal Calendar** — Liturgical season detection via Computus algorithm, useLiturgicalSeason hook
- **Sound Effects** — 6 Web Audio API sounds (chime, ascending, harp, bell, whisper, sparkle), 12+ triggers
- **Route Background Continuity** — `html`, `body`, and `#root` backgrounds set to `#08051A` in `src/index.css` to prevent white flash on navigation. The earlier `PageTransition` component was removed in Wave 2.
- **Skeleton Loading** — 13 page-level skeleton components built; 11 wired to route-level Suspense in `App.tsx` (Dashboard, DailyHub, PrayerWall, Friends, Settings, Insights, MyPrayers, Music, GrowPage, BibleBrowser, Profile). BibleReaderSkeleton wired inline. MonthlyReport uses `RouteLoadingFallback`.
- **Route Code Splitting** — 34 lazy-loaded route components via React.lazy()
- **Verse Sharing** — Canvas-generated shareable images, 4 templates × 3 sizes (square/story/wide)
 
---
 
## Content Inventory (Verified)
 
All counts programmatically verified via `_recon/agent-6-count-scripts.ts`.
 
| Content Type           | Count                           | Notes                                                             |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Bible Books (JSON)     | 66                              | Full WEB Bible, lazy-loaded per book                              |
| Devotionals            | 50 (30 general + 20 seasonal)   | 5 Advent, 5 Lent, 3 Easter, 3 Christmas, 2 Holy Week, 2 Pentecost |
| Reading Plans          | 10 (119 total days)             | 7/14/21-day plans                                                 |
| Ambient Sounds         | 24                              | Plus 3 Bible reading scenes                                       |
| Scene Presets          | 11                              |                                                                   |
| Scripture Readings     | 24 (4 collections × 6)          |                                                                   |
| Bedtime Stories        | 12                              |                                                                   |
| Verse of the Day       | 60 (40 general + 20 seasonal)   |                                                                   |
| QOTD                   | 72 (60 general + 12 liturgical) |                                                                   |
| Community Challenges   | 5 (110 total days)              | Lent 40d, Easter 7d, Pentecost 21d, Advent 21d, New Year 21d      |
| Guided Prayer Sessions | 8                               | 5/10/15 min options                                               |
| Spotify Playlists      | 8 (4 worship + 4 explore)       |                                                                   |
| Routine Templates      | 4                               |                                                                   |
| Song of the Day        | 30 entries, 14 unique tracks    |                                                                   |
| Badges                 | ~45                             | Across 6 categories                                               |
 
**Translation consistency**: All scripture uses WEB. Zero non-WEB references found.
 
---
 
## Routes
 
### Public Routes (No Authentication Required)
 
| Route                               | Component                          | Status | Description                                       |
| ----------------------------------- | ---------------------------------- | ------ | ------------------------------------------------- |
| `/`                                 | `Home` / `Dashboard`               | Built  | Landing (logged-out) / Dashboard (logged-in)      |
| `/daily`                            | `DailyHub`                         | Built  | Tabbed: Devotional \| Pray \| Journal \| Meditate |
| `/pray`                             | Redirect → `/daily?tab=pray`       | Built  | Legacy redirect                                   |
| `/journal`                          | Redirect → `/daily?tab=journal`    | Built  | Legacy redirect                                   |
| `/meditate`                         | Redirect → `/daily?tab=meditate`   | Built  | Legacy redirect                                   |
| `/scripture`                        | Redirect → `/daily?tab=pray`       | Built  | Legacy redirect                                   |
| `/meditate/breathing`               | `BreathingExercise`                | Built  | 4-7-8 breathing (consumes verse params from Spec Z) |
| `/meditate/soaking`                 | `ScriptureSoaking`                 | Built  | Verse contemplation (consumes verse params from Spec Z) |
| `/meditate/gratitude`               | `GratitudeReflection`              | Built  | Gratitude journaling                              |
| `/meditate/acts`                    | `ActsPrayerWalk`                   | Built  | ACTS framework                                    |
| `/meditate/psalms`                  | `PsalmReading`                     | Built  | Psalm reading                                     |
| `/meditate/examen`                  | `ExamenReflection`                 | Built  | Ignatian Examen                                   |
| `/verse/:id`                        | `SharedVerse`                      | Built  | Shareable verse card                              |
| `/prayer/:id`                       | `SharedPrayer`                     | Built  | Shareable prayer card                             |
| `/prayer-wall`                      | `PrayerWall`                       | Built  | Community prayer feed with QOTD                   |
| `/prayer-wall/:id`                  | `PrayerDetail`                     | Built  | Prayer detail page                                |
| `/prayer-wall/user/:id`             | `PrayerWallProfile`                | Built  | Public prayer profile                             |
| `/prayer-wall/dashboard`            | `PrayerWallDashboard`              | Built  | Private prayer dashboard                          |
| `/local-support/churches`           | `Churches`                         | Built  | Church locator (no auth for search)               |
| `/local-support/counselors`         | `Counselors`                       | Built  | Counselor locator                                 |
| `/local-support/celebrate-recovery` | `CelebrateRecovery`                | Built  | CR locator                                        |
| `/music`                            | `MusicPage`                        | Built  | 3-tab music hub                                   |
| `/music/routines`                   | `RoutinesPage`                     | Built  | Bedtime routines (4 templates)                    |
| `/bible`                            | `BibleBrowser`                     | Built  | 66-book Bible browser with search                 |
| `/bible/:book/:chapter`             | `BibleReader`                      | Built  | Chapter reading with audio, highlights, notes     |
| `/ask`                              | `AskPage`                          | Built  | AI Bible chat with follow-ups                     |
| `/devotional`                       | Redirect → `/daily?tab=devotional` | Built  | Legacy redirect                                   |
| `/grow`                             | `GrowPage`                         | Built  | Tabbed: Reading Plans \| Challenges               |
| `/reading-plans`                    | Redirect → `/grow?tab=plans`       | Built  | Legacy redirect                                   |
| `/reading-plans/:planId`            | `ReadingPlanDetail`                | Built  | Plan detail with daily progress                   |
| `/challenges`                       | Redirect → `/grow?tab=challenges`  | Built  | Legacy redirect                                   |
| `/challenges/:challengeId`          | `ChallengeDetail`                  | Built  | Challenge daily content + progress                |
| `/login`                            | `ComingSoon`                       | Stub   | Login placeholder                                 |
| `/register`                         | `RegisterPage`                     | Built  | Registration page (UI shell, backend in Phase 3)  |
| `/health`                           | `Health`                           | Built  | Backend health check                              |
| `/dev/mood-checkin`                 | `MoodCheckInPreview`               | Built  | Dev-only mood check-in preview                    |
| `*`                                 | `NotFound`                         | Built  | 404 page                                          |
 
### Protected Routes (Requires Authentication)
 
| Route               | Component       | Status | Description                                        |
| ------------------- | --------------- | ------ | -------------------------------------------------- |
| `/`                 | `Dashboard`     | Built  | Dashboard with garden, widgets, onboarding         |
| `/insights`         | `Insights`      | Built  | Mood analytics + meditation history + correlations |
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
 
**Round 2 — Full-Site Polish** ✅ COMPLETE
 
- 23 specs: dark theme foundation (4 specs), navigation consolidation, inner page hero redesigns, cross-feature integration (3 batches), sound effects/feedback, page transitions, warm empty states, breadcrumb navigation, dashboard widget prioritization, badge definitions, form accessibility (FormField component), verse image sharing, route code splitting, large component splitting, skeleton loading system.
 
**Round 3 — Enhancement & Engagement** (CURRENT)
 
- Focus: go beyond fixing what's broken — enhance working features to their full emotional and engagement potential.
- Enhancement lenses: speed-to-peace for hurting users, time-of-day awareness, decision fatigue reduction, ritual building, growth narrative (story not stats), emotional moment capture, surprise/delight, guilt-free re-engagement, shareable cards, beauty as sanctuary, sound as atmosphere, content freshness, community warmth, "tell a friend" moment.
- **Homepage redesign (HP-1 through HP-15)** ✅ COMPLETE — established site-wide visual patterns: dark cinematic theme, visible glow orbs (0.25-0.50 opacity), 2-line section headings, FrostedCard component, locked preview cards, section dividers, white-default text. See `09-design-system.md` § "Round 3 Visual Patterns".
- **Daily Hub Round 3 (Specs 1-Z + Waves 1-7)** ✅ COMPLETE — full Daily Hub overhaul with its own visual architecture distinct from the homepage:
  - **Spec Y:** HorizonGlow atmospheric layer at the Daily Hub root replaces per-section GlowBackground. 5 large soft purple/lavender glow blobs at strategic vertical positions (final tuned opacity 0.32/0.28/0.35/0.30/0.28). Tab content components use plain transparent wrappers — the HorizonGlow shows through. StarField was experimented with and removed.
  - **Specs T + U:** FrostedCard tier system for devotional readability. Tier 1 (primary reading content) and Tier 2 (scripture callout with left border accent). Body text uses `text-white leading-[1.75-1.8] text-[17px] sm:text-lg max-w-2xl`. Italic styling removed for sustained-reading comfort.
  - **Spec O:** "Journal about this question" CTA embedded inside the reflection question card on the devotional, not as a separate section below.
  - **Spec P:** Authentic Pray flow — static "Closing Prayer" section removed; "Pray about today's reading" CTA uses enhanced `getMockPrayer` with devotional context awareness.
  - **Spec X:** `DevotionalPreviewPanel` — sticky collapsible inline preview at the top of Journal/Pray when arriving from devotional context. Includes X close button (Wave 6).
  - **Spec Z:** Verse-aware meditation flow. "Meditate on this passage" link navigates to `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...`. Meditate tab shows verse banner; Scripture Soaking + Breathing Exercise highlighted as "Recommended"; verse params survive auth flow and page refresh; clear on tab switch.
  - **Spec V:** Draft persistence with auth-wall continuity. AuthModal subtitle "Your draft is safe — we'll bring it back after."
  - **Wave 5:** Removed all "What's On Your Heart/Mind/Spirit?" headings, removed BackgroundSquiggle from all Daily Hub tabs, removed devotional theme tag pills, repositioned saint quote below reflection body, switched journal prompt from Lora italic to Inter sans white.
  - **Wave 6:** Removed `animate-glow-pulse` (replaced with static white box-shadow), guided prayer cards now `min-h-[260px]` with no `line-clamp`, removed devotional context banner above textareas (DevotionalPreviewPanel handles dismissal via X button), hidden "Try a different prompt" link in devotional context and Free Write mode.
  - **Wave 7:** Unified AmbientSoundPill behavior — both idle and active states open the AudioDrawer right-side flyout (deleted inline expanding dropdown). New `DailyAmbientPillFAB` sticky bottom-right floating button mounted on DailyHub root only (auto-hides when drawer is open via chat-widget pattern, uses `env(safe-area-inset-*)`). Inline ambient pills removed from PrayerInput, JournalInput, and MeditateTabContent. Stronger white textarea glow.
 
**Phase 3 — Auth & Backend Wiring** (NEXT after Round 3)
 
- Spring Security + JWT, OpenAI API, backend crisis detection, API wiring for all features, journal encryption, data persistence (localStorage → API), real AI generation (prayers, chat, devotionals, insights, plan generation), photo moderation, rate limiting.
 
**Phase 4 — Light Mode & Native Prep**
 
- Light mode toggle (dark is now default), real TTS audio files, performance optimization, native app planning.
 
---
 
## Build Health
 
Run `pnpm test`, `pnpm lint`, and `pnpm build` to get current build health for any specific commit. The historical snapshot below is from the most recent recon and may be outdated — always verify before relying on these numbers.
 
| Metric                  | Status                                                       |
| ----------------------- | ------------------------------------------------------------ |
| Build                   | PASSES (0 errors, 0 warnings)                                |
| Tests                   | 4,862 pass / 0 fail (last verified in Round 2 wrap-up)       |
| Lint                    | Verify with `pnpm lint` before relying on a count            |
| TypeScript strict       | Enforced                                                     |
| PWA                     | Healthy (manifest, SW, offline fallback present)             |
| Content sets            | All meet spec targets                                        |
| Translation consistency | Clean (zero non-WEB references)                              |
| Security                | Clean (no secrets in source)                                 |
| SEO                     | Comprehensive (every route has `<SEO>`, JSON-LD on 7+ pages) |
| Main bundle             | 97 KB gzipped (healthy)                                      |
| Largest chunk           | Recharts 153 KB gzipped (isolated via manualChunks)          |
 
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
- **Dark theme** — all pages use dark theme; maintain sanctuary immersion across navigation
- **Sound as atmosphere** — sound effects enhance emotional moments; gated behind user preference and prefers-reduced-motion
- **Warm copy** — every user-facing message (toasts, empty states, confirmations) should feel like a caring friend, not a system notification
- **Shareable moments** — features that produce emotional peaks should have share affordances with beautiful visual output
- **Visual patterns live in `09-design-system.md`** — glow opacities, text color defaults, heading treatments, FrostedCard tier system, white pill CTAs, textarea glow, sticky FAB pattern, drawer-aware visibility, Daily Hub HorizonGlow architecture, deprecated patterns. Always read it before working on UI.
