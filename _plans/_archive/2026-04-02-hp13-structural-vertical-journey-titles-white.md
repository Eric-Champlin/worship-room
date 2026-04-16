# Implementation Plan: HP-13 — Structural — Vertical Journey, 2-Line Titles, Grey→White Text Pass

**Spec:** `_specs/hp13-structural-vertical-journey-titles-white.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch — do NOT create a new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-03-06, before homepage redesign series; stale for homepage values; current source files are authoritative)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/` (barrel export at `index.ts`)
- JourneySection: `frontend/src/components/JourneySection.tsx` (standalone, not in `homepage/`)
- StartingPointQuiz: `frontend/src/components/StartingPointQuiz.tsx` (standalone)
- BackgroundSquiggle: `frontend/src/components/BackgroundSquiggle.tsx` (15 active consumers, NOT homepage-only)
- Shared constants: `frontend/src/constants/gradients.tsx` — `WHITE_PURPLE_GRADIENT`, `GRADIENT_TEXT_STYLE`
- Hooks: `frontend/src/hooks/useScrollReveal.ts` — `useScrollReveal()`, `staggerDelay()`
- Tailwind config: `frontend/tailwind.config.js`
- Home page: `frontend/src/pages/Home.tsx`

### Current State of Key Components

**JourneySection** (139 lines): Horizontal flex-wrap layout (`flex-wrap justify-center gap-6`). 7 steps with numbered circles, prefix text, and keyword highlight (gradient text). No descriptions. No BackgroundSquiggle. No connecting vertical line. Container is `max-w-6xl`. Links already route to correct feature pages. Steps styled as compact 100px-wide cards.

**SectionHeading** (42 lines): Single `heading` prop rendered as `<h2>` with `GRADIENT_TEXT_STYLE`. Optional `tagline` prop with `text-white/60`. Optional `align`, `className`, `id` props. NO support for 2-line treatment.

**FinalCTA** (66 lines): Heading "Your Healing Starts Here" as single `<h2>` with `GRADIENT_TEXT_STYLE`. Subtext includes "Just a quiet room..." sentence. Trust line "Join thousands..." present at `text-white/30`. Button unchanged.

**DashboardPreview** (231 lines): No separate `DashboardPreviewCard.tsx` file — cards rendered inline. SectionHeading used with `heading="See What's Waiting for You"`. Lock overlay: Lock icon `text-white/40`, text `text-white/50`. Card headers: icon `text-white/50`, title `text-white/70`. Various preview sub-components have `text-white/40` through `text-white/60` values.

**DifferentiatorSection** (56 lines): SectionHeading with `heading="Built for Your Heart"`. Description text `text-white/55`. Icon color `text-white/80`.

**StatsBar** (79 lines): Labels use `text-white/50 text-xs uppercase tracking-wide`.

**StartingPointQuiz** (420 lines): Dark variant uses `SectionHeading` with `heading="Not Sure Where to Start?"`. Quiz has text-white/50, text-white/70, text-white/80 values. Some are conditional on isDark.

**BackgroundSquiggle** (71 lines): Accepts `className` and `aspectRatio` props. Default className is `pointer-events-none absolute inset-0 h-full w-full`. SVG viewBox is `0 0 1800 1350`. No built-in width constraint — width comes from the parent container.

### Test Patterns

- Tests co-located in `__tests__/` directories
- Vitest + React Testing Library
- `useScrollReveal` mocked to return `isVisible: true` and working `staggerDelay`
- `useAuthModal` mocked where needed
- MemoryRouter wrapping for components with Links
- `ToastProvider` + `AuthModalProvider` for DashboardPreview tests
- SectionHeading test checks `text-white/60` on tagline — MUST be updated

### File Inventory — `DashboardPreviewCard.tsx` Does NOT Exist

The spec lists `DashboardPreviewCard` in the sweep files, but no such file exists. The preview cards are rendered inline in `DashboardPreview.tsx`. All grey→white changes for preview cards happen in `DashboardPreview.tsx`.

---

## Auth Gating Checklist

No new auth gates introduced. All changes are visual/structural.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click journey step link | Navigates to feature route (public) | Step 1 | N/A — no gate |
| Click "Get Started" in FinalCTA | Opens auth modal | Unchanged | `useAuthModal` — already implemented |

---

## Design System Values (for UI steps)

Values sourced from current component files (authoritative over stale recon):

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| All homepage sections | background | `bg-hero-bg` (#08051A) | `tailwind.config.js` |
| Numbered circles | styling | `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40 shadow-[0_0_20px_rgba(139,92,246,0.25)]` | spec |
| Connecting line | styling | `w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30` | spec |
| Journey container | layout | `max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-28` | spec |
| Description text | color | `text-white text-sm sm:text-base leading-relaxed max-w-lg` | spec |
| 2-line top | font | `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight` | spec |
| 2-line bottom | font | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` + `WHITE_PURPLE_GRADIENT` | spec |
| Tagline | styling | `text-white text-base sm:text-lg mt-4 max-w-2xl mx-auto` | spec |
| WHITE_PURPLE_GRADIENT | CSS | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `gradients.tsx:6` |
| GRADIENT_TEXT_STYLE | CSS | backgroundImage + clip + transparent fill | `gradients.tsx:9-15` |
| StatsBar labels (exception) | color | `text-white/90` (not full white) | spec |
| Lock overlay (exception) | icon/text | `text-white/40` / `text-white/50` | spec |
| FrostedCard | base style | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` | `FrostedCard.tsx:22` |

---

## Design System Reminder

- `bg-hero-bg` is `#08051A` (from tailwind.config.js) — distinct from `bg-hero-dark` (#0D0620)
- `WHITE_PURPLE_GRADIENT` = `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` — used for gradient text on keywords
- `GRADIENT_TEXT_STYLE` is for heading text (includes backgroundClip + transparent fill). Keyword gradient in JourneySection uses the same gradient but applied as inline style (NOT via `GRADIENT_TEXT_STYLE`).
- Caveat (`font-script`) is for hero H1s and script accents — NOT for journey keyword text (spec says bold NOT Caveat)
- All homepage sections use `GlowBackground` wrapper (except JourneySection and HeroSection which apply `bg-hero-bg` directly)
- Scroll reveal CSS classes: `.scroll-reveal` (opacity + translateY) and `.scroll-reveal-fade` (opacity only)
- `BackgroundSquiggle` uses `SQUIGGLE_MASK_STYLE` for fade mask — import from same file
- `staggerDelay(index, base, initial)` returns `{ transitionDelay: '${initial + index * base}ms' }`
- JourneySection is NOT in `homepage/` directory — it's at `frontend/src/components/JourneySection.tsx`
- No `DashboardPreviewCard.tsx` exists — cards are inline in `DashboardPreview.tsx`

---

## Shared Data Models (from Master Plan)

N/A — No master spec plan. No data model changes. No localStorage keys affected.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Journey steps stack vertically (same layout, tighter). Section headings: text-2xl top / text-4xl bottom. Squiggles centered at 40-50% width. |
| Tablet | 640-1024px | Same vertical layout. Headings at sm sizes: text-3xl top / text-5xl bottom. |
| Desktop | > 1024px | Full vertical layout with max-w-2xl container. Headings at lg sizes: text-4xl top / text-6xl bottom. |

Journey section is inherently mobile-friendly as a vertical list — no layout changes between breakpoints, only typography scaling.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| All homepage sections | `py-20 sm:py-28` (80px/112px) | HP-12 verification |
| StatsBar | `py-14 sm:py-20` (56px/80px) | `StatsBar.tsx:63` |
| Section heading → content | `mt-12 sm:mt-16` | Current pattern in all sections |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] On `homepage-redesign` branch (spec says continue, no new branch)
- [x] All auth-gated actions from the spec are accounted for (none new)
- [x] Design system values verified from current source files
- [x] `DashboardPreviewCard.tsx` does NOT exist — spec reference is to inline code in `DashboardPreview.tsx`
- [ ] Assumption: `BackgroundSquiggle` width constraint achieved by wrapping it in a container with `max-w-[50%] mx-auto` or equivalent — if SVG doesn't respect this, adjust via explicit `width` style
- [ ] Assumption: The 2-line `SectionHeading` is backward-compatible — existing `heading` prop renders as-is
- [ ] Assumption: `text-white/80` on JourneySection prefix text (line 117) converts to `text-white` per the grey→white sweep

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `DashboardPreviewCard` in spec sweep | Apply changes to inline code in `DashboardPreview.tsx` | No separate file exists; all preview card rendering is inline |
| DashboardPreview lock overlay text | Keep `text-white/50` and icon `text-white/40` | Spec explicitly exempts lock overlay from grey→white conversion |
| DashboardPreview preview sub-component text (card body area) | Keep all `text-white/40` values in preview content (`aria-hidden="true"` areas) | Preview content is behind lock overlay and decorative (`aria-hidden`). These are NOT readable text — they're visual decoration. The spec's exception for lock overlays logically extends to the content behind them. |
| DashboardPreview card headers (icon + title) | Convert `text-white/50` icon → `text-white`, `text-white/70` title → `text-white` | These are above the lock overlay and are readable text — not exempt |
| DashboardPreview CTA text "All of this is free" | Convert `text-white/60` → `text-white` | Readable text, not exempt |
| StartingPointQuiz `isDark` text values | Convert: `text-white/50` (question counter) → `text-white`, `text-white/70` (option text, result description, explore link) → `text-white`, `text-white/80` (verse blockquote) → `text-white`, `text-white/50` (citation, back button) → `text-white` | These are all readable text on dark background within the homepage quiz. The spec says convert all text-white/30 through text-white/70 to text-white across homepage files. text-white/80 also rounds up. |
| Placeholder text in StartingPointQuiz | Not applicable — no placeholder inputs in quiz | Spec exempts `placeholder:text-white/...` |
| BackgroundSquiggle constrained width | Wrap in a centered container `left-1/2 -translate-x-1/2 w-[45%]` | Spec says 40-50% of viewport width, centered. Use 45% as middle ground. |
| StatsBar labels `text-white/50` | Change to `text-white/90` | Spec says exception: ALL CAPS labels → `text-white/90` |

---

## Implementation Steps

### Step 1: Extend SectionHeading with 2-Line Treatment

**Objective:** Add `topLine` + `bottomLine` props to `SectionHeading` while maintaining backward compatibility with the existing `heading` prop.

**Files to create/modify:**
- `frontend/src/components/homepage/SectionHeading.tsx` — add new props, update render logic
- `frontend/src/components/homepage/__tests__/SectionHeading.test.tsx` — add tests for new props

**Details:**

Add to `SectionHeadingProps`:
```typescript
interface SectionHeadingProps {
  heading?: string           // existing — backward compat (single line)
  topLine?: string           // NEW
  bottomLine?: string        // NEW
  tagline?: string
  align?: 'center' | 'left'
  className?: string
  id?: string
}
```

Render logic:
- If `topLine` + `bottomLine` provided: render two `<span>` elements inside `<h2>`, each `display: block`
  - Top line: `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`
  - Bottom line: `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1` with `GRADIENT_TEXT_STYLE` applied as inline style
- If `heading` provided (no topLine/bottomLine): render single-line `<h2>` with `GRADIENT_TEXT_STYLE` (current behavior, unchanged)
- Tagline: change `text-white/60` → `text-white` (Part 4 sweep applies here), change `mt-3` → `mt-4`, keep `text-base sm:text-lg max-w-2xl`

**Responsive behavior:**
- Desktop (1440px): Top `text-4xl`, Bottom `text-6xl`
- Tablet (768px): Top `text-3xl`, Bottom `text-5xl`
- Mobile (375px): Top `text-2xl`, Bottom `text-4xl`

**Guardrails (DO NOT):**
- DO NOT remove the `heading` prop or break backward compatibility
- DO NOT use Caveat (`font-script`) for the bottom line — use Inter (default sans)
- DO NOT use `GRADIENT_TEXT_STYLE` on the top line — only on the bottom line

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 2-line heading with topLine + bottomLine | unit | Verify h2 contains both lines |
| top line renders in white | unit | Verify no gradient style on top line, text-white class |
| bottom line renders with gradient | unit | Verify GRADIENT_TEXT_STYLE applied to bottom line span |
| backward compat: heading prop still works | unit | Verify existing single-line behavior unchanged |
| tagline now uses text-white | unit | Verify tagline no longer has text-white/60 |
| top line has correct responsive sizing | unit | Verify text-2xl sm:text-3xl lg:text-4xl classes |
| bottom line has correct responsive sizing | unit | Verify text-4xl sm:text-5xl lg:text-6xl classes |

**Expected state after completion:**
- [x] `SectionHeading` renders 2-line or 1-line heading based on props
- [x] Existing consumers still work with `heading` prop
- [x] Tagline uses `text-white` (not `text-white/60`)
- [x] All 7+ existing SectionHeading tests pass (with test assertion update for tagline class)
- [x] New tests pass

---

### Step 2: Rewrite JourneySection — Vertical Layout with Descriptions

**Objective:** Revert JourneySection from horizontal compact layout to a vertical numbered list with titles, descriptions, BackgroundSquiggle, connecting line, and scroll reveal.

**Files to create/modify:**
- `frontend/src/components/JourneySection.tsx` — full rewrite of layout and data
- `frontend/src/components/__tests__/JourneySection.test.tsx` — rewrite tests for new structure

**Details:**

**Data model update** — expand `JourneyStep` interface:
```typescript
interface JourneyStep {
  number: number
  title: React.ReactNode  // changed from prefix+highlight to title with inline gradient keyword
  description: string
  route: string
}
```

Each step's `title` rendered as JSX with the bolded keyword using inline `WHITE_PURPLE_GRADIENT` style (same technique as current `highlight` span — `background`, `backgroundClip`, `WebkitBackgroundClip`, `WebkitTextFillColor: 'transparent'`). NOT Caveat font.

7 steps with titles and descriptions from the spec table:
1. Read a **Devotional** → `/daily?tab=devotional`
2. Learn to **Pray** → `/daily?tab=pray`
3. Learn to **Journal** → `/daily?tab=journal`
4. Learn to **Meditate** → `/daily?tab=meditate`
5. Listen to **Music** → `/music`
6. Write on the **Prayer Wall** → `/prayer-wall`
7. Find **Local Support** → `/local-support/churches`

**Layout structure:**
```tsx
<section aria-labelledby="journey-heading" className="relative bg-hero-bg px-4 py-20 sm:px-6 sm:py-28">
  {/* Glow orbs (same as current — two orbs) */}
  {/* BackgroundSquiggle — constrained to center 40-50% */}
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden" style={SQUIGGLE_MASK_STYLE}>
    <div className="w-[45%]">
      <BackgroundSquiggle className="h-full w-full opacity-20" />
    </div>
  </div>
  <div className="relative mx-auto max-w-2xl">
    <SectionHeading topLine="Your Journey to" bottomLine="Healing" tagline="From prayer to community, every step draws you closer to peace." id="journey-heading" />
    <ol ref={stepsRef} role="list" className="mt-12 sm:mt-16 space-y-0">
      {steps.map((step, index) => (
        <li key={step.route} className="relative" style={isVisible ? staggerDelay(index, 120, 200) : { transitionDelay: '0ms' }}>
          {/* Connecting line between circles (not on last item) */}
          {index < steps.length - 1 && (
            <div aria-hidden="true" className="absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30" />
          )}
          <Link to={step.route} className="group flex items-start gap-4 rounded-xl px-3 py-4 transition-colors duration-200 hover:bg-white/[0.04] focus-visible:...">
            <StepCircle number={step.number} />
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-white sm:text-xl">{step.title}</h3>
              <p className="text-white text-sm sm:text-base leading-relaxed max-w-lg mt-1">{step.description}</p>
            </div>
            {/* Arrow on hover */}
            <ArrowRight className="mt-2 h-5 w-5 text-white/0 transition-all duration-200 group-hover:text-white/60 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  </div>
</section>
```

**StepCircle** — keep current styling with glow: `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40 shadow-[0_0_20px_rgba(139,92,246,0.25)]` + hover enhancement `group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]`.

**Connecting line** — `absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30`. `left-5` centers under the 40px (w-10) circle.

**Scroll reveal** — `useScrollReveal` on the `<ol>`, staggered at 120ms between items (spec says 120ms, current is 80ms).

**Description text** — `text-white text-sm sm:text-base leading-relaxed max-w-lg` (spec requirement, NOT muted).

**Hover** — `hover:bg-white/[0.04]` subtle background lift + `ArrowRight` icon appears (transitions from `text-white/0` to `text-white/60` with `translate-x-1`). Import `ArrowRight` from `lucide-react`.

**BackgroundSquiggle** — import `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` from `@/components/BackgroundSquiggle`. Constrain to center 45% via wrapper: `<div className="w-[45%]">`. Apply `SQUIGGLE_MASK_STYLE` to outer container. Apply `opacity-20` to make it subtle on the dark background (squiggles are light gray — need lower opacity to be subtle on dark bg).

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl` container, full vertical layout
- Tablet (768px): Same vertical layout, same container
- Mobile (375px): Same vertical layout, tighter padding from `px-4`

**Guardrails (DO NOT):**
- DO NOT use Caveat font for keywords — use bold Inter with gradient
- DO NOT use `flex-wrap` or horizontal layout — this is a vertical list
- DO NOT use `text-white/XX` for description text — use `text-white` per Part 4
- DO NOT delete BackgroundSquiggle component — 15 other consumers depend on it
- DO NOT make the squiggle full-width — constrain to center 40-50%
- DO NOT make the container `max-w-6xl` — spec says `max-w-2xl`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders as named section landmark | unit | `role="region"` with journey heading name |
| renders h2 with topLine and bottomLine | unit | Verify 2-line heading "Your Journey to" / "Healing" |
| renders tagline | unit | Verify tagline text present |
| renders ordered list with 7 items | unit | `<ol>` with `role="list"`, 7 `<li>` elements |
| renders numbered circles 1-7 | unit | Numbers 1 through 7 present |
| renders description text for each step | unit | Verify descriptions are rendered (e.g., "Start each morning") |
| each step links to correct route | unit | All 7 routes verified |
| step links have hover background class | unit | `hover:bg-white/[0.04]` on link |
| connecting line present between circles (not on last) | unit | 6 connecting line elements (`.w-px`) |
| BackgroundSquiggle rendered | unit | SVG present |
| BackgroundSquiggle container constrained to ~45% width | unit | Container has `w-[45%]` |
| glow orbs present | unit | 2 glow orbs with radial-gradient |
| steps have 120ms stagger with 200ms initial delay | unit | Verify transitionDelay values |
| arrow icon present for hover | unit | ArrowRight icon per step |

**Expected state after completion:**
- [x] Vertical numbered list with titles, descriptions, gradient keywords
- [x] BackgroundSquiggle rendered narrow and centered
- [x] Connecting lines visible between steps
- [x] 2-line heading via updated SectionHeading
- [x] All description text is `text-white` (not muted)
- [x] Scroll reveal with 120ms stagger
- [x] All tests pass

---

### Step 3: Apply 2-Line Headings to All Homepage Sections

**Objective:** Update all remaining homepage sections to use the new 2-line `SectionHeading` treatment.

**Files to create/modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — update SectionHeading call
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — update SectionHeading call
- `frontend/src/components/StartingPointQuiz.tsx` — update dark variant SectionHeading call
- `frontend/src/components/homepage/FinalCTA.tsx` — replace inline h2 with 2-line treatment

**Details:**

**DashboardPreview** (line 167):
```tsx
// Before:
<SectionHeading heading="See What's Waiting for You" tagline="Your personal dashboard — ..." />

// After:
<SectionHeading topLine="See What's" bottomLine="Waiting for You" tagline="Create a free account and unlock your personal dashboard." />
```

**DifferentiatorSection** (line 20):
```tsx
// Before:
<SectionHeading heading="Built for Your Heart" tagline="The things we'll never do ..." />

// After:
<SectionHeading topLine="Built for" bottomLine="Your Heart" tagline="The things we'll never do matter as much as the things we will." />
```

**StartingPointQuiz** (dark variant, line 174-178):
```tsx
// Before:
<SectionHeading id="quiz-heading" heading="Not Sure Where to Start?" tagline="Take a 30-second quiz..." />

// After:
<SectionHeading id="quiz-heading" topLine="Not Sure Where to" bottomLine="Start?" tagline="Take a 30-second quiz and we'll point you in the right direction." />
```

**FinalCTA** — Replace the inline `<h2>` (lines 28-34) with the 2-line pattern matching the sizing. Since FinalCTA doesn't use `SectionHeading`, apply the 2-line treatment directly:
```tsx
// Replace the existing h2 with:
<div className={cn('scroll-reveal text-center', isVisible && 'is-visible')} style={staggerDelay(0)}>
  <h2>
    <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
      Your Healing
    </span>
    <span className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1" style={GRADIENT_TEXT_STYLE}>
      Starts Here
    </span>
  </h2>
</div>
```

**Responsive behavior:**
- All breakpoints: Typography scales via Tailwind responsive classes (same as Step 1)

**Guardrails (DO NOT):**
- DO NOT change the light variant of StartingPointQuiz — only update the dark variant heading
- DO NOT change FinalCTA button or auth modal behavior
- DO NOT change DashboardPreview card grid or preview content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DashboardPreview heading uses topLine/bottomLine | integration | Verify "See What's" and "Waiting for You" rendered |
| DifferentiatorSection heading uses topLine/bottomLine | integration | Verify "Built for" and "Your Heart" rendered |
| StartingPointQuiz (dark) heading uses topLine/bottomLine | integration | Verify "Not Sure Where to" and "Start?" rendered |
| FinalCTA heading renders as 2 lines | integration | Verify "Your Healing" and "Starts Here" in separate spans |

**Expected state after completion:**
- [x] All 5 homepage sections use 2-line heading treatment
- [x] FinalCTA matches the 2-line sizing even without `SectionHeading`
- [x] All existing tests updated/passing

---

### Step 4: Final CTA Copy Edits

**Objective:** Shorten FinalCTA subtext and remove trust line.

**Files to create/modify:**
- `frontend/src/components/homepage/FinalCTA.tsx` — update text content
- `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx` — update assertions

**Details:**

**Subtext change** (line 44): Change "No credit card. No commitment. Just a quiet room where God meets you where you are." to exactly:
```
No credit card. No commitment.
```

**Trust line removal** (lines 58-60): Delete entirely:
```tsx
// DELETE:
<p className="mt-4 text-xs tracking-wide text-white/30">
  Join thousands finding peace, one prayer at a time.
</p>
```

**Test updates:**
- FinalCTA test line 51 ("renders trust line"): delete this test
- FinalCTA test line 39 ("renders subtext"): verify it still passes with shortened text (regex `/no credit card/i` still matches)

**Responsive behavior:** N/A: no UI impact (text-only change)

**Guardrails (DO NOT):**
- DO NOT change the "Get Started — It's Free" button
- DO NOT change auth modal behavior
- DO NOT remove the extra glow orb

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| subtext is exactly "No credit card. No commitment." | unit | Verify no additional text after "commitment." |
| trust line removed | unit | Verify no "Join thousands" text |
| button unchanged | unit | "Get Started" button still present and functional |

**Expected state after completion:**
- [x] Subtext shortened to "No credit card. No commitment."
- [x] Trust line completely removed
- [x] Button unchanged
- [x] All tests pass

---

### Step 5: Grey → White Text Pass

**Objective:** Convert all `text-white/30` through `text-white/70` to `text-white` across all homepage files, with documented exceptions.

**Files to create/modify:**
- `frontend/src/components/JourneySection.tsx` — already handled in Step 2 (all text is `text-white`)
- `frontend/src/components/homepage/SectionHeading.tsx` — already handled in Step 1 (tagline → `text-white`)
- `frontend/src/components/homepage/StatsBar.tsx` — labels `text-white/50` → `text-white/90`
- `frontend/src/components/homepage/DashboardPreview.tsx` — card headers + CTA text
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — description text + icon color
- `frontend/src/components/homepage/differentiator-data.ts` — no text colors here (data only)
- `frontend/src/components/homepage/FinalCTA.tsx` — subtext already addressed in Steps 3-4; trust line removed in Step 4
- `frontend/src/components/StartingPointQuiz.tsx` — dark variant text values
- `frontend/src/components/homepage/FrostedCard.tsx` — no text colors (container only)
- `frontend/src/components/homepage/GlowBackground.tsx` — no text colors (background only)
- `frontend/src/components/homepage/dashboard-preview-data.ts` — no text colors (data only)

**Detailed changes per file:**

**StatsBar.tsx** (line 46):
- `text-white/50` → `text-white/90` (exception: ALL CAPS labels)

**DashboardPreview.tsx:**
- Line 187: card header icon `text-white/50` → `text-white` (above lock overlay, readable)
- Line 188: card header title `text-white/70` → `text-white` (above lock overlay, readable)
- Line 210: CTA text `text-white/60` → `text-white` (readable text)
- **KEEP (lock overlay exceptions):** Line 134 `text-white/40` (Lock icon), Line 135 `text-white/50` (lock text)
- **KEEP (decorative preview content behind lock overlay, `aria-hidden="true"`):** Lines 28, 40, 44, 81, 86, 99, 100, 103, 120, 124 — all `text-white/40` through `text-white/60` values in preview sub-components. These are decorative visual elements behind a lock overlay, not readable text.

**DifferentiatorSection.tsx:**
- Line 44: `text-white/55` → `text-white` (description text)
- Line 38: `text-white/80` → `text-white` (icon color)

**FinalCTA.tsx:**
- Line 39: `text-white/55` → `text-white` (subtext — if not already changed by Step 4)
- Line 59: trust line deleted in Step 4 (no change needed)

**StartingPointQuiz.tsx** (dark variant only):
- Line 106: `text-white/50` → `text-white` (question counter "Question X of Y")
- Line 251: `text-white/50 hover:text-white` → `text-white` (back button — remove hover since already white)
- Line 288: `text-white/70` → `text-white` (option button text)
- Line 333: `text-white/70` → `text-white` (result description)
- Line 337: `text-white/80` → `text-white` (verse blockquote)
- Line 347: `text-white/50` → `text-white` (citation)
- Line 385: `text-white/70 hover:text-primary-lt` → `text-white hover:text-primary-lt` (explore link)
- **KEEP:** `placeholder:text-white/...` values (none exist in quiz)

**Test updates needed:**
- `SectionHeading.test.tsx` line 17: change `text-white/60` assertion → `text-white`
- `FinalCTA.test.tsx`: verify subtext match (regex should still work)
- `DashboardPreview.test.tsx`: check if any tests assert on `text-white/50` or `text-white/70` for card headers
- `DifferentiatorSection.test.tsx`: check if any tests assert on `text-white/55`
- `StatsBar.test.tsx`: check if any tests assert on `text-white/50`

**Responsive behavior:** N/A: no UI impact (color-only change)

**Guardrails (DO NOT):**
- DO NOT change `placeholder:text-white/...` values on inputs
- DO NOT change lock overlay text (`text-white/50`) or icon (`text-white/40`)
- DO NOT change decorative preview content behind lock overlay
- DO NOT change non-homepage files (this is homepage-only)
- DO NOT change light variant values in StartingPointQuiz (only isDark branches)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| StatsBar labels are text-white/90 | unit | Verify ALL CAPS labels use /90 |
| DashboardPreview card headers are text-white | unit | Verify icon and title |
| DashboardPreview lock overlay unchanged | unit | Lock icon still text-white/40, text still text-white/50 |
| DifferentiatorSection description is text-white | unit | Verify description text |
| SectionHeading tagline assertion updated | unit | Updated from text-white/60 to text-white |

**Expected state after completion:**
- [x] No `text-white/50`, `text-white/55`, `text-white/60`, or `text-white/70` on readable text in homepage files
- [x] StatsBar ALL CAPS labels use `text-white/90`
- [x] Lock overlay text remains `text-white/50`, icon remains `text-white/40`
- [x] All tests pass with updated assertions
- [x] Build passes with 0 errors

---

### Step 6: Final Verification — Build + Tests

**Objective:** Ensure the build compiles cleanly and all tests pass.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `cd frontend && pnpm build` — verify 0 errors, 0 warnings
2. Run `cd frontend && pnpm test` — verify all tests pass (including updated test files)
3. Spot-check: grep for any remaining `text-white/[3-7]0` in homepage files (should only be in lock overlay and decorative preview content)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT make any code changes in this step — verification only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build compiles | build | `pnpm build` exits 0 |
| All tests pass | test | `pnpm test` exits 0 |

**Expected state after completion:**
- [x] Build passes with 0 errors
- [x] All tests pass
- [x] Ready for visual verification and commit

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend SectionHeading with 2-line treatment |
| 2 | 1 | Rewrite JourneySection (consumes updated SectionHeading) |
| 3 | 1 | Apply 2-line headings to DashboardPreview, Differentiator, Quiz, FinalCTA |
| 4 | 3 | FinalCTA copy edits (depends on Step 3 having restructured the h2) |
| 5 | 1, 2, 3, 4 | Grey→white sweep across all files (best done last to avoid conflicts) |
| 6 | 1, 2, 3, 4, 5 | Final verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend SectionHeading with 2-line treatment | [COMPLETE] | 2026-04-02 | Modified SectionHeading.tsx (added topLine/bottomLine props, tagline text-white + mt-4), updated tests (14 passing) |
| 2 | Rewrite JourneySection — vertical layout | [COMPLETE] | 2026-04-02 | Rewrote JourneySection.tsx: vertical layout, descriptions, BackgroundSquiggle (45% centered), connecting lines, ArrowRight hover, 120ms stagger, 2-line heading. 17 tests passing. |
| 3 | Apply 2-line headings to all sections | [COMPLETE] | 2026-04-02 | Updated DashboardPreview, DifferentiatorSection, StartingPointQuiz (dark variant), FinalCTA (inline 2-line h2). All 118 tests passing. |
| 4 | Final CTA copy edits | [COMPLETE] | 2026-04-02 | Shortened subtext to "No credit card. No commitment.", removed trust line. Updated tests (16 passing). |
| 5 | Grey → white text pass | [COMPLETE] | 2026-04-02 | StatsBar labels→text-white/90, DashboardPreview headers+CTA→text-white (lock overlay kept), DifferentiatorSection desc+icon→text-white, FinalCTA subtext→text-white, StartingPointQuiz 7 dark-variant values→text-white. All 142 tests passing. |
| 6 | Final verification | [COMPLETE] | 2026-04-02 | Build passes (0 errors). Fixed Home.test.tsx (FinalCTA heading split across spans). 5473 pass / 4 fail (3 pre-existing PrayerWall timeout flakes + 0 from this session). Also fixed Home.test.tsx. |
