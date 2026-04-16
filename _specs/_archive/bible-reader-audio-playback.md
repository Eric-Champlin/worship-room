# Feature: Bible Reader — Audio Playback with TTS

**Spec sequence:** This is Spec 3 (final) of the 3-spec Bible reader sequence.
- Spec 1 (`bible-reader-browser.md` / Spec 23): Bible browser and chapter reading view
- Spec 2 (`bible-reader-highlights-notes.md` / Spec 24): Highlighting, notes, and verse sharing
- **Spec 3 (this spec / Spec 25): Audio playback with TTS for chapters**

**Depends on:** Both Spec 1 and Spec 2 must be built first. This spec adds audio controls to the existing `/bible/:book/:chapter` reading view.

---

## Overview

Scripture was written to be read aloud. For thousands of years, the Bible was experienced primarily through hearing — in synagogues, churches, and family gatherings. Worship Room's Bible reader delivers a beautiful reading experience, but it's silent. Adding audio playback transforms the reader into a listening experience — ideal for users who absorb better by hearing, who want to follow along as the text is read, or who simply want to fall asleep to Scripture at the end of a long day.

This spec adds a persistent audio control bar to the chapter reading view that uses the browser's Speech Synthesis API (the same TTS engine powering prayer read-aloud and meditation voice guidance) to read chapters verse-by-verse. As each verse is spoken, it's highlighted in the text so users can follow along. The feature integrates with the existing ambient sound system (offering calming background soundscapes while listening), the sleep timer (for "fall asleep to Scripture" usage), and the meditation minutes tracker (listening to a full chapter counts as spiritual practice time).

The audio bar works for everyone — listening to Scripture should never require an account. Only progress tracking and meditation time recording require authentication, consistent with the Bible reader's existing auth model.

---

## User Stories

- As a **logged-out visitor**, I want to listen to any Bible chapter read aloud so that I can experience Scripture through hearing without needing to create an account.
- As a **logged-in user**, I want the current verse highlighted as it's being read so that I can follow along in the text and stay engaged with the passage.
- As a **logged-in user**, I want listening to a full chapter to count toward my meditation minutes so that my Scripture listening practice is acknowledged in my growth journey.
- As any user, I want to adjust the reading speed and voice so that I can customize the listening experience to my preference.
- As any user, I want to add ambient background sounds while listening so that I can create an immersive atmosphere for Scripture listening.
- As any user, I want the audio to respect the sleep timer so that I can fall asleep to Scripture without worrying about it playing all night.

---

## Requirements

### Audio Control Bar

1. **A persistent audio control bar** appears on the `/bible/:book/:chapter` reading view, positioned below the chapter heading and above the verse text.

2. **Bar contents** (left to right):
   - A **Play/Pause button** (Lucide `Play` / `Pause` icons). Primary style — this is the main action.
   - A **Stop button** (Lucide `Square` icon). Ghost/muted style — secondary action.
   - A **speed selector** with 4 options: 0.75x, 1x, 1.25x, 1.5x. Displayed as small pills in a horizontal row. Default is 1x. The selected pill uses `bg-primary/20` and `text-primary` styling; unselected pills use `text-white/50`.
   - A **progress indicator** showing "Verse X of Y" as text in `text-white/50`.
   - A **voice gender toggle** — two small icons representing male and female voices. The selected icon uses `text-primary`; the unselected icon uses `text-white/30`.

3. **Bar styling**: Frosted glass — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`. Consistent with other frosted glass patterns in the Bible reader (chapter selector dropdown, category headers).

4. **Sticky behavior**: The audio bar becomes sticky when scrolling — `position: sticky` with `top` set just below the navbar height (so it doesn't overlap). The bar stays visible as the user scrolls through verses.

5. **Bar visibility**: The audio bar is always visible on chapters that have full verse text. It is not shown on placeholder chapters (books without full text).

### Verse-by-Verse TTS Playback

6. **Speech Synthesis API**: Each verse is a separate `SpeechSynthesisUtterance` object. Verses are queued one at a time (not all at once) — when one verse finishes speaking, a 300ms pause (via `setTimeout`) is inserted before the next verse begins. This per-verse approach enables accurate verse tracking and highlighting.

7. **Playback rate**: Set via `utterance.rate` based on the speed selector value. Changing the speed during playback takes effect on the next verse (not the currently speaking verse).

8. **Voice selection**: When the user toggles voice gender, filter `speechSynthesis.getVoices()` for voices whose `name` property contains "female" or "male" (case-insensitive). If a matching voice is found, set `utterance.voice` to it. If no match is found (common on some browsers/platforms), fall back to the default voice. Changing voice during playback takes effect on the next verse.

9. **Voice gender toggle visibility**: If `speechSynthesis.getVoices()` returns only one voice (or zero voices), hide the voice gender toggle entirely — it would be non-functional.

10. **Play/Pause behavior**:
    - **Play**: Begins reading from verse 1 (or from the current verse if resuming after pause). Calls `speechSynthesis.speak()` with the current verse's utterance.
    - **Pause**: Calls `speechSynthesis.pause()`. The Play button changes back to Play icon. Pressing Play again calls `speechSynthesis.resume()`.
    - **Stop**: Calls `speechSynthesis.cancel()`. Resets the current verse to 1. Clears all highlights.

11. **End of chapter**: When the last verse finishes speaking, playback stops automatically. The Play button returns to the Play icon. Highlights are cleared.

### Verse Highlighting During Playback

12. **Current verse highlight**: The verse currently being read aloud receives a left border (`border-l-2 border-primary`) and a subtle background highlight (`bg-primary/5`). This highlight style is visually distinct from Spec 2's persistent highlight colors (which are background tints at 15% opacity in yellow/green/blue/pink) — the TTS highlight uses a left border accent that Spec 2's highlights do not.

13. **Highlight transitions**: When one verse finishes and the next begins, the highlight smoothly moves (previous verse's highlight is removed, next verse's highlight is applied). If `prefers-reduced-motion` is active, the transition is instant (no animation).

14. **Coexistence with Spec 2 highlights**: A verse can have both a Spec 2 color highlight (e.g., yellow background tint) and the TTS playback highlight (left border + primary background) simultaneously. They do not conflict because they use different CSS properties (background color vs. left border + lighter background overlay).

### Auto-Scroll During Playback

15. **Auto-scroll behavior**: As each verse begins being read, the page auto-scrolls to keep the current verse centered in the viewport. The scroll uses `scrollIntoView({ behavior: 'smooth', block: 'center' })`. Auto-scroll only fires if the current verse is off-screen (partially or fully outside the viewport) — if the user is reading ahead and the verse is already visible, no scroll occurs.

16. **Manual scroll pause**: During playback, if the user manually scrolls (detected via a `scroll` event listener), auto-scroll is paused for 5 seconds after the last detected manual scroll. After 5 seconds of no manual scrolling, auto-scroll resumes. This prevents the jarring experience of auto-scroll fighting the user's manual scrolling.

17. **Reduced motion**: When `prefers-reduced-motion` is active, auto-scroll is disabled entirely. The verse highlighting still works (so users can visually track which verse is playing), but the page does not scroll automatically. Users can manually scroll to follow along.

### Ambient Sound Pairing

18. **"Add background sounds" chip**: Below the audio control bar, a subtle chip/pill appears (same pattern as the ambient cross-pollination pill from Spec 6). When no ambient sounds are playing, it shows a music note icon + "Add background sounds" text.

19. **Scene suggestions**: Tapping the chip expands a small inline panel with 3 scene suggestions appropriate for Bible reading:
    - "Still Waters"
    - "The Upper Room"
    - "Morning Mist"

20. **Playing state**: If ambient sounds are already playing (detected via `AudioProvider`), the chip shows "Playing: [scene name]" (or "Playing: Custom mix") with a waveform animation, and tapping it opens the `AudioDrawer` instead of the suggestion panel.

21. **Volume reduction during TTS**: When TTS is actively speaking and ambient sounds are playing, the ambient master volume is reduced to 30% (from whatever the user has set). When TTS pauses or stops, the ambient volume returns to the user's setting. This ensures the spoken word is clearly audible over the background soundscape.

22. **Auth gating**: Scene playback follows the same auth rules as the ambient cross-pollination pill — logged-out users see the auth modal when trying to play a scene ("Sign in to play ambient scenes"). The chip itself is always visible.

### Chapter Completion via Audio

23. **Completion tracking**: When TTS reaches the final verse of the chapter and the `onend` event fires for that verse's utterance, mark the chapter as read in `wr_bible_progress`. This uses the same storage function and logic as scroll-based completion from Spec 1 — whichever triggers first (scrolling to the bottom or listening to the end) marks the chapter complete.

24. **Completion state display**: The chapter selector on the browser page shows the same checkmark for audio-completed chapters as scroll-completed chapters. There is no distinction between how a chapter was completed.

25. **Auth requirement**: Completion tracking requires authentication (same as scroll-based completion). Logged-out users can listen to chapters but progress is not recorded.

### Meditation Minutes Integration

26. **Bible audio as meditation**: Listening to a full chapter (from first verse to last verse without stopping) counts as meditation time. The session is recorded in `wr_meditation_history` (from Spec 13) with:
    - `type`: `"bible-audio"`
    - `durationMinutes`: Calculated from actual playback time (start timestamp when Play is pressed, end timestamp when the final verse finishes). Rounded to the nearest minute, minimum 1 minute.
    - Standard `id`, `date`, `completedAt` fields.

27. **Partial listening**: If the user stops playback before the chapter ends, no meditation session is recorded. Only complete chapter listens count.

28. **Auth requirement**: Meditation minutes recording requires authentication. Logged-out users can listen but no session is tracked.

### Sleep Timer Integration

29. **Sleep timer awareness**: If the sleep timer is active (from the Music feature, managed by `useSleepTimerControls()`), TTS playback respects it:
    - When the sleep timer's fade period begins, the TTS volume is not directly controllable (Speech Synthesis API doesn't support volume fading on an active utterance), so instead: when the sleep timer reaches its fade point, after the current verse finishes, no new verse is queued. Playback stops gracefully at the end of the current verse.
    - This prevents abrupt mid-word cutoffs while still honoring the sleep timer.

30. **No sleep timer active**: If no sleep timer is running, TTS plays until the chapter ends or the user manually stops it.

### Chapter Navigation During Playback

31. **Navigating to another chapter while playing**: If the user clicks "Next Chapter", "Previous Chapter", or selects a chapter from the dropdown while audio is playing, playback stops (`speechSynthesis.cancel()`), highlights are cleared, and the new chapter loads. Playback does not auto-start on the new chapter — the user must press Play again.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior | Auth modal message |
|---------|--------------------|--------------------|-------------------|
| Play/Pause/Stop buttons | Full access — anyone can listen | Full access | — |
| Speed selector | Full access | Full access | — |
| Voice gender toggle | Full access | Full access | — |
| Verse highlighting during playback | Full access (visual only) | Full access | — |
| Auto-scroll during playback | Full access | Full access | — |
| "Add background sounds" chip | Visible, expandable | Visible, expandable | — |
| Scene suggestion card click | Auth modal appears | Scene starts playing | "Sign in to play ambient scenes" |
| "Playing: [scene]" chip click | Not reachable (audio requires auth) | Opens AudioDrawer | — |
| Chapter completion via audio | Not tracked (no write to `wr_bible_progress`) | Auto-tracked when final verse finishes | — |
| Meditation minutes recording | Not recorded | Recorded in `wr_meditation_history` | — |

### Persistence

- **`wr_bible_progress`** (existing from Spec 1): Chapter completion via audio writes to the same key as scroll-based completion. Auth-gated.
- **`wr_meditation_history`** (existing from Spec 13): Bible audio sessions are recorded as type `"bible-audio"`. Auth-gated.
- **No new localStorage keys** introduced by this spec.
- **Route type**: Public. `/bible/:book/:chapter` remains a public route. Auth gating is per-feature (completion tracking, meditation recording, ambient playback), not per-route.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature has no user text input. It plays back curated, canonical Bible text (WEB translation) using TTS.
- **User input involved?**: No. The only user interactions are button presses (play, pause, stop, speed, voice, ambient scenes). No free-form text.
- **AI-generated content?**: No. All spoken content is the WEB translation verbatim.
- **Theological boundaries**: The text spoken is the WEB translation word-for-word. No interpretive content, no commentary.

---

## UX & Design Notes

### Emotional Tone

Listening to Scripture read aloud should feel like sitting in a quiet chapel while someone reads to you. The audio controls are unobtrusive — present when needed, never dominating the reading view. The verse highlighting gently guides attention without being flashy. The ambient sound pairing turns the experience into a mini retreat. The sleep timer integration acknowledges that some of the most precious moments with Scripture happen right before sleep.

### Visual Design — Audio Control Bar

- **Container**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`
- **Layout**: Flexbox row with items centered vertically. On mobile, the bar wraps intelligently — play controls on the left, speed pills scrollable in the center, progress and voice toggle on the right.
- **Play/Pause button**: Lucide `Play` or `Pause` icon, 20px, inside a `min-h-[44px] min-w-[44px]` touch target area. `text-primary` when idle, `text-primary` when playing.
- **Stop button**: Lucide `Square` icon, 20px, `text-white/40 hover:text-white/60`. Ghost style — less prominent than Play/Pause.
- **Speed pills**: Small pills in a horizontal row. Each pill: `px-2 py-1 rounded-full text-xs`. Selected: `bg-primary/20 text-primary font-medium`. Unselected: `text-white/50 hover:text-white/70`. On mobile, the pills are horizontally scrollable if space is tight.
- **Progress text**: "Verse X of Y" in `text-white/50 text-sm`. Positioned after the speed pills.
- **Voice toggle**: Two small icons (Lucide `User` for male, `UserRound` or similar for female — planner's choice). 16px icons. Selected: `text-primary`. Unselected: `text-white/30`. Touch target: `min-h-[44px] min-w-[44px]` each.
- **Sticky shadow**: When the bar becomes sticky (scrolled past its natural position), add a subtle bottom shadow (`shadow-md`) for visual separation from the content below.

### Visual Design — Verse Highlight (TTS)

- **Left border**: `border-l-2 border-primary` — a clean, narrow accent line.
- **Background**: `bg-primary/5` — just enough to distinguish the current verse without competing with Spec 2 highlights.
- **Transition**: The highlight appearing/disappearing uses a 200ms transition on `background-color` and `border-left-color`. Instant with `prefers-reduced-motion`.

### Visual Design — Ambient Chip

- Same pattern as the ambient cross-pollination pill from Spec 6.
- **No audio state**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-full py-2 px-4`. Lucide `Music` icon 16px + "Add background sounds" in `text-sm text-white/50`.
- **Audio playing state**: Same container with `border-l-2 border-primary`. Waveform animation + "Playing: [scene name]" in `text-sm text-white/70 font-medium`.
- **Suggestion panel**: Inline below the chip. `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`. Three scene cards in a row, each `bg-white/5 hover:bg-white/10 rounded-lg p-3`. "Browse all sounds" link in `text-xs text-white/40 hover:text-white/60`.

### Design System Recon References

- **Frosted glass card pattern**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` — used throughout the Bible reader and dashboard.
- **Primary color accent**: `#6D28D9` / `text-primary` — used for the verse highlight border, selected speed pill, and active voice toggle.
- **Ambient cross-pollination pill**: Spec 6 pattern — reuse the same visual language and interaction model for the "Add background sounds" chip.
- **Existing `useReadAloud` hook**: The existing TTS hook in `hooks/useReadAloud.ts` — this spec's TTS implementation follows similar patterns but is purpose-built for verse-by-verse chapter reading (the existing hook reads a single text block, not a sequence of verses with per-verse tracking).
- **`ReadAloudButton` component**: Existing TTS button in `components/daily/ReadAloudButton.tsx` — the audio bar is a more complex variant for multi-verse sequential playback.

### New Visual Patterns

1. **Sticky audio control bar**: A frosted glass bar that becomes sticky below the navbar during scroll. New pattern — existing sticky elements in the app are the navbar itself and tab bars, not content-area control bars.
2. **TTS verse highlight (left border + bg)**: Distinct from Spec 2's persistent color highlights. New sub-pattern using `border-l-2` rather than full background tint.
3. **Speed selector pills**: Small inline pill group for rate selection. New pattern — existing pill groups in the app are tab selectors or mode toggles, not numeric rate selectors.
4. **Voice gender toggle**: Two icon buttons for voice selection. New micro-pattern.

---

## Responsive Behavior

### Mobile (< 640px)

- **Audio bar**: Full width within the content column. Layout wraps into two rows if needed — Row 1: Play/Pause, Stop, speed pills (horizontally scrollable). Row 2: progress text + voice toggle. All buttons meet 44px minimum touch targets.
- **Speed pills**: If space is tight, the pills scroll horizontally within their container (`overflow-x-auto flex-shrink-0`).
- **Ambient chip**: Full width within the content column. Suggestion panel shows 3 scene cards in a horizontally scrollable row.
- **Verse highlight**: Same left border + background. Full width.
- **Auto-scroll**: Active (unless `prefers-reduced-motion`). Smooth scroll to center.

### Tablet (640px - 1024px)

- **Audio bar**: Fits in a single row within the `max-w-2xl` content column. All controls visible without wrapping.
- **Ambient chip**: Auto-width, left-aligned. Panel shows 3 cards in a horizontal row.
- **Verse highlight**: Same styling. Centered in `max-w-2xl`.

### Desktop (> 1024px)

- **Audio bar**: Single row, all controls comfortably spaced within `max-w-2xl`. Hover states visible on buttons and pills.
- **Ambient chip**: Auto-width, left-aligned. Panel shows 3 cards in a horizontal row.
- **Verse highlight**: Same styling. Generous reading width.

---

## Edge Cases

- **Speech Synthesis unavailable**: If `window.speechSynthesis` is undefined (rare, but possible in some environments), hide the entire audio control bar. Show no error — the reading view works perfectly without audio.
- **No voices loaded**: `speechSynthesis.getVoices()` may return an empty array initially (voices load asynchronously on some browsers). Listen for the `voiceschanged` event before enabling the voice toggle. If voices never load, hide the voice toggle but keep the rest of the bar functional (default voice will be used).
- **Long verses**: Very long verses (e.g., some in Psalms 119) may take a while to speak. The progress indicator shows the verse number, not a time estimate, so long verses don't break the UX.
- **Chapter with 1 verse**: Some chapters (e.g., Psalm 117 has 2 verses, but hypothetically a short chapter) work fine — the bar shows "Verse 1 of 2" and playback is brief.
- **User navigates away during playback**: When the component unmounts (user navigates to a different route), call `speechSynthesis.cancel()` to stop playback. Clean up all event listeners and timeouts.
- **Browser tab backgrounded**: Some browsers throttle or pause Speech Synthesis when the tab is backgrounded. This is a browser limitation — no workaround needed. Playback resumes when the tab is foregrounded.
- **Rapid Play/Pause toggling**: Debounce is not needed — `speechSynthesis.pause()` and `speechSynthesis.resume()` are synchronous and idempotent. Multiple rapid toggles are handled gracefully by the API.
- **Speed change during pause**: If the user changes speed while paused, the new speed applies to the next verse when playback resumes. The currently paused utterance continues at its original speed when resumed (Speech Synthesis API limitation).
- **Ambient volume already at 30% or below**: If the user's ambient master volume is already at or below 30%, do not reduce it further during TTS. Only reduce if the current volume is above 30%.
- **Sleep timer starts during TTS**: If the user activates a sleep timer while TTS is playing, the TTS should begin respecting it immediately — when the timer's fade point arrives, stop after the current verse.
- **Placeholder chapters (no full text)**: The audio bar is not rendered on placeholder chapters. No play controls on "Full text coming soon" pages.
- **`prefers-reduced-motion`**: Auto-scroll disabled. Verse highlight transitions are instant. Ambient waveform animation shows static bars. Audio playback itself is unaffected.
- **Concurrent ReadAloud usage**: If the user has triggered ReadAloud (from `ReadAloudButton`) on another part of the app and then navigates to the Bible reader, the existing Speech Synthesis utterance should be cancelled when the Bible reader starts playback (Speech Synthesis only supports one utterance at a time).

---

## Out of Scope

- **Real TTS audio files**: This spec uses the browser's built-in Speech Synthesis API, not pre-recorded audio or cloud TTS (Google Cloud TTS, OpenAI TTS). High-quality narrated audio is a Phase 4 enhancement.
- **Offline audio**: No service worker caching for offline TTS. Speech Synthesis requires an active browser session.
- **Background audio playback**: On mobile, TTS stops when the browser is backgrounded. Native app background audio is a future platform feature.
- **Per-verse playback controls**: No ability to tap a specific verse to start reading from that point. Playback always starts from verse 1 (or resumes from where paused). Future enhancement.
- **Multiple translations**: Only WEB. Reading aloud in other translations is deferred.
- **Audio Bible downloads**: No ability to download chapter audio as MP3/WAV. Future enhancement.
- **Playback history**: No log of which chapters were listened to (beyond the progress tracking in `wr_bible_progress`). Meditation minutes tracking records duration but not chapter identity.
- **Audio speed persistence**: Speed and voice preferences are not saved to localStorage. They reset to defaults (1x, default voice) on each visit. Persistence is a future enhancement.
- **Word-level highlighting**: This spec highlights at the verse level, not the word level. Word-level KaraokeText-style highlighting during TTS is a future enhancement.
- **Backend API**: Entirely frontend. No new endpoints.
- **Gamification integration**: No faith points for listening to chapters. May come in a future spec.

---

## Acceptance Criteria

### Audio Control Bar — Appearance

- [ ] Audio control bar appears on `/bible/:book/:chapter` reading view, below the chapter heading and above verse text
- [ ] Bar is not shown on placeholder chapters (books without full text)
- [ ] Bar uses frosted glass styling: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`
- [ ] Bar contains: Play/Pause button, Stop button, speed selector (4 pills), "Verse X of Y" progress, voice gender toggle
- [ ] Bar becomes sticky when scrolling (stays visible below the navbar)
- [ ] Sticky bar has a subtle bottom shadow for visual separation
- [ ] All buttons in the bar meet 44px minimum touch targets

### Audio Control Bar — Hidden When Unavailable

- [ ] If `window.speechSynthesis` is undefined, the entire audio bar is hidden
- [ ] If the chapter is a placeholder (no full text), the bar is not rendered

### TTS Playback

- [ ] Pressing Play starts reading from verse 1
- [ ] Each verse is a separate `SpeechSynthesisUtterance`
- [ ] A 300ms pause is inserted between verses
- [ ] The progress indicator updates to show "Verse X of Y" as each verse plays
- [ ] Pressing Pause calls `speechSynthesis.pause()` and shows the Play icon
- [ ] Pressing Play after pause calls `speechSynthesis.resume()`
- [ ] Pressing Stop calls `speechSynthesis.cancel()`, resets to verse 1, and clears highlights
- [ ] Playback stops automatically when the last verse finishes
- [ ] Navigating to another chapter stops playback and clears highlights

### Speed Selector

- [ ] Four speed pills are displayed: 0.75x, 1x, 1.25x, 1.5x
- [ ] Default speed is 1x
- [ ] Selected pill uses `bg-primary/20 text-primary`; unselected pills use `text-white/50`
- [ ] Changing speed applies `utterance.rate` to the next verse spoken
- [ ] Speed pills are horizontally scrollable on mobile if space is tight

### Voice Gender Toggle

- [ ] Two icons represent male and female voice options
- [ ] Selected icon uses `text-primary`; unselected uses `text-white/30`
- [ ] Selecting a gender filters `speechSynthesis.getVoices()` for matching voices
- [ ] If no matching voice is found, the default voice is used (no error)
- [ ] If only one voice is available (or zero), the toggle is hidden entirely
- [ ] Voice change applies to the next verse spoken

### Verse Highlighting

- [ ] The currently spoken verse receives `border-l-2 border-primary` and `bg-primary/5`
- [ ] Only one verse is highlighted at a time during playback
- [ ] Highlight moves to the next verse when the current verse finishes
- [ ] Highlight is removed when playback stops or reaches the end
- [ ] TTS highlight coexists with Spec 2's persistent color highlights without conflict
- [ ] Highlight transitions use 200ms animation (instant with `prefers-reduced-motion`)

### Auto-Scroll

- [ ] Page auto-scrolls to center the current verse when it begins playing
- [ ] Auto-scroll uses `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [ ] Auto-scroll only fires if the verse is off-screen (does not scroll if already visible)
- [ ] Manual scrolling pauses auto-scroll for 5 seconds
- [ ] Auto-scroll resumes 5 seconds after the last manual scroll event
- [ ] Auto-scroll is completely disabled when `prefers-reduced-motion` is active

### Ambient Sound Pairing

- [ ] An "Add background sounds" chip appears below the audio control bar
- [ ] Chip uses the same visual pattern as the ambient cross-pollination pill (Spec 6)
- [ ] Tapping the chip expands an inline panel with 3 scene suggestions: "Still Waters", "The Upper Room", "Morning Mist"
- [ ] Tapping a scene card (logged-in) starts the scene playing immediately
- [ ] Tapping a scene card (logged-out) shows auth modal: "Sign in to play ambient scenes"
- [ ] Panel includes a "Browse all sounds" link pointing to `/music?tab=ambient`
- [ ] Panel collapses on click outside, Escape, or after starting a scene
- [ ] If ambient sounds are already playing, chip shows "Playing: [scene name]" with waveform animation
- [ ] Tapping the "Playing" chip opens the AudioDrawer
- [ ] During TTS playback, ambient master volume is reduced to 30%
- [ ] When TTS pauses or stops, ambient volume returns to the user's setting
- [ ] Waveform animation respects `prefers-reduced-motion` (static bars)

### Chapter Completion via Audio

- [ ] When TTS finishes the final verse, the chapter is marked as read in `wr_bible_progress`
- [ ] Completion only writes for logged-in users
- [ ] Completed chapter shows the same checkmark in the chapter selector as scroll-completed chapters
- [ ] If the chapter was already marked as read (by scroll), the audio completion is a no-op (no duplicate write)

### Meditation Minutes Integration

- [ ] Listening to a full chapter (first verse to last verse) records a meditation session in `wr_meditation_history`
- [ ] Session `type` is `"bible-audio"`
- [ ] `durationMinutes` is calculated from actual playback time (rounded to nearest minute, min 1)
- [ ] Partial listens (stopping before the end) do not record a session
- [ ] Recording only happens for logged-in users
- [ ] If the meditation minutes bar chart on `/insights` is visible, `"bible-audio"` sessions appear with their own color

### Sleep Timer Integration

- [ ] If the sleep timer's fade period begins during TTS, playback stops after the current verse finishes (no new verse is queued)
- [ ] TTS does not continue playing after the sleep timer completes
- [ ] If no sleep timer is active, TTS plays until the chapter ends or the user stops it

### Responsive Layout

- [ ] Mobile (375px): Audio bar takes full width; layout wraps into two rows if needed; speed pills scroll horizontally; all buttons meet 44px touch targets
- [ ] Tablet (768px): Audio bar fits in a single row within `max-w-2xl`; all controls visible
- [ ] Desktop (1440px): Audio bar in a single row with comfortable spacing within `max-w-2xl`
- [ ] Ambient chip: full width on mobile, auto-width on tablet/desktop
- [ ] No horizontal overflow at any breakpoint

### Accessibility

- [ ] Play/Pause button has `aria-label` ("Play chapter" / "Pause reading")
- [ ] Stop button has `aria-label` ("Stop reading")
- [ ] Speed pills have `aria-label` (e.g., "Reading speed 1x") and `aria-pressed` for the selected pill
- [ ] Voice toggle icons have `aria-label` ("Male voice" / "Female voice") and `aria-pressed`
- [ ] Progress indicator "Verse X of Y" is a live region (`aria-live="polite"`) that updates during playback
- [ ] Currently highlighted verse has `aria-current="true"` during playback
- [ ] Audio bar is keyboard-navigable (Tab between controls, Enter/Space to activate)
- [ ] Ambient chip and panel follow the same accessibility patterns as Spec 6 (keyboard nav, aria-expanded, focus management)
- [ ] Screen reader announces when playback starts, pauses, and stops
- [ ] All verse highlight transitions respect `prefers-reduced-motion`

### Cleanup & No Regressions

- [ ] Navigating away from the reading view cancels all TTS playback and cleans up listeners
- [ ] Existing verse highlight animation (search scroll-to from Spec 1) still works
- [ ] Existing persistent highlights and notes (Spec 2) still work and display correctly
- [ ] Reading progress tracking via scroll (Spec 1) still works alongside audio completion
- [ ] Chapter navigation (previous/next, chapter selector) still works
- [ ] Existing `AudioPill` (global component) remains visible and functional alongside the TTS controls
- [ ] TTS system does not interfere with Web Audio API ambient sound system (different browser APIs)
- [ ] No new routes created
- [ ] No new localStorage keys created (uses existing `wr_bible_progress` and `wr_meditation_history`)

### Visual Verification

- [ ] Audio bar frosted glass effect is visible against the dark reading background
- [ ] Verse highlight (left border + primary/5 bg) is visible but not distracting
- [ ] Speed pills are clearly distinguishable (selected vs. unselected state)
- [ ] Ambient chip matches the cross-pollination pill pattern from Spec 6
- [ ] Sticky bar transitions smoothly when scrolling past its natural position
- [ ] TTS highlight and Spec 2 color highlights coexist visually on the same verse without clashing
