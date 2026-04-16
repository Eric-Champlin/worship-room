# Journal Tab -- Ambient Pill Relocation

**Master Plan Reference:** N/A -- standalone feature (part of Round 3 enhancement series, sibling to `pray-tab-copy-ambient-pill.md`)

---

## Overview

The "Enhance with sound" pill on the Journal tab currently occupies its own row below the heading, creating an awkward visual break. Moving it inline with the Guided/Free Write mode toggle groups two secondary controls together -- both modify the journaling experience -- and tightens the layout for a cleaner, more focused writing space.

## User Story

As a **logged-in user or logged-out visitor**, I want the Journal tab layout to feel tighter and more cohesive so that the ambient sound option feels naturally grouped with the mode toggle rather than floating on its own.

## Requirements

### Functional Requirements

1. The standalone `AmbientSoundPill` wrapper (below the heading) is removed from its current position inside the heading block.
2. `AmbientSoundPill` is inserted as a sibling of the mode toggle `<div>`, inside the same flex parent.
3. The mode toggle outer wrapper gains `flex-wrap items-center gap-3` to allow the toggle and pill to sit on the same row, wrapping gracefully on narrow viewports.
4. The pill uses `!mb-0 !w-auto` overrides to fit inline without taking full width.
5. The heading retains its existing `GRADIENT_TEXT_STYLE` (no Caveat script) and gains no additional pill wrapper.
6. The pill is always visible on the Journal tab regardless of mode (Guided or Free Write) -- it lives outside any mode-conditional block.

### Non-Functional Requirements

- **Performance:** No new state, effects, or event listeners. Render cost is zero -- just JSX relocation.
- **Accessibility:** No ARIA attribute changes. All existing `aria-label`, `aria-pressed`, and `role="group"` attributes remain untouched. The pill retains its existing accessibility features.

## Constraints

- **Visuals only.** Do not modify any logic: mode toggle behavior, draft auto-save, crisis banner, textarea behavior, voice input, or save handler.
- Do not modify any ARIA attributes or focus-visible styles.
- The `AmbientSoundPill` component itself is NOT modified -- only its render location and className overrides change.

## Auth Gating

No auth gating changes. Existing behavior preserved:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Journal tab heading + mode toggle | Can view | Can view | N/A |
| Click mode toggle (Guided/Free Write) | Can toggle, mode persists | Can toggle, mode persists | N/A |
| Click AmbientSoundPill | Can interact (opens sound panel) | Can interact (opens sound panel) | N/A |
| Type in textarea | Can type, draft auto-saves to localStorage | Can type, draft auto-saves | N/A |
| Click "Save Entry" | Auth modal appears | Saves entry | "Sign in to save your journal entries" |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Mode toggle (~180px) + pill (~140px) = ~332px fits within 343px container (375px - 32px padding). Side-by-side on one row. If viewport is narrower, `flex-wrap` drops pill to second row. |
| Tablet (640-1024px) | Toggle + pill fit comfortably on a single row with `gap-3` spacing. |
| Desktop (> 1024px) | Toggle + pill on a single row, centered. Heading `text-4xl`. |

No horizontal overflow at any breakpoint. The pill wrapping to a second row on very narrow devices is acceptable fallback behavior.

## AI Safety Considerations

N/A for this change -- no new user input fields or AI-generated content introduced. Existing crisis banner and crisis keyword detection remain completely unchanged.

## Auth & Persistence

- **Logged-out users:** No change. Can view heading, toggle, and pill. Cannot save entries (existing auth gate unchanged).
- **Logged-in users:** No change. Full journaling flow unchanged.
- **localStorage usage:** No new keys. No changes to existing keys.
- **Route type:** Public (the Journal tab within `/daily?tab=journal` is viewable by anyone).

## Completion & Navigation

N/A for this change -- no completion tracking modifications. Existing Daily Hub tab completion signals remain unchanged.

## Design Notes

- **Heading:** Already uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx`. If the Caveat `<span>` was previously removed (by Spec 4 or similar), only the pill wrapper removal is needed in the heading block.
- **Pill inline styling:** The pill should feel like a sibling to the mode toggle -- same flex row, similar height (~44px). The pill's content (music icon + "Enhance with sound") reads as a secondary control alongside the mode selector.
- **Pill expansion panel:** When clicked, the expansion panel drops down below the entire toggle + pill row (existing behavior, just from a new position).
- **Pill active state:** When audio is playing, the pill shows "Playing: [scene name]" -- this renders correctly inline with the toggle.
- **Design system recon reference:** Design system recon found at `_plans/recon/design-system.md`. Daily Hub Journal tab uses `GlowBackground` + `BackgroundSquiggle` layered background per `09-design-system.md`.

## Files to Edit

- `src/components/daily/JournalInput.tsx` -- the only file changed.

## Out of Scope

- Modifying the `AmbientSoundPill` component itself (no changes to its internal markup, styles, or behavior).
- Changing any mode toggle logic, draft auto-save, crisis banner, textarea behavior, voice input, or save handler.
- Modifying any ARIA attributes or accessibility markup.
- Adding new state, effects, or event listeners.
- Any other Journal tab copy or heading changes.
- Backend changes (Phase 3).

## Acceptance Criteria

- [ ] Standalone pill wrapper `<div className="z-10 mt-2 flex justify-center">` removed from heading block
- [ ] Heading block contains only the `<h2>` with `GRADIENT_TEXT_STYLE` -- no pill, no Caveat script
- [ ] Mode toggle outer wrapper updated: `flex justify-center` -> `flex flex-wrap items-center justify-center gap-3`
- [ ] `AmbientSoundPill` inserted immediately after the mode toggle `<div>`, inside the same flex parent
- [ ] Pill uses `!mb-0 !w-auto` className overrides
- [ ] Mode toggle styling and behavior completely unchanged (both buttons render with correct active/inactive states, `aria-pressed` works, mode persists to localStorage)
- [ ] Pill renders in both Guided and Free Write modes (not inside any mode-conditional block)
- [ ] Pill active state ("Playing: [scene name]") renders correctly inline with mode toggle
- [ ] Pill expansion panel drops below the toggle + pill row when clicked
- [ ] On mobile (375px), mode toggle + pill fit on single row or wrap gracefully with no horizontal overflow
- [ ] On desktop (1440px), toggle + pill sit on a single centered row
- [ ] Draft auto-save, crisis banner, textarea behavior, voice input, and save handler all continue working unchanged
- [ ] No ARIA attribute changes
