# BB-26: FCBH Audio Bible Integration

**Master Plan Reference:** First spec in the audio wave (BB-26 through BB-29, plus BB-44). Foundation for BB-27 (audio + ambient layering), BB-28 (sleep timer), BB-29 (continuous playback), and BB-44 (read-along mode). Depends on BB-33 (animation tokens), BB-38 (deep linking — verse references in Media Session metadata), the existing BibleReader and ReaderChrome from the Bible redesign wave, and the protocol 04 error boundary primitives from the deep review.

**Branch:** `audio-wave-bb-26-29-44` (all work commits directly to this branch)

---

## Overview

Listening to scripture is one of the oldest devotional practices and one of the most underserved by Bible apps. The dominant market approach (YouVersion's audio Bibles, Bible.is, Audible's Bible offerings) treats audio as a parallel mode — separate UI, separate navigation, separate mental model. You're either reading or listening, never both.

BB-26 starts a different approach: audio lives inside the BibleReader as a quiet companion to reading. Tap a button on any chapter, scripture is read aloud, and you can keep the chapter open to follow along, lock your screen and listen with your eyes closed, or minimize the player and keep reading at your own pace. Audio is an option, not a mode.

This spec delivers the foundation: WEB audio playback via the FCBH Digital Bible Platform v4 API, a player UI that respects the BibleReader's existing chrome and dark theme, and Media Session API integration so the operating system's lock-screen and notification-shade controls work correctly. It does not include ambient layering (BB-27), sleep timer (BB-28), auto-advance (BB-29), or read-along verse highlighting (BB-44). Each of those is a separate spec that builds on this foundation.

**A note on the WEB audio production.** The audio BB-26 ships for the World English Bible is FCBH's **dramatized production** — a recording with multiple voice actors, light background music, and occasional sound effects, rather than a single-voice plain narration. This is not a choice; DBP only publishes WEB in the dramatized format. The dramatized production is FCBH's standard and is what ships in Bible.is, YouVersion's WEB audio, and Dwell. The user-facing label in the player UI remains "World English Bible" with no "drama" qualifier — the production format is not surfaced in the UI because naming it would plant doubt about whether the listener is hearing the right translation, when in fact the text is the same WEB they see on screen. Future readers of this spec should understand: "WEB audio" in BB-26 means the canonical FCBH dramatized WEB recording, not a hypothetical plain-narration alternative that does not exist in DBP.

## User Story

As a **logged-in or logged-out user reading the Bible**, I want to **tap a play button on any chapter and hear it narrated** so that **I can follow along, listen with my eyes closed, or keep the audio playing while my screen is off**.

## Requirements

### Functional Requirements

#### DBP API Client

1. A new module at `frontend/src/lib/audio/dbp-client.ts` exports a typed client for the FCBH Digital Bible Platform v4 API at `https://4.dbt.io`
2. The client reads the API key from `import.meta.env.VITE_FCBH_API_KEY` at build time
3. The client exposes: `listAudioBibles()`, `getBibleFilesets(bibleId)`, `getChapterAudio(filesetId, bookId, chapter)`
4. All client methods return typed responses; types live in `frontend/src/types/audio.ts`
5. The client handles network errors, 4xx/5xx responses, and timeouts gracefully — every method either resolves with valid data or rejects with a typed error
6. The client does not retry failed requests automatically; retry logic lives in the caching layer

#### Audio Cache Layer

7. A new module at `frontend/src/lib/audio/audio-cache.ts` provides caching for DBP responses
8. The "list of audio bibles" response is cached in localStorage under `bb26-v1:audioBibles` with a 7-day TTL
9. The cache layer handles cache invalidation, stale-while-revalidate, and graceful fallback to a fresh fetch if the cached value is corrupt
10. Per-chapter audio URLs are cached in memory only (a `Map` keyed by `${filesetId}:${book}:${chapter}`) — they are NOT persisted to localStorage because the URLs may be signed or expiring
11. Audio file binary data is not cached; streaming is sufficient for v1
12. The cache layer matches the existing `bb32-v1:` AI cache pattern from BB-32 — same prefix convention, same TTL handling, same error tolerance

#### Audio Player Context & Hook

13. A new context at `frontend/src/contexts/AudioPlayerContext.tsx` provides player state to consuming components
14. The context is mounted at the App level so player state survives BibleReader navigation (necessary foundation for BB-29 continuous playback)
15. The context exposes: current track metadata (book, chapter, fileset), playback state (idle/loading/playing/paused/error), current time, duration, playback speed, controls (play, pause, toggle, seek, setSpeed, stop)
16. A new hook at `frontend/src/hooks/audio/useAudioPlayer.ts` is the canonical consumer interface — components use the hook, not the raw context
17. The hook follows the project's reactive store consumer pattern: components that consume player state must subscribe properly so they re-render on state changes (BB-45 anti-pattern protection applies)
18. Player state is ephemeral and intentionally NOT persisted to localStorage; closing the tab or refreshing resets the player

#### Audio Engine

19. The audio engine uses Howler.js (`howler` ~25KB gzipped, added as a production dependency along with `@types/howler` as a dev dependency)
20. Howler is lazy-loaded via dynamic import when the user first opens a chapter that has audio — it does NOT enter the main bundle
21. The engine handles: load, play, pause, seek, speed change, error events, end-of-track event (used by BB-29 in a future spec)
22. The engine respects iOS Safari's audio context unlock requirements — Howler handles this internally but the spec acknowledges the dependency
23. Only one audio source is active at a time; starting playback on a new chapter stops the previous one

#### Player UI — Play Button

24. A new `AudioPlayButton` component at `frontend/src/components/audio/AudioPlayButton.tsx` lives in the BibleReader's `ReaderChrome` top bar, positioned near the right edge alongside the existing chapter navigation and theme picker
25. The button displays a play icon when audio is available for the current chapter and has not started, a pause icon when audio is playing, and a play icon when audio is paused
26. If WEB audio is not available for the current chapter, the button is hidden entirely (not disabled with a tooltip — fully removed from the DOM)
27. If WEB audio is not available for the entire WEB bible (DBP API returns no data, or the API call fails), the button is hidden across all chapters
28. Tapping the button when the player is idle or stopped opens the `AudioPlayerSheet` and starts loading audio
29. Tapping the button when the player is playing pauses audio without closing the sheet
30. Tapping the button when the player is paused resumes audio
31. The button matches the existing chrome icon style: same size, same opacity, same hover and focus states
32. The button has appropriate `aria-label` reflecting the current state ("Play audio for John 3", "Pause audio", "Resume audio")

#### Player UI — Bottom Sheet

33. A new `AudioPlayerSheet` component at `frontend/src/components/audio/AudioPlayerSheet.tsx` is a bottom sheet that slides up from the bottom of the viewport when the user starts audio playback
34. The sheet has three states: closed (not in DOM), expanded (full player UI visible at the bottom of the screen, ~280px tall on desktop / ~320px on mobile), minimized (thin bar ~64px tall at the bottom of the screen)
35. The sheet starts in expanded state when first opened
36. The user can minimize the sheet by tapping a minimize button or swiping it down
37. The user can re-expand the minimized sheet by tapping it
38. The user can close the sheet entirely by tapping a close button — closing the sheet stops playback
39. The sheet's open and close transitions are 300ms slide animations using the existing animation tokens from BB-33
40. The minimize and expand transitions are 200ms transitions using the existing animation tokens
41. All sheet animations respect `prefers-reduced-motion: reduce` and become instant state changes when reduced motion is enabled
42. The sheet uses the dark theme tokens: `bg-background-deep/95 backdrop-blur-xl border-t border-white/10`
43. The sheet is wrapped in an `ErrorBoundary` using the same pattern established by protocol 04 in the deep review — if the player throws, the user sees a fallback ("Audio unavailable right now") instead of a crashed BibleReader

#### Player UI — Expanded State

44. A new `AudioPlayerExpanded` component at `frontend/src/components/audio/AudioPlayerExpanded.tsx` renders the full player UI inside the expanded sheet
45. The component displays: chapter reference (e.g., "John 3"), translation indicator ("World English Bible"), large play/pause button, scrubber with current time and total duration, playback speed picker, minimize button, close button
46. The scrubber is a draggable range slider showing the current playback position; dragging the thumb seeks to that position; releasing the thumb resumes playback if it was playing before
47. The current time and total duration are displayed in `mm:ss` format on either side of the scrubber
48. The playback speed picker exposes 5 discrete options: 0.75x, 1.0x, 1.25x, 1.5x, 2.0x — rendered as a row of buttons or a small popover, with the current speed highlighted
49. Speed changes apply immediately and persist for the lifetime of the player context (resetting only on page refresh)
50. All controls have appropriate `aria-label` and keyboard support
50a. The expanded player sheet displays a text attribution link in its footer area: **"Audio by Faith Comes By Hearing"**. The link uses `text-white/40 text-xs` styling, opens `https://www.faithcomesbyhearing.com/bible-brain/legal` in a new tab with `rel="noopener noreferrer"`, and is NOT shown on the minimized bar. This satisfies the DBP license requirement that consuming applications provide users with a link to DBP terms and conditions. See `_plans/recon/bb26-audio-foundation.md` § 11 item 2 for the license source.

#### Player UI — Minimized State

51. A new `AudioPlayerMini` component at `frontend/src/components/audio/AudioPlayerMini.tsx` renders the minimized bar
52. The minimized bar displays: small chapter reference, play/pause button, expand button (or the entire bar is tappable to expand)
53. The minimized bar does NOT include the scrubber, speed picker, or close button — those are only available in the expanded state
54. The minimized bar maintains the same dark theme treatment as the expanded sheet

#### Media Session API Integration

55. When audio starts playing, the player updates `navigator.mediaSession.metadata` with: `title` (chapter reference, e.g., "John 3"), `artist` (translation, "World English Bible"), `album` ("Worship Room"), and `artwork` (a default artwork image)
56. The player wires up `navigator.mediaSession.setActionHandler` for: `play`, `pause`, `seekbackward` (10s), `seekforward` (10s), `stop`
57. Media Session metadata is updated when the user changes chapters (relevant once BB-29 lands; BB-26 still updates correctly within a single chapter)
58. Media Session is wired up but verified only on desktop browsers (Chrome, Firefox, Safari) for BB-26 — mobile lock-screen verification is deferred to a future session when mobile testing begins

#### Fallback Handling

59. When DBP returns "no audio available" for a chapter, the audio button is hidden silently — no error UI, no toast
60. When the DBP API call fails (network error, 5xx, timeout), the audio button is hidden silently and the failure is logged to console — the cache layer handles retry on the next chapter navigation
61. When the audio file URL is returned but the audio fails to load or play (404, decode error, etc.), the player UI shows an inline error state ("Audio unavailable — try another chapter") with a dismiss button — this is the only fallback case that surfaces user-visible error UI
62. The error state in the player UI is keyboard-accessible and screen-reader-friendly

### Non-Functional Requirements

- **Performance**: BibleReader Lighthouse Performance score stays at 100 (the post-deep-review batch 10 baseline). CLS stays at 0.000. The audio bundle is lazy-loaded so it does not affect initial BibleReader load.
- **Bundle size**: The main bundle stays at or below 102 KB gzipped (current post-deep-review baseline is 100 KB). Howler.js (~25KB gzipped) and the audio components must be in a separate lazy-loaded chunk.
- **Accessibility**: All player controls have `aria-label` and full keyboard navigation. Focus is managed correctly when the sheet opens and closes (focus moves to the play button on open, returns to the chrome button on close). Touch targets meet 44px minimum. Reduced motion is respected on all animations.
- **Storage**: The cache key `bb26-v1:audioBibles` is bounded to a single JSON object; total size should be well under 50KB.

## Auth Gating

The audio Bible feature is available to all users, logged in or out. The BibleReader is a public route and audio playback does not require an account. BB-26 adds zero new auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See audio play button on BibleReader | Visible if DBP has audio for the chapter | Visible if DBP has audio for the chapter | N/A |
| Start audio playback | Plays normally | Plays normally | N/A |
| Use scrubber, speed picker, minimize | Works normally | Works normally | N/A |
| Use Media Session lock-screen controls | Works normally | Works normally | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Bottom sheet is full-width and ~320px tall when expanded; ~64px tall when minimized. Scrubber spans nearly the full width. Play button is large (56px). Speed picker is a popover triggered by tapping the current speed. |
| Tablet (640-1024px) | Bottom sheet is full-width and ~280px tall when expanded; ~64px tall when minimized. Scrubber and speed picker have more horizontal room. Speed picker may be inline. |
| Desktop (> 1024px) | Bottom sheet is centered with `max-w-2xl` and ~280px tall when expanded. Background outside the sheet is not dimmed (the sheet is a non-modal companion to the BibleReader, not an overlay). Speed picker is inline as a row of 5 buttons. |

- The audio play button in `ReaderChrome` is the same size at all breakpoints, matching the existing chrome icons
- The bottom sheet's bottom edge is anchored to the viewport bottom on all sizes; the sheet does not respect safe area insets in v1 (BB-26 is desktop-verified only; mobile safe-area handling will be revisited when mobile testing begins)
- All animations work identically at all sizes via the BB-33 animation tokens

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. All audio content comes from the FCBH Digital Bible Platform under WEB (World English Bible, public domain).

## Auth & Persistence

- **Logged-out users:** Audio playback works normally. Playback state is ephemeral (lost on page refresh). No localStorage writes specific to playback.
- **Logged-in users:** Same behavior as logged-out users in BB-26. Future specs may add per-user audio preferences (default speed, default voice if multiple voices exist) but BB-26 ships with no per-user persistence.
- **Route type:** Public (BibleReader is public; audio inherits)
- **localStorage keys:**
  - `bb26-v1:audioBibles` — cached DBP `listAudioBibles` response, 7-day TTL, JSON object

## Completion & Navigation

N/A — Audio playback is not part of the Daily Hub tabbed experience. It does not contribute to streaks, faith points, or daily activity signals. BB-26 explicitly does not gamify listening.

## Design Notes

- The audio play button in `ReaderChrome` matches the existing chrome icon treatment: 24px icon, `text-white/70` default, `hover:text-white` on hover, `focus:ring-1 focus:ring-white/20 rounded` for focus
- The play icon and pause icon are from the existing `lucide-react` icon set (`Play`, `Pause`)
- The bottom sheet uses `bg-background-deep/95 backdrop-blur-xl` for the surface and `border-t border-white/10` for the top edge separation from the BibleReader content below it
- The expanded sheet has internal padding of `px-6 py-4` on mobile, `px-8 py-5` on tablet and desktop
- The chapter reference in the expanded sheet uses `text-white text-lg font-medium`
- The translation label uses `text-white/60 text-sm`
- The play/pause button in the expanded sheet is large (56px) with a circular `bg-white/10 hover:bg-white/15 border border-white/20` treatment
- The scrubber uses a custom-styled range input with a `bg-white/10` track, `bg-white` filled portion, and `bg-white` thumb
- The current time and duration labels use `text-white/60 text-xs tabular-nums` (tabular numerals prevent jitter as the time updates)
- The speed picker buttons use `bg-white/[0.06] hover:bg-white/10` for unselected and `bg-white/15 text-white` for the selected speed
- The minimize and close buttons in the corner of the expanded sheet use `text-white/50 hover:text-white/80` with 32px touch targets
- The minimized bar's chapter reference uses `text-white/80 text-sm`
- The minimized bar's play/pause button is 40px and uses the same circular treatment as the expanded version, scaled down
- The error state in the player UI uses `text-white/70` for the message and a `text-white/50 hover:text-white/80` dismiss button
- All animations use the existing BB-33 animation tokens (`duration-300 ease-out` for slide transitions)
- Reduced motion compliance: every animation has a fallback path via `prefers-reduced-motion: reduce` that becomes an instant state change

## Anti-Pressure Design Decisions

These reflect Worship Room's core positioning and apply to BB-26 specifically:

- **No listening goals or targets.** No "minutes listened today," no "chapters listened" counter, no daily listening goals.
- **No streaks for listening.** Audio playback does not feed into the BB-17 streak system.
- **No completion tracking.** A chapter that the user has listened to is not marked "completed" or "heard." The chapter visit store is for reading; audio is separate.
- **No autoplay between sessions.** When the user opens the BibleReader, audio does not start automatically. The user must tap play.
- **No scoring or gamification.** No badges for listening, no point values, no leaderboard contribution.
- **No social features.** No "X friends are listening to this chapter" indicators. No share-the-audio functionality.
- **No notification reminders to listen.** The BB-41 notification system is not extended to audio in BB-26.

## Out of Scope

- Ambient audio layering or mixing with the existing Music feature ambient sounds (BB-27)
- Sleep timer functionality (BB-28)
- Auto-advance to the next chapter when the current chapter ends (BB-29)
- Read-along verse highlighting that follows the audio (BB-44)
- Translation choice — WEB only in BB-26
- Voice picker UI — supported in the data model but no UI in BB-26 even if WEB has multiple filesets
- TTS fallback when DBP audio is unavailable
- Download audio for offline playback
- Audio bookmarks or playback position memory across sessions
- Verse-level audio scrubbing (jump to a specific verse) — the scrubber works on the chapter as a continuous track only
- Equalizer, audio effects, or per-user audio profiles
- Per-user default playback speed (resets to 1.0x on each page refresh)
- Per-user default voice selection
- Mobile-specific UX hints ("install the PWA for best background playback") — deferred until mobile testing begins
- iOS safe-area inset handling on the bottom sheet — deferred until mobile testing begins
- Real-device mobile verification — desktop browser verification only for BB-26
- Backend API for any audio-related data (Phase 3)
- New SDK packages beyond Howler.js and `@types/howler`
- Changes to BB-7 highlights, BB-43 chapter visits, BB-17 streaks, or any other reactive store
- Telemetry or analytics on audio listening behavior
- Audio file caching to localStorage or service worker

## Acceptance Criteria

- [ ] A new module at `frontend/src/lib/audio/dbp-client.ts` exports a typed client for the DBP v4 API
- [ ] The client reads the API key from `import.meta.env.VITE_FCBH_API_KEY`
- [ ] The client exposes `listAudioBibles()`, `getBibleFilesets()`, `getChapterAudio()` methods with full TypeScript types
- [ ] All client methods handle network errors and 4xx/5xx responses gracefully
- [ ] A new module at `frontend/src/lib/audio/audio-cache.ts` provides a 7-day localStorage cache for the audio bibles list under `bb26-v1:audioBibles`
- [ ] Per-chapter audio URLs are cached in memory only, never persisted
- [ ] A new context at `frontend/src/contexts/AudioPlayerContext.tsx` is mounted at the App level and provides player state
- [ ] A new hook at `frontend/src/hooks/audio/useAudioPlayer.ts` is the canonical consumer interface
- [ ] The hook follows the BB-45 anti-pattern protection: components subscribe properly and re-render on state changes
- [ ] Howler.js is added as a production dependency with `@types/howler` as a dev dependency
- [ ] Howler is lazy-loaded via dynamic import and does NOT enter the main bundle
- [ ] A new `AudioPlayButton` component lives in `ReaderChrome` near the right edge of the top bar
- [ ] The button is hidden when WEB audio is not available for the current chapter (or for the entire WEB bible)
- [ ] The button shows the correct play/pause icon based on player state and has appropriate `aria-label`
- [ ] A new `AudioPlayerSheet` component renders a bottom sheet with three states: expanded, minimized, closed
- [ ] The sheet's slide animations are 300ms and respect `prefers-reduced-motion: reduce`
- [ ] The sheet uses the dark theme tokens `bg-background-deep/95 backdrop-blur-xl border-t border-white/10`
- [ ] The sheet is wrapped in an `ErrorBoundary` with a fallback that says "Audio unavailable right now"
- [ ] A new `AudioPlayerExpanded` component renders the full player UI: chapter reference, translation, play/pause, scrubber, time labels, speed picker, minimize, close
- [ ] The scrubber is keyboard-accessible and supports drag-to-seek
- [ ] The speed picker offers 0.75x, 1.0x, 1.25x, 1.5x, 2.0x as discrete options with the current speed highlighted
- [ ] A new `AudioPlayerMini` component renders the minimized bar with chapter reference and play/pause
- [ ] Tapping the minimized bar expands it; tapping the minimize button collapses the expanded view
- [ ] Tapping the close button stops playback and removes the sheet from the DOM
- [ ] When audio starts playing, `navigator.mediaSession.metadata` is updated with title (chapter reference), artist (translation), album ("Worship Room"), and artwork
- [ ] `navigator.mediaSession.setActionHandler` is wired up for `play`, `pause`, `seekbackward`, `seekforward`, and `stop`
- [ ] When DBP returns no audio for a chapter, the play button is hidden silently with no error UI
- [ ] When the DBP API call fails, the play button is hidden silently and the failure is logged to console
- [ ] When the audio file fails to load or play, the player UI shows an inline error state with a dismiss button
- [ ] FCBH attribution link is present in the expanded player footer, opens the FCBH legal page (`https://www.faithcomesbyhearing.com/bible-brain/legal`) in a new tab with `rel="noopener noreferrer"`, and is absent from the minimized bar
- [ ] All BB-30 through BB-46 tests continue to pass unchanged
- [ ] At least 12 unit tests cover the DBP client (mock fetch, error cases, response parsing)
- [ ] At least 8 unit tests cover the audio cache layer (localStorage stubs, TTL handling, corruption fallback)
- [ ] At least 10 unit tests cover the `useAudioPlayer` hook (Howler mocked, state transitions, mutation-after-mount re-render verification per BB-45)
- [ ] At least 6 component tests cover `AudioPlayButton` (rendering, hidden states, click behavior)
- [ ] At least 8 component tests cover `AudioPlayerSheet` (state transitions, animations, error boundary fallback)
- [ ] At least 6 component tests cover `AudioPlayerExpanded` (controls, scrubber, speed picker, focus management)
- [ ] At least 4 component tests cover `AudioPlayerMini` (rendering, expand interaction)
- [ ] At least 5 integration tests cover the BibleReader + audio button + sheet open/close flow
- [ ] No TypeScript errors, no new lint warnings, no new accessibility violations
- [ ] Zero new auth gates
- [ ] Exactly one new localStorage key: `bb26-v1:audioBibles`
- [ ] The new key is documented in `.claude/rules/11-local-storage-keys.md`
- [ ] The audio context (third state pattern alongside reactive stores and CRUD storage) is documented in `.claude/rules/04-frontend-standards.md` or equivalent
- [ ] The DBP API key is documented in `frontend/.env.example` matching the existing `VITE_GEMINI_API_KEY` and `VITE_GOOGLE_MAPS_API_KEY` pattern
- [ ] A documentation file at `_plans/recon/bb26-audio-foundation.md` documents the DBP API findings, fileset structure, WEB audio coverage, fallback behavior, and integration points
- [ ] BibleReader Lighthouse Performance score stays at 100 with CLS at 0.000
- [ ] Main bundle size stays at or below 102 KB gzipped (audio code is in a separate lazy-loaded chunk)
- [ ] All player UI animations respect `prefers-reduced-motion: reduce`
- [ ] All player controls are keyboard-accessible with proper focus management
- [ ] The Media Session integration is verified on desktop Chrome, Firefox, and Safari
- [ ] Mobile verification (iOS and Android lock-screen controls) is explicitly deferred to a future session and noted in the recon document

## Notes for Plan Phase Recon

**Status: RESOLVED.** The pre-execution recon ran on 2026-04-14 against the live DBP v4 API and documented every item in `_plans/recon/bb26-audio-foundation.md`. Summary of what the recon found, for anyone reading the spec without the plan:

1. **DBP v4 API shape ✅** — Base URL `https://4.dbt.io/api`. Auth via `?key=<KEY>&v=4` query parameters. Responses are wrapped in `{ data, meta }`. Filesets live under `{ filesets: { 'dbp-prod': [...] } }` on each bible. Per-chapter shortcut endpoint `/bibles/filesets/{id}/{book}/{chapter}` exists and returns a 1-element `data` array. 4xx/5xx failure modes are clean.
2. **WEB audio coverage ✅** — The canonical full-coverage WEB audio is provided by **`EN1WEBN2DA`** (New Testament, 27 books / 260 chapters) and **`EN1WEBO2DA`** (Old Testament, 39 books / 929 chapters), both under the `ENGWWH` bible abbreviation ("World English Bible - Winfred Henson"). 100% coverage verified across Genesis 1, Genesis 50, Psalm 23, Psalm 119, Isaiah 53, Obadiah, John 3, John 21, Revelation 22, Philemon, 3 John. A smaller alternative, `ENGWEBN2DA` from the `ENGWEB` abbreviation, provides NT-only coverage and is not used for BB-26. There is no plain-narration WEB audio in DBP at all — only dramatized production (see the Overview note). The spec's earlier assumption of a single "ENGWEB" fileset is incorrect; the implementation must hit the two EN1WEB* filesets.
3. **Audio file format ✅** — MP3 at 64 kbps, CloudFront-delivered, `Content-Type: binary/octet-stream` (not `audio/mpeg`, but browsers sniff by extension). URLs are signed with `Expires` query param, expiring ~15 hours after issue. In-memory-only per-chapter URL cache is correct. Range requests supported.
4. **BibleReader `ReaderChrome` structure ✅** — Documented in the plan's Architecture Context. `AudioPlayButton` slots in after the existing Books icon at the right edge.
5. **App-level context mounting ✅** — Documented in the plan's Architecture Context and Step 9. `AudioPlayerProvider` mounts between `<AudioProvider>` and `<WhisperToastProvider>` in `App.tsx`.
6. **Legacy scaffolding (`useBibleAudio.ts`, `SleepTimerPanel.tsx`) ✅** — Left untouched. Documented in the plan. A later cleanup or BB-28 spec will deal with them.
7. **Lazy-loading verification ✅** — Vite config supports dynamic imports. Plan Step 1 installs Howler with explicit "no static import" guardrails. Main-bundle ceiling of 102 KB gzipped is enforced in Step 19.
8. **iOS Safari Media Session ✅** — Support confirmed via public docs. `metadata`, `setActionHandler('play'|'pause'|'seekbackward'|'seekforward')` all work on iOS 15.4+. `playbackState` assignment required to keep lock-screen metadata visible after pause. Real-device verification deferred per BB-26 scope.
9. **Howler.js iOS unlock ✅** — Howler 2.2.4 in `html5: true` mode handles iOS unlock automatically on the first user gesture. **One gap confirmed:** Howler does NOT auto-set `crossOrigin="anonymous"` on its internal `<audio>` element, so the plan's Step 6 mitigation (direct assignment via `_sounds[0]._node`) is load-bearing for BB-27's future Web Audio ducking path.
10. **FCBH CORS posture ✅** — CloudFront returns `Access-Control-Allow-Origin: *` when an `Origin` header is present (with `Vary: Origin`). BB-27 ducking is unblocked.
11. **DBP rate limits ✅** — 1500 requests per key per window (window period not documented in headers; likely hourly). Per-key quota, shared across all Worship Room users. No backend proxy needed at BB-26 scale.
12. **FCBH key public-safety ⚠️ inferred, not explicit** — The DBP signup flow asks for Application URL, the API serves `ACAO: *` unconditionally, and the license language says "provide DBP content directly to end users." All three signals imply the key is intended for frontend use. No explicit "this key is safe to expose" statement exists in the docs. Treating `VITE_FCBH_API_KEY` as public-safe-but-rate-budgeted is the recon's best-effort conclusion.
13. **DBP license constraints ⚠️** — License prohibits offline audio caching and requires attribution link. Attribution link is now covered by functional requirement 50a above. BB-39's PWA service worker must exclude `*.cloudfront.net/audio/*` from runtime caching — see plan Step 18 for the follow-up TODO.
14. **DBP invalid-book-code bug ⚠️** — Requesting an unknown book code returns HTTP 200 with a fallback 1 Chronicles HLS playlist instead of 404. The DBP client must validate `response.data[0].book_id` against the requested book code — see plan Step 4 for the defensive check.

Full details (response shapes, URL examples, coverage table, rate-limit headers, license quotes) in `_plans/recon/bb26-audio-foundation.md`.
