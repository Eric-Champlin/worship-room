# Implementation Plan: Mood Check-In System

**Spec:** `_specs/mood-check-in-system.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/mood-check-in-system`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (new component, no external page to recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Project Structure (Relevant)

```
frontend/src/
├── components/
│   ├── daily/          # CrisisBanner.tsx lives here
│   ├── dashboard/      # ← NEW (does not exist yet)
│   ├── prayer-wall/    # AuthModalProvider.tsx
│   ├── ui/             # Toast.tsx
│   ├── Layout.tsx
│   └── Navbar.tsx
├── hooks/
│   └── useAuth.ts      # Current stub: { user: null, isLoggedIn: false }
├── constants/
│   ├── crisis-resources.ts  # containsCrisisKeyword(), CRISIS_RESOURCES, SELF_HARM_KEYWORDS
│   ├── dashboard/      # ← NEW (does not exist yet)
│   └── ...
├── types/
│   └── dashboard.ts    # ← NEW (does not exist yet)
├── utils/              # ← NEW directory (does not exist yet)
├── lib/                # cn(), timeAgo(), query-client
├── pages/
│   └── Home.tsx        # Landing page, currently renders at /
└── App.tsx             # Routes + providers
```

### Key Existing Patterns

- **App.tsx Provider Nesting**: `QueryClientProvider > BrowserRouter > ToastProvider > AuthModalProvider > AudioProvider > Routes`. New `AuthProvider` (Spec 2) will wrap inside `ToastProvider`.
- **Current Route for `/`**: `<Route path="/" element={<Home />} />` — needs to become conditional (Spec 2 builds `AuthProvider`; this spec builds the check-in component that Spec 2's Dashboard page will conditionally render).
- **`useAuth()` hook** (`hooks/useAuth.ts`): Stub returning `{ user: null, isLoggedIn: false }`. Interface: `AuthUser { id, firstName, lastName, email }` + `AuthState { user, isLoggedIn }`. Spec 2 replaces this with a real context-based `AuthProvider`. **This spec must NOT modify `useAuth.ts`** — instead, it imports `useAuth()` and lets Spec 2 make it functional.
- **Crisis Detection**: `containsCrisisKeyword(text)` in `constants/crisis-resources.ts` — exact lowercase keyword match against `SELF_HARM_KEYWORDS` array. Returns boolean. `CrisisBanner` component in `components/daily/CrisisBanner.tsx` uses `role="alert"` and `aria-live="assertive"`, renders only when `containsCrisisKeyword(text)` is true.
- **Test Patterns**: Vitest + RTL. Tests in `__tests__/` subdirectories or co-located `.test.tsx` files. No provider wrapping needed for simple components (see `CrisisBanner.test.tsx`). For components needing routing: wrap in `MemoryRouter` with `future` flags. Mock hooks with `vi.mock()`.
- **Tailwind Config**: Custom colors (`primary`, `hero-dark`, `hero-mid`, `glow-cyan`, `warning`, `danger`), fonts (`font-sans`=Inter, `font-serif`=Lora, `font-script`=Caveat), animations (`animate-fade-in`, `animate-glow-pulse`). **No mood colors in config yet.**
- **localStorage Pattern**: Keys prefixed `wr_`. Direct `localStorage.getItem/setItem` with JSON parse/stringify. No abstraction layer needed for this spec.

### Spec Dependency Context

- **This spec (Spec 1)** delivers: `MoodCheckIn` component, `MoodEntry` type, mood constants, date utilities, mood localStorage service.
- **Spec 2 (Dashboard Shell)** delivers: `AuthProvider` context, `Dashboard` page with conditional check-in render, route switching in `App.tsx`. **Spec 2 consumes this spec's `MoodCheckIn` component.**
- **Spec 3 (Mood Insights Widget)** reads `wr_mood_entries` via `useMoodChartData()`.
- **Spec 5 (Streak & Faith Points)** calls `recordActivity('mood')` after check-in.

**Important**: Since Spec 2 doesn't exist yet, `MoodCheckIn` must be buildable and testable independently. Tests will mock `useAuth()` to simulate logged-in state. The component accepts `onComplete` and `onSkip` callbacks — Spec 2's Dashboard wires these up.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View mood check-in | Only logged-in users see check-in (logged-out see landing page) | Step 5 | Component accepts `userName` prop; Spec 2 gates rendering via `isAuthenticated` |
| Select a mood orb | Logged-in only | Step 5 | Inherits from parent gate (check-in only renders for authenticated users) |
| Enter optional text | Logged-in only | Step 5 | Inherits from parent gate |
| Save mood to localStorage | Logged-in only | Step 3 | `saveMoodEntry()` is called from `onComplete` callback; Spec 2 gates entry to check-in |
| Skip check-in | Logged-in only | Step 5 | Inherits from parent gate |

**Note**: Auth gating is handled at the Dashboard page level (Spec 2), not within `MoodCheckIn` itself. The check-in component is only rendered when the user is authenticated. This spec ensures `MoodCheckIn` does not independently call `useAuth()` for gating — it trusts its parent.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Full-screen BG | background | `radial-gradient(ellipse at 50% 30%, rgb(59, 7, 100) 0%, transparent 60%), linear-gradient(rgb(13, 6, 32) 0%, rgb(30, 11, 62) 50%, rgb(13, 6, 32) 100%)` | design-system.md hero gradient (adapted for full-screen dark — fades to hero-dark, not neutral-bg) |
| Greeting text | font | `font-serif text-2xl md:text-3xl text-white/90` (Lora) | Spec + design-system.md (Lora for warm serif) |
| Mood orb labels | font | `font-sans text-sm text-white/70` (Inter) | Spec |
| Textarea | background | `bg-white/5` | Spec (dark variant — differs from Daily Hub's white textarea) |
| Textarea | border | `border border-white/15 rounded-xl` | Spec |
| Textarea | focus border | `focus:border-glow-cyan/50` (glow-cyan = `#00D4FF`) | Adapted from glow pattern in design-system.md |
| Textarea | placeholder | `placeholder:text-white/40` | Spec |
| Continue button | style | `bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-2 font-semibold` | design-system.md Primary CTA pattern |
| Skip link | style | `text-sm text-white/40 hover:text-white/60 underline underline-offset-4` | Spec |
| Verse text | font | `font-serif italic text-xl md:text-2xl text-white/90` (Lora italic) | Spec + design-system.md |
| Verse reference | font | `font-sans text-sm text-white/50` (Inter) | Spec |
| Crisis banner | base classes | `rounded-lg border border-warning/30 bg-warning/10 p-4` | Existing `CrisisBanner.tsx` |
| Mood: Struggling | color | `#D97706` | Spec + master plan |
| Mood: Heavy | color | `#C2703E` | Spec + master plan |
| Mood: Okay | color | `#8B7FA8` | Spec + master plan |
| Mood: Good | color | `#2DD4BF` | Spec + master plan |
| Mood: Thriving | color | `#34D399` | Spec + master plan |
| Orb size (mobile) | diameter | 56px (`w-14 h-14`) | Spec |
| Orb size (tablet) | diameter | 60px (`w-15 h-15` → use `w-[60px] h-[60px]`) | Spec |
| Orb size (desktop) | diameter | 64px (`w-16 h-16`) | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Lora (`font-serif`) for scripture/verse text, NOT Caveat (`font-script`). Caveat is for hero headings with highlighted words.
- The check-in greeting uses `font-serif` (Lora) for a warm, personal feel — NOT the Caveat hero style.
- Existing glow textarea pattern (Pray/Journal tabs) uses white bg on light pages. This check-in uses dark bg — adapt to `bg-white/5` with `text-white` and `border-white/15`.
- Mood colors: Struggling=`#D97706`, Heavy=`#C2703E`, Okay=`#8B7FA8`, Good=`#2DD4BF`, Thriving=`#34D399`.
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` — but the check-in is a full-screen overlay, not a card.
- `prefers-reduced-motion` must disable all animations: orb pulse, fade transitions, slide-in textarea. Use `motion-safe:` prefix or media query.
- Crisis banner re-uses the existing `CrisisBanner.tsx` pattern but adapted for dark background context.
- `animate-fade-in` (500ms) exists in tailwind config — reusable for entrance animation.

---

## Shared Data Models (from Master Plan)

```typescript
// types/dashboard.ts — MoodEntry (this spec defines it, all downstream specs consume it)
export interface MoodEntry {
  id: string;              // crypto.randomUUID()
  date: string;            // YYYY-MM-DD (local timezone via getLocalDateString())
  mood: 1 | 2 | 3 | 4 | 5;
  moodLabel: 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';
  text?: string;           // Optional, max 280 chars
  timestamp: number;       // Date.now() — Unix ms
  verseSeen: string;       // Verse reference (e.g., "Psalm 34:18")
}

export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Both | JSON array of MoodEntry objects, max 365, ordered date desc |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Full viewport, orbs 56px in 2-row layout (3+2), text-2xl greeting, full-width textarea, skip at bottom |
| Tablet | 640–1024px | Orbs 60px in single row, text-3xl greeting, content max-w-[600px] centered |
| Desktop | > 1024px | Orbs 64px in single row with generous spacing, content max-w-[640px] centered |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Greeting → Mood orbs | 32–40px (`mb-8` to `mb-10`) | [UNVERIFIED] based on spec "generous spacing" language |
| Mood orbs → Textarea | 24px (`mt-6`) | Spec: textarea slides in below orbs |
| Textarea → Continue button | 16px (`mt-4`) | Standard form spacing |
| Continue button → Skip link | 24–32px (`mt-6` to `mt-8`) | Spec: skip at "very bottom", understated |

→ To verify: Run `/verify-with-playwright` and adjust spacing visually
→ If wrong: Update Tailwind margin classes to match desired visual feel

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/mood-check-in-system` is current and clean
- [ ] `pnpm install` has been run, no broken dependencies
- [ ] `pnpm test` passes (existing test suite green)
- [ ] Spec 2 (AuthProvider, Dashboard page) does NOT need to exist first — this spec builds a standalone component with `onComplete`/`onSkip` callbacks that Spec 2 wires up
- [ ] All auth-gated actions from the spec are accounted for in the plan (gated at Dashboard level, not within MoodCheckIn)
- [ ] Design system values are verified from design-system.md recon (loaded)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] This is the first spec in the Phase 2.75 sequence — no prior specs to depend on

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where does MoodCheckIn render? | Inside Dashboard page (Spec 2), NOT as a portal or separate route | Spec says "conditional render inside the Dashboard page component" — not a route |
| How does this spec work without Spec 2? | MoodCheckIn is a standalone component accepting `userName`, `onComplete`, `onSkip` props. Testable independently. | Decouples build order — Spec 2 just wraps it |
| Crisis banner: reuse CrisisBanner.tsx or build custom? | Build a dark-themed variant inline in MoodCheckIn | Existing CrisisBanner uses light theme colors (`bg-warning/10`, `text-text-dark`). Check-in needs dark variant. Import constants from `crisis-resources.ts`. |
| Skip tracking: sessionStorage or React state? | React state (lifted to parent via `onSkip` callback) | Spec says "session-level state (React state or sessionStorage)". React state is simpler and resets naturally on page reload. Spec 2's Dashboard holds `skippedToday` state. |
| Auto-advance timer: which API? | `setTimeout` with cleanup in `useEffect` return | 3-second verse display, then call `onComplete`. Timer cleared on unmount. |
| Character counter warning threshold | 250 chars → warning, 280 → danger (at limit) | Per spec: "Turns text-warning at 250+ chars, text-danger at 280" |
| UUID generation | `crypto.randomUUID()` | Modern browsers all support it. Fallback not needed for MVP. |
| Midnight rollover | `useRef` flag checked once on mount, never re-checked reactively | Spec: "Only check hasCheckedInToday() on initial component mount" |
| Corrupted localStorage | try-catch with fallback to empty array | Spec: "If wr_mood_entries contains invalid JSON, treat as empty array" |

---

## Implementation Steps

### Step 1: Shared Date Utilities

**Objective:** Create `utils/date.ts` with local-timezone date functions used by all dashboard specs.

**Files to create:**
- `frontend/src/utils/date.ts` — 3 exported functions
- `frontend/src/utils/__tests__/date.test.ts` — unit tests

**Details:**

```typescript
// utils/date.ts
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return getLocalDateString(monday);
}
```

**Guardrails (DO NOT):**
- DO NOT use `toISOString().split('T')[0]` — returns UTC, not local time
- DO NOT use `Intl.DateTimeFormat` for the date string — the manual approach is simpler and avoids locale-dependent formatting
- DO NOT add dependencies — pure JS only

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getLocalDateString()` returns YYYY-MM-DD format | unit | Verify format with known date |
| `getLocalDateString()` uses local timezone | unit | Mock `Date` to 11:30pm EST (UTC next day) and verify it returns today's date in local tz |
| `getLocalDateString(customDate)` works with arg | unit | Pass specific Date object |
| `getYesterdayDateString()` returns previous day | unit | Verify it's one day before today |
| `getCurrentWeekStart()` returns Monday | unit | Test with various days of the week |
| `getCurrentWeekStart()` handles Sunday edge case | unit | Sunday should return previous Monday |

**Expected state after completion:**
- [ ] `frontend/src/utils/date.ts` exists with 3 exported functions
- [ ] `frontend/src/utils/__tests__/date.test.ts` passes all tests
- [ ] No other files modified

---

### Step 2: MoodEntry Type and Mood Constants

**Objective:** Create the MoodEntry type definition and mood-related constants (colors, labels, verses).

**Files to create:**
- `frontend/src/types/dashboard.ts` — MoodEntry interface and related types
- `frontend/src/constants/dashboard/mood.ts` — mood colors, labels, verses

**Details:**

**`types/dashboard.ts`:**
```typescript
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
}
```

**`constants/dashboard/mood.ts`:**
```typescript
import type { MoodValue, MoodLabel } from '@/types/dashboard';

export interface MoodOption {
  value: MoodValue;
  label: MoodLabel;
  color: string;
  verse: string;
  verseReference: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    value: 1,
    label: 'Struggling',
    color: '#D97706',
    verse: 'The Lord is near to the brokenhearted, and saves those who have a crushed spirit.',
    verseReference: 'Psalm 34:18',
  },
  {
    value: 2,
    label: 'Heavy',
    color: '#C2703E',
    verse: 'Cast your burden on the Lord, and he will sustain you.',
    verseReference: 'Psalm 55:22',
  },
  {
    value: 3,
    label: 'Okay',
    color: '#8B7FA8',
    verse: 'Be still, and know that I am God.',
    verseReference: 'Psalm 46:10',
  },
  {
    value: 4,
    label: 'Good',
    color: '#2DD4BF',
    verse: 'Give thanks to the Lord, for he is good, for his loving kindness endures forever.',
    verseReference: 'Psalm 107:1',
  },
  {
    value: 5,
    label: 'Thriving',
    color: '#34D399',
    verse: 'This is the day that the Lord has made. We will rejoice and be glad in it!',
    verseReference: 'Psalm 118:24',
  },
];

export const MOOD_COLORS: Record<MoodValue, string> = {
  1: '#D97706',
  2: '#C2703E',
  3: '#8B7FA8',
  4: '#2DD4BF',
  5: '#34D399',
};

export const MAX_MOOD_TEXT_LENGTH = 280;
export const MOOD_TEXT_WARNING_THRESHOLD = 250;
export const VERSE_DISPLAY_DURATION_MS = 3000;
export const MAX_MOOD_ENTRIES = 365;
```

**Guardrails (DO NOT):**
- DO NOT add any non-WEB Bible translations
- DO NOT add AI-generated verses — these are hardcoded constants for ritual familiarity
- DO NOT define `MOOD_COLORS` in `tailwind.config.js` — use inline styles for dynamic mood colors since they're data-driven, not design tokens

**Test specifications:**
No tests needed for type definitions and constants.

**Expected state after completion:**
- [ ] `frontend/src/types/dashboard.ts` exists with `MoodEntry`, `MoodValue`, `MoodLabel`
- [ ] `frontend/src/constants/dashboard/mood.ts` exists with `MOOD_OPTIONS`, `MOOD_COLORS`, and other constants
- [ ] No other files modified

---

### Step 3: Mood Entry localStorage Service

**Objective:** Create a service module for reading/writing mood entries to localStorage with validation, corruption handling, and 365-entry cap.

**Files to create:**
- `frontend/src/services/mood-storage.ts` — CRUD operations for `wr_mood_entries`
- `frontend/src/services/__tests__/mood-storage.test.ts` — unit tests

**Details:**

```typescript
// services/mood-storage.ts
import type { MoodEntry } from '@/types/dashboard';
import { getLocalDateString } from '@/utils/date';
import { MAX_MOOD_ENTRIES } from '@/constants/dashboard/mood';

const STORAGE_KEY = 'wr_mood_entries';

export function getMoodEntries(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return []; // Corrupted JSON → treat as empty
  }
}

export function hasCheckedInToday(): boolean {
  const today = getLocalDateString();
  const entries = getMoodEntries();
  return entries.some((e) => e.date === today);
}

export function saveMoodEntry(entry: MoodEntry): void {
  const entries = getMoodEntries();
  // Prepend new entry (date descending order)
  entries.unshift(entry);
  // Cap at MAX_MOOD_ENTRIES
  if (entries.length > MAX_MOOD_ENTRIES) {
    entries.length = MAX_MOOD_ENTRIES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
```

**Guardrails (DO NOT):**
- DO NOT write to localStorage for logged-out users (caller is responsible — this service is only called after auth gating)
- DO NOT use `toISOString()` anywhere in this module — use `getLocalDateString()`
- DO NOT silently swallow errors on write — only on read (corrupted data recovery)
- DO NOT sort entries on read — maintain insertion order (newest first via `unshift`)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getMoodEntries()` returns empty for missing key | unit | No `wr_mood_entries` in localStorage |
| `getMoodEntries()` returns empty for corrupted JSON | unit | Set invalid JSON, verify empty array returned |
| `getMoodEntries()` returns empty for non-array JSON | unit | Set `"hello"`, verify empty array |
| `getMoodEntries()` returns valid entries | unit | Set valid JSON array, verify returned |
| `hasCheckedInToday()` returns true when entry exists for today | unit | Add entry with today's date |
| `hasCheckedInToday()` returns false when no entry for today | unit | Add entry with yesterday's date only |
| `hasCheckedInToday()` returns false for empty entries | unit | No entries at all |
| `saveMoodEntry()` prepends entry | unit | Save entry, verify it's first in array |
| `saveMoodEntry()` caps at 365 entries | unit | Pre-fill 365 entries, save one more, verify length is 365 and oldest is removed |
| `saveMoodEntry()` handles first-ever save | unit | No existing key, save entry, verify array of 1 |

**Expected state after completion:**
- [ ] `frontend/src/services/mood-storage.ts` exists with 3 exported functions
- [ ] `frontend/src/services/__tests__/mood-storage.test.ts` passes all tests
- [ ] No other files modified

---

### Step 4: Tailwind Config — Mood Orb Animations

**Objective:** Add a subtle mood orb pulse keyframe and animation to `tailwind.config.js` for the idle orb state.

**Files to modify:**
- `frontend/tailwind.config.js` — add `mood-pulse` keyframe and animation

**Details:**

Add to `keyframes`:
```javascript
'mood-pulse': {
  '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
  '50%': { opacity: '1', transform: 'scale(1.05)' },
},
```

Add to `animation`:
```javascript
'mood-pulse': 'mood-pulse 3s ease-in-out infinite',
```

This creates a gentle, subtle pulse that's less aggressive than the standard Tailwind `animate-pulse` (which is opacity-only at 2s). The check-in's spiritual/peaceful context warrants a softer, slower pulse.

**Guardrails (DO NOT):**
- DO NOT modify existing keyframes or animations
- DO NOT add mood colors to the Tailwind config (use inline styles for data-driven colors)
- DO NOT remove or rename any existing entries

**Test specifications:**
No tests needed — visual only, verified by `/verify-with-playwright`.

**Expected state after completion:**
- [ ] `tailwind.config.js` has `mood-pulse` keyframe and animation
- [ ] No other files modified
- [ ] `pnpm build` succeeds

---

### Step 5: MoodCheckIn Component

**Objective:** Build the full-screen `MoodCheckIn` component with the complete state machine: idle → mood_selected → text_input → crisis_check → verse_display/crisis_banner → complete.

**Files to create:**
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — main component

**Details:**

**Props interface:**
```typescript
interface MoodCheckInProps {
  userName: string;        // Display name for greeting
  onComplete: (entry: MoodEntry) => void;  // Called when check-in completes (verse auto-advance or crisis banner dismiss)
  onSkip: () => void;      // Called when user taps "Not right now"
}
```

**State machine (React state):**
```typescript
type CheckInPhase = 'idle' | 'mood_selected' | 'verse_display' | 'crisis_banner';
const [phase, setPhase] = useState<CheckInPhase>('idle');
const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
const [text, setText] = useState('');
```

**Component structure:**
```
<div role="dialog" aria-labelledby="checkin-greeting" className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Dark radial gradient background */}

  {phase === 'idle' || phase === 'mood_selected' ? (
    <div> {/* Main check-in content */}
      <h1 id="checkin-greeting">How are you feeling today, {userName}?</h1>
      <MoodOrbGroup />      {/* radiogroup with 5 orbs */}
      {phase === 'mood_selected' && <TextInputSection />}
      {phase === 'mood_selected' && <ContinueButton />}
      <SkipLink />
    </div>
  ) : phase === 'verse_display' ? (
    <VerseDisplay />         {/* Auto-advances after 3s */}
  ) : phase === 'crisis_banner' ? (
    <CrisisBannerDark />     {/* Dismiss to complete */}
  ) : null}
</div>
```

**Mood Orb RadioGroup:**
- `role="radiogroup"` with `aria-label="Select your mood"`
- Each orb: `role="radio"`, `aria-checked`, `aria-label={label}`, `tabIndex` managed for roving tabindex
- Arrow key navigation (Left/Right cycle through moods), Enter/Space selects
- Orb visual: circular div with inline `backgroundColor` using mood color at 20% opacity idle, 100% opacity on hover, scale(1.15) + full glow on selected
- Mobile layout: `flex flex-wrap justify-center gap-4` with first 3 in one row, last 2 centered below (use `basis-1/3` for first row items, center the remaining)
- Desktop layout: `flex justify-center gap-6` single row

**Background gradient:**
```
className="bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]"
```
(Adapted from homepage hero radial gradient in design-system.md, but closes to dark on all edges for a full-screen dark feel.)

**Textarea section (slides in after mood selection):**
- `bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/40`
- Focus: `focus:border-glow-cyan/50 focus:outline-none`
- `maxLength={280}` on the textarea element
- Character counter below textarea: `text-xs text-white/40`, turns `text-warning` at 250+, turns `text-danger` at 280
- Slide-in animation: `motion-safe:animate-fade-in` (existing 500ms animation works)

**Continue button:**
- `bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-2 font-semibold`
- `focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none`
- Always enabled (text is optional)
- onClick handler:
  1. If text is non-empty, check `containsCrisisKeyword(text)` — if true, set phase to `'crisis_banner'`
  2. Otherwise, set phase to `'verse_display'`
  3. Save mood entry via `saveMoodEntry()` in both paths

**Skip link:**
- `text-sm text-white/40 hover:text-white/60 underline underline-offset-4`
- `focus-visible:text-white/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30`
- Minimum touch target: `min-h-[44px] inline-flex items-center`
- Calls `onSkip()` on click

**Verse display:**
- Fade-in: `motion-safe:animate-fade-in`
- Verse text: `font-serif italic text-xl md:text-2xl text-white/90 text-center max-w-lg mx-auto`
- Verse reference: `font-sans text-sm text-white/50 mt-3 text-center`
- `aria-live="polite"` region wrapping verse text so screen readers announce it
- `useEffect` with `setTimeout(3000)` to call `onComplete(entry)` after 3 seconds
- Clean up timer on unmount

**Crisis banner (dark variant):**
- Adapts the `CrisisBanner` content for dark background: `bg-warning/15 border border-warning/30 rounded-xl p-6`
- `role="alert"` with `aria-live="assertive"`
- Heading: `text-white font-semibold mb-3`
- Resources: `text-white/80`, phone links in `text-glow-cyan underline`
- "Continue to Dashboard" button below: `bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-lg px-6 py-2`
- On dismiss: calls `onComplete(entry)` (mood entry was already saved)

**Entry creation (in the Continue handler, before phase transition):**
```typescript
const entry: MoodEntry = {
  id: crypto.randomUUID(),
  date: getLocalDateString(),
  mood: selectedMood.value,
  moodLabel: selectedMood.label,
  text: text.trim() || undefined,
  timestamp: Date.now(),
  verseSeen: selectedMood.verseReference,
};
saveMoodEntry(entry);
```

**Animations:**
- Entrance: entire component fades in via `motion-safe:animate-fade-in`
- Mood orb idle pulse: `motion-safe:animate-mood-pulse` (from Step 4)
- Selected orb: `transition-all duration-200 scale-[1.15]` with `shadow-[0_0_20px_var(--mood-color)]`
- Unselected orbs: `transition-all duration-200 opacity-30`
- Textarea slide-in: `motion-safe:animate-fade-in`
- Phase transitions: CSS transitions on opacity (managed via conditional rendering + animation classes)
- `prefers-reduced-motion`: All `motion-safe:` prefixed animations are disabled. Transitions become instant.

**Auth gating (if applicable):**
- No auth check within MoodCheckIn — parent (Dashboard, Spec 2) handles rendering
- Component trusts it's only rendered for authenticated users

**Responsive behavior:**
- Desktop (> 1024px): Orbs 64px, single row, content max-w-[640px], text-3xl greeting
- Tablet (640–1024px): Orbs 60px, single row, content max-w-[600px], text-3xl greeting
- Mobile (< 640px): Orbs 56px, 2-row layout (3+2), full-width textarea with px-4, text-2xl greeting

**Guardrails (DO NOT):**
- DO NOT import or call `useAuth()` inside this component — it receives `userName` as a prop
- DO NOT use `dangerouslySetInnerHTML` for any text content
- DO NOT use `position: fixed` with scroll — the check-in fills viewport without scrolling (content is minimal)
- DO NOT add a Continue button during verse display — the moment is cinematic (spec requirement)
- DO NOT re-check `hasCheckedInToday()` reactively — parent handles this on mount
- DO NOT use `animate-pulse` (default Tailwind) — use `animate-mood-pulse` (softer, 3s)
- DO NOT forget `aria-live="polite"` on the verse region — screen readers need to catch it before 3s auto-advance
- DO NOT use Caveat font for the greeting — use Lora (`font-serif`) for warmth

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders greeting with user name | unit | `getByText(/How are you feeling today, Eric/i)` |
| Renders all 5 mood orbs with correct labels | unit | Check for "Struggling", "Heavy", "Okay", "Good", "Thriving" |
| Mood orbs have radiogroup/radio roles | unit | `getByRole('radiogroup')`, `getAllByRole('radio')` returns 5 |
| Selecting a mood shows textarea and Continue button | integration | Click orb → textarea appears, Continue button appears |
| Textarea enforces 280-char limit | unit | Type 300 chars, verify only 280 stored |
| Character counter displays and changes color | unit | Type 250+ chars → warning class, 280 → danger class |
| Continue with no text → verse display | integration | Select mood, click Continue, verify verse text matches mood |
| Continue with text + no crisis → verse display | integration | Type normal text, Continue, verify verse appears |
| Continue with crisis text → crisis banner | integration | Type "kill myself", Continue, verify crisis resources appear |
| Crisis banner shows all 3 resources (988, Crisis Text, SAMHSA) | unit | Verify resource text present in crisis banner |
| Verse auto-advances after 3 seconds | integration | Use `vi.useFakeTimers()`, advance 3000ms, verify `onComplete` called |
| Correct verse for each mood level | unit | Select each mood → Continue → verify correct Psalm reference |
| Skip link calls onSkip | unit | Click "Not right now", verify `onSkip()` called |
| Skip link has 44px min touch target | unit | Check `min-h-[44px]` class or computed style |
| Mood entry saved to localStorage on Continue | integration | Select mood, Continue, verify `wr_mood_entries` in localStorage |
| Mood entry saved even when crisis banner shown | integration | Select mood, type crisis text, Continue, verify entry saved |
| Entry has correct schema (id, date, mood, moodLabel, text, timestamp, verseSeen) | unit | Verify all fields present and correct types |
| `role="dialog"` with `aria-labelledby` on root | unit | Check root element attributes |
| Arrow key navigation through mood orbs | integration | Focus first orb, press Right arrow, verify focus moved |
| Enter/Space selects focused mood orb | integration | Focus orb, press Enter, verify mood_selected state |
| `aria-live="polite"` on verse display | unit | Verify verse container has aria-live |
| Reduced motion: no animation classes | unit | Mock `matchMedia` for `prefers-reduced-motion`, verify no `animate-` classes |
| Long user name truncates gracefully | unit | Pass 100-char name, verify no overflow (text-ellipsis or line wrap) |

**Expected state after completion:**
- [ ] `frontend/src/components/dashboard/MoodCheckIn.tsx` exists and renders correctly
- [ ] Component handles full state machine: idle → mood_selected → verse_display/crisis_banner → complete
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Crisis detection works via existing `containsCrisisKeyword()`
- [ ] `pnpm build` succeeds with no TS errors

---

### Step 6: MoodCheckIn Tests

**Objective:** Comprehensive test suite for the MoodCheckIn component.

**Files to create:**
- `frontend/src/components/dashboard/__tests__/MoodCheckIn.test.tsx`

**Details:**

Test setup pattern:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodCheckIn } from '../MoodCheckIn';

const mockOnComplete = vi.fn();
const mockOnSkip = vi.fn();

function renderCheckIn(userName = 'Eric') {
  return render(
    <MoodCheckIn
      userName={userName}
      onComplete={mockOnComplete}
      onSkip={mockOnSkip}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```

Implement all test cases listed in Step 5's test specifications table. For timer-based tests (verse auto-advance), use `vi.useFakeTimers()` and `vi.advanceTimersByTime(3000)`.

**Guardrails (DO NOT):**
- DO NOT skip crisis detection tests — AI safety tests are mandatory
- DO NOT use `waitFor` for timer-based assertions — use `vi.useFakeTimers()` + `act()` for deterministic timing
- DO NOT forget to clear localStorage in `beforeEach`
- DO NOT forget `afterEach(() => vi.useRealTimers())` when using fake timers

**Expected state after completion:**
- [ ] `frontend/src/components/dashboard/__tests__/MoodCheckIn.test.tsx` exists with 20+ tests
- [ ] All tests pass via `pnpm test`
- [ ] Crisis detection tests cover keyword match and empty text bypass
- [ ] Accessibility tests cover radiogroup, dialog role, aria-live
- [ ] Timer tests verify 3-second auto-advance

---

### Step 7: Integration Verification & Storybook-like Test Page

**Objective:** Create a minimal test harness page so the MoodCheckIn component can be visually verified before Spec 2 builds the Dashboard. Also run the full test suite and fix any issues.

**Files to create:**
- `frontend/src/pages/MoodCheckInPreview.tsx` — temporary dev-only preview page

**Files to modify:**
- `frontend/src/App.tsx` — add dev-only route `/dev/mood-checkin`

**Details:**

**`MoodCheckInPreview.tsx`:**
```tsx
import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn';

export function MoodCheckInPreview() {
  return (
    <MoodCheckIn
      userName="Eric"
      onComplete={(entry) => {
        console.log('Check-in complete:', entry);
        alert('Check-in complete! Entry saved. Check console for details.');
      }}
      onSkip={() => {
        console.log('Check-in skipped');
        alert('Skipped! In the real app, the dashboard would appear.');
      }}
    />
  );
}
```

**`App.tsx` addition** (inside `<Routes>`, guarded by dev mode):
```tsx
{import.meta.env.DEV && (
  <Route path="/dev/mood-checkin" element={<MoodCheckInPreview />} />
)}
```

This route is only available in development mode and provides a way to visually test the check-in flow without needing the full Dashboard + AuthProvider from Spec 2.

**Guardrails (DO NOT):**
- DO NOT ship this route to production — `import.meta.env.DEV` gate ensures it's dev-only
- DO NOT use `alert()` in the actual MoodCheckIn component — only in this preview wrapper
- DO NOT modify any existing routes

**Test specifications:**
No additional tests needed — this is a dev utility.

**Expected state after completion:**
- [ ] `/dev/mood-checkin` route works in dev mode
- [ ] Full check-in flow can be tested visually: mood selection → text input → verse display → completion
- [ ] Crisis detection can be tested: type crisis keyword → crisis banner appears
- [ ] Skip flow can be tested
- [ ] `pnpm test` passes all tests (Steps 1–6)
- [ ] `pnpm build` succeeds with no errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Shared date utilities (`utils/date.ts`) |
| 2 | — | MoodEntry type + mood constants |
| 3 | 1, 2 | Mood localStorage service (imports date utils + types) |
| 4 | — | Tailwind config mood-pulse animation |
| 5 | 2, 3, 4 | MoodCheckIn component (imports types, constants, service, uses animation) |
| 6 | 5 | MoodCheckIn test suite |
| 7 | 5 | Dev preview page + integration verification |

**Parallelizable**: Steps 1, 2, and 4 can be done in parallel (no dependencies between them).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Shared Date Utilities | [COMPLETE] | 2026-03-16 | Created `utils/date.ts` (3 functions) + `utils/__tests__/date.test.ts` (12 tests, all pass) |
| 2 | MoodEntry Type & Mood Constants | [COMPLETE] | 2026-03-16 | Created `types/dashboard.ts` (MoodEntry, MoodValue, MoodLabel) + `constants/dashboard/mood.ts` (MOOD_OPTIONS, MOOD_COLORS, constants) |
| 3 | Mood Entry localStorage Service | [COMPLETE] | 2026-03-16 | Created `services/mood-storage.ts` (3 functions) + `services/__tests__/mood-storage.test.ts` (10 tests, all pass) |
| 4 | Tailwind Config — Mood Pulse Animation | [COMPLETE] | 2026-03-16 | Added `mood-pulse` keyframe (3s, scale+opacity) and animation to `tailwind.config.js` |
| 5 | MoodCheckIn Component | [COMPLETE] | 2026-03-16 | Created `components/dashboard/MoodCheckIn.tsx` — full state machine (idle→mood_selected→verse_display/crisis_banner→complete), roving tabindex, crisis detection, auto-advance timer, reduced-motion support |
| 6 | MoodCheckIn Tests | [COMPLETE] | 2026-03-16 | Created `components/dashboard/__tests__/MoodCheckIn.test.tsx` (29 tests, all pass). Fixed: fake timers use fireEvent, keyboard nav tests use arrow-key navigation |
| 7 | Integration Verification & Preview Page | [COMPLETE] | 2026-03-16 | Created `pages/MoodCheckInPreview.tsx` + dev-only route `/dev/mood-checkin` in `App.tsx`. Fixed mobile orb layout to 3+2 (added `max-w-[272px] sm:max-w-none` to radiogroup). Visual verification: 6 screenshots captured across all states (idle, selected, verse, crisis) at mobile + desktop. All 1024 tests pass, build succeeds. |
