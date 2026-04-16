# Implementation Plan: Bible Reader — Audio Playback with TTS

**Spec:** `_specs/bible-reader-audio-playback.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/bible-reader-audio-playback`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** not applicable (Bible reader is a standalone 3-spec sequence)

> **⚠️ Design system recon may be stale** — captured before Bible reader (Specs 1-2) was built. Bible reader pages are not in the recon. Styling values for the Bible reader are sourced from codebase inspection of `BibleReader.tsx` and related components.

---

## Architecture Context

### Existing Bible Reader Architecture

The Bible reader is a 2-page feature:
- **`/bible`** → `BibleBrowser` (book list, search, highlights/notes management)
- **`/bible/:book/:chapter`** → `BibleReader` (chapter reading view)

**Key files:**
- `frontend/src/pages/BibleReader.tsx` — Main reading view (551 lines). Uses `<Layout>`, dark gradient background, `max-w-2xl` content column. Verses rendered as interactive `<span>` elements with inline highlights and notes.
- `frontend/src/components/bible/ChapterSelector.tsx` — Dropdown chapter picker
- `frontend/src/components/bible/ChapterNav.tsx` — Previous/Next chapter links
- `frontend/src/components/bible/ChapterPlaceholder.tsx` — Stub for books without full text (`hasFullText: false`)
- `frontend/src/hooks/useBibleProgress.ts` — `markChapterRead(bookSlug, chapter)`, auth-gated, writes to `wr_bible_progress` in localStorage
- `frontend/src/hooks/useBibleHighlights.ts` — Persistent color highlights at 15% opacity via inline `style` prop
- `frontend/src/hooks/useBibleNotes.ts` — Inline note editing

**Verse rendering pattern** (BibleReader.tsx lines 398-481):
```tsx
{verses.map((verse) => {
  const highlight = chapterHighlights.find((h) => h.verseNumber === verse.number)
  const highlightStyle = highlight
    ? { backgroundColor: hexToRgba(highlight.color, 0.15) }
    : undefined
  return (
    <div key={verse.number}>
      <span
        id={`verse-${verse.number}`}
        role="button" tabIndex={0}
        className={cn('cursor-pointer rounded transition-colors duration-[2000ms]', ...)}
        style={highlightStyle}
        aria-label={`Verse ${verse.number}`}
      >
        <sup className="mr-1 align-super font-sans text-xs text-white/30">{verse.number}</sup>
        {/* NoteIndicator inline if note exists */}
        <span className="font-serif text-base leading-[1.8] text-white/90 sm:text-lg">{verse.text}</span>
      </span>
      {/* NoteEditor if editing */}
    </div>
  )
})}
<div ref={sentinelRef} aria-hidden="true" className="h-1" /> {/* IO sentinel for scroll completion */}
```

**Chapter completion via scroll** (BibleReader.tsx lines 124-154): IntersectionObserver on sentinel div at 50% threshold. Auth-gated, once-per-load via `hasMarkedRef`.

**Chapter navigation** (BibleReader.tsx line 156-163): `handleChapterSelect` navigates to `/bible/${bookSlug}/${chapter}`, scrolls to top.

**Chapter reset** (BibleReader.tsx lines 67-75): On `[bookSlug, chapterNumber]` change, resets `selectedVerse`, `showColorPicker`, `editingNoteVerse`, etc.

### TTS System

**`useReadAloud` hook** (`frontend/src/hooks/useReadAloud.ts`, 91 lines): Single-text TTS via `SpeechSynthesisUtterance`. Tracks word index via `onboundary`. Returns `{ state, currentWordIndex, play, pause, resume, stop }`. This hook reads a single text block — it is NOT used for verse-by-verse chapter reading. The new `useBibleAudio` hook will be purpose-built for sequential verse playback.

### Audio System

**`AudioProvider`** (`frontend/src/components/audio/AudioProvider.tsx`, 308 lines): Wraps app with 4 contexts:
- `useAudioState()` → `AudioState` (includes `activeSounds`, `masterVolume`, `isPlaying`, `currentSceneName`, `drawerOpen`)
- `useAudioDispatch()` → action dispatcher
- `useAudioEngine()` → `AudioEngineService` (Web Audio API)
- `useSleepTimerControls()` → `SleepTimerControls` (phase, isActive, start/pause/resume/cancel)

**`useScenePlayer` hook** (`frontend/src/hooks/useScenePlayer.ts`, 238 lines): Loads scenes with auth gating (shows auth modal if not authenticated). Returns `{ loadScene, activeSceneId, ... }`.

**`AmbientSoundPill` component** (`frontend/src/components/daily/AmbientSoundPill.tsx`, 229 lines): Context-aware pill with expand/collapse for scene suggestions. Uses `useScenePlayer()` for auth-gated scene loading. Has `variant: 'light' | 'dark'` prop. Waveform bars when audio playing.

**Ambient suggestions** (`frontend/src/constants/ambient-suggestions.ts`, 25 lines): Maps `AmbientContext` → scene IDs. Need to add `'bible-reading'` context.

### Sleep Timer

**`useSleepTimerControls()`** returns `{ phase, isActive, ... }`. Phases: `'full-volume' | 'fading' | 'complete' | null`. When `phase === 'fading'` or `phase === 'complete'`, TTS should stop after the current verse.

### Meditation Minutes

**`meditation-storage.ts`** (`frontend/src/services/meditation-storage.ts`, 76 lines): `saveMeditationSession(session)` writes to `wr_meditation_history`. Session structure: `{ id, type: MeditationType, date, durationMinutes, completedAt }`.

**`MeditationType`** (`frontend/src/types/daily-experience.ts` line 74): Currently `'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen'`. Need to add `'bible-audio'`.

### Navbar & Sticky Positioning

The navbar (`Navbar.tsx`) is NOT fixed or sticky — it scrolls with the page. It uses `top-0 z-50` but no `fixed` or `sticky`. So the audio bar should use `sticky top-0 z-30` to stick at the top of the viewport when scrolled past.

### Test Patterns

- Tests co-located in `__tests__/` subdirectories
- Provider wrapping: `MemoryRouter` → `ToastProvider` → `AuthModalProvider`
- Hook mocking: `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }))`
- Speech Synthesis: Tests mock the hook, not `window.speechSynthesis` directly
- Use `renderHook()` for hook tests, `act()` for state updates, `waitFor()` for async
- Clear `localStorage` in `beforeEach()`
- Test auth-gated behavior by toggling `mockAuth.isAuthenticated`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Play/Pause/Stop TTS | No auth required | Step 2 | N/A — open to all |
| Speed selector | No auth required | Step 2 | N/A — open to all |
| Voice gender toggle | No auth required | Step 2 | N/A — open to all |
| Scene suggestion card click | Auth modal: "Sign in to play ambient scenes" | Step 4 | Via `useScenePlayer()` (existing auth gating) |
| Chapter completion via audio | Auth-gated (no-op for logged-out) | Step 5 | `isAuthenticated` check before `markChapterRead()` |
| Meditation minutes recording | Auth-gated (no-op for logged-out) | Step 5 | `isAuthenticated` check before `saveMeditationSession()` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Audio bar container | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3` | Spec + codebase pattern (ChapterSelector dropdown) |
| Audio bar sticky shadow | box-shadow | `shadow-md` (when sticky) | Spec |
| Play/Pause icon | size + color | 20px, `text-primary` | Spec |
| Stop icon | size + color | 20px, `text-white/40 hover:text-white/60` | Spec |
| Speed pill (selected) | style | `bg-primary/20 text-primary font-medium px-2 py-1 rounded-full text-xs` | Spec |
| Speed pill (unselected) | style | `text-white/50 hover:text-white/70 px-2 py-1 rounded-full text-xs` | Spec |
| Progress text | style | `text-white/50 text-sm` | Spec |
| Voice toggle (selected) | color | `text-primary` | Spec |
| Voice toggle (unselected) | color | `text-white/30` | Spec |
| Touch targets | min size | `min-h-[44px] min-w-[44px]` | Spec + a11y standard |
| TTS verse highlight | border + bg | `border-l-2 border-primary bg-primary/5` | Spec |
| TTS highlight transition | duration | `200ms` on `background-color` and `border-left-color` | Spec |
| Ambient chip (inactive) | style | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-full py-2 px-4` | Spec |
| Ambient chip (playing) | style | Same + `border-l-2 border-primary` | Spec |
| Suggestion panel | style | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3` | Spec |
| Scene card | style | `bg-white/5 hover:bg-white/10 rounded-lg p-3` | Spec |
| Reader background | gradient | `READER_BG_STYLE` in BibleReader.tsx line 23-27 | Codebase |
| Content column | max-width | `max-w-2xl` | BibleReader.tsx line 384 |
| Primary color | hex | `#6D28D9` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for decorative headings, Lora (`font-serif`) for scripture text, Inter (`font-sans`) for UI
- Bible reader verses use `font-serif text-base leading-[1.8] text-white/90 sm:text-lg`
- Bible reader uses dark gradient background (`READER_BG_STYLE`), NOT neutral-bg
- Frosted glass in Bible reader: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` (NOT the dashboard's `rounded-2xl`)
- All tabs / content columns share `max-w-2xl` container width
- Spec 2 highlights use inline `style={{ backgroundColor: hexToRgba(color, 0.15) }}` — TTS highlight uses CSS classes (`border-l-2 border-primary bg-primary/5`) so they coexist
- `primary` = `#6D28D9`, `primary-lt` = `#8B5CF6`
- Touch targets: `min-h-[44px] min-w-[44px]` on all interactive elements
- Navbar scrolls with page (not fixed/sticky) — sticky elements use `top-0`

---

## Shared Data Models

### Existing Types Used

```typescript
// types/bible.ts
interface BibleVerse { number: number; text: string }
interface BibleBook { name: string; slug: string; chapters: number; hasFullText: boolean; /* ... */ }
type BibleProgressMap = Record<string, number[]>

// types/daily-experience.ts (MODIFIED in Step 1)
type MeditationType = 'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen' | 'bible-audio'

// types/meditation.ts
interface MeditationSession { id: string; type: MeditationType; date: string; durationMinutes: number; completedAt: string }
```

### localStorage Keys This Spec Touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_progress` | Write | Mark chapter read when audio completes (existing key from Spec 1) |
| `wr_meditation_history` | Write | Record bible-audio meditation session (existing key from Spec 13) |

**No new localStorage keys introduced.**

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Audio bar wraps into 2 rows: Row 1 = play/stop + speed pills (scrollable), Row 2 = progress + voice toggle. Ambient chip full width. |
| Tablet | 768px | Audio bar single row within `max-w-2xl`. All controls visible. Ambient chip auto-width. |
| Desktop | 1440px | Audio bar single row, comfortable spacing. Hover states visible. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Chapter selector → Audio bar | `mt-4` (16px) | Codebase inspection (ChapterSelector is in its own `pt-4` div) |
| Audio bar → Ambient chip | `mt-2` (8px) | Spec ("below the audio control bar") |
| Ambient chip → Verse text | `py-8 sm:py-12` (existing verse section padding) | BibleReader.tsx line 397 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (`bible-reader-browser.md`) is complete and committed
- [x] Spec 2 (`bible-reader-highlights-notes.md`) is complete and committed
- [x] `AudioProvider` wraps the app in `App.tsx` (required for ambient integration)
- [x] All auth-gated actions from the spec are accounted for in the plan (3 actions: scene play, chapter completion, meditation recording)
- [x] Design system values are from codebase inspection (recon predates Bible reader)
- [ ] `speechSynthesis` API is available in test environment (jsdom does NOT support it — must mock)
- [ ] All [UNVERIFIED] values are flagged with verification methods (none in this plan — all values from spec or codebase)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Create new hook vs extend `useReadAloud` | New `useBibleAudio` hook | `useReadAloud` reads a single text block with word tracking. Bible audio needs verse-by-verse sequential playback, speed control, voice selection, auto-scroll, and cross-system integration (sleep timer, ambient volume, meditation tracking). Too many differences to extend. |
| Create new ambient chip vs reuse `AmbientSoundPill` | New `BibleAmbientChip` component | Spec calls for "Add background sounds" (not "Enhance with sound"), frosted glass styling matching Bible reader (not light/dark variant), and integration with volume reduction. Small dedicated component is cleaner than adding props to existing. |
| Ambient volume reduction approach | Direct engine call, not dispatch | Volume reduction is transient — user's "intended" volume stays the same. Using `engine.setMasterVolume()` changes the actual gain node without updating UI state, so the slider stays where the user set it. Volume restores on TTS pause/stop. |
| Sticky bar `top` value | `top-0` | Navbar scrolls with page (not fixed), so sticky elements stick at viewport top. Matches existing pattern in DailyHub/MusicPage (`sticky top-0 z-40`). |
| Voice gender filtering | Case-insensitive search on `voice.name` | Spec says filter for "female" or "male" in voice name. Some browsers use "Female" or "Male" in names. |
| Auto-scroll visibility check | `IntersectionObserver` | More reliable than `getBoundingClientRect` for checking if verse is already visible. Only scroll if verse is NOT intersecting viewport. |
| Where to place audio bar in DOM | Between ChapterSelector and verse content, inside `max-w-2xl` container | Spec says "below chapter heading and above verse text". The ChapterSelector is the chapter heading area. |

---

## Implementation Steps

### Step 1: Data Model & Constants Changes

**Objective:** Extend the `MeditationType` union to include `'bible-audio'` and add a `'bible-reading'` context to the ambient suggestions system.

**Files to create/modify:**
- `frontend/src/types/daily-experience.ts` — Add `'bible-audio'` to `MeditationType` union
- `frontend/src/constants/ambient-suggestions.ts` — Add `'bible-reading'` context with scene IDs

**Details:**

In `types/daily-experience.ts` line 74-80, add `'bible-audio'` to the union:
```typescript
export type MeditationType =
  | 'breathing'
  | 'soaking'
  | 'gratitude'
  | 'acts'
  | 'psalm'
  | 'examen'
  | 'bible-audio'
```

In `constants/ambient-suggestions.ts`, add `'bible-reading'` to the `AmbientContext` type and the `AMBIENT_SCENE_IDS` map:
```typescript
export type AmbientContext =
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'breathing'
  | 'soaking'
  | 'other-meditation'
  | 'bible-reading'

const AMBIENT_SCENE_IDS: Record<AmbientContext, string[]> = {
  // ... existing entries ...
  'bible-reading': ['still-waters', 'the-upper-room', 'morning-mist'],
}
```

**Guardrails (DO NOT):**
- Do NOT change any existing enum values or scene IDs
- Do NOT add new localStorage keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `bible-audio` is valid MeditationType | unit | Type check that `'bible-audio'` is assignable to `MeditationType` |
| `getSuggestedScenes('bible-reading')` returns 3 scenes | unit | Verify the 3 Bible reading scenes resolve correctly |

**Expected state after completion:**
- [x] `MeditationType` includes `'bible-audio'`
- [x] `AmbientContext` includes `'bible-reading'`
- [x] `getSuggestedScenes('bible-reading')` returns Still Waters, The Upper Room, Morning Mist
- [x] No existing code breaks (all existing values unchanged)

---

### Step 2: `useBibleAudio` Hook

**Objective:** Create the core TTS hook for verse-by-verse chapter reading with speed control, voice selection, auto-scroll, sleep timer integration, ambient volume reduction, and completion/meditation tracking.

**Files to create/modify:**
- `frontend/src/hooks/useBibleAudio.ts` — New hook file

**Details:**

**Hook signature:**
```typescript
interface UseBibleAudioOptions {
  verses: BibleVerse[]
  bookSlug: string
  chapterNumber: number
  isAuthenticated: boolean
  hasFullText: boolean
  isChapterAlreadyRead: boolean
  onChapterComplete: () => void  // calls markChapterRead
}

interface UseBibleAudioReturn {
  playbackState: 'idle' | 'playing' | 'paused'
  currentVerseIndex: number      // 0-based, -1 when idle
  totalVerses: number
  speed: number                  // 0.75, 1, 1.25, 1.5
  setSpeed: (speed: number) => void
  voiceGender: 'male' | 'female'
  setVoiceGender: (gender: 'male' | 'female') => void
  availableVoiceCount: number    // for hiding toggle when <=1
  play: () => void
  pause: () => void
  stop: () => void
  isSupported: boolean           // false if speechSynthesis unavailable
}
```

**Core TTS logic:**
1. Guard: If `typeof window === 'undefined' || !window.speechSynthesis`, set `isSupported = false` and return early from all methods.
2. **`play()`**: If idle, start from verse 0. If paused, call `speechSynthesis.resume()`. Create `SpeechSynthesisUtterance` for current verse text. Set `utterance.rate = speed`. Set `utterance.voice` based on `voiceGender` filter (case-insensitive match on `voice.name`). Call `speechSynthesis.speak(utterance)`.
3. **`pause()`**: Call `speechSynthesis.pause()`. Set state to `'paused'`.
4. **`stop()`**: Call `speechSynthesis.cancel()`. Reset `currentVerseIndex` to -1. Set state to `'idle'`. Clear any pending timeouts.
5. **Inter-verse sequencing**: On `utterance.onend`, wait 300ms (`setTimeout`), then check sleep timer phase. If `phase === 'fading'` or `phase === 'complete'`, stop. Otherwise, advance to next verse. If at last verse, fire completion.
6. **Speed/voice changes**: Store in state. Apply to next utterance (not current).

**Voice selection:**
```typescript
const voices = speechSynthesis.getVoices()
const matchingVoice = voices.find((v) =>
  v.name.toLowerCase().includes(voiceGender)
)
// Use matchingVoice if found, else default
```
Listen for `voiceschanged` event to get voice list asynchronously. Count available voices for toggle visibility.

**Auto-scroll** (inside the hook via refs):
1. Create refs for each verse element (`verseRefs: Map<number, HTMLElement>`)
2. Actually, better approach: Use `document.getElementById(`verse-${verseNumber}`)` since IDs already exist.
3. When a new verse starts playing, check if it's in viewport using IntersectionObserver or `getBoundingClientRect`.
4. If off-screen and `prefers-reduced-motion` is NOT active, call `el.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
5. **Manual scroll pause**: Add `scroll` event listener. On manual scroll, set `autoScrollPaused = true`. After 5s of no scroll events, set `autoScrollPaused = false`. Use `lastManualScrollTime` ref + setTimeout.
6. **Reduced motion**: If `prefers-reduced-motion` matches, skip all auto-scroll.

**Ambient volume reduction:**
1. Use `useAudioEngine()` and `useAudioState()` from AudioProvider.
2. Store `savedMasterVolume` ref.
3. When TTS starts speaking a verse: if `audioState.activeSounds.length > 0`, save current `audioState.masterVolume` to ref, then call `engine.setMasterVolume(Math.min(savedVolume, 0.3))` (only if savedVolume > 0.3).
4. When TTS pauses or stops: if `savedMasterVolume` ref is set, call `engine.setMasterVolume(savedMasterVolume)`, clear ref.

**Sleep timer integration:**
1. Use `useSleepTimerControls()` from AudioProvider.
2. In the inter-verse callback (after `onend`): check `sleepTimer.phase`. If `'fading'` or `'complete'`, call `stop()` instead of advancing to next verse.

**Chapter completion:**
1. When the last verse's `onend` fires and we're not stopping early: call `onChapterComplete()` (which wraps `markChapterRead`).
2. Only if `isAuthenticated` and `!isChapterAlreadyRead` (prevent duplicate writes).

**Meditation minutes recording:**
1. Track `startTime` ref when play starts (from verse 0 only, not resume).
2. When last verse completes (full chapter listen): calculate duration = `(Date.now() - startTime) / 60000`, round to nearest minute, min 1.
3. Call `saveMeditationSession({ id: crypto.randomUUID(), type: 'bible-audio', date: getLocalDateString(new Date()), durationMinutes, completedAt: new Date().toISOString() })`.
4. Only if `isAuthenticated`.

**Cleanup:**
- On unmount: `speechSynthesis.cancel()`, clear timeouts, restore ambient volume.
- On `[bookSlug, chapterNumber]` change: call `stop()` to reset playback.

**Guardrails (DO NOT):**
- Do NOT import or modify `useReadAloud` — this is a separate hook
- Do NOT dispatch `SET_MASTER_VOLUME` action — use engine directly to avoid changing UI slider state
- Do NOT call `speechSynthesis.speak()` with all verses queued — one at a time only
- Do NOT auto-scroll when `prefers-reduced-motion` is active
- Do NOT record meditation session for partial listens

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns `isSupported: false` when speechSynthesis unavailable | unit | Verify graceful degradation |
| Play starts from verse 0 | unit | Mock speechSynthesis, verify speak() called with verse 1 text |
| Pause calls speechSynthesis.pause() | unit | Verify API call |
| Stop calls speechSynthesis.cancel() and resets state | unit | Verify reset |
| Speed change updates utterance.rate on next verse | unit | Change speed mid-playback |
| Inter-verse 300ms pause | unit | Verify setTimeout between verses |
| Chapter completion fires on last verse end (authenticated) | unit | Verify onChapterComplete called |
| Chapter completion does NOT fire when unauthenticated | unit | Verify no-op |
| Meditation session recorded on full chapter (authenticated) | unit | Verify saveMeditationSession called |
| Meditation session NOT recorded on partial listen | unit | Stop mid-chapter, verify no save |
| Sleep timer fading stops playback after current verse | unit | Set phase='fading', verify no next verse |
| Cleanup cancels speech on unmount | unit | Unmount hook, verify cancel called |
| Auto-scroll calls scrollIntoView when verse off-screen | unit | Mock element visibility |
| Auto-scroll paused during manual scroll | unit | Fire scroll event, verify no auto-scroll for 5s |
| Auto-scroll disabled when prefers-reduced-motion | unit | Match reduced motion, verify no scroll |
| Voice gender toggle changes voice on next verse | unit | Switch gender, verify voice set |
| Voice toggle hidden when only 1 voice available | unit | Return availableVoiceCount=1 |

**Expected state after completion:**
- [x] `useBibleAudio` hook created with all TTS logic
- [x] Verse-by-verse playback with 300ms inter-verse pause
- [x] Speed, voice, auto-scroll, sleep timer, ambient volume all handled
- [x] Chapter completion and meditation tracking integrated
- [x] Hook is fully self-contained — no UI rendering

---

### Step 3: `AudioControlBar` Component

**Objective:** Create the frosted glass audio control bar with play/pause, stop, speed pills, progress indicator, and voice gender toggle.

**Files to create/modify:**
- `frontend/src/components/bible/AudioControlBar.tsx` — New component

**Details:**

**Props interface:**
```typescript
interface AudioControlBarProps {
  playbackState: 'idle' | 'playing' | 'paused'
  currentVerseIndex: number      // 0-based
  totalVerses: number
  speed: number
  onSpeedChange: (speed: number) => void
  voiceGender: 'male' | 'female'
  onVoiceGenderChange: (gender: 'male' | 'female') => void
  availableVoiceCount: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
}
```

**Layout (single row on tablet/desktop, wraps on mobile):**
```
[▶/⏸] [■] [0.75x] [1x] [1.25x] [1.5x]  Verse 3 of 28  [♂] [♀]
```

**Mobile wrap (< 640px) — two rows:**
```
Row 1: [▶/⏸] [■] [0.75x] [1x] [1.25x] [1.5x] (scrollable)
Row 2: Verse 3 of 28  [♂] [♀]
```

**Container styling:**
```
bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3
```

Sticky: `sticky top-0 z-30`. When stuck, add `shadow-md` via IntersectionObserver sentinel above the bar (same technique as DailyHub tab bar).

**Play/Pause button:**
- Lucide `Play` icon (idle/paused) or `Pause` icon (playing), 20px
- `min-h-[44px] min-w-[44px]` touch target
- `text-primary` color
- `aria-label`: "Play chapter" (idle), "Pause reading" (playing), "Resume reading" (paused)
- Click: calls `onPlay` (idle/paused) or `onPause` (playing)

**Stop button:**
- Lucide `Square` icon, 20px
- `text-white/40 hover:text-white/60`
- `min-h-[44px] min-w-[44px]` touch target
- `aria-label`: "Stop reading"
- Disabled when idle (visually muted, no click handler)

**Speed pills:**
- 4 pills: `[0.75x, 1x, 1.25x, 1.5x]`
- Each: `px-2 py-1 rounded-full text-xs min-h-[32px]`
- Selected: `bg-primary/20 text-primary font-medium`
- Unselected: `text-white/50 hover:text-white/70`
- `role="radiogroup"` with `aria-label="Reading speed"`
- Each pill: `role="radio"`, `aria-checked`, `aria-label="Reading speed 0.75x"` etc.
- Container: `flex gap-1 overflow-x-auto flex-shrink-0` (scrollable on mobile)

**Progress text:**
- "Verse X of Y" — X = `currentVerseIndex + 1` (1-based display), Y = `totalVerses`
- `text-white/50 text-sm`
- `aria-live="polite"` — updates as each verse plays
- When idle: "Verse 1 of Y" (ready state)

**Voice gender toggle:**
- Hidden when `availableVoiceCount <= 1`
- Two icon buttons: Lucide `User` (male) and `UserRound` (female)
- 16px icons, `min-h-[44px] min-w-[44px]` touch targets
- Selected: `text-primary`
- Unselected: `text-white/30`
- `aria-label`: "Male voice" / "Female voice"
- `aria-pressed`: true for selected

**Responsive behavior:**
- Desktop (1440px): Single row, comfortable spacing with `gap-3` between sections
- Tablet (768px): Single row within `max-w-2xl`, all controls visible
- Mobile (375px): `flex flex-wrap` — controls wrap to 2 rows. Speed pills container scrollable.

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT add state management — this is a pure presentational component, all state comes from props
- Do NOT make the bar fixed — it must be sticky within the content flow
- Do NOT use inline styles — use Tailwind classes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders all controls | unit | Play, Stop, 4 speed pills, progress, voice toggle visible |
| Play button shows Play icon when idle | unit | Check icon rendering |
| Play button shows Pause icon when playing | unit | Check icon swap |
| Speed pill selected state | unit | Verify selected pill has correct classes |
| Voice toggle hidden when availableVoiceCount <= 1 | unit | Render with count=1, verify hidden |
| Progress text shows "Verse X of Y" | unit | Verify text content |
| Progress region has aria-live="polite" | unit | Check ARIA attribute |
| All buttons have aria-labels | unit | Check accessibility |
| All buttons meet 44px touch targets | unit | Check min-h/min-w classes |
| Speed pills have role="radiogroup" | unit | Check ARIA roles |
| Stop button disabled when idle | unit | Verify disabled state |

**Expected state after completion:**
- [x] `AudioControlBar` renders all controls per spec
- [x] Fully accessible (ARIA labels, roles, live regions)
- [x] Responsive (wraps on mobile, single row on tablet+)
- [x] Sticky with shadow when scrolled past
- [x] All visual styling matches spec exactly

---

### Step 4: `BibleAmbientChip` Component

**Objective:** Create the "Add background sounds" chip for the Bible reader, following the `AmbientSoundPill` pattern with Bible-reader-specific styling.

**Files to create/modify:**
- `frontend/src/components/bible/BibleAmbientChip.tsx` — New component

**Details:**

This component follows the same interaction model as `AmbientSoundPill` (`components/daily/AmbientSoundPill.tsx`) but with:
- Bible reader dark frosted glass styling (not the light/dark variant system)
- "Add background sounds" text (not "Enhance with sound")
- 3 Bible-reading scene suggestions from `getSuggestedScenes('bible-reading')`
- Collapse on click outside, Escape, or after starting a scene

**Structure (reuse hooks from AmbientSoundPill):**
- `useAudioState()` for detecting active audio
- `useAudioDispatch()` for opening drawer
- `useScenePlayer()` for loading scenes (includes auth gating)
- `getSuggestedScenes('bible-reading')` for scene list

**Inactive state (no audio playing):**
```
[🎵] Add background sounds
```
- Container: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-full py-2 px-4`
- Icon: Lucide `Music`, 16px, `text-white/50`
- Text: `text-sm text-white/50`
- Click: toggles expanded panel

**Active state (audio playing):**
```
[|||] Playing: Still Waters
```
- Container: same + `border-l-2 border-primary`
- Waveform animation (3 bars, same pattern as `AmbientSoundPill` lines 139-155)
- Text: `text-sm text-white/70 font-medium`
- Click: opens AudioDrawer via `dispatch({ type: 'OPEN_DRAWER' })`
- Waveform respects `prefers-reduced-motion` (static bars)

**Suggestion panel (expanded, no audio):**
- Container: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 mt-2`
- 3 scene cards in a row: `bg-white/5 hover:bg-white/10 rounded-lg p-3 min-h-[44px]`
- Scene card click: `loadScene(scene)` → collapses after 300ms
- "Browse all sounds →" link: `/music?tab=ambient`, `text-xs text-white/40 hover:text-white/60`
- Horizontal scroll on mobile, fits in row on tablet+

**Collapse behavior:**
- Click outside: collapse
- Escape: collapse + focus pill button
- After scene starts: collapse after 300ms delay

**Accessibility:**
- `aria-expanded` on pill button
- `aria-controls` linking to panel
- `aria-label`: "Add background sounds" (inactive), "Playing: [scene name], click to open audio controls" (active)
- Focus first card on expand (50ms delay, same as AmbientSoundPill)
- Panel: `role="region"`, `aria-label="Ambient sound suggestions"`
- Scene cards: `aria-label={scene.name}`

**Guardrails (DO NOT):**
- Do NOT modify `AmbientSoundPill.tsx` — create a separate component
- Do NOT handle auth gating directly — `useScenePlayer()` already shows auth modal for logged-out users
- Do NOT use light-theme colors — Bible reader is always dark
- Do NOT add new localStorage keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "Add background sounds" when no audio | unit | Check text content |
| Shows suggestion panel on click | unit | Click pill, verify panel appears |
| 3 scene cards in panel | unit | Check Still Waters, The Upper Room, Morning Mist |
| Panel collapses on Escape | unit | Press Escape, verify collapse |
| Panel collapses on click outside | unit | Click outside, verify collapse |
| Shows "Playing: [scene]" when audio active | unit | Set active audio state, check text |
| Opens AudioDrawer when audio playing and chip clicked | unit | Verify dispatch OPEN_DRAWER |
| Waveform bars render when audio playing | unit | Check waveform elements |
| "Browse all sounds" link points to /music?tab=ambient | unit | Check link href |
| Has correct ARIA attributes | unit | Check aria-expanded, aria-controls, aria-label |

**Expected state after completion:**
- [x] `BibleAmbientChip` renders correctly in both states (inactive/active)
- [x] Scene suggestions match spec (Still Waters, The Upper Room, Morning Mist)
- [x] Auth gating via `useScenePlayer` works (modal for logged-out)
- [x] Collapse behavior works (outside click, Escape, post-scene)
- [x] Fully accessible

---

### Step 5: BibleReader Integration

**Objective:** Wire `useBibleAudio` hook and new components into `BibleReader.tsx`. Add verse highlighting during TTS playback, integrate chapter completion via audio, and ensure chapter navigation stops playback.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — Modify to add audio bar, ambient chip, verse TTS highlighting, and integration logic

**Details:**

**New imports:**
```typescript
import { AudioControlBar } from '@/components/bible/AudioControlBar'
import { BibleAmbientChip } from '@/components/bible/BibleAmbientChip'
import { useBibleAudio } from '@/hooks/useBibleAudio'
```

**Hook instantiation** (after existing hooks, ~line 47):
```typescript
const bibleAudio = useBibleAudio({
  verses,
  bookSlug: bookSlug ?? '',
  chapterNumber,
  isAuthenticated,
  hasFullText: book?.hasFullText ?? false,
  isChapterAlreadyRead: bookSlug ? isChapterRead(bookSlug, chapterNumber) : false,
  onChapterComplete: () => {
    if (bookSlug) markChapterRead(bookSlug, chapterNumber)
  },
})
```

**Audio control bar placement** — between ChapterSelector and verse content, inside the `max-w-2xl` container. Only render if `bibleAudio.isSupported && book.hasFullText && !isLoading && verses.length > 0`:

```tsx
{/* Audio control bar */}
{bibleAudio.isSupported && book.hasFullText && !isLoading && verses.length > 0 && (
  <div className="mx-auto max-w-2xl px-4 sm:px-6">
    <div className="mt-4">
      <AudioControlBar
        playbackState={bibleAudio.playbackState}
        currentVerseIndex={bibleAudio.currentVerseIndex}
        totalVerses={bibleAudio.totalVerses}
        speed={bibleAudio.speed}
        onSpeedChange={bibleAudio.setSpeed}
        voiceGender={bibleAudio.voiceGender}
        onVoiceGenderChange={bibleAudio.setVoiceGender}
        availableVoiceCount={bibleAudio.availableVoiceCount}
        onPlay={bibleAudio.play}
        onPause={bibleAudio.pause}
        onStop={bibleAudio.stop}
      />
      <div className="mt-2">
        <BibleAmbientChip />
      </div>
    </div>
  </div>
)}
```

**Verse TTS highlighting** — modify the verse `<span>` className (line 423-428):

Add a TTS highlight class when the verse is the currently playing verse:
```tsx
const isTtsActive = bibleAudio.currentVerseIndex === index  // index is the 0-based map index

<span
  className={cn(
    'cursor-pointer rounded transition-colors duration-[2000ms]',
    highlightedVerse === verse.number && 'bg-primary/10',
    selectedVerse === verse.number && 'ring-1 ring-white/20',
    // TTS highlight: left border + subtle background
    isTtsActive && 'border-l-2 border-primary bg-primary/5 transition-all duration-200',
    // Override transition for TTS (200ms, not 2000ms)
    isTtsActive && '!duration-200',
  )}
  style={highlightStyle}
  aria-current={isTtsActive ? 'true' : undefined}
>
```

Note: The `transition-colors duration-[2000ms]` is for the URL hash highlight fade-out. TTS highlighting needs a faster 200ms transition. Use `!duration-200` to override when TTS is active, or restructure the transition classes so they don't conflict.

**Better approach for transition conflict:** Wrap the verse in a `<div>` that handles the TTS highlight border/bg separately:
```tsx
<div
  key={verse.number}
  className={cn(
    'transition-all duration-200',
    isTtsActive && 'border-l-2 border-primary bg-primary/5 pl-2',
  )}
  aria-current={isTtsActive ? 'true' : undefined}
>
  <span
    id={`verse-${verse.number}`}
    // ... existing attributes ...
    className={cn(
      'cursor-pointer rounded transition-colors duration-[2000ms]',
      highlightedVerse === verse.number && 'bg-primary/10',
      selectedVerse === verse.number && 'ring-1 ring-white/20',
    )}
    style={highlightStyle}
  >
    {/* verse content unchanged */}
  </span>
  {/* NoteEditor unchanged */}
</div>
```

This approach:
- Keeps TTS highlight (border-l + bg) on the outer `<div>` with 200ms transition
- Keeps existing highlight logic (URL hash, selection ring, Spec 2 colors) on the inner `<span>` unchanged
- No CSS conflicts between the two transition durations
- `aria-current="true"` on the outer div for screen readers

**`prefers-reduced-motion` for highlight transition:** When reduced motion is active, the `transition-all duration-200` class should become instant. Add a conditional:
```tsx
className={cn(
  'motion-safe:transition-all motion-safe:duration-200',
  isTtsActive && 'border-l-2 border-primary bg-primary/5 pl-2',
)}
```

**Chapter navigation stop** — the existing chapter reset effect (lines 67-75) runs on `[bookSlug, chapterNumber]` change. Add `bibleAudio.stop()` to it:
```typescript
useEffect(() => {
  hasMarkedRef.current = false
  setSelectedVerse(null)
  setShowColorPicker(false)
  setShowShareMenu(false)
  setEditingNoteVerse(null)
  setShowDiscardPrompt(null)
  noteEditorDirtyRef.current = false
  bibleAudio.stop()  // Stop TTS when navigating chapters
}, [bookSlug, chapterNumber])
```

Wait — this creates a dependency issue since `bibleAudio.stop` would need to be in the dep array. The hook already handles reset on `[bookSlug, chapterNumber]` change internally (see Step 2 cleanup). So the effect in BibleReader doesn't need to call `stop()` — the hook's own cleanup handles it.

Actually, re-reading the hook design: the hook takes `bookSlug` and `chapterNumber` as options. When these change, the hook should reset internally. So BibleReader doesn't need to explicitly call `stop()` on chapter change — the hook handles it.

**Screen reader announcements for playback state changes:**
Add announcements to the existing `announceRef`:
- When playback starts: "Reading chapter aloud"
- When paused: "Reading paused"
- When stopped: "Reading stopped"
- These can be triggered in the hook via a callback, or by the component watching state changes.

Best approach: Add an `onAnnounce` callback to the hook options, and have BibleReader pass the `announce` function.

**Guardrails (DO NOT):**
- Do NOT modify the existing verse `<span>` element ID (it's used by URL hash navigation)
- Do NOT break existing highlight rendering (Spec 2 inline styles)
- Do NOT break existing completion tracking (IO sentinel)
- Do NOT break floating action bar or note editor
- Do NOT auto-start playback on chapter load
- Do NOT render audio bar on placeholder chapters
- Do NOT add new routes

**Responsive behavior:**
- Desktop (1440px): Audio bar and ambient chip within `max-w-2xl` container, single row
- Tablet (768px): Same, comfortably fits
- Mobile (375px): Audio bar wraps, ambient chip full width

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Audio bar appears on chapters with full text | integration | Render genesis/1, verify bar present |
| Audio bar hidden on placeholder chapters | integration | Render a hasFullText=false book, verify no bar |
| Audio bar hidden when speechSynthesis unavailable | integration | Mock isSupported=false, verify no bar |
| TTS verse highlight applies border-l and bg | integration | Set currentVerseIndex, verify classes |
| TTS highlight coexists with Spec 2 color highlight | integration | Apply both, verify no conflict |
| TTS highlight has aria-current="true" | integration | Verify attribute on active verse |
| Ambient chip renders below audio bar | integration | Verify chip presence |
| Chapter navigation stops playback | integration | Simulate chapter change, verify stop |
| Existing verse interactions still work | integration | Click verse, verify floating action bar |
| Existing scroll completion still works | integration | Verify IO sentinel still present |

**Expected state after completion:**
- [x] Audio control bar visible on chapters with full text
- [x] Ambient chip visible below audio bar
- [x] TTS verse highlighting works during playback
- [x] Chapter completion via audio works for authenticated users
- [x] Meditation minutes recorded for full chapter listens
- [x] No regressions to existing Bible reader features (highlights, notes, scroll completion, navigation)

---

### Step 6: Tests — Hook and Components

**Objective:** Write comprehensive tests for `useBibleAudio` hook, `AudioControlBar` component, and `BibleAmbientChip` component.

**Files to create/modify:**
- `frontend/src/hooks/__tests__/useBibleAudio.test.ts` — Hook tests
- `frontend/src/components/bible/__tests__/AudioControlBar.test.tsx` — Component tests
- `frontend/src/components/bible/__tests__/BibleAmbientChip.test.tsx` — Component tests

**Details:**

**`useBibleAudio.test.ts`:**

Mock setup:
```typescript
const mockSpeechSynthesis = {
  speak: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    { name: 'Google US English Male', lang: 'en-US' },
    { name: 'Google US English Female', lang: 'en-US' },
  ]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock window.speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
})

// Mock SpeechSynthesisUtterance
vi.stubGlobal('SpeechSynthesisUtterance', class MockUtterance {
  text = ''
  rate = 1
  voice = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) { this.text = text }
})
```

Mock providers: `vi.mock('@/hooks/useAuth')`, `vi.mock('@/components/audio/AudioProvider')`, `vi.mock('@/services/meditation-storage')`, `vi.mock('@/utils/date')`.

Test cases per the table in Step 2.

**`AudioControlBar.test.tsx`:**

Pure component tests — render with various props, verify output. No mocking needed beyond standard React Testing Library setup.

Test cases per the table in Step 3.

**`BibleAmbientChip.test.tsx`:**

Mock: `vi.mock('@/components/audio/AudioProvider')`, `vi.mock('@/hooks/useScenePlayer')`, `vi.mock('@/constants/ambient-suggestions')`.

Wrap with `MemoryRouter` for the `/music?tab=ambient` link.

Test cases per the table in Step 4.

**Guardrails (DO NOT):**
- Do NOT test implementation details (internal state) — test behavior
- Do NOT skip auth-gating tests
- Do NOT use `fireEvent` when `userEvent` is more appropriate for user interactions
- Do NOT forget to clear localStorage in `beforeEach`

**Test specifications:**
(See individual step tables — all tests from Steps 1-5 are implemented here)

**Expected state after completion:**
- [x] All tests pass
- [x] Auth-gated behavior tested for both states
- [x] Speech Synthesis API properly mocked
- [x] Edge cases covered (no voices, unsupported browser, sleep timer fading)

---

### Step 7: Integration Tests — BibleReader with Audio

**Objective:** Write integration tests verifying the full BibleReader with audio playback, ensuring no regressions to existing features.

**Files to create/modify:**
- `frontend/src/pages/__tests__/BibleReaderAudio.test.tsx` — Integration tests

**Details:**

**Mock setup pattern** (follow `BibleReader.test.tsx` pattern):
```typescript
vi.mock('@/hooks/useAuth', ...)
vi.mock('@/hooks/useBibleHighlights', ...)
vi.mock('@/hooks/useBibleNotes', ...)
vi.mock('@/hooks/useBibleProgress', ...)
vi.mock('@/data/bible', ...)
vi.mock('@/hooks/useBibleAudio', ...)
vi.mock('@/components/audio/AudioProvider', ...)
```

**Render helper:**
```typescript
function renderReader(route: string, options?: { isAuthenticated?: boolean; isSupported?: boolean }) {
  if (options?.isAuthenticated) mockAuth.isAuthenticated = true
  if (options?.isSupported !== undefined) mockBibleAudio.isSupported = options.isSupported
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/bible/:book/:chapter" element={<BibleReader />} />
      </Routes>
    </MemoryRouter>,
  )
}
```

**Test cases:**

| Test | Type | Description |
|------|------|-------------|
| Audio bar renders on full-text chapters | integration | Render genesis/1, verify AudioControlBar present |
| Audio bar hidden on placeholder chapters | integration | Render book with hasFullText=false, no bar |
| Audio bar hidden when TTS unsupported | integration | Set isSupported=false, no bar |
| Ambient chip renders below bar | integration | Verify BibleAmbientChip present |
| Verse TTS highlight applies on active verse | integration | Set currentVerseIndex=2, verify border-l-2 class on 3rd verse |
| TTS highlight has aria-current | integration | Verify aria-current="true" on active verse |
| Existing Spec 2 highlights still render | integration | Apply color highlight + TTS, verify both |
| Existing notes still render | integration | Verify NoteIndicator still works |
| Existing floating action bar still works | integration | Click verse, verify action bar |
| IO sentinel still present for scroll completion | integration | Verify sentinel div exists |
| Chapter navigation link still present | integration | Verify ChapterNav renders |
| Cross-feature CTAs still present | integration | Verify Pray/Journal links |

**Guardrails (DO NOT):**
- Do NOT duplicate tests already in `BibleReader.test.tsx` — only test audio-specific behavior and non-regression
- Do NOT test internal hook logic — that's in `useBibleAudio.test.ts`

**Expected state after completion:**
- [x] Integration tests pass
- [x] No regressions to existing Bible reader features
- [x] Audio integration verified end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data model & constants changes |
| 2 | 1 | `useBibleAudio` hook (uses `MeditationType`) |
| 3 | — | `AudioControlBar` component (pure presentational) |
| 4 | 1 | `BibleAmbientChip` component (uses `AmbientContext`) |
| 5 | 2, 3, 4 | BibleReader integration (wires everything together) |
| 6 | 2, 3, 4 | Tests for hook and components |
| 7 | 5 | Integration tests for BibleReader |

**Parallelizable:** Steps 3 and 4 can be built independently. Step 6 tests for each component can be written alongside the component.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Model & Constants | [COMPLETE] | 2026-03-22 | Added `'bible-audio'` to `MeditationType`, `'bible-reading'` to `AmbientContext` + `AMBIENT_SCENE_IDS`. Also added `'bible-audio'` entries to `MeditationHistory.tsx` `Record<MeditationType>` maps to fix TS errors. |
| 2 | `useBibleAudio` Hook | [COMPLETE] | 2026-03-22 | Created `frontend/src/hooks/useBibleAudio.ts` with verse-by-verse TTS, speed/voice control, auto-scroll with manual scroll pause, sleep timer integration, ambient volume reduction via engine, chapter completion + meditation tracking. |
| 3 | `AudioControlBar` Component | [COMPLETE] | 2026-03-22 | Created `frontend/src/components/bible/AudioControlBar.tsx`. Frosted glass bar with play/pause, stop, speed pills (radiogroup), progress text (aria-live), voice gender toggle. Sticky with IntersectionObserver shadow detection. |
| 4 | `BibleAmbientChip` Component | [COMPLETE] | 2026-03-22 | Created `frontend/src/components/bible/BibleAmbientChip.tsx`. Frosted glass chip with inactive/active states, 3 bible-reading scene suggestions, waveform animation, collapse on Escape/click-outside/scene-start. Auth gating via useScenePlayer. |
| 5 | BibleReader Integration | [COMPLETE] | 2026-03-22 | Wired useBibleAudio, AudioControlBar, BibleAmbientChip into BibleReader.tsx. Added TTS verse highlight (outer div with border-l-2 border-primary bg-primary/5). Moved announce callback before hook call. Updated existing test mocks for AudioProvider/useBibleAudio/useScenePlayer. All 13 existing tests pass. |
| 6 | Tests — Hook & Components | [COMPLETE] | 2026-03-22 | Created 3 test files: `useBibleAudio.test.ts` (18 tests), `AudioControlBar.test.tsx` (18 tests), `BibleAmbientChip.test.tsx` (13 tests). Total 49 tests passing. Replaced click-outside test with toggle test due to jsdom offsetParent limitation. |
| 7 | Integration Tests | [COMPLETE] | 2026-03-22 | Created `BibleReaderAudio.test.tsx` with 11 integration tests: audio bar visibility (3), ambient chip (1), TTS highlighting (3), non-regression (4). All 348 tests across 35 files pass. Build succeeds. |
