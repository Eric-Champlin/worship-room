# Feature: Pray Tab Copy and Ambient Pill Relocation

**Master Plan Reference:** N/A -- standalone feature (part of Round 3 enhancement series)

---

## Overview

"Generate Prayer" is a transactional, mechanical phrase for a deeply personal action. Replacing it with "Help Me Pray" reframes the interaction as a collaborative moment rather than a machine producing output -- matching Worship Room's sanctuary tone. Separately, the "Enhance with sound" pill currently sits in its own row between the heading and the starter chips, creating an awkward visual break. Relocating it inline with the starter chips (as the last pill in the row) tightens the visual flow and groups all chip-like actions together.

## User Story

As a **logged-in user or logged-out visitor**, I want the Pray tab to feel like a collaborative invitation rather than a transactional interface so that the experience of asking for prayer feels human and warm.

## Requirements

### Functional Requirements

1. Submit button text changes from "Generate Prayer" to "Help Me Pray" -- no logic changes, only the visible label.
2. Heading "What's On Your Heart?" uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) instead of Caveat script accent and `text-white`.
3. The standalone `AmbientSoundPill` wrapper (below the heading) is removed from its current position.
4. `AmbientSoundPill` is inserted as the last child of the starter chips flex row, inline with the 3 existing chips.
5. The chip row flex container gains `items-center` for vertical alignment of the pill with the chips.
6. The pill uses `!mb-0` and `!w-auto` overrides to fit inline without taking full width on mobile.
7. The pill renders only when `showChips` is true (it lives inside the `{showChips && ...}` block) -- when a chip is selected or user types, both chips and pill disappear.
8. After reset (prayer submitted and user returns to input state), chips AND pill both reappear.

### Non-Functional Requirements

- **Performance:** No new state, effects, or event listeners. Render cost is zero -- just JSX relocation.
- **Accessibility:** No ARIA attribute changes. All existing `aria-label`, `aria-describedby`, and `aria-invalid` attributes remain untouched. The pill retains its existing accessibility features.

## Constraints

- **Visuals and copy only.** Do not modify any logic: chip selection, textarea behavior, crisis banner, retry prompt logic, submit handler, or prayer generation.
- Do not modify any ARIA attributes.
- The `AmbientSoundPill` component itself is NOT modified -- only its render location and className overrides change.

## Auth Gating

No auth gating changes. Existing behavior preserved:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Pray tab heading + chips | Can view | Can view | N/A |
| Click starter chip | Can click, fills textarea | Can click, fills textarea | N/A |
| Click AmbientSoundPill | Can interact (opens sound panel) | Can interact (opens sound panel) | N/A |
| Click "Help Me Pray" button | Auth modal appears | Generates prayer | "Sign in to generate a prayer" |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Chip row wraps to 2-3 rows: ~1 chip per row + pill on its own row. `!w-auto` prevents pill from going full-width. Heading `text-2xl`. |
| Tablet (640-1024px) | Chip row wraps gracefully, chips + pill may fit on 2 rows. Heading `text-3xl`. |
| Desktop (> 1024px) | All 3 chips + pill fit on a single row. Heading `text-4xl`. |

The pill visually groups with the chips as a "thing you can tap to enhance your input." Wrapping to an additional row on mobile is acceptable. No horizontal overflow.

## AI Safety Considerations

N/A for this change -- no new user input fields or AI-generated content introduced. Existing crisis banner, character count, and crisis keyword detection remain completely unchanged.

## Auth & Persistence

- **Logged-out users:** No change. Can view heading, chips, and pill. Cannot submit prayer (existing auth gate unchanged).
- **Logged-in users:** No change. Full prayer generation flow unchanged.
- **localStorage usage:** No new keys. No changes to existing keys.
- **Route type:** Public (the Pray tab within `/daily?tab=pray` is viewable by anyone).

## Completion & Navigation

N/A for this change -- no completion tracking modifications. Existing Daily Hub tab completion signals remain unchanged.

## Design Notes

- **Heading gradient:** Uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` -- the white-to-purple gradient (`linear-gradient(223deg, rgb(255, 255, 255) 0%, rgb(139, 92, 246) 100%)`) applied via `background-clip: text`. Same pattern used across all Homepage and Daily Hub headings per design system recon.
- **Caveat removal:** Removes the `font-script` Caveat accent `<span>` on "Heart?" -- consistent with the Round 3 pattern of phasing out Caveat in favor of gradient text (per `09-design-system.md` Typography section).
- **Pill inline styling:** The pill should feel like a sibling to the starter chips -- same flex row, similar height, similar border-radius. The pill's content (music icon + "Enhance with sound") reads as related but optional.
- **Pill expansion panel:** When clicked in idle state, the expansion panel drops down below the entire chip row (existing behavior, just from a new position).
- **Pill active state:** When audio is playing, the pill shows "Playing: [scene name]" -- this renders correctly inline with chips.
- **Design system recon reference:** Daily Hub Pray tab captured at `screenshots/daily-pray-desktop.png` and `screenshots/daily-pray-mobile.png` (captured 2026-04-05). Glow orb uses `GlowBackground` with `glowOpacity={0.30}` per live values in recon.

## Files to Edit

- `src/components/daily/PrayerInput.tsx` -- the only file changed.

## Out of Scope

- Modifying the `AmbientSoundPill` component itself (no changes to its internal markup, styles, or behavior).
- Changing any prayer generation logic, chip selection logic, or textarea behavior.
- Modifying any ARIA attributes or accessibility markup.
- Adding new state, effects, or event listeners.
- Responsive-specific pill placement (e.g., moving pill below chips on mobile only) -- start with unified approach.
- Any other Pray tab copy changes beyond the submit button text.
- Backend changes (Phase 3).

## Acceptance Criteria

- [ ] Submit button text reads "Help Me Pray" (not "Generate Prayer")
- [ ] Heading "What's On Your Heart?" uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) -- no Caveat `font-script` accent span
- [ ] Heading has `leading-tight` class for consistent line-height
- [ ] Standalone pill wrapper `<div className="z-10 mt-2 flex justify-center">` removed from below the heading
- [ ] `AmbientSoundPill` rendered as last child inside the starter chips flex row
- [ ] Pill uses `!mb-0 !w-auto` className overrides
- [ ] Chip row flex container includes `items-center` for vertical alignment
- [ ] Chip row (including pill) renders only when `showChips` is true
- [ ] After chip selection, both chips and pill disappear (pill is inside `showChips` block)
- [ ] After reset (handleReset), chips AND pill both reappear
- [ ] Pill active state ("Playing: [scene name]") renders correctly inline with chips
- [ ] Pill expansion panel drops down below entire chip row when clicked in idle state
- [ ] On mobile (375px), chip + pill row wraps gracefully with no horizontal overflow
- [ ] On desktop (1440px), all 3 chips + pill fit on a single row or wrap gracefully
- [ ] All existing auth gating, crisis banner, character count, and submit behavior unchanged
- [ ] No ARIA attribute changes
