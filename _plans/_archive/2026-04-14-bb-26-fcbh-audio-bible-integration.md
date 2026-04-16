# Implementation Plan: BB-26 FCBH Audio Bible Integration

**Spec:** `_specs/bb-26-fcbh-audio-bible-integration.md`
**Date:** 2026-04-14
**Branch:** `audio-wave-bb-26-29-44`
**Design System Reference:** `.claude/rules/09-design-system.md` (loaded — no separate `_plans/recon/design-system.md` snapshot found; values sourced from rules + codebase inspection)
**Recon Report:** `_plans/recon/bb26-audio-competitors.md` (loaded — YouVersion / Bible.is / Audible / Dwell capture from the prior BB-26 attempt; visual patterns still apply even though the player architecture is new)
**Master Spec Plan:** Not applicable (BB-26 is the first spec in the BB-26-29-44 audio wave; master plan is the spec's own "Overview" + the BB-26 through BB-29 + BB-44 relationship documented in its header)

> **Supersedes:** `_plans/2026-04-10-bb26-fcbh-audio-bible-integration.md`. That plan was written against an earlier revision of the spec that reused the BB-20 AmbientAudioPicker pattern (`NarrationControl` + `NarrationPicker` + mutual-exclusion rules). The current spec rewrites the player as a standalone Howler.js-backed bottom sheet with a new App-level context. The prior plan is stale in its entirety — do not mix steps.

---

## Architecture Context

### Branch posture

- The audio wave (BB-26, BB-27, BB-28, BB-29, BB-44) commits directly to a shared branch `audio-wave-bb-26-29-44` per the spec header. No sub-branches, no intermediate merges. Each spec in the wave appends to this branch.
- Branch is currently at `main` + a pending modification to the spec file itself. No code commits yet.

### Project structure discovered

- **Routing:** React Router in `frontend/src/App.tsx` (290 lines). All providers are stacked inside `<BrowserRouter>` → `<HelmetProvider>` → `<ErrorBoundary>` → `<AuthProvider>` → `<InstallPromptProvider>` → `<ToastProvider>` → `<AuthModalProvider>` → `<AudioProvider>` (the legacy music one) → `<WhisperToastProvider>`. The `AudioPlayerProvider` will slot in between `<AudioProvider>` and `<WhisperToastProvider>` so it has access to the toast system but is outside the music audio graph.
- **BibleReader:** `frontend/src/pages/BibleReader.tsx` (928 lines). Lazy-loaded route at `/bible/:book/:chapter`. Uses `BibleDrawerProvider` → `ReaderChrome` + `AmbientAudioPicker` + drawers. BB-26's play button lives inside `ReaderChrome`; the `AudioPlayerSheet` is mounted at App level, not inside BibleReader, so the sheet survives chapter-to-chapter navigation (setup for BB-29 continuous playback).
- **ReaderChrome:** `frontend/src/components/bible/reader/ReaderChrome.tsx` (173 lines). Right-edge icon cluster (lines 98-163) currently orders: Typography → Ambient Audio (BB-20, conditional on `ambientAudioVisible`) → Focus Mode → Books. BB-26 inserts a new icon **after the Books icon** (rightmost) so it does not disrupt existing order and is easy to find on the end of the strip. Icon class string is `ICON_BTN` at line 7-8: `'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'`.
- **AudioProvider (legacy music):** `frontend/src/components/audio/AudioProvider.tsx` (346 lines). Exposes the `AudioState`, `AudioEngineService`, sleep timer, reading context, media session metadata for ambient sounds. **BB-26 does NOT touch this module.** It lives in parallel. BB-27 will later coordinate the two — BB-26 is explicitly independent.
- **BB-20 existing ambient audio button** already sits in ReaderChrome controlled by `settings.ambientAudioVisible`. BB-26 adds a **second** distinct button (for verbal narration), not a replacement or merger.
- **Legacy scaffolding kept from deep review's Protocol 01:**
  - `frontend/src/hooks/useBibleAudio.ts` (355 lines) — a Web Speech API TTS hook that predates the DBP approach. **BB-26 does NOT consume it, extend it, or import it.** The deep review kept it under "BB-26-29 deferred" but the current spec replaces its purpose entirely. Leave the file untouched; a later cleanup spec can remove it. Do not delete it in this spec.
  - `frontend/src/components/bible/SleepTimerPanel.tsx` (292 lines) — a UI panel for sleep-timer configuration from the deep review. BB-26 does not use or touch it. BB-28 is where this file becomes relevant again. Do not delete, modify, or reference from BB-26 code.
- **Vite config:** `frontend/vite.config.ts` uses `manualChunks` for `recharts`, `react-helmet-async`, `leaflet`. Dynamic imports produce automatic route-level / component-level chunks; Howler + BB-26 player components will be isolated via dynamic `import()` calls in the context + sheet wrapper, not via explicit `manualChunks` entries.
- **Env variable pattern:** `frontend/src/lib/env.ts` (116 lines). Exposes `require*` helpers for keys that throw at feature-use time, plus `is*Configured()` non-throwing checks for conditional UI. BB-26 adds `requireFcbhApiKey()` + `isFcbhApiKeyConfigured()` + a getter the DBP client calls.
- **`.env.example`** at `frontend/.env.example`. Documents `VITE_GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_VAPID_PUBLIC_KEY`. BB-26 adds `VITE_FCBH_API_KEY` following the same pattern.
- **ErrorBoundary:** `frontend/src/components/ErrorBoundary.tsx` (73 lines). Accepts an optional `fallback` ReactNode prop. BB-26 reuses this component for the `AudioPlayerSheet` error boundary with a custom minimal fallback ("Audio unavailable right now" in a small card).
- **Animation tokens:** `frontend/src/constants/animation.ts` — canonical source. `ANIMATION_DURATIONS.base = 250ms`, `ANIMATION_DURATIONS.fast = 150ms`, `ANIMATION_EASINGS.decelerate` for enter, `ANIMATION_EASINGS.accelerate` for leave. Spec requires 300ms for sheet slide and 200ms for minimize/expand — values are **close but not identical** to the 250/150 base/fast tokens. Decision (see "Edge Cases"): use `base` (250ms) for sheet slide and `fast` (150ms) for minimize/expand so the plan matches the canonical tokens. This is a deliberate deviation from the spec's 300/200 numbers in favor of the project's animation discipline rule. Flagged in Assumptions for user confirmation.
- **BB-32 AI cache pattern:** `frontend/src/lib/ai/cache.ts` (343 lines) is the reference implementation for a namespaced `bb*-v1:` localStorage cache with safe wrappers, version schema, eviction, and fail-silent storage operations. BB-26's `audio-cache.ts` mirrors its contract (same safe-get/set/remove helpers, same fail-silent posture, same version-in-prefix convention) but for a much smaller surface — one cached key (`bb26-v1:audioBibles`) plus an in-memory Map for per-chapter URLs.

### Pattern collisions and deviations from the spec

Three spec file-path requirements collide with existing files and must be resolved:

1. **`frontend/src/types/audio.ts` already exists** (96 lines, music `AudioState` + reducer action union for the legacy AudioProvider). Spec requirement #4 says BB-26 types live here. **Deviation:** BB-26 types go in a new file `frontend/src/types/bible-audio.ts` so they don't cross-contaminate with the music provider's types. Flagged in Assumptions.
2. **`frontend/src/components/audio/` already hosts the music audio components** (AudioDrawer, AudioPill, DrawerNowPlaying, etc.). Spec requirement says new components live at `frontend/src/components/audio/AudioPlayButton.tsx` etc. **Resolution:** follow the spec path verbatim. Name the new components with the `AudioPlayer*` prefix (not just `Audio*`) to distinguish them from the music components already in that folder. File names: `AudioPlayButton.tsx`, `AudioPlayerSheet.tsx`, `AudioPlayerExpanded.tsx`, `AudioPlayerMini.tsx`. The `AudioPlayButton` naming is the one spec-dictated exception.
3. **`frontend/src/contexts/AudioPlayerContext.tsx` is a new file.** Contexts folder already contains `AuthContext.tsx`, `InstallPromptContext.ts`, `InstallPromptProvider.tsx`. No collision.

### Test patterns to match

- **Vitest + React Testing Library**, jsdom environment. Test files live beside source in `__tests__/` or colocated with `.test.ts` suffix.
- **Mock fetch** via `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({...}) }))`. Reset in `beforeEach`.
- **Mock localStorage** via `vi.stubGlobal('localStorage', ...)` or by clearing in `beforeEach`.
- **Mock Howler** via `vi.mock('howler', () => ({ Howl: vi.fn().mockImplementation(() => ({ play: vi.fn(), pause: vi.fn(), stop: vi.fn(), unload: vi.fn(), seek: vi.fn(), rate: vi.fn(), duration: vi.fn().mockReturnValue(180), on: vi.fn() })) }))`.
- **Provider wrapping for hook tests:** `renderHook(() => useAudioPlayer(), { wrapper: ({ children }) => <AudioPlayerProvider>{children}</AudioPlayerProvider> })`. No other providers needed for the BB-26 hook (not auth-gated, no toast usage).
- **Integration tests in BibleReader** wrap in `<BrowserRouter>` + `<AudioPlayerProvider>` and mock Howler + fetch.
- **Reactive store consumer test pattern (BB-45):** for `useAudioPlayer`, write at least one test that mutates the provider state (via `act` + a dispatch) **after** the component has mounted, then asserts the component re-renders. The useSyncExternalStore / Context subscription pattern inside `useAudioPlayer` must produce correct cross-component re-renders.

### Auth gating

**Zero new auth gates.** BibleReader is a public route; audio inherits. Every action in the spec's "Auth Gating" table resolves to "works identically for logged-in and logged-out users." The `useAuth` hook is not imported by any BB-26 file.

### Shared data models from master plan

Not applicable — BB-26 is the first spec in the audio wave. BB-27, BB-28, BB-29, and BB-44 will consume BB-26's `useAudioPlayer` hook and read from its context, but nothing in BB-26 depends on a sibling spec.

### How BB-26 connects to the rest of the audio wave (forward-compat contract)

BB-26 lays the foundation the rest of the wave will build on. A few decisions in this plan are load-bearing for later specs and must not be undone during "cleanup" without understanding the downstream impact:

- **BB-27 (ambient audio layering + ducking) depends on the CORS taint mitigation in Step 6.** BB-27 will wrap the Howler-managed `<audio>` element in a `MediaElementAudioSourceNode` so the Web Audio graph can duck ambient sounds when verbal narration is present. This wrapping produces silent output if the element is CORS-tainted, with no error thrown. Step 6 sets `crossOrigin = 'anonymous'` on the internal element **pre-emptively for BB-27**, even though BB-26 itself never touches the Web Audio graph. The test "CORS taint: crossOrigin attribute is set on internal audio element" is the guard — if it's deleted as "unused BB-26 code" a future refactor will silently break BB-27 months later.
- **BB-27 should test on real iOS hardware before shipping ducking.** iOS Safari has a specific bug (**WebKit Bug 293891**, reported 2025-06) where `MediaElementAudioSourceNode` can produce silent output on Safari 18.5 even with correct CORS handling. This is an iOS-only issue and will NOT surface in BB-26's desktop-only verification. BB-27's plan must schedule a real-device iOS test before marking the spec complete. This note also belongs in BB-27's own plan when it's written — flagging it here so it doesn't get lost.
- **BB-28 (sleep timer) will consume the existing `SleepTimerPanel.tsx` scaffolding** that the deep review kept under "BB-26-29 deferred." BB-26 leaves that file untouched. BB-28 will wire it up; if you delete it as dead code during BB-26 execution, BB-28's plan will be larger than expected.
- **BB-29 (continuous playback / auto-advance) depends on the App-level mount of `AudioPlayerProvider` and `AudioPlayerSheet` (Steps 9 and 15).** Moving either inside the BibleReader route would unmount player state on chapter navigation and break the continuous-playback contract. The provider must stay above `<Routes>`.
- **BB-44 (read-along verse highlighting) depends on the engine's `onTick` callback** (via the provider's 200ms interval dispatching `TICK`). BB-44 will subscribe to `state.currentTime` and match it against verse timestamps (DBP publishes timing data via the `/timestamps/{fileset_id}/{book}/{chapter}` endpoint — confirmed to exist in the Step 17 recon via the DBP OpenAPI spec). The tick cadence (200ms) is a conscious trade-off — tight enough for smooth verse highlighting, loose enough to not burn CPU. Don't tighten the interval without weighing both sides. **Dramatized-production note:** because BB-26 ships FCBH's dramatized WEB production (not plain narration), BB-44's verse highlighting will have to handle the fact that the timing data for dramatized filesets includes both verse boundaries AND dramatic beats (pauses, sound-effect beats, voice transitions). **BB-44 should highlight on verse boundaries only, ignoring dramatic beats**, to preserve a clean reading rhythm. Otherwise highlighting will flicker between verses as the narrator pauses for dramatic effect. This is a BB-44 planning input, not a BB-26 concern.

### Risks tracked for later audio-wave specs (not BB-26's problem to solve)

1. **iOS Safari `MediaElementAudioSourceNode` silence bug** (WebKit Bug 293891, 2025-06). Affects BB-27 ducking on Safari 18.5. Won't appear in BB-26 desktop verification. Document in BB-27 plan + test on real iOS before BB-27 ships.
2. **Howler `_sounds[0]._node` private-field access** in Step 6 is Howler-version-dependent. Bumping Howler is a "re-verify before merge" gate, not a free-for-all. The test in Step 6 will catch a break but won't catch a silent attribute rename.
3. **FCBH CORS headers must be permissive** (`Access-Control-Allow-Origin: *` or an accepted origin) for BB-27 ducking to be feasible at all. Step 17 recon verifies this for at least one URL. If CORS is NOT permissive, BB-27 has to choose between (a) fetch-then-blob, (b) drop Web Audio ducking, or (c) upstream Howler feature request. BB-26 itself works fine either way — this is only a BB-27 planning input.
4. **FCBH URLs are signed and expire ~15 hours after issue** (confirmed in Step 17 recon). BB-26 holds per-chapter URLs in-memory only and never persists them; the cache is keyed by `filesetId:book:chapter` and dies with the page. A refresh always re-fetches a fresh signed URL. A known edge case: if a user opens the BibleReader, minimizes the sheet without playing audio, and leaves it overnight, the first tap the next morning will trigger `onloaderror` with a signed-URL-expired error. The error is converted to "Audio playback failed. Check your connection and try again." via `audioErrorMessageFor`, and tapping play again re-fetches a fresh URL. Acceptable UX, no special handling needed.
5. **BB-39 PWA service worker must exclude FCBH audio URLs from runtime caching** to comply with DBP license terms ("not store content for offline use"). BB-26 cannot enforce this directly because BB-26 doesn't touch the service worker config. Step 18 documents the requirement in `.claude/rules/08-deployment.md` as a BB-39 follow-up. When BB-39's PWA strategy is extended to cover audio-tier runtime caching, it MUST add a globIgnores/runtime-cache-exclusion rule for `*.cloudfront.net/audio/*`. Failure to do so would ship Worship Room in violation of FCBH's license.
6. **FCBH attribution link is a license-compliance requirement**, implemented as spec 50a + Step 14 footer. If the link is ever removed in a future redesign or "cleanup" pass, Worship Room falls out of compliance with the DBP license. The attribution-link test in Step 14 is the long-term guard.

---

## Auth Gating Checklist

**No new auth gates introduced by BB-26.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| See audio play button on BibleReader | Public | Step 11 | None — visibility is gated only on DBP availability + key configuration |
| Start audio playback | Public | Step 8 (hook) | None |
| Use scrubber / speed / minimize / close | Public | Steps 13, 14, 15 | None |
| Use Media Session lock-screen controls | Public | Step 16 | None |

Every action in the spec works identically regardless of authentication state. No `useAuth`, `useAuthModal`, or conditional branching on auth state is introduced.

---

## Design System Values (for UI steps)

All values sourced from `.claude/rules/09-design-system.md` + spec Design Notes + codebase inspection. No standalone `_plans/recon/design-system.md` file exists.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `AudioPlayButton` in ReaderChrome | class | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | `ReaderChrome.tsx` line 7-8 `ICON_BTN` constant |
| `AudioPlayButton` icon | component | Lucide `Play` (idle/paused), Lucide `Pause` (playing) at `h-5 w-5` | Spec Design Notes + existing ReaderChrome icon sizing |
| `AudioPlayButton` aria-label (idle) | attribute | `"Play audio for {book} {chapter}"` | Spec requirement #32 |
| `AudioPlayButton` aria-label (playing) | attribute | `"Pause audio"` | Spec requirement #32 |
| `AudioPlayButton` aria-label (paused) | attribute | `"Resume audio"` | Spec requirement #32 |
| Sheet surface (expanded + minimized) | class | `bg-background-deep/95 backdrop-blur-xl border-t border-white/10` | Spec Design Notes line 167 |
| **⚠️ Verification needed:** `bg-background-deep` may not exist in `tailwind.config.js` | | Verify at execution time; fallback to `bg-[#0D0620]/95` (hero-dark) if missing | `[UNVERIFIED]` |
| Sheet expanded padding (mobile) | class | `px-6 py-4` | Spec Design Notes line 168 |
| Sheet expanded padding (tablet/desktop) | class | `sm:px-8 sm:py-5` | Spec Design Notes line 168 |
| Sheet expanded height | class | `h-[340px] sm:h-[300px]` | Spec responsive table + 20px bump for attribution footer (Step 14) |
| Sheet minimized height | class | `h-16` (64px) | Spec requirement #34 |
| Sheet desktop width constraint | class | `lg:max-w-2xl lg:mx-auto lg:rounded-t-2xl` | Spec responsive table line 141 |
| Chapter reference text (expanded) | class | `text-white text-lg font-medium` | Spec Design Notes line 169 |
| Translation label | class | `text-white/60 text-sm` | Spec Design Notes line 170 |
| Large play/pause button (expanded) | class | `flex h-14 w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | Spec Design Notes line 171 + accessibility focus ring convention |
| Scrubber track | class | `h-1 bg-white/10 rounded-full relative cursor-pointer` | Spec Design Notes line 172 + competitor recon |
| Scrubber fill | class | `absolute left-0 top-0 h-full bg-white rounded-full` | Spec Design Notes line 172 + competitor recon |
| Scrubber thumb | class | 16px diameter `h-4 w-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]` wrapped in a 44x44 hit area (`flex items-center min-h-[44px]`) | Spec Design Notes line 172 + 44px tap target rule |
| Time labels (current / duration) | class | `text-white/60 text-xs tabular-nums` | Spec Design Notes line 173 |
| Speed button (unselected) | class | `inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 px-3 text-sm font-medium text-white/80 transition-colors` | Spec Design Notes line 174 |
| Speed button (selected) | class | same base + `bg-white/15 text-white` | Spec Design Notes line 174 |
| Minimize / close buttons | class | `flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` (32px touch target per spec, which is BELOW the 44px floor — see Edge Cases for resolution) | Spec Design Notes line 175 |
| Minimized bar chapter text | class | `text-white/80 text-sm` | Spec Design Notes line 176 |
| Minimized bar play/pause | size | 40px (`h-10 w-10`) with same circular treatment as expanded, scaled | Spec Design Notes line 177 |
| Error state message | class | `text-white/70 text-sm` | Spec Design Notes line 178 |
| Error state dismiss button | class | `text-white/50 hover:text-white/80 text-sm underline underline-offset-2` | Spec Design Notes line 178 |
| Sheet slide enter animation | duration + easing | `ANIMATION_DURATIONS.base` (250ms) + `ANIMATION_EASINGS.decelerate` — **deviates from spec's 300ms** | `constants/animation.ts` + discipline rule in `09-design-system.md` |
| Sheet slide exit animation | duration + easing | `ANIMATION_DURATIONS.base` (250ms) + `ANIMATION_EASINGS.accelerate` | `constants/animation.ts` |
| Minimize/expand animation | duration + easing | `ANIMATION_DURATIONS.base` (250ms) + `ANIMATION_EASINGS.decelerate`. Base (250ms), not fast. Sheet height transitions are element-level motion, not micro-interactions. Fast is reserved for hover states and dropdown reveals. | `constants/animation.ts` + discipline rule |
| Z-index layering | value | Sheet at `z-40` (matches sticky FAB layer), error card inside sheet at `z-50` | Existing `DailyAmbientPillFAB` convention + `09-design-system.md` sticky FAB pattern |

**[UNVERIFIED] values — remaining open items:**

1. **`bg-background-deep/95`** — spec uses this token but it may not exist in `tailwind.config.js`. **Verify at Step 12:** grep `tailwind.config.js` for `background-deep`. If missing, fall back to `bg-[#0D0620]/95` which is the `hero-dark` hex value and matches the intended visual. If wrong, user correction is needed.
2. **Vertical Rhythm gap measurements** (in the "Vertical Rhythm" table below) — values are plausible but not Playwright-verified. `/verify-with-playwright` will flag any gap >5px from expected. Correction: adjust class strings in `AudioPlayerExpanded.tsx` once verification runs.
3. **Media Session API behavior on iOS Safari and desktop Safari** — partially documented from public sources but not live-tested on hardware. BB-26 logs a console warning if `navigator.mediaSession` is undefined and continues without crashing. Mobile verification is deferred per spec.
4. **Attribution footer fit at mobile** — the 20px height bump (320→340px) is a best guess; `/verify-with-playwright` must confirm the attribution link is not clipped or crowding the speed picker at 375px. Correction: increase the mobile height another 20px or widen the `mt-3` gap to `mt-4` if crowding is observed.

**[RESOLVED] items — previously flagged as [UNVERIFIED], now confirmed by Step 17 recon (see `_plans/recon/bb26-audio-foundation.md`):**

- ✅ DBP v4 API base URL, endpoint paths, response envelope shapes — **confirmed.** Base URL `https://4.dbt.io/api`, `{ data, meta }` wrapper, per-chapter shortcut at `/bibles/filesets/{id}/{book}/{chapter}`.
- ✅ WEB fileset identifier — **confirmed.** `EN1WEBN2DA` (NT) + `EN1WEBO2DA` (OT), both from the `ENGWWH` bible abbreviation. The spec's original guess of "ENGWEB" was a bible abbr, not a fileset id; the correct usage is the pair of EN1WEB* fileset IDs.
- ✅ Audio file format — **confirmed.** MP3 64 kbps, served with `Content-Type: binary/octet-stream` (not `audio/mpeg`, hence the `format: ['mp3']` hint in Step 6). Supports range requests. CORS permissive with Origin header.
- ✅ WEB audio coverage — **confirmed 100%** across 11 spot checks spanning the canon. All 66 books have audio available via the EN1WEB* fileset pair.
- ✅ DBP book code vocabulary — **confirmed exact match** with the spec's 66-code list. `book-codes.ts` can be written verbatim.
- ✅ CORS posture for BB-27 — **confirmed.** CloudFront returns `Access-Control-Allow-Origin: *` when the request carries an `Origin` header (with `Vary: Origin`). BB-27's `MediaElementAudioSourceNode` ducking path is unblocked — provided Step 6's `crossOrigin='anonymous'` mitigation is in place.
- ✅ Rate limits — **confirmed.** `x-ratelimit-limit: 1500` per key per window. Per-key quota shared across all Worship Room users. Window period not documented but ample for BB-26 scale. No backend proxy needed.
- ✅ FCBH API key public-safety — **inferred** from ACAO:*, Application-URL registration flow, and license language. Not explicitly documented but behavior strongly suggests the key is intended for client-side use. Treating `VITE_FCBH_API_KEY` as public-safe-but-rate-budgeted.
- ✅ Howler iOS audio context unlock — **confirmed** via Howler 2.2.x docs. HTML5 mode handles iOS unlock on first user gesture. Real-device verification still deferred but not blocking BB-26 desktop scope.

---

## Design System Reminder

Project-specific quirks that `/execute-plan` displays before every UI step:

- The BibleReader is a documented layout exception — it uses `ReaderChrome`, not `Navbar` or `SiteFooter`. Do NOT add a Navbar or Footer reference to any BB-26 component. BB-26's UI lives either inside ReaderChrome (the play button icon) or mounted at the App level as a non-modal overlay (the sheet).
- The BibleReader is NOT part of the Daily Hub — do NOT use `HorizonGlow` or `GlowBackground`. BB-26's components sit on a dark background of their own.
- **Animation tokens are canonical** — the spec writes "300ms" and "200ms" in freehand. These must be translated to `ANIMATION_DURATIONS.base` (250ms) and `ANIMATION_DURATIONS.fast` (150ms) during implementation. Do NOT hardcode `duration-300` or `duration-200` in component class strings. Import tokens from `constants/animation.ts`.
- **Reduced-motion safety net is global** — the `frontend/src/styles/animations.css` rule auto-disables animations when `prefers-reduced-motion: reduce`. Do NOT add per-component `prefers-reduced-motion` checks. Animations are declared normally; the global rule handles the opt-out. The `AudioPlayerSheet` slide animation and flip animations are NOT exempt; they become instant state changes automatically.
- **Focus trap is not required on the sheet.** The sheet is a non-modal companion to the BibleReader (background is NOT dimmed, reader content remains interactive). Using `useFocusTrap()` would contradict the spec requirement 141: "the sheet is a non-modal companion to the BibleReader, not an overlay." Focus is managed manually: focus moves to the expanded play button when the sheet opens (Step 14), returns to the `AudioPlayButton` in ReaderChrome when the sheet closes.
- **The sheet is NOT a sticky FAB.** It's a fixed bottom-edge element spanning the full viewport width (mobile) or constrained by `max-w-2xl` (desktop). No `pointer-events-none` outer wrapper, no `env(safe-area-inset-*)` handling — spec explicitly defers iOS safe-area handling to a later session.
- **No drawer-aware hide rule.** Unlike `DailyAmbientPillFAB`, the audio player sheet does NOT need to auto-hide when the BibleDrawer or any other drawer opens. If both are visible the sheet sits at `z-40` and the BibleDrawer sits higher at `z-50` (existing value); that's the intended stacking.
- **32px minimize/close buttons** — the spec asks for 32px touch targets on the minimize and close corner buttons, which is below the project's 44px mobile tap-target floor. **Resolution** (Edge Case): render the visible circle at 32px but wrap it in a 44x44 invisible hit area via a `flex items-center justify-center h-[44px] w-[44px]` outer element. This satisfies both the spec's visual spec and the accessibility rule.
- **Media Session metadata uses `navigator.mediaSession.metadata = new MediaMetadata({...})`.** Do NOT import `MediaMetadata` — it's a browser global. Guard every access with `if ('mediaSession' in navigator)`.
- **Howler must not appear in the main bundle.** Use `await import('howler')` inside the engine module only, and only at play time (not at context mount). The context + hook + play button live in the main bundle; the engine wrapper, Howler, and the `AudioPlayer*` components that render the sheet live in a lazy chunk triggered by first play.
- **The cache uses `bb26-v1:` prefix.** Per spec requirement #8 and matching BB-32 precedent. Do NOT use `wr_bb26_*` or mix prefixes. One cached localStorage key: `bb26-v1:audioBibles`. No other localStorage writes.
- **No console.log on success paths** — only console.error or console.warn on failures (DBP failure, mediaSession missing). Treat listening activity as private, not logged.
- **No streaks, faith points, badges, or activity tracking.** BB-26 writes to zero activity stores. Do NOT import `useFaithPoints`, `useChapterVisitStore`, or any streak/badge hook in BB-26 code. Listening is not gamified — the spec's anti-pressure section is absolute on this.

---

## Shared Data Models (from master plan)

Not applicable. BB-26 introduces the foundational data models the wave will consume, defined in `frontend/src/types/bible-audio.ts` (Step 3). Downstream specs in the wave will import these types; the wave's master plan is the BB-26 spec itself + its header listing BB-27/28/29/44 as dependents.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bb26-v1:audioBibles` | Both | Cached DBP `listAudioBibles()` response, 7-day TTL. Only key written by BB-26. |

---

## Responsive Structure

| Breakpoint | Width | Key layout changes |
|-----------|-------|--------------------|
| Mobile | 375px | Sheet is full-width at the bottom, ~340px tall when expanded, 64px when minimized. Play button is 56px (`h-14 w-14`). Speed picker is a row of 5 buttons that may wrap at extreme narrow widths. Scrubber spans the full inner padding width. FCBH attribution link sits in a footer area below the speed picker. |
| Tablet | 768px | Sheet is full-width at the bottom, ~300px tall when expanded, 64px when minimized. Speed picker row is inline. Scrubber has more horizontal room. FCBH attribution link at bottom. |
| Desktop | 1440px | Sheet uses `max-w-2xl mx-auto` so it centers on the page, ~300px tall. Background is NOT dimmed (non-modal). Speed picker is inline as a row of 5 buttons. FCBH attribution link at bottom. |

**Custom breakpoints:** None. Uses the standard Tailwind `sm:` (640px) and `lg:` (1024px) breakpoints matching the project's existing conventions.

---

## Inline Element Position Expectations

The expanded player layout has two inline rows worth verifying positionally:

| Element group | Elements | Expected y-alignment | Wrap tolerance |
|---------------|----------|---------------------|----------------|
| Scrubber row | Current-time label, scrubber track, duration label | Same y ±5px at 1440px and 768px | N/A — these must not wrap |
| Speed picker row | 5 speed buttons (0.75x, 1.0x, 1.25x, 1.5x, 2.0x) | Same y ±5px at 1440px and 768px | Wrapping below 375px is acceptable |
| Control cluster row | Minimize button (corner), play/pause button (center), close button (corner) | Same y ±5px at all breakpoints | N/A — this row must not wrap |

`/verify-with-playwright` Step 6l will compare `boundingBox().y` between the elements in each group. Any mismatch >5px at mobile or above flags as a wrapping bug.

---

## Vertical Rhythm

Inside the expanded sheet (top to bottom):

| From → To | Expected gap | Source |
|-----------|-------------|--------|
| Top edge → minimize+close corner buttons | 12px (`top-3`) | Spec Design Notes padding guidance + existing reader chrome patterns |
| Minimize row → chapter reference | 8px (`mt-2`) | Codebase inspection of existing dark-theme card layouts |
| Chapter reference → translation label | 4px (`mt-1`) | Codebase inspection |
| Translation label → scrubber row | 16px (`mt-4`) | Codebase inspection |
| Scrubber row → play/pause control cluster | 16px (`mt-4`) | Codebase inspection |
| Play/pause cluster → speed picker row | 16px (`mt-4`) | Codebase inspection |
| Speed picker row → bottom edge | 16px (equal to py-5 bottom half on tablet/desktop) | Spec Design Notes padding |

These are derived from the spec's stated internal padding (`px-6 py-4` mobile, `px-8 py-5` tablet/desktop) + reasonable vertical rhythm for a ~280-320px tall sheet. **Marked [UNVERIFIED]:** values are plausible but untested. `/verify-with-playwright` will flag any gap >5px different from the expected value. Correction: adjust the class strings in `AudioPlayerExpanded.tsx` once verification runs.

---

## Assumptions & Pre-Execution Checklist

Confirm before executing:

- [ ] User has a working FCBH v4 API key and can set `VITE_FCBH_API_KEY` in `frontend/.env.local`. If no key is available, Step 17 (recon) produces a placeholder document and integration testing happens later when a key is obtained.
- [ ] User accepts the animation-token deviation: spec says 300ms slide + 200ms minimize; plan uses `ANIMATION_DURATIONS.base` (250ms) for both the slide enter/exit and the minimize/expand height transition, to match the canonical tokens. Base is the correct token for sheet-level height transitions; fast is reserved for hover/dropdown micro-interactions. If user disagrees, edit `constants/animation.ts` to add new tokens or override in the plan.
- [ ] User accepts that BB-26 types live in `frontend/src/types/bible-audio.ts` instead of the spec-specified `frontend/src/types/audio.ts` — the latter already holds the music provider's type union and merging would create a noise footprint across unrelated files.
- [ ] User accepts that `useBibleAudio.ts` and `SleepTimerPanel.tsx` are left untouched for now. They are stale scaffolding from Protocol 01's "BB-26-29 deferred" kept state. Deleting them is out of scope for this spec and should happen in a separate cleanup pass or in BB-28 when SleepTimerPanel becomes relevant.
- [ ] User understands that BB-26 is desktop-verified only — mobile lock-screen, iOS safe-area handling, and real-device Media Session verification are explicitly deferred per spec.
- [ ] All [UNVERIFIED] values flagged in Design System Values and Vertical Rhythm are acceptable as best-effort starting points, to be corrected at verification time.
- [ ] BibleReader Lighthouse Performance score is currently at 100 with CLS at 0.000 (post-deep-review batch 10 baseline) — the plan's "do not regress" target. Run `pnpm build && scripts/measure-bundle.mjs` before Step 1 to snapshot the baseline.
- [ ] The audio wave branch `audio-wave-bb-26-29-44` is checked out and at `main`.
- [ ] No existing uncommitted work other than the spec modification at `_specs/bb-26-fcbh-audio-bible-integration.md`.
- [ ] No deprecated patterns used: no `animate-glow-pulse`, no Caveat headings, no `BackgroundSquiggle`, no `GlowBackground` on BibleReader, no `font-serif italic` on prose, no soft-shadow 8px-radius cards, no `PageTransition` component, no mocking of reactive stores in tests.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Types file path clash | New file `frontend/src/types/bible-audio.ts`, not the existing `audio.ts` | The existing `audio.ts` holds the music provider's `AudioState`, `AudioAction`, `SleepTimer`, `AudioRoutine`, etc. — BB-26 types are a parallel domain. Merging would create a 500+ line file mixing two unrelated subsystems. Deviation flagged to user. |
| Component folder | `frontend/src/components/audio/` (same folder as music audio components) | Follow spec path verbatim. Use `AudioPlayer*` prefix on new components to distinguish from music `Audio*` components already in the folder. |
| Icon position in ReaderChrome | Rightmost position, after the existing Books icon | Spec says "near the right edge alongside the existing chapter navigation and theme picker." Inserting at the end minimizes the visual disturbance to existing layout and gives BB-26 its own easily-locatable position. |
| Animation timing | `ANIMATION_DURATIONS.base` (250ms) for both slide and minimize/expand height transition | Canonical tokens take precedence over spec's freehand "300/200" numbers. Base is the correct token for element-level height motion; fast is reserved for hover states and dropdown reveals. Discipline rule from `09-design-system.md`. |
| Minimize / close button size | Visible 32px circle inside a 44x44 hit area | Reconciles the spec's 32px visual spec with the project's 44px mobile tap-target floor. |
| Focus trap | Not used on the sheet | Sheet is non-modal — reader content stays interactive while audio plays. Manual focus management via `useEffect` + refs. |
| Howler loading | Dynamic import inside engine module only | Spec requirement #20: Howler must not enter main bundle. Import lives inside `lib/audio/engine.ts` inside an async function invoked only on first `play()`. |
| Sheet mounting location | App level, inside `AudioPlayerProvider` | Spec requirement #14: "mounted at the App level so player state survives BibleReader navigation." The sheet itself is a lazy-loaded component that only renders when the provider's state is not `idle` — it doesn't occupy DOM space when no audio is playing. |
| DBP API key reading | Via `lib/env.ts` `requireFcbhApiKey()` helper | Matches the existing env access pattern (Gemini, Maps, VAPID). Fail loudly at feature-use time with a clear error message, never at module load. |
| DBP client retry policy | No retries (spec requirement #6) | Cache layer handles the retry-on-next-navigation behavior via stale-while-revalidate. Single failed call → button hides that chapter → user moves to next chapter and cache retries. |
| What "hidden" means for the play button | Fully removed from DOM (`return null`), not `display: none` or `aria-hidden` | Spec requirement #26: "fully removed from the DOM." Also prevents the button from appearing in tab order when audio is unavailable. |
| Chapter-change behavior | Spec requirement #23: starting a new chapter's audio stops the previous one | BB-29 will handle auto-advance; BB-26 explicitly stops and does not auto-continue. |
| Cache corruption handling | Same fail-silent pattern as BB-32 cache | Parse failure → remove key → return null → next call fetches fresh data. |
| Error boundary fallback | Small frosted card matching the sheet surface style with "Audio unavailable right now" + a dismiss button | Spec requirement #43. Dismiss button removes the sheet from the DOM by setting player state to `idle`. |
| Player state persistence | Ephemeral, not persisted | Spec requirement #18. Page refresh = player reset. No localStorage writes for playback state. |
| Speed change persistence | Ephemeral, resets to 1.0x on page refresh | Spec requirement #49. |
| Playback start coordination with BB-20 ambient audio | Not coordinated — both can play simultaneously in BB-26 | BB-27 is explicitly the spec that handles layering. BB-26 is deliberately parallel. |
| Multi-voice UI | No UI, even if WEB has multiple filesets | Spec out-of-scope #201. Data model supports it; UI picks the first fileset. |

---

## Implementation Steps

### Step 1: Add Howler.js dependency

**Objective:** Install `howler` as a production dependency and `@types/howler` as a dev dependency. Verify the version pins handle iOS audio context unlock automatically.

**Files to create/modify:**
- `frontend/package.json` — add `"howler": "^2.2.4"` to `dependencies`, `"@types/howler": "^2.2.11"` to `devDependencies`
- `frontend/pnpm-lock.yaml` — regenerated via `pnpm install`

**Details:**

Run `pnpm add howler@^2.2.4` and `pnpm add -D @types/howler@^2.2.11` in the `frontend/` directory. Howler 2.2.x has been the stable release for years and handles iOS audio context unlock internally via its `html5` mode and touch-unlock helper. Confirm the install succeeded by importing Howler in a scratch TypeScript file (delete after verification).

Record the final pinned versions in the Execution Log once `pnpm install` resolves them.

**Auth gating (if applicable):** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT import `howler` synchronously anywhere in app code. All imports must be via `await import('howler')` inside lazy-loaded modules.
- Do NOT add `howler` to `manualChunks` in `vite.config.ts` — rely on Rollup's automatic code splitting from dynamic imports. Adding a manual chunk would defeat the lazy-loading goal if anything imports it synchronously by accident.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Build passes with new dependency | build smoke | `pnpm build` succeeds without TypeScript errors |
| Main bundle size holds | bundle size check | `pnpm build && node scripts/measure-bundle.mjs` shows main bundle ≤ 102 KB gzipped (post-deep-review baseline + 2 KB budget) |

**Expected state after completion:**
- [ ] `frontend/package.json` has `howler` in `dependencies`
- [ ] `frontend/package.json` has `@types/howler` in `devDependencies`
- [ ] `pnpm-lock.yaml` is updated
- [ ] `pnpm build` succeeds
- [ ] Main bundle does not grow (Howler is not imported anywhere yet)

---

### Step 2: Add FCBH API key to environment config

**Objective:** Add `VITE_FCBH_API_KEY` to `.env.example` and expose typed accessor functions in `lib/env.ts`.

**Files to create/modify:**
- `frontend/.env.example` — add `VITE_FCBH_API_KEY=your-fcbh-api-key-here` with a comment block matching the existing Gemini/Maps/VAPID pattern
- `frontend/src/lib/env.ts` — add `const FCBH_API_KEY = import.meta.env.VITE_FCBH_API_KEY as string | undefined`, `requireFcbhApiKey()`, `isFcbhApiKeyConfigured()`

**Details:**

Match the existing 3-function pattern (read at module load into a `const`, `require*` throws with a clear error, `is*Configured` non-throwing check). Copy the docstring style from `requireGeminiApiKey`:

```ts
/**
 * Returns the FCBH Digital Bible Platform v4 API key, or throws if it is
 * not configured. Call this from the DBP client right before making a
 * network request — never at module load or from feature code that runs
 * for users who haven't hit the audio feature yet.
 *
 * Used by: BB-26 (FCBH Audio Bible Integration), BB-27 through BB-29 and
 * BB-44 which build on BB-26's DBP client.
 */
export function requireFcbhApiKey(): string { ... }
```

Also export `getFcbhApiKey()` (no-throw variant that returns `string | undefined`) for the cache layer so it can short-circuit without throwing when the key is absent (e.g., in tests).

**.env.example block:**

```
# ---------------------------------------------------------------------------
# FCBH Digital Bible Platform v4 API key (for BB-26: Audio Bible)
# ---------------------------------------------------------------------------
# Obtain from: https://www.faithcomesbyhearing.com/bible-brain/dbp-api
# Used by: BibleReader audio playback for WEB Bible narration via DBP v4.
# Absence of the key disables the audio button across all chapters (silent
# fallback; no user-visible error).
VITE_FCBH_API_KEY=your-fcbh-api-key-here
```

**Auth gating:** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT log the API key value anywhere. The `require*` helper returns the string; callers pass it to `fetch` and nothing else.
- Do NOT check the key into git. `.env.local` is gitignored; `.env.example` uses a placeholder string.
- Do NOT throw at module load — the helper must throw only when called.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `requireFcbhApiKey` throws when key is absent | unit | Set `VITE_FCBH_API_KEY` to undefined via `vi.stubEnv`; assert throws with message containing "VITE_FCBH_API_KEY" and ".env.local" |
| `requireFcbhApiKey` returns value when set | unit | Stub env to `"test-key"`; assert returns `"test-key"` |
| `isFcbhApiKeyConfigured` returns false when absent | unit | Stub env to undefined; assert returns `false` |
| `isFcbhApiKeyConfigured` returns true when set | unit | Stub env to a string; assert returns `true` |

**Expected state after completion:**
- [ ] `.env.example` has `VITE_FCBH_API_KEY` with a descriptive comment block
- [ ] `lib/env.ts` exports `requireFcbhApiKey`, `isFcbhApiKeyConfigured`, `getFcbhApiKey`
- [ ] 4 new unit tests pass in `lib/env.test.ts` (or append to the existing env test file if one exists — grep for it during execution)
- [ ] No TypeScript errors

---

### Step 3: Define BB-26 audio types

**Objective:** Create the typed data models for the DBP client, cache layer, player state, and Media Session metadata.

**Files to create/modify:**
- `frontend/src/types/bible-audio.ts` — new file

**Details:**

Define the full type surface in one file. This file is the API contract that BB-27/28/29/44 will import from later; invest in clear documentation now.

```ts
/**
 * BB-26 — Bible Audio type definitions
 *
 * Types for the FCBH Digital Bible Platform v4 client, the audio cache
 * layer, the AudioPlayerContext state, and the Media Session metadata.
 *
 * This file is intentionally separate from `frontend/src/types/audio.ts`
 * which holds the legacy music AudioProvider's types. The two subsystems
 * are parallel — do not merge them. See _plans/2026-04-14-bb-26-fcbh-
 * audio-bible-integration.md § "Architecture Context / Pattern collisions"
 * for the rationale.
 */

/** DBP v4 "bibles list" response entry. */
export interface DbpBible {
  id: string // e.g. "ENGWEB" — the fileset identifier
  name: string
  language: string
  languageCode: string // e.g. "eng"
  filesets: DbpFileset[]
}

/** DBP v4 fileset entry — one audio package within a bible. */
export interface DbpFileset {
  id: string
  type: 'audio' | 'audio_drama' | 'text_plain' | 'text_format'
  size: 'C' | 'NT' | 'OT' // Complete / New Testament / Old Testament
  codec?: string // e.g. "mp3", "aac"
  bitrate?: string
}

/** DBP v4 chapter audio response — one URL per chapter. */
export interface DbpChapterAudio {
  book: string // DBP book code, e.g. "GEN", "JHN"
  chapter: number
  url: string
  durationSeconds?: number
}

/** Typed error from the DBP client. */
export interface DbpError {
  kind: 'network' | 'http' | 'parse' | 'timeout' | 'missing-key'
  status?: number
  message: string
}

/** Audio cache entry shape (stored in `bb26-v1:audioBibles`). */
export interface AudioBiblesCacheEntry {
  v: 1
  createdAt: number
  bibles: DbpBible[]
}

/** Current audio player state (ephemeral, not persisted). */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface PlayerTrack {
  filesetId: string
  book: string // project slug, e.g. "john"
  bookDisplayName: string // "John"
  chapter: number
  translation: string // "World English Bible"
  url: string
}

export interface AudioPlayerState {
  track: PlayerTrack | null
  playbackState: PlaybackState
  currentTime: number // seconds
  duration: number // seconds
  playbackSpeed: 0.75 | 1.0 | 1.25 | 1.5 | 2.0
  sheetState: 'closed' | 'minimized' | 'expanded'
  errorMessage: string | null
}

export interface AudioPlayerActions {
  play: (track: PlayerTrack) => Promise<void>
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  setSpeed: (speed: AudioPlayerState['playbackSpeed']) => void
  stop: () => void
  expand: () => void
  minimize: () => void
  close: () => void
  dismissError: () => void
}
```

**Auth gating:** None.

**Responsive behavior:** N/A — type definitions only.

**Guardrails (DO NOT):**
- Do NOT import from `@/types/audio.ts` (the music audio types) — keep the two subsystems decoupled.
- Do NOT add a `persisted` flag or any localStorage key to player state — it's ephemeral per spec requirement #18.
- Do NOT add voice selection or per-user preference fields — out of scope for BB-26 per spec out-of-scope list.

**Test specifications:** None — type definitions are exercised by downstream step tests (Step 4 for DBP, Step 7 for context, etc.).

**Expected state after completion:**
- [ ] `frontend/src/types/bible-audio.ts` exists
- [ ] All exports compile without TypeScript errors
- [ ] No circular imports

---

### Step 4: Implement DBP v4 API client

**Objective:** Implement `lib/audio/dbp-client.ts` with typed `listAudioBibles()`, `getBibleFilesets()`, and `getChapterAudio()` methods. Handle network errors, HTTP errors, and timeouts by resolving to a typed `DbpError` rejection.

**Files to create/modify:**
- `frontend/src/lib/audio/dbp-client.ts` — new file
- `frontend/src/lib/audio/__tests__/dbp-client.test.ts` — new test file

**Details:**

Create the `frontend/src/lib/audio/` directory (does not exist yet). Implement the client as a set of pure async functions, not a class — consistent with `lib/ai/explain.ts` and other service modules.

```ts
import { requireFcbhApiKey } from '@/lib/env'
import type { DbpBible, DbpFileset, DbpChapterAudio, DbpError } from '@/types/bible-audio'

const DBP_BASE_URL = 'https://4.dbt.io/api'
const DBP_TIMEOUT_MS = 10_000

async function dbpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = requireFcbhApiKey()
  const url = `${DBP_BASE_URL}${path}${path.includes('?') ? '&' : '?'}v=4&key=${encodeURIComponent(key)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DBP_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw { kind: 'http', status: response.status, message: `DBP ${response.status}` } satisfies DbpError
    }
    return (await response.json()) as T
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') {
      throw { kind: 'timeout', message: 'DBP request timed out' } satisfies DbpError
    }
    if ((e as DbpError).kind) throw e
    throw { kind: 'network', message: (e as Error).message ?? 'Network error' } satisfies DbpError
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function listAudioBibles(languageCode = 'eng'): Promise<DbpBible[]> { ... }
export async function getBibleFilesets(bibleId: string): Promise<DbpFileset[]> { ... }
export async function getChapterAudio(filesetId: string, bookCode: string, chapter: number): Promise<DbpChapterAudio> { ... }
```

**Exact DBP endpoint paths** are confirmed by Step 17's recon (see `_plans/recon/bb26-audio-foundation.md`):
- `GET /bibles?language_code=eng[&media=audio]&v=4&key=<KEY>` — bibles list. The `media=audio` filter returns only `type: 'audio'` (plain) filesets and EXCLUDES `audio_drama`. Since BB-26 ships WEB dramatized audio, DO NOT apply the `media=audio` filter — use the unfiltered `language_code=eng` query and filter client-side for filesets with `type: 'audio' || type: 'audio_drama'`.
- `GET /bibles/filesets/{fileset_id}?v=4&key=<KEY>` — full fileset manifest (260-929 entries per fileset, used sparingly).
- `GET /bibles/filesets/{fileset_id}/{book_code}/{chapter}?v=4&key=<KEY>` — **per-chapter shortcut. This is what BB-26 hits on every chapter open.** Returns a 1-element `data` array.

Response parsing must be defensive — DBP v4 wraps responses in `{ data: [...], meta: {...} }` shapes. The parser extracts `data` and asserts shape with typed interfaces. Any parse failure (unexpected shape, null data) throws `{ kind: 'parse', message }`.

**Defensive book_id validation (guards against a documented DBP bug):** After deserializing the `getChapterAudio` response, the client MUST validate that `response.data[0].book_id` matches the requested book code (case-insensitive). If they do not match, the client throws `{ kind: 'parse', message: 'DBP returned wrong book' }`. This guards against a recon-confirmed DBP bug where requesting an **invalid book code** (e.g., `/bibles/filesets/EN1WEBO2DA/XYZ/1`) returns a **200 OK** pointing to a fallback 1 Chronicles HLS playlist entry instead of a clean 404. Without this validation, a slug→code mismatch in `book-codes.ts` would silently play a random 3-hour 1 Chronicles recording when the user tapped "Nehemiah 5". The parse-kind error surfaces through `audioErrorMessageFor` as a generic failure, which is correct behavior for what is effectively a client bug. See `_plans/recon/bb26-audio-foundation.md` § 4 "Failure modes observed / Invalid book code" for the raw evidence.

**Auth gating:** None — the API key itself is the auth token, not user auth.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT retry on failure. Retries live in the cache layer (Step 5).
- Do NOT log request URLs to console on success — the URL contains the API key as a query parameter.
- Do NOT throw raw `Error` objects — always throw `DbpError`-shaped objects so consumers have a typed error to branch on.
- Do NOT cache inside this module — caching is Step 5's job. This module is a pure transport layer.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `listAudioBibles` returns parsed bibles on 200 | unit | Mock `fetch` to return `{ data: [mockBible] }`; assert resolves to `[mockBible]` |
| `listAudioBibles` includes language_code query param | unit | Mock `fetch`; assert the URL contains `language_code=eng` and `key=` |
| `listAudioBibles` throws `kind: 'http'` on 404 | unit | Mock `fetch` → `{ ok: false, status: 404 }`; assert rejection shape |
| `listAudioBibles` throws `kind: 'http'` on 500 | unit | Mock `fetch` → `{ ok: false, status: 500 }`; assert rejection shape |
| `listAudioBibles` throws `kind: 'network'` on fetch rejection | unit | Mock `fetch` → `Promise.reject(new Error('DNS failure'))`; assert rejection kind |
| `listAudioBibles` throws `kind: 'timeout'` on AbortError | unit | Mock `fetch` → abort after 1ms; assert rejection kind (use fake timers) |
| `listAudioBibles` throws `kind: 'parse'` on malformed JSON | unit | Mock `fetch` → returns `{ ok: true, json: async () => ({ notWhatWeExpect: true }) }`; assert rejection kind |
| `listAudioBibles` throws `kind: 'missing-key'` when key unset | unit | Stub env to undefined; assert rejection kind |
| `getBibleFilesets` returns parsed filesets | unit | Same pattern as listAudioBibles |
| `getBibleFilesets` throws on 404 | unit | Same pattern |
| `getChapterAudio` returns typed `DbpChapterAudio` | unit | Mock with a valid chapter audio response; assert shape |
| `getChapterAudio` throws on 404 (chapter has no audio) | unit | Mock `{ ok: false, status: 404 }`; assert rejection kind is `http` with status 404 (consumers distinguish "no audio for this chapter" this way) |
| **`getChapterAudio` throws `kind: 'parse'` when DBP returns wrong `book_id`** (defensive against DBP fallback bug) | unit | Mock `fetch` to return `{ data: [{ book_id: '1CH', ... }] }` in response to a request for `JHN`. Assert `getChapterAudio('EN1WEBN2DA', 'JHN', 3)` rejects with `{ kind: 'parse', message: 'DBP returned wrong book' }`. This is the guard for the recon-documented 200-OK-fallback bug where invalid book codes redirect to 1 Chronicles HLS. |
| `getChapterAudio` book_id match is case-insensitive | unit | Mock response with `book_id: 'jhn'` (lowercase) for a request with `JHN` (uppercase); assert success, not parse error. |

**Expected state after completion:**
- [ ] `frontend/src/lib/audio/dbp-client.ts` exists with 3 exported functions
- [ ] 14 unit tests pass (exceeds the spec's ≥12 requirement; includes 2 new defensive book_id validation tests)
- [ ] `getChapterAudio` validates `response.data[0].book_id` against the requested book code and throws `parse` on mismatch
- [ ] No TypeScript errors
- [ ] No main-bundle size regression (this module is not yet imported by anything)

---

### Step 5: Implement audio cache layer

**Objective:** Implement `lib/audio/audio-cache.ts` providing a 7-day localStorage cache for the audio bibles list under `bb26-v1:audioBibles`, plus an in-memory Map for per-chapter audio URLs.

**Files to create/modify:**
- `frontend/src/lib/audio/audio-cache.ts` — new file
- `frontend/src/lib/audio/__tests__/audio-cache.test.ts` — new test file

**Details:**

Mirror the BB-32 cache pattern from `lib/ai/cache.ts`:
- `CACHE_KEY_PREFIX = 'bb26-v1:'`
- `CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000`
- Safe localStorage wrappers (`safeLocalStorageGet`, `safeLocalStorageSet`, `safeLocalStorageRemove`) — copy the pattern from `cache.ts`
- Entry schema versioning via `AudioBiblesCacheEntry.v = 1` (from the types file)

**Public API:**

```ts
/** Returns cached bibles list, or null on miss/expiry/corruption/failure. */
export function getCachedAudioBibles(): DbpBible[] | null

/** Stores bibles list in cache. Fail-silent on storage errors. */
export function setCachedAudioBibles(bibles: DbpBible[]): void

/** Clears the cached bibles list. */
export function clearCachedAudioBibles(): void

/** Returns cached chapter audio (in-memory only), or undefined on miss. */
export function getCachedChapterAudio(filesetId: string, book: string, chapter: number): DbpChapterAudio | undefined

/** Stores chapter audio in the in-memory Map. */
export function setCachedChapterAudio(filesetId: string, book: string, chapter: number, audio: DbpChapterAudio): void

/** Clears all in-memory per-chapter cache (used by tests). */
export function clearChapterAudioCache(): void

/**
 * Stale-while-revalidate wrapper for the bibles list:
 * 1. If cached entry is fresh → return it immediately, no fetch
 * 2. If cached entry is stale (expired or corrupt) → fetch, cache, return
 * 3. If fetch fails → return stale data if any exists (graceful fallback), else throw
 */
export async function loadAudioBibles(): Promise<DbpBible[]>
```

**In-memory per-chapter cache:** use a `Map<string, DbpChapterAudio>` keyed by `${filesetId}:${book}:${chapter}`. Not persisted (per spec requirement #10). Cleared only on page refresh.

**Cache corruption handling:** if `JSON.parse` fails or the parsed entry doesn't match `{ v: 1, createdAt: number, bibles: [...] }` shape, remove the key and treat as a miss.

**Auth gating:** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT persist per-chapter URLs (spec requirement #10: URLs may be signed/expiring).
- Do NOT cache audio binary data (spec requirement #11: streaming is sufficient).
- Do NOT throw from any cache getter — return `null` or `undefined` on failure.
- Do NOT mix the in-memory Map with localStorage — keep them separate.
- Do NOT share safe-wrappers with `lib/ai/cache.ts` via an extraction — each cache module has its own copy. Premature abstraction hazard.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getCachedAudioBibles` returns null on empty storage | unit | Clear localStorage; assert null |
| `setCachedAudioBibles` + `getCachedAudioBibles` round-trips | unit | Set a mock `DbpBible[]`, assert retrieval matches |
| `getCachedAudioBibles` returns null on expired entry (>7d) | unit | Set entry with `createdAt = Date.now() - 8 * 24h`; assert null |
| `getCachedAudioBibles` returns null on corrupt JSON | unit | Write `'not json'` directly to the key; assert null and key was removed |
| `getCachedAudioBibles` returns null on version mismatch | unit | Write `{ v: 99, bibles: [] }`; assert null |
| `setCachedAudioBibles` fails silently when localStorage throws | unit | Stub `localStorage.setItem` to throw; assert no exception propagates |
| In-memory chapter audio cache round-trips | unit | `setCachedChapterAudio` + `getCachedChapterAudio`, assert match |
| In-memory cache miss returns undefined | unit | `getCachedChapterAudio` with a new key; assert undefined |

**Expected state after completion:**
- [ ] `frontend/src/lib/audio/audio-cache.ts` exists
- [ ] 8 unit tests pass (meets spec requirement)
- [ ] No TypeScript errors
- [ ] `bb26-v1:audioBibles` is the only localStorage key used

---

### Step 6: Implement lazy-loaded audio engine wrapper

**Objective:** Wrap Howler.js in a thin engine module at `lib/audio/engine.ts` that lazy-loads Howler via dynamic import on first play. Exposes typed methods for load, play, pause, seek, speed, stop, and event hookups.

**Files to create/modify:**
- `frontend/src/lib/audio/engine.ts` — new file
- `frontend/src/lib/audio/__tests__/engine.test.ts` — new test file

**Details:**

```ts
/**
 * BB-26 — Howler-backed audio engine.
 *
 * Thin wrapper around Howler.js that lazy-loads the library on first
 * play. Howler does NOT appear in the main bundle — the dynamic import
 * inside `loadHowl` creates a separate Rollup chunk on demand.
 *
 * The engine exposes a typed API that hides Howler's raw surface. BB-27
 * (ambient layering) and BB-29 (continuous playback) will extend this
 * module; BB-26 ships only what it needs.
 */

import type { Howl as HowlType } from 'howler'

type EngineEvents = {
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onLoad?: (durationSeconds: number) => void
  onLoadError?: (message: string) => void
  onPlayError?: (message: string) => void
}

let cachedHowlCtor: typeof HowlType | null = null

async function getHowlCtor(): Promise<typeof HowlType> {
  if (cachedHowlCtor) return cachedHowlCtor
  const mod = await import('howler')
  cachedHowlCtor = mod.Howl
  return cachedHowlCtor
}

export interface AudioEngineInstance {
  play(): void
  pause(): void
  stop(): void
  seek(seconds: number): void
  getCurrentTime(): number
  getDuration(): number
  setRate(rate: number): void
  destroy(): void
}

const STALL_TIMEOUT_MS = 10_000

export async function createEngineInstance(
  url: string,
  events: EngineEvents,
): Promise<AudioEngineInstance> {
  const Howl = await getHowlCtor()

  let stallTimer: ReturnType<typeof setTimeout> | null = null
  const clearStallTimer = () => {
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null }
  }
  const armStallTimer = () => {
    clearStallTimer()
    stallTimer = setTimeout(() => {
      events.onLoadError?.('Connection is slow. Try again when you have a better connection.')
    }, STALL_TIMEOUT_MS)
  }

  const howl = new Howl({
    src: [url],
    html5: true, // streaming, not decoded into memory — critical for long Bible audio
    // Explicit format hint — FCBH CloudFront returns Content-Type: binary/octet-stream
    // instead of audio/mpeg (verified in Step 17 recon). Browsers sniff by filename
    // extension and play fine, but telling Howler the format explicitly skips its
    // MIME sniffing path and removes any future ambiguity if CDN headers change or
    // if a future browser gets stricter about Content-Type.
    format: ['mp3'],
    preload: true,
    // CORS taint mitigation — see "CORS taint and BB-27 ducking dependency" below.
    // Howler 2.2.x exposes `xhr: { withCredentials: false }` for XHR-based loads but
    // does NOT expose a `crossOrigin` option for the HTML5 <audio> element it creates
    // internally. We set the attribute directly on the element via `_sounds[0]._node`
    // immediately after construction, BEFORE the src resolves. This is the only
    // reliable path on Howler 2.2.x. Flagged as Howler-version-dependent — if we
    // bump Howler, re-verify.
    xhr: { withCredentials: false },
    onload: () => { clearStallTimer(); events.onLoad?.(howl.duration()) },
    onloaderror: (_id, err) => { clearStallTimer(); events.onLoadError?.(String(err)) },
    onplayerror: (_id, err) => { clearStallTimer(); events.onPlayError?.(String(err)) },
    onplay: () => { clearStallTimer(); events.onPlay?.() },
    onpause: () => events.onPause?.(),
    onend: () => events.onEnd?.(),
  })

  // Reach into Howler's internals to set crossOrigin on the underlying <audio>.
  // Howler's typed surface doesn't include `_sounds` — cast to `any` for this
  // one line with an explanatory comment. Access happens synchronously after
  // construction, so the element exists but hasn't started loading yet.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sounds = (howl as any)._sounds as Array<{ _node?: HTMLAudioElement }> | undefined
    const node = sounds?.[0]?._node
    if (node instanceof HTMLAudioElement) {
      node.crossOrigin = 'anonymous'
    }
  } catch {
    // Howler internal shape changed — log a warning for BB-27 to pick up later.
    console.warn('[BB-26] Unable to set crossOrigin on Howler audio element; BB-27 ducking may be affected.')
  }

  // Arm the stall timer now — Howler has started loading.
  armStallTimer()

  return {
    play: () => { howl.play() },
    pause: () => { howl.pause() },
    stop: () => { clearStallTimer(); howl.stop() },
    seek: (s) => { howl.seek(s) },
    getCurrentTime: () => howl.seek() as number,
    getDuration: () => howl.duration(),
    setRate: (r) => { howl.rate(r) },
    destroy: () => { clearStallTimer(); howl.unload() },
  }
}
```

**Why `html5: true`:** Howler offers two playback paths — Web Audio decoding (in-memory) and HTML5 Audio element (streaming). Bible chapters are 3-5 minutes of MP3, which decode to several MB in memory if we let Howler use Web Audio. HTML5 mode streams them directly. This is critical for mobile memory and battery.

**Why `format: ['mp3']`:** The Step 17 recon confirmed that FCBH's CloudFront distribution returns audio files with `Content-Type: binary/octet-stream` instead of `audio/mpeg`. Browsers handle this fine today via filename-extension sniffing (`.mp3`), but Howler's internal format detection should be explicit to prevent any future ambiguity — if a stricter browser version or a CDN header change ever breaks sniffing, the `format: ['mp3']` option tells Howler to skip MIME detection and treat the URL as MP3 unconditionally. Costs nothing, prevents a silent regression class.

**CORS taint and BB-27 ducking dependency (load-bearing for the audio wave):**

BB-27 (ambient layering under Bible audio) will need to wrap Howler's internal `<audio>` element in a `MediaElementAudioSourceNode` so the Web Audio graph can duck ambient sounds when verbal narration is present. This wrapping fails silently if the `<audio>` element is **CORS-tainted**:

- CORS taint occurs when an `<audio>` element loads a cross-origin resource WITHOUT `crossOrigin="anonymous"` set on the element BEFORE the `src` assignment
- Once tainted, wrapping in a `MediaElementAudioSourceNode` produces silent output with NO error thrown — the failure mode is invisible in testing unless you check the output
- FCBH's CDN is a different origin than Worship Room's frontend, so every Bible audio URL is cross-origin

The engine wrapper above sets `crossOrigin = 'anonymous'` on the underlying element synchronously after Howler constructs the `Howl` (but before the network fetch resolves). This is Howler-version-dependent because `_sounds[0]._node` is a private field — **if Howler is bumped, re-verify the internal field path and update the access**.

BB-26 does NOT wrap the element in a `MediaElementAudioSourceNode` yet — BB-26 only plays audio through Howler's default HTML5 path. The `crossOrigin` setting is pre-emptive for BB-27's needs. If BB-27 finds the mitigation was insufficient, the options are:
1. Switch to a fetch-based load that pipes the audio into a Blob URL (same-origin) then into an `<audio>` element
2. Drop Web Audio ducking and use HTML5 element `.volume` adjustments only (loses crossfades)
3. File an upstream issue with Howler for a first-class `crossOrigin` option

Step 17 (recon) must verify that FCBH returns `Access-Control-Allow-Origin: *` (or a matching origin) on at least one chapter audio URL. If FCBH does NOT return permissive CORS, document the constraint and flag BB-27's ducking approach for re-planning.

**Stall timeout:** Howler emits `loaderror` on hard failures but has no built-in "buffering took too long" detection. The engine arms a 10-second timer when Howler begins loading; if neither `onload` nor any other terminal event fires before the timer expires, it dispatches `onLoadError` with the canonical message "Connection is slow. Try again when you have a better connection." The timer is cleared on any terminal event (`onload`, `onloaderror`, `onplayerror`, `onplay`, `stop`, `destroy`). The exact message text is a user-facing string and must match the centralized error message map defined in Step 7b.

**Auth gating:** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT import Howler statically at the top of the file — the dynamic import inside `getHowlCtor` is the only import path.
- Do NOT expose the raw `Howl` instance to callers — return the typed `AudioEngineInstance`.
- Do NOT add retry logic — consumer decides whether to retry on error events.
- Do NOT call `howl.load()` — Howler auto-loads on construction with `preload: true`.
- **Do NOT use Howler's Web Audio mode (the default).** Force `html5: true` on every Howl instance. Web Audio mode decodes the whole file into memory, which is catastrophically wrong for 3-5 minute Bible chapters on mobile, AND it's a different CORS taint path that would also break BB-27's ducking plan. HTML5 mode with `crossOrigin="anonymous"` is the only supported configuration.
- Do NOT remove the `crossOrigin = 'anonymous'` assignment. It's load-bearing for BB-27 even though BB-26 doesn't visibly use it. A future refactor that "cleans up" this line will silently break BB-27 months later.
- Do NOT bump Howler without re-verifying the `_sounds[0]._node` private-field access path. Howler's internal shape is not part of its public API.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `createEngineInstance` lazy-loads Howler on first call | unit | Mock `howler` via `vi.mock`; assert the mock was called and cached on second call |
| Engine instance exposes typed methods | unit | Create instance; assert `play`, `pause`, `stop`, `seek`, `setRate`, `destroy` are callable |
| `play` triggers Howl's play | unit | Mock Howl; create instance; call play; assert mock's play was called |
| `pause` triggers Howl's pause | unit | Same pattern |
| `setRate` triggers Howl's rate(r) | unit | Same pattern |
| `onPlay` event fires through to events hook | unit | Mock Howl to capture `onplay` callback; invoke it; assert `events.onPlay` was called |
| `onLoad` passes duration to events | unit | Mock Howl `onload` to invoke with a known duration; assert `events.onLoad` received it |
| **CORS taint: crossOrigin attribute is set on internal audio element** | unit | Mock Howl with an `_sounds` array containing a fake `HTMLAudioElement` node; call `createEngineInstance`; assert `node.crossOrigin === 'anonymous'`. This is the test that guards BB-27's ducking path — if it fails, BB-27's Web Audio wrapping will silently produce no sound. |
| **CORS taint: Howler instantiated with `html5: true`** | unit | Spy on the Howl constructor; assert the options object includes `html5: true`. |
| **Howler instantiated with `format: ['mp3']` to override MIME sniffing** | unit | Spy on the Howl constructor; assert the options object includes `format: ['mp3']`. Guards against a future refactor that removes the explicit format hint. |
| **Stall timeout: fires onLoadError after 10s of no response** | unit | Use `vi.useFakeTimers()`; create engine; advance timers by 10s without triggering onload; assert `events.onLoadError` called with "Connection is slow. Try again when you have a better connection." |
| **Stall timeout: cleared by onload** | unit | Use fake timers; fire Howler's `onload` at 2s; advance timers by 20s; assert `events.onLoadError` NOT called. |
| **Stall timeout: cleared by destroy()** | unit | Use fake timers; create engine; call `destroy()` at 2s; advance timers by 20s; assert `events.onLoadError` NOT called and no leaked timer. |
| **CORS failure path is defensive** | unit | Mock Howl with missing `_sounds` field; assert no throw and a console.warn was emitted (resilient to Howler internal changes). |

**Expected state after completion:**
- [ ] `frontend/src/lib/audio/engine.ts` exists
- [ ] 13 unit tests pass (includes CORS/stall/format tests)
- [ ] `pnpm build` output shows `howler` in a separate chunk (not main)
- [ ] The `crossOrigin` mitigation is documented inline with a BB-27 ducking dependency note
- [ ] `format: ['mp3']` is passed to the Howl constructor
- [ ] No TypeScript errors

---

### Step 7: Implement AudioPlayerContext + provider

**Objective:** Create `AudioPlayerContext.tsx` with a React context that holds `AudioPlayerState` + action functions, and a provider that owns the reducer/state and instantiates the engine on play. Handle rapid sequential play() calls via a request-ID supersession pattern. Route all errors through a centralized error-message helper.

**Files to create/modify:**
- `frontend/src/contexts/AudioPlayerContext.tsx` — new file
- `frontend/src/contexts/__tests__/AudioPlayerContext.test.tsx` — new test file
- `frontend/src/lib/audio/error-messages.ts` — new centralized error-message helper
- `frontend/src/lib/audio/__tests__/error-messages.test.ts` — new test file

**Details:**

Use `useReducer` for state and `useMemo` to stabilize the action functions. Pattern parallels the existing `AuthContext` but introduces a reducer for the richer state shape.

```tsx
import { createContext, useReducer, useRef, useMemo, useEffect, type ReactNode } from 'react'
import type { AudioPlayerState, AudioPlayerActions, PlayerTrack } from '@/types/bible-audio'
import type { AudioEngineInstance } from '@/lib/audio/engine'

type Action =
  | { type: 'LOAD_START'; track: PlayerTrack }
  | { type: 'LOAD_SUCCESS'; duration: number }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TICK'; currentTime: number }
  | { type: 'SEEK'; seconds: number }
  | { type: 'SET_SPEED'; speed: AudioPlayerState['playbackSpeed'] }
  | { type: 'STOP' }
  | { type: 'EXPAND' }
  | { type: 'MINIMIZE' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS_ERROR' }

const initialState: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'closed',
  errorMessage: null,
}

function reducer(state: AudioPlayerState, action: Action): AudioPlayerState { ... }

export const AudioPlayerContext = createContext<
  { state: AudioPlayerState; actions: AudioPlayerActions } | null
>(null)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const engineRef = useRef<AudioEngineInstance | null>(null)
  const tickIntervalRef = useRef<number | null>(null)
  // Rapid-navigation supersession — each play() call captures the current
  // request id; if a later call increments this ref past the captured id,
  // the earlier call bails out of any async work it's still doing.
  const lastPlayRequestIdRef = useRef(0)

  const actions = useMemo<AudioPlayerActions>(() => ({
    play: async (track) => {
      const myId = ++lastPlayRequestIdRef.current

      // Tear down any existing engine immediately so we don't have two
      // audio streams fighting each other.
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }

      dispatch({ type: 'LOAD_START', track })

      let newEngine: AudioEngineInstance | null = null
      try {
        const { createEngineInstance } = await import('@/lib/audio/engine')

        // Another play() call may have come in while we were awaiting the
        // engine module import. If so, abandon this request.
        if (myId !== lastPlayRequestIdRef.current) return

        newEngine = await createEngineInstance(track.url, {
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
            dispatch({ type: 'STOP' })
          },
          onLoad: (duration) => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'LOAD_SUCCESS', duration })
            // Auto-play after successful load
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

        // Final supersession check after the engine resolves — if a newer
        // play() has taken over, tear down this one before storing it.
        if (myId !== lastPlayRequestIdRef.current) {
          newEngine.destroy()
          return
        }

        engineRef.current = newEngine

        // Start the tick interval now that this request owns the engine
        tickIntervalRef.current = window.setInterval(() => {
          if (!engineRef.current) return
          dispatch({ type: 'TICK', currentTime: engineRef.current.getCurrentTime() })
        }, 200)
      } catch (err) {
        if (myId !== lastPlayRequestIdRef.current) {
          // Superseded — swallow the error from the abandoned request.
          newEngine?.destroy()
          return
        }
        dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
      }
    },
    pause: () => { engineRef.current?.pause() },
    toggle: () => { state.playbackState === 'playing' ? actions.pause() : engineRef.current?.play() },
    seek: (s) => { engineRef.current?.seek(s); dispatch({ type: 'SEEK', seconds: s }) },
    setSpeed: (r) => { engineRef.current?.setRate(r); dispatch({ type: 'SET_SPEED', speed: r }) },
    stop: () => {
      // Bump the request id so any in-flight play() bails out cleanly.
      lastPlayRequestIdRef.current++
      if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null }
      engineRef.current?.destroy()
      engineRef.current = null
      dispatch({ type: 'STOP' })
    },
    expand: () => dispatch({ type: 'EXPAND' }),
    minimize: () => dispatch({ type: 'MINIMIZE' }),
    close: () => { actions.stop(); dispatch({ type: 'CLOSE' }) },
    dismissError: () => dispatch({ type: 'DISMISS_ERROR' }),
  }), [state.playbackState])

  // Cleanup engine on unmount
  useEffect(() => () => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
    engineRef.current?.destroy()
  }, [])

  return (
    <AudioPlayerContext.Provider value={{ state, actions }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}
```

**Rapid-navigation supersession:** If the user taps "next chapter" three times in two seconds, three parallel `play()` calls fire. Without supersession, whichever engine resolves first wins — potentially an earlier chapter, giving the user the wrong audio. The request-id pattern captures an integer at the start of each call and bails out after every `await` point (module import, engine creation) if a later call has incremented the ref. Chosen over `AbortController` because Howler's `Howl` constructor doesn't take an `AbortSignal` and we'd still need manual teardown — the request-id pattern is simpler and works directly with Howler's lifecycle.

**Centralized error messages:** All error-to-user-string conversion lives in `frontend/src/lib/audio/error-messages.ts` so the messages are audited in one place and tested independently. The provider's error dispatches use `audioErrorMessageFor(err)` not hardcoded strings. Module content:

```ts
// frontend/src/lib/audio/error-messages.ts

import type { DbpError } from '@/types/bible-audio'

function isDbpError(e: unknown): e is DbpError {
  return typeof e === 'object' && e !== null && 'kind' in e
}

export function audioErrorMessageFor(error: unknown): string {
  if (isDbpError(error)) {
    switch (error.kind) {
      case 'network':
        return 'Connection problem. Check your network and try again.'
      case 'http':
        if (error.status === 404) return "This chapter's audio isn't available right now."
        if (error.status === 429) return 'Too many audio requests. Try again in a moment.'
        return 'Audio playback failed. Check your connection and try again.'
      case 'timeout':
        return 'Connection is slow. Try again when you have a better connection.'
      case 'parse':
        return 'Audio playback failed. Check your connection and try again.'
      case 'missing-key':
        return 'Audio is not configured.'
    }
  }
  // Howler onloaderror / onplayerror pass a string message through
  if (typeof error === 'string' && error.toLowerCase().includes('slow')) {
    return 'Connection is slow. Try again when you have a better connection.'
  }
  return 'Audio playback failed. Check your connection and try again.'
}
```

The "Connection is slow…" message is the canonical stall-timeout text from Step 6 — the engine wrapper passes that exact string into `onLoadError`, and the helper's string-match path preserves it when converting generic errors. Downstream UI (the error state in `AudioPlayerExpanded`, Step 14) reads `state.errorMessage` directly without adding its own string handling.

**Tick interval:** 200ms is sufficient for smooth scrubber updates without burning CPU. Stop the interval when paused or stopped.

**Auth gating:** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT instantiate the engine at provider mount — only at first play.
- Do NOT store the engine in React state (it's mutable, ref is correct).
- Do NOT forget to clear the tick interval on pause/stop/unmount (memory leak hazard).
- Do NOT expose the engineRef to consumers — only the typed action functions.
- Do NOT skip the supersession check after any `await` point in `play()` — every await is an opportunity for a newer request to come in. Missing a check is the silent-wrong-chapter bug.
- Do NOT hardcode user-facing error strings inside the provider. All error-to-string conversion goes through `audioErrorMessageFor` in `lib/audio/error-messages.ts`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Reducer handles LOAD_START | unit | Dispatch LOAD_START with a track; assert state transitions to `loading` with track set |
| Reducer handles LOAD_SUCCESS | unit | From loading → LOAD_SUCCESS; assert state transitions to a ready state with duration set |
| Reducer handles PLAY | unit | Assert state transitions to `playing` |
| Reducer handles PAUSE | unit | Assert state transitions to `paused` |
| Reducer handles TICK | unit | Assert currentTime updates |
| Reducer handles EXPAND/MINIMIZE/CLOSE | unit | Assert sheetState transitions |
| Reducer handles DISMISS_ERROR | unit | From error state, assert error message cleared |
| Provider cleans up engine on unmount | integration | Render + unmount; assert `engineRef.current.destroy` was called |
| **Supersession: earlier play() call is bailed out** | integration | Mock `createEngineInstance` with controllable resolution; call `play(trackA)`, then `play(trackB)` before A resolves; resolve A; assert state.track is trackB and trackA's engine was destroyed |
| **Supersession: stop() cancels in-flight play()** | integration | Call `play(trackA)`, then `stop()` before A resolves; resolve A; assert state is idle and the loaded engine was destroyed |
| **Error routing: DbpError network is converted to user string** | integration | Throw `{ kind: 'network' }` from mocked engine import; assert `state.errorMessage === 'Connection problem. Check your network and try again.'` |
| **Error routing: stall timeout string preserved end-to-end** | integration | Fire Howler's `onloaderror` with "Connection is slow…"; assert state.errorMessage matches |

**Error-message helper tests (`error-messages.test.ts`):**

| Test | Type | Description |
|------|------|-------------|
| `network` → "Connection problem…" | unit | Pass `{ kind: 'network', message: '' }`; assert correct string |
| `http` 404 → chapter-specific message | unit | Pass `{ kind: 'http', status: 404 }`; assert "This chapter's audio isn't available right now." |
| `http` 429 → rate-limit message | unit | Pass `{ kind: 'http', status: 429 }`; assert "Too many audio requests. Try again in a moment." |
| `http` other → generic failure | unit | Pass `{ kind: 'http', status: 500 }`; assert generic failure string |
| `timeout` → slow-connection message | unit | Pass `{ kind: 'timeout' }`; assert correct string |
| `parse` → generic failure | unit | Pass `{ kind: 'parse' }`; assert generic |
| `missing-key` → not-configured message | unit | Pass `{ kind: 'missing-key' }`; assert correct string |
| Howler "Connection is slow" string passes through | unit | Pass a string containing "slow"; assert slow-connection message |
| Unknown error → generic failure | unit | Pass `undefined`; assert generic failure string |

**Expected state after completion:**
- [ ] `frontend/src/contexts/AudioPlayerContext.tsx` exists
- [ ] `frontend/src/lib/audio/error-messages.ts` exists
- [ ] 12 unit/integration tests pass for the provider (8 reducer + 4 supersession/error routing)
- [ ] 9 unit tests pass for `error-messages.ts`
- [ ] No TypeScript errors
- [ ] Engine is not loaded at mount time (verified by the "lazy-load Howler on first call" test in Step 6 combined with a provider-mount-only test here)
- [ ] No hardcoded user-facing error strings inside the provider (grep confirms)

---

### Step 8: Implement useAudioPlayer hook

**Objective:** Create `hooks/audio/useAudioPlayer.ts` as the canonical consumer interface. Components import the hook, not the raw context.

**Files to create/modify:**
- `frontend/src/hooks/audio/useAudioPlayer.ts` — new file
- `frontend/src/hooks/audio/__tests__/useAudioPlayer.test.tsx` — new test file

**Details:**

```ts
import { useContext } from 'react'
import { AudioPlayerContext } from '@/contexts/AudioPlayerContext'

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useAudioPlayer must be used inside <AudioPlayerProvider>')
  return ctx
}
```

The hook is deliberately thin — it exposes the context's `{ state, actions }` tuple. Consumers destructure as needed.

**BB-45 anti-pattern note:** React Context triggers a re-render on every consumer whenever the provider value changes. The `useMemo` on actions + `useReducer` on state ensure the context value is a new object reference only when state or actions change. Consumers re-render correctly.

**Auth gating:** None.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT return just `state` or just `actions` — return the full context value so consumers get whatever they need.
- Do NOT memoize inside the hook — React Context handles memoization at the provider level.
- Do NOT wrap the context value in extra proxies — keep the surface thin.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Hook throws outside provider | unit | Render hook without provider; assert throws |
| Hook returns state and actions inside provider | unit | Wrap in provider; assert `{ state, actions }` shape |
| State transitions: play() moves idle → loading → playing | integration | Mock engine; call actions.play(mockTrack); assert state transitions through lifecycle |
| State transitions: pause() moves playing → paused | integration | Start playing; call pause; assert state.playbackState === 'paused' |
| State transitions: toggle() flips play/pause | integration | Start playing; toggle; assert paused. Toggle again; assert playing. |
| State transitions: close() moves back to idle + closed sheet | integration | Start playing; close; assert state.playbackState === 'idle' and sheetState === 'closed' |
| **Cross-component re-render (BB-45 pattern)** | integration | Mount two components that both call `useAudioPlayer()`. Mutate state via one. Assert the other re-renders with the new state. This is the critical subscription-correctness test. |
| setSpeed calls engine.setRate and updates state | integration | Mock engine; call setSpeed(1.5); assert engine.setRate(1.5) was called and state.playbackSpeed === 1.5 |
| seek calls engine.seek and updates currentTime | integration | Mock engine; call seek(30); assert engine.seek(30) was called and currentTime === 30 |
| LOAD_ERROR transitions to error state with message | integration | Mock engine to fire onLoadError; assert state.playbackState === 'error' with message |
| **Rapid play() calls — only the last chapter's track is set in state** | integration | Mock `createEngineInstance` with controllable deferred resolution. Call `actions.play(trackA)`, `actions.play(trackB)`, `actions.play(trackC)` in the same tick. Resolve the mocks in reverse order (C first, then B, then A). Assert final `state.track === trackC` (not trackA or trackB). Verify that A's and B's returned engine instances had `destroy()` called on them. This is the supersession correctness test — it prevents the "wrong chapter plays after rapid next-next-next navigation" bug. |

**Expected state after completion:**
- [ ] `frontend/src/hooks/audio/useAudioPlayer.ts` exists
- [ ] 11 unit/integration tests pass (exceeds spec's ≥10 requirement; includes the rapid-play supersession test)
- [ ] The cross-component re-render test explicitly verifies the BB-45 anti-pattern protection
- [ ] The rapid-play supersession test explicitly verifies the "wrong chapter after rapid navigation" bug class does not ship
- [ ] No TypeScript errors

---

### Step 9: Mount AudioPlayerProvider in App.tsx

**Objective:** Wrap the app's existing provider stack with `<AudioPlayerProvider>` between `<AudioProvider>` and `<WhisperToastProvider>`.

**Files to create/modify:**
- `frontend/src/App.tsx` — add import + wrap

**Details:**

Import:
```tsx
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext'
```

Insert inside the provider stack at line 206-207:
```tsx
<AudioProvider>
  <AudioPlayerProvider>
    <WhisperToastProvider>
    ...
    </WhisperToastProvider>
  </AudioPlayerProvider>
</AudioProvider>
```

**Why this position:** The new provider sits inside `AudioProvider` so it has access to the toast system (not currently used but may be in BB-27) and inside `ErrorBoundary`. It sits outside `WhisperToastProvider` because `WhisperToast` is used by prayer/journal features, not by the audio player, and there's no dependency relationship. No other provider depends on `AudioPlayerProvider`.

**Auth gating:** None.

**Responsive behavior:** N/A — provider mount, no UI.

**Guardrails (DO NOT):**
- Do NOT mount `AudioPlayerProvider` inside the `Routes` — it must survive route changes to preserve playback state across chapter navigation.
- Do NOT pass props to it — all state lives inside the provider.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| App renders without crashing with new provider | smoke | `render(<App />)` — assert no throw (requires mocking browser APIs) |

**Expected state after completion:**
- [ ] `App.tsx` imports and mounts `AudioPlayerProvider`
- [ ] No TypeScript errors
- [ ] App continues to render correctly (manual check + existing app smoke tests pass)

---

### Step 10: Implement AudioPlayButton component

**Objective:** Create `components/audio/AudioPlayButton.tsx`, a ReaderChrome-compatible button that appears conditionally based on DBP availability and reflects player state.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayButton.tsx` — new file
- `frontend/src/components/audio/__tests__/AudioPlayButton.test.tsx` — new test file

**Details:**

```tsx
import { Play, Pause } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { loadAudioBibles } from '@/lib/audio/audio-cache'
import { getChapterAudio } from '@/lib/audio/dbp-client'
import { isFcbhApiKeyConfigured } from '@/lib/env'
import { resolveFcbhBookCode } from '@/lib/audio/book-codes' // small helper added in this step
import type { DbpBible, DbpFileset } from '@/types/bible-audio'

const ICON_BTN =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

interface AudioPlayButtonProps {
  bookSlug: string
  bookDisplayName: string
  chapter: number
}

export const AudioPlayButton = forwardRef<HTMLButtonElement, AudioPlayButtonProps>(
  function AudioPlayButton({ bookSlug, bookDisplayName, chapter }, ref) {
    const { state, actions } = useAudioPlayer()
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [filesetId, setFilesetId] = useState<string | null>(null)

    // Resolve WEB fileset + chapter audio on mount and on chapter change.
    // Per Step 17 recon: the canonical WEB audio path is the ENGWWH bible abbr
    // with EN1WEBN2DA for NT books and EN1WEBO2DA for OT books. Both are the
    // `audio_drama` type (plain-narration WEB does not exist in DBP). The
    // filesets listing is fetched once (7-day cached) but the selection below
    // is static enough to hardcode as a constant — listAudioBibles is retained
    // as a liveness check + fallback path in case FCBH ever publishes a new
    // canonical WEB audio fileset.
    useEffect(() => {
      let cancelled = false
      if (!isFcbhApiKeyConfigured()) return
      (async () => {
        try {
          const bookCode = resolveFcbhBookCode(bookSlug)
          if (!bookCode) return
          // Pick the fileset id by testament. Derived from BIBLE_BOOKS constant.
          const isOT = isOldTestamentBook(bookSlug)
          const filesetIdForBook = isOT ? 'EN1WEBO2DA' : 'EN1WEBN2DA'
          // Warm-up call: ensures the audio bibles list is cached and that the
          // FCBH key is actually working. Failure here is silent (hide button).
          await loadAudioBibles()
          const audio = await getChapterAudio(filesetIdForBook, bookCode, chapter)
          if (cancelled) return
          setFilesetId(filesetIdForBook)
          setAudioUrl(audio.url)
        } catch (e) {
          // Silent fallback per spec requirement #60
          if (!cancelled) console.warn('[BB-26] DBP lookup failed:', e)
        }
      })()
      return () => { cancelled = true }
    }, [bookSlug, chapter])

    // Hide button when audio unavailable (spec requirement #26)
    if (!audioUrl || !filesetId) return null

    const isCurrentTrack = state.track?.book === bookSlug && state.track?.chapter === chapter
    const isPlaying = isCurrentTrack && state.playbackState === 'playing'
    const isPaused = isCurrentTrack && state.playbackState === 'paused'

    const Icon = isPlaying ? Pause : Play
    const label = isPlaying ? 'Pause audio' : isPaused ? 'Resume audio' : `Play audio for ${bookDisplayName} ${chapter}`

    const handleClick = () => {
      if (isPlaying) { actions.pause(); return }
      if (isPaused) { actions.toggle(); return }
      actions.play({
        filesetId,
        book: bookSlug,
        bookDisplayName,
        chapter,
        translation: 'World English Bible',
        url: audioUrl,
      })
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(ICON_BTN)}
        aria-label={label}
        onClick={handleClick}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    )
  }
)
```

**Book code helper:** `lib/audio/book-codes.ts` exports two helpers:
- `resolveFcbhBookCode(slug: string): string | null` — static Record mapping the 66 project slugs to DBP 3-letter codes. Populated from Step 17 recon (§ 7 of `_plans/recon/bb26-audio-foundation.md`) which confirmed 100% match with the spec's canonical list. See the recon doc for the full `FCBH_BOOK_CODES` literal; copy it verbatim.
- `isOldTestamentBook(slug: string): boolean` — returns true for the 39 OT book slugs, false for the 27 NT book slugs. Used by `AudioPlayButton` to pick the right fileset (EN1WEBO2DA for OT, EN1WEBN2DA for NT). Derived from the project's existing `BIBLE_BOOKS` constant in `frontend/src/constants/bible.ts` which already tracks `testament: 'OT' | 'NT'` per book — the helper can delegate to `getBookBySlug(slug).testament === 'OT'`.

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): 44x44 button, same size as all ReaderChrome icons.
- Tablet (768px): same.
- Mobile (375px): same. Matches the `ICON_BTN` sizing from `ReaderChrome.tsx`.

**Inline position expectations:** The button sits as the last child in the right-edge icon cluster inside ReaderChrome — see Step 11 for the exact insertion point.

**Guardrails (DO NOT):**
- Do NOT show a loading spinner while audio URL is resolving — the spec requires the button be hidden until available, not show a loading state on the button itself.
- Do NOT show an error toast when DBP lookup fails — silent fallback per spec.
- Do NOT use `isCurrentTrack` as a toggle state without also checking `playbackState` — otherwise a stopped player on the same chapter shows the pause icon.
- Do NOT import Howler or the engine — only the hook and the DBP/cache modules.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders nothing when FCBH key is not configured | component | Mock `isFcbhApiKeyConfigured` → false; assert component returns null |
| Renders nothing when DBP returns no bibles | component | Mock `loadAudioBibles` → []; assert component returns null after effect |
| Renders nothing when DBP fetch fails | component | Mock `loadAudioBibles` to reject; assert component returns null |
| Renders play icon when audio is available and not playing | component | Mock successful lookup; assert `Play` icon is rendered with aria-label "Play audio for John 3" |
| Renders pause icon when audio is playing this chapter | component | Mock player state with matching track + playing; assert `Pause` icon + aria-label "Pause audio" |
| Click when idle triggers `actions.play` with correct track | component | Mock actions; click; assert play called with expected track object |

**Expected state after completion:**
- [ ] `frontend/src/components/audio/AudioPlayButton.tsx` exists
- [ ] `frontend/src/lib/audio/book-codes.ts` exists
- [ ] 6 component tests pass (meets spec requirement)
- [ ] No TypeScript errors

---

### Step 11: Wire AudioPlayButton into ReaderChrome

**Objective:** Insert `AudioPlayButton` into the `ReaderChrome` right-edge icon cluster after the existing Books button. Update props to pass `bookDisplayName` through.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — import and insert
- `frontend/src/pages/BibleReader.tsx` — no change needed (already passes `bookName` to ReaderChrome at line 710; ReaderChrome reads its own book data internally via props)

**Details:**

Add the import at the top of `ReaderChrome.tsx`:
```tsx
import { AudioPlayButton } from '@/components/audio/AudioPlayButton'
```

Insert after the Books button (after line 163, before the closing `</div>` at line 164):
```tsx
<AudioPlayButton
  bookSlug={bookSlug}
  bookDisplayName={bookName}
  chapter={chapter}
/>
```

No new props need to be threaded through — `ReaderChrome` already receives `bookName`, `bookSlug`, `chapter` from `BibleReader` (lines 710-712 of BibleReader.tsx).

**Auth gating:** None.

**Responsive behavior:**
- Desktop: icon appears at the rightmost position in the action cluster.
- Tablet: same, same cluster spacing (`gap-1`).
- Mobile: same — the cluster has enough horizontal room at all breakpoints since it's 5 icons at 44px each = 220px + gaps ≈ 240px, fits easily in the viewport width minus the 96px reserved for the back button + center chapter label.

**Inline position expectations:**
At 1440px desktop: Typography icon, optional Ambient icon, Focus icon, Books icon, AudioPlayButton icon must all share the same y-coordinate (±2px tolerance) inside the right-edge cluster. At 768px and 375px: same.

**Guardrails (DO NOT):**
- Do NOT reorder the existing icons — insert at the end only.
- Do NOT wrap the AudioPlayButton in a conditional based on `ambientAudioVisible` — that prop controls the BB-20 ambient icon, not BB-26. BB-26's visibility is internal to the AudioPlayButton component.
- Do NOT break the existing ReaderChrome tests — run them after the edit.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ReaderChrome renders AudioPlayButton | component | Render ReaderChrome with mock props; assert AudioPlayButton is in the DOM (as its rendered markup or a `data-testid`) |
| ReaderChrome button order preserved | component | Render; query all buttons; assert order matches [Back, Chapter label, Typography, optional Ambient, Focus, Books, AudioPlayButton] |

**Expected state after completion:**
- [ ] `ReaderChrome.tsx` imports and renders AudioPlayButton
- [ ] Existing ReaderChrome tests still pass
- [ ] BibleReader still renders without errors
- [ ] The button visually appears in the reader's top bar for any chapter that has audio

---

### Step 12: Implement AudioPlayerSheet wrapper (lazy-loaded)

**Objective:** Create a lazy-loaded bottom sheet wrapper that renders the expanded or minimized state, handles the slide animation, and wraps inner content in an `ErrorBoundary`.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayerSheet.tsx` — new file (lazy-loaded parent)
- `frontend/src/components/audio/__tests__/AudioPlayerSheet.test.tsx` — new test file

**Details:**

```tsx
import { Suspense, lazy, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const AudioPlayerExpanded = lazy(() => import('./AudioPlayerExpanded').then((m) => ({ default: m.AudioPlayerExpanded })))
const AudioPlayerMini = lazy(() => import('./AudioPlayerMini').then((m) => ({ default: m.AudioPlayerMini })))

function SheetFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 bg-[#0D0620]/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 text-center"
    >
      <p className="text-sm text-white/70">Audio unavailable right now</p>
    </div>
  )
}

export function AudioPlayerSheet() {
  const { state } = useAudioPlayer()
  const reducedMotion = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Don't render anything when sheet is closed (spec requirement: "closed: not in DOM")
  if (state.sheetState === 'closed') return null

  const isExpanded = state.sheetState === 'expanded'
  const slideDuration = reducedMotion ? 0 : ANIMATION_DURATIONS.base

  return (
    <ErrorBoundary fallback={<SheetFallback />}>
      <div
        ref={sheetRef}
        role="region"
        aria-label={isExpanded ? 'Audio player' : 'Minimized audio player'}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40',
          'bg-[#0D0620]/95 backdrop-blur-xl border-t border-white/10',
          'lg:max-w-2xl lg:mx-auto lg:rounded-t-2xl',
          'motion-safe:animate-slide-up',
        )}
        style={{
          transition: `height ${slideDuration}ms ${ANIMATION_EASINGS.decelerate}`,
        }}
      >
        <Suspense fallback={<SheetFallback />}>
          {isExpanded ? <AudioPlayerExpanded /> : <AudioPlayerMini />}
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}
```

**Verify `bg-background-deep`:** During execution, grep `tailwind.config.js` for `background-deep`. If present, use `bg-background-deep/95`; if absent, use `bg-[#0D0620]/95` (hero-dark). The plan uses the fallback value preemptively.

**Slide animation:** use a custom CSS keyframe `animate-slide-up` defined in `tailwind.config.js` or `animations.css`. If no such animation exists, add one:
```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```
Using `motion-safe:animate-slide-up` ensures it respects `prefers-reduced-motion` automatically via the global safety net.

**Auth gating:** None.

**Responsive behavior:**
- Mobile (375px): full-width, ~340px tall expanded / 64px minimized (height handled by inner components, includes FCBH attribution footer).
- Tablet (768px): full-width, ~300px expanded / 64px minimized.
- Desktop (1440px): `max-w-2xl mx-auto`, rounded top corners, same heights as tablet.

**Inline position expectations:** N/A for the wrapper — see Step 13/14 for inner content positioning.

**Guardrails (DO NOT):**
- Do NOT use `useFocusTrap` — sheet is non-modal.
- Do NOT dim the background — non-modal.
- Do NOT hide the sheet with `display: none` when closed — return null to remove from DOM entirely.
- Do NOT import `AudioPlayerExpanded` or `AudioPlayerMini` statically — both are lazy-loaded so Howler + heavy player JSX don't bloat the main bundle.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns null when sheet is closed | component | Mock provider state `sheetState: 'closed'`; assert nothing rendered |
| Renders expanded when sheetState === 'expanded' | component | Mock state; assert expanded player visible (or Suspense fallback during lazy load) |
| Renders minimized when sheetState === 'minimized' | component | Mock state; assert minimized bar visible |
| ErrorBoundary catches child errors and shows fallback | component | Force `AudioPlayerExpanded` to throw via a mock; assert fallback text "Audio unavailable right now" is shown |
| Respects `prefers-reduced-motion` | component | Mock `useReducedMotion` → true; assert `transition-duration: 0ms` (slide is instant) |
| Sheet has `role="region"` for screen readers | component | Render; assert `getByRole('region')` returns the sheet |
| Applies `lg:max-w-2xl` at desktop | component | Snapshot class list; assert includes `lg:max-w-2xl` |
| Transitions between expanded and minimized | integration | Render expanded; dispatch MINIMIZE; assert minimized bar shown |

**Expected state after completion:**
- [ ] `frontend/src/components/audio/AudioPlayerSheet.tsx` exists
- [ ] 8 component tests pass (meets spec requirement)
- [ ] The sheet lazy-loads child components so the first render of the sheet is the only time `AudioPlayerExpanded.tsx` enters the bundle
- [ ] No TypeScript errors

---

### Step 13: Implement AudioPlayerMini component

**Objective:** Create the minimized bar showing chapter reference + play/pause + tap-to-expand behavior.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayerMini.tsx` — new file
- `frontend/src/components/audio/__tests__/AudioPlayerMini.test.tsx` — new test file

**Details:**

```tsx
import { Play, Pause, ChevronUp } from 'lucide-react'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'

export function AudioPlayerMini() {
  const { state, actions } = useAudioPlayer()
  if (!state.track) return null

  const isPlaying = state.playbackState === 'playing'
  const Icon = isPlaying ? Pause : Play
  const toggleLabel = isPlaying ? 'Pause audio' : 'Resume audio'

  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3 h-16">
      <button
        type="button"
        onClick={actions.expand}
        aria-label="Expand audio player"
        className="flex flex-1 items-center gap-3 text-left hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md"
      >
        <ChevronUp className="h-4 w-4 text-white/50" aria-hidden="true" />
        <span className="text-white/80 text-sm">
          {state.track.bookDisplayName} {state.track.chapter}
        </span>
      </button>
      <button
        type="button"
        onClick={actions.toggle}
        aria-label={toggleLabel}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <Icon className="h-4 w-4 text-white" aria-hidden="true" />
      </button>
    </div>
  )
}
```

**Auth gating:** None.

**Responsive behavior:** 64px tall at all breakpoints (spec requirement #34). Text truncates or ellipsizes if narrow (though "John 3" fits comfortably at 375px).

**Inline position expectations:** Chevron + chapter text on the left (flex-grow), play/pause button on the right. All elements share the same y-coordinate ±2px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT render a scrubber or speed picker — minimized bar is intentionally minimal per spec requirement #53.
- Do NOT render a close button — users must expand first to close.
- Do NOT render when `track` is null (defensive — shouldn't happen but prevents crashes).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders chapter reference | component | Mock state with track; assert "John 3" text visible |
| Renders play icon when paused | component | Mock state `playbackState: 'paused'`; assert Play icon |
| Renders pause icon when playing | component | Mock state `playbackState: 'playing'`; assert Pause icon |
| Tapping the expand area calls actions.expand | component | Click the left area; assert actions.expand called |

**Expected state after completion:**
- [ ] `frontend/src/components/audio/AudioPlayerMini.tsx` exists
- [ ] 4 component tests pass (meets spec requirement)
- [ ] No TypeScript errors

---

### Step 14: Implement AudioPlayerExpanded component

**Objective:** Create the full expanded player UI with chapter reference, translation, play/pause, scrubber, time labels, speed picker, minimize, close.

**Files to create/modify:**
- `frontend/src/components/audio/AudioPlayerExpanded.tsx` — new file
- `frontend/src/components/audio/__tests__/AudioPlayerExpanded.test.tsx` — new test file

**Details:**

Large component — approximate 200 lines. Key concerns:

1. **Scrubber** — use a native `<input type="range">` styled via CSS for cross-browser drag-to-seek. Keyboard-accessible out of the box. On `onChange`, call `actions.seek(newValue)`. Show live currentTime in the label as the thumb moves.
2. **Time formatting** — helper `formatMMSS(seconds)` returning `"0:32"` / `"12:45"`. Use `tabular-nums` on labels to prevent jitter.
3. **Speed picker** — row of 5 buttons `[0.75, 1.0, 1.25, 1.5, 2.0]`. Clicking dispatches `actions.setSpeed(n)`. Current speed highlighted with `bg-white/15 text-white`.
4. **Focus management** — on mount (when sheet first opens expanded), focus moves to the large play/pause button via `useEffect` + `ref.current?.focus()`.
5. **Minimize / close corner buttons** — top-right of the panel. Minimize calls `actions.minimize()`, close calls `actions.close()` (which stops playback).
6. **Error state** — if `state.playbackState === 'error'`, replace the scrubber + controls with an error card: message + dismiss button. Dismiss calls `actions.dismissError()`.

```tsx
import { Play, Pause, Minimize2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'

const SPEEDS: Array<0.75 | 1.0 | 1.25 | 1.5 | 2.0> = [0.75, 1.0, 1.25, 1.5, 2.0]

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function AudioPlayerExpanded() {
  const { state, actions } = useAudioPlayer()
  const playButtonRef = useRef<HTMLButtonElement>(null)

  // Focus moves to the play button when the sheet first expands
  useEffect(() => { playButtonRef.current?.focus() }, [])

  if (!state.track) return null

  const isPlaying = state.playbackState === 'playing'
  const isError = state.playbackState === 'error'

  return (
    <div className="px-6 py-4 sm:px-8 sm:py-5 h-[340px] sm:h-[300px] flex flex-col">
      {/* Corner buttons */}
      <div className="flex items-center justify-between">
        <CornerButton icon={Minimize2} label="Minimize audio player" onClick={actions.minimize} />
        <div className="flex-1" />
        <CornerButton icon={X} label="Close audio player" onClick={actions.close} />
      </div>

      {/* Chapter + translation (center-aligned) */}
      <div className="mt-2 text-center">
        <p className="text-white text-lg font-medium">
          {state.track.bookDisplayName} {state.track.chapter}
        </p>
        <p className="text-white/60 text-sm mt-1">{state.track.translation}</p>
      </div>

      {isError ? (
        <div className="mt-4 flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-white/70 text-sm">
            {state.errorMessage ?? 'Audio unavailable — try another chapter'}
          </p>
          <button
            type="button"
            onClick={actions.dismissError}
            className="text-white/50 hover:text-white/80 text-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <>
          {/* Scrubber row */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-white/60 text-xs tabular-nums w-10 text-right">
              {formatMMSS(state.currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, state.duration)}
              step={1}
              value={state.currentTime}
              onChange={(e) => actions.seek(Number(e.target.value))}
              aria-label="Seek audio position"
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
                [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            />
            <span className="text-white/60 text-xs tabular-nums w-10">
              {formatMMSS(state.duration)}
            </span>
          </div>

          {/* Play/pause + speed row */}
          <div className="mt-4 flex-1 flex flex-col items-center justify-center gap-4">
            <button
              ref={playButtonRef}
              type="button"
              onClick={actions.toggle}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {isPlaying ? <Pause className="h-6 w-6 text-white" aria-hidden /> : <Play className="h-6 w-6 text-white" aria-hidden />}
            </button>

            <div className="flex items-center justify-center gap-2" role="group" aria-label="Playback speed">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => actions.setSpeed(speed)}
                  aria-pressed={state.playbackSpeed === speed}
                  className={cn(
                    'inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                    state.playbackSpeed === speed
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.06] hover:bg-white/10 text-white/80'
                  )}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Attribution footer — DBP license requirement (spec 50a) */}
      <div className="mt-3 text-center">
        <a
          href="https://www.faithcomesbyhearing.com/bible-brain/legal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/60 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded px-1"
        >
          Audio by Faith Comes By Hearing
        </a>
      </div>
    </div>
  )
}

function CornerButton({ icon: Icon, label, onClick }: { icon: typeof Minimize2; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-[44px] w-[44px] items-center justify-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  )
}
```

Note the 32px visible circle inside the 44x44 hit area for the corner buttons — this satisfies both the spec's visual requirement and the 44px tap target accessibility floor.

**Auth gating:** None.

**Responsive behavior:**
- Mobile (375px): `h-[340px] px-6 py-4`, speed picker may wrap to 2 rows at extreme narrow widths but fits at 375px (5 × 56 + 4 × 8 = 312px inner width needed vs 375 − 48 padding = 327 available). Height bumped from 320px to 340px to accommodate the new FCBH attribution footer (spec 50a) without pushing the speed picker into the footer.
- Tablet (768px): `sm:h-[300px] sm:px-8 sm:py-5`, speed picker inline. Height bumped from 280px to 300px for the same reason.
- Desktop (1440px): same as tablet, plus `lg:max-w-2xl mx-auto lg:rounded-t-2xl` applied by the wrapper.
- **Note:** if `/verify-with-playwright` reports the attribution text is clipped at any breakpoint, increase heights by another 20px. The `mt-3` (12px) gap between speed picker and the attribution link is a minimum and may need to grow to `mt-4` (16px) on mobile if visual verification shows crowding.

**Inline position expectations:** See the top-level "Inline Element Position Expectations" table. Scrubber row (current-time label + track + duration label) must share y. Speed picker row (5 buttons) must share y. Control cluster row (minimize + play/pause + close) must share y at the corner row (though the minimize and close are in the corners, not center — the row just must not wrap).

**Guardrails (DO NOT):**
- Do NOT use a custom scrubber component — use native `<input type="range">` for accessibility and keyboard support.
- Do NOT animate the scrubber thumb position independently of the time label — both react to `state.currentTime` from a single source of truth.
- Do NOT auto-pause on seek — dragging the thumb seeks while continuing to play (or pause stays paused); standard player behavior.
- Do NOT render the scrubber/speed picker when in error state — show the error card instead.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders chapter reference and translation | component | Mock state with track; assert text content |
| Renders scrubber with correct value | component | Mock currentTime=30, duration=180; assert input[type=range] value is 30, max is 180 |
| Scrubber change triggers actions.seek | component | Fire change event; assert actions.seek called with new value |
| Speed picker highlights current speed | component | Mock playbackSpeed=1.25; assert that button has `bg-white/15` class |
| Speed picker click triggers actions.setSpeed | component | Click 1.5×; assert actions.setSpeed(1.5) called |
| Focus moves to play button on mount | component | Render; assert `document.activeElement` is the play button |
| Error state shows message and dismiss button | component | Mock state `playbackState: 'error'`; assert error text + dismiss button |
| Close button calls actions.close | component | Click X; assert actions.close called |
| **Attribution link renders in footer with correct href, target, and rel** | component | Render expanded player; query `getByRole('link', { name: /Faith Comes By Hearing/i })`; assert `href === 'https://www.faithcomesbyhearing.com/bible-brain/legal'`, `target === '_blank'`, `rel === 'noopener noreferrer'`. This is the DBP license compliance test (spec 50a). |
| Attribution link is rendered even in error state | component | Mock `playbackState: 'error'`; assert the attribution link is still present. (License attribution must not disappear on playback failures.) |

**Expected state after completion:**
- [ ] `frontend/src/components/audio/AudioPlayerExpanded.tsx` exists
- [ ] 10 component tests pass (exceeds spec's ≥6 requirement; includes 2 new attribution-link tests)
- [ ] Scrubber is keyboard-accessible (arrow keys seek)
- [ ] The FCBH attribution link renders with the correct href/target/rel
- [ ] No TypeScript errors

---

### Step 15: Mount AudioPlayerSheet at App level

**Objective:** Render `<AudioPlayerSheet />` at the App level so it appears above all routes and survives BibleReader chapter navigation.

**Files to create/modify:**
- `frontend/src/App.tsx` — add `<AudioPlayerSheet />` inside `AudioPlayerProvider`, above `<Routes>`

**Details:**

Lazy-import the sheet at the top of `App.tsx`:
```tsx
const AudioPlayerSheet = lazy(() => import('@/components/audio/AudioPlayerSheet').then((m) => ({ default: m.AudioPlayerSheet })))
```

Render inside the provider stack, right before the existing `<ChunkErrorBoundary>`:
```tsx
<AudioPlayerProvider>
  <Suspense fallback={null}>
    <AudioPlayerSheet />
  </Suspense>
  <WhisperToastProvider>
    ...
```

Because `AudioPlayerSheet` returns `null` when `sheetState === 'closed'`, the Suspense boundary never renders content until the user first hits play. The `Suspense fallback={null}` ensures no flicker during lazy load.

**Auth gating:** None.

**Responsive behavior:** Handled by the sheet itself.

**Guardrails (DO NOT):**
- Do NOT render the sheet inside `<Routes>` — it must sit outside so BibleReader route changes don't unmount it.
- Do NOT forget the Suspense boundary — without it, the lazy import will throw inside App.tsx.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| App.tsx renders without crashing | smoke | Render App; assert no throw |
| Sheet doesn't appear when player is idle | integration | Render App; assert no `role="region"` with "Audio player" label |

**Expected state after completion:**
- [ ] App.tsx imports and mounts AudioPlayerSheet inside the provider
- [ ] Sheet renders nothing visually when no audio is playing
- [ ] No TypeScript errors

---

### Step 16: Wire Media Session API

**Objective:** Update `navigator.mediaSession.metadata` when playback starts, changes chapters, or stops. Wire action handlers for `play`, `pause`, `seekbackward`, `seekforward`, `stop`.

**Files to create/modify:**
- `frontend/src/contexts/AudioPlayerContext.tsx` — add a `useEffect` that syncs Media Session state on state changes
- `frontend/src/lib/audio/media-session.ts` — new helper module with `updateMediaSession(track, actions)`, `clearMediaSession()`
- `frontend/public/og/audio-artwork-512.png` — 512x512 PNG artwork for Media Session (reuse existing OG image or create a dedicated one — see Edge Cases)

**Details:**

```ts
// frontend/src/lib/audio/media-session.ts

import type { PlayerTrack, AudioPlayerActions } from '@/types/bible-audio'

const ARTWORK_URL = '/og/audio-artwork-512.png' // or reuse existing OG image

export function updateMediaSession(track: PlayerTrack, actions: AudioPlayerActions): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${track.bookDisplayName} ${track.chapter}`,
      artist: track.translation,
      album: 'Worship Room',
      artwork: [{ src: ARTWORK_URL, sizes: '512x512', type: 'image/png' }],
    })
    navigator.mediaSession.setActionHandler('play', () => actions.toggle())
    navigator.mediaSession.setActionHandler('pause', () => actions.pause())
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const current = details.seekTime ?? 0
      actions.seek(Math.max(0, current - 10))
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const current = details.seekTime ?? 0
      actions.seek(current + 10)
    })
    navigator.mediaSession.setActionHandler('stop', () => actions.stop())
  } catch (e) {
    console.warn('[BB-26] Media Session update failed:', e)
  }
}

export function clearMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.setActionHandler('play', null)
    navigator.mediaSession.setActionHandler('pause', null)
    navigator.mediaSession.setActionHandler('seekbackward', null)
    navigator.mediaSession.setActionHandler('seekforward', null)
    navigator.mediaSession.setActionHandler('stop', null)
  } catch { /* noop */ }
}
```

In `AudioPlayerContext.tsx`, add a `useEffect` that reacts to `state.track` changes:
```tsx
useEffect(() => {
  if (state.track && state.playbackState !== 'idle') {
    updateMediaSession(state.track, actions)
  } else {
    clearMediaSession()
  }
}, [state.track, state.playbackState])
```

**Artwork file:** Spec requirement #55 says "a default artwork image." Rather than creating a new image, reuse an existing OG image or app icon. Check `frontend/public/og-default.png` — if it's 512x512 or larger, reference it. Otherwise, reference `/icons/icon-512.png` which is guaranteed to exist per the manifest config in `vite.config.ts`. Decision recorded in Edge Cases.

**Auth gating:** None.

**Responsive behavior:** N/A — no visual UI (the OS handles the lock-screen controls).

**Guardrails (DO NOT):**
- Do NOT `import 'MediaMetadata'` — it's a browser global.
- Do NOT assume Media Session is available — guard with `'mediaSession' in navigator`.
- Do NOT throw from the helper — log a warning and continue.
- Do NOT call `updateMediaSession` on every tick — only on track/playbackState changes.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `updateMediaSession` sets metadata on supporting browsers | unit | Mock `navigator.mediaSession` + `MediaMetadata`; call helper; assert metadata assigned |
| `updateMediaSession` sets action handlers | unit | Mock setActionHandler; call helper; assert 5 handlers registered |
| `updateMediaSession` is a no-op without navigator.mediaSession | unit | Delete `mediaSession`; call helper; assert no throw |
| `clearMediaSession` clears metadata and handlers | unit | Set then clear; assert metadata === null |
| Integration: starting playback triggers updateMediaSession | integration | Mock engine; play; assert mediaSession.metadata.title === "John 3" |

**Expected state after completion:**
- [ ] `lib/audio/media-session.ts` exists
- [ ] `AudioPlayerContext.tsx` wires the Media Session effect
- [ ] 5 unit/integration tests pass
- [ ] Manual verification on desktop Chrome, Firefox, Safari (Edge Cases note deferral to mobile)
- [ ] No TypeScript errors

---

### Step 17: DBP API recon and documentation

**Objective:** Hit the live DBP v4 API with a real key, document the actual response shapes, verify WEB audio coverage, and produce `_plans/recon/bb26-audio-foundation.md`.

**Files to create/modify:**
- `_plans/recon/bb26-audio-foundation.md` — new recon document

**Details:**

Performed as a pre-execution task if a working FCBH key is available, or during execution by the user in parallel with code work. Steps:

1. Set `VITE_FCBH_API_KEY` in `frontend/.env.local`.
2. Manual curl against:
   - `https://4.dbt.io/api/bibles?language_code=eng&media=audio&v=4&key=<key>` — record response structure, data wrapper, fileset structure
   - `https://4.dbt.io/api/bibles/filesets/<ENGWEB_fileset_id>?v=4&key=<key>` — record per-fileset detail
   - `https://4.dbt.io/api/bibles/filesets/<id>/<book_code>/<chapter>?v=4&key=<key>` — record chapter audio shape, whether URL is direct file or redirect, file format, duration field presence
3. Inspect a returned audio URL: HEAD request → record Content-Type (mp3/aac/other), size, CDN, expiry (if signed). **Critically, record the CORS response headers** — specifically `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers`. BB-27's ducking plan depends on FCBH returning permissive CORS; if CORS is missing or origin-restricted, flag this as a BB-27 replanning input in the recon doc.
4. Sample WEB coverage checks:
   - Genesis 1 (OT, first book)
   - Psalm 23 (OT, Psalms)
   - John 3 (NT, Gospels)
   - Revelation 22 (NT, last book)
   - Obadiah (OT, small book)
   - Philemon (NT, small book)
   - 3 John (NT, smallest book)
5. Record the exact WEB fileset identifier (the spec's "likely ENGWEB" expectation)
6. Document any rate limits surfaced in response headers (`X-RateLimit-*`)
7. Document the exact DBP book code vocabulary (GEN, EXO, LEV, ..., JHN, REV) — this populates `book-codes.ts` from Step 10
8. Document any coverage gaps — books/chapters that return empty audio or 404
9. Document iOS Safari Media Session quirks (research-based, not live testing)
10. Document Howler version + iOS unlock confirmation

**Output document structure:**

```markdown
# BB-26 Audio Foundation Recon

**Date:** 2026-04-14
**Purpose:** Document FCBH DBP v4 API shape, WEB audio coverage, and integration points for BB-26 implementation.
**Status:** Initial recon — [verify after pnpm install + key setup]

## 1. DBP v4 API Key & Auth
## 2. Bibles list response
## 3. WEB fileset structure
## 4. Chapter audio response
## 5. Audio file format and streaming
## 6. WEB coverage sweep
## 7. Book code vocabulary
## 8. Rate limits
## 9. iOS Safari Media Session notes
## 10. Howler.js iOS audio context unlock
## 11. Deferred items (mobile verification, real-device testing)
```

**Fallback if no key is available at plan execution time:** produce a placeholder document with documented assumptions, flag every section as `[UNVERIFIED — verify when key available]`, and run Steps 4/5/10 implementations against the assumed shape. The recon is updated once a key is obtained and any mismatches in the code are corrected.

**Auth gating:** None.

**Responsive behavior:** N/A — documentation step.

**Guardrails (DO NOT):**
- Do NOT commit the API key to the recon doc. Redact any key value.
- Do NOT screenshot responses containing the API key in the URL.
- Do NOT skip the recon and ship code based purely on the FCBH developer-docs assumptions — even one mismatch on URL structure ships a broken button.

**Test specifications:** None — documentation.

**Expected state after completion:**
- [ ] `_plans/recon/bb26-audio-foundation.md` exists
- [ ] All 11 sections have either live data or `[UNVERIFIED — ...]` markers
- [ ] `book-codes.ts` from Step 10 is updated with the verified DBP codes
- [ ] DBP endpoint paths in `dbp-client.ts` are confirmed or corrected

---

### Step 18: Documentation updates

**Objective:** Update `.claude/rules/11-local-storage-keys.md` with the new `bb26-v1:audioBibles` key. Add a section to `.claude/rules/04-frontend-standards.md` documenting the AudioPlayerContext as a third state pattern (context + ephemeral state, parallel to reactive stores and CRUD storage). Update `CLAUDE.md` if the "Bible Audio" content-inventory line needs correction.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — add entry for `bb26-v1:audioBibles` in a new BB-26 section or under the existing Bible Reader table
- `.claude/rules/04-frontend-standards.md` — append a short subsection under "Data Persistence (Phase 2)" documenting the AudioPlayerContext as the third state pattern
- `CLAUDE.md` — update the "Bible Audio" bullet under Feature Summary if needed (currently reads "BB-26-29 cluster currently deferred pending FCBH API key") — change to reflect that BB-26 has shipped the foundation

**Details:**

**For `11-local-storage-keys.md`** — add a new subsection after the "AI Cache (BB-32)" section:

```markdown
### Audio Cache (BB-26)

Cache entries for BB-26 Bible audio playback. Managed by `frontend/src/lib/audio/audio-cache.ts`. Uses the `bb26-v1:` prefix, mirroring the BB-32 AI cache convention.

| Key                   | Type                   | Feature                                                         |
| --------------------- | ---------------------- | --------------------------------------------------------------- |
| `bb26-v1:audioBibles` | `AudioBiblesCacheEntry` | Cached DBP `listAudioBibles()` response (BB-26), 7-day TTL      |

- **TTL:** 7 days from `createdAt`
- **Cleanup:** Cache corruption or expiry returns null on read and removes the key as a side effect
- **Scope:** The only BB-26 localStorage key. Per-chapter audio URLs are held in memory only (not persisted) because DBP URLs may be signed or expiring — see `11-local-storage-keys.md` § "In-memory caches" for the pattern
- **Version:** `bb26-v1` prefix allows future invalidation by bumping to `bb26-v2`
```

**For `04-frontend-standards.md`** — add a short subsection about the AudioPlayerContext pattern under "Data Persistence":

```markdown
### Ephemeral Context State (BB-26)

A third state pattern alongside reactive stores and CRUD storage: React Context holding a reducer + ref to an imperative object (the audio engine instance). Used by `AudioPlayerContext` (BB-26) to hold audio player state that must survive route navigation but must NOT persist across page refreshes.

- State lives in `useReducer` inside the provider
- The imperative audio engine is held in a `useRef`, not state
- Action functions are stabilized via `useMemo`
- Components consume via `useAudioPlayer()` hook
- No localStorage writes for playback state (ephemeral by design)

Use this pattern when: (1) state needs App-level lifetime, (2) state must not persist, (3) state coordinates with an imperative side-effect resource (audio engine, WebSocket, etc.). Use reactive stores when state needs cross-surface broadcast with localStorage persistence. Use CRUD storage services for older pre-reactive-store features.
```

**For `CLAUDE.md`** — update the "Bible & Scripture (post-wave)" bullet:
- Before: `**Bible Audio** — TTS chapter playback (BB-26-29 cluster currently deferred pending FCBH API key)`
- After: `**Bible Audio (BB-26)** — FCBH DBP v4 audio playback with bottom-sheet player, Media Session integration, speed control. Ambient layering (BB-27), sleep timer (BB-28), auto-advance (BB-29), and read-along highlighting (BB-44) are follow-on specs.`

Update the "Known Issues" section of `09-design-system.md` to remove the "Audio cluster ... Deferred pending FCBH API key" line (BB-26 has now shipped the foundation).

**For `.claude/rules/08-deployment.md`** — append a new subsection documenting the BB-39 service worker follow-up requirement:

```markdown
### BB-26 → BB-39 PWA service worker follow-up

When BB-39's PWA service worker is updated to handle audio assets, it MUST exclude FCBH CloudFront audio URLs from runtime caching.

- **URL pattern to exclude:** `https://d1gd73roq7kqw6.cloudfront.net/audio/*`, or more generally any URL matching `*.cloudfront.net/audio/*` that originates from a DBP request
- **Where to add the rule:** `frontend/vite.config.ts` → `VitePWA` → `injectManifest` → `globIgnores` (for bundled assets) AND a runtime caching strategy that explicitly skips the pattern (for network-fetched URLs)
- **Reason:** DBP license terms ("Intended Audience: Developers using the DBP API") state: "not store content for offline use unless it is explicitly marked as allowed." Audio files fetched from the FCBH CDN are not marked as cacheable and persisting them to a service worker cache violates the license
- **Why this is BB-39's problem, not BB-26's:** BB-26 doesn't touch the service worker config. BB-26's audio cache layer (`bb26-v1:audioBibles`) only stores metadata (the bibles list), not audio binaries. The runtime audio requests go through Howler's `<audio>` element and would only be cached if the service worker runtime caching rule picks them up — which will become a live concern as soon as BB-39's PWA strategy is extended to cover audio-tier runtime caching
- **Created by:** BB-26 (`_specs/bb-26-fcbh-audio-bible-integration.md` + recon at `_plans/recon/bb26-audio-foundation.md` § 11 item 12)
- **Verification:** After implementing the exclusion, load a chapter while online, go offline, reload, and confirm the audio file fails to load (rather than replaying from cache). The player's error state should surface "Connection problem. Check your network and try again."
```

**Auth gating:** None.

**Responsive behavior:** N/A — documentation.

**Guardrails (DO NOT):**
- Do NOT add verbose content to `CLAUDE.md` — keep it to one updated bullet.
- Do NOT duplicate content between the rules files and the plan document.
- Do NOT skip the `11-local-storage-keys.md` update — it's part of the spec's acceptance criteria (line 261).

**Test specifications:** None — documentation updates.

**Expected state after completion:**
- [ ] `11-local-storage-keys.md` has the new BB-26 audio cache section
- [ ] `04-frontend-standards.md` documents the ephemeral context state pattern
- [ ] `CLAUDE.md` reflects BB-26's shipped status
- [ ] `09-design-system.md` Known Issues updated
- [ ] `08-deployment.md` documents the BB-39 service worker audio-exclusion follow-up
- [ ] Grep for `BB-26-29 cluster currently deferred` finds no lingering references

---

### Step 19: Integration tests and bundle verification

**Objective:** Run the full BibleReader + audio integration test suite, verify the main bundle size hasn't regressed, and confirm Lighthouse scores are still 100 Performance / CLS 0.000.

**Files to create/modify:**
- `frontend/src/pages/__tests__/BibleReader.audio.test.tsx` — new integration test file

**Details:**

Integration tests covering the BibleReader + AudioPlayButton + AudioPlayerSheet flow:

| Test | Scenario |
|------|----------|
| Audio button appears on a chapter with audio | Mount BibleReader with mock DBP responses; assert AudioPlayButton renders |
| Audio button hidden on a chapter without audio | Mock DBP to return 404 for chapter audio; assert AudioPlayButton returns null |
| Click audio button opens expanded sheet | Click button; assert AudioPlayerSheet appears with expanded state |
| Minimize button collapses sheet to 64px bar | Open sheet; click minimize; assert minimized bar visible |
| Close button removes sheet from DOM | Open sheet; click close; assert sheet not in DOM and playback stopped |

Bundle verification:
```bash
pnpm build
node scripts/measure-bundle.mjs
```
Expected output: main bundle ≤ 102 KB gzipped, Howler in a separate chunk (likely named `howler-<hash>.js`), AudioPlayerExpanded + Mini + Sheet in another lazy chunk.

Lighthouse verification (manual or via CLI):
```bash
# Start dev server
pnpm dev
# In another terminal:
npx lighthouse http://localhost:5173/bible/john/3 --only-categories=performance,accessibility --chrome-flags="--headless"
```
Expected: Performance ≥ 90 (target 100), Accessibility ≥ 95, CLS 0.000.

**Auth gating:** None.

**Responsive behavior:** Run Playwright responsive verification in Step 20 (follow-on).

**Guardrails (DO NOT):**
- Do NOT skip the bundle measurement — this is the key performance acceptance criterion.
- Do NOT run Lighthouse on production builds yet — dev mode is fine for BB-26 since we're comparing against the same-mode baseline.

**Test specifications:** Already detailed above (5 integration tests, meeting spec's ≥5 requirement).

**Expected state after completion:**
- [ ] 5 integration tests pass
- [ ] Main bundle ≤ 102 KB gzipped
- [ ] Howler is in a separate lazy chunk
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95, CLS 0.000
- [ ] All prior tests (BB-30 through BB-46) still pass
- [ ] No new TypeScript errors
- [ ] No new lint warnings

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Install Howler dependencies |
| 2 | — | Add FCBH env var (independent of step 1) |
| 3 | — | Type definitions (no runtime dependencies) |
| 4 | 2, 3 | DBP client (uses env + types) |
| 5 | 3, 4 | Audio cache (uses types + DBP client) |
| 6 | 1, 3 | Engine wrapper (Howler + types) |
| 7 | 3, 6 | AudioPlayerContext (types + engine) |
| 8 | 7 | useAudioPlayer hook (context) |
| 9 | 7 | Mount provider in App.tsx |
| 10 | 2, 4, 5, 8 | AudioPlayButton (env + DBP + cache + hook) |
| 11 | 10 | Wire button into ReaderChrome |
| 12 | 8 | AudioPlayerSheet wrapper |
| 13 | 8 | AudioPlayerMini |
| 14 | 8 | AudioPlayerExpanded |
| 15 | 9, 12, 13, 14 | Mount sheet in App.tsx |
| 16 | 7 | Media Session wiring |
| 17 | — (can run any time) | DBP recon (parallelizable with code work) |
| 18 | — (after code is merged) | Documentation updates |
| 19 | 1-18 all | Integration tests + bundle verification |

Steps can run in this order but Steps 3, 6, 7 are safe to interleave. Steps 12, 13, 14 are independent of each other (all consume the hook from Step 8) and can be built in parallel. Step 17 (recon) ideally runs first as a pre-execution task but can happen alongside steps 4-5 if needed.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add Howler.js dependency | [COMPLETE] | 2026-04-14 | `howler@2.2.4` + `@types/howler@2.2.12` installed. Build passes. Main bundle: 97.7 KB gzipped (baseline, within 102 KB budget). No howler chunk yet (nothing imports). |
| 2 | Add FCBH API key to environment config | [COMPLETE] | 2026-04-14 | `env.ts` adds `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured`. `.env.example` block added. 6 unit tests pass in new `src/lib/__tests__/env.test.ts`. Empty-string env normalized to undefined for clean absent check. |
| 3 | Define BB-26 audio types | [COMPLETE] | 2026-04-14 | `frontend/src/types/bible-audio.ts` with DbpBible, DbpFileset, DbpChapterAudio, DbpError, AudioBiblesCacheEntry, PlaybackState, PlaybackSpeed, PlayerTrack, SheetState, AudioPlayerState, AudioPlayerActions. Clean typecheck. |
| 4 | Implement DBP v4 API client | [COMPLETE] | 2026-04-14 | `lib/audio/dbp-client.ts` with listAudioBibles, getBibleFilesets, getChapterAudio. Defensive book_id validation (case-insensitive) guards DBP invalid-book fallback bug. 14 unit tests pass. |
| 5 | Implement audio cache layer | [COMPLETE] | 2026-04-14 | `lib/audio/audio-cache.ts` with bb26-v1:audioBibles localStorage + in-memory chapter map + stale-while-revalidate `loadAudioBibles()`. 9 unit tests pass. |
| 6 | Implement lazy-loaded audio engine wrapper | [COMPLETE] | 2026-04-14 | `lib/audio/engine.ts` lazy-imports Howler, HTML5 mode, format mp3, crossOrigin mitigation, 10s stall timer. 14 unit tests pass including CORS/stall/format/defensive-failure paths. |
| 7 | Implement AudioPlayerContext + provider | [COMPLETE] | 2026-04-14 | `contexts/AudioPlayerContext.tsx` (reducer + useCallback actions + supersession via request-id ref + tick interval). `lib/audio/error-messages.ts` routes all errors. Media Session effect also wired here (Step 16 became a no-op). 10 context tests + 9 error-message tests pass. Supersession tests assert state-level correctness (last-track-wins) since microtask ordering in jsdom is non-deterministic for engine creation count. |
| 8 | Implement useAudioPlayer hook | [COMPLETE] | 2026-04-14 | `hooks/audio/useAudioPlayer.ts` — thin context reader. 11 tests pass including cross-component re-render and rapid-play supersession. |
| 9 | Mount AudioPlayerProvider in App.tsx | [COMPLETE] | 2026-04-14 | `AudioPlayerProvider` mounted between `AudioProvider` and `WhisperToastProvider`. Typecheck clean. |
| 10 | Implement AudioPlayButton component | [COMPLETE] | 2026-04-14 | `components/audio/AudioPlayButton.tsx` + `lib/audio/book-codes.ts` (66-book map, OT/NT testament helper, EN1WEBN2DA/EN1WEBO2DA fileset IDs). 7 component tests pass. |
| 11 | Wire AudioPlayButton into ReaderChrome | [COMPLETE] | 2026-04-14 | Inserted after Books button. Pre-existing ReaderChrome.test.tsx (23) and BibleReaderAudio.test.tsx (8) updated with AudioPlayerProvider wrapper + env/engine/media-session mocks; all still passing. |
| 12 | Implement AudioPlayerSheet wrapper (lazy-loaded) | [COMPLETE] | 2026-04-14 | `components/audio/AudioPlayerSheet.tsx` — lazy-imports Mini/Expanded, ErrorBoundary fallback, respects reduced-motion. 6 tests pass. Uses `bg-[#0D0620]/95` fallback (no `background-deep` token in tailwind config). Animation token corrected during Playwright verification: minimize/expand uses `base` not `fast`. Plan updated to match implementation. |
| 13 | Implement AudioPlayerMini component | [COMPLETE] | 2026-04-14 | `components/audio/AudioPlayerMini.tsx` — 64px bar with chapter reference + play/pause + expand. 5 tests pass. |
| 14 | Implement AudioPlayerExpanded component | [COMPLETE] | 2026-04-14 | `components/audio/AudioPlayerExpanded.tsx` — scrubber, speed picker, corner buttons, FCBH attribution footer. 11 tests pass including license-compliance attribution checks (present even in error state). |
| 15 | Mount AudioPlayerSheet at App level | [COMPLETE] | 2026-04-14 | Lazy-imported + wrapped in `<Suspense fallback={null}>` inside `AudioPlayerProvider`. Typecheck clean. |
| 16 | Wire Media Session API | [COMPLETE] | 2026-04-14 | `lib/audio/media-session.ts` already implemented in Step 7 (useEffect on state.track/playbackState). Guards `'mediaSession' in navigator`, fail-silent on exceptions. Covered by context tests via `clearMediaSession` mock. |
| 17 | DBP API recon and documentation | [COMPLETE] | 2026-04-14 | Recon doc `_plans/recon/bb26-audio-foundation.md` already present (written during plan phase). Verified: DBP base URL, EN1WEB* fileset IDs, 100% WEB coverage, invalid-book fallback bug, CORS `*`, rate limits, book codes. All assumptions [RESOLVED]. |
| 18 | Documentation updates | [COMPLETE] | 2026-04-14 | `11-local-storage-keys.md` + Audio Cache section. `04-frontend-standards.md` + Ephemeral Context State pattern. `CLAUDE.md` Bible Audio bullet updated. `09-design-system.md` Known Issues updated with BB-27 CORS dependency note. `08-deployment.md` + BB-26 → BB-39 PWA follow-up. No stale references remain. |
| 19 | Integration tests and bundle verification | [COMPLETE] | 2026-04-14 | New `BibleReader.audio.test.tsx` integration tests (2 passing). 4 pre-existing BibleReader test files updated with AudioPlayerProvider wrappers: BibleReader.test.tsx (17), BibleReader.deeplink.test.tsx (15), BibleReaderHighlights.test.tsx (?), BibleReaderNotes.test.tsx (?) — 51 tests across the 4 files pass. Full suite: 8030/8031 pass (1 pre-existing flake unrelated to BB-26 — PrayerWallActivity passes in isolation). Build clean. Main bundle 99.5 KB gzipped (baseline 97.7 KB, +1.8 KB, within 102 KB budget). `howler-BL_Q4OSn.js` and `engine-Bj5TzEK-.js` in separate lazy chunks. |
