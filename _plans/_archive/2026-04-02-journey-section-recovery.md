# Implementation Plan: HP-8 Journey Section Recovery

**Spec:** `_specs/hp-8-journey-section-recovery.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue, do NOT create new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/github-homepage.md` (loaded — not applicable, GitHub recon unrelated to this feature)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Recovered Component (Git History)

The old `JourneySection.tsx` was deleted in commit `e4828b8` ("HP-1: foundation and teardown"). The component lived at `frontend/src/components/JourneySection.tsx` with tests at `frontend/src/components/__tests__/JourneySection.test.tsx`.

The old component used:
- `useInView` hook → must be replaced with `useScrollReveal` + `staggerDelay`
- `WHITE_PURPLE_GRADIENT` for gradient text → keep
- `BackgroundSquiggle` for background texture → keep
- `JOURNEY_STEPS` array (7 items) with `{ number, prefix, highlight, description, to }` → replace content
- `StepCircle` subcomponent with gradient background → replace with purple glow treatment
- Connecting line via `w-0.5 bg-white/20` → replace with gradient line
- Dark `bg-hero-bg` background → spec says keep dark sanctuary aesthetic
- `<Link>` wrappers on each step → keep pattern, update routes

### Current Homepage (Home.tsx)

Section render order: `HeroSection → FeatureShowcase → StatsBar → PillarSection → DifferentiatorSection → DashboardPreview → StartingPointQuiz → FinalCTA`

After HP-8: `HeroSection → JourneySection → StatsBar → DashboardPreview → DifferentiatorSection → StartingPointQuiz → FinalCTA`

Changes: replace `FeatureShowcase` with `JourneySection`, remove `PillarSection`, swap `DashboardPreview` and `DifferentiatorSection` order.

### Files to Delete

**FeatureShowcase system (3 components + 5 previews + 1 constants + 3+5 tests = 17 files):**
- `frontend/src/components/homepage/FeatureShowcase.tsx`
- `frontend/src/components/homepage/FeatureShowcaseTabs.tsx`
- `frontend/src/components/homepage/FeatureShowcasePanel.tsx`
- `frontend/src/components/homepage/previews/DevotionalPreview.tsx`
- `frontend/src/components/homepage/previews/PrayerPreview.tsx`
- `frontend/src/components/homepage/previews/MeditationPreview.tsx`
- `frontend/src/components/homepage/previews/PrayerWallPreview.tsx`
- `frontend/src/components/homepage/previews/GrowthPreview.tsx`
- `frontend/src/components/homepage/previews/` (directory)
- `frontend/src/constants/feature-showcase.ts`
- `frontend/src/components/homepage/__tests__/FeatureShowcase.test.tsx`
- `frontend/src/components/homepage/__tests__/FeatureShowcaseTabs.test.tsx`
- `frontend/src/components/homepage/__tests__/FeatureShowcasePanel.test.tsx`
- `frontend/src/components/homepage/__tests__/DevotionalPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/PrayerPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/MeditationPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/PrayerWallPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/GrowthPreview.test.tsx`

**PillarSection system (3 components + 1 data + 3+1 tests = 8 files):**
- `frontend/src/components/homepage/PillarSection.tsx`
- `frontend/src/components/homepage/PillarBlock.tsx`
- `frontend/src/components/homepage/PillarAccordionItem.tsx`
- `frontend/src/components/homepage/pillar-data.ts`
- `frontend/src/components/homepage/__tests__/PillarSection.test.tsx`
- `frontend/src/components/homepage/__tests__/PillarBlock.test.tsx`
- `frontend/src/components/homepage/__tests__/PillarAccordionItem.test.tsx`
- `frontend/src/components/homepage/__tests__/pillar-data.test.ts`

### Shared Utilities (already exist, no changes needed)

- `useScrollReveal` + `staggerDelay` — `frontend/src/hooks/useScrollReveal.ts`
- `BackgroundSquiggle` + `SQUIGGLE_MASK_STYLE` — `frontend/src/components/BackgroundSquiggle.tsx`
- `WHITE_PURPLE_GRADIENT` — `frontend/src/constants/gradients.tsx`
- `cn()` — `frontend/src/lib/utils.ts`
- `SectionHeading` — `frontend/src/components/homepage/SectionHeading.tsx` (accepts `heading: string` only, not JSX — see Design Note)

### SectionHeading Limitation

`SectionHeading` accepts `heading: string`. The spec requires "Healing" in Caveat script font with gradient treatment. The old `JourneySection` rendered the heading inline with `<span className="font-script">Healing</span>`. The plan will follow the same pattern: render the heading inline (not via `SectionHeading`) to get JSX control over the "Healing" word, but use `SectionHeading`'s tagline styling pattern for consistency.

### Test Patterns

Tests use `MemoryRouter` with `future` flags. The old `JourneySection.test.tsx` is a good reference. No auth providers needed since this component has no auth gating. Tests check: section landmark, heading, subtitle, ordered list with 7 items, step titles, numbered circles, descriptions, links with correct routes, keyboard focus, `aria-hidden` on circles, `focus-visible:ring` classes, animation state.

### Provider Wrapping

`Home.test.tsx` wraps in `MemoryRouter + ToastProvider + AuthModalProvider`. After removing FeatureShowcase/PillarSection references, update assertions to match new sections.

---

## Auth Gating Checklist

**No auth gating required.** All 7 step links point to publicly accessible routes.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click step link | Navigate to public route | N/A | No auth needed |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Section background | background | `bg-hero-bg` (same as old JourneySection: dark hero background) | Old JourneySection + design-system.md |
| Section heading "Your Journey to" | font | Inter, `text-2xl sm:text-3xl lg:text-4xl`, bold, `text-white` | Old JourneySection |
| "Healing" word | font | Caveat (`font-script`), `text-3xl sm:text-4xl lg:text-5xl` | Old JourneySection + spec |
| "Healing" gradient | style | `background: linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`, `backgroundClip: text`, `WebkitTextFillColor: transparent` | `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx` |
| Tagline | classes | `text-base text-white/80 sm:text-lg` | Old JourneySection (spec says `text-white/60` via SectionHeading — use `text-white/60` per spec alignment with other sections) |
| Step number circle | classes | `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-white font-semibold text-sm` | Spec §3b |
| Step number glow | shadow | `shadow-[0_0_15px_rgba(139,92,246,0.2)]` | Spec §3b |
| Connecting line | classes | `w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30` | Spec §3c |
| Step title prefix | classes | `text-white text-lg font-semibold sm:text-xl` | Old pattern |
| Highlight word | classes | Caveat (`font-script`), `text-2xl sm:text-3xl`, gradient via `WHITE_PURPLE_GRADIENT` inline style | Old pattern + spec §3d |
| Step hover bg | classes | `hover:bg-white/[0.02] rounded-xl transition-colors duration-200` | Spec §3d |
| ArrowRight hover | classes | `w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200` | Spec §3d |
| Description text | classes | `text-white/60 text-sm sm:text-base leading-relaxed max-w-lg` | Spec §3e |
| Glow orb (top) | position | `top-[15%] left-[25%]` | Spec §3a |
| Glow orb (middle) | position | `top-[50%] left-[75%]` | Spec §3a |
| Glow orb style | classes | `bg-purple-500/[0.05] w-[400px] h-[400px] blur-[100px] rounded-full absolute z-0` | Spec §3a |
| Container | classes | `max-w-2xl mx-auto px-4 sm:px-6` | Spec §3h |
| Section padding | classes | `py-20 sm:py-28` | Spec §3h |
| Squiggle mask | style | `SQUIGGLE_MASK_STYLE` from `BackgroundSquiggle.tsx` | Old pattern |

---

## Design System Reminder

**Project-specific quirks for every UI step:**

- Worship Room uses **Caveat** (`font-script`) for script/highlighted words, not Lora
- Squiggle backgrounds use `SQUIGGLE_MASK_STYLE` for fade mask (import from `BackgroundSquiggle`)
- All gradient text uses `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx` with `backgroundClip: text` + `WebkitTextFillColor: transparent`
- Dark section backgrounds use `bg-hero-bg` (maps to `#0D0620`)
- Text on dark backgrounds: primary `text-white/70+`, secondary `text-white/60`, decorative `text-white/20-40`
- `useScrollReveal` returns `{ ref, isVisible }` — the ref must be cast via `as React.RefObject<HTMLOListElement>` for typed elements
- `staggerDelay(index, 120)` returns `{ transitionDelay: '...' }` — pass as `style` prop
- `prefers-reduced-motion` is handled automatically by `useScrollReveal` (returns `isVisible: true` immediately)
- Focus visible pattern: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

---

## Shared Data Models (from Master Plan)

Not applicable — no master plan, no shared data models, no localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column vertical list. `px-4` padding. `text-sm` descriptions. `py-20` section padding. No hover effects. |
| Tablet | 640-1024px | Same vertical list, `px-6` padding. `text-base` descriptions. |
| Desktop | > 1024px | Same vertical list in `max-w-2xl` centered container. `py-28` section padding. Hover effects active (arrow reveal, background lift). |

No layout changes between breakpoints — the vertical list is inherently responsive.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| HeroSection → JourneySection | 0px (sections butt up) | Old pattern — hero gradient fades into JourneySection dark bg |
| JourneySection → StatsBar | 0px (section padding handles spacing) | `py-20 sm:py-28` bottom padding |
| StatsBar → DashboardPreview | As-is (not changing) | Existing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Old `JourneySection.tsx` recoverable from `e4828b8^` in git history
- [x] `useScrollReveal` and `staggerDelay` exist in `hooks/useScrollReveal.ts`
- [x] `BackgroundSquiggle` and `SQUIGGLE_MASK_STYLE` exist in `components/BackgroundSquiggle.tsx`
- [x] `WHITE_PURPLE_GRADIENT` exists in `constants/gradients.tsx`
- [x] `SectionHeading` accepts `heading: string` only — custom heading JSX needed for "Healing" in Caveat
- [x] All auth-gated actions from the spec are accounted for (none needed)
- [x] Design system values are verified from design-system.md and old component
- [ ] All [UNVERIFIED] values are flagged with verification methods (1 value flagged below)
- [x] Prior specs in the homepage-redesign series are complete and committed (HP-1 through HP-7 all committed)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SectionHeading for heading | Render heading inline (not via `SectionHeading`) | `SectionHeading` only accepts `string`, but "Healing" needs Caveat font JSX. Replicate tagline pattern manually. |
| Tagline text opacity | `text-white/60` (spec's SectionHeading pattern) | Old component used `text-white/80`. Spec says use `SectionHeading`, which uses `text-white/60`. Align with other homepage sections. |
| Glow orb animation | No float animation | Spec says "if any" — keeping it simple. Static orbs match the sanctuary feel without adding complexity. |
| Import path for JourneySection | `@/components/JourneySection` (root components dir) | Spec explicitly requires this import path, not from the homepage barrel. |
| PillarSection removal scope | Delete PillarSection + PillarBlock + PillarAccordionItem + pillar-data | Spec says remove from layout; since HP-9 doesn't reference these, full delete is safe. |
| `feature-showcase.ts` constants file | Delete | Only consumed by the deleted FeatureShowcase components. |
| Description text opacity | `text-white/60` per spec | Old component used `text-white/70`. Spec §3e explicitly says `text-white/60`. |

---

## Implementation Steps

### Step 1: Recover and Update JourneySection Component

**Objective:** Create `JourneySection.tsx` at the original location with recovered structure, new content, and visual upgrades.

**Files to create/modify:**
- `frontend/src/components/JourneySection.tsx` — create (recovered + upgraded)

**Details:**

Recover the component structure from `e4828b8^:frontend/src/components/JourneySection.tsx` and apply these changes:

1. **Replace imports:** Remove `useInView`, add `useScrollReveal`, `staggerDelay` from `@/hooks/useScrollReveal`. Add `ArrowRight` from `lucide-react`.

2. **Replace `JOURNEY_STEPS` content** with the 7 new steps from the spec content table:

```typescript
interface JourneyStep {
  number: number
  prefix: string
  highlight: string
  description: string
  route: string  // renamed from "to" to "route" per spec table column name
}

const JOURNEY_STEPS: JourneyStep[] = [
  { number: 1, prefix: 'Read a', highlight: 'Devotional', description: 'Start each morning with an inspiring quote, a scripture passage, and a reflection that ties it all together. Fresh content daily, shaped by the season of the church year.', route: '/daily?tab=devotional' },
  { number: 2, prefix: 'Learn to', highlight: 'Pray', description: "Begin with what's on your heart. Share how you're feeling and receive a personalized prayer grounded in Scripture — with ambient worship music as the words appear.", route: '/daily?tab=pray' },
  { number: 3, prefix: 'Learn to', highlight: 'Journal', description: 'Put your thoughts into words. Write freely or follow guided prompts rooted in Scripture. Your entries are private, safe, and always here when you need to look back.', route: '/daily?tab=journal' },
  { number: 4, prefix: 'Learn to', highlight: 'Meditate', description: 'Quiet your mind with six guided meditation types — breathing exercises, scripture soaking, gratitude reflections, and more. Let peace settle in.', route: '/daily?tab=meditate' },
  { number: 5, prefix: 'Listen to', highlight: 'Music', description: 'Let worship carry you deeper. Curated Spotify playlists, 24 ambient sounds with crossfade mixing, and a full sleep library — scripture readings, bedtime stories, and rest routines.', route: '/music' },
  { number: 6, prefix: 'Write on the', highlight: 'Prayer Wall', description: "You're not alone. Share prayer requests and lift others up in a safe, supportive community. When someone prays for you, you'll feel it.", route: '/prayer-wall' },
  { number: 7, prefix: 'Find', highlight: 'Local Support', description: "Find churches, Christian counselors, and Celebrate Recovery meetings near you. Sometimes healing needs a hand to hold, not just a screen to touch.", route: '/local-support/churches' },
]
```

3. **Replace `StepCircle`** with upgraded version per spec §3b:

```tsx
function StepCircle({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40 text-white font-semibold text-sm shadow-[0_0_15px_rgba(139,92,246,0.2)]"
    >
      {number}
    </span>
  )
}
```

4. **Replace `useInView` with `useScrollReveal`:**

```tsx
const { ref: listRef, isVisible } = useScrollReveal({ threshold: 0.1 })
```

Use `isVisible` instead of `inView`. Cast ref assignment: `ref={listRef as React.RefObject<HTMLOListElement>}`.

5. **Update animation style** — use `staggerDelay(index, 120)` instead of inline `transitionDelay`:

```tsx
style={isVisible ? staggerDelay(index, 120) : { transitionDelay: '0ms' }}
```

6. **Add glow orbs** inside the section, before the content container, at `z-0`:

```tsx
{/* Glow orbs */}
<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
  <div className="absolute top-[15%] left-[25%] h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
  <div className="absolute top-[50%] left-[75%] h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
</div>
```

7. **Update connecting line** per spec §3c — replace `w-0.5 bg-white/20` with:

```tsx
<div className="mx-auto mt-1 w-px flex-1 bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30" aria-hidden="true" />
```

8. **Add hover effects** per spec §3d:
   - Step wrapper: add `group` class, `hover:bg-white/[0.02] rounded-xl transition-colors duration-200`
   - Add `ArrowRight` icon after description: `<ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />`

9. **Render heading inline** (not via `SectionHeading`) to get JSX control over "Healing" in Caveat:

```tsx
<div className="relative mb-12 text-center sm:mb-16">
  <h2 id="journey-heading" className="mb-3 font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
    Your Journey to{' '}
    <span
      className="inline-block pb-1 pr-1 font-script text-3xl sm:text-4xl lg:text-5xl"
      style={{
        background: WHITE_PURPLE_GRADIENT,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      Healing
    </span>
  </h2>
  <p className="mx-auto max-w-2xl text-base text-white/60 sm:text-lg">
    From prayer to community, every step draws you closer to peace.
  </p>
</div>
```

10. **Update section container** per spec §3h:

```tsx
<section aria-labelledby="journey-heading" className="relative bg-hero-bg px-4 py-20 sm:px-6 sm:py-28">
```

11. **Update description text** per spec §3e:

```tsx
<p className="text-sm leading-relaxed text-white/60 sm:text-base max-w-lg">
  {step.description}
</p>
```

12. **Highlight words** in step titles keep the existing Caveat + gradient pattern from the old component.

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl` centered, `py-28`, hover effects (arrow + bg lift)
- Tablet (768px): Same layout, `px-6`, `text-base` descriptions
- Mobile (375px): `px-4`, `py-20`, `text-sm` descriptions, no hover effects

**Guardrails (DO NOT):**
- DO NOT use `SectionHeading` component for the heading (it doesn't support JSX children)
- DO NOT use `useInView` — use `useScrollReveal` for consistency with HP-1+ sections
- DO NOT add float animation to glow orbs (keeping static per edge case decision)
- DO NOT use `text-white/70` for descriptions — spec says `text-white/60`
- DO NOT change the `WHITE_PURPLE_GRADIENT` constant
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders section landmark | integration | `getByRole('region', { name: /your journey to healing/i })` |
| Renders h2 heading | integration | `getByRole('heading', { level: 2, name: /your journey to healing/i })` |
| Renders tagline | integration | Check tagline paragraph text |
| Renders ordered list with 7 items | integration | `getAllByRole('listitem')` → length 7 |
| Renders all 7 step titles | integration | Check each h3: "Read a Devotional", "Learn to Pray", etc. |
| Renders numbered circles 1-7 | integration | `getByText('1')` through `getByText('7')` |
| Renders description for each step | integration | Spot-check 3-4 description snippets |
| Each step links to correct route | integration | Check all 7 link hrefs |
| All links are keyboard-focusable | integration | Verify no `tabindex="-1"` |
| Numbered circles are aria-hidden | integration | `aria-hidden="true"` on all circles |
| Links have focus-visible ring | integration | Check class contains `focus-visible:ring-2` |
| Ordered list has role="list" | integration | Verify `role="list"` on `<ol>` |
| Steps have staggered transition delays | integration | Check `transitionDelay` values |
| Arrow icon is aria-hidden | integration | ArrowRight icons have `aria-hidden="true"` |

**Expected state after completion:**
- [ ] `JourneySection.tsx` exists at `frontend/src/components/JourneySection.tsx`
- [ ] Component renders with 7 new steps, purple glow circles, gradient line, glow orbs
- [ ] `useScrollReveal` drives scroll animation, not `useInView`
- [ ] Build passes

---

### Step 2: Write JourneySection Tests

**Objective:** Create comprehensive tests for the new JourneySection component.

**Files to create:**
- `frontend/src/components/__tests__/JourneySection.test.tsx` — create

**Details:**

Follow the old test structure from `e4828b8^` but update for new content and patterns:

1. Wrap in `MemoryRouter` with `future` flags (same as old test).
2. Mock `useScrollReveal` to return `{ ref: { current: null }, isVisible: true }` for predictable test state.
3. Test all 14 cases from Step 1's test specifications table.

New step titles to test:
- "Read a Devotional"
- "Learn to Pray"
- "Learn to Journal"
- "Learn to Meditate"
- "Listen to Music"
- "Write on the Prayer Wall"
- "Find Local Support"

New routes to test:
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`, `/prayer-wall`, `/local-support/churches`

New description snippets to spot-check:
- "Start each morning" (step 1)
- "Begin with what's on your heart" (step 2)
- "Quiet your mind" (step 4)
- "You're not alone" (step 6)

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT wrap in `AuthModalProvider` or `ToastProvider` — not needed
- DO NOT test visual styles (colors, gradients) — test behavior and semantics only

**Test specifications:**
Self-referential — this step IS the tests.

**Expected state after completion:**
- [ ] `JourneySection.test.tsx` exists with 14 tests
- [ ] All tests pass (`pnpm test -- JourneySection`)

---

### Step 3: Delete FeatureShowcase and Previews

**Objective:** Remove all FeatureShowcase components, preview components, constants, and tests.

**Files to delete:**
- `frontend/src/components/homepage/FeatureShowcase.tsx`
- `frontend/src/components/homepage/FeatureShowcaseTabs.tsx`
- `frontend/src/components/homepage/FeatureShowcasePanel.tsx`
- `frontend/src/components/homepage/previews/DevotionalPreview.tsx`
- `frontend/src/components/homepage/previews/PrayerPreview.tsx`
- `frontend/src/components/homepage/previews/MeditationPreview.tsx`
- `frontend/src/components/homepage/previews/PrayerWallPreview.tsx`
- `frontend/src/components/homepage/previews/GrowthPreview.tsx`
- `frontend/src/components/homepage/previews/` (directory)
- `frontend/src/constants/feature-showcase.ts`
- `frontend/src/components/homepage/__tests__/FeatureShowcase.test.tsx`
- `frontend/src/components/homepage/__tests__/FeatureShowcaseTabs.test.tsx`
- `frontend/src/components/homepage/__tests__/FeatureShowcasePanel.test.tsx`
- `frontend/src/components/homepage/__tests__/DevotionalPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/PrayerPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/MeditationPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/PrayerWallPreview.test.tsx`
- `frontend/src/components/homepage/__tests__/GrowthPreview.test.tsx`

**Files to modify:**
- `frontend/src/components/homepage/index.ts` — remove `FeatureShowcase` export line

**Details:**

1. Delete all 18 files listed above.
2. Remove the `previews/` directory.
3. In `frontend/src/components/homepage/index.ts`, remove line 4: `export { FeatureShowcase } from './FeatureShowcase'`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete `SectionHeading`, `GlowBackground`, `FrostedCard`, or any other shared homepage components
- DO NOT modify any remaining test files yet (Home.test.tsx is handled in Step 5)
- DO NOT delete `StatsBar`, `DifferentiatorSection`, `DashboardPreview`, or `FinalCTA`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Deletion step — tests verified by build + remaining test suite passing |

**Expected state after completion:**
- [ ] All FeatureShowcase and preview files deleted
- [ ] `previews/` directory deleted
- [ ] `feature-showcase.ts` constants file deleted
- [ ] `FeatureShowcase` export removed from barrel file
- [ ] TypeScript compilation may have errors in `Home.tsx` (resolved in Step 5)

---

### Step 4: Delete PillarSection System

**Objective:** Remove PillarSection, PillarBlock, PillarAccordionItem, pillar-data, and all associated tests.

**Files to delete:**
- `frontend/src/components/homepage/PillarSection.tsx`
- `frontend/src/components/homepage/PillarBlock.tsx`
- `frontend/src/components/homepage/PillarAccordionItem.tsx`
- `frontend/src/components/homepage/pillar-data.ts`
- `frontend/src/components/homepage/__tests__/PillarSection.test.tsx`
- `frontend/src/components/homepage/__tests__/PillarBlock.test.tsx`
- `frontend/src/components/homepage/__tests__/PillarAccordionItem.test.tsx`
- `frontend/src/components/homepage/__tests__/pillar-data.test.ts`

**Files to modify:**
- `frontend/src/components/homepage/index.ts` — remove `PillarSection` export line

**Details:**

1. Delete all 8 files listed above.
2. In `frontend/src/components/homepage/index.ts`, remove line 6: `export { PillarSection } from './PillarSection'`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete any other homepage components
- DO NOT modify `Home.tsx` yet (Step 5)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Deletion step — tests verified by build passing |

**Expected state after completion:**
- [ ] All PillarSection files deleted
- [ ] `PillarSection` export removed from barrel file
- [ ] TypeScript compilation may have errors in `Home.tsx` (resolved in Step 5)

---

### Step 5: Update Home.tsx and Home.test.tsx

**Objective:** Wire JourneySection into the homepage, remove FeatureShowcase and PillarSection imports, update section order, and fix tests.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — update imports and section order
- `frontend/src/pages/__tests__/Home.test.tsx` — update assertions

**Details:**

**Home.tsx changes:**

1. Remove `FeatureShowcase` and `PillarSection` from the destructured import on line 3:
   ```tsx
   // Before:
   import { FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview, FinalCTA } from '@/components/homepage'
   // After:
   import { StatsBar, DifferentiatorSection, DashboardPreview, FinalCTA } from '@/components/homepage'
   ```

2. Add JourneySection import:
   ```tsx
   import { JourneySection } from '@/components/JourneySection'
   ```

3. Update the `<main>` section order:
   ```tsx
   <main id="main-content">
     <HeroSection />
     <JourneySection />
     <StatsBar />
     <DashboardPreview />
     <DifferentiatorSection />
     <StartingPointQuiz />
     <FinalCTA />
   </main>
   ```

   Changes from current order:
   - `FeatureShowcase` → replaced by `JourneySection`
   - `PillarSection` → removed
   - `DashboardPreview` moved before `DifferentiatorSection` (swapped)

**Home.test.tsx changes:**

1. Remove the test "does not render JourneySection" (lines 71-77) — it now renders.
2. Remove or update the test "renders FeatureShowcase section" (lines 86-91) — replace with a test for JourneySection.
3. Update "renders all landing page sections" to include JourneySection:
   ```tsx
   // Journey
   expect(
     screen.getByRole('region', { name: /your journey to healing/i })
   ).toBeInTheDocument()
   ```
4. Add test: "does not render FeatureShowcase (replaced by JourneySection)":
   ```tsx
   it('does not render FeatureShowcase (replaced by JourneySection)', () => {
     renderHome()
     expect(
       screen.queryByRole('heading', { name: /experience worship room/i })
     ).not.toBeInTheDocument()
   })
   ```
5. Add test: "does not render PillarSection (removed in HP-8)":
   ```tsx
   it('does not render PillarSection (removed in HP-8)', () => {
     renderHome()
     expect(
       screen.queryByText(/three pillars/i)
     ).not.toBeInTheDocument()
   })
   ```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (layout order change only)

**Guardrails (DO NOT):**
- DO NOT modify any other sections (StatsBar, DashboardPreview, DifferentiatorSection, StartingPointQuiz, FinalCTA)
- DO NOT remove the `DevAuthToggle` dev component
- DO NOT change `SEO` props or `homepageJsonLd`
- DO NOT add new providers to `renderHome()` in tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders JourneySection region | integration | `getByRole('region', { name: /your journey to healing/i })` |
| Does not render FeatureShowcase | integration | `queryByRole('heading', { name: /experience worship room/i })` is null |
| Does not render PillarSection | integration | `queryByText(/three pillars/i)` is null |

**Expected state after completion:**
- [ ] `Home.tsx` renders `JourneySection` instead of `FeatureShowcase`, without `PillarSection`
- [ ] Section order matches spec: Hero → Journey → Stats → Dashboard → Differentiator → Quiz → CTA
- [ ] `Home.test.tsx` passes with updated assertions
- [ ] Build passes with 0 errors
- [ ] All tests pass

---

### Step 6: Verify Build and Full Test Suite

**Objective:** Confirm everything compiles and all tests pass.

**Files to create/modify:** None

**Details:**

1. Run `cd frontend && pnpm build` — expect 0 errors, 0 warnings.
2. Run `cd frontend && pnpm test` — expect all tests pass (total count will be lower due to deleted test files).
3. Verify no orphaned imports of `FeatureShowcase`, `PillarSection`, `feature-showcase`, or `pillar-data` remain anywhere in the codebase:
   ```bash
   grep -r "FeatureShowcase\|PillarSection\|PillarBlock\|PillarAccordionItem\|feature-showcase\|pillar-data" frontend/src/ --include="*.ts" --include="*.tsx"
   ```
   Expect zero results.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT fix unrelated lint warnings or test failures — only address issues caused by this plan

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | build | `pnpm build` exits 0 |
| All tests pass | test suite | `pnpm test` exits 0 |
| No orphaned imports | grep | Zero references to deleted components |

**Expected state after completion:**
- [ ] Build passes with 0 errors
- [ ] All tests pass
- [ ] No orphaned references to deleted components
- [ ] Ready for visual verification and commit

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create JourneySection component |
| 2 | 1 | Write JourneySection tests |
| 3 | — | Delete FeatureShowcase system |
| 4 | — | Delete PillarSection system |
| 5 | 1, 3, 4 | Wire Home.tsx + update Home tests |
| 6 | 1, 2, 3, 4, 5 | Verify build and full test suite |

Steps 1, 3, and 4 can run in parallel. Step 2 depends on Step 1. Step 5 depends on 1, 3, 4. Step 6 is final.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create JourneySection component | [COMPLETE] | 2026-04-02 | Created `frontend/src/components/JourneySection.tsx` with 7 new steps, useScrollReveal, purple glow circles, gradient connecting line, glow orbs, hover effects with ArrowRight, text-white/60 tagline+descriptions per spec |
| 2 | Write JourneySection tests | [COMPLETE] | 2026-04-02 | Created `frontend/src/components/__tests__/JourneySection.test.tsx` with 14 tests. Used `.` regex wildcard for smart quotes. All pass. |
| 3 | Delete FeatureShowcase system | [COMPLETE] | 2026-04-02 | Deleted 17 files + previews/ directory. Removed FeatureShowcase export from barrel. |
| 4 | Delete PillarSection system | [COMPLETE] | 2026-04-02 | Deleted 8 files. Removed PillarSection export from barrel. |
| 5 | Update Home.tsx and Home.test.tsx | [COMPLETE] | 2026-04-02 | Replaced FeatureShowcase/PillarSection with JourneySection in Home.tsx. Updated section order: Hero→Journey→Stats→Dashboard→Differentiator→Quiz→CTA. Updated Home.test.tsx: added JourneySection region assertion, replaced FeatureShowcase test with negative assertion, added PillarSection negative assertion. All tests pass. |
| 6 | Verify build and full test suite | [COMPLETE] | 2026-04-02 | TypeScript: 0 errors. Tests: 475 files / 5433 tests all pass. Orphaned import check: 0 results (only negative assertions in Home.test.tsx). Note: `pnpm build` has pre-existing workbox-window PWA issue unrelated to HP-8. |
