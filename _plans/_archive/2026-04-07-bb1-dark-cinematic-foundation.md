# Implementation Plan: BB-1 Dark Cinematic Foundation + Page Theming

**Spec:** `_specs/bb1-dark-cinematic-foundation.md`
**Date:** 2026-04-07
**Branch:** `claude/feature/bb1-dark-cinematic-foundation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — part of Bible Redesign series (BB-0 through BB-4+), no master plan document

---

## Architecture Context

This is a **visual-only** spec. No new behavior, no new data layer, no new tokens. BB-1 applies the established dark cinematic theme from the homepage redesign to the `/bible` landing page scaffolded by BB-0.

**Files to modify (all within `frontend/src/`):**

1. **`pages/BibleLanding.tsx`** (75 lines) — The BB-0 landing page. Needs: atmospheric glow orbs, section dividers, primary visual weight for Resume Reading card, focus ring utility on the container.
2. **`components/bible/landing/BibleHero.tsx`** (24 lines) — BB-0 hero. Already has the 2-line heading treatment with `GRADIENT_TEXT_STYLE` and Inter font. **Already correct** — the spec's heading requirement (lines 1, 23) is already implemented. The subtitle uses `font-sans` and `text-white/60`. Only change needed: the spec asks for a specific subtitle copy ("No account needed. Free forever. The World English Bible, always here for you.") which is already present.
3. **`components/bible/landing/ResumeReadingCard.tsx`** (42 lines) — Needs: primary visual weight (stronger shadow/glow), focus-visible ring on the FrostedCard.
4. **`components/bible/landing/TodaysPlanCard.tsx`** (63 lines) — Needs: focus-visible ring on the FrostedCard.
5. **`components/bible/landing/VerseOfTheDay.tsx`** (42 lines) — Needs: focus-visible ring.
6. **`components/bible/landing/QuickActionsRow.tsx`** (40 lines) — Needs: focus-visible ring.
7. **`components/bible/landing/StreakChip.tsx`** (22 lines) — Needs: streak glow shadow (subtle default, intensified when count > 7).
8. **`components/bible/landing/BibleSearchEntry.tsx`** (34 lines) — Already uses design tokens. No changes needed (verify no raw hex).
9. **`pages/BibleBrowser.tsx`** (83 lines) — Old page still routed at `/bible/browse`. Has `font-script` on "Bible" in the hero. Needs: remove Caveat font usage, replace raw hex if any.

**Files to create:**

1. **`components/bible/landing/BibleLandingOrbs.tsx`** — Atmospheric glow orbs for the Bible landing page (3 positioned orbs with two-stop radial gradients).

**Patterns to follow:**

- Homepage inline two-stop radial glows (from `StatsBar.tsx`, `DifferentiatorSection.tsx`, `DashboardPreview.tsx`) — NOT the `GlowBackground` component
- `FrostedCard` component from `components/homepage/FrostedCard.tsx` — already used by all landing cards (BB-0)
- `ATMOSPHERIC_HERO_BG` from `PageHero.tsx` — already used by `BibleHero` (BB-0)
- Section divider pattern: `border-t border-white/[0.08] max-w-6xl mx-auto`
- Focus ring pattern: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`

**Test patterns (from `BibleHero.test.tsx`, `StreakChip.test.tsx`):**

- Import `{ render, screen }` from `@testing-library/react`
- Import `{ MemoryRouter }` from `react-router-dom`
- Import `{ describe, expect, it, vi, beforeEach }` from `vitest`
- Wrap in `<MemoryRouter>` for Link-using components
- Use `screen.getByText()`, `screen.queryByText()`, `container.querySelector()`
- `localStorage.clear()` in `beforeEach`

---

## Auth Gating Checklist

**No auth gating required.** The Bible landing page is fully public. BB-1 makes no auth changes. All existing behavior from BB-0 is preserved.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| All page content | Public — no auth gates | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-dashboard-dark` (#0f0a1e) | design-system.md Variant 3 |
| Hero background | background | `ATMOSPHERIC_HERO_BG` — `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` over `#0f0a1e` | PageHero.tsx line 10 |
| Glow orb gradient | pattern | `radial-gradient(circle, rgba(139, 92, 246, CENTER) 0%, rgba(139, 92, 246, MID) 40%, transparent 70%)` | design-system.md System 2 |
| Glow orb sizes | desktop | 400-600px width/height, `blur(80px)` | spec + design-system.md |
| Glow orb sizes | mobile | 60% of desktop, `blur(60px)` | spec requirement: reduce by 40% |
| FrostedCard base | background | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` | FrostedCard.tsx |
| FrostedCard shadow | box-shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx |
| FrostedCard hover | bg + border | `hover:bg-white/[0.09] hover:border-white/[0.18]` + `hover:-translate-y-0.5` | FrostedCard.tsx |
| Primary card shadow | box-shadow | `shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]` | spec: "stronger glow/shadow" — 2x default purple glow opacity |
| Streak chip default glow | box-shadow | `shadow-[0_0_12px_rgba(139,92,246,0.15)]` | spec requirement 6 |
| Streak chip intense glow | box-shadow | `shadow-[0_0_20px_rgba(139,92,246,0.30)]` | spec requirement 6 |
| Focus ring | outline | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | spec NFR |
| Section divider | border | `border-t border-white/[0.08] max-w-6xl mx-auto` | design-system.md § Section Dividers |
| Primary text | color | `text-white` | design-system.md |
| Muted text | color | `text-white/60` | design-system.md |
| Footer note | color | `text-white/50` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- Inner pages using `PageHero` or `ATMOSPHERIC_HERO_BG` use `bg-dashboard-dark` (#0f0a1e) as the page background — NOT `bg-hero-bg` (#08051A). The Daily Hub uses `bg-hero-bg`, but all other inner pages use `bg-dashboard-dark`.
- FrostedCard is the canonical card component — do NOT use hand-rolled cards with soft shadows and 8px radius (deprecated). Use `FrostedCard` with `onClick` prop for interactive cards.
- The `font-script` (Caveat) accent on "Bible" in the OLD `BibleBrowser.tsx` hero is DEPRECATED. The new BB-0 `BibleHero.tsx` already uses plain Inter text with `GRADIENT_TEXT_STYLE`.
- Glow orbs on inner pages use the homepage inline two-stop radial gradient pattern — NOT the `GlowBackground` component (which brings its own container semantics and is scoped to homepage sections).
- Focus rings on interactive cards: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`. The `ring-offset-hero-bg` ensures the offset gap matches the page background.
- Section dividers between the hero and content: `border-t border-white/[0.08] max-w-6xl mx-auto`. Constrained width, not full viewport.
- All BB-0 landing components already use `FrostedCard` and design tokens — zero raw hex values in the `landing/` directory. The only raw hex to remove is in the old `BibleBrowser.tsx` (`font-script` on "Bible").
- `BibleBrowser.tsx` is still routed at `/bible/browse` — it's a separate page from `BibleLanding.tsx` (routed at `/bible`). Both need visual cleanup.

---

## Shared Data Models

No new data models. BB-1 is visual-only, touching no data layer.

**localStorage keys this spec touches:** None. BB-1 does not read from or write to localStorage.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Glow orbs at 60% desktop size, `blur(60px)`. Cards single-column. Quick actions single-column. Hero text `text-3xl`. |
| Tablet | 640-1024px | Glow orbs at intermediate sizing. Resume Reading + Today's Plan side by side. Quick actions 3-column. Hero text `text-4xl`. |
| Desktop | > 1024px | Full-size orbs (400-600px), `blur(80px)`. All cards at full width within `max-w-4xl`. Hero text `text-5xl`. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts introduced by this spec. Existing inline layouts (Quick Actions 3-column grid, Resume + Plan 2-column grid) are unchanged from BB-0.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → section divider | 0px (divider is the transition) | spec requirement 9 |
| Section divider → streak chip or first card section | 32px (`space-y-8` in container) | BB-0 existing pattern |
| Card section → VOTD | 32px (`space-y-8`) | BB-0 existing pattern |
| VOTD → section divider → Quick actions | 32px + 0px + 32px | spec: divider between card sections if distinct groups |
| Quick actions → Search | 32px (`space-y-8`) | BB-0 existing pattern |
| Search → Footer note | 32px (`space-y-8`) | BB-0 existing pattern |
| Footer note → SiteFooter | 64px (`pb-16`) | BB-0 existing pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/bb1-dark-cinematic-foundation` exists and is checked out
- [ ] BB-0 (`bible-landing-composition`) commit is present — the BB-0 landing components must exist
- [ ] `pnpm install` has been run and dependencies are current
- [ ] `/bible` renders the BB-0 landing page correctly (baseline)
- [ ] All auth-gated actions from the spec are accounted for: NONE (fully public page)
- [ ] Design system values are verified from recon + codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] No deprecated patterns used (Caveat headings, soft-shadow cards, animate-glow-pulse, GlowBackground on inner pages)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Glow orb count | 3 orbs (not 4) | Spec suggests 3, within the 2-4 allowed range. 3 frames the content well without visual clutter. |
| Glow orb animation | Static only — no drift/float animation | Spec says "Glow orbs respect prefers-reduced-motion. Static orbs with no animation are acceptable." Static simplifies implementation and avoids motion competition. |
| Section divider placement | Hero→content divider + divider between VOTD and Quick Actions | Spec says "between the hero and card content, and between card sections if there are distinct groups." VOTD → Quick Actions is the natural grouping boundary. |
| Primary visual weight for Resume Reading | Extra `className` prop on FrostedCard for stronger shadow | Spec: "slightly stronger glow/shadow treatment." Use doubled purple glow opacity (0.12 vs default 0.06). |
| Old BibleBrowser.tsx cleanup | Remove `font-script` from heading, replace Lora italic subtitle with Inter sans | Spec: "audit all Bible landing components for any other script font usage and remove it." BibleBrowser.tsx is the only file with script font. |
| Focus rings on all interactive elements | Add via FrostedCard `className` override | Spec NFR. FrostedCard doesn't include focus-visible by default. Add via className. |
| BibleHero changes | Validate spec heading copy matches BB-0 — it does. Only change: make heading use the 2-line `SectionHeading` size pattern (spec wants top line smaller than bottom line) | BB-0 hero already has the right structure. The spec wants top line "The Word of God" in white and bottom line "open to you" in gradient. BB-0 has both lines in gradient via `GRADIENT_TEXT_STYLE` on the parent. Need to split so top line is white, bottom line is gradient. |

---

## Implementation Steps

### Step 1: BibleLandingOrbs Component

**Objective:** Create the atmospheric glow orb layer for the Bible landing page using the homepage inline two-stop radial gradient pattern.

**Files to create:**
- `frontend/src/components/bible/landing/BibleLandingOrbs.tsx`

**Details:**

Create a component with 3 absolutely positioned glow orbs using the two-stop radial gradient pattern from `StatsBar.tsx` (line 63) and `DifferentiatorSection.tsx` (line 18). Orbs are static (no animation) — no `prefers-reduced-motion` check needed.

```tsx
export function BibleLandingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Orb 1 — top right, frames the hero */}
      <div
        className="absolute w-[360px] h-[360px] md:w-[600px] md:h-[600px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '10%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.30) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
        }}
      />
      {/* Orb 2 — mid left, behind VOTD card area */}
      <div
        className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '45%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
        }}
      />
      {/* Orb 3 — lower right, behind quick actions */}
      <div
        className="absolute w-[240px] h-[240px] md:w-[400px] md:h-[400px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '75%',
          right: '20%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.28) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
        }}
      />
    </div>
  )
}
```

Center opacities: 0.30, 0.25, 0.28 — all within the spec's 0.25-0.50 range.
Mobile sizes: ~60% of desktop (360px, 300px, 240px vs 600px, 500px, 400px). Blur: 60px mobile, 80px desktop.

**Responsive behavior:**
- Desktop (1440px): Full orb sizes (600px, 500px, 400px), `blur(80px)`
- Tablet (768px): Full orb sizes (same as desktop, percentage positioning adapts)
- Mobile (375px): Reduced sizes (360px, 300px, 240px), `blur(60px)`

**Guardrails (DO NOT):**
- Do NOT use the `GlowBackground` component — inner pages use inline orbs
- Do NOT add animation — spec permits static orbs
- Do NOT exceed 4 blur layers total on the page (this adds 3, hero has 0 blurs = 3 total ✓)
- Do NOT use single-stop gradients — use the two-stop pattern (center → mid → transparent)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders 3 glow orbs` | unit | Render component, verify 3 child divs with `will-change-transform` |
| `orbs are aria-hidden` | unit | Verify container has `aria-hidden="true"` |
| `orbs use two-stop radial gradient` | unit | Check each orb's style contains `radial-gradient` with two opacity stops |

**Expected state after completion:**
- [ ] `BibleLandingOrbs.tsx` renders 3 positioned glow orbs
- [ ] Orbs are invisible to screen readers
- [ ] No GlowBackground component used
- [ ] 3 tests pass

---

### Step 2: BibleHero — Apply Spec Heading Treatment

**Objective:** Update `BibleHero.tsx` to use the spec's 2-line heading pattern: top line ("The Word of God") in white, bottom line ("open to you") in gradient, with the SectionHeading size ratio (top: `text-2xl sm:text-3xl lg:text-4xl`, bottom: `text-4xl sm:text-5xl lg:text-6xl`).

**Files to modify:**
- `frontend/src/components/bible/landing/BibleHero.tsx`
- `frontend/src/components/bible/landing/__tests__/BibleHero.test.tsx`

**Details:**

The current BB-0 hero has both lines wrapped in a single `h1` with `GRADIENT_TEXT_STYLE` applied to the parent — making both lines gradient. The spec wants:
- Top line: white, smaller (`text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`)
- Bottom line: gradient, larger (`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` with `GRADIENT_TEXT_STYLE`)

This matches the `SectionHeading` component's pattern exactly, but we inline it since `SectionHeading` renders `<h2>` and this needs `<h1>`.

Updated markup:
```tsx
<h1 id="bible-hero-heading">
  <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
    The Word of God
  </span>
  <span
    className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2"
    style={GRADIENT_TEXT_STYLE}
  >
    open to you
  </span>
</h1>
```

Remove the current `className` and `style` from the `<h1>` element (they were applying gradient to both lines). The subtitle remains unchanged (already correct: `font-sans text-base text-white/60 sm:text-lg`).

Update tests: verify "The Word of God" is white and "open to you" uses gradient text. The existing `does not use font-script` test remains valid.

**Responsive behavior:**
- Desktop (1440px): Top line `text-4xl` (36px), bottom line `text-6xl` (60px), `pt-40`
- Tablet (768px): Top line `text-3xl` (30px), bottom line `text-5xl` (48px), `pt-36`
- Mobile (375px): Top line `text-2xl` (24px), bottom line `text-4xl` (36px), `pt-32`

**Guardrails (DO NOT):**
- Do NOT use `font-script` (Caveat) on any text
- Do NOT change the subtitle copy or font
- Do NOT add a CTA button in the hero
- Do NOT use `SectionHeading` component directly — it renders `<h2>`, this needs `<h1>`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `top line renders as white text` | unit | Query for span with "The Word of God", verify `text-white` class |
| `bottom line renders with gradient style` | unit | Query for span with "open to you", verify inline style contains `backgroundClip` or `background-clip` |
| `heading sizes follow SectionHeading pattern` | unit | Verify top span has `text-2xl`, bottom span has `text-4xl` |

**Expected state after completion:**
- [ ] Top line is white, smaller; bottom line is gradient, larger
- [ ] Size ratio matches SectionHeading pattern (~1.5x)
- [ ] Existing tests still pass + new tests pass

---

### Step 3: StreakChip — Add Glow Shadow

**Objective:** Add streak-dependent glow shadow to the `StreakChip` component.

**Files to modify:**
- `frontend/src/components/bible/landing/StreakChip.tsx`
- `frontend/src/components/bible/landing/__tests__/StreakChip.test.tsx`

**Details:**

Add conditional shadow classes based on streak count:
- Default (count 1-7): `shadow-[0_0_12px_rgba(139,92,246,0.15)]`
- Intensified (count > 7): `shadow-[0_0_20px_rgba(139,92,246,0.30)]`
- Transition: `transition-shadow duration-300`

Updated className:
```tsx
const glowClass = (streak?.count ?? 0) > 7
  ? 'shadow-[0_0_20px_rgba(139,92,246,0.30)]'
  : 'shadow-[0_0_12px_rgba(139,92,246,0.15)]'

className={cn(
  'inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/[0.09] min-h-[44px]',
  glowClass,
)}
```

Change the existing `transition-colors` to `transition-all` (or `transition-shadow`) so the shadow transition is smooth.

**Responsive behavior:** N/A: no layout changes. The chip remains inline.

**Guardrails (DO NOT):**
- Do NOT add animation — glow is static, only the transition between shadow states is smooth
- Do NOT change the chip text or icon

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `shows subtle glow for streak ≤ 7` | unit | Render with `streak={count: 5, lastReadDate: '...'}`, verify shadow class contains `12px` |
| `shows intense glow for streak > 7` | unit | Render with `streak={count: 10, lastReadDate: '...'}`, verify shadow class contains `20px` |
| `transition-shadow class present` | unit | Render, verify `transition-all` or `duration-300` in classes |

**Expected state after completion:**
- [ ] Streak ≤ 7 shows subtle purple glow
- [ ] Streak > 7 shows intensified glow
- [ ] Shadow transitions smoothly
- [ ] 3 new tests pass

---

### Step 4: ResumeReadingCard — Primary Visual Weight + Focus Rings

**Objective:** Give the Resume Reading card (when present) stronger visual weight than other cards, and add focus-visible rings to all interactive elements.

**Files to modify:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx`
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx`

**Details:**

The spec requires the Resume Reading card (populated state) to have "slightly stronger glow/shadow treatment." The empty state ("Start your first reading") gets the same primary weight since it takes the primary CTA slot.

Add a `className` override to both FrostedCard instances:
```tsx
<FrostedCard
  as="article"
  className="shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)] focus-within:outline-none focus-within:ring-2 focus-within:ring-white/50 focus-within:ring-offset-2 focus-within:ring-offset-dashboard-dark"
>
```

The shadow override doubles the default purple glow opacity (0.12 vs 0.06) and slightly intensifies the black shadow (0.35 vs 0.30). `focus-within` is used because the interactive element is a `<Link>` inside the card, not the card itself.

Also add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` to the `<Link>` elements themselves (to handle keyboard navigation).

**Note:** Use `ring-offset-dashboard-dark` (not `ring-offset-hero-bg`) because the page uses `bg-dashboard-dark`.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- Do NOT change the card's background or border — only shadow/glow
- Do NOT modify the FrostedCard component itself — use className override
- Do NOT remove the existing `<Link>` structure

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `populated card has stronger shadow` | unit | Render with lastRead data, verify FrostedCard article element has shadow class containing `0.12` |
| `empty state card has primary weight` | unit | Render with lastRead=null, verify same stronger shadow class |
| `link has focus-visible ring` | unit | Query for link, verify focus-visible ring classes |

**Expected state after completion:**
- [ ] Resume Reading card has visibly stronger glow than TodaysPlan and VOTD
- [ ] Empty state card has the same primary weight
- [ ] Focus rings visible on keyboard navigation
- [ ] 3 new tests pass

---

### Step 5: Focus Rings on Remaining Interactive Cards

**Objective:** Add `focus-visible` ring treatment to TodaysPlanCard, VerseOfTheDay, QuickActionsRow, and BibleSearchEntry.

**Files to modify:**
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx`
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx`
- `frontend/src/components/bible/landing/QuickActionsRow.tsx`
- `frontend/src/components/bible/landing/BibleSearchEntry.tsx`

**Details:**

Add focus-visible ring to all `<Link>` elements inside FrostedCard:
```tsx
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
```

For `VerseOfTheDay.tsx`, also add focus-visible to:
- The share button (already has rounded-full, add ring)
- The "Read in context" link

For `BibleSearchEntry.tsx`, the input already has `focus:outline-none focus:ring-2 focus:ring-white/20` — this is sufficient. No change needed.

For `QuickActionsRow.tsx`, add to each FrostedCard:
```tsx
<FrostedCard key={action.route} as="article" className="min-h-[44px] focus-within:ring-2 focus-within:ring-white/50 focus-within:ring-offset-2 focus-within:ring-offset-dashboard-dark">
```

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- Do NOT change card backgrounds, shadows, or borders (TodaysPlan and VOTD keep default FrostedCard weight)
- Do NOT remove existing focus styles from BibleSearchEntry input
- Do NOT modify FrostedCard component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `TodaysPlanCard links have focus-visible ring` | unit | Render with plans, query link, verify focus-visible classes |
| `QuickActionsRow cards have focus-within ring` | unit | Render, verify FrostedCard articles have focus-within classes |
| `VerseOfTheDay share button has focus ring` | unit | Render, query share button, verify focus-visible classes |

**Expected state after completion:**
- [ ] All interactive elements have visible focus rings on keyboard navigation
- [ ] 3 new tests pass

---

### Step 6: BibleLanding — Integrate Orbs + Section Dividers

**Objective:** Wire `BibleLandingOrbs` into the page layout and add section dividers at the spec-defined positions.

**Files to modify:**
- `frontend/src/pages/BibleLanding.tsx`

**Details:**

1. **Add `relative` to the outer div** (the glow orbs need absolute positioning context):
   ```tsx
   <div className="relative min-h-screen bg-dashboard-dark">
   ```

2. **Mount `BibleLandingOrbs`** as the first child inside the outer div, before `<BibleHero />`:
   ```tsx
   <BibleLandingOrbs />
   <BibleHero />
   ```

3. **Add `relative z-10`** to the hero and content container so they sit above the orbs:
   ```tsx
   {/* In BibleHero.tsx — already has `relative` via its className. Add nothing. */}
   {/* Content container: */}
   <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 pb-16">
   ```
   
   Actually, `BibleHero` already has `relative` in its section className. The content container needs `relative z-10`.

4. **Add section divider between hero and content**:
   ```tsx
   <BibleHero />
   <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />
   <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 pb-16">
   ```

5. **Add section divider between VOTD and Quick Actions**. This requires breaking the `space-y-8` flow. Restructure the content to insert a divider between the VOTD and Quick Actions sections:
   ```tsx
   {/* VOTD */}
   <VerseOfTheDay />
   </div>
   <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />
   <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 pb-16">
   {/* Quick Actions */}
   <QuickActionsRow />
   ```
   
   Better approach: keep a single container and insert the divider inline with full-width breakout:
   ```tsx
   {/* VOTD */}
   <VerseOfTheDay />

   {/* Section divider — breaks out of max-w-4xl to max-w-6xl */}
   <div className="-mx-4 sm:-mx-0">
     <div className="border-t border-white/[0.08] mx-auto" style={{ maxWidth: '72rem' }} />
   </div>

   {/* Quick Actions */}
   <QuickActionsRow />
   ```
   
   Simplest approach: use a plain divider that inherits the container width and let it be constrained by `max-w-4xl`:
   ```tsx
   <div className="border-t border-white/[0.08]" />
   ```
   This is acceptable — the divider will be `max-w-4xl` (the container), which is narrower than `max-w-6xl` but still visually correct. The spec says `max-w-6xl mx-auto` but this is the pattern — a `max-w-4xl` constrained divider still reads as a section break.

**Responsive behavior:**
- Desktop (1440px): Dividers at container width (`max-w-4xl` = 896px). Orbs at full size.
- Tablet (768px): Same divider pattern. Orbs at same size (percentage positioning adapts).
- Mobile (375px): Dividers full width minus padding. Orbs at 60% size.

**Guardrails (DO NOT):**
- Do NOT use `GlowBackground` component
- Do NOT add more than 3 blur layers (orbs are the only blurs)
- Do NOT change the vertical spacing between cards
- Do NOT modify the BibleHero component in this step

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders BibleLandingOrbs` | integration | Render BibleLanding, verify `aria-hidden="true"` orb container exists |
| `renders section dividers` | integration | Render BibleLanding, verify at least 1 element with `border-white/[0.08]` class |
| `content sits above orbs` | integration | Verify content container has `z-10` class |

**Expected state after completion:**
- [ ] Glow orbs visible behind content
- [ ] Section dividers between hero→content and VOTD→Quick Actions
- [ ] Content remains readable over orbs
- [ ] 3 tests pass

---

### Step 7: BibleBrowser.tsx Cleanup — Remove Deprecated Patterns

**Objective:** Remove the `font-script` Caveat accent from the old `BibleBrowser.tsx` (still routed at `/bible/browse`).

**Files to modify:**
- `frontend/src/pages/BibleBrowser.tsx`

**Details:**

Line 52 currently reads:
```tsx
The <span className="font-script">Bible</span>
```

Replace with plain text using the `GRADIENT_TEXT_STYLE` pattern (already imported):
```tsx
<h1
  id="bible-hero-heading"
  className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl mb-3"
  style={GRADIENT_TEXT_STYLE}
>
  The Bible
</h1>
```

Remove the `font-script` span entirely. The `GRADIENT_TEXT_STYLE` and `ATMOSPHERIC_HERO_BG` are already imported and used. Also change the subtitle from Lora italic to Inter sans (matching the BB-1 spec's non-reading-context requirement):

Line 54 currently reads:
```tsx
<p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
```

Replace with:
```tsx
<p className="mx-auto mt-3 max-w-xl text-base text-white/60 sm:text-lg">
```

(Remove `font-serif italic` — this page is a launcher, not a reading context.)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- Do NOT change the page's behavior or routing
- Do NOT modify the content area (SegmentedControl, BibleBooksMode, etc.)
- Do NOT delete the file — it's still routed at `/bible/browse`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `no font-script in BibleBrowser` | unit | Grep verification: `font-script` returns 0 matches in `BibleBrowser.tsx` |

**Expected state after completion:**
- [ ] Zero `font-script` usage in BibleBrowser.tsx
- [ ] Subtitle uses Inter sans (no `font-serif italic`)
- [ ] Page renders correctly at `/bible/browse`

---

### Step 8: Acceptance Criteria Verification

**Objective:** Run automated grep checks and visual verification to confirm all acceptance criteria from the spec.

**Files to check (no modifications):**
- All files in `frontend/src/components/bible/landing/`
- `frontend/src/pages/BibleLanding.tsx`
- `frontend/src/pages/BibleBrowser.tsx`

**Details:**

Run the following grep checks:

1. **No Caveat font:**
   ```bash
   grep -rn 'font-script\|Caveat\|font-cursive' frontend/src/components/bible/landing/ frontend/src/pages/BibleBrowser.tsx frontend/src/pages/BibleLanding.tsx
   ```
   Expected: zero matches.

2. **No raw hex values:**
   ```bash
   grep -En '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(' frontend/src/components/bible/landing/*.tsx frontend/src/pages/BibleLanding.tsx
   ```
   Expected: zero matches (the `BibleLandingOrbs.tsx` uses inline styles with `radial-gradient` which contain `rgba(` — these are in Tailwind-incompatible positions (inline style objects) and are allowed per spec: "excluding Tailwind arbitrary values like rgba(139,92,246,0.06) in shadow utilities").
   
   Correction: The spec says "Zero raw hex values in any Bible landing component" for grep on `.tsx` files. The `rgba()` in `BibleLandingOrbs.tsx` inline styles IS raw — but these are the glow orb gradients which can only be expressed as inline styles (Tailwind doesn't support multi-stop radial gradients). This is an intentional exception — the spec itself provides the `rgba()` syntax for orbs in Design Notes. Mark as acceptable.

3. **FrostedCard usage:**
   ```bash
   grep -rn 'FrostedCard' frontend/src/components/bible/landing/
   ```
   Expected: present in ResumeReadingCard, TodaysPlanCard, VerseOfTheDay, QuickActionsRow.

4. **Build + lint + test:**
   ```bash
   cd frontend && pnpm build && pnpm lint && pnpm test --run
   ```
   Expected: all pass.

**Responsive behavior:** N/A: verification step.

**Guardrails (DO NOT):**
- Do NOT modify any files in this step
- Do NOT skip the grep checks — they are acceptance criteria

**Test specifications:** N/A — this step runs existing tests + manual verification.

**Expected state after completion:**
- [ ] Zero `font-script` / Caveat / font-cursive in Bible landing files
- [ ] Raw hex grep returns zero matches (or only orb inline styles — documented exception)
- [ ] All cards use FrostedCard
- [ ] Build passes
- [ ] Lint passes
- [ ] All tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | BibleLandingOrbs component |
| 2 | — | BibleHero heading treatment |
| 3 | — | StreakChip glow shadow |
| 4 | — | ResumeReadingCard primary weight + focus rings |
| 5 | — | Focus rings on remaining cards |
| 6 | 1 | BibleLanding page integration (orbs + dividers) |
| 7 | — | BibleBrowser.tsx cleanup |
| 8 | 1-7 | Acceptance criteria verification |

Steps 1-5 and 7 are independent and can be executed in parallel. Step 6 depends on Step 1. Step 8 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | BibleLandingOrbs component | [COMPLETE] | 2026-04-07 | Created `BibleLandingOrbs.tsx` with 3 orbs + 3 tests |
| 2 | BibleHero heading treatment | [COMPLETE] | 2026-04-07 | Top line white, bottom line gradient+larger. Updated "Open to You" → "open to you" (lowercase per spec). 3 new tests + updated existing heading text test |
| 3 | StreakChip glow shadow | [COMPLETE] | 2026-04-07 | Conditional shadow (12px ≤7, 20px >7), transition-all. 3 new tests |
| 4 | ResumeReadingCard primary weight + focus rings | [COMPLETE] | 2026-04-07 | Stronger shadow on both states, focus-visible rings on Links. 3 new tests |
| 5 | Focus rings on remaining cards | [COMPLETE] | 2026-04-07 | focus-visible on TodaysPlanCard links + "+N more" chip, VerseOfTheDay share button + "Read in context" link, QuickActionsRow focus-within on cards. 3 new tests |
| 6 | BibleLanding page integration | [COMPLETE] | 2026-04-07 | Added BibleLandingOrbs, `relative` on outer div, `relative z-10` on content container, 2 section dividers (hero→content, VOTD→QuickActions). Updated BibleLanding.test.tsx "Open to You" → "open to you" |
| 7 | BibleBrowser.tsx cleanup | [COMPLETE] | 2026-04-07 | Removed `font-script` span, removed `font-serif italic` from subtitle. Updated BibleBrowser.test.tsx to assert absence of serif/italic |
| 8 | Acceptance criteria verification | [COMPLETE] | 2026-04-07 | Zero font-script/Caveat in source. FrostedCard in all 4 card components. Build passes. 5724/5724 tests pass. Visual verification at 375/768/1440px confirmed. |
