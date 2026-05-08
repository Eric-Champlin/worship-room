# Implementation Plan: Spec 10B — Insights + MonthlyReport

**Spec:** `_specs/spec-10b-insights.md`
**Date:** 2026-05-06
**Branch:** `forums-wave-continued`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; Insights/MonthlyReport surfaces are NOT in the recon, so derived values for these surfaces are read from existing source code rather than the recon)
**Recon Report:** `_plans/recon/settings-insights-2026-05-05.md` (loaded — feature-specific recon for the Settings/Insights cluster)
**Master Spec Plan:** `_plans/direction/settings-insights-2025-05-05.md` (loaded — Settings/Insights cluster direction doc; brief states `2026-05-05.md` but on-disk file uses `2025-05-05.md` — using on-disk path)

---

## Affected Frontend Routes

- `/insights`
- `/insights/monthly`
- `/insights/monthly?month=N&year=YYYY`

---

## Architecture Context

### Existing files this spec touches

**Page files (modify):**

- `frontend/src/pages/Insights.tsx` (311 lines) — auth-gated route. Hero (lines 186-208), inline `TimeRangePills` (lines 62-131), `AnimatedSection` (lines 133-148), 11 child sections. Currently: `entries = getMoodEntries()` at line 157 (single direct read, page-level), inline `font-script` span at line 203, deprecated `font-serif italic` subtitle at line 205, `bg-primary/20 text-primary-lt` selected pill at line 121.
- `frontend/src/pages/MonthlyReport.tsx` (212 lines) — auth-gated route. Hero (lines 99-131), 7 `AnimatedSection` wrappers, `MonthlyShareButton` at line 186 (currently at the bottom). Currently: `font-script` span at line 110, `text-white/85` on monthLabel at line 121, `getMoodEntries()` at line 57 (computes earliest month).
- `frontend/src/hooks/useMonthlyReportData.ts` (295 lines) — `useMemo` aggregator. Currently: silent-mock-fallback active when `moodEntries.length === 0`. Branch starts at line 105 (`const hasRealData = moodEntries.length > 0`); fabricates `daysActive`, `activityCounts`, `pointsEarned`, level info, `moodTrendPct`, `longestStreak`, `badgesEarned`, `bestDay` for empty case (lines 110, 136-143, 145, 165-167, 192-194, 198-199, 215, 250-261). Calls `getMoodEntries()` directly at line 100.

**Component files (modify production code only for grep-flagged set):**

Per pre-execution grep, the production-migration set is:

- `frontend/src/components/insights/InsightCards.tsx` line 67 (inside `useMemo`, no deps)
- `frontend/src/components/insights/GratitudeCorrelationCard.tsx` line 11 (inside `useMemo`)
- `frontend/src/components/insights/CommunityConnections.tsx` line 18 (inside `useMemo`)
- `frontend/src/components/insights/CalendarHeatmap.tsx` line 20 (top of render)
- `frontend/src/components/insights/PrayerLifeSection.tsx` line 32 (top of render)

**Component files (test-only updates, no production changes):**

13 of the 18 components in `frontend/src/components/insights/` do NOT call `getMoodEntries()` in production code. They are: `ActivityBarChart`, `ActivityCorrelations`, `EmailPreviewModal`, `GratitudeStreak`, `MeditationHistory`, `MonthHeatmap`, `MonthlyHighlights`, `MonthlyInsightCards`, `MonthlyShareButton`, `MonthlyStatCards`, `MonthlySuggestions`, `MoodTrendChart`, `ScriptureConnections`. Their test files only need migration if they currently `vi.mock('@/services/mood-storage')`. Per pre-execution recon Step 5, only `CommunityConnections.test.tsx` has the explicit mock (other tests use the seeded localStorage in `beforeEach`). The Provider wrapper test pattern applies wherever needed.

**New file (create):**

- `frontend/src/contexts/InsightsDataContext.tsx` — Provider + hook + context value type.
- `frontend/src/contexts/__tests__/InsightsDataContext.test.tsx` — Provider/hook smoke tests.

### Patterns to follow

- **React Context pattern.** Mirror `AuthContext.tsx` (`frontend/src/contexts/AuthContext.tsx`) and `InstallPromptContext.ts` + `InstallPromptProvider.tsx` for the `Context.ts` + `Provider.tsx` split. Spec 10B uses a single-file `InsightsDataContext.tsx` because the provider's logic is small (one `useMemo`, no side-effects, no internal state) — co-locate the Context object, the Provider component, and the hook in one file.
- **`useMemo`-based memoization.** The provider reads `getMoodEntries()` once via `useMemo(() => getMoodEntries(), [])` (empty deps — read-once on mount, stable across re-renders). The `value` object passed to `<InsightsDataContext.Provider>` is also wrapped in `useMemo` keyed on `moodEntries` so consumers receive a stable reference unless the underlying data changes (it does not within a session, by design).
- **Hook-throws-outside-provider pattern.** `useInsightsData()` reads from `useContext(InsightsDataContext)`. Default context value is `null`. If `null`, throw `Error('useInsightsData must be used within InsightsDataProvider')`. Same DX guard `useAuth()` uses.
- **Reactive store discipline does NOT apply here.** `services/mood-storage.ts` is a CRUD service, not a reactive store. There is no `subscribe()` API on `mood-storage`. The provider does NOT introduce subscription — the page still reads-once-on-mount, same as today, just with the read centralized. (Insights subscription correctness is acceptable today per Recon Part 3 — the page is read-only; a Phase 3 backend migration may add a subscribe layer when warranted.)
- **TimeRangePills active-state pattern.** Spec 10A established `bg-white/15 text-white border border-white/30` as the muted-white isolated-pill active-state. Verified post-10A in `_plans/2026-05-06-spec-10a-settings.md` lines 143-144. Same class string applied to TimeRangePills selected pill in this spec.
- **`<FeatureEmptyState>` canonical primitive.** API verified in `frontend/src/components/ui/FeatureEmptyState.tsx`: props `icon: LucideIcon`, `iconClassName?: string`, `heading: string`, `description: string`, `ctaLabel?`, `ctaHref?`, `onCtaClick?`, `children?`, `compact?: boolean`, `className?`. Internal markup: `<div className="mx-auto flex max-w-sm flex-col items-center px-6 text-center">` + icon + `<h3>` heading + `<p>` description. Already used by `Insights.tsx` (line 249, `BarChart3` icon) for its 0-1 entries empty state — same import pattern in MonthlyReport.
- **Daily Hub greeting canonical (verified at `frontend/src/pages/DailyHub.tsx` lines 59-64 + 157-158).** Function `getGreeting()`: `hour < 12 → 'Good Morning'`, `hour < 17 → 'Good Afternoon'`, else `'Good Evening'`. Title case, NO sentence case. When authenticated, `displayName = `${greeting}, ${user.name}!`` (with trailing exclamation). When unauthenticated, `${greeting}!`. Insights spec narrows scope to authenticated users only (route is auth-gated), so the form is `${greeting}, ${user.name}!`. **Note:** `DashboardHero.tsx` uses different boundary hours (5-11 / 12-16) and sentence case (`'Good morning'`). The Daily Hub is the canonical referent per Direction Decision 13. **Use Daily Hub thresholds and Daily Hub copy verbatim, not DashboardHero.**

### Database tables involved

None. This is a frontend-only spec. No backend, no API contracts, no Liquibase changesets.

### Test patterns to match

- Vitest + React Testing Library. Existing tests at `frontend/src/components/insights/__tests__/*.test.tsx` and `frontend/src/pages/__tests__/{Insights,MonthlyReport}.test.tsx` and `frontend/src/hooks/__tests__/useMonthlyReportData.test.ts`.
- Mock pattern: `vi.mock('@/services/mood-storage', () => ({ getMoodEntries: () => mockEntries, ... }))` at file top. Existing in `CommunityConnections.test.tsx` line 5; other component tests seed via `localStorage` in `beforeEach`.
- For the Provider migration, replace each `render(<Component ... />)` call with `render(<InsightsDataProvider><Component ... /></InsightsDataProvider>)`. Or extract a `renderWithProvider` test helper. Same `vi.mock` stays at the file top — it controls what `getMoodEntries` returns when `InsightsDataProvider` calls it on mount.

### Auth gating patterns

This spec introduces ZERO new auth gates. Both routes already use the canonical pattern:

```tsx
const { isAuthenticated } = useAuth()
if (!isAuthenticated) {
  return <Navigate to="/" replace />
}
```

Insights.tsx line 152 + 176-178; MonthlyReport.tsx line 47 + 61-63. Both preserved exactly. The rest of the auth-gating context (`useAuthModal`, AuthModal subtitle copy, `wr_auth_simulated`, `wr_user_name`) is irrelevant — Insights/MonthlyReport never invoke the auth modal because logged-out users never see the page.

### Shared data models from master plan

The Settings/Insights cluster Direction doc (`_plans/direction/settings-insights-2025-05-05.md`) is the locked decision set. Decisions 2, 5, 6, 11, 12, 13, 21 are this spec's authoritative inputs. The doc does not introduce new shared TypeScript interfaces — only patterns. The `MoodEntry` type (consumed by the new context) is from `frontend/src/types/dashboard.ts` and unchanged.

### Cross-spec dependencies

- **Spec 10A is a prerequisite.** It locked the muted-white active-state `bg-white/15 text-white border border-white/30` (verified at `_plans/2026-05-06-spec-10a-settings.md:143`). Spec 10B applies the same string to TimeRangePills.
- **Specs 1A–9 prerequisites.** All merged.

---

## Auth Gating Checklist

This spec introduces ZERO new auth gates. The existing route-level redirects are preserved.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Navigate to `/insights` | Logged-out → redirect to `/` | Step 4 (preserved, no change) | `useAuth()` + `<Navigate to="/" replace />` |
| Navigate to `/insights/monthly` | Logged-out → redirect to `/` | Step 6 (preserved, no change) | `useAuth()` + `<Navigate to="/" replace />` |
| Navigate to `/insights/monthly?month=N&year=YYYY` | Logged-out → redirect to `/` | Step 6 (preserved, no change) | Same |
| Click TimeRangePills option | N/A — page not reachable when logged out | N/A | N/A |
| Click MonthlyShareButton | N/A — page not reachable when logged out | N/A | N/A |
| Click month-pager prev/next | N/A — page not reachable when logged out | N/A | N/A |

No new auth gates needed. All other interactions on Insights/MonthlyReport are intra-page (state changes, chart re-renders, share-API browser fall-through) and are not auth-gated by design.

---

## Design System Values (for UI steps)

Values captured from existing source files (Insights/MonthlyReport surfaces are NOT covered by `_plans/recon/design-system.md` — no per-page CSS Mapping Tables exist for these routes).

| Component / Element | Property | Value | Source |
|---|---|---|---|
| Body root (both pages) | className | `min-h-screen bg-dashboard-dark` | `Insights.tsx:181`, `MonthlyReport.tsx:95` |
| Hero section | style | `ATMOSPHERIC_HERO_BG` (`{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)' }`) | `frontend/src/components/PageHero.tsx:10`, design-system.md:766 |
| Hero section (Insights) | className | `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40` | `Insights.tsx:188` |
| Hero section (MonthlyReport) | className | (same) | `MonthlyReport.tsx:102` |
| h1 (both pages) | style | `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) | `frontend/src/constants/gradients.tsx`, `Insights.tsx:201`, `MonthlyReport.tsx:108` |
| h1 (both pages) | className | `mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2` | `Insights.tsx:200`, `MonthlyReport.tsx:107` |
| **(NEW) Time-of-day greeting `<p>` (Insights)** | className | `text-white/50 text-sm mb-2` | Direction Decision 13; matches Daily Hub greeting opacity floor — `text-white/50` is at the WCAG AA interactive-text floor on `bg-dashboard-dark` per `09-design-system.md` § "Text Opacity Standards" |
| **(NEW) Narrative subtitle `<p>` (Insights)** | className | `text-white/60 text-base sm:text-lg` | Direction Decision 6 — `font-sans` Inter (default), no italic, opacity preserved from previous subtitle |
| TimeRangePills selected pill | className | `min-h-[44px] rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white border border-white/30 transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` | Direction Decision 2; matches Spec 10A `RadioPillGroup` active-state at `_plans/2026-05-06-spec-10a-settings.md:143` |
| TimeRangePills inactive pill | className (preserved) | `min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors duration-fast hover:text-white/80 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` | `Insights.tsx:122` (preserved exactly) |
| MonthlyReport monthLabel `<span>` | className | `text-lg text-white sm:text-xl` (was `text-lg text-white/85 sm:text-xl`) | Direction Decision 11 — `text-white/85` is non-canonical, migrating to `text-white` |
| `FeatureEmptyState` (MonthlyReport empty) | icon prop | `Calendar` (lucide-react) | Spec 10B FR12; existing Insights uses `BarChart3` (`Insights.tsx:250`) — picking `Calendar` keeps a different mental model from "no mood data" so users distinguish the two empty states |
| `MonthlyShareButton` placement | DOM order | Immediately after the month pager / hero `<section>` and Breadcrumb, before the AnimatedSection cascade. Render only when `hasData === true`. | Direction Decision 13; spec FR14 |

**Atmospheric layer (preserved per Direction Decision 1):** `bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero. Do NOT add `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`.

**Card chrome (preserved per Direction Decision 21):** All `bg-white/5` / `bg-white/[0.06]` / `bg-white/[0.08]` rolls-own card chrome across the 18 insight components stays unchanged. No FrostedCard adoption sweep.

---

## Design System Reminder

**Project-specific quirks `/execute-plan` displays before every UI step:**

- Insights and MonthlyReport are **inner pages**, not the homepage and not the Daily Hub. They use the canonical inner-page atmospheric pattern: `bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero. Same pattern as Settings, Friends, Grow, MyPrayers. Do NOT introduce `HorizonGlow` (Daily Hub only) or `GlowBackground` (homepage sections).
- `font-script` Caveat is deprecated for headings per Spec 6D Decision 6 / `09-design-system.md` § "Decorative Font". The h1's `GRADIENT_TEXT_STYLE` already provides emphasis. Just remove the `<span class="font-script">` wrapper around the inner word; do NOT replace with a different decorative treatment.
- `font-serif italic` on prose body text is deprecated per `09-design-system.md` § "Daily Hub body text readability standard (post Spec T)". The narrative subtitle migrates to canonical body prose: `font-sans` Inter (default; do not specify), no italic, `text-white/60` (preserved opacity).
- `text-white/85` is **not** a canonical text opacity. Canonical body opacities are `text-white`, `text-white/70`, `text-white/60`, `text-white/50`, decorative `text-white/20-/40`. Migrate `text-white/85` → `text-white` (the monthLabel is heading-adjacent — full opacity).
- The TimeRangePills active-state migration is **mechanical pattern application**. The 10A canonical is `bg-white/15 text-white border border-white/30`. The previous `bg-primary/20 text-primary-lt` violet tint is the deprecated pattern. Verify the post-10A `RadioPillGroup` selected-pill class string at execution time and mirror it; if 10A's execution surfaced any deviation, mirror that deviation.
- The Insights time-of-day greeting must match the **Daily Hub** canonical (`pages/DailyHub.tsx` lines 59-64 + 157-158): title case (`'Good Morning'` not `'Good morning'`), thresholds `< 12` / `< 17` / else, includes user display name with trailing exclamation when authenticated (`${greeting}, ${user.name}!`). Do NOT match `DashboardHero.tsx` (different boundary hours, sentence case) — that is a separate codebase pattern, not the canonical referent for Direction Decision 13.
- The narrative subtitle has 3 variants: zero entries → `'Your story is just beginning.'`; returning after 14+ day gap → `'Welcome back. Your story continues.'`; standard → `'Your story so far.'`. Direction Decision 13 explicitly requires "warm framing; avoid mentioning gaps" — do not include the gap duration ("Welcome back after 30 days") in any variant. Anti-Pressure Copy Checklist passes.
- The `<FeatureEmptyState>` primitive is canonical for any new empty state per `09-design-system.md` § "First-Run & Empty State Components". Do NOT roll your own empty-state UI for the MonthlyReport empty branch. Adapt to the existing API: `icon`, `heading`, `description`, optional `ctaLabel` + `ctaHref`. The empty-state copy must pass the 6-point Anti-Pressure Copy Checklist (no comparison, no urgency, no exclamation near vulnerability, no therapy-app jargon, no streak-as-shame, no false scarcity).
- React Context performance: the `value` object passed to `<InsightsDataContext.Provider>` MUST be wrapped in `useMemo` (or be an outer-stable reference) — passing `{ moodEntries, getMonthlyEntries }` inline triggers re-renders in every consumer on every Provider parent re-render (Insights.tsx re-renders on TimeRange change). Wrap the value in `useMemo([moodEntries])`.
- The `useInsightsData()` hook must throw with a clear message when called outside the provider. Same pattern `useAuth()` uses (clear error → console stack trace → fast diagnosis). Do NOT silently return `null` or default data.
- Tests for the Provider must mutate the underlying source AFTER mount (or re-render the provider with different mock data) and assert the consumer re-renders. Mocking the entire context (`vi.mock('@/contexts/InsightsDataContext')`) bypasses the value-memoization mechanism — that anti-pattern doesn't apply here (CRUD-service, not reactive store), but mocking the context still defeats integration tests. Mock the underlying `getMoodEntries` instead.

**Source these from:** the design-system recon (`_plans/recon/design-system.md`), the cluster recon (`_plans/recon/settings-insights-2026-05-05.md`), `09-design-system.md` (especially Round 3 + Daily Hub Visual Architecture + Deprecated Patterns + Anti-Pressure Checklist), Spec 10A's plan (`_plans/2026-05-06-spec-10a-settings.md` lines 143-144 for the active-state class string), and `Insights.tsx` / `MonthlyReport.tsx` source for inherited values.

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift back to default assumptions.

---

## Shared Data Models (from Master Plan)

The Direction doc does not introduce new shared interfaces. The `MoodEntry` type consumed by the new context is unchanged.

```typescript
// frontend/src/types/dashboard.ts (existing — UNCHANGED)
export interface MoodEntry {
  id: string
  date: string
  mood: MoodValue
  moodLabel: MoodLabel
  text: string
  timestamp: number
  verseSeen: string
  timeOfDay?: 'morning' | 'evening'
}

// frontend/src/contexts/InsightsDataContext.tsx (NEW — exported for type clarity)
export interface InsightsDataContextValue {
  moodEntries: MoodEntry[]
  getMonthlyEntries: (month: number, year: number) => MoodEntry[]
}

// frontend/src/hooks/useMonthlyReportData.ts (MODIFIED — return shape gains 2 fields)
export interface MonthlyReportData {
  // existing fields preserved
  month: number
  year: number
  monthName: string
  dateRange: string
  daysActive: number
  daysInRange: number
  pointsEarned: number
  startLevel: string
  endLevel: string
  levelProgressPct: number
  moodTrendPct: number
  longestStreak: number
  badgesEarned: string[]
  bestDay: { date: string; formattedDate: string; activityCount: number; mood: string } | null
  activityCounts: Record<string, number>
  moodEntries: MoodEntry[]
  // NEW
  hasData: boolean
  isCurrentMonth: boolean
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Read (via existing `getMoodEntries()` — call sites move into the provider, semantics unchanged) | Source of all mood data on Insights/MonthlyReport. NO new writes. |

No new keys. No write-side changes. The `11-local-storage-keys.md` inventory is unchanged.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `/insights` hero: time-of-day greeting (`text-sm`, single line), h1 (`text-3xl`), narrative subtitle (`text-base`). TimeRangePills row below hero, all 5 pills horizontal without wrap (`flex items-center justify-center gap-2`). 11 AnimatedSection wrappers stack vertically inside `mx-auto max-w-5xl space-y-6 px-4`. `/insights/monthly` hero: h1 (no font-script), monthLabel `text-white text-lg`, month pager. `<FeatureEmptyState>` when `hasData=false`. MonthlyShareButton immediately below hero/Breadcrumb when `hasData=true`, then 7 AnimatedSection wrappers stacked. |
| Tablet | 768px | Same hero layout; typography scales via `sm:` (`sm:text-4xl` h1, `sm:text-lg` subtitle). TimeRangePills row stays horizontal. AnimatedSection grid uses existing per-component layout (preserved). MonthlyShareButton above the fold preserved. |
| Desktop | 1440px | Hero scales via `lg:` (`lg:text-5xl` h1). TimeRangePills row centered with `justify-center`. AnimatedSection components keep their existing desktop layouts. Sticky-pill bar (`fixed top-0 z-40` when `isSticky`) preserved. MonthlyShareButton above the fold preserved. |

**Custom breakpoints (if any):** None. All responsive transitions use the canonical `sm:`/`lg:` Tailwind breakpoints (640px / 1024px) already in the source files. This spec does not introduce new breakpoints.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---|---|---|---|
| TimeRangePills row (Insights) | 5 pills (30d / 90d / 180d / 1y / All) | At 1440px and 768px: matching top-y values (±5px) — all 5 pills are structurally identical equal-height pill buttons with `min-h-[44px]`. No wrap allowed at these breakpoints. | At 375px: matching top-y values (±5px) — the labels are 3-4 chars each, total content width is well under viewport at 375px. No wrap expected. |
| MonthlyReport month pager row | `<button>← prev</button>` + `<span>{month name year}</span>` + `<button>→ next</button>` | At 1440px, 768px, 375px: matching center-y alignment via `flex items-center gap-3`. The buttons are equal-height (`min-h-[44px] min-w-[44px]`); the span is plain text. No wrap allowed at any breakpoint — total content is "Previous month / Month YYYY / Next month" which fits in <300px at base font. | None — no wrap allowed at any breakpoint |
| Insights hero stack (greeting → h1 → subtitle) | 3 stacked elements (`<p>` greeting, `<h1>`, `<p>` subtitle) | NOT inline — vertical stack. Each on its own row inside `flex flex-col items-center`. No positional verification required between rows. | N/A |
| MonthlyReport hero (h1 + month pager row) | h1 then month pager row | Vertical stack. Positional verification covers the inline pager row separately (above). | N/A |

The TimeRangePills row is the canonical "Matching top-y" case (structurally identical equal-height children) per the plan-skill guidance — every pill is a `<button>` with the same `min-h-[44px] rounded-full` chrome. Verification at 0px delta should pass at every breakpoint per the same precedent as Spec 6A's tab bar.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Insights hero `</section>` → sentinel div → TimeRange pills container | The hero has `pb-8 sm:pb-12 lg:pt-40`; the time-range pills container has `py-3` (12px top/bottom padding). Combined: 32px (hero `pb-8`) + 12px (pills `py-3` top) = 44px between hero text bottom and pill top at mobile; 48px + 12px = 60px at tablet. | `Insights.tsx:188` (hero) + `Insights.tsx:215` (pills) |
| TimeRange pills bottom → main content top | `<main>` uses `mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6`. No top padding on main. Combined: 12px (pills `py-3` bottom). | `Insights.tsx:237` |
| AnimatedSection → AnimatedSection (all sections) | `space-y-6` on `<main>` → 24px between siblings | `Insights.tsx:237`, `MonthlyReport.tsx:146` |
| Main `</main>` → `<SiteFooter />` | No explicit padding bottom beyond `pb-12` on main (48px). SiteFooter has its own internal padding. | `Insights.tsx:307`, `MonthlyReport.tsx:208` |
| **(NEW) MonthlyReport: hero `</section>` → Breadcrumb → MonthlyShareButton** | `<Breadcrumb>` has its own internal vertical rhythm (preserved). The MonthlyShareButton renders inside `<main>` — first child when `hasData=true`. `space-y-6` provides 24px between MonthlyShareButton and the first AnimatedSection (MonthlyStatCards) below. | New layout per Direction Decision 13 |
| **(NEW) MonthlyReport empty branch: hero → FeatureEmptyState** | `<FeatureEmptyState>` has its own internal padding (`py-12` default, or `py-6` if `compact`). 48px above the icon. | `frontend/src/components/ui/FeatureEmptyState.tsx:37` |

`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **Spec 10A is merged** into `forums-wave-continued` (or whichever working branch). The TimeRangePills active-state migration depends on 10A's `bg-white/15 text-white border border-white/30` canonical. If 10A is not merged, abort 10B until it is.
- [ ] All prior specs (1A–9) are merged.
- [ ] Direction doc at `_plans/direction/settings-insights-2025-05-05.md` is on disk (note: brief states `2026-05-05.md`; on-disk file uses `2025-05-05.md` — using on-disk path).
- [ ] Recon doc at `_plans/recon/settings-insights-2026-05-05.md` is on disk.
- [ ] **Pre-execution recon Step 5: `getMoodEntries()` call-site grep run.** Verified at plan-time:
  - `frontend/src/components/insights/InsightCards.tsx:67`
  - `frontend/src/components/insights/GratitudeCorrelationCard.tsx:11`
  - `frontend/src/components/insights/CommunityConnections.tsx:18`
  - `frontend/src/components/insights/CalendarHeatmap.tsx:20`
  - `frontend/src/components/insights/PrayerLifeSection.tsx:32`
  - `frontend/src/pages/Insights.tsx:157`
  - `frontend/src/pages/MonthlyReport.tsx:57`
  - **Hooks scope:** `frontend/src/hooks/useMonthlyReportData.ts:100` (migrated explicitly in Step 7), `frontend/src/hooks/useMoodChartData.ts:22` (out of scope — hook is in `frontend/src/hooks/`, not `frontend/src/components/insights/` or `frontend/src/pages/`; preserved per the canonical grep rule).
  - **If Step 1 of execution surfaces additional call sites in the documented scope** (`components/insights/`, `pages/Insights.tsx`, `pages/MonthlyReport.tsx`), migrate them; the grep is canonical source of truth.
- [ ] **Pre-execution recon Step 7: TimeRangePills location.** Verified at plan-time: TimeRangePills is **inline** inside `Insights.tsx` lines 62-131. NOT extracted to a separate component file. Step 5 of execution edits the inline component.
- [ ] **Pre-execution recon Step 8: `<FeatureEmptyState>` API.** Verified at plan-time: `frontend/src/components/ui/FeatureEmptyState.tsx`, props `icon`, `iconClassName?`, `heading`, `description`, `ctaLabel?`, `ctaHref?`, `onCtaClick?`, `children?`, `compact?`, `className?`. Adapt props for the empty MonthlyReport use case (no CTA — the empty state is informational only).
- [ ] **Pre-execution recon Step 9: MonthlyShareButton current placement.** Verified at plan-time: inside `AnimatedSection index={suggestions.length > 0 ? 6 : 5}` at `MonthlyReport.tsx:185-199`, immediately followed by the "Preview Email" button (`MonthlyReport.tsx:193-198`). The MonthlyShareButton + Preview Email button are siblings inside the same AnimatedSection. **Decision:** promote BOTH (the share button and its companion Preview Email link) to above the fold, as a unit, to preserve the existing affordance pairing. They render in the same wrapper, just earlier in the DOM order. Render only when `hasData=true`.
- [ ] **Pre-execution recon Step 10: Daily Hub greeting canonical.** Verified at plan-time: `frontend/src/pages/DailyHub.tsx:59-64` (function `getGreeting()`) + `:157-158` (display name composition). Title case, thresholds `< 12` / `< 17` / else, includes user display name with trailing exclamation. Spec 10B applies these verbatim.
- [ ] **Welcome-back gap-detection pattern.** No existing "returning after N days" detection logic was found in the codebase via grep. The 14-day threshold per the spec brief is the default (no precedent to mirror).
- [ ] **Test baseline** captured: `pnpm install`, `pnpm typecheck`, `pnpm test` pass cleanly OR known-failing tests are documented. Frontend regression baseline from CLAUDE.md: 9,470 pass / 1 pre-existing fail (`useFaithPoints — intercession`).
- [ ] All auth-gated actions from the spec are accounted for in the plan (zero new — only existing route-level redirects preserved).
- [ ] Design system values are verified — sourced from existing source files since Insights/MonthlyReport are not in the design-system recon's Page CSS Mapping Tables.
- [ ] No `[UNVERIFIED]` values flagged — every value used in the plan is sourced from existing code or the canonical `09-design-system.md`.
- [ ] Recon doc loaded for cluster context. Design-system recon loaded for atmospheric/font/opacity baselines that DO apply (text opacity standards, gradient text style, atmospheric hero bg).
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, `font-serif italic` on prose, `text-white/85` non-canonical opacity, soft-shadow 8px-radius cards on dark backgrounds, PageTransition).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `useMoodChartData` migration | **Out of scope.** Hook in `frontend/src/hooks/`, not in the canonical grep scope (components/insights/ + pages files). Per spec FR3 + Out of Scope: "verification only — no code changes expected." | The grep is canonical. The `MoodTrendChart` component receives `MoodChartDataPoint[]` from the hook; the hook reads `getMoodEntries()` once internally. This adds a 6th call site total, but the spec explicitly accepts this — the architecture migration covers components/insights/ + page files. Future spec can convert `useMoodChartData` to consume `useInsightsData()` if needed. |
| MonthlyShareButton companion "Preview Email" button | **Promote together.** The button currently renders as a sibling inside the same AnimatedSection. Move both to above the fold as a unit. | Preserves affordance pairing. Both gated behind `hasData=true`. |
| Empty state icon for MonthlyReport | **`Calendar` from lucide-react** | `BarChart3` is already used by Insights.tsx empty state (line 250). Different icon for different empty state — Calendar is semantically apt for "month with no data" vs "mood data overall". |
| `useMonthlyReportData` aggregator depth | **Hook reads via `useInsightsData().getMonthlyEntries(month, year)` instead of calling `getMoodEntries()` directly.** This requires the hook to be called inside an `InsightsDataProvider`. | Hook becomes provider-coupled. Tests must wrap. The brief explicitly requires this in FR13. The alternative (hook still calls `getMoodEntries()`) keeps a 2nd call per MonthlyReport mount, defeating the perf hoist. |
| `useInsightsData()` outside provider | **Throw `Error('useInsightsData must be used within InsightsDataProvider')`.** | Same DX guard `useAuth()` uses. Silent `null` return is the worse failure mode (data appears empty in UI; bug ships silently). |
| Provider value memoization | **Wrap the `value` object in `useMemo([moodEntries])`.** Stable reference unless `moodEntries` changes. | Prevents consumer re-renders on every Provider parent re-render. Insights.tsx re-renders on TimeRange change; without `useMemo`, every consumer re-renders even though `moodEntries` didn't change. |
| Test wrapping helper | **Inline `<InsightsDataProvider>` in each test's `render(...)`.** Optional: extract a `renderWithProvider` helper if 5+ tests in a single file use the same shape. | Consistent with existing test patterns (no app-wide test utilities for context providers). |
| Test mock approach for `mood-storage` | **Keep `vi.mock('@/services/mood-storage')` at file top.** The mock controls what `getMoodEntries` returns when `<InsightsDataProvider>` calls it on mount. | Same mock injection point; just routed through the provider. Don't try to mock `useInsightsData` directly — that defeats the integration test. |
| `isCurrentMonth` placement | **Move to `useMonthlyReportData` return shape (FR13).** | Single source of truth. The hook already knows `month`/`year` and computes related state. |
| `hasData` threshold | **`moodEntries.length > 0`.** Same as the existing `hasRealData` boolean (line 105 of useMonthlyReportData), just exposed in the return shape. | The hook's existing semantics are preserved; the existing branch `hasRealData = moodEntries.length > 0` becomes `hasData` and is exposed. |
| Narrative subtitle for missing `lastEntry.timestamp` | **Fall back to `'Your story so far.'` (the standard variant).** If `timestamp` is malformed (NaN), the `daysSinceLast` calc returns NaN; treat as "not gap". | Defensive — safest default; never shows "Welcome back" when data is malformed. |
| Insights returning-user variant detection | **Compute via `useMemo` over `moodEntries`.** No additional storage key. | Direction Decision 13 explicitly avoids "mentioning gaps" but allows detecting them. The 14-day threshold is the brief's default. No persistence needed (each visit re-evaluates). |
| Greeting includes user display name | **Yes, when authenticated.** Per Daily Hub canonical: `${greeting}, ${user.name}!`. Insights routes are authenticated by definition (route-level redirect for logged-out). | Match Daily Hub precedent verbatim. |
| `useMonthlyReportData` empty-state aggregation values | **All zeros / empty arrays / null.** No fabricated content. | Direction Decision 11 — silent-mock-fallback is the bug being fixed. Every fabricated branch (mock daysActive=24, mock pointsEarned=1847, mock activityCounts, mock startLevel/endLevel/levelProgressPct, mock moodTrendPct=12, mock longestStreak=7, mock badgesEarned=MOCK_BADGE_IDS, mock bestDay) gets removed. The empty return shape uses zero counts and empty arrays. The MonthlyReport page never renders the section components in `hasData=false` (FeatureEmptyState replaces them) — the values are never used in the UI. They are returned as zeros for type contract correctness. |
| `useMonthlyReportData` test data fabrication | **Existing tests that asserted mock data values must be updated to assert empty values OR seed mood entries first.** | The fix is a behavioral change. Tests that were asserting `daysActive=24` for an empty month must now either (a) assert `daysActive=0` (empty case) or (b) seed mood entries first to test `hasData=true`. |
| MonthlyShareButton hidden state | **`hasData ? <MonthlyShareButton /> : null`** | No point sharing an empty report (Direction Decision 13). Aligns with the Anti-Pressure principle (no fabricated share content). |

---

## Implementation Steps

### Step 1: Create `InsightsDataContext` module (Provider, hook, type)

**Objective:** Introduce the new React Context that hoists `getMoodEntries()` to a single page-level read.

**Files to create/modify:**

- `frontend/src/contexts/InsightsDataContext.tsx` — NEW. Single-file module exporting `InsightsDataContext` (the React Context), `InsightsDataProvider` (component), `useInsightsData` (hook), `InsightsDataContextValue` (type).

**Details:**

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { MoodEntry } from '@/types/dashboard'
import { getMoodEntries } from '@/services/mood-storage'

export interface InsightsDataContextValue {
  moodEntries: MoodEntry[]
  getMonthlyEntries: (month: number, year: number) => MoodEntry[]
}

const InsightsDataContext = createContext<InsightsDataContextValue | null>(null)

export function InsightsDataProvider({ children }: { children: ReactNode }) {
  // Single read on mount; stable across re-renders
  const moodEntries = useMemo(() => getMoodEntries(), [])

  const value = useMemo<InsightsDataContextValue>(() => {
    return {
      moodEntries,
      getMonthlyEntries: (month: number, year: number) => {
        return moodEntries.filter((e) => {
          const d = new Date(e.date + 'T12:00:00')
          return d.getMonth() === month && d.getFullYear() === year
        })
      },
    }
  }, [moodEntries])

  return (
    <InsightsDataContext.Provider value={value}>
      {children}
    </InsightsDataContext.Provider>
  )
}

export function useInsightsData(): InsightsDataContextValue {
  const ctx = useContext(InsightsDataContext)
  if (!ctx) {
    throw new Error('useInsightsData must be used within InsightsDataProvider')
  }
  return ctx
}
```

**Auth gating (if applicable):** N/A — context is auth-agnostic. Both consumer pages enforce auth at route mount; the provider wraps INSIDE the auth check, so a logged-out user never reaches the provider.

**Responsive behavior:** N/A: no UI impact (data layer only).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT introduce `subscribe()` API or reactive store mechanics. `mood-storage` is a CRUD service; the context just centralizes the read.
- Do NOT call `getMoodEntries()` in `useInsightsData()` — it's the provider's job. The hook reads from context.
- Do NOT silently return null/empty when used outside the provider — throw an Error with a clear message.
- Do NOT skip the `useMemo` on the `value` object. Without it, every consumer re-renders on every parent re-render.
- Do NOT export the raw `InsightsDataContext` for direct consumption (consumers must use `useInsightsData()` to get the throw-on-misuse guard).
- Do NOT add additional getters (no `getEntriesForRange(start, end)`) — the provider exposes only the raw array + the single monthly selector consumed by `useMonthlyReportData`. Per-component derivations stay in their components.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Provider exposes `moodEntries` matching `getMoodEntries()` | unit | Mock `getMoodEntries` to return a known array. Render `<InsightsDataProvider>` with a child consumer that pushes `moodEntries` via `useInsightsData()`. Assert child receives the exact array. |
| `getMonthlyEntries(month, year)` filters correctly | unit | Mock `getMoodEntries` with 4 entries: Feb 2026, Mar 2026, Apr 2026, Mar 2025. Call `getMonthlyEntries(2, 2026)` (March 2026). Assert returns only the Mar 2026 entry. |
| `getMonthlyEntries` returns empty array when no matches | unit | Mock `getMoodEntries` with entries only in March 2026. Call `getMonthlyEntries(0, 2025)` (January 2025). Assert returns `[]`. |
| `useInsightsData` throws outside provider | unit | Render a component that calls `useInsightsData()` WITHOUT `<InsightsDataProvider>`. Assert the render throws `Error` with message `'useInsightsData must be used within InsightsDataProvider'`. Use React's `ErrorBoundary` or `expect(() => render(...)).toThrow(...)`. |
| `moodEntries` reference is stable across consumer re-renders | unit | Render the provider, capture `moodEntries` reference in a child's `useEffect`. Trigger a parent re-render (e.g., by changing a prop on a wrapper). Assert the captured reference equals (`===`) the new reference. |
| Provider's `getMoodEntries()` fires once per mount | unit | `vi.mocked(getMoodEntries).mock.calls` length should be 1 after mount + 1 forced re-render. (Wrap in `<InsightsDataProvider>` and force a re-render via state change in a wrapper component.) |

**Expected state after completion:**

- [ ] `frontend/src/contexts/InsightsDataContext.tsx` exists with the exact public API (`InsightsDataProvider`, `useInsightsData`, `InsightsDataContextValue`).
- [ ] All 6 smoke tests pass.
- [ ] `pnpm typecheck` passes.
- [ ] No production code consumes the context yet (consumers wired in Step 3).

---

### Step 2: Add provider tests file

**Objective:** Create the smoke-test file for the new context module.

**Files to create/modify:**

- `frontend/src/contexts/__tests__/InsightsDataContext.test.tsx` — NEW. Contains the 6 tests from Step 1's test specifications.

**Details:**

Mirror existing test file structure (e.g., `frontend/src/contexts/__tests__/AuthContext.test.tsx`). Use `vi.mock('@/services/mood-storage')` at file top. Use `renderHook` (from `@testing-library/react`) for hook tests where convenient; use `render` with a small consumer component for cases where you need to capture rendered output.

Example test scaffolding:

```tsx
import { render, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InsightsDataProvider, useInsightsData } from '../InsightsDataContext'
import { getMoodEntries } from '@/services/mood-storage'
import type { MoodEntry } from '@/types/dashboard'

vi.mock('@/services/mood-storage', () => ({
  getMoodEntries: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getMoodEntries).mockReturnValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InsightsDataContext', () => {
  it('Provider exposes moodEntries matching getMoodEntries()', () => {
    const entries: MoodEntry[] = [/* test entries */]
    vi.mocked(getMoodEntries).mockReturnValue(entries)
    const { result } = renderHook(() => useInsightsData(), {
      wrapper: InsightsDataProvider,
    })
    expect(result.current.moodEntries).toBe(entries)
  })

  // ... 5 more tests
})
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT mock `useInsightsData()` directly — mock `getMoodEntries` and let the real provider run.
- Do NOT skip the "throws outside provider" test — it's the canonical DX guard.
- Do NOT skip the "fires once per mount" test — it's the perf justification for the spec.

**Test specifications:** (defined in Step 1)

**Expected state after completion:**

- [ ] `frontend/src/contexts/__tests__/InsightsDataContext.test.tsx` exists with all 6 tests passing.

---

### Step 3: Migrate the 5 grep-flagged production component call sites

**Objective:** Replace direct `getMoodEntries()` calls with `useInsightsData().moodEntries` in the 5 components flagged by the canonical grep. Preserve all `useMemo` filtering / aggregation logic exactly.

**Files to create/modify:**

- `frontend/src/components/insights/InsightCards.tsx` — At line 7, remove `import { getMoodEntries } from '@/services/mood-storage'`. Add `import { useInsightsData } from '@/contexts/InsightsDataContext'`. Inside the component, before the existing `useMemo`s, add `const { moodEntries: entries } = useInsightsData()`. Replace line 67 (`const entries = getMoodEntries()`) with the destructure (move it OUTSIDE the inner `useMemo` so it lives at the component's top). Update the `useMemo` deps to `[entries]` (was `[]`). The `computeMoodChangeInsight(entries)` call is preserved exactly.
- `frontend/src/components/insights/GratitudeCorrelationCard.tsx` — At line 4, swap import. At line 11 (inside `useMemo`), replace `const moodEntries = getMoodEntries()` with `const { moodEntries } = useInsightsData()` at the component top, and update the `useMemo` deps to include `[moodEntries]` (or whatever the existing deps array contains).
- `frontend/src/components/insights/CommunityConnections.tsx` — At line 4, swap import. At line 18 (inside `useMemo`), replace `const moodEntries = getMoodEntries()` with `const { moodEntries } = useInsightsData()` at the component top. Update useMemo deps to `[visits, hasData, moodEntries]` (or whatever the existing deps were, plus `moodEntries`).
- `frontend/src/components/insights/CalendarHeatmap.tsx` — At line 3, swap import. At line 20 (top of render or inside `useMemo([rangeDays])`), replace `const entries = getMoodEntries()` with `const { moodEntries: entries } = useInsightsData()` at the component top. Update useMemo deps to `[rangeDays, entries]`.
- `frontend/src/components/insights/PrayerLifeSection.tsx` — At line 3, swap import. At line 32, replace `const moodEntries = getMoodEntries()` with `const { moodEntries } = useInsightsData()`. The function's other reads (`getPrayers()`) are unchanged.

**Details:**

For each file, the diff pattern is:

```tsx
// BEFORE
import { getMoodEntries } from '@/services/mood-storage'
// ...
function ComponentName(props) {
  const someValue = useMemo(() => {
    const entries = getMoodEntries()  // direct service call
    return computeFromEntries(entries)
  }, [/* existing deps */])
  // ...
}

// AFTER
import { useInsightsData } from '@/contexts/InsightsDataContext'
// ...
function ComponentName(props) {
  const { moodEntries: entries } = useInsightsData()  // hoisted to component top
  const someValue = useMemo(() => {
    return computeFromEntries(entries)
  }, [/* existing deps + entries */])
  // ...
}
```

**Verification command (run after migration):**

```bash
grep -rn "getMoodEntries" frontend/src/components/insights/
grep -rn "getMoodEntries" frontend/src/pages/Insights.tsx
grep -rn "getMoodEntries" frontend/src/pages/MonthlyReport.tsx
```

Expected: zero matches in `components/insights/`. Zero matches in the page files (after Steps 4 and 6). The only legitimate `getMoodEntries` call in the production tree post-migration is the provider's internal call inside `frontend/src/contexts/InsightsDataContext.tsx`, plus the unchanged `frontend/src/hooks/useMoodChartData.ts:22` (out of scope — `MoodTrendChart` consumes it; per the canonical grep rule, the hook is not in the migration scope).

**Auth gating:** N/A — components don't gate.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT change useMemo computation logic. The migration moves the read; the derived data is unchanged.
- Do NOT remove existing useMemo deps. ADD `moodEntries` (or `entries`) to the deps; do not replace.
- Do NOT migrate `useMoodChartData.ts` — it's out of scope per the canonical grep rule (hook lives in `frontend/src/hooks/`, not `frontend/src/components/insights/` or pages).
- Do NOT touch the 13 components that don't call `getMoodEntries()` in production code.
- Do NOT introduce a `useInsightsData()` call inside an inner `useMemo` callback. Hoist the destructure to the component's top.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Each migrated component renders inside `<InsightsDataProvider>` and consumes `moodEntries` from context | integration | Test files for the 5 migrated components must be wrapped in `<InsightsDataProvider>`. Existing `vi.mock('@/services/mood-storage')` (where present) controls the data injection. Update test render calls to wrap in provider. |
| Each migrated component throws clear error when rendered without provider | integration | Render the component without `<InsightsDataProvider>`. Assert the render throws with the canonical error message. (One test per migrated component, parameterized.) |

**Expected state after completion:**

- [ ] All 5 component files show `useInsightsData()` consumption; no `getMoodEntries` import.
- [ ] All 5 component test files render inside `<InsightsDataProvider>`.
- [ ] `grep -rn "getMoodEntries" frontend/src/components/insights/` returns zero matches.
- [ ] `pnpm typecheck` passes.
- [ ] All existing component tests pass (with provider wrapper added).

---

### Step 4: Update `Insights.tsx` page — wrap in provider, remove `font-script`, migrate subtitle, add greeting, migrate TimeRangePills active-state

**Objective:** All Insights.tsx hero migrations + provider wrap + TimeRangePills active-state migration applied in a single edit pass to reduce edit churn.

**Files to create/modify:**

- `frontend/src/pages/Insights.tsx` — Multiple changes (~30-40 LOC delta):
  - Line 23: Remove `import { getMoodEntries } from '@/services/mood-storage'`. Add `import { InsightsDataProvider, useInsightsData } from '@/contexts/InsightsDataContext'`.
  - Line 121: TimeRangePills selected pill class string changes from `'min-h-[44px] rounded-full bg-primary/20 px-4 py-2 text-sm font-medium text-primary-lt transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'` to `'min-h-[44px] rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white border border-white/30 transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'`. Inactive pill at line 122 unchanged.
  - **Refactor structure**: split the existing `Insights` function into an outer `Insights` shell (renders `<InsightsDataProvider>` only) and an inner `InsightsContent` (the body, including the auth-redirect). The outer shell wraps the auth-redirect in the provider. Reason: `useInsightsData` cannot be called inside the same component that renders `InsightsDataProvider`; the consumer must be a child.

    ```tsx
    export function Insights() {
      const { isAuthenticated } = useAuth()
      if (!isAuthenticated) return <Navigate to="/" replace />
      return (
        <InsightsDataProvider>
          <InsightsContent />
        </InsightsDataProvider>
      )
    }

    function InsightsContent() {
      const { user } = useAuth()
      const [range, setRange] = useState<TimeRange>('30d')
      const [isSticky, setIsSticky] = useState(false)
      const sentinelRef = useRef<HTMLDivElement>(null)
      const { moodEntries: entries } = useInsightsData()
      const hasData = entries.length > 0
      const rangeDays = getRangeDays(range, entries)
      // ... rest of the existing body, minus the auth check
    }
    ```

  - Inside `InsightsContent`, ABOVE the existing useMemos, add the greeting + narrative subtitle computations:

    ```tsx
    const greeting = useMemo(() => {
      const hour = new Date().getHours()
      if (hour < 12) return 'Good Morning'
      if (hour < 17) return 'Good Afternoon'
      return 'Good Evening'
    }, [])

    const greetingDisplay = user ? `${greeting}, ${user.name}!` : `${greeting}!`

    const narrativeSubtitle = useMemo(() => {
      if (entries.length === 0) return 'Your story is just beginning.'
      const lastEntry = entries[entries.length - 1]
      const lastTs = new Date(lastEntry.timestamp).getTime()
      if (!Number.isFinite(lastTs)) return 'Your story so far.'
      const daysSinceLast = Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24))
      if (daysSinceLast > 14) return 'Welcome back. Your story continues.'
      return 'Your story so far.'
    }, [entries])
    ```

  - Hero section JSX (lines 186-208): replace the existing hero body with:

    ```tsx
    <section
      aria-labelledby="insights-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Dashboard
      </Link>
      <p className="text-white/50 text-sm mb-2">{greetingDisplay}</p>
      <h1
        id="insights-heading"
        className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        Mood Insights
      </h1>
      <p className="text-white/60 text-base sm:text-lg">
        {narrativeSubtitle}
      </p>
    </section>
    ```

  - **Note:** the existing h1 inner text is `Mood <span className="font-script">Insights</span>` — after migration it becomes plain `Mood Insights` (single space, no span). The Direction doc explicitly says "Drop all 3 `<span className="font-script">` instances" — the parent h1's `GRADIENT_TEXT_STYLE` carries the emphasis.
  - The narrative subtitle `<p>` retains the SAME `text-white/60` opacity as before, just removes `font-serif italic`. The Tailwind default `font-sans` (Inter) is inherited from the body. Plus the `text-base sm:text-lg` sizing is preserved.

**Details:**

The structural refactor (split into `Insights` shell + `InsightsContent`) is necessary because `useInsightsData()` requires being inside the provider. The cleanest pattern is an outer shell that does only auth + provider mounting. Tests for the page-level behavior (greeting, subtitle, TimeRangePills) target `InsightsContent`, and the outer `Insights` integration test verifies the provider is wired.

**Auth gating (if applicable):**

- Logged-out → existing route-level redirect to `/` preserved exactly. The `<Navigate to="/" replace />` lives in the outer `Insights` shell, BEFORE the provider mount.
- Logged-in → provider mounts; full hero + content renders.

**Responsive behavior:**

- Desktop (1440px): hero typography scales (`lg:text-5xl` h1), greeting `text-sm`, subtitle `text-lg`. TimeRangePills row centered.
- Tablet (768px): hero typography scales (`sm:text-4xl`, `sm:text-lg`), TimeRangePills row centered.
- Mobile (375px): hero typography at base sizes (`text-3xl`, `text-base`), greeting `text-sm`, subtitle `text-base`. TimeRangePills row horizontal, all 5 visible.

**Inline position expectations (if this step renders an inline-row layout):**

- TimeRangePills row (5 pills) must share top-y values within ±5px at 1440px, 768px, AND 375px (structurally identical equal-height pill buttons; `min-h-[44px]` enforced).

**Guardrails (DO NOT):**

- Do NOT remove the `<Link to="/">← Dashboard</Link>` back link from the hero. Existing affordance.
- Do NOT add a back link to MonthlyReport hero (different page; uses `<Breadcrumb>`).
- Do NOT change the h1's id (`insights-heading`), `GRADIENT_TEXT_STYLE` style, font sizing, or `aria-labelledby` reference.
- Do NOT change the hero `<section>`'s className or `ATMOSPHERIC_HERO_BG` style.
- Do NOT import `font-script` or restore Caveat-styled headings.
- Do NOT replace `font-serif italic` with another non-canonical opacity (e.g., `text-white/85`); use exact `text-white/60`.
- Do NOT introduce a parallel time-of-day greeting function with different boundary hours. Use the Daily Hub canonical: `< 12` / `< 17` / else.
- Do NOT skip `useMemo` on `narrativeSubtitle` — recomputation on every render is wasteful and the deps `[entries]` are stable inside the provider.
- Do NOT change the inactive TimeRangePills pill class string (only the selected pill migrates).
- Do NOT add new auth modals or auth gates to any TimeRangePills option click.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| h1 has no `font-script` span | unit | Render Insights inside provider with auth-mock. Assert `screen.getByRole('heading', { level: 1 })` text content equals `'Mood Insights'` (single string, no span markup). Assert no element with class `font-script` inside the heading. |
| Subtitle migrates to canonical body prose | unit | Assert subtitle `<p>` has class `text-white/60 text-base sm:text-lg` AND does NOT have `font-serif` or `italic`. |
| Narrative subtitle: empty entries → `'Your story is just beginning.'` | unit | Mock `getMoodEntries` to return `[]`. Render. Assert subtitle text equals `'Your story is just beginning.'`. |
| Narrative subtitle: returning-after-gap → `'Welcome back. Your story continues.'` | unit | Mock `Date.now` to be 15 days after `mockEntry.timestamp`. Mock `getMoodEntries` to return `[mockEntry]`. Render. Assert subtitle text equals `'Welcome back. Your story continues.'`. |
| Narrative subtitle: standard → `'Your story so far.'` | unit | Mock `Date.now` to be 1 day after `mockEntry.timestamp`. Mock `getMoodEntries` to return `[mockEntry]`. Render. Assert subtitle text equals `'Your story so far.'`. |
| Narrative subtitle: malformed timestamp → `'Your story so far.'` | unit | Mock `getMoodEntries` to return `[{ ...mockEntry, timestamp: NaN }]`. Render. Assert subtitle text equals `'Your story so far.'` (defensive fallback). |
| Time-of-day greeting: morning | unit | Mock `Date.prototype.getHours` (or `Date` constructor) to return 9. Mock auth user `{ name: 'Eric' }`. Render. Assert greeting text equals `'Good Morning, Eric!'`. |
| Time-of-day greeting: afternoon | unit | `getHours` returns 13. Assert `'Good Afternoon, Eric!'`. |
| Time-of-day greeting: evening | unit | `getHours` returns 19. Assert `'Good Evening, Eric!'`. |
| Time-of-day greeting boundary: 11:59 → morning | unit | `getHours` returns 11. Assert `'Good Morning, ...'`. |
| Time-of-day greeting boundary: 12:00 → afternoon | unit | `getHours` returns 12. Assert `'Good Afternoon, ...'`. |
| Time-of-day greeting boundary: 16:59 → afternoon | unit | `getHours` returns 16. Assert `'Good Afternoon, ...'`. |
| Time-of-day greeting boundary: 17:00 → evening | unit | `getHours` returns 17. Assert `'Good Evening, ...'`. |
| Greeting falls back without name when name absent | unit | Mock auth user `null` (cannot happen on this auth-gated route, but defensive). Assert greeting text equals `'Good Morning!'` (no comma). NOTE: this case is theoretically unreachable because the page redirects to `/` when `!isAuthenticated`. Test documents the fallback for type-safety. |
| TimeRangePills selected pill class string migrates | unit | Render with `range='30d'`. Find the 30d button. Assert its className contains `bg-white/15`, `text-white`, `border`, `border-white/30`. Assert it does NOT contain `bg-primary/20` or `text-primary-lt` (deprecated). |
| TimeRangePills inactive pill class string preserved | unit | Find the 90d button (inactive when range='30d'). Assert className contains `bg-white/10` and `text-white/60` (preserved exactly). |
| TimeRangePills arrow-key roving preserved | unit | Render. Focus the 30d pill. Press ArrowRight. Assert focus moves to 90d. Press ArrowLeft. Assert focus moves back to 30d. Press End. Assert focus is on 'All'. Press Home. Assert focus is on 30d. |
| TimeRangePills `role="radiogroup"` + `role="radio"` + `aria-checked` preserved | unit | Assert exactly one element with `role="radiogroup"`. Assert 5 elements with `role="radio"`. Assert the active pill has `aria-checked="true"`; others have `aria-checked="false"`. |
| TimeRangePills `tabIndex` roving preserved | unit | Active pill has `tabIndex={0}`; inactive pills have `tabIndex={-1}`. |
| Hero atmospheric layer preserved | unit | Hero `<section>` has style `ATMOSPHERIC_HERO_BG` (or `backgroundColor: '#0f0a1e'`). Body root has class `bg-dashboard-dark`. |
| Provider wraps the page | integration | `Insights` outer renders `<InsightsDataProvider>` as its first child after auth check. Inner content can call `useInsightsData()` without throwing. |
| Page makes 1 `getMoodEntries()` call on cold load | integration | Mock `getMoodEntries`. Render Insights (full subtree, all 11 sections). Assert `vi.mocked(getMoodEntries).mock.calls.length === 1` (or 2 if the `useMoodChartData` hook is in the rendered subtree — verify against the actual subtree, see Decision 1). |

**Expected state after completion:**

- [ ] `Insights.tsx` h1 renders plain `Mood Insights` text; no `font-script` span.
- [ ] Subtitle is canonical body prose; no italic.
- [ ] Narrative subtitle computes correctly for all 3 variants + malformed timestamp fallback.
- [ ] Time-of-day greeting matches Daily Hub canonical at all boundary hours.
- [ ] TimeRangePills selected pill is muted-white; inactive pill unchanged.
- [ ] `<InsightsDataProvider>` wraps the page below the auth check.
- [ ] All migrated tests pass; existing tests updated where they assert removed/changed elements.

---

### Step 5: Migrate `useMonthlyReportData` — drop silent-mock-fallback, return `hasData` + `isCurrentMonth`, read via `useInsightsData`

**Objective:** Replace the silent-mock-fallback with a clean empty state. Add `hasData` and `isCurrentMonth` to the return shape. Source mood entries from the context instead of calling `getMoodEntries()` directly.

**Files to create/modify:**

- `frontend/src/hooks/useMonthlyReportData.ts` — Multi-area edit (~80 LOC delta):
  - Line 1: Add `useInsightsData` import.
  - Line 3: Remove `import { getMoodEntries } from '@/services/mood-storage'`.
  - Update `MonthlyReportData` interface (line 9): add `hasData: boolean` and `isCurrentMonth: boolean` fields.
  - Remove `MOCK_BADGE_IDS` constant (line 28). No longer used.
  - Inside `useMonthlyReportData`:
    - At the top, call `const { getMonthlyEntries } = useInsightsData()`.
    - Replace `const allEntries = getMoodEntries()` (line 100) and `const moodEntries = allEntries.filter(...)` (line 101) with `const moodEntries = getMonthlyEntries(month, year)`.
    - Add `const isCurrentMonthBool = isCurrentMonth(month, year)` (line ~93 area, before the `daysActive` computation).
    - Set `const hasData = moodEntries.length > 0`.
    - Replace every `if (hasRealData) { ... } else { ... mock }` branch with a clean empty path. The previous `hasRealData` becomes `hasData`. The empty branches return zeros and empty arrays:
      - `daysActive`: `hasData ? new Set(moodEntries.map((e) => e.date)).size : 0` (was 24)
      - `pointsEarned`: leave loop as-is (it iterates real activity log entries; with no mood data the points may still be 0 from real activity); when `pointsEarned === 0`, do NOT fabricate 1847 — keep it 0.
      - `activityCounts`: leave the loop; when no real entries, all counts stay 0 (drop the mock-fallback `if (!hasRealData) { activityCounts.mood = 24; ... }` block at lines 136-143).
      - `startLevel` / `endLevel` / `levelProgressPct`: when `hasData`, run existing logic; when `!hasData`, return `startLevel: ''`, `endLevel: ''`, `levelProgressPct: 0` (was Sprout/Blooming/67).
      - `moodTrendPct`: when `hasData`, run existing logic; when `!hasData`, return 0 (was 12).
      - `longestStreak`: `hasData ? computeLongestStreakInMonth(moodEntries) : 0` (was 7).
      - `badgesEarned`: `hasData ? Object.entries(badgeData.earned).filter(...)...map(...) : []` (was MOCK_BADGE_IDS).
      - `bestDay`: when `hasData`, run existing logic; when `!hasData`, return `null` (was a fabricated "Thriving" mock).
    - Add `hasData: hasData` and `isCurrentMonth: isCurrentMonthBool` to the return object (line 263 area).
  - Remove the now-unused `MOCK_BADGE_IDS` constant.

**Details:**

The hook becomes provider-coupled. `MonthlyReport.tsx` MUST be inside `<InsightsDataProvider>` for the hook to work. Existing test files mocking `getMoodEntries` continue to work because the provider calls `getMoodEntries()` internally; the mock controls what the provider sees.

**Auth gating:** N/A (hook-level).

**Responsive behavior:** N/A: no UI impact (data layer).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT preserve any mock fallback. Every fabricated value (24 days, 1847 points, mock activity counts, Sprout/Blooming, 12% mood trend, 7-day streak, MOCK_BADGE_IDS, mock best day) gets removed.
- Do NOT change the existing `useMemo([month, year])` dependency. The hook's identity is still keyed on month/year.
- Do NOT change the `MoodEntry` type or any other type definition outside `MonthlyReportData`.
- Do NOT change the `isCurrentMonth` helper at line 42 (rename or repurpose) — it's used internally; the EXPOSED `isCurrentMonth` on the return shape is a boolean computed fresh inside the hook body. Keep both names distinct (e.g., name the local var `isCurrentMonthBool`).
- Do NOT call `getMoodEntries()` from inside the hook. The whole point is to route through the provider's memoized data.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns `hasData: false` when no entries for month | unit | Mock `getMoodEntries` to return entries only in March 2026. Call `useMonthlyReportData(0, 2025)` (Jan 2025). Assert return `hasData === false`. |
| Returns `hasData: true` when entries exist for month | unit | Seed entries in March 2026. Call hook with `(2, 2026)`. Assert `hasData === true`. |
| Empty case returns clean zeros (no fabricated values) | unit | Mock no entries. Assert `daysActive === 0`, `pointsEarned === 0`, `longestStreak === 0`, `badgesEarned` is `[]`, `bestDay === null`, `moodTrendPct === 0`, `levelProgressPct === 0`, `activityCounts` is all zeros, `startLevel === ''` and `endLevel === ''`. |
| `isCurrentMonth: true` when month/year matches today | unit | With `Date.now()` mocked to `2026-05-06T12:00:00`, call hook with `(4, 2026)` (May 2026). Assert `isCurrentMonth === true`. |
| `isCurrentMonth: false` when month/year is past | unit | Same mock. Call hook with `(0, 2025)`. Assert `isCurrentMonth === false`. |
| `isCurrentMonth: false` when month/year is future | unit | Same mock. Call hook with `(11, 2026)` (Dec 2026). Assert `isCurrentMonth === false`. |
| Hook reads via context, not direct `getMoodEntries` | integration | After the migration, asserting the test renders the hook inside `<InsightsDataProvider>` and the provider's mock fires once. Calling the hook outside the provider throws (via `useInsightsData`'s guard). |
| All existing aggregation tests for `hasData=true` still pass | unit/regression | Existing tests asserting `daysActive=24`, `longestStreak=7`, `pointsEarned=1847`, `badgesEarned` contains MOCK_BADGE_IDS for empty months MUST be updated to either (a) seed entries first, OR (b) assert empty zeros. The plan accepts test churn here. |

**Expected state after completion:**

- [ ] `useMonthlyReportData` returns `MonthlyReportData & { hasData: boolean; isCurrentMonth: boolean }`.
- [ ] No mock fallback values anywhere in the hook body.
- [ ] `MOCK_BADGE_IDS` const removed.
- [ ] Hook reads via `useInsightsData().getMonthlyEntries(month, year)`.
- [ ] All updated tests pass.
- [ ] `pnpm typecheck` passes.

---

### Step 6: Update `MonthlyReport.tsx` page — wrap in provider, remove `font-script`, migrate `text-white/85`, add empty state, promote MonthlyShareButton

**Objective:** All MonthlyReport.tsx hero migrations + provider wrap + empty-state branch + MonthlyShareButton placement promotion applied in a single edit pass.

**Files to create/modify:**

- `frontend/src/pages/MonthlyReport.tsx` — Multi-area edit (~50 LOC delta):
  - Line 18: Remove `import { getMoodEntries } from '@/services/mood-storage'`. Add `import { InsightsDataProvider, useInsightsData } from '@/contexts/InsightsDataContext'`.
  - Add `import { Calendar } from 'lucide-react'` (the existing imports may include `ChevronLeft`, `ChevronRight`; add `Calendar` for the FeatureEmptyState icon).
  - Add `import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'`.
  - Line 110: Remove `<span className="font-script">Report</span>`. Replace with plain `Report`. The h1's full inner text becomes `Monthly Report`.
  - Line 121: `<span className="text-lg text-white/85 sm:text-xl">{data.monthName} {data.year}</span>` → `<span className="text-lg text-white sm:text-xl">{data.monthName} {data.year}</span>` (drop `/85`).
  - **Refactor structure**: same shell/content split as Insights:

    ```tsx
    export function MonthlyReport() {
      const { isAuthenticated } = useAuth()
      if (!isAuthenticated) return <Navigate to="/" replace />
      return (
        <InsightsDataProvider>
          <MonthlyReportContent />
        </InsightsDataProvider>
      )
    }

    function MonthlyReportContent() {
      // ... existing body, with these changes:
      // - line 53: const data = useMonthlyReportData(selectedMonth, selectedYear)  // unchanged signature; new return shape
      // - lines 56-59: const earliest = useMemo(() => { ... }, []) — replace getMoodEntries() with useInsightsData().moodEntries
    }
    ```

  - Inside `MonthlyReportContent`: replace `useMemo` at lines 56-59:

    ```tsx
    // BEFORE
    const earliest = useMemo(() => {
      const allEntries = getMoodEntries()
      return getEarliestMonth(allEntries)
    }, [])

    // AFTER
    const { moodEntries: allEntries } = useInsightsData()
    const earliest = useMemo(() => getEarliestMonth(allEntries), [allEntries])
    ```

  - **Empty-state branching + MonthlyShareButton promotion**: replace the `<main>` body. The existing structure is one `<main>` containing 7 AnimatedSection wrappers. The new structure inserts the MonthlyShareButton + Preview Email button immediately after the hero (above the AnimatedSection cascade) when `hasData=true`, OR renders the FeatureEmptyState when `hasData=false`.

    ```tsx
    <main
      id="main-content"
      key={`${selectedYear}-${selectedMonth}`}
      className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6 opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
    >
      {!data.hasData ? (
        <FeatureEmptyState
          icon={Calendar}
          heading={
            data.isCurrentMonth
              ? 'This month is just beginning'
              : `No entries yet for ${data.monthName} ${data.year}`
          }
          description={
            data.isCurrentMonth
              ? 'Check back at the end of the month for your report.'
              : 'The report will populate as you add mood entries and journal pages.'
          }
        />
      ) : (
        <>
          {/* PROMOTED: MonthlyShareButton + Preview Email above the fold */}
          <div>
            <MonthlyShareButton
              monthName={data.monthName}
              year={data.year}
              moodEntries={data.moodEntries}
              activityCounts={data.activityCounts}
              longestStreak={data.longestStreak}
            />
            <button
              className="mt-2 mx-auto inline-flex min-h-[44px] items-center text-sm text-white/50 underline hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
              onClick={() => setShowEmailPreview(true)}
            >
              Preview Email
            </button>
          </div>

          {/* Existing 7 AnimatedSection wrappers, indices renumbered if needed */}
          <AnimatedSection index={0}>
            <MonthlyStatCards ... />
          </AnimatedSection>
          <AnimatedSection index={1}>
            <MonthHeatmap ... entries={data.moodEntries} />
          </AnimatedSection>
          <AnimatedSection index={2}>
            <ActivityBarChart activityCounts={data.activityCounts} />
          </AnimatedSection>
          <AnimatedSection index={3}>
            <MonthlyHighlights ... />
          </AnimatedSection>
          <AnimatedSection index={4}>
            <MonthlyInsightCards />
          </AnimatedSection>
          {suggestions.length > 0 && (
            <AnimatedSection index={5}>
              <MonthlySuggestions suggestions={suggestions} />
            </AnimatedSection>
          )}
          {/* OLD index={5 or 6} containing MonthlyShareButton + Preview Email — REMOVED (promoted above) */}
        </>
      )}
    </main>
    ```

  - **The old AnimatedSection at line 185-199** containing MonthlyShareButton + Preview Email button is removed; the share button + Preview Email move to the promoted position above. The AnimatedSection cascade thus loses its last entry (was 7, now 6).
  - The `<EmailPreviewModal>` at line 202-206 is preserved exactly (renders modal regardless of `hasData`; the trigger button is now above-the-fold instead of below).

**Details:**

The MonthlyShareButton/Preview Email block is intentionally NOT wrapped in an `<AnimatedSection>` when promoted. It renders immediately (no animation delay). The existing AnimatedSection cascade with `${index * 100}ms` delay then begins from index=0 below. Visual rhythm: hero → Breadcrumb → Share button (above fold) → 24px gap → MonthlyStatCards (animates in) → ... .

**Auth gating:**

- Logged-out → redirect to `/` (preserved exactly, in outer shell).
- Logged-in → provider mounts; `data` from `useMonthlyReportData`; `hasData` drives the branch.

**Responsive behavior:**

- Desktop (1440px): hero typography scales (`lg:text-5xl` h1); `monthLabel` `sm:text-xl`. Empty state centers in `max-w-5xl` main. MonthlyShareButton above fold (existing internal layout preserved).
- Tablet (768px): hero scales (`sm:text-4xl`); `monthLabel` `sm:text-xl`. Empty state full-width within `max-w-5xl`.
- Mobile (375px): hero base sizes; `monthLabel` `text-lg`. Empty state stacks (icon + heading + description) full-width within `max-w-sm` per FeatureEmptyState's internal class.

**Inline position expectations:**

- Month pager row (← prev / month label / → next): matching center-y alignment via `flex items-center gap-3`. The 2 buttons are `min-h-[44px] min-w-[44px]`; the span is plain text. No wrap allowed at any breakpoint. Top-y values within ±5px (the buttons are equal-height; the span centers in the row).

**Guardrails (DO NOT):**

- Do NOT remove the Breadcrumb (line 134-140). It's the "back to Insights" affordance.
- Do NOT introduce a `<Link to="/insights">← Insights</Link>` back link in the hero. Existing pattern uses Breadcrumb only on this page.
- Do NOT change `<EmailPreviewModal>` props or rendering logic.
- Do NOT add new auth gates to MonthlyShareButton.
- Do NOT remove `aria-label="Previous month"` / `aria-label="Next month"` on month-pager buttons.
- Do NOT remove the `key={`${selectedYear}-${selectedMonth}`}` on `<main>` — it triggers the fade-in remount on month change, and that behavior is preserved.
- Do NOT keep the `bg-primary/20` or `text-primary-lt` chrome anywhere on this page (none present today; just verify post-edit).
- Do NOT introduce a `ctaLabel`/`ctaHref` on the `<FeatureEmptyState>` for the empty case. The empty state is informational only; adding a CTA ("Add a mood entry now") could feel pressuring.
- Do NOT preserve the `text-white/85` opacity anywhere on this page (drop it for `text-white` on monthLabel; verify nothing else uses it).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| h1 has no `font-script` span | unit | Render. Assert `screen.getByRole('heading', { level: 1 })` text equals `'Monthly Report'`. Assert no `font-script` element inside h1. |
| `monthLabel` migrated to `text-white` | unit | Find the `<span>` containing `${data.monthName} ${data.year}`. Assert className contains `text-white`, NOT `text-white/85`. |
| Empty state renders for current month with no entries | integration | Mock `getMoodEntries` to return `[]`. Mock `Date.now` to be in the current month. Render. Assert `<FeatureEmptyState>` with heading `'This month is just beginning'`, description `'Check back at the end of the month for your report.'`, icon `Calendar`. |
| Empty state renders for past month with no entries | integration | Mock `getMoodEntries` to return entries only in March 2026. Render with `month=0, year=2025` (Jan 2025). Assert `<FeatureEmptyState>` with heading `'No entries yet for January 2025'`, description `'The report will populate as you add mood entries and journal pages.'`. |
| Sections render when `hasData=true` | integration | Seed entries for the current month. Render. Assert `MonthlyStatCards`, `MonthHeatmap`, `ActivityBarChart`, `MonthlyHighlights`, `MonthlyInsightCards` are rendered. Assert `<FeatureEmptyState>` is NOT rendered. |
| MonthlyShareButton placement promoted | integration | Render with entries (`hasData=true`). Find the MonthlyShareButton. Assert it precedes the MonthlyStatCards in DOM order (use `Array.prototype.indexOf` on the rendered children, or `compareDocumentPosition`). |
| MonthlyShareButton hidden when `hasData=false` | integration | Render with no entries. Assert `screen.queryByRole('button', { name: /share/i })` (or whatever the canonical accessible name is) is `null`. |
| Preview Email button promoted with MonthlyShareButton | integration | Render with `hasData=true`. Find the Preview Email button. Assert it precedes the MonthlyStatCards in DOM order. |
| EmailPreviewModal still mounts and opens | integration | Render with `hasData=true`. Click Preview Email. Assert the modal opens (existing behavior). |
| Hero atmospheric layer preserved | unit | Hero `<section>` has `ATMOSPHERIC_HERO_BG`; body root has `bg-dashboard-dark`. |
| Provider wraps the page | integration | `MonthlyReport` outer renders `<InsightsDataProvider>`. Inner content can call `useInsightsData()` without throwing. |
| Page makes 1 `getMoodEntries()` call on cold load | integration | Mock `getMoodEntries`. Render MonthlyReport. Assert `vi.mocked(getMoodEntries).mock.calls.length === 1`. |
| Existing month pager interaction preserved | integration | Click "Previous month" button. Assert `useMonthlyReportData` is called with the previous month/year. |
| Existing fade-in remount on month change preserved | integration | Render. Note `<main>` initial `key`. Click "Previous month". Assert `<main>` `key` changed (forces remount). |

**Expected state after completion:**

- [ ] `MonthlyReport.tsx` h1 renders plain `Monthly Report`; no `font-script` span.
- [ ] `monthLabel` is `text-white` (no `/85`).
- [ ] `<FeatureEmptyState>` renders for empty months with anti-pressure copy variants.
- [ ] MonthlyShareButton + Preview Email button are above the fold.
- [ ] MonthlyShareButton + Preview Email are hidden when `hasData=false`.
- [ ] `<InsightsDataProvider>` wraps the page below the auth check.
- [ ] All migrated tests pass.

---

### Step 7: Update component test files for Provider wrapper pattern

**Objective:** Wrap each component test that previously rendered the component bare in `<InsightsDataProvider>`. For tests that don't currently mock `getMoodEntries`, add the mock + provider wrap so the component receives data via context.

**Files to create/modify:**

- `frontend/src/components/insights/__tests__/InsightCards.test.tsx`
- `frontend/src/components/insights/__tests__/GratitudeCorrelationCard.test.tsx`
- `frontend/src/components/insights/__tests__/CommunityConnections.test.tsx`
- `frontend/src/components/insights/__tests__/CalendarHeatmap.test.tsx`
- `frontend/src/components/insights/__tests__/PrayerLifeSection.test.tsx`
- For the 13 components NOT migrated to use the context, their test files do NOT need `<InsightsDataProvider>` wrappers (the components don't call `useInsightsData()`). Test files unchanged: `ActivityBarChart`, `ActivityCorrelations`, `EmailPreviewModal`, `GratitudeStreak`, `MeditationHistory`, `MonthHeatmap`, `MonthlyHighlights`, `MonthlyInsightCards`, `MonthlyShareButton`, `MonthlyStatCards`, `MonthlySuggestions`, `MoodTrendChart`, `ScriptureConnections`. Verify `pnpm test` passes for these without modification.

**Details:**

For each of the 5 migrated test files, the change pattern:

```tsx
// BEFORE
import { render, screen } from '@testing-library/react'
import { ComponentName } from '../ComponentName'

// (existing vi.mock at file top, may or may not be present)
vi.mock('@/services/mood-storage', () => ({
  getMoodEntries: () => mockEntries,
}))

it('renders correctly', () => {
  render(<ComponentName someProp={value} />)
  // ... assertions
})

// AFTER
import { render, screen } from '@testing-library/react'
import { ComponentName } from '../ComponentName'
import { InsightsDataProvider } from '@/contexts/InsightsDataContext'

vi.mock('@/services/mood-storage', () => ({
  getMoodEntries: vi.fn(() => mockEntries),
}))

it('renders correctly', () => {
  render(
    <InsightsDataProvider>
      <ComponentName someProp={value} />
    </InsightsDataProvider>
  )
  // ... assertions
})
```

OR use a small inline helper:

```tsx
function renderWithProvider(ui: React.ReactElement) {
  return render(<InsightsDataProvider>{ui}</InsightsDataProvider>)
}

it('renders correctly', () => {
  renderWithProvider(<ComponentName someProp={value} />)
  // ...
})
```

For tests that previously seeded `localStorage` directly in `beforeEach` (instead of `vi.mock`), the seeding still works because `getMoodEntries()` reads from `localStorage`. No `vi.mock` change needed; only the render wrap.

For `CommunityConnections.test.tsx` (which already has the explicit `vi.mock`): preserve the mock setup; just wrap the render in `<InsightsDataProvider>`.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT mock `useInsightsData` directly. Mock `getMoodEntries` (the underlying source) and let the real provider run.
- Do NOT mock `InsightsDataContext` or `InsightsDataProvider`.
- Do NOT remove existing `vi.mock` calls. Only add the provider wrapper.
- Do NOT migrate the 13 unaffected component tests.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| InsightCards renders inside provider with mock data | integration | Mock `getMoodEntries` to return 4 entries. Render `<InsightsDataProvider><InsightCards hasData={true} /></InsightsDataProvider>`. Assert 4 cards render. |
| InsightCards throws without provider | integration | Render `<InsightCards hasData={true} />` without provider. Assert render throws via `useInsightsData` guard. |
| GratitudeCorrelationCard renders inside provider | integration | Same pattern. |
| CommunityConnections renders inside provider, with explicit mood storage mock | integration | Same pattern; use the existing `vi.mock` block. |
| CalendarHeatmap renders inside provider | integration | Same pattern. |
| PrayerLifeSection renders inside provider | integration | Same pattern. |

**Expected state after completion:**

- [ ] All 5 migrated component test files wrap renders in `<InsightsDataProvider>`.
- [ ] Each migrated component has at least one "throws without provider" test.
- [ ] All 13 non-migrated component test files unchanged AND still pass.
- [ ] `pnpm test` total green (or at the regression baseline).

---

### Step 8: Update `pages/__tests__/Insights.test.tsx` — narrative subtitle, greeting, TimeRangePills active-state

**Objective:** Update existing assertions on the Insights page test file to reflect the migrations. Add new tests for narrative subtitle and time-of-day greeting.

**Files to create/modify:**

- `frontend/src/pages/__tests__/Insights.test.tsx`:
  - Drop assertions that find `font-script` element in the h1.
  - Update subtitle assertions: previously asserted text `'Reflect on your journey'` and class `font-serif italic`. Now assert text matches one of the 3 narrative variants based on mocked entries, AND class is `text-white/60 text-base sm:text-lg` (no italic, no serif).
  - Add new tests (covered in Step 4's test specifications): narrative subtitle for empty entries, returning-after-gap, standard, malformed timestamp; time-of-day greeting for morning/afternoon/evening + boundary hours.
  - Update TimeRangePills selected-pill class assertion: from `bg-primary/20`+`text-primary-lt` to `bg-white/15`+`text-white`+`border-white/30`.
  - Wrap all renders in `<InsightsDataProvider>` (the page itself wraps automatically via the outer shell, so this may be redundant — but tests that bypass the outer shell to isolate `InsightsContent` need explicit provider wrapping).

**Details:**

The full test list for `Insights.test.tsx` post-migration includes the existing render/auth/sticky-pill tests + the new narrative + greeting tests + the TimeRangePills active-state migration tests. See Step 4 for the canonical test list.

**Auth gating:** N/A (the page's own auth-redirect tests are preserved).

**Responsive behavior:** N/A: tests are jsdom (no rendered viewport).

**Inline position expectations:** Test assertions use class strings, not coordinate measurements. The `/verify-with-playwright` step (downstream) handles the position-coordinate verification.

**Guardrails (DO NOT):**

- Do NOT delete the auth-redirect test (logged-out → redirects to `/`).
- Do NOT delete the sticky-pill IntersectionObserver test.
- Do NOT delete tests for the existing 11 AnimatedSection wrappers.
- Do NOT introduce real chart rendering assertions in jsdom (use `vi.mock` for Recharts where needed; existing tests already do this).

**Test specifications:** (see Step 4 for the full list)

**Expected state after completion:**

- [ ] All updated tests pass.
- [ ] New narrative + greeting tests added and pass.
- [ ] TimeRangePills selected-pill class assertion updated.

---

### Step 9: Update `pages/__tests__/MonthlyReport.test.tsx` — empty state, MonthlyShareButton placement, h1 + monthLabel migrations

**Objective:** Update existing assertions on the MonthlyReport page test file to reflect the migrations. Add new tests for empty-state branching and MonthlyShareButton placement promotion.

**Files to create/modify:**

- `frontend/src/pages/__tests__/MonthlyReport.test.tsx`:
  - Drop assertions that find `font-script` element in the h1.
  - Update `monthLabel` className assertion: from `text-white/85` to `text-white`.
  - Update tests that asserted MOCK_BADGE_IDS render for empty months — those tests must now (a) seed mood entries, OR (b) assert `<FeatureEmptyState>` renders.
  - Add new tests: current month empty (assert FeatureEmptyState heading and description); past month empty (assert FeatureEmptyState heading with month-specific copy); month with entries (assert sections render, FeatureEmptyState absent); MonthlyShareButton placement (above MonthlyStatCards in DOM order); MonthlyShareButton hidden when `hasData=false`; Preview Email button promoted with MonthlyShareButton.

**Details:**

The full test list for `MonthlyReport.test.tsx` post-migration is in Step 6's test specifications.

**Auth gating:** N/A (existing auth-redirect test preserved).

**Responsive behavior:** N/A.

**Inline position expectations:** Tests assert DOM order, not coordinates.

**Guardrails (DO NOT):**

- Do NOT delete the auth-redirect test.
- Do NOT delete the month-pager interaction tests.
- Do NOT delete the `key`-based remount-on-month-change test.

**Test specifications:** (see Step 6)

**Expected state after completion:**

- [ ] All updated tests pass.
- [ ] New empty-state + MonthlyShareButton placement tests added and pass.

---

### Step 10: Update `hooks/__tests__/useMonthlyReportData.test.ts`

**Objective:** Add tests for `hasData`, `isCurrentMonth`, and the empty-zero-state behavior. Update existing tests that asserted mock fallback values.

**Files to create/modify:**

- `frontend/src/hooks/__tests__/useMonthlyReportData.test.ts`:
  - Add tests from Step 5's test specifications.
  - Update existing tests that asserted `daysActive=24`, `pointsEarned=1847`, `longestStreak=7`, `bestDay` mock object, `badgesEarned` MOCK_BADGE_IDS for empty months — those tests must now seed entries first or assert empty zeros.
  - Update render to use `<InsightsDataProvider>` wrapper. The hook is called via `renderHook(useMonthlyReportData, { wrapper: InsightsDataProvider, initialProps: [month, year] })`.

**Details:**

```tsx
import { renderHook } from '@testing-library/react'
import { InsightsDataProvider } from '@/contexts/InsightsDataContext'
import { useMonthlyReportData } from '../useMonthlyReportData'
import { getMoodEntries } from '@/services/mood-storage'

vi.mock('@/services/mood-storage', () => ({ getMoodEntries: vi.fn() }))

it('returns hasData=false for empty month', () => {
  vi.mocked(getMoodEntries).mockReturnValue([])
  const { result } = renderHook(() => useMonthlyReportData(0, 2025), {
    wrapper: InsightsDataProvider,
  })
  expect(result.current.hasData).toBe(false)
  expect(result.current.daysActive).toBe(0)
  expect(result.current.pointsEarned).toBe(0)
  expect(result.current.longestStreak).toBe(0)
  expect(result.current.badgesEarned).toEqual([])
  expect(result.current.bestDay).toBeNull()
})
```

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT call the hook outside the provider (it will throw).
- Do NOT preserve any "expects mock fallback" test. Every fabricated value test gets removed.
- Do NOT mock `useInsightsData` — mock `getMoodEntries` and let the real provider run.

**Test specifications:** (see Step 5)

**Expected state after completion:**

- [ ] All updated tests pass.
- [ ] New `hasData` + `isCurrentMonth` + clean-empty-state tests added and pass.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `InsightsDataContext.tsx` (provider + hook + type) |
| 2 | 1 | Create context test file with 6 smoke tests |
| 3 | 1 | Migrate 5 grep-flagged component call sites to use the context |
| 4 | 1, 3 | Update `Insights.tsx` (provider wrap, hero migrations, TimeRangePills active-state) |
| 5 | 1 | Migrate `useMonthlyReportData` (drop silent-mock-fallback, add `hasData`/`isCurrentMonth`, route through context) |
| 6 | 1, 5 | Update `MonthlyReport.tsx` (provider wrap, hero migrations, empty-state branch, MonthlyShareButton placement) |
| 7 | 1, 3 | Update component test files for the 5 migrated components (Provider wrapper) |
| 8 | 1, 4 | Update Insights page test file (narrative, greeting, TimeRangePills, provider wrap) |
| 9 | 1, 5, 6 | Update MonthlyReport page test file (empty state, MonthlyShareButton, h1, monthLabel) |
| 10 | 1, 5 | Update `useMonthlyReportData` test file (`hasData`, `isCurrentMonth`, clean empties, provider wrap) |

**Recommended execution order**: Step 1 → Step 2 → (Step 3 + Step 5 in parallel) → (Step 4 + Step 6 in parallel) → (Step 7 + Step 8 + Step 9 + Step 10 in parallel). All dependencies are upstream; no cycles.

**Single commit guidance**: this spec is broad-but-mechanical. Recommend splitting into 2-3 commits: (1) context + tests + provider wrap (steps 1-2-4-6), (2) component migrations + tests (steps 3 + 7), (3) hook migration + tests (steps 5 + 10) + page test updates (steps 8, 9). User decides commit boundaries — execute-plan does not commit.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create `InsightsDataContext` module (Provider, hook, type) | [COMPLETE] | 2026-05-06 | Created `frontend/src/contexts/InsightsDataContext.tsx` |
| 2 | Add provider tests file | [COMPLETE] | 2026-05-06 | Created `frontend/src/contexts/__tests__/InsightsDataContext.test.tsx`; fixed `vi.clearAllMocks()` in beforeEach to reset call counts; all 6 tests pass |
| 3 | Migrate the 5 grep-flagged production component call sites | [COMPLETE] | 2026-05-06 | Migrated `CommunityConnections`, `GratitudeCorrelationCard`, `PrayerLifeSection`, `ScriptureConnections`, `InsightCards` to use `useInsightsData()` |
| 4 | Update `Insights.tsx` page — wrap in provider, remove `font-script`, migrate subtitle, add greeting, migrate TimeRangePills active-state | [COMPLETE] | 2026-05-06 | Wrapped with `InsightsDataProvider`, removed `font-script`, narrative subtitle `'Your story is just beginning.'`, time-of-day greeting, radiogroup TimeRangePills |
| 5 | Migrate `useMonthlyReportData` — drop silent-mock-fallback, return `hasData` + `isCurrentMonth`, read via `useInsightsData` | [COMPLETE] | 2026-05-06 | Hook reads via `useInsightsData()`, returns `hasData` and `isCurrentMonth`, no mock fallback |
| 6 | Update `MonthlyReport.tsx` page — wrap in provider, remove `font-script`, migrate `text-white/85`, add empty state, promote MonthlyShareButton | [COMPLETE] | 2026-05-06 | Wrapped with `InsightsDataProvider`, breadcrumb nav, `FeatureEmptyState` when `!hasData`, `MonthlyShareButton` promoted above fold |
| 7 | Update component test files for Provider wrapper pattern | [COMPLETE] | 2026-05-06 | Added `InsightsDataProvider` wrapper to `InsightCards`, `CalendarHeatmap`, `GratitudeCorrelationCard`, `PrayerLifeSection`, `CommunityConnections` test files |
| 8 | Update `pages/__tests__/Insights.test.tsx` — narrative subtitle, greeting, TimeRangePills active-state | [COMPLETE] | 2026-05-06 | Fixed subtitle assertion: `'Your story is just beginning.'` (with period); 10 animated sections verified |
| 9 | Update `pages/__tests__/MonthlyReport.test.tsx` — empty state, MonthlyShareButton placement, h1 + monthLabel migrations | [COMPLETE] | 2026-05-06 | Added `seedDefaultMonthData()` helper using `getDefaultMonth()`; all 20 tests pass |
| 10 | Update `hooks/__tests__/useMonthlyReportData.test.ts` | [COMPLETE] | 2026-05-06 | Added `wrapper: InsightsDataProvider` to all `renderHook` calls; zero-value assertions for empty state; all 8 tests pass |
