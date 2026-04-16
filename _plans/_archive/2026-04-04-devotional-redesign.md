# Implementation Plan: Devotional Tab Redesign

**Spec:** `_specs/devotional-redesign.md`
**Date:** 2026-04-04
**Branch:** `claude/feature/devotional-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing Files

- **`frontend/src/components/daily/DevotionalTabContent.tsx`** (351 lines) — The sole file being modified. Currently renders: GlowBackground (center, 0.30 opacity) wrapping a BackgroundSquiggle decorative layer, "What's On Your Soul?" gradient heading, date navigation, devotional title + theme badge, quote in plain div, passage with VerseLink + SharePanel, reflection paragraphs, closing prayer, reflection question in FrostedCard, related reading plan callout, Share/Read Aloud frosted buttons, cross-tab CTAs.
- **`frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`** (260 lines, 17 tests) — Test file with MemoryRouter + ToastProvider + AuthModalProvider wrapping. Mocks: useAuth, useFaithPoints, useReducedMotion, useReadAloud. Tests cover: rendering, date navigation, cross-tab CTAs, completion tracking, verse linking, visual atmosphere.
- **`frontend/src/components/BackgroundSquiggle.tsx`** (72 lines) — Decorative SVG component with `SQUIGGLE_MASK_STYLE` export. Used by Pray, Journal, Meditate tabs. The Devotional import will be removed but the component stays for other consumers.
- **`frontend/src/components/homepage/FrostedCard.tsx`** (39 lines) — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Already used for the reflection question card. Will also wrap the quote section.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (86 lines) — Already wraps DevotionalTabContent with `variant="center"` and `glowOpacity={0.30}`. No change needed.

### Directory Conventions

- Component: `frontend/src/components/daily/DevotionalTabContent.tsx`
- Tests: `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`

### Test Patterns

Provider wrapping: `MemoryRouter > ToastProvider > AuthModalProvider > DevotionalTabContent`. Mock hooks via `vi.mock()`. Use `screen.getByRole`, `screen.getByText`, class name assertions for visual tests.

---

## Auth Gating Checklist

**No auth-gated actions are introduced or changed by this spec.** All existing auth gating (completion tracking for logged-in users) remains untouched.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual-only redesign | Auth behavior unchanged | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | variant, opacity | `center`, `0.30` | Already in code (line 145), unchanged |
| FrostedCard | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | `09-design-system.md` § FrostedCard |
| FrostedCard | box-shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | `09-design-system.md` § FrostedCard |
| Section dividers | border color | `border-white/[0.08]` | Spec req #6, `09-design-system.md` § Section Dividers |
| Section dividers | spacing | `py-5 sm:py-6` | Spec req #6 |
| Quote text | color | `text-white` | Spec req #7 |
| Quote attribution | color | `text-white/70` | Spec req #7 |
| Passage text | color | `text-white/80` | Spec req #8 |
| Reflection body | color | `text-white` | Spec req #8 |
| Prayer label | color/spacing | `text-white/50`, `mb-2` | Spec req #9 |
| Prayer text | size | `text-sm` | Spec req #9 |
| Frosted buttons | styling | `rounded-xl bg-white/[0.06] backdrop-blur-sm border-white/[0.12]` + purple shadow | Already in code (lines 306-322), unchanged |
| Bottom padding | spacing | `pb-8 sm:pb-12` | Spec req #12 |

---

## Design System Reminder

**Project-specific quirks displayed before each UI step:**

- GlowBackground is already present — do NOT re-add or change its variant/opacity
- FrostedCard uses `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow — do NOT use dashboard card pattern (`bg-white/5 border-white/10`)
- Section dividers use `border-white/[0.08]` (homepage pattern), NOT `border-white/10` (old pattern)
- Text brightening follows Round 3 standard: `text-white` for primary readable content
- Share and Read Aloud buttons already have frosted glass styling — do NOT re-implement
- All ARIA attributes, keyboard nav, and focus management must remain exactly as-is
- All logic (date navigation, swipe, read-aloud, share, completion tracking, intersection observer, localStorage, callbacks) must remain untouched
- The `relative` wrapper div on line 155 must remain for z-stacking of content above GlowBackground orbs

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual redesign with no new data models or localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column, full width. GlowBackground orbs scale down 40%. `py-5` section spacing. Buttons stack vertically. |
| Tablet | 640px+ | Single column with `max-w-4xl` centering. `sm:py-6` section spacing. |
| Desktop | 1024px+ | Same as tablet — single-column reading flow. |

No elements hide or change structure between breakpoints. This is unchanged from current behavior.

---

## Vertical Rhythm

**Expected spacing between adjacent sections (post-redesign):**

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Date nav → devotional title | `pt-8 sm:pt-10` (unchanged) | Existing code line 206 |
| Title → quote section | `py-5 sm:py-6` (tightened from `py-8 sm:py-10`) | Spec req #6 |
| Quote → passage | `py-5 sm:py-6` | Spec req #6 |
| Passage → reflection | `py-5 sm:py-6` | Spec req #6 |
| Reflection → prayer | `py-5 sm:py-6` | Spec req #6 |
| Prayer → reflection question | `py-5 sm:py-6` | Spec req #6 |
| Last section → bottom | `pb-8 sm:pb-12` (reduced from `pb-16 sm:pb-20`) | Spec req #12 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/devotional-redesign` exists and is checked out
- [x] No functional changes — all logic, ARIA, callbacks untouched
- [x] FrostedCard component is available at `@/components/homepage/FrostedCard`
- [x] GlowBackground already wraps the component — no change needed
- [x] Share and Read Aloud buttons already have frosted glass styling — no change needed
- [x] All auth-gated actions from the spec are accounted for (none — visual only)
- [x] Design system values are verified from `09-design-system.md` and existing code
- [x] No [UNVERIFIED] values — all changes use spec-defined values

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Remove squiggle wrapper divs | Remove the `aria-hidden` squiggle div and flatten one of the two `<div className="relative">` wrappers — keep a single `<div className="relative">` around the content | One relative div is still needed for content z-stacking above GlowBackground orbs; the second wrapper existed only to stack content above the squiggle overlay and is no longer needed |
| Quote FrostedCard padding | Use `p-5 sm:p-6` | Matches the existing reflection question FrostedCard padding pattern (`p-4 sm:p-6`) but slightly larger since the quote is a more prominent element |
| Decorative quotation mark inside FrostedCard | Keep it inside the FrostedCard | It's part of the quote visual treatment |
| BackgroundSquiggle import removal | Remove `BackgroundSquiggle` AND `SQUIGGLE_MASK_STYLE` imports | Both are unused after removing the squiggle layer |
| `GRADIENT_TEXT_STYLE` import | Remove since the heading that used it is being removed | Clean up unused imports |

---

## Implementation Steps

### Step 1: Visual Redesign of DevotionalTabContent.tsx

**Status:** [COMPLETE]

**Objective:** Apply all visual changes from the spec: remove squiggle + heading, tighten spacing, wrap quote in FrostedCard, brighten text, compact prayer, reduce bottom padding.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — all visual changes

**Details:**

1. **Remove imports** (line 5, line 8):
   - Delete: `import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'`
   - Delete: `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'`

2. **Remove BackgroundSquiggle wrapper** (lines 147-155): Delete the entire squiggle overlay div:
   ```tsx
   // DELETE these lines (147-154):
   <div className="relative">
     <div
       aria-hidden="true"
       className="pointer-events-none absolute inset-0 opacity-[0.12]"
       style={SQUIGGLE_MASK_STYLE}
     >
       <BackgroundSquiggle />
     </div>
     <div className="relative">
   ```
   Replace with just:
   ```tsx
   <div className="relative">
   ```
   Also remove the corresponding closing `</div>` for the removed outer wrapper (the `</div>` before the final `</div>` on line 346).

3. **Remove "What's On Your Soul?" heading** (lines 157-162): Delete entirely:
   ```tsx
   // DELETE:
   <h2 className="mb-4 text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl" style={GRADIENT_TEXT_STYLE}>
     What&apos;s On Your Soul?
   </h2>
   ```

4. **Tighten all section dividers** — 5 occurrences:
   - Line 216: `border-t border-white/10 py-8 sm:py-10` → `border-t border-white/[0.08] py-5 sm:py-6`
   - Line 229: same change
   - Line 265: same change
   - Line 274: same change
   - Line 284: same change

5. **Wrap quote in FrostedCard** (lines 216-226): Wrap the quote's inner content div in `<FrostedCard className="p-5 sm:p-6">`:
   ```tsx
   <div className="border-t border-white/[0.08] py-5 sm:py-6">
     <FrostedCard className="p-5 sm:p-6">
       <span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">
         &ldquo;
       </span>
       <blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white sm:text-2xl">
         {devotional.quote.text}
       </blockquote>
       <p className="mt-3 text-sm text-white/70">&mdash; {devotional.quote.attribution}</p>
     </FrostedCard>
   </div>
   ```
   Changes within: quote text `text-white/70` → `text-white`, attribution `text-white/60` → `text-white/70`.

6. **Brighten passage text** (line 246): `text-white/70` → `text-white/80`

7. **Brighten reflection body** (line 266): `text-white/80` → `text-white`

8. **Compact closing prayer** (lines 274-280):
   - Label: `mb-4 text-xs font-medium uppercase tracking-widest text-white/60` → `mb-2 text-xs font-medium uppercase tracking-widest text-white/50`
   - Prayer text: `font-serif text-base italic leading-relaxed text-white/60` → `font-serif text-sm italic leading-relaxed text-white/60`

9. **Reduce bottom padding** (line 344): `pb-16 sm:pb-20` → `pb-8 sm:pb-12`

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1440px): Single column reading, `max-w-4xl` centered. Tighter vertical rhythm visible.
- Tablet (768px): Same as desktop.
- Mobile (375px): Same layout, no structural changes. Tighter spacing. FrostedCard on quote stacks naturally.

**Guardrails (DO NOT):**
- DO NOT change any logic, state, refs, callbacks, hooks, or effects
- DO NOT modify any ARIA attributes, `role`, `aria-label`, `aria-describedby`, or `aria-disabled`
- DO NOT change the GlowBackground wrapper (variant, opacity, className)
- DO NOT change Share/Read Aloud button styling (already matches spec)
- DO NOT change the reflection question FrostedCard (already matches spec)
- DO NOT change the cross-tab CTA buttons
- DO NOT change the RelatedPlanCallout conditional rendering
- DO NOT add new components, imports, or data models (only remove unused imports)
- DO NOT change `focus-visible` styles on any interactive element

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing tests — verify they still pass after changes) | integration | Run full test suite to confirm no regressions |

**Expected state after completion:**
- [ ] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` imports removed
- [ ] `GRADIENT_TEXT_STYLE` import removed
- [ ] No squiggle wrapper divs in the JSX
- [ ] "What's On Your Soul?" heading removed
- [ ] All 5 section dividers use `border-white/[0.08] py-5 sm:py-6`
- [ ] Quote section wrapped in FrostedCard with `p-5 sm:p-6`
- [ ] Quote text: `text-white`, attribution: `text-white/70`
- [ ] Passage text: `text-white/80`
- [ ] Reflection body: `text-white`
- [ ] Prayer label: `text-white/50`, `mb-2`
- [ ] Prayer text: `text-sm`
- [ ] Bottom padding: `pb-8 sm:pb-12`
- [ ] All ARIA attributes unchanged
- [ ] All logic/callbacks unchanged
- [ ] TypeScript compiles with zero errors

---

### Step 2: Update Tests for DevotionalTabContent

**Status:** [COMPLETE]

**Objective:** Update existing tests to reflect the visual changes (removed heading, new FrostedCard on quote). Add tests for new visual states.

**Files to modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — update and add tests

**Details:**

1. **Remove heading test** (lines 67-73): Delete the test `renders "What's On Your Soul?" heading with gradient style` — the heading no longer exists.

2. **Update heading count test** (lines 82-87): The test `renders devotional title` checks `headings.length >= 2`. After removing the h2, the devotional title h3 is the only heading. Update assertion:
   ```tsx
   it('renders devotional title as primary heading', () => {
     renderComponent()
     const headings = screen.getAllByRole('heading')
     // Only the devotional title heading remains (h3)
     expect(headings.length).toBeGreaterThanOrEqual(1)
     expect(headings[0].textContent).toBeTruthy()
   })
   ```

3. **Add test: no BackgroundSquiggle rendered** — verify the squiggle is gone:
   ```tsx
   it('does not render BackgroundSquiggle', () => {
     const { container } = renderComponent()
     // No squiggle SVG paths or mask-style elements
     expect(container.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
   })
   ```

4. **Add test: quote wrapped in FrostedCard** — verify frosted glass on quote:
   ```tsx
   it('quote section has frosted glass styling', () => {
     renderComponent()
     const blockquote = screen.getByRole('blockquote')
     const card = blockquote.closest('[class*="backdrop-blur"]') as HTMLElement
     expect(card).not.toBeNull()
     expect(card!.className).toContain('bg-white/[0.06]')
   })
   ```

5. **Add test: section dividers use correct border color**:
   ```tsx
   it('section dividers use border-white/[0.08]', () => {
     const { container } = renderComponent()
     const dividers = container.querySelectorAll('.border-white\\/\\[0\\.08\\]')
     expect(dividers.length).toBeGreaterThanOrEqual(5)
   })
   ```

6. **Add test: compact bottom padding**:
   ```tsx
   it('bottom padding is compact (pb-8)', () => {
     const { container } = renderComponent()
     expect(container.querySelector('.pb-8')).not.toBeNull()
     expect(container.querySelector('.pb-16')).toBeNull()
   })
   ```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove or modify existing passing tests for date navigation, cross-tab CTAs, completion tracking, or verse linking
- DO NOT change the test provider wrapping pattern
- DO NOT change any mock setup

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| no BackgroundSquiggle rendered | integration | Verify squiggle decorative layer is removed |
| quote section has frosted glass styling | integration | Verify FrostedCard wraps quote with backdrop-blur |
| section dividers use border-white/[0.08] | integration | Verify all 5 dividers have correct border color |
| bottom padding is compact | integration | Verify pb-8 present, pb-16 absent |
| renders devotional title as primary heading | integration | Updated heading count after removing "What's On Your Soul?" |

**Expected state after completion:**
- [ ] "What's On Your Soul?" heading test removed
- [ ] Heading count test updated
- [ ] 4 new visual tests added (squiggle removed, quote frosted, divider color, bottom padding)
- [ ] All existing tests for date navigation, CTAs, completion, verse linking still pass
- [ ] Full test suite passes with zero failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Visual changes to DevotionalTabContent.tsx |
| 2 | 1 | Update tests to match new visual state |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Visual Redesign of DevotionalTabContent.tsx | [COMPLETE] | 2026-04-04 | Modified `frontend/src/components/daily/DevotionalTabContent.tsx`: removed `BackgroundSquiggle`, `SQUIGGLE_MASK_STYLE`, `GRADIENT_TEXT_STYLE` imports; removed squiggle wrapper divs and "What's On Your Soul?" heading; flattened outer `<div className="relative">` wrapper; tightened all 5 section dividers from `border-white/10 py-8 sm:py-10` to `border-white/[0.08] py-5 sm:py-6`; wrapped quote in `<FrostedCard className="p-5 sm:p-6">`, brightened quote text to `text-white` and attribution to `text-white/70`; brightened passage text to `text-white/80`; brightened reflection body to `text-white`; compacted prayer label (`mb-2 text-white/50`) and text (`text-sm`); reduced bottom padding to `pb-8 sm:pb-12`. Playwright visual verification passed at 375/768/1440 — all computed values match spec exactly. 2 existing tests fail as expected (heading tests), to be updated in Step 2. |
| 2 | Update Tests for DevotionalTabContent | [COMPLETE] | 2026-04-04 | Modified `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`: removed heading test, updated heading count test (`renders devotional title as primary heading`), added 4 new visual tests (no BackgroundSquiggle, quote frosted glass styling, section dividers border color, bottom padding compact). **Deviation from plan:** Also updated `frontend/src/pages/__tests__/DailyHub.test.tsx` (3 tests) that referenced the removed "Soul?" heading text as an identifier — replaced with "Closing Prayer" text (unique to devotional tab content). This was required to meet the plan's expected state ("Full test suite passes with zero failures"). Final suite: 5531 pass / 4 pre-existing unrelated FinalCTA failures (not caused by this plan). |
