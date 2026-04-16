# Implementation Plan: Daily Hub Canvas, Hero & Tab Bar (Refinements)

**Spec:** `_specs/daily-hub-canvas-hero-tab-bar.md`
**Date:** 2026-04-03
**Branch:** `claude/feature/daily-hub-canvas-hero-tab-bar`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06, stale for post-HP values; current source files authoritative)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable
**Prior Plan:** `_plans/2026-04-02-daily-hub-canvas-hero-tab.md` — COMPLETE, implemented root bg, GlowBackground, GRADIENT_TEXT_STYLE, FrostedCard, pill tab bar, animation removal. This plan covers remaining refinements from the updated spec.

---

## Architecture Context

### Current State (post prior plan)

**`frontend/src/pages/DailyHub.tsx`** (424 lines) — already has:
- Root `bg-hero-bg` (line 197)
- Hero wrapped in `<GlowBackground variant="center">` (line 209)
- Greeting `<h1>` with `GRADIENT_TEXT_STYLE` inline style, `text-3xl sm:text-4xl` (lines 214-219)
- Verse card using `<FrostedCard className="mt-6 w-full max-w-3xl text-left sm:p-8">` (line 223)
- Pill tab bar with `rounded-full border border-white/[0.12] bg-white/[0.06] p-1` (line 293)
- Active/inactive tab pill styling (lines 314-318)
- No animated underline, no `activeTabIndex`
- Quiz teaser paragraph still present (lines 262-276)
- `StartingPointQuiz` still imported and rendered (line 10, line 401)
- Tab panels use `hidden` attribute, no animation classes

**`frontend/src/pages/__tests__/DailyHub.test.tsx`** (409 lines) — 39 tests passing, includes:
- Tests for quiz teaser and StartingPointQuiz (lines 269-279) — must be removed
- Tests for pill tab bar, glow orb, gradient text (already updated in prior plan)

### Component Patterns

- **FrostedCard** uses `cn()` (tailwind-merge), so `className` overrides win: `rounded-xl` overrides built-in `rounded-2xl`, `px-5 py-4` overrides built-in `p-6`.
- **GlowBackground** center variant orb at 0.15 opacity. Not changed in this plan.
- **StartingPointQuiz** component file remains (used on landing page `Home.tsx`). Only the import/usage in DailyHub is removed.

### Provider Wrapping in Tests

`MemoryRouter` > `ToastProvider` > `AuthModalProvider` > `DailyHub`

---

## Auth Gating Checklist

**No auth gates in this spec.** All changes are visual-only (greeting size, verse card compaction, quiz removal). Existing auth gates (completion icons, tab content interactions) remain unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual changes only | No auth gating changes | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Greeting h1 | font-size | `text-4xl sm:text-5xl lg:text-6xl` (2.25rem / 3rem / 3.75rem) | Spec requirement |
| Verse card (FrostedCard) | max-width | `max-w-2xl` (672px) | Spec requirement |
| Verse card (FrostedCard) | border-radius | `rounded-xl` (0.75rem) — overrides FrostedCard `rounded-2xl` | Spec requirement |
| Verse card (FrostedCard) | padding | `px-5 py-4` — overrides FrostedCard `p-6` | Spec requirement |
| Verse text | size + color | `text-base sm:text-lg text-white/80` | Spec requirement |
| Verse text | line-clamp | `line-clamp-2 sm:line-clamp-none` | Spec requirement |
| Reference text | margin + size | `mt-2 text-sm text-white/60` (no `sm:text-base`) | Spec requirement |
| Action links | margin-top | `mt-3` | Spec requirement |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- `GRADIENT_TEXT_STYLE` is an inline CSSProperties object — not Tailwind gradient utilities
- FrostedCard uses `cn()` so `className` props override built-in values via tailwind-merge
- FrostedCard has built-in `p-6` and `rounded-2xl` — pass overrides via `className`, don't duplicate
- Tab panel `hidden` attribute = `display: none` — CSS transitions cannot animate across display changes
- Tab completion icons guard: `isAuthenticated && isComplete` — do not modify
- `line-clamp-2` requires Tailwind's `@tailwindcss/line-clamp` or Tailwind 3.3+ built-in support (Tailwind 3.3+ has built-in)
- `StartingPointQuiz` component file stays in codebase — only its import/usage in DailyHub is removed (it's still used on the landing page)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual spec. No new data models or localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Greeting `text-4xl`. Verse card `max-w-2xl` full-width. Verse text `text-base` clamped to 2 lines (`line-clamp-2`). Tab labels hidden below 400px. |
| Tablet | 768px | Greeting `text-5xl`. Verse text `text-lg` unclamped (`line-clamp-none`). Pill tab bar `max-w-xl`. |
| Desktop | 1440px | Greeting `text-6xl`. Same as tablet otherwise. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Greeting h1 → verse card | `mt-6` (24px) | Current code (unchanged) |
| Verse card → sentinel | Determined by hero `pb-8` / `sm:pb-12` | Current code (unchanged) |
| Sentinel → tab bar | 0px (sticky immediately below) | Current code (unchanged) |
| Last tab panel → SongPickSection | Determined by tab content internal padding | Current code (unchanged) |

Quiz removal eliminates the `StartingPointQuiz` section between `SongPickSection` and `SiteFooter`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Prior plan `2026-04-02-daily-hub-canvas-hero-tab.md` is fully executed and committed
- [x] Branch `claude/feature/daily-hub-canvas-hero-tab-bar` is the current branch
- [x] All 39 DailyHub tests pass
- [x] No auth-gated actions in this spec
- [x] Tailwind 3.3+ supports `line-clamp-*` utility natively (no plugin needed)
- [x] `StartingPointQuiz` is still used in `Home.tsx` — only remove from DailyHub

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab panel opacity transition | Keep `hidden` attribute, do NOT add `transition-opacity` classes | `hidden` = `display: none` prevents CSS transitions. Spec's opacity requirement is already met by removing `animate-tab-fade-in` — no white flash. Adding no-op opacity classes would be confusing dead code. |
| Verse card component | Keep `FrostedCard` with className overrides | `rounded-xl px-5 py-4` override FrostedCard defaults via `cn()` / tailwind-merge. Maintains component reuse. |
| Verse text `font-serif italic` | Keep — spec doesn't mention removing | Spec only specifies size/color/clamp changes. Lora serif italic is the scripture font standard. |
| `line-clamp-2` vs no-clamp | `line-clamp-2 sm:line-clamp-none` | Mobile gets 2-line clamp for compact hero. Tablet+ shows full verse. |

---

## Implementation Steps

### Step 1: Hero Greeting Size + Verse Card Compaction

**Objective:** Enlarge the greeting heading to match spec sizes and compact the verse card (narrower, tighter padding, smaller text, mobile line-clamp).

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — update h1 classes and FrostedCard className + inner element classes

**Details:**

1. **Greeting h1** (line 216):
   - Old:
     ```jsx
     className="mb-1 text-3xl font-bold leading-tight sm:text-4xl"
     ```
   - New:
     ```jsx
     className="mb-1 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
     ```
   - Changes: `text-3xl` → `text-4xl`, `sm:text-4xl` → `sm:text-5xl`, add `lg:text-6xl`

2. **FrostedCard verse wrapper** (line 223):
   - Old:
     ```jsx
     <FrostedCard className="mt-6 w-full max-w-3xl text-left sm:p-8">
     ```
   - New:
     ```jsx
     <FrostedCard className="mt-6 w-full max-w-2xl rounded-xl px-5 py-4 text-left">
     ```
   - Changes: `max-w-3xl` → `max-w-2xl`, add `rounded-xl` (overrides `rounded-2xl`), add `px-5 py-4` (overrides `p-6`), remove `sm:p-8` (spec wants tighter padding at all sizes)

3. **Verse text** (line 228):
   - Old:
     ```jsx
     <p className="font-serif italic text-lg leading-relaxed text-white/90 sm:text-xl">
     ```
   - New:
     ```jsx
     <p className="font-serif italic text-base leading-relaxed text-white/80 line-clamp-2 sm:text-lg sm:line-clamp-none">
     ```
   - Changes: `text-lg` → `text-base`, `text-white/90` → `text-white/80`, `sm:text-xl` → `sm:text-lg`, add `line-clamp-2 sm:line-clamp-none`

4. **Reference text** (line 233):
   - Old:
     ```jsx
     <p className="mt-3 text-sm text-white/60 sm:text-base">
     ```
   - New:
     ```jsx
     <p className="mt-2 text-sm text-white/60">
     ```
   - Changes: `mt-3` → `mt-2`, remove `sm:text-base`

5. **Action links container** (line 235):
   - Old:
     ```jsx
     <div className="mt-4 flex items-center gap-4">
     ```
   - New:
     ```jsx
     <div className="mt-3 flex items-center gap-4">
     ```
   - Change: `mt-4` → `mt-3`

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1440px): `text-6xl` greeting (~3.75rem), `max-w-2xl` card, `text-lg` verse, no clamp
- Tablet (768px): `text-5xl` greeting (~3rem), `max-w-2xl` card, `text-lg` verse, no clamp
- Mobile (375px): `text-4xl` greeting (~2.25rem), card full-width within px-4, `text-base` verse, 2-line clamp

**Guardrails (DO NOT):**
- DO NOT change verse content, Link destinations, or SharePanel state/behavior
- DO NOT remove `font-serif italic` from verse text (spec doesn't mention removing it)
- DO NOT change the share button or meditation link styling/behavior
- DO NOT add `onClick` to FrostedCard (verse card is not clickable as a whole)
- DO NOT modify the inner `<Link>` component wrapping verse text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Greeting uses enlarged sizes | integration | Verify h1 has `text-4xl` class (not `text-3xl`) |
| Verse card uses max-w-2xl | integration | Verify FrostedCard element has `max-w-2xl` class |
| Verse text has line-clamp-2 | integration | Verify verse paragraph has `line-clamp-2` class |

**Expected state after completion:**
- [ ] Greeting h1 uses `text-4xl sm:text-5xl lg:text-6xl`
- [ ] Verse card FrostedCard has `max-w-2xl rounded-xl px-5 py-4` (overriding defaults)
- [ ] Verse text uses `text-base sm:text-lg text-white/80 line-clamp-2 sm:line-clamp-none`
- [ ] Reference text uses `mt-2 text-sm text-white/60` (no `sm:text-base`)
- [ ] Action links use `mt-3`
- [ ] All verse content, links, share functionality unchanged

---

### Step 2: Remove Quiz Teaser and StartingPointQuiz

**Objective:** Remove the "Not sure where to start?" quiz teaser paragraph from the hero and the `StartingPointQuiz` component from the bottom of the page.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — delete quiz teaser JSX, StartingPointQuiz JSX, and StartingPointQuiz import

**Details:**

1. **Remove StartingPointQuiz import** (line 10):
   - Delete:
     ```typescript
     import { StartingPointQuiz } from '@/components/StartingPointQuiz'
     ```

2. **Remove quiz teaser paragraph** (lines 262-276):
   - Delete the entire block:
     ```jsx
     {/* Quiz Teaser */}
     <p className="mt-4 font-sans text-sm text-white/50">
       Not sure where to start?{' '}
       <button
         type="button"
         onClick={() => {
           document
             .getElementById('quiz')
             ?.scrollIntoView({ behavior: 'smooth' })
         }}
         className="inline-flex min-h-[44px] items-center rounded font-semibold text-white/50 underline underline-offset-2 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
       >
         Take a 30-second quiz
       </button>{' '}
       and we&apos;ll help you find your path.
     </p>
     ```

3. **Remove StartingPointQuiz component usage** (line 401):
   - Delete:
     ```jsx
     {/* Starting Point Quiz */}
     <StartingPointQuiz variant="dark" />
     ```

**Auth gating:** N/A — visual only.

**Responsive behavior:** N/A: no UI impact — removing content only.

**Guardrails (DO NOT):**
- DO NOT delete the `StartingPointQuiz` component file (`src/components/StartingPointQuiz.tsx`) — it's still used on the landing page (`Home.tsx`)
- DO NOT modify `SongPickSection` or `SiteFooter` positioning
- DO NOT remove the `id="quiz"` from `StartingPointQuiz.tsx` component itself (other pages may reference it)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No quiz teaser in hero | integration | Verify "Not sure where to start?" text is absent |
| No StartingPointQuiz rendered | integration | Verify `document.getElementById('quiz')` returns null |

**Expected state after completion:**
- [ ] No "Not sure where to start?" text in the Daily Hub
- [ ] No `StartingPointQuiz` component rendered
- [ ] `StartingPointQuiz` import removed from DailyHub.tsx
- [ ] StartingPointQuiz component file still exists for landing page use

---

### Step 3: Test Updates

**Objective:** Remove tests for deleted quiz elements, add tests for new styling, ensure all existing tests pass.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — remove 2 tests, add 4 new tests

**Details:**

1. **Remove quiz-related tests:**
   - Delete test `"renders the Starting Point Quiz section"` (lines 269-272):
     ```typescript
     it('renders the Starting Point Quiz section', () => {
       renderPage()
       expect(document.getElementById('quiz')).toBeInTheDocument()
     })
     ```
   - Delete test `"renders quiz teaser link in hero"` (lines 274-279):
     ```typescript
     it('renders quiz teaser link in hero', () => {
       renderPage()
       expect(
         screen.getByRole('button', { name: /take a 30-second quiz/i }),
       ).toBeInTheDocument()
     })
     ```

2. **Add new test: no quiz in Daily Hub:**
   ```typescript
   it('does not render quiz teaser or StartingPointQuiz', () => {
     renderPage()
     expect(screen.queryByText(/not sure where to start/i)).not.toBeInTheDocument()
     expect(document.getElementById('quiz')).not.toBeInTheDocument()
   })
   ```

3. **Add new test: greeting uses enlarged size:**
   ```typescript
   it('greeting heading uses enlarged text size', () => {
     renderPage()
     const heading = screen.getByRole('heading', { level: 1 })
     expect(heading.className).toContain('text-4xl')
     expect(heading.className).not.toContain('text-3xl')
   })
   ```

4. **Add new test: verse card is compact:**
   ```typescript
   it('verse card uses compact max-w-2xl with rounded-xl', () => {
     renderPage()
     const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
     const card = hero.querySelector('.max-w-2xl')
     expect(card).toBeInTheDocument()
     expect(card!.className).toContain('rounded-xl')
     expect(card!.className).toContain('px-5')
     expect(card!.className).toContain('py-4')
   })
   ```

5. **Add new test: verse text has line-clamp on mobile:**
   ```typescript
   it('verse text has line-clamp-2 for mobile compaction', () => {
     renderPage()
     const verseText = document.querySelector('.font-serif.italic')
     expect(verseText).toBeInTheDocument()
     expect(verseText!.className).toContain('line-clamp-2')
     expect(verseText!.className).toContain('text-white/80')
   })
   ```

6. **Update existing test: "verse text is not line-clamped in banner"** (lines 156-161):
   - This test currently asserts no line-clamp. Now verse HAS `line-clamp-2`. Rename and update:
   - Old:
     ```typescript
     it('verse text is not line-clamped in banner', () => {
       renderPage()
       const verseText = document.querySelector('.font-serif.italic')
       expect(verseText).toBeInTheDocument()
       expect(verseText!.className).not.toContain('line-clamp')
     })
     ```
   - New:
     ```typescript
     it('verse text has mobile line-clamp with tablet breakout', () => {
       renderPage()
       const verseText = document.querySelector('.font-serif.italic')
       expect(verseText).toBeInTheDocument()
       expect(verseText!.className).toContain('line-clamp-2')
       expect(verseText!.className).toContain('sm:line-clamp-none')
     })
     ```

**Auth gating:** N/A — test file only.

**Responsive behavior:** N/A: no UI impact — test file only.

**Guardrails (DO NOT):**
- DO NOT remove or weaken existing functional tests (keyboard nav, tab switching, URL params, completion, state preservation)
- DO NOT change test mocks or the `renderPage` helper
- DO NOT add tests that depend on computed styles (use className checks — jsdom doesn't compute CSS)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 6 test changes listed above | integration | See Details section for full test code |

**Expected state after completion:**
- [ ] 2 quiz-related tests removed
- [ ] 1 existing test updated (line-clamp assertion inverted)
- [ ] 4 new tests added (no quiz, greeting size, compact card, verse line-clamp)
- [ ] All tests pass (run `pnpm test` to confirm)
- [ ] Net test count: 39 - 2 + 4 = 41 tests

---

## [UNVERIFIED] Values

No new [UNVERIFIED] values in this plan. All values are explicitly specified by the spec acceptance criteria (exact Tailwind classes). The pill tab bar [UNVERIFIED] values from the prior plan have been visually confirmed via prior execution.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Hero greeting size + verse card compaction |
| 2 | — | Quiz teaser + StartingPointQuiz removal |
| 3 | 1, 2 | Test updates (needs all code changes in place) |

Steps 1 and 2 are independent and can execute in either order. Step 3 depends on both.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Hero greeting size + verse card compaction | [COMPLETE] | 2026-04-03 | `DailyHub.tsx`: h1 text-4xl/5xl/6xl, FrostedCard max-w-2xl rounded-xl px-5 py-4, verse text-base/lg text-white/80 line-clamp-2, ref mt-2 no sm:text-base, actions mt-3 |
| 2 | Quiz teaser + StartingPointQuiz removal | [COMPLETE] | 2026-04-03 | `DailyHub.tsx`: Removed StartingPointQuiz import, quiz teaser paragraph, and StartingPointQuiz component usage. Component file retained for Home.tsx. |
| 3 | Test updates | [COMPLETE] | 2026-04-03 | `DailyHub.test.tsx`: Removed 2 quiz tests, updated VOTD banner test (.rounded-2xl → .rounded-xl), updated line-clamp test (inverted assertion), added 4 new tests (no quiz, greeting size, compact card, verse line-clamp). 38 pass, 3 pre-existing "Soul?" failures unchanged. |
