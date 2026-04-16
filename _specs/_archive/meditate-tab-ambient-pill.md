# Meditate Tab — Ambient Pill Relocation

**Master Plan Reference:** N/A — standalone visual polish

---

## Overview

The "Enhance with sound" ambient pill on the Meditate tab currently floats centered below the heading as an orphaned element. Unlike Pray and Journal (which have chip rows and mode toggles to visually group with), Meditate has nothing beside the heading. This change moves the pill inline with the heading so they form a single cohesive unit — heading + control on the same line at tablet+ breakpoints, stacked on mobile.

## User Story

As a **logged-in user** or **logged-out visitor**, I want the ambient sound pill to feel like a natural part of the Meditate tab heading so that I notice it as a relevant control rather than an orphaned element.

## Requirements

### Functional Requirements

1. Relocate `AmbientSoundPill` from its standalone centered wrapper below the `<h2>` to sit as a direct sibling of the `<h2>` inside a shared flex container.
2. On mobile (< 640px), the heading and pill stack vertically (heading on top, pill below) with a 12px gap (`gap-3`), both centered.
3. On tablet+ (>= 640px), the heading and pill sit side-by-side on a horizontal row, centered horizontally, with a 16px gap (`gap-4`).
4. No functional changes — pill click behavior, expansion panel, audio playback, active state display all remain unchanged.

### Non-Functional Requirements

- Accessibility: No ARIA attribute changes. Existing pill accessibility (button role, aria-expanded) preserved.
- Performance: No new DOM elements or JavaScript — this is a CSS-only layout change.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View heading + pill | Visible, fully interactive | Visible, fully interactive | N/A |
| Click pill (idle) | Expansion panel opens | Expansion panel opens | N/A |
| Click meditation card | Auth modal appears | Navigates to meditation sub-page | "Sign in to start meditating" |

No auth gating changes in this spec. Pill interaction is not auth-gated (matches Pray and Journal tabs).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Heading stacks on top, pill centered below, 12px vertical gap. Visually similar to current but tighter. |
| Tablet (640-1024px) | Heading and pill side-by-side on one horizontal row, centered, 16px gap. Pill right of heading. |
| Desktop (> 1024px) | Same as tablet — single horizontal row, centered. |

The pill height (~44px) and heading height (~36-48px depending on breakpoint) should align at vertical center on the horizontal row.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** See heading + pill, can interact with pill (browse sounds, play ambient). No persistence.
- **Logged-in users:** Same visual experience. Pill audio state managed by existing `AudioProvider` context.
- **localStorage usage:** No new keys. Existing audio keys (`wr_session_state`, etc.) unchanged.

## Completion & Navigation

N/A — visual-only change within existing Meditate tab. No completion tracking affected.

## Design Notes

- The flex container uses `GRADIENT_TEXT_STYLE` on the heading (white-to-purple gradient via `background-clip: text`) — same as Pray and Journal tabs.
- The `AmbientSoundPill` component has a default `mb-4` that must be overridden with `!mb-0` in the flex layout.
- The pill's intrinsic width should not stretch to fill the flex container — use `!w-auto` override.
- The existing `GlowBackground` (split variant) and `BackgroundSquiggle` layering remain untouched.
- This matches the inline heading+pill pattern already established on the Pray tab (`PrayTabContent`) and Journal tab (`JournalTabContent`) after their respective ambient pill specs.

## Files to Edit

- `src/components/daily/MeditateTabContent.tsx` — single file change

## Out of Scope

- No changes to meditation card logic, auth gating, completion tracking, or challenge context handling
- No changes to the golden glow celebration banner
- No ARIA attribute modifications
- No changes to pill component internals (`AmbientSoundPill.tsx`)
- No changes to other Daily Hub tabs

## Acceptance Criteria

- [ ] Heading block wrapper updated from `<div className="mb-4">` to `<div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">`
- [ ] `text-center` removed from `<h2>` className (parent flex handles centering)
- [ ] Standalone pill wrapper `<div className="z-10 mt-2 flex justify-center">` removed
- [ ] `AmbientSoundPill` placed as direct child of flex wrapper, immediately after `<h2>`
- [ ] Pill className uses `!mb-0 !w-auto` overrides
- [ ] Mobile (< 640px): heading above, pill below, centered, with ~12px vertical gap
- [ ] Tablet+ (>= 640px): heading and pill side-by-side, centered horizontally, with ~16px gap
- [ ] Pill expansion panel still drops down correctly below the heading row on all breakpoints
- [ ] Pill active state ("Playing: [scene name]") renders correctly in both stacked and inline layouts
- [ ] No regressions to meditation card grid layout
- [ ] No regressions to all-complete celebration banner
- [ ] No regressions to suggested card highlighting (challenge context)
- [ ] No regressions to auth gating on meditation cards
- [ ] Existing tests pass without modification
