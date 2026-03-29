# Round 3 Reconnaissance Synthesis

**Date**: 2026-03-28
**Branch**: `main` (167 uncommitted changes from full-site-audit)
**Build**: PASSES (4,862 tests pass, 0 failures, TypeScript strict mode enforced)
**Lint**: FAILS (6 errors + 32 warnings, `--max-warnings 0` blocks CI)

---

## 1. Executive Summary — Top 10 Most Impactful Issues

Issues ranked by user impact. All `[PLANNED FIX]` items excluded.

| # | Sev | Issue | User Impact | File Citation | One-Line Fix |
|---|-----|-------|-------------|---------------|--------------|
| 1 | **P0** | Hero input auth-gates first interaction — logged-out visitors type a feeling, hit submit, get a login wall. The value proposition is never demonstrated. | First-visit conversion funnel is broken. Every visitor's first action is blocked. | `HeroSection.tsx:91-93` | Allow logged-out users to reach `/ask` with their query; gate saving/follow-ups, not the first response. |
| 2 | **P0** | WCAG AA contrast failures: `text-white/30` and `text-white/40` appear 271 times across 133 files. Body text at these opacities fails 4.5:1 ratio on all dark backgrounds. Placeholder text at `/30` and `/40` also fails. | Unreadable text for low-vision users; placeholder prompts like "What's on your heart?" are invisible at low opacity. | Systemic — 133 files. `tailwind.config.js` palette + per-file classes. | Increase minimum text opacity to `text-white/60` for body text. Reserve `/30` and `/20` for decorative elements only. |
| 3 | **P0** | No "Welcome Back" flow after 3+ days of inactivity. Streak resets silently, no warm re-entry greeting, no proactive streak repair prompt, no "here's what you missed" summary. | Highest churn-risk window. A grieving user who missed days because of the very struggles the app helps with gets zero acknowledgment. | `Dashboard.tsx` — add phase check for days-since-last-activity before mood check-in. | Add a "Welcome Back" screen with streak repair offer, activity summary, and one-tap re-entry. |
| 4 | **P0** | Unbounded localStorage growth: `addNotification()` in `social-storage.ts` bypasses the 50-entry cap in `notifications-storage.ts`. `wr_daily_activities` grows one entry per day forever with no pruning. | After 1+ year of daily use, localStorage approaches 5 MB browser limit. Silent data loss when cap is hit. | `social-storage.ts:106-129` (notification bypass), `services/faith-points-storage.ts` (daily activities no prune) | Cap notifications array in `social-storage.ts`; add 365-day rolling prune to `wr_daily_activities`. |
| 5 | **P1** | Bible reader is a dead end — no cross-feature CTAs after reading a chapter. No "Journal about this passage," "Pray about what you read," or "Ask a question" bridge. | High-traffic page with zero engagement bridge. Users read and leave instead of deepening into prayer, journaling, or AI chat. | `BibleReader.tsx` ~line 320, before `ChapterNav` | Add a CTA strip with links to journal, pray, ask, and meditate with chapter context. |
| 6 | **P1** | 13 skeleton components built but only 1 is wired. All lazy routes show a generic pulsing "Worship Room" logo instead of content-shaped skeletons during code-split loading. | Layout shift and disorientation during navigation. Content-shaped skeletons reduce perceived load time by 40%+. | `App.tsx:149` — single `Suspense` with generic fallback. 13 files in `components/skeletons/`. | Wrap each lazy route in its own `Suspense` with the matching skeleton as fallback. |
| 7 | **P1** | `/ask` (Ask God's Word) page is orphaned from desktop navigation. Not in the navbar, not in the footer. Desktop logged-in users have no discoverable path to it. | One of the app's strongest features is invisible to desktop users who haven't seen the mobile drawer. | `SiteFooter.tsx:4-8` (footer column arrays), `Navbar.tsx:16-21` (nav links) | Add `/ask` link to the SiteFooter "Daily" column or a new "Study" column. |
| 8 | **P1** | Song of the Day has only 14 unique Spotify tracks in a 30-entry pool (songs 15-30 are exact duplicates). Users hear repeats within the first two weeks. | Content staleness signals "this app isn't maintained" to daily users. Song of the Day is a daily touchpoint. | `mocks/daily-experience-mock-data.ts` — `DAILY_SONGS` array | Add 16+ unique Spotify track IDs from the Worship Room playlist. |
| 9 | **P1** | No ritual-building mechanism. Features are individually strong but disconnected. No "My Routine," "Start Next," or suggested daily sequence. Activity Checklist is passive (no "start next" button). | Ritual formation — the #1 daily return driver — is left entirely to the user. Without guided sequences, users default to single-feature visits and churn. | `ActivityChecklist.tsx` — add "Start next" CTA on first uncompleted item. | Evolve Activity Checklist into a sequenced flow with "Start next" prompts. |
| 10 | **P1** | ESLint gate fails (6 errors + `--max-warnings 0` with 32 warnings). CI/CD will reject any PR or deploy. | Nothing can ship until lint passes. | 6 files (see Agent 1 report) | Remove 3 stale eslint-disable directives, 1 unused import, 2 `any` casts. Policy decision on 32 warnings. |

---

## 2. Top 5 Enhancement Opportunities

Features with the highest gap between "functional" and "remarkable." Cross-referenced against Agent 3 (journey gaps), Agent 4 (decision fatigue), and Agent 5 (emotional resonance). These are not bugs — they are the specs that will make users love this app.

### 1. Prayer Answered Celebration → Testimony Share Card

**Current (60%):** Same confetti overlay as badge unlocks. No unique visual treatment. No share action.

**100% Vision:** A prayer answered is potentially the most emotionally charged moment in the app — someone's faith was confirmed. It deserves: a warm golden wash (distinct from purple confetti), a scripture about God's faithfulness, a harp sound effect, and a **shareable testimony card** ("God answered my prayer about [topic]" with a Worship Room watermark). The verse share canvas system (4 templates, 3 sizes) is production-quality and should be the template for this.

**Why this is #1:** Agent 3 confirms the prayer list → dashboard bridge works, meaning this moment is reachable. Agent 5 identifies it as the single most emotionally viral moment that lacks a share action. The infrastructure (canvas sharing, sound effects, celebration overlays) already exists — this is an assembly and design task, not a build-from-scratch effort.

**Files:** `my-prayers/PrayerAnsweredCelebration.tsx`, `lib/verse-card-canvas.ts` (template system to extend)

### 2. First-Visit Prayer Flow — Surfaced Earlier in Conversion

**Current (40%):** The mood check-in → verse → recommendations → dashboard flow is the app's best sequence, but it only fires for logged-in users. The prayer generation (KaraokeText + ambient audio) is the "tell a friend" moment, but it requires navigating to the Pray tab, typing something, and waiting.

**100% Vision:** On first visit, after the hero input (currently auth-gated — P0 #1), immediately generate a prayer with ambient sound. One tap to peace. Then gate saving/follow-ups for login. The value proposition is demonstrated before any login wall.

**Why this is #2:** Agent 3 identifies the hero auth gate as a P0 conversion blocker. Agent 5 identifies the prayer generation flow as the closest "tell a friend" moment. These converge: fixing P0 #1 enables the single most powerful first-visit experience.

**Files:** `HeroSection.tsx:91-93`, `AskPage.tsx:63-65`, `daily/PrayTabContent.tsx`

### 3. Growth Garden — Seasonal, Activity-Diverse, Shareable

**Current (60%):** 6-stage SVG responding to faith level. Sun/clouds based on streak. Sparkle on level up.

**100% Vision:** Seasonal variations via liturgical calendar (snow in Advent, blooming at Easter). Activity-diversity reflections (writing desk for journalers, meditation cushion for meditators). Time-of-day lighting. **Shareable as a canvas image** — "Look at my garden" is deeply personal and Instagram-worthy.

**Why this is #3:** Agent 5 rates this 60% → 100% as the top enhancement. The garden is the visual heart of the dashboard, and making it shareable creates organic growth. Agent 3 notes no dashboard widget for favorite ambient mixes — the garden could visually reflect audio habits too.

**File:** `components/dashboard/GrowthGarden.tsx`

### 4. Evening Reflection — Ambient Sound, Gratitude Callback, Sleep Bridge

**Current (60%):** 4-step flow after 6 PM. Keeps streak alive. Has a "Go to Sleep & Rest" CTA at the end.

**100% Vision:** Auto-play a gentle ambient sound during the reflection. Surface one gratitude entry from the morning for recall. End with a personalized closing prayer referencing the day's activities. Transition seamlessly to sleep content. Add a closing sound effect (door gently closing).

**Why this is #4:** Agent 3 confirms the Sleep & Rest bridge exists but is minimal. Agent 5 identifies evening reflection as 60% → 100% potential. The evening is the ritual anchor point — strengthening it drives next-morning return.

**File:** `components/dashboard/EveningReflection.tsx`

### 5. Surprise & Delight System — Breaking Predictability

**Current (0%):** Zero hidden moments, zero unexpected rewards, zero delightful surprises. Every reward follows a strict threshold pattern.

**100% Vision:** 5 specific surprise moments identified by Agent 5:
1. **Scripture echo** — surface a whisper-toast when a Bible verse matches one the user previously prayed about
2. **Anniversary moment** — personalized screen at 1-week, 1-month milestones
3. **Midnight verse** — special late-night content for sleepless users (bridge to sleep content)
4. **Streak weather** — rainbow in the garden SVG at 7-day streak milestone
5. **Gratitude callback** — surface a past gratitude entry as a reminder

**Why this is #5:** Agent 4 identifies decision fatigue on the dashboard (14+ widgets). Surprise moments create delight without adding UI weight — they appear contextually, not as permanent fixtures.

**Files:** `BibleReader.tsx`, `Dashboard.tsx`, `DashboardHero.tsx`, `GrowthGarden.tsx`, `GratitudeWidget.tsx`

---

## 3. Quick Wins

Issues fixable in under 2 hours, sorted by user impact.

| # | Fix | Impact | Effort | File:Line |
|---|-----|--------|--------|-----------|
| 1 | Fix 6 ESLint errors to unblock CI | Unblocks all shipping | 15 min | `e2e/full-site-audit.spec.ts:1`, `dynamic-ordering.test.tsx:80,96`, `PrayerDetail.tsx:63`, `PrayerWallDashboard.tsx:116`, `PrayerWallProfile.tsx:69` |
| 2 | Cap `addNotification()` in `social-storage.ts` to 50 entries | Prevents localStorage overflow after 1+ year | 10 min | `social-storage.ts:106-129` |
| 3 | Add `/ask` link to SiteFooter | Desktop users can discover AI Bible Chat | 5 min | `SiteFooter.tsx:4-8` |
| 4 | Add `aria-live="polite"` to AI response containers | Screen reader users are notified of AI answers | 15 min | `AskPage.tsx` response container, `PrayerResponse.tsx` |
| 5 | Add `/meditate/*` case to `isNavActive` mapping to Daily Hub | Meditation pages show active nav indicator | 5 min | `Navbar.tsx:24-33` |
| 6 | Fix 404 page `<a href="/">` → `<Link to="/">` | Prevents unnecessary full page reload | 2 min | `App.tsx:106` |
| 7 | Fix Journey "Give Thanks" link from `/` to `/daily?tab=journal` | Eliminates circular navigation on landing page | 2 min | `JourneySection.tsx:46` |
| 8 | Add breadcrumb to `/music/routines` | Users can navigate back to Music page | 5 min | `RoutinesPage.tsx` |
| 9 | Add Bible/Grow/Ask links to SiteFooter | Footer matches primary nav structure | 10 min | `SiteFooter.tsx:4-28` |
| 10 | Wire per-route skeleton components to Suspense | Content-shaped loading instead of generic logo pulse | 30 min | `App.tsx:149` + 13 skeleton files |
| 11 | Add 365-day rolling prune to `wr_daily_activities` | Prevents unbounded storage growth | 15 min | `services/faith-points-storage.ts` |
| 12 | Soften Activity Checklist multiplier language | Aligns with "celebrate presence, never punish absence" | 10 min | `ActivityChecklist.tsx` — e.g., "Complete 2 more for 1.5x bonus!" → "Each practice deepens your day." |
| 13 | Add 16+ unique Spotify track IDs to Song of the Day | Eliminates 2-week content staleness | 30 min | `mocks/daily-experience-mock-data.ts` — `DAILY_SONGS` array |
| 14 | Add 5-10 more Lent-tagged Verses of the Day | Reduces 5-day cycle during 38-day Lent season | 45 min | `data/verse-of-the-day.ts` |

---

## 4. Full Section Reports

Each agent's complete report is the source of truth. Do not duplicate content here.

| Agent | Focus | File |
|-------|-------|------|
| 1 | Build, Test & Regression Health | [`_recon/agent-1-build-health.md`](agent-1-build-health.md) |
| 2 | Navigation, Routes & IA | [`_recon/agent-2-navigation.md`](agent-2-navigation.md) |
| 3 | Cross-Feature Integration & Journeys | [`_recon/agent-3-integration.md`](agent-3-integration.md) |
| 4 | UX Quality & Accessibility | [`_recon/agent-4-ux-accessibility.md`](agent-4-ux-accessibility.md) |
| 5 | Polish, Delight & Emotional Resonance | [`_recon/agent-5-polish-delight.md`](agent-5-polish-delight.md) |
| 6 | Content Depth & Data Completeness | [`_recon/agent-6-content.md`](agent-6-content.md) |
| 7 | Performance, Bundle & Tech Debt | [`_recon/agent-7-performance.md`](agent-7-performance.md) |

---

## 5. Planned Fix Summary

All `[PLANNED FIX]` items collected from all agents, organized by which spec or phase addresses them.

### Phase 3 — Auth & Backend Wiring

| Finding | Agent | Current State |
|---------|-------|---------------|
| Mock AI prayers are 1:1 topic-mapped with zero variation | 6 | Same input always produces identical output. Most obvious "not real AI" signal. |
| Mock AI Bible Chat responses are topic-bucketed, no variation | 6 | 16 hardcoded responses. Same question = same answer verbatim. |
| Weekly recap group stats never change | 6 | Hardcoded `{ prayers: 23, journals: 15 }` every week. |
| Mock friends data is static | 6 | 10 friends with frozen streaks and points. |
| Leaderboard competitor data is frozen | 6 | User's real points update, competitors stay static. |
| Journal AI reflections pool is only 8 entries | 6 | Frequent journalers see repeats quickly. |
| Auth modal form validates and submits but does nothing | 4 | Shows toast "Authentication coming soon" — form appears functional. |
| Password reset, email change, password change stubs | 4 | "Coming soon" toasts on functional-looking buttons. |
| Prayer save button shows "Save feature coming soon" | 4 | Button should be hidden or clearly marked. |
| Chat feedback (`wr_chat_feedback`) written but never consumed | 3 | Dead data island — no insights, no admin view. |
| Challenge reminders (`wr_challenge_reminders`) UI-only | 3 | Toggle writes to localStorage, no backend reader sends reminders. |
| Crisis detection is client-side keyword matching | 7 | `TODO(phase-3)` to move to backend API. |
| `@tanstack/react-query`, `react-hook-form`, `zod` in entry bundle | 7 | ~25-30 KB gzipped loaded but barely used. Remove until Phase 3. |
| Local support website URLs are `example.com` | 6 | Mock data, expected for current phase. |
| Prayer wall avatar URLs use `i.pravatar.cc` | 6 | Third-party service for mock avatars. |

### Phase 4 — Polish & Native Prep

| Finding | Agent | Current State |
|---------|-------|---------------|
| Music page uses light `bg-neutral-bg` background, breaks dark sanctuary immersion | 5 | Design system specifies light bg for Music. Dark theme conversion deferred. |
| No maskable PWA icon | 1 | Chrome home screen icon has forced padding. |
| Recharts at 506 KB could use lighter alternative | 7 | Already isolated via manual chunking. Reassess if charting needs stay simple. |
| React Router v7 deprecation warnings in tests | 1 | Not blocking, but v7 migration will be required eventually. |

### Already Implemented (confirming completion)

| Spec | Status |
|------|--------|
| Dark theme (4 specs) | Implemented |
| Nav consolidation to 5 items | Implemented |
| /grow tabbed experience | Implemented |
| Inner page hero redesigns | Implemented |
| Sound effects/feedback (12+ triggers) | Implemented |
| Page transition animations | Implemented |
| Cross-feature integration (3 batches) | Implemented |
| Warm empty states (FeatureEmptyState in 10+ locations) | Implemented |
| Breadcrumb navigation (detail pages) | Implemented |
| Missing badge definitions (17 new badges) | Implemented |
| Form accessibility improvements | Partially implemented (FormField built but unused) |
| Verse image sharing templates (4 templates x 3 sizes) | Implemented |
| Route code splitting (34 lazy routes) | Implemented |
| Large component splitting | Implemented |
| Skeleton loading system | Built but not wired (see P1 #6) |
| Dashboard widget prioritization | Implemented |

---

## 6. Strategic Bets

High-impact, high-effort items that would meaningfully move the product forward.

### 1. "Welcome Back" Re-engagement Flow

**What:** When a user returns after 3+ days of inactivity, show a personalized welcome screen before the mood check-in. Include: warm greeting acknowledging the gap, proactive streak repair offer, summary of new content (challenges, friend activity), and a one-tap "Start fresh" re-entry path.

**Why:** The 3-7 day mark is where users permanently churn. This app serves people who may have missed days because of the very struggles it helps with. A warm re-entry — not a guilt-inducing streak counter — is the difference between retention and abandonment. Agent 3 identifies this as the highest-risk churn window.

**Effort:** 1-2 weeks. Requires: days-since-last-activity calculation, streak repair integration, content summary component, conditional dashboard phase.

**Dependencies:** None. Can be built entirely in the frontend with existing localStorage data.

### 2. Ritual Building — "My Daily Flow"

**What:** Transform the Activity Checklist from a passive tracking list into an active daily sequence. Add "Start next" on the first uncompleted item. Allow users to customize their daily order (devotional → pray → journal → meditate). Show a "Your morning routine" card on the dashboard that one-tap launches the next step.

**Why:** Ritual formation is the #1 driver of daily return rates. Users who build multi-feature habits return 3-4x more often than single-feature users. Currently, the app presents disconnected features and hopes users assemble a rhythm on their own. Agent 3 identifies this as a P1 retention gap.

**Effort:** 2-3 weeks. Requires: sequence configuration UI, "start next" flow logic, routine persistence, dashboard widget redesign.

**Dependencies:** Could build incrementally — start with "Start next" button (1 day), then add sequence customization (1 week).

### 3. Bible Reader Engagement Bridges

**What:** After reading a Bible chapter, show a contextual CTA strip: "Journal about this passage," "Pray about what you read," "Ask a question about this chapter," "Meditate on a verse." Pass chapter/passage context to the target feature.

**Why:** The Bible reader is the highest-content page in the app (66 books, 1,189 chapters) and currently a dead end. Agent 3 identifies this as a P1 integration gap. Agent 5 notes that Bible annotations are a feature isolation problem — highlights and notes are never referenced by other features.

**Effort:** 3-5 days. Requires: CTA strip component, context-passing to Daily Hub tabs and Ask page.

**Dependencies:** None. All target features already accept context parameters.

### 4. WCAG AA Contrast Remediation

**What:** Systematic replacement of `text-white/30` and `text-white/40` across 133 files. Establish new minimum opacities: `/60` for body text, `/50` for large text only, `/30-40` for decorative elements only. Update placeholder text from `placeholder:text-white/30-40` to `placeholder:text-white/60`.

**Why:** 271 occurrences of failing contrast ratios is a systemic accessibility failure. For an app serving emotionally vulnerable users, readability is non-negotiable. Agent 4 identifies this as a P0 blocker.

**Effort:** 1-2 days with search-and-replace. Risk: visual design impact needs review per-component — some `/40` text may be intentionally de-emphasized and needs a different solution (smaller font size rather than lower opacity).

**Dependencies:** None, but needs design review to avoid unintentional visual changes.

### 5. Shareable Moments Expansion

**What:** Extend the verse share canvas system (4 templates, 3 sizes) to: answered prayer testimony cards, badge unlock cards, streak milestone cards, garden progress images, and reading plan completion cards.

**Why:** The verse share system is production-quality and generates genuinely beautiful, Instagram-worthy images. But it's the only feature with shareable visual output. Answered prayer testimonies, garden snapshots, and badge celebrations are deeply personal — exactly the kind of content that spreads in Christian communities. Agent 5 identifies the answered prayer testimony as the most emotionally viral moment that lacks a share action.

**Effort:** 2-3 weeks. Requires: canvas rendering templates for each shareable type, share UI integration, social meta tags for shared URLs.

**Dependencies:** Verse share canvas system (`lib/verse-card-canvas.ts`) is the template. Garden shareability requires canvas rendering of SVG (medium complexity).

---

## 7. Prioritized Action List

Every finding from all agents, excluding `[PLANNED FIX]` items.

### P0 — Fix Now

| # | Issue | Agent | File |
|---|-------|-------|------|
| 1 | Hero input auth-gates first interaction for logged-out visitors | 3 | `HeroSection.tsx:91-93` |
| 2 | WCAG AA contrast failures: `text-white/30` and `/40` across 133 files (271 occurrences) | 4 | Systemic — `tailwind.config.js` + 133 component files |
| 3 | No "Welcome Back" flow after 3+ days of inactivity | 3 | `Dashboard.tsx` — new conditional phase |
| 4 | Unbounded `wr_social_interactions` notification array (bypasses 50-entry cap) | 7 | `social-storage.ts:106-129` |
| 5 | Unbounded `wr_daily_activities` (grows one entry per day, never pruned) | 7 | `services/faith-points-storage.ts` |

### P1 — Fix This Sprint

| # | Issue | Agent | File |
|---|-------|-------|------|
| 6 | Bible reader has no cross-feature CTAs after chapter | 3 | `BibleReader.tsx` ~line 320 |
| 7 | 13 skeleton components built but not wired to Suspense | 4 | `App.tsx:149` + 13 files in `components/skeletons/` |
| 8 | `/ask` page orphaned from desktop navigation and footer | 2 | `SiteFooter.tsx:4-8` |
| 9 | Song of the Day has only 14 unique tracks in 30-entry pool | 6 | `mocks/daily-experience-mock-data.ts` |
| 10 | No ritual-building mechanism (Activity Checklist is passive) | 3 | `ActivityChecklist.tsx` |
| 11 | ESLint gate fails with 6 errors + 32 warnings | 1 | 6 files (see Agent 1 §8) |
| 12 | Six meditation sub-pages are dead ends — no breadcrumbs, no active nav indicator | 2 | `Navbar.tsx:24-33` + 6 files in `pages/meditate/` |
| 13 | Missing `aria-live` on AI response containers (Ask page, prayer generation) | 4 | `AskPage.tsx`, `PrayerResponse.tsx` |
| 14 | AuthModal register fields (name, confirm password) lack `aria-invalid` and inline errors | 4 | `AuthModal.tsx:209-290` |
| 15 | FormField component exists but zero production components use it | 4 | `components/ui/FormField.tsx` — either migrate forms or remove |
| 16 | Prayer Answered celebration uses same visual as badge unlocks — no unique treatment | 5 | `PrayerAnsweredCelebration.tsx` |
| 17 | Reading plan completion has no celebration (last day same as any day) | 5 | `DayCompletionCelebration.tsx` |
| 18 | Activity Checklist multiplier language feels pressuring ("Complete 3 more for 2x!") | 5 | `ActivityChecklist.tsx` |
| 19 | Footer missing primary nav features: Bible, Grow, Ask | 2 | `SiteFooter.tsx:4-28` |
| 20 | Lent VOTD has only 5 verses for a 38-day season (repeats every 5 days) | 6 | `data/verse-of-the-day.ts` |
| 21 | Reading plan data (156 KB) bundles all 10 plans together | 7 | `useReadingPlanProgress` chunk — lazy-load per plan |
| 22 | Leaflet (212 KB) bundled inline in LocalSupportPage instead of as shared chunk | 7 | `vite.config.ts` manualChunks — add Leaflet |
| 23 | Favorite ambient mixes not accessible outside Music page | 3 | `DashboardWidgetGrid.tsx` — add widget or Quick Actions deep-link |

### P2 — Fix Next Quarter

| # | Issue | Agent | File |
|---|-------|-------|------|
| 24 | Toast copy is clinical (~40 messages read like database confirmations) | 5 | ~40 toast calls across codebase (see Agent 5 table) |
| 25 | Zero surprise/delight moments — every reward is predictable | 5 | Multiple files (see Agent 5 §Surprise & Delight) |
| 26 | 5 features store data never reflected back (meditation history, Bible annotations, local visits, listening history, chat feedback) | 5 | Multiple services (see Agent 5 §Feature Isolation) |
| 27 | Dashboard widget density (14+ widgets) creates cognitive load | 4,5 | `DashboardWidgetGrid.tsx` |
| 28 | AI Bible Chat conversation lost on navigation (React-only state) | 3 | `AskPage.tsx:28` |
| 29 | `/music/routines` page has no breadcrumb | 2 | `RoutinesPage.tsx` |
| 30 | Journey "Give Thanks" step links to `/` (circular on landing page) | 2 | `JourneySection.tsx:46` |
| 31 | Insights page uses ArrowLeft instead of Breadcrumb (inconsistent) | 2 | `Insights.tsx:195-201` |
| 32 | Category pill selectors lack keyboard efficiency (all individually tabbable) | 4 | `InlineComposer.tsx:142`, `PrayerComposer.tsx:121` |
| 33 | Report dialog textarea lacks character count and max length | 4 | `ReportDialog.tsx:111-119` |
| 34 | RoutineBuilder name input has no label or aria-label | 4 | `RoutineBuilder.tsx:34` |
| 35 | Answered prayer and garden are not shareable | 5 | `PrayerAnsweredCelebration.tsx`, `GrowthGarden.tsx` |
| 36 | Sound missing on journal save and evening reflection close | 5 | `JournalTabContent.tsx`, `EveningReflection.tsx` |
| 37 | No time-of-day adaptation on landing page hero | 3 | `HeroSection.tsx` |
| 38 | Landing page hero does not personalize for returning logged-out visitors | 3 | `HeroSection.tsx` |
| 39 | Large components (WelcomeWizard 557, PrayerWall 553, EveningReflection 487 lines) | 7 | 3 files — extract sub-components |
| 40 | Static data as compiled JS (devotionals 1,823 lines, challenges 1,124 lines) | 7 | `data/devotionals.ts`, `data/challenges.ts` — convert to lazy-loaded JSON |

### P3 — Monitor

| # | Issue | Agent | File |
|---|-------|-------|------|
| 41 | 404 page "Go Home" uses `<a>` instead of `<Link>` | 2 | `App.tsx:106` |
| 42 | `isNavActive` has no case for `/ask`, `/insights`, `/settings`, `/friends`, `/my-prayers` | 2 | `Navbar.tsx:24-33` |
| 43 | Shared verse/prayer pages have no CTA to explore further | 2 | `SharedVerse.tsx`, `SharedPrayer.tsx` |
| 44 | Friends and Settings pages have no breadcrumb | 2 | `Friends.tsx`, `Settings.tsx` |
| 45 | `/login` and `/register` routes render dead-end ComingSoon stub | 2 | `App.tsx:198-199` |
| 46 | Report button inverted breakpoint: `sm:min-h-0` removes touch target on small screens | 4 | `ReportDialog.tsx:76` |
| 47 | App Store/Play Store footer badges at 40px (under 44px minimum) | 4 | `SiteFooter.tsx:32,50` |
| 48 | Notification panel `max-h-[400px]` may truncate on small landscape screens | 4 | `NotificationPanel.tsx:60` |
| 49 | Playlist year label "Top Christian Songs 2025" will age | 6 | `data/music/playlists.ts` |
| 50 | PrayerWall.tsx creates inline callbacks without useCallback (18+ cards) | 7 | `PrayerWall.tsx` render body |
| 51 | Missing JSON-LD on Home (WebSite schema) and BibleReader (Article schema) | 7 | `Home.tsx`, `BibleReader.tsx` |
| 52 | GrowthGarden (765 lines SVG) eagerly imported by Dashboard — could use intersection observer | 7 | `Dashboard.tsx` import |
| 53 | Spotify playlist follower count hardcoded (`followers: 117155`) | 6 | `data/music/playlists.ts` |
| 54 | Prayer Wall "praying count" increment not announced to screen readers | 4 | `InteractionBar.tsx` |
| 55 | Evening Reflection step 2 empty state lacks illustration/CTA | 4 | `EveningReflection.tsx` |
| 56 | Prayer Wall Dashboard "My Posts" tab has no empty state when user has zero posts | 4 | `PrayerWallDashboard.tsx` |

---

## Appendix: Conflict Resolution

### Resolved Conflicts

1. **Skeleton system status**: Agent 1 reports build passes (correct — skeletons compile fine). Agent 4 reports skeletons are built but not wired (correct — the components exist but aren't used as Suspense fallbacks). No conflict — both are accurate observations at different levels.

2. **Sound effects coverage**: Agent 5 reports sound gaps (journal save, evening reflection close). Sound effects spec says 12+ triggers are implemented. No conflict — the spec covered the initial set, and Agent 5 identified natural next additions.

3. **Dashboard widget count**: Agent 4 says 14+ widgets create cognitive load. The dashboard-widget-prioritization spec implemented a customization panel. Both are true — the customization exists but the default is still dense.

### Cross-Reference Elevations

High-churn files that also have UX friction, accessibility gaps, or integration problems — elevated priority:

| File | Churn (90d) | Issues Found | Elevated? |
|------|-------------|-------------|-----------|
| `Navbar.tsx` | 44 changes | Missing `/ask` in desktop nav, missing `isNavActive` for `/meditate/*` | Yes — most-touched file has discoverable nav gaps |
| `Dashboard.tsx` | 20 changes | No welcome-back flow, 14+ widget density, Activity Checklist language | Yes — primary user surface with 3 convergent issues |
| `Home.tsx` | 16 changes | Hero auth-gates first interaction | Yes — conversion funnel is broken |
| `App.tsx` | 32 changes | Generic Suspense fallback, `<a>` vs `<Link>` in 404 | Moderate — Suspense fix is impactful |
| `DashboardWidgetGrid.tsx` | 18 changes | Test file has `any` casts, widget density | Low — test quality, not user-facing |

### Enhancement Convergence

Features where Agent 3 (journeys), Agent 4 (UX), and Agent 5 (delight) all converge — these are the highest-priority spec candidates:

1. **First-visit conversion flow** — Agent 3 (P0 auth gate), Agent 5 ("tell a friend" moment), Agent 4 (auth modal stubs)
2. **Bible reader engagement** — Agent 3 (dead end), Agent 5 (feature isolation of annotations), Agent 4 (no loading skeleton for chapter)
3. **Dashboard focus** — Agent 3 (no ritual building), Agent 4 (14+ widget cognitive load), Agent 5 (multiplier language, 60% garden potential)
4. **Re-engagement** — Agent 3 (no welcome-back), Agent 5 (zero surprise/delight), Agent 6 (content staleness in Song of the Day)

---

## Build & Content Health Summary

| Metric | Status |
|--------|--------|
| Build | PASSES (0 errors, 0 warnings) |
| Tests | 4,862 pass / 0 fail |
| Lint | FAILS (6 errors, 32 warnings) |
| TypeScript strict | Enforced |
| PWA | Healthy (manifest, SW, offline fallback all present) |
| Content sets | All meet spec targets (66 Bible books, 50 devotionals, 10 plans, etc.) |
| Translation consistency | Clean (zero non-WEB references) |
| Security | Clean (no secrets in source) |
| SEO | Comprehensive (every route has `<SEO>`, JSON-LD on 7+ pages) |
| Main bundle | 97 KB gzipped (healthy) |
| Largest chunk | Recharts 153 KB gzipped (isolated, acceptable) |
