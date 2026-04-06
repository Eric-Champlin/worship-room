# Implementation Plan: Tab Bar Transparent Background — Let Glow Orb Bleed Through

**Spec:** `_specs/tab-bar-transparent-bg.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/tab-bar-transparent-bg`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a 2-class change to a single line in `frontend/src/pages/DailyHub.tsx` (line 269). The sticky tab bar wrapper currently uses `bg-hero-bg/85 backdrop-blur-lg` which produces a nearly-opaque dark purple background (`rgba(8, 5, 26, 0.85)`) with 16px blur. This blocks the GlowBackground orb from bleeding through.

**File to modify:**

1. `frontend/src/pages/DailyHub.tsx` — Line 269: Remove `bg-hero-bg/85`, change `backdrop-blur-lg` (16px) to `backdrop-blur-md` (12px).

**Test file to modify:**

2. `frontend/src/pages/__tests__/DailyHub.test.tsx` — Add tests for the outer wrapper's transparent background and reduced blur. Verify inner pill is unchanged.

**Current tab bar wrapper (line 267-271):**

```tsx
<div
  className={cn(
    'sticky top-0 z-40 bg-hero-bg/85 backdrop-blur-lg transition-shadow',
    isSticky && 'shadow-md shadow-black/20',
  )}
>
```

**Target tab bar wrapper:**

```tsx
<div
  className={cn(
    'sticky top-0 z-40 backdrop-blur-md transition-shadow',
    isSticky && 'shadow-md shadow-black/20',
  )}
>
```

**Inner pill container (line 276, UNCHANGED):**

```tsx
<div
  ref={tabBarRef}
  className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
  role="tablist"
  ...
>
```

**GlowBackground overflow-visible:** Already confirmed at `frontend/src/components/homepage/GlowBackground.tsx` line 80 — the component renders `overflow-visible` which allows the glow orb to extend beyond the hero section.

**Tailwind blur values (default, no customization in tailwind.config.js):**

- `backdrop-blur-md` = `backdrop-filter: blur(12px)` — spec target
- `backdrop-blur-lg` = `backdrop-filter: blur(16px)` — current value

Using Tailwind's `backdrop-blur-md` class is equivalent to the spec's inline `backdropFilter: blur(12px)` and `WebkitBackdropFilter: blur(12px)` — Tailwind generates both vendor-prefixed and standard properties automatically. No inline styles needed.

**Test patterns (from `DailyHub.test.tsx`):**

- Provider wrapping: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- Existing mocks: `useAuth`, `useFaithPoints`, `useSoundEffects`, `useAudioState`, `useAudioDispatch`, `useScenePlayer`
- Existing tab bar tests at lines 360-380: test inner pill (`rounded-full`, `bg-white/[0.06]`), active tab (`bg-white/[0.12]`), inactive tabs (`text-white/50`)
- DOM query pattern: `screen.getByRole('tablist')` for inner pill, `tablist.parentElement` or `tablist.closest(...)` for outer wrapper

---

## Auth Gating Checklist

N/A — This is a visual-only CSS change. No interactive elements are added or modified. All existing auth gating is unchanged.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Tab bar outer wrapper (BEFORE) | background | `bg-hero-bg/85` = `rgba(8, 5, 26, 0.85)` | DailyHub.tsx:269 |
| Tab bar outer wrapper (BEFORE) | backdrop-filter | `backdrop-blur-lg` = `blur(16px)` | DailyHub.tsx:269 |
| Tab bar outer wrapper (AFTER) | background | **none** (removed) | spec requirement |
| Tab bar outer wrapper (AFTER) | backdrop-filter | `backdrop-blur-md` = `blur(12px)` | spec requirement |
| Tab bar outer wrapper | position | `sticky top-0 z-40` | DailyHub.tsx:269 (unchanged) |
| Tab bar outer wrapper (scrolled) | shadow | `shadow-md shadow-black/20` | DailyHub.tsx:270 (unchanged) |
| Inner pill container | background | `bg-white/[0.06]` | DailyHub.tsx:276 (unchanged) |
| Inner pill container | border | `border border-white/[0.12]` | DailyHub.tsx:276 (unchanged) |
| Inner pill container | radius | `rounded-full` | DailyHub.tsx:276 (unchanged) |
| Glow orb | color | `rgba(139, 92, 246, 0.30)` | design-system.md — all call sites use `glowOpacity={0.30}` |
| Glow orb | blur | `blur(80px)` desktop / `blur(60px)` mobile | design-system.md |

---

## Design System Reminder

**Project-specific quirks for this feature:**

- `backdrop-blur-md` in Tailwind = `blur(12px)` — this is the spec's target. DO NOT use `backdrop-blur-lg` (16px) or an arbitrary value `backdrop-blur-[12px]`.
- The GlowBackground component at line 80 uses `overflow-visible` — this is what allows the orb to bleed past the hero. DO NOT add `overflow-hidden` anywhere in the tab bar ancestry.
- Inner pill styling (`bg-white/[0.06] border border-white/[0.12] rounded-full`) must remain EXACTLY as-is — it carries the legibility burden now that the outer wrapper is transparent.
- Active tab classes (`bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]`) must remain unchanged.
- Inactive tab text is `text-white/50`. The spec notes a WCAG AA contrast fallback: if contrast fails during visual verification, bump to `text-white/70`. Do NOT pre-emptively change this — verify first.
- The sticky shadow (`shadow-md shadow-black/20`) fires via IntersectionObserver sentinel — it must remain functional.
- `transition-shadow` on the outer wrapper enables smooth shadow appearance — keep it.

---

## Shared Data Models (from Master Plan)

N/A — No data models, no localStorage keys, no cross-spec dependencies.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Same transparent wrapper. Glow orb is 300×300px with blur(60px) — smaller bleed but still visible through tab bar. |
| Tablet | 768px | Same as mobile. No layout differences. |
| Desktop | 1440px | Primary verification target. Glow orb is 600×600px with blur(80px) — most visible bleed-through effect. |

No layout changes at any breakpoint. The only difference from current is the outer wrapper's two Tailwind classes.

---

## Vertical Rhythm

N/A — No spacing changes. The tab bar's `py-3 sm:py-4` internal padding and its position in the DOM are unchanged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] GlowBackground already has `overflow-visible` (confirmed at line 80)
- [x] No inline `style` prop on the outer wrapper (it uses Tailwind classes only)
- [x] `backdrop-blur-md` = 12px in default Tailwind (no custom config overrides)
- [x] Inner pill container classes are separate from outer wrapper classes
- [x] No auth-gated actions in this spec
- [x] Design system values are verified from codebase + design-system.md
- [x] No [UNVERIFIED] values in this plan

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tailwind class vs inline style for backdrop-filter | Tailwind `backdrop-blur-md` | Tailwind generates both `-webkit-backdrop-filter` and `backdrop-filter` automatically. Cleaner than inline styles. Consistent with existing codebase pattern. |
| Inactive tab contrast (text-white/50) | Keep as-is, verify visually | Spec says to bump to `text-white/70` only if WCAG AA fails. Against a blurred glow (not a solid bg), contrast may vary. Visual verification needed. |
| Tab bar appearance when scrolled past glow area | Acceptable — `backdrop-blur-md` will frost the page content behind | When scrolled far down, the tab bar sits over dark content with no glow. The `bg-white/[0.06]` inner pill provides enough visual presence. The scrolled shadow adds separation. |

---

## Implementation Steps

### Step 1: Remove background and reduce blur on tab bar wrapper

**Objective:** Make the outer tab bar wrapper transparent so the hero glow orb bleeds through, and reduce backdrop-filter blur from 16px to 12px.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — line 269

**Details:**

Change line 269 from:

```tsx
'sticky top-0 z-40 bg-hero-bg/85 backdrop-blur-lg transition-shadow',
```

to:

```tsx
'sticky top-0 z-40 backdrop-blur-md transition-shadow',
```

This removes `bg-hero-bg/85` (rgba(8, 5, 26, 0.85) background) and changes `backdrop-blur-lg` (16px) to `backdrop-blur-md` (12px).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI layout impact. The class change applies identically at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT change the inner pill container's classes (`bg-white/[0.06] border border-white/[0.12] rounded-full p-1`)
- DO NOT change any tab button classes (active or inactive)
- DO NOT change the sticky behavior (`sticky top-0 z-40`)
- DO NOT change the conditional shadow (`shadow-md shadow-black/20`)
- DO NOT change the `transition-shadow` class
- DO NOT add inline styles — use Tailwind classes only
- DO NOT change the inner wrapper padding/max-width (`mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tab bar outer wrapper has no background class | unit | Verify `tablist.parentElement.parentElement` does NOT contain `bg-hero-bg` |
| Tab bar outer wrapper uses backdrop-blur-md | unit | Verify outer wrapper class contains `backdrop-blur-md` and NOT `backdrop-blur-lg` |
| Inner pill container unchanged | unit | Verify tablist still has `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-full` (existing tests cover this — lines 360-365) |
| Sticky behavior preserved | unit | Verify outer wrapper has `sticky`, `top-0`, `z-40` classes |

**Expected state after completion:**
- [ ] `bg-hero-bg/85` removed from tab bar outer wrapper
- [ ] `backdrop-blur-lg` replaced with `backdrop-blur-md`
- [ ] All other classes on the outer wrapper preserved
- [ ] All inner pill + tab button classes unchanged
- [ ] Build passes with no errors

---

### Step 2: Add tests for transparent tab bar wrapper

**Objective:** Add unit tests verifying the outer tab bar wrapper's transparent background and reduced blur. Ensure existing inner pill tests still pass.

**Files to modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — add tests after the existing "tab bar has pill-shaped container" test (around line 365)

**Details:**

Add 2 new tests after the existing tab bar tests:

```typescript
it('tab bar outer wrapper has no background color (transparent for glow bleed-through)', () => {
  renderPage()
  const tablist = screen.getByRole('tablist')
  // Outer wrapper is tablist → parent (inner padding div) → parent (sticky div)
  const outerWrapper = tablist.parentElement!.parentElement!
  expect(outerWrapper.className).not.toContain('bg-hero-bg')
  expect(outerWrapper.className).toContain('backdrop-blur-md')
})

it('tab bar outer wrapper uses reduced blur (md not lg)', () => {
  renderPage()
  const tablist = screen.getByRole('tablist')
  const outerWrapper = tablist.parentElement!.parentElement!
  expect(outerWrapper.className).toContain('backdrop-blur-md')
  expect(outerWrapper.className).not.toContain('backdrop-blur-lg')
})
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing tests — only add new ones
- DO NOT change the `renderPage()` helper or mock setup
- DO NOT test inline style properties (the implementation uses Tailwind classes, not inline styles)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Run full DailyHub test suite | integration | All existing 25+ tests pass with no regressions |
| New transparent wrapper test passes | unit | Outer wrapper has no `bg-hero-bg`, has `backdrop-blur-md` |
| New reduced blur test passes | unit | Outer wrapper has `backdrop-blur-md`, not `backdrop-blur-lg` |

**Expected state after completion:**
- [ ] 2 new tests added
- [ ] All existing DailyHub tests pass (no regressions)
- [ ] New tests pass
- [ ] Full test suite passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove background and reduce blur on tab bar wrapper |
| 2 | 1 | Add tests for transparent tab bar wrapper |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove background and reduce blur | [COMPLETE] | 2026-04-06 | `frontend/src/pages/DailyHub.tsx` line 269: removed `bg-hero-bg/85`, changed `backdrop-blur-lg` → `backdrop-blur-md`. Build issue (workbox-window) is pre-existing, unrelated. |
| 2 | Add tests for transparent wrapper | [COMPLETE] | 2026-04-06 | Added 2 tests to `DailyHub.test.tsx` after line 380. All DailyHub tests pass. Pre-existing `useNotifications` timestamp flake unrelated. |
