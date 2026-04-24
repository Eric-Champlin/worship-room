# BB-50: Bible Polish Round 2 — Layout, Reader UX, Devotional Fix

**Master Plan Reference:** N/A — standalone polish spec following BB-47 (scroll-to-top, copy/color fixes) and BB-48 (layout/nav fixes).

**Status:** Draft
**Date:** 2026-04-17
**Branch:** `claude/feature/bible-polish-round-2` (off `main`)
**Depends on:** BB-47 (scroll-to-top, copy/color fixes), BB-48 (layout/nav fixes) — both merged to main
**Depended on by:** None

---

## Overview

Second round of manual exploration fixes for the Bible section. Covers a persistent full-width layout bug on the Bible browser, BibleReader chrome improvements to reduce confusion for new users while preserving the immersive reading experience, a devotional rotation bug that limits variety, a navbar order swap, duplicate navigation removal, animation fixes, and My Bible visual cleanup. These fixes collectively make the Bible section feel finished and intentionally designed — critical for users building a reading habit in a sanctuary that should feel trustworthy and calm.

## User Story

As a **logged-out or logged-in visitor**, I want the Bible browser to render edge-to-edge without gray gutters, the BibleReader to provide clear navigation affordances, and the devotional to rotate through all 50 entries so that **the Bible section feels polished and intentionally designed — reinforcing the sanctuary immersion** before I commit to a daily reading habit.

## Requirements

### Functional Requirements

#### 1. NavBar Order Swap

Swap "Prayer Wall" and "Music" in the desktop navbar, mobile drawer, and any navigation configuration.

**New order:** Daily Hub, Study Bible, Grow, Music, Prayer Wall, Local Support.

Update `.claude/rules/10-ux-flows.md` navigation structure diagrams to reflect the new order.

#### 2. Bible Browser Full-Width Layout Fix (PERSISTENT BUG)

**Problem:** The Bible browser page (`/bible`) renders as a constrained-width dark box floating on a light gray background. At desktop width (~1440px), visible `#F5F5F5` gray gutters appear on both sides. This has been attempted and failed before — previous attempts likely adjusted the inner container's `max-w-*` class without addressing the page-level background.

**Root cause is two layers:**
1. **Page-level background:** The BibleBrowser page (or its parent layout wrapper) has a light/neutral background instead of `bg-hero-bg`.
2. **Content container constraint:** A `max-w-*` class prevents the dark content area from stretching edge-to-edge.

**Required recon before implementation:**
1. Trace the BibleBrowser DOM tree from outermost wrapper to content — list every element and its width-related classes (`max-w-*`, `w-*`, `mx-auto`, padding).
2. Check the parent layout wrapper (likely `Layout.tsx` or `App.tsx`). Does it apply a background or max-width?
3. Compare to a page that IS edge-to-edge (e.g., the landing page). What's different?
4. Check for a `<main>` or `<div>` wrapper between the Navbar and page content that applies the light background.

**Fix pattern (same as landing page):**
```
<div className="min-h-screen bg-hero-bg">           <!-- full-width dark bg -->
  <div className="max-w-6xl mx-auto px-4">          <!-- content constraint -->
    {/* Bible browser content */}
  </div>
</div>
```

The background must be edge-to-edge dark at all breakpoints. The content inside can keep a reasonable max-width for readability.

#### 3. Remove Duplicate Reading Plan Button

**Problem:** Two buttons navigate to reading plans: a large "Try a reading plan" pill and a smaller "Reading Plans" card in the three-card grid.

**Fix:** Remove the large "Try a reading plan" pill entirely. Keep the "Reading Plans" card in the three-card grid (Browse Books / My Bible / Reading Plans). One button, one destination.

#### 4. BibleReader Chrome Improvements

Four changes to reduce new-user confusion while keeping the immersive feel:

**4a — Back navigation affordance.**
Add a back arrow or "← Study Bible" link in the top-left corner of the ReaderChrome top toolbar. Navigates to `/bible`. Must be part of the toolbar that reappears on tap/scroll (or visible at all times).

**4b — Default focus mode to OFF.**
Change the default value of `wr_bible_focus_enabled` from `'true'` to `'false'`. New users see a static toolbar that doesn't fade. Existing users who already have the key set in localStorage are unaffected.

When focus mode is off, top and bottom toolbars remain visible at all times with full opacity. No fade, no timer.

**4c — Rename focus mode.**
In the typography/settings panel, rename "Focus mode" to "Auto-hide toolbar" with a subtitle: "Toolbar fades after a few seconds of reading." Update `aria-label` on any focus mode toggle button to "Toggle auto-hide toolbar".

**4d — Chapter selector dropdown indicator.**
The current chapter display (e.g., "John 3") in the top toolbar looks like a static label. Add a chevron-down icon after the chapter number: "John 3 ▾". This standard UI pattern signals the element is tappable and opens a menu. The chevron is decorative (`aria-hidden="true"`).

If there's a separate book icon that duplicates this function, consider removing one to reduce confusion.

#### 5. Browse Books Animation Fix

**Problem:** Clicking on a book in the Browse Books grid triggers a sliding animation that is visually glitched.

**Recon required:** Reproduce the animation, identify the glitch type (jank, overshoot, stutter, wrong direction, layout shift). Inspect whether it's:
- A CSS transition issue (missing `will-change`, incorrect transform origin, conflicting transitions)
- A React state issue (elements mounting/unmounting mid-animation instead of animating in/out)
- A BB-33 animation token issue (hardcoded values instead of canonical tokens from `constants/animation.ts`)

Fix the root cause. If it can't be fixed cleanly, replace with a simple instant transition — a clean instant transition is better than a broken animated one.

#### 6. My Bible Visual Cleanup

**6a — Chapter completion indicator colors.**
All chapter completion indicators in My Bible must use white with opacity tiers:
- No activity: `bg-white/10`
- Some chapters read: `bg-white/40`
- All chapters read: `bg-white` (solid white)

No purple, green, or any other color. White on dark is highest-contrast and matches the app's aesthetic.

**Recon:** Identify ALL components that render chapter completion indicators — the heatmap grid AND the Bible progress map may be separate components.

**6b — Remove confusing copy.**
Remove "Everything you've marked" heading text. Remove "Nothing yet" empty state text. If these sections need headings, use something simpler like "Activity" or let the data speak for itself.

#### 7. Daily Devotional Rotation Fix

**Problem:** The Daily Hub devotional tab shows only 3 devotionals rotating instead of the full 50 (30 general + 20 seasonal).

**Recon:** Examine the devotional selection logic. Likely causes:
- The selection function filters by liturgical season and only 3 match the current season
- The rotation index uses modulo against a small subset
- General devotionals aren't included when seasonal ones are available
- The data import pulls only a subset

**Fix:** Ensure all 50 devotionals participate in the rotation:
1. If there's a seasonal devotional for today's date → show it
2. If no seasonal match → rotate through the 30 general devotionals using day-of-year as the index

Verify by checking that 4+ different days produce 4+ different devotionals.

### Non-Functional Requirements

- **Bundle:** No new dependencies. Expected delta: negligible (CSS changes, string changes, one small link component for the back arrow).
- **Performance:** No measurable impact. Layout changes are CSS-only. Animation fix may improve performance if removing a glitchy animation.
- **Accessibility:** Back arrow needs `aria-label="Back to Study Bible"`. Chapter selector chevron is decorative (`aria-hidden="true"`). Auto-hide toolbar rename needs updated ARIA labels. All white text on dark backgrounds exceeds WCAG AA 4.5:1.
- **Animation tokens:** If the animation fix introduces new animation values, import from `frontend/src/constants/animation.ts` per BB-33 convention.
- **Reduced motion:** The global safety net in `frontend/src/styles/animations.css` handles all animation disabling site-wide.

## Auth Gating

No auth behavior changes. The Bible section remains unauthenticated per the Bible wave posture (see `.claude/rules/02-security.md` § "Bible Wave Auth Posture"). All changes are visual/UX — no new interactions are gated.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Browse Bible browser | Full access, edge-to-edge dark layout | Same | N/A |
| Navigate BibleReader with back arrow | Works — navigates to `/bible` | Same | N/A |
| Toggle auto-hide toolbar | Works — preference saved to localStorage | Same | N/A |
| Tap chapter selector | Works — opens chapter navigation | Same | N/A |
| View My Bible heatmap/progress | Works — reads from localStorage stores | Same | N/A |
| View Daily Hub devotional | Works — rotates through all 50 devotionals | Same | N/A |

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | Bible browser: dark background edge-to-edge (no gutters — mobile likely already works since max-width < viewport). Navbar order change reflected in mobile drawer. Back arrow in ReaderChrome top toolbar. Chapter selector chevron visible. |
| Tablet (640–1024px) | Same as desktop. Bible browser content centered within max-width, dark background fills viewport. |
| Desktop (> 1024px) | Bible browser: dark `bg-hero-bg` background extends from left viewport edge to right viewport edge. Content within `max-w-6xl mx-auto`. No gray gutters at any width including ultrawide. |

## AI Safety Considerations

N/A — this spec changes layout, navigation order, copy, colors, animation, and default preferences. It does not involve AI-generated content, free-text user input, or crisis-adjacent surfaces.

## Auth & Persistence

- **Logged-out users:** No persistence changes. `wr_bible_focus_enabled` default changes from `'true'` to `'false'` — only affects users who have never toggled focus mode (no existing localStorage key).
- **Logged-in users:** Same as logged-out.
- **localStorage usage:** No new keys. `wr_bible_focus_enabled` default value changes. No keys removed.
- **Route type:** All changes affect public routes.

## Completion & Navigation

N/A — standalone polish spec. No Daily Hub completion tracking touched. The devotional rotation fix affects which devotional is selected on a given day but does not change any completion signaling.

## Design Notes

- **Bible browser full-width pattern:** Follow the same edge-to-edge dark background approach used by the landing page (documented in `09-design-system.md` § "Round 3 Visual Patterns"). Background color `bg-hero-bg` (`#08051A`) on the full-width wrapper; content constraint on an inner `max-w-6xl mx-auto px-4` container.
- **Back arrow in ReaderChrome:** Should match the existing ReaderChrome toolbar icon styling — small, white, consistent with other toolbar icons. Use the same icon sizing and padding as adjacent toolbar buttons.
- **Chapter selector chevron:** Small `ChevronDown` icon (Lucide) inline with the chapter title text. Same color/opacity as the title text.
- **White completion indicators:** Use Tailwind `bg-white/10`, `bg-white/40`, `bg-white` with no color hue — pure white opacity tiers for maximum contrast on the dark My Bible background.
- **Animation tokens:** Any animation work must use canonical tokens from `constants/animation.ts`. The Browse Books animation fix should reference `duration.base` (300ms) and `easing.standard` or `easing.decelerate` if animation is preserved.
- **Design system recon:** `_plans/recon/design-system.md` exists and should be referenced during planning for exact CSS values.
- **NavBar order:** The `Navbar.tsx` and `MobileDrawer` components (or their shared nav config data) define the navigation item order. The swap is: Music moves to position 4, Prayer Wall moves to position 5 (1-indexed, after Daily Hub / Study Bible / Grow).

## Out of Scope

- Reworking the Bible browser page layout beyond the edge-to-edge background fix (no new sections, no new cards).
- Redesigning the Reading Plans section (only removing the duplicate button).
- Adding new meditation types or devotional content.
- Changing the BibleReader's immersive design philosophy — the improvements are additive (back arrow, clearer labels) not subtractive.
- Backend / Phase 3 work.
- Real AI devotional generation — the rotation fix uses the existing 50 hardcoded devotionals.
- Deleting the `FirstRunWelcome` component (already handled in BB-47).
- Light mode or alternative theme work (Phase 4).

## Acceptance Criteria

- [ ] NavBar order is: Daily Hub, Study Bible, Grow, Music, Prayer Wall, Local Support — in desktop navbar, mobile drawer, and any navigation configuration.
- [ ] `.claude/rules/10-ux-flows.md` navigation structure diagrams reflect the new order.
- [ ] Bible browser page (`/bible`) has dark `bg-hero-bg` background edge-to-edge at 1440px desktop width — no light gray gutters visible.
- [ ] Bible browser page looks correct on mobile 375px — no regression from current mobile behavior.
- [ ] The large "Try a reading plan" pill is removed from the Bible browser. Only the "Reading Plans" card in the three-card grid remains.
- [ ] BibleReader has a visible back arrow/link in the top toolbar that navigates to `/bible` with `aria-label="Back to Study Bible"`.
- [ ] Focus mode defaults to OFF for new users (`wr_bible_focus_enabled` absent from localStorage → toolbar stays visible, no auto-fade).
- [ ] Existing users who previously set `wr_bible_focus_enabled` to `'true'` are unaffected — their toolbar still auto-hides.
- [ ] Typography/settings panel shows "Auto-hide toolbar" with subtitle "Toolbar fades after a few seconds of reading" instead of "Focus mode."
- [ ] Any focus mode toggle button has `aria-label="Toggle auto-hide toolbar"`.
- [ ] Chapter selector in the top toolbar shows the book and chapter with a chevron-down indicator (e.g., "John 3 ▾") signaling it's tappable.
- [ ] The chevron icon has `aria-hidden="true"`.
- [ ] Browse Books animation is smooth OR replaced with an instant transition — no visual glitch when clicking a book.
- [ ] All chapter completion indicators in My Bible (heatmap AND progress map) use white opacity tiers: `bg-white/10` (none), `bg-white/40` (some), `bg-white` (all) — no purple or other colors.
- [ ] "Everything you've marked" heading text is absent from the My Bible page.
- [ ] "Nothing yet" empty state text is absent from the My Bible page.
- [ ] Daily devotional rotation shows more than 3 different devotionals across 5+ consecutive days (verified via unit test or manual check with mocked dates).
- [ ] All 30 general devotionals participate in the rotation when no seasonal match exists.
- [ ] Seasonal devotionals take priority when their date/season matches.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- [ ] All existing tests pass (with updates for changed defaults, removed elements, and renamed labels).
