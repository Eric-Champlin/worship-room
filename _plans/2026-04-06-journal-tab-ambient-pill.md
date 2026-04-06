# Implementation Plan: Journal Tab Ambient Pill Relocation

**Spec:** `_specs/journal-tab-ambient-pill.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/journal-tab-ambient-pill`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a single-file change to `frontend/src/components/daily/JournalInput.tsx`. No new components, no new state, no new hooks, no routing changes, no data model changes.

**File involved:**

1. `frontend/src/components/daily/JournalInput.tsx` (335 lines) — the only production file changed. Contains:
   - Heading "What's On Your Mind?" at lines 148-159, already uses `GRADIENT_TEXT_STYLE` and `leading-tight`
   - `AmbientSoundPill` in a standalone wrapper `<div className="z-10 mt-2 flex justify-center">` at lines 156-158
   - Mode toggle in its own flex container at lines 161-191: `<div className="mb-6 flex justify-center">`
   - The pill is NOT inside any mode-conditional block — it's always visible

**Sibling pattern (PrayerInput.tsx):** The Pray tab pill relocation (completed same day) moved the pill into the chips flex row with `!mb-0 !w-auto` overrides and added `items-center` to the flex container. This spec follows the same pattern but places the pill next to the mode toggle instead of chips.

**AmbientSoundPill component (`AmbientSoundPill.tsx`):**
- Outer wrapper: `<div className={cn('mb-4', className)}>` — `!mb-0` overrides the `mb-4` default
- Idle `aria-label`: `'Enhance with sound'`
- Active `aria-label`: `'Playing: {sceneName}, click to open audio controls'`
- Button has `w-full` class in some states — `!w-auto` on the outer div prevents full-width stretching

**Test files — NO existing tests reference the pill's position relative to the mode toggle:**
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — has atmospheric visual tests (gradient heading, no Caveat, leading-tight) at lines 444-468. Pill is mocked via AudioProvider mock. No assertions about pill location.
- `frontend/src/pages/__tests__/Journal.test.tsx` — has heading test at line 246. No pill position assertions.

**Test provider wrapping (unchanged):** `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → component. AudioProvider mocked via `vi.mock`.

**No auth gating changes.** The save button auth gate is in `JournalInput.tsx` line 130 (`!isAuthenticated` → `authModal?.openAuthModal`). Unchanged.

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
| Heading | className | `text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl` | Already applied — no change |
| Mode toggle container | className (before) | `mb-6 flex justify-center` | JournalInput.tsx line 162 |
| Mode toggle container | className (after) | `mb-6 flex flex-wrap items-center justify-center gap-3` | Spec Change 2 |
| Mode toggle buttons | className | `min-h-[44px] rounded-l-lg / rounded-r-lg px-4 py-2 text-sm font-medium` | Already applied — no change |
| AmbientSoundPill | className override | `!mb-0 !w-auto` | Spec FR4 |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` for Daily Hub headings (white-to-purple gradient via `background-clip: text`), NOT Caveat. Caveat is being phased out.
- All tabs share `max-w-2xl` container width.
- The `AmbientSoundPill` component itself is NOT modified — only its render location and className overrides.
- AmbientSoundPill outer wrapper is `<div className={cn('mb-4', className)}>` — the `!mb-0` overrides `mb-4`.
- Mode toggle buttons use `min-h-[44px]` for 44px touch target compliance.
- Recent sibling plan (2026-04-06 pray-tab-copy-ambient-pill): Same pattern executed successfully. Pill queried via `getByLabelText(/enhance with sound/i)`.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

**Breakpoints and layout behavior:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Mode toggle (~180px) + pill (~140px) = ~332px fits within 343px container. `flex-wrap` drops pill to second row if narrower. |
| Tablet | 768px | Toggle + pill fit comfortably on a single row with `gap-3` (12px). |
| Desktop | 1440px | Toggle + pill on single centered row. Heading `text-4xl`. |

No custom breakpoints. Standard Tailwind `sm`/`lg`.

---

## Vertical Rhythm

Not applicable — this change does not alter spacing between page sections. The pill relocation removes one wrapper div (`mt-2` gap between heading and pill) and places the pill inside the mode toggle row. The heading block's `mb-4` and the mode toggle row's `mb-6` remain unchanged, so the vertical distance from heading to content below the toggle row is preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `JournalInput.tsx` is the only production file changed
- [x] The heading already uses `GRADIENT_TEXT_STYLE` (confirmed at line 151-152)
- [x] The `AmbientSoundPill` is already imported (line 12)
- [x] `GRADIENT_TEXT_STYLE` is already imported (line 14)
- [x] The pill is NOT inside any mode-conditional block — it's always visible regardless of Guided/Free Write
- [x] All auth-gated actions from the spec are accounted for (none — no changes)
- [x] Design system values are verified (from codebase inspection of JournalInput.tsx)
- [x] No [UNVERIFIED] values — all changes are position/className only
- [x] No existing test assertions reference the pill's position relative to the mode toggle

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pill `!mb-0` important modifier | Use `!mb-0` override | AmbientSoundPill wraps in `<div className={cn('mb-4', className)}>` — `!` ensures override without modifying the component |
| Pill `!w-auto` important modifier | Use `!w-auto` override | AmbientSoundPill button has `w-full` in some states; `!` prevents full-width on mobile |
| `gap-3` (not `gap-2`) | Use `gap-3` (12px) | Spec specifies `gap-3`. The Pray tab used `gap-2` because it had multiple smaller chips. The toggle is a larger single element so slightly more spacing looks better. |
| Pill always visible | Yes — pill is outside mode-conditional blocks | Unlike PrayerInput where the pill is inside `{showChips && ...}`, Journal's pill must be visible in both Guided and Free Write modes |
| Comment update | Update `{/* Mode Toggle */}` to `{/* Mode Toggle + Ambient Pill */}` | Spec Change 2 updates the comment to reflect the new content |

---

## Implementation Steps

### Step 1: Update JournalInput.tsx — relocate pill to mode toggle row

**Objective:** Move AmbientSoundPill from standalone wrapper below heading to inline with mode toggle.

**Files to modify:**
- `frontend/src/components/daily/JournalInput.tsx` — the only production file

**Details:**

Two surgical edits in `JournalInput.tsx`:

1. **Remove the standalone pill wrapper** (lines 156-158):
   Delete:
   ```tsx
        <div className="z-10 mt-2 flex justify-center">
          <AmbientSoundPill context="journal" variant="dark" className="mb-0" />
        </div>
   ```
   The heading block (lines 148-159) becomes:
   ```tsx
      {/* Heading */}
      <div className="mb-4">
        <h2
          className="text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
          style={GRADIENT_TEXT_STYLE}
        >
          What&apos;s On Your Mind?
        </h2>
      </div>
   ```

2. **Update mode toggle wrapper and add pill** (lines 161-191):
   Change the outer container from:
   ```tsx
      {/* Mode Toggle */}
      <div className="mb-6 flex justify-center">
   ```
   To:
   ```tsx
      {/* Mode Toggle + Ambient Pill */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
   ```

   Then add `AmbientSoundPill` as the last child of this container, after the closing `</div>` of the `role="group"` div (after line 190) but before the closing `</div>` of the outer container:
   ```tsx
        </div>
        <AmbientSoundPill context="journal" variant="dark" className="!mb-0 !w-auto" />
      </div>
   ```

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): Toggle + pill fit on a single centered row with `gap-3`
- Tablet (768px): Toggle + pill fit on a single row
- Mobile (375px): Toggle (~180px) + pill (~140px) + gap (12px) = ~332px fits within 343px container; `flex-wrap` handles narrower viewports

**Guardrails (DO NOT):**
- DO NOT modify the `AmbientSoundPill` component itself — only its render location and className overrides
- DO NOT change any logic: mode toggle behavior, draft auto-save, crisis banner, textarea behavior, voice input, save handler
- DO NOT modify any ARIA attributes (`role="group"`, `aria-label="Journal mode"`, `aria-pressed`)
- DO NOT add new state, effects, or event listeners
- DO NOT change the heading text, styling, or `GRADIENT_TEXT_STYLE`
- DO NOT modify mode toggle button classNames or onClick handlers
- DO NOT place the pill inside any mode-conditional block — it must be visible in both Guided and Free Write modes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production changes only in this step — tests added in Step 2 |

**Expected state after completion:**
- [ ] `AmbientSoundPill` renders inside the mode toggle flex row as the last child
- [ ] Standalone pill wrapper div (`z-10 mt-2 flex justify-center`) is removed from heading block
- [ ] Mode toggle container has `flex-wrap items-center gap-3` classes
- [ ] Pill uses `!mb-0 !w-auto` className overrides
- [ ] Mode toggle buttons are completely unchanged (same classes, same handlers, same ARIA)
- [ ] `pnpm build` passes with 0 errors (run `cd frontend && npx tsc --noEmit` to verify)

---

### Step 2: Add tests for pill relocation

**Objective:** Add targeted tests verifying the pill's new position inline with the mode toggle.

**Files to modify:**
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — add tests to the existing `atmospheric visuals` describe block (after line 468)

**Details:**

Add 4 new tests to the `JournalTabContent atmospheric visuals` describe block:

```tsx
it('ambient sound pill renders inline with mode toggle (same flex container)', () => {
  renderJournalTab()
  const guidedButton = screen.getByRole('button', { name: 'Guided' })
  const pillButton = screen.getByLabelText(/enhance with sound/i)
  // The pill's wrapper and the mode toggle should share the same flex parent
  const toggleGroup = guidedButton.closest('[role="group"]')
  const sharedParent = toggleGroup?.parentElement
  expect(sharedParent).not.toBeNull()
  expect(sharedParent!.contains(pillButton)).toBe(true)
})

it('mode toggle + pill container has flex-wrap and items-center', () => {
  renderJournalTab()
  const guidedButton = screen.getByRole('button', { name: 'Guided' })
  const toggleGroup = guidedButton.closest('[role="group"]')
  const container = toggleGroup?.parentElement
  expect(container).not.toBeNull()
  expect(container!.className).toContain('flex-wrap')
  expect(container!.className).toContain('items-center')
  expect(container!.className).toContain('gap-3')
})

it('pill is visible in Guided mode', () => {
  renderJournalTab()
  expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
})

it('pill is visible in Free Write mode', async () => {
  const user = userEvent.setup()
  renderJournalTab()
  const freeWriteButton = screen.getByRole('button', { name: 'Free Write' })
  await user.click(freeWriteButton)
  expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
})
```

**Note on querying:** Verify the `renderJournalTab()` helper function name and `userEvent` import exist in the test file during execution. Check lines 1-50 of the test file for the helper and imports.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing tests
- DO NOT test the AmbientSoundPill's internal behavior (that's covered in `AmbientSoundPill.test.tsx`)
- DO NOT add tests for features not changed in this spec (crisis banner, auth gating, character count, voice input)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| pill inline with toggle | integration | Pill and mode toggle share the same flex parent |
| container classes | integration | Container has `flex-wrap`, `items-center`, `gap-3` |
| pill visible in Guided | integration | Pill renders in Guided mode |
| pill visible in Free Write | integration | Pill renders in Free Write mode |

**Expected state after completion:**
- [ ] 4 new tests added to atmospheric visuals describe block
- [ ] `pnpm test` passes with 0 failures
- [ ] Full test suite passes (build + tests green)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update JournalInput.tsx: relocate pill to mode toggle row |
| 2 | 1 | Add tests for pill relocation |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update JournalInput.tsx | [COMPLETE] | 2026-04-06 | `JournalInput.tsx`: removed standalone pill wrapper (lines 156-158), updated mode toggle container with `flex-wrap items-center gap-3`, added pill as last child with `!mb-0 !w-auto`. No deviations. |
| 2 | Add tests for pill relocation | [COMPLETE] | 2026-04-06 | `JournalTabContent.test.tsx`: 4 new tests added to atmospheric visuals block. 32/32 pass. No deviations. |
