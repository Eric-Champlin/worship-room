# View Full Devotional Context Banner Link

**Master Plan Reference:** N/A — standalone feature

---

## Overview

When users navigate from the devotional to the Journal or Pray tab via cross-feature CTAs ("Journal about this question," "Pray about today's reading"), a context banner confirms they're reflecting on today's devotional. Currently, if they want to refer back to the full devotional content (passage, reflection, quote) while writing, they must navigate away — breaking their flow. This spec adds a "View full devotional" link to each context banner that opens the devotional in a new browser tab, keeping the user's writing space intact while providing easy reference to the source material.

## User Story

As a **logged-in user**, I want to open the full devotional in a new tab from the context banner so that I can reference the devotional passage and reflection while writing my journal entry or prayer without losing my place.

## Requirements

### Functional Requirements

1. JournalInput's **guided mode** devotional context banner gains a "View full devotional" link that opens `/daily?tab=devotional` in a new browser tab
2. JournalInput's **free write mode** devotional context banner gains the same "View full devotional" link
3. PrayTabContent gains a new devotional context banner (matching JournalInput's guided mode banner) with both "Pray about something else" dismiss and "View full devotional" new-tab link — PrayerInput currently has no visible banner, only textarea pre-fill
4. The "View full devotional" link must be visually subordinate to the existing dismiss action (muted color, secondary position)
5. Both action links sit on the same row in a flex container with wrap fallback on narrow viewports
6. The link includes an `ExternalLink` icon from lucide-react to signal new-tab behavior
7. Existing context banner functionality (dismissal, conditional rendering, context passing) must be fully preserved

### Non-Functional Requirements

- Accessibility: Link has focus-visible ring; icon is `aria-hidden="true"`; banner retains `role="status"` and `aria-live` region
- Performance: Zero impact — this is a static `<a>` element, no state changes or data fetching

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View context banner (Journal) | N/A — devotional-to-journal flow requires login (journal saving is auth-gated) | Banner visible with both links | N/A |
| View context banner (Pray) | N/A — devotional-to-pray flow requires login (prayer generation is auth-gated) | Banner visible with both links | N/A |
| Click "View full devotional" | N/A — banner only appears in auth-gated flows | Opens `/daily?tab=devotional` in new tab | N/A |
| Click "Write/Pray about something else" | N/A | Dismisses banner (existing behavior preserved) | N/A |

Note: The context banners only appear when arriving from the devotional via cross-feature CTAs, which are auth-gated flows. Logged-out users never see these banners.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Both links wrap to separate lines via `flex-wrap` + `gap-y-1`; each link still meets 44px touch target height |
| Tablet (640-1024px) | Both links on same row via `flex` + `gap-x-4` |
| Desktop (> 1024px) | Same as tablet — both links on one row |

The banner itself remains compact (~60-80px height) and does not push the textarea offscreen on any viewport.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. It adds a static navigational link only.

## Auth & Persistence

- **Logged-out users:** N/A — context banners only appear in auth-gated flows
- **Logged-in users:** No new data persisted. The `contextDismissed` state for the Pray banner is in-memory React state only (same pattern as JournalInput)
- **localStorage usage:** None — no new `wr_*` keys

## Completion & Navigation

N/A — This is a navigational enhancement to an existing cross-feature flow. No completion tracking changes.

## Design Notes

- Both links use `text-xs` for compactness within the existing banner
- Dismiss link retains `text-primary underline hover:text-primary-light` (existing style)
- "View full devotional" link uses `text-white/60 underline hover:text-white/80` — visually subordinate per design system text opacity standards (secondary text = 60% on inner pages)
- `ExternalLink` icon: `h-3 w-3` (12px), inline with text, `aria-hidden="true"`
- Links container: `flex flex-wrap items-center gap-x-4 gap-y-1` — replaces the existing `mt-1` on the dismiss button with a shared `mt-2` on the container
- Banner border/background unchanged: `border-primary/20 bg-primary/5 rounded-lg p-3`
- Focus styles: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded`
- New Pray tab banner mirrors the exact visual pattern of JournalInput's guided mode banner

### Existing Components Referenced

- JournalInput's devotional context banner (guided + free write modes) — being enhanced with the new link
- PrayTabContent — receives new banner; already has `prayContext` prop wired from DailyHub
- PrayerInput — needs `prayContext` prop threaded through to display the banner (currently only receives `initialText`)
- `ExternalLink` from lucide-react — already used elsewhere in the app

## Out of Scope

- Inline collapsible devotional preview within the banner (rejected — bloats page)
- Any changes to devotional content rendering or data
- Context passing logic changes — only visual additions
- Backend/API work (Phase 3)
- Opening the devotional in a modal/drawer instead of new tab

## Acceptance Criteria

- [ ] **JournalInput guided mode**: Devotional context banner contains both "Write about something else" AND "View full devotional" links in a flex container
- [ ] **JournalInput free write mode**: Devotional context note contains the "View full devotional" link alongside the existing "Dismiss" button
- [ ] **PrayTabContent**: New devotional context banner appears when `prayContext.from === 'devotional'`, with "Pray about something else" dismiss and "View full devotional" link
- [ ] **Pray banner dismissal**: `contextDismissed` state resets when `prayContext` changes (useEffect pattern matching JournalTabContent)
- [ ] **PrayerInput prop threading**: `prayContext` prop wired from PrayTabContent through to PrayerInput (or banner rendered in PrayTabContent directly)
- [ ] Both links wrapped in `flex flex-wrap items-center gap-x-4 gap-y-1` container
- [ ] "View full devotional" link uses `<a href="/daily?tab=devotional" target="_blank" rel="noopener noreferrer">`
- [ ] `ExternalLink` icon (`h-3 w-3`, `aria-hidden="true"`) appears next to link text
- [ ] Link styling: `text-xs text-white/60 underline hover:text-white/80`
- [ ] `ExternalLink` imported from lucide-react in all affected files
- [ ] All existing banner functionality preserved (dismissal, conditional rendering, guided/free mode distinction in JournalInput)
- [ ] Banner height remains compact (~60-80px) — does not bloat the page
- [ ] On mobile (375px), links wrap to separate lines without breaking layout
- [ ] New tab opens `/daily?tab=devotional` with full devotional content visible
- [ ] Focus-visible ring on the new link for keyboard accessibility
