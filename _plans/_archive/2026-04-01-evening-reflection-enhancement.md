# Implementation Plan: Evening Reflection Enhancement

**Spec:** `_specs/evening-reflection-enhancement.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/evening-reflection-enhancement`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> **Recon staleness note:** Design system recon captured 2026-03-06 — before dark theme overhaul and dashboard enhancements. UI values below verified from current source code inspection, not stale recon.

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/dashboard/EveningReflection.tsx`** (487 lines) — Primary modification target. 4-step flow: mood → highlights → gratitude → closing prayer. Full-screen overlay with `role="dialog"`, `aria-modal="true"`. Uses `KaraokeTextReveal` for verse reveal in Step 4, `CrisisBanner` for crisis detection in Steps 2-3. Currently imports `getEveningPrayer()` and `getEveningVerse()` for static prayer/verse content. Rendered in `Dashboard.tsx` (line 567) inside a conditional `showReflectionOverlay` state.
- **`frontend/src/components/dashboard/__tests__/EveningReflection.test.tsx`** (323 lines) — 18+ tests covering all 4 steps. Mocks: `KaraokeTextReveal`, `mood-storage`, `evening-reflection-storage`, `gratitude-storage`. Uses `MemoryRouter` wrapper. `renderOverlay()` helper with partial overrides.
- **`frontend/src/constants/dashboard/evening-reflection.ts`** (43 lines) — `EVENING_PRAYERS` (7 day-of-week prayers), `EVENING_VERSES` (7 day-of-week verses), `getEveningPrayer()`, `getEveningVerse()`. The prayer content will be replaced by the builder; the verse content stays unchanged.
- **`frontend/src/services/gratitude-storage.ts`** (84 lines) — `getTodayGratitude(): GratitudeEntry | null`. Returns `{ id, date, items: string[], createdAt }` for today or null.
- **`frontend/src/services/evening-reflection-storage.ts`** (30 lines) — `markReflectionDone()`, `hasReflectedToday()`, `isEveningTime()`, `hasAnyActivityToday()`.
- **`frontend/src/hooks/useSoundEffects.ts`** (47 lines) — `playSoundEffect(soundId)`. Checks `wr_sound_effects_enabled` (default true) and `prefers-reduced-motion`. Uses `useAudioEngine()`.
- **`frontend/src/hooks/useScenePlayer.ts`** (237 lines) — `loadScene(scene)`. Auth-gated (passes because dashboard is auth-gated). Handles routine interrupt, undo window. Uses `useAudioState`, `useAudioDispatch`, `useAudioEngine`.
- **`frontend/src/data/scenes.ts`** — `SCENE_PRESETS`, `SCENE_BY_ID` Map. `still-waters` scene: flowing-stream, gentle-wind, forest-birds, gentle-harp (4 sounds, very_calm intensity, psalm-themed).
- **`frontend/src/components/audio/AudioProvider.tsx`** — `useAudioState()` returns `{ activeSounds, isPlaying, masterVolume, pillVisible, activeRoutine, ... }`. `useAudioDispatch()` returns dispatch for `SET_MASTER_VOLUME`, `STOP_ALL`, `PAUSE_ALL`, etc.
- **`frontend/src/lib/audio-engine.ts`** — `setMasterVolume(volume)` uses `linearRampToValueAtTime` with `VOLUME_RAMP_MS = 20ms` (near-instant). Individual sounds fade in over `SOUND_FADE_IN_MS = 1000ms` when added. Scene sounds load with `SCENE_STAGGER_MS = 200ms` stagger.
- **`frontend/src/lib/sound-effects.ts`** — `playSound(ctx, 'whisper')`: white noise through bandpass filter at 800Hz, attack 200ms, sustain 800ms, decay 500ms. Volume: 0.15.
- **`frontend/src/components/daily/PrayTabContent.tsx`** (lines 94-109) — Reference pattern for ambient auto-play: check `!prefersReduced && activeSounds.length === 0 && !pillVisible && !activeRoutine`, then `SET_MASTER_VOLUME` + `loadScene`. Sets `autoPlayedAudio` boolean.
- **`frontend/src/constants/dashboard/activity-points.ts`** — `ACTIVITY_DISPLAY_NAMES` record mapping ActivityType to human labels.
- **`frontend/src/constants/dashboard/mood.ts`** — `MOOD_OPTIONS` with `{ value, label, color, verse, verseReference }`.
- **`frontend/src/types/dashboard.ts`** — `ActivityType` union type (12 types), `MoodLabel` type ('Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving'), `DailyActivities` interface.

### Directory Conventions

- Constants: `frontend/src/constants/dashboard/` (feature-scoped files)
- Tests: `__tests__/` directories alongside components/constants
- Components: `frontend/src/components/dashboard/`
- Hooks: `frontend/src/hooks/`

### Component/Service Patterns

- EveningReflection is a pure component receiving props from Dashboard.tsx — no internal state management beyond UI state
- Dashboard passes `useFaithPoints()` data down: `todayActivities`, `todayPoints`, `currentStreak`, `recordActivity`
- Test pattern: `vi.hoisted()` + `vi.mock()` for external services, `renderOverlay()` helper with partial overrides, `userEvent.setup()` for interactions
- Audio auto-play pattern (from PrayTabContent): guard check → `SET_MASTER_VOLUME` → `loadScene` → track via boolean

### Auth Gating

EveningReflection is rendered inside Dashboard.tsx which only renders when `isAuthenticated` is true. No new auth gates needed — all enhancements are within the existing auth boundary.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Evening Reflection (all actions) | Already auth-gated via Dashboard | N/A | Dashboard renders only when `isAuthenticated` |

No new auth gates needed per spec: "The Evening Reflection is already fully auth-gated."

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Gratitude recall card | background | `bg-white/[0.04]` | Spec design notes |
| Gratitude recall card | border | `border border-white/10` | Spec design notes |
| Gratitude recall card | border-radius | `rounded-xl` | Spec design notes |
| Gratitude recall card | padding | `p-4` | Spec design notes |
| Gratitude recall card | margin-bottom | `mb-4` | Spec design notes |
| Gratitude recall label | color/size | `text-white/50 text-sm` | Spec design notes (Inter) |
| Gratitude entry text | font/color | `font-serif italic text-white/80` | Spec (Lora italic) |
| Follow-up prompt | color/size | `text-white/60 text-sm` | Design system secondary text |
| Prayer text | font/color | `font-serif italic text-white/80` | Spec (Lora italic), consistent with existing prayer styling |
| Existing overlay bg | gradient | `bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]` | EveningReflection.tsx:211 |
| Step heading | font/color | `font-serif text-2xl text-white/90 md:text-3xl` | EveningReflection.tsx:244 |
| Primary button | bg/text | `bg-primary py-3 font-semibold text-white` | EveningReflection.tsx:341 |
| Secondary button | border/text | `border border-white/20 text-white` | EveningReflection.tsx:460 |

---

## Design System Reminder

**Project-specific quirks for UI steps:**

- Worship Room uses Lora (`font-serif`) for scripture and prayer text, Inter (`font-sans`) for UI text
- Caveat (`font-script`) is for hero headings and branding — NOT used in Evening Reflection
- Dashboard overlay background: `radial-gradient(ellipse_at_50%_30%, #3B0764, transparent 60%), linear-gradient(#0D0620, #1E0B3E 50%, #0D0620)` — NOT the inner page hero gradient
- Frosted glass card pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (dashboard cards use this; the gratitude recall card uses slightly lower opacity `bg-white/[0.04]` per spec)
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Text opacity on dark: primary=`text-white/80`+, secondary=`text-white/60`, labels=`text-white/50`
- Sound effects gated by: `wr_sound_effects_enabled !== 'false'` AND `prefers-reduced-motion` not `reduce`

---

## Shared Data Models

No new TypeScript interfaces needed. Existing types used:

```typescript
// From types/dashboard.ts
type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal'
  | 'readingPlan' | 'gratitude' | 'reflection' | 'challenge' | 'localVisit' | 'devotional'
type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving'

// From services/gratitude-storage.ts
interface GratitudeEntry {
  id: string
  date: string        // YYYY-MM-DD
  items: string[]     // 1-3 strings, max 150 chars each
  createdAt: string   // ISO 8601
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_gratitude_entries` | Read | Morning gratitude recall (longest entry) |
| `wr_daily_activities` | Read | Personalized prayer activity lines |
| `wr_sound_effects_enabled` | Read | Ambient auto-play and closing sound guard |
| `wr_evening_reflection` | Write (existing) | Reflection completion tracking |
| `wr_mood_entries` | Write (existing) | Evening mood save |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Overlay is full-width with `px-4`. Gratitude recall card stacks naturally. Prayer text wraps. All enhancements fit within existing overlay. |
| Tablet | 768px | Same as mobile — overlay is modal-style, centered, max-w-[640px]. Slightly more breathing room. |
| Desktop | 1440px | Overlay centered modal. Gratitude recall card and prayer text have comfortable line lengths. |

The existing overlay is already responsive (max-w-[640px], px-4). Enhancements are text content that flows naturally.

---

## Vertical Rhythm

N/A — This feature modifies an existing overlay component. Internal spacing uses the existing padding/margin pattern (mb-4, mb-6, mb-8). No page-level section gaps to verify.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/evening-reflection-enhancement` exists and is checked out
- [ ] All existing Evening Reflection tests pass (run `pnpm test -- EveningReflection`)
- [ ] `AuthModalProvider` wraps the entire app in App.tsx (confirmed: line 159)
- [ ] `AudioProvider` wraps the entire app in App.tsx (confirmed: line 160)
- [ ] All auth-gated actions from the spec are accounted for (none — feature is already fully auth-gated)
- [ ] Design system values are verified from codebase inspection (all cited with file:line)
- [ ] No [UNVERIFIED] values in this plan

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scene for auto-play | "Still Waters" (id: `still-waters`) | Calming, psalm-themed, very_calm intensity. 4 ambient sounds. Spec suggests "Still Waters" or "Midnight Rain" — Still Waters is more universally calming (rain may be divisive). |
| Master volume for ambient | 0.3 | Spec requirement. Lower than PrayTabContent's 0.4 — evening context warrants softer background. |
| Fade-in approach | Stepped master volume ramp (0 → 0.3 over 2s) via setInterval | `SET_MASTER_VOLUME` has 20ms ramp (near-instant). Individual sounds have 1000ms fade-in. Combined with 20-step volume ramp over 2s, gives smooth perceived fade-in. |
| Fade-out approach ("Done") | Stepped master volume ramp (0.3 → 0 over 3s) → STOP_ALL → restore original volume | Spec says 3 seconds. Interval survives component unmount since it dispatches to app-level AudioProvider. |
| Fade-out approach ("Sleep") | Stepped ramp (0.3 → 0 over 1s) → STOP_ALL → navigate | Spec says 1 second for sleep transition. Overlay fades via CSS 500ms transition simultaneously. |
| Gratitude: "morning" detection | Any `getTodayGratitude()` result before Evening Reflection opens | Evening Reflection only shows after 6 PM. Any gratitude saved earlier today is "morning" gratitude. |
| Gratitude: longest entry | `items.filter(Boolean).reduce((a,b) => a.length > b.length ? a : b)` | Spec says "most specific entry (longest by character count)". |
| Prayer: mood not selected | Omit mood-specific line entirely | Spec: "If mood was not selected in Step 1, the mood line is omitted." However, in practice mood is always selected (Step 1 advances to Step 2 on selection). Edge case for tests. |
| Prayer: no activities | Use generic line | Spec provides specific generic line text. |
| `useScenePlayer` vs direct dispatch | Use `useScenePlayer.loadScene()` | Provides proper sound loading, staggering, scene name tracking, undo window. Auth check passes since dashboard is auth-gated. `AuthModalProvider` wraps app (App.tsx:159). |
| Original volume restore | Save `audioState.masterVolume` on auto-play, restore after STOP_ALL | Prevents leaving master volume at 0 after fade-out, which would silently break subsequent audio. |
| Sleep transition: Link vs button | Replace `<Link>` with `<button>` using `useNavigate` | Need programmatic control for delayed navigation after audio fade-out. |

---

## Implementation Steps

### Step 1: Create Personalized Evening Prayer Builder

**Objective:** Create a pure utility function that assembles a personalized closing prayer from the user's completed activities and selected evening mood.

**Files to create:**
- `frontend/src/constants/dashboard/evening-prayer-builder.ts` — Constants and builder function
- `frontend/src/constants/dashboard/__tests__/evening-prayer-builder.test.ts` — Unit tests

**Details:**

Create `evening-prayer-builder.ts` with:

1. **`ACTIVITY_PRAYER_LINES`** — ordered array of `{ activity: ActivityType, line: string }` (8 entries, ordered by priority per spec):
   - `devotional`: "Thank you for meeting me in Your Word this morning."
   - `readingPlan`: "Thank you for the time I spent in Your Word today."
   - `pray`: "Thank you for hearing my prayers today."
   - `journal`: "Thank you for the space to pour out my heart in my journal."
   - `meditate`: "Thank you for the stillness I found in meditation."
   - `prayerWall`: "Thank you for the courage to share my heart with others."
   - `challenge`: "Thank you for another step in this journey."
   - `gratitude`: "Thank you for opening my eyes to the blessings around me."

2. **`MOOD_PRAYER_LINES`** — Record keyed by MoodLabel:
   - `Struggling`: "I'm hurting tonight, Lord. Hold me close as I sleep."
   - `Heavy`: "This day was heavy, but You carried me through. I give it all to You."
   - `Okay`: "Today was ordinary, and that's okay. Thank you for the quiet blessings."
   - `Good`: "I felt Your goodness today. Let this peace carry into my dreams."
   - `Thriving`: "My heart is full tonight. Thank you for this beautiful day."

3. **`GENERIC_NO_ACTIVITY_LINE`**: "Thank you for bringing me through this day, even the parts I can't put into words."

4. **`buildEveningPrayer(params)`** function:
   ```typescript
   interface BuildEveningPrayerParams {
     todayActivities: Record<string, boolean>
     eveningMoodLabel: MoodLabel | null
   }
   function buildEveningPrayer(params: BuildEveningPrayerParams): string
   ```
   - Opening: "Lord, thank you for this day."
   - Activity lines: Filter `ACTIVITY_PRAYER_LINES` by completed activities, take first 3.
   - If no activities completed: use `GENERIC_NO_ACTIVITY_LINE`.
   - Mood line: Look up `MOOD_PRAYER_LINES[eveningMoodLabel]`. Omit if null.
   - Closing: "As I rest tonight, I trust You with everything I carry.\nGive me peaceful sleep and a heart ready for tomorrow.\nIn Jesus' name, Amen."
   - Join all non-empty sections with `\n\n`.

**Import pattern:** `import type { MoodLabel } from '@/types/dashboard'`

**Auth gating:** N/A — pure utility function.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import any React hooks or components — this is a pure utility
- DO NOT read from localStorage — accept activities and mood as parameters
- DO NOT hardcode ActivityType values beyond the 8 defined in spec — skip activities not in the priority list
- DO NOT include `'reflection'` or `'mood'` in activity lines — these are meta-activities, not spiritual practices

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| returns prayer with activity lines for completed activities | unit | Pass activities `{devotional: true, pray: true}` → prayer includes devotional + pray lines |
| respects priority order | unit | Pass all 8 activities true → only first 3 appear, in correct order |
| caps at 3 activity lines | unit | Pass 5+ activities → exactly 3 lines |
| uses generic line when no activities | unit | Pass all false → generic line present |
| includes mood line for each mood label | unit | 5 tests, one per mood → correct mood-specific line |
| omits mood line when null | unit | Pass `eveningMoodLabel: null` → no mood line, prayer still valid |
| prayer structure is correct | unit | Verify opening, body, closing format with `\n\n` separators |
| excludes non-spiritual activities | unit | Pass only `{mood: true, reflection: true, listen: true}` → uses generic line (none of these are in ACTIVITY_PRAYER_LINES) |

**Expected state after completion:**
- [ ] `evening-prayer-builder.ts` exports `buildEveningPrayer`, `ACTIVITY_PRAYER_LINES`, `MOOD_PRAYER_LINES`
- [ ] All 10+ unit tests pass
- [ ] No imports from React or browser APIs — pure TypeScript

---

### Step 2: Enhance EveningReflection Component

**Objective:** Add all 5 enhancements to the existing EveningReflection component: ambient sound auto-play with fade-in/out, morning gratitude recall in Step 2, personalized closing prayer in Step 4, closing sound effect on Done, and smooth sleep transition.

**Files to modify:**
- `frontend/src/components/dashboard/EveningReflection.tsx`

**Details:**

#### 2a. New imports

Add imports at top of file:
```typescript
import { useNavigate } from 'react-router-dom'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SCENE_BY_ID } from '@/data/scenes'
import { buildEveningPrayer } from '@/constants/dashboard/evening-prayer-builder'
```

Remove `getEveningPrayer` import (no longer used; `getEveningVerse` stays).

#### 2b. Ambient sound auto-play (Requirement 1)

Add hooks and refs inside component:
```typescript
const navigate = useNavigate()
const audioState = useAudioState()
const audioDispatch = useAudioDispatch()
const { loadScene } = useScenePlayer()
const { playSoundEffect } = useSoundEffects()
const prefersReduced = useReducedMotion()

// Ambient auto-play tracking
const didAutoPlayRef = useRef(false)
const originalVolumeRef = useRef(0.8)
const fadeTimerRef = useRef<ReturnType<typeof setInterval>>()
const volumeRef = useRef(0)
```

Add useEffect on mount for auto-play:
```typescript
useEffect(() => {
  const soundEnabled = localStorage.getItem('wr_sound_effects_enabled') !== 'false'
  const hasActiveAudio = audioState.activeSounds.length > 0 || audioState.pillVisible

  if (!soundEnabled || prefersReduced || hasActiveAudio || audioState.activeRoutine) {
    return
  }

  const scene = SCENE_BY_ID.get('still-waters')
  if (!scene) return

  // Save original volume, set to 0 before loading
  originalVolumeRef.current = audioState.masterVolume
  audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: 0 } })
  loadScene(scene)
  didAutoPlayRef.current = true

  // Fade in: ramp master volume from 0 to 0.3 over 2 seconds (20 steps × 100ms)
  volumeRef.current = 0
  fadeTimerRef.current = setInterval(() => {
    volumeRef.current = Math.min(0.3, volumeRef.current + 0.015)
    audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: volumeRef.current } })
    if (volumeRef.current >= 0.3) {
      clearInterval(fadeTimerRef.current!)
      fadeTimerRef.current = undefined
    }
  }, 100)

  // Cleanup: fade out if component unmounts unexpectedly
  return () => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
}, [])
```

**Key guard conditions (per spec):**
- `wr_sound_effects_enabled` is NOT `'false'`
- `!prefersReduced` (prefers-reduced-motion)
- `activeSounds.length === 0 && !pillVisible` (no existing audio)
- `!activeRoutine` (no active bedtime routine)

Add fade-out helper (used by Done and Sleep):
```typescript
const fadeOutAudio = useCallback((durationMs: number, onComplete: () => void) => {
  if (!didAutoPlayRef.current) {
    onComplete()
    return
  }
  if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)

  const steps = Math.max(1, Math.round(durationMs / 100))
  const decrement = volumeRef.current / steps
  const origVolume = originalVolumeRef.current

  fadeTimerRef.current = setInterval(() => {
    volumeRef.current = Math.max(0, volumeRef.current - decrement)
    audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: volumeRef.current } })
    if (volumeRef.current <= 0) {
      clearInterval(fadeTimerRef.current!)
      fadeTimerRef.current = undefined
      audioDispatch({ type: 'STOP_ALL' })
      audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: origVolume } })
      didAutoPlayRef.current = false
      onComplete()
    }
  }, 100)
}, [audioDispatch])
```

#### 2c. Morning gratitude recall (Requirement 2)

Add state for morning gratitude recall (read on mount):
```typescript
const [morningGratitudeItem, setMorningGratitudeItem] = useState<string | null>(null)

useEffect(() => {
  const entry = getTodayGratitude()
  if (entry) {
    const nonEmpty = entry.items.filter((item) => item.trim().length > 0)
    if (nonEmpty.length > 0) {
      const longest = nonEmpty.reduce((a, b) => (a.length > b.length ? a : b))
      setMorningGratitudeItem(longest)
    }
  }
}, [])
```

In the Step 2 JSX, add gratitude recall card ABOVE the activity summary (between the heading and `{completedActivities.length > 0 && ...}`):

```tsx
{currentStep === 2 && (
  <div className="w-full motion-safe:animate-fade-in">
    <h2 ...>Today's Highlights</h2>

    {/* Morning gratitude recall card */}
    {morningGratitudeItem && (
      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 motion-safe:animate-fade-in">
        <p className="mb-1 text-sm text-white/50">
          This morning, you were grateful for:
        </p>
        <p className="mb-2 font-serif italic text-white/80">
          &ldquo;{morningGratitudeItem}&rdquo;
        </p>
        <p className="text-sm text-white/60">
          How did the rest of your day unfold?
        </p>
      </div>
    )}

    {/* Existing activity summary ... */}
```

The `motion-safe:animate-fade-in` class provides the 300ms+ fade-in. `prefers-reduced-motion` is respected via the `motion-safe:` prefix.

#### 2d. Personalized closing prayer (Requirement 3)

Replace the static prayer in Step 4. Remove `const prayer = getEveningPrayer()` (line 195). Add personalized prayer computed from activities and mood:

```typescript
const personalizedPrayer = useMemo(
  () => buildEveningPrayer({
    todayActivities,
    eveningMoodLabel: selectedMood?.label ?? null,
  }),
  [todayActivities, selectedMood],
)
```

In Step 4 JSX, replace `{prayer.text}` with `{personalizedPrayer}`. Render with `whitespace-pre-line` to preserve the `\n\n` paragraph breaks:

```tsx
{step4Phase === 'prayer' && (
  <>
    <p className="mx-auto mb-8 max-w-lg whitespace-pre-line font-serif text-lg italic leading-relaxed text-white/80 md:text-xl">
      {personalizedPrayer}
    </p>
    <button ...>Goodnight</button>
  </>
)}
```

Note: changed `text-white/90` to `text-white/80` per spec design notes.

#### 2e. Closing sound effect (Requirement 4)

Modify the `finishReflection` function. Extract a `saveReflection` helper:

```typescript
const saveReflection = useCallback(() => {
  if (!selectedMood) return
  markReflectionDone()
  recordActivity('reflection')
  const verse = getEveningVerse()
  const eveningEntry: MoodEntry = {
    id: crypto.randomUUID(),
    date: capturedDate,
    mood: selectedMood.value,
    moodLabel: selectedMood.label,
    text: highlightText.trim() || undefined,
    timestamp: Date.now(),
    verseSeen: verse.reference,
    timeOfDay: 'evening',
  }
  saveMoodEntry(eveningEntry)
}, [selectedMood, capturedDate, highlightText, recordActivity])
```

Replace `finishReflection` with `handleDone`:

```typescript
const handleDone = useCallback(() => {
  saveReflection()
  playSoundEffect('whisper')
  fadeOutAudio(3000, () => {
    onComplete()
  })
}, [saveReflection, playSoundEffect, fadeOutAudio, onComplete])
```

#### 2f. Sleep transition enhancement (Requirement 5)

Add closing state:
```typescript
const [isClosing, setIsClosing] = useState(false)
```

Replace the `<Link to="/music?tab=sleep">` with a `<button>`:

```typescript
const handleSleepTransition = useCallback(() => {
  saveReflection()
  setIsClosing(true) // triggers overlay CSS fade
  fadeOutAudio(1000, () => {
    navigate('/music?tab=sleep')
  })
}, [saveReflection, fadeOutAudio, navigate])
```

In the "Go to Sleep & Rest" JSX, replace `<Link>` with `<button>`:
```tsx
<button
  type="button"
  onClick={handleSleepTransition}
  className="w-full rounded-lg border border-white/20 px-8 py-3 text-center font-semibold text-white transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto"
>
  Go to Sleep &amp; Rest
</button>
```

Add overlay fade-out to the root dialog div:
```tsx
<div
  role="dialog"
  ...
  className={cn(
    "fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(...)]",
    isClosing && "transition-opacity duration-500 opacity-0"
  )}
>
```

**Auth gating:** N/A — all within existing auth boundary.

**Responsive behavior (all enhancements):**
- Desktop (1440px): Overlay max-w-[640px] centered. Gratitude card and prayer text have comfortable line lengths.
- Tablet (768px): Same as desktop — modal is centered.
- Mobile (375px): Overlay full-width with px-4. All text wraps naturally. No layout changes needed.

**Guardrails (DO NOT):**
- DO NOT remove or modify the existing Step 1 mood selector, Step 3 gratitude inputs, or step navigation logic
- DO NOT change the `wr_evening_reflection` localStorage write or `recordActivity('reflection')` call
- DO NOT auto-play ambient sound if `wr_sound_effects_enabled` is `'false'`
- DO NOT override existing audio playback — check `activeSounds.length > 0 || pillVisible`
- DO NOT use `dangerouslySetInnerHTML` for prayer text — use `whitespace-pre-line` CSS
- DO NOT change `getEveningVerse()` usage — the verse reveal in Step 4 stays unchanged
- DO NOT add a `<Link>` import if removing the sleep transition Link — use `useNavigate` instead (but keep the existing `Link` import if it's used elsewhere in the file)

**Expected state after completion:**
- [ ] Ambient sound auto-plays on overlay open when conditions are met
- [ ] Ambient sound fades in over ~2 seconds
- [ ] Ambient sound does NOT play when sound effects disabled, reduced motion preferred, or audio already active
- [ ] Morning gratitude recall card shows in Step 2 when today's gratitude exists
- [ ] Gratitude recall card shows longest entry from today's gratitude items
- [ ] Personalized prayer in Step 4 includes activity-specific lines (max 3, by priority)
- [ ] Personalized prayer includes mood-specific line matching Step 1 selection
- [ ] `whisper` sound plays on "Done" click
- [ ] Ambient audio fades out over 3 seconds on "Done"
- [ ] Sleep transition fades overlay (500ms) and audio (1s) before navigating
- [ ] Original master volume is restored after audio cleanup
- [ ] All existing functionality preserved (crisis detection, mood save, streak tracking)

---

### Step 3: Write and Update Tests

**Objective:** Add comprehensive tests for all new behaviors and verify no regressions in existing tests.

**Files to modify:**
- `frontend/src/components/dashboard/__tests__/EveningReflection.test.tsx`

**Details:**

Add mocks at top of test file:

```typescript
// Mock audio hooks
const mockLoadScene = vi.fn()
const mockAudioDispatch = vi.fn()
const mockPlaySoundEffect = vi.fn()
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    loadScene: mockLoadScene,
    activeSceneId: null,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    isPlaying: false,
    masterVolume: 0.8,
    pillVisible: false,
    activeRoutine: null,
    foregroundContent: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => mockAudioDispatch,
}))
vi.mock('@/data/scenes', () => ({
  SCENE_BY_ID: new Map([['still-waters', { id: 'still-waters', name: 'Still Waters', sounds: [] }]]),
}))
```

Add mock `useNavigate`:
```typescript
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
```

Update `beforeEach` to clear new mocks:
```typescript
mockLoadScene.mockClear()
mockAudioDispatch.mockClear()
mockPlaySoundEffect.mockClear()
mockNavigate.mockClear()
```

**New test suites:**

1. **Ambient Sound Auto-Play** (describe block):

| Test | Type | Description |
|------|------|-------------|
| dispatches SET_MASTER_VOLUME and calls loadScene on mount | integration | Verify `audioDispatch` called with `SET_MASTER_VOLUME: 0` and `loadScene` called with Still Waters scene |
| does not auto-play when sound effects disabled | integration | Set `wr_sound_effects_enabled` to `'false'` in localStorage before render → `loadScene` not called |
| does not auto-play when audio already active | integration | Mock `useAudioState` with `activeSounds: [...]` → `loadScene` not called |
| does not auto-play when reduced motion preferred | integration | Mock `useReducedMotion` returning true → `loadScene` not called |

2. **Morning Gratitude Recall** (describe block):

| Test | Type | Description |
|------|------|-------------|
| shows gratitude recall card in Step 2 when today's gratitude exists | integration | Mock `getTodayGratitude()` returning `{ items: ['friend', 'sunshine and warmth', 'coffee'] }` → advance to Step 2 → card shows "sunshine and warmth" (longest) |
| hides gratitude recall when no gratitude today | integration | Mock returns null → advance to Step 2 → no recall card visible |
| displays label, quoted text, and follow-up prompt | integration | Verify "This morning, you were grateful for:", quoted text, "How did the rest of your day unfold?" |

3. **Personalized Closing Prayer** (describe block):

| Test | Type | Description |
|------|------|-------------|
| shows activity-specific lines in Step 4 | integration | Render with `todayActivities: { devotional: true, pray: true }` → advance to Step 4 → verify "meeting me in Your Word" and "hearing my prayers" |
| shows mood-specific line matching Step 1 selection | integration | Select "Good" mood → advance to Step 4 → verify "I felt Your goodness today" |
| uses generic line when no activities completed | integration | Render with all activities false → Step 4 → verify generic text |
| caps activity lines at 3 | integration | Render with 5+ activities → Step 4 → count activity-specific lines ≤ 3 |

4. **Closing Sound & Sleep Transition** (describe block):

| Test | Type | Description |
|------|------|-------------|
| plays whisper sound on Done click | integration | Navigate to Step 4 done phase → click Done → verify `playSoundEffect('whisper')` called |
| navigates to /music?tab=sleep on sleep transition | integration | Click "Go to Sleep & Rest" → verify `mockNavigate('/music?tab=sleep')` called (after async timeout) |
| finishReflection still records activity and saves mood | integration | Click Done → verify `recordActivity` and `saveMoodEntry` called |
| evening reflection still tracks in wr_evening_reflection | integration | Click Done → verify `markReflectionDone` called |

5. **Regression checks:**

| Test | Type | Description |
|------|------|-------------|
| existing Step 1-3 tests pass unchanged | regression | Run all existing tests — no modifications to Step 1/2/3 test code |
| crisis detection still works in Step 2 and 3 | regression | Existing crisis tests pass |

**Mock strategy:** Use `vi.useFakeTimers()` for tests that verify fade-in/fade-out intervals. Call `vi.advanceTimersByTime(2000)` to verify fade-in completes, `vi.advanceTimersByTime(3000)` for fade-out.

**Auth gating:** N/A — no new auth gates to test.

**Responsive behavior:** N/A: no UI impact — tests verify behavior not layout.

**Guardrails (DO NOT):**
- DO NOT modify existing test describe blocks — add new describe blocks for new features
- DO NOT remove any existing test — all 18+ existing tests must continue passing
- DO NOT test internal timer implementation details — test observable behaviors (loadScene called, navigate called, etc.)
- DO NOT mock `buildEveningPrayer` — let it run with real logic (unit tested in Step 1)

**Expected state after completion:**
- [ ] All existing tests pass unchanged
- [ ] 15+ new tests pass for the 5 enhancements
- [ ] `pnpm test -- EveningReflection` reports 0 failures
- [ ] `pnpm test -- evening-prayer-builder` reports 0 failures
- [ ] Full test suite runs with no new failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create personalized prayer builder (pure utility) |
| 2 | 1 | Enhance EveningReflection (imports builder from Step 1) |
| 3 | 1, 2 | Write tests (tests both builder integration and component behavior) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Personalized Evening Prayer Builder | [COMPLETE] | 2026-04-01 | Created `evening-prayer-builder.ts` (62 lines) and `__tests__/evening-prayer-builder.test.ts` (110 lines). 12 unit tests passing. Exports: `buildEveningPrayer`, `ACTIVITY_PRAYER_LINES`, `MOOD_PRAYER_LINES`, `GENERIC_NO_ACTIVITY_LINE`. |
| 2 | Enhance EveningReflection Component | [COMPLETE] | 2026-04-01 | Modified `EveningReflection.tsx`: added ambient auto-play (Still Waters scene, 2s fade-in, 3s/1s fade-out), morning gratitude recall card in Step 2, personalized prayer via `buildEveningPrayer` in Step 4, whisper sound on Done, sleep transition with overlay fade + navigate. Replaced `Link` with `button` + `useNavigate`. Removed `getEveningPrayer` import. Tests require mock updates (Step 3). |
| 3 | Write and Update Tests | [COMPLETE] | 2026-04-01 | Added mocks for audio hooks (`useScenePlayer`, `useSoundEffects`, `useReducedMotion`, `AudioProvider`, `SCENE_BY_ID`, `useNavigate`). Used callable mock functions (`mockUseAudioState`, `mockUseReducedMotion`) for per-test overrides. Updated 2 existing Step 4 tests (Link→button). Added 4 new describe blocks: Ambient Sound Auto-Play (4 tests), Morning Gratitude Recall (3 tests), Personalized Closing Prayer (4 tests), Closing Sound & Sleep Transition (4 tests). All 5133 tests pass (27 new). |
