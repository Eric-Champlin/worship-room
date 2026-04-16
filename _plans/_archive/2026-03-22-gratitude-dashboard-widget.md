# Implementation Plan: Gratitude Dashboard Widget

**Spec:** `_specs/gratitude-dashboard-widget.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/gratitude-dashboard-widget`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (dashboard widget, no external recon needed)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Directory Conventions
- **Components:** `frontend/src/components/dashboard/` for dashboard widgets
- **Services:** `frontend/src/services/` for localStorage storage services (pure functions, typed interfaces, try/catch recovery)
- **Types:** `frontend/src/types/dashboard.ts` for shared dashboard type definitions
- **Constants:** `frontend/src/constants/dashboard/activity-points.ts` for activity system constants
- **Hooks:** `frontend/src/hooks/` for custom React hooks
- **Pages:** `frontend/src/pages/` for route-level page components
- **Tests:** Co-located `__tests__/` directories next to components/services

### Existing Patterns to Follow
- **Storage service pattern** (`services/mood-storage.ts`): Pure functions, `try/catch` with fallback to empty array, `getLocalDateString()` for dates, max entry cap with oldest pruned
- **Activity system** (`constants/dashboard/activity-points.ts`, `types/dashboard.ts`): `ActivityType` union, `ACTIVITY_POINTS` record, `DailyActivities` interface, `ALL_ACTIVITY_TYPES` array, `ACTIVITY_DISPLAY_NAMES`, `ACTIVITY_CHECKLIST_NAMES`
- **Faith points hook** (`hooks/useFaithPoints.ts`): `recordActivity(type)` is idempotent, no-ops when logged out, integrates with badge engine
- **Dashboard widget grid** (`components/dashboard/DashboardWidgetGrid.tsx`): `DashboardCard` wrapper, staggered entrance animation via `getAnimProps()`, 5-column grid with `lg:col-span-3` for left column
- **Toast pattern**: `useToast()` hook, `showToast('message', 'success')`
- **Crisis detection**: `containsCrisisKeyword()` from `constants/crisis-resources.ts`, `<CrisisBanner text={input} />` component with `role="alert"` + `aria-live="assertive"`

### Key Files
| File | Purpose |
|------|---------|
| `frontend/src/types/dashboard.ts` | `ActivityType`, `DailyActivities` definitions |
| `frontend/src/constants/dashboard/activity-points.ts` | `ACTIVITY_POINTS`, `ALL_ACTIVITY_TYPES`, display names, checklist names |
| `frontend/src/services/faith-points-storage.ts` | `freshDailyActivities()`, `ACTIVITY_BOOLEAN_KEYS`, `calculateDailyPoints()` |
| `frontend/src/hooks/useFaithPoints.ts` | `recordActivity()`, `extractActivities()`, `DEFAULT_STATE` |
| `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` | Widget grid layout + animation props |
| `frontend/src/components/dashboard/ActivityChecklist.tsx` | Activity list ordering, progress ring, multiplier preview messages |
| `frontend/src/components/dashboard/DashboardCard.tsx` | Reusable frosted glass card wrapper |
| `frontend/src/components/JourneySection.tsx` | Landing page journey timeline |
| `frontend/src/components/insights/ActivityCorrelations.tsx` | Mock correlation bar chart data |
| `frontend/src/pages/Insights.tsx` | Insights page layout with `AnimatedSection` |
| `frontend/src/services/mood-storage.ts` | Reference storage service pattern |
| `frontend/src/components/daily/CrisisBanner.tsx` | Crisis keyword detection + resource banner |
| `frontend/src/constants/crisis-resources.ts` | `containsCrisisKeyword()` function |
| `frontend/src/utils/date.ts` | `getLocalDateString()` utility |

### Test Patterns
- **Provider wrapping** (`DashboardWidgetGrid.test.tsx` lines 34-43): `MemoryRouter` > `AuthProvider` > `ToastProvider`
- **Auth simulation**: `localStorage.setItem('wr_auth_simulated', 'true')` + `localStorage.setItem('wr_user_name', 'Eric')` in `beforeEach`
- **Recharts mock**: `ResizeObserver` mock class for chart tests
- **Assertion style**: `screen.getByRole()`, `screen.getByText()`, `screen.queryByText()`, `fireEvent.change()`, `fireEvent.click()`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View gratitude widget | Dashboard is entirely auth-gated; logged-out users see landing page | Step 4 | Dashboard route check (`isAuthenticated`) |
| Save gratitude entries | Logged-in only, localStorage writes are no-ops when not authenticated | Step 3 | `useAuth()` check in widget before save |
| Edit gratitude entries | Logged-in only (widget only visible on dashboard) | Step 3 | Same auth gate as save |
| Record gratitude activity | `recordActivity('gratitude')` no-ops when logged out | Step 2 | `useFaithPoints` built-in auth check |

Note: The dashboard (`/`) is already fully auth-gated — logged-out users see the landing page at `/`. No additional auth modal gating is needed for the gratitude widget because it's only rendered inside the auth-gated dashboard.

---

## Design System Values (for UI steps)

Values from Design System Reference (`_plans/recon/design-system.md`) and codebase inspection:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | design-system.md (Dashboard Card Pattern) |
| Dashboard card | padding | `p-4 md:p-6` | design-system.md |
| Input fields (dark-themed) | background + border | `bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30` | spec (Design System References section) |
| Input focus state | border + ring | `focus:border-primary focus:ring-1 focus:ring-primary` | spec |
| Heart icon color | color | `text-pink-400` (#F472B6) | spec |
| Save button (primary) | classes | `bg-primary text-white font-semibold rounded-lg` | design-system.md (Button Patterns) |
| Save button padding (small) | padding | `py-2 px-4 text-sm` | [UNVERIFIED] spec says "small size variant" |
| Checkmark icon | color | `text-success` (#27AE60) | design-system.md (Color System) |
| Saved button text | color | `text-success` (#27AE60) | spec |
| Widget entrance | animation | `motion-safe:animate-widget-enter` with staggered `animationDelay` | DashboardWidgetGrid.tsx lines 46-54 |

**[UNVERIFIED]** Save button "small size" — spec says "primary style, small size." Best guess: `py-2 px-4 text-sm font-semibold rounded-lg bg-primary text-white`.
→ To verify: Compare visually against other small buttons in the app during `/verify-with-playwright`
→ If wrong: Update padding/font-size to match the visual standard

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` with `p-4 md:p-6`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Success green is `#27AE60` (Tailwind: `text-success`)
- Primary violet is `#6D28D9` (Tailwind: `bg-primary`)
- Body font is Inter (`font-sans`), Scripture font is Lora (`font-serif`), Script/decorative is Caveat (`font-script`)
- All interactive elements need 44px minimum touch targets on mobile
- Animations must respect `prefers-reduced-motion` (use `motion-safe:` prefix or `motion-reduce:` override)
- Dashboard dark background: `bg-[#0f0a1e]` (from Insights page) or equivalent hero-dark gradient
- DashboardCard handles collapsibility via internal state + localStorage persistence

---

## Shared Data Models (from Master Plan)

### Existing Types to Extend

```typescript
// types/dashboard.ts (CURRENT)
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan';

// AFTER: Add 'gratitude'
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude';

// types/dashboard.ts (CURRENT)
export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  readingPlan: boolean;
  pointsEarned: number;
  multiplier: number;
}

// AFTER: Add gratitude: boolean
```

### New Type (gratitude-storage.ts)

```typescript
export interface GratitudeEntry {
  id: string;
  date: string;        // YYYY-MM-DD via getLocalDateString()
  items: string[];     // 1-3 non-empty strings, each max 150 chars
  createdAt: string;   // ISO 8601 timestamp
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_gratitude_entries` | Both | Array of `GratitudeEntry` objects (max 365) |
| `wr_daily_activities` | Read (via useFaithPoints) | Activity log — `gratitude` boolean added |
| `wr_faith_points` | Read (via useFaithPoints) | Points updated when gratitude recorded |
| `wr_streak` | Read (via useFaithPoints) | Streak updated via `recordActivity()` |
| `wr_badges` | Read (via useFaithPoints) | Badge engine checks on activity |
| `wr_dashboard_collapsed` | Both (via DashboardCard) | Collapse state for `todays-gratitude` card |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column dashboard, card full width, inputs full width, Save/Edit button full width |
| Tablet | 768px | Same as mobile within card (dashboard is single column until lg) |
| Desktop | 1024px+ | 5-column grid, gratitude card in left column (`lg:col-span-3`), Save/Edit button left-aligned, not full width |

**Custom breakpoints:** Dashboard grid switches from single column to 5-column at `lg` (1024px).

---

## Vertical Rhythm

Not applicable — this is a widget within an existing grid layout. Spacing between cards is controlled by the existing `gap-4 md:gap-6` on the grid container.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The `DashboardWidgetGrid.tsx` widget order has not changed since reconnaissance (Prayer List at order-6, Streak at order-1/lg:order-3)
- [ ] The `ActivityType` union in `types/dashboard.ts` still has exactly 7 members (no other spec has added a type since)
- [ ] The `useFaithPoints` hook still uses `ACTIVITY_BOOLEAN_KEYS` from `faith-points-storage.ts` for point calculation
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from design-system.md reference)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior dashboard specs (Phase 2.75) are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JourneySection step numbering | Renumber all steps 1-7 (insert at index 3, renumber) | The `StepCircle` renders `step.number` — fractional "3.5" would look wrong. Renumber to keep integers. |
| Multiplier tier thresholds | Update `minActivities: 6` to `minActivities: 7` for Full Worship Day | With 8 base activities (7 + readingPlan), "Full Worship Day" means completing 7 base activities. The spec says to "account for the new activity." |
| MAX_DAILY_BASE_POINTS | Update from 100 to 105 (5+10+10+15+15+20+25+5) | Gratitude adds 5 points to the base total. |
| ActivityChecklist ordering | Insert `gratitude` between `prayerWall` (15pts) and `meditate` (20pts) | Spec requirement: "after prayerWall (15 pts) and before meditate (20 pts) — follows the ascending-points ordering pattern" |
| Gratitude streak on insights | Show as a simple stat card below correlations | Follows the stat display pattern from MeditationHistory. Only shown when 2+ consecutive days. |
| CrisisBanner placement | Above the 3 inputs, inside the card | Spec says "above the inputs." Check if ANY of the 3 fields contains crisis keywords. |
| Gratitude correlation in mock data | Add to `MOCK_CORRELATION_DATA` array in ActivityCorrelations | Follows existing mock correlation pattern. |
| Edit button style | Secondary text-style button: `text-white/70 hover:text-white text-sm` | Spec says "secondary/text style" for Edit button. |
| Multiple crisis fields | Show CrisisBanner if ANY of the 3 fields triggers `containsCrisisKeyword()` | Combine all 3 inputs for crisis detection check. |

---

## Implementation Steps

### Step 1: Extend Activity System Types & Constants

**Objective:** Add `gratitude` as a new activity type throughout the type system, constants, and storage layer so all downstream consumers (faith points, badge engine, checklist) recognize it.

**Files to modify:**
- `frontend/src/types/dashboard.ts` — Add `'gratitude'` to `ActivityType` union, `gratitude: boolean` to `DailyActivities`, `gratitude: number` to `ActivityCounts`
- `frontend/src/constants/dashboard/activity-points.ts` — Add `gratitude: 5` to `ACTIVITY_POINTS`, display names, checklist names, `ALL_ACTIVITY_TYPES`; update `MAX_DAILY_BASE_POINTS` to 105, `MAX_DAILY_POINTS` to 210
- `frontend/src/services/faith-points-storage.ts` — Add `gratitude` to `ACTIVITY_BOOLEAN_KEYS`, `freshDailyActivities()`, and ensure `calculateDailyPoints()` picks it up
- `frontend/src/hooks/useFaithPoints.ts` — Add `gratitude` to `DEFAULT_STATE.todayActivities` and `extractActivities()`

**Details:**

In `types/dashboard.ts`:
```typescript
// Line 14: Add 'gratitude' to ActivityType union
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude';

// Lines 16-26: Add gratitude: boolean to DailyActivities (after readingPlan)
export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  readingPlan: boolean;
  gratitude: boolean;  // NEW
  pointsEarned: number;
  multiplier: number;
}

// Lines 56-65: Add gratitude: number to ActivityCounts
export interface ActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  readingPlan: number;
  gratitude: number;  // NEW
  encouragementsSent: number;
  fullWorshipDays: number;
}
```

In `constants/dashboard/activity-points.ts`:
```typescript
export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  readingPlan: 15,
  meditate: 20,
  journal: 25,
  gratitude: 5,  // NEW
} as const;

export const ACTIVITY_DISPLAY_NAMES: Record<ActivityType, string> = {
  // ...existing...
  gratitude: 'Gave thanks',  // NEW
} as const;

export const ACTIVITY_CHECKLIST_NAMES: Record<ActivityType, string> = {
  // ...existing...
  gratitude: 'Give thanks',  // NEW
} as const;

export const MULTIPLIER_TIERS = [
  { minActivities: 7, multiplier: 2, label: 'Full Worship Day' },  // CHANGED from 6 to 7
  { minActivities: 4, multiplier: 1.5, label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1, label: '' },
] as const;

export const MAX_DAILY_BASE_POINTS = 105; // 5+10+10+15+15+20+25+5
export const MAX_DAILY_POINTS = 210; // 105 × 2x

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'readingPlan', 'meditate', 'journal', 'gratitude',
];
```

In `services/faith-points-storage.ts`:
- Add `'gratitude'` to `ACTIVITY_BOOLEAN_KEYS` array (line 9-11)
- Add `gratitude: false` to `freshDailyActivities()` (line 13-19)

In `hooks/useFaithPoints.ts`:
- Add `gratitude: false` to `DEFAULT_STATE.todayActivities` (line 52)
- Add `gratitude: da.gratitude` to `extractActivities()` (line 62-72)

**Guardrails (DO NOT):**
- DO NOT change the order of existing activity types in `ALL_ACTIVITY_TYPES` (append only)
- DO NOT modify the multiplier calculation logic — only the tier thresholds
- DO NOT change existing point values for any activity
- DO NOT forget to update `ActivityCounts` interface (used by badge engine)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `activity-points.test.ts` — gratitude in ACTIVITY_POINTS | unit | Verify `ACTIVITY_POINTS.gratitude === 5` |
| `activity-points.test.ts` — gratitude in ALL_ACTIVITY_TYPES | unit | Verify `ALL_ACTIVITY_TYPES.includes('gratitude')` |
| `activity-points.test.ts` — MAX_DAILY_BASE_POINTS updated | unit | Verify `MAX_DAILY_BASE_POINTS === 105` |
| `activity-points.test.ts` — Full Worship Day threshold | unit | Verify `MULTIPLIER_TIERS[0].minActivities === 7` |
| `faith-points-storage.test.ts` — freshDailyActivities includes gratitude | unit | Verify `freshDailyActivities().gratitude === false` |
| `faith-points-storage.test.ts` — calculateDailyPoints includes gratitude | unit | Set `gratitude: true` in activities, verify points increase by 5 |

**Expected state after completion:**
- [ ] `ActivityType` union includes `'gratitude'`
- [ ] `DailyActivities` interface has `gratitude: boolean`
- [ ] `ACTIVITY_POINTS.gratitude` is 5
- [ ] `freshDailyActivities()` returns object with `gratitude: false`
- [ ] `calculateDailyPoints()` correctly adds 5 when `gratitude: true`
- [ ] Full Worship Day requires 7 activities (was 6)
- [ ] All existing tests still pass

---

### Step 2: Create Gratitude Storage Service

**Objective:** Create a localStorage storage service for gratitude entries following the existing mood-storage pattern.

**Files to create:**
- `frontend/src/services/gratitude-storage.ts` — Pure function storage service
- `frontend/src/services/__tests__/gratitude-storage.test.ts` — Unit tests

**Details:**

```typescript
// frontend/src/services/gratitude-storage.ts
import type { GratitudeEntry } from './gratitude-storage'; // types defined inline
import { getLocalDateString } from '@/utils/date';

export interface GratitudeEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  items: string[];     // 1-3 non-empty strings, each max 150 chars
  createdAt: string;   // ISO 8601
}

const STORAGE_KEY = 'wr_gratitude_entries';
const MAX_ENTRIES = 365;

export function getGratitudeEntries(): GratitudeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function getTodayGratitude(): GratitudeEntry | null {
  const today = getLocalDateString();
  const entries = getGratitudeEntries();
  return entries.find((e) => e.date === today) ?? null;
}

export function saveGratitudeEntry(items: string[]): GratitudeEntry {
  const today = getLocalDateString();
  const entries = getGratitudeEntries();
  const existingIndex = entries.findIndex((e) => e.date === today);

  const entry: GratitudeEntry = {
    id: existingIndex >= 0 ? entries[existingIndex].id : crypto.randomUUID(),
    date: today,
    items: items.filter((s) => s.trim().length > 0).map((s) => s.trim().slice(0, 150)),
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  // Prune oldest entries beyond MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entry;
}

export function getGratitudeStreak(): number {
  const entries = getGratitudeEntries();
  if (entries.length === 0) return 0;

  // Sort by date descending
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const today = getLocalDateString();
  let streak = 0;
  let expectedDate = today;

  for (const entry of sorted) {
    if (entry.date === expectedDate) {
      streak++;
      // Move expectedDate to previous day
      const d = new Date(expectedDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      expectedDate = getLocalDateString(d);
    } else if (entry.date < expectedDate) {
      break;
    }
  }

  return streak;
}
```

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` for dates — always use `getLocalDateString()`
- DO NOT throw errors — always return sensible defaults (empty arrays, null)
- DO NOT write to localStorage outside of `saveGratitudeEntry()` (single write point)
- DO NOT store more than 150 characters per item

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getGratitudeEntries — empty storage | unit | Returns `[]` when no key exists |
| getGratitudeEntries — corrupted JSON | unit | Returns `[]` when localStorage has invalid JSON |
| getGratitudeEntries — non-array value | unit | Returns `[]` when stored value is not an array |
| getTodayGratitude — no entry today | unit | Returns `null` when no entry matches today's date |
| getTodayGratitude — has entry today | unit | Returns the matching entry |
| saveGratitudeEntry — new entry | unit | Saves entry, assigns UUID, trims items, filters empty |
| saveGratitudeEntry — update existing | unit | Overwrites same-day entry, preserves original ID |
| saveGratitudeEntry — max 365 pruning | unit | Caps at 365 entries, removes oldest |
| saveGratitudeEntry — 150 char truncation | unit | Items longer than 150 chars are truncated |
| getGratitudeStreak — consecutive days | unit | Returns correct streak count |
| getGratitudeStreak — gap in days | unit | Stops counting at gap |
| getGratitudeStreak — no entries | unit | Returns 0 |

**Expected state after completion:**
- [ ] `gratitude-storage.ts` exists with all 4 exported functions
- [ ] All tests pass
- [ ] Storage service handles corrupted data gracefully

---

### Step 3: Create GratitudeWidget Component

**Objective:** Build the "Today's Gratitude" widget component with input fields, save/edit flow, crisis detection, and toast notifications.

**Files to create:**
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — Widget component
- `frontend/src/components/dashboard/__tests__/GratitudeWidget.test.tsx` — Tests

**Details:**

The component has 3 states:
1. **Input state** (no entry today): 3 empty inputs + Save button
2. **Saved state** (entry exists today): Read-only text + checkmarks + Edit button
3. **Editing state** (user clicked Edit): Pre-filled inputs + Save button (re-save)

```typescript
interface GratitudeWidgetProps {
  onGratitudeSaved?: () => void; // Callback for parent to trigger recordActivity
}
```

**Component structure:**

```tsx
function GratitudeWidget({ onGratitudeSaved }: GratitudeWidgetProps) {
  // State: 'input' | 'saved' | 'editing'
  const [mode, setMode] = useState<'input' | 'saved' | 'editing'>('input');
  const [values, setValues] = useState<[string, string, string]>(['', '', '']);
  const [todayEntry, setTodayEntry] = useState<GratitudeEntry | null>(null);
  const { showToast } = useToast();

  // Check for existing entry on mount
  useEffect(() => {
    const existing = getTodayGratitude();
    if (existing) {
      setTodayEntry(existing);
      setMode('saved');
    }
  }, []);

  // Rotating placeholders (day-of-year modulo 3)
  const dayOfYear = getDayOfYear();
  const placeholderIndex = dayOfYear % 3;
  const placeholders = [
    FIELD_1_PLACEHOLDERS[placeholderIndex],
    FIELD_2_PLACEHOLDERS[placeholderIndex],
    FIELD_3_PLACEHOLDERS[placeholderIndex],
  ];

  // Crisis detection across all 3 fields
  const combinedText = values.join(' ');
  const showCrisis = containsCrisisKeyword(combinedText);

  // Save handler
  const handleSave = () => {
    const isEdit = mode === 'editing';
    const entry = saveGratitudeEntry(values);
    setTodayEntry(entry);
    setMode('saved');

    if (!isEdit) {
      onGratitudeSaved?.(); // recordActivity('gratitude') — only on first save
    }

    showToast('Gratitude logged! Thank you for counting your blessings.', 'success');
  };

  // Edit handler
  const handleEdit = () => {
    if (todayEntry) {
      const padded: [string, string, string] = [
        todayEntry.items[0] ?? '',
        todayEntry.items[1] ?? '',
        todayEntry.items[2] ?? '',
      ];
      setValues(padded);
    }
    setMode('editing');
  };

  const hasContent = values.some((v) => v.trim().length > 0);
  // ...render
}
```

**Placeholder constants:**
```typescript
const FIELD_1_PLACEHOLDERS = [
  "A person I'm thankful for...",
  "Something that made me smile...",
  "A blessing I noticed today...",
];
const FIELD_2_PLACEHOLDERS = [
  "A moment of peace today...",
  "Something I learned...",
  "A prayer God answered...",
];
const FIELD_3_PLACEHOLDERS = [
  "Something beautiful I saw...",
  "A way God showed up...",
  "Something I don't want to forget...",
];
```

**Numbered heart icon pattern:**
```tsx
function NumberedHeart({ number }: { number: number }) {
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center" aria-hidden="true">
      <Heart className="absolute h-5 w-5 text-pink-400 fill-pink-400/20" />
      <span className="relative text-xs font-bold text-pink-400">{number}</span>
    </span>
  );
}
```

**Input field styling (dark-themed, per spec):**
```
bg-white/5 border border-white/10 rounded-lg text-white text-sm
placeholder:text-white/30
focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
h-11 (44px touch target)
px-3
```

**Saved state display:**
- Each filled item shows: green `Check` icon (h-4 w-4 text-success) + item text (text-sm text-white/80)
- Empty slots from original save are not displayed

**Transitions:** Use `motion-safe:transition-all motion-safe:duration-300` on state changes.

**Crisis detection:**
```tsx
{showCrisis && <CrisisBanner text={combinedText} />}
```
Place CrisisBanner above the inputs, inside the card content area.

**Accessibility:**
- Each input gets `aria-label={`Gratitude item ${i + 1}`}` (visually hidden labels via aria-label since the heart number is the visual label)
- Save button: standard button role
- Edit button: standard button role
- Screen reader announces mode changes via `aria-live="polite"` region
- All interactive elements ≥ 44px touch targets (inputs `h-11`, buttons `min-h-[44px]`)

**Responsive behavior:**
- Desktop (1024px+): Inputs full width within card column (`lg:col-span-3`). Save/Edit button left-aligned, auto-width (`w-auto`).
- Tablet (768px): Same as mobile within card (dashboard single column at this breakpoint).
- Mobile (375px): Inputs full width. Save/Edit button full width (`w-full sm:w-auto`).

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT allow saving when all inputs are empty (button disabled)
- DO NOT re-award gratitude activity on edit (check `mode === 'editing'`)
- DO NOT block save when crisis keywords detected (show banner only, save still works)
- DO NOT skip `aria-label` on inputs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 3 input fields | integration | Verify 3 inputs with correct aria-labels |
| shows rotating placeholders | unit | Mock day-of-year, verify placeholder text rotates |
| save button disabled when empty | integration | All 3 empty → button disabled |
| save button enabled with content | integration | Type in 1 field → button enabled |
| saves entry and shows saved state | integration | Fill + click Save → read-only with checkmarks |
| shows toast on save | integration | After save, `showToast` called with correct message |
| calls onGratitudeSaved on first save | integration | `onGratitudeSaved` called once on initial save |
| does not call onGratitudeSaved on edit re-save | integration | Edit then re-save → `onGratitudeSaved` not called |
| loads existing entry on mount | integration | Pre-seed localStorage → widget shows saved state |
| edit button re-enables inputs | integration | Click Edit → inputs editable with pre-filled values |
| crisis banner shows when keyword detected | integration | Type "kill myself" → CrisisBanner appears |
| crisis banner does not block save | integration | Crisis keyword present → save still works |
| max 150 char enforcement | integration | Input has `maxLength={150}` attribute |
| keyboard navigation works | integration | Tab through all inputs + buttons |

**Expected state after completion:**
- [ ] `GratitudeWidget.tsx` renders correctly in all 3 states
- [ ] Toast fires on save
- [ ] Crisis detection works across all 3 inputs
- [ ] Edit flow preserves existing entry ID
- [ ] All tests pass

---

### Step 4: Integrate Widget into Dashboard Grid

**Objective:** Add the GratitudeWidget to `DashboardWidgetGrid.tsx` in the correct position (after Prayer List, before Streak & Faith Points) with staggered entrance animation.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Add GratitudeWidget card

**Details:**

Insert the gratitude card between Prayer List (order-6) and Streak & Faith Points (order-1/lg:order-3). The new card gets a CSS `order` that places it after Prayer List visually.

**Import:**
```typescript
import { GratitudeWidget } from './GratitudeWidget'
```

**Add animation prop (after `prayerListAnim`, before `streakAnim`):**
```typescript
const gratitudeAnim = getAnimProps()
```

Note: This shifts all subsequent animation delays by 100ms, which is correct for staggering.

**Add card (after Prayer List card, before Streak card):**
```tsx
<DashboardCard
  id="todays-gratitude"
  title="Today's Gratitude"
  icon={<Heart className="h-5 w-5 text-pink-400" />}
  className={cn('order-7 lg:col-span-3', gratitudeAnim.className)}
  style={gratitudeAnim.style}
>
  <GratitudeWidget onGratitudeSaved={() => faithPoints.recordActivity('gratitude')} />
</DashboardCard>
```

**Order adjustments:** When inserting a new card, the `order-*` CSS classes on subsequent cards need to shift up by 1:
- Prayer List: `order-6` (unchanged)
- **Gratitude: `order-7 lg:col-span-3`** (NEW)
- Streak: `order-1 lg:order-3` → unchanged (it uses explicit order-1 for mobile-first)
- Activity Checklist: `order-7` → `order-8`
- Friends: `order-8` → `order-9`
- Weekly Recap: `order-9` → `order-10`
- Quick Actions: `order-10` → `order-11`

**Import Heart icon:** Add `Heart` to the lucide-react import at the top of the file (it's already imported for Prayer List — verify and add if needed).

**Responsive behavior:**
- Desktop: Card sits in left column (`lg:col-span-3`), same as Prayer List
- Mobile: Card stacks in the single column between Prayer List and Activity Checklist

**Guardrails (DO NOT):**
- DO NOT change the col-span of the gratitude card (must be `lg:col-span-3` — left column)
- DO NOT forget to update order numbers on all subsequent cards
- DO NOT remove or reorder existing animation prop calls (only insert `gratitudeAnim` in the right position)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders gratitude card in grid | integration | Verify "Today's Gratitude" heading appears |
| gratitude card has correct icon | integration | Pink Heart icon present |
| gratitude card is collapsible | integration | Click collapse toggle, content hides |
| recordActivity called on save | integration | Fill + save → `recordActivity('gratitude')` called on faithPoints |

**Expected state after completion:**
- [ ] Gratitude widget visible on dashboard between Prayer List and Streak
- [ ] Staggered entrance animation works correctly
- [ ] `recordActivity('gratitude')` fires when gratitude is first saved
- [ ] Existing dashboard tests still pass

---

### Step 5: Update ActivityChecklist Widget

**Objective:** Add gratitude to the ActivityChecklist widget with correct ordering and update progress ring denominator and multiplier preview messages.

**Files to modify:**
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — Insert gratitude into activity list, update multiplier messages

**Details:**

**Activity ordering change (line 15-22):**
The spec says: "Position in the checklist: after `prayerWall` (15 pts) and before `meditate` (20 pts)"

```typescript
// BEFORE: Base 6 activities ordered lowest to highest points
const BASE_ACTIVITY_ORDER: ActivityType[] = [
  'mood',
  'pray',
  'listen',
  'prayerWall',
  'meditate',
  'journal',
]

// AFTER: Base 7 activities with gratitude inserted after prayerWall
const BASE_ACTIVITY_ORDER: ActivityType[] = [
  'mood',       // 5 pts
  'gratitude',  // 5 pts (NEW — after mood since same points, but spec says after prayerWall)
  'pray',       // 10 pts
  'listen',     // 10 pts
  'prayerWall', // 15 pts
  'meditate',   // 20 pts
  'journal',    // 25 pts
]
```

Wait — the spec says "after `prayerWall` (15 pts) and before `meditate` (20 pts)." But gratitude is 5 pts, which would break the ascending order. Re-reading spec: "follows the ascending-points ordering pattern." At 5 pts, gratitude ties with mood. The spec explicitly says position between prayerWall and meditate, so honor that placement despite the points being lower:

```typescript
const BASE_ACTIVITY_ORDER: ActivityType[] = [
  'mood',       // 5 pts
  'pray',       // 10 pts
  'listen',     // 10 pts
  'prayerWall', // 15 pts
  'gratitude',  // 5 pts (NEW — spec: "after prayerWall and before meditate")
  'meditate',   // 20 pts
  'journal',    // 25 pts
]
```

**Reading plan insertion:** With `gratitude` now at index 4 and `readingPlan` inserted at index 4 when active, the logic changes:
```typescript
const activityList: ActivityType[] = hasActivePlan
  ? [...BASE_ACTIVITY_ORDER.slice(0, 4), 'readingPlan', ...BASE_ACTIVITY_ORDER.slice(4)]
  : BASE_ACTIVITY_ORDER
```
This inserts `readingPlan` (15pts) between `prayerWall` and `gratitude`, which makes the order: mood, pray, listen, prayerWall, readingPlan, gratitude, meditate, journal. That's fine — readingPlan (15pts) sits between prayerWall (15pts) and gratitude (5pts).

**Total activities:** 7 base (was 6), 8 with reading plan (was 7).

**Multiplier preview messages (line 27-53):** Update to reflect 7 base activities:
```typescript
function getMultiplierPreview(completedCount: number, totalActivities: number) {
  if (completedCount >= 7) {
    return { text: 'Full Worship Day! 2x points earned!', isCelebration: true }
  }
  switch (completedCount) {
    case 0: return { text: 'Complete 2 activities for 1.25x bonus!', isCelebration: false }
    case 1: return { text: 'Complete 1 more for 1.25x bonus!', isCelebration: false }
    case 2: return { text: 'Complete 2 more for 1.5x bonus!', isCelebration: false }
    case 3: return { text: 'Complete 1 more for 1.5x bonus!', isCelebration: false }
    case 4: return { text: 'Complete 3 more for 2x Full Worship Day!', isCelebration: false }
    case 5: return { text: 'Complete 2 more for 2x Full Worship Day!', isCelebration: false }
    case 6: return { text: `Complete ${totalActivities > 7 ? '2 more' : '1 more'} for 2x Full Worship Day!`, isCelebration: false }
    default: return { text: '', isCelebration: false }
  }
}
```

**Guardrails (DO NOT):**
- DO NOT change the existing `CircleCheck`/`Circle`/`BookOpen` icon logic
- DO NOT modify the progress ring SVG dimensions or colors
- DO NOT change the reduced motion behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders gratitude in activity list | integration | "Give thanks" label + "+5 pts" visible |
| gratitude positioned after prayerWall | integration | Check DOM order: prayerWall before gratitude |
| progress ring shows /7 denominator | integration | Ring aria-label includes "of 7" |
| progress ring shows /8 with reading plan | integration | With active plan, aria-label includes "of 8" |
| Full Worship Day at 7 activities | integration | Complete 7 → celebration message |
| multiplier preview at 6 of 7 | integration | "Complete 1 more for 2x Full Worship Day!" |

**Expected state after completion:**
- [ ] "Give thanks" appears in activity checklist between "Pray for someone" and "Meditate"
- [ ] Progress ring denominator is 7 (or 8 with reading plan)
- [ ] Full Worship Day message fires at 7 completed activities
- [ ] Multiplier preview messages are correct at each step

---

### Step 6: Update Insights Page — Gratitude Correlation & Streak

**Objective:** Add a gratitude correlation entry to the mock correlation chart and display a gratitude streak stat on the insights page.

**Files to modify:**
- `frontend/src/components/insights/ActivityCorrelations.tsx` — Add gratitude to `MOCK_CORRELATION_DATA`
- `frontend/src/pages/Insights.tsx` — Add gratitude streak stat section

**Files to create:**
- `frontend/src/components/insights/GratitudeStreak.tsx` — Gratitude streak display component
- `frontend/src/components/insights/__tests__/GratitudeStreak.test.tsx` — Tests

**Details:**

**ActivityCorrelations.tsx — Add to mock data (line 18-23):**
```typescript
const MOCK_CORRELATION_DATA = [
  { activity: 'Journaling', withActivity: 4.2, withoutActivity: 3.1 },
  { activity: 'Prayer', withActivity: 4.0, withoutActivity: 3.3 },
  { activity: 'Meditation', withActivity: 4.4, withoutActivity: 3.0 },
  { activity: 'Gratitude', withActivity: 4.3, withoutActivity: 3.1 },  // NEW
  { activity: 'Reading Plan', withActivity: 4.1, withoutActivity: 3.2 },
]
```

**GratitudeStreak component:**
```tsx
import { Heart } from 'lucide-react';
import { getGratitudeStreak } from '@/services/gratitude-storage';

export function GratitudeStreak() {
  const streak = getGratitudeStreak();

  // Only show when 2+ consecutive days
  if (streak < 2) return null;

  return (
    <section
      aria-label="Gratitude streak"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="flex items-center gap-3">
        <Heart className="h-5 w-5 text-pink-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">
            Gratitude Streak: {streak} days
          </p>
          <p className="text-xs text-white/50">
            You&apos;ve counted your blessings {streak} days in a row
          </p>
        </div>
      </div>
    </section>
  );
}
```

**Insights.tsx — Insert GratitudeStreak after ActivityCorrelations:**
```tsx
import { GratitudeStreak } from '@/components/insights/GratitudeStreak'

// After ActivityCorrelations AnimatedSection (around line 260):
<AnimatedSection index={entries.length > 0 ? 3.5 : 2.5}>
  <GratitudeStreak />
</AnimatedSection>
```

Note: The `index` prop for AnimatedSection controls animation delay. Since we're inserting between correlations and scripture connections, the indexes of subsequent sections need to shift up by 1. Alternatively, use a fractional index (3.5) — the actual calculation is `index * 100`ms delay, so 3.5 gives 350ms which is fine. But to keep it clean, increment all subsequent indexes by 1.

**Responsive behavior:**
- All breakpoints: Single full-width card within `max-w-5xl` container (same as other insights sections)

**Guardrails (DO NOT):**
- DO NOT modify existing mock correlation data values
- DO NOT show gratitude streak when streak < 2
- DO NOT add real data calculation (this is frontend-first with mock data for correlations)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ActivityCorrelations includes Gratitude | integration | "Gratitude" label appears in chart |
| GratitudeStreak — hidden when streak < 2 | unit | 0 or 1 consecutive days → component returns null |
| GratitudeStreak — shows when streak >= 2 | unit | 3 consecutive days → "Gratitude Streak: 3 days" visible |
| GratitudeStreak — correct description | unit | Description text matches pattern |

**Expected state after completion:**
- [ ] Gratitude bar appears in correlation chart on `/insights`
- [ ] Gratitude streak stat displays when user has 2+ consecutive days
- [ ] Insights page layout is not broken
- [ ] All existing insights tests still pass

---

### Step 7: Update JourneySection on Landing Page

**Objective:** Add a "Give Thanks" step to the Journey to Healing timeline between Meditate and Music.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — Insert new step at index 3, renumber steps

**Details:**

**Updated JOURNEY_STEPS array (insert at index 3, renumber all):**
```typescript
const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    prefix: 'Learn to',
    highlight: 'Pray',
    description: "Begin with what\u2019s on your heart...",
    to: '/pray',
  },
  {
    number: 2,
    prefix: 'Learn to',
    highlight: 'Journal',
    description: 'Put your thoughts into words...',
    to: '/journal',
  },
  {
    number: 3,
    prefix: 'Learn to',
    highlight: 'Meditate',
    description: 'Quiet your mind with guided meditations...',
    to: '/meditate',
  },
  {
    number: 4,                        // NEW
    prefix: 'Give',                    // NEW
    highlight: 'Thanks',               // NEW
    description: 'Count your blessings and watch your perspective shift.',  // NEW
    to: '/',                           // Links to dashboard
  },
  {
    number: 5,                        // WAS 4
    prefix: 'Listen to',
    highlight: 'Music',
    description: 'Let music carry you deeper...',
    to: '/music',
  },
  {
    number: 6,                        // WAS 5
    prefix: 'Write on the',
    highlight: 'Prayer Wall',
    description: "You\u2019re not alone...",
    to: '/prayer-wall',
  },
  {
    number: 7,                        // WAS 6
    prefix: 'Find',
    highlight: 'Local Support',
    description: 'Find churches and Christian counselors near you...',
    to: '/local-support/churches',
  },
]
```

**Guardrails (DO NOT):**
- DO NOT change existing step descriptions or routes (only renumber)
- DO NOT change the `StepCircle` component (it already renders `step.number`)
- DO NOT add auth gating to this step (landing page is public)

**Responsive behavior:** No changes needed — the JourneySection is already responsive (vertical timeline, staggered reveal).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 7 journey steps | integration | 7 list items rendered (was 6) |
| Give Thanks step present | integration | "Give Thanks" text and description visible |
| Give Thanks links to / | integration | Link `to="/"` |
| step numbering is sequential | integration | Numbers 1-7 in order |
| steps after Give Thanks renumbered | integration | Music is 5, Prayer Wall is 6, Local Support is 7 |

**Expected state after completion:**
- [ ] JourneySection shows 7 steps (was 6)
- [ ] "Give Thanks" appears between Meditate and Music
- [ ] All step numbers are sequential 1-7
- [ ] Landing page renders correctly
- [ ] Existing JourneySection tests updated/pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend activity system types & constants |
| 2 | — | Create gratitude storage service |
| 3 | 1, 2 | Create GratitudeWidget component (needs types + storage) |
| 4 | 3 | Integrate widget into dashboard grid (needs widget component) |
| 5 | 1 | Update ActivityChecklist (needs activity type additions) |
| 6 | 2 | Update Insights page (needs storage service for streak) |
| 7 | — | Update JourneySection (independent) |

**Parallelizable:** Steps 1, 2, and 7 can be done in parallel. Steps 5 and 6 can be done in parallel after their dependencies.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend Activity System Types & Constants | [COMPLETE] | 2026-03-22 | Modified: types/dashboard.ts, constants/dashboard/activity-points.ts, services/faith-points-storage.ts, hooks/useFaithPoints.ts, constants/dashboard/badges.ts, services/badge-storage.ts, hooks/useProfileData.ts. Also fixed 8 test files to include gratitude field. |
| 2 | Create Gratitude Storage Service | [COMPLETE] | 2026-03-22 | Created: services/gratitude-storage.ts, services/__tests__/gratitude-storage.test.ts (16 tests) |
| 3 | Create GratitudeWidget Component | [COMPLETE] | 2026-03-22 | Created: components/dashboard/GratitudeWidget.tsx, components/dashboard/__tests__/GratitudeWidget.test.tsx (13 tests) |
| 4 | Integrate Widget into Dashboard Grid | [COMPLETE] | 2026-03-22 | Modified: components/dashboard/DashboardWidgetGrid.tsx — added GratitudeWidget import, gratitudeAnim prop, card at order-7, shifted subsequent orders by 1 |
| 5 | Update ActivityChecklist Widget | [COMPLETE] | 2026-03-22 | Modified: components/dashboard/ActivityChecklist.tsx — added gratitude to BASE_ACTIVITY_ORDER (7 items), updated multiplier preview messages for 7-activity threshold. Updated ActivityChecklist.test.tsx assertions for new counts. |
| 6 | Update Insights Page — Gratitude Correlation & Streak | [COMPLETE] | 2026-03-22 | Modified: ActivityCorrelations.tsx (added Gratitude mock data), Insights.tsx (added GratitudeStreak section). Created: GratitudeStreak.tsx, GratitudeStreak.test.tsx (5 tests) |
| 7 | Update JourneySection on Landing Page | [COMPLETE] | 2026-03-22 | Modified: JourneySection.tsx (inserted Give Thanks step at index 3, renumbered 1-7), JourneySection.test.tsx (updated all assertions for 7 steps) |
