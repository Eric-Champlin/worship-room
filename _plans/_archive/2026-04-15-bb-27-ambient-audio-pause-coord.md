# Implementation Plan: BB-27 — Ambient Audio Pause Coordination with Bible Audio

**Spec:** `_specs/bb-27-ambient-audio-pause-coord.md`
**Date:** 2026-04-15
**Branch:** `claude/feature/bb-27-ambient-audio-pause-coord`
**Design System Reference:** N/A (no UI changes — BB-27 is an invisible coordination layer)
**Recon Report:** Not applicable
**Master Spec Plan:** BB-26 plan at `_plans/2026-04-14-bb-26-fcbh-audio-bible-integration.md` + BB-29 plan at `_plans/2026-04-14-bb-29-continuous-playback-auto-advance.md` + BB-28 plan at `_plans/2026-04-15-bb-28-sleep-timer-bible-audio.md` (reference only — BB-27 extends the shipped architecture)

---

## Architecture Context

**BB-27 is a coordination bridge between two independent audio subsystems.** No new UI, no new dependencies, no new localStorage keys. The entire spec is a small useEffect in the Bible audio provider that watches `state.playbackState` transitions and dispatches pause/resume actions to the ambient `AudioProvider`.

**Two audio subsystems in play:**

1. **Ambient audio** (`AudioProvider` at `components/audio/AudioProvider.tsx`) — manages ambient sounds (rain, wind, etc.) via Web Audio API. State shape defined at `types/audio.ts:47-63`. 31 action types. Consumer hooks: `useAudioState()`, `useAudioDispatch()`. Enhanced dispatch at line 56-156 syncs side effects to the audio engine.

2. **Bible audio** (`AudioPlayerProvider` at `contexts/AudioPlayerProvider.tsx`) — manages FCBH Bible chapter playback via Howler. State shape defined at `types/bible-audio.ts`. 19 action types. Consumer hook: `useAudioPlayer()` at `hooks/audio/useAudioPlayer.ts`.

**Component tree mounting order (App.tsx:216-217):**
```
<AudioProvider>        ← ambient (parent)
  <AudioPlayerProvider>  ← Bible (child)
    ...all routes...
  </AudioPlayerProvider>
</AudioProvider>
```

`AudioPlayerProvider` is a child of `AudioProvider`, which means `AudioPlayerProvider` can consume the ambient dispatch via `useAudioDispatch()`. This is the key architectural enabler — the Bible audio provider has access to the ambient audio dispatch.

**Ambient state tracking for pause/resume snapshot:**

- `state.activeSounds: ActiveSound[]` — array of `{ soundId, volume, label }`. Each active ambient sound.
- `state.isPlaying: boolean` — global play/pause state for ambient.
- `state.masterVolume: number` — 0-1 range, default 0.8.
- The ambient engine uses crossfade looping (`AudioEngineService`). There is no explicit per-sound playback position in state — ambient sounds are loops, so position is not meaningful for resume. BB-27 captures `soundId` and `volume` per sound, plus `masterVolume`.

**Ambient pause/resume behavior:**

- `PAUSE_ALL` action: calls `engine.pauseAll()` which does `audioContext.suspend()` + `foregroundElement.pause()`. **Hard cut, no fade.**
- `PLAY_ALL` action: calls `engine.resumeAll()` which does `foregroundElement.play()`. **Hard cut, no fade.**
- Per-sound fade-in/out exists (1000ms `linearRampToValueAtTime`) only for ADD_SOUND/REMOVE_SOUND.
- Since the existing pause/resume is a hard cut, BB-27 uses a hard cut. The spec says: "If the existing ambient subsystem does a hard cut on pause, BB-27 should NOT add a fade layer on top."

**Bible `playbackState` values and transitions (from `AudioPlayerContext.ts`):**

| From | To | Trigger | BB-27 action |
|------|-----|---------|-------------|
| `idle` | `loading` | `LOAD_START` (user plays chapter) | PAUSE ambient |
| `idle` | `loading` | `LOAD_NEXT_CHAPTER_START` (auto-advance) | N/A — already paused from initial start |
| `loading` | `playing` | `PLAY` (auto after load) | N/A — already paused |
| `playing` | `paused` | `PAUSE` (user taps pause) | NO resume — pause is momentary |
| `paused` | `playing` | `PLAY` (user unpauses) | N/A — already paused |
| `playing`/`paused` | `idle` | `CLOSE` | RESUME ambient |
| `playing`/`paused` | `idle` | `STOP` (from sleep fade complete) | RESUME ambient |
| `error` | `idle` | `DISMISS_ERROR` | RESUME ambient |
| `playing`/`paused` | `idle` | `END_OF_BIBLE` (Rev 22 done) | RESUME ambient |
| `playing`/`paused` | `error` | `LOAD_ERROR` | NO resume — error not dismissed yet |

**Key transition rule:** BB-27 fires ambient pause on `idle → loading|playing` and ambient resume on `(loading|playing|paused) → idle`. The `paused` state does NOT trigger resume.

**User-initiated ambient actions that must clear `pausedByBibleAudio`:**

Every existing user-action reducer branch in `audioReducer.ts` that represents explicit user choice must clear the `pausedByBibleAudio` snapshot. Based on the full 31-action inventory:

| Action | Reason |
|--------|--------|
| `ADD_SOUND` | User explicitly adds a sound |
| `REMOVE_SOUND` | User explicitly removes a sound |
| `SET_SOUND_VOLUME` | User adjusts volume |
| `SET_MASTER_VOLUME` | User adjusts master volume |
| `PLAY_ALL` | User resumes ambient |
| `PAUSE_ALL` | User pauses ambient |
| `STOP_ALL` | User stops all ambient |
| `SET_SCENE_NAME` | User selects a scene preset |
| `START_FOREGROUND` | User starts foreground audio |
| `PAUSE_FOREGROUND` | User pauses foreground |
| `SET_FOREGROUND_BACKGROUND_BALANCE` | User adjusts balance |

Actions NOT clearing `pausedByBibleAudio` (system/timer/internal):
- `FOREGROUND_ENDED`, `SEEK_FOREGROUND`, `UPDATE_FOREGROUND_POSITION` — system updates
- `TICK_TIMER`, `SET_SLEEP_TIMER`, `START_SLEEP_TIMER`, `PAUSE_SLEEP_TIMER`, `RESUME_SLEEP_TIMER`, `CANCEL_SLEEP_TIMER`, `COMPLETE_SLEEP_TIMER`, `UPDATE_TIMER_PHASE` — sleep timer internals
- `OPEN_DRAWER`, `CLOSE_DRAWER` — UI state only
- `START_ROUTINE`, `ADVANCE_ROUTINE_STEP`, `SKIP_ROUTINE_STEP`, `SET_ROUTINE_PHASE`, `END_ROUTINE` — routine automation
- `SET_READING_CONTEXT`, `CLEAR_READING_CONTEXT` — metadata

**Test patterns (from `contexts/__tests__/AudioPlayerContext.test.tsx`):**

- Engine is mocked via `vi.mock('@/lib/audio/engine')` with a `makeEngineStub` factory that captures event callbacks.
- Provider test wrapper uses `<MemoryRouter><AudioPlayerProvider>{children}</AudioPlayerProvider></MemoryRouter>`.
- Tests use `renderHook` + `act` for state transitions.
- BB-27 tests will additionally wrap with `<AudioProvider>` since the coordination requires both providers.

**No reactive stores affected.** BB-27 does not add any reactive stores or localStorage keys.

**No AI safety concerns.** No user input, no AI content.

**No auth gating.** Bible features are auth-free.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Ambient pauses when Bible starts | No auth required | Step 2 | None — intentional |
| Ambient resumes when Bible stops | No auth required | Step 2 | None — intentional |
| User ambient override clears snapshot | No auth required | Step 1 | None — intentional |

Zero new auth gates. Consistent with the Bible wave auth posture.

---

## Design System Values (for UI steps)

N/A — BB-27 introduces zero UI changes.

---

## Design System Reminder

N/A — BB-27 is an invisible coordination layer with no visual components.

---

## Shared Data Models

**New type added to `types/audio.ts`:**

```typescript
/** BB-27 — snapshot of ambient state captured when Bible audio pauses ambient */
export interface PausedByBibleAudioSnapshot {
  activeSounds: Array<{ soundId: string; volume: number }>
  masterVolume: number
}
```

**New field on `AudioState`:**

```typescript
/** BB-27 — ambient state snapshot captured when Bible audio triggers pause, null when not paused by Bible */
pausedByBibleAudio: PausedByBibleAudioSnapshot | null
```

**New action types added to `AudioAction` union:**

```typescript
| { type: 'PAUSE_BY_BIBLE_AUDIO' }
| { type: 'RESUME_FROM_BIBLE_AUDIO' }
```

**localStorage keys this spec touches:** None. The `pausedByBibleAudio` state is ephemeral React state, lost on page refresh.

---

## Responsive Structure

N/A — no UI changes. Coordination is invisible at all breakpoints.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — no page-level layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-26 is committed and passing on the current branch
- [ ] BB-29 is committed and passing on the current branch
- [ ] BB-28 is committed and passing on the current branch
- [ ] `pnpm test` passes on the current branch head
- [ ] `pnpm build` succeeds
- [ ] All auth-gated actions from the spec are accounted for (zero gates)
- [ ] No deprecated patterns used (no UI work)
- [ ] The ambient `AudioProvider` uses `useReducer` + context (confirmed — `audioReducer.ts`)
- [ ] The `AudioPlayerProvider` is a child of `AudioProvider` in App.tsx (confirmed — lines 216-217)
- [ ] The ambient's PAUSE_ALL/PLAY_ALL are hard cuts with no fade (confirmed — `audio-engine.ts:257-269`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hard cut vs fade on coordination pause/resume | Hard cut (reuse existing PAUSE_ALL/PLAY_ALL) | Existing ambient pause/resume is a hard cut. Spec says: "If the existing ambient subsystem does a hard cut on pause, BB-27 should NOT add a fade layer on top." |
| What to capture in the snapshot | `activeSounds` array (soundId + volume) + `masterVolume` | Ambient sounds are loops — playback position is meaningless. Volume per sound + master volume is sufficient for full restore. |
| Resume mechanism | Dispatch ADD_SOUND for each captured sound + SET_MASTER_VOLUME + PLAY_ALL | Re-adds sounds at their original volumes and resumes. The ADD_SOUND dispatches through the enhanced dispatch which calls `engine.addSound()` for each. |
| Resume mechanism (simpler) | Dispatch a new `RESUME_FROM_BIBLE_AUDIO` action that restores state and calls `engine.resumeAll()` | Using individual ADD_SOUND dispatches would trigger screen reader announcements and have side effects. A single dedicated action is cleaner. |
| User changes ambient during Bible playback | Clears `pausedByBibleAudio` to null | Spec requirement 10: user's explicit choice takes precedence. One-line `pausedByBibleAudio: null` added to user-initiated action branches. |
| Auto-advance transition state | Ambient stays paused | During auto-advance, state goes `playing → loading → playing`. It never hits `idle`, so the resume trigger never fires. |
| Sleep timer fade-out | Ambient stays paused during fade | The fade reduces Bible volume over 20s but state stays `playing` until the fade completes and `stop()` dispatches `STOP` → state becomes `idle` → resume fires. |
| Error state | Ambient stays paused | `LOAD_ERROR` transitions to `error`, not `idle`. Only `DISMISS_ERROR` transitions to `idle`, triggering resume. |
| BibleReader unmount during playback | Provider stays mounted, no special handling needed | `AudioPlayerProvider` is at App level (App.tsx:217). It survives route navigation. If the user navigates away, the player's close button is the route back to idle. |
| App closed during Bible playback | No resume | State is lost on refresh. Consistent with BB-26's ephemeral design. |
| PAUSE_BY_BIBLE_AUDIO when no ambient playing | No-op | If `activeSounds.length === 0` and `!isPlaying`, set `pausedByBibleAudio` to null. |
| Enhanced dispatch for new actions | PAUSE_BY_BIBLE_AUDIO calls `engine.pauseAll()`, RESUME_FROM_BIBLE_AUDIO calls engine methods to re-add sounds + resume | Side effects must go through the enhanced dispatch to sync the audio engine. |

---

## Implementation Steps

### Step 1: Extend ambient audio types and reducer with BB-27 coordination actions

**Objective:** Add the `PausedByBibleAudioSnapshot` type, the `pausedByBibleAudio` state field, the two new reducer actions, and the user-action override clears to the ambient audio subsystem.

**Files to create/modify:**
- `frontend/src/types/audio.ts` — add `PausedByBibleAudioSnapshot` interface, add `pausedByBibleAudio` to `AudioState`, add 2 new action types to `AudioAction`
- `frontend/src/components/audio/audioReducer.ts` — add `pausedByBibleAudio: null` to `initialAudioState`, implement `PAUSE_BY_BIBLE_AUDIO` and `RESUME_FROM_BIBLE_AUDIO` handlers, add `pausedByBibleAudio: null` clear to 11 user-initiated action branches
- `frontend/src/components/audio/__tests__/audioReducer.test.ts` — NEW: unit tests for the 2 new actions and the user-override clears

**Details:**

`types/audio.ts` — append after the `AudioRoutine` interface (before `AudioState`):

```typescript
/** BB-27 — snapshot of ambient state captured when Bible audio pauses ambient */
export interface PausedByBibleAudioSnapshot {
  activeSounds: Array<{ soundId: string; volume: number }>
  masterVolume: number
}
```

Add to `AudioState`:
```typescript
/** BB-27 — ambient state snapshot captured when Bible audio triggers pause */
pausedByBibleAudio: PausedByBibleAudioSnapshot | null
```

Add to `AudioAction` union:
```typescript
| { type: 'PAUSE_BY_BIBLE_AUDIO' }
| { type: 'RESUME_FROM_BIBLE_AUDIO' }
```

`audioReducer.ts` — new action handlers:

```typescript
case 'PAUSE_BY_BIBLE_AUDIO': {
  // If nothing is playing, no-op
  if (state.activeSounds.length === 0 && !state.isPlaying) {
    return { ...state, pausedByBibleAudio: null }
  }
  return {
    ...state,
    pausedByBibleAudio: {
      activeSounds: state.activeSounds.map(s => ({ soundId: s.soundId, volume: s.volume })),
      masterVolume: state.masterVolume,
    },
    // Pause state — engine side effect handled in enhancedDispatch
    activeSounds: [],
    isPlaying: false,
    pillVisible: false,
  }
}

case 'RESUME_FROM_BIBLE_AUDIO': {
  const snapshot = state.pausedByBibleAudio
  if (!snapshot || snapshot.activeSounds.length === 0) {
    return { ...state, pausedByBibleAudio: null }
  }
  return {
    ...state,
    pausedByBibleAudio: null,
    // Restore sounds — engine side effect handled in enhancedDispatch
    activeSounds: snapshot.activeSounds.map(s => ({
      soundId: s.soundId,
      volume: s.volume,
      label: '', // label is cosmetic; engine keyed by soundId
    })),
    masterVolume: snapshot.masterVolume,
    isPlaying: true,
    pillVisible: true,
  }
}
```

Wait — the label is needed for screen reader announcements and the UI. The snapshot should also capture labels. Let me revise the snapshot type:

```typescript
export interface PausedByBibleAudioSnapshot {
  activeSounds: Array<{ soundId: string; volume: number; label: string }>
  masterVolume: number
}
```

And the PAUSE_BY_BIBLE_AUDIO captures full `{ soundId, volume, label }` from each active sound.

For user-initiated action branches, add `pausedByBibleAudio: null` to the return object of: `ADD_SOUND`, `REMOVE_SOUND`, `SET_SOUND_VOLUME`, `SET_MASTER_VOLUME`, `PLAY_ALL`, `PAUSE_ALL`, `STOP_ALL`, `SET_SCENE_NAME`, `START_FOREGROUND`, `PAUSE_FOREGROUND`, `SET_FOREGROUND_BACKGROUND_BALANCE`.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT add `pausedByBibleAudio: null` to timer/routine/drawer/metadata actions — those are system internals
- Do NOT add fade logic — reuse existing hard cut behavior
- Do NOT persist `pausedByBibleAudio` to localStorage — it is ephemeral
- Do NOT change the `FOREGROUND_ENDED`, `UPDATE_FOREGROUND_POSITION`, or `SEEK_FOREGROUND` actions — those are system updates, not user choices

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PAUSE_BY_BIBLE_AUDIO captures snapshot when ambient is playing | unit | Dispatch with activeSounds=[rain], verify pausedByBibleAudio has rain's soundId/volume/label, activeSounds is empty, isPlaying is false |
| PAUSE_BY_BIBLE_AUDIO is no-op when no ambient playing | unit | Dispatch with activeSounds=[], verify pausedByBibleAudio is null |
| RESUME_FROM_BIBLE_AUDIO restores snapshot | unit | Set pausedByBibleAudio with captured state, dispatch, verify activeSounds restored, masterVolume restored, isPlaying true, pausedByBibleAudio cleared to null |
| RESUME_FROM_BIBLE_AUDIO is no-op when snapshot is null | unit | Set pausedByBibleAudio=null, dispatch, verify no state change |
| ADD_SOUND clears pausedByBibleAudio | unit | Set pausedByBibleAudio to a snapshot, dispatch ADD_SOUND, verify pausedByBibleAudio is null |
| REMOVE_SOUND clears pausedByBibleAudio | unit | Same pattern |
| PLAY_ALL clears pausedByBibleAudio | unit | Same pattern |
| PAUSE_ALL clears pausedByBibleAudio | unit | Same pattern |
| STOP_ALL clears pausedByBibleAudio | unit | Same pattern |
| SET_MASTER_VOLUME clears pausedByBibleAudio | unit | Same pattern |
| SET_SOUND_VOLUME clears pausedByBibleAudio | unit | Same pattern |
| Non-user actions do NOT clear pausedByBibleAudio | unit | Dispatch TICK_TIMER, OPEN_DRAWER, SET_READING_CONTEXT — verify pausedByBibleAudio unchanged |

**Expected state after completion:**
- [ ] `PausedByBibleAudioSnapshot` type exists in `types/audio.ts`
- [ ] `pausedByBibleAudio` field on `AudioState` with default `null`
- [ ] Two new actions in `AudioAction` union
- [ ] Reducer handles both actions correctly
- [ ] 11 user-initiated actions clear `pausedByBibleAudio`
- [ ] 12+ unit tests pass

---

### Step 2: Wire enhanced dispatch side effects for BB-27 actions

**Objective:** Add engine-level side effects for `PAUSE_BY_BIBLE_AUDIO` (stop all ambient sounds via the engine) and `RESUME_FROM_BIBLE_AUDIO` (re-add each sound to the engine and resume playback) in the `AudioProvider`'s `enhancedDispatch`.

**Files to create/modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — add cases for `PAUSE_BY_BIBLE_AUDIO` and `RESUME_FROM_BIBLE_AUDIO` in the `enhancedDispatch` switch statement (around line 60-156)

**Details:**

In the `enhancedDispatch` function (line 56-156 of `AudioProvider.tsx`), add two new cases before the final `dispatch(action)` call:

```typescript
case 'PAUSE_BY_BIBLE_AUDIO': {
  // Stop all active sounds in the engine
  if (current.activeSounds.length > 0 || current.isPlaying) {
    engine.pauseAll()
    // Remove each sound from the engine so they don't resume on PLAY_ALL
    for (const sound of current.activeSounds) {
      engine.removeSound(sound.soundId)
    }
  }
  break
}

case 'RESUME_FROM_BIBLE_AUDIO': {
  const snapshot = current.pausedByBibleAudio
  if (snapshot && snapshot.activeSounds.length > 0) {
    // Restore master volume first
    engine.setMasterVolume(snapshot.masterVolume)
    // Re-add each sound at its captured volume
    // Note: the sound catalog URL is needed. We need to look up the URL
    // from the sound catalog.
    // ...
  }
  break
}
```

Wait — there's a problem. The `engine.addSound()` method requires a URL, but the snapshot only has `soundId` and `volume`. The URL comes from the sound catalog data. Let me reconsider.

Looking at the ambient subsystem more carefully:

- `engine.pauseAll()` suspends the AudioContext. All AudioBufferSourceNodes freeze in place.
- `engine.resumeAll()` resumes the AudioContext. All sounds resume from where they were.

This means **the simplest correct approach is: pause the AudioContext on PAUSE_BY_BIBLE_AUDIO and resume it on RESUME_FROM_BIBLE_AUDIO.** The sounds don't need to be removed and re-added. They just need to be suspended and resumed. The engine already supports this.

But wait — the reducer's PAUSE_BY_BIBLE_AUDIO clears `activeSounds` from state, which would cause the UI to show no sounds playing. If we only suspend the context, the reducer should NOT clear activeSounds. Let me reconsider the reducer design.

**Revised approach:** The reducer should NOT clear `activeSounds` on `PAUSE_BY_BIBLE_AUDIO`. Instead:
- The reducer captures the snapshot and sets `isPlaying: false` (so the UI reflects "paused")
- The enhanced dispatch calls `engine.pauseAll()` (suspends AudioContext)
- On `RESUME_FROM_BIBLE_AUDIO`, the reducer sets `isPlaying: true` and clears the snapshot
- The enhanced dispatch calls `engine.resumeAll()` (resumes AudioContext)
- The `activeSounds` array stays intact throughout — the sounds are suspended, not removed

This is much simpler and avoids the URL-lookup problem entirely. It also means ambient sounds will visually show as "present but paused" in the AudioDrawer, which is correct UX — the user can see their sounds are still there, just paused.

Let me revise Step 1's reducer logic accordingly.

**Revised PAUSE_BY_BIBLE_AUDIO reducer:**
```typescript
case 'PAUSE_BY_BIBLE_AUDIO': {
  if (state.activeSounds.length === 0 && !state.isPlaying) {
    return { ...state, pausedByBibleAudio: null }
  }
  return {
    ...state,
    pausedByBibleAudio: {
      activeSounds: state.activeSounds.map(s => ({
        soundId: s.soundId, volume: s.volume, label: s.label,
      })),
      masterVolume: state.masterVolume,
    },
    isPlaying: false,
    // activeSounds preserved — sounds are suspended, not removed
  }
}
```

**Revised RESUME_FROM_BIBLE_AUDIO reducer:**
```typescript
case 'RESUME_FROM_BIBLE_AUDIO': {
  const snapshot = state.pausedByBibleAudio
  if (!snapshot || snapshot.activeSounds.length === 0) {
    return { ...state, pausedByBibleAudio: null }
  }
  return {
    ...state,
    pausedByBibleAudio: null,
    isPlaying: true,
  }
}
```

**Enhanced dispatch side effects:**
```typescript
case 'PAUSE_BY_BIBLE_AUDIO':
  if (current.activeSounds.length > 0 || current.isPlaying) {
    engine.pauseAll()
  }
  break

case 'RESUME_FROM_BIBLE_AUDIO':
  if (current.pausedByBibleAudio && current.pausedByBibleAudio.activeSounds.length > 0) {
    engine.resumeAll()
  }
  break
```

This is much cleaner. No URL lookups, no sound removal/re-addition, no label reconstruction. Just suspend and resume the AudioContext.

**But wait — what about user override (requirement 10)?** If the user opens the ambient picker and manually starts a different sound while Bible is playing, `pausedByBibleAudio` clears (via the `ADD_SOUND` clear). When Bible stops, RESUME_FROM_BIBLE_AUDIO fires but `pausedByBibleAudio` is null → no-op. The user's new sound continues. Correct.

What about: user opens ambient picker and manually pauses while Bible is playing? `PAUSE_ALL` clears `pausedByBibleAudio`. When Bible stops, no resume. Correct.

What about: user opens ambient picker and starts ambient on top of Bible? `ADD_SOUND` clears `pausedByBibleAudio`. The engine.addSound() call resumes the AudioContext (confirmed in engine code — addSound ensures context is running). Both play simultaneously. When Bible stops, no resume (snapshot was cleared). The user's manually started ambient continues. Correct.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT add screen reader announcements for `PAUSE_BY_BIBLE_AUDIO` or `RESUME_FROM_BIBLE_AUDIO` — spec requirement 17 says the coordination is silent and automatic
- Do NOT add fade logic — reuse the existing hard-cut pauseAll/resumeAll
- Do NOT remove sounds from the engine on pause — just suspend the AudioContext

**Test specifications:** Tested via Step 1's reducer tests (engine side effects are inherent to the enhancedDispatch pattern and are covered by the Step 3 integration tests).

**Expected state after completion:**
- [ ] `enhancedDispatch` handles `PAUSE_BY_BIBLE_AUDIO` with `engine.pauseAll()`
- [ ] `enhancedDispatch` handles `RESUME_FROM_BIBLE_AUDIO` with `engine.resumeAll()`
- [ ] No screen reader announcements for either action

---

### Step 3: Add coordination useEffect to AudioPlayerProvider

**Objective:** Add the `useEffect` in `AudioPlayerProvider` that watches `state.playbackState` transitions and dispatches `PAUSE_BY_BIBLE_AUDIO` / `RESUME_FROM_BIBLE_AUDIO` to the ambient `AudioProvider`.

**Files to create/modify:**
- `frontend/src/contexts/AudioPlayerProvider.tsx` — import `useAudioDispatch` from ambient provider, add coordination useEffect with `prevPlaybackStateRef`

**Details:**

At the top of `AudioPlayerProvider`, import the ambient dispatch:

```typescript
import { useAudioDispatch as useAmbientDispatch } from '@/components/audio/AudioProvider'
```

Inside the component, before the existing `useEffect` hooks:

```typescript
// BB-27 — ambient audio pause coordination
const ambientDispatch = useAmbientDispatch()
const prevPlaybackStateRef = useRef(state.playbackState)

useEffect(() => {
  const prev = prevPlaybackStateRef.current
  const curr = state.playbackState
  prevPlaybackStateRef.current = curr

  const wasIdle = prev === 'idle'
  const nowActive = curr === 'loading' || curr === 'playing'
  const wasActive = prev === 'loading' || prev === 'playing' || prev === 'paused'
  const nowIdle = curr === 'idle'

  if (wasIdle && nowActive) {
    ambientDispatch({ type: 'PAUSE_BY_BIBLE_AUDIO' })
  } else if (wasActive && nowIdle) {
    ambientDispatch({ type: 'RESUME_FROM_BIBLE_AUDIO' })
  }
}, [state.playbackState, ambientDispatch])
```

This matches the spec's design notes exactly (spec lines 131-148). The transition logic:

- `idle → loading` or `idle → playing`: Bible audio starting → pause ambient
- `(loading|playing|paused) → idle`: Bible audio fully stopped → resume ambient
- `playing → paused`: user paused Bible mid-chapter → NO ambient resume (momentary pause)
- `paused → playing`: user unpaused → NO ambient pause dispatch (already paused from initial start)
- `loading → playing`: load complete → NO action (already paused from `idle → loading`)
- `playing → error`: error during playback → NO resume (error not dismissed)
- `error → idle`: user dismisses error → resume ambient

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT dispatch on `playing → paused` — pause is momentary, ambient stays off
- Do NOT dispatch on `loading → playing` — already handled by `idle → loading`
- Do NOT dispatch on `playing → error` — ambient stays paused during error state
- Do NOT use `useAudioState()` from the ambient provider — we only need dispatch
- Do NOT wrap in try/catch — if ambientDispatch throws, that's a context error that should surface normally

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Dispatches PAUSE_BY_BIBLE_AUDIO when Bible playbackState goes idle → loading | integration | Mount both providers, start Bible audio, verify ambient dispatch received PAUSE_BY_BIBLE_AUDIO |
| Dispatches RESUME_FROM_BIBLE_AUDIO when Bible playbackState goes playing → idle (via CLOSE) | integration | Mount both providers, start Bible, then close, verify ambient dispatch received RESUME_FROM_BIBLE_AUDIO |
| Dispatches RESUME_FROM_BIBLE_AUDIO when Bible playbackState goes paused → idle (via CLOSE) | integration | Start Bible, pause, close, verify resume dispatched |
| Does NOT dispatch resume when Bible playbackState goes playing → paused | integration | Start Bible, pause, verify no RESUME_FROM_BIBLE_AUDIO |
| Does NOT dispatch resume when Bible playbackState goes playing → error | integration | Start Bible, trigger error, verify no resume |
| Dispatches RESUME when error → idle (via DISMISS_ERROR) | integration | Start Bible, trigger error, dismiss error, verify resume |
| Does NOT dispatch pause on auto-advance (loading → loading) | integration | Start Bible, auto-advance, verify only one PAUSE_BY_BIBLE_AUDIO from initial start |
| Dispatches resume when sleep timer fade completes (stop → idle) | integration | Start Bible with sleep timer, let fade complete, verify resume |

**Expected state after completion:**
- [ ] `AudioPlayerProvider` imports `useAmbientDispatch`
- [ ] Coordination useEffect watches `state.playbackState` transitions
- [ ] Pause dispatched on `idle → loading|playing`
- [ ] Resume dispatched on `(loading|playing|paused) → idle`
- [ ] No dispatch on `playing → paused`, `playing → error`, or within-active transitions
- [ ] 8 integration tests pass

---

### Step 4: Integration tests — full end-to-end coordination

**Objective:** Write integration tests that mount both `AudioProvider` and `AudioPlayerProvider` together, start ambient, start Bible, and verify the full coordination lifecycle.

**Files to create/modify:**
- `frontend/src/contexts/__tests__/bb27-ambient-coordination.test.tsx` — NEW: end-to-end coordination tests

**Details:**

Test wrapper mounts both providers:
```tsx
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AudioProvider>
        <AudioPlayerProvider __resolveNextTrackDeps={mockDeps}>
          {children}
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>
  )
}
```

Tests use `renderHook` to access both `useAudioState()` / `useAudioDispatch()` (ambient) and `useAudioPlayer()` (Bible) in the same component. Test scenarios:

1. **Start ambient rain → start Bible → verify ambient pauses**: Add a sound to ambient, verify `isPlaying: true`, start Bible audio, verify ambient `isPlaying: false` and `pausedByBibleAudio` has rain snapshot.

2. **Stop Bible → verify ambient resumes**: Continue from test 1, close Bible (dispatch CLOSE), verify ambient `isPlaying: true` and `pausedByBibleAudio: null`.

3. **No ambient playing → start Bible → verify no-op**: Start Bible without ambient, verify `pausedByBibleAudio` remains null.

4. **Ambient paused by Bible → user starts different sound → Bible stops → verify user's sound persists**: Start rain, start Bible (rain pauses), user dispatches ADD_SOUND(waves), verify `pausedByBibleAudio` cleared. Bible stops, verify waves still playing (not restored to rain).

5. **Ambient paused by Bible → user manually pauses ambient → Bible stops → verify no resume**: Start rain, start Bible, user dispatches PAUSE_ALL, Bible stops, verify ambient remains paused (not auto-resumed to rain).

6. **Bible pause mid-chapter does NOT resume ambient**: Start rain, start Bible, pause Bible, verify ambient `isPlaying` is still false and `pausedByBibleAudio` still has rain.

7. **Bible error → ambient stays paused → dismiss error → ambient resumes**: Start rain, start Bible, trigger error, verify ambient paused. Dismiss error, verify ambient resumed.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT mock the ambient reducer — use the real reducer to test the full coordination path
- Do NOT mock the Bible reducer — use the real reducer
- The audio engine is mocked (per existing test pattern) since there's no real AudioContext in jsdom

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ambient pauses when Bible starts | e2e integration | See scenario 1 |
| ambient resumes when Bible stops | e2e integration | See scenario 2 |
| no-op when no ambient playing | e2e integration | See scenario 3 |
| user override clears snapshot | e2e integration | See scenario 4 |
| user manual pause overrides coordination | e2e integration | See scenario 5 |
| Bible pause does not resume ambient | e2e integration | See scenario 6 |
| error + dismiss error lifecycle | e2e integration | See scenario 7 |

**Expected state after completion:**
- [ ] 7+ end-to-end integration tests pass
- [ ] Tests exercise the full provider stack (both AudioProvider and AudioPlayerProvider)
- [ ] User override scenarios covered
- [ ] Error lifecycle covered

---

### Step 5: Final verification — existing tests, lint, build, bundle

**Objective:** Verify that all existing tests pass unchanged, lint is clean, build succeeds, and main bundle delta is within the 0.5 KB gzipped target.

**Files to create/modify:**
- None — verification only

**Details:**

Run in sequence:
1. `pnpm test` — all existing BB-26, BB-28, BB-29 tests pass unchanged. BB-27's new tests pass.
2. `pnpm lint` — clean.
3. `pnpm build` — succeeds. Check main bundle size against the baseline from BB-28 Step 7 (105.63 KB gzip). Delta must be <= 0.5 KB.

If any existing test fails, investigate. The changes to `audioReducer.ts` (adding `pausedByBibleAudio: null` to initial state and clearing it in user actions) should be backward-compatible — existing tests don't assert on `pausedByBibleAudio` since it didn't exist before.

If bundle delta exceeds 0.5 KB, review the changes for unnecessary code.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT skip running the full test suite — BB-27 touches the ambient reducer which is used by many components
- Do NOT modify existing tests to make them pass — BB-27's changes are backward-compatible

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | regression | `pnpm test` green |
| Lint clean | lint | `pnpm lint` green |
| Build succeeds | build | `pnpm build` green |
| Bundle delta <= 0.5 KB | perf | Compare gzip size |

**Expected state after completion:**
- [ ] All tests pass (existing + new)
- [ ] Lint clean
- [ ] Build succeeds
- [ ] Bundle delta <= 0.5 KB gzipped
- [ ] BB-26, BB-28, BB-29 tests unaffected

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Ambient types + reducer extension |
| 2 | 1 | Enhanced dispatch side effects |
| 3 | 1, 2 | Coordination useEffect in AudioPlayerProvider |
| 4 | 1, 2, 3 | Full integration tests |
| 5 | 1, 2, 3, 4 | Final verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Ambient types + reducer extension | [COMPLETE] | 2026-04-15 | Modified: `types/audio.ts` (PausedByBibleAudioSnapshot type, pausedByBibleAudio on AudioState, 2 new actions), `audioReducer.ts` (2 action handlers, 11 user-action clears, pausedByBibleAudio: null in initialState), `audioReducer.test.ts` (37 new tests, 68 total). Followed revised approach: activeSounds preserved on pause. |
| 2 | Enhanced dispatch side effects | [COMPLETE] | 2026-04-15 | Modified: `AudioProvider.tsx` — added PAUSE_BY_BIBLE_AUDIO (engine.pauseAll()) and RESUME_FROM_BIBLE_AUDIO (engine.resumeAll()) cases in enhancedDispatch. No announcements. |
| 3 | Coordination useEffect in AudioPlayerProvider | [COMPLETE] | 2026-04-15 | Modified: `AudioPlayerProvider.tsx` (import useAmbientDispatch, coordination useEffect with prevPlaybackStateRef), `AudioPlayerContext.test.tsx` (added AudioProvider wrapper + AudioEngineService/useAuth/useToast mocks to all 3 wrapper functions). All 51 existing tests pass. |
| 4 | Full integration tests | [COMPLETE] | 2026-04-15 | Created: `contexts/__tests__/bb27-ambient-coordination.test.tsx` (7 integration tests). Also added `error` to `wasActive` check in AudioPlayerProvider coordination useEffect — plan's code omitted it but the transition table requires error→idle resume. |
| 5 | Final verification | [COMPLETE] | 2026-04-15 | 8172 tests pass (660 files), lint clean, build succeeds. Bundle: 105.93 KB gzip (+0.30 KB vs BB-28 baseline of 105.63 KB). Also fixed 9 existing test files that needed AudioProvider wrapper after BB-27 wiring: AudioPlayButton, useAudioPlayer, ReaderChrome, BibleReader, BibleReaderHighlights, BibleReaderNotes, BibleReaderAudio, BibleReader.audio, BibleReader.deeplink. |
