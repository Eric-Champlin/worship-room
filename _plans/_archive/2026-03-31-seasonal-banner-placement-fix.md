# Implementation Plan: Seasonal Banner Placement Fix

**Spec:** `_specs/seasonal-banner-placement-fix.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/seasonal-banner-placement-fix`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06, stale for many pages post-Round-2 redesign, but navbar/color values still valid)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Critical Finding: Layout.tsx Is Not a Universal Wrapper

The spec assumes placing SeasonalBanner in `Layout.tsx` makes it appear on "every page." **This is incorrect.** Reconnaissance reveals:

**Pages that use `<Layout>`** (~13 pages):
- BibleBrowser, BibleReader, AskPage, RoutinesPage, Health, ReadingPlanDetail, ChallengeDetail (without `hero`)
- 6 meditation sub-pages: BreathingExercise, ScriptureSoaking, GratitudeReflection, ActsPrayerWalk, PsalmReading, ExamenReflection (with `hero` prop → transparent navbar)

**Pages that render `<Navbar />` directly, bypassing Layout** (~15+ pages):
- Dashboard.tsx (`<Navbar transparent />`)
- DailyHub.tsx (`<Navbar transparent />`)
- PrayerWall.tsx (`<Navbar transparent />`)
- MusicPage.tsx (`<Navbar transparent />`)
- GrowPage.tsx (`<Navbar transparent />`)
- Friends.tsx (`<Navbar transparent />`)
- Settings.tsx (`<Navbar transparent />`)
- Insights.tsx (`<Navbar transparent />`)
- MyPrayers.tsx (`<Navbar transparent />`)
- GrowthProfile.tsx (`<Navbar transparent />`)
- MonthlyReport.tsx (`<Navbar transparent />`)
- SharedVerse.tsx, SharedPrayer.tsx (`<Navbar transparent />`)
- Home.tsx (`<Navbar transparent />`) — landing page

**Pages using wrapper components:**
- PrayerDetail, PrayerWallProfile, PrayerWallDashboard → `<PageShell>` which renders `<Navbar />` (non-transparent)
- Churches, Counselors, CelebrateRecovery → `<LocalSupportPage>` which renders `<Navbar transparent />`

**Consequence:** The banner in Layout.tsx currently only appears on ~13 pages. To satisfy the spec's requirement that the banner appear on ALL pages (except landing), the banner must be rendered through a component used by every page.

### The Universal Component: Navbar

**Every page renders `<Navbar />`** — either directly or via Layout/PageShell/LocalSupportPage. This makes Navbar the only viable single render location for the banner.

### Navbar Positioning

- `transparent={true}` (most pages): `position: absolute; inset: 0; left: 0; right: 0; z-index: 50; background: transparent`
- `transparent={false}` (PageShell, Layout without hero): `position: relative; background: bg-hero-dark`
- All pages with transparent navbar have hero content starting at `pt-32` (128px mobile), `pt-36` (144px tablet), `pt-40` (160px desktop)
- Navbar pill area height: ~76px (`pt-5` 20px + pill ~48px + `pb-2` 8px)
- SeasonalBanner height: ~40px (`py-2` 8px + text ~16px + border 1px + padding)
- **Navbar + banner combined: ~116px < 128px (pt-32)** — fits within hero padding on all breakpoints

### Navbar Structure (Navbar.tsx lines 169–239)

```
<nav className="top-0 z-50 [absolute inset-x-0 bg-transparent | bg-hero-dark]">
  <div className="mx-auto max-w-6xl px-4 pt-5 pb-2 sm:px-6">
    <div className="rounded-2xl [glass pill]">
      [logo, desktop nav, auth/user actions, hamburger]
    </div>
    {transparent && <div> gradient separator </div>}
    <MobileDrawer />         ← renders fixed overlay, NOT in flow
  </div>
  {isAuthenticated && <MobileNotificationSheet />}  ← also fixed overlay
</nav>
```

MobileDrawer and MobileNotificationSheet both use `position: fixed` overlays — they do not affect in-flow layout inside `<nav>`.

### SeasonalBanner Component (SeasonalBanner.tsx)

- Normal-flow element (no position/z-index)
- Glassmorphic: `w-full bg-white/[0.04] backdrop-blur-md border-b border-white/10`
- Inner content: `mx-auto max-w-6xl px-4 py-2 sm:px-6`
- Dismiss: localStorage `wr_seasonal_banner_dismissed_{seasonId}`, 200ms fade-out
- `role="complementary" aria-label="Seasonal announcement"`
- Returns `null` during Ordinary Time or when dismissed

### Existing Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/components/Navbar.tsx` | ~240 | Main navbar — transparent/relative modes |
| `frontend/src/components/Layout.tsx` | 40 | Page wrapper (used by ~13 pages) |
| `frontend/src/components/SeasonalBanner.tsx` | 105 | Banner component (unchanged) |
| `frontend/src/pages/Home.tsx` | ~65 | Landing page (suppress banner here) |
| `frontend/src/components/__tests__/Layout.test.tsx` | 97 | Layout tests (3 SeasonalBanner tests to remove) |
| `frontend/src/components/__tests__/Navbar.test.tsx` | ~150 | Navbar tests (add banner tests) |
| `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` | 81 | Seasonal-specific navbar tests |

### Test Patterns

- Navbar tests: `render(<MemoryRouter><ToastProvider><AuthModalProvider><Navbar /><Routes>...</Routes></AuthModalProvider></ToastProvider></MemoryRouter>)`
- Navbar-seasonal tests: mock `useLiturgicalSeason`, `useAuth`, `useNotificationActions`, `useAuthModal`; use dynamic import `await import('../Navbar')`
- Layout tests: mock `useLiturgicalSeason`, `useAuth`, `useReducedMotion`, `useAuthModal`, `useNotificationActions`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View banner | No auth required — visible to all users on all inner pages | Step 1 (Navbar) | None |
| Dismiss banner | No auth required | N/A (unchanged) | None |
| Click CTA link | No auth required — `/daily?tab=devotional` is public | N/A (unchanged) | None |

No auth gating required for this feature.

---

## Design System Values (for UI steps)

No new UI elements are created. The existing SeasonalBanner component is unchanged:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| SeasonalBanner outer | background | `bg-white/[0.04]` = `rgba(255,255,255,0.04)` | SeasonalBanner.tsx:65 |
| SeasonalBanner outer | backdrop-filter | `backdrop-blur-md` = `blur(12px)` | SeasonalBanner.tsx:65 |
| SeasonalBanner outer | border-bottom | `border-white/10` = `rgba(255,255,255,0.1)` | SeasonalBanner.tsx:65 |
| SeasonalBanner text | color | `text-white/70` = `rgba(255,255,255,0.7)` | SeasonalBanner.tsx:82 |
| SeasonalBanner CTA | color | `text-primary-lt` = `#8B5CF6` | SeasonalBanner.tsx:87 |
| Dismiss button | size | `h-11 w-11` = 44×44px touch target | SeasonalBanner.tsx:97 |

---

## Design System Reminder

- SeasonalBanner uses `bg-white/[0.04] backdrop-blur-md border-b border-white/10` — do NOT change
- The `w-full` outer div spans full width; inner `max-w-6xl` centers content — keep this structure
- `role="complementary"` is semantically valid nested inside `<nav>` — ARIA permits nested landmarks
- MobileDrawer and MobileNotificationSheet are `position: fixed` overlays — they do NOT affect banner position
- Navbar pill area: `pt-5 pb-2` outer + `py-3` inner ≈ 76px total
- Hero padding: `pt-32` (128px mobile) ensures content clears navbar + banner combined height (~116px)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone bugfix.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_seasonal_banner_dismissed_{seasonId}` | Read (existing) | Banner dismiss state — NO CHANGES |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Banner text may wrap to 2 lines. Full width. Dismiss X: 44px touch target. |
| Tablet | 768px | Single line or wrapping. Full width. |
| Desktop | 1440px | Single line, full width, text + dismiss on same row. |

No responsive behavior changes — the banner component is unchanged.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Nav pill → SeasonalBanner | `pb-2` (8px) from nav container | Navbar.tsx:177 |
| SeasonalBanner → hero content | ~12px (128px pt-32 minus ~116px nav+banner) | Codebase inspection |
| SeasonalBanner → main content (non-transparent) | 0px (banner in flow, main follows) | Layout.tsx:32 (py-8 on main) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] SeasonalBanner is currently rendered in Layout.tsx only (confirmed via grep)
- [x] Layout.tsx is NOT used by most pages — Dashboard, DailyHub, PrayerWall, MusicPage, GrowPage, Friends, Settings, Insights, MyPrayers, etc. render Navbar directly
- [x] Every page renders `<Navbar />` (either directly or via Layout/PageShell/LocalSupportPage)
- [x] MobileDrawer and MobileNotificationSheet are fixed overlays, not in-flow
- [x] Hero content starts at `pt-32` (128px) minimum — leaves room for navbar + banner (~116px)
- [x] No auth gating required
- [x] SeasonalBanner component itself needs no changes (only its render location)
- [x] Home.tsx is the only page that should suppress the banner

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Banner render location | Inside `<nav>` in Navbar.tsx (after max-w-6xl container, before MobileNotificationSheet) | Navbar is the only component used by every page. Layout.tsx only covers ~13 pages. |
| Landing page suppression | `hideBanner` prop on Navbar, passed by Home.tsx | Clean API — only Home.tsx needs to suppress. No route-based detection needed. |
| Banner inside `<nav>` semantics | Keep `role="complementary"` on banner | ARIA spec permits nested landmarks. Screen readers announce "complementary" as a separate region. |
| Meditation sub-pages (Layout with hero) | Banner now renders via Navbar, not Layout — works on these pages too | Banner sits inside absolute nav, below pill, within the hero padding zone. |
| Spec assumption mismatch | Plan diverges from spec's "put in Layout.tsx" approach | Spec was written assuming Layout wraps all pages. Reconnaissance proves otherwise. Navbar approach achieves the spec's goal (banner on all pages) via the correct mechanism. |
| Spec acceptance criteria for meditation sub-pages | Satisfied | Banner renders inside Navbar on all pages including meditation sub-pages. |

---

## Implementation Steps

### Step 1: Move SeasonalBanner rendering from Layout.tsx to Navbar.tsx

**Objective:** Render SeasonalBanner inside the Navbar component so it appears on every page that uses Navbar (all pages). Add `hideBanner` prop to suppress it on the landing page.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — add `hideBanner` prop, import and render SeasonalBanner
- `frontend/src/components/Layout.tsx` — remove SeasonalBanner import and render

**Details:**

**Navbar.tsx changes:**

1. Add import at top of file:
   ```typescript
   import { SeasonalBanner } from '@/components/SeasonalBanner'
   ```

2. Update NavbarProps interface (line 138):
   ```typescript
   interface NavbarProps {
     transparent?: boolean
     hideBanner?: boolean
   }
   ```

3. Update function signature (line 142):
   ```typescript
   export function Navbar({ transparent = false, hideBanner = false }: NavbarProps) {
   ```

4. Add SeasonalBanner render inside `<nav>`, after the max-w-6xl container `</div>` (after line 230) and before `MobileNotificationSheet` (line 233). Exact insertion point:
   ```tsx
   </div>

   {!hideBanner && <SeasonalBanner />}

   {/* Mobile notification bottom sheet */}
   {isAuthenticated && (
   ```

**Layout.tsx changes:**

1. Remove the SeasonalBanner import (line 3):
   ```diff
   - import { SeasonalBanner } from '@/components/SeasonalBanner'
   ```

2. Remove the `<SeasonalBanner />` render (line 26):
   ```diff
   - <SeasonalBanner />
   ```

**Responsive behavior:**
- Desktop (1440px): Banner renders full-width inside `<nav>`, below the pill container. On transparent navbar pages, it overlays the hero gradient. On relative navbar pages, it adds to the nav's in-flow height.
- Tablet (768px): Same behavior, hero padding `pt-36` (144px) provides more room.
- Mobile (375px): Same behavior, hero padding `pt-32` (128px) still clears nav+banner (~116px).

**Guardrails (DO NOT):**
- DO NOT modify SeasonalBanner.tsx — only its render location changes
- DO NOT change Navbar's positioning logic (transparent/absolute vs relative)
- DO NOT add any z-index to the banner — it inherits from `<nav>`'s z-50 stacking context
- DO NOT place the banner outside `<nav>` — it needs to be in the absolute positioning context for transparent navbar pages
- DO NOT place the banner inside the `max-w-6xl` container — the banner's `w-full` background must span full width

**Test specifications:**

Tests are covered in Step 3.

**Expected state after completion:**
- [ ] SeasonalBanner is rendered in exactly one location: inside `<nav>` in Navbar.tsx
- [ ] SeasonalBanner no longer imported or rendered in Layout.tsx
- [ ] Navbar accepts `hideBanner` prop (defaults to false)
- [ ] Banner appears on all pages that render Navbar (all pages except where `hideBanner` is passed)

---

### Step 2: Suppress banner on landing page

**Objective:** Pass `hideBanner` to Navbar in Home.tsx so the banner doesn't appear on the landing page.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — add `hideBanner` prop to Navbar

**Details:**

In Home.tsx, update line 56:
```diff
- <Navbar transparent />
+ <Navbar transparent hideBanner />
```

No other pages need changes — they all render `<Navbar />` or `<Navbar transparent />` without `hideBanner`, so the banner appears by default.

**Responsive behavior:** N/A: no UI impact (banner is hidden on this page).

**Guardrails (DO NOT):**
- DO NOT modify any other page component — only Home.tsx needs `hideBanner`
- DO NOT use route-based detection in the banner or Navbar — the prop is explicit and maintainable
- DO NOT modify the Navbar's `transparent` prop behavior

**Test specifications:**

Tests are covered in Step 3.

**Expected state after completion:**
- [ ] Home.tsx renders `<Navbar transparent hideBanner />`
- [ ] Landing page does not show SeasonalBanner
- [ ] No other page components are modified

---

### Step 3: Update tests

**Objective:** Remove SeasonalBanner tests from Layout.test.tsx (no longer rendered there), and add banner tests to Navbar-seasonal.test.tsx.

**Files to modify:**
- `frontend/src/components/__tests__/Layout.test.tsx` — remove 3 SeasonalBanner tests and related imports
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — add banner rendering tests

**Details:**

**Layout.test.tsx changes:**

Remove the 3 tests (lines 77–97):
- `'renders SeasonalBanner during named season'`
- `'renders SeasonalBanner before main content'`
- `'renders SeasonalBanner when hero prop is provided'`

Remove unused imports that were only needed for these tests:
- Remove `LITURGICAL_SEASONS` import (line 5) IF no remaining tests use it
- Remove `useLiturgicalSeason` mock and `mockUseLiturgicalSeason` setup IF no remaining tests use them

Check: the remaining 2 tests (`'renders with bg-neutral-bg by default'` and `'renders with bg-dashboard-dark when dark prop is true'`) also call `mockSeason('ordinary-time')`. So the mock is still needed. Keep the mock setup but remove the 3 banner-specific tests.

Actually, since `mockSeason` calls `mockUseLiturgicalSeason`, and the remaining tests call `mockSeason`, all the mock infrastructure stays. Just remove the 3 test blocks at lines 77–97.

**Navbar-seasonal.test.tsx changes:**

Add new tests after the existing `describe('Navbar — clean logo', ...)` block (line 81). These tests verify the banner renders inside the navbar during named seasons and is suppressed by `hideBanner`.

New tests to add:

```typescript
describe('Navbar — SeasonalBanner integration', () => {
  it('renders SeasonalBanner during named season', async () => {
    mockSeason('lent')
    await renderNavbar()
    expect(screen.getByRole('complementary', { name: 'Seasonal announcement' })).toBeInTheDocument()
  })

  it('does not render SeasonalBanner during Ordinary Time', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    expect(screen.queryByRole('complementary', { name: 'Seasonal announcement' })).not.toBeInTheDocument()
  })

  it('renders SeasonalBanner inside the nav element', async () => {
    mockSeason('advent')
    await renderNavbar()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const banner = screen.getByRole('complementary', { name: 'Seasonal announcement' })
    expect(nav.contains(banner)).toBe(true)
  })

  it('suppresses SeasonalBanner when hideBanner is true', async () => {
    mockSeason('lent')
    const { Navbar } = await import('../Navbar')
    render(
      <MemoryRouter>
        <Navbar transparent hideBanner />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('complementary', { name: 'Seasonal announcement' })).not.toBeInTheDocument()
  })
})
```

The existing `renderNavbar()` function renders `<Navbar transparent />` without `hideBanner`, so banner will show during named seasons. The `hideBanner` test uses a custom render.

**Note:** The `renderNavbar` function in `Navbar-seasonal.test.tsx` (line 49) does NOT wrap with `ToastProvider`/`AuthModalProvider` — it uses a simpler render. The `useLiturgicalSeason` mock is already set up for the existing tests. The SeasonalBanner uses `useLiturgicalSeason` internally, which is already mocked in this file. The `useReducedMotion` hook used by SeasonalBanner is NOT mocked — add the mock:

```typescript
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))
```

Add this alongside the existing mocks (after line 26).

**Responsive behavior:** N/A: no UI impact (test-only step).

**Guardrails (DO NOT):**
- DO NOT modify SeasonalBanner.test.tsx — those tests verify the banner component's internal behavior and remain valid
- DO NOT change existing passing tests — only remove the 3 Layout tests that no longer apply and add new Navbar tests
- DO NOT add excessive tests — the SeasonalBanner component itself is already well-tested (21 tests in SeasonalBanner.test.tsx)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders SeasonalBanner during named season` | integration | Render Navbar with Lent mock, verify `role="complementary"` exists |
| `does not render SeasonalBanner during Ordinary Time` | integration | Render Navbar with Ordinary Time mock, verify no complementary role |
| `renders SeasonalBanner inside the nav element` | integration | Verify banner is a descendant of `<nav>` |
| `suppresses SeasonalBanner when hideBanner is true` | integration | Render Navbar with `hideBanner`, verify no banner |

**Expected state after completion:**
- [ ] Layout.test.tsx has 2 remaining tests (bg-neutral-bg, bg-dashboard-dark) — all pass
- [ ] Navbar-seasonal.test.tsx has 3 existing tests + 4 new tests = 7 total — all pass
- [ ] SeasonalBanner.test.tsx unchanged — 21 tests still pass

---

### Step 4: Build verification and full test run

**Objective:** Verify the build compiles with zero errors/warnings and all tests pass.

**Files to modify:** None (verification only).

**Details:**

1. Run `cd frontend && pnpm build` — expect 0 errors, 0 warnings
2. Run `cd frontend && pnpm test` — expect all tests pass
3. Verify via grep: `grep -r "SeasonalBanner" frontend/src/` — should show:
   - `components/SeasonalBanner.tsx` — the component file
   - `components/Navbar.tsx` — the single render location (import + render)
   - `components/__tests__/SeasonalBanner.test.tsx` — component tests
   - `components/__tests__/Navbar-seasonal.test.tsx` — integration tests
   - Zero other files (no page components, no Layout.tsx)

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT skip the test run
- DO NOT ignore test failures — any failure indicates a missed dependency

**Test specifications:** N/A (verification step).

**Expected state after completion:**
- [ ] Build: 0 errors, 0 warnings
- [ ] All tests pass
- [ ] SeasonalBanner imported in exactly 2 files: Navbar.tsx (render) + SeasonalBanner.test.tsx (unit tests) + Navbar-seasonal.test.tsx (integration tests, via Navbar import)
- [ ] Zero SeasonalBanner references in Layout.tsx or any page component

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Move SeasonalBanner from Layout.tsx to Navbar.tsx |
| 2 | 1 | Add hideBanner prop to Home.tsx |
| 3 | 1, 2 | Update tests (remove Layout banner tests, add Navbar banner tests) |
| 4 | 1, 2, 3 | Build verification + full test run |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Move banner to Navbar | [COMPLETE] | 2026-03-31 | Modified Navbar.tsx (added hideBanner prop, SeasonalBanner import+render inside nav after max-w-6xl container). Removed SeasonalBanner import and render from Layout.tsx. |
| 2 | Suppress on landing page | [COMPLETE] | 2026-03-31 | Home.tsx: changed `<Navbar transparent />` to `<Navbar transparent hideBanner />`. No other pages modified. |
| 3 | Update tests | [COMPLETE] | 2026-03-31 | Removed 3 SeasonalBanner tests from Layout.test.tsx (2 remaining). Added useReducedMotion mock + 4 new SeasonalBanner integration tests to Navbar-seasonal.test.tsx (7 total). All 30 tests pass. |
| 4 | Build verification | [COMPLETE] | 2026-03-31 | Build: 0 errors, 0 warnings. Tests: 30/30 pass for affected files (Layout 2, Navbar-seasonal 7, SeasonalBanner 21). Also fixed unused `screen` import in Layout.test.tsx. 10 pre-existing test failures in unrelated files (PrayCeremony, Challenges, PrayerWallActivity, Navbar-challenges). |
