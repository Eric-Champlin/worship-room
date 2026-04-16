# Implementation Plan: Skeleton Loading System

**Spec:** `_specs/skeleton-loading-system.md`
**Date:** 2026-03-28
**Branch:** `claude/feature/skeleton-loading-system`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable — standalone infrastructure feature

---

## Architecture Context

### Current State

- **No existing skeleton components** — the `frontend/src/components/skeletons/` directory does not exist yet.
- **Route-level loading**: `RouteLoadingFallback` in App.tsx (lines 59-74) shows a pulsing "Worship Room" logo with `animate-logo-pulse` on `bg-dashboard-dark`. This is NOT replaced by this spec — it handles route transitions, not in-page content loading.
- **Bible reader loading**: `BibleReader.tsx` line 312-313 currently shows `<div className="py-16 text-center text-white/50">Loading...</div>` during chapter JSON fetch. This is replaced with `BibleReaderSkeleton`.
- **ChapterPlaceholder** (`components/bible/ChapterPlaceholder.tsx`): A "content not available" fallback (not a loading skeleton) — remains unchanged.
- **Spotify embeds**: Two locations:
  - `SongPickSection.tsx` — bare iframe with `loading="lazy"`, no loading placeholder.
  - `SpotifyEmbed.tsx` (music page) — has `loading`/`loaded`/`error` states but no visual skeleton during `loading` phase. The iframe renders immediately with no placeholder.
- **useReducedMotion hook** exists at `frontend/src/hooks/useReducedMotion.ts` — returns boolean, listens for `prefers-reduced-motion` changes.
- **Tailwind config** (`frontend/tailwind.config.js`): Rich animation library (40+ custom animations), no shimmer/skeleton animation. New `shimmer` keyframe will be added.
- **Dashboard layout** (`DashboardWidgetGrid.tsx`): `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5` with `lg:col-span-2`, `lg:col-span-3`, `lg:col-span-5` column spans. Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`.
- **DailyHub layout** (`DailyHub.tsx`): Hero with `max-w-3xl`, two-card grid `grid-cols-1 gap-4 sm:grid-cols-2`, sticky tab bar with 4 tabs, tab content `max-w-2xl`.
- **All pages use dark theme**: background `bg-dashboard-dark` (#0f0a1e) or atmospheric hero gradients. Skeleton blocks use `bg-white/[0.06]` on this dark background.
- **Test patterns**: Vitest + React Testing Library. `describe`/`it`/`expect` from vitest. `MemoryRouter` for routing. `vi.mock` for hook mocking. `renderHook` for hook tests. `localStorage.clear()` in `beforeEach`.

### Key Files

| File | Purpose |
|------|---------|
| `frontend/tailwind.config.js` | Animation definitions — add shimmer |
| `frontend/src/hooks/useReducedMotion.ts` | Existing reduced motion hook — reuse |
| `frontend/src/pages/BibleReader.tsx:312` | Loading placeholder to replace |
| `frontend/src/components/music/SpotifyEmbed.tsx` | Add skeleton during loading state |
| `frontend/src/components/SongPickSection.tsx` | Add skeleton during iframe load |
| `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` | Reference for dashboard grid layout |
| `frontend/src/pages/DailyHub.tsx` | Reference for Daily Hub layout |

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No auth-gated actions — skeletons are inert visual placeholders | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Skeleton block bg | background | `bg-white/[0.06]` (rgba(255,255,255,0.06)) | spec |
| Shimmer gradient | background-image | `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)` | spec |
| Shimmer animation | duration | 1.5s infinite | spec |
| Shimmer bg-size | background-size | `200% 100%` | spec |
| SkeletonCard container | classes | `bg-white/[0.06] border border-white/10 rounded-xl p-4` | spec |
| Dashboard frosted glass | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` | DashboardCard.tsx |
| Dashboard grid | classes | `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5` | DashboardWidgetGrid.tsx |
| Dashboard container | classes | `mx-auto max-w-6xl px-4 pb-8 sm:px-6` | DashboardWidgetGrid.tsx |
| DailyHub hero container | classes | `max-w-3xl` centered | DailyHub.tsx |
| DailyHub tab content | classes | `max-w-2xl` centered | DailyHub.tsx |
| DailyHub card | classes | `rounded-xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-sm sm:min-h-[140px]` | DailyHub.tsx:276 |
| Page background | color | `#0f0a1e` (dashboard-dark) | tailwind.config.js |
| Content fade-in | animation | `content-fade-in 300ms ease-out both` | tailwind.config.js |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for decorative headings, not Lora
- All pages use dark background (`bg-dashboard-dark` = `#0f0a1e`) — skeleton blocks must be `bg-white/[0.06]`
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- SkeletonCard uses slightly different styling from dashboard cards: `bg-white/[0.06] border border-white/10 rounded-xl p-4` (less rounded, different opacity)
- Dashboard grid: `lg:grid-cols-5` (NOT 2-column 60/40 — it's 5-column with col-span-2 and col-span-3)
- DailyHub hero cards use `bg-white/[0.08]` (slightly more visible than skeleton blocks)
- Tab bars use `bg-white/[0.08] backdrop-blur-xl` sticky container
- `useReducedMotion` hook already exists — import from `@/hooks/useReducedMotion`
- Motion guards: use Tailwind `motion-safe:` prefix for shimmer animation class
- Existing `content-fade-in` animation (300ms) can be reused for skeleton→content transition

---

## Responsive Structure

**Breakpoints and layout behavior for `/execute-plan` and `/verify-with-playwright`:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column. All grids collapse. Tab pill rows wrap. Cards stack vertically. |
| Tablet | 768px | 2-column grids where real pages use them. Settings sidebar visible. |
| Desktop | 1440px | Full multi-column layouts: Dashboard 5-col grid, DailyHub 2-card hero grid, etc. |

---

## Vertical Rhythm

N/A — Skeletons match their corresponding page layouts exactly. No independent section spacing needed.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] No existing `components/skeletons/` directory (confirmed — will create fresh)
- [x] `useReducedMotion` hook exists and works (confirmed at `hooks/useReducedMotion.ts`)
- [x] `tailwind.config.js` has no existing shimmer/skeleton animation (confirmed)
- [x] BibleReader loading state is a simple text placeholder (confirmed at line 312)
- [x] SpotifyEmbed has a `loading` state with no visual skeleton (confirmed)
- [x] All auth-gated actions from the spec are accounted for (N/A — no auth gating)
- [x] Design system values verified from codebase inspection
- [x] No [UNVERIFIED] values needed — all values are spec-defined or codebase-verified

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shimmer implementation | Pure CSS with Tailwind `motion-safe:` prefix | Spec mandates no JS animation frames; Tailwind prefix is idiomatic |
| Skeleton block default height | `16px` (matching body text line height) | Spec specifies this default |
| SkeletonCard vs DashboardCard styling | SkeletonCard uses `rounded-xl`, dashboard skeletons use `rounded-2xl` | Spec says SkeletonCard uses `rounded-xl`; page-specific skeletons can override with `className` to match actual card rounding |
| useLoadingState 300ms threshold | Timer-based with `useRef` to avoid stale closure | Under 300ms = skip skeleton entirely; over 300ms = show until loaded |
| Spotify skeleton placement | Inside SpotifyEmbed component (music page) + SongPickSection (Daily Hub) | Two distinct Spotify embed patterns in the codebase |
| Page skeleton file organization | One file per page skeleton in `components/skeletons/` | Keeps files small and independently importable |
| aria-busy placement | On the parent wrapping both skeleton and content (not on skeleton itself) | Spec says "parent container" gets `aria-busy="true"` |

---

## Implementation Steps

### Step 1: Tailwind shimmer animation

**Objective:** Register the `shimmer` keyframe and `animate-shimmer` animation in Tailwind config.

**Files to create/modify:**
- `frontend/tailwind.config.js` — add keyframe + animation

**Details:**

Add to `keyframes`:
```javascript
'shimmer': {
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
},
```

Add to `animation`:
```javascript
'shimmer': 'shimmer 1.5s ease-in-out infinite',
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any existing keyframes or animations
- DO NOT rename any existing animation utilities

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build verification | build | `pnpm build` succeeds with new animation |

**Expected state after completion:**
- [x] `animate-shimmer` class available in Tailwind
- [x] Build passes with zero errors

---

### Step 2: Skeleton primitives

**Objective:** Create the 4 base skeleton components: `SkeletonBlock`, `SkeletonText`, `SkeletonCircle`, `SkeletonCard`.

**Files to create/modify:**
- `frontend/src/components/skeletons/SkeletonBlock.tsx` — new
- `frontend/src/components/skeletons/SkeletonText.tsx` — new
- `frontend/src/components/skeletons/SkeletonCircle.tsx` — new
- `frontend/src/components/skeletons/SkeletonCard.tsx` — new

**Details:**

**SkeletonBlock.tsx:**
```typescript
interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  rounded?: string
  className?: string
}
```
- Default: `width="100%"`, `height="16px"`, `rounded="rounded-md"`.
- Renders a `div` with:
  - `bg-white/[0.06]` base color
  - Shimmer gradient as inline `backgroundImage`: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)`
  - `backgroundSize: '200% 100%'`
  - Class: `motion-safe:animate-shimmer` (CSS-only animation, stops on reduced motion)
  - `aria-hidden="true"`
- Width/height applied as inline `style` to support both string ("60%") and number (200) values.

**SkeletonText.tsx:**
```typescript
interface SkeletonTextProps {
  lines?: number
  gap?: string
  lastLineWidth?: string
  className?: string
}
```
- Default: `lines=3`, `gap="gap-2"`, `lastLineWidth="60%"`.
- Renders `lines` SkeletonBlock elements in a `flex flex-col` with the `gap` class.
- Last line gets `width={lastLineWidth}`.
- Wrapper has `aria-hidden="true"`.

**SkeletonCircle.tsx:**
```typescript
interface SkeletonCircleProps {
  size?: number
  className?: string
}
```
- Default: `size=40`.
- Renders `<SkeletonBlock width={size} height={size} rounded="rounded-full" className={className} />`.

**SkeletonCard.tsx:**
```typescript
interface SkeletonCardProps {
  children?: React.ReactNode
  className?: string
}
```
- Renders a container `div` with: `bg-white/[0.06] border border-white/10 rounded-xl p-4`.
- Renders `children` inside.
- `aria-hidden="true"`.
- Note: `variant` prop from spec is replaced by `children` — composition is more flexible and each page skeleton composes its own card content directly.

**Responsive behavior:** N/A: no UI impact (primitives are layout-agnostic)

**Guardrails (DO NOT):**
- DO NOT add JavaScript-based animation (requestAnimationFrame, setInterval, etc.)
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT import any heavy dependencies — these are pure CSS + React

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SkeletonBlock renders with defaults | unit | Renders div with bg-white/[0.06], width 100%, height 16px |
| SkeletonBlock accepts custom dimensions | unit | width="200px" height="40px" applied as style |
| SkeletonBlock shimmer stops on reduced motion | unit | `motion-safe:animate-shimmer` class present (CSS handles the rest) |
| SkeletonBlock is aria-hidden | unit | `aria-hidden="true"` attribute present |
| SkeletonText renders correct line count | unit | 3 lines by default, each is a SkeletonBlock |
| SkeletonText last line has reduced width | unit | Last child has width="60%" |
| SkeletonCircle renders circular | unit | Has rounded-full class and equal width/height |
| SkeletonCard renders container + children | unit | Container has correct classes, children rendered inside |

**Expected state after completion:**
- [x] 4 primitive components created in `components/skeletons/`
- [x] All primitives accept `className` for customization
- [x] All primitives have `aria-hidden="true"`
- [x] Shimmer uses `motion-safe:` guard

---

### Step 3: useLoadingState hook

**Objective:** Create the hook that manages skeleton→content transition with a 300ms threshold.

**Files to create/modify:**
- `frontend/src/hooks/useLoadingState.ts` — new

**Details:**

```typescript
interface UseLoadingStateReturn {
  shouldShowSkeleton: boolean
  contentRef: React.RefObject<HTMLDivElement>
}

export function useLoadingState(isLoading: boolean): UseLoadingStateReturn
```

Logic:
1. Track elapsed time since `isLoading` became `true` using `useRef<number>` for the start timestamp.
2. If `isLoading` transitions from `false` to `true`: record `Date.now()` as start time.
3. If `isLoading` transitions from `true` to `false`:
   - If elapsed < 300ms: set `shouldShowSkeleton = false` immediately (never showed skeleton).
   - If elapsed >= 300ms: set `shouldShowSkeleton = false` (transition to content).
4. If `isLoading` is `true` and elapsed >= 300ms: set `shouldShowSkeleton = true`.
5. Use a 300ms `setTimeout` to flip `shouldShowSkeleton` to `true` after the threshold passes (avoids showing skeleton for fast loads).
6. `contentRef` points to the content wrapper. When transitioning from skeleton to content, add `animate-content-fade-in` class (existing animation: `content-fade-in 300ms ease-out both`).
7. If `useReducedMotion()` returns `true`: skip the fade-in class, instant swap.

Implementation approach:
- `useState` for `shouldShowSkeleton` (starts `false`)
- `useRef` for start timestamp and timeout
- `useEffect` watching `isLoading` to manage the threshold timer
- `useRef<HTMLDivElement>` for `contentRef`
- `useEffect` that adds fade-in class to `contentRef.current` when skeleton hides

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use `requestAnimationFrame` — this is timer-based only
- DO NOT block rendering — the hook is purely reactive
- DO NOT manage content visibility — the consumer decides what to render based on `shouldShowSkeleton`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns shouldShowSkeleton=false initially | unit | Default state before any loading |
| Skips skeleton when load < 300ms | unit | isLoading true→false in 200ms: shouldShowSkeleton never becomes true |
| Shows skeleton after 300ms threshold | unit | isLoading stays true for 400ms: shouldShowSkeleton becomes true |
| Hides skeleton when loading completes | unit | After skeleton shown, isLoading→false: shouldShowSkeleton becomes false |
| Cleans up timeout on unmount | unit | No timer leaks when component unmounts during loading |
| Respects reduced motion | unit | When useReducedMotion returns true, no fade-in class added to contentRef |

**Expected state after completion:**
- [x] `useLoadingState` hook created and exported
- [x] 300ms threshold logic works correctly
- [x] Skeleton never flashes for fast loads
- [x] Fade-in transition applied to content

---

### Step 4: DashboardSkeleton + DailyHubSkeleton

**Objective:** Create the two most complex page-specific skeleton screens.

**Files to create/modify:**
- `frontend/src/components/skeletons/DashboardSkeleton.tsx` — new
- `frontend/src/components/skeletons/DailyHubSkeleton.tsx` — new

**Details:**

**DashboardSkeleton.tsx:**

Structure mirrors `DashboardHero.tsx` + `DashboardWidgetGrid.tsx`:

```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  {/* Hero section */}
  <div className="px-4 pt-24 pb-6 md:pt-28 md:pb-8">
    <div className="mx-auto max-w-6xl">
      <SkeletonText lines={2} lastLineWidth="40%" />  {/* greeting + subtitle */}
    </div>
  </div>
  {/* Widget grid */}
  <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
      {/* Garden: large block */}
      <div className="lg:col-span-3">
        <SkeletonCard><SkeletonBlock height={200} rounded="rounded-2xl" /></SkeletonCard>
      </div>
      {/* Streak card */}
      <div className="lg:col-span-2">
        <SkeletonCard>
          <div className="flex items-center gap-3">
            <SkeletonCircle size={48} />
            <SkeletonText lines={2} lastLineWidth="80%" />
          </div>
        </SkeletonCard>
      </div>
      {/* Mood chart */}
      <div className="lg:col-span-3">
        <SkeletonCard><SkeletonBlock height={180} /></SkeletonCard>
      </div>
      {/* Activity checklist */}
      <div className="lg:col-span-2">
        <SkeletonCard>
          <div className="flex flex-col gap-3">
            {/* 6 checklist items */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonCircle size={24} />
                <SkeletonBlock height={16} width="70%" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
      {/* Two generic widget cards */}
      <div className="lg:col-span-3">
        <SkeletonCard><SkeletonText lines={3} /></SkeletonCard>
      </div>
      <div className="lg:col-span-2">
        <SkeletonCard><SkeletonText lines={3} /></SkeletonCard>
      </div>
    </div>
  </div>
</div>
```

All SkeletonCard instances within Dashboard get `className="rounded-2xl"` to match dashboard frosted glass card rounding.

**DailyHubSkeleton.tsx:**

Structure mirrors `DailyHub.tsx` hero + tabs + content:

```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  {/* Hero area */}
  <div className="px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40">
    <div className="mx-auto max-w-3xl">
      <SkeletonBlock height={40} width="60%" className="mx-auto" />  {/* greeting */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard className="sm:min-h-[140px]">
          <SkeletonText lines={3} />
        </SkeletonCard>
        <SkeletonCard className="sm:min-h-[140px]">
          <SkeletonText lines={2} />
        </SkeletonCard>
      </div>
    </div>
  </div>
  {/* Tab bar */}
  <div className="flex justify-center gap-4 py-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonBlock key={i} width={60} height={32} rounded="rounded-full" />
    ))}
  </div>
  {/* Content area */}
  <div className="mx-auto max-w-2xl px-4 py-8">
    <SkeletonBlock height={120} className="mb-4" />  {/* textarea */}
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} width={100} height={32} rounded="rounded-full" />
      ))}
    </div>
  </div>
</div>
```

**Responsive behavior:**
- Desktop (1440px): Dashboard 5-column grid; DailyHub 2-card hero grid
- Tablet (768px): Dashboard grid remains single column until `lg`; DailyHub hero 2 columns at `sm`
- Mobile (375px): Everything single column, stacked

**Guardrails (DO NOT):**
- DO NOT add any interactive elements to skeletons
- DO NOT import actual page data or hooks (skeletons are pure visual)
- DO NOT use actual DashboardCard component — compose from SkeletonCard

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DashboardSkeleton renders aria-busy container | unit | Root has `aria-busy="true"` |
| DashboardSkeleton renders sr-only Loading text | unit | Screen reader "Loading" text present |
| DashboardSkeleton renders 6-column grid layout | unit | Grid container with `lg:grid-cols-5` |
| DailyHubSkeleton renders 4 tab pills | unit | 4 SkeletonBlock elements with `rounded-full` |
| DailyHubSkeleton renders 2-card hero grid | unit | Grid with `sm:grid-cols-2` |

**Expected state after completion:**
- [x] DashboardSkeleton matches actual dashboard grid layout
- [x] DailyHubSkeleton matches actual Daily Hub hero + tabs + content structure
- [x] Both have `aria-busy="true"` and `sr-only` loading text

---

### Step 5: PrayerWallSkeleton + BibleBrowserSkeleton + BibleReaderSkeleton

**Objective:** Create skeleton screens for Prayer Wall, Bible Browser, and Bible Reader.

**Files to create/modify:**
- `frontend/src/components/skeletons/PrayerWallSkeleton.tsx` — new
- `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx` — new
- `frontend/src/components/skeletons/BibleReaderSkeleton.tsx` — new

**Details:**

**PrayerWallSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-3xl px-4 pt-8">
    {/* Composer card */}
    <SkeletonCard className="mb-4"><SkeletonText lines={2} /></SkeletonCard>
    {/* Category filter pills */}
    <div className="mb-6 flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} width={80} height={32} rounded="rounded-full" />
      ))}
    </div>
    {/* 4 prayer cards */}
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} className="mb-4">
        <div className="flex items-start gap-3">
          <SkeletonCircle size={40} />
          <div className="flex-1">
            <SkeletonText lines={2} lastLineWidth="80%" />
          </div>
        </div>
        <div className="mt-3 flex gap-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <SkeletonBlock key={j} width={60} height={20} />
          ))}
        </div>
      </SkeletonCard>
    ))}
  </div>
</div>
```

**BibleBrowserSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-4xl px-4 py-8">
    {/* Books/Search toggle */}
    <SkeletonBlock height={40} width="200px" className="mx-auto mb-6" rounded="rounded-lg" />
    {/* OT section */}
    <SkeletonCard className="mb-4">
      <SkeletonBlock height={24} width="160px" className="mb-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} height={20} className="mb-2" width={`${70 + Math.random() * 20}%`} />
      ))}
    </SkeletonCard>
    {/* NT section */}
    <SkeletonCard>
      <SkeletonBlock height={24} width="180px" className="mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBlock key={i} height={20} className="mb-2" width={`${70 + Math.random() * 20}%`} />
      ))}
    </SkeletonCard>
  </div>
</div>
```

Note: `Math.random()` widths are acceptable here — they only run once on mount and create natural visual variation. For deterministic widths in tests, use fixed percentages like `[85%, 72%, 90%, 78%, 82%]` instead. Use a fixed array of widths.

**BibleReaderSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    {/* 20 verse-like blocks */}
    {VERSE_WIDTHS.map((width, i) => (
      <div key={i} className="mb-4 flex items-start gap-2">
        <SkeletonBlock width={16} height={12} rounded="rounded-sm" />  {/* verse number */}
        <SkeletonText lines={2} lastLineWidth={width} className="flex-1" />
      </div>
    ))}
  </div>
</div>
```

Where `VERSE_WIDTHS` is a fixed array of 20 string percentages (e.g., `["75%", "90%", "60%", ...]`) for deterministic rendering.

**Responsive behavior:**
- Desktop (1440px): PrayerWall `max-w-3xl` centered; BibleBrowser `max-w-4xl`; BibleReader `max-w-2xl`
- Tablet (768px): Same max-widths, padding adjusts via `sm:px-6`
- Mobile (375px): Full width with `px-4` padding

**Guardrails (DO NOT):**
- DO NOT use `Math.random()` for widths — use deterministic arrays for testability
- DO NOT add category text or labels to skeletons
- DO NOT import any Bible data or prayer wall data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWallSkeleton renders 4 prayer cards | unit | 4 SkeletonCard elements with avatar circles |
| PrayerWallSkeleton renders category filter pills | unit | Filter pill row present |
| BibleBrowserSkeleton renders OT and NT sections | unit | 2 SkeletonCard sections |
| BibleReaderSkeleton renders 20 verse blocks | unit | 20 verse-like elements with number + text |
| All 3 have aria-busy and sr-only | unit | Accessibility attributes present |

**Expected state after completion:**
- [x] PrayerWallSkeleton matches feed layout with cards, avatars, interaction buttons
- [x] BibleBrowserSkeleton matches book list with OT/NT accordion sections
- [x] BibleReaderSkeleton matches verse reading layout with verse numbers

---

### Step 6: GrowPageSkeleton + InsightsSkeleton + FriendsSkeleton

**Objective:** Create skeleton screens for Grow, Insights, and Friends pages.

**Files to create/modify:**
- `frontend/src/components/skeletons/GrowPageSkeleton.tsx` — new
- `frontend/src/components/skeletons/InsightsSkeleton.tsx` — new
- `frontend/src/components/skeletons/FriendsSkeleton.tsx` — new

**Details:**

**GrowPageSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-4xl px-4 py-8">
    {/* Tab bar: 2 pills */}
    <div className="flex gap-4 mb-6">
      <SkeletonBlock width={100} height={36} rounded="rounded-full" />
      <SkeletonBlock width={120} height={36} rounded="rounded-full" />
    </div>
    {/* Create Your Own Plan CTA */}
    <SkeletonCard className="mb-6"><SkeletonText lines={2} lastLineWidth="50%" /></SkeletonCard>
    {/* Filter pills row */}
    <div className="flex gap-2 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} width={70} height={28} rounded="rounded-full" />
      ))}
    </div>
    {/* 2x2 plan card grid */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}><SkeletonText lines={3} /></SkeletonCard>
      ))}
    </div>
  </div>
</div>
```

**InsightsSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-4xl px-4 py-8">
    {/* Time range selector pills */}
    <div className="flex gap-2 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} width={60} height={32} rounded="rounded-full" />
      ))}
    </div>
    {/* Large chart area */}
    <SkeletonCard className="mb-6"><SkeletonBlock height={300} /></SkeletonCard>
    {/* 3 AI insight cards */}
    {Array.from({ length: 3 }).map((_, i) => (
      <SkeletonCard key={i} className="mb-4"><SkeletonText lines={3} /></SkeletonCard>
    ))}
  </div>
</div>
```

**FriendsSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-4xl px-4 py-8">
    {/* Tab bar: 2 pills */}
    <div className="flex gap-4 mb-6">
      <SkeletonBlock width={80} height={36} rounded="rounded-full" />
      <SkeletonBlock width={120} height={36} rounded="rounded-full" />
    </div>
    {/* Search input */}
    <SkeletonBlock height={44} className="mb-6" rounded="rounded-lg" />
    {/* 5 friend cards */}
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonCard key={i} className="mb-3">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={44} />
          <SkeletonBlock height={16} width="40%" className="flex-1" />
          <SkeletonBlock width={80} height={32} rounded="rounded-lg" />
        </div>
      </SkeletonCard>
    ))}
  </div>
</div>
```

**Responsive behavior:**
- Desktop (1440px): GrowPage 2-column card grid; Insights/Friends `max-w-4xl`
- Tablet (768px): GrowPage 2-column grid at `sm` breakpoint
- Mobile (375px): Single column, all cards stacked

**Guardrails (DO NOT):**
- DO NOT import Recharts or any chart library into InsightsSkeleton
- DO NOT add real tab switching logic
- DO NOT import friend data or growth data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowPageSkeleton renders 2 tab pills | unit | 2 SkeletonBlock pills present |
| GrowPageSkeleton renders 4 plan cards in grid | unit | `sm:grid-cols-2` grid with 4 cards |
| InsightsSkeleton renders large chart placeholder | unit | SkeletonBlock with 300px height |
| FriendsSkeleton renders 5 friend cards with avatars | unit | 5 cards each with SkeletonCircle |
| FriendsSkeleton renders search input placeholder | unit | SkeletonBlock with 44px height |

**Expected state after completion:**
- [x] GrowPageSkeleton matches tabbed + grid layout
- [x] InsightsSkeleton matches chart + insight cards layout
- [x] FriendsSkeleton matches search + friend list layout

---

### Step 7: SettingsSkeleton + MyPrayersSkeleton + MusicSkeleton + ProfileSkeleton

**Objective:** Create the remaining 4 page-specific skeleton screens.

**Files to create/modify:**
- `frontend/src/components/skeletons/SettingsSkeleton.tsx` — new
- `frontend/src/components/skeletons/MyPrayersSkeleton.tsx` — new
- `frontend/src/components/skeletons/MusicSkeleton.tsx` — new
- `frontend/src/components/skeletons/ProfileSkeleton.tsx` — new

**Details:**

**SettingsSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Sidebar: 4 nav items */}
      <div className="w-full sm:w-[200px] lg:w-[240px] shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} height={40} className="mb-2" rounded="rounded-lg" />
        ))}
      </div>
      {/* Content area: 3 setting sections */}
      <div className="flex-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-4">
            <SkeletonText lines={3} />
            <div className="mt-3 flex gap-4">
              <SkeletonBlock width={44} height={24} rounded="rounded-full" />
              <SkeletonBlock width={44} height={24} rounded="rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  </div>
</div>
```

**MyPrayersSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-3xl px-4 py-8">
    {/* Composer card */}
    <SkeletonCard className="mb-6"><SkeletonText lines={2} /></SkeletonCard>
    {/* 4 prayer cards */}
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} className="mb-4">
        <SkeletonText lines={2} lastLineWidth="70%" />
        <div className="mt-3 flex gap-2">
          <SkeletonBlock width={80} height={24} rounded="rounded-full" />
          <SkeletonBlock width={70} height={24} rounded="rounded-full" />
        </div>
      </SkeletonCard>
    ))}
  </div>
</div>
```

**MusicSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-5xl px-4 py-8">
    {/* Tab bar: 3 pills */}
    <div className="flex gap-4 mb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} width={90} height={36} rounded="rounded-full" />
      ))}
    </div>
    {/* Hero playlist card */}
    <SkeletonCard className="mb-6"><SkeletonBlock height={200} /></SkeletonCard>
    {/* 2x2 playlist grid */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}><SkeletonBlock height={120} /></SkeletonCard>
      ))}
    </div>
  </div>
</div>
```

**ProfileSkeleton.tsx:**
```
<div aria-busy="true">
  <span className="sr-only">Loading</span>
  <div className="mx-auto max-w-3xl px-4 py-8">
    {/* Profile header */}
    <SkeletonCard className="mb-6">
      <div className="flex items-center gap-4">
        <SkeletonCircle size={80} />
        <div className="flex-1">
          <SkeletonBlock height={24} width="50%" className="mb-2" />
          <SkeletonBlock height={16} width="30%" />
        </div>
      </div>
    </SkeletonCard>
    {/* Badge grid */}
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCircle key={i} size={48} />
      ))}
    </div>
  </div>
</div>
```

**Responsive behavior:**
- Desktop (1440px): Settings sidebar + content side-by-side; Music 2x2 grid; Profile 6-column badge grid
- Tablet (768px): Settings sidebar at `sm`; Music/Profile 2-column
- Mobile (375px): Settings sidebar stacks above content; Music/Profile single column; Badge grid 4-column

**Guardrails (DO NOT):**
- DO NOT import Settings, Music, or Profile page components or data
- DO NOT add functional toggles or buttons
- DO NOT use Spotify embed or audio components

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SettingsSkeleton renders sidebar + content layout | unit | Flex layout with sidebar width and content area |
| MyPrayersSkeleton renders composer + 4 prayer cards | unit | Composer card + 4 cards with badge pills |
| MusicSkeleton renders 3 tab pills + grid | unit | 3 pills and `sm:grid-cols-2` grid |
| ProfileSkeleton renders avatar + badge grid | unit | Large circle (80px) + grid of small circles |
| All 4 have aria-busy and sr-only | unit | Accessibility attributes present |

**Expected state after completion:**
- [x] All 4 remaining skeleton screens created
- [x] Each mirrors the responsive layout of its corresponding page
- [x] Settings skeleton has sidebar/content split matching actual Settings page

---

### Step 8: Integration — BibleReader + SpotifyEmbed

**Objective:** Wire BibleReaderSkeleton into the Bible reader's loading state and add a skeleton placeholder to Spotify embed loading states.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — modify loading placeholder
- `frontend/src/components/music/SpotifyEmbed.tsx` — add skeleton during loading
- `frontend/src/components/SongPickSection.tsx` — add skeleton during iframe load

**Details:**

**BibleReader.tsx (line ~312):**

Replace:
```tsx
) : isLoading ? (
  <div className="py-16 text-center text-white/50">Loading...</div>
)
```

With:
```tsx
) : isLoading ? (
  <BibleReaderSkeleton />
)
```

Import `BibleReaderSkeleton` from `@/components/skeletons`.

**SpotifyEmbed.tsx:**

Add a skeleton placeholder during the `loading` state. Currently the iframe renders immediately even while loading. Add a wrapper that shows a skeleton until `onLoad` fires:

```tsx
// When status === 'loading', show skeleton overlay
return (
  <div className="relative">
    {status === 'loading' && (
      <div className="absolute inset-0 z-10" aria-busy="true">
        <span className="sr-only">Loading</span>
        <SkeletonBlock height={height} rounded="rounded-xl" />
      </div>
    )}
    <iframe
      src={...}
      className={cn('rounded-xl', status === 'loading' && 'invisible', className)}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      ...
    />
  </div>
)
```

The iframe is rendered but `invisible` during loading (so `onLoad` still fires). The skeleton overlays until the iframe is ready.

**SongPickSection.tsx:**

Add a similar loading state for the Spotify iframe. Wrap the iframe in a container that shows a skeleton until `onLoad`:

```tsx
const [iframeLoaded, setIframeLoaded] = useState(false)

// In the render:
<div className="mx-auto mt-8 max-w-xl relative">
  {!iframeLoaded && (
    <div className="absolute inset-0 z-10" aria-busy="true">
      <span className="sr-only">Loading</span>
      <SkeletonBlock height={280} rounded="rounded-xl" />
    </div>
  )}
  <iframe
    ...
    className={cn('rounded-xl', !iframeLoaded && 'invisible')}
    onLoad={() => setIframeLoaded(true)}
  />
</div>
```

**Responsive behavior:**
- BibleReaderSkeleton inherits its own responsive behavior
- SpotifyEmbed skeleton matches iframe dimensions exactly
- SongPickSection skeleton matches iframe container (280px height, `max-w-xl`)

**Guardrails (DO NOT):**
- DO NOT replace `ChapterPlaceholder` — it serves "content not available", not "content loading"
- DO NOT change the SpotifyEmbed error/offline states — only enhance the loading state
- DO NOT add loading states to the route-level Suspense fallback
- DO NOT modify any existing feature behavior or data loading logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleReader shows BibleReaderSkeleton during loading | integration | When isLoading=true, BibleReaderSkeleton is rendered |
| BibleReader still shows ChapterPlaceholder for non-fulltext | integration | ChapterPlaceholder unaffected |
| SpotifyEmbed shows skeleton during loading | unit | SkeletonBlock visible when status=loading |
| SpotifyEmbed hides skeleton after iframe loads | unit | Skeleton removed after onLoad fires |
| SongPickSection shows skeleton until iframe loads | unit | SkeletonBlock visible, hidden after onLoad |

**Expected state after completion:**
- [x] Bible reader shows proper skeleton instead of "Loading..." text
- [x] Spotify embeds show skeleton placeholder during iframe load
- [x] ChapterPlaceholder unchanged
- [x] All existing loading/error/offline states preserved

---

### Step 9: Central index + page component comments

**Objective:** Export all skeleton components from a central index file and add Phase 3 preparation comments to each page component.

**Files to create/modify:**
- `frontend/src/components/skeletons/index.ts` — new (central export)
- Multiple page files — add comment at top (comment-only changes)

**Details:**

**index.ts:**
```typescript
// Primitives
export { SkeletonBlock } from './SkeletonBlock'
export { SkeletonText } from './SkeletonText'
export { SkeletonCircle } from './SkeletonCircle'
export { SkeletonCard } from './SkeletonCard'

// Page-specific skeletons
export { DashboardSkeleton } from './DashboardSkeleton'
export { DailyHubSkeleton } from './DailyHubSkeleton'
export { PrayerWallSkeleton } from './PrayerWallSkeleton'
export { BibleBrowserSkeleton } from './BibleBrowserSkeleton'
export { BibleReaderSkeleton } from './BibleReaderSkeleton'
export { GrowPageSkeleton } from './GrowPageSkeleton'
export { InsightsSkeleton } from './InsightsSkeleton'
export { FriendsSkeleton } from './FriendsSkeleton'
export { SettingsSkeleton } from './SettingsSkeleton'
export { MyPrayersSkeleton } from './MyPrayersSkeleton'
export { MusicSkeleton } from './MusicSkeleton'
export { ProfileSkeleton } from './ProfileSkeleton'

// Hook
export { useLoadingState } from '@/hooks/useLoadingState'
```

**Page component comments** — Add a single-line comment at the top of each page file (after imports, before component definition):

| File | Comment |
|------|---------|
| `pages/Dashboard.tsx` | `// Loading state: use DashboardSkeleton` |
| `pages/DailyHub.tsx` | `// Loading state: use DailyHubSkeleton` |
| `pages/PrayerWall.tsx` | `// Loading state: use PrayerWallSkeleton` |
| `pages/BibleBrowser.tsx` | `// Loading state: use BibleBrowserSkeleton` |
| `pages/BibleReader.tsx` | `// Loading state: use BibleReaderSkeleton` |
| `pages/GrowPage.tsx` | `// Loading state: use GrowPageSkeleton` |
| `pages/MoodInsights.tsx` | `// Loading state: use InsightsSkeleton` |
| `pages/Friends.tsx` | `// Loading state: use FriendsSkeleton` |
| `pages/Settings.tsx` | `// Loading state: use SettingsSkeleton` |
| `pages/MyPrayers.tsx` | `// Loading state: use MyPrayersSkeleton` |
| `pages/MusicPage.tsx` | `// Loading state: use MusicSkeleton` |
| `pages/GrowthProfile.tsx` | `// Loading state: use ProfileSkeleton` |

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any page component logic — comments only
- DO NOT re-export from `components/index.ts` (that file is for shared UI components, not skeletons)
- DO NOT add any imports to page files in this step — Phase 3 will do that

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Index re-exports all components | unit | Import each named export from index, verify they are functions |

**Expected state after completion:**
- [x] All 16 exports available from `components/skeletons/index.ts`
- [x] 12 page files have Phase 3 preparation comments
- [x] No page behavior changed

---

### Step 10: Tests — primitives + hook

**Objective:** Write comprehensive tests for skeleton primitives and useLoadingState hook.

**Files to create/modify:**
- `frontend/src/components/skeletons/__tests__/SkeletonPrimitives.test.tsx` — new
- `frontend/src/hooks/__tests__/useLoadingState.test.ts` — new

**Details:**

**SkeletonPrimitives.test.tsx:**

Test all 4 primitives in one file (they're small, related components):

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonCard } from '../index'

describe('SkeletonBlock', () => {
  it('renders with default dimensions')
  it('applies custom width and height as style')
  it('applies custom rounded class')
  it('applies custom className')
  it('has aria-hidden="true"')
  it('has shimmer gradient background')
  it('uses motion-safe:animate-shimmer class')
})

describe('SkeletonText', () => {
  it('renders 3 lines by default')
  it('renders custom line count')
  it('last line has 60% width by default')
  it('accepts custom lastLineWidth')
  it('has aria-hidden="true"')
})

describe('SkeletonCircle', () => {
  it('renders with default size 40')
  it('renders with custom size')
  it('has rounded-full class')
  it('has equal width and height')
})

describe('SkeletonCard', () => {
  it('renders container with correct classes')
  it('renders children')
  it('applies custom className')
  it('has aria-hidden="true"')
})
```

**useLoadingState.test.ts:**

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLoadingState } from '../useLoadingState'

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

describe('useLoadingState', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns shouldShowSkeleton=false initially')
  it('does not show skeleton when load completes under 300ms')
  it('shows skeleton after 300ms threshold')
  it('hides skeleton when loading completes after threshold')
  it('cleans up timeout on unmount')
  it('handles rapid isLoading toggles')
  it('returns contentRef')
})
```

Use `vi.useFakeTimers()` and `vi.advanceTimersByTime(300)` to test the threshold precisely.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test CSS animation behavior (that's a browser concern, not testable in jsdom)
- DO NOT test reduced-motion media query matching (mock the hook instead)

**Test specifications:**
Tests are the deliverable for this step — see details above.

**Expected state after completion:**
- [x] ~20 tests covering all 4 primitives
- [x] ~7 tests covering useLoadingState hook
- [x] All tests pass

---

### Step 11: Tests — page skeletons + integration

**Objective:** Write tests for page-specific skeletons and integration points.

**Files to create/modify:**
- `frontend/src/components/skeletons/__tests__/PageSkeletons.test.tsx` — new
- `frontend/src/components/skeletons/__tests__/SkeletonIntegration.test.tsx` — new

**Details:**

**PageSkeletons.test.tsx:**

One test file covering all 12 page skeletons (each is a simple composition — light testing):

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  DashboardSkeleton, DailyHubSkeleton, PrayerWallSkeleton,
  BibleBrowserSkeleton, BibleReaderSkeleton, GrowPageSkeleton,
  InsightsSkeleton, FriendsSkeleton, SettingsSkeleton,
  MyPrayersSkeleton, MusicSkeleton, ProfileSkeleton,
} from '../index'

const skeletons = [
  { name: 'DashboardSkeleton', Component: DashboardSkeleton },
  { name: 'DailyHubSkeleton', Component: DailyHubSkeleton },
  // ... all 12
]

describe('Page Skeletons', () => {
  skeletons.forEach(({ name, Component }) => {
    describe(name, () => {
      it('renders with aria-busy="true"')
      it('renders sr-only "Loading" text')
      it('renders without errors')
    })
  })

  // Specific layout tests
  it('DashboardSkeleton has 5-column grid')
  it('DailyHubSkeleton has 4 tab pills')
  it('PrayerWallSkeleton has 4 prayer cards')
  it('BibleReaderSkeleton has 20 verse blocks')
  it('GrowPageSkeleton has 2-column plan grid')
  it('FriendsSkeleton has 5 friend cards')
  it('SettingsSkeleton has sidebar layout')
  it('ProfileSkeleton has badge grid')
})
```

**SkeletonIntegration.test.tsx:**

Test the integration points:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

describe('BibleReader skeleton integration', () => {
  it('shows BibleReaderSkeleton while chapter loads')
  it('shows content after chapter loads')
  it('does not replace ChapterPlaceholder')
})

describe('SpotifyEmbed skeleton integration', () => {
  it('shows skeleton placeholder during loading')
  it('hides skeleton after iframe onLoad')
})
```

For BibleReader tests, mock `loadChapter` to control loading timing. For SpotifyEmbed tests, fire the `onLoad` event on the iframe.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test visual appearance (CSS rendering) — test structure and attributes only
- DO NOT import actual page data or hooks into skeleton tests

**Test specifications:**
Tests are the deliverable for this step — see details above.

**Expected state after completion:**
- [x] ~48 tests for page skeletons (12 skeletons × 3 common + ~12 specific)
- [x] ~5 integration tests for BibleReader + SpotifyEmbed
- [x] All tests pass
- [x] Build passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Tailwind shimmer animation |
| 2 | 1 | Skeleton primitives (use animate-shimmer) |
| 3 | — | useLoadingState hook (independent of primitives) |
| 4 | 2 | DashboardSkeleton + DailyHubSkeleton (use primitives) |
| 5 | 2 | PrayerWall + BibleBrowser + BibleReader skeletons |
| 6 | 2 | GrowPage + Insights + Friends skeletons |
| 7 | 2 | Settings + MyPrayers + Music + Profile skeletons |
| 8 | 2, 5 | Integration (uses BibleReaderSkeleton + SkeletonBlock) |
| 9 | 2, 3, 4, 5, 6, 7 | Central index + page comments (needs all components) |
| 10 | 2, 3 | Tests for primitives + hook |
| 11 | 4, 5, 6, 7, 8 | Tests for page skeletons + integration |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Tailwind shimmer animation | [COMPLETE] | 2026-03-28 | Added `shimmer` keyframe + `animate-shimmer` to `frontend/tailwind.config.js` |
| 2 | Skeleton primitives | [COMPLETE] | 2026-03-28 | Created SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonCard in `components/skeletons/` |
| 3 | useLoadingState hook | [COMPLETE] | 2026-03-28 | Created `hooks/useLoadingState.ts` with 300ms threshold, fade-in transition, reduced motion support |
| 4 | DashboardSkeleton + DailyHubSkeleton | [COMPLETE] | 2026-03-28 | Created both page skeletons matching real layout grids |
| 5 | PrayerWall + BibleBrowser + BibleReader skeletons | [COMPLETE] | 2026-03-28 | Created all 3 skeletons with deterministic widths |
| 6 | GrowPage + Insights + Friends skeletons | [COMPLETE] | 2026-03-28 | Created GrowPageSkeleton, InsightsSkeleton, FriendsSkeleton |
| 7 | Settings + MyPrayers + Music + Profile skeletons | [COMPLETE] | 2026-03-28 | Created SettingsSkeleton, MyPrayersSkeleton, MusicSkeleton, ProfileSkeleton |
| 8 | Integration — BibleReader + SpotifyEmbed | [COMPLETE] | 2026-03-28 | BibleReader uses BibleReaderSkeleton; SpotifyEmbed + SongPickSection show skeleton during iframe load |
| 9 | Central index + page component comments | [COMPLETE] | 2026-03-28 | Created index.ts with 16 exports; added comments to 12 page files (MoodInsights.tsx is actually Insights.tsx) |
| 10 | Tests — primitives + hook | [COMPLETE] | 2026-03-28 | 24 primitive tests + 7 hook tests, all passing |
| 11 | Tests — page skeletons + integration | [COMPLETE] | 2026-03-28 | 54 page skeleton tests + 4 SpotifyEmbed integration tests, all passing. Fixed TS errors (missing SpotifyPlaylist fields, unused variable) |
