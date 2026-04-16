# Implementation Plan: Getting Started Checklist

**Spec:** `_specs/getting-started-checklist.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/getting-started-checklist`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon — fully internal dashboard widget)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Directory Conventions
- Dashboard components: `frontend/src/components/dashboard/`
- Dashboard tests: `frontend/src/components/dashboard/__tests__/`
- Services (storage): `frontend/src/services/`
- Hooks: `frontend/src/hooks/`
- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Pages: `frontend/src/pages/`

### Key Existing Patterns

**DashboardCard** (`components/dashboard/DashboardCard.tsx`):
- Frosted glass card: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Collapse via CSS Grid: `grid-rows-[0fr]` / `grid-rows-[1fr]` with transition
- State persisted in `wr_dashboard_collapsed` JSON object keyed by `id` prop
- Header: flex row with icon + title + optional action link + collapse chevron

**ActivityChecklist** (`components/dashboard/ActivityChecklist.tsx`):
- SVG progress ring: `RING_RADIUS=24`, `RING_CIRCUMFERENCE = 2 * Math.PI * 24`, viewBox `0 0 60 60`
- Background stroke: `rgba(255,255,255,0.1)`, progress stroke: `#6D28D9`, `strokeLinecap="round"`
- Animated `stroke-dashoffset` with 500ms ease-out transition
- Center text: `text-sm font-semibold text-white` showing `X/6`
- Respects `prefers-reduced-motion`

**CelebrationOverlay** (`components/dashboard/CelebrationOverlay.tsx`):
- Full-screen portal: `fixed inset-0 z-[60] bg-black/70 backdrop-blur-md`
- Confetti: 15 particles mobile, 30 desktop, `animate-confetti-fall`
- Badge icon circle with glow, 6s delay before Continue button
- Focus trap, scroll lock, `role="dialog"` + `aria-modal="true"`
- Props: `{ badge: BadgeDefinition, onDismiss: () => void }`

**DashboardWidgetGrid** (`components/dashboard/DashboardWidgetGrid.tsx`):
- Grid: `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5`
- Widgets use CSS `order-*` classes for priority ordering
- Full-width widgets use `lg:col-span-5`
- Gets `faithPoints` as prop from Dashboard page

**Dashboard page** (`pages/Dashboard.tsx`):
- Phase flow: `'onboarding' | 'check_in' | 'dashboard_enter' | 'dashboard'`
- Checks `isOnboardingComplete()` → show `WelcomeWizard`
- Checks `hasCheckedInToday()` → show `MoodCheckIn`
- Passes `useFaithPoints()` result to `DashboardWidgetGrid` and `DashboardHero`
- Background: `bg-[#0f0a1e]`

**AuthProvider** (`contexts/AuthContext.tsx`):
- `useAuth()` returns `{ isAuthenticated, user: { name, id } | null, login(), logout() }`
- Simulated auth via `wr_auth_simulated` localStorage
- `logout()` preserves all `wr_*` data keys

**useFaithPoints** (`hooks/useFaithPoints.ts`):
- `todayActivities: Record<ActivityType, boolean>` — reads from `wr_daily_activities` keyed by today's date string
- `recordActivity(type)` — sets activity flag, recalculates points, persists

**onboarding-storage** (`services/onboarding-storage.ts`):
- `isOnboardingComplete()` → checks `wr_onboarding_complete === 'true'`
- `setOnboardingComplete()` → sets `wr_onboarding_complete` to `'true'`

**Test patterns** (from `__tests__/DashboardWidgetGrid.test.tsx`):
- `render()` from `@testing-library/react`
- Wrap in `<MemoryRouter>` + `<AuthProvider>` + `<ToastProvider>`
- `localStorage.clear()` in `beforeEach`, then seed auth state
- `MemoryRouter` uses `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`
- Mock `ResizeObserver` for Recharts

**MusicPage** (`pages/MusicPage.tsx`):
- Tab state via `useSearchParams().get('tab')` — default is `'ambient'`
- Already has tooltip integration pattern (`useTooltipCallout`)

**PrayerWall** (`pages/PrayerWall.tsx`):
- Uses `useAuth()`, `useFaithPoints()`, `useTooltipCallout()`
- `recordActivity('prayerWall')` called on prayer interaction

### Cross-Spec Dependencies
- **Welcome Wizard (Spec 1/onboarding)**: Sets `wr_onboarding_complete` — prerequisite for checklist visibility
- **Progressive Disclosure Tooltips (Spec 2/onboarding)**: Provides `TooltipCallout` component and `wr_tooltips_seen` — separate from checklist
- **Dashboard Shell (Spec 2)**: Provides `DashboardCard`, grid layout, `AuthProvider`
- **Streak & Faith Points Engine (Spec 5)**: Provides `useFaithPoints`, `recordActivity()`, `wr_daily_activities`
- **Activity Integration (Spec 6)**: `ActivityChecklist` progress ring pattern
- **Celebrations (Spec 8)**: `CelebrationOverlay` with confetti

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View checklist card | Only for authenticated users on dashboard | Step 2 | Dashboard is auth-gated (`isAuthenticated` check in `RootRoute`) |
| Click "Go" links | Navigate to features | Step 2 | Dashboard is auth-gated |
| Click dismiss "X" | Sets `wr_getting_started_complete` | Step 2 | Dashboard is auth-gated |
| Collapse/expand card | Uses DashboardCard collapse | Step 2 | Dashboard is auth-gated |
| Celebration overlay | Fires on all-complete | Step 3 | Dashboard is auth-gated |
| Page visit flags (ambient, prayer wall) | Sets flags in localStorage | Step 4 | `useAuth().isAuthenticated` check before writing |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | DashboardCard.tsx:71 |
| Card | padding | `p-4 md:p-6` | DashboardCard.tsx:71 |
| Title | font | `text-base font-semibold text-white md:text-lg` | DashboardCard.tsx:84 |
| Progress ring BG stroke | color | `rgba(255,255,255,0.1)` | ActivityChecklist.tsx:98 |
| Progress ring fill stroke | color | `#6D28D9` | ActivityChecklist.tsx:107 |
| Progress ring | radius/circumference | `r=24`, `2*PI*24 ≈ 150.796` | ActivityChecklist.tsx:23-24 |
| Progress ring center text | font | `text-sm font-semibold text-white` | ActivityChecklist.tsx:122 |
| Incomplete icon | style | `Circle` from lucide, `text-white/20` | ActivityChecklist.tsx:147 |
| Complete icon | style | `CircleCheck` from lucide, `text-success` (#27AE60) | ActivityChecklist.tsx:145 |
| Incomplete label | font | `text-sm text-white/70` (spec) | spec |
| Complete label | font | `text-white/40 line-through` + row `opacity-50` | spec |
| Point hint | font | `text-xs text-white/30` (incomplete) / `text-white/20` (complete) | spec |
| "Go" link | style | `text-sm font-medium text-primary hover:text-primary-lt` | spec |
| Dismiss X icon | style | `X` from lucide, `text-white/40 hover:text-white/60`, 24px icon | spec |
| Dismiss X | touch target | 44px minimum | spec |
| Celebration heading | font | `font-script` (Caveat) large white text | spec |
| Celebration subtext | font | `text-white/70` Inter | spec |
| Celebration CTA | style | `bg-primary text-white rounded-lg py-3 px-8 font-semibold` | spec |
| Celebration overlay | backdrop | `fixed inset-0 z-[60] bg-black/70 backdrop-blur-md` | CelebrationOverlay.tsx:136 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat for script/highlighted headings (`font-script`), not Lora
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dashboard background is `bg-[#0f0a1e]` (slightly different from hero-dark)
- Progress rings use SVG with `strokeLinecap="round"` and animated `stroke-dashoffset`
- Full-width widgets in the grid use `lg:col-span-5` (5-column grid)
- `CelebrationOverlay` uses `createPortal` to `document.body` with `z-[60]`
- All animations must respect `prefers-reduced-motion` — instant transitions when enabled
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Success green: `#27AE60` / `text-success`
- Primary purple: `#6D28D9` / `text-primary`
- `DashboardCard` title uses `text-base font-semibold text-white md:text-lg` (not `text-lg` alone)

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts — already exists
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';
export interface DailyActivities {
  mood: boolean; pray: boolean; listen: boolean;
  prayerWall: boolean; meditate: boolean; journal: boolean;
  pointsEarned: number; multiplier: number;
}

// New — GettingStartedData
export interface GettingStartedData {
  mood_done: boolean;
  pray_done: boolean;
  journal_done: boolean;
  meditate_done: boolean;
  ambient_visited: boolean;
  prayer_wall_visited: boolean;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_onboarding_complete` | Read | Prerequisite: wizard completed |
| `wr_getting_started` | Both | Per-item completion flags (JSON object) |
| `wr_getting_started_complete` | Both | Dismissal/completion flag (`"true"`) |
| `wr_daily_activities` | Read | Today's activity completions (items 1-4) |
| `wr_dashboard_collapsed` | Both | Card collapse state (via DashboardCard) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, card full-width, point hints below labels, 44px touch targets |
| Tablet | 640-1024px | Card spans full grid width above 2-column layout, point hints inline |
| Desktop | > 1024px | Card spans full grid width (`lg:col-span-5`), `p-6` padding, generous spacing |

---

## Vertical Rhythm

Not applicable — this is a dashboard card widget, not a standalone page. The card sits inside the existing `DashboardWidgetGrid` grid with `gap-4 md:gap-6` spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Welcome Wizard (Spec 1/onboarding) is committed and `wr_onboarding_complete` is set on completion
- [x] Dashboard Shell (Spec 2) is committed with `DashboardCard`, `DashboardWidgetGrid`, `AuthProvider`
- [x] Streak & Faith Points Engine (Spec 5) is committed with `useFaithPoints`, `wr_daily_activities`
- [x] Celebrations (Spec 8) is committed with `CelebrationOverlay` and confetti animations
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods — N/A (0 unverified values — all patterns reuse existing components)
- [x] Prior specs in the sequence are complete and committed (Welcome Wizard, Progressive Disclosure Tooltips)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checklist card position in grid | Rendered ABOVE DashboardWidgetGrid, not inside it | The card must span full width and sit above all widgets. Placing it before the grid div is simpler than adding a special `order-0` slot inside the 5-column grid |
| Progress ring size | 48px diameter (viewBox `0 0 48 48`, radius 18) | Spec says 40-48px, slightly smaller than ActivityChecklist's 60px. Using 48px for comfortable center text |
| Celebration overlay approach | Custom overlay (not CelebrationOverlay) | CelebrationOverlay expects a `BadgeDefinition` with badge icon. Getting Started celebration has different content (text message, no badge icon). Build a simpler purpose-built overlay that reuses confetti generation and focus trap patterns |
| Item 1 "Go" behavior | Call `onRequestCheckIn` prop (existing pattern from DashboardWidgetGrid) | Dashboard already has `handleRequestCheckIn` that sets phase to `check_in`. Reuse this mechanism |
| Items 5-6 flag detection | Set flags on target page mount via `useEffect` with auth check | Flags set regardless of navigation source (Go link, navbar, direct URL). Only set for authenticated users |
| Sync checklist with daily activities | `useEffect` in the checklist hook watches `todayActivities` and writes permanent flags | When `todayActivities.mood === true`, also set `wr_getting_started.mood_done = true` |
| Fade-out animation on dismiss | CSS transition on opacity + `setTimeout` to unmount | 300ms `opacity: 0` transition, then remove from DOM after timeout |

---

## Implementation Steps

### Step 1: Getting Started Storage Service & Hook

**Objective:** Create the data layer for reading/writing getting-started checklist state, and a React hook for reactive checklist status.

**Files to create/modify:**
- `frontend/src/services/getting-started-storage.ts` — new file
- `frontend/src/hooks/useGettingStarted.ts` — new file
- `frontend/src/types/dashboard.ts` — add `GettingStartedData` interface

**Details:**

**`getting-started-storage.ts`** — Storage service following the pattern of `onboarding-storage.ts` and `faith-points-storage.ts`:

```typescript
const GETTING_STARTED_KEY = 'wr_getting_started'
const GETTING_STARTED_COMPLETE_KEY = 'wr_getting_started_complete'

export interface GettingStartedData {
  mood_done: boolean
  pray_done: boolean
  journal_done: boolean
  meditate_done: boolean
  ambient_visited: boolean
  prayer_wall_visited: boolean
}

export function freshGettingStartedData(): GettingStartedData {
  return {
    mood_done: false, pray_done: false, journal_done: false,
    meditate_done: false, ambient_visited: false, prayer_wall_visited: false,
  }
}

export function getGettingStartedData(): GettingStartedData { ... }
export function setGettingStartedFlag(key: keyof GettingStartedData, value: boolean): void { ... }
export function isGettingStartedComplete(): boolean { ... }
export function setGettingStartedComplete(): void { ... }
```

**`useGettingStarted.ts`** — React hook that combines daily activities + permanent flags:

```typescript
export function useGettingStarted(todayActivities: Record<ActivityType, boolean>) {
  // Returns { items, completedCount, allComplete, isVisible, dismiss }
  // - Reads wr_getting_started for permanent flags
  // - Reads todayActivities for items 1-4 (daily detection)
  // - Syncs: when todayActivities[x] is true, also writes permanent flag
  // - isVisible: isOnboardingComplete() && !isGettingStartedComplete() && isAuthenticated
  // - dismiss: sets wr_getting_started_complete to true
}
```

The hook uses `useState` seeded from localStorage on mount. A `useEffect` watches `todayActivities` and syncs permanent flags when activities are detected. The hook returns an array of 6 items with their completion status, labels, point hints, and navigation destinations.

**Auth gating:** Not applicable at service level (services are pure read/write). Auth gating happens at the component level (Dashboard is already auth-gated).

**Guardrails (DO NOT):**
- Do NOT clear `wr_getting_started` or `wr_getting_started_complete` in `logout()` — these persist across sessions
- Do NOT use `new Date().toISOString().split('T')[0]` — use `getLocalDateString()` from `utils/date.ts`
- Do NOT import `useAuth` in the storage service — keep services pure

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getGettingStartedData returns fresh data when empty` | unit | No localStorage → all false |
| `setGettingStartedFlag persists individual flags` | unit | Set `mood_done`, verify stored |
| `isGettingStartedComplete returns false by default` | unit | No key → false |
| `setGettingStartedComplete sets "true"` | unit | Verify localStorage value |
| `getGettingStartedData handles corrupted JSON` | unit | Invalid JSON → fresh data |
| `useGettingStarted returns 6 items` | unit | Hook returns all items with correct labels |
| `useGettingStarted detects completion from todayActivities` | unit | Pass `{ mood: true }` → mood item complete |
| `useGettingStarted detects completion from permanent flags` | unit | Set `wr_getting_started.mood_done` → mood item complete |
| `useGettingStarted syncs todayActivities to permanent flags` | unit | When `todayActivities.pray` changes to true → `wr_getting_started.pray_done` is set |
| `useGettingStarted.isVisible false when onboarding not complete` | unit | `wr_onboarding_complete` absent → false |
| `useGettingStarted.isVisible false when already complete` | unit | `wr_getting_started_complete === "true"` → false |
| `useGettingStarted.isVisible true when conditions met` | unit | Onboarding complete + not dismissed → true |
| `useGettingStarted.allComplete true when all 6 flags true` | unit | All permanent flags + today activities → allComplete |
| `dismiss sets wr_getting_started_complete` | unit | Call dismiss() → localStorage has "true" |

**Expected state after completion:**
- [ ] `getting-started-storage.ts` created with all CRUD functions
- [ ] `useGettingStarted.ts` created with reactive hook
- [ ] `GettingStartedData` type added to `types/dashboard.ts`
- [ ] All 14 tests pass

---

### Step 2: GettingStartedCard Component

**Objective:** Build the dashboard card UI with progress ring, 6 checklist items, dismiss button, and fade-out animation.

**Files to create/modify:**
- `frontend/src/components/dashboard/GettingStartedCard.tsx` — new file

**Details:**

The card is a standalone component that renders at the top of the dashboard (above `DashboardWidgetGrid`). It does NOT use `DashboardCard` directly because it needs a custom header layout (progress ring + dismiss X in addition to the title and collapse chevron). However, it reuses the same visual styling and collapse pattern:

- **Card container:** `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` with `transition-opacity duration-300` for fade-out
- **Card header:** Flex row: title ("Getting Started") on left, progress ring center-right, dismiss X far right, collapse chevron between ring and X
  - Title: `text-base font-semibold text-white md:text-lg` (same as DashboardCard)
  - Collapse: Copy the collapse pattern from DashboardCard (`wr_dashboard_collapsed` key `"getting-started"`)
- **Progress ring:** SVG circle, 48px diameter (viewBox `0 0 48 48`, radius 18, circumference ≈ 113.1)
  - Background stroke: `rgba(255,255,255,0.1)`, width 5
  - Fill stroke: `#6D28D9`, `strokeLinecap="round"`, animated `stroke-dashoffset` (500ms ease-out)
  - Center text: "X/6" in `text-xs font-semibold text-white`
  - `aria-label="X of 6 getting started items completed"`
- **Dismiss X:** Lucide `X` icon, `h-6 w-6 text-white/40 hover:text-white/60`, button with `p-2` for 44px touch target, `aria-label="Dismiss getting started checklist"`
- **Checklist items:** Vertical list with `gap-2` spacing:
  - Each row: `flex items-center gap-3` with minimum height 44px (touch target)
  - Incomplete: `Circle` icon (24px, `text-white/20`) + label `text-sm md:text-base text-white/70` + point hint `text-xs text-white/30` + "Go" link `text-sm font-medium text-primary hover:text-primary-lt`
  - Complete: `CircleCheck` icon (24px, `text-success`) + label `text-white/40 line-through` + point hint `text-xs text-white/20` + no Go link + row `opacity-50`
  - Mobile: point hint below label (stacked). Tablet+: point hint inline after label
  - "Go" link right-aligned via `ml-auto`
- **Item completion animation:** When item transitions to complete, icon gets `scale-110` for 150ms (via CSS transition), row transitions to `opacity-50` over 300ms. Controlled by tracking previous completion state and adding a temporary CSS class.
- **Fade-out:** When dismissed (or after celebration), card transitions `opacity` from 1 to 0 over 300ms, then calls `onDismiss` to unmount.

**Props:**
```typescript
interface GettingStartedCardProps {
  items: GettingStartedItem[]  // from useGettingStarted
  completedCount: number
  onDismiss: () => void
  onRequestCheckIn: () => void  // for item 1 "Go" link
}
```

**"Go" link navigation:**
- Item 1 (mood): calls `onRequestCheckIn()` prop (triggers mood check-in)
- Items 2-4: `navigate('/daily?tab=pray')`, etc. via React Router `useNavigate()`
- Items 5-6: `navigate('/music?tab=ambient')`, `navigate('/prayer-wall')`

**Responsive behavior:**
- Desktop (> 1024px): `p-6`, items in single column, point hints inline, generous spacing
- Tablet (640-1024px): `p-4 md:p-6`, point hints inline
- Mobile (< 640px): `p-4`, point hints below labels (use `flex-col sm:flex-row` for hint placement), 44px touch targets for Go links and dismiss X

**Guardrails (DO NOT):**
- Do NOT put the card inside `DashboardWidgetGrid` — it renders before the grid in `Dashboard.tsx`
- Do NOT use `DashboardCard` wrapper (custom header layout needed) — copy the visual style only
- Do NOT show "Go" link for completed items
- Do NOT use `dangerouslySetInnerHTML` for any text content
- Do NOT forget `motion-reduce:transition-none` on all animated elements

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders 6 checklist items` | integration | All 6 labels visible |
| `renders progress ring with correct count` | integration | "0/6" when none complete, "3/6" when 3 complete |
| `incomplete item shows circle icon, label, point hint, Go link` | unit | Verify all elements present |
| `complete item shows check icon, strikethrough, no Go link` | unit | Verify styling and hidden Go link |
| `complete item row has opacity-50` | unit | Verify `opacity-50` class |
| `Go link navigates to correct destination (items 2-6)` | integration | Click Go for prayer → navigate called with `/daily?tab=pray` |
| `Go link for item 1 calls onRequestCheckIn` | integration | Click Go for mood → `onRequestCheckIn` called |
| `dismiss X button calls onDismiss after fade-out` | integration | Click X → opacity transitions → `onDismiss` called |
| `dismiss X button has aria-label` | unit | `aria-label="Dismiss getting started checklist"` |
| `progress ring has accessible aria-label` | unit | `aria-label` includes count |
| `each item row has aria-label with state` | unit | Includes completed/not completed text |
| `collapse toggle works (chevron click)` | integration | Content hides/shows |
| `collapse state persists in localStorage` | integration | Verify `wr_dashboard_collapsed` key |
| `keyboard navigation works` | unit | Tab through Go links, dismiss button, collapse |
| `reduced motion disables transitions` | unit | No transition classes when `prefers-reduced-motion` |
| `point hints show correct values` | unit | +5, +10, +25, +20, +10, +15 respectively |

**Expected state after completion:**
- [ ] `GettingStartedCard.tsx` created with full UI
- [ ] All visual states (incomplete, complete, fade-out) working
- [ ] Accessible: ARIA labels, keyboard navigation, focus rings
- [ ] Responsive across all 3 breakpoints
- [ ] 16 tests pass

---

### Step 3: Getting Started Celebration Overlay

**Objective:** Build the all-complete celebration overlay that fires when all 6 items are completed.

**Files to create/modify:**
- `frontend/src/components/dashboard/GettingStartedCelebration.tsx` — new file

**Details:**

A purpose-built celebration overlay reusing patterns from `CelebrationOverlay.tsx` but with different content (no badge icon, custom heading/subtext, "Let's Go" button instead of "Continue").

- **Overlay backdrop:** `fixed inset-0 z-[60] bg-black/70 backdrop-blur-md` (same as CelebrationOverlay)
- **Confetti:** Reuse the `generateOverlayConfetti()` pattern — 15 particles mobile, 30 desktop, using `CONFETTI_COLORS` from `constants/dashboard/badge-icons.ts` and `animate-confetti-fall`
- **Content (centered):**
  - Heading: "You're all set! Welcome to Worship Room." — `font-script text-3xl sm:text-4xl md:text-5xl text-white text-center` (Caveat font)
  - Subtext: "You've explored everything Worship Room has to offer. Your journey starts now." — `text-base sm:text-lg text-white/70 text-center mt-4 max-w-md`
  - "Let's Go" button: `bg-primary text-white rounded-lg py-3 px-8 font-semibold hover:bg-primary-lt transition-colors focus-visible:ring-2 focus-visible:ring-white/50` — appears immediately (no 6s delay like CelebrationOverlay)
- **Accessibility:** `role="dialog"`, `aria-labelledby` pointing to heading, `aria-modal="true"`, `useFocusTrap`, scroll lock
- **Props:** `{ onDismiss: () => void }`
- **Reduced motion:** Confetti hidden, no backdrop-blur transition — content appears instantly

**Guardrails (DO NOT):**
- Do NOT pass a `BadgeDefinition` — this overlay has no badge
- Do NOT add a 6s delay on the dismiss button — "Let's Go" appears immediately
- Do NOT trigger this overlay on manual dismiss (X button)
- Do NOT forget scroll lock on body

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders heading text` | unit | "You're all set! Welcome to Worship Room." visible |
| `renders subtext` | unit | Subtext content visible |
| `renders "Let's Go" button` | unit | Button visible immediately |
| `heading uses Caveat font` | unit | `font-script` class present |
| `onDismiss called when "Let's Go" clicked` | unit | Click → `onDismiss` called |
| `overlay has role="dialog"` | unit | Accessibility attribute present |
| `overlay has aria-modal="true"` | unit | Accessibility attribute present |
| `confetti particles rendered` | unit | Multiple confetti span elements present |
| `Escape key dismisses overlay` | unit | Keydown Escape → `onDismiss` called |
| `focus trapped in overlay` | unit | Tab cycles within overlay |
| `reduced motion hides confetti` | unit | With `prefers-reduced-motion`, confetti hidden |

**Expected state after completion:**
- [ ] `GettingStartedCelebration.tsx` created
- [ ] Matches CelebrationOverlay visual quality with different content
- [ ] Full accessibility (focus trap, dialog role, keyboard dismissal)
- [ ] 11 tests pass

---

### Step 4: Page Visit Flags (Items 5-6)

**Objective:** Set `wr_getting_started.ambient_visited` and `wr_getting_started.prayer_wall_visited` when authenticated users visit the respective pages.

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx` — add `useEffect` to set ambient flag
- `frontend/src/pages/PrayerWall.tsx` — add `useEffect` to set prayer wall flag

**Details:**

**MusicPage.tsx:**
Add a `useEffect` that runs when the active tab is `'ambient'` and the user is authenticated:

```typescript
import { useAuth } from '@/hooks/useAuth'
import { setGettingStartedFlag, isGettingStartedComplete } from '@/services/getting-started-storage'

// Inside MusicPage:
const { isAuthenticated } = useAuth()

useEffect(() => {
  if (isAuthenticated && activeTab === 'ambient' && !isGettingStartedComplete()) {
    setGettingStartedFlag('ambient_visited', true)
  }
}, [isAuthenticated, activeTab])
```

**PrayerWall.tsx:**
Add a `useEffect` in the `PrayerWallContent` component (which already has `useAuth`):

```typescript
import { setGettingStartedFlag, isGettingStartedComplete } from '@/services/getting-started-storage'

// Inside PrayerWallContent:
useEffect(() => {
  if (isAuthenticated && !isGettingStartedComplete()) {
    setGettingStartedFlag('prayer_wall_visited', true)
  }
}, [isAuthenticated])
```

**Auth gating:** Flags are only set when `isAuthenticated === true`. Logged-out users visiting these pages do NOT set flags (zero data persistence per demo mode policy).

**Optimization:** Check `isGettingStartedComplete()` first to skip unnecessary writes after checklist is dismissed.

**Responsive behavior:** Not applicable — no UI changes.

**Guardrails (DO NOT):**
- Do NOT set flags for logged-out users
- Do NOT set flags in the GettingStartedCard "Go" link click handler — set them on the TARGET page mount
- Do NOT modify the existing page behavior or layout
- Do NOT import heavy dependencies — `setGettingStartedFlag` is a lightweight localStorage write

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `MusicPage sets ambient_visited when ambient tab active and authenticated` | integration | Render MusicPage with auth + ambient tab → flag set |
| `MusicPage does NOT set flag when logged out` | integration | Render without auth → flag not set |
| `MusicPage does NOT set flag when playlists tab active` | integration | Render with auth + playlists tab → flag not set |
| `MusicPage does NOT set flag when checklist already complete` | integration | `wr_getting_started_complete === "true"` → no write |
| `PrayerWall sets prayer_wall_visited when authenticated` | integration | Render PrayerWall with auth → flag set |
| `PrayerWall does NOT set flag when logged out` | integration | Render without auth → flag not set |
| `PrayerWall does NOT set flag when checklist already complete` | integration | `wr_getting_started_complete === "true"` → no write |

**Expected state after completion:**
- [ ] MusicPage sets `ambient_visited` flag on ambient tab mount (auth only)
- [ ] PrayerWall sets `prayer_wall_visited` flag on mount (auth only)
- [ ] No visual changes to either page
- [ ] 7 tests pass

---

### Step 5: Dashboard Integration

**Objective:** Wire the GettingStartedCard and GettingStartedCelebration into the Dashboard page, managing visibility, celebration trigger, and dismiss lifecycle.

**Files to modify:**
- `frontend/src/pages/Dashboard.tsx` — add checklist card + celebration overlay

**Details:**

In `Dashboard.tsx`, add the checklist card above `DashboardWidgetGrid` and manage the celebration lifecycle:

```typescript
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard'
import { GettingStartedCelebration } from '@/components/dashboard/GettingStartedCelebration'
import { useGettingStarted } from '@/hooks/useGettingStarted'

// Inside Dashboard component (in the dashboard phase):
const gettingStarted = useGettingStarted(faithPoints.todayActivities)
const [showCelebration, setShowCelebration] = useState(false)
const [cardDismissed, setCardDismissed] = useState(false)

// Trigger celebration when all complete (only once)
const celebrationFiredRef = useRef(false)
useEffect(() => {
  if (gettingStarted.allComplete && gettingStarted.isVisible && !celebrationFiredRef.current) {
    celebrationFiredRef.current = true
    setShowCelebration(true)
  }
}, [gettingStarted.allComplete, gettingStarted.isVisible])

// Handlers:
const handleGettingStartedDismiss = () => {
  gettingStarted.dismiss()
  setCardDismissed(true)
}

const handleCelebrationDismiss = () => {
  setShowCelebration(false)
  gettingStarted.dismiss()
  setCardDismissed(true)
}
```

In the JSX, render the checklist card between the hero and the widget grid:

```tsx
{gettingStarted.isVisible && !cardDismissed && (
  <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6">
    <GettingStartedCard
      items={gettingStarted.items}
      completedCount={gettingStarted.completedCount}
      onDismiss={handleGettingStartedDismiss}
      onRequestCheckIn={handleRequestCheckIn}
    />
  </div>
)}
<DashboardWidgetGrid ... />

{showCelebration && (
  <GettingStartedCelebration onDismiss={handleCelebrationDismiss} />
)}
```

**Key behaviors:**
- Card renders above widget grid when `isVisible && !cardDismissed`
- Celebration fires when `allComplete` transitions to true (useEffect)
- Manual dismiss (X): sets `wr_getting_started_complete`, fades out card, no celebration
- Celebration dismiss ("Let's Go"): sets `wr_getting_started_complete`, closes overlay, fades out card
- Celebration fires even if user returns to dashboard after completing all items elsewhere
- `celebrationFiredRef` prevents double-fire in StrictMode

**Auth gating:** Dashboard page is already auth-gated (only renders for `isAuthenticated` users).

**Responsive behavior:** The wrapper div uses `mx-auto max-w-6xl px-4 sm:px-6` to match `DashboardWidgetGrid`'s container.

**Guardrails (DO NOT):**
- Do NOT place the card inside `DashboardWidgetGrid` — it renders in `Dashboard.tsx` before the grid
- Do NOT show celebration on manual dismiss
- Do NOT fire celebration more than once per dashboard mount
- Do NOT break existing tooltip or celebration queue logic

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `GettingStartedCard renders when conditions met` | integration | Auth + onboarding complete + not dismissed → card visible |
| `GettingStartedCard NOT visible when onboarding incomplete` | integration | No `wr_onboarding_complete` → no card |
| `GettingStartedCard NOT visible when already dismissed` | integration | `wr_getting_started_complete === "true"` → no card |
| `GettingStartedCard NOT visible for logged-out users` | integration | Not authenticated → landing page shown |
| `celebration fires when all 6 items complete` | integration | Set all flags → celebration overlay appears |
| `celebration does NOT fire on manual dismiss` | integration | Click X → no celebration |
| `celebration dismiss sets wr_getting_started_complete` | integration | Click "Let's Go" → localStorage updated |
| `card fades out after celebration dismiss` | integration | After celebration → card removed from DOM |
| `card fades out after manual dismiss` | integration | After X click → card removed from DOM |
| `existing dashboard widgets still render` | integration | Mood chart, streak, activity, friends, quick actions all present |
| `handleRequestCheckIn triggered from card item 1` | integration | Click mood Go → check-in phase triggered |
| `checklist progress updates reactively` | integration | Complete an activity → count updates |
| `logout does NOT clear getting started data` | integration | After logout → `wr_getting_started` and `wr_getting_started_complete` still in localStorage |

**Expected state after completion:**
- [ ] Getting Started card renders at top of dashboard when conditions met
- [ ] Celebration overlay fires when all 6 items are completed
- [ ] Manual dismiss and celebration dismiss both work correctly
- [ ] Card fade-out animation works (300ms)
- [ ] Existing dashboard functionality unaffected
- [ ] 13 tests pass

---

### Step 6: Accessibility & Reduced Motion Audit

**Objective:** Ensure all Getting Started components meet accessibility standards and respect `prefers-reduced-motion`.

**Files to modify:**
- `frontend/src/components/dashboard/GettingStartedCard.tsx` — audit/fix
- `frontend/src/components/dashboard/GettingStartedCelebration.tsx` — audit/fix

**Details:**

**GettingStartedCard accessibility audit:**
- Progress ring: `role="img"` with `aria-label="X of 6 getting started items completed"`
- Each item row: `aria-label` describing state (e.g., "Check in with your mood — completed" or "Generate your first prayer — not completed, plus 10 points")
- "Go" links: `aria-label` (e.g., "Go to prayer page")
- Dismiss X: `aria-label="Dismiss getting started checklist"`
- Collapse toggle: `aria-expanded`, `aria-controls` (same as DashboardCard)
- Screen reader announcement: Add `aria-live="polite"` region that announces when an item completes (e.g., "Check in with your mood completed, 1 of 6")
- All interactive elements: visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`)
- Keyboard: Tab navigates through Go links, dismiss button, collapse toggle; Enter/Space activates

**GettingStartedCelebration accessibility audit:**
- `role="dialog"` + `aria-labelledby="getting-started-celebration-title"` + `aria-modal="true"`
- Focus trap via `useFocusTrap(true, onDismiss)` — Escape key dismisses
- Scroll lock on body
- "Let's Go" button auto-focused on mount
- Confetti: `aria-hidden="true"` on all particles

**Reduced motion:**
- All `transition-*` classes paired with `motion-reduce:transition-none`
- Item completion animation: instant state swap (no scale, no fade)
- Progress ring: no `stroke-dashoffset` transition
- Card fade-out: instant unmount
- Celebration: no confetti animation, instant overlay appear/disappear

**Guardrails (DO NOT):**
- Do NOT use `outline-none` without replacement focus ring
- Do NOT rely solely on color to indicate completion state (icons provide shape differentiation)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `aria-live region announces item completion` | unit | Complete an item → announcement text appears in live region |
| `all interactive elements have visible focus rings` | unit | Tab through → focus rings visible |
| `Go links have descriptive aria-labels` | unit | Each "Go" link has specific label |
| `reduced motion: no transitions on card` | unit | With `prefers-reduced-motion` → no transition classes |
| `reduced motion: no confetti on celebration` | unit | Confetti particles have `motion-reduce:hidden` |
| `reduced motion: card unmounts immediately on dismiss` | unit | No 300ms delay |
| `progress ring has role="img" and aria-label` | unit | Accessible name present |
| `celebration overlay traps focus` | unit | Tab cycles within overlay |

**Expected state after completion:**
- [ ] All ARIA attributes correct and tested
- [ ] Screen reader announces item completions
- [ ] Keyboard navigation fully functional
- [ ] `prefers-reduced-motion` fully respected
- [ ] 8 tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Storage service + hook (data layer) |
| 2 | 1 | GettingStartedCard component (UI) |
| 3 | — | GettingStartedCelebration overlay (UI) |
| 4 | 1 | Page visit flags on MusicPage + PrayerWall |
| 5 | 1, 2, 3 | Dashboard integration (wiring) |
| 6 | 2, 3, 5 | Accessibility audit + reduced motion |

**Parallel opportunities:** Steps 2 and 3 can be built in parallel (both depend only on Step 1). Step 4 can be built in parallel with Steps 2 and 3 (depends only on Step 1).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Storage Service & Hook | [COMPLETE] | 2026-03-19 | Created `services/getting-started-storage.ts`, `hooks/useGettingStarted.ts`, added `GettingStartedData` to `types/dashboard.ts`. 15 tests pass. |
| 2 | GettingStartedCard Component | [COMPLETE] | 2026-03-19 | Created `components/dashboard/GettingStartedCard.tsx` with progress ring, 6 items, collapse, dismiss fade-out, Go links, ARIA labels, reduced motion. 15 tests pass. |
| 3 | Getting Started Celebration Overlay | [COMPLETE] | 2026-03-19 | Created `components/dashboard/GettingStartedCelebration.tsx` with confetti, focus trap, scroll lock, Caveat heading, "Let's Go" button (no delay), reduced motion support. 11 tests pass. |
| 4 | Page Visit Flags (Items 5-6) | [COMPLETE] | 2026-03-19 | Added `useEffect` to `MusicPage.tsx` (ambient tab + auth check) and `PrayerWall.tsx` (auth check). No visual changes. 7 tests pass. |
| 5 | Dashboard Integration | [COMPLETE] | 2026-03-19 | Wired `GettingStartedCard` + `GettingStartedCelebration` into `Dashboard.tsx`. Celebration fires on allComplete, manual dismiss skips celebration. Fixed pre-existing test failures in `Dashboard.test.tsx` and `DashboardIntegration.test.tsx` (missing `wr_onboarding_complete` seed). Changed `useGettingStarted` import to `@/hooks/useAuth` for mock compatibility. 11 new tests + all existing tests pass. |
| 6 | Accessibility & Reduced Motion Audit | [COMPLETE] | 2026-03-19 | All a11y features were built correctly in Steps 2-3 (ARIA labels, focus rings, live region, focus trap, scroll lock, reduced motion). Created dedicated `GettingStartedAccessibility.test.tsx` with 8 tests confirming coverage. |
