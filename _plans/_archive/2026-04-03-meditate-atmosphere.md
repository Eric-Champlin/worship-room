# Implementation Plan: Meditate Atmosphere

**Spec:** `_specs/meditate-atmosphere.md`
**Date:** 2026-04-03
**Branch:** `claude/feature/meditate-atmosphere`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Files

- **`frontend/src/components/daily/MeditateTabContent.tsx`** (147 lines) — the **only** production file being modified. Contains the full Meditate tab: heading, AmbientSoundPill, "all complete" celebration banner, and 6 meditation card buttons in a 2-column grid.
- **`frontend/src/pages/DailyHub.tsx`** (417 lines) — parent page. Already imports `GlowBackground`, `FrostedCard`, `GRADIENT_TEXT_STYLE`. The Meditate tab panel is rendered at lines 387-395 without any GlowBackground wrapper — `<MeditateTabContent />` is rendered bare inside the tabpanel div.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (85 lines) — glow wrapper. Variants: `center`, `left`, `right`, `split`. Already has `glowOpacity` prop (added during devotional-atmosphere). The `split` variant creates 2 orbs at 25% and 75% horizontal positions (opacity 0.14 and 0.08). Container applies `bg-hero-bg`. Children wrapped in `relative z-10`.
- **`frontend/src/components/homepage/FrostedCard.tsx`** (38 lines) — glass card component. Not used directly (spec applies FrostedCard visual DNA to existing buttons via `cn()` classes).
- **`frontend/src/constants/gradients.tsx`** (32 lines) — `GRADIENT_TEXT_STYLE` (CSSProperties) and `WHITE_PURPLE_GRADIENT` string.
- **`frontend/src/components/BackgroundSquiggle.tsx`** — decorative SVG with `SQUIGGLE_MASK_STYLE`.
- **`frontend/src/pages/__tests__/MeditateLanding.test.tsx`** (137 lines) — existing test file. Wrapper: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`. Mocks: `useAuth`, `useNavigate`, `AudioProvider`, `useScenePlayer`.

### Key Patterns

- **GlowBackground wrapping:** `DailyHub.tsx` wraps its hero section in `<GlowBackground variant="center">` (line 209). Tab panels below are NOT wrapped. The spec adds GlowBackground inside the MeditateTabContent itself, same approach as the devotional-atmosphere spec.
- **BackgroundSquiggle positioning:** In `MeditateTabContent.tsx` lines 60-66, the squiggle sits in `absolute inset-0 opacity-[0.12]` with `SQUIGGLE_MASK_STYLE`, inside a `relative` container. Content sits in a sibling `relative` div above it.
- **Card button classes:** Currently a template literal string (`\`...${isSuggested ? '...' : '...'}\``) at line 111. Spec requires switching to `cn()` utility for cleaner conditional logic.
- **DailyHub page background:** `bg-hero-bg` at line 197 on the root container. GlowBackground also applies `bg-hero-bg`, so we need `className="!bg-transparent"` to avoid double-layering (same pattern as DevotionalTabContent line 145).
- **Devotional tab precedent:** `DevotionalTabContent.tsx` line 145 already uses `<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">` — this spec follows the identical wrapping pattern with `variant="split"`.

### GlowBackground Split Variant Opacity

The `split` variant currently renders orbs at 0.14 and 0.08 opacity — below the design system minimum of 0.25 for standard sections. The `glowOpacity` prop overrides ALL orbs to the same value. For the 2-column card grid, 0.30 (midpoint of 0.25-0.35) is appropriate.

### Test Patterns

- Wrapper: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- Mocked hooks: `useAuth`, `useNavigate`, `AudioProvider` contexts, `useScenePlayer`
- Assertions: `screen.getByText`, `screen.getByRole`, class name checks, `queryByText`

---

## Auth Gating Checklist

**No auth-gated actions in this spec.** This is a visuals-only upgrade. All existing auth behavior is preserved exactly as-is (card click → auth modal for logged-out users, navigation for logged-in).

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual-only upgrade | No auth changes | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | variant | `split` | spec requirement 1 |
| GlowBackground | glowOpacity | `0.30` (spec: 0.25-0.35 range, behind card grid) | spec + 09-design-system.md |
| GlowBackground | container override | `className="!bg-transparent"` | DevotionalTabContent.tsx:145 precedent |
| GlowBackground split orbs | positions | 25% and 75% horizontal | GlowBackground.tsx:36-48 |
| Gradient text | style object | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` | gradients.tsx:9-15 |
| Gradient text | gradient | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | gradients.tsx:6 |
| Standard card (non-suggested) | background | `bg-white/[0.06] backdrop-blur-sm` | FrostedCard pattern |
| Standard card | border | `border border-white/[0.12]` | FrostedCard pattern |
| Standard card | shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx:26 |
| Standard card hover | background | `hover:bg-white/[0.09]` | FrostedCard.tsx:28 |
| Standard card hover | border | `hover:border-white/[0.18]` | FrostedCard.tsx:28 |
| Standard card hover | shadow | `hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]` | FrostedCard.tsx:29 |
| Standard card hover | lift | `hover:-translate-y-0.5` | FrostedCard.tsx:30 |
| Standard card hover | reduced motion | `motion-reduce:hover:translate-y-0` | FrostedCard.tsx:31 |
| Suggested card | border | `border-2 border-primary` (existing) | spec requirement 4 |
| Suggested card | ring | `ring-1 ring-primary/30` (existing) | spec requirement 4 |
| Suggested card | enhanced shadow | `shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]` | spec requirement 4 — enhanced glow |
| Focus ring offset | color | `focus-visible:ring-offset-hero-bg` | spec requirement 5 |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- `WHITE_PURPLE_GRADIENT` is `linear-gradient(223deg, ...)` — NOT 135deg
- `bg-hero-bg` is `#08051A` — NOT `#0D0620` (`bg-hero-dark` is a different, lighter color)
- FrostedCard uses bracket notation: `bg-white/[0.06]`, `border-white/[0.12]` — precision matters
- `GRADIENT_TEXT_STYLE` is a CSSProperties object applied via `style={}`, NOT Tailwind classes
- GlowBackground applies `bg-hero-bg` to its container — use `className="!bg-transparent"` when page already has `bg-hero-bg`
- GlowBackground children are wrapped in `relative z-10` automatically — content above orbs by default
- The BackgroundSquiggle must remain INSIDE the GlowBackground wrapper, not be replaced by it
- The heading currently has a `<span className="font-script">` for "Spirit?" — spec replaces the ENTIRE heading with `GRADIENT_TEXT_STYLE` on a single `<h2>` (no separate span)
- Use `cn()` utility for conditional classNames — NOT template literal strings
- The `transition-colors` on existing buttons should change to `transition-all duration-200 ease-out` to animate shadow + translate changes
- `ring-offset-dashboard-dark` → `ring-offset-hero-bg` per spec requirement 5

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
| Mobile | 375px | 2-column card grid with `gap-4`, `p-4` padding. GlowBackground orbs scale to `w-[300px] h-[300px]` with `blur-[60px]` (built-in). Heading `text-2xl`. |
| Tablet | 768px | 2-column grid with `gap-6`, `sm:p-5` padding. GlowBackground orbs at `md:w-[500px] md:h-[500px]` with `md:blur-[80px]`. Heading `sm:text-3xl`. |
| Desktop | 1440px | Same as tablet — `max-w-2xl` constrains width. Heading `lg:text-4xl`. Full glow effect. |

No layout changes from current behavior. The `GlowBackground` component handles responsive scaling internally. Cards remain in a 2-column grid at all breakpoints.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab bar → Meditate content | `py-10` / `sm:py-14` top padding | MeditateTabContent.tsx:58 |
| Heading → card grid | `mb-4` heading wrapper + grid directly below | MeditateTabContent.tsx:68, 89 |
| "All complete" banner → card grid | `mb-8` on banner | MeditateTabContent.tsx:81 |

No changes to vertical rhythm — all spacing preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is a visual-only upgrade — no functional changes
- [x] No auth gating changes needed
- [x] `GlowBackground` component exists with `glowOpacity` prop and `split` variant
- [x] `GRADIENT_TEXT_STYLE` exists in `@/constants/gradients`
- [x] `cn()` utility exists in `@/lib/utils`
- [x] Design system values verified from codebase inspection (all file:line references confirmed)
- [x] GlowBackground split variant opacity (0.14/0.08) is below spec requirement (0.25-0.35) — plan addresses via `glowOpacity` prop
- [x] `ring-offset-hero-bg` is used in other components (JourneySection, DailyHub tabs) — confirms token exists in Tailwind config
- [x] Devotional-atmosphere plan is a sibling spec — same approach (GlowBackground wrapping, transparent bg, gradient heading)
- [ ] Existing MeditateLanding tests pass before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GlowBackground opacity for split variant | Pass `glowOpacity={0.30}` (midpoint of 0.25-0.35 "behind card grids" range) | Split variant defaults are 0.14/0.08, below design system minimum. The glowOpacity prop overrides both orbs uniformly. 0.30 is the same value used by the devotional-atmosphere spec. |
| GlowBackground `bg-hero-bg` redundancy | Pass `className="!bg-transparent"` to avoid double-layering | DailyHub already has `bg-hero-bg` on the page root (line 197). Same pattern as DevotionalTabContent. |
| BackgroundSquiggle layering | Squiggle stays inside GlowBackground's `z-10` content wrapper, above glow orbs | Spec: "GlowBackground wraps the entire section as the outermost layer, with the squiggle and content nested inside." GlowBackground auto-wraps children in `relative z-10`. |
| Card button — cn() vs template literal | Switch from template literal to `cn()` utility | Spec requirement: "Card buttons use cn() utility for cleaner conditional className logic." Also consistent with FrostedCard pattern and project coding standards. |
| Suggested card enhanced shadow | `shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]` — slightly stronger purple glow than standard cards (0.12 vs 0.06) | Spec: "Suggested cards gain an enhanced purple glow shadow." Must remain visually distinct from standard cards while keeping `border-primary` and `ring-primary/30`. |
| Heading — no Caveat font | Replace `<h2>` with two spans approach with single `<h2 style={GRADIENT_TEXT_STYLE}>` on full text | Spec acceptance criteria: "no Caveat script font, no separate `<span>`". Full heading in gradient. |
| Transition property | Change `transition-colors` to `transition-all duration-200 ease-out` | Card hover now includes shadow changes and translate-y, which `transition-colors` doesn't animate. FrostedCard uses `transition-all duration-200 ease-out`. |

---

## Implementation Steps

### Step 1: Update MeditateTabContent — GlowBackground wrapper, gradient heading, frosted card buttons

**Objective:** Apply all visual changes from the spec in a single step. All changes are within one file and are CSS/className-only with one new import.

**Files to create/modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — add GlowBackground wrapper, replace heading, upgrade card button styles, update focus ring offset

**Details:**

1. **Add imports** at the top of the file:
   ```typescript
   import { GlowBackground } from '@/components/homepage/GlowBackground'
   import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
   import { cn } from '@/lib/utils'
   ```

2. **Wrap the outermost `<div>` content in `GlowBackground`** — the GlowBackground becomes the outermost layer inside the returned JSX. The existing `<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">` and everything inside it becomes the child of GlowBackground:
   ```tsx
   <GlowBackground variant="split" glowOpacity={0.30} className="!bg-transparent">
     <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
       {/* existing relative container with squiggle + content */}
     </div>
   </GlowBackground>
   ```
   The `BackgroundSquiggle` remains inside this structure, above the glow orbs (since GlowBackground wraps children in `relative z-10`).

3. **Replace the heading** — current heading (lines 69-74):
   ```tsx
   <h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
     What&apos;s On Your{' '}
     <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
       Spirit?
     </span>
   </h2>
   ```
   Replace with:
   ```tsx
   <h2
     className="text-center font-sans text-2xl font-bold sm:text-3xl lg:text-4xl"
     style={GRADIENT_TEXT_STYLE}
   >
     What&apos;s On Your Spirit?
   </h2>
   ```

4. **Upgrade card button classes** — replace the template literal className (line 111) with `cn()`. Standard (non-suggested) cards get FrostedCard visual DNA. Suggested cards keep their primary border/ring but gain enhanced shadow:
   ```tsx
   className={cn(
     'group rounded-2xl p-4 text-left sm:p-5',
     'transition-all duration-200 ease-out',
     'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
     isSuggested
       ? [
           'border-2 border-primary bg-primary/10 ring-1 ring-primary/30',
           'shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]',
         ]
       : [
           'border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm',
           'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
           'hover:bg-white/[0.09] hover:border-white/[0.18]',
           'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
           'hover:-translate-y-0.5',
           'motion-reduce:hover:translate-y-0',
         ]
   )}
   ```

**Key changes from current code:**
- `transition-colors` → `transition-all duration-200 ease-out` (animates shadow + translate)
- `border-white/10` → `border-white/[0.12]` (FrostedCard precision)
- `hover:bg-white/[0.10] hover:border-white/20` → `hover:bg-white/[0.09] hover:border-white/[0.18]` (FrostedCard exact values)
- Added purple glow `shadow-[...]` on both standard and suggested cards
- Added `hover:-translate-y-0.5` + `motion-reduce:hover:translate-y-0` for lift effect
- `ring-offset-dashboard-dark` → `ring-offset-hero-bg`
- Suggested cards: `bg-primary/10` preserved, `shadow` enhanced with stronger purple glow (0.12 vs 0.06)

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): Full glow orbs, `sm:p-5` card padding, gradient heading at `lg:text-4xl`
- Tablet (768px): Same layout, `sm:p-5` padding, heading at `sm:text-3xl`
- Mobile (375px): Glow orbs scale down (built-in), `p-4` padding, heading at `text-2xl`, 2-column grid with `gap-4`

**Guardrails (DO NOT):**
- DO NOT change the "all complete" golden glow celebration banner
- DO NOT change the "Suggested" badge text/layout
- DO NOT change the AmbientSoundPill component or its placement
- DO NOT change card inner content (icon, title, description, time, checkmarks)
- DO NOT change auth gating logic (onClick handler)
- DO NOT change navigation logic
- DO NOT change completion tracking
- DO NOT create new files — all changes in MeditateTabContent.tsx
- DO NOT use `border-white/10` — use `border-white/[0.12]` (bracket notation for precision)
- DO NOT use `transition-colors` — use `transition-all duration-200 ease-out`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders gradient heading text` | unit | Verify heading reads "What's On Your Spirit?" with `GRADIENT_TEXT_STYLE` applied via style attribute |
| `heading has no Caveat script font span` | unit | Verify no element with `font-script` class exists inside the heading |
| `renders glow background with split variant` | unit | Verify `GlowBackground` renders with `data-testid="glow-orb"` elements present |
| `standard card has frosted glass classes` | unit | Verify a non-suggested card button has `bg-white/[0.06]`, `border-white/[0.12]`, and shadow classes |
| `standard card has hover lift classes` | unit | Verify non-suggested card has `hover:-translate-y-0.5` and `motion-reduce:hover:translate-y-0` |
| `suggested card has enhanced shadow` | unit | When challenge context provides a suggested meditation, verify the suggested card has `border-primary` and stronger shadow |
| `focus ring uses hero-bg offset` | unit | Verify card buttons have `ring-offset-hero-bg` and NOT `ring-offset-dashboard-dark` |
| `existing auth gating still works` | integration | Logged-out click → auth modal appears (existing test preserved) |
| `existing navigation still works` | integration | Logged-in click → navigates to meditation sub-page (existing test preserved) |

**Expected state after completion:**
- [ ] Purple glow orbs visible behind card grid at split positions (25%, 75%)
- [ ] BackgroundSquiggle still faintly visible at opacity 0.12
- [ ] Heading reads "What's On Your Spirit?" in gradient text, no Caveat font
- [ ] All 6 cards have frosted glass styling with purple glow shadow
- [ ] Hover on non-suggested cards: brightened bg, brightened border, lift, intensified shadow
- [ ] Reduced motion: no hover translate
- [ ] Suggested card visually distinct with primary border + enhanced shadow
- [ ] Focus ring offset uses `hero-bg`
- [ ] "All complete" celebration banner unchanged
- [ ] All existing tests still pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | All visual changes to MeditateTabContent.tsx |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | GlowBackground + gradient heading + frosted cards | [COMPLETE] | 2026-04-03 | Modified: `MeditateTabContent.tsx` (GlowBackground split wrapper, gradient heading, cn() card classes with FrostedCard DNA, ring-offset-hero-bg), `MeditateLanding.test.tsx` (7 new tests + 5 preserved = 12 total). No deviations from plan. |
