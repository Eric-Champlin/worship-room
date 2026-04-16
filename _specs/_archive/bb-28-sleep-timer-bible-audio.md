# BB-28: Sleep Timer for Bible Audio

**Status:** Draft

**Date:** 2026-04-14

**Branch:** `audio-wave-bb-26-29-44`

**Depends on:** BB-26 (FCBH Audio Bible Integration) — shipped, BB-29 (Continuous Playback) — shipped

**Depended on by:** None

**Related specs:** BB-27 (ambient layering), BB-44 (read-along)

## Master Plan Reference

Third spec in the BB-26-29-44 audio wave. BB-26 shipped the player foundation. BB-29 shipped continuous playback so users can listen across chapters without tapping play. BB-28 adds a sleep timer so users falling asleep to the Bible can set a duration after which audio fades out gracefully — without the app continuing to play until their phone dies in the morning.

The existing `frontend/src/components/bible/SleepTimerPanel.tsx` scaffolding (292 lines, kept under "BB-26-29 deferred" through deep review Protocol 01) was reserved specifically for this spec. BB-28 consumes and wires up that scaffolding rather than building a new panel from scratch. The existing music `AudioProvider` also has a working sleep timer implementation that BB-28 should study as a reference pattern, though BB-28 builds its own timer logic inside `AudioPlayerContext` rather than sharing state with the music subsystem.

## Overview

Users who fall asleep listening to scripture should not wake up at 3 AM to hear Leviticus still playing. A sleep timer lets them set a duration — 15 minutes, 30 minutes, 1 hour — after which Bible audio fades out smoothly and stops. The timer survives chapter transitions (if BB-29 auto-advance is happening, the timer keeps ticking through the transitions). The fade-out is gentle, not abrupt, because waking a sleeping user with a hard audio cutoff is exactly the kind of thing a sanctuary-first app should never do.

The sleep timer is accessed from the expanded player sheet via a small clock/moon icon button. Tapping it opens a timer configuration panel (the existing `SleepTimerPanel.tsx` scaffolding, wired up). The user picks a duration from a preset list. The panel closes, the sheet returns to its normal state, and a small visual indicator appears somewhere in the sheet showing the time remaining. When the timer reaches zero, audio fades out over 20 seconds and stops. The sheet returns to idle state.

The user can cancel or change the timer at any time by reopening the panel. When audio stops (either naturally or via timer), the timer is cleared automatically. The timer is ephemeral — it does not persist across page refreshes.

## User Story

As a user who likes to fall asleep listening to scripture, I want to open the audio Bible at 10 PM, set a 30-minute timer, and close my eyes. I want the Bible audio to play quietly beside me for 30 minutes, then fade out smoothly so my sleep is not interrupted. I don't want the audio to keep playing all night, and I don't want to wake up at the moment the audio stops because it cut off suddenly.

As a user who started a sleep timer and then changed my mind (maybe I'm not as tired as I thought), I want to open the sleep timer panel again and either cancel it or set a longer duration, without having to stop and restart audio playback.

As a user listening during the day with no sleep intent, I want the sleep timer to be completely out of my way — one small icon I can ignore.

## Functional Requirements

### Sleep timer entry point

1. The expanded player sheet includes a new icon button for the sleep timer, positioned in the corner row alongside the existing minimize and close buttons. The icon is a crescent moon (Lucide `Moon` icon) for visual association with sleep.

2. The button is 44x44 tap target with a visible 32px circle inside (matching the existing minimize/close corner button pattern).

3. The button is placed in the top-left or top-center area of the corner row, distinct from minimize and close which are in their existing positions. Suggested layout: minimize (top-left), moon (top-center-left, new), [flex spacer], close (top-right).

4. When no timer is active, the button has the default corner-button styling: `text-white/50 hover:text-white/80 hover:bg-white/10`. When a timer IS active, the button's icon color shifts to `text-primary/80` (or the project's primary accent token) to indicate active state.

5. Tapping the button opens the `SleepTimerPanel`. This panel already exists as scaffolding from deep review Protocol 01 at `frontend/src/components/bible/SleepTimerPanel.tsx`. BB-28 wires it up to actually function rather than rebuilding it.

6. The button is ALSO present in the minimized bar, positioned to the left of the minimized play/pause button. Users mid-listen can set a sleep timer without expanding the sheet. This is different from the continuous-playback toggle (which is expanded-only) because sleep timer configuration is common enough on mobile at night that forcing the expand-tap is friction.

### Sleep timer panel

7. The `SleepTimerPanel` is an overlay that appears above the expanded player sheet when triggered. It uses the same dark surface treatment as the sheet itself (`bg-[#0D0620]/95 backdrop-blur-xl border border-white/10`). Rounded corners on all sides (not just top) since it's a floating panel, not a bottom-edge sheet.

8. The panel contains:
   - A title: "Sleep timer" in `text-white text-lg font-medium`
   - A sub-title explaining the current state (see requirements 11-13 below)
   - A grid of duration preset buttons
   - A cancel button (when a timer is already active)
   - A close button (returns to the sheet without changing the timer)

9. **Duration presets** (requirement — concrete list):
   - 15 minutes
   - 30 minutes
   - 45 minutes
   - 1 hour
   - 1 hour 30 minutes
   - 2 hours
   - **End of chapter** — a special preset that stops audio when the current chapter ends, regardless of elapsed time
   - **End of book** — a special preset that stops audio when the current book ends

10. Preset buttons use the same styling as the speed picker buttons in the expanded sheet (pill-shaped, `bg-white/[0.06]` when unselected, `bg-white/15` when selected). Arrange as a 2-column grid on mobile, 4-column on tablet and desktop.

### Panel state variations

11. When no timer is active and no audio is playing: the panel shows "Start audio first, then set a timer" as a gentle message. Preset buttons are disabled (`opacity-50`, `cursor-not-allowed`). This prevents the user from setting a timer with no audio to time.

12. When no timer is active and audio IS playing: the panel shows "Choose how long to listen" as the sub-title. Preset buttons are enabled. Tapping a preset starts the timer, closes the panel, and returns the user to the expanded sheet.

13. When a timer IS active: the panel shows "Stopping in 23 minutes" (live countdown, updates every second while panel is open) as the sub-title. The currently selected preset is highlighted. A "Cancel timer" button appears at the bottom of the panel (distinct from the panel's close button — cancel clears the timer, close just hides the panel without changing the timer).

### Active timer behavior

14. Once a timer is set, the provider tracks time remaining in `state.sleepTimerRemainingMs`. The value updates on each tick of the existing 200ms interval that BB-26 uses for scrubber updates. No separate interval is created.

15. When the timer reaches zero (or, for "end of chapter" and "end of book" presets, when the corresponding condition is met), the provider initiates a fade-out:
    - Over 20 seconds, the Howler instance's volume gradually decreases from 1.0 to 0.0 using the engine's `howl.volume()` method
    - Volume decrease is exponential (not linear) for a more natural fade — volume at 10 seconds remaining is ~0.7, at 5 seconds ~0.4, at 2 seconds ~0.15, at 0 seconds 0.0
    - At the end of the fade, the provider dispatches `STOP` which unloads the Howl and resets player state

16. The 20-second fade-out happens OUTSIDE the timer duration. If the user sets a 30-minute timer, audio plays at full volume for 30 minutes, then fades out for 20 more seconds, for a total of 30 minutes 20 seconds. The fade is a tail, not included in the duration.

17. During the fade-out, the sleep timer indicator (see requirement 20) shows "Fading..." in place of the countdown. The user can see the fade is in progress.

18. During the fade-out, the user can tap the sleep timer button to cancel the fade and return to full volume. This dispatches `CANCEL_SLEEP_FADE` which restores volume to 1.0 and clears the fade state. Audio continues playing normally.

19. If BB-29 auto-advance fires while a sleep timer is active, the new chapter's Howl instance inherits the current fade state. If the timer is at 5 minutes remaining when Genesis 50 ends and Exodus 1 begins, Exodus 1 plays at full volume for 5 minutes and then fades out. The fade applies to whichever Howl instance is playing when the timer reaches zero.

### Sleep timer indicator

20. When a timer is active, a small indicator appears in the expanded sheet showing the time remaining. The indicator is positioned near the chapter reference at the top of the sheet (not inside the corner row where the moon button lives). Format: a small pill with a moon icon and text like "29:45" or "1:23:05" depending on duration.

21. The indicator is `text-white/60 text-xs` with the moon icon at `h-3 w-3 text-primary/80`. It has a subtle glow or ring to draw the eye to it without being intrusive: `bg-white/[0.06] border border-primary/30 rounded-full px-2 py-0.5`.

22. On the minimized bar, the indicator appears to the left of the chapter reference in the same compact form.

23. For "End of chapter" and "End of book" presets, the indicator shows "Ends with chapter" or "Ends with book" instead of a countdown. No time number is shown because the remaining time depends on the chapter/book length at the moment the timer was set plus any auto-advance happening.

24. When the timer reaches the fade phase, the indicator text changes to "Fading..." for the 20-second duration.

25. Tapping the indicator opens the SleepTimerPanel (same as tapping the moon button). This is a convenient secondary entry point.

### Interaction with other actions

26. **User pauses playback while timer is active:** The timer continues counting down. If the user pauses for 5 minutes then resumes, the timer has 5 fewer minutes remaining. This is the standard behavior — the user's pause does not pause the timer. If the user wants to pause the timer, they should cancel it and set a new one when they resume.

27. **User closes the sheet while timer is active:** The timer continues counting down. Audio continues playing. The sheet reopens in whatever state if the user taps the AudioPlayButton again (BB-26 behavior preserved).

28. **User stops playback manually (close button, which dispatches STOP):** The timer is cleared. If the user starts playback again, they need to set a new timer.

29. **User changes chapter manually while timer is active:** The timer continues counting down. The new chapter plays. The fade will happen on the new chapter if the timer reaches zero before the user changes chapters again.

30. **End of Bible reached while timer is active:** BB-29's end-of-Bible state dispatches STOP. The timer is cleared as part of that. If the user taps "Start from Genesis" from the end-of-Bible state, the timer does NOT resume — they need to set a new one.

31. **Multiple rapid-fire preset changes:** If the user opens the panel, taps 15 minutes, closes, reopens, taps 30 minutes, the second tap cancels the first timer and starts a new 30-minute one. No accumulation, no queueing. Latest selection wins.

## Non-Functional Requirements

32. **Performance:** The timer adds zero overhead when not active. When active, the existing 200ms tick interval checks `state.sleepTimerRemainingMs` on each fire and dispatches `SLEEP_TIMER_TICK` if needed. No separate interval. Fade-out uses the same 200ms tick to step volume.

33. **Bundle:** No new dependencies. The `SleepTimerPanel.tsx` file already exists (292 lines) and is already in the deferred scaffolding — BB-28 wires it up. Main bundle delta should be ≤2 KB gzipped.

34. **Testing:** New logic is tested at three levels:
    - Unit tests for the sleep timer reducer actions (SET_SLEEP_TIMER, SLEEP_TIMER_TICK, START_SLEEP_FADE, CANCEL_SLEEP_FADE, CLEAR_SLEEP_TIMER)
    - Provider tests for the timer lifecycle including fade-out and interaction with auto-advance
    - Component tests for SleepTimerPanel state variations and preset selection
    - Integration test for the full "set timer, wait for tick, verify fade, verify stop" flow using fake timers

35. **Accessibility:** The SleepTimerPanel is a modal overlay when open. It uses `role="dialog"`, `aria-modal="true"`, and a focus trap (unlike the main player sheet which is non-modal, the timer panel IS modal). Focus returns to the moon button when the panel closes. The sleep timer indicator has an `aria-label` announcing the time remaining (e.g., "Sleep timer: 29 minutes remaining") with `aria-live="polite"` so screen readers announce updates without being noisy.

## Auth Gating

| Action | Auth Required |
|--------|---------------|
| Open sleep timer panel | No |
| Set sleep timer duration | No |
| Cancel active timer | No |
| Auto-fade at timer completion | No |

Zero new auth gates. Sleep timer works identically for logged-in and logged-out users.

## Responsive Behavior

| Breakpoint | Width | Key behavior |
|-----------|-------|--------------|
| Mobile | 375px | SleepTimerPanel is full-width minus 16px side padding. Preset grid is 2 columns. Panel height adjusts to content (~420px typical). Overlays the expanded sheet with a subtle scrim. |
| Tablet | 768px | Panel is `max-w-md` (448px), centered horizontally over the sheet. Preset grid is 4 columns (2x4 grid for 8 presets). |
| Desktop | 1440px | Same as tablet. Panel sits centered above the desktop `max-w-2xl` sheet. |

The scrim behind the panel is `bg-black/40` — enough to indicate modality but not enough to dim the whole screen.

## AI Safety

Not applicable. BB-28 does not use AI.

## Auth & Persistence

**localStorage keys:** None. The sleep timer is ephemeral and does not persist across page refreshes.

**Rationale for no persistence:** If a user refreshes the page during a sleep timer, the expected behavior is ambiguous. Should the timer resume? Restart? Reset? There is no clearly correct answer, and any choice will surprise some users. Ephemeral is the simplest and most predictable behavior: refresh clears everything. Users who accidentally refresh during a sleep timer will need to set a new one, which is a minor inconvenience for a rare edge case.

**No cross-tab sync:** Same reasoning as BB-29. Simultaneous audio Bible use in two tabs is not a real use case.

## Completion & Navigation

**No completion tracking.** Sleeping through audio does not earn faith points, streaks, or badges. Consistent with the anti-pressure rule from BB-26.

**No navigation changes.** BB-28 does not trigger React Router navigation. Auto-advance navigation from BB-29 still works normally while a sleep timer is active. The timer is orthogonal to navigation.

## Design Notes

### Moon icon button styling (in corner row)

```
Inactive state:
- Outer: flex h-[44px] w-[44px] items-center justify-center (same as minimize/close pattern)
- Inner: flex h-8 w-8 items-center justify-center rounded-full
  text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
- Icon: Moon from lucide-react at h-4 w-4

Active state (timer running):
- Same outer/inner structure
- Inner: bg-white/[0.08] border border-primary/30
- Icon: text-primary/80 instead of text-white/50
- Subtle ring: shadow-[0_0_8px_rgba(PRIMARY_COLOR,0.2)]
```

### Sleep timer indicator (near chapter reference)

```
Container:
- inline-flex items-center gap-1.5
- bg-white/[0.06] border border-primary/30 rounded-full
- px-2 py-0.5

Icon: Moon at h-3 w-3 text-primary/80

Text:
- text-white/70 text-xs tabular-nums
- Content: formatted time ("29:45", "1:23:05", "Ends with chapter", "Fading...")

Positioning:
- Expanded sheet: appears to the right of the translation label, with mt-1 margin to match
- Minimized bar: appears to the left of the chapter reference, replacing some horizontal padding

aria-live="polite"
aria-label: dynamically updated ("Sleep timer: 29 minutes remaining", "Sleep timer: ends with chapter", "Sleep timer: fading out")
```

### SleepTimerPanel layout

```
Panel container:
- fixed inset-0 z-50 flex items-center justify-center px-4
- Scrim: absolute inset-0 bg-black/40

Panel card:
- relative w-full max-w-md
- bg-[#0D0620]/95 backdrop-blur-xl border border-white/10 rounded-2xl
- px-6 py-6 sm:px-8 sm:py-8
- role="dialog" aria-modal="true" aria-labelledby="sleep-timer-title"

Title row:
- flex items-center justify-between
- Title: id="sleep-timer-title" text-white text-lg font-medium ("Sleep timer")
- Close button: same 44x44 hit area pattern, X icon, top-right

Sub-title (dynamic based on state):
- text-white/60 text-sm mt-1
- Content varies (see requirements 11-13)

Preset grid:
- mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2

Preset button (unselected):
- min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/10
- px-3 text-sm font-medium text-white/80
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50

Preset button (selected, when timer is active):
- Same base + bg-white/15 text-white border border-primary/30

Preset button (disabled, when no audio):
- opacity-50 cursor-not-allowed pointer-events-none

Cancel button (only when timer is active):
- mt-6 w-full min-h-[44px] rounded-full
- bg-white/[0.06] hover:bg-white/10 text-white/70 text-sm
- Content: "Cancel timer"
```

### Fade-out animation curve

The fade uses an exponential curve implemented in JavaScript on top of the existing 200ms tick interval. Each tick during the fade phase calculates:

```
const elapsed = 20000 - state.fadeRemainingMs // 0 to 20000
const progress = elapsed / 20000 // 0.0 to 1.0
const volume = Math.pow(1 - progress, 2) // exponential curve
howl.volume(volume)
```

This produces a curve where volume drops slowly at first and accelerates toward the end, which sounds more natural than linear. Rough waypoints: full volume at 20s remaining, 81% at 18s, 64% at 16s, 49% at 14s, 36% at 12s, 25% at 10s, 16% at 8s, 9% at 6s, 4% at 4s, 1% at 2s, 0% at 0s.

20 seconds is long enough to be gentle, short enough to not feel dragged out. Based on typical audiobook sleep-timer conventions (Audible uses ~10s, Kindle uses ~15s, meditation apps often use 30s). 20s splits the difference for a scripture context where gentleness matters more than efficiency.

## Anti-Pressure Design Decisions

**Fade-out is gentle, not abrupt.** A 20-second exponential fade is specifically chosen to not wake a sleeping user. Hard cut at zero seconds is what most audio apps do, and it's wrong for this use case. Someone falling asleep to scripture should not be startled awake by the audio suddenly stopping.

**"End of chapter" and "End of book" presets exist** because some users want to finish a logical unit rather than be cut off mid-sentence. These presets respect the structure of the text.

**No "extend timer when it's about to end" prompt.** Some apps pop a dialog "Your sleep timer is almost up. Extend by 10 minutes?" BB-28 does not. If the user wanted more time, they would have set more time. Interrupting them to ask is the opposite of sanctuary.

**No logging of sleep timer usage.** No analytics events, no user-facing history of "you've used the sleep timer 12 times this month." Listening to scripture while falling asleep is a private intimate act, not something to be measured.

**Cancellation is always one tap.** If the user changes their mind, cancelling is immediate and obvious. The moon button in the corner row opens the panel, the cancel button is prominent, one tap clears the timer. No confirmation dialog.

**No default duration.** The panel does not pre-select a preset. The user must actively choose. This prevents the "I just wanted to see the panel and my audio stopped 15 minutes later because the default was 15" bug.

## Out of Scope

1. **Custom duration input.** No "Set custom timer" text field. The 8 presets cover the range of realistic durations (15 min to 2 hours + the two structural presets). Adding a custom input is complexity for a narrow use case.

2. **Multiple concurrent timers.** One timer at a time. Setting a new one cancels the old one.

3. **Recurring timers.** No "every night at 10 PM, set a 30-minute timer automatically." Out of scope for the audio wave.

4. **Integration with ambient audio fade-out.** BB-27 will ship ambient layering. The sleep timer in BB-28 fades Bible audio only. Whether it should ALSO fade ambient audio is a BB-27 question, not a BB-28 question. BB-28 does not touch ambient audio state.

5. **Smart detection of user sleep state.** No accelerometer detection, no "we noticed your phone hasn't moved in 10 minutes, should we start a timer?" Out of scope.

6. **Timer resumption after page refresh.** Explicitly ephemeral per the persistence section.

7. **Timer visible on lock screen.** Media Session metadata does not support a countdown display. The lock-screen controls will show the current chapter but not the remaining timer time. Users wanting to check the timer must unlock the phone and open the app.

8. **Wake-up alarm / morning reverse.** The timer only stops audio. It does not start audio at a later time. Out of scope.

9. **Notification when timer completes.** No system notification fires when the timer reaches zero. The fade-out IS the notification. A buzzing phone notification would defeat the sleep purpose.

## Acceptance Criteria

- [ ] Moon icon button appears in the corner row of the expanded sheet.
- [ ] Moon icon button also appears in the minimized bar.
- [ ] Tapping the moon button opens the SleepTimerPanel.
- [ ] When no audio is playing, panel shows "Start audio first" message and presets are disabled.
- [ ] When audio is playing and no timer is active, panel shows "Choose how long to listen" and presets are enabled.
- [ ] All 8 duration presets are present: 15m, 30m, 45m, 1h, 1h 30m, 2h, End of chapter, End of book.
- [ ] Tapping a preset starts the timer, closes the panel, and shows the indicator.
- [ ] Sleep timer indicator appears near the chapter reference when active.
- [ ] Indicator updates every second (via the existing 200ms tick rounded to the nearest second).
- [ ] Tapping the indicator reopens the SleepTimerPanel.
- [ ] When timer is active, panel shows "Stopping in X minutes" with live countdown.
- [ ] Cancel button in the panel clears the timer immediately.
- [ ] Moon icon color shifts to primary accent when timer is active.
- [ ] Timer reaching zero triggers a 20-second exponential fade-out.
- [ ] During fade, indicator text changes to "Fading..."
- [ ] During fade, user can tap moon button to cancel the fade and return to full volume.
- [ ] After fade completes, audio stops and player returns to idle state.
- [ ] "End of chapter" preset stops audio when current chapter naturally ends.
- [ ] "End of book" preset stops audio when the last chapter of the current book ends.
- [ ] For structural presets, indicator shows "Ends with chapter" or "Ends with book" instead of countdown.
- [ ] Timer survives BB-29 auto-advance (if auto-advance fires during timer, new chapter inherits timer state).
- [ ] User pausing playback does not pause the timer.
- [ ] User stopping playback clears the timer.
- [ ] Page refresh clears the timer (no persistence).
- [ ] SleepTimerPanel has proper ARIA (`role="dialog"`, `aria-modal="true"`, focus trap, focus return to moon button on close).
- [ ] Sleep timer indicator has `aria-live="polite"` and meaningful `aria-label`.
- [ ] No new dependencies added.
- [ ] Main bundle delta ≤2 KB gzipped.
- [ ] Listening activity still NOT recorded for faith points, streaks, or badges (unchanged from BB-26).
- [ ] Existing `SleepTimerPanel.tsx` scaffolding is consumed, not replaced — existing structure preserved where sensible.
- [ ] BB-26, BB-29 tests continue to pass unchanged.

## Notes for Plan Phase Recon

1. **Inspect the existing `SleepTimerPanel.tsx` scaffolding** at `frontend/src/components/bible/SleepTimerPanel.tsx`. The file is 292 lines and was written during Protocol 01 of the deep review with the intention of being consumed by BB-28. The recon must identify:
   - What props/interface the scaffolding expects
   - What duration presets the scaffolding assumes (may match the spec, may differ)
   - What state management pattern the scaffolding uses (local component state, context, or props callback)
   - What styling is already present and whether it matches the current dark theme design system
   - Whether the scaffolding imports from `SleepTimer` type in the music `audio.ts` types file (which would create an unwanted coupling to the music subsystem)

   The plan should either consume the scaffolding as-is, modify it to fit BB-28's contract, or rewrite it. The decision depends on what the recon finds. Default assumption: modify rather than rewrite, to preserve whatever design work went into the scaffolding.

2. **Study the existing music sleep timer** in `frontend/src/components/audio/AudioProvider.tsx` (346 lines, from BB-20). The music provider already has a working sleep timer with fade-out. BB-28 should study this implementation as a reference but NOT share state with it. The two sleep timers are parallel subsystems (one for ambient music, one for Bible audio) and should not interfere. Document the music provider's fade curve and timer patterns in the recon so the plan can reference them without re-inventing.

3. **Decide where the moon button goes in the corner row.** The spec suggests top-center-left between minimize and the flex spacer. Verify this fits at 375px mobile without cramping the minimize and close buttons. If the fit is tight, the moon could alternatively go inline with the chapter reference (as a small icon next to the chapter text). Flag this for Playwright verification during execution.

4. **Verify that `Math.pow(1 - progress, 2)` exponential curve gives the intended perceptual fade.** This is a standard quadratic curve, but there's no substitute for listening to it. Recon should prototype the curve (either by mocking the calculation and graphing the values, or by temporarily adding it to a dev page) and confirm the fade feels natural. If it feels wrong, alternatives include linear (`1 - progress`), cubic (`Math.pow(1 - progress, 3)`), or a logarithmic approximation. The spec picks quadratic as the default; the recon should validate or correct.

5. **Confirm `BIBLE_BOOKS` constant supports "end of book" preset.** The "End of book" preset needs to know the last chapter number of the current book. BB-29's recon should have already confirmed chapter counts are available in `frontend/src/constants/bible.ts`. Re-verify during BB-28 recon and flag any gaps.

6. **Howler `volume()` method on HTML5 audio.** Verify that Howler's `volume()` setter works in HTML5 mode (BB-26 uses `html5: true`). Web Audio mode supports volume smoothly; HTML5 mode may have quirks depending on browser. Test by setting volume to 0.5 on a real playback and confirming it actually reduces volume. If Howler's HTML5 volume is not smooth or not supported, the fade-out implementation must use direct `<audio>` element volume manipulation via the internal `_sounds[0]._node` (the same private-field access pattern BB-26 uses for crossOrigin). Flag this as a recon question and be prepared to fall back.

7. **Focus trap in SleepTimerPanel conflicts with non-modal AudioPlayerSheet.** BB-26 explicitly rejected focus trapping on the sheet because the sheet is non-modal. BB-28's SleepTimerPanel IS modal (per requirement 35). Recon should confirm the project has a reusable `useFocusTrap` hook and verify it works when layered over a non-modal parent. If not, either build the focus trap locally or find an alternative (focus management via useEffect + refs, which is what BB-26 does for the big play button).

8. **The 20-second fade using the 200ms tick gives 100 volume steps.** At 200ms per step with a 20-second fade, there are 100 ticks and therefore 100 volume updates. Is this smooth enough? For comparison, a 60fps animation uses ~1200 updates over 20 seconds. 100 is much coarser but may still be perceptually smooth for a volume change. Recon should verify by testing. If 200ms is too coarse, the provider may need a dedicated 50ms interval during the fade phase (4x more updates) at the cost of additional CPU during a fade. Flag for execution-time verification.

9. **Test strategy for fake-timer-based tests.** The existing test infrastructure uses `vi.useFakeTimers()` in BB-26's engine stall-timeout tests. BB-28's timer tests need the same approach plus control over the 200ms tick interval. Recon should confirm the existing test patterns handle nested intervals correctly, because some fake-timer implementations have bugs around timers-that-start-other-timers.

10. **Bundle delta check.** Target is ≤2 KB gzipped main bundle delta. The new code: sleep timer reducer actions (small), fade-out logic (small), moon button in the corner row (small, lives in lazy sheet chunk), SleepTimerPanel wiring (lives in lazy chunk), indicator component (small). Main bundle only gets the reducer/provider logic. Recon should confirm the ≤2 KB target is realistic before execution begins.
