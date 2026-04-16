# Implementation Plan: Evening Reflection Prompt

**Spec:** `_specs/evening-reflection-prompt.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/evening-reflection-prompt`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (referenced — shared data models from Spec 1 and Spec 5 are used)

---

## Architecture Context

### Project Structure
- **Dashboard page:** `frontend/src/pages/Dashboard.tsx` — renders DashboardHero, WeeklyGodMoments, GettingStartedCard, DashboardWidgetGrid in sequence
- **Dashboard components:** `frontend/src/components/dashboard/` — MoodCheckIn.tsx, DashboardHero.tsx, DashboardWidgetGrid.tsx, ActivityChecklist.tsx, GratitudeWidget.tsx, MoodChart.tsx, etc.
- **Insights page:** `frontend/src/pages/Insights.tsx` — MoodTrendChart, CalendarHeatmap, InsightCards, etc.
- **Insights components:** `frontend/src/components/insights/` — MoodTrendChart.tsx, InsightCards.tsx
- **Types:** `frontend/src/types/dashboard.ts` — MoodEntry, ActivityType, DailyActivities
- **Constants:** `frontend/src/constants/dashboard/activity-points.ts` — ACTIVITY_POINTS, ALL_ACTIVITY_TYPES, etc.
- **Services:** `frontend/src/services/mood-storage.ts`, `gratitude-storage.ts`, `faith-points-storage.ts`
- **Hooks:** `frontend/src/hooks/useFaithPoints.ts`, `useMoodChartData.ts`
- **Date utils:** `frontend/src/utils/date.ts` — `getLocalDateString()`

### Existing Patterns

**Full-screen overlay pattern (MoodCheckIn.tsx lines 124-309):**
- `role="dialog"` with `aria-labelledby`
- `fixed inset-0 z-50 flex items-center justify-center`
- Dark radial gradient: `bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]`
- Max width: `max-w-[640px]` with `px-4`
- Mood orbs: 5 buttons in `role="radiogroup"` with keyboard nav (arrow keys), sizes `h-14 w-14 sm:h-[60px] sm:w-[60px] lg:h-16 lg:w-16`

**Mood orb interaction pattern (MoodCheckIn.tsx lines 148-193):**
- `role="radio"` with `aria-checked`, `aria-label`
- `tabIndex={focusedIndex === index ? 0 : -1}` for roving tabindex
- Selected: `scale-[1.15]`, unselected with selection: `opacity-30`
- Color orbs: `backgroundColor: isSelected ? mood.color : \`${mood.color}33\``
- Glow on selected: `boxShadow: \`0 0 20px ${mood.color}, 0 0 40px ${mood.color}66\``
- Idle pulse: `motion-safe:animate-mood-pulse`

**Dashboard layout order (Dashboard.tsx lines 167-229):**
1. DashboardHero
2. WeeklyGodMoments (conditional)
3. GettingStartedCard (conditional)
4. DashboardWidgetGrid

**KaraokeTextReveal usage (daily/KaraokeTextReveal.tsx):**
- Props: `text`, `revealDuration?`, `msPerWord?`, `onRevealComplete?`, `forceComplete?`, `className?`
- Used in MoodCheckIn: `<KaraokeTextReveal text={verse} revealDuration={2500} onRevealComplete={cb} className="inline" />`

**Activity system pattern (activity-points.ts):**
- `ActivityType` union: `'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude'`
- `ACTIVITY_POINTS` record, `ALL_ACTIVITY_TYPES` array, `ACTIVITY_DISPLAY_NAMES`, `ACTIVITY_CHECKLIST_NAMES`
- `MAX_DAILY_BASE_POINTS = 105`, `MAX_DAILY_POINTS = 210`
- `MULTIPLIER_TIERS`: [7→2x, 4→1.5x, 2→1.25x, 0→1x]

**ActivityChecklist pattern (ActivityChecklist.tsx):**
- `BASE_ACTIVITY_ORDER` array defines display order
- Optional readingPlan inserted at index 4 if active
- Each item: icon + name + "+N pts" text
- Progress ring SVG with animated stroke-dashoffset

**GratitudeWidget pattern (GratitudeWidget.tsx):**
- 3 text inputs with numbered hearts, max 150 chars
- `getTodayGratitude()` checks for existing entry
- `saveGratitudeEntry(items)` writes to `wr_gratitude_entries`
- Crisis detection via `containsCrisisKeyword(combinedText)`
- `onGratitudeSaved?.()` callback for activity recording

**CrisisBanner usage:**
- Import: `import { CrisisBanner } from '@/components/daily/CrisisBanner'`
- `import { containsCrisisKeyword } from '@/constants/crisis-resources'`
- Pattern: `{showCrisis && <CrisisBanner text={text} />}`

**MoodEntry type (types/dashboard.ts lines 4-12):**
```typescript
export interface MoodEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}
```

**Test patterns:**
- Vitest + React Testing Library
- Provider wrapping: `AuthContext`, `ToastProvider`, `MemoryRouter`
- Common patterns: `render()`, `screen.getByRole()`, `screen.getByText()`, `userEvent`
- File naming: `ComponentName.test.tsx` alongside component

### Auth Gating

The entire dashboard is auth-gated — logged-out users see the landing page at `/`. The evening reflection banner and overlay are only rendered within the dashboard, so they inherit the dashboard's auth gate. No additional auth checks needed for individual elements within the reflection flow.

### Cross-Spec Dependencies

- **Spec 1 (Mood Check-In):** Owns `MoodEntry` type, `saveMoodEntry()`, `hasCheckedInToday()`, morning check-in UI
- **Spec 5 (Streak & Faith Points):** Owns `useFaithPoints()`, `recordActivity()`, `ActivityType`, activity constants
- **Spec 27 (Gratitude Dashboard Widget):** Owns `wr_gratitude_entries`, `GratitudeEntry`, gratitude input pattern
- **Spec 10 (KaraokeText):** Owns `KaraokeTextReveal` component

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| See evening reflection banner | Dashboard is auth-gated (logged-out = landing page) | Step 3 | Inherited — dashboard only renders when `isAuthenticated` |
| Click "Reflect Now" | Auth-gated by dashboard | Step 3 | Inherited |
| Select mood orb | Auth-gated by dashboard | Step 4 | Inherited |
| Enter text (Step 2) | Auth-gated by dashboard | Step 4 | Inherited |
| Enter gratitude (Step 3) | Auth-gated by dashboard | Step 4 | Inherited |
| Complete reflection (faith points) | Auth-gated by dashboard | Step 4 | Inherited via `useFaithPoints` (no-ops when unauth) |

All actions are within the dashboard, which is entirely auth-gated. No additional auth modal logic needed.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Overlay background | background | `radial-gradient(ellipse at 50% 30%, rgb(59,7,100) 0%, transparent 60%), linear-gradient(rgb(13,6,32) 0%, rgb(30,11,62) 50%, rgb(13,6,32) 100%)` | MoodCheckIn.tsx line 128 |
| Overlay max-width | max-width | 640px | MoodCheckIn.tsx line 130 |
| Overlay container | classes | `fixed inset-0 z-50 flex items-center justify-center` | MoodCheckIn.tsx line 126-128 |
| Banner background | background | `bg-indigo-900/30` | Spec |
| Banner border | border | `border border-indigo-400/20` | Spec |
| Banner radius | border-radius | `rounded-2xl` | Spec |
| Banner padding | padding | `p-4 md:p-6` | Spec |
| Primary CTA button | classes | `rounded-lg bg-primary py-3 px-8 font-semibold text-white` | design-system.md |
| Dismiss link | classes | `text-white/40 text-sm hover:text-white/60` | Spec |
| Mood orb sizes | dimensions | `h-14 w-14 sm:h-[60px] sm:w-[60px] lg:h-16 lg:w-16` | MoodCheckIn.tsx line 172 |
| Mood orb colors | background | Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399 | mood.ts |
| Serif heading | font | `font-serif text-2xl md:text-3xl text-white/90` | MoodCheckIn.tsx line 136 |
| Prayer typography | font | `font-serif italic text-lg md:text-xl text-white/90` | Spec |
| Textarea (dark bg) | classes | `rounded-xl border border-white/15 bg-white/5 p-4 text-white placeholder:text-white/40` | MoodCheckIn.tsx line 209 |
| Gratitude input (dark bg) | classes | `h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30` | GratitudeWidget.tsx line 148 |
| Dashboard card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md |
| Step dots — active | classes | `bg-white h-2 w-2 rounded-full` | Spec |
| Step dots — inactive | classes | `border border-white/30 h-2 w-2 rounded-full` | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat for script/highlighted headings, not Lora — but this feature uses Lora (`font-serif`) for prayer/verse typography, matching the morning check-in pattern
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- The overlay dark gradient is NOT the hero gradient — it's the mood check-in gradient (radial ellipse, not full-page hero)
- All textareas/inputs on dark backgrounds use `bg-white/5 border-white/10-15` pattern, NOT the cyan glow pattern (which is for light backgrounds)
- KaraokeTextReveal uses `revealDuration={2500}` as the standard
- `containsCrisisKeyword()` from `@/constants/crisis-resources` is the crisis check function
- Dashboard entrance animations use `motion-safe:animate-widget-enter` with staggered `animationDelay`
- `getLocalDateString()` must be used for all date comparisons — NEVER `new Date().toISOString().split('T')[0]`

---

## Shared Data Models (from Master Plan)

```typescript
// Existing — types/dashboard.ts
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
  // NEW: timeOfDay field
  timeOfDay?: 'morning' | 'evening';
}

export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude' | 'reflection';

export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  readingPlan: boolean;
  gratitude: boolean;
  reflection: boolean;  // NEW
  pointsEarned: number;
  multiplier: number;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Both | Reads morning entry; writes evening entry with `timeOfDay: 'evening'` |
| `wr_evening_reflection` | Both | Stores today's date string when dismissed or completed |
| `wr_daily_activities` | Both | Read for trigger check (any activity today?), written via `recordActivity('reflection')` |
| `wr_gratitude_entries` | Both | Read for Step 3 existing check; written if new gratitude entered |
| `wr_faith_points` | Write (via useFaithPoints) | Updated when `recordActivity('reflection')` awards points |
| `wr_streak` | Write (via useFaithPoints) | Updated when reflection counts as daily activity |

---

## Responsive Structure

**Breakpoints and layout behavior for `/execute-plan` and `/verify-with-playwright`:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Banner stacked (text above, button below, full-width button). Overlay full viewport with `px-4`. Mood orbs 56px in 2 rows. Step 4 buttons stacked vertically full width. |
| Tablet | 640–1024px | Banner horizontal (text left, button right). Overlay max-w-[600px] centered. Mood orbs 60px single row. Step 4 buttons side by side. |
| Desktop | > 1024px | Same horizontal banner within dashboard content width. Overlay max-w-[640px]. Mood orbs 64px with generous spacing. Focus rings visible on all elements. |

---

## Vertical Rhythm

**Expected spacing between adjacent sections:**

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DashboardHero → banner | `pb-4 md:pb-6` from wrapper div (matches GodMoments spacing) | Dashboard.tsx line 197 |
| Banner → widget grid | Same wrapper padding pattern | Dashboard.tsx line 208 |
| Overlay step content | Centered vertically with `px-4` padding | MoodCheckIn.tsx line 130 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] The dashboard is fully built and functional (Phase 2.75 complete)
- [x] `useFaithPoints` hook exists with `recordActivity()` function
- [x] `KaraokeTextReveal` component exists and is importable from `@/components/daily/KaraokeTextReveal`
- [x] `GratitudeWidget` pattern exists for reusing gratitude input logic
- [x] `CrisisBanner` and `containsCrisisKeyword` are available
- [x] All auth-gated actions from the spec are accounted for in the plan (inherited from dashboard auth gate)
- [x] Design system values are verified (from MoodCheckIn.tsx codebase inspection + design-system.md recon)
- [ ] No [UNVERIFIED] values requiring special attention
- [ ] Prior specs in the sequence are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Evening mood entry written when? | Finalized and written to localStorage only when Step 4 is fully completed (not during Step 1 selection) | Prevents partial entries if user closes early |
| Date captured when? | On "Reflect Now" click, not at each step | Prevents midnight rollover issues during multi-step flow |
| Midnight rollover in hasCheckedInToday? | `hasCheckedInToday()` returns true if ANY entry (morning or evening) matches today | Backwards compatible; existing behavior unchanged |
| Gratitude in Step 3 vs widget race | Re-check `getTodayGratitude()` on Step 3 mount | Handles race condition if user fills gratitude widget between banner click and reaching Step 3 |
| Step 3 gratitude saves via widget or inline? | Inline — reuse gratitude storage functions directly, not the GratitudeWidget component | Widget has its own state management that doesn't fit the overlay flow |
| Goodnight button style | Use `bg-indigo-600 hover:bg-indigo-500` for evening theme consistency | Spec suggests softer indigo; doesn't conflict with design system since it's an overlay-only element |
| `hasCheckedInToday` update | Add `timeOfDay` parameter: `hasCheckedInToday(timeOfDay?: 'morning' | 'evening')` | Need to distinguish morning vs evening check-ins; backward compatible (no arg = any entry) |
| Activity checklist item visibility | "Evening reflection" item only shown after 6 PM via `new Date().getHours() >= 18` check | Per spec — prevents confusion about unavailable activity |
| MULTIPLIER_TIERS thresholds | Keep at 7 activities for 2x (not changing to 8/9) | With 9 activities total, it's slightly easier to reach 2x but still requires majority; changing thresholds would be a breaking change |

---

## Implementation Steps

### Step 1: Extend Data Models & Activity Constants

**Objective:** Add `'reflection'` to the activity type system and `timeOfDay` to MoodEntry. This is the foundation all other steps depend on.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — add `timeOfDay` to MoodEntry, add `'reflection'` to ActivityType, add `reflection: boolean` to DailyActivities
- `frontend/src/constants/dashboard/activity-points.ts` — add reflection to all constant maps, update MAX_DAILY_BASE_POINTS and MAX_DAILY_POINTS

**Details:**

1. In `types/dashboard.ts`:
   - Add `timeOfDay?: 'morning' | 'evening'` to `MoodEntry` interface (optional for backwards compat)
   - Add `| 'reflection'` to `ActivityType` union
   - Add `reflection: boolean` to `DailyActivities` interface
   - Add `reflection: number` to `ActivityCounts` interface (for badge engine)

2. In `constants/dashboard/activity-points.ts`:
   - Add `reflection: 10` to `ACTIVITY_POINTS`
   - Add `reflection: 'Evening reflection'` to `ACTIVITY_DISPLAY_NAMES`
   - Add `reflection: 'Evening reflection'` to `ACTIVITY_CHECKLIST_NAMES`
   - Add `'reflection'` to `ALL_ACTIVITY_TYPES` array (at end)
   - Update `MAX_DAILY_BASE_POINTS` from 105 to 115 (105 + 10)
   - Update `MAX_DAILY_POINTS` from 210 to 230 (115 × 2)

3. In `services/faith-points-storage.ts`:
   - Update `freshDailyActivities()` to include `reflection: false`

4. In `services/mood-storage.ts`:
   - Update `hasCheckedInToday()` to accept optional `timeOfDay` filter:
     ```typescript
     export function hasCheckedInToday(timeOfDay?: 'morning' | 'evening'): boolean {
       const today = getLocalDateString();
       const entries = getMoodEntries();
       return entries.some((e) => e.date === today && (!timeOfDay || (e.timeOfDay ?? 'morning') === timeOfDay));
     }
     ```
   - This is backwards compatible: calling without args returns true for any entry today

5. In `components/dashboard/MoodCheckIn.tsx`:
   - Update the `handleContinue` callback to set `timeOfDay: 'morning'` on the created MoodEntry

**Guardrails (DO NOT):**
- Do NOT change existing MULTIPLIER_TIERS thresholds (keep 7 for 2x)
- Do NOT remove any existing activity types
- Do NOT break backwards compatibility for MoodEntry (timeOfDay is optional)
- Do NOT change existing `hasCheckedInToday()` behavior when called without arguments

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `reflection` in `ACTIVITY_POINTS` | unit | Verify `ACTIVITY_POINTS.reflection === 10` |
| `reflection` in `ALL_ACTIVITY_TYPES` | unit | Verify `ALL_ACTIVITY_TYPES.includes('reflection')` |
| `MAX_DAILY_BASE_POINTS` updated | unit | Verify equals 115 |
| `MAX_DAILY_POINTS` updated | unit | Verify equals 230 |
| `MoodEntry` accepts `timeOfDay` | unit | Verify TypeScript compilation with `timeOfDay: 'evening'` |
| `hasCheckedInToday` no args | unit | Returns true if any entry exists for today (backward compat) |
| `hasCheckedInToday('morning')` | unit | Returns true only for morning entries |
| `hasCheckedInToday('evening')` | unit | Returns true only for evening entries |
| `hasCheckedInToday` missing `timeOfDay` | unit | Entry without `timeOfDay` treated as morning |
| `freshDailyActivities` includes `reflection` | unit | Verify `reflection: false` in returned object |
| Morning check-in sets `timeOfDay: 'morning'` | integration | Verify MoodCheckIn creates entry with `timeOfDay: 'morning'` |

**Expected state after completion:**
- [ ] `ActivityType` includes `'reflection'`
- [ ] `MoodEntry` has optional `timeOfDay` field
- [ ] All activity constant maps include `reflection`
- [ ] Points calculations account for the new activity
- [ ] Existing tests still pass (no breaking changes)

---

### Step 2: Evening Reflection Constants & Storage

**Objective:** Create the constants file with prayers, verses, and the localStorage service for evening reflection state.

**Files to create/modify:**
- `frontend/src/constants/dashboard/evening-reflection.ts` — NEW: prayers, verses, localStorage key
- `frontend/src/services/evening-reflection-storage.ts` — NEW: dismiss/complete state management

**Details:**

1. Create `constants/dashboard/evening-reflection.ts`:

```typescript
export const EVENING_REFLECTION_STORAGE_KEY = 'wr_evening_reflection';
export const EVENING_HOUR_THRESHOLD = 18; // 6 PM

export interface EveningPrayer {
  dayOfWeek: number;  // 0=Sunday ... 6=Saturday
  text: string;
}

export interface EveningVerse {
  dayOfWeek: number;
  text: string;
  reference: string;
}

export const EVENING_PRAYERS: EveningPrayer[] = [
  { dayOfWeek: 0, text: 'May the peace of this Lord\'s day stay with you through the night. You have worshipped, you have rested, and God is pleased with your faithfulness. Sleep now in the shelter of His love.' },
  { dayOfWeek: 1, text: 'As this new week begins, release every worry into God\'s hands. He has already gone before you into tomorrow. Tonight, simply rest — you have done enough for today.' },
  { dayOfWeek: 2, text: 'You have carried much today, and God sees every effort. Lay your burdens down at the foot of the cross. His strength will be renewed in you by morning.' },
  { dayOfWeek: 3, text: 'Halfway through the week, pause and breathe. God\'s mercies are new every morning, and tonight His peace guards your heart. You are held, you are known, you are loved.' },
  { dayOfWeek: 4, text: 'Thank you for showing up today — for every prayer whispered, every kindness given, every moment you chose faith over fear. Rest well in the arms of your Father.' },
  { dayOfWeek: 5, text: 'The week is nearly done, and you have persevered. Let gratitude fill your heart as you reflect on God\'s faithfulness. He who began a good work in you will carry it to completion.' },
  { dayOfWeek: 6, text: 'As this day of rest draws to a close, let stillness wash over you. God delights in you — not for what you have done, but for who you are. Sleep deeply, beloved.' },
];

export const EVENING_VERSES: EveningVerse[] = [
  { dayOfWeek: 0, text: 'You will keep whoever\'s mind is steadfast in perfect peace, because he trusts in you.', reference: 'Isaiah 26:3' },
  { dayOfWeek: 1, text: 'In peace I will both lay myself down and sleep, for you alone, Lord, make me live in safety.', reference: 'Psalm 4:8' },
  { dayOfWeek: 2, text: 'He who keeps you will not slumber.', reference: 'Psalm 121:3' },
  { dayOfWeek: 3, text: 'When you lie down, you will not be afraid. Yes, you will lie down, and your sleep will be sweet.', reference: 'Proverbs 3:24' },
  { dayOfWeek: 4, text: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty.', reference: 'Psalm 91:1' },
  { dayOfWeek: 5, text: 'On my bed I remember you. I think about you in the watches of the night.', reference: 'Psalm 63:6' },
  { dayOfWeek: 6, text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.', reference: 'Matthew 11:28' },
];

export function getEveningPrayer(): EveningPrayer {
  const day = new Date().getDay();
  return EVENING_PRAYERS[day];
}

export function getEveningVerse(): EveningVerse {
  const day = new Date().getDay();
  return EVENING_VERSES[day];
}
```

2. Create `services/evening-reflection-storage.ts`:

```typescript
import { getLocalDateString } from '@/utils/date';
import { EVENING_REFLECTION_STORAGE_KEY, EVENING_HOUR_THRESHOLD } from '@/constants/dashboard/evening-reflection';

export function hasReflectedToday(): boolean {
  const stored = localStorage.getItem(EVENING_REFLECTION_STORAGE_KEY);
  return stored === getLocalDateString();
}

export function markReflectionDone(): void {
  localStorage.setItem(EVENING_REFLECTION_STORAGE_KEY, getLocalDateString());
}

export function isEveningTime(): boolean {
  return new Date().getHours() >= EVENING_HOUR_THRESHOLD;
}

export function hasAnyActivityToday(dailyActivities: Record<string, boolean>): boolean {
  return Object.entries(dailyActivities)
    .filter(([key]) => key !== 'pointsEarned' && key !== 'multiplier')
    .some(([_, value]) => value === true);
}
```

**Guardrails (DO NOT):**
- Do NOT use UTC dates — always `getLocalDateString()`
- Do NOT make prayer/verse content AI-generated — these are hardcoded constants
- Do NOT store anything beyond the date string in `wr_evening_reflection`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getEveningPrayer` returns correct prayer for each day | unit | Verify all 7 prayers match by dayOfWeek |
| `getEveningVerse` returns correct verse for each day | unit | Verify all 7 verses match by dayOfWeek |
| `hasReflectedToday` returns false when no data | unit | Empty localStorage returns false |
| `hasReflectedToday` returns true when today's date stored | unit | Store today's date, verify true |
| `hasReflectedToday` returns false for yesterday's date | unit | Store yesterday's date, verify false |
| `markReflectionDone` stores today's date | unit | Call and verify localStorage value |
| `isEveningTime` returns true at 18:00+ | unit | Mock Date to 18:00, verify true |
| `isEveningTime` returns false at 17:59 | unit | Mock Date to 17:59, verify false |
| `hasAnyActivityToday` returns true with one activity | unit | Pass `{ mood: true, pray: false, ... }`, verify true |
| `hasAnyActivityToday` returns false with none | unit | Pass `{ mood: false, pray: false, ... }`, verify false |
| `hasAnyActivityToday` ignores non-activity keys | unit | Verify `pointsEarned` and `multiplier` are not checked |

**Expected state after completion:**
- [ ] Evening prayers and verses are defined as constants
- [ ] Storage service handles dismiss/complete state
- [ ] Time-of-day check utility exists
- [ ] All 7 prayers and 7 verses from the spec are included verbatim

---

### Step 3: Evening Reflection Banner Component

**Objective:** Build the dashboard banner that appears after 6 PM when conditions are met. Integrate it into the Dashboard page between GettingStartedCard and DashboardWidgetGrid.

**Files to create/modify:**
- `frontend/src/components/dashboard/EveningReflectionBanner.tsx` — NEW: the banner component
- `frontend/src/pages/Dashboard.tsx` — integrate banner in the layout

**Details:**

1. Create `EveningReflectionBanner.tsx`:

```typescript
interface EveningReflectionBannerProps {
  onReflectNow: () => void;
  onDismiss: () => void;
  animate?: boolean;
}
```

- Uses Lucide `Moon` icon in `text-indigo-300`
- Banner container: `bg-indigo-900/30 border border-indigo-400/20 rounded-2xl p-4 md:p-6`
- Heading: "Evening Reflection" in `text-white font-semibold text-lg`
- Subheading: "Take a moment to close your day with God." in `text-white/70 text-sm`
- "Reflect Now" button: `rounded-lg bg-primary py-3 px-8 font-semibold text-white`
- "Not tonight" link: `text-white/40 text-sm hover:text-white/60`, NOT a button (use `<button>` with link styling per a11y)
- Mobile: stacked layout (Moon + text above, button + dismiss below, button full width)
- Desktop: horizontal (Moon + text left, button right, dismiss below button)
- Entrance animation: `motion-safe:animate-widget-enter` (matching dashboard stagger pattern)

2. Integrate into `Dashboard.tsx`:

- Import `EveningReflectionBanner`, `isEveningTime`, `hasReflectedToday`, `markReflectionDone`, `hasAnyActivityToday`
- Add state: `showReflectionOverlay` (boolean), `showEveningBanner` (computed)
- Compute banner visibility: `isAuthenticated && isEveningTime() && !hasReflectedToday() && hasAnyActivityToday(faithPoints.todayActivities)`
- Check on component mount only (not reactively)
- Render banner between GettingStartedCard and DashboardWidgetGrid, with same wrapper pattern:
  ```tsx
  {showEveningBanner && (
    <div className={cn('mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6', shouldAnimate && 'motion-safe:animate-widget-enter')}
      style={shouldAnimate ? { animationDelay: computedDelay } : undefined}>
      <EveningReflectionBanner
        onReflectNow={() => setShowReflectionOverlay(true)}
        onDismiss={handleDismissReflection}
      />
    </div>
  )}
  ```
- `handleDismissReflection`: call `markReflectionDone()`, set banner state to hidden
- Update `staggerStartIndex` for DashboardWidgetGrid to account for the banner if visible

**Responsive behavior:**
- Mobile (< 640px): Full width, `flex-col` layout. Moon + heading + subheading stacked. Button `w-full`. "Not tonight" centered below.
- Tablet (640px+): `flex-row items-center`. Moon + text on left (`flex-1`), button on right. "Not tonight" below button.
- Desktop (1024px+): Same as tablet, within `max-w-6xl` container.

**Guardrails (DO NOT):**
- Do NOT use `useEffect` with interval to re-check time — check once on mount
- Do NOT show the banner to logged-out users (already prevented by dashboard auth gate)
- Do NOT make "Not tonight" a `<a>` tag — use `<button>` for accessibility
- Do NOT animate if `prefers-reduced-motion` is set

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Banner renders with correct text | unit | Verify "Evening Reflection" heading, subheading, button text |
| Banner calls `onReflectNow` on button click | unit | Click "Reflect Now", verify callback |
| Banner calls `onDismiss` on "Not tonight" click | unit | Click "Not tonight", verify callback |
| Banner has Moon icon | unit | Verify Lucide Moon icon renders |
| Banner has correct a11y | unit | Verify focus rings, min touch targets |
| Dashboard shows banner after 6 PM with activity | integration | Mock time to 19:00, mock activity, verify banner visible |
| Dashboard hides banner before 6 PM | integration | Mock time to 15:00, verify banner not visible |
| Dashboard hides banner when no activities | integration | Mock time to 19:00, no activities, verify hidden |
| Dashboard hides banner when already dismissed | integration | Mock time to 19:00, mark dismissed, verify hidden |
| Dashboard hides banner when already completed | integration | Mock time to 19:00, mark completed, verify hidden |
| Dismiss stores today's date | integration | Click "Not tonight", verify `wr_evening_reflection` |
| Stagger index adjusts for banner | integration | With banner visible, verify widget grid staggerStartIndex increases |

**Expected state after completion:**
- [ ] Banner renders on dashboard after 6 PM when conditions met
- [ ] Banner is dismissible with "Not tonight"
- [ ] Banner triggers overlay opening via "Reflect Now"
- [ ] Banner respects reduced motion preferences
- [ ] Banner layout is responsive (stacked mobile, horizontal desktop)

---

### Step 4: Evening Reflection Overlay (4-Step Flow)

**Objective:** Build the full-screen 4-step evening reflection overlay with mood selection, activity summary, gratitude moment, and closing prayer with KaraokeText verse.

**Files to create/modify:**
- `frontend/src/components/dashboard/EveningReflection.tsx` — NEW: the 4-step overlay component

**Details:**

This is the largest step. The component manages 4 steps with local state.

**Component structure:**
```typescript
interface EveningReflectionProps {
  onComplete: () => void;    // Called when Done/Go to Sleep clicked at end
  onDismiss: () => void;     // Called when X close button clicked
  todayActivities: Record<ActivityType, boolean>;
  todayPoints: number;
  currentStreak: number;
  recordActivity: (type: ActivityType) => void;
}

type ReflectionStep = 1 | 2 | 3 | 4;
type Step4Phase = 'prayer' | 'verse_reveal' | 'done';
```

**State management:**
- `currentStep: ReflectionStep` — starts at 1
- `selectedMood: MoodOption | null` — mood selection from Step 1
- `highlightText: string` — textarea text from Step 2
- `gratitudeValues: [string, string, string]` — inputs from Step 3
- `step4Phase: Step4Phase` — controls prayer → verse → done sequence
- `capturedDate: string` — `getLocalDateString()` captured on mount (midnight rollover protection)

**Overlay container:**
- Same pattern as MoodCheckIn: `fixed inset-0 z-50` with dark gradient background
- `role="dialog"` with `aria-labelledby` pointing to current step heading
- `aria-modal="true"`

**Navigation:**
- Top bar: Back button (left, steps 2-4 only), X close button (right, all steps)
- Back: `ChevronLeft` icon, `min-h-[44px]`, `text-white/60 hover:text-white`
- Close: `X` icon, `min-h-[44px]`, `text-white/40 hover:text-white/60`
- Step dots at bottom: 4 circles, `flex gap-2 justify-center`, 8px each
  - Active: `w-2 h-2 rounded-full bg-white`
  - Inactive: `w-2 h-2 rounded-full border border-white/30`
  - Container: `aria-label="Step {n} of 4"`

**Step 1 — Mood Selection:**
- Heading: "How has your day been?" in `font-serif text-2xl md:text-3xl text-white/90`
- Reuse mood orb pattern from MoodCheckIn (same colors, sizes, animations, keyboard nav)
- Import `MOOD_OPTIONS` from `@/constants/dashboard/mood`
- On selection: auto-advance to Step 2 (no textarea in Step 1 — evening is quicker)
- Store selected mood in component state (not written to localStorage yet)

**Step 2 — Today's Highlights:**
- Heading: "Today's Highlights" in `font-serif text-2xl md:text-3xl text-white/90`
- Activity list: filter `todayActivities` for `true` values, show each with:
  - `Check` icon in `text-success`
  - `ACTIVITY_DISPLAY_NAMES[type]` text
- Faith points stat: `{todayPoints} faith points earned today` with highlighted number
- Streak: `🔥 Day {currentStreak} streak`
- Textarea: `placeholder="What was the best part of your day?"`, `maxLength={500}`, character counter
  - Crisis detection: `containsCrisisKeyword(text)` → show `CrisisBanner`
  - Dark textarea style from MoodCheckIn
- "Next" button: primary style, always enabled

**Step 3 — Gratitude Moment:**
- Heading: "Gratitude Moment" in `font-serif text-2xl md:text-3xl text-white/90`
- Check `getTodayGratitude()` on step mount (handles race condition)
- **If no gratitude today:** Show 3 inputs with numbered hearts (reuse NumberedHeart pattern from GratitudeWidget)
  - `maxLength={150}`, rotating placeholders (same day-of-year rotation)
  - Crisis detection on combined text
- **If gratitude already saved:** Read-only list with green checkmarks + "You already counted your blessings today" message
- "Next" button advances to Step 4
- When user enters new gratitude and clicks Next: save via `saveGratitudeEntry(values)` + `recordActivity('gratitude')`

**Step 4 — Closing Prayer:**
- Heading: "Closing Prayer" in `font-serif text-2xl md:text-3xl text-white/90`
- Prayer text: `getEveningPrayer().text` in `font-serif italic text-lg md:text-xl text-white/90 leading-relaxed`
- "Goodnight" button: `bg-indigo-600 hover:bg-indigo-500` (evening theme, per spec's suggestion)
- On "Goodnight" click: set `step4Phase` to `'verse_reveal'`
- Verse reveal: `<KaraokeTextReveal text={getEveningVerse().text} revealDuration={2500} onRevealComplete={...} />`
  - Show verse reference after reveal: `text-white/50 text-sm`
- After reveal completes (`step4Phase = 'done'`):
  - Two buttons: "Go to Sleep & Rest" (outline: `border border-white/20 text-white`) and "Done" (primary: `bg-primary`)
  - "Go to Sleep & Rest" → `<Link to="/music?tab=sleep">`
  - "Done" → trigger completion

**On completion (reaching final state of Step 4):**
1. `markReflectionDone()` — stores today's date to `wr_evening_reflection`
2. `recordActivity('reflection')` — awards 10 faith points
3. Create and save the evening mood entry:
   ```typescript
   const eveningEntry: MoodEntry = {
     id: crypto.randomUUID(),
     date: capturedDate,
     mood: selectedMood.value,
     moodLabel: selectedMood.label,
     text: highlightText.trim() || undefined,
     timestamp: Date.now(),
     verseSeen: getEveningVerse().reference,
     timeOfDay: 'evening',
   };
   saveMoodEntry(eveningEntry);
   ```
4. Call `onComplete()` to close overlay

**On dismiss (X button at any step):**
1. `markReflectionDone()` — stores today's date (no re-showing)
2. Do NOT record activity or save mood entry
3. Call `onDismiss()` to close overlay

**Step transitions:**
- Content fades: `motion-safe:animate-fade-in` on each step's content wrapper
- `prefers-reduced-motion`: instant transitions

**Responsive behavior:**
- Mobile (< 640px): `px-4`, mood orbs 56px in 2 rows, Step 4 buttons stacked full width ("Done" above "Go to Sleep & Rest")
- Tablet (640px+): `max-w-[600px] mx-auto`, mood orbs 60px single row, Step 4 buttons side by side
- Desktop (1024px+): `max-w-[640px] mx-auto`, mood orbs 64px, generous spacing

**Guardrails (DO NOT):**
- Do NOT write mood entry until Step 4 completion (prevent partial data)
- Do NOT use UTC for date capture — use `getLocalDateString()` on mount
- Do NOT skip crisis detection on Step 2 textarea or Step 3 gratitude inputs
- Do NOT use `dangerouslySetInnerHTML` for prayer text
- Do NOT auto-advance after mood selection delay — advance immediately (evening is quicker)
- Do NOT make "Not tonight" or X close punitive — no negative messaging
- Do NOT skip `aria-live` on dynamic content changes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Step 1 renders mood orbs | unit | Verify all 5 mood orbs with correct colors |
| Step 1 mood selection advances to Step 2 | unit | Click mood, verify Step 2 heading appears |
| Step 1 keyboard navigation | unit | Arrow keys move focus between orbs |
| Step 2 shows completed activities | unit | Pass activities, verify checkmarks and names |
| Step 2 shows faith points and streak | unit | Verify points and streak display |
| Step 2 textarea accepts text | unit | Type text, verify character counter |
| Step 2 crisis detection | unit | Type crisis keyword, verify CrisisBanner shown |
| Step 2 Next button always enabled | unit | Verify button not disabled even with empty textarea |
| Step 3 shows inputs when no gratitude today | unit | Mock no gratitude, verify 3 inputs render |
| Step 3 shows read-only when gratitude exists | unit | Mock existing gratitude, verify read-only display |
| Step 3 crisis detection on gratitude inputs | unit | Type crisis keyword in input, verify CrisisBanner |
| Step 3 saves gratitude and records activity | integration | Enter items, click Next, verify storage + recordActivity |
| Step 3 re-checks gratitude on mount | integration | Save gratitude mid-flow, navigate to Step 3, verify read-only |
| Step 4 shows correct prayer for day of week | unit | Mock each day, verify correct prayer text |
| Step 4 "Goodnight" triggers verse reveal | unit | Click Goodnight, verify KaraokeTextReveal appears |
| Step 4 shows correct verse for day of week | unit | Verify verse text and reference match day |
| Step 4 buttons appear after verse reveal | unit | After reveal completes, verify Done and Sleep buttons |
| Step 4 "Done" triggers completion sequence | integration | Click Done, verify markReflectionDone, recordActivity, saveMoodEntry |
| Step 4 "Go to Sleep & Rest" links to correct URL | unit | Verify link `to="/music?tab=sleep"` |
| X close dismisses without recording | integration | Click X, verify markReflectionDone called but NOT recordActivity |
| Back button navigates to previous step | unit | On Step 3, click back, verify Step 2 appears |
| Step dots show correct progress | unit | On each step, verify correct dot is filled |
| `role="dialog"` present | unit | Verify overlay has dialog role |
| Midnight rollover uses captured date | integration | Start at 23:58, complete at 00:01, verify entry date is original |
| Evening mood entry has `timeOfDay: 'evening'` | integration | Complete flow, verify saved entry has `timeOfDay: 'evening'` |
| Entry has `verseSeen` set to closing verse | integration | Complete flow, verify verseSeen matches day's verse reference |
| Reduced motion disables animations | unit | Mock `prefers-reduced-motion`, verify no animation classes |

**Expected state after completion:**
- [ ] Full 4-step overlay works end-to-end
- [ ] Mood entry with `timeOfDay: 'evening'` is saved to localStorage
- [ ] Gratitude can be entered or shown as read-only
- [ ] KaraokeText verse reveal works
- [ ] Crisis detection active on all text inputs
- [ ] Completion awards faith points and marks reflection done
- [ ] Dismiss marks reflection done without awarding points
- [ ] All keyboard navigation and ARIA attributes in place

---

### Step 5: Integrate Overlay into Dashboard & Activity Checklist

**Objective:** Wire the overlay into Dashboard.tsx and update ActivityChecklist to show/hide the "Evening reflection" item based on time of day.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — render EveningReflection overlay
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — add conditional reflection item

**Details:**

1. In `Dashboard.tsx`:
   - Import `EveningReflection` component
   - Add state: `const [showReflectionOverlay, setShowReflectionOverlay] = useState(false)`
   - Render overlay when `showReflectionOverlay` is true:
     ```tsx
     {showReflectionOverlay && (
       <EveningReflection
         onComplete={handleReflectionComplete}
         onDismiss={handleReflectionDismiss}
         todayActivities={faithPoints.todayActivities}
         todayPoints={faithPoints.todayPoints}
         currentStreak={faithPoints.currentStreak}
         recordActivity={faithPoints.recordActivity}
       />
     )}
     ```
   - `handleReflectionComplete`: set overlay false, set banner hidden, force re-check faithPoints state
   - `handleReflectionDismiss`: set overlay false, set banner hidden

2. In `ActivityChecklist.tsx`:
   - Import `isEveningTime` from `@/services/evening-reflection-storage`
   - Compute `showReflection = isEveningTime()` on component mount (not reactively)
   - If `showReflection`, append `'reflection'` to `activityList` (after existing items, last position)
   - Update `totalActivities` count accordingly
   - Reflection checklist item shows `Moon` icon (from Lucide) instead of `Circle`/`CircleCheck`
   - The item only appears after 6 PM — before 6 PM, the checklist has the normal number of items

**Guardrails (DO NOT):**
- Do NOT make the reflection checklist item clickable/navigable (it's completed via the banner overlay)
- Do NOT change the progress ring total before 6 PM (avoid confusing users who see "3/7" change to "3/8" at 6 PM without doing anything)
- Do NOT re-render the checklist reactively on time change — check once on mount

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Dashboard renders overlay when showReflectionOverlay is true | integration | Set state, verify overlay present |
| Dashboard hides overlay on complete | integration | Trigger complete, verify overlay gone |
| Dashboard hides banner after completion | integration | Trigger complete, verify banner hidden |
| ActivityChecklist shows reflection item after 6 PM | unit | Mock time >= 18, verify "Evening reflection" in list |
| ActivityChecklist hides reflection item before 6 PM | unit | Mock time < 18, verify "Evening reflection" not in list |
| ActivityChecklist total count updates with reflection | unit | Mock 6 PM, verify total includes reflection |
| Reflection item shows Moon icon when pending | unit | Verify Moon icon renders for uncompleted reflection |
| Reflection item shows CheckCircle when completed | unit | Mock reflection completed, verify check icon |
| Progress ring denominator includes reflection after 6 PM | unit | Mock 6 PM, verify ring shows "/N+1" |

**Expected state after completion:**
- [ ] Evening reflection overlay opens from dashboard banner
- [ ] Activity checklist conditionally shows reflection item
- [ ] Completing reflection updates checklist state
- [ ] Progress ring counts reflect the conditional item

---

### Step 6: Mood Insights Integration — Dual-Dot Chart & Insight Card

**Objective:** Update the mood trend chart to show morning + evening data points, and add a new insight card for mood change patterns.

**Files to create/modify:**
- `frontend/src/hooks/useMoodChartData.ts` — return morning + evening data per day
- `frontend/src/components/insights/MoodTrendChart.tsx` — render dual dots with connecting line
- `frontend/src/components/dashboard/MoodChart.tsx` — render dual dots on dashboard widget
- `frontend/src/components/insights/InsightCards.tsx` — add mood change insight card

**Details:**

1. Update `useMoodChartData.ts`:
   - Extend `MoodChartDataPoint` to include evening data:
     ```typescript
     export interface MoodChartDataPoint {
       date: string;
       dayLabel: string;
       mood: number | null;         // morning mood (or any entry for backward compat)
       moodLabel: MoodLabel | null;
       color: string | null;
       eveningMood: number | null;  // NEW
       eveningMoodLabel: MoodLabel | null; // NEW
       eveningColor: string | null; // NEW
     }
     ```
   - When building the data array, check for entries with `timeOfDay`:
     - Morning entry: `timeOfDay === 'morning'` or `timeOfDay === undefined` (backward compat)
     - Evening entry: `timeOfDay === 'evening'`
   - If multiple entries exist for a date, separate into morning and evening fields
   - If only one entry exists (no timeOfDay), it goes into the morning fields as before

2. Update `MoodTrendChart.tsx` (insights page chart):
   - Add a second `<Line>` for `eveningMood` data key
   - Custom dot for evening: same mood-colored circle but with 2px white ring outline:
     ```typescript
     function EveningDot({ cx, cy, payload }: DotProps) {
       if (!payload?.eveningColor || cx == null || cy == null) return null;
       return (
         <g>
           <circle cx={cx} cy={cy} r={5} fill={payload.eveningColor} />
           <circle cx={cx} cy={cy} r={5} fill="none" stroke="white" strokeWidth={2} />
         </g>
       );
     }
     ```
   - Add connecting vertical line between morning and evening dots using Recharts customized rendering (ReferenceArea or custom shape on the Line component)
   - Line: `stroke="rgba(255,255,255,0.15)"`, `strokeWidth={1}`

3. Update `MoodChart.tsx` (dashboard 7-day widget):
   - Same dual-dot pattern but simplified for the smaller widget
   - Evening dots with white ring, connecting line if both exist

4. Add mood change insight card in `InsightCards.tsx`:
   - Create helper function `computeMoodChangeInsight(entries: MoodEntry[])`:
     - Filter for days with both morning and evening entries
     - Need at least 5 such days to show the card
     - Calculate average difference (evening - morning)
     - Return appropriate message:
       - Positive (> 0.3): "Your mood tends to improve by evening — your daily practices are making a difference!"
       - Negative (< -0.3): "Your mood tends to dip by evening — consider adding a restful practice to your afternoon routine."
       - Neutral (|diff| <= 0.3): "Your mood stays steady throughout the day — a sign of emotional resilience."
   - Render as a new insight card with `Sunrise` or `Sunset` icon from Lucide

**Guardrails (DO NOT):**
- Do NOT break existing chart behavior for users with no evening entries
- Do NOT show the mood change insight with fewer than 5 dual-entry days
- Do NOT change existing dot styling for morning entries
- Do NOT import `MoodEntry` from multiple sources — use the hook's data

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `useMoodChartData` returns evening data when present | unit | Mock entries with `timeOfDay`, verify `eveningMood` populated |
| `useMoodChartData` backward compatible with no `timeOfDay` | unit | Mock old entries, verify `mood` populated, `eveningMood` null |
| Chart renders evening dots with white ring | unit | Mock dual entries, verify SVG circle with stroke |
| Chart renders connecting line between dots | unit | Mock dual entries, verify line element |
| Chart renders single dot when only morning | unit | Mock morning only, verify single dot, no line |
| Mood change insight shows "improve" message | unit | Mock 5+ days where evening > morning, verify message |
| Mood change insight shows "dip" message | unit | Mock 5+ days where evening < morning, verify message |
| Mood change insight shows "steady" message | unit | Mock 5+ days with ≤0.3 diff, verify message |
| Mood change insight hidden with < 5 dual days | unit | Mock 3 dual days, verify card not rendered |

**Expected state after completion:**
- [ ] Mood charts display both morning and evening data points
- [ ] Evening dots have distinct visual (white ring)
- [ ] Connecting line between morning/evening dots on same day
- [ ] Insight card shows mood change pattern when enough data exists
- [ ] No visual changes for users without evening entries

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend data models & activity constants |
| 2 | — | Evening reflection constants & storage |
| 3 | 1, 2 | Evening reflection banner component + dashboard integration |
| 4 | 1, 2 | 4-step evening reflection overlay |
| 5 | 3, 4 | Wire overlay into dashboard + activity checklist update |
| 6 | 1 | Mood insights integration (dual dots + insight card) |

**Parallelizable:** Steps 1 and 2 can be done in parallel. Steps 3 and 4 can be done in parallel (both depend on 1+2). Step 6 can run in parallel with Steps 3-5 (only depends on Step 1).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend data models & activity constants | [COMPLETE] | 2026-03-22 | Modified: types/dashboard.ts, constants/dashboard/activity-points.ts, services/faith-points-storage.ts, services/mood-storage.ts, components/dashboard/MoodCheckIn.tsx, hooks/useFaithPoints.ts, constants/dashboard/badges.ts, hooks/useProfileData.ts, services/badge-storage.ts. Updated all test files referencing old activity counts (8→9). Also fixed: badge-engine.test.ts, faith-points-integration.test.ts, ActivityChecklist.test.tsx, useFaithPoints.test.ts, useGettingStarted.test.tsx, useWeeklyGodMoments.test.ts, leaderboard.test.ts, badges.test.ts, empty-states.test.tsx. |
| 2 | Evening reflection constants & storage | [COMPLETE] | 2026-03-22 | Created: constants/dashboard/evening-reflection.ts, services/evening-reflection-storage.ts. Tests: constants/dashboard/__tests__/evening-reflection.test.ts (10 tests), services/__tests__/evening-reflection-storage.test.ts (12 tests). |
| 3 | Evening reflection banner + dashboard integration | [COMPLETE] | 2026-03-22 | Created: components/dashboard/EveningReflectionBanner.tsx. Modified: pages/Dashboard.tsx (added imports, banner state, handlers, banner rendering between GettingStartedCard and WidgetGrid, updated staggerStartIndex). Tests: components/dashboard/__tests__/EveningReflectionBanner.test.tsx (8 tests). Overlay placeholder: showReflectionOverlay state ready for Step 4/5. |
| 4 | 4-step evening reflection overlay | [COMPLETE] | 2026-03-22 | Created: components/dashboard/EveningReflection.tsx. Tests: components/dashboard/__tests__/EveningReflection.test.tsx (22 tests). Deviation: removed 200ms setTimeout on mood selection — spec says "advance immediately" so instant advance is more faithful. |
| 5 | Wire overlay into dashboard + activity checklist | [COMPLETE] | 2026-03-22 | Modified: pages/Dashboard.tsx (render EveningReflection overlay), components/dashboard/ActivityChecklist.tsx (conditional reflection item with Moon icon after 6 PM). All existing tests pass (26 tests across Dashboard + ActivityChecklist). |
| 6 | Mood insights integration | [COMPLETE] | 2026-03-22 | Modified: hooks/useMoodChartData.ts (separate morning/evening entries), components/dashboard/MoodChart.tsx (EveningDot + evening Line), components/insights/MoodTrendChart.tsx (EveningDot + evening Line), components/insights/InsightCards.tsx (computeMoodChangeInsight + mood change card). Tests: useMoodChartData.test.ts (3 new), InsightCards.test.tsx (4 new), MoodTrendChart.test.tsx (updated data fixtures). |
