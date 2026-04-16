# Feature: Sleep Timer + Configurable Fade + Smart Fade

## Overview

The sleep timer transforms Worship Room into a nightly sleep companion — users set a timer, choose how gradually the audio fades, and the system handles the rest. The "smart fade" behavior is the key differentiator: when both spoken scripture/stories and ambient sounds are playing, the voice fades out first, leaving the listener to drift off to pure ambient soundscape before it too fades to silence. This creates a gentle, layered transition into sleep rather than an abrupt stop.

The timer runs reliably even when the phone screen is locked, self-correcting against browser throttling by comparing elapsed wall-clock time rather than counting intervals. Users configure everything from the drawer's Timer tab — preset durations, custom times, and fade length — then close the drawer and let the system carry them to sleep.

This feature builds on the foreground audio lane (Spec 4) and the ambient sound mixer (Spec 2).

---

## User Stories

- As a **logged-in user**, I want to set a sleep timer so audio stops automatically after a set duration, letting me fall asleep without worrying about turning it off.
- As a **logged-in user**, I want to configure how gradually the audio fades out so the transition to silence feels natural and doesn't wake me.
- As a **logged-in user**, I want the spoken voice to fade out before the ambient sounds so I can fall asleep to rain or fireplace after the scripture reading ends.
- As a **logged-in user**, I want the timer to continue working even when my screen is locked so I don't have to keep my phone awake.
- As a **logged-out visitor**, I want to see the timer controls so I understand the sleep timer feature before creating an account.

---

## Requirements

### 1. Timer Tab Setup UI

The Timer tab lives in the audio drawer (tab shell built in Spec 1). When no timer is active, it shows the setup interface.

**Timer Duration Selector:**
- Preset buttons in a horizontal row of pill-shaped buttons: 15, 30, 45, 60, 90 minutes
- Custom option: number input field for any duration in minutes (minimum 5 minutes, maximum 480 minutes / 8 hours)
- Selected preset = filled purple background; unselected = outlined with border
- Only one duration can be active at a time — selecting a preset clears the custom input and vice versa

**Fade Duration Selector:**
- Label: "Fade out over..."
- Preset buttons in the same pill-shaped row style: 5, 10, 15, 30 minutes
- Default selection: 10 minutes
- **Auto-adjustment rule:** The fade duration must be less than the timer duration. If the user selects a combination where fade >= timer (e.g., 15-min timer with 30-min fade), the fade auto-adjusts to the largest valid option that is less than the timer duration, and a toast notification appears: "Fade adjusted to fit timer"

**"Start Timer" Button:**
- Full-width purple button below the fade selector
- Disabled state when no timer duration is selected
- Tapping starts the countdown and switches the Timer tab to the active countdown display

### 2. Active Timer Countdown Display

When the timer is active, the Timer tab replaces the setup UI with the countdown display.

**Countdown Display:**
- Large centered text: "{minutes}:{seconds} remaining"
- Circular progress ring around the countdown — thin purple line that depletes clockwise as time passes (full circle at start, empty at end)
- The ring provides a visual sense of how much time remains without reading the numbers

**Control Buttons:**
- Pause/Resume button: toggles between pause (pauses timer and freezes all audio at current volume levels) and resume (continues timer and any in-progress fade)
- Cancel button (X icon): stops the timer entirely, returns to setup UI, shows "Timer cancelled" toast

**Fade Status Text:**
- Small text below the countdown display
- Shows "Fading in {minutes}:{seconds}" when the timer is in Phase 1 (full volume) and approaching the fade period
- Shows "Fading now..." when actively in the fade period (Phase 2)
- Not shown when the timer is far from the fade period

**Read-Only Fade Duration:**
- The selected fade duration is displayed but not editable while the timer is active
- Users must cancel the timer to change the fade duration

### 3. Timer Notification Dot

When the timer is active and the drawer is open but a different tab (Mixer, Saved) is selected, the Timer tab label shows a small purple notification dot indicating the timer is running. This dot is visible regardless of which tab is currently selected.

### 4. Timer Execution Phases

**Phase 1 — Full Volume:**
- Duration: total timer duration minus fade duration
- Example: 60-min timer with 15-min fade = 45 minutes at full volume
- All audio plays at user-configured volumes (no modifications)
- Timer ticks every second for the countdown display update

**Phase 2 — Fade:**
- Duration: the configured fade duration
- Volume decreases are scheduled via Web Audio API `linearRampToValueAtTime` for smooth, glitch-free fading even if JavaScript execution is paused
- Fade behavior depends on what's playing (see Smart Fade below)

**Phase 3 — Silence:**
- All audio is paused (not stopped — preserving playback state for potential future resume)
- The floating pill shows a paused state
- Timer tab returns to the setup UI
- A "Timer complete" toast appears briefly

### 5. Smart Fade

The defining behavior of the sleep timer. When both foreground (scripture reading / bedtime story) and ambient sounds are playing simultaneously, they fade on separate schedules to create a layered transition.

**Smart Fade Schedule (given a fade duration of F minutes):**

- **Foreground voice:** Begins fading at the start of the fade period. Reaches silence at F × 0.6 (60% through the fade). With a 15-min fade, the voice fades over 9 minutes.
- **Ambient sounds:** Begins fading at F × 0.4 (40% through the fade period). Reaches silence at F (end of fade). With a 15-min fade, ambient starts fading at minute 6 and fades over 9 minutes.
- **The overlap:** Between F × 0.4 and F × 0.6, both are fading — but the voice is nearly gone and ambient is just beginning to dim. The user experience: voice gently disappears, a period of pure ambient, then ambient slowly fades to silence.

**Single-lane behavior:**
- If only ambient is playing (no foreground): simple linear fade over the entire fade duration
- If only foreground is playing (no ambient): simple linear fade over the entire fade duration

**Volume scheduling:**
- All fade volumes are scheduled via Web Audio API `linearRampToValueAtTime` — calculated at fade start and committed to the audio timeline
- This ensures smooth fading even if JavaScript execution is interrupted or throttled by the browser

### 6. Foreground Content Ending Before Timer

If the scripture reading or bedtime story reaches its natural end before the timer expires:

- Foreground stops normally (content is finished)
- Ambient continues at full volume — no fade is triggered by the foreground ending
- Timer continues counting down
- **Ambient volume "breathe up":** When foreground content ends naturally, the ambient GainNodes ramp up to the user's full configured volume over 5 seconds, removing any foreground/background balance attenuation that was active
- When the timer reaches its fade phase, only ambient fades (since foreground is already done)

### 7. Self-Correcting Timer

The timer must remain accurate even when the browser throttles JavaScript intervals (common on mobile when the screen is locked or the app is backgrounded).

- The timer stores the start time (`Date.now()`) and total duration at the moment it starts
- Each tick calculates remaining time as: `totalDurationMs - (Date.now() - startTime)`
- This wall-clock comparison ensures accuracy regardless of how frequently JavaScript executes
- `setInterval` at 1-second intervals drives the countdown display; `requestAnimationFrame` can optionally smooth the visual updates when the tab is in the foreground
- The `<audio>` element's Media Session API integration keeps audio alive when the screen is locked

### 8. Timer Interaction Edge Cases

**User manually pauses during fade:**
- All fading stops immediately — volumes freeze at their current levels
- Timer pauses
- Resuming: fading continues from current levels, timer resumes with correct remaining time

**User manually stops all audio during timer:**
- Timer is cancelled
- "Timer cancelled" toast appears
- All audio stops

**User adds/removes ambient sounds during timer:**
- New sounds added at their configured default volume (reduced by the current fade level if in the fade phase)
- Removed sounds follow their normal toggle-off behavior

**User switches scenes during timer:**
- Scene crossfade happens normally (per the crossfade behavior from Spec 3)
- Timer continues uninterrupted
- New scene's sounds are subject to the current fade phase level

**User starts a new foreground session during timer:**
- The content switching confirmation dialog appears (from Spec 4)
- If the user chooses "Switch," the new foreground session starts at the current fade level (if in the fade phase)
- Timer continues regardless of the user's choice

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| View Timer tab and all controls | Yes — full setup UI visible (presets, fade options, Start Timer button) | Yes |
| Select timer duration presets | Yes — buttons respond visually | Yes |
| Select fade duration presets | Yes — buttons respond visually | Yes |
| Enter custom timer duration | Yes — input field works | Yes |
| Tap "Start Timer" | Auth modal: "Sign in to use the sleep timer" | Timer starts counting down |
| Pause/Resume active timer | N/A — cannot start a timer | Yes |
| Cancel active timer | N/A — cannot start a timer | Yes |

**Rationale:** Logged-out users can explore and interact with the full timer setup UI so they understand the feature's depth before creating an account. Only the "Start Timer" action is gated, consistent with the play-gate pattern used across the Music section.

---

## Responsive Behavior

### Mobile (< 640px)
- Timer duration preset buttons: wrap to 2 rows (3 buttons per row: 15/30/45 on row 1, 60/90/Custom on row 2)
- Fade duration buttons: wrap to 2 rows if needed (5/10 on row 1, 15/30 on row 2)
- Countdown display: centered, large text (at least 2rem)
- Circular progress ring: sized to fit mobile width with comfortable padding
- Control buttons (Pause/Cancel): full width, stacked or side by side
- "Start Timer" button: full width

### Tablet (640px - 1024px)
- Timer duration preset buttons: single row, all 5 presets + custom fit horizontally
- Fade duration buttons: single row
- Countdown display: centered, generous whitespace
- Control buttons: side by side, centered

### Desktop (> 1024px)
- Timer controls in the drawer's side panel — same layout as tablet but with more horizontal breathing room
- All preset buttons in single rows
- Countdown display: centered within the panel

---

## UX & Design Notes

- **Tone:** Calm, restful, minimal. The timer UI should feel like the last thing you interact with before closing your eyes — simple, clear, no cognitive load.
- **Colors:** Use design system dark palette. Preset pill buttons use `border-white/20` for unselected, `bg-primary` filled for selected. Progress ring uses `stroke: primary` on a `stroke: white/10` track. Fade status text in `text-white/50`.
- **Typography:** Inter for all timer UI. Countdown numbers in a slightly larger weight (semibold 600) for readability in dim light. Fade status text in small/muted style.
- **Circular progress ring:** SVG-based. Thin stroke (2-3px). Purple fill that depletes clockwise. Positioned around or behind the countdown text. Smooth animation via CSS `stroke-dashoffset` or recalculated on each tick.
- **Pill buttons:** Same style as existing pill-shaped buttons in the ambient mixer scene presets — rounded-full, horizontal row, clear selected/unselected states.
- **Toast notifications:** Use the existing Toast system (`useToast()` hook) for "Fade adjusted to fit timer," "Timer cancelled," and "Timer complete" messages.
- **Animations:** Minimal. Progress ring depletes smoothly. Transition between setup UI and countdown display can be a simple fade. No jarring animations — this is a sleep feature.

---

## AI Safety Considerations

- **Crisis detection needed?** No — this feature has no user text input. All interactions are button taps, slider adjustments, and timer controls.
- **User input involved?** Only a numeric input for custom timer duration — no text content, no crisis risk.
- **AI-generated content?** No — all UI text is static. No AI generation occurs in this feature.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can view and interact with all timer setup controls. Cannot start a timer. Zero persistence — no cookies, no anonymous tracking, no localStorage writes.
- **Logged-in:** Can start, pause, resume, and cancel timers. Timer state lives in React context (AudioProvider or a dedicated TimerProvider). No database writes — timer state is ephemeral and resets on page refresh.
- **Route type:** Public — the Timer tab is part of the drawer which is accessible on all pages. Timer start is auth-gated at the interaction level.

---

## Out of Scope

- **Morning alarm** — dropped; users have phone alarms
- **Session persistence / resume prompt** — saving the current mix state for next-visit resume (Spec 7)
- **Routine integration** — routines have their own timer step mechanism (Spec 8)
- **Timer presets / saved timer configurations** — future enhancement
- **Wind Down dimmed UI mode** — separate feature, not part of the timer system
- **Backend API** — no server endpoints; all timer state is client-side
- **Analytics / session logging** — listening duration tracking is a future enhancement
- **Timer sounds** — no chime or alarm at timer completion (this is a sleep feature — silence is the goal)

---

## Acceptance Criteria

### Timer Tab Setup UI
- [ ] Timer tab shows preset duration buttons: 15, 30, 45, 60, 90 minutes in a horizontal pill row
- [ ] Timer tab shows a custom duration input option (minimum 5 min, maximum 480 min)
- [ ] Selecting a preset clears the custom input and vice versa — only one duration source is active
- [ ] Timer tab shows fade duration options: 5, 10, 15, 30 minutes in a horizontal pill row
- [ ] Default fade duration is 10 minutes (pre-selected on first visit)
- [ ] Fade auto-adjusts to the largest valid option when fade >= timer duration
- [ ] Toast notification "Fade adjusted to fit timer" appears when fade is auto-adjusted
- [ ] "Start Timer" button is disabled when no timer duration is selected
- [ ] "Start Timer" button is full-width and uses the primary purple style

### Auth Gating
- [ ] Logged-out user can view the full Timer tab setup UI (presets, fade options, Start button)
- [ ] Logged-out user can interact with preset buttons (visual selection works)
- [ ] Logged-out user tapping "Start Timer" sees auth modal: "Sign in to use the sleep timer"
- [ ] Logged-in user tapping "Start Timer" begins the countdown

### Active Timer Countdown
- [ ] Active timer shows countdown display with "{minutes}:{seconds} remaining" in large centered text
- [ ] Circular progress ring depletes clockwise around the countdown as time passes
- [ ] Pause button pauses the timer and freezes all audio at current volume levels
- [ ] Resume button continues the timer and any in-progress fade from current levels
- [ ] Cancel button (X) stops the timer, returns to setup UI, and shows "Timer cancelled" toast
- [ ] Fade duration is displayed but not editable while the timer is active

### Timer Notification
- [ ] Timer notification dot (small purple circle) appears on the Timer tab label when a timer is active
- [ ] Notification dot is visible even when another tab (Mixer, Saved) is selected

### Fade Status
- [ ] "Fading in {minutes}:{seconds}" status text shows when approaching the fade period
- [ ] "Fading now..." status text shows during active fade (Phase 2)
- [ ] Status text is not shown when the timer is far from the fade period

### Timer Execution
- [ ] Phase 1 (full volume) plays for timer-minus-fade duration at user-configured volumes
- [ ] Phase 2 (fade) begins at the correct time based on timer and fade duration
- [ ] Phase 3 (silence): all audio is paused (not stopped), pill shows paused state, "Timer complete" toast appears
- [ ] Timer tab returns to setup UI after timer completes

### Smart Fade
- [ ] When both foreground and ambient are playing: foreground fades over the first 60% of the fade period
- [ ] When both foreground and ambient are playing: ambient begins fading at 40% of the fade period
- [ ] When both foreground and ambient are playing: ambient reaches silence at the end of the fade period (100%)
- [ ] Between 40% and 60% of fade period: voice is nearly gone while ambient is just starting to fade (overlapping transition)
- [ ] When only ambient is playing (no foreground): simple linear fade over the entire fade duration
- [ ] When only foreground is playing (no ambient): simple linear fade over the entire fade duration
- [ ] All volume fades use Web Audio API `linearRampToValueAtTime` for smooth, glitch-free transitions

### Self-Correcting Timer
- [ ] Timer calculates remaining time using `Date.now() - startTime` comparison (not interval counting)
- [ ] Timer remains accurate even when browser throttles JavaScript intervals (mobile screen lock)
- [ ] Timer continues working when the screen is locked (audio element keeps the process alive)

### Foreground Content Ending
- [ ] When foreground content ends naturally before the timer: ambient continues at full volume
- [ ] Ambient GainNodes ramp up to full configured volume over 5 seconds when foreground ends naturally (removing balance attenuation)
- [ ] Timer continues counting after foreground ends; only ambient fades when the fade phase arrives

### Edge Cases
- [ ] Manual pause during fade: all fading stops, volumes freeze at current levels, timer pauses
- [ ] Manual resume during fade: fading continues from frozen levels, timer resumes
- [ ] Manual stop of all audio during timer: timer is cancelled with "Timer cancelled" toast
- [ ] New sounds added during fade phase enter at their default volume reduced by the current fade level
- [ ] Scene switch during timer: crossfade happens normally, timer continues, new sounds subject to current fade phase
- [ ] New foreground session during timer: confirmation dialog appears, timer continues regardless of choice

### Responsive Design
- [ ] Mobile (< 640px): timer preset buttons wrap to 2 rows (3 per row)
- [ ] Mobile: countdown display is centered with large text
- [ ] Tablet (640-1024px): all preset buttons fit in a single row
- [ ] Desktop (> 1024px): same layout with more horizontal spacing

### Accessibility
- [ ] Timer preset buttons use `role="radiogroup"` with each button using `role="radio"` and `aria-checked="true/false"`
- [ ] Fade preset buttons use `role="radiogroup"` with each button using `role="radio"` and `aria-checked="true/false"`
- [ ] Countdown display uses `aria-live="polite"` and announces remaining time every minute (not every second)
- [ ] "Fading now..." status uses `aria-live="assertive"` for important state change announcement
- [ ] Start Timer button has `aria-label` including selected duration and fade duration
- [ ] Cancel button has `aria-label="Cancel sleep timer"`
- [ ] Pause button has `aria-label="Pause sleep timer"` / Resume button has `aria-label="Resume sleep timer"`
- [ ] All interactive elements have minimum 44x44px touch targets
