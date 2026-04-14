# BB-26: FCBH Audio Bible Integration

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-4 (reader view core — audio control mounts in the reader chrome), BB-5 (focus mode — audio persists through focus mode the same way BB-20 ambient audio does), BB-17 (dateUtils — used for media session metadata timestamps), BB-20 (ambient audio — the `AudioProvider` that BB-26 extends with a narration channel). The existing Music page audio infrastructure is also reused for media session, sleep timer, and playback state persistence.
**Hands off to:** BB-27 (audio + ambient layering — formalizes the rules for mixing narration with ambient audio), BB-28 (sleep timer for Bible audio — reuses BB-26's narration playback state), BB-29 (continuous playback — the "auto-advance to next chapter" behavior), BB-44 (read-along mode — requires BB-26's timing data)
**Design system recon:** `_plans/recon/design-system.md`

---

## Overview

The Bible reader delivers text, and with BB-20 it delivers atmosphere. BB-26 adds the voice. A user reading John 3 on a sleepless night, or lying in bed too anxious to focus on the words, can tap a single control and hear the chapter read aloud by a professional narrator — layered over whatever ambient sound (rain, fireplace, ocean) they already have playing. For emotionally vulnerable users who struggle to focus, users with vision impairments, users with reading disabilities or ADHD, and users who just want to close their eyes and receive scripture rather than decode it, audio Bible is the feature that turns the reader from a website into a sanctuary.

This is the first technically complex spec in the wave's back half. Unlike the content-focused plans in BB-22 through BB-25, BB-26 is integration work — connecting a third-party audio source (Faith Comes By Hearing's public API), extending the existing `AudioProvider` with a second audio channel, and handling the edge cases of streaming media over sometimes-unreliable connections. The plan phase must do significant recon before writing any new files.

## User Stories

- As a **logged-in Bible reader**, I want to tap a control and hear the chapter I'm reading played aloud by a professional narrator so that I can engage with scripture through listening instead of reading.
- As a **reader who already has ambient rain playing**, I want to start narration without stopping the ambient sound so that I hear the chapter read aloud over the atmosphere I've already set.
- As a **user lying in bed with eyes closed**, I want to close my phone or background the app without losing playback so that I can listen without looking at a screen.
- As a **user with a vision impairment**, I want the same feature parity as sighted readers — I tap a clearly labeled control, it plays, I can pause, scrub, adjust speed, stop.
- As a **reader who glances away from the currently playing chapter**, I want the narration to keep playing the chapter I started listening to so that navigating the reader doesn't cut off my listening.
- As a **power user**, I want to adjust the playback speed (0.75x, 1x, 1.25x, 1.5x, 2x) so that I can match narration pace to my comprehension or mood.
- As a **user with a flaky connection**, I want the feature to fail gracefully with a clear error and retry button so that I'm not left staring at a spinning icon.

## What FCBH is (context for the plan phase)

Faith Comes By Hearing (FCBH) is a nonprofit that produces and freely distributes audio Bible recordings. Their public API at `https://4.dbt.io/api/` serves MP3 audio for scripture passages, including the WEB translation (the same translation the wave uses throughout). FCBH is free to use, produces high-quality studio recordings, supports WEB, supports granular passage requests, and is run by a real nonprofit with real documentation.

Tradeoffs the plan phase must accept:

- **Streaming only.** Audio files are large, cannot be bundled, and every playback requires a network request to FCBH's CDN. Offline caching is explicitly BB-39's job, not BB-26's.
- **Undocumented rate limits.** At our scale unlikely to hit them, but the error handling must treat rate-limit responses gracefully.
- **Third-party dependency.** If FCBH goes down, the feature degrades — the rest of the app is unaffected.
- **No word-level timing metadata.** The MP3s have no synchronized transcripts. BB-44 (read-along mode) will solve this separately; BB-26 does not.

FCBH publishes a JavaScript SDK but it is outdated and has peer dependency conflicts with modern React. The plan phase writes a thin direct-fetch client instead. The API surface we need is small (2–3 endpoints total).

## Recon (mandatory before plan execution writes any code)

This spec's plan phase absolutely must complete recon before writing any integration code. The `AudioProvider` infrastructure is complex and getting this wrong produces bugs that are hard to debug. The plan phase's first four tasks, in order:

**Recon task 1 — Locate and document the existing `AudioProvider`.** Find the file. Document its current API surface: what context value it exposes, what methods exist, how playback state is managed, how media session integration works, how the sleep timer interacts with it, how the current playing sound persists across route changes. Write this into the plan's recon notes.

**Recon task 2 — Locate the BB-20 extensions.** BB-20 added a `setReadingContext` method to `AudioProvider` and integrated ambient audio into the Bible reader. Read the BB-20 implementation carefully. BB-26 extends the same `AudioProvider` with a second audio channel (narration) that must coexist with the ambient channel BB-20 established.

**Recon task 3 — Verify FCBH API access from the dev machine.** Before writing any integration code, hit the FCBH API manually to confirm: (a) the API is reachable, (b) the WEB translation is available via the filesets endpoint, (c) a chapter request returns a valid audio file URL, (d) the URL is directly playable in an HTML5 `<audio>` element, (e) CORS headers allow browser playback. If any check fails, the plan phase must account for the failure before implementation begins.

**Recon task 4 — Run `/playwright-recon` against competing apps.** Capture UX reference from YouVersion audio Bible (industry standard), Dwell (audio-first Bible), Bible.is (FCBH's own app, same data source), and Audible (streaming audio reference). For each, document where the play button lives, how the currently-playing chapter is shown while the user scrolls elsewhere, how playback state persists across chapter navigation, how sleep timer integrates, what buffering and error states look like, how speed controls work, and what skip behavior is (±15s vs ±verse vs ±chapter).

## Requirements

### Functional Requirements

#### FCBH API client

1. A new module at `frontend/src/lib/audio/fcbh/` exposes a thin direct-fetch FCBH client. The module exports `getAudioUrl(book, chapter)` and `listAvailableFilesets()` as its public surface.
2. The client looks up the FCBH three-letter book code from a static map covering all 66 books (e.g., `'genesis' → 'GEN'`, `'psalms' → 'PSA'`, `'john' → 'JHN'`, `'revelation' → 'REV'`).
3. The client fetches the WEB fileset ID once at app startup and caches it in memory for the session. Subsequent `getAudioUrl` calls reuse the cached fileset ID.
4. `getAudioUrl(book, chapter)` returns the direct audio file URL for the requested chapter. The URL is cached in memory with a 1-hour TTL. Cache is memory-only — never written to localStorage.
5. The client throws typed errors: `FCBHNetworkError` (network unreachable), `FCBHNotFoundError` (404 / invalid book or chapter), `FCBHRateLimitError` (rate-limited, with `retry-after` if provided), `FCBHApiError` (everything else). Callers handle these and translate to user-facing UI.
6. The client has unit tests covering: successful fetch, network error, 404 error, rate limit error, and URL caching behavior.
7. No hardcoded API keys, tokens, or secrets in the source code. If FCBH requires a public API key, it is read from environment variables per `.claude/rules/08-deployment.md`.

#### Dual-channel `AudioProvider`

8. The existing `AudioProvider` (from the Music page, extended by BB-20) is extended to expose a second audio channel: `narration`. The ambient channel from BB-20 is unchanged.
9. The `narration` channel state surface: `currentChapter`, `isPlaying`, `isBuffering`, `isError`, `errorMessage`, `volume`, `playbackSpeed`, `currentTime`, `duration`.
10. The `narration` channel methods: `play(book, chapter)`, `pause()`, `resume()`, `stop()`, `seekTo(seconds)`, `setPlaybackSpeed(speed)`, `setVolume(volume)`.
11. The `narration` channel is backed by a single `<audio>` element owned by the `AudioProvider` component. The same element is reused for all chapter playbacks — playing a new chapter changes `src`, it does not create a new element. This is a hard rule because iOS Safari enforces a ~16-element active audio limit.
12. The narration `<audio>` element is mounted at the `AudioProvider` level (app root), NOT inside the reader. It must survive route changes so that playback continues when the user navigates away from the current chapter.
13. The ambient and narration channels are independent. Starting narration does NOT stop ambient audio. Starting ambient audio does NOT stop narration. Both channels play simultaneously at their respective volumes.
14. The narration channel's default volume is `85` (deliberately loud; users want to hear the words). The ambient channel retains its BB-20 default of `35`. BB-27 will formalize auto-duck behavior; BB-26 makes no attempt to duck or mix smartly.
15. `playbackSpeed` is discrete: `0.75 | 1 | 1.25 | 1.5 | 2`. Not a slider, not continuous.
16. BB-20's ambient audio behavior must be unchanged by BB-26's extensions. Every BB-20 acceptance criterion still passes after BB-26 ships.

#### The `NarrationControl` (reader chrome)

17. A new component `NarrationControl` mounts in the Bible reader's top action bar, next to (not replacing) the BB-20 ambient audio control.
18. Visual states: (a) not playing — icon at reduced opacity with a play glyph, (b) loading/buffering — spinner or pulse animation, (c) playing — full opacity with pause glyph, (d) error — muted with a small warning indicator.
19. Tapping the control opens the `NarrationPicker`. Tapping the control in error state also opens the picker (the error card inside the picker explains what went wrong and offers retry).
20. Reduced motion: the buffering pulse/spinner is replaced with a static color shift per `prefers-reduced-motion`.

#### The `NarrationPicker`

21. The picker renders as a bottom sheet (mobile) or popover anchored to the control (desktop), matching BB-20's `AmbientAudioPicker` pattern.
22. Contents, top to bottom: (a) heading "Listen", (b) current chapter label (e.g., "John 3"), (c) large prominent play/pause button, (d) scrubber with `current / total` labels in `M:SS / M:SS` format, (e) `-15s` and `+15s` skip buttons flanking the play/pause button, (f) playback speed button showing current speed and cycling `0.75x → 1x → 1.25x → 1.5x → 2x → 0.75x` on tap, (g) narration volume slider (independent of the BB-20 ambient volume slider), (h) "Set a sleep timer" link, (i) "Stop playback" button.
23. The "Set a sleep timer" link: BB-26 either shows this disabled with "Coming soon" OR wires it to the existing ambient sleep timer as a temporary shortcut. The plan phase picks whichever is simpler; BB-28 will replace this with a dedicated narration sleep timer.
24. The picker closes on backdrop tap, X button, or Escape key. It is focus-trapped while open.
25. The scrubber updates in real time as audio plays (`timeupdate` events) and supports dragging to seek.
26. The scrubber is keyboard-accessible: Left/Right arrow keys seek by 5 seconds.
27. The `-15s` and `+15s` buttons adjust `currentTime` by exactly 15 seconds, clamped to `[0, duration]`.
28. The narration volume slider adjusts the narration channel's volume independently of the ambient channel. The slider value persists as the reader-context default across sessions.

#### Mutual exclusion with BB-20's `AmbientAudioPicker`

29. The `NarrationPicker` and BB-20's `AmbientAudioPicker` cannot be open simultaneously. Opening one closes the other. Same z-index layer, same transition pattern.

#### Chapter navigation and playback rules

30. **Play on a new chapter while one is already playing:** the currently playing audio stops, the new chapter's audio loads, and playback begins automatically. No dialog, no confirmation.
31. **Navigate to a different chapter while narration is playing:** narration keeps playing the original chapter until it finishes or the user stops it. The `NarrationControl` in the reader chrome shows the currently-playing chapter (not the currently-viewed chapter). See the `NarrationCurrentlyPlayingIndicator` requirement below.
32. **A `NarrationCurrentlyPlayingIndicator` component** renders a small chip in the reader chrome (e.g., near or under the narration control) whenever the currently-playing narration chapter differs from the currently-viewed chapter. The chip reads "Now playing: {Book} {Chapter}" and, on tap, navigates the reader back to that chapter. This indicator is a P1 requirement, not a nice-to-have — it is the UX touch that makes listening feel continuous instead of brittle.
33. **Tap play on a new chapter while a different chapter is narrating:** the old chapter stops, the new chapter loads, the new chapter plays. Standard replace behavior.
34. **End of chapter:** playback stops. No auto-advance. BB-29 will add opt-in continuous playback and attach itself to the end-of-chapter callback BB-26 exposes.
35. **Rapid chapter navigation with `narrationAutoStart` enabled:** if the user navigates rapidly between chapters (John 3 → John 4 → John 5 within 2 seconds), only the most recent chapter's audio actually plays. The `AudioProvider` cancels in-flight playback requests for superseded chapters by comparing book/chapter against the currently-requested chapter and bailing if the user has moved on.

#### Media session integration

36. When narration is playing, the OS media session metadata reflects: Title = `"{Book} {Chapter}"` (e.g., `"John 3"`), Artist = `"Audio Bible · WEB translation"`, Album = `"Worship Room"`, Artwork = the wave's default Bible icon (or a simple book/cross glyph).
37. When both narration and ambient are playing, the media session shows the narration metadata (narration is the primary content).
38. When only ambient is playing, the media session shows the ambient metadata (matching BB-20 behavior).
39. When both channels stop, the media session clears.
40. Media session action handlers: `play` → resume narration, `pause` → pause narration, `seekforward` → `+15s`, `seekbackward` → `-15s`. `previoustrack` and `nexttrack` are disabled in BB-26 (BB-29 will add `nexttrack`).

#### Error handling

41. **Network unreachable:** `NarrationControl` shows error state. Picker, when opened, shows an error card at the top with a retry button.
42. **404 (chapter URL not found):** picker shows "This chapter's audio isn't available right now" with a retry button.
43. **403 / 401 (should not happen for public FCBH):** log the raw error to console, picker shows a generic error message.
44. **Rate limited:** picker shows "Too many audio requests. Try again in a moment." Retry button waits for the duration in the `Retry-After` header if provided before re-enabling.
45. **CORS failure:** picker shows a generic error, raw error logged to console. (Should not happen if recon verified CORS works.)
46. **`MediaError` during playback (e.g., `MEDIA_ERR_NETWORK`, `MEDIA_ERR_DECODE`):** picker shows "Audio playback failed. Check your connection and try again." Different error codes do not need distinct user messages.
47. **Slow connection:** if buffering exceeds 10 seconds, the error state fires with "Connection is slow. Try again when you have a better connection." The 10-second timeout is a hard design choice — the plan phase must not shorten it.
48. **Transient stall (e.g., user turns off wifi briefly):** `stalled` and `suspend` events are treated as transient. BB-26 waits 10 seconds before showing the slow-connection error. If the connection comes back within 10 seconds, playback resumes silently.
49. **Retry behavior:** one tap of the retry button reattempts the original request. No automatic retries, no exponential backoff. Trust the user to decide whether to retry.

#### Settings integration

50. The reader settings panel (from BB-4, extended by BB-20's "Background sound" section) gains a new "Audio narration" section with three fields:
    - **Toggle:** "Show narration control in reader" (controls `narrationControlVisible`, default `true`)
    - **Toggle:** "Auto-play narration when opening a chapter" (controls `narrationAutoStart`, default `false`)
    - **Dropdown:** "Default playback speed" (values `0.75x | 1x | 1.25x | 1.5x | 2x`, default `1x`)
51. Auto-play default is `false`. This is non-negotiable. A user who opens a chapter and hears unexpected narration is going to close the app forever. Every user opts in explicitly.
52. Settings persist within the existing reader settings object managed by BB-4. No new top-level `wr_*` keys are created by BB-26; the new fields are added to `wr_bible_reader_*` or the structured settings object established by BB-4.

#### Focus mode coexistence

53. Entering BB-5 focus mode does NOT stop narration. Playback continues.
54. The `NarrationControl` remains accessible from focus mode via the same chrome-access pattern focus mode uses for the BB-20 ambient control (e.g., `...` overflow or tap-to-reveal).

#### Tab visibility and background behavior

55. Narration does NOT stop when the browser tab loses visibility. Users expect background audio to continue.
56. Behavior when the app is backgrounded for an extended period depends on OS: BB-26 does not try to fight OS suspension behavior. Whatever state the `<audio>` element is in when the user returns is the state reflected in the UI. Media session controls continue to work at the OS level regardless.

### Non-Functional Requirements

- **Performance:** The narration `<audio>` element is a single long-lived element reused across chapters. No audio engine reinitialization. URL cache is in-memory only (1-hour TTL). No localStorage writes on the hot path.
- **Accessibility:** WCAG 2.1 AA. All controls have `aria-label` attributes. Play/pause button is keyboard-accessible (Enter / Space toggles). Scrubber is keyboard-accessible (Left/Right arrows seek). Volume slider has proper ARIA labels and keyboard support. Picker is focus-trapped when open. Screen reader announces play/pause state changes via `aria-live`. All tap targets ≥ 44px. Lighthouse accessibility score ≥ 95 with the picker open.
- **Reduced motion:** All buffering/loading animations respect `prefers-reduced-motion`. The buffering state replaces spinner/pulse with a static color shift.
- **Bundle size:** No new audio engine dependencies. The FCBH client is a thin direct-fetch module. New UI components are lightweight React wrappers.
- **iOS Safari:** Test on a real iPhone, not a desktop emulator. iOS has specific behavior around audio elements, autoplay policies, background audio, and media session that differs from every other browser. The plan phase must allocate explicit real-device testing time.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See `NarrationControl` icon | Matches BB-20's ambient control visibility pattern (plan phase verifies and mirrors it) | Visible in reader chrome when `narrationControlVisible` is `true` | N/A |
| Tap `NarrationControl` icon | Matches BB-20 auth pattern for the reader action bar | Opens `NarrationPicker` | N/A |
| Play / pause narration | Matches BB-20 auth pattern | Full access | N/A |
| Scrub / seek | N/A (gated if logged out) | Full access | N/A |
| Adjust playback speed | N/A (gated if logged out) | Full access | N/A |
| Adjust narration volume | N/A (gated if logged out) | Full access, persisted | N/A |
| Change narration settings in reader settings panel | N/A (settings panel gated per BB-4) | Full access | N/A |
| See `NarrationCurrentlyPlayingIndicator` | Visible if any narration is active | Visible if any narration is active | N/A |

**Note:** BB-26 mirrors BB-20's auth gating exactly. The reader chrome auth pattern from BB-4 is the source of truth — the plan phase must verify the BB-20 implementation and match it precisely rather than inventing a new auth pattern. If BB-20 shows the ambient control to logged-out users with an auth-modal-on-tap, BB-26 does the same for the narration control. If BB-20 hides the control entirely, BB-26 does the same.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `NarrationControl` icon in reader top bar (same size as other action icons, next to the BB-20 ambient control). `NarrationPicker` renders as a full-width bottom sheet, max-height 65vh, swipe-down dismiss. Scrubber full-width, speed/volume controls stacked. Skip `-15s` / play / `+15s` in a horizontal row. `NarrationCurrentlyPlayingIndicator` chip renders under the reader chrome or docked to the top action bar area (plan phase picks the less intrusive location). |
| Tablet (640–1024px) | Same as mobile layout but bottom sheet is narrower (max-width 520px, centered). `NarrationCurrentlyPlayingIndicator` chip may render inline in the action bar. |
| Desktop (> 1024px) | `NarrationControl` icon in reader top bar. `NarrationPicker` renders as a popover anchored below the icon (width ~360px). Controls laid out with more horizontal space; scrubber on its own row, skip/play/speed/volume on a second row. `NarrationCurrentlyPlayingIndicator` chip renders inline with the action bar. |

All tap targets ≥ 44px across every breakpoint, including scrubber thumb, skip buttons, speed cycle button, volume slider thumb, and the `NarrationCurrentlyPlayingIndicator` chip.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Audio is professionally recorded narration served directly from FCBH; no AI moderation layer is required. No crisis detection is required.

## Auth & Persistence

- **Logged-out users:** Matches BB-20's pattern. No narration state persisted for logged-out users (demo-mode zero-persistence rule from `.claude/rules/02-security.md`).
- **Logged-in users:** Narration volume and playback speed persist in the existing reader settings object. Playback state (currently playing chapter, current time) is session-only in-memory state on the `AudioProvider` — NOT persisted to localStorage, because restoring mid-chapter playback across sessions is out of scope for BB-26.
- **localStorage usage:**
  - New fields inside the existing reader settings structure managed by BB-4 (and extended by BB-20):
    - `narrationControlVisible` (boolean, default `true`)
    - `narrationAutoStart` (boolean, default `false`)
    - `narrationDefaultSpeed` (`0.75 | 1 | 1.25 | 1.5 | 2`, default `1`)
    - `narrationVolume` (0–100, default `85`)
  - No new top-level `wr_*` keys. These fields live within the existing reader settings object per `.claude/rules/11-local-storage-keys.md`.
  - The FCBH URL cache is in-memory only — explicitly NOT localStorage — to avoid storing signed URLs that may expire or contain caching headers.

## Completion & Navigation

N/A — The Bible reader is not part of the Daily Hub tabbed experience. BB-26 does NOT integrate with reading plan mark-complete. Listening to John 3 without scrolling or tapping Mark Complete does not auto-complete a plan day. Mark Complete stays a manual action. There is no "listen instead of read" button on plan days — users who want to listen just tap the `NarrationControl`.

## Design Notes

- **Icons:** Use Lucide glyphs matching existing reader chrome patterns. `Headphones` or `Play` for the `NarrationControl` in its default state; `Pause` when playing; `Loader2` with spin for buffering; `AlertCircle` at reduced opacity for error state.
- **`NarrationControl` sizing and placement:** Match the existing reader action bar icon sizing and spacing from BB-4 and BB-20. The narration control sits next to the BB-20 ambient control — do not merge them, do not nest them, do not reorder existing controls.
- **`NarrationPicker` styling:** Dark frosted glass matching the `AmbientAudioPicker` from BB-20 and the existing `AudioDrawer` aesthetic: `rgba(15, 10, 30, 0.95)` background with `backdrop-blur(16px)`, `border border-white/10`, `rounded-2xl`. Consistent with `.claude/rules/09-design-system.md` and the design system recon.
- **Scrubber styling:** Track `bg-white/20`, fill `bg-primary`, thumb white circle 20px diameter. Match the BB-20 volume slider pattern for keyboard focus ring and reduced-motion behavior.
- **Play/pause button:** Large prominent circular button. White or primary fill, dark icon. Minimum 56px for the primary control (exceeds the 44px tap target minimum).
- **Speed cycle button:** Small pill-shaped button showing current speed as text (e.g., `1x`, `1.5x`). Uses `bg-white/[0.08]` with `border border-white/[0.12]` matching FrostedCard micro-variant.
- **`NarrationCurrentlyPlayingIndicator` chip:** Small pill-shaped chip with a tiny sound-wave or play icon, text reading "Now playing: John 3". `bg-white/[0.08]` background, `border border-primary/40` accent border to signal activity, `text-white/80` text. Tappable with `aria-label="Return to currently playing chapter: John 3"`.
- **Error state styling:** Error cards inside the picker use the warm-warning pattern from `09-design-system.md` — not alarming red, but clearly distinguishable from normal content. The retry button is a standard primary button.
- **Bottom sheet animation:** Reuse the existing bottom sheet pattern (`animate-bottom-sheet-slide-in`, swipe-down dismiss) from BB-20 and the `AudioDrawer`.
- **All text:** `text-white` for headings, `text-white/70` for secondary labels, `text-white/50` for hint/caption text. Zero raw hex values.
- **Default narration volume 85:** Deliberate. Narration is the primary content when it's playing — users want to hear the words over ambient sound. The 85/100 default is the right number for this context.

**Design system recon referenced:** `_plans/recon/design-system.md`. Audio component patterns, frosted glass values, drawer animations, and the BB-20 ambient picker styling are documented there.

**New visual patterns (flag for `[UNVERIFIED]` marking during `/plan`):**
- **Narration scrubber** — not yet in the design system recon. Plan phase must derive exact values from the recon's range-input patterns and mark them `[UNVERIFIED]` until verified.
- **`NarrationCurrentlyPlayingIndicator` chip** — new component pattern. Plan phase derives styling from existing chip/pill patterns and marks it `[UNVERIFIED]`.
- **Speed cycle button** — small pill variant. Plan phase derives from existing small button patterns and marks it `[UNVERIFIED]`.

All other patterns (`NarrationControl` icon, `NarrationPicker` frosted glass, error card, bottom sheet animation) reuse existing documented patterns.

## Critical Edge Cases

1. **FCBH is down entirely.** Every narration playback attempt fails with a network error. The narration control shows the error state. The rest of the app is unaffected. Correct graceful degradation.
2. **2G / very slow connection.** The 10-second buffering timeout fires and shows the slow-connection error. User retries when they have better bandwidth.
3. **User turns off wifi mid-playback.** `stalled` / `suspend` events fire. BB-26 waits 10 seconds before showing the error. If connectivity returns within 10 seconds, playback resumes silently. Otherwise, error state.
4. **User backgrounds the app during playback, returns 30+ minutes later.** OS behavior determines playback state. BB-26 does not fight OS suspension. The UI reflects whatever state the `<audio>` element is in on return.
5. **Phone call interrupts playback (iOS / Android).** The `<audio>` element receives a `pause` event. Narration control reflects the paused state. When the call ends, user taps resume.
6. **User starts narration, then starts ambient audio.** Both play. Narration at 85, ambient at 35. User hears the chapter being read over soft rain. This is the intended experience.
7. **User starts ambient audio, then starts narration.** Same result. Order does not matter.
8. **User starts narration while the BB-20 ambient sleep timer is counting down.** The ambient sleep timer continues to count down and stops ambient audio when it fires. Narration keeps playing on its own channel. BB-28 will add a dedicated narration sleep timer; until then, narration has no sleep timer and plays until the chapter ends or the user stops it.
9. **FCBH recording includes intro audio ("The Gospel of John, chapter 3…").** BB-26 does not skip or strip this. The audio plays in its entirety.
10. **User has `narrationAutoStart` enabled and navigates rapidly (John 3 → John 4 → John 5 in 2 seconds).** Only the most recent chapter plays. Superseded playback requests are canceled.
11. **Narration picker is open when a playback error occurs.** The picker shows an inline error card at the top with a retry button. The `NarrationControl` icon in the reader chrome also reflects the error state.
12. **User opens the narration picker while BB-20's ambient picker is open.** The ambient picker closes, the narration picker opens. Same z-index layer, smooth transition.
13. **User taps the `NarrationCurrentlyPlayingIndicator` chip while on a different chapter.** The reader navigates back to the currently-playing chapter. Audio continues without interruption.
14. **Signed URL expires mid-playback.** Should not happen within a single chapter's duration, but if the `<audio>` element receives a `MediaError` during playback, BB-26 shows the generic playback error and the user retries. The retry fetches a fresh URL.
15. **Multiple browser tabs.** Each tab has an independent `AudioProvider` state. Known limitation, accepted (same as BB-20 and BB-16).

## Out of Scope

- **No offline caching of audio files.** BB-39 (PWA) territory.
- **No auto-advance to the next chapter.** BB-29.
- **No narration-specific sleep timer.** BB-28. (BB-26 may temporarily wire the "Set a sleep timer" link to the existing BB-20 ambient sleep timer or leave it disabled with "Coming soon" — the plan phase picks the simpler path.)
- **No word-level or verse-level timing metadata.** BB-44 (read-along mode).
- **No FCBH-specific UI branding.** Users do not need to see "Powered by Faith Comes By Hearing" anywhere. The audio just plays.
- **No multi-voice narrator selection.** FCBH has multiple English recordings (dramatized, non-dramatized, various narrators). BB-26 picks one fileset and uses it exclusively.
- **No dramatized vs. non-dramatized toggle.**
- **No podcast-style chapter bookmarks.** Users cannot mark a timestamp for later.
- **No synchronized transcription or captions.** The reader shows the text, the audio plays the words, but there is no karaoke-style highlighting.
- **No continuous speed slider.** Speeds are discrete (`0.75x | 1x | 1.25x | 1.5x | 2x`).
- **No audio-only mode.** The reader always shows text; audio is an optional layer.
- **No Bluetooth device routing UI.** Browser/OS handles this automatically via media session.
- **No equalizer or audio effects.** The MP3 plays raw.
- **No shared listening** ("listen to this chapter with me"). No sync, no rooms.
- **No download button for offline.** BB-39.
- **No queue or playlist.** One chapter at a time.
- **No analytics on listening behavior.** Not tracking how many minutes users listen or which chapters are most played.
- **No subscription or paywall.** Audio is free because FCBH is free.
- **No integration with reading plans' mark-complete flow.** Listening does not auto-complete a plan day.
- **No "listen instead of read" button on plan days.**
- **No verse-level playback.** Chapter is the smallest unit.
- **No audio highlights or clips.** Users cannot save 30-second snippets.
- **No pitch correction beyond what the browser provides automatically.**
- **No cross-session playback resume.** Closing the tab clears current playback state; next session starts fresh.
- **No restoration of FCBH SDK.** Thin direct-fetch client only; no SDK, no middleware layer, no request queue, no offline-first shim. BB-26 is a client, not a framework.
- **No Music page UI changes.** BB-26 extends `AudioProvider` internally but adds no narration UI to the Music page. Narration is a reader-only feature for this spec.
- Backend API work is Phase 3+.

## Acceptance Criteria

### FCBH client
- [ ] `frontend/src/lib/audio/fcbh/fcbhClient.ts` exists and exports `getAudioUrl(book, chapter)` and `listAvailableFilesets()`.
- [ ] A `bookCodes.ts` file contains the complete 66-book mapping from lowercase English slug to FCBH three-letter code.
- [ ] Typed errors `FCBHNetworkError`, `FCBHNotFoundError`, `FCBHRateLimitError`, `FCBHApiError` exist in `errors.ts`.
- [ ] `fcbhClient.test.ts` unit tests cover: successful fetch, network error, 404 error, rate limit error with `Retry-After` header, and URL caching (cache hit within 1 hour, cache miss after expiry).
- [ ] The WEB fileset ID is fetched once per session and cached in memory.
- [ ] URL cache is in-memory only with a 1-hour TTL. Zero localStorage writes from the FCBH client.
- [ ] Zero hardcoded API keys, tokens, or secrets in the source code.
- [ ] Plan phase verified FCBH API access from the dev environment (all 5 checks from Recon task 3) BEFORE any integration code was written.
- [ ] Plan phase documented the existing `AudioProvider` API surface in recon notes BEFORE any new `AudioProvider` code was written.

### `AudioProvider` dual-channel extension
- [ ] `AudioProvider` exposes a `narration` channel with the documented state surface (`currentChapter`, `isPlaying`, `isBuffering`, `isError`, `errorMessage`, `volume`, `playbackSpeed`, `currentTime`, `duration`).
- [ ] `AudioProvider` exposes narration methods (`play`, `pause`, `resume`, `stop`, `seekTo`, `setPlaybackSpeed`, `setVolume`).
- [ ] `AudioProvider` owns exactly one `<audio>` element for narration, reused across all chapter playbacks (verified: playing 3 chapters in sequence results in a single `<audio>` element in the DOM, with `src` changing each time).
- [ ] The narration `<audio>` element is mounted at the `AudioProvider` level, not inside the reader. It survives route changes (verified: starting narration, navigating to the landing page, and navigating back shows playback continuing).
- [ ] Starting narration does NOT stop the ambient channel.
- [ ] Starting ambient audio does NOT stop the narration channel.
- [ ] Both channels play simultaneously with independent volumes (verified: narration at 85, ambient at 35, both audible).
- [ ] BB-20's ambient audio acceptance criteria all still pass after BB-26 ships.

### `NarrationControl`
- [ ] `NarrationControl` mounts in the reader chrome next to the BB-20 ambient control.
- [ ] Visual states for not-playing, buffering, playing, and error are all implemented.
- [ ] `prefers-reduced-motion` replaces buffering animation with a static color shift.
- [ ] Tapping the control opens the `NarrationPicker`.

### `NarrationPicker`
- [ ] Picker heading reads "Listen".
- [ ] Picker shows the current chapter (e.g., "John 3").
- [ ] Large prominent play/pause button toggles playback.
- [ ] Scrubber updates in real time during playback.
- [ ] Scrubber shows `M:SS / M:SS` format labels.
- [ ] Scrubber supports drag-to-seek with mouse and touch.
- [ ] Scrubber is keyboard-accessible (Left/Right seek by 5 seconds).
- [ ] `-15s` and `+15s` skip buttons adjust `currentTime`, clamped to `[0, duration]`.
- [ ] Playback speed button cycles `0.75x → 1x → 1.25x → 1.5x → 2x → 0.75x`.
- [ ] Narration volume slider adjusts narration volume independently of ambient.
- [ ] "Stop playback" button stops narration and resets the control.
- [ ] "Set a sleep timer" link is either disabled with "Coming soon" or wires to the existing ambient sleep timer (plan phase choice).
- [ ] Picker closes on backdrop tap, X button, or Escape key.
- [ ] Picker is focus-trapped while open.
- [ ] `NarrationPicker` and BB-20's `AmbientAudioPicker` cannot be open simultaneously (opening one closes the other).

### Chapter navigation and playback
- [ ] Playing a new chapter while one is already playing stops the old chapter and starts the new one with no dialog.
- [ ] Navigating to a different chapter while narration is playing keeps narration playing the original chapter.
- [ ] `NarrationCurrentlyPlayingIndicator` chip appears in the reader chrome whenever the currently-playing narration chapter differs from the currently-viewed chapter.
- [ ] The chip reads "Now playing: {Book} {Chapter}".
- [ ] Tapping the chip navigates the reader back to the currently-playing chapter.
- [ ] Tapping play on a new chapter while a different chapter is narrating stops the old chapter and starts the new one.
- [ ] When the chapter audio ends, playback stops. No auto-advance.
- [ ] With `narrationAutoStart` enabled, rapid chapter navigation (3 chapters in < 2 seconds) results in only the most recent chapter actually playing — superseded requests are canceled.

### Media session
- [ ] When narration is playing, media session metadata shows Title = `"{Book} {Chapter}"`, Artist = `"Audio Bible · WEB translation"`, Album = `"Worship Room"`, artwork present.
- [ ] When both narration and ambient play, media session shows narration metadata.
- [ ] When only ambient plays, media session shows ambient metadata (BB-20 behavior unchanged).
- [ ] Media session `play` handler resumes narration.
- [ ] Media session `pause` handler pauses narration.
- [ ] Media session `seekforward` handler moves `+15s`.
- [ ] Media session `seekbackward` handler moves `-15s`.
- [ ] Media session `previoustrack` and `nexttrack` are disabled in BB-26.

### Error handling
- [ ] Network errors show the error state in `NarrationControl` and an error card with retry button in `NarrationPicker`.
- [ ] 404 errors show "This chapter's audio isn't available right now" with retry button.
- [ ] Rate-limit errors show "Too many audio requests. Try again in a moment." and respect `Retry-After` header for retry button enablement.
- [ ] Slow connection (>10 seconds buffering) shows "Connection is slow. Try again when you have a better connection."
- [ ] Transient stall (<10 seconds) does NOT show an error; playback resumes silently if connectivity returns.
- [ ] `MediaError` during playback shows "Audio playback failed. Check your connection and try again."
- [ ] Retry button reattempts the original request without automatic retries.

### Settings
- [ ] Reader settings panel has an "Audio narration" section.
- [ ] Section includes "Show narration control in reader" toggle (default `true`).
- [ ] Section includes "Auto-play narration when opening a chapter" toggle (default `false`, non-negotiable).
- [ ] Section includes "Default playback speed" dropdown (default `1x`).
- [ ] Settings persist within the existing reader settings object. No new top-level `wr_*` keys.

### Focus mode
- [ ] Entering BB-5 focus mode does not stop narration playback.
- [ ] `NarrationControl` remains accessible from focus mode via the existing BB-5 chrome-access pattern.

### Accessibility
- [ ] All controls have meaningful `aria-label` attributes.
- [ ] Play/pause button is keyboard-accessible (Enter / Space).
- [ ] Scrubber is keyboard-accessible (Left/Right arrows).
- [ ] Volume slider is keyboard-accessible.
- [ ] Picker is focus-trapped when open.
- [ ] Screen reader announces play/pause state changes via `aria-live`.
- [ ] All tap targets ≥ 44px.
- [ ] Reduced motion respected on all buffering/loading animations.
- [ ] Lighthouse accessibility score ≥ 95 with the picker open.

### Design system compliance
- [ ] Zero raw hex values in any new component or stylesheet.
- [ ] `NarrationPicker` frosted glass styling matches BB-20's `AmbientAudioPicker` and the `AudioDrawer` pattern from the design system recon.
- [ ] `NarrationCurrentlyPlayingIndicator` chip uses existing chip/pill patterns (values marked `[UNVERIFIED]` during planning until verified via `/verify-with-playwright`).
- [ ] Narration scrubber matches documented range-input patterns (values marked `[UNVERIFIED]` during planning until verified).

### Recon gates (blocking)
- [ ] Plan phase completed Recon task 1 (AudioProvider documentation) before writing any new code.
- [ ] Plan phase completed Recon task 2 (BB-20 extension review) before writing any new code.
- [ ] Plan phase completed Recon task 3 (FCBH API verification — all 5 checks) before writing any integration code.
- [ ] Plan phase completed Recon task 4 (`/playwright-recon` against YouVersion, Dwell, Bible.is, and Audible) before designing the `NarrationPicker` layout.
- [ ] Real-iOS-device testing was allocated explicitly in the plan phase.
