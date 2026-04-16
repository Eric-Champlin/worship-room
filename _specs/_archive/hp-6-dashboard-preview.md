# HP-6: Homepage Dashboard Preview Elevation

**Master Plan Reference:** N/A — standalone homepage redesign section (part of `homepage-redesign` branch series HP-1 through HP-7)

**Branch Strategy:** Continue on `homepage-redesign` branch. Do NOT create a new branch.

---

## Overview

The Dashboard Preview section is a conversion-focused homepage section that shows logged-out visitors what they'll unlock by creating a free account. It replaces the existing `GrowthTeasersSection` (3 blurred preview cards) with a richer 6-card locked preview of the full dashboard experience, giving visitors a compelling window into the personal growth tools waiting for them.

This section serves the mission by revealing the depth of care built into the platform — mood tracking, streaks, a growth garden, daily practices, community, and evening wind-down — presented as a beautiful, locked preview that motivates visitors to take the next step.

## User Story

As a **logged-out visitor**, I want to **see a preview of what the logged-in dashboard experience looks like** so that **I understand the depth of personal growth tools available and feel motivated to create a free account**.

## Requirements

### Functional Requirements

1. Section replaces the existing `GrowthTeasersSection` with a new `DashboardPreview` section in the same position on the homepage
2. Section displays 6 preview cards in a responsive grid showing locked dashboard features:
   - **Mood Insights** — simplified mood heatmap (5 rows x 7 columns)
   - **Streak & Faith Points** — streak counter, progress bar, level indicator
   - **Growth Garden** — simplified garden SVG illustration
   - **Today's Practices** — activity checklist (2 completed, 3 incomplete)
   - **Friends** — 3 friend rows with avatars and streak indicators
   - **Evening Reflection** — 4-step progress indicator
3. Each card has a visible header (icon + title) that is NOT covered by the lock overlay
4. Each card's preview content area is covered by a subtle frosted lock overlay — content visible but clearly locked
5. Lock overlay shows a lock icon and "Create account to unlock" text
6. Section heading: "See What's Waiting for You" with tagline: "Your personal dashboard — mood tracking, growth insights, and a garden that grows with your faith."
7. Bottom CTA: "All of this is free. All of it is yours." text + "Get Started" button that opens the auth modal
8. Mood heatmap uses deterministic (seed-based) color values — no `Math.random()` — so it renders identically on every page load
9. The existing `GrowthTeasersSection.tsx` is deleted and all references to it are removed

### Non-Functional Requirements

- **Performance:** No new external dependencies. All preview content is static/hardcoded. Garden SVG kept simple (20-30 lines max)
- **Accessibility:** Lock overlay includes accessible text. Section heading uses proper heading hierarchy. Cards are non-interactive (no `onClick` handlers, no focus traps needed). CTA button is keyboard-accessible with visible focus indicator
- **Animation:** Scroll reveal with staggered card appearance. All animations respect `prefers-reduced-motion`

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View section | Fully visible — this section only appears on the logged-out homepage | N/A — logged-in users see the Dashboard instead of the homepage | N/A |
| Click "Get Started" CTA | Opens auth modal | N/A | Standard auth modal (login/register) |

Note: The preview cards themselves are NOT interactive — they are display-only mockups. No card clicks trigger any behavior.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column (`grid-cols-1`), `gap-5`. CTA button full-width. |
| Tablet (640px-1024px) | 2-column grid (`grid-cols-2`), `gap-6`. 3 rows of 2 cards. |
| Desktop (> 1024px) | 3-column grid (`grid-cols-3`), `gap-6`. 2 rows of 3 cards. |

- Card heights use `min-h-[140px] sm:min-h-[160px]` for uniform sizing
- Garden SVG scales gracefully within its card at all widths
- Mood heatmap circles scale: `w-3 h-3` on mobile, `w-4 h-4` on `sm`+
- Evening Reflection 4-step progress indicator stays horizontal at all breakpoints
- Lock overlay covers preview content area on all cards at all breakpoints

## AI Safety Considerations

N/A — This section does not involve AI-generated content or free-text user input. No crisis detection required. All content is static/hardcoded preview mockups.

## Auth & Persistence

- **Logged-out users:** This section is only visible to logged-out visitors (the homepage renders for unauthenticated users; authenticated users see the Dashboard). Zero persistence — purely display.
- **Logged-in users:** Never see this section. They see the real Dashboard at `/`.
- **localStorage usage:** None.

## Card Preview Content Specifications

### Card 1: Mood Insights
- Icon: `BarChart3` (Lucide)
- Title: "Mood Insights"
- Content: 5x7 grid of colored squares (contribution graph style)
- Colors (deterministic): empty (`bg-white/[0.04]`), low (`bg-purple-900/40`), medium (`bg-purple-600/40`), high (`bg-purple-400/50`), peak (`bg-purple-300/60`)
- Label below: "Last 35 days"

### Card 2: Streak & Faith Points
- Icon: `Flame` (Lucide)
- Title: "Streak & Faith Points"
- Content: Large "14" with flame icon, "day streak" label, progress bar at ~65%, "Level 3 · 1,240 pts"

### Card 3: Growth Garden
- Icon: `Sprout` (Lucide)
- Title: "Growth Garden"
- Content: Simplified inline SVG — ground curve, stem with 4-5 leaves, small sun, optional butterfly. Simple enough to be a teaser (NOT the real 765-line `GrowthGarden` component)

### Card 4: Today's Practices
- Icon: `CheckSquare` (Lucide)
- Title: "Today's Practices"
- Content: 5 activity rows — Mood Check-in (completed), Devotional (completed), Prayer (not done), Journal (not done), Meditation (not done). Summary: "2 of 5 complete"

### Card 5: Friends
- Icon: `Users` (Lucide)
- Title: "Friends"
- Content: 3 friend rows — Sarah M. (purple avatar), David K. (green avatar), Maria L. (amber avatar). Each with streak indicator. Summary: "3 friends praying with you"

### Card 6: Evening Reflection
- Icon: `Moon` (Lucide)
- Title: "Evening Reflection"
- Content: Horizontal 4-step progress — "Mood" (filled) → "Highlights" (filled) → "Gratitude" (empty) → "Prayer" (empty). Summary: "Wind down your day with intention"

## Design Notes

- Uses existing `GlowBackground` component (from HP-1) with `variant="center"` for atmospheric lighting
- Uses existing `SectionHeading` component (from HP-1) with center alignment
- Uses existing `FrostedCard` component (from HP-1) for card containers — non-interactive (no `onClick`)
- Lock overlay uses subtle blur (`backdrop-blur-[3px]`) — content should be *visible but clearly locked*, not hidden. This is intentional as a conversion technique
- Card header (icon + title) stays above and outside the lock overlay — always readable
- Section uses the dark homepage aesthetic consistent with the other redesigned sections (HP-1 through HP-5)
- Container: `max-w-6xl mx-auto px-4 sm:px-6`
- Section vertical spacing: `py-20 sm:py-28`
- CTA button style: white pill button (same pattern as other homepage CTAs)
- Color palette for previews uses `white/` opacity variants and `purple-` / `emerald-` / `amber-` tones — keeping the dark theme aesthetic
- Design system recon (`_plans/recon/design-system.md`) has the existing homepage patterns to match

## Scroll Reveal

1. Section heading: reveal on scroll enter
2. Cards: staggered reveal (100ms between cards, starting 200ms after heading)
3. CTA: fade in 300ms after last card
4. All animations respect `prefers-reduced-motion` (instant visibility, no motion)

## Cleanup

- Delete `GrowthTeasersSection.tsx` (currently 242 lines in `src/components/`)
- Remove its import from `Home.tsx`
- Update or remove any tests that reference `GrowthTeasersSection`
- Verify no other files import `GrowthTeasersSection` before deleting

## Out of Scope

- Real data in preview cards (all content is static mockups)
- Interactive card behavior (cards are display-only, not clickable)
- Logged-in state handling for this section (logged-in users see Dashboard, not homepage)
- The real `GrowthGarden` SVG component (765 lines) — the preview is a simplified teaser
- Backend API integration (Phase 3)
- Light mode styling (Phase 4)

## Acceptance Criteria

- [ ] `GrowthTeasersSection.tsx` file is deleted from the codebase
- [ ] `Home.tsx` no longer imports `GrowthTeasersSection`
- [ ] `DashboardPreview` renders in the same position as the former `GrowthTeasersSection` in `Home.tsx`
- [ ] 6 preview cards display in responsive grid: 3 columns on desktop (>1024px), 2 columns on tablet (640-1024px), 1 column on mobile (<640px)
- [ ] Each card displays the correct Lucide icon and title in its header row
- [ ] Card headers (icon + title) are NOT covered by the frosted lock overlay
- [ ] Frosted lock overlay sits over preview content area with subtle blur — preview content is visible but clearly locked
- [ ] Lock overlay shows Lock icon and "Create account to unlock" text
- [ ] Mood Insights card shows a 5x7 grid of colored squares using deterministic (non-random) values
- [ ] Streak card shows "14" with flame, "day streak", progress bar, and "Level 3 · 1,240 pts"
- [ ] Growth Garden card renders a simplified inline SVG that scales correctly at all viewport widths
- [ ] Activity Checklist card shows 2 completed (Mood Check-in, Devotional) and 3 incomplete items (Prayer, Journal, Meditation) with "2 of 5 complete"
- [ ] Friends card shows 3 rows (Sarah M., David K., Maria L.) with colored avatars and streak indicators
- [ ] Evening Reflection card shows a horizontal 4-step progress indicator (2 filled, 2 empty)
- [ ] Section heading reads "See What's Waiting for You" with tagline below
- [ ] `GlowBackground` with `variant="center"` provides atmospheric lighting behind the section
- [ ] Bottom CTA displays "All of this is free. All of it is yours." text with "Get Started" button
- [ ] "Get Started" button opens the auth modal on click (via `useAuthModal()`)
- [ ] CTA button is full-width on mobile, auto-width on tablet/desktop
- [ ] Scroll reveal triggers with staggered card appearance (100ms between cards)
- [ ] All animations respect `prefers-reduced-motion` (content visible immediately, no motion)
- [ ] No new external dependencies added
- [ ] All new components have passing tests
- [ ] Build passes with 0 errors and 0 TypeScript strict-mode violations
- [ ] All existing tests still pass (any tests referencing `GrowthTeasersSection` are updated or removed)
- [ ] Committed on `homepage-redesign` branch
