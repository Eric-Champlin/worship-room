# Implementation Plan: Surprise & Delight System

**Spec:** `_specs/surprise-delight-system.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/surprise-delight-system`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> **Recon staleness note:** Design system recon was captured 2026-03-06 — before the dark theme overhaul, dashboard widget system, and Growth Garden implementation. Values for dashboard cards, frosted glass, and garden SVG are verified from current source code inspection, not from the stale recon. Whisper-toast is a new visual pattern not covered by any recon — values come directly from the spec.

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/ui/Toast.tsx`** (280 lines) — Existing toast system with `ToastProvider` context and `useToast()` hook. Supports standard + celebration types. Whisper-toast is a separate component — do NOT extend this.
- **`frontend/src/components/dashboard/GrowthGarden.tsx`** (766 lines) — SVG garden with 6 stages. `SkyBackground` (defs + gradient), `SkyElements` (sun/clouds), `GroundLayer`, stage renderers. Props: `stage`, `animated`, `showSparkle`, `streakActive`, `size`, `amplifiedSparkle`. Rainbow arc goes between sky elements and ground layer.
- **`frontend/src/pages/BibleReader.tsx`** (361 lines) — Chapter loading via `useEffect` (lines 102-125). `loadChapter()` resolves, sets `verses` state. Already imports `useBibleHighlights`, `useSoundEffects`, `useAuth`. Scripture Echo hooks into the chapter load completion.
- **`frontend/src/pages/Dashboard.tsx`** (528 lines) — Phase-based rendering: `onboarding` → `welcome_back` → `check_in` → `recommendations` → `dashboard_enter` → `dashboard`. Uses `useFaithPoints()`, passes to `DashboardWidgetGrid`. Anniversary card, Gratitude Callback, and Streak Weather trigger in the `dashboard` phase.
- **`frontend/src/components/dashboard/DashboardWidgetGrid.tsx`** (342 lines) — Widget switch statement in `renderWidget()`. Props include visibility flags (`showEveningBanner`, `showGettingStarted`). Anniversary card follows the same pattern as `evening-reflection` and `getting-started` widgets.
- **`frontend/src/constants/dashboard/widget-order.ts`** (134 lines) — `WidgetId` union type, `WIDGET_DEFINITIONS` array, `WIDGET_MAP`, `TIME_OF_DAY_ORDERS`. Anniversary widget needs to be added here.
- **`frontend/src/hooks/useSoundEffects.ts`** (48 lines) — `playSoundEffect(id)` with IDs: `chime`, `ascending`, `harp`, `bell`, `whisper`, `sparkle`. Gated by `wr_sound_effects_enabled` + `prefers-reduced-motion`.
- **`frontend/src/hooks/useFaithPoints.ts`** — Returns `currentStreak`, `levelName`, `totalPoints`, `todayActivities`. Auth-gated (no-ops when not authenticated).
- **`frontend/src/hooks/useAuth.ts`** — Returns `{ isAuthenticated, user }`. Simulated auth via `wr_auth_simulated` localStorage.
- **`frontend/src/App.tsx`** (229 lines) — Provider stack: `BrowserRouter` → `HelmetProvider` → `ErrorBoundary` → `AuthProvider` → `ToastProvider` → `AuthModalProvider` → `AudioProvider` → Routes. Midnight Verse component goes inside `AuthProvider` + `AudioProvider` but before `Routes`.
- **`frontend/src/services/gratitude-storage.ts`** (83 lines) — `getGratitudeEntries()` returns `GratitudeEntry[]` with `{ id, date, items: string[], createdAt }`. Stored at `wr_gratitude_entries`.
- **`frontend/src/services/bible-annotations-storage.ts`** (51 lines) — `readHighlightsStatic()` reads `wr_bible_highlights`, returns `BibleHighlight[]` with `{ book, chapter, verseNumber, color, createdAt }`.
- **`frontend/src/services/prayer-list-storage.ts`** (191 lines) — `getPrayers()` reads `wr_prayer_list`, returns `PersonalPrayer[]` with `{ id, title, description, category, status, createdAt }`.
- **`frontend/src/types/bible.ts`** — `BibleHighlight { book: string, chapter: number, verseNumber: number, color: string, createdAt: string }`.
- **`frontend/src/types/personal-prayer.ts`** — `PersonalPrayer { id, title, description, category, status, createdAt, ... }`.

### Directory Conventions

- New hooks: `frontend/src/hooks/`
- New components: `frontend/src/components/ui/` (WhisperToast), `frontend/src/components/dashboard/` (AnniversaryCard)
- New services: `frontend/src/services/` (surprise storage)
- Constants: `frontend/src/constants/` (surprise constants)
- Tests: `__tests__/` directories alongside components

### Component/Service Patterns

- Dashboard widgets use `DashboardCard` wrapper with `WidgetId`, visibility flags passed from `Dashboard.tsx` to `DashboardWidgetGrid`.
- Sound effects: `useSoundEffects()` → `playSoundEffect('whisper' | 'sparkle' | 'chime')`.
- Auth check: `const { isAuthenticated } = useAuth()` — early return or no-op if false.
- localStorage reads: try/catch with JSON.parse, return empty array on failure.
- Date utilities: `getLocalDateString()` from `@/utils/date` for local date strings (YYYY-MM-DD).

### Test Patterns

- Vitest + React Testing Library + `userEvent.setup()`.
- `vi.hoisted()` + `vi.mock()` for hooks (`useSoundEffects`, `useAuth`, `useReducedMotion`).
- `vi.useFakeTimers()` for setTimeout-based delays.
- Provider wrapping: `MemoryRouter` for routed components, `ToastProvider` for toast-consuming components.
- localStorage mocking: `vi.spyOn(Storage.prototype, 'getItem')` or direct `localStorage.setItem()` in tests.

---

## Auth Gating Checklist

**All surprise features are auth-gated by data dependency — they simply don't trigger for logged-out users because the data they read doesn't exist.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Scripture Echo | Only fires for authenticated users with highlights/prayers | Step 4 | `useAuth().isAuthenticated` check in hook |
| Anniversary Moment | Only fires for authenticated users with mood/activity data | Step 5 | `useAuth().isAuthenticated` check in hook |
| Midnight Verse | Only fires for authenticated users | Step 6 | `useAuth().isAuthenticated` check in component |
| Streak Weather (Rainbow) | Only fires for authenticated users with streak data | Step 7 | `useAuth().isAuthenticated` check, plus prop from Dashboard |
| Gratitude Callback | Only fires for authenticated users with gratitude entries | Step 8 | `useAuth().isAuthenticated` check in hook |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Whisper-toast container | background | `bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3` | Spec (new pattern) |
| Whisper-toast text | font | `text-white/70 text-sm font-serif italic` (Lora italic) | Spec |
| Whisper-toast max-width | max-width | `max-w-sm` | Spec |
| Anniversary card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6` | GrowthGarden + dashboard card pattern (DashboardCard.tsx) |
| Anniversary card | golden glow | `ring-1 ring-amber-500/10` | Spec |
| Anniversary heading | font | `text-white text-lg font-semibold` | Spec |
| Anniversary stats | font | `text-white/70 text-sm` | Spec |
| Anniversary closing | font | `text-white/60 text-sm font-serif italic` (Lora italic) | Spec |
| Anniversary dismiss | font | `text-white/40 hover:text-white/60 text-sm` | Spec |
| Dashboard card pattern | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | `DashboardCard.tsx` + `.claude/rules/09-design-system.md` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, Lora (`font-serif`) for scripture/devotional/atmospheric text, Inter (`font-sans`) for UI text
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- WCAG AA text on dark: body text minimum `text-white/70`, secondary `text-white/60`, decorative/disabled `text-white/20` to `text-white/40`
- Sound effects are gated behind `wr_sound_effects_enabled` AND `prefers-reduced-motion` — use `useSoundEffects()` hook which handles both
- All dates should use `getLocalDateString()` from `@/utils/date`, NEVER `new Date().toISOString().split('T')[0]` (UTC vs local issue)
- Widget grid uses `lg:grid-cols-5` layout; full-width widgets use `lg:col-span-5`
- Dashboard widgets pass visibility via `Partial<Record<WidgetId, boolean>>` pattern
- GrowthGarden SVG viewBox is `0 0 800 400`; all coordinates are in that space

---

## Shared Data Models

### New localStorage Keys

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_anniversary_milestones_shown` | Both | Array of shown milestone days (7, 30, 90, 365) |
| `wr_surprise_shown_rainbow` | Both | One-time flag for streak rainbow ("true") |
| `wr_gratitude_callback_last_shown` | Both | Last date a gratitude callback was shown (YYYY-MM-DD) |
| `wr_last_surprise_date` | Both | Last date any surprise fired (YYYY-MM-DD) |

### Existing localStorage Keys Read

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_highlights` | Read | BibleHighlight[] — for Scripture Echo match |
| `wr_prayer_list` | Read | PersonalPrayer[] — for Scripture Echo prayer match |
| `wr_mood_entries` | Read | MoodEntry[] — for Anniversary first-use date |
| `wr_daily_activities` | Read | DailyActivityLog — for Anniversary first-use date + pray count |
| `wr_meditation_history` | Read | MeditationSession[] — for Anniversary meditation count |
| `wr_streak` | Read | StreakData — for Streak Weather rainbow trigger |
| `wr_gratitude_entries` | Read | GratitudeEntry[] — for Gratitude Callback |
| `wr_faith_points` | Read | FaithPointsData — for Anniversary garden level |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Whisper-toast: full-width minus gutters (`mx-4`). Anniversary card: full-width, single-column stats. |
| Tablet | 768px | Whisper-toast: `max-w-sm` centered. Anniversary card: same as mobile. |
| Desktop | 1440px | Whisper-toast: `max-w-sm` centered. Anniversary card: full-width within dashboard grid column (`lg:col-span-5`). |

---

## Vertical Rhythm

N/A — Whisper-toast is fixed-position and doesn't participate in page flow. Anniversary card renders within the existing dashboard widget grid which has its own gap system (`gap-4 md:gap-6`).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Feature branch `claude/feature/surprise-delight-system` exists
- [x] All existing tests pass (baseline)
- [ ] `wr_bible_highlights` and `wr_prayer_list` localStorage keys are populated during dev testing (simulate login, highlight a verse, add a prayer)
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from spec for new patterns, from codebase inspection for existing patterns)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior specs in the sequence are complete and committed (standalone feature — N/A)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Whisper-toast vs existing Toast | Separate component + separate provider | Spec explicitly states distinct from existing toasts — different visual treatment (atmospheric, no close button, Lora italic). Existing Toast handles system notifications and celebrations. |
| Anniversary card placement | New `WidgetId` in widget grid, rendered at order position 0 | Follows existing pattern for special widgets (getting-started, evening-reflection). Renders at top of grid before other widgets. |
| Midnight Verse scope | App-level component inside AuthProvider | Needs to trigger on ANY page. sessionStorage for per-session gating prevents re-triggering during navigation. |
| Frequency limiter scope | Shared utility function, not a hook | Simple date comparison — no React state needed. Each surprise caller invokes `canShowSurprise()` and `markSurpriseShown()`. |
| Scripture Echo prayer matching | Match prayer title against book name | PersonalPrayer has `title` and `description` but no structured book/chapter reference. Best effort: check if prayer title or description contains the book name. |
| Rainbow persistence | Shows for current day only | Spec says "persists on garden for that day only." Check `wr_last_surprise_date` matches today AND `wr_surprise_shown_rainbow` is set. |
| Multiple whisper-toasts | Only one at a time | Frequency limiter ensures max 1/day. Midnight Verse is independent but sessionStorage prevents overlap. |

---

## Implementation Steps

### Step 1: Surprise Storage Service + Frequency Limiter

**Objective:** Create the shared storage service and frequency management utilities that all surprise types depend on.

**Files to create/modify:**
- `frontend/src/services/surprise-storage.ts` — NEW
- `frontend/src/services/__tests__/surprise-storage.test.ts` — NEW

**Details:**

Create `surprise-storage.ts` with these exports:

```typescript
import { getLocalDateString } from '@/utils/date'

// ── localStorage keys ───────────────────────────────────────────────
const LAST_SURPRISE_DATE_KEY = 'wr_last_surprise_date'
const ANNIVERSARY_MILESTONES_KEY = 'wr_anniversary_milestones_shown'
const RAINBOW_SHOWN_KEY = 'wr_surprise_shown_rainbow'
const GRATITUDE_CALLBACK_LAST_KEY = 'wr_gratitude_callback_last_shown'

// ── Midnight Verse sessionStorage key ───────────────────────────────
const MIDNIGHT_SESSION_KEY = 'wr_midnight_verse_shown'

// ── Frequency limiter ───────────────────────────────────────────────
export function canShowSurprise(): boolean {
  // Returns true if no surprise has been shown today
  const last = localStorage.getItem(LAST_SURPRISE_DATE_KEY)
  return last !== getLocalDateString()
}

export function markSurpriseShown(): void {
  localStorage.setItem(LAST_SURPRISE_DATE_KEY, getLocalDateString())
}

// ── Anniversary milestones ──────────────────────────────────────────
export function getShownMilestones(): number[] {
  // Read wr_anniversary_milestones_shown, return number[]
}

export function markMilestoneShown(days: number): void {
  // Append days to array, write back
}

// ── Rainbow ─────────────────────────────────────────────────────────
export function hasRainbowBeenShown(): boolean {
  return localStorage.getItem(RAINBOW_SHOWN_KEY) === 'true'
}

export function markRainbowShown(): void {
  localStorage.setItem(RAINBOW_SHOWN_KEY, 'true')
}

// ── Gratitude callback ──────────────────────────────────────────────
export function canShowGratitudeCallback(): boolean {
  // Check wr_gratitude_callback_last_shown — must be 7+ days ago or never shown
}

export function markGratitudeCallbackShown(): void {
  localStorage.setItem(GRATITUDE_CALLBACK_LAST_KEY, getLocalDateString())
}

// ── Midnight Verse (sessionStorage) ─────────────────────────────────
export function hasMidnightVerseBeenShown(): boolean {
  return sessionStorage.getItem(MIDNIGHT_SESSION_KEY) === 'true'
}

export function markMidnightVerseShown(): void {
  sessionStorage.setItem(MIDNIGHT_SESSION_KEY, 'true')
}

// ── Anniversary stat helpers ────────────────────────────────────────
export function getFirstActivityDate(): string | null {
  // Check wr_mood_entries and wr_daily_activities for earliest date
}

export function getDaysSinceFirstActivity(): number | null {
  // Calculate days between first activity and today
}
```

**Auth gating:** N/A — this is a storage utility. Auth checks happen in the consuming hooks/components.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — use `getLocalDateString()` from `@/utils/date`
- DO NOT throw on malformed localStorage data — return safe defaults (empty array, null, false)
- DO NOT write to localStorage without try/catch for quota errors

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| canShowSurprise returns true when no date stored | unit | Fresh localStorage → true |
| canShowSurprise returns false when today's date stored | unit | Set key to today → false |
| canShowSurprise returns true when yesterday's date stored | unit | Set key to yesterday → true |
| markSurpriseShown writes today's date | unit | Call → verify localStorage value |
| getShownMilestones returns empty array when no data | unit | Fresh → [] |
| markMilestoneShown appends to array | unit | Add 7, then 30 → [7, 30] |
| markMilestoneShown handles malformed data | unit | Set key to "garbage" → handles gracefully |
| hasRainbowBeenShown returns false initially | unit | Fresh → false |
| markRainbowShown sets flag | unit | Call → true |
| canShowGratitudeCallback returns true when never shown | unit | Fresh → true |
| canShowGratitudeCallback returns false within 7 days | unit | Set to 3 days ago → false |
| canShowGratitudeCallback returns true after 7 days | unit | Set to 8 days ago → true |
| hasMidnightVerseBeenShown uses sessionStorage | unit | Fresh → false, mark → true |
| getFirstActivityDate finds earliest mood entry | unit | Set mood entries → returns earliest date |
| getFirstActivityDate finds earliest activity entry | unit | Set activities → returns earliest date |
| getDaysSinceFirstActivity calculates correctly | unit | Set first activity 7 days ago → returns 7 |

**Expected state after completion:**
- [ ] `surprise-storage.ts` exports all frequency limiter and storage functions
- [ ] 16+ tests passing for all storage functions
- [ ] No existing tests broken

---

### Step 2: WhisperToast Component + Provider

**Objective:** Create the shared WhisperToast UI component used by 4 of the 5 surprise types.

**Files to create/modify:**
- `frontend/src/components/ui/WhisperToast.tsx` — NEW
- `frontend/src/components/ui/__tests__/WhisperToast.test.tsx` — NEW

**Details:**

Create a WhisperToast component with its own context provider pattern:

```typescript
// WhisperToastProvider wraps app, provides showWhisperToast() function
// WhisperToast renders fixed-position at bottom-center

interface WhisperToastContent {
  message: string           // Main message (Lora italic, text-white/70)
  highlightedText?: string  // Optional quoted text (Lora italic, text-white/80)
  ctaLabel?: string         // Optional link text
  ctaTo?: string            // Optional navigation target
  duration?: number         // Auto-dismiss ms (default 6000)
  soundId?: 'whisper' | 'sparkle' | 'chime'  // Sound to play on show
}
```

**Component structure:**
- `WhisperToastProvider` wraps app (add to `App.tsx` inside `AudioProvider`)
- `useWhisperToast()` hook returns `{ showWhisperToast(content: WhisperToastContent): void }`
- Renders as fixed-position portal at bottom-center
- Container: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 mx-4 w-[calc(100%-2rem)] sm:mx-0 sm:w-auto sm:max-w-sm`
- Inner: `bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3`
- Text: `text-white/70 text-sm font-serif italic`
- Highlighted text (quotes): `text-white/80 font-serif italic` in `<blockquote>`
- CTA link: `text-primary-lt text-sm font-sans underline` with `<Link>` if `ctaTo` provided
- Animation: `translate-y-4 opacity-0` → `translate-y-0 opacity-100` (200ms ease-out) on enter; reverse 300ms on exit
- `prefers-reduced-motion`: skip translate, fade only (100ms)
- Entire toast area is tappable to dismiss (click/touch handler on container)
- Auto-dismiss timeout starts on render, cleared on unmount or manual dismiss
- Play sound via `useSoundEffects()` when toast becomes visible
- Only one whisper-toast at a time — showing a new one replaces the current one

**Auth gating:** N/A — the component itself has no auth gating. Auth is checked by callers.

**Responsive behavior:**
- Desktop (1440px): `max-w-sm` centered at bottom, `bottom-6`
- Tablet (768px): `max-w-sm` centered, `bottom-6`
- Mobile (375px): Full width minus gutters (`mx-4`), `bottom-6`

**Guardrails (DO NOT):**
- DO NOT extend the existing `Toast.tsx` — this is a separate visual pattern
- DO NOT add a close button — auto-dismiss + tap-to-dismiss only
- DO NOT use `dangerouslySetInnerHTML` for message content
- DO NOT block user interaction — the toast should not prevent scrolling or clicking underlying content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders message text in Lora italic | unit | Show toast → verify `font-serif italic` text |
| renders highlighted text in blockquote | unit | Pass highlightedText → verify `<blockquote>` |
| renders CTA link when provided | unit | Pass ctaLabel + ctaTo → verify `<a>` or `<Link>` |
| auto-dismisses after duration | unit | Show with 1000ms → `vi.advanceTimersByTime(1000)` → verify gone |
| dismisses on click/tap | unit | Show toast → click container → verify gone |
| respects prefers-reduced-motion | unit | Mock reduced motion → verify no translate animation class |
| only shows one toast at a time | unit | Show two → only second visible |
| applies enter animation classes | unit | Show → verify initial classes then animated classes |

**Expected state after completion:**
- [ ] `WhisperToast.tsx` exports `WhisperToastProvider` and `useWhisperToast`
- [ ] Toast renders at bottom-center with frosted glass styling
- [ ] Auto-dismiss and tap-to-dismiss work
- [ ] 8+ tests passing
- [ ] No existing tests broken

---

### Step 3: Wire WhisperToastProvider into App.tsx

**Objective:** Add `WhisperToastProvider` to the app provider stack so whisper-toasts can be triggered from any component.

**Files to create/modify:**
- `frontend/src/App.tsx` — MODIFY (add provider)

**Details:**

Add `WhisperToastProvider` inside the `AudioProvider` (so sound effects work) but outside `Routes`:

```tsx
// Current: <AudioProvider> ... <Routes> ... </AudioProvider>
// After:   <AudioProvider> <WhisperToastProvider> ... <Routes> ... </WhisperToastProvider> </AudioProvider>
```

Import `WhisperToastProvider` from `@/components/ui/WhisperToast`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the order of existing providers
- DO NOT remove any existing providers or components
- DO NOT add any other changes to App.tsx in this step

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| App renders without errors after provider addition | integration | Smoke test — App mounts successfully |

**Expected state after completion:**
- [ ] `WhisperToastProvider` wraps route content in `App.tsx`
- [ ] All existing tests still pass
- [ ] `useWhisperToast()` is callable from any routed component

---

### Step 4: Scripture Echo Surprise

**Objective:** Show a contextual whisper-toast when the user opens a Bible chapter containing a verse they previously highlighted or prayed about.

**Files to create/modify:**
- `frontend/src/hooks/useScriptureEcho.ts` — NEW
- `frontend/src/hooks/__tests__/useScriptureEcho.test.ts` — NEW
- `frontend/src/pages/BibleReader.tsx` — MODIFY (call the hook)

**Details:**

Create `useScriptureEcho(bookSlug: string, chapter: number, isLoading: boolean)` hook:

1. Check `isAuthenticated` — if false, return immediately (no-op)
2. Check `isLoading` — if true, return (wait for chapter to load)
3. Check frequency limiter: `canShowSurprise()` — if false, return
4. Track shown chapters in `useRef<Set<string>>` — keyed by `${bookSlug}-${chapter}`. If already shown, return.
5. Read `wr_bible_highlights` via `readHighlightsStatic()` pattern (direct localStorage read) — filter for matching `book === bookSlug && chapter === chapter`
6. Read `wr_prayer_list` via `getPrayers()` — filter for prayers where `title` or `description` includes the book display name (from `getBookDisplayName(bookSlug)`)
7. If no matches found, return
8. After 3-second delay (`setTimeout`), call `showWhisperToast()` with contextual message:
   - Highlight match: `"You highlighted a verse here on [formatted date]. Your journey with this passage continues."`
   - Prayer match: `"You prayed about [prayer title] and this chapter speaks to that. God's Word meets you where you are."`
   - Generic fallback (if both but unclear): `"You've been here before. There's something in this chapter for you today."`
9. Play `whisper` sound (passed as `soundId` to WhisperToast)
10. Duration: 6000ms
11. Mark surprise shown: `markSurpriseShown()`
12. Add chapter to shown set

**In `BibleReader.tsx`:**
- Import and call `useScriptureEcho(bookSlug ?? '', chapterNumber, isLoading)` after existing hooks (line ~46)
- No other changes to BibleReader needed

**Auth gating:**
- `useAuth().isAuthenticated` checked first in hook — no-op if false
- No auth modal needed (surprise simply doesn't appear)

**Responsive behavior:** N/A: no UI impact (WhisperToast handles its own responsive layout)

**Guardrails (DO NOT):**
- DO NOT modify the chapter loading logic in BibleReader.tsx
- DO NOT read from `useBibleHighlights()` hook (which re-renders on changes) — use static localStorage read to avoid re-trigger
- DO NOT show the toast during the loading state — wait for chapter to finish loading
- DO NOT trigger more than once per chapter per session

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows whisper-toast when chapter has highlight | unit | Set highlight in localStorage for Genesis 1, render hook with bookSlug='genesis', chapter=1 → verify showWhisperToast called after 3s |
| shows whisper-toast when chapter has prayer match | unit | Add prayer with "Genesis" in title, render hook → verify toast shown |
| does not trigger when not authenticated | unit | Mock isAuthenticated=false → verify no toast |
| does not trigger when canShowSurprise returns false | unit | Set wr_last_surprise_date to today → verify no toast |
| does not trigger twice for same chapter | unit | Trigger once, re-render with same bookSlug/chapter → verify called once |
| does not trigger while loading | unit | Pass isLoading=true → verify no toast |
| highlight message includes formatted date | unit | Set highlight with known createdAt → verify message includes date |
| prayer message includes prayer title | unit | Add prayer with title "Forgiveness" → verify message includes "Forgiveness" |
| marks surprise shown after triggering | unit | Trigger → verify markSurpriseShown() called |

**Expected state after completion:**
- [ ] Scripture Echo triggers in Bible reader when highlight/prayer match found
- [ ] 3-second delay before showing
- [ ] Respects frequency limiter
- [ ] Only triggers once per chapter per session
- [ ] 9+ tests passing

---

### Step 5: Anniversary Moment Card + Dashboard Integration

**Objective:** Show an inline anniversary card on the dashboard at 7, 30, 90, and 365-day milestones.

**Files to create/modify:**
- `frontend/src/hooks/useAnniversaryMoment.ts` — NEW
- `frontend/src/components/dashboard/AnniversaryCard.tsx` — NEW
- `frontend/src/constants/dashboard/widget-order.ts` — MODIFY (add WidgetId)
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — MODIFY (add render case)
- `frontend/src/pages/Dashboard.tsx` — MODIFY (compute and pass anniversary props)
- `frontend/src/hooks/__tests__/useAnniversaryMoment.test.ts` — NEW
- `frontend/src/components/dashboard/__tests__/AnniversaryCard.test.tsx` — NEW

**Details:**

**`useAnniversaryMoment()` hook:**
1. Check `isAuthenticated` — if false, return `{ show: false }`
2. Call `getDaysSinceFirstActivity()` from surprise-storage
3. Check if `daysSinceFirst` is exactly 7, 30, 90, or 365
4. Check if this milestone is already shown via `getShownMilestones()`
5. Check frequency limiter: `canShowSurprise()` (Anniversary has highest priority but still respects daily limit)
6. If all checks pass, return `{ show: true, milestone, stats, heading, closingMessage }`
7. Stats computed from localStorage:
   - Total prayers: count dates in `wr_daily_activities` where `pray === true`
   - Total journal entries: count dates in `wr_daily_activities` where `journal === true`
   - Total meditations: count from `wr_meditation_history` length
   - Current streak: from `wr_streak`
   - Garden growth: from `wr_faith_points` level name (always started as "Seedling")
8. Omit any stat that is zero

**`AnniversaryCard` component:**
- Frosted glass card: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ring-1 ring-amber-500/10`
- Heading: `text-white text-lg font-semibold` — per milestone content table in spec
- Stats: `text-white/70 text-sm` — only non-zero stats shown
- Closing message: `text-white/60 text-sm font-serif italic` — per milestone content table
- Dismiss button: `text-white/40 hover:text-white/60 text-sm` right-aligned, 44px min touch target
- On render: play `sparkle` sound
- On dismiss: call `markMilestoneShown(milestone)` + `markSurpriseShown()` + `onDismiss` callback

**`widget-order.ts` changes:**
- Add `'anniversary'` to `WidgetId` union type
- Add definition: `{ id: 'anniversary', label: 'Anniversary', icon: Heart, colSpan: 'lg:col-span-5', fullWidth: true }`
- Add `'anniversary'` as first item in all `TIME_OF_DAY_ORDERS` arrays (highest priority)

**`DashboardWidgetGrid.tsx` changes:**
- Add `showAnniversary?: boolean` and `anniversaryProps?: AnniversaryCardProps` to props interface
- Add visibility entry: `'anniversary': showAnniversary`
- Add `case 'anniversary':` in render switch — render `AnniversaryCard` with dismiss callback

**`Dashboard.tsx` changes:**
- Import and call `useAnniversaryMoment()` hook
- Derive `showAnniversary` and pass to widget grid
- Track `[anniversaryDismissed, setAnniversaryDismissed]` state — set true on dismiss
- Pass dismiss handler that marks milestone shown

**Auth gating:**
- `useAuth().isAuthenticated` in hook — returns `{ show: false }` if not authenticated

**Responsive behavior:**
- Desktop (1440px): Full-width within dashboard grid (`lg:col-span-5`)
- Tablet (768px): Full-width, single column stats
- Mobile (375px): Full-width, single column stats, stacked layout

**Guardrails (DO NOT):**
- DO NOT use a portal or overlay — render inline within the widget grid
- DO NOT show stats that are zero (filter them out)
- DO NOT show the card if the milestone was already shown (persistence check)
- DO NOT modify existing widget rendering or ordering for other widgets

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useAnniversaryMoment returns show:false when not authenticated | unit | Mock isAuthenticated=false → { show: false } |
| useAnniversaryMoment returns show:true at 7-day milestone | unit | Set first activity 7 days ago → { show: true, milestone: 7 } |
| useAnniversaryMoment returns show:false at non-milestone day | unit | Set first activity 5 days ago → { show: false } |
| useAnniversaryMoment respects already-shown milestones | unit | Mark 7 as shown, set 7 days → { show: false } |
| useAnniversaryMoment respects daily frequency limit | unit | Set wr_last_surprise_date to today → { show: false } |
| useAnniversaryMoment computes stats correctly | unit | Set known data → verify stat counts |
| useAnniversaryMoment omits zero stats | unit | No meditation data → meditation stat absent |
| AnniversaryCard renders heading per milestone | unit | Pass milestone=7 → "One Week with Worship Room" |
| AnniversaryCard renders closing message per milestone | unit | Pass milestone=30 → correct closing text |
| AnniversaryCard renders only non-zero stats | unit | Pass stats with some zero → verify absent |
| AnniversaryCard dismiss button calls onDismiss | unit | Click dismiss → onDismiss called |
| AnniversaryCard plays sparkle sound on render | unit | Mount → verify playSoundEffect('sparkle') called |
| AnniversaryCard has golden glow ring | unit | Verify `ring-amber-500/10` class present |
| AnniversaryCard dismiss button meets 44px touch target | unit | Verify min-h-[44px] or min-w-[44px] |

**Expected state after completion:**
- [ ] Anniversary card appears at 7/30/90/365-day milestones
- [ ] Shows personalized stats, omits zeros
- [ ] Golden glow, sparkle sound, dismissible
- [ ] Integrated into dashboard widget grid with highest priority
- [ ] 14+ tests passing

---

### Step 6: Midnight Verse App-Level Component

**Objective:** Show a comfort verse whisper-toast when the user opens the app between 12:00 AM and 3:59 AM.

**Files to create/modify:**
- `frontend/src/components/MidnightVerse.tsx` — NEW
- `frontend/src/components/__tests__/MidnightVerse.test.tsx` — NEW
- `frontend/src/App.tsx` — MODIFY (render component)

**Details:**

Create `MidnightVerse` component (not a hook — it needs to render nothing and trigger side effects):

1. Check `isAuthenticated` — if false, return null
2. Check `new Date().getHours()` — if not between 0 and 3 (inclusive), return null
3. Check `hasMidnightVerseBeenShown()` (sessionStorage) — if true, return null
4. On mount (via `useEffect`), if all checks pass:
   - Mark as shown: `markMidnightVerseShown()`
   - Select verse by `new Date().getDate() % 4` from the 4 rotating verses
   - Call `showWhisperToast()` with:
     - `message`: `"Can't sleep? God is awake with you."`
     - `highlightedText`: the selected verse with reference
     - `ctaLabel`: `"Listen to sleep sounds"`
     - `ctaTo`: `/music?tab=sleep`
     - `duration`: 10000 (10 seconds)
     - `soundId`: `'whisper'`
5. **Independent of daily surprise limit** — does NOT call `canShowSurprise()` or `markSurpriseShown()`

**Verses (WEB):**
```typescript
const MIDNIGHT_VERSES = [
  { text: 'He who watches over Israel will neither slumber nor sleep.', reference: 'Psalm 121:4' },
  { text: 'When I said, "My foot is slipping," your loving kindness, O Lord, held me up.', reference: 'Psalm 94:18' },
  { text: "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.", reference: 'Isaiah 26:3' },
  { text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.', reference: 'Matthew 11:28' },
]
```

**In `App.tsx`:**
- Import `MidnightVerse` and render inside `<AudioProvider>` + `<WhisperToastProvider>`, before `<ChunkErrorBoundary>`:
  ```tsx
  <MidnightVerse />
  <ChunkErrorBoundary>
  ```

**Auth gating:**
- `useAuth().isAuthenticated` check — renders null if not authenticated

**Responsive behavior:** N/A: no UI impact (WhisperToast handles layout)

**Guardrails (DO NOT):**
- DO NOT use localStorage — use sessionStorage for per-session gating
- DO NOT interact with the daily surprise frequency limiter — Midnight Verse is independent
- DO NOT create a blocking overlay — this is a whisper-toast only
- DO NOT add more than the 4 specified verses

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows toast between midnight and 3:59 AM | unit | Mock Date to 2:00 AM, mock isAuthenticated=true → verify showWhisperToast called |
| does not show outside midnight hours | unit | Mock Date to 8:00 AM → verify no toast |
| does not show when not authenticated | unit | Mock isAuthenticated=false, 2 AM → verify no toast |
| does not show when already shown this session | unit | Set sessionStorage flag → verify no toast |
| selects correct verse by day of month | unit | Mock Date to day 1 → verify verse index 1 (1 % 4) |
| toast includes CTA link to sleep sounds | unit | Verify ctaTo: '/music?tab=sleep' |
| toast duration is 10 seconds | unit | Verify duration: 10000 |
| uses whisper sound | unit | Verify soundId: 'whisper' |

**Expected state after completion:**
- [ ] Midnight Verse triggers between 12:00 AM and 3:59 AM on any page
- [ ] Shows comfort verse with sleep sounds CTA
- [ ] Uses sessionStorage (per-session, not per-day)
- [ ] Independent of daily surprise limit
- [ ] 8+ tests passing

---

### Step 7: Streak Weather (Garden Rainbow)

**Objective:** Add a rainbow arc to the Growth Garden SVG when the user's streak first reaches 7 days, with an accompanying whisper-toast.

**Files to create/modify:**
- `frontend/src/components/dashboard/GrowthGarden.tsx` — MODIFY (add rainbow SVG elements + prop)
- `frontend/src/pages/Dashboard.tsx` — MODIFY (compute rainbow state, pass prop)
- `frontend/src/components/dashboard/__tests__/GrowthGarden.test.tsx` — MODIFY (add rainbow tests)

**Details:**

**`GrowthGarden.tsx` changes:**

Add new prop: `showRainbow?: boolean`

Add rainbow SVG elements inside the SVG, between `SkyElements` and `GroundLayer`:

```tsx
// Rainbow arc — subtle gradient arc in the sky area
{showRainbow && (
  <g
    data-testid="garden-rainbow"
    className="motion-safe:transition-opacity motion-safe:duration-[2000ms] motion-reduce:opacity-40"
    style={{ opacity: showRainbow ? 0.35 : 0 }}
  >
    <defs>
      <linearGradient id={`rainbow-${uid}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
        <stop offset="20%" stopColor="#F97316" stopOpacity="0.35" />
        <stop offset="40%" stopColor="#EAB308" stopOpacity="0.35" />
        <stop offset="60%" stopColor="#22C55E" stopOpacity="0.35" />
        <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.35" />
      </linearGradient>
    </defs>
    {/* Arc path: semicircle from left to right in sky area */}
    <path
      d="M 150 300 Q 400 -20 650 300"
      stroke={`url(#rainbow-${uid})`}
      strokeWidth="20"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M 165 300 Q 400 0 635 300"
      stroke={`url(#rainbow-${uid})`}
      strokeWidth="12"
      fill="none"
      strokeLinecap="round"
      opacity="0.5"
    />
  </g>
)}
```

**`Dashboard.tsx` changes:**

1. Import `hasRainbowBeenShown`, `markRainbowShown`, `markSurpriseShown` from surprise-storage
2. Compute `showRainbow` state:
   - `const [showRainbow, setShowRainbow] = useState(false)`
   - In a `useEffect` that depends on `faithPoints.currentStreak` and `phase`:
     - If `phase === 'dashboard'` AND `faithPoints.currentStreak >= 7` AND `!hasRainbowBeenShown()`:
       - `markRainbowShown()`
       - `markSurpriseShown()`
       - `setShowRainbow(true)`
       - Show whisper-toast: `"A rainbow in your garden! 7 days of faithfulness."`
       - Play `sparkle` sound (via whisper-toast `soundId`)
       - Set timeout to hide rainbow after end of day (or just show for current render session — simpler: let `showRainbow` state reset on page leave)
3. Pass `showRainbow` prop to both `GrowthGarden` instances (mobile + desktop)

**Auth gating:**
- Rainbow only computes when `user` exists (Dashboard already gates on `!user` → return null)

**Responsive behavior:**
- Rainbow scales with the SVG's existing responsive behavior (SVG viewBox handles scaling)

**Guardrails (DO NOT):**
- DO NOT modify existing GrowthGarden SVG structure beyond adding the rainbow group
- DO NOT change the SVG viewBox dimensions
- DO NOT use CSS animations for the rainbow — use CSS transition on opacity
- DO NOT trigger the rainbow more than once ever (persisted in localStorage)
- DO NOT overcomplicate the rainbow — two concentric arc paths with gradient stroke is sufficient

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowthGarden renders rainbow when showRainbow=true | unit | Pass showRainbow=true → verify `data-testid="garden-rainbow"` present |
| GrowthGarden does not render rainbow when showRainbow=false | unit | Pass showRainbow=false → verify no rainbow testid |
| GrowthGarden does not render rainbow by default | unit | Omit prop → verify no rainbow |
| Rainbow has low opacity (0.35) | unit | Verify opacity style or class |
| Rainbow respects prefers-reduced-motion | unit | Mock reduced motion → verify transition disabled, content still visible |
| Dashboard triggers rainbow when streak first reaches 7 | integration | Set streak to 7, no rainbow flag → verify showRainbow passed to GrowthGarden |
| Dashboard does not trigger rainbow if already shown | integration | Set rainbow flag → verify showRainbow=false |

**Expected state after completion:**
- [ ] Rainbow arc appears in garden when streak first reaches 7
- [ ] Subtle gradient with low opacity (0.35)
- [ ] 2-second fade-in transition
- [ ] Accompanying whisper-toast
- [ ] One-time event, persisted in localStorage
- [ ] 7+ tests passing

---

### Step 8: Gratitude Callback Surprise

**Objective:** Surface a past gratitude entry as a whisper-toast on the dashboard when the user has 7+ entries and the weekly cooldown has passed.

**Files to create/modify:**
- `frontend/src/hooks/useGratitudeCallback.ts` — NEW
- `frontend/src/hooks/__tests__/useGratitudeCallback.test.ts` — NEW
- `frontend/src/pages/Dashboard.tsx` — MODIFY (call the hook)

**Details:**

Create `useGratitudeCallback(isDashboard: boolean)` hook:

1. Check `isAuthenticated` — if false, return
2. Check `isDashboard` — if false, return (only triggers on dashboard)
3. Check frequency limiter: `canShowSurprise()` — if false, return
4. Check weekly cooldown: `canShowGratitudeCallback()` — if false, return
5. Read `getGratitudeEntries()` — if length < 7, return
6. Filter entries older than 3 days (compare `entry.date` with today minus 3)
7. Pick a random entry from the filtered set (use `Math.random()`)
8. Pick a random item from the entry's `items` array
9. Call `showWhisperToast()` with:
   - `message`: `"A little while ago, you were thankful for:"`
   - `highlightedText`: the selected gratitude item (user's own words, in quotes)
   - (After highlighted text, closing): append `"Isn't it beautiful to look back?"` — pass as part of `message` or add a `closingMessage` field to WhisperToast
   - `duration`: 8000 (8 seconds)
   - `soundId`: `'chime'`
10. Mark: `markGratitudeCallbackShown()` + `markSurpriseShown()`

**Dashboard.tsx changes:**
- Import and call `useGratitudeCallback(phase === 'dashboard')` after existing hooks
- No props to pass — hook triggers whisper-toast internally

**Note:** The WhisperToast component from Step 2 may need a minor enhancement to support a `closingMessage` field (small italic text after the highlighted text). If so, add `closingMessage?: string` to `WhisperToastContent` and render it as `text-white/60 text-sm font-serif italic` after the highlighted text. This is a minor addition to Step 2's component.

**Auth gating:**
- `useAuth().isAuthenticated` in hook — no-op if false

**Responsive behavior:** N/A: no UI impact (WhisperToast handles layout)

**Guardrails (DO NOT):**
- DO NOT expose the gratitude entry to any external system — this is private user data
- DO NOT show entries from the last 3 days (too recent to feel like a "callback")
- DO NOT show more than once per week
- DO NOT modify the gratitude storage or entry format

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| triggers when 7+ entries and weekly cooldown passed | unit | Set 8 entries (oldest 5 days ago), no callback shown → verify toast |
| does not trigger with fewer than 7 entries | unit | Set 5 entries → verify no toast |
| does not trigger when weekly cooldown active | unit | Set callback shown 3 days ago → verify no toast |
| does not trigger when daily limit reached | unit | Set wr_last_surprise_date to today → verify no toast |
| does not trigger when not authenticated | unit | Mock isAuthenticated=false → verify no toast |
| does not trigger when not on dashboard | unit | Pass isDashboard=false → verify no toast |
| only picks entries older than 3 days | unit | All entries from today → verify no toast |
| toast includes user's gratitude text | unit | Set known entry → verify highlighted text matches |
| marks both callback and surprise shown | unit | Trigger → verify both markGratitudeCallbackShown and markSurpriseShown called |

**Expected state after completion:**
- [ ] Gratitude callback triggers on dashboard with 7+ entries and weekly cooldown
- [ ] Shows user's own past gratitude text in quotes
- [ ] Respects daily and weekly frequency limits
- [ ] 9+ tests passing

---

### Step 9: Integration Tests + Regression Verification

**Objective:** Verify all surprise types work together, frequency management is correct, and no existing functionality is broken.

**Files to create/modify:**
- `frontend/src/services/__tests__/surprise-integration.test.ts` — NEW

**Details:**

Write integration tests that verify cross-surprise behavior:

1. **Priority order**: Set up conditions where Anniversary AND Gratitude Callback could both trigger. Verify only Anniversary fires (highest priority). The priority implementation: `useAnniversaryMoment` is called first in Dashboard and if it triggers, `canShowSurprise()` returns false for subsequent hooks.
2. **Daily limit**: Trigger Scripture Echo, then verify Gratitude Callback does not fire same day.
3. **Midnight Verse independence**: Trigger a regular surprise, then verify Midnight Verse still fires at 2 AM (independent track).
4. **Streak Weather override**: Even if `wr_last_surprise_date` is today, Streak Weather fires because it's a one-time event that overrides the limit.
5. **Logged-out safety**: With isAuthenticated=false, verify zero surprises trigger and zero localStorage writes occur.
6. **Reduced motion**: Verify all surprise UI elements are visible but animations are disabled.

Also run existing test suites to verify no regressions:
- Dashboard tests
- BibleReader tests
- GrowthGarden tests
- Toast tests

**Auth gating:** N/A — this step is tests only

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any production code in this step
- DO NOT skip running existing test suites

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Anniversary takes priority over Gratitude Callback | integration | Both conditions met → only anniversary fires |
| Daily limit prevents second surprise | integration | Scripture Echo fires → Gratitude Callback blocked |
| Midnight Verse independent of daily limit | integration | Regular surprise + midnight verse both fire same session |
| Streak Weather overrides daily limit | integration | Daily limit reached → streak weather still fires |
| No surprises for logged-out users | integration | isAuthenticated=false → zero toast calls, zero localStorage writes |
| Reduced motion: content visible without animation | integration | Mock reduced motion → verify toast content present |

**Expected state after completion:**
- [ ] 6+ integration tests passing
- [ ] All existing dashboard/BibleReader/garden/toast tests still pass
- [ ] Full surprise system working end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Surprise storage service + frequency limiter |
| 2 | — | WhisperToast component + provider |
| 3 | 2 | Wire WhisperToastProvider into App.tsx |
| 4 | 1, 3 | Scripture Echo surprise |
| 5 | 1, 3 | Anniversary Moment card + dashboard integration |
| 6 | 3 | Midnight Verse app-level component |
| 7 | 1, 2, 3 | Streak Weather (garden rainbow) |
| 8 | 1, 3 | Gratitude Callback surprise |
| 9 | 4, 5, 6, 7, 8 | Integration tests + regression verification |

**Parallelizable:** Steps 1 and 2 can be done in parallel (no dependencies). Steps 4, 5, 6, 7, 8 can be done in any order after their dependencies are met.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Surprise Storage Service + Frequency Limiter | [COMPLETE] | 2026-04-01 | Created `surprise-storage.ts` with all frequency limiter and storage functions. 29 tests passing in `surprise-storage.test.ts`. |
| 2 | WhisperToast Component + Provider | [COMPLETE] | 2026-04-01 | Created `WhisperToast.tsx` with provider, context, frosted glass styling, auto/tap dismiss, sound integration, closingMessage field. 11 tests passing. |
| 3 | Wire WhisperToastProvider into App.tsx | [COMPLETE] | 2026-04-01 | Added `WhisperToastProvider` inside `AudioProvider`, before `ChunkErrorBoundary`. TypeScript clean, all tests pass. |
| 4 | Scripture Echo Surprise | [COMPLETE] | 2026-04-01 | Created `useScriptureEcho.ts` hook, integrated into BibleReader.tsx (after `chapterNumber` derivation). Added WhisperToast mock to BibleReader test. 10 tests passing + 19 BibleReader tests passing. |
| 5 | Anniversary Moment Card + Dashboard Integration | [COMPLETE] | 2026-04-01 | Created `useAnniversaryMoment.ts`, `AnniversaryCard.tsx`, added `anniversary` WidgetId, integrated into DashboardWidgetGrid + Dashboard. Fixed DST rounding in surprise-storage (Math.floor→Math.round). 17 new tests + 9 Dashboard tests pass. |
| 6 | Midnight Verse App-Level Component | [COMPLETE] | 2026-04-01 | Created `MidnightVerse.tsx`, added to App.tsx before ChunkErrorBoundary. 8 tests passing. |
| 7 | Streak Weather (Garden Rainbow) | [COMPLETE] | 2026-04-01 | Added `showRainbow` prop to GrowthGarden with SVG rainbow arc. Dashboard computes rainbow state on streak>=7. Added WhisperToast mock to Dashboard test. 5 new GrowthGarden tests + 9 Dashboard tests pass. |
| 8 | Gratitude Callback Surprise | [COMPLETE] | 2026-04-01 | Created `useGratitudeCallback.ts` hook, integrated into Dashboard.tsx. 9 tests passing. |
| 9 | Integration Tests + Regression Verification | [COMPLETE] | 2026-04-01 | Created `surprise-integration.test.tsx` with 6 integration tests. Fixed WhisperToast mock in 7 existing test files (BibleReaderAudio, BibleReaderNotes, BibleReaderHighlights, Dashboard-welcome-back, DashboardGettingStarted, DashboardIntegration, Accessibility, entrance-animation, transition-animation). Updated widget-order tests for new anniversary widget. Full suite: 451 files, 5104 tests, 0 failures. |
