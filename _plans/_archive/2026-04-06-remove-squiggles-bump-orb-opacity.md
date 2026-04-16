# Implementation Plan: Remove Squiggles from Pray/Journal/Meditate + Bump Orb Opacity

**Spec:** `_specs/remove-squiggles-bump-orb-opacity.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/remove-squiggles-bump-orb-opacity`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a visual cleanup touching 4 production files and 4 test files. No new components, no new state, no routing changes, no data model changes, no localStorage changes.

**Files involved (production):**

1. `frontend/src/components/daily/PrayTabContent.tsx` (229 lines) — Remove `BackgroundSquiggle` + `SQUIGGLE_MASK_STYLE` import (line 3), remove squiggle `<div>` wrapper (lines 170-177), remove inner `<div className="relative">` (line 178, closing at 212), flatten content under `mx-auto max-w-2xl` container.

2. `frontend/src/components/daily/JournalTabContent.tsx` (270 lines) — Remove `BackgroundSquiggle` + `SQUIGGLE_MASK_STYLE` import (line 4), remove squiggle wrapper (lines 220-227), remove inner `<div className="relative">` (line 228, closing at 241), flatten content. Note: `SavedEntriesList` and `FeatureEmptyState` sit outside the squiggle wrapper (lines 244-266) — they remain unchanged.

3. `frontend/src/components/daily/MeditateTabContent.tsx` (167 lines) — Remove `BackgroundSquiggle` + `SQUIGGLE_MASK_STYLE` import (line 11), remove squiggle wrapper (lines 63-70), remove inner `<div className="relative">` (line 71, closing at 162), flatten content.

4. `frontend/src/components/homepage/GlowBackground.tsx` (85 lines) — Bump `GLOW_CONFIG` default opacity values (lines 10-49).

**Files involved (tests):**

5. `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` (166 lines) — Update 4 opacity assertion tests (lines 86-125) to match new defaults.

6. `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add 1 test: no squiggle rendered.
7. `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add 1 test: no squiggle rendered.
8. `frontend/src/pages/__tests__/MeditateLanding.test.tsx` — Add 1 test: no squiggle rendered.

**Squiggle wrapper structure (identical in all 3 tabs):**

```tsx
<div className="relative">                    {/* ← OUTER: remove this */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 opacity-[0.12]"
    style={SQUIGGLE_MASK_STYLE}
  >
    <BackgroundSquiggle />
  </div>                                        {/* ← SQUIGGLE: remove this */}
  <div className="relative">                    {/* ← INNER: remove this, keep children */}
    {/* Tab content lives here */}
  </div>
</div>
```

After removal, the tab content sits directly under the `<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">` container inside `<GlowBackground>`. This matches the Devotional tab pattern (see `DevotionalTabContent.tsx`).

**GlowBackground z-stacking:** `GlowBackground` renders orbs at `z-0` (no explicit z) and content at `z-10` via its internal `<div className="relative z-10">` wrapper. The squiggle's `relative` wrappers were redundant for stacking.

**AskPage.tsx still uses BackgroundSquiggle** — confirmed at lines 5, 222-223. Component file is NOT deleted.

**Test patterns:**

- DevotionalTabContent test uses `container.querySelector('[aria-hidden="true"][style*="mask"]')` to assert no squiggle (line 280-283). Use this same pattern for the 3 new tests.
- GlowBackground tests assert exact opacity values in `style.background` (e.g., `'rgba(139, 92, 246, 0.15)'`). These must be updated to the new defaults.
- Provider wrapping: PrayTabContent uses `MemoryRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider`. JournalTabContent same. MeditateLanding uses `MemoryRouter` → `ToastProvider` → `AuthModalProvider`.

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
| GlowBackground (center) | default opacity | 0.25 (was 0.15) | Spec requirement 3 |
| GlowBackground (left) | default opacity | 0.22 (was 0.12) | Spec requirement 3 |
| GlowBackground (right) | default opacity | 0.22 (was 0.12) | Spec requirement 3 |
| GlowBackground (split primary) | default opacity | 0.24 (was 0.14) | Spec requirement 3 |
| GlowBackground (split secondary) | default opacity | 0.18 (was 0.08) | Spec requirement 3 |
| Daily Hub tabs | glowOpacity prop | `0.30` (unchanged — overrides defaults) | design-system.md, all tab call sites |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- All Daily Hub tabs pass `glowOpacity={0.30}` to GlowBackground, overriding GLOW_CONFIG defaults. The opacity bump changes defaults for future call sites that omit the prop — it does NOT change what users see today on these tabs.
- Devotional tab is the reference pattern: GlowBackground wrapping content directly, no squiggle layer. Match this structure.
- GlowBackground's internal `<div className="relative z-10">` handles z-stacking — no extra `relative` wrappers needed on content.
- The `mx-auto max-w-2xl px-4 py-10 sm:py-14` container must remain unchanged on all three tabs.
- `BackgroundSquiggle.tsx` component file is still used by `AskPage.tsx` — DO NOT delete it.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

No responsive changes. The squiggle was purely decorative and the `relative` wrappers didn't affect layout. Content containers remain unchanged.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | No change — squiggle removal only reduces DOM nodes |
| Tablet | 768px | No change |
| Desktop | 1440px | No change |

---

## Vertical Rhythm

No changes to vertical rhythm. The `py-10 sm:py-14` containers are preserved. No spacing between sections changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/remove-squiggles-bump-orb-opacity` exists and is checked out
- [x] No auth gating changes needed (confirmed by spec)
- [x] Design system values verified from codebase inspection (GlowBackground.tsx lines 10-49)
- [x] No [UNVERIFIED] values — all values come from existing code and spec
- [x] Recon report not applicable (removal-only change)
- [x] `BackgroundSquiggle.tsx` used by `AskPage.tsx` — confirmed, not deleting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delete BackgroundSquiggle.tsx? | No | AskPage.tsx still imports and uses it (lines 5, 222-223) |
| Flatten both relative wrappers? | Yes — remove outer and inner | GlowBackground's internal `z-10` wrapper handles z-stacking; the nested relative divs were only needed to layer content above the squiggle |
| Update GlowBackground tests? | Yes — update opacity assertions | 4 tests assert exact default opacity values that are changing |
| Add no-squiggle tests to tab files? | Yes — 1 test per tab | Matches DevotionalTabContent.test.tsx pattern (line 280) to prevent accidental re-introduction |
| JournalTabContent: SavedEntriesList position | Unchanged | It lives outside the squiggle wrapper (line 244), already a direct child of the `mx-auto` container |

---

## Implementation Steps

### Step 1: Remove squiggle from PrayTabContent.tsx

**Objective:** Remove BackgroundSquiggle import, squiggle DOM, and nested relative wrappers from Pray tab.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — 2 edits

**Details:**

**Edit 1 — Remove squiggle import (line 3):**

Remove:
```tsx
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
```

**Edit 2 — Remove squiggle wrapper and flatten content (lines 170-213):**

Replace:
```tsx
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={SQUIGGLE_MASK_STYLE}
            >
              <BackgroundSquiggle />
            </div>
            <div className="relative">

              {/* Prayer Response (loading + display + actions) */}
```

With:
```tsx
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">

              {/* Prayer Response (loading + display + actions) */}
```

And replace the closing divs (lines 211-214):
```tsx
            </div>
          </div>
        </div>
```

With:
```tsx
        </div>
```

**Auth gating:** N/A — no auth changes.

**Responsive behavior:** N/A: no UI impact (DOM reduction only).

**Guardrails (DO NOT):**
- DO NOT delete `BackgroundSquiggle.tsx` component file
- DO NOT modify GlowBackground props (`variant="center" glowOpacity={0.30}`)
- DO NOT change the `mx-auto max-w-2xl px-4 py-10 sm:py-14` container
- DO NOT modify PrayerInput, PrayerResponse, or GuidedPrayerSection
- DO NOT change the GuidedPrayerPlayer sibling structure (it must remain outside GlowBackground)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production change only — tests in Step 5 |

**Expected state after completion:**
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` no longer imported in PrayTabContent.tsx
- [ ] No `aria-hidden` div with mask style in Pray tab DOM
- [ ] Content is a direct child of the `mx-auto` container
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` succeeds

---

### Step 2: Remove squiggle from JournalTabContent.tsx

**Objective:** Remove BackgroundSquiggle import, squiggle DOM, and nested relative wrappers from Journal tab.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — 2 edits

**Details:**

**Edit 1 — Remove squiggle import (line 4):**

Remove:
```tsx
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
```

**Edit 2 — Remove squiggle wrapper and flatten content (lines 219-242):**

Replace:
```tsx
        {/* Squiggle background wrapper */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={SQUIGGLE_MASK_STYLE}
          >
            <BackgroundSquiggle />
          </div>
          <div className="relative">
            <JournalInput
```

With:
```tsx
            <JournalInput
```

And replace the closing divs (lines 241-242):
```tsx
          </div>
        </div>
```

With nothing (remove both closing divs). The `JournalInput` now sits directly under the `mx-auto` container alongside `SavedEntriesList` and `FeatureEmptyState`.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:** N/A: no UI impact (DOM reduction only).

**Guardrails (DO NOT):**
- DO NOT delete `BackgroundSquiggle.tsx` component file
- DO NOT modify GlowBackground props (`variant="center" glowOpacity={0.30}`)
- DO NOT change the `mx-auto max-w-2xl px-4 py-10 sm:py-14` container
- DO NOT modify JournalInput, SavedEntriesList, or FeatureEmptyState
- DO NOT change SavedEntriesList or FeatureEmptyState position (they are already outside the squiggle wrapper)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production change only — tests in Step 5 |

**Expected state after completion:**
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` no longer imported in JournalTabContent.tsx
- [ ] No `aria-hidden` div with mask style in Journal tab DOM
- [ ] `JournalInput` is a direct child of the `mx-auto` container
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` succeeds

---

### Step 3: Remove squiggle from MeditateTabContent.tsx

**Objective:** Remove BackgroundSquiggle import, squiggle DOM, and nested relative wrappers from Meditate tab.

**Files to create/modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — 2 edits

**Details:**

**Edit 1 — Remove squiggle import (line 11):**

Remove:
```tsx
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
```

**Edit 2 — Remove squiggle wrapper and flatten content (lines 63-163):**

Replace:
```tsx
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={SQUIGGLE_MASK_STYLE}
          >
            <BackgroundSquiggle />
          </div>
          <div className="relative">
            <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
```

With:
```tsx
            <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
```

And replace the closing divs (lines 162-163):
```tsx
          </div>
        </div>
```

With nothing (remove both closing divs). The heading flex container and card grid now sit directly under the `mx-auto` container.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:** N/A: no UI impact (DOM reduction only).

**Guardrails (DO NOT):**
- DO NOT delete `BackgroundSquiggle.tsx` component file
- DO NOT modify GlowBackground props (`variant="split" glowOpacity={0.30}`)
- DO NOT change the `mx-auto max-w-2xl px-4 py-10 sm:py-14` container
- DO NOT modify the heading flex container or AmbientSoundPill placement (recently relocated in meditate-tab-ambient-pill plan)
- DO NOT change the meditation card grid or its auth gating

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Production change only — tests in Step 5 |

**Expected state after completion:**
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` no longer imported in MeditateTabContent.tsx
- [ ] No `aria-hidden` div with mask style in Meditate tab DOM
- [ ] Heading flex container is a direct child of the `mx-auto` container
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` succeeds

---

### Step 4: Bump GLOW_CONFIG default opacities

**Objective:** Update GLOW_CONFIG default opacity values in GlowBackground.tsx to align with the 0.25-0.50 design system range.

**Files to create/modify:**
- `frontend/src/components/homepage/GlowBackground.tsx` — 5 value changes in GLOW_CONFIG

**Details:**

Update `GLOW_CONFIG` (lines 10-49) opacity values:

| Variant | Field | Old | New |
|---------|-------|-----|-----|
| center[0] | opacity | 0.15 | 0.25 |
| left[0] | opacity | 0.12 | 0.22 |
| right[0] | opacity | 0.12 | 0.22 |
| split[0] | opacity | 0.14 | 0.24 |
| split[1] | opacity | 0.08 | 0.18 |

Replace each value individually:

- Line 13: `opacity: 0.15,` → `opacity: 0.25,`
- Line 21: `opacity: 0.12,` → `opacity: 0.22,`
- Line 29: `opacity: 0.12,` → `opacity: 0.22,`
- Line 37: `opacity: 0.14,` → `opacity: 0.24,`
- Line 43: `opacity: 0.08,` → `opacity: 0.18,`

**Important:** All Daily Hub tabs pass `glowOpacity={0.30}` which overrides these defaults. This change affects future call sites that omit the prop, not the current Daily Hub rendering.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:** N/A: no UI impact (default values only; overridden by prop in all current call sites).

**Guardrails (DO NOT):**
- DO NOT change the `glowOpacity` prop on any call site
- DO NOT change orb colors, sizes, positions, or blur values
- DO NOT modify the GlowOrbs function or GlowBackground component logic
- DO NOT change the `ORB_BASE` class string

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | N/A | Test updates in Step 5 |

**Expected state after completion:**
- [ ] GLOW_CONFIG defaults: center=0.25, left=0.22, right=0.22, split[0]=0.24, split[1]=0.18
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` succeeds
- [ ] Existing GlowBackground tests WILL FAIL (expected — fixed in Step 5)

---

### Step 5: Update tests

**Objective:** Update GlowBackground opacity tests and add no-squiggle assertions to Pray, Journal, and Meditate test files.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — update 4 tests
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add 1 test
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — add 1 test
- `frontend/src/pages/__tests__/MeditateLanding.test.tsx` — add 1 test

**Details:**

**Edit 1 — GlowBackground.test.tsx: Update opacity assertions:**

Line 93: `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.15)')` → `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.25)')`

Line 103: `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.12)')` → `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.22)')`

Line 113: `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.12)')` → `expect(orb.style.background).toContain('rgba(139, 92, 246, 0.22)')`

Lines 123-124: `expect(orbs[0].style.background).toContain('0.14')` → `expect(orbs[0].style.background).toContain('0.24')` and `expect(orbs[1].style.background).toContain('0.08')` → `expect(orbs[1].style.background).toContain('0.18')`

**Edit 2 — PrayTabContent.test.tsx: Add no-squiggle test** at the end of the describe block (before closing `})`):

```tsx
it('does not render BackgroundSquiggle', () => {
  renderComponent()
  expect(document.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
})
```

Use the same query pattern as DevotionalTabContent.test.tsx line 283: `container.querySelector('[aria-hidden="true"][style*="mask"]')`.

**Edit 3 — JournalTabContent.test.tsx: Add no-squiggle test** at the end of the describe block:

```tsx
it('does not render BackgroundSquiggle', () => {
  renderComponent()
  expect(document.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
})
```

**Edit 4 — MeditateLanding.test.tsx: Add no-squiggle test** at the end of the describe block:

```tsx
it('does not render BackgroundSquiggle', () => {
  renderComponent()
  expect(document.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
})
```

**Note:** The test files use different `renderComponent` helper names. Check each file's existing helper function name before adding the test. If `renderComponent` doesn't exist, use `render(...)` with the appropriate provider wrapping already established in the file.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any existing test logic beyond the opacity value changes
- DO NOT add new mocks — all needed mocks are already in each test file
- DO NOT create new test files — add to existing ones
- DO NOT change the `glowOpacity prop overrides default opacity` test (line 157-165) — it tests the override mechanism, not default values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| center variant orb has 0.25 opacity | unit | Updated from 0.15 to 0.25 |
| left variant orb has 0.22 opacity | unit | Updated from 0.12 to 0.22 |
| right variant orb has 0.22 opacity | unit | Updated from 0.12 to 0.22 |
| split variant orbs have 0.24 and 0.18 | unit | Updated from 0.14/0.08 to 0.24/0.18 |
| PrayTab does not render BackgroundSquiggle | integration | No squiggle SVG with mask style in DOM |
| JournalTab does not render BackgroundSquiggle | integration | No squiggle SVG with mask style in DOM |
| MeditateTab does not render BackgroundSquiggle | integration | No squiggle SVG with mask style in DOM |

**Expected state after completion:**
- [ ] All GlowBackground tests pass with new opacity values
- [ ] 3 new no-squiggle tests pass
- [ ] Full test suite passes: `pnpm test -- --run`
- [ ] Grep confirms zero `BackgroundSquiggle` or `SQUIGGLE_MASK_STYLE` references in the 3 tab files
- [ ] `BackgroundSquiggle.tsx` component file still exists

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove squiggle from PrayTabContent.tsx |
| 2 | — | Remove squiggle from JournalTabContent.tsx |
| 3 | — | Remove squiggle from MeditateTabContent.tsx |
| 4 | — | Bump GLOW_CONFIG default opacities |
| 5 | 1, 2, 3, 4 | Update tests (opacity assertions + no-squiggle tests) |

Steps 1-4 are independent and can be executed in any order. Step 5 depends on all of them.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove squiggle from PrayTabContent.tsx | [COMPLETE] | 2026-04-06 | Removed import + squiggle wrapper + inner relative div. Content now direct child of mx-auto container. |
| 2 | Remove squiggle from JournalTabContent.tsx | [COMPLETE] | 2026-04-06 | Removed import + squiggle wrapper + inner relative div. JournalInput now direct child of mx-auto container. SavedEntriesList/FeatureEmptyState unchanged. |
| 3 | Remove squiggle from MeditateTabContent.tsx | [COMPLETE] | 2026-04-06 | Removed import + squiggle wrapper + inner relative div. Heading flex container now direct child of mx-auto container. |
| 4 | Bump GLOW_CONFIG default opacities | [COMPLETE] | 2026-04-06 | Updated 5 opacity values: center 0.15→0.25, left 0.12→0.22, right 0.12→0.22, split[0] 0.14→0.24, split[1] 0.08→0.18. tsc passes. pnpm build has pre-existing workbox-window failure (not from our changes). |
| 5 | Update tests | [COMPLETE] | 2026-04-06 | Updated 4 GlowBackground opacity assertions. Added 3 no-squiggle tests (PrayTabContent, JournalTabContent, MeditateLanding). All 115 tests pass across 4 files. |
