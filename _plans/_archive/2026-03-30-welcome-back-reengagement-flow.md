# Implementation Plan: Welcome Back Re-engagement Flow

**Spec:** `_specs/welcome-back-reengagement-flow.md`
**Date:** 2026-03-30
**Branch:** `claude/feature/welcome-back-reengagement-flow`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign (~2026-03-25) and dashboard redesign. Full-screen overlay gradient values come from codebase inspection of `MoodCheckIn.tsx`, not the recon. Dashboard phase machine from `Dashboard.tsx` (current code on branch).

---

## Architecture Context

### Relevant Files

| File | Role | Lines |
|------|------|-------|
| `frontend/src/pages/Dashboard.tsx` | Phase machine, conditional overlays | ~498 lines |
| `frontend/src/components/dashboard/MoodCheckIn.tsx` | Full-screen overlay pattern to match | Reference for gradient, layout, animation |
| `frontend/src/components/dashboard/EveningReflection.tsx` | Another full-screen overlay reference | Same gradient + staggered steps |
| `frontend/src/components/dashboard/WelcomeWizard.tsx` | Onboarding overlay in phase machine | Reference for phase rendering pattern |
| `frontend/src/hooks/useFaithPoints.ts` | Streak data + repair method | Exposes `currentStreak`, `previousStreak`, `isFreeRepairAvailable`, `repairStreak()`, `totalPoints` |
| `frontend/src/services/streak-repair-storage.ts` | Low-level streak repair storage | `getRepairData()`, `isFreeRepairAvailable()`, `StreakRepairData` |
| `frontend/src/hooks/useSoundEffects.ts` | Sound playback | `playSoundEffect('chime')`, `playSoundEffect('ascending')` |
| `frontend/src/utils/date.ts` | Date utilities | `getLocalDateString()` — critical: never use UTC dates |
| `frontend/src/types/dashboard.ts` | Type definitions | `StreakData`, `StreakRepairData` |
| `frontend/src/data/challenges.ts` | Challenge data + start dates | `CHALLENGES` array with `getStartDate(year)` |
| `frontend/src/constants/dashboard/levels.ts` | Faith point thresholds | Level names, point thresholds |

### Phase Machine (Current)

```typescript
type DashboardPhase = 'onboarding' | 'check_in' | 'recommendations' | 'dashboard_enter' | 'dashboard'
```

**Initial phase logic** (Dashboard.tsx line 77-80):
```typescript
const [phase, setPhase] = useState<DashboardPhase>(() => {
  if (!isOnboardingComplete()) return 'onboarding'
  return hasCheckedInToday() ? 'dashboard' : 'check_in'
})
```

**Secondary check** (lines 158-167):
```typescript
useEffect(() => {
  if (!checkedRef.current) {
    checkedRef.current = true
    if (!isOnboardingComplete()) {
      setPhase('onboarding')
    } else {
      setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
    }
  }
}, [])
```

Both entry points must be updated to insert the `welcome_back` phase.

### Phase Rendering Pattern (Dashboard.tsx lines 305-331):

```typescript
if (phase === 'onboarding') {
  return <WelcomeWizard ... />
}
if (phase === 'check_in') {
  return <MoodCheckIn ... />
}
if (phase === 'recommendations' && lastMoodEntry) {
  return <MoodRecommendations ... />
}
// dashboard phase: renders full layout below
```

### Full-Screen Overlay CSS Pattern (from MoodCheckIn.tsx):

```
fixed inset-0 z-50 flex items-center justify-center
bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]
```

### Fade-In Animation Pattern:

```
motion-safe:animate-fade-in
```
Keyframe: 500ms, opacity 0 + translateY(8px) → opacity 1 + translateY(0).

### useFaithPoints Interface (relevant fields):

```typescript
{
  currentStreak: number
  longestStreak: number
  previousStreak: number | null      // from StreakRepairData
  isFreeRepairAvailable: boolean
  totalPoints: number
  repairStreak: (useFreeRepair: boolean) => void
}
```

### Test Patterns

- Tests in `components/dashboard/__tests__/`, named `ComponentName.test.tsx`
- Wrap with `<MemoryRouter>` when component uses `Link` or routing
- Mock `useReducedMotion` via `vi.mock('@/hooks/useReducedMotion')`
- `localStorage.clear()` in `beforeEach`
- Use `vi.useFakeTimers()` for timer-based tests, `vi.useRealTimers()` in `afterEach`
- `userEvent` for click interactions, `fireEvent` for keyboard events

---

## Auth Gating Checklist

This feature is entirely within the authenticated dashboard. Logged-out users never see Dashboard.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Welcome Back screen | Only for authenticated dashboard users | Step 2 | Dashboard is already auth-gated (`if (!user) return null` at line 303) |
| Streak repair | Uses existing `useFaithPoints.repairStreak()` which no-ops when unauthed | Step 3 | Inherits from Dashboard auth gate |
| "Step Back In" / "Skip to Dashboard" | Only rendered within dashboard | Step 3 | Inherits from Dashboard auth gate |

No additional auth gates needed — the entire Dashboard component is already behind `if (!user) return null`.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Full-screen overlay | background | `bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]` | MoodCheckIn.tsx codebase inspection |
| Full-screen overlay | layout | `fixed inset-0 z-50 flex items-center justify-center` | MoodCheckIn.tsx |
| "Welcome Back" heading | font | `font-script` (Caveat), `text-4xl sm:text-5xl`, `font-bold`, `text-white` | Spec + design-system.md: Caveat for script headings |
| Subheading | font | `font-sans` (Inter), `text-lg`, `text-white/70` | Spec: muted white |
| Grace line | font | `font-sans italic text-white/60` | Spec: italic, gentle |
| Frosted glass card | styles | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | design-system.md: Dashboard Card Pattern |
| Primary CTA | styles | `bg-primary text-white font-medium py-3 px-8 rounded-full` | design-system.md: Primary Rounded button |
| Secondary CTA | styles | `text-white/50 hover:text-white/70 text-sm` | Spec: subtle muted |
| Fade-in animation | keyframe | `motion-safe:animate-fade-in` (500ms, opacity + translateY) | tailwind.config.js |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Caveat (`font-script`) is for warm/personal headings — NOT Lora. Lora (`font-serif`) is for scripture.
- All full-screen dashboard overlays use the exact same radial + linear gradient. Copy from MoodCheckIn.tsx, do not approximate.
- Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` — this is the dashboard pattern, not the inner-page card pattern.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- `getLocalDateString()` for date comparisons — never use `.toISOString().split('T')[0]` (UTC bug).
- Sound effects gated behind `wr_sound_effects_enabled` AND `prefers-reduced-motion`.
- `motion-safe:animate-fade-in` is the standard fade pattern. Custom stagger uses inline `animationDelay`.
- All Tailwind animations respect `prefers-reduced-motion` via `motion-safe:` prefix.
- Primary rounded button: `bg-primary text-white font-medium py-3 px-8 rounded-full`.
- Touch targets: 44px minimum on all interactive elements (`min-h-[44px]`).

---

## Shared Data Models

### Existing types consumed (no new types needed):

```typescript
// from types/dashboard.ts
interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
}

interface StreakRepairData {
  previousStreak: number | null
  lastFreeRepairDate: string | null
  repairsUsedThisWeek: number
  weekStartDate: string
}
```

### localStorage keys touched (all existing — no new keys):

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_streak` | Read | `lastActiveDate` for inactivity detection |
| `wr_streak_repairs` | Read (via useFaithPoints) | `previousStreak` for repair availability |
| `wr_faith_points` | Read (via useFaithPoints) | `totalPoints` for paid repair check |
| `wr_user_name` | Read (via useAuth) | Personalized greeting |
| `wr_challenge_progress` | Read | "What's New" challenge detection |
| `wr_friends` | Read | "What's New" friend count |

### sessionStorage key (new):

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_welcome_back_shown` | Both | Prevents re-showing within same session |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-screen centered, content stacks vertically, buttons full-width, streak repair card full-width, 44px touch targets |
| Tablet | 768px | Same centered layout, content max-width ~500px, buttons auto-width centered |
| Desktop | 1440px | Same centered layout, content max-width ~480px, buttons auto-width centered |

All breakpoints: full viewport radial gradient, no navbar visible (z-50 overlay).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| "Welcome Back" heading → subheading | 8px (`mt-2`) | Codebase: MoodCheckIn heading→subtitle spacing |
| Subheading → streak section | 24px (`mt-6`) | Proportional to MoodCheckIn content spacing |
| Streak section → repair card | 16px (`mt-4`) | Standard card spacing |
| Repair card → "What's New" | 24px (`mt-6`) | Section separation |
| "What's New" → CTAs | 32px (`mt-8`) | CTA separation from content |
| Primary CTA → secondary CTA | 12px (`mt-3`) | Button group spacing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/welcome-back-reengagement-flow` exists and is checked out
- [ ] `wr_streak` localStorage key contains `lastActiveDate` field (verified in `StreakData` type)
- [ ] `useFaithPoints` exposes `previousStreak`, `isFreeRepairAvailable`, `repairStreak()`, `totalPoints` (verified at lines 43-44, 117-118, 264 of useFaithPoints.ts)
- [ ] All auth-gated actions from the spec are accounted for in the plan (all inherit from Dashboard gate)
- [ ] Design system values are verified from codebase inspection (MoodCheckIn.tsx gradient, frosted glass pattern)
- [ ] No [UNVERIFIED] values exist (all values from codebase inspection)
- [ ] No recon report needed (full-screen overlay, not a page with hero/sections)
- [ ] No prior specs in sequence — standalone feature

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| What constitutes "previous streak existed"? | `previousStreak > 1` from repair data OR `currentStreak > 0` before reset | Spec says "if previous streak existed (> 1)". The `previousStreak` in StreakRepairData captures the pre-reset value. If `previousStreak` is null or ≤ 1, no streak section. |
| How to detect days since last active? | Read `wr_streak` directly via `JSON.parse(localStorage.getItem('wr_streak'))`, compute day diff using `getLocalDateString()` | Cannot use `useFaithPoints.currentStreak` because that's the post-reset value. Need raw `lastActiveDate` from storage. |
| "What's New" challenge detection | Compare each `CHALLENGES[].getStartDate(year)` against `lastActiveDate`. If start date is between `lastActiveDate` and today, it's new. | Frontend-only — mock/estimated as spec allows. |
| "What's New" friend activity | Read `wr_friends` count. If friends > 0, show estimated prayer count based on days away. | Mock estimation: `daysSinceActive * 3` prayers per active friend (capped at 3 friends). Spec explicitly allows mock/estimated. |
| Auto-advance after repair | 1500ms delay, then transition to `check_in` | Gives time for toast + sound to play. Matches MoodCheckIn's verse display timing pattern. |
| Corrupted `wr_streak` data | Wrap in try/catch, treat as no data (skip Welcome Back) | Spec edge case: "Treat as no data." |
| sessionStorage unavailable | Wrap in try/catch, fallback = Welcome Back may re-show | Spec: "minor UX annoyance, not a crash" |

---

## Implementation Steps

### Step 1: Create inactivity detection utility

**Objective:** Create a pure utility function that reads `wr_streak` and computes days since last active. This will be consumed by Dashboard to decide whether to show the Welcome Back phase.

**Files to create/modify:**
- `frontend/src/services/welcome-back-storage.ts` — new file

**Details:**

Create `welcome-back-storage.ts` with these exports:

```typescript
import { getLocalDateString } from '@/utils/date'

const STREAK_KEY = 'wr_streak'
const SESSION_KEY = 'wr_welcome_back_shown'

/**
 * Returns the number of days since the user was last active, or null if
 * no streak data exists (brand-new user / corrupted data).
 */
export function getDaysSinceLastActive(): number | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data.lastActiveDate !== 'string') return null

    const lastActive = data.lastActiveDate // 'YYYY-MM-DD'
    const today = getLocalDateString()
    if (lastActive === today) return 0

    const lastDate = new Date(lastActive + 'T00:00:00')
    const todayDate = new Date(today + 'T00:00:00')
    const diffMs = todayDate.getTime() - lastDate.getTime()
    if (diffMs < 0) return 0 // future date = treat as today
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

/**
 * Returns true if the Welcome Back screen should be shown:
 * - daysSinceLastActive >= 3
 * - AND not already shown this session (sessionStorage)
 */
export function shouldShowWelcomeBack(): boolean {
  const days = getDaysSinceLastActive()
  if (days === null || days < 3) return false

  try {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return false
  } catch {
    // sessionStorage unavailable — proceed (may re-show, acceptable)
  }
  return true
}

/**
 * Mark Welcome Back as shown for this session.
 */
export function markWelcomeBackShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true')
  } catch {
    // Silently fail — acceptable per spec
  }
}
```

**Auth gating:** N/A — utility functions, auth gating happens at Dashboard level.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — use `getLocalDateString()` for local timezone
- DO NOT write to `wr_streak` — only read
- DO NOT create a new localStorage key — only read existing + use sessionStorage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getDaysSinceLastActive returns null when no wr_streak data` | unit | Empty localStorage → null |
| `getDaysSinceLastActive returns null when wr_streak is malformed` | unit | Invalid JSON → null |
| `getDaysSinceLastActive returns null when lastActiveDate is missing` | unit | `{currentStreak: 5}` → null |
| `getDaysSinceLastActive returns 0 when lastActiveDate is today` | unit | Today's date → 0 |
| `getDaysSinceLastActive returns correct day count` | unit | 3 days ago → 3, 7 days ago → 7 |
| `shouldShowWelcomeBack returns false when no data` | unit | null days → false |
| `shouldShowWelcomeBack returns false when < 3 days` | unit | 2 days → false |
| `shouldShowWelcomeBack returns true when >= 3 days` | unit | 3 days → true, 7 days → true |
| `shouldShowWelcomeBack returns false when already shown this session` | unit | sessionStorage set → false |
| `markWelcomeBackShown sets sessionStorage` | unit | Verify sessionStorage written |
| `shouldShowWelcomeBack returns true when exactly 3 days (boundary)` | unit | Boundary test |

**Expected state after completion:**
- [ ] `welcome-back-storage.ts` exists with 3 exported functions
- [ ] 11 unit tests pass
- [ ] No changes to any existing files

---

### Step 2: Update Dashboard phase machine

**Objective:** Add `welcome_back` phase to the Dashboard's phase type and routing logic. Insert the phase between `onboarding` and `check_in`. Wire up phase transitions.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — modify phase type, initial state, phase routing, transition handlers

**Details:**

1. **Update `DashboardPhase` type** (line 49):
```typescript
type DashboardPhase = 'onboarding' | 'welcome_back' | 'check_in' | 'recommendations' | 'dashboard_enter' | 'dashboard'
```

2. **Add import** for the new storage service:
```typescript
import { shouldShowWelcomeBack, markWelcomeBackShown } from '@/services/welcome-back-storage'
```

3. **Add lazy import** for WelcomeBack component (will be created in Step 3):
```typescript
import { WelcomeBack } from '@/components/dashboard/WelcomeBack'
```

4. **Update initial phase logic** (line 77-80):
```typescript
const [phase, setPhase] = useState<DashboardPhase>(() => {
  if (!isOnboardingComplete()) return 'onboarding'
  if (shouldShowWelcomeBack()) return 'welcome_back'
  return hasCheckedInToday() ? 'dashboard' : 'check_in'
})
```

5. **Update the useEffect double-check** (lines 158-167):
```typescript
useEffect(() => {
  if (!checkedRef.current) {
    checkedRef.current = true
    if (!isOnboardingComplete()) {
      setPhase('onboarding')
    } else if (shouldShowWelcomeBack()) {
      setPhase('welcome_back')
    } else {
      setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
    }
  }
}, [])
```

6. **Update `handleOnboardingComplete`** (line 190-192) — after onboarding, check for welcome back before check-in:
```typescript
const handleOnboardingComplete = () => {
  if (shouldShowWelcomeBack()) {
    setPhase('welcome_back')
  } else {
    setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
  }
}
```

7. **Add Welcome Back transition handlers:**
```typescript
const handleWelcomeBackStepIn = () => {
  markWelcomeBackShown()
  setPhase('check_in')
}

const handleWelcomeBackSkip = () => {
  markWelcomeBackShown()
  setPhase('dashboard')
}
```

8. **Add phase rendering** — insert between `onboarding` and `check_in` blocks (after line 311, before line 314):
```typescript
if (phase === 'welcome_back') {
  return (
    <WelcomeBack
      userName={user.name}
      faithPoints={faithPoints}
      onStepIn={handleWelcomeBackStepIn}
      onSkipToDashboard={handleWelcomeBackSkip}
    />
  )
}
```

**Auth gating:** Inherited from `if (!user) return null` at line 303.

**Responsive behavior:** N/A: no UI impact (phase logic only).

**Guardrails (DO NOT):**
- DO NOT remove existing phases or change their behavior
- DO NOT modify MoodCheckIn, EveningReflection, or WelcomeWizard
- DO NOT call `recordActivity()` from Welcome Back handlers — spec explicitly prohibits
- DO NOT change the existing phase rendering for `check_in`, `recommendations`, `dashboard_enter`, or `dashboard`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Dashboard shows WelcomeBack when shouldShowWelcomeBack returns true` | integration | Mock storage → phase renders WelcomeBack |
| `Dashboard shows MoodCheckIn when shouldShowWelcomeBack returns false and not checked in` | integration | Normal flow preserved |
| `Dashboard shows dashboard when shouldShowWelcomeBack returns false and checked in` | integration | Normal flow preserved |
| `handleWelcomeBackStepIn transitions to check_in and marks shown` | integration | Verify phase + sessionStorage |
| `handleWelcomeBackSkip transitions to dashboard and marks shown` | integration | Verify phase + sessionStorage |
| `phase machine sequence: onboarding → welcome_back → check_in` | integration | Full sequence test |

**Expected state after completion:**
- [ ] `DashboardPhase` includes `welcome_back`
- [ ] Phase routing correctly inserts `welcome_back` between `onboarding` and `check_in`
- [ ] `handleWelcomeBackStepIn` and `handleWelcomeBackSkip` exist and call `markWelcomeBackShown()`
- [ ] WelcomeBack component rendered for `welcome_back` phase (component created in Step 3)
- [ ] 6 integration tests pass
- [ ] Existing Dashboard tests still pass

---

### Step 3: Create WelcomeBack component

**Objective:** Build the full-screen Welcome Back overlay with greeting, streak section, streak repair card, "What's New" section, and dual CTAs. This is the core UI component.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeBack.tsx` — new file

**Details:**

**Props interface:**
```typescript
interface WelcomeBackProps {
  userName: string
  faithPoints: {
    currentStreak: number
    previousStreak: number | null
    isFreeRepairAvailable: boolean
    totalPoints: number
    repairStreak: (useFreeRepair: boolean) => void
  }
  onStepIn: () => void
  onSkipToDashboard: () => void
}
```

**Component structure:**

```tsx
export function WelcomeBack({ userName, faithPoints, onStepIn, onSkipToDashboard }: WelcomeBackProps) {
  const prefersReduced = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()
  const { show: showToast } = useToastSafe()
  const [repairDone, setRepairDone] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Play chime on mount
  useEffect(() => {
    playSoundEffect('chime')
    headingRef.current?.focus()
  }, [playSoundEffect])

  // Compute "What's New" items
  const whatsNewItems = useMemo(() => computeWhatsNew(), [])

  // Streak info
  const previousStreak = faithPoints.previousStreak
  const showStreakSection = previousStreak !== null && previousStreak > 1
  const canRepairFree = faithPoints.isFreeRepairAvailable && showStreakSection
  const canRepairPaid = !faithPoints.isFreeRepairAvailable && faithPoints.totalPoints >= 50 && showStreakSection
  const showRepairCard = (canRepairFree || canRepairPaid) && !repairDone

  // Repair handler
  const handleRepair = () => {
    faithPoints.repairStreak(canRepairFree)
    setRepairDone(true)
    playSoundEffect('ascending')
    showToast(`🔥 Streak restored to ${previousStreak} days!`, { type: 'celebration' })
    // Auto-advance after 1500ms
    setTimeout(() => onStepIn(), 1500)
  }

  // Animation classes
  const fadeIn = prefersReduced ? '' : 'motion-safe:animate-fade-in'
  const stagger = (delayMs: number) =>
    prefersReduced ? {} : { animationDelay: `${delayMs}ms`, animationFillMode: 'backwards' as const }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]">
      <div className="flex w-full max-w-md flex-col items-center px-6 text-center">

        {/* Greeting */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cn('font-script text-4xl font-bold text-white sm:text-5xl', fadeIn)}
          style={stagger(0)}
        >
          {userName ? `Welcome back, ${userName}` : 'Welcome Back'}
        </h1>
        <p
          className={cn('mt-2 text-lg text-white/70', fadeIn)}
          style={stagger(100)}
        >
          We've been holding your spot.
        </p>

        {/* Streak section */}
        {showStreakSection && (
          <div className={cn('mt-6', fadeIn)} style={stagger(200)}>
            <p className="text-white/80">
              You had a <span className="font-semibold text-white">{previousStreak}-day</span> streak going.
            </p>
            <p className="mt-1 text-sm italic text-white/60">
              Life happens — and God's grace covers every gap.
            </p>
          </div>
        )}

        {/* Streak Repair Card */}
        {showRepairCard && (
          <div
            className={cn(
              'mt-4 w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm',
              fadeIn,
            )}
            style={stagger(500)}
          >
            <p className="text-lg font-medium text-white">
              🔥 Restore your streak?
            </p>
            <button
              onClick={handleRepair}
              className="mt-3 min-h-[44px] w-full rounded-full bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto"
            >
              {canRepairFree ? 'Use Free Repair' : 'Repair for 50 pts'}
            </button>
          </div>
        )}

        {/* "What's New" section */}
        {whatsNewItems.length > 0 && (
          <div className={cn('mt-6 w-full text-left', fadeIn)} style={stagger(700)}>
            <p className="text-sm font-medium text-white/50">While you were away:</p>
            <ul className="mt-2 space-y-2">
              {whatsNewItems.map((item, i) => (
                <li
                  key={item.key}
                  className={cn('text-sm text-white/70', fadeIn)}
                  style={stagger(700 + (i + 1) * 100)}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTAs */}
        {!repairDone && (
          <div className={cn('mt-8 flex w-full flex-col items-center gap-3', fadeIn)} style={stagger(900)}>
            <button
              onClick={onStepIn}
              className="min-h-[44px] w-full rounded-full bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto"
            >
              Step Back In
            </button>
            <button
              onClick={onSkipToDashboard}
              className="min-h-[44px] text-sm text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:rounded"
            >
              Skip to Dashboard
            </button>
          </div>
        )}

        {/* Aria live region for repair announcement */}
        {repairDone && (
          <p className="sr-only" role="status" aria-live="polite">
            Streak restored to {previousStreak} days. Continuing to mood check-in.
          </p>
        )}
      </div>
    </div>
  )
}
```

**`computeWhatsNew()` helper** (inside the file, not exported):

```typescript
function computeWhatsNew(): { key: string; icon: string; text: string }[] {
  const items: { key: string; icon: string; text: string }[] = []

  try {
    // Read lastActiveDate from wr_streak
    const raw = localStorage.getItem('wr_streak')
    if (!raw) return items
    const streakData = JSON.parse(raw)
    const lastActiveDate = streakData?.lastActiveDate
    if (!lastActiveDate) return items

    const lastDate = new Date(lastActiveDate + 'T00:00:00')
    const today = new Date(getLocalDateString() + 'T00:00:00')

    // 1. Check for new challenge start dates
    const currentYear = today.getFullYear()
    for (const challenge of CHALLENGES) {
      const startDate = challenge.getStartDate(currentYear)
      if (startDate > lastDate && startDate <= today) {
        items.push({
          key: `challenge-${challenge.id}`,
          icon: '🎯',
          text: `New challenge: ${challenge.title}`,
        })
        break // Max 1 challenge item
      }
    }

    // 2. Check friend activity
    const friendsRaw = localStorage.getItem('wr_friends')
    if (friendsRaw) {
      const friendsData = JSON.parse(friendsRaw)
      const friendCount = friendsData?.friends?.length ?? 0
      if (friendCount > 0) {
        const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        const estimatedPrayers = Math.min(friendCount, 3) * daysSince * 3
        if (estimatedPrayers > 0) {
          items.push({
            key: 'friend-activity',
            icon: '🙏',
            text: `~${estimatedPrayers} prayers shared on the Prayer Wall`,
          })
        }
      }
    }

    // 3. Check for seasonal devotional content (liturgical calendar)
    // Simplified: if a named season started since lastActive
    // (Real detection would use useLiturgicalSeason, but this is a
    // pure function — we do a lightweight inline check)
    // Omitted for now — will only show items 1 and 2

  } catch {
    // Malformed data — return whatever we have
  }

  return items.slice(0, 3) // Max 3 items
}
```

**Imports needed:**
```typescript
import { useState, useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useToastSafe } from '@/components/ui/Toast'
import { getLocalDateString } from '@/utils/date'
import { CHALLENGES } from '@/data/challenges'
import { cn } from '@/lib/utils'
```

**Auth gating:** N/A — rendered only within authenticated Dashboard.

**Responsive behavior (UI step):**
- Desktop (1440px): Content centered, max-width `max-w-md` (448px ≈ 480px spec). Buttons `sm:w-auto` (shrink to content).
- Tablet (768px): Same centered layout, `max-w-md` constrains width to ~448px. Buttons auto-width.
- Mobile (375px): Full width within `px-6` padding. Buttons `w-full`. Repair card full-width. 44px touch targets on all buttons.

**Guardrails (DO NOT):**
- DO NOT call `recordActivity()` — spec explicitly says Welcome Back is not an activity
- DO NOT create any new localStorage keys — only read existing ones
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT show "While you were away:" header when items array is empty — omit the entire section
- DO NOT show streak section when `previousStreak` is null or ≤ 1
- DO NOT show repair card when no repair option is available OR after repair is complete
- DO NOT show CTAs after repair is done (auto-advancing)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders greeting with user name` | unit | "Welcome back, Eric" |
| `renders greeting without name` | unit | "Welcome Back" when name is empty |
| `renders subheading` | unit | "We've been holding your spot." |
| `shows streak section when previousStreak > 1` | unit | "You had a 15-day streak going." |
| `hides streak section when previousStreak is null` | unit | No streak text |
| `hides streak section when previousStreak is 1` | unit | No streak text |
| `shows grace line when streak section visible` | unit | Italic text present |
| `shows free repair card when isFreeRepairAvailable` | unit | "Use Free Repair" button |
| `shows paid repair card when free used and 50+ points` | unit | "Repair for 50 pts" button |
| `hides repair card when no repair available` | unit | No repair card |
| `repair button calls repairStreak and plays ascending` | unit | Click → repairStreak + sound |
| `repair shows toast with restored count` | unit | Toast message matches |
| `auto-advances to check_in after repair` | unit | onStepIn called after 1500ms |
| `hides CTAs after repair` | unit | No "Step Back In" or "Skip" |
| `shows aria-live announcement after repair` | unit | Screen reader text |
| `"Step Back In" calls onStepIn` | unit | Button click → callback |
| `"Skip to Dashboard" calls onSkipToDashboard` | unit | Button click → callback |
| `"What's New" shows items when available` | unit | Mock localStorage with friends |
| `"What's New" hidden when no items` | unit | No "While you were away" text |
| `heading receives focus on mount` | unit | headingRef focused |
| `plays chime on mount` | unit | playSoundEffect('chime') called |
| `animations disabled when prefers-reduced-motion` | unit | No animate classes |
| `all buttons have min 44px touch target` | unit | min-h-[44px] present |

**Expected state after completion:**
- [ ] `WelcomeBack.tsx` exists with full component
- [ ] 23 unit tests pass
- [ ] Component matches full-screen overlay pattern from MoodCheckIn
- [ ] All interactive elements keyboard accessible with focus indicators

---

### Step 4: Add "What's New" liturgical season detection

**Objective:** Enhance the `computeWhatsNew()` function to detect seasonal devotional content changes. This is a refinement of the inline logic in Step 3.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeBack.tsx` — modify `computeWhatsNew()`

**Details:**

Add a third detection for seasonal devotional content:

```typescript
// 3. Check for seasonal devotional content
// Use the liturgical season algorithm inline (same as useLiturgicalSeason but pure)
import { getLiturgicalSeason } from '@/constants/liturgical-calendar'

// In computeWhatsNew():
const lastSeason = getLiturgicalSeason(lastDate)
const currentSeason = getLiturgicalSeason(today)
if (currentSeason.id !== lastSeason.id && currentSeason.id !== 'ordinary') {
  items.push({
    key: `season-${currentSeason.id}`,
    icon: '✨',
    text: `${currentSeason.name} devotionals are available`,
  })
}
```

**First, verify** that `getLiturgicalSeason()` exists as a pure function (not hook-only). If it only exists as `useLiturgicalSeason()` hook, extract the pure function or use a simpler check:

```typescript
// Fallback if no pure getLiturgicalSeason exists:
// Skip this detection — only show challenge + friend items
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT call a React hook inside `computeWhatsNew()` — it's called inside `useMemo`
- DO NOT import the full `useLiturgicalSeason` hook — need a pure function

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `"What's New" shows seasonal item when season changed` | unit | Mock date crossing season boundary |
| `"What's New" omits seasonal item when same season` | unit | Same season → no item |
| `"What's New" omits seasonal item during ordinary time` | unit | Ordinary time → no item |
| `"What's New" limits to 3 items max` | unit | Even if more detected |

**Expected state after completion:**
- [ ] `computeWhatsNew()` detects up to 3 item types: challenge, friend activity, seasonal content
- [ ] 4 additional tests pass
- [ ] No hook calls inside the pure function

---

### Step 5: Write comprehensive tests for WelcomeBack component and Dashboard integration

**Objective:** Ensure full test coverage for the WelcomeBack component and Dashboard phase machine integration.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/WelcomeBack.test.tsx` — new file
- `frontend/src/services/__tests__/welcome-back-storage.test.ts` — new file
- `frontend/src/pages/__tests__/Dashboard-welcome-back.test.tsx` — new file

**Details:**

**`welcome-back-storage.test.ts`:** Tests from Step 1 (11 tests). Follow existing pattern from MoodCheckIn tests — `localStorage.clear()` in beforeEach, `vi.useFakeTimers()` for date manipulation.

**`WelcomeBack.test.tsx`:** Tests from Step 3 (23 tests). Mock `useSoundEffects`, `useReducedMotion`, `useToastSafe`. Set up localStorage for streak/repair/friends data. Use `MemoryRouter` wrapper if any routing is used (likely not needed, but include for safety).

**`Dashboard-welcome-back.test.tsx`:** Tests from Step 2 (6 tests). Mock `shouldShowWelcomeBack`, `isOnboardingComplete`, `hasCheckedInToday` from their respective modules. Verify the phase machine renders `WelcomeBack` at the right time.

**Mock setup pattern** (from MoodCheckIn tests):
```typescript
vi.mock('@/hooks/useReducedMotion')
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))
vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock('@/services/welcome-back-storage', () => ({
  shouldShowWelcomeBack: vi.fn(),
  markWelcomeBackShown: vi.fn(),
  getDaysSinceLastActive: vi.fn(),
}))
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing test files
- DO NOT duplicate tests that already exist in other test files
- DO NOT test internal implementation details — test behavior

**Test specifications:**
(All tests are the test specifications — this step IS the test step)

| Test File | Count | Description |
|-----------|-------|-------------|
| `welcome-back-storage.test.ts` | 11 | Inactivity detection + sessionStorage |
| `WelcomeBack.test.tsx` | 23 | Component rendering, interactions, a11y |
| `Dashboard-welcome-back.test.tsx` | 6 | Phase machine integration |

**Expected state after completion:**
- [ ] 40 new tests pass
- [ ] All existing tests still pass
- [ ] No test failures in CI

---

### Step 6: Build verification and cleanup

**Objective:** Verify the full build passes, all tests pass (new + existing), no lint errors introduced, and no dead code.

**Files to create/modify:**
- None (verification only)

**Details:**

1. Run `pnpm build` — expect 0 errors, 0 warnings
2. Run `pnpm test` — expect all tests pass (existing + ~40 new)
3. Run `pnpm lint` — expect no new lint errors beyond the pre-existing 6
4. Verify no dead imports or unused exports
5. Manual verification (or `/verify-with-playwright`):
   - Set `wr_streak` with `lastActiveDate` 5 days ago in localStorage
   - Set `wr_streak_repairs` with `previousStreak: 12`
   - Navigate to `/` while simulated-auth is on
   - Verify Welcome Back screen appears with greeting, streak info, repair card
   - Click "Step Back In" → mood check-in appears
   - Refresh → Welcome Back does not re-show (sessionStorage)
   - Clear sessionStorage, refresh → Welcome Back shows again

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT fix pre-existing lint errors unrelated to this feature
- DO NOT modify files not touched in Steps 1-5

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full build passes | build | `pnpm build` exits 0 |
| All tests pass | test | `pnpm test` exits 0 |
| No new lint errors | lint | `pnpm lint` shows no new errors |

**Expected state after completion:**
- [ ] Build: 0 errors, 0 warnings
- [ ] Tests: all pass (4,862 existing + ~40 new = ~4,902)
- [ ] Lint: no new errors
- [ ] Feature works end-to-end in browser

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Inactivity detection utility |
| 2 | 1 | Dashboard phase machine update |
| 3 | 1 | WelcomeBack component (uses storage utility) |
| 4 | 3 | "What's New" liturgical season enhancement |
| 5 | 1, 2, 3, 4 | Comprehensive tests |
| 6 | 1, 2, 3, 4, 5 | Build verification |

Steps 2 and 3 can run in parallel after Step 1 (both depend on Step 1 but not on each other).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Inactivity detection utility | [COMPLETE] | 2026-03-30 | Created `frontend/src/services/welcome-back-storage.ts` with 3 exports. 13 tests pass (11 planned + 2 bonus edge cases). |
| 2 | Dashboard phase machine update | [COMPLETE] | 2026-03-30 | Updated Dashboard.tsx: added `welcome_back` phase, import for WelcomeBack + storage utils, initial state logic, useEffect check, onboarding→welcome_back transition, step-in/skip handlers, phase rendering block. |
| 3 | WelcomeBack component | [COMPLETE] | 2026-03-30 | Created `WelcomeBack.tsx`. Deviated from plan: `showToast` API is `(message, type)` not `(message, {type})` — used `'success'` type instead of `'celebration'`. |
| 4 | "What's New" liturgical detection | [COMPLETE] | 2026-03-30 | Added `getLiturgicalSeason` import and season detection to `computeWhatsNew()`. Used `'ordinary-time'` (actual ID) instead of plan's `'ordinary'`. Accessed `currentSeason.currentSeason.id/name` per actual `LiturgicalSeasonResult` type. |
| 5 | Comprehensive tests | [COMPLETE] | 2026-03-30 | Created `WelcomeBack.test.tsx` (23 tests), `Dashboard-welcome-back.test.tsx` (6 tests). Storage tests from Step 1 (13 tests). Total: 42 new tests, all passing. Existing Dashboard tests (9) still pass. |
| 6 | Build verification | [COMPLETE] | 2026-03-30 | Build: 0 errors, 0 warnings (98.41 KB gzipped). TypeScript: clean. Tests: 4,944 pass + 4 pre-existing failures in ChallengeDetail/Challenges (unrelated). Lint: 0 errors, 31 warnings (all pre-existing, none from new files). |
