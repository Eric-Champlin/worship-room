# Feature: Audio Infrastructure + Floating Pill + Drawer Shell

## Overview

The Music feature is a core pillar of Worship Room's mission to provide emotional healing through worship, scripture, and peaceful experiences. This spec builds the **global audio infrastructure** that powers everything musical in the app: ambient soundscapes, scripture readings, bedtime stories, and worship playlists.

Users will be able to start audio on any page and have it continue seamlessly as they navigate. A floating pill shows what's playing and provides quick controls. Expanding the pill reveals a full drawer/panel with volume mixing, progress tracking, and tabbed sections for future content (mixer, timer, saved mixes).

This is **Spec 1 of the Music feature series** — it builds the engine and persistent UI shell. No content catalogs, browse pages, or content-specific features are included. Those come in Specs 2-10.

## User Stories

- As a **logged-out visitor**, I want audio to keep playing as I browse between pages so that my peaceful experience isn't interrupted by navigation.
- As a **logged-out visitor**, I want to see a small floating indicator when audio is playing so I know something is active and can control it.
- As a **logged-out visitor**, I want to tap the floating pill to expand a full control drawer so I can adjust volume and see what's playing.
- As a **logged-out visitor**, I want to pause and resume all audio from a single button so I can quickly silence everything during interruptions.
- As a **logged-out visitor**, I want to control audio from my phone's lock screen so I don't have to unlock my device to pause or skip.
- As a **logged-out visitor**, I want keyboard shortcuts (spacebar, arrow keys) to control audio so I can manage playback without reaching for the mouse.

---

## Requirements

### 1. AudioProvider (Global State)

A React Context provider that wraps the entire application router. All audio state lives here and is accessible from any component via hooks.

**State management:** React Context with `useReducer`. Split into two contexts for performance:
- `AudioStateContext` -- read-only state (consumed by UI components that render based on audio state)
- `AudioDispatchContext` -- dispatch function (consumed by components that trigger actions)

This split prevents re-renders in dispatch-only consumers when state changes.

**State shape:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `activeSounds` | `Array<{ soundId, volume, audioBuffer, gainNode, sourceNode }>` | `[]` | Currently playing ambient sounds |
| `foregroundContent` | `{ contentId, contentType, playbackPosition, duration, isPlaying } | null` | `null` | Current scripture reading or bedtime story |
| `masterVolume` | `number` (0-1) | `0.8` | Master volume level |
| `foregroundBackgroundBalance` | `number` (0-1) | `0.5` | 0 = all voice, 1 = all ambient |
| `isPlaying` | `boolean` | `false` | Global play/pause state |
| `sleepTimer` | `{ isActive, remainingSeconds, fadeDurationSeconds } | null` | `null` | Sleep timer state |
| `activeRoutine` | `{ routineId, currentStepIndex, steps } | null` | `null` | Active routine state |
| `pillVisible` | `boolean` | `false` | Whether the floating pill is rendered |
| `drawerOpen` | `boolean` | `false` | Whether the drawer/panel is expanded |
| `currentSceneName` | `string | null` | `null` | Display name for pill and Media Session |

**Reducer actions:**

- `ADD_SOUND` / `REMOVE_SOUND` / `SET_SOUND_VOLUME` -- manage individual ambient sounds
- `SET_MASTER_VOLUME` -- adjust master volume (0-1)
- `PLAY_ALL` / `PAUSE_ALL` / `STOP_ALL` -- global playback control
- `START_FOREGROUND` / `PAUSE_FOREGROUND` / `SEEK_FOREGROUND` -- foreground content (scripture, stories)
- `SET_FOREGROUND_BACKGROUND_BALANCE` -- voice vs ambient balance
- `SET_SLEEP_TIMER` / `TICK_TIMER` -- sleep timer management
- `OPEN_DRAWER` / `CLOSE_DRAWER` -- drawer visibility
- `START_ROUTINE` / `ADVANCE_ROUTINE_STEP` / `SKIP_ROUTINE_STEP` -- routine progression

### 2. Web Audio API Service

A service class (not a React component) that manages actual Web Audio API interactions. The AudioProvider delegates audio operations to this service.

**AudioContext lifecycle:**
- Single `AudioContext` created on first user-initiated audio interaction (required by browser autoplay policy)
- Never destroyed and recreated -- use `audioContext.suspend()` when all audio stops, `audioContext.resume()` on next play
- Created via user gesture: any tap/click on an audio-related UI element (play button, sound icon, pill)

**Audio node graph:**

```
[Sound Source 1] --> [GainNode 1 (per-sound volume)] --+
[Sound Source 2] --> [GainNode 2 (per-sound volume)] --+
[Sound Source 3] --> [GainNode 3 (per-sound volume)] --+--> [Master GainNode] --> destination
[Foreground <audio>] --> [GainNode FG (balance)] ------+
```

**Three-tier volume architecture:**
- **Device volume** (untouched -- user's phone/computer hardware)
- **Master GainNode** (controlled by master volume slider in the drawer)
- **Per-sound GainNodes** (controlled by individual sliders in the mixer tab)
- Effective volume = device x master x individual

**Hybrid playback for mobile background survival:**
- Primary playback via `<audio>` HTML element (survives mobile background/lock screen)
- Web Audio API GainNodes connected to the `<audio>` element's `MediaElementSourceNode` for volume control and mixing
- This hybrid approach is required because pure Web Audio API `AudioBufferSourceNode` gets suspended by mobile browsers when the screen locks
- Ambient loops also use `<audio>` elements (not `AudioBufferSourceNode`) for the same reason

**Volume transitions:** All volume changes use `gainNode.gain.linearRampToValueAtTime(newValue, audioContext.currentTime + 0.02)` for smooth, click-free 20ms ramps.

**Media Session API integration:**
- Set `navigator.mediaSession.metadata` with title (scene/session name), artist ("Worship Room"), and artwork
- Register action handlers: `play` --> `PLAY_ALL`, `pause` --> `PAUSE_ALL`, `nexttrack` --> `SKIP_ROUTINE_STEP`
- This enables lock screen controls on iOS and Android (play/pause/skip) and prevents mobile browsers from suspending the audio tab

**Browser tab title:**
- When audio is active: `"[play symbol] Scene Name -- Worship Room"`
- When paused: `"[pause symbol] Scene Name -- Worship Room"`
- When stopped: revert to normal page title

### 3. Floating Pill

A persistent UI element that appears when audio is active (playing or paused) and disappears when all audio is stopped.

**Visual design:**
- Capsule shape, ~56px tall, width adapts to content (min-width for touch target)
- Semi-transparent dark background: `rgba(15, 10, 30, 0.85)` with `backdrop-filter: blur(8px)`
- 1px border in brand purple at ~40% opacity
- White text and icons inside
- `z-index: 9999` -- above everything except the drawer itself

**Content (left to right):**
- Play/pause icon button (toggles global play/pause for all audio lanes)
- 3 waveform bars (CSS-only animation): 3 thin vertical bars at staggered heights with `ease-in-out` timing in brand purple. Bars freeze at mid-height when paused.
- Current scene/session name (truncated with ellipsis if needed, max ~150px text width)
- Progress arc around the pill edge for foreground content: thin 1.5px line in purple at 60% opacity, traces clockwise proportional to playback position

**Positioning:**
- **Desktop (>1024px):** Fixed, bottom-right corner, 24px from right edge, 24px from bottom
- **Mobile/Tablet (<=1024px):** Fixed, bottom-center, 24px above `env(safe-area-inset-bottom)` to clear iOS home indicator and Android nav bar

**Behavior:**
- Only visible when `pillVisible` is true (audio is playing or paused)
- Fades in (opacity 0 to 1, 300ms) when first sound starts
- Fades out (300ms) when all audio is explicitly stopped (not merely paused)
- Tapping anywhere on the pill opens the drawer (pill morphs into drawer)
- Play/pause button: single tap pauses ALL audio lanes, second tap resumes all
- Pill remains visible when audio is paused -- only hides on `STOP_ALL`

**Pill-to-routine shortcut (no audio playing):**
- When no audio is playing AND the user has saved routines in localStorage, the pill transforms into a subtle prompt: "Start [routine name]" with a play icon
- Shows the most-used routine (or first saved routine if no usage data)
- One tap launches the routine
- If no saved routines exist, pill stays hidden when no audio is playing

### 4. Slide-Up Drawer (Mobile) / Side Panel (Desktop)

The expanded control surface for all audio features.

**Opening animation:**
- The pill morphs into the drawer: smooth CSS transition on `transform`, `width`, `height`, `border-radius`, and position (~300ms total)
- Drawer content fades in as expansion completes
- Dismissing reverses the animation (drawer shrinks back to pill)

**Responsive layout:**
- **Mobile/Tablet (<=1024px):** Bottom slide-up drawer covering ~70% of viewport height. Semi-transparent scrim overlay behind it (`rgba(0, 0, 0, 0.4)`). Pill morphs upward into drawer.
- **Desktop (>1024px):** Right-side panel, ~400px wide, full viewport height, slides in from right edge. No scrim -- user can interact with page content alongside the panel. Pill morphs rightward into panel.

**Dismissal:**
- **Mobile:** Swipe-down gesture (primary), tap scrim (secondary), X button in drawer header (tertiary)
- **Desktop:** X button (primary), click outside panel (secondary), Escape key (tertiary)
- **All:** Auto-collapses back to pill on route navigation

**Internal layout -- two sections:**

**Top section (always visible, ~40% of drawer height):**
- Scene artwork placeholder (with CSS ambient animation: slow `background-position` drift or `transform: scale` pulse, CSS-only on compositable properties, respects `prefers-reduced-motion`)
- Large play/pause button (centered, prominent)
- Master volume slider: native `<input type="range">` styled with CSS (purple fill on dark track). Always shows percentage label (e.g., "80%").
- Foreground audio progress bar (only when scripture/story is playing): thin horizontal bar, purple fill, scrubbable. Elapsed time on left ("4:32"), remaining time on right ("-8:15"). Title of current content below the bar.
- Foreground/background balance slider (only when both voice and ambient lanes are active): labeled "Voice" on left end, "Ambient" on right end

**Bottom section (tabbed, ~60% of drawer height):**
- Three tabs: **Mixer** | **Timer** | **Saved**
- Tab bar styled consistently with Daily Hub tab bar (purple underline indicator, Inter semi-bold)
- **Mixer tab:** Shell only in this spec -- placeholder text "Add sounds from the Music page" (content populated by Spec 2)
- **Timer tab:** Shell only -- placeholder text "Set a sleep timer" (content populated by Spec 5)
- **Saved tab:** Shell only -- placeholder text "Your saved mixes and routines" (content populated by Specs 7 & 8)

**Routine progress indicator:**
- When a routine is actively playing, a thin horizontal stepper appears between the top section and tabs
- Shows icons for each step: current step highlighted in purple, completed steps checkmarked
- Skip-forward button at the right end
- Always visible regardless of which tab is selected
- Hidden when no routine is active

### 5. Keyboard Shortcuts

- **Spacebar:** Toggle global play/pause (only when no text input, textarea, or contenteditable is focused)
- **Arrow Up:** Increase master volume by 5% (same focus guard)
- **Arrow Down:** Decrease master volume by 5% (same focus guard)
- Implemented as a single `useEffect` in the AudioProvider with `keydown` event listeners
- Check `document.activeElement` tag name and `contentEditable` attribute before handling

### 6. Configuration

**Environment variable:**
- `VITE_AUDIO_BASE_URL` -- base path for audio files. Default: `/audio/` in dev, configurable for CDN in production.

**App config constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SIMULTANEOUS_SOUNDS` | 6 | Maximum concurrent ambient sounds |
| `DEFAULT_SOUND_VOLUME` | 0.6 | Initial volume for newly added sounds |
| `DEFAULT_MASTER_VOLUME` | 0.8 | Initial master volume |
| `DEFAULT_FG_BG_BALANCE` | 0.5 | Initial foreground/background balance |
| `CROSSFADE_DURATION_MS` | 1000 | Crossfade between sounds |
| `VOLUME_RAMP_MS` | 20 | Click-free volume transition |
| `SOUND_FADE_IN_MS` | 1000 | Fade in when adding a sound |
| `SOUND_FADE_OUT_MS` | 1000 | Fade out when removing a sound |
| `SCENE_CROSSFADE_MS` | 3000 | Crossfade between scenes |
| `PILL_FADE_DURATION_MS` | 300 | Pill appear/disappear |
| `DRAWER_ANIMATION_MS` | 300 | Drawer open/close |
| `SLEEP_TIMER_OPTIONS` | [15, 30, 45, 60, 90] | Minutes |
| `FADE_DURATION_OPTIONS` | [5, 10, 15, 30] | Seconds |

### 7. Audio File Structure for Development

Create the following directory structure in Vite's public folder:

```
/public/audio/
  /ambient/       -- ambient sound loops (MP3 192kbps)
  /scripture/     -- TTS scripture readings (MP3 192kbps)
  /stories/       -- TTS bedtime stories (MP3 192kbps)
  README.md       -- lists required files and sourcing instructions
```

- Add `/public/audio/**/*.mp3` to `.gitignore` (audio files too large for git). The `README.md` stays tracked.
- Include 2-3 placeholder MP3 files (any royalty-free ambient sound, e.g., rain, ocean waves) for testing the audio infrastructure end-to-end.

---

## Auth Gating

**No auth gating in this spec.** The audio infrastructure is available to everyone -- logged-out and logged-in alike. Auth gating is applied at the content/feature level in later specs (saving favorites, saving custom mixes, etc.).

| Element | Logged-Out | Logged-In |
|---------|-----------|-----------|
| Hear audio play | Yes | Yes |
| See the floating pill | Yes | Yes |
| Open the drawer | Yes | Yes |
| Control master volume | Yes | Yes |
| Play/pause from pill | Yes | Yes |
| Keyboard shortcuts (space, arrows) | Yes | Yes |
| Lock screen controls (Media Session) | Yes | Yes |
| Foreground progress bar / scrubbing | Yes | Yes |
| Drawer tabs visible (Mixer, Timer, Saved) | Yes (shells only) | Yes |

---

## AI Safety Considerations

- **Crisis detection needed?** No -- this spec has no user text input
- **User input involved?** No -- all interactions are button taps, sliders, and keyboard shortcuts
- **AI-generated content?** No -- audio files are pre-recorded or generated offline via TTS pipeline (Spec 10)
- **No `dangerouslySetInnerHTML` usage**
- **No database writes** -- all state lives in React context (localStorage used only in later specs for saved mixes)

---

## Auth & Persistence

- **Logged-out (demo mode):** Full audio infrastructure works. Zero persistence -- all state lives in React context and is lost on page refresh. No localStorage, no cookies, no anonymous IDs.
- **Logged-in:** Same behavior in this spec. Future specs add localStorage persistence for saved mixes and volume preferences.
- **Route type:** N/A -- the AudioProvider and pill/drawer are global (not route-specific). They render on every page.

---

## Responsive Behavior

### Mobile (< 640px)
- **Pill:** Bottom-center, 24px above `env(safe-area-inset-bottom)`. Full capsule width adapts to content. Min 44px touch target height.
- **Drawer:** Slides up from bottom, 70% viewport height, dark scrim behind. Swipe-down to dismiss.
- **Drawer tabs:** Horizontal, evenly distributed. Three short labels ("Mixer", "Timer", "Saved") fit comfortably.
- **Master volume slider:** Full width within drawer padding.
- **Scene artwork:** Square aspect ratio, max ~200px, centered.

### Tablet (640px - 1024px)
- **Pill:** Bottom-center (same as mobile).
- **Drawer:** Same as mobile but wider content area within the drawer. Artwork can be larger.
- **Tabs:** Same horizontal layout as mobile.

### Desktop (> 1024px)
- **Pill:** Bottom-right corner, 24px from right and bottom edges.
- **Drawer becomes side panel:** 400px wide, full viewport height, slides in from right edge. No scrim -- user can interact with page content alongside the panel.
- **Pill morphs rightward** into the panel (instead of upward into a drawer).
- **Artwork:** Can be wider within the 400px panel width.

---

## UX & Design Notes

- **Tone:** The audio player should feel like a calm, ever-present companion. It never intrudes -- it whispers its presence through the pill and expands only when invited.
- **Colors:** Dark glass aesthetic for the pill and drawer (dark purple/black with blur, consistent with the Navbar's glassmorphic style). Purple accent for active states, sliders, and progress indicators. White text/icons on dark surfaces.
- **Typography:** Inter for all UI text. Scene names in regular weight, labels in medium weight.
- **Animations:** All CSS animations must respect `prefers-reduced-motion: reduce`. When reduced motion is preferred: pill appears/disappears instantly (no fade), drawer opens/closes instantly (no morph), waveform bars are static, artwork has no ambient animation.
- **Waveform bars:** 3 thin vertical bars (~2px wide, ~16-20px max height) with staggered `ease-in-out` animation at different speeds. Brand purple color. When paused, all bars freeze at approximately mid-height.
- **Progress arc on pill:** SVG-based or CSS `conic-gradient` arc that traces the pill's border clockwise. Thin (1.5px), purple at 60% opacity. Only visible when foreground content is playing.
- **Slider styling:** Native `<input type="range">` with CSS customization. Purple thumb, purple fill track on dark gray track background. Consistent with existing slider patterns in SearchControls.

---

## Out of Scope

- Sound catalog, sound tiles, and "add sound" browsing UI (Spec 2: Ambient Sound Catalog)
- Scene presets and scene browsing pages (Spec 3: Scene Presets)
- Scripture reading and bedtime story content (Spec 4: Foreground Content)
- Sleep timer countdown logic and bedtime session flow (Spec 5: Sleep & Bedtime)
- Spotify playlist integration and worship music pages (Spec 6: Worship Playlists)
- Saved mixes, favorites, and sharing (Spec 7: Persistence & Sharing)
- Routines builder and routine templates (Spec 8: Routines)
- Full accessibility audit (Spec 9: Accessibility Pass)
- TTS generation pipeline and content sourcing (Spec 10: Content Pipeline)
- Database integration (future -- beyond all 10 specs)
- Offline/PWA support (future)
- Native mobile app (future)

---

## Acceptance Criteria

### AudioProvider & State
- [ ] `AudioProvider` wraps the application router and is accessible from any component via `useAudioState()` and `useAudioDispatch()` hooks
- [ ] State and dispatch are split into two separate contexts to prevent unnecessary re-renders
- [ ] All reducer actions listed in Requirements Section 1 are implemented and dispatched correctly
- [ ] Provider does not interfere with existing providers (ToastProvider, AuthModalProvider)

### Web Audio API Service
- [ ] `AudioContext` is created on first user gesture, never destroyed and recreated
- [ ] `AudioContext` is suspended when all audio stops, resumed on next play
- [ ] Hybrid `<audio>` element + Web Audio API GainNode playback works (audio survives mobile background/lock screen)
- [ ] Three-tier volume architecture works: device volume x master GainNode x per-sound GainNode
- [ ] Volume changes use `linearRampToValueAtTime` with 20ms ramp (no audible clicking)
- [ ] Maximum of 6 simultaneous sounds enforced

### Media Session & Tab Title
- [ ] `navigator.mediaSession.metadata` is set with title, artist ("Worship Room"), and artwork when audio starts
- [ ] Media Session action handlers registered: play, pause, nexttrack
- [ ] Browser tab title updates to show play/pause symbol + scene name when audio is active
- [ ] Tab title reverts to normal page title when audio stops

### Floating Pill
- [ ] Pill appears (fade-in, 300ms) when any audio starts playing
- [ ] Pill disappears (fade-out, 300ms) when all audio is explicitly stopped
- [ ] Pill remains visible when audio is paused (does not hide)
- [ ] Pill shows play/pause icon button that toggles all audio lanes
- [ ] Pill shows 3 animated waveform bars when playing, frozen at mid-height when paused
- [ ] Pill shows current scene/session name, truncated with ellipsis if too long
- [ ] Pill shows progress arc for foreground content (thin purple line tracing clockwise)
- [ ] Pill is positioned bottom-center on mobile/tablet, bottom-right on desktop
- [ ] Pill has `z-index: 9999` (above all other UI except drawer)
- [ ] Pill respects `env(safe-area-inset-bottom)` on mobile devices
- [ ] Pill has minimum 44x44px touch target
- [ ] Tapping the pill opens the drawer (morphing animation)

### Drawer / Panel
- [ ] Tapping pill morphs it into the drawer with ~300ms CSS transition
- [ ] Mobile/tablet: bottom slide-up drawer, ~70% viewport height, scrim overlay behind
- [ ] Desktop: right-side panel, ~400px wide, full viewport height, no scrim
- [ ] Mobile dismissal: swipe-down gesture, tap scrim, or X button
- [ ] Desktop dismissal: X button, click outside panel, or Escape key
- [ ] Drawer auto-collapses back to pill on route navigation
- [ ] Drawer has two sections: persistent now-playing top + tabbed bottom
- [ ] Top section shows: artwork placeholder, play/pause button, master volume slider with percentage label
- [ ] Foreground progress bar appears only when scripture/story content is playing
- [ ] Foreground progress bar is scrubbable (user can seek by dragging)
- [ ] Foreground progress bar shows elapsed time and remaining time
- [ ] Balance slider appears only when both foreground and background audio are active
- [ ] Bottom section has 3 tabs: Mixer, Timer, Saved (shell placeholders only)
- [ ] Tab bar styled with purple underline indicator
- [ ] Routine progress stepper appears between top section and tabs when a routine is active
- [ ] Routine stepper shows step icons with current highlighted and completed checkmarked
- [ ] Scene artwork has CSS ambient animation that respects `prefers-reduced-motion`

### Keyboard Shortcuts
- [ ] Spacebar toggles global play/pause when no text input/textarea/contenteditable is focused
- [ ] Arrow Up increases master volume by 5% (same focus guard)
- [ ] Arrow Down decreases master volume by 5% (same focus guard)
- [ ] Keyboard shortcuts do not fire when user is typing in any text field

### Accessibility
- [ ] Pill has `role="complementary"` and `aria-label="Audio player controls"`
- [ ] Play/pause button has dynamic `aria-label`: "Pause all audio" or "Resume all audio"
- [ ] Master volume slider has `aria-label="Master volume, {value}%"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- [ ] Drawer has focus trap when open (Tab/Shift+Tab cycle within drawer)
- [ ] `aria-live="polite"` region announces audio state changes (e.g., "Now playing: Garden of Gethsemane. 3 sounds active.")
- [ ] All CSS animations disabled when `prefers-reduced-motion: reduce` is set
- [ ] Escape key closes drawer on desktop
- [ ] All interactive elements in pill and drawer have appropriate ARIA labels

### Configuration & Files
- [ ] `VITE_AUDIO_BASE_URL` environment variable is configurable
- [ ] `AUDIO_CONFIG` constants are defined in a dedicated config file
- [ ] `/public/audio/` directory structure created with `ambient/`, `scripture/`, `stories/` subdirectories
- [ ] `README.md` in `/public/audio/` documents required files and sourcing instructions
- [ ] `/public/audio/**/*.mp3` added to `.gitignore`
- [ ] 2-3 placeholder MP3 files present for testing infrastructure end-to-end
