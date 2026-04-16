# Implementation Plan: Sleep Timer + Configurable Fade + Smart Fade

**Spec:** `_specs/sleep-timer-smart-fade.md`
**Date:** 2026-03-09
**Branch:** `claude/feature/sleep-timer-smart-fade`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Existing Audio Infrastructure

- **AudioProvider** (`frontend/src/components/audio/AudioProvider.tsx`): Central context providing `useAudioState()`, `useAudioDispatch()`, `useAudioEngine()`. Enhanced dispatch syncs engine side effects (volume ramps, seek, pause/resume).
- **audioReducer** (`frontend/src/components/audio/audioReducer.ts`): Pure reducer managing `AudioState`. Already has `SET_SLEEP_TIMER` (sets the full `SleepTimer` object) and `TICK_TIMER` (simplistic: decrements `remainingSeconds` by 1, stops all at 0).
- **AudioEngineService** (`frontend/src/lib/audio-engine.ts`): Web Audio API wrapper. Has `masterGainNode`, per-sound `GainNode`s in `soundSources` Map, `foregroundGainNode` for foreground content. Uses `linearRampToValueAtTime` for smooth ramps. Has `pauseAll()`, `resumeAll()`, `stopAll()`, `crossfadeOutForeground()`.
- **AudioState type** (`frontend/src/types/audio.ts`): `SleepTimer` interface exists: `{ isActive, remainingSeconds, fadeDurationSeconds }`. Needs significant expansion for the full timer feature.
- **Constants** (`frontend/src/constants/audio.ts`): `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]` already defined.

### Drawer & Tabs

- **AudioDrawer** (`frontend/src/components/audio/AudioDrawer.tsx`): Mobile bottom-sheet (70vh) / desktop right panel (400px). Contains `DrawerNowPlaying` (40%) + `DrawerTabs` (60%).
- **DrawerTabs** (`frontend/src/components/audio/DrawerTabs.tsx`): 3 tabs: Mixer (implemented), Timer (placeholder text), Saved (placeholder text). ARIA tablist with keyboard nav.

### Audio Pill

- **AudioPill** (`frontend/src/components/audio/AudioPill.tsx`): Fixed floating pill. Shows title, play/pause, waveform bars, progress arc. No timer indicator yet.

### Auth Pattern

- `useAuth()` from `@/hooks/useAuth` returns `{ user, isLoggedIn }` (currently always `false`).
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` returns `{ openAuthModal(subtitle?, view?) }`.
- Pattern: check `isLoggedIn`, if false call `openAuthModal('Sign in to ...')`.

### Toast Pattern

- `useToast()` from `@/components/ui/Toast` returns `{ showToast(message, type?) }`.
- Types: `'success'` (green, polite) or `'error'` (red, assertive). Default is success.

### Test Patterns

- Unit tests for reducer in `__tests__/audioReducer.test.ts`: pure function tests with `stateWith()` helper.
- Component tests mock `AudioProvider` hooks via `vi.mock('../AudioProvider')`, mock `useAuth`/`useAuthModal` similarly.
- Use `MemoryRouter` wrapper, `userEvent.setup()` for interactions, `@testing-library/react` for queries.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Start Timer | Auth modal: "Sign in to use the sleep timer" | Step 4 | `useAuth()` + `useAuthModal()` in TimerTabContent |

Only one action is auth-gated. All other timer interactions (view, select presets, pause/resume/cancel) are either unrestricted or N/A for logged-out users.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Timer pill buttons (selected) | background | `#6D28D9` (`bg-primary`) | design-system.md |
| Timer pill buttons (selected) | color | white | design-system.md |
| Timer pill buttons (unselected) | border | `rgba(255,255,255,0.2)` (`border-white/20`) | spec UX notes |
| Timer pill buttons (unselected) | background | transparent | spec UX notes |
| Timer pill buttons | border-radius | 9999px (`rounded-full`) | design-system.md chip pattern |
| Timer pill buttons | padding | 8px 16px (`py-2 px-4`) | design-system.md chip pattern |
| Timer pill buttons | min-height | 44px (`min-h-[44px]`) | design-system.md touch target |
| Start Timer button | background | `#6D28D9` (`bg-primary`) | design-system.md primary CTA |
| Start Timer button | color | white | design-system.md |
| Start Timer button | padding | 12px 32px (`py-3 px-8`) | design-system.md |
| Start Timer button | border-radius | 8px (`rounded-lg`) | design-system.md |
| Start Timer button | font-weight | 600 (`font-semibold`) | design-system.md |
| Countdown text | font | Inter 600 (semibold) | spec |
| Countdown text | size | 2rem+ (`text-3xl`) | spec |
| Countdown text | color | white | dark drawer context |
| Fade status text | color | `rgba(255,255,255,0.5)` (`text-white/50`) | spec UX notes |
| Fade status text | size | small (`text-sm`) | spec |
| Progress ring | stroke (active) | `#6D28D9` (primary) | spec |
| Progress ring | stroke (track) | `rgba(255,255,255,0.1)` | spec |
| Progress ring | width | 2-3px | spec |
| Notification dot | background | `#6D28D9` (`bg-primary`) | spec |
| Notification dot | size | 8px (`w-2 h-2`) | convention |
| Tab (active) | border-bottom | `2px solid #6D28D9` (`border-b-2 border-primary`) | DrawerTabs.tsx:65 |
| Tab (active) | color | `#6D28D9` (`text-primary`) | DrawerTabs.tsx:65 |
| Disabled button | opacity | 50% (`opacity-50`) | design-system.md |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `SLEEP_TIMER_OPTIONS` and `FADE_DURATION_OPTIONS` constants already exist in `constants/audio.ts`
- [x] `SleepTimer` type and `SET_SLEEP_TIMER`/`TICK_TIMER` actions already exist (will be refactored)
- [x] DrawerTabs Timer placeholder is ready to be replaced
- [x] AudioEngineService has per-sound GainNodes and foreground GainNode with `linearRampToValueAtTime`
- [x] All auth-gated actions from the spec are accounted for in the plan (1 action: Start Timer)
- [x] Design system values verified from reference and codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timer state management | Refactor `SleepTimer` type to store `startTime`, `totalDurationMs`, `fadeDurationMs`, `isPaused`, `pausedRemainingMs` — compute `remainingMs` from wall clock | Self-correcting timer requires wall-clock-based computation, not interval counting |
| Where timer logic lives | Custom `useSleepTimer` hook consumed by AudioProvider and TimerTabContent | Keeps the setInterval, fade scheduling, and phase computation in one place. The hook reads audio state and calls dispatch + engine methods |
| TICK_TIMER removal | Replace `TICK_TIMER` with new `UPDATE_TIMER` action that receives computed remaining time from the hook | The reducer should not compute time — the hook does that with Date.now() |
| Smart fade scheduling | Schedule via `linearRampToValueAtTime` on the Web Audio API timeline when fade phase begins, then rely on the audio graph (no JS-driven volume stepping) | Web Audio API timeline is accurate even when JS is throttled by the browser |
| Engine methods for smart fade | Add `scheduleSleepFade(fadeDurationSec, hasForeground, hasAmbient)` and `cancelScheduledFades()` to AudioEngineService | Centralizes Web Audio API scheduling; hook orchestrates when to call them |
| Ambient "breathe up" on foreground end | Listen for foreground `ended` event in the hook; ramp all ambient GainNodes to their configured volumes over 5s | Removes balance attenuation when foreground naturally ends |
| Pause during fade | Call `cancelScheduledValues()` on all GainNodes, snapshot current gain values, suspend AudioContext | Freezes audio at current levels; resume reschedules fades from current gain values and adjusted remaining time |
| Custom duration input | Clamp to 5–480 min, type="number" with step=1 | Matches spec requirements |
| Fade auto-adjust | When fade >= timer, pick largest FADE_DURATION_OPTIONS value that is < timer; if none (timer=5, all options ≥ 5), default to floor(timer/2) | Ensures a valid full-volume phase always exists |
| "Fading in X:XX" visibility | Show when remaining time ≤ 2× fade duration | Gives enough advance notice without cluttering the UI when far from fade |
| aria-live countdown | Use a separate ref updated every 60 seconds (not every tick) | Spec: "announce every minute, not every second" |

---

## Implementation Steps

### Step 1: Refactor SleepTimer Types and Reducer

**Objective:** Replace the simplistic `SleepTimer` type and `TICK_TIMER` action with a wall-clock-based timer state model.

**Files to create/modify:**
- `frontend/src/types/audio.ts` — expand `SleepTimer` interface, add new action types
- `frontend/src/components/audio/audioReducer.ts` — replace `TICK_TIMER` with new actions

**Details:**

Expand `SleepTimer` interface:
```ts
export interface SleepTimer {
  isActive: boolean
  isPaused: boolean
  totalDurationMs: number
  fadeDurationMs: number
  startTime: number          // Date.now() when timer started
  pausedAt: number | null    // Date.now() when paused (null if running)
  pausedElapsedMs: number    // accumulated elapsed time before current running segment
  phase: 'full-volume' | 'fading' | 'complete'
}
```

Replace `TICK_TIMER` action with:
```ts
| { type: 'START_SLEEP_TIMER'; payload: { totalDurationMs: number; fadeDurationMs: number } }
| { type: 'PAUSE_SLEEP_TIMER' }
| { type: 'RESUME_SLEEP_TIMER' }
| { type: 'CANCEL_SLEEP_TIMER' }
| { type: 'COMPLETE_SLEEP_TIMER' }
| { type: 'UPDATE_TIMER_PHASE'; payload: { phase: SleepTimer['phase'] } }
```

Keep `SET_SLEEP_TIMER` for backward compat but it will just set/clear the full object.

Reducer logic:
- `START_SLEEP_TIMER`: creates `SleepTimer` with `startTime: Date.now()`, `isActive: true`, `isPaused: false`, `phase: 'full-volume'`
- `PAUSE_SLEEP_TIMER`: sets `isPaused: true`, `pausedAt: Date.now()`, accumulates elapsed into `pausedElapsedMs`
- `RESUME_SLEEP_TIMER`: sets `isPaused: false`, resets `startTime: Date.now()`, `pausedAt: null`
- `CANCEL_SLEEP_TIMER`: sets `sleepTimer: null`
- `COMPLETE_SLEEP_TIMER`: pauses all audio (sets `isPlaying: false`), clears `sleepTimer`, keeps `pillVisible: true` (paused state)
- `UPDATE_TIMER_PHASE`: updates `phase` field

**Guardrails (DO NOT):**
- Do NOT remove `SET_SLEEP_TIMER` action type — it may be referenced elsewhere
- Do NOT change the `AudioState.sleepTimer` field name or make it required
- Do NOT add timer logic (setInterval, Date.now computation) to the reducer — that belongs in the hook

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| START_SLEEP_TIMER creates active timer | unit | Verify `isActive: true`, `isPaused: false`, `phase: 'full-volume'`, correct `totalDurationMs` and `fadeDurationMs` |
| PAUSE_SLEEP_TIMER sets isPaused and pausedAt | unit | Verify `isPaused: true`, `pausedAt` is number |
| RESUME_SLEEP_TIMER clears pause state | unit | Verify `isPaused: false`, `pausedAt: null`, new `startTime` |
| CANCEL_SLEEP_TIMER clears timer | unit | Verify `sleepTimer` is `null` |
| COMPLETE_SLEEP_TIMER pauses audio and clears timer | unit | Verify `sleepTimer: null`, `isPlaying: false`, `pillVisible: true` (paused pill stays) |
| UPDATE_TIMER_PHASE updates phase field | unit | Verify phase transitions |

**Expected state after completion:**
- [ ] `SleepTimer` type supports wall-clock-based timing with pause/resume
- [ ] All 6 new actions handled in reducer
- [ ] Existing `TICK_TIMER` tests updated/replaced
- [ ] Tests pass

---

### Step 2: Add Smart Fade Methods to AudioEngineService

**Objective:** Add engine methods for scheduling Web Audio API `linearRampToValueAtTime` fades on foreground and ambient GainNodes, and for cancelling/freezing scheduled fades.

**Files to create/modify:**
- `frontend/src/lib/audio-engine.ts` — add new public methods

**Details:**

Add these methods to `AudioEngineService`:

```ts
/**
 * Schedule smart fade: foreground fades over first 60% of duration,
 * ambient starts fading at 40% and finishes at 100%.
 * If only one lane is active, simple linear fade over full duration.
 */
scheduleSleepFade(fadeDurationSec: number, hasForeground: boolean, hasAmbient: boolean): void

/**
 * Cancel all scheduled fade ramps and freeze gain values at current levels.
 * Returns the current gain values for foreground and all ambient sounds.
 */
freezeFades(): { foregroundGain: number; ambientGains: Map<string, number> }

/**
 * Resume fades from current gain levels. Reschedules ramps from
 * current values to 0 over the remaining fade time.
 */
resumeSleepFade(
  remainingFadeMs: number,
  fadeProgress: number,
  hasForeground: boolean,
  hasAmbient: boolean,
): void

/**
 * Ramp all ambient GainNodes to their configured (stored) volume
 * over the given duration. Used when foreground ends naturally.
 */
breatheUpAmbient(durationMs: number): void

/**
 * Pause all audio: suspend AudioContext + pause foreground <audio>.
 * Same as pauseAll() but public-facing name for the timer.
 */
// (Already exists as pauseAll — reuse it)
```

Implementation of `scheduleSleepFade`:
1. Get current AudioContext time via `this.audioContext.currentTime`
2. **Both foreground + ambient (smart fade):**
   - Foreground GainNode: `setValueAtTime(currentValue, now)`, `linearRampToValueAtTime(0, now + fadeDurationSec * 0.6)`
   - Each ambient GainNode: `setValueAtTime(currentValue, now + fadeDurationSec * 0.4)`, `linearRampToValueAtTime(0, now + fadeDurationSec)`
3. **Foreground only:** `linearRampToValueAtTime(0, now + fadeDurationSec)`
4. **Ambient only:** each ambient GainNode `linearRampToValueAtTime(0, now + fadeDurationSec)`

Implementation of `freezeFades`:
1. For foreground: `cancelScheduledValues(now)`, `setValueAtTime(currentGainValue, now)`
2. For each ambient: same cancel + set
3. Return current values

Implementation of `breatheUpAmbient`:
1. For each entry in `soundSources`: ramp its gainNode to `entry.volume` over `durationMs/1000` seconds

**Guardrails (DO NOT):**
- Do NOT modify existing methods (addSound, removeSound, setSoundVolume, etc.)
- Do NOT access React state from the engine — it receives parameters from the hook
- Do NOT call `pauseAll()` or `stopAll()` from within fade methods — the hook orchestrates that

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| scheduleSleepFade calls linearRampToValueAtTime on foreground + ambient | unit | Mock AudioContext, verify ramp calls with correct timing |
| scheduleSleepFade with only ambient uses full-duration linear fade | unit | Verify no foreground ramp, ambient ramps over full duration |
| freezeFades cancels scheduled values and returns current gains | unit | Verify cancelScheduledValues called, gain values returned |
| breatheUpAmbient ramps each sound to stored volume | unit | Verify ramp targets match entry.volume |

**Expected state after completion:**
- [ ] `scheduleSleepFade`, `freezeFades`, `resumeSleepFade`, `breatheUpAmbient` methods added
- [ ] All methods use Web Audio API timeline (linearRampToValueAtTime)
- [ ] Unit tests for each method pass
- [ ] No changes to existing engine behavior

---

### Step 3: Create useSleepTimer Hook

**Objective:** Build the core timer hook that manages the self-correcting interval, phase transitions, fade scheduling, and edge case handling. This is the brain of the sleep timer.

**Files to create/modify:**
- `frontend/src/hooks/useSleepTimer.ts` — new file

**Details:**

The hook:
- Reads `sleepTimer` from `useAudioState()`
- Uses `useAudioDispatch()` for state updates
- Uses `useAudioEngine()` for fade scheduling
- Manages a `setInterval` (1-second) for the countdown display
- Computes remaining time from wall clock: `totalDurationMs - elapsedMs` where `elapsedMs = pausedElapsedMs + (isPaused ? 0 : Date.now() - startTime)`

**Exports:**
```ts
interface SleepTimerControls {
  // Computed values (recalculated each render / interval tick)
  remainingMs: number
  totalDurationMs: number
  fadeDurationMs: number
  phase: 'full-volume' | 'fading' | 'complete' | null  // null when no timer
  isActive: boolean
  isPaused: boolean

  // Fade status
  fadeStatus: 'none' | 'approaching' | 'fading'
  fadeRemainingMs: number  // ms until fade starts (0 if already fading)

  // Actions
  start: (totalDurationMs: number, fadeDurationMs: number) => void
  pause: () => void
  resume: () => void
  cancel: () => void
}
```

**Core logic:**

1. **setInterval (1s):** On each tick, compute `remainingMs` from wall clock. Force a re-render with a state counter increment. This drives the countdown display.

2. **Phase detection:** On each tick, check if `remainingMs <= fadeDurationMs` and `phase === 'full-volume'`. If so:
   - Dispatch `UPDATE_TIMER_PHASE` with `'fading'`
   - Read current audio state to determine if foreground and/or ambient are active
   - Call `engine.scheduleSleepFade(fadeDurationSec, hasForeground, hasAmbient)`

3. **Timer completion:** When `remainingMs <= 0`:
   - Call `engine.pauseAll()`
   - Dispatch `COMPLETE_SLEEP_TIMER`
   - Show "Timer complete" toast

4. **Pause during fade:**
   - Call `engine.freezeFades()` to cancel all scheduled ramps
   - Call `engine.pauseAll()`
   - Dispatch `PAUSE_SLEEP_TIMER`

5. **Resume during fade:**
   - Dispatch `RESUME_SLEEP_TIMER`
   - Call `engine.resumeAll()`
   - If still in fade phase, call `engine.resumeSleepFade()` with remaining fade time and current progress

6. **Cancel:**
   - Call `engine.freezeFades()` (cancel ramps)
   - Dispatch `CANCEL_SLEEP_TIMER`
   - Show "Timer cancelled" toast

7. **Foreground ended naturally:**
   - Listen for foreground content becoming null while timer is active (via useEffect on `audioState.foregroundContent`)
   - Call `engine.breatheUpAmbient(5000)` to ramp ambient back to full
   - When fade phase arrives, only schedule ambient fade (no foreground)

8. **User stops all audio during timer:**
   - Listen for `isPlaying` becoming false and `activeSounds.length === 0` and `foregroundContent === null`
   - Cancel the timer, show "Timer cancelled" toast

**fadeStatus computation:**
- `'none'`: remaining > 2 × fadeDuration or no timer
- `'approaching'`: remaining <= 2 × fadeDuration and phase === 'full-volume'
- `'fading'`: phase === 'fading'

**Cleanup:** Clear the interval on unmount or when timer becomes inactive.

**Guardrails (DO NOT):**
- Do NOT store remaining time in React state on every tick — compute from wall clock on each render/tick
- Do NOT use requestAnimationFrame for the timer logic — only setInterval at 1s. RAF is optional for smoothing the countdown display if desired in the component.
- Do NOT call engine methods if engine is null (check first)
- Do NOT write to localStorage — timer is ephemeral, spec says zero persistence

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| start() dispatches START_SLEEP_TIMER with correct values | unit | Mock dispatch, verify payload |
| pause() dispatches PAUSE_SLEEP_TIMER and calls engine.freezeFades | unit | Mock engine + dispatch |
| resume() dispatches RESUME_SLEEP_TIMER and calls engine.resumeAll | unit | Mock engine + dispatch |
| cancel() dispatches CANCEL_SLEEP_TIMER and shows toast | unit | Mock dispatch + useToast |
| Timer phase transitions from full-volume to fading at correct time | unit | Use fake timers, verify dispatch and engine calls |
| Timer completes and pauses all audio | unit | Use fake timers, verify COMPLETE_SLEEP_TIMER dispatch |
| foreground ending naturally triggers breatheUpAmbient | unit | Simulate foreground becoming null, verify engine call |
| Self-correcting: remaining computed from Date.now, not tick count | unit | Advance Date.now by arbitrary amounts, verify remainingMs |

**Expected state after completion:**
- [ ] `useSleepTimer` hook exists and is fully functional
- [ ] Self-correcting timer computes from `Date.now()`
- [ ] Smart fade scheduling calls engine at correct phase boundary
- [ ] Pause/resume during fade freezes/restores correctly
- [ ] All edge cases handled (foreground ends, user stops audio, scene switch)
- [ ] Tests pass

---

### Step 4: Build TimerTabContent Component

**Objective:** Create the Timer tab UI with setup view (presets + fade selector + Start button) and active countdown view (ring + countdown + controls).

**Files to create/modify:**
- `frontend/src/components/audio/TimerTabContent.tsx` — new file
- `frontend/src/components/audio/TimerProgressRing.tsx` — new file (SVG circular progress)
- `frontend/src/components/audio/DrawerTabs.tsx` — replace Timer placeholder with `<TimerTabContent />`

**Details:**

**TimerTabContent.tsx:**

Two views, toggled by `isActive` from `useSleepTimer()`:

**Setup View (no active timer):**
```
"Sleep Timer" label (text-sm text-white/50, uppercase tracking)

Timer Duration section:
  - "Set timer for..." label
  - Pill button row: 15, 30, 45, 60, 90 min + "Custom" toggle
  - Custom input (conditional): type="number", min=5, max=480, step=1
  - Buttons: rounded-full, py-2 px-4, min-h-[44px]
  - Selected: bg-primary text-white
  - Unselected: border border-white/20 text-white/70 hover:bg-white/10
  - Container: flex flex-wrap gap-2

Fade Duration section:
  - "Fade out over..." label (text-sm text-white/50)
  - Pill button row: 5, 10, 15, 30 min
  - Same styling as timer buttons
  - 10 min pre-selected (default)

"Start Timer" button:
  - bg-primary text-white font-semibold py-3 px-8 rounded-lg w-full
  - Disabled when no duration selected: opacity-50 cursor-not-allowed
  - Auth-gated: if !isLoggedIn, call openAuthModal('Sign in to use the sleep timer')
  - aria-label="Start sleep timer for {duration} minutes with {fade} minute fade"
```

**Active Countdown View:**
```
TimerProgressRing (SVG) surrounding:
  - "{mm}:{ss} remaining" in text-3xl font-semibold text-white, centered

Fade status text below ring:
  - "Fading in {mm}:{ss}" or "Fading now..."
  - text-sm text-white/50
  - Only shown when fadeStatus !== 'none'
  - "Fading now..." uses aria-live="assertive"

Control buttons (flex gap-3, centered):
  - Pause/Resume: rounded-lg border border-white/20 py-2 px-6 text-white
    - aria-label="Pause sleep timer" / "Resume sleep timer"
  - Cancel (X): rounded-lg border border-white/20 py-2 px-4 text-white/70
    - aria-label="Cancel sleep timer"

Read-only fade display:
  - "Fade: {N} min" text-xs text-white/30
```

**Countdown aria-live (every minute):**
- Separate `sr-only` div with `aria-live="polite"`
- Updated via ref every 60 seconds (not every tick)
- Text: "{N} minutes remaining" (rounded to nearest minute)

**Responsive behavior:**
- Desktop (> 1024px): Pill buttons in single row, generous spacing
- Tablet (640-1024px): Same single row
- Mobile (< 640px): Timer buttons `flex-wrap`, wraps to 2 rows (3 per row). Use `grid grid-cols-3 gap-2` for consistent wrapping. Countdown centered.

**Fade auto-adjustment logic:**
- When timer duration changes, check if current fade >= timer
- If so, find largest option in `FADE_DURATION_OPTIONS` that is < timer
- If none (timer=5), use `Math.floor(timer / 2)`
- Show toast: "Fade adjusted to fit timer"

**Auth gating:**
- `useAuth()` → `{ isLoggedIn }`
- `useAuthModal()` → `{ openAuthModal }`
- In `handleStartTimer()`: if `!isLoggedIn`, call `openAuthModal('Sign in to use the sleep timer')` and return early

**TimerProgressRing.tsx:**

SVG component. Props: `progress: number` (0-1, 1=full, 0=empty), `size?: number` (default 160).
- `<svg>` with viewBox
- Background circle: `stroke="rgba(255,255,255,0.1)"`, `strokeWidth="3"`
- Progress circle: `stroke="#6D28D9"`, `strokeWidth="3"`, `strokeDasharray` + `strokeDashoffset` for depletion
- `transform="rotate(-90)"` to start from top
- Depletes clockwise: dashoffset increases as progress decreases
- `strokeLinecap="round"` for clean ends
- Transition: `transition: stroke-dashoffset 1s linear` for smooth animation

**DrawerTabs.tsx changes:**
- Import `TimerTabContent`
- Replace placeholder branch `activeTab === 'Timer'` rendering

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` anywhere
- Do NOT write to localStorage for logged-out users
- Do NOT add crisis detection — this feature has no text input
- Do NOT add requestAnimationFrame for the ring — CSS transition handles smoothing
- Do NOT forget the auth gate on Start Timer

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders preset duration buttons | integration | 5 buttons visible: 15, 30, 45, 60, 90 |
| Selecting preset highlights it and deselects others | integration | Click 30, verify aria-checked state |
| Custom input clears preset selection | integration | Type custom value, verify presets unselected |
| Fade preset buttons render with 10 default selected | integration | 4 buttons, 10 has aria-checked=true |
| Fade auto-adjusts when >= timer | integration | Select 15 timer + 30 fade, verify fade changes to 10, toast shown |
| Start Timer disabled when no duration selected | integration | Button has disabled attribute |
| Start Timer triggers auth modal when logged out | integration | Mock isLoggedIn=false, click Start, verify openAuthModal called with 'Sign in to use the sleep timer' |
| Start Timer calls start() from useSleepTimer when logged in | integration | Mock isLoggedIn=true, verify hook start called |
| Active timer shows countdown display | integration | Set active timer, verify "{mm}:{ss} remaining" text |
| Progress ring renders with correct progress | unit | Pass progress=0.5, verify strokeDashoffset |
| Pause button dispatches pause | integration | Click Pause, verify |
| Cancel button dispatches cancel | integration | Click Cancel, verify |
| Fade status shows "Fading in" when approaching | integration | Set fadeStatus='approaching', verify text |
| Fade status shows "Fading now..." when fading | integration | Set fadeStatus='fading', verify text and aria-live="assertive" |
| Timer preset buttons have role="radiogroup" | integration | Check ARIA roles |
| Countdown aria-live announces every minute | integration | Verify sr-only region updates |
| Responsive: mobile wraps to 2 rows | integration | Verify grid-cols-3 class exists |

**Expected state after completion:**
- [ ] Timer tab shows full setup UI (presets, fade, Start button)
- [ ] Timer tab shows active countdown with ring, controls, fade status
- [ ] Auth gate works (logged-out → auth modal on Start)
- [ ] Fade auto-adjustment with toast
- [ ] All ARIA attributes correct
- [ ] Responsive layout for 3 breakpoints
- [ ] Tests pass

---

### Step 5: Integrate Timer Notification Dot and Pill Indicator

**Objective:** Add the notification dot to the Timer tab label when a timer is active, and optionally show a timer indicator on the floating pill.

**Files to create/modify:**
- `frontend/src/components/audio/DrawerTabs.tsx` — add notification dot to Timer tab
- `frontend/src/components/audio/AudioPill.tsx` — optional: add subtle timer icon when timer is active

**Details:**

**DrawerTabs.tsx:**
- Import `useAudioState` to read `sleepTimer`
- On the Timer tab button, conditionally render a small purple dot when `sleepTimer?.isActive`:
  ```tsx
  <span className="relative">
    Timer
    {sleepTimer?.isActive && (
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
    )}
  </span>
  ```
- The dot is visible regardless of which tab is selected (it's on the tab label, always rendered)

**AudioPill.tsx (optional indicator):**
- When `state.sleepTimer?.isActive && !state.sleepTimer.isPaused`, show a small `Clock` icon (Lucide) next to the title
- `<Clock size={14} className="text-white/50" />`
- Subtle, informational — not dominant

**Guardrails (DO NOT):**
- Do NOT change tab switching logic
- Do NOT change pill click/interaction behavior
- Do NOT add timer countdown to the pill (spec says it's a subtle indicator, not a full display)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Notification dot visible when timer active | integration | Mock sleepTimer.isActive=true, verify dot element exists |
| Notification dot hidden when no timer | integration | Mock sleepTimer=null, verify no dot |
| Dot visible when Mixer tab is selected | integration | Active tab=Mixer, timer active, verify dot on Timer label |

**Expected state after completion:**
- [ ] Purple notification dot on Timer tab label when timer active
- [ ] Dot visible regardless of selected tab
- [ ] Optional clock icon on pill
- [ ] Tests pass

---

### Step 6: Wire useSleepTimer into AudioProvider

**Objective:** Initialize the `useSleepTimer` hook within the AudioProvider so the timer interval runs globally (not just when TimerTabContent is mounted).

**Files to create/modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — call `useSleepTimer` and optionally expose its controls via context

**Details:**

The `useSleepTimer` hook must run at the AudioProvider level because:
1. The timer continues even when the drawer is closed (TimerTabContent unmounts)
2. The hook manages the setInterval and fade scheduling
3. It needs access to audio state and engine

Option: Create a `SleepTimerContext` to pass the hook's controls down, or simply call the hook in AudioProvider and let TimerTabContent call it again (the hook reads the same reducer state, so both instances compute the same values — but only one should run the interval).

**Chosen approach:** The hook manages its own interval and is idempotent — safe to call from multiple components because the interval only starts if a timer is active and no interval is already running. Use a module-level ref or the hook itself manages deduplication via a `useRef<boolean>` flag.

Actually, simpler: call `useSleepTimer` only in AudioProvider. Export the controls via a new `SleepTimerContext`. TimerTabContent consumes from that context.

```tsx
// In AudioProvider:
const sleepTimerControls = useSleepTimer()

// New context:
const SleepTimerControlsContext = createContext<SleepTimerControls | null>(null)

// Export hook:
export function useSleepTimerControls(): SleepTimerControls {
  const ctx = useContext(SleepTimerControlsContext)
  if (!ctx) throw new Error('useSleepTimerControls must be used within AudioProvider')
  return ctx
}
```

Then `TimerTabContent` uses `useSleepTimerControls()` instead of calling `useSleepTimer()` directly.

**Guardrails (DO NOT):**
- Do NOT create a separate provider — embed the context in AudioProvider
- Do NOT change the existing 3 contexts' structure — just add a 4th
- Do NOT run two intervals — one source of truth in AudioProvider

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useSleepTimerControls returns controls from AudioProvider | integration | Render within provider, verify controls available |
| Timer interval runs even when drawer is closed | integration | Start timer, close drawer, verify timer still ticking |

**Expected state after completion:**
- [ ] `useSleepTimer` runs in AudioProvider
- [ ] `SleepTimerControlsContext` exposed via `useSleepTimerControls()`
- [ ] TimerTabContent consumes controls from context
- [ ] Timer keeps running when drawer closes
- [ ] Tests pass

---

### Step 7: Handle Timer Edge Cases in AudioProvider

**Objective:** Wire up edge case handling: user stops all audio during timer → cancel timer; user dispatches STOP_ALL → cancel timer; scene switch during timer → timer continues.

**Files to create/modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — add edge case handling in enhancedDispatch
- `frontend/src/components/audio/audioReducer.ts` — ensure STOP_ALL also clears sleepTimer

**Details:**

**In the reducer:**
- `STOP_ALL` should also set `sleepTimer: null` (already clears everything else). Verify this.

**In enhancedDispatch (AudioProvider):**
- When `STOP_ALL` is dispatched while a timer is active, the timer hook's interval will see `sleepTimer === null` on next tick and stop itself.
- No special wiring needed here — the hook is reactive to state.

**In useSleepTimer hook (from Step 3):**
- The hook already watches for `sleepTimer === null` and cleans up its interval.
- When user dispatches `PAUSE_ALL` manually (not from the timer), the timer should NOT auto-cancel. The timer only auto-cancels on `STOP_ALL` (which means user stopped everything).
- Differentiating: if `PAUSE_ALL` is dispatched and timer is active, the timer should also pause. Add a `useEffect` in the hook that watches `audioState.isPlaying`:
  - If `isPlaying` goes `false` and timer is active and not paused → call `pause()`
  - If `isPlaying` goes `true` and timer is active and paused → call `resume()`
  - This syncs the timer with manual play/pause from the pill or keyboard.

**Scene switch during timer:**
- Scene switching dispatches `REMOVE_SOUND` (for old sounds) and `ADD_SOUND` (for new sounds).
- The timer is unaffected — it reads `activeSounds` on each tick.
- When fade is active and new sounds are added, the hook should apply the current fade level to new sounds via the engine.
- In `useSleepTimer`, watch for `activeSounds` changes during fade phase: when a new sound appears, immediately schedule its fade to match the current fade progress.

**Guardrails (DO NOT):**
- Do NOT auto-cancel the timer on `PAUSE_ALL` — only on `STOP_ALL`
- Do NOT break the existing space-bar play/pause behavior
- Do NOT change scene crossfade logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| STOP_ALL during active timer clears sleepTimer | unit (reducer) | Dispatch STOP_ALL, verify sleepTimer is null |
| Manual PAUSE_ALL pauses the timer | integration | Verify timer isPaused syncs with isPlaying |
| Manual PLAY_ALL resumes the timer | integration | Verify timer resumes when isPlaying becomes true |
| New sounds added during fade get current fade level | integration | Add sound during fade, verify engine call |

**Expected state after completion:**
- [ ] STOP_ALL clears timer
- [ ] Manual pause/resume syncs timer state
- [ ] Scene switch doesn't break timer
- [ ] New sounds during fade get correct levels
- [ ] Tests pass

---

### Step 8: Comprehensive Integration Tests

**Objective:** Write integration tests covering the full timer lifecycle, smart fade behavior, and edge cases.

**Files to create/modify:**
- `frontend/src/components/audio/__tests__/TimerTabContent.test.tsx` — new file
- `frontend/src/components/audio/__tests__/useSleepTimer.test.ts` — new file
- `frontend/src/components/audio/__tests__/TimerProgressRing.test.tsx` — new file

**Details:**

**TimerTabContent.test.tsx** — Component tests following the MixerTabContent.test.tsx pattern:
- Mock `useSleepTimerControls()` to return controlled values
- Mock `useAuth()`/`useAuthModal()` for auth gate tests
- Test both setup and active countdown views
- Test responsive classes

**useSleepTimer.test.ts** — Hook tests using `renderHook`:
- Use `vi.useFakeTimers()` for timer control
- Mock `AudioEngineService` to verify engine method calls
- Test phase transitions, pause/resume, cancel
- Test self-correcting behavior: advance `Date.now()` by arbitrary amounts
- Test smart fade: verify `scheduleSleepFade` called with correct parameters
- Test foreground ending: verify `breatheUpAmbient` called

**TimerProgressRing.test.tsx** — SVG rendering tests:
- Progress=1 → full ring (dashoffset=0)
- Progress=0 → empty ring (dashoffset=circumference)
- Progress=0.5 → half ring

**Test list covering spec acceptance criteria:**
| Test | File | Covers |
|------|------|--------|
| Timer shows 5 preset buttons | TimerTabContent | AC: preset buttons |
| Custom duration input accepts 5-480 | TimerTabContent | AC: custom input |
| Fade defaults to 10 min | TimerTabContent | AC: default fade |
| Fade auto-adjusts with toast | TimerTabContent | AC: auto-adjust |
| Start disabled without selection | TimerTabContent | AC: disabled state |
| Auth modal on Start when logged out | TimerTabContent | AC: auth gate |
| Countdown shows mm:ss remaining | TimerTabContent | AC: countdown |
| Ring depletes clockwise | TimerProgressRing | AC: progress ring |
| Pause freezes timer | useSleepTimer | AC: pause/resume |
| Cancel returns to setup + toast | TimerTabContent | AC: cancel |
| Fading in text shows when approaching | TimerTabContent | AC: fade status |
| Fading now text shows during fade | TimerTabContent | AC: fade status |
| Smart fade: fg fades over 60% | useSleepTimer | AC: smart fade |
| Smart fade: ambient starts at 40% | useSleepTimer | AC: smart fade |
| Linear fade when only one lane | useSleepTimer | AC: single lane |
| Self-correcting via Date.now | useSleepTimer | AC: self-correcting |
| Breathe up when fg ends naturally | useSleepTimer | AC: breathe up |
| Radiogroup ARIA on presets | TimerTabContent | AC: accessibility |
| aria-live on countdown | TimerTabContent | AC: accessibility |

**Guardrails (DO NOT):**
- Do NOT test implementation details (internal state shape) — test observable behavior
- Do NOT rely on real timers — always use `vi.useFakeTimers()`
- Do NOT import the real AudioEngineService in tests — mock it

**Expected state after completion:**
- [ ] 30+ tests covering timer UI, hook logic, and progress ring
- [ ] All acceptance criteria have corresponding tests
- [ ] All tests pass with `pnpm test`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Refactor SleepTimer types and reducer actions |
| 2 | — | Add smart fade methods to AudioEngineService |
| 3 | 1, 2 | Create useSleepTimer hook (uses new types + engine methods) |
| 4 | 3 | Build TimerTabContent UI component (uses hook) |
| 5 | 1 | Add notification dot to DrawerTabs + pill indicator |
| 6 | 3 | Wire useSleepTimer into AudioProvider context |
| 7 | 3, 6 | Handle edge cases (STOP_ALL, pause/resume sync, scene switch) |
| 8 | 4, 5, 6, 7 | Comprehensive integration tests |

Steps 1 and 2 can run in parallel. Step 5 can run in parallel with Steps 3-4.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Refactor SleepTimer types & reducer | [COMPLETE] | 2026-03-09 | Expanded SleepTimer interface (8 fields), added 6 new actions (START/PAUSE/RESUME/CANCEL/COMPLETE/UPDATE_TIMER_PHASE), TICK_TIMER kept as no-op for backward compat, STOP_ALL now clears sleepTimer. 34 tests pass. |
| 2 | Add smart fade to AudioEngineService | [COMPLETE] | 2026-03-09 | Added scheduleSleepFade, freezeFades, resumeSleepFade, breatheUpAmbient methods. 4 new test suites (7 tests) in audio-engine.test.ts. 32 total engine tests pass. |
| 3 | Create useSleepTimer hook | [COMPLETE] | 2026-03-09 | Created hooks/useSleepTimer.ts with SleepTimerControls interface, wall-clock computation, phase transitions, fade scheduling, foreground-end breathe-up, auto-cancel on stop-all. 13 tests pass. |
| 4 | Build TimerTabContent component | [COMPLETE] | 2026-03-09 | Created TimerTabContent.tsx (setup + active views), TimerProgressRing.tsx (SVG), updated DrawerTabs.tsx. Also wired SleepTimerBridge + useSleepTimerControls context in AudioProvider (pulled from Step 6). Fixed 3 test files (Toast mock, updated placeholder assertion). 155 audio tests pass. |
| 5 | Notification dot & pill indicator | [COMPLETE] | 2026-03-09 | Added purple notification dot to Timer tab label in DrawerTabs.tsx (data-testid="timer-notification-dot"), Clock icon on AudioPill when timer active. All tests pass. |
| 6 | Wire hook into AudioProvider | [COMPLETE] | 2026-03-09 | Implemented during Step 4: SleepTimerBridge inner component, SleepTimerControlsContext, useSleepTimerControls export. Timer runs globally inside AudioProvider tree. |
| 7 | Handle edge cases | [COMPLETE] | 2026-03-09 | Added manual play/pause sync (spacebar/pill → timer pause/resume), new-sounds-during-fade rescheduling, STOP_ALL verified (Step 1). All 200 tests pass. |
| 8 | Comprehensive integration tests | [COMPLETE] | 2026-03-09 | Created TimerTabContent.test.tsx (24 tests), TimerProgressRing.test.tsx (8 tests). Combined with useSleepTimer.test.ts (13), audioReducer new tests (9), audio-engine new tests (7). All 745 tests pass across 91 files. Build succeeds. |
