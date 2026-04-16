# Devotional Readability — Layered Container Treatment

**Master Plan Reference:** N/A — standalone visual polish spec

---

## Overview

After Spec F bumped glow orb opacity globally (0.15 to 0.25 range), the devotional tab's content became harder to read — the passage, reflection, and prayer all sit directly on the purple-tinted background with no container. Wrapping everything in identical FrostedCards would feel heavy and repetitive. This spec introduces a **4-tier layered container treatment** where each content block gets a container matching its emotional weight, creating visual variety and hierarchy while dramatically improving readability. The result is a devotional that feels like a curated reading experience rather than a wall of text on a glowing background.

## User Story

As a logged-in user reading the daily devotional, I want each content section to have distinct visual treatment so that I can read comfortably over the bumped-up glow backgrounds and intuitively sense the hierarchy of the content.

## Requirements

### Functional Requirements

1. Passage section wrapped in a Tier 2 "scripture callout" container with left purple accent and subtle background wash
2. Reflection body section converted to Tier 3 "inset" treatment with top and bottom dividers only (no background, no box)
3. Closing prayer section wrapped in a Tier 4 "dimmed frosted card" container — lighter than the FrostedCard but still contained
4. Quote card remains unchanged (already Tier 1 FrostedCard)
5. Reflection question card remains unchanged (already Tier 1 FrostedCard with left accent)
6. RelatedPlanCallout remains unchanged (its own component with its own styling)
7. All text within containers brightened for readability inside their respective backgrounds

### Non-Functional Requirements

- Accessibility: All text must remain WCAG AA compliant over their container backgrounds
- Performance: No new components, no new JS — purely Tailwind class changes

## Auth Gating

N/A — This spec changes only visual styling. No interactive elements are added or modified. All existing auth behavior (share, read aloud, completion) is unchanged.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All 4 container tiers render at full width. Scripture callout uses `px-5 py-5`. Reflection inset uses `py-6`. No overflow. |
| Tablet (640-1024px) | Same as mobile with slightly more padding on scripture callout (`sm:px-6 sm:py-6`) and reflection inset (`sm:py-8`). |
| Desktop (> 1024px) | Same as tablet. Content is already constrained by the devotional tab's max-width. |

No elements stack, hide, or change between breakpoints — only padding values scale up at `sm:`.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

N/A — Visual-only changes. No data reads or writes. No localStorage usage.

## Completion & Navigation

N/A — No changes to completion tracking, CTAs, or navigation. All existing cross-tab CTAs (Journal, Pray) are untouched.

## Design Notes

### The 4-Tier Container System

Each tier has a distinct visual weight, creating rhythm and hierarchy as the user scrolls:

**Tier 1: Full FrostedCard (Hooks)** — Most visually prominent. Used for content that asks the user to pause and reflect.
- Uses existing `FrostedCard` component as-is
- Applied to: Quote card, Reflection question card (both already use FrostedCard — no changes needed)

**Tier 2: Scripture Callout (Passage)** — Subtler than FrostedCard. Feels like an inset quote block rather than a card.
- `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6`
- No top/right/bottom borders, no shadow
- Passage text brightened to `text-white` (from `text-white/80`)
- Verse number superscripts brightened to `text-white/40` (from `text-white/30`)

**Tier 3: Inset Section (Reflection Body)** — Most minimal treatment. No background, no box.
- `border-t border-b border-white/[0.08] py-6 sm:py-8`
- Just top and bottom dividers with generous vertical padding
- Text stays `text-white` (already brightest from Spec 2)

**Tier 4: Dimmed Frosted Card (Secondary Hooks)** — Subtler than Tier 1 for secondary contained content.
- `rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5`
- Muted version of FrostedCard — lower opacity background and border, smaller padding
- Prayer text brightened to `text-white/70` (from `text-white/60`)

### Visual Rhythm

When scrolling the devotional, the container treatments create this rhythm:
Quote (prominent FrostedCard) → Passage (accented callout) → Reflection (clean inset) → Closing Prayer (subtle card) → Question (prominent FrostedCard)

### Border Changes

- Passage section: removes its outer `border-t border-white/[0.08]` (the scripture callout container provides its own visual separation)
- Reflection section: adds `border-b border-white/[0.08]` (now has both top and bottom dividers)
- Closing prayer section: removes its outer `border-t border-white/[0.08]` (the dimmed card container provides its own separation)

### Spec Interaction Note

Spec P removes the static Closing Prayer section entirely, replacing it with authentic prayer generation. If Spec P executes before this spec, the Tier 4 closing prayer change is moot. If this spec executes first, the Tier 4 treatment applies temporarily until Spec P removes it.

## File to Edit

- `src/components/daily/DevotionalTabContent.tsx` — the only file modified in this spec

## Out of Scope

- Quote card styling (already FrostedCard — no changes)
- Reflection question card styling (already FrostedCard with left accent — no changes, Spec O handles further modification)
- RelatedPlanCallout styling (its own component)
- Section reordering (Spec S handles verse card insertion, Spec O handles reflection question restructure)
- Functional changes to date navigation, swipe handlers, share panel, read aloud, completion tracking, or any callbacks
- New components or new files

## Acceptance Criteria

- [ ] Quote card unchanged (already Tier 1 FrostedCard)
- [ ] Passage section wrapped in Tier 2 scripture callout: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6`
- [ ] Passage text brightened to `text-white` (was `text-white/80`)
- [ ] Passage verse number superscripts brightened to `text-white/40` (was `text-white/30`)
- [ ] Passage section outer wrapper NO longer has `border-t border-white/[0.08]`
- [ ] SharePanel remains outside the scripture callout container (it's a modal/panel)
- [ ] Reflection section has both `border-t` and `border-b` with `border-white/[0.08]`
- [ ] Reflection section padding increased to `py-6 sm:py-8` (was `py-5 sm:py-6`)
- [ ] Reflection section has NO background color and NO border radius (inset treatment only)
- [ ] Closing prayer wrapped in Tier 4 dimmed card: `rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5`
- [ ] Closing prayer text brightened to `text-white/70` (was `text-white/60`)
- [ ] Closing prayer outer wrapper NO longer has `border-t border-white/[0.08]`
- [ ] Reflection question card unchanged (already Tier 1 with left accent)
- [ ] RelatedPlanCallout unchanged (its own component)
- [ ] Visual rhythm: 4 distinct container styles visible when scrolling the devotional
- [ ] Mobile layout works at 375px with no overflow
- [ ] All text readable over the bumped-up glow orbs (WCAG AA)
- [ ] No regressions to share, read-aloud, or completion tracking functionality
