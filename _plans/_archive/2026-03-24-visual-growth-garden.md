# Implementation Plan: Visual Growth Garden

**Spec:** `_specs/visual-growth-garden.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/visual-growth-garden`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external page recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (referenced — shared constants loaded from codebase)

---

## Architecture Context

### Relevant Existing Files and Patterns

- **DashboardHero** (`src/components/dashboard/DashboardHero.tsx`): Renders the hero section with greeting, streak, level, faith points, and progress bar. Background: `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]`. Props: `userName, currentStreak, levelName, totalPoints, pointsToNextLevel, currentLevel, meditationMinutesThisWeek`.

- **Dashboard page** (`src/pages/Dashboard.tsx`): Renders `<DashboardHero>` wrapped in a `motion-safe:animate-widget-enter` div with `animationDelay: '0ms'`. The `shouldAnimate` flag is `true` when `animateEntrance && !prefersReduced`. Phase system: `onboarding → check_in → recommendations → dashboard_enter → dashboard`.

- **GrowthProfile page** (`src/pages/GrowthProfile.tsx`): Renders `ProfileHeader → ProfileBadgeShowcase → ProfileStats` in a `max-w-3xl` container with `bg-gradient-to-b from-hero-dark to-hero-mid`. Uses `useProfileData(userId)` which returns `currentLevel`, `currentStreak`, `levelName`, etc.

- **Faith Points system** (`src/hooks/useFaithPoints.ts`): Returns `{ totalPoints, currentLevel, levelName, currentStreak, recordActivity, ... }`. Reads from `wr_faith_points`, `wr_streak`, `wr_activity_log` localStorage keys.

- **Level thresholds** (`src/constants/dashboard/levels.ts`): `LEVEL_THRESHOLDS` array with 6 levels (Seedling:0, Sprout:100, Blooming:500, Flourishing:1500, Oak:4000, Lighthouse:10000). `getLevelForPoints(points)` returns `{ level, name, pointsToNextLevel }`.

- **CelebrationQueue** (`src/components/dashboard/CelebrationQueue.tsx`): Renders `CelebrationOverlay` when `newlyEarnedBadges` contains level-up badges. Triggered by `recordActivity()` → `checkForNewBadges()`.

- **useReducedMotion** (`src/hooks/useReducedMotion.ts`): Returns boolean from `prefers-reduced-motion: reduce` media query. Used throughout dashboard.

- **Entrance animations**: Dashboard uses `motion-safe:animate-widget-enter` (400ms ease-out, defined in `tailwind.config.js`). Each widget gets sequential `animationDelay`. DashboardHero is first at `0ms`.

- **useProfileData** (`src/hooks/useProfileData.ts`): Returns `ProfileData` including `currentLevel`, `currentStreak`, `levelName`, `totalPoints`, `pointsToNextLevel`. For own profile reads from localStorage; for others reads from mock data.

### Directory Conventions

- Components: `src/components/dashboard/` for dashboard components
- Tests: `src/components/dashboard/__tests__/` colocated with components
- Constants: `src/constants/dashboard/`
- Hooks: `src/hooks/`
- Pages: `src/pages/`
- Profile components: `src/components/profile/`

### Test Patterns

- Framework: Vitest + React Testing Library
- Presentational components (like DashboardHero) render directly without provider wrapping
- Fake timers: `vi.useFakeTimers()` + `vi.setSystemTime()`
- Queries: `screen.getByText()`, `screen.getByRole()`, `screen.getByLabelText()`
- Assertions: `toBeInTheDocument()`, `toHaveClass()`, `toHaveAttribute()`
- No provider wrapping needed for pure presentational components
- Components using `useAuth()` need `AuthProvider` wrapping in tests

### Auth Gating

The garden is purely visual and read-only. The dashboard is already auth-gated (renders `Home` when not authenticated). The garden reads from existing data but writes nothing. Auth gating is inherited from the parent page:
- Dashboard (`/`): entire page auth-gated via `if (!user) return null`
- GrowthProfile (`/profile/:userId`): viewable by anyone, data privacy handled by `useProfileData`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Dashboard garden visibility | Only visible when authenticated (dashboard is auth-gated) | Step 3 | Inherited — Dashboard renders `null` when `!user` |
| Growth sparkle on activity | Only triggers for authenticated users | Step 4 | `recordActivity()` no-ops when not authenticated |
| Profile garden visibility | Viewable by anyone viewing the profile | Step 5 | No auth gate needed — garden data comes from `useProfileData` |

No new auth gates required. All auth gating is inherited from parent components.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard background | background | `bg-[#0f0a1e]` (solid) | Dashboard.tsx:254 |
| DashboardHero background | background | `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` | DashboardHero.tsx:92 |
| Muted label text | color/size | `text-xs text-white/40` | Spec requirement |
| SVG primary purple | fill | `#6D28D9` | design-system.md |
| SVG mood amber | fill | `#D97706` | design-system.md |
| SVG mood teal | fill | `#2DD4BF` | design-system.md |
| SVG mood green | fill | `#34D399` | design-system.md |
| SVG earth browns | fills | `#8B6914`, `#6B4E1B`, `#5C4033` | Spec |
| SVG leaf greens | fills | `#22C55E`, `#16A34A`, `#15803D` | Spec |
| SVG sky (dark theme) | gradient | `#0D0620` → `#1E0B3E` | design-system.md (hero-dark/hero-mid) |
| SVG stream blues | fills | `#3B82F6`, `#60A5FA` | Spec |
| SVG sunlight | fill | `rgba(255, 255, 255, 0.6)` | Spec |
| Sparkle particles | fill | `rgba(109, 40, 217, 0.5)` (normal), `rgba(109, 40, 217, 0.7)` (level-up) | Spec |
| Entrance animation | class | `motion-safe:animate-widget-enter` | Dashboard.tsx:267 |
| Profile page container | width | `max-w-3xl` | GrowthProfile.tsx:114 |
| Profile page bg | gradient | `bg-gradient-to-b from-hero-dark to-hero-mid` | GrowthProfile.tsx:113 |

---

## Design System Reminder

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- Dashboard is all-dark theme: `bg-[#0f0a1e]` page background
- DashboardHero uses `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]`
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Entrance animations use `motion-safe:animate-widget-enter` with sequential `animationDelay`
- Garden sits above DashboardHero but within the same gradient area — it is NOT inside a frosted glass card
- `useReducedMotion()` hook for all animation checks
- Level thresholds: Seedling:0, Sprout:100, Blooming:500, Flourishing:1500, Oak:4000, Lighthouse:10000
- Gentle gamification: garden never withers, stages never go backward

---

## Shared Data Models (from Master Plan)

```typescript
// From constants/dashboard/levels.ts
export interface LevelDefinition {
  level: number;
  name: string;
  threshold: number;
}

export const LEVEL_THRESHOLDS: LevelDefinition[] = [
  { level: 1, name: 'Seedling', threshold: 0 },
  { level: 2, name: 'Sprout', threshold: 100 },
  { level: 3, name: 'Blooming', threshold: 500 },
  { level: 4, name: 'Flourishing', threshold: 1500 },
  { level: 5, name: 'Oak', threshold: 4000 },
  { level: 6, name: 'Lighthouse', threshold: 10000 },
];

// From hooks/useFaithPoints.ts — consumed by garden
interface FaithPointsState {
  totalPoints: number;
  currentLevel: number;      // 1-6
  levelName: string;
  currentStreak: number;
  // ... other fields not needed by garden
}

// From hooks/useProfileData.ts — consumed by profile garden
interface ProfileData {
  currentLevel: number | null;
  currentStreak: number | null;
  // ...
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_faith_points` | Read | Total points → derives garden stage via `getLevelForPoints()` |
| `wr_streak` | Read | Current streak → derives sun/overcast sky |

No new localStorage keys created.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Garden at 200px height (`"md"` size), full width, "Your Garden" label centered |
| Tablet | 640px–1024px | Garden at 200px height (`"md"` size), same layout, more horizontal space |
| Desktop | > 1024px | Garden at 300px height (`"lg"` size), full width within `max-w-6xl` container |
| Profile (all) | all | Garden at 150px height (`"sm"` size), static, centered |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Garden label → Garden SVG | 4px (`mt-1`) | [UNVERIFIED] — visual estimate for tight label-to-content spacing |
| Garden SVG → DashboardHero greeting | 0px (no gap — garden is inside DashboardHero section) | Spec: "garden sits above existing DashboardHero content" |
| ProfileHeader → Garden | 24px (`mt-6`) | GrowthProfile.tsx pattern: `mt-6` between sections |
| Garden → ProfileStats | 24px (`mt-6`) | GrowthProfile.tsx pattern |

→ To verify: Run `/verify-with-playwright` and visually inspect spacing
→ If wrong: Adjust margin classes

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The 6 SVG garden scenes will be hand-crafted inline SVGs (not external image files). Each stage is a separate SVG composition embedded directly in the component.
- [ ] All ambient animations use CSS `@keyframes` only — no JavaScript animation libraries needed.
- [ ] Sparkle particles use temporary DOM elements with CSS animations, cleaned up after animation completes.
- [ ] The garden is added INSIDE the existing `DashboardHero` component (above the greeting content), not as a separate sibling component — this keeps the gradient background continuous.
- [ ] All auth-gated actions from the spec are accounted for in the plan (all inherited from parent pages).
- [ ] Design system values are verified from design-system.md and codebase inspection.
- [ ] All [UNVERIFIED] values are flagged with verification methods.
- [ ] No new localStorage keys are introduced.
- [ ] No new routes are introduced.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Garden placement | Inside DashboardHero (above greeting) | Keeps gradient background continuous. Garden blends into the hero area naturally without needing a separate background section. |
| SVG approach | 6 separate inline SVG compositions in one component | Each stage is distinct per spec. A single component switches between SVG scenes based on `stage` prop. Inline SVG allows CSS animation targets. |
| Sparkle implementation | CSS `@keyframes` on dynamically created elements | Spec requires 3-4 particles rising and fading. CSS animation is simpler than requestAnimationFrame. Elements are removed after animation via `onAnimationEnd`. |
| Stage transition | Dual-render with opacity crossfade | Both old and new SVGs render simultaneously. CSS transition on opacity over 2s. State tracks `previousStage` to enable crossfade. |
| Garden in DashboardHero vs separate | Modify DashboardHero to accept garden props | Avoids layout disruption. Garden is part of the hero conceptually. Alternative: render garden above DashboardHero in Dashboard.tsx. Chose the latter to keep DashboardHero focused. |
| Profile garden data source | Use `useProfileData` existing fields | `currentLevel` and `currentStreak` already available in `ProfileData`. No new data fetching needed. |
| Overcast sky approach | SVG filter/opacity change on sky elements | Replace sun element with cloud elements. Slightly muted colors via CSS filter or different SVG paths for overcast variant. |

**Revised decision on placement:** Garden will be rendered as a separate component ABOVE DashboardHero in `Dashboard.tsx` (not inside DashboardHero). This keeps DashboardHero unchanged and allows the garden to participate in the stagger animation system independently. The garden component gets its own dark gradient background that seamlessly connects to DashboardHero's gradient.

---

## Implementation Steps

### Step 1: Garden SVG Component — Core Structure and 6 Stages

**Objective:** Create the `GrowthGarden` component with 6 inline SVG stage scenes, size variants, and streak-responsive sky.

**Files to create/modify:**
- `src/components/dashboard/GrowthGarden.tsx` — New component
- `src/components/dashboard/garden/` — New directory for stage SVG components

**Details:**

Create the main `GrowthGarden` component with this interface:

```typescript
interface GrowthGardenProps {
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  animated?: boolean;       // default true
  showSparkle?: boolean;    // default false
  streakActive?: boolean;   // default true
  size: 'sm' | 'md' | 'lg';
}
```

Size mapping:
- `"sm"` → `h-[150px]` (profile)
- `"md"` → `h-[200px]` (mobile/tablet dashboard)
- `"lg"` → `h-[300px]` (desktop dashboard)

All SVGs use `width="100%"` with the fixed height, `viewBox="0 0 800 400"` (landscape aspect), `preserveAspectRatio="xMidYMid slice"`.

Create 6 separate SVG scene functions (not separate files — keep in one file for simplicity since they share color constants):

**Stage 1 (Seedling):** Bare soil (brown gradient `#6B4E1B` → `#5C4033`), single tiny sprout (2 small green leaves `#22C55E`), small cross marker in ground (`#8B6914`), sky gradient (`#0D0620` → `#1E0B3E` when streak active; slightly grayed `#1a1025` → `#2a1845` when overcast). Minimal scene.

**Stage 2 (Sprout):** Same soil, taller plant with 2–3 leaves (`#22C55E`, `#16A34A`), tiny flower bud at top (`#6D28D9`), slight grass patches at base.

**Stage 3 (Blooming):** Small flowering bush with 3–4 blooms (`#6D28D9`), 1–2 butterflies (amber `#D97706`, teal `#2DD4BF`), grass growing around base (`#22C55E`).

**Stage 4 (Flourishing):** Young tree with visible trunk (`#6B4E1B`), full canopy (greens), multiple flowers (`#6D28D9`, `#D97706`, `#2DD4BF`, `#34D399`), a bird on branch, sunlight rays (`white/60`) when streak active.

**Stage 5 (Oak):** Strong tree, thick trunk, wide canopy. Fruit (amber/teal). Small stream (`#3B82F6`, `#60A5FA`). More birds/butterflies. Wildflowers in foreground.

**Stage 6 (Lighthouse):** Full oak from stage 5 + warm glow from within canopy (soft white/gold `rgba(255,215,0,0.3)` radial gradient). Stream, flowers, birds, butterflies, sun rays. Small bench under tree.

Sky background handling:
- `streakActive === true`: Sky gradient includes a small sun circle (`rgba(255,255,255,0.6)`) in upper area. Warm tones.
- `streakActive === false`: Sun replaced with 2–3 soft cloud shapes (`rgba(255,255,255,0.15)`). Sky gradient slightly muted (add gray tint). NOT dark or punitive — just a gentle overcast feel.

SVG elements should have CSS class names for animation targeting (e.g., `garden-leaf`, `garden-butterfly`, `garden-water`, `garden-glow`).

Add `role="img"` and descriptive `aria-label` to the SVG:
```typescript
const STAGE_LABELS: Record<number, string> = {
  1: 'Your garden: a tiny sprout in bare soil',
  2: 'Your garden: a small plant with leaves and a flower bud',
  3: 'Your garden: a flowering bush with butterflies',
  4: 'Your garden: a young tree with flowers and a bird',
  5: 'Your garden: a strong oak tree with fruit and a stream',
  6: 'Your garden: a glowing oak tree in a full garden with a bench',
};
```

**Guardrails (DO NOT):**
- Do NOT use external SVG files or image imports — all SVGs must be inline JSX
- Do NOT use JavaScript-driven animation for ambient effects — CSS only
- Do NOT make the garden interactive (no click handlers, no hover effects on SVG elements)
- Do NOT add new localStorage keys
- Do NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders correct stage SVG for each level (1-6) | unit | Pass each stage value, verify unique stage-specific elements are present |
| applies correct size class | unit | Test `sm`, `md`, `lg` sizes map to correct height classes |
| shows sun when streakActive is true | unit | Verify sun element is present |
| shows clouds when streakActive is false | unit | Verify cloud elements present, sun absent |
| includes role="img" and aria-label | unit | Check accessibility attributes for each stage |
| uses correct colors from palette | unit | Spot-check key fill/stroke values |

**Expected state after completion:**
- [ ] `GrowthGarden` component renders 6 distinct SVG scenes
- [ ] Size variants work correctly (sm/md/lg)
- [ ] Streak-responsive sky (sun vs overcast) works
- [ ] Proper accessibility attributes on all SVGs
- [ ] All tests pass

---

### Step 2: Ambient CSS Animations

**Objective:** Add CSS keyframe animations for leaf sway, butterfly float, water shimmer, and lighthouse glow. Respect `prefers-reduced-motion`.

**Files to create/modify:**
- `frontend/tailwind.config.js` — Add new keyframe definitions and animation utilities
- `src/components/dashboard/GrowthGarden.tsx` — Apply animation classes to SVG elements

**Details:**

Add to `tailwind.config.js` keyframes:

```javascript
'garden-leaf-sway': {
  '0%, 100%': { transform: 'rotate(-3deg)' },
  '50%': { transform: 'rotate(3deg)' },
},
'garden-butterfly-float': {
  '0%': { transform: 'translate(0, 0)' },
  '25%': { transform: 'translate(8px, -6px)' },
  '50%': { transform: 'translate(16px, 0)' },
  '75%': { transform: 'translate(8px, 6px)' },
  '100%': { transform: 'translate(0, 0)' },
},
'garden-water-shimmer': {
  '0%, 100%': { opacity: '0.6' },
  '50%': { opacity: '1' },
},
'garden-glow-pulse': {
  '0%, 100%': { opacity: '0.7' },
  '50%': { opacity: '1' },
},
```

Add to animation utilities:
```javascript
'garden-leaf-sway': 'garden-leaf-sway 4s ease-in-out infinite alternate',
'garden-butterfly-float': 'garden-butterfly-float 6s ease-in-out infinite',
'garden-water-shimmer': 'garden-water-shimmer 3s ease-in-out infinite alternate',
'garden-glow-pulse': 'garden-glow-pulse 2s ease-in-out infinite alternate',
```

In the component, apply animation classes conditionally:
- Only when `animated` prop is `true`
- Use `motion-safe:` Tailwind prefix (or check `useReducedMotion()`)
- Leaf elements (stages 3–6): `motion-safe:animate-garden-leaf-sway`
- Butterfly elements (stages 3–6): `motion-safe:animate-garden-butterfly-float`
- Stream water (stages 5–6): `motion-safe:animate-garden-water-shimmer`
- Lighthouse glow (stage 6): `motion-safe:animate-garden-glow-pulse`

SVG `<g>` groups with `transform-origin` set for proper rotation pivot points on leaves.

When `animated={false}` (profile page), no animation classes are applied at all.

**Guardrails (DO NOT):**
- Do NOT use JavaScript animation (requestAnimationFrame, setTimeout-based animation)
- Do NOT apply animations when `prefers-reduced-motion: reduce` is set
- Do NOT make animations distracting — keep them subtle (±3deg rotation, gentle paths)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| applies animation classes when animated=true | unit | Check for `animate-garden-leaf-sway` class on leaf elements in stage 3+ |
| no animation classes when animated=false | unit | Verify no animation classes present |
| uses motion-safe prefix | unit | Verify `motion-safe:` prefix on animation classes |
| no animations on stages 1-2 for leaf sway | unit | Stages 1-2 have no leaves to animate |

**Expected state after completion:**
- [ ] Leaves sway gently in stages 3–6
- [ ] Butterflies float in stages 3–6
- [ ] Stream shimmers in stages 5–6
- [ ] Lighthouse glow pulses in stage 6
- [ ] All animations disabled with `prefers-reduced-motion: reduce`
- [ ] No animations when `animated={false}`

---

### Step 3: Dashboard Integration

**Objective:** Add the garden above DashboardHero in the dashboard page, with correct responsive sizing and entrance animation.

**Files to create/modify:**
- `src/pages/Dashboard.tsx` — Import and render `GrowthGarden` above `DashboardHero`
- `src/components/dashboard/GrowthGarden.tsx` — Minor adjustments if needed for dashboard-specific layout

**Details:**

In `Dashboard.tsx`, add the garden component inside the same animation wrapper as `DashboardHero`:

```tsx
<div
  className={shouldAnimate ? 'motion-safe:animate-widget-enter' : undefined}
  style={shouldAnimate ? { animationDelay: '0ms' } : undefined}
>
  <div className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 md:pt-28">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="text-xs text-white/40">Your Garden</p>
      <GrowthGarden
        stage={faithPoints.currentLevel as 1|2|3|4|5|6}
        animated={true}
        streakActive={faithPoints.currentStreak > 0}
        size={/* responsive: 'lg' on desktop, 'md' on mobile */}
      />
    </div>
  </div>
  <DashboardHero
    userName={user.name}
    currentStreak={faithPoints.currentStreak}
    levelName={faithPoints.levelName}
    totalPoints={faithPoints.totalPoints}
    pointsToNextLevel={faithPoints.pointsToNextLevel}
    currentLevel={faithPoints.currentLevel}
    meditationMinutesThisWeek={getMeditationMinutesForWeek()}
  />
</div>
```

**Important layout decision:** The garden sits above DashboardHero but shares its gradient. Two approaches:

**Approach A (preferred):** Modify `DashboardHero` to accept an optional `children` or `gardenSlot` prop that renders content above the greeting. This keeps the gradient background seamless.

**Approach B:** Render garden as a separate section above DashboardHero in Dashboard.tsx with matching gradient background so they appear continuous.

Choose **Approach A** — add a `gardenSlot` prop to DashboardHero:

```typescript
interface DashboardHeroProps {
  // ... existing props
  gardenSlot?: React.ReactNode;
}
```

Render `gardenSlot` above the greeting `<div>` inside the hero section. This ensures the garden is within the hero's gradient background and padding.

Responsive size: Use a `useMediaQuery` or Tailwind responsive classes. Since we need the `size` prop value (not just CSS), use two approaches:
- Render the garden at both sizes, hide one with Tailwind responsive utilities:
  - `<div className="lg:hidden">` → `size="md"` (200px)
  - `<div className="hidden lg:block">` → `size="lg"` (300px)
- OR use a simple `window.innerWidth` check in a hook (prefer the CSS approach for SSR safety)

Choose the **CSS approach** with two renders for simplicity and reliability.

Adjust `DashboardHero`'s top padding to accommodate the garden. Currently `pt-24 md:pt-28`. The garden adds height above the greeting — the existing padding provides space for the navbar overlay. The garden should render below that padding, before the greeting.

**Guardrails (DO NOT):**
- Do NOT change existing DashboardHero tests — the component's existing behavior must be preserved
- Do NOT add the garden inside a frosted glass card — it sits directly in the hero area
- Do NOT remove or reorder any existing DashboardHero content
- Do NOT change the stagger animation delays for other dashboard widgets

**Responsive behavior:**
- Desktop (> 1024px): Garden at 300px height, full width within `max-w-6xl`
- Tablet (640px–1024px): Garden at 200px height
- Mobile (< 640px): Garden at 200px height

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders garden in dashboard when authenticated | integration | Verify "Your Garden" label and garden SVG present |
| garden reflects current faith level | integration | Set `wr_faith_points` to level 3, verify stage 3 SVG elements |
| garden shows sun when streak active | integration | Set `wr_streak` with currentStreak > 0, verify sun |
| garden shows overcast when streak is 0 | integration | Set `wr_streak` with currentStreak === 0, verify clouds |
| garden participates in entrance animation | integration | Check `animate-widget-enter` class on garden wrapper |
| existing DashboardHero content unchanged | regression | Verify greeting, streak, level, progress bar still render correctly |

**Expected state after completion:**
- [ ] Garden renders above the greeting in DashboardHero
- [ ] "Your Garden" label visible in `text-xs text-white/40`
- [ ] Garden shows correct stage based on faith level
- [ ] Garden shows sun/overcast based on streak
- [ ] Entrance animation applies to garden
- [ ] All existing DashboardHero tests still pass
- [ ] Responsive sizing works (lg on desktop, md on mobile/tablet)

---

### Step 4: Growth Sparkle Effect

**Objective:** Implement sparkle particles that rise from the garden when faith points are earned, with amplified version for level-ups.

**Files to create/modify:**
- `src/components/dashboard/GrowthGarden.tsx` — Add sparkle particle system
- `src/components/dashboard/GardenSparkle.tsx` — New component for sparkle particle overlay (or inline in GrowthGarden)
- `frontend/tailwind.config.js` — Add sparkle keyframe animation

**Details:**

Add a `garden-sparkle-rise` keyframe to tailwind.config.js:

```javascript
'garden-sparkle-rise': {
  '0%': { opacity: '1', transform: 'translateY(0) translateX(0)' },
  '100%': { opacity: '0', transform: 'translateY(-40px) translateX(var(--drift-x, 0px))' },
},
```

Animation utility:
```javascript
'garden-sparkle-rise': 'garden-sparkle-rise 1s ease-out forwards',
```

The sparkle system works as follows:

1. When `showSparkle` prop changes from `false` to `true`, generate 3–4 particle elements (or 8–10 for level-up).
2. Each particle is a small circle (`4px` × `4px`, rounded-full) with `bg-primary/50` (normal) or `bg-primary/70` (level-up).
3. Particles are positioned at random horizontal positions within the garden's width.
4. Each particle has a CSS custom property `--drift-x` set to a random value between `-10px` and `10px`.
5. Particles animate upward 30–50px while fading out over 1 second.
6. After animation completes (`onAnimationEnd`), the particle element is removed from DOM.

Implementation approach using React state:

```typescript
const [particles, setParticles] = useState<Particle[]>([]);

interface Particle {
  id: string;
  x: number;       // percentage 10-90%
  driftX: number;   // -10 to 10
  riseY: number;    // -30 to -50
  isAmplified: boolean;
}
```

When `showSparkle` transitions to `true`:
- Generate particles with random positions
- Set them in state
- Each particle renders as an absolutely-positioned div with the sparkle animation
- `onAnimationEnd` removes the particle from state

The `showSparkle` prop is a trigger, not a persistent state. The parent (Dashboard.tsx) sets it briefly after `recordActivity()` completes.

**Dashboard.tsx integration:** Track when `faithPoints.totalPoints` changes. When it increases, set a `showSparkle` state to `true`, then reset after 1.5 seconds. Detect level-up by comparing `previousLevel` to `currentLevel`.

```typescript
const prevLevelRef = useRef(faithPoints.currentLevel);
const [gardenSparkle, setGardenSparkle] = useState(false);
const [gardenLevelUp, setGardenLevelUp] = useState(false);

useEffect(() => {
  if (faithPoints.totalPoints > prevPointsRef.current) {
    setGardenSparkle(true);
    if (faithPoints.currentLevel > prevLevelRef.current) {
      setGardenLevelUp(true);
    }
    prevLevelRef.current = faithPoints.currentLevel;
    const timer = setTimeout(() => {
      setGardenSparkle(false);
      setGardenLevelUp(false);
    }, 1500);
    return () => clearTimeout(timer);
  }
}, [faithPoints.totalPoints]);
```

Pass to garden: `showSparkle={gardenSparkle}` and add an `amplifiedSparkle` prop for level-up.

**Respects `prefers-reduced-motion`:** No sparkle particles when reduced motion is enabled. Check `useReducedMotion()` — if true, skip particle generation entirely.

**Guardrails (DO NOT):**
- Do NOT use `requestAnimationFrame` or JS-driven animation for particles
- Do NOT leave orphan DOM elements — particles must be cleaned up after animation
- Do NOT trigger sparkle on page load — only on activity completion
- Do NOT block interaction while sparkle plays

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders particles when showSparkle is true | unit | Verify particle elements appear |
| renders 3-4 particles for normal sparkle | unit | Count particle elements |
| renders 8-10 particles for amplified sparkle | unit | Count particle elements when amplified |
| particles have correct color classes | unit | Check bg-primary/50 or bg-primary/70 |
| no particles when prefers-reduced-motion | unit | Mock reduced motion, verify no particles |
| particles removed after animation completes | unit | Fire animationEnd, verify particles gone |

**Expected state after completion:**
- [ ] Sparkle particles appear when earning faith points
- [ ] Amplified sparkle (8-10 particles) on level-up
- [ ] Particles rise and fade naturally
- [ ] Particles cleaned up after animation
- [ ] No sparkle with `prefers-reduced-motion`

---

### Step 5: Stage Transition (Level-Up Crossfade)

**Objective:** Implement a 2-second crossfade between garden stages when the user levels up.

**Files to create/modify:**
- `src/components/dashboard/GrowthGarden.tsx` — Add crossfade transition logic

**Details:**

Track the previous stage to enable crossfade:

```typescript
const [displayStage, setDisplayStage] = useState(stage);
const [previousStage, setPreviousStage] = useState<number | null>(null);
const [isTransitioning, setIsTransitioning] = useState(false);
const prefersReduced = useReducedMotion();

useEffect(() => {
  if (stage !== displayStage) {
    if (animated && !prefersReduced) {
      // Start crossfade
      setPreviousStage(displayStage);
      setDisplayStage(stage);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousStage(null);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Instant switch (reduced motion or not animated)
      setDisplayStage(stage);
    }
  }
}, [stage, animated, prefersReduced]);
```

Render both SVGs during crossfade:

```tsx
<div className="relative">
  {/* Previous stage (fading out) */}
  {isTransitioning && previousStage && (
    <div
      className="absolute inset-0"
      style={{
        animation: 'garden-fade-out 2s ease-in-out forwards',
      }}
    >
      <GardenStage stage={previousStage} ... />
    </div>
  )}
  {/* Current stage (fading in during transition, or fully visible) */}
  <div
    style={isTransitioning ? {
      animation: 'garden-fade-in 2s ease-in-out forwards',
    } : undefined}
  >
    <GardenStage stage={displayStage} ... />
  </div>
</div>
```

Add keyframes to tailwind.config.js:
```javascript
'garden-fade-out': {
  '0%': { opacity: '1' },
  '100%': { opacity: '0' },
},
'garden-fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
```

The crossfade coordinates with CelebrationOverlay:
- Garden crossfade begins immediately when level changes
- CelebrationOverlay appears on top (it's a z-50 fixed overlay)
- When CelebrationOverlay dismisses (after ~6 seconds), garden has already completed its 2-second crossfade

**With `prefers-reduced-motion`:** New stage appears instantly. No crossfade animation.

**Guardrails (DO NOT):**
- Do NOT delay the crossfade — it starts immediately on level change
- Do NOT use JavaScript-based opacity tweening — use CSS animation
- Do NOT block user interaction during crossfade
- Do NOT crossfade on initial render (only on stage changes)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| crossfades when stage changes | unit | Change stage prop, verify both old and new stage SVGs are rendered during transition |
| crossfade completes after 2 seconds | unit | Use fake timers, advance 2000ms, verify only new stage remains |
| instant switch with reduced motion | unit | Mock reduced motion, change stage, verify no transition state |
| no crossfade on initial render | unit | First render with stage=3, verify no transition class |
| no crossfade when animated=false | unit | Profile garden mode, verify instant switch |

**Expected state after completion:**
- [ ] Smooth 2-second crossfade between stages on level-up
- [ ] Both old and new SVGs visible during transition
- [ ] Instant switch with `prefers-reduced-motion`
- [ ] Works correctly behind CelebrationOverlay
- [ ] No crossfade on initial render

---

### Step 6: Profile Garden Integration

**Objective:** Add the garden to the Growth Profile page (`/profile/:userId`) as a smaller, static version.

**Files to create/modify:**
- `src/pages/GrowthProfile.tsx` — Add `GrowthGarden` below `ProfileHeader`
- `src/components/profile/ProfileGarden.tsx` — Optional thin wrapper component

**Details:**

In `GrowthProfile.tsx`, add the garden between `ProfileHeader` and `ProfileBadgeShowcase`:

```tsx
<ProfileHeader ... />
{profileData.currentLevel !== null && (
  <div className="mt-6 flex flex-col items-center">
    <GrowthGarden
      stage={(profileData.currentLevel ?? 1) as 1|2|3|4|5|6}
      animated={false}
      showSparkle={false}
      streakActive={(profileData.currentStreak ?? 0) > 0}
      size="sm"
    />
  </div>
)}
<div className="mt-6">
  <ProfileBadgeShowcase ... />
</div>
```

The garden is only shown when `currentLevel` is available (non-null). If stats are privacy-hidden (`profileData.statsVisible === false`), the level data will be `null` and the garden won't render — this respects the existing privacy model.

For the user's own profile, `currentLevel` is always available. For other users, it depends on their privacy settings.

**Responsive behavior:**
- All breakpoints: Garden at 150px height (`"sm"` size)
- Centered within the `max-w-3xl` container
- No animations, no sparkle

**Guardrails (DO NOT):**
- Do NOT add animations to the profile garden
- Do NOT add sparkle to the profile garden
- Do NOT add new data fetching — use existing `useProfileData` fields
- Do NOT show garden when stats are privacy-hidden (currentLevel === null)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders garden on own profile | integration | Render with own profile data, verify garden present |
| renders garden for friend profile | integration | Render with friend profile data visible, verify garden |
| hides garden when stats are private | integration | Render with statsVisible=false, verify no garden |
| garden is static (no animations) | unit | Verify animated=false passed to GrowthGarden |
| garden uses sm size | unit | Verify size="sm" passed |
| streak reflected in profile garden | unit | Set streak data, verify sun/overcast |

**Expected state after completion:**
- [ ] Garden appears on profile pages when level data is visible
- [ ] Garden is static — no animations, no sparkle
- [ ] Garden respects privacy settings (hidden when stats are private)
- [ ] Garden shows correct stage and streak sky for the viewed user
- [ ] All existing profile tests still pass

---

### Step 7: Comprehensive Testing

**Objective:** Add a comprehensive test suite covering all garden functionality, accessibility, and edge cases.

**Files to create/modify:**
- `src/components/dashboard/__tests__/GrowthGarden.test.tsx` — New test file
- `src/components/dashboard/__tests__/GrowthGarden-sparkle.test.tsx` — Sparkle-specific tests
- `src/components/dashboard/__tests__/GrowthGarden-transition.test.tsx` — Crossfade-specific tests
- `src/components/dashboard/__tests__/GrowthGarden-a11y.test.tsx` — Accessibility tests

**Details:**

**GrowthGarden.test.tsx** — Core rendering tests:
- Renders each of the 6 stages with unique SVG content
- Size variants apply correct height classes
- Streak active shows sun element
- Streak inactive shows cloud elements
- Uses correct color palette values
- Garden aria-label changes per stage

**GrowthGarden-sparkle.test.tsx** — Sparkle effect tests:
- Normal sparkle generates 3-4 particles
- Amplified sparkle generates 8-10 particles
- Particles have correct color classes
- Particles removed after animation
- No particles when reduced motion is set
- No particles when animated is false

**GrowthGarden-transition.test.tsx** — Stage transition tests:
- Crossfade renders both stages during transition
- Crossfade completes after 2 seconds (fake timers)
- No crossfade on initial render
- Instant switch with reduced motion
- Instant switch when animated=false

**GrowthGarden-a11y.test.tsx** — Accessibility tests:
- All 6 stages have `role="img"` and descriptive `aria-label`
- "Your Garden" label is associated with the garden
- No animation classes when `prefers-reduced-motion` is set
- Touch targets not relevant (garden is non-interactive)

**Test patterns to follow:**
```typescript
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { GrowthGarden } from '../GrowthGarden'

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

describe('GrowthGarden', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders stage 1 with seedling elements', () => {
    render(<GrowthGarden stage={1} size="lg" />)
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Your garden: a tiny sprout in bare soil'
    )
  })
})
```

**Guardrails (DO NOT):**
- Do NOT test implementation details (internal state, exact SVG paths)
- Do NOT create snapshot tests (SVGs are complex and snapshots would be brittle)
- DO test from the user's perspective (what's visible, what's announced)

**Expected state after completion:**
- [ ] Full test coverage for all garden functionality
- [ ] All tests pass
- [ ] Accessibility requirements verified in tests
- [ ] Reduced motion behavior verified
- [ ] Edge cases covered (stage 1 with no streak, stage 6 at max level, etc.)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Garden SVG component with 6 stages, sizes, streak sky |
| 2 | 1 | CSS ambient animations for SVG elements |
| 3 | 1, 2 | Dashboard integration (render garden above hero) |
| 4 | 1, 3 | Growth sparkle particle effect |
| 5 | 1, 3 | Stage transition crossfade on level-up |
| 6 | 1 | Profile page garden integration |
| 7 | 1, 2, 3, 4, 5, 6 | Comprehensive test suite |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Garden SVG Component — 6 Stages | [COMPLETE] | 2026-03-24 | Created `frontend/src/components/dashboard/GrowthGarden.tsx` with 6 inline SVG stages, size variants (sm/md/lg), streak-responsive sky (sun/clouds), accessibility (role="img", aria-label per stage), data-testid per stage. Tests: `__tests__/GrowthGarden.test.tsx` (31 tests). OakScene `uid` param destructured but unused (kept in type signature for consistency with LighthouseScene). |
| 2 | Ambient CSS Animations | [COMPLETE] | 2026-03-24 | Added 7 garden keyframes + animation utilities to `tailwind.config.js`: leaf-sway (4s), butterfly-float (6s), water-shimmer (3s), glow-pulse (2s), fade-out/in (2s), sparkle-rise (1s). Animation classes already applied in GrowthGarden.tsx from Step 1. 7 animation tests added. |
| 3 | Dashboard Integration | [COMPLETE] | 2026-03-24 | Added `gardenSlot` prop to DashboardHero (renders above greeting). Dashboard.tsx passes garden with responsive sizing (lg:hidden/hidden lg:block pattern for md/lg). "Your Garden" label in `text-xs text-white/40`. 6 integration tests added. All existing DashboardHero (12) and Dashboard (9) tests still pass. |
| 4 | Growth Sparkle Effect | [COMPLETE] | 2026-03-24 | Added `SparkleOverlay` component to GrowthGarden.tsx with CSS-animated particles. Dashboard.tsx tracks `faithPoints.totalPoints` changes via `useRef`/`useEffect`, sets `gardenSparkle`/`gardenLevelUp` state. Fixed hooks ordering (moved before early returns). 7 sparkle tests in `GrowthGarden-sparkle.test.tsx`. |
| 5 | Stage Transition Crossfade | [COMPLETE] | 2026-03-24 | Added crossfade logic in GrowthGarden.tsx: tracks `displayStage`/`previousStage`/`isTransitioning` state. Renders both SVGs during 2s transition with `animate-garden-fade-out`/`animate-garden-fade-in`. Instant switch for `animated=false` or `prefers-reduced-motion`. No crossfade on initial render. 5 transition tests in `GrowthGarden-transition.test.tsx`. |
| 6 | Profile Garden Integration | [COMPLETE] | 2026-03-24 | Added GrowthGarden to GrowthProfile.tsx between ProfileHeader and ProfileBadgeShowcase. Static (`animated=false`, `showSparkle=false`), `size="sm"` (150px). Respects privacy: only renders when `currentLevel !== null`. 4 profile garden tests added to existing `GrowthProfile.test.tsx`. All 10 profile tests pass. |
| 7 | Comprehensive Testing | [COMPLETE] | 2026-03-24 | Created `GrowthGarden-a11y.test.tsx` (18 tests): role/aria-label per stage, reduced motion disables all animations/sparkle/crossfade, non-interactive (no buttons/links), edge cases (stage 1 no streak, stage 6 max level). Fixed TS error with SVGAnimatedString type in animation tests. Total: 74 garden tests in 4 files + 31 related tests = 105 all green. |
