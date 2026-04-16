# Implementation Plan: BB-26 FCBH Audio Bible Integration

**Spec:** `_specs/bb-26-fcbh-audio-bible-integration.md`
**Date:** 2026-04-10
**Branch:** `bible-redesign` (all BB-* specs commit directly — no new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (internal feature, no external visual replication target)
**Master Spec Plan:** not applicable (Bible redesign wave uses per-ticket plans; BB-20 plan is the closest prior-art reference)

---

## Architecture Context

### Existing infrastructure discovered in recon

- **`AudioProvider`** — `frontend/src/components/audio/AudioProvider.tsx`
  - Mounted at app root (between `AuthModalProvider` and `Routes` in `App.tsx`).
  - Exposes 5 contexts: `AudioStateContext`, `AudioDispatchContext`, `AudioEngineContext`, `SleepTimerControlsContext`, `ReadingContextControlContext`.
  - State managed via `useReducer(audioReducer, initialAudioState)`. Reducer lives in `frontend/src/components/audio/audioReducer.ts`. Action union in `frontend/src/types/audio.ts`.
  - Side-effect routing through `enhancedDispatch` (lines 56+) — action handlers call `engine.*` methods AND dispatch pure reducer actions.
  - Media session metadata updates (lines 189-228) are derived from `(foregroundContent, readingContext, currentSceneName)` state slices.
- **`AudioEngineService`** — `frontend/src/lib/audio-engine.ts`
  - Web Audio API wrapper managing `AudioContext` for ambient sounds.
  - Foreground playback (scripture readings, bedtime stories) already uses `<audio>` HTMLAudioElement wrapped in `MediaElementAudioSourceNode` — NOT what BB-26 builds, because BB-26 requires a raw `<audio>` element mounted at the provider level, independent of the Web Audio graph.
- **BB-20 ambient audio** (plan `_plans/2026-04-09-bb20-ambient-audio-under-reading.md`, fully shipped):
  - Added `readingContext` state slice + `SET_READING_CONTEXT`/`CLEAR_READING_CONTEXT` actions.
  - Added `useReadingContext()` hook exposing `setReadingContext`/`clearReadingContext`.
  - Created `frontend/src/components/bible/reader/AmbientAudioPicker.tsx` (276 lines) — desktop popover + mobile bottom sheet, focus-trapped, click-outside dismiss, curated quick-row sounds, volume slider, "Browse all sounds" → `OPEN_DRAWER`, "Set a sleep timer" → `OPEN_DRAWER`, stop button.
  - Created `frontend/src/components/bible/reader/ReaderChrome.tsx` — action bar with ICON_BTN class `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white`. Audio icon mounted with `audioButtonRef` between Aa (typography) and Minimize2 (focus).
  - Auth gating: per the Explore agent's recon, `useSoundToggle` internally calls `authModal.openAuthModal()` when `!isAuthenticated`. The ambient icon itself is visible to all users. **Note:** BB-26 does NOT use `useSoundToggle` and does NOT mirror this gate. Whether BB-20's gate is itself correct is flagged for BB-37b review — see "Deep Review Backlog" section below.
- **Bible reader page** — `frontend/src/pages/BibleReader.tsx` (~625 lines)
  - Uses `useReadingContext()`, `useReaderAudioAutoStart()`, `useReaderSettings()`, manages `pickerOpen` + `audioButtonRef` state.
- **`useReaderSettings`** — `frontend/src/hooks/useReaderSettings.ts` (154 lines)
  - Canonical shape: each setting stored as an individual `wr_bible_reader_*` localStorage key (NOT a single JSON object). Contains 8 fields currently (4 typography + 4 ambient audio).
  - Typed field sets: `BOOLEAN_FIELDS`, `NULLABLE_STRING_FIELDS`, `NUMBER_FIELDS`, `VALID_VALUES` (string-enum).
  - `updateSetting<K>(key, value)` writes through to localStorage and updates state.
- **`TypographySheet`** — `frontend/src/components/bible/reader/TypographySheet.tsx`
  - Mobile: bottom sheet (`inset-x-0 bottom-0 rounded-t-2xl animate-bottom-sheet-slide-in`).
  - Desktop: floating panel (`lg:right-20 lg:top-16 lg:w-[320px] rounded-2xl`).
  - `PANEL_STYLE`: `background: 'rgba(15, 10, 30, 0.95)'`, `backdropFilter: 'blur(16px)'`, `border: '1px solid rgba(255,255,255,0.1)'`.
- **BB-5 focus mode** — `frontend/src/hooks/useFocusMode.ts` (335 lines)
  - Fades the entire `ReaderChrome` to `opacity: 0`, `pointer-events: none`, 600ms transition.
  - User activity (mousemove/touch/scroll) re-reveals the chrome via `transitionToActive()`.
  - No special "chrome-access pattern" beyond user-activity reveal — the narration control will fade/restore with all other chrome icons equally.
- **Bible book data** — `frontend/src/data/bible/index.ts` + `frontend/src/constants/bible.ts`
  - `BIBLE_BOOKS: BibleBook[]` contains all 66 books with `slug`, `name`, `testament`, `category`, `chapters`. Slug format: lowercase with hyphens for numbered books (`1-samuel`, `2-corinthians`).
  - `getBookBySlug(slug)` is the canonical lookup. BB-26 will add a `fcbhCode` map as a separate file (leaving `BIBLE_BOOKS` untouched).
- **`useAuth`** — `frontend/src/hooks/useAuth.ts` re-exports from `AuthContext`. Returns `{ isAuthenticated, user, login, logout }`.
- **`useAuthModal`** — from `AuthModalProvider` at `frontend/src/components/prayer-wall/AuthModalProvider.tsx`. Opens the auth-shell modal.
- **`FrostedCard`** — `frontend/src/components/homepage/FrostedCard.tsx`. Used across homepage and Daily Hub. NarrationPicker will NOT wrap in FrostedCard; it uses `PANEL_STYLE` directly (matching `AmbientAudioPicker` and `TypographySheet`).

### Test patterns to follow

- Component tests: `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx` — direct prop passing, no provider wrapping.
- Hook/provider tests wrap in `<AuthModalProvider><ToastProvider><AudioProvider>` and use `renderHook` from `@testing-library/react`.
- Mock `fetch` via `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({...}) }))`.
- Time-based tests use `vi.useFakeTimers()` + `vi.advanceTimersByTime(...)`.

### Auth gating pattern (none — BB-26 follows the BB-4 reader-preferences model)

BB-26 introduces **zero new auth gates**. The rationale:

1. **No personal data is persisted.** Per the spec ("Auth & Persistence" section): "Playback state (currently playing chapter, current time) is session-only in-memory state on the AudioProvider — NOT persisted to localStorage." The only localStorage writes are reader preferences (`narrationControlVisible`, `narrationAutoStart`, `narrationDefaultSpeed`, `narrationVolume`) — these are preferences, not personal data, and BB-4 does not gate reader preferences.
2. **Reading Psalm 23 is not gated; hearing Psalm 23 should not be gated either.** A logged-out user can read the Bible text. They should be able to hear the same text without a sign-up wall. Gating audio playback would contradict the "free and accessible" positioning in CLAUDE.md and would be inconsistent with the ungated text reader established by BB-4.
3. **No listening analytics are written.** BB-26 does not log to `wr_listening_history` or any equivalent. Listening creates no user-specific state beyond the ephemeral in-memory playback position, which dies with the page.
4. **FCBH is a free, public CDN.** There is no per-user rate limit concern, no cost-per-play concern, and no abuse vector that a sign-in wall would mitigate. IP-based rate limiting (if ever needed) is handled at the edge, not by an auth wall.

### What this means for each action

| Action | Logged-out behavior | Logged-in behavior |
|--------|---------------------|---------------------|
| See `NarrationControl` icon | Visible | Visible |
| Tap icon to open `NarrationPicker` | Picker opens | Picker opens |
| Tap the big play button | Narration plays | Narration plays |
| Scrub / seek | Works | Works |
| Cycle playback speed | Works | Works |
| Adjust narration volume | Works (persists to `wr_bible_reader_narration_volume`) | Works (same) |
| Change narration settings in TypographySheet | Works (same localStorage model as ambient settings) | Works (same) |
| See `NarrationCurrentlyPlayingIndicator` chip | Visible | Visible |
| Auto-start narration on chapter open (if user enabled the setting) | Fires | Fires |

### Reader preferences are not personal data

Volume level, default playback speed, show-narration-control visibility, and auto-start preference are exactly parallel to font size, line height, theme, and font family — existing BB-4 settings that are **not** auth-gated. BB-26 follows that precedent precisely.

---

## Auth Gating Checklist

**No new auth gates introduced by BB-26.**

Every action in the spec works identically for logged-out and logged-in users. No `useAuth` check, no `authModal.openAuthModal()` call, no conditional behavior based on authentication state is added by this plan.

The only `useAuth` reference introduced by BB-26 is a **read-only check inside `useNarrationAutoStart`** that skips auto-start when the user is logged out — but this is removed in the current plan because there is no reason to gate auto-start either. See Step 15 for details.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| NarrationPicker background | `background` / `backdrop-filter` | `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)` | `AmbientAudioPicker` PANEL_STYLE, `TypographySheet` line 51 |
| NarrationPicker border | `border` | `1px solid rgba(255,255,255,0.10)` | `TypographySheet` PANEL_STYLE |
| NarrationPicker radius | `border-radius` | `rounded-2xl` (`16px`) | `TypographySheet` classes |
| NarrationPicker mobile animation | class | `animate-bottom-sheet-slide-in` | `tailwind.config.js` + `TypographySheet` |
| NarrationPicker desktop anchor | class | `lg:right-20 lg:top-16 lg:w-[360px]` | Adapted from `TypographySheet` `lg:w-[320px]` — NarrationPicker is `360px` per spec requirement 21 |
| Reader action bar icon button | class | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | `ReaderChrome.tsx` line 7 `ICON_BTN` constant |
| Primary play/pause button in picker | size | `min-h-[56px] min-w-[56px]` (exceeds 44px tap target, matches spec requirement 22) | Spec Design Notes |
| Primary play/pause button | class | `inline-flex items-center justify-center rounded-full bg-white text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] hover:bg-white/90` | Adapted from homepage primary CTA white pill (09-design-system.md § "White Pill CTA Patterns" Pattern 2) |
| Skip (-15s / +15s) button | class | `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white` | Adapted from `ICON_BTN` pattern |
| Speed cycle button | class | `inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.20] px-3 text-sm font-semibold text-white/90 hover:bg-white/[0.12] hover:border-white/[0.30] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | **Resolved via competitor recon** — YouVersion uses this exact pattern (outlined pill, transparent/light fill, compact pill with text-only speed label, `border-radius: 24px`). BB-26 adapts to dark theme with `white/[0.08]` fill and `white/[0.20]` border, upgraded tap target to 44×56 (YouVersion's 12×50 fails WCAG tap target floor for sanctuary use). See `_plans/recon/bb26-audio-competitors.md` § YouVersion. |
| Scrubber track | class | `h-1 bg-white/20 rounded-full relative` | **Resolved via competitor recon** — YouVersion, Bible.is, and Audible all use a thin horizontal track. The 1px track on a 20% white base is the canonical dark-theme treatment for the BB-20 volume slider and is reused here for visual consistency. See `_plans/recon/bb26-audio-competitors.md`. |
| Scrubber fill | class | `absolute left-0 top-0 h-full bg-white rounded-full` | **Resolved via competitor recon** — YouVersion and Bible.is both use a single-color fill (light-on-light for YouVersion, white-on-dark for Bible.is). BB-26 uses `bg-white` (full opacity) on the dark theme, NOT `bg-primary` — white fill reads cleaner on dark backgrounds than a primary-color fill and matches the BB-20 volume slider's approach. |
| Scrubber thumb | size / class | 16px diameter white circle (`h-4 w-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]`) wrapped in a 44×44 invisible hit area | **Resolved via competitor recon** — Bible.is uses `rc-slider` with a 14px handle; YouVersion uses a similar 14-16px thumb. BB-26 uses 16px for precision + a 44×44 invisible hit area for WCAG tap target compliance. The invisible hit area is implemented by wrapping the thumb in a `flex items-center min-h-[44px]` container. |
| Volume slider (narration) | component | `VolumeSlider` from `frontend/src/components/audio/VolumeSlider.tsx` | Reuse from BB-20. Pass narration-specific `aria-label="Narration volume"`. |
| NarrationCurrentlyPlayingIndicator chip | class | `inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-primary/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.12] hover:border-primary/60 transition-colors` wrapped in `min-h-[44px] flex items-center` for tap target | **BB-26-unique pattern — no direct competitor match** (none of the 4 competitor apps have this because their entry models eliminate the "scrolled away from playing chapter" problem). The chip values are derived from existing Worship Room chip patterns (`bg-white/[0.08]` tinted tinted-accent treatment with a `primary/40` border to signal "active status"). Low-confidence marker retained — verify after Step 14 via `/verify-with-playwright`. See `_plans/recon/bb26-audio-competitors.md` § "Currently-playing indicator chip". |
| Error card inside picker | class | `rounded-xl border border-warning/40 bg-warning/[0.08] px-4 py-3 text-sm text-white/90` | Adapted from 09-design-system.md warm-warning pattern (warning = `#F39C12`) |
| Focus ring (all interactive) | class | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Homepage primary CTA pattern |
| Scrubber label text | class | `text-xs text-white/60 tabular-nums` | 09-design-system.md text opacity table |
| Picker heading "Listen" | class | `text-lg font-semibold text-white` | Spec + existing picker conventions |
| Chapter label "John 3" | class | `text-sm text-white/70` | 09-design-system.md |

**Remaining [UNVERIFIED] values after competitor recon:**

1. **FCBH endpoint shape** — blocks Step 2. Resolved by Pre-Execution Task (manual curl against `https://4.dbt.io/api/bibles/filesets?language_code=eng`).
2. **FCBH 3-letter book code format** — blocks Step 1. Resolved by the same Pre-Execution Task (inspect live response for the WEB fileset's book code vocabulary).
3. **NarrationCurrentlyPlayingIndicator chip** — low-risk; no competitor has this pattern because their entry models eliminate the "scrolled-away" UX gap. Values derived from existing Worship Room chip patterns. Verify via `/verify-with-playwright` after Step 14.

Four values that were `[UNVERIFIED]` in the initial plan are now **RESOLVED** via Playwright recon against YouVersion, Bible.is, Dwell, and Audible: narration scrubber track, scrubber fill, scrubber thumb, and speed cycle button. See `_plans/recon/bb26-audio-competitors.md` for full recon notes.

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- The Bible reader is NOT part of the Daily Hub — it does NOT use `HorizonGlow`. BB-26's new components live inside the reader chrome and overlay layers, NOT Daily Hub tab content.
- `animate-glow-pulse` is DEPRECATED and removed from `tailwind.config.js`. Use static box-shadow if a glow is needed. BB-26 buffering states use a slow opacity pulse OR `Loader2` spinner from Lucide — NOT `animate-glow-pulse`.
- Deprecated: cyan textarea glow, inline expanding dropdown for AmbientSoundPill, `font-serif italic` on prose, `GlowBackground` per Daily Hub section, Caveat font on headings. None of these should appear in BB-26 code.
- `FrostedCard` is the canonical card pattern — but the `NarrationPicker` panel does NOT wrap in FrostedCard; it uses `PANEL_STYLE` (`rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`) to match `AmbientAudioPicker` and `TypographySheet`. This is deliberate — picker/sheet panels use the darker, more opaque background.
- Sticky FABs use `pointer-events-none` outer + `pointer-events-auto` inner + `env(safe-area-inset-*)`. BB-26 does NOT add any sticky FAB — the narration control sits inside the reader chrome action bar.
- White pill CTA Pattern 2 (homepage primary): large play button in the picker uses this pattern. The "Stop playback" button uses a smaller neutral variant.
- All text: `text-white` for headings, `text-white/70`-`text-white/80` for body/secondary, `text-white/60` for labels/hints. Zero raw hex values in component code.
- **Reader action bar icon placement**: Per `ReaderChrome.tsx`, the existing order is Aa (typography) → Volume2/VolumeX (BB-20 ambient) → Minimize2 (focus) → BookOpen (browse). BB-26 inserts the new `NarrationControl` IMMEDIATELY AFTER the BB-20 ambient icon and BEFORE Minimize2. Do NOT reorder existing controls. Do NOT merge with the ambient control.
- **Mutual-exclusion rule:** `NarrationPicker` and `AmbientAudioPicker` cannot be open simultaneously. Opening one must close the other. Both use `z-50` and the same focus trap pattern.
- **Media session priority when both channels play:** narration wins (per spec requirement 37). BB-20's ambient metadata is overridden by narration metadata when narration is active.
- **Inline element layouts on the NarrationPicker control row** (skip / play / skip / speed): document expected y-alignment so `/verify-with-playwright` can compare `boundingBox().y` values.

---

## Shared Data Models (from Master Plan)

No master plan. BB-26 produces its own types consumed by no other spec in the wave.

**New TypeScript types introduced by BB-26** (added to `frontend/src/types/audio.ts`):

```typescript
// Narration channel state
export interface NarrationState {
  currentChapter: { book: string; chapter: number } | null
  isPlaying: boolean
  isBuffering: boolean
  isError: boolean
  errorMessage: string | null
  volume: number           // 0-100
  playbackSpeed: 0.75 | 1 | 1.25 | 1.5 | 2
  currentTime: number      // seconds
  duration: number         // seconds
}

// Action additions to AudioAction union
export type NarrationAction =
  | { type: 'NARRATION_REQUEST'; payload: { book: string; chapter: number } }
  | { type: 'NARRATION_BUFFERING' }
  | { type: 'NARRATION_PLAYING' }
  | { type: 'NARRATION_PAUSED' }
  | { type: 'NARRATION_RESUMED' }
  | { type: 'NARRATION_STOPPED' }
  | { type: 'NARRATION_SEEK'; payload: { time: number } }
  | { type: 'NARRATION_TIME_UPDATE'; payload: { currentTime: number } }
  | { type: 'NARRATION_DURATION'; payload: { duration: number } }
  | { type: 'NARRATION_SET_SPEED'; payload: { speed: 0.75 | 1 | 1.25 | 1.5 | 2 } }
  | { type: 'NARRATION_SET_VOLUME'; payload: { volume: number } }
  | { type: 'NARRATION_ERROR'; payload: { message: string } }
  | { type: 'NARRATION_CLEAR_ERROR' }

// Extended AudioState — add narration slice
export interface AudioState {
  // ... existing fields (activeSounds, foregroundContent, masterVolume, isPlaying, sleepTimer, readingContext, etc.)
  narration: NarrationState
}
```

```typescript
// Narration controls context value
export interface NarrationControls {
  play: (book: string, chapter: number) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  seekTo: (seconds: number) => void
  setPlaybackSpeed: (speed: 0.75 | 1 | 1.25 | 1.5 | 2) => void
  setVolume: (volume: number) => void
}
```

```typescript
// FCBH client types (frontend/src/lib/audio/fcbh/types.ts)
export interface FcbhFileset {
  id: string
  language: string
  translation: string
  audioType: 'drama' | 'non-drama'
}

export class FCBHNetworkError extends Error { readonly name = 'FCBHNetworkError' }
export class FCBHNotFoundError extends Error { readonly name = 'FCBHNotFoundError' }
export class FCBHRateLimitError extends Error {
  readonly name = 'FCBHRateLimitError'
  constructor(message: string, public readonly retryAfterSeconds: number | null) { super(message) }
}
export class FCBHApiError extends Error { readonly name = 'FCBHApiError' }
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_reader_narration_visible` | Both | "Show narration control in reader" toggle (default `'true'`) |
| `wr_bible_reader_narration_autostart` | Both | "Auto-play narration when opening a chapter" toggle (default `'false'`) |
| `wr_bible_reader_narration_default_speed` | Both | Default playback speed (`'0.75'|'1'|'1.25'|'1.5'|'2'`, default `'1'`) |
| `wr_bible_reader_narration_volume` | Both | Narration volume 0-100 (default `'85'`) |

**No new top-level `wr_*` keys** — all 4 keys follow the existing `wr_bible_reader_*` prefix established by BB-4. `11-local-storage-keys.md` will be updated in Step 5.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | NarrationControl icon in reader top bar (44×44). NarrationPicker as full-width bottom sheet, `max-h-[65vh]`, swipe-down dismiss, `animate-bottom-sheet-slide-in`. Scrubber full-width, skip/play/skip/speed on a horizontal row. Volume slider stacked below. NarrationCurrentlyPlayingIndicator chip docked below action bar (or inline after the narration icon if width permits — chip hides on <360px to avoid chrome overflow). |
| Tablet | 768px | Same bottom sheet pattern, but `max-w-[520px] mx-auto`. Indicator chip inline in the action bar. |
| Desktop | 1440px | NarrationPicker as popover anchored to the icon: `lg:right-20 lg:top-16 lg:w-[360px]`. Scrubber on its own row; skip/play/skip/speed/volume on row 2. Indicator chip inline in the action bar. |

**Custom breakpoints:** None. The `lg` breakpoint (1024px) is the single popover ↔ bottom-sheet pivot, matching `TypographySheet`.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Reader action bar icons | Aa, VolumeX, Headphones (NarrationControl), Minimize2, BookOpen | Same y ±2px at all breakpoints | Never wrap — fits in ~56×5 = 280px, always under any viewport |
| NarrationPicker control row | `-15s`, Play/Pause (56px), `+15s`, Speed pill | Same y ±5px at 768px and 1440px | Acceptable to wrap below 360px |
| NarrationPicker scrubber row | Current time label, scrubber, total time label | Same y ±2px at all breakpoints | Never wrap — labels are small tabular-nums |
| NarrationCurrentlyPlayingIndicator + action bar | Indicator chip, action bar icons (when inline at ≥768px) | Same y ±5px at ≥768px | Chip moves below chrome at <768px (explicit layout change, not a wrap bug) |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification) to compare `boundingBox().y` values.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Picker heading "Listen" → chapter label | `mt-1` (~4px) | Adapted from `AmbientAudioPicker` header |
| Chapter label → Play/pause button | `mt-6` (24px) | Adapted from TypographySheet section spacing |
| Play/pause row → scrubber row | `mt-6` (24px) | Same |
| Scrubber row → volume slider | `mt-6` (24px) | Same |
| Volume slider → sleep timer link | `mt-5` (20px) | AmbientAudioPicker pattern |
| Sleep timer link → Stop playback button | `mt-3` (12px) | Same |
| Error card → body content | `mb-4` (16px) | New; matches warm-warning card spacing |

`/verify-with-playwright` Step 6e will compare these against measured `boundingBox` gaps. Any gap difference >5px is a mismatch.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **RECON TASK 3 COMPLETE (BLOCKING):** Manually verify FCBH API access from the dev machine. Hit `https://4.dbt.io/api/bibles/filesets?language_code=eng` and a chapter endpoint. Confirm: (a) API reachable, (b) WEB translation available in `filesets`, (c) chapter request returns a playable MP3 URL, (d) URL opens in an HTML5 `<audio>` element, (e) CORS allows browser playback. Record the exact request/response shapes into a scratchpad file at `_plans/recon/fcbh-api-notes.md`.
- [ ] **RECON TASK 4 COMPLETE (BLOCKING):** Run `/playwright-recon` against YouVersion audio Bible, Dwell, Bible.is, and Audible (or review existing notes). Record where each app puts the play button, currently-playing chapter indicator pattern, buffering state, error state, speed controls, and skip behavior. Use findings to finalize picker layout before Step 13.
- [ ] **FCBH API key determination:** Confirm whether FCBH requires a public API key. If yes, add `VITE_FCBH_API_KEY` to `.env.example` in Step 4 and document the acquisition process.
- [ ] **FCBH book code format confirmed:** The spec assumes 3-letter codes (`GEN`, `JHN`, `REV`). Verify this matches what the filesets endpoint accepts — correct the map in Step 1 if FCBH uses a different format.
- [ ] BB-20 acceptance criteria all still pass (manual regression) before BB-26 ships. Run BB-20 ambient audio flow end-to-end as part of Step 18.
- [ ] No new auth gates introduced — confirmed via the Auth Gating Checklist (zero new gates). Reader preferences follow the BB-4 ungated model.
- [ ] Recent Execution Logs (BB-25, BB-24, BB-20) show no design-system deviations that affect BB-26.
- [ ] No deprecated patterns used (see Design System Reminder).
- [ ] **Real iOS device testing allocated** — Step 18 explicitly lists the manual-test checklist; the user must have access to a physical iPhone for final verification before merging.
- [ ] `_plans/recon/design-system.md` date checked. Recon captured before Wave 7 merged, but Wave 7 touched Daily Hub + textareas — NOT the Bible reader — so the recon is still applicable to BB-26's reader-chrome work.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sleep timer link behavior | **Disabled with "Coming soon"** | Wiring to BB-20's ambient sleep timer would cross channel boundaries; BB-28 handles this properly |
| NarrationPicker as drawer view vs standalone | **Standalone bottom sheet / popover** | Mirrors `AmbientAudioPicker`; drawer views are reserved for `books`/`chapters` per `DrawerView` union |
| Where to mount the narration `<audio>` element | **Inside `AudioProvider` JSX (sibling to SleepTimerBridge), via a ref held by AudioProvider** | Must survive route changes (spec req 12); provider is the only always-mounted parent |
| Whether to route narration audio through `AudioEngineService` Web Audio graph | **NO — raw `<audio>` element, no MediaElementAudioSourceNode** | Spec req 11 mandates a single reusable element; Web Audio graph routing adds complexity and breaks the "reuse src" pattern |
| How to detect rapid navigation supersession | **AudioProvider holds a `lastRequestIdRef`; each `play()` call increments it; async work checks `lastRequestIdRef.current === myId` before dispatching load** | Simpler than AbortController and works with HTMLAudioElement `src` assignment |
| What triggers the 10-second stall error | **A `setTimeout(10000)` started on `waiting`/`stalled`/`suspend`, cleared on `canplay`/`playing`/`timeupdate`** | Matches spec req 47, 48 exactly |
| Indicator chip placement on mobile | **Docks below the reader action bar as a separate row when viewport < 768px** | Avoids overflowing the action bar; spec allows chip under chrome on mobile |
| `NarrationPicker` z-index | **`z-50`** (same as AmbientAudioPicker and TypographySheet) | Per spec req 29 mutual-exclusion rule |
| Media session artwork | **Use `/icons/bible-192.png` if present, fallback to the existing app artwork** | Real artwork left for a follow-up; generic book icon is sufficient for BB-26 |
| Does `stop()` clear `currentChapter`? | **Yes — `stop()` dispatches `NARRATION_STOPPED` which resets `currentChapter: null`, `currentTime: 0`, `isPlaying: false`** | Stopping is an explicit user action; chip disappears, control returns to idle |
| Does `pause()` clear `currentChapter`? | **No — pause preserves the chapter and time, only changes `isPlaying: false`** | Pause is resume-able |

---

## Implementation Steps

### Step 1: FCBH error types, book code map, and module scaffold

**Objective:** Create the foundation files for the FCBH client without any network code.

**Files to create:**
- `frontend/src/lib/audio/fcbh/errors.ts` — typed error classes (`FCBHNetworkError`, `FCBHNotFoundError`, `FCBHRateLimitError`, `FCBHApiError`)
- `frontend/src/lib/audio/fcbh/bookCodes.ts` — `BOOK_SLUG_TO_FCBH_CODE: Record<string, string>` covering all 66 books from `BIBLE_BOOKS`. Mapping uses the standard FCBH/DBP 3-letter codes (e.g., `'genesis' → 'GEN'`, `'psalms' → 'PSA'`, `'1-samuel' → '1SA'`, `'john' → 'JHN'`, `'revelation' → 'REV'`). Also export `getFcbhBookCode(slug: string): string` that throws a descriptive error if the slug is unknown.
- `frontend/src/lib/audio/fcbh/types.ts` — `FcbhFileset` interface, `PlaybackSpeed` literal union (`0.75 | 1 | 1.25 | 1.5 | 2`)
- `frontend/src/lib/audio/fcbh/index.ts` — barrel export

**Details:**
- `errors.ts`: 4 classes each extending `Error`. `FCBHRateLimitError` takes an optional `retryAfterSeconds: number | null` constructor arg and stores it as a public readonly field. Each class sets `readonly name` for `instanceof`-safe error branching.
- `bookCodes.ts`: Complete 66-entry map derived from `BIBLE_BOOKS`. During execution, verify the map has exactly 66 entries AND that every slug in `BIBLE_BOOKS` has a corresponding entry (add a build-time assertion using `BIBLE_BOOKS.forEach`).
- The FCBH 3-letter code list is well-known and matches BibleBrain/DBP convention: OSIS-adjacent but with some differences (e.g., Song of Solomon is `SNG`, not `SOS`). The plan phase pre-execution check (pre-execution checklist) validates this.
- `index.ts`: Export everything from errors, types, bookCodes (reserve `fcbhClient` export for Step 2).

**Auth gating:** N/A — pure utility module.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT hardcode API URLs or keys in this step (Step 4 handles env vars).
- Do NOT make any network requests in this step.
- Do NOT write to localStorage from any FCBH module (memory-only per spec req 4).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `bookCodes.test.ts`: returns correct code for known slug | unit | `getFcbhBookCode('john')` returns `'JHN'` |
| `bookCodes.test.ts`: all 66 books have a mapping | unit | Iterate `BIBLE_BOOKS`, assert every slug exists in the map |
| `bookCodes.test.ts`: throws on unknown slug | unit | `getFcbhBookCode('unknown')` throws with a message containing the slug |
| `errors.test.ts`: FCBHRateLimitError captures retryAfterSeconds | unit | Construct with `42`, assert `.retryAfterSeconds === 42` |
| `errors.test.ts`: instanceof discrimination | unit | Each error class is distinguishable via `instanceof` |

**Expected state after completion:**
- [ ] `frontend/src/lib/audio/fcbh/` directory exists with 4 files
- [ ] All 66 book codes mapped and tested
- [ ] Error classes exported and tested
- [ ] Zero network code, zero localStorage, zero hardcoded URLs

---

### Step 2: FCBH client — `getAudioUrl` and `listAvailableFilesets`

**Objective:** Implement the thin direct-fetch FCBH client with WEB fileset caching and URL caching.

**Files to create:**
- `frontend/src/lib/audio/fcbh/fcbhClient.ts` — client module with public methods `getAudioUrl(book: string, chapter: number): Promise<string>` and `listAvailableFilesets(): Promise<FcbhFileset[]>`. Also exports `resetFcbhCaches()` for test cleanup.

**Files to modify:**
- `frontend/src/lib/audio/fcbh/index.ts` — add `fcbhClient` exports

**Details:**
- Module-level state (closure-scoped, not exported):
  - `let webFilesetId: string | null = null` — cached for session
  - `let webFilesetPromise: Promise<string> | null = null` — in-flight dedupe
  - `const urlCache = new Map<string, { url: string; expiresAt: number }>()` — cache key `'${bookCode}-${chapter}'`, TTL 1 hour
- `listAvailableFilesets()`: Hits `${VITE_FCBH_API_BASE}/bibles/filesets?language_code=eng&media=audio` with optional `v4-api-key` query param (from `VITE_FCBH_API_KEY`, added in Step 4). Returns parsed array. Catches `fetch` errors and throws `FCBHNetworkError`; translates `status === 429` to `FCBHRateLimitError` (reading `Retry-After` header); translates `status === 404` to `FCBHNotFoundError`; translates any other non-OK to `FCBHApiError`.
- `async function getWebFilesetId(): Promise<string>`:
  - Returns `webFilesetId` if set.
  - Returns `webFilesetPromise` if in-flight.
  - Otherwise calls `listAvailableFilesets()`, finds the WEB entry (filter by `translation === 'WEB'` or name match — exact filter confirmed during Recon task 3), caches `webFilesetId`, returns it.
- `getAudioUrl(bookSlug: string, chapter: number)`:
  - Translate `bookSlug` to FCBH code via `getFcbhBookCode(bookSlug)`.
  - Check `urlCache` for `${code}-${chapter}` — return cached URL if `Date.now() < expiresAt`.
  - Call `getWebFilesetId()`.
  - Fetch `${VITE_FCBH_API_BASE}/bibles/filesets/${filesetId}/${code}/${chapter}` (exact endpoint confirmed during Recon task 3). Response shape: `{ data: [{ path: string, ... }] }` per FCBH docs — adjust in execution if recon finds differently.
  - Extract the MP3 URL from response, store in `urlCache` with `expiresAt = Date.now() + 3600000`, return URL.
  - Same error-translation pattern as `listAvailableFilesets`.
- `resetFcbhCaches()`: sets `webFilesetId = null`, `webFilesetPromise = null`, `urlCache.clear()`. Exported only for test use.
- **ZERO localStorage writes** from this module (spec req 4).
- **Zero hardcoded API keys** — all come from env vars (Step 4).

**Auth gating:** N/A — pure data module.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT store the FCBH URL cache in localStorage (spec req 4).
- Do NOT hardcode the API base URL or API key (Step 4 wires env vars).
- Do NOT call this client from a React component directly — only the `AudioProvider` (Step 7) calls it.
- Do NOT use the outdated FCBH JavaScript SDK.
- Do NOT retry automatically on failure — spec req 49 says "no automatic retries".

**Test specifications:** See Step 3 (tests are a separate step for clarity).

**Expected state after completion:**
- [ ] `fcbhClient.ts` exists with `getAudioUrl`, `listAvailableFilesets`, `resetFcbhCaches` exports
- [ ] WEB fileset ID cached in memory for the session
- [ ] URL cache with 1-hour TTL, in-memory Map only
- [ ] All error paths translate to typed errors

---

### Step 3: FCBH client unit tests

**Objective:** Cover successful fetches, all error paths, and caching behavior.

**Files to create:**
- `frontend/src/lib/audio/fcbh/__tests__/fcbhClient.test.ts`

**Details:**
- Use `vi.stubGlobal('fetch', vi.fn(...))` to mock responses.
- Use `vi.useFakeTimers()` for TTL tests.
- Call `resetFcbhCaches()` in `beforeEach` to isolate tests.
- Stub `import.meta.env.VITE_FCBH_API_BASE` and `VITE_FCBH_API_KEY` via `vi.stubEnv()`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `listAvailableFilesets` returns parsed filesets on success | unit | Mock 200 response with sample filesets, assert array contents |
| `listAvailableFilesets` throws FCBHNetworkError on fetch failure | unit | Mock `fetch` rejection, assert `instanceof FCBHNetworkError` |
| `listAvailableFilesets` throws FCBHRateLimitError with retryAfterSeconds | unit | Mock 429 with `Retry-After: 60` header, assert `retryAfterSeconds === 60` |
| `listAvailableFilesets` throws FCBHRateLimitError with null retryAfterSeconds when header missing | unit | Mock 429 no header, assert `retryAfterSeconds === null` |
| `listAvailableFilesets` throws FCBHNotFoundError on 404 | unit | Mock 404, assert error type |
| `listAvailableFilesets` throws FCBHApiError on other non-OK | unit | Mock 500, assert error type |
| `getAudioUrl` returns URL on successful chain (filesets → chapter) | unit | Mock both endpoints, assert returned URL |
| `getAudioUrl` caches the WEB fileset ID for subsequent calls | unit | Call twice, assert filesets endpoint fetched once |
| `getAudioUrl` dedupes in-flight WEB fileset requests | unit | Two parallel `getAudioUrl()` calls, assert filesets endpoint fetched once |
| `getAudioUrl` caches URL within 1-hour TTL | unit | Call twice with same book/chapter, assert chapter endpoint fetched once |
| `getAudioUrl` refetches URL after TTL expires | unit | Advance fake timers 1h+1s, assert second call fetches again |
| `getAudioUrl` throws on unknown book slug | unit | Call with `'bogus-book'`, assert error thrown from `getFcbhBookCode` |
| `getAudioUrl` translates 404 from chapter endpoint | unit | Mock 404 on chapter, assert `FCBHNotFoundError` |
| `resetFcbhCaches` clears both fileset ID and URL cache | unit | Populate caches, call reset, call again, assert both endpoints re-fetched |

**Expected state after completion:**
- [ ] 14 FCBH client tests passing
- [ ] Coverage includes all error paths and caching behavior (spec acceptance criterion for FCBH client tests satisfied)

---

### Step 4: Environment variable wiring

**Objective:** Add FCBH environment variables to `.env.example` and the Vite env type definitions.

**Files to modify:**
- `frontend/.env.example` — add `VITE_FCBH_API_BASE=https://4.dbt.io/api` and `VITE_FCBH_API_KEY=` (empty, user fills in)
- `frontend/src/vite-env.d.ts` — add `VITE_FCBH_API_BASE: string` and `VITE_FCBH_API_KEY: string` to the `ImportMetaEnv` interface
- `frontend/src/lib/audio/fcbh/fcbhClient.ts` — read env vars at module load (NOT on every call — capture into module-level `const`s to make stubbing predictable)

**Details:**
- Env var naming follows the `VITE_` prefix convention from `09-design-system.md` (e.g., `VITE_AUDIO_BASE_URL` precedent).
- If `VITE_FCBH_API_KEY` is empty/undefined, the client omits the `v4-api-key` query param (FCBH public endpoints work without a key for small-scale testing; production must set one).
- Document the env vars in a new section of `.claude/rules/08-deployment.md`? **NO** — 08-deployment.md is canonical but BB-26 should only append if necessary. The `.env.example` file is sufficient for now.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT commit a real API key. `.env.example` must show empty or placeholder value only.
- Do NOT read env vars inside functions — read at module load for stubbability.

**Test specifications:** Covered by existing Step 3 tests (they stub the env vars).

**Expected state after completion:**
- [ ] `.env.example` lists both FCBH variables
- [ ] `vite-env.d.ts` includes the type entries
- [ ] `fcbhClient.ts` reads env vars at module scope

---

### Step 5: Extend `useReaderSettings` with narration fields

**Objective:** Add 4 new fields (`narrationControlVisible`, `narrationAutoStart`, `narrationDefaultSpeed`, `narrationVolume`) to the reader settings hook and update the localStorage rules file.

**Files to modify:**
- `frontend/src/hooks/useReaderSettings.ts`:
  - Add 4 fields to the `ReaderSettings` interface
  - Add 4 entries to `DEFAULTS` (`true`, `false`, `1`, `85`)
  - Add 4 entries to `KEYS` mapping to the new `wr_bible_reader_narration_*` keys
  - Add `'narrationControlVisible'` and `'narrationAutoStart'` to `BOOLEAN_FIELDS`
  - Add `'narrationVolume'` to `NUMBER_FIELDS` (clamped 0-100)
  - Add `'narrationDefaultSpeed'` to `VALID_VALUES` with `['0.75', '1', '1.25', '1.5', '2']` — store as string, consumers parse
  - Add parsing in `readSetting` for the string-enum case already handled; extend the `useState` initializer to read all 4 new keys
- `.claude/rules/11-local-storage-keys.md` — add 4 rows to the Bible Reader table documenting the new keys, their types, and default values
- `frontend/src/hooks/__tests__/useReaderSettings.test.ts` — add tests for the 4 new fields (existing test file if present; create if not)

**Details:**
- `narrationDefaultSpeed` is stored as a string in localStorage and parsed back to a number when the narration channel consumes it. Use `parseFloat` in the consumer (Step 7/17), NOT in `useReaderSettings` — keep the hook's return type as `'0.75' | '1' | '1.25' | '1.5' | '2'` (string literal union).
- Alternatively, store as a narrower typed string and let Step 7 parseFloat it. **Decision: keep as string literal union in the hook** for parity with typeSize/lineHeight/fontFamily enum fields.

**Auth gating:** N/A (settings localStorage-only, same as ambient settings).

**Responsive behavior:** N/A: no UI impact yet — hook only.

**Guardrails (DO NOT):**
- Do NOT create a new top-level `wr_*` key — all 4 must be `wr_bible_reader_narration_*`.
- Do NOT change the existing 8 field names or key names.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useReaderSettings` returns default `narrationControlVisible: true` when unset | unit | Clear localStorage, render hook, assert default |
| `useReaderSettings` returns default `narrationAutoStart: false` | unit | Same pattern |
| `useReaderSettings` returns default `narrationDefaultSpeed: '1'` | unit | Same |
| `useReaderSettings` returns default `narrationVolume: 85` | unit | Same |
| `updateSetting('narrationAutoStart', true)` persists to localStorage | unit | Write, read raw localStorage, assert `'true'` |
| `updateSetting('narrationVolume', 42)` clamps to 0-100 | unit | Write 150, assert stored value is 100 |
| `updateSetting('narrationDefaultSpeed', '1.5')` persists string | unit | Write, assert localStorage value |

**Expected state after completion:**
- [ ] 4 new settings fields exist in `ReaderSettings` with correct types and defaults
- [ ] localStorage keys documented in `11-local-storage-keys.md`
- [ ] 7 new tests added

---

### Step 6: AudioProvider narration state slice and reducer actions

**Objective:** Add the `narration` state slice to `AudioState`, add all 13 narration action types, and implement pure reducer handlers.

**Files to modify:**
- `frontend/src/types/audio.ts` — add `NarrationState` interface, extend `AudioState` to include `narration: NarrationState`, extend `AudioAction` union with all 13 narration actions
- `frontend/src/components/audio/audioReducer.ts` — add reducer cases for each narration action, add `narration` to `initialAudioState`

**Details:**
- `initialAudioState.narration`:
  ```typescript
  narration: {
    currentChapter: null,
    isPlaying: false,
    isBuffering: false,
    isError: false,
    errorMessage: null,
    volume: 85,
    playbackSpeed: 1,
    currentTime: 0,
    duration: 0,
  }
  ```
- Reducer cases (pure — no side effects):
  - `NARRATION_REQUEST { book, chapter }`: `isBuffering: true, isError: false, errorMessage: null, currentChapter: {book, chapter}, currentTime: 0, duration: 0, isPlaying: false`
  - `NARRATION_BUFFERING`: `isBuffering: true, isError: false`
  - `NARRATION_PLAYING`: `isBuffering: false, isPlaying: true, isError: false, errorMessage: null`
  - `NARRATION_PAUSED`: `isPlaying: false`
  - `NARRATION_RESUMED`: `isPlaying: true`
  - `NARRATION_STOPPED`: reset to `{ ...state.narration, currentChapter: null, isPlaying: false, isBuffering: false, currentTime: 0, duration: 0 }` (preserves `volume` and `playbackSpeed`)
  - `NARRATION_SEEK { time }`: `currentTime: time`
  - `NARRATION_TIME_UPDATE { currentTime }`: `currentTime`
  - `NARRATION_DURATION { duration }`: `duration`
  - `NARRATION_SET_SPEED { speed }`: `playbackSpeed: speed`
  - `NARRATION_SET_VOLUME { volume }`: `volume: Math.max(0, Math.min(100, volume))`
  - `NARRATION_ERROR { message }`: `isError: true, errorMessage: message, isBuffering: false, isPlaying: false`
  - `NARRATION_CLEAR_ERROR`: `isError: false, errorMessage: null`
- **Crucially:** narration reducer cases do NOT touch any other state slice. They never affect `activeSounds`, `foregroundContent`, or `readingContext`. This preserves BB-20's ambient invariants (spec req 16).

**Auth gating:** N/A — pure data.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT dispatch any side effects from the reducer (no fetch, no audio element manipulation) — those live in the provider (Step 7).
- Do NOT clear `readingContext` or `activeSounds` from any narration action.
- Do NOT combine narration actions with ambient actions — keep them orthogonal.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Reducer: `NARRATION_REQUEST` sets buffering and currentChapter | unit | Dispatch action to initial state, assert shape |
| Reducer: `NARRATION_PLAYING` clears buffering, sets isPlaying | unit | Same pattern |
| Reducer: `NARRATION_PAUSED` preserves currentChapter and currentTime | unit | Start in playing state, dispatch pause, assert chapter and time preserved |
| Reducer: `NARRATION_STOPPED` clears currentChapter and currentTime, preserves volume/speed | unit | Start with non-default volume/speed, dispatch stop, assert volume/speed preserved |
| Reducer: `NARRATION_SET_VOLUME` clamps to 0-100 | unit | Dispatch with 150, assert stored as 100 |
| Reducer: `NARRATION_ERROR` clears buffering and isPlaying | unit | Start in buffering state, dispatch error, assert flags |
| Reducer: narration actions do NOT affect `activeSounds` | unit | Start with `activeSounds: [fake]`, dispatch each narration action, assert `activeSounds` unchanged |
| Reducer: narration actions do NOT affect `readingContext` | unit | Start with `readingContext: {book:'john',chapter:3}`, dispatch each narration action, assert unchanged |

**Expected state after completion:**
- [ ] `NarrationState` type exported
- [ ] 13 actions added to union
- [ ] `audioReducer` handles all 13 with pure state updates
- [ ] 8 reducer tests passing
- [ ] BB-20 ambient invariants verified via tests

---

### Step 7: AudioProvider — narration `<audio>` element, controls, and side-effect routing

**Objective:** Mount the single long-lived `<audio>` element inside `AudioProvider`, wire event listeners to dispatch narration actions, and expose a `NarrationControls` context.

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx`:
  - Add `narrationAudioRef = useRef<HTMLAudioElement | null>(null)`
  - Add `lastNarrationRequestIdRef = useRef(0)` for rapid-nav cancellation (spec req 35)
  - Add `narrationStallTimerRef = useRef<number | null>(null)` for 10-second stall detection (spec req 47, 48)
  - Add `NarrationControlsContext = createContext<NarrationControls | null>(null)`
  - Implement `play(book, chapter)` — increments `lastNarrationRequestIdRef`, dispatches `NARRATION_REQUEST`, calls `getAudioUrl(book, chapter)`, checks `myId === lastNarrationRequestIdRef.current` before setting `audio.src`, calls `audio.load()` + `audio.play()`, catches errors and dispatches `NARRATION_ERROR` with appropriate messages per spec req 41-46
  - Implement `pause()`, `resume()`, `stop()`, `seekTo(seconds)`, `setPlaybackSpeed(speed)`, `setVolume(volume)` — all manipulate `narrationAudioRef.current` and dispatch corresponding reducer actions
  - Render `<audio ref={narrationAudioRef} preload="none" crossOrigin="anonymous" className="sr-only" aria-hidden="true" />` as a child of the provider JSX (before the `<AudioPill>` render)
  - Attach event listeners via a `useEffect` on mount: `canplay`, `playing`, `pause`, `ended`, `timeupdate`, `durationchange`, `waiting`, `stalled`, `suspend`, `error`
  - `waiting`/`stalled`/`suspend` start the stall timer; `canplay`/`playing`/`timeupdate` clear it
  - `ended` dispatches `NARRATION_STOPPED` (spec req 34 — no auto-advance)
  - `error` dispatches `NARRATION_ERROR { message: 'Audio playback failed. Check your connection and try again.' }` (spec req 46)
  - Provide `NarrationControlsContext.Provider` wrapping children
  - Export `useNarrationControls()` hook: returns controls or throws if used outside provider

**Details:**
- **Volume mapping:** The narration `<audio>` element's `volume` property is `[0, 1]`. Reducer stores `[0, 100]`. `setVolume` writes `audio.volume = v / 100`.
- **Playback speed mapping:** `audio.playbackRate = speed` directly.
- **Seek mapping:** `audio.currentTime = seconds`, dispatch `NARRATION_SEEK`.
- **Initial load of default volume/speed from settings:** In a separate `useEffect` inside `AudioProvider`, read `useReaderSettings` values and apply to the audio element ref on mount. Since `useReaderSettings` is a hook, this creates a circular import risk — **resolution:** read the 4 narration values via direct `localStorage.getItem('wr_bible_reader_narration_*')` inside the `AudioProvider` mount effect. Alternatively, accept the hook and restructure imports. **Decision: direct localStorage read** to avoid circular imports — the provider is the source of truth for the audio element's initial state, and `useReaderSettings` remains a React-consumer hook.
- **Cleanup on unmount:** Detach listeners, `audio.pause()`, set `audio.src = ''`, clear timers.
- **Rapid-nav cancellation:** In `play`, capture `const myId = ++lastNarrationRequestIdRef.current`. After `await getAudioUrl(...)`, check `if (myId !== lastNarrationRequestIdRef.current) return`. This bails out of superseded requests.
- **CORS (CRITICAL — forward-compat with BB-27):** `crossOrigin="anonymous"` MUST be set on the element **before** the first `src` assignment. This is a hard requirement for BB-27 wrapping the element in `MediaElementAudioSourceNode` later — if the element has ever loaded a cross-origin resource without the crossOrigin attribute, it becomes permanently "tainted" and `MediaElementAudioSourceNode` will output silence with no error. This is the one-line BB-26 change that unblocks BB-27's entire auto-ducking feature. FCBH also needs to return `Access-Control-Allow-Origin` headers — verified during Recon Task 3. See the Deep Review Backlog § 4 for full forward-compat analysis.
- **Route change survival:** Because `AudioProvider` sits above `Routes` in `App.tsx`, the `<audio>` element is never unmounted during navigation — the spec's critical requirement is automatically satisfied (spec req 12).

**Auth gating:** None at this layer. BB-26 has no UI-layer auth checks either — narration is fully ungated.

**Responsive behavior:** N/A: no UI impact (element is `sr-only` / hidden).

**Guardrails (DO NOT):**
- Do NOT create a new `<audio>` element per play — reuse the same element (spec req 11, hard rule for iOS).
- Do NOT mount the `<audio>` element inside the reader component (spec req 12).
- Do NOT dispatch any side effects through `enhancedDispatch` for narration actions — handle them in dedicated control methods.
- Do NOT touch `foregroundContent`, `activeSounds`, or `readingContext` from narration code paths.
- Do NOT call `audio.load()` with an empty src (throws in some browsers).
- Do NOT skip the `myId === lastNarrationRequestIdRef.current` check — it's the rapid-nav cancellation.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Provider mounts exactly one `<audio>` element for narration | integration | Render `<AudioProvider>`, assert `document.querySelectorAll('audio').length === 1` (accounting for any other audio elements in the tree — filter by data attr) |
| `play('john', 3)` dispatches `NARRATION_REQUEST` and starts loading | integration | Mock `fcbhClient.getAudioUrl`, assert state transitions |
| Rapid `play` calls — only last chapter's URL is set on audio.src | integration | Call play('john', 3), then play('john', 4), then play('john', 5) within same tick; mock resolves in reverse order; assert final audio.src corresponds to John 5 |
| `pause()` sets `isPlaying: false` and preserves `currentChapter` | integration | |
| `stop()` clears currentChapter, currentTime, and sets audio.src to empty | integration | |
| `seekTo(30)` sets `audio.currentTime === 30` and dispatches `NARRATION_SEEK` | integration | |
| `setPlaybackSpeed(1.5)` sets `audio.playbackRate === 1.5` | integration | |
| `setVolume(50)` sets `audio.volume === 0.5` | integration | |
| `stalled` event starts a 10-second timer; if not cleared, fires `NARRATION_ERROR` with slow-connection message | integration | Use fake timers; fire stalled event; advance 10s; assert error dispatched with exact message "Connection is slow. Try again when you have a better connection." |
| `stalled` event then `canplay` within 10s does NOT fire error | integration | Fire stalled, advance 5s, fire canplay, advance another 10s, assert no error dispatched |
| `ended` event dispatches `NARRATION_STOPPED` with no auto-advance | integration | Fire ended event, assert state reset and no new request initiated |
| `error` event dispatches `NARRATION_ERROR` with playback-failed message | integration | Fire error event, assert error state |
| `FCBHNotFoundError` from getAudioUrl dispatches NARRATION_ERROR with "This chapter's audio isn't available right now" | integration | Mock fcbh throw, assert error message text |
| `FCBHRateLimitError` dispatches "Too many audio requests. Try again in a moment." | integration | Mock fcbh throw, assert error message text |
| `FCBHNetworkError` dispatches "Connection problem. Check your network and try again." | integration | Mock fcbh throw, assert error message text |
| Narration playback survives a route change | integration | Use MemoryRouter, play, navigate, assert `audio.paused === false` still |
| Starting narration does NOT stop ambient | integration | Set up activeSounds with a fake sound, play narration, assert activeSounds still present |
| Starting ambient does NOT stop narration | integration | Start narration, dispatch ADD_SOUND, assert narration state unchanged |

**Expected state after completion:**
- [ ] Single `<audio>` element owned by `AudioProvider`
- [ ] `useNarrationControls()` hook exposed
- [ ] 17 integration tests passing
- [ ] BB-20 ambient audio regression: zero test failures

---

### Step 8: Media session narration priority

**Objective:** Update the media session metadata and action handlers so narration takes priority when both channels play, and the play/pause/seek handlers drive narration when it's active.

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — extend the existing media session `useEffect` (lines 189-228)

**Details:**
- New metadata priority order (highest wins):
  1. **Narration active** (`state.narration.currentChapter !== null && (state.narration.isPlaying || state.narration.isBuffering)`):
     - Title: `` `${bookName} ${chapter}` `` (use `getBookBySlug(book)?.name ?? book` for the human-readable name)
     - Artist: `'Audio Bible · WEB translation'`
     - Album: `'Worship Room'`
     - Artwork: single 192×192 entry for `/icons/bible-192.png` (or reuse existing app artwork — decide during execution based on what's already in `public/icons/`)
  2. Existing foreground content (unchanged)
  3. Existing reading context + ambient (BB-20, unchanged)
  4. Existing scene name (unchanged)
  5. Nothing active → clear metadata
- Action handlers (override when narration is the primary):
  - `play`: if narration is the top priority AND `state.narration.isPlaying === false`, call `narrationControls.resume()`; else fall through to existing `PLAY_ALL`
  - `pause`: if narration is top priority, call `narrationControls.pause()`; else existing
  - `seekforward`: if narration is top priority, call `narrationControls.seekTo(currentTime + 15)` clamped to duration
  - `seekbackward`: if narration is top priority, call `narrationControls.seekTo(currentTime - 15)` clamped to 0
  - `previoustrack` / `nexttrack`: disabled in BB-26 (spec req 40) — explicitly set handler to `null`
- Because `navigator.mediaSession.setActionHandler` persists across calls, re-register handlers inside the same `useEffect` that updates metadata so the closures capture fresh state.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT break BB-20's ambient media session metadata — ensure ambient-only playback still shows the ambient title (spec req 38).
- Do NOT register `nexttrack` for narration in BB-26 (BB-29 will add it).
- Do NOT skip artwork entirely — use a fallback icon.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Media session metadata shows narration title when narration is playing | integration | Start narration, assert `navigator.mediaSession.metadata.title === 'John 3'`, artist matches spec |
| Media session shows narration metadata when both narration and ambient play | integration | Play both, assert narration metadata wins |
| Media session shows ambient metadata when only ambient plays (BB-20 regression) | integration | Start ambient only, assert BB-20 metadata unchanged |
| Media session `pause` handler pauses narration when narration is priority | integration | Spy on narration controls, invoke handler, assert pause called |
| Media session `seekforward` adds 15s clamped to duration | integration | Set currentTime=290, duration=300, invoke handler, assert seekTo(300) |
| Media session `seekbackward` subtracts 15s clamped to 0 | integration | Set currentTime=5, invoke handler, assert seekTo(0) |
| Media session `nexttrack` handler is null for narration | integration | Assert `navigator.mediaSession.setActionHandler('nexttrack', null)` was called (or equivalent) |

**Expected state after completion:**
- [ ] Media session priority working per spec req 36-40
- [ ] BB-20 ambient media session unchanged when narration inactive
- [ ] 7 integration tests passing

---

### Step 9: Error-state copy constants and retry helper

**Objective:** Centralize the user-facing error messages and wire the retry flow.

**Files to create:**
- `frontend/src/lib/audio/fcbh/errorMessages.ts` — exports a `narrationErrorMessageFor(error: unknown): string` function that branches on error class and returns the exact copy from spec req 41-46.

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — the `play()` method's catch block calls `narrationErrorMessageFor(err)` to build the dispatched error message

**Details:**
- Error message map (exact copy from spec):
  - `FCBHNetworkError` → `"Connection problem. Check your network and try again."`
  - `FCBHNotFoundError` → `"This chapter's audio isn't available right now."`
  - `FCBHRateLimitError` → `"Too many audio requests. Try again in a moment."`
  - `FCBHApiError` / unknown → `"Audio playback failed. Check your connection and try again."`
  - Stall timeout → `"Connection is slow. Try again when you have a better connection."` (this one is dispatched from the stall-timer handler in Step 7, not via `narrationErrorMessageFor`)
- Retry: the picker's retry button re-calls `play(book, chapter)` with the current chapter. No automatic retry. For rate limit errors, the retry button is disabled until `Date.now() >= rateLimitResetAt` (set from `Retry-After` header via a `narrationRetryAtRef` in the provider — add to `NarrationState` if needed). **Decision:** store `retryAfterSeconds` as an optional field on `NarrationState` by extending `NARRATION_ERROR` payload:
  ```typescript
  | { type: 'NARRATION_ERROR'; payload: { message: string; retryAfterSeconds?: number | null } }
  ```
  And add `retryAfterSeconds: number | null` to `NarrationState`. Update Step 6 reducer case to read this payload.

**Refinement to Step 6:** Add `retryAfterSeconds: number | null` to `NarrationState` with default `null`. Reducer case for `NARRATION_ERROR` sets it; `NARRATION_CLEAR_ERROR` clears it.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT invent new error copy — use the exact wording from spec req 41-48.
- Do NOT auto-retry on any error (spec req 49).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `narrationErrorMessageFor(new FCBHNotFoundError(...))` returns exact spec text | unit | |
| `narrationErrorMessageFor(new FCBHRateLimitError(..., 60))` returns exact spec text | unit | |
| `narrationErrorMessageFor(new FCBHNetworkError(...))` returns exact spec text | unit | |
| `narrationErrorMessageFor(new Error('bogus'))` returns the generic playback failed message | unit | |

**Expected state after completion:**
- [ ] Error copy centralized and tested
- [ ] `retryAfterSeconds` propagated through reducer payload for rate-limit handling

---

### Step 10: `NarrationControl` component (reader chrome icon)

**Objective:** Build the small icon that lives in the reader action bar with 4 visual states.

**Files to create:**
- `frontend/src/components/bible/reader/NarrationControl.tsx`
- `frontend/src/components/bible/reader/__tests__/NarrationControl.test.tsx`

**Props:**
```typescript
interface NarrationControlProps {
  isOpen: boolean            // picker open state (for aria-expanded)
  onToggle: () => void       // parent controls picker open/close
  buttonRef: React.RefObject<HTMLButtonElement>
  reducedMotion: boolean
}
```

**Details:**
- Component reads `useAudioState().narration` to determine visual state:
  - **Not playing + no error:** `Headphones` icon from `lucide-react`, `text-white/70`, label "Audio narration (off)"
  - **Buffering:** `Loader2` icon with `animate-spin` (respect `reducedMotion` — render static `Headphones` with opacity 0.6 instead of spinner)
  - **Playing:** `Headphones` icon, `text-white`, aria-label "Audio narration (playing)"
  - **Error:** `AlertCircle` icon, `text-white/60`, aria-label "Audio narration (error)"
- Class: `ICON_BTN` from `ReaderChrome.tsx` line 7 — reuse the exact constant OR import it (extract to a module constant if not yet exported).
- `aria-expanded={isOpen}`, `aria-haspopup="dialog"`, `aria-label` dynamic per state
- Tap target 44×44 via `min-h-[44px] min-w-[44px]` (inherited from `ICON_BTN`)
- Clicking fires `onToggle()` regardless of state (even error — picker opens with the error card per spec req 19)

**Auth gating:** None. The icon is visible to all users and behaves identically regardless of authentication state.

**Responsive behavior (UI step):**
- Desktop (1440px): 44×44 icon inline in reader chrome action bar
- Tablet (768px): Same — icon position and size unchanged
- Mobile (375px): Same — 44×44 meets the tap-target floor

**Inline position expectations:**
- Must sit on the same y-axis as Aa, VolumeX (BB-20), Minimize2, and BookOpen icons (Step 14 integrates into ReaderChrome). Tolerance ±2px across all breakpoints.

**Guardrails (DO NOT):**
- Do NOT use `animate-glow-pulse` (deprecated).
- Do NOT render the picker itself from this component — the picker is a sibling, parent owns the `isOpen` state.
- Do NOT add any auth checks — BB-26 is ungated.
- Do NOT read or write localStorage from this component.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders `Headphones` icon in idle state | unit | Mock narration state `{ currentChapter: null, isPlaying: false, isError: false, isBuffering: false }`, assert icon rendered |
| Renders `Loader2` with spin in buffering state | unit | Mock `isBuffering: true`, assert presence |
| Renders `Loader2` WITHOUT spin when `reducedMotion: true` | unit | Same, with prop, assert no `animate-spin` class |
| Renders `Headphones` filled in playing state | unit | Mock `isPlaying: true`, assert classes |
| Renders `AlertCircle` in error state | unit | Mock `isError: true`, assert icon |
| `onToggle` called on click | unit | userEvent.click, assert handler called |
| `onToggle` called on click even in error state | unit | Mock error, click, assert handler |
| `aria-expanded` reflects `isOpen` prop | unit | Render with true/false, assert |
| `aria-label` changes per state | unit | Test all 4 states |

**Expected state after completion:**
- [ ] `NarrationControl` component exported
- [ ] 9 unit tests passing
- [ ] Not yet mounted in reader chrome (Step 14)

---

### Step 11: `NarrationCurrentlyPlayingIndicator` chip

**Objective:** Build the chip that appears when the currently-playing chapter differs from the currently-viewed chapter.

**Files to create:**
- `frontend/src/components/bible/reader/NarrationCurrentlyPlayingIndicator.tsx`
- `frontend/src/components/bible/reader/__tests__/NarrationCurrentlyPlayingIndicator.test.tsx`

**Props:**
```typescript
interface NarrationCurrentlyPlayingIndicatorProps {
  viewedBook: string       // slug
  viewedChapter: number
  onNavigateToPlaying: (book: string, chapter: number) => void
}
```

**Details:**
- Reads `useAudioState().narration.currentChapter`.
- Returns `null` if `currentChapter === null` OR `currentChapter.book === viewedBook && currentChapter.chapter === viewedChapter`.
- Otherwise renders a button:
  ```
  <button
    onClick={() => onNavigateToPlaying(currentChapter.book, currentChapter.chapter)}
    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-primary/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.12] transition-colors min-h-[44px]"
    aria-label={`Return to currently playing chapter: ${bookName} ${chapter}`}
  >
    <Volume2 className="h-3 w-3 text-primary" aria-hidden="true" />
    Now playing: {bookName} {chapter}
  </button>
  ```
- `bookName` derived via `getBookBySlug(currentChapter.book)?.name ?? currentChapter.book`
- Minimum tap target 44px (spec req 178): `min-h-[44px]` — but the chip visually looks shorter; use `min-h-[44px]` with visible padding of `py-1.5` (6px) so effective height is ~44px while the visible chip body is `~28px`. Alternatively, use a wrapper with `min-h-[44px]` flex-centering a shorter visible chip. **Decision: wrapper approach.** Outer `div` with `min-h-[44px] flex items-center`; inner visible chip is `py-1.5`.
- **Low-confidence note (not [UNVERIFIED], but worth verifying):** No competitor app has an equivalent "now playing while scrolled away" chip (their entry models eliminate the gap). The chip class values are derived from existing Worship Room chip patterns (`bg-white/[0.08]` tinted background + `border-primary/40` active accent). Verify visual weight and position via `/verify-with-playwright` after Step 14 integration.

**Auth gating:** None — chip visible to all.

**Responsive behavior (UI step):**
- Desktop (1440px): Inline in the reader action bar (integrated in Step 14). Shares y with action bar icons (±5px).
- Tablet (768px): Same inline placement
- Mobile (375px): Docked BELOW the reader action bar as a full-width row (explicit layout change, not a wrap bug). Step 14 implements the breakpoint switch.

**Inline position expectations:**
- At ≥768px: chip must share y with action bar icons ±5px. At <768px: chip is on its own row below (intentional).

**Guardrails (DO NOT):**
- Do NOT render when the chapter matches — return `null`.
- Do NOT use Lora serif (this is UI text, not scripture).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns null when currentChapter is null | unit | Mock no narration, assert no render |
| Returns null when playing chapter matches viewed chapter | unit | Same book+chapter, assert no render |
| Renders chip text "Now playing: John 3" when viewing John 4 | unit | Mock playing John 3 + prop John 4, assert text |
| Click calls `onNavigateToPlaying` with playing book+chapter | unit | userEvent.click, assert handler called with correct args |
| `aria-label` includes the book and chapter | unit | |
| Uses book display name from `getBookBySlug` | unit | Playing `'1-samuel'` chapter 5, assert renders "Now playing: 1 Samuel 5" |

**Expected state after completion:**
- [ ] `NarrationCurrentlyPlayingIndicator` component exported
- [ ] 6 unit tests passing
- [ ] Not yet mounted (Step 14)

---

### Step 12: `NarrationPicker` component

**Objective:** Build the full picker UI (bottom sheet mobile, popover desktop) with all controls, error states, and focus trap.

**Files to create:**
- `frontend/src/components/bible/reader/NarrationPicker.tsx`
- `frontend/src/components/bible/reader/__tests__/NarrationPicker.test.tsx`

**Props:**
```typescript
interface NarrationPickerProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement>
  viewedBook: string         // slug — the book the user is currently reading
  viewedChapter: number      // the chapter the user is currently reading
}
```

**Details:**

**Layout (top to bottom, per spec req 22):**
1. Header row: "Listen" heading + X close button
2. Current chapter label — reads `state.narration.currentChapter` if set, else `{viewedBook} {viewedChapter}` — format: `"John 3"`
3. Error card (conditional) — shown when `state.narration.isError`. Retry button re-calls `controls.play(...)`. Rate-limited: retry button disabled with a countdown until `retryAfterSeconds` elapsed (use `setInterval` + local state).
4. Scrubber row: `M:SS / M:SS` labels + range slider (HTML5 `<input type="range">`). Fires `NARRATION_SEEK` on change. Keyboard arrows seek by 5s (custom keydown handler).
5. Control row: `SkipBack` 15s button, big play/pause button (56px), `SkipForward` 15s button, speed cycle button
6. Narration volume slider (reuse `VolumeSlider` from `frontend/src/components/audio/VolumeSlider.tsx` with narration-specific aria label — OR a lightweight local range input if VolumeSlider is too coupled to ambient state; decide at execution)
7. "Set a sleep timer" link — disabled with "Coming soon" label per decision table
8. "Stop playback" text button

**Play button handler (no auth check — narration is ungated, same as reading the text):**
```typescript
function handlePlayPause() {
  if (!narration.isPlaying && !narration.currentChapter) {
    // Fresh play — start from the viewed chapter
    controls.play(viewedBook, viewedChapter)
  } else if (narration.isPlaying) {
    controls.pause()
  } else {
    controls.resume()
  }
}
```

**Speed cycle:** onClick advances `[0.75, 1, 1.25, 1.5, 2]` round-robin via `controls.setPlaybackSpeed`. Displayed text: `"${speed}x"` (e.g., `"1x"`, `"1.5x"`).

**Skip buttons:** `controls.seekTo(Math.max(0, currentTime - 15))` and `Math.min(duration, currentTime + 15)`.

**Scrubber keyboard:** onKeyDown `ArrowLeft` → seek -5s, `ArrowRight` → +5s. Native range input already handles arrow keys but the step size varies; **set `step="1"` and handle arrows ourselves** OR accept native behavior. **Decision: set `step={5}` for a native 5-second step**, which satisfies spec req 26. Drag-to-seek works via the native `onChange`.

**M:SS formatter:** Small helper `formatMss(s: number): string` → `"${mm}:${ss.padStart(2,'0')}"`.

**Focus trap:** Use `useFocusTrap()` hook (09-design-system.md frontend standards) — stores previously focused, traps tab cycling, restores on close.

**Close on:**
- Backdrop click (mobile full-width backdrop)
- Click outside (desktop, anchored popover)
- Escape key (focus trap handles this)
- X button

**Mutual exclusion with AmbientAudioPicker:** handled in Step 14 — BB-26 Picker does not know about Ambient Picker; the reader page owns both `open` states and enforces exclusion on toggle.

**Responsive:**
- Mobile (< 1024px): `fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[65vh] animate-bottom-sheet-slide-in` with backdrop `fixed inset-0 bg-black/40`
- Tablet (640-1023px): Same mobile pattern but `max-w-[520px] mx-auto`
- Desktop (≥1024px): `fixed lg:right-20 lg:top-16 lg:w-[360px] rounded-2xl` with click-outside handler (no backdrop)

**Styling:** Inline `style={PANEL_STYLE}` where `PANEL_STYLE` matches `TypographySheet` — hoist to a shared constant in Step 12 (new file `frontend/src/components/bible/reader/pickerPanelStyle.ts` exporting `PANEL_STYLE`):
```typescript
export const PICKER_PANEL_STYLE = {
  background: 'rgba(15, 10, 30, 0.95)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.10)',
} as const
```
(And refactor `TypographySheet` + `AmbientAudioPicker` to import the shared constant — no, do NOT refactor in this step, just use the same inline style. Refactoring BB-20 risks breaking it.)

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to "Listen" heading
- All buttons have `aria-label`
- Play button uses `aria-pressed` to reflect playing state
- Scrubber `aria-label="Seek"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Volume slider `aria-label="Narration volume"`, `aria-valuetext` with percentage
- `aria-live="polite"` region announces play/pause state changes and error messages
- Min tap target 44px on every interactive element

**Auth gating:** None. The picker, all controls, and playback work identically for logged-out and logged-in users (BB-26 is a reader-preferences feature, not a personal-data feature).

**Responsive behavior (UI step):**
- Desktop (1440px): Popover anchored below icon, 360px wide
- Tablet (768px): Full-width bottom sheet, `max-w-[520px]` centered
- Mobile (375px): Full-width bottom sheet, `max-h-[65vh]`, swipe-down dismiss (use existing bottom-sheet swipe pattern if present; otherwise backdrop click is sufficient — swipe-to-dismiss is nice-to-have but not P0)

**Inline position expectations:**
- Control row: `SkipBack`, Play, `SkipForward`, Speed pill must share y ±5px at 768px and 1440px. At <360px the speed pill may wrap below (acceptable).
- Scrubber row: current-time label, range input, total-time label share y ±2px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT use `animate-glow-pulse` (deprecated).
- Do NOT use `FrostedCard` for the panel — use `PICKER_PANEL_STYLE` to match `AmbientAudioPicker` and `TypographySheet`.
- Do NOT render the narration `<audio>` element here — it lives in `AudioProvider` (Step 7).
- Do NOT add an auth check to the play button — BB-26 is ungated (reading Psalm 23 is ungated; hearing Psalm 23 should be too).
- Do NOT auto-retry on error — user taps retry explicitly.
- Do NOT persist narration volume inside the picker — `setVolume` writes through to localStorage via the same pattern as ambient.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders nothing when `isOpen: false` | unit | |
| Renders heading "Listen" and chapter label when open | unit | |
| Play button calls `controls.play(viewedBook, viewedChapter)` when idle | unit | Mock controls, click, assert |
| Play button works identically for logged-out users | integration | Mock `isAuthenticated: false`, click, assert `controls.play` called (no auth modal, no bail) |
| Play button calls `controls.pause()` when playing | unit | Mock narration playing, click, assert |
| Play button calls `controls.resume()` when paused with currentChapter set | unit | |
| Skip forward button adds 15s clamped to duration | unit | Mock currentTime=290, duration=300, click, assert `seekTo(300)` |
| Skip back button subtracts 15s clamped to 0 | unit | |
| Speed cycle button advances 1x → 1.25x | unit | Initial speed 1, click, assert `setPlaybackSpeed(1.25)` |
| Speed cycle wraps from 2x back to 0.75x | unit | |
| Scrubber onChange dispatches `NARRATION_SEEK` | integration | |
| Scrubber keyboard Left/Right seeks by 5s | unit | Fire keydown, assert seekTo |
| Volume slider calls `setVolume` | unit | |
| Error card shown when `state.narration.isError === true` | unit | |
| Error card retry button calls `play(viewedBook, viewedChapter)` | unit | |
| Rate limit retry button disabled until retryAfterSeconds elapsed | integration | Fake timers, assert disabled initially, advance, assert enabled |
| Close on X button calls `onClose` | unit | |
| Close on Escape key calls `onClose` | integration | |
| Close on backdrop click calls `onClose` (mobile) | integration | |
| Focus trap active when open | integration | Use `useFocusTrap` assertion pattern from existing tests |
| Picker renders at `lg:w-[360px]` on desktop | unit | Check applied class |
| `aria-live="polite"` region announces play/pause state changes | integration | |
| Min tap targets 44px on all buttons | unit | Query all buttons, assert `min-h-[44px]` class present |
| "Set a sleep timer" link disabled with "Coming soon" label | unit | Assert `disabled` attribute and text |
| "Stop playback" button calls `controls.stop()` | unit | |

**Expected state after completion:**
- [ ] `NarrationPicker` component exported
- [ ] 25 tests passing
- [ ] Not yet mounted (Step 14)

---

### Step 13: Mount narration components into ReaderChrome + BibleReader

**Objective:** Wire `NarrationControl`, `NarrationCurrentlyPlayingIndicator`, and `NarrationPicker` into the Bible reader page with mutual-exclusion against the BB-20 ambient picker.

**Files to modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx`:
  - Add props: `narrationControlVisible: boolean`, `isNarrationPickerOpen: boolean`, `onNarrationToggle: () => void`, `narrationButtonRef: React.RefObject<HTMLButtonElement>`, `reducedMotion: boolean`
  - Render `<NarrationControl>` between the existing ambient icon (VolumeX) and the Minimize2 (focus) icon. Only render when `narrationControlVisible === true`.
  - Render `<NarrationCurrentlyPlayingIndicator>` inline after the icon row at ≥768px, or as a separate row at <768px (use Tailwind responsive classes).
- `frontend/src/pages/BibleReader.tsx`:
  - Import `NarrationPicker`, add state `narrationPickerOpen`, `narrationButtonRef = useRef<HTMLButtonElement>(null)`
  - Wire settings: `const { settings } = useReaderSettings()` — pass `settings.narrationControlVisible` to ReaderChrome
  - Add `onNarrationToggle`:
    ```typescript
    const onNarrationToggle = useCallback(() => {
      setNarrationPickerOpen((prev) => {
        const next = !prev
        if (next) setAmbientPickerOpen(false)  // mutual exclusion
        return next
      })
    }, [])
    ```
  - Symmetric update to the existing ambient `onAudioToggle`: when opening the ambient picker, close the narration picker (`setNarrationPickerOpen(false)`).
  - Render `<NarrationPicker isOpen={narrationPickerOpen} onClose={() => setNarrationPickerOpen(false)} anchorRef={narrationButtonRef} viewedBook={book} viewedChapter={chapter} />` as a sibling of the ambient picker in the JSX tree.
  - Pass `viewedBook={book}` and `viewedChapter={chapter}` to `NarrationCurrentlyPlayingIndicator` via ReaderChrome props.
  - Implement `onNavigateToPlaying(book, chapter)` handler in BibleReader that navigates via `useNavigate` to `/bible/${book}/${chapter}`.
  - Close narration picker on route change (reset `narrationPickerOpen` in the existing chapter-change effect at lines 95-97).

**Details:**
- **Mutual exclusion:** Both pickers' toggle functions check the other's state and close it. This satisfies spec req 29.
- **Indicator placement at <768px:** Use Tailwind `hidden md:inline-flex` on the inline version and `flex md:hidden` on a separate mobile row that wraps below the icon row.
- **Hiding NarrationControl when `narrationControlVisible === false`:** ReaderChrome conditional-renders the icon.

**Auth gating:** None. The icon, picker, chip, and all interactions are ungated. BB-26 introduces zero new auth gates.

**Responsive behavior (UI step):**
- Desktop (1440px): Narration icon between ambient and focus icons; picker as 360px popover anchored below; indicator chip inline with action bar
- Tablet (768px): Same inline layout; picker as 520px centered bottom sheet
- Mobile (375px): Same icon placement; picker as full-width bottom sheet; indicator chip on its own row below the action bar

**Inline position expectations:**
- Aa, VolumeX, Headphones, Minimize2, BookOpen share y ±2px at all breakpoints (reader action bar row)
- Indicator chip shares y with action bar icons at ≥768px; moves below at <768px (explicit breakpoint layout change)

**Guardrails (DO NOT):**
- Do NOT reorder existing ReaderChrome icons.
- Do NOT merge NarrationControl with the BB-20 ambient control.
- Do NOT open both pickers simultaneously.
- Do NOT leave the narration picker open after navigating to a different chapter (close it in the chapter-change effect).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Opening narration picker closes ambient picker | integration | Open ambient, then click narration, assert ambient closed |
| Opening ambient picker closes narration picker | integration | Symmetric |
| NarrationControl hidden when `narrationControlVisible === false` | integration | Set setting false, render, assert icon not in DOM |
| NarrationControl visible when `narrationControlVisible === true` | integration | |
| Clicking indicator chip navigates to the currently-playing chapter | integration | Start narration John 3, navigate reader to John 4, click chip, assert URL `/bible/john/3` |
| Navigating chapters keeps narration playing but closes the picker | integration | Open picker, navigate, assert picker closed, narration still playing |
| Action bar icons all share y ±2px (1440px) | e2e / integration | Query bounding boxes, assert |

**Expected state after completion:**
- [ ] Narration control + picker + indicator mounted in reader
- [ ] Mutual exclusion enforced
- [ ] 7 integration tests passing

---

### Step 14: Audio narration section in TypographySheet settings panel

**Objective:** Add a new "Audio narration" section to the reader settings panel with 3 controls (visibility toggle, auto-start toggle, default speed dropdown).

**Files to modify:**
- `frontend/src/components/bible/reader/TypographySheet.tsx` — add a new section (below the existing "Background sound" BB-20 section, if present) titled "Audio narration" with:
  1. Toggle: "Show narration control in reader" bound to `settings.narrationControlVisible`
  2. Toggle: "Auto-play narration when opening a chapter" bound to `settings.narrationAutoStart`
  3. Dropdown (native `<select>`): "Default playback speed" with options `0.75x | 1x | 1.25x | 1.5x | 2x` bound to `settings.narrationDefaultSpeed`
- `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx` — add tests for the new section

**Details:**
- Follow the exact styling pattern of the existing BB-20 "Background sound" section (spacing, label typography, toggle component).
- Use the same toggle component BB-20 uses (likely a headless toggle or the existing `Switch` primitive — confirm during execution by reading `TypographySheet.tsx`).
- Dropdown: native `<select>` styled with `bg-white/[0.08] border border-white/[0.12] rounded-lg px-3 py-2 text-white` for consistency.
- Each control calls `onUpdate('narrationControlVisible' | 'narrationAutoStart' | 'narrationDefaultSpeed', value)`.
- Section heading: `text-sm font-semibold text-white/80 uppercase tracking-wide` (match existing sections).
- Non-negotiable: `narrationAutoStart` default MUST be `false` (spec req 51).

**Auth gating:** None — settings are localStorage-only, following the BB-4 reader-preferences model (theme, font, line height, etc. are not auth-gated).

**Responsive behavior (UI step):**
- Desktop (1440px): Section sits in the side panel (`lg:w-[320px]`)
- Tablet (768px): Bottom sheet, full content visible
- Mobile (375px): Bottom sheet, may need vertical scroll if all sections together exceed 65vh (TypographySheet already handles this with `max-h-[85vh] overflow-y-auto`)

**Inline position expectations:** Section controls stack vertically — N/A for inline row verification.

**Guardrails (DO NOT):**
- Do NOT change `narrationAutoStart` default from `false` (spec req 51).
- Do NOT remove or reorder the existing 4 typography sections or the BB-20 "Background sound" section.
- Do NOT add auth gate — settings are localStorage-only.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Section "Audio narration" renders with 3 controls | unit | |
| Show-narration toggle reflects `settings.narrationControlVisible` | unit | |
| Auto-start toggle default state is off (false) | unit | Render with defaults, assert |
| Toggling show-narration calls `onUpdate('narrationControlVisible', false)` | unit | |
| Toggling auto-start calls `onUpdate('narrationAutoStart', true)` | unit | |
| Speed dropdown renders 5 options with correct values | unit | Query options, assert text and values |
| Selecting 1.5x calls `onUpdate('narrationDefaultSpeed', '1.5')` | unit | |

**Expected state after completion:**
- [ ] Audio narration section rendered in TypographySheet
- [ ] 7 new unit tests passing

---

### Step 15: Auto-start narration on chapter open

**Objective:** When `narrationAutoStart` is enabled, start narration for the current chapter automatically on mount/chapter-change.

**Files to create:**
- `frontend/src/hooks/useNarrationAutoStart.ts` — new hook (mirror `useReaderAudioAutoStart` pattern)
- `frontend/src/hooks/__tests__/useNarrationAutoStart.test.ts`

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx` — call the hook with the current book/chapter

**Details:**
- Hook signature: `useNarrationAutoStart(book: string, chapter: number)`
- Reads `useReaderSettings().settings.narrationAutoStart`
- Reads `useNarrationControls()` for `play()`
- `useEffect(() => { if (autoStart) { controls.setPlaybackSpeed(parseFloat(settings.narrationDefaultSpeed)); controls.play(book, chapter) } }, [book, chapter, autoStart, settings.narrationDefaultSpeed])`
- **Rapid-nav supersession** is already handled in `AudioProvider.play()` via `lastNarrationRequestIdRef` (Step 7). The hook simply fires `play` on every chapter change — the provider's cancellation logic ensures only the most recent wins.
- Applies the default playback speed from `settings.narrationDefaultSpeed` (parsed via `parseFloat`) BEFORE calling `play`.
- **Note (2026-04-10 revision):** the earlier draft of this hook bailed on `!isAuthenticated`. That check was removed because BB-26 introduces no auth gates — a logged-out user who enables auto-start in the reader settings should experience auto-start. Auto-start is a reader preference, not a personal-data write.

**Auth gating:** None. Auto-start fires for any user who has enabled the setting, regardless of authentication state.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT start narration if `autoStart === false`.
- Do NOT add an auth check — BB-26 is ungated.
- Do NOT call `play` on every render — depend on `[book, chapter, autoStart, settings.narrationDefaultSpeed]` only.
- Do NOT implement in-hook cancellation logic — trust the provider's `lastNarrationRequestIdRef`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Does nothing when `autoStart === false` | unit | Mock setting false, render hook, assert `play` not called |
| Calls `play(book, chapter)` when autoStart true | unit | Mock setting true, render, assert `play` called once |
| Fires identically for logged-out users | unit | Mock `isAuthenticated: false` AND autoStart true, assert `play` called (no auth bail) |
| Calls `setPlaybackSpeed` with parsed default speed before `play` | unit | Mock `narrationDefaultSpeed: '1.5'`, assert order: setSpeed then play |
| Re-fires `play` when chapter changes | unit | Re-render with new chapter, assert play called twice with correct args |
| Rapid chapter changes: 3 sequential plays (supersession handled by provider, not hook) | integration | Render with john/3, then john/4, then john/5 rapidly, assert play called 3 times (provider handles cancellation) |

**Expected state after completion:**
- [ ] `useNarrationAutoStart` hook created and tested (6 tests)
- [ ] Mounted in BibleReader page

---

### Step 16: Focus mode regression verification and documentation

**Objective:** Verify that BB-5 focus mode does NOT stop narration and that the narration control fades/reveals with other chrome icons. No code changes expected — this step is a verification pass + adding one regression test.

**Files to create:**
- `frontend/src/components/bible/reader/__tests__/narrationFocusMode.test.tsx` — integration test verifying focus mode + narration coexistence

**Details:**
- Test setup: render `BibleReader` page with focus mode hook mocked to controlled `chromeOpacity` state.
- Assertions:
  1. Starting narration → setting chrome to opacity 0 → narration state remains `isPlaying: true`
  2. NarrationControl icon has `opacity: 0` + `pointer-events: none` (inherited from chrome)
  3. Triggering user activity (fire `mousemove` event) → chrome restores → narration state still playing
- If the test reveals that the narration picker or indicator does NOT correctly follow the fade, document the deviation and add a fix in this step.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT change the focus mode hook to treat narration specially — the chrome fade applies uniformly.
- Do NOT unmount the narration control during focus mode — it must stay in the DOM and fade via opacity.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Entering focus mode preserves narration `isPlaying: true` | integration | |
| NarrationControl receives `opacity: 0` when chrome fades | integration | |
| User activity re-reveals chrome and narration is still playing | integration | |

**Expected state after completion:**
- [ ] 3 focus mode regression tests passing
- [ ] No functional changes required (or minimal fixes if any deviation found)

---

### Step 17: Rule 11 update, `.env.example`, and BB-26 rule-file cross-references

**Objective:** Document all new localStorage keys, environment variables, and ensure `.claude/rules/` files reference BB-26 where appropriate.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — add 4 narration key rows to the "Bible Reader" table (already planned in Step 5; verify done here)
- `frontend/.env.example` — add `VITE_FCBH_API_BASE` and `VITE_FCBH_API_KEY` (already planned in Step 4; verify done here)

**Details:**
- Verify Step 5 updated the rule file with the 4 keys and their descriptions.
- Verify Step 4 added the 2 env vars with placeholder values.
- Scan `CLAUDE.md` for any need to add BB-26 to the feature summary. **Decision:** BB-26 is a bible-redesign wave spec; CLAUDE.md is updated at wave completion, not per-spec. Do NOT update CLAUDE.md in this step.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT commit a real FCBH API key.
- Do NOT modify CLAUDE.md (wave-completion artifact).

**Test specifications:** N/A — documentation only.

**Expected state after completion:**
- [ ] `11-local-storage-keys.md` shows 4 new keys
- [ ] `.env.example` shows both env vars

---

### Step 18: Manual iOS device test checklist + build health verification

**Objective:** Allocate explicit real-iPhone testing time and run the full build/lint/test suite before declaring done.

**Files to create:**
- `_plans/recon/bb26-ios-test-checklist.md` — checklist file for the human tester

**Details:**

**iOS Safari device test checklist (physical iPhone required):**

- [ ] Open `/bible/john/3` on iPhone, tap narration icon, verify picker opens as bottom sheet
- [ ] Tap play button — verify narration starts (may need to tap twice due to iOS autoplay policy; document if so)
- [ ] Lock the phone — verify media session controls appear on lock screen with "John 3" title
- [ ] Unlock, verify playback continued
- [ ] Swipe to background (home button) — verify audio continues
- [ ] Receive a phone call — verify audio pauses; hang up — verify UI reflects paused state
- [ ] Navigate to `/bible/john/4` mid-playback — verify indicator chip appears "Now playing: John 3", tap chip, verify navigation back
- [ ] Toggle airplane mode mid-playback — verify either silent resume within 10s OR slow-connection error
- [ ] Open AmbientAudioPicker (BB-20) while NarrationPicker open — verify narration picker closes
- [ ] Verify both channels play simultaneously (narration + ambient rain)
- [ ] Enter focus mode (BB-5) — verify narration continues, chrome fades
- [ ] Tap screen during focus mode — verify chrome re-reveals, narration unchanged
- [ ] Rotate device — verify layout does not break
- [ ] Test with VoiceOver enabled — verify aria-live announcements for play/pause
- [ ] Verify all 6 meditation types still navigate correctly from Daily Hub (BB-20 regression sanity)

**Automated verification:**

- [ ] `cd frontend && pnpm test` — all tests pass (target: ~100 new tests added by BB-26, zero existing regressions)
- [ ] `cd frontend && pnpm lint` — zero warnings, zero errors
- [ ] `cd frontend && pnpm build` — clean production build, no new chunks of unreasonable size
- [ ] Run `/verify-with-playwright /bible/john/3 _plans/2026-04-10-bb26-fcbh-audio-bible-integration.md` to verify `[UNVERIFIED]` values against actual rendered output

**Auth gating:** N/A.

**Responsive behavior:** See checklist above for mobile/tablet/desktop manual verification.

**Guardrails (DO NOT):**
- Do NOT merge BB-26 without completing the iOS checklist.
- Do NOT skip the BB-20 regression sanity checks.
- Do NOT mark `[UNVERIFIED]` values as verified without running `/verify-with-playwright`.

**Test specifications:** All prior steps' tests must pass. No new automated tests in this step.

**Expected state after completion:**
- [ ] iOS checklist executed and all items pass
- [ ] All automated tests green
- [ ] Build clean, lint clean
- [ ] `[UNVERIFIED]` values resolved via `/verify-with-playwright`
- [ ] BB-20 ambient audio all acceptance criteria still pass

---

## Deep Review Backlog (for BB-37b integrity audit)

Items that surfaced during BB-26 planning but are out of scope for this ticket — flag for the wave's integrity audit (BB-37b):

### 1. BB-20 may be incorrectly gating `useSoundToggle` playback

**Observation:** During BB-26 recon, the Explore agent reported that BB-20's `useSoundToggle` hook calls `authModal.openAuthModal()` when the user is not authenticated before starting ambient audio playback. If true, this would mean logged-out users cannot play ambient rain while reading the Bible text — a gate that appears to contradict the ungated-reading principle established by BB-4.

**Why this is a potential error, not clearly a correct decision:**

- BB-20 does not persist listening-history data keyed to the user (`wr_listening_history` is global/session, not per-user).
- BB-20's reader-scoped ambient audio does not write any user-specific data to localStorage beyond the reader-preference keys (`wr_bible_reader_ambient_volume`, etc.), which are exactly parallel to font size and should not be gated.
- The spec for BB-20 (`_specs/bb-20-ambient-audio-under-reading.md`) should be consulted to see whether the auth gate was an explicit requirement or an implementation artifact copied from the Music page (where `useSoundToggle` was originally written for a different context that may have had different gating requirements).
- If `useSoundToggle` was reused from the Music page and inherited an auth gate that made sense in the Music context but not the reader context, this is a bug BB-37b should flag.

**This is a BB-20 concern, not a BB-26 concern.** BB-26 does NOT fix this — BB-26 builds a separate narration channel that does not call `useSoundToggle` at all. BB-20's ambient audio behavior is unchanged by BB-26.

**Action for BB-37b:** Read the BB-20 spec, read `useSoundToggle` implementation, and determine whether the auth gate (if present) is intentional. If it is not intentional, open a follow-up ticket to remove it (or confirm it was removed in a later wave and update the Explore agent's understanding of the current state). The BB-26 planning process could not conclusively verify whether the gate exists in the current code because BB-26 is scoped narrowly to the narration channel.

### 2. FCBH intro audio is not stripped

Per spec Critical Edge Case 9, FCBH recordings may include an intro ("The Gospel of John, chapter 3…"). BB-26 plays the file in its entirety. If user testing reveals the intro is jarring, BB-37b should consider a strip-intro feature (e.g., auto-seek past the first N seconds based on the fileset's metadata). Not blocking for BB-26.

### 3. No narration sleep timer in BB-26

BB-28 will add a dedicated narration sleep timer. BB-26 ships with "Set a sleep timer" disabled with "Coming soon" label. BB-37b should verify BB-28 actually replaces this and that no users report confusion with the disabled link during the gap between BB-26 and BB-28 ship dates.

### 4. BB-27 Web Audio forward-compat — confirmed safe with one critical guardrail

**Question answered during BB-26 planning:** Can BB-27 wrap BB-26's raw HTML5 `<audio>` element in a `MediaElementAudioSourceNode` later, without restructuring the narration channel?

**Answer: YES, with high confidence.** Research summary:

- `MediaElementAudioSourceNode` is **element-bound, not src-bound** — the node taps the element's decoded audio pipeline, and `audio.src = newUrl` continues to route through the same node. The src-swapping pattern in BB-26 Step 7 survives wrapping unchanged. [MDN `MediaElementAudioSourceNode`]
- `createMediaElementSource()` has no user-gesture requirement and no restriction on "freshness" — BB-27 can call it on an element that has been playing for weeks. Only the `AudioContext` itself needs a gesture for the initial `suspended → running` transition. [MDN `AudioContext.createMediaElementSource`]
- **Only one `MediaElementAudioSourceNode` per element, ever.** Not a problem for the BB-26 → BB-27 path since wrapping happens exactly once.
- Progressive MP3 (what FCBH delivers) is the well-supported path for `MediaElementAudioSourceNode` across Chrome, Firefox, and Safari. The known broken case is HLS (WebKit Bug 306493, 2026-02), which is not applicable to BB-26.

**Critical BB-26 guardrail to keep BB-27 frictionless:** The narration `<audio>` element in Step 7 **must** have `crossOrigin="anonymous"` set **before** the first `src` assignment if FCBH MP3s are served from a cross-origin domain. If this is missed, wrapping in BB-27 will produce **silent output with no error** (the CORS-taint silent-failure trap). Step 7 already specifies `crossOrigin="anonymous"` on the element — preserve this exactly.

**Known iOS Safari issues BB-27 must handle (not BB-26's problem):**

1. **WebKit Bug 293891 (2025-06, NEW):** "Audio Element Silent After Audio Context Connection" on Safari 18.5. Reporter's repro may be non-canonical (they observed similar issues in Chrome Canary and Firefox Nightly). **BB-27 must smoke-test on real iOS 18+ hardware** before shipping ducking.
2. **Silent switch behavior change:** Plain `<audio>` routes through iOS's "media" audio session and plays through the hardware silent switch. `MediaElementAudioSourceNode` routes through the "ambient" session and **is muted by the silent switch**. Wrapping in BB-27 will introduce a user-visible regression for users who keep their phone muted while reading at night. Mitigation options BB-27 should weigh:
   - Accept the regression and document it.
   - Implement ducking via direct `audio.volume` ramps on the raw elements (no Web Audio graph at all) — gets 90% of the value without the iOS silent-switch change.
   - Use a hacky silent `<video playsInline>` trick to force the media session for the Web Audio output.
3. **WebKit Bug 221334 (2022, NEW):** "Audio passed through WebAudio is delayed and glitchy on Safari." Quality degradation, not silence. BB-27 should evaluate on real hardware.

**Recommendation for BB-26:** Proceed as currently planned with raw HTML5 audio. Preserve the `crossOrigin="anonymous"` guardrail in Step 7. Do not adopt Web Audio routing in BB-26 — doing so would force BB-26 to solve the AudioContext user-gesture problem, the CORS-taint silent-failure trap, and the iOS silent-switch regression before narration is even working, which is three unrelated failure modes gating a simpler ticket.

**Action for BB-27 planning (not BB-26):** Decide between Web Audio ducking (precise, but inherits iOS silent-switch regression) and direct `<audio>.volume` ducking (simpler, no regression, slightly less precise). Include real-iOS-device testing in the BB-27 plan.

**Sources consulted during BB-26 research:**
- [MDN: MediaElementAudioSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode)
- [MDN: AudioContext.createMediaElementSource()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource)
- [MDN: crossorigin HTML attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)
- [W3C Web Audio API spec §1.22 (MediaElementAudioSourceNode)](https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode)
- [WebKit Bug 293891](https://bugs.webkit.org/show_bug.cgi?id=293891)
- [WebKit Bug 306493](https://bugs.webkit.org/show_bug.cgi?id=306493)
- [WebKit Bug 221334](https://bugs.webkit.org/show_bug.cgi?id=221334)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | FCBH errors + book codes + types scaffold |
| 2 | 1 | FCBH client implementation |
| 3 | 2 | FCBH client tests |
| 4 | 2 | Env vars wired into client |
| 5 | — | Reader settings extended (can run in parallel with 1-4) |
| 6 | — | AudioProvider narration state types + reducer (can run in parallel with 1-5) |
| 7 | 2, 4, 6 | AudioProvider `<audio>` element + controls + side effects |
| 8 | 7 | Media session priority |
| 9 | 6, 7 | Error messages + retryAfterSeconds plumbing |
| 10 | 7 | NarrationControl component |
| 11 | 7 | NarrationCurrentlyPlayingIndicator chip |
| 12 | 7, 9 | NarrationPicker component |
| 13 | 10, 11, 12, 5 | Mount components into ReaderChrome + BibleReader |
| 14 | 5 | TypographySheet audio narration section |
| 15 | 5, 7 | `useNarrationAutoStart` hook |
| 16 | 13 | Focus mode regression verification |
| 17 | 5, 4 | Rule file + env example documentation check |
| 18 | 1-17 | Manual iOS test + build health |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | FCBH errors, book codes, types scaffold | [NOT STARTED] | | |
| 2 | FCBH client implementation | [NOT STARTED] | | |
| 3 | FCBH client unit tests | [NOT STARTED] | | |
| 4 | Environment variable wiring | [NOT STARTED] | | |
| 5 | Extend useReaderSettings with narration fields | [NOT STARTED] | | |
| 6 | AudioProvider narration state slice and reducer | [NOT STARTED] | | |
| 7 | AudioProvider `<audio>` element + controls + side effects | [NOT STARTED] | | |
| 8 | Media session narration priority | [NOT STARTED] | | |
| 9 | Error messages + retryAfterSeconds | [NOT STARTED] | | |
| 10 | NarrationControl component | [NOT STARTED] | | |
| 11 | NarrationCurrentlyPlayingIndicator chip | [NOT STARTED] | | |
| 12 | NarrationPicker component | [NOT STARTED] | | |
| 13 | Mount components into ReaderChrome + BibleReader | [NOT STARTED] | | |
| 14 | Audio narration section in TypographySheet | [NOT STARTED] | | |
| 15 | useNarrationAutoStart hook | [NOT STARTED] | | |
| 16 | Focus mode regression verification | [NOT STARTED] | | |
| 17 | Rule 11 + .env.example documentation check | [NOT STARTED] | | |
| 18 | iOS manual test + build health verification | [NOT STARTED] | | |
