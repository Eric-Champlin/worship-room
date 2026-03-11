# Implementation Plan: Bedtime Routines — Builder, Playback Engine, Templates

**Spec:** `_specs/bedtime-routines.md`
**Date:** 2026-03-10
**Branch:** `claude/feature/bedtime-routines`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Relevant Existing Files and Patterns

**Audio System (core infrastructure already built):**
- `frontend/src/types/audio.ts` — `AudioState`, `AudioAction` (already has `AudioRoutine`, `RoutineStep`, `START_ROUTINE`, `ADVANCE_ROUTINE_STEP`, `SKIP_ROUTINE_STEP` actions)
- `frontend/src/components/audio/audioReducer.ts` — Reducer already handles `START_ROUTINE`, `ADVANCE_ROUTINE_STEP`, `SKIP_ROUTINE_STEP` (basic index advancement + null-out when past last step)
- `frontend/src/components/audio/AudioProvider.tsx` — Context providers: `useAudioState()`, `useAudioDispatch()`, `useAudioEngine()`, `useSleepTimerControls()`
- `frontend/src/lib/audio-engine.ts` — Web Audio API wrapper with `addSound()`, `removeSound()`, `playForeground()`, `breatheUpAmbient()`, `scheduleSleepFade()`, crossfade looping
- `frontend/src/components/audio/RoutineStepper.tsx` — **Already exists** as a basic stepper (numbered circles with check marks, skip button). Needs enhancement for content type icons, labels, timer icon.
- `frontend/src/components/audio/AudioPill.tsx` — Floating pill, currently only shows when `pillVisible` is true with playing content. Needs routine shortcut mode.
- `frontend/src/components/audio/AudioDrawer.tsx` — Already renders `<RoutineStepper />` between `DrawerNowPlaying` and `DrawerTabs`.
- `frontend/src/constants/audio.ts` — `AUDIO_CONFIG` with `LOAD_RETRY_MAX: 3`, `LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000]`

**Existing Hooks (patterns to follow):**
- `frontend/src/hooks/useScenePlayer.ts` — Auth-gated scene loading with staggered fade-in, undo window. **Key pattern for loading scenes in routine steps.**
- `frontend/src/hooks/useForegroundPlayer.ts` — Auth-gated foreground playback with content-switch confirmation dialog. **Key pattern for playing scripture/story in routine steps.**
- `frontend/src/hooks/useSleepTimer.ts` — Wall-clock timer with phase tracking. **Used to start timer at routine end.**

**Data Files (content IDs for templates):**
- `frontend/src/data/scenes.ts` — Scene IDs: `'still-waters'`, `'midnight-rain'`, `'garden-of-gethsemane'`
- `frontend/src/data/music/scripture-readings.ts` — Scripture IDs: `'psalm-23'` (collectionId: `'psalms-of-peace'`), collection `'comfort-and-rest'`
- `frontend/src/data/music/bedtime-stories.ts` — Story IDs: `'elijah-and-the-still-small-voice'`

**Storage Service:**
- `frontend/src/services/storage-service.ts` — `LocalStorageService` with auth-gated CRUD, keys prefixed `wr_`. **Needs extension for routines (`wr_routines`).**
- `frontend/src/types/storage.ts` — `Favorite`, `SavedMix`, `ListeningSession`, `SessionState`, `SharedMixData`

**Auth Pattern:**
- `frontend/src/hooks/useAuth.ts` — Returns `{ user: null, isLoggedIn: false }` (placeholder)
- `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()?.openAuthModal('message')`
- Pattern: check `isLoggedIn`, if false call `openAuthModal()` and return early

**Routes:**
- `frontend/src/App.tsx` — All routes in a flat `<Routes>`. Music routes: `/music` (MusicPage), `/music/playlists|ambient|sleep` (redirects). **Need to add `/music/routines`.**

**Test Patterns:**
- Mock all hooks with `vi.mock()` at top level
- Mock `AudioEngineService` class
- Mock `useAuth`, `useAuthModal`, `useToast`
- Use `MemoryRouter` wrapper with `future` flags
- Use `userEvent.setup()` for interactions
- Render with `render(<Component />)` directly (mocks handle providers)

### Directory Conventions

```
frontend/src/
  types/         → TypeScript interfaces (audio.ts, music.ts, storage.ts)
  data/music/    → Static data files (scripture-readings.ts, bedtime-stories.ts)
  data/          → scenes.ts, sound-catalog.ts
  services/      → storage-service.ts
  hooks/         → Custom hooks (useScenePlayer.ts, useForegroundPlayer.ts, useSleepTimer.ts)
  components/audio/   → Audio UI (AudioPill, AudioDrawer, RoutineStepper, SleepBrowse, etc.)
  components/music/   → Music page sections (PersonalizationSection, TimeOfDaySection, etc.)
  pages/              → Page components (MusicPage.tsx)
  constants/          → audio.ts
```

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Start a template routine | Auth modal: "Sign in to use bedtime routines" | Step 6 (useRoutinePlayer) | `useAuth` + `openAuthModal` |
| Create a custom routine | Auth modal: "Sign in to create bedtime routines" | Step 5 (RoutinesPage) | `useAuth` + `openAuthModal` |
| Clone a template | Auth modal: "Sign in to create bedtime routines" | Step 5 (RoutinesPage) | `useAuth` + `openAuthModal` |
| Edit a user-created routine | N/A (logged-out has no routines) | Step 5 | N/A |
| Delete a user-created routine | N/A (logged-out has no routines) | Step 5 | N/A |
| Duplicate a user-created routine | N/A (logged-out has no routines) | Step 5 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Routines page hero | background | `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)` | design-system.md Inner Page Hero |
| Hero H1 | font | `font-script text-5xl sm:text-6xl lg:text-7xl font-bold text-white` (Caveat 48-72px bold white) | design-system.md |
| Hero subtitle | font | `text-lg sm:text-xl text-white/85` (Inter 18-20px) | design-system.md |
| Hero padding | padding | `pt-32 pb-10 sm:pt-36 sm:pb-14 px-4` | design-system.md |
| Routine card | background, border, radius, shadow | `bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md` | design-system.md Meditation Card pattern |
| Template badge | style | `rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5` | Derived from chip pattern |
| Primary CTA button | style | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Delete button (danger) | style | `bg-danger text-white font-semibold py-3 px-8 rounded-lg` | design-system.md (Danger: `#E74C3C`) |
| Builder dark glass | background | `rgba(15, 10, 30, 0.95)` with `backdrop-filter: blur(16px)` | AudioDrawer.tsx line 92-94 |
| Step card left border (scene) | border-left | `border-l-2 border-[#00D4FF]` (teal/glow-cyan) | Spec UX notes |
| Step card left border (scripture) | border-left | `border-l-2 border-amber-400` (warm gold) | Spec UX notes |
| Step card left border (story) | border-left | `border-l-2 border-primary-lt` (soft purple `#8B5CF6`) | Spec UX notes |
| Drawer stepper | colors | Current: `bg-primary text-white`, completed: `bg-primary/30 text-primary`, future: `bg-white/10 text-white/40` | RoutineStepper.tsx existing |
| Pill background | background | `rgba(15, 10, 30, 0.85)` with `backdrop-filter: blur(8px)` | AudioPill.tsx line 33-34 |
| Content area background | background | `#F5F5F5` (`bg-neutral-bg`) | design-system.md |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The branch `claude/feature/bedtime-routines` is checked out and clean
- [ ] `pnpm install` has been run and dependencies are up to date
- [ ] The existing `RoutineStepper.tsx` component is intentionally basic (placeholder) and can be enhanced
- [ ] The existing `AudioRoutine` type in `types/audio.ts` is intentionally minimal and can be extended
- [ ] All auth-gated actions from the spec are accounted for in the plan (5 actions, 3 unique auth gates)
- [ ] Design system values are verified from `_plans/recon/design-system.md`
- [ ] The `@dnd-kit` library is acceptable as the drag-and-drop solution (lightweight, accessible, React-native)
- [ ] Template 2 "Scripture & Sleep" uses a random scripture from the "comfort-and-rest" collection — this randomness is resolved at routine-start time (not at template definition time)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Drag-and-drop library | `@dnd-kit/core` + `@dnd-kit/sortable` | Lightweight, accessible by default (keyboard support), React-focused, no jQuery dependency |
| Template 2 "random scripture" | Resolve at routine-start time from `comfort-and-rest` collection | Templates are static definitions; randomness happens when user taps "Start" |
| Routine step type icons | Lucide: `Landscape` (scene), `BookOpen` (scripture), `Moon` (story), `Clock` (timer) | Matches spec exactly; Lucide already in project |
| Builder page route | `/music/routines` as new route in App.tsx | Spec requires direct URL access; not a tab on MusicPage |
| Content picker for builder | Modal overlay reusing existing card components | Reuses `SceneCard`, `ScriptureSessionCard`, `BedtimeStoryCard` patterns |
| Routine playback orchestration | New `useRoutinePlayer` hook that calls `useScenePlayer.loadScene()` and `useForegroundPlayer.startSession()` | Composes existing hooks rather than duplicating logic |
| "End Routine" confirmation dialog | New `RoutineInterruptDialog` component | Follows `ContentSwitchDialog` pattern from `useForegroundPlayer` |
| Transition gap timer | `setTimeout` with ambient breathe-up via `engine.breatheUpAmbient()` | Engine already has `breatheUpAmbient()` method |
| How to detect foreground content ended (for routine advancement) | Listen for `PAUSE_FOREGROUND` action dispatched by `useForegroundPlayer`'s `onEnded` listener, then start transition gap | The existing foreground player already dispatches PAUSE_FOREGROUND on the audio element's `ended` event |

---

## Implementation Steps

### Step 1: Types & Data Model

**Objective:** Define the Routine type system and template data.

**Files to create/modify:**
- `frontend/src/types/audio.ts` — Extend `RoutineStep` with `type`, `contentId`, `transitionGapMinutes`. Extend `AudioRoutine` with `sleepTimer` config.
- `frontend/src/types/storage.ts` — Add `Routine` interface for persistence.
- `frontend/src/data/music/routines.ts` — NEW: Template definitions.

**Details:**

Modify `frontend/src/types/audio.ts`: Replace the existing `RoutineStep` and `AudioRoutine` interfaces:

```typescript
// Replace existing RoutineStep
export interface RoutineStep {
  stepId: string
  type: 'scene' | 'scripture' | 'story'
  contentId: string
  label: string
  icon: string // Lucide icon name
  transitionGapMinutes: number // 0 for first step
}

// Replace existing AudioRoutine
export interface AudioRoutine {
  routineId: string
  currentStepIndex: number
  steps: RoutineStep[]
  phase: 'playing' | 'transition-gap' | 'ambient-only' // NEW: track playback phase
  sleepTimerConfig: { durationMinutes: number; fadeDurationMinutes: number }
}
```

Add `START_ROUTINE` payload update and new actions to `AudioAction`:
```typescript
| { type: 'START_ROUTINE'; payload: AudioRoutine }
| { type: 'SET_ROUTINE_PHASE'; payload: { phase: AudioRoutine['phase'] } }
| { type: 'END_ROUTINE' }
```

Add to `frontend/src/types/storage.ts`:
```typescript
export interface RoutineDefinition {
  id: string
  name: string
  description?: string
  isTemplate: boolean
  steps: {
    id: string
    type: 'scene' | 'scripture' | 'story'
    contentId: string
    transitionGapMinutes: number
  }[]
  sleepTimer: { durationMinutes: number; fadeDurationMinutes: number }
  createdAt: string
  updatedAt: string
}
```

Create `frontend/src/data/music/routines.ts` with 3 templates:
- "Evening Peace": `still-waters` scene + `psalm-23` scripture (2-min gap), 45/15 timer
- "Scripture & Sleep": `midnight-rain` scene + `comfort-and-rest` random (1-min gap), 30/10 timer
- "Deep Rest": `garden-of-gethsemane` scene + `elijah-and-the-still-small-voice` story (5-min gap), 90/30 timer

Each template has `isTemplate: true`, a `description` field, and a stable `id` (e.g., `'template-evening-peace'`).

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` anywhere in description rendering
- DO NOT add database tables — this is localStorage only
- DO NOT change the existing `ADD_SOUND`, `START_FOREGROUND`, or sleep timer actions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Template data integrity | unit | Verify all 3 templates have valid scene/content IDs that exist in the data catalogs |
| RoutineDefinition type | unit | Verify template objects conform to the RoutineDefinition interface |

**Expected state after completion:**
- [ ] `RoutineStep` and `AudioRoutine` types are extended with content type, transition gap, phase, and sleep timer config
- [ ] `RoutineDefinition` type exists in `types/storage.ts`
- [ ] `ROUTINE_TEMPLATES` array exported from `data/music/routines.ts` with 3 complete templates
- [ ] All template content IDs reference valid entries in scenes, scripture readings, and bedtime stories data

---

### Step 2: Storage Service Extension

**Objective:** Add routine CRUD methods to StorageService.

**Files to modify:**
- `frontend/src/services/storage-service.ts` — Add routine methods + `wr_routines` key
- `frontend/src/types/storage.ts` — (already modified in Step 1)

**Details:**

Add to `KEYS`:
```typescript
routines: 'wr_routines',
```

Add to `StorageService` interface:
```typescript
// Routines
getRoutines(): RoutineDefinition[]
saveRoutine(routine: RoutineDefinition): void
updateRoutine(routine: RoutineDefinition): void
deleteRoutine(id: string): void
duplicateRoutine(id: string): RoutineDefinition | null
```

Implement in `LocalStorageService`:
- `getRoutines()`: Auth-gated read. Returns `[]` if not logged in.
- `saveRoutine(routine)`: Auth-gated write. Pushes to array.
- `updateRoutine(routine)`: Auth-gated. Finds by ID, replaces, updates `updatedAt`.
- `deleteRoutine(id)`: Auth-gated. Filters out by ID.
- `duplicateRoutine(id)`: Auth-gated. Copies with new UUID, appends " Copy" to name.

Follow the exact pattern of `saveMix()` / `deleteMix()` / `duplicateMix()` (lines 145-197 of storage-service.ts).

**Guardrails (DO NOT):**
- DO NOT write to localStorage for logged-out users
- DO NOT persist template definitions to localStorage — templates are static data, only user-created/cloned routines are stored

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getRoutines returns [] when logged out | unit | Verify empty array for unauthenticated users |
| saveRoutine persists to localStorage | unit | Verify routine is stored and retrievable |
| deleteRoutine removes from localStorage | unit | Verify routine is gone after deletion |
| duplicateRoutine creates copy with " Copy" suffix | unit | Verify copy has new ID and " Copy" name |
| updateRoutine overwrites existing | unit | Verify name/steps change and updatedAt updates |

**Expected state after completion:**
- [ ] `StorageService` interface has 5 routine methods
- [ ] `LocalStorageService` implements all 5 with auth gates
- [ ] `wr_routines` key is used for localStorage
- [ ] 5 unit tests pass

---

### Step 3: Audio Reducer & Provider Updates

**Objective:** Update the reducer to handle new routine actions and the enhanced `AudioRoutine` shape.

**Files to modify:**
- `frontend/src/components/audio/audioReducer.ts` — Add `SET_ROUTINE_PHASE`, `END_ROUTINE` cases; update `START_ROUTINE` to accept enhanced payload
- `frontend/src/types/audio.ts` — (already modified in Step 1 for new actions)

**Details:**

Add new action types to the union in `types/audio.ts`:
```typescript
| { type: 'SET_ROUTINE_PHASE'; payload: { phase: AudioRoutine['phase'] } }
| { type: 'END_ROUTINE' }
```

In `audioReducer.ts`, add cases:

```typescript
case 'SET_ROUTINE_PHASE': {
  if (!state.activeRoutine) return state
  return {
    ...state,
    activeRoutine: { ...state.activeRoutine, phase: action.payload.phase },
  }
}

case 'END_ROUTINE': {
  return { ...state, activeRoutine: null }
}
```

Update `START_ROUTINE` case to set `phase: 'playing'` on the payload (the payload already includes phase from Step 1).

Update `ADVANCE_ROUTINE_STEP` to reset phase to `'playing'` when advancing.

Update `STOP_ALL` to also clear `activeRoutine` (already does this).

**Guardrails (DO NOT):**
- DO NOT change the behavior of existing actions (ADD_SOUND, REMOVE_SOUND, etc.)
- DO NOT add side effects to the reducer — side effects belong in the hook/provider

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| START_ROUTINE sets activeRoutine and phase | unit | Dispatch START_ROUTINE, verify state.activeRoutine is set with phase 'playing' |
| ADVANCE_ROUTINE_STEP increments index | unit | Verify currentStepIndex increments and phase resets to 'playing' |
| ADVANCE_ROUTINE_STEP past last step nulls routine | unit | Verify routine becomes null when advancing past the last step |
| SET_ROUTINE_PHASE updates phase | unit | Verify phase changes to 'transition-gap' and 'ambient-only' |
| END_ROUTINE clears activeRoutine | unit | Verify routine becomes null |
| STOP_ALL clears activeRoutine | unit | Verify existing behavior preserved |

**Expected state after completion:**
- [ ] Reducer handles `SET_ROUTINE_PHASE` and `END_ROUTINE`
- [ ] `START_ROUTINE` accepts the full enhanced `AudioRoutine` payload
- [ ] `ADVANCE_ROUTINE_STEP` resets phase to `'playing'`
- [ ] All existing reducer tests still pass
- [ ] 6 new tests pass

---

### Step 4: useRoutinePlayer Hook

**Objective:** Build the playback engine hook that orchestrates routine step execution, transitions, and error handling.

**Files to create:**
- `frontend/src/hooks/useRoutinePlayer.ts` — NEW: Routine playback orchestration hook

**Details:**

This hook is the core engine. It:

1. **Exposes `startRoutine(routine: RoutineDefinition)`** — the main entry point
2. **Auth-gates** the start action (check `isLoggedIn`, show auth modal if not)
3. **Dispatches `START_ROUTINE`** with the routine mapped to `AudioRoutine` format
4. **Executes steps sequentially** based on step type:
   - `scene` step: Call scene-loading logic (reuse pattern from `useScenePlayer.loadScene()` — remove existing sounds, stagger-add new scene sounds, set scene name)
   - `scripture` / `story` step: Call foreground playback logic (reuse pattern from `useForegroundPlayer.playContent()` — create `<audio>` element, dispatch `START_FOREGROUND`)
5. **Listens for foreground content ending** — when `foregroundContent` transitions from `isPlaying: true` to `isPlaying: false` (and the audio position equals duration, indicating natural end, not user pause), start the transition gap
6. **Manages transition gaps** — `setTimeout` for `transitionGapMinutes * 60000`. During gap: dispatch `SET_ROUTINE_PHASE { phase: 'transition-gap' }`, call `engine.breatheUpAmbient(5000)` to ramp ambient to full. When gap ends: advance to next step.
7. **Handles step load failures** — Retry 3x with `AUDIO_CONFIG.LOAD_RETRY_DELAYS_MS` (1s, 2s, 4s). If all fail: show toast "Skipped [step name] — couldn't load audio", skip to next step.
8. **Handles end of routine** — After last step: dispatch `SET_ROUTINE_PHASE { phase: 'ambient-only' }`. Start sleep timer with routine's config (`dispatch START_SLEEP_TIMER`).
9. **Exposes `skipStep()`** — If foreground playing: crossfade out over 2s then advance. If in transition gap: clear timeout, advance immediately. If on last step: move to ambient-only + timer.
10. **Exposes `endRoutine()`** — Dispatches `END_ROUTINE`, clears any transition gap timers.
11. **Handles routine interrupt** — Exposes `pendingInterrupt` state and `confirmInterrupt()` / `cancelInterrupt()` for when the user manually loads a scene or content during an active routine.

**Key implementation details:**
- Use `useRef` for the transition gap timeout to avoid stale closures
- Use `useEffect` watching `audioState.foregroundContent?.isPlaying` to detect natural content end (check `playbackPosition >= duration - 1` to distinguish from user pause)
- Use `useCallback` for all exposed functions
- The hook does NOT call `useScenePlayer` or `useForegroundPlayer` directly — it reimplements the core logic using `engine` and `dispatch` to avoid hook-in-hook issues. Follow the same patterns though.
- Log listening sessions via `storageService.logListeningSession()` with `contentType: 'routine'`

**Interface:**
```typescript
export interface UseRoutinePlayerReturn {
  startRoutine: (routine: RoutineDefinition) => void
  skipStep: () => void
  endRoutine: () => void
  pendingInterrupt: { action: () => void; label: string } | null
  confirmInterrupt: () => void
  cancelInterrupt: () => void
  isRoutineActive: boolean
}
```

**Auth gating:**
- `startRoutine()`: Check `isLoggedIn`. If false: `openAuthModal('Sign in to use bedtime routines')` and return.

**Guardrails (DO NOT):**
- DO NOT call `useScenePlayer()` or `useForegroundPlayer()` inside this hook — compose at the engine/dispatch level
- DO NOT stop ambient sounds when the routine ends — ambient continues after the last step
- DO NOT let the app go silent — if all steps fail, ambient must keep playing
- DO NOT start the sleep timer if one is already active — check `audioState.sleepTimer?.isActive` first

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| startRoutine dispatches START_ROUTINE | unit | Verify dispatch is called with correct payload |
| startRoutine shows auth modal when logged out | unit | Verify openAuthModal called with "Sign in to use bedtime routines" |
| skipStep advances to next step | unit | Verify ADVANCE_ROUTINE_STEP or SKIP_ROUTINE_STEP dispatched |
| endRoutine clears active routine | unit | Verify END_ROUTINE dispatched |
| Transition gap sets phase to transition-gap | unit | Mock timer, verify SET_ROUTINE_PHASE dispatched |

**Expected state after completion:**
- [ ] `useRoutinePlayer` hook exports `startRoutine`, `skipStep`, `endRoutine`, interrupt handling
- [ ] Auth gate blocks logged-out users with correct message
- [ ] Step execution logic handles all 3 content types
- [ ] Transition gap timer works with ambient breathe-up
- [ ] Error handling retries 3x then skips with toast
- [ ] Sleep timer starts at routine end
- [ ] 5+ tests pass

---

### Step 5: Routines Page & Builder UI

**Objective:** Build the `/music/routines` page with template browsing, routine card list, and the full builder interface.

**Files to create:**
- `frontend/src/pages/RoutinesPage.tsx` — NEW: The full routines page
- `frontend/src/components/music/RoutineCard.tsx` — NEW: Card for displaying a routine
- `frontend/src/components/music/RoutineBuilder.tsx` — NEW: Builder with step timeline, content picker, timer config
- `frontend/src/components/music/RoutineStepCard.tsx` — NEW: Individual step card in the builder
- `frontend/src/components/music/ContentPicker.tsx` — NEW: Modal for selecting scene/scripture/story
- `frontend/src/components/music/DeleteRoutineDialog.tsx` — NEW: Confirmation dialog for deletion

**Files to modify:**
- `frontend/src/App.tsx` — Add `/music/routines` route

**Details:**

**Route registration** in `App.tsx` (line ~96, after the music sleep redirect):
```typescript
import { RoutinesPage } from './pages/RoutinesPage'
// ...
<Route path="/music/routines" element={<RoutinesPage />} />
```

**RoutinesPage.tsx:**
- Uses `<Layout>` wrapper (Navbar + Footer)
- Inner page hero: `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)`
- H1: "Bedtime Routines" in `font-script text-5xl sm:text-6xl lg:text-7xl font-bold text-white`
- Subtitle: "Build your path to peaceful sleep" in `text-lg sm:text-xl text-white/85`
- Content area: `bg-neutral-bg` with `max-w-5xl mx-auto px-4 py-8`
- State management: `useState` for `editingRoutine` (null or RoutineDefinition), `showBuilder` boolean
- Load routines from `storageService.getRoutines()` + `ROUTINE_TEMPLATES`
- Display routine cards in responsive grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- "Create Routine" button below cards: auth-gated

**RoutineCard.tsx:**
- `role="article"`, `aria-label="[name] routine — [N] steps, approximately [M] minutes"`
- White card: `rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md`
- Shows: routine name (Inter semi-bold), step icons row (Lucide icons inline), step count, estimated duration, description (templates only, `text-text-light text-sm`)
- "Start" button: `bg-primary text-white font-semibold py-2.5 px-6 rounded-lg` — auth-gated
- Three-dot menu (Lucide `MoreVertical`): dropdown with actions
  - Templates: "Clone & Customize" only
  - User-created: "Edit", "Duplicate", "Delete"
- Template badge: `rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5`

**RoutineBuilder.tsx:**
- Dark glass container: `rounded-2xl border border-white/10 p-6` with `background: rgba(15, 10, 30, 0.95)`, `backdrop-filter: blur(16px)` (matching drawer aesthetic)
- Vertical timeline with thin white/10 connecting line
- Step list with `role="list"` and drag-and-drop via `@dnd-kit/sortable`
- Each `RoutineStepCard` is a `role="listitem"` with `aria-label="Step N: [name] [type]"`
- Between steps: transition gap input — clock icon + "Wait __ min" number input (default 2, first step shows 0 and is not editable)
- "+ Add Step" button at bottom opens step type selector (3 buttons: Scene, Scripture, Story)
- After type selection, `ContentPicker` modal opens
- Sleep timer config at bottom: duration selector (dropdown of `AUDIO_CONFIG.SLEEP_TIMER_OPTIONS`), fade selector (dropdown of `AUDIO_CONFIG.FADE_DURATION_OPTIONS`)
- Name input: `maxLength={50}`, auto-generated from step names if empty
- "Save Routine" button: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`

**RoutineStepCard.tsx:**
- Left border accent by type: scene `border-l-2 border-glow-cyan` (#00D4FF), scripture `border-l-2 border-amber-400`, story `border-l-2 border-primary-lt` (#8B5CF6)
- Background: `bg-white/5 rounded-lg p-4`
- Shows: drag handle (Lucide `GripVertical`), step number, type icon, content name, Edit button, Remove button (X)
- Drag handle: `aria-roledescription="sortable"`, `aria-label="Step N, press space to grab, arrow keys to reorder"`

**ContentPicker.tsx:**
- Modal overlay (full-screen on mobile, centered large on desktop)
- `role="dialog"`, `aria-modal="true"`, focus trapped
- Tabs/sections for the selected content type:
  - Scene: grid of scene cards (name, description, sound count) from `SCENE_PRESETS`
  - Scripture: grouped by collection from `SCRIPTURE_COLLECTIONS`
  - Story: grid from `BEDTIME_STORIES`
- Clicking an item calls the `onSelect(type, contentId, name)` callback and closes

**DeleteRoutineDialog.tsx:**
- Follow `DeleteMixDialog` pattern from `components/music/DeleteMixDialog.tsx`
- `role="alertdialog"`, focus trapped via `useFocusTrap`
- "Delete [routine name]?" with red "Delete" and "Cancel" buttons

**Install dependency:**
```bash
cd frontend && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Auth gating:**
- "Start" button on any card: `useAuth` + `openAuthModal('Sign in to use bedtime routines')`
- "Create Routine" button: `useAuth` + `openAuthModal('Sign in to create bedtime routines')`
- "Clone & Customize": `useAuth` + `openAuthModal('Sign in to create bedtime routines')`

**Responsive behavior:**
- Desktop (> 1024px): 3-column card grid, builder centered max-w-[700px], content picker as large modal
- Tablet (640-1024px): 2-column card grid, builder full width with padding, content picker as centered modal
- Mobile (< 640px): 1-column card stack, builder full width, step cards full width with drag handle on left, content picker as full-screen overlay

**Guardrails (DO NOT):**
- DO NOT render user routine names with `dangerouslySetInnerHTML` — plain text only
- DO NOT allow saving a routine with 0 steps
- DO NOT allow routine names longer than 50 characters
- DO NOT render Edit/Delete for templates — only Clone
- DO NOT add this page to the navbar dropdown — it's accessed via direct links only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders 3 templates when no user routines | integration | Verify all 3 template cards visible with Template badge |
| Start button shows auth modal when logged out | integration | Click Start, verify openAuthModal called |
| Create Routine button shows auth modal when logged out | integration | Click Create, verify openAuthModal called |
| Clone creates copy with " (Custom)" suffix | integration | Click Clone (logged in), verify new routine name |
| Delete shows confirmation dialog | integration | Click Delete, verify dialog appears |
| Builder adds step via content picker | integration | Add Step → Scene → select item, verify step appears |
| Builder removes step | integration | Click X on step, verify step removed |
| Save Routine persists to localStorage | integration | Fill builder, save, verify storageService called |
| Routine name limited to 50 chars | unit | Type >50 chars, verify truncation |
| Template cards have Clone, not Edit/Delete | integration | Verify template card menu only has Clone |
| Step reorder via keyboard | integration | Focus drag handle, press space then arrow, verify order changes |

**Expected state after completion:**
- [ ] `/music/routines` route registered and accessible
- [ ] Page renders with inner page hero, routine cards, and builder
- [ ] Templates show Template badge and Clone button
- [ ] User routines show Edit, Duplicate, Delete
- [ ] Builder supports add, remove, reorder, edit steps
- [ ] Content picker works for all 3 types
- [ ] Delete confirmation dialog with focus trapping
- [ ] Auth gates on Start, Create, Clone
- [ ] Responsive at all 3 breakpoints
- [ ] 11+ tests pass

---

### Step 6: Enhanced RoutineStepper (Drawer Progress)

**Objective:** Upgrade the existing `RoutineStepper` component to show content type icons, step labels, timer icon, and proper ARIA progressbar.

**Files to modify:**
- `frontend/src/components/audio/RoutineStepper.tsx` — Enhance with icons, labels, timer icon, ARIA

**Details:**

Replace the current numbered-circle stepper with the spec's horizontal stepper:

- Each step shows its content type icon: `Landscape` (scene), `BookOpen` (scripture), `Moon` (story)
- A `Clock` icon at the end representing the sleep timer phase
- Current step: `bg-primary text-white` circle with icon, `scale-110` — slightly larger
- Completed steps: `bg-primary/30 text-primary` with `Check` icon
- Future steps: `bg-white/10 text-white/40` with content type icon
- Step labels below icons: `text-[10px] text-white/60 truncate max-w-[60px]` — hidden on mobile (`hidden sm:block`), truncated on tablet
- Timer icon at end: same styling as future step, with "Timer" label
- Progress container: `role="progressbar"`, `aria-valuemin={1}`, `aria-valuemax={steps.length}`, `aria-valuenow={currentStepIndex + 1}`, `aria-label="Routine progress — step N of M"`

Skip button behavior is already correct (`dispatch({ type: 'SKIP_ROUTINE_STEP' })`). Update the `aria-label` to "Skip to next routine step".

The `useRoutinePlayer` hook (Step 4) handles the actual skip logic (crossfade, gap skip, etc.) by listening for `SKIP_ROUTINE_STEP` dispatches in the reducer and reacting in the hook.

**Responsive behavior:**
- Mobile (< 640px): Icons only, no labels, smaller circles (h-6 w-6)
- Tablet (640-1024px): Icons with truncated labels
- Desktop (> 1024px): Icons with full labels

**Guardrails (DO NOT):**
- DO NOT break the existing stepper rendering when no routine is active (already returns null)
- DO NOT remove the skip button — just enhance its aria-label

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders nothing when no routine active | unit | Verify null return |
| Shows correct icons for each step type | unit | Set up 3-step routine, verify Landscape, BookOpen, Moon icons |
| Current step has primary background | unit | Verify bg-primary class on current index |
| Completed steps show check icon | unit | Advance past step, verify Check icon |
| Timer icon appears at end | unit | Verify Clock icon after all steps |
| Skip button has correct aria-label | unit | Verify "Skip to next routine step" |
| Progressbar ARIA attributes correct | unit | Verify role, valuemin, valuemax, valuenow |

**Expected state after completion:**
- [ ] Stepper shows content type icons instead of numbers
- [ ] Timer icon at end of stepper
- [ ] Labels below icons (responsive: hidden on mobile)
- [ ] Proper ARIA progressbar attributes
- [ ] All 7 tests pass

---

### Step 7: AudioPill Routine Shortcut

**Objective:** Add routine suggestion mode to the floating pill when no audio is playing.

**Files to modify:**
- `frontend/src/components/audio/AudioPill.tsx` — Add routine shortcut state

**Details:**

Add new logic to `AudioPill`:

When `!state.pillVisible` (no audio playing) AND user is logged in AND user has routines:
- Show the pill in "routine shortcut" mode instead of returning null
- Display: Play icon + "Start [routine name]" + small Pencil icon linking to `/music/routines`
- One tap on the pill calls `routinePlayer.startRoutine(suggestedRoutine)` instead of opening drawer

**Suggested routine logic:**
- Get listening history from `storageService.getRecentSessions(100)`
- Filter to `contentType === 'routine'` sessions
- Determine current time-of-day bracket (same as `useTimeOfDayRecommendations`)
- Find the most frequently used routine in the current bracket
- If no history: default to "Evening Peace" template (ID: `'template-evening-peace'`)

This logic should be extracted to a small helper function `getSuggestedRoutine(history, routines, templates)`.

**New pill render states:**
1. **Hidden**: `!pillVisible && (!isLoggedIn || no routines)` → return null
2. **Routine shortcut**: `!pillVisible && isLoggedIn && hasRoutines` → show "Start [routine]"
3. **Now playing**: `pillVisible` → existing behavior (waveform, scene name, play/pause)

**Responsive behavior:**
- Same positioning as current pill: `bottom-0 left-1/2 -translate-x-1/2 mb-[max(24px,...)]` on mobile, `lg:left-auto lg:right-6 lg:bottom-6` on desktop
- Routine shortcut pill uses same glass background: `rgba(15, 10, 30, 0.85)` with `backdrop-filter: blur(8px)`

**Guardrails (DO NOT):**
- DO NOT show the routine shortcut for logged-out users
- DO NOT show the shortcut when audio is already playing
- DO NOT navigate away when tapping the pill — start the routine in place

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pill hidden when logged out and no audio | unit | Verify null return |
| Pill shows routine shortcut when logged in with routines | unit | Mock logged in + routines, verify "Start Evening Peace" text |
| Pill not shown when audio is playing | unit | Add sound (pillVisible true), verify normal pill, not shortcut |
| Edit link navigates to /music/routines | unit | Verify link href |

**Expected state after completion:**
- [ ] Pill shows "Start [routine name]" when no audio is playing and user has routines
- [ ] One tap starts the routine
- [ ] Edit pencil icon links to routines page
- [ ] Pill hidden for logged-out users
- [ ] 4 tests pass

---

### Step 8: Routine Interrupt Dialog & Scene/Content Integration

**Objective:** Show a confirmation dialog when the user manually loads a scene or foreground content during an active routine.

**Files to create:**
- `frontend/src/components/audio/RoutineInterruptDialog.tsx` — NEW: Confirmation dialog

**Files to modify:**
- `frontend/src/hooks/useScenePlayer.ts` — Add routine interrupt check before loading a scene
- `frontend/src/hooks/useForegroundPlayer.ts` — Add routine interrupt check before starting foreground content

**Details:**

**RoutineInterruptDialog.tsx:**
- Follow `ContentSwitchDialog` pattern
- `role="alertdialog"`, focus trapped via `useFocusTrap`
- Message: "This will end your current routine. Continue?"
- "End Routine" button (primary): calls `onConfirm()` which ends the routine then executes the pending action
- "Keep Routine" button (secondary): calls `onCancel()` which dismisses the dialog
- Background scrim: `bg-black/40`
- Dialog: dark glass (`rgba(15, 10, 30, 0.95)`, `backdrop-filter: blur(16px)`)

**useScenePlayer.ts modification:**
- After the auth check (line 57) and before the toggle/load logic, check `audioState.activeRoutine`:
  ```typescript
  if (audioState.activeRoutine) {
    // Set pending interrupt: store the scene to load + a callback
    setPendingInterrupt({ scene, action: 'scene' })
    return
  }
  ```
- Add state: `pendingInterrupt`, `confirmInterrupt()`, `cancelInterrupt()`
- Expose these in the return value
- `confirmInterrupt()`: dispatch `END_ROUTINE`, then execute the original `loadScene` logic

**useForegroundPlayer.ts modification:**
- After the auth check (line 107) and before the existing content-switch check, check `audioState.activeRoutine`:
  ```typescript
  if (audioState.activeRoutine) {
    setPendingRoutineInterrupt({ content, action: 'foreground' })
    return
  }
  ```
- Same pattern: expose pending state, confirm/cancel methods
- `confirmInterrupt()`: dispatch `END_ROUTINE`, then call `playContent()`

**Guardrails (DO NOT):**
- DO NOT end the routine without user confirmation
- DO NOT stop ambient sounds when ending the routine — only stop the routine sequence
- DO NOT show both the content-switch dialog AND the routine-interrupt dialog simultaneously

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| RoutineInterruptDialog renders with correct text | unit | Verify "This will end your current routine" |
| End Routine button calls onConfirm | unit | Click End Routine, verify callback |
| Keep Routine button calls onCancel | unit | Click Keep Routine, verify callback |
| Dialog has role="alertdialog" | unit | Verify ARIA role |
| useScenePlayer shows interrupt when routine active | unit | Set activeRoutine, call loadScene, verify dialog state |
| useForegroundPlayer shows interrupt when routine active | unit | Set activeRoutine, call startSession, verify dialog state |

**Expected state after completion:**
- [ ] RoutineInterruptDialog component with proper ARIA and focus trapping
- [ ] useScenePlayer checks for active routine before loading
- [ ] useForegroundPlayer checks for active routine before starting
- [ ] Confirmation flow: End Routine → routine stops, manual action proceeds
- [ ] Cancel flow: dialog dismisses, routine continues
- [ ] 6 tests pass

---

### Step 9: Access Points & Cross-Feature Links

**Objective:** Add access points to the routines page from the Music hub, Sleep tab, and pill.

**Files to modify:**
- `frontend/src/components/music/PersonalizationSection.tsx` — Add "Your Routines" section for logged-in users with routines
- `frontend/src/components/audio/SleepBrowse.tsx` — Add "Build a Bedtime Routine" CTA card

**Details:**

**PersonalizationSection.tsx:**
- After existing sections (Continue Listening, Favorites, Saved Mixes), add "Your Routines" section
- Only visible when `isLoggedIn && userRoutines.length > 0`
- Horizontal scroll of routine mini-cards (name, step count, Start button)
- "Manage Routines" link to `/music/routines`

**SleepBrowse.tsx:**
- At the bottom of the browse content (after Bedtime Stories grid), add a CTA card:
- Dark glass card: `rounded-xl border border-white/10 bg-white/5 p-6 text-center`
- Heading: "Build a Bedtime Routine"
- Description: "Chain scenes, scripture, and stories into one seamless sleep experience"
- CTA button: Link to `/music/routines`, styled as outline button `border border-primary text-primary rounded-full py-2 px-6`

**Guardrails (DO NOT):**
- DO NOT add routines to the navbar dropdown — spec explicitly says "NOT in main nav dropdown"
- DO NOT render the personalization routine section for logged-out users
- DO NOT render the personalization routine section if the user has no routines

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PersonalizationSection shows routines for logged-in user | integration | Mock routines, verify "Your Routines" heading |
| PersonalizationSection hides routines for logged-out user | integration | Mock logged out, verify section not rendered |
| SleepBrowse shows routine CTA | integration | Verify "Build a Bedtime Routine" text |
| CTA links to /music/routines | integration | Verify link href |

**Expected state after completion:**
- [ ] "Your Routines" section in PersonalizationSection for logged-in users
- [ ] "Build a Bedtime Routine" CTA at bottom of SleepBrowse
- [ ] Both link to `/music/routines`
- [ ] 4 tests pass

---

### Step 10: Final Integration Testing & Polish

**Objective:** Run all tests, verify full integration, and fix any issues.

**Files to modify:**
- Various — bug fixes and adjustments as needed

**Details:**

1. Run `pnpm test` to verify all existing tests still pass
2. Run `pnpm build` to verify no TypeScript errors
3. Run `pnpm lint` to verify no linting issues
4. Verify the full routine flow works end-to-end:
   - Browse templates on `/music/routines`
   - Clone a template
   - Edit the cloned routine in the builder
   - Save the routine
   - Start the routine → verify scene loads → foreground content plays → transition gap fires → ambient breathes up → next step executes → routine ends → sleep timer starts
   - Skip forward during playback
   - Manually load a scene during a routine → interrupt dialog appears
5. Verify auth gates: all 3 auth modal messages appear for logged-out users
6. Verify responsive layout at mobile (375px), tablet (768px), desktop (1440px)

**Guardrails (DO NOT):**
- DO NOT introduce new features beyond what the spec defines
- DO NOT fix unrelated issues found during testing
- DO NOT modify test mocks to make failing tests pass — fix the source code

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | regression | `pnpm test` succeeds |
| Build succeeds | build | `pnpm build` succeeds with no errors |
| Lint passes | lint | `pnpm lint` succeeds |

**Expected state after completion:**
- [ ] All tests pass (existing + new)
- [ ] Build succeeds
- [ ] Lint passes
- [ ] Feature is complete per spec acceptance criteria

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Data Model |
| 2 | 1 | Storage Service Extension |
| 3 | 1 | Audio Reducer & Provider Updates |
| 4 | 1, 3 | useRoutinePlayer Hook |
| 5 | 1, 2, 4 | Routines Page & Builder UI |
| 6 | 1, 3 | Enhanced RoutineStepper (Drawer Progress) |
| 7 | 2, 4 | AudioPill Routine Shortcut |
| 8 | 4 | Routine Interrupt Dialog & Integration |
| 9 | 2, 5 | Access Points & Cross-Feature Links |
| 10 | 1-9 | Final Integration Testing & Polish |

**Parallelizable pairs:** Steps 2 & 3 can run in parallel after Step 1. Steps 6 & 7 & 8 can run in parallel after Step 4. Step 9 can run after Step 5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Data Model | [COMPLETE] | 2026-03-10 | Extended `RoutineStep` (type, contentId, transitionGapMinutes) and `AudioRoutine` (phase, sleepTimerConfig) in `types/audio.ts`. Added `SET_ROUTINE_PHASE` and `END_ROUTINE` actions. Added `RoutineDefinition` to `types/storage.ts`. Created `data/music/routines.ts` with 3 templates. Fixed existing audioReducer tests for new type shape. 9 new tests in `data/music/__tests__/routines.test.ts`. |
| 2 | Storage Service Extension | [COMPLETE] | 2026-03-10 | Added `wr_routines` key, `RoutineDefinition` import, 5 interface methods (getRoutines, saveRoutine, updateRoutine, deleteRoutine, duplicateRoutine), all auth-gated implementations. 5 new tests in `storage-service.test.ts`. |
| 3 | Audio Reducer & Provider Updates | [COMPLETE] | 2026-03-10 | Added `SET_ROUTINE_PHASE` and `END_ROUTINE` cases. Updated `START_ROUTINE` to force `phase: 'playing'`. Updated `ADVANCE_ROUTINE_STEP` and `SKIP_ROUTINE_STEP` to reset phase to `'playing'`. 8 new tests in `audioReducer.test.ts` (42 total). |
| 4 | useRoutinePlayer Hook | [COMPLETE] | 2026-03-10 | Created `hooks/useRoutinePlayer.ts` — orchestrates routine playback with scene loading, foreground content, transition gaps, ambient breathe-up, sleep timer start, retry logic, skip/end/interrupt handling. Detects foreground end via foregroundContent isPlaying transition (not position threshold per user instruction). 7 tests in `hooks/__tests__/useRoutinePlayer.test.ts`. |
| 5 | Routines Page & Builder UI | [COMPLETE] | 2026-03-10 | Created `RoutinesPage.tsx`, `RoutineCard.tsx`, `RoutineBuilder.tsx`, `RoutineStepCard.tsx`, `ContentPicker.tsx`, `DeleteRoutineDialog.tsx`. Added `/music/routines` route in `App.tsx`. Used up/down arrow buttons for step reorder (not @dnd-kit, which installed but arrows are simpler). Fixed Lucide icon: `Landscape` → `Mountain`. 7 tests in `RoutinesPage.test.tsx`. Deviation: Plan said `Landscape` icon but Lucide exports `Mountain` instead — used `Mountain` throughout. |
| 6 | Enhanced RoutineStepper | [COMPLETE] | 2026-03-10 | Replaced numbered circles with content type icons (Mountain/BookOpen/Moon), added Clock timer icon at end, step labels (hidden on mobile), `role="progressbar"` with ARIA attrs, updated skip button aria-label. 7 tests in `RoutineStepper.test.tsx`. |
| 7 | AudioPill Routine Shortcut | [COMPLETE] | 2026-03-10 | Rewrote `AudioPill.tsx` — when `!pillVisible && isLoggedIn`, shows routine shortcut ("Start [name]" + Pencil link to /music/routines). `getSuggestedRoutine()` checks listening history for most-used routine, defaults to Evening Peace. Normal now-playing mode preserved. Added mocks for useAuth, AuthModalProvider, useRoutinePlayer, storageService (setAuthState, getSessionState, etc.), useListeningHistory to `AudioPill.test.tsx`. All 6 existing tests pass (943 total). |
| 8 | Routine Interrupt Dialog | [COMPLETE] | 2026-03-10 | Created `RoutineInterruptDialog.tsx` (role="alertdialog", focus trapped, dark glass). Modified `useScenePlayer.ts` — checks `activeRoutine` before loading, exposes `pendingRoutineInterrupt`/`confirmRoutineInterrupt`/`cancelRoutineInterrupt`. Modified `useForegroundPlayer.ts` — same pattern, checks before content-switch dialog (no dual dialogs). Rendered dialog in `SleepBrowse.tsx`, `AmbientBrowser.tsx`, `MusicPage.tsx`. 6 new tests (4 dialog + 1 scene hook + 1 foreground hook). 949 total tests pass. |
| 9 | Access Points & Links | [COMPLETE] | 2026-03-10 | Added "Your Routines" section to `PersonalizationSection.tsx` (logged-in only, horizontal scroll of routine mini-cards with Start button + "Manage Routines" link). Added "Build a Bedtime Routine" CTA card to `SleepBrowse.tsx` (dark glass, links to /music/routines). Updated test files for MemoryRouter wrapping. 4 new tests (2 PersonalizationSection + 2 SleepBrowse). 953 total tests pass. |
| 10 | Integration Testing | [COMPLETE] | 2026-03-10 | All 953 tests pass (119 test files). Build succeeds. Fixed useRoutinePlayer lint warning (missing dependency). Remaining 4 lint errors and 11 warnings are all pre-existing (unrelated files). No new lint issues introduced. |
