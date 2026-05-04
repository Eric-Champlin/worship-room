I have enough material. Let me now compose the comprehensive recon report.

---

# Worship Room — Dashboard Page Recon Report

**Generated:** 2026-05-04
**Branch:** forums-wave-continued
**Scope:** Pre-spec reconnaissance for Dashboard visual migration. **No code changes made.**

---

## Part 1 — Page-Level Architecture

### Component file path

- **Page component:** `/Users/eric.champlin/worship-room/frontend/src/pages/Dashboard.tsx` (644 LOC; the largest single page on the project after BibleReader and DailyHub).
- **Skeleton:** `/Users/eric.champlin/worship-room/frontend/src/components/skeletons/DashboardSkeleton.tsx`.

### Routes that render it

Dashboard is mounted at exactly **one route**: `/`.

`App.tsx` renders `RootRoute` for `/`:

```tsx
// App.tsx line 167-170
function RootRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Dashboard /> : <Home />
}
```

`/` is wrapped in:

```tsx
// App.tsx line 238
<Route path="/" element={<RouteErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RootRoute /></Suspense></RouteErrorBoundary>} />
```

**There is NO `/dashboard` route.** Dashboard is `/` only. This is a documented Phase 2.75 design decision — see `10-ux-flows.md` § "Dashboard UX Flow".

### Top-level structure

Dashboard does **NOT** use `Layout.tsx`, `BackgroundCanvas`, `GlowBackground`, or `HorizonGlow`. It uses a **plain root div** with `bg-dashboard-dark`:

```tsx
// Dashboard.tsx line 452
<div className="min-h-screen bg-dashboard-dark">
  <SEO {...HOME_METADATA} />
  <Navbar transparent />
  <main id="main-content" className="motion-safe:animate-fade-in motion-reduce:animate-none">
    {/* hero, echo, god moments, widget grid */}
  </main>
  {/* Tooltip, customize panel, footer, overlays, dev toggle */}
  <SiteFooter />
</div>
```

- **Background color:** `bg-dashboard-dark` (custom Tailwind alias = `#0f0a1e`). The hero adds a gradient `from-dashboard-gradient to-dashboard-dark` (DashboardHero.tsx:97).
- **No HorizonGlow, no GlowBackground.** The Dashboard is the only major logged-in page that does **not** use either of the Round 3 atmospheric layers. It's a flat dark surface.
- **Hero zone:** `<DashboardHero>` section is `pt-24 pb-6 md:pt-28 md:pb-8` with inner `mx-auto max-w-6xl px-4 sm:px-6`. Contains gardenSlot + greeting + status strip.
- **Echo & God Moments rows:** Mounted between hero and grid, each in its own `mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6` wrapper.
- **Content grid:** `DashboardWidgetGrid` renders inside `mx-auto max-w-6xl px-4 pb-8 sm:px-6` with grid `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5` (DashboardWidgetGrid.tsx:357). Five-column grid; widgets declare `lg:col-span-2`, `lg:col-span-3`, or `lg:col-span-5` per `WIDGET_DEFINITIONS`.
- **Responsive breakpoints:** `lg:` (1024px+) is the desktop breakpoint where the 5-col grid takes effect. Below `lg`, single column.
- **Order via CSS `order` property:** `DashboardWidgetGrid` writes `style={{ order: index }}` on every widget. The `useDashboardLayout` hook returns `orderedWidgets` and the visual order comes from CSS `order`, not JSX position. `<InstallCard>` is hardcoded `style={{ order: 9999 }}` (DashboardWidgetGrid.tsx:359) so it always lands last.

### Authentication behavior

Dashboard has a **6-phase state machine** (`DashboardPhase` type, line 62):

```ts
type DashboardPhase = 'onboarding' | 'welcome_back' | 'check_in' | 'recommendations' | 'dashboard_enter' | 'dashboard'
```

| Phase | Trigger | What renders |
|---|---|---|
| `onboarding` | `!isOnboardingComplete()` | `<WelcomeWizard>` (4-screen wizard, full-screen) |
| `welcome_back` | Returning user, mood not yet checked, `shouldShowWelcomeBack()` true | `<WelcomeBack>` (full-screen) |
| `check_in` | Onboarding done, no mood today | `<MoodCheckIn>` (full-screen — 5 mood orbs, optional textarea, encouragement verse) |
| `recommendations` | After check_in, `lastMoodEntry` set, `!prefersReduced` | `<MoodRecommendations>` (full-screen, 3-second auto-advance) |
| `dashboard_enter` | After recommendations | Dashboard, animating entrance (`animateEntrance=true`) |
| `dashboard` | Default for returning users with mood already recorded today; or after `dashboard_enter` settles after 800ms | Full dashboard render |

**Logged-out behavior:** Dashboard is never reached when logged out. `RootRoute` swaps to `<Home />`. Dashboard returns `null` if `!user` (line 388).

**New logged-in user:** Hits `onboarding` first (WelcomeWizard) → `welcome_back`/`check_in` → eventually full dashboard. Most empty states render in widgets (e.g., MoodChart shows `<MoodChartEmptyState>`, FriendsPreview shows CircleNetwork SVG + invite CTA, PrayerListWidget shows "Start your prayer list", RecentHighlightsWidget shows BookOpen icon + "Open Bible >").

**Returning user with history:** Skips onboarding; depending on welcome-back/mood checkin state, may go straight to `dashboard`.

**First-time vs. subsequent rendering:** `hasAnimatedRef` (line 76) guards `animateEntrance`. The garden sparkle + level-up animation only fires when `faithPoints.totalPoints` increases between renders. The `wr_first_run_completed` localStorage flag (BB-34) is **NOT** consumed by Dashboard — it's only consumed by `Home.tsx` (logged-out landing page) since first-run welcome never appears for authenticated users on `/`.

---

## Part 2 — Section-by-Section Inventory (render order)

The Dashboard renders the following blocks in source order. The **widget grid is reorder-capable via CSS `order`** so absolute visual order depends on `getTimeOfDay()` + user customization. The TIME_OF_DAY_ORDERS config in `constants/dashboard/widget-order.ts` gives 4 different default orderings (morning/afternoon/evening/night).

### Always-mounted overlays (outside `<main>`)

| Section | Component | File | Render conditions | Visual treatment | Padding | Position | Interactive | States | Data hook |
|---|---|---|---|---|---|---|---|---|---|
| SEO meta | `<SEO>` | `components/SEO.tsx` | always | (head only) | n/a | `<head>` | none | n/a | constants |
| Navbar | `<Navbar transparent />` | `components/Navbar.tsx` | always | glassmorphic, transparent prop ⇒ absolute positioning over hero | n/a | top, fixed | dropdown menus + bell + avatar dropdown | open/closed | useAuth, useNotifications |
| TooltipCallout | `<TooltipCallout>` (`dashboard-quick-actions`) | `components/ui/TooltipCallout.tsx` | `quickActionsTooltip.shouldShow` from `useTooltipCallout` | floating tooltip pinned to QuickActions section | hardcoded position | absolute | dismiss button | shouldShow / dismissed | useTooltipCallout (consumes `wr_tooltips_seen`) |
| CustomizePanel | `<CustomizePanel>` | `components/dashboard/CustomizePanel.tsx` | `customizePanelOpen` (from URL `?customize=true` or button) | `bg-hero-mid/95 backdrop-blur-xl` right side flyout / mobile bottom sheet | `px-4 py-2` | desktop right, mobile bottom | drag-reorder, toggle visibility, reset | open/closed | useDashboardLayout, useDragReorder |
| SiteFooter | `<SiteFooter>` | `components/SiteFooter.tsx` | always | dark-purple footer | per component | bottom | nav links, crisis resources, app badges, accessibility link | none | constants |
| ChallengeCompletionOverlay | `<ChallengeCompletionOverlay>` | `components/challenges/ChallengeCompletionOverlay.tsx` | `challengeCompletionOverlay !== null` | full-screen modal | per component | fixed | dismiss | open/closed | useChallengeProgress + useChallengeAutoDetect |
| CelebrationQueue | `<CelebrationQueue>` | `components/dashboard/CelebrationQueue.tsx` | always (no-op until queue has items) | full-screen modal | per component | fixed | per overlay | queued / showing | reads from `faithPoints.newlyEarnedBadges` |
| GettingStartedCelebration | `<GettingStartedCelebration>` | `components/dashboard/GettingStartedCelebration.tsx` | `showGettingStartedCelebration` (auto-fired when 6/6 GS items complete) | full-screen confetti overlay with `font-script text-3xl` headline | n/a | fixed | dismiss | one-time | celebrationFiredRef |
| EveningReflection | `<EveningReflection>` | `components/dashboard/EveningReflection.tsx` | `showReflectionOverlay` (when user clicks Reflect Now in banner) | full-screen 4-step modal | per component | fixed | next/back/done | step state | mood, gratitude, recordActivity |
| DevAuthToggle | `<DevAuthToggle>` | `components/dev/DevAuthToggle.tsx` | `import.meta.env.DEV` only | dev-only floating panel | per component | fixed | toggle simulated auth | dev | useAuth |

### `<main>` content (in source order)

| # | Section / Widget | File | Render conditions | Current visual treatment (key class strings) | Padding | Layout slot | Interactive elements | States | Data hook |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **DashboardHero** (greeting + garden + streak/min/level/FP strip) | `components/dashboard/DashboardHero.tsx` | always | `<section>` with `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark pt-24 pb-6 md:pt-28 md:pb-8`. Inner `mx-auto max-w-6xl px-4 sm:px-6`. Greeting `<h1 font-serif text-2xl text-white/90 md:text-3xl>`. Seasonal greeting span uses inline `style={{ color: themeColor }}`. Streak with `Flame` icon, Wind icon for meditation min, `<AnimatedCounter>` for FP. Progress bar `bg-white/10 h-1.5 w-32 rounded-full` with `bg-primary` fill. | hero-internal | full-width section with constrained inner | "Customize" button (`headerAction`), GardenShareButton, garden SVG. | always | useFaithPoints, useLiturgicalSeason, useGardenElements, useReducedMotion, getMeditationMinutesForWeek |
| 1a | **gardenSlot** (Your Garden label + GardenShareButton + GrowthGarden SVG, two responsive variants — mobile `size="md"`, desktop `size="lg"`) | `components/dashboard/GrowthGarden.tsx` (871 LOC), `GardenShareButton.tsx` | always | Two SVGs (one `lg:hidden`, one `hidden lg:block`). Each SVG ~800×400 viewBox with sky gradient, sun/clouds/moon, plant stages 1-6. Heading: `<p className="text-xs text-white/60">Your Garden</p>`. | n/a | inside hero | GardenShareButton (Web Share API). Garden SVG itself is decorative. | sparkle / level-up / rainbow / streakActive | gardenElements + sparkle/levelUp/rainbow state in Dashboard.tsx |
| 2 | **EchoCard (BB-46)** | `components/echoes/EchoCard.tsx` (NOT in dashboard/ folder) | `topEcho` non-null (only when user has reading/highlight/memorization history) | `mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6`. Inner card uses frosted glass + Lora serif verse. | `pb-4 md:pb-6` | full-width section above grid | tap → BB-38 deep link, optional X dismiss | shown / dismissed (session) | useEcho |
| 3 | **WeeklyGodMoments** | `components/dashboard/WeeklyGodMoments.tsx` | `godMoments.isVisible` (Sunday afternoon onward, weekly) | `rounded-2xl border border-primary/20 bg-primary/10 p-4 md:p-6`. Three-stat row with divide. | full-width | full-width section | Dismiss X | shown / dismissed | useWeeklyGodMoments |
| 4 | **DashboardWidgetGrid** (the rest) | `components/dashboard/DashboardWidgetGrid.tsx` (365 LOC) | always | `<div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6"><div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">...</div></div>` | `pb-8` | 5-col grid container | per widget | per widget | per widget |

#### Widgets inside `DashboardWidgetGrid` (rendering order from `useDashboardLayout`)

The grid renders widgets in the order returned by `useDashboardLayout(visibility)`. There are 16 widget IDs total, defined in `constants/dashboard/widget-order.ts`. Each widget gets `style={{ order: index }}` so the visible order tracks the array order. **Default ordering depends on time of day** — see `TIME_OF_DAY_ORDERS` in widget-order.ts:69-132 (morning, afternoon, evening, night each have a different sequence). User customization persists in `wr_dashboard_layout` localStorage.

**Universal rule:** if `getting-started` is visible and not in the ordered list, it's prepended. So new users always see Getting Started first.

| Widget ID | Component | colSpan | Render condition (visibility) | Card chrome | Render content |
|---|---|---|---|---|---|
| `anniversary` | `AnniversaryCard` | `lg:col-span-5` | `showAnniversary` (anniversary milestone matched, not dismissed) | rolls-own `rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-amber-500/10 backdrop-blur-sm` | heading + stats list + closing message (font-serif italic) + dismiss button |
| `getting-started` | `GettingStartedCard` | `lg:col-span-5` | `gettingStarted.isVisible && !gettingStartedCardDismissed` | rolls-own `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` (does NOT use DashboardCard). 6-item checklist with progress ring. | progress ring (48px) + 6 items, each with Circle/CircleCheck + label + point hint + Go button. Dismiss X. Collapsible. |
| `evening-reflection` | `EveningReflectionBanner` | `lg:col-span-5` | `showEveningBanner` (after 6 PM, has activity today, not yet reflected) | rolls-own `rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-4 md:p-6` | Moon icon + heading + "Reflect Now" `bg-primary` button + "Not tonight" link |
| `mood-chart` | `MoodChart` (wrapped in `DashboardCard`) | `lg:col-span-3` | always | `DashboardCard` chrome | Recharts LineChart, 7-day mood with morning/evening dots, ConnectingLines, MoodTooltip. `MoodChartEmptyState` for new users (ghosted chart at opacity-15 + "Your mood journey starts today" + Check in now button). Wrapped in ErrorBoundary with ChartFallback |
| `votd` | `VerseOfTheDayCard` | `lg:col-span-3` | always | `DashboardCard` chrome | `font-serif italic text-lg leading-relaxed text-white` verse text + `text-sm text-white/50` reference + "Meditate on this verse >" link + Share button → SharePanel |
| `devotional` | `TodaysDevotionalCard` | `lg:col-span-3` | always | `DashboardCard` chrome | title + Check icon (if read) + theme pill (`rounded-full bg-white/10`) + line-clamp-2 reflection preview + "Read today's devotional →" link |
| `reading-plan` | `ReadingPlanWidget` | `lg:col-span-3` | `hasActiveReadingPlan` | `DashboardCard` chrome | 4 states: active plan (progress bar, "Continue reading"), all completed, recently completed, discovery (3 mood-matched plan cards) |
| `prayer-list` | `PrayerListWidget` | `lg:col-span-3` | always | `DashboardCard` chrome | Empty: "Start your prayer list" + Add Prayer button. Filled: active count + most recent title + answered-this-month + "View all →" |
| `recent-highlights` | `RecentHighlightsWidget` | `lg:col-span-3` | `hasHighlightsOrNotes` | `DashboardCard` chrome | Empty: BookOpen icon + "Start highlighting as you read" + "Open Bible >" link. Filled: 3 most-recent highlight/note items with color dot or StickyNote icon, line-clamp-1 text, ref + timeAgo + "See all >" |
| `gratitude` | `GratitudeWidget` | `lg:col-span-3` | always | `DashboardCard` chrome (with pink Heart icon) | 3 input fields with NumberedHeart prefixes, `bg-primary` Save button. Saved state shows 3 read-only entries with Check icons + Edit button. CrisisBanner if keywords detected. |
| `streak` | `StreakCard` | `lg:col-span-2` | always | `DashboardCard` chrome | Flame icon + animated streak counter + longest streak + grace-based repair UI (Restore Streak amber button or 50-pt repair option) + Faith Points line + level icon + progress bar with direction-aware glow + multiplier pill + 3 recent badge buttons → BadgeGrid overlay + "View all badges" link |
| `activity-checklist` | `ActivityChecklist` | `lg:col-span-3` | always | `DashboardCard` chrome | 60px progress ring (custom SVG) + 7-12 activity items (base 7 + readingPlan if active + localVisit if hasLocalVisits + reflection if isEveningTime). Each row: CircleCheck/Circle + label + +N pts. Multiplier preview message at bottom. |
| `challenge` | `ChallengeWidget` | `lg:col-span-3` | `hasActiveChallenge` | `DashboardCard` chrome | 3 states: active (48px ring, day count, themeColor accent, action summary, streak indicator, "Continue →"), no active but season open ("Join challenge X"), no active no season ("Next challenge starts in N days" + reminder toggle), fallback FeatureEmptyState |
| `friends` | `FriendsPreview` | `lg:col-span-2` | always | `DashboardCard` chrome | Empty: CircleNetwork SVG + "Faith grows stronger together" + UserPlus invite link + "You vs. Yesterday" comparison panel. Filled: top-3 ranked list with #1/#2/#3 in `text-medal-gold/silver/bronze`, 24px avatar circles with initials, weekly points; user position if not in top 3; MilestoneFeed with maxItems=3. |
| `weekly-recap` | `WeeklyRecap` | `lg:col-span-5` | `recapVisible \|\| !recapHasFriends` | `DashboardCard` chrome (collapsible=false) | Empty (no friends): "Add friends to see your weekly recap" + UserPlus link. Filled: 4 stat rows (BookOpen prayed N times, PenLine journaled, Brain meditations, Music worship hours) + "You contributed N% of the group's growth!" + dismiss X |
| `quick-actions` | `QuickActions` | `lg:col-span-5` | always | `DashboardCard` chrome (Rocket icon) | 4-tile grid: Pray (Heart), Journal (BookOpen), Meditate (Brain), Music (Music). Each tile `rounded-xl border border-white/10 bg-white/5 p-4 ... hover:scale-[1.02] hover:bg-white/10`. NavLink. |
| **InstallCard** (always last) | `InstallCard` | `lg:col-span-5`, hardcoded `style={{ order: 9999 }}` | `isDismissed && !isDashboardCardShown && isInstallable && !isInstalled && !isIOS` | rolls-own `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4` | "Take Worship Room with you" + Install bg-primary button + Not now |

---

## Part 3 — Component Dependency Tree

### Imports inside `Dashboard.tsx`

| Component | File | Used only on Dashboard? | Other consumers |
|---|---|---|---|
| `Navbar` | `components/Navbar.tsx` | shared | every page except BibleReader |
| `SiteFooter` | `components/SiteFooter.tsx` | shared | every page except BibleReader |
| `DashboardHero` | `components/dashboard/DashboardHero.tsx` | **dashboard only** | — |
| `GrowthGarden` | `components/dashboard/GrowthGarden.tsx` | **shared** | also in `pages/GrowthProfile.tsx` (`/profile/:userId`) |
| `GardenShareButton` | `components/dashboard/GardenShareButton.tsx` | dashboard only (1 import) | — |
| `DashboardWidgetGrid` | `components/dashboard/DashboardWidgetGrid.tsx` | **dashboard only** | — |
| `MoodCheckIn` | `components/dashboard/MoodCheckIn.tsx` | dashboard only | also `pages/MoodCheckInPreview.tsx` (`/dev/mood-checkin` dev preview) |
| `MoodRecommendations` | `components/dashboard/MoodRecommendations.tsx` | dashboard only | — |
| `CelebrationQueue` | `components/dashboard/CelebrationQueue.tsx` | dashboard only | — |
| `GettingStartedCelebration` | `components/dashboard/GettingStartedCelebration.tsx` | dashboard only | — |
| `WeeklyGodMoments` | `components/dashboard/WeeklyGodMoments.tsx` | dashboard only | — |
| `EveningReflection` | `components/dashboard/EveningReflection.tsx` | dashboard only | — |
| `DevAuthToggle` | `components/dev/DevAuthToggle.tsx` | dashboard only | — |
| `WelcomeWizard` | `components/dashboard/WelcomeWizard.tsx` | dashboard only | — |
| `WelcomeBack` | `components/dashboard/WelcomeBack.tsx` | dashboard only | — |
| `TooltipCallout` | `components/ui/TooltipCallout.tsx` | shared | other onboarding tooltip locations |
| `EchoCard` | `components/echoes/EchoCard.tsx` | shared | also DailyHub Devotional tab |
| `CustomizePanel` | `components/dashboard/CustomizePanel.tsx` | dashboard only | — |
| `ChallengeCompletionOverlay` | `components/challenges/ChallengeCompletionOverlay.tsx` | shared | also `pages/ChallengeDetail.tsx` |
| `SEO` | `components/SEO.tsx` | shared | every route |

### Two-deep dependency tree (via `DashboardWidgetGrid`)

```
DashboardWidgetGrid
├── DashboardCard (15+ instances — wraps ~12 widgets)
│   ├── ChevronDown (lucide)
│   └── Link (react-router-dom)
├── MoodChart
│   ├── ErrorBoundary, ChartFallback
│   ├── recharts: LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Line, Tooltip, Customized
│   ├── MoodChartEmptyState (sub-component, ghosted dummy chart)
│   └── useMoodChartData hook
├── QuickActions  (4 NavLink tiles, lucide icons)
├── StreakCard
│   ├── Flame, lucide level icons (via getBadgeIcon)
│   ├── AnimatedCounter
│   ├── BadgeGrid (overlay)
│   ├── useToastSafe, useSoundEffects, useReducedMotion
│   └── direct localStorage read of `wr_badges` (line 44)
├── ActivityChecklist
│   ├── BookOpen, CircleCheck, Circle, Moon (lucide)
│   ├── useReadingPlanProgress
│   └── direct localStorage read of `wr_local_visits`
├── FriendsPreview
│   ├── CircleNetwork (custom SVG)
│   ├── MilestoneFeed (`components/social/MilestoneFeed.tsx`)
│   ├── UserPlus (lucide)
│   ├── useFriends hook
│   └── leaderboard utils, splitDisplayName helper
├── VerseOfTheDayCard
│   ├── SharePanel (`components/sharing/SharePanel.tsx`)
│   └── getTodaysVerse (constants/verse-of-the-day)
├── WeeklyRecap
│   ├── X, BookOpen, PenLine, Brain, Music, UserPlus (lucide)
│   └── useWeeklyRecap hook
├── TodaysDevotionalCard
│   ├── Check (lucide)
│   ├── getTodaysDevotional (data/devotionals)
│   └── direct localStorage read of `wr_devotional_reads`
├── PrayerListWidget
│   └── prayer-list-storage service
├── ReadingPlanWidget
│   ├── Check, ChevronRight (lucide)
│   ├── useReadingPlanProgress
│   ├── reads getMoodEntries + getActivityLog
│   └── PLAN_THEME_TO_MOOD constant lookup
├── GratitudeWidget
│   ├── Heart, Check (lucide)
│   ├── NumberedHeart sub-component (custom SVG-style overlay)
│   ├── CrisisBanner
│   ├── useToast, useSoundEffects
│   └── gratitude-storage service
├── ChallengeWidget
│   ├── Flame (lucide)
│   ├── FeatureEmptyState (the canonical empty state primitive)
│   ├── useChallengeProgress
│   └── challenge-calendar lib
├── RecentHighlightsWidget
│   ├── BookOpen, StickyNote (lucide)
│   ├── timeAgo (lib/time)
│   └── bible-annotations-storage service
├── GettingStartedCard
│   ├── Circle, CircleCheck, ChevronDown, X (lucide)
│   ├── useReducedMotion, useSoundEffects
│   └── dashboard-collapse-storage
├── EveningReflectionBanner  (Moon icon, simple banner)
├── AnniversaryCard          (no children of note, plays sparkle sound)
└── InstallCard
    ├── useInstallPrompt
    └── useToast
```

### `DashboardHero` dependency tree

```
DashboardHero
├── Flame, Wind (lucide)
├── AnimatedCounter (RAF-based count animation)
├── useReducedMotion
├── useLiturgicalSeason (drives seasonal greeting + theme color)
└── LEVEL_THRESHOLDS constant
```

### `GrowthGarden` dependency tree (765+ LOC)

```
GrowthGarden  (forwardRef<SVGSVGElement>)
├── useReducedMotion
├── garden/gardenTimeOfDay (sky/sun/moon based on hour)
├── garden/gardenSeasons (seasonal overlay config)
├── garden/NightSky (moon + stars when hour ≥ 20 or ≤ 4)
├── garden/SeasonalOverlay (Advent/Lent/Easter/Christmas overlays)
├── garden/ActivityElements (butterflies, fruit, etc. driven by useGardenElements)
└── inline SVG defs/gradients/paths for all 6 stages, sun, clouds, sparkles, rainbow
```

---

## Part 4 — Unique Visual Patterns Inventory

### 1. **Growth Garden Hero Illustration** (unique to Dashboard + GrowthProfile)

- **What:** Full inline SVG (~800×400 viewBox), 6 growth stages keyed to `currentLevel`. Sky gradient changes by hour-of-day. Streak-active state shows a sun; inactive shows clouds. Night/dusk shows moon+stars via `<NightSky>`. Seasonal overlays add Advent candle, Lent ashes, Easter fruit, Christmas snow. Sparkle effect on FP increase. Rainbow overlay when 7-day streak first reached. Activity elements (butterflies, birds, fruit, stream) driven by `useGardenElements()`.
- **Where rendered:** Dashboard hero `gardenSlot`, in two responsive variants (mobile `size="md"` h-[200px], desktop `size="lg"` h-[300px]).
- **Implementation:** Custom SVG inline. Earth tones (`#5C4033 #6B4E1B #8B6914`), green leaves (`#22C55E #16A34A #15803D`), purple violet sparkles. **NOT violet/purple in palette** — uses earth/sky/leaf/stream colors. This is a documented exception to the otherwise-violet design system.
- **Animation:** SVG-level animation attributes (CSS `<animate>` and animation classes), exempted from the global reduced-motion safety net by design.
- **Data binding:** stage from `faithPoints.currentLevel as 1|2|3|4|5|6`; sparkle from `gardenSparkle` state (set when `totalPoints` increases between renders); `streakActive` from `currentStreak > 0`; `showRainbow` from `wr_surprise_shown_rainbow` localStorage flag (one-time, only when streak first reaches 7).

### 2. **Faith Points progress bar** (Dashboard hero + StreakCard)

- **Implementation:** plain `<div>` with `h-1.5 rounded-full bg-white/10` track + `bg-primary` fill, with inline-style `width: ${progressPercent}%` and direction-aware glow `boxShadow: 0 0 8px rgba(139, 92, 246, 0.4)` on increase / `rgba(217, 119, 6, 0.3)` on decrease. Animation uses `ANIMATION_DURATIONS.slow` (500ms) `ANIMATION_EASINGS.decelerate` for width, `base` (300ms) for shadow.
- **Tier labels:** Seedling (0), Sprout (100), Blooming (500), Flourishing (1500), Oak (4000), Lighthouse (10,000). From `LEVEL_THRESHOLDS` in `constants/dashboard/levels.ts`.
- **Anti-pressure copy:** "Lighthouse — Max Level" at top tier. No "you need X more points!" framing.

### 3. **Badge Pills** (StreakCard inline + BadgeGrid overlay)

- **Inline (StreakCard):** up to 3 most-recent badges as round buttons (`h-11 w-11 rounded-full` with `backgroundColor: 'rgba(139,92,246,0.2)'` inline style), badge icon centered, click opens `<BadgeGrid>` overlay.
- **BadgeGrid:** sectioned grid of all ~45 badges across 11 categories (Streak Milestones, Level-Up, Activity Milestones, First Steps, Full Worship Day, Community, Bible Books, Reading Plans, Challenges, Meditation Milestones, Prayer Wall). Earned = colored, unearned = `<Lock>` silhouette.
- **Earning conditions:** logic in `services/badge-engine.ts`, ~45 badge definitions in `constants/dashboard/badges.ts`.

### 4. **7-Day Mood Line Chart** (MoodChart)

- **Library:** Recharts (`LineChart`, `ResponsiveContainer`, `CartesianGrid`, `XAxis`, `YAxis`, `Line`, `Tooltip`, `Customized`). `Recharts isolated via manualChunks` per build standard.
- **Data shape:** `MoodChartDataPoint[]` from `useMoodChartData(7)` — 7 days, each with `{ date, dayLabel, mood, moodLabel, color, eveningMood, eveningMoodLabel, eveningColor }`.
- **Two lines:** morning mood (solid `stroke="#8B5CF6"` strokeWidth=2 with mood-colored CustomDot) + evening mood (transparent line, EveningDot circle with white stroke ring). Connecting lines between morning & evening dots via `<Customized component={ConnectingLines}>` with rgba(255,255,255,0.15).
- **Empty state code:** `MoodChartEmptyState` component renders an opacity-15 ghosted chart with hardcoded `EMPTY_STATE_DATA` (Mon-Sun varied moods) overlaid by "Your mood journey starts today" + optional "Check in now" button.
- **Wrapped:** `<ErrorBoundary fallback={<ChartFallback />}>`. Mobile-aware via `window.matchMedia('(max-width: 639px)')`.

### 5. **Quick Actions Tile Grid** (QuickActions)

- **Chrome:** 4 `<Link>` tiles, `grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4`.
- **Tile class:** `flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white/80 transition-all motion-reduce:transition-none hover:scale-[1.02] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:scale-100 md:p-6`.
- **Icons:** Heart (Pray), BookOpen (Journal), Brain (Meditate), Music (Music). Lucide React.
- **Click:** plain `Link` to `/daily?tab=*` or `/music`.
- **Layout:** 2 cols on mobile, 4 cols on desktop.

### 6. **Friends & Leaderboard Ranked List** (FriendsPreview)

- **#1/#2/#3 styling:** `text-medal-gold` / `text-medal-silver` / `text-medal-bronze` (custom Tailwind colors). Rank shown as "#1" `text-xs font-bold` left of avatar.
- **Avatar component:** simple `div` 24×24 with `bg-primary/40 rounded-full text-[10px] font-semibold text-white` showing initials from `splitDisplayName(displayName)` (first.charAt(0) + last.charAt(0)). Wrapped in `<Link to={/profile/${id}}>` for friends; plain `<div>` for current user (`__current_user__`).
- **Activity feed item:** `MilestoneFeed` mounted at the bottom with `maxItems={3}` — emits friend milestone events (`🔥 Sarah hit a 30-day streak!`) from `wr_milestone_feed` localStorage.
- **Empty state:** CircleNetwork SVG (5-node graph in white/10-25 strokes) + "Faith grows stronger together" + UserPlus invite + "You vs. Yesterday" comparison card with arrow indicator (↑/↓/→).

### 7. **Inline-input form: GratitudeWidget**

- **Chrome:** 3 input fields stacked vertically. Each row: `<NumberedHeart number={i+1}>` (Heart icon overlaid with number) + `<input type="text" ... className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 ...">`.
- **Button:** `bg-primary text-white rounded-lg px-4 py-2` Save (deprecated solid bg-primary pattern).
- **Validation:** none formally — just a `disabled={!hasContent}` check (`values.some(v => v.trim().length > 0)`).
- **Submit:** `saveGratitudeEntry(...)`, fires toast `"Gratitude logged! Thank you for counting your blessings."` + `chime` sound effect, then `setMode('saved')`.
- **Crisis detection:** runs across combined values via `containsCrisisKeyword()`.

### 8. **Checklist patterns — TWO distinct patterns**

There are **two separate checklist components**, with different visual treatments. They are NOT the same component.

| | `GettingStartedCard` (6-item) | `ActivityChecklist` (7-12 item) |
|---|---|---|
| Card chrome | Rolls-own `rounded-2xl border-white/10 bg-white/5 p-4 md:p-6` (NOT DashboardCard) | Wrapped by `DashboardCard` |
| Progress ring | 48×48 SVG, RING_RADIUS=18, strokeWidth=5 | 60×60 SVG, RING_RADIUS=24, strokeWidth=6 |
| Item icons | `Circle` / `CircleCheck` (`text-success` when done, `text-white/20` else) | `Circle` / `CircleCheck` + special: `BookOpen` for readingPlan, `Moon` for reflection |
| Go button | Per-item `<button>` "Go" → navigate to destination or trigger check-in (item 1 has `destination=null`) | NO per-item Go; the whole checklist is informational |
| Points display | `+N pts` on each row, line-through when complete | `+N pts` right-aligned `ml-auto`, `text-success` when done |
| Dismiss | X button at top-right (one-time dismiss → `wr_getting_started_complete = true`) | Not dismissable (lives in DashboardCard which has its own collapse) |
| Collapse | Self-contained, persists `getting-started` in `wr_dashboard_collapsed` | Inherits from DashboardCard collapse |
| Items | 6 fixed (mood, pray, journal, meditate, ambient, prayer wall) | 7 base + 3 conditional (readingPlan, localVisit, reflection) |
| Auto-completion | Synced from `wr_daily_activities` via useEffect | Direct from `todayActivities` prop |
| Animation | Just-completed scale-110 + sparkle sound effect | Progress ring stroke-dashoffset animation only |

**These two are visually similar but architecturally distinct.** A spec decision is needed about whether to unify them.

### 9. **Dismissable banner pattern**

Multiple components implement their own dismissable banners. None share a primitive:

- `GettingStartedCard` — X icon top-right, sets `wr_getting_started_complete`, fades out via `setFadingOut` + 300ms timer.
- `EveningReflectionBanner` — "Not tonight" text link sets `wr_evening_reflection`.
- `WeeklyRecap` — X icon top-right, dismissed via `useWeeklyRecap`.
- `WeeklyGodMoments` — X icon top-right, fade-out via `setFading` + 300ms timer.
- `AnniversaryCard` — "Dismiss" text button bottom-right, sets `wr_anniversary_milestones_shown` + `wr_last_surprise_date`.
- `InstallCard` — "Not now" text button, sets `wr_install_dashboard_shown`.

### 10. **Section expand/collapse pattern**

`DashboardCard` provides a shared collapse mechanism: ChevronDown at top-right, animated rotation, `aria-expanded` + `aria-controls`. State persists per card ID via `dashboard-collapse-storage` (`wr_dashboard_collapsed: { [cardId]: boolean }`). `GettingStartedCard` rolls its own near-identical collapse using the same storage layer. `WeeklyRecap` is rendered with `collapsible={false}`.

### 11. **Streak indicator** (Flame)

- Lucide `<Flame>` icon, `h-8 w-8 md:h-9 md:w-9`. Color:
  - Active streak: `text-amber-400`
  - Inactive: `text-white/30`
- `motion-safe:animate-streak-bump` Tailwind animation when `animate && currentStreak === 1` (entrance bump).
- Streak number rendered via `<AnimatedCounter from={0|prev} to={currentStreak} duration={800}>`.
- Milestone sound `ascending` plays at MILESTONE_STREAKS = `[7, 14, 30, 60, 90, 180, 365]`.
- DashboardHero also shows a smaller `Flame h-5 w-5` in the strip.

### 12. **Holiday / liturgical detection**

- Single source: `useLiturgicalSeason()` hook.
- Exposes `{ greeting, themeColor, isNamedSeason, seasonName }`.
- Algorithmic detection via Computus (Easter calc).
- Hardcoded full season set: Advent, Christmas, Lent, Holy Week, Easter, Pentecost, Ordinary Time. (See `useLiturgicalSeason.ts` for the canonical list.)
- DashboardHero renders `{seasonalGreeting}` next to user name with inline `style={{ color: themeColor }}` (the single inline-style exception).
- Garden uses `seasonName` prop for `getSeasonalOverlay()`.

---

## Part 5 — Data and Hook Dependencies

### Hooks consumed by Dashboard.tsx (direct or via children)

| Hook | File | Provides | Backing | Loading/error |
|---|---|---|---|---|
| `useAuth()` | `hooks/useAuth.ts` (re-export) → `contexts/AuthContext.tsx` | `{ isAuthenticated, user, login, logout }` | localStorage `wr_auth_simulated`, `wr_user_id`, `wr_user_name`, `wr_jwt_token` (post-1.9 forums wave) | sync, no error UI |
| `useReducedMotion()` | `hooks/useReducedMotion.ts` | bool | media query `prefers-reduced-motion: reduce` | sync |
| `useRoutePreload([...])` | `hooks/useRoutePreload.ts` | side-effect (preload `DailyHub`, `MusicPage`) | dynamic imports | fire-and-forget |
| `useSoundEffects()` | `hooks/useSoundEffects.ts` | `{ playSoundEffect(name) }` | Web Audio API + `wr_sound_effects_enabled` flag | sync |
| `useFaithPoints()` | `hooks/useFaithPoints.ts` | `{ totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, newlyEarnedBadges, previousStreak, isFreeRepairAvailable, recordActivity, clearNewlyEarnedBadges, repairStreak }` | localStorage (`wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_streak_repairs`, `wr_badges`) + (Phase 2 dual-write) backend `/api/v1/activity/*` when `VITE_USE_BACKEND_ACTIVITY=true` | sync; backend writes are fire-and-forget |
| `useLiturgicalSeason()` | `hooks/useLiturgicalSeason.ts` | `{ greeting, themeColor, isNamedSeason, seasonName }` | algorithmic Computus | sync |
| `useGardenElements()` | `hooks/useGardenElements.ts` | `GardenActivityElements` (butterflies, fruit, stream presence) | reads activity log | sync |
| `useWeeklyRecap()` | `hooks/useWeeklyRecap.ts` | `{ isVisible, hasFriends, stats, userContributionPercent, dismiss }` | `wr_weekly_summary_dismissed`, friends data, activity log | sync |
| `useWeeklyGodMoments()` | `hooks/useWeeklyGodMoments.ts` | `{ isVisible, devotionalsRead, totalActivities, moodTrend, dismiss }` | activity log + mood entries + devotional reads + dismiss flag | sync |
| `useEcho()` | `hooks/useEcho.ts` | `Echo \| null` | echo-selection engine over highlights, memorization cards, reading visits; session-scoped dismissal Set | sync; no persistence of dismissals |
| `usePrayerReminders(active)` | `hooks/usePrayerReminders.ts` | side-effect (toast reminders) | `wr_prayer_reminders_shown` + prayer list | sync |
| `useChallengeProgress()` | `hooks/useChallengeProgress.ts` | `{ getActiveChallenge, completeDay, getReminders, toggleReminder }` | `wr_challenge_progress`, `wr_challenge_reminders` | sync |
| `useChallengeAutoDetect({...})` | `hooks/useChallengeAutoDetect.ts` | `{ checkAndAutoComplete }` | reads challenge progress + activity log | sync |
| `useChallengeNudge({...})` | `hooks/useChallengeNudge.ts` | side-effect (nudge toast once/day) | `wr_challenge_nudge_shown` | sync |
| `useGettingStarted(todayActivities)` | `hooks/useGettingStarted.ts` | `{ items, completedCount, allComplete, isVisible, dismiss }` | `wr_getting_started`, `wr_getting_started_complete`, `wr_onboarding_complete`, `todayActivities` | sync |
| `useAnniversaryMoment()` | `hooks/useAnniversaryMoment.ts` | `{ show, milestone, heading, closingMessage, stats }` | activity log + `wr_anniversary_milestones_shown` | sync |
| `useGratitudeCallback(active)` | `hooks/useGratitudeCallback.ts` | side-effect (whisper toast) | `wr_gratitude_callback_last_shown` | sync |
| `useWhisperToast()` | `hooks/useWhisperToast.ts` | `{ showWhisperToast }` | atmospheric toast subsystem | sync |
| `useTooltipCallout(id, ref)` | `hooks/useTooltipCallout.ts` | `{ shouldShow, dismiss }` | `wr_tooltips_seen` | sync |
| `useDashboardLayout(visibility)` | `hooks/useDashboardLayout.ts` | `{ orderedWidgets, layout, isCustomized, updateOrder, toggleVisibility, resetToDefault }` | `wr_dashboard_layout` + time-of-day defaults | sync |
| `useToastSafe()` | `components/ui/Toast.tsx` | `{ showToast, showCelebrationToast }` | provider | sync |

**Hooks used inside child widgets (not directly by Dashboard.tsx):**

- `useMoodChartData(days)` — reads `wr_mood_entries`
- `useReadingPlanProgress` — reads `wr_reading_plan_progress`
- `useFriends` — reads `wr_friends`
- `useChallengeProgress`
- `useInstallPrompt` — `wr_install_dismissed`, `wr_install_dashboard_shown`, `wr_visit_count`, `wr_session_counted`
- `useDragReorder` — used by CustomizePanel
- `useFocusTrap` — used by CustomizePanel
- `useToast` (in GratitudeWidget, InstallCard)

---

## Part 6 — localStorage / State Inventory

### localStorage keys read or written by Dashboard or its children

| Key | R/W | Where | Default fallback |
|---|---|---|---|
| `wr_auth_simulated` | R | useAuth (init) | absent → unauthenticated |
| `wr_user_name` | R | useAuth, DashboardHero (greeting) | "" |
| `wr_user_id` | R | useAuth | crypto.randomUUID() |
| `wr_jwt_token` | R | useAuth (post-1.9) | absent → simulated path |
| `wr_onboarding_complete` | R | Dashboard.tsx phase init | absent → onboarding phase |
| `wr_first_run_completed` | not consumed by Dashboard | (BB-34, only Home/landing) | n/a |
| `wr_daily_activities` | R/W | useFaithPoints | `freshDailyActivities()` |
| `wr_faith_points` | R/W | useFaithPoints | `{ totalPoints: 0, currentLevel: 1, ... }` |
| `wr_streak` | R/W | useFaithPoints, WelcomeBack | `{ currentStreak: 0, longestStreak: 0, ... }` |
| `wr_streak_repairs` | R/W | streak-repair-storage | `{ previousStreak: null, freeRepairUsed: false }` |
| `wr_badges` | R | StreakCard (direct read line 44), useFaithPoints | `{ earned: {}, newlyEarned: [] }` |
| `wr_mood_entries` | R | useMoodChartData, ReadingPlanWidget mood-match | `[]` |
| `wr_evening_reflection` | R | evening-reflection-storage | absent |
| `wr_friends` | R | useFriends, WelcomeBack | `{ friends: [], pending: [], blocked: [] }` |
| `wr_milestone_feed` | R | MilestoneFeed (inside FriendsPreview) | `[]` |
| `wr_dashboard_collapsed` | R/W | DashboardCard, GettingStartedCard | `{}` |
| `wr_dashboard_layout` | R/W | useDashboardLayout, CustomizePanel | null → time-of-day default |
| `wr_seasonal_banner_dismissed_*` | not directly consumed | (used elsewhere) | n/a |
| `wr_tooltips_seen` | R/W | useTooltipCallout (`dashboard-quick-actions`) | `[]` |
| `wr_getting_started` | R/W | useGettingStarted | `{ mood_done: false, pray_done: false, ... }` |
| `wr_getting_started_complete` | R/W | useGettingStarted (dismiss) | absent → visible |
| `wr_weekly_summary_dismissed` | R/W | useWeeklyRecap | absent |
| `wr_install_dismissed` | R | useInstallPrompt | absent |
| `wr_install_dashboard_shown` | R/W | useInstallPrompt, InstallCard | absent |
| `wr_visit_count` | R | useInstallPrompt | 0 |
| `wr_session_counted` | R/W | useInstallPrompt | absent |
| `wr_devotional_reads` | R | TodaysDevotionalCard (direct read line 15), MoodRecommendations | `[]` |
| `wr_prayer_list` | R | PrayerListWidget via prayer-list-storage | `[]` |
| `wr_prayer_reminders_shown` | R/W | usePrayerReminders | absent |
| `wr_reading_plan_progress` | R | ReadingPlanWidget, Dashboard.tsx (direct read line 360) | `{}` |
| `wr_gratitude_entries` | R/W | GratitudeWidget via gratitude-storage | `[]` |
| `wr_challenge_progress` | R/W | useChallengeProgress | `{}` |
| `wr_challenge_reminders` | R/W | useChallengeProgress | `[]` |
| `wr_challenge_nudge_shown` | R/W | useChallengeNudge | absent |
| `wr_local_visits` | R | ActivityChecklist (direct read line 74) | `[]` |
| `wr_anniversary_milestones_shown` | R/W | useAnniversaryMoment, surprise-storage | `[]` |
| `wr_surprise_shown_rainbow` | R/W | Dashboard.tsx (line 340) | absent → eligible |
| `wr_last_surprise_date` | W | surprise-storage | n/a |
| `wr_gratitude_callback_last_shown` | R/W | useGratitudeCallback | absent |
| `wr_sound_effects_enabled` | R | useSoundEffects, EveningReflection | "true" default |
| `wr_chapters_visited` | R | useEcho (via echo engine) | `{}` |
| `wr_bible_highlights` | R | useEcho, RecentHighlightsWidget via bible-annotations-storage | `[]` |
| `bible:notes` | R | RecentHighlightsWidget via bible-annotations-storage | `[]` |
| `wr_memorization_cards` | R | useEcho | `[]` |
| `wr_activity_backfill_completed` | R/W | useFaithPoints (Spec 2.10) | absent |

**Note:** Dashboard.tsx itself directly reads `wr_reading_plan_progress` (via `READING_PLAN_PROGRESS_KEY`) inline at line 360 in a `useMemo` — this is one of the few places localStorage is read outside a hook/service.

### React state managed directly in Dashboard.tsx

| State | Type | Purpose |
|---|---|---|
| `phase` | `DashboardPhase` | the 6-phase state machine |
| `lastMoodEntry` | `MoodEntry \| null` | passed to MoodRecommendations |
| `customizePanelOpen` | bool | toggles CustomizePanel (also via `?customize=true` URL param) |
| `animateEntrance` | bool | one-time entrance animation flag |
| `challengeCompletionOverlay` | `{ title, themeColor, days, points, badgeName } \| null` | modal data |
| `showGettingStartedCelebration` | bool | one-time GS celebration overlay |
| `gettingStartedCardDismissed` | bool | local dismissal mirror |
| `anniversaryDismissed` | bool | local dismissal mirror |
| `gardenSparkle` | bool | sparkle animation flag |
| `gardenLevelUp` | bool | amplified sparkle on level-up |
| `showRainbow` | bool | rainbow garden overlay (one-time on 7-day streak) |
| `showReflectionOverlay` | bool | EveningReflection modal |
| `eveningBannerDismissed` | bool | banner dismissal |

### Refs in Dashboard.tsx

| Ref | Type | Purpose |
|---|---|---|
| `checkedRef` | `useRef(false)` | gates phase init effect |
| `hasAnimatedRef` | `useRef(false)` | gates one-time entrance animation |
| `customizeButtonRef` | `useRef<HTMLButtonElement>(null)` | focus restoration after CustomizePanel close |
| `gardenRef` | `useRef<SVGSVGElement>(null)` | passed to both GrowthGarden instances + GardenShareButton for share-image generation |
| `prevPointsRef` | `useRef(faithPoints.totalPoints)` | tracks last FP for sparkle trigger |
| `prevLevelRef` | `useRef(faithPoints.currentLevel)` | tracks level for amplified-sparkle |
| `quickActionsRef` | `useRef<HTMLDivElement>(null)` | tooltip target |
| `celebrationFiredRef` | `useRef(false)` | one-time GS celebration guard |

---

## Part 7 — Deprecated Patterns Inventory

Cross-referencing `09-design-system.md` § "Deprecated Patterns".

### CONFIRMED on Dashboard

| Deprecated pattern | Where | Severity / scope |
|---|---|---|
| **Solid `bg-primary` buttons (deprecated; should be white pill CTA)** | `EveningReflectionBanner.tsx:30` ("Reflect Now"), `GratitudeWidget.tsx:170` ("Save"), `PrayerListWidget.tsx:30` ("Add Prayer"), `InstallCard.tsx:37` ("Install"), `MoodCheckIn.tsx:220`, `WelcomeWizard.tsx:287/543`, `WelcomeBack.tsx:172/204` (`bg-primary` + rounded-full), `EveningReflection.tsx:474/530/586`, `GettingStartedCelebration.tsx:89`, `CustomizePanel.tsx:239`, `NotificationItem.tsx:157` | High — multiple instances; not aligned with Round 3 white-pill primary CTA pattern |
| **Pre-Round-3 rolls-own card chrome (`bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm`) instead of FrostedCard** | `DashboardCard.tsx:49` (this is the canonical card for ~12 widgets), `GettingStartedCard.tsx:108`, `AnniversaryCard.tsx:30`, `EveningReflectionBanner.tsx:14` (uses indigo-tinted variant), `InstallCard.tsx:30`, `WeeklyGodMoments.tsx:57` (uses primary-tinted variant), `Dashboard.tsx:479` (Customize button), `Friends/PrayerList/Highlights/Reading-plan` widget empty states, `QuickActions.tsx:18` tile chrome, `FriendsPreview.tsx:80` (You-vs-Yesterday inset). **No FrostedCard usage anywhere on Dashboard.** | High — Dashboard is the single largest concentration of pre-Round-3 cards in the app |
| **`rounded-2xl` cards** (FrostedCard is now `rounded-3xl` on homepage / `rounded-2xl` retained on dashboard per current design-system table — note potential ambiguity) | All DashboardCard instances. The `09-design-system.md` Dashboard Card Pattern still documents `rounded-2xl` for dashboard. Homepage FrostedCard uses `rounded-2xl` too. **This may not be a true regression — confirm with Eric.** | Possible low — depends on direction document |
| **`text-primary` ghost links** (deprecated → `text-white/80`) | `DashboardCard.tsx:73` (action link), `MoodChart.tsx:200` ("Check in now"), `ReadingPlanWidget.tsx:155/200/237` ("Continue reading", "Browse all plans"), `RecentHighlightsWidget.tsx:17/63` ("Open Bible >", "See all >"), `PrayerListWidget.tsx:53` ("View all →"), `TodaysDevotionalCard.tsx:46/55` ("Read again →" / "Read today's devotional →"), `VerseOfTheDayCard.tsx:21` ("Meditate on this verse >"), `FriendsPreview.tsx:73` ("Invite a friend"), `WeeklyRecap.tsx:16/56` (Find friends), `StreakCard.tsx:373` ("View all badges"), `GettingStartedCard.tsx:269` (Go button) | High — pervasive `text-primary` and `text-primary-lt` ghost links |
| **`font-script` Caveat** | `GettingStartedCelebration.tsx:77` ("text-3xl text-white sm:text-4xl md:text-5xl") + `WelcomeWizard.tsx:329/517` + `WelcomeBack.tsx:134` | Medium — ceremony overlays, not main dashboard surface, but documented as deprecated for headings |
| **`font-serif italic` Lora prompts** | `VerseOfTheDayCard.tsx:14` (verse text), `AnniversaryCard.tsx:44` (closing message), `MoodRecommendations.tsx:161` (recommendation text), `WelcomeWizard.tsx:531` (blockquote), `EveningReflection.tsx:422`, `StreakCard.tsx:225` ("Everyone misses a day. Grace is built into your journey.") | Medium — devotional/ceremonial text. Per design-system rules, Lora italic is acceptable for **scripture display** (VerseOfTheDayCard ✓ acceptable), but body-prose Lora italic was removed from Daily Hub. Anniversary/StreakCard italic prose may need rethinking. |
| **`animate-glow-pulse`** | not found on Dashboard | OK |
| **`PageTransition` wrappers** | not used | OK |
| **Hardcoded hex values** | `MoodChart.tsx` (axis ticks `rgba(255,255,255,0.5)`, line stroke `#8B5CF6`, legend grid `rgba(255,255,255,0.05)`, `MoodTooltip` `bg-hero-mid`), `ActivityChecklist.tsx:150` `stroke="#6D28D9"`, `GettingStartedCard.tsx:144` `stroke="#6D28D9"`, `StreakCard.tsx:127/356` (inline rgba glow + `rgba(139,92,246,0.2)` badge bg), `DashboardHero.tsx:64` (rgba glow inline), `GrowthGarden.tsx` palette, `MoodChartEmptyState` (full mood color hex set hardcoded line 144-152). | Medium — many hex values; some unavoidable (SVG strokes, Recharts), some refactorable to Tailwind aliases |
| **Hardcoded transition timings** | All widgets use `duration-base`/`duration-fast`/`duration-slow` Tailwind classes (✓ aligned with BB-33 token system). DashboardHero, StreakCard, ActivityChecklist, GettingStartedCard correctly import `ANIMATION_DURATIONS`/`ANIMATION_EASINGS` from `constants/animation.ts`. Hardcoded ms values: `Dashboard.tsx:64` (`DASHBOARD_ENTER_DURATION_MS = 800`), `Dashboard.tsx:326` (`setTimeout(..., 1500)` for sparkle decay), `Dashboard.tsx:347` (whisper toast `duration: 6000`), `Dashboard.tsx:535/549` (`animationDelay: '100ms'`). `StreakCard.tsx` various 600/800ms hardcodes for AnimatedCounter `duration={...}` props. `DashboardHero.tsx:68` `setTimeout(..., 600)` for glow decay. | Low-medium — most are deliberate (sparkle timing, animated counter), but some 600/800/100ms values could become tokens |
| **Cyan-tinted borders/glows** | not found on Dashboard | OK |
| **`text-violet-900` that should be `text-black`** | not found on Dashboard | OK |
| **BackgroundSquiggle** | not used on Dashboard | OK |
| **Per-section GlowBackground** | not used on Dashboard | OK (Dashboard correctly omits this — intentional) |

### Dashboard-specific deprecation observation

**The biggest deprecated pattern is the absence of FrostedCard.** Every dashboard card (DashboardCard, GettingStartedCard, AnniversaryCard, EveningReflectionBanner, InstallCard, WeeklyGodMoments) rolls its own glassmorphic chrome with `bg-white/5 border-white/10 rounded-2xl backdrop-blur-sm`. The Round 3 FrostedCard primitive uses `bg-white/[0.06] border-white/[0.12] rounded-2xl` plus dual box-shadow + a tier system. **No tier 1 / tier 2 distinction exists on Dashboard.** Migration here is the largest single visual lift.

---

## Part 8 — Tests Inventory

**Total test files touching Dashboard or its children: 56 files, ~11,112 LOC.**

### Page-level tests (5 files, 809 LOC)

| File | LOC | Has class-string assertions | Behavioral focus | Mocks FrostedCard/Button |
|---|---|---|---|---|
| `pages/__tests__/Dashboard.test.tsx` | 224 | likely no | Phase transitions (onboarding/check-in/dashboard), mood entry flow | n/a (no FrostedCard used) |
| `pages/__tests__/DashboardIntegration.test.tsx` | 112 | no (behavioral) | end-to-end widget integration | n/a |
| `pages/__tests__/DashboardGettingStarted.test.tsx` | 187 | no | GS visibility, dismissal, completion | n/a |
| `pages/__tests__/Dashboard-welcome-back.test.tsx` | 150 | no | welcome-back flow | n/a |
| `pages/__tests__/DashboardEcho.test.tsx` | 136 | no | echo card placement | n/a |

### Component-level dashboard tests (51 files, ~10,303 LOC)

Counted **102 lines** containing `toHaveClass` or `className.toContain` across the dashboard test directory. Notable class-string assertions:
- `WelcomeWizard.test.tsx:364-365` asserts `className.toContain('bg-white/5')` and `className.toContain('border-white/10')` → **migration would break these** if card chrome changes.

**Key files needing review during migration:**
- `DashboardCard.test.tsx` (94 LOC) — chrome assertions likely present.
- `DashboardWidgetGrid.test.tsx` (134 LOC) — colSpan + ordering assertions.
- `DashboardHero.test.tsx` (56) + `DashboardHero-seasonal.test.tsx` (67) — greeting + season copy + Flame state.
- `progress-bar-glow.test.tsx` (280) — direct test of the inline-style glow shadow on FP progress bar (will break if migration moves to a different glow approach).
- `dashboard-widgets-integration.test.tsx` (168) — integration assertions on ordering/visibility.
- `dynamic-ordering.test.tsx` (241) — time-of-day reordering.
- `entrance-animation.test.tsx` (219) — entrance animation classes.
- `transition-animation.test.tsx` (145) — transitions.
- `accessibility-polish.test.tsx` (136), `Accessibility.test.tsx` (140), `GettingStartedAccessibility.test.tsx` (153), `GrowthGarden-a11y.test.tsx` (148), `CelebrationAccessibility.test.tsx` (148) — a11y guards.
- `empty-states.test.tsx` (129), `warm-empty-states.test.tsx` (108) — empty-state copy assertions.
- `reduced-motion.test.tsx` (77) — reduced-motion guards.
- `sound-triggers-dashboard.test.tsx` (234) — sound-effect firing.

**No dashboard test mocks FrostedCard or Button** (grep returned 0 results for `vi.mock.*FrostedCard|Button`). However the absence of FrostedCard usage means there's nothing to mock today; if migration introduces FrostedCard, no mocks need to be removed.

**Behavioral tests (should pass through migration):** the majority — phase transitions, hook integration, ordering, visibility logic, animation triggers, sound effects, empty-state copy, reduced-motion guards, accessibility (aria-labels, role, landmarks).

**Tests that will need updates:** `WelcomeWizard.test.tsx` chrome assertions, `progress-bar-glow.test.tsx` (if glow approach changes), `DashboardCard.test.tsx` (if card chrome class strings change), `entrance-animation.test.tsx` (if entrance classes change). Any test asserting exact `bg-white/5` / `border-white/10` / `rounded-2xl` / `backdrop-blur-sm` class strings will need updates.

---

## Part 9 — Accessibility Audit

### What's already good

- DashboardCard has full `aria-labelledby`, `aria-expanded`, `aria-controls`, `aria-label` on collapse button, 44px tap target (`min-h-[44px] min-w-[44px]`).
- DashboardHero has `aria-label="Dashboard hero"`, `role="progressbar"` with `aria-valuenow/min/max/text`, `aria-live="polite"` on streak counter via StreakCard.
- StreakCard: `aria-live="polite"` on streak baseline, `role="progressbar"` on FP bar, `aria-label` on badge buttons.
- ActivityChecklist: progress ring `<svg role="img" aria-label>`, per-row `aria-label` describing complete/incomplete state + points.
- GettingStartedCard: full-screen-readers `aria-live="polite" aria-atomic="true"` announcer for newly-completed items, progress ring `role="img" aria-label`, dismiss + collapse buttons with `aria-label`.
- MoodChart: `<div role="img" aria-label="Your mood over the last 7 days">` + sr-only summary "Over the last 7 days, you checked in N times. Average mood: X."
- CustomizePanel: `role="dialog" aria-modal="true" aria-label="Customize Dashboard"`, `useFocusTrap`, `aria-live="polite"` announcement region for keyboard reorder, drag handle `aria-label`, switch toggles `role="switch" aria-checked`, item `aria-roledescription="sortable"`.
- Garden: `getGardenAriaLabel(stage, seasonName, timeOfDay)` produces a descriptive label. Decorative SVG groups use `aria-hidden="true"` + `data-testid` for tests.
- VerseOfTheDay share button: `aria-label`, `aria-haspopup="dialog"`, `aria-expanded`.
- Customize button (Dashboard.tsx:479): `aria-hidden` on decorator icon ✓.
- Skip link mounted in Navbar (canonical).
- 44px tap targets: pervasively present (GS Go button line 268-273, dismiss buttons, repair buttons, etc.).

### Accessibility gaps surfaced during recon

1. **Color contrast on `text-white/40` and `text-white/50`:**
   - `DashboardHero.tsx:122` icon `text-white/30` (decorative, OK with `aria-hidden`).
   - Multiple `text-white/40` and `text-white/50` text uses on ghosted/disabled state. Per design system: `text-white/50` is the floor for secondary interactive text but `text-white/40` is below it (decorative-only). Verify these are decorative, not interactive: `AnniversaryCard.tsx:52` "Dismiss" button uses `text-white/40` — this is interactive text below the floor.
   - `GettingStartedCard.tsx:259` completed-row `text-white/40` (line-through) — acceptable as completed/disabled state.
   - `RecentHighlightsWidget.tsx:43` `StickyNote text-white/40` (decorative, has aria-hidden ✓).

2. **Color contrast on `text-white/30`:**
   - `DashboardHero.tsx:123` Flame `text-white/30` when streak == 0 — decorative, has `aria-hidden` ✓.
   - `StreakCard.tsx:264` Flame `text-white/30` decorative.
   - `RecentHighlightsWidget.tsx:13` BookOpen `text-white/30` decorative.
   - All are decorative — but verify with `aria-hidden` strictly enforced.

3. **Focus management on expandable sections:**
   - DashboardCard collapse: focus stays on the button, content doesn't take focus when expanded — fine.
   - GettingStartedCard same pattern.
   - **Gap:** when a card auto-collapses or auto-dismisses (e.g., GettingStarted dismiss → fade out), focus is **not** restored to a logical location. The dismiss `onDismiss()` callback doesn't push focus anywhere after the card unmounts.

4. **Keyboard nav on Quick Actions tile grid:**
   - 4 NavLinks tab through correctly (no `tabindex`, no roving-tabindex).
   - Hover state `hover:scale-[1.02]` has matching `focus-visible:ring-2 focus-visible:ring-primary` ✓.
   - **Gap:** no `aria-label` on tile group; relies on link text "Pray", "Journal", "Meditate", "Music" alone. Acceptable but a `<nav aria-label="Quick actions">` wrapper would clarify.

5. **Screen reader on Friends/Leaderboard avatars:**
   - Avatars are `<div>` elements with `aria-hidden="true"` (good — initials are visual only).
   - `Link to={/profile/${id}}` wraps the avatar but lacks an `aria-label` — the link text alone (the friend's display name) covers the rest of the row ✓ (rank is visually shown, but readable via the row's flow).
   - **Gap:** no announcement of rank — "#1 Sarah 230 pts" reads as four separate fragments to a screen reader without a wrapping context.
   - **Gap:** rank colors (`text-medal-gold/silver/bronze`) carry medal semantic but only as visual cue; no `aria-label="1st place"`.

6. **`aria-live` on Faith Points / Streak counters:**
   - StreakCard line 208 `aria-live="polite"` on the streak counter row ✓.
   - DashboardHero FP counter does NOT have `aria-live` (line 146-150). The `<AnimatedCounter>` updates change the textNode but no live region announces it. **Gap:** FP increases aren't announced when the user records an activity.

7. **Crisis content:**
   - GratitudeWidget runs crisis detection on combined values (`combinedText`). Renders `<CrisisBanner>` with `role="alert"`. ✓

8. **MoodChart accessibility:**
   - sr-only summary present ✓.
   - SVG content rendered by Recharts uses no semantic structure — relying entirely on the role="img" wrapper ✓.

9. **CustomizePanel keyboard reorder:**
   - Implemented with `keyboardActiveIndex` + announcement live region ✓.
   - Drag handles are pointer-only? Actually buttons with `onPointerDown` AND keyboard via `onKeyDown` on the row — handle has its own `aria-label="Drag to reorder X"` ✓.

10. **Semantic HTML:**
    - `<main id="main-content">` ✓.
    - `<section aria-labelledby>` on each DashboardCard ✓.
    - `<h2>` per card title ✓ (ID via `useId()`).
    - DashboardHero greeting is `<h1>` ✓ (only one h1 per page rule).
    - `<ul>` / `<ol>` semantic absent in many list-shaped widgets (FriendsPreview top-3 is `<div>` not `<ol>`, MilestoneFeed is generic divs). Acceptable pattern in Worship Room codebase but a step toward AAA.

11. **Decorative icons:** every Dashboard surface I read has `aria-hidden="true"` on decorative lucide icons ✓.

---

## Part 10 — Performance and Rendering

### Heavy components on every visit

| Component | Cost | Notes |
|---|---|---|
| `GrowthGarden.tsx` (871 LOC, 2 simultaneous instances) | High | Two SVG instances rendered (mobile + desktop variants via `lg:hidden` + `hidden lg:block`). Both consume `gardenElements`, both run animation. **Both instances share `gardenRef` ref** (line 499 + 513) — only the visible one's ref is actually current, but both write to it. This is a likely bug or at minimum a leaky pattern. |
| `MoodChart` (Recharts LineChart) | Medium | Recharts is in its own `manualChunks` bundle. ResponsiveContainer + Customized + 2 Lines. |
| `BadgeGrid` overlay | Medium-low | Renders ~45 badges in 11 sections; only when user clicks "View all badges" or a recent-badge button. Lazy. |
| `DashboardHero` `useEffect` for FP glow | Low | Runs on every `totalPoints`/`prefersReduced` change. |
| `StreakCard` `useEffect` for FP glow | Low | Same pattern as DashboardHero — duplicated logic. |
| `useFaithPoints` hook | Medium | Reads 4 localStorage keys + does badge engine check on every record. |
| Background canvas / glow | None | Dashboard has no atmospheric layer. |

### Components fetching without useMemo / caching

- `RecentHighlightsWidget` — `getRecentBibleAnnotations(3)` runs on every render (no useMemo). Reads localStorage twice (highlights + notes).
- `StreakCard` — `getRecentBadges()` runs in `useMemo([])` — once on mount. ✓ (but the empty deps array means it never refreshes if a badge is earned mid-session).
- `TodaysDevotionalCard` — `useMemo([])` for `isRead`. ✓ (similar staleness).
- `Dashboard.tsx:369` `getRecentBibleAnnotations(1).length > 0` runs on every render (NOT memoized).
- `Dashboard.tsx:370` `getActiveChallenge() !== undefined` runs on every render.
- `useGettingStarted` reads `getGettingStartedData()` lazily once (correct), but the `useEffect` flag-sync runs on every `todayActivities` change.
- `useDashboardLayout` correctly memoizes via `useMemo([layout, timeOfDay, visibility])`.

### Re-render cascades

- DashboardWidgetGrid receives `faithPoints` (object), `quickActionsTooltipVisible`, `gettingStartedProps` (new object every render), `anniversaryProps` (new object every render), `eveningBannerProps` (new object every render). **Many props are new object references every render**, so `DashboardWidgetGrid` re-renders on every parent render. None of its children are memoized.
- The "garden sparkle effect" useEffect (Dashboard.tsx:315-331) runs on every `faithPoints.totalPoints` or `faithPoints.currentLevel` change — fine.
- `useFaithPoints` itself doesn't memoize the returned object. Every call re-creates `{ ...state, recordActivity, clearNewlyEarnedBadges, repairStreak }`.

### Image / SVG optimization

- GrowthGarden inline SVGs are large (~800×400 viewBox, multiple paths). Could be split into a `<svg use href>` library or extracted to per-stage components.
- CircleNetwork is small (~120×80) and inline ✓.
- No `<img>` / lossy assets on Dashboard.

### Rendering bottlenecks

- **The double GrowthGarden** is the biggest concern: 2 SVGs each ~800 lines of paths + animation. On low-end mobile, the offscreen one (desktop variant on mobile or vice versa) is in the DOM but `display:none` — still parsed and laid out.
- **InstallCard renders even when `!isInstallable`** — it returns `null` early but the JSX is still evaluated. Minor.
- **MoodChart loads recharts** (~50KB gz) eagerly on Dashboard mount — already on its own chunk via `manualChunks`, so fine.

---

## Part 11 — Cross-Cutting Concerns

### Sound effects fired on Dashboard

Via `useSoundEffects().playSoundEffect`:

- `bell` — "Reflect Now" click in EveningReflectionBanner → reflection overlay opens (Dashboard.tsx:581)
- `sparkle` — Anniversary card mount (AnniversaryCard.tsx:23), GettingStartedCard newly-completed item (line 64), Whisper toast for rainbow (Dashboard.tsx:348)
- `whisper` — StreakCard repair (line 180)
- `chime` — GratitudeWidget save (line 95), GardenShareButton success (line 53)
- `ascending` — StreakCard milestone reached (line 95)

Gated globally by `wr_sound_effects_enabled` and `prefers-reduced-motion`.

### Mount / state-change animations

- Page mount: `motion-safe:animate-fade-in` on `<main>` (line 460).
- Hero entrance: `motion-safe:animate-widget-enter` on hero wrapper (line 463) — 800ms one-time.
- Echo + GodMoments rows: `motion-safe:animate-widget-enter` with staggered `animationDelay: '100ms'`.
- Widget grid: each widget gets `motion-safe:animate-widget-enter` with `animationDelay: ${(staggerStartIndex + index) * 100}ms` (DashboardWidgetGrid.tsx:104).
- DashboardHero progress bar: width + box-shadow transition with `slow`/`base` durations + `decelerate` easing.
- StreakCard streak number: `motion-safe:animate-streak-bump` when entering at streak === 1.
- GardenSparkle: animated SVG sparkle for 1500ms after FP increase.
- GardenLevelUp: amplified sparkle when level increments.
- Reading plan progress bar: `transition-all duration-slow` (ReadingPlanWidget.tsx:144).
- Challenge ring: `motion-safe:transition-[stroke-dashoffset] motion-safe:duration-slow`.
- Activity ring: `transition: stroke-dashoffset ${slow}ms ${decelerate}` (inline).
- DashboardCard collapse: `transition-[grid-template-rows] duration-base ease-standard`.

### Toast notifications fired

- `useToast().showToast(...)`:
  - GratitudeWidget save: "Gratitude logged! Thank you for counting your blessings." (success).
  - InstallCard install accepted: "Worship Room is on your home screen now. Welcome home." (success).
- `useToastSafe().showCelebrationToast(...)`:
  - StreakCard repair: "Streak Restored!" + "${N}-day streak is back!" (celebration-confetti).
- `useToastSafe().showToast(...)`:
  - GardenShareButton: "Garden image saved." (success) or "We couldn't create the image. Try again." (error).
- `useChallengeNudge` (toast firing inside hook): "Day N of <challenge> waits for you →" pattern.
- `useChallengeAutoDetect` → `setChallengeCompletionOverlay` → ChallengeCompletionOverlay full-screen modal.
- `usePrayerReminders` (inside hook): toast for prayer items needing follow-up.
- `useGratitudeCallback` → `useWhisperToast` for atmospheric "remember when..." messages.
- Rainbow whisper: "A rainbow in your garden! 7 days of faithfulness." (sparkle, 6000ms).

### Modal triggers

- `<WelcomeWizard>` (phase = onboarding)
- `<WelcomeBack>` (phase = welcome_back)
- `<MoodCheckIn>` (phase = check_in)
- `<MoodRecommendations>` (phase = recommendations)
- `<EveningReflection>` (showReflectionOverlay)
- `<ChallengeCompletionOverlay>` (challengeCompletionOverlay set)
- `<CelebrationQueue>` → individual `<CelebrationOverlay>` instances per newly-earned badge
- `<GettingStartedCelebration>` (showGettingStartedCelebration)
- `<CustomizePanel>` (customizePanelOpen) — actually a side flyout, not a modal, but uses focus trap.
- `<BadgeGrid>` overlay (showBadgeGrid in StreakCard) — inline, replaces the streak content.
- `<SharePanel>` (sharePanelOpen in VerseOfTheDayCard).

### Routing side effects

- `useRoutePreload([DailyHub, MusicPage])` — fire-and-forget dynamic imports on mount. (line 70).
- `useNavigate` used for Customize URL param cleanup (line 86), challenge nudge navigation (line 107), GettingStarted Go button.
- URL param `?customize=true` opens CustomizePanel + `window.history.replaceState` clears it (line 84-87).

### Polling / real-time subscriptions

- **None.** Dashboard has no polling, websocket, or interval-based subscriptions. All data is read on mount + updated via user action.
- BB-46 `useEcho` is session-scoped, no polling.

---

## Part 12 — Scope Estimation and Risk Areas

### Total files in scope for migration

**Core dashboard surface:**

- 1 page (Dashboard.tsx — 644 LOC)
- 1 grid orchestrator (DashboardWidgetGrid.tsx — 365 LOC)
- 1 card chrome primitive (DashboardCard.tsx — 110 LOC)
- 1 hero (DashboardHero.tsx — 182 LOC)
- 16 widget components (sum ~3,000 LOC):
  - StreakCard (381), MoodChart (310), GettingStartedCard (283), ActivityChecklist (247), ReadingPlanWidget (243), GratitudeWidget (176), ChallengeWidget (169), FriendsPreview (157), VerseOfTheDayCard (45), TodaysDevotionalCard (61), PrayerListWidget (60), RecentHighlightsWidget (69), WeeklyRecap (61), QuickActions (26), AnniversaryCard (59), EveningReflectionBanner (45)
- 1 overlay (WeeklyGodMoments — 99)
- 1 install card (InstallCard — 51)
- 1 customize panel (CustomizePanel — 247)
- 2 badges (BadgeGrid — 243)
- 1 garden share button (GardenShareButton — 73)
- 1 circle network SVG (CircleNetwork — 29)
- 1 garden (GrowthGarden — 871 LOC + garden/* sub-files) **— probably out of scope unless visual changes are required; the SVG palette is already a documented exception.**

**Tests in scope:** 56 test files (~11,112 LOC). Most will pass through unchanged but a few will need class-string updates.

**Approximate LOC in scope (core surface, excluding GrowthGarden internals):** ~6,000 LOC of source + significant test surface.

### Suggested split into sub-specs

I recommend a **3-spec migration** with optional tail spec:

#### **Spec 4A — Dashboard Card Chrome + Hero Primitives**
- Migrate `DashboardCard` to use FrostedCard (or design-system-aligned chrome).
- Update DashboardHero greeting, streak strip, FP progress bar to align with Round 3 typography + opacity standards.
- Migrate the rolls-own cards (GettingStartedCard, AnniversaryCard, EveningReflectionBanner, InstallCard, WeeklyGodMoments) to share a single primitive or accept a tier prop.
- Update AnimatedCounter glow approach if needed.
- Update `text-primary` ghost links to white/80 + chevron.
- Verify ~12 widgets that wrap in DashboardCard render correctly through the new chrome.
- **Risk: many tests assert chrome class strings.**

#### **Spec 4B — Data Widgets + Chart**
- MoodChart: empty state polish, tooltip restyle, dot colors review.
- StreakCard: badge pills restyle, repair-button pattern, consider extracting AnimatedCounter glow logic.
- ActivityChecklist: ring color + size review, item list typography.
- VerseOfTheDayCard: keep Lora italic for verse (allowed), update share button + meditate link.
- TodaysDevotionalCard, ReadingPlanWidget, PrayerListWidget, RecentHighlightsWidget, ChallengeWidget, GratitudeWidget: copy + CTA pattern alignment.
- BadgeGrid restyle.

#### **Spec 4C — Social, Recap & Action Tiles**
- FriendsPreview: leaderboard ranked-list visual restyle, empty-state CircleNetwork polish, MilestoneFeed integration.
- WeeklyRecap, WeeklyGodMoments: align to the new banner pattern.
- QuickActions: tile grid restyle (white-pill or violet glow alignment).
- CustomizePanel: align to AudioDrawer flyout patterns if that's the target.

#### **Optional Tail Spec — Hero Garden + Modals**
- GrowthGarden: only if Eric wants the earth-tone palette restyled (NOT recommended — it's a documented exception that works).
- WelcomeWizard, WelcomeBack, MoodCheckIn, MoodRecommendations, EveningReflection: full-screen modals — separate visual sweep.
- GettingStartedCelebration: align ceremony overlays to drop Caveat font.
- CelebrationOverlay/CelebrationQueue: visual review.

### Risk areas needing product decisions

1. **GrowthGarden palette is an intentional exception.** The earth-tone, leaf-green, sky-blue palette is OFF the violet/dark design system. **Decision needed:** Keep as exception, restyle violet, or replace with a different metaphor? My recommendation: keep as exception — it's the brand's signature visual.
2. **Two checklist patterns exist** (GettingStartedCard vs ActivityChecklist). They have different progress ring sizes (48 vs 60), different item structures (6 fixed vs 7-12 dynamic), different dismissal models, but visually close. **Decision needed:** unify into one primitive with variants, or keep distinct?
3. **`bg-primary` solid buttons everywhere.** ~10+ instances of `bg-primary px-4 py-2 rounded-lg` solid buttons. **Decision needed:** migrate all to white-pill CTA pattern, or keep some (e.g., InstallCard, EveningReflection within-modal) as solid violet?
4. **Leaderboard exposes social comparison.** FriendsPreview shows ranked weekly points. **Decision needed:** is the medal-color rank treatment + "You contributed N% of the group's growth!" copy aligned with anti-pressure principles? Per `01-ai-safety.md` and the master plan, comparison-based copy is borderline — verify Eric is OK with current treatment.
5. **The full set of holidays for the seasonal greeting.** `useLiturgicalSeason` covers Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time. **Decision needed:** are there secular holidays / civic holidays we want to add (e.g., Thanksgiving)? Likely no — liturgical seasons are the canonical set per CLAUDE.md.
6. **Default ordering by time-of-day.** `TIME_OF_DAY_ORDERS` reorders the dashboard 4 times per day. **Decision needed:** is this discoverable enough? Users may not realize they can customize — or may be confused when the order shifts on them. Could the migration introduce a one-time "Notice — your dashboard reorders by time of day" tooltip?
7. **WeeklyRecap is rendered always** (`hasFriends || recapVisible`). The empty state ("Add friends to see your weekly recap") shows for solo users on every render. **Decision needed:** keep the empty state always-visible, or hide unless `hasFriends` AND `recapVisible`? Currently `showRecap = recapVisible || !recapHasFriends` — so it shows for users without friends as a perpetual prompt to add some. May be anti-pressure violating.
8. **InstallCard pinned to grid-end via `style={{ order: 9999 }}`.** Hardcoded magic number. Consider making it a first-class widget ID with explicit ordering rules.
9. **MoodChart empty-state uses opacity-15 hardcoded `EMPTY_STATE_DATA`** with mood-specific colors. **Decision needed:** is the ghosted-chart-with-overlay approach the right pattern for empty states? Could `FeatureEmptyState` replace it?
10. **`DashboardCard` is the only consumer-side primitive used by ~12 widgets**, so updating it propagates to all of them automatically — but it also means a single change touches the entire surface. Test risk is concentrated.
11. **Dashboard double-mounts GrowthGarden** for responsive variants — both write to the same `gardenRef`. Verify this doesn't cause a stale-ref bug for GardenShareButton on viewport resize.

---

## Part 13 — Open Questions for Eric

1. **GrowthGarden hero illustration palette** — earth tones, leaves, blue sky, NOT violet. Keep as a deliberate exception (recommended), restyle to align with the rest of the dark theme, or replace with a different metaphor entirely?
2. **Two checklist patterns (GettingStartedCard vs ActivityChecklist)** — should they share a primitive, or are the differences in row-count/dismissibility/Go-button intentional enough to keep them distinct?
3. **Solid `bg-primary` buttons** — ~10+ instances. Migrate all to the Round 3 white-pill CTA pattern, or keep some as solid violet (e.g., inside modals/overlays where the white pill would conflict with the modal backdrop)?
4. **FriendsPreview leaderboard treatment** — gold/silver/bronze medal colors + "You contributed N% of the group's growth!" copy. Aligned with anti-pressure principles, or does the comparison framing need softening?
5. **Full set of holidays / liturgical greetings** — `useLiturgicalSeason` covers the 7 standard liturgical seasons. Should secular holidays (Thanksgiving, US Independence Day, Mother's/Father's Day) get greeting treatment, or stay liturgical-only?
6. **Time-of-day reordering** — default widget order shifts 4 times per day (morning/afternoon/evening/night). Is this discoverable enough, or should the migration introduce a one-time tooltip explaining it?
7. **WeeklyRecap empty state** — currently shows "Add friends to see your weekly recap" perpetually for solo users. Anti-pressure compliant, or should the entire widget hide until the user has friends?
8. **VerseOfTheDayCard** — currently uses `font-serif italic` for the verse text. Per design-system rules, Lora italic is acceptable for scripture display. Keep, or migrate to non-italic with serif?
9. **Inline glow on FP progress bar** — direction-aware shadow (violet on increase, amber on decrease). Worth keeping as-is, or simplify to one-direction-only (or remove entirely in favor of the AnimatedCounter feedback)?
10. **InstallCard pinned to bottom via `style={{ order: 9999 }}`** — promote to first-class widget ID with explicit ordering rules, or keep the magic-number escape hatch?
11. **MoodChart empty state** — ghosted-chart-with-overlay approach. Replace with `FeatureEmptyState` for consistency with other empty states, or keep the ghosted preview as a teaser (it does showcase what the chart will look like)?
12. **Light-tier vs dark-tier visual peak** — Dashboard has no atmospheric layer (HorizonGlow). Is the flat `bg-dashboard-dark` intentional vs. introducing a Dashboard-specific HorizonGlow variant?
13. **DashboardCard `text-primary` ghost links** — migrate all to `text-white/80` per Round 3 standard, or keep `text-primary-lt` for action prominence?
14. **Customize panel** — currently a hybrid (mobile bottom sheet, desktop right-side flyout). Should it converge with `AudioDrawer` chrome for design consistency, or stay distinct?
15. **Anniversary + GettingStartedCelebration use `font-script` Caveat** — these are ceremony moments. Migrate to gradient text per Round 3, or keep Caveat as a "ceremonial exception"?
16. **GrowthGarden double-mount** — two SVG instances (mobile + desktop variants) sharing a single ref. Bug risk on viewport resize for share-image generation. Worth a fix during this migration?

---

**Key files for Eric to review (absolute paths):**

- `/Users/eric.champlin/worship-room/frontend/src/pages/Dashboard.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/DashboardHero.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/DashboardCard.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/DashboardWidgetGrid.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/StreakCard.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/MoodChart.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/GettingStartedCard.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/ActivityChecklist.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/CustomizePanel.tsx`
- `/Users/eric.champlin/worship-room/frontend/src/constants/dashboard/widget-order.ts`
- `/Users/eric.champlin/worship-room/frontend/src/hooks/useDashboardLayout.ts`
- `/Users/eric.champlin/worship-room/frontend/src/hooks/useFaithPoints.ts`
- `/Users/eric.champlin/worship-room/frontend/src/components/dashboard/GrowthGarden.tsx` (871 LOC; the largest single component on the surface)
