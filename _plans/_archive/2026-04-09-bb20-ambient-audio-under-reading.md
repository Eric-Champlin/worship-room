# Implementation Plan: BB-20 Ambient Audio Under Reading

**Spec:** `_specs/bb-20-ambient-audio-under-reading.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-20 wires the existing global audio system (AudioProvider, AudioEngineService, 24-sound catalog) into the Bible reader (`/bible/:book/:chapter`). No audio infrastructure is rebuilt. This is integration work — a new lightweight picker UI, a chrome icon, reader settings, media session context, and an auto-start hook.

### Existing Files to Modify

| File | Current State | BB-20 Changes |
|------|--------------|---------------|
| `src/components/bible/reader/ReaderChrome.tsx` | 3 right-side icons: Aa (typography), Minimize2 (focus), BookOpen (browse). Uses `ICON_BTN` class for 44px min. | Add a 4th icon (Volume2/VolumeX) that toggles the AmbientAudioPicker. Pass `audioState` and `onAudioToggle` props. |
| `src/pages/BibleReader.tsx` | ~625 lines. Composes ReaderChrome, TypographySheet, VerseActionSheet, FocusVignette, BibleDrawer. Manages `typographyOpen` state. | Add `pickerOpen` state. Mount `AmbientAudioPicker`. Wire mutual exclusion with VerseActionSheet. Call `setReadingContext` / `clearReadingContext`. Mount auto-start effect. |
| `src/components/bible/reader/TypographySheet.tsx` | Settings for theme, type size, line height, font family, focus mode. Uses `PANEL_STYLE` (`rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`). | Add "Background sound" section at the bottom with 3 controls: visibility toggle, auto-start toggle, default sound picker. |
| `src/components/audio/AudioProvider.tsx` | Media Session metadata uses `foregroundContent.title` or `currentSceneName`. No reading context concept. Route-change auto-closes drawer. | Add `readingContext` to AudioState. Extend media session metadata to include reading context when set. Expose `setReadingContext` / `clearReadingContext` via a new context. |
| `src/types/audio.ts` | `AudioState` interface, 30+ action types. | Add `readingContext: { book: string; chapter: number } | null` to `AudioState`. Add `SET_READING_CONTEXT` and `CLEAR_READING_CONTEXT` action types. |
| `src/components/audio/audioReducer.ts` | Reducer for AudioState. | Handle `SET_READING_CONTEXT` and `CLEAR_READING_CONTEXT` actions. |
| `src/hooks/useReaderSettings.ts` | `ReaderSettings` interface with 4 fields (theme, typeSize, lineHeight, fontFamily). Individual `wr_bible_reader_*` localStorage keys. | Add 3 new fields: `ambientAudioVisible`, `ambientAudioAutoStart`, `ambientAudioAutoStartSound`. New localStorage keys follow same pattern. |

### New Files

| File | Purpose |
|------|---------|
| `src/components/bible/reader/AmbientAudioPicker.tsx` | Bottom sheet (mobile) / popover (desktop) with quick row, volume, browse link, timer link, stop |
| `src/components/bible/reader/AmbientAudioPicker.test.tsx` | Tests for the picker |
| `src/hooks/useReaderAudioAutoStart.ts` | Auto-start logic: on chapter mount, start preferred sound if enabled + no audio playing |
| `src/hooks/__tests__/useReaderAudioAutoStart.test.ts` | Tests for auto-start hook |

### Existing Infrastructure (reused, not modified)

| Component / Hook | File | Usage |
|------------------|------|-------|
| `AudioProvider` | `src/components/audio/AudioProvider.tsx` | Mounted in `App.tsx` line 163, wraps entire app — survives all route transitions. **Verified: no need to move higher.** |
| `useAudioState()` | `src/components/audio/AudioProvider.tsx` | Read audio state (activeSounds, isPlaying, masterVolume, drawerOpen) |
| `useAudioDispatch()` | `src/components/audio/AudioProvider.tsx` | Dispatch actions (ADD_SOUND, REMOVE_SOUND, SET_MASTER_VOLUME, PLAY_ALL, PAUSE_ALL, STOP_ALL, OPEN_DRAWER) |
| `useSoundToggle()` | `src/hooks/useSoundToggle.ts` | Auth-gated sound toggle with load/error handling, retry logic |
| `SOUND_CATALOG` / `SOUND_BY_ID` | `src/data/sound-catalog.ts` | 24 ambient sounds. Lookup by ID. |
| `VolumeSlider` | `src/components/audio/VolumeSlider.tsx` | Range 0-100, purple gradient fill, aria labels |
| `AudioDrawer` | `src/components/audio/AudioDrawer.tsx` | Full sound browser + mixer + timer UI. Opens via `OPEN_DRAWER` dispatch. |
| `useFocusTrap` | `src/hooks/useFocusTrap.ts` | Focus trap + Escape handling for modals/sheets |
| `AUDIO_CONFIG` | `src/constants/audio.ts` | `DEFAULT_SOUND_VOLUME: 0.6`, `DEFAULT_MASTER_VOLUME: 0.8`, fade constants |
| `storageService` | `src/services/storage-service.ts` | `getListeningHistory()` for recent sounds |

### Curated Default Sounds (Verified in Catalog)

The spec calls for 4 curated defaults when fewer than 4 sounds in history. Verified these IDs exist in `SOUND_CATALOG`:

| Sound | ID | Category | Rationale |
|-------|-----|----------|-----------|
| Gentle Rain | `gentle-rain` | nature | Spec-listed |
| Ocean Waves | `ocean-waves` | nature | Spec-listed |
| Fireplace | `fireplace` | environments | Spec-listed |
| Soft Piano | `soft-piano` | instruments | Quiet, very_calm intensity, ideal for reading |

### Auth Gating Pattern

The Bible reader page (`/bible/:book/:chapter`) is accessible without auth for reading. The `ReaderChrome` action bar icons (Aa, Focus, Books) are visible to all users. The `useSoundToggle` hook handles auth gating internally — calls `authModal.openAuthModal()` when `!isAuthenticated`. The audio control icon follows the same pattern: visible to all, auth-gated on interaction via `useSoundToggle`.

### Test Patterns

Existing Bible reader tests use:
- `@testing-library/react` with `render`, `screen`, `fireEvent`, `waitFor`
- `vi.mock` for hooks and store modules
- Provider wrapping: `BrowserRouter` + `AuthModalProvider` + `ToastProvider` for components that use those contexts
- Audio tests mock `AudioProvider` exports (`useAudioState`, `useAudioDispatch`, `useAudioEngine`)

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap audio control icon to open picker | Visible to all, picker opens for all | Step 4 | No auth required to open picker |
| Start/stop/change sounds | Auth-gated | Step 2, 4 | `useSoundToggle` handles auth internally (calls `authModal.openAuthModal`) |
| Adjust volume | Auth-gated (modifies AudioProvider state) | Step 2 | Volume slider dispatches `SET_MASTER_VOLUME` only when sounds are active (implicitly auth-gated since sounds require auth) |
| Change audio settings in TypographySheet | Auth-gated (settings panel requires login per BB-4 patterns) | Step 6 | Settings are localStorage-only, no auth gate needed (same as theme/font settings) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Picker background | background | `rgba(15, 10, 30, 0.95)` | TypographySheet `PANEL_STYLE` / design-system.md `dashboard-dark` |
| Picker background | backdrop-filter | `blur(16px)` | TypographySheet `PANEL_STYLE` |
| Picker border | border | `1px solid rgba(255, 255, 255, 0.1)` = `border-white/10` | VerseActionSheet pattern |
| Picker border-radius | border-radius | `rounded-2xl` (16px) | VerseActionSheet pattern |
| Quick-row card bg | background | `bg-white/[0.06]` | FrostedCard default |
| Quick-row card border | border | `border border-white/[0.12]` | FrostedCard default |
| Quick-row card active | border | `border-primary/60` | Spec: "Active/playing card gets a `border-primary/60` accent border" |
| Icon button class | all | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | ReaderChrome `ICON_BTN` |
| Volume slider | all | Existing `VolumeSlider` component | `src/components/audio/VolumeSlider.tsx` |
| Heading text | class | `text-white text-sm font-medium` | Design system: headings in panels |
| Secondary text | class | `text-white/60 text-sm` | Design system: secondary labels |
| Scrim (mobile) | background | `bg-black/30` | VerseActionSheet scrim pattern |
| Pulse animation | keyframes | `opacity: 0.6 → 1.0, 2s ease-in-out infinite` | Spec requirement |
| Reduced motion | replacement | `text-primary-lt` static color instead of pulse | Spec requirement |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Bible reader uses `PANEL_STYLE = { background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }` for all floating panels (TypographySheet, VerseActionSheet). The AmbientAudioPicker must use the same style object — not a hand-rolled variant.
- ReaderChrome icons use the `ICON_BTN` constant: `'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'`. The new audio icon MUST use this same class.
- VerseActionSheet uses `z-[10000]` for its scrim and panel. The AmbientAudioPicker MUST use a lower z-index (`z-50` per spec) to avoid conflicting with the verse action sheet.
- The Bible reader has its own theme system (midnight/parchment/sepia) that changes `--reader-bg` and `--reader-text`. The picker must use fixed dark styling (`PANEL_STYLE`) regardless of the reader theme — matching TypographySheet behavior.
- Focus mode fades chrome to `opacity: 0` and sets `pointer-events: none`. The audio icon in ReaderChrome is part of the chrome and will automatically respect focus mode — no extra work needed. The picker itself should NOT be subject to focus mode fade (it's a floating panel, not chrome).
- Audio keyboard shortcuts (Space = play/pause, Arrow Up/Down = volume) are handled by AudioProvider globally. They check `document.activeElement?.tagName` to avoid firing in inputs. No conflict with the reader.
- `useSoundToggle` is auth-gated internally — calls `authModal.openAuthModal('Sign in to play ambient sounds')` when `!isAuthenticated`. Do NOT add a second auth check.
- `AUDIO_CONFIG.DEFAULT_SOUND_VOLUME` is 0.6 (60%) and `DEFAULT_MASTER_VOLUME` is 0.8 (80%). The spec's 35/100 reader default is for the MASTER volume when auto-starting from the reader for the first time.
- FrostedCard tier system: Quick-row cards in the picker use the base FrostedCard border/bg values (`bg-white/[0.06] border border-white/[0.12]`) but are NOT `FrostedCard` components — they're smaller inline cards without padding.
- HorizonGlow opacity: low (0.28-0.35), not medium/strong. (From memory: feedback on Daily Hub text readability.)
- Do NOT use `animate-glow-pulse` (deprecated and removed from tailwind.config.js).
- Do NOT use cyan border or cyan glow (deprecated).
- All text uses `text-white` for primary, `text-white/60` for secondary, `text-white/50` for muted. Zero raw hex values.

---

## Shared Data Models

### New AudioState Fields

```typescript
// Addition to src/types/audio.ts AudioState
interface AudioState {
  // ... existing fields ...
  readingContext: { book: string; chapter: number } | null
}

// New action types
| { type: 'SET_READING_CONTEXT'; payload: { book: string; chapter: number } }
| { type: 'CLEAR_READING_CONTEXT' }
```

### New Reader Settings Fields

```typescript
// Addition to src/hooks/useReaderSettings.ts ReaderSettings
interface ReaderSettings {
  // ... existing 4 fields ...
  ambientAudioVisible: boolean    // default: true
  ambientAudioAutoStart: boolean  // default: false
  ambientAudioAutoStartSound: string | null  // sound ID or null
}
```

### localStorage Keys This Spec Touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_reader_ambient_visible` | Both | Show audio control in reader (default: `'true'`) |
| `wr_bible_reader_ambient_autostart` | Both | Auto-start sound on chapter open (default: `'false'`) |
| `wr_bible_reader_ambient_autostart_sound` | Both | Sound ID for auto-start (default: `null`) |
| `wr_bible_reader_ambient_volume` | Both | Last-used volume from reader (0-100, default: `35`) |
| `wr_session_state` | Read | SessionAutoSave persists audio state (existing) |
| `wr_listening_history` | Read | Recent listening sessions for quick-row (existing) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Picker: full-width bottom sheet, max-h 60vh. Quick row: 4 cards in horizontal scroll. Volume slider full-width. |
| Tablet | 640–1024px | Picker: centered bottom sheet, max-width 480px, max-h 60vh. Quick row: 4 cards in single row. |
| Desktop | > 1024px | Picker: popover anchored below audio icon, width ~320px. Quick row: 4 cards in single row. |

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Quick-row cards | Card 1, Card 2, Card 3, Card 4 | Same y ±5px at 640px+ | Horizontal scroll below 640px (no wrapping — scroll container) |
| ReaderChrome right icons | Aa, Audio, Focus, Books | Same y ±2px at all breakpoints | Never wraps — `flex gap-1` with fixed-size icons |
| Settings toggles | Label + toggle switch | Same y ±2px at all breakpoints | Never wraps — `flex justify-between` |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| "Sounds" heading → quick row | 12px (gap-3) | Design pattern for picker sections |
| Quick row → volume slider | 16px (gap-4) | Design pattern |
| Volume slider → links section | 16px (gap-4) | Design pattern |
| Links → stop button | 16px (gap-4) | Design pattern |

---

## Assumptions & Pre-Execution Checklist

- [x] `AudioProvider` is mounted at App.tsx level and survives all route transitions (verified: line 163)
- [x] `SOUND_BY_ID` contains `gentle-rain`, `ocean-waves`, `fireplace`, `soft-piano` (verified in `sound-catalog.ts`)
- [x] `VolumeSlider` component exists and is reusable (verified: `src/components/audio/VolumeSlider.tsx`)
- [x] `VerseActionSheet` uses `z-[10000]` — picker at `z-50` avoids conflict
- [x] `useSoundToggle` handles auth gating internally
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference or codebase inspection)
- [x] No deprecated patterns used
- [x] No [UNVERIFIED] values needed — all values sourced from existing codebase

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quick-row 4th curated default | `soft-piano` | Instruments category, `very_calm` intensity, ideal for reading context. Other candidates (flowing-stream, wind-chimes) are noisier. |
| Picker z-index | `z-50` | Spec says z-50. VerseActionSheet is z-[10000] and will always overlay picker if both somehow open. |
| Volume slider binding | Controls `masterVolume` directly | Spec explicitly says "the volume slider controls the same state the Music page controls." No separate reader volume. |
| Reader-context volume on auto-start | Set master to `wr_bible_reader_ambient_volume` (default 35) on auto-start only | Preserves user's last reader volume preference without affecting Music page sessions. Only applied when auto-start fires, not when user manually starts from picker. |
| "Browse all sounds" behavior | Dispatch `OPEN_DRAWER` (opens existing AudioDrawer) | Reuses all existing infrastructure. Picker closes, AudioDrawer opens. No duplication. |
| "Set a sleep timer" behavior | Dispatch `OPEN_DRAWER` then switch to Timer tab | Uses `OPEN_DRAWER` + `SET_DRAWER_TAB` (if exists) or just opens to default tab. |
| Picker vs VerseActionSheet mutual exclusion | Opening picker closes verse sheet; opening verse sheet closes picker | Spec requirement #6 in edge cases. Both track `isOpen` state; `BibleReader.tsx` coordinates. |
| Audio already playing when reader mounts | Picker reflects current state, no interruption | Spec requirement #18. AudioProvider is single source of truth. |
| Auto-start sound removed from library | Fall through to last-played; if that fails, do nothing | Spec requirement #28. Silent failure. |
| `ambientAudioVisible=false` + `ambientAudioAutoStart=true` | Auto-start fires anyway | Spec edge case #3. User must re-enable visibility to see control and stop audio. |
| Tab visibility | Audio continues (Web Audio API default) | Spec requirement #33. No extra code needed. |

---

## Implementation Steps

### Step 1: Extend ReaderSettings with Audio Fields

**Objective:** Add 3 audio-related boolean/string settings to the existing `useReaderSettings` hook and 1 numeric volume setting, all persisted to individual `wr_bible_reader_*` localStorage keys.

**Files to modify:**
- `src/hooks/useReaderSettings.ts` — add 4 new fields to `ReaderSettings` interface, new localStorage keys, validation

**Details:**

Add to `ReaderSettings` interface:

```typescript
interface ReaderSettings {
  // ... existing 4 fields ...
  ambientAudioVisible: boolean
  ambientAudioAutoStart: boolean
  ambientAudioAutoStartSound: string | null
  ambientAudioVolume: number // 0-100, default 35
}
```

Add to `DEFAULTS`:

```typescript
ambientAudioVisible: true,
ambientAudioAutoStart: false,
ambientAudioAutoStartSound: null,
ambientAudioVolume: 35,
```

Add to `KEYS`:

```typescript
ambientAudioVisible: 'wr_bible_reader_ambient_visible',
ambientAudioAutoStart: 'wr_bible_reader_ambient_autostart',
ambientAudioAutoStartSound: 'wr_bible_reader_ambient_autostart_sound',
ambientAudioVolume: 'wr_bible_reader_ambient_volume',
```

Boolean settings stored as `'true'`/`'false'` strings. `ambientAudioAutoStartSound` stored as sound ID string or absent. `ambientAudioVolume` stored as number string (`'35'`). The `readSetting` function needs type-specific parsing: existing string-enum fields use `VALID_VALUES` lookup; booleans parse `'true'`/`'false'`; the nullable string accepts any non-empty value; the number clamps to 0-100.

Refactor `readSetting` to handle the 3 new field types:
- Boolean: `stored === 'true'` → `true`, else `false`, with fallback to default
- Nullable string: `stored || null`
- Number: `parseInt` with clamp to 0-100, fallback to default

The `resetToDefaults` function already iterates all `KEYS` and removes them — no change needed. The `updateSetting` function writes `String(value)` for all types (booleans become `'true'`/`'false'`, null becomes empty string removal via `localStorage.removeItem`).

**Auth gating:** N/A — settings are localStorage-only, available to all users.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT create a separate hook or file for audio settings — extend the existing `useReaderSettings` to keep settings co-located
- Do NOT use `wr_session_state` for these settings — these are reader-specific preferences, not audio session state
- Do NOT change the behavior of existing 4 settings

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| reads `ambientAudioVisible` default as true | unit | No localStorage → returns `true` |
| reads `ambientAudioVisible` from localStorage | unit | `'false'` stored → returns `false` |
| reads `ambientAudioAutoStart` default as false | unit | No localStorage → returns `false` |
| reads `ambientAudioAutoStartSound` default as null | unit | No localStorage → returns `null` |
| reads `ambientAudioAutoStartSound` from localStorage | unit | `'soft-piano'` stored → returns `'soft-piano'` |
| reads `ambientAudioVolume` default as 35 | unit | No localStorage → returns `35` |
| reads `ambientAudioVolume` from localStorage | unit | `'50'` stored → returns `50` |
| clamps `ambientAudioVolume` to 0-100 | unit | `'150'` stored → returns `100`; `'-5'` stored → returns `0` |
| `updateSetting` writes boolean to localStorage | unit | `updateSetting('ambientAudioAutoStart', true)` → `localStorage.getItem(key) === 'true'` |
| `updateSetting` removes null sound | unit | `updateSetting('ambientAudioAutoStartSound', null)` → key removed from localStorage |
| `resetToDefaults` clears all 8 settings | unit | All 8 keys removed from localStorage |

**Expected state after completion:**
- [ ] `ReaderSettings` interface has 8 fields (4 existing + 4 new)
- [ ] All 4 new settings read/write to individual `wr_bible_reader_*` keys
- [ ] Default values: `visible=true`, `autoStart=false`, `autoStartSound=null`, `volume=35`
- [ ] All 11 tests pass

---

### Step 2: Reading Context in AudioProvider

**Objective:** Add `readingContext` state to AudioProvider so media session metadata can include "Reading John 3" context, and expose methods to set/clear it.

**Files to modify:**
- `src/types/audio.ts` — add `readingContext` field and 2 new action types
- `src/components/audio/audioReducer.ts` — handle new actions
- `src/components/audio/AudioProvider.tsx` — extend media session metadata, create + export new context

**Details:**

In `src/types/audio.ts`, add to `AudioState`:

```typescript
readingContext: { book: string; chapter: number } | null
```

Add to `AudioAction` union:

```typescript
| { type: 'SET_READING_CONTEXT'; payload: { book: string; chapter: number } }
| { type: 'CLEAR_READING_CONTEXT' }
```

In `audioReducer.ts`, handle:

```typescript
case 'SET_READING_CONTEXT':
  return { ...state, readingContext: action.payload }
case 'CLEAR_READING_CONTEXT':
  return { ...state, readingContext: null }
```

In `initialAudioState`, add `readingContext: null`.

In `AudioProvider.tsx`, create a new context for reading context control:

```typescript
interface ReadingContextControl {
  setReadingContext: (ctx: { book: string; chapter: number }) => void
  clearReadingContext: () => void
}

const ReadingContextControlContext = createContext<ReadingContextControl | null>(null)

export function useReadingContext(): ReadingContextControl {
  const ctx = useContext(ReadingContextControlContext)
  if (!ctx) throw new Error('useReadingContext must be used within AudioProvider')
  return ctx
}
```

Extend the media session metadata `useEffect` (lines 182-210):

```typescript
// When readingContext is set AND ambient sounds are playing (no foreground), add reading context to metadata
if (state.readingContext && state.activeSounds.length > 0 && !state.foregroundContent && state.pillVisible) {
  const sceneName = state.currentSceneName ?? state.activeSounds[0]?.label ?? 'Ambient'
  navigator.mediaSession.metadata = new MediaMetadata({
    title: sceneName,
    artist: `Worship Room — Reading ${state.readingContext.book} ${state.readingContext.chapter}`,
  })
}
```

This condition takes priority OVER the existing `currentSceneName` branch (but NOT over `foregroundContent` which is stories/scripture). Reading context is only applied when the reader is active.

**Auth gating:** N/A — AudioProvider state change only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT clear reading context on route change automatically — the BibleReader component handles this on unmount (Step 7)
- Do NOT modify the existing media session metadata for foreground content (stories/scripture reading) — reading context only applies to ambient sound metadata
- Do NOT add reading context to the browser tab title — the existing title logic handles this
- Do NOT store reading context in localStorage — it's ephemeral, lives in React state only

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `SET_READING_CONTEXT` sets context | unit | Dispatch → `state.readingContext` equals payload |
| `CLEAR_READING_CONTEXT` clears context | unit | Dispatch → `state.readingContext` is null |
| `initialAudioState` has `readingContext: null` | unit | Default state check |
| Media session includes reading context for ambient sounds | integration | Set reading context + active sounds → metadata artist includes "Reading John 3" |
| Media session excludes reading context for foreground content | integration | Set reading context + foreground content → metadata uses foreground title, not reading context |
| Media session excludes reading context when no sounds playing | integration | Set reading context, no sounds → metadata not updated with reading context |
| `useReadingContext` returns set/clear functions | unit | Hook returns object with both methods |

**Expected state after completion:**
- [ ] `AudioState` has `readingContext` field
- [ ] `audioReducer` handles both new action types
- [ ] Media session metadata shows "Worship Room — Reading {Book} {Chapter}" when reading context is set and ambient audio is playing
- [ ] `useReadingContext` hook exported from AudioProvider
- [ ] All 7 tests pass

---

### Step 3: AmbientAudioPicker Component

**Objective:** Build the picker UI that renders as a bottom sheet on mobile or popover on desktop, with quick-row sounds, volume slider, browse/timer links, and stop button.

**Files to create:**
- `src/components/bible/reader/AmbientAudioPicker.tsx`
- `src/components/bible/reader/__tests__/AmbientAudioPicker.test.tsx`

**Details:**

Props:

```typescript
interface AmbientAudioPickerProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>  // for desktop popover positioning
  bookName: string   // for reading context
  chapter: number    // for reading context
}
```

**Layout structure:**

```
┌─ "Sounds" heading ─────────────────── [X] ─┐
│                                              │
│  [Rain]  [Ocean]  [Fire]  [Piano]           │  ← Quick row (4 cards)
│                                              │
│  ── Volume ─────────────────── 35% ──       │  ← VolumeSlider
│                                              │
│  🔊 Browse all sounds                       │  ← Link (opens AudioDrawer)
│  ⏱ Set a sleep timer                        │  ← Link (opens AudioDrawer timer tab)
│                                              │
│  [ Stop sound ]                              │  ← Button (only when audio playing)
└──────────────────────────────────────────────┘
```

**Quick row logic:**

```typescript
function getQuickRowSounds(activeSounds: ActiveSound[], listeningHistory: ListeningSession[]): Sound[] {
  const CURATED_DEFAULTS = ['gentle-rain', 'ocean-waves', 'fireplace', 'soft-piano']
  
  // Get unique recently played sound IDs from listening history
  const recentIds: string[] = []
  for (const session of listeningHistory) {
    if (session.contentType === 'ambient' && !recentIds.includes(session.contentId)) {
      recentIds.push(session.contentId)
      if (recentIds.length === 4) break
    }
  }
  
  // Pad with curated defaults if fewer than 4
  for (const id of CURATED_DEFAULTS) {
    if (!recentIds.includes(id) && recentIds.length < 4) {
      recentIds.push(id)
    }
  }
  
  return recentIds
    .map(id => SOUND_BY_ID.get(id))
    .filter((s): s is Sound => s !== undefined)
}
```

**Quick-row card:**
- Small card: `min-w-[72px] min-h-[72px] rounded-xl bg-white/[0.06] border border-white/[0.12] flex flex-col items-center justify-center gap-1 p-2 cursor-pointer transition-all`
- Active state: `border-primary/60 bg-white/[0.10]`
- Sound name: `text-xs text-white/80 text-center line-clamp-1`
- Icon: Lucide icon from `sound.lucideIcon`, 20px, `text-white/60` (idle) / `text-primary-lt` (active)
- Play/pause mini icon overlay in corner when tapped

**Tapping a quick-row card:**
- If sound is not playing: start it via `useSoundToggle().toggleSound(sound)`
- If sound is currently playing: pause via `dispatch({ type: 'PAUSE_ALL' })`
- If a different sound is playing: the existing crossfade behavior in AudioEngineService handles this — first remove old sound, then add new one

**Volume slider:**
- Reuse existing `VolumeSlider` component
- `value = Math.round(audioState.masterVolume * 100)`
- `onChange = (v) => dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: v / 100 } })`
- Also persist to `wr_bible_reader_ambient_volume` via `updateSetting('ambientAudioVolume', v)`

**"Browse all sounds" link:**
- `onClick`: close picker, then `dispatch({ type: 'OPEN_DRAWER' })`
- Renders as: `<button className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors py-2">` with a `Music` or `ListMusic` Lucide icon

**"Set a sleep timer" link:**
- Same pattern, `Timer` Lucide icon
- `onClick`: close picker, then `dispatch({ type: 'OPEN_DRAWER' })` (AudioDrawer has a Timer tab)

**"Stop sound" button:**
- Only visible when `audioState.activeSounds.length > 0 || audioState.isPlaying`
- `onClick`: `dispatch({ type: 'STOP_ALL' })` — the AudioEngineService handles the 1-second fade-out via `SOUND_FADE_OUT_MS: 1000`
- Styling: `text-sm text-white/50 hover:text-white transition-colors py-2`

**Responsive rendering:**

```typescript
const isDesktop = useMediaQuery('(min-width: 1024px)')

// Desktop: popover anchored below icon
if (isDesktop) {
  return (
    <div
      ref={panelRef}
      style={{ ...PANEL_STYLE, top: anchorRect.bottom + 8, right: anchorRect.right - 320 }}
      className="fixed z-50 w-80 rounded-2xl border border-white/10 p-4"
    >
      {pickerContent}
    </div>
  )
}

// Mobile/Tablet: bottom sheet with scrim
return (
  <>
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
    <div
      ref={panelRef}
      style={PANEL_STYLE}
      className={cn(
        'fixed z-50 inset-x-0 bottom-0 max-h-[60vh] rounded-t-2xl border-t border-white/10 p-4 overflow-y-auto',
        'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px]',
      )}
    >
      {pickerContent}
    </div>
  </>
)
```

**Dismissal:**
- Click outside (scrim on mobile, click-outside handler on desktop via `useEffect`)
- X button (top-right of heading row)
- Escape key (via `useFocusTrap`)

**PANEL_STYLE constant** (imported from TypographySheet or defined locally):

```typescript
const PANEL_STYLE = {
  background: 'rgba(15, 10, 30, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
} as const
```

**Reading context integration:**
- When a sound is started from the picker, call `readingContextControl.setReadingContext({ book: bookName, chapter })` (prop values)
- This enriches the media session metadata

**Auth gating:** `useSoundToggle` handles auth internally. The picker itself opens without auth (shows curated sounds), but attempting to play triggers the auth modal if not logged in.

**Responsive behavior:**
- Desktop (1024px+): 320px popover below anchor icon, fixed position
- Tablet (640–1024px): centered bottom sheet, max-width 480px
- Mobile (< 640px): full-width bottom sheet, max-h 60vh, horizontal scroll on quick row

**Guardrails (DO NOT):**
- Do NOT duplicate AudioEngineService or AudioProvider logic — use `useSoundToggle` and `useAudioDispatch`
- Do NOT build a new sound browser — "Browse all sounds" opens the existing AudioDrawer
- Do NOT build a new sleep timer — link opens existing AudioDrawer
- Do NOT use `animate-glow-pulse` or cyan borders
- Do NOT create a new audio context or audio element
- Do NOT use raw hex values — use Tailwind classes
- Do NOT put the picker at `z-[10000]` — use `z-50` to stay below VerseActionSheet

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders "Sounds" heading when open | unit | `screen.getByText('Sounds')` |
| renders 4 quick-row cards with curated defaults when no history | unit | Mock empty listening history → 4 cards (Rain, Ocean, Fire, Piano) |
| renders recent sounds from history | unit | Mock history with 3 sounds → 3 from history + 1 curated |
| tapping a quick-row card calls toggleSound | unit | Click card → `useSoundToggle().toggleSound` called with correct Sound |
| shows active state on playing card | unit | Mock `activeSounds` with one sound → that card has `border-primary/60` |
| renders VolumeSlider with masterVolume | unit | Mock `masterVolume: 0.5` → slider value is 50 |
| adjusting volume dispatches SET_MASTER_VOLUME | unit | Change slider → dispatch called with new volume |
| "Browse all sounds" dispatches OPEN_DRAWER | unit | Click link → OPEN_DRAWER dispatched, onClose called |
| "Stop sound" dispatches STOP_ALL | unit | Click stop → STOP_ALL dispatched |
| "Stop sound" hidden when no audio playing | unit | Mock no active sounds → stop button not rendered |
| closes on Escape key | unit | Press Escape → onClose called |
| closes on X button click | unit | Click X → onClose called |
| closes on scrim click (mobile) | unit | Click scrim → onClose called |
| renders bottom sheet on mobile | unit | Window width < 640 → bottom sheet layout |

**Expected state after completion:**
- [ ] `AmbientAudioPicker` renders correctly on mobile (bottom sheet) and desktop (popover)
- [ ] Quick row shows 4 sounds (from history + curated defaults)
- [ ] Volume slider controls master volume
- [ ] Browse/timer links open AudioDrawer
- [ ] Stop button fades out audio
- [ ] All 14 tests pass

---

### Step 4: Audio Control Icon in ReaderChrome + Wire into BibleReader

**Objective:** Add the ambient audio icon to the reader's top action bar, wire the AmbientAudioPicker into BibleReader, and handle mutual exclusion with VerseActionSheet.

**Files to modify:**
- `src/components/bible/reader/ReaderChrome.tsx` — add audio icon button
- `src/pages/BibleReader.tsx` — mount picker, manage state, wire mutual exclusion, set/clear reading context

**Details:**

**ReaderChrome changes:**

Add new props:

```typescript
interface ReaderChromeProps {
  // ... existing props ...
  ambientAudioVisible: boolean
  isAudioPlaying: boolean
  onAudioToggle: () => void
  audioButtonRef: React.RefObject<HTMLButtonElement | null>
}
```

Add the audio icon between the Aa button and the Focus button in the right-side `div.flex.items-center.gap-1`:

```tsx
{ambientAudioVisible && (
  <button
    ref={audioButtonRef}
    type="button"
    className={cn(ICON_BTN, 'relative')}
    aria-label={isAudioPlaying ? 'Ambient audio playing — tap to open sound controls' : 'Open ambient sounds'}
    aria-expanded={false} // BibleReader passes actual state
    onClick={onAudioToggle}
  >
    {isAudioPlaying ? (
      <Volume2 className={cn('h-5 w-5', 'text-white')} />
    ) : (
      <Volume2 className="h-5 w-5 opacity-50" />
    )}
    {/* Pulse ring when playing */}
    {isAudioPlaying && (
      <span
        className="absolute inset-0 rounded-full animate-[audio-pulse_2s_ease-in-out_infinite]"
        style={{ boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.4)' }}
        aria-hidden="true"
      />
    )}
  </button>
)}
```

Add the pulse keyframe to `tailwind.config.js` (or use inline animation):

```typescript
// In tailwind.config.js extend.keyframes:
'audio-pulse': {
  '0%, 100%': { opacity: '0' },
  '50%': { opacity: '1' },
}
// extend.animation:
'audio-pulse': 'audio-pulse 2s ease-in-out infinite',
```

**Reduced motion:** Wrap the pulse `<span>` in a `prefers-reduced-motion` check. When reduced motion is preferred, replace with a static `text-primary-lt` color on the icon instead of the pulse animation:

```tsx
const reducedMotion = useReducedMotion() // already available in BibleReader, pass as prop
// If reducedMotion: icon gets text-primary-lt class, no pulse span
// If !reducedMotion: icon gets text-white class + pulse span
```

**BibleReader changes:**

Add state:

```typescript
const [pickerOpen, setPickerOpen] = useState(false)
const audioButtonRef = useRef<HTMLButtonElement>(null)
```

Get audio state:

```typescript
const audioState = useAudioState()
const readingContextControl = useReadingContext()
const isAudioPlaying = audioState.isPlaying && audioState.activeSounds.length > 0
```

Get reader settings (already available via `useReaderSettings`):

```typescript
const { settings, updateSetting, resetToDefaults } = useReaderSettings()
```

**Mutual exclusion with VerseActionSheet:**

When the picker opens, close the verse action sheet. When the verse action sheet opens, close the picker:

```typescript
const handleAudioToggle = useCallback(() => {
  if (isSheetOpen) closeSheet()  // close verse action sheet
  setPickerOpen(prev => !prev)
}, [isSheetOpen, closeSheet])

// In the existing VerseActionSheet open handler, add:
// When sheet opens, close picker
useEffect(() => {
  if (isSheetOpen && pickerOpen) {
    setPickerOpen(false)
  }
}, [isSheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps
```

**Mutual exclusion with TypographySheet:**

When picker opens, close typography sheet. When typography sheet opens, close picker:

```typescript
const handleTypographyToggle = useCallback(() => {
  if (pickerOpen) setPickerOpen(false)
  setTypographyOpen(prev => !prev)
}, [pickerOpen])

const handleAudioToggle = useCallback(() => {
  if (isSheetOpen) closeSheet()
  if (typographyOpen) setTypographyOpen(false)
  setPickerOpen(prev => !prev)
}, [isSheetOpen, closeSheet, typographyOpen])
```

**Focus mode integration:**

The audio icon is inside ReaderChrome, which already respects `chromeOpacity` and `chromePointerEvents` from focus mode. When focus mode activates, the icon fades with all other chrome. When the user taps to reveal chrome, the icon becomes interactive again. **No extra work needed.**

When the picker IS open, pause focus mode to prevent chrome from fading while the user is adjusting audio:

```typescript
useEffect(() => {
  if (pickerOpen) {
    focusMode.pauseFocusMode()
  } else {
    focusMode.resumeFocusMode()
  }
}, [pickerOpen]) // eslint-disable-line react-hooks/exhaustive-deps
```

This matches the existing pattern: TypographySheet and BibleDrawer both pause focus mode when open.

**Reading context:**

Set reading context when the reader mounts and audio is playing (or when audio starts from the picker):

```typescript
// Set reading context on mount if audio is playing
useEffect(() => {
  if (book && !isNaN(chapterNumber) && isAudioPlaying) {
    readingContextControl.setReadingContext({ book: book.name, chapter: chapterNumber })
  }
}, [book?.name, chapterNumber, isAudioPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

// Clear reading context on unmount
useEffect(() => {
  return () => {
    readingContextControl.clearReadingContext()
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Mount the picker:**

```tsx
{pickerOpen && (
  <AmbientAudioPicker
    isOpen={pickerOpen}
    onClose={() => setPickerOpen(false)}
    anchorRef={audioButtonRef}
    bookName={book?.name ?? ''}
    chapter={chapterNumber}
  />
)}
```

**Pass new props to ReaderChrome:**

```tsx
<ReaderChrome
  // ... existing props ...
  ambientAudioVisible={settings.ambientAudioVisible}
  isAudioPlaying={isAudioPlaying}
  onAudioToggle={handleAudioToggle}
  audioButtonRef={audioButtonRef}
  isAudioPickerOpen={pickerOpen}
  reducedMotion={reducedMotion}
/>
```

**Auth gating:** Picker opens for all users. Sound toggling is auth-gated by `useSoundToggle` internally.

**Responsive behavior:**
- Desktop (1024px+): Popover anchored below audio icon
- Tablet/Mobile: Bottom sheet
- Icon size consistent with other chrome icons (44px min)

**Inline position expectations:**
- ReaderChrome right icons (Aa, Audio, Focus, Books) must share y-coordinate at all breakpoints. `flex gap-1` with 44px min-width icons.

**Guardrails (DO NOT):**
- Do NOT add a second auth check on the audio icon — `useSoundToggle` handles it
- Do NOT stop audio when focus mode activates (spec requirement #22)
- Do NOT auto-dim volume in focus mode (spec requirement #23)
- Do NOT use z-[10000] for the picker — use z-50
- Do NOT mount the picker outside of BibleReader — it's scoped to the reader page

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| audio icon renders when `ambientAudioVisible` is true | unit | ReaderChrome shows Volume2 icon |
| audio icon hidden when `ambientAudioVisible` is false | unit | ReaderChrome does not render audio button |
| audio icon at reduced opacity when no audio playing | unit | Icon has `opacity-50` class |
| audio icon at full opacity with pulse when audio playing | unit | Icon has no opacity class, pulse span present |
| reduced motion: no pulse animation, static color | unit | `useReducedMotion` true → `text-primary-lt` class, no pulse span |
| clicking audio icon calls onAudioToggle | unit | fireEvent.click → handler called |
| picker opens when audio icon clicked | integration | BibleReader: click audio icon → picker mounts |
| picker closes when verse action sheet opens | integration | BibleReader: open picker, then trigger verse tap → picker unmounts |
| verse sheet closes when picker opens | integration | BibleReader: open verse sheet, click audio icon → verse sheet closes |
| typography sheet closes when picker opens | integration | BibleReader: open typography, click audio icon → typography closes |
| picker pauses focus mode while open | integration | Open picker → `pauseFocusMode` called |
| reading context set when audio playing in reader | integration | Audio playing + book loaded → `setReadingContext` called |
| reading context cleared on reader unmount | integration | Unmount BibleReader → `clearReadingContext` called |

**Expected state after completion:**
- [ ] Audio icon appears in ReaderChrome right-side icon group
- [ ] Icon respects `ambientAudioVisible` setting
- [ ] Icon shows idle/playing states with pulse animation
- [ ] Picker opens/closes on icon tap
- [ ] Mutual exclusion with VerseActionSheet and TypographySheet works
- [ ] Focus mode integration correct (pauses when picker open)
- [ ] Reading context set/cleared correctly
- [ ] All 13 tests pass

---

### Step 5: "Background Sound" Section in TypographySheet

**Objective:** Add a settings section to the existing TypographySheet modal for the 3 audio-related toggles: visibility, auto-start, and default sound picker.

**Files to modify:**
- `src/components/bible/reader/TypographySheet.tsx` — add "Background sound" section below Focus Mode section

**Details:**

Below the existing "Focus Mode" section in TypographySheet, add a divider and a new section:

```tsx
{/* ── Background sound ── */}
<div className="border-t border-white/[0.08] pt-4">
  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">
    Background sound
  </h3>
  
  {/* Show audio control toggle */}
  <label className="flex items-center justify-between py-2">
    <span className="text-sm text-white">Show audio control in reader</span>
    <ToggleSwitch
      checked={settings.ambientAudioVisible}
      onChange={(v) => onUpdate('ambientAudioVisible', v)}
    />
  </label>
  
  {/* Auto-start toggle */}
  <label className={cn(
    'flex items-center justify-between py-2',
    !settings.ambientAudioVisible && 'opacity-40 pointer-events-none'
  )}>
    <span className="text-sm text-white">Auto-start sound when opening a chapter</span>
    <ToggleSwitch
      checked={settings.ambientAudioAutoStart}
      onChange={(v) => onUpdate('ambientAudioAutoStart', v)}
      disabled={!settings.ambientAudioVisible}
    />
  </label>
  
  {/* Default sound picker (visible only when auto-start is on) */}
  {settings.ambientAudioAutoStart && (
    <div className="py-2">
      <span className="mb-2 block text-sm text-white/60">Default sound</span>
      <SoundPicker
        value={settings.ambientAudioAutoStartSound}
        onChange={(id) => onUpdate('ambientAudioAutoStartSound', id)}
      />
    </div>
  )}
</div>
```

**ToggleSwitch** — a small inline component (or extracted):

```tsx
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-white/20',
        disabled && 'cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
```

**SoundPicker** — a compact selector showing the curated defaults + "Last played" option:

```tsx
function SoundPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const options = [
    { id: null, label: 'Last played sound' },
    ...['gentle-rain', 'ocean-waves', 'fireplace', 'soft-piano'].map(id => ({
      id,
      label: SOUND_BY_ID.get(id)?.name ?? id,
    })),
  ]
  
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.id ?? 'last-played'}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs transition-colors',
            (value === opt.id || (value === null && opt.id === null))
              ? 'bg-primary text-white'
              : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

**Auth gating:** TypographySheet is accessible without auth (same as theme/font settings). Audio settings are localStorage-only.

**Responsive behavior:**
- Desktop (1024px+): Settings in floating panel (existing TypographySheet layout)
- Mobile: Settings in bottom sheet (existing TypographySheet layout)
- Toggles and sound picker full-width within the panel

**Guardrails (DO NOT):**
- Do NOT move audio settings to a separate modal — they belong in the existing TypographySheet alongside other reader settings
- Do NOT use checkboxes — use toggle switches matching the existing Focus Mode toggles
- Do NOT show the sound picker when auto-start is disabled
- Do NOT allow enabling auto-start when visibility is off — the toggle is disabled and visually dimmed

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders "Background sound" section heading | unit | `screen.getByText('Background sound')` |
| "Show audio control" toggle reflects setting | unit | `ambientAudioVisible: true` → checked; false → unchecked |
| toggling "Show audio control" calls onUpdate | unit | Click toggle → `onUpdate('ambientAudioVisible', false)` |
| "Auto-start" toggle disabled when visibility off | unit | `ambientAudioVisible: false` → auto-start toggle has `disabled` attr |
| "Auto-start" toggle enabled when visibility on | unit | `ambientAudioVisible: true` → auto-start toggle interactive |
| sound picker visible only when auto-start on | unit | `ambientAudioAutoStart: false` → no sound picker; true → picker renders |
| sound picker shows "Last played" + 4 curated sounds | unit | 5 buttons rendered |
| selecting a sound calls onUpdate | unit | Click "Ocean Waves" → `onUpdate('ambientAudioAutoStartSound', 'ocean-waves')` |
| "Last played" option selected when value is null | unit | `ambientAudioAutoStartSound: null` → "Last played" has active style |

**Expected state after completion:**
- [ ] TypographySheet has "Background sound" section below Focus Mode
- [ ] Visibility toggle, auto-start toggle, and sound picker all functional
- [ ] Auto-start disabled when visibility is off
- [ ] Sound picker hidden when auto-start is off
- [ ] All 9 tests pass

---

### Step 6: Auto-Start Hook

**Objective:** Build a hook that automatically starts the user's preferred ambient sound when a chapter opens, if auto-start is enabled and no audio is already playing.

**Files to create:**
- `src/hooks/useReaderAudioAutoStart.ts`
- `src/hooks/__tests__/useReaderAudioAutoStart.test.ts`

**Details:**

```typescript
interface UseReaderAudioAutoStartOptions {
  enabled: boolean          // settings.ambientAudioAutoStart
  preferredSoundId: string | null  // settings.ambientAudioAutoStartSound
  volume: number            // settings.ambientAudioVolume (0-100)
  bookName: string
  chapter: number
  isReady: boolean          // verses loaded, not loading
}

export function useReaderAudioAutoStart({
  enabled,
  preferredSoundId,
  volume,
  bookName,
  chapter,
  isReady,
}: UseReaderAudioAutoStartOptions): void {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const readingContextControl = useReadingContext()
  const { isAuthenticated } = useAuth()
  const hasAutoStarted = useRef(false)
  
  useEffect(() => {
    // Reset auto-start flag on chapter change
    hasAutoStarted.current = false
  }, [bookName, chapter])
  
  useEffect(() => {
    if (!enabled || !isReady || !isAuthenticated) return
    if (hasAutoStarted.current) return
    // Don't auto-start if audio is already playing (spec #27)
    if (audioState.isPlaying || audioState.activeSounds.length > 0) return
    
    hasAutoStarted.current = true
    
    // Resolve sound ID
    let soundId = preferredSoundId
    if (!soundId || !SOUND_BY_ID.has(soundId)) {
      // Fall through to last-played
      const history = storageService.getListeningHistory()
      const lastAmbient = history.find(s => s.contentType === 'ambient')
      soundId = lastAmbient?.contentId ?? null
    }
    
    // Validate sound still exists in catalog
    if (!soundId || !SOUND_BY_ID.has(soundId)) return // silent failure (spec #28)
    
    const sound = SOUND_BY_ID.get(soundId)!
    
    // Set reader-context volume (default 35/100)
    dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: volume / 100 } })
    
    // Start the sound
    const url = `${AUDIO_BASE_URL}ambient/${sound.filename}`
    engine.ensureContext()
    engine.addSound(sound.id, url, AUDIO_CONFIG.DEFAULT_SOUND_VOLUME)
    dispatch({
      type: 'ADD_SOUND',
      payload: { soundId: sound.id, volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME, label: sound.name, url },
    })
    
    // Set reading context for media session
    readingContextControl.setReadingContext({ book: bookName, chapter })
  }, [enabled, isReady, isAuthenticated, bookName, chapter]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

**Key behaviors:**
- Only fires once per chapter load (via `hasAutoStarted` ref)
- Does NOT re-trigger on chapter navigation if audio is already playing (spec #27)
- Falls through to last-played sound if preferred sound is missing from library (spec #28)
- Silent failure if no valid sound found
- Requires auth (no-ops when logged out)
- Sets master volume to the reader's preferred volume (default 35)

**Auth gating:** Only fires when `isAuthenticated === true`. Logged-out users never get auto-start.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT auto-start if audio is already playing from the Music page or another source
- Do NOT show an error if the preferred sound is missing — silent fallback
- Do NOT create a new AudioContext — use the existing engine
- Do NOT auto-start on every render — only once per chapter mount
- Do NOT auto-start for logged-out users

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| auto-starts preferred sound when enabled + no audio playing | unit | enabled=true, no active sounds → ADD_SOUND dispatched with preferred sound |
| does NOT auto-start when disabled | unit | enabled=false → no dispatch |
| does NOT auto-start when audio already playing | unit | activeSounds.length > 0 → no dispatch |
| does NOT re-trigger on chapter navigation | unit | Change chapter with audio already playing → no new dispatch |
| falls back to last-played when preferred sound missing | unit | preferredSoundId not in SOUND_BY_ID → uses last ambient from history |
| silent failure when no valid sound available | unit | No preferred, no history → no dispatch, no error |
| does NOT auto-start when not authenticated | unit | isAuthenticated=false → no dispatch |
| sets master volume to reader preference | unit | volume=35 → SET_MASTER_VOLUME dispatched with 0.35 |
| sets reading context on auto-start | unit | Auto-start fires → setReadingContext called |
| resets auto-start flag on chapter change | unit | Navigate to new chapter → auto-start eligible again |

**Expected state after completion:**
- [ ] Hook auto-starts preferred sound on chapter mount
- [ ] Respects all guard conditions (enabled, auth, already playing)
- [ ] Falls through correctly when sound is missing
- [ ] Sets reader-preferred volume
- [ ] All 10 tests pass

---

### Step 7: Wire Auto-Start into BibleReader

**Objective:** Call `useReaderAudioAutoStart` in BibleReader with the correct parameters from reader settings and page state.

**Files to modify:**
- `src/pages/BibleReader.tsx` — add the auto-start hook call

**Details:**

In `BibleReaderInner`, after the existing hooks:

```typescript
// Auto-start ambient audio (BB-20)
useReaderAudioAutoStart({
  enabled: settings.ambientAudioAutoStart,
  preferredSoundId: settings.ambientAudioAutoStartSound,
  volume: settings.ambientAudioVolume,
  bookName: book?.name ?? '',
  chapter: chapterNumber,
  isReady: !isLoading && verses.length > 0,
})
```

This is a simple wiring step — the hook does all the heavy lifting.

**Auth gating:** Handled by the hook internally.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT add any auto-start logic directly in BibleReader — it belongs in the hook
- Do NOT pass `isAuthenticated` manually — the hook reads it from context

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| auto-start hook called with correct settings | integration | Mount BibleReader with auto-start settings → hook receives correct props |
| auto-start does not fire while loading | integration | BibleReader loading state → hook `isReady=false` → no sound started |

**Expected state after completion:**
- [ ] `useReaderAudioAutoStart` is called in BibleReader
- [ ] Auto-start fires after chapter loads when enabled
- [ ] All 2 tests pass

---

### Step 8: Tailwind Keyframe + Update localStorage Key Inventory

**Objective:** Register the `audio-pulse` keyframe animation in Tailwind config and document new localStorage keys.

**Files to modify:**
- `tailwind.config.js` — add `audio-pulse` keyframe and animation
- `.claude/rules/11-local-storage-keys.md` — document 4 new keys

**Details:**

In `tailwind.config.js`, under `extend.keyframes`:

```javascript
'audio-pulse': {
  '0%, 100%': { opacity: '0' },
  '50%': { opacity: '1' },
},
```

Under `extend.animation`:

```javascript
'audio-pulse': 'audio-pulse 2s ease-in-out infinite',
```

In `11-local-storage-keys.md`, add to the Bible Reader section:

```markdown
| `wr_bible_reader_ambient_visible` | `'true' \| 'false'` | Show audio control in reader chrome (default: true) |
| `wr_bible_reader_ambient_autostart` | `'true' \| 'false'` | Auto-start sound on chapter open (default: false) |
| `wr_bible_reader_ambient_autostart_sound` | `string \| null` | Sound ID for auto-start (default: null = last played) |
| `wr_bible_reader_ambient_volume` | `string (number)` | Last-used reader volume 0-100 (default: 35) |
```

**Auth gating:** N/A.
**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT remove any existing keyframes or animations
- Do NOT modify any existing localStorage key documentation

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `animate-audio-pulse` class applies correctly | manual | Visual check in browser — pulse ring on playing audio icon |

**Expected state after completion:**
- [ ] `audio-pulse` animation registered in Tailwind
- [ ] 4 new localStorage keys documented
- [ ] Build passes cleanly

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend ReaderSettings with audio fields |
| 2 | — | Reading context in AudioProvider |
| 3 | 1, 2 | AmbientAudioPicker component (needs settings for volume, needs reading context) |
| 4 | 1, 2, 3 | Wire icon + picker into BibleReader |
| 5 | 1 | Background sound section in TypographySheet |
| 6 | 1, 2 | Auto-start hook (needs settings + reading context) |
| 7 | 4, 6 | Wire auto-start into BibleReader |
| 8 | 4 | Tailwind keyframe + docs |

Steps 1 and 2 can be done in parallel.
Steps 3, 5, and 6 can be done in parallel (all depend on 1 and/or 2).
Steps 4, 7, and 8 are sequential after their dependencies.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend ReaderSettings with Audio Fields | [COMPLETE] | 2026-04-09 | Modified `useReaderSettings.ts` — added 4 new fields (ambientAudioVisible, ambientAudioAutoStart, ambientAudioAutoStartSound, ambientAudioVolume) with type-specific parsing (boolean, nullable string, number with 0-100 clamp). 15 tests pass. |
| 2 | Reading Context in AudioProvider | [COMPLETE] | 2026-04-09 | Added `readingContext` to AudioState + 2 action types. Extended media session metadata. Created `useReadingContext` hook. 3 new reducer tests pass (45 total). |
| 3 | AmbientAudioPicker Component | [COMPLETE] | 2026-04-09 | Created `AmbientAudioPicker.tsx` with bottom sheet (mobile) / popover (desktop), quick-row, volume, browse/timer/stop. 13 tests pass. Used `useFocusTrap` returned ref pattern. |
| 4 | Audio Control Icon + Wire into BibleReader | [COMPLETE] | 2026-04-09 | Added Volume2 icon to ReaderChrome with pulse animation. Wired picker into BibleReader with mutual exclusion (verse sheet, typography sheet). Focus mode pause, reading context set/clear. 173 existing tests pass. |
| 5 | Background Sound Section in TypographySheet | [COMPLETE] | 2026-04-09 | Added "Background sound" section with visibility toggle, auto-start toggle, and SoundPicker sub-component. 9 new tests (23 total) pass. |
| 6 | Auto-Start Hook | [COMPLETE] | 2026-04-09 | Created `useReaderAudioAutoStart.ts` with chapter-once guard, auth check, fallback logic, volume setting. 10 tests pass. |
| 7 | Wire Auto-Start into BibleReader | [COMPLETE] | 2026-04-09 | Added `useReaderAudioAutoStart` call in BibleReaderInner with correct settings props. All 192 tests pass. |
| 8 | Tailwind Keyframe + localStorage Docs | [COMPLETE] | 2026-04-09 | Added `audio-pulse` keyframe + animation to tailwind.config.js. Documented 4 new localStorage keys in 11-local-storage-keys.md. Build passes. |
