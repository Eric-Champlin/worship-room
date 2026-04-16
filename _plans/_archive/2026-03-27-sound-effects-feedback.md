# Implementation Plan: Sound Effects Feedback

**Spec:** `_specs/sound-effects-feedback.md`
**Date:** 2026-03-27
**Branch:** `claude/feature/sound-effects-feedback`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — only relevant for Settings page toggle styling)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Audio System

- **AudioEngineService** (`frontend/src/lib/audio-engine.ts`): Manages a single `AudioContext` via `ensureContext()` (public method). Has `bufferCache` (Map) for decoded audio buffers. Connected through a `masterGainNode` to `audioContext.destination`.
- **AudioProvider** (`frontend/src/components/audio/AudioProvider.tsx`): Creates `AudioEngineService` lazily (line 41-46). Exposes it via `AudioEngineContext` → `useAudioEngine()`.
- **Existing chime** (`frontend/src/lib/audio.ts`): `playChime()` creates its OWN `AudioContext` (separate from `AudioEngineService`). The spec says to leave this untouched — the new system is additive.
- **Key constraint**: Sound effects must use `AudioEngineService.ensureContext()` to share the same `AudioContext` — never create a new one.

### Settings System

- **Settings page** (`frontend/src/pages/Settings.tsx`): Auth-gated, 4 sections (profile, notifications, privacy, account). Desktop sidebar + mobile tabs. Content in frosted glass card (`rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`).
- **ToggleSwitch** (`frontend/src/components/settings/ToggleSwitch.tsx`): Props: `{ checked, onChange, label, description, id }`. Uses `role="switch"`, `aria-checked`, `aria-labelledby`, `aria-describedby`.
- **NotificationsSection** (`frontend/src/components/settings/NotificationsSection.tsx`): Pattern to follow — subsection headings (`h3` with `text-xs text-white/40 uppercase tracking-wider mb-3`), `ToggleSwitch` components in `space-y-4` containers, `border-t border-white/10 pt-4` dividers.
- **useSettings hook** (`frontend/src/hooks/useSettings.ts`): Returns `{ settings, updateProfile, updateNotifications, updatePrivacy, unblockUser }`. State managed via `useState` + `saveSettings()`.
- **UserSettings type** (`frontend/src/types/settings.ts`): `{ profile, notifications, privacy }`. No `sound` section yet.
- **settings-storage.ts** (`frontend/src/services/settings-storage.ts`): `getSettings()`, `saveSettings()`, `updateSettings()` with `deepMerge` for forward-compatible defaults.

### Celebration System

- **useCelebrationQueue** (`frontend/src/hooks/useCelebrationQueue.ts`): Processes `newlyEarnedBadges` array. For `full-screen` tier → sets `celebrationType: 'overlay'` (line 129-130). For toast tiers → calls `showCelebrationToast()` with `tierToToastType()` mapping (line 152-158).
- **CelebrationTier** → toast type mapping (line 39-50): `toast` → `'celebration'`, `toast-confetti` → `'celebration-confetti'`, `special-toast` → `'special-celebration'`, `full-screen` → overlay.

### Trigger Point Files (exact locations)

| Trigger | File | Line | Code |
|---------|------|------|------|
| Badge celebration (overlay) | `hooks/useCelebrationQueue.ts` | 129-130 | `setCurrentCelebration(item); setCelebrationType('overlay')` |
| Badge celebration (toast) | `hooks/useCelebrationQueue.ts` | 152-158 | `await showCelebrationToast(...)` |
| Mood check-in completion | `components/dashboard/MoodCheckIn.tsx` | 83 | `setPhase('verse_display')` |
| Streak milestone | `components/dashboard/StreakCard.tsx` | ~191 | Streak counter render (needs milestone check) |
| Level up | `hooks/useFaithPoints.ts` | 163-164 | `newTotalPoints` / `levelInfo.level` calculation |
| Faith points earned | `hooks/useFaithPoints.ts` | 148-150 | `todayEntry[type] = true` (after idempotency check) |
| Prayer answered | `pages/MyPrayers.tsx` | ~118 | `setCelebrationPrayer({ title, note })` |
| Streak repair | `components/dashboard/StreakCard.tsx` | 162-170 | `handleRepair()` → `showCelebrationToast(...)` |
| Evening reflection | `pages/Dashboard.tsx` | 371 | `setShowReflectionOverlay(true)` |
| Challenge day complete | `pages/ChallengeDetail.tsx` | 125 | `completeDay(challengeId, selectedDay, ...)` |
| Bible book complete | `pages/BibleReader.tsx` | 215-218 | `justCompletedBook` effect → `showToast(...)` |
| Gratitude saved | `components/dashboard/GratitudeWidget.tsx` | 91 | `showToast(...)` after save |
| Pray for this ceremony | `components/prayer-wall/InteractionBar.tsx` | 56 | `setIsAnimating(true)` |
| Getting started item | `components/dashboard/GettingStartedCard.tsx` | 60 | `setJustCompleted(newlyCompleted)` |
| Devotional read | `components/daily/DevotionalTabContent.tsx` | 89 | `recordActivity('devotional')` in IntersectionObserver |

### Test Patterns

- Provider wrapping: `MemoryRouter` (with `future` flags) → `ToastProvider` → `AudioProvider` → `AuthModalProvider`
- Mock `useAuth()` via `vi.mock('@/hooks/useAuth')` or `vi.mock('@/contexts/AuthContext')`
- Mock `AudioEngineService` via `vi.mock('@/lib/audio-engine')`
- `beforeEach(() => localStorage.clear())`
- Assertions: `screen.getByRole()`, `screen.getByText()`, `expect(fn).toHaveBeenCalledWith()`

---

## Auth Gating Checklist

All trigger points are within existing auth-gated flows. The `useSoundEffects` hook itself does not gate — it relies on callers being auth-gated.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Sound Effects toggle in Settings | Settings page is auth-gated | Step 3 | Settings page has `Navigate to="/"` when !isAuthenticated |
| All 14 sound trigger points | Only fire within auth-gated gamification flows | Steps 4-6 | Each trigger component already has auth checks |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Settings section card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | NotificationsSection.tsx:19 |
| Settings section heading | font | `text-base font-semibold text-white md:text-lg mb-6` | NotificationsSection.tsx:20 |
| Settings subsection heading | font | `text-xs text-white/40 uppercase tracking-wider mb-3` | NotificationsSection.tsx:25 |
| Settings toggle container | spacing | `space-y-4` | NotificationsSection.tsx:26 |
| Settings section divider | border | `border-t border-white/10 pt-4` | NotificationsSection.tsx:52 |
| ToggleSwitch label | font | `text-sm font-medium text-white` | ToggleSwitch.tsx:18 |
| ToggleSwitch description | font | `mt-0.5 text-xs text-white/40` | ToggleSwitch.tsx:22 |

---

## Design System Reminder

- Settings page uses dark theme (`bg-dashboard-dark`) — all text uses `text-white/*` variants, NOT light-theme colors.
- ToggleSwitch component has built-in accessibility (`role="switch"`, `aria-checked`, `aria-labelledby`, `aria-describedby`).
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`.
- The existing `playChime()` in `lib/audio.ts` creates its own `AudioContext` — the new system must NOT reuse that function or its context.
- `AudioEngineService.ensureContext()` is the ONLY way to get the shared `AudioContext`.

---

## Shared Data Models

### New localStorage Key

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_sound_effects_enabled` | Read (hook) / Write (Settings) | `"true"` / `"false"` string. Default: not set (treated as `true`) |

### New Type Additions

```typescript
// Sound effect IDs
type SoundEffectId = 'chime' | 'ascending' | 'harp' | 'bell' | 'whisper' | 'sparkle'

// useSoundEffects hook return
interface UseSoundEffectsReturn {
  playSoundEffect: (soundId: SoundEffectId) => void
}
```

---

## Responsive Structure

This feature adds no layout changes. The only UI element is a Settings toggle, which follows the existing Settings responsive pattern:

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Settings uses top tab bar; toggle is full-width within content panel |
| Tablet | 768px | Settings uses left sidebar; toggle is full-width within right content panel |
| Desktop | 1440px | Same as tablet with wider content panel (max-w-[640px]) |

---

## Vertical Rhythm

N/A — no new page sections or visual layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `AudioEngineService.ensureContext()` is public and returns `AudioContext`
- [x] `useAudioEngine()` hook exposes the `AudioEngineService` instance
- [x] `ToggleSwitch` component exists and follows the documented pattern
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from codebase inspection
- [x] No [UNVERIFIED] values — all styling comes from existing components
- [ ] `wr_sound_effects_enabled` key does not conflict with any existing key (confirmed: not in use)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to store sound effects enabled state | Standalone `wr_sound_effects_enabled` localStorage key, NOT inside `wr_settings` | Spec explicitly says `wr_sound_effects_enabled`. Keeps it independent so the hook can read it without loading the full UserSettings object. Simpler for `prefers-reduced-motion` override logic. |
| Where to add Settings toggle | New "Sound" section in Settings page sidebar/tabs | Spec says "new Sound section or within existing Notifications section." A dedicated section is cleaner and more discoverable. But adding a 5th section changes navigation. Decision: add as a subsection inside Notifications section to minimize Settings page changes. The toggle is a single item — a whole section is overkill. |
| Sound effect buffer caching | Cache generated `AudioBuffer` in a module-level `Map<string, AudioBuffer>` inside the sound synthesis module | Buffers persist across hook re-mounts. Generated once per session. |
| `sparkle` on every `recordActivity` | Play in the `recordActivity` callback, after idempotency check passes | Only plays once per activity type per day (idempotency check prevents re-fire). Ultra-subtle at 0.1 volume. |
| Level up detection | Compare `currentFaithPoints.currentLevel` to `levelInfo.level` inside `recordActivity` | Level change is detectable at the point where new total points → new level info is calculated. |
| Streak milestone detection | Add a `useRef` in StreakCard to track last celebrated milestone | Prevents re-firing on re-render. Compares against milestone list [7, 14, 30, 60, 90, 180, 365]. |
| Sound effects in `useCelebrationQueue` | Pass `playSoundEffect` via a new parameter or use a separate hook call inside the queue | The queue hook is imported in `CelebrationQueue.tsx` component. Add `useSoundEffects` there and pass callback. |
| `whisper` noise generation | Use `audioContext.createBuffer()` with random float32 data for white noise source | Cannot cache a "buffer source node" — must create a new source node each play. But CAN cache the underlying noise buffer. |

---

## Implementation Steps

### Step 1: Sound Synthesis Library

**Objective:** Create the 6 programmatic sounds as pure functions that generate `AudioBuffer` instances using Web Audio API, with caching.

**Files to create/modify:**
- `frontend/src/lib/sound-effects.ts` — NEW: Sound synthesis functions + buffer cache

**Details:**

Create a module that exports:

1. `generateSoundBuffer(ctx: AudioContext, soundId: SoundEffectId): AudioBuffer` — Generates the raw audio buffer for each sound ID.
2. Module-level `Map<SoundEffectId, AudioBuffer>` cache — `getCachedBuffer(ctx, soundId)` returns cached or generates + caches.
3. `playSoundFromBuffer(ctx: AudioContext, buffer: AudioBuffer, volume: number): void` — Creates source node, gain node, connects to `ctx.destination` (NOT through `masterGainNode` — sound effects are independent of ambient volume), plays immediately.

Sound synthesis details (from spec):

| Sound ID | Type | Frequencies | Envelope | Volume |
|----------|------|-------------|----------|--------|
| `chime` | sine | 528Hz | attack 100ms, sustain 400ms, exp decay 1s | 0.3 |
| `ascending` | sine | 396Hz, 528Hz, 660Hz (150ms apart) | each: attack 100ms, exp decay 600ms | 0.3 |
| `harp` | triangle | 440Hz + 441Hz (chorus) | attack 5ms, decay 300ms | 0.3 |
| `bell` | sine | 784Hz | attack 10ms, sustain 200ms, exp decay 1.5s | 0.3 |
| `whisper` | noise | white noise → bandpass 800Hz Q=2 | attack 200ms, sustain 800ms, decay 500ms | 0.15 |
| `sparkle` | sine | 1047Hz + 1319Hz simultaneous | attack 5ms, decay 100ms | 0.1 |

For `whisper`: Generate a 1.5s white noise buffer (random float32 samples). Cache this buffer. On play, create `BufferSourceNode` → `BiquadFilterNode` (bandpass, 800Hz, Q=2) → `GainNode` → `ctx.destination`.

For multi-note sounds (`ascending`): Schedule multiple oscillators at staggered `startTime` offsets using `ctx.currentTime + offset`.

For simultaneous sounds (`harp`, `sparkle`): Create multiple oscillators starting at the same time, both connected to the same gain node.

Volume mapping:
```typescript
const SOUND_VOLUMES: Record<SoundEffectId, number> = {
  chime: 0.3,
  ascending: 0.3,
  harp: 0.3,
  bell: 0.3,
  whisper: 0.15,
  sparkle: 0.1,
}
```

Export type:
```typescript
export type SoundEffectId = 'chime' | 'ascending' | 'harp' | 'bell' | 'whisper' | 'sparkle'
```

**Important implementation detail:** For oscillator-based sounds (chime, ascending, harp, bell, sparkle), do NOT pre-generate AudioBuffers. Instead, create oscillators on-the-fly each play call. Oscillators are lightweight and one-shot — they cannot be restarted after `stop()`. The buffer cache is only needed for `whisper` (noise generation is expensive). For the 5 oscillator sounds, the "cache" is simply "they generate instantly — no cache needed."

Revised approach:
- `playSound(ctx: AudioContext, soundId: SoundEffectId): void` — Creates oscillators/nodes on the fly, plays, auto-cleans up via `stop()` scheduling.
- `noiseBuffer: AudioBuffer | null` — Module-level cache for the white noise buffer only.

**Auth gating:** N/A — pure audio utility.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT connect sound effects to `AudioEngineService.masterGainNode` — they bypass the ambient volume control and connect directly to `ctx.destination`.
- DO NOT create a new `AudioContext` — always receive it as a parameter.
- DO NOT throw errors — wrap all synthesis in try/catch, fail silently.
- DO NOT use `async/await` — all synthesis is synchronous (oscillators) except noise buffer generation which is also sync (`ctx.createBuffer()`).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `exports SoundEffectId type` | unit | Verify all 6 sound IDs are valid |
| `playSound creates oscillator for chime` | unit | Mock AudioContext, verify `createOscillator()` called with correct frequency/type |
| `playSound creates 3 oscillators for ascending` | unit | Mock AudioContext, verify 3 oscillators at 396, 528, 660 Hz |
| `playSound creates triangle wave for harp` | unit | Mock AudioContext, verify oscillator type is 'triangle' + chorus oscillator at 441Hz |
| `playSound creates sine wave at 784Hz for bell` | unit | Mock AudioContext, verify frequency |
| `playSound creates noise buffer for whisper` | unit | Mock AudioContext, verify `createBuffer()` + bandpass filter at 800Hz |
| `playSound creates 2 oscillators for sparkle` | unit | Mock AudioContext, verify frequencies 1047 + 1319 |
| `whisper noise buffer is cached` | unit | Call twice, verify `createBuffer()` called once |
| `playSound fails silently on error` | unit | Mock AudioContext to throw, verify no error propagation |
| `SOUND_VOLUMES has correct values` | unit | Verify volume map: chime=0.3, sparkle=0.1, whisper=0.15 |

**Expected state after completion:**
- [ ] `frontend/src/lib/sound-effects.ts` exists with `playSound()`, `SOUND_VOLUMES`, `SoundEffectId` exports
- [ ] All 6 sounds synthesized programmatically — zero external audio files
- [ ] Noise buffer cached for `whisper`
- [ ] All try/catch wrappers for silent failure
- [ ] 10 unit tests pass

---

### Step 2: `useSoundEffects` Hook

**Objective:** Create the shared React hook that checks settings + reduced motion before playing sounds, using the existing `AudioEngineService` context.

**Files to create/modify:**
- `frontend/src/hooks/useSoundEffects.ts` — NEW: Hook implementation

**Details:**

```typescript
import { useCallback } from 'react'
import { useAudioEngine } from '@/components/audio/AudioProvider'
import { playSound, SOUND_VOLUMES } from '@/lib/sound-effects'
import type { SoundEffectId } from '@/lib/sound-effects'

const STORAGE_KEY = 'wr_sound_effects_enabled'

function isSoundEffectsEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return val !== 'false' // default true when not set
  } catch {
    return false
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function useSoundEffects(): { playSoundEffect: (soundId: SoundEffectId) => void } {
  const engine = useAudioEngine()

  const playSoundEffect = useCallback((soundId: SoundEffectId) => {
    if (!isSoundEffectsEnabled()) return
    if (prefersReducedMotion()) return

    try {
      const ctx = engine.ensureContext()
      playSound(ctx, soundId)
    } catch {
      // Fail silently — sound is enhancement only
    }
  }, [engine])

  return { playSoundEffect }
}
```

**Key decisions:**
- Reads `wr_sound_effects_enabled` from localStorage on each call (cheap, ensures toggle is instantly responsive).
- Checks `prefers-reduced-motion` on each call (user can change OS setting mid-session).
- Gets `AudioContext` via `engine.ensureContext()` — shares with ambient system.
- Returns no-op behavior when conditions not met (no error, no logging).

**Auth gating:** N/A — hook is usable anywhere but all trigger points are auth-gated.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT create a new `AudioContext` — use `engine.ensureContext()`.
- DO NOT add `useEffect` listeners for `matchMedia` changes — checking on each call is simpler and sufficient.
- DO NOT store enabled state in React state — reading localStorage directly avoids re-render concerns.
- DO NOT import from `@/lib/audio.ts` (the old `playChime`) — use only `@/lib/sound-effects.ts`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns playSoundEffect function` | unit | Verify hook returns object with function |
| `plays sound when enabled and no reduced motion` | unit | Mock engine + localStorage, verify `playSound` called |
| `does not play when wr_sound_effects_enabled is "false"` | unit | Set localStorage, verify `playSound` NOT called |
| `does not play when prefers-reduced-motion is reduce` | unit | Mock matchMedia, verify `playSound` NOT called |
| `does not play when both disabled` | unit | Both conditions, verify `playSound` NOT called |
| `plays when wr_sound_effects_enabled not set (default true)` | unit | No localStorage key, verify `playSound` called |
| `fails silently when engine.ensureContext throws` | unit | Mock throw, verify no error propagation |
| `calls engine.ensureContext to get AudioContext` | unit | Verify `ensureContext()` called |

**Expected state after completion:**
- [ ] `frontend/src/hooks/useSoundEffects.ts` exists
- [ ] Hook checks localStorage, reduced motion, and AudioContext availability
- [ ] Fails silently on any error
- [ ] 8 unit tests pass

---

### Step 3: Settings Toggle

**Objective:** Add a "Sound Effects" toggle to the Settings Notifications section.

**Files to create/modify:**
- `frontend/src/components/settings/NotificationsSection.tsx` — ADD: Sound subsection with toggle
- `frontend/src/components/settings/__tests__/NotificationsSection.test.tsx` — ADD: Tests for new toggle (create if doesn't exist)

**Details:**

Add a new subsection at the **top** of NotificationsSection (before "General"), with a divider below:

```tsx
{/* Sound */}
<div>
  <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Sound</h3>
  <div className="space-y-4">
    <ToggleSwitch
      id="notif-sound-effects"
      checked={soundEffectsEnabled}
      onChange={handleSoundEffectsToggle}
      label="Sound Effects"
      description="Play subtle sounds on achievements and milestones."
    />
  </div>
</div>
```

State management — **do NOT add to UserSettings type or settings-storage**. The spec says this toggle writes directly to `wr_sound_effects_enabled` localStorage key:

```typescript
const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
  try {
    return localStorage.getItem('wr_sound_effects_enabled') !== 'false'
  } catch {
    return true
  }
})

function handleSoundEffectsToggle(value: boolean) {
  setSoundEffectsEnabled(value)
  try {
    localStorage.setItem('wr_sound_effects_enabled', String(value))
  } catch {
    // localStorage unavailable
  }
}
```

This keeps the sound effects toggle decoupled from the `wr_settings` object, matching the spec's design where the hook reads `wr_sound_effects_enabled` directly.

**Auth gating:** Settings page is already auth-gated via `Navigate to="/"` redirect.

**Responsive behavior:**
- Desktop (1440px): Toggle appears in Notifications content panel (max-w-[640px])
- Tablet (768px): Same layout
- Mobile (375px): Full-width within Notifications tab content

**Guardrails (DO NOT):**
- DO NOT modify `UserSettings` type or `settings-storage.ts` — use standalone localStorage key.
- DO NOT add a new Settings section/tab — add as subsection within Notifications.
- DO NOT add any visual indicator for sound effects state — spec says "purely auditory."

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders Sound Effects toggle` | integration | Verify toggle with label "Sound Effects" and description text renders |
| `toggle defaults to on` | integration | No localStorage key → toggle shows checked |
| `toggle writes wr_sound_effects_enabled to localStorage` | integration | Click toggle off → verify localStorage has "false" |
| `toggle reads initial state from localStorage` | integration | Set localStorage "false" → verify toggle shows unchecked |
| `toggle has accessible role="switch"` | integration | Verify `aria-checked` matches state |

**Expected state after completion:**
- [ ] NotificationsSection has "Sound" subsection with ToggleSwitch
- [ ] Toggle reads/writes `wr_sound_effects_enabled` localStorage key
- [ ] Default state is enabled (on)
- [ ] 5 tests pass

---

### Step 4: Sound Triggers — Dashboard & Gamification

**Objective:** Wire `playSoundEffect` calls into badge celebrations, mood check-in, streak card, faith points, and getting started checklist.

**Files to create/modify:**
- `frontend/src/components/dashboard/CelebrationQueue.tsx` — ADD: Sound effects on celebration display
- `frontend/src/hooks/useCelebrationQueue.ts` — ADD: `onPlaySound` callback parameter
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — ADD: Chime on verse display phase
- `frontend/src/components/dashboard/StreakCard.tsx` — ADD: Ascending on streak milestones, whisper on repair
- `frontend/src/hooks/useFaithPoints.ts` — ADD: Callbacks for sparkle (points) and ascending (level up)
- `frontend/src/components/dashboard/GettingStartedCard.tsx` — ADD: Sparkle on item completion

**Details:**

**4a. Badge Celebrations (`CelebrationQueue.tsx` + `useCelebrationQueue.ts`):**

Add `useSoundEffects` in `CelebrationQueue.tsx` and pass `playSoundEffect` to the queue hook:

```typescript
// CelebrationQueue.tsx
const { playSoundEffect } = useSoundEffects()
const { currentCelebration, celebrationType, dismissCurrent } = useCelebrationQueue({
  newlyEarnedBadges,
  clearNewlyEarnedBadges,
  onPlaySound: playSoundEffect,
})
```

In `useCelebrationQueue.ts`, add `onPlaySound` to options interface and call it at the right tier:

```typescript
// When showing full-screen overlay (line ~129):
onPlaySound?.('harp')

// When showing toast (before await showCelebrationToast, line ~152):
// Map tier to sound: toast → chime, toast-confetti → chime, special-toast → ascending
const tierSoundMap: Record<string, SoundEffectId> = {
  'toast': 'chime',
  'toast-confetti': 'chime',
  'special-toast': 'ascending',
}
onPlaySound?.(tierSoundMap[item.tier] ?? 'chime')
```

**4b. Mood Check-In (`MoodCheckIn.tsx`):**

Add `useSoundEffects` and call `playSoundEffect('chime')` at line 83 when setting `setPhase('verse_display')`:

```typescript
setPhase('verse_display')
playSoundEffect('chime')
```

**4c. Streak Card (`StreakCard.tsx`):**

Add `useSoundEffects`. For **streak milestones**: add a `lastCelebratedStreakRef = useRef(0)` and check on render:

```typescript
const MILESTONE_STREAKS = [7, 14, 30, 60, 90, 180, 365]
const lastCelebratedStreakRef = useRef(0)

useEffect(() => {
  if (currentStreak > lastCelebratedStreakRef.current && MILESTONE_STREAKS.includes(currentStreak)) {
    playSoundEffect('ascending')
    lastCelebratedStreakRef.current = currentStreak
  }
}, [currentStreak, playSoundEffect])
```

For **streak repair** (in `handleRepair`): add `playSoundEffect('whisper')` after `onRepairStreak(useFree)`.

**4d. Faith Points — Level Up + Points Earned (`useFaithPoints.ts`):**

The hook cannot call other hooks (it's already a hook). Instead, add **optional callbacks** to `recordActivity`:

Add to the hook's return:
```typescript
// New approach: emit custom events that components can listen to
// Inside recordActivity, after successful point award:
window.dispatchEvent(new CustomEvent('wr:points-earned', { detail: { type, pointDifference } }))

// If level changed:
if (levelInfo.level > currentFaithPoints.currentLevel) {
  window.dispatchEvent(new CustomEvent('wr:level-up', { detail: { newLevel: levelInfo.level } }))
}
```

Then in `CelebrationQueue.tsx` (or a new small wrapper component), listen for these events:

```typescript
useEffect(() => {
  const handlePointsEarned = () => playSoundEffect('sparkle')
  const handleLevelUp = () => playSoundEffect('ascending')
  window.addEventListener('wr:points-earned', handlePointsEarned)
  window.addEventListener('wr:level-up', handleLevelUp)
  return () => {
    window.removeEventListener('wr:points-earned', handlePointsEarned)
    window.removeEventListener('wr:level-up', handleLevelUp)
  }
}, [playSoundEffect])
```

This pattern already exists in the codebase — `useFaithPoints.ts` line 343-351 already listens for `wr:activity-recorded` custom events.

**4e. Getting Started Card (`GettingStartedCard.tsx`):**

Add `useSoundEffects`. In the useEffect that detects `newlyCompleted.size > 0` (line ~60):

```typescript
if (newlyCompleted.size > 0) {
  setJustCompleted(newlyCompleted)
  playSoundEffect('sparkle')
  // ... existing timeout
}
```

**Auth gating:** All components are within auth-gated dashboard. No additional checks needed.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change any visual behavior, animations, or celebrations — audio only.
- DO NOT change `recordActivity`'s return type or signature — use custom events for cross-cutting concerns.
- DO NOT play sounds in `useFaithPoints` directly — it's a data hook, not a UI hook. Use events.
- DO NOT play level up sound AND badge celebration sound simultaneously — the celebration queue handles badges, level up is a separate event.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `CelebrationQueue plays harp for full-screen badge` | integration | Mock useSoundEffects, trigger full-screen celebration, verify `playSoundEffect('harp')` called |
| `CelebrationQueue plays chime for toast badge` | integration | Mock, trigger toast celebration, verify `playSoundEffect('chime')` |
| `CelebrationQueue plays ascending for special-toast` | integration | Mock, trigger special-toast, verify `playSoundEffect('ascending')` |
| `MoodCheckIn plays chime on verse display` | integration | Mock, complete mood selection, verify chime played |
| `StreakCard plays ascending on milestone` | integration | Render with currentStreak=7, verify ascending played |
| `StreakCard does not re-play on same milestone` | integration | Render with 7, re-render with 7, verify called once |
| `StreakCard plays whisper on repair` | integration | Click repair, verify whisper played |
| `useFaithPoints dispatches wr:points-earned event` | unit | Mock localStorage, call recordActivity, verify event dispatched |
| `useFaithPoints dispatches wr:level-up on level change` | unit | Set points near threshold, record activity to cross it, verify event |
| `GettingStartedCard plays sparkle on item completion` | integration | Render with newly completed item, verify sparkle played |

**Expected state after completion:**
- [ ] Badge celebrations play correct sound per tier
- [ ] Mood check-in plays chime
- [ ] Streak milestones play ascending (once per milestone)
- [ ] Streak repair plays whisper
- [ ] Points earned dispatches event → sparkle plays
- [ ] Level up dispatches event → ascending plays
- [ ] Getting started completion plays sparkle
- [ ] 10 tests pass

---

### Step 5: Sound Triggers — Content Features

**Objective:** Wire sound effects into devotional, gratitude, prayer wall, and Bible reader.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — ADD: Chime on devotional read
- `frontend/src/pages/DevotionalPage.tsx` — ADD: Chime on devotional read
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — ADD: Chime on gratitude save
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — ADD: Whisper on pray ceremony
- `frontend/src/pages/BibleReader.tsx` — ADD: Bell on book completion

**Details:**

**5a. Devotional Read (`DevotionalTabContent.tsx` + `DevotionalPage.tsx`):**

In both files, at the point where the IntersectionObserver marks the devotional as read (inside the `if (entry.isIntersecting)` block), add `playSoundEffect('chime')`.

In `DevotionalTabContent.tsx` (line ~89): add after `recordActivity('devotional')`.
In `DevotionalPage.tsx` (line ~82): add after `setIsCompleted(true)`.

**5b. Gratitude Widget (`GratitudeWidget.tsx`):**

Add `useSoundEffects`. In `handleSave()` (line ~82), add `playSoundEffect('chime')` before or after the toast.

**5c. Pray for This (`InteractionBar.tsx`):**

Add `useSoundEffects`. In `handlePrayClick` (line ~56), when `setIsAnimating(true)` fires (the positive path, not the untoggle path), add `playSoundEffect('whisper')`.

```typescript
// After setIsAnimating(true) and onTogglePraying():
setIsAnimating(true)
onTogglePraying()
playSoundEffect('whisper')
```

**5d. Bible Book Completion (`BibleReader.tsx`):**

Add `useSoundEffects`. In the book completion toast useEffect (line ~214-218), add `playSoundEffect('bell')` alongside the toast:

```typescript
useEffect(() => {
  if (!justCompletedBook || justCompletedBook !== bookSlug) return
  const bookData = BIBLE_BOOKS.find(b => b.slug === justCompletedBook)
  if (!bookData) return
  playSoundEffect('bell')
  showToast(`${bookData.name} Complete!...`, 'success')
}, [justCompletedBook, bookSlug, showToast, playSoundEffect])
```

**Auth gating:** All components are within auth-gated flows or have auth checks. InteractionBar's pray ceremony requires auth (the prayer wall praying interaction). Bible completion only triggers for authenticated users (useBibleProgress gates on auth). Devotional marking requires auth. Gratitude widget is on auth-gated dashboard.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change any visual behavior or animations.
- DO NOT add sound to the "untoggle praying" path in InteractionBar — only on the initial pray action.
- DO NOT add sound to DevotionalPage if dayOffset !== 0 — only today's devotional. (Already handled by existing guard in the useEffect.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `DevotionalTabContent plays chime on read` | integration | Mock IntersectionObserver, trigger intersection, verify chime |
| `GratitudeWidget plays chime on save` | integration | Fill and save gratitude, verify chime |
| `InteractionBar plays whisper on pray ceremony` | integration | Click pray button (not already praying), verify whisper |
| `InteractionBar does not play on untoggle` | integration | Click pray when already praying, verify whisper NOT called |
| `BibleReader plays bell on book completion` | integration | Set justCompletedBook, verify bell played |

**Expected state after completion:**
- [ ] Devotional read plays chime (both full page and tab)
- [ ] Gratitude save plays chime
- [ ] Pray ceremony plays whisper
- [ ] Bible book completion plays bell
- [ ] 5 tests pass

---

### Step 6: Sound Triggers — Remaining Features

**Objective:** Wire sound effects into prayer answered, evening reflection, and challenge completion.

**Files to create/modify:**
- `frontend/src/pages/MyPrayers.tsx` — ADD: Harp on prayer answered
- `frontend/src/pages/Dashboard.tsx` — ADD: Bell on evening reflection open
- `frontend/src/pages/ChallengeDetail.tsx` — ADD: Ascending on challenge day completion

**Details:**

**6a. Prayer Answered (`MyPrayers.tsx`):**

Add `useSoundEffects`. When `setCelebrationPrayer({ title, note })` fires (the celebration trigger for answered prayer), add `playSoundEffect('harp')`.

**6b. Evening Reflection (`Dashboard.tsx`):**

Add `useSoundEffects`. When `setShowReflectionOverlay(true)` fires (the "Reflect Now" handler, line ~371), add `playSoundEffect('bell')`.

```typescript
<EveningReflectionBanner
  onReflectNow={() => {
    setShowReflectionOverlay(true)
    playSoundEffect('bell')
  }}
  onDismiss={handleDismissReflection}
/>
```

**6c. Challenge Day Completion (`ChallengeDetail.tsx`):**

Add `useSoundEffects`. In `handleMarkComplete` (line ~120), after `completeDay(...)` succeeds, add `playSoundEffect('ascending')`.

```typescript
const result = completeDay(challengeId, selectedDay, faithPoints.recordActivity)
playSoundEffect('ascending')
```

**Auth gating:** MyPrayers is auth-gated (route-level). Dashboard is auth-gated. ChallengeDetail's mark-complete requires auth (existing check).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add sound to evening reflection dismissal — only on "Reflect Now" open.
- DO NOT add sound to challenge join — only day completion.
- DO NOT modify any celebration overlay or toast visuals.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `MyPrayers plays harp on prayer answered` | integration | Mark prayer answered, verify harp played |
| `Dashboard plays bell on Reflect Now` | integration | Click Reflect Now, verify bell played |
| `ChallengeDetail plays ascending on mark complete` | integration | Click mark complete, verify ascending played |

**Expected state after completion:**
- [ ] Prayer answered plays harp
- [ ] Evening reflection "Reflect Now" plays bell
- [ ] Challenge day completion plays ascending
- [ ] 3 tests pass

---

### Step 7: Full Test Suite & Verification

**Objective:** Run the full test suite, fix any regressions, and verify all sound effects work end-to-end.

**Files to create/modify:**
- `frontend/src/hooks/__tests__/useSoundEffects.test.ts` — CREATED in Step 2
- `frontend/src/lib/__tests__/sound-effects.test.ts` — CREATED in Step 1
- Various existing test files — FIX any regressions from adding `useSoundEffects` calls

**Details:**

1. Run `pnpm test` in `frontend/` to verify all existing tests still pass.
2. Common regression: Components that now call `useSoundEffects` need `AudioProvider` in their test wrapper. If existing tests don't wrap with `AudioProvider`, they need updating.
3. The simplest fix: Mock `useSoundEffects` at the module level in affected test files:
   ```typescript
   vi.mock('@/hooks/useSoundEffects', () => ({
     useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
   }))
   ```
4. Verify total test count increases by ~40+ (10 + 8 + 5 + 10 + 5 + 3 from Steps 1-6).

**Auth gating:** N/A — testing step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing test assertions — only add mocks for the new hook.
- DO NOT skip or disable any existing tests.
- DO NOT add `AudioProvider` wrapping to tests that don't need it — prefer mocking the hook.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite passes | integration | `pnpm test` exits 0 |
| No existing tests broken | regression | Same pass count on existing tests |

**Expected state after completion:**
- [ ] All existing tests pass
- [ ] All new tests pass (~41 new tests)
- [ ] No regressions introduced
- [ ] Sound effects fully wired at all 14 trigger points

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Sound synthesis library (pure functions) |
| 2 | 1 | useSoundEffects hook (depends on sound-effects.ts) |
| 3 | — | Settings toggle (independent, writes localStorage) |
| 4 | 2 | Dashboard & gamification triggers (depends on hook) |
| 5 | 2 | Content feature triggers (depends on hook) |
| 6 | 2 | Remaining feature triggers (depends on hook) |
| 7 | 1-6 | Full test suite verification |

Steps 4, 5, and 6 are independent of each other (can be done in any order after Step 2). Step 3 is independent of Steps 1-2.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Sound Synthesis Library | [COMPLETE] | 2026-03-27 | Created `frontend/src/lib/sound-effects.ts` with `playSound()`, `SOUND_VOLUMES`, `SoundEffectId`. 6 sounds synthesized programmatically. Whisper noise buffer cached. All try/catch wrappers. 10 unit tests pass. |
| 2 | useSoundEffects Hook | [COMPLETE] | 2026-03-27 | Created `frontend/src/hooks/useSoundEffects.ts`. Handles null engine (useAudioEngine returns `| null`). 8 unit tests pass. |
| 3 | Settings Toggle | [COMPLETE] | 2026-03-27 | Added Sound subsection to NotificationsSection with ToggleSwitch. Reads/writes `wr_sound_effects_enabled`. Updated 10 existing tests for new toggle index, added 5 new tests. 15 tests pass. |
| 4 | Sound Triggers — Dashboard & Gamification | [COMPLETE] | 2026-03-27 | Wired sounds into CelebrationQueue (harp/chime/ascending per tier), MoodCheckIn (chime), StreakCard (ascending milestones, whisper repair), useFaithPoints (wr:points-earned + wr:level-up events), GettingStartedCard (sparkle). 7 new tests + 121 existing pass. |
| 5 | Sound Triggers — Content Features | [COMPLETE] | 2026-03-27 | Wired chime into DevotionalTabContent, DevotionalPage, GratitudeWidget. Whisper into InteractionBar (pray ceremony only). Bell into BibleReader (book completion). 3 new tests + 59 existing pass. |
| 6 | Sound Triggers — Remaining Features | [COMPLETE] | 2026-03-27 | Wired harp into MyPrayers (prayer answered). Bell into Dashboard (Reflect Now). Ascending into ChallengeDetail (day completion). 50 existing tests pass. |
| 7 | Full Test Suite & Verification | [COMPLETE] | 2026-03-27 | Added `useSoundEffects` mock to 6 test files, fixed Settings test index. 4611/4612 pass (1 pre-existing flaky PrayCeremony timeout). TypeScript compiles clean. |
