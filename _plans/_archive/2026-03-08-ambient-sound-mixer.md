# Implementation Plan: Ambient Sound Mixer

**Spec:** `_specs/ambient-sound-mixer.md`
**Date:** 2026-03-08
**Branch:** `claude/feature/ambient-sound-mixer`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Existing Audio Infrastructure (Spec 1 — Complete)

The audio system is fully built and wired:

- **Provider pattern:** `AudioProvider` (`components/audio/AudioProvider.tsx`) wraps the app in `App.tsx`. Split contexts: `AudioStateContext` (read) + `AudioDispatchContext` (write). Hooks: `useAudioState()`, `useAudioDispatch()`.
- **Reducer:** `audioReducer` (`components/audio/audioReducer.ts`) handles 18 action types. Key ones for this spec: `ADD_SOUND`, `REMOVE_SOUND`, `SET_SOUND_VOLUME`.
- **Engine:** `AudioEngineService` (`lib/audio-engine.ts`) — singleton class. `addSound()` creates `<audio>` element with `loop=true`, connects to Web Audio graph (sourceNode → gainNode → masterGainNode → destination), fades in over 1s. `removeSound()` fades out over 1s then disconnects/cleans up. `setSoundVolume()` uses 20ms ramp.
- **State types:** `ActiveSound { soundId, volume, label }` in `types/audio.ts`. `ADD_SOUND` payload includes `url` (stripped by reducer before storing).
- **Constants:** `AUDIO_CONFIG` in `constants/audio.ts` — `MAX_SIMULTANEOUS_SOUNDS: 6`, `DEFAULT_SOUND_VOLUME: 0.6`, `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`, `VOLUME_RAMP_MS: 20`.
- **Audio base URL:** `AUDIO_BASE_URL` from `constants/audio.ts` — reads `VITE_AUDIO_BASE_URL` env var, defaults to `/audio/`.
- **Pill + Drawer:** `AudioPill` renders when `state.pillVisible === true`. `AudioDrawer` has `DrawerTabs` with 3 tabs (Mixer, Timer, Saved). **Mixer tab is placeholder text** — this spec replaces it.
- **VolumeSlider:** Reusable component at `components/audio/VolumeSlider.tsx`. Props: `value` (0-100), `onChange`, `label`, `ariaLabel`. Purple gradient fill via inline `background` style.
- **Test helpers:** `components/audio/__tests__/helpers.ts` exports `createTestState()`, `TestAudioStateContext`, `TestAudioDispatchContext`.

### Provider Wrapping Order (App.tsx)

```
QueryClientProvider > BrowserRouter > ToastProvider > AuthModalProvider > AudioProvider > Routes
```

All audio components have access to Toast and AuthModal contexts.

### Auth Pattern

- `useAuth()` from `hooks/useAuth.ts` — returns `{ user: null, isLoggedIn: false }` (Phase 2 stub).
- `useAuthModal()` from `components/prayer-wall/AuthModalProvider.tsx` — returns `{ openAuthModal(subtitle?, initialView?) }`.
- Pattern: check `isLoggedIn`, if false call `openAuthModal('Sign in to play ambient sounds')`.

### Toast Pattern

- `useToast()` from `components/ui/Toast.tsx` — returns `{ showToast(message, type) }`.
- Types: `'success' | 'error' | 'info'`.

### Tailwind Custom Animations

Existing keyframes/animations in `tailwind.config.js`: `glow-pulse`, `cursor-blink`, `dropdown-in`, `slide-from-right/left`, `golden-glow`, `breathe-expand/contract`, `fade-in`, `waveform-bar-*`, `artwork-drift`. The `sound-pulse` animation for active sound cards will be added.

### Test Patterns

- **Vitest + React Testing Library** with `@testing-library/react` and `@testing-library/user-event`.
- Audio tests use `createTestState()` and `TestAudioStateContext`/`TestAudioDispatchContext` from `components/audio/__tests__/helpers.ts`.
- Tests render components wrapped in necessary providers (Toast, AuthModal, Audio contexts).
- Test files at `components/audio/__tests__/` for audio components.
- Naming: `describe('ComponentName')` with nested `it('does thing')`.

### Directory Conventions

- **Types:** `src/types/` — e.g., `audio.ts`
- **Constants/data:** `src/constants/` — e.g., `audio.ts`, `crisis-resources.ts`
- **Components:** `src/components/audio/` for audio-related components
- **Hooks:** `src/hooks/` for shared hooks
- **Lib:** `src/lib/` for service classes and utilities

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap sound icon to add to mix | Auth modal: "Sign in to play ambient sounds" | Step 5 (useSoundToggle) | `useAuth().isLoggedIn` + `useAuthModal().openAuthModal()` |
| Tap sound icon to remove from mix | N/A (can't add when logged out) | Step 5 | Implicitly gated (no active sounds) |
| "+ Add Sound" button in mixer | Auth modal on click when logged out | Step 6 (MixerTabContent) | `useAuth().isLoggedIn` + `useAuthModal().openAuthModal()` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Sound card (inactive) background | background | `rgba(15, 10, 30, 0.3)` | Spec |
| Sound card (inactive) icon color | color | `rgba(255, 255, 255, 0.5)` | Spec |
| Sound card (active) glow | box-shadow | `0 0 12px rgba(147, 51, 234, 0.4)` | Spec |
| Sound card (active) icon color | color | `#FFFFFF` | Spec |
| Sound card (error) dot color | background | `#F39C12` (warning) | design-system.md |
| Sound card text | font | Inter 12px 400 white/70 | design-system.md (Small variant) |
| Category header | font | Inter 16px 500 white | design-system.md |
| Volume slider fill | color | `#6D28D9` (primary) | VolumeSlider.tsx line 22 |
| Volume slider unfilled | color | `#374151` | VolumeSlider.tsx line 22 |
| Mixer empty state text | color | `rgba(255, 255, 255, 0.5)` | DrawerTabs.tsx line 82 |
| Pulse animation | transform | scale(1.0) to scale(1.02), 3s, ease-in-out, infinite | Spec |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/ambient-sound-mixer` exists and is checked out
- [ ] All Spec 1 audio infrastructure is committed (commit `eaadfc4`)
- [ ] `pnpm test` passes on the current branch
- [ ] All auth-gated actions from the spec are accounted for in the plan (3 actions)
- [ ] Design system values are verified from recon report and codebase inspection
- [ ] Lucide React icons referenced in the catalog are valid exports (`CloudRain`, `CloudDrizzle`, `Waves`, `Bird`, `Wind`, `CloudLightning`, `Droplets`, `Flame`, `Bug`, `Coffee`, `Flower2`, `Tent`, `Bell`, `Music`, `Circle`, `Sparkles`, `Church`, `Guitar`, `Music2`, `Music3`, `Piano` — note: `Piano` may not exist in lucide-react, plan uses fallback)
- [ ] No audio MP3 files need to exist for the UI to work (lazy-loaded, error states handle missing files)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lucide icon mapping | Use a string→component map with fallback to `Music` icon | Some icons like `Piano` may not exist in lucide-react; fallback prevents runtime errors |
| Crossfade looping upgrade | Replace `audioElement.loop = true` with double-buffer crossfade in `AudioEngineService` | Spec requires seamless looping with no audible gap at loop boundaries |
| Audio buffer caching | Cache `AudioBuffer` (decoded) in a `Map<string, AudioBuffer>` on the engine | Spec requires cached audio reuse on re-toggle; `AudioBuffer` is the decoded data |
| Volume tooltip | CSS-only tooltip with `opacity` transition on `:active` / pointer events | Spec requires tooltip during drag, fade out 1s after release; CSS approach avoids JS timer complexity |
| Sound card size | Use Tailwind `w-20 h-20 sm:w-[90px] sm:h-[90px]` | Spec says ~80px mobile, ~90px tablet/desktop |
| Loading state per sound | Track in `useSoundToggle` hook via local `Map<string, 'loading' | 'error'>` state | Per-sound loading/error states are not in global AudioState (would over-complicate reducer) |
| Crossfade overlap window | 1.5 seconds | Spec specifies 1.5s overlap for double-buffer crossfade |
| Error retry | 3 retries with exponential backoff (1s, 2s, 4s) | Spec requirement |
| Audio format | MP3 192kbps | Spec requirement; universal browser support |

---

## Implementation Steps

### Step 1: Sound Catalog Data + Types

**Objective:** Create the 24-sound catalog data file with TypeScript interfaces and the sound-to-icon mapping.

**Files to create/modify:**
- `frontend/src/types/music.ts` — new file, `Sound` interface and category type
- `frontend/src/data/sound-catalog.ts` — new file, all 24 sounds organized by category
- `frontend/src/components/audio/sound-icon-map.ts` — new file, maps icon string names to Lucide components

**Details:**

**`types/music.ts`:**
```typescript
export type SoundCategory = 'nature' | 'environments' | 'spiritual' | 'instruments'
export type SoundMood = 'peaceful' | 'uplifting' | 'contemplative' | 'restful'
export type SoundActivity = 'prayer' | 'sleep' | 'study' | 'relaxation'
export type SoundIntensity = 'very_calm' | 'moderate' | 'immersive'

export interface Sound {
  id: string
  name: string
  category: SoundCategory
  lucideIcon: string
  filename: string
  loopDurationMs: number
  tags: {
    mood: SoundMood[]
    activity: SoundActivity[]
    intensity: SoundIntensity
  }
}

export interface SoundCategoryGroup {
  category: SoundCategory
  label: string
  sounds: Sound[]
}
```

**`data/sound-catalog.ts`:** Export `SOUND_CATALOG: Sound[]` (flat array of 24 sounds) and `SOUND_CATEGORIES: SoundCategoryGroup[]` (grouped for rendering). Each sound has:
- `id`: kebab-case, e.g., `'gentle-rain'`, `'church-bells'`
- `name`: display name, e.g., `'Gentle Rain'`
- `category`: one of 4 categories
- `lucideIcon`: string key matching `sound-icon-map.ts`, e.g., `'CloudRain'`
- `filename`: e.g., `'rain-gentle.mp3'`
- `loopDurationMs`: in milliseconds (e.g., 4 min = 240000)
- `tags`: mood, activity, intensity per spec tables

All 24 sounds from the spec:
- Nature (7): Gentle Rain, Heavy Rain, Ocean Waves, Forest Birds, Gentle Wind, Thunder (Distant), Flowing Stream
- Environments (6): Fireplace, Night Crickets, Café Ambience, Night Garden, Rainy Window, Campfire
- Spiritual (5): Church Bells (Distant), Choir Hum, Singing Bowl, Wind Chimes, Cathedral Reverb
- Instruments (6): Soft Piano, Acoustic Guitar, Gentle Harp, Ambient Pads, Cello (Slow), Flute (Meditative)

**`components/audio/sound-icon-map.ts`:** A `Record<string, LucideIcon>` mapping from icon string names to actual Lucide React components. Import each icon individually. For icons that may not exist in lucide-react (like `Piano`), use `Music` as fallback. Export a `getSoundIcon(iconName: string): LucideIcon` function.

Verify which icons exist in lucide-react at implementation time. Known safe icons: `CloudRain`, `CloudDrizzle`, `Waves`, `Bird`, `Wind`, `CloudLightning`, `Droplets`, `Flame`, `Bug`, `Coffee`, `Flower2`, `Tent`, `Bell`, `Music`, `Circle`, `Sparkles`, `Church`, `Guitar`, `Music2`, `Music3`. Check for `Piano` — if missing, use `Music` for Soft Piano.

**Guardrails (DO NOT):**
- DO NOT add any UI components in this step
- DO NOT create audio files — only the data catalog
- DO NOT add runtime behavior — this is pure data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `sound-catalog.test.ts` | unit | Verify SOUND_CATALOG has exactly 24 sounds |
| `sound-catalog.test.ts` | unit | Verify each sound has all required fields (id, name, category, lucideIcon, filename, loopDurationMs, tags) |
| `sound-catalog.test.ts` | unit | Verify category counts: Nature 7, Environments 6, Spiritual 5, Instruments 6 |
| `sound-catalog.test.ts` | unit | Verify SOUND_CATEGORIES has exactly 4 groups in order: nature, environments, spiritual, instruments |
| `sound-catalog.test.ts` | unit | Verify all sound IDs are unique |
| `sound-catalog.test.ts` | unit | Verify all filenames end in .mp3 |
| `sound-icon-map.test.ts` | unit | Verify getSoundIcon returns a component for every icon name in SOUND_CATALOG |
| `sound-icon-map.test.ts` | unit | Verify getSoundIcon returns fallback Music icon for unknown names |

**Expected state after completion:**
- [ ] `pnpm build` succeeds (no type errors)
- [ ] All new tests pass
- [ ] Existing tests still pass

---

### Step 2: SoundCard Component

**Objective:** Build the individual sound card with 4 visual states: inactive, active, loading, error. Includes `prefers-reduced-motion` support.

**Files to create/modify:**
- `frontend/src/components/audio/SoundCard.tsx` — new component
- `frontend/tailwind.config.js` — add `sound-pulse` keyframe/animation

**Details:**

**Tailwind animation addition** in `tailwind.config.js`:
```javascript
// In keyframes:
'sound-pulse': {
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.02)' },
},
// In animation:
'sound-pulse': 'sound-pulse 3s ease-in-out infinite',
```

**`SoundCard.tsx` props:**
```typescript
interface SoundCardProps {
  sound: Sound
  isActive: boolean
  isLoading: boolean
  hasError: boolean
  onToggle: (sound: Sound) => void
}
```

**Rendering:**
- Outer `<button>` element with `role="button"`, `aria-pressed={isActive}`, `aria-busy={isLoading}`
- `aria-label`: inactive → `"{name} — tap to add to mix"`, active → `"{name} — playing, tap to remove"`, loading → `"Loading {name}"`, error → `"Couldn't load {name} — tap to retry"`
- Size: `w-20 h-20 sm:w-[90px] sm:h-[90px]` (80px mobile, 90px tablet/desktop)
- Card background: `bg-[rgba(15,10,30,0.3)]`
- Border radius: `rounded-xl` (12px)
- Flex column, centered icon + name
- Icon: `getSoundIcon(sound.lucideIcon)` rendered at `size={24}`, `className="text-white/50"` (inactive) or `"text-white"` (active)
- Name: `<span className="mt-1 text-[10px] leading-tight text-white/70 text-center line-clamp-2">{sound.name}</span>`

**States (conditional classes via `cn()`):**
- **Inactive:** base styles above
- **Active:** `shadow-[0_0_12px_rgba(147,51,234,0.4)]` + `animate-sound-pulse` (glow + pulse). `motion-safe:animate-sound-pulse` to respect `prefers-reduced-motion` — glow stays (it's box-shadow, not animation), pulse disabled.
- **Loading:** Spinner overlay — `<Loader2 className="animate-spin text-white/70" size={20} />` centered over the icon. Import `Loader2` from lucide-react.
- **Error:** Small orange dot `<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warning" />`. The dot renders only when `hasError && !isLoading`.

**Focus styles:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(15,10,30,0.3)]`

**Click handler:** Calls `onToggle(sound)` — the parent (SoundGrid + useSoundToggle) handles auth gating, loading, and dispatch.

**Guardrails (DO NOT):**
- DO NOT put any audio logic in SoundCard — it's a pure presentational component
- DO NOT manage loading/error state here — receive via props
- DO NOT use `animate-sound-pulse` without the `motion-safe:` prefix
- DO NOT use inline styles except where Tailwind arbitrary values are insufficient

**Responsive behavior:**
- Mobile (< 640px): `w-20 h-20` (80px)
- Tablet/Desktop (>= 640px): `w-[90px] h-[90px]` (90px)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SoundCard.test.tsx` | unit | Renders sound name and icon in inactive state |
| `SoundCard.test.tsx` | unit | Shows aria-pressed="false" when inactive, "true" when active |
| `SoundCard.test.tsx` | unit | Shows loading spinner when isLoading=true |
| `SoundCard.test.tsx` | unit | Shows orange error dot when hasError=true and not loading |
| `SoundCard.test.tsx` | unit | Calls onToggle with sound when clicked |
| `SoundCard.test.tsx` | unit | Has correct aria-label for each state (inactive, active, loading, error) |
| `SoundCard.test.tsx` | unit | Has aria-busy="true" when loading |
| `SoundCard.test.tsx` | unit | Active state applies sound-pulse animation class with motion-safe prefix |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All new tests pass
- [ ] Existing tests still pass

---

### Step 3: SoundGrid Component

**Objective:** Build the category-organized icon grid that displays all 24 sounds with responsive column layout.

**Files to create/modify:**
- `frontend/src/components/audio/SoundGrid.tsx` — new component

**Details:**

**`SoundGrid.tsx` props:**
```typescript
interface SoundGridProps {
  activeSoundIds: Set<string>
  loadingSoundIds: Set<string>
  errorSoundIds: Set<string>
  onToggle: (sound: Sound) => void
}
```

**Rendering:**
- Import `SOUND_CATEGORIES` from `data/sound-catalog.ts`
- Iterate over `SOUND_CATEGORIES`, rendering each as a section:
  - `<section>` with `aria-labelledby={category-id}`
  - `<h3 id={category-id} className="mb-3 text-base font-medium text-white">{group.label}</h3>`
  - Grid container: `<div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">`
  - Each sound → `<SoundCard>` with:
    - `isActive={activeSoundIds.has(sound.id)}`
    - `isLoading={loadingSoundIds.has(sound.id)}`
    - `hasError={errorSoundIds.has(sound.id)}`
    - `onToggle={onToggle}`
- Spacing between category sections: `space-y-8`

**Category labels:** "Nature", "Environments", "Spiritual", "Instruments" (from `SoundCategoryGroup.label`).

**Responsive behavior:**
- Mobile (< 640px): 3 columns (`grid-cols-3`)
- Tablet (640-1024px): 4 columns (`sm:grid-cols-4`)
- Desktop (> 1024px): 6 columns (`lg:grid-cols-6`)

**Guardrails (DO NOT):**
- DO NOT put any audio logic or auth logic in SoundGrid — pure presentational
- DO NOT make API calls or dispatch audio actions from this component
- DO NOT add scroll behavior or navigation — that's the page's job

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SoundGrid.test.tsx` | unit | Renders all 4 category headers: Nature, Environments, Spiritual, Instruments |
| `SoundGrid.test.tsx` | unit | Renders 24 sound cards total |
| `SoundGrid.test.tsx` | unit | Passes isActive=true for sounds in activeSoundIds set |
| `SoundGrid.test.tsx` | unit | Passes isLoading=true for sounds in loadingSoundIds set |
| `SoundGrid.test.tsx` | unit | Passes hasError=true for sounds in errorSoundIds set |
| `SoundGrid.test.tsx` | unit | Each category section has aria-labelledby linking to its header |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All new tests pass
- [ ] Existing tests still pass

---

### Step 4: Crossfade Looping Engine Upgrade + Audio Caching

**Objective:** Upgrade `AudioEngineService` to use double-buffer crossfade looping (instead of `audioElement.loop = true`) and add `AudioBuffer` caching with retry logic for failed loads.

**Files to create/modify:**
- `frontend/src/lib/audio-engine.ts` — modify existing
- `frontend/src/constants/audio.ts` — add new constants

**Details:**

**New constants in `constants/audio.ts`:**
```typescript
CROSSFADE_OVERLAP_MS: 1500,       // 1.5s overlap window for seamless looping
LOAD_RETRY_MAX: 3,                // max retry attempts
LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000],  // exponential backoff
```

**AudioEngineService changes:**

1. **Add `AudioBuffer` cache:** `private bufferCache = new Map<string, AudioBuffer>()` — stores decoded audio data keyed by sound ID. Once cached, never re-fetched.

2. **Replace `addSound()` with async version:**
```typescript
async addSound(soundId: string, url: string, volume: number): Promise<void>
```
- Check `bufferCache` first. If hit, skip fetch/decode.
- If miss: fetch URL → `response.arrayBuffer()` → `audioContext.decodeAudioData()` → store in `bufferCache`.
- Create `AudioBufferSourceNode` (not `<audio>` element) from the cached buffer.
- Connect: sourceNode → gainNode → masterGainNode.
- Fade in: `gain.setValueAtTime(0, now)` → `gain.linearRampToValueAtTime(volume, now + 1)`.
- Start playback: `sourceNode.start(0)`.
- Schedule crossfade loop (see below).
- Store entry in `soundSources` Map (replace `SoundEntry` to use `AudioBufferSourceNode` + `GainNode` + scheduling timer ID).

3. **Double-buffer crossfade loop:**
- After starting a source, calculate when it ends: `startTime + buffer.duration`.
- Schedule a timeout at `(buffer.duration - CROSSFADE_OVERLAP_MS/1000) * 1000` ms to:
  - Create a new `AudioBufferSourceNode` from the same cached buffer.
  - New gain starts at 0, ramps to target volume over 1.5s.
  - Old source gain ramps to 0 over 1.5s.
  - New source starts at `oldEndTime - CROSSFADE_OVERLAP_MS/1000`.
  - Old source: after overlap, `stop()` and `disconnect()`.
  - Update the stored entry to reference the new source.
  - Schedule the next crossfade loop.
- Use `setTimeout` for scheduling (AudioContext `currentTime` for precise audio timing of the ramps themselves).

4. **Update `SoundEntry` interface:**
```typescript
interface SoundEntry {
  sourceNode: AudioBufferSourceNode
  gainNode: GainNode
  loopTimerId: ReturnType<typeof setTimeout> | null
  volume: number  // current target volume, needed for crossfade loops
}
```

5. **Update `removeSound()`:**
- Cancel the loop timer (`clearTimeout`).
- Fade out gain over 1s.
- After fade: `sourceNode.stop()`, disconnect nodes, remove from Map.
- Do NOT remove from `bufferCache` (reuse on re-add).

6. **Update `setSoundVolume()`:**
- Update `entry.volume` (stored for crossfade loops to know target volume).
- Ramp gain as before.

7. **Update `stopAll()`:**
- Iterate all entries, clear loop timers, stop sources, disconnect.
- Clear `soundSources` Map. Do NOT clear `bufferCache`.

8. **Update `pauseAll()` / `resumeAll()`:**
- `pauseAll()`: Suspend the AudioContext (`audioContext.suspend()`). This pauses all sources.
- `resumeAll()`: Resume the AudioContext (`audioContext.resume()`). Loop timers continue from where they left off since we use AudioContext time for scheduling.

**Important:** When the AudioContext is suspended, `setTimeout` timers may still fire but `audioContext.currentTime` stops advancing. The crossfade scheduling should use `audioContext.currentTime` for audio timing and `setTimeout` for triggering — this naturally handles pause/resume since the audio time references remain valid.

**Guardrails (DO NOT):**
- DO NOT use `<audio>` elements — switch entirely to `AudioBufferSourceNode` + `decodeAudioData()` for ambient sounds
- DO NOT remove the foreground playback code (`playForeground` etc.) — that still uses `<audio>` elements for streaming content
- DO NOT clear `bufferCache` on stop — buffers are cached for the session
- DO NOT use `setInterval` for crossfade scheduling — use `setTimeout` with recursive scheduling
- DO NOT break existing tests — the `AudioEngineService` API changes (sync → async `addSound`), so `AudioProvider.tsx` must be updated to handle the async call

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `audio-engine.test.ts` | unit | `addSound()` fetches and decodes audio when buffer not cached |
| `audio-engine.test.ts` | unit | `addSound()` reuses cached buffer on second call with same soundId (after remove + re-add) |
| `audio-engine.test.ts` | unit | `addSound()` creates AudioBufferSourceNode connected to gain and master |
| `audio-engine.test.ts` | unit | `addSound()` starts source with gain ramp from 0 to volume over 1s |
| `audio-engine.test.ts` | unit | `removeSound()` clears loop timer and fades out gain over 1s |
| `audio-engine.test.ts` | unit | `removeSound()` does not clear buffer cache |
| `audio-engine.test.ts` | unit | `setSoundVolume()` updates stored volume and ramps gain |
| `audio-engine.test.ts` | unit | `stopAll()` clears all loop timers and disconnects all sources |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All new audio engine tests pass
- [ ] Existing `audioReducer.test.ts` tests still pass (reducer is unchanged)

---

### Step 5: useSoundToggle Hook

**Objective:** Create the hook that orchestrates sound toggling — auth gating, loading/error state management, retry logic, toast messages, and dispatching to the audio reducer.

**Files to create/modify:**
- `frontend/src/hooks/useSoundToggle.ts` — new hook

**Details:**

**Hook signature:**
```typescript
interface UseSoundToggleReturn {
  loadingSoundIds: Set<string>
  errorSoundIds: Set<string>
  toggleSound: (sound: Sound) => void
}

export function useSoundToggle(): UseSoundToggleReturn
```

**Internal state:**
- `loadingSoundIds: Set<string>` — tracked via `useState` (using a `Map<string, 'loading' | 'error'>` internally, derived into Sets for the return value)
- `errorSoundIds: Set<string>` — derived from the same Map

**`toggleSound(sound)` logic:**

1. **Auth gate:** Check `useAuth().isLoggedIn`. If false, call `useAuthModal().openAuthModal('Sign in to play ambient sounds')` and return.

2. **If sound is active** (in `useAudioState().activeSounds`): Dispatch `REMOVE_SOUND`. Return.

3. **If sound has error:** Clear error state, proceed to load (fresh retry).

4. **If at 6-sound limit:** Call `useToast().showToast("Your mix has 6 sounds — remove one to add another.", 'info')`. Return.

5. **Load sound:**
   - Set state to 'loading' for this soundId.
   - Build URL: `AUDIO_BASE_URL + sound.filename`.
   - Call `dispatch({ type: 'ADD_SOUND', payload: { soundId: sound.id, volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME, label: sound.name, url } })`.
   - The `AudioProvider.enhancedDispatch` calls `engine.addSound()` which is now async. **Important:** The dispatch itself is synchronous (reducer updates immediately), but the engine's async fetch/decode happens in the background. We need to handle this.

**Revised approach — async load with engine:**

Since `AudioEngineService.addSound()` is now async, the `enhancedDispatch` in `AudioProvider.tsx` needs updating:
- For `ADD_SOUND`: call `engine.addSound()` which returns a Promise. The reducer still updates synchronously (optimistic). If the engine's async load fails, dispatch `REMOVE_SOUND` to roll back.

The `useSoundToggle` hook will:
1. Dispatch `ADD_SOUND` to the reducer (optimistic — card shows active immediately).
2. The engine's `addSound()` attempts fetch + decode with retry.
3. **On success:** Sound starts playing. Loading state cleared.
4. **On failure (after retries):** Dispatch `REMOVE_SOUND` to remove from reducer. Set error state. Show toast: `"Couldn't load {name} — tap to retry"`.

**Implementation detail:** Add a callback mechanism to `AudioProvider.enhancedDispatch` or expose the engine's load result. Simplest approach: `useSoundToggle` calls `engine.addSound()` directly via a ref exposed from `AudioProvider`, separate from dispatch.

**Better approach:** Add an `AudioEngineContext` that exposes the engine instance, so `useSoundToggle` can call `engine.addSound()` directly and handle the Promise. The reducer dispatch happens separately.

**Simplest approach (chosen):** Modify `AudioProvider` to:
1. Export `useAudioEngine()` hook that returns the engine ref.
2. `useSoundToggle` calls `engine.addSound(soundId, url, volume)` directly (async), then dispatches `ADD_SOUND` on success or handles error on failure.

This avoids the optimistic update + rollback pattern and keeps the flow simple:
1. Set loading state
2. Call `await engine.addSound(soundId, url, volume)` — this fetches, decodes, caches, starts playback
3. On success: dispatch `ADD_SOUND` to reducer, clear loading state
4. On failure: set error state, show toast

**Retry logic (in the hook, not the engine):**
```typescript
async function loadWithRetry(sound: Sound, url: string): Promise<void> {
  const delays = AUDIO_CONFIG.LOAD_RETRY_DELAYS_MS
  for (let attempt = 0; attempt <= AUDIO_CONFIG.LOAD_RETRY_MAX; attempt++) {
    try {
      await engine.addSound(sound.id, url, AUDIO_CONFIG.DEFAULT_SOUND_VOLUME)
      return // success
    } catch {
      if (attempt < AUDIO_CONFIG.LOAD_RETRY_MAX) {
        await new Promise(r => setTimeout(r, delays[attempt]))
      }
    }
  }
  throw new Error(`Failed to load ${sound.name}`)
}
```

**Auth gating (lines called out):**
- Import `useAuth` from `@/hooks/useAuth`
- Import `useAuthModal` from `@/components/prayer-wall/AuthModalProvider`
- At top of `toggleSound`: `if (!isLoggedIn) { authModal?.openAuthModal('Sign in to play ambient sounds'); return }`

**Guardrails (DO NOT):**
- DO NOT dispatch ADD_SOUND before the engine confirms success — no optimistic updates for audio
- DO NOT show loading spinner for sounds already cached (engine.addSound resolves instantly for cached buffers)
- DO NOT retry indefinitely — max 3 attempts with backoff
- DO NOT block the UI during retry — use async/await with state updates

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useSoundToggle.test.ts` | unit | Returns empty Sets initially |
| `useSoundToggle.test.ts` | unit | Calls openAuthModal when user is not logged in |
| `useSoundToggle.test.ts` | unit | Does not dispatch ADD_SOUND when user is not logged in |
| `useSoundToggle.test.ts` | unit | Dispatches REMOVE_SOUND when toggling an active sound |
| `useSoundToggle.test.ts` | unit | Shows toast when mix is at 6-sound limit |
| `useSoundToggle.test.ts` | unit | Sets loading state during sound load |
| `useSoundToggle.test.ts` | unit | Dispatches ADD_SOUND on successful load |
| `useSoundToggle.test.ts` | unit | Sets error state and shows toast on load failure after retries |
| `useSoundToggle.test.ts` | unit | Clears error state when retrying an error sound |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All new tests pass
- [ ] Existing tests still pass

---

### Step 6: MixerTabContent Component — Replace Drawer Placeholder

**Objective:** Replace the Mixer tab placeholder in `DrawerTabs.tsx` with real content: active sounds list with per-sound volume sliders, "+ Add Sound" button, and empty state.

**Files to create/modify:**
- `frontend/src/components/audio/MixerTabContent.tsx` — new component
- `frontend/src/components/audio/MixerSoundRow.tsx` — new component (single row: icon + name + slider)
- `frontend/src/components/audio/DrawerTabs.tsx` — modify to render `<MixerTabContent>` instead of placeholder

**Details:**

**`MixerSoundRow.tsx` props:**
```typescript
interface MixerSoundRowProps {
  sound: ActiveSound   // { soundId, volume, label }
  iconName: string     // lucideIcon string for getSoundIcon()
  onVolumeChange: (soundId: string, volume: number) => void
  onRemove: (soundId: string) => void
}
```

**Rendering for each row:**
- Horizontal layout: icon (16px, `getSoundIcon`) + name + VolumeSlider + remove button (X icon)
- Icon: `getSoundIcon(iconName)` at `size={16}` with `className="text-white/70 shrink-0"`
- Name: `<span className="text-sm text-white/90 truncate min-w-0">{sound.label}</span>`
- Volume slider: Reuse existing `<VolumeSlider>` component. Pass `value={Math.round(sound.volume * 100)}`, `onChange={(v) => onVolumeChange(sound.soundId, v / 100)}`, `label=""` (empty, icon serves as label), `ariaLabel={`${sound.label} volume, ${Math.round(sound.volume * 100)}%`}`.
- Remove button: `<button aria-label={`Remove ${sound.label}`} onClick={() => onRemove(sound.soundId)}>` with `X` icon from lucide-react, size 14, `text-white/40 hover:text-white/70`.

**Volume tooltip enhancement:** The existing `VolumeSlider` already shows the percentage text. The spec asks for a tooltip that appears on drag and fades out after release. Add this as a CSS enhancement to the existing slider — use a `data-dragging` attribute + CSS transition for opacity. This is a polish item; the percentage display is already functional via the `VolumeSlider` component.

**`MixerTabContent.tsx`:**
```typescript
export function MixerTabContent()
```
- Uses `useAudioState()` to get `activeSounds`.
- Uses `useAudioDispatch()` to dispatch `SET_SOUND_VOLUME` and `REMOVE_SOUND`.
- Uses `useAuth()` + `useAuthModal()` for "+ Add Sound" auth gating.
- Looks up icon names from `SOUND_CATALOG` by soundId (build a `Map<string, Sound>` lookup).

**Empty state** (when `activeSounds.length === 0`):
```html
<div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
  <MousePointerClick className="text-white/30" size={32} />
  <p className="text-sm text-white/50">Tap a sound on the Ambient Sounds page to start your mix</p>
</div>
```
Import `MousePointerClick` from lucide-react (or `Pointer` — whichever exists).

**Active state:** Vertical list of `<MixerSoundRow>` components. Below the list, the "+ Add Sound" button:
```html
<button
  className="mt-4 flex items-center gap-2 text-sm text-primary-lt hover:text-white transition-colors"
  onClick={handleAddSoundClick}
>
  <Plus size={16} /> Add Sound
</button>
```
- `handleAddSoundClick`: If not logged in → auth modal. If logged in → `window.location.href = '/music/ambient'` (or use router navigation when the page exists). For now, just navigate since the ambient page is still a stub.

**`DrawerTabs.tsx` modification:**
- Import `MixerTabContent`
- Replace the Mixer tab panel placeholder `<p>` with `<MixerTabContent />` when `activeTab === 'Mixer'`
- Keep Timer and Saved tab placeholders as-is

**Volume change handler:**
```typescript
function handleVolumeChange(soundId: string, volume: number) {
  dispatch({ type: 'SET_SOUND_VOLUME', payload: { soundId, volume } })
}
```

**Remove handler:**
```typescript
function handleRemove(soundId: string) {
  dispatch({ type: 'REMOVE_SOUND', payload: { soundId } })
}
```

**Auth gating:**
- "+ Add Sound" button: If not logged in, `openAuthModal('Sign in to play ambient sounds')`. If logged in, navigate to ambient sounds page.

**Guardrails (DO NOT):**
- DO NOT change the DrawerTabs tab structure or ARIA pattern — only replace the Mixer panel content
- DO NOT duplicate VolumeSlider — reuse the existing component
- DO NOT add audio engine calls from MixerTabContent — dispatch actions only (AudioProvider handles engine sync)

**Responsive behavior:**
- Mobile: Full-width sliders in drawer (bottom sheet)
- Desktop: Sliders in side panel alongside page content (drawer handles this)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `MixerTabContent.test.tsx` | unit | Shows empty state message when no active sounds |
| `MixerTabContent.test.tsx` | unit | Renders a row for each active sound with icon, name, and slider |
| `MixerTabContent.test.tsx` | unit | Volume slider dispatches SET_SOUND_VOLUME on change |
| `MixerTabContent.test.tsx` | unit | Remove button dispatches REMOVE_SOUND |
| `MixerTabContent.test.tsx` | unit | "+ Add Sound" button is visible when sounds are active |
| `MixerTabContent.test.tsx` | unit | "+ Add Sound" button triggers auth modal when logged out |
| `MixerSoundRow.test.tsx` | unit | Renders icon, name, slider, and remove button |
| `MixerSoundRow.test.tsx` | unit | Calls onVolumeChange with correct soundId and normalized volume |
| `MixerSoundRow.test.tsx` | unit | Calls onRemove with soundId when remove button clicked |
| `DrawerTabs.test.tsx` | integration | Mixer tab renders MixerTabContent instead of placeholder text |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All new tests pass
- [ ] Existing DrawerTabs tests still pass (update if needed for new Mixer content)
- [ ] Drawer visually shows real mixer content (not placeholder text)

---

### Step 7: AudioProvider Updates — Expose Engine + Async ADD_SOUND

**Objective:** Update `AudioProvider` to expose the engine instance via context and handle the async `addSound` flow.

**Files to create/modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — modify existing
- `frontend/src/components/audio/__tests__/helpers.ts` — update test helpers

**Details:**

**New context:** Add `AudioEngineContext` that exposes the engine ref:
```typescript
const AudioEngineContext = createContext<AudioEngineService | null>(null)

export function useAudioEngine(): AudioEngineService | null {
  return useContext(AudioEngineContext)
}
```

Wrap children with `<AudioEngineContext.Provider value={engineRef.current}>` (after lazy init).

**Update `enhancedDispatch` for ADD_SOUND:**
The current flow is: dispatch ADD_SOUND → engine.addSound() (sync). With the async engine, we need to change the flow:

**New flow:**
- For `ADD_SOUND`: Do NOT call `engine.addSound()` from `enhancedDispatch`. The `useSoundToggle` hook handles the async load and dispatches `ADD_SOUND` only after success.
- Remove the `case 'ADD_SOUND'` from `enhancedDispatch` switch — the hook handles it.
- Keep `REMOVE_SOUND`, `SET_SOUND_VOLUME`, etc. in `enhancedDispatch` as they remain synchronous engine calls.

**Update test helpers:**
- Add `TestAudioEngineContext` to helpers.
- Update `createTestState` if needed (no changes expected).

**Guardrails (DO NOT):**
- DO NOT remove existing `enhancedDispatch` cases for REMOVE_SOUND, SET_SOUND_VOLUME, etc.
- DO NOT break the existing keyboard shortcuts or Media Session API integration
- DO NOT change the context split pattern (AudioStateContext + AudioDispatchContext)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AudioProvider.test.tsx` | unit | useAudioEngine returns the engine instance |
| `AudioProvider.test.tsx` | unit | ADD_SOUND dispatch updates state without calling engine.addSound (hook handles it) |
| `AudioProvider.test.tsx` | unit | REMOVE_SOUND dispatch still calls engine.removeSound |
| `AudioProvider.test.tsx` | unit | SET_SOUND_VOLUME dispatch still calls engine.setSoundVolume |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All existing AudioProvider tests pass (updated as needed)
- [ ] All new tests pass
- [ ] `useSoundToggle` can access engine via `useAudioEngine()`

---

### Step 8: Integration Wiring + Component Exports

**Objective:** Wire all components together: update the components index, verify the full toggle flow works end-to-end, and ensure the reducer correctly manages pill visibility when sounds are added/removed.

**Files to create/modify:**
- `frontend/src/components/index.ts` — add exports for new components (if this pattern is used)
- `frontend/src/components/audio/audioReducer.ts` — verify REMOVE_SOUND handles `pillVisible` correctly

**Details:**

**Reducer fix — REMOVE_SOUND pillVisible:**
The current `REMOVE_SOUND` handler does NOT set `pillVisible = false` when the last sound is removed. Check the logic:
```typescript
case 'REMOVE_SOUND': {
  const filtered = state.activeSounds.filter(
    (s) => s.soundId !== action.payload.soundId,
  )
  return {
    ...state,
    activeSounds: filtered,
  }
}
```

This needs to be updated to:
```typescript
case 'REMOVE_SOUND': {
  const filtered = state.activeSounds.filter(
    (s) => s.soundId !== action.payload.soundId,
  )
  const hasContent = filtered.length > 0 || state.foregroundContent !== null
  return {
    ...state,
    activeSounds: filtered,
    pillVisible: hasContent ? state.pillVisible : false,
    isPlaying: hasContent ? state.isPlaying : false,
  }
}
```

This ensures:
- Last sound removed + no foreground content → pill fades out
- Last sound removed but foreground content still playing → pill stays
- Sounds remain → no change to pill/playing state

**Verify the full flow:**
1. User taps sound icon → `useSoundToggle.toggleSound()` → auth check → engine.addSound() → dispatch ADD_SOUND → pill appears → mixer shows row
2. User taps active icon → dispatch REMOVE_SOUND → engine.removeSound() → row removed → if last sound, pill fades out
3. User adjusts slider → dispatch SET_SOUND_VOLUME → engine.setSoundVolume()

**Guardrails (DO NOT):**
- DO NOT change the ADD_SOUND reducer case — it already correctly sets `pillVisible: true` and `isPlaying: true`
- DO NOT introduce circular dependencies between components

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `audioReducer.test.ts` | unit | REMOVE_SOUND sets pillVisible=false when removing the last sound and no foreground content |
| `audioReducer.test.ts` | unit | REMOVE_SOUND keeps pillVisible=true when foreground content is active |
| `audioReducer.test.ts` | unit | REMOVE_SOUND keeps isPlaying=true when other sounds remain |

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] All tests pass (including updated reducer tests)
- [ ] Full toggle flow is wired: SoundGrid → useSoundToggle → engine + dispatch → MixerTabContent

---

### Step 9: Full Test Suite Verification

**Objective:** Run the complete test suite and verify all tests pass. Fix any regressions.

**Files to create/modify:**
- None (verification only, fix files if needed)

**Details:**

Run:
```bash
cd frontend && pnpm test -- --run
```

Verify:
- All existing tests pass (no regressions from engine changes, reducer updates, provider changes)
- All new tests pass (catalog, SoundCard, SoundGrid, MixerTabContent, MixerSoundRow, useSoundToggle, audio-engine, AudioProvider, reducer additions)
- No TypeScript compilation errors

**If tests fail:** Fix the failing tests. Common issues:
- Audio engine mocks need updating (sync → async `addSound`)
- Provider test wrappers may need `AudioEngineContext`
- Reducer test for REMOVE_SOUND may need updating for new pillVisible logic

**Expected state after completion:**
- [ ] All tests pass (0 failures)
- [ ] `pnpm build` succeeds with no errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Sound catalog data + types + icon map |
| 2 | 1 | SoundCard component (uses Sound type + icon map) |
| 3 | 1, 2 | SoundGrid component (uses SoundCard + catalog data) |
| 4 | — | AudioEngine crossfade upgrade + caching (independent of UI) |
| 5 | 1, 4, 7 | useSoundToggle hook (needs catalog, async engine, engine context) |
| 6 | 1, 5 | MixerTabContent (needs catalog for icon lookup, dispatch for volume/remove) |
| 7 | 4 | AudioProvider updates (expose engine context, update dispatch) |
| 8 | 5, 6, 7 | Integration wiring + reducer fix |
| 9 | 1-8 | Full test suite verification |

**Parallelizable:** Steps 1 and 4 can be done in parallel (no dependencies). Steps 2 and 7 can be done in parallel (2 depends on 1, 7 depends on 4).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Sound Catalog Data + Types | [COMPLETE] | 2026-03-08 | Created `types/music.ts`, `data/sound-catalog.ts`, `components/audio/sound-icon-map.ts`. All 21 Lucide icons exist including Piano. Tests: icon map uses `.toHaveProperty('render')` instead of `typeof === 'function'` (React.forwardRef objects). |
| 2 | SoundCard Component | [COMPLETE] | 2026-03-08 | Created `SoundCard.tsx`, added `sound-pulse` keyframe/animation to `tailwind.config.js`. 8 tests passing. |
| 3 | SoundGrid Component | [COMPLETE] | 2026-03-08 | Created `SoundGrid.tsx`. 6 tests passing. Responsive grid: 3 cols mobile, 4 tablet, 6 desktop. |
| 4 | Crossfade Looping Engine Upgrade | [COMPLETE] | 2026-03-08 | Rewrote `lib/audio-engine.ts`: async `addSound()` with fetch+decode+AudioBuffer cache, double-buffer crossfade looping via `scheduleCrossfade()`, `SoundEntry` uses `AudioBufferSourceNode`. Added `.catch()` to `enhancedDispatch` ADD_SOUND (temporary, Step 7 removes). Updated constants with `CROSSFADE_OVERLAP_MS`, `LOAD_RETRY_MAX`, `LOAD_RETRY_DELAYS_MS`. Rewrote `audio-engine.test.ts` (26 tests). Fixed `addSound` mock in AudioProvider/Drawer/Pill tests to return Promise. |
| 5 | useSoundToggle Hook | [COMPLETE] | 2026-03-08 | Created `hooks/useSoundToggle.ts`: auth gate, 6-sound limit toast, loading/error state via Map, retry with exponential backoff, double-tap guard via pendingRef. Toast type uses `'error'` instead of `'info'` (Toast component only supports success/error). 9 tests passing. |
| 6 | MixerTabContent Component | [COMPLETE] | 2026-03-08 | Created `MixerSoundRow.tsx` (icon + name + VolumeSlider + remove button) and `MixerTabContent.tsx` (empty state with MousePointerClick icon, active sounds list, "+ Add Sound" auth-gated button). Updated `DrawerTabs.tsx` to render MixerTabContent instead of placeholder. Updated AudioDrawer tests with Toast/AuthModal providers. 9 new tests (3 MixerSoundRow + 6 MixerTabContent). |
| 7 | AudioProvider Updates | [COMPLETE] | 2026-03-08 | Added `AudioEngineContext` + `useAudioEngine()` hook. Removed `ADD_SOUND` engine call from `enhancedDispatch` (useSoundToggle handles it). Wrapped children in `AudioEngineContext.Provider`. Added `TestAudioEngineContext` to test helpers. |
| 8 | Integration Wiring + Reducer Fix | [COMPLETE] | 2026-03-08 | Fixed `REMOVE_SOUND` reducer to set `pillVisible=false` and `isPlaying=false` only when no sounds remain AND no foreground content. Added 3 reducer tests: last-sound-no-fg, last-sound-with-fg, other-sounds-remain. 561 tests passing, build clean. |
| 9 | Full Test Suite Verification | [COMPLETE] | 2026-03-08 | 66 test files, 561 tests — all passing. Build clean (643 kB JS, 63 kB CSS). Zero regressions from pre-spec baseline (424 tests). Net new: 137 tests across 10 new/updated test files. |
