# Implementation Plan: Dashboard Preview Card Sizing Fixes

**Spec:** `_specs/dashboard-preview-card-sizing.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch, do NOT create new)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/`
- Target file: `frontend/src/components/homepage/DashboardPreview.tsx`
- Test file: `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx`
- Data file: `frontend/src/components/homepage/dashboard-preview-data.ts` (no changes)
- FrostedCard: `frontend/src/components/homepage/FrostedCard.tsx` (no changes per spec)

### Current Component Structure (DashboardPreview.tsx)

The component renders 6 preview cards inline (no separate `DashboardPreviewCard.tsx`). Each card:

```
<FrostedCard className="min-h-[140px] sm:min-h-[160px] p-0 overflow-hidden">
  <div className="flex items-center gap-2 px-4 pt-4 pb-2">  ← Header (icon + title)
    ...
  </div>
  <div className="relative px-4 pb-4">                      ← Preview content area
    <Preview />
    <LockOverlay />                                          ← Covers entire card (inset-0)
  </div>
</FrostedCard>
```

### Issues to Fix

1. **min-h too small**: `min-h-[140px] sm:min-h-[160px]` → `min-h-[180px] sm:min-h-[220px]`
2. **No grid row equalization**: Grid lacks `auto-rows-fr`
3. **Cards don't fill grid cells**: No `h-full flex flex-col` on FrostedCard wrapper
4. **Preview content not flex-filling**: Preview content area lacks `flex-1`
5. **Preview content not vertically centered**: Sparse mockups hug the top
6. **No header divider**: No `border-b` between header and content
7. **Lock overlay scope too wide**: `inset-0` covers header + content. Need to cover only the preview content area (it's already positioned inside the content `<div>`, but `inset-0` makes it cover the parent — need to scope via `relative` on content wrapper only, not on FrostedCard)
8. **Mobile height mismatch**: Spec wants `min-h-[160px]` on mobile (< 640px), currently `min-h-[140px]`

### FrostedCard Component

`FrostedCard` accepts `className` prop merged via `cn()`. Base classes: `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6`. The `p-0 overflow-hidden` override already in place. **No changes to FrostedCard itself** — all changes are in DashboardPreview.tsx card usage.

### LockOverlay Component

Currently: `<div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl backdrop-blur-[3px] bg-[#08051A]/60">`. Uses `absolute inset-0` — this means it covers the nearest `relative` parent. Currently the preview content `<div className="relative px-4 pb-4">` is the relative parent, so the overlay already covers only the content area. However, the overlay needs to fully fill the content area when it grows via `flex-1`.

### Test Patterns

Tests in `__tests__/DashboardPreview.test.tsx` (29 tests). Use `MemoryRouter` + `ToastProvider` + `AuthModalProvider` wrapping. Mock `useScrollReveal` to return `isVisible: true`. Test card titles, content, lock overlays, CTA button, auth modal trigger, stagger delays.

---

## Auth Gating Checklist

**No auth gating changes in this spec — visual-only fix.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View preview cards | Logged-out users can view | N/A | N/A (public section) |
| Click "Get Started" CTA | Opens auth modal (existing) | N/A (no change) | Existing useAuthModal pattern |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FrostedCard | background | `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl` | FrostedCard.tsx:22-23 |
| Lock overlay | background | `backdrop-blur-[3px] bg-[#08051A]/60` | DashboardPreview.tsx:133 |
| Header icon | color | `text-white/50` | DashboardPreview.tsx:186 |
| Header title | color | `text-white/70` | DashboardPreview.tsx:187 |
| Header divider | border | `border-b border-white/[0.06]` | Spec requirement |
| Preview area min-height (mobile) | min-height | `min-h-[160px]` | Spec requirement |
| Preview area min-height (sm+) | min-height | `min-h-[220px]` (was `sm:min-h-[160px]`) | Spec requirement |
| Card outer min-height (mobile) | min-height | `min-h-[180px]` (was `min-h-[140px]`) | Spec requirement |

---

## Design System Reminder

- FrostedCard base padding is `p-6` but DashboardPreview overrides with `p-0 overflow-hidden`
- Lock overlay blur: `backdrop-blur-[3px]` — do NOT change blur amount (spec: explicit)
- Header text: `text-white/50` icon + `text-white/70` title — do NOT change (spec: explicit)
- Grid breakpoints: `sm:grid-cols-2 lg:grid-cols-3` — Tailwind `sm` = 640px, `lg` = 1024px
- `auto-rows-fr` is a Tailwind utility that maps to `grid-auto-rows: minmax(0, 1fr)`

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | 1-column grid, each card full-width, `min-h-[160px]` preview area (per spec: `min-h-[180px]` on FrostedCard includes header) |
| Tablet | 640–1024px | 2-column grid, `min-h-[220px]` preview area, `auto-rows-fr` equalizes rows |
| Desktop | > 1024px | 3-column grid, `min-h-[220px]` preview area, `auto-rows-fr` equalizes rows |

---

## Vertical Rhythm

N/A — this is a fix to card internals within an existing section. No inter-section spacing changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] On `homepage-redesign` branch
- [x] `DashboardPreview.tsx` is the only file that needs modification (per spec)
- [x] FrostedCard component is NOT modified
- [x] LockOverlay styling (blur, bg color) is NOT modified
- [x] No auth gating changes needed
- [x] No new localStorage keys
- [x] No backend changes
- [x] Design system values verified from codebase inspection
- [x] No [UNVERIFIED] values — all values come from spec or codebase

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| min-h on FrostedCard vs preview area | Apply `min-h-[180px] sm:min-h-[220px]` on the preview content `<div>`, not on FrostedCard | Spec says "preview content area (below the header, above the lock overlay) must use min-h" |
| Lock overlay: absolute positioning parent | Keep `relative` on preview content wrapper, not on FrostedCard | Overlay must cover only preview area, not header |
| Centered vs left-aligned mockups | Mood Insights, Streak, Garden, Evening Reflection: `items-center`. Activity Checklist, Friends: no `items-center` (left-aligned) | Spec: "Left-aligned mockups (Activity Checklist, Friends) need `flex flex-col justify-center h-full` (no `items-center`)" |
| `h-full` on scroll-reveal wrapper vs FrostedCard | Apply `h-full` on the scroll-reveal wrapper div that contains FrostedCard, AND propagate `h-full` to FrostedCard | Grid cell → scroll-reveal div → FrostedCard → content all need to stretch |

---

## Implementation Steps

### Step 1: Grid container and card wrapper layout fixes [COMPLETE]

**Objective:** Make the grid equalize row heights and make cards fill their grid cells.

**Files to create/modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — grid container + card wrappers

**Details:**

1. **Grid container** (line 173): Add `auto-rows-fr` to the grid:
   ```
   Before: "mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
   After:  "mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 auto-rows-fr"
   ```

2. **Scroll-reveal wrapper div** (line 180): Add `h-full` so it stretches to fill the grid cell:
   ```
   Before: cn('scroll-reveal', isVisible && 'is-visible')
   After:  cn('scroll-reveal h-full', isVisible && 'is-visible')
   ```

3. **FrostedCard** (line 183): Add `h-full flex flex-col` so the card fills its wrapper and becomes a flex column:
   ```
   Before: "min-h-[140px] sm:min-h-[160px] p-0 overflow-hidden"
   After:  "h-full flex flex-col p-0 overflow-hidden"
   ```
   Note: Remove `min-h` from FrostedCard — it moves to the preview content area.

4. **Header row** (line 185): Add bottom border divider and adjust padding:
   ```
   Before: "flex items-center gap-2 px-4 pt-4 pb-2"
   After:  "flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/[0.06]"
   ```

5. **Preview content area** (line 190): Add `flex-1` to fill remaining card height, add `min-h` values, and add flex centering for mockup content:
   ```
   Before: "relative px-4 pb-4"
   After:  "relative flex-1 px-4 pb-4 min-h-[160px] sm:min-h-[220px]"
   ```

6. **Preview content inner wrapper**: Wrap `<Preview />` in a centering container. Each preview sub-component needs vertical centering within the flex-1 area. Add a wrapper div around `<Preview />`:
   ```jsx
   <div className="relative flex-1 px-4 pb-4 min-h-[160px] sm:min-h-[220px]">
     <div className={cn(
       'flex h-full flex-col justify-center',
       ['mood', 'streak', 'garden', 'evening'].includes(card.id) && 'items-center'
     )}>
       <Preview />
     </div>
     <LockOverlay />
   </div>
   ```
   This centers mockup content vertically. Centered cards (mood, streak, garden, evening) also get `items-center`. Left-aligned cards (practices, friends) only get `justify-center`.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): 3-column grid, `auto-rows-fr`, `min-h-[220px]` preview area
- Tablet (768px): 2-column grid, `auto-rows-fr`, `min-h-[220px]` preview area
- Mobile (375px): 1-column grid, `min-h-[160px]` preview area, each card is its own row

**Guardrails (DO NOT):**
- DO NOT modify `FrostedCard.tsx`
- DO NOT change lock overlay blur or background color
- DO NOT change header icon/title colors
- DO NOT change preview sub-component internals (MoodInsightsPreview, StreakPreview, etc.)
- DO NOT change the LockOverlay component
- DO NOT change the CTA section or scroll-reveal animation behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| grid has auto-rows-fr class | unit | Assert grid container includes `auto-rows-fr` |
| cards have h-full class | unit | Assert FrostedCard wrappers include `h-full` |
| preview area has min-h-[160px] class | unit | Assert preview content divs include `min-h-[160px]` |
| preview area has sm:min-h-[220px] class | unit | Assert preview content divs include responsive min-height |
| header has border-b divider | unit | Assert header rows include `border-b` class |
| centered cards have items-center | unit | Assert mood/streak/garden/evening preview wrappers have `items-center` |
| left-aligned cards lack items-center | unit | Assert practices/friends preview wrappers do NOT have `items-center` |

**Expected state after completion:**
- [ ] Grid container has `auto-rows-fr`
- [ ] Each card fills its grid cell via `h-full flex flex-col`
- [ ] Preview content area uses `flex-1 min-h-[160px] sm:min-h-[220px]`
- [ ] Header rows have `border-b border-white/[0.06]` divider
- [ ] Preview mockups are vertically centered (appropriate centering per card type)
- [ ] Lock overlay covers only the preview content area
- [ ] Scroll-reveal animations still work
- [ ] Build passes with 0 errors

---

### Step 2: Update existing tests + add sizing-specific tests [COMPLETE]

**Objective:** Update existing test expectations and add new tests for the sizing changes.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — add/update tests

**Details:**

Add a new `describe('card sizing and layout')` block with tests for the structural changes. Key tests:

```typescript
describe('card sizing and layout', () => {
  it('grid container has auto-rows-fr', () => {
    const { container } = renderDashboardPreview()
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('auto-rows-fr')
  })

  it('each card wrapper has h-full', () => {
    const { container } = renderDashboardPreview()
    // 6 card scroll-reveal wrappers (skip heading + CTA wrappers)
    const scrollReveals = container.querySelectorAll('.scroll-reveal')
    // Cards are indices 1-6 (0 is heading, 7 is CTA)
    for (let i = 1; i <= 6; i++) {
      expect(scrollReveals[i]?.className).toContain('h-full')
    }
  })

  it('preview content areas have responsive min-height', () => {
    const { container } = renderDashboardPreview()
    const previewAreas = container.querySelectorAll('.flex-1.min-h-\\[160px\\]')
    expect(previewAreas).toHaveLength(6)
  })

  it('header rows have bottom border divider', () => {
    const { container } = renderDashboardPreview()
    const headers = container.querySelectorAll('.border-b.border-white\\/\\[0\\.06\\]')
    expect(headers).toHaveLength(6)
  })

  it('centered preview cards have items-center', () => {
    const { container } = renderDashboardPreview()
    // Check that mood, streak, garden, evening previews have items-center
    const centeredWrappers = container.querySelectorAll('.items-center.justify-center')
    expect(centeredWrappers.length).toBeGreaterThanOrEqual(4)
  })

  it('lock overlays are scoped to preview area (not header)', () => {
    renderDashboardPreview()
    const overlays = screen.getAllByText(/create account to unlock/i)
    for (const overlay of overlays) {
      const overlayContainer = overlay.closest('.absolute.inset-0')
      const previewArea = overlayContainer?.parentElement
      // Preview area should have flex-1 (not the card root)
      expect(previewArea?.className).toContain('flex-1')
    }
  })
})
```

Existing tests should continue to pass without modification since we're not changing text content, card count, or interaction behavior. Verify all 29 existing tests + new tests pass.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (test file)

**Guardrails (DO NOT):**
- DO NOT delete or modify existing passing tests unless they assert on removed class names (e.g., if any test checks for `min-h-[140px]`, update it)
- DO NOT over-test — focus on structural/layout assertions, not pixel values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| grid auto-rows-fr | unit | Grid container has `auto-rows-fr` |
| card wrapper h-full | unit | All 6 card wrappers have `h-full` |
| preview min-height | unit | Preview areas have `min-h-[160px]` |
| header border divider | unit | Headers have `border-b` |
| centered cards | unit | 4 centered cards have `items-center` |
| lock overlay scope | unit | Overlays are inside flex-1 preview area |

**Expected state after completion:**
- [ ] All existing 29 tests pass
- [ ] 6+ new tests for sizing/layout pass
- [ ] Full test suite passes (5,464+ tests)
- [ ] Build passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Grid + card wrapper + header + preview area layout fixes in DashboardPreview.tsx |
| 2 | 1 | Update/add tests for the structural changes |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Grid and card layout fixes | [COMPLETE] | 2026-04-02 | Modified `DashboardPreview.tsx`: added `auto-rows-fr` to grid, `h-full` to scroll-reveal wrappers, `h-full flex flex-col` on FrostedCard, `border-b border-white/[0.06]` header divider, `flex-1 min-h-[160px] sm:min-h-[220px]` preview area, centering wrapper with conditional `items-center`. All 5,440 tests pass. Visual verified at 375/768/1440px. |
| 2 | Tests for sizing changes | [COMPLETE] | 2026-04-02 | Added 7 new tests in `describe('card sizing and layout')`: grid auto-rows-fr, card wrapper h-full, preview min-height, header border divider, centered cards items-center, left-aligned cards lack items-center, lock overlay scoping. All 29 existing tests unchanged and passing. Total: 5,447 tests pass. |
