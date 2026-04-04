---
paths: ["frontend/**"]
---

## Design System & Component Architecture

This file is the comprehensive design reference for UI implementation. It covers the color palette, typography, component inventory, custom hooks, utility libraries, and feature-specific architecture.

### Color Palette

- **Primary**: `#6D28D9` (deep violet) — Tailwind: `primary`
- **Primary Light**: `#8B5CF6` (lighter violet accent) — Tailwind: `primary-lt`
- **Hero Dark**: `#0D0620` (dark purple for hero gradient) — Tailwind: `hero-dark`
- **Hero Mid**: `#1E0B3E` — Tailwind: `hero-mid`
- **Hero Deep**: `#251248` — Tailwind: `hero-deep`
- **Hero BG**: `#08051A` (darkest background, used by homepage and Daily Hub sections) — Tailwind: `hero-bg`
- **Glow Cyan**: `#00D4FF` (cyan for input glow effects) — Tailwind: `glow-cyan`
- **Neutral Background**: `#F5F5F5` (warm off-white) — Tailwind: `neutral-bg`
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue) — Tailwind: `text-dark`
- **Text Light**: `#7F8C8D` (medium gray) — Tailwind: `text-light`
- **Success**: `#27AE60` (green for positive moods) — Tailwind: `success`
- **Warning**: `#F39C12` (orange for neutral moods) — Tailwind: `warning`
- **Danger**: `#E74C3C` (red for negative moods/flags) — Tailwind: `danger`
- **Borders**: `#2a2040` — Tailwind: `dark-border`, `#9CA3AF` — Tailwind: `muted-gray`, `#6B7280` — Tailwind: `subtle-gray`

### Mood Color Palette

Used for check-in orbs, chart dots, heatmap squares, and data visualization accents:

| Mood       | Value | Color               | Hex       |
| ---------- | ----- | ------------------- | --------- |
| Struggling | 1     | Deep warm amber     | `#D97706` |
| Heavy      | 2     | Muted copper/orange | `#C2703E` |
| Okay       | 3     | Neutral gray-purple | `#8B7FA8` |
| Good       | 4     | Soft teal           | `#2DD4BF` |
| Thriving   | 5     | Vibrant green-gold  | `#34D399` |

### Dashboard Card Pattern

Frosted glass cards for the all-dark dashboard:

- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Padding: `p-4 md:p-6`
- Collapsible with height transition (`overflow-hidden`)

**Homepage and Daily Hub cards** use the upgraded `FrostedCard` component (see "Homepage Visual Patterns" section below) which has stronger borders, box-shadow, and hover states.

### Text Opacity Standards

**Homepage, Daily Hub, and landing page sections (Round 3 standard):** Default to `text-white` for all readable text. Reserve muted opacities only for lock overlays (`text-white/50`), placeholder text (`placeholder:text-white/50`), and purely decorative elements (`text-white/20` to `text-white/40`). StatsBar ALL CAPS labels use `text-white/90`.

**Dashboard and other inner pages (WCAG AA standard):** All text on dark backgrounds must meet these minimum opacity values:

| Use Case                         | Minimum | Class                              |
| -------------------------------- | ------- | ---------------------------------- |
| Primary text                     | 70%     | `text-white/70`                    |
| Secondary text                   | 60%     | `text-white/60`                    |
| Placeholder text                 | 50%     | `placeholder:text-white/50`        |
| Large headings (18px+)           | 60%     | `text-white/60`                    |
| Interactive text (buttons/links) | 50%     | `text-white/50`                    |
| Decorative / disabled            | 20-40%  | `text-white/20` to `text-white/40` |

Body text below `text-white/60` fails WCAG AA 4.5:1 on hero-dark (#0D0620).
Placeholder text below `placeholder:text-white/50` fails WCAG AA 3:1 on input backgrounds.

**Exempt from contrast requirements:** decorative icons, locked badge silhouettes, verse number superscripts, middot separators, disabled/locked state indicators, background decorations.

**Note:** The homepage and Daily Hub use `text-white` for all readable text (which exceeds WCAG AA). When redesigning inner pages to match the homepage style, prefer `text-white` everywhere. The WCAG minimum table above is a floor, not a target.

### Typography

- **Body Font**: Inter (sans-serif) — Tailwind: `font-sans`
  - Regular: 400, Medium: 500, Semi-bold: 600, Bold: 700
- **Scripture Font**: Lora (serif) — Tailwind: `font-serif`
  - Regular: 400, Italic: 400 italic, Bold: 700
- **Decorative Font**: Caveat (cursive) — Tailwind: `font-script`
  - Used for branding elements (logo)
  - **Note:** Homepage and Daily Hub headings no longer use Caveat — they use `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) instead. Caveat may still appear on other inner pages but is being phased out in favor of gradient text.
- **Heading Font**: Inter (same as body for consistency)
  - Semi-bold: 600, Bold: 700
- **Font Sizes**: Hero: 3rem (mobile: 2rem), H1: 2.5rem (1.75rem), H2: 2rem (1.5rem), H3: 1.5rem (1.25rem), Body: 1rem, Small: 0.875rem

### Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

### Custom Animations (Tailwind)

- `animate-glow-pulse` (2.5s) — cyan/violet glow on textareas
- `animate-cursor-blink` (1s) — typewriter input cursor
- `animate-dropdown-in` (150ms) — navbar dropdown fade + slide up
- `animate-slide-from-right`, `animate-slide-from-left` (300ms) — tab transitions
- `animate-golden-glow` (2s) — golden box-shadow for completion celebration
- `animate-breathe-expand`, `animate-breathe-contract` (4s, 8s) — meditation breathing
- `animate-fade-in` (500ms) — general fade + slide up
- `animate-confetti-fall` — CSS-only confetti for celebration overlays

---

## Shared Components

### Layout Components

- **Layout.tsx** — Wrapper: `<Navbar>` + content + `<SiteFooter>`. Passes `transparent` prop on landing page.
- **Navbar.tsx** — Glassmorphic navigation. Desktop: 5 top-level items + Local Support dropdown + avatar dropdown. Mobile: hamburger drawer (`MobileDrawer`). `transparent` prop controls absolute vs relative positioning. Logged-in state: replaces Log In/Get Started with notification bell + avatar dropdown (see `10-ux-flows.md` for nav structure).
- **SiteFooter.tsx** — Dark purple footer. Nav columns (Daily, Music, Support), crisis resources, app download badges (Coming Soon), "Listen on Spotify" badge, copyright.
- **PageTransition.tsx** — 150ms opacity fade-out + 200ms fade-in on route changes. Body background set to `#08051A` to prevent white flash during transitions.

### Design System Components

- **PageHero.tsx** — Purple gradient header with title, subtitle, optional `HeadingDivider`. Used by Prayer Wall, Local Support pages.
- **HeadingDivider.tsx** — White decorative SVG divider with fade gradients. Responsive via `useElementWidth()`.
- **BackgroundSquiggle.tsx** — Decorative SVG squiggle (viewBox 1800×1350, 6 paths). Exported `SQUIGGLE_MASK_STYLE` for consistent fade mask. Used by Daily Hub Pray, Journal, and Meditate tabs (layered behind GlowBackground). NOT used by Devotional tab (removed in Round 3 redesign).
- **SongPickSection.tsx** — Side-by-side layout: "Today's" (GRADIENT_TEXT_STYLE, large) + "Song Pick" (white, smaller) heading on left, Spotify 352px iframe on right. Stacked on mobile. GlowBackground variant="left". No glass card wrapper, no music icon, no HeadingDivider.
- **HeroSection.tsx** — Landing page hero: dark purple gradient, typewriter input, quiz teaser link. UNTOUCHED by homepage redesign.
- **JourneySection.tsx** — 7-step vertical timeline with numbered circles, gradient keyword text, inline narrow squiggle SVG, glow orbs. Steps link to feature routes.
- **StartingPointQuiz.tsx** — 5-question quiz inside a frosted glass container (`rounded-3xl`), gradient progress bar. `id="quiz"` for scroll target. Only appears on the landing page (removed from Daily Hub in Round 3 redesign).
- **TypewriterInput.tsx** — Hero input with typewriter placeholder animation.
- **SpotifyBadge.tsx** — "Listen on Spotify" badge link.
- **Breadcrumb.tsx** — Breadcrumb navigation for detail pages.
- **FeatureEmptyState.tsx** — Reusable warm empty state with icon, heading, description. Used in 10+ locations.
- **FormField.tsx** — Accessible form field with `aria-invalid`, `aria-describedby`, character count, inline validation (built but not yet adopted by production forms).

### Homepage Components (`components/homepage/`)

> These patterns now apply to both the homepage AND the Daily Hub page as of the Round 3 Daily Hub redesign. GlowBackground, FrostedCard, GRADIENT_TEXT_STYLE, and section dividers are used across both pages.

Shared building blocks for the landing page and Daily Hub, created during the Round 3 homepage redesign (HP-1 through HP-15):

- **SectionHeading.tsx** — 2-line heading: smaller white `topLine` + larger purple gradient `bottomLine`. Backward-compatible single `heading` prop. See "Homepage Visual Patterns" for sizing.
- **GlowBackground.tsx** — Atmospheric glow wrapper with variants: `center`, `left`, `right`, `split`, `none`. Glow orb opacity at 0.25-0.50 range.
- **FrostedCard.tsx** — Glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Optional `onClick` adds hover elevation.
- **StatsBar.tsx** — 6 animated counters (scroll-triggered via `useAnimatedCounter`). 50 Devotionals, 10 Reading Plans, 24 Ambient Sounds, 6 Meditation Types, 5 Seasonal Challenges, 8 Worship Playlists.
- **DashboardPreview.tsx** — "See How You're Growing" section with 6 locked preview cards + "Create a Free Account" CTA.
- **DashboardPreviewCard.tsx** — Locked preview card: blurred mockup on top, clear icon + title + description below. Each icon has a unique accent color.
- **DifferentiatorSection.tsx** — "Built for Your Heart" section with 6 competitive advantage cards.
- **FinalCTA.tsx** — Bottom CTA: "Your Healing Starts Here", strongest glow on the page (0.50 center), "Get Started — It's Free" button → auth modal.
- **dashboard-preview-data.ts** — Card metadata (icons, titles, descriptions, preview keys).
- **differentiator-data.ts** — 6 differentiator cards (titles, descriptions, icons).
- **index.ts** — Barrel export for all homepage components.

### Daily Experience Components (`components/daily/`)

- **PrayTabContent.tsx** — Full Pray tab: GlowBackground + BackgroundSquiggle layered, textarea with chips, crisis banner, mock prayer generation, KaraokeText, action buttons, cross-tab CTA.
- **JournalTabContent.tsx** — Full Journal tab: GlowBackground + BackgroundSquiggle layered, Guided/Free Write toggle, prompt card, draft auto-save, crisis banner, saved entries, AI reflection.
- **MeditateTabContent.tsx** — Full Meditate tab: GlowBackground (split variant) + BackgroundSquiggle layered, 6 auth-gated FrostedCard meditation cards, completion checkmarks, celebration banner.
- **DevotionalTabContent.tsx** — Full Devotional tab: GlowBackground only (no squiggle), no heading. Daily quote in FrostedCard, passage, reflection, prayer (compact), reflection question in FrostedCard. Cross-tab CTAs to Journal and Pray. Tighter section spacing (py-5 sm:py-6).
- **MiniHubCards.tsx** — Small cards linking to Pray/Journal/Meditate with completion badges.
- **ReadAloudButton.tsx** — TTS playback via browser Speech Synthesis API.
- **KaraokeText.tsx** — Word-by-word highlighting during Read Aloud and prayer generation.
- **ShareButton.tsx** — Web Share API with fallback dropdown.
- **CompletionScreen.tsx** — Meditation completion celebration with CTAs and MiniHubCards.
- **CrisisBanner.tsx** — Crisis keyword detection + resource alert banner with `role="alert"`.
- **PrayerResponse.tsx** — Generated prayer display with KaraokeText, ambient auto-play, copy/share/save actions.

### Prayer Wall Components (`components/prayer-wall/`)

- **PrayerWallHero.tsx**, **PrayerCard.tsx**, **InlineComposer.tsx**, **CommentInput.tsx**, **CommentItem.tsx**, **CommentsSection.tsx**, **InteractionBar.tsx**, **Avatar.tsx**, **AnsweredBadge.tsx**, **ShareDropdown.tsx**, **ReportDialog.tsx**, **DeletePrayerDialog.tsx**, **MarkAsAnsweredForm.tsx**, **PageShell.tsx**, **QotdComposer.tsx**
- **AuthModal.tsx** / **AuthModalProvider.tsx** — Auth prompt modal with `useAuthModal()` context. UI shell only (Phase 3 for real auth).

### Local Support Components (`components/local-support/`)

- **LocalSupportPage.tsx**, **LocalSupportHero.tsx**, **SearchControls.tsx**, **ResultsList.tsx**, **ResultsMap.tsx**, **ListingCard.tsx**, **ListingShareDropdown.tsx**, **SearchStates.tsx**, **VisitButton.tsx**

### UI Components (`components/ui/`)

- **Toast.tsx** — Toast notification system with `ToastProvider` context and `useToast()` hook. Supports celebration types (confetti, shimmer).
- **Card.tsx** — Basic card wrapper.
- **Button.tsx** — Reusable button component.
- **UnsavedChangesModal.tsx** — Confirmation dialog for unsaved changes.
- **CharacterCount.tsx** — Character count with `aria-live="polite"` zone-change announcements.

### Dashboard & Growth Components (`components/dashboard/`)

- **MoodCheckIn.tsx** — Full-screen daily check-in with mood orbs (`role="radiogroup"` with roving tabindex), text input, verse transition, crisis detection
- **MoodRecommendations.tsx** — Mood-aware content recommendations with staggered fade-in
- **DashboardCard.tsx** — Reusable frosted glass card with collapsible behavior
- **DashboardHero.tsx** — Dark gradient hero with time-of-day greeting, streak, level, liturgical season
- **DashboardWidgetGrid.tsx** — Priority-ordered widget grid with customization panel. Desktop: 2-column (60%/40%). Mobile: single column
- **MoodChart.tsx** — 7-day Recharts line chart with mood-colored dots
- **ActivityChecklist.tsx** — Activity checklist with SVG progress ring and multiplier tiers
- **StreakCard.tsx** — Streak counter + faith points + level + recent badges + streak repair
- **FriendsPreview.tsx** — Top 3 friends + milestone feed + "See all" link
- **QuickActions.tsx** — Navigation buttons to Pray/Journal/Meditate/Music
- **BadgeGrid.tsx** — Earned (color) vs locked (silhouette) badge display
- **GrowthGarden.tsx** — 765-line animated SVG with 6 growth stages, ambient animations, streak-responsive sun/clouds
- **GettingStartedCard.tsx** — 6-item onboarding checklist with auto-completion
- **WelcomeWizard.tsx** — 4-screen onboarding wizard (greeting/name, avatar, quiz, results)
- **EveningReflection.tsx** — 4-step evening flow (mood, highlights, gratitude, closing prayer)
- **GratitudeWidget.tsx** — 3 daily gratitude inputs with rotating placeholders
- **VotdWidget.tsx** — Verse of the Day dashboard widget
- **ReadingPlanWidget.tsx** — Active reading plan progress
- **PrayerListWidget.tsx** — Personal prayer list summary
- **NotificationBell.tsx** — Navbar bell icon with unread badge count
- **NotificationPanel.tsx** — Dropdown panel with notification list
- **CelebrationOverlay.tsx** — Full-screen level-up/milestone celebration with confetti
- **CelebrationQueue.tsx** — Queues and sequences multiple celebration events
- **PrayerAnsweredCelebration.tsx** — Answered prayer celebration overlay

### Sharing Components (`components/sharing/`)

- **SharePanel.tsx** — Verse/prayer share UI with canvas-generated images
- **verse-card-canvas.ts** — Canvas API rendering for shareable verse images (4 templates × 3 sizes: square/story/wide)
- **challenge-share-canvas.ts** — Canvas API rendering for challenge progress/completion images

### Skeleton Components (`components/skeletons/`)

13 page-level skeleton components for content-shaped loading states: `DashboardSkeleton`, `DailyHubSkeleton`, `PrayerWallSkeleton`, `FriendsSkeleton`, `SettingsSkeleton`, `InsightsSkeleton`, `MyPrayersSkeleton`, `MusicSkeleton`, `GrowPageSkeleton`, `BibleBrowserSkeleton`, `BibleReaderSkeleton`, `ProfileSkeleton`. BibleReaderSkeleton is wired inline; others are built but not yet wired to route-level Suspense boundaries.

---

## Custom Hooks (`hooks/`)

### Core Hooks

- **useAuth()** — Returns `{ isAuthenticated, user, login(), logout() }` from `AuthProvider` context. Simulated auth via localStorage (`wr_auth_simulated`, `wr_user_name`). Real JWT auth in Phase 3.
- **useCompletionTracking()** — Daily practice completion per session. localStorage with date-based reset.
- **useReadAloud()** — Browser Speech Synthesis TTS. Play/pause/resume/stop, word index tracking.
- **useInView()** — Intersection Observer for lazy animations. Respects `prefers-reduced-motion`. Used by non-homepage components.
- **useScrollReveal()** — Enhanced scroll reveal hook for homepage. `triggerOnce: true` by default. Exports `staggerDelay()` utility for cascading animations. Homepage sections use this instead of `useInView`.
- **useAnimatedCounter()** — RAF-based number counter for StatsBar. Ease-out curve, configurable duration/delay. Respects `prefers-reduced-motion`.
- **useFocusTrap()** — Keyboard focus trapping for modals. Used in 37 modal/dialog components. Stores `previouslyFocused` and restores focus on cleanup.
- **useOpenSet()** — Manages a Set of open item IDs for expand/collapse patterns.
- **usePrayerReactions()** — Prayer Wall reaction state.
- **useElementWidth()** — ResizeObserver for responsive width measurement.
- **useSoundEffects()** — Web Audio API sound effect playback. 6 sounds (chime, ascending, harp, bell, whisper, sparkle). Gated behind `wr_sound_effects_enabled` and `prefers-reduced-motion`.
- **useLiturgicalSeason()** — Returns current liturgical season via Computus algorithm. Used for seasonal content priority.

### Dashboard & Growth Hooks

- **useFaithPoints()** — Core gamification hook. Returns `{ totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, recordActivity(type) }`. Manages `wr_daily_activities`, `wr_faith_points`, `wr_streak` in localStorage.
- **useMoodChartData(days)** — Returns mood entries for the last N days from `wr_mood_entries`. Used by dashboard widget (7 days) and `/insights` page (30/90/180/365 days).
- **useToast()** — Toast system with celebration types (confetti, shimmer). Returns `{ show(message, options), dismiss(id) }`.
- **useGettingStarted()** — Getting started checklist state and progress tracking.
- **useStreakRepair()** — Grace-based streak repair (1 free/week, 50 pts for additional).

---

## Utility Libraries (`lib/`)

- **utils.ts** — `cn()` classname utility (clsx + tailwind-merge).
- **query-client.ts** — React Query client (5-min staleTime, refetchOnWindowFocus disabled).
- **time.ts** — `timeAgo()` relative time, `formatFullDate()` date formatting.
- **geo.ts** — `calculateDistanceMiles()` Haversine formula.
- **audio.ts** — `playChime()` Web Audio API 528 Hz sine wave.
- **sound-effects.ts** — 6 Web Audio API synthesized sounds (chime, ascending, harp, bell, whisper, sparkle).
- **verse-card-canvas.ts** — Canvas rendering for shareable verse images (4 templates, 3 sizes).
- **challenge-share-canvas.ts** — Canvas rendering for shareable challenge images.

### Dashboard Utilities

- **utils/date.ts** — `getLocalDateString()`, `getYesterdayDateString()`, `getCurrentWeekStart()`. Shared across all dashboard features. **Critical**: Never use `new Date().toISOString().split('T')[0]` — it returns UTC, not local time.

---

## Constants (`constants/`)

- **crisis-resources.ts** — `CRISIS_RESOURCES` object, `SELF_HARM_KEYWORDS` array, `containsCrisisKeyword(text)` function.
- **daily-experience.ts** — Completion keys, journal keys, Spotify URL, meditation types, prayer chips, breathing phases.
- **verse-of-the-day.ts** — 60 verses (40 general + 20 seasonal) with daily rotation.
- **question-of-the-day.ts** — 72 QOTD entries (60 general + 12 liturgical).
- **bible.ts** — `BIBLE_BOOKS` constant (66 books with chapter counts), `BOOK_LOADERS` for lazy loading.
- **gradients.tsx** — `WHITE_PURPLE_GRADIENT` CSS string and `GRADIENT_TEXT_STYLE` CSSProperties object used for gradient text across homepage and Daily Hub headings.

### Dashboard Constants

- **dashboard/activity-points.ts** — `ACTIVITY_POINTS` (mood:5, pray:10, listen:10, prayerWall:15, meditate:20, journal:25), multiplier tiers (1x/1.25x/1.5x/2x).
- **dashboard/levels.ts** — `LEVEL_THRESHOLDS` (Seedling:0, Sprout:100, Blooming:500, Flourishing:1500, Oak:4000, Lighthouse:10000).
- **dashboard/badges.ts** — All ~45 badge definitions with IDs, triggers, celebration tiers.
- **dashboard/mood-colors.ts** — `MOOD_COLORS` mapping mood values 1-5 to hex colors.
- **dashboard/encouragements.ts** — 4 preset encouragement messages.
- **dashboard/ai-insights.ts** — 16 hardcoded insight cards (rotating by day-of-year). Real AI insights in Phase 3.

## Types (`types/`)

### Existing Types

- **daily-experience.ts** — `DailyVerse`, `DailySong`, `MockPrayer`, `ClassicPrayer`, `JournalPrompt`, `JournalReflection`, `MeditationType`, `DailyCompletion`, `JournalMode`, `SavedJournalEntry`, `PrayContext`.
- **prayer-wall.ts** — `PrayerWallUser`, `PrayerRequest`, `PrayerComment`, `PrayerReaction`.
- **local-support.ts** — `LocalSupportPlace`, `SearchParams`, `SearchResult`, `SortOption`.

### Dashboard & Growth Types

- **dashboard.ts** — `MoodEntry`, `DailyActivityLog`, `StreakData`, `StreakRepairData`, `FaithPointsData`, `BadgeData`, `FriendProfile`, `FriendRequest`, `FriendsData`, `Notification`, `UserSettings`, `LeaderboardEntry`, `MilestoneEvent`, `SocialInteractionsData`.

## Mock Data (`mocks/`)

- **daily-experience-mock-data.ts** — 30 daily verses (WEB translation), 30 songs (14 unique tracks), 9 mock prayers, journal prompts, reflections, gratitude affirmations, ACTS steps, examen steps, breathing verses, soaking verses.
- **daily-experience-psalms.ts** — 10 Psalms with full verses, intros, historical context.
- **prayer-wall-mock-data.ts** — 10 mock users, 18+ prayer requests, comments, reactions.
- **local-support-mock-data.ts** — Churches, counselors, celebrate-recovery locations near Columbia, TN (URLs use `example.com`).
- **ask-mock-data.ts** — 16 topic-bucketed AI Bible chat responses with follow-up chips.

### Dashboard Mock Data

- **dashboard-mock-data.ts** — 10 mock friends, mock milestone events, mock notifications, mock global leaderboard (50 users).

---

## Content Data Files (`data/`)

- **devotionals.ts** — 50 devotionals (30 general + 20 seasonal) with quote, passage, reflection, prayer, question.
- **challenges.ts** — 5 community challenges (110 total days) with daily scripture, reflection, action.
- **reading-plans/** — 10 individual plan files (119 total days) with passage, reflection, prayer, action step.
- **guided-prayer-sessions.ts** — 8 audio-guided prayer sessions (5/10/15 min).

### Music Data Files (`data/music/`)

- **sound-catalog.ts** — 24 ambient sounds.
- **scenes.ts** — 11 scene presets + 3 featured scene IDs.
- **scene-backgrounds.ts** — CSS gradient patterns for scene cards.
- **scripture-readings.ts** — 24 WEB scripture readings (4 collections × 6).
- **bedtime-stories.ts** — 12 bedtime stories.
- **playlists.ts** — 8 Spotify playlists (4 worship + 4 explore).
- **routines.ts** — 4 bedtime routine templates.

### Bible Data (`data/bible/books/json/`)

66 individual JSON files, one per Bible book. Lazy-loaded via `BOOK_LOADERS` dynamic imports. Range: 0.14 KB (3 John) to 267 KB (Psalms). Total: ~4.5 MB across all books.

---

## Storage Service & localStorage Keys

`StorageService` interface with `LocalStorageService` in `services/storage-service.ts`. All keys prefixed `wr_`. See `11-localstorage-keys.md` for the complete inventory with types and descriptions.

All writes auth-gated. Abstraction designed for API swap in Phase 3+.

---

## Music Feature — Technical Architecture

### Audio Provider & Context System

Global `AudioProvider` wraps the app (between `AuthModalProvider` and `Routes` in `App.tsx`). Exposes 4 contexts:

- `AudioStateContext` — read-only state via `useAudioState()`
- `AudioDispatchContext` — actions via `useAudioDispatch()`
- `AudioEngineContext` — Web Audio API service via `useAudioEngine()`
- `SleepTimerControlsContext` — timer controls via `useSleepTimerControls()`

**AudioState** includes: `activeSounds`, `masterVolume`, `isPlaying`, `pillVisible`, `drawerOpen`, `currentSceneName`, `foregroundContent`, `sleepTimer`, `activeRoutine`.

`AudioEngineService` manages a single `AudioContext` (suspend/resume, never destroy/recreate). Ambient: `AudioBufferSourceNode` with crossfade looping (double-buffer, 1.5s overlap). Foreground: `<audio>` elements via `MediaElementAudioSourceNode`. Smart fade: `linearRampToValueAtTime`.

### Visual Theme

Music tabs: light `#F5F5F5` (`bg-neutral-bg`) background with dark-on-light cards (`bg-white rounded-xl border border-gray-200 shadow-sm`). AudioDrawer/AudioPill/overlays: dark-themed (`rgba(15,10,30,0.85)` with white text).

Components built but not rendered (kept for re-enable): `TimeOfDaySection`, `PersonalizationSection`, `RecentlyAddedSection`, `ResumePrompt`, `MusicHint`, `LofiCrossReference`, `AmbientSearchBar`, `AmbientFilterBar`. Hooks kept: `useSpotifyAutoPause`, `useMusicHints`, `useTimeOfDayRecommendations`.

### Key Audio Components

Audio components in `components/audio/`: `AudioPill`, `AudioDrawer`, `DrawerNowPlaying`, `DrawerTabs`, `AmbientBrowser`, `SleepBrowse`, `RoutineStepper`.

### Key Audio Hooks

In `hooks/`: `useSoundToggle`, `useScenePlayer`, `useForegroundPlayer`, `useSleepTimer`, `useRoutinePlayer`, `useAmbientSearch`, `useAnnounce`.

### Audio Constants

In `constants/audio.ts`: `MAX_SIMULTANEOUS_SOUNDS: 6`, `DEFAULT_SOUND_VOLUME: 0.6`, `MASTER_VOLUME: 0.8`, `SCENE_CROSSFADE_MS: 3000`, `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`, `LOAD_RETRY_MAX: 3`, `LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000]`, `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]`.

### Audio Files

Placeholder silent MP3s in `public/audio/` (gitignored). Subdirectories: `ambient/`, `scripture/`, `stories/`, `artwork/`. Real TTS via Google Cloud TTS WaveNet (Male: en-US-Wavenet-D, Female: en-US-Wavenet-F). CDN: Cloudflare R2, base URL in `VITE_AUDIO_BASE_URL`.

---

## Homepage Visual Patterns (Round 3)

> These patterns now apply to both the homepage AND the Daily Hub page as of the Round 3 Daily Hub redesign. GlowBackground, FrostedCard, GRADIENT_TEXT_STYLE, and section dividers are used across both pages.

These patterns were established during the GitHub-inspired homepage redesign (HP-1 through HP-15). They apply site-wide when building or redesigning pages with dark backgrounds.

### Section Heading — 2-Line Treatment

Use `SectionHeading` component from `src/components/homepage/SectionHeading.tsx`:

- **Top line:** `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`
- **Bottom line:** `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` with `WHITE_PURPLE_GRADIENT` via `background-clip: text` and `text-transparent`
- Size ratio: bottom line is ~1.5x larger than top line
- `mt-1` between lines (tight coupling)
- Props: `topLine`, `bottomLine`, `tagline?`, `align?`

### Glow Backgrounds — Visible Purple Spotlights

Radial glow orbs positioned behind content. MUST be clearly visible.

**Opacity ranges (center of radial gradient):**

- Standard sections: `0.25-0.35`
- Behind card grids: `0.35-0.40`
- CTA / emotional peaks: `0.45-0.50`
- **NEVER use `0.03-0.15`** — invisible on `bg-hero-bg`

**Implementation pattern:**

```
background: radial-gradient(circle, rgba(139,92,246, CENTER) 0%, rgba(139,92,246, MID) 40%, transparent 70%)
width: 400-900px, height: 300-600px
filter: blur(60-80px)
pointer-events: none, z-0 (content at z-10)
```

Two-stop gradient (center → mid → transparent) produces a richer glow pool than single-stop.

**Mobile:** Reduce orb size by 40% and blur by 25% below `md` breakpoint. Use `will-change: transform` for GPU compositing.

### Frosted Glass Cards

`FrostedCard` component (`src/components/homepage/FrostedCard.tsx`):

- Background: `bg-white/[0.06]` with `backdrop-blur-sm`
- Border: `border border-white/[0.12]` — visible, not invisible
- Shadow: `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
- Radius: `rounded-2xl`, Padding: `p-6`
- Hover (when interactive): `bg-white/[0.09] border-white/[0.18]` with intensified shadows

### Locked Preview Card Pattern

For showing auth-gated features to logged-out visitors:

- **Top:** Preview mockup area with `bg-hero-bg/50 backdrop-blur-[3px]` lock overlay. Lock icon only (no text).
- **Bottom:** Clear text area with icon (unique color per card) + title + description. Not behind blur.
- Border between areas: `border-b border-white/[0.06]`

### Section Dividers

Between every major homepage section:

```
<div className="border-t border-white/[0.08] max-w-6xl mx-auto" />
```

Content-width, not full-viewport. Subtle but visible.

### Journey Section Squiggles

The homepage `JourneySection` uses narrow inline SVG squiggles (~150px wide column, centered) — NOT the full-width `BackgroundSquiggle` component. The SVG uses `preserveAspectRatio="none"` to stretch vertically and a gradient mask to fade at top/bottom.

---

## Known Issues

- **Footer touch targets**: Crisis resource links and App Store badges (40px) undersized on mobile (44px minimum). Pre-existing.
- **Spotify embed loading**: May show fallback in headless/restricted environments.
- **Skeleton loading not wired**: 13 skeleton components built in `components/skeletons/` but only BibleReaderSkeleton is wired to Suspense. All other lazy routes use a generic `RouteLoadingFallback`. Round 3 quick win addresses this.
- **Music page theme break**: Music page uses light `bg-neutral-bg` background while the rest of the app uses dark theme. Creates a jarring transition from the dark dashboard/daily hub. Design-system intentional but noted for potential future alignment.
