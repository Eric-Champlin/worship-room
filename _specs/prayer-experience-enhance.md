# Feature: Prayer Generation Experience Enhancement

## Overview

The Pray tab's "Generate Prayer" flow currently works as a transactional text-output: click a button, wait, read static text. This misses the opportunity to create a spiritual moment — the kind of moment where a user feels genuinely held by the experience.

This feature transforms the prayer generation flow into an immersive 3-part experience: ambient sound atmosphere that wraps the user in worship, a contemplative word-by-word prayer reveal that invites slow reading, and a post-prayer reflection prompt that acknowledges the moment and offers natural next steps. Together, these turn a text transaction into a spiritual encounter — serving the app's mission of emotional healing through worship.

---

## User Stories

- As a **logged-in user** generating a prayer, I want calming ambient worship sounds to begin automatically so that the moment feels sacred and immersive without me having to navigate to the Music page.
- As a **logged-in user** reading my generated prayer, I want the prayer text to appear word by word so that I'm invited to read slowly and absorb each phrase rather than scanning the full text at once.
- As a **logged-in user** after reading my generated prayer, I want to be asked "How did that prayer land?" so that I can either affirm the prayer, try something different, or continue journaling — keeping the spiritual momentum alive.

---

## Requirements

### Enhancement 1: Ambient Sound Auto-Play on Prayer Generation

When the user clicks "Generate Prayer" and the loading state begins:

1. **Check if audio is already playing** via the existing AudioProvider state. If any ambient sounds or foreground content are active, do nothing — never interrupt the user's existing audio.
2. **Check `prefers-reduced-motion`**: If the user has reduced motion enabled, skip the auto-play entirely. (Audio is not motion, but auto-starting media without explicit user interaction respects the spirit of this preference for users who prefer fewer surprises.)
3. **If no audio is playing and no reduced motion preference**: Automatically start "The Upper Room" ambient scene at 40% master volume via the existing scene player system (`useScenePlayer` hook's `loadScene`). The master volume should be set to 0.4 before the scene loads so it starts quiet.
4. The ambient sound continues playing after the prayer displays and persists as the user reads, copies, shares, or navigates. It does not stop when the prayer flow ends — it becomes the user's ambient backdrop.
5. If the scene fails to load (network error on audio files), fail silently — the prayer flow continues without audio. No error toast, no retry.

**Sound Indicator:**

After the prayer is displayed (not during loading), if ambient sound was auto-started by this feature (not if the user already had audio playing before), show a small indicator below the prayer card:

- Text: "Sound: The Upper Room" with two actions:
  - "Change" — opens the AudioDrawer (existing component) so the user can browse other scenes
  - "Stop" — stops all audio playback immediately
- Styling: `text-xs text-white/50` — deliberately unobtrusive. Uses the same muted styling as footer copyright text.
- The indicator disappears if the user stops audio via the "Stop" button, the AudioPill, or the AudioDrawer.
- The indicator does NOT appear if audio was already playing before generation — the user already knows their audio is playing and has the global AudioPill for controls.

### Enhancement 2: KaraokeText Word-by-Word Prayer Reveal

When the generated prayer appears (after the loading dots), display it using the existing `KaraokeTextReveal` component (built in the karaoke-scripture-reveal spec) instead of showing the full text at once.

**Reveal behavior:**

1. Calculate the reveal duration based on prayer text length: approximately **80ms per word**. A typical 100-word prayer reveals over ~8 seconds. This is intentionally slower than the scripture reveals (which use fixed 2500ms durations) because prayer is a longer, more personal text that benefits from a slower contemplative pace.
2. The reveal begins immediately when the prayer appears (after the 1500ms mock loading delay).
3. The prayer card container (`rounded-lg bg-primary/5 p-6`) fades in normally, then the words within it reveal sequentially via `KaraokeTextReveal`.

**Read Aloud interaction during reveal:**

- If the user clicks "Read Aloud" while the reveal is still in progress: the visual reveal should complete immediately (skip to fully revealed), and TTS playback begins from the start of the prayer with the existing KaraokeText TTS highlighting mode (the original `KaraokeText` component with `currentWordIndex` from `ReadAloudButton`). This creates a seamless handoff from visual reveal to TTS-synced reading.
- If the user clicks "Read Aloud" after the reveal has completed: standard behavior — TTS plays the full prayer with word highlighting. Same as today.

**Skip option:**

- During the reveal (before all words are shown), display a "Skip" text link below the prayer card.
- Clicking "Skip" instantly shows the full prayer text with no animation (all words at `opacity: 1`).
- After skipping, the prayer displays normally with no animation.
- The "Skip" link disappears once the reveal completes (whether naturally or by skipping).
- Styling: `text-xs text-text-light underline` — same weight as the "Stop" button in the sound indicator. Not prominent.

**`prefers-reduced-motion`:**

- The `KaraokeTextReveal` component already handles this — shows all text instantly, fires `onRevealComplete` immediately.

### Enhancement 3: Post-Prayer Reflection Prompt

After the prayer is fully displayed (reveal complete or skipped), fade in a reflection section below the existing action buttons (Copy, Read Aloud, Save, Share) and above the existing secondary CTAs ("Journal about this →", "Pray about something else").

**Content:**

- Heading: "How did that prayer land?"
- Three response pills:
  1. **"It resonated"** — Heart icon (Lucide `Heart`), text "It resonated"
  2. **"I want something different"** — RefreshCw icon (Lucide `RefreshCw`), text "Something different"
  3. **"Journal about this"** — PenLine icon (Lucide `PenLine`), text "Journal about this"

**Behaviors:**

1. **"It resonated"**: Shows a brief encouraging message below the pills: "We're glad. Carry this prayer with you today." The message fades in, displays for 3 seconds, then fades out. After the message fades, the entire reflection section (heading + pills + message) fades out. The existing secondary CTAs remain visible.

2. **"Something different"**: Scrolls back up to the prayer input textarea, sets focus on it, clears the generated prayer state (resets to the input view), and shows a gentle prompt text above the textarea: "Try describing what's on your heart differently." This prompt uses `text-sm text-text-light` styling and disappears when the user starts typing.

3. **"Journal about this"**: Triggers the existing `onSwitchToJournal` callback with the prayer topic as context. This switches to the Journal tab with context — same as the existing "Journal about this →" CTA.

**Behavior rules:**

- The reflection prompt appears only once per generated prayer. If the user clicks any pill, the prompt does not reappear for that prayer.
- If the user generates a new prayer (via "Pray about something else" or by going through "Something different" and generating again), the reflection prompt resets and will appear again after the new prayer reveals.
- If the user clicks a reflection pill, the existing secondary CTAs ("Journal about this →", "Pray about something else") remain visible and functional.

**Timing:**

- The reflection section fades in with `animate-fade-in` (500ms) after a 500ms delay from the prayer reveal completing.
- The "It resonated" encouraging message fades in over 300ms, displays for 3 seconds, then fades out over 500ms. Total visible time: ~3.8 seconds.

---

## Auth & Persistence

All three enhancements are auth-gated by inheritance — prayer generation already requires login. No additional auth gating is needed.

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| "Generate Prayer" button | Auth modal: "Sign in to generate a prayer" | Triggers loading + auto-play + prayer generation |
| Sound indicator "Change" link | Not reachable (prayer generation is gated) | Opens AudioDrawer |
| Sound indicator "Stop" button | Not reachable | Stops all audio |
| "Skip" link during reveal | Not reachable | Skips to full prayer text |
| "It resonated" pill | Not reachable | Shows encouraging message |
| "Something different" pill | Not reachable | Resets to input view |
| "Journal about this" pill | Not reachable | Switches to Journal tab |
| Read Aloud button | Not reachable | TTS playback (unchanged) |

### Persistence

- **Logged-out**: Zero persistence. No data saved. No cookies. No localStorage writes.
- **Logged-in**: No new data saved. No new localStorage keys. The ambient audio state is managed by the existing AudioProvider (already handled). Reflection prompt state is React component state only, reset on navigation.
- **Route type**: Public (the Pray tab is viewable by everyone; auth gates are on the *generate action*, not the page)

---

## AI Safety Considerations

- **Crisis detection needed?**: No new user text input is introduced. The existing `CrisisBanner` on the textarea handles crisis keyword detection. The reflection prompt response is a button click, not text input.
- **User input involved?**: No new text input. The "Something different" flow redirects to the existing textarea which already has crisis detection.
- **AI-generated content?**: The generated prayer is the existing mock prayer (Phase 2). The encouraging message "We're glad. Carry this prayer with you today." is a hardcoded string. No new AI output.

---

## UX & Design Notes

### Emotional Tone

The prayer generation experience should feel like entering a quiet room — ambient sound fills the space, words appear slowly as if spoken by a gentle voice, and afterward someone asks how you're doing. The three enhancements work together to transform a transactional interaction into a spiritual moment.

### Visual Design — Sound Indicator

- Container: No background, no border — just inline text below the prayer card
- Layout: `"Sound: The Upper Room" · Change · Stop`
- Text: `text-xs text-white/50` (matches footer muted text)
- "Change" and "Stop": Same text styling, with `hover:text-white/70` for hover state
- Separator between actions: `·` (middle dot) at same opacity
- Position: Below the prayer card, above the action buttons
- The indicator is a **new visual pattern** (inline audio status text) not in the existing design system

### Visual Design — Skip Link

- Text: "Skip"
- Position: Centered below the prayer card, during the reveal only
- Styling: `text-xs text-text-light underline cursor-pointer hover:text-text-dark`
- Disappears after reveal completes or when clicked

### Visual Design — Reflection Prompt

- Container: No background card — the heading and pills sit directly on the existing background, creating visual separation from the action buttons above via spacing alone (`mt-6`)
- Heading: "How did that prayer land?" — `text-sm font-medium text-text-dark`
- Pills: Horizontal row with wrapping. Each pill:
  - Container: `bg-white/10 rounded-full px-4 py-2 inline-flex items-center gap-2 cursor-pointer transition-colors hover:bg-white/15`
  - Icon: 16px, same color as text
  - Text: `text-sm text-text-dark`
  - Touch target: minimum 44px height via padding
  - Focus: `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none`
- Encouraging message: `text-sm text-text-light italic` — centered below the pills
- Pills are a **new visual pattern**: `bg-white/10 rounded-full` chips with icons

Wait — the Pray tab content sits on a light `#F5F5F5` background with the BackgroundSquiggle. The `bg-white/10` styling is for dark backgrounds. On a light background, the pills should use:
- Container: `bg-gray-100 rounded-full px-4 py-2 inline-flex items-center gap-2 cursor-pointer transition-colors hover:bg-gray-200`
- Text: `text-sm text-text-dark`

Similarly, the sound indicator needs to use light-background text colors:
- Text: `text-xs text-text-light` (not `text-white/50` which is for dark backgrounds)
- "Change" and "Stop": `hover:text-text-dark`

### Design System Recon References

- **Prayer card**: Existing `rounded-lg bg-primary/5 p-6` — no changes to the card styling
- **Action buttons row**: Existing pattern with `Copy`, `ReadAloud`, `Save`, `Share` — no visual changes
- **`KaraokeTextReveal` component**: Existing component from the karaoke-scripture-reveal spec — used as-is with `msPerWord` or `revealDuration` calculated from prayer length
- **`animate-fade-in`**: Existing 500ms fade animation for the reflection section entrance
- **Chip/Tag pattern**: Referenced for pill sizing, but the reflection pills are visually distinct (gray background, icons, no border vs. white background with border for prayer starter chips)

### New Visual Patterns

1. **Inline audio status indicator** (sound indicator below prayer card): New pattern. Plan should mark derived text color values as `[UNVERIFIED]` until verified against the light background.
2. **Reflection response pills** (`bg-gray-100 rounded-full` with icon + text): New pattern. Similar to existing chip/tag pattern but with background fill instead of border, and includes an icon.
3. **Temporary encouragement message** (fade in → display → fade out): New animation pattern for timed content display.

---

## Responsive Behavior

### Mobile (< 640px)

- **Sound indicator**: Full width, centered text. "Change" and "Stop" on same line with middle dot separator.
- **Skip link**: Centered below prayer card.
- **Prayer reveal**: Same timing as desktop — the `KaraokeTextReveal` component handles natural line wrapping.
- **Reflection pills**: Stack vertically in a column (`flex-col`) when screen width is tight. Each pill is full-width within the container.
- **Encouraging message**: Centered, same as desktop.

### Tablet (640px - 1024px)

- **Sound indicator**: Left-aligned below prayer card.
- **Reflection pills**: Horizontal row, all 3 pills fit on one line.
- Everything else same as desktop.

### Desktop (> 1024px)

- **Sound indicator**: Left-aligned below prayer card.
- **Reflection pills**: Horizontal row with `gap-3`.
- **All content** within `max-w-2xl` container (inherited from existing Pray tab layout).

---

## Edge Cases

- **Audio already playing when "Generate Prayer" is clicked**: No auto-play. No sound indicator. Prayer generation proceeds normally with karaoke reveal and reflection prompt only.
- **Scene fails to load (network error)**: Fail silently. Prayer flow continues. Sound indicator does not appear since audio never started.
- **User clicks "Read Aloud" during reveal**: Visual reveal completes instantly, TTS begins. The transition should feel seamless — no flash or jump.
- **User clicks "Skip" then "Read Aloud"**: Prayer is fully visible. TTS plays normally with word highlighting.
- **User clicks "Something different" on reflection prompt**: Prayer is cleared, textarea gets focus. If the user generates again, the full cycle repeats (ambient auto-play only if no audio is currently playing — it may still be playing from the first generation).
- **User clicks "Pray about something else" (existing CTA) before reflection appears**: Prayer resets. Reflection prompt does not appear for the cleared prayer.
- **Ambient sound auto-play with `useScenePlayer` auth check**: The `useScenePlayer.loadScene()` checks `isAuthenticated` and shows auth modal if not. Since auto-play only triggers after successful prayer generation (which itself is auth-gated), the user is always authenticated when auto-play runs. No additional auth check needed.
- **User navigates away during reveal**: Component unmount cleans up all timeouts (handled by `KaraokeTextReveal`). Audio continues playing (global AudioProvider state).
- **Very short prayers (10 words)**: At 80ms/word, reveals in 0.8 seconds. The "Skip" link barely has time to appear. This is acceptable — short prayers don't need skipping.
- **Very long prayers (200+ words)**: At 80ms/word, reveals over 16+ seconds. The "Skip" link is valuable here.
- **Bedtime routine active**: If the user has a bedtime routine running and the auto-play tries to load a scene, the existing `useScenePlayer` routine interrupt confirmation would trigger. However, since the auto-play is non-interactive (no confirmation UI), the auto-play should check for active routines and skip if one is running.
- **AudioDrawer already open**: If the user clicks "Change" on the sound indicator while the AudioDrawer is already open, the click should close the drawer (toggle behavior per existing AudioDrawer).
- **`prefers-reduced-motion` and audio**: Ambient auto-play is skipped entirely. KaraokeTextReveal shows text instantly. Reflection prompt fade-in is instant. The prayer flow works but without the atmospheric enhancements.

---

## Out of Scope

- **Choosing which scene auto-plays**: Always "The Upper Room". No user preference or contextual matching. A future enhancement could match the scene to the prayer topic.
- **Persisting the sound indicator state**: The indicator is ephemeral — no localStorage, no database.
- **Auto-play on classic prayers**: Only the generated prayer flow gets the immersive experience. Classic prayers (currently hidden behind a `false` guard) are excluded.
- **Sound effects or chimes**: No additional audio cues (chime on prayer reveal complete, etc.). The ambient scene is the only audio addition.
- **Reflection prompt analytics**: No tracking of which pill users click. Phase 3+ analytics could add this.
- **Backend changes**: Entirely frontend. No new API endpoints.
- **New routes**: No new routes.
- **New localStorage keys**: No new persistence.
- **Prayer Wall integration**: The prayer generation experience is specific to the Pray tab. Prayer Wall has its own interaction patterns.
- **Ambient auto-play on other tabs**: Only the Pray tab's "Generate Prayer" triggers auto-play. The existing AmbientSoundPill handles the manual "Enhance with sound" pill across all tabs.
- **Custom reveal speed**: No user control over reveal pace. 80ms/word is hardcoded.
- **TTS-synced reveal mode**: The spec describes a transition from visual reveal to TTS when "Read Aloud" is clicked during reveal — this means skipping the visual reveal to completion and starting TTS, not synchronizing the visual reveal with TTS playback simultaneously.

---

## Acceptance Criteria

### Ambient Sound Auto-Play

- [ ] Clicking "Generate Prayer" (when logged in, with no audio playing) starts the "The Upper Room" ambient scene at 40% master volume
- [ ] If audio is already playing when "Generate Prayer" is clicked, no audio changes occur — existing audio continues uninterrupted
- [ ] If `prefers-reduced-motion` is enabled, no ambient auto-play occurs
- [ ] If a bedtime routine is currently active, ambient auto-play is skipped
- [ ] Ambient sound continues playing after the prayer is displayed — it does not stop when the prayer flow ends
- [ ] If scene loading fails (network error), the prayer flow continues normally with no error message
- [ ] Master volume is set to 0.4 (40%) before the scene loads

### Sound Indicator

- [ ] After the prayer displays (not during loading), a sound indicator appears below the prayer card: "Sound: The Upper Room · Change · Stop"
- [ ] The sound indicator only appears if audio was auto-started by this feature (not if the user already had audio playing)
- [ ] Clicking "Change" opens the AudioDrawer
- [ ] Clicking "Stop" stops all audio playback and the indicator disappears
- [ ] The indicator disappears if the user stops audio via the global AudioPill or AudioDrawer
- [ ] The indicator uses `text-xs text-text-light` styling (unobtrusive, light background appropriate)

### KaraokeText Prayer Reveal

- [ ] Generated prayer text appears word-by-word using `KaraokeTextReveal` at approximately 80ms per word
- [ ] The prayer card container (`bg-primary/5`) fades in normally; words within it reveal sequentially
- [ ] A "Skip" link appears below the prayer card during the reveal
- [ ] Clicking "Skip" instantly shows the full prayer text with no animation
- [ ] The "Skip" link disappears when the reveal completes (naturally or via skip)
- [ ] Existing prayer typography is preserved: `font-serif text-lg leading-relaxed text-text-dark`
- [ ] With `prefers-reduced-motion`, all prayer text appears instantly (no word-by-word animation)

### Read Aloud + Reveal Interaction

- [ ] Clicking "Read Aloud" during the reveal completes the visual reveal instantly and starts TTS from the beginning
- [ ] Clicking "Read Aloud" after the reveal has completed works as it does today (full TTS playback with word highlighting)
- [ ] The transition from reveal to TTS mode is seamless — no flash, no layout jump

### Post-Prayer Reflection Prompt

- [ ] After the prayer reveal completes (or is skipped), a reflection section fades in below the action buttons: heading "How did that prayer land?" with 3 response pills
- [ ] The reflection section fades in with `animate-fade-in` after a 500ms delay from reveal completion
- [ ] "It resonated" pill (Heart icon): shows encouraging message "We're glad. Carry this prayer with you today." which fades in, displays for 3 seconds, then fades out, followed by the entire reflection section fading out
- [ ] "Something different" pill (RefreshCw icon): scrolls to textarea, clears prayer, sets focus on textarea, shows "Try describing what's on your heart differently." prompt text
- [ ] "Journal about this" pill (PenLine icon): switches to Journal tab with prayer topic as context (same as existing "Journal about this →" CTA)
- [ ] The reflection prompt appears only once per generated prayer — clicking any pill dismisses it permanently for that prayer
- [ ] Generating a new prayer resets the reflection prompt to appear again
- [ ] The existing secondary CTAs ("Journal about this →", "Pray about something else") remain visible and functional

### Reflection Pill Styling

- [ ] Pills use `bg-gray-100 rounded-full px-4 py-2` with icon + text on the light Pray tab background
- [ ] Pills have `hover:bg-gray-200` hover state
- [ ] Each pill has minimum 44px touch target height
- [ ] Pills are keyboard-focusable with visible focus ring (`focus-visible:ring-2 focus-visible:ring-primary/50`)

### Responsive Layout

- [ ] Mobile (< 640px): Sound indicator centered; reflection pills stack vertically; skip link centered
- [ ] Tablet (640-1024px): Sound indicator left-aligned; reflection pills horizontal row
- [ ] Desktop (> 1024px): Sound indicator left-aligned; reflection pills horizontal row with `gap-3`
- [ ] All elements within `max-w-2xl` container (inherited from existing layout)

### Accessibility

- [ ] Sound indicator "Change" and "Stop" are keyboard-accessible
- [ ] Reflection pills are keyboard-navigable with accessible names (icon is decorative, text is the label)
- [ ] "Skip" link is keyboard-accessible
- [ ] Screen readers can access the full prayer text during the reveal (words at `opacity: 0` are in the DOM)
- [ ] `prefers-reduced-motion` disables ambient auto-play, prayer word reveal, and reflection fade-in animation
- [ ] Reflection pills have `aria-label` that includes the full action description
- [ ] The encouraging message after "It resonated" uses `aria-live="polite"` for screen reader announcement

### No Regressions

- [ ] Existing prayer generation flow works identically for logged-out users (auth modal appears, no ambient/reveal/reflection changes)
- [ ] Existing Copy, Read Aloud, Save, Share buttons are unchanged in position and behavior
- [ ] Existing "Journal about this →" and "Pray about something else" CTAs are unchanged
- [ ] Existing AmbientSoundPill on the Pray tab is unchanged (it appears in the input view, not the prayer display view)
- [ ] Existing crisis keyword detection via CrisisBanner is unchanged
- [ ] Global AudioPill behavior is unaffected
- [ ] No new localStorage keys written
- [ ] No new routes created

### Visual Verification

- [ ] The prayer card container fades in, then words reveal sequentially within it — visually distinct from a block fade-in
- [ ] The sound indicator is visually unobtrusive — smaller and lighter than the action buttons
- [ ] The reflection pills are visually distinct from the prayer starter chips (filled gray background vs. white with border)
- [ ] The encouraging message fade-in → display → fade-out feels natural and unhurried (total ~4 seconds)
- [ ] On mobile, the vertical pill stack has adequate spacing between pills (no cramped layout)
- [ ] The "Skip" link does not cause layout shift when it appears or disappears
