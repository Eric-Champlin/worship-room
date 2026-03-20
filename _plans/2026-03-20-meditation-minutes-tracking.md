# Implementation Plan: Meditation Minutes Tracking & History

**Spec:** `_specs/meditation-minutes-tracking.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/meditation-minutes-tracking`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (referenced — localStorage key `wr_meditation_history` is introduced by this spec)

---

## Architecture Context

### Project Structure
- **Storage services:** `frontend/src/services/` — pure functions, no side effects (e.g., `mood-storage.ts`)
- **Types:** `frontend/src/types/` — `dashboard.ts` for growth types, `daily-experience.ts` for `MeditationType`
- **Constants:** `frontend/src/constants/` — `daily-experience.ts` has `MEDITATION_TYPES`, `DURATION_OPTIONS`
- **Date utilities:** `frontend/src/utils/date.ts` — `getLocalDateString()`, `getCurrentWeekStart()`
- **Meditation pages:** `frontend/src/pages/meditate/` — 6 exercise files
- **Dashboard:** `frontend/src/pages/Dashboard.tsx` renders `DashboardHero` with props from `useFaithPoints()`
- **Insights page:** `frontend/src/pages/Insights.tsx` — dark-themed, time range pills (`TimeRange`), `AnimatedSection` wrapper, staggered sections
- **Insights components:** `frontend/src/components/insights/` — `MoodTrendChart`, `CalendarHeatmap`, `InsightCards`, etc.
- **CompletionScreen:** `frontend/src/components/daily/CompletionScreen.tsx` — takes `title`, `ctas`, `className` props

### Key Patterns
- **Storage pattern** (from `mood-storage.ts`): Pure exported functions, `try/catch` around `JSON.parse`, returns empty array on corruption, `localStorage.setItem` with `JSON.stringify`, max entries enforced at write time via `entries.length = MAX`
- **Auth gating**: All 6 meditation exercises check `isAuthenticated` from `useAuth()` and redirect to `/daily?tab=meditate` if logged out. Dashboard and Insights are also auth-gated.
- **Meditation completion point**: Each exercise calls `markMeditationComplete(type)` and `recordActivity('meditate')` at the same point. The new `saveMeditationSession()` call must be added alongside these two.
- **Recharts tooltip pattern**: `rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg` (from `MoodTrendChart.tsx` line 102)
- **Recharts chart container**: `<ResponsiveContainer width="100%" height="100%">` inside a fixed-height div
- **Recharts grid/axis**: `CartesianGrid stroke="rgba(255, 255, 255, 0.05)"`, XAxis with `fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11`, `axisLine={false}`, `tickLine={false}`
- **Empty state pattern**: Ghosted chart at `opacity-[0.15]` with overlaid centered text (from `MoodTrendChart.tsx` lines 130-167)
- **Insights section pattern**: Each section wrapped in `AnimatedSection` with stagger index, frosted glass card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Test pattern**: Vitest + RTL, `vi.mock` for hooks, `localStorage.clear()` in `beforeEach`, `MemoryRouter` + `AuthProvider` wrapping, `userEvent.setup()`

### Timed vs Untimed Meditation Structure
- **Timed (Breathing, Soaking)**: Use `duration` state (from `DURATION_OPTIONS: [2, 5, 10]`). Breathing stores `totalDurationRef.current = duration * 60`. Soaking stores `totalDurationRef.current = totalSec` via `startTimer()`. Both complete via RAF loop when elapsed >= total. The `duration` value (in minutes) is available in component state at completion time.
- **Untimed (Gratitude, ACTS, Psalms, Examen)**: No duration tracking. User clicks through steps/inputs and completes via button click (`handleDone`/`handleComplete`). No ref or state tracks elapsed time. A new `startTimeRef` must be added.

### MeditationType Note
The type `MeditationType` uses `'psalm'` (singular), not `'psalms'`. The spec mentions `'psalms'` but the code type is `'psalm'`. The storage service must use the existing `MeditationType` values to stay consistent.

### DashboardHero Layout
Current DashboardHero (line 99) has a vertical flex on mobile (`flex-col items-center gap-3`) / horizontal on md+ (`md:flex-row md:items-center md:gap-6`). It renders:
1. Streak flame + text
2. Level name + faith points + progress bar

The new meditation stat will be added as a third element in this row.

### Insights Page Layout
Content sections in `Insights.tsx` (lines 221-273) render in order:
1. Insufficient data banner
2. Zero data empty state
3. CalendarHeatmap
4. MoodTrendChart
5. InsightCards
6. ActivityCorrelations
7. ScriptureConnections
8. "View Monthly Report" link

The new Meditation History section goes after ScriptureConnections (index 5) and before the "View Monthly Report" link.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Meditation session recording | Only called within auth-gated exercises | Step 3 | Exercises already redirect when logged out; `saveMeditationSession` called alongside existing auth-gated code |
| Completion screen duration display | Only visible on auth-gated exercise pages | Step 3 | Same — exercises redirect logged-out users |
| Dashboard Hero meditation stat | Dashboard is auth-gated | Step 4 | Dashboard renders only when `isAuthenticated` |
| Insights meditation history section | `/insights` is auth-gated | Step 5 | Insights redirects to `/` when not authenticated |
| `wr_meditation_history` writes | Only within auth-gated code paths | Step 3 | No additional check needed — writes only happen inside auth-gated exercises |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Frosted glass card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | `09-design-system.md` |
| Dark tooltip | classes | `rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg` | `MoodTrendChart.tsx:102` |
| Chart grid | stroke | `rgba(255, 255, 255, 0.05)` | `MoodTrendChart.tsx:140` |
| Chart axis tick | fill, fontSize | `rgba(255, 255, 255, 0.5)`, `11` | `MoodTrendChart.tsx:143` |
| Chart empty state | opacity | `opacity-[0.15]` | `MoodTrendChart.tsx:133` |
| Stat label (small) | classes | `text-xs uppercase tracking-wider text-white/40` | spec |
| Stat value (large) | classes | `text-xl font-semibold text-white` | spec |
| DashboardHero stat | classes | `text-sm text-white/60` | spec, matches existing streak display |
| DashboardHero icon | classes | `h-5 w-5 text-white/60` | matches Flame icon pattern at `DashboardHero.tsx:101-103` |
| Completion duration text | classes | `font-serif text-lg text-text-dark` (Lora) | spec, matches CompletionScreen heading style |
| Completion weekly total | classes | `text-sm text-text-light` | spec |
| Section title (insights) | classes | `text-lg font-semibold text-white md:text-xl` | spec, matches existing insight section titles |
| Insights page bg | color | `bg-[#0f0a1e]` | `Insights.tsx:170` |
| Insights content container | classes | `mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6` | `Insights.tsx:223` |
| AnimatedSection pattern | classes | `opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100` | `Insights.tsx:132` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat for script/highlighted headings, Lora (font-serif) for scripture/completion screen text, Inter (font-sans) for UI
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Insights page uses `bg-[#0f0a1e]` (not `bg-hero-dark`) as page background
- DashboardHero gradient: `from-[#1a0533] to-[#0f0a1e]`
- Recharts tooltip: `bg-[#1E0B3E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white shadow-lg`
- All chart animations disabled: `isAnimationActive={false}`
- MeditationType uses `'psalm'` (singular), not `'psalms'`
- `DURATION_OPTIONS = [2, 5, 10]` (minutes), not `[3, 5, 10]`
- Date utilities: always use `getLocalDateString()` — never `toISOString().split('T')[0]`

---

## Shared Data Models (from Master Plan)

```typescript
// Existing type from types/daily-experience.ts
export type MeditationType =
  | 'breathing'
  | 'soaking'
  | 'gratitude'
  | 'acts'
  | 'psalm'
  | 'examen'

// New type — introduced by this spec
export interface MeditationSession {
  id: string            // UUID v4
  type: MeditationType  // one of the 6 meditation types
  date: string          // YYYY-MM-DD local date
  durationMinutes: number  // whole minutes, minimum 1
  completedAt: string   // ISO 8601 timestamp
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_meditation_history` | Write (exercises), Read (dashboard, insights, completion screen) | JSON array of `MeditationSession`, newest first, max 365 |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Summary cards stack vertically, bar chart 200px tall, hero stats wrap/stack |
| Tablet | 640-1024px | Summary cards 3-column, bar chart 220px, hero stats single row |
| Desktop | > 1024px | Summary cards 3-column with gap-4, bar chart 250px, hero stats with generous spacing |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| ScriptureConnections → MeditationHistory | `space-y-6` (24px) from parent container | `Insights.tsx:223` |
| MeditationHistory → View Monthly Report | `space-y-6` (24px) from parent container | `Insights.tsx:223` |
| Summary cards → Bar chart | `mt-4` (16px) within the section card | Spec design |
| Bar chart → Most Practiced callout | `mt-4` (16px) within the section card | Spec design |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 6 meditation exercises are auth-gated and working
- [x] `useFaithPoints` hook and `recordActivity('meditate')` are in place
- [x] `useCompletionTracking` and `markMeditationComplete()` are in place
- [x] Dashboard renders `DashboardHero` with streak/level props
- [x] Insights page renders with time range pills and `AnimatedSection` pattern
- [x] Recharts is installed and used by `MoodTrendChart`
- [x] `utils/date.ts` has `getLocalDateString()` and `getCurrentWeekStart()`
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from recon and codebase inspection
- [ ] Spec says type is `'psalms'` but code uses `'psalm'` — plan uses `'psalm'` (codebase wins)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Meditation type slug for Psalms | `'psalm'` (not `'psalms'`) | Matches existing `MeditationType` in `types/daily-experience.ts` |
| Duration rounding for untimed | `Math.round(elapsed / 60000)` with `Math.max(1, ...)` | Spec says "rounded to nearest minute, minimum 1" |
| Start time tracking mechanism | `useRef<number>(0)` with `Date.now()` | Spec says use ref, not localStorage. `Date.now()` is simpler than `performance.now()` for minute-level granularity |
| Lucide icon for dashboard stat | `Wind` | Spec suggests Wind or Brain — Wind matches the existing meditation card icon in `MEDITATION_TYPES` constants |
| Spec says "This Week" / "This Month" summary cards are fixed | Confirmed: they don't change with time range pills | Only bar chart + "Most Practiced" update with range |
| CompletionScreen modification strategy | Add duration content ABOVE CompletionScreen, not inside it | CompletionScreen is shared and minimal. Duration display is custom per-exercise, rendered before `<CompletionScreen>` just like existing verse/affirmation content in GratitudeReflection |
| Where to place duration block in timed exercises | Between `<AmbientSoundPill>` and `<CompletionScreen>` in Breathing; before `<CompletionScreen>` in Soaking | Follows the existing pattern where exercises render custom content above CompletionScreen |
| Bar chart X-axis density | Every ~5 days for 30d, monthly markers for 90d+ | Same logic as `MoodTrendChart` tick interval calculation |

---

## Implementation Steps

### Step 1: Meditation Session Type & Storage Service

**Objective:** Create the `MeditationSession` type and `meditation-storage.ts` service with all pure functions.

**Files to create/modify:**
- `frontend/src/types/meditation.ts` — new file with `MeditationSession` interface
- `frontend/src/services/meditation-storage.ts` — new file with storage functions
- `frontend/src/services/__tests__/meditation-storage.test.ts` — new test file

**Details:**

`types/meditation.ts`:
```typescript
import type { MeditationType } from './daily-experience'

export interface MeditationSession {
  id: string
  type: MeditationType
  date: string           // YYYY-MM-DD
  durationMinutes: number // whole minutes, min 1
  completedAt: string    // ISO 8601
}
```

`services/meditation-storage.ts` — Pure functions following `mood-storage.ts` pattern:
- `STORAGE_KEY = 'wr_meditation_history'`
- `MAX_ENTRIES = 365`
- `getMeditationHistory(): MeditationSession[]` — parse localStorage, return `[]` on corruption/missing
- `saveMeditationSession(session: MeditationSession): void` — prepend, prune if > 365
- `getMeditationMinutesForWeek(weekStartDate?: string): number` — sum `durationMinutes` for entries where `date >= weekStart && date <= weekEnd`. Default to `getCurrentWeekStart()`. Week ends Sunday (weekStart + 6 days).
- `getMeditationMinutesForRange(startDate: string, endDate: string): MeditationSession[]` — filter entries by date range
- `getMostPracticedType(entries: MeditationSession[]): { type: MeditationType; percentage: number } | null` — count by type, return highest with percentage. If no entries, return `null`. If tied, return any one.

**Guardrails (DO NOT):**
- DO NOT use `toISOString().split('T')[0]` for date comparison — use `getLocalDateString()`
- DO NOT persist anything outside `wr_meditation_history`
- DO NOT import React or any hooks — these are pure functions
- DO NOT throw on corrupted data — always return safe defaults

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getMeditationHistory returns [] for missing key | unit | No localStorage key set |
| getMeditationHistory returns [] for corrupted JSON | unit | Malformed JSON string |
| getMeditationHistory returns [] for non-array JSON | unit | Valid JSON but not array |
| getMeditationHistory returns valid entries | unit | Properly stored array |
| saveMeditationSession prepends entry | unit | New entry at index 0 |
| saveMeditationSession caps at 365 | unit | 365 existing + 1 new = 365 total, oldest removed |
| saveMeditationSession handles first-ever save | unit | No existing key |
| getMeditationMinutesForWeek returns 0 for no entries | unit | Empty history |
| getMeditationMinutesForWeek sums entries in current week | unit | Mock entries spanning week boundary |
| getMeditationMinutesForWeek excludes entries outside week | unit | Entries from prior week |
| getMeditationMinutesForRange filters by date range | unit | Entries inside and outside range |
| getMostPracticedType returns highest type | unit | Mixed types, one dominant |
| getMostPracticedType returns null for empty entries | unit | Empty array |
| getMostPracticedType handles tied types | unit | Two types with equal count |

**Expected state after completion:**
- [ ] `MeditationSession` type is importable from `@/types/meditation`
- [ ] All 5 storage functions work correctly with localStorage
- [ ] All tests pass (14+ tests)
- [ ] No React dependencies in storage service

---

### Step 2: Duration Tracking in Meditation Exercises — Timed

**Objective:** Wire up `saveMeditationSession()` in Breathing and Soaking exercises, using the user-selected duration.

**Files to modify:**
- `frontend/src/pages/meditate/BreathingExercise.tsx` — add session save + pass duration to completion screen
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — add session save + pass duration to completion screen

**Details:**

For **BreathingExercise** (`BreathingExercise.tsx`):
1. Import `saveMeditationSession` from `@/services/meditation-storage`, `getMeditationMinutesForWeek` from same, `MeditationSession` from `@/types/meditation`, `getLocalDateString` from `@/utils/date`
2. Add state: `const [sessionDuration, setSessionDuration] = useState<number | null>(null)`
3. At the completion point (line 106, where `markMeditationComplete('breathing')` is called):
   - Set `setSessionDuration(duration!)` (the component `duration` state holds the selected minutes)
   - Call `saveMeditationSession({ id: crypto.randomUUID(), type: 'breathing', date: getLocalDateString(), durationMinutes: duration!, completedAt: new Date().toISOString() })`
4. In the `screen === 'complete'` render block (line 155-171), add duration display content between `<AmbientSoundPill>` and `<CompletionScreen>`:
   ```tsx
   {sessionDuration !== null && (
     <div className="animate-fade-in text-center mb-6">
       <p className="font-serif text-lg text-text-dark">
         You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
       </p>
       <p className="mt-1 text-sm text-text-light">
         {weeklyTotal === sessionDuration
           ? 'Your first meditation this week — great start!'
           : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`}
       </p>
     </div>
   )}
   ```
   Where `weeklyTotal` is computed: `const weeklyTotal = getMeditationMinutesForWeek()`

For **ScriptureSoaking** (`ScriptureSoaking.tsx`):
1. Same imports as Breathing
2. Add state: `const [sessionDuration, setSessionDuration] = useState<number | null>(null)`
3. At the completion point (line 73, where `markMeditationComplete('soaking')` is called):
   - Set `setSessionDuration(duration!)` (the component `duration` state)
   - Call `saveMeditationSession({ id: crypto.randomUUID(), type: 'soaking', date: getLocalDateString(), durationMinutes: duration!, completedAt: new Date().toISOString() })`
4. In the `screen === 'complete'` render block (line 112-125), add duration display content before `<CompletionScreen>`:
   ```tsx
   <div className="mx-auto max-w-lg px-4 pt-10 text-center">
     <p className="font-serif text-lg text-text-dark">
       You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
     </p>
     <p className="mt-1 text-sm text-text-light">
       {weeklyTotal === sessionDuration
         ? 'Your first meditation this week — great start!'
         : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`}
     </p>
   </div>
   ```

**Guardrails (DO NOT):**
- DO NOT change the existing `markMeditationComplete()` or `recordActivity()` calls — add the session save alongside them
- DO NOT change the duration selection UI or `DURATION_OPTIONS`
- DO NOT remove the `AmbientSoundPill` or any existing completion content
- DO NOT use `performance.now()` for timed meditations — the user-selected duration IS the duration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BreathingExercise saves session on completion | integration | Mock localStorage, verify `wr_meditation_history` has entry after completion |
| ScriptureSoaking saves session on completion | integration | Same pattern |
| Duration text displays correct singular/plural | unit | 1 minute vs 2 minutes |

**Expected state after completion:**
- [ ] Breathing and Soaking exercises save a `MeditationSession` to localStorage on completion
- [ ] Completion screen shows "You meditated for X minutes" + weekly total
- [ ] Existing completion flow (markMeditationComplete, recordActivity) unchanged
- [ ] Tests pass

---

### Step 3: Duration Tracking in Meditation Exercises — Untimed

**Objective:** Add elapsed time tracking to Gratitude, ACTS, Psalms, Examen exercises and wire up `saveMeditationSession()`.

**Files to modify:**
- `frontend/src/pages/meditate/GratitudeReflection.tsx`
- `frontend/src/pages/meditate/ActsPrayerWalk.tsx`
- `frontend/src/pages/meditate/PsalmReading.tsx`
- `frontend/src/pages/meditate/ExamenReflection.tsx`

**Details:**

For each of the 4 untimed exercises, the pattern is identical:

1. **Import** `saveMeditationSession`, `getMeditationMinutesForWeek` from `@/services/meditation-storage`, `MeditationSession` from `@/types/meditation`, `getLocalDateString` from `@/utils/date`
2. **Add start time ref** in the content component (e.g., `GratitudeReflectionContent`):
   ```typescript
   const startTimeRef = useRef(Date.now())
   ```
   This captures the time when the exercise content component mounts (which is when the user begins — these exercises render directly into the exercise, no prestart screen for Gratitude/ACTS/Examen; PsalmReading has a selection screen).
3. **For PsalmReading**: Set `startTimeRef.current = Date.now()` when transitioning to the `'reading'` screen (line 53: `setScreen('reading')`), not on component mount. The selection screen is not meditation time.
4. **Add duration state**: `const [sessionDuration, setSessionDuration] = useState<number | null>(null)`
5. **At the completion point** (where `markMeditationComplete(type)` is called):
   ```typescript
   const elapsedMs = Date.now() - startTimeRef.current
   const minutes = Math.max(1, Math.round(elapsedMs / 60000))
   setSessionDuration(minutes)
   saveMeditationSession({
     id: crypto.randomUUID(),
     type: 'gratitude', // or 'acts', 'psalm', 'examen'
     date: getLocalDateString(),
     durationMinutes: minutes,
     completedAt: new Date().toISOString(),
   })
   ```
6. **Add duration display** in the completion screen render, before `<CompletionScreen>`:

   For **GratitudeReflection** (which already has custom content before CompletionScreen, lines 64-88): Insert the duration block after the verse and before `<CompletionScreen>`:
   ```tsx
   <p className="mb-8 text-sm text-text-light">{completionVerse.reference} WEB</p>
   {sessionDuration !== null && (
     <div className="mb-6">
       <p className="font-serif text-lg text-text-dark">
         You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
       </p>
       <p className="mt-1 text-sm text-text-light">
         {weeklyContextText}
       </p>
     </div>
   )}
   ```

   For **ACTS, Examen** (which render CompletionScreen directly): Add a wrapper div before `<CompletionScreen>`:
   ```tsx
   <Layout hero={<PageHero title="..." />}>
     {sessionDuration !== null && (
       <div className="mx-auto max-w-lg animate-fade-in px-4 pt-10 text-center">
         <p className="font-serif text-lg text-text-dark">
           You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
         </p>
         <p className="mt-1 text-sm text-text-light">{weeklyContextText}</p>
       </div>
     )}
     <CompletionScreen ... />
   </Layout>
   ```

   For **PsalmReading** (same as ACTS/Examen pattern).

   The `weeklyContextText` logic (shared across all 6 exercises):
   ```typescript
   const weeklyTotal = getMeditationMinutesForWeek()
   const weeklyContextText = weeklyTotal === sessionDuration
     ? 'Your first meditation this week — great start!'
     : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`
   ```

**Guardrails (DO NOT):**
- DO NOT persist start time to localStorage — ref only
- DO NOT show a running timer during the exercise — spec explicitly excludes this
- DO NOT cap maximum duration — spec says no cap
- DO NOT change Gratitude's prestart/exercise flow — it has no prestart, items ARE the exercise
- DO NOT set startTimeRef on PsalmReading mount — set it when transitioning to reading screen

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GratitudeReflection saves session on Done | integration | Verify localStorage entry after completion |
| ACTS saves session on Finish (last step) | integration | Navigate through steps, verify save |
| PsalmReading saves session on Finish (last verse) | integration | Select psalm, navigate, verify save |
| ExamenReflection saves session on Finish | integration | Navigate steps, verify save |
| Duration is at least 1 minute | unit | Even if elapsed < 30s, duration = 1 |
| Weekly context text shows "great start" for first session | unit | Mock empty history |

**Expected state after completion:**
- [ ] All 4 untimed exercises save a `MeditationSession` with calculated duration
- [ ] All 6 exercises show "You meditated for X minutes" on completion
- [ ] All 6 exercises show weekly total context below duration
- [ ] Start time tracking uses ref, not persisted
- [ ] Tests pass

---

### Step 4: Dashboard Hero Meditation Stat

**Objective:** Add "X min this week" meditation stat to the DashboardHero alongside streak and level.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx` — add meditation minutes stat
- `frontend/src/pages/Dashboard.tsx` — pass meditation minutes prop

**Details:**

In `DashboardHero.tsx`:
1. Import `Wind` from `lucide-react`
2. Add prop: `meditationMinutesThisWeek?: number` (default `0`)
3. After the streak display div (lines 100-110), add the meditation stat:
   ```tsx
   <div className="flex items-center gap-2">
     <Wind
       className="h-5 w-5 text-white/60"
       aria-hidden="true"
     />
     <span className="text-sm text-white/60">
       {meditationMinutesThisWeek} min this week
     </span>
   </div>
   ```
4. The new stat sits between the streak display and the level/points display in the flex container (line 99).

In `Dashboard.tsx`:
1. Import `getMeditationMinutesForWeek` from `@/services/meditation-storage`
2. Compute: `const meditationMinutesThisWeek = getMeditationMinutesForWeek()`
3. Pass to `<DashboardHero meditationMinutesThisWeek={meditationMinutesThisWeek} />`
4. To ensure the stat updates after completing a meditation (without page refresh), listen to the `'storage'` event or use a state value that re-reads after navigation. Since the user returns to the dashboard via navigation (React Router), the component re-mounts and re-reads localStorage — so this should work automatically.

**Responsive behavior:**
- Desktop (1024px+): `md:flex-row` — three stats in a horizontal row with `md:gap-6`
- Tablet (640-1024px): Same horizontal row
- Mobile (< 640px): `flex-col` — stats stack vertically with `gap-3`

**Guardrails (DO NOT):**
- DO NOT change the existing streak or level/points display
- DO NOT add a separate API call — read from localStorage directly
- DO NOT hide the stat when 0 — always show "0 min this week"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DashboardHero renders meditation stat | unit | Render with prop, verify "X min this week" text |
| DashboardHero shows 0 when no sessions | unit | Render with 0, verify "0 min this week" |
| DashboardHero renders Wind icon | unit | Verify Lucide Wind icon present |
| Dashboard passes meditation minutes to hero | integration | Mock localStorage, verify prop passing |

**Expected state after completion:**
- [ ] DashboardHero shows Wind icon + "X min this week" alongside streak and level
- [ ] Stat shows "0 min this week" when no sessions exist
- [ ] Layout is responsive (stacks on mobile, row on desktop)
- [ ] Tests pass

---

### Step 5: Insights Page — Meditation History Section

**Objective:** Add the Meditation History section to the `/insights` page with summary cards, stacked bar chart, and "Most Practiced" callout.

**Files to create/modify:**
- `frontend/src/components/insights/MeditationHistory.tsx` — new component
- `frontend/src/pages/Insights.tsx` — add section to page
- `frontend/src/components/insights/__tests__/MeditationHistory.test.tsx` — new test file

**Details:**

**`MeditationHistory.tsx`** — a self-contained section component:

Props:
```typescript
interface MeditationHistoryProps {
  rangeDays: number
}
```

Constants (within the file):
```typescript
const MEDITATION_TYPE_COLORS: Record<MeditationType, string> = {
  breathing: '#06B6D4', // cyan-500
  soaking: '#A855F7',   // purple-500
  gratitude: '#EC4899', // pink-500
  acts: '#F59E0B',      // amber-500
  psalm: '#22C55E',     // green-500
  examen: '#3B82F6',    // blue-500
}

const MEDITATION_TYPE_LABELS: Record<MeditationType, string> = {
  breathing: 'Breathing',
  soaking: 'Soaking',
  gratitude: 'Gratitude',
  acts: 'ACTS',
  psalm: 'Psalms',
  examen: 'Examen',
}
```

Data computation:
1. Read all entries: `getMeditationHistory()`
2. Filter to range: `getMeditationMinutesForRange(rangeStartDate, todayDate)`
3. Compute summary stats:
   - "This Week": `getMeditationMinutesForWeek()`
   - "This Month": sum entries where `date` is in current calendar month
   - "All Time": sum all entries + count
4. Compute bar chart data: Group entries by date, then by type. Each date becomes a data point with keys for each meditation type's minutes.
5. Compute most practiced: `getMostPracticedType(rangeEntries)`

Summary Row — 3 stat cards:
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  {/* Each card */}
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
    <p className="text-xs uppercase tracking-wider text-white/40">This Week</p>
    <p className="mt-1 text-xl font-semibold text-white">{thisWeekMinutes} min</p>
  </div>
  {/* ... This Month, All Time */}
</div>
```
"All Time" card value: `{allTimeMinutes} min ({allTimeSessions} session{allTimeSessions !== 1 ? 's' : ''})`

Bar Chart — Recharts `<BarChart>`:
```tsx
<div className="mt-4" style={{ height: chartHeight }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
      <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
      <XAxis
        dataKey="date"
        tickFormatter={(d) => formatChartDate(d, rangeDays)}
        tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        interval={tickInterval}
      />
      <YAxis
        tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={isMobile ? 30 : 40}
        label={isMobile ? undefined : { value: 'min', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
      />
      <Tooltip content={<MeditationTooltip />} />
      {typesWithData.map((type) => (
        <Bar
          key={type}
          dataKey={type}
          stackId="meditation"
          fill={MEDITATION_TYPE_COLORS[type]}
          isAnimationActive={false}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
</div>
```

Chart height: Use `useState` + `matchMedia` for responsive height:
- Mobile (< 640px): 200px
- Tablet (640-1024px): 220px
- Desktop (> 1024px): 250px

X-axis tick interval: `Math.max(1, Math.floor(rangeDays / 6))` (matches MoodTrendChart pattern)

Legend — below the chart:
```tsx
<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
  {typesWithData.map((type) => (
    <div key={type} className="flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MEDITATION_TYPE_COLORS[type] }} />
      <span className="text-xs text-white/60">{MEDITATION_TYPE_LABELS[type]}</span>
    </div>
  ))}
</div>
```

Custom Tooltip:
```tsx
function MeditationTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{formatTooltipDate(label)}</p>
      {payload.filter(p => (p.value ?? 0) > 0).map((p) => (
        <p key={p.dataKey} className="text-white/70">
          <span style={{ color: p.color }}>{MEDITATION_TYPE_LABELS[p.dataKey as MeditationType]}</span>: {p.value} min
        </p>
      ))}
    </div>
  )
}
```

Most Practiced Callout (below bar chart, within the same card):
```tsx
{mostPracticed && (
  <p className="mt-4 text-sm text-white/60">
    <span style={{ color: MEDITATION_TYPE_COLORS[mostPracticed.type] }} className="font-medium">
      {MEDITATION_TYPE_LABELS[mostPracticed.type]}
    </span>{' '}
    is your most practiced meditation ({mostPracticed.percentage}% of sessions)
  </p>
)}
```

Empty State (when no meditation data for the range):
```tsx
<div className="relative">
  <div className="opacity-[0.15]" aria-hidden="true">
    {/* Ghosted bar chart with fake data */}
  </div>
  <div className="absolute inset-0 flex items-center justify-center">
    <p className="text-sm text-white/50">
      Start a meditation to see your history here
    </p>
  </div>
</div>
```

Section container:
```tsx
<section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
         aria-label="Meditation history">
  <h2 className="text-lg font-semibold text-white md:text-xl">Meditation History</h2>
  {/* Summary cards, chart, legend, most practiced */}
</section>
```

**In `Insights.tsx`:**
1. Import `MeditationHistory` from `@/components/insights/MeditationHistory`
2. Add after the `ScriptureConnections` section (around line 263), before the "View Monthly Report" link:
   ```tsx
   <AnimatedSection index={entries.length > 0 ? 5 : 4}>
     <MeditationHistory rangeDays={rangeDays} />
   </AnimatedSection>
   ```
3. Bump the "View Monthly Report" AnimatedSection index by 1

**Responsive behavior:**
- Desktop (> 1024px): Summary cards in 3-column grid, chart 250px, full legend
- Tablet (640-1024px): Summary cards in 3-column grid, chart 220px
- Mobile (< 640px): Summary cards stacked (single column), chart 200px, legend wraps

**Guardrails (DO NOT):**
- DO NOT create a separate time range control for this section — it reads the same `rangeDays` prop from the parent
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT use `recharts` animations (`isAnimationActive={false}`)
- DO NOT render legend items for types that have no data in the range
- DO NOT show Most Practiced callout when no data exists

**Accessibility:**
- Section has `aria-label="Meditation history"`
- Bar chart container div has `aria-label="Meditation minutes by day"`
- Summary cards have readable text contrast (WCAG AA verified — white on dark bg with backdrop-blur)
- `prefers-reduced-motion`: `animate-fade-in` already has `motion-reduce:animate-none` via `AnimatedSection`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders section title "Meditation History" | unit | Verify heading |
| Renders 3 summary cards | unit | Verify "This Week", "This Month", "All Time" labels |
| Summary cards show correct values | unit | Mock storage, verify computed values |
| Renders bar chart when data exists | unit | Verify ResponsiveContainer renders |
| Shows empty state when no data | unit | Empty localStorage, verify empty state message |
| Legend shows only types with data | unit | Mock data with 2 types, verify 2 legend items |
| Most Practiced callout shows correct type | unit | Mock data with dominant type |
| Most Practiced callout hidden when no data | unit | Empty data |
| Section has aria-label | unit | Verify `aria-label="Meditation history"` |
| Updates when rangeDays changes | unit | Re-render with different rangeDays, verify data changes |

**Expected state after completion:**
- [ ] Meditation History section appears on the `/insights` page
- [ ] Summary cards show This Week, This Month, All Time stats
- [ ] Stacked bar chart renders with per-type colors
- [ ] Legend shows only types with data
- [ ] Most Practiced callout shows dominant type with percentage
- [ ] Empty state with ghosted chart when no data
- [ ] Section respects time range pills
- [ ] Responsive layout (3-col → stacked on mobile)
- [ ] Tests pass (10+ tests)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Type + storage service + tests |
| 2 | 1 | Timed exercise integration (Breathing, Soaking) |
| 3 | 1 | Untimed exercise integration (Gratitude, ACTS, Psalms, Examen) |
| 4 | 1 | Dashboard Hero meditation stat |
| 5 | 1 | Insights page Meditation History section |

Steps 2, 3, 4, and 5 all depend on Step 1 but are independent of each other.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Type & Storage Service | [COMPLETE] | 2026-03-20 | Created `types/meditation.ts`, `services/meditation-storage.ts`, `services/__tests__/meditation-storage.test.ts` (16 tests, all pass) |
| 2 | Timed Exercise Integration | [COMPLETE] | 2026-03-20 | Modified `BreathingExercise.tsx` and `ScriptureSoaking.tsx` — added saveMeditationSession + duration display on completion screen |
| 3 | Untimed Exercise Integration | [COMPLETE] | 2026-03-20 | Modified `GratitudeReflection.tsx`, `ActsPrayerWalk.tsx`, `PsalmReading.tsx`, `ExamenReflection.tsx` — added startTimeRef + saveMeditationSession + duration display. PsalmReading sets startTimeRef on reading screen transition, not mount. |
| 4 | Dashboard Hero Stat | [COMPLETE] | 2026-03-20 | Modified `DashboardHero.tsx` (added Wind icon + meditation stat), `Dashboard.tsx` (passes `meditationMinutesThisWeek` prop). All tests pass. |
| 5 | Insights Meditation History | [COMPLETE] | 2026-03-20 | Created `MeditationHistory.tsx` (summary cards, stacked bar chart, legend, most practiced callout, empty state). Added to `Insights.tsx` after ScriptureConnections. Created `MeditationHistory.test.tsx` (10 tests). Updated Insights.test.tsx AnimatedSection count (5→6). |
