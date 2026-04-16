# Implementation Plan: Growth Garden Enhancement

**Spec:** `_specs/growth-garden-enhancement.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/growth-garden-enhancement`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure
- Components: `frontend/src/components/dashboard/`
- Hooks: `frontend/src/hooks/`
- Lib/utilities: `frontend/src/lib/`
- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Tests: `frontend/src/components/dashboard/__tests__/`

### GrowthGarden Current State
**File:** `frontend/src/components/dashboard/GrowthGarden.tsx` (817 lines)

- **Props:** `{ stage: 1-6, animated?, showSparkle?, streakActive?, size: 'sm'|'md'|'lg', amplifiedSparkle?, showRainbow? }`
- **SVG:** `viewBox="0 0 800 400"`, `preserveAspectRatio="xMidYMid slice"`, all inline `fill`/`stroke` attributes (NOT Tailwind classes — critical for canvas rendering)
- **Color palette:** Hardcoded hex in `C` constant object (lines 35-50): `purple: '#6D28D9'`, `purpleLt: '#A78BFA'`, `amber: '#D97706'`, `amberLt: '#FBBF24'`, `teal: '#2DD4BF'`, `green: '#34D399'`, `earthDk: '#5C4033'`, `earthMd: '#6B4E1B'`, `earthLt: '#8B6914'`, `leafBrt: '#22C55E'`, `leafMd: '#16A34A'`, `leafDk: '#15803D'`, `streamLt: '#60A5FA'`, `streamDk: '#3B82F6'`
- **Sub-components:** `SkyBackground` (gradient, lines 54-70), `SkyElements` (sun/clouds, lines 72-92), `GroundLayer` (lines 94-117), `GrassBlades`, `Flower`, `ButterflyShape`, `BirdShape`, `SunlightRays`, 6 stage renderers (lines 206-591), `SparkleOverlay` (lines 624-681), `RainbowArc` (lines 683-727)
- **SkyBackground gradient:** Streak active: `#0D0620 → #1E0B3E`. Streak inactive: `#1a1025 → #2a1845`. Uses `<defs><linearGradient>` with unique ID `sky-${uid}`
- **SkyElements:** Sun (white circles at x=680,y=80) or Clouds (white ellipses opacity 0.12-0.15) based on `streakActive` prop
- **Animations:** All use `motion-safe:` prefix. Defined in `tailwind.config.js` lines 171-307: `garden-leaf-sway` (4s), `garden-butterfly-float` (6s), `garden-water-shimmer` (3s), `garden-glow-pulse` (2s), `garden-fade-out` (2s), `garden-fade-in` (2s), `garden-sparkle-rise` (1s)
- **Stage transition:** Crossfade (2s) rendering both old/new SVGs simultaneously

### Dashboard Integration
- `Dashboard.tsx` (lines 451-477): Renders GrowthGarden within `gardenSlot` prop passed to `DashboardHero`
- `DashboardHero.tsx` (lines 8-18, 98-99): Receives `gardenSlot?: React.ReactNode`, renders it at `<div className="mx-auto max-w-6xl px-4 sm:px-6">{gardenSlot}</div>` above the greeting text
- Garden wrapper in Dashboard: `<div>` with `<p className="text-xs text-white/60">Your Garden</p>` label, then responsive garden (md mobile / lg desktop)
- Dashboard hero gradient: `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` (`#1a0533 → #0f0a1e`)

### Canvas Rendering Patterns
- **verse-card-canvas.ts** (522 lines): Font loading via `document.fonts.load()` for Lora, Inter, Caveat. Canvas creation, template-specific renderers, returns PNG blob. Utilities: `wrapText()`, `fitVerseText()`, `drawLines()`
- **challenge-share-canvas.ts** (112 lines): Fixed 1080×1080 canvas. `darkenColor()` utility. Background gradient, title (Caveat bold 72px), progress text (Inter 36px), progress bar, watermark (Caveat 28px). Returns PNG blob
- **SharePanel.tsx** (479 lines): Props `{ verseText, reference, isOpen, onClose }`. Bottom sheet modal with template picker, size selector, live preview, download/share via Web Share API. The garden share will need a simpler variant or direct integration

### Hooks
- **useLiturgicalSeason()** (7 lines): Returns `{ currentSeason, seasonName, themeColor, icon, greeting, daysUntilNextSeason, isNamedSeason }`. 8 possible seasons: Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time
- **useFaithPoints()** (371 lines): Returns `{ totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, ... }`. Reads `wr_daily_activities`, `wr_faith_points`, `wr_streak`, `wr_mood_entries`, `wr_badges`
- **useReducedMotion()**: Returns boolean for `prefers-reduced-motion`
- **useSoundEffects()**: Sound effects gated by `wr_sound_effects_enabled` and `prefers-reduced-motion`

### Test Patterns
- **4 test files:** `GrowthGarden.test.tsx` (294 lines), `GrowthGarden-a11y.test.tsx`, `GrowthGarden-sparkle.test.tsx`, `GrowthGarden-transition.test.tsx`
- **Mocks:** `vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: vi.fn(() => false) }))`, `vi.mock('@/hooks/useLiturgicalSeason', () => ({ useLiturgicalSeason: () => ({ greeting: null, themeColor: null, isNamedSeason: false }) }))`
- **Pattern:** `render()`, `screen.getByTestId()`, `container.querySelectorAll()` for SVG elements, check `fill`/`stroke` attributes directly

---

## Auth Gating Checklist

The Growth Garden is part of the auth-gated dashboard. No individual auth checks needed within the component — the entire dashboard page is gated by `AuthProvider` (Dashboard.tsx only renders when `isAuthenticated`).

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View garden | Dashboard auth-gated | N/A (inherited) | Dashboard page-level auth gate |
| Share garden | Must be logged in to see share button | Step 6 | Inherited — button only visible on auth-gated dashboard |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard hero gradient | background | `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` (#1a0533 → #0f0a1e) | DashboardHero.tsx:96 |
| Garden SVG sky (streak active) | gradient | `#0D0620 → #1E0B3E` | GrowthGarden.tsx:59-62 |
| Garden SVG sky (no streak) | gradient | `#1a1025 → #2a1845` | GrowthGarden.tsx:64-67 |
| Share button | color | `text-white/40 hover:text-white/60` | Spec design notes |
| Canvas background | gradient | `#0D0620 → #1E0B3E` | Spec design notes |
| Canvas title font | font | Caveat bold | challenge-share-canvas.ts pattern |
| Canvas body font | font | Inter | verse-card-canvas.ts pattern |
| Garden card label | style | `text-xs text-white/60` | Dashboard.tsx:453 |
| Frosted glass card | style | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- GrowthGarden SVG uses **inline fill/stroke hex attributes** (not Tailwind classes) — critical for canvas rendering. All new SVG elements MUST use inline attributes
- SVG viewBox is `0 0 800 400`. All coordinate positions must fit within this space
- Garden sky gradient IDs use `sky-${uid}` pattern for uniqueness (React `useId()`)
- All garden animations use `motion-safe:` prefix and are defined in `tailwind.config.js`
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Text opacity hierarchy: primary `text-white/80`+, secondary `text-white/60`, decorative `text-white/20–text-white/40`
- Sound effects gated by: `wr_sound_effects_enabled !== 'false'` AND `prefers-reduced-motion` not `reduce`
- Date utility rule: Always use `getLocalDateString()` from `@/utils/date`, NEVER `new Date().toISOString().split('T')[0]`
- Canvas renderers use `document.fonts.load()` for font loading, return PNG blob
- `SkyBackground` component controls sky gradient via `<defs><linearGradient>` — time-of-day modifications go here
- `SkyElements` component renders sun or clouds — moon/stars replacements go here
- Caveat (`font-script`) for script/watermark text, Lora (`font-serif`) for scripture, Inter (`font-sans`) for UI

---

## Shared Data Models (from existing codebase)

```typescript
// GrowthGardenProps — existing interface at GrowthGarden.tsx:6-13
export interface GrowthGardenProps {
  stage: 1 | 2 | 3 | 4 | 5 | 6
  animated?: boolean
  showSparkle?: boolean
  streakActive?: boolean
  size: 'sm' | 'md' | 'lg'
  amplifiedSparkle?: boolean
  showRainbow?: boolean
}

// LiturgicalSeasonResult — from useLiturgicalSeason hook
interface LiturgicalSeasonResult {
  currentSeason: LiturgicalSeason
  seasonName: string // "Advent" | "Christmas" | "Epiphany" | "Lent" | "Holy Week" | "Easter" | "Pentecost" | "Ordinary Time"
  themeColor: string
  icon: string
  greeting: string
  daysUntilNextSeason: number
  isNamedSeason: boolean
}
```

**localStorage keys this spec reads (no writes):**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_daily_activities` | Read | Journal count for writing desk element |
| `wr_meditation_history` | Read | Session count for meditation cushion element |
| `wr_bible_progress` | Read | Chapter count for open Bible element |
| `wr_listening_history` | Read | Session count for wind chime element |
| `wr_faith_points` | Read (via useFaithPoints) | Level, level name for canvas |
| `wr_streak` | Read (via useFaithPoints) | Streak count for canvas |
| `wr_user_name` | Read (via useAuth) | User name for canvas |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Garden renders at `h-[200px]` (md size) via `lg:hidden` wrapper. Share button 44px touch target. Activity elements scale proportionally via viewBox. |
| Tablet | 768px | Same as mobile layout (garden in `lg:hidden` wrapper). |
| Desktop | 1440px | Garden renders at `h-[300px]` (lg size) via `hidden lg:block` wrapper. All overlays visible. |

No breakpoint-specific SVG changes needed — viewBox scaling handles proportional rendering.

---

## Vertical Rhythm

N/A — The garden is rendered within the existing `DashboardHero` `gardenSlot` and `DashboardWidgetGrid` layout. No new sections or inter-section spacing introduced.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/growth-garden-enhancement` exists and is checked out
- [ ] All existing GrowthGarden tests pass (4 test files)
- [ ] `useLiturgicalSeason()` hook is functioning (check by rendering DashboardHero)
- [ ] All auth-gated actions from the spec are accounted for in the plan (only 2: view garden, share garden — both inherited from dashboard auth gate)
- [ ] Design system values are verified from codebase inspection (DashboardHero.tsx, GrowthGarden.tsx, tailwind.config.js)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prayer Wall activity count has no dedicated localStorage counter — spec says "Prayer Wall activity count >= 10" but there is no `wr_prayer_wall_count` key. Must derive from `wr_daily_activities` (see Edge Cases)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Prayer Wall activity count source | Count days where `prayerWall: true` in `wr_daily_activities` | No dedicated counter exists. `wr_daily_activities` is a daily log keyed by date with boolean flags per activity type. Counting days with `prayerWall: true` is the most reliable source. |
| Seasonal overlay group structure | Separate `<g>` overlay groups per season, rendered after main stage content | Keeps stage SVG untouched. Seasonal overlays are additive. Easy to test independently. |
| Time-of-day vs seasonal priority | Time-of-day sky applied first, then seasonal tint overlay on top | Time-of-day is the base sky state. Seasonal adjustments are CSS filters/overlays that compose on top. Both are visible simultaneously. |
| Night sky + streakActive=false (clouds) | Replace clouds with moon; show stars regardless of streak | At night, showing clouds + moon would be redundant. Moon replaces sun/clouds. Stars are always visible at night. Streak inactive = dimmer sky gradient (existing behavior). |
| Activity element positioning (viewBox coordinates) | Fixed positions: Writing desk (100, 340), Cushion (250, 350), Candle (400, 335), Bible (550, 345), Chime (650, 200 — on branch) | Non-overlapping positions within the 800×400 viewBox. Chime is higher because it hangs from a branch (Blooming+ only). Ground-level elements are near y=340-350 (above the ground layer at ~355-380). |
| Max activity elements at early stages | At Seedling/Sprout (stages 1-2): show up to 3 elements. At Blooming+ (stages 3-6): show all 5. Wind chime only at Blooming+ (stages 3-6). | Spec requirement. Early gardens have less visual space. Wind chime needs a branch to hang from. |
| Canvas SVG rendering approach | `XMLSerializer` → SVG Blob URL → `Image` → `canvas.drawImage()` | Spec-prescribed approach. Garden SVG uses inline fills/strokes (confirmed), so canvas rendering will capture colors correctly. CSS animations won't render (expected — static snapshot is fine). |
| SharePanel reuse | Create a new `GardenSharePanel` component rather than adapting `SharePanel` | `SharePanel` is designed for verse text + reference. Garden share has different layout (SVG + stats, no template picker, no size selector). A focused component is simpler. |
| Epiphany season handling | Treat as Christmas (same visual — warm, golden glow) | Epiphany is a single day (Jan 6). Spec lists 7 seasons but `useLiturgicalSeason` returns 8. Epiphany is visually similar to Christmas. Avoids an 8th visual variant for a single day. |
| Snow particles approach | CSS `@keyframes` on `<circle>` elements within the seasonal `<g>` overlay | Spec says "reuse confetti animation pattern" and "CSS-animated small circles." Using SVG circles with CSS animation (translateY + opacity) inside the SVG `<g>` group. |

---

## Implementation Steps

### Step 1: Activity Diversity Data Hook

**Objective:** Create a custom hook that reads existing localStorage data and returns which activity elements are unlocked.

**Files to create/modify:**
- `frontend/src/hooks/useGardenElements.ts` — NEW: hook that computes unlocked activity elements
- `frontend/src/hooks/__tests__/useGardenElements.test.ts` — NEW: unit tests

**Details:**

```typescript
// useGardenElements.ts
export interface GardenActivityElements {
  writingDesk: boolean   // journal entries >= 10
  cushion: boolean       // meditation sessions >= 10
  candle: boolean        // prayer wall days >= 10
  bible: boolean         // bible chapters >= 10
  windChime: boolean     // listening sessions >= 10
}

export function useGardenElements(): GardenActivityElements {
  // Read from localStorage directly (not via useFaithPoints — avoid coupling)
  // wr_daily_activities: Record<dateString, { journal?: boolean, prayerWall?: boolean, ... }>
  // wr_meditation_history: MeditationSession[] (array, count length)
  // wr_bible_progress: Record<bookName, number[]> (chapters array per book, sum all lengths)
  // wr_listening_history: ListeningSession[] (array, count length)

  // Return memoized result (useMemo with empty deps — computed once on mount)
}
```

Counting logic:
- **Journal:** Count days in `wr_daily_activities` where `journal === true`
- **Prayer Wall:** Count days in `wr_daily_activities` where `prayerWall === true`
- **Meditation:** `JSON.parse(localStorage.getItem('wr_meditation_history') || '[]').length`
- **Bible:** Sum of all chapter arrays across all books in `wr_bible_progress`: `Object.values(progress).reduce((sum, chapters) => sum + chapters.length, 0)`
- **Listening:** `JSON.parse(localStorage.getItem('wr_listening_history') || '[]').length`

All reads wrapped in try/catch with false fallback (corrupted localStorage graceful handling).

**Auth gating:** N/A — hook returns all-false defaults when data is absent.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT write to localStorage — read-only hook
- DO NOT import useFaithPoints — read localStorage directly to avoid circular dependency
- DO NOT use `new Date().toISOString().split('T')[0]` for date operations
- DO NOT add new localStorage keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns all false when localStorage is empty | unit | Default state with no data |
| returns writingDesk true when journal days >= 10 | unit | Mock wr_daily_activities with 10+ journal:true entries |
| returns writingDesk false when journal days < 10 | unit | Mock wr_daily_activities with 9 journal:true entries |
| returns cushion true when meditation sessions >= 10 | unit | Mock wr_meditation_history with 10+ items |
| returns bible true when chapters >= 10 | unit | Mock wr_bible_progress with total chapters >= 10 across books |
| returns windChime true when listening >= 10 | unit | Mock wr_listening_history with 10+ items |
| returns candle true when prayer wall days >= 10 | unit | Mock wr_daily_activities with 10+ prayerWall:true entries |
| handles corrupted localStorage gracefully | unit | Set invalid JSON, verify all-false return |
| memoizes result (no re-computation on re-render) | unit | Verify useMemo behavior |

**Expected state after completion:**
- [ ] `useGardenElements()` hook returns correct booleans for all 5 activity elements
- [ ] All 9 tests pass
- [ ] Hook reads from existing localStorage keys with no writes

---

### Step 2: Time-of-Day Sky Configuration

**Objective:** Create a utility that maps the current hour to sky gradient colors, and determines whether to show sun, moon, stars, or fireflies.

**Files to create/modify:**
- `frontend/src/components/dashboard/garden/gardenTimeOfDay.ts` — NEW: time-of-day sky configuration
- `frontend/src/components/dashboard/garden/__tests__/gardenTimeOfDay.test.ts` — NEW: unit tests

**Details:**

```typescript
// gardenTimeOfDay.ts
export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'dusk' | 'night'

export interface SkyConfig {
  timeOfDay: TimeOfDay
  skyGradientColors: [string, string]  // [top, bottom] for linearGradient stops
  showSun: boolean
  showMoon: boolean
  starCount: number      // 0, 2-3, or 5-8
  fireflyCount: number   // 0 or 2-4
}

export function getSkyConfig(hour: number, streakActive: boolean): SkyConfig
```

| Time Range | skyGradientColors (streak active) | showSun | showMoon | starCount | fireflyCount |
|------------|----------------------------------|---------|----------|-----------|--------------|
| Dawn (5-7) | `['#1E0B3E', '#D97706']` (purple to warm amber at horizon) | true | false | 0 | 0 |
| Day (8-16) | `['#0D0620', '#1E0B3E']` (current default) | true | false | 0 | 0 |
| Golden (17-19) | `['#1E0B3E', '#D97706']` (purple to amber, slightly warmer than dawn) | true | false | 0 | 0 |
| Dusk (20-21) | `['#0D0620', '#251248']` (deep purple to hero-deep) | false | false | 3 | 0 |
| Night (22-4) | `['#050210', '#0D0620']` (very deep navy to hero-dark) | false | true | 7 | 3 |

When `streakActive === false`: dim all gradient colors by mixing toward `#1a1025` (existing inactive pattern). Sun/moon/star/firefly visibility unchanged.

[UNVERIFIED] Dawn/Golden gradient bottom color `#D97706` (amber) — chosen to match mood color "Struggling" which is a warm amber. May be too saturated.
→ To verify: Run /verify-with-playwright and visually inspect dawn/golden hour sky
→ If wrong: Adjust to a softer warm tone like `#92571A` or `#6B4E1B` (earthMd from garden palette)

[UNVERIFIED] Night sky top color `#050210` — derived by darkening `#0D0620` further.
→ To verify: Visual inspection — garden details must remain visible against night sky
→ If wrong: Lighten to `#080415` or use existing `#0D0620` with lower opacity overlay

**Auth gating:** N/A — pure utility function.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use Date object inside the utility — accept `hour: number` parameter for testability
- DO NOT make the sky so dark that garden elements become invisible
- DO NOT add interval timers — the caller checks time on mount only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns dawn config for hours 5-7 | unit | Verify sky colors, showSun true, no stars |
| returns day config for hours 8-16 | unit | Verify default sky colors |
| returns golden config for hours 17-19 | unit | Verify warm amber tint |
| returns dusk config for hours 20-21 | unit | Verify deep purple, 3 stars, no sun/moon |
| returns night config for hours 22-4 | unit | Verify moon, 7 stars, 3 fireflies |
| handles hour 0 (midnight) as night | unit | Edge case: midnight |
| handles hour 4 as night | unit | Edge case: 4 AM still night |
| handles hour 5 as dawn | unit | Edge case: dawn boundary |
| dims gradient when streakActive is false | unit | Verify colors shift toward inactive palette |

**Expected state after completion:**
- [ ] `getSkyConfig()` returns correct configuration for all 5 time periods
- [ ] All 9 tests pass
- [ ] Function is pure (no side effects, no Date usage)

---

### Step 3: Seasonal Overlay Configuration

**Objective:** Create a utility mapping liturgical seasons to garden visual overlays (CSS filters, SVG overlay elements).

**Files to create/modify:**
- `frontend/src/components/dashboard/garden/gardenSeasons.ts` — NEW: seasonal overlay config
- `frontend/src/components/dashboard/garden/__tests__/gardenSeasons.test.ts` — NEW: unit tests

**Details:**

```typescript
// gardenSeasons.ts
export interface SeasonalOverlayConfig {
  seasonName: string
  cssFilter?: string               // e.g., 'saturate(0.7)' for Lent
  skyGradientAdjust?: [string, string] | null  // override sky gradient if needed
  showSnow: boolean                // Advent, Christmas
  showGroundSnow: boolean          // Christmas only
  showStar: boolean                // Advent, Christmas (brighter)
  starBrightness: number           // 0-1, 0.6 for Advent, 0.9 for Christmas
  showFlowers: boolean             // Easter
  showCross: boolean               // Holy Week
  showWarmGlow: boolean            // Christmas (golden glow from below), Pentecost (flame)
  foliageSaturation: number        // 1.0 default, 0.7 for Lent/Holy Week
}

export function getSeasonalOverlay(seasonName: string): SeasonalOverlayConfig
```

Season mapping (from spec):

| Season | cssFilter | showSnow | showGroundSnow | showStar | showFlowers | showCross | showWarmGlow | foliageSaturation |
|--------|-----------|----------|----------------|----------|-------------|-----------|--------------|-------------------|
| Advent | none | true | false | true (0.6) | false | false | false | 1.0 |
| Christmas | none | true | true | true (0.9) | false | false | true | 1.0 |
| Epiphany | none | false | false | true (0.9) | false | false | true | 1.0 |
| Lent | `saturate(0.7)` | false | false | false | false | false | false | 0.7 |
| Holy Week | `saturate(0.7) brightness(0.85)` | false | false | false | false | true | false | 0.7 |
| Easter | `saturate(1.2)` | false | false | false | true | false | false | 1.0 |
| Pentecost | none | false | false | false | false | false | true | 1.0 |
| Ordinary Time | none | false | false | false | false | false | false | 1.0 |

**Auth gating:** N/A — pure utility function.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add complex SVG path data here — this is config only. SVG elements are in Step 5.
- DO NOT modify the `useLiturgicalSeason` hook
- DO NOT add new Tailwind animation keyframes yet (those go in Step 4)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns snow config for Advent | unit | showSnow true, showStar true at 0.6 brightness |
| returns Christmas config | unit | showSnow + showGroundSnow + star at 0.9 + warmGlow |
| returns Lent desaturation filter | unit | cssFilter includes saturate(0.7), foliageSaturation 0.7 |
| returns Holy Week darker config | unit | cssFilter includes brightness(0.85), showCross true |
| returns Easter vibrant config | unit | showFlowers true, saturate(1.2) |
| returns Pentecost warm glow | unit | showWarmGlow true |
| returns empty config for Ordinary Time | unit | All overlays off |
| handles Epiphany as Christmas variant | unit | Star + warmGlow, no snow |

**Expected state after completion:**
- [ ] `getSeasonalOverlay()` returns correct config for all 8 seasons
- [ ] All 8 tests pass
- [ ] Config object is self-describing (no SVG implementation details)

---

### Step 4: Tailwind Animation Keyframes for New Effects

**Objective:** Add CSS animation keyframes for snow falling, star twinkle, firefly glow, and flame flicker to the Tailwind config.

**Files to create/modify:**
- `frontend/tailwind.config.js` — ADD new keyframes and animation utilities

**Details:**

Add to the existing `keyframes` section (after line 200 in tailwind.config.js):

```javascript
// Snow falling (Advent/Christmas) — slow descent, slight horizontal drift
'garden-snow-fall': {
  '0%': { transform: 'translateY(-20px) translateX(0)', opacity: '0' },
  '10%': { opacity: '0.8' },
  '100%': { transform: 'translateY(420px) translateX(10px)', opacity: '0' },
},
// Star twinkle (Dusk/Night) — opacity oscillation
'garden-star-twinkle': {
  '0%, 100%': { opacity: '0.3' },
  '50%': { opacity: '0.7' },
},
// Firefly glow (Night) — slow pulse with slight movement
'garden-firefly-glow': {
  '0%, 100%': { opacity: '0.2', transform: 'translate(0, 0)' },
  '25%': { opacity: '0.5', transform: 'translate(3px, -2px)' },
  '50%': { opacity: '0.15', transform: 'translate(-2px, 1px)' },
  '75%': { opacity: '0.45', transform: 'translate(1px, 3px)' },
},
// Flame flicker (Pentecost, prayer candle) — subtle scale/opacity variation
'garden-flame-flicker': {
  '0%, 100%': { opacity: '0.8', transform: 'scaleY(1) scaleX(1)' },
  '25%': { opacity: '1', transform: 'scaleY(1.05) scaleX(0.95)' },
  '50%': { opacity: '0.7', transform: 'scaleY(0.95) scaleX(1.05)' },
  '75%': { opacity: '0.9', transform: 'scaleY(1.02) scaleX(0.98)' },
},
// Seasonal overlay fade-in (1 second, as spec requires)
'garden-seasonal-fade': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
// Activity element fade-in (500ms, as spec requires)
'garden-element-fade': {
  '0%': { opacity: '0', transform: 'translateY(5px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
```

Add to the existing `animation` section:

```javascript
'garden-snow-fall': 'garden-snow-fall 8s linear infinite',
'garden-star-twinkle': 'garden-star-twinkle 3.5s ease-in-out infinite',
'garden-firefly-glow': 'garden-firefly-glow 5s ease-in-out infinite',
'garden-flame-flicker': 'garden-flame-flicker 2s ease-in-out infinite',
'garden-seasonal-fade': 'garden-seasonal-fade 1s ease-out forwards',
'garden-element-fade': 'garden-element-fade 500ms ease-out forwards',
```

**Auth gating:** N/A — configuration only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any existing animation keyframes
- DO NOT remove any existing animation definitions
- DO NOT use durations outside the spec's requirements (snow: slow, twinkle: 3-4s, fade: 1s)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tailwind config is valid (build compiles) | integration | Run `pnpm build` to verify no config errors |

**Expected state after completion:**
- [ ] 6 new keyframe definitions in tailwind.config.js
- [ ] 6 new animation utilities available as `animate-garden-*`
- [ ] Build compiles without errors
- [ ] Existing animations unchanged

---

### Step 5: GrowthGarden SVG Enhancements (Seasonal + Activity + Time-of-Day)

**Objective:** Modify GrowthGarden.tsx to integrate seasonal overlays, activity elements, and time-of-day lighting into the SVG.

**Files to create/modify:**
- `frontend/src/components/dashboard/GrowthGarden.tsx` — MODIFY: add new props, integrate overlays
- `frontend/src/components/dashboard/garden/SeasonalOverlay.tsx` — NEW: SVG `<g>` seasonal overlay
- `frontend/src/components/dashboard/garden/ActivityElements.tsx` — NEW: SVG `<g>` activity decorations
- `frontend/src/components/dashboard/garden/NightSky.tsx` — NEW: moon, stars, fireflies SVG elements

**Details:**

**5a. New props for GrowthGarden:**

```typescript
export interface GrowthGardenProps {
  stage: 1 | 2 | 3 | 4 | 5 | 6
  animated?: boolean
  showSparkle?: boolean
  streakActive?: boolean
  size: 'sm' | 'md' | 'lg'
  amplifiedSparkle?: boolean
  showRainbow?: boolean
  // NEW props:
  seasonName?: string              // from useLiturgicalSeason
  activityElements?: GardenActivityElements  // from useGardenElements
  hourOverride?: number            // for testing; defaults to new Date().getHours()
}
```

**5b. SkyBackground modification:**

In `SkyBackground` (lines 54-70), replace hardcoded gradient with `getSkyConfig()`:

```typescript
function SkyBackground({ streakActive, uid, hour }: { streakActive: boolean; uid: string; hour: number }) {
  const sky = getSkyConfig(hour, streakActive)
  return (
    <defs>
      <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={sky.skyGradientColors[0]} />
        <stop offset="100%" stopColor={sky.skyGradientColors[1]} />
      </linearGradient>
    </defs>
  )
}
```

**5c. SkyElements replacement:**

Replace sun/clouds logic to use `SkyConfig`:

- `sky.showSun`: Render existing sun circles (white, opacity 0.7-0.8, at x=680 y=80)
- `sky.showMoon`: Render crescent moon SVG path (white/pale yellow, ~25px radius, at x=680 y=80). Simple crescent: two overlapping circles, outer white, inner with sky background color
- Stars: Render `sky.starCount` small circles (r=1.5-2.5, fill white, opacity 0.3-0.6) at predetermined positions in upper half of viewBox. Apply `motion-safe:animate-garden-star-twinkle` with staggered `animation-delay`
- Fireflies: Render `sky.fireflyCount` circles (r=2, fill `#BEF264` lime-green, opacity 0.2-0.5) near ground level (y=300-370). Apply `motion-safe:animate-garden-firefly-glow` with staggered delays

**5d. NightSky component:**

```typescript
// NightSky.tsx — renders moon, stars, fireflies as SVG elements
export function NightSky({ skyConfig, prefersReduced }: { skyConfig: SkyConfig; prefersReduced: boolean }) {
  // Predetermined star positions (upper half of viewBox)
  const STAR_POSITIONS = [
    { cx: 120, cy: 60, r: 2 }, { cx: 280, cy: 45, r: 1.5 }, { cx: 450, cy: 70, r: 2.5 },
    { cx: 580, cy: 35, r: 1.5 }, { cx: 350, cy: 90, r: 2 }, { cx: 700, cy: 55, r: 1.5 },
    { cx: 200, cy: 30, r: 2 }, { cx: 520, cy: 85, r: 2 },
  ]
  const FIREFLY_POSITIONS = [
    { cx: 180, cy: 320 }, { cx: 400, cy: 340 }, { cx: 600, cy: 310 },
  ]
  // Render first N stars/fireflies based on skyConfig counts
  // Moon: two circles (outer r=20 white, inner r=18 offset by 8px using sky gradient color)
}
```

**5e. SeasonalOverlay component:**

```typescript
// SeasonalOverlay.tsx — renders seasonal SVG overlays
export function SeasonalOverlay({ config, stage, prefersReduced }: Props) {
  // <g> wrapper with 'motion-safe:animate-garden-seasonal-fade'

  // Snow particles (Advent/Christmas): 15-20 small circles (r=1.5-3)
  // at random-ish x positions across viewBox width, animated with
  // 'motion-safe:animate-garden-snow-fall' and staggered animation-delay (0-8s)
  // Static fallback for prefers-reduced-motion: show circles scattered across sky

  // Ground snow (Christmas): single white path at ground level, opacity 0.3

  // Star of Bethlehem (Advent/Christmas): larger star SVG element at top-center (x=400, y=40)
  // 5-point star path, fill yellow (#FBBF24), brightness based on config.starBrightness

  // Easter flowers: 5 small flower SVG groups at garden base
  // Each: outer circle (r=6, fill #F472B6 pink), inner circle (r=3, fill #FBBF24 yellow)
  // Positioned at y=340-360, staggered x (150, 280, 380, 500, 620)
  // animation-delay: 0, 500ms, 1000ms, 1500ms, 2000ms

  // Holy Week cross: small cross silhouette at horizon (x=400, y=120)
  // Two thin rects (vertical 20×4, horizontal 12×4), fill white opacity 0.15

  // Pentecost warm glow: Use flame-flicker animation on existing sun/light elements
  // Apply via CSS class to SunlightRays group (pass down config flag)

  // CSS filter: Apply config.cssFilter to the foliage <g> group via style attribute
}
```

**5f. ActivityElements component:**

```typescript
// ActivityElements.tsx — renders activity decoration SVG elements
export function ActivityElements({
  elements, stage, prefersReduced
}: { elements: GardenActivityElements; stage: 1|2|3|4|5|6; prefersReduced: boolean }) {
  // Max elements: stages 1-2 show first 3 unlocked, stages 3-6 show all 5
  // Wind chime only at stages 3-6

  // Each element: <g> with 'motion-safe:animate-garden-element-fade'
  // and staggered animation-delay (0, 100ms, 200ms...)
  // Static (no fade) when prefersReduced

  // Writing Desk (x=100, y=330): rect 30×20 brown (#5C4033) desk top,
  //   rect 4×10 brown legs, small open book (two parallelogram paths, #FBBF24 pages)

  // Meditation Cushion (x=250, y=355): ellipse rx=15 ry=8 fill #6D28D9 (purple),
  //   small ellipse rx=12 ry=5 fill #A78BFA (lighter top)

  // Prayer Candle (x=400, y=325): rect 4×15 #FBBF24 candle body,
  //   ellipse rx=4 ry=6 fill #D97706 flame with flame-flicker animation

  // Open Bible (x=550, y=340): rect 20×15 #5C4033 cover, two page rects #FDE68A,
  //   small line down center

  // Wind Chime (x=650, y=200): line stroke #9CA3AF from branch point down,
  //   3 small rects (3×10) hanging from a horizontal bar, fill #9CA3AF
}
```

**5g. Integration in GrowthGarden main component:**

```typescript
export function GrowthGarden({
  stage, animated, showSparkle, streakActive = false, size,
  amplifiedSparkle, showRainbow,
  seasonName, activityElements, hourOverride,
}: GrowthGardenProps) {
  const uid = useId().replace(/:/g, '')
  const prefersReduced = useReducedMotion()
  const hour = hourOverride ?? new Date().getHours()
  const skyConfig = getSkyConfig(hour, streakActive)
  const seasonalConfig = seasonName ? getSeasonalOverlay(seasonName) : null

  // Render order within SVG:
  // 1. SkyBackground (modified for time-of-day)
  // 2. NightSky elements (moon, stars, fireflies — behind main content)
  // 3. SkyElements (sun only if skyConfig.showSun, clouds if !streakActive && daytime)
  // 4. GroundLayer
  // 5. Stage-specific content (existing 6 stages unchanged)
  // 6. ActivityElements overlay <g>
  // 7. SeasonalOverlay <g> (snow, flowers, cross, star — on top of everything except sparkle)
  // 8. CSS filter on foliage group if seasonalConfig.cssFilter

  // Apply Lent/Holy Week foliage desaturation:
  // Wrap stage foliage elements in a <g style={{ filter: seasonalConfig?.cssFilter }}>
}
```

**Auth gating:** N/A — component is only rendered within auth-gated dashboard.

**Responsive behavior:**
- Desktop (1440px): Full SVG at h-[300px], all overlays visible, all animations active
- Tablet (768px): SVG at h-[200px], same overlays (viewBox scaling handles proportions)
- Mobile (375px): SVG at h-[200px], same overlays, animations respect `prefers-reduced-motion`

**Guardrails (DO NOT):**
- DO NOT modify existing stage content (lines 206-591 in current GrowthGarden.tsx)
- DO NOT use Tailwind classes for SVG fill/stroke colors — use inline attributes
- DO NOT use `className` for SVG positioning — use `cx`, `cy`, `x`, `y` attributes
- DO NOT make the CSS filter affect the entire SVG — only foliage/leaf groups
- DO NOT add `<style>` tags inside SVG — use inline `style` for animation-delay
- DO NOT exceed ~150 new lines of SVG per sub-component (keep garden manageable)
- DO NOT import heavy dependencies — all SVG is hand-crafted

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders seasonal snow overlay for Advent | integration | Mock useLiturgicalSeason → Advent, verify snow circles present |
| renders ground snow for Christmas | integration | Mock season → Christmas, verify ground snow path |
| renders Easter flowers | integration | Mock season → Easter, verify flower elements (5 groups) |
| renders Holy Week cross | integration | Mock season → Holy Week, verify cross rects |
| renders no overlay for Ordinary Time | integration | Default season, verify no overlay group |
| applies Lent desaturation filter | integration | Mock season → Lent, verify filter style on foliage group |
| renders writing desk when journal >= 10 | integration | Pass activityElements with writingDesk:true, verify desk elements |
| renders cushion when meditation >= 10 | integration | Pass activityElements with cushion:true |
| hides wind chime at stages 1-2 | integration | Pass windChime:true at stage 1, verify chime absent |
| shows wind chime at stage 3+ | integration | Pass windChime:true at stage 3, verify chime present |
| limits to 3 elements at stage 1 | integration | Pass all 5 elements true at stage 1, verify max 3 rendered |
| renders moon at night (hour 23) | integration | Pass hourOverride=23, verify moon SVG present |
| renders stars at dusk (hour 20) | integration | Pass hourOverride=20, verify 3 star circles |
| renders fireflies at night | integration | Pass hourOverride=23, verify firefly circles |
| renders sun during day (hour 12) | integration | Pass hourOverride=12, verify sun circles (existing test adapted) |
| all existing garden tests still pass | regression | Run existing 4 test files unchanged |

**Expected state after completion:**
- [ ] GrowthGarden renders seasonal overlays driven by `seasonName` prop
- [ ] GrowthGarden renders activity elements driven by `activityElements` prop
- [ ] GrowthGarden sky changes based on time-of-day (`hourOverride` or system clock)
- [ ] All animations use `motion-safe:` prefix
- [ ] Static fallbacks render when `prefers-reduced-motion` is enabled
- [ ] All 16 new tests pass + all existing tests pass with no regressions

---

### Step 6: Garden Share Canvas Renderer

**Objective:** Create a canvas rendering function that serializes the garden SVG to a shareable 1080×1080 image with text overlays.

**Files to create/modify:**
- `frontend/src/lib/garden-share-canvas.ts` — NEW: canvas renderer
- `frontend/src/lib/__tests__/garden-share-canvas.test.ts` — NEW: unit tests

**Details:**

Follow the pattern from `challenge-share-canvas.ts` (112 lines).

```typescript
// garden-share-canvas.ts
export interface GardenShareOptions {
  gardenSvgElement: SVGSVGElement  // ref to the rendered SVG DOM element
  userName: string
  levelName: string
  streakCount: number
}

export async function generateGardenShareImage(options: GardenShareOptions): Promise<Blob> {
  const { gardenSvgElement, userName, levelName, streakCount } = options

  // 1. Load fonts
  await Promise.all([
    document.fonts.load('bold 72px Caveat'),
    document.fonts.load('bold 36px Inter'),
    document.fonts.load('28px Caveat'),
  ])

  // 2. Create 1080×1080 canvas
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!

  // 3. Draw background gradient (#0D0620 → #1E0B3E)
  const bg = ctx.createLinearGradient(0, 0, 0, 1080)
  bg.addColorStop(0, '#0D0620')
  bg.addColorStop(1, '#1E0B3E')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1080, 1080)

  // 4. Serialize SVG → Blob → Image → drawImage
  const svgString = new XMLSerializer().serializeToString(gardenSvgElement)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load garden SVG as image'))
    img.src = url
  })

  // Draw garden in upper 70% of canvas (with padding)
  const gardenY = 40
  const gardenHeight = 1080 * 0.65
  const gardenWidth = 1080 - 80  // 40px padding each side
  ctx.drawImage(img, 40, gardenY, gardenWidth, gardenHeight)
  URL.revokeObjectURL(url)

  // 5. Text overlays (lower 30%)
  const textY = gardenY + gardenHeight + 40

  // User name's garden
  ctx.font = 'bold 48px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.fillText(`${userName}'s Garden`, 540, textY)

  // Level + streak
  ctx.font = '32px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText(`${levelName}`, 540, textY + 50)

  if (streakCount > 0) {
    ctx.fillText(`🔥 ${streakCount}-day streak`, 540, textY + 90)
  }

  // Watermark
  ctx.font = '28px Caveat, cursive'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('Worship Room', 540, 1050)

  // 6. Return blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/png'
    )
  })
}
```

**Auth gating:** N/A — utility function, caller handles auth context.

**Responsive behavior:** N/A: no UI impact (canvas is always 1080×1080 regardless of viewport).

**Guardrails (DO NOT):**
- DO NOT add `html2canvas` as a dependency
- DO NOT use `innerHTML` or `outerHTML` — use `XMLSerializer` for SVG serialization
- DO NOT crash on SVG render failure — return a rejected promise with descriptive error
- DO NOT reference CSS animations in the SVG string (they won't render — static snapshot is expected)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| generates a Blob of type image/png | unit | Mock canvas context, verify toBlob called with 'image/png' |
| draws background gradient | unit | Mock ctx, verify createLinearGradient called with correct colors |
| serializes SVG via XMLSerializer | unit | Mock XMLSerializer, verify serializeToString called |
| draws text overlays (name, level, streak) | unit | Mock ctx.fillText, verify calls with expected strings |
| omits streak text when streakCount is 0 | unit | Verify streak fillText not called when count is 0 |
| rejects on SVG image load failure | unit | Mock Image to trigger onerror, verify promise rejects |
| revokes object URL after use | unit | Verify URL.revokeObjectURL called |

**Expected state after completion:**
- [ ] `generateGardenShareImage()` produces a 1080×1080 PNG blob
- [ ] SVG is rendered via XMLSerializer → Blob → Image → canvas.drawImage
- [ ] Text overlays include user name, level, streak, watermark
- [ ] Graceful error handling (rejected promise, no crashes)
- [ ] All 7 tests pass

---

### Step 7: Share Button UI Integration

**Objective:** Add a share button to the garden dashboard card, wire up canvas generation, and open a share dialog.

**Files to create/modify:**
- `frontend/src/components/dashboard/GardenShareButton.tsx` — NEW: share button + dialog
- `frontend/src/pages/Dashboard.tsx` — MODIFY: pass share button and new props to garden
- `frontend/src/components/dashboard/GrowthGarden.tsx` — MODIFY: expose SVG ref via forwardRef

**Details:**

**7a. GrowthGarden forwardRef:**

Wrap GrowthGarden export with `forwardRef` to expose a ref to the main SVG element:

```typescript
export const GrowthGarden = React.forwardRef<SVGSVGElement, GrowthGardenProps>(
  function GrowthGarden(props, ref) {
    // ... existing component logic
    // Apply ref to the main <svg> element (the non-transitioning one)
    return (
      <div className={cn(SIZE_CLASSES[size], 'relative overflow-hidden rounded-xl')}>
        <svg ref={ref} ... >
```

**7b. GardenShareButton component:**

```typescript
// GardenShareButton.tsx
import { Share2 } from 'lucide-react'

interface GardenShareButtonProps {
  gardenRef: React.RefObject<SVGSVGElement>
  userName: string
  levelName: string
  streakCount: number
}

export function GardenShareButton({ gardenRef, userName, levelName, streakCount }: Props) {
  const { show: showToast } = useToast()
  const { play: playSound } = useSoundEffects()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = async () => {
    if (!gardenRef.current || isGenerating) return
    setIsGenerating(true)

    try {
      const blob = await generateGardenShareImage({
        gardenSvgElement: gardenRef.current,
        userName, levelName, streakCount,
      })

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'my-garden.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${userName}'s Growth Garden` })
          playSound('chime')
          return
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-garden.png'
      a.click()
      URL.revokeObjectURL(url)
      playSound('chime')
      showToast('Garden image downloaded!', { type: 'success' })
    } catch {
      showToast('Could not generate garden image. Please try again.', { type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isGenerating}
      className="rounded-lg p-2 text-white/40 transition-colors hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
      aria-label="Share your garden"
      title="Share your garden"
    >
      <Share2 className="h-5 w-5" />
    </button>
  )
}
```

**7c. Dashboard.tsx integration:**

In the `gardenSlot` section (lines 451-477), add the share button and pass new props:

```tsx
gardenSlot={
  <div>
    <div className="flex items-center justify-between">
      <p className="text-xs text-white/60">Your Garden</p>
      <GardenShareButton
        gardenRef={gardenRef}
        userName={faithPoints.user?.name || userName}
        levelName={faithPoints.levelName}
        streakCount={faithPoints.currentStreak}
      />
    </div>
    <div className="mt-1 lg:hidden">
      <GrowthGarden
        ref={gardenRef}
        stage={faithPoints.currentLevel as 1 | 2 | 3 | 4 | 5 | 6}
        animated={true}
        showSparkle={gardenSparkle}
        amplifiedSparkle={gardenLevelUp}
        streakActive={faithPoints.currentStreak > 0}
        showRainbow={showRainbow}
        size="md"
        seasonName={season.seasonName}
        activityElements={gardenElements}
      />
    </div>
    <div className="mt-1 hidden lg:block">
      <GrowthGarden
        ref={gardenRef}  // ref attaches to whichever is visible
        stage={...}
        ...
        seasonName={season.seasonName}
        activityElements={gardenElements}
      />
    </div>
  </div>
}
```

Add to Dashboard component:
```typescript
const gardenRef = useRef<SVGSVGElement>(null)
const season = useLiturgicalSeason()
const gardenElements = useGardenElements()
```

Note: `gardenRef` will only attach to one SVG (the visible one based on viewport). This is fine — the share button generates from whichever SVG is currently rendered.

**Auth gating:** Inherited — dashboard is auth-gated. Share button only visible within auth-gated context.

**Responsive behavior:**
- Desktop (1440px): Share button in top-right of garden label row. 40px button (p-2 + 20px icon)
- Tablet (768px): Same layout
- Mobile (375px): Share button meets 44px touch target via p-2 (16px padding) + 20px icon = 52px tappable area

**Guardrails (DO NOT):**
- DO NOT reuse `SharePanel` component — it's designed for verse text, not garden SVG
- DO NOT crash on share failure — show error toast
- DO NOT import `html2canvas`
- DO NOT add a template picker or size selector — garden share is single-format (1080×1080)
- DO NOT add loading spinner inside the garden — use button disabled state only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders share button with Share2 icon | unit | Verify button rendered with correct aria-label |
| calls generateGardenShareImage on click | integration | Mock canvas function, verify called with correct args |
| shows error toast on generation failure | integration | Mock canvas to reject, verify toast shown |
| disables button while generating | unit | Click button, verify disabled state during async operation |
| GrowthGarden passes ref to SVG element | unit | Render with ref, verify ref.current is SVGSVGElement |
| Dashboard passes seasonName and activityElements | integration | Render Dashboard with mocked hooks, verify props passed |

**Expected state after completion:**
- [ ] Share button visible in top-right of garden label
- [ ] Click generates 1080×1080 PNG via canvas
- [ ] Web Share API used when available, download fallback otherwise
- [ ] Error toast on failure (not a crash)
- [ ] Sound effect plays on successful share
- [ ] All 6 tests pass

---

### Step 8: Accessibility & Reduced Motion

**Objective:** Ensure all new visual elements have appropriate accessibility attributes and static fallbacks for `prefers-reduced-motion`.

**Files to create/modify:**
- `frontend/src/components/dashboard/GrowthGarden.tsx` — MODIFY: update aria-label
- `frontend/src/components/dashboard/garden/SeasonalOverlay.tsx` — MODIFY: reduced motion fallbacks
- `frontend/src/components/dashboard/garden/NightSky.tsx` — MODIFY: reduced motion fallbacks
- `frontend/src/components/dashboard/garden/ActivityElements.tsx` — MODIFY: reduced motion fallbacks
- `frontend/src/components/dashboard/__tests__/GrowthGarden-a11y.test.tsx` — MODIFY: add tests

**Details:**

**8a. Updated aria-label:**

Update `STAGE_LABELS` to include seasonal and time-of-day context:

```typescript
// Dynamic aria-label that includes seasonal context
function getGardenAriaLabel(stage: number, seasonName?: string, timeOfDay?: string): string {
  const base = STAGE_LABELS[stage as keyof typeof STAGE_LABELS]
  const seasonSuffix = seasonName && seasonName !== 'Ordinary Time' ? ` during ${seasonName}` : ''
  const timeSuffix = timeOfDay === 'night' ? ' at night' : timeOfDay === 'dawn' ? ' at dawn' : ''
  return `${base}${seasonSuffix}${timeSuffix}`
}
```

**8b. Reduced motion fallbacks:**

For each animated element, when `prefersReduced` is true:
- **Snow:** Show 8-10 static snow circles scattered across sky (no falling animation)
- **Stars:** Show at full opacity 0.5 (no twinkle)
- **Fireflies:** Show at opacity 0.3 (no pulse)
- **Flames:** Show at opacity 0.8 (no flicker)
- **Activity elements:** Show immediately at full opacity (no fade-in)
- **Seasonal overlay:** Show immediately at full opacity (no 1-second fade)

All achieved by conditionally applying animation classes only when `!prefersReduced`.

**8c. Focus management for share button:**

Share button has `focus:ring-2 focus:ring-white/30` for keyboard focus indicator.

**Auth gating:** N/A — accessibility layer only.

**Responsive behavior:** N/A: no UI impact (accessibility attributes are viewport-independent).

**Guardrails (DO NOT):**
- DO NOT remove `motion-safe:` prefix from any existing animations
- DO NOT hide elements when motion is reduced — show static versions
- DO NOT change the STAGE_LABELS export (it may be used by tests) — create a new function for dynamic labels

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| aria-label includes season name | unit | Render with seasonName="Advent", verify aria-label contains "during Advent" |
| aria-label excludes Ordinary Time | unit | Render with seasonName="Ordinary Time", verify no season suffix |
| aria-label includes "at night" for night time | unit | Render with hourOverride=23, verify aria-label contains "at night" |
| static snow when prefers-reduced-motion | unit | Mock useReducedMotion → true, verify no animation classes on snow |
| static stars when prefers-reduced-motion | unit | Mock useReducedMotion → true, verify stars have no twinkle class |
| activity elements visible without fade when reduced motion | unit | Mock useReducedMotion → true, verify opacity-1 on elements |
| share button has focus ring | unit | Verify focus:ring-2 class present |
| share button has aria-label | unit | Verify "Share your garden" accessible name |

**Expected state after completion:**
- [ ] Dynamic aria-label reflects season and time-of-day
- [ ] All animations have static fallbacks for reduced motion
- [ ] Share button is keyboard accessible with visible focus indicator
- [ ] All 8 tests pass

---

### Step 9: Existing Test Updates & Regression Suite

**Objective:** Update existing GrowthGarden tests to account for new props, and add a comprehensive regression test ensuring all 6 stages render correctly with all enhancements active simultaneously.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/GrowthGarden.test.tsx` — MODIFY: update mocks and existing tests
- `frontend/src/components/dashboard/__tests__/GrowthGarden-a11y.test.tsx` — MODIFY: update for new aria-label
- `frontend/src/components/dashboard/__tests__/GrowthGarden-enhancement.test.tsx` — NEW: comprehensive enhancement tests

**Details:**

**9a. Update existing test mocks:**

The existing tests mock `useLiturgicalSeason` at module level. Since `GrowthGarden` now accepts `seasonName` as a prop (not calling the hook directly), existing tests continue to work unchanged — the hook mock only affects Dashboard-level tests.

Update any existing tests that render `GrowthGarden` to pass `seasonName={undefined}` (default Ordinary Time behavior) to verify backward compatibility.

**9b. New comprehensive test file:**

`GrowthGarden-enhancement.test.tsx` covers all new features together:

```typescript
describe('GrowthGarden Enhancement', () => {
  describe('seasonal + activity + time-of-day combined', () => {
    it('renders all three overlays simultaneously at stage 4', () => {
      // Render with seasonName="Easter", activityElements all true, hourOverride=21 (dusk)
      // Verify: Easter flowers present, activity elements present, dusk stars present
    })

    it.each([1,2,3,4,5,6])('stage %i renders correctly with all enhancements', (stage) => {
      // Render with Easter + all activities + night
      // Verify: stage testid present, no crashes, correct structure
    })
  })

  describe('performance safeguard', () => {
    it('total SVG child elements stay under 200', () => {
      // Render stage 6 with all enhancements maxed
      // Count all SVG child elements, verify < 200
    })
  })
})
```

**Auth gating:** N/A — tests only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing test assertions — add new tests alongside
- DO NOT remove the existing `useLiturgicalSeason` mock from test files (it's still needed for DashboardHero tests)
- DO NOT skip any existing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| all 6 stages render with all enhancements | regression | Each stage + Easter + all activities + night hour |
| backward compatibility (no new props) | regression | Render GrowthGarden with only original props — no errors |
| SVG child count under limit | performance | Stage 6 maxed out, verify < 200 SVG elements |
| existing tests still pass | regression | Run all 4 original test files |

**Expected state after completion:**
- [ ] All existing GrowthGarden tests pass unchanged
- [ ] New enhancement tests verify combined overlay behavior
- [ ] Regression suite covers all 6 stages with full enhancements
- [ ] No performance concerns (SVG element count bounded)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Activity diversity data hook (useGardenElements) |
| 2 | — | Time-of-day sky configuration utility |
| 3 | — | Seasonal overlay configuration utility |
| 4 | — | Tailwind animation keyframes |
| 5 | 1, 2, 3, 4 | GrowthGarden SVG enhancements (core visual changes) |
| 6 | — | Garden share canvas renderer |
| 7 | 5, 6 | Share button UI integration (needs ref from Step 5, canvas from Step 6) |
| 8 | 5 | Accessibility & reduced motion (reviews overlays from Step 5) |
| 9 | 5, 7, 8 | Test updates & regression suite (covers all changes) |

Steps 1, 2, 3, 4, and 6 can be implemented in parallel (no dependencies between them).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Activity Diversity Data Hook | [COMPLETE] | 2026-04-01 | Created `hooks/useGardenElements.ts` + test (9/9 pass). Reads wr_daily_activities, wr_meditation_history, wr_bible_progress, wr_listening_history. |
| 2 | Time-of-Day Sky Configuration | [COMPLETE] | 2026-04-01 | Created `garden/gardenTimeOfDay.ts` + test (9/9 pass). Pure function: hour + streakActive → SkyConfig. |
| 3 | Seasonal Overlay Configuration | [COMPLETE] | 2026-04-01 | Created `garden/gardenSeasons.ts` + test (8/8 pass). Maps 8 liturgical seasons to overlay config. |
| 4 | Tailwind Animation Keyframes | [COMPLETE] | 2026-04-01 | Added 6 keyframes + 6 animation utilities to tailwind.config.js. Tailwind compiles clean. |
| 5 | GrowthGarden SVG Enhancements | [COMPLETE] | 2026-04-01 | Modified GrowthGarden.tsx (+new props, time-of-day sky, seasonal filter wrap). Created NightSky.tsx, SeasonalOverlay.tsx, ActivityElements.tsx. 17 new tests + 80 existing tests pass. |
| 6 | Garden Share Canvas Renderer | [COMPLETE] | 2026-04-01 | Created `lib/garden-share-canvas.ts` + test (7/7 pass). XMLSerializer → Blob → Image → canvas.drawImage. Text overlays: name, level, streak, watermark. |
| 7 | Share Button UI Integration | [COMPLETE] | 2026-04-01 | Created GardenShareButton.tsx. Added forwardRef to GrowthGarden. Updated Dashboard.tsx with gardenRef, season, gardenElements, share button. 6/6 tests pass. |
| 8 | Accessibility & Reduced Motion | [COMPLETE] | 2026-04-01 | Added getGardenAriaLabel() with season/time-of-day context. Added hourOverride to time-sensitive tests to prevent flakiness. 7 new a11y tests + all existing pass (104 total across 5 files). |
| 9 | Existing Test Updates & Regression | [COMPLETE] | 2026-04-01 | Added regression tests (6 stages × all enhancements), combined overlay test, SVG element count safeguard (<200). Added hourOverride to time-sensitive existing tests. 151 total tests across 10 files, all passing. |
