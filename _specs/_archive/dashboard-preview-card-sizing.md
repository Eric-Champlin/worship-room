# Dashboard Preview Card Sizing Fixes

**Master Plan Reference:** N/A — standalone bug fix on `homepage-redesign` branch.

**Branch Strategy:** Continue on `homepage-redesign` branch. Do NOT create a new branch.

---

## Overview

The "See What's Waiting for You" section on the landing page teases the logged-in dashboard experience with 6 locked preview cards. Currently these cards render at inconsistent heights and feel too compact — the preview mockups are cramped and the lock overlays crowd the content. Fixing this gives the section the visual room it needs to effectively sell the dashboard experience and draw visitors toward account creation.

## User Story

As a **logged-out visitor**, I want the dashboard preview cards to look polished and spacious so that I feel drawn to create an account and experience the full dashboard.

## Requirements

### Functional Requirements

1. **Uniform card height**: All 6 dashboard preview cards must render at the same height within each grid row. No card should be shorter than its siblings.
2. **Taller cards**: The preview content area (below the header, above the lock overlay) must use `min-h-[180px] sm:min-h-[220px]` (up from `min-h-[140px] sm:min-h-[160px]`).
3. **Grid equalization**: The grid container must use `auto-rows-fr` so all rows in the grid are equal height.
4. **Card fill behavior**: Each card must use `h-full flex flex-col` to fill its grid cell. The preview content area must use `flex-1` to absorb remaining space.
5. **Vertical centering**: Preview mockup content must be vertically centered within the preview area — sparse content (e.g., streak number) should not hug the top of a tall card.
6. **Header divider**: The header row (icon + title) must have a subtle bottom border (`border-b border-white/[0.06]`) separating it from the preview content area.
7. **Lock overlay scope**: The frosted lock overlay must cover only the preview content area, not the card header. Lock icon and text must be vertically centered within the overlay.
8. **Mobile height**: On mobile (< 640px, single column), cards use `min-h-[160px]`. On sm+, cards use `min-h-[220px]`.

### Non-Functional Requirements

- No content overflow or clipping in any card at any breakpoint
- Existing scroll-reveal animations must continue to work
- No changes to the existing `FrostedCard` component (changes are scoped to the card usage in `DashboardPreview.tsx`)

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View preview cards | Can view all 6 cards with lock overlays | N/A (logged-in users see the real dashboard at `/`) | N/A |
| Click "Get Started" CTA | Opens auth modal in register mode | N/A | N/A |

No auth gating changes — this is a visual-only fix.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 1-column grid, each card full-width, `min-h-[160px]` preview area |
| Tablet (640–1024px) | 2-column grid, `min-h-[220px]` preview area, `auto-rows-fr` equalizes rows |
| Desktop (> 1024px) | 3-column grid, `min-h-[220px]` preview area, `auto-rows-fr` equalizes rows |

Cards should be uniform height at every breakpoint. On mobile, each card is its own row (so height uniformity is per-card via `min-h`). On tablet/desktop, `auto-rows-fr` ensures cards in the same row match the tallest card.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view the preview cards (decorative only, no data)
- **Logged-in users:** Never see this section (they see the real dashboard)
- **localStorage usage:** None
- **Route type:** Public (landing page section)

## Completion & Navigation

N/A — standalone landing page section, not a Daily Hub feature.

## Design Notes

- Cards use the existing `FrostedCard` component with `p-0 overflow-hidden` override (already in place)
- Lock overlay uses `backdrop-blur-[3px] bg-[#08051A]/60` — do not change blur amount
- Header uses `text-white/50` icon + `text-white/70` title (existing, do not change)
- The preview content wrapper needs `flex flex-col justify-center items-center h-full` for centered mockups (Mood Insights, Streak, Garden, Evening Reflection)
- Left-aligned mockups (Activity Checklist, Friends) need `flex flex-col justify-center h-full` (no `items-center`)
- Header divider: `pb-3 mb-3 border-b border-white/[0.06]` creates visual separation between "what this card is" and "what it shows"

**Important implementation note:** There is no `DashboardPreviewCard.tsx` file — the card rendering is inline within `DashboardPreview.tsx`. All changes happen in `DashboardPreview.tsx` only.

## Out of Scope

- Changes to the `FrostedCard` component itself
- Changes to the preview sub-component mockups (MoodInsightsPreview, StreakPreview, etc.) — only their wrapper/container changes
- Changes to the `LockOverlay` component styling
- Any backend work
- Any new localStorage keys or data persistence

## Acceptance Criteria

- [ ] All 6 dashboard preview cards render at the same height in every grid row
- [ ] Cards are visibly taller than before: preview area uses `min-h-[180px] sm:min-h-[220px]` (was `min-h-[140px] sm:min-h-[160px]`)
- [ ] Grid container includes `auto-rows-fr` class to equalize row heights
- [ ] Each card's outer wrapper uses `h-full flex flex-col` to fill its grid cell
- [ ] Preview content area uses `flex-1` to fill available vertical space
- [ ] Preview mockup content is vertically centered within the taller cards (not hugging the top)
- [ ] Header row (icon + title) has a subtle bottom border: `border-b border-white/[0.06]`
- [ ] Lock overlay covers only the preview content area (not the header)
- [ ] Lock icon and "Create account to unlock" text are vertically centered within the overlay
- [ ] On mobile (< 640px), preview content area uses `min-h-[160px]`
- [ ] On tablet/desktop (sm+), preview content area uses `min-h-[220px]`
- [ ] No content overflow or clipping in any card at any breakpoint
- [ ] Mood heatmap grid has room to breathe (not cramped)
- [ ] Garden SVG is visible and not cut off
- [ ] Activity checklist shows all 5 rows without overflow
- [ ] Evening reflection 4-step indicator is centered
- [ ] Scroll-reveal animations still work correctly
- [ ] Build passes with 0 errors
- [ ] All existing tests pass
- [ ] Committed on `homepage-redesign` branch

## Files Modified

| Action | File |
|--------|------|
| MODIFY | `frontend/src/components/homepage/DashboardPreview.tsx` (grid classes, card layout, padding, centering) |
