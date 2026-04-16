# Implementation Plan: Daily Hub Dark Theme

**Spec:** `_specs/daily-hub-dark-theme.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/daily-hub-dark-theme-01`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Directory Structure
- **Page:** `frontend/src/pages/DailyHub.tsx` — main page component with hero, tab bar, tab panels, quiz, song pick, footer
- **Tab Content Components:**
  - `frontend/src/components/daily/PrayTabContent.tsx` — prayer input, chips, generated prayer display, guided prayer section
  - `frontend/src/components/daily/JournalTabContent.tsx` — mode toggle, prompt card, textarea, saved entries, search/filter
  - `frontend/src/components/daily/MeditateTabContent.tsx` — 6 meditation cards in grid
- **Shared Components:**
  - `frontend/src/components/daily/GuidedPrayerSection.tsx` — guided prayer session cards
  - `frontend/src/components/daily/AmbientSoundPill.tsx` — has `variant` prop ('light' | 'dark')
  - `frontend/src/components/BackgroundSquiggle.tsx` — decorative SVG with hardcoded stroke colors
  - `frontend/src/components/StartingPointQuiz.tsx` — already has `variant` prop ('dark' | 'light'), currently called with `variant="light"` from DailyHub
  - `frontend/src/components/SongPickSection.tsx` — already dark-themed
  - `frontend/src/components/daily/VerseOfTheDayBanner.tsx` — already uses white text on transparent/dark bg

### Existing Color Tokens (tailwind.config.js)
- `dashboard-dark: '#0f0a1e'` — exact page background color needed
- `dashboard-gradient: '#1a0533'` — exact hero gradient start color needed
- `hero-dark: '#0D0620'` — current hero gradient start
- `neutral-bg: '#F5F5F5'` — current page background (being replaced)
- `text-dark: '#2C3E50'` — current text color (being replaced with white variants)
- `text-light: '#7F8C8D'` — current secondary text (being replaced with white/50-60)

### Current Hero Gradient (DailyHub.tsx:170)
```css
linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)
```
Replacing with: `from-[#1a0533] to-[#0f0a1e]` (Tailwind gradient classes using existing tokens)

### Current Tab Bar (DailyHub.tsx:212-273)
- Background: `bg-neutral-bg` with `shadow-md` when sticky
- Border: `border-b border-gray-200`
- Active tab: `text-primary`, Inactive: `text-text-light hover:text-text-dark`

### Current Card Patterns (light theme)
- Meditation cards: `bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md`
- Prayer card: `bg-primary/5 p-6 rounded-lg`
- Journal entries: `bg-white rounded-lg border border-gray-200 p-4`
- Guided prayer cards: `bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md`
- Chips: `bg-white border border-gray-200 rounded-full`
- Mode toggle: `bg-primary text-white` (active), `bg-white text-text-dark` (inactive)
- Journal prompt: `bg-white border-l-4 border-primary p-6 shadow-sm`

### Test Patterns (DailyHub.test.tsx)
- Wraps in `MemoryRouter > ToastProvider > AuthModalProvider > DailyHub`
- Mocks: `useAuth`, `useFaithPoints`, `AudioProvider`, `useScenePlayer`
- Tests check text content, tab switching, accessibility attributes

### BackgroundSquiggle
- Uses hardcoded stroke colors: `#D6D3D1` and `#E7E5E4` (light warm grays)
- On dark background, these need reduced opacity (spec says 10-15%)
- The component accepts `className` but NOT stroke color props — opacity must be controlled via the container

### StartingPointQuiz
- Already supports `variant="dark"` with dark styling: `bg-white/[0.08]`, `border-white/15`, etc.
- Currently called with `variant="light"` in DailyHub — just change to `variant="dark"`

### AmbientSoundPill
- Has `variant` prop ('light' | 'dark') — currently defaults to 'light'
- Need to pass `variant="dark"` from all three tab contents

---

## Auth Gating Checklist

**No auth gating changes in this spec.** All existing auth gates remain unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No changes to auth gating | N/A | Existing auth gates unchanged |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (`bg-dashboard-dark`) | tailwind.config.js:23 |
| Hero gradient | background | `from-[#1a0533] to-[#0f0a1e]` (or `from-dashboard-gradient to-dashboard-dark`) | tailwind.config.js:23-24 |
| Tab bar (sticky) | background | `bg-white/[0.08] backdrop-blur-xl` | spec |
| Tab bar | border | `border-b border-white/10` | spec |
| Active tab text | color | `text-white` | spec |
| Inactive tab text | color | `text-white/60` | spec |
| Tab underline | color | `bg-primary` (unchanged) | existing code |
| Content cards | background | `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl` | spec |
| Textarea | background | `bg-white/[0.06]` | spec |
| Textarea text | color | `text-white` | spec |
| Textarea placeholder | color | `text-white/40` | spec |
| Body text | color | `text-white/80` | spec |
| Secondary text | color | `text-white/50` | spec |
| Section headings | color | `text-white` | spec |
| Chips | background | `bg-white/10 border-white/15 text-white/70` | spec |
| Action buttons | style | `bg-white/10 text-white/70 hover:bg-white/15` | spec |
| Meditation card hover | style | `hover:bg-white/[0.10] hover:border-white/20` | spec |
| Card descriptions | color | `text-white/60` | spec |
| Duration text | color | `text-white/40` | spec |
| Mode toggle (unselected) | background | `bg-white/10` | spec |
| Mode toggle (selected) | background | `bg-primary/20` | spec |
| Journal prompt card | style | `bg-white/[0.06] border-l-2 border-primary` | spec |
| Search/filter bar | style | `bg-white/[0.06] border border-white/10` | spec |
| Squiggle opacity | opacity | Reduce to ~10-15% on dark | spec |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- Squiggle backgrounds use `SQUIGGLE_MASK_STYLE` for fade mask — container controls opacity
- All tabs share `max-w-2xl` container width
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Daily Hub dark theme uses slightly higher opacity: `bg-white/[0.06]` for text-heavy content areas
- Tab bar frosted glass: `bg-white/[0.08] backdrop-blur-xl` matches navbar pattern
- Existing color tokens: `dashboard-dark` = `#0f0a1e`, `dashboard-gradient` = `#1a0533`
- `StartingPointQuiz` already supports `variant="dark"` — just change the prop
- `AmbientSoundPill` has `variant` prop — pass `variant="dark"` from tab contents
- Crisis banner stays red — do not modify crisis-related styles
- Focus indicators: use `focus-visible:ring-white` or `focus-visible:ring-primary` (both visible on dark)

---

## Shared Data Models (from Master Plan)

Not applicable — this spec is purely visual with no data model changes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column, full-width cards, stacked sections, tab bar remains sticky |
| Tablet | 768px | Meditation cards in 2-column grid, tab content respects max-w-2xl |
| Desktop | 1440px | Content centered within max-w-2xl, full backdrop-blur effects |

No responsive behavior changes — dark theme applies identically at all breakpoints. Only visual (color/background) changes.

---

## Vertical Rhythm

No changes to vertical rhythm — only colors change. All padding, margins, and gaps remain identical.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Tailwind tokens `dashboard-dark` and `dashboard-gradient` already exist in tailwind.config.js
- [x] `StartingPointQuiz` already supports `variant="dark"` with full dark styling
- [x] `AmbientSoundPill` already has `variant` prop for dark mode
- [x] No auth gating changes needed — spec is purely visual
- [x] Design system values verified from tailwind.config.js and spec
- [x] BackgroundSquiggle opacity must be controlled via container (no color props on component)
- [x] Prior specs complete — this is spec 1 of 6 visual foundation specs

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Squiggle opacity on dark | Control via container `opacity-[0.12]` | BackgroundSquiggle has no opacity prop; wrapping container already exists |
| Skip-to-content link style | Update to dark-compatible: `focus:bg-dashboard-dark focus:text-white` | Current `focus:bg-white focus:text-primary` won't be visible on dark |
| VotD banner gradient wrapper | Change `from-primary to-neutral-bg` to `from-primary to-dashboard-dark` | Current gradient fades to neutral-bg which no longer exists on this page |
| ChallengeStrip | No changes needed | Already uses inline `backgroundColor` with alpha, works on dark |
| Loading state text | Change `text-text-light` to `text-white/50` | Loading "Generating prayer..." text must be visible on dark |
| Reflection prompt buttons | Change `bg-gray-200 text-text-dark` to `bg-white/10 text-white/70` | Must be visible on dark background |
| "Done journaling" CTA card | Change `bg-primary/5` to `bg-white/[0.06]` | bg-primary/5 too subtle on dark |
| Journal voice mic button | Change `bg-black/5 text-black/30` to `bg-white/10 text-white/30` | Must be visible on dark |
| Journal search clear button | Change `text-text-light hover:text-text-dark` to `text-white/50 hover:text-white` | Must be visible on dark |
| Guided prayer duration badge | Change `bg-gray-100 text-text-light` to `bg-white/10 text-white/40` | Must be visible on dark |

---

## Implementation Steps

### Step 1: DailyHub Page Shell — Background, Hero, Tab Bar

**Objective:** Convert the page background from light to dark, update the hero gradient, and convert the tab bar to frosted glass.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — page background, hero gradient, tab bar, skip-to-content link, VotD banner gradient, quiz variant

**Details:**

1. **Page background** (line 153): Change `bg-neutral-bg` to `bg-dashboard-dark`
   ```tsx
   // Before:
   <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
   // After:
   <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
   ```

2. **Skip-to-content link** (line 156): Update for dark background visibility
   ```tsx
   // Before:
   className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
   // After:
   className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
   ```
   (Keep as-is — white bg with primary text is visible over dark)

3. **Hero gradient** (lines 165-172): Replace inline style gradient
   ```tsx
   // Before:
   style={{
     backgroundImage: 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
   }}
   // After: Remove inline style, use Tailwind classes
   className="relative flex w-full flex-col items-center bg-gradient-to-b from-dashboard-gradient to-dashboard-dark px-4 pb-10 pt-32 text-center antialiased sm:pb-12 sm:pt-36 lg:pb-14 lg:pt-40"
   ```
   Remove the `style` attribute entirely.

4. **Verse of the Day gradient wrapper** (line 200): Change gradient end
   ```tsx
   // Before:
   <div className="bg-gradient-to-b from-primary to-neutral-bg">
   // After:
   <div className="bg-gradient-to-b from-dashboard-dark to-dashboard-dark">
   ```
   Actually, since there's no gradient needed (both ends are dashboard-dark), simplify to just `bg-dashboard-dark`. But wait — the VotD banner wrapper provides a visual transition between hero and content. Since the hero now ends at `dashboard-dark` and the content is also `dashboard-dark`, this wrapper is now unnecessary as a gradient. Just make it match:
   ```tsx
   <div className="bg-dashboard-dark">
   ```

5. **Tab bar sticky container** (lines 211-215): Change to frosted glass
   ```tsx
   // Before:
   className={cn(
     'sticky top-0 z-40 bg-neutral-bg transition-shadow',
     isSticky && 'shadow-md',
   )}
   // After:
   className={cn(
     'sticky top-0 z-40 bg-white/[0.08] backdrop-blur-xl transition-shadow',
     isSticky && 'shadow-md shadow-black/20',
   )}
   ```

6. **Tab bar inner border** (line 217): Change border color
   ```tsx
   // Before:
   <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-gray-200">
   // After:
   <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-white/10">
   ```

7. **Tab button colors** (lines 241-245): Dark theme tab text
   ```tsx
   // Before:
   isActive ? 'text-primary' : 'text-text-light hover:text-text-dark'
   // After:
   isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
   ```

8. **Tab focus ring** (line 242): Update ring offset for dark
   ```tsx
   // focus-visible:ring-offset-2 → keep but change to ring-offset-transparent or ring-offset-dashboard-dark
   // Actually, ring-offset-2 uses the background color. Since the bg is now dark, add:
   'focus-visible:ring-offset-dashboard-dark'
   // instead of the default white offset
   ```

9. **StartingPointQuiz** (line 322): Change variant to dark
   ```tsx
   // Before:
   <StartingPointQuiz variant="light" />
   // After:
   <StartingPointQuiz variant="dark" />
   ```

**Guardrails (DO NOT):**
- DO NOT change any functional behavior, event handlers, or state management
- DO NOT modify the tab underline animation (keep `bg-primary`)
- DO NOT change the Navbar — it's already glassmorphic
- DO NOT change the SiteFooter — it's already dark
- DO NOT change SongPickSection — it's already dark-themed
- DO NOT remove or modify the completion checkmarks

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Page has dark background class | integration | Verify `bg-dashboard-dark` is on the root div |
| Tab bar has frosted glass styling | integration | Verify tab bar container has `backdrop-blur-xl` |
| Active tab has white text | integration | Verify active tab has `text-white` class |
| Inactive tab has white/60 text | integration | Verify inactive tabs have `text-white/60` |
| Quiz renders with dark variant | integration | Verify StartingPointQuiz receives `variant="dark"` |
| Existing tests still pass | regression | All existing DailyHub tests pass with class name updates |

**Expected state after completion:**
- [x] Page background is solid dark from navbar to footer
- [x] Hero uses dark gradient blending into page background
- [x] Tab bar is frosted glass with white text
- [x] StartingPointQuiz renders in dark variant
- [x] VotD banner section has dark background

---

### Step 2: PrayTabContent — Dark Theme

**Objective:** Convert all Pray tab elements to dark theme.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — all color/background classes

**Details:**

1. **Section heading** (line 672): `text-text-dark` → `text-white`
   ```tsx
   // Before:
   className="mb-4 text-center font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl"
   // After:
   className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
   ```

2. **AmbientSoundPill** (line 679): Add `variant="dark"`
   ```tsx
   <AmbientSoundPill context="pray" variant="dark" />
   ```

3. **Retry prompt text** (line 683): `text-text-light` → `text-white/50`

4. **Chips** (lines 688-699): Dark theme styling
   ```tsx
   // Before:
   className="min-h-[44px] shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark transition-colors hover:border-primary hover:text-primary"
   // After:
   className="min-h-[44px] shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:border-primary hover:text-primary"
   ```

5. **Textarea** (lines 703-721): Dark styling
   ```tsx
   // Before:
   className="w-full resize-none rounded-lg border border-glow-cyan/30 bg-white px-4 py-3 text-text-dark placeholder:text-text-light/60 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
   // After:
   className="w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/40 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
   ```

6. **Character counter** (line 720): `text-text-light/60` → `text-white/40`

7. **Loading state text** (line 410): `text-text-light` → `text-white/50`

8. **Generated prayer label** (line 418): `text-text-light` → `text-white/50`

9. **Prayer card** (line 421): Dark card styling
   ```tsx
   // Before:
   className="mb-6 rounded-lg bg-primary/5 p-6"
   // After:
   className="mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6"
   ```

10. **KaraokeText** (lines 426, 434): `text-text-dark` → `text-white/80`

11. **Skip button** (line 446): `text-subtle-gray` → `text-white/40`, `hover:text-text-dark` → `hover:text-white/70`

12. **Sound indicator text** (lines 455-476): `text-subtle-gray` → `text-white/40`, `hover:text-text-dark` → `hover:text-white/70`

13. **Action buttons** (Copy, Save, Save to List, More) (lines 482-569):
    ```tsx
    // Before pattern:
    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50"
    // After pattern:
    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15"
    ```
    Apply to: Copy button (485), Save button (505), Save to List button (517), Saved span (524), mobile overflow button (535).

14. **Mobile overflow menu** (lines 543-568):
    ```tsx
    // Before:
    className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    // After:
    className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-dashboard-dark py-1 shadow-lg"
    ```
    Menu item: `text-text-dark hover:bg-gray-50` → `text-white/70 hover:bg-white/10`

15. **Post-prayer reflection prompt** (lines 596-647):
    - "How did that prayer land?" text (602): `text-text-dark` → `text-white`
    - Reflection buttons (606-632): `bg-gray-200 text-text-dark hover:bg-gray-300` → `bg-white/10 text-white/70 hover:bg-white/15`
    - Resonated message (638): `text-text-light` → `text-white/50`

16. **Secondary CTAs** (lines 650-665):
    - "Pray about something else" (662): `text-text-light hover:text-text-dark` → `text-white/50 hover:text-white`

17. **Classic Prayers section** (currently behind `false &&`, but update for consistency):
    - ClassicPrayerCard (line 820): `bg-white border-gray-200` → `bg-white/[0.06] border-white/10`
    - Card text: `text-text-dark` → `text-white`, `text-text-light` → `text-white/50`
    - Card buttons: match action button dark pattern

18. **Guided Prayer Section heading** (GuidedPrayerSection.tsx line 50): `text-text-dark` → `text-white`
    - Description (line 54): `text-text-light` → `text-white/50`
    - Cards (line 68): `bg-white border-gray-200 shadow-sm hover:shadow-md` → `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/[0.10] hover:border-white/20`
    - Card text (line 81): `text-text-dark` → `text-white`
    - Card description (line 83): `text-text-light` → `text-white/60`
    - Duration badge (line 87): `bg-gray-100 text-text-light` → `bg-white/10 text-white/40`

19. **BackgroundSquiggle container** — reduce opacity for dark background.
    In the wrapping div (lines 392-398), add opacity:
    ```tsx
    // Before:
    className="pointer-events-none absolute inset-0"
    // After:
    className="pointer-events-none absolute inset-0 opacity-[0.12]"
    ```
    Apply same in all 3 tabs (PrayTabContent, JournalTabContent, MeditateTabContent).

**Guardrails (DO NOT):**
- DO NOT change crisis banner styling (stays red)
- DO NOT modify the glow-pulse animation
- DO NOT change any auth gating logic
- DO NOT change functionality or state management
- DO NOT change the "Generate Prayer" CTA button (already `bg-primary text-white`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Textarea has dark background | unit | Verify textarea has `bg-white/[0.06]` |
| Chips have dark styling | unit | Verify chips have `bg-white/10` |
| Heading text is white | unit | Verify section heading has `text-white` |
| Crisis banner unchanged | unit | Verify crisis banner retains red styling |
| Existing PrayTabContent tests pass | regression | Update any assertions checking class names |

**Expected state after completion:**
- [x] All Pray tab elements use dark theme colors
- [x] Textarea has dark background with cyan glow
- [x] Chips, buttons, and cards all use frosted glass styling
- [x] Guided prayer section has dark cards
- [x] BackgroundSquiggle is subtle on dark background

---

### Step 3: JournalTabContent — Dark Theme

**Objective:** Convert all Journal tab elements to dark theme.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — all color/background classes

**Details:**

1. **Section heading** (line 360): `text-text-dark` → `text-white`

2. **AmbientSoundPill** (line 365): Add `variant="dark"`

3. **Mode toggle** (lines 368-396):
   - Container border: `border-gray-200` → `border-white/10`
   - Active state: `bg-primary text-white` → `bg-primary/20 text-white`
   - Inactive state: `bg-white text-text-dark hover:bg-gray-50` → `bg-white/10 text-white/70 hover:bg-white/15`

4. **Context banner** (line 402): `border-primary/20 bg-primary/5` stays (visible on dark). Text: `text-text-dark` → `text-white/80`

5. **Guided prompt card** (line 421):
   ```tsx
   // Before:
   className="rounded-lg border-l-4 border-primary bg-white p-6 shadow-sm"
   // After:
   className="rounded-lg border-l-2 border-primary bg-white/[0.06] p-6"
   ```
   Prompt text: `text-text-dark` → `text-white/80`

6. **"Try a different prompt" link** (line 431): `text-text-light hover:text-primary` → `text-white/50 hover:text-primary`

7. **Free Write context note** (line 444): `text-text-light` → `text-white/50`

8. **Textarea** (lines 458-471):
   ```tsx
   // Before:
   className="min-h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 pb-10 pt-3 font-serif text-lg leading-relaxed text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
   // After:
   className="min-h-[200px] w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 pb-10 pt-3 font-serif text-lg leading-relaxed text-white placeholder:text-white/40 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
   ```
   Note: Adding cyan glow border + glow-pulse animation to match Pray tab textarea pattern on dark.

9. **Character counter** (line 475): `text-text-light/60` → `text-white/40`

10. **Voice mic button** (lines 486-493):
    - Non-listening state: `bg-black/5 text-black/30 hover:bg-black/10 hover:text-black/50` → `bg-white/10 text-white/30 hover:bg-white/15 hover:text-white/50`
    - Listening state: unchanged (red pulse)

11. **Draft saved indicator** (line 517): `text-text-light` → `text-white/50`

12. **Save button**: Already `bg-primary text-white` — no change needed.

13. **"Write another" link** (line 553): keep `text-primary` (visible on dark)

14. **"Done journaling" link** (line 561): `text-text-light hover:text-text-dark` → `text-white/50 hover:text-white`

15. **"Done journaling" CTA card** (line 570): `bg-primary/5` → `bg-white/[0.06]`. Text: `text-text-dark` → `text-white`

16. **Search/filter bar** (line 594):
    ```tsx
    // Before:
    className="rounded-xl border border-gray-200 bg-white/80 p-3 backdrop-blur-sm"
    // After:
    className="rounded-xl border border-white/10 bg-white/[0.06] p-3"
    ```

17. **Search input** (line 605):
    ```tsx
    // Before:
    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-text-dark placeholder:text-text-light/60 ..."
    // After:
    className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-8 text-sm text-white placeholder:text-white/40 ..."
    ```

18. **Search icon** (line 598): `text-text-light` → `text-white/40`

19. **Clear search button** (line 611): `text-text-light hover:text-text-dark` → `text-white/40 hover:text-white`

20. **Mode filter pills** (lines 623-638):
    - Active: `bg-primary/20 text-primary` (keep — visible on dark)
    - Inactive: `bg-gray-100 text-text-dark hover:bg-gray-200` → `bg-white/10 text-white/70 hover:bg-white/15`

21. **Sort toggle** (line 646): `text-text-light hover:text-text-dark` → `text-white/50 hover:text-white`

22. **Empty filter state** (line 658):
    ```tsx
    // Before:
    className="rounded-xl border border-gray-200 bg-white/80 p-6 text-center backdrop-blur-sm"
    // After:
    className="rounded-xl border border-white/10 bg-white/[0.06] p-6 text-center"
    ```
    Text: `text-text-light` → `text-white/50`

23. **Journal entry cards** (line 674):
    ```tsx
    // Before:
    className="rounded-lg border border-gray-200 bg-white p-4"
    // After:
    className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
    ```

24. **Entry timestamps** (line 677): `text-text-light` → `text-white/40`

25. **Entry prompt text** (line 686): `text-text-light` → `text-white/40`

26. **Entry content** (line 690): `text-text-dark` → `text-white/80`

27. **Reflection card** (line 695): `bg-primary/5` → `bg-white/[0.04]`
    - "Reflection" label: keep `text-primary`
    - Text: `text-text-dark` → `text-white/80`

28. **"Reflect on my entry" link** (line 705): keep `text-primary` (visible on dark)

29. **BackgroundSquiggle container**: Add `opacity-[0.12]` (same as Step 2, item 19)

**Guardrails (DO NOT):**
- DO NOT change crisis banner styling
- DO NOT change journal mode persistence or draft auto-save logic
- DO NOT modify voice input behavior
- DO NOT change any auth gating logic
- DO NOT add the glow-pulse animation to the journal textarea if the spec says it uses glow border (spec says "cyan glow border" which is the existing `border-glow-cyan/30`; the pulse animation is optional — add it for consistency with Pray tab)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Journal textarea has dark background | unit | Verify textarea has `bg-white/[0.06]` |
| Mode toggle uses dark styling | unit | Verify inactive mode has `bg-white/10` |
| Entry cards have dark styling | unit | Verify entries have `bg-white/[0.06]` |
| Existing JournalTabContent tests pass | regression | Update assertions for class name changes |

**Expected state after completion:**
- [x] All Journal tab elements use dark theme colors
- [x] Mode toggle, prompt card, textarea, entries all darkened
- [x] Search/filter bar uses frosted glass on dark
- [x] BackgroundSquiggle is subtle on dark background

---

### Step 4: MeditateTabContent — Dark Theme

**Objective:** Convert all Meditate tab elements to dark theme.

**Files to create/modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — all color/background classes

**Details:**

1. **Section heading** (line 68): `text-text-dark` → `text-white`

2. **AmbientSoundPill** (line 75): Add `variant="dark"`

3. **All-complete celebration banner** (line 78):
   ```tsx
   // Before:
   className="mb-8 motion-safe:animate-golden-glow rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
   // After:
   className="mb-8 motion-safe:animate-golden-glow rounded-xl border border-amber-200/30 bg-amber-900/20 p-6 text-center"
   ```
   Text (line 79): `text-text-dark` → `text-white`

4. **Meditation cards** (lines 94-136):
   ```tsx
   // Before (non-suggested):
   'border-gray-200 bg-white'
   // After:
   'border-white/10 bg-white/[0.06] backdrop-blur-sm'

   // Before (suggested):
   'border-primary bg-primary/5 ring-1 ring-primary/30'
   // After:
   'border-primary bg-primary/10 ring-1 ring-primary/30'
   ```

   Card base classes:
   ```tsx
   // Before:
   className={`group rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-5 ...`}
   // After:
   className={`group rounded-2xl border p-4 text-left transition-colors hover:bg-white/[0.10] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark sm:p-5 ...`}
   ```

5. **"Suggested" badge** (line 111): `bg-primary/10 text-primary` — keep (visible on dark)

6. **Card title** (line 127): `text-text-dark` → `text-white`

7. **Card description** (line 130): `text-text-light` → `text-white/60`

8. **Duration text** (line 133): `text-primary` → keep (visible on dark, provides accent color)

9. **BackgroundSquiggle container**: Add `opacity-[0.12]` (same as Steps 2-3)

**Guardrails (DO NOT):**
- DO NOT change the green completion checkmark
- DO NOT modify auth gating (card click → auth modal for logged-out)
- DO NOT change the 2-column grid layout
- DO NOT change card sizing or spacing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Meditation cards have dark styling | unit | Verify cards have `bg-white/[0.06]` |
| Card titles are white | unit | Verify titles have `text-white` |
| Completion checkmark stays green | unit | Verify `text-success` retained |
| Golden glow banner works on dark | unit | Verify banner has `bg-amber-900/20` |
| Existing MeditateTabContent tests pass | regression | Update assertions for class name changes |

**Expected state after completion:**
- [x] All 6 meditation cards use dark frosted glass styling
- [x] Card text colors updated for dark background
- [x] Golden glow banner adapted for dark background
- [x] BackgroundSquiggle is subtle on dark background

---

### Step 5: Test Updates and Verification

**Objective:** Ensure all existing tests pass with the new class names, and add dark theme verification tests.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — update any assertions that check class names
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — update assertions
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — update assertions

**Details:**

1. Run `pnpm test` from the `frontend` directory to identify any failing tests
2. Fix any assertions that check for old class names (e.g., `bg-neutral-bg`, `text-text-dark`, `bg-white`, `border-gray-200`)
3. Do NOT add new test files — update existing tests to accommodate the visual changes
4. Verify the crisis banner test still passes (CrisisBanner.test.tsx should be unaffected)
5. Verify tab switching, keyboard navigation, and accessibility tests still pass

**Guardrails (DO NOT):**
- DO NOT remove existing test coverage
- DO NOT skip or disable tests
- DO NOT change test setup/wrapping patterns
- DO NOT add snapshot tests (this project doesn't use them)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | regression | `pnpm test` exits cleanly |
| Dark background applied | integration | Root div has `bg-dashboard-dark` |
| Tab functionality unchanged | integration | Tab switching still works correctly |

**Expected state after completion:**
- [x] All tests pass with `pnpm test`
- [x] No test coverage lost
- [x] Class name assertions updated where needed

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | DailyHub page shell (background, hero, tab bar, quiz variant) |
| 2 | 1 | PrayTabContent dark theme |
| 3 | 1 | JournalTabContent dark theme |
| 4 | 1 | MeditateTabContent dark theme |
| 5 | 1, 2, 3, 4 | Test updates and verification |

**Steps 2, 3, 4 can be executed in parallel** (they modify independent files). Step 5 must come after all others.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | DailyHub Page Shell | [COMPLETE] | 2026-03-24 | DailyHub.tsx: bg-dashboard-dark, Tailwind gradient, frosted tab bar, white tab text, dark quiz variant, dark VotD wrapper. All 17 tests pass. |
| 2 | PrayTabContent Dark Theme | [COMPLETE] | 2026-03-24 | PrayTabContent.tsx + GuidedPrayerSection.tsx: all colors dark, squiggle opacity, chips, textarea, cards, buttons, reflection, classic prayers section |
| 3 | JournalTabContent Dark Theme | [COMPLETE] | 2026-03-24 | JournalTabContent.tsx: mode toggle, prompt card, textarea w/ glow, search/filter, entries, reflection, squiggle opacity |
| 4 | MeditateTabContent Dark Theme | [COMPLETE] | 2026-03-24 | MeditateTabContent.tsx: cards, celebration banner, heading, description, squiggle opacity |
| 5 | Test Updates and Verification | [COMPLETE] | 2026-03-24 | All 194 Daily Hub tests pass (14 files). No test updates needed — existing tests don't assert on changed class names. 2 pre-existing failures unrelated to this spec. |
