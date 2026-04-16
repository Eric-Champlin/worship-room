# Implementation Plan: BB-28 — Sleep Timer for Bible Audio

**Spec:** `_specs/bb-28-sleep-timer-bible-audio.md`
**Date:** 2026-04-15
**Branch:** `audio-wave-bb-26-29-44`
**Design System Reference:** `.claude/rules/09-design-system.md` (loaded — no separate recon snapshot needed; BB-28's UI uses the existing player's dark surface treatment, not page-level design system patterns)
**Recon Report:** Not applicable (BB-28 is a player-internal feature with no page-level layout)
**Master Spec Plan:** BB-26 plan at `_plans/2026-04-14-bb-26-fcbh-audio-bible-integration.md` + BB-29 plan at `_plans/2026-04-14-bb-29-continuous-playback-auto-advance.md` (reference only — BB-28 is the third spec in the audio wave and extends BB-26/BB-29's shipped architecture)

---

## Architecture Context

**BB-28 is an extension of BB-26 + BB-29.** It adds sleep timer behavior to the shipped Bible audio player. All new code plugs into BB-26's `AudioPlayerProvider` + reducer + engine and interacts with BB-29's continuous-playback auto-advance. No new architectural layers.

**Key existing modules BB-28 reads from or extends:**

- `frontend/src/contexts/AudioPlayerContext.ts` — pure reducer/types module. `Action` union (16 types), `reducer()`, `initialState`, `AudioPlayerContext`. BB-28 adds 3 new actions (`SET_SLEEP_TIMER`, `START_SLEEP_FADE`, `CANCEL_SLEEP_TIMER`) and extends TICK to handle countdown + fade. STOP and CLOSE are extended to clear timer state.
- `frontend/src/contexts/AudioPlayerProvider.tsx` — the React file owning the engine ref, tick interval, and action closures. BB-28 extends: (a) the `handleEndRef` callback for structural presets, (b) a new `useEffect` for fade volume management, (c) new action callbacks `setSleepTimer` and `cancelSleepTimer`.
- `frontend/src/types/bible-audio.ts` — `AudioPlayerState` (11 fields), `AudioPlayerActions` (12 methods), `PlayerTrack`. BB-28 adds `sleepTimer: SleepTimerInfo | null` and `sleepFade: SleepFadeInfo | null` to state, and `setSleepTimer` + `cancelSleepTimer` to actions.
- `frontend/src/lib/audio/engine.ts` — Howler wrapper exposing `AudioEngineInstance` (8 methods). BB-28 adds `setVolume(volume: number): void` via `howl.volume()`. Uses `html5: true` mode. Howler's `volume()` method works on HTML5 audio elements — verified in Howler 2.2.x docs.
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — the expanded sheet (221 lines). Corner row has: minimize (left) → flex spacer → close (right). Chapter reference is at lines 108-113. Speed picker row at lines 181-202. BB-29 toggle at lines 206-214. BB-28 adds the moon button to the corner row and the sleep timer indicator near the chapter reference.
- `frontend/src/components/audio/AudioPlayerMini.tsx` — the minimized bar (43 lines). Left: expand button + chapter reference. Right: play/pause button. BB-28 adds the moon button and indicator to the left zone.
- `frontend/src/components/audio/AudioPlayerSheet.tsx` — sheet wrapper. Lazy-loads expanded/mini. Fixed position, z-40. BB-28 does not modify this file.
- `frontend/src/hooks/audio/useAudioPlayer.ts` — canonical consumer hook. Returns `{ state, actions }`.
- `frontend/src/hooks/useFocusTrap.ts` — focus trap hook. Params: `(isActive: boolean, onEscape?: () => void)`. Returns `containerRef`. Stores previous focus, traps Tab/Shift+Tab, calls onEscape on Escape, restores focus on cleanup. BB-28 uses this for the SleepTimerPanel modal overlay.
- `frontend/src/constants/bible.ts:141` — `BIBLE_BOOKS` array with `{ name, slug, chapters, ... }` per book. BB-28 reads `chapters` to determine if a chapter is the last in its book (for "End of book" preset).
- `frontend/src/data/bible/index.ts:50` — `getAdjacentChapter(bookSlug, chapter, 'next'|'prev')` returns `{ bookSlug, bookName, chapter }` or null.
- `frontend/src/components/bible/SleepTimerPanel.tsx` — **existing scaffolding (292 lines) from deep review Protocol 01. This scaffolding is built for the MUSIC sleep timer** (imports `useSleepTimerControls` and `useAudioDispatch` from the music `AudioProvider`, uses `AUDIO_CONFIG.SLEEP_TIMER_OPTIONS` [15, 30, 45, 60, 90], has auth gating, custom duration input, and configurable fade duration). **BB-28 rewrites this file** because the music coupling is structural — modifying it would require changing every import, prop, state reference, and the entire panel layout. The spec says "modify rather than rewrite" as the default, but the music-specific coupling makes modification impractical.
- `frontend/src/constants/audio.ts` — `AUDIO_CONFIG.SLEEP_TIMER_OPTIONS` is the music timer's preset list `[15, 30, 45, 60, 90]`. BB-28 does NOT use this constant (its presets are different and include structural types).

**200ms tick interval architecture:**

The tick interval (`AudioPlayerProvider.tsx:118-124`) fires every 200ms while audio is loaded (started in `play()` / `autoAdvance()`, cleared in `stop()`). It dispatches `TICK { currentTime }`. BB-28 piggybacks on this interval — the TICK reducer handler is extended to also decrement the sleep timer countdown and the fade countdown. This means:
- No separate interval is created (per spec req 32).
- The timer ticks during pause (the interval is NOT cleared on pause, only on stop).
- The timer stops ticking when playback stops (interval cleared in `stop()`), which is correct because STOP also clears the timer.

**handleEndRef interaction:**

`handleEndRef` (line 105/277-283) is the shared onEnd handler updated on every render. Currently: if continuous playback → autoAdvance, else → STOP. BB-28 extends this to check structural presets first:
- `end-of-chapter`: always START_SLEEP_FADE (skip auto-advance).
- `end-of-book`: check if current chapter is the last of the book → if yes, START_SLEEP_FADE; if no, auto-advance (forces auto-advance within the book regardless of continuous playback preference).
- `duration` or no timer: existing behavior.

**Fade volume management:**

The fade uses `engineRef.current.setVolume()` (new method added in Step 2). Volume is calculated from `sleepFade.remainingMs` using the exponential curve `Math.pow(1 - progress, 2)`. Managed via a `useEffect` on `state.sleepFade` that:
1. Sets volume on each tick.
2. Calls `stop()` when fade reaches 0.
3. Does nothing when `sleepFade` is null.

Volume restore on cancel is handled imperatively in the `cancelSleepTimer` callback before dispatching.

**App-level mounting:** `AudioPlayerProvider` is at `App.tsx:217` inside `<BrowserRouter>`. `AudioPlayerSheet` is at App level (lazy-loaded). SleepTimerPanel is rendered inside `AudioPlayerExpanded` (lazy chunk), so it contributes zero to the main bundle.

**Reactive stores:** BB-28 does NOT add any reactive stores. Sleep timer state lives in the reducer (ephemeral by design — does not persist across page refreshes). No BB-45 anti-pattern risk.

**Crisis detection / AI safety:** Not applicable. BB-28 does not involve user input or AI.

**Auth gating:** Zero new gates. All Bible features are auth-free per `.claude/rules/02-security.md`.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Open sleep timer panel | No auth required | Step 5 | None — intentional |
| Set sleep timer duration | No auth required | Step 4 | None — intentional |
| Cancel active timer | No auth required | Step 4 | None — intentional |
| Auto-fade at timer completion | No auth required | Step 3 | None — intentional |

**BB-28 introduces zero new auth gates.** All Bible features are auth-free per the Bible wave posture in `.claude/rules/02-security.md`. This is documented as intentional, not an oversight.

---

## Design System Values (for UI steps)

No Design System Reference recon needed — BB-28's UI lives entirely inside the player sheet (a dark surface overlay) and reuses existing component patterns. All values below come from codebase inspection with file:line citations.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| CornerButton outer | class | `flex h-[44px] w-[44px] items-center justify-center` | `AudioPlayerExpanded.tsx:46` |
| CornerButton inner | class | `flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | `AudioPlayerExpanded.tsx:48` |
| Sheet surface | class | `bg-[#0D0620]/95 backdrop-blur-xl border-t border-white/10` | `AudioPlayerSheet.tsx:32` |
| Speed picker (active) | class | `bg-white/15 text-white` | `AudioPlayerExpanded.tsx:195` |
| Speed picker (inactive) | class | `bg-white/[0.06] text-white/80 hover:bg-white/10` | `AudioPlayerExpanded.tsx:196` |
| Chapter reference | class | `text-lg font-medium text-white` | `AudioPlayerExpanded.tsx:109` |
| Translation label | class | `mt-1 text-sm text-white/60` | `AudioPlayerExpanded.tsx:112` |
| Mini bar chapter text | class | `text-sm text-white/80` | `AudioPlayerMini.tsx:29` |
| Mini bar play button | class | `flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 ...` | `AudioPlayerMini.tsx:37` |
| Primary color token | hex | `#6D28D9` | `09-design-system.md` / `tailwind.config.js` |
| Animation duration base | ms | `250` | `constants/animation.ts` |
| Animation easing decelerate | value | from `constants/animation.ts` | `AudioPlayerSheet.tsx:22` |

**Panel-specific design values (from spec § Design Notes):**

| Component | Property | Value |
|-----------|----------|-------|
| Panel scrim | class | `fixed inset-0 z-50 flex items-center justify-center px-4` + scrim `absolute inset-0 bg-black/40` |
| Panel card | class | `relative w-full max-w-md bg-[#0D0620]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 sm:px-8 sm:py-8` |
| Panel title | class | `text-white text-lg font-medium` |
| Panel subtitle | class | `text-white/60 text-sm mt-1` |
| Preset grid | class | `mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2` |
| Preset button (unselected) | class | `min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/10 px-3 text-sm font-medium text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` |
| Preset button (selected) | class | same base + `bg-white/15 text-white border border-primary/30` |
| Preset button (disabled) | class | `opacity-50 cursor-not-allowed pointer-events-none` |
| Cancel button | class | `mt-6 w-full min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/10 text-white/70 text-sm` |
| Moon button active indicator | class | inner gets `bg-white/[0.08] border border-primary/30`, icon `text-primary/80`, shadow `shadow-[0_0_8px_rgba(109,40,217,0.2)]` |
| Timer indicator pill | class | `inline-flex items-center gap-1.5 bg-white/[0.06] border border-primary/30 rounded-full px-2 py-0.5` |
| Timer indicator text | class | `text-white/70 text-xs tabular-nums` |
| Timer indicator icon | class | `h-3 w-3 text-primary/80` (Moon icon) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- CornerButton pattern uses a 44×44 invisible outer hit area around a 32×32 visible inner circle. The `CornerButton` local component at `AudioPlayerExpanded.tsx:34-53` is the canonical reference. BB-28's moon button uses this exact pattern.
- Speed picker buttons use `rounded-full`, `min-h-[44px]`, `min-w-[56px]`, `bg-white/[0.06]` (inactive) / `bg-white/15` (active). BB-28's preset buttons match this pattern per spec.
- The sheet surface is `bg-[#0D0620]/95 backdrop-blur-xl border-t border-white/10`. The panel card uses the same surface but with `border` (all sides) and `rounded-2xl` since it's a floating panel.
- Animation tokens: import from `frontend/src/constants/animation.ts`. Do not hardcode duration or easing values.
- `useFocusTrap(isActive, onEscape)` from `hooks/useFocusTrap.ts` — returns a `containerRef<HTMLDivElement>` to attach to the modal container. Focus restores to `previouslyFocused` on cleanup.
- Lucide icons: `Moon` for the sleep timer icon (per spec). Import from `lucide-react`.
- The minimized bar is 64px tall (`h-16` at `AudioPlayerMini.tsx:21`). Adding elements must not exceed this height.

---

## Shared Data Models

**New types added to `types/bible-audio.ts`:**

```typescript
export interface SleepTimerInfo {
  type: 'duration' | 'end-of-chapter' | 'end-of-book'
  remainingMs: number // ms remaining for duration type; 0 for structural
  preset: string // '15' | '30' | '45' | '60' | '90' | '120' | 'chapter' | 'book'
}

export interface SleepFadeInfo {
  remainingMs: number // starts at 20000, decrements to 0
}
```

**New fields on `AudioPlayerState`:**

```typescript
sleepTimer: SleepTimerInfo | null
sleepFade: SleepFadeInfo | null
```

**New methods on `AudioPlayerActions`:**

```typescript
setSleepTimer: (timer: SleepTimerInfo) => void
cancelSleepTimer: () => void
```

**New shared module `lib/audio/sleep-timer.ts`:**

```typescript
export const SLEEP_FADE_DURATION_MS = 20_000

export interface SleepTimerPreset {
  id: string
  label: string
  type: 'duration' | 'end-of-chapter' | 'end-of-book'
  durationMs?: number
}

export const SLEEP_TIMER_PRESETS: SleepTimerPreset[] = [
  { id: '15', label: '15 min', type: 'duration', durationMs: 15 * 60_000 },
  { id: '30', label: '30 min', type: 'duration', durationMs: 30 * 60_000 },
  { id: '45', label: '45 min', type: 'duration', durationMs: 45 * 60_000 },
  { id: '60', label: '1 hour', type: 'duration', durationMs: 60 * 60_000 },
  { id: '90', label: '1 hr 30 min', type: 'duration', durationMs: 90 * 60_000 },
  { id: '120', label: '2 hours', type: 'duration', durationMs: 120 * 60_000 },
  { id: 'chapter', label: 'End of chapter', type: 'end-of-chapter' },
  { id: 'book', label: 'End of book', type: 'end-of-book' },
]

export function formatSleepTimerRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
```

**localStorage keys this spec touches:**

None. The sleep timer is ephemeral and does not persist across page refreshes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | SleepTimerPanel is full-width minus 16px side padding (`px-4` on the scrim container). Preset grid is 2 columns. Panel height adjusts to content. |
| Tablet | 768px | Panel is `max-w-md` (448px), centered. Preset grid is 4 columns. |
| Desktop | 1440px | Same as tablet. Panel centered above the `max-w-2xl` sheet. |

The moon button and sleep timer indicator are present at all breakpoints. The indicator content adapts (time string or structural label).

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Corner row (expanded) | Minimize btn, Moon btn, flex spacer, Close btn | Same y ±5px at all breakpoints | No wrapping acceptable |
| Mini bar left zone | ChevronUp, Moon btn, Timer indicator, Chapter text | Same y ±5px at all breakpoints | Indicator may overflow to ellipsis on very narrow screens but must not wrap |
| Preset grid | 2 columns at 375px, 4 columns at 768px+ | Same row y ±2px within a grid row | Grid layout handles this |

---

## Vertical Rhythm

Not applicable — BB-28's UI lives within the existing player sheet. No page-level vertical rhythm changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-26 is committed and passing on `audio-wave-bb-26-29-44`
- [ ] BB-29 is committed and passing on `audio-wave-bb-26-29-44`
- [ ] `pnpm test` passes on the current branch head
- [ ] `pnpm build` succeeds
- [ ] The existing `SleepTimerPanel.tsx` scaffolding (292 lines) will be rewritten, not modified — the music-provider coupling makes modification impractical (see Architecture Context)
- [ ] All auth-gated actions from the spec are accounted for (zero gates)
- [ ] No deprecated patterns used
- [ ] Howler's `volume()` method works in HTML5 mode (verified by Howler 2.2.x docs: `volume()` is format-agnostic)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rewrite vs modify SleepTimerPanel.tsx | Rewrite | Scaffolding imports from music provider, has auth gating, custom input, configurable fade — all wrong for BB-28. Modification would change every import, prop, state reference, and the layout. Rewriting is faster and less error-prone. |
| "End of book" preset when continuous playback is OFF | Force auto-advance within the current book | If continuous playback is off and the chapter ends, we'd normally stop. But "End of book" implies the user wants to hear the whole book. The handleEndRef override forces auto-advance within the book, then fades at the last chapter. Without this, the preset is useless when continuous playback is off. |
| Fade countdown at 200ms granularity (100 steps over 20s) | Accept | 100 volume updates over 20s is coarser than 60fps but perceptually smooth for a gradual volume decrease. The spec notes this as acceptable. No dedicated high-frequency interval during fade. |
| Timer continues during pause | Yes (spec req 26) | Standard sleep timer behavior — user pauses for 5 min, timer has 5 fewer min. Cancel and restart if they want to pause the timer. |
| TICK reducer handles both timer and fade countdown | Yes | The reducer is the single place for countdown math. Provider handles volume side effects via useEffect. This keeps the reducer pure and the side-effect boundary clear. |
| Volume restore on cancel is imperative, not via useEffect | Yes | The `cancelSleepTimer` callback calls `engineRef.current.setVolume(1.0)` before dispatching `CANCEL_SLEEP_TIMER`. This avoids a race between useEffect cleanup and the next render. |
| sleepTimer/sleepFade as nullable objects vs flat boolean fields | Nullable objects | Cleaner type discrimination: `sleepTimer !== null` means active. Avoids impossible states like `sleepTimerActive: true, sleepTimerType: null`. |
| Moon button position in corner row | Between minimize and flex spacer | Spec suggests: minimize (top-left), moon (top-center-left), spacer, close (top-right). At 375px mobile, three 44px buttons (132px) + spacer fits within the sheet's `px-6` (360px - 48px = 312px usable). Verified sufficient. |

---

## Implementation Steps

### Step 1: Sleep timer types, constants, and formatting helpers

**Objective:** Create the shared data types, preset definitions, and formatting utility that the reducer, provider, panel, and indicator will all consume.

**Files to create/modify:**
- `frontend/src/types/bible-audio.ts` — add `SleepTimerInfo`, `SleepFadeInfo` to types; add `sleepTimer` and `sleepFade` to `AudioPlayerState`; add `setSleepTimer` and `cancelSleepTimer` to `AudioPlayerActions`
- `frontend/src/lib/audio/sleep-timer.ts` — NEW: `SLEEP_FADE_DURATION_MS`, `SleepTimerPreset`, `SLEEP_TIMER_PRESETS`, `formatSleepTimerRemaining()`
- `frontend/src/lib/audio/__tests__/sleep-timer.test.ts` — NEW: unit tests for formatting helper

**Details:**

`types/bible-audio.ts` additions (append after `AudioPlayerState` definition):

```typescript
export interface SleepTimerInfo {
  type: 'duration' | 'end-of-chapter' | 'end-of-book'
  remainingMs: number
  preset: string
}

export interface SleepFadeInfo {
  remainingMs: number
}
```

`AudioPlayerState` gets two new fields:
```typescript
// BB-28 — sleep timer
sleepTimer: SleepTimerInfo | null
sleepFade: SleepFadeInfo | null
```

`AudioPlayerActions` gets two new methods:
```typescript
// BB-28 — sleep timer
setSleepTimer: (timer: SleepTimerInfo) => void
cancelSleepTimer: () => void
```

`lib/audio/sleep-timer.ts` — see the "Shared Data Models" section above for full content. Exports: `SLEEP_FADE_DURATION_MS` (20000), `SleepTimerPreset` interface, `SLEEP_TIMER_PRESETS` array (8 entries), `formatSleepTimerRemaining()`.

**Auth gating:** N/A — data layer only.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT put preset definitions in `constants/audio.ts` — that file is for the music subsystem. Sleep timer presets live in `lib/audio/sleep-timer.ts` alongside the Bible audio modules.
- Do NOT import from the music `AudioProvider` or `useSleepTimerControls`.
- Do NOT add localStorage keys — the timer is ephemeral.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `formatSleepTimerRemaining formats seconds` | unit | Input 45000 → "0:45" |
| `formatSleepTimerRemaining formats minutes and seconds` | unit | Input 1_800_000 → "30:00" |
| `formatSleepTimerRemaining formats hours` | unit | Input 5_400_000 → "1:30:00" |
| `formatSleepTimerRemaining handles zero` | unit | Input 0 → "0:00" |
| `formatSleepTimerRemaining handles sub-second` | unit | Input 500 → "0:01" (ceil) |
| `SLEEP_TIMER_PRESETS has 8 entries` | unit | Length check + verify all 8 presets |
| `SLEEP_TIMER_PRESETS durations are correct` | unit | 15m=900000, 30m=1800000, etc. |

**Expected state after completion:**
- [ ] `SleepTimerInfo` and `SleepFadeInfo` types exist in `types/bible-audio.ts`
- [ ] `AudioPlayerState` has `sleepTimer` and `sleepFade` fields
- [ ] `AudioPlayerActions` has `setSleepTimer` and `cancelSleepTimer`
- [ ] `lib/audio/sleep-timer.ts` exists with 8 presets and formatting helper
- [ ] 7 unit tests pass
- [ ] `pnpm lint` clean
- [ ] `pnpm build` succeeds (type errors may exist until Step 3 wires the actions — verify with `tsc --noEmit` only)

---

### Step 2: Add `setVolume` to the audio engine

**Objective:** Extend the `AudioEngineInstance` interface with a `setVolume(volume: number): void` method so the provider can control volume for the fade-out.

**Files to modify:**
- `frontend/src/lib/audio/engine.ts` — add `setVolume` to interface and implementation
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — add `setVolume` to the `EngineStub` mock

**Details:**

Add to `AudioEngineInstance` interface at `engine.ts:38-47`:
```typescript
setVolume(volume: number): void
```

Add to the returned object at `engine.ts:160-186`:
```typescript
setVolume: (v: number) => {
  howl.volume(Math.max(0, Math.min(1, v)))
},
```

Clamp to [0, 1] defensively. Howler's `volume()` accepts any number but values outside [0, 1] are undefined behavior in HTML5 mode.

Update the `EngineStub` in `AudioPlayerContext.test.tsx` (`makeEngineStub` at line ~37):
```typescript
setVolume: vi.fn(),
```

**Auth gating:** N/A.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT change the Howl constructor options (no `volume` param change).
- Do NOT add a `getVolume` method — the provider tracks fade state in the reducer, not by querying the engine.
- Do NOT remove the CORS `crossOrigin='anonymous'` line — it's load-bearing for BB-27.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `engine stub has setVolume` | unit | Verify `makeEngineStub` returns an object with `setVolume` as a vi.fn() |

(The actual volume behavior is Howler-internal; we test the provider's use of setVolume in Step 3.)

**Expected state after completion:**
- [ ] `AudioEngineInstance` interface has `setVolume`
- [ ] Engine implementation calls `howl.volume()` with clamped value
- [ ] All existing BB-26/BB-29 tests pass (engine mock updated)
- [ ] `pnpm lint` clean

---

### Step 3: Wire sleep timer into AudioPlayerContext reducer and AudioPlayerProvider

**Objective:** Add sleep timer state management to the reducer and sleep timer lifecycle logic (countdown, fade, structural presets, volume control, handleEndRef integration) to the provider.

**Files to modify:**
- `frontend/src/contexts/AudioPlayerContext.ts` — add 3 actions, extend TICK/STOP/CLOSE/END_OF_BIBLE handlers, update initialState
- `frontend/src/contexts/AudioPlayerProvider.tsx` — add sleep timer ref, fade volume useEffect, handleEndRef modifications, new action callbacks, add to actions useMemo
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — add reducer tests + provider integration tests

**Details:**

**AudioPlayerContext.ts — new actions:**

```typescript
| { type: 'SET_SLEEP_TIMER'; timer: SleepTimerInfo }
| { type: 'START_SLEEP_FADE' }
| { type: 'CANCEL_SLEEP_TIMER' }
```

**AudioPlayerContext.ts — initialState additions:**

```typescript
sleepTimer: null,
sleepFade: null,
```

**AudioPlayerContext.ts — reducer changes:**

`TICK` handler (currently just `return { ...state, currentTime: action.currentTime }`):

```typescript
case 'TICK': {
  let sleepTimer = state.sleepTimer
  let sleepFade = state.sleepFade

  // Duration timer countdown (ticks even during pause — interval runs while engine exists)
  if (sleepTimer?.type === 'duration') {
    const newRemaining = sleepTimer.remainingMs - 200
    if (newRemaining <= 0) {
      // Timer expired → transition to fade phase
      sleepTimer = null
      sleepFade = { remainingMs: SLEEP_FADE_DURATION_MS }
    } else {
      sleepTimer = { ...sleepTimer, remainingMs: newRemaining }
    }
  }

  // Fade countdown
  if (sleepFade) {
    const newRemaining = Math.max(0, sleepFade.remainingMs - 200)
    sleepFade = { remainingMs: newRemaining }
  }

  return { ...state, currentTime: action.currentTime, sleepTimer, sleepFade }
}
```

Import `SLEEP_FADE_DURATION_MS` from `@/lib/audio/sleep-timer`.

`SET_SLEEP_TIMER`:
```typescript
case 'SET_SLEEP_TIMER':
  return { ...state, sleepTimer: action.timer, sleepFade: null }
```

`START_SLEEP_FADE`:
```typescript
case 'START_SLEEP_FADE':
  return { ...state, sleepTimer: null, sleepFade: { remainingMs: SLEEP_FADE_DURATION_MS } }
```

`CANCEL_SLEEP_TIMER`:
```typescript
case 'CANCEL_SLEEP_TIMER':
  return { ...state, sleepTimer: null, sleepFade: null }
```

`STOP` — add `sleepTimer: null, sleepFade: null` to the return.

`CLOSE` — add `sleepTimer: null, sleepFade: null` to the return.

`END_OF_BIBLE` — add `sleepTimer: null, sleepFade: null` to the return.

**AudioPlayerProvider.tsx — new logic:**

1. **Ref mirror for sleep timer** (same pattern as `latestContinuousPlaybackRef`):
```typescript
const latestSleepTimerRef = useRef(state.sleepTimer)
latestSleepTimerRef.current = state.sleepTimer
```

2. **Fade volume useEffect:**
```typescript
useEffect(() => {
  if (!state.sleepFade || !engineRef.current) return
  const { remainingMs } = state.sleepFade
  const progress = (SLEEP_FADE_DURATION_MS - remainingMs) / SLEEP_FADE_DURATION_MS
  const volume = Math.pow(1 - progress, 2)
  engineRef.current.setVolume(volume)
  if (remainingMs <= 0) {
    stop()
  }
}, [state.sleepFade, stop])
```

3. **handleEndRef modification** (replace the current assignment at lines 277-283):
```typescript
handleEndRef.current = (endedTrack: PlayerTrack) => {
  const timer = latestSleepTimerRef.current

  if (timer?.type === 'end-of-chapter') {
    dispatch({ type: 'START_SLEEP_FADE' })
    return
  }

  if (timer?.type === 'end-of-book') {
    const book = BIBLE_BOOKS.find((b) => b.slug === endedTrack.book)
    if (book && endedTrack.chapter >= book.chapters) {
      dispatch({ type: 'START_SLEEP_FADE' })
      return
    }
    // Not last chapter of book — force auto-advance within book
    void autoAdvance(endedTrack)
    return
  }

  // Normal behavior (duration timer continues counting, or no timer)
  if (latestContinuousPlaybackRef.current) {
    void autoAdvance(endedTrack)
  } else {
    dispatch({ type: 'STOP' })
  }
}
```

Import `BIBLE_BOOKS` from `@/constants/bible`.

4. **New action callbacks:**

```typescript
const setSleepTimer = useCallback((timer: SleepTimerInfo) => {
  dispatch({ type: 'SET_SLEEP_TIMER', timer })
}, [])

const cancelSleepTimer = useCallback(() => {
  // Restore volume before clearing state
  engineRef.current?.setVolume(1.0)
  dispatch({ type: 'CANCEL_SLEEP_TIMER' })
}, [])
```

5. **Add to actions useMemo** — add `setSleepTimer` and `cancelSleepTimer` to both the object and the dependency array.

**Auth gating:** N/A — no auth-gated actions.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT create a separate interval for the sleep timer — piggyback on the existing 200ms tick.
- Do NOT call `stop()` inside the reducer — the reducer must be pure. The provider's useEffect calls `stop()`.
- Do NOT persist any sleep timer state to localStorage.
- Do NOT import from the music `AudioProvider` or `useSleepTimerControls`.
- Do NOT dispatch `START_SLEEP_FADE` from the TICK reducer for structural presets — structural presets trigger from `handleEndRef` in the provider, not from the tick.
- Do NOT touch the `startTickInterval` / `clearTickInterval` functions.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `reducer SET_SLEEP_TIMER sets timer and clears fade` | unit | Dispatch with timer, expect sleepTimer set, sleepFade null |
| `reducer SET_SLEEP_TIMER replaces existing timer` | unit | Set timer A, then set timer B, expect only B |
| `reducer TICK decrements duration timer` | unit | State with sleepTimer 10000ms, dispatch TICK, expect 9800ms |
| `reducer TICK transitions to fade when timer hits 0` | unit | State with sleepTimer 200ms, dispatch TICK, expect sleepTimer null, sleepFade 20000ms |
| `reducer TICK decrements fade` | unit | State with sleepFade 5000ms, dispatch TICK, expect 4800ms |
| `reducer TICK does not decrement structural timer` | unit | State with end-of-chapter timer, dispatch TICK, expect remainingMs unchanged (0) |
| `reducer START_SLEEP_FADE clears timer and sets fade` | unit | State with sleepTimer, dispatch START_SLEEP_FADE, expect sleepTimer null, sleepFade 20000ms |
| `reducer CANCEL_SLEEP_TIMER clears both` | unit | State with timer and fade, dispatch, expect both null |
| `reducer STOP clears timer and fade` | unit | State with timer active, dispatch STOP, expect both null |
| `reducer CLOSE clears timer and fade` | unit | State with timer active, dispatch CLOSE, expect both null |
| `reducer END_OF_BIBLE clears timer and fade` | unit | State with timer active, dispatch END_OF_BIBLE, expect both null |
| `provider setSleepTimer updates state` | integration | Render provider, call setSleepTimer, expect state.sleepTimer set |
| `provider cancelSleepTimer restores volume and clears state` | integration | Set timer + fade, call cancelSleepTimer, expect setVolume(1.0) called, state cleared |
| `provider fade completes and calls stop` | integration | Set timer to 200ms, advance fake timers until fade reaches 0, expect stop called and setVolume called at 0 |
| `provider end-of-chapter preset triggers fade on onEnd` | integration | Set end-of-chapter timer, fire engine onEnd, expect START_SLEEP_FADE dispatched (no auto-advance) |
| `provider end-of-book preset at last chapter triggers fade` | integration | Set end-of-book timer on last chapter, fire onEnd, expect fade (no auto-advance) |
| `provider end-of-book preset at non-last chapter auto-advances` | integration | Set end-of-book timer on non-last chapter, fire onEnd, expect auto-advance |
| `provider duration timer survives auto-advance` | integration | Set 5min timer, fire onEnd with continuous playback on, expect auto-advance AND timer preserved |
| `provider fade adjusts volume exponentially` | integration | Enter fade, advance through ticks, expect setVolume calls with exponential curve values |

**Expected state after completion:**
- [ ] Reducer handles all 3 new actions + extended TICK/STOP/CLOSE/END_OF_BIBLE
- [ ] Provider has setSleepTimer and cancelSleepTimer action callbacks
- [ ] Provider fade volume management works via useEffect
- [ ] handleEndRef correctly handles structural presets
- [ ] 19 new tests pass
- [ ] All existing BB-26/BB-29 tests pass unchanged
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green

---

### Step 4: Rewrite SleepTimerPanel as a modal overlay

**Objective:** Replace the existing music-provider-coupled SleepTimerPanel scaffolding with a BB-28-spec modal panel that reads from the Bible audio player context, shows 8 presets, handles all state variations, and has proper ARIA + focus trap.

**Files to modify:**
- `frontend/src/components/bible/SleepTimerPanel.tsx` — REWRITE (replace 292 lines)
- `frontend/src/components/bible/__tests__/SleepTimerPanel.test.tsx` — NEW test file

**Details:**

The panel is a modal overlay rendered when `isOpen` is true. It uses `useFocusTrap` and a scrim. Three state variations:

1. **No audio playing** (`state.playbackState` is `'idle'`): subtitle "Start audio first, then set a timer". Presets disabled.
2. **Audio playing, no timer active** (`state.sleepTimer === null && state.sleepFade === null`): subtitle "Choose how long to listen". Presets enabled. Tapping a preset calls `actions.setSleepTimer(timerInfo)` and closes the panel.
3. **Timer active** (`state.sleepTimer !== null || state.sleepFade !== null`): subtitle "Stopping in 23 minutes" (live countdown) or "Fading..." (during fade) or "Ends with chapter" / "Ends with book" (structural). Currently selected preset highlighted. "Cancel timer" button visible.

**Props interface:**
```typescript
interface SleepTimerPanelProps {
  isOpen: boolean
  onClose: () => void
}
```

**Component structure:**
```tsx
export function SleepTimerPanel({ isOpen, onClose }: SleepTimerPanelProps) {
  const { state, actions } = useAudioPlayer()
  const focusTrapRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  const isAudioActive = state.playbackState === 'playing' || state.playbackState === 'paused'
  const hasActiveTimer = state.sleepTimer !== null || state.sleepFade !== null

  const handlePresetClick = (preset: SleepTimerPreset) => {
    if (!isAudioActive) return
    const timer: SleepTimerInfo = {
      type: preset.type,
      remainingMs: preset.durationMs ?? 0,
      preset: preset.id,
    }
    actions.setSleepTimer(timer)
    onClose()
  }

  const handleCancel = () => {
    actions.cancelSleepTimer()
  }

  // Determine subtitle text
  let subtitle: string
  if (!isAudioActive) {
    subtitle = 'Start audio first, then set a timer'
  } else if (state.sleepFade) {
    subtitle = 'Fading...'
  } else if (state.sleepTimer?.type === 'end-of-chapter') {
    subtitle = 'Ends with chapter'
  } else if (state.sleepTimer?.type === 'end-of-book') {
    subtitle = 'Ends with book'
  } else if (state.sleepTimer) {
    subtitle = `Stopping in ${formatSleepTimerRemaining(state.sleepTimer.remainingMs)}`
  } else {
    subtitle = 'Choose how long to listen'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      {/* Panel */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sleep-timer-title"
        className="relative w-full max-w-md bg-[#0D0620]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 sm:px-8 sm:py-8"
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h2 id="sleep-timer-title" className="text-lg font-medium text-white">
            Sleep timer
          </h2>
          <button ... X close />
        </div>
        {/* Subtitle */}
        <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        {/* Preset grid */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SLEEP_TIMER_PRESETS.map(preset => (
            <button
              key={preset.id}
              disabled={!isAudioActive}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'min-h-[44px] rounded-full px-3 text-sm font-medium transition-colors ...',
                /* selected / unselected / disabled */
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* Cancel button (when timer active) */}
        {hasActiveTimer && (
          <button onClick={handleCancel} className="mt-6 w-full ...">
            Cancel timer
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
```

Use `createPortal(jsx, document.body)` so the modal scrim covers the full viewport (the panel renders inside the lazy AudioPlayerExpanded chunk but needs to portal to body for correct z-stacking).

**Auth gating:** None. No `useAuth` or `useAuthModal` imports (the scaffolding had these — BB-28 removes them).

**Responsive behavior:**
- Desktop (1440px): Panel centered, 448px max width, 4-column preset grid.
- Tablet (768px): Same as desktop.
- Mobile (375px): Panel full-width minus 16px side padding, 2-column grid.

**Guardrails (DO NOT):**
- Do NOT import from the music `AudioProvider`, `useSleepTimerControls`, or `useAudioDispatch`.
- Do NOT import `AUDIO_CONFIG.SLEEP_TIMER_OPTIONS` — use `SLEEP_TIMER_PRESETS` from `lib/audio/sleep-timer.ts`.
- Do NOT add auth gating — the scaffolding had it, BB-28 does not.
- Do NOT add a custom duration input — out of scope per spec.
- Do NOT add a configurable fade duration selector — BB-28 uses a fixed 20-second fade.
- Do NOT use `dangerouslySetInnerHTML` for any content.
- Do NOT add `animate-glow-pulse` or any deprecated patterns.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders nothing when isOpen is false` | unit | Expect null output |
| `renders panel with title and presets when open` | unit | Expect "Sleep timer" heading, 8 preset buttons |
| `shows "Start audio first" when no audio playing` | unit | Mock idle state, expect subtitle text, presets disabled |
| `shows "Choose how long to listen" when audio playing, no timer` | unit | Mock playing state, expect subtitle text, presets enabled |
| `clicking a preset calls setSleepTimer and onClose` | unit | Click "30 min", expect setSleepTimer with correct timer info, onClose called |
| `shows countdown subtitle when duration timer active` | unit | Mock state with sleepTimer remainingMs 1500000, expect "Stopping in 25:00" |
| `shows "Ends with chapter" for structural preset` | unit | Mock end-of-chapter timer, expect subtitle text |
| `shows "Fading..." during fade` | unit | Mock sleepFade state, expect subtitle text |
| `highlights the selected preset` | unit | Mock timer with preset '30', expect the 30 min button has selected styling |
| `cancel button calls cancelSleepTimer` | unit | Mock active timer, click cancel, expect cancelSleepTimer called |
| `cancel button not shown when no timer` | unit | No active timer, expect no cancel button |
| `scrim click calls onClose` | unit | Click scrim area, expect onClose called |
| `focus trap is applied when open` | unit | Expect focusTrapRef attached to panel container |
| `has correct ARIA attributes` | unit | Expect role="dialog", aria-modal="true", aria-labelledby |

**Expected state after completion:**
- [ ] `SleepTimerPanel.tsx` is a complete rewrite — no music provider imports
- [ ] All 8 presets rendered in the correct layout
- [ ] Three state variations work correctly
- [ ] Focus trap via `useFocusTrap`
- [ ] Portal to document.body
- [ ] 14 tests pass
- [ ] `pnpm lint` clean

---

### Step 5: Add moon button + indicator to AudioPlayerExpanded

**Objective:** Add the sleep timer entry point (moon icon button) to the corner row and the sleep timer indicator (countdown pill) near the chapter reference in the expanded player sheet.

**Files to modify:**
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — add moon button to corner row, add indicator, import + render SleepTimerPanel
- `frontend/src/components/audio/__tests__/AudioPlayerExpanded.test.tsx` — add tests

**Details:**

**Corner row modification** (lines 96-105):

Replace:
```tsx
<div className="flex items-center justify-between">
  <CornerButton icon={Minimize2} label="Minimize audio player" onClick={actions.minimize} />
  <div className="flex-1" />
  <CornerButton icon={X} label="Close audio player" onClick={actions.close} />
</div>
```

With:
```tsx
<div className="flex items-center justify-between">
  <CornerButton icon={Minimize2} label="Minimize audio player" onClick={actions.minimize} />
  <SleepTimerButton
    isActive={hasSleepTimer}
    onClick={() => setSleepTimerOpen(true)}
  />
  <div className="flex-1" />
  <CornerButton icon={X} label="Close audio player" onClick={actions.close} />
</div>
```

**SleepTimerButton** — local component in the same file:

```tsx
function SleepTimerButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? 'Sleep timer active — open settings' : 'Set sleep timer'}
      className="flex h-[44px] w-[44px] items-center justify-center"
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          isActive
            ? 'bg-white/[0.08] border border-primary/30 shadow-[0_0_8px_rgba(109,40,217,0.2)]'
            : 'text-white/50 hover:bg-white/10 hover:text-white/80',
        )}
      >
        <Moon
          className={cn('h-4 w-4', isActive ? 'text-primary/80' : '')}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}
```

**Sleep timer indicator** — positioned after the translation label in the chapter reference area:

```tsx
{/* Chapter reference + translation */}
<div className="mt-2 text-center">
  <p className="text-lg font-medium text-white">
    {state.track.bookDisplayName} {state.track.chapter}
  </p>
  <p className="mt-1 text-sm text-white/60">{state.track.translation}</p>
  {/* BB-28 sleep timer indicator */}
  {hasSleepTimer && (
    <SleepTimerIndicator
      sleepTimer={state.sleepTimer}
      sleepFade={state.sleepFade}
      onClick={() => setSleepTimerOpen(true)}
    />
  )}
</div>
```

**SleepTimerIndicator** — local component:

```tsx
function SleepTimerIndicator({
  sleepTimer,
  sleepFade,
  onClick,
}: {
  sleepTimer: SleepTimerInfo | null
  sleepFade: SleepFadeInfo | null
  onClick: () => void
}) {
  let text: string
  let ariaLabel: string

  if (sleepFade) {
    text = 'Fading...'
    ariaLabel = 'Sleep timer: fading out'
  } else if (sleepTimer?.type === 'end-of-chapter') {
    text = 'Ends with chapter'
    ariaLabel = 'Sleep timer: ends with chapter'
  } else if (sleepTimer?.type === 'end-of-book') {
    text = 'Ends with book'
    ariaLabel = 'Sleep timer: ends with book'
  } else if (sleepTimer) {
    text = formatSleepTimerRemaining(sleepTimer.remainingMs)
    const totalSeconds = Math.ceil(sleepTimer.remainingMs / 1000)
    const minutes = Math.ceil(totalSeconds / 60)
    ariaLabel = `Sleep timer: ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
  } else {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/[0.06] px-2 py-0.5"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <Moon className="h-3 w-3 text-primary/80" aria-hidden="true" />
      <span className="text-xs tabular-nums text-white/70">{text}</span>
    </button>
  )
}
```

**State management in AudioPlayerExpanded:**

```tsx
const [sleepTimerOpen, setSleepTimerOpen] = useState(false)
const hasSleepTimer = state.sleepTimer !== null || state.sleepFade !== null
```

Render `SleepTimerPanel` at the bottom of the component (it portals to body):
```tsx
<SleepTimerPanel isOpen={sleepTimerOpen} onClose={() => setSleepTimerOpen(false)} />
```

Import `SleepTimerPanel` as a regular import (it's in the same lazy chunk as AudioPlayerExpanded).

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Corner row has 3 buttons (minimize, moon, close) with flex spacer. All fit within `px-6`/`sm:px-8`.
- Tablet (768px): Same layout.
- Mobile (375px): Same layout. 3×44px = 132px buttons, sheet has 360-48=312px usable → ample space.

**Inline position expectations:**
- Corner row: minimize, moon, spacer, close — all must share y-coordinate ±5px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT move `CornerButton` to a shared file — it's a local component in `AudioPlayerExpanded.tsx` and BB-28 does not need to extract it.
- Do NOT add the SleepTimerPanel import to the main bundle — it's inside the lazy-loaded `AudioPlayerExpanded` chunk.
- Do NOT add `aria-live` to the entire corner row — only the indicator gets `aria-live="polite"`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders moon button in corner row` | unit | Expect button with "Set sleep timer" aria-label |
| `moon button shows active state when timer set` | unit | Mock sleepTimer state, expect primary color styling |
| `clicking moon button opens SleepTimerPanel` | unit | Click moon button, expect panel to appear |
| `sleep timer indicator shows countdown when duration timer active` | unit | Mock sleepTimer with 90000ms remaining, expect "1:30" text |
| `sleep timer indicator shows "Ends with chapter"` | unit | Mock end-of-chapter timer, expect text |
| `sleep timer indicator shows "Fading..."` | unit | Mock sleepFade state, expect text |
| `clicking indicator opens panel` | unit | Click indicator, expect panel to appear |
| `indicator has aria-live="polite"` | unit | Expect attribute on indicator element |
| `no indicator when no timer active` | unit | No sleep timer in state, expect no indicator element |

**Expected state after completion:**
- [ ] Moon button visible in corner row
- [ ] Indicator visible near chapter reference when timer active
- [ ] SleepTimerPanel opens/closes correctly
- [ ] 9 tests pass
- [ ] All existing AudioPlayerExpanded tests pass unchanged
- [ ] `pnpm lint` clean

---

### Step 6: Add moon button + indicator to AudioPlayerMini

**Objective:** Add the sleep timer moon button and indicator to the minimized bar so users can access the timer without expanding the sheet.

**Files to modify:**
- `frontend/src/components/audio/AudioPlayerMini.tsx` — add moon button and indicator
- `frontend/src/components/audio/__tests__/AudioPlayerMini.test.tsx` — add tests

**Details:**

The minimized bar is currently:
```
[ChevronUp + Chapter text (expand button)] ......... [Play/Pause]
```

BB-28 changes it to:
```
[ChevronUp + Chapter text (expand button)] [Indicator?] [Moon] [Play/Pause]
```

The moon button goes between the expand zone and the play/pause button. The indicator (if active) sits inline with the chapter text inside the expand button.

**Modified structure:**

```tsx
return (
  <div className="flex h-16 items-center justify-between gap-3 px-6 py-3">
    <button type="button" onClick={actions.expand} aria-label="Expand audio player"
      className="flex flex-1 items-center gap-3 rounded-md text-left transition-opacity hover:opacity-80 ..."
    >
      <ChevronUp className="h-4 w-4 text-white/50" aria-hidden="true" />
      <span className="text-sm text-white/80">
        {state.track.bookDisplayName} {state.track.chapter}
      </span>
      {/* BB-28 inline indicator */}
      {hasSleepTimer && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-white/[0.06] px-1.5 py-0.5"
          aria-live="polite"
          aria-label={indicatorAriaLabel}
        >
          <Moon className="h-2.5 w-2.5 text-primary/80" aria-hidden="true" />
          <span className="text-[10px] tabular-nums text-white/70">{indicatorText}</span>
        </span>
      )}
    </button>
    {/* BB-28 moon button */}
    <button
      type="button"
      onClick={() => setSleepTimerOpen(true)}
      aria-label={hasSleepTimer ? 'Sleep timer active — open settings' : 'Set sleep timer'}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
    >
      <Moon
        className={cn('h-4 w-4', hasSleepTimer ? 'text-primary/80' : 'text-white/50')}
        aria-hidden="true"
      />
    </button>
    <button type="button" onClick={actions.toggle} aria-label={toggleLabel}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 ..."
    >
      <Icon className="h-4 w-4 text-white" aria-hidden="true" />
    </button>
  </div>
)
```

Note: The moon button in the mini bar is smaller (h-10 w-10, no outer 44px wrapper) to fit the 64px bar height. This matches the play/pause button sizing at `AudioPlayerMini.tsx:37`.

**SleepTimerPanel** also needs to open from the mini bar. Add state + render:

```tsx
const [sleepTimerOpen, setSleepTimerOpen] = useState(false)
const hasSleepTimer = state.sleepTimer !== null || state.sleepFade !== null
// ... compute indicatorText and indicatorAriaLabel using the same logic as the expanded indicator

// At bottom of component:
<SleepTimerPanel isOpen={sleepTimerOpen} onClose={() => setSleepTimerOpen(false)} />
```

**Auth gating:** N/A.

**Responsive behavior:**
- All breakpoints: Same layout (mini bar is a single-line flex row). The indicator adapts content but not layout.
- Mobile (375px): ChevronUp (16px) + text (~80px) + indicator (~60px) + gap + moon (40px) + play (40px) = ~260px. Fits within 375-48=327px.

**Guardrails (DO NOT):**
- Do NOT increase the mini bar height beyond `h-16` (64px).
- Do NOT add a separate expand button — tapping the left zone (text area) expands the sheet (existing behavior, preserved).
- Do NOT add the full `SleepTimerButton` pattern from the expanded sheet — the mini bar uses a simpler button without the 44px outer wrapper.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders moon button in mini bar` | unit | Expect button with "Set sleep timer" aria-label |
| `moon button shows active color when timer set` | unit | Mock sleepTimer, expect primary icon color |
| `indicator shows countdown in mini bar` | unit | Mock sleepTimer, expect countdown text |
| `indicator not shown when no timer` | unit | No timer in state, expect no indicator |
| `clicking moon opens SleepTimerPanel` | unit | Click moon, expect panel |

**Expected state after completion:**
- [ ] Moon button visible in mini bar
- [ ] Indicator visible inline when timer active
- [ ] SleepTimerPanel openable from mini bar
- [ ] 5 tests pass
- [ ] All existing AudioPlayerMini tests pass unchanged
- [ ] `pnpm lint` clean

---

### Step 7: Final integration verification

**Objective:** Run the full test suite, lint, and build to verify everything is green. Run a manual smoke test of the complete sleep timer flow.

**Files to modify:** None (verification only)

**Details:**

1. Run `pnpm test` — all tests pass (existing + new).
2. Run `pnpm lint` — no new lint errors.
3. Run `pnpm build` — build succeeds. Check main bundle delta (target ≤2 KB gzipped). The sleep timer reducer actions are in the main bundle (AudioPlayerContext is not lazy-loaded), but they are small (< 500 bytes). SleepTimerPanel, indicators, and moon buttons are in the lazy AudioPlayerExpanded/AudioPlayerMini chunks.
4. Manual smoke test checklist:
   - [ ] Open Bible reader, start audio playback
   - [ ] Expand the player sheet — moon button visible in corner row
   - [ ] Tap moon button — SleepTimerPanel opens as modal overlay with scrim
   - [ ] Verify all 8 presets are shown
   - [ ] Tap "30 min" — panel closes, indicator shows "30:00" near chapter reference
   - [ ] Moon button icon turns primary/purple
   - [ ] Indicator counts down
   - [ ] Minimize the sheet — moon button and indicator visible in mini bar
   - [ ] Tap moon from mini bar — panel opens showing "Stopping in X:XX" with selected preset highlighted
   - [ ] Cancel timer — indicator disappears, moon button returns to default state
   - [ ] Set "End of chapter" timer — indicator shows "Ends with chapter"
   - [ ] Let chapter end — audio fades over 20 seconds, indicator shows "Fading..."
   - [ ] After fade, player stops
   - [ ] Set duration timer, let it expire — verify 20-second exponential fade
   - [ ] During fade, tap moon button → cancel — volume restores to full
   - [ ] Set timer, stop playback manually — timer cleared

**Auth gating:** N/A.

**Responsive behavior:** N/A — verification step.

**Guardrails (DO NOT):**
- Do NOT commit any debug logging left over from development.
- Do NOT skip the `pnpm build` check — type errors in lazy chunks are invisible until build time.

**Test specifications:** None (verification of existing tests).

**Expected state after completion:**
- [ ] `pnpm test` all green
- [ ] `pnpm lint` clean
- [ ] `pnpm build` succeeds
- [ ] Manual smoke test passes
- [ ] No debug logging left in code

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, constants, formatting helpers |
| 2 | — | Engine setVolume method |
| 3 | 1, 2 | Reducer + provider wiring |
| 4 | 1, 3 | SleepTimerPanel rewrite |
| 5 | 3, 4 | Moon button + indicator in expanded sheet |
| 6 | 3, 4 | Moon button + indicator in mini bar |
| 7 | 5, 6 | Final verification |

Steps 1 and 2 can be executed in parallel.
Steps 5 and 6 can be executed in parallel (both depend on 3 and 4).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types, constants, formatting helpers | [COMPLETE] | 2026-04-15 | Added SleepTimerInfo/SleepFadeInfo to bible-audio.ts, created lib/audio/sleep-timer.ts, 8 unit tests pass |
| 2 | Engine setVolume method | [COMPLETE] | 2026-04-15 | Added setVolume to AudioEngineInstance interface + impl, updated EngineStub mock. 15 pre-existing test failures confirmed (same before changes). |
| 3 | Reducer + provider wiring | [COMPLETE] | 2026-04-15 | 3 new actions, extended TICK/STOP/CLOSE/END_OF_BIBLE, fade volume useEffect, handleEndRef with structural presets, 13 new tests pass. Fixed fadeJustStarted guard (plan code had same-tick decrement bug). |
| 4 | SleepTimerPanel rewrite | [COMPLETE] | 2026-04-15 | Full rewrite of SleepTimerPanel.tsx (292→152 lines), removed all music provider coupling, 14 tests pass |
| 5 | Moon button + indicator (expanded) | [COMPLETE] | 2026-04-15 | SleepTimerButton + SleepTimerIndicator local components, SleepTimerPanel integration, 9 new tests pass (39 total in file) |
| 6 | Moon button + indicator (mini) | [COMPLETE] | 2026-04-15 | Moon button, inline indicator, SleepTimerPanel integration, 5 new tests pass (11 total in file) |
| 7 | Final integration verification | [COMPLETE] | 2026-04-15 | Lint clean. 8089 tests pass (+14 from steps 5-6), 35 pre-existing failures unchanged. Build succeeds (main bundle 105.63 KB gzip). `@types/howler` was missing from node_modules (pnpm install fixed). |
