# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, Bible reading, daily devotionals, community challenges, and personal growth tracking.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, community support, and measurable spiritual growth.

### Competitive Positioning

Worship Room is free, ad-free, and privacy-respecting in a market where competitors charge $40–$100/yr and harvest user data. Key differentiators: AI-generated personalized prayers, ambient sound crossfade mixing, grace-based streak system (never punitive), mood-to-content recommendation pipeline, visual growth garden, liturgical calendar with Computus algorithm, crisis resource integration, local support directory, AI-powered scripture explanation and reflection, full-text scripture search, offline-capable PWA, and verse memorization that doesn't quiz or shame.

---

## Implementation Details

**All technical standards, security policies, coding conventions, design system details, UX flows, and component architecture are in `.claude/rules/`. Read the relevant rule file before implementing any feature.**

- 🚨 **[AI Safety & Ethics](.claude/rules/01-ai-safety.md)** - Crisis detection, content boundaries, moderation
- 🔒 **[Security](.claude/rules/02-security.md)** - Auth, rate limiting, encryption, input validation, auth gating strategy, demo mode data policy
- ⚙️ **[Backend Standards](.claude/rules/03-backend-standards.md)** - Spring Boot conventions, API contract
- 🎨 **[Frontend Standards](.claude/rules/04-frontend-standards.md)** - React patterns, accessibility, responsive design
- 🗄️ **[Database](.claude/rules/05-database.md)** - Schema, indexes, data retention
- ✅ **[Testing](.claude/rules/06-testing.md)** - Testing strategy, coverage requirements, definition of done, reactive store consumer patterns
- 📊 **[Logging & Monitoring](.claude/rules/07-logging-monitoring.md)** - Structured logging, PII handling
- 🚀 **[Deployment](.claude/rules/08-deployment.md)** - Environment variables, deployment platforms, dev commands
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities, Music architecture, Round 3 visual patterns, Daily Hub Visual Architecture, BB-33 animation tokens, Bible reader component inventory
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - Navigation structure, all user flows including Bible wave additions
- 💾 **[localStorage Keys](.claude/rules/11-local-storage-keys.md)** - Complete inventory of all storage keys with types, descriptions, and reactive store hook references

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Deep Code Health Reviews

This project uses a multi-protocol deep review system documented in `_protocol/`. The protocols catch issues that per-spec code review cannot — cross-spec contract violations, accumulated drift, dependency rot, visual regressions across the full app, and reactive store consumer anti-patterns. Run them between major feature waves or quarterly at minimum.

The protocol system has seven files:

- `_protocol/00-protocol-overview.md` — execution conventions, severity scale, reporting standards
- `_protocol/01-prompt-build-and-code-health.md` — static analysis, lint, type, dead code, storage keys
- `_protocol/02-prompt-test-suite-audit.md` — failing tests, coverage gaps, BB-45 anti-pattern detection
- `_protocol/03-prompt-dependency-and-supply-chain.md` — vulnerabilities, staleness, bundle size, license
- `_protocol/04-prompt-architecture-and-pattern-consistency.md` — cross-spec contracts, store consumer audit
- `_protocol/05-prompt-visual-verification.md` — full-site Playwright sweep, accessibility, Lighthouse
- `_protocol/99-project-specific-overrides.md` — Worship Room-specific paths, keys, layout exceptions, wave audit artifacts

Protocols run in order on a single deep-review branch and produce a consolidated report at `_reports/deep-review-YYYY-MM-DD.md`. Each protocol appends its section to the same dated report.

---

## Key Decisions

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required. Full 66-book Bible available via lazy-loaded JSON files.
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si).
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Grace-based streak repair (1 free/week, 50 pts for additional). Mood data always private; only engagement data visible to friends.
- **Visual Growth Metaphor**: Animated SVG garden on dashboard that grows through 6 stages matching faith levels.
- **Content Strategy**: All AI content (prayers, devotionals, insights, chat) is mock/hardcoded for frontend-first build. Real AI generation via OpenAI API in Phase 3. **Exception:** BB-30/BB-31 Explain and Reflect features use real Gemini 2.5 Flash Lite calls in production via the BB-32 cache layer.
- **Liturgical Calendar**: Algorithmic Easter calculation (Computus) with automatic season detection. Seasons affect dashboard greeting, devotional priority, Verse of the Day, landing page banner, QOTD, and navbar icon.
- **Dark Theme**: App uses dark theme throughout. Light mode deferred to Phase 4. Bible reader supports three reader-only themes (midnight default, parchment, sepia) scoped to the BibleReader chrome only.
- **Navigation**: 5 top-level nav items (Daily Hub, Bible, Grow, Prayer Wall, Music) + Local Support dropdown + avatar dropdown for authenticated users. Mobile: grouped section drawer.
- **Sound Design**: Web Audio API synthesized sound effects, on by default, gated behind `wr_sound_effects_enabled` and `prefers-reduced-motion`.
- **Visual Design Authority**: All visual patterns live in `09-design-system.md`. CLAUDE.md does not duplicate them.
- **Reactive Store Pattern**: Bible-wave personal-layer features use reactive stores with custom hooks. Components must consume the hook (`useHighlightStore()`, etc.), never local `useState`. See `11-local-storage-keys.md` § "Reactive Store Consumption" for the BB-45 anti-pattern documentation.
- **Anti-pressure voice**: All AI features and personal data displays use anti-pressure copy. Reading heatmaps, memorization decks, and echo callbacks treat sparse activity as valid. No streaks-as-shame, no "you missed N days" messaging, no gamified verse quizzes.

---

## Feature Summary

For full feature details see the rule files. This section is an at-a-glance index, not a spec.

### Foundation

Authentication (mock/simulated, real JWT in Phase 3), React Router, Landing Page, Dashboard with visual garden, Design System (dark theme, frosted glass cards, HorizonGlow on Daily Hub, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).

### Daily Experience

Mood Check-In (5 moods, crisis detection, mood-to-content recommendations), Prayer (AI generation, KaraokeText reveal, draft auto-save with auth-wall persistence), Journal (Guided/Free Write, voice input, draft auto-save), Meditation (6 types, verse-aware navigation from devotional via Spec Z), Audio-Guided Prayer (8 sessions, TTS narration), Persistent Ambient Pill (Wave 7 sticky FAB).

### Bible & Scripture (post-wave)

- **Bible Reader** — 66-book WEB Bible. Reader chrome with three theme variants, four type sizes, three line heights, serif/sans choice, focus mode with configurable idle delay
- **Personal layer (BB-7, BB-8, BB-11b)** — 4-color highlights, range-based notes (10K char limit), bookmarks, verse-linked and freeform journal entries. All backed by reactive stores; surfaced in unified My Bible feed
- **AI Explain (BB-30) and Reflect (BB-31)** — Real Gemini 2.5 Flash Lite calls with anti-pressure voice
- **AI Cache (BB-32)** — Self-managed `bb32-v1:` namespace with 7-day TTL, 2 MB cap, oldest-first eviction
- **Full-Text Search (BB-42)** — Client-side inverted index, sub-100ms queries, works offline
- **PWA + Offline (BB-39)** — Real PWA with installable manifest, runtime caching, offline indicator
- **Reading Heatmap and Progress Map (BB-43)** — GitHub-style daily activity grid plus 66-book chapter completion map on My Bible
- **Verse Memorization Deck (BB-45)** — Quiet flip-card memorization. No quiz, no scoring, no spaced repetition
- **Verse Echoes (BB-46)** — Contextual callbacks to past engagement, surfaced on home and Daily Hub
- **Web Push Notifications (BB-41)** — Daily verse and gentle streak reminders. iOS Safari 16.4+ via PWA install
- **Bible Audio (BB-26, BB-27, BB-28, BB-29)** — Full audio Bible experience shipped on `audio-wave-bb-26-29-44` branch. BB-26 ships FCBH DBP v4 audio playback via Howler.js with a non-modal bottom-sheet player (expanded + minimized states), lazy-loaded engine, rapid-navigation supersession, Media Session integration, scrubber, 5-speed picker, and FCBH attribution footer. Ships the dramatized WEB (ENGWWH variant, `EN1WEBN2DA`/`EN1WEBO2DA` filesets) with full 66-book coverage. BB-29 adds continuous playback / auto-advance with React Router navigation following the audio. BB-28 adds the sleep timer with 8 presets (15m through 2h plus structural End-of-Chapter and End-of-Book), 20-second exponential fade-out, and pause-cancel. BB-27 coordinates with the BB-20 ambient subsystem so ambient pauses when Bible audio plays and resumes on full stop. **BB-44 (read-along verse highlighting) is the final spec in the wave, completed on the same branch.**
- **Verse of the Day** — 60 verses with daily rotation, shareable Canvas image

### Devotional & Reading

Daily Devotional (50 entries with Tier 1/Tier 2 content tiers), Reading Plans (10 plans, 119 days), Gratitude Journal.

### Community

Prayer Wall (9 categories, QOTD, ceremony animation), Community Challenges (5 seasonal, 110 days total), Question of the Day (72 rotating questions).

### Personal Growth

Streak System (12 activities, grace-based repair), Faith Points (weighted, multiplier tiers), Faith Levels (6 tiers Seedling → Lighthouse), Badges (~45 across 6 categories), Visual Garden (6 growth stages), Insights (mood heatmap, trends, correlations).

### Social

Friends (mutual model, encouragements 3/day, nudges 1/week), Leaderboard (friends + global), Notifications (in-app bell + BB-41 push for daily verse and streak reminders).

### AI Features

AI Bible Chat (`/ask` with follow-ups), AI Prayer Generation (devotional-context aware), AI Plan Generation, BB-30 Explain Passage (real Gemini), BB-31 Reflect on Passage (real Gemini).

### Music & Audio

Ambient Mixer (24 sounds, 11 scenes, crossfade looping), Sleep & Rest (24 scripture readings, 12 stories, smart sleep timer), Worship Playlists (8 Spotify embeds), AudioDrawer Unified Entry (Wave 7).

### Other

Local Support (Church/Counselor/CR locators), My Prayers (`/my-prayers`), Onboarding (Welcome Wizard, BB-34 first-run, tooltips, getting started checklist), Evening Reflection (after 6 PM, keeps streak alive).

### Accessibility (BB-35)

Public `/accessibility` page with WCAG 2.2 AA target, accessibility statement, feedback mechanism, last audit date. Skip-to-main-content links on every page (BibleReader has its own root-level skip link). `useFocusTrap()` in 37 modal/dialog components. Global reduced-motion safety net at `frontend/src/styles/animations.css`.

### Infrastructure

PWA (BB-39), SEO (BB-40 — every route has `<SEO>`, JSON-LD on 7+ pages), Deep Linking (BB-38 — verse-level URLs), Animation Tokens (BB-33 — canonical durations and easings at `frontend/src/constants/animation.ts`), Reduced-Motion Safety Net (BB-33), Seasonal Calendar, Sound Effects, Skeleton Loading (13 page-level skeletons), Route Code Splitting (34+ lazy routes), Verse Sharing (Canvas-generated images).

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

| Route                                                         | Component                  | Description                                                                                                                       |
| ------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                           | `Home` / `Dashboard`       | Landing (logged-out) / Dashboard (logged-in)                                                                                      |
| `/daily`                                                      | `DailyHub`                 | Tabbed: Devotional \| Pray \| Journal \| Meditate                                                                                 |
| `/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional` | Redirects → `/daily?tab=*` | Legacy redirects                                                                                                                  |
| `/meditate/breathing`                                         | `BreathingExercise`        | 4-7-8 breathing (consumes verse params from Spec Z)                                                                               |
| `/meditate/soaking`                                           | `ScriptureSoaking`         | Verse contemplation (consumes verse params from Spec Z)                                                                           |
| `/meditate/gratitude`                                         | `GratitudeReflection`      | Gratitude journaling                                                                                                              |
| `/meditate/acts`                                              | `ActsPrayerWalk`           | ACTS framework                                                                                                                    |
| `/meditate/psalms`                                            | `PsalmReading`             | Psalm reading                                                                                                                     |
| `/meditate/examen`                                            | `ExamenReflection`         | Ignatian Examen                                                                                                                   |
| `/verse/:id`                                                  | `SharedVerse`              | Shareable verse card                                                                                                              |
| `/prayer/:id`                                                 | `SharedPrayer`             | Shareable prayer card                                                                                                             |
| `/prayer-wall`                                                | `PrayerWall`               | Community prayer feed with QOTD                                                                                                   |
| `/prayer-wall/:id`                                            | `PrayerDetail`             | Prayer detail page                                                                                                                |
| `/prayer-wall/user/:id`                                       | `PrayerWallProfile`        | Public prayer profile                                                                                                             |
| `/prayer-wall/dashboard`                                      | `PrayerWallDashboard`      | Private prayer dashboard                                                                                                          |
| `/local-support/churches`                                     | `Churches`                 | Church locator (no auth for search)                                                                                               |
| `/local-support/counselors`                                   | `Counselors`               | Counselor locator                                                                                                                 |
| `/local-support/celebrate-recovery`                           | `CelebrateRecovery`        | CR locator                                                                                                                        |
| `/music`                                                      | `MusicPage`                | 3-tab music hub                                                                                                                   |
| `/music/routines`                                             | `RoutinesPage`             | Bedtime routines (4 templates)                                                                                                    |
| `/bible`                                                      | `BibleBrowser`             | 66-book Bible browser with BB-42 full-text search                                                                                 |
| `/bible/:book/:chapter`                                       | `BibleReader`              | Chapter reading with audio, highlights, notes, AI Explain/Reflect, focus mode, theme switching                                    |
| `/bible/my`                                                   | `MyBible`                  | Personal layer feed: BB-43 heatmap and progress map, BB-45 memorization deck, highlights/notes/bookmarks/journal entries activity |
| `/ask`                                                        | `AskPage`                  | AI Bible chat with follow-ups                                                                                                     |
| `/grow`                                                       | `GrowPage`                 | Tabbed: Reading Plans \| Challenges                                                                                               |
| `/reading-plans`, `/challenges`                               | Redirects → `/grow?tab=*`  | Legacy redirects                                                                                                                  |
| `/reading-plans/:planId`                                      | `ReadingPlanDetail`        | Plan detail with daily progress                                                                                                   |
| `/challenges/:challengeId`                                    | `ChallengeDetail`          | Challenge daily content + progress                                                                                                |
| `/accessibility`                                              | `AccessibilityPage`        | BB-35 accessibility statement                                                                                                     |
| `/login`                                                      | `ComingSoon`               | Login placeholder (stub)                                                                                                          |
| `/register`                                                   | `RegisterPage`             | Registration page (UI shell, backend in Phase 3)                                                                                  |
| `/health`                                                     | `Health`                   | Backend health check                                                                                                              |
| `/dev/mood-checkin`                                           | `MoodCheckInPreview`       | Dev-only mood check-in preview                                                                                                    |
| `*`                                                           | `NotFound`                 | 404 page                                                                                                                          |

### Protected Routes (Requires Authentication)

| Route               | Component       | Description                                                          |
| ------------------- | --------------- | -------------------------------------------------------------------- |
| `/`                 | `Dashboard`     | Dashboard with garden, widgets, onboarding                           |
| `/insights`         | `Insights`      | Mood analytics + meditation history + correlations                   |
| `/insights/monthly` | `MonthlyReport` | Monthly mood report                                                  |
| `/friends`          | `Friends`       | Friends + Leaderboard tabs                                           |
| `/profile/:userId`  | `GrowthProfile` | Growth profile with garden                                           |
| `/settings`         | `Settings`      | User settings (4 sections, including BB-41 notification preferences) |
| `/my-prayers`       | `MyPrayers`     | Personal prayer list                                                 |

---

## Implementation Phases

**Phases 1 through 2.95** ✅ COMPLETE — Pre-wave foundation across multiple phases delivered: landing page, Daily Experience (Pray/Journal/Meditate, 6 meditation sub-pages), Music feature (24 sounds, 11 scenes, sleep content), Dashboard & Growth (mood check-in, streaks, badges, friends, leaderboard, notifications, insights), UX polish (streak repair, onboarding, mood recommendations, KaraokeText, journal voice input, prayer enhancement), Content & Feature Expansion (Verse of the Day, daily devotional, personal prayer list, reading plans, Bible reader v1 with highlights/notes/audio, audio-guided prayer, gratitude journal, QOTD, evening reflection, liturgical calendar, PWA v1), and Vision Expansion (community challenges, AI Bible chat, visual garden, local support, Bible audio integration, SEO). Total ~4,862 tests at the Round 2 wrap-up baseline.

**Bible Content Migration** ✅ COMPLETE — Full 66-book WEB Bible via lazy-loaded JSON (scrollmapper/bible_databases).

**Round 2 — Full-Site Polish** ✅ COMPLETE — 23 specs covering dark theme foundation, navigation consolidation, inner page hero redesigns, cross-feature integration, sound effects, page transitions, warm empty states, breadcrumbs, dashboard widget prioritization, badge definitions, form accessibility, verse image sharing, route code splitting, large component splitting, skeleton loading.

**Round 3 — Enhancement & Engagement** ✅ COMPLETE — Homepage redesign (HP-1 through HP-15) and Daily Hub Round 3 (Specs 1-Z + Waves 1-7). Established site-wide visual patterns: dark cinematic theme, visible glow orbs, 2-line section headings, FrostedCard component, locked preview cards, white-default text, HorizonGlow on Daily Hub, FrostedCard tier system, embedded journal CTA, authentic Pray flow, DevotionalPreviewPanel, verse-aware meditation, draft persistence, unified AudioDrawer entry. See `09-design-system.md` § "Round 3 Visual Patterns".

**Bible Redesign + Polish Wave (BB-0 through BB-46)** ✅ COMPLETE

The largest single wave in the project's history. Rebuilt the Bible reader, added AI features, formalized the personal layer, and shipped a full polish cluster. Merged to main 2026-04-13. Final certification at `_plans/recon/bb37b-final-audit.md`.

- **Foundation (BB-0 through BB-21)** — Bible browser, BibleReader chrome (theme/typography/focus mode/drawer stack), reactive store pattern (`useHighlightStore`, `useBookmarkStore`, `useNoteStore`, `useJournalStore`, `useChapterVisitStore`), reading plans store, reading streak system, audio integration, deep link contract.
- **AI features (BB-30, BB-31, BB-32)** — Explain This Passage, Reflect On This Passage, the AI cache layer with the `bb32-v1:` namespace.
- **Infrastructure (BB-33 through BB-37b)** — Animation tokens and reduced-motion safety net (BB-33), empty states and FirstRunWelcome (BB-34), accessibility audit and `/accessibility` page (BB-35), performance baselines and Lighthouse 90+/95+ targets (BB-36), code health audit and full Playwright sweep (BB-37), Bible wave integrity audit and final certification (BB-37b).
- **Distribution layer (BB-38, BB-39, BB-40, BB-41)** — Deep linking architecture (BB-38), PWA + offline reading (BB-39), SEO + Open Graph (BB-40), web push notifications (BB-41).
- **Search and personal layer (BB-42, BB-43, BB-45, BB-46)** — Full-text scripture search (BB-42), reading heatmap and Bible progress map (BB-43), verse memorization deck (BB-45), verse echoes (BB-46).
- **The wave introduced the BB-45 store mirror anti-pattern as a documented hazard.** Components consuming reactive stores must use the store's hook, not local `useState`. See `11-local-storage-keys.md` § "Reactive Store Consumption" and `_protocol/04-prompt-architecture-and-pattern-consistency.md` Phase 1E.

**Phase 3 — Auth & Backend Wiring** (NEXT)

Spring Security + JWT, OpenAI API, backend crisis detection, API wiring for all features, journal encryption, data persistence (localStorage → API), real AI generation for prayers/chat/devotionals/insights/plan generation, photo moderation, rate limiting. BB-41's push notifications get a real push server in Phase 3.

**Phase 4 — Light Mode & Native Prep**

Light mode toggle, real TTS audio files, performance optimization, native app planning.

---

## Build Health

Run `pnpm test`, `pnpm lint`, and `pnpm build` to get current build health for any specific commit. The historical snapshot below is from the most recent recon and may be outdated — always verify before relying on these numbers.

**Note: the BB-30 through BB-46 Bible redesign + polish wave shipped after the test count below was last measured.** The wave added approximately 600+ new tests across the AI features, personal layer stores, accessibility audit, performance baselines, BB-37 cleanup, and BB-37b audit. The current passing count is meaningfully higher than the table shows. Re-verify with `pnpm test` before relying on any specific number.

| Metric                   | Status                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| Build                    | PASSES (verify with `pnpm build`)                                           |
| Tests                    | 4,862+ pass / 0 fail (Round 2 wrap-up baseline; BB-30-46 wave added more)   |
| Lint                     | Verify with `pnpm lint` before relying on a count                           |
| TypeScript strict        | Enforced                                                                    |
| PWA                      | Healthy (BB-39 formalized: manifest, SW, runtime caching, install prompt)   |
| Content sets             | All meet spec targets                                                       |
| Translation consistency  | Clean (zero non-WEB references)                                             |
| Security                 | Clean (no secrets in source)                                                |
| SEO                      | Comprehensive (BB-40: every route has `<SEO>`, JSON-LD on 7+ pages)         |
| Main bundle              | Verify with `frontend/scripts/measure-bundle.mjs` (BB-36 added measurement) |
| Largest chunk            | Recharts isolated via manualChunks                                          |
| Lighthouse Performance   | Target 90+ on every major page (BB-36 baseline)                             |
| Lighthouse Accessibility | Target 95+ on every major page (BB-35 audit)                                |

---

## Build Approach

### Spec-Driven Workflow

1. **`/spec <feature description>`** — Generates spec file + feature branch
2. **`/plan _specs/<feature>.md`** — Generates implementation plan
3. **Review** — User approves plan
4. **`/execute-plan _plans/<plan>.md`** — Implements step-by-step
5. **`/code-review`** — Pre-commit quality check
6. **`/verify-with-playwright`** — Visual verification

### Deep Review Workflow

Between major waves or quarterly, run the deep review protocols in `_protocol/`:

1. Create a new branch off main (`deep-review-YYYY-MM-DD`)
2. Run protocols 01-05 in order, each as a separate Claude Code session
3. Each protocol appends to `_reports/deep-review-YYYY-MM-DD.md`
4. Review the consolidated report and create follow-up specs for findings
5. Merge the deep review branch to main when complete

The protocols catch issues that the per-spec workflow can't: cross-spec contract drift, accumulated dependency rot, BB-45 store consumer anti-patterns, visual regressions across the full app, and accessibility/performance regressions against prior baselines.

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
- **Dark theme** — all pages use dark theme; maintain sanctuary immersion across navigation. Bible reader theme variants are scoped to the reader chrome only.
- **Sound as atmosphere** — sound effects enhance emotional moments; gated behind user preference and prefers-reduced-motion
- **Warm copy** — every user-facing message should feel like a caring friend, not a system notification
- **Anti-pressure voice** — personal data displays (heatmaps, memorization decks, echoes, AI explanations, AI reflections) treat sparse activity as valid and avoid quiz-or-shame tone
- **Shareable moments** — features that produce emotional peaks should have share affordances with beautiful visual output
- **Reactive store discipline** — components consuming reactive stores must use the store's hook, never local `useState`. The BB-45 anti-pattern is a real correctness bug that ships silently. See `11-local-storage-keys.md` and `_protocol/99-project-specific-overrides.md`.
- **Animation token discipline** — all animation durations and easings come from `frontend/src/constants/animation.ts`. Don't hardcode `200ms` or `cubic-bezier(...)` strings in new components. See `09-design-system.md` § "Animation Tokens".
- **Visual patterns live in `09-design-system.md`** — glow opacities, text color defaults, heading treatments, FrostedCard tier system, white pill CTAs, textarea glow, sticky FAB pattern, drawer-aware visibility, Daily Hub HorizonGlow architecture, animation tokens, deprecated patterns. Always read it before working on UI.
- **BibleReader is a documented layout exception** — uses `ReaderChrome` instead of `Navbar`/`SiteFooter`, has its own root-level skip link, no SiteFooter (intentional immersive design). When auditing pages, treat BibleReader's structure as documented intentional drift, not a violation.
