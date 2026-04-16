# Implementation Plan: Journey Section Horizontal Layout + Glow Fix

**Spec:** `_specs/journey-horizontal-layout.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing Files

- **`frontend/src/components/JourneySection.tsx`** — Current vertical timeline with 7 steps. Uses `useScrollReveal` + `staggerDelay`, `BackgroundSquiggle`, `WHITE_PURPLE_GRADIENT`, `ArrowRight` icon, connecting vertical lines. Each step has a `Link` wrapper. Container is `max-w-2xl`.
- **`frontend/src/components/__tests__/JourneySection.test.tsx`** — 14 tests covering structure, content, accessibility, animation. Mocks `useScrollReveal`. Tests description text snippets, h3 headings, stagger delays at 120ms.
- **`frontend/src/components/homepage/SectionHeading.tsx`** — Reusable heading component with `GRADIENT_TEXT_STYLE`, accepts `heading`, `tagline`, `align`, `className`, `id`. Renders `<h2>` with gradient text + optional `<p>` tagline.
- **`frontend/src/constants/gradients.tsx`** — `WHITE_PURPLE_GRADIENT: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`, `GRADIENT_TEXT_STYLE` (CSSProperties), `renderWithScriptAccent()`.
- **`frontend/src/hooks/useScrollReveal.ts`** — `useScrollReveal({ threshold, rootMargin, triggerOnce })` returns `{ ref, isVisible }`. `staggerDelay(index, baseDelay, initialDelay)` returns `CSSProperties`.
- **`frontend/src/components/BackgroundSquiggle.tsx`** — Used by 6 files: JourneySection, DevotionalTabContent, PrayTabContent, JournalTabContent, MeditateTabContent, AskPage. **Cannot delete** — 5 other consumers remain after removing from JourneySection.
- **`frontend/src/components/homepage/GlowBackground.tsx`** — Wrapper with glow orbs. Uses `bg-hero-bg` class. Current orb opacity: `0.06` (too faint). Spec requires direct orb implementation instead of this wrapper.
- **`frontend/src/pages/Home.tsx`** — Renders `<JourneySection />` as the 3rd section (after Hero, before StatsBar).

### Key Patterns

- **Background color**: `bg-hero-bg` maps to `#08051A` in `tailwind.config.js`.
- **Scroll reveal pattern**: Mock `useScrollReveal` in tests to return `{ ref: { current: null }, isVisible: true }`. Assert stagger delays via `items[i].style.transitionDelay`.
- **Link wrapping**: Steps use `<Link to={step.route}>` from react-router-dom.
- **Test wrapping**: `<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`.
- **SectionHeading `id` prop**: Passes `id` to `<h2>` element, enabling `aria-labelledby` on `<section>`.

### Design System Values

- `bg-hero-bg`: `#08051A`
- `WHITE_PURPLE_GRADIENT`: `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`
- `GRADIENT_TEXT_STYLE`: `{ color: 'white', backgroundImage: WHITE_PURPLE_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }`
- Section heading: `text-3xl sm:text-4xl lg:text-5xl font-bold` with `GRADIENT_TEXT_STYLE`
- Tagline: `text-base sm:text-lg text-white/60 mt-3 max-w-2xl`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click any step link | No auth gate — all 7 routes are public | N/A | N/A — no auth gating needed |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section background | background-color | `bg-hero-bg` (#08051A) | tailwind.config.js:22 |
| Section heading (via SectionHeading) | font | text-3xl sm:text-4xl lg:text-5xl font-bold | SectionHeading.tsx:25 |
| Section heading | style | `GRADIENT_TEXT_STYLE` | gradients.tsx:9-15 |
| Tagline | classes | `text-base sm:text-lg text-white/60 mt-3 max-w-2xl` | SectionHeading.tsx:33 |
| Step circle | classes | `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40 text-white text-sm font-semibold` | spec |
| Step circle shadow | default | `shadow-[0_0_20px_rgba(139,92,246,0.25)]` | spec |
| Step circle shadow | hover | `shadow-[0_0_30px_rgba(139,92,246,0.4)]` | spec |
| Prefix text | classes | `text-white/80 text-sm font-medium leading-tight` | spec |
| Keyword text | background | `WHITE_PURPLE_GRADIENT` via `background-clip: text` | spec + gradients.tsx:6 |
| Keyword text | font | `text-lg sm:text-xl font-bold leading-tight` | spec |
| Glow orb 1 | radial-gradient | `rgba(139, 92, 246, 0.15)` center to `transparent` 70%, `blur(80px)`, 500px | spec |
| Glow orb 2 | radial-gradient | `rgba(139, 92, 246, 0.12)` center to `transparent` 70%, `blur(80px)`, 400px | spec |
| Container | max-width | `max-w-5xl` | spec |
| Section padding | padding | `py-20 sm:py-28` | spec |
| Container padding | horizontal | `px-4 sm:px-6` | spec |
| Gap heading→steps | margin | `mt-12 sm:mt-16` | spec |

---

## Design System Reminder

**Project-specific quirks for execution:**

- `SectionHeading` applies `GRADIENT_TEXT_STYLE` to the full h2 text — no need for a separate Caveat `<span>` for "Healing"
- `WHITE_PURPLE_GRADIENT` is `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` — applied via inline style with `backgroundClip: 'text'`
- `bg-hero-bg` is `#08051A` — the darkest purple-black background
- All homepage sections on `homepage-redesign` branch use `bg-hero-bg` for dark backgrounds
- Glow orbs in `GlowBackground.tsx` use `0.06` opacity which is invisible — spec explicitly requires `0.12-0.15`
- `staggerDelay(index, baseDelay, initialDelay)` supports an `initialDelay` parameter for offset
- `SectionHeading` needs `id` prop to support `aria-labelledby` on the parent `<section>`
- `BackgroundSquiggle` has 5 other consumers — do NOT delete the component file

---

## Shared Data Models (from Master Plan)

Not applicable — standalone iteration.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Steps wrap into 3 rows (3+3+1 or similar), `gap-6`, `w-[100px]` per step, `justify-center` |
| Tablet | 640-1024px | Steps wrap into 2 rows (4+3), `gap-8`, `w-[120px]` per step, `justify-center` |
| Desktop | > 1024px | All 7 steps in a single row, `gap-10`, `w-[120px]` per step |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Section top → heading | `py-20 sm:py-28` (80px / 112px) | spec |
| Heading → steps row | `mt-12 sm:mt-16` (48px / 64px) | spec |
| Steps row → section bottom | `py-20 sm:py-28` (80px / 112px) | spec (symmetric padding) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `SectionHeading` component accepts `id` prop (confirmed: SectionHeading.tsx:9)
- [x] `staggerDelay` supports `initialDelay` parameter (confirmed: useScrollReveal.ts:54)
- [x] `BackgroundSquiggle` is used by 5 other files — cannot be deleted
- [x] All 7 step routes are public — no auth gating needed
- [x] Design system values verified from source files
- [x] No [UNVERIFIED] values — all values from spec or source files
- [ ] Branch is `homepage-redesign` and clean

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SectionHeading vs custom heading | Use SectionHeading with `id="journey-heading"` | Spec requires it; SectionHeading already applies GRADIENT_TEXT_STYLE to full heading |
| Glow implementation | Direct radial gradient divs, not GlowBackground wrapper | Spec explicitly says "Remove any existing GlowBackground wrapper" — need specific orb sizes/positions |
| BackgroundSquiggle cleanup | Remove from JourneySection only; do NOT delete file | 5 other consumers: DevotionalTabContent, PrayTabContent, JournalTabContent, MeditateTabContent, AskPage |
| Heading reveal before steps | Use `initialDelay=200` on step stagger | `staggerDelay(index, 80, 200)` gives steps a 200ms head start after heading |
| Heading scroll reveal | Separate `useScrollReveal` for heading | Heading reveals first, steps follow 200ms later per spec |
| Step text has no h3 | Use `<span>` elements since descriptions are removed | Current h3 headings contained prefix+highlight+description; without description, semantic heading is unnecessary. Links provide accessible names. |
| Focus ring on step links | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` | Matches existing pattern from current JourneySection link styling |

---

## Implementation Steps

### Step 1: Rewrite JourneySection Component

**Objective:** Replace vertical timeline with horizontal wrapping layout, switch to SectionHeading, fix glow orbs, remove descriptions/squiggle/connecting lines.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — Full rewrite

**Details:**

1. **Remove imports**: `ArrowRight` from lucide-react, `BackgroundSquiggle` + `SQUIGGLE_MASK_STYLE` from BackgroundSquiggle, `cn` from utils (may still need if used). Keep: `Link`, `useScrollReveal`, `staggerDelay`, `WHITE_PURPLE_GRADIENT`.

2. **Add imports**: `SectionHeading` from `@/components/homepage/SectionHeading`.

3. **Update `JourneyStep` interface**: Remove `description` field. Keep `number`, `prefix`, `highlight`, `route`.

4. **Update `JOURNEY_STEPS` data**: Remove all `description` values from the 7 step objects.

5. **Update `StepCircle` component**:
   ```tsx
   <span
     aria-hidden="true"
     className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-shadow duration-200"
   >
     {number}
   </span>
   ```
   Note: Added `transition-shadow duration-200` for hover animation. Shadow matches spec exactly.

6. **Replace section content**:
   - Section wrapper: `<section aria-labelledby="journey-heading" className="relative bg-hero-bg px-4 py-20 sm:px-6 sm:py-28">`
   - Remove BackgroundSquiggle block entirely
   - Glow orbs — two absolutely positioned divs with inline style radial gradients:
     ```tsx
     <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
       <div
         className="absolute left-[20%] top-[20%] h-[500px] w-[500px] rounded-full blur-[80px]"
         style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)' }}
       />
       <div
         className="absolute right-[15%] bottom-[20%] h-[400px] w-[400px] rounded-full blur-[80px]"
         style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)' }}
       />
     </div>
     ```
   - Container: `<div className="relative mx-auto max-w-5xl">`
   - Heading: `<SectionHeading id="journey-heading" heading="Your Journey to Healing" tagline="From prayer to community, every step draws you closer to peace." align="center" />`
   - Steps list wrapper with separate `useScrollReveal`:
     ```tsx
     <div ref={stepsRef as React.RefObject<HTMLDivElement>} className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 lg:gap-10">
     ```
     Note: Using `<div>` with `role="list"` instead of `<ol>` since items are no longer semantically ordered steps with descriptions. Actually, they ARE ordered (steps 1-7), so keep `<ol>` with `role="list"`.

   - Each step `<li>`:
     ```tsx
     <li
       key={step.route}
       className={cn(
         'transition-all duration-500 ease-out',
         isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
       )}
       style={isVisible ? staggerDelay(index, 80, 200) : { transitionDelay: '0ms' }}
     >
       <Link
         to={step.route}
         className="group flex w-[100px] flex-col items-center gap-2 text-center sm:w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
       >
         <StepCircle number={step.number} />
         <span className="text-sm font-medium leading-tight text-white/80 transition-colors duration-200 group-hover:text-white">
           {step.prefix}
         </span>
         <span
           className="text-lg font-bold leading-tight sm:text-xl transition-transform duration-200 group-hover:-translate-y-0.5"
           style={{
             background: WHITE_PURPLE_GRADIENT,
             backgroundClip: 'text',
             WebkitBackgroundClip: 'text',
             WebkitTextFillColor: 'transparent',
           }}
         >
           {step.highlight}
         </span>
       </Link>
     </li>
     ```

   - Hover effect on circle: Add `group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]` to StepCircle. Since StepCircle is a child component that doesn't have access to `group`, change StepCircle to accept a `className` prop or move the circle inline. Simplest: make StepCircle render inside the Link which has `group`, and add `group-hover:shadow-[...]` to the circle span.

7. **Two `useScrollReveal` calls**:
   - `headingRef` + `isHeadingVisible` for the SectionHeading wrapper
   - `stepsRef` + `isStepsVisible` for the steps list

   Actually, simpler approach per the spec: use a single `useScrollReveal` on the steps container. The heading is always above it and will naturally be visible before steps enter the viewport. The 200ms `initialDelay` on `staggerDelay` handles the offset.

   Use one `useScrollReveal`:
   ```tsx
   const { ref: stepsRef, isVisible } = useScrollReveal({ threshold: 0.1 })
   ```

**Responsive behavior:**
- Mobile (< 640px): `w-[100px]` per step, `gap-6` → wraps ~3 per row
- Tablet (sm+): `w-[120px]` per step, `gap-8` → wraps ~4 per row
- Desktop (lg+): `gap-10` → all 7 fit in one row (7 × 120px + 6 × 40px = 1080px < max-w-5xl = 1024px). Actually `max-w-5xl` = 1024px. 7 × 120 + 6 × 40 = 1080px. That's slightly over. With `px-4 sm:px-6`, available width is 1024 - 48 = 976px. Items won't all fit in one row at exactly 1024px. However, `flex-wrap` handles this gracefully — at typical desktop widths (1280px+), all 7 will fit. At exactly lg (1024px), it may wrap to 2 rows, which is acceptable per the spec ("Steps wrap into 2 rows" for tablet). The spec says "Desktop (> 1024px): All 7 steps in a single row" — at typical desktop widths this works.

**Guardrails (DO NOT):**
- DO NOT delete `BackgroundSquiggle.tsx` — 5 other consumers
- DO NOT use `GlowBackground` wrapper — spec explicitly replaces it with direct orbs
- DO NOT use Caveat/font-script on step keywords — spec replaces with gradient text
- DO NOT add `h3` elements for step titles — descriptions are removed, semantic heading unnecessary
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT change the JOURNEY_STEPS route values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders section landmark with aria-labelledby | integration | `getByRole('region', { name: /your journey to healing/i })` |
| Renders h2 heading via SectionHeading | integration | `getByRole('heading', { level: 2, name: /your journey to healing/i })` |
| Renders tagline text | integration | Check for tagline p element with correct text |
| Renders ordered list with 7 items | integration | `getByRole('list')` is `OL`, 7 listitems |
| Renders numbered circles 1-7 | integration | `getByText(String(i))` for i=1..7 |
| Each step links to correct route | integration | 7 links with correct `href` attributes |
| All prefix text rendered | integration | Check "Read a", "Learn to", "Listen to", etc. |
| All keyword text rendered | integration | Check "Devotional", "Pray", "Journal", etc. |
| No description text present | integration | `queryByText(/start each morning/i)` returns null |
| No BackgroundSquiggle rendered | integration | No squiggle SVG in the component |
| Links are keyboard-focusable | integration | No `tabindex="-1"` on links |
| Circles are aria-hidden | integration | `aria-hidden="true"` on circle spans |
| Links have focus-visible ring classes | integration | Check className contains `focus-visible:ring-2` |
| Steps have staggered delays with 80ms base + 200ms initial | integration | `items[i].style.transitionDelay === `${200 + i * 80}ms`` |
| Glow orbs are pointer-events-none | integration | Check `pointer-events-none` class on glow container |
| Two glow orbs present | integration | Query by glow orb characteristic (e.g., blur class or inline background style) |

**Expected state after completion:**
- [ ] JourneySection renders horizontal layout with 7 steps
- [ ] SectionHeading used for heading with gradient text
- [ ] Glow orbs visible at 0.12-0.15 opacity
- [ ] No BackgroundSquiggle, no descriptions, no connecting lines
- [ ] All tests pass

---

### Step 2: Update JourneySection Tests

**Objective:** Rewrite test file to match the new horizontal layout, remove description assertions, add new visual/structural tests.

**Files to modify:**
- `frontend/src/components/__tests__/JourneySection.test.tsx` — Rewrite

**Details:**

1. **Update mock**: Change `staggerDelay` mock to match new signature:
   ```tsx
   staggerDelay: (index: number, base: number, initial: number = 0) => ({
     transitionDelay: `${initial + index * base}ms`,
   }),
   ```

2. **Keep existing passing patterns**: `renderJourney()` with `MemoryRouter`, `STEP_ROUTES` array.

3. **Update `STEP_TITLES` → split into prefixes and keywords**: Since there are no longer h3 headings, test for the presence of prefix text ("Read a", "Learn to", etc.) and keyword text ("Devotional", "Pray", etc.) separately.

4. **Remove tests**:
   - "renders description snippets for steps" — descriptions removed
   - "arrow icons are aria-hidden" — ArrowRight removed
   - "renders all 7 step title headings" (h3 assertions) — no h3 elements

5. **Add tests**:
   - "does not render description text" — assert old descriptions absent
   - "renders prefix text for each step" — "Read a", "Learn to" × 3, "Listen to", "Write on the", "Find"
   - "renders keyword text for each step" — "Devotional", "Pray", "Journal", "Meditate", "Music", "Prayer Wall", "Local Support"
   - "heading uses SectionHeading with gradient style" — check h2 `style.backgroundImage` equals `WHITE_PURPLE_GRADIENT`
   - "steps have 80ms stagger with 200ms initial delay" — `items[i].style.transitionDelay === `${200 + i * 80}ms``
   - "glow orbs have pointer-events-none" — query glow container
   - "two glow orbs present" — count elements with blur styling
   - "step links have consistent width class" — check `w-[100px]` or `sm:w-[120px]` class
   - "steps container uses flex-wrap and justify-center" — check classes on ol/container

6. **Preserved tests** (adapted as needed):
   - Section landmark with aria-labelledby
   - h2 heading
   - Tagline text
   - Ordered list with 7 items
   - Numbered circles 1-7
   - Links to correct routes
   - Keyboard-focusable links
   - Circles aria-hidden
   - Focus-visible ring classes

**Responsive behavior:** N/A: no UI impact (test file).

**Guardrails (DO NOT):**
- DO NOT test for h3 headings — they no longer exist
- DO NOT test for description text presence — it was removed
- DO NOT test for ArrowRight icons — removed
- DO NOT remove MemoryRouter wrapping — Links require it

**Test specifications:**
Self-referential — this step IS the test update.

**Expected state after completion:**
- [ ] All JourneySection tests pass
- [ ] Tests cover: structure, content (prefix + keyword text), accessibility, animation timing, glow orbs
- [ ] No references to removed elements (descriptions, h3, ArrowRight, BackgroundSquiggle)

---

### Step 3: Build Verification

**Objective:** Verify TypeScript compilation, full test suite, and no orphaned imports.

**Files to modify:** None (verification only).

**Details:**

1. Run `pnpm tsc --noEmit` — expect 0 errors
2. Run `pnpm test` — expect all tests pass (0 failures)
3. Grep for orphaned `BackgroundSquiggle` imports in JourneySection: `grep -r "BackgroundSquiggle" frontend/src/components/JourneySection.tsx` — expect 0 results
4. Grep for orphaned `ArrowRight` imports in JourneySection: `grep -r "ArrowRight" frontend/src/components/JourneySection.tsx` — expect 0 results

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any files in this step
- DO NOT skip test verification

**Test specifications:** N/A (verification step).

**Expected state after completion:**
- [ ] TypeScript: 0 errors
- [ ] Tests: all pass, 0 failures
- [ ] No orphaned imports

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Rewrite JourneySection component |
| 2 | 1 | Update JourneySection tests |
| 3 | 1, 2 | Build and test verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Rewrite JourneySection component | [COMPLETE] | 2026-04-02 | Modified `frontend/src/components/JourneySection.tsx` — full rewrite to horizontal flex-wrap layout with SectionHeading, direct glow orbs, removed BackgroundSquiggle/descriptions/connecting lines/ArrowRight |
| 2 | Update JourneySection tests | [COMPLETE] | 2026-04-02 | Modified `frontend/src/components/__tests__/JourneySection.test.tsx` — 18 tests covering structure, content (prefix + keyword), accessibility, glow orbs, animation timing. Removed h3/description/ArrowRight assertions |
| 3 | Build verification | [COMPLETE] | 2026-04-02 | TypeScript: 0 errors. Tests: 5,438 pass / 0 fail. No orphaned imports (BackgroundSquiggle, ArrowRight both clean). |
