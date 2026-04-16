# Implementation Plan: Devotional Polish

**Spec:** `_specs/devotional-polish.md`
**Date:** 2026-04-05
**Branch:** `claude/feature/devotional-polish`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-03-06, see note below)
**Recon Report:** N/A (visual-polish spec, no external reference)
**Master Spec Plan:** N/A — standalone spec

---

## Architecture Context

This is a two-file, surgical typography fix. No new components, no new state, no new data, no routing changes.

**Files involved:**

1. `frontend/src/pages/DailyHub.tsx` (line 213-219) — contains the `<h1 id="daily-hub-heading">` that renders "Good Morning/Afternoon/Evening, {name}!". Currently:
   ```tsx
   <h1
     id="daily-hub-heading"
     className="mb-1 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
     style={GRADIENT_TEXT_STYLE}
   >
     {displayName}
   </h1>
   ```
   The tight `leading-tight` (line-height 1.25) combined with the `GRADIENT_TEXT_STYLE` (which uses `background-clip: text` on a purple→white gradient) clips the descender on "g" in "Good Evening" / "Good Morning" and on descenders in user display names (y, p, j, q).

2. `frontend/src/components/daily/DevotionalTabContent.tsx` (line 256-263) — contains the "Closing Prayer" label. Currently:
   ```tsx
   <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">
     Closing Prayer
   </p>
   <p className="font-serif text-sm italic leading-relaxed text-white/60">
     {devotional.prayer}
   </p>
   ```
   The label is `text-white/50`; the prayer body beneath it is `text-white/60`. The label reads louder than the body it introduces, breaking the "quiet block" visual unity. Per `.claude/rules/09-design-system.md`, `text-white/60` is the canonical secondary-text opacity (matches the reflection-question label "Something to think about today:" on line 268 of the same file, and the verse reference label under the VOTD banner on DailyHub.tsx line 231).

**Test files:**

- `frontend/src/pages/__tests__/DailyHub.test.tsx` — existing test pattern uses `className.toContain(...)` assertions on the h1 heading. Existing greeting-related tests at lines 94–109, 382–387.
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — existing "renders 'Closing Prayer' label" test at line 105 uses `screen.getByText('Closing Prayer')`. Can extend that test with className assertion.

**Test provider wrapping (unchanged):** `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → component.

**Auth gating (unchanged):** Neither element is interactive; both are read-only text elements on already-auth-gated surfaces. No auth checks to add.

**Design system reference staleness:** `_plans/recon/design-system.md` was captured 2026-03-06. Since then, the Daily Hub redesign (part of Round 3) replaced the Caveat H1 font with `GRADIENT_TEXT_STYLE` (white→purple gradient via `background-clip: text`). The recon's "Hero H1 | Caveat | 72px | 48px | 700 | 72px / 60px" row no longer reflects the Daily Hub greeting. This does NOT affect the fix — the exact class change is locked by the spec's Acceptance Criteria — but the recon should not be trusted for Daily Hub hero values until re-run.

---

## Auth Gating Checklist

No new auth-gated actions. Both elements are read-only text on already-auth-gated surfaces (greeting requires auth to render `user.name`; devotional prayer block renders in the Daily Hub devotional tab content flow). No auth modals, no new interactive controls.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | N/A | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| DailyHub `<h1>` greeting | line-height (current) | `leading-tight` (1.25) | DailyHub.tsx:215 |
| DailyHub `<h1>` greeting | line-height (target) | `leading-[1.15]` | Spec § Design Notes |
| DailyHub `<h1>` greeting | bottom padding (target, added) | `pb-2` (0.5rem / 8px) | Spec § Design Notes |
| DailyHub `<h1>` greeting | font-size (unchanged) | `text-4xl sm:text-5xl lg:text-6xl` | DailyHub.tsx:215 |
| DailyHub `<h1>` greeting | font-weight (unchanged) | `font-bold` (700) | DailyHub.tsx:215 |
| DailyHub `<h1>` greeting | gradient (unchanged) | `GRADIENT_TEXT_STYLE` inline style | DailyHub.tsx:216, constants/gradients.tsx |
| DailyHub `<h1>` greeting | margin-bottom (unchanged) | `mb-1` | DailyHub.tsx:215 |
| Closing Prayer label | text color (current) | `text-white/50` (50% opacity) | DevotionalTabContent.tsx:257 |
| Closing Prayer label | text color (target) | `text-white/60` (60% opacity) | Spec § Design Notes + 09-design-system.md § Text Opacity Standards |
| Closing Prayer label | font-size (unchanged) | `text-xs` (12px) | DevotionalTabContent.tsx:257 |
| Closing Prayer label | font-weight (unchanged) | `font-medium` (500) | DevotionalTabContent.tsx:257 |
| Closing Prayer label | transform + tracking (unchanged) | `uppercase tracking-widest` | DevotionalTabContent.tsx:257 |
| Closing Prayer label | margin-bottom (unchanged) | `mb-2` | DevotionalTabContent.tsx:257 |
| Prayer body (unchanged) | text color reference | `text-white/60` (label now matches) | DevotionalTabContent.tsx:260 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **Scope lock is strict.** Only two className tokens change across two files. Do NOT touch any other classes, no matter how tempting. The spec's Out of Scope and Acceptance Criteria lists are exhaustive.
- **`GRADIENT_TEXT_STYLE` uses `background-clip: text` + `-webkit-background-clip: text`.** The gradient is rendered onto the text glyph shapes only; if line-height clips descenders, the clipped area also loses the gradient fill — the "g" tail visually disappears, not just the pixel geometry. This is why `leading-tight` must widen to `leading-[1.15]`.
- **Descender descenders matter for arbitrary user names.** Display names like "Greg", "Peggy", "Jeremy", "Jacquelyn" must also render fully. Test must cover this.
- **Keep `mb-1` and `pb-2` distinct.** `mb-1` is margin (outside the box, affects sibling spacing). `pb-2` is padding (inside the box, allows descenders to render within the element's own paint area without displacing siblings). Do not merge/replace.
- **`text-white/60` is the canonical secondary-text opacity in this app.** Used by VOTD verse reference, reflection-question label, passage attribution. `text-white/50` is reserved for interactive text, placeholders, and decorative lock overlays per `09-design-system.md`.
- **Tailwind class ordering is not semantically meaningful** but this codebase does not enforce a sorter — preserve the existing order and inject new tokens logically (color class at the end, matching prior convention).
- **Do NOT use `leading-none`.** It's too tight and will still clip descenders. `leading-[1.15]` is the spec-mandated value.
- **Do NOT change `GRADIENT_TEXT_STYLE` inline style.** The spec says to reuse it unchanged.

**Source:** Spec § Design Notes, `.claude/rules/09-design-system.md` § Text Opacity Standards, and Execution Log of `_plans/2026-04-04-devotional-redesign.md` (which last modified the Closing Prayer label styling to its current state).

---

## Shared Data Models (from Master Plan)

N/A — standalone visual-polish spec. No shared data models. No localStorage keys added or modified. No new interfaces.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Greeting renders `text-4xl` (2.25rem / 36px), Closing Prayer label renders `text-xs` (12px). Both edits must be visible without clipping or opacity drift at this size. |
| Tablet | 768px | Greeting renders `text-5xl` (3rem / 48px) via `sm:` prefix (breakpoint @ 640px). Closing Prayer label unchanged size. |
| Desktop | 1440px | Greeting renders `text-6xl` (3.75rem / 60px) via `lg:` prefix (breakpoint @ 1024px). Closing Prayer label unchanged size. |

**Custom breakpoints (if any):** None — uses standard Tailwind `sm` (640px) and `lg` (1024px) breakpoints.

---

## Vertical Rhythm

**Expected spacing between adjacent sections:**

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Greeting `<h1>` → VOTD FrostedCard | `mb-1` (4px) on h1 + `mt-6` (24px) on card + 8px `pb-2` added to h1 = **36px total** (was 28px) | DailyHub.tsx:215, 222 + spec-added `pb-2` |
| Reflection section `<div>` → Prayer section `<div>` | `py-5 sm:py-6` on each + shared `border-t border-white/[0.08]` = **20px/24px vertical pad + 1px border** (unchanged) | DevotionalTabContent.tsx:247, 256 |
| Closing Prayer label `<p>` → Prayer body `<p>` | `mb-2` (8px) between label and body (unchanged) | DevotionalTabContent.tsx:257 |

**The only permitted spacing delta per spec Acceptance Criteria is the 8px `pb-2` added to the DailyHub greeting.** All other vertical rhythm on DailyHub and DevotionalTabContent must remain identical.

`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px (other than the expected 8px pb-2 delta on the greeting) is flagged as a mismatch.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Current file state matches spec's "Current code baseline" — DailyHub.tsx:215 className does NOT contain `px-1 sm:px-2` (confirmed in recon).
- [ ] `GRADIENT_TEXT_STYLE` constant in `constants/gradients.tsx` is unchanged (confirmed — no code changes there).
- [ ] No other in-flight changes to DailyHub.tsx or DevotionalTabContent.tsx on this branch.
- [ ] All auth-gated actions from the spec are accounted for in the plan — N/A, spec has no auth changes.
- [ ] Design system values are verified — confirmed against codebase inspection (DailyHub.tsx:215, DevotionalTabContent.tsx:257, 260) and `.claude/rules/09-design-system.md`.
- [ ] All [UNVERIFIED] values are flagged with verification methods — see Edge Cases section.
- [ ] Recon report loaded — loaded, but flagged stale for Daily Hub hero values (captured 2026-03-06, before Round 3 Daily Hub redesign replaced Caveat with `GRADIENT_TEXT_STYLE`). Recon staleness does NOT block this plan because the spec locks the exact class change.
- [ ] Prior specs in the sequence are complete and committed — N/A, standalone spec.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Why `leading-[1.15]` and not `leading-snug` (1.375) or `leading-normal` (1.5)? | `leading-[1.15]` (spec-mandated) | Tighter than `leading-snug` but roomier than `leading-tight` — preserves the large-hero visual density while giving descenders pixel-geometry room. Spec locks this value. |
| Why add `pb-2` instead of increasing line-height further? | Use both: `leading-[1.15]` + `pb-2` | Line-height widening alone would push sibling elements (the VOTD card) down more than needed. `pb-2` (8px) adds only a hair of bottom room to the heading's own paint box, letting descenders render without shifting siblings. Spec specifies both changes together. |
| Why `text-white/60` and not `text-white/70` to match primary body text? | `text-white/60` (spec-mandated) | Target is the prayer body (`text-white/60`) on the next line, not the primary body text elsewhere. `text-white/60` is the canonical secondary-label opacity per `09-design-system.md`. |
| [UNVERIFIED] Will `pb-2` (8px) cause a 1-pixel vertical reflow of the VOTD card below the greeting? | Best guess: yes, ~8px shift of everything below the greeting | To verify: Run `/verify-with-playwright` at 375/768/1440 and compare to baseline screenshots. If wrong (pb-2 somehow doesn't shift): still correct per spec — spec explicitly permits the 8px delta. If worse (more than 8px shift): investigate whether `leading-[1.15]` is computing as a smaller intrinsic height than `leading-tight`, which could compound the shift. |
| What if display name contains stacked diacritics (é, ñ, ü)? | Unchanged behavior | Diacritics render above the x-height; the `leading-[1.15]` + `pb-2` fix addresses descenders specifically. Diacritics were not clipped before and will continue to render. |
| Should the fix also apply to the Dashboard greeting h1 (if one exists elsewhere)? | No — out of scope | Spec is scoped to DailyHub.tsx greeting only. The Dashboard greeting (`DashboardHero.tsx`) is a separate element with different styling not covered by this spec. |
| Should `text-white/60` be applied to every `text-white/50` label in the codebase for consistency? | No — out of scope | Spec § Out of Scope explicitly lists "Any changes to other uses of `text-white/50` elsewhere in the codebase." |

---

## Implementation Steps

### Step 1: Update DailyHub greeting className (leading + pb-2)

**Objective:** Replace `leading-tight` with `leading-[1.15]` and add `pb-2` to the DailyHub greeting `<h1>` so descenders render fully at all breakpoints.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — modify className on line 215.

**Details:**

Locate the `<h1 id="daily-hub-heading">` element at DailyHub.tsx:213-219. Modify the `className` prop:

- **Before:** `className="mb-1 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"`
- **After:** `className="mb-1 text-4xl font-bold leading-[1.15] pb-2 sm:text-5xl lg:text-6xl"`

Preserve exactly:
- `id="daily-hub-heading"` attribute
- `style={GRADIENT_TEXT_STYLE}` prop (line 216)
- The `{displayName}` child expression
- `mb-1`, `text-4xl`, `font-bold`, `sm:text-5xl`, `lg:text-6xl` classes

New classes added: `leading-[1.15]` (replacing `leading-tight`), `pb-2` (new, added before `sm:text-5xl` to keep responsive classes grouped at the end).

No other file changes in this step. No new imports, no new state, no new constants.

**Auth gating (if applicable):**
- N/A — read-only heading element. No interactive behavior.

**Responsive behavior:**
- Desktop (1440px): `text-6xl` via `lg:` prefix. Descenders on "g" in "Good Evening" and user-name descenders (y, p, j) render fully within the element's paint box; adjacent VOTD card sits `mt-6` below with no overlap.
- Tablet (768px): `text-5xl` via `sm:` prefix. Same descender fix applies.
- Mobile (375px): `text-4xl` default. Same descender fix applies. Element remains center-aligned via parent `text-center`.

**Guardrails (DO NOT):**
- DO NOT remove or modify the `id="daily-hub-heading"` attribute (used by `aria-labelledby` on the parent `<section>` at line 210).
- DO NOT modify `style={GRADIENT_TEXT_STYLE}`.
- DO NOT change `mb-1`, `text-4xl`, `font-bold`, `sm:text-5xl`, or `lg:text-6xl`.
- DO NOT add any other padding/margin classes beyond `pb-2`.
- DO NOT touch any other element in DailyHub.tsx.
- DO NOT change `leading-[1.15]` to `leading-snug`, `leading-normal`, or any other Tailwind line-height utility.
- DO NOT use `py-2` or `pt-2` — only `pb-2`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| greeting heading uses leading-[1.15] line-height | integration | Assert `heading.className` contains `leading-[1.15]` and NOT `leading-tight` |
| greeting heading adds pb-2 for descender clearance | integration | Assert `heading.className` contains `pb-2` |
| greeting heading preserves existing size/weight/color classes | integration | Assert `className` still contains `mb-1`, `text-4xl`, `font-bold`, `sm:text-5xl`, `lg:text-6xl` |
| greeting heading preserves GRADIENT_TEXT_STYLE | integration | Assert `heading.style.backgroundImage` contains `linear-gradient` and `heading.style.backgroundClip` is `text` (already asserted in existing test at line 100-109 — must continue to pass) |

**Expected state after completion:**
- [ ] DailyHub.tsx:215 className is exactly `"mb-1 text-4xl font-bold leading-[1.15] pb-2 sm:text-5xl lg:text-6xl"`
- [ ] All other attributes on the `<h1>` are unchanged (id, style, children).
- [ ] All existing DailyHub tests continue to pass.
- [ ] 3 new tests pass (`leading-[1.15]`, `pb-2`, preserved classes).

---

### Step 2: Update Closing Prayer label color (text-white/50 → text-white/60)

**Objective:** Update the "Closing Prayer" label's text opacity from 50% to 60% to match sibling secondary labels and the prayer body beneath it.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — modify className on line 257.

**Details:**

Locate the "Closing Prayer" label at DevotionalTabContent.tsx:257. Modify the `className` prop:

- **Before:** `className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50"`
- **After:** `className="mb-2 text-xs font-medium uppercase tracking-widest text-white/60"`

Preserve exactly:
- `mb-2`, `text-xs`, `font-medium`, `uppercase`, `tracking-widest` classes
- The `Closing Prayer` text child
- The sibling `<p>` on line 260 with `text-white/60` prayer body (reference for the new match)

Only `text-white/50` changes to `text-white/60`. One character: `5` → `6`.

**Auth gating (if applicable):**
- N/A — read-only label element. No interactive behavior.

**Responsive behavior:**
- Desktop (1440px): Label renders at `text-xs` (12px) in uppercase with wide tracking. Opacity now matches body beneath.
- Tablet (768px): Same — no responsive variants on this label.
- Mobile (375px): Same — no responsive variants on this label.

**Guardrails (DO NOT):**
- DO NOT modify the `mb-2`, `text-xs`, `font-medium`, `uppercase`, or `tracking-widest` classes.
- DO NOT change the "Closing Prayer" text content.
- DO NOT modify the sibling prayer body `<p>` on line 260.
- DO NOT modify any other element in DevotionalTabContent.tsx.
- DO NOT change any other `text-white/50` anywhere in this file or elsewhere in the codebase.
- DO NOT change `text-white/60` to `text-white/70` or `text-white/80` — the spec locks 60%.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Closing Prayer label uses text-white/60 opacity | integration | Locate the "Closing Prayer" text node and assert its parent's `className` contains `text-white/60` and NOT `text-white/50` |
| Closing Prayer label preserves typography classes | integration | Assert `className` contains `mb-2`, `text-xs`, `font-medium`, `uppercase`, `tracking-widest` |
| Closing Prayer label matches prayer body opacity | integration | Assert the label's `text-white/60` matches the sibling prayer body `<p>`'s `text-white/60` (no opacity mismatch between the two) |

**Expected state after completion:**
- [ ] DevotionalTabContent.tsx:257 className is exactly `"mb-2 text-xs font-medium uppercase tracking-widest text-white/60"`
- [ ] All other attributes on the `<p>` are unchanged.
- [ ] All existing DevotionalTabContent tests continue to pass.
- [ ] 3 new tests pass (opacity updated, typography preserved, matches body).

---

### Step 3: Add tests for both changes

**Objective:** Add regression tests to both existing test files to lock in the new className values.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — add 3 new tests inside the existing `describe('DailyHub', ...)` block.
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — add 3 new tests inside the existing `describe('Rendering', ...)` block.

**Details:**

**DailyHub.test.tsx additions** (insert after existing test at line 387 — "greeting heading uses enlarged text size"):

```tsx
it('greeting heading uses leading-[1.15] for descender clearance', () => {
  renderPage()
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.className).toContain('leading-[1.15]')
  expect(heading.className).not.toContain('leading-tight')
})

it('greeting heading has pb-2 for descender paint room', () => {
  renderPage()
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.className).toContain('pb-2')
})

it('greeting heading preserves responsive size and weight classes', () => {
  renderPage()
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.className).toContain('mb-1')
  expect(heading.className).toContain('text-4xl')
  expect(heading.className).toContain('font-bold')
  expect(heading.className).toContain('sm:text-5xl')
  expect(heading.className).toContain('lg:text-6xl')
})
```

**DevotionalTabContent.test.tsx additions** (insert after existing test at line 108 — "renders 'Closing Prayer' label"):

```tsx
it('Closing Prayer label uses text-white/60 opacity', () => {
  renderComponent()
  const label = screen.getByText('Closing Prayer')
  expect(label.className).toContain('text-white/60')
  expect(label.className).not.toContain('text-white/50')
})

it('Closing Prayer label preserves typography classes', () => {
  renderComponent()
  const label = screen.getByText('Closing Prayer')
  expect(label.className).toContain('mb-2')
  expect(label.className).toContain('text-xs')
  expect(label.className).toContain('font-medium')
  expect(label.className).toContain('uppercase')
  expect(label.className).toContain('tracking-widest')
})

it('Closing Prayer label matches prayer body opacity (text-white/60)', () => {
  const { container } = renderComponent()
  const label = screen.getByText('Closing Prayer')
  // Find the prayer body <p> that is the next sibling of the label
  const prayerBody = label.nextElementSibling as HTMLElement
  expect(prayerBody).not.toBeNull()
  expect(prayerBody.tagName).toBe('P')
  expect(prayerBody.className).toContain('text-white/60')
  expect(label.className).toContain('text-white/60')
})
```

Both test additions follow the existing test patterns in each file: `className.toContain(...)` assertions, existing `renderPage` / `renderComponent` helpers, no new mocks or providers. All tests continue to use the existing provider wrapping (`MemoryRouter` → `ToastProvider` → `AuthModalProvider`).

**Auth gating (if applicable):**
- N/A — tests read DOM attributes only.

**Responsive behavior:**
- N/A: no UI impact (tests only).

**Guardrails (DO NOT):**
- DO NOT remove or modify any existing tests in either file.
- DO NOT change the test provider wrapping (`MemoryRouter` → `ToastProvider` → `AuthModalProvider`).
- DO NOT change any mock setup (`useAuth`, `useFaithPoints`, `useReadAloud`, `useAudioState`, `useAudioDispatch`, `useScenePlayer`, `useSoundEffects`, `useReducedMotion`, `window.matchMedia`).
- DO NOT add tests that visually render Playwright screenshots — those are handled by `/verify-with-playwright` separately.
- DO NOT escape the forward slash in `text-white/60` when using `.toContain(...)` — escape is only needed for CSS selector queries (`querySelector('.text-white\\/60')`).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| greeting heading uses leading-[1.15] for descender clearance | integration | Asserts Step 1 className update |
| greeting heading has pb-2 for descender paint room | integration | Asserts Step 1 className update |
| greeting heading preserves responsive size and weight classes | integration | Regression guard on preserved classes |
| Closing Prayer label uses text-white/60 opacity | integration | Asserts Step 2 className update |
| Closing Prayer label preserves typography classes | integration | Regression guard on preserved classes |
| Closing Prayer label matches prayer body opacity (text-white/60) | integration | Asserts label-body opacity match (spec's "quiet block" unity) |

**Expected state after completion:**
- [ ] 3 new tests pass in DailyHub.test.tsx (total increased by 3).
- [ ] 3 new tests pass in DevotionalTabContent.test.tsx (total increased by 3).
- [ ] All pre-existing tests in both files still pass.
- [ ] Full test suite passes with zero failures (excluding the 4 pre-existing unrelated FinalCTA failures noted in the devotional-redesign Execution Log, if still present).
- [ ] `pnpm lint` and `pnpm build` pass.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | DailyHub.tsx className update (leading + pb-2) |
| 2 | — | DevotionalTabContent.tsx className update (text-white/50 → text-white/60) |
| 3 | 1, 2 | Tests for both className updates |

Steps 1 and 2 are independent — they touch different files with no shared code. Step 3 asserts both changes, so it depends on both.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update DailyHub greeting className | [COMPLETE] | 2026-04-05 | DailyHub.tsx:215 — `leading-tight` → `leading-[1.15]`, added `pb-2`. No deviations. |
| 2 | Update Closing Prayer label color | [COMPLETE] | 2026-04-05 | DevotionalTabContent.tsx:257 — `text-white/50` → `text-white/60`. No deviations. |
| 3 | Add tests for both changes | [COMPLETE] | 2026-04-05 | 3 tests added to DailyHub.test.tsx (after line 387), 3 tests added to DevotionalTabContent.test.tsx (after line 108). 5546 total tests, 0 failures. Build passes. No deviations. |
