# Devotional Polish

**Master Plan Reference:** N/A — standalone visual-polish spec

---

## Overview

The Daily Hub's devotional experience is meant to feel contemplative and quiet — a moment of settled attention before the day's worship rhythms unfold. Two small typography issues currently undermine that feel: the descender on the "g" in "Good Evening" / "Good Morning" on the greeting heading is clipped by a tight line-height, and the "CLOSING PRAYER" label on the devotional's prayer block renders at a different opacity than sibling labels on the page, making it slightly louder than the prayer text it introduces. This spec fixes both with surgical typography adjustments — no functional changes, no layout changes, no new components.

## User Story

As a **logged-in user** opening the Daily Hub → Devotional tab, I want the greeting and closing prayer block to render with correct, consistent typography so that **nothing visually distracts from the contemplative flow of the devotional**.

## Requirements

### Functional Requirements

1. **Greeting descender fix (DailyHub.tsx):** The greeting `<h1>` in `frontend/src/pages/DailyHub.tsx` must render the full "g" descender in "Good Evening" / "Good Morning, [name]!" at all three breakpoints (375px mobile, 768px tablet, 1440px desktop). Descenders on "y", "p", "j" in user-provided display names must also render fully (e.g., "Greg", "Peggy", "Jeremy").
2. **Closing Prayer label color match (DevotionalTabContent.tsx):** The "CLOSING PRAYER" label in the devotional's prayer block must render at the same opacity as sibling secondary labels on the devotional page (specifically the verse reference labels such as "MARK 10:33-34" / "JOHN 19:28-30"), creating visual unity with the prayer text it introduces.

### Non-Functional Requirements

- **Visuals only.** No functional changes, no layout changes, no new components.
- **Scope lock.** Do not modify any other typography, spacing, or colors on either element beyond what is specified in this spec.
- **No layout shifts.** The vertical rhythm of both pages must remain unchanged — other than the heading gaining a small bit of bottom padding, no surrounding elements should reflow.
- **Accessibility:** Typography changes must not reduce readable contrast. Both edited elements continue to meet WCAG AA contrast minimums for their role (heading text on dark background; secondary label text).

## Auth Gating

**Unchanged by this spec.** Both elements are rendered on already-auth-gated surfaces — the DailyHub greeting only renders when the Daily Hub page is viewed by an authenticated user (the user's display name is shown), and the Devotional tab's closing prayer block renders in the devotional content flow. This spec does not add, remove, or modify any interactive elements and does not change any auth behavior.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View greeting | Unchanged — greeting uses fallback/generic display name per existing behavior | Unchanged — greeting uses `displayName` per existing behavior | N/A (read-only element) |
| View Closing Prayer block | Unchanged — block renders as part of the devotional | Unchanged — block renders as part of the devotional | N/A (read-only element) |

## Responsive Behavior

Both edits must render correctly at all three breakpoints.

| Breakpoint | Greeting (DailyHub h1) | Closing Prayer label |
|-----------|------------------------|----------------------|
| Mobile (< 640px) | `text-4xl` sized; descenders fully visible; no clipping | Same text size / tracking as current; color updated |
| Tablet (640–1024px) | `text-5xl` sized; descenders fully visible; no clipping | Same text size / tracking as current; color updated |
| Desktop (> 1024px) | `text-6xl` sized; descenders fully visible; no clipping | Same text size / tracking as current; color updated |

- The greeting retains its existing gradient text style, font weight, and responsive font-size scaling.
- The closing prayer block retains its existing spacing (`py-5 sm:py-6`), its top border, and its serif italic body text.
- No element is being added, removed, stacked differently, or hidden at any breakpoint.

## AI Safety Considerations

N/A — This spec does not touch AI-generated content, free-text user input, or crisis-detection surfaces. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No change. Both edits are purely visual on already-rendered elements.
- **Logged-in users:** No change. No new data is read or written; no localStorage keys are added or modified.
- **localStorage usage:** None.

## Completion & Navigation

N/A — this is a visual-polish spec. No completion signals, no CTAs, no tab routing, no context passing change.

## Design Notes

- **Greeting heading typography (DailyHub.tsx):** The greeting's gradient text style and responsive size scale are preserved. The line-height is tightened from `leading-tight` (1.25) to `leading-[1.15]`, and small bottom padding is added so that descenders render fully without inflating the visual line height. Use the existing `GRADIENT_TEXT_STYLE` constant unchanged.
- **Closing Prayer label (DevotionalTabContent.tsx):** The label's existing "small uppercase tracked-wide" treatment stays intact (font size, font weight, letter-spacing, and uppercase transform are all unchanged). Only its text opacity is adjusted so it visually matches other secondary labels on the devotional page — specifically verse reference labels ("MARK 10:33-34", "JOHN 19:28-30"), which render at `text-white/60`. After this change, the label and the prayer body beneath it share the same opacity, forming a single quiet block.
- **Current code baseline:** As of this spec, the DailyHub greeting's className does **not** contain `px-1 sm:px-2` (the original spec input referenced those classes, but they are not present in the current file). The fix should modify only `leading-tight` → `leading-[1.15]` and add `pb-2` — nothing else. `/plan` should confirm the current className in-file before proposing the exact diff.
- **Design system references:** Both changes sit within the homepage/dark-theme "white text default" and "muted opacities for secondary labels" conventions documented in `.claude/rules/09-design-system.md` (§ "Homepage Visual Patterns"). The `text-white/60` opacity is the canonical secondary-text opacity used across devotional verse references and similar secondary labels.
- **Components reused:** None — this spec touches only two existing JSX elements inline; no shared components are introduced or replaced.

## Out of Scope

- Any other typography, color, or spacing edits on DailyHub or DevotionalTabContent beyond the two specific changes described.
- Any changes to the greeting's gradient, font weight, or font-size scale.
- Any changes to the closing prayer block's spacing, border, serif body text, or padding.
- Any changes to other uses of `text-white/50` elsewhere in the codebase.
- Any changes to other uses of `leading-tight` elsewhere in the codebase.
- Any layout restructuring, new components, or new features.

## Acceptance Criteria

- [ ] DailyHub.tsx greeting `<h1>` has `leading-tight` replaced with `leading-[1.15]`
- [ ] DailyHub.tsx greeting `<h1>` has `pb-2` added to its className
- [ ] DailyHub.tsx greeting `<h1>` retains `mb-1 text-4xl font-bold sm:text-5xl lg:text-6xl` and its `id="daily-hub-heading"` and `style={GRADIENT_TEXT_STYLE}` attributes exactly as-is
- [ ] DevotionalTabContent.tsx "Closing Prayer" label className has `text-white/50` replaced with `text-white/60`
- [ ] DevotionalTabContent.tsx "Closing Prayer" label retains `mb-2 text-xs font-medium uppercase tracking-widest` exactly as-is
- [ ] No other classes, inline styles, attributes, or markup on either element are modified
- [ ] On 375px mobile, the "g" descender in "Good Evening" renders fully without any pixel of the descender being clipped by the parent container or subsequent element
- [ ] On 768px tablet, the "g" descender in "Good Evening" renders fully
- [ ] On 1440px desktop, the "g" descender in "Good Evening" renders fully
- [ ] When the user's display name contains descenders (e.g., "Greg", "Peggy"), those descenders also render fully at all three breakpoints
- [ ] The "CLOSING PRAYER" label on the devotional page and the verse reference labels (e.g., "MARK 10:33-34", "JOHN 19:28-30") render at visually identical white opacity
- [ ] No vertical spacing regressions on the Daily Hub or the devotional tab (the only permitted spacing delta is the 8px `pb-2` added to the greeting)
- [ ] All existing devotional functionality (date navigation, share, read-aloud, cross-tab CTAs, scripture passage display) continues working unchanged
- [ ] Playwright screenshots confirm descender rendering at 375px, 768px, and 1440px, and confirm the closing prayer label now matches sibling verse reference labels' opacity
