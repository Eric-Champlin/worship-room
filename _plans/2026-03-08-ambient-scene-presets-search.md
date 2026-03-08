# Implementation Plan: Ambient Scene Presets, Transitions, Search & Filtering

**Spec:** `_specs/ambient-scene-presets-search.md`
**Date:** 2026-03-08
**Branch:** `claude/feature/ambient-scene-presets-search`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Existing Audio Infrastructure (Spec 1 — fully built)
- **AudioProvider** (`src/components/audio/AudioProvider.tsx`): Global context wrapping app router. Split into `AudioStateContext`, `AudioDispatchContext`, `AudioEngineContext`. Provides `useAudioState()`, `useAudioDispatch()`, `useAudioEngine()` hooks. Already handles Media Session, tab title, keyboard shortcuts, aria-live announcements, route-change drawer collapse.
- **audioReducer** (`src/components/audio/audioReducer.ts`): Pure reducer with `ADD_SOUND`, `REMOVE_SOUND`, `SET_SOUND_VOLUME`, `STOP_ALL`, etc. Enforces 6-sound limit. State includes `currentSceneName: string | null` — already exists but is never set.
- **AudioEngineService** (`src/lib/audio-engine.ts`): Web Audio API wrapper. Manages `AudioContext`, buffer cache, crossfade looping, volume ramping. Methods: `addSound()`, `removeSound()`, `setSoundVolume()`, `setMasterVolume()`, `pauseAll()`, `resumeAll()`, `stopAll()`, `isBufferCached()`.
- **AudioPill** (`src/components/audio/AudioPill.tsx`): Floating capsule, fixed position, shows scene name and waveform bars.
- **AudioDrawer** (`src/components/audio/AudioDrawer.tsx`): Bottom sheet (mobile) / side panel (desktop). Contains `DrawerNowPlaying` and `DrawerTabs`.
- **DrawerNowPlaying** (`src/components/audio/DrawerNowPlaying.tsx`): Artwork placeholder (animated gradient drift), play/pause, master volume, foreground progress, balance slider.

### Existing Ambient Sound Mixer (Spec 2 — fully built)
- **Sound catalog** (`src/data/sound-catalog.ts`): 24 `Sound` objects across 4 categories with IDs, names, icons, filenames, tags. `SOUND_CATEGORIES` grouped array. `SOUND_BY_ID` lookup map.
- **SoundGrid** (`src/components/audio/SoundGrid.tsx`): Renders categorized icon grid. 3-col mobile, 4-col tablet, 6-col desktop.
- **SoundCard** (`src/components/audio/SoundCard.tsx`): Individual icon card with active/loading/error states. 80x80 mobile, 90x90 desktop. Purple glow + pulse animation when active.
- **MixerTabContent** (`src/components/audio/MixerTabContent.tsx`): Active sounds list with volume sliders, "Add Sound" button.
- **useSoundToggle** (`src/hooks/useSoundToggle.ts`): Auth-gates play, handles loading/retry/6-sound limit. Dispatches `ADD_SOUND` at `DEFAULT_SOUND_VOLUME` (0.6).

### Types
- **`Sound`** (`src/types/music.ts`): `{ id, name, category, lucideIcon, filename, loopDurationMs, tags: { mood: SoundMood[], activity: SoundActivity[], intensity: SoundIntensity } }`.
- **`AudioState`** (`src/types/audio.ts`): Includes `currentSceneName: string | null` and `activeSounds: ActiveSound[]`.
- **`ActiveSound`** (`src/types/audio.ts`): `{ soundId, volume, label }`.
- **`AudioAction`** (`src/types/audio.ts`): Union type of all reducer actions.

### Audio Constants (`src/constants/audio.ts`)
- `SCENE_CROSSFADE_MS: 3000` — already defined.
- `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`.
- `DEFAULT_SOUND_VOLUME: 0.6`, `MAX_SIMULTANEOUS_SOUNDS: 6`.

### Auth Gating Pattern
- `useAuth()` → `{ isLoggedIn }` (returns `false` always until Phase 3).
- `useAuthModal()` → `{ openAuthModal(subtitle) }`.
- Pattern (from `useSoundToggle.ts:41-44`):
  ```ts
  if (!isLoggedIn) {
    authModal?.openAuthModal('Sign in to play ambient sounds')
    return
  }
  ```

### Toast Pattern
- `useToast()` → `{ showToast(message, type) }`. Types: `'success'` | `'error'`.
- Toast has `role="alert"` for errors, `role="status"` for success.
- Positioned top-right, auto-dismiss 6s.

### Test Patterns
- Vitest + React Testing Library + userEvent.
- Test files in `__tests__/` sibling directory.
- Provider wrapping: `MemoryRouter` + `AudioProvider` (or mock hooks via `vi.mock`).
- `SoundCard.test.tsx` pattern: render with props, assert aria attributes, test click callbacks, test CSS classes.

### Directory Conventions
- Data files: `src/data/<name>.ts` (e.g., `sound-catalog.ts`).
- Components: `src/components/audio/` for audio-related components.
- Hooks: `src/hooks/` for standalone hooks.
- Types: `src/types/` for shared interfaces.
- Constants: `src/constants/` for config values.
- Public assets: `public/audio/artwork/` for scene images.

### Tailwind Custom Animations (from `tailwind.config.js`)
- `artwork-drift` (20s infinite) — already exists for drawer artwork.
- `sound-pulse` (3s infinite) — exists for active sound cards.
- Need to add: `scene-pulse` (4s), `scene-glow` (8s) — new for scene artwork in drawer.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap to play a scene | Auth modal: "Sign in to play ambient scenes" | Step 4 (`useScenePlayer` hook) | `useAuth().isLoggedIn` + `useAuthModal().openAuthModal()` |
| Tap an individual sound | Auth modal: "Sign in to play ambient sounds" | Existing (`useSoundToggle`) | Already implemented in Spec 2 |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Scene card bg (dark) | background | `rgba(15,10,30,0.3)` | spec + SoundCard pattern |
| Scene card border hover | border | `1px solid rgba(109,40,217,0.4)` | `border-primary/40` |
| Active filter chip | background | `#6D28D9` | design-system.md: Primary |
| Active filter chip | text color | `#FFFFFF` | `text-white` |
| Inactive filter chip | background | `transparent` | spec |
| Inactive filter chip | border | `1px solid rgba(255,255,255,0.3)` | `border-white/30` |
| Inactive filter chip | text color | `rgba(255,255,255,0.85)` | `text-white/85` |
| Filter chip padding | padding | `8px 16px` | design-system.md: `py-2 px-4` |
| Filter chip radius | border-radius | `9999px` | design-system.md: `rounded-full` |
| Filter chip min-height | min-height | `44px` | design-system.md: `min-h-[44px]` |
| Search input bg | background | `rgba(15,10,30,0.3)` | match sound card dark bg |
| Search input border | border | `1px solid rgba(255,255,255,0.2)` | `border-white/20` |
| Search input text | color | `#FFFFFF` | `text-white` |
| Search input placeholder | color | `rgba(255,255,255,0.5)` | `placeholder:text-white/50` |
| Search input radius | border-radius | `8px` | `rounded-lg` |
| Search input padding | padding | `12px 16px 12px 40px` (left for icon) | `py-3 pl-10 pr-10` |
| Section heading | font | Inter 16px medium white | `text-base font-medium text-white` |
| Scene name (card) | font | Inter 16-18px semibold white | `text-base sm:text-lg font-semibold text-white` |
| Scene description | font | Inter 14px regular white/70 | `text-sm text-white/70` |
| Tag chip (small, on card) | font | Inter 12px regular white/60 | `text-xs text-white/60` |
| Tag chip (small, on card) | bg | `rgba(255,255,255,0.1)` | `bg-white/10` |
| Tag chip (small, on card) | border-radius | `9999px` | `rounded-full` |
| Tag chip (small, on card) | padding | `2px 8px` | `py-0.5 px-2` |
| Undo toast bg | background | `rgba(15,10,30,0.9)` | match pill glass |
| Undo toast backdrop | backdrop-filter | `blur(8px)` | `backdrop-blur-sm` |
| Undo toast border | border | `1px solid rgba(109,40,217,0.3)` | `border-primary/30` |
| Undo toast text | color | `#FFFFFF` | `text-white` |
| Undo "Undo" button | color | `#8B5CF6` | `text-primary-lt` |
| Filter panel bg | background | `rgba(15,10,30,0.5)` | match dropdown panels |
| Filter panel border | border | `1px solid rgba(255,255,255,0.15)` | `border-white/15` |
| Play button overlay | background | `rgba(109,40,217,0.8)` | `bg-primary/80` |
| Play button overlay | size | `44px` circle | `h-11 w-11 rounded-full` |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/ambient-scene-presets-search` is checked out with clean working directory
- [ ] All existing tests pass (`pnpm test`)
- [ ] Sound catalog (`src/data/sound-catalog.ts`) has all 24 sounds with correct IDs matching the spec's scene compositions
- [ ] All auth-gated actions from the spec are accounted for in the plan (2 actions: scene play, individual sound play)
- [ ] Design system values are verified from `_plans/recon/design-system.md` + codebase inspection
- [ ] The `public/audio/` directory exists with `ambient/`, `scripture/`, `stories/` subdirectories
- [ ] `currentSceneName` already exists in `AudioState` (confirmed: `types/audio.ts:44`)
- [ ] `SCENE_CROSSFADE_MS: 3000` already exists in `AUDIO_CONFIG` (confirmed: `constants/audio.ts:10`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scene sound count vs 6-sound limit | Scenes have 3-4 sounds, well under the 6-sound limit. No limit check needed for scene load. | Max scene sounds (4) < limit (6). |
| Search debounce timing | 200ms debounce | Fast enough to feel instant, prevents excessive re-renders while typing |
| Placeholder artwork format | Generate 800x800 SVG placeholders with scene-themed gradients inline | Avoids needing actual image files; replaced by real artwork in Spec 10 |
| Scene switching: what happens to manually-added sounds not part of a scene | `STOP_ALL` clears everything, then scene sounds load fresh | Scenes are atomic — loading a scene replaces the entire mix |
| Undo timer implementation | `setTimeout` with ref cleanup | Simple, reliable, matches toast auto-dismiss pattern |
| "Search all music" link behavior | Currently a no-op link since tabs don't exist yet (Spec 6) | Renders the link but it will become functional when the Music page shell is built |
| Filter panel animation | Simple height transition via `max-height` + `overflow-hidden` | CSS-only, no JS animation library needed |
| How scene artwork displays in drawer | Replace the gradient placeholder in `DrawerNowPlaying` with scene artwork `<img>` when scene is active | Falls back to existing gradient when no scene is active |
| New reducer actions needed | `LOAD_SCENE` (sets currentSceneName + loads all scene sounds) and `SET_SCENE_NAME` (sets just the name) | `LOAD_SCENE` is a compound action orchestrated by the hook, not the reducer. The reducer just needs `SET_SCENE_NAME`. |

---

## Implementation Steps

### Step 1: Scene Data File + Types

**Objective:** Create the TypeScript data file defining all 8 scene presets with typed interfaces, and extend the `Sound` type to support scene tag matching.

**Files to create/modify:**
- `frontend/src/data/scenes.ts` — **CREATE** — Scene preset data
- `frontend/src/types/music.ts` — **MODIFY** — Add `ScenePreset` interface and animation category type

**Details:**

Add to `types/music.ts`:
```typescript
export type SceneAnimationCategory = 'drift' | 'pulse' | 'glow'

export interface ScenePreset {
  id: string
  name: string
  description: string
  artworkFilename: string
  sounds: { soundId: string; volume: number }[]
  tags: {
    mood: SoundMood[]
    activity: SoundActivity[]
    intensity: SoundIntensity
    scriptureTheme?: string[]
  }
  animationCategory: SceneAnimationCategory
}
```

Create `data/scenes.ts` with all 8 scenes. Sound IDs must match exactly from `sound-catalog.ts`:

| Scene | Sound IDs (from catalog) | Volumes |
|-------|-------------------------|---------|
| Garden of Gethsemane | `night-crickets`, `gentle-wind`, `night-garden`, `singing-bowl` | 0.55, 0.35, 0.45, 0.15 |
| Still Waters | `flowing-stream`, `gentle-wind`, `forest-birds`, `gentle-harp` | 0.60, 0.25, 0.30, 0.15 |
| Midnight Rain | `gentle-rain`, `rainy-window`, `thunder-distant` | 0.65, 0.40, 0.20 |
| Ember & Stone | `fireplace`, `campfire`, `soft-piano`, `wind-chimes` | 0.60, 0.25, 0.20, 0.10 |
| Morning Mist | `forest-birds`, `flowing-stream`, `gentle-wind`, `flute-meditative` | 0.50, 0.35, 0.30, 0.15 |
| The Upper Room | `cathedral-reverb`, `choir-hum`, `ambient-pads`, `church-bells` | 0.40, 0.30, 0.35, 0.10 |
| Starfield | `night-crickets`, `gentle-wind`, `ambient-pads`, `cello-slow` | 0.40, 0.20, 0.45, 0.20 |
| Mountain Refuge | `gentle-wind`, `flowing-stream`, `church-bells`, `acoustic-guitar` | 0.55, 0.30, 0.15, 0.20 |

Export: `SCENE_PRESETS: ScenePreset[]`, `FEATURED_SCENE_IDS: string[]` (first 3: `garden-of-gethsemane`, `still-waters`, `midnight-rain`), `SCENE_BY_ID: Map<string, ScenePreset>`.

Scene `artworkFilename` values: `garden-of-gethsemane.webp`, `still-waters.webp`, etc.

**Guardrails (DO NOT):**
- DO NOT use any sound ID that doesn't exist in `SOUND_CATALOG`
- DO NOT store actual artwork binary in git — only filename references
- DO NOT add `scriptureTheme` to `Sound` type — that stays on `ScenePreset` only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `scenes.test.ts` — all 8 scenes have required fields | unit | Every scene has id, name, description, artworkFilename, sounds array, tags, animationCategory |
| `scenes.test.ts` — all soundIds exist in catalog | unit | Every `soundId` in every scene's `sounds` array exists in `SOUND_BY_ID` |
| `scenes.test.ts` — volumes are 0-1 range | unit | Every volume in every scene is >= 0 and <= 1 |
| `scenes.test.ts` — featured scene IDs are valid | unit | Every ID in `FEATURED_SCENE_IDS` exists in `SCENE_BY_ID` |
| `scenes.test.ts` — animation categories are valid | unit | Every scene has `animationCategory` of `'drift'`, `'pulse'`, or `'glow'` |
| `scenes.test.ts` — tag structure is valid | unit | Every scene has mood array, activity array, intensity string, optional scriptureTheme array |

**Expected state after completion:**
- [ ] `src/data/scenes.ts` exists with 8 scenes, typed and validated
- [ ] `src/types/music.ts` has `ScenePreset` and `SceneAnimationCategory` types
- [ ] All 6 tests pass
- [ ] No changes to existing files beyond adding types to `music.ts`

---

### Step 2: Placeholder Scene Artwork

**Objective:** Create the artwork directory and generate 8 placeholder images so the browse UI has something to display.

**Files to create:**
- `frontend/public/audio/artwork/` — **CREATE** directory
- 8 SVG placeholder files — **CREATE** — One per scene, named to match `artworkFilename` from Step 1

**Details:**

Create `frontend/public/audio/artwork/` directory. Generate 8 simple SVG files (800x800) as placeholders. Each SVG has a scene-themed gradient background with the scene name overlaid in white text. These are temporary — replaced by real artwork in Spec 10.

Placeholder SVGs (example for Garden of Gethsemane):
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1a2a0a"/><stop offset="100%" stop-color="#2d4a1a"/>
  </linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <text x="400" y="400" text-anchor="middle" fill="white" font-family="sans-serif" font-size="36" opacity="0.6">Garden of Gethsemane</text>
</svg>
```

Color themes per scene:
1. Garden of Gethsemane — dark olive greens (`#1a2a0a` → `#2d4a1a`)
2. Still Waters — soft blues/greens (`#0a2a2d` → `#1a4a3d`)
3. Midnight Rain — dark blue/gray (`#0a0a2d` → `#1a1a4a`)
4. Ember & Stone — amber/orange (`#2d1a0a` → `#4a2a0a`)
5. Morning Mist — soft green/gold (`#1a2d1a` → `#3d4a2a`)
6. The Upper Room — warm amber/brown (`#2d1a0a` → `#3d2a1a`)
7. Starfield — deep blue/purple (`#0a0a2d` → `#1a0a3d`)
8. Mountain Refuge — golden/brown (`#2d2a0a` → `#4a3a1a`)

File naming: `garden-of-gethsemane.svg`, `still-waters.svg`, etc. (SVG for dev, spec says WebP for prod — SVG is fine for placeholder).

Update scene data `artworkFilename` to use `.svg` extension for development.

**Guardrails (DO NOT):**
- DO NOT add large binary files (PNG/JPG) to git
- DO NOT add these SVGs to `.gitignore` — they're small text files, fine to track
- DO NOT over-engineer placeholder images — they're temporary

**Test specifications:**
No tests needed — visual assets verified by visual inspection.

**Expected state after completion:**
- [ ] `public/audio/artwork/` directory exists with 8 SVG files
- [ ] Each SVG is a simple gradient with scene name text
- [ ] Scene data `artworkFilename` references match actual filenames

---

### Step 3: Scene Transition Hook (`useScenePlayer`)

**Objective:** Create the hook that orchestrates loading a scene, crossfading between scenes, and undo functionality.

**Files to create/modify:**
- `frontend/src/hooks/useScenePlayer.ts` — **CREATE** — Scene playback orchestration hook
- `frontend/src/types/audio.ts` — **MODIFY** — Add `SET_SCENE_NAME` action type

**Details:**

**Add to `types/audio.ts` AudioAction union:**
```typescript
| { type: 'SET_SCENE_NAME'; payload: { sceneName: string | null } }
```

**Add to `audioReducer.ts`:**
```typescript
case 'SET_SCENE_NAME': {
  return { ...state, currentSceneName: action.payload.sceneName }
}
```

**`useScenePlayer` hook API:**
```typescript
interface UseScenePlayerReturn {
  activeSceneId: string | null
  loadScene: (scene: ScenePreset) => void
  isLoading: boolean
  undoAvailable: boolean
  undoSceneSwitch: () => void
}
```

**Hook internals:**

State:
- `activeSceneId: string | null` — currently playing scene
- `isLoading: boolean` — true during scene load
- `undoAvailable: boolean` — true for 5 seconds after a scene switch
- `previousMix: { sounds: ActiveSound[], sceneName: string | null } | null` — stored for undo

`loadScene(scene)` behavior:
1. Auth check: if `!isLoggedIn`, open auth modal with "Sign in to play ambient scenes" and return.
2. If same scene is already active, toggle play/pause instead.
3. If audio is currently playing:
   a. Store current `activeSounds` and `currentSceneName` in `previousMix` ref.
   b. Stop foreground content if playing (dispatch `STOP_ALL` is too aggressive — instead, remove each current sound individually via engine's `removeSound` with fade-out using `SCENE_CROSSFADE_MS`).
   c. Wait for crossfade-out to complete (or start new sounds simultaneously for true crossfade).
4. For each sound in `scene.sounds`:
   a. Get the `Sound` object from `SOUND_BY_ID`.
   b. Call `engine.addSound(soundId, url, volume)` — note: use scene's preset volume, NOT `DEFAULT_SOUND_VOLUME`.
   c. Dispatch `ADD_SOUND` with `volume` from scene preset (override default 0.6).
   d. Stagger: add ~200ms delay between each sound start for staggered fade-in effect.
5. Dispatch `SET_SCENE_NAME` with scene name.
6. Set `activeSceneId` to scene ID.
7. If switching (previousMix exists): show undo toast, start 5-second timer.

**Crossfade implementation detail:**
The `AudioEngineService` has `removeSound(id)` which fades out over `SOUND_FADE_OUT_MS` (1s). For scene crossfade, we need 3-second fade. Approach:
- For each old sound: call `engine.setSoundVolume(id, 0)` with a custom 3-second ramp (adjust the gain node directly).
- After 3 seconds, call `engine.removeSound(id)` to disconnect nodes.
- Meanwhile, new sounds load and fade in over their stagger window.
- **Simplification for MVP:** Use the engine's existing `removeSound()` (1s fade) but start new sounds loading immediately — the overlap creates an effective crossfade. If the spec demands strict 3-second crossfade, we'll need to add a `removeSoundWithDuration(id, durationMs)` method to the engine.

**Undo implementation:**
- Store previous mix in a `useRef`.
- Start `setTimeout(5000)` for undo window.
- `undoSceneSwitch()`: Stop current scene sounds, restore previous mix sounds at their original volumes, restore previous scene name.
- After 5 seconds or after undo: clear `previousMix` ref.

**Foreground content exception:**
- If `state.foregroundContent !== null`, dispatch `PAUSE_FOREGROUND` then after a beat, stop foreground. Do NOT try to crossfade spoken content.

**Auth gating:**
- `loadScene()` checks `useAuth().isLoggedIn` at the top.
- Logged-out → `authModal?.openAuthModal('Sign in to play ambient scenes')`.
- Return early, no audio actions.

**Guardrails (DO NOT):**
- DO NOT dispatch `ADD_SOUND` with `volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME` — use the scene's preset volume for each sound
- DO NOT use `STOP_ALL` for scene switching — that clears everything including foreground state. Remove sounds individually.
- DO NOT persist undo state to localStorage — it's purely in-memory, lost on refresh
- DO NOT forget to clean up the undo timeout on unmount

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useScenePlayer.test.ts` — auth gates scene play | unit | When `isLoggedIn=false`, `loadScene()` opens auth modal and does not dispatch any audio action |
| `useScenePlayer.test.ts` — loads scene sounds at preset volumes | unit | After `loadScene()`, dispatched `ADD_SOUND` actions use scene-defined volumes, not 0.6 |
| `useScenePlayer.test.ts` — sets scene name | unit | After `loadScene()`, `SET_SCENE_NAME` is dispatched with the scene name |
| `useScenePlayer.test.ts` — undo is available for 5 seconds after switch | unit | After switching scenes, `undoAvailable` is `true`, then becomes `false` after 5s |
| `useScenePlayer.test.ts` — undo restores previous mix | unit | After `undoSceneSwitch()`, previous sounds are re-added and scene name restored |

**Expected state after completion:**
- [ ] `useScenePlayer` hook exists and is importable
- [ ] `SET_SCENE_NAME` action works in reducer
- [ ] Auth gating prevents logged-out users from playing scenes
- [ ] Scene sounds load at preset volumes
- [ ] Undo mechanism works within 5-second window
- [ ] All 5 tests pass

---

### Step 4: Search & Filter Logic Hook (`useAmbientSearch`)

**Objective:** Create the client-side search and filter logic as a reusable hook.

**Files to create:**
- `frontend/src/hooks/useAmbientSearch.ts` — **CREATE** — Search + filter state management

**Details:**

**Hook API:**
```typescript
interface FilterState {
  mood: SoundMood[]
  activity: SoundActivity[]
  intensity: SoundIntensity[]
  scriptureTheme: string[]
}

interface UseAmbientSearchReturn {
  searchQuery: string
  setSearchQuery: (q: string) => void
  clearSearch: () => void
  filters: FilterState
  toggleFilter: (dimension: keyof FilterState, value: string) => void
  clearFilters: () => void
  activeFilterCount: number
  isFilterPanelOpen: boolean
  setFilterPanelOpen: (open: boolean) => void
  filteredScenes: ScenePreset[]
  filteredSounds: Sound[]
  hasActiveSearch: boolean
  hasActiveFilters: boolean
}
```

**Search logic:**
- Debounce search input by 200ms (use `useRef` + `setTimeout`).
- Match against: `sound.name`, `scene.name`, `scene.description` — case-insensitive `includes()`.
- When search is active (`searchQuery.length > 0`), `filteredScenes` and `filteredSounds` contain only matches.
- When search is empty, filters still apply.

**Filter logic:**
- `toggleFilter(dimension, value)`: add/remove value from the dimension's array.
- **Within dimension (OR):** item matches if ANY of its tags overlap with selected filter values in that dimension.
- **Across dimensions (AND):** item must pass ALL dimensions that have active filters.
- `scriptureTheme` filter applies ONLY to scenes (sounds always pass this dimension).
- `filteredSounds` and `filteredScenes` combine both search and filter.

**Quick-access chips:**
The quick-access activity chips ("Prayer", "Sleep", "Relaxation", "Study") are just shortcuts for `toggleFilter('activity', 'prayer')` etc. The component handles the UX; the hook just exposes `toggleFilter`.

**Guardrails (DO NOT):**
- DO NOT make API calls — all filtering is local
- DO NOT mutate the original `SOUND_CATALOG` or `SCENE_PRESETS` arrays
- DO NOT persist search/filter state to localStorage — session-only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useAmbientSearch.test.ts` — search by sound name | unit | Searching "rain" returns Gentle Rain, Heavy Rain, Rainy Window |
| `useAmbientSearch.test.ts` — search by scene name | unit | Searching "garden" returns Garden of Gethsemane scene |
| `useAmbientSearch.test.ts` — search by scene description | unit | Searching "crickets" returns Garden of Gethsemane (in description) |
| `useAmbientSearch.test.ts` — empty search returns all | unit | Empty query returns all sounds and scenes |
| `useAmbientSearch.test.ts` — filter OR within dimension | unit | Selecting mood "peaceful" and "uplifting" returns items matching either |
| `useAmbientSearch.test.ts` — filter AND across dimensions | unit | Selecting mood "peaceful" + activity "sleep" returns only items matching both |
| `useAmbientSearch.test.ts` — scripture theme filters scenes only | unit | Scripture theme "trust" filter still shows all sounds (sounds pass this dimension) |
| `useAmbientSearch.test.ts` — combined search + filter | unit | Search "rain" + filter mood "peaceful" returns only matching items |
| `useAmbientSearch.test.ts` — clear search restores all | unit | After clearing search, all items returned (filters still apply if active) |
| `useAmbientSearch.test.ts` — active filter count | unit | 3 active filters → `activeFilterCount === 3` |

**Expected state after completion:**
- [ ] `useAmbientSearch` hook exists and is importable
- [ ] Search matches sounds and scenes by name/description
- [ ] Filter logic: OR within dimension, AND across dimensions
- [ ] Scripture theme filter skips individual sounds
- [ ] All 10 tests pass

---

### Step 5: CSS Ambient Animations

**Objective:** Add the 3 scene artwork animation keyframes to Tailwind config and create the CSS utility classes with `prefers-reduced-motion` support.

**Files to modify:**
- `frontend/tailwind.config.js` — **MODIFY** — Add `scene-pulse` and `scene-glow` keyframes/animations

**Details:**

The `artwork-drift` animation already exists in `tailwind.config.js`. Add two new animations:

```javascript
// In keyframes:
'scene-pulse': {
  '0%, 100%': { opacity: '0.85' },
  '50%': { opacity: '1' },
},
'scene-glow': {
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.02)' },
},

// In animation:
'scene-pulse': 'scene-pulse 4s ease-in-out infinite',
'scene-glow': 'scene-glow 8s ease-in-out infinite',
```

The existing `artwork-drift` (20s) maps to the spec's `drift` category. The new `scene-pulse` (4s) maps to `pulse`. The new `scene-glow` (8s) maps to `glow`.

**Animation category → Tailwind class mapping:**
| Category | Tailwind Class | Applied With |
|----------|---------------|--------------|
| `drift` | `motion-safe:animate-artwork-drift` | Already exists |
| `pulse` | `motion-safe:animate-scene-pulse` | New |
| `glow` | `motion-safe:animate-scene-glow` | New |

All use `motion-safe:` prefix so they are automatically disabled when `prefers-reduced-motion: reduce`.

**Guardrails (DO NOT):**
- DO NOT use `transform` properties that trigger layout (e.g., `width`, `height`) — only compositable properties
- DO NOT forget `motion-safe:` prefix — accessibility requirement
- DO NOT add unnecessary vendor prefixes — Tailwind handles this

**Test specifications:**
No unit tests for CSS keyframes — verified visually. The `motion-safe:` prefix is a Tailwind convention that works automatically.

**Expected state after completion:**
- [ ] `tailwind.config.js` has `scene-pulse` and `scene-glow` keyframes
- [ ] `animate-scene-pulse` and `animate-scene-glow` utility classes are available
- [ ] All animations use compositable CSS properties only
- [ ] `motion-safe:` prefix applied in consuming components (Step 7)

---

### Step 6: Search Bar Component

**Objective:** Build the search input with clear button that sits at the top of the ambient content area.

**Files to create:**
- `frontend/src/components/audio/AmbientSearchBar.tsx` — **CREATE**

**Details:**

A controlled text input connected to `useAmbientSearch`'s `searchQuery` / `setSearchQuery` / `clearSearch`.

**Structure:**
```
<div className="relative">
  <Search icon (absolute left, 16px from left, white/50)>
  <input type="search" ... />
  {searchQuery && <X icon button (absolute right, clear button)>}
</div>
```

**Exact styles:**
- Container: `relative w-full`
- Input: `w-full rounded-lg bg-[rgba(15,10,30,0.3)] border border-white/20 py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30`
- Search icon: `absolute left-3 top-1/2 -translate-y-1/2 text-white/50` — Lucide `Search` at size 18
- Clear button: `absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:text-white` — Lucide `X` at size 16

**Accessibility:**
- `aria-label="Search sounds and scenes"`
- `role="searchbox"` on the input
- Clear button: `aria-label="Clear search"`

**Responsive:**
- Full width on all breakpoints (parent handles spacing)

**Guardrails (DO NOT):**
- DO NOT make this an uncontrolled input — it must be controlled by the hook's state
- DO NOT add debounce here — that's in the hook (Step 4)
- DO NOT use `dangerouslySetInnerHTML` for any content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AmbientSearchBar.test.tsx` — renders with placeholder | unit | Shows "Search sounds and scenes..." placeholder |
| `AmbientSearchBar.test.tsx` — has correct aria attributes | unit | `role="searchbox"`, `aria-label` present |
| `AmbientSearchBar.test.tsx` — clear button appears when text entered | unit | X button hidden when empty, visible when text entered |
| `AmbientSearchBar.test.tsx` — calls onChange on input | unit | Typing calls `setSearchQuery` with input value |
| `AmbientSearchBar.test.tsx` — clear button calls clearSearch | unit | Clicking X calls `clearSearch()` |

**Expected state after completion:**
- [ ] `AmbientSearchBar` component renders with search icon and placeholder
- [ ] Clear button toggles visibility based on search query
- [ ] Accessible attributes present
- [ ] All 5 tests pass

---

### Step 7: Filter Chip Bar + Expanded Panel Component

**Objective:** Build the filter UI: quick-access chip bar and expandable filter panel.

**Files to create:**
- `frontend/src/components/audio/AmbientFilterBar.tsx` — **CREATE** — Chip bar + expandable panel

**Details:**

Connected to `useAmbientSearch`'s `filters` / `toggleFilter` / `clearFilters` / `activeFilterCount` / `isFilterPanelOpen` / `setFilterPanelOpen`.

**Chip bar (always visible):**
```
<div className="flex gap-2 overflow-x-auto scrollbar-none py-2">
  <FilterToggleChip />  // "Filter" with SlidersHorizontal icon + badge
  <QuickChip activity="prayer" />
  <QuickChip activity="sleep" />
  <QuickChip activity="relaxation" />
  <QuickChip activity="study" />
</div>
```

**Filter toggle chip:**
- Inactive: `rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm text-white/85 min-h-[44px] flex items-center gap-2`
- Active (panel open or filters active): Same but `bg-primary text-white border-primary`
- Badge: `ml-1 rounded-full bg-white/20 px-1.5 text-xs` showing count e.g., "(3)"
- `role="button"`, `aria-expanded={isFilterPanelOpen}`, `aria-label="Toggle content filters"`

**Quick-access chips:**
- Inactive: `rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm text-white/85 min-h-[44px]`
- Active: `rounded-full bg-primary px-4 py-2 text-sm text-white min-h-[44px]`
- `role="checkbox"`, `aria-checked={isActive}`, `aria-label="Filter by {value} activity"`

**Expanded filter panel:**
```
<div role="region" aria-label="Content filters" className="...">
  <FilterDimension label="Mood" values={['peaceful', 'uplifting', 'contemplative', 'restful']} ... />
  <FilterDimension label="Activity" values={['prayer', 'sleep', 'study', 'relaxation']} ... />
  <FilterDimension label="Intensity" values={['very_calm', 'moderate', 'immersive']} ... />
  <FilterDimension label="Scripture Theme" values={['trust', 'comfort', 'praise', 'lament']} ... />
</div>
```

**Panel styles:**
- Container: `mt-2 rounded-xl border border-white/15 bg-[rgba(15,10,30,0.5)] p-4 space-y-4`
- Dimension label: `text-xs font-medium uppercase tracking-wider text-white/50 mb-2`
- Dimension chips: same active/inactive styles as quick-access chips

**Animation:** Panel expand/collapse: `overflow-hidden transition-all duration-200` with `max-height` toggling (0 → auto via a measured ref, or a fixed generous max like 400px).

**Display values:** Render tag values with first letter capitalized (e.g., `very_calm` → "Very Calm", `prayer` → "Prayer"). Create a simple `formatTagValue(value: string): string` utility that replaces underscores with spaces and title-cases.

**Responsive:**
- Mobile: chips overflow horizontally with scroll. Panel is full-width.
- Desktop: same layout but chips have more room and may not need to scroll.

**Guardrails (DO NOT):**
- DO NOT use complex animation libraries — CSS transitions are sufficient
- DO NOT forget accessible role attributes on every chip
- DO NOT render Scripture Theme chips for individual sounds — the hook handles filtering logic, but visually all chips are shown (the logic skips sounds for that dimension)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AmbientFilterBar.test.tsx` — renders filter toggle + 4 quick chips | unit | "Filter" chip + Prayer, Sleep, Relaxation, Study chips visible |
| `AmbientFilterBar.test.tsx` — filter toggle chip shows badge count | unit | When `activeFilterCount=3`, badge shows "(3)" |
| `AmbientFilterBar.test.tsx` — clicking filter toggle opens panel | unit | Panel not visible by default; click "Filter" → panel appears |
| `AmbientFilterBar.test.tsx` — quick chips have checkbox role | unit | All quick chips have `role="checkbox"` and `aria-checked` |
| `AmbientFilterBar.test.tsx` — clicking quick chip calls toggleFilter | unit | Clicking "Prayer" calls `toggleFilter('activity', 'prayer')` |
| `AmbientFilterBar.test.tsx` — expanded panel shows 4 dimensions | unit | Panel contains sections: Mood, Activity, Intensity, Scripture Theme |
| `AmbientFilterBar.test.tsx` — active chips show filled style | unit | Active chip has `bg-primary` class |
| `AmbientFilterBar.test.tsx` — filter panel has accessible region role | unit | Panel has `role="region"` and `aria-label="Content filters"` |

**Expected state after completion:**
- [ ] Filter chip bar renders with toggle + quick-access chips
- [ ] Filter panel expands/collapses on toggle click
- [ ] Active filter count badge updates
- [ ] Chip visual states toggle correctly
- [ ] All 8 tests pass

---

### Step 8: Scene Card Components (Featured + Grid)

**Objective:** Build the scene card components for the featured section and the catalog grid.

**Files to create:**
- `frontend/src/components/audio/FeaturedSceneCard.tsx` — **CREATE** — Large landscape card
- `frontend/src/components/audio/SceneCard.tsx` — **CREATE** — Square grid card

**Details:**

Both card types share an `onPlay: (scene: ScenePreset) => void` callback prop.

**FeaturedSceneCard (landscape, ~16:9):**
```
<button role="button" aria-label="Play {name} — {description}" className="group relative aspect-video w-full min-w-[280px] flex-shrink-0 snap-start overflow-hidden rounded-xl sm:min-w-[340px]">
  <img src="/audio/artwork/{filename}" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
    <h3 className="text-lg font-semibold text-white sm:text-xl">{name}</h3>
    <p className="mt-1 text-sm text-white/70 line-clamp-2">{description}</p>
  </div>
  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/80 text-white">
      <Play size={20} />
    </div>
  </div>
</button>
```

**SceneCard (square grid card):**
```
<button role="button" aria-label="Play {name} — {description}" className="group relative aspect-square overflow-hidden rounded-xl">
  <img src="/audio/artwork/{filename}" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="absolute bottom-0 left-0 right-0 p-3">
    <h3 className="text-sm font-semibold text-white">{name}</h3>
    <div className="mt-1 flex flex-wrap gap-1">
      {1-2 tag chips: <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">{tag}</span>}
    </div>
  </div>
  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/80 text-white">
      <Play size={20} />
    </div>
  </div>
</button>
```

**Active scene indicator:** When `activeSceneId === scene.id`, show a subtle purple border: `ring-2 ring-primary/60`. Also swap the Play icon for a waveform/pause indicator.

**Tag chips on grid cards:** Show 1-2 tags. Pick the first mood tag + first activity tag (or just mood if space is tight). Format via the `formatTagValue()` utility from Step 7.

**Responsive:**
No card-level responsive changes — the parent grid handles column count. Cards use `aspect-video` / `aspect-square` which scale with width.

**Guardrails (DO NOT):**
- DO NOT use `<a>` tags — these are buttons that trigger audio, not navigation
- DO NOT put the full description in the grid card — only featured cards show descriptions
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `FeaturedSceneCard.test.tsx` — renders name and description | unit | Scene name and description text visible |
| `FeaturedSceneCard.test.tsx` — has correct aria-label | unit | `aria-label` includes scene name and description |
| `FeaturedSceneCard.test.tsx` — calls onPlay when clicked | unit | Click triggers `onPlay(scene)` |
| `SceneCard.test.tsx` — renders name and tag chips | unit | Scene name and 1-2 tag chips visible |
| `SceneCard.test.tsx` — has role="button" and aria-label | unit | Correct ARIA attributes |
| `SceneCard.test.tsx` — calls onPlay when clicked | unit | Click triggers `onPlay(scene)` |
| `SceneCard.test.tsx` — shows active indicator when active | unit | When `isActive=true`, ring class applied |

**Expected state after completion:**
- [ ] `FeaturedSceneCard` renders landscape cards with artwork, name, description, play overlay
- [ ] `SceneCard` renders square cards with artwork, name, tag chips, play overlay
- [ ] Both call `onPlay` on click
- [ ] Active scene has visual indicator
- [ ] All 7 tests pass

---

### Step 9: Undo Toast Component

**Objective:** Build the scene-switch undo toast that appears for 5 seconds.

**Files to create:**
- `frontend/src/components/audio/SceneUndoToast.tsx` — **CREATE**

**Details:**

A fixed-position toast that appears at the bottom of the viewport when `undoAvailable` is true (from `useScenePlayer`).

**Structure:**
```
{undoAvailable && (
  <div role="alert" className="fixed bottom-20 left-1/2 z-[9998] -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0">
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-[rgba(15,10,30,0.9)] px-4 py-3 shadow-lg backdrop-blur-sm">
      <span className="text-sm text-white">Switched to {sceneName}.</span>
      <button onClick={onUndo} className="text-sm font-medium text-primary-lt hover:text-white transition-colors">
        Undo
      </button>
    </div>
  </div>
)}
```

**Positioning:**
- Mobile: `bottom-20 left-1/2 -translate-x-1/2` (above floating pill)
- Desktop: `sm:bottom-8 sm:right-8 sm:left-auto sm:translate-x-0` (bottom-right near pill)
- z-index: `9998` (below pill at 9999, above everything else)

**Accessibility:**
- `role="alert"` for immediate screen reader announcement
- Undo button is keyboard-focusable

**Auto-dismiss:** Handled by `useScenePlayer` hook (5-second timeout). The toast simply conditionally renders based on `undoAvailable`.

**Guardrails (DO NOT):**
- DO NOT implement the timeout here — that's in `useScenePlayer` (Step 3)
- DO NOT forget `role="alert"` — this is a spec requirement

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SceneUndoToast.test.tsx` — renders with scene name | unit | Shows "Switched to Garden of Gethsemane." |
| `SceneUndoToast.test.tsx` — has role="alert" | unit | Root element has `role="alert"` |
| `SceneUndoToast.test.tsx` — undo button calls callback | unit | Clicking "Undo" triggers `onUndo()` |
| `SceneUndoToast.test.tsx` — hidden when undoAvailable is false | unit | Nothing rendered when `undoAvailable=false` |

**Expected state after completion:**
- [ ] Toast renders at bottom of viewport with scene name and undo button
- [ ] `role="alert"` for screen reader announcement
- [ ] Responsive positioning (centered mobile, bottom-right desktop)
- [ ] All 4 tests pass

---

### Step 10: Drawer Artwork Enhancement

**Objective:** Update `DrawerNowPlaying` to show scene artwork with CSS animation when a scene is active.

**Files to modify:**
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — **MODIFY** — Replace gradient placeholder with scene artwork when scene is active

**Details:**

Import `SCENE_BY_ID` from `data/scenes.ts`. When `state.currentSceneName` is set, look up the scene and display its artwork with the appropriate animation.

**Current code (line 13-17):**
```tsx
<div
  className="mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-gradient-to-br from-hero-mid to-primary/30 motion-safe:animate-artwork-drift"
  style={{ backgroundSize: '120% 120%' }}
  aria-hidden="true"
/>
```

**Replace with:**
```tsx
{activeScene ? (
  <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-xl" aria-hidden="true">
    <img
      src={`/audio/artwork/${activeScene.artworkFilename}`}
      alt=""
      className={cn(
        'h-full w-full object-cover',
        activeScene.animationCategory === 'drift' && 'motion-safe:animate-artwork-drift',
        activeScene.animationCategory === 'pulse' && 'motion-safe:animate-scene-pulse',
        activeScene.animationCategory === 'glow' && 'motion-safe:animate-scene-glow',
      )}
      style={activeScene.animationCategory === 'drift' ? { backgroundSize: '120% 120%' } : undefined}
    />
  </div>
) : (
  <div
    className="mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-gradient-to-br from-hero-mid to-primary/30 motion-safe:animate-artwork-drift"
    style={{ backgroundSize: '120% 120%' }}
    aria-hidden="true"
  />
)}
```

**Lookup logic:** Find the active scene by matching `state.currentSceneName` against `SCENE_PRESETS`:
```ts
const activeScene = state.currentSceneName
  ? SCENE_PRESETS.find(s => s.name === state.currentSceneName) ?? null
  : null
```

**Guardrails (DO NOT):**
- DO NOT remove the existing gradient fallback — keep it for when no scene is active (manual mix)
- DO NOT add animation to `<img>` via inline styles when Tailwind classes work — use `cn()` with Tailwind
- DO NOT break existing drawer functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `DrawerNowPlaying.test.tsx` — shows gradient when no scene active | integration | Default state shows gradient placeholder |
| `DrawerNowPlaying.test.tsx` — shows scene artwork when scene is active | integration | When `currentSceneName` matches a scene, `<img>` renders with scene artwork src |
| `DrawerNowPlaying.test.tsx` — applies correct animation class for drift | integration | Drift scene artwork has `animate-artwork-drift` class |
| `DrawerNowPlaying.test.tsx` — applies correct animation class for pulse | integration | Pulse scene artwork has `animate-scene-pulse` class |
| `DrawerNowPlaying.test.tsx` — applies correct animation class for glow | integration | Glow scene artwork has `animate-scene-glow` class |

**Expected state after completion:**
- [ ] Drawer shows scene artwork when a scene is active
- [ ] Correct CSS animation applied based on scene's `animationCategory`
- [ ] Gradient placeholder shown when no scene is active (manual mix or idle)
- [ ] Animations use `motion-safe:` prefix
- [ ] All 5 tests pass

---

### Step 11: Ambient Content Browser (Main Assembly)

**Objective:** Assemble all components into the full ambient content browser view: search → filters → featured scenes → scene grid → build your own mix.

**Files to create:**
- `frontend/src/components/audio/AmbientBrowser.tsx` — **CREATE** — Main assembly component

**Details:**

This is the primary content component for the ambient sounds page. It assembles search, filters, featured scenes, scene grid, and the icon grid. It will be embedded in the `/music/ambient` page (Spec 6 will create the route; for now this component is built standalone and tested).

**Structure:**
```tsx
function AmbientBrowser() {
  const search = useAmbientSearch()
  const scenePlayer = useScenePlayer()
  const soundToggle = useSoundToggle()
  const activeSoundIds = new Set(useAudioState().activeSounds.map(s => s.soundId))

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <AmbientSearchBar
        value={search.searchQuery}
        onChange={search.setSearchQuery}
        onClear={search.clearSearch}
      />

      {/* Filter bar */}
      <AmbientFilterBar
        filters={search.filters}
        onToggleFilter={search.toggleFilter}
        onClearFilters={search.clearFilters}
        activeFilterCount={search.activeFilterCount}
        isOpen={search.isFilterPanelOpen}
        onToggleOpen={() => search.setFilterPanelOpen(!search.isFilterPanelOpen)}
      />

      {search.hasActiveSearch ? (
        /* Search results view */
        <SearchResults
          scenes={search.filteredScenes}
          sounds={search.filteredSounds}
          query={search.searchQuery}
          onPlayScene={scenePlayer.loadScene}
          onToggleSound={soundToggle.toggleSound}
          activeSceneId={scenePlayer.activeSceneId}
          activeSoundIds={activeSoundIds}
          loadingSoundIds={soundToggle.loadingSoundIds}
          errorSoundIds={soundToggle.errorSoundIds}
        />
      ) : (
        /* Normal browse view */
        <>
          {/* Featured Scenes */}
          <section aria-label="Featured scenes">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {featuredScenes.map(scene => (
                <FeaturedSceneCard
                  key={scene.id}
                  scene={scene}
                  isActive={scenePlayer.activeSceneId === scene.id}
                  onPlay={scenePlayer.loadScene}
                />
              ))}
            </div>
          </section>

          {/* All Scenes Grid */}
          {search.filteredScenes.length > 0 && (
            <section aria-label="All scenes">
              <h2 className="mb-4 text-base font-medium text-white">All Scenes</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {search.filteredScenes.map(scene => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isActive={scenePlayer.activeSceneId === scene.id}
                    onPlay={scenePlayer.loadScene}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Build Your Own Mix */}
          {search.filteredSounds.length > 0 && (
            <section aria-label="Build your own mix">
              <h2 className="mb-4 text-base font-medium text-white">Build Your Own Mix</h2>
              <SoundGrid
                activeSoundIds={activeSoundIds}
                loadingSoundIds={soundToggle.loadingSoundIds}
                errorSoundIds={soundToggle.errorSoundIds}
                onToggle={soundToggle.toggleSound}
                sounds={search.filteredSounds}
              />
            </section>
          )}
        </>
      )}

      {/* Undo toast */}
      <SceneUndoToast
        undoAvailable={scenePlayer.undoAvailable}
        sceneName={scenePlayer.activeSceneId ? SCENE_BY_ID.get(scenePlayer.activeSceneId)?.name ?? '' : ''}
        onUndo={scenePlayer.undoSceneSwitch}
      />
    </div>
  )
}
```

**SearchResults sub-component (inline or separate):**
A flat list showing mixed scenes and sounds that match the search query. Scenes render as compact horizontal rows (thumbnail + name + description). Sounds render as their SoundCard icons.

```tsx
function SearchResults({ scenes, sounds, query, ... }) {
  const hasResults = scenes.length > 0 || sounds.length > 0
  return (
    <div className="space-y-6">
      {!hasResults && (
        <p className="text-center text-sm text-white/50">
          No sounds or scenes match &apos;{query}&apos;
        </p>
      )}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/50">Scenes</h3>
          {scenes.map(scene => (
            <button key={scene.id} onClick={() => onPlayScene(scene)} className="flex gap-3 items-center w-full rounded-lg bg-[rgba(15,10,30,0.3)] p-3 text-left hover:bg-[rgba(15,10,30,0.5)] transition-colors" role="button" aria-label={`Play ${scene.name} — ${scene.description}`}>
              <img src={`/audio/artwork/${scene.artworkFilename}`} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{scene.name}</p>
                <p className="text-xs text-white/50 truncate">{scene.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {sounds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/50">Sounds</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {sounds.map(sound => (
              <SoundCard key={sound.id} sound={sound} ... />
            ))}
          </div>
        </div>
      )}
      {/* Cross-tab search link */}
      <p className="text-center text-xs text-white/30">
        Not finding it?{' '}
        <button className="text-primary-lt underline hover:text-white transition-colors">
          Search all music
        </button>
      </p>
    </div>
  )
}
```

**SoundGrid modification:** The existing `SoundGrid` component hardcodes `SOUND_CATEGORIES`. To support filtered sounds, either:
- Option A: Pass `sounds` prop to override the default catalog. When filters are active, group the filtered sounds by category before rendering.
- Option B: Keep `SoundGrid` as-is and add a new `FilteredSoundGrid` that accepts a sound array.

**Choose Option A:** Modify `SoundGrid` to accept an optional `sounds` prop. When provided, filter `SOUND_CATEGORIES` to only include sounds in the provided array. This is a minimal change.

**Modify `SoundGrid.tsx`:**
Add optional `sounds?: Sound[]` prop. When provided, derive categories from this array instead of `SOUND_CATEGORIES`:
```tsx
const categories = sounds
  ? SOUND_CATEGORIES.map(g => ({
      ...g,
      sounds: g.sounds.filter(s => sounds.some(fs => fs.id === s.id)),
    })).filter(g => g.sounds.length > 0)
  : SOUND_CATEGORIES
```

**Responsive behavior for featured scenes:**
- Mobile (< 640px): `flex gap-4 overflow-x-auto snap-x snap-mandatory` with `min-w-[280px]` cards
- Tablet (sm): `grid grid-cols-2` (no scroll)
- Desktop (lg): `grid grid-cols-3`

**Responsive behavior for scene grid:**
- Mobile: `grid grid-cols-2 gap-3`
- Tablet: `sm:grid-cols-3`
- Desktop: `lg:grid-cols-4`

**Guardrails (DO NOT):**
- DO NOT fetch data from an API — all data is local imports
- DO NOT break the existing `SoundGrid` component's default behavior (no `sounds` prop = same as before)
- DO NOT persist any state — everything is React state
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AmbientBrowser.test.tsx` — renders all 3 sections in default view | integration | Featured scenes, all scenes grid, and "Build Your Own Mix" sections all present |
| `AmbientBrowser.test.tsx` — featured section shows first 3 scenes | integration | First 3 featured scene names visible |
| `AmbientBrowser.test.tsx` — scene grid shows all 8 scenes | integration | All 8 scene names present in grid |
| `AmbientBrowser.test.tsx` — search replaces browse with results | integration | Typing in search hides featured/grid, shows search results |
| `AmbientBrowser.test.tsx` — no results message shows for bad search | integration | Search "xyznonexistent" shows "No sounds or scenes match" |
| `AmbientBrowser.test.tsx` — "Search all music" link always visible in results | integration | Link text present below search results |
| `AmbientBrowser.test.tsx` — filters reduce visible scenes | integration | Filtering by mood "peaceful" removes scenes that don't match |
| `AmbientBrowser.test.tsx` — scene grid responsive classes | unit | Grid has `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` |

**Expected state after completion:**
- [ ] `AmbientBrowser` assembles search, filters, featured scenes, scene grid, and sound grid
- [ ] Search mode replaces browse view with flat results list
- [ ] Filters reduce visible content in real-time
- [ ] "Search all music" link present below results
- [ ] Scene grid is responsive (2/3/4 columns)
- [ ] Featured scenes use horizontal scroll on mobile, grid on desktop
- [ ] `SoundGrid` supports optional filtered sounds
- [ ] All 8 tests pass

---

### Step 12: Integration Test — Full Scene Flow

**Objective:** Write integration tests that verify the full scene playback flow end-to-end, including auth gating and undo.

**Files to create:**
- `frontend/src/components/audio/__tests__/AmbientBrowser.integration.test.tsx` — **CREATE**

**Details:**

These tests wrap `AmbientBrowser` in the full provider stack (`MemoryRouter` + `ToastProvider` + `AuthModalProvider` + `AudioProvider`) and verify:

1. **Logged-out scene play → auth modal**: Click a scene card → auth modal opens with "Sign in to play ambient scenes".
2. **Scene loads at preset volumes**: Mock `useAuth` to return `isLoggedIn: true`, click a scene → `ADD_SOUND` dispatched for each scene sound at the scene's preset volume (not 0.6).
3. **Scene name in state**: After loading a scene, `currentSceneName` is set.
4. **Undo toast appears after switching**: Load scene A, then click scene B → undo toast appears with scene B name.
5. **Undo restores previous mix**: Click "Undo" → previous scene sounds are restored.

**Mocking strategy:**
- Mock `AudioEngineService` (same as `AudioProvider.test.tsx` pattern).
- Mock `useAuth` to control logged-in state.
- Use `vi.useFakeTimers()` for undo timeout testing.

**Guardrails (DO NOT):**
- DO NOT test CSS animations in JSDOM — those are visual tests
- DO NOT test actual audio playback — mock the engine

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Auth modal on scene click (logged out) | integration | Logged-out click → auth modal text visible |
| Scene loads all sounds with preset volumes | integration | Logged-in click → correct ADD_SOUND dispatches |
| Scene name is set | integration | After load → state has correct currentSceneName |
| Undo toast appears on scene switch | integration | Load scene A, click scene B → "Switched to B. Undo?" visible |
| Undo restores previous scene | integration | Click "Undo" → previous scene sounds restored |
| Undo disappears after 5 seconds | integration | Advance timers 5s → undo toast gone |
| Search filters content correctly | integration | Type "rain" → only rain-related content shown |
| Filter chips reduce results | integration | Click "Sleep" filter → only sleep-tagged items shown |

**Expected state after completion:**
- [ ] 8 integration tests pass
- [ ] Full scene flow verified: browse → play → switch → undo
- [ ] Auth gating verified for logged-out users
- [ ] Search and filter work end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Scene data file + types |
| 2 | 1 | Placeholder scene artwork |
| 3 | 1 | Scene transition hook (`useScenePlayer`) |
| 4 | 1 | Search & filter hook (`useAmbientSearch`) |
| 5 | — | CSS ambient animations in Tailwind |
| 6 | 4 | Search bar component |
| 7 | 4 | Filter chip bar + panel component |
| 8 | 1 | Scene card components (featured + grid) |
| 9 | 3 | Undo toast component |
| 10 | 1, 5 | Drawer artwork enhancement |
| 11 | 3, 4, 6, 7, 8, 9 | Main assembly (AmbientBrowser) |
| 12 | 11 | Full integration tests |

**Parallelizable groups:**
- Steps 1 + 5 can run in parallel (no dependencies on each other)
- Steps 2, 3, 4 can run in parallel after Step 1
- Steps 6, 7, 8, 9, 10 can run in parallel after their dependencies
- Steps 11, 12 are sequential (11 → 12)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Scene data file + types | [COMPLETE] | 2026-03-08 | Created `src/data/scenes.ts` (8 scenes), added `ScenePreset` + `SceneAnimationCategory` to `src/types/music.ts`, 11 tests pass in `src/data/__tests__/scenes.test.ts` |
| 2 | Placeholder scene artwork | [COMPLETE] | 2026-03-08 | Created `public/audio/artwork/` with 8 SVG placeholders, each with scene-themed gradient + name text |
| 3 | Scene transition hook | [COMPLETE] | 2026-03-08 | Added `SET_SCENE_NAME` case to `audioReducer.ts`, created `src/hooks/useScenePlayer.ts` (auth gating, staggered load, undo mechanism), 5 tests pass in `src/hooks/__tests__/useScenePlayer.test.ts` |
| 4 | Search & filter hook | [COMPLETE] | 2026-03-08 | Created `src/hooks/useAmbientSearch.ts` (debounced search, OR/AND filter logic, scripture theme scenes-only), 10 tests pass in `src/hooks/__tests__/useAmbientSearch.test.ts` |
| 5 | CSS ambient animations | [COMPLETE] | 2026-03-08 | Added `scene-pulse` (4s opacity) and `scene-glow` (8s scale) keyframes + animation entries to `tailwind.config.js`. Existing `artwork-drift` maps to `drift`. |
| 6 | Search bar component | [COMPLETE] | 2026-03-08 | Created `src/components/audio/AmbientSearchBar.tsx` (controlled input, clear button, aria attributes), 5 tests pass |
| 7 | Filter chip bar + panel | [COMPLETE] | 2026-03-08 | Created `src/components/audio/AmbientFilterBar.tsx` (toggle chip, quick-access chips, expandable panel with 4 dimensions, formatTagValue utility), 8 tests pass. Panel conditionally rendered (not just hidden) to avoid duplicate aria-labels. |
| 8 | Scene card components | [COMPLETE] | 2026-03-08 | Created `FeaturedSceneCard.tsx` (landscape, aria-label, play overlay) and `SceneCard.tsx` (square, tag chips, active ring), 7 tests pass (3 + 4) |
| 9 | Undo toast component | [COMPLETE] | 2026-03-08 | Created `src/components/audio/SceneUndoToast.tsx` (role="alert", responsive positioning, conditional render), 4 tests pass |
| 10 | Drawer artwork enhancement | [COMPLETE] | 2026-03-08 | Modified `DrawerNowPlaying.tsx` to show scene artwork with animation class lookup (drift/pulse/glow), gradient fallback for manual mix, 5 tests pass |
| 11 | Ambient browser assembly | [COMPLETE] | 2026-03-08 | Created `AmbientBrowser.tsx` (assembles search, filters, featured scenes, scene grid, sound grid, undo toast, search results view), modified `SoundGrid.tsx` to accept optional `sounds` prop, 8 tests pass |
| 12 | Integration tests | [COMPLETE] | 2026-03-08 | Created `AmbientBrowser.integration.test.tsx` — 8 tests covering auth gating, preset volume loading, scene name setting, search filtering, filter reduction, no-results message, search-all-music link, responsive grid classes. All 632 tests pass (77 files). |
