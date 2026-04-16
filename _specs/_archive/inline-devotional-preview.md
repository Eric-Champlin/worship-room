# Feature: Inline Collapsible Devotional Preview

**Master Plan Reference:** N/A — standalone feature (builds on Spec B devotional context passing and Spec W "View full devotional" link)

---

## Overview

When a user clicks "Journal about this question" or "Pray about today's reading" from the devotional, they arrive at the Journal/Pray tab needing to write a meaningful response -- but the devotional content (passage, reflection question, reflection body, saint's quote) is no longer visible. Users must either remember what they read or open the devotional in a separate tab. This spec adds an inline collapsible devotional preview at the top of Journal and Pray (when arriving from devotional context). A small collapsed pill takes minimal vertical space by default; one click expands the full devotional content inline with sticky positioning so it stays accessible as users scroll to write. Users who don't need it pay almost no visual cost; users who do have the source material always at hand.

This is zero-friction reference material that keeps the user's writing flow unbroken.

## User Story

As a **logged-in user** who just read the daily devotional, I want to **reference the devotional passage and reflection question inline while writing my journal entry or prayer** so that **I can respond thoughtfully without losing my train of thought by switching tabs**.

## Requirements

### Functional Requirements

1. When the user navigates from Devotional tab to Journal or Pray via the cross-feature CTAs ("Journal about this question", "Pray about today's reading"), a collapsible preview panel appears at the top of the destination tab content
2. The panel is **collapsed by default**, showing only a small pill with "Today's Devotional" label, devotional title, passage reference, and a chevron icon
3. Clicking the pill **expands** the panel to reveal the full devotional passage (with verse numbers), reflection question (in a callout), reflection body paragraphs, and closing quote with attribution
4. Clicking again **collapses** the panel back to the pill
5. The panel uses **sticky positioning** so it stays visible at the top of the viewport as the user scrolls down to write
6. When expanded, the panel content has **internal scrolling** (max ~50% of viewport height) so long devotionals don't push the textarea offscreen
7. The panel is **not shown** when navigating directly to Journal or Pray without devotional context
8. The panel **disappears** when the user dismisses the devotional context (e.g., clicks "Write about something else" in the existing context banner)
9. The devotional snapshot is captured at click time and passed through the existing `PrayContext` mechanism -- preserving the exact devotional the user was reading (which matters if navigating devotional history)
10. Spec W's "View full devotional" link in the context banner **coexists** with this panel -- the inline preview gives quick reference, while the link provides the full devotional page experience

### Non-Functional Requirements

- **Performance**: Panel expand/collapse animates via CSS `max-height` transition -- no layout thrashing. Content height measured once on mount.
- **Accessibility**: Pill button has `aria-expanded`, `aria-controls`, `aria-hidden` on collapsed content. Keyboard accessible (Tab, Enter, Space). No focus trap -- user can freely click into the textarea while panel is expanded.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View collapsed pill | N/A -- panel only appears when navigating from devotional CTA, which requires being on the Daily Hub | Pill visible at top of Journal/Pray tab | N/A |
| Expand/collapse panel | N/A | Toggle panel open/closed | N/A |
| Scroll within expanded panel | N/A | Scrolls internal content | N/A |

**Note:** The cross-feature CTAs that trigger this panel (from DevotionalTabContent) are available to all users viewing the Daily Hub. The panel itself has no auth gating -- it is purely a read-only display of devotional content already shown on the Devotional tab.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Full-width pill, expanded panel fits within viewport with internal scroll. Touch-friendly tap target on the pill (entire pill is the button). Padding adjusts (`px-4 py-3` collapsed, `px-5 py-5` expanded). |
| Tablet (640-1024px) | Same layout as mobile, slightly more generous padding |
| Desktop (> 1024px) | Same layout, expanded padding (`px-6 py-6`). Panel width constrained by parent container (max-w-2xl from Pray/Journal tabs). |

The pill and expanded panel both respect the parent container's max-width. No special stacking or hiding between breakpoints -- the component behaves identically at all sizes, with only padding adjustments.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. It displays read-only devotional content that was already rendered on the Devotional tab. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can see the panel if they reached Journal/Pray via devotional CTAs (devotional content is not auth-gated). No persistence.
- **Logged-in users:** Same behavior. No persistence -- the panel state (expanded/collapsed) is ephemeral React state. The devotional snapshot lives in `PrayContext` React state only.
- **localStorage usage:** None. No new `wr_*` keys introduced.
- **Route type:** Public (Daily Hub is public; the panel is a UI enhancement within it)

## Completion & Navigation

N/A -- This panel does not represent a completable activity. It is a passive reference tool within the Journal and Pray tabs. It does not signal to the completion tracking system or affect streaks/points.

The panel integrates with the existing context dismissal mechanism: when the user clicks "Write about something else" in the devotional context banner (from Spec W), both the context banner and this preview panel disappear together (both gated on the same `contextDismissed` state).

## Data Model

The devotional snapshot must be captured and passed through `PrayContext`. The snapshot shape includes:

- **date** (string) -- the devotional's date
- **title** (string) -- devotional title
- **passage** -- object with `reference` (string) and `verses` (array of `{ number, text }`)
- **reflection** (string[]) -- reflection body paragraphs
- **reflectionQuestion** (string) -- the "Something to think about" question
- **quote** -- object with `text` (string) and `attribution` (string)

This is a subset of the full devotional shape from `data/devotionals.ts`, containing only what the preview panel needs to render. The existing `PrayContext` type gains an optional `devotionalSnapshot` field, present only when `from === 'devotional'`.

The cross-feature CTA callbacks (`onSwitchToJournal`, `onSwitchToPray`) gain an optional third argument for the snapshot, which flows through `DailyHub` into the `PrayContext` state.

## Design Notes

### Collapsed State (Pill)

- Uses `FrostedCard`-tier styling: `bg-white/[0.06]`, `backdrop-blur-md`, `border border-white/[0.12]`, `rounded-2xl`
- Shadow: `shadow-[0_4px_20px_rgba(0,0,0,0.3)]` for sticky overlay depth
- Height: ~50px (single line of content)
- Layout: BookOpen icon (Lucide, `text-primary`) + label/title text + ChevronDown icon
- Label: "TODAY'S DEVOTIONAL" in `text-xs font-semibold uppercase tracking-widest text-white/60`
- Title line: "{title} . {reference}" in `text-sm font-medium text-white`, truncated with ellipsis
- Chevron: `text-white/60`, rotates 180deg on expand (300ms transition)
- Hover: `bg-white/[0.04]` subtle highlight
- Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`

### Expanded State

- Content area appears below the pill with a `border-t border-white/[0.08]` separator
- Max height: 50% of viewport with `overflow-y-auto` for internal scrolling
- Height animation: `max-height` transition, 300ms ease-out
- Content sections (top to bottom):
  1. **Passage**: Reference label (`text-xs uppercase tracking-widest text-white/60`) + verse text in `font-serif` with superscript verse numbers (`text-white/50`)
  2. **Reflection question**: In a callout box (`rounded-xl border-l-2 border-l-primary bg-white/[0.04]`) with "Something to think about" label
  3. **Reflection body**: Paragraphs in `text-[15px] leading-[1.75] text-white/90`
  4. **Quote**: Blockquote in `font-serif italic text-white/90` with attribution below

### Positioning

- `sticky top-2 z-30` -- sticks 8px below viewport top on scroll
- z-30 sits above page content but below the Daily Hub sticky tab bar (z-40)
- `mb-4` margin below to separate from the tab content

### Design System References

- Card styling matches `FrostedCard` component patterns from `09-design-system.md`
- Text gradient heading NOT used (this is a small utility panel, not a section heading)
- Icons from Lucide React (BookOpen, ChevronDown)
- `cn()` utility for conditional classes
- Design system recon available at `_plans/recon/design-system.md` -- reference for exact opacity/blur values

## Out of Scope

- **Editing devotional content** from within the panel
- **Navigating to different devotionals** from the panel (use the "View full devotional" link for that)
- **Persisting expand/collapse state** across tab switches or page refreshes
- **Adding the panel to other pages** (only Journal and Pray tabs within Daily Hub)
- **Removing Spec W's "View full devotional" link** -- both features coexist (Eric's call to remove later if desired)
- **Backend API integration** -- all data passed through React state; backend wiring is Phase 3

## Acceptance Criteria

### Data Flow
- [ ] `PrayContext` type extended with optional `devotionalSnapshot` field
- [ ] New `DevotionalSnapshot` type created with `date`, `title`, `passage` (reference + verses), `reflection` (string[]), `reflectionQuestion`, and `quote` (text + attribution)
- [ ] DevotionalTabContent's "Journal about this question" CTA passes the devotional snapshot through the callback
- [ ] DevotionalTabContent's "Pray about today's reading" CTA passes the devotional snapshot through the callback
- [ ] DailyHub's handler functions accept and store the snapshot in `PrayContext` state

### Panel Rendering
- [ ] New `DevotionalPreviewPanel` component renders in JournalInput when `prayContext.from === 'devotional'` AND `devotionalSnapshot` is present AND context is not dismissed
- [ ] Same panel renders in PrayerInput under the same conditions
- [ ] Panel does NOT appear when navigating directly to `/daily?tab=journal` or `/daily?tab=pray` without devotional context
- [ ] Panel disappears when user dismisses the context (clicks "Write about something else")

### Collapsed State
- [ ] Panel is collapsed by default (collapsed on mount)
- [ ] Collapsed pill shows BookOpen icon, "TODAY'S DEVOTIONAL" label, devotional title, passage reference, and chevron-down icon
- [ ] Title text truncates with ellipsis if too long for the container
- [ ] Pill uses frosted glass styling: `bg-white/[0.06]`, `backdrop-blur-md`, `border border-white/[0.12]`, `rounded-2xl`

### Expanded State
- [ ] Clicking the pill expands to show passage, reflection question (in callout), reflection body, and quote
- [ ] Clicking again collapses the panel
- [ ] Expand/collapse animates via `max-height` transition over 300ms with ease-out timing
- [ ] Chevron rotates 180 degrees during expansion and back during collapse
- [ ] Expanded content max-height caps at 50% of viewport
- [ ] Content exceeding 50vh scrolls internally within the panel (not pushing textarea offscreen)
- [ ] Verse numbers appear as superscripts in the passage text
- [ ] Reflection question displayed in a callout box with left border accent (`border-l-primary`)
- [ ] Quote rendered as a blockquote with serif italic text and attribution

### Positioning & Z-Index
- [ ] Panel uses `sticky top-2` positioning (sticks 8px below viewport top)
- [ ] Panel z-index (z-30) sits below the Daily Hub sticky tab bar (z-40) -- no visual conflict
- [ ] Panel stays at top of viewport as user scrolls down to write

### Accessibility
- [ ] Pill button has `aria-expanded` reflecting current state
- [ ] Pill button has `aria-controls` pointing to the expanded content panel
- [ ] Expanded content has `aria-hidden` reflecting visibility
- [ ] Keyboard navigation: Tab to pill, Enter/Space to toggle
- [ ] No focus trap -- textarea remains focusable while panel is open
- [ ] Focus ring visible on the pill button (ring-2, ring-primary)

### Responsive
- [ ] Mobile (375px): pill and expanded panel fit within viewport, content scrolls internally
- [ ] Touch targets meet 44px minimum (entire pill is the button)
- [ ] Padding adjusts between mobile and desktop breakpoints

### Coexistence with Spec W
- [ ] "View full devotional" link in context banner remains functional alongside the preview panel
- [ ] Both can be used independently -- panel for quick reference, link for full experience
