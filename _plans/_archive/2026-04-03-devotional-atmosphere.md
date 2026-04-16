# Implementation Plan: Devotional Atmosphere

**Spec:** `_specs/devotional-atmosphere.md`
**Date:** 2026-04-03
**Branch:** `claude/feature/devotional-atmosphere`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Files

- **`frontend/src/components/daily/DevotionalTabContent.tsx`** (346 lines) — the primary file being modified. Contains the full Devotional tab: heading, date nav, quote, passage, reflection, prayer, reflection question card, related plan callout, action buttons, cross-tab CTAs.
- **`frontend/src/pages/DailyHub.tsx`** (424 lines) — parent page. Already imports and uses `GlowBackground` (variant `center`) for the hero section (line 209). The Devotional tab panel is rendered at lines 347-358 without any GlowBackground wrapper.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (83 lines) — glow wrapper component. Variants: `center` (0.15 opacity), `left` (0.12), `right` (0.12), `split` (0.14/0.08). Container applies `bg-hero-bg`. Children wrapped in `relative z-10`.
- **`frontend/src/components/homepage/FrostedCard.tsx`** — glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with dual box-shadow.
- **`frontend/src/constants/gradients.tsx`** — `GRADIENT_TEXT_STYLE` (CSSProperties) and `WHITE_PURPLE_GRADIENT` (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`).
- **`frontend/src/components/BackgroundSquiggle.tsx`** — decorative SVG with `SQUIGGLE_MASK_STYLE` fade mask.
- **`frontend/src/components/homepage/__tests__/GlowBackground.test.tsx`** (156 lines) — existing tests including opacity assertions per variant.
- **`frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`** — existing tests. Uses `MemoryRouter` + `ToastProvider` + `AuthModalProvider` wrapper. Mocks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`.

### Key Patterns

- **GlowBackground wrapping:** In `DailyHub.tsx`, the hero section is wrapped in `<GlowBackground variant="center">` (line 209). The tab panels below it are NOT wrapped. This spec adds a GlowBackground inside the Devotional tab content itself.
- **BackgroundSquiggle positioning:** In `DevotionalTabContent.tsx` lines 143-150, the squiggle is positioned via `absolute inset-0 opacity-[0.12]` with `SQUIGGLE_MASK_STYLE`, inside a `relative` container. Content sits in a sibling `relative` div above it.
- **Frosted glass buttons:** The existing buttons use `rounded-lg border border-white/20 bg-white/10 px-4 py-3` (lines 303, 310). Spec upgrades to `rounded-xl bg-white/[0.06] border-white/[0.12]` with purple box-shadow.
- **Inline buttons vs components:** DevotionalTabContent uses inline `<button>` elements for Share and Read Aloud (NOT the standalone `ShareButton` or `ReadAloudButton` components). This spec modifies only the inline button classNames.

### GlowBackground Opacity Issue

The `center` variant currently renders at **0.15 opacity**, but the spec requires **0.25-0.35 opacity** ("standard section level, per design system"). The design system rule file (`09-design-system.md`) confirms: "Standard sections: 0.25-0.35". The center variant's 0.15 is below spec.

**Solution:** Add an optional `glowOpacity` prop to `GlowBackground` that overrides the config opacity. This avoids changing existing usages (the Daily Hub hero already uses center at 0.15). The DevotionalTabContent will pass `glowOpacity={0.30}` (midpoint of 0.25-0.35 range).

### Test Patterns

- Wrapper: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- Mocked hooks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`
- Assertions: `screen.getByText`, `screen.getByRole`, class name checks on container elements

---

## Auth Gating Checklist

**No auth-gated actions in this spec.** The Devotional tab is a public route (`/daily?tab=devotional`). All features (view, read aloud, share, date nav) work for both logged-in and logged-out users. No auth modal triggers.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual-only upgrade | No auth changes | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | variant | `center` | spec |
| GlowBackground | opacity | 0.30 (spec: 0.25-0.35 range) | spec + design system rule |
| GlowBackground | orb color | `rgba(139, 92, 246, OPACITY)` | GlowBackground.tsx:11 |
| GlowBackground | container bg | `bg-hero-bg` (#08051A) | GlowBackground.tsx:78 |
| Gradient text | style object | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` | gradients.tsx:9-15 |
| Gradient text | gradient | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | gradients.tsx:6 |
| FrostedCard | background | `bg-white/[0.06]` | FrostedCard.tsx:25 |
| FrostedCard | border | `border border-white/[0.12]` | FrostedCard.tsx:25 |
| FrostedCard | shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx:26 |
| FrostedCard | radius + padding | `rounded-2xl p-6` | FrostedCard.tsx:25 |
| Frosted button | background | `bg-white/[0.06]` | spec |
| Frosted button | border | `border border-white/[0.12]` | spec |
| Frosted button | radius | `rounded-xl` | spec |
| Frosted button | shadow (default) | `shadow-[0_0_15px_rgba(139,92,246,0.04)]` | spec |
| Frosted button | shadow (hover) | `shadow-[0_0_20px_rgba(139,92,246,0.08)]` | spec |
| Frosted button | hover bg | `hover:bg-white/[0.09]` | FrostedCard hover pattern |
| Frosted button | hover border | `hover:border-white/[0.18]` | FrostedCard hover pattern |
| Backdrop blur | value | `backdrop-blur-sm` | FrostedCard pattern |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- `WHITE_PURPLE_GRADIENT` is `linear-gradient(223deg, ...)` — NOT 135deg
- `bg-hero-bg` is `#08051A` — NOT `#0D0620` (`bg-hero-dark` is a different, lighter color)
- FrostedCard uses bracket notation: `bg-white/[0.06]`, `border-white/[0.12]` — precision matters
- `GRADIENT_TEXT_STYLE` is a CSSProperties object applied via `style={}`, NOT Tailwind classes
- GlowBackground applies `bg-hero-bg` to its container — wrapping content in it changes the background color
- GlowBackground children are wrapped in `relative z-10` automatically — content above orbs by default
- The Devotional tab's BackgroundSquiggle must remain INSIDE the GlowBackground wrapper, not be replaced by it
- Existing reflection question card already uses `bg-white/[0.06] backdrop-blur-sm` inline — switching to `FrostedCard` component standardizes this
- The heading "What's On Your Soul?" currently splits "Soul?" into a `<span className="font-script text-primary">` — spec replaces with `GRADIENT_TEXT_STYLE` on the ENTIRE heading text (no separate span)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual upgrade spec. No new data models or localStorage keys.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | — | Visual-only changes; no localStorage modifications |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | GlowBackground orbs scale to `w-[300px] h-[300px]` with `blur-[60px]`. Heading `text-2xl`. Cards stack vertically. Buttons stack (`flex-col`). Padding `px-4 py-10`. |
| Tablet | 768px | GlowBackground orbs at `md:w-[600px] md:h-[600px]` with `md:blur-[80px]`. Heading `sm:text-3xl`. Content in `max-w-4xl`. Buttons side-by-side (`sm:flex-row`). Padding `sm:py-14`. |
| Desktop | 1440px | Full glow orb effect. Heading `lg:text-4xl`. Generous whitespace within `max-w-4xl`. |

All responsive behavior is inherited from existing layout + GlowBackground's built-in mobile handling. No new breakpoint logic.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab bar → Devotional content | `py-10` / `sm:py-14` top padding | DevotionalTabContent.tsx:142 |
| Section dividers | `py-8 sm:py-10` between bordered sections | DevotionalTabContent.tsx (consistent pattern) |
| Action buttons → Cross-tab CTAs | `mt-8 sm:mt-10` | DevotionalTabContent.tsx:300, 322 |
| Bottom padding | `pb-16 sm:pb-20` | DevotionalTabContent.tsx:340 |

No changes to vertical rhythm — all spacing preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is a visual-only upgrade — no functional changes
- [x] No auth gating changes needed (public route)
- [x] GlowBackground component exists and is already imported in DailyHub.tsx
- [x] FrostedCard component exists with expected props (children, className)
- [x] GRADIENT_TEXT_STYLE exists in `@/constants/gradients`
- [x] Design system values verified from codebase inspection (all file:line references confirmed)
- [x] GlowBackground center variant opacity (0.15) is below spec requirement (0.25-0.35) — plan addresses via new `glowOpacity` prop
- [ ] Existing DevotionalTabContent tests pass before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GlowBackground opacity mismatch | Add optional `glowOpacity` prop to GlowBackground component, pass 0.30 from DevotionalTabContent | Spec requires 0.25-0.35 but center variant is 0.15. Changing the variant default would affect the DailyHub hero (already using center at 0.15). A prop override is the least-invasive approach. |
| GlowBackground wrapping level | Wrap inside DevotionalTabContent (around the `relative` container), not in DailyHub.tsx around the tabpanel | The spec says "Wrap the entire Devotional tab content." Wrapping inside the component keeps the change localized and doesn't affect other tabs. |
| GlowBackground `bg-hero-bg` redundancy | Pass `className="!bg-transparent"` to GlowBackground to avoid applying bg-hero-bg (DailyHub already has `bg-hero-bg` on the page container) | Without this, GlowBackground would add a second bg-hero-bg layer. Since the page already has `bg-hero-bg` via `DailyHub.tsx:197`, making GlowBackground transparent keeps it as a pure glow overlay. |
| BackgroundSquiggle layering | Squiggle stays inside GlowBackground's `z-10` content wrapper, so it appears above the glow orbs | The spec says "Glow appears BEHIND the BackgroundSquiggle." Since GlowBackground wraps children in `relative z-10`, the squiggle (part of children) naturally sits above the orbs. |
| Heading text — single flow vs split | Replace `<span>` approach with GRADIENT_TEXT_STYLE on entire h2 | Spec acceptance criterion: "Heading text is a single flow — no separate `<span>` for 'Soul?'" |
| FrostedCard padding override | Pass `className="p-4 sm:p-6"` to override default `p-6` | Existing reflection card uses `p-4 sm:p-6`. FrostedCard defaults to `p-6`. Override preserves mobile-friendly smaller padding. |
| Frosted button `backdrop-blur-sm` | Include in button classes for consistency with FrostedCard | Both FrostedCard and spec reference `backdrop-blur-sm`. Buttons should match. |

---

## Implementation Steps

### Step 1: Add `glowOpacity` prop to GlowBackground

**Objective:** Allow callers to override the default glow orb opacity without changing existing behavior.

**Files to create/modify:**
- `frontend/src/components/homepage/GlowBackground.tsx` — add optional `glowOpacity` prop
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — add test for opacity override

**Details:**

Add `glowOpacity?: number` to `GlowBackgroundProps`. Pass it through to `GlowOrbs`. In `GlowOrbs`, if `glowOpacity` is provided, use it instead of `orb.opacity` in the radial gradient style.

```typescript
// GlowBackgroundProps (add to interface at line 4)
glowOpacity?: number

// GlowOrbs (modify component at line 53)
function GlowOrbs({ variant, glowOpacity }: { variant: 'center' | 'left' | 'right' | 'split'; glowOpacity?: number }) {
  const orbs = GLOW_CONFIG[variant]
  return (
    <>
      {orbs.map((orb, i) => (
        <div
          key={i}
          data-testid="glow-orb"
          className={cn(ORB_BASE, orb.size, orb.position)}
          style={{
            background: `radial-gradient(circle, rgba(${orb.color}, ${glowOpacity ?? orb.opacity}) 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

// GlowBackground (pass glowOpacity at line 79)
{variant !== 'none' && <GlowOrbs variant={variant} glowOpacity={glowOpacity} />}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — this is a prop addition only.

**Guardrails (DO NOT):**
- DO NOT change default opacity values in `GLOW_CONFIG` — existing usages must be unaffected
- DO NOT change the component's public API beyond adding the single optional prop
- DO NOT remove or modify existing test assertions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `glowOpacity prop overrides default opacity` | unit | Render with `glowOpacity={0.30}`, assert orb style contains `rgba(139, 92, 246, 0.3)` |
| `default opacity used when glowOpacity not provided` | unit | Render center variant without glowOpacity, assert orb style still contains `0.15` (existing test covers this) |

**Expected state after completion:**
- [x] GlowBackground accepts optional `glowOpacity` prop
- [x] Existing tests still pass (no default behavior changed)
- [x] New test for glowOpacity override passes

---

### Step 2: Wrap Devotional tab in GlowBackground + gradient heading

**Objective:** Add purple glow orbs behind Devotional content and replace Caveat script heading with gradient text.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — wrap content in GlowBackground, update heading

**Details:**

**2a. Add GlowBackground wrapper.** Import `GlowBackground` from `@/components/homepage/GlowBackground`. Wrap the outermost `<div className="mx-auto max-w-4xl...">` content inside `<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">`. This keeps the glow as an overlay without adding a second `bg-hero-bg` background.

The existing structure (lines 141-343):
```tsx
<div className="mx-auto max-w-4xl px-4 py-10 sm:py-14" {...swipeHandlers}>
  <div className="relative">
    {/* BackgroundSquiggle */}
    <div className="relative">
      {/* All content */}
    </div>
  </div>
</div>
```

Becomes:
```tsx
<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
  <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14" {...swipeHandlers}>
    <div className="relative">
      {/* BackgroundSquiggle — unchanged */}
      <div className="relative">
        {/* All content */}
      </div>
    </div>
  </div>
</GlowBackground>
```

**2b. Replace heading style.** Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`. Replace the current heading (lines 153-158):

```tsx
// Before
<h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
    Soul?
  </span>
</h2>

// After
<h2
  className="mb-4 text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl"
  style={GRADIENT_TEXT_STYLE}
>
  What&apos;s On Your Soul?
</h2>
```

Remove the `text-white` class (GRADIENT_TEXT_STYLE sets color/fill via inline style). Remove the `<span>` — entire heading gets gradient treatment as a single flow.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Full 600×600px glow orb at 0.30 opacity. Heading `lg:text-4xl` with gradient.
- Tablet (768px): Glow orb at `md:w-[600px]`. Heading `sm:text-3xl`.
- Mobile (375px): Glow orb at 300×300px with `blur-[60px]`. Heading `text-2xl`.

**Guardrails (DO NOT):**
- DO NOT remove or reposition the `BackgroundSquiggle` — it stays exactly where it is
- DO NOT change any swipe handlers, date navigation, completion tracking, or callbacks
- DO NOT add `text-white` to the heading — `GRADIENT_TEXT_STYLE` handles color via inline style
- DO NOT change the `max-w-4xl` container width

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders GlowBackground with glow orb` | integration | Assert `screen.getByTestId('glow-orb')` exists within DevotionalTabContent render |
| `heading uses gradient text style (no font-script)` | unit | Assert heading element does NOT contain class `font-script`; assert heading text is "What's On Your Soul?" as single text node |
| `BackgroundSquiggle still renders` | unit | Assert BackgroundSquiggle SVG element is present (existing test covers if it exists) |

**Expected state after completion:**
- [x] Purple glow orbs visible behind Devotional tab content
- [x] BackgroundSquiggle remains visible underneath glow
- [x] Heading renders "What's On Your Soul?" with white-to-purple gradient, no Caveat script
- [x] All date navigation, swipe, read aloud, share still work

---

### Step 3: Upgrade reflection card to FrostedCard

**Objective:** Replace the reflection question card's inline styling with the `FrostedCard` component while preserving the left purple border accent.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace inline card with FrostedCard

**Details:**

Import `FrostedCard` from `@/components/homepage/FrostedCard`. Replace the reflection question card (lines 280-287):

```tsx
// Before
<div className="border-t border-white/10 py-8 sm:py-10" ref={questionRef}>
  <div className="rounded-2xl border border-white/10 border-l-2 border-l-primary bg-white/[0.06] p-4 backdrop-blur-sm sm:p-6">
    <p className="text-sm text-white/60">Something to think about today:</p>
    <p className="mt-2 text-lg font-medium text-white">
      {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
    </p>
  </div>
</div>

// After
<div className="border-t border-white/10 py-8 sm:py-10" ref={questionRef}>
  <FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">
    <p className="text-sm text-white/60">Something to think about today:</p>
    <p className="mt-2 text-lg font-medium text-white">
      {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
    </p>
  </FrostedCard>
</div>
```

Key: `FrostedCard` already provides `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` and the dual box-shadow. Override padding with `p-4 sm:p-6` and add `border-l-2 border-l-primary` via className.

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): FrostedCard with `p-6` (sm breakpoint) + left purple border + box-shadow
- Tablet (768px): Same as desktop
- Mobile (375px): FrostedCard with `p-4` + left purple border + box-shadow

**Guardrails (DO NOT):**
- DO NOT move the `ref={questionRef}` — it must stay on the outer wrapper div for intersection observer
- DO NOT change the text content or the `replace()` call
- DO NOT remove the `border-t border-white/10` section divider on the outer div

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `reflection card has FrostedCard styling` | unit | Assert the reflection question container has class `backdrop-blur-sm` and `border-l-primary` |

**Expected state after completion:**
- [x] Reflection question card uses FrostedCard component with dual box-shadow
- [x] Left purple border accent preserved
- [x] Card padding: `p-4` mobile, `p-6` tablet+

---

### Step 4: Upgrade Share and Read Aloud buttons to frosted glass

**Objective:** Apply frosted glass styling with purple glow shadow to the Share and Read Aloud buttons.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — update button classNames

**Details:**

Replace the button classes at lines 303 and 310. Both buttons currently use:
```
rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15
```

New classes for both:
```
rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]
```

Changes from old → new:
- `rounded-lg` → `rounded-xl`
- `border-white/20` → `border-white/[0.12]`
- `bg-white/10` → `bg-white/[0.06]`
- Added `backdrop-blur-sm`
- Added `shadow-[0_0_15px_rgba(139,92,246,0.04)]` (default purple glow)
- `transition-colors` → `transition-all` (for shadow transition)
- `hover:bg-white/15` → `hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]`

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Buttons side-by-side (`sm:flex-row sm:justify-center`), frosted glass with glow shadow
- Tablet (768px): Same as desktop
- Mobile (375px): Buttons stack vertically (`flex-col`), full-width frosted glass

**Guardrails (DO NOT):**
- DO NOT change the button `onClick` handlers
- DO NOT change the button text content or icons
- DO NOT change the `min-h-[44px]` or remove accessible touch targets (existing buttons don't have explicit min-h but have `py-3` which meets 44px — preserve this)
- DO NOT change the Read Aloud button's conditional label logic (idle/playing/paused)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Share button has frosted glass styling` | unit | Assert Share button contains classes `rounded-xl`, `bg-white/[0.06]`, `backdrop-blur-sm` |
| `Read Aloud button has frosted glass styling` | unit | Assert Read Aloud button contains classes `rounded-xl`, `bg-white/[0.06]`, `backdrop-blur-sm` |

**Expected state after completion:**
- [x] Both buttons have frosted glass appearance with `backdrop-blur-sm`
- [x] Purple glow shadow visible on hover
- [x] `rounded-xl` border radius (slightly more rounded than before)
- [x] All button functionality unchanged

---

### Step 5: Update existing tests + add visual-specific tests

**Objective:** Ensure existing tests pass and add tests for the new visual elements.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — update heading test, add new tests

**Details:**

**5a. Update heading test.** The existing test at line 67-71 checks for `screen.getByText('Soul?')` as a separate element. After Step 2, "Soul?" is no longer in its own `<span>`. Update:

```typescript
// Before
it('renders "What\'s On Your Soul?" heading', () => {
  renderComponent()
  expect(screen.getByText('Soul?')).toBeInTheDocument()
  expect(screen.getByText(/What's On Your/)).toBeInTheDocument()
})

// After
it('renders "What\'s On Your Soul?" heading with gradient style', () => {
  renderComponent()
  const heading = screen.getByRole('heading', { name: /What's On Your Soul\?/ })
  expect(heading).toBeInTheDocument()
  // Gradient text style applied (no Caveat script)
  expect(heading.className).not.toContain('font-script')
  expect(heading.querySelector('span')).toBeNull()
})
```

**5b. Add GlowBackground test.**

```typescript
it('wraps content in GlowBackground with glow orb', () => {
  renderComponent()
  expect(screen.getByTestId('glow-orb')).toBeInTheDocument()
})
```

**5c. Add FrostedCard reflection card test.**

```typescript
it('reflection question card has frosted glass styling with purple border', () => {
  renderComponent()
  const questionText = screen.getByText(/Something to think about today/)
  const card = questionText.closest('[class*="backdrop-blur"]') as HTMLElement
  expect(card).not.toBeNull()
  expect(card!.className).toContain('border-l-primary')
})
```

**5d. Add frosted button test.**

```typescript
it('action buttons have frosted glass styling', () => {
  renderComponent()
  const shareBtn = screen.getByRole('button', { name: /Share today/i })
  expect(shareBtn.className).toContain('rounded-xl')
  expect(shareBtn.className).toContain('backdrop-blur-sm')
})
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — test file only.

**Guardrails (DO NOT):**
- DO NOT remove any existing passing tests (only update the heading assertion that breaks due to the heading change)
- DO NOT change the test render wrapper (MemoryRouter + ToastProvider + AuthModalProvider)
- DO NOT mock GlowBackground or FrostedCard — let them render naturally to verify integration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Updated heading test | unit | Asserts heading text, no font-script, no span |
| GlowBackground presence | integration | Asserts glow-orb testid present |
| FrostedCard reflection | integration | Asserts backdrop-blur + border-l-primary on reflection card |
| Frosted button styling | unit | Asserts rounded-xl + backdrop-blur-sm on Share button |

**Expected state after completion:**
- [x] All existing tests pass (heading test updated)
- [x] 4 new/updated visual assertions pass
- [x] `pnpm test` green

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `glowOpacity` prop to GlowBackground |
| 2 | 1 | Wrap DevotionalTabContent in GlowBackground + gradient heading |
| 3 | — | Replace reflection card with FrostedCard |
| 4 | — | Upgrade Share + Read Aloud buttons to frosted glass |
| 5 | 2, 3, 4 | Update tests to match new visual structure |

Steps 2, 3, and 4 all modify `DevotionalTabContent.tsx` and should be applied sequentially to avoid merge conflicts. Step 1 is independent (different file). Step 5 must come after 2-4.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `glowOpacity` prop to GlowBackground | [COMPLETE] | 2026-04-03 | Added `glowOpacity?: number` prop to GlowBackgroundProps, passed through to GlowOrbs. New test added. All 16 tests pass. |
| 2 | GlowBackground wrapper + gradient heading | [COMPLETE] | 2026-04-03 | Wrapped DevotionalTabContent in GlowBackground with glowOpacity={0.30} and !bg-transparent. Replaced Caveat heading with GRADIENT_TEXT_STYLE. Build passes. 2 tests expected to break (fixed in Step 5). |
| 3 | FrostedCard reflection card | [COMPLETE] | 2026-04-03 | Replaced inline card styling with FrostedCard component. Preserved border-l-2 border-l-primary and p-4 sm:p-6 override. Build passes. |
| 4 | Frosted glass buttons | [COMPLETE] | 2026-04-03 | Updated Share + Read Aloud buttons: rounded-xl, bg-white/[0.06], backdrop-blur-sm, purple glow shadow, transition-all with hover states. Build passes. |
| 5 | Update tests | [COMPLETE] | 2026-04-03 | Updated heading test (gradient, no font-script, no span). Updated max-w-4xl test (querySelector). Added 3 new tests: glow orb presence, FrostedCard reflection card, frosted button styling. 39/39 pass. |
