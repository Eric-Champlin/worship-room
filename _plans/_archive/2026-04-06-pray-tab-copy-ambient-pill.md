# Implementation Plan: Pray Tab Copy and Ambient Pill Relocation

**Spec:** `_specs/pray-tab-copy-ambient-pill.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/pray-tab-copy-ambient-pill`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a single-file change to `frontend/src/components/daily/PrayerInput.tsx`. No new components, no new state, no new hooks, no routing changes, no data model changes.

**File involved:**

1. `frontend/src/components/daily/PrayerInput.tsx` (157 lines) — the only production file changed. Contains:
   - Heading "What's On Your Heart?" at line 80-85 (already uses `GRADIENT_TEXT_STYLE`)
   - `AmbientSoundPill` in a standalone wrapper `<div className="z-10 mt-2 flex justify-center">` at lines 86-88
   - Starter chips in a `{showChips && ...}` block at lines 97-110, flex row: `<div className="mb-6 flex flex-wrap justify-center gap-2">`
   - Submit button "Generate Prayer" at line 152
   - `showChips` derived: `const showChips = !selectedChip && !text` (line 75)

**Test files that reference "Generate Prayer" (must be updated to "Help Me Pray"):**

1. `frontend/src/pages/__tests__/Pray.test.tsx` — 8 occurrences at lines 134, 149, 176, 227, 248, 262, 271, 294
2. `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — 5 occurrences at lines 702, 704, 750, 760, 767

**Test provider wrapping (unchanged):** `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → component. AudioProvider mocked via `vi.mock`.

**Existing atmospheric visual tests** in `PrayTabContent.test.tsx` at lines 772-789 already assert on gradient heading and no-Caveat. These remain valid — the heading text and styling are unchanged.

**No auth gating changes.** The submit button auth gate is in `PrayTabContent.tsx` (the parent), not in `PrayerInput.tsx`.

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
| Chips | container | `flex flex-wrap justify-center gap-2 items-center` | Existing + adding `items-center` |
| Chips | individual | `min-h-[44px] shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70` | Existing — no change |
| AmbientSoundPill | className override | `!mb-0 !w-auto` | Spec FR6 |
| Submit button | text | "Help Me Pray" | Spec FR1 |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` for Daily Hub headings (white-to-purple gradient via `background-clip: text`), NOT Caveat. Caveat is being phased out.
- All tabs share `max-w-2xl` container width.
- GlowBackground uses `glowOpacity={0.30}` on all live call sites — never the component defaults.
- Chips use `min-h-[44px]` for 44px touch target compliance.
- The `AmbientSoundPill` component itself is NOT modified — only its render location and className overrides.
- Recent plan deviation (2026-04-04 pray-journal-atmosphere Step 3): `Pray.test.tsx` had old `<span>Heart?</span>` expectation that needed updating after heading changes. Watch for similar stale assertions.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

**Breakpoints and layout behavior:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Chip row wraps to 2-3 rows: ~1 chip per row + pill on its own row. `!w-auto` prevents pill from going full-width. Heading `text-2xl`. |
| Tablet | 768px | Chip row wraps gracefully, chips + pill may fit on 2 rows. Heading `text-3xl`. |
| Desktop | 1440px | All 3 chips + pill fit on a single row. Heading `text-4xl`. |

No custom breakpoints. Standard Tailwind `sm`/`lg`.

---

## Vertical Rhythm

Not applicable — this change does not alter spacing between page sections. The pill relocation removes one wrapper div (`mt-2` gap between heading and pill) and places the pill inside the chips row, which tightens the heading-to-chips spacing slightly (the standalone pill wrapper had its own `mt-2`). This is the intended behavior per spec.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `PrayerInput.tsx` is the only production file changed
- [x] The heading already uses `GRADIENT_TEXT_STYLE` (confirmed at line 82)
- [x] The `AmbientSoundPill` is already imported (line 5)
- [x] `showChips` logic at line 75 controls chip visibility — pill will share this gate
- [x] All auth-gated actions from the spec are accounted for (none — no changes)
- [x] Design system values are verified (from codebase inspection of PrayerInput.tsx)
- [x] No [UNVERIFIED] values — all changes are copy/position only
- [x] 13 test assertions across 2 files reference "Generate Prayer" and must update to "Help Me Pray"

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pill `!mb-0` important modifier | Use `!mb-0` override | AmbientSoundPill has its own `mb-*` classes internally; `!` ensures override without modifying the component |
| Pill `!w-auto` important modifier | Use `!w-auto` override | AmbientSoundPill may have width classes internally; `!` prevents full-width on mobile |
| Pill inside `showChips` block | Yes — pill lives inside `{showChips && ...}` | Spec FR7: pill disappears with chips when user types or selects a chip, reappears on reset |
| Heading `leading-tight` | Keep as-is | Already present at line 81. Spec AC3 confirms. No change needed. |
| Existing `mb-0` on AmbientSoundPill | Replace with `!mb-0 !w-auto` | Current prop is `className="mb-0"` (line 87). New prop is `className="!mb-0 !w-auto"` |

---

## Implementation Steps

### Step 1: Update PrayerInput.tsx — relocate pill, update button text

**Objective:** Move AmbientSoundPill from standalone wrapper to inside chips row, change submit button text.

**Files to modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — the only production file

**Details:**

Three surgical edits in `PrayerInput.tsx`:

1. **Remove the standalone pill wrapper** (lines 86-88):
   Delete:
   ```tsx
   <div className="z-10 mt-2 flex justify-center">
     <AmbientSoundPill context="pray" variant="dark" className="mb-0" />
   </div>
   ```

2. **Add pill as last child inside the chips flex row AND add `items-center`** (lines 97-110):
   Change the chips container from:
   ```tsx
   {showChips && (
     <div className="mb-6 flex flex-wrap justify-center gap-2">
       {DEFAULT_PRAYER_CHIPS.map((chip) => (
         ...
       ))}
     </div>
   )}
   ```
   To:
   ```tsx
   {showChips && (
     <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
       {DEFAULT_PRAYER_CHIPS.map((chip) => (
         ...
       ))}
       <AmbientSoundPill context="pray" variant="dark" className="!mb-0 !w-auto" />
     </div>
   )}
   ```

3. **Change submit button text** (line 152):
   Change `Generate Prayer` to `Help Me Pray`.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): All 3 chips + pill fit on a single row within the `gap-2` flex layout
- Tablet (768px): Chips + pill wrap gracefully to ~2 rows
- Mobile (375px): Chips + pill wrap to multiple rows; `!w-auto` prevents pill from taking full width

**Guardrails (DO NOT):**
- DO NOT modify the `AmbientSoundPill` component itself — only its render location and className overrides
- DO NOT change any logic: chip selection, textarea behavior, crisis banner, submit handler
- DO NOT modify any ARIA attributes
- DO NOT add new state, effects, or event listeners
- DO NOT change the heading text or styling (it already uses `GRADIENT_TEXT_STYLE` and `leading-tight`)
- DO NOT touch the `showChips` derivation logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production changes only in this step — tests updated in Step 2 |

**Expected state after completion:**
- [ ] Submit button reads "Help Me Pray"
- [ ] `AmbientSoundPill` renders inside the chips flex row as the last child
- [ ] Standalone pill wrapper div (`z-10 mt-2 flex justify-center`) is removed
- [ ] Chips container has `items-center` class
- [ ] Pill uses `!mb-0 !w-auto` className overrides
- [ ] `pnpm build` passes with 0 errors

---

### Step 2: Update test files — "Generate Prayer" → "Help Me Pray"

**Objective:** Update all test assertions that reference the old button text.

**Files to modify:**
- `frontend/src/pages/__tests__/Pray.test.tsx` — 8 occurrences of `'Generate Prayer'` at lines 134, 149, 176, 227, 248, 262, 271, 294
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — 5 occurrences at lines 702, 704, 750, 760, 767

**Details:**

Global find-and-replace in both files: `'Generate Prayer'` → `'Help Me Pray'`.

Additionally, in `PrayTabContent.test.tsx` line 702, update the test description:
```tsx
// From:
it('existing Generate Prayer button still present', () => {
// To:
it('existing Help Me Pray button still present', () => {
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any test logic or assertions beyond the text change
- DO NOT add or remove tests in this step
- DO NOT change mock setup or provider wrapping

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests | integration | Verify all 13 updated assertions pass with new button text |

**Expected state after completion:**
- [ ] Zero references to `'Generate Prayer'` in any test file
- [ ] `pnpm test` passes with 0 failures
- [ ] No new test warnings

---

### Step 3: Add new tests for pill relocation and copy change

**Objective:** Add targeted tests verifying the pill's new position, chip row alignment, and button copy.

**Files to modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add tests to the existing `atmospheric visuals` describe block (after line 789)

**Details:**

Add 4 new tests to the `PrayTabContent atmospheric visuals` describe block:

```tsx
it('submit button reads "Help Me Pray"', () => {
  renderPrayTab()
  expect(screen.getByRole('button', { name: 'Help Me Pray' })).toBeInTheDocument()
})

it('ambient sound pill renders inside chips row (same container)', () => {
  renderPrayTab()
  // The pill should be a sibling of the starter chips in the same flex container
  const chip = screen.getByText("I'm struggling with...")
  const pillButton = screen.getByLabelText(/enhance with sound/i)
  expect(chip.closest('div.flex')).toBe(pillButton.closest('div.flex'))
})

it('chips row has items-center for vertical alignment', () => {
  renderPrayTab()
  const chip = screen.getByText("I'm struggling with...")
  const chipsContainer = chip.closest('div.flex')
  expect(chipsContainer).toHaveClass('items-center')
})

it('pill disappears when user types in textarea', async () => {
  const user = userEvent.setup()
  renderPrayTab()
  // Pill is visible initially
  expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
  // Type in textarea
  const textarea = screen.getByLabelText('Prayer request')
  await user.type(textarea, 'Help me')
  // Pill should be gone (chips + pill disappear together)
  expect(screen.queryByLabelText(/enhance with sound/i)).not.toBeInTheDocument()
})
```

**Note on pill query:** The `AmbientSoundPill` renders a button with `aria-label` containing "Enhance with sound" (per the AmbientSoundPill component). If the exact `aria-label` differs, adjust the query. Verify by checking `AmbientSoundPill.tsx` during execution.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing tests
- DO NOT test the AmbientSoundPill's internal behavior (that's covered in `AmbientSoundPill.test.tsx`)
- DO NOT add tests for features not changed in this spec (crisis banner, auth gating, character count)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| submit button text | integration | Button reads "Help Me Pray" |
| pill in chips row | integration | Pill and chips share the same flex container |
| chips-row items-center | integration | Container has `items-center` class |
| pill hides on type | integration | Pill disappears when textarea has content |

**Expected state after completion:**
- [ ] 4 new tests added
- [ ] `pnpm test` passes with 0 failures
- [ ] Full test suite passes (build + tests green)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update PrayerInput.tsx: relocate pill, change button text |
| 2 | 1 | Update test files: "Generate Prayer" → "Help Me Pray" |
| 3 | 1, 2 | Add new tests for pill relocation and copy change |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update PrayerInput.tsx | [COMPLETE] | 2026-04-06 | 3 edits in PrayerInput.tsx: removed standalone pill wrapper, added pill to chips row with `!mb-0 !w-auto` + `items-center`, changed button text to "Help Me Pray". tsc clean. pnpm build has pre-existing workbox-window error (unrelated). |
| 2 | Update test references | [COMPLETE] | 2026-04-06 | Updated 8 string literals in Pray.test.tsx, 5 string literals + 2 regex patterns in PrayTabContent.test.tsx, 1 test description. Plan missed 2 regex patterns (`/generate prayer/i`) in helper functions and 1 test description in Pray.test.tsx — all fixed. 60/60 tests pass. |
| 3 | Add new tests | [COMPLETE] | 2026-04-06 | Added 4 tests to PrayTabContent atmospheric visuals block: button text, pill-in-chips-row, items-center, pill-hides-on-type. 49/49 PrayTabContent tests pass, 15/15 Pray tests pass. |
