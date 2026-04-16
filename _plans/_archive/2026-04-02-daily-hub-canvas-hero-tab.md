# Implementation Plan: Daily Hub Canvas, Hero & Tab Bar

**Spec:** `_specs/daily-hub-canvas-hero-tab.md`
**Date:** 2026-04-02
**Branch:** `claude/feature/daily-hub-canvas-hero-tab`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06, stale for homepage values post HP-1 through HP-15; current source files are authoritative)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Main file:** `frontend/src/pages/DailyHub.tsx` (437 lines) — entire page component with hero, tab bar, tab panels, footer sections
- **Test file:** `frontend/src/pages/__tests__/DailyHub.test.tsx` (346 lines) — 24 tests covering hero, tabs, keyboard nav, completion, URL params
- **Shared components:**
  - `frontend/src/components/homepage/GlowBackground.tsx` (83 lines) — `variant="center"` renders single glow orb at 0.15 opacity
  - `frontend/src/components/homepage/FrostedCard.tsx` (38 lines) — `bg-white/[0.06] border-white/[0.12] rounded-2xl p-6` with purple box-shadow
  - `frontend/src/constants/gradients.tsx` (32 lines) — `GRADIENT_TEXT_STYLE` provides white-to-purple gradient via `background-clip: text`
  - `frontend/src/components/PageHero.tsx` — exports `ATMOSPHERIC_HERO_BG` (radial gradient on `#0f0a1e`)

### Existing Patterns

- **Tab bar:** Sticky via IntersectionObserver sentinel (lines 108-120). WAI-ARIA tabs pattern with roving `tabIndex`, `role="tablist"/"tab"/"tabpanel"`, `aria-selected`, `aria-controls`, keyboard arrow key navigation (lines 179-195). Animated underline div (lines 336-343) tracks active tab via `translateX`.
- **Tab panels:** All 4 mounted simultaneously, CSS `hidden` attribute for show/hide (preserves React state). `motion-safe:animate-tab-fade-in` keyframe animation on each panel.
- **Completion icons:** Green `Check` icon + sr-only text when `isAuthenticated && isComplete` (lines 323-331).
- **Hero content:** Greeting heading (Caveat `font-script`, Tailwind gradient classes), verse card (manual `bg-white/5 border-white/10` styling), share button, meditation link, quiz teaser.
- **Provider wrapping in tests:** `MemoryRouter` > `ToastProvider` > `AuthModalProvider` > `DailyHub` (test lines 78-91).

### Tailwind Colors

- `hero-bg: '#08051A'` — target background (homepage standard)
- `dashboard-dark: '#0f0a1e'` — current background (being replaced)
- `primary: '#6D28D9'` — deep violet
- `primary-lt: '#8B5CF6'` — light violet (glow orb color)

---

## Auth Gating Checklist

**This spec is visuals-only. No new auth gates are introduced.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — visual changes only | No auth gating changes | N/A | N/A |

All existing auth gates (completion icons, tab content interactions) remain unchanged.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Root background | `background-color` | `#08051A` (`bg-hero-bg`) | `tailwind.config.js` line 6 |
| GlowBackground center orb | gradient | `radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)` | `GlowBackground.tsx` line 11 |
| GRADIENT_TEXT_STYLE | background-image | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `gradients.tsx` line 6 |
| FrostedCard | bg + border + shadow | `bg-white/[0.06] border-white/[0.12] rounded-2xl p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | `FrostedCard.tsx` lines 22-23 |
| Pill tab bar outer | bg + blur | `rgba(8,5,26,0.85)` + `backdrop-blur-lg` (16px) | spec (new pattern) |
| Pill tab bar inner | styling | `rounded-full border border-white/[0.12] bg-white/[0.06] p-1` | spec (new pattern) |
| Active tab pill | styling | `bg-white/[0.12] border border-white/[0.15] rounded-full shadow-[0_0_12px_rgba(139,92,246,0.15)]` | spec (new pattern) |
| Inactive tab | text + hover | `text-white/50`, hover: `text-white/80 bg-white/[0.04]` | spec |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (inline CSSProperties) for gradient text headings, not Tailwind gradient utilities
- GlowBackground center variant has 0.15 opacity — design system says 0.25-0.35 for standard sections. The component itself has NOT been updated to match. See Edge Cases for decision.
- FrostedCard has built-in `p-6` padding — add `className="sm:p-8 ..."` for responsive override, don't duplicate `p-6`
- Focus ring offsets must match page background: changing bg to `hero-bg` means `ring-offset-hero-bg` everywhere
- `hidden` attribute on tab panels = `display: none` — CSS transitions don't work across display changes
- Tab completion icons: `isAuthenticated && isComplete` guard — do not modify the logic
- All 4 tab panels are mounted simultaneously and use CSS `hidden` for show/hide — this preserves React state (textarea text, scroll position)
- Homepage sections in HP-15 moved from GlowBackground variants to custom inline glow orbs for stronger visibility. DailyHub will use GlowBackground variant="center" per spec.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual upgrade spec. No new data models or localStorage keys.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | N/A | This spec is visuals-only, no data persistence changes |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero `pt-32 pb-8`. Pill tab bar full width, `mobileLabel` text. Below 400px: icon + sr-only label. Glow orbs 300px. `text-3xl` greeting. `text-sm py-2` tab buttons. `h-4 w-4` tab icons. |
| Tablet | 768px | Hero `pt-36 pb-12`. Full labels visible. Pill bar constrained `max-w-xl`. `text-4xl` greeting. |
| Desktop | 1440px | Hero `pt-40`. Pill bar centered at `max-w-xl`. `text-base py-2.5` tab buttons. `h-5 w-5` tab icons. Glow orbs 600px. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → Hero greeting | `pt-32` mobile / `pt-36` tablet / `pt-40` desktop | DailyHub.tsx line 212 (unchanged) |
| Greeting → Verse card | `mt-6` (24px) | DailyHub.tsx line 223 (unchanged) |
| Verse card → Quiz teaser | `mt-4` (16px) | DailyHub.tsx line 262 (unchanged) |
| Hero → Tab bar | 0px (tab bar is sticky, immediately below hero) | DailyHub.tsx line 280 sentinel (unchanged) |
| Tab bar → Tab content | 0px (tab panels flush below bar) | DailyHub.tsx lines 354-407 (unchanged) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is purely visual — no logic, auth, or data changes
- [x] GlowBackground, FrostedCard, GRADIENT_TEXT_STYLE components already exist and are in the bundle
- [x] `bg-hero-bg` color exists in tailwind.config.js
- [x] All auth-gated actions from the spec are accounted for (none)
- [x] Design system values verified from codebase inspection (GlowBackground.tsx, FrostedCard.tsx, gradients.tsx, tailwind.config.js)
- [x] [UNVERIFIED] values are flagged with verification methods (pill tab bar pattern)
- [ ] GlowBackground center variant opacity (0.15) may be too low per design system (0.25-0.35 guideline) — see Edge Cases for decision

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GlowBackground opacity | Use variant="center" (0.15 opacity) as spec states, despite design system guideline of 0.25-0.35 | Spec explicitly says "GlowBackground component (center variant)". If glow is too subtle post-verification, bump opacity in GlowBackground's GLOW_CONFIG or switch to custom inline orb. |
| Tab transition approach | Remove `animate-tab-fade-in` class entirely; do NOT add `transition-opacity` | Tab panels use `hidden` attribute (`display: none`). CSS transitions cannot animate across `display` changes. Removing the keyframe animation eliminates the white flash. Instant tab switches feel responsive. |
| Greeting padding (`px-1 sm:px-2`) | Remove — it was a Caveat-specific flourish fix | The horizontal padding compensated for Caveat's cursive ascenders/descenders clipping. Inter (the new font) has standard metrics and doesn't need it. |
| FrostedCard responsive padding | Override with `className="sm:p-8 text-left"` | FrostedCard provides `p-6` by default. Current card has `p-6 sm:p-8`. Adding `sm:p-8` on the className prop extends padding at the `sm` breakpoint. `text-left` aligns content. |
| Pill tab bar `max-w-xl` | Apply to the pill-containing wrapper div, not the sticky outer div | The sticky outer div stays full-width (for the blurred background to span the viewport). The pill container inside is narrowed to `max-w-xl`. On mobile, natural padding handles width. |
| Animated underline | Remove entirely | The underline div (lines 336-343) is replaced by the active tab pill highlight. |
| Sticky tab bar background | Change from `bg-white/[0.08] backdrop-blur-xl` to `bg-hero-bg/85 backdrop-blur-lg` | Semi-transparent hero-bg background lets subtle page content bleed through at edges while maintaining readability. `backdrop-blur-lg` (16px) is sufficient. |

---

## Implementation Steps

### Step 1: Root Background + Hero GlowBackground Wrapper

**Objective:** Change the page background from `bg-dashboard-dark` to `bg-hero-bg` and wrap the hero section in a `GlowBackground` for visible purple glow orbs.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — modify root div class, wrap hero in GlowBackground, remove ATMOSPHERIC_HERO_BG

**Details:**

1. **Update imports** (top of file):
   - Add: `import { GlowBackground } from '@/components/homepage/GlowBackground'`
   - Remove: `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'`

2. **Change root div background** (line 198):
   - Old: `className="flex min-h-screen flex-col bg-dashboard-dark font-sans"`
   - New: `className="flex min-h-screen flex-col bg-hero-bg font-sans"`

3. **Wrap hero section in GlowBackground** (around lines 210-277):
   ```jsx
   <GlowBackground variant="center">
     <section
       aria-labelledby="daily-hub-heading"
       className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
     >
       {/* ...existing hero content unchanged... */}
     </section>
   </GlowBackground>
   ```
   - Remove `style={ATMOSPHERIC_HERO_BG}` from the section tag

4. **Update focus ring offset** on tab buttons (line 314):
   - Old: `focus-visible:ring-offset-dashboard-dark`
   - New: `focus-visible:ring-offset-hero-bg`

5. **Update skip link ring offset** (line 203) — if it references dashboard-dark:
   - Current: `focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg` — no dashboard-dark reference. No change needed.

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1440px): GlowBackground renders 600px glow orb behind hero
- Tablet (768px): Same orb, visible through hero padding
- Mobile (375px): 300px glow orb, smaller but still visible

**Guardrails (DO NOT):**
- DO NOT modify any tab switching logic, completion tracking, or URL param handling
- DO NOT remove the IntersectionObserver sentinel (`sentinelRef`)
- DO NOT change any ARIA attributes or keyboard navigation
- DO NOT modify `activeTabIndex` calculation or `handleTabKeyDown`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Root background is hero-bg | integration | Verify root div has class `bg-hero-bg`, does not have `bg-dashboard-dark` |
| GlowBackground renders glow orb | integration | Verify `data-testid="glow-orb"` exists in hero area |
| No ATMOSPHERIC_HERO_BG inline style | integration | Verify hero section has no inline `backgroundImage` style |

**Expected state after completion:**
- [x] Root div uses `bg-hero-bg` instead of `bg-dashboard-dark`
- [x] Hero section wrapped in `<GlowBackground variant="center">`
- [x] No `ATMOSPHERIC_HERO_BG` import or inline style
- [x] Focus ring offset updated to `ring-offset-hero-bg`
- [x] All existing functionality unchanged (tabs, completion, keyboard nav)

---

### Step 2: Greeting Gradient Text + Verse Card FrostedCard

**Objective:** Replace the Caveat font greeting with GRADIENT_TEXT_STYLE and upgrade the verse card to use the FrostedCard component.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — update h1 styling, replace verse card div

**Details:**

1. **Update imports** (top of file):
   - Add: `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'`
   - Add: `import { FrostedCard } from '@/components/homepage/FrostedCard'`

2. **Greeting heading** (line 215-220):
   - Old:
     ```jsx
     <h1
       id="daily-hub-heading"
       className="mb-1 px-1 sm:px-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
     >
     ```
   - New:
     ```jsx
     <h1
       id="daily-hub-heading"
       className="mb-1 text-3xl font-bold leading-tight sm:text-4xl"
       style={GRADIENT_TEXT_STYLE}
     >
     ```
   - Removed: `px-1 sm:px-2` (Caveat flourish fix, not needed for Inter), `font-script` (Caveat), `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` (replaced by inline style)

3. **Verse of the Day card** (lines 223-259):
   - Old:
     ```jsx
     <div className="mt-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm sm:p-8">
     ```
   - New:
     ```jsx
     <FrostedCard className="mt-6 w-full max-w-3xl text-left sm:p-8">
     ```
   - Close tag: `</div>` → `</FrostedCard>`
   - FrostedCard provides: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
   - `mt-6 w-full max-w-3xl text-left sm:p-8` passed via className prop

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1440px): `text-4xl` greeting, `sm:p-8` card padding
- Tablet (768px): `text-4xl` greeting, `sm:p-8` card padding
- Mobile (375px): `text-3xl` greeting, `p-6` card padding (FrostedCard default)

**Guardrails (DO NOT):**
- DO NOT change verse content, Link destinations, or share button behavior
- DO NOT modify the SharePanel component or its state
- DO NOT change the quiz teaser text or button
- DO NOT add `onClick` to FrostedCard (it would enable hover elevation — the verse card is not clickable as a whole)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Greeting uses gradient text, not Caveat | integration | Verify h1 does NOT have `font-script` class, DOES have GRADIENT_TEXT_STYLE inline style (backgroundImage contains gradient) |
| Verse card uses FrostedCard styling | integration | Verify verse card container has `bg-white/[0.06]` and `border-white/[0.12]` classes (FrostedCard), not `bg-white/5` and `border-white/10` |

**Expected state after completion:**
- [x] Greeting heading uses Inter font with white-to-purple gradient (GRADIENT_TEXT_STYLE)
- [x] No Caveat (`font-script`) class on heading
- [x] No horizontal padding fix (`px-1 sm:px-2`) on heading
- [x] Verse card wrapped in FrostedCard with purple box-shadow glow and `border-white/[0.12]`
- [x] All verse content, links, and share functionality unchanged

---

### Step 3: Pill Tab Bar Redesign

**Objective:** Replace the flat underline tab bar with a pill-shaped container where the active tab has a filled pill indicator.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — restructure tab bar HTML and classes

**Details:**

1. **Sticky tab bar outer container** (lines 283-288):
   - Old:
     ```jsx
     <div
       className={cn(
         'sticky top-0 z-40 bg-white/[0.08] backdrop-blur-xl transition-shadow',
         isSticky && 'shadow-md shadow-black/20',
       )}
     >
     ```
   - New:
     ```jsx
     <div
       className={cn(
         'sticky top-0 z-40 bg-hero-bg/85 backdrop-blur-lg transition-shadow',
         isSticky && 'shadow-md shadow-black/20',
       )}
     >
     ```

2. **Inner wrapper** (line 289):
   - Old:
     ```jsx
     <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-white/10">
     ```
   - New:
     ```jsx
     <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
     ```
   - Removed: `border-b border-white/10` (no bottom border in pill design)
   - Changed: `max-w-3xl` → `max-w-xl` (narrower pill container)
   - Added: `px-4 py-3 sm:py-4` (padding around the pill)

3. **Tablist container** (lines 291-294):
   - Old:
     ```jsx
     <div
       ref={tabBarRef}
       className="relative flex w-full"
       role="tablist"
       aria-label="Daily practices"
     ```
   - New:
     ```jsx
     <div
       ref={tabBarRef}
       className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
       role="tablist"
       aria-label="Daily practices"
     ```
   - Removed: `relative` (no longer needed without the underline)
   - Added: `rounded-full border border-white/[0.12] bg-white/[0.06] p-1` (pill container)

4. **Tab buttons** (lines 302-332):
   - Old class:
     ```
     'flex flex-1 items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:py-4 sm:text-base'
     isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
     ```
   - New class:
     ```
     'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base'
     isActive
       ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
       : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
     ```
   - Key changes:
     - Added: `rounded-full` for pill shape on each tab button
     - Removed: `px-4 py-3 sm:py-4` (padding handled by pill p-1 + flex)
     - Changed: `transition-colors` → `transition-all duration-200` (for bg/border/shadow transitions)
     - Active: `bg-white/[0.12] border border-white/[0.15] shadow-[0_0_12px_rgba(139,92,246,0.15)]` with `text-white`
     - Inactive: `text-white/50` (was `text-white/60`), `hover:bg-white/[0.04]`, `border border-transparent` (reserves space for active border)
   - Kept unchanged: `min-h-[44px]` touch target, `focus-visible` ring, `role="tab"`, all ARIA attributes, `tabIndex` roving, `onKeyDown`, completion icons

5. **Remove animated underline** (lines 335-343):
   - Delete the entire block:
     ```jsx
     {/* Animated underline */}
     <div
       className="absolute bottom-0 h-0.5 bg-primary transition-transform duration-200 ease-in-out"
       style={{
         width: `${100 / TABS.length}%`,
         transform: `translateX(${activeTabIndex * 100}%)`,
       }}
       aria-hidden="true"
     />
     ```

6. **Remove `activeTabIndex` variable** (line 164):
   - Delete: `const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)`
   - This was only used by the underline div. No other references.

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1440px): Pill bar centered at `max-w-xl` (576px), `text-base` labels, comfortable spacing
- Tablet (768px): Pill bar at `max-w-xl`, full labels visible
- Mobile (375px): Pill bar full width within `px-4` padding, `text-sm` labels, `mobileLabel` abbreviations. Below 400px: icon-only with sr-only label.

**Guardrails (DO NOT):**
- DO NOT modify `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving, or `handleTabKeyDown`
- DO NOT change tab click handler (`switchTab`) or `tabButtonRefs`
- DO NOT remove completion icon rendering (Check icon + sr-only text)
- DO NOT change tooltip integration (`tabBarRef`, `tabBarTooltip`, `aria-describedby`)
- DO NOT remove `min-h-[44px]` touch target

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tab bar has pill shape | integration | Verify tablist container has `rounded-full` class |
| Active tab has pill indicator | integration | Click a tab, verify it has `bg-white/[0.12]` class and purple shadow |
| Inactive tabs have muted text | integration | Verify non-active tabs have `text-white/50` |
| No animated underline | integration | Verify no `div` with `aria-hidden="true"` and `bg-primary` inside tablist |
| Focus ring offset matches hero-bg | integration | Verify tab button className contains `ring-offset-hero-bg` |

**Expected state after completion:**
- [x] Tab bar has pill-shaped container (`rounded-full border bg-white/[0.06]`)
- [x] Active tab shows filled pill with purple glow shadow
- [x] Inactive tabs show `text-white/50` with hover brightness
- [x] No animated underline div in the DOM
- [x] `activeTabIndex` variable removed (no longer needed)
- [x] All ARIA attributes, keyboard navigation, completion icons preserved
- [x] Sticky behavior + scroll shadow preserved

---

### Step 4: Tab Transition Fix

**Objective:** Remove the `animate-tab-fade-in` keyframe animation that causes a white flash during tab switches.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — remove animation class from tab panels

**Details:**

1. **Remove animation class from all 4 tab panels** (lines 360, 375, 389, 404):
   - Old: `className="motion-safe:animate-tab-fade-in"`
   - New: remove the `className` prop entirely (or set to empty string — prefer removing)
   
   The `hidden` attribute handles visibility. The keyframe animation (`content-fade-in`: opacity 0 → 1 in 200ms) restarts every time `hidden` is removed, causing a visible flash from opacity 0. Removing it makes tabs appear instantly with no flash.

   CSS `transition-opacity` is NOT added because the `hidden` attribute toggles `display: none` ↔ `display: block`, and CSS transitions cannot animate across `display` changes.

**Auth gating:** N/A — visual only.

**Responsive behavior:** N/A: no UI impact — animation removal is behavior-only.

**Guardrails (DO NOT):**
- DO NOT change the `hidden` attribute on tab panels — it's essential for the show/hide pattern
- DO NOT replace `hidden` with CSS class-based visibility (would break the state preservation pattern)
- DO NOT modify `role="tabpanel"`, `aria-labelledby`, or `tabIndex` on panels
- DO NOT remove `motion-safe:` prefix handling from other animations elsewhere in the project

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tab panels have no animation class | integration | Verify no tabpanel element has class containing `animate-tab-fade-in` |

**Expected state after completion:**
- [x] No `animate-tab-fade-in` class on any tab panel
- [x] Tab switching produces no white flash
- [x] Tab content appears instantly when selected
- [x] Tab content state (textarea values, scroll position) still preserved across switches

---

### Step 5: Test Updates

**Objective:** Update existing tests that reference old styling patterns and add new tests for the visual changes.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — modify 3 existing tests, add 8 new tests

**Details:**

1. **Update existing test: "hero title has padding for Caveat flourish fix"** (lines 100-105):
   - Rename to: `"greeting heading uses gradient text style, not Caveat font"`
   - New assertion:
     ```typescript
     it('greeting heading uses gradient text style, not Caveat font', () => {
       renderPage()
       const heading = screen.getByRole('heading', { level: 1 })
       // No Caveat font class
       expect(heading.className).not.toContain('font-script')
       // GRADIENT_TEXT_STYLE applies inline backgroundImage
       expect(heading.style.backgroundImage).toContain('linear-gradient')
       expect(heading.style.webkitBackgroundClip).toBe('text')
     })
     ```

2. **Update existing test: "VOTD banner has full-width frosted glass styling"** (lines 142-148):
   - Rename to: `"VOTD banner uses FrostedCard component"`
   - New assertion:
     ```typescript
     it('VOTD banner uses FrostedCard component', () => {
       renderPage()
       const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
       const banner = hero.querySelector('.rounded-2xl')
       expect(banner).toBeInTheDocument()
       // FrostedCard classes (not the old bg-white/5)
       expect(banner!.className).toContain('bg-white/[0.06]')
       expect(banner!.className).toContain('border-white/[0.12]')
     })
     ```

3. **Update existing test: "does NOT render VerseOfTheDayBanner"** (lines 166-175):
   - The current test checks `hero?.parentElement === tablist.closest('main')`. With GlowBackground wrapper, the hero's parent is now the z-10 div inside GlowBackground, not `<main>` directly.
   - Update to check that no standalone VerseOfTheDayBanner component exists between hero and tabs (the original intent):
     ```typescript
     it('does NOT render VerseOfTheDayBanner as separate component', () => {
       renderPage()
       // Verse is inside the hero section, not a standalone banner
       const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')
       expect(hero).toBeInTheDocument()
       // Verse text is within the hero
       const verseText = hero!.querySelector('.font-serif.italic')
       expect(verseText).toBeInTheDocument()
     })
     ```

4. **Add new test: root background is hero-bg**:
   ```typescript
   it('root background uses hero-bg, not dashboard-dark', () => {
     const { container } = renderPage()
     const root = container.firstElementChild as HTMLElement
     expect(root.className).toContain('bg-hero-bg')
     expect(root.className).not.toContain('bg-dashboard-dark')
   })
   ```

5. **Add new test: GlowBackground renders glow orb**:
   ```typescript
   it('hero has GlowBackground with glow orb', () => {
     renderPage()
     const glowOrb = document.querySelector('[data-testid="glow-orb"]')
     expect(glowOrb).toBeInTheDocument()
   })
   ```

6. **Add new test: pill tab bar shape**:
   ```typescript
   it('tab bar has pill-shaped container', () => {
     renderPage()
     const tablist = screen.getByRole('tablist')
     expect(tablist.className).toContain('rounded-full')
     expect(tablist.className).toContain('bg-white/[0.06]')
   })
   ```

7. **Add new test: active tab pill indicator**:
   ```typescript
   it('active tab has pill indicator with background', () => {
     renderPage()
     const activeTab = screen.getByRole('tab', { selected: true })
     expect(activeTab.className).toContain('bg-white/[0.12]')
   })
   ```

8. **Add new test: inactive tab muted text**:
   ```typescript
   it('inactive tabs have muted text color', () => {
     renderPage()
     const inactiveTabs = screen.getAllByRole('tab').filter(t => t.getAttribute('aria-selected') === 'false')
     expect(inactiveTabs.length).toBe(3)
     inactiveTabs.forEach(tab => {
       expect(tab.className).toContain('text-white/50')
     })
   })
   ```

9. **Add new test: no animated underline**:
   ```typescript
   it('tab bar has no animated underline div', () => {
     renderPage()
     const tablist = screen.getByRole('tablist')
     const underline = tablist.querySelector('[aria-hidden="true"]')
     expect(underline).toBeNull()
   })
   ```

10. **Add new test: no animation on tab panels**:
    ```typescript
    it('tab panels do not use animate-tab-fade-in', () => {
      renderPage()
      const panels = screen.getAllByRole('tabpanel', { hidden: true })
      panels.forEach(panel => {
        expect(panel.className).not.toContain('animate-tab-fade-in')
      })
    })
    ```

11. **Add new test: focus ring offset matches hero-bg**:
    ```typescript
    it('tab buttons use hero-bg focus ring offset', () => {
      renderPage()
      const activeTab = screen.getByRole('tab', { selected: true })
      expect(activeTab.className).toContain('ring-offset-hero-bg')
      expect(activeTab.className).not.toContain('ring-offset-dashboard-dark')
    })
    ```

**Auth gating:** N/A — test file only.

**Responsive behavior:** N/A: no UI impact — test file only.

**Guardrails (DO NOT):**
- DO NOT remove or weaken existing functional tests (keyboard nav, tab switching, URL params, completion, state preservation)
- DO NOT change test mocks for useAuth, useFaithPoints, useSoundEffects, useAudioState
- DO NOT modify the renderPage helper or provider wrapping pattern
- DO NOT add tests that depend on specific computed styles (use className checks instead — jsdom doesn't compute CSS)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 11 test changes listed above | integration | See Details section for full test code |

**Expected state after completion:**
- [x] 3 existing tests updated to match new styling
- [x] 8 new tests added for visual changes
- [x] All existing functional tests still passing
- [x] Zero test failures across the DailyHub test suite
- [x] Run `pnpm test` to confirm full suite passes

---

## [UNVERIFIED] Values

The pill tab bar is a new visual pattern not yet in the design system recon.

| Value | Best Guess | Source |
|-------|-----------|--------|
| [UNVERIFIED] Pill outer bg opacity | `bg-hero-bg/85` (rgba(8,5,26,0.85)) | Spec design notes |
| [UNVERIFIED] Pill inner bg | `bg-white/[0.06]` | Spec design notes |
| [UNVERIFIED] Active tab shadow | `shadow-[0_0_12px_rgba(139,92,246,0.15)]` | Spec design notes |
| [UNVERIFIED] Active tab bg | `bg-white/[0.12] border-white/[0.15]` | Spec design notes |
| [UNVERIFIED] Inactive text opacity | `text-white/50` | Spec design notes |
| [UNVERIFIED] Pill `max-w-xl` width | 576px max on desktop | Spec responsive table |

**To verify:** Run `/verify-with-playwright /daily` and compare pill tab bar against spec mockup. Check that pill is visually distinct, active tab glow is visible, inactive text is legible, and pill fits comfortably at all breakpoints.

**If wrong:** Adjust opacity/shadow/width values based on visual output. The pill pattern is new and may need tuning.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Root background + hero GlowBackground wrapper |
| 2 | 1 | Greeting gradient text + verse card FrostedCard (needs GlowBackground wrapper from Step 1) |
| 3 | 1 | Pill tab bar (needs bg-hero-bg ring-offset from Step 1) |
| 4 | — | Tab transition fix (independent) |
| 5 | 1, 2, 3, 4 | Test updates (needs all visual changes in place) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Root background + hero GlowBackground | [COMPLETE] | 2026-04-02 | `DailyHub.tsx`: replaced `ATMOSPHERIC_HERO_BG` import with `GlowBackground`, changed root bg to `bg-hero-bg`, wrapped hero section in `<GlowBackground variant="center">`, updated focus ring offset to `ring-offset-hero-bg` |
| 2 | Greeting gradient text + verse card | [COMPLETE] | 2026-04-02 | `DailyHub.tsx`: h1 now uses `GRADIENT_TEXT_STYLE` inline style, removed `font-script`, `px-1 sm:px-2`, Tailwind gradient classes. Verse card now uses `<FrostedCard>` with `className="mt-6 w-full max-w-3xl text-left sm:p-8"` |
| 3 | Pill tab bar redesign | [COMPLETE] | 2026-04-02 | `DailyHub.tsx`: sticky bar bg changed to `bg-hero-bg/85 backdrop-blur-lg`, inner wrapper to `max-w-xl` with padding, tablist now `rounded-full border bg-white/[0.06] p-1`, active tab has `bg-white/[0.12]` pill + purple shadow, inactive `text-white/50`, animated underline removed, `activeTabIndex` removed |
| 4 | Tab transition fix | [COMPLETE] | 2026-04-02 | `DailyHub.tsx`: removed `className="motion-safe:animate-tab-fade-in"` from all 4 tab panels. Panels now show/hide instantly via `hidden` attribute with no animation flash. |
| 5 | Test updates | [COMPLETE] | 2026-04-02 | `DailyHub.test.tsx`: updated 3 existing tests (Caveat→gradient, bg-white/5→FrostedCard, VerseOfTheDayBanner parent check), added 8 new tests (hero-bg, glow orb, pill tab bar, active pill, inactive muted, no underline, no animation, ring-offset). Fixed `webkitBackgroundClip` → `backgroundClip` for jsdom, `[aria-hidden]` → `div.bg-primary` for underline selector. 39/39 tests pass. |
