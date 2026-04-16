# Implementation Plan: Daily Hub StarField + Horizon Glow Aesthetic

**Spec:** `_specs/daily-hub-starfield-horizon-glow.md`
**Date:** 2026-04-07
**Branch:** `claude/feature/daily-hub-starfield-horizon-glow`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This feature replaces per-section `GlowBackground` wrappers on the Daily Hub with two new root-level decorative components (`StarField` + `HorizonGlow`) that span the entire page.

**Files to modify:**

1. **`frontend/src/pages/DailyHub.tsx`** (355 lines) — the page shell. Currently imports `GlowBackground` for hero section. Must: add `relative overflow-hidden` to root div, mount `StarField` + `HorizonGlow` as first children, remove hero `GlowBackground` wrapper, add `relative z-10` to hero, tab bar, tab panels, and SongPickSection.
2. **`frontend/src/components/daily/DevotionalTabContent.tsx`** (~351 lines) — wraps content in `<GlowBackground variant="center" glowOpacity={0.18}>`. Replace with plain `<div>`.
3. **`frontend/src/components/daily/PrayTabContent.tsx`** (~260 lines) — wraps content in `<GlowBackground variant="center" glowOpacity={0.30}>`. Replace with plain `<div>`. Note: `GuidedPrayerPlayer` renders as a **sibling** of GlowBackground via `<>...</>` fragment — this structure must be preserved.
4. **`frontend/src/components/daily/JournalTabContent.tsx`** (~327 lines) — wraps content in `<GlowBackground variant="center" glowOpacity={0.30}>`. Replace with plain `<div>`.
5. **`frontend/src/components/daily/MeditateTabContent.tsx`** (~149 lines) — wraps content in `<GlowBackground variant="split" glowOpacity={0.30}>`. Replace with plain `<div>`.
6. **`frontend/src/components/SongPickSection.tsx`** (~80 lines) — wraps content in `<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">`. Replace with plain `<div>`.

**Files to create:**

7. **`frontend/src/components/daily/StarField.tsx`** — ~110 hardcoded star positions, `aria-hidden`, `pointer-events-none`
8. **`frontend/src/components/daily/HorizonGlow.tsx`** — 5 glow spots at vertical percentages, `aria-hidden`, `pointer-events-none`

**Test files to modify:**

9. **`frontend/src/pages/__tests__/DailyHub.test.tsx`** — update/replace hero glow-orb test
10. **`frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`** — update glow-orb tests
11. **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** — update glow-orb tests + GuidedPrayerPlayer sibling test
12. **`frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`** — update glow-orb tests
13. **`frontend/src/pages/__tests__/MeditateLanding.test.tsx`** — update glow-orb test
14. **`frontend/src/components/__tests__/SongPickSection.test.tsx`** — update glow-orb test

**Test files to create:**

15. **`frontend/src/components/daily/__tests__/StarField.test.tsx`**
16. **`frontend/src/components/daily/__tests__/HorizonGlow.test.tsx`**

**Component hierarchy (after change):**

```
DailyHub root div (relative overflow-hidden bg-hero-bg)
├── StarField (absolute, z-0, aria-hidden)
├── HorizonGlow (absolute, z-0, aria-hidden)
├── Navbar (transparent) — inherits relative z-10 from content wrapper
├── main#main-content
│   ├── Hero section (relative z-10 — NO GlowBackground)
│   ├── Sentinel div
│   ├── Sticky tab bar (already z-40, add relative z-10 to parent)
│   ├── Tab panels (relative z-10)
│   │   ├── DevotionalTabContent (transparent — NO GlowBackground)
│   │   ├── PrayTabContent (transparent — NO GlowBackground)
│   │   ├── JournalTabContent (transparent — NO GlowBackground)
│   │   └── MeditateTabContent (transparent — NO GlowBackground)
│   └── SongPickSection (transparent — NO GlowBackground)
├── SiteFooter
└── TooltipCallout
```

**Key patterns:**

- `GlowBackground` wraps children in `<div className="relative overflow-clip bg-hero-bg">` with glow orbs at z-0 and content at z-10. When removed, the inner content div (`relative z-10`) also goes away — content must get its own `relative z-10` if needed.
- All tab content uses `!bg-transparent` on GlowBackground (overriding `bg-hero-bg`), so the root div's `bg-hero-bg` already provides the background.
- `GlowBackground.tsx` is NOT modified (spec requirement).
- PrayTabContent uses a React fragment `<>` to render GlowBackground and GuidedPrayerPlayer as siblings. When GlowBackground is removed, the fragment wrapping pattern changes.
- BackgroundSquiggle is NOT present in any tab content (already removed in prior work; negative tests confirm this). No squiggle changes needed.

**Test patterns (from existing tests):**

- Provider wrapping: `MemoryRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider` → component
- GlowBackground tests assert `screen.getAllByTestId('glow-orb')` — these assertions must be updated/removed since glow-orb elements will no longer exist within these components
- DailyHub test uses `document.querySelector('[data-testid="glow-orb"]')` for hero glow test

---

## Auth Gating Checklist

No auth gating required — this is purely decorative with no interactive elements.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — purely decorative | N/A | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| DailyHub root | background | `bg-hero-bg` (#08051A) | design-system.md |
| StarField dots | color | `bg-white` (#FFFFFF) | spec |
| StarField dots | size | 1-2px (`w-px h-px` or `w-0.5 h-0.5`) | spec |
| StarField dots | opacity | 0.3-0.55 | spec |
| StarField dots | shape | `rounded-full` | spec |
| StarField dots | count | ~110 | spec |
| HorizonGlow spot 1 | color | `rgb(139, 92, 246)` (primary-lt) | spec |
| HorizonGlow spot 1 | opacity | 0.22, position top 5%, left 50% | spec |
| HorizonGlow spot 2 | color | `rgb(186, 156, 255)` (light lavender) | spec |
| HorizonGlow spot 2 | opacity | 0.18, position top 15%, left 30% | spec |
| HorizonGlow spot 3 | color | `rgb(139, 92, 246)` | spec |
| HorizonGlow spot 3 | opacity | 0.25, position top 35%, left 65% | spec |
| HorizonGlow spot 4 | color | `rgb(168, 130, 255)` (medium lavender) | spec |
| HorizonGlow spot 4 | opacity | 0.20, position top 60%, left 40% | spec |
| HorizonGlow spot 5 | color | `rgb(139, 92, 246)` | spec |
| HorizonGlow spot 5 | opacity | 0.18, position top 85%, left 55% | spec |
| HorizonGlow spots | blur | `blur-[100px]` to `blur-[120px]` | spec |
| HorizonGlow spots | size | 400-600px width/height | spec |
| HorizonGlow spots | transform | `translate(-50%, -50%)` (center anchor) | spec |
| Content z-index | z-layer | `relative z-10` | spec |
| Tab content containers | padding/width | Keep existing: `mx-auto max-w-2xl px-4 py-10 sm:py-14` | codebase inspection (PrayTabContent:202, JournalTabContent:254, MeditateTabContent:60, DevotionalTabContent:154) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- GlowBackground.tsx is NOT modified — homepage and all other pages continue to use it unchanged
- Every live consumer of GlowBackground on Daily Hub passes `className="!bg-transparent"` — the root `bg-hero-bg` provides the background, not GlowBackground
- All tab content uses `max-w-2xl` container width (Devotional, Pray inner, Journal, Meditate). Pray GuidedPrayerSection uses `max-w-4xl`.
- `overflow-hidden` on root div clips stars/glows at edges — no horizontal scrollbar
- Stars use deterministic positions (hardcoded array) — no Math.random(), no re-randomization on render
- HorizonGlow colors match the project palette: `rgb(139, 92, 246)` = primary-lt, `rgb(168, 130, 255)` = medium lavender, `rgb(186, 156, 255)` = light lavender
- PrayTabContent renders GuidedPrayerPlayer as a sibling of the main content via a React fragment — when removing GlowBackground wrapper, preserve this sibling relationship
- `data-testid="glow-orb"` is the GlowBackground test hook — after this change, glow-orb elements should NOT exist inside tab content components or DailyHub hero
- DailyHub root already has `bg-hero-bg` in its className; add `relative overflow-hidden` but keep `min-h-screen`

---

## Shared Data Models (from Master Plan)

N/A — standalone feature with no data models or localStorage usage.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Stars at same percentage positions (denser on smaller viewport). Glow spots sized in pixels — appear proportionally larger (intentional). `overflow-hidden` clips edges. |
| Tablet | 768px | Stars and glows scale proportionally via percentage positioning. No layout changes. |
| Desktop | 1440px | Full intended experience. Stars well-distributed, glows soft and atmospheric. |

No elements stack, hide, or resize between breakpoints. This is a background layer.

---

## Vertical Rhythm

N/A — this feature does not change any content spacing. All existing padding/margin values on tab content containers are preserved exactly.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `GlowBackground.tsx` will NOT be modified
- [x] Homepage remains visually unchanged (no StarField or HorizonGlow there)
- [x] BackgroundSquiggle is already absent from all tab content (confirmed by negative tests)
- [x] All auth-gated actions from the spec are accounted for (none — purely decorative)
- [x] Design system values verified from spec and codebase inspection
- [x] No [UNVERIFIED] values — all positions/colors/opacities specified in the spec
- [x] No master plan dependencies

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Star position generation | Hardcoded array of ~110 `{top, left, size, opacity}` objects | Deterministic = no re-randomization on render, React can skip re-renders |
| Star sizes (1px vs 2px) | Mix of `w-px h-px` and `w-0.5 h-0.5` in the array | Spec says 1-2px; 0.5 in Tailwind = 2px, px = 1px |
| HorizonGlow position values | Use spec's 5%, 15%, 35%, 60%, 85% vertical positions | Spec provides exact values for bridging section transitions |
| PrayTabContent fragment structure | After removing GlowBackground, use a plain `<div>` for the content wrapper and keep `GuidedPrayerPlayer` outside it via the existing fragment | Preserves the structural invariant that GuidedPrayerPlayer is NOT inside the overflow-clip wrapper |
| DevotionalTabContent GlowBackground opacity was 0.18 (lower than others at 0.30) | Remove entirely regardless — unified StarField+HorizonGlow replaces all per-section glows | Spec replaces the per-section approach entirely |
| DailyHub root `overflow-hidden` vs `overflow-clip` | Use `overflow-hidden` per spec | GlowBackground uses `overflow-clip` internally, but the root div uses `overflow-hidden` which is the standard Tailwind class |
| Navbar `transparent` prop | Keep as-is | Navbar already renders with transparent background on Daily Hub; StarField/HorizonGlow behind it adds atmosphere |
| SiteFooter background | SiteFooter has its own `bg-hero-dark` background | Footer renders on top of StarField/HorizonGlow but its solid dark background covers the decorative layers naturally |

---

## Implementation Steps

### Step 1: Create StarField component

**Objective:** Create a deterministic star field of ~110 small white dots with hardcoded positions.

**Files to create:**
- `frontend/src/components/daily/StarField.tsx`

**Details:**

Create a component that renders ~110 absolutely-positioned white dots across the full page:

```tsx
// Hardcoded array of star positions — deterministic, no randomization
const STARS: Array<{ top: number; left: number; size: number; opacity: number }> = [
  // ~110 entries with:
  // top: 0-100 (percentage)
  // left: 0-100 (percentage)
  // size: 1 or 2 (pixels — 1 = w-px h-px, 2 = w-0.5 h-0.5)
  // opacity: 0.3-0.55
]

export function StarField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {STARS.map((star, i) => (
        <div
          key={i}
          className={cn(
            'absolute rounded-full bg-white',
            star.size === 1 ? 'h-px w-px' : 'h-0.5 w-0.5',
          )}
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  )
}
```

Generate the ~110 star positions with good visual distribution:
- Spread across all vertical ranges (0-100%)
- Spread across all horizontal ranges (0-100%)
- Mix of 1px and 2px sizes (roughly 70% 1px, 30% 2px)
- Opacities between 0.3 and 0.55

**Auth gating:** N/A — decorative only

**Responsive behavior:**
- Desktop (1440px): Stars well-distributed across wide viewport
- Tablet (768px): Same percentage positions, slightly denser appearance
- Mobile (375px): Same percentage positions, denser appearance (intentional per spec)

**Guardrails (DO NOT):**
- DO NOT use Math.random() or any non-deterministic positioning
- DO NOT add animation or twinkling effects (static only per spec)
- DO NOT use `aria-hidden` on individual dots — put it on the parent container
- DO NOT import or depend on any other component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders ~110 star dots | unit | Container has approximately 110 child divs |
| container has aria-hidden="true" | unit | Accessibility: decorative-only |
| container has pointer-events-none | unit | Non-interactive |
| stars have bg-white class | unit | White color on all dots |
| stars have rounded-full class | unit | Circular shape |
| stars use percentage positioning | unit | style.top and style.left contain `%` |
| no star has opacity below 0.3 or above 0.55 | unit | Spec range enforcement |

**Expected state after completion:**
- [ ] `StarField.tsx` exists in `frontend/src/components/daily/`
- [ ] Component renders ~110 white dots with deterministic positions
- [ ] All 7 tests pass

---

### Step 2: Create HorizonGlow component

**Objective:** Create 5 large soft purple/lavender glow spots positioned at strategic vertical percentages.

**Files to create:**
- `frontend/src/components/daily/HorizonGlow.tsx`

**Details:**

```tsx
const GLOWS = [
  { top: 5, left: 50, width: 500, height: 400, blur: 120, color: '139, 92, 246', opacity: 0.22 },
  { top: 15, left: 30, width: 450, height: 350, blur: 110, color: '186, 156, 255', opacity: 0.18 },
  { top: 35, left: 65, width: 550, height: 450, blur: 120, color: '139, 92, 246', opacity: 0.25 },
  { top: 60, left: 40, width: 500, height: 400, blur: 100, color: '168, 130, 255', opacity: 0.20 },
  { top: 85, left: 55, width: 480, height: 380, blur: 110, color: '139, 92, 246', opacity: 0.18 },
]

export function HorizonGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {GLOWS.map((glow, i) => (
        <div
          key={i}
          className="absolute will-change-transform"
          style={{
            top: `${glow.top}%`,
            left: `${glow.left}%`,
            width: `${glow.width}px`,
            height: `${glow.height}px`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(${glow.color}, ${glow.opacity}) 0%, transparent 70%)`,
            filter: `blur(${glow.blur}px)`,
          }}
        />
      ))}
    </div>
  )
}
```

Colors per spec:
- Primary purple: `rgb(139, 92, 246)` — spots 1, 3, 5
- Light lavender: `rgb(186, 156, 255)` — spot 2
- Medium lavender: `rgb(168, 130, 255)` — spot 4

**Auth gating:** N/A — decorative only

**Responsive behavior:**
- Desktop (1440px): Glows appear soft and atmospheric at section transitions
- Tablet (768px): Pixel-sized glows appear proportionally — no resize needed
- Mobile (375px): Glows appear proportionally larger (intentional per spec) — immersive on small viewport

**Guardrails (DO NOT):**
- DO NOT add animation to glows (static only per spec)
- DO NOT reduce glow sizes on mobile (spec explicitly says this is out of scope)
- DO NOT use `aria-hidden` on individual glow divs — put it on the parent container

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders exactly 5 glow spots | unit | 5 child divs inside container |
| container has aria-hidden="true" | unit | Accessibility: decorative-only |
| container has pointer-events-none | unit | Non-interactive |
| glow spots positioned at strategic vertical percentages | unit | style.top includes 5%, 15%, 35%, 60%, 85% |
| glow spots use radial-gradient backgrounds | unit | style.background contains `radial-gradient` |
| glow spots use translate(-50%, -50%) centering | unit | style.transform contains `translate(-50%, -50%)` |
| glow spots use blur filter | unit | style.filter contains `blur` |

**Expected state after completion:**
- [ ] `HorizonGlow.tsx` exists in `frontend/src/components/daily/`
- [ ] Component renders 5 glow spots at specified positions
- [ ] All 7 tests pass

---

### Step 3: Integrate StarField + HorizonGlow into DailyHub and remove hero GlowBackground

**Objective:** Mount StarField and HorizonGlow as root-level decorative layers in DailyHub, remove the hero's GlowBackground wrapper, and add z-10 to content sections.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx`

**Details:**

1. **Add imports:**
   ```tsx
   import { StarField } from '@/components/daily/StarField'
   import { HorizonGlow } from '@/components/daily/HorizonGlow'
   ```

2. **Remove import:**
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

3. **Update root div classes** (line 183):
   - Current: `className="flex min-h-screen flex-col bg-hero-bg font-sans"`
   - New: `className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans"`

4. **Mount StarField + HorizonGlow as first children** of the root div (before the `<SEO>` component):
   ```tsx
   <StarField />
   <HorizonGlow />
   ```

5. **Unwrap hero section from GlowBackground** (lines 195-209):
   - Remove `<GlowBackground variant="center">` opening tag (line 195)
   - Remove `</GlowBackground>` closing tag (line 209)
   - Add `relative z-10` to the hero `<section>` element (line 196) — the section already has `relative` in `flex w-full flex-col items-center...`, so add `z-10`

6. **Add `relative z-10` to tab bar wrapper** (line 215-216 area). The sticky tab bar div already has `sticky top-0 z-40` — add `relative` if not already present. The z-40 already places it above z-0 background layers.

7. **Add `relative z-10` to each tab panel wrapper** (the `<div role="tabpanel">` elements at lines 278, 292, 305, 319):
   - Add `className="relative z-10"` to each tab panel div. Currently they have no className.

8. **Add `relative z-10` wrapper to SongPickSection** (line 330):
   - Wrap `<SongPickSection />` in `<div className="relative z-10">` or add the class directly. Since SongPickSection is a component, wrap it: `<div className="relative z-10"><SongPickSection /></div>`

9. **Add `relative z-10` to SiteFooter wrapper** if needed. SiteFooter has its own background so it sits above naturally, but for safety add a wrapper: `<div className="relative z-10"><SiteFooter /></div>`

**Auth gating:** N/A

**Responsive behavior:**
- N/A: no UI impact beyond decorative layer integration

**Guardrails (DO NOT):**
- DO NOT modify `GlowBackground.tsx`
- DO NOT change tab content component props or behavior
- DO NOT remove the Navbar `transparent` prop
- DO NOT change any padding, margin, or max-width classes on content sections
- DO NOT add StarField or HorizonGlow to any other page

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DailyHub root has relative overflow-hidden bg-hero-bg | integration | Root div class assertions |
| hero section no longer has glow-orb elements | integration | `queryByTestId('glow-orb')` returns null within hero |
| StarField renders in DailyHub | integration | StarField container exists as child of root |
| HorizonGlow renders in DailyHub | integration | HorizonGlow container exists as child of root |

**Expected state after completion:**
- [ ] DailyHub renders StarField and HorizonGlow as root-level background layers
- [ ] Hero section is NOT wrapped in GlowBackground
- [ ] All content sections have `relative z-10` to sit above background layers
- [ ] No `GlowBackground` import remains in DailyHub.tsx
- [ ] Tests updated and passing

---

### Step 4: Remove GlowBackground from DevotionalTabContent

**Objective:** Replace GlowBackground wrapper with a plain div in DevotionalTabContent.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx`

**Details:**

1. **Remove import** (line 5):
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

2. **Replace GlowBackground wrapper** (line 153 and line 351):
   - Current: `<GlowBackground variant="center" glowOpacity={0.18} className="!bg-transparent">`
   - New: `<div>` (plain wrapper — no classes needed since the inner content div has all the layout classes)
   - Replace closing `</GlowBackground>` with `</div>`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any inner content classes (padding, max-width, etc.)
- DO NOT remove FrostedCard imports or usage
- DO NOT change the `{...swipeHandlers}` prop

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Remove/update "wraps content in GlowBackground with glow orbs" test | unit | glow-orb assertion no longer valid — remove or replace with "renders without GlowBackground" |
| Remove/update "glow orb uses reduced opacity (0.18)" test | unit | No longer applicable |
| Existing devotional content tests still pass | unit | Content rendering unchanged |

**Expected state after completion:**
- [ ] No GlowBackground import in DevotionalTabContent.tsx
- [ ] Content renders identically (same padding, max-width, text)
- [ ] Updated tests pass

---

### Step 5: Remove GlowBackground from PrayTabContent

**Objective:** Replace GlowBackground wrapper with a plain div in PrayTabContent, preserving the GuidedPrayerPlayer sibling relationship.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx`

**Details:**

1. **Remove import** (line 3):
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

2. **Replace GlowBackground wrapper** (lines 201-246):
   - Current structure:
     ```tsx
     <>
       <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
         <div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
           {/* ... prayer content ... */}
         </div>
         <div className="mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14">
           <GuidedPrayerSection ... />
         </div>
       </GlowBackground>
       {/* GuidedPrayerPlayer (sibling, not inside GlowBackground) */}
       {activeGuidedSession && <GuidedPrayerPlayer ... />}
     </>
     ```
   - New structure:
     ```tsx
     <>
       <div>
         <div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
           {/* ... prayer content ... */}
         </div>
         <div className="mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14">
           <GuidedPrayerSection ... />
         </div>
       </div>
       {/* GuidedPrayerPlayer (still a sibling) */}
       {activeGuidedSession && <GuidedPrayerPlayer ... />}
     </>
     ```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT move GuidedPrayerPlayer inside the content wrapper — it MUST remain a sibling (test asserts this)
- DO NOT change any inner content classes
- DO NOT change the Fragment (`<>...</>`) structure

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Remove/update "renders glow background with center variant (>= 1 orb)" test | unit | glow-orb assertion no longer valid |
| Update "GuidedPrayerPlayer renders as sibling" test | integration | Remove glow-orb/overflow-clip assertions; verify player is NOT inside the content wrapper div |
| Existing pray content tests still pass | unit | Content rendering unchanged |

**Expected state after completion:**
- [ ] No GlowBackground import in PrayTabContent.tsx
- [ ] GuidedPrayerPlayer still renders as sibling of content
- [ ] Updated tests pass

---

### Step 6: Remove GlowBackground from JournalTabContent

**Objective:** Replace GlowBackground wrapper with a plain div in JournalTabContent.

**Files to modify:**
- `frontend/src/components/daily/JournalTabContent.tsx`

**Details:**

1. **Remove import** (line 4):
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

2. **Replace GlowBackground wrapper** (lines 253-325):
   - Current: `<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">`
   - New: `<div>` (plain wrapper)
   - Replace closing `</GlowBackground>` with `</div>`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any inner content classes
- DO NOT remove FeatureEmptyState or SavedEntriesList

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Remove/update "renders glow background with center variant (>= 1 orb)" test | unit | glow-orb assertion no longer valid |
| Update "empty state renders inside GlowBackground wrapper" test | unit | Remove glow-orb/overflow-clip assertions; verify empty state renders in the component |
| Update "saved entries list renders inside GlowBackground wrapper" test | unit | Remove glow-orb/overflow-clip assertions; verify saved entries render in the component |
| Existing journal content tests still pass | unit | Content rendering unchanged |

**Expected state after completion:**
- [ ] No GlowBackground import in JournalTabContent.tsx
- [ ] Updated tests pass

---

### Step 7: Remove GlowBackground from MeditateTabContent

**Objective:** Replace GlowBackground wrapper with a plain div in MeditateTabContent.

**Files to modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx`

**Details:**

1. **Remove import** (line 11):
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

2. **Replace GlowBackground wrapper** (lines 59-147):
   - Current: `<GlowBackground variant="split" glowOpacity={0.30} className="!bg-transparent">`
   - New: `<div>` (plain wrapper)
   - Replace closing `</GlowBackground>` with `</div>`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change meditation card classes or grid layout
- DO NOT change AmbientSoundPill placement

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update "renders glow background with split variant" test in MeditateLanding.test.tsx | unit | Remove glow-orb assertion (was checking for >= 2 orbs) |
| Existing meditation content tests still pass | unit | Content rendering unchanged |

**Expected state after completion:**
- [ ] No GlowBackground import in MeditateTabContent.tsx
- [ ] Updated tests pass

---

### Step 8: Remove GlowBackground from SongPickSection

**Objective:** Replace GlowBackground wrapper with a plain div in SongPickSection.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx`

**Details:**

1. **Remove import** (line 5):
   ```tsx
   // REMOVE: import { GlowBackground } from '@/components/homepage/GlowBackground'
   ```

2. **Replace GlowBackground wrapper** (line 19):
   - Current: `<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">`
   - New: `<div>` (plain wrapper — no classes needed since inner section has layout classes)
   - Replace closing `</GlowBackground>` with `</div>`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the section heading, Spotify iframe, or layout classes
- DO NOT change the section divider

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Remove/update "renders GlowBackground with glow orb" test | unit | glow-orb assertion no longer valid |
| Existing SongPickSection content tests still pass | unit | Iframe, heading, CTA unchanged |

**Expected state after completion:**
- [ ] No GlowBackground import in SongPickSection.tsx
- [ ] Updated tests pass

---

### Step 9: Run full test suite and verify

**Objective:** Ensure all tests pass and no regressions exist.

**Files to modify:** None — verification only

**Details:**

1. Run `pnpm test` to execute the full test suite
2. Run `pnpm build` to verify TypeScript compilation succeeds
3. Run `pnpm lint` to check for unused imports (GlowBackground should be absent from all modified files)

**Verification checklist:**
- No `GlowBackground` import in: DailyHub.tsx, DevotionalTabContent.tsx, PrayTabContent.tsx, JournalTabContent.tsx, MeditateTabContent.tsx, SongPickSection.tsx
- `GlowBackground.tsx` file is completely untouched (verify via `git diff frontend/src/components/homepage/GlowBackground.tsx` returns empty)
- All existing tests pass
- No new TypeScript errors
- No new lint errors from unused imports

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any files to fix issues — if tests fail, investigate and fix in the appropriate step

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | integration | All ~4862+ tests pass |
| Build check | build | `pnpm build` exits 0 |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No unused GlowBackground imports
- [ ] GlowBackground.tsx unchanged

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create StarField component |
| 2 | — | Create HorizonGlow component |
| 3 | 1, 2 | Integrate into DailyHub + remove hero GlowBackground |
| 4 | — | Remove GlowBackground from DevotionalTabContent |
| 5 | — | Remove GlowBackground from PrayTabContent |
| 6 | — | Remove GlowBackground from JournalTabContent |
| 7 | — | Remove GlowBackground from MeditateTabContent |
| 8 | — | Remove GlowBackground from SongPickSection |
| 9 | 1-8 | Run full test suite and verify |

Steps 1-2 can execute in parallel. Steps 4-8 can execute in parallel (independent files). Step 3 requires 1+2. Step 9 requires all.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create StarField component | [COMPLETE] | 2026-04-07 | Created `StarField.tsx` with 110 hardcoded stars + 7 tests passing |
| 2 | Create HorizonGlow component | [COMPLETE] | 2026-04-07 | Created `HorizonGlow.tsx` with 5 glow spots + 7 tests passing |
| 3 | Integrate into DailyHub + remove hero GlowBackground | [COMPLETE] | 2026-04-07 | StarField+HorizonGlow mounted as root children, hero unwrapped from GlowBackground, z-10 on all content sections. 4 new tests pass. 4 pre-existing Journal heading test failures (heading removed in prior work) unrelated to this change. |
| 4 | Remove GlowBackground from DevotionalTabContent | [COMPLETE] | 2026-04-07 | Removed import + replaced wrapper with `<div>`. 2 updated tests pass. 3 pre-existing failures (Meditate link tests). |
| 5 | Remove GlowBackground from PrayTabContent | [COMPLETE] | 2026-04-07 | Removed import + replaced wrapper with `<div>`, preserved fragment/sibling structure. 2 updated tests pass. |
| 6 | Remove GlowBackground from JournalTabContent | [COMPLETE] | 2026-04-07 | Removed import + replaced wrapper with `<div>`. 3 updated tests pass. 4 pre-existing heading failures. |
| 7 | Remove GlowBackground from MeditateTabContent | [COMPLETE] | 2026-04-07 | Removed import + replaced wrapper with `<div>`. 1 updated test passes. 5 pre-existing heading failures. |
| 8 | Remove GlowBackground from SongPickSection | [COMPLETE] | 2026-04-07 | Removed import + replaced wrapper with `<div>`. 1 updated test passes. 2 pre-existing heading failures. |
| 9 | Run full test suite and verify | [COMPLETE] | 2026-04-07 | 5628 tests pass, 34 pre-existing failures (none new). TypeScript compiles cleanly. No GlowBackground imports in any modified file. GlowBackground.tsx untouched. `pnpm build` has pre-existing workbox-window PWA issue. |
