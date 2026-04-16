# BB-44: Read-Along Verse Highlighting — Implementation Plan

**Spec:** `_specs/bb-44-read-along-verse-highlighting.md`
**Branch:** `audio-wave-bb-26-29-44` (current, no new branch)
**Date:** 2026-04-15
**Depends on:** BB-26 (shipped), BB-29 (shipped), BB-28 (shipped), BB-27 (shipped)

---

## Critical Recon Findings

### DBP Timestamps Endpoint — Live Verification

Endpoint: `GET /timestamps/{fileset_id}/{book}/{chapter}?v=4&key=...`

| Fileset       | Chapter     | Status | Entries | Notes |
|---------------|-------------|--------|---------|-------|
| EN1WEBN2DA    | JHN/3 (NT)  | 200 OK | 37      | 36 verses + intro marker (verse_start "0") |
| EN1WEBN2DA    | PHM/1 (NT)  | 200 OK | Full    | Short book, all verses present |
| EN1WEBN2DA    | REV/22 (NT) | 200 OK | Full    | Final chapter of Bible |
| EN1WEBN2DA    | MAT/5 (NT)  | 200 OK | 49      | 48 verses + intro marker |
| EN1WEBN2DA    | ROM/8 (NT)  | 200 OK | 40      | 39 verses + intro marker |
| EN1WEBO2DA    | GEN/1 (OT)  | 200 OK | 0       | `{"data": []}` — empty |
| EN1WEBO2DA    | PSA/119 (OT)| 200 OK | 0       | `{"data": []}` — empty |
| EN1WEBO2DA    | EXO/20 (OT) | 200 OK | 0       | `{"data": []}` — empty |
| EN1WEBO2DA    | ISA/53 (OT) | 200 OK | 0       | `{"data": []}` — empty |

**Conclusion: NT has full verse-level timestamps. OT returns empty for the dramatized WEB fileset.**

BB-44 ships read-along highlighting for all 260 NT chapters. OT chapters silently fall back to no highlighting — audio plays normally, toggle still appears, user sees no highlight because no timing data exists. This matches the spec's "partial availability" scenario (requirements 23-24).

### Response Shape (verified)

```json
{
  "data": [
    { "book": "JHN", "chapter": "3", "verse_start": "0", "verse_start_alt": "0", "timestamp": 0 },
    { "book": "JHN", "chapter": "3", "verse_start": "1", "verse_start_alt": "1", "timestamp": 3.64 },
    { "book": "JHN", "chapter": "3", "verse_start": "2", "verse_start_alt": "2", "timestamp": 10.48 }
  ]
}
```

Key observations:
- `verse_start` is a **string**, not a number — parse with `parseInt()`.
- `verse_start: "0"` is an intro/chapter-header marker at timestamp 0. Filter it out — the reader's first verse is verse 1.
- `timestamp` is seconds with decimal precision (e.g., `3.64`).
- `verse_start_alt` always matches `verse_start` — ignore it.
- Data arrives pre-sorted by timestamp ascending (critical for binary search).
- The endpoint returns 200 with `{"data": []}` for unavailable chapters, never 404.

### BibleReader Architecture (verified)

- **Verse DOM:** Each verse is a `<span>` with `data-verse="N"`, `data-book="slug"`, `data-chapter="N"`, `id="verse-N"`.
- **Scroll container:** Document body (window-level scroll), not a scoped container.
- **Existing scroll-to:** Uses `el.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- **No existing read-along scaffolding.** Building from scratch. No `aria-current`, `currentVerse`, or `readAlong` terms found in reader files.
- **Component hierarchy:** `BibleReader.tsx` (page) → `ReaderBody.tsx` (renders all `<span>` verses in a single `<div>`).
- **ReaderBody props already support:** `selectedVerses`, `chapterHighlights`, `freshHighlightVerses`, `arrivalHighlightVerses`, `reducedMotion` — adding a `readAlongVerse` prop follows the existing pattern.

### Audio Player Architecture (verified)

- `AudioPlayerContext.ts` — Pure reducer + initial state. TICK action fires every 200ms, updates `currentTime` (seconds).
- `AudioPlayerProvider.tsx` — Owns reducer dispatch, engine ref, tick interval. Exports `useAudioPlayer()` hook.
- `state.track: PlayerTrack | null` — has `filesetId`, `book` (slug), `chapter`.
- `state.playbackState` — `'idle' | 'loading' | 'playing' | 'paused' | 'error'`.
- `state.currentTime` — seconds, updated every 200ms.
- The provider already imports `resolveFcbhBookCode` for slug→DBP-code conversion.
- BB-29's `continuousPlayback` preference: persisted via `lib/audio/continuous-playback.ts`, init'd in lazy reducer, dispatched via `SET_CONTINUOUS_PLAYBACK`.

### Reusable Components (verified)

- **ToggleSwitch:** `components/settings/ToggleSwitch.tsx`. Props: `{ checked, onChange, label, description?, id }`. BB-29 uses it in AudioPlayerExpanded at lines 290-299.
- **useReducedMotion:** `hooks/useReducedMotion.ts`. Returns `boolean`. Global safety net in `animations.css` also handles this.
- **BB-29 continuous-playback persistence:** `lib/audio/continuous-playback.ts` — read/write helpers with fail-silent pattern. BB-44 mirrors this pattern exactly.
- **Attribution footer:** Rendered at line 303 of AudioPlayerExpanded, after BB-29 toggle.
- **Sheet height:** `h-[340px]` mobile / `sm:h-[300px]` desktop. Adding a toggle row (~44px min-height but ~36px actual) may require a height bump. Verify with Playwright.

### Rate limit impact

BB-26 uses ~1 DBP call per chapter (audio URL). BB-44 adds ~1 more (timestamps). With BB-26's confirmed 1500/window quota, 2 calls per chapter is well within budget for any realistic usage.

---

## Architecture

### State management approach

Read-along state lives in the `AudioPlayerContext` reducer alongside existing audio state. Rationale:

1. Highlighting depends on `currentTime`, which is already in the reducer.
2. The TICK action already runs every 200ms — adding a binary search (~6 comparisons for 50 verses) is O(log n) and trivially cheap.
3. Any component that subscribes to the audio context can see the active verse — not just BibleReader.

### New state fields on `AudioPlayerState`

```ts
readAlongEnabled: boolean           // toggle state, persisted to localStorage
readAlongTimestamps: VerseTimestamp[] | null  // per-chapter, fetched on track load, null = unavailable
readAlongVerse: number | null       // active verse number, derived in TICK
```

### New actions

```ts
| { type: 'SET_READ_ALONG'; enabled: boolean }
| { type: 'SET_READ_ALONG_TIMESTAMPS'; timestamps: VerseTimestamp[] | null }
```

### Data flow

```
User taps Play → provider fetches audio URL + timestamps in parallel
  → engine loads, LOAD_SUCCESS fires
  → timestamps arrive, SET_READ_ALONG_TIMESTAMPS fires
  → every 200ms TICK: binary search on timestamps → update readAlongVerse if changed
  → BibleReader reads state.readAlongVerse, passes to ReaderBody
  → ReaderBody applies highlight class + aria-current to the matching verse span
  → useReadAlongScroll hook auto-scrolls to the highlighted verse
```

### File changes overview

| File | Change |
|------|--------|
| `types/bible-audio.ts` | Add `VerseTimestamp`, read-along fields on `AudioPlayerState`, `setReadAlong` on `AudioPlayerActions` |
| `lib/audio/read-along.ts` | **NEW** — Read/write preference (`bb44-v1:readAlong`), mirrors `continuous-playback.ts` |
| `lib/audio/timestamps.ts` | **NEW** — `VerseTimestamp` processing, `findCurrentVerse()` binary search, in-memory cache |
| `lib/audio/dbp-client.ts` | Add `getChapterTimestamps()` function |
| `contexts/AudioPlayerContext.ts` | New actions + reducer cases + initial state fields |
| `contexts/AudioPlayerProvider.tsx` | Fetch timestamps in `play()`/`autoAdvance()`, init read-along pref, expose `setReadAlong` |
| `components/audio/AudioPlayerExpanded.tsx` | Add read-along toggle row between BB-29 toggle and attribution |
| `components/bible/reader/ReaderBody.tsx` | Add `readAlongVerse` prop, highlight styling, `aria-current` |
| `pages/BibleReader.tsx` | Wire `readAlongVerse` to ReaderBody, add `useReadAlongScroll` hook |
| `hooks/bible/useReadAlongScroll.ts` | **NEW** — Auto-scroll to current verse with manual-scroll override |
| `.claude/rules/11-local-storage-keys.md` | Document `bb44-v1:readAlong` key |

---

## Steps

### Step 1: Types + Read-Along Preference Module

**Files:** `types/bible-audio.ts`, `lib/audio/read-along.ts`

**1a. Add types to `types/bible-audio.ts`:**

Add `VerseTimestamp` type:
```ts
/** BB-44 — verse-level timing entry from DBP /timestamps endpoint. */
export interface VerseTimestamp {
  verse: number     // verse number (parsed from string)
  timestamp: number // start time in seconds
}
```

Add read-along fields to `AudioPlayerState`:
```ts
// BB-44 — read-along verse highlighting
readAlongEnabled: boolean
readAlongTimestamps: VerseTimestamp[] | null
readAlongVerse: number | null
```

Add action to `AudioPlayerActions`:
```ts
// BB-44 — read-along
setReadAlong: (enabled: boolean) => void
```

**1b. Create `lib/audio/read-along.ts`:**

Mirror `continuous-playback.ts` exactly:
```ts
export const READ_ALONG_KEY = 'bb44-v1:readAlong'

export function readReadAlong(): boolean {
  try {
    const raw = localStorage.getItem(READ_ALONG_KEY)
    if (raw === null) return true  // default ON per spec req 19
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'boolean') return true
    return parsed
  } catch {
    return true
  }
}

export function writeReadAlong(value: boolean): void {
  try {
    localStorage.setItem(READ_ALONG_KEY, JSON.stringify(value))
  } catch { /* fail silently */ }
}
```

**1c. Tests:**

- `lib/audio/__tests__/read-along.test.ts` — Same pattern as existing `continuous-playback.test.ts`:
  - Returns `true` when key absent
  - Returns `true` when key is corrupt/non-boolean
  - Returns stored value when valid
  - Writes value correctly
  - Fails silently on localStorage error

---

### Step 2: Timestamps Module + DBP Client Extension

**Files:** `lib/audio/timestamps.ts`, `lib/audio/dbp-client.ts`

**2a. Create `lib/audio/timestamps.ts`:**

```ts
import type { VerseTimestamp } from '@/types/bible-audio'

/**
 * In-memory cache for chapter timestamps. Keyed by `${filesetId}:${bookCode}:${chapter}`.
 * Not persisted — re-fetched on page refresh. Timestamps are small (~50 entries per chapter).
 */
const timestampCache = new Map<string, VerseTimestamp[]>()

export function getCachedTimestamps(filesetId: string, bookCode: string, chapter: number): VerseTimestamp[] | undefined {
  return timestampCache.get(`${filesetId}:${bookCode}:${chapter}`)
}

export function setCachedTimestamps(filesetId: string, bookCode: string, chapter: number, timestamps: VerseTimestamp[]): void {
  timestampCache.set(`${filesetId}:${bookCode}:${chapter}`, timestamps)
}

/**
 * Binary search for the active verse at a given playback time.
 * Returns the verse number whose timestamp is the largest value <= currentTime,
 * or null if currentTime is before the first verse.
 */
export function findCurrentVerse(timestamps: VerseTimestamp[], currentTimeSeconds: number): number | null {
  if (!timestamps.length) return null
  if (currentTimeSeconds < timestamps[0].timestamp) return null

  let low = 0
  let high = timestamps.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (timestamps[mid].timestamp <= currentTimeSeconds) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return timestamps[low].verse
}
```

**2b. Add `getChapterTimestamps()` to `dbp-client.ts`:**

Add after the existing `getChapterAudio()` function:

```ts
/** Raw DBP timestamp entry before parsing. */
interface DbpTimestampRaw {
  book: string
  chapter: string
  verse_start: string
  verse_start_alt: string
  timestamp: number
}

/**
 * BB-44 — Fetches verse-level timing data for a chapter.
 * Returns parsed VerseTimestamp[] (filtered: verse 0 removed, sorted by timestamp).
 * Returns empty array if no timing data exists (OT dramatized filesets return empty).
 */
export async function getChapterTimestamps(
  filesetId: string,
  bookCode: string,
  chapter: number,
): Promise<VerseTimestamp[]> {
  const raw = await dbpFetch<DbpEnvelope<unknown>>(
    `/timestamps/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`,
  )
  if (!isObject(raw) || !Array.isArray(raw.data)) return []

  const entries = raw.data as DbpTimestampRaw[]
  return entries
    .filter((e) => {
      const v = parseInt(e.verse_start, 10)
      return !isNaN(v) && v > 0 // Filter out verse 0 (chapter intro marker)
    })
    .map((e) => ({
      verse: parseInt(e.verse_start, 10),
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}
```

Add `VerseTimestamp` import from `@/types/bible-audio`.

**2c. Tests:**

- `lib/audio/__tests__/timestamps.test.ts`:
  - `findCurrentVerse`: empty array returns null
  - `findCurrentVerse`: time before first verse returns null
  - `findCurrentVerse`: exact match on first verse returns verse 1
  - `findCurrentVerse`: time between two verses returns the earlier verse
  - `findCurrentVerse`: time at exact boundary returns that verse
  - `findCurrentVerse`: time past last verse returns last verse
  - `findCurrentVerse`: single-entry array works correctly
  - `findCurrentVerse`: handles closely spaced timestamps (<500ms)
  - In-memory cache: set/get cycle works, different keys isolated

- `lib/audio/__tests__/dbp-client.test.ts` (add to existing test file):
  - `getChapterTimestamps`: parses valid response correctly
  - `getChapterTimestamps`: filters out verse_start "0"
  - `getChapterTimestamps`: returns empty array for empty data
  - `getChapterTimestamps`: returns empty array for malformed response
  - `getChapterTimestamps`: sorts by timestamp

---

### Step 3: Reducer + Provider — State Management

**Files:** `contexts/AudioPlayerContext.ts`, `contexts/AudioPlayerProvider.tsx`

**3a. Update `AudioPlayerContext.ts`:**

Add new action types:
```ts
| { type: 'SET_READ_ALONG'; enabled: boolean }
| { type: 'SET_READ_ALONG_TIMESTAMPS'; timestamps: VerseTimestamp[] | null }
```

Update `initialState`:
```ts
readAlongEnabled: true,       // will be overridden by lazy init in provider
readAlongTimestamps: null,
readAlongVerse: null,
```

Add reducer cases:

```ts
case 'SET_READ_ALONG':
  return {
    ...state,
    readAlongEnabled: action.enabled,
    // If disabling mid-playback, clear the active verse immediately (spec req 21)
    readAlongVerse: action.enabled ? state.readAlongVerse : null,
  }

case 'SET_READ_ALONG_TIMESTAMPS':
  return { ...state, readAlongTimestamps: action.timestamps, readAlongVerse: null }
```

Update the TICK case to compute `readAlongVerse`:
```ts
case 'TICK': {
  // ... existing sleep timer logic unchanged ...

  // BB-44 — read-along verse detection
  let readAlongVerse = state.readAlongVerse
  if (state.readAlongEnabled && state.readAlongTimestamps && state.readAlongTimestamps.length > 0) {
    const newVerse = findCurrentVerse(state.readAlongTimestamps, action.currentTime)
    if (newVerse !== readAlongVerse) {
      readAlongVerse = newVerse
    }
  } else if (readAlongVerse !== null) {
    readAlongVerse = null
  }

  return { ...state, currentTime: action.currentTime, sleepTimer, sleepFade, readAlongVerse }
}
```

Update LOAD_START, LOAD_NEXT_CHAPTER_START to clear timestamps and verse:
```ts
readAlongTimestamps: null,
readAlongVerse: null,
```

Update STOP, CLOSE to clear timestamps and verse:
```ts
readAlongTimestamps: null,
readAlongVerse: null,
```

Import `findCurrentVerse` from `@/lib/audio/timestamps`.

**3b. Update `AudioPlayerProvider.tsx`:**

Import new modules:
```ts
import { readReadAlong, writeReadAlong } from '@/lib/audio/read-along'
import { getChapterTimestamps } from '@/lib/audio/dbp-client'
import { getCachedTimestamps, setCachedTimestamps } from '@/lib/audio/timestamps'
import { resolveFcbhBookCode, resolveFcbhFilesetForBook } from '@/lib/audio/book-codes'
```

Update lazy reducer init to read the read-along preference:
```ts
(): AudioPlayerState => ({
  ...initialState,
  continuousPlayback: readContinuousPlayback(),
  readAlongEnabled: readReadAlong(),
})
```

Add a helper function to fetch timestamps (parallel with audio load):
```ts
function fetchTimestampsForTrack(
  track: PlayerTrack,
  requestId: number,
  lastPlayRequestIdRef: React.MutableRefObject<number>,
  dispatch: React.Dispatch<Action>,
): void {
  const bookCode = resolveFcbhBookCode(track.book)
  if (!bookCode) {
    dispatch({ type: 'SET_READ_ALONG_TIMESTAMPS', timestamps: null })
    return
  }

  // Check in-memory cache first
  const cached = getCachedTimestamps(track.filesetId, bookCode, track.chapter)
  if (cached !== undefined) {
    if (requestId !== lastPlayRequestIdRef.current) return
    dispatch({ type: 'SET_READ_ALONG_TIMESTAMPS', timestamps: cached.length > 0 ? cached : null })
    return
  }

  // Fetch from DBP (fire-and-forget — doesn't block audio playback)
  getChapterTimestamps(track.filesetId, bookCode, track.chapter)
    .then((timestamps) => {
      if (requestId !== lastPlayRequestIdRef.current) return
      setCachedTimestamps(track.filesetId, bookCode, track.chapter, timestamps)
      dispatch({ type: 'SET_READ_ALONG_TIMESTAMPS', timestamps: timestamps.length > 0 ? timestamps : null })
    })
    .catch(() => {
      if (requestId !== lastPlayRequestIdRef.current) return
      dispatch({ type: 'SET_READ_ALONG_TIMESTAMPS', timestamps: null })
    })
}
```

In `play()`, add timestamp fetch after the engine creation starts (parallel, non-blocking):
```ts
// BB-44 — fetch timestamps in parallel with audio load
fetchTimestampsForTrack(track, myId, lastPlayRequestIdRef, dispatch)
```

In `autoAdvance()`, same — fetch timestamps for the next track:
```ts
// BB-44 — fetch timestamps for the next chapter
fetchTimestampsForTrack(nextTrack, myId, lastPlayRequestIdRef, dispatch)
```

Add `setReadAlong` action callback:
```ts
const setReadAlong = useCallback((enabled: boolean) => {
  writeReadAlong(enabled)
  dispatch({ type: 'SET_READ_ALONG', enabled })
}, [])
```

Add `setReadAlong` to the `actions` useMemo and the dependency array.

**3c. Tests:**

- `contexts/__tests__/AudioPlayerContext.test.ts` (add to existing):
  - SET_READ_ALONG: toggles `readAlongEnabled`, clears `readAlongVerse` when disabled
  - SET_READ_ALONG_TIMESTAMPS: sets timestamps, clears verse
  - TICK with read-along enabled + timestamps: computes correct verse
  - TICK with read-along disabled: verse stays null
  - TICK with null timestamps: verse stays null
  - TICK with verse change: updates readAlongVerse
  - TICK without verse change: readAlongVerse preserved (same reference)
  - LOAD_START clears timestamps and verse
  - STOP clears timestamps and verse
  - CLOSE clears timestamps and verse

---

### Step 4: Read-Along Toggle in AudioPlayerExpanded

**File:** `components/audio/AudioPlayerExpanded.tsx`

Add the read-along toggle between BB-29's toggle (line 299) and `</>`(line 300), before the closing fragment:

```tsx
{/* BB-44 — Read-along verse highlighting toggle */}
<div className="mt-1 px-0">
  <ToggleSwitch
    id="bb44-read-along"
    checked={state.readAlongEnabled}
    onChange={actions.setReadAlong}
    label="Read along"
    description="Highlight verses as you listen"
  />
</div>
```

The `mt-1` (vs BB-29's `mt-2`) keeps the two toggles visually grouped as a pair with a slightly tighter gap than the pair-to-footer spacing. Verify with Playwright that the sheet height accommodates both toggles + attribution footer without overflow. If it doesn't fit:

```tsx
// Bump sheet height:
<div className="flex h-[376px] flex-col px-6 py-4 sm:h-[336px] sm:px-8 sm:py-5">
```

**Tests:**

- `components/audio/__tests__/AudioPlayerExpanded.test.tsx` (add to existing):
  - Read-along toggle renders with correct label and description
  - Toggle reflects `state.readAlongEnabled` value
  - Clicking toggle calls `actions.setReadAlong` with inverted value
  - Toggle has accessible `role="switch"` and `aria-checked`
  - Toggle is NOT rendered when in error state or end-of-Bible state
  - Toggle is positioned after BB-29 toggle (verify DOM order)

---

### Step 5: ReaderBody — Highlight Styling

**File:** `components/bible/reader/ReaderBody.tsx`

**5a. Add new prop:**

```ts
interface ReaderBodyProps {
  // ... existing props ...
  /** BB-44 — verse number currently being narrated by audio (null = no read-along active) */
  readAlongVerse?: number | null
}
```

**5b. Apply highlight styling inside the verse rendering loop:**

After the existing `isArrivalHighlight` check, add:
```ts
const isReadAlong = readAlongVerse === verse.number
```

Add to the `className`:
```ts
isReadAlong && 'transition-colors duration-fast',
```

Add to the `style` (layer the read-along treatment):
```ts
// Build style object with read-along layering
const verseStyle = isArrivalHighlight
  ? { /* existing arrival highlight style */ }
  : isHighlighted
    ? { /* existing user highlight style */ }
    : undefined

// Layer read-along on top of any existing style
const readAlongStyle: React.CSSProperties | undefined = isReadAlong
  ? {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      boxShadow: 'inset 3px 0 0 0 rgba(109, 40, 217, 0.6)',
    }
  : undefined

// Merge styles: read-along bg/shadow layers on top
const finalStyle = readAlongStyle && verseStyle
  ? { ...verseStyle, ...readAlongStyle }
  : readAlongStyle || verseStyle
```

Add `aria-current`:
```ts
aria-current={isReadAlong ? 'true' : undefined}
```

Note: the `transition-colors duration-fast` class provides the 200ms background tint transition (from `ANIMATION_DURATIONS.fast = 200ms`, mapped to `duration-fast` in Tailwind config). The left accent bar (via `boxShadow`) appears/disappears instantly because `box-shadow` is NOT included in the `transition-colors` property — which is exactly what the spec requires (spec req 5: "instant snap, no fade between highlights" for the bar; 200ms transition for the background tint per Design Notes).

If the verse has BOTH a user highlight AND is the read-along verse, the merged style results in:
- User highlight background color (from CSS variable) + a very subtle white tint overlay (0.04 opacity) from read-along
- The left accent bar from read-along box-shadow

This layering is correct: the user's personal highlight is preserved, and the read-along provides the left bar + a barely perceptible brightness bump.

**5c. Tests:**

- `components/bible/reader/__tests__/ReaderBody.test.tsx` (add to existing):
  - When `readAlongVerse` is null, no verse has `aria-current`
  - When `readAlongVerse` is 5, verse 5 has `aria-current="true"` and other verses do not
  - Verse with `readAlongVerse` has the read-along background tint style
  - Verse with `readAlongVerse` has the left accent bar box-shadow
  - Read-along highlight coexists with user highlight (both styles present)
  - Read-along highlight coexists with selection styling
  - Changing `readAlongVerse` prop from 5 to 6 moves `aria-current` to verse 6

---

### Step 6: BibleReader — Auto-Scroll + Wiring

**Files:** `hooks/bible/useReadAlongScroll.ts` (NEW), `pages/BibleReader.tsx`

**6a. Create `hooks/bible/useReadAlongScroll.ts`:**

```ts
import { useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const USER_SCROLL_PAUSE_MS = 5000
const AUTO_SCROLL_SETTLE_MS = 600

interface UseReadAlongScrollOptions {
  readAlongVerse: number | null
  enabled: boolean
}

export function useReadAlongScroll({ readAlongVerse, enabled }: UseReadAlongScrollOptions) {
  const reducedMotion = useReducedMotion()
  const isAutoScrollingRef = useRef(false)
  const userIsScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevVerseRef = useRef<number | null>(null)

  // Manual scroll detection
  useEffect(() => {
    if (!enabled) return

    const onScroll = () => {
      if (isAutoScrollingRef.current) return // Ignore programmatic scrolls
      userIsScrollingRef.current = true
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        userIsScrollingRef.current = false
        // After user stops scrolling, scroll back to current verse
        if (prevVerseRef.current !== null) {
          scrollToVerse(prevVerseRef.current)
        }
      }, USER_SCROLL_PAUSE_MS)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToVerse = useCallback((verseNumber: number) => {
    const el = document.getElementById(`verse-${verseNumber}`)
    if (!el) return

    const rect = el.getBoundingClientRect()
    const targetY = window.innerHeight / 3
    const scrollDelta = rect.top - targetY

    // Skip if already in viewport within tolerance
    if (Math.abs(scrollDelta) < 50) return

    isAutoScrollingRef.current = true
    window.scrollBy({
      top: scrollDelta,
      behavior: reducedMotion ? 'instant' : 'smooth',
    })
    setTimeout(() => {
      isAutoScrollingRef.current = false
    }, AUTO_SCROLL_SETTLE_MS)
  }, [reducedMotion])

  // Auto-scroll when verse changes
  useEffect(() => {
    if (!enabled || readAlongVerse === null) {
      prevVerseRef.current = null
      return
    }

    prevVerseRef.current = readAlongVerse

    // Don't auto-scroll if user is actively scrolling
    if (userIsScrollingRef.current) return

    scrollToVerse(readAlongVerse)
  }, [readAlongVerse, enabled, scrollToVerse])

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])
}
```

**6b. Update `pages/BibleReader.tsx`:**

Import and wire:
```ts
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { useReadAlongScroll } from '@/hooks/bible/useReadAlongScroll'
```

Inside the component, after existing hook calls:
```ts
const { state: audioState } = useAudioPlayer()

// BB-44 — read-along verse highlighting
// Only active when the current audio track matches this chapter
const isAudioForThisChapter =
  audioState.track?.book === bookSlug &&
  audioState.track?.chapter === chapterNumber &&
  audioState.playbackState !== 'idle'

const readAlongVerse = isAudioForThisChapter ? audioState.readAlongVerse : null

useReadAlongScroll({
  readAlongVerse,
  enabled: isAudioForThisChapter && audioState.readAlongEnabled,
})
```

Pass to ReaderBody:
```tsx
<ReaderBody
  // ... existing props ...
  readAlongVerse={readAlongVerse}
/>
```

**6c. Handle edge cases:**

- **Chapter navigation during playback (BB-29 auto-advance):** When auto-advance fires, the provider dispatches `LOAD_NEXT_CHAPTER_START` which clears `readAlongTimestamps` and `readAlongVerse`. React Router navigates to the new chapter, BibleReader remounts. The new chapter's timestamps are fetched by the provider. `readAlongVerse` stays null until the new timestamps arrive and the first TICK computes the verse. Brief gap with no highlighting = correct per spec req 8.

- **User navigates away from the audio chapter:** If the user manually navigates to a different chapter while audio plays, `isAudioForThisChapter` becomes false, and no highlighting or scrolling happens on the new chapter. Audio continues playing in the background (existing behavior). The user can expand the sheet and see the track info. Correct.

- **Audio stops while on the chapter:** `readAlongVerse` becomes null (reducer clears it on STOP/CLOSE). ReaderBody removes the highlight. Correct per spec req 7.

- **Seek via scrubber:** `SEEK` action updates `currentTime`. Next TICK recomputes `readAlongVerse` via binary search. Highlight jumps to the correct verse. Correct per spec req 29-30.

**6d. Tests:**

- `hooks/bible/__tests__/useReadAlongScroll.test.ts`:
  - When disabled, no scroll events are listened to
  - When verse changes and element exists, auto-scroll fires with correct positioning
  - Auto-scroll uses `behavior: 'instant'` when reduced motion is true
  - Manual scroll sets user-is-scrolling flag
  - Auto-scroll does not fire while user-is-scrolling is true
  - After 5 seconds of no user scroll, auto-scroll resumes
  - Programmatic scrolls (auto-scroll) do not trigger manual-scroll detection
  - When readAlongVerse becomes null, no auto-scroll fires
  - Cleanup removes scroll listener and clears timeouts

- `pages/__tests__/BibleReader.test.tsx` (add to existing):
  - When audio plays for current chapter, readAlongVerse is passed to ReaderBody
  - When audio plays for different chapter, readAlongVerse is null
  - When audio is idle, readAlongVerse is null

---

### Step 7: Documentation

**File:** `.claude/rules/11-local-storage-keys.md`

Add to the "Bible Audio" section (after BB-29 table):

```markdown
### Read-Along Preference (BB-44)

Preference for verse highlighting during Bible audio playback. Managed by `frontend/src/lib/audio/read-along.ts`. Uses the `bb44-v1:` prefix, following the BB-26/BB-29/BB-32 `bb*-v1:` convention.

| Key                  | Type      | Feature                                                                                 |
| -------------------- | --------- | --------------------------------------------------------------------------------------- |
| `bb44-v1:readAlong`  | `boolean` | Read-along verse highlighting preference (BB-44). Defaults to `true` when absent. No TTL. |

- **Default:** `true` — read-along is on by default (spec req 19).
- **Read:** Loaded once on `AudioPlayerProvider` mount via lazy reducer init.
- **Write:** Updated synchronously by the `setReadAlong` action, which mirrors the new value into the reducer state and writes to localStorage.
- **Corruption:** Non-JSON or non-boolean values fall back to `true`. All localStorage operations are wrapped in try/catch.
- **Version:** `bb44-v1` prefix allows future invalidation by bumping to `bb44-v2`.
```

---

### Step 8: Build Verification + Final Checks

**8a. Build check:**
```bash
cd frontend && pnpm build
```
Verify no TypeScript errors. Check bundle delta — target <=2 KB gzipped for main chunk.

**8b. Test suite:**
```bash
cd frontend && pnpm test
```
Verify all existing tests pass (BB-26, BB-27, BB-28, BB-29 tests unchanged).

**8c. Lint:**
```bash
cd frontend && pnpm lint
```

**8d. Manual verification checklist:**

- [ ] Open `/bible/john/3`, start audio, observe verse 1 highlight after ~3.6s
- [ ] Observe highlight advancing verse-by-verse as audio progresses
- [ ] Pause: highlight stays on current verse
- [ ] Resume: highlight continues advancing
- [ ] Seek forward via scrubber: highlight jumps to correct verse
- [ ] Seek backward via scrubber: highlight jumps back
- [ ] Toggle read-along OFF in expanded sheet: highlight disappears instantly
- [ ] Toggle read-along ON: highlight appears on current verse
- [ ] Manually scroll away: auto-scroll pauses; after 5s, auto-scroll resumes
- [ ] Open `/bible/genesis/1`, start audio: no highlighting (OT, no timestamps)
- [ ] BB-29 auto-advance: highlight clears briefly on chapter transition, resumes on new chapter
- [ ] Sleep timer completes: highlight cleared when audio stops
- [ ] Close player: highlight cleared
- [ ] Page refresh: read-along preference remembered
- [ ] `aria-current="true"` present on the highlighted verse (dev tools check)

---

## Execution Order

1. **Step 1** — Types + preference module (foundation, no visible changes) [COMPLETE 2026-04-15]
2. **Step 2** — Timestamps module + DBP client (can run tests immediately) [COMPLETE 2026-04-15]
3. **Step 3** — Reducer + provider (wires everything together, still no visible UI) [COMPLETE 2026-04-15]
4. **Step 4** — Toggle in expanded sheet (first visible UI change) [COMPLETE 2026-04-15]
5. **Step 5** — ReaderBody highlight styling (highlighting visible for the first time) [COMPLETE 2026-04-15]
6. **Step 6** — Auto-scroll hook + BibleReader wiring (full feature complete) [COMPLETE 2026-04-15]
7. **Step 7** — Documentation [COMPLETE 2026-04-15]
8. **Step 8** — Build verification + manual testing [COMPLETE 2026-04-15]

Steps 1-2 can be done in parallel. Steps 3-6 are sequential (each depends on the prior step). Steps 7-8 follow completion.

## Execution Log

| Step | Title | Status | Completion | Notes |
|------|-------|--------|------------|-------|
| 1 | Types + Read-Along Preference Module | [COMPLETE] | 2026-04-15 | Added `VerseTimestamp` type, read-along fields on state/actions, created `read-along.ts` (9 tests) |
| 2 | Timestamps Module + DBP Client | [COMPLETE] | 2026-04-15 | Created `timestamps.ts` with binary search + cache, added `getChapterTimestamps()` to dbp-client (12+5 tests) |
| 3 | Reducer + Provider State Management | [COMPLETE] | 2026-04-15 | Added 2 actions, 5 reducer cases, TICK verse computation, timestamp fetch in play()/autoAdvance(), lazy init (14 tests) |
| 4 | Read-Along Toggle in AudioPlayerExpanded | [COMPLETE] | 2026-04-15 | Added ToggleSwitch after BB-29 toggle with `mt-1` gap (7 tests) |
| 5 | ReaderBody Highlight Styling | [COMPLETE] | 2026-04-15 | Added `readAlongVerse` prop, bg tint + left accent bar via box-shadow, `aria-current`, transition-colors (7 tests) |
| 6 | BibleReader Auto-Scroll + Wiring | [COMPLETE] | 2026-04-15 | Created `useReadAlongScroll` hook, wired `readAlongVerse` to ReaderBody via `isAudioForThisChapter` guard (6 tests) |
| 7 | Documentation | [COMPLETE] | 2026-04-15 | Added `bb44-v1:readAlong` to `11-local-storage-keys.md` |
| 8 | Build Verification | [COMPLETE] | 2026-04-15 | Build passes, 663 test files / 8233 tests pass, lint clean. Fixed 2 existing test mocks (`AudioPlayButton`, `BibleReader.audio`) that needed `getChapterTimestamps` added to their dbp-client mock. |

---

## Bundle Impact Assessment

| New code | Location | Impact |
|----------|----------|--------|
| `read-along.ts` | Main chunk | ~200 bytes (read/write helpers) |
| `timestamps.ts` | Main chunk | ~400 bytes (binary search + in-memory cache) |
| `getChapterTimestamps()` in dbp-client | Main chunk | ~300 bytes (fetch + parse) |
| Reducer additions | Main chunk | ~400 bytes (2 new cases + TICK extension) |
| Provider timestamp fetch | Main chunk | ~300 bytes (fetchTimestampsForTrack helper) |
| Toggle in AudioPlayerExpanded | Lazy sheet chunk | ~100 bytes (one ToggleSwitch call) |
| ReaderBody highlight styling | BibleReader chunk | ~200 bytes (conditional styling) |
| useReadAlongScroll hook | BibleReader chunk | ~500 bytes (scroll management) |
| **Total main chunk delta** | | **~1.6 KB** (well under 2 KB gzipped target) |

The toggle and scroll management live in lazy-loaded chunks (sheet and BibleReader), so the actual main bundle impact is ~1.6 KB pre-gzip.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| OT timestamps never added by FCBH | Medium | Silent fallback is already designed. Feature works for 260 NT chapters. If FCBH adds OT timestamps later, BB-44 picks them up automatically (same endpoint, same parser). |
| Sheet height overflow with two toggles | Low | Check in Playwright. If needed, bump to 376px/336px. |
| Auto-scroll jank on Psalm 119 (176 verses) | Low | Binary search is O(log n). React re-render only changes one verse's className/style per tick. If needed, fall back to direct DOM manipulation (`classList.toggle`). |
| Timing data mismatch with dramatized audio | Low | Spec explicitly addresses dramatic beats — highlight stays on current verse from its start time until the next verse marker. Binary search handles this naturally. |
| Timestamps endpoint rate-limited | Very Low | 2 calls per chapter (audio + timestamps) vs 1500/window quota. No concern. |
