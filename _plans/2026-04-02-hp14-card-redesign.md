# Implementation Plan: HP-14 — Card Redesign (Dashboard Preview + Differentiator)

**Spec:** `_specs/hp14-card-redesign.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch — do NOT create a new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-03-06, before homepage redesign series; stale for homepage values; current source files are authoritative)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/`
- Target files:
  - `frontend/src/components/homepage/DashboardPreview.tsx` (232 lines) — main component with 6 inline preview sub-components, LockOverlay, PREVIEW_MAP, and the main DashboardPreview export
  - `frontend/src/components/homepage/dashboard-preview-data.ts` (43 lines) — `PreviewCard` interface, `PREVIEW_CARDS` array (6 items), heatmap helpers, PRACTICES, FRIENDS
  - `frontend/src/components/homepage/DifferentiatorSection.tsx` (57 lines) — maps over DIFFERENTIATORS, FrostedCard wrapper
  - `frontend/src/components/homepage/differentiator-data.ts` (54 lines) — `DifferentiatorItem` interface, 6-item DIFFERENTIATORS array
- Test files:
  - `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` (294 lines, 29 tests)
  - `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` (159 lines, 19 tests)
- Shared components:
  - `frontend/src/components/homepage/FrostedCard.tsx` (38 lines) — base: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6`
  - `frontend/src/components/homepage/SectionHeading.tsx` (60 lines) — supports `topLine`/`bottomLine` 2-line treatment
  - `frontend/src/components/homepage/GlowBackground.tsx` — section wrapper with `bg-hero-bg`
- Constants: `frontend/src/constants/gradients.tsx` — `WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'`
- Hooks: `frontend/src/hooks/useScrollReveal.ts` — `useScrollReveal()`, `staggerDelay()`

### Current DashboardPreview Card Structure (what changes)

```
<FrostedCard className="h-full flex flex-col p-0 overflow-hidden">
  {/* Header — icon + title, NOT covered by lock overlay */}
  <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/[0.06]">
    <Icon className="h-4 w-4 text-white" />
    <h3 className="text-sm font-medium text-white">{card.title}</h3>
  </div>
  {/* Preview content area with lock overlay */}
  <div className="relative flex-1 px-4 pb-4 min-h-[160px] sm:min-h-[220px]">
    <div className={cn('flex h-full flex-col justify-center', centerClass)}>
      <Preview />
    </div>
    <LockOverlay />
  </div>
</FrostedCard>
```

**New structure (spec):** Preview mockup on TOP with lock overlay, text (icon + title + description) on BOTTOM in clear unblurred text. This is a complete inversion of the current layout.

### Current DashboardPreview CTA (what changes)

- Current CTA text: "All of this is free. All of it is yours."
- Current button text: "Get Started"
- New CTA text: "It's free. No catch."
- New button text: "Create a Free Account"

### Current Differentiator Card Structure

```
<FrostedCard>
  <div className="w-10 h-10 ... rounded-xl bg-white/[0.08] border border-white/[0.06] ...">
    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
  </div>
  <h3 className="text-white text-base sm:text-lg font-semibold mt-4">{item.title}</h3>
  <p className="text-white text-sm leading-relaxed mt-2">{item.description}</p>
</FrostedCard>
```

No structural changes needed for differentiator cards — only description text trimming and CSS for equal-height (`auto-rows-fr` + `h-full` + `flex-1` on description).

### Test Patterns

- Vitest + React Testing Library
- `useScrollReveal` mocked: `isVisible: true`, `staggerDelay` returns `{ transitionDelay: ... }`
- DashboardPreview wrapping: `MemoryRouter > ToastProvider > AuthModalProvider`
- DifferentiatorSection: no providers needed
- Tests assert on text content, CSS classes, DOM structure, aria attributes

### Auth Pattern

- "Create a Free Account" button: `useAuthModal().openAuthModal(undefined, 'register')` — unchanged pattern from current "Get Started" button

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Create a Free Account" CTA | Opens auth modal in register mode | Step 2 | `useAuthModal().openAuthModal(undefined, 'register')` — existing pattern, unchanged |

No new auth gates. This is a visual redesign of existing logged-out-only content.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Card background | bg | `bg-white/[0.04]` | spec |
| Card border | border | `border border-white/[0.12]` | spec (matches FrostedCard base) |
| Card radius | border-radius | `rounded-2xl` | spec (matches FrostedCard base) |
| Card overflow | overflow | `overflow-hidden` | spec |
| Preview area bg | bg | `bg-white/[0.02]` | spec |
| Preview area min-h | min-height | `min-h-[160px] sm:min-h-[180px]` | spec |
| Lock overlay bg | bg | `bg-hero-bg/50` | spec (hero-bg = `#08051A`) |
| Lock overlay blur | backdrop | `backdrop-blur-[3px]` | spec |
| Lock icon | size + color | `w-5 h-5 text-white/40` | spec |
| Lock text | styles | `text-white/50 text-xs` | spec |
| Divider | border | `border-white/[0.06]` | spec |
| Text area padding | padding | `p-4 sm:p-5` | spec |
| Card title | font | `text-white font-semibold text-sm sm:text-base` | spec |
| Card description | font | `text-white/90 text-xs sm:text-sm leading-relaxed` | spec |
| CTA button gradient | background | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `gradients.tsx:6` |
| Section bg | bg | `bg-hero-bg` (#08051A) via GlowBackground | `tailwind.config.js:22` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- SectionHeading uses `topLine`/`bottomLine` props for 2-line treatment (HP-13), with `GRADIENT_TEXT_STYLE` on bottomLine
- FrostedCard base has `p-6` — override with `p-0` when using custom internal padding zones
- Lock overlay in current codebase uses `bg-[#08051A]/60` — spec changes to `bg-hero-bg/50`; use the Tailwind token `bg-hero-bg/50` (resolves to `#08051A` at 50% opacity)
- All text on dark backgrounds upgraded to white in HP-13 pass — maintain `text-white` for card titles
- Card icons are currently `text-white` — spec introduces per-card colors (purple-400, orange-400, emerald-400, blue-400)
- FrostedCard base `bg-white/[0.06]` — spec changes card bg to `bg-white/[0.04]`; since the card no longer wraps in FrostedCard, build it custom
- Dashboard preview grid already has `auto-rows-fr` (from HP card sizing fix)
- Differentiator section grid does NOT have `auto-rows-fr` currently — needs to be added
- DifferentiatorSection currently uses `max-w-5xl`, DashboardPreview uses `max-w-6xl` — preserve these
- Current lock icon is `h-4 w-4` — spec increases to `w-5 h-5`

---

## Shared Data Models (from Master Plan)

Not applicable — standalone homepage polish task.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | 1-column card grid, `min-h-[160px]` preview area, `p-4` text area |
| Tablet | 640-1024px | 2-column card grid, `min-h-[180px]` preview area, `p-5` text area |
| Desktop | > 1024px | 3-column card grid, same sizing as tablet |

Both Dashboard Preview and Differentiator sections follow the same responsive grid pattern.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| StatsBar → DashboardPreview | 0px (sections butt-join, internal padding handles spacing) | HP-12 verification |
| DashboardPreview → DifferentiatorSection | 0px (same) | HP-12 verification |
| Within DashboardPreview: heading → grid | `mt-12 sm:mt-16` | current DashboardPreview.tsx:174 |
| Within DashboardPreview: grid → CTA | `mt-12 sm:mt-16` | current DashboardPreview.tsx:208 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `homepage-redesign` exists and is checked out
- [x] All 6 preview sub-components (MoodInsightsPreview, StreakPreview, etc.) remain unchanged — only the card wrapper structure changes
- [x] FrostedCard component itself is NOT modified — we build a custom card structure directly in DashboardPreview.tsx
- [x] No new auth gates introduced
- [x] Design system values sourced from spec (spec is authoritative for this visual redesign)
- [x] All [UNVERIFIED] values flagged with verification methods
- [x] Prior specs (HP-1 through HP-13) are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FrostedCard vs custom card | Build custom card structure inline | Spec changes card bg from `bg-white/[0.06]` to `bg-white/[0.04]`, removes backdrop-blur on card itself, and needs two distinct zones. Custom is cleaner than overriding FrostedCard. |
| Lock overlay bg token | Use `bg-hero-bg/50` (Tailwind token) | Spec says `bg-hero-bg/50`. Current code uses `bg-[#08051A]/60`. Switching to Tailwind token is cleaner and matches spec. |
| Preview area min-height | `min-h-[160px] sm:min-h-[180px]` | Spec says `min-h-[160px] sm:min-h-[180px]`. Current is `min-h-[160px] sm:min-h-[220px]`. Spec wins. |
| Streak title pluralization | "Streaks & Faith Points" (with s) | Spec explicitly calls this out |
| Card description field | Add `description` to `PreviewCard` interface | New field needed for below-preview text area |
| Card icon color field | Add `iconColor` to `PreviewCard` interface | Per-card icon colors specified in spec |
| Differentiator card wrappers | Add `h-full` to scroll-reveal wrapper and `h-full flex flex-col` to FrostedCard | Need cards to fill grid cells for equal height |

---

## Implementation Steps

### Step 1: Update dashboard-preview-data.ts — Add description and iconColor fields

**Objective:** Extend the `PreviewCard` interface with `description` and `iconColor` fields, update all 6 card entries.

**Files to create/modify:**
- `frontend/src/components/homepage/dashboard-preview-data.ts` — add fields to interface and data

**Details:**

Update the `PreviewCard` interface:
```typescript
export interface PreviewCard {
  id: string
  icon: LucideIcon
  iconColor: string  // NEW: Tailwind text color class
  title: string
  description: string  // NEW: card description text
}
```

Update `PREVIEW_CARDS` array with these values from the spec:

| id | iconColor | title (note changes) | description |
|----|-----------|------|-------------|
| mood | `text-purple-400` | Mood Insights | See how God is meeting you over time. |
| streak | `text-orange-400` | Streaks & Faith Points | Build daily habits and watch your faith grow. |
| garden | `text-emerald-400` | Growth Garden | A living illustration that grows with your journey. |
| practices | `text-purple-400` | Today's Practices | Your daily rhythm of prayer, journaling, and worship. |
| friends | `text-blue-400` | Friends | Grow together and encourage each other. |
| evening | `text-purple-400` | Evening Reflection | Wind down your day with gratitude and prayer. |

Note: "Streak & Faith Points" → "Streaks & Faith Points" (add the s).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change HEATMAP_LEVELS, getHeatmapColor, PRACTICES, or FRIENDS — these are unrelated data
- DO NOT change icon imports — they remain the same (BarChart3, Flame, Sprout, CheckSquare, Users, Moon)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| each card has iconColor and description | unit | Verify all 6 PREVIEW_CARDS entries have non-empty `iconColor` (string starting with `text-`) and `description` (non-empty string) |
| streak card title is pluralized | unit | Verify streak card title is "Streaks & Faith Points" (not "Streak & Faith Points") |

**Expected state after completion:**
- [x] `PreviewCard` interface has `iconColor` and `description` fields
- [x] All 6 cards have icon colors matching spec table
- [x] "Streaks & Faith Points" title (with s)
- [x] Existing data tests still pass (update assertions for new fields)

---

### Step 2: Restructure DashboardPreview.tsx — Preview on top, text on bottom

**Objective:** Invert the card layout so the blurred preview mockup is on top with lock overlay, and the icon + title + description are in clear text below, separated by a subtle border. Update CTA button and trust line text.

**Files to create/modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — restructure card layout, update CTA

**Details:**

**New card structure (replaces current FrostedCard usage):**

```tsx
<div className="bg-white/[0.04] border border-white/[0.12] rounded-2xl overflow-hidden h-full flex flex-col">
  {/* Top area — Preview mockup with lock overlay */}
  <div className="relative bg-white/[0.02] min-h-[160px] sm:min-h-[180px] px-4 py-4">
    <div className={cn(
      'flex h-full flex-col justify-center',
      ['mood', 'streak', 'garden', 'evening'].includes(card.id) && 'items-center'
    )}>
      <Preview />
    </div>
    <LockOverlay />
  </div>
  {/* Divider */}
  <div className="border-b border-white/[0.06]" />
  {/* Bottom area — Icon + title + description in clear text */}
  <div className="p-4 sm:p-5">
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4', card.iconColor)} aria-hidden="true" />
      <h3 className="text-white font-semibold text-sm sm:text-base">{card.title}</h3>
    </div>
    <p className="text-white/90 text-xs sm:text-sm leading-relaxed mt-2">{card.description}</p>
  </div>
</div>
```

Key changes from current:
1. **No FrostedCard wrapper** — custom card with `bg-white/[0.04]` (spec) instead of `bg-white/[0.06]` (FrostedCard default)
2. **Preview area on TOP** — was on bottom, now first child
3. **Lock overlay** scoped to preview area via `relative` on preview container
4. **Divider** — `border-b border-white/[0.06]` between preview and text (was between header and preview)
5. **Text area on BOTTOM** — icon, title, and description in clear (unblurred) text
6. **Icon colors** — now `card.iconColor` (per-card color) instead of `text-white`
7. **No backdrop-blur on card** — blur is only on lock overlay

**LockOverlay update:**
```tsx
function LockOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[3px] bg-hero-bg/50">
      <Lock className="w-5 h-5 text-white/40" aria-hidden="true" />
      <span className="text-xs text-white/50">Create account to unlock</span>
    </div>
  )
}
```

Changes: `bg-[#08051A]/60` → `bg-hero-bg/50`, icon `h-4 w-4` → `w-5 h-5`.

**CTA update:**
- Trust line: `"All of this is free. All of it is yours."` → `"It's free. No catch."`
- Button text: `"Get Started"` → `"Create a Free Account"`

**Remove FrostedCard import** if it's no longer used in this file.

**Grid remains unchanged:** `grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 auto-rows-fr`

**Auth gating:**
- "Create a Free Account" button: `useAuthModal().openAuthModal(undefined, 'register')` — same pattern as current "Get Started" button

**Responsive behavior (UI steps only):**
- Desktop (1440px): 3-column grid, `min-h-[180px]` preview, `p-5` text area
- Tablet (768px): 2-column grid, same as desktop sizing
- Mobile (375px): 1-column grid, `min-h-[160px]` preview, `p-4` text area

**Guardrails (DO NOT):**
- DO NOT modify the preview sub-components (MoodInsightsPreview, StreakPreview, etc.) — only the card wrapper changes
- DO NOT change the GlowBackground, SectionHeading, or scroll-reveal logic
- DO NOT remove `overflow-hidden` — it clips preview area corners
- DO NOT add `backdrop-blur` to the card itself — blur is only on the lock overlay
- DO NOT change the grid layout classes — they are already correct from HP card sizing fix
- DO NOT change `PREVIEW_MAP` or the preview sub-component implementations

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders all 6 card descriptions | integration | Verify each card's `description` text renders in the DOM |
| icon colors match per-card values | integration | Verify each card icon has the correct color class (e.g., mood icon has `text-purple-400`) |
| CTA button says "Create a Free Account" | integration | Button role + accessible name changed from "Get Started" |
| trust line says "It's free. No catch." | integration | Trust text updated |
| preview area is first child within card | integration | Preview container (with `bg-white/[0.02]`) is first child, text area is after divider |
| lock overlay scoped to preview area | integration | Lock overlay's parent has `relative` and `bg-white/[0.02]` |
| divider separates preview from text | integration | `border-b border-white/[0.06]` divider exists between preview and text areas |
| card has custom bg not FrostedCard bg | integration | Card has `bg-white/[0.04]` (not `bg-white/[0.06]`) |

**Expected state after completion:**
- [x] Preview mockup is on TOP of each card with lock overlay
- [x] Title + colored icon + description are BELOW in clear text
- [x] Divider separates preview from text
- [x] CTA button says "Create a Free Account"
- [x] Trust line says "It's free. No catch."
- [x] Lock overlay uses `bg-hero-bg/50` and `w-5 h-5` icon
- [x] Cards use `bg-white/[0.04]` (not FrostedCard's `bg-white/[0.06]`)

---

### Step 3: Update DashboardPreview tests

**Objective:** Update all 29 existing tests to match the new card structure, CTA text, and add new tests for descriptions, icon colors, and card layout.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — update existing tests, add new tests

**Details:**

**Tests that need updating (existing):**

1. `each card has id, icon, and title` → extend to check `iconColor` and `description`
2. `renders CTA text "All of this is free"` → change to check `"It's free. No catch."`
3. `renders "Get Started" button` → change to check `"Create a Free Account"`
4. `Get Started button triggers auth modal` → update button query to `"Create a Free Account"`
5. `CTA button has full-width mobile class` → update button query
6. `CTA button has white glow shadow` → update button query
7. `preview content areas have responsive min-height` → update selector from `min-h-\\[160px\\]` (current class) — the preview areas now use `min-h-[160px]` on the outer `relative bg-white/[0.02]` container, not a `flex-1` child
8. `header rows have bottom border divider` → update: divider is now between preview and text, not in header. Query for `border-b.border-white\\/\\[0\\.06\\]` on standalone divider `<div>` elements
9. `centered preview cards have items-center` → same logic, different parent structure
10. `left-aligned cards lack items-center` → same logic
11. `lock overlays are scoped to preview area (not header)` → update: lock overlay parent now has `bg-white/[0.02]` instead of `flex-1`

**New tests to add:**

| Test | Type | Description |
|------|------|-------------|
| renders all 6 card descriptions | integration | Each card's description from PREVIEW_CARDS renders |
| icon has per-card color class | integration | Mood icon has `text-purple-400`, streak has `text-orange-400`, etc. |
| preview area has bg-white/[0.02] | integration | All 6 preview containers have the correct background |
| cards use bg-white/[0.04] | integration | Custom card bg, not FrostedCard default |
| streak card title includes "Streaks" (plural) | integration | Verify "Streaks & Faith Points" not "Streak & Faith Points" |

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove tests for preview sub-component content (heatmap, streak number, garden SVG, etc.) — those sub-components are unchanged
- DO NOT break the `renderDashboardPreview()` helper or its provider wrapping
- DO NOT change the `useScrollReveal` mock

**Test specifications:** N/A — this step IS the test update.

**Expected state after completion:**
- [x] All updated tests pass
- [x] No tests reference "Get Started" or "All of this is free"
- [x] New tests for descriptions, icon colors, card bg, and title pluralization

---

### Step 4: Update differentiator-data.ts — Trim descriptions

**Objective:** Replace the 6 differentiator card descriptions with the shorter, uniform-length versions from the spec.

**Files to create/modify:**
- `frontend/src/components/homepage/differentiator-data.ts` — update description strings

**Details:**

Replace descriptions with spec values:

| # | Title | New Description |
|---|-------|-----------------|
| 1 | Your time is sacred | No ads. No sponsored content. No interruptions. When you open Worship Room, the only voice is yours. |
| 2 | Your conversations stay private | We don't sell your data or share your journal entries with anyone. Your spiritual life is private. Period. |
| 3 | Honest from day one | No hidden fees, no auto-renewing traps, no paywall that appears after you've invested your heart. |
| 4 | We'll never guilt you for missing a day | Life happens. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we welcome you back. |
| 5 | AI That Meets You Where You Are | Share how you're feeling and receive a personalized prayer. Ask questions about Scripture. Journal and receive reflections. |
| 6 | A safe space when it matters most | If you're in crisis, we connect you with the 988 Lifeline, Crisis Text Line, and SAMHSA. Help is always here. |

Note: Card 4 description is unchanged from current. All others are shortened.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change icons or titles — only descriptions
- DO NOT change the interface definition

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| descriptions are uniform length | unit | Verify all 6 descriptions are under 140 characters (approximate 2-line target) |

**Expected state after completion:**
- [x] All 6 descriptions match spec exactly
- [x] All descriptions are shorter and more uniform in length

---

### Step 5: Update DifferentiatorSection.tsx — Equal-height cards

**Objective:** Add CSS for equal-height cards: `auto-rows-fr` on grid, `h-full` on scroll-reveal wrappers, `h-full flex flex-col` on FrostedCard, `flex-1` on description paragraph.

**Files to create/modify:**
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — grid + card CSS updates

**Details:**

**Grid update (line 26):**
```
Current: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16
New:     grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 auto-rows-fr
```

**Scroll-reveal wrapper update (line 33):**
```
Current: className={cn('scroll-reveal', isVisible && 'is-visible')}
New:     className={cn('scroll-reveal h-full', isVisible && 'is-visible')}
```

**FrostedCard update (line 35):**
```
Current: <FrostedCard>
New:     <FrostedCard className="h-full flex flex-col">
```

**Description paragraph update (line 45):**
```
Current: <p className="text-white text-sm leading-relaxed mt-2">
New:     <p className="text-white text-sm leading-relaxed mt-2 flex-1">
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): 3-column grid, all cards same height within each row
- Tablet (768px): 2-column grid, same equal-height behavior
- Mobile (375px): 1-column grid (all cards naturally sized since single column)

**Guardrails (DO NOT):**
- DO NOT change icon container styling, title styling, or section heading
- DO NOT change the `max-w-5xl` container width
- DO NOT change description text color (already `text-white` per HP-13)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| grid has auto-rows-fr | integration | Grid container class includes `auto-rows-fr` |
| scroll-reveal wrappers have h-full | integration | Each of the 6 card wrappers has `h-full` class |
| FrostedCard has h-full and flex | integration | Each FrostedCard inside the grid has `h-full` and `flex-col` |
| description paragraph has flex-1 | integration | Description `<p>` elements have `flex-1` class |

**Expected state after completion:**
- [x] Cards render at equal height within each grid row
- [x] Description text is vertically spaced with `flex-1`
- [x] Grid uses `auto-rows-fr`

---

### Step 6: Update DifferentiatorSection tests

**Objective:** Update existing tests for new description text and add tests for equal-height CSS.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` — update and add tests

**Details:**

**Tests that need updating:**

1. `renders all 6 card descriptions` → descriptions changed, assertions must match new text
2. `renders updated card descriptions per HP-9 spec` → update to match HP-14 trimmed text. The assertion for `AI woven through every experience` no longer exists in the new description. Replace with assertions for the new shorter text.

**New tests to add:**

| Test | Type | Description |
|------|------|-------------|
| grid has auto-rows-fr | integration | Grid container includes `auto-rows-fr` |
| card wrappers have h-full | integration | Scroll-reveal wrappers have `h-full` class |
| FrostedCard has h-full and flex-col | integration | Each card container has `h-full` and `flex-col` |
| description has flex-1 | integration | Description paragraph has `flex-1` class |

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove tests for icon containers, aria-hidden, GlowBackground, stagger delays — those are unchanged
- DO NOT change the `useScrollReveal` mock

**Test specifications:** N/A — this step IS the test update.

**Expected state after completion:**
- [x] All updated tests pass with new description text
- [x] Equal-height CSS tests pass
- [x] No references to old long descriptions

---

### Step 7: Build verification

**Objective:** Run build and full test suite to confirm everything passes.

**Files to create/modify:** None

**Details:**

Run:
1. `cd frontend && pnpm build` — expect 0 errors, 0 warnings
2. `cd frontend && pnpm test` — expect all tests pass (including updated DashboardPreview + DifferentiatorSection tests)
3. Check for TypeScript errors in modified files

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT skip the build step
- DO NOT ignore test failures — fix them before marking complete

**Test specifications:** N/A — this step IS the verification.

**Expected state after completion:**
- [x] `pnpm build` passes with 0 errors
- [x] All tests pass (0 failures)
- [x] No TypeScript errors in modified files

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update data file with descriptions and icon colors |
| 2 | 1 | Restructure card layout (consumes new data fields) |
| 3 | 2 | Update DashboardPreview tests (must match new structure) |
| 4 | — | Update differentiator descriptions (independent of Steps 1-3) |
| 5 | 4 | Update DifferentiatorSection CSS (after data is updated) |
| 6 | 5 | Update DifferentiatorSection tests (must match new CSS + text) |
| 7 | 3, 6 | Build + test verification (after all changes) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update dashboard-preview-data.ts | [COMPLETE] | 2026-04-02 | Added `iconColor` and `description` to PreviewCard interface and all 6 entries. "Streak & Faith Points" → "Streaks & Faith Points". |
| 2 | Restructure DashboardPreview.tsx | [COMPLETE] | 2026-04-02 | Inverted card layout (preview top, text bottom), custom card bg-white/[0.04], LockOverlay uses bg-hero-bg/50 + w-5 h-5, CTA → "Create a Free Account" / "It's free. No catch.", removed FrostedCard import. |
| 3 | Update DashboardPreview tests | [COMPLETE] | 2026-04-02 | Updated 11 existing tests, added 6 new tests (descriptions, icon colors, card bg, preview bg, streak plural). 43 tests passing. Fixed selector specificity for bg-white/[0.04] (heatmap squares also match). |
| 4 | Update differentiator-data.ts | [COMPLETE] | 2026-04-02 | Trimmed all 6 descriptions. Lengths: 97-123 chars (all under 140). Card 4 unchanged per plan. |
| 5 | Update DifferentiatorSection.tsx | [COMPLETE] | 2026-04-02 | Added auto-rows-fr to grid, h-full to scroll-reveal wrappers, h-full flex flex-col to FrostedCard, flex-1 to description paragraph. |
| 6 | Update DifferentiatorSection tests | [COMPLETE] | 2026-04-02 | Updated HP-9 description test to HP-14 text, added 5 new tests (auto-rows-fr, h-full wrappers, flex-col cards, flex-1 descriptions, length uniformity). 23 tests passing. |
| 7 | Build verification | [COMPLETE] | 2026-04-02 | Build passes (0 errors, 0 warnings). 5488 tests pass / 0 fail across 475 test files. No TypeScript errors. |
