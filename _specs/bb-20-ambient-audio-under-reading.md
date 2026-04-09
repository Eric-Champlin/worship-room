# BB-20: Ambient Audio Under Reading

**Branch:** `bible-redesign` (no new branch -- all work commits directly here)
**Depends on:** BB-4 (reader view core), BB-5 (focus mode), existing global `AudioProvider` and ambient sound system from Music page
**Hands off to:** BB-26 (FCBH audio Bible), BB-27 (audio + ambient layering), BB-28 (sleep timer extension), BB-29 (continuous playback)
**Design system recon:** `_plans/recon/design-system.md` (captured 2026-04-05)

---

## Overview

The Bible reader currently delivers text. BB-20 turns it into a place. A user who opens scripture with rain falling softly in the background, or a fireplace crackling while they read the Psalms, enters a different mental state than someone reading in silence on a noisy bus. For emotionally vulnerable users seeking comfort in scripture -- the people this app exists for -- ambient atmosphere transforms reading from a task into a sanctuary.

The existing Music page already has a complete ambient audio system (24 sounds, crossfade, scenes, sleep timer, localStorage persistence). BB-20 wires that system into the Bible reader so users can start ambient audio without leaving the reader. No audio infrastructure is rebuilt. This is integration work.

## User Stories

- As a **logged-in Bible reader**, I want to start ambient sounds from inside the reader so that I can create a contemplative atmosphere without navigating away from my chapter.
- As a **returning reader**, I want the ambient audio to keep playing as I navigate between chapters so that my reading atmosphere is seamless.
- As a **reader who started audio from the Music page**, I want the Bible reader to reflect and control whatever is already playing so that the two features don't fight each other.
- As a **power user**, I want an option to auto-start my preferred sound when I open any chapter so that my reading ritual starts instantly.
- As a **user who prefers silence**, I want to hide the audio control entirely so it doesn't clutter my reading experience.

## Requirements

### Functional Requirements

#### Ambient Audio Control (reader chrome)

1. An icon button in the reader's top action bar (near existing share/notes/settings from BB-4) provides access to ambient audio
2. When no audio is playing: icon renders at reduced opacity (muted state), no animation
3. When audio is playing: icon renders at full opacity with a subtle pulse animation (2-second fade in/out cycle)
4. Reduced motion: pulse animation replaced with a static color shift (e.g., `text-primary-lt` instead of `text-white/50`)
5. Tapping the icon opens the AmbientAudioPicker

#### AmbientAudioPicker

6. Renders as a bottom sheet on mobile (< 640px) or popover anchored to the icon on desktop (>= 640px)
7. Heading: "Sounds"
8. **Quick row:** 4 horizontal cards showing the user's most recently played sounds (from existing AudioProvider history). If fewer than 4 in history, pad with curated defaults: Rain, Ocean Waves, Fireplace, and a fourth appropriate sound from the existing 24-sound library
9. Tapping a quick-row card starts that sound (crossfading from current if one is playing). Tapping the currently playing sound pauses it
10. **"Browse all sounds"** link opens the full sound library (reuse existing AmbientBrowser from AudioDrawer, presented as a deeper sheet or overlay -- plan phase decides the exact mechanism)
11. **Volume slider:** range 0--100, default 35 (deliberately quiet for reading context). User-adjusted volume persists as the reader-context default
12. **"Set a sleep timer"** link opens the existing sleep timer UI from the Music page (no rebuild)
13. **"Stop sound"** button fades audio out over 1 second and resets the picker to empty state
14. Picker closes on: tap outside, X button, Escape key

#### Chapter Navigation Persistence

15. Audio playback continues uninterrupted when navigating between chapters (e.g., John 3 to John 4 to Romans 8)
16. Audio playback continues when navigating from the reader to any other page in the app (e.g., reader to landing page to reader)
17. The `AudioProvider` must be mounted at a component-tree level that survives all route transitions. The plan phase must verify this and move it higher if necessary

#### Music Page State Coexistence

18. **Scenario A (Music audio already playing):** Reader loads, audio continues, reader control reflects playing state. User can change/pause/stop from reader
19. **Scenario B (Reader audio playing, user opens Music page):** Audio continues, Music page reflects the same state
20. **Scenario C (Audio paused, user opens reader):** Picker shows paused state. Tapping play resumes last sound
21. `AudioProvider` is the single source of truth. Reader and Music page are both views into the same audio state

#### Focus Mode Integration

22. Entering focus mode (BB-5) does NOT stop audio playback
23. Entering focus mode does NOT auto-dim audio volume
24. The ambient audio control remains accessible from focus mode via whatever chrome-access pattern focus mode already uses (e.g., "..." overflow or tap-to-reveal)

#### Reader Settings for Audio

25. Three new persistent fields in reader settings:
    - `ambientAudioVisible` (boolean, default `true`) -- controls whether the audio icon appears in the reader chrome
    - `ambientAudioAutoStart` (boolean, default `false`) -- when true, automatically starts the user's preferred sound on chapter open
    - `ambientAudioAutoStartSound` (string | null, default `null`) -- specific sound ID for auto-start; falls back to last-played if null
26. The reader settings panel (BB-4) gains a new "Background sound" section with:
    - Toggle: "Show audio control in reader" (controls `ambientAudioVisible`)
    - Toggle: "Auto-start sound when opening a chapter" (controls `ambientAudioAutoStart`, disabled when `ambientAudioVisible` is false)
    - Sound picker: "Default sound" (controls `ambientAudioAutoStartSound`, only visible when auto-start is true)
27. Auto-start does NOT re-trigger on chapter navigation if audio is already playing
28. If `ambientAudioAutoStartSound` references a sound no longer in the library, fall through to last-played sound; if that also fails, do nothing silently

#### Media Session Integration

29. When audio is started from the reader, OS media session metadata includes reading context: Title = sound name, Artist = "Worship Room -- Reading {Book} {Chapter}" (e.g., "Worship Room -- Reading John 3")
30. When audio is started from the Music page (not the reader), no reading context is added to metadata
31. Reading context is cleared from media session when the user navigates away from any reader page
32. A new method on the AudioProvider context: `setReadingContext({ book, chapter })` -- called by the reader when starting or resuming audio, cleared on reader unmount or navigation away

#### Tab Visibility

33. Audio does NOT stop when the browser tab loses visibility. Users expect background audio to continue when switching tabs

### Non-Functional Requirements

- **Performance:** No additional audio engine initialization. Reuses existing `AudioEngineService` and `AudioContext` singleton
- **Accessibility:** All tap targets >= 44px. Audio control is keyboard-accessible. Volume slider has proper ARIA labels. Picker focus-trapped when open. Screen reader announces play/pause state changes via `aria-live`
- **Bundle size:** No new audio dependencies. New components are lightweight UI wrappers around existing audio hooks

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See audio control icon | Not visible (reader is behind auth on bible routes) | Visible in reader chrome (if `ambientAudioVisible` is true) | N/A |
| Tap audio control icon | N/A (reader requires auth for full interaction per BB-4 patterns) | Opens AmbientAudioPicker | N/A |
| Start/stop/change sounds | N/A | Full access | N/A |
| Adjust volume | N/A | Full access, persisted | N/A |
| Change audio settings | N/A | Full access via reader settings panel | N/A |

**Note:** The Bible reader page (`/bible/:book/:chapter`) is accessible without auth for reading, but interactive features like the ambient audio control follow the existing reader chrome auth patterns. The plan phase must verify the exact auth gating of the reader action bar from BB-4 and match it. If the action bar is visible to logged-out users, the audio control should also be visible but trigger the auth modal on interaction.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Audio control icon in reader top bar (same size as other action icons). Picker renders as a bottom sheet (full width, max-height 60vh, swipe-down to dismiss). Quick row: 4 cards in horizontal scroll if they overflow. Volume slider full-width |
| Tablet (640--1024px) | Same as mobile layout but bottom sheet is narrower (max-width 480px, centered) |
| Desktop (> 1024px) | Audio control icon in reader top bar. Picker renders as a popover anchored below the icon (width ~320px). Quick row: 4 cards in a 2x2 grid or single row (plan phase decides). Volume slider full-width within popover |

The audio control icon, volume slider, and all quick-row cards must maintain 44px minimum touch/click targets across all breakpoints.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can read Bible chapters but cannot interact with the ambient audio control (follows existing reader chrome auth patterns from BB-4)
- **Logged-in users:** Full audio control access. Sound selection, volume, and play/pause state managed by the existing `AudioProvider` which persists via `wr_session_state` and `wr_listening_history`
- **New localStorage usage:**
  - Reader settings fields (`ambientAudioVisible`, `ambientAudioAutoStart`, `ambientAudioAutoStartSound`) stored within the existing reader settings key structure from BB-4
  - No new top-level `wr_*` keys required -- these are fields within the existing reader settings object

## Completion & Navigation

N/A -- The Bible reader is not part of the Daily Hub tabbed experience. No completion tracking integration needed.

## Design Notes

- **Audio control icon:** Use a wave or speaker glyph from Lucide (e.g., `Volume2` for playing, `VolumeX` for muted). Match the icon sizing and spacing of existing reader action bar icons from BB-4
- **Picker styling:** Dark frosted glass matching the existing AudioDrawer aesthetic: `rgba(15, 10, 30, 0.95)` background with `backdrop-blur(16px)`, `border border-white/10`, `rounded-2xl`. This is consistent with the AudioDrawer from `09-design-system.md` and the design system recon
- **Quick-row cards:** Small horizontal cards with sound name and a play/pause icon. Use `bg-white/[0.06]` with `border border-white/[0.12]` matching FrostedCard styling. Active/playing card gets a `border-primary/60` accent border
- **Volume slider:** Custom range input styled to match the dark theme. Track: `bg-white/20`. Fill: `bg-primary`. Thumb: white circle, 20px diameter. Match any existing volume slider patterns from the AudioDrawer
- **Pulse animation (playing state):** 2-second CSS animation cycling opacity between 0.6 and 1.0. Use `@media (prefers-reduced-motion: reduce)` to replace with a static `text-primary-lt` color
- **Bottom sheet:** Match the AudioDrawer mobile bottom sheet pattern (`animate-bottom-sheet-slide-in`, swipe-down dismiss, dark frosted glass)
- **Popover (desktop):** Arrow-less popover anchored below the icon, positioned so it doesn't overlap the reader text area. Use `z-50` to sit above reader content
- **All text:** `text-white` for headings, `text-white/70` for secondary labels. Zero raw hex values
- **Default volume 35:** This is deliberate. Reading-context ambient audio is quieter than Music page ambient audio (`DEFAULT_SOUND_VOLUME: 0.6` = 60%). The 35/100 default is the right number for this context

**Design system recon referenced:** `_plans/recon/design-system.md` (captured 2026-04-05). Audio component patterns, frosted glass values, and drawer animations are documented there.

**No new visual patterns** -- this feature reuses existing AudioDrawer, FrostedCard, and bottom sheet patterns.

## Critical Edge Cases

1. **Audio already playing when reader mounts:** Reader does not interrupt. Audio control reflects current playing state. No dialog, no prompt
2. **Auto-start sound removed from library:** Fall through to last-played; if that also fails, no audio plays. No error shown
3. **Audio control hidden but auto-start enabled (invalid state):** Auto-start fires anyway. User must re-enable visibility from settings to see the control and stop audio
4. **Sleep timer fires during reading:** Audio fades out and stops. Audio control updates to stopped state. User can restart manually
5. **Multiple tabs:** Each tab has independent `AudioProvider` state. Known limitation, accepted (same as BB-16)
6. **Audio picker vs. verse action sheet (BB-6):** Both are bottom sheets. They cannot be open simultaneously. If the audio picker is open and the user taps a verse, the verse action sheet replaces the audio picker. Plan phase must verify this with BB-6's existing modal patterns

## Out of Scope

- **No new ambient sounds** -- uses the existing 24-sound library
- **No FCBH narrated audio Bible** -- that is BB-26
- **No layering ambient + narrated audio** -- that is BB-27
- **No new sleep timer logic** -- reuses existing Music page sleep timer entirely
- **No reader-specific sound presets** -- uses the same presets as the Music page
- **No sound-to-chapter suggestions** -- no "Psalms 23 plays ocean waves" intelligence
- **No analytics** on which sounds are played from the reader
- **No keyboard shortcut** to toggle audio
- **No external audio sources** (Spotify, Apple Music)
- **No user-uploaded ambient sounds**
- **No haptic feedback** on audio control taps
- **No separate reader volume** that diverges from the AudioProvider master volume -- the volume slider controls the same state the Music page controls. The 35 default is only for initial presentation; once the user adjusts it, the AudioProvider's volume is the volume everywhere
- Backend API work is Phase 3+

## Acceptance Criteria

- [ ] Reader action bar contains an ambient audio control icon (wave or speaker glyph)
- [ ] Icon is at reduced opacity when no audio is playing
- [ ] Icon shows a subtle 2-second pulse animation when audio is playing
- [ ] `prefers-reduced-motion` replaces pulse with a static color shift
- [ ] Tapping the icon opens the AmbientAudioPicker as a bottom sheet (mobile) or popover (desktop)
- [ ] Picker heading reads "Sounds"
- [ ] Picker shows a quick row of the user's 4 most recently played sounds, padded with curated defaults if fewer than 4 in history
- [ ] Tapping a quick-row sound starts it (crossfading from current); tapping the playing sound pauses it
- [ ] Picker has a "Browse all sounds" link that opens the full sound library
- [ ] Picker has a volume slider with a default of 35 out of 100
- [ ] Picker has a "Set a sleep timer" link that opens the existing sleep timer UI
- [ ] Picker has a "Stop sound" button that fades audio out over 1 second
- [ ] Audio playback persists across chapter navigation (John 3 to John 4) without interruption
- [ ] Audio playback persists when navigating from the reader to other pages and back
- [ ] Audio started on the Music page continues seamlessly when the reader opens
- [ ] Reader audio control reflects whatever audio state is active in AudioProvider, regardless of where it was started
- [ ] Focus mode does not stop audio
- [ ] Focus mode does not auto-dim audio volume
- [ ] Audio control is accessible from focus mode via existing focus mode chrome patterns
- [ ] Reader settings panel has a "Background sound" section
- [ ] Settings section has a "Show audio control in reader" toggle
- [ ] Settings section has an "Auto-start sound when opening a chapter" toggle (disabled when visibility is off)
- [ ] Settings section has a "Default sound" picker (visible only when auto-start is on)
- [ ] Auto-start plays the configured sound on chapter open when enabled
- [ ] Auto-start uses last-played sound when no default sound is configured
- [ ] Auto-start does not re-trigger on chapter navigation if audio is already playing
- [ ] Hiding the audio control disables the auto-start toggle
- [ ] Media session metadata reads "{Sound Name}" / "Worship Room -- Reading {Book} {Chapter}" when audio started from reader
- [ ] Media session metadata does NOT include reading context when audio started from Music page
- [ ] Reading context cleared from media session when navigating away from any reader page
- [ ] Picker closes on tap outside, X button, or Escape key
- [ ] Audio picker cannot be open simultaneously with the verse action sheet (BB-6)
- [ ] Audio control icon and all picker tap targets >= 44px
- [ ] Audio control is keyboard-accessible (focusable, Enter/Space to toggle)
- [ ] Zero raw hex values in all new components
- [ ] AudioProvider location in the component tree verified to survive Bible reader route transitions
- [ ] Existing audio infrastructure paths confirmed before any new code is written
- [ ] No duplication of AudioProvider, ambient sounds library, or audio storage logic
- [ ] Plan phase confirms the four curated default sounds exist in the current 24-sound library
