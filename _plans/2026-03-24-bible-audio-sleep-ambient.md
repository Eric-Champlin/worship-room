# Implementation Plan: Bible Audio Sleep Timer & Ambient Pairing

**Spec:** `_specs/bible-audio-sleep-ambient.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/bible-audio-sleep-ambient`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** not applicable (standalone spec building on prior specs)

---

## Architecture Context

### Existing File Structure

- **Bible reader page**: `frontend/src/pages/BibleReader.tsx` — main page component at `/bible/:book/:chapter`
- **Audio control bar**: `frontend/src/components/bible/AudioControlBar.tsx` — sticky bar with play/pause/stop, speed pills, voice toggle, verse progress
- **Bible audio hook**: `frontend/src/hooks/useBibleAudio.ts` — Speech Synthesis TTS, verse-by-verse playback, ambient volume reduction, sleep timer phase detection
- **Bible ambient chip**: `frontend/src/components/bible/BibleAmbientChip.tsx` — "Add background sounds" pill, expands to show 3 suggested scenes
- **Ambient suggestions**: `frontend/src/constants/ambient-suggestions.ts` — maps contexts to scene IDs, `bible-reading` context currently → `['still-waters', 'the-upper-room', 'morning-mist']`
- **Scene presets**: `frontend/src/data/scenes.ts` — 8 scenes with `SCENE_PRESETS` array and `SCENE_BY_ID` map
- **Scene backgrounds**: `frontend/src/data/scene-backgrounds.ts` — CSS gradient patterns per scene ID
- **Sound catalog**: `frontend/src/data/sound-catalog.ts` — 24 sounds with `SOUND_BY_ID` map
- **Routine templates**: `frontend/src/data/music/routines.ts` — 3 `RoutineDefinition` templates
- **Routine player**: `frontend/src/hooks/useRoutinePlayer.ts` — auth-gated, starts scenes + foreground content
- **Sleep timer hook**: `frontend/src/hooks/useSleepTimer.ts` — `SleepTimerControls` with start/pause/resume/cancel, phase tracking (full-volume → fading → complete)
- **Audio provider**: `frontend/src/components/audio/AudioProvider.tsx` — exposes `useAudioState()`, `useAudioDispatch()`, `useAudioEngine()`, `useSleepTimerControls()`
- **Sleep browse tab**: `frontend/src/components/audio/SleepBrowse.tsx` — Sleep & Rest tab content
- **Audio constants**: `frontend/src/constants/audio.ts` — `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]`
- **Scene player hook**: `frontend/src/hooks/useScenePlayer.ts` — auth-gated `loadScene()`, staggered sound loading

### Key Patterns

- **Auth gating**: `useAuth()` + `useAuthModal()` pattern. Scene loading calls `authModal?.openAuthModal('Sign in to play ambient scenes')` if `!isAuthenticated`.
- **Inline panel pattern**: `BibleAmbientChip.tsx` uses click-outside + Escape dismissal, focus management, `aria-expanded` + `aria-controls`. Timer panel should follow the same pattern.
- **Sleep timer centralized**: One timer via `useSleepTimerControls()` — `start(totalDurationMs, fadeDurationMs)`. No separate timer for Bible reader.
- **Ambient volume reduction in useBibleAudio**: Currently sets `masterVolume` to 0.3 when TTS plays, restores on pause/stop. Spec replaces this with proper per-verse ducking using `linearRampToValueAtTime`.
- **RoutineDefinition type**: `{ id, name, description?, isTemplate, steps: [{id, type, contentId, transitionGapMinutes}], sleepTimer: {durationMinutes, fadeDurationMinutes}, createdAt, updatedAt }`. Step types: `'scene' | 'scripture' | 'story'`. The Bible Before Bed routine needs a new step type or a navigation action — it navigates to a Bible page rather than playing foreground audio.

### Test Patterns

- Tests in `__tests__/` subdirectories or co-located `.test.ts(x)` files
- Use `vitest`, `@testing-library/react`, `@testing-library/user-event`
- Mock `speechSynthesis` globally with `vi.fn()` for all methods
- Mock `AudioProvider` contexts via `vi.mock('@/components/audio/AudioProvider')`
- Mock `useAuth` and `useAuthModal` for auth gating tests
- Component tests use `render()` + `screen.getBy*` queries with ARIA labels
- Hook tests use `renderHook()` with `act()` for state updates

### Scene Preset Structure

```typescript
interface ScenePreset {
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

**Note on ScenePreset.tags**: The spec mentions a `"bibleReading"` category tag, but `ScenePreset.tags` has `activity: SoundActivity[]` where `SoundActivity = 'prayer' | 'sleep' | 'study' | 'relaxation'`. There's no `category` field on scenes. The simplest approach is to add `'bible-reading'` to `SoundActivity` type and use it in the `activity` array. This keeps the type system consistent.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Start Timer" button | Auth modal for logged-out | Step 2 | `useAuth` + `useAuthModal` |
| Bible reading scene card click (ambient chip) | Auth modal for logged-out | Step 3 (via existing `useScenePlayer` auth gate) | Existing `useScenePlayer` auth gate |
| "Bible Before Bed" routine launch | Auth modal for logged-out | Step 5 (via existing `useRoutinePlayer` auth gate) | Existing `useRoutinePlayer` auth gate |
| Quick-start options (Sleep tab) | Auth modal for logged-out scene start | Step 6 | `useAuth` + `useAuthModal` |
| `?autoplay=true` | Silently ignored for logged-out | Step 5 | `useAuth().isAuthenticated` check |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Timer panel container | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4` | Spec + AudioControlBar pattern |
| Duration pills (unselected) | style | `border border-white/20 text-white/50 hover:text-white/70 rounded-full` | Spec |
| Duration pills (selected) | style | `bg-primary text-white rounded-full` | Spec |
| Fade pills (unselected) | style | `text-xs text-white/40` | Spec |
| Fade pills (selected) | style | `text-xs bg-primary/20 text-primary` | Spec |
| Custom input | style | `bg-white/5 border border-white/15 rounded-lg` | Spec |
| Start Timer button | style | `bg-primary hover:bg-primary-lt text-white rounded-lg py-2.5 font-medium w-full` | Spec |
| Active timer text | style | `text-lg font-semibold text-white` | Spec |
| Cancel button | style | `text-white/40 hover:text-danger text-sm` | Spec |
| Conflict message | style | `text-sm text-white/50` | Spec |
| Adjust link | style | `text-primary hover:text-primary-lt underline` | Spec |
| Progress ring | size | 24px diameter, `stroke: primary` (2px), track `stroke: white/10` | Spec |
| Timer button (inactive) | color | `text-white/40` | Spec |
| Timer button (active) | color | `text-primary` | Spec |
| Bible hero card (Sleep tab) | style | Frosted glass + warm amber-to-purple gradient | Spec |
| Quick-start cards | style | Same as existing Sleep & Rest content cards | SleepBrowse.tsx |

---

## Design System Reminder

- Worship Room uses Caveat for script/highlighted headings, not Lora
- Audio control bar uses frosted glass: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- All Bible reader content is within `max-w-2xl mx-auto px-4 sm:px-6`
- Pill buttons use `rounded-full` consistently
- Speed pills in AudioControlBar: selected = `bg-primary/20 text-primary`, unselected = `text-white/50`
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Music Sleep tab uses light theme: `bg-white rounded-xl border border-gray-200 shadow-sm` cards
- Primary color: `#6D28D9`. Primary light: `#8B5CF6`
- All interactive elements must have 44px minimum touch targets
- `prefers-reduced-motion` must be respected for all animations

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Timer panel pills wrap to 2 rows (3+3); Sleep tab quick-start cards stack vertically; progress ring 24px with 44px touch padding |
| Tablet | 768px | All timer pills single row; quick-start cards horizontal row; panel within max-w-2xl |
| Desktop | 1440px | Same as tablet with hover states; progress ring gets hover tooltip |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| AudioControlBar → Timer panel | 8px (mt-2) | Follows BibleAmbientChip spacing pattern |
| AudioControlBar → BibleAmbientChip | 8px (mt-2) | Existing: BibleReader.tsx line 417 |
| Timer panel → BibleAmbientChip | 8px (mt-2) | Consistent with above |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Specs 23-25 (Bible reader, highlights/notes, audio playback) are complete and committed
- [ ] Music feature (Sleep timer, Ambient mixer, Scenes, Routines) is complete and committed
- [ ] Ambient cross-pollination (Spec 6) is complete — `BibleAmbientChip` exists
- [ ] All auth-gated actions from the spec are accounted for in the plan (5 actions)
- [ ] Design system values are verified from spec + codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] `SoundActivity` type needs extending with `'bible-reading'` for new scene tags

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scene category tagging | Add `'bible-reading'` to `SoundActivity` type union | No existing `category` field on ScenePreset; using `activity` array is consistent with existing scenes |
| Bible Before Bed routine step 2 | New step type `'bible-navigate'` on RoutineDefinition | Existing types only support `scene`, `scripture`, `story` — Bible reader navigation is fundamentally different (navigates to a page, doesn't play foreground audio). Adding a new type is cleaner than overloading `scripture`. |
| Audio ducking approach | Replace current `setMasterVolume(0.3)` in useBibleAudio with `linearRampToValueAtTime` on masterGainNode | Spec requires smooth 200ms ramps rather than the current instant volume change. This is a modification of existing behavior. |
| Timer panel placement | Below AudioControlBar, above BibleAmbientChip | Follows spec's "inline panel directly below the audio control bar" requirement. Ambient chip moves below timer panel when timer panel is open. |
| Panel mutual exclusion | Opening timer panel closes ambient panel and vice versa | Spec requirement: "Only one inline panel should be open at a time" |
| Random Psalm selection | All 150 chapters eligible (Psalms `hasFullText: true`) | Spec says "randomly selected from the available Psalm chapters (1-150)" |

---

## Implementation Steps

### Step 1: Add Bible Reading Scene Presets & Background Patterns

**Objective:** Add 3 new ambient scenes tagged for Bible reading, their CSS backgrounds, and update the ambient suggestion mapping.

**Files to create/modify:**
- `frontend/src/types/music.ts` — Add `'bible-reading'` to `SoundActivity` type
- `frontend/src/data/scenes.ts` — Add 3 new `ScenePreset` entries
- `frontend/src/data/scene-backgrounds.ts` — Add 3 new CSS background patterns
- `frontend/src/constants/ambient-suggestions.ts` — Update `bible-reading` context to use the 3 new scene IDs

**Details:**

1. **Extend `SoundActivity` type** in `types/music.ts`:
   ```typescript
   export type SoundActivity = 'prayer' | 'sleep' | 'study' | 'relaxation' | 'bible-reading'
   ```

2. **Add 3 scenes** to `SCENE_PRESETS` in `data/scenes.ts`:

   **"Peaceful Study"**:
   ```typescript
   {
     id: 'peaceful-study',
     name: 'Peaceful Study',
     description: 'A calm, non-distracting atmosphere for focused reading. Soft piano and gentle streams guide your mind into the Word.',
     artworkFilename: 'peaceful-study.svg',
     sounds: [
       { soundId: 'soft-piano', volume: 0.3 },
       { soundId: 'gentle-wind', volume: 0.2 },
       { soundId: 'flowing-stream', volume: 0.25 },
     ],
     tags: {
       mood: ['peaceful'],
       activity: ['bible-reading', 'study'],
       intensity: 'very_calm',
       scriptureTheme: ['comfort'],
     },
     animationCategory: 'drift',
   }
   ```

   **"Evening Scripture"**:
   ```typescript
   {
     id: 'evening-scripture',
     name: 'Evening Scripture',
     description: 'A warm evening atmosphere for winding down with the Word. Crickets chirp softly as a fire crackles nearby.',
     artworkFilename: 'evening-scripture.svg',
     sounds: [
       { soundId: 'night-crickets', volume: 0.25 },
       { soundId: 'fireplace', volume: 0.3 },
       { soundId: 'ambient-pads', volume: 0.2 },
     ],
     tags: {
       mood: ['contemplative'],
       activity: ['bible-reading', 'sleep'],
       intensity: 'very_calm',
       scriptureTheme: ['rest'],
     },
     animationCategory: 'pulse',
   }
   ```

   **"Sacred Space"**:
   ```typescript
   {
     id: 'sacred-space',
     name: 'Sacred Space',
     description: 'A reverent, church-like atmosphere. Cathedral echoes and a distant choir hum fill the stillness around you.',
     artworkFilename: 'sacred-space.svg',
     sounds: [
       { soundId: 'cathedral-reverb', volume: 0.2 },
       { soundId: 'choir-hum', volume: 0.15 },
       { soundId: 'church-bells', volume: 0.1 },
     ],
     tags: {
       mood: ['contemplative'],
       activity: ['bible-reading', 'prayer'],
       intensity: 'immersive',
       scriptureTheme: ['trust'],
     },
     animationCategory: 'glow',
   }
   ```

3. **Add CSS backgrounds** in `data/scene-backgrounds.ts`:

   - **peaceful-study**: Soft blue-teal tones with flowing wave-like gradients (evokes study calm)
   - **evening-scripture**: Warm orange-brown tones with ember-like radial gradients (evokes fireside evening)
   - **sacred-space**: Deep purple-blue tones with vertical column-like repeating gradients (evokes cathedral stone)

4. **Update `ambient-suggestions.ts`**: Change `bible-reading` mapping to:
   ```typescript
   'bible-reading': ['peaceful-study', 'evening-scripture', 'sacred-space'],
   ```

**Guardrails (DO NOT):**
- DO NOT remove or modify existing scenes
- DO NOT change the `FEATURED_SCENE_IDS` array
- DO NOT add sounds that don't exist in `SOUND_BY_ID` catalog

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `scenes.test.ts`: new scenes have valid sound IDs | unit | Verify all 3 new scenes reference sounds that exist in `SOUND_BY_ID` |
| `scenes.test.ts`: new scenes have correct tags | unit | Verify `bible-reading` is in the activity array for all 3 new scenes |
| `scenes.test.ts`: SCENE_BY_ID includes new scenes | unit | Verify `SCENE_BY_ID.get('peaceful-study')` etc. return the scenes |
| `scene-backgrounds.test.ts`: new scenes have backgrounds | unit | Verify `getSceneBackground()` returns truthy for all 3 new IDs |
| `ambient-suggestions.test.ts`: bible-reading context returns new scenes | unit | Verify `getSuggestedScenes('bible-reading')` returns the 3 new scenes |

**Expected state after completion:**
- [ ] 3 new scenes appear in `SCENE_PRESETS` and `SCENE_BY_ID`
- [ ] `getSuggestedScenes('bible-reading')` returns the 3 Bible reading scenes
- [ ] Each new scene has a CSS background pattern
- [ ] Existing scenes and suggestions are unchanged
- [ ] All tests pass

---

### Step 2: Sleep Timer Panel Component for Bible Reader

**Objective:** Create the inline sleep timer panel UI that appears below the audio control bar in the Bible reader.

**Files to create/modify:**
- `frontend/src/components/bible/SleepTimerPanel.tsx` — New component
- `frontend/src/components/bible/__tests__/SleepTimerPanel.test.tsx` — Tests

**Details:**

The `SleepTimerPanel` is an inline panel (not modal, not drawer) that shows below the audio control bar. It has three states:

**State 1 — Timer Setup (no active timer)**:
- Duration presets: `SLEEP_TIMER_OPTIONS` (15, 30, 45, 60, 90) as selectable pills + "Custom" pill
- Custom input: appears when "Custom" selected, number input 5-480 min range, step 5
- Fade duration: `[5, 10, 15]` from `FADE_DURATION_OPTIONS` as smaller pills (default: 10)
- "Start Timer" button: full-width primary, disabled until duration selected
- Auth gating: "Start Timer" calls `authModal?.openAuthModal('Sign in to use the sleep timer')` if not authenticated; otherwise calls `sleepTimerControls.start(durationMs, fadeMs)`

**State 2 — Active Timer (started from this or Music)**:
- Shows remaining time as `text-lg font-semibold text-white`
- "Cancel" text button below

**State 3 — Conflict (timer already active from Music page)**:
- Shows remaining time
- "Timer already running from Music" message
- "Adjust" button that opens AudioDrawer Timer tab: `dispatch({ type: 'OPEN_DRAWER' })` (drawer opens to Timer tab)
- No "Start Timer" button shown

**Props:**
```typescript
interface SleepTimerPanelProps {
  isOpen: boolean
  onClose: () => void
}
```

The component internally uses:
- `useSleepTimerControls()` for timer state and actions
- `useAuth()` + `useAuthModal()` for auth gating
- `useAudioDispatch()` for opening the drawer

**Dismiss patterns** (same as `BibleAmbientChip`):
- Click outside container → close
- Escape key → close and return focus to timer button
- After starting timer → close

**Accessibility:**
- Duration pills: `role="radiogroup"` + `role="radio"` + `aria-checked`
- Fade pills: `role="radiogroup"` + `role="radio"` + `aria-checked`
- "Start Timer" button: `aria-label` includes selected duration and fade (e.g., "Start 30 minute sleep timer with 10 minute fade")
- Cancel: `aria-label="Cancel sleep timer"`
- Conflict message: `aria-live="polite"` region
- Keyboard: Tab between controls, Enter/Space to activate pills

**Responsive behavior:**
- Mobile (375px): Duration pills wrap to 2 rows (3 per row). Fade pills single row. Full width.
- Tablet (768px): All pills single row. Panel within max-w-2xl.
- Desktop (1440px): Same as tablet with more spacing.

**Guardrails (DO NOT):**
- DO NOT create a separate timer system — use `useSleepTimerControls()` exclusively
- DO NOT allow starting a second timer when one is active
- DO NOT show "Start Timer" when a timer is already active (show active timer state or conflict state)
- DO NOT use a modal or drawer — inline panel only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders duration pills | unit | All 5 preset pills + Custom pill visible |
| renders fade pills | unit | 3 fade duration pills visible, 10min selected by default |
| Start Timer disabled until duration selected | unit | Button disabled initially, enabled after selecting duration |
| custom input appears when Custom pill selected | unit | Number input appears with min=5, max=480, step=5 |
| auth modal shown for logged-out user clicking Start Timer | integration | Verifies `openAuthModal` called with "Sign in to use the sleep timer" |
| Start Timer calls sleepTimerControls.start | integration | Verifies start called with correct ms values |
| shows active timer with remaining time | unit | When timer active, shows remaining time text |
| shows cancel button for active timer | unit | Cancel button visible, calls `sleepTimerControls.cancel()` |
| conflict state shows "Timer already running from Music" | unit | When timer was not started from Bible reader, shows conflict message |
| Adjust button opens drawer | unit | Verifies dispatch OPEN_DRAWER called |
| duration pills use role="radiogroup" | unit | ARIA roles correct |
| fade pills use role="radiogroup" | unit | ARIA roles correct |
| Escape closes panel | unit | onClose called on Escape |
| click outside closes panel | unit | onClose called on click outside |

**Expected state after completion:**
- [ ] `SleepTimerPanel` component renders all three states correctly
- [ ] Auth gating works for logged-out users
- [ ] Timer starts using centralized `useSleepTimerControls()`
- [ ] All accessibility requirements met
- [ ] All tests pass

---

### Step 3: Integrate Sleep Timer into Bible Reader Audio Bar

**Objective:** Add the timer button, progress ring, and timer panel to the Bible reader's audio control bar. Implement panel mutual exclusion with the ambient chip.

**Files to create/modify:**
- `frontend/src/components/bible/SleepTimerProgressRing.tsx` — New compact 24px SVG ring
- `frontend/src/components/bible/AudioControlBar.tsx` — Add timer button + progress ring
- `frontend/src/pages/BibleReader.tsx` — Add SleepTimerPanel, manage panel open state, mutual exclusion with ambient chip
- `frontend/src/components/bible/BibleAmbientChip.tsx` — Accept `onExpand` callback for mutual exclusion
- `frontend/src/components/bible/__tests__/SleepTimerProgressRing.test.tsx` — Tests

**Details:**

1. **SleepTimerProgressRing** — Compact 24px SVG circle:
   - Track: `stroke: rgba(255,255,255,0.1)` (white/10), 2px stroke
   - Progress: `stroke: #6D28D9` (primary), 2px stroke, depleting clockwise
   - Uses `remainingMs / totalDurationMs` to compute `stroke-dashoffset`
   - `aria-label="Sleep timer: X minutes remaining"`
   - Click handler opens timer panel
   - 44px touch target via surrounding padding
   - Only visible when timer is active

2. **AudioControlBar updates**:
   - Add `onTimerClick` prop and `isTimerActive` prop and `timerRemainingMs`/`timerTotalDurationMs` props
   - Timer button: Lucide `Timer` icon, `text-white/40` default, `text-primary` when active
   - Progress ring to the left of the timer button (only when active)
   - Timer button `aria-label`: "Sleep timer" when inactive, "Sleep timer active — X minutes remaining" when active
   - `aria-expanded` on timer button tied to panel open state

3. **BibleReader.tsx updates**:
   - Add state: `timerPanelOpen` (boolean)
   - Pass `onTimerClick` to AudioControlBar that toggles `timerPanelOpen`
   - Render `SleepTimerPanel` between AudioControlBar and BibleAmbientChip (conditionally)
   - **Mutual exclusion**: When timer panel opens, close ambient chip (pass callback to BibleAmbientChip). When ambient chip expands, close timer panel.
   - Wire `useSleepTimerControls()` to pass `isActive`, `remainingMs`, `totalDurationMs` to AudioControlBar

4. **BibleAmbientChip.tsx updates**:
   - Accept optional `onExpand?: () => void` prop
   - Call `onExpand?.()` when the chip expands its suggestion panel
   - Accept optional `forceCollapse?: boolean` prop to allow parent to collapse it

**Responsive behavior:**
- Mobile: Timer button and ring fit within existing flex-wrap layout
- Progress ring: 24px with padding for 44px touch target
- Desktop: hover tooltip on progress ring showing remaining time (use `title` attribute)

**Guardrails (DO NOT):**
- DO NOT add the timer panel inside AudioControlBar — it renders in BibleReader.tsx below the bar
- DO NOT remove any existing AudioControlBar functionality
- DO NOT create a new timer — read from existing `useSleepTimerControls()`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SleepTimerProgressRing renders correct SVG | unit | Correct viewBox, stroke colors, stroke-dashoffset |
| Progress ring hidden when no timer active | unit | Not rendered when `isActive` is false |
| Progress ring shows correct remaining time in aria-label | unit | Dynamic label updates |
| Timer button renders in AudioControlBar | unit | Timer icon visible |
| Timer button color changes when active | unit | `text-primary` class when active |
| Timer button aria-expanded reflects panel state | unit | true when panel open |
| Mutual exclusion: opening timer closes ambient panel | integration | Both panels can't be open simultaneously |
| Mutual exclusion: opening ambient closes timer panel | integration | Both panels can't be open simultaneously |

**Expected state after completion:**
- [ ] Timer button visible in audio control bar
- [ ] Progress ring appears when timer active
- [ ] Timer panel opens/closes from timer button
- [ ] Only one panel (timer or ambient) open at a time
- [ ] All tests pass

---

### Step 4: Audio Ducking System

**Objective:** Replace the current instant ambient volume reduction with smooth per-verse ducking using Web Audio API gain ramps.

**Files to create/modify:**
- `frontend/src/hooks/useAudioDucking.ts` — New hook encapsulating ducking logic
- `frontend/src/hooks/useBibleAudio.ts` — Remove old `reduceAmbientVolume`/`restoreAmbientVolume`, integrate ducking hook
- `frontend/src/hooks/__tests__/useAudioDucking.test.ts` — Tests

**Details:**

1. **`useAudioDucking` hook**:
   ```typescript
   interface UseAudioDuckingOptions {
     engine: AudioEngineService | null
     activeSoundsCount: number
     masterVolume: number
     sleepTimerPhase: 'full-volume' | 'fading' | 'complete' | null
   }

   interface UseAudioDuckingReturn {
     duckForVerse: () => void    // Called on utterance.onstart
     unduckForPause: () => void  // Called on utterance.onend (inter-verse)
     unduckImmediate: () => void // Called on TTS pause (user action)
     unduckWithRamp: () => void  // Called on TTS stop
     isDucked: boolean
   }
   ```

   **Ducking behavior:**
   - `duckForVerse()`: Ramp `masterGainNode.gain` to `currentVolume * 0.25` over 200ms via `linearRampToValueAtTime`
   - `unduckForPause()`: Ramp back to `currentVolume` over 200ms
   - `unduckImmediate()`: Set gain directly (no ramp) — used when user explicitly pauses TTS
   - `unduckWithRamp()`: Ramp back to `currentVolume` over 200ms — used when TTS stops
   - If user's volume is already ≤ 25% of master, do not reduce further
   - No-op if no ambient sounds playing (`activeSoundsCount === 0`)
   - During sleep timer fade: "full volume" for unduck is the fade-attenuated level (read current gain value, not saved user volume)

2. **`useBibleAudio.ts` modifications:**
   - Remove `savedVolumeRef`, `reduceAmbientVolume()`, `restoreAmbientVolume()`
   - Import and use `useAudioDucking`
   - In `speakVerse()`: call `ducking.duckForVerse()` instead of `reduceAmbientVolume()`
   - In utterance `onend`: call `ducking.unduckForPause()` before the inter-verse delay
   - In `pause()`: call `ducking.unduckImmediate()` instead of `restoreAmbientVolume()`
   - In `stop()`: call `ducking.unduckWithRamp()` instead of `restoreAmbientVolume()`
   - In chapter complete: call `ducking.unduckWithRamp()`

3. **Sleep timer TTS volume fade** (spec requirement 6):
   - In `speakVerse()`, when creating `SpeechSynthesisUtterance`, check if sleep timer is in fade phase
   - If fading: calculate target volume based on `(remainingMs / fadeDurationMs)` ratio
   - Set `utterance.volume = Math.max(0, fadeRatio)` for each new verse
   - This creates a stepped fade — each verse slightly quieter than the last
   - When timer completes: `speechSynthesis.cancel()` in the existing sleep timer phase check

**Guardrails (DO NOT):**
- DO NOT modify the AudioEngineService class — ducking uses the existing `masterGainNode` via the engine
- DO NOT use `setMasterVolume()` for ducking — that updates React state. Use `engine.audioContext.currentTime` + `linearRampToValueAtTime` directly on the gain node
- DO NOT duck if no ambient sounds are active
- DO NOT create audible pops or clicks — always use ramps

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| duckForVerse ramps gain to 25% | unit | Verifies `linearRampToValueAtTime` called with correct value and timing |
| unduckForPause ramps gain back to full | unit | Verifies ramp back to user volume |
| unduckImmediate sets gain directly | unit | No ramp, direct set |
| no-op when no ambient sounds | unit | No gain changes when activeSoundsCount is 0 |
| no-op when volume already below 25% | unit | Does not reduce further |
| sleep timer fade reduces utterance volume | unit | Each successive utterance has lower volume during fade |
| speechSynthesis.cancel on timer complete | unit | TTS stops when phase is 'complete' |

**Expected state after completion:**
- [ ] Ambient volume ducks smoothly (200ms ramp) when each verse starts
- [ ] Ambient volume restores during inter-verse pauses
- [ ] Pausing TTS restores ambient immediately
- [ ] Stopping TTS restores ambient with 200ms ramp
- [ ] Sleep timer fade progressively reduces TTS volume per verse
- [ ] No audible pops or clicks
- [ ] All existing useBibleAudio tests still pass
- [ ] All new ducking tests pass

---

### Step 5: Autoplay Parameter & Bible Before Bed Routine

**Objective:** Add `?autoplay=true` support to BibleReader and add the "Bible Before Bed" routine template.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — Handle `?autoplay=true` query param
- `frontend/src/data/music/routines.ts` — Add "Bible Before Bed" template
- `frontend/src/types/storage.ts` — Add `'bible-navigate'` to step type union
- `frontend/src/hooks/useRoutinePlayer.ts` — Handle `'bible-navigate'` step type
- `frontend/src/data/music/__tests__/routines.test.ts` — Tests
- `frontend/src/pages/__tests__/BibleReader-autoplay.test.tsx` — Tests

**Details:**

1. **`?autoplay=true` in BibleReader.tsx:**
   ```typescript
   const [searchParams] = useSearchParams()
   const autoplay = searchParams.get('autoplay') === 'true'

   // After chapter loads and verses are available:
   useEffect(() => {
     if (!autoplay || !isAuthenticated || !bibleAudio.isSupported) return
     if (isLoading || verses.length === 0) return
     if (bibleAudio.playbackState !== 'idle') return

     const timer = setTimeout(() => {
       bibleAudio.play()
     }, 2000) // 2-second delay per spec

     return () => clearTimeout(timer)
   }, [autoplay, isAuthenticated, isLoading, verses.length, bibleAudio.isSupported])
   // Note: intentionally exclude bibleAudio.play and playbackState from deps
   // to avoid re-triggering — this should fire exactly once after load
   ```

   **Safety:** Only fires if `autoplay === true` AND `isAuthenticated`. Logged-out users see the chapter load normally. If `speechSynthesis` is unavailable, silently ignored.

2. **RoutineDefinition step type extension** in `types/storage.ts`:
   ```typescript
   steps: {
     id: string
     type: 'scene' | 'scripture' | 'story' | 'bible-navigate'
     contentId: string  // For bible-navigate: book slug (e.g., 'psalms')
     transitionGapMinutes: number
     navigateTo?: string  // URL path for bible-navigate type
   }[]
   ```

3. **"Bible Before Bed" routine** in `data/music/routines.ts`:
   ```typescript
   {
     id: 'template-bible-before-bed',
     name: 'Bible Before Bed',
     description: 'Let the Psalms carry you to sleep. Warm ambient sounds set the mood while a Psalm is read aloud — a timeless way to end the day.',
     isTemplate: true,
     steps: [
       {
         id: 'bbb-step-1',
         type: 'scene',
         contentId: 'evening-scripture',
         transitionGapMinutes: 0,
       },
       {
         id: 'bbb-step-2',
         type: 'bible-navigate',
         contentId: 'psalms',
         transitionGapMinutes: 0,
       },
     ],
     sleepTimer: { durationMinutes: 30, fadeDurationMinutes: 10 },
     createdAt: '2026-01-01T00:00:00.000Z',
     updatedAt: '2026-01-01T00:00:00.000Z',
   }
   ```

4. **useRoutinePlayer.ts updates** — handle `'bible-navigate'` step:
   - When the current step is `type: 'bible-navigate'`:
     - Get the book slug from `contentId` (e.g., `'psalms'`)
     - Determine total chapters from `BIBLE_BOOKS` (Psalms has 150)
     - Select a random chapter: `Math.floor(Math.random() * totalChapters) + 1`
     - Use `window.location.href` or router navigation to `/bible/${bookSlug}/${randomChapter}?autoplay=true`
     - This step completes immediately after navigation (the autoplay param handles playback start)

**Guardrails (DO NOT):**
- DO NOT auto-play without the explicit `?autoplay=true` parameter
- DO NOT auto-play for logged-out users
- DO NOT auto-play if `window.speechSynthesis` is undefined
- DO NOT break existing routine functionality — the 3 existing templates must still work
- DO NOT hardcode chapter numbers — use random selection at runtime

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| autoplay starts TTS after 2s delay when authenticated | integration | Mock timer, verify play() called after 2000ms |
| autoplay ignored when not authenticated | integration | Verify play() never called |
| autoplay ignored when param absent | integration | Verify play() never called without `?autoplay=true` |
| autoplay ignored when speechSynthesis unavailable | integration | Verify play() never called |
| Bible Before Bed routine has correct structure | unit | Verify steps, timer config, description |
| All routine templates have valid step types | unit | No unknown types |
| useRoutinePlayer handles bible-navigate step | integration | Verify navigation called with Psalm chapter |

**Expected state after completion:**
- [ ] `?autoplay=true` starts TTS after 2s for authenticated users
- [ ] "Bible Before Bed" routine template appears in routines data
- [ ] Routine player navigates to random Psalm with autoplay
- [ ] Existing routines unaffected
- [ ] All tests pass

---

### Step 6: Sleep & Rest Tab Bible Reading Section

**Objective:** Add a "Scripture Reading" section to the Sleep & Rest tab with a hero card and 3 quick-start options.

**Files to create/modify:**
- `frontend/src/components/audio/BibleSleepSection.tsx` — New component
- `frontend/src/components/audio/SleepBrowse.tsx` — Insert `BibleSleepSection` at the top
- `frontend/src/components/audio/__tests__/BibleSleepSection.test.tsx` — Tests

**Details:**

1. **`BibleSleepSection` component:**

   **"Read the Bible" hero card:**
   - Larger card with warm gradient: `bg-gradient-to-r from-amber-900/30 to-purple-900/30` with frosted glass border `border border-white/10 rounded-xl`
   - Wait — the Sleep tab uses LIGHT theme (`bg-neutral-bg` page, `bg-white rounded-xl border-gray-200 shadow-sm` cards). So the hero card should use light theme styling with a warm accent:
     - Card: `bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`
     - Top accent gradient bar: `bg-gradient-to-r from-amber-500 to-purple-600 h-1`
     - Book icon (Lucide `BookOpen`), warm amber color `text-amber-600`
     - Title: "Read the Bible" in `text-lg font-semibold text-text-dark`
     - Description: "Fall asleep to any chapter read aloud" in `text-sm text-text-light`
     - Links to `/bible` — no auth required

   [UNVERIFIED] Hero card accent gradient colors (amber-500 to purple-600)
   → To verify: Run /verify-with-playwright and compare against existing Sleep tab card styles
   → If wrong: Match existing card accent patterns on the Sleep tab

   **Three quick-start cards:**
   - Row of 3 smaller cards matching existing Sleep & Rest content card style: `bg-white rounded-xl border border-gray-200 shadow-sm p-4`
   - Each shows: scene name, small play icon (Lucide `Play`), target book name
   - **"Peaceful Study"**: scene → `/bible/psalms/1?autoplay=true` (Psalms chapter 1)
   - **"Evening Scripture"**: scene → `/bible/proverbs/1?autoplay=true` (Proverbs chapter 1)
   - **"Sacred Space"**: scene → `/bible/john/1?autoplay=true` (John chapter 1)
   - On click: start the corresponding scene (via `useScenePlayer()` — auth-gated), then navigate
   - **Auth gating**: Scene start is auth-gated (same as all scene loading). The navigation to `/bible` is always allowed. So: if not authenticated, clicking shows auth modal for the scene. If authenticated, scene starts and navigation happens.

2. **SleepBrowse.tsx updates:**
   - Import and render `<BibleSleepSection />` at the top of the `space-y-8` container, before `TonightScripture`

**Section heading:**
- "Scripture Reading" — `text-lg font-semibold text-text-dark` (matching existing SleepBrowse section heading style)

**Responsive behavior:**
- Mobile (375px): Hero card full width. Quick-start cards stack vertically (one per row).
- Tablet (768px): Quick-start cards in horizontal row (3 across).
- Desktop (1440px): Same as tablet with hover states.

**Guardrails (DO NOT):**
- DO NOT use dark theme styling — Sleep tab uses light theme
- DO NOT create new routes
- DO NOT bypass existing scene auth gating

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders "Read the Bible" card | unit | Card visible with correct text and link |
| "Read the Bible" card links to /bible | unit | href is `/bible` |
| renders 3 quick-start options | unit | "Peaceful Study", "Evening Scripture", "Sacred Space" visible |
| quick-start auth gates scene loading | integration | Logged-out click triggers auth modal |
| quick-start navigates to correct book | integration | Verifies navigation to correct Bible path |
| BibleSleepSection appears in SleepBrowse | integration | Rendered at top of Sleep tab |
| quick-start cards stack on mobile | unit | Responsive classes correct |

**Expected state after completion:**
- [ ] "Scripture Reading" section visible at top of Sleep & Rest tab
- [ ] "Read the Bible" card navigates to `/bible`
- [ ] Quick-start options start scenes and navigate to Bible chapters
- [ ] Auth gating works for scene starts
- [ ] Responsive layout correct at all breakpoints
- [ ] All tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add 3 Bible reading scene presets + backgrounds + suggestions |
| 2 | — | Create SleepTimerPanel component |
| 3 | 2 | Integrate timer button, progress ring, and panel into Bible reader |
| 4 | — | Audio ducking system (replaces existing ambient volume reduction) |
| 5 | 1 | Autoplay parameter + Bible Before Bed routine |
| 6 | 1, 5 | Sleep tab Bible reading section (uses new scenes + autoplay) |

**Parallelizable:** Steps 1, 2, and 4 can be built in parallel. Step 3 requires Step 2. Step 5 requires Step 1. Step 6 requires Steps 1 and 5.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timer conflict detection | Check if timer was started while on Bible reader page vs already active on mount | If `sleepTimer.isActive` is true when component mounts, show conflict state. If user starts it from within the panel, show active state with cancel. |
| Random Psalm chapter selection | All 150 chapters (Psalms `hasFullText: true`) | Spec says 1-150. Fallback to Psalm 23 only if all chapters fail to load (unlikely). |
| `bible-navigate` step type | New type on RoutineDefinition | Cannot reuse `scripture` (that plays foreground audio via `useForegroundPlayer`). Navigation to a full Bible page is a fundamentally different action. |
| Ducking during sleep timer fade | Duck relative to current fade-attenuated volume | Spec: "the 'full volume' that ducking restores to is the fade-attenuated volume". Read current gain value from `masterGainNode.gain.value`. |
| Quick-start chapter targets | Fixed chapters (Psalms 1, Proverbs 1, John 1) | Spec says "first chapter" for each book. Simpler than random for Sleep tab quick-starts. |
| Sleep tab card theme | Light theme (white cards) | Sleep tab consistently uses light theme per existing `SleepBrowse.tsx` pattern |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bible Reading Scene Presets | [COMPLETE] | 2026-03-24 | Added 3 scenes (peaceful-study, evening-scripture, sacred-space) to scenes.ts, CSS backgrounds to scene-backgrounds.ts, extended SoundActivity type with 'bible-reading', updated ambient-suggestions.ts bible-reading context. Updated existing tests for 8→11 scene count. All 41 tests pass. |
| 2 | Sleep Timer Panel Component | [COMPLETE] | 2026-03-24 | Created SleepTimerPanel.tsx with setup/active/conflict states. 15 tests pass. Auth gating, click-outside, Escape, ARIA radiogroups all implemented. Also updated BibleAmbientChip test for new scene names. |
| 3 | Timer Integration in Bible Reader | [COMPLETE] | 2026-03-24 | Created SleepTimerProgressRing.tsx. Updated AudioControlBar with timer button + ring props. Updated BibleReader.tsx with timer panel state and mutual exclusion. Updated BibleAmbientChip with onExpand/forceCollapse props. 36 tests pass. |
| 4 | Audio Ducking System | [COMPLETE] | 2026-03-24 | Created useAudioDucking.ts hook. Replaced old reduceAmbientVolume/restoreAmbientVolume in useBibleAudio with per-verse ducking. Added sleep timer TTS volume fade (stepped per verse). Deviation: uses engine.setMasterVolume (20ms ramp) instead of direct 200ms linearRamp since masterGainNode is private. Updated sleep timer stop behavior: fading phase now continues playing (with volume fade), only 'complete' stops TTS. 25 tests pass (6 ducking + 19 useBibleAudio). |
| 5 | Autoplay & Bible Before Bed Routine | [COMPLETE] | 2026-03-24 | Added ?autoplay=true to BibleReader (2s delay, auth-gated). Added 'bible-navigate' step type to storage.ts and audio.ts. Added Bible Before Bed routine to routines.ts. Updated useRoutinePlayer to navigate to random Psalm chapter. Updated routines test (3→4 templates). All 9 routine tests pass. |
| 6 | Sleep Tab Bible Reading Section | [COMPLETE] | 2026-03-24 | Created BibleSleepSection.tsx with hero card + 3 quick-start options (light theme). Inserted at top of SleepBrowse.tsx. 7 tests pass. All 133 tests across all 11 test files pass. |
