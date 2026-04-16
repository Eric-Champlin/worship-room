# BB-27: Ambient Audio Pause Coordination with Bible Audio

**Master Plan Reference:** Fourth spec in the BB-26-29-44 audio wave. BB-26 shipped the Bible audio foundation with its own engine, provider, and sheet UI. BB-20 (shipped months ago) provides the ambient audio picker with its own separate `AudioProvider` and Web Audio graph for ambient sounds (rain, wind chimes, etc.) that play underneath the reading experience. Until now, these two subsystems have been completely independent — a user can start ambient rain, then start Bible audio, and hear both play simultaneously in a confusing overlap where the narrator and the rain fight for attention.

**Branch:** `audio-wave-bb-26-29-44` (all work commits directly to this branch)

**Depends on:** BB-26 (FCBH Audio Bible Integration) — shipped, BB-29 (Continuous Playback) — shipped, BB-28 (Sleep Timer) — in verification

**Depended on by:** None

**Related specs:** BB-44 (read-along), BB-20 (ambient audio picker — the existing music/ambient subsystem)

---

## Overview

BB-27 coordinates the two audio subsystems: when Bible audio starts playing, the ambient audio pauses automatically. When Bible audio stops (user closes the sheet, sleep timer fires, end of Bible), the ambient audio resumes from where it left off. The user experiences one sound at a time — ambient as the sacred space before and after, Bible as the spoken voice during.

The decision to pause rather than duck is deliberate. Ducking (keeping ambient playing at reduced volume under the narration) requires Web Audio API wiring with `MediaElementAudioSourceNode`, which is subject to an iOS Safari silence bug (WebKit Bug 293891) that would require a platform-specific workaround. Pausing requires no Web Audio graph, works everywhere, and may actually produce a better listening experience for sanctuary-focused scripture reading — the ambient establishes the room, the narrator speaks into it cleanly, and the ambient returns when the narrator is finished. If real use suggests ducking is better, that can be a future enhancement that builds on the coordination pattern this spec establishes.

The coordination is one-directional: Bible audio state changes trigger ambient audio state changes, but ambient audio state changes do NOT trigger Bible audio state changes. This asymmetry is intentional — the Bible is the primary focus of the BibleReader, the ambient is background.

## User Story

As a **logged-in or logged-out user** who has ambient rain playing while reading the Bible, I want the **rain to pause automatically when I start Bible audio playback** so that **I can hear the narrator clearly without competing sounds, and have the rain return when the narrator is finished**.

As a **logged-in or logged-out user** who listens to Bible audio without ambient, I don't want any coordination behavior — Bible audio should just play. I should not notice BB-27 at all.

As a **logged-in or logged-out user** who starts ambient, starts Bible, pauses Bible to answer a text message, and then unpauses Bible, I do not want rain to come on during my pause and then stop again when I unpause. Pause is momentary. Ambient should stay off until Bible is fully done.

## Requirements

### Functional Requirements

#### Pause trigger

1. When `AudioPlayerContext` state transitions from `idle` to `loading` or `playing` (Bible audio is starting), the provider dispatches a pause instruction to the ambient `AudioProvider`.
2. The pause instruction pauses whichever ambient sound is currently active AND records the ambient state at the moment of pause: which sound ID, at what volume level, and (if the ambient implementation supports it) at what playback position within the sound loop. This snapshot is stored in the ambient `AudioProvider` under a new `pausedByBibleAudio` state slice.
3. If no ambient sound is currently playing when Bible audio starts, the pause is a no-op. The `pausedByBibleAudio` state remains null. Nothing is recorded.
4. If the ambient subsystem is unavailable for any reason (provider unmounted, audio engine not initialized, browser doesn't support Web Audio), the pause instruction fails silently. Bible audio proceeds normally. The coordination is a best-effort feature, not a hard requirement.

#### Resume trigger

5. When `AudioPlayerContext` state transitions from a playing or loading state to `idle` (full stop), the provider dispatches a resume instruction to the ambient `AudioProvider`.
6. Full stop transitions that trigger resume:
   - User taps the close button on the player sheet (`CLOSE` action)
   - Audio ends naturally and continuous playback is off (chapter ends, no auto-advance)
   - End of Bible reached (Revelation 22 completes) and user does NOT tap Start from Genesis
   - Sleep timer fade-out completes and audio stops
   - Error state is dismissed and the sheet returns to idle
7. Pause transitions that do NOT trigger resume:
   - User taps the pause button mid-chapter
   - User drags the scrubber (paused during drag)
   - Sleep timer is counting down but has not yet completed
   - Sleep timer fade-out has started but has not completed
   - Auto-advance is loading the next chapter
   - Network or load error is displayed but not dismissed
8. The resume instruction reads the `pausedByBibleAudio` state snapshot. If it is null (no ambient was playing when Bible started), the resume is a no-op. If it is not null, the ambient subsystem restarts the recorded sound at the recorded volume and (if supported) the recorded playback position.
9. After resume, the `pausedByBibleAudio` state is cleared to null regardless of whether the actual resume succeeded. The state is a one-shot memory of "what to restore" and should not persist once the restore attempt has been made.

#### User-initiated ambient changes during Bible playback

10. If the user opens the ambient picker and manually starts, stops, or changes ambient while Bible audio is playing, that user action takes precedence over the BB-27 coordination. The `pausedByBibleAudio` state is cleared immediately. When Bible audio subsequently stops, there is no resume — the user's manual ambient state is respected.
11. If the user manually pauses ambient via the ambient picker while Bible audio is playing, again the `pausedByBibleAudio` state clears. No resume on Bible stop.
12. This means the pattern "start rain, start Bible, open ambient picker and change to waves" results in waves playing after the user changes them, and when Bible stops, waves continue playing (not resumed back to rain). The user's most recent explicit choice wins.

#### Race conditions

13. If Bible audio starts while ambient audio is in the middle of its own transition (e.g., mid-fade-in), the pause instruction waits for the ambient state to stabilize (one tick), then pauses. This prevents capturing a transient fade-in state as the "restore" target.
14. If Bible audio stops while ambient audio would be resumed but the user has manually started a different ambient sound, requirement 10 applies — no resume.
15. If the BibleReader page unmounts (user navigates to another route) while Bible audio is playing, this is treated as a full stop. The ambient resume instruction fires as part of the cleanup.
16. If the app is closed entirely while Bible audio is playing, no resume happens (state is lost). When the user returns, whatever ambient state exists at that moment is what plays. This is consistent with BB-26's ephemeral state design.

#### Visibility into coordination

17. No visual indicator is added to either subsystem's UI to signal that BB-27 coordination is happening. The coordination is silent and automatic. The user experiences the correct behavior without needing to understand why.
18. No user-facing setting to disable the coordination is added. The pause-ambient-while-Bible-plays behavior is always on when ambient is playing. A future spec can add a settings toggle if user feedback indicates anyone wants the simultaneous-playback behavior, but BB-27 does not pre-emptively add one.

### Non-Functional Requirements

19. **Performance:** The coordination adds one additional reducer action to the ambient `AudioProvider` and one useEffect in `AudioPlayerContext` that watches `state.playbackState` transitions. Zero new intervals, zero new subscriptions. Performance overhead is negligible.
20. **Bundle:** No new dependencies. Main bundle delta should be <=0.5 KB gzipped — this is a small coordination layer, not a feature.
21. **Testing:** Coordination is tested at three levels:
    - Unit tests for the new reducer actions (`PAUSE_BY_BIBLE_AUDIO`, `RESUME_FROM_BIBLE_AUDIO`) in the ambient `AudioProvider`
    - Provider integration tests for the cross-subsystem coordination (mock the ambient `AudioProvider`, verify `AudioPlayerContext` dispatches correctly on state transitions)
    - End-to-end integration test that mounts both providers together, starts ambient, starts Bible, verifies ambient pauses; stops Bible, verifies ambient resumes
22. **Accessibility:** No new UI is introduced. No accessibility changes.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Ambient pauses when Bible starts | Works — no auth required | Works — no auth required | N/A |
| Ambient resumes when Bible stops | Works — no auth required | Works — no auth required | N/A |
| Manual ambient changes during Bible playback override coordination | Works — no auth required | Works — no auth required | N/A |

Zero new auth gates. Coordination works identically for logged-in and logged-out users. Consistent with the Bible wave auth posture (BB-0 through BB-46): zero new auth gates for Bible features.

## Responsive Behavior

No UI changes. The coordination is invisible at every breakpoint. No responsive considerations apply.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | No UI — coordination is invisible |
| Tablet (640-1024px) | No UI — coordination is invisible |
| Desktop (> 1024px) | No UI — coordination is invisible |

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Coordination works identically. No data persistence needed.
- **Logged-in users:** Coordination works identically. No data persistence needed.
- **localStorage keys:** None. The `pausedByBibleAudio` state is ephemeral and lives only in the ambient `AudioProvider`'s React state (in-memory). It is cleared on page refresh. If a user starts ambient, starts Bible, and refreshes the page mid-playback, the ambient resume will not fire because the state was lost — but the refresh also kills the Bible audio, so the user is effectively starting fresh either way.
- **Cross-tab:** Not synchronized. Not a real use case.

## Completion & Navigation

N/A — standalone coordination feature. Does not record activity, award points, trigger badges, or interact with any gamification system. Does not trigger React Router navigation.

## Design Notes

### Where the coordination lives

The coordination is a small useEffect in the Bible audio provider that watches `state.playbackState`:

```tsx
const prevPlaybackStateRef = useRef<PlaybackState>('idle')

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

The exact import path for the ambient dispatch will be determined during recon — BB-20's `AudioProvider` exposes a dispatch hook somewhere, and the coordination uses it.

### New ambient reducer actions

Two new actions extend the existing ambient `AudioProvider` reducer:

- **`PAUSE_BY_BIBLE_AUDIO`**: captures the current ambient state (active sound ID, volume, playback position if available) into a new `pausedByBibleAudio` slice, then dispatches the existing pause logic. If no ambient is playing, sets `pausedByBibleAudio` to null and does nothing else.
- **`RESUME_FROM_BIBLE_AUDIO`**: reads `pausedByBibleAudio`, restarts the captured sound with the captured settings (using the existing play logic), then clears `pausedByBibleAudio` to null. If `pausedByBibleAudio` is null, does nothing.

User-initiated overrides: Any existing user-initiated ambient action (play a sound, pause, stop, change volume, change sound) must additionally clear `pausedByBibleAudio` to null at the start of its reducer branch. This is one-line additions to existing actions, not new actions. Requirement 10's "user action takes precedence" is implemented by these clears.

### State shape extension

The ambient `AudioProvider` state shape gains one field:

```ts
pausedByBibleAudio: {
  soundId: string
  volume: number
  playbackPosition?: number
} | null
```

Default: `null`.

### Why an asymmetric coordination

Bible audio state changes trigger ambient changes. Ambient state changes do NOT trigger Bible changes. The BibleReader is a focused reading space — the user opens it to read or listen to scripture. Ambient is a background enhancement that establishes atmosphere. When the user's attention shifts to "I want to listen to a specific chapter," stopping ambient to let the Bible speak is the right move. The opposite direction — "ambient changes stop Bible" — would be wrong.

This asymmetry also prevents feedback loops. If both directions triggered the other, edge cases around "ambient pauses -> Bible pauses -> ambient resumes -> Bible resumes -> ambient pauses again" could occur. One-directional coordination is simpler and correct.

### Small fade on pause and resume

The actual pause and resume SHOULD use a brief fade (roughly 300-500ms) rather than a hard cut, because abrupt audio volume changes sound unpleasant. The existing ambient `AudioProvider` likely already has fade logic for its play/pause actions — BB-27 reuses whatever exists rather than introducing new fade curves. Recon should verify.

If the existing ambient subsystem does a hard cut on pause, BB-27 should NOT add a fade layer on top. Consistency with the existing behavior is more important than ideal fade curves.

## Anti-Pressure Design Decisions

**Coordination is always on, no toggle.** No settings option to disable the pause-ambient-while-Bible-plays behavior. The design decision is that scripture audio should play cleanly without competing sounds, and that decision is coherent enough to not need a user override.

**No notification or visual indicator.** The coordination is silent. The behavior is self-explanatory.

**Resume is to the exact prior state.** The ambient comes back to the same sound, the same volume, the same playback position (if supported). Continuity matters.

**Pause, not fade-pause.** When Bible audio starts, ambient pauses promptly (using existing fade behavior if any). The user's attention has shifted; the ambient should yield quickly.

## Out of Scope

1. **Ducking.** Not in this spec. If user feedback suggests ducking would be better, that's a future spec that would build on the coordination layer BB-27 establishes.
2. **Simultaneous playback toggle.** No user-facing setting to disable the coordination. Coordination is always on.
3. **Per-ambient-sound coordination preferences.** No "pause ambient when Bible plays, except for rain which should duck" — one behavior, applied to all ambient sounds uniformly.
4. **Bible audio pausing when ambient pauses.** Asymmetric by design.
5. **Coordination with the music subsystem beyond ambient.** If the music subsystem has other playback types (scripture music, worship songs, playlists), BB-27 does not coordinate with those. Only ambient sounds.
6. **Cross-tab coordination.** No synchronization across tabs.
7. **Resume-after-refresh.** If the user refreshes mid-playback, the coordination state is lost. This is acceptable.
8. **Resume when the user returns after closing the tab entirely.** Not persisted.
9. **Sleep timer interaction beyond completion.** BB-27's answer: ambient resumes when the provider's `playbackState` transitions from active to `idle`, which happens at the END of the BB-28 fade, not during it. The 20-second fade is a "still playing Bible audio" period; ambient stays paused throughout. When the fade completes and state becomes idle, ambient resumes.
10. **Coordination during error states.** If Bible audio enters error state (failed to load), ambient does NOT resume. Ambient only resumes when the user dismisses the error and the sheet returns to idle.

## Acceptance Criteria

- [ ] When ambient is playing and Bible audio starts, ambient pauses automatically.
- [ ] When ambient is playing and Bible audio starts, the ambient state (sound ID, volume, playback position) is captured into `pausedByBibleAudio`.
- [ ] When Bible audio stops (close, end of chapter with no auto-advance, sleep timer completes, end of Bible, error dismissed), ambient resumes to its previous state.
- [ ] When Bible audio pauses mid-chapter (user taps pause), ambient does NOT resume. Ambient only resumes on full stop (idle transition).
- [ ] When Bible audio is auto-advancing between chapters (BB-29), ambient stays paused throughout the transition.
- [ ] When the sleep timer fade-out is in progress (BB-28), ambient stays paused. Ambient only resumes after the fade completes and state becomes idle.
- [ ] When no ambient is playing at the moment Bible audio starts, nothing is captured and nothing is resumed. Coordination is a no-op.
- [ ] When the user manually changes ambient (starts a different sound, stops ambient, changes volume) while Bible audio is playing, `pausedByBibleAudio` clears. When Bible audio subsequently stops, ambient does NOT resume to the pre-Bible state — the user's manual state is respected.
- [ ] When the BibleReader unmounts (user navigates to another route) during Bible playback, the resume instruction fires as part of cleanup.
- [ ] No new UI is introduced in either the BB-26 player sheet or the BB-20 ambient picker.
- [ ] No new localStorage keys.
- [ ] No new dependencies.
- [ ] Main bundle delta <= 0.5 KB gzipped.
- [ ] No new auth gates.
- [ ] Listening activity still NOT recorded for faith points, streaks, or badges.
- [ ] BB-26, BB-28, BB-29 tests continue to pass unchanged.
- [ ] Existing BB-20 ambient picker tests continue to pass after the reducer extension.

## Notes for Plan Phase Recon

1. **Inspect the existing ambient `AudioProvider`** at `frontend/src/components/audio/AudioProvider.tsx`. Identify:
   - Where its state shape lives (likely `frontend/src/types/audio.ts` — NOT the BB-26 `bible-audio.ts` file)
   - What its current reducer action set is
   - What dispatch hook it exposes to consumers (`useAudioDispatch`, or similar)
   - What pattern it uses for "currently playing sound" — does it track volume, playback position, loop state?
   - Whether its play action already supports resuming from a specific playback position, or only from the start
   The plan depends on what this recon finds. If the ambient subsystem supports playback-position restoration, BB-27 captures and restores it. If not, BB-27 captures only sound ID and volume, and resume restarts the sound from the beginning. Either is acceptable UX for ambient loops.
2. **Identify the ambient subsystem's fade behavior on pause and resume.** BB-27 reuses whatever fade exists. If the existing subsystem does a hard cut, BB-27 does hard cuts (don't add a new fade layer on top). If it has a configurable fade, use the existing configuration.
3. **Verify that the ambient `AudioProvider` is mounted above (or at the same level as) `AudioPlayerProvider`** in the component tree so that `AudioPlayerProvider` can consume the ambient dispatch via context.
4. **Check whether the ambient subsystem uses useReducer + context or a different state pattern.** If it uses a reactive store (Pattern A or B), the coordination pattern is different.
5. **Identify the canonical list of "user-initiated ambient actions" that must clear `pausedByBibleAudio`.** These are the actions that represent explicit user choice: play a sound, pause, stop, change volume, change sound, toggle mute. Each needs a one-line `pausedByBibleAudio: null` addition in its reducer branch. Enumerate them during recon.
6. **Coordinate with BB-28's sleep timer fade semantics.** BB-28's fade-out lowers Bible audio volume to zero over 20 seconds and then dispatches STOP. BB-27's useEffect watching `state.playbackState` will see the state transition from `playing` to `idle` at the END of the 20-second fade, not during it. Recon should confirm this sequencing.
7. **Consider what happens when the user starts Bible audio, then starts ambient on top of it via the ambient picker.** BB-27's asymmetric design says: ambient starting while Bible is playing does NOT affect Bible, but it DOES clear `pausedByBibleAudio` per requirement 10. Bible continues playing, ambient plays concurrently (the user explicitly wanted this), and when Bible stops, ambient stays on.
8. **Edge case — error state during Bible playback with ambient paused.** If Bible audio fails to load (DBP 404, network error), the state goes to `error`, not `idle`. Ambient should stay paused while the user sees the error. Recon should confirm the dismiss-error action in `AudioPlayerContext` transitions to `idle`.
9. **Bundle delta verification.** Target is <= 0.5 KB gzipped main bundle delta. Confirm the target is realistic before execution begins.
