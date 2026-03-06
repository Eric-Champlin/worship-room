---
paths: ["frontend/**"]
---

## Design System & Component Architecture

This file is the comprehensive design reference for UI implementation. It covers the color palette, typography, component inventory, custom hooks, and utility libraries.

### Color Palette

- **Primary**: `#6D28D9` (deep violet) — Tailwind: `primary`
- **Primary Light**: `#8B5CF6` (lighter violet accent) — Tailwind: `primary-lt`
- **Hero Dark**: `#0D0620` (dark purple for hero gradient) — Tailwind: `hero-dark`
- **Hero Mid**: `#1E0B3E` — Tailwind: `hero-mid`
- **Hero Deep**: `#251248` — Tailwind: `hero-deep`
- **Glow Cyan**: `#00D4FF` (cyan for input glow effects) — Tailwind: `glow-cyan`
- **Neutral Background**: `#F5F5F5` (warm off-white) — Tailwind: `neutral-bg`
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue) — Tailwind: `text-dark`
- **Text Light**: `#7F8C8D` (medium gray) — Tailwind: `text-light`
- **Success**: `#27AE60` (green for positive moods) — Tailwind: `success`
- **Warning**: `#F39C12` (orange for neutral moods) — Tailwind: `warning`
- **Danger**: `#E74C3C` (red for negative moods/flags) — Tailwind: `danger`
- **Borders**: `#2a2040` — Tailwind: `dark-border`, `#9CA3AF` — Tailwind: `muted-gray`, `#6B7280` — Tailwind: `subtle-gray`

### Typography

- **Body Font**: Inter (sans-serif) — Tailwind: `font-sans`
  - Regular: 400, Medium: 500, Semi-bold: 600, Bold: 700
- **Scripture Font**: Lora (serif) — Tailwind: `font-serif`
  - Regular: 400, Italic: 400 italic, Bold: 700
- **Decorative Font**: Caveat (cursive) — Tailwind: `font-script`
  - Used for script emphasis in headings ("Heart?", "Mind?", "Spirit?") and branding
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

---

## Shared Components

### Layout Components

- **Layout.tsx** — Wrapper: `<Navbar>` + content + `<SiteFooter>`. Passes `transparent` prop on landing page.
- **Navbar.tsx** — Glassmorphic navigation. Desktop: dropdown panels. Mobile: hamburger drawer (`MobileDrawer`). `transparent` prop controls absolute vs relative positioning (visual style is always glassmorphic dark gradient).
- **SiteFooter.tsx** — Dark purple footer. Nav columns (Daily, Music, Support), crisis resources, app download badges (Coming Soon), "Listen on Spotify" badge, copyright.

### Design System Components

- **PageHero.tsx** — Purple gradient header with title, subtitle, optional `HeadingDivider`. Used by Prayer Wall, Local Support pages.
- **HeadingDivider.tsx** — White decorative SVG divider (short lines → dots → center line → dots → short lines) with fade gradients. Responsive via `useElementWidth()`.
- **BackgroundSquiggle.tsx** — Decorative SVG squiggle. Exported `SQUIGGLE_MASK_STYLE` for consistent fade mask. Used by all 3 Daily Hub tabs.
- **SongPickSection.tsx** — Spotify iframe embed (352px height) + "Follow Our Playlist on Spotify" button. Track ID rotated by day-of-year from the Worship Room playlist.
- **HeroSection.tsx** — Landing page hero: dark purple gradient, typewriter input, quiz teaser link.
- **JourneySection.tsx** — 6-step vertical timeline (Pray → Journal → Meditate → Music → Prayer Wall → Local Support).
- **GrowthTeasersSection.tsx** — 3 blurred preview cards (Mood Insights, Streaks, Leaderboard) with lock icons.
- **StartingPointQuiz.tsx** — 5-question points-based quiz with result card. `id="quiz"` for scroll target.
- **TypewriterInput.tsx** — Hero input with typewriter placeholder animation.
- **SpotifyBadge.tsx** — "Listen on Spotify" badge link to the Worship Room playlist.

### Daily Experience Components (`components/daily/`)

- **PrayTabContent.tsx** — Full Pray tab: textarea with chips, crisis banner, mock prayer generation, KaraokeText, Copy/ReadAloud/Save/Share buttons, "Journal about this" cross-tab CTA. Classic Prayers section hidden behind `false` guard.
- **JournalTabContent.tsx** — Full Journal tab: Guided/Free Write toggle, Lora italic prompt card with refresh, draft auto-save to localStorage, crisis banner, saved entries list, AI reflection, "Done journaling" flow.
- **MeditateTabContent.tsx** — Full Meditate tab: 6 auth-gated meditation cards in 2-col grid, completion checkmarks, all-6-complete celebration banner.
- **MiniHubCards.tsx** — Small cards linking to Pray/Journal/Meditate with completion badges.
- **ReadAloudButton.tsx** — TTS playback via browser Speech Synthesis API, word-index tracking for karaoke highlighting.
- **KaraokeText.tsx** — Splits text into word `<span>`s, highlights current word during Read Aloud.
- **ShareButton.tsx** — Web Share API with fallback dropdown (copy link, email, SMS, Facebook, X).
- **CompletionScreen.tsx** — Celebration screen when meditation practice completes (chime, golden glow).
- **CrisisBanner.tsx** — Checks text against `SELF_HARM_KEYWORDS` from `constants/crisis-resources.ts`, shows crisis resources alert banner with `role="alert"`.

### Prayer Wall Components (`components/prayer-wall/`)

- **PrayerWallHero.tsx** — Hero section for prayer wall page.
- **PrayerCard.tsx** — Individual prayer card with interactions.
- **InlineComposer.tsx** — Text input for new prayer posts.
- **CommentInput.tsx** / **CommentItem.tsx** / **CommentsSection.tsx** — Comment system.
- **InteractionBar.tsx** — Like/reaction, bookmark, share buttons.
- **Avatar.tsx** — User avatar circle.
- **AnsweredBadge.tsx** — Badge for answered prayers.
- **ShareDropdown.tsx** — Share menu for prayer cards.
- **ReportDialog.tsx** / **DeletePrayerDialog.tsx** / **MarkAsAnsweredForm.tsx** — Modals and forms.
- **PageShell.tsx** — Reusable page wrapper.
- **AuthModal.tsx** / **AuthModalProvider.tsx** — Auth prompt modal with `useAuthModal()` context. UI shell only (Phase 3 for real auth).

### Local Support Components (`components/local-support/`)

- **LocalSupportPage.tsx** — Reusable page layout for all 3 locators.
- **LocalSupportHero.tsx** — Hero section with auth-gated search CTA.
- **SearchControls.tsx** — Search input and filters.
- **ResultsList.tsx** / **ResultsMap.tsx** — List and Leaflet map views.
- **ListingCard.tsx** / **ListingShareDropdown.tsx** — Individual listing display.
- **SearchStates.tsx** — Loading, empty, error state displays.

### UI Components (`components/ui/`)

- **Toast.tsx** — Toast notification system with `ToastProvider` context and `useToast()` hook.
- **Card.tsx** — Basic card wrapper.
- **Button.tsx** — Reusable button component.

---

## Custom Hooks (`hooks/`)

- **useAuth()** — Returns `{ user, isLoggedIn }`. Placeholder returning `{ user: null, isLoggedIn: false }` until Phase 3.
- **useCompletionTracking()** — Daily practice completion per session. localStorage with date-based reset. Returns `isPrayComplete`, `isJournalComplete`, `completedMeditationTypes`, and mark methods.
- **useReadAloud()** — Browser Speech Synthesis TTS. Play/pause/resume/stop, word index tracking for KaraokeText.
- **useInView()** — Intersection Observer for lazy animations. Respects `prefers-reduced-motion`. Generic `<T extends HTMLElement>`.
- **useFocusTrap()** — Keyboard focus trapping for modals. Tab/Shift+Tab wrapping, Escape key. Restores previous focus on unmount.
- **useOpenSet()** — Manages a Set of open item IDs. Provides `toggle(id)` for expand/collapse patterns.
- **usePrayerReactions()** — Prayer Wall reaction state (praying/bookmarked). Loads from mock data.
- **useElementWidth()** — ResizeObserver for responsive width measurement.

---

## Utility Libraries (`lib/`)

- **utils.ts** — `cn()` classname utility (clsx + tailwind-merge).
- **query-client.ts** — React Query client (5-min staleTime, refetchOnWindowFocus disabled).
- **time.ts** — `timeAgo()` relative time, `formatFullDate()` date formatting.
- **geo.ts** — `calculateDistanceMiles()` Haversine formula (3959 mi Earth radius).
- **audio.ts** — `playChime()` Web Audio API 528 Hz sine wave with 0.5s envelope.

---

## Constants (`constants/`)

- **crisis-resources.ts** — `CRISIS_RESOURCES` object (988, Crisis Text Line, SAMHSA), `SELF_HARM_KEYWORDS` array, `containsCrisisKeyword(text)` function.
- **daily-experience.ts** — `DAILY_COMPLETION_KEY`, `JOURNAL_DRAFT_KEY`, `JOURNAL_MODE_KEY`, `SPOTIFY_PLAYLIST_URL`, `MEDITATION_TYPES` (6 types with metadata), `DEFAULT_PRAYER_CHIPS` (3 starter chips), breathing phases (4-7-8), duration options.

## Types (`types/`)

- **daily-experience.ts** — `DailyVerse`, `DailySong`, `MockPrayer`, `ClassicPrayer`, `JournalPrompt`, `JournalReflection`, `MeditationType`, `DailyCompletion`, `JournalMode`, `SavedJournalEntry`, `PrayContext`.
- **prayer-wall.ts** — `PrayerWallUser`, `PrayerRequest`, `PrayerComment`, `PrayerReaction`.
- **local-support.ts** — `LocalSupportPlace`, `SearchParams`, `SearchResult`, `SortOption`.

## Mock Data (`mocks/`)

- **daily-experience-mock-data.ts** — 30 daily verses (WEB translation), songs, prayers, journal prompts, reflections, gratitude affirmations, ACTS steps, examen steps.
- **daily-experience-psalms.ts** — 10 Psalms (23, 27, 34, 42, 46, 63, 91, 119, 121, 139) with full verses, intros, historical context. Full Psalm 119 acrostic sections.
- **prayer-wall-mock-data.ts** — 10 mock users, 18+ prayer requests, comments, reactions.
- **local-support-mock-data.ts** — Churches, counselors, celebrate-recovery locations near Columbia, TN.
