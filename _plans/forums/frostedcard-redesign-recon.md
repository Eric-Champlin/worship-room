# FrostedCard Redesign — Recon Report

**Status:** Read-only recon. No source files modified.
**Branch:** forums-wave-continued
**Date:** 2026-04-30

---

## Section 1 — Existing primitives

### 1.1 The current FrostedCard component

**Path:** `frontend/src/components/homepage/FrostedCard.tsx`

```tsx
import { cn } from '@/lib/utils'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
}

export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
  tabIndex,
  role,
  onKeyDown,
}: FrostedCardProps) {
  const isInteractive = !!onClick

  return (
    <Component
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      onKeyDown={onKeyDown}
      className={cn(
        'bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6',
        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
        'transition-all motion-reduce:transition-none duration-base ease-decelerate',
        isInteractive && [
          'cursor-pointer',
          'hover:bg-white/[0.09] hover:border-white/[0.18]',
          'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
          'hover:-translate-y-0.5',
          'motion-reduce:hover:translate-y-0',
          'active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
```

**Tailwind classes used (base, all instances):**
- `bg-white/[0.06]` background
- `backdrop-blur-sm`
- `border border-white/[0.12]`
- `rounded-2xl p-6`
- `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` (dual box-shadow: violet glow + black drop)
- `transition-all motion-reduce:transition-none duration-base ease-decelerate`

**Interactive-only classes (when `onClick` is provided):**
- `cursor-pointer`
- `hover:bg-white/[0.09] hover:border-white/[0.18]`
- `hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]`
- `hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`
- `active:scale-[0.98]`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`

**Variants exposed via props:** None tier-wise. The component is a single visual treatment. Variation is achieved at call sites by:
- `as` switches the host element (`div` | `button` | `article`).
- `onClick` toggles interactive hover/focus styling.
- `className` merges arbitrary extra classes (callers use this to override `p-6`, add ring colors, add `border-l-4`, etc.).

There is no built-in `tier`, `variant`, `size`, or `featured` prop today.

### 1.2 Other "card-like" components in `frontend/src/components/`

Discovered via `grep -rn "rounded-2xl\|rounded-xl\|rounded-3xl"` across `bg-white/...backdrop-blur` patterns. The list below is the prominent set, not exhaustive — the codebase has many smaller frosted surfaces (modals, toasts, tooltips, popovers) that share the same idiom.

| Component | Path | What it does | Uses FrostedCard? |
|---|---|---|---|
| `Card.tsx` (deprecated) | `components/ui/Card.tsx` | Light-theme `bg-white` card with `CardHeader`/`CardTitle`/`CardContent`. Marked deprecated in `09-design-system.md`; zero documented production call sites. | No — rolls own |
| `DashboardCard.tsx` | `components/dashboard/DashboardCard.tsx` | Collapsible dark-theme widget card used by every dashboard widget. `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` | No — rolls own |
| `PrayerCard.tsx` | `components/prayer-wall/PrayerCard.tsx` | Single prayer feed item. `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20` | No — rolls own |
| `ListingCard.tsx` | `components/local-support/ListingCard.tsx` | Church/counselor/CR result card. Same class string as `PrayerCard.tsx`. | No — rolls own |
| `EchoCard.tsx` | `components/echoes/EchoCard.tsx` | BB-46 echo. `rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 sm:p-5 hover:bg-white/[0.08]` (visual near-twin of FrostedCard). | No — rolls own (close clone) |
| `InsightCards.tsx` | `components/insights/InsightCards.tsx` | Multiple inline `<div>` cards on `/insights`. `rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm` | No — rolls own |
| `MonthlyInsightCards.tsx` | `components/insights/MonthlyInsightCards.tsx` | Inline cards for `/insights/monthly`. Same pattern as `InsightCards`. | No — rolls own |
| `MonthlyStatCards.tsx` | `components/insights/MonthlyStatCards.tsx` | Stat tiles for monthly report. | No — rolls own |
| `SoundCard.tsx` | `components/audio/SoundCard.tsx` | Small 80–90px square button-like card. `rounded-xl` only — not frosted. | No — rolls own |
| `RoutineCard.tsx` | `components/music/RoutineCard.tsx` | Bedtime routine browse card. `rounded-xl` + glass. | No — rolls own |
| `SoundCard.tsx` (audio) | as above | — | — |
| `PlanCard.tsx` | `components/reading-plans/PlanCard.tsx` | Reading plan browse card. | No — rolls own |
| `PlanInProgressCard.tsx`, `PlanBrowseCard.tsx`, `PlanCompletedCard.tsx` | `components/bible/plans/*.tsx` | Three sibling Bible plan cards. | No — roll own (`backdrop-blur` matches FrostedCard) |
| `MilestoneCard.tsx`, `ActiveChallengeCard.tsx`, `UpcomingChallengeCard.tsx`, `NextChallengeCountdown.tsx` | `components/challenges/*.tsx` | Challenge cards. | No — roll own |
| `MemorizationFlipCard.tsx` | `components/memorize/MemorizationFlipCard.tsx` | BB-45 flip card. | No — rolls own |
| `PrayerItemCard.tsx` | `components/my-prayers/PrayerItemCard.tsx` | Personal prayer list card. | No — rolls own |
| `ActivityCard.tsx` | `components/bible/my-bible/ActivityCard.tsx` | My Bible activity feed item. | **Yes** — uses FrostedCard |
| `RelatedPlanCallout.tsx` | `components/devotional/RelatedPlanCallout.tsx` | Devotional inline plan callout. | No — rolls own |
| `LeaderboardTab.tsx` | `components/leaderboard/LeaderboardTab.tsx` | Friends/global leaderboard panel. | No — rolls own |
| `AnniversaryCard.tsx`, `WelcomeBack.tsx`, `InstallCard.tsx`, `GettingStartedCard.tsx`, `BadgeGrid.tsx` | `components/dashboard/*.tsx` | Dashboard auxiliary cards. | No — roll own (most use `DashboardCard` or rolls-own) |
| `ProfileStats.tsx` | `components/profile/ProfileStats.tsx` | GrowthProfile stat panel. | No — rolls own |
| `HallOfFame.tsx` | `components/challenges/HallOfFame.tsx` | Challenge hall-of-fame. | No — rolls own |

**Summary:** the canonical `FrostedCard` is one of at least **3 distinct dark-theme card idioms** in production:

1. `FrostedCard` — `bg-white/[0.06] border-white/[0.12] rounded-2xl p-6` + dual violet+black box-shadow.
2. Dashboard / Insights / generic widget — `bg-white/5 border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm` (no box-shadow).
3. Feed item — `bg-white/[0.06] border-white/10 rounded-xl p-5 sm:p-6 backdrop-blur-sm` + soft hover shadow on lg+ (PrayerCard, ListingCard).

The smaller `rounded-xl` "tile" idiom (SoundCard, MemorizationFlipCard, etc.) is a fourth distinct shape but at a different scale (square buttons, not content cards).

### 1.3 Existing "primary CTA button" patterns

The "primary action of a screen" has multiple flavors today. Verified via grep across components and pages.

| Pattern | Found in | className string (representative) |
|---|---|---|
| **White pill, large, white drop-shadow** (homepage primary CTA — `09-design-system.md` Pattern 2) | `homepage/FinalCTA.tsx:51`, `daily/PrayerInput.tsx:170`, `daily/JournalInput.tsx:341` | `rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]` |
| **White pill, with shine animation, primary text** | `ask/ConversionPrompt.tsx:26` | `animate-shine inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]` |
| **`<Button variant="primary">`** (canonical purple) | `components/ui/Button.tsx:50` | `bg-primary text-white hover:bg-primary-lt` + size + `rounded-md focus-visible:ring-primary` |
| **`<Button variant="light">`** (white pill, smaller) | `components/ui/Button.tsx:47` | `rounded-full bg-white text-primary hover:bg-gray-100 gap-2 font-semibold min-h-[44px]` (sm/md/lg padding variants) |
| **Glass CTA on hero** (Prayer Wall) | `pages/PrayerWall.tsx:646,662` | `rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-sm hover:bg-white/20` |
| **Inline white pill** (cross-feature CTAs inside cards — Pattern 1) | Many devotional / journal / pray inline links | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100` (per `09-design-system.md`) |

There is no `<button class="bg-gradient-to-r ...">` primary CTA in the production codebase. All `bg-gradient-to-*` instances are decorative (overlays, dividers, artwork drift, audio waveforms) — verified via grep. Headline gradient text uses `WHITE_PURPLE_GRADIENT` via `background-clip: text`, not a button background.

**How many flavors of "the main button":** Five (white-pill homepage primary, white-pill shine, `Button variant="primary"` purple, `Button variant="light"` white-pill smaller, glass-CTA Prayer Wall hero). The Round-3 design system pushes toward the white-pill family but `<Button variant="primary">` (purple) is still wired into many older surfaces.

### 1.4 Frontend design tokens

#### `frontend/tailwind.config.js` (color, spacing, animation extracts)

**Colors (every custom name in `theme.extend.colors`):**
```
primary           #6D28D9   (deep violet)
primary-lt        #8B5CF6   (lighter violet accent)
neutral-bg        #F5F5F5
text-dark         #2C3E50
text-light        #7F8C8D
success           #27AE60
warning           #F39C12
danger            #E74C3C
hero-dark         #0D0620
hero-mid          #1E0B3E
hero-deep         #251248
glow-cyan         #00D4FF   (legacy; deprecated for textareas)
muted-gray        #9CA3AF
subtle-gray       #6B7280
dark-border       #2a2040
hero-bg           #08051A   (darkest — homepage / Daily Hub root)
dashboard-dark    #0f0a1e
dashboard-gradient #1a0533
nav-text-dark     #2B0E4A
nav-hover-light   #F5F3FF
medal-gold        #FFD700
medal-silver      #C0C0C0
medal-bronze      #CD7F32
spotify-green     #1DB954
surface-dark      #1a0f2e
```

**Purple shades available:** Two custom names (`primary` `#6D28D9`, `primary-lt` `#8B5CF6`). All other "purple" used in the app is either Tailwind's default palette (`purple-500`, `purple-600`, `purple-800`, etc.) or rgba'd `#8B5CF6` literally embedded in `box-shadow` and `radial-gradient` strings. **There is no full violet ramp (50–900) in custom tokens.**

**Spacing:** No custom `spacing` extension. Uses default Tailwind spacing scale.

**Blur tokens:** No custom `backdropBlur` extension. The codebase uses Tailwind defaults: `backdrop-blur-sm` (4px), `backdrop-blur-md`, `backdrop-blur-xl`, etc. The `liquid-glass` utility in `index.css` hard-codes `backdrop-filter: blur(4px)`.

**Glow / shadow tokens:** No custom `boxShadow` extension. Every glow is an inline arbitrary-value shadow string (`shadow-[0_0_25px_rgba(139,92,246,0.06),...]`). This is a known surface for redesign — there is no `shadow-glow-sm`/`shadow-glow-md`/etc. token system.

**Animations:** Extensive — duration tokens `instant` (0ms), `fast` (150ms), `base` (250ms), `slow` (400ms); easing tokens `standard`, `decelerate`, `accelerate`, `sharp` (canonical from BB-33 — see `09-design-system.md` § "Animation Tokens"). 80+ keyframes registered (garden, audio, modal/drawer, breathing, celebration). FrostedCard uses `duration-base ease-decelerate`.

#### CSS custom properties

`frontend/src/index.css` defines:
- Body baseline: `html, body, #root { background-color: #08051A; }` (matches `hero-bg`).
- Three Bible reader theme blocks (`[data-reader-theme="midnight"|"parchment"|"sepia"]`) define `--reader-bg`, `--reader-text`, `--reader-verse-num`, `--reader-divider`, `--highlight-*` (5 highlight colors × 3 variants), `--bookmark-marker`, `--note-marker`. **Scoped to BibleReader chrome only.**
- `.liquid-glass` utility — alternative glass treatment with luminosity blend mode and gradient border mask. Not used by `FrostedCard`. Used by zero production surfaces I could find via grep — likely dead or rare.
- `.scroll-reveal*` — opacity/transform for scroll-triggered reveals.
- `.border-pulse-glow` — animated violet border (`rgba(139, 92, 246, 0.1) ↔ 0.25`).
- Per-class reduced-motion overrides for breathing, waveform, hero video, scroll-reveal, pulse-glow.
- Leaflet popup dark-theme overrides.
- `.scrollbar-hide` and `.dark-scrollbar` utilities.
- Two animation classes for the Register page Round 2: `.animate-gradient-shift` (12s cycle) and `.animate-shine` (6s loop, 2s delay).

`frontend/src/styles/animations.css` — global `prefers-reduced-motion: reduce` safety net + shimmer exemption + a focus-visible transition shim.

**Net:** there is no custom violet ramp, no glow-shadow token system, no spacing extension, no blur token. Almost all visual variety comes from arbitrary-value Tailwind classes inlined at call sites or reader-theme CSS variables scoped to the Bible reader.

### 1.5 Canonical "page background" treatment

How top-level pages set their background — verified via grep for the outer `<div>` className.

| Page | Outer className |
|---|---|
| `pages/Home.tsx:44` (logged-out landing) | `min-h-screen bg-neutral-bg font-sans` (the `Home` outer is `bg-neutral-bg` `#F5F5F5`, but every section inside is wrapped in `<div className="bg-hero-bg">` so the visible body color is still `hero-bg #08051A`. The `neutral-bg` only shows in margins / scrollbar overscroll.) |
| `pages/Dashboard.tsx:452` (logged-in `/`) | `min-h-screen bg-dashboard-dark` (`#0f0a1e`) |
| `pages/DailyHub.tsx:214` | `relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans` + `<HorizonGlow />` overlay |
| `pages/PrayerWall.tsx:630` | `flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans` |
| `pages/MusicPage.tsx:170` | `flex min-h-screen flex-col bg-dashboard-dark font-sans` |
| `pages/Settings.tsx:61` | `min-h-screen bg-dashboard-dark` |
| `pages/BibleReader.tsx` | Custom — uses `ReaderChrome` and a CSS-variable `--reader-bg` (different per theme), no `bg-hero-bg` class. Documented exception. |

**Rule today:** two inline body colors dominate. `bg-hero-bg` (`#08051A`) for the homepage shell + Daily Hub. `bg-dashboard-dark` (`#0f0a1e`) for the logged-in shell (Dashboard, Settings, PrayerWall, Music). The colors are 7-RGB-units apart — visually nearly indistinguishable, but functionally a fork. There is no shared "page shell" component; each page sets its own outer className.

`html`, `body`, `#root` all defaulted to `#08051A` in `index.css` to prevent route-transition white flash. PageTransition.tsx was removed in Wave 2.

---

## Section 2 — Inventory of FrostedCard consumers

### 2.1 Every file that imports `FrostedCard` (by `grep -rln "FrostedCard"`)

Files that import OR use the JSX tag (excluding tests):

**Pages (6):**
1. `pages/RegisterPage.tsx`
2. `pages/MyBiblePage.tsx`
3. `pages/BibleReader.tsx`
4. `pages/BiblePlanDetail.tsx`
5. `pages/ReadingPlans.tsx`
6. `pages/BiblePlanDay.tsx`

**Components (15):**
1. `components/StartingPointQuiz.tsx`
2. `components/homepage/DifferentiatorSection.tsx`
3. `components/homepage/DashboardPreview.tsx` (re-exports)
4. `components/daily/DevotionalTabContent.tsx`
5. `components/ask/PopularTopicsSection.tsx`
6. `components/ask/ConversionPrompt.tsx`
7. `components/ask/AskResponseDisplay.tsx`
8. `components/bible/my-bible/BibleSettingsModal.tsx`
9. `components/bible/my-bible/ActivityCard.tsx`
10. `components/bible/landing/QuickActionsRow.tsx`
11. `components/bible/landing/ResumeReadingCard.tsx`
12. `components/bible/landing/TodaysPlanCard.tsx`
13. `components/bible/landing/VerseOfTheDay.tsx`
14. `components/bible/landing/ActivePlanBanner.tsx`
15. `components/homepage/FrostedCard.tsx` (the source itself)
16. `components/homepage/index.ts` (barrel)

**Other (utility):**
- `constants/categoryColors.ts` — references the FrostedCard hover color string in a comment / lookup table.

**Test files (10) — listed for completeness, not redesign targets:**
- `components/homepage/__tests__/FrostedCard.test.tsx`
- `components/homepage/__tests__/DifferentiatorSection.test.tsx`
- `components/homepage/__tests__/DashboardPreview.test.tsx`
- `components/__tests__/StartingPointQuiz.test.tsx`
- `components/ask/__tests__/PopularTopicsSection.test.tsx`
- `components/ask/__tests__/ConversionPrompt.test.tsx`
- `components/daily/__tests__/DevotionalTabContent.test.tsx`
- `components/music/__tests__/SpotifyEmbed.test.tsx` (string assertion only)
- `components/reading-plans/__tests__/PlanCard.test.tsx` (string assertion only)
- `components/challenges/__tests__/UpcomingChallengeCard.test.tsx`, `NextChallengeCountdown.test.tsx`
- `pages/__tests__/DailyHub.test.tsx`, `pages/__tests__/AskPage.test.tsx`

### 2.2 Files that use the inline frosted-card class string pattern (`backdrop-blur` grep)

129 files in `frontend/src/` contain `backdrop-blur` (verified count). The full list is too long for this report — see `grep -rln "backdrop-blur" frontend/src/` for the raw list. Highlights of the **content-card-shaped** (not navbar / popover / drawer / toast) consumers below; everything in this list rolls its own classes rather than using `FrostedCard`:

**Dashboard surfaces (12):**
- `components/dashboard/DashboardCard.tsx`, `MoodRecommendations.tsx`, `BadgeGrid.tsx`, `GettingStartedCard.tsx`, `GettingStartedCelebration.tsx`, `WelcomeWizard.tsx`, `InstallCard.tsx`, `WelcomeBack.tsx`, `AnniversaryCard.tsx`, `CustomizePanel.tsx`, `NotificationPanel.tsx`, `CelebrationOverlay.tsx`

**Insights (12):**
- `components/insights/*` — `InsightCards.tsx`, `MonthlyInsightCards.tsx`, `MonthHeatmap.tsx`, `MonthlyStatCards.tsx`, `EmailPreviewModal.tsx`, `MoodTrendChart.tsx`, `ActivityCorrelations.tsx`, `ScriptureConnections.tsx`, `CommunityConnections.tsx`, `MeditationHistory.tsx`, `ActivityBarChart.tsx`, `MonthlyHighlights.tsx`, `PrayerLifeSection.tsx`, `GratitudeCorrelationCard.tsx`, `CalendarHeatmap.tsx`, `GratitudeStreak.tsx`

**Prayer Wall (6):**
- `prayer-wall/PrayerCard.tsx`, `InlineComposer.tsx`, `QotdComposer.tsx`, `QuestionOfTheDay.tsx`, `CategoryFilterBar.tsx`, `AuthModal.tsx`

**Settings (6 sections):**
- `settings/AppSection.tsx`, `ProfileSection.tsx`, `PrivacySection.tsx`, `DashboardSection.tsx`, `AccountSection.tsx`, `NotificationsSection.tsx`, `DeleteAccountModal.tsx`, `ChangePasswordModal.tsx`

**Daily Hub helpers (8):**
- `daily/AmbientSoundPill.tsx`, `DevotionalPreviewPanel.tsx`, `GuidedPrayerSection.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`, `PrayerResponse.tsx`, `SaveToPrayerListForm.tsx`, `SavedEntriesList.tsx`, `ShareButton.tsx`

**Bible reader / plans / my-bible (15+):**
- `bible/reader/ReaderChrome.tsx`, `bible/reader/NotificationPrompt.tsx`, `bible/reader/VerseJumpPill.tsx`, `bible/SleepTimerPanel.tsx`, `bible/BooksDrawerContent.tsx`, `bible/TestamentAccordion.tsx`, `bible/landing/VotdShareModal.tsx`, `bible/plans/{PlanInProgressCard,PlanBrowseCard,PlanCompletedCard}.tsx`, `bible/books/ChapterJumpOverlay.tsx`, `bible/my-bible/{MyBibleSearchInput,BookFilterSheet,ActivityActionMenu,ActivityFilterBar,ReadingHeatmap}.tsx`

**Music / audio (5):**
- `music/SpotifyEmbed.tsx`, `music/RoutineCard.tsx`, `audio/AudioPlayerSheet.tsx`, `audio/SoundCard.tsx`

**Challenges, reading plans, my-prayers, profile, ui, sharing (~20):**
- `challenges/{ActiveChallengeCard,UpcomingChallengeCard,NextChallengeCountdown,HallOfFame,ChallengeDayContent,ChallengeCompletionOverlay,MilestoneCard}.tsx`
- `reading-plans/{PlanCard,DayContent,PlanCompletionOverlay,CreatePlanFlow}.tsx`
- `my-prayers/{PrayerComposer,PrayerItemCard,EditPrayerForm,PrayerListActionBar,PrayerAnsweredCelebration,TestimonyShareActions}.tsx`
- `profile/ProfileStats.tsx`
- `ui/{Toast,WhisperToast,TooltipCallout,ConfirmDialog}.tsx`
- `sharing/SharePanel.tsx`
- `memorize/MemorizationFlipCard.tsx`
- `echoes/EchoCard.tsx`
- `local-support/ListingCard.tsx`
- `leaderboard/LeaderboardTab.tsx`
- `legal/TermsUpdateModal.tsx`
- `pwa/{InstallPrompt,UpdatePrompt,OfflineIndicator}.tsx`
- `onboarding/FirstRunWelcome.tsx`
- `dev/DevAuthToggle.tsx`
- `devotional/RelatedPlanCallout.tsx`

**Pages with inline backdrop-blur (not via FrostedCard) (5):**
- `Settings.tsx`, `Insights.tsx`, `MusicPage.tsx`, `MyBiblePage.tsx`, `DailyHub.tsx`

### 2.3 Consumer → page/feature mapping

| Consumer (FrostedCard usage) | Appears on |
|---|---|
| `homepage/DifferentiatorSection.tsx` | Home (landing) |
| `homepage/DashboardPreview.tsx` | Home (landing), RegisterPage |
| `homepage/FinalCTA.tsx` (uses GlowBackground, no FrostedCard) | Home, RegisterPage |
| `StartingPointQuiz.tsx` | Home (landing) |
| `RegisterPage.tsx` (5 direct uses) | `/register` |
| `daily/DevotionalTabContent.tsx` (3 direct uses — passage, body, question) | `/daily?tab=devotional` |
| `ask/PopularTopicsSection.tsx` | `/ask` |
| `ask/AskResponseDisplay.tsx` (2 uses — answer card + follow-up cards) | `/ask` |
| `ask/ConversionPrompt.tsx` | `/ask` (logged-out tail) |
| `bible/landing/ResumeReadingCard.tsx` | `/bible` (BibleLanding) |
| `bible/landing/TodaysPlanCard.tsx` | `/bible` |
| `bible/landing/VerseOfTheDay.tsx` (2 uses — VOTD + skeleton) | `/bible` |
| `bible/landing/ActivePlanBanner.tsx` | `/bible` |
| `bible/landing/QuickActionsRow.tsx` (3 uses — three action tiles) | `/bible` |
| `bible/my-bible/ActivityCard.tsx` | `/bible/my` |
| `bible/my-bible/BibleSettingsModal.tsx` | BibleReader settings drawer |
| `BibleReader.tsx` (7 uses) | `/bible/:book/:chapter` |
| `MyBiblePage.tsx` (3 uses) | `/bible/my` |
| `BiblePlanDetail.tsx` (3 uses) | `/bible/plans/:planId` |
| `BiblePlanDay.tsx` (7 uses) | `/bible/plans/:planId/day/:dayNumber` (or similar) |
| `ReadingPlans.tsx` (1 use) | `/reading-plans` (legacy redirect → `/grow?tab=plans`) |

**FrostedCard surfaces today:** Home (landing), RegisterPage, DailyHub Devotional tab, AskPage, BibleLanding, MyBible, BibleReader, BiblePlan{Detail,Day}, ReadingPlans. Every other major page (Dashboard, PrayerWall, Settings, Insights, MusicPage, GrowPage, Friends, MyPrayers, local support, profile) uses rolls-its-own card classes.

---

## Section 3 — Visual hierarchy today

| Page | Visible card tiers | Achieved via | Page background |
|---|---|---|---|
| **Home** (`/`) | ~2 — section "feature card" (Differentiator, DashboardPreview, FrostedCard), and within DashboardPreview a "locked preview" sub-card with blur overlay. | Same `FrostedCard` everywhere; DashboardPreview hand-builds the lock overlay variant. | Outer `bg-neutral-bg`, but every section visually `bg-hero-bg #08051A` via inner wrapper divs. GlowBackground orbs per section (homepage). |
| **Dashboard** (`/`) | ~2 — `DashboardCard` (frosted widget), plus inline tiles inside (e.g., StreakCard, BadgeGrid items use lighter `bg-white/5`). | All rolls-own. No `FrostedCard`. | Flat `bg-dashboard-dark #0f0a1e`. No glow layer. `DashboardHero` adds a vertical gradient `from-dashboard-gradient to-dashboard-dark`. |
| **DailyHub** (`/daily`) | ~2 explicit tiers. `DevotionalTabContent` documents these as "Tier 1 = primary reading" (FrostedCard with `text-white leading-[1.75]`) and "Tier 2 = scripture callout" (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` — a hand-built card not using FrostedCard). | FrostedCard for Tier 1; inline class string for Tier 2. | `bg-hero-bg` + `<HorizonGlow />` 5-orb atmospheric layer. No GlowBackground per section. |
| **PrayerWall** (`/prayer-wall`) | 2 — hero glass-CTA buttons, then a flat feed of `PrayerCard` items. No featured-vs-standard tiering. | All rolls-own (`PrayerCard.tsx`). | `bg-dashboard-dark`, `PageHero` gradient header, then flat dark below. |
| **MusicPage** (`/music`) | 2–3 — `FeaturedSceneCard` (gradient-overlay artwork card), regular `SceneCard`, small `SoundCard` tiles. | All rolls-own. No `FrostedCard`. | `bg-dashboard-dark`. |
| **BibleLanding** (`/bible`) | 3 effective tiers — "featured" (VOTD, ResumeReading), "standard" (TodaysPlan, ActivePlanBanner), "nested mini" (QuickActionsRow's 3 small action tiles). | All consumers wrap a single `FrostedCard`. The tier difference is communicated through size/padding overrides via `className`, not a `tier` prop. | `bg-hero-bg` outer (`pages/BibleLanding.tsx:141`). |
| **BibleReader** (`/bible/:book/:chapter`) | Multiple — reader chrome (its own surface), AI Explain/Reflect panels (FrostedCard), various drawer panels. | Mix of `FrostedCard` (7 inline uses) and rolls-own (`ReaderChrome`, drawer interior). | Custom — CSS variable `--reader-bg` driven by `data-reader-theme`. |
| **MyBible** (`/bible/my`) | 2 — section card (FrostedCard wraps each section: heatmap, progress map, deck, activity feed), then per-item `ActivityCard` (also FrostedCard). | Same FrostedCard, two scales of usage. | `bg-hero-bg`. |
| **Settings** (`/settings`) | 1 — flat repeating "section panel" `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl`. | All rolls-own. No `FrostedCard`. | `bg-dashboard-dark`. |

**Net:** the codebase has no formal tier API. Where tiers exist (Daily Hub Devotional, BibleLanding), they are achieved by mixing `FrostedCard` with hand-built `border-l-4` callouts or by overriding size/padding via `className`. Pages outside the Round-3 redesign cluster (Dashboard, Settings, PrayerWall, MusicPage, Insights) don't use `FrostedCard` at all and have a flat single-tier card aesthetic.

---

## Section 4 — Smallest feasible pilot surface

### Recommendation: **`/ask` (AskPage)**

**Why:**
- Visually contained — not the user's first impression. Reached intentionally from navbar or quiz result.
- Three FrostedCard consumer files, totaling 5 visible card slots on a typical page render: AI response card (featured), follow-up suggestion cards (standard), Popular Topics (standard, repeated), Conversion Prompt (CTA-card variant for logged-out users).
- Has both a "featured" card (the streamed AI response) and "standard" cards (popular topics, follow-ups), so multiple tiers can be exercised.
- Low blast radius — single route, not a high-traffic shell page. If the redesign needs iteration, only AskPage users see it.
- Touches a small number of files (5 total: 3 components + 1 page + 1 test fixture).

**Card count:** ~5 distinct card slots. With multiple popular topics rendered, the page can hold 8–12 cards total on screen, but they fall into 4 visual roles (featured response, standard answer follow-up, standard topic chip-card, CTA card).

**Files that would change:**
1. `frontend/src/components/ask/AskResponseDisplay.tsx` — 2 `FrostedCard` uses (response card + follow-up cards)
2. `frontend/src/components/ask/PopularTopicsSection.tsx` — 1 `FrostedCard` use (per topic, in a `.map()`)
3. `frontend/src/components/ask/ConversionPrompt.tsx` — 1 `FrostedCard` use
4. `frontend/src/pages/AskPage.tsx` — orchestrator; outer container + chat scrollback
5. `frontend/src/components/ask/UserQuestionBubble.tsx` — sibling chat bubble, may want matching treatment (rolls own today)

Test files that would need updating if class strings change: `components/ask/__tests__/{PopularTopicsSection,ConversionPrompt,UserQuestionBubble}.test.tsx`, `pages/__tests__/AskPage.test.tsx`.

### Runner-up candidate: **BibleLanding (`/bible`)**

Slightly larger but already exhibits 3 tiers:
- 5 FrostedCard consumer components (`ResumeReadingCard`, `TodaysPlanCard`, `VerseOfTheDay`, `ActivePlanBanner`, `QuickActionsRow`) + 1 page (`BibleLanding.tsx`).
- Featured cards: `VerseOfTheDay`, `ResumeReadingCard`. Standard: `TodaysPlanCard`, `ActivePlanBanner`. Nested mini: 3 tiles inside `QuickActionsRow`.
- ~7 cards visible; mostly above-the-fold.
- Logged-in/logged-out parity is good (everything is unauthenticated).
- Risk: the page is the entry point to the Bible feature, and the Bible wave just shipped — slightly higher visibility than `/ask`.

### Runner-up candidate: **DailyHub Devotional tab**

Already has the documented Tier 1 / Tier 2 system. Only one component file (`DevotionalTabContent.tsx`) with 3 FrostedCard uses + 1 hand-built scripture callout. Smaller than `/ask` in file count but the surface is core to daily use, so iteration risk is higher.

### Pages explicitly **not recommended** for a pilot

- **Home / landing** — first impression; high blast radius.
- **Dashboard** — every logged-in user sees it; uses `DashboardCard` (rolls own, not `FrostedCard`), so a `FrostedCard` redesign wouldn't even cascade until you migrate consumers.
- **PrayerWall, Settings, Insights, MusicPage** — these don't currently use `FrostedCard`. A `FrostedCard` redesign that doesn't migrate them leaves them visually disjoint from the redesigned cluster.

---

## Section 5 — Risks and gotchas

### 5.1 Visual snapshot tests

**No image-snapshot or `toHaveScreenshot` tests exist** in the codebase. Verified via:
- `grep -rln "toMatchSnapshot\|toMatchImageSnapshot" frontend/src frontend/e2e frontend/tests` → 0 matches.
- `grep -ln "toHaveScreenshot" frontend/e2e/*.ts` → 0 matches.

Three Playwright spec files DO save PNGs to disk for human review (`spec-1-9b-captures.spec.ts`, `spec-1-9-auth-flow.spec.ts`, `full-site-audit.spec.ts`), but they call `page.screenshot({ path })` without comparing against a baseline. They produce ~34 PNGs in `frontend/playwright-screenshots/` (dashboard, profile, prayer wall variants across 6 viewport sizes, plus 1-9b and audit subdirectories). Re-running them generates new files; nothing fails. **These will not auto-detect a redesign — but a reviewer comparing PNGs by eye will notice.**

**However, the FrostedCard component has class-string assertions** in its unit test (`components/homepage/__tests__/FrostedCard.test.tsx`). The test asserts the presence of:
- `bg-white/[0.06]`
- `border-white/[0.12]`
- `shadow-[0_0_25px` (substring match)
- `hover:border-white/[0.18]` (interactive)
- `hover:shadow-[0_0_35px` (interactive)
- `cursor-pointer` (interactive)

If the redesign changes any of these literal strings, this test fails. Update the test alongside.

Other consumer test files with potential class-string assertions: `DifferentiatorSection.test.tsx`, `DashboardPreview.test.tsx`, `StartingPointQuiz.test.tsx`, `PopularTopicsSection.test.tsx`, `ConversionPrompt.test.tsx`, `DevotionalTabContent.test.tsx`, `AskPage.test.tsx`, `DailyHub.test.tsx`, `PlanCard.test.tsx`, `SpotifyEmbed.test.tsx`, `UpcomingChallengeCard.test.tsx`, `NextChallengeCountdown.test.tsx`, `SongPickSection.test.tsx`, `SeasonalBanner.test.tsx`, `Toast.test.tsx`, `AuthModal.test.tsx`, `UserQuestionBubble.test.tsx`, `GratitudeCorrelationCard.test.tsx`, `FirstRunWelcome.test.tsx`. These should be opened during pilot work to see whether they assert the changed classes.

### 5.2 Accessibility considerations to preserve

- **`as` polymorphism.** Today FrostedCard switches between `div`, `button`, `article`. Consumers rely on this — `BibleSettingsModal`, `ActivityCard`, `VerseOfTheDay`, `TodaysPlanCard`, `QuickActionsRow` use `as="article"`; `StartingPointQuiz` and several others use `as="button"`. Any new component must keep `as` (or equivalent) so it produces correct semantic elements.
- **Native interactive semantics.** When `as="button"` and `onClick` is set, native button keyboard handling (Enter/Space) is free. When `as="div"` + `onClick` + `tabIndex` + `role="button"` + `onKeyDown` is the pattern (which several call sites use), the redesign must preserve all four props. Removing `tabIndex`, `role`, or `onKeyDown` from the prop API would silently regress keyboard accessibility on every `div` interactive consumer.
- **`focus-visible:ring-2 focus-visible:ring-white/50`** is the focus indicator today. There is no ring-offset, which is unusual. If the redesign removes the focus ring without a replacement, every interactive FrostedCard becomes keyboard-invisible.
- **`active:scale-[0.98]`** is the BB-33 canonical press feedback. Removing it loses press affordance, which `09-design-system.md` calls out as the canonical pattern for ~30 CTAs.
- **`motion-reduce:hover:translate-y-0`** is the reduced-motion safety net for the hover lift. Keep an equivalent.
- **Color contrast.** The base background `bg-white/[0.06]` over `#08051A` produces an effective surface around `#1B1730`. Any redesign that increases opacity beyond ~`0.12` will start affecting body-text contrast assumptions used elsewhere in the design system. The 4.5:1 floor for body text is the constraint.

### 5.3 Other things worth flagging

1. **There is no glow / shadow token system.** Every FrostedCard glow string is inline (`shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`). A redesign that introduces a tier system across the app will benefit from extracting these to `tailwind.config.js` `boxShadow` tokens (e.g., `shadow-frosted-base`, `shadow-frosted-hover`, `shadow-frosted-featured`). Doing this in the same wave reduces drift across consumers.

2. **There is no violet ramp.** Tokens are `primary` (`#6D28D9`) and `primary-lt` (`#8B5CF6`). The dual box-shadow embeds `rgba(139, 92, 246, 0.06)` literally, not via token. A tier system that wants three glow intensities will need ~3 token slots.

3. **Drift between rolls-own card idioms.** `DashboardCard` uses `bg-white/5 border-white/10`; `PrayerCard` uses `bg-white/[0.06] border-white/10`; `FrostedCard` uses `bg-white/[0.06] border-white/[0.12]`; `EchoCard` is a hand-built FrostedCard near-clone. A FrostedCard redesign that doesn't also migrate these consumers will visually fork the app further. Consider whether the redesign spec is "redesign FrostedCard" or "redesign FrostedCard and migrate the rolls-own cards to use it." The latter is multiple times the work but produces visual consistency.

4. **Two body backgrounds (`bg-hero-bg` vs `bg-dashboard-dark`).** They are visually nearly identical (both very dark purple-black) but functionally split. A FrostedCard redesigned for `#08051A` will look slightly different on `#0f0a1e`. Verify on both backgrounds during the pilot.

5. **`liquid-glass` utility exists but appears unused.** `frontend/src/index.css:154-178` defines a sophisticated alternative glass treatment with luminosity blend mode and a gradient border via mask-composite. Worth knowing it's there — could be the basis of a featured-tier, or could be deleted. Grep showed no production consumers.

6. **`border-pulse-glow` keyframe is defined in `index.css` but registered nowhere in tailwind.config.** Likely also unused or undocumented; verify before relying on it for a redesigned hover state.

7. **The `category color` constants reference card classes.** `frontend/src/constants/categoryColors.ts` (per the grep result) references FrostedCard idioms — worth scanning briefly during the pilot to see if it embeds class strings that would also need updating.

8. **AskPage uses `mb-8` between FrostedCards.** If the redesign changes outer card spacing or shadow extent, the visual gap between cards on AskPage will change perceptibly. Just a note for visual review during the pilot.

9. **Daily Hub Devotional Tier 2 is hand-built**, not a `FrostedCard` variant. If the redesign introduces a real tier API (`<FrostedCard tier="callout" border="left">`), the Devotional tab is the obvious next migration target after the pilot — and `09-design-system.md` § "FrostedCard Tier System" already documents the contract.

10. **No Storybook or visual baseline tooling.** Pilot review will be eyes-on-screen + Playwright for runtime verification + manual screenshot comparison. Plan reviewer time accordingly.

---

## What I cut for length

- The full per-file Tailwind class string for every `backdrop-blur` consumer (129 files). Section 2.2 lists the components by feature area; pull the actual class strings via `grep -n "rounded.*bg-white" <file>` during implementation.
- Per-page card screenshots / dimensions. Use `/verify-with-playwright` during the pilot.
- The full text of `Card.tsx` (deprecated, ~36 lines).
- The full Tailwind `keyframes` block (88 keyframes) — already in `tailwind.config.js`; only the duration/easing tokens are relevant to a card redesign.
- A line-by-line walk through every FrostedCard consumer's `className` overrides — this is best done at pilot time when designing the new prop API, not at recon time.
