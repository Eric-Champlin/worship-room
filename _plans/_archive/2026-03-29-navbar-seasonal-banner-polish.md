# Implementation Plan: Navbar & Seasonal Banner Polish

**Spec:** `_specs/navbar-seasonal-banner-polish.md`
**Date:** 2026-03-29
**Branch:** `claude/feature/navbar-seasonal-banner-polish`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign and inner-page hero redesign (~2026-03-25). Navbar glassmorphic values come from codebase inspection of `Navbar.tsx`, not the recon.

---

## Architecture Context

### Relevant Files

| File | Role | Current State |
|------|------|---------------|
| `frontend/src/components/Navbar.tsx` (259 lines) | Main navbar component | `NavbarLogo` (lines 55-78) renders liturgical icon via `SEASON_ICON_MAP`. `SeasonalNavLine` rendered at lines 229-232 (desktop only). |
| `frontend/src/components/SeasonalNavLine.tsx` (46 lines) | Seasonal message strip + `SEASON_ICON_MAP` export | Rendered inside navbar glass container. Uses `sessionStorage('wr_seasonal_nav_dismissed')`. Exported `SEASON_ICON_MAP` consumed by Navbar + MobileDrawer. |
| `frontend/src/components/SeasonalBanner.tsx` (92 lines) | Standalone seasonal banner (built but unused) | Uses `themeColor`-tinted background, `sessionStorage('wr_seasonal_banner_dismissed')`. Not imported anywhere except its test file. |
| `frontend/src/components/MobileDrawer.tsx` | Mobile hamburger drawer | Lines 207-230: inline seasonal section using `SEASON_ICON_MAP` from SeasonalNavLine and `sessionStorage('wr_seasonal_nav_dismissed')`. |
| `frontend/src/components/Layout.tsx` (39 lines) | Page wrapper: Navbar → hero → main → footer | `hero` prop triggers transparent navbar. SeasonalBanner not yet integrated. |
| `frontend/src/hooks/useLiturgicalSeason.ts` | Returns `LiturgicalSeasonResult` | Memoized via `useMemo`. `isNamedSeason` is `false` during Ordinary Time. |
| `frontend/src/constants/liturgical-calendar.ts` | Season definitions, Computus algorithm | `LiturgicalSeason` type includes `id`, `themeWord`, `icon` fields. |

### Import Dependency Chain (current)

```
Navbar.tsx
  ├── imports SEASON_ICON_MAP from SeasonalNavLine.tsx
  ├── imports SeasonalNavLine from SeasonalNavLine.tsx
  └── imports useLiturgicalSeason (used only by NavbarLogo)

MobileDrawer.tsx
  └── imports SEASON_ICON_MAP from SeasonalNavLine.tsx

SeasonalBanner.tsx
  └── has its own local SEASON_ICON_MAP copy (no import from SeasonalNavLine)
```

After cleanup: no file will import from `SeasonalNavLine.tsx` → file can be deleted.

### Key Patterns

- **Test wrapping**: Components using `Link` need `<MemoryRouter>`. Navbar tests use dynamic import (`await import('../Navbar')`) after mock setup.
- **Navbar test file**: `__tests__/Navbar-seasonal.test.tsx` tests logo icon + SeasonalNavLine rendering — must be rewritten.
- **SeasonalBanner test file**: `__tests__/SeasonalBanner.test.tsx` (28 tests) — must be updated for new styling, messages, and localStorage.
- **Layout test file**: `__tests__/Layout.test.tsx` (2 tests) — needs SeasonalBanner integration test.
- **Reduced motion**: `useReducedMotion()` hook gates animation. Existing SeasonalBanner already respects this.
- **Touch targets**: 44px minimum = `h-11 w-11` in Tailwind (existing pattern from SeasonalBanner dismiss button).

### Navbar Structure

```
<nav> (absolute on landing, bg-hero-dark on inner pages)
  <div> (max-w-6xl px-4 pt-5 pb-2)
    <div> (rounded-2xl glassmorphic container)
      <div> (flex justify-between — logo, nav links, auth actions, hamburger)
      <div hidden md:block> ← SeasonalNavLine (REMOVE)
    </div>
    {transparent && divider line}
    <MobileDrawer /> (has its own seasonal section — REMOVE)
  </div>
</nav>
```

### Landing Page Positioning Edge Case

When `hero` is present in Layout, the navbar is `absolute inset-x-0` (out of document flow). The SeasonalBanner will be the first in-flow element at `y=0`. The navbar (z-50) overlays it. The hero's existing top padding (`pt-28` or similar) pushes hero content below the navbar. The banner adds ~40px of offset before the hero, which means the hero gradient starts slightly lower.

**Planned approach**: Render the banner in Layout between Navbar and hero/main. On transparent-navbar pages, the banner is partially behind the navbar initially but scrolls into view since the navbar is **not** sticky/fixed. This is acceptable for MVP — named liturgical seasons are a minority of the year, and the landing page has its own seasonal messaging via the hero greeting.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View seasonal banner | No auth required | Step 4 (Layout) | None — visible to all |
| Click CTA link | No auth required | Step 3 (SeasonalBanner) | None — `/daily?tab=devotional` is public |
| Dismiss banner | No auth required | Step 3 (SeasonalBanner) | None — localStorage write |

No auth gating needed for this feature.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Banner container | background | `bg-white/[0.04]` = `rgba(255,255,255,0.04)` | spec |
| Banner container | backdrop-filter | `backdrop-blur-md` = `blur(12px)` | spec |
| Banner container | border-bottom | `border-b border-white/10` = `1px solid rgba(255,255,255,0.1)` | spec |
| Banner padding | horizontal | `px-4 sm:px-6` (matches navbar) | spec + Navbar.tsx:190 |
| Banner padding | vertical | `py-2` (~8px top/bottom, yields ~36-40px total height) | spec |
| Sparkle icon | color | `text-white/40` = `rgba(255,255,255,0.4)` | spec |
| Season message | color | `text-white/70` = `rgba(255,255,255,0.7)` | spec |
| CTA link | color | `text-primary-lt` = `#8B5CF6` | spec + design-system.md |
| CTA link | hover color | `hover:text-primary` = `#6D28D9` | spec + design-system.md |
| Middle dot | color | `text-white/40` (same as sparkle) | codebase convention |
| Dismiss X icon | color | `text-white/40 hover:text-white/70` | spec |
| Dismiss X button | size | `h-11 w-11` = 44×44px touch target | spec |
| Logo text | font | `font-script text-4xl font-bold` (Caveat) | Navbar.tsx:63 |

---

## Design System Reminder

- **Caveat** (`font-script`) is used for the "Worship Room" logo and highlighted heading words — not Lora
- Navbar glassmorphic: `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` (inner pages) or `liquid-glass` (transparent/landing)
- Navbar horizontal padding: `px-4 sm:px-6` inside `max-w-6xl` container
- All dark pages use `bg-dashboard-dark` (#0f0a1e) or `bg-hero-dark` (#0D0620)
- Primary light: `text-primary-lt` = `#8B5CF6` — used for CTA links on dark backgrounds
- `prefers-reduced-motion`: gate all CSS transitions, use `motion-safe:` prefix or runtime check via `useReducedMotion()` hook
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Font-script `bg-clip-text` cutoff: add `px-1 sm:px-2` on clipped text (recent fix in content-width-layout-fixes plan)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_seasonal_banner_dismissed_{seasonId}` | Both | Per-season banner dismissal (e.g., `wr_seasonal_banner_dismissed_lent`) |

**Keys removed:**

| Key | Previously Used By | Reason |
|-----|-------------------|--------|
| `wr_seasonal_banner_dismissed` (sessionStorage) | SeasonalBanner.tsx | Replaced by per-season localStorage keys |
| `wr_seasonal_nav_dismissed` (sessionStorage) | SeasonalNavLine.tsx, MobileDrawer.tsx | Components removed — standalone banner replaces both |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Banner content wraps: sparkle + message on line 1, CTA on line 2. Dismiss X absolute-right, vertically centered. `px-4` horizontal padding. |
| Tablet | 768px | Single centered line: sparkle + message + dot + CTA + dismiss X. `px-6` horizontal padding. |
| Desktop | 1440px | Same as tablet — single centered line within page flow. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → Banner | 0px (banner immediately follows navbar) | spec: banner is a strip below navbar |
| Banner → main content | 0px on hero pages, standard `py-8` gap on non-hero pages | Layout.tsx:30 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `SeasonalBanner.tsx` exists and is not imported anywhere except its test
- [x] `SeasonalNavLine.tsx` is only imported by Navbar.tsx and MobileDrawer.tsx
- [x] `useLiturgicalSeason` in NavbarLogo is only used for the seasonal icon
- [x] MobileDrawer's seasonal section (lines 207-230) duplicates SeasonalNavLine functionality
- [x] No auth gating needed — all interactions are public
- [x] Design system values verified from spec + codebase inspection
- [x] [UNVERIFIED] values flagged with verification methods
- [x] Prior specs in the sequence are complete (standalone feature, no dependencies)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MobileDrawer seasonal section | Remove it | Standalone banner handles all breakpoints. Keeping both creates duplicate seasonal messages and inconsistent dismiss state (old uses sessionStorage, new uses localStorage). |
| SeasonalNavLine.tsx file | Delete entirely | After Navbar and MobileDrawer cleanup, nothing imports from it. Dead code removal. |
| Epiphany message | Use generic pattern: "It's Epiphany — a season of {themeWord}" | Spec lists custom messages for 6 seasons but omits Epiphany. Generic pattern fills the gap. |
| Landing page banner visibility | Banner renders at top of flow; partially behind absolute navbar on initial load | Navbar is not sticky — banner scrolls into view. Named seasons are a minority of the year. Landing page has its own seasonal messaging. Acceptable for MVP. |
| `SEASON_ICON_MAP` in new banner | Not used — replaced with decorative `Sparkles` icon | Spec says use decorative sparkle, not season-specific icons. |
| Middle dot separator | `·` character (`\u00B7`) with `text-white/40` | Matches the "Layout example" in spec. Consistent with light-on-dark patterns. |

---

## Implementation Steps

### Step 1: Clean up Navbar — remove logo icon and SeasonalNavLine rendering

**Objective:** Remove the liturgical icon from `NavbarLogo` and remove the `SeasonalNavLine` strip from the navbar glass container.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — remove icon from NavbarLogo, remove SeasonalNavLine rendering, clean up imports

**Details:**

1. **Remove imports** (lines 8, 10, 11):
   - Remove `import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'`
   - Remove `import { SEASON_ICON_MAP } from '@/components/SeasonalNavLine'`
   - Remove `import { SeasonalNavLine } from '@/components/SeasonalNavLine'`

2. **Simplify NavbarLogo** (lines 55-78):
   Replace the entire `NavbarLogo` function with:
   ```tsx
   function NavbarLogo({ transparent }: { transparent: boolean }) {
     return (
       <Link to="/" className="flex items-center gap-1.5" aria-label="Worship Room home">
         <span
           className={cn(
             'font-script text-4xl font-bold',
             transparent ? 'text-white' : 'text-primary'
           )}
         >
           Worship Room
         </span>
       </Link>
     )
   }
   ```

3. **Remove SeasonalNavLine rendering** (lines 229-232):
   Delete the entire block:
   ```tsx
   {/* Seasonal line — desktop only */}
   <div className="hidden md:block">
     <SeasonalNavLine />
   </div>
   ```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — removing elements only.

**Guardrails (DO NOT):**
- DO NOT modify nav links, dropdown behavior, or hamburger button
- DO NOT change the `transparent` prop behavior or positioning logic
- DO NOT remove the decorative gradient divider below the navbar (line 235-239)
- DO NOT change MobileDrawer rendering in this step (handled in Step 2)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| NavbarLogo renders only text, no icon | unit | Render Navbar, query `getByLabelText('Worship Room home')`, verify no `svg[aria-hidden="true"]` children |
| NavbarLogo text is "Worship Room" | unit | Verify logo link contains text "Worship Room" |
| No seasonal line in navbar | unit | Render Navbar during named season, verify no `"It's Lent"` text in navbar |

**Expected state after completion:**
- [ ] NavbarLogo renders only "Worship Room" text — no icon adjacent
- [ ] No SeasonalNavLine renders inside the navbar glass container
- [ ] Navbar still renders correctly with all nav links, dropdowns, and auth actions
- [ ] No unused imports related to SeasonalNavLine or SEASON_ICON_MAP in Navbar.tsx

---

### Step 2: Remove seasonal section from MobileDrawer and delete SeasonalNavLine.tsx

**Objective:** Remove the redundant seasonal section from MobileDrawer (the standalone banner replaces it) and delete the now-orphaned `SeasonalNavLine.tsx` file.

**Files to modify:**
- `frontend/src/components/MobileDrawer.tsx` — remove seasonal section, clean up imports
- `frontend/src/components/SeasonalNavLine.tsx` — delete file

**Details:**

1. **MobileDrawer.tsx** — Remove seasonal state and rendering:

   a. Remove import (line 12):
   ```tsx
   import { SEASON_ICON_MAP } from '@/components/SeasonalNavLine'
   ```

   b. Remove seasonal state variables (lines 126-131):
   ```tsx
   const { isNamedSeason, seasonName, icon: seasonIcon, currentSeason } = useLiturgicalSeason()
   const [seasonDismissed, setSeasonDismissed] = useState(() => {
     try { return sessionStorage.getItem('wr_seasonal_nav_dismissed') === 'true' }
     catch (_e) { return false }
   })
   const SeasonIcon = isNamedSeason ? SEASON_ICON_MAP[seasonIcon] : null
   ```

   c. Remove the `useLiturgicalSeason` import if it's only used for the seasonal section. Check if other parts of MobileDrawer use it — if not, remove the import.

   d. Remove seasonal banner JSX (lines 207-230):
   ```tsx
   {/* Seasonal banner — mobile drawer */}
   {isNamedSeason && !seasonDismissed && ( ... )}
   ```

   e. Remove `useState` from imports if no longer used (check remaining usage).

2. **Delete `frontend/src/components/SeasonalNavLine.tsx`** — No component imports from this file after Steps 1 and 2.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — removing elements only.

**Guardrails (DO NOT):**
- DO NOT modify the MobileDrawer's nav links, offline indicator, or other sections
- DO NOT modify any other MobileDrawer functionality
- DO NOT remove `useLiturgicalSeason` import from MobileDrawer if it's used elsewhere in the component (check first)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| MobileDrawer no longer shows seasonal text | unit | Render Navbar with named season, open drawer, verify no "It's Lent" text inside drawer |
| MobileDrawer still renders nav links | unit | Verify drawer contains Daily Hub, Prayer Wall, Music links |

**Expected state after completion:**
- [ ] MobileDrawer has no seasonal section
- [ ] `SeasonalNavLine.tsx` deleted from filesystem
- [ ] No import errors — grep for `SeasonalNavLine` returns zero results across codebase
- [ ] MobileDrawer still renders all navigation links and auth actions correctly

---

### Step 3: Restyle SeasonalBanner as glassmorphic strip

**Objective:** Rewrite `SeasonalBanner.tsx` to render as a glassmorphic strip with custom per-season messages, decorative sparkle icon, and localStorage dismissal keyed by season ID.

**Files to modify:**
- `frontend/src/components/SeasonalBanner.tsx` — full rewrite

**Details:**

Replace the entire component with:

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { LiturgicalSeasonId } from '@/constants/liturgical-calendar'

const SEASON_MESSAGES: Partial<Record<LiturgicalSeasonId, string>> = {
  advent: "It's Advent — a season of waiting and hope",
  christmas: 'Merry Christmas — celebrate the gift of Emmanuel',
  lent: "It's Lent — a season of reflection and renewal",
  'holy-week': "It's Holy Week — a season of sacrifice and redemption",
  easter: 'He is risen! — celebrate the joy of Easter',
  pentecost: "It's Pentecost — the Spirit is moving",
}

function getDismissKey(seasonId: string): string {
  return `wr_seasonal_banner_dismissed_${seasonId}`
}

export function SeasonalBanner() {
  const { isNamedSeason, currentSeason } = useLiturgicalSeason()
  const prefersReduced = useReducedMotion()
  const seasonId = currentSeason.id

  const [dismissed, setDismissed] = useState(() => {
    if (!isNamedSeason) return true
    try {
      return localStorage.getItem(getDismissKey(seasonId)) === 'true'
    } catch {
      return false
    }
  })
  const [hiding, setHiding] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (prefersReduced) {
      try { localStorage.setItem(getDismissKey(seasonId), 'true') } catch { /* noop */ }
      setDismissed(true)
      return
    }
    setHiding(true)
    dismissTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(getDismissKey(seasonId), 'true') } catch { /* noop */ }
      setDismissed(true)
    }, 200)
  }, [prefersReduced, seasonId])

  if (!isNamedSeason || dismissed) return null

  const message =
    SEASON_MESSAGES[seasonId as LiturgicalSeasonId] ??
    `It's ${currentSeason.name} — a season of ${currentSeason.themeWord}`

  return (
    <div
      className="w-full bg-white/[0.04] backdrop-blur-md border-b border-white/10"
      style={{
        maxHeight: hiding ? 0 : 200,
        opacity: hiding ? 0 : 1,
        overflow: 'hidden',
        transition: prefersReduced
          ? 'none'
          : 'max-height 200ms ease-out, opacity 200ms ease-out',
      }}
      role="complementary"
      aria-label="Seasonal announcement"
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-2 sm:px-6">
        {/* Mobile: wrap-friendly layout */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pr-10 sm:pr-12">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-white/40" aria-hidden="true" />
            <span className="text-sm text-white/70">{message}</span>
          </div>
          <span className="hidden text-white/40 sm:inline" aria-hidden="true">·</span>
          <Link
            to="/daily?tab=devotional"
            className="text-sm font-medium text-primary-lt transition-colors hover:text-primary"
          >
            Read today&apos;s devotional →
          </Link>
        </div>

        {/* Dismiss button — absolute right to avoid layout shifts */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4"
          aria-label="Dismiss seasonal banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
```

**Key changes from current SeasonalBanner:**
- Background: `bg-white/[0.04] backdrop-blur-md border-b border-white/10` (was `${themeColor}1A`)
- Icon: decorative `Sparkles` with `text-white/40` (was season-specific icon from `SEASON_ICON_MAP`)
- Messages: custom per-season from `SEASON_MESSAGES` map with fallback to generic pattern
- CTA: `text-primary-lt hover:text-primary` (was `style={{ color: themeColor }}`)
- Dismissal: `localStorage` keyed by `wr_seasonal_banner_dismissed_{seasonId}` (was `sessionStorage` with generic key)
- Layout: flex-wrap with `pr-10 sm:pr-12` to reserve space for absolute-positioned dismiss button
- Middle dot separator: `·` visible at `sm:` breakpoint
- `aria-label`: "Seasonal announcement" (was "Seasonal greeting")
- Removed: `SEASON_ICON_MAP` local copy, `themeColor` usage

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Single centered line — sparkle + message + dot + CTA + dismiss X. Content within `max-w-6xl` container.
- Tablet (768px): Same single-line layout.
- Mobile (375px): Content wraps via `flex-wrap` — sparkle + message on line 1, CTA on line 2. Dismiss X absolute right, vertically centered. `pr-10` reserves space so text doesn't overlap dismiss button.

**Guardrails (DO NOT):**
- DO NOT use `themeColor` for any styling — the glassmorphic strip is season-agnostic in color
- DO NOT use season-specific icons (Cross, Star, etc.) — only the decorative `Sparkles` icon
- DO NOT use `sessionStorage` — must be `localStorage` for cross-session persistence
- DO NOT use `dangerouslySetInnerHTML` for messages
- DO NOT make the banner fixed or sticky

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders during named season | unit | Mock Lent, verify banner renders with correct message |
| Does not render during Ordinary Time | unit | Mock ordinary-time, verify empty render |
| Custom Advent message | unit | Mock Advent, verify "waiting and hope" text |
| Custom Christmas message | unit | Mock Christmas, verify "gift of Emmanuel" text |
| Custom Lent message | unit | Mock Lent, verify "reflection and renewal" text |
| Custom Holy Week message | unit | Mock Holy Week, verify "sacrifice and redemption" text |
| Custom Easter message | unit | Mock Easter, verify "He is risen!" text |
| Custom Pentecost message | unit | Mock Pentecost, verify "the Spirit is moving" text |
| Fallback message for Epiphany | unit | Mock Epiphany, verify generic "It's Epiphany — a season of" pattern |
| CTA links to /daily?tab=devotional | unit | Verify link href |
| CTA uses text-primary-lt | unit | Verify CTA has `text-primary-lt` class |
| Decorative sparkle icon | unit | Verify Sparkles SVG has `aria-hidden="true"` |
| Dismiss writes to localStorage with season key | unit | Mock Lent with reduced motion, click dismiss, verify `localStorage.getItem('wr_seasonal_banner_dismissed_lent')` |
| Not rendered when dismissed | unit | Pre-set localStorage dismiss key, verify empty render |
| New season shows banner after previous dismissal | unit | Pre-set localStorage for Lent, mock Easter, verify banner renders |
| Dismiss button has aria-label | unit | Verify "Dismiss seasonal banner" label |
| Dismiss button has 44px touch target | unit | Verify `h-11 w-11` classes |
| Banner has role="complementary" | unit | Verify role attribute |
| Banner has aria-label="Seasonal announcement" | unit | Verify aria-label attribute |
| No animation when prefers-reduced-motion | unit | Mock reduced motion, verify `transition: 'none'` |
| Glassmorphic background classes | unit | Verify `bg-white/[0.04]`, `backdrop-blur-md`, `border-b`, `border-white/10` |

**Expected state after completion:**
- [ ] SeasonalBanner renders as glassmorphic strip with decorative sparkle
- [ ] Custom messages for all 6 spec-defined seasons
- [ ] localStorage dismissal keyed by season ID
- [ ] 44px dismiss button touch target
- [ ] Accessible: `role="complementary"`, `aria-label`, `aria-hidden` on decorative icon
- [ ] 200ms fade-out animation respecting `prefers-reduced-motion`

---

### Step 4: Integrate SeasonalBanner into Layout.tsx

**Objective:** Render `SeasonalBanner` in the Layout component between the Navbar and main content, so it appears site-wide on all pages.

**Files to modify:**
- `frontend/src/components/Layout.tsx` — add SeasonalBanner between Navbar and hero/main

**Details:**

Add import at top of file:
```tsx
import { SeasonalBanner } from '@/components/SeasonalBanner'
```

Insert `<SeasonalBanner />` after the Navbar and before `{hero}`:

```tsx
{hero ? <Navbar transparent /> : <Navbar />}
<SeasonalBanner />
{hero}
```

The full Layout component becomes:
```tsx
export function Layout({ children, hero, dark }: LayoutProps) {
  return (
    <div className={cn(
      'flex min-h-screen flex-col overflow-x-hidden font-sans',
      dark ? 'bg-dashboard-dark' : 'bg-neutral-bg',
    )}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      {hero ? <Navbar transparent /> : <Navbar />}
      <SeasonalBanner />
      {hero}
      <main
        id="main-content"
        className={cn(
          'flex-1',
          hero ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
```

[UNVERIFIED] Landing page positioning: On hero pages (transparent navbar), the banner is the first in-flow element. The absolute navbar overlays it. The banner is ~40px tall and partially behind the navbar on initial load, but becomes visible on scroll since the navbar is not sticky.
→ To verify: Run `/verify-with-playwright` on landing page during a named liturgical season
→ If wrong: Add `className="pt-20"` wrapper on hero pages, or conditionally skip banner when `hero` is present

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Banner renders as full-width strip below the navbar's `max-w-6xl` container. Banner's own content is constrained by `max-w-6xl`.
- Tablet (768px): Same behavior, narrower viewport.
- Mobile (375px): Same behavior. Banner content wraps as defined in Step 3.

**Guardrails (DO NOT):**
- DO NOT make the banner fixed or sticky
- DO NOT change the existing Layout props interface
- DO NOT modify the main content padding or hero rendering
- DO NOT add conditional rendering based on `hero` prop — banner renders on all pages

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Layout renders SeasonalBanner | integration | Render Layout with named season mock, verify `role="complementary"` element exists |
| Layout renders SeasonalBanner before main | integration | Verify banner appears before `#main-content` in DOM order |
| Layout with hero still renders banner | integration | Render Layout with `hero` prop and named season, verify banner present |

**Expected state after completion:**
- [ ] SeasonalBanner renders on all pages (landing, dashboard, Daily Hub, Prayer Wall, Bible, Music, etc.)
- [ ] Banner appears between navbar and main content in DOM order
- [ ] Banner does not interfere with existing hero, main content, or footer layout
- [ ] During Ordinary Time, no banner renders and no empty gap exists

---

### Step 5: Update and add tests

**Objective:** Rewrite `Navbar-seasonal.test.tsx` for the new behavior (no icon, no seasonal line), update `SeasonalBanner.test.tsx` for the new implementation, and add Layout integration test.

**Files to modify:**
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — rewrite for clean logo + no seasonal line
- `frontend/src/components/__tests__/SeasonalBanner.test.tsx` — rewrite for new glassmorphic strip, custom messages, localStorage
- `frontend/src/components/__tests__/Layout.test.tsx` — add SeasonalBanner integration test

**Details:**

1. **Navbar-seasonal.test.tsx** — Replace the existing "seasonal icon" and "seasonal line" test groups:

   **"Navbar — clean logo" group** (replaces "Navbar — seasonal icon"):
   - `renders logo text without seasonal icon during named season` — mock Advent, verify `getByLabelText('Worship Room home')` has no `svg[aria-hidden="true"]` children
   - `renders logo text without seasonal icon during Ordinary Time` — mock ordinary-time, same verification
   - `logo text says "Worship Room"` — verify text content

   **Remove** the entire "Navbar — seasonal line" test group (6 tests) — SeasonalNavLine is no longer rendered in Navbar.

2. **SeasonalBanner.test.tsx** — Full rewrite following the 21 test specs from Step 3. Key changes:
   - Replace `sessionStorage` setup/assertions with `localStorage`
   - Update dismiss key from `'wr_seasonal_banner_dismissed'` to `'wr_seasonal_banner_dismissed_{seasonId}'`
   - Add custom message tests for each of the 6 spec-defined seasons + Epiphany fallback
   - Update `aria-label` assertion from "Seasonal greeting" to "Seasonal announcement"
   - Add glassmorphic class assertions
   - Add CTA class assertion (`text-primary-lt`)
   - Keep existing patterns: `vi.mock`, `mockSeason` helper, `<MemoryRouter>` wrapping

3. **Layout.test.tsx** — Add test:
   - Mock `useLiturgicalSeason` to return a named season
   - Render Layout, verify `role="complementary"` element with `aria-label="Seasonal announcement"` exists

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — tests only.

**Guardrails (DO NOT):**
- DO NOT modify tests for other Navbar test files (`Navbar.test.tsx`, `Navbar-offline.test.tsx`, `Navbar-challenges.test.tsx`)
- DO NOT change test patterns — use same mock setup, `MemoryRouter` wrapping, and assertion style as existing tests
- DO NOT add tests for MobileDrawer seasonal removal (negative test not valuable — the JSX is simply removed)

**Test specifications:**

Tests are the deliverable for this step — see test list above.

**Expected state after completion:**
- [ ] `Navbar-seasonal.test.tsx` has 3 tests (clean logo, no icons, text content)
- [ ] `SeasonalBanner.test.tsx` has ~21 tests covering all spec requirements
- [ ] `Layout.test.tsx` has 3-4 tests (existing 2 + new SeasonalBanner integration)
- [ ] All tests pass

---

### Step 6: Build verification and final cleanup

**Objective:** Verify build passes, all tests pass, no unused imports, and no references to deleted `SeasonalNavLine.tsx`.

**Files to modify:** None (verification only)

**Details:**

1. Run `pnpm build` — must produce 0 errors, 0 warnings
2. Run `pnpm test` — all tests must pass
3. Grep for dead references:
   - `grep -r "SeasonalNavLine" frontend/src/` — must return 0 results (file deleted, all imports removed)
   - `grep -r "wr_seasonal_nav_dismissed" frontend/src/` — must return 0 results (sessionStorage key no longer used)
   - `grep -r "SEASON_ICON_MAP" frontend/src/` — should only appear in `SeasonalBanner.tsx` test mocks if at all (the new SeasonalBanner doesn't use it)
4. Verify no lint errors introduced: `pnpm lint`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any code in this step — it's verification only
- DO NOT ignore failing tests — fix any issues found

**Test specifications:** N/A — this step runs existing tests.

**Expected state after completion:**
- [ ] Build: 0 errors, 0 warnings
- [ ] All tests pass (previous count: 4,879 — expect slight decrease from removed Navbar seasonal line tests, offset by new SeasonalBanner tests)
- [ ] Zero references to `SeasonalNavLine` in codebase
- [ ] Zero references to `wr_seasonal_nav_dismissed` sessionStorage key
- [ ] No lint errors introduced

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Clean up Navbar (remove icon + SeasonalNavLine rendering) |
| 2 | 1 | Remove MobileDrawer seasonal section + delete SeasonalNavLine.tsx |
| 3 | — | Restyle SeasonalBanner (can run in parallel with Steps 1-2) |
| 4 | 1, 2, 3 | Integrate SeasonalBanner into Layout.tsx |
| 5 | 1, 2, 3, 4 | Update and add tests |
| 6 | 5 | Build verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Clean up Navbar | [COMPLETE] | 2026-03-30 | `Navbar.tsx`: removed useLiturgicalSeason, SEASON_ICON_MAP, SeasonalNavLine imports; simplified NavbarLogo to text-only; removed SeasonalNavLine rendering block |
| 2 | Remove MobileDrawer seasonal + delete SeasonalNavLine | [COMPLETE] | 2026-03-30 | `MobileDrawer.tsx`: removed seasonal state/JSX (lines 126-131, 207-230), removed SEASON_ICON_MAP + useLiturgicalSeason imports, removed unused X import. Deleted `SeasonalNavLine.tsx` |
| 3 | Restyle SeasonalBanner | [COMPLETE] | 2026-03-30 | `SeasonalBanner.tsx`: full rewrite — glassmorphic strip, 6 custom SEASON_MESSAGES + generic fallback, Sparkles icon, localStorage keyed by seasonId, 200ms fade-out with reduced-motion respect |
| 4 | Integrate into Layout | [COMPLETE] | 2026-03-30 | `Layout.tsx`: added SeasonalBanner import + rendered between Navbar and hero/main |
| 5 | Update and add tests | [COMPLETE] | 2026-03-30 | `Navbar-seasonal.test.tsx`: rewritten to 3 clean-logo tests. `SeasonalBanner.test.tsx`: rewritten to 21 tests. `Layout.test.tsx`: expanded from 2 to 5 tests. All 29 new tests pass |
| 6 | Build verification | [COMPLETE] | 2026-03-30 | Build: 0 errors, 0 warnings. 92 plan-related tests pass. Zero dead references to SeasonalNavLine, wr_seasonal_nav_dismissed, SEASON_ICON_MAP. 5 pre-existing failures in unrelated files (ChallengeDetail, Challenges, useNotifications) |
