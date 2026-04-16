# Feature: Dashboard Widget Prioritization

**Master Plan Reference:** N/A — standalone feature (builds on existing Dashboard from Phase 2.75)

---

## Overview

Returning users currently face 15+ dashboard widgets competing for attention. This feature introduces smart time-of-day ordering that surfaces the most relevant widgets based on when the user visits, conditional visibility that hides irrelevant widgets (e.g., reading plan progress when no plan is active), and a user customization panel that lets users hide or reorder widgets to make the dashboard feel personal rather than overwhelming. The goal is to transform the dashboard from a wall of information into a curated daily experience that meets the user where they are in their day — morning devotion, afternoon check-in, evening reflection, or nighttime rest.

---

## User Stories

As a **logged-in user visiting the dashboard in the morning**, I want to see devotional content and the Verse of the Day surfaced first so that I can start my day with spiritual nourishment before seeing activity tracking.

As a **logged-in user visiting in the evening**, I want the evening reflection banner and gratitude widget surfaced first so that the dashboard naturally guides me toward winding down and reflecting on my day.

As a **logged-in user who wants a personalized dashboard**, I want to hide widgets I don't use and reorder the ones I keep so that the dashboard feels like mine rather than a one-size-fits-all layout.

As a **new user who hasn't completed onboarding**, I want to see the Getting Started checklist first without being overwhelmed by a Customize button, so that I can explore the app's features before being asked to personalize.

---

## Requirements

### Functional Requirements

#### Smart Time-of-Day Ordering (Default)

1. The dashboard detects the current time and reorders widgets to surface the most relevant ones first. This is the default behavior for users who have not customized their layout.

2. **Morning (5:00 AM - 11:59 AM):**
   1. Devotional widget
   2. VOTD widget
   3. Activity checklist
   4. Mood chart
   5. Streak card
   6. Gratitude widget
   7. Reading plan progress (if active)
   8. Challenge progress (if active)
   9. Quick actions
   10. Prayer list summary
   11. Recent highlights
   12. Friends preview
   13. Weekly recap (if Monday)

3. **Afternoon (12:00 PM - 4:59 PM):**
   1. Activity checklist
   2. Reading plan progress (if active)
   3. Challenge progress (if active)
   4. Prayer list summary
   5. Quick actions
   6. Mood chart
   7. Streak card
   8. Gratitude widget
   9. VOTD widget
   10. Devotional widget
   11. Recent highlights
   12. Friends preview

4. **Evening (5:00 PM - 9:59 PM):**
   1. Evening reflection banner (if not completed)
   2. Gratitude widget
   3. Activity checklist
   4. Mood chart
   5. Prayer list summary
   6. Reading plan progress (if active)
   7. Challenge progress (if active)
   8. Streak card
   9. VOTD widget
   10. Recent highlights
   11. Friends preview
   12. Quick actions

5. **Night (10:00 PM - 4:59 AM):**
   1. Evening reflection banner (if not completed)
   2. Gratitude widget
   3. VOTD widget
   4. Prayer list summary
   5. Mood chart
   6. Streak card
   7. Quick actions
   8. Reading plan progress (if active)
   9. Challenge progress (if active)
   10. Recent highlights
   11. Friends preview
   12. Devotional widget
   13. Weekly recap (if Monday)

#### Conditional Widget Visibility

6. **Reading plan progress** — only renders when the user has at least one plan with started-but-incomplete status in `wr_reading_plan_progress`.
7. **Challenge progress** — only renders when the user has joined an active challenge (in-progress entry in `wr_challenge_progress`).
8. **Evening reflection banner** — only renders after 5:00 PM AND before the user completes today's reflection (`wr_evening_reflection` !== today's date string).
9. **Weekly recap** — only renders on Mondays AND only until dismissed (`wr_weekly_summary_dismissed` !== this Monday's date string).
10. **Getting Started checklist** — only renders until dismissed or completed (`wr_getting_started_complete` !== `"true"`). When visible, it always renders **first** regardless of time-of-day ordering.
11. **Recent highlights** — only renders when the user has at least 1 entry in `wr_bible_highlights` or `wr_bible_notes`.
12. Widgets that are conditionally hidden do not leave blank space — the grid reflows naturally, skipping them in the ordering.

#### Fixed Elements (Not Part of Widget Grid)

13. The **hero section** (greeting + Growth Garden) always renders above the widget grid. It is not a widget and cannot be hidden or reordered.
14. The **Weekly God Moments** banner (when visible) renders between the hero and the widget grid, outside the reorderable grid.

#### User Customization Panel

15. A **"Customize" button** appears in the dashboard header area. Styling: Lucide `SlidersHorizontal` icon + "Customize" text, `bg-white/10 text-white/60 hover:bg-white/15 rounded-lg px-3 py-1.5 text-sm`.
16. The Customize button is **hidden for new users** until they have completed or dismissed the Getting Started checklist (`wr_getting_started_complete === "true"` or the checklist has been dismissed in the current session).
17. Clicking the Customize button opens a **customization panel**: bottom sheet on mobile (< 640px), side panel on desktop (>= 640px).
18. The panel has a header: "Customize Dashboard" with a close button (Lucide `X`).
19. Below the header, a scrollable list of all widgets. Each item shows:
    - A drag handle (Lucide `GripVertical` icon, `text-white/30`)
    - The widget name and a small identifying icon
    - A toggle switch (on/off) to show/hide the widget
20. Users can **toggle widgets on/off**. Hidden widgets don't render on the dashboard.
21. Users can **drag widgets up or down** to set their preferred order.
    - Desktop: standard click-and-drag on the drag handle.
    - Mobile: long-press on the drag handle to pick up, drag to reorder.
    - Implementation: lightweight state array reorder on pointer/touch events. No external drag library.
22. The dragged item has a subtle lift effect: `shadow-lg scale-[1.02]` with `bg-white/[0.06] rounded-lg` on all list items.
23. At the bottom of the panel, two buttons:
    - **"Reset to Default"** — reverts to smart time-based ordering with all widgets visible (clears `wr_dashboard_layout`).
    - **"Done"** — closes the panel and applies changes.
24. Customization persists to a new localStorage key: `wr_dashboard_layout`.

#### Widget IDs

25. Each widget has a stable string ID used for ordering and persistence:

| Widget | ID |
|--------|----|
| Devotional | `devotional` |
| Verse of the Day | `votd` |
| Activity Checklist | `activity-checklist` |
| Mood Chart | `mood-chart` |
| Streak & Faith Points | `streak` |
| Gratitude | `gratitude` |
| Reading Plan Progress | `reading-plan` |
| Challenge Progress | `challenge` |
| Quick Actions | `quick-actions` |
| Prayer List Summary | `prayer-list` |
| Recent Highlights | `recent-highlights` |
| Friends Preview | `friends` |
| Weekly Recap | `weekly-recap` |
| Evening Reflection | `evening-reflection` |
| Getting Started | `getting-started` |

#### localStorage Persistence

26. New key: `wr_dashboard_layout` with structure:
```typescript
interface DashboardLayout {
  order: string[]       // Widget IDs in user's preferred order
  hidden: string[]      // Widget IDs the user has hidden
  customized: boolean   // true if user has ever customized
}
```
27. When `customized` is `true`, the user's `order` and `hidden` arrays take priority over the smart time-based ordering.
28. When `customized` is `false` or `wr_dashboard_layout` doesn't exist, the smart time-based ordering applies.

#### Grid Layout

29. The current 2-column desktop / 1-column mobile grid layout is preserved. When reordered, widgets fill the grid in their new order.
30. The 2-column layout assigns widgets to columns using a simple alternating pattern (odd-index left, even-index right) unless a widget is marked as full-width. Quick actions spans both columns (full width). Weekly recap spans both columns (full width).
31. Conditionally hidden widgets are skipped — they don't leave blank space.

#### Animation

32. On initial dashboard load with time-based ordering, widgets use the existing staggered entrance animation (`animate-widget-enter` with incrementing `animationDelay`).
33. When the user reorders via the customize panel, the grid transitions smoothly using CSS transitions (`transform` + `opacity`, 300ms ease) so widgets slide to their new positions rather than jumping.
34. With `prefers-reduced-motion`, widgets appear in their new positions instantly (no transitions).

#### Settings Integration

35. Add a **"Dashboard" section** in the Settings page (`/settings`).
36. This section contains:
    - A **"Dashboard Layout"** option that navigates to the dashboard and opens the customization panel (via a query param or state).
    - A **"Reset Dashboard Layout"** button that clears `wr_dashboard_layout` and shows a confirmation toast.

### Non-Functional Requirements

- **Performance**: Widget reordering should not cause full re-renders of widget content. The ordering logic should be a lightweight array sort, not a remount.
- **Accessibility**: Full keyboard support for the customization panel (see Accessibility section below).

---

## Auth Gating

The entire dashboard is auth-gated. All customization features require authentication.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View dashboard | Redirected to landing page (Home) | Sees dashboard with widget grid | N/A |
| Click "Customize" button | N/A (button not visible — dashboard is auth-gated) | Opens customization panel | N/A |
| Toggle widget visibility | N/A | Widget hidden/shown on dashboard | N/A |
| Drag to reorder widgets | N/A | Widget order changes and persists | N/A |
| Click "Reset to Default" | N/A | Layout reverts to time-based ordering | N/A |
| Click "Dashboard Layout" in Settings | N/A (Settings is auth-gated) | Navigates to dashboard with panel open | N/A |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single-column widget grid. Customize panel opens as a **bottom sheet** (slides up from bottom, max-height 80vh, scrollable). Drag reordering uses long-press to initiate. |
| Tablet (640px - 1024px) | Two-column widget grid (same as desktop). Customize panel opens as a **side panel** (slides in from right, width ~360px). Standard click-and-drag reordering. |
| Desktop (> 1024px) | Two-column widget grid (lg:grid-cols-5 with col-span-3/col-span-2 pattern). Customize panel opens as a **side panel** (slides in from right, width ~400px). Standard click-and-drag reordering. |

- The Customize button appears in the dashboard header area next to the greeting on all breakpoints.
- The customization panel overlays the dashboard content with a semi-transparent backdrop (`bg-black/40`).
- On mobile, the bottom sheet has a drag indicator bar at the top (a small rounded `bg-white/30` bar, 40px wide, centered).
- All panel items have 44px minimum touch targets on mobile.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Cannot access the dashboard. Redirected to landing page.
- **Logged-in users:** Widget ordering and visibility preferences persist to `wr_dashboard_layout` in localStorage.
- **Route type:** Protected (entire dashboard is auth-gated).

---

## Completion & Navigation

N/A — standalone feature. Does not affect Daily Hub completion tracking.

---

## Design Notes

- The customization panel uses the same dark frosted glass aesthetic as the existing dashboard cards: `bg-hero-mid/95 backdrop-blur-xl border border-white/15` for the panel container.
- Toggle switches match the existing Settings page toggle pattern (if one exists), or use a simple `bg-white/20` track with `bg-primary` active state, `h-6 w-11` sizing.
- The Customize button placement should be near the top of the dashboard, in the hero area or just below it, visually connected to the dashboard header.
- Widget list items in the panel use `bg-white/[0.06] rounded-lg p-3` with the widget's existing icon and name.
- The panel's "Reset to Default" button uses `bg-white/10 text-white/60 hover:bg-white/15` styling (secondary action). The "Done" button uses `bg-primary text-white hover:bg-primary/90` styling (primary action).
- Design system recon reference: the panel should match the dark frosted glass pattern from the existing dashboard cards (see Dashboard Card Pattern in `09-design-system.md`).
- **New visual patterns**: The bottom sheet on mobile and the side panel on desktop are new panel patterns not currently in the design system. These should be flagged as `[UNVERIFIED]` during planning and verified against the dark theme aesthetic.

---

## Out of Scope

- Changing any widget's internal content, styling, or behavior — this feature only changes ordering and visibility.
- Drag-and-drop directly on the dashboard grid (reordering happens only in the customize panel).
- Widget pinning or favorites.
- Per-widget sizing (small/large/full-width customization) — the existing column span rules remain.
- Backend persistence of layout preferences (Phase 3+ — currently localStorage only).
- Analytics on which widgets users hide or reorder.
- Any external drag library (e.g., dnd-kit, react-beautiful-dnd) — implementation uses native pointer/touch events.
- Changing the hero section or Growth Garden — these are fixed above the widget grid.

---

## Acceptance Criteria

### Smart Time-of-Day Ordering

- [ ] At 8:00 AM, the first visible widget (after Getting Started if shown) is the Devotional widget, followed by VOTD
- [ ] At 2:00 PM, the first visible widget is the Activity Checklist
- [ ] At 7:00 PM, the first visible widget is the Evening Reflection banner (if conditions met), otherwise Gratitude widget
- [ ] At 11:00 PM, the first visible widget is the Evening Reflection banner (if conditions met), otherwise Gratitude widget
- [ ] Time-of-day ordering updates when the user navigates to the dashboard (uses current time on each visit, not cached)

### Conditional Widget Visibility

- [ ] Reading Plan widget does not render when `wr_reading_plan_progress` has no active plans
- [ ] Reading Plan widget renders when at least one plan is started but incomplete
- [ ] Challenge widget does not render when `wr_challenge_progress` has no in-progress challenges
- [ ] Evening Reflection banner does not render before 5:00 PM
- [ ] Evening Reflection banner does not render when `wr_evening_reflection` equals today's date
- [ ] Weekly Recap widget only renders on Mondays and only when not dismissed
- [ ] Recent Highlights widget does not render when `wr_bible_highlights` and `wr_bible_notes` are both empty
- [ ] Getting Started checklist renders first (before time-ordered widgets) when visible
- [ ] Hidden conditional widgets do not leave blank spaces in the grid

### Customize Button

- [ ] Customize button (SlidersHorizontal icon + "Customize" text) is visible in the dashboard header area
- [ ] Customize button is NOT visible when Getting Started checklist is active and not yet dismissed/completed
- [ ] Customize button appears after Getting Started is dismissed or completed
- [ ] Customize button uses `bg-white/10 text-white/60 hover:bg-white/15 rounded-lg px-3 py-1.5 text-sm`

### Customization Panel

- [ ] On mobile (< 640px), panel opens as a bottom sheet sliding up from the bottom
- [ ] On desktop (>= 640px), panel opens as a side panel sliding in from the right
- [ ] Panel shows all 15 widgets with drag handles, names, icons, and toggle switches
- [ ] Toggling a widget off hides it from the dashboard immediately (or on "Done")
- [ ] Toggling a widget back on shows it on the dashboard
- [ ] Dragging a widget up/down reorders it in the list and on the dashboard
- [ ] On mobile, drag requires long-press to initiate
- [ ] Dragged item shows `shadow-lg scale-[1.02]` lift effect
- [ ] "Reset to Default" clears customization and reverts to smart time-based ordering
- [ ] "Done" closes the panel
- [ ] Panel has semi-transparent backdrop (`bg-black/40`)
- [ ] Panel has dark frosted glass styling matching dashboard card aesthetic

### Keyboard Accessibility

- [ ] Customization panel has `role="dialog"` and traps focus
- [ ] Each widget toggle has an accessible label (e.g., "Show Devotional widget")
- [ ] Pressing Space on a focused widget item picks it up for reordering
- [ ] Arrow keys move a picked-up item up/down in the list
- [ ] Space drops the item in its new position
- [ ] Escape cancels the reorder operation
- [ ] Position changes are announced via `aria-live` region (e.g., "Devotional moved to position 3 of 12")
- [ ] "Reset to Default" and "Done" buttons have accessible names

### Persistence

- [ ] Custom ordering persists to `wr_dashboard_layout` in localStorage
- [ ] On page refresh, the custom ordering is restored from localStorage
- [ ] When `customized` is false, time-based ordering is used
- [ ] When `customized` is true, user's order takes priority

### Grid Layout

- [ ] Existing 2-column desktop / 1-column mobile layout is preserved
- [ ] Quick Actions widget spans full width (both columns) regardless of position
- [ ] Weekly Recap widget spans full width regardless of position
- [ ] Widgets fill the grid in their new order without blank spaces

### Animation

- [ ] Staggered entrance animation plays on initial dashboard load (existing behavior preserved)
- [ ] Widget reordering via customize panel uses smooth CSS transitions (300ms ease)
- [ ] With `prefers-reduced-motion`, no transitions — widgets appear in new positions instantly

### Settings Integration

- [ ] Settings page has a "Dashboard" section
- [ ] "Dashboard Layout" option navigates to dashboard and opens the customization panel
- [ ] "Reset Dashboard Layout" button clears `wr_dashboard_layout` and shows confirmation toast

### First-Time User Experience

- [ ] New users (no `wr_dashboard_layout`) see smart time-based ordering
- [ ] New users with Getting Started checklist active do not see the Customize button
- [ ] After Getting Started is dismissed, the Customize button becomes visible
