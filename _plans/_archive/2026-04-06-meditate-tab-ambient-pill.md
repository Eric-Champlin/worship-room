# Implementation Plan: Meditate Tab Ambient Pill Relocation

**Spec:** `_specs/meditate-tab-ambient-pill.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/meditate-tab-ambient-pill`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a single-file production change to `frontend/src/components/daily/MeditateTabContent.tsx`. No new components, no new state, no new hooks, no routing changes, no data model changes.

**File involved:**

1. `frontend/src/components/daily/MeditateTabContent.tsx` (169 lines) — the only production file changed. Contains:
   - Heading wrapper `<div className="mb-4">` at line 72
   - `<h2 className="text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl">` at lines 73-78 with `GRADIENT_TEXT_STYLE`
   - `AmbientSoundPill` in a standalone wrapper `<div className="z-10 mt-2 flex justify-center">` at lines 79-81
   - Pill currently has `className="mb-0"` (not `!mb-0`)

**Sibling patterns (completed same day):**
- **PrayerInput.tsx** (Pray tab): Pill placed inside the chips flex row as last child with `!mb-0 !w-auto` overrides. `items-center` added to row. Test: `closest('div.flex')` comparison between chip and pill.
- **JournalInput.tsx** (Journal tab): Pill placed inside the mode toggle flex row as last child with `!mb-0 !w-auto` overrides. `flex-wrap items-center gap-3` added to row. Test: `parentElement.contains(pillButton)` from the toggle group.

**Meditate is different**: No chips row, no mode toggle. The pill goes inline with the heading itself inside a flex container that stacks vertically on mobile and goes horizontal on tablet+.

**AmbientSoundPill component (`AmbientSoundPill.tsx` line 116):**
- Outer wrapper: `<div ref={containerRef} className={cn('mb-4', className)}>` — `!mb-0` overrides `mb-4` via tailwind-merge important
- Idle `aria-label`: `'Enhance with sound'`
- Active `aria-label`: `'Playing: {sceneName}, click to open audio controls'`
- The `w-full` behavior in some states needs `!w-auto` on the outer div to prevent stretching in a flex container

**Test file:**
- `frontend/src/pages/__tests__/MeditateLanding.test.tsx` — 12 existing tests (181 lines). Tests gradient heading, no Caveat, glow, frosted glass cards, hover lift, focus ring, suggested card, 6 cards, navigation, auth modal, completion, checkmarks.
- No existing assertions about pill position relative to heading.
- Provider wrapping: `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → component. AudioProvider mocked via `vi.mock`.
- Pill is queryable via `getByLabelText(/enhance with sound/i)`.

---

## Auth Gating Checklist

No new auth-gated actions. All existing auth gates are preserved unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No auth gating changes | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Heading | style | `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) | Already applied — no change |
| Heading | className (before) | `text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl` | MeditateTabContent.tsx line 74 |
| Heading | className (after) | `font-sans text-2xl font-bold sm:text-3xl lg:text-4xl` | Remove `text-center` — flex parent handles centering |
| Heading wrapper | className (before) | `mb-4` | MeditateTabContent.tsx line 72 |
| Heading wrapper | className (after) | `mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4` | Spec AC1 |
| AmbientSoundPill | className override | `!mb-0 !w-auto` | Spec AC5 |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` for Daily Hub headings (white-to-purple gradient via `background-clip: text`), NOT Caveat. Caveat is being phased out.
- All tabs share `max-w-2xl` container width.
- The `AmbientSoundPill` component itself is NOT modified — only its render location and className overrides.
- AmbientSoundPill outer wrapper is `<div className={cn('mb-4', className)}>` — the `!mb-0` overrides `mb-4`.
- Recent sibling plans (2026-04-06 pray-tab and journal-tab): Same pill relocation pattern executed successfully with zero deviations. Pill queried via `getByLabelText(/enhance with sound/i)`.
- The pill's `w-full` class in active state requires `!w-auto` override to prevent stretching in a flex parent.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

**Breakpoints and layout behavior:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Heading stacks on top, pill centered below. `flex-col items-center gap-3`. Both centered. |
| Tablet | 768px | Heading and pill side-by-side on one horizontal row. `sm:flex-row sm:items-center sm:justify-center sm:gap-4`. |
| Desktop | 1440px | Same as tablet — single horizontal row, centered. Heading `text-4xl`. |

No custom breakpoints. Standard Tailwind `sm`.

---

## Vertical Rhythm

Not applicable — this change does not alter spacing between page sections. The heading wrapper's `mb-4` is preserved. The standalone pill wrapper's `mt-2` gap is replaced by the flex container's `gap-3` (12px, identical to the original visual spacing). No change to distance from heading block to card grid below.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/meditate-tab-ambient-pill` exists and is checked out
- [x] Sibling specs (pray-tab-copy-ambient-pill, journal-tab-ambient-pill) are committed on `main` or merged
- [x] No auth gating changes needed (confirmed by spec)
- [x] Design system values verified from codebase inspection (MeditateTabContent.tsx lines 72-81)
- [x] No [UNVERIFIED] values — all values come from existing code
- [x] Recon report not applicable (layout change, not new visual design)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `!mb-0` vs `mb-0` | Use `!mb-0` (important) | AmbientSoundPill has `cn('mb-4', className)` — while tailwind-merge resolves `mb-0` vs `mb-4`, using `!mb-0` is consistent with Pray and Journal tabs and guarantees the override |
| `!w-auto` on pill | Include | AmbientSoundPill's button has `w-full` in some states; `!w-auto` on the outer div prevents the pill from stretching to fill the flex row |
| `text-center` removal from h2 | Remove | The parent flex container with `items-center` + `sm:justify-center` handles centering. `text-center` on the h2 is redundant and could cause unexpected text alignment behavior if the heading wraps to multiple lines |
| Test approach | Query pill via `getByLabelText(/enhance with sound/i)`, verify shared parent with heading via `closest` | Matches the proven pattern from PrayTabContent tests |

---

## Implementation Steps

### Step 1: Update MeditateTabContent.tsx layout

**Objective:** Move the ambient sound pill from its standalone wrapper into the heading flex container, matching the inline pattern from Pray and Journal tabs.

**Files to create/modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — 3 edits

**Details:**

**Edit 1 — Update heading wrapper div (line 72):**

Replace:
```tsx
<div className="mb-4">
```

With:
```tsx
<div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
```

**Edit 2 — Remove `text-center` from h2 (lines 73-78):**

Replace:
```tsx
<h2
  className="text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl"
  style={GRADIENT_TEXT_STYLE}
>
```

With:
```tsx
<h2
  className="font-sans text-2xl font-bold sm:text-3xl lg:text-4xl"
  style={GRADIENT_TEXT_STYLE}
>
```

**Edit 3 — Remove standalone pill wrapper and place pill as direct sibling of h2 (lines 79-81):**

Replace:
```tsx
<div className="z-10 mt-2 flex justify-center">
  <AmbientSoundPill context="meditate" variant="dark" className="mb-0" />
</div>
```

With:
```tsx
<AmbientSoundPill context="meditate" variant="dark" className="!mb-0 !w-auto" />
```

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): Heading and pill side-by-side, centered, 16px gap
- Tablet (768px): Same as desktop — `sm:flex-row` activates at 640px
- Mobile (375px): Heading above, pill below, centered, 12px gap

**Guardrails (DO NOT):**
- DO NOT modify the `AmbientSoundPill` component itself
- DO NOT change the `GlowBackground` or `BackgroundSquiggle` layering
- DO NOT change the meditation card grid or its auth gating
- DO NOT modify the celebration banner
- DO NOT add or remove any imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production change only — tests in Step 2 |

**Expected state after completion:**
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` succeeds
- [ ] Heading and pill render as a flex row on tablet+ and stacked column on mobile
- [ ] Pill expansion panel still drops down correctly
- [ ] All 12 existing tests pass without modification

---

### Step 2: Add tests for pill relocation

**Objective:** Add tests to `MeditateLanding.test.tsx` verifying the pill is inline with the heading and the flex container has correct classes.

**Files to create/modify:**
- `frontend/src/pages/__tests__/MeditateLanding.test.tsx` — add 3 new tests inside the existing `describe('MeditateTabContent')` block, after the last existing test

**Details:**

Add these 3 tests at the end of the describe block (before the closing `})`):

```tsx
it('ambient sound pill renders inline with heading (same flex container)', () => {
  renderComponent()
  const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
  const pillButton = screen.getByLabelText(/enhance with sound/i)
  const headingParent = heading.parentElement
  expect(headingParent).not.toBeNull()
  expect(headingParent!.contains(pillButton)).toBe(true)
})

it('heading flex container has responsive inline classes', () => {
  renderComponent()
  const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
  const container = heading.parentElement!
  expect(container.className).toContain('flex')
  expect(container.className).toContain('flex-col')
  expect(container.className).toContain('items-center')
  expect(container.className).toContain('gap-3')
  expect(container.className).toContain('sm:flex-row')
  expect(container.className).toContain('sm:gap-4')
})

it('heading does not have text-center (flex parent handles centering)', () => {
  renderComponent()
  const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
  expect(heading.className).not.toContain('text-center')
})
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any existing tests
- DO NOT add new mocks — all needed mocks (AudioProvider, useScenePlayer) are already in the file
- DO NOT create a new test file — add to the existing `MeditateLanding.test.tsx`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| pill renders inline with heading | integration | Verify pill button is a descendant of the heading's parent flex container |
| heading flex container has responsive classes | integration | Verify `flex`, `flex-col`, `items-center`, `gap-3`, `sm:flex-row`, `sm:gap-4` classes on heading parent |
| heading does not have text-center | unit | Verify `text-center` was removed from h2 className |

**Expected state after completion:**
- [ ] All 15 tests pass (12 existing + 3 new)
- [ ] No test modifications to existing tests
- [ ] `pnpm test -- --run frontend/src/pages/__tests__/MeditateLanding.test.tsx` exits 0

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update MeditateTabContent.tsx layout |
| 2 | 1 | Add tests for pill relocation |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update MeditateTabContent.tsx layout | [COMPLETE] | 2026-04-06 | `MeditateTabContent.tsx` — heading wrapper flex classes added, `text-center` removed from h2, standalone pill wrapper removed, pill placed as sibling of h2 with `!mb-0 !w-auto`. Zero deviations from plan. |
| 2 | Add tests for pill relocation | [COMPLETE] | 2026-04-06 | `MeditateLanding.test.tsx` — 3 new tests added (pill inline with heading, responsive flex classes, no text-center on h2). All 15 tests pass. Zero deviations from plan. |
