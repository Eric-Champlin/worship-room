# Spec 10B: Insights + MonthlyReport

**Master Plan Reference:** Direction document at `_plans/direction/settings-insights-2025-05-05.md` is the locked decision set for the Settings/Insights cluster. (Note: the brief references `2026-05-05.md` but the on-disk file is `2025-05-05.md` — surface the discrepancy in pre-execution recon and use the on-disk path.) Recon at `_plans/recon/settings-insights-2026-05-05.md` is the source of truth for current Insights.tsx + MonthlyReport.tsx line numbers, the `font-script` and `text-white/85` audit results, the silent-mock-fallback location in `useMonthlyReportData`, and the 18-component InsightsDataContext consumer inventory. Spec 10B is the **second sub-spec** of the Settings/Insights cluster — it consumes patterns established by Spec 10A (active-state muted-white at `bg-white/15 text-white border border-white/30`, severity color system migration, white-pill primary CTA Pattern 2, `font-script` removal, and any cluster-level conventions surfaced during 10A's execution). Spec 10A is a prerequisite — must be merged into the working branch before 10B starts. Specs 1A–9 are also prerequisites — all merged at the time of writing.

This is a **large spec**. ~2,500 LOC of source edits + ~2,100 LOC of test updates spread across the Insights cluster: 2 page files (`Insights.tsx`, `MonthlyReport.tsx`), 18 insight component files (test-update set), 1 hook file (`useMonthlyReportData.ts`), and 1 new context file (`contexts/InsightsDataContext.tsx`). The work is broad-but-mechanical with three concentrated areas of behavioral change: (a) **InsightsDataContext perf hoist** (Direction Decision 12) — replaces 5+ direct `getMoodEntries()` calls in the Insights tree with a single context provider that reads once and memoizes, then migrates each consumer to `useInsightsData().moodEntries`; (b) **MonthlyReport empty-state fix** (Direction Decision 11) — drops the silent-mock-fallback branch in `useMonthlyReportData` and renders the canonical `<FeatureEmptyState>` for empty months instead of fabricated mock data; (c) **Insights light-touch narrative additions** (Direction Decision 13) — replaces the `font-serif italic` "Reflect on your journey" subtitle with a warmer narrative one-liner (computed from the user's mood data, with a returning-after-gap variant), adds a Daily-Hub-aligned time-of-day greeting above the h1, and promotes the `MonthlyShareButton` above the fold on MonthlyReport. The remaining migrations (Decision 2 active-state on TimeRangePills, Decision 5 `font-script` removals × 2, Decision 6 subtitle migration, Decision 11 `text-white/85` heading on MonthlyReport) are pure pattern application against patterns 10A already shipped.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/settings-insights-2026-05-05.md`, `_plans/direction/settings-insights-2025-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

**Note on the 18-component count.** The brief's component checklist enumerates 18 components in `frontend/src/components/insights/` whose test files require migration to the Provider wrapper pattern. However, the canonical `getMoodEntries()` consumer set is determined by grep, not by enumeration. Pre-execution recon Step 5 captures the actual call sites. As of brief audit time, only 5 components (`InsightCards.tsx`, `GratitudeCorrelationCard.tsx`, `CommunityConnections.tsx`, `CalendarHeatmap.tsx`, `PrayerLifeSection.tsx`) plus the 2 page files (`Insights.tsx`, `MonthlyReport.tsx`) call `getMoodEntries()` directly — the other 13 components consume mood data via props from parents or do not need mood entries at all. The Change 5 production migration applies to whatever the grep returns; the test-update set may still cover all 18 component test files because tests use `vi.mock('@/services/mood-storage')` and the Provider wrapper pattern shifts the mock injection point regardless of whether the component itself reads from the context. Pre-execution recon resolves the exact split.

---

## Affected Frontend Routes

- `/insights` — protected route (logged-out → `<Navigate to="/" replace />` per the existing `Insights.tsx` mount-time auth check, preserved exactly). Hero section migrates: the inner `<span class="font-script">Insights</span>` wrapper around the h1 word "Insights" is removed (`font-script` removal — Decision 5); the `font-serif italic text-white/60` "Reflect on your journey" `<p>` migrates to canonical body prose with a computed narrative one-liner (Decision 6 + Decision 13); a Daily-Hub-aligned time-of-day greeting `<p>` is added immediately above the h1 (Decision 13); the `bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero are preserved exactly (Decision 1). The TimeRangePills selected pill chrome migrates from `bg-primary/20 text-primary-lt` to `bg-white/15 text-white border border-white/30` (Decision 2 — muted-white isolated-pill variant). All 11 `AnimatedSection` wrappers, all chart components (`MoodTrendChart`, `CalendarHeatmap`, `MeditationHistory`, `InsightCards`, `ActivityCorrelations`, `ActivityBarChart`, `PrayerLifeSection`, `CommunityConnections`, `ScriptureConnections`, `GratitudeStreak`, `GratitudeCorrelationCard`), all Recharts theming, all useMemo aggregations, and all behavioral semantics are preserved exactly. The page wraps in `<InsightsDataProvider>` so child components consume `moodEntries` via context rather than calling `getMoodEntries()` directly (Decision 12).
- `/insights/monthly` — protected route. Hero section migrates: the inner `<span class="font-script">Report</span>` wrapper around the h1 word "Report" is removed (Decision 5); the `text-white/85` non-canonical opacity on the `monthLabel` `<p>` migrates to canonical `text-white` (Decision 11). The page now branches on `hasData` from `useMonthlyReportData(month, year)`: when `hasData` is `false`, the body renders a `<FeatureEmptyState>` with anti-pressure copy ("This month is just beginning" for current month, `No entries yet for ${monthLabel}` for past months) instead of the silent-mock-fallback that previously fabricated content (Decision 11). When `hasData` is `true`, the existing 7 `AnimatedSection` wrappers (`MonthlyStatCards`, `MonthHeatmap`, `MonthlyHighlights`, `MonthlyInsightCards`, `MonthlySuggestions`, `EmailPreviewModal` mount, etc.) render normally. The `<MonthlyShareButton>` is promoted from its current bottom-of-page placement to immediately after the month pager / hero section (above the fold) and only renders when `hasData` is `true` (Decision 13 — no point sharing an empty report). The page wraps in `<InsightsDataProvider>` (Decision 12). Atmospheric layer preserved (Decision 1). All `bg-white/5` rolls-own card chrome across the 18 components is preserved (Decision 21 — defer FrostedCard adoption sweep to Spec 10c).
- `/insights/monthly?month=N&year=YYYY` (or whatever the existing month-pager param convention is — recon Step 4 confirms) — same hero migrations + same empty-state branching + same MonthlyShareButton placement as `/insights/monthly`. The month pager interaction (← previous, today, → next) is preserved exactly. Empty-state copy reads "This month is just beginning" only when the requested month equals the current month (per `isCurrentMonth` from the hook); past months read `No entries yet for ${monthLabel}`.

The single non-route effect: 21+ test files (`pages/__tests__/Insights.test.tsx`, `pages/__tests__/MonthlyReport.test.tsx`, the 18 component test files in `components/insights/__tests__/`, `hooks/__tests__/useMonthlyReportData.test.ts`, and a new `contexts/__tests__/InsightsDataContext.test.tsx`) get class-string assertions migrated, narrative-subtitle + greeting tests added, empty-state tests added, MonthlyShareButton placement tests updated, Provider wrapper pattern adopted in component tests, and the new context file's smoke tests added. Behavioral assertions (chart rendering, data aggregation logic, useMemo computations, time-range pill arrow-key roving, empty-state copy variations, MonthlyShareButton Canvas image generation, `EmailPreviewModal` rendering, `PrayerLifeSection` active/answered/answer-rate logic, `CommunityConnections` null-when-no-visits, `ScriptureConnections` mock-references-with-mood-dots, `GratitudeStreak` null-when-streak<2, `GratitudeCorrelationCard` mood-on-gratitude-days vs other-days) are preserved.

---

## Overview

Insights and MonthlyReport are the last two surfaces in the Round 4 cluster sweep that haven't fully adopted the canonical patterns. Spec 10A shipped the Settings shell and its three modals, locking in the cluster pattern decisions (active-state muted-white at `bg-white/15`, severity color system, white-pill primary CTA Pattern 2, URL-backed tab state, `font-script` removal). Spec 10B is mechanical pattern application against those already-canonical decisions, plus three concentrated additions specific to the Insights surface: a perf hoist via `InsightsDataContext`, an empty-state fix on MonthlyReport that closes a silent-mock-fallback bug, and three light-touch narrative enhancements on the Insights hero.

The `InsightsDataContext` perf hoist (Direction Decision 12) is the most consequential change. Today, every chart/section component on `/insights` and `/insights/monthly` that needs mood data calls `getMoodEntries()` directly. Per the canonical grep rule (pre-execution recon Step 5), the actual call set is 5 components plus 2 page files — but every duplicate call iterates the entire `wr_mood_entries` array, redundantly. With a year of data, that's potentially hundreds of entries scanned 5+ times on every cold load. The fix is a unified React Context (`contexts/InsightsDataContext.tsx`) whose provider reads `getMoodEntries()` once via `useMemo`, exposes the raw array as `moodEntries`, exposes a derived `getMonthlyEntries(month, year)` selector for MonthlyReport consumers, and throws a clear error when used outside the provider. Each consumer migrates from `const entries = getMoodEntries()` to `const { moodEntries: entries } = useInsightsData()` — the per-component useMemo filtering / aggregation logic is preserved exactly. The provider wraps `Insights.tsx` and `MonthlyReport.tsx` at the page root. Test files update from `vi.mock('@/services/mood-storage')`-then-render to `vi.mock('@/services/mood-storage')`-then-render-inside-`<InsightsDataProvider>`. Cold-load `getMoodEntries()` calls drop from 5+ to 1 per page mount.

The MonthlyReport empty-state fix (Direction Decision 11) closes a privacy-adjacent UX bug. Today, when a user visits `/insights/monthly` for a month with zero mood entries — the most common case for a brand-new user, or for any user navigating to a past month before they joined — the `useMonthlyReportData` hook silently falls back to mock data, fabricating numbers, charts, and highlights that don't represent the user at all. The user sees a complete-looking report with no indication that the data is fake. Spec 10B drops the silent-mock-fallback branch, returns a clean empty state (`hasData: false`, zero counts, empty arrays), and renders the canonical `<FeatureEmptyState>` (the same primitive used across Prayer Wall, My Bible, Friends — see `09-design-system.md` § "FeatureEmptyState"). The empty-state copy is anti-pressure: current-month empty reads "This month is just beginning. Check back at the end of the month for your report." Past-month empty reads `No entries yet for ${monthLabel}. The report will populate as you add mood entries and journal pages.` No streak shaming, no "you missed N days," no fake numbers.

The Insights hero light-touch narrative additions (Direction Decision 13) are intentionally small. The current subtitle "Reflect on your journey" is `font-serif italic text-white/60` — the `font-serif italic` styling was deprecated for prose body text in Wave 5 (`09-design-system.md` § "Daily Hub body text readability standard"), and the copy itself is generic enough to feel like default text. Spec 10B replaces it with a computed narrative one-liner that may read "Your story is just beginning." (zero entries), "Welcome back. Your story continues." (returning after a 14+ day gap), or "Your story so far." (standard returning-user case). The computation is simple — derived from `moodEntries.length` and the timestamp of the last entry — and falls back to the standard case if the data is malformed. A time-of-day greeting `<p>` is added immediately above the h1, matching the Daily Hub pattern verified during pre-execution recon Step 10 (e.g., "Good morning" before 11am, "Hello" 11am–5pm, "Good evening" after 5pm). If the user has a display name and the Daily Hub pattern includes the name, the Insights greeting includes the name too — matching the precedent rather than inventing a parallel pattern. The MonthlyShareButton placement promotion is the third light-touch item: a Web Share + Canvas image generation affordance that today lives at the bottom of the page (after the user has scrolled past every chart) gets promoted to immediately below the hero, where it surfaces the share affordance at the emotional peak of the page rather than the end.

The atmospheric layer is preserved per Direction Decision 1: `bg-dashboard-dark` body root and `ATMOSPHERIC_HERO_BG` hero stay exactly as they are on both pages. No `BackgroundCanvas`, no `HorizonGlow`, no `GlowBackground` is introduced — those are canonical for the homepage hero and Daily Hub root patterns, but the inner-page atmospheric pattern (which Insights shares with Settings, Friends, Grow, MyPrayers) is the right home for Insights, not the homepage hero pattern.

The rolls-own `bg-white/5` / `bg-white/[0.06]` / `bg-white/[0.08]` card chrome scattered across the 18 insight components is preserved per Direction Decision 21. Each component reproduces a close-but-not-identical class string for its card wrapper. They could all be migrated to the canonical `<FrostedCard>` component for visual cohesion, but the recon notes the visual rendering is already close enough to canonical, and the migration would be ~30 LOC of mechanical changes across 18 files with no visual delta. Defer to Spec 10c if visual cohesion becomes a complaint post-launch.

The behavioral semantics that must NOT change in this spec: every Recharts chart's rendering (lines, bars, dots, axes, tooltips, legend), every useMemo aggregation's computed output (mood trend averages, day-active counts, points-earned totals, streak length, badge eligibility, best-mood detection, top-activity detection), every chart's responsive sizing, the `CalendarHeatmap` 7-row-by-N-week grid, the `MoodTrendChart` morning + evening dot rendering with moving-average overlay, the `MeditationHistory` stacked BarChart by type, the 4 `InsightCards` rotation by `getDayOfYear()`, the `MonthlyStatCards` count-up animation, the `MonthlyHighlights` longest-streak / badges-earned / best-day computation, the `MonthlyShareButton` Canvas image generation logic + Web Share API wiring, the `EmailPreviewModal` mount/dismiss behavior, the `PrayerLifeSection` active / answered / answer-rate computation, the `CommunityConnections` null-when-no-visits guard, the `ScriptureConnections` 4-mock-references-with-mood-colored-dots rendering, the `GratitudeStreak` null-when-streak<2 guard, the `GratitudeCorrelationCard` mood-on-gratitude-days-vs-other-days comparison, the TimeRangePills 5-window inventory (30d / 90d / 180d / 1y / All) + 30d default + arrow-key roving + `role="radiogroup"` / `role="radio"` / `aria-checked` + `tabIndex` roving, the `Insights.tsx` route-level redirect for logged-out users (`<Navigate to="/" replace />`), and the `MonthlyReport.tsx` month-pager param parsing and navigation. After 10B ships, every documented hero migration listed in Acceptance Criteria below has been applied; every documented behavioral preservation is intact; every documented out-of-scope item is untouched.

---

## User Story

As a **logged-in user navigating to `/insights`** to review my mood patterns and see how I'm growing, I want the page hero to feel as warm and personal as the rest of the app. Today the hero subtitle reads "Reflect on your journey" in `font-serif italic` — generic copy in a deprecated style that competes with the Daily Hub's body-prose canonical. After 10B, the subtitle reads "Your story so far." (or "Welcome back. Your story continues." if I'm returning after a gap, or "Your story is just beginning." if I have no entries yet) in canonical body prose, no italic. A time-of-day greeting renders just above the h1 — matching the Daily Hub greeting I see on the dashboard — so the page feels like a continuous companion rather than a disconnected analytics dashboard.

As a **logged-in user navigating to `/insights/monthly` for the current month** in the first week of a new month before I've logged any entries, I want the page to acknowledge that the report isn't ready yet rather than fabricate fake data. Today the page silently falls back to mock data — invented numbers, fake charts, fabricated highlights — and presents them as if they were my own. After 10B, the page renders a `<FeatureEmptyState>` with the message "This month is just beginning. Check back at the end of the month for your report." No fake numbers. No misleading charts. The empty state is anti-pressure — it's a quiet acknowledgment, not a "you haven't done anything" reprimand. When I navigate to a past month I wasn't using the app for, the empty state reads `No entries yet for ${monthLabel}. The report will populate as you add mood entries and journal pages.` Same anti-pressure tone, different copy for the temporal context.

As a **logged-in user reviewing my MonthlyReport for last month**, I want the share affordance to be discoverable. Today the `<MonthlyShareButton>` lives at the very bottom of the page, after every chart and section — by the time I reach it I've already moved on. After 10B, the button is promoted above the fold, immediately below the hero and month pager, where it surfaces at the emotional peak of the page rather than the end. The Canvas image generation, Web Share API wiring, share-preview rendering, and all underlying behavior are preserved exactly — only the placement changes. The button is hidden when the month has no data (no point sharing an empty report).

As a **future spec author working on Insights features**, I want the data-access pattern to be canonical and ready to extend. After 10B, every component on `/insights` and `/insights/monthly` consumes mood data via `useInsightsData()` rather than calling `getMoodEntries()` directly. The provider reads once via `useMemo`, exposes the raw `moodEntries: MoodEntry[]` array plus a `getMonthlyEntries(month, year)` selector, and throws a clear error if a consumer is mounted outside the provider. Adding a new chart or section component is straightforward — import `useInsightsData`, destructure the data, write the per-component useMemo aggregation. No more redundant `getMoodEntries()` calls. Tests use a `<InsightsDataProvider>` wrapper around the rendered component, with `vi.mocked(getMoodEntries).mockReturnValue(...)` controlling the test data — the same mocking discipline as before, just re-routed through the provider.

As a **user opening the TimeRangePills component on `/insights`**, I want the selected pill to look like the rest of the app's active-state styling. Today the selected pill renders in `bg-primary/20 text-primary-lt` — saturated violet that is visually inconsistent with Spec 10A's cluster pattern (where `RadioPillGroup` and the Settings tablist active-state both use `bg-white/15`). After 10B, the selected TimeRangePills pill renders in `bg-white/15 text-white border border-white/30` — the muted-white isolated-pill variant per Direction Decision 2. The arrow-key roving (`ArrowLeft`/`ArrowRight` to navigate, wraparound, `tabIndex` 0 on the active pill, -1 on inactive), `role="radiogroup"`, `role="radio"`, `aria-checked`, and the existing 5 time-range windows (30d / 90d / 180d / 1y / All) are all preserved exactly.

---

## Requirements

### Functional Requirements

1. **InsightsDataContext provider creation (Change 1a).** Create `frontend/src/contexts/InsightsDataContext.tsx` exporting `InsightsDataProvider`, `useInsightsData`, and the internal `InsightsDataContextValue` type. The provider reads `getMoodEntries()` once via `useMemo(() => getMoodEntries(), [])` and exposes:
   - `moodEntries: MoodEntry[]` — the raw, unfiltered array
   - `getMonthlyEntries: (month: number, year: number) => MoodEntry[]` — derived selector that filters `moodEntries` to the given month/year. The selector is itself memoized (the `value` object passed to `<InsightsDataContext.Provider>` is wrapped in a `useMemo` keyed on `moodEntries`).

   The hook `useInsightsData()` reads from `useContext(InsightsDataContext)`. If the context is `null` (the default — meaning the consumer is mounted outside the provider), the hook throws `Error('useInsightsData must be used within InsightsDataProvider')`. This is a developer-experience guard — every consumer should receive a clear stack trace on misuse rather than a silent runtime failure.

2. **Provider wrap on Insights.tsx and MonthlyReport.tsx (Change 1b).** Wrap the existing return JSX in both page files with `<InsightsDataProvider>...</InsightsDataProvider>`. The wrap goes immediately inside the function-component return, around the top-level `<div className="min-h-screen bg-dashboard-dark">` (or whatever the existing root wrapper is — pre-execution recon confirms the exact pattern). The atmospheric layer (`bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero) is preserved exactly inside the provider.

3. **Migrate direct `getMoodEntries()` callers in the Insights tree to `useInsightsData()` (Change 1c + Change 5).** Pre-execution recon Step 5 captures the canonical call-site list via grep. Each call site replaces:

   ```tsx
   import { getMoodEntries } from '@/services/mood-storage'
   // ...
   const entries = getMoodEntries() // or useMemo(() => getMoodEntries(), [])
   ```

   with:

   ```tsx
   import { useInsightsData } from '@/contexts/InsightsDataContext'
   // ...
   const { moodEntries: entries } = useInsightsData()
   ```

   For MonthlyReport-specific consumers that need a monthly slice:

   ```tsx
   const { getMonthlyEntries } = useInsightsData()
   const entries = useMemo(() => getMonthlyEntries(month, year), [month, year, getMonthlyEntries])
   ```

   Each component's existing useMemo filtering / aggregation logic is preserved exactly. The context exposes raw data only — per-component derivations (TimeRange filtering, monthly slicing, chart-specific shaping) stay in the component. The expected production-migration set per current grep is `InsightCards.tsx`, `GratitudeCorrelationCard.tsx`, `CommunityConnections.tsx`, `CalendarHeatmap.tsx`, `PrayerLifeSection.tsx`, `Insights.tsx`, and `MonthlyReport.tsx`. The brief enumerates 18 component files — pre-execution recon resolves the actual production-migration set vs. the test-update-only set. **The grep is canonical source of truth.** Any component the grep flags must migrate; any component the grep doesn't flag must not change in production code regardless of the brief's checklist position.

4. **Verification (Change 1d).** After the production migration, the post-migration grep must return zero direct `getMoodEntries()` calls in `frontend/src/components/insights/`, `frontend/src/pages/Insights.tsx`, and `frontend/src/pages/MonthlyReport.tsx`. The only legitimate match is the provider's internal call inside `frontend/src/contexts/InsightsDataContext.tsx`. Run:

   ```bash
   grep -rn "getMoodEntries" frontend/src/components/insights/
   grep -rn "getMoodEntries" frontend/src/pages/Insights.tsx
   grep -rn "getMoodEntries" frontend/src/pages/MonthlyReport.tsx
   ```

   Expect zero matches in components/insights/ and zero direct calls in the page files.

5. **`font-script` removal in Insights.tsx h1 (Change 2a).** In `frontend/src/pages/Insights.tsx` (line 203 area per recon — pre-execution Step 3 confirms exact line), remove the `<span className="font-script">Insights</span>` wrapper around the inner h1 word. Replace with plain `Insights` text. The parent h1 element's `id="insights-heading"`, `style={GRADIENT_TEXT_STYLE}`, font sizing classes, and aria-labelledby reference are preserved exactly — only the inner span is removed. The h1's outer text already provides emphasis via `GRADIENT_TEXT_STYLE`.

6. **Insights subtitle migration + computed narrative (Change 2b — Direction Decision 6 + 13).** In `frontend/src/pages/Insights.tsx` (line 205 area), replace the existing `<p className="font-serif italic text-base text-white/60 sm:text-lg">Reflect on your journey</p>` with a canonical body-prose `<p className="text-white/60 text-base sm:text-lg">{narrativeSubtitle}</p>` where `narrativeSubtitle` is computed via `useMemo`:

   ```tsx
   const { moodEntries } = useInsightsData()
   const narrativeSubtitle = useMemo(() => {
     if (moodEntries.length === 0) return 'Your story is just beginning.'
     const lastEntry = moodEntries[moodEntries.length - 1]
     const daysSinceLast = Math.floor(
       (Date.now() - new Date(lastEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24)
     )
     if (daysSinceLast > 14) return 'Welcome back. Your story continues.'
     return 'Your story so far.'
   }, [moodEntries])
   ```

   The subtitle uses `font-sans` Inter (default), no italic, the `text-white/60` opacity already meets WCAG AA on `bg-dashboard-dark` per `09-design-system.md` § "Text Opacity Standards". If the computation is too complex during execution OR the recon surfaces an issue with the data shape, fall back to Option A (static warmer copy: `'Your story so far.'`). The Option B computation is the recommended path. The `mb-3 px-1 sm:px-2` spacing and `pb-2` from the h1 above are preserved.

7. **Time-of-day greeting on Insights hero (Change 2c — Direction Decision 13).** Add a `<p className="text-white/50 text-sm mb-2">{greeting}</p>` immediately ABOVE the h1 `<h1 id="insights-heading">`. The greeting computation:

   ```tsx
   const greeting = useMemo(() => {
     const hour = new Date().getHours()
     if (hour < 11) return 'Good morning'
     if (hour < 17) return 'Hello'
     return 'Good evening'
   }, [])
   ```

   **CRITICAL:** Pre-execution recon Step 10 reads the canonical Daily Hub greeting implementation (likely in `pages/DailyHub.tsx` or a `components/daily/` helper). Use the Daily Hub's exact thresholds + copy variants verbatim — do NOT invent parallel thresholds. If the Daily Hub uses different boundary hours (e.g., 12pm / 6pm rather than 11am / 5pm), match those. If the Daily Hub greeting includes the user's display name when authenticated (`Good morning, ${displayName}`), the Insights greeting includes the display name too. If the Daily Hub uses just the bare greeting, do the same. The point is consistency with the Daily Hub precedent, not invention.

8. **Welcome-back warmth on returning-after-gap (Change 2d).** Already covered by Functional Requirement 6's Option B computation — the narrative subtitle reads `'Welcome back. Your story continues.'` after a 14+ day gap from `lastEntry.timestamp`. No additional UI change required if Option B is implemented. If Option A (static warmer copy) is used as the fallback, file a follow-up note in the spec acceptance to surface the gap detection in a future spec.

9. **TimeRangePills selected-pill chrome migration (Change 3a — Direction Decision 2).** In the TimeRangePills component (currently inline in `frontend/src/pages/Insights.tsx` at line ~110-130, or in a separate `components/insights/TimeRangePills.tsx` — pre-execution Step 7 confirms file location), migrate the selected pill's class string:

   - **Before:** `'min-h-[44px] rounded-full bg-primary/20 px-4 py-2 text-sm font-medium text-primary-lt transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'`
   - **After:** `'min-h-[44px] rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white border border-white/30 transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'`

   The inactive pill class string is preserved exactly. The arrow-key roving handler, `role="radiogroup"`, `role="radio"`, `aria-checked`, `tabIndex={selected ? 0 : -1}`, the 5 time-range options (30d / 90d / 180d / 1y / All), and the 30d default are all preserved exactly.

10. **MonthlyReport `font-script` removal (Change 4a — Direction Decision 5).** In `frontend/src/pages/MonthlyReport.tsx` (line 110 area per recon — pre-execution Step 4 confirms exact line), remove the `<span className="font-script">Report</span>` wrapper around the inner h1 word. Replace with plain `Report`. The parent h1's id, `style={GRADIENT_TEXT_STYLE}`, font sizing, and aria-labelledby are preserved exactly.

11. **MonthlyReport `text-white/85` migration (Change 4b — Direction Decision 11).** In `frontend/src/pages/MonthlyReport.tsx` (line 121 area), the `monthLabel` `<p>` migrates from the non-canonical `text-white/85` opacity to canonical `text-white`. All other classes on that paragraph (font sizing, spacing, alignment) are preserved. `text-white/85` is not a canonical opacity in the project's text-opacity standards (`text-white`, `text-white/70`, `text-white/60`, `text-white/50` are the canonical body values per `09-design-system.md` § "Text Opacity Standards"). `text-white` is the right replacement here because the `monthLabel` is the page's primary heading-adjacent label.

12. **MonthlyReport empty state via FeatureEmptyState (Change 4c — Direction Decision 11).** After the data-loading block in `MonthlyReport.tsx` and before the section-rendering block, add an empty-state branch:

    ```tsx
    const { hasData, isCurrentMonth } = useMonthlyReportData(month, year)
    // ... hero + month pager preserved ...
    {!hasData ? (
      <FeatureEmptyState
        icon={<Calendar />}
        heading={isCurrentMonth ? "This month is just beginning" : `No entries yet for ${monthLabel}`}
        description={isCurrentMonth
          ? "Check back at the end of the month for your report."
          : "The report will populate as you add mood entries and journal pages."
        }
      />
    ) : (
      <>
        {/* existing 7 AnimatedSection wrappers */}
      </>
    )}
    ```

    Pre-execution recon Step 8 verifies the `<FeatureEmptyState>` API (canonical primitive at `frontend/src/components/FeatureEmptyState.tsx` — pre-execution confirms the exact path and prop signature). Adapt the props to match the canonical signature — props may be `icon` / `heading` / `description` / `actionLabel?` / `actionTo?` or similar; use whatever the canonical component requires. Do not invent new props.

13. **`useMonthlyReportData` silent-mock-fallback removal (Change 4d).** In `frontend/src/hooks/useMonthlyReportData.ts`, locate the branch that returns mock data when entries are empty. Replace with a clean empty state. The hook's return shape gains two fields: `hasData: boolean` and `isCurrentMonth: boolean`. When `entries.length === 0` (or whatever the canonical empty threshold is per existing logic), the hook returns `{ entries: [], hasData: false, isCurrentMonth, moodTrend: 0, daysActive: 0, pointsEarned: 0, /* ...all other aggregation fields default to clean empties */ }`. **NO mock data fabrication.** When entries exist, the hook returns `hasData: true` and the existing aggregation logic runs unchanged. The `isCurrentMonth` boolean is computed via:

    ```tsx
    const isCurrentMonth = useMemo(() => {
      const now = new Date()
      return now.getMonth() === month && now.getFullYear() === year
    }, [month, year])
    ```

    The hook now reads from `useInsightsData().getMonthlyEntries(month, year)` rather than calling `getMoodEntries()` directly — the migration is part of Change 1c.

14. **MonthlyShareButton placement promotion (Change 4e — Direction Decision 13).** Move the `<MonthlyShareButton>` from its current bottom-of-page placement (pre-execution Step 9 confirms exact location) to immediately after the month pager / hero section, before the AnimatedSection cascade. Render it only when `hasData` is `true` (no point sharing an empty report). All props, the Canvas image generation logic, the Web Share API wiring, the share-preview rendering, the `EmailPreviewModal` mount/dismiss path, and all other behavior are preserved exactly. The hook output's `hasData` boolean drives the conditional.

15. **Tests updates (Changes 1e, 2e, 3b, 4f, 5).** Update test files across the cluster:

    - `pages/__tests__/Insights.test.tsx`: drop the `font-script` assertion in the h1 test (the span is gone); update the subtitle assertion to match the new narrative copy variants (empty / returning-after-gap / standard); add new tests for narrative subtitle on empty entries (`'Your story is just beginning.'`); add a returning-after-gap test (mock `Date.now()` to be 15+ days after `lastEntry.timestamp` and assert `'Welcome back. Your story continues.'`); add a time-of-day greeting test (mock `Date.now()` for each of the 3 windows and assert the rendered greeting matches the Daily Hub canonical copy verified during pre-execution recon Step 10).
    - `components/insights/__tests__/TimeRangePills.test.tsx` (or the inline TimeRangePills tests in `Insights.test.tsx` if the component is inline): update the selected-pill class-string assertion to `bg-white/15 text-white border border-white/30`. Verify `role="radiogroup"`, `role="radio"`, `aria-checked`, `tabIndex` roving, and ArrowLeft/Right keyboard navigation still pass.
    - `pages/__tests__/MonthlyReport.test.tsx`: update the `font-script` assertion (span removed); update the `text-white/85` → `text-white` assertion; add empty-state tests (current month with no entries renders FeatureEmptyState with "just beginning" copy; past month with no entries renders FeatureEmptyState with month-specific copy; month with entries renders normal sections, NOT FeatureEmptyState); update the MonthlyShareButton placement test (assert position relative to hero, not at bottom); add a test that MonthlyShareButton is NOT rendered when `hasData` is `false`.
    - `hooks/__tests__/useMonthlyReportData.test.ts`: add a test that the hook returns clean empty state for no entries (not mock data — assert specific zero values, empty arrays); add a test that `hasData` is `false` when no entries; add a test that `hasData` is `true` when entries exist; add a test that `isCurrentMonth` correctly distinguishes current vs past months; verify all existing aggregation tests for `hasData=true` case still pass.
    - 18 component test files in `components/insights/__tests__/`: each test file currently uses `vi.mock('@/services/mood-storage', () => ({ getMoodEntries: vi.fn(() => mockEntries) }))` at the top of the file, then renders the component directly. Migrate to: keep the `vi.mock(...)` (it stays at the storage level), but wrap each `render(...)` call in `<InsightsDataProvider>{ui}</InsightsDataProvider>`. A small helper:

      ```tsx
      const renderWithProvider = (ui: ReactElement, entries: MoodEntry[] = mockEntries) => {
        vi.mocked(getMoodEntries).mockReturnValue(entries)
        return render(<InsightsDataProvider>{ui}</InsightsDataProvider>)
      }
      ```

      keeps the test ergonomics close to the pre-migration shape. Where a test currently uses class-string-coupled queries to find a button, prefer migration-resilient `getByRole('button', { name: ... })` queries.
    - **New file: `contexts/__tests__/InsightsDataContext.test.tsx`**: smoke tests for the new module. (a) Provider exposes `moodEntries` matching `getMoodEntries()`'s return value. (b) `getMonthlyEntries(month, year)` correctly filters to the given month/year. (c) `useInsightsData()` throws `'useInsightsData must be used within InsightsDataProvider'` when called outside the provider. (d) `moodEntries` reference is memoized stably across re-renders (run a re-render and assert the array reference is identical). (e) The provider's `getMoodEntries()` internal call fires once per mount, not on every consumer call.

16. **No new localStorage keys.** This spec does not introduce any new `wr_*` or `bible:*` or `bb*-v*:*` storage keys. All key writes / reads in the Insights tree are preserved exactly. The `services/mood-storage.ts` `getMoodEntries()` function is unchanged — only its call sites move.

17. **Type safety (`pnpm typecheck` passes).** All type contracts hold after the migrations. The new `InsightsDataContextValue` interface is exported from `contexts/InsightsDataContext.tsx` for type clarity. The `useMonthlyReportData` return type gains `hasData: boolean` and `isCurrentMonth: boolean` — update the existing return-type interface (or inferred type) accordingly. Every consumer of `useMonthlyReportData` is verified type-safe after the migration.

### Non-Functional Requirements

- **Performance.** Cold-load `getMoodEntries()` calls drop from 5+ to 1 per page mount on `/insights` and `/insights/monthly`. The provider memoizes via `useMemo(() => getMoodEntries(), [])` so re-renders within the page do not re-call the storage function. The `getMonthlyEntries` selector is itself memoized inside the provider's `value` object's `useMemo`, so MonthlyReport's monthly filtering re-runs only when `moodEntries` changes (effectively never within a session, since the store is read-once on mount). No new React Suspense boundaries, no new lazy imports beyond what's already in the bundle. The `<FeatureEmptyState>` component is already in the bundle (used across Prayer Wall, My Bible, Friends — see `09-design-system.md` § "FeatureEmptyState"). Bundle size: zero delta within rounding error.
- **Accessibility (WCAG 2.2 AA).** The `font-script` removals do not affect accessibility (the heading text, id, and gradient style are preserved — only the inner span is removed). The subtitle migration to canonical body prose preserves `text-white/60` opacity which already meets WCAG AA on `bg-dashboard-dark`. The added time-of-day greeting `<p className="text-white/50 text-sm mb-2">` uses `text-white/50` which meets WCAG AA for interactive text per `09-design-system.md` (it's classified as a non-interactive informational paragraph, but the opacity meets the interactive-text floor regardless). The TimeRangePills active-state migration to `bg-white/15 text-white` is a contrast improvement over the previous `bg-primary/20 text-primary-lt`. The MonthlyReport `text-white/85` → `text-white` migration is a contrast improvement. The `<FeatureEmptyState>` canonical primitive provides semantic `<h3>` heading + descriptive paragraph + decorative-icon-with-aria-hidden + optional CTA — all already accessibility-audited per `09-design-system.md` § "First-Run & Empty State Components". The new `useInsightsData()` hook does not introduce any aria-region changes. The MonthlyShareButton placement promotion does not change its aria semantics (`role="button"`, `aria-label`, focus ring) — only its DOM position changes.
- **Lighthouse targets unchanged.** Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+ on `/insights` and `/insights/monthly`. The migrations should improve Performance marginally (5x reduction in `getMoodEntries()` calls on cold load) but should not degrade any other metric.
- **Anti-pressure copy.** Every new user-facing string passes the 6-point Anti-Pressure Copy Checklist per `09-design-system.md` § "Error, Loading, and Empty States" → "Anti-Pressure Checklist references". Specifically:
  - Empty-state copy ("This month is just beginning. Check back at the end of the month for your report." / `No entries yet for ${monthLabel}. The report will populate as you add mood entries and journal pages.`) contains no comparison, no urgency, no exclamation points near vulnerability, no therapy-app jargon, no streak-as-shame or missed-X framing, no false scarcity. Sentence case, complete sentences, period terminators.
  - Narrative subtitle copy ("Your story is just beginning." / "Welcome back. Your story continues." / "Your story so far.") follows the same checklist. The "Welcome back" variant for returning-after-gap deliberately avoids mentioning the duration of the gap — Direction Decision 13 explicitly requires "warm framing; avoid mentioning gaps."
  - Time-of-day greeting copy is whatever the Daily Hub canonical reads (verified during pre-execution recon Step 10) — same precedent, same tone.
- **No new copy beyond the 5 strings above.** Every other user-facing string on `/insights` and `/insights/monthly` is preserved exactly. The h1 heading text ("Mood Insights" / "Monthly Report" or whatever the existing copy is — pre-execution confirms), the time-range pill labels (30d / 90d / 180d / 1y / All), all chart axis labels, all tooltip copy, the month-pager labels, the MonthlyShareButton button text — all preserved.
- **No backend changes.** This is a frontend-only spec. No API contracts change. No database migrations. No environment variables added or modified. No new endpoints touched. The `services/mood-storage.ts` module is unchanged in shape and unchanged in write semantics.

---

## Auth Gating

`/insights` and `/insights/monthly` are auth-gated as routes — logged-out users are redirected to `/` per the existing `<Navigate to="/" replace />` mount-time auth check in `Insights.tsx` (and the equivalent in `MonthlyReport.tsx`). This spec does NOT touch the route-level auth gate or the `useAuth()` / `simulateLegacyAuth` / `wr_auth_simulated` flow. Inside the page (logged-in user), every action is implicitly authenticated; no additional auth modals are introduced.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Navigate to `/insights` | Redirected to `/` (existing — no change) | Page renders with `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero, time-of-day greeting, h1 (no font-script), narrative subtitle | N/A — route-level redirect, no modal |
| Navigate to `/insights/monthly` | Redirected to `/` (existing — no change) | Page renders with hero + month pager + (FeatureEmptyState OR sections + MonthlyShareButton above the fold, depending on `hasData`) | N/A |
| Navigate to `/insights/monthly?month=N&year=YYYY` | Redirected to `/` | Page renders with the requested month; `isCurrentMonth` boolean drives empty-state copy variant | N/A |
| Click any TimeRangePills option on `/insights` | N/A — page not reachable | Selected range updates; charts re-render with the new window; arrow-key roving works between pills | N/A |
| Click MonthlyShareButton on `/insights/monthly` | N/A | Web Share API fires (or fallback dropdown); Canvas image is generated; existing share preview opens | N/A |
| Click "← previous month" or "→ next month" pager on `/insights/monthly` | N/A | Month pager navigates; `useMonthlyReportData(month, year)` re-runs; empty-state OR sections render based on the new month's data | N/A |
| Hover/tap a CalendarHeatmap cell | N/A | Tooltip with date + count renders (existing — no change) | N/A |
| Tap a chart legend entry | N/A | Series visibility toggles (existing — no change) | N/A |

This spec introduces zero new auth gates. The existing route-level redirect for logged-out users is preserved on both pages. The auth modal pattern (`useAuthModal()`) is not invoked by any Insights or MonthlyReport action.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `/insights` hero: time-of-day greeting (single line, `text-sm`), h1 (`text-3xl`, no font-script span), narrative subtitle (`text-base`). TimeRangePills below the hero in a horizontal row, all 5 pills visible without horizontal scroll (with the 30d default rendering as `bg-white/15 text-white border border-white/30`). 11 AnimatedSection wrappers stack vertically below. `/insights/monthly` hero: same pattern — h1 (no font-script span), monthLabel (`text-white`, no /85), month pager. When `hasData=false`, `<FeatureEmptyState>` renders below the hero with stacked icon + heading + description, full-width within `max-w-2xl mx-auto px-4`. When `hasData=true`, the MonthlyShareButton renders immediately below the hero / month pager (above the fold), then the 7 AnimatedSection wrappers stack vertically below. Atmospheric layer (`bg-dashboard-dark` body + `ATMOSPHERIC_HERO_BG` hero) preserved. |
| Tablet (640–1024px) | Same hero layout as mobile, with hero typography scaling up via `sm:` breakpoints already present in the existing JSX (`sm:text-4xl` h1, `sm:text-lg` subtitle, etc.). TimeRangePills row stays horizontal. AnimatedSection wrappers may render in a 2-column grid where the existing component layout supports it (CalendarHeatmap, MoodTrendChart, etc. — pre-execution confirms; this spec does not change grid configuration). MonthlyShareButton placement above the fold is preserved at all breakpoints. |
| Desktop (≥ 1024px) | Hero scales further via `lg:` breakpoints (`lg:text-5xl` h1). TimeRangePills row centered, 5 pills with proportional spacing. AnimatedSection grid renders in its existing desktop layout (typically 2-column). The atmospheric layer (`bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`) remains fixed across breakpoints. |

The narrative subtitle and time-of-day greeting are single-line at all breakpoints (no wrap to row 2 unless the viewport is exceptionally narrow — the longest variant `'Welcome back. Your story continues.'` is 33 characters and fits in a single line at the 320px minimum). The MonthlyShareButton's existing internal layout (icon + label + share affordance) is preserved at all breakpoints — only its DOM position changes.

Touch-target compliance: every interactive element this spec touches clears WCAG AA 44×44 minimum tap target. The TimeRangePills pre-existing `min-h-[44px]` is preserved. The MonthlyShareButton's existing `min-h-[44px]` is preserved. The new time-of-day greeting `<p>` is non-interactive (no tap target requirement). The `<FeatureEmptyState>` component's optional CTA (if used) inherits the canonical 44px tap target from the primitive itself.

The existing breakpoint thresholds in `Insights.tsx` and `MonthlyReport.tsx` are preserved exactly. This spec does not introduce new breakpoints; it preserves the existing ones and applies the hero migrations + provider wrap + empty-state branch + MonthlyShareButton placement at each.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Insights and MonthlyReport are read-only analytics surfaces. They display aggregations of mood data, activity history, badges, and gratitude entries that the user has already submitted via other surfaces (Daily Hub mood check-in, gratitude widget, etc.) — all of which have their own crisis-detection wiring per `01-ai-safety.md`. The Insights surfaces themselves do not accept user text input, do not generate AI content, and do not display content authored by other users. Crisis detection runs at the input layer (Daily Hub mood text, Journal entries, Prayer Wall posts) — by the time data reaches Insights, crisis-flagged content has either been blocked at submission or routed to the admin queue, neither of which surfaces in the Insights aggregations.

The MonthlyShareButton does generate a Canvas image from user-submitted aggregations (mood counts, activity totals, etc.), but the generated content is the user's own aggregated numbers — not free-form text and not AI-generated narrative. The Canvas image content is therefore not subject to crisis detection. The Web Share API surface is the user's choice; Worship Room does not pre-screen what the user shares.

---

## Auth & Persistence

- **Logged-out users:** Both routes are auth-gated as routes — logged-out users are redirected to `/` per the existing mount-time auth check. No demo-mode behavior; the pages are not reachable for logged-out users. This spec does NOT touch the route-level auth gate. (Demo-mode zero-persistence applies to other surfaces — Daily Hub, Bible reader, Prayer Wall reading, Local Support, etc. — but not to Insights, which is account-scoped by definition since it aggregates the user's own historical data.)
- **Logged-in users:** All Insights state reads flow through `services/mood-storage.ts::getMoodEntries()` (now via the `InsightsDataContext` provider). The `getMoodEntries()` function reads from `wr_mood_entries` localStorage and is NOT modified by this spec — only its call sites move. Phase 3 will replace `wr_mood_entries` with a backend-backed mood-entries API; the InsightsDataContext provider will at that time swap its `useMemo(() => getMoodEntries(), [])` for an async fetch via React Query or equivalent. The provider's existence makes that future migration mechanical: every consumer continues to import `useInsightsData()` unchanged.
- **localStorage usage (read):** `services/mood-storage.ts::getMoodEntries()` reads from `wr_mood_entries`. This spec does not add new reads. The existing `wr_journal_entries`, `wr_gratitude_entries`, `wr_meditation_history`, `wr_streak`, `wr_faith_points`, `wr_badges`, and other dashboard-data keys are also read by various components via their existing service wrappers — all preserved exactly.
- **localStorage usage (write):** No writes are added by this spec. The `useMonthlyReportData` hook does not write to localStorage. The `InsightsDataProvider` does not write to localStorage. The `MonthlyShareButton` Canvas image generation does not persist anything — the share happens via Web Share API or fallback dropdown, no localStorage write.
- **No new localStorage keys.** Documented in Functional Requirement 16. The `11-local-storage-keys.md` inventory is unchanged.

---

## Completion & Navigation

N/A — Insights and MonthlyReport are not part of the Daily Hub tabbed completion-tracking experience. Visiting `/insights` or `/insights/monthly` does not signal to a completion tracker, does not award faith points, does not contribute to streaks, and does not have post-completion CTAs to switch tabs or visit other pages. The pages are read-only analytics surfaces.

The MonthlyShareButton's existing navigation (Web Share API or fallback dropdown opens the share dialog) is preserved exactly. The month pager's existing intra-page navigation (← previous, → next) is preserved. The TimeRangePills' existing intra-page state change (selected range updates the chart window) is preserved. None of these are completion signals or navigation-to-other-routes.

---

## Design Notes

This spec is pure pattern application against patterns documented in `.claude/rules/09-design-system.md` and patterns Spec 10A established. No new visual primitives are introduced. Reference the design system for canonical values:

- **Muted-white isolated pill / active-state pattern** — used by the TimeRangePills selected-pill chrome migration. Reference: `09-design-system.md` and Direction Decision 2. Mobile/tablet/desktop horizontal: `bg-white/15 text-white border border-white/30`. The same class string Spec 10A applied to `RadioPillGroup` selected pill. Cross-reference the post-10A `RadioPillGroup.tsx` source after 10A merges to confirm the exact class string before applying — if 10A's execution surfaced any deviation, mirror that.
- **Canonical body prose** — used by the migrated Insights subtitle. `font-sans` Inter (default), no italic, `text-white/60` opacity, `text-base sm:text-lg` font sizing. Reference: `09-design-system.md` § "Daily Hub body text readability standard" — the migration moves Insights into alignment with the Daily Hub canonical, away from the deprecated `font-serif italic`.
- **Time-of-day greeting** — reference: Daily Hub canonical implementation (pre-execution Step 10 confirms file location and exact thresholds + copy). The greeting `<p>` uses `text-white/50 text-sm` per Direction Decision 13.
- **`<FeatureEmptyState>` canonical primitive** — used by the MonthlyReport empty-state branch. Reference: `09-design-system.md` § "First-Run & Empty State Components" and `frontend/src/components/FeatureEmptyState.tsx`. Same primitive used across Prayer Wall, My Bible, Friends. Anti-pressure tone, semantic `<h3>` heading, decorative icon with `aria-hidden="true"`, optional CTA. Pre-execution Step 8 confirms the exact prop signature.
- **`bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` atmospheric pattern (preserved)** — Direction Decision 1. Same canonical inner-page pattern Settings, Friends, Grow, MyPrayers use. Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`.
- **Rolls-own `bg-white/5` / `bg-white/[0.06]` / `bg-white/[0.08]` card chrome (preserved)** — Direction Decision 21. Each of the 18 insight components reproduces a close-but-not-identical card class string. This spec does NOT migrate them to `<FrostedCard>`. Defer to Spec 10c if visual cohesion becomes a complaint post-launch.
- **GRADIENT_TEXT_STYLE on h1** — preserved on both Insights.tsx and MonthlyReport.tsx h1 elements after the inner `<span class="font-script">` is removed. Reference: `09-design-system.md` § "Section Heading — 2-Line Treatment" and `frontend/src/constants/gradients.tsx` (`GRADIENT_TEXT_STYLE`).
- **`useMemo` discipline for derived narrative** — the computed `narrativeSubtitle` uses `useMemo` keyed on `moodEntries` to avoid re-computation on every render. The `greeting` uses `useMemo` with empty deps (computed once per mount) — the time-of-day boundary doesn't shift mid-session in any meaningful way. Per `04-frontend-standards.md`, controlled inputs and derived state should use `useMemo` / `useCallback` where computation is non-trivial.
- **Recharts theming, chart colors, axis styles, tooltip chrome (preserved)** — out of scope per Direction Decision 21 and the spec brief's explicit non-touch list. Defer chart theming to Spec 10c.
- **Animation tokens (preserved)** — every animation duration / easing on Insights and MonthlyReport (the 11 AnimatedSection cascade `animate-fade-in-up` with `${index * 100}ms` delay, the MonthlyStatCards count-up animation, the chart enter transitions) is preserved exactly. This spec does not introduce or modify animation tokens. Reference: `09-design-system.md` § "Animation Tokens" and `frontend/src/constants/animation.ts`.

No new visual patterns. No `[UNVERIFIED]` flags needed.

---

## Out of Scope

(Continued from the brief and Direction Decisions; comprehensive list:)

- **All Settings surfaces (Spec 10A's domain).** `/settings` shell, AvatarPickerModal, ChangePasswordModal, DeleteAccountModal — already shipped in 10A. No regression.
- **All non-Insights / non-MonthlyReport surfaces.** Bible cluster, Grow, Daily Hub, Local Support, Auth surfaces, Dashboard, Friends, Leaderboard, Profile, Prayer Wall, Music, AskPage — all already migrated in Specs 1A–9 and out of scope for 10B. Regression checks confirm none change.
- **Atmospheric layer migration.** Direction Decision 1 preserves `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`. Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` on Insights surfaces.
- **All `bg-white/5` rolls-own card chrome.** Direction Decision 21 preserve. No FrostedCard adoption sweep across the 18 components. Defer to Spec 10c.
- **Recharts theming, chart colors, axis styles, tooltip chrome.** Out of scope. Defer to Spec 10c.
- **Chart data computations / useMemo aggregations.** Preserved exactly. No new derivations.
- **TimeRange windows.** 5 windows preserved per Direction Decision 18 (30d / 90d / 180d / 1y / All). No consolidation to 3 windows.
- **TimeRange default.** 30d preserved per Direction Decision 18.
- **LLM-generated narrative summaries** ("Worship Wrapped" / per-section AI narrative). Direction Decision 13 — defer to Spec 10c.
- **Annual recap surface "Worship Year in Review."** Direction Decision 20 — defer to Spec 10c / Phase 3.
- **Spiritual archetype personality system.** Direction Decision 13 — defer to Spec 10c.
- **Per-section share affordances on Insights.** Direction Decision 13 — defer to Spec 10c. Only the existing MonthlyShareButton on `/insights/monthly` is touched (placement promotion); no new share buttons elsewhere.
- **Cross-cutting EchoCard mount on Insights hero.** Direction Decision 13 — defer to Spec 10c.
- **Sound atmosphere during share-card reveals.** Direction Decision 13 — defer to Spec 10c.
- **Friends-warmth integration on Insights.** Direction Decision 13 — defer to Spec 10c.
- **FrostedCard adoption sweep.** Direction Decision 21 — defer to Spec 10c.
- **`useMoodChartData.ts` modifications.** Verification only per the brief. No code changes expected; if pre-execution surfaces a `getMoodEntries()` call inside, migrate it to `useInsightsData()` per the canonical grep rule.
- **`useMonthlyReportSuggestions.ts` modifications.** Verification only per the brief. No code changes expected.
- **All Forums Wave Phase 3 backend code.** No backend changes.
- **API surface, API contracts, OpenAPI spec, frontend type generation.** No API changes.
- **Database migrations / Liquibase changesets.** No backend changes.
- **Environment variables.** No env var additions or modifications.

---

## Acceptance Criteria

### Pre-execution recon (verification before code changes)

- [ ] Spec 10A merged into the working branch. Verified via `git log` review or implicit working-branch state. Any cluster-pattern decision 10A surfaced or refined during execution is read and absorbed before 10B starts.
- [ ] All prior specs (1A–9) merged into the working branch.
- [ ] Direction doc at `_plans/direction/settings-insights-2025-05-05.md` present (note: brief states `2026-05-05.md`; actual on-disk file uses `2025-05-05.md` — surface this discrepancy if it matters but use the on-disk path).
- [ ] Recon doc at `_plans/recon/settings-insights-2026-05-05.md` present.
- [ ] **Insights.tsx structure read at lines 1-311.** Hero + h1 + subtitle + TimeRange pills + 11 AnimatedSection wrappers structure confirmed. Exact line numbers captured for: `<span class="font-script">Insights</span>`, `<p class="font-serif italic ...">Reflect on your journey</p>`, hero structure, TimeRangePills inline definition (or component file path).
- [ ] **MonthlyReport.tsx structure read at lines 1-212.** Structure confirmed. Exact line numbers captured for: `<span class="font-script">Report</span>`, `text-white/85` on `monthLabel`, MonthlyShareButton current placement, 7 AnimatedSection wrappers.
- [ ] **`getMoodEntries()` call-site grep run** across `frontend/src/components/insights/` + `frontend/src/pages/Insights.tsx` + `frontend/src/pages/MonthlyReport.tsx`. Exact file:line list captured. Expected: 5 components + 2 page files (per audit), but the grep is canonical source of truth — migrate whatever the grep returns.
- [ ] **`useMonthlyReportData` mock-fallback location read.** The hook's silent-mock-fallback branch identified and the fallback logic documented. The migration to clean empty state is mechanical once the branch is located.
- [ ] **TimeRangePills current selected-pill class string captured.** Expected: `'min-h-[44px] rounded-full bg-primary/20 px-4 py-2 text-sm font-medium text-primary-lt transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'`. Verify exact string.
- [ ] **`<FeatureEmptyState>` API confirmed.** File path located (`frontend/src/components/FeatureEmptyState.tsx` or wherever the canonical lives). Prop signature captured: `icon` / `heading` / `description` / `actionLabel?` / `actionTo?` (or whatever the canonical signature is). Adapt props to match.
- [ ] **MonthlyShareButton current placement captured.** The current DOM position (which AnimatedSection wrapper it's inside, or whether it's a sibling) is documented to inform "above the fold" placement.
- [ ] **Daily Hub time-of-day greeting pattern read.** Canonical implementation file located (likely `pages/DailyHub.tsx` or `components/daily/`). Morning/afternoon/evening copy variants + time-detection logic captured. Same pattern is applied to Insights hero verbatim. If Daily Hub uses different boundary hours (e.g., 12pm / 6pm rather than 11am / 5pm), match those.
- [ ] **Welcome-back gap-detection pattern verified.** No existing "returning after N days" detection logic was found in the codebase, OR if one was found, it is reused. The 14+ day threshold per the brief is the default if no precedent exists.
- [ ] **Test baseline run.** `pnpm install`, `pnpm typecheck`, `pnpm test`. Pre-migration pass/fail counts captured.
- [ ] **Insights tree component count verified.** Out of the 18 components in the brief's checklist, the canonical `getMoodEntries()` consumer set is determined by grep. The brief's 18-component list governs the test-update set; the grep governs the production-migration set.

### InsightsDataContext (Direction Decision 12)

- [ ] New `frontend/src/contexts/InsightsDataContext.tsx` file created.
- [ ] Provider reads `getMoodEntries()` once via `useMemo(() => getMoodEntries(), [])`.
- [ ] Exposes `moodEntries: MoodEntry[]` (unfiltered).
- [ ] Exposes `getMonthlyEntries: (month: number, year: number) => MoodEntry[]` selector.
- [ ] `useInsightsData()` throws `'useInsightsData must be used within InsightsDataProvider'` outside the provider.
- [ ] `Insights.tsx` wrapped in `<InsightsDataProvider>`.
- [ ] `MonthlyReport.tsx` wrapped in `<InsightsDataProvider>`.
- [ ] All grep-flagged components migrated from direct `getMoodEntries()` call to `useInsightsData().moodEntries` (or `useInsightsData().getMonthlyEntries(month, year)` for monthly consumers).
- [ ] Zero direct `getMoodEntries()` calls remain in `frontend/src/components/insights/` (`grep -rn "getMoodEntries" frontend/src/components/insights/` returns zero matches).
- [ ] Zero direct calls in `frontend/src/pages/Insights.tsx` and `frontend/src/pages/MonthlyReport.tsx` (only the provider's internal call inside `frontend/src/contexts/InsightsDataContext.tsx` matches).
- [ ] All useMemo filtering / aggregation logic preserved per component.
- [ ] Cold load `/insights` makes 1 `getMoodEntries()` call (not 5+).
- [ ] Cold load `/insights/monthly` makes 1 `getMoodEntries()` call (not 5+).

### Insights.tsx narrative + greeting (Direction Decisions 5, 6, 13)

- [ ] `<span class="font-script">Insights</span>` removed from h1; replaced with plain `Insights`.
- [ ] h1 outer element preserved exactly: `id="insights-heading"`, `style={GRADIENT_TEXT_STYLE}`, font sizing classes, aria-labelledby reference all unchanged.
- [ ] Subtitle migrated from `<p className="font-serif italic text-base text-white/60 sm:text-lg">Reflect on your journey</p>` to `<p className="text-white/60 text-base sm:text-lg">{narrativeSubtitle}</p>`.
- [ ] `narrativeSubtitle` computed via `useMemo` from `useInsightsData().moodEntries`. Three variants: `'Your story is just beginning.'` (zero entries), `'Welcome back. Your story continues.'` (returning after 14+ day gap), `'Your story so far.'` (standard).
- [ ] Time-of-day greeting `<p className="text-white/50 text-sm mb-2">{greeting}</p>` added immediately above the h1.
- [ ] `greeting` computation matches the Daily Hub canonical (boundary hours + copy). If Daily Hub uses morning/hello/evening, Insights uses morning/hello/evening; if Daily Hub uses morning/afternoon/evening with different boundaries, Insights matches.
- [ ] If Daily Hub greeting includes user display name when authenticated, Insights greeting includes the display name too. Same precedent.
- [ ] Anti-Pressure Copy Checklist passes for all three narrative subtitle variants and all greeting copy variants.

### TimeRangePills active-state migration (Direction Decision 2)

- [ ] Selected pill chrome migrated from `bg-primary/20 text-primary-lt` to `bg-white/15 text-white border border-white/30`.
- [ ] Inactive pill chrome preserved exactly.
- [ ] Roving tabindex preserved (`tabIndex={selected ? 0 : -1}`).
- [ ] Arrow-key handler preserved (ArrowLeft/Right + ArrowUp/Down primary; wraparound).
- [ ] `role="radiogroup"` + `role="radio"` + `aria-checked` preserved.
- [ ] 5 time-range options preserved (30d / 90d / 180d / 1y / All).
- [ ] 30d default preserved.
- [ ] Focus ring (`focus-visible:ring-2 focus-visible:ring-primary-lt/70`) preserved.

### MonthlyReport (Direction Decisions 5, 11, 13)

- [ ] `<span class="font-script">Report</span>` removed from h1; replaced with plain `Report`.
- [ ] h1 outer element preserved exactly (id, GRADIENT_TEXT_STYLE, font sizing, aria).
- [ ] `monthLabel` `<p>` migrated from `text-white/85` to canonical `text-white`. All other classes on the paragraph preserved.
- [ ] Empty state renders `<FeatureEmptyState>` for empty months (`hasData=false`).
- [ ] Empty-state copy: current month → `heading="This month is just beginning"` / `description="Check back at the end of the month for your report."`; past month → `heading={`No entries yet for ${monthLabel}`}` / `description="The report will populate as you add mood entries and journal pages."`.
- [ ] Anti-Pressure Copy Checklist passes for both empty-state copy variants.
- [ ] MonthlyShareButton placement promoted: rendered immediately after the hero / month pager, before the AnimatedSection cascade.
- [ ] MonthlyShareButton hidden when `hasData=false`.
- [ ] All MonthlyShareButton props, Canvas image generation logic, and Web Share API wiring preserved exactly.

### useMonthlyReportData (Direction Decision 11 + Change 1c)

- [ ] Silent-mock-fallback branch removed from the hook.
- [ ] Returns clean empty state (zeros, empty arrays, no fabricated content) when `entries.length === 0`.
- [ ] `hasData: boolean` returned (drives empty-state branching in MonthlyReport).
- [ ] `isCurrentMonth: boolean` returned (drives copy variation between current vs past).
- [ ] Hook reads from `useInsightsData().getMonthlyEntries(month, year)` instead of calling `getMoodEntries()` directly.
- [ ] All aggregation logic for `hasData=true` case preserved exactly.
- [ ] Return type interface updated to include `hasData` and `isCurrentMonth`.
- [ ] Every consumer of `useMonthlyReportData` is type-safe after the migration.

### Atmospheric (Direction Decision 1 — preserve)

- [ ] `bg-dashboard-dark` body root preserved on both `Insights.tsx` and `MonthlyReport.tsx`.
- [ ] `ATMOSPHERIC_HERO_BG` hero preserved on both pages.
- [ ] No `BackgroundCanvas` / `HorizonGlow` / `GlowBackground` introduced.

### Rolls-own card chrome (Direction Decision 21 — preserve)

- [ ] No FrostedCard adoption sweep.
- [ ] All `bg-white/5` + `bg-white/[0.06]` + `bg-white/[0.08]` card chrome preserved across the 18 components.

### Tests

- [ ] All existing tests pass; updated tests pass; no new failures (pass count ≥ pre-migration baseline).
- [ ] `InsightsDataContext` provider tests added at `frontend/src/contexts/__tests__/InsightsDataContext.test.tsx`. Five smoke tests: provider exposes `moodEntries`; `getMonthlyEntries` filters correctly; `useInsightsData` throws outside provider; `moodEntries` stably memoized across re-renders; provider's `getMoodEntries()` fires once per mount, not on every consumer call.
- [ ] All grep-flagged component test files migrated to Provider wrapper pattern (`vi.mock('@/services/mood-storage')` stays at file top; each `render()` wraps in `<InsightsDataProvider>`).
- [ ] `useMonthlyReportData` tests cover empty-state branching: returns clean empty state when no entries (specific zero values asserted, not mock data); `hasData` false when no entries; `hasData` true when entries exist; `isCurrentMonth` correctly distinguishes current vs past.
- [ ] MonthlyReport tests cover `<FeatureEmptyState>` rendering for empty months: current month empty renders "just beginning" copy; past month empty renders month-specific copy; month with entries does NOT render FeatureEmptyState.
- [ ] MonthlyReport tests cover MonthlyShareButton placement promotion: assert position is above the AnimatedSection cascade, not at the bottom; assert MonthlyShareButton not rendered when `hasData=false`.
- [ ] Insights tests cover narrative subtitle variations: empty entries (`'Your story is just beginning.'`); returning-after-gap (mock `Date.now()` 15+ days after lastEntry.timestamp, assert `'Welcome back. Your story continues.'`); standard (assert `'Your story so far.'`).
- [ ] Insights tests cover time-of-day greeting: mock `Date.now()` for each of the 3 windows, assert the rendered greeting matches the Daily Hub canonical.
- [ ] TimeRangePills active-state class-string assertion updated to `bg-white/15 text-white border border-white/30`.
- [ ] `pnpm typecheck` passes.

### Manual eyeball checks

- [ ] `/insights` logged-in user: page renders normally with hero + tab pills + 11 AnimatedSection wrappers; logged-out redirects to `/`.
- [ ] Hero shows time-of-day greeting (matching Daily Hub at viewing time) + Insights h1 (no font-script span) + warmer narrative subtitle (one of 3 variants based on user data).
- [ ] Subtitle reads cleanly without italic; font is Inter sans.
- [ ] Greeting matches time of day at viewing.
- [ ] TimeRangePills selected state is muted-white (`bg-white/15` + `text-white` + `border border-white/30`), not violet-tinted.
- [ ] Active TimeRange pill arrow-key roving works (ArrowLeft/Right cycle through pills).
- [ ] `/insights/monthly` with current month, no entries: `<FeatureEmptyState>` renders with "This month is just beginning" + "Check back at the end of the month for your report."
- [ ] `/insights/monthly` with past month, no entries: `<FeatureEmptyState>` renders with `No entries yet for ${monthLabel}` + "The report will populate as you add mood entries and journal pages."
- [ ] `/insights/monthly` with entries: normal sections render, `<FeatureEmptyState>` is absent.
- [ ] MonthlyShareButton appears immediately below hero / month pager (above the fold) when entries exist.
- [ ] MonthlyShareButton is absent when month has no entries.
- [ ] MonthlyReport h1 has no font-script span; outer GRADIENT_TEXT_STYLE preserved.
- [ ] MonthlyReport `monthLabel` is `text-white` (not `/85`).
- [ ] All 18 chart/section components render normally with same data behavior.
- [ ] No visual regressions on chart rendering, axis labels, tooltips, legends, hover states.

### Performance

- [ ] Cold load `/insights` makes 1 `getMoodEntries()` call (not 5+).
- [ ] Cold load `/insights/monthly` makes 1 `getMoodEntries()` call (not 5+).
- [ ] No measurable performance regression vs pre-migration on chart rendering, time-range switching, or month-pager navigation.
- [ ] Chart components re-render normally when state changes (TimeRange, month pager).

### Behavioral preservation

- [ ] All Recharts charts render identically (lines, bars, dots, axes, tooltips, legends).
- [ ] All useMemo aggregations produce identical computed values (verifiable by snapshot test or manual diff against pre-migration output).
- [ ] CalendarHeatmap renders 7-row × N-week grid correctly.
- [ ] MoodTrendChart renders morning + evening dots + moving-average overlay.
- [ ] MeditationHistory renders stacked BarChart by type.
- [ ] All 4 InsightCards rotate by `getDayOfYear()`.
- [ ] MonthlyStatCards animate count-up correctly.
- [ ] MonthlyHighlights identifies longest streak / badges / best day correctly.
- [ ] MonthlyShareButton Canvas image generation unchanged (same image dimensions, same content layout, same fonts).
- [ ] EmailPreviewModal renders email template mockup correctly.
- [ ] PrayerLifeSection active/answered/answer-rate logic preserved.
- [ ] CommunityConnections null-when-no-visits behavior preserved.
- [ ] ScriptureConnections renders 4 mock references with mood-colored dots.
- [ ] GratitudeStreak null-when-streak<2 behavior preserved.
- [ ] GratitudeCorrelationCard mood-on-gratitude-days vs other-days comparison preserved.

### Regression checks

- [ ] All Settings surfaces unchanged from Spec 10A.
- [ ] All Bible cluster surfaces unchanged from 8A/8B/8C.
- [ ] AskPage unchanged from Spec 9.
- [ ] All other surfaces unchanged.
- [ ] `services/mood-storage.ts` unchanged (only call sites move).
- [ ] Auth simulation flow unchanged.
- [ ] No new localStorage keys (verifiable by grep `wr_*` in source diff).
