# Implementation Plan: Celebrations & Badge Collection UI

**Spec:** `_specs/celebrations-badge-ui.md`
**Date:** 2026-03-17
**Branch:** `claude/feature/celebrations-badge-ui`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** none
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

**Project structure:**
- Components: `frontend/src/components/dashboard/` — existing: `StreakCard.tsx`, `DashboardCard.tsx`, `DashboardWidgetGrid.tsx`, `DashboardHero.tsx`, `MoodChart.tsx`, `ActivityChecklist.tsx`, `QuickActions.tsx`, `MoodCheckIn.tsx`
- UI Components: `frontend/src/components/ui/Toast.tsx` — existing toast system with `ToastProvider`/`useToast` context
- Constants: `frontend/src/constants/dashboard/badges.ts` — all ~35 badge definitions, `BADGE_MAP`, `BADGE_DEFINITIONS`, level-up verses, streak names
- Constants: `frontend/src/constants/dashboard/levels.ts` — `LEVEL_THRESHOLDS`, `LEVEL_ICON_NAMES`, `getLevelForPoints()`
- Constants: `frontend/src/constants/dashboard/mood.ts` — `MOOD_COLORS` for confetti particle colors
- Services: `frontend/src/services/badge-storage.ts` — `getBadgeData()`, `saveBadgeData()`, `clearNewlyEarned()`, `getOrInitBadgeData()`
- Services: `frontend/src/services/badge-engine.ts` — `checkForNewBadges()` (Spec 7)
- Hooks: `frontend/src/hooks/useFaithPoints.ts` — exposes `newlyEarnedBadges`, `clearNewlyEarnedBadges()` in return value
- Hooks: `frontend/src/hooks/useFocusTrap.ts` — focus trap for modal overlays, supports Escape key callback
- Hooks: `frontend/src/hooks/useAnnounce.tsx` — screen reader announcement system
- Types: `frontend/src/types/dashboard.ts` — `CelebrationTier`, `BadgeCategory`, `BadgeEarnedEntry`, `BadgeData`, `BadgeDefinition`
- Auth: `frontend/src/contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()` with `isAuthenticated`
- Pages: `frontend/src/pages/Dashboard.tsx` — renders `MoodCheckIn` or dashboard content based on check-in state
- Tailwind config: `frontend/tailwind.config.js` — custom keyframes and animations defined here
- Tests: co-located `__tests__/` directories, vitest + React Testing Library, `localStorage.clear()` in `beforeEach`

**Key existing Toast.tsx analysis:**
- Interface: `Toast { id, message, type: 'success' | 'error' }`
- Context: `ToastContextValue { showToast(message, type?) }`
- Position: `fixed top-4 right-4 z-50` (top-right)
- Max 3 toasts (slices to last 3)
- Auto-dismiss: 6000ms
- Styling: white bg, `border-l-4` with success/danger color, `animate-slide-from-right`
- Used in App.tsx wrapping entire app: `<ToastProvider>` around `<AuthModalProvider>` around `<AudioProvider>`

**Key existing StreakCard.tsx analysis:**
- Props: `currentStreak`, `longestStreak`, `totalPoints`, `currentLevel`, `levelName`, `pointsToNextLevel`, `todayMultiplier`
- `getRecentBadges()` already reads from `wr_badges.earned`, resolves names via `BADGE_MAP`, returns top 3 sorted by `earnedAt` desc
- Currently renders badges as small lettered circles with `title` attribute, no click handler, no "View all badges" link
- This spec must: add Lucide icons to recent badges, add click handler to open badge grid, add "View all badges" link, add streak reset messaging

**Key existing Dashboard.tsx analysis:**
- Conditionally renders `MoodCheckIn` vs dashboard content
- Dashboard content: `Navbar`, `DashboardHero`, `DashboardWidgetGrid`, `SiteFooter`
- This spec must: add `CelebrationQueue` component that renders after dashboard content loads

**Key existing useFaithPoints.ts analysis:**
- Returns `newlyEarnedBadges: string[]` in state
- Exposes `clearNewlyEarnedBadges()` which calls `clearNewlyEarned()` from badge-storage and updates state
- This is the primary data source for the celebration queue

**Cross-spec dependencies:**
- **Consumes from Spec 7:** `BADGE_DEFINITIONS`, `BADGE_MAP`, `LEVEL_UP_VERSES`, badge IDs with `celebrationTier`, `verse` fields, `BadgeData.newlyEarned`
- **Consumes from Spec 5:** `useFaithPoints()` return value including `newlyEarnedBadges`, `clearNewlyEarnedBadges`, `currentStreak`, `longestStreak`
- **Extends from Spec 6:** `StreakCard.tsx` (recent badges section, streak reset message)
- **Extends from Spec 2:** `Dashboard.tsx` (celebration queue integration)
- **Extends:** `Toast.tsx` (new celebration types), `tailwind.config.js` (new keyframes)
- **Consumed by Spec 14:** Badge grid component will be embedded on profile page

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Celebration queue processing | Only for authenticated users on dashboard | Step 5 | Dashboard only renders when `isAuthenticated` (RootRoute in App.tsx). `useFaithPoints` returns empty `newlyEarnedBadges` when not authenticated. |
| `newlyEarned` read from localStorage | Only for authenticated users | Step 5 | `useFaithPoints` already guards with `isAuthenticated` |
| `clearNewlyEarnedBadges()` call | Only for authenticated users | Step 5 | Already guarded in `useFaithPoints` |
| Badge collection grid view | Only for authenticated users | Step 6 | Grid is inside StreakCard which is inside DashboardWidgetGrid, only rendered on authenticated dashboard |
| Recent badges in StreakCard | Only for authenticated users | Step 7 | StreakCard is only rendered on authenticated dashboard |
| Streak reset message | Only for authenticated users | Step 7 | Same as above |

---

## Design System Values (for UI steps)

### Celebration Toast Cards
- Background: `bg-white/10 backdrop-blur-md border border-white/15 text-white`
- Position (desktop): `fixed bottom-4 right-4 z-50`
- Position (mobile): `fixed bottom-4 left-4 right-4 z-50` (centered, full width minus mx-4)
- Max width (desktop): `max-w-[360px]`
- Max width (tablet): `max-w-[400px]`
- Border radius: `rounded-xl`
- Padding: `px-4 py-3`
- Text: badge name in `font-sans text-sm font-medium text-white`, congrats in `text-xs text-white/70`
- Slide-in: `animate-slide-from-right` on desktop, custom `animate-slide-from-bottom` on mobile
- Special-toast accent: `border-amber-400/50` + `shadow-[0_0_20px_rgba(251,191,36,0.2)]`

### Full-Screen Overlay
- Backdrop: `fixed inset-0 z-[60] bg-black/70 backdrop-blur-md`
- Icon size: `w-20 h-20 sm:w-24 sm:h-24 lg:w-[120px] lg:h-[120px]`
- Title: `font-serif text-2xl sm:text-3xl md:text-4xl text-white`
- Encouragement: `font-serif text-lg sm:text-xl text-white/80 italic`
- Verse text: `font-serif text-base sm:text-lg text-white/70 italic`
- Verse reference: `font-sans text-sm text-white/50`
- Continue button: `border border-white/30 text-white px-8 py-3 rounded-lg hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50`
- Continue button (mobile): `w-full py-4`

### Badge Grid
- Grid: `grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3`
- Cell size: `w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20`
- Earned glow: `shadow-[0_0_12px_rgba(var,0.4)]` with category-specific color
- Locked: `opacity-40 grayscale`
- Lock icon: Lucide `Lock`, `w-4 h-4`, positioned `absolute bottom-0 right-0`
- Section label: `text-xs font-semibold uppercase tracking-wider text-white/40 mb-2`

### Confetti Colors (from mood palette + white + gold)
- `#D97706` (amber), `#C2703E` (copper), `#8B7FA8` (gray-purple), `#2DD4BF` (teal), `#34D399` (green)
- `#FFFFFF` (white), `#FCD34D` (gold/amber-300)

---

## Design System Reminder

- DO NOT use `outline-none` without visible replacement; use `focus-visible:ring-2`
- All interactive elements minimum 44x44px touch target on mobile
- `prefers-reduced-motion`: all animations disabled, confetti hidden, instant state transitions
- Use `cn()` from `@/lib/utils` for all conditional class merging
- Use `font-serif` (Lora) for celebration titles and scripture
- Use `font-sans` (Inter) for body text in toasts
- All colors from the design system; no ad-hoc hex values
- `motion-reduce:` prefix for Tailwind classes that need reduced-motion variants
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399

---

## Shared Data Models (from Master Plan)

```typescript
// Already exists in types/dashboard.ts
type CelebrationTier = 'toast' | 'toast-confetti' | 'special-toast' | 'full-screen';

// Already exists in constants/dashboard/badges.ts
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  celebrationTier: CelebrationTier;
  repeatable?: boolean;
  verse?: { text: string; reference: string };
}

// Level-up verses already in LEVEL_UP_VERSES constant
// Badge definitions already in BADGE_DEFINITIONS / BADGE_MAP

// New: badge icon mapping (this spec creates)
type BadgeIconConfig = {
  icon: LucideIcon;
  bgColor: string;    // Tailwind bg class
  textColor: string;  // Tailwind text class
  glowColor: string;  // raw rgba for box-shadow
};

// New: celebration queue item
interface CelebrationQueueItem {
  badgeId: string;
  badge: BadgeDefinition;
  tier: CelebrationTier;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_badges` | Read | Badge data including `newlyEarned` array and `earned` record |

---

## Responsive Structure

| Component | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|-----------|-------------------|---------------------|---------------------|
| Celebration toasts | bottom-center, full-width - mx-4 | bottom-right, max-w-[400px] | bottom-right, max-w-[360px] |
| Full-screen overlay | px-6, icon 80px, text-2xl, Continue full-width py-4 | px-8, icon 96px, text-3xl | px-8, icon 120px, text-4xl |
| Badge grid | 4 cols, cells 56px | 5 cols, cells 64px | 6 cols, cells 80px |
| Toast confetti particles | 6 | 12 | 12 |
| Full-screen confetti particles | 15 | 30 | 30 |
| Recent badges (StreakCard) | 32px icons, inline | Same | Same |

---

## Vertical Rhythm

- Celebration toasts appear bottom-right, spaced `gap-2` (8px) between stacked toasts
- Full-screen overlay content vertically centered with `flex flex-col items-center justify-center gap-4 sm:gap-6`
- Badge grid sections have `mb-6` between category groups, `mb-2` between label and grid

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 7 is fully implemented and `BADGE_DEFINITIONS`, `BADGE_MAP`, `LEVEL_UP_VERSES`, badge-storage service, badge-engine service, and `useFaithPoints` integration are all working
- [ ] `useFaithPoints` returns `newlyEarnedBadges` and `clearNewlyEarnedBadges` as verified in the hook source
- [ ] `useFocusTrap` is available and supports `onEscape` callback
- [ ] No external animation libraries are installed or should be installed — all animation is CSS `@keyframes`
- [ ] `prefers-reduced-motion` is handled with Tailwind `motion-reduce:` prefix and `@media` queries
- [ ] The existing Toast system positions at top-right — celebration toasts will use a separate container at bottom
- [ ] Badge artwork is Lucide icons (temporary placeholders) — no custom SVG badge assets needed
- [ ] `wr_badges` localStorage key uses the object format from Spec 7 (not array)
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference or codebase inspection)
- [ ] Prior specs in the sequence are complete and committed (Specs 5, 6, 7)

---

## Edge Cases & Decisions

| Edge Case | Decision |
|-----------|----------|
| Empty `newlyEarned` | No delay, no celebration queue, no side effects |
| Corrupted `wr_badges` JSON | Return empty defaults, no crash, no celebration |
| `newlyEarned` has unknown badge IDs | Skip silently (filter against `BADGE_MAP`) |
| User navigates away mid-celebration | Clear `newlyEarned` on unmount, skip remaining |
| Very long `newlyEarned` queue | Cap at 5 toasts + 2 full-screen (per spec) |
| Multiple full-screen celebrations | Show sequentially, Continue reveals next |
| Streak reset detection | `currentStreak <= 1 AND longestStreak > 1` — shows inline message, no toast |
| Brand-new user (longestStreak 0 or 1) | No streak reset message shown |
| Badge grid with zero badges | Section hidden (should not happen — Welcome + Seedling auto-awarded) |
| Repeatable badge (full_worship_day) tooltip | Show count and last earned date |
| `prefers-reduced-motion` mid-celebration | CSS handles automatically; confetti hidden, animations snap |
| localStorage unavailable | No celebrations, no badge grid, no crash |

---

## Implementation Steps

### Step 1: Badge Icon Mapping Constants

**Objective:** Create a mapping from badge IDs and categories to Lucide icons and colors for visual representation.

**Files to create/modify:**
- `frontend/src/constants/dashboard/badge-icons.ts` — NEW

**Details:**
- Define `BADGE_ICON_MAP: Record<string, BadgeIconConfig>` mapping each badge ID (or category default) to a Lucide icon, background color class, text color class, and glow color (rgba string for `box-shadow`)
- Import icons: `Flame`, `Sprout`, `Leaf`, `Flower2`, `TreePine`, `Trees`, `Landmark`, `HandHeart`, `BookOpen`, `Brain`, `Headphones`, `Users`, `Heart`, `Sparkles`, `Crown` from `lucide-react`
- Category-based defaults for badges not explicitly mapped
- Export `getBadgeIcon(badgeId: string): BadgeIconConfig` function that looks up by ID, then falls back to category default
- Export `CONFETTI_COLORS: string[]` array: `['#D97706', '#C2703E', '#8B7FA8', '#2DD4BF', '#34D399', '#FFFFFF', '#FCD34D']`

**Icon assignments:**
- Streak badges (`streak_*`): `Flame`, amber bg (`bg-amber-500/20`), amber text (`text-amber-400`), glow `rgba(245,158,11,0.4)`
- Level badges (`level_1` through `level_6`): respective level icon (Sprout/Leaf/Flower2/TreePine/Trees/Landmark), purple bg (`bg-primary/20`), purple text (`text-primary-lt`), glow `rgba(139,92,246,0.4)`
- Prayer badges: `HandHeart`, rose bg, rose text
- Journal badges: `BookOpen`, blue bg, blue text
- Meditate badges: `Brain`, indigo bg, indigo text
- Listen badges: `Headphones`, teal bg, teal text
- Prayer wall badge: `HandHeart`, warm orange
- Community friend badges: `Users`, green bg, green text
- Community encouragement badges: `Heart`, pink bg, pink text
- Welcome badge: `Sparkles`, gold bg, gold text
- Full Worship Day: `Crown`, gold bg (`bg-amber-400/20`), gold text (`text-amber-300`), glow `rgba(252,211,77,0.5)`

**Export:** `LEVEL_ENCOURAGEMENT_MESSAGES: Record<number, string>` (new constant for full-screen overlay messages)
- Level 1 (Seedling): "Your journey of faith begins"
- Level 2 (Sprout): "Your faith is taking root"
- Level 3 (Blooming): "Your spirit is blossoming"
- Level 4 (Flourishing): "Your devotion bears fruit"
- Level 5 (Oak): "Deep roots, strong faith"
- Level 6 (Lighthouse): "Your light shines for all to see"

**Export:** `STREAK_MILESTONE_MESSAGES: Record<number, string>`
- 60: "60 days of faithfulness. God sees your consistency."
- 90: "90 days of unwavering faith. What a journey."
- 180: "Half a year of daily devotion. Remarkable."
- 365: "A full year of faith. This is extraordinary."

**Guardrails (DO NOT):**
- Import any animation libraries
- Create actual SVG badge artwork
- Add colors not in the design system palette

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Every badge ID resolves an icon | unit | Every badge ID in `BADGE_DEFINITIONS` has a resolved icon config via `getBadgeIcon()` |
| CONFETTI_COLORS has entries | unit | `CONFETTI_COLORS` has at least 5 entries |
| Level encouragement messages | unit | All level encouragement messages exist (levels 1-6) |
| Streak milestone messages | unit | All streak milestone messages exist for 60, 90, 180, 365 |

**Test file:** `frontend/src/constants/dashboard/__tests__/badge-icons.test.ts`

**Expected state after completion:**
- [ ] `getBadgeIcon()` returns valid config for every badge in `BADGE_DEFINITIONS`
- [ ] `CONFETTI_COLORS` array exported with 7 colors
- [ ] `LEVEL_ENCOURAGEMENT_MESSAGES` and `STREAK_MILESTONE_MESSAGES` exported
- [ ] All tests pass

---

### Step 2: New Tailwind Animations for Celebrations

**Objective:** Add new keyframe animations for celebration toasts, full-screen overlay, and confetti.

**Files to create/modify:**
- `frontend/tailwind.config.js` — MODIFY

**Details:**

New keyframes to add in `theme.extend.keyframes`:

```javascript
'slide-from-bottom': {
  from: { transform: 'translateY(40px)', opacity: '0' },
  to: { transform: 'translateY(0)', opacity: '1' },
},
'celebration-spring': {
  '0%': { transform: 'scale(0)', opacity: '0' },
  '60%': { transform: 'scale(1.1)', opacity: '1' },
  '100%': { transform: 'scale(1)', opacity: '1' },
},
'confetti-fall': {
  '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
  '80%': { opacity: '1' },
  '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
},
'confetti-burst': {
  '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
  '100%': { transform: 'var(--confetti-end)', opacity: '0' },
},
'continue-fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
```

New animations to add in `theme.extend.animation`:

```javascript
'slide-from-bottom': 'slide-from-bottom 300ms ease-out forwards',
'celebration-spring': 'celebration-spring 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
'confetti-fall': 'confetti-fall var(--confetti-duration, 3s) ease-in forwards',
'confetti-burst': 'confetti-burst 1.5s ease-out forwards',
'continue-fade-in': 'continue-fade-in 400ms ease-in forwards',
```

**Guardrails (DO NOT):**
- Remove or modify existing keyframes/animations
- Add JavaScript-based animations
- Import Framer Motion, React Spring, or any animation library

**Test specifications:**
- Visual verification only (no unit test for Tailwind config). Verified during integration tests.

**Expected state after completion:**
- [ ] All 5 new keyframes added to `tailwind.config.js`
- [ ] All 5 new animation classes available (`animate-slide-from-bottom`, `animate-celebration-spring`, `animate-confetti-fall`, `animate-confetti-burst`, `animate-continue-fade-in`)
- [ ] Existing animations unchanged

---

### Step 3: Extend Toast System with Celebration Types

**Objective:** Extend the existing toast to support celebration-specific types, with a separate bottom-positioned container for celebration toasts.

**Files to create/modify:**
- `frontend/src/components/ui/Toast.tsx` — MODIFY

**Details:**

Changes to Toast interface:
```typescript
type ToastType = 'success' | 'error' | 'celebration' | 'celebration-confetti' | 'special-celebration';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  icon?: ReactNode;
  badgeName?: string; // for celebration toasts
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: { icon?: ReactNode; badgeName?: string; duration?: number }) => void;
  showCelebrationToast: (badgeName: string, message: string, type: CelebrationToastType, icon?: ReactNode) => void;
}

type CelebrationToastType = 'celebration' | 'celebration-confetti' | 'special-celebration';
```

**Architecture:**
- Maintain TWO separate toast containers in `ToastProvider` render:
  1. Existing: `fixed top-4 right-4 z-50` for `success`/`error` (unchanged)
  2. New: celebration container for bottom positioning
- Celebration container position:
  - Mobile: `fixed bottom-4 left-4 right-4 z-50 flex flex-col items-center gap-2`
  - Desktop: `fixed bottom-4 right-4 z-50 flex flex-col gap-2` with `max-w-[360px] sm:max-w-[400px]`
- Celebration toasts have separate state array: `celebrationToasts` (max 3 visible)
- `showCelebrationToast` adds to celebration queue; returns a Promise that resolves when the toast is dismissed (needed for sequential queue processing in Step 5)
- Auto-dismiss durations: `celebration` 4000ms, `celebration-confetti` 5000ms, `special-celebration` 5000ms

**Celebration toast card styling:**
- Base: `bg-white/10 backdrop-blur-md border border-white/15 text-white rounded-xl px-4 py-3`
- Content layout: flex row with icon (left) + text (right)
- Icon container: 32px rounded-full with badge-specific bg color
- Badge name: `text-sm font-medium text-white`
- Congrats message: `text-xs text-white/70`
- `special-celebration` extras: `border-amber-400/50` border override, golden glow shadow `shadow-[0_0_20px_rgba(251,191,36,0.2)]`, slightly larger padding
- Slide animation: `animate-slide-from-right` on desktop, `animate-slide-from-bottom` on mobile (use `window.innerWidth < 640` check at render time)
- `motion-reduce:animate-none` — instant appear

**Confetti for `celebration-confetti` type:**
- Render 6 (mobile) or 12 (desktop) small `<span>` elements inside the toast card, absolutely positioned
- Each particle: 4-6px square or circle, random color from `CONFETTI_COLORS`, `animate-confetti-burst` with unique `--confetti-end` CSS variable (random translate values)
- Particles use `motion-reduce:hidden` to hide when reduced motion preferred

**`showCelebrationToast` returns `Promise<void>`:**
```typescript
showCelebrationToast: (badgeName, message, type, icon?) => Promise<void>
```
The promise resolves when the toast auto-dismisses or is manually dismissed. This enables sequential queue processing.

**Responsive behavior:**
- Desktop (1024px+): bottom-right, max-w-[360px], slide-from-right animation
- Tablet (640-1024px): bottom-right, max-w-[400px], slide-from-right animation
- Mobile (<640px): bottom-center full width, slide-from-bottom animation

**Guardrails (DO NOT):**
- Break existing `success`/`error` toast behavior
- Change the existing `showToast` signature for existing callers (only add optional params)
- Use JavaScript animation for confetti (CSS only)
- Import animation libraries

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing toasts unchanged | integration | `success`/`error` toasts still render at top-right |
| Celebration toast renders | integration | `celebration` toast renders at bottom with correct styling |
| Confetti in celebration-confetti | integration | `celebration-confetti` toast includes confetti particle elements |
| Special celebration styling | integration | `special-celebration` toast has golden accent border |
| Max 3 celebration toasts | integration | Max 3 celebration toasts visible simultaneously |
| Auto-dismiss durations | integration | Correct durations (4s for celebration, 5s for confetti/special) |
| ARIA attributes | integration | `role="status"` and `aria-live="polite"` on celebration toasts |
| Separate containers | integration | Celebration toasts do NOT appear in the top-right container |
| Reduced motion | integration | Confetti particles hidden when `prefers-reduced-motion` is mocked |

**Test file:** `frontend/src/components/ui/__tests__/Toast.test.tsx` (NEW or extend existing)

**Expected state after completion:**
- [ ] `showCelebrationToast` available on toast context
- [ ] Celebration toasts render in bottom container, separate from existing toasts
- [ ] Confetti particles render for `celebration-confetti` type
- [ ] `special-celebration` has golden accent
- [ ] Promise-based API enables sequential queue processing
- [ ] All tests pass

---

### Step 4: Full-Screen Celebration Overlay Component

**Objective:** Create full-screen overlay for level-up and major streak celebrations.

**Files to create/modify:**
- `frontend/src/components/dashboard/CelebrationOverlay.tsx` — NEW

**Details:**

Props:
```typescript
interface CelebrationOverlayProps {
  badge: BadgeDefinition;
  onDismiss: () => void;
}
```

Component structure:
```
<Portal to document.body>
  <div role="dialog" aria-labelledby="celebration-title" aria-modal="true" ref={focusTrapRef}>
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md">
      {/* Confetti particles (20-30 on desktop, 15 on mobile) */}
      {confettiParticles}

      <div className="flex min-h-screen flex-col items-center justify-center px-6 sm:px-8">
        {/* Badge/level icon with spring animation */}
        <div className="animate-celebration-spring motion-reduce:animate-none">
          <BadgeIconCircle badge={badge} size="lg" />
        </div>

        {/* Level name or streak milestone name */}
        <h2 id="celebration-title" className="mt-6 font-serif text-2xl text-white sm:text-3xl md:text-4xl">
          {badge.name}
        </h2>

        {/* Encouragement message */}
        <p className="mt-3 font-serif text-lg italic text-white/80 sm:text-xl">
          {encouragementMessage}
        </p>

        {/* Scripture verse (level-ups only) */}
        {badge.verse && (
          <div className="mt-6 max-w-md text-center">
            <p className="font-serif text-base italic text-white/70 sm:text-lg">
              "{badge.verse.text}"
            </p>
            <p className="mt-2 font-sans text-sm text-white/50">
              — {badge.verse.reference}
            </p>
          </div>
        )}

        {/* Continue button (delayed 6s, immediate with reduced motion) */}
        {showContinue && (
          <button className="animate-continue-fade-in mt-8 ..." onClick={onDismiss}>
            Continue
          </button>
        )}
      </div>
    </div>
  </div>
</Portal>
```

**Behavior:**
- Use `useFocusTrap(true, onDismiss)` for focus trapping + Escape key dismiss
- Continue button appears after 6s delay via `useState` + `setTimeout`
- When `prefers-reduced-motion`: Continue button visible immediately (check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` on mount)
- When Continue appears, auto-focus it via `useEffect` + `ref.current?.focus()`
- Confetti: generate array of 15/30 `<span>` elements with randomized positions, colors from `CONFETTI_COLORS`, durations 2-4s, staggered delays 0-1s
- Scroll lock: `document.body.style.overflow = 'hidden'` on mount, restore on unmount

**Encouragement message lookup:**
- For level badges: use `LEVEL_ENCOURAGEMENT_MESSAGES[levelNumber]` from Step 1
- For streak badges: use `STREAK_MILESTONE_MESSAGES[streakThreshold]` from Step 1
- Extract level number from `badge.id` (e.g., `level_3` -> `3`)
- Extract streak threshold from `badge.id` (e.g., `streak_60` -> `60`)

**BadgeIconCircle sub-component** (or inline):
- Renders the Lucide icon inside a colored circle
- Size variants: `sm` (32px), `md` (64px), `lg` (80px mobile / 96px tablet / 120px desktop)
- Uses `getBadgeIcon()` from Step 1 for icon + colors

**Responsive behavior:**
- Desktop (1024px+): icon 120px, text-4xl, px-8
- Tablet (640-1024px): icon 96px, text-3xl, px-8
- Mobile (<640px): icon 80px, text-2xl, px-6, Continue button full-width py-4

**Guardrails (DO NOT):**
- Use React portals to `document.body` if a portal utility doesn't exist — use `createPortal` from `react-dom`
- Import Framer Motion or any animation library
- Make the overlay dismissible by clicking outside (only Continue button and Escape)
- Show verse for streak milestones (only level-ups have verses)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Level-up rendering | integration | Shows name, encouragement, verse, reference |
| Streak rendering | integration | Shows name, encouragement, NO verse |
| Continue button delay | integration | Not visible initially (before 6s) |
| Continue button appears | integration | After 6s timeout, Continue button appears and receives focus |
| Continue dismisses | integration | Continue button click calls `onDismiss` |
| Escape dismisses | integration | Escape key calls `onDismiss` |
| Focus trap | integration | Focus is trapped within overlay |
| Dialog role | unit | `role="dialog"` with `aria-labelledby` present |
| Reduced motion | integration | Continue button visible immediately, no spring animation class |
| Confetti particles | unit | Correct number of confetti particle elements rendered |
| Confetti hidden | unit | Confetti particles have `motion-reduce:hidden` class |
| Correct icon | unit | Correct icon rendered for level badge (e.g., `Sprout` for level_2) |

**Test file:** `frontend/src/components/dashboard/__tests__/CelebrationOverlay.test.tsx`

**Expected state after completion:**
- [ ] Full-screen overlay renders for level-up and streak badges
- [ ] Confetti animation plays (CSS only)
- [ ] Continue button delayed 6s (instant with reduced motion)
- [ ] Focus trapped, Escape dismisses
- [ ] All tests pass

---

### Step 5: Celebration Queue Processor Hook and Component

**Objective:** Hook that reads `newlyEarned`, sorts by tier, processes celebrations sequentially. Component renders the appropriate celebration UI.

**Files to create/modify:**
- `frontend/src/hooks/useCelebrationQueue.ts` — NEW
- `frontend/src/components/dashboard/CelebrationQueue.tsx` — NEW

**Details:**

**Hook: `useCelebrationQueue`**

```typescript
interface UseCelebrationQueueOptions {
  newlyEarnedBadges: string[];
  clearNewlyEarnedBadges: () => void;
}

interface UseCelebrationQueueReturn {
  currentCelebration: CelebrationQueueItem | null;
  celebrationType: 'toast' | 'overlay' | null;
  dismissCurrent: () => void;
  isProcessing: boolean;
}
```

**Logic:**
1. On mount, read `newlyEarnedBadges` from props
2. If empty, return early — no processing
3. Wait 1500ms (initial delay) via `setTimeout`
4. Build queue: map badge IDs to `CelebrationQueueItem` objects via `BADGE_MAP`
5. Filter out unknown badge IDs (not in `BADGE_MAP`)
6. Sort by tier priority: `toast` first, then `toast-confetti`, then `special-toast`, then `full-screen`
7. Within same tier, preserve original `newlyEarned` order
8. Cap at 5 toast-tier items + 2 full-screen items (per spec)
9. Process sequentially:
   - For toast/toast-confetti/special-toast: call `showCelebrationToast` from Toast context, await promise, then 500ms gap
   - For full-screen: set `currentCelebration` state, wait for dismiss callback
10. After all celebrations processed, call `clearNewlyEarnedBadges()`
11. On unmount (user navigates away), call `clearNewlyEarnedBadges()` for remaining items

**Component: `CelebrationQueue`**

```typescript
interface CelebrationQueueProps {
  newlyEarnedBadges: string[];
  clearNewlyEarnedBadges: () => void;
}
```

- Uses `useCelebrationQueue` hook
- Renders `CelebrationOverlay` when `celebrationType === 'overlay'`
- Toast celebrations are handled by the hook calling into the Toast context
- Invisible component (no DOM output when no overlay is showing)

**Integration point in Dashboard.tsx:**
- Lift `useFaithPoints` call to `Dashboard.tsx`
- Pass all widget data to `DashboardWidgetGrid` via props
- Pass `newlyEarnedBadges` + `clearNewlyEarnedBadges` to `CelebrationQueue`
- `DashboardWidgetGrid` no longer calls `useFaithPoints` internally

**Guardrails (DO NOT):**
- Start celebrations before 1.5s delay
- Fire celebrations for logged-out users (hook gets empty array from `useFaithPoints`)
- Show more than 5 toasts or 2 overlays in a single queue
- Block the main thread with synchronous waiting (use async/await with promises)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Empty queue | unit | No celebrations fire, no delay |
| Single toast | unit | Fires after 1.5s delay |
| Multiple toasts | unit | Fire sequentially with 500ms gap |
| Full-screen after toasts | unit | Full-screen fires after all toasts |
| Queue cap | unit | Capped at 5 toasts + 2 full-screen |
| Unknown badge IDs | unit | Filtered out silently |
| Clear after processing | unit | `clearNewlyEarnedBadges` called after all processed |
| Unmount cleanup | unit | Unmount during processing clears remaining |
| Overlay renders | integration | CelebrationOverlay shown for full-screen badges |
| No overlay for toasts | integration | No overlay for toast-tier badges |
| Sequential processing | integration | Full queue (toast + overlay) processes in correct order |

**Test files:**
- `frontend/src/hooks/__tests__/useCelebrationQueue.test.ts`
- `frontend/src/components/dashboard/__tests__/CelebrationQueue.test.tsx`

**Expected state after completion:**
- [ ] Hook processes celebrations sequentially with correct timing
- [ ] Toast celebrations use Toast context
- [ ] Full-screen celebrations render overlay
- [ ] Queue is capped and sorted by tier priority
- [ ] All tests pass

---

### Step 6: Badge Collection Grid Component

**Objective:** Full badge collection grid organized by category, with earned/locked visual distinction and tooltips.

**Files to create/modify:**
- `frontend/src/components/dashboard/BadgeGrid.tsx` — NEW

**Details:**

Props:
```typescript
interface BadgeGridProps {
  onClose?: () => void;
}
```

- Reads `wr_badges.earned` from localStorage via `getBadgeData()`
- Groups `BADGE_DEFINITIONS` by manually defined sections (not pure category grouping)

**Section configuration:**
```typescript
const BADGE_GRID_SECTIONS = [
  { label: 'Streak Milestones', badgeIds: ['streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90', 'streak_180', 'streak_365'] },
  { label: 'Level-Up', badgeIds: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'level_6'] },
  { label: 'Activity Milestones', badgeIds: ['prayer_100', 'journal_50', 'journal_100', 'meditate_25', 'listen_50'] },
  { label: 'First Steps', badgeIds: ['welcome', 'first_prayer', 'first_journal', 'first_meditate', 'first_listen', 'first_prayerwall', 'first_friend'] },
  { label: 'Full Worship Day', badgeIds: ['full_worship_day'] },
  { label: 'Community', badgeIds: ['friends_10', 'encourage_10', 'encourage_50'] },
];
```

**Each badge cell:**
- Container: `relative flex items-center justify-center rounded-full` with size `w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20`
- Earned: icon in full color + category bg from `getBadgeIcon()`, glow shadow via inline style
- Locked: same icon but `opacity-40 grayscale`, plus Lucide `Lock` icon (16px) at bottom-right
- Tooltip via button wrapper with hover/focus-triggered tooltip div
  - Earned tooltip: `"[name] — earned [date]"`
  - Locked tooltip: `"[name] — [description]"`
  - Repeatable tooltip: `"[name] (x[count]) — last earned [date]"`

**Tooltip implementation:**
- Lightweight `BadgeTooltip` sub-component
- Positioned: `absolute -top-12 left-1/2 -translate-x-1/2`
- Visible on: `group-hover:opacity-100` and `group-focus-within:opacity-100`
- Styling: `bg-hero-mid text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-white/15`
- Each badge cell wrapped in `<button className="group relative" aria-label="...">`

**Grid presentation:**
- Container: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6`
- Scrollable if content overflows
- Close button at top-right (Lucide `X` icon)
- Title: "Badge Collection" in `text-lg font-semibold text-white`

**Responsive behavior:**
- Desktop (1024px+): 6 cols, 80px cells
- Tablet (640-1024px): 5 cols, 64px cells
- Mobile (<640px): 4 cols, 56px cells

**Guardrails (DO NOT):**
- Add sort toggles (only category sort for MVP)
- Create a separate route for badge collection (it's a panel/modal from StreakCard)
- Use hover-only tooltips without keyboard alternative
- Import animation libraries

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All sections render | integration | All section labels visible |
| Earned badges styled | integration | No grayscale class on earned badges |
| Locked badges styled | integration | `opacity-40 grayscale` on locked badges |
| Lock icon overlay | integration | Lock icon on locked badges |
| Earned aria-label | integration | Correct `aria-label` with name and "Earned" |
| Locked aria-label | integration | Correct `aria-label` with name and "Locked" |
| Repeatable count | integration | Repeatable badge shows "(xN)" in label |
| All badges rendered | integration | ~35 total badge cells rendered |
| Empty badges data | integration | All badges locked, no crash |
| Corrupted data | integration | All badges locked, no crash |

**Test file:** `frontend/src/components/dashboard/__tests__/BadgeGrid.test.tsx`

**Expected state after completion:**
- [ ] Badge grid renders all ~35 badges organized by section
- [ ] Earned/locked visual distinction clear
- [ ] Tooltips work on hover and keyboard focus
- [ ] Close button works
- [ ] All tests pass

---

### Step 7: Extend StreakCard with Recent Badges, Badge Grid Trigger, and Streak Reset Message

**Objective:** Enhance the existing StreakCard with Lucide icon badges, click-to-open-grid behavior, "View all badges" link, and streak reset inline messaging.

**Files to create/modify:**
- `frontend/src/components/dashboard/StreakCard.tsx` — MODIFY

**Details:**

1. **Upgrade recent badges section:**
   - Replace lettered circles with actual Lucide icon circles using `getBadgeIcon()` from Step 1
   - Each badge: `<button>` wrapper (32px rounded-full) with icon inside, colored bg from `getBadgeIcon()`
   - Clicking any badge opens the badge grid
   - Add `"View all badges"` text link: `<button className="text-xs text-primary hover:text-primary-lt">View all badges</button>`

2. **Add badge grid panel state:**
   - `const [showBadgeGrid, setShowBadgeGrid] = useState(false)`
   - When `showBadgeGrid` is true, render `<BadgeGrid onClose={() => setShowBadgeGrid(false)} />` as an overlay
   - The grid overlays the dashboard content

3. **Add streak reset inline message:**
   ```tsx
   {currentStreak <= 1 && longestStreak > 1 && (
     <p className="mt-1 text-sm italic text-white/50">
       Every day is a new beginning. Start fresh today.
     </p>
   )}
   ```
   - Renders BELOW the streak number
   - Does NOT show for brand-new users (longestStreak 0 or 1)

**Responsive behavior:**
- Desktop: 32px badge icons inline, grid overlay centered
- Tablet: Same layout
- Mobile: Same layout, grid overlay full-width

**Guardrails (DO NOT):**
- Remove existing functionality
- Change the StreakCard prop interface (only add optional props if needed)
- Add a toast or modal for streak reset (inline message only)
- Make the badge grid a separate route

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Lucide icon badges | integration | Recent badges render as Lucide icon circles |
| Badge click opens grid | integration | Clicking a recent badge opens badge grid |
| View all link visible | integration | "View all badges" link visible when badges exist |
| View all click | integration | "View all badges" click opens badge grid |
| Grid closes | integration | Badge grid closes when close button clicked |
| Reset msg shows (streak=0) | integration | Streak reset message shows when currentStreak=0, longestStreak=14 |
| Reset msg shows (streak=1) | integration | Streak reset message shows when currentStreak=1, longestStreak=14 |
| Reset msg hides (streak=2) | integration | No reset message when currentStreak=2, longestStreak=14 |
| No reset for new users (0,0) | integration | No reset message for currentStreak=0, longestStreak=0 |
| No reset for new users (1,1) | integration | No reset message for currentStreak=1, longestStreak=1 |
| Longest streak shown | integration | Longest streak still displays alongside reset message |

**Test file:** `frontend/src/components/dashboard/__tests__/StreakCard.test.tsx` (EXTEND existing)

**Expected state after completion:**
- [ ] Recent badges show Lucide icons instead of lettered circles
- [ ] Badge grid opens from recent badge click or "View all badges" link
- [ ] Streak reset message shows for appropriate conditions
- [ ] All existing StreakCard tests still pass
- [ ] All new tests pass

---

### Step 8: Integrate Celebration Queue into Dashboard

**Objective:** Lift `useFaithPoints` to `Dashboard.tsx`, pass data to widget grid and celebration queue.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — MODIFY
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — MODIFY

**Details:**

**Dashboard.tsx changes:**
```typescript
export function Dashboard() {
  const { user } = useAuth();
  const [showCheckIn, setShowCheckIn] = useState(() => !hasCheckedInToday());

  const faithPoints = useFaithPoints(); // Lifted here

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      {/* ... Navbar ... */}
      <main>
        <DashboardHero userName={user.name} />
        <DashboardWidgetGrid faithPoints={faithPoints} />
      </main>
      <SiteFooter />
      <CelebrationQueue
        newlyEarnedBadges={faithPoints.newlyEarnedBadges}
        clearNewlyEarnedBadges={faithPoints.clearNewlyEarnedBadges}
      />
    </div>
  );
}
```

**DashboardWidgetGrid.tsx changes:**
- Add new prop: `faithPoints: ReturnType<typeof useFaithPoints>`
- Remove internal `useFaithPoints()` call
- Destructure from `props.faithPoints` instead

**Guardrails (DO NOT):**
- Call `useFaithPoints()` in both Dashboard.tsx and DashboardWidgetGrid.tsx (double initialization)
- Remove the `MoodCheckIn` conditional rendering logic
- Render `CelebrationQueue` inside `MoodCheckIn`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Widget grid receives faithPoints | integration | DashboardWidgetGrid receives and uses faithPoints prop |
| CelebrationQueue renders | integration | CelebrationQueue mounted in Dashboard |
| Celebrations after check-in | integration | Celebrations only fire after check-in completes |

**Test files:**
- `frontend/src/components/dashboard/__tests__/DashboardWidgetGrid.test.tsx` (UPDATE)
- `frontend/src/components/dashboard/__tests__/dashboard-widgets-integration.test.tsx` (UPDATE)

**Expected state after completion:**
- [ ] `useFaithPoints` called once in Dashboard.tsx
- [ ] DashboardWidgetGrid receives data via props
- [ ] CelebrationQueue renders and processes celebrations
- [ ] All existing dashboard tests updated and passing

---

### Step 9: Confetti CSS Helpers

**Objective:** Confetti particle generation helpers used by both Toast and CelebrationOverlay.

**Files to create/modify:**
- Inline in `frontend/src/components/ui/Toast.tsx` and `frontend/src/components/dashboard/CelebrationOverlay.tsx`

**Details:**

**Toast confetti particle generation (in Toast.tsx):**
```typescript
function generateToastConfetti(count: number): React.ReactNode[] {
  return Array.from({ length: count }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const angle = (360 / count) * i;
    const distance = 40 + Math.random() * 30;
    const endX = Math.cos(angle * Math.PI / 180) * distance;
    const endY = Math.sin(angle * Math.PI / 180) * distance;
    const size = 4 + Math.random() * 2;
    const isCircle = i % 2 === 0;

    return (
      <span
        key={i}
        className="pointer-events-none absolute animate-confetti-burst motion-reduce:hidden"
        style={{
          '--confetti-end': `translate(${endX}px, ${endY}px)`,
          width: size, height: size,
          borderRadius: isCircle ? '50%' : '2px',
          backgroundColor: color,
          top: '50%', left: '50%',
          animationDelay: `${i * 50}ms`,
        } as React.CSSProperties}
        aria-hidden="true"
      />
    );
  });
}
```

**Full-screen confetti particle generation (in CelebrationOverlay.tsx):**
```typescript
function generateOverlayConfetti(count: number): React.ReactNode[] {
  return Array.from({ length: count }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const left = Math.random() * 100;
    const duration = 2 + Math.random() * 2;
    const delay = Math.random() * 1.5;
    const size = 6 + Math.random() * 4;
    const isCircle = i % 2 === 0;

    return (
      <span
        key={i}
        className="pointer-events-none absolute top-0 animate-confetti-fall motion-reduce:hidden"
        style={{
          '--confetti-duration': `${duration}s`,
          left: `${left}%`,
          width: size, height: size,
          borderRadius: isCircle ? '50%' : '2px',
          backgroundColor: color,
          animationDelay: `${delay}s`,
        } as React.CSSProperties}
        aria-hidden="true"
      />
    );
  });
}
```

**Mobile particle count reduction:**
- Use `typeof window !== 'undefined' && window.innerWidth < 640` at render time
- Toast: 6 mobile, 12 desktop
- Overlay: 15 mobile, 30 desktop

**Guardrails (DO NOT):**
- Use JavaScript animation (requestAnimationFrame, GSAP, etc.)
- Import any animation library
- Create looping confetti (one burst only, then stops)

**No separate test file** — confetti rendering is tested as part of Toast.test.tsx and CelebrationOverlay.test.tsx.

**Expected state after completion:**
- [ ] Toast confetti renders correctly with burst animation
- [ ] Overlay confetti renders with fall animation
- [ ] Mobile uses fewer particles
- [ ] All confetti elements have `aria-hidden="true"` and `motion-reduce:hidden`

---

### Step 10: Accessibility Audit and Reduced Motion

**Objective:** Final accessibility pass ensuring WCAG AA compliance across all new components.

**Files to create/modify:**
- All new components from Steps 3-7 (review pass, minor fixes)

**Details:**

**Checklist:**
- Full-screen overlay: `role="dialog"`, `aria-labelledby="celebration-title"`, `aria-modal="true"`
- Focus trap via `useFocusTrap` hook in overlay
- Continue button: `aria-label="Continue"` (clear accessible name)
- Celebration toasts: `role="status"`, `aria-live="polite"` (non-interruptive announcements)
- Badge grid items: `<button aria-label="First Prayer, Earned March 10 2026">` or `<button aria-label="Burning Bright, Locked, Maintained a 30-day streak">`
- Tooltips accessible via keyboard focus
- All confetti elements: `aria-hidden="true"` + `motion-reduce:hidden`
- Full-screen icon animation: `motion-reduce:animate-none`
- Continue button delay: skip 6s delay when `prefers-reduced-motion`
- Toast slide animations: `motion-reduce:animate-none`
- "View all badges" link: accessible name, keyboard focusable
- Badge grid close button: accessible name `"Close badge collection"`
- 44px minimum touch targets on: badge cells, Continue button, close button, recent badge icons

**Guardrails (DO NOT):**
- Use `outline-none` without visible replacement
- Make tooltips hover-only
- Skip `aria-hidden` on decorative confetti elements
- Allow focus to escape the full-screen overlay

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Dialog role | integration | Full-screen overlay has `role="dialog"` and `aria-modal` |
| Focus trapped | integration | Focus trapped within overlay |
| Escape dismisses | integration | Escape key dismisses overlay |
| Toast role | integration | Toasts have `role="status"` |
| Badge aria-labels | integration | Badge grid items have descriptive `aria-label` |
| Confetti hidden | integration | All confetti elements have `aria-hidden="true"` |
| Reduced motion | integration | Continue button visible immediately with reduced motion |

**Test file:** `frontend/src/components/dashboard/__tests__/CelebrationAccessibility.test.tsx`

**Expected state after completion:**
- [ ] All ARIA attributes correct
- [ ] Focus management working (trap + restore)
- [ ] Reduced motion fully supported
- [ ] All touch targets >= 44px
- [ ] All tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Badge icon mapping constants |
| 2 | — | Tailwind animation keyframes |
| 3 | 2 | Extend toast with celebration types |
| 4 | 1, 2 | Full-screen celebration overlay |
| 5 | 3, 4 | Celebration queue processor |
| 6 | 1 | Badge collection grid |
| 7 | 6 | StreakCard enhancements |
| 8 | 5, 7 | Dashboard integration |
| 9 | 2 | Confetti CSS helpers (inline in Steps 3, 4) |
| 10 | 3, 4, 5, 6, 7 | Accessibility audit |

**Execution order:** 1 → 2 → 3 → 4 → 9 → 5 → 6 → 7 → 8 → 10

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Badge Icon Mapping Constants | [COMPLETE] | 2026-03-17 | Created `frontend/src/constants/dashboard/badge-icons.ts` with `getBadgeIcon()`, `CONFETTI_COLORS`, `LEVEL_ENCOURAGEMENT_MESSAGES`, `STREAK_MILESTONE_MESSAGES`. Tests: `badge-icons.test.ts` (10 tests). |
| 2 | Tailwind Animations | [COMPLETE] | 2026-03-17 | Added 5 new keyframes (`slide-from-bottom`, `celebration-spring`, `confetti-fall`, `confetti-burst`, `continue-fade-in`) and 5 animation classes to `tailwind.config.js`. Existing animations unchanged. |
| 3 | Toast Celebration Types | [COMPLETE] | 2026-03-17 | Extended `Toast.tsx` with `showCelebrationToast()` (Promise-based), separate bottom container, 3 celebration types, confetti burst particles, golden accent for special. Tests: 12 total (4 original + 8 new). Full suite: 1402/1402 pass. |
| 4 | Full-Screen Overlay | [COMPLETE] | 2026-03-17 | Created `CelebrationOverlay.tsx` with portal, focus trap, confetti, Continue delay (6s / instant reduced motion), scroll lock. Tests: 12 pass. |
| 5 | Celebration Queue | [COMPLETE] | 2026-03-17 | Created `useCelebrationQueue.ts` hook and `CelebrationQueue.tsx` component. Sequential processing with 1.5s delay, tier sorting, 5 toast + 2 overlay cap, unmount cleanup. Tests: 12 pass (8 hook + 4 component). |
| 6 | Badge Grid | [COMPLETE] | 2026-03-17 | Created `BadgeGrid.tsx` with 6 sections, earned/locked visual distinction, tooltips (hover + focus), close button, responsive grid (4/5/6 cols). Tests: 11 pass. |
| 7 | StreakCard Enhancements | [COMPLETE] | 2026-03-17 | Upgraded `StreakCard.tsx`: Lucide icon badges (via `getBadgeIcon`), click-to-open badge grid, "View all badges" link, streak reset inline message. Tests: 26 pass (15 original updated + 11 new). |
| 8 | Dashboard Integration | [COMPLETE] | 2026-03-17 | Lifted `useFaithPoints` to `Dashboard.tsx`, passed as prop to `DashboardWidgetGrid`. Added `CelebrationQueue` to Dashboard. Updated 4 test files with missing mock fields (`newlyEarnedBadges`, `clearNewlyEarnedBadges`). Full suite: 1447/1447 pass. |
| 9 | Confetti CSS Helpers | [COMPLETE] | 2026-03-17 | Inline in Toast.tsx (`generateToastConfetti`) and CelebrationOverlay.tsx (`generateOverlayConfetti`). Both use `CONFETTI_COLORS`, `aria-hidden`, `motion-reduce:hidden`, mobile particle reduction. Tested via Toast.test.tsx and CelebrationOverlay.test.tsx. |
| 10 | Accessibility Audit | [COMPLETE] | 2026-03-17 | Audited all new components. Fixed StreakCard badge button touch target (h-11 w-11 mobile, h-8 w-8 desktop). Created `CelebrationAccessibility.test.tsx` (7 tests). All ARIA attributes verified. Full suite: 1454/1454 pass. |
