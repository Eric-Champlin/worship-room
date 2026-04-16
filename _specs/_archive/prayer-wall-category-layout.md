# Feature: Prayer Wall Category Layout + Mental Health Category

**Master Plan Reference:** N/A — standalone enhancement to existing Prayer Wall category system

---

## Overview

The Prayer Wall is where hurting people go to feel seen and supported. But right now, someone struggling with anxiety or depression has to file their prayer under "Health" (which reads as physical) or the catch-all "Other" — neither feels right for the most vulnerable users. Adding a dedicated "Mental Health" category says "this community sees you, and this pain belongs here."

Separately, the category filter pills currently wrap to two rows on desktop, creating visual clutter below the hero. With 12 categories (including the new one), the layout needs to be a clean, single-row horizontal strip across all breakpoints — scrollable on smaller screens, fitted on wide desktops.

## User Stories

As a **logged-out visitor or logged-in user**, I want to filter prayers by "Mental Health" so that I can find and offer support for people struggling with anxiety, depression, and burnout.

As a **logged-in user**, I want to tag my prayer request as "Mental Health" so that others who understand emotional struggles can find it and pray with empathy.

As a **logged-out visitor or logged-in user**, I want the category filter pills to fit cleanly in a single row so that I can scan all options without visual clutter.

## Requirements

### 1. Add "Mental Health" Category

- New category value: `mental-health` (slug), label: "Mental Health"
- Position in category order: after "Health", before "Family"
- Full category order after addition:
  1. All
  2. Pray40 Prayers (only visible during active Lent challenge — existing conditional behavior)
  3. Health
  4. **Mental Health** (NEW)
  5. Family
  6. Work
  7. Grief
  8. Gratitude
  9. Praise
  10. Relationships
  11. Other
  12. Discussion
- Add `mental-health` to the category type union (wherever the existing 8+ categories are defined)
- Add "Mental Health" as an option in the InlineComposer category selector
- Add "Mental Health" as an option in the PrayerComposer (My Prayers page) category selector, if it has its own selector
- Do NOT add a category icon unless the existing categories already use icons (they do not — pill text only)

### 2. Mock Data

Add 3 mock prayer requests with `category: 'mental-health'`:

- "Struggling with anxiety that won't let go. Please pray for peace in my mind."
- "Going through depression and finding it hard to get out of bed. Prayers for strength and hope."
- "Burnout from work and life is overwhelming. Please pray for rest and clarity."

These should follow the same mock data structure as existing prayers (user, timestamp, reactions, etc.).

### 3. Single-Row Category Layout

**Desktop (1024px+):**
- All 12 category pills fit in a single horizontal row without wrapping
- Achieve via tighter padding (`px-3 py-1.5` instead of `px-4 py-2`), smaller font (`text-sm`), and tighter gap (`gap-2`)
- At 1440px+: all pills definitely fit with no scroll
- At 1024px: pills fit in one row or, if barely too wide, horizontal scroll kicks in gracefully
- `flex-nowrap` to prevent wrapping at any desktop width

**Tablet (768-1023px):**
- Horizontal scroll: `flex-nowrap overflow-x-auto`
- Scrollbar hidden: `scrollbar-width: none` / `::-webkit-scrollbar { display: none }`
- Smooth scroll behavior
- Right-edge fade gradient to signal "scroll for more" (only when content overflows)

**Mobile (< 768px):**
- Same horizontal scroll behavior as tablet
- Same fade gradient scroll indicator
- All pills maintain 44px minimum height for touch targets (even with tighter padding)

### 4. Scroll Fade Gradient

A CSS mask on the right edge signals more content is available:
- Mask: `linear-gradient(to right, black calc(100% - 40px), transparent)` with `-webkit-` prefix
- Only show the mask when the pill row actually overflows (content wider than container)
- Remove the mask when the user scrolls to the end (the last pill is fully visible)
- On desktop at wide viewports where all pills fit, no mask is needed

### 5. Active Pill Styling

The active filter pill must be clearly distinguishable in both single-row and scroll layouts:
- **Active**: primary-tinted background with primary border — matches the existing selected pill pattern from the original category filter implementation
- **Inactive**: translucent dark background, muted text, subtle border — matches the existing unselected pill pattern
- "All" is the default and is always the first pill (never scrolled off-screen on initial load)

### 6. Filter Functionality

No changes to the existing filter logic — adding `mental-health` to the category constants and mock data should make filtering "just work":
- Tapping "Mental Health" pill shows only `mental-health`-tagged prayers
- Tapping "All" shows all prayers including mental health
- URL-based filter state continues to work: `?category=mental-health`

## Acceptance Criteria

- [ ] "Mental Health" category appears in the filter pills between "Health" and "Family"
- [ ] "Mental Health" category appears in the InlineComposer category selector
- [ ] "Mental Health" category appears in the PrayerComposer (My Prayers) category selector
- [ ] 3 mock prayer requests exist with `mental-health` category, with realistic prayer text about anxiety, depression, and burnout
- [ ] Filtering by "Mental Health" shows only mental-health-tagged prayers
- [ ] "All" filter shows all prayers including mental health ones
- [ ] Visiting `/prayer-wall?category=mental-health` pre-selects the Mental Health filter
- [ ] Desktop (1440px): all 12 category pills fit in a single row, no horizontal scroll needed
- [ ] Desktop (1024px): pills fit in one row or scroll gracefully with no wrapping
- [ ] Tablet (768-1023px): pills are in a horizontal scroll with right-edge fade gradient
- [ ] Mobile (375px): pills are in a horizontal scroll with right-edge fade gradient, each pill meets 44px min-height
- [ ] Scrollbar is visually hidden on the category pill row
- [ ] Right-edge fade gradient only appears when content overflows, disappears when scrolled to end
- [ ] Active pill is clearly distinguished from inactive pills (primary accent vs translucent)
- [ ] "All" pill is always visible without scrolling (first in the row)
- [ ] Prayer Wall hero title remains fully visible (not cut off by layout changes)
- [ ] All existing Prayer Wall functionality works: posting, commenting, praying, bookmarking, sharing, reporting, QOTD
- [ ] Category count badges (if currently shown on pills) update correctly with the new category
- [ ] New prayer can be created and tagged as "Mental Health" via the composer
- [ ] Keyboard users can navigate filter pills with Tab and activate with Enter/Space
- [ ] Screen readers announce filter pill selection changes

## UX & Design Notes

- **Tone**: The "Mental Health" category normalizes emotional pain as a valid prayer topic. The label is clinical enough to be clear, warm enough to not feel sterile.
- **Pill styling**: Match the existing pill patterns from the original category filter implementation — translucent unselected, primary-accented selected. Reference the design system recon for exact values:
  - Unselected: `bg-white/10 border border-white/15 text-white/70 rounded-full`
  - Selected: `bg-primary/20 border-primary/40 text-primary-lt rounded-full`
- **Layout density**: Tighter desktop pills (`px-3 py-1.5 text-sm gap-2`) are a design tradeoff — slightly smaller to avoid wrapping with 12 items. The pills should still be comfortable to click with a mouse.
- **Scroll indicator**: The right-edge fade gradient is a subtle, well-understood UX pattern for signaling horizontal overflow. It should feel natural, not like a UI artifact.
- **Content width**: Category pill row should be constrained to the Prayer Wall max-width (720px / `max-w-3xl`) to stay aligned with the prayer card feed below.

### Design System References

- **Inner Page Hero Pattern**: from design system recon — the pills sit below this gradient
- **Pill selected/unselected styles**: from original category filter spec (see Auth & Persistence section of `_specs/prayer-wall-category-filter.md`)
- **Prayer Wall max-width**: 720px (`max-w-3xl`) from design system recon
- **Touch target minimum**: 44px from accessibility rules

### New Visual Patterns

1. **Horizontal scroll with fade gradient** on category pills — the original spec had flex-wrap on desktop. This changes to flex-nowrap + overflow-x-auto everywhere, with the fade gradient as the overflow indicator. This is a new pattern variant.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or new free-text user input. Category selection uses predefined pill buttons. The existing inline composer already has crisis detection. The "Mental Health" category label itself does not require crisis intervention — it's a category name, not user-generated content.

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Can browse the full feed, use all filter pills (including Mental Health), click category badges
  - Cannot open the composer (existing auth gate) — so cannot tag a prayer as Mental Health
  - Filter state is URL-only (`?category=mental-health`) — zero data persistence
- **Logged-in**:
  - Full access: filtering + composing prayers with Mental Health as a category option
  - Category stored on the prayer object (mock data now, `prayer_requests` table in Phase 3)
- **Route type**: `/prayer-wall` remains Public
- **localStorage**: No new keys — filter state is URL-based

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Filter by Mental Health | Works — shows filtered feed | Works — shows filtered feed | N/A |
| View Mental Health prayers | Works | Works | N/A |
| Compose prayer tagged Mental Health | Auth modal on composer open | Can select Mental Health and submit | "Sign in to share a prayer request" |
| Click category badge on card | Filters feed (no auth needed) | Filters feed | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Horizontal scroll, fade gradient on right, 44px min-height pills, hidden scrollbar |
| Tablet (768-1023px) | Horizontal scroll, fade gradient on right, hidden scrollbar |
| Desktop (1024-1439px) | Single row, flex-nowrap, may scroll slightly at exactly 1024px |
| Desktop (1440px+) | Single row, all pills visible, no scroll needed, no fade gradient |

Pills never wrap to a second line at any breakpoint. The shift from flex-wrap (original spec) to flex-nowrap + overflow-x-auto is the core layout change.

## Completion & Navigation

N/A — standalone feature, not part of Daily Hub.

## Out of Scope

- Prayer Wall hero redesign (hero font standardization is a separate spec)
- Prayer Wall content width changes (addressed in a separate spec)
- Prayer Wall card redesign or interaction changes
- QOTD changes
- Category icons (categories don't use icons — text-only pills)
- Backend category validation (Phase 3)
- Reordering or removing existing categories
- Sticky filter bar behavior changes (existing behavior preserved)
- Multi-select categories
- Category editing after posting
