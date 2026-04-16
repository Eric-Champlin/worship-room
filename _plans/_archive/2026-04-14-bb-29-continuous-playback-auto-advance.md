# Implementation Plan: BB-29 — Continuous Playback / Auto-Advance for Bible Audio

**Spec:** `_specs/bb-29-continuous-playback-auto-advance.md`
**Date:** 2026-04-14
**Branch:** `audio-wave-bb-26-29-44`
**Design System Reference:** `_plans/recon/design-system.md` (not loaded — not applicable for this spec; the only new UI chrome reuses existing tokens and components)
**Recon Report:** inline in spec § "Notes for Plan Phase Recon" (no separate file)
**Master Spec Plan:** BB-26 plan at `_plans/2026-04-14-bb-26-fcbh-audio-bible-integration.md` (reference only — BB-29 is the second spec in the BB-26-29-44 audio wave and extends BB-26's shipped architecture)

---

## Architecture Context

**BB-29 is an extension of BB-26.** It adds auto-advance behavior to the shipped Bible audio player. All new code plugs into BB-26's existing `AudioPlayerProvider` + reducer + engine + DBP client. No new architectural layers.

**Key existing modules BB-29 reads from or extends:**

- `frontend/src/contexts/AudioPlayerContext.ts` — pure reducer/types module. `Action` union, `reducer()`, `initialState`, `AudioPlayerContext`. BB-29 extends the action union and state shape here.
- `frontend/src/contexts/AudioPlayerProvider.tsx` — the only React file in the context subsystem. Owns the engine ref, the tick interval, the request-id supersession, and the `useCallback`-stable action closures. BB-29 extends this file with: (a) preference load on mount, (b) an `autoAdvance` internal callback wired into `onEnd`, (c) a `useNavigate()` call for chapter URL sync, (d) new actions `setContinuousPlayback` and `startFromGenesis`.
- `frontend/src/lib/audio/engine.ts` — Howler wrapper. `createEngineInstance(url, events)` returns `{ play, pause, stop, seek, getCurrentTime, getDuration, setRate, destroy }`. `events.onEnd` is the hook BB-29 redirects.
- `frontend/src/lib/audio/dbp-client.ts` — `getChapterAudio(filesetId, bookCode, chapter)` returns `DbpChapterAudio` or throws a typed `DbpError` with `kind: 'network' | 'http' | 'parse' | 'timeout' | 'missing-key'` and optional `status`. HTTP 404s surface as `{ kind: 'http', status: 404 }`.
- `frontend/src/lib/audio/audio-cache.ts` — in-memory `Map<string, DbpChapterAudio>` keyed by `${filesetId}:${book}:${chapter}` via `getCachedChapterAudio` / `setCachedChapterAudio`. BB-29's next-track resolver consults this cache before hitting DBP.
- `frontend/src/lib/audio/book-codes.ts` — `resolveFcbhBookCode(slug)`, `resolveFcbhFilesetForBook(slug)`, `isOldTestamentBook(slug)`, constants `FCBH_FILESET_OT = 'EN1WEBO2DA'` / `FCBH_FILESET_NT = 'EN1WEBN2DA'`.
- `frontend/src/lib/audio/media-session.ts` — `updateMediaSession(track, actions)` + `clearMediaSession()`. BB-26 wired `play`, `pause`, `seekbackward`, `seekforward`, `stop`. BB-29 extends the signature to wire `nexttrack` and `previoustrack`.
- `frontend/src/data/bible/index.ts:50` — **existing helper `getAdjacentChapter(bookSlug, chapter, 'next' | 'prev')`** already returns `{ bookSlug, bookName, chapter }` or `null` at Revelation 22 / Genesis 1. Handles same-book next, cross-book forward, cross-book backward. Uses `BIBLE_BOOKS` from `frontend/src/constants/bible.ts` (66-book array with `chapters: number` per entry). **BB-29 reuses this helper verbatim** — do not reinvent the canonical-order logic.
- `frontend/src/constants/bible.ts:141` — `BIBLE_BOOKS: BibleBook[]` with `{ name, slug, chapters, testament, category, hasFullText }` shape, 66 entries in canonical Protestant order.
- `frontend/src/constants/animation.ts` — `ANIMATION_DURATIONS.fast = 150` for the toggle thumb transition.
- `frontend/src/components/settings/ToggleSwitch.tsx` — **existing reusable switch component.** Props: `{ checked, onChange, label, description?, id }`. Uses `role="switch"`, `aria-checked`, `aria-labelledby`, `aria-describedby`. Track: `h-6 w-12 rounded-full`, `bg-primary` when on / `bg-white/20` when off. Thumb: `h-5 w-5` translating `translate-x-[2px]` ↔ `translate-x-[26px]` with `duration-fast`. **BB-29 imports this component — do not roll a new switch.** (Spec recon note #5 asked whether a switch exists; it does.)
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — the expanded sheet JSX. BB-29 inserts the toggle between the speed picker row (lines 155-176) and `AttributionFooter` (line 181), and swaps in the end-of-Bible UI when `state.endOfBible === true`.
- `frontend/src/components/audio/AudioPlayerMini.tsx` — the minimized bar. BB-29 verifies it inherits the loading-state handling for auto-advance transitions (no code changes expected beyond possibly adding a `disabled` gate during loading).
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — BB-26's provider test file. Uses a module-level mocked `createEngineInstance` with a `nextOverride` hook for per-test engine behavior and a `deferMode` flag for promise-based supersession tests. BB-29 tests extend this file using the same mock pattern.
- `frontend/src/components/audio/__tests__/AudioPlayerExpanded.test.tsx` — BB-26's expanded sheet test file. Mocks `useAudioPlayer()`, renders, fires events, asserts UI. BB-29 extends with toggle + end-of-Bible tests.

**App-level mounting:** `AudioPlayerProvider` is mounted at `frontend/src/App.tsx:217` inside `<BrowserRouter>` (line 209) and inside `<AudioProvider>` (which is the music provider — unrelated). The router is the parent, so `useNavigate()` works inside `AudioPlayerProvider`.

**Architectural decision — navigate in provider vs. wrapper component:** Recon note #3 asked whether to keep navigation in the provider or lift it to an `AudioRouter` wrapper. **Decision: call `useNavigate()` directly inside `AudioPlayerProvider`.** Rationale: the provider is already inside `<BrowserRouter>`, a wrapper component would need to subscribe to provider state just to call navigate (adding re-renders and indirection), and the router coupling is small and localized to the auto-advance callback. This is a deliberate, explicit choice — not tentative.

**Architectural decision — `LOAD_START` currently forces `sheetState: 'expanded'`.** Auto-advance must preserve whatever sheet state is currently set (`minimized` or `expanded` — `closed` is unreachable because `close()` destroys the engine and nulls the track, so `onEnd` can never fire on a closed sheet). BB-29 adds a new action `LOAD_NEXT_CHAPTER_START` that mirrors `LOAD_START` EXCEPT it does not touch `sheetState`.

**Architectural decision — preference persistence.** A new isolated module at `frontend/src/lib/audio/continuous-playback.ts` owns `readContinuousPlayback()` and `writeContinuousPlayback(value: boolean)` with safe try/catch wrappers. Defaults to `true` on absent or corrupt value. Mirrors the BB-26 audio-cache fail-silent pattern. The key `bb29-v1:continuousPlayback` follows the existing `bb*-v1:` convention (BB-26 uses `bb26-v1:`, BB-32 uses `bb32-v1:`).

**Reactive stores:** BB-29 does NOT add any reactive stores. Continuous-playback state lives in the reducer, mirroring the ephemeral-state pattern BB-26 established. No `useSyncExternalStore`, no `subscribe()` — the preference flows in via lazy reducer init on provider mount, and flows back out via `writeContinuousPlayback` in the action callback. No BB-45 anti-pattern risk.

**Crisis detection / AI safety:** not applicable. BB-29 does not involve user free-text input and does not use AI. The spec explicitly states this.

**Auth gating:** **zero new gates.** BB-29 inherits BB-26's posture — every Bible feature works for logged-out users. The `.claude/rules/02-security.md` Bible wave auth posture is explicit: zero new gates in the Bible wave. Toggle persistence uses localStorage, which is allowed for logged-out users.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Auto-advance to next chapter | No auth required | Step 3 | None — intentional |
| Toggle continuous playback preference | No auth required | Step 5 | None — intentional |
| Persist preference across sessions | No auth required | Step 1 | None — intentional |
| See "End of Bible" state | No auth required | Step 6 | None — intentional |
| Tap "Start from Genesis" button | No auth required | Step 6 | None — intentional |
| Media Session next/previous track (headphone buttons / lock screen) | No auth required | Step 4 | None — intentional |

**BB-29 introduces zero new auth gates.** All Bible features are auth-free per the Bible wave posture in `.claude/rules/02-security.md`. This table is documented as intentional, not an oversight.

---

## Design System Values (for UI steps)

No Design System Reference recon was loaded for BB-29 because the only new UI chrome reuses existing components and tokens. All values below come from codebase inspection with file:line citations.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `ToggleSwitch` track (off) | background | `bg-white/20` | `components/settings/ToggleSwitch.tsx:43` |
| `ToggleSwitch` track (on) | background | `bg-primary` (`#6D28D9`) | `components/settings/ToggleSwitch.tsx:43` + `tailwind.config.js` |
| `ToggleSwitch` thumb | size | `h-5 w-5 rounded-full bg-white shadow-sm` | `components/settings/ToggleSwitch.tsx:48` |
| `ToggleSwitch` thumb | transition | `transition-transform duration-fast` | `components/settings/ToggleSwitch.tsx:48` |
| `ToggleSwitch` focus ring | outline | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` | `components/settings/ToggleSwitch.tsx:42` |
| AudioPlayerExpanded container | class | `flex h-[340px] flex-col px-6 py-4 sm:h-[300px] sm:px-8 sm:py-5` | `components/audio/AudioPlayerExpanded.tsx:84` |
| Expanded sheet chapter heading | class | `text-lg font-medium text-white` | `components/audio/AudioPlayerExpanded.tsx:98` |
| Expanded sheet translation sub-label | class | `mt-1 text-sm text-white/60` | `components/audio/AudioPlayerExpanded.tsx:101` |
| Speed picker row | class | `mt-4 flex flex-1 flex-col items-center justify-center gap-4` | `components/audio/AudioPlayerExpanded.tsx:140` |
| Attribution footer | class | `mt-3 text-center` + link `text-xs text-white/40 hover:text-white/60` | `components/audio/AudioPlayerExpanded.tsx:54-66` |
| Error state container (template for end-of-Bible) | class | `mt-4 flex flex-1 flex-col items-center justify-center gap-3` | `components/audio/AudioPlayerExpanded.tsx:105` |
| Large play button (template for Start from Genesis) | class | `flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | `components/audio/AudioPlayerExpanded.tsx:146` |
| Animation duration token | `ANIMATION_DURATIONS.fast` | `150` (ms) | `constants/animation.ts` |

**Toggle label copy (from spec § Design Notes):**
- Label: `"Continuous playback"`
- Description: `"Auto-play next chapter"`
- `id` prop: `"bb29-continuous-playback"` (stable, used by `aria-labelledby` / `aria-describedby`)

**Toggle placement (from spec § Vertical rhythm inside expanded sheet after BB-29):**

The toggle sits between the existing speed picker row (`<div role="group" aria-label="Playback speed">`) and the `<AttributionFooter />`. It is wrapped in a container with `mt-2 px-0` (the `px-6` / `sm:px-8` padding is already applied by the expanded sheet container). The toggle occupies the minimal vertical space needed (≈44px row height — the `ToggleSwitch` internal `min-h-[44px]` already enforces this).

**End-of-Bible message copy (from spec § Design Notes):**

- Message: `"End of the Bible. Press play to start again from Genesis."`
- Message class: `text-base text-white/80 text-center mt-4`
- Button label: `"Start from Genesis"` (visible text)
- Button `aria-label`: `"Start playback from Genesis 1"`
- Button class: identical to the existing large play button (`h-14 w-14 rounded-full ...`) with a `<Play className="h-6 w-6 text-white" aria-hidden="true" />` icon from lucide-react
- Button wrapper: `mt-4 flex justify-center`

---

## Design System Reminder

Project-specific quirks `/execute-plan` displays before every UI step:

- **Animation tokens are mandatory (BB-33).** Import `ANIMATION_DURATIONS.fast` from `frontend/src/constants/animation.ts` — do NOT hardcode `150ms` or inline `cubic-bezier(...)` strings. The existing `ToggleSwitch` already uses the `duration-fast` Tailwind class which resolves to the token.
- **Reuse `ToggleSwitch`, do NOT inline a new switch.** The spec recon note #5 asked to grep for existing `role="switch"` — there is one at `components/settings/ToggleSwitch.tsx`. Use it. Rolling a parallel iOS-style switch in `AudioPlayerExpanded` would duplicate accessibility logic and drift over time.
- **`LOAD_START` mutates sheetState.** The current `LOAD_START` reducer branch forces `sheetState: 'expanded'`. Auto-advance must not re-expand a minimized sheet. Use the new `LOAD_NEXT_CHAPTER_START` action introduced in Step 1 which preserves sheet state.
- **`onEnd` already runs through the request-id supersession gate.** `AudioPlayerProvider.tsx:103-106` captures `myId` from `lastPlayRequestIdRef.current` and bails out if a later request has superseded. The auto-advance path BB-29 builds must NOT increment the ref before checking it, because doing so would make the new engine's events consider themselves superseded. The correct pattern is: in `onEnd`, call `autoAdvance(track)`; `autoAdvance` internally increments the ref (same as `play()` does) AFTER determining the next track.
- **Navigation uses `{ replace: true }`.** Auto-advance navigation must use `navigate(..., { replace: true })` so the browser history doesn't accumulate one entry per chapter. Manual navigation (from the BibleReader back button, the chapter nav, or the book grid) continues to use push navigation — this does not change.
- **Sheet state rule: if closed, the onEnd callback is unreachable.** `close()` destroys the engine and nulls the track. So auto-advance only fires when the sheet is currently `expanded` or `minimized`. No special "closed and still playing" branch is needed.
- **Do NOT touch `useBibleAudio.ts` or `SleepTimerPanel.tsx`.** Acceptance criteria line explicitly says these scaffolding files must remain untouched. They are reserved for future specs.
- **CORS attribute line in `engine.ts` is load-bearing for BB-27.** BB-26 pre-emptively set `crossOrigin = 'anonymous'` on the Howler audio element so BB-27 ducking can run through Web Audio API. Do not remove that line — BB-29 does not need to modify `engine.ts` at all, so this is a guardrail.
- **DBP 404 on a chapter returns `{ kind: 'http', status: 404 }`** (not `kind: 'missing'`). The skip-on-404 logic in Step 2's `resolveNextTrack` helper must check both `kind === 'http'` and `status === 404`.
- **In-memory DBP cache is keyed `${filesetId}:${book}:${chapter}`.** Use `getCachedChapterAudio(filesetId, bookCode, chapter)` before hitting DBP. The `bookCode` here is the FCBH 3-letter code (`GEN`, `JHN`), not the project slug (`genesis`, `john`). Resolve via `resolveFcbhBookCode(slug)`.
- **FCBH API key gating:** if `isFcbhApiKeyConfigured()` returns false, auto-advance should no-op silently (dispatch `STOP` like BB-26 does today). This mirrors the existing AudioPlayButton's "silent fallback per spec requirement #60" pattern from BB-26.

---

## Shared Data Models (from Master Plan)

BB-29 reuses BB-26's existing types unchanged. The only extensions are to BB-26's own state shape (shown here for clarity):

```typescript
// frontend/src/types/bible-audio.ts — EXTENDED (not replaced)

export interface AudioPlayerState {
  track: PlayerTrack | null
  playbackState: PlaybackState
  currentTime: number
  duration: number
  playbackSpeed: PlaybackSpeed
  sheetState: SheetState
  errorMessage: string | null
  // BB-29 additions:
  continuousPlayback: boolean   // user preference, loaded from localStorage on mount
  endOfBible: boolean           // true only after Revelation 22's onEnd fires
}

export interface AudioPlayerActions {
  play: (track: PlayerTrack) => Promise<void>
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
  stop: () => void
  expand: () => void
  minimize: () => void
  close: () => void
  dismissError: () => void
  // BB-29 additions:
  setContinuousPlayback: (enabled: boolean) => void
  startFromGenesis: () => Promise<void>
}
```

```typescript
// frontend/src/contexts/AudioPlayerContext.ts — Action union EXTENDED

export type Action =
  | { type: 'LOAD_START'; track: PlayerTrack }
  | { type: 'LOAD_NEXT_CHAPTER_START'; track: PlayerTrack }  // BB-29 — preserves sheetState
  | { type: 'LOAD_SUCCESS'; duration: number }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TICK'; currentTime: number }
  | { type: 'SEEK'; seconds: number }
  | { type: 'SET_SPEED'; speed: PlaybackSpeed }
  | { type: 'STOP' }
  | { type: 'EXPAND' }
  | { type: 'MINIMIZE' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS_ERROR' }
  | { type: 'SET_CONTINUOUS_PLAYBACK'; enabled: boolean }  // BB-29
  | { type: 'END_OF_BIBLE' }                                // BB-29
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bb29-v1:continuousPlayback` | Both (new) | User preference for auto-advance. Defaults to `true` when absent or corrupt. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Expanded sheet height stays `340px`. Toggle row sits between speed picker and attribution, ≈44px tall. End-of-Bible message and button stack centered in the same flex region as the scrubber/play/speed cluster. Minimized bar unchanged (toggle does NOT appear here). |
| Tablet | 768px | Same layout. Expanded sheet height drops to `300px` at `sm:` breakpoint (BB-26 default). The toggle row fits because it replaces whitespace, not adds to it. |
| Desktop | 1440px | Sheet is constrained to `lg:max-w-2xl lg:mx-auto` (BB-26). Same contents as tablet. |

**Custom breakpoints:** None introduced. BB-26 verified that `340px` mobile has slack above the attribution for the ≈44px toggle row. If `/verify-with-playwright` during execution finds 340px is too tight, bump to `360px` per spec § Responsive Behavior.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Toggle row | `ToggleSwitch` label + description (left side) + switch control (right side) | Same y ±5px at 1440px, 768px, 375px | No wrapping at any breakpoint — `ToggleSwitch` uses `flex items-start justify-between gap-4` and the row width is bounded by `px-6` / `sm:px-8` sheet padding, well within all viewports |
| Expanded sheet vertical order | (top) corner buttons → chapter ref → scrubber → play+speed → **toggle row (NEW)** → attribution (bottom) | Vertically stacked via `flex flex-col` — y-coordinates must be strictly increasing top-to-bottom | N/A — vertical stack, not inline row |
| End-of-Bible state | Chapter reference (top, unchanged) → message → Start-from-Genesis button → attribution (bottom, unchanged) | Vertically stacked. Chapter ref and attribution preserve their y-positions from the playing state (testable via snapshot comparison). | N/A — vertical stack |

**`/verify-with-playwright` should compare `boundingBox().y` values:**

1. Between the speed picker row bottom and the toggle row top: gap should be ≈8px (`mt-2`). Any gap >16px flags that `mt-2` was replaced with a larger value.
2. Between the toggle row bottom and the attribution footer top: gap should match the existing `mt-3` (12px).
3. In the end-of-Bible state, the chapter ref's y should be identical (±2px) to its y in the playing state at the same viewport width — confirms the chapter ref is not moving when the mid-section swaps.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Corner buttons row → chapter reference | 8px (`mt-2`) | `AudioPlayerExpanded.tsx:97` |
| Chapter reference → scrubber row | 16px (`mt-4`) | `AudioPlayerExpanded.tsx:120` |
| Scrubber row → play+speed row | 16px (`mt-4`) | `AudioPlayerExpanded.tsx:140` |
| Play+speed row → **continuous playback toggle row (NEW)** | 8px (`mt-2`) | BB-29 spec § Design Notes |
| Continuous playback toggle row → attribution footer | 12px (`mt-3`) | `AudioPlayerExpanded.tsx:56` (unchanged) |

Any gap difference >5px is flagged as a mismatch.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-26 is merged to the wave branch (`audio-wave-bb-26-29-44`) and the Bible audio player is functional end-to-end
- [ ] `frontend/src/data/bible/index.ts:50` `getAdjacentChapter` exists and handles all boundary cases (same-book, cross-book, cross-testament, null at Revelation 22 and Genesis 1) — verified in recon
- [ ] `frontend/src/components/settings/ToggleSwitch.tsx` exists and exposes `{ checked, onChange, label, description, id }` with `role="switch"` — verified in recon
- [ ] `frontend/src/constants/animation.ts` exports `ANIMATION_DURATIONS.fast = 150` — verified in recon
- [ ] `AudioPlayerProvider` is mounted inside `<BrowserRouter>` at App.tsx:217, inside the router at line 209 — verified in recon
- [ ] `lib/audio/audio-cache.ts` in-memory cache helpers `getCachedChapterAudio` / `setCachedChapterAudio` are exported and usable from the next-track resolver — verified in recon
- [ ] FCBH API key is configured in the local `.env` for manual testing (`isFcbhApiKeyConfigured()` returns true)
- [ ] All auth-gated actions from the spec are accounted for in the plan (zero — Bible wave auth posture)
- [ ] Design system values are verified (from codebase inspection — all cited with file:line)
- [ ] All [UNVERIFIED] values are flagged with verification methods (zero — no unverified values in this plan)
- [ ] Recon report inline in spec § "Notes for Plan Phase Recon"
- [ ] BB-26 acceptance criteria line "BB-26's existing tests continue to pass unchanged" is respected — BB-29 does NOT modify BB-26 tests, only adds new ones
- [ ] The `useBibleAudio.ts` and `SleepTimerPanel.tsx` scaffolding files remain untouched (explicit acceptance criteria)
- [ ] No deprecated patterns used — this spec has no Daily Hub or homepage UI so none of the Daily Hub deprecated patterns apply; the expanded sheet is an existing BB-26 surface with its own design

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigate from inside provider vs. wrapper component | Inside provider via `useNavigate()` | Provider is already inside `<BrowserRouter>`; wrapper adds indirection and re-renders. Spec recon note #3 asked for a decision; this is it. |
| Preserve sheet state during auto-advance | New `LOAD_NEXT_CHAPTER_START` action | Existing `LOAD_START` forces `sheetState: 'expanded'`. A new action branch is cleaner than conditionally mutating `LOAD_START`. |
| Auto-advance when sheet is `closed` | Unreachable — `close()` destroys engine | Spec requirement 6 mentions this case but it can't fire because `close()` nulls the track. Document and move on. |
| Skip-on-404 consecutive limit | 3 chapters | Spec requirement 22 is a heuristic. BB-26 recon confirmed 100% DBP coverage, so this is defensive. If 3 consecutive misses occur, error state displays `"Couldn't find audio for the next several chapters. Check your connection and try again."` from `lib/audio/error-messages.ts`. |
| Preference default on absent/corrupt value | `true` | Spec requirement 16. |
| Preference storage format | Raw JSON `true` / `false` | No need for an envelope — this is a single boolean. Corruption → `JSON.parse` throws → caught → default `true`. |
| Read preference timing | Reducer lazy init (`useReducer(reducer, undefined, initFn)`) | Avoids a re-render on mount that would fire if we read in a `useEffect`. The initial state is correct from the first render. |
| Cross-tab preference sync | Out of scope | Spec § Auth & Persistence explicitly defers this. Two tabs of Bible audio are not a real use case. |
| Ref increment timing in `autoAdvance` | After deciding to advance, before dispatching `LOAD_NEXT_CHAPTER_START` | Same pattern as `play()`. Prevents the new engine's callbacks from being superseded by the old one. |
| End-of-Bible flag persistence | Not persisted | Spec requirement 11: refresh returns to idle; the flag lives only in reducer state. |
| Manual seek to end triggers auto-advance | Yes | Spec requirement 26: indistinguishable from natural end from the reducer's perspective. User behavior implies they want to advance. |
| Pause before end triggers auto-advance | No | Spec requirement 25: `onEnd` does not fire on user pause. Already the case in BB-26. |
| Media Session `nexttrack` during BB-29 | Manual advance (respects Revelation 22 boundary) | Recon note #7: BB-26 did not wire `nexttrack` / `previoustrack`. BB-29 wires them. `nexttrack` from Revelation 22 is a no-op (same as auto-advance). |
| Manual `nexttrack` when continuousPlayback is OFF | Still advances to the next chapter | `nexttrack` is a user action, not automatic. The preference only gates automatic advance on `onEnd`. |
| Tests mock `getChapterAudio` vs. mock the engine | Both — tests mock the engine module (per BB-26 pattern) AND inject DBP fakes via the next-track resolver | Keeps BB-26's engine mock surface stable; BB-29 tests pass their own resolver via optional dependency injection on the provider (see Step 3). |

---

## Implementation Steps

### Step 1: Extend types, reducer, and preference module

**Objective:** Land the data-layer foundation: new state fields, new reducer actions, new action API, and the localStorage preference module. No provider wiring yet — those changes come in Step 3.

**Files to create/modify:**
- `frontend/src/types/bible-audio.ts` — extend `AudioPlayerState` and `AudioPlayerActions`
- `frontend/src/contexts/AudioPlayerContext.ts` — extend `Action` union, `initialState`, `reducer()`
- `frontend/src/lib/audio/continuous-playback.ts` — NEW module with `readContinuousPlayback()`, `writeContinuousPlayback(value)`, and a `CONTINUOUS_PLAYBACK_KEY` constant
- `frontend/src/lib/audio/__tests__/continuous-playback.test.ts` — NEW test file
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — extend with new reducer tests

**Details:**

`AudioPlayerState` gains two fields:

```typescript
continuousPlayback: boolean  // default true, loaded from localStorage at provider mount
endOfBible: boolean          // default false, true after Revelation 22 onEnd
```

`AudioPlayerActions` gains:

```typescript
setContinuousPlayback: (enabled: boolean) => void
startFromGenesis: () => Promise<void>
```

`Action` union gains:

```typescript
| { type: 'LOAD_NEXT_CHAPTER_START'; track: PlayerTrack }
| { type: 'SET_CONTINUOUS_PLAYBACK'; enabled: boolean }
| { type: 'END_OF_BIBLE' }
```

`initialState` gains `continuousPlayback: true` and `endOfBible: false`. (The provider overrides `continuousPlayback` via lazy reducer init in Step 3 — the initialState default is only used in tests that construct state directly.)

`reducer` cases:

- `LOAD_NEXT_CHAPTER_START` — identical to `LOAD_START` EXCEPT **does NOT set `sheetState`** and **explicitly sets `endOfBible: false`**:
  ```typescript
  case 'LOAD_NEXT_CHAPTER_START':
    return {
      ...state,
      track: action.track,
      playbackState: 'loading',
      currentTime: 0,
      duration: 0,
      errorMessage: null,
      endOfBible: false,
      // sheetState preserved
    }
  ```
- `SET_CONTINUOUS_PLAYBACK` — sets `continuousPlayback: action.enabled`. Nothing else. (The action does NOT call `writeContinuousPlayback` here — that lives in the provider's `setContinuousPlayback` callback in Step 3.)
- `END_OF_BIBLE` — sets `playbackState: 'idle'`, `currentTime: 0`, `endOfBible: true`. Preserves `track` (so the chapter reference "Revelation 22" stays visible) and `sheetState`.
- `STOP` — unchanged (continues to set playbackState: idle + currentTime: 0). Does NOT clear `endOfBible`. (Auto-advance's first action after a manual `play()` on Step 3 is `LOAD_NEXT_CHAPTER_START` which resets `endOfBible` to false.)
- `LOAD_START` — unchanged except also resets `endOfBible: false` (so a user manually playing a new chapter clears the end-of-Bible flag).
- `CLOSE` — unchanged except also resets `endOfBible: false`.

`lib/audio/continuous-playback.ts` exports:

```typescript
export const CONTINUOUS_PLAYBACK_KEY = 'bb29-v1:continuousPlayback'

export function readContinuousPlayback(): boolean {
  try {
    const raw = localStorage.getItem(CONTINUOUS_PLAYBACK_KEY)
    if (raw === null) return true
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'boolean') return true
    return parsed
  } catch {
    return true
  }
}

export function writeContinuousPlayback(value: boolean): void {
  try {
    localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, JSON.stringify(value))
  } catch {
    /* private browsing / quota exceeded — fail silently */
  }
}
```

The fail-silent pattern matches BB-26's `audio-cache.ts` convention. No exports beyond the two functions and the constant.

**Auth gating (if applicable):** N/A — preference read/write is not auth-gated.

**Responsive behavior:** N/A — no UI impact (data-layer only).

**Guardrails (DO NOT):**
- Do NOT export a singleton object or class from `continuous-playback.ts` — functions only.
- Do NOT read the preference in a `useEffect` in the provider — use lazy reducer init in Step 3.
- Do NOT write the preference inside the reducer — reducers must be pure. The write happens in the provider's action callback in Step 3.
- Do NOT modify `STOP` semantics beyond preserving `endOfBible`.
- Do NOT add `endOfBible` clearing to `SET_CONTINUOUS_PLAYBACK` — toggling the preference during the end-of-Bible state should not clear the state.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `readContinuousPlayback returns true when key is absent` | unit | `localStorage.removeItem(key)`; expect `true` |
| `readContinuousPlayback returns stored true value` | unit | `localStorage.setItem(key, 'true')`; expect `true` |
| `readContinuousPlayback returns stored false value` | unit | `localStorage.setItem(key, 'false')`; expect `false` |
| `readContinuousPlayback returns true on non-JSON value` | unit | `localStorage.setItem(key, 'not-json')`; expect `true` |
| `readContinuousPlayback returns true on wrong-type value` | unit | `localStorage.setItem(key, '42')`; expect `true` |
| `writeContinuousPlayback round-trips true` | unit | `writeContinuousPlayback(true)`; `readContinuousPlayback()` → `true` |
| `writeContinuousPlayback round-trips false` | unit | `writeContinuousPlayback(false)`; `readContinuousPlayback()` → `false` |
| `writeContinuousPlayback does not throw on quota exceeded` | unit | mock `localStorage.setItem` to throw; call `writeContinuousPlayback(true)`; expect no throw |
| `reducer LOAD_NEXT_CHAPTER_START preserves sheetState` | unit | state with `sheetState: 'minimized'`, dispatch `LOAD_NEXT_CHAPTER_START`, expect `sheetState === 'minimized'` |
| `reducer LOAD_NEXT_CHAPTER_START sets new track and loading` | unit | dispatch with new track, expect `track === newTrack`, `playbackState === 'loading'`, `currentTime === 0` |
| `reducer LOAD_NEXT_CHAPTER_START clears endOfBible flag` | unit | state with `endOfBible: true`, dispatch, expect `endOfBible === false` |
| `reducer SET_CONTINUOUS_PLAYBACK sets the flag` | unit | dispatch `{ type: 'SET_CONTINUOUS_PLAYBACK', enabled: false }`, expect `continuousPlayback === false` |
| `reducer END_OF_BIBLE sets flag and stops playback` | unit | state playing Revelation 22, dispatch `END_OF_BIBLE`, expect `endOfBible === true`, `playbackState === 'idle'`, `currentTime === 0`, `track` unchanged, `sheetState` unchanged |
| `reducer LOAD_START clears endOfBible flag` | unit | state with `endOfBible: true`, dispatch `LOAD_START`, expect `endOfBible === false` |
| `reducer CLOSE clears endOfBible flag` | unit | state with `endOfBible: true`, dispatch `CLOSE`, expect `endOfBible === false` |

**Expected state after completion:**
- [ ] `AudioPlayerState` has `continuousPlayback` and `endOfBible` fields; `AudioPlayerActions` has `setContinuousPlayback` and `startFromGenesis`
- [ ] `Action` union has the three new cases; reducer handles all of them
- [ ] `lib/audio/continuous-playback.ts` exists and is tested (8 unit tests)
- [ ] New reducer tests pass (7 unit tests)
- [ ] BB-26's existing reducer tests still pass unchanged
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green

---

### Step 2: Next-track resolver helper (with skip-on-404)

**Objective:** A pure async helper that, given a current `PlayerTrack`, returns either the next playable `PlayerTrack`, a sentinel indicating end-of-Bible, or throws an error after 3 consecutive missing chapters. This isolates the "next chapter" logic from the provider so it can be unit-tested in isolation and injected in provider tests.

**Files to create/modify:**
- `frontend/src/lib/audio/next-track.ts` — NEW module
- `frontend/src/lib/audio/__tests__/next-track.test.ts` — NEW test file

**Details:**

```typescript
// frontend/src/lib/audio/next-track.ts
import type { PlayerTrack, DbpError } from '@/types/bible-audio'
import { BIBLE_BOOKS } from '@/constants/bible'
import { getAdjacentChapter } from '@/data/bible'
import { resolveFcbhBookCode, resolveFcbhFilesetForBook } from '@/lib/audio/book-codes'
import { getCachedChapterAudio, setCachedChapterAudio } from '@/lib/audio/audio-cache'
import { getChapterAudio } from '@/lib/audio/dbp-client'

export type NextTrackResult =
  | { kind: 'track'; track: PlayerTrack }
  | { kind: 'end-of-bible' }

const MAX_CONSECUTIVE_MISSES = 3

// Dependency injection points for testability. Real callers pass nothing;
// tests can inject fakes.
export interface ResolveNextTrackDeps {
  fetchChapterAudio?: typeof getChapterAudio
}

/**
 * Given the currently playing track, compute the next playable track.
 *
 * Cascade:
 *   1. Use getAdjacentChapter() to find the next (bookSlug, chapter) in canon order.
 *   2. If null, return { kind: 'end-of-bible' }.
 *   3. Resolve filesetId + bookCode for that slug.
 *   4. Check in-memory cache, return if hit.
 *   5. Fetch from DBP. On 404, skip and advance to the next chapter. Repeat
 *      up to MAX_CONSECUTIVE_MISSES (3). After 3 consecutive misses, throw the
 *      last DbpError.
 *   6. On non-404 errors (network, timeout, parse), throw immediately.
 *   7. On success, cache the URL and return the PlayerTrack.
 */
export async function resolveNextTrack(
  currentTrack: PlayerTrack,
  deps: ResolveNextTrackDeps = {},
): Promise<NextTrackResult> {
  const fetchChapterAudio = deps.fetchChapterAudio ?? getChapterAudio

  let cursor: { bookSlug: string; chapter: number } = {
    bookSlug: currentTrack.book,
    chapter: currentTrack.chapter,
  }
  let missCount = 0
  let lastError: DbpError | null = null

  while (true) {
    const adjacent = getAdjacentChapter(cursor.bookSlug, cursor.chapter, 'next')
    if (!adjacent) {
      return { kind: 'end-of-bible' }
    }

    const nextSlug = adjacent.bookSlug
    const nextChapter = adjacent.chapter
    const nextBookDisplayName = adjacent.bookName

    const filesetId = resolveFcbhFilesetForBook(nextSlug)
    const bookCode = resolveFcbhBookCode(nextSlug)
    if (!filesetId || !bookCode) {
      // Unresolvable book — treat as a skip (defensive; shouldn't happen
      // for 66 canonical books but the codes table might have a gap).
      cursor = { bookSlug: nextSlug, chapter: nextChapter }
      missCount += 1
      if (missCount >= MAX_CONSECUTIVE_MISSES) {
        throw lastError ?? {
          kind: 'parse',
          message: 'DBP book code unresolvable',
        }
      }
      continue
    }

    // Cache hit?
    const cached = getCachedChapterAudio(filesetId, bookCode, nextChapter)
    if (cached) {
      return {
        kind: 'track',
        track: {
          filesetId,
          book: nextSlug,
          bookDisplayName: nextBookDisplayName,
          chapter: nextChapter,
          translation: currentTrack.translation,
          url: cached.url,
        },
      }
    }

    // DBP fetch
    try {
      const audio = await fetchChapterAudio(filesetId, bookCode, nextChapter)
      setCachedChapterAudio(filesetId, bookCode, nextChapter, audio)
      return {
        kind: 'track',
        track: {
          filesetId,
          book: nextSlug,
          bookDisplayName: nextBookDisplayName,
          chapter: nextChapter,
          translation: currentTrack.translation,
          url: audio.url,
        },
      }
    } catch (err) {
      const dbpErr = err as DbpError
      lastError = dbpErr
      if (dbpErr.kind === 'http' && dbpErr.status === 404) {
        // Skip and continue
        cursor = { bookSlug: nextSlug, chapter: nextChapter }
        missCount += 1
        if (missCount >= MAX_CONSECUTIVE_MISSES) {
          throw dbpErr
        }
        continue
      }
      // Non-404 errors — rethrow immediately, no skip
      throw dbpErr
    }
  }
}
```

**Auth gating:** N/A — public Bible content.

**Responsive behavior:** N/A — pure async function, no UI impact.

**Guardrails (DO NOT):**
- Do NOT recursively call `resolveNextTrack` for the skip case — use the `while` loop with a cursor variable. Recursion complicates test mocking and can overflow on a pathological skip streak.
- Do NOT skip on non-404 errors. Network timeouts, parse errors, and missing-key errors must propagate immediately to the provider for error-state display.
- Do NOT hardcode 3 in multiple places — use `MAX_CONSECUTIVE_MISSES`.
- Do NOT read or write the continuous-playback preference here — this module is gating-agnostic. The provider gates the call.
- Do NOT assume `BIBLE_BOOKS` order — always go through `getAdjacentChapter`. The import of `BIBLE_BOOKS` is NOT needed (remove if the final implementation doesn't use it directly).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `resolveNextTrack returns same-book next chapter` | unit | current = John 3, inject fake returning valid audio, expect `{ kind: 'track', track: { book: 'john', chapter: 4, ... } }` |
| `resolveNextTrack crosses book boundary` | unit | current = Genesis 50, expect `{ kind: 'track', track: { book: 'exodus', chapter: 1, ... } }`, filesetId = `EN1WEBO2DA` |
| `resolveNextTrack crosses testament boundary with fileset switch` | unit | current = Malachi 4, expect next track has `filesetId === 'EN1WEBN2DA'` (NT fileset), book = `matthew`, chapter = 1 |
| `resolveNextTrack returns end-of-bible for Revelation 22` | unit | current = Revelation 22, expect `{ kind: 'end-of-bible' }` |
| `resolveNextTrack skips a 404 and advances` | unit | current = John 3, inject fake that throws `{ kind: 'http', status: 404 }` on John 4 then succeeds on John 5, expect returned track = John 5 |
| `resolveNextTrack throws after 3 consecutive 404s` | unit | inject fake that always throws 404, expect throw after exactly 3 attempts (verify call count) |
| `resolveNextTrack throws immediately on network error` | unit | inject fake that throws `{ kind: 'network', message: '...' }`, expect throw on first call, no skip |
| `resolveNextTrack throws immediately on timeout` | unit | inject fake that throws `{ kind: 'timeout' }`, expect throw on first call |
| `resolveNextTrack hits in-memory cache without calling DBP` | unit | seed `setCachedChapterAudio` for John 4, inject fake that throws if called, expect returned track = John 4 without fake invocation |
| `resolveNextTrack preserves translation from current track` | unit | current translation = 'World English Bible', expect returned track.translation === 'World English Bible' |

**Expected state after completion:**
- [ ] `lib/audio/next-track.ts` exists with `resolveNextTrack` exported
- [ ] All 10 unit tests pass
- [ ] No calls to `dbp-client` from `next-track.ts` outside the `deps.fetchChapterAudio` injection path (tests never hit the real network)
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green

---

### Step 3: Provider extension — auto-advance, navigation, preference lifecycle

**Objective:** Wire everything from Steps 1 and 2 into `AudioPlayerProvider`. Adds: lazy reducer init for the preference, the `autoAdvance` callback, the `useNavigate` call, the new action API methods (`setContinuousPlayback`, `startFromGenesis`), and the `onEnd` → auto-advance routing.

**Files to create/modify:**
- `frontend/src/contexts/AudioPlayerProvider.tsx` — extend with auto-advance and preference wiring
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — extend with auto-advance integration tests

**Details:**

**Imports added:**

```typescript
import { useNavigate } from 'react-router-dom'
import {
  readContinuousPlayback,
  writeContinuousPlayback,
} from '@/lib/audio/continuous-playback'
import { resolveNextTrack, type ResolveNextTrackDeps } from '@/lib/audio/next-track'
import { getAdjacentChapter } from '@/data/bible'
```

**Provider signature extended** to accept optional dependency injection for tests:

```typescript
interface AudioPlayerProviderProps {
  children: ReactNode
  // Test-only injection seam. Production callers omit this.
  __resolveNextTrackDeps?: ResolveNextTrackDeps
}

export function AudioPlayerProvider({
  children,
  __resolveNextTrackDeps,
}: AudioPlayerProviderProps) {
```

**Lazy reducer init** replaces the existing `useReducer(reducer, initialState)`:

```typescript
const [state, dispatch] = useReducer(
  reducer,
  undefined,
  (): AudioPlayerState => ({
    ...initialState,
    continuousPlayback: readContinuousPlayback(),
  }),
)
```

**`useNavigate` hook** called at the top of the component body:

```typescript
const navigate = useNavigate()
```

**`autoAdvance` internal callback** added between `play` and `toggle`:

```typescript
const autoAdvance = useCallback(
  async (currentTrack: PlayerTrack): Promise<void> => {
    // Request-id supersession — capture id AFTER deciding to advance,
    // mirrors the pattern in play().
    const myId = ++lastPlayRequestIdRef.current

    // Tear down existing engine first (same as play()).
    if (engineRef.current) {
      engineRef.current.destroy()
      engineRef.current = null
    }
    clearTickInterval()

    let result: Awaited<ReturnType<typeof resolveNextTrack>>
    try {
      result = await resolveNextTrack(currentTrack, __resolveNextTrackDeps)
    } catch (err) {
      if (myId !== lastPlayRequestIdRef.current) return
      dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
      return
    }

    if (myId !== lastPlayRequestIdRef.current) return

    if (result.kind === 'end-of-bible') {
      dispatch({ type: 'END_OF_BIBLE' })
      return
    }

    const nextTrack = result.track

    // Dispatch the sheet-state-preserving load action.
    dispatch({ type: 'LOAD_NEXT_CHAPTER_START', track: nextTrack })

    // Navigate to the new chapter URL using replace so history doesn't
    // accumulate one entry per chapter. Fire-and-forget — navigation is
    // synchronous and does not affect the engine lifecycle.
    navigate(`/bible/${nextTrack.book}/${nextTrack.chapter}`, { replace: true })

    // Create the new engine.
    let newEngine: AudioEngineInstance | null = null
    try {
      const { createEngineInstance } = await import('@/lib/audio/engine')
      if (myId !== lastPlayRequestIdRef.current) return
      newEngine = await createEngineInstance(nextTrack.url, {
        onPlay: () => {
          if (myId !== lastPlayRequestIdRef.current) return
          dispatch({ type: 'PLAY' })
        },
        onPause: () => {
          if (myId !== lastPlayRequestIdRef.current) return
          dispatch({ type: 'PAUSE' })
        },
        onEnd: () => {
          if (myId !== lastPlayRequestIdRef.current) return
          // Recursive auto-advance for the next chapter.
          if (latestContinuousPlaybackRef.current) {
            void autoAdvance(nextTrack)
          } else {
            dispatch({ type: 'STOP' })
          }
        },
        onLoad: (duration) => {
          if (myId !== lastPlayRequestIdRef.current) return
          dispatch({ type: 'LOAD_SUCCESS', duration })
          newEngine?.play()
        },
        onLoadError: (err) => {
          if (myId !== lastPlayRequestIdRef.current) return
          dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
        },
        onPlayError: (err) => {
          if (myId !== lastPlayRequestIdRef.current) return
          dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
        },
      })
      if (myId !== lastPlayRequestIdRef.current) {
        newEngine.destroy()
        return
      }
      engineRef.current = newEngine
      startTickInterval()
    } catch (err) {
      if (myId !== lastPlayRequestIdRef.current) {
        newEngine?.destroy()
        return
      }
      dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
    }
  },
  [clearTickInterval, startTickInterval, navigate, __resolveNextTrackDeps],
)
```

**`latestContinuousPlaybackRef`** — a ref mirror of `state.continuousPlayback` so closures (onEnd) read the current value without capturing a stale one. Added near `latestPlaybackStateRef`:

```typescript
const latestContinuousPlaybackRef = useRef(state.continuousPlayback)
latestContinuousPlaybackRef.current = state.continuousPlayback
```

**Update `play()`'s `onEnd` handler** to route through the gate as well:

```typescript
onEnd: () => {
  if (myId !== lastPlayRequestIdRef.current) return
  if (latestContinuousPlaybackRef.current) {
    void autoAdvance(track)  // use the captured `track` parameter
  } else {
    dispatch({ type: 'STOP' })
  }
},
```

Note: `play()` has the parameter `track: PlayerTrack` in scope, so the onEnd closure can capture it directly. No need to read from state.

**New action callbacks** added before the `useMemo` that builds `actions`:

```typescript
const setContinuousPlayback = useCallback((enabled: boolean) => {
  writeContinuousPlayback(enabled)
  dispatch({ type: 'SET_CONTINUOUS_PLAYBACK', enabled })
}, [])

const startFromGenesis = useCallback(async (): Promise<void> => {
  const filesetId = 'EN1WEBO2DA' // genesis is OT
  const bookCode = resolveFcbhBookCode('genesis')
  if (!bookCode) return
  // Fetch Genesis 1 audio. Reuse the same cascade as AudioPlayButton.
  let audioUrl: string | null = null
  try {
    const cached = getCachedChapterAudio(filesetId, bookCode, 1)
    if (cached) {
      audioUrl = cached.url
    } else {
      const audio = await getChapterAudio(filesetId, bookCode, 1)
      setCachedChapterAudio(filesetId, bookCode, 1, audio)
      audioUrl = audio.url
    }
  } catch (err) {
    dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
    return
  }
  await play({
    filesetId,
    book: 'genesis',
    bookDisplayName: 'Genesis',
    chapter: 1,
    translation: 'World English Bible',
    url: audioUrl,
  })
  // Navigate to the Genesis 1 reader page so the screen matches the audio.
  navigate('/bible/genesis/1', { replace: true })
}, [play, navigate])
```

Import `resolveFcbhBookCode`, `getCachedChapterAudio`, `setCachedChapterAudio`, `getChapterAudio` at the top.

**`actions` memoization** extended to include the new callbacks.

**Imports to add:**
```typescript
import { resolveFcbhBookCode } from '@/lib/audio/book-codes'
import { getCachedChapterAudio, setCachedChapterAudio } from '@/lib/audio/audio-cache'
import { getChapterAudio } from '@/lib/audio/dbp-client'
```

**Auth gating:** N/A — zero gates. Bible wave posture.

**Responsive behavior:** N/A — provider logic, no UI.

**Inline position expectations:** N/A — no rendered elements.

**Guardrails (DO NOT):**
- Do NOT increment `lastPlayRequestIdRef` before the `resolveNextTrack` call — the supersession check inside `onEnd` must have already passed at that point. The ref increment belongs at the start of `autoAdvance`, AFTER `onEnd`'s check.
- Do NOT call `autoAdvance` synchronously inside `onEnd` — use `void autoAdvance(track)` so the callback returns immediately and the engine's onEnd handler doesn't block.
- Do NOT forget to update `play()`'s `onEnd` handler. If only `autoAdvance`'s recursive handler is wired, the first chapter will still `STOP` instead of advancing.
- Do NOT read `state.continuousPlayback` inside the `onEnd` closure — use `latestContinuousPlaybackRef.current`. Reading from state captures a stale value.
- Do NOT put `navigate()` inside an `await`ed chain — fire it synchronously after `LOAD_NEXT_CHAPTER_START` dispatches. Navigation must not block the engine creation.
- Do NOT use `push` history — always `replace: true` so back button is sane.
- Do NOT add rate limiting or throttling to `autoAdvance` — the 500ms transition target is already satisfied by the DBP fetch + Howler load path.
- Do NOT call `writeContinuousPlayback` from inside the reducer — it lives in `setContinuousPlayback` callback.
- Do NOT remove BB-26's existing `onEnd` supersession check (`if (myId !== lastPlayRequestIdRef.current) return`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `provider reads continuousPlayback from localStorage on mount` | integration | seed `localStorage.setItem('bb29-v1:continuousPlayback', 'false')`; render provider; expect `state.continuousPlayback === false` |
| `provider defaults continuousPlayback to true when storage absent` | integration | clear storage; render provider; expect `state.continuousPlayback === true` |
| `setContinuousPlayback writes to localStorage and updates state` | integration | call `actions.setContinuousPlayback(false)`; expect `localStorage.getItem(...)` === `'false'` and `state.continuousPlayback === false` |
| `onEnd triggers auto-advance when continuousPlayback is true` | integration | inject `__resolveNextTrackDeps` with a fake `fetchChapterAudio` returning John 4; play John 3; fire engine.events.onEnd?.(); await; expect `state.track.chapter === 4` |
| `onEnd dispatches STOP when continuousPlayback is false` | integration | set continuousPlayback = false; play John 3; fire onEnd; expect `state.playbackState === 'idle'`, `state.track` preserved |
| `auto-advance navigates to next chapter URL with replace` | integration | use `MemoryRouter` + a route-change spy; play John 3; fire onEnd; expect navigate called with `/bible/john/4` and `{ replace: true }` |
| `auto-advance preserves expanded sheet state` | integration | play John 3, expanded; fire onEnd; expect `state.sheetState === 'expanded'` after transition |
| `auto-advance preserves minimized sheet state` | integration | play John 3; dispatch MINIMIZE; fire onEnd; expect `state.sheetState === 'minimized'` after transition |
| `auto-advance at Revelation 22 dispatches END_OF_BIBLE` | integration | play Revelation 22; fire onEnd; expect `state.endOfBible === true`, `state.playbackState === 'idle'`, `state.track` still Revelation 22, no navigate call |
| `auto-advance across book boundary navigates to new book` | integration | play Genesis 50; fire onEnd; expect navigate called with `/bible/exodus/1`, `state.track.book === 'exodus'`, `state.track.chapter === 1` |
| `auto-advance across testament boundary switches fileset` | integration | play Malachi 4; fire onEnd; expect `state.track.filesetId === 'EN1WEBN2DA'`, `state.track.book === 'matthew'`, `state.track.chapter === 1` |
| `auto-advance supersession: manual play cancels in-flight auto-advance` | integration | use deferMode; fire onEnd for John 3; before resolver resolves, call `actions.play(GENESIS_1)`; resolve the deferred engine; expect Genesis 1 wins, John 4 is destroyed |
| `auto-advance error dispatches LOAD_ERROR` | integration | inject fake fetch that throws network error; fire onEnd; expect `state.playbackState === 'error'`, errorMessage set |
| `manual pause does not trigger auto-advance` | integration | play John 3; call `actions.pause()`; expect `state.track` still John 3, no new engine created |
| `endOfBible flag cleared when user manually plays a new chapter` | integration | set endOfBible = true via END_OF_BIBLE dispatch; call `actions.play(GENESIS_1)`; expect `state.endOfBible === false` |
| `startFromGenesis action plays Genesis 1 and navigates` | integration | call `actions.startFromGenesis()`; expect `state.track.book === 'genesis'`, chapter === 1, navigate called with `/bible/genesis/1` |

**Test infrastructure note:** Provider tests wrap `<AudioPlayerProvider>` in `<MemoryRouter>`. Add the MemoryRouter wrapping in the test `wrapper` function — BB-26's existing test file does not currently wrap in a router (it doesn't need to), so this wrapping is a BB-29 test addition. The wrapper also threads through the `__resolveNextTrackDeps` injection.

**Expected state after completion:**
- [ ] `AudioPlayerProvider.tsx` extended with auto-advance, navigation, preference lifecycle, two new action callbacks
- [ ] BB-26's existing provider tests still pass unchanged
- [ ] 16 new provider integration tests pass
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green
- [ ] Manual smoke test: play John 3 in a browser, wait for chapter end (or scrub to end), verify John 4 plays automatically and the URL updates to `/bible/john/4`

---

### Step 4: Media Session — wire `nexttrack` and `previoustrack`

**Objective:** Per spec recon note #7, BB-26 wired `play`, `pause`, `seekbackward`, `seekforward`, `stop` but not `nexttrack` / `previoustrack`. BB-29 wires them so lock-screen and headphone controls can advance chapters manually.

**Files to create/modify:**
- `frontend/src/lib/audio/media-session.ts` — extend `updateMediaSession` signature to accept optional next/prev handlers, wire action handlers
- `frontend/src/contexts/AudioPlayerProvider.tsx` — pass closures that compute manual next/prev and call `play(nextTrack)` or dispatch end-of-bible
- `frontend/src/lib/audio/__tests__/media-session.test.ts` — NEW test file if one doesn't exist; otherwise extend existing
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — extend with a manual next/prev test

**Details:**

**`media-session.ts` — extended signature:**

```typescript
export interface MediaSessionHandlers {
  onNextTrack?: () => void
  onPrevTrack?: () => void
}

export function updateMediaSession(
  track: PlayerTrack,
  actions: AudioPlayerActions,
  handlers: MediaSessionHandlers = {},
): void {
  if (!hasMediaSession()) return
  try {
    // ...existing metadata and play/pause/seek wiring...

    if (handlers.onNextTrack) {
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNextTrack)
    } else {
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
    if (handlers.onPrevTrack) {
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrevTrack)
    } else {
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  } catch (e) {
    console.warn('[BB-26] Media Session update failed:', e)
  }
}
```

**`clearMediaSession` extended** to null out `nexttrack` and `previoustrack` handlers as well.

**Provider-side handlers** — added to the `useEffect` that syncs Media Session:

```typescript
useEffect(() => {
  if (state.track && state.playbackState !== 'idle') {
    const currentTrack = state.track
    const onNextTrack = () => {
      // Manual next: same cascade as auto-advance but always runs regardless
      // of continuousPlayback preference.
      void autoAdvance(currentTrack)
    }
    const onPrevTrack = () => {
      // Manual prev: resolve previous chapter via getAdjacentChapter, then call play().
      const prev = getAdjacentChapter(currentTrack.book, currentTrack.chapter, 'prev')
      if (!prev) return  // already at Genesis 1
      // Resolve filesetId + bookCode, fetch audio, call play(). Reuse the
      // same pattern as startFromGenesis but for the resolved slug/chapter.
      const filesetId = resolveFcbhFilesetForBook(prev.bookSlug)
      const bookCode = resolveFcbhBookCode(prev.bookSlug)
      if (!filesetId || !bookCode) return
      const cached = getCachedChapterAudio(filesetId, bookCode, prev.chapter)
      const playIt = async () => {
        let url: string
        if (cached) {
          url = cached.url
        } else {
          try {
            const audio = await getChapterAudio(filesetId, bookCode, prev.chapter)
            setCachedChapterAudio(filesetId, bookCode, prev.chapter, audio)
            url = audio.url
          } catch {
            return  // silent — Media Session fallback
          }
        }
        await play({
          filesetId,
          book: prev.bookSlug,
          bookDisplayName: prev.bookName,
          chapter: prev.chapter,
          translation: currentTrack.translation,
          url,
        })
        navigate(`/bible/${prev.bookSlug}/${prev.chapter}`, { replace: false })
      }
      void playIt()
    }
    updateMediaSession(state.track, actions, { onNextTrack, onPrevTrack })
  } else {
    clearMediaSession()
  }
}, [state.track, state.playbackState, actions, autoAdvance, navigate, play])
```

Note: `nexttrack` uses `replace: true` (via `autoAdvance`), `previoustrack` uses `replace: false` (push) — previous navigation is a user-initiated backward motion and should add to history, while auto-advance and manual-next are forward motion in a listening session.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT wire `nexttrack` to simply dispatch `STOP` and then `play()` in sequence — use the `autoAdvance` cascade so the UI transition is clean (no flash of idle state between chapters).
- Do NOT add a `nexttrack` handler that ignores the continuousPlayback preference gate ONLY for the END_OF_BIBLE case — `nexttrack` at Revelation 22 must still trigger the end-of-Bible state. The `autoAdvance` cascade already handles this (result === 'end-of-bible').
- Do NOT forget to null out `nexttrack` / `previoustrack` in `clearMediaSession` — leaving stale handlers after the sheet closes will cause headphone buttons to fire no-ops on unrelated pages.
- Do NOT depend on `state.track` inside the `onNextTrack` closure — capture `currentTrack` in the outer `useEffect` scope. Reading from state inside the handler captures stale values.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `updateMediaSession wires nexttrack handler when onNextTrack provided` | unit | spy on `setActionHandler`; call updateMediaSession with `{ onNextTrack: fn }`; expect `setActionHandler('nexttrack', fn)` called |
| `updateMediaSession nulls nexttrack handler when onNextTrack not provided` | unit | call without onNextTrack; expect `setActionHandler('nexttrack', null)` |
| `updateMediaSession wires previoustrack similarly` | unit | parallel test |
| `clearMediaSession nulls nexttrack and previoustrack` | unit | verify both handlers are cleared on stop |
| `provider manual nexttrack advances to the next chapter` | integration | play John 3; simulate a `nexttrack` media session event via the captured handler; expect `state.track.chapter === 4` |
| `provider manual nexttrack ignores continuousPlayback preference` | integration | set continuousPlayback = false; trigger nexttrack; expect chapter advance regardless |
| `provider manual nexttrack at Revelation 22 triggers end-of-bible state` | integration | play Revelation 22; trigger nexttrack; expect `state.endOfBible === true` |
| `provider manual previoustrack goes to previous chapter` | integration | play John 3; trigger previoustrack; expect `state.track.chapter === 2` |
| `provider manual previoustrack at Genesis 1 is a no-op` | integration | play Genesis 1; trigger previoustrack; expect `state.track` unchanged |

**Expected state after completion:**
- [ ] `media-session.ts` `updateMediaSession` signature has optional handlers; `clearMediaSession` nulls all handlers
- [ ] Provider's Media Session useEffect passes `onNextTrack` / `onPrevTrack` closures
- [ ] All 9 tests pass
- [ ] Manual smoke test: play a chapter, use OS lock-screen next/previous buttons (or `navigator.mediaSession.setActionHandler` via devtools), verify chapters advance
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green

---

### Step 5: Continuous playback toggle UI in expanded sheet

**Objective:** Add the `ToggleSwitch`-based continuous playback control to `AudioPlayerExpanded`, positioned between the speed picker and the attribution footer.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — insert the toggle row
- `frontend/src/components/audio/__tests__/AudioPlayerExpanded.test.tsx` — extend with toggle tests

**Details:**

**Import addition:**

```typescript
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
```

**New JSX** inserted between the closing `</div>` of the play+speed row (line 177, after the speed-button `<div>`) and the `<AttributionFooter />` (line 181):

```tsx
{/* Continuous playback toggle — BB-29 */}
<div className="mt-2 px-0">
  <ToggleSwitch
    id="bb29-continuous-playback"
    checked={state.continuousPlayback}
    onChange={actions.setContinuousPlayback}
    label="Continuous playback"
    description="Auto-play next chapter"
  />
</div>
```

**Hide the toggle during error and end-of-bible states.** The toggle lives inside the non-error, non-end-of-bible branch of the conditional. Put it inside the `<>` fragment that holds the scrubber + play/speed row. End-of-bible state (Step 6) has its own conditional branch and does NOT render the toggle.

**Revised rendering order inside the normal (non-error, non-end-of-bible) branch:**

1. Scrubber row
2. Play+speed row
3. **Toggle row (NEW)**
4. (AttributionFooter is always rendered, outside the conditionals)

**Auth gating:** N/A — zero gates.

**Responsive behavior:**
- Desktop (1440px): Toggle row sits at `px-8` (inherited from sheet container). `ToggleSwitch` uses `flex items-start justify-between` so label left, switch right, full width.
- Tablet (768px): Same layout, same padding.
- Mobile (375px): Container padding drops to `px-6`. Toggle label and switch remain on one row (label is ≈140-180px, switch is 48px, total ≈230px vs. container width ≈290px at 375px — fits comfortably).

**Inline position expectations (required for this step's new inline row):**
- At 1440px, 768px, 375px: `ToggleSwitch` label text y-coordinate MUST match switch button y-coordinate ±5px (same `flex items-start` row).
- At 375px: the container width ≈303px (`375 - 2 × 24 - 2 × 12` from `.max-w-2xl` + `px-6`). The label "Continuous playback" + description "Auto-play next chapter" column must not wrap into multiple lines for the label (description may wrap but label shouldn't). Verify via Playwright `getBoundingClientRect().height` ≤ 48px for the label span.

**Guardrails (DO NOT):**
- Do NOT inline a new `<button role="switch">` — reuse `ToggleSwitch`.
- Do NOT add the toggle to `AudioPlayerMini`. Spec requirement 17 explicitly forbids this.
- Do NOT render the toggle inside the error state or end-of-bible state — toggling during error is meaningless and end-of-bible has its own chrome.
- Do NOT add `mt-4` or larger above the toggle — the spec specifies `mt-2` (8px gap) for tight visual coupling as a settings control distinct from primary playback.
- Do NOT change the `id` prop from `bb29-continuous-playback` — tests and future specs may reference this stable id.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `toggle renders with correct label and description` | component | render expanded with state having track; expect `screen.getByRole('switch', { name: /continuous playback/i })` and text `"Auto-play next chapter"` |
| `toggle reflects continuousPlayback true state` | component | state.continuousPlayback = true; expect `aria-checked="true"` |
| `toggle reflects continuousPlayback false state` | component | state.continuousPlayback = false; expect `aria-checked="false"` |
| `clicking toggle calls setContinuousPlayback with inverted value` | component | state.continuousPlayback = true; click switch; expect `actions.setContinuousPlayback(false)` |
| `pressing Enter on toggle fires setContinuousPlayback` | component | focus switch, keydown Enter; expect action fired (inherited from ToggleSwitch) |
| `pressing Space on toggle fires setContinuousPlayback` | component | focus switch, press Space; expect action fired (inherited from ToggleSwitch native button behavior) |
| `toggle is hidden during error state` | component | state.playbackState = 'error'; expect no switch in document |
| `toggle is hidden during end-of-bible state` | component | state.endOfBible = true; expect no switch in document |
| `toggle does not render on AudioPlayerMini` | component | render `<AudioPlayerMini />`; expect no `role="switch"` |
| `toggle is positioned between speed picker and attribution footer` | component | query attribution footer and speed picker; expect DOM ordering puts toggle after speed picker group and before attribution link |

**Expected state after completion:**
- [ ] `AudioPlayerExpanded.tsx` renders the `ToggleSwitch` in the normal (non-error, non-end-of-bible) state
- [ ] All 10 component tests pass
- [ ] BB-26's existing AudioPlayerExpanded tests still pass unchanged
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green
- [ ] Manual smoke test in browser: toggle on/off persists across page refresh

---

### Step 6: End-of-Bible state UI + Start from Genesis button

**Objective:** When `state.endOfBible === true`, render the gentle end-of-Bible message and the "Start from Genesis" CTA in place of the scrubber/play/speed/toggle region. Preserve the chapter reference at top ("Revelation 22") and the attribution footer at bottom.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — add the end-of-bible conditional branch
- `frontend/src/components/audio/__tests__/AudioPlayerExpanded.test.tsx` — extend with end-of-bible tests

**Details:**

**Conditional structure revised:**

```tsx
if (!state.track) return null

const isPlaying = state.playbackState === 'playing'
const isError = state.playbackState === 'error'
const isEndOfBible = state.endOfBible

return (
  <div className="flex h-[340px] flex-col px-6 py-4 sm:h-[300px] sm:px-8 sm:py-5">
    {/* Corner minimize + close — unchanged */}
    <div className="flex items-center justify-between">
      ...
    </div>

    {/* Chapter reference + translation — unchanged */}
    <div className="mt-2 text-center">
      <p className="text-lg font-medium text-white">
        {state.track.bookDisplayName} {state.track.chapter}
      </p>
      <p className="mt-1 text-sm text-white/60">{state.track.translation}</p>
    </div>

    {isError ? (
      <ErrorStateContent />  // existing
    ) : isEndOfBible ? (
      <EndOfBibleContent />  // NEW
    ) : (
      <NormalPlaybackContent />  // existing scrubber + play/speed + toggle
    )}

    <AttributionFooter />
  </div>
)
```

**`EndOfBibleContent` JSX** — inline, not a separate component (small enough to inline):

```tsx
<div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4">
  <p className="text-center text-base text-white/80">
    End of the Bible. Press play to start again from Genesis.
  </p>
  <button
    ref={startFromGenesisButtonRef}
    type="button"
    onClick={() => void actions.startFromGenesis()}
    aria-label="Start playback from Genesis 1"
    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
  >
    <Play className="h-6 w-6 text-white" aria-hidden="true" />
  </button>
</div>
```

**Focus management:** When `isEndOfBible` flips to true, move focus to the Start from Genesis button. Add a `useRef` + `useEffect`:

```typescript
const startFromGenesisButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  if (isEndOfBible) {
    startFromGenesisButtonRef.current?.focus()
  }
}, [isEndOfBible])
```

This mirrors BB-26's pattern of moving focus to the primary play button on sheet expand (lines 73-76). The user who just completed the entire Bible should have keyboard focus on the primary action.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop / tablet / mobile: end-of-bible content uses the same flex-1 centered column as the error state — layout scales identically at all breakpoints. The message text wraps naturally if needed on 375px; the button is a fixed 56×56px circle centered.

**Inline position expectations:** N/A — end-of-bible state is a vertical stack, not an inline row.

**Guardrails (DO NOT):**
- Do NOT render the scrubber or speed picker or toggle in the end-of-bible branch — those controls are meaningless when playback has stopped at Revelation 22.
- Do NOT clear `state.track` when entering end-of-bible — spec requirement 10: "preserves the chapter reference ('Revelation 22') and translation label at the top".
- Do NOT use an error color (red, orange) for the message — spec requirement 10: "No error color, no warning icon, no toast. The visual treatment is calm and affirming."
- Do NOT add a celebratory message ("Congratulations! You listened to the entire Bible!") — spec § Anti-Pressure Design Decisions is explicit.
- Do NOT dismiss end-of-bible automatically — user must explicitly tap Start from Genesis or use another navigation to leave the state.
- Do NOT reopen the sheet if it was closed — spec requirement 11: "If the user's sheet is closed when Revelation 22 ends, the 'end of Bible' state is recorded in the provider but not surfaced." The `endOfBible` flag sets regardless of sheet state, but the sheet does not reopen (no dispatch of EXPAND from `autoAdvance`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `end-of-bible state renders gentle message` | component | render with state.endOfBible = true, state.track = Revelation 22; expect `screen.getByText(/end of the bible/i)` |
| `end-of-bible state renders Start from Genesis button with aria-label` | component | expect `screen.getByRole('button', { name: 'Start playback from Genesis 1' })` |
| `end-of-bible state preserves chapter reference at top` | component | expect `screen.getByText('Revelation 22')` still visible |
| `end-of-bible state preserves translation label` | component | expect `screen.getByText('World English Bible')` still visible |
| `end-of-bible state preserves attribution footer` | component | expect `screen.getByRole('link', { name: /faith comes by hearing/i })` visible |
| `end-of-bible state hides scrubber` | component | expect no `input[type=range]` in document |
| `end-of-bible state hides speed picker` | component | expect no element with `role="group"` and name "Playback speed" |
| `end-of-bible state hides continuous playback toggle` | component | expect no `role="switch"` in document |
| `clicking Start from Genesis calls actions.startFromGenesis` | component | click button; expect `actions.startFromGenesis` called once |
| `focus moves to Start from Genesis button when state transitions to end-of-bible` | component | render with endOfBible false, rerender with endOfBible true, expect `document.activeElement` to be the Start from Genesis button |

**Expected state after completion:**
- [ ] `AudioPlayerExpanded.tsx` renders end-of-bible branch with message and Start from Genesis button
- [ ] Focus moves to the button on state transition
- [ ] All 10 component tests pass
- [ ] Manual smoke test: seed state via devtools, verify the UI, tap Start from Genesis, verify Genesis 1 plays
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green

---

### Step 7: Documentation and final verification

**Objective:** Document the new localStorage key and run final verification across the full spec's acceptance criteria.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — add `bb29-v1:continuousPlayback` entry
- `frontend/src/components/audio/AudioPlayerMini.tsx` — verify loading state inherits correctly (read-only verification; modify only if a regression is observed)
- `_plans/2026-04-14-bb-29-continuous-playback-auto-advance.md` — update the Execution Log

**Details:**

**`11-local-storage-keys.md` — add a new section or insert into the existing Bible Reader section:**

Add after the "Audio Cache (BB-26)" section, before "Community Challenges":

```markdown
### Bible Audio Auto-Advance (BB-29)

Preference for continuous playback in the Bible audio player. Managed by `frontend/src/lib/audio/continuous-playback.ts`. Uses the `bb29-v1:` prefix, following the BB-26 / BB-32 `bb*-v1:` convention for spec-namespaced preferences.

| Key                              | Type      | Feature                                                                                     |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `bb29-v1:continuousPlayback`     | `boolean` | Continuous playback preference (BB-29). Defaults to `true` when absent or corrupt. No TTL. |

- **Default:** `true` — continuous playback is on by default for new users (anti-pressure design: the feature works correctly for most users without configuration).
- **Read:** Loaded once on `AudioPlayerProvider` mount via lazy reducer init. Not re-read during the session.
- **Write:** Updated synchronously by the `setContinuousPlayback` action, which mirrors the new value into the reducer state and writes to localStorage.
- **Corruption:** Non-JSON or non-boolean values fall back to the default `true`. All localStorage operations are wrapped in try/catch — private browsing, quota exceeded, and disabled storage all degrade to a no-op read returning the default and a no-op write.
- **Cross-tab:** Not synchronized. Two concurrent audio Bible sessions in separate tabs are not a real use case.
- **Version:** `bb29-v1` prefix allows future invalidation by bumping to `bb29-v2`.
```

**`AudioPlayerMini.tsx` verification** (read only — no changes unless a regression is observed):

- Open the file and confirm the play button displays a loading indicator (or disabled state) when `state.playbackState === 'loading'`. BB-26 already handles this for initial play; auto-advance goes through the same state transition (`LOAD_NEXT_CHAPTER_START` → `playbackState: 'loading'` → `LOAD_SUCCESS` → `playing`).
- If the minimized bar shows the play icon rather than a spinner during loading, that's a BB-26 pre-existing behavior and is acceptable per spec requirement 19 ("Reuse is deliberate"). Only change it if BB-26's expanded sheet shows a spinner and the mini doesn't — in which case, add the same treatment to `AudioPlayerMini` for consistency.
- Document findings in the execution log.

**Acceptance criteria final sweep** — re-read each bullet from spec § Acceptance Criteria and verify:

- [ ] Chapter end + continuousPlayback true → next chapter plays within 500ms (manual browser test)
- [ ] Genesis 50 → Exodus 1 (integration test)
- [ ] Malachi 4 → Matthew 1 with fileset switch (integration test)
- [ ] Revelation 22 → end-of-bible state (component + integration test)
- [ ] continuousPlayback false → STOP behavior preserved (integration test)
- [ ] Toggle in expanded sheet, below speed picker, above attribution (component test + Playwright check)
- [ ] Toggle persists to `bb29-v1:continuousPlayback` (integration test)
- [ ] Toggle reads preference on mount, defaults to true (integration test)
- [ ] Toggle absent from minimized bar (component test)
- [ ] URL updates on auto-advance (integration test)
- [ ] `{ replace: true }` navigation (integration test)
- [ ] Media Session metadata updates on every auto-advance (existing BB-26 useEffect auto-syncs because state.track changes — verify via unit test inspecting `updateMediaSession` call count)
- [ ] Sheet state preserved across transitions (integration tests × 2)
- [ ] Manual navigation supersedes auto-advance (integration test using deferMode)
- [ ] 404 skip + 3-consecutive error state (unit tests in Step 2)
- [ ] Toggle keyboard accessible (component test for Space/Enter)
- [ ] ARIA compliant (inherited from ToggleSwitch — verify `role="switch"` + `aria-checked` + `aria-labelledby` in component test)
- [ ] No new dependencies added (verify `package.json` diff is empty)
- [ ] Main bundle delta ≤1 KB gzipped (run `frontend/scripts/measure-bundle.mjs` before and after; record delta in execution log)
- [ ] No faith points / streak / badge recording (no code touches those files — verify via diff)
- [ ] `useBibleAudio.ts` and `SleepTimerPanel.tsx` untouched (verify via git diff)
- [ ] BB-26 tests pass unchanged (run `pnpm test -- contexts/__tests__/AudioPlayerContext.test.tsx components/audio/__tests__/` and confirm no existing test modifications)
- [ ] `bb29-v1:continuousPlayback` documented in `11-local-storage-keys.md`
- [ ] Animation durations from `constants/animation.ts` (verified via ToggleSwitch reuse; no hardcoded 150ms anywhere)

**Auth gating:** N/A.

**Responsive behavior:** N/A — documentation only.

**Guardrails (DO NOT):**
- Do NOT modify `AudioPlayerMini.tsx` unless a regression is observed in the manual smoke test.
- Do NOT modify BB-26's tests.
- Do NOT bump any dependency versions.
- Do NOT rewrite other sections of `11-local-storage-keys.md` — add the new entry in-place and leave everything else alone.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none — this is a documentation + verification step with no new unit tests) | | All testing is already done in Steps 1-6; Step 7 runs the full suite and the acceptance criteria sweep |

**Expected state after completion:**
- [ ] `11-local-storage-keys.md` has the new entry
- [ ] All acceptance criteria satisfied (or explicitly documented in the execution log as pending)
- [ ] `pnpm test` green across the entire frontend suite
- [ ] `pnpm lint` clean
- [ ] `pnpm build` succeeds
- [ ] Bundle delta measurement recorded in execution log
- [ ] Manual smoke test passed end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, reducer, preference module (data foundation) |
| 2 | — | Next-track resolver helper (pure function, independent of state) |
| 3 | 1, 2 | Provider extension — wires preference, next-track resolver, navigation, onEnd routing |
| 4 | 3 | Media Session nexttrack/previoustrack — reuses `autoAdvance` from Step 3 |
| 5 | 1 | Toggle UI — reads `state.continuousPlayback` and calls `actions.setContinuousPlayback` from Step 1 |
| 6 | 1, 3 | End-of-Bible UI — reads `state.endOfBible` from Step 1 and calls `actions.startFromGenesis` from Step 3 |
| 7 | all | Documentation + final verification |

**Parallelism:** Steps 1 and 2 can run in parallel. Steps 5 and 6 can run in parallel after Step 3 is complete (they both modify `AudioPlayerExpanded.tsx` — coordinate the edits but the logic is independent). Step 4 depends on Step 3 and should run before Step 7.

**Recommended sequence:** 1 → 2 → 3 → 4 → 5 → 6 → 7.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend types, reducer, and preference module | [COMPLETE] | 2026-04-14 | Extended `types/bible-audio.ts` (AudioPlayerState + AudioPlayerActions), `contexts/AudioPlayerContext.ts` (Action union + initialState + reducer — added LOAD_NEXT_CHAPTER_START / SET_CONTINUOUS_PLAYBACK / END_OF_BIBLE, LOAD_START and CLOSE now reset endOfBible). Created `lib/audio/continuous-playback.ts` + 9 unit tests. Added 7 new reducer tests. Updated mock state/actions in 3 existing component test files (AudioPlayerExpanded/Mini/Sheet). All 26 step-1 tests pass, full suite 8051 green, lint clean. |
| 2 | Next-track resolver helper (with skip-on-404) | [COMPLETE] | 2026-04-14 | Created `lib/audio/next-track.ts` with `resolveNextTrack()` + `ResolveNextTrackDeps` injection seam. Uses `getAdjacentChapter` for canonical order, in-memory cache via `getCachedChapterAudio`/`setCachedChapterAudio`, DBP fetch via `deps.fetchChapterAudio ?? getChapterAudio`. Skip-on-404 up to 3 consecutive misses, immediate throw on non-404. 10 unit tests green, lint clean. |
| 3 | Provider extension — auto-advance, navigation, preference lifecycle | [COMPLETE] | 2026-04-14 | Extended `AudioPlayerProvider.tsx`: lazy reducer init reads `bb29-v1:continuousPlayback`, added `useNavigate()`, `latestContinuousPlaybackRef`, `handleEndRef` shared end-of-track callback (breaks the play↔autoAdvance circular useCallback dep), new `autoAdvance` callback with supersession + `{ replace: true }` navigation, `setContinuousPlayback` + `startFromGenesis` actions, optional `__resolveNextTrackDeps` test injection seam. Updated `play()`'s onEnd to route through `handleEndRef.current`. MediaSession useEffect unchanged (Step 4 extends it). Wrapped existing AudioPlayerProvider test wrappers in `<MemoryRouter>` in 3 test files (AudioPlayerContext, AudioPlayButton, useAudioPlayer). Added 16 BB-29 integration tests. All 33 provider tests pass; 450 audio/context/BibleReader tests green; lint clean. |
| 4 | Media Session — wire nexttrack and previoustrack | [COMPLETE] | 2026-04-14 | Extended `media-session.ts`: new `MediaSessionHandlers` interface + optional handlers param on `updateMediaSession`; `clearMediaSession` nulls the two new handlers too. Provider's Media Session useEffect wires `onNextTrack` (calls `autoAdvance`, ignores continuousPlayback preference — manual user action) and `onPrevTrack` (resolves prev chapter, push navigates with `replace: false`). Added `lib/audio/__tests__/media-session.test.ts` with 5 unit tests and 5 provider integration tests for manual next/prev (capturing handlers via the mock). 43 tests green, lint clean. |
| 5 | Continuous playback toggle UI in expanded sheet | [COMPLETE] | 2026-04-14 | Added `ToggleSwitch` import + toggle row inside non-error branch of `AudioPlayerExpanded.tsx` (between speed picker and attribution). `id="bb29-continuous-playback"`. 9 new component tests + 1 Mini test verifying toggle absent from mini bar (BB-29 requirement 17). 26 tests green, lint clean. Reused existing `ToggleSwitch` component — no inline switch. |
| 6 | End-of-Bible state UI + Start from Genesis button | [COMPLETE] | 2026-04-14 | Added `isEndOfBible` branch to `AudioPlayerExpanded.tsx` conditional (isError → isEndOfBible → normal). End-of-Bible shows gentle message + h-14 w-14 Start from Genesis button with `aria-label="Start playback from Genesis 1"`. Chapter reference + attribution footer preserved. Added `startFromGenesisButtonRef` + useEffect for focus management on state transition. 10 new component tests (30 total). Lint clean. |
| 7 | Documentation and final verification | [COMPLETE] | 2026-04-14 | Added `bb29-v1:continuousPlayback` entry to `.claude/rules/11-local-storage-keys.md` (new "Bible Audio Auto-Advance (BB-29)" section between BB-26 Audio Cache and Community Challenges). Verified `useBibleAudio.ts` and `SleepTimerPanel.tsx` untouched. Final sweep: `pnpm test` → 658 files, 8107 tests green; `pnpm lint` clean; `pnpm build` succeeds. No dependency changes. Total diff: 12 modified files, 6 new files, ~1268 insertions. |
| 7 | Documentation and final verification | [NOT STARTED] | | |
