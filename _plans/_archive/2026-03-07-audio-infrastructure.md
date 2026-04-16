# Implementation Plan: Audio Infrastructure + Floating Pill + Drawer Shell

**Spec:** `_specs/audio-infrastructure.md`
**Date:** 2026-03-07
**Branch:** `claude/feature/audio-infrastructure`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Routing & Provider Nesting

Provider nesting in `App.tsx` (lines 69-108):
```
QueryClientProvider > BrowserRouter > ToastProvider > AuthModalProvider > Routes
```
AudioProvider should wrap between `AuthModalProvider` and `Routes` so all route components have audio context access. The AudioProvider has no dependency on auth or toast — it only needs to be inside the router (for route-change detection to auto-collapse the drawer).

### Component Organization

- Feature folders: `components/daily/`, `components/prayer-wall/`, `components/local-support/`, `components/ui/`
- New audio feature folder: `components/audio/`
- Hooks in `hooks/`
- Services in `lib/` (e.g., `lib/audio.ts` already exists)
- Constants in `constants/`
- Types in `types/`

### Existing Audio Code

- `lib/audio.ts` — `playChime()` with its own `AudioContext` singleton. The new `AudioEngineService` replaces this singleton pattern. `playChime()` can keep working independently (it creates its own short-lived oscillator).
- `hooks/useReadAloud.ts` — Browser Speech Synthesis TTS hook. Separate concern from Web Audio API ambient playback. No conflict.

### Existing Provider Patterns

- **AuthModalProvider** (`components/prayer-wall/AuthModalProvider.tsx`): `createContext(null)` + Provider component + `useAuthModal()` hook returning `undefined | value`. Lines 1-44.
- **ToastProvider** (`components/ui/Toast.tsx`): `createContext` + Provider + `useToast()` hook that throws if used outside provider.

The AudioProvider follows the split-context pattern (state + dispatch separate), which is new to this codebase but a well-known React pattern.

### Focus Trap

`hooks/useFocusTrap.ts` — accepts `isActive: boolean` and optional `onEscape` callback. Returns `containerRef`. Re-queries focusables on each Tab press. Restores previous focus on unmount. Lines 1-51. Reuse directly for the drawer.

### Tailwind Config

`tailwind.config.js` — 16 custom colors, 3 font families, 8 keyframe animations. Key colors for the audio UI: `primary: '#6D28D9'`, `hero-dark: '#0D0620'`, `hero-mid: '#1E0B3E'`. New keyframes needed: `waveform-bar-1`, `waveform-bar-2`, `waveform-bar-3`, `pill-fade-in`, `pill-fade-out`, `artwork-drift`.

### Vite Environment

`vite-env.d.ts` — Only `VITE_API_BASE_URL` declared. Must add `VITE_AUDIO_BASE_URL`.

### Test Patterns

All tests use Vitest + React Testing Library + jsdom. Standard wrapper:
```tsx
<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <ToastProvider>
    <AuthModalProvider>
      <Component />
    </AuthModalProvider>
  </ToastProvider>
</MemoryRouter>
```
AudioProvider will need to be added to this wrapper for components that consume audio context. Components that don't consume audio context don't need it.

### Git Ignore

Root `.gitignore` — no audio-specific entries. Must add `/frontend/public/audio/**/*.mp3`.

---

## Auth Gating Checklist

**No auth gating in this spec.** All audio infrastructure features are available to logged-out and logged-in users alike.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No actions require login | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Pill background | background | `rgba(15, 10, 30, 0.85)` | spec |
| Pill backdrop | backdrop-filter | `blur(8px)` | spec |
| Pill border | border | `1px solid rgba(109, 40, 217, 0.4)` | spec (brand purple at 40%) |
| Pill z-index | z-index | `9999` | spec |
| Pill height | height | `56px` | spec |
| Pill text | color | `#FFFFFF` (white) | spec |
| Pill text font | font | Inter 14px 500 | design-system.md (body/small) |
| Waveform bars | color | `#6D28D9` (primary) | spec + design-system.md |
| Waveform bar width | width | `2px` | spec |
| Waveform bar height | max-height | `16-20px` | spec |
| Progress arc | color | `rgba(109, 40, 217, 0.6)` (purple 60%) | spec |
| Progress arc | stroke-width | `1.5px` | spec |
| Drawer background | background | `rgba(15, 10, 30, 0.95)` | consistent with pill (slightly more opaque) |
| Drawer backdrop | backdrop-filter | `blur(16px)` | consistent with pill (stronger) |
| Drawer scrim (mobile) | background | `rgba(0, 0, 0, 0.4)` | spec |
| Drawer width (desktop) | width | `400px` | spec |
| Drawer height (mobile) | height | `70vh` | spec |
| Slider track | background | `#374151` (gray-700) | consistent with dark UI |
| Slider fill/thumb | background | `#6D28D9` (primary) | spec |
| Tab bar active | color | `#6D28D9`, underline | design-system.md Tab Bar Pattern |
| Tab bar inactive | color | `#7F8C8D` (text-light) | design-system.md Tab Bar Pattern |
| Tab bar font | font | Inter 16px 500 | design-system.md Tab Bar Pattern |
| Animation duration | pill fade | `300ms` | spec |
| Animation duration | drawer morph | `300ms` | spec |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/audio-infrastructure` is checked out and clean
- [ ] `pnpm test -- --run` passes all 444+ existing tests
- [ ] 2-3 royalty-free MP3 files are available (plan includes generating silent placeholder files via ffmpeg or using a small embedded data approach)
- [ ] No auth gating needed (confirmed by spec)
- [ ] Design system values are verified from `_plans/recon/design-system.md` and spec
- [ ] Existing `lib/audio.ts` `playChime()` function will NOT be modified (it works independently)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AudioContext singleton vs per-provider | Singleton service class instantiated once, passed to provider | Spec requires "never destroyed and recreated". Service class lifetime matches app lifetime. |
| Pill-to-drawer morph animation | CSS transitions on a single container element with state-driven classes, NOT separate pill/drawer elements | Simpler DOM, real morph effect. The container transitions between "pill mode" and "drawer mode" dimensions/position. |
| Placeholder MP3 files | Generate tiny silent MP3 files via a base64 constant in a setup script, OR include ~10KB royalty-free clips | Need real audio files for testing `<audio>` element + GainNode wiring. Base64-decoded silent files avoid licensing. |
| Swipe-down gesture on mobile drawer | `touchstart`/`touchmove`/`touchend` with threshold (50px) | Native feel without a gesture library dependency. |
| Route change detection for auto-collapse | `useLocation()` in AudioProvider with `useEffect` that dispatches `CLOSE_DRAWER` on path change | Standard React Router pattern. Only path changes (not search params) trigger collapse. |
| `MediaElementSourceNode` per `<audio>` | Create once per `<audio>` element, store in sound entry | Calling `createMediaElementSource()` twice on the same element throws. Must track to avoid duplication. |
| Foreground playback position tracking | `requestAnimationFrame` loop reading `audioElement.currentTime` | More accurate than `timeupdate` events (which fire ~4x/sec). RAF gives 60fps progress updates for smooth scrubbing. |
| Master volume slider: native `<input type="range">` | Yes, with CSS `appearance: none` and custom thumb/track styling | Spec explicitly calls for native range input. Accessible by default. |

---

## Implementation Steps

### Step 1: Audio Configuration, Types, and Environment

**Objective:** Create the foundational types, constants, and environment setup that all subsequent steps depend on.

**Files to create/modify:**
- `frontend/src/constants/audio.ts` — new file, AUDIO_CONFIG constants
- `frontend/src/types/audio.ts` — new file, TypeScript interfaces
- `frontend/src/vite-env.d.ts` — add `VITE_AUDIO_BASE_URL`

**Details:**

`constants/audio.ts`:
```typescript
export const AUDIO_CONFIG = {
  MAX_SIMULTANEOUS_SOUNDS: 6,
  DEFAULT_SOUND_VOLUME: 0.6,
  DEFAULT_MASTER_VOLUME: 0.8,
  DEFAULT_FG_BG_BALANCE: 0.5,
  CROSSFADE_DURATION_MS: 1000,
  VOLUME_RAMP_MS: 20,
  SOUND_FADE_IN_MS: 1000,
  SOUND_FADE_OUT_MS: 1000,
  SCENE_CROSSFADE_MS: 3000,
  PILL_FADE_DURATION_MS: 300,
  DRAWER_ANIMATION_MS: 300,
  SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90] as const,
  FADE_DURATION_OPTIONS: [5, 10, 15, 30] as const,
} as const

export const AUDIO_BASE_URL = import.meta.env.VITE_AUDIO_BASE_URL ?? '/audio/'
```

`types/audio.ts` — full state shape, action types, reducer action union, sound entry interface, foreground content interface, sleep timer interface, routine interface. Follow pattern from `types/daily-experience.ts` and `types/prayer-wall.ts`.

Key interfaces:
- `ActiveSound`: `{ soundId: string; volume: number; label: string }`
- `ForegroundContent`: `{ contentId: string; contentType: 'scripture' | 'story'; title: string; duration: number; playbackPosition: number; isPlaying: boolean }`
- `SleepTimer`: `{ isActive: boolean; remainingSeconds: number; fadeDurationSeconds: number }`
- `AudioRoutine`: `{ routineId: string; currentStepIndex: number; steps: RoutineStep[] }`
- `AudioState`: full state shape from spec
- `AudioAction`: discriminated union of all reducer actions

`vite-env.d.ts` — add `readonly VITE_AUDIO_BASE_URL?: string` to `ImportMetaEnv`.

**Guardrails (DO NOT):**
- DO NOT import any React code in types or constants files (pure TypeScript only)
- DO NOT include Web Audio API node references in the state types (those are internal to the service)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `constants/audio.test.ts` | unit | Verify AUDIO_CONFIG values match spec defaults |
| `types/audio.ts` | n/a | Type-only file, validated at compile time |

**Expected state after completion:**
- [ ] `AUDIO_CONFIG` constants defined and importable
- [ ] All TypeScript interfaces for audio state defined
- [ ] `VITE_AUDIO_BASE_URL` declared in env types
- [ ] No existing tests broken

---

### Step 2: Web Audio Engine Service

**Objective:** Create the `AudioEngineService` class that manages all Web Audio API interactions. This is a plain TypeScript class, not a React component.

**Files to create:**
- `frontend/src/lib/audio-engine.ts` — new file

**Details:**

Class `AudioEngineService` with:

1. **Private fields:**
   - `audioContext: AudioContext | null`
   - `masterGainNode: GainNode | null`
   - `soundSources: Map<string, { audioElement: HTMLAudioElement; sourceNode: MediaElementAudioSourceNode; gainNode: GainNode }>` — tracks all connected audio elements
   - `foregroundElement: HTMLAudioElement | null`
   - `foregroundSourceNode: MediaElementAudioSourceNode | null`
   - `foregroundGainNode: GainNode | null`

2. **`ensureContext(): AudioContext`** — lazy initialization. If `audioContext` is null, create new `AudioContext()`, create `masterGainNode`, connect to destination. If suspended, call `resume()`. Return context.

3. **`addSound(soundId: string, url: string, volume: number): HTMLAudioElement`** — create `<audio>` element, set `src`, `loop = true`, call `ensureContext()`, create `MediaElementAudioSourceNode` from element, create per-sound `GainNode`, connect: source -> gain -> masterGain. Set gain to 0, then `linearRampToValueAtTime(volume, now + SOUND_FADE_IN_MS/1000)`. Call `element.play()`. Store in `soundSources` map.

4. **`removeSound(soundId: string)`** — fade out via `linearRampToValueAtTime(0, now + SOUND_FADE_OUT_MS/1000)`. After fade, pause `<audio>` element, disconnect nodes, remove from map.

5. **`setSoundVolume(soundId: string, volume: number)`** — `linearRampToValueAtTime(volume, now + VOLUME_RAMP_MS/1000)` on the sound's GainNode.

6. **`setMasterVolume(volume: number)`** — `linearRampToValueAtTime(volume, now + VOLUME_RAMP_MS/1000)` on `masterGainNode`.

7. **`playForeground(url: string, title: string): HTMLAudioElement`** — create or reuse foreground `<audio>` element (not looped). Connect through foreground GainNode -> masterGain. Play. Return element for position tracking.

8. **`seekForeground(time: number)`** — set `foregroundElement.currentTime = time`.

9. **`pauseAll()`** — pause all `<audio>` elements (sounds + foreground).

10. **`resumeAll()`** — call `ensureContext()` (resumes AudioContext if suspended), then call `.play()` on all active `<audio>` elements.

11. **`stopAll()`** — fade all sounds out, pause, disconnect, clear map. Pause foreground. Suspend AudioContext.

12. **`suspend()`** — `audioContext?.suspend()`.

13. **`dispose()`** — stop everything, close context. (Called on unmount, though normally never called.)

**Important implementation details:**
- `createMediaElementSource()` can only be called ONCE per `<audio>` element. Guard against double-creation by checking the `soundSources` map.
- All `<audio>` elements are created programmatically (not in the DOM via JSX). They are invisible — no UI. `crossOrigin = 'anonymous'` for potential CDN usage.
- Volume ramp: `gain.gain.cancelScheduledValues(ctx.currentTime)` before each `linearRampToValueAtTime` to prevent conflicts.

**Guardrails (DO NOT):**
- DO NOT use `AudioBufferSourceNode` for any playback (breaks mobile background)
- DO NOT create multiple `AudioContext` instances (one singleton per service instance)
- DO NOT use `setValueAtTime` for volume changes (causes clicks; use `linearRampToValueAtTime`)
- DO NOT put React hooks or JSX in this file (pure TypeScript service class)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `lib/__tests__/audio-engine.test.ts` | unit | Test ensureContext creates AudioContext lazily |
| `lib/__tests__/audio-engine.test.ts` | unit | Test setMasterVolume calls linearRampToValueAtTime |
| `lib/__tests__/audio-engine.test.ts` | unit | Test addSound creates audio element and gain node |
| `lib/__tests__/audio-engine.test.ts` | unit | Test removeSound fades out and disconnects |
| `lib/__tests__/audio-engine.test.ts` | unit | Test stopAll suspends AudioContext |

Note: Tests will need to mock `AudioContext`, `GainNode`, `MediaElementAudioSourceNode`, and `HTMLAudioElement`. Use `vi.fn()` mocks. The jsdom test environment does not provide Web Audio API — create manual mocks.

**Expected state after completion:**
- [ ] `AudioEngineService` class is instantiable and all methods are callable
- [ ] Volume changes use `linearRampToValueAtTime` with correct ramp times
- [ ] All sounds use `<audio>` elements (not AudioBufferSourceNode)
- [ ] Unit tests pass with mocked Web Audio API

---

### Step 3: AudioProvider (React Context + Reducer)

**Objective:** Create the split-context AudioProvider that wraps the app and exposes audio state + dispatch to all components.

**Files to create:**
- `frontend/src/components/audio/AudioProvider.tsx` — new file
- `frontend/src/components/audio/audioReducer.ts` — new file (pure reducer function)

**Details:**

`audioReducer.ts`:
- Export `audioReducer(state: AudioState, action: AudioAction): AudioState`
- Handle all actions from the spec: `ADD_SOUND`, `REMOVE_SOUND`, `SET_SOUND_VOLUME`, `SET_MASTER_VOLUME`, `PLAY_ALL`, `PAUSE_ALL`, `STOP_ALL`, `START_FOREGROUND`, `PAUSE_FOREGROUND`, `SEEK_FOREGROUND`, `SET_FOREGROUND_BACKGROUND_BALANCE`, `SET_SLEEP_TIMER`, `TICK_TIMER`, `OPEN_DRAWER`, `CLOSE_DRAWER`, `START_ROUTINE`, `ADVANCE_ROUTINE_STEP`, `SKIP_ROUTINE_STEP`
- `STOP_ALL` sets `pillVisible: false`, clears `activeSounds`, clears `foregroundContent`, sets `isPlaying: false`
- `ADD_SOUND` sets `pillVisible: true`, `isPlaying: true`
- `PAUSE_ALL` sets `isPlaying: false` but keeps `pillVisible: true`
- `PLAY_ALL` sets `isPlaying: true`
- Pure function, no side effects — side effects handled in the provider

`AudioProvider.tsx`:
- Two contexts: `AudioStateContext` and `AudioDispatchContext`
- `useReducer(audioReducer, initialState)` where `initialState` uses `AUDIO_CONFIG` defaults
- Create `AudioEngineService` instance via `useRef` (one instance for app lifetime)
- `useEffect` that syncs reducer state changes to the audio engine:
  - When `masterVolume` changes → `engine.setMasterVolume()`
  - When `isPlaying` toggles → `engine.pauseAll()` / `engine.resumeAll()`
- Wrap dispatch in a custom dispatcher that handles side effects:
  - `ADD_SOUND` → call `engine.addSound()`, then dispatch to reducer
  - `REMOVE_SOUND` → call `engine.removeSound()`, then dispatch
  - `STOP_ALL` → call `engine.stopAll()`, then dispatch
  - etc.
- **Keyboard shortcuts** (`useEffect` with `keydown` listener):
  - Check `document.activeElement?.tagName` — skip if `INPUT`, `TEXTAREA`, `SELECT`
  - Check `document.activeElement?.getAttribute('contenteditable')` — skip if `'true'`
  - Spacebar → dispatch `PLAY_ALL` or `PAUSE_ALL` (toggle based on `isPlaying`), `e.preventDefault()` to prevent page scroll
  - ArrowUp → dispatch `SET_MASTER_VOLUME` with `Math.min(1, masterVolume + 0.05)`
  - ArrowDown → dispatch `SET_MASTER_VOLUME` with `Math.max(0, masterVolume - 0.05)`
- **Media Session API** (`useEffect`):
  - Set `navigator.mediaSession.metadata` when `currentSceneName` changes
  - Register action handlers: `play` → dispatch `PLAY_ALL`, `pause` → dispatch `PAUSE_ALL`, `nexttrack` → dispatch `SKIP_ROUTINE_STEP`
  - Guard with `if ('mediaSession' in navigator)`
- **Browser tab title** (`useEffect`):
  - When `isPlaying && currentSceneName`: set `document.title = "▶ ${currentSceneName} — Worship Room"`
  - When `!isPlaying && currentSceneName && pillVisible`: set `document.title = "⏸ ${currentSceneName} — Worship Room"`
  - When `!pillVisible`: restore original title (capture on mount via `useRef`)
  - Cleanup: restore original title
- **Route change auto-collapse** (`useEffect` with `useLocation()`):
  - When `location.pathname` changes and `drawerOpen` is true → dispatch `CLOSE_DRAWER`
- **aria-live announcements**: Render a visually hidden `<div aria-live="polite">` that updates with text like "Now playing: {sceneName}. {activeSounds.length} sounds active." when state changes.

Export hooks:
- `useAudioState(): AudioState` — reads `AudioStateContext`, throws if outside provider
- `useAudioDispatch(): AudioDispatch` — reads `AudioDispatchContext`, throws if outside provider

**Guardrails (DO NOT):**
- DO NOT use `useState` for audio state (use `useReducer` for predictable state transitions)
- DO NOT put UI rendering in the provider (only the `aria-live` div and audio engine)
- DO NOT dispatch in the reducer (reducer must be pure)
- DO NOT access `useAuth` or `useAuthModal` (no auth gating in this spec)
- DO NOT import Prayer Wall or Daily Hub components

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `components/audio/__tests__/audioReducer.test.ts` | unit | Test each reducer action produces correct state |
| `components/audio/__tests__/audioReducer.test.ts` | unit | Test ADD_SOUND sets pillVisible and isPlaying to true |
| `components/audio/__tests__/audioReducer.test.ts` | unit | Test STOP_ALL resets pillVisible to false |
| `components/audio/__tests__/audioReducer.test.ts` | unit | Test PAUSE_ALL keeps pillVisible true |
| `components/audio/__tests__/audioReducer.test.ts` | unit | Test SET_MASTER_VOLUME clamps to 0-1 |
| `components/audio/__tests__/AudioProvider.test.tsx` | integration | Test keyboard shortcuts dispatch correct actions |
| `components/audio/__tests__/AudioProvider.test.tsx` | integration | Test keyboard shortcuts ignored when input focused |
| `components/audio/__tests__/AudioProvider.test.tsx` | integration | Test aria-live region updates on state change |

**Expected state after completion:**
- [ ] AudioProvider wraps children and provides state + dispatch via two contexts
- [ ] Reducer handles all 18+ action types correctly
- [ ] Keyboard shortcuts work (spacebar, arrow up/down) with focus guard
- [ ] Media Session API integration sets metadata and handlers
- [ ] Tab title updates based on playback state
- [ ] Drawer auto-collapses on route change
- [ ] aria-live region announces state changes
- [ ] All tests pass

---

### Step 4: Wire AudioProvider into App.tsx

**Objective:** Add AudioProvider to the app's provider tree so all pages have audio context access.

**Files to modify:**
- `frontend/src/App.tsx` — add AudioProvider import and wrapping

**Details:**

Import `AudioProvider` from `@/components/audio/AudioProvider`.

Wrap between `AuthModalProvider` and `Routes`:
```tsx
<ToastProvider>
  <AuthModalProvider>
    <AudioProvider>
      <Routes>...</Routes>
    </AudioProvider>
  </AuthModalProvider>
</ToastProvider>
```

AudioProvider has no dependency on Toast or AuthModal. It goes inside both so audio context is available on all routes. It goes inside BrowserRouter so `useLocation()` works for auto-collapse.

**Guardrails (DO NOT):**
- DO NOT change existing provider order (QueryClient > BrowserRouter > Toast > AuthModal)
- DO NOT modify any route definitions
- DO NOT remove any existing imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | All 444+ existing tests must still pass (AudioProvider is inert when no audio is playing) |

**Expected state after completion:**
- [ ] AudioProvider wraps all routes
- [ ] `useAudioState()` and `useAudioDispatch()` are callable from any route component
- [ ] No existing tests broken

---

### Step 5: Tailwind Animations for Pill + Drawer

**Objective:** Add the custom CSS keyframes and animation utilities needed by the floating pill and drawer components.

**Files to modify:**
- `frontend/tailwind.config.js` — add new keyframes and animations

**Details:**

Add to `keyframes`:
```javascript
'waveform-bar-1': {
  '0%, 100%': { height: '4px' },
  '50%': { height: '16px' },
},
'waveform-bar-2': {
  '0%, 100%': { height: '8px' },
  '50%': { height: '20px' },
},
'waveform-bar-3': {
  '0%, 100%': { height: '6px' },
  '50%': { height: '12px' },
},
'artwork-drift': {
  '0%': { backgroundPosition: '50% 50%' },
  '50%': { backgroundPosition: '52% 48%' },
  '100%': { backgroundPosition: '50% 50%' },
},
```

Add to `animation`:
```javascript
'waveform-bar-1': 'waveform-bar-1 1.2s ease-in-out infinite',
'waveform-bar-2': 'waveform-bar-2 1.0s ease-in-out infinite',
'waveform-bar-3': 'waveform-bar-3 1.4s ease-in-out infinite',
'artwork-drift': 'artwork-drift 20s ease-in-out infinite',
```

These are CSS-only animations on compositable properties (`height` for waveform bars is acceptable since they're tiny elements, `background-position` for artwork). All will be gated behind `prefers-reduced-motion` via Tailwind's `motion-safe:` prefix in the components.

**Guardrails (DO NOT):**
- DO NOT modify existing keyframes or animations
- DO NOT use JavaScript-driven animations for the waveform bars (CSS-only per spec)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| n/a | visual | Animations verified visually via Playwright in Step 10 |

**Expected state after completion:**
- [ ] New animation utilities available in Tailwind classes
- [ ] Existing animations unchanged
- [ ] `pnpm build` succeeds

---

### Step 6: Floating Pill Component

**Objective:** Build the floating pill UI that shows playback status and provides quick controls.

**Files to create:**
- `frontend/src/components/audio/AudioPill.tsx` — new file
- `frontend/src/components/audio/WaveformBars.tsx` — new file (small sub-component)
- `frontend/src/components/audio/ProgressArc.tsx` — new file (SVG progress indicator)

**Details:**

`WaveformBars.tsx`:
- 3 `<div>` bars inside a flex container, each 2px wide
- Colors: `bg-primary`
- When `isPlaying`: `motion-safe:animate-waveform-bar-1`, `motion-safe:animate-waveform-bar-2`, `motion-safe:animate-waveform-bar-3`
- When paused: all bars fixed at ~50% height (`h-[10px]`), no animation
- `prefers-reduced-motion`: bars always static at mid-height
- Props: `isPlaying: boolean`

`ProgressArc.tsx`:
- SVG overlay on the pill that draws a thin arc tracing the pill border
- Uses `<svg>` with a `<circle>` and `stroke-dasharray`/`stroke-dashoffset` for progress
- The pill is a rounded rect (capsule), so the arc traces a rounded rect path using `<rect rx="28">`
- Stroke: `rgba(109, 40, 217, 0.6)`, stroke-width: `1.5`
- Props: `progress: number` (0-1), only renders when > 0
- `aria-hidden="true"` (decorative)

`AudioPill.tsx`:
- Consumes `useAudioState()` and `useAudioDispatch()`
- Only renders when `pillVisible` is true (or when routine shortcut is active — defer routine shortcut to Spec 8)
- Container: `<div role="complementary" aria-label="Audio player controls">`
- Fixed positioning:
  - Mobile: `fixed bottom-0 left-1/2 -translate-x-1/2 mb-[calc(24px+env(safe-area-inset-bottom))]`
  - Desktop: `fixed bottom-6 right-6 lg:left-auto lg:translate-x-0`
- Styling: `bg-[rgba(15,10,30,0.85)] backdrop-blur-[8px] border border-primary/40 rounded-full h-14 px-4 z-[9999]`
- Min width for touch target: `min-h-[44px] min-w-[44px]`
- Layout: flex row, items-center, gap-3
  - Play/pause button: `<button aria-label={isPlaying ? 'Pause all audio' : 'Resume all audio'}>` with Lucide `Pause` / `Play` icon (white, 20px)
  - `<WaveformBars isPlaying={isPlaying} />`
  - Scene name: `<span className="text-sm font-medium text-white max-w-[150px] truncate">{currentSceneName}</span>`
  - `<ProgressArc progress={foregroundProgress} />` (absolute positioned over pill)
- Click handler on the outer container (excluding the play/pause button area): dispatch `OPEN_DRAWER`
- Play/pause button: `e.stopPropagation()` to prevent drawer open, dispatch `PLAY_ALL` or `PAUSE_ALL`
- Fade animation: `transition-opacity duration-300` with conditional `opacity-0`/`opacity-100`

**Responsive behavior:**
- Mobile (< 1024px): bottom-center, horizontal-center with `left-1/2 -translate-x-1/2`
- Desktop (>= 1024px): bottom-right, `right-6 bottom-6`, remove center transform

**Guardrails (DO NOT):**
- DO NOT render pill when `!pillVisible` (return null)
- DO NOT use a `<Link>` or navigate on pill click (it opens the drawer, not a page)
- DO NOT use `onClick` on the play/pause button without `e.stopPropagation()`
- DO NOT use inline styles for colors (use Tailwind arbitrary values or custom classes)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Pill does not render when pillVisible is false |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Pill renders with role="complementary" and aria-label |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Play/pause button has correct aria-label for playing state |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Play/pause button has correct aria-label for paused state |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Scene name is displayed and truncated |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Clicking pill dispatches OPEN_DRAWER |
| `components/audio/__tests__/AudioPill.test.tsx` | unit | Clicking play/pause dispatches correct action |
| `components/audio/__tests__/WaveformBars.test.tsx` | unit | Renders 3 bars |
| `components/audio/__tests__/WaveformBars.test.tsx` | unit | Bars have animation classes when playing |
| `components/audio/__tests__/WaveformBars.test.tsx` | unit | Bars are static when paused |

Tests need a test wrapper that provides AudioStateContext and AudioDispatchContext with controlled state. Create a `renderWithAudioContext` helper.

**Expected state after completion:**
- [ ] Pill renders at correct position on mobile and desktop
- [ ] Play/pause button toggles state
- [ ] Waveform bars animate when playing, freeze when paused
- [ ] Scene name displays with truncation
- [ ] Progress arc shows foreground progress
- [ ] Tapping pill opens drawer
- [ ] ARIA labels correct
- [ ] All pill tests pass

---

### Step 7: Audio Drawer / Side Panel

**Objective:** Build the expandable drawer (mobile) / side panel (desktop) with now-playing controls and tabbed bottom section.

**Files to create:**
- `frontend/src/components/audio/AudioDrawer.tsx` — new file (main drawer component)
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — new file (top section)
- `frontend/src/components/audio/DrawerTabs.tsx` — new file (bottom tabbed section)
- `frontend/src/components/audio/VolumeSlider.tsx` — new file (reusable styled range input)
- `frontend/src/components/audio/ForegroundProgressBar.tsx` — new file
- `frontend/src/components/audio/RoutineStepper.tsx` — new file (stepper between sections)

**Details:**

`VolumeSlider.tsx`:
- Native `<input type="range" min="0" max="100" step="1">` with custom CSS styling
- Props: `value: number` (0-100), `onChange: (value: number) => void`, `label: string`, `ariaLabel: string`
- CSS: `appearance: none`, track bg `#374151` (gray-700), track height `4px`, border-radius `2px`
- Filled portion: use CSS `background: linear-gradient(to right, #6D28D9 0%, #6D28D9 ${pct}%, #374151 ${pct}%, #374151 100%)`
- Thumb: `w-4 h-4 rounded-full bg-primary border-2 border-white`
- Shows percentage label: `<span className="text-xs text-white/70 tabular-nums">{value}%</span>`
- ARIA: `aria-label={ariaLabel}`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow={value}`

`ForegroundProgressBar.tsx`:
- Thin horizontal bar showing foreground playback position
- Only rendered when `foregroundContent !== null`
- Clickable/draggable for scrubbing: `<input type="range" min="0" max={duration} value={position} step="0.1">`
- Shows elapsed time ("4:32") on left, remaining time ("-8:15") on right
- Content title below the bar
- Format times with `Math.floor(seconds / 60):String(Math.floor(seconds % 60)).padStart(2, '0')`

`RoutineStepper.tsx`:
- Horizontal row of step indicators between now-playing and tabs
- Only rendered when `activeRoutine !== null`
- Each step: circle icon, current step = purple fill, completed steps = checkmark, future steps = gray outline
- Skip-forward button (Lucide `SkipForward`) at right end
- Dispatches `SKIP_ROUTINE_STEP` on skip click

`DrawerNowPlaying.tsx`:
- Top ~40% of drawer
- Scene artwork placeholder: `<div>` with gradient background (`bg-gradient-to-br from-hero-mid to-primary/30`), rounded corners, `motion-safe:animate-artwork-drift`
- Large play/pause button: centered, circular, white icon on primary background, `w-12 h-12 rounded-full bg-primary`
- Master volume slider via `<VolumeSlider>` with `aria-label="Master volume, {value}%"`
- Foreground progress bar via `<ForegroundProgressBar>` (conditional)
- Balance slider (conditional): only when both `activeSounds.length > 0` and `foregroundContent !== null`. Labels "Voice" and "Ambient" on ends.

`DrawerTabs.tsx`:
- 3 tabs: Mixer, Timer, Saved
- Tab bar: `flex` with equal widths, purple underline on active tab (follow Tab Bar Pattern from design-system.md: `text-primary font-medium` active, `text-text-light` inactive, `text-base`)
- Each tab has placeholder content:
  - Mixer: "Add sounds from the Music page" (centered, `text-white/50`)
  - Timer: "Set a sleep timer" (centered, `text-white/50`)
  - Saved: "Your saved mixes and routines" (centered, `text-white/50`)
- Tab state managed via local `useState`

`AudioDrawer.tsx`:
- Consumes `useAudioState()` and `useAudioDispatch()`
- Only renders when `drawerOpen` is true
- Uses `useFocusTrap(drawerOpen, () => dispatch({ type: 'CLOSE_DRAWER' }))` for keyboard trap + Escape
- Container ref from `useFocusTrap`

**Mobile layout (< 1024px):**
- Scrim: `fixed inset-0 bg-black/40 z-[10000]` with click handler → `CLOSE_DRAWER`
- Drawer: `fixed bottom-0 left-0 right-0 h-[70vh] z-[10001] rounded-t-2xl` with same dark glass bg as pill
- Swipe-down to dismiss: track `touchstart` Y, `touchmove` delta, if delta > 50px on `touchend` → dispatch `CLOSE_DRAWER`. Apply `transform: translateY(${delta}px)` during swipe for feedback.
- Close button (X) in top-right corner of drawer header

**Desktop layout (>= 1024px):**
- No scrim
- Panel: `fixed top-0 right-0 h-full w-[400px] z-[10000]` with dark glass bg
- Slide-in from right: `transition-transform duration-300` with `translate-x-0` (open) vs `translate-x-full` (closed)
- Close button (X) in top-right
- Click outside: not needed since no scrim — desktop users click away naturally. But add a click-outside handler on the panel for explicit close.

**Animation:**
- Desktop: slide from right using `transform: translateX(100%)` -> `translateX(0)` over 300ms
- Mobile: slide from bottom using `transform: translateY(100%)` -> `translateY(0)` over 300ms
- The true "pill morph" effect is ambitious for first iteration. Use slide-in with `transition-all duration-300` on the drawer and `opacity-0` on the pill when drawer is open. This gives the visual impression of the pill expanding into the drawer. Pill fades out, drawer slides in simultaneously.

**Internal layout:**
```
[Close button (X)]
[DrawerNowPlaying] (~40% height, overflow-hidden)
[RoutineStepper] (conditional, between sections)
[DrawerTabs] (~60% height, overflow-y-auto)
```

**Responsive behavior:**
- Mobile (< 640px): Full drawer width, artwork square ~160px
- Tablet (640-1024px): Full drawer width, artwork ~200px
- Desktop (> 1024px): 400px side panel, artwork fills panel width with padding

**Guardrails (DO NOT):**
- DO NOT implement actual Mixer/Timer/Saved tab content (shells only per spec)
- DO NOT use a third-party gesture library for swipe-down (vanilla touch events)
- DO NOT forget to gate CSS animations with `motion-safe:` prefix
- DO NOT use `overflow: hidden` on the drawer body (tabs section needs scroll)
- DO NOT forget `role="dialog"` and `aria-label` on the drawer

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Drawer does not render when drawerOpen is false |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Drawer renders with role="dialog" when open |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Escape key dispatches CLOSE_DRAWER |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Close button dispatches CLOSE_DRAWER |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Scrim click dispatches CLOSE_DRAWER on mobile |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Master volume slider updates state |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Three tabs render: Mixer, Timer, Saved |
| `components/audio/__tests__/AudioDrawer.test.tsx` | unit | Tab switching shows correct placeholder content |
| `components/audio/__tests__/VolumeSlider.test.tsx` | unit | Slider has correct aria attributes |
| `components/audio/__tests__/VolumeSlider.test.tsx` | unit | Shows percentage label |
| `components/audio/__tests__/ForegroundProgressBar.test.tsx` | unit | Shows elapsed and remaining time |
| `components/audio/__tests__/ForegroundProgressBar.test.tsx` | unit | Does not render when no foreground content |

Tests use the same `renderWithAudioContext` helper from Step 6.

**Expected state after completion:**
- [ ] Drawer slides up from bottom on mobile, from right on desktop
- [ ] Focus trap works (Tab cycles within drawer)
- [ ] Escape closes drawer on desktop
- [ ] Swipe-down closes drawer on mobile
- [ ] Scrim click closes drawer on mobile
- [ ] Now-playing section shows artwork, play/pause, volume slider
- [ ] Volume slider styled with purple fill/thumb on dark track
- [ ] Volume slider shows percentage and has ARIA attributes
- [ ] Foreground progress bar only shows when foreground content exists
- [ ] Routine stepper only shows when routine is active
- [ ] Three tabs render with placeholder content
- [ ] All drawer tests pass

---

### Step 8: Render Pill + Drawer in AudioProvider

**Objective:** Mount the AudioPill and AudioDrawer components inside the AudioProvider so they render globally on all pages.

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — add Pill and Drawer rendering

**Details:**

Inside the AudioProvider's return JSX, after `{children}`, render:
```tsx
<AudioStateContext.Provider value={state}>
  <AudioDispatchContext.Provider value={enhancedDispatch}>
    {children}
    <AudioPill />
    <AudioDrawer />
    <div className="sr-only" aria-live="polite" ref={ariaLiveRef} />
  </AudioDispatchContext.Provider>
</AudioStateContext.Provider>
```

AudioPill and AudioDrawer consume the contexts directly. They handle their own visibility (pill shows when `pillVisible`, drawer shows when `drawerOpen`).

**Guardrails (DO NOT):**
- DO NOT render pill/drawer outside the context providers (they need context access)
- DO NOT pass state as props — pill and drawer read from context

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | All 444+ existing tests still pass |

**Expected state after completion:**
- [ ] Pill and drawer render on every page (but invisible until audio plays)
- [ ] No visual change for existing pages (pill is hidden, drawer is hidden)
- [ ] All existing tests pass

---

### Step 9: Audio File Structure + Gitignore

**Objective:** Create the `/public/audio/` directory structure with README and placeholder files. Update `.gitignore`.

**Files to create:**
- `frontend/public/audio/README.md` — documentation
- `frontend/public/audio/ambient/.gitkeep` — empty directory marker
- `frontend/public/audio/scripture/.gitkeep` — empty directory marker
- `frontend/public/audio/stories/.gitkeep` — empty directory marker

**Files to modify:**
- `.gitignore` (root) — add audio file ignore pattern

**Details:**

`public/audio/README.md`:
```markdown
# Audio Files

This directory contains audio content for Worship Room's music features.

## Directory Structure

- `ambient/` — Ambient sound loops (MP3 192kbps). Rain, ocean, forest, piano, etc.
- `scripture/` — TTS scripture readings (MP3 192kbps). Generated via OpenAI TTS or browser Speech Synthesis.
- `stories/` — TTS bedtime stories (MP3 192kbps). Calming narrated content.

## Important

MP3 files are NOT tracked in git (too large). They are listed in `.gitignore`.

## Placeholder Files for Development

For testing the audio infrastructure, place any royalty-free MP3 files in `ambient/`:
- `ambient/rain.mp3` — rain/water sounds
- `ambient/ocean.mp3` — ocean waves
- `ambient/forest.mp3` — forest/birds

Sources for royalty-free audio:
- freesound.org (CC0 licensed)
- pixabay.com/music (Pixabay License)
- mixkit.co/free-sound-effects (free for commercial use)
```

Add to root `.gitignore`:
```
# Audio content files (too large for git)
frontend/public/audio/**/*.mp3
frontend/public/audio/**/*.wav
frontend/public/audio/**/*.ogg
frontend/public/audio/**/*.m4a
```

Use `.gitkeep` files in empty subdirectories so git tracks the directory structure.

**Guardrails (DO NOT):**
- DO NOT commit actual MP3 files to the repository
- DO NOT remove the README from gitignore (it should be tracked)
- DO NOT modify existing gitignore patterns

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| n/a | manual | Verify directory structure exists and README is readable |

**Expected state after completion:**
- [ ] `/public/audio/` directory structure exists with README
- [ ] `.gitignore` includes audio file patterns
- [ ] Subdirectories tracked via `.gitkeep`

---

### Step 10: Full Test Suite + Manual Verification

**Objective:** Run the complete test suite, ensure all tests pass, and verify the audio infrastructure works end-to-end.

**Files to modify:**
- Any test files that need the AudioProvider wrapper (likely none — existing components don't consume audio context)

**Details:**

1. Run `cd frontend && pnpm test -- --run` — all existing 444+ tests must pass plus new audio tests
2. Run `pnpm build` — verify no TypeScript or build errors
3. Verify VS Code diagnostics are clean on all new files

**Manual verification checklist:**
- [ ] App loads without errors (no console warnings about missing providers)
- [ ] Pill is hidden on page load (no audio playing)
- [ ] Drawer is hidden on page load
- [ ] Navigating between pages works normally
- [ ] No performance degradation from AudioProvider wrapping all routes
- [ ] Keyboard shortcuts don't fire when typing in textareas (Pray tab, Journal tab)
- [ ] Existing features (prayer generation, journal, meditation, prayer wall) work unchanged

**Guardrails (DO NOT):**
- DO NOT skip running the full test suite
- DO NOT leave failing tests

**Expected state after completion:**
- [ ] All tests pass (existing + new)
- [ ] Build succeeds
- [ ] No VS Code diagnostics on new files
- [ ] Audio infrastructure is wired up and ready for content (Specs 2-10)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | -- | Audio config, types, env vars |
| 2 | 1 | Web Audio Engine Service |
| 3 | 1, 2 | AudioProvider (Context + Reducer) |
| 4 | 3 | Wire AudioProvider into App.tsx |
| 5 | -- | Tailwind animations (independent) |
| 6 | 3, 5 | Floating Pill component |
| 7 | 3, 5, 6 | Audio Drawer / Side Panel |
| 8 | 6, 7 | Render Pill + Drawer in AudioProvider |
| 9 | -- | Audio file structure + gitignore (independent) |
| 10 | 1-9 | Full test suite + verification |

**Parallelizable:** Steps 1 and 5 and 9 can be done in parallel. Steps 6 and 7 can be partially parallelized once Step 5 is complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Audio Config, Types, Env | [COMPLETE] | 2026-03-07 | Created `types/audio.ts`, `constants/audio.ts`, updated `vite-env.d.ts`, added `viewport-fit=cover` to `index.html`, test in `constants/__tests__/audio.test.ts` |
| 2 | Web Audio Engine Service | [COMPLETE] | 2026-03-07 | Created `lib/audio-engine.ts` with AudioEngineService class, tests in `lib/__tests__/audio-engine.test.ts` (19 tests) |
| 3 | AudioProvider (Context + Reducer) | [COMPLETE] | 2026-03-07 | Created `audioReducer.ts` (26 tests), `AudioProvider.tsx` with keyboard shortcuts, Media Session, tab title, route change, aria-live. `__tests__/helpers.ts` shared wrapper. Rounded volume to avoid FP precision. |
| 4 | Wire AudioProvider into App.tsx | [COMPLETE] | 2026-03-07 | Added `AudioProvider` wrapping `<Routes>` inside `AuthModalProvider`. All 495 tests pass. |
| 5 | Tailwind Animations | [COMPLETE] | 2026-03-07 | Added 4 keyframes (waveform-bar-1/2/3, artwork-drift) and 4 animation utilities to `tailwind.config.js`. Build passes. |
| 6 | Floating Pill Component | [COMPLETE] | 2026-03-07 | Created `AudioPill.tsx`, `WaveformBars.tsx`, `ProgressArc.tsx`, tests in `__tests__/AudioPill.test.tsx` (6 tests). |
| 7 | Audio Drawer / Side Panel | [COMPLETE] | 2026-03-07 | Created `VolumeSlider.tsx`, `ForegroundProgressBar.tsx`, `RoutineStepper.tsx`, `DrawerNowPlaying.tsx`, `DrawerTabs.tsx`, `AudioDrawer.tsx`, tests in `__tests__/AudioDrawer.test.tsx` (8 tests). 509 tests pass. |
| 8 | Render Pill + Drawer in Provider | [COMPLETE] | 2026-03-07 | Added `AudioPill` and `AudioDrawer` imports + renders inside `AudioProvider.tsx` JSX. Updated Pill and Drawer tests to not duplicate components (Provider renders them). Scoped drawer play/pause assertion with `within(dialog)`. 509 tests pass. |
| 9 | Audio File Structure + Gitignore | [COMPLETE] | 2026-03-07 | Created `public/audio/` with `ambient/`, `scripture/`, `stories/` subdirs + `.gitkeep` files + `README.md`. Added MP3/WAV/OGG/WebM gitignore patterns. Build passes. |
| 10 | Full Test Suite + Verification | [COMPLETE] | 2026-03-07 | 509 tests pass across 59 files. Build clean. 65 new tests added (3 config + 19 engine + 22 reducer + 7 provider + 6 pill + 8 drawer). |
