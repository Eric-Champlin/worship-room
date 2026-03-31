# Fix: Seasonal Banner Placement (Spec 10 Regression)

**Master Plan Reference:** N/A — standalone bugfix

---

## Overview

The Seasonal Banner (implemented in Spec 10 — Liturgical Calendar) provides time-of-year awareness by displaying the current liturgical season with a link to the daily devotional. It reinforces the app's rhythm of seasonal spiritual engagement. Currently, the banner only appears on the Bible page instead of site-wide, and when manually placed elsewhere it renders behind the navbar. This fix moves it to the shared Layout component so every page receives it automatically.

## User Story

As a **logged-in user**, I want to see the seasonal banner on every page so that I'm always aware of the current liturgical season and can quickly access the devotional.

As a **logged-out visitor** on an inner page, I want to see the seasonal banner so that I experience the seasonal rhythm of the app even before signing in.

## Problem

1. The `SeasonalBanner` component is rendered inside a specific page component (likely BibleBrowser or a Bible-related route) instead of the shared `Layout.tsx` wrapper.
2. When placed manually on other pages, the banner renders behind/under the fixed/sticky navbar because it doesn't account for the navbar's positioning offset.

## Requirements

### Functional Requirements

1. `SeasonalBanner` must be rendered exactly once, inside `Layout.tsx`, so it appears on every page that uses the Layout wrapper.
2. All existing renders of `SeasonalBanner` in page components, route definitions, or Navbar must be removed.
3. The banner must render visually below the navbar and above the page content, in normal document flow (not fixed/sticky/absolute).
4. The banner must NOT appear on the landing page (logged-out `/`) — the transparent navbar overlays the cinematic hero, and a banner would break that effect.
5. The banner MUST appear on the dashboard (logged-in `/`) — the dashboard uses a normal (non-transparent) navbar.
6. The banner scrolls with the page (not pinned).
7. Dismissing the banner removes it with no empty gap — page content shifts up.
8. The banner's existing dismissal logic and localStorage persistence remain unchanged.

### Non-Functional Requirements

- **Performance:** No layout shift or jump when the banner renders on page load.
- **Accessibility:** Dismiss button must remain keyboard-accessible and have appropriate `aria-label`. Banner text must meet WCAG AA contrast on the glassmorphic background.

## Investigation Steps (MUST complete before writing code)

1. **Find all current render locations.** Search the entire codebase for every file that imports or renders `<SeasonalBanner` or `SeasonalBanner`. List every file. It should ONLY be in `Layout.tsx` after the fix.

2. **Read Layout.tsx end to end.** Understand the full JSX structure: `<Navbar />`, `<main>`, `<SiteFooter />`, wrappers, spacer divs. Determine:
   - Does Navbar receive a `transparent` prop? When is it true vs false?
   - How does the main content area push below the navbar? (`pt-*`, `mt-*`, spacer div, CSS variable)
   - Is there a wrapper div between Navbar and main?

3. **Read Navbar.tsx positioning.** Determine:
   - What CSS `position` does the navbar use? (`fixed`, `sticky`, `relative`, `absolute`)
   - Does it change based on the `transparent` prop?
   - What is the navbar height at each breakpoint?

4. **Check for overflow issues.** Search for `overflow-hidden` or `overflow: hidden` on any container between the navbar and the page content. These could clip the banner.

5. **Check SeasonalBanner's own CSS.** Verify it does NOT have `position: fixed`, `position: absolute`, `position: sticky`, or any `top`/`left`/`right` values. It should be a normal flow element.

6. **Find the dismiss localStorage key.** Identify the key name used to persist banner dismissal so it can be cleared during testing.

## Fix Implementation

### Step 1: Remove SeasonalBanner from wrong locations

Remove all `<SeasonalBanner />` renders and imports from:
- Any page component (BibleBrowser.tsx, DailyHub.tsx, PrayerWall.tsx, MusicPage.tsx, etc.)
- App.tsx route definitions
- Navbar.tsx (if placed inside the navbar)

After this step, SeasonalBanner should have zero render locations. Verify with a codebase search.

### Step 2: Add SeasonalBanner to Layout.tsx

Place it in the Layout component. The exact placement depends on investigation findings:

**Goal:** The banner renders visually below the navbar and above the page content, in normal document flow.

**Match the existing pattern** for how content sits below the navbar. The banner goes at the very top of that content area, before `{children}`.

### Step 3: Handle the landing page

Hide the banner when the navbar is in transparent mode (landing page). Use the same condition Layout already uses for the `transparent` prop:

```tsx
{!isTransparentNavbar && <SeasonalBanner />}
```

The dashboard (logged-in `/`) uses a normal navbar — the banner SHOULD appear there.

### Step 4: Verify SeasonalBanner CSS

After placement, confirm:
- `position` is `relative` (default) — not `fixed`, `absolute`, or `sticky`
- No `top`, `left`, `right`, `bottom` values
- `width: 100%` or `w-full`
- Glassmorphic styling preserved: `bg-white/[0.04] backdrop-blur-md border-b border-white/10`
- No `margin-top` creating a gap between navbar and banner

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View banner | Visible on all inner pages (not landing page) | Visible on all pages including dashboard | N/A |
| Dismiss banner | Dismisses, persists in localStorage | Dismisses, persists in localStorage | N/A |
| Click CTA link | Navigates to `/daily?tab=devotional` | Navigates to `/daily?tab=devotional` | N/A |

No auth gating required — the banner is purely informational.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Banner text may wrap to 2 lines. Dismiss X stays accessible (44px touch target). Full width. |
| Tablet (640-1024px) | Single line or wrapping depending on season text length. Full width. |
| Desktop (> 1024px) | Single line, full width, text and dismiss button on same row. |

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Banner visible on inner pages. Dismissal persists via existing localStorage key.
- **Logged-in users:** Banner visible on all pages. Dismissal persists via existing localStorage key.
- **localStorage usage:** Existing dismiss key (do not change). Clear this key during testing to verify banner appears.

## Design Notes

- Banner uses glassmorphic styling: `bg-white/[0.04] backdrop-blur-md border-b border-white/10` (existing — do not change)
- Text must meet WCAG AA contrast on the glassmorphic background (minimum `text-white/70` for primary text per design system)
- Reference the Layout component (`Layout.tsx`) and Navbar (`Navbar.tsx`) from the shared component inventory
- The banner is a normal-flow element — no z-index, no fixed/sticky positioning
- Reference `_plans/recon/design-system.md` for navbar positioning details if needed

## Out of Scope

- Banner content, copy, or seasonal messages (no changes)
- Banner dismissal logic or localStorage persistence (no changes)
- Banner glassmorphic styling (no changes unless needed for positioning)
- Navbar component functionality, positioning, or transparent prop logic (no changes)
- Any page component content or layout (no changes)
- The `useLiturgicalSeason` hook or any seasonal logic (no changes)
- SiteFooter position or styling (no changes)
- Making the banner sticky (it scrolls with the page)

## Acceptance Criteria

### Banner visibility

- [ ] Banner appears on Dashboard (logged in, `/`) — below navbar, above dashboard content
- [ ] Banner appears on Daily Hub (`/daily`) — below navbar, above hero/tabs
- [ ] Banner appears on Bible Browser (`/bible`) — below navbar, above content
- [ ] Banner appears on Bible Reader (`/bible/genesis/1`) — below navbar, above chapter content
- [ ] Banner appears on Grow (`/grow`) — below navbar, above tabs
- [ ] Banner appears on Prayer Wall (`/prayer-wall`) — below navbar, above hero
- [ ] Banner appears on Prayer Wall Detail (`/prayer-wall/[any-id]`) — below navbar
- [ ] Banner appears on Music (`/music`) — below navbar, above tabs
- [ ] Banner appears on Local Support Churches (`/local-support/churches`) — below navbar
- [ ] Banner appears on Local Support Counselors (`/local-support/counselors`) — below navbar
- [ ] Banner appears on Settings (`/settings`) — below navbar
- [ ] Banner appears on Friends (`/friends`) — below navbar
- [ ] Banner appears on Insights (`/insights`) — below navbar
- [ ] Banner appears on My Prayers (`/my-prayers`) — below navbar
- [ ] Banner appears on Ask (`/ask`) — below navbar
- [ ] Banner appears on meditation sub-pages (`/meditate/breathing`) — below navbar
- [ ] Banner appears on Reading Plan detail (`/reading-plans/[any-id]`) — below navbar
- [ ] Banner appears on Challenge detail (`/challenges/[any-id]`) — below navbar
- [ ] Banner appears on Growth Profile (`/profile/[any-id]`) — below navbar

### Banner hidden

- [ ] Banner is NOT visible on the landing page (logged out, `/`) — transparent navbar page

### Positioning and behavior

- [ ] Banner is fully visible (not hidden behind or under the navbar) on every page
- [ ] Banner is visually directly below the navbar (no gap, no overlap)
- [ ] Page content starts below the banner (not hidden behind it)
- [ ] Banner scrolls with the page when user scrolls (not sticky)
- [ ] Dismissing the banner removes it and page content shifts up with no empty gap
- [ ] Banner CTA link works ("Read today's devotional" navigates to `/daily?tab=devotional`)
- [ ] No layout shift or jump when the banner renders on page load

### Responsive

- [ ] 375px (mobile) — banner text may wrap to 2 lines, dismiss X stays accessible (44px touch target)
- [ ] 768px (tablet) — banner renders correctly below navbar
- [ ] 1440px (desktop) — banner is single line, full width

### Code quality

- [ ] `SeasonalBanner` is rendered in exactly one location: `Layout.tsx`
- [ ] Zero `SeasonalBanner` imports remain in any page component
- [ ] All existing tests pass
- [ ] No changes to banner content, dismissal logic, or styling beyond what's needed for positioning

## After Fixing

Run `/code-review` and then `/verify-with-playwright` on at least these 5 pages: Dashboard, Daily Hub, Bible, Prayer Wall, Music. Verify the banner appears on all of them and is correctly positioned below the navbar at all breakpoints.
