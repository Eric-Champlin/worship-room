# BB-44: Read-Along Verse Highlighting for Bible Audio

**Status:** Draft
**Date:** 2026-04-14
**Branch:** `audio-wave-bb-26-29-44`
**Depends on:** BB-26 (FCBH Audio Bible Integration) — shipped, BB-29 (Continuous Playback) — shipped, BB-28 (Sleep Timer) — shipped, BB-27 (Ambient Pause Coordination) — shipped or in verification
**Depended on by:** None
**Related specs:** None (BB-44 is the final spec in the BB-26-29-44 audio wave)

## Master Plan Reference

Final spec in the BB-26-29-44 audio wave. BB-26 shipped audio playback. BB-29 added continuous playback across chapters. BB-28 added the sleep timer. BB-27 made ambient pause when Bible plays. BB-44 closes the wave by adding the visual coupling between audio and text — as the narrator speaks each verse, that verse highlights on screen. Users can listen with their eyes open and follow along, or look up from another task and immediately see where they are.

This is the most polish-focused spec of the wave. It does not add a new capability the way BB-26 added audio or BB-28 added sleep timer; it deepens the integration between two capabilities (audio playback + on-screen reading) so they feel like one experience instead of two parallel features.

The core technical question for BB-44 is whether DBP provides verse-level timing data for the dramatized WEB filesets BB-26 ships (`EN1WEBN2DA` and `EN1WEBO2DA`). BB-26's recon noted that DBP has a `/timestamps/{fileset_id}/{book}/{chapter}` endpoint that exists in the OpenAPI spec, but did not verify it returns useful data for these specific dramatized filesets. BB-44's recon phase MUST confirm this before any implementation begins. If timing data is unavailable or unusable, the spec changes shape significantly.

## Overview

When Bible audio is playing, the verse currently being narrated highlights on screen with a subtle background tint and an optional left-edge accent bar. As the narrator moves from verse to verse, the highlight moves with them. Verses ahead of the current one are unhighlighted (just normal reader text). Verses already passed are also unhighlighted (no "trail" of completed verses). The highlight is on the current verse only.

When the user manually scrolls the reader (gesture, scroll wheel, keyboard), the auto-scroll-to-current-verse behavior pauses for a few seconds so the user can read ahead or look back without the page jerking back to the audio position. After the user stops scrolling, auto-scroll resumes — the page smoothly scrolls to bring the current verse back into view.

Read-along is on by default when audio is playing. A small toggle in the expanded player sheet lets users disable it (some users prefer to listen with their eyes closed and don't want any visual distraction). The preference persists.

When audio is not playing, no highlighting happens. The reader looks exactly as it does today.

The dramatized nature of the WEB audio matters here. The audio includes voice acting, music, and sound effects between verses. The timing data from DBP (assuming it exists for these filesets) marks verse start times, but the spaces between verse markers may include dramatic beats (a dramatic pause, a music swell, a sound effect transition) where no verse is being narrated. BB-44 highlights on verse boundaries only, ignoring the dramatic beats. The current verse stays highlighted from its start time until the next verse begins, even if the narration of the current verse technically ended several seconds earlier.

## User Story

As a user listening to John 3 with the BibleReader open, I want to see verse 16 highlight on screen at the moment the narrator starts speaking it. As the narrator moves to verse 17, the highlight should move with them. I should be able to look at the screen at any moment and immediately see where in the chapter the audio is.

As a user reading ahead while listening (I want to read verse 20 while the narrator is still on verse 16 to see what's coming), I want my scrolling to override the auto-scroll. I want the page to stay where I left it for a few seconds so I can read. After I stop scrolling, the page should bring me back to where the audio is so I can re-sync.

As a user who finds visual highlighting distracting and prefers to listen with eyes closed, I want to turn read-along off and have it stay off. The audio should play normally with no on-screen changes.

As a user listening on a chapter where verse-level timing data isn't available (a fallback case), I want the audio to still play correctly. Read-along just doesn't highlight anything. No error, no warning — the absence of highlighting is the only signal.

## Functional Requirements

### Verse highlighting

1. When Bible audio is playing and read-along is enabled, the verse element in the reader corresponding to the current playback position is highlighted.

2. The highlight treatment is a subtle background tint behind the verse text plus a left-edge accent bar. Specific styling in Design Notes. The treatment is intentionally restrained — read-along is a navigation aid, not a focal point.

3. Only one verse is highlighted at any time. Verses already passed have no residual styling. Verses ahead have no preview styling.

4. The highlighted verse changes when the audio playback position crosses the next verse's start timestamp. Crossings are detected via the existing 200ms tick interval in `AudioPlayerContext` — no new interval is created.

5. The transition from one highlighted verse to the next is instant (no fade between highlights). A fade would suggest the previous verse is "ending," but in audio-drama style productions the previous verse may have ended several seconds earlier and the highlight is just waiting for the next verse marker. A fade would feel slow and incorrect. Instant snap is correct.

6. When audio is paused, the highlight remains on the verse that was current when pause occurred. When audio is resumed, the highlight stays put and continues advancing as playback continues.

7. When audio stops (close, end of chapter with no auto-advance, sleep timer completes, end of Bible, error), the highlight is removed entirely. The reader returns to its normal unhighlighted state.

8. When BB-29 auto-advance fires and a new chapter loads, the highlight resets — no verse is highlighted briefly while the new chapter's timing data loads, then the first verse highlights when the new audio begins playing.

### Auto-scroll behavior

9. When read-along is enabled and the current highlighted verse is not in the visible viewport (above or below), the reader auto-scrolls to bring it into view.

10. The auto-scroll positions the highlighted verse at approximately 1/3 from the top of the viewport, not at the very top. This gives the user a small amount of context above the current verse and significantly more context below. This positioning matches the "reading position" used by ebook readers and audiobook apps.

11. Auto-scroll uses smooth scrolling (CSS `scroll-behavior: smooth` or programmatic equivalent) with a duration of approximately 400-500ms. Hard jumps would be jarring, very slow scrolls would feel laggy.

12. When the user manually scrolls the reader (touch gesture, scroll wheel, keyboard arrow/page keys), auto-scroll pauses for 5 seconds. The pause is reset every time the user scrolls. After 5 seconds of no manual scrolling, auto-scroll resumes by smoothly scrolling to the current verse.

13. The 5-second user-scroll override starts when scrolling stops, not when scrolling starts. A user dragging through five chapters of scrolling stays in user-control mode the entire time and only sees auto-scroll resume 5 seconds after they let go.

14. Manual scroll detection uses standard scroll events. Distinguishing "user scrolled" from "auto-scrolled" requires marking auto-scroll calls so their resulting scroll events can be ignored. Implementation detail in Design Notes.

15. When auto-scroll resumes after user override, the smooth scroll to the current verse position can be longer than 500ms if the verse is very far from the user's current scroll position. Cap at 1000ms for the very-far case.

### Read-along toggle

16. The expanded player sheet contains a new toggle for enabling/disabling read-along. The toggle uses the same iOS-style switch component introduced in BB-29.

17. The toggle is positioned below BB-29's continuous playback toggle and above the FCBH attribution footer. Stacking order from top: continuous playback toggle, read-along toggle, attribution footer.

18. The label reads "Read along" with a sub-label "Highlight verses as you listen" in smaller, lower-contrast text.

19. The toggle defaults to ON. Most users want this; the off-by-default crowd is the minority who listen with eyes closed.

20. The toggle persists to localStorage under the key `bb44-v1:readAlong` as a boolean. Defaults to `true` when absent or corrupt.

21. Toggling read-along OFF mid-playback immediately removes any current highlight. Toggling back ON immediately highlights the verse corresponding to the current playback position.

22. The toggle is NOT present on the minimized bar. Users must expand the sheet to change it. Same logic as BB-29's continuous playback toggle.

### No timing data fallback

23. If DBP returns no timing data for a chapter (404 on the timestamps endpoint, empty response, malformed response), read-along silently does nothing for that chapter. The audio plays normally. No verses are highlighted. No error is shown. No toast.

24. The provider tracks per-chapter timing data availability. If timing data is unavailable for the current chapter, the read-along toggle in the panel still appears and still works (the toggle is a global preference, not a per-chapter capability), but the user observes no highlighting because the timing data is absent.

25. Optionally (consider during design), when read-along is on but timing data is unavailable, a very subtle indicator could appear — for example, a small "Audio playing without verse sync" caption near the chapter title in the reader. Recommended NOT to add this initially. The absence of highlighting is itself a sufficient signal for users who notice; users who don't notice probably don't care.

### Coverage and edge cases

26. Chapter introductions, attributions, and other non-verse content (headings, section breaks, footnotes if displayed) are not highlighted. Only verse elements with verse numbers participate.

27. For the dramatized WEB fileset, timing data may include dramatic beats (sound effects, music transitions) interspersed with verse markers. BB-44 only consumes verse markers from the timing data. Anything that isn't a verse marker is ignored. The current highlighted verse stays highlighted from its start time until the next verse marker, regardless of what dramatic content fills the gap.

28. If two verse markers are very close together in time (under 500ms apart, which can happen at chapter boundaries or during fast narration), the highlight still advances normally. The user perceives a brief flash on the intermediate verse, which is correct.

29. If the user seeks backward via the scrubber to a position before the current verse, the highlight jumps back to the verse corresponding to the new position immediately on the next 200ms tick.

30. If the user seeks forward past several verses, same behavior — highlight jumps to the verse corresponding to the new position.

31. If the user clicks a verse number (existing reader behavior, may already exist), the audio does NOT seek to that verse in BB-44. Verse-click-to-seek is a separate UX concern that could be a future spec but is explicitly out of scope here. BB-44 is one-directional: audio drives highlighting, not the reverse.

## Non-Functional Requirements

32. **Performance:** Verse highlight changes happen on the existing 200ms tick. No new intervals. Per-tick work is small: compare current playback time to the timing data array, find the active verse, dispatch only if it changed. Implementation should use binary search or a cached "current index" pointer rather than a linear scan, since chapters can have 50+ verses.

33. **Bundle:** No new dependencies. New code: timing data fetch in DBP client, new reducer state for current verse and timing data, new highlighting logic in the reader component, new toggle in the expanded sheet, scroll management. Main bundle delta should be <=2 KB gzipped.

34. **Testing:**
   - Unit tests for the "find current verse from playback time + timing array" function (binary search, edge cases at start/end of chapter, missing data)
   - Provider tests for timing data fetch, highlight state transitions, toggle persistence
   - Reader integration tests for highlight rendering, auto-scroll positioning, manual-scroll override
   - End-to-end test that mocks audio playback advancing through timestamps and verifies the highlight moves correctly

35. **Accessibility:**
   - The highlighted verse has `aria-current="true"` so screen readers can announce the current verse if the user navigates with assistive technology.
   - The auto-scroll respects `prefers-reduced-motion` — when reduced motion is set, auto-scroll uses instant jumps instead of smooth scrolling.
   - The read-along toggle uses standard switch ARIA (`role="switch"`, `aria-checked`, `aria-labelledby`).
   - When read-along is off, no aria-current is set, no auto-scrolling happens, screen readers experience the chapter exactly as they do today with no audio.

## Auth Gating

| Action | Auth Required |
|--------|---------------|
| See verse highlighting during playback | No |
| Toggle read-along preference | No |
| Auto-scroll to current verse | No |
| Persist preference across sessions | No |

Zero new auth gates.

## Responsive Behavior

| Breakpoint | Width | Key behavior |
|-----------|-------|--------------|
| Mobile | 375px | Highlight treatment is the same as desktop. Auto-scroll positioning uses 1/3-from-top. Smooth scroll duration may need to be slightly longer (500ms) on mobile to feel less abrupt on small screens. |
| Tablet | 768px | Standard treatment. |
| Desktop | 1440px | Standard treatment. The reader's max-width constraint means the highlighted verse appears within the reading column, not stretched to viewport edges. |

The expanded player sheet gains a new toggle row, which adds approximately 36px to the sheet height. Existing height of 340px mobile / 300px tablet+desktop may need to bump to 376px / 336px to accommodate. Verify during execution with Playwright; if the existing whitespace is enough to absorb 36px (BB-26's verification noted some slack in the vertical rhythm), no height bump is needed.

## AI Safety

Not applicable.

## Auth & Persistence

**localStorage keys:**

| Key | Type | Description |
|-----|------|-------------|
| `bb44-v1:readAlong` | `boolean` | User preference for read-along verse highlighting. Defaults to `true` when absent. |

Follows the BB-26-29-44 wave's `bb*-v1:` prefix convention. Corruption falls back to default.

**No persistence of timing data.** Timing data is fetched per chapter and cached in memory only (alongside the per-chapter audio URL cache from BB-26). Page refresh re-fetches. The data is small (typically 50-200 entries per chapter) so the in-memory cost is trivial.

## Completion & Navigation

**No completion tracking.** Read-along listening does not award faith points, streaks, badges, or any gamification.

**No navigation changes** beyond auto-scroll within the current chapter, which is not React Router navigation.

## Design Notes

### Highlight treatment

The current verse gets:

- A subtle background tint behind the verse text. Suggested: `bg-white/[0.04]` over the existing reader background. On the dark BibleReader theme, this is barely perceptible but does create a soft "lit verse" effect.
- A left-edge accent bar, 3px wide, in the project's primary accent color at reduced opacity (`bg-primary/60`). The bar runs the full height of the verse text and sits flush with the left edge of the text container (or just outside the column gutter, depending on existing reader layout).
- No font weight change, no italic change, no text color change. Reading typography is preserved exactly.
- A short transition on the background tint (200ms) when the highlight moves between verses. This avoids a hard flicker on the background while not creating a slow fade. The accent bar appears/disappears instantly.

```tsx
<span
  className={cn(
    "inline transition-colors duration-200",
    isCurrentVerse && "bg-white/[0.04]"
  )}
  style={isCurrentVerse ? {
    boxShadow: "inset 3px 0 0 0 rgba(PRIMARY_COLOR, 0.6)"
  } : undefined}
  aria-current={isCurrentVerse ? "true" : undefined}
>
  {verseText}
</span>
```

The exact selector and structure depend on how the existing BibleReader renders verses. Recon should identify whether verses are wrapped in `<span>` per verse, or `<p>` per verse, or some other structure. The highlight applies to whatever the existing verse-level wrapper is.

### Auto-scroll positioning

When the highlight moves to a new verse and that verse is outside the viewport:

```ts
const verseElement = document.querySelector(`[data-verse-id="${verseId}"]`)
if (verseElement) {
  const rect = verseElement.getBoundingClientRect()
  const targetY = window.innerHeight / 3  // 1/3 from top
  const scrollDelta = rect.top - targetY
  window.scrollBy({
    top: scrollDelta,
    behavior: reducedMotion ? 'instant' : 'smooth'
  })
  // Mark this scroll as auto-initiated so the scroll listener ignores it
  isAutoScrollingRef.current = true
  setTimeout(() => { isAutoScrollingRef.current = false }, 600)
}
```

The 600ms timeout for clearing `isAutoScrollingRef` is slightly longer than the smooth-scroll duration (~500ms) to ensure the scroll completes before manual-scroll detection re-arms.

### Manual scroll detection

```ts
useEffect(() => {
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null

  const onScroll = () => {
    if (isAutoScrollingRef.current) return  // Ignore programmatic scrolls
    setUserIsScrolling(true)
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      setUserIsScrolling(false)
    }, 5000)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    window.removeEventListener('scroll', onScroll)
    if (scrollTimeout) clearTimeout(scrollTimeout)
  }
}, [])
```

When `userIsScrolling` is true, the auto-scroll-to-current-verse logic is suppressed. When it returns to false, the next tick that detects a verse change (or the verse the user was last on) triggers a smooth scroll back.

### Timing data shape (assumed, verify in recon)

DBP's `/timestamps/{fileset_id}/{book}/{chapter}` endpoint, per the OpenAPI spec referenced in BB-26's recon, is expected to return something like:

```json
{
  "data": [
    { "verse_start": 1, "verse_end": 1, "timestamp": 0.0 },
    { "verse_start": 2, "verse_end": 2, "timestamp": 4.2 },
    { "verse_start": 3, "verse_end": 3, "timestamp": 9.8 }
  ]
}
```

The exact shape MUST be verified during recon. The "find current verse" function operates on whatever shape DBP returns:

```ts
function findCurrentVerse(timestamps: VerseTimestamp[], currentTimeSeconds: number): number | null {
  if (!timestamps.length) return null
  if (currentTimeSeconds < timestamps[0].timestamp) return null

  // Binary search for the largest timestamp <= currentTimeSeconds
  let low = 0, high = timestamps.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (timestamps[mid].timestamp <= currentTimeSeconds) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return timestamps[low].verse_start
}
```

### Read-along toggle (in expanded sheet)

Reuses the iOS-style switch component introduced in BB-29. Same styling, same accessibility patterns. New row in the expanded sheet, positioned between BB-29's continuous-playback toggle and the FCBH attribution footer.

### When timing data is missing

The provider state shape gains:

```ts
{
  currentVerseTimestamps: VerseTimestamp[] | null  // null = unavailable, [] = empty, populated = use it
  currentVerseId: number | null  // the active verse_start value
}
```

When `currentVerseTimestamps` is null, no highlighting happens regardless of the toggle state. When it's an empty array, same — no highlighting because there's nothing to match. When populated, the binary search runs on every 200ms tick.

## Anti-Pressure Design Decisions

**Read-along defaults to ON.** Most users want to follow along visually. The off-by-default minority can disable it.

**Highlight is subtle, not dominant.** A barely-perceptible background tint plus a thin left-edge bar. The reading text is the focus, not the highlight. This contrasts with karaoke-style highlighting where the current word fills with bright color — that would be wrong for scripture.

**No completion tracking.** Listening through 50 verses of John does not advance any meter. Reading along does not earn anything.

**No "you read X% along with the audio" feedback.** No engagement metrics, no streaks for read-along sessions.

**No "first time using read-along" tutorial overlay.** The feature is self-explanatory. The first time a user opens BibleReader with audio playing and read-along on, they see verses highlight. They figure it out in two seconds.

**Manual scroll override is generous, not aggressive.** 5 seconds of pause after manual scrolling means a user who briefly looked back at a previous verse has plenty of time to read before the page yanks them back. A shorter override (1-2 seconds) would feel like the page is fighting the user.

**No "would you like to enable read-along?" prompt** when the user starts audio without read-along enabled. Respect the user's choice. They turned it off; don't pester.

## Out of Scope

1. **Verse-click-to-seek.** Tapping a verse number does NOT seek the audio to that verse. One-directional flow: audio drives highlighting, not the reverse. A future spec could add this.

2. **Word-level highlighting.** Karaoke-style word-by-word highlighting is not implemented. Verse-level only. DBP does not provide word-level timing data, and adding it would require either server-side forced alignment or client-side speech analysis — both significant scope.

3. **Per-chapter or per-book read-along preferences.** One global toggle. No "read along for the Gospels but not the Prophets."

4. **Fallback timing generation.** If DBP returns no timing data, BB-44 does NOT generate timing client-side via duration estimation or speech detection. Silent fallback. A future spec could attempt server-side or client-side timing generation if this becomes a real gap.

5. **Synchronization with non-WEB translations.** BB-26 ships only WEB. If a future spec adds other translations, BB-44's timing data fetch needs to be updated to use whichever fileset is active. Not BB-44's problem today.

6. **Customization of highlight color or style.** No user-facing setting to change the highlight appearance. One color, one style, designed once.

7. **Read-along during sleep timer fade-out.** During the 20-second fade, the highlight continues to advance because the audio is still playing. When the fade completes and audio stops, the highlight clears. No special fade-out behavior on the highlight itself.

8. **Read-along across chapter auto-advance.** When BB-29 auto-advances to a new chapter, the new chapter's timing data must be fetched and the highlight resumes there. Brief gap (highlight clears momentarily during the chapter transition) is acceptable.

9. **Visual indicator of "audio playing without verse sync" when timing data is missing.** Optional and recommended NOT to add per requirement 25. Absence of highlighting is the signal.

10. **Verse-level navigation history.** No "you were on verse 12 in your last session, jump there." Out of scope.

## Acceptance Criteria

- [ ] When Bible audio is playing and read-along is enabled, the verse currently being narrated has a subtle background tint and left-edge accent bar.
- [ ] When the audio crosses a verse boundary, the highlight moves to the new verse instantly (no fade between highlights).
- [ ] When audio is paused, the highlight stays on the current verse.
- [ ] When audio stops (close, end of chapter, sleep timer, end of Bible, error), all highlighting is removed.
- [ ] When BB-29 auto-advance fires, the highlight clears momentarily and resumes on the first verse of the new chapter.
- [ ] The highlighted verse has `aria-current="true"`.
- [ ] When the highlighted verse is outside the viewport, the reader auto-scrolls to position it 1/3 from the top.
- [ ] Auto-scroll uses smooth scrolling (~400-500ms) and respects `prefers-reduced-motion`.
- [ ] When the user manually scrolls, auto-scroll pauses for 5 seconds after the user stops scrolling, then resumes.
- [ ] Programmatic scrolls (auto-scroll) do not trigger the manual-scroll override.
- [ ] The expanded player sheet has a new "Read along" toggle below the continuous playback toggle.
- [ ] The toggle defaults to ON.
- [ ] Toggle preference persists to localStorage under `bb44-v1:readAlong`.
- [ ] Toggling OFF mid-playback removes the highlight immediately.
- [ ] Toggling ON mid-playback shows the highlight on the current verse immediately.
- [ ] Toggle is absent from the minimized bar.
- [ ] When DBP returns no timing data for a chapter, read-along silently does nothing. Audio plays normally.
- [ ] Verse boundary detection uses binary search on the timing array, not linear scan.
- [ ] Verse highlighting respects the dramatized audio's structure: highlight stays on the current verse from its start time until the next verse marker, regardless of dramatic beats in between.
- [ ] User seeking backward or forward via the scrubber updates the highlight on the next 200ms tick.
- [ ] No new dependencies.
- [ ] Main bundle delta <=2 KB gzipped.
- [ ] No new auth gates.
- [ ] Listening activity is NOT recorded for faith points, streaks, or badges.
- [ ] Existing BB-26, BB-27, BB-28, BB-29 tests continue to pass unchanged.
- [ ] Existing BibleReader tests continue to pass after the verse-element changes.

## Notes for Plan Phase Recon

1. **CRITICAL — Verify the DBP `/timestamps/{fileset_id}/{book}/{chapter}` endpoint returns useful data for the dramatized WEB filesets `EN1WEBN2DA` and `EN1WEBO2DA`.** This is the single most important recon item in the entire wave. BB-26's recon noted the endpoint exists in the OpenAPI spec but did not test it for these specific filesets. Run live curl tests against:
   - `EN1WEBN2DA/JHN/3` (NT spot check)
   - `EN1WEBO2DA/GEN/1` (OT spot check)
   - `EN1WEBO2DA/PSA/119` (long chapter spot check)
   - `EN1WEBN2DA/PHM/1` (short chapter spot check)
   - `EN1WEBN2DA/REV/22` (final chapter spot check)

   For each, record:
   - HTTP status (200 expected)
   - Response shape (list of timestamps, what fields)
   - Number of timestamps returned vs number of verses in the chapter
   - Whether timestamps appear to mark verse boundaries or include intermediate (dramatic-beat) entries
   - Whether timestamps are in seconds or some other unit

   If the endpoint returns useful data for all spot checks, BB-44 proceeds as specified. If the endpoint returns 404 or empty data for some/all dramatized filesets, the spec changes:
   - **If timing data is unavailable for ALL dramatized filesets**, BB-44 ships only the toggle and silent-fallback behavior, with no actual highlighting capability. The spec becomes "infrastructure for future read-along when timing data becomes available." Bundle and test scope shrink significantly.
   - **If timing data is unavailable for some chapters but available for others**, BB-44 ships the highlighting capability with per-chapter availability. Users see highlighting on chapters that have timing data and silent fallback on chapters that don't. This is the originally specified behavior.

   Block the rest of planning until this recon is complete. Do not write the plan if this question is unresolved.

2. **Inspect how the BibleReader currently renders verses.** Identify the DOM structure: are verses wrapped in `<span>`, `<p>`, or another element? Is there a per-verse identifier (like `data-verse-id` or a key)? The highlight implementation depends on being able to target individual verse elements. If the existing structure doesn't support this, BB-44's plan must include a small refactor of the reader's verse rendering to add per-verse wrappers or identifiers.

3. **Check whether the BibleReader has a scroll container or scrolls the document body.** Auto-scroll behavior depends on which element to scroll. If it's a scroll container with overflow, the scroll target is the container; if it's the document body, the target is `window.scrollTo`. This affects the auto-scroll implementation.

4. **Identify any existing read-along or verse-highlight code in the BibleReader.** The deep review may have left scaffolding similar to how `useBibleAudio.ts` and `SleepTimerPanel.tsx` were left as scaffolding for BB-26 and BB-28. Grep for `aria-current`, `currentVerse`, `highlight`, or similar terms in the reader files. If scaffolding exists, BB-44 consumes it. If not, BB-44 builds from scratch.

5. **Verify the iOS-style switch component is reusable.** BB-29 introduced this component. BB-44 reuses it for the read-along toggle. Confirm the component lives at a stable path (likely `frontend/src/components/ui/Switch.tsx` based on the BB-29 plan's recon recommendation) and that it accepts the props BB-44 needs.

6. **Confirm `prefers-reduced-motion` is wired through `useReducedMotion` hook** as expected from BB-26's design system. Auto-scroll respects this hook to use instant jumps instead of smooth scrolling for users with the preference set.

7. **Test the interaction between BB-44 highlighting and BB-26's existing focus management.** When the sheet opens or closes, focus moves between elements. When read-along is highlighting verses in the BibleReader, should focus follow the highlight? Recommended NO — focus is a separate concern from highlighting and moving focus to the current verse on every advance would break the user's ability to interact with other reader controls. Confirm during recon that the existing focus behavior is preserved.

8. **Bundle delta check.** Target <=2 KB gzipped main bundle. The new code: timestamp fetch in DBP client (small, in main bundle), reducer state for current verse + timing data (small, in main bundle), highlight rendering in BibleReader (lives in the BibleReader chunk, not main), toggle component (lives in lazy sheet chunk), scroll management (could be in main or lazy depending on where it's placed). Main bundle only counts the DBP client extension and the reducer changes. Confirm 2 KB is realistic.

9. **Performance check on long chapters.** Psalm 119 has 176 verses. The binary search per 200ms tick is O(log n) which is trivial, but the React render cycle that re-applies the `aria-current` attribute and the highlight class to the right verse element runs through the verse list. If the existing reader renders 176 verses, re-rendering on every verse change could be slow. Recon should test on Psalm 119 specifically and verify the render performance is acceptable. If not, the highlight implementation may need to use direct DOM manipulation (querySelector + classList.toggle) instead of React props, which is uglier but faster.

10. **Coordinate with BB-27's coordination layer.** BB-27 pauses ambient when Bible audio plays. BB-44's highlighting starts when Bible audio plays. These are independent — BB-27 cares about the Bible audio's state, BB-44 cares about the Bible audio's playback time. No cross-coupling needed. Recon should confirm this.

11. **Verify the timestamps endpoint's rate limit impact.** BB-26 uses ~1 DBP call per chapter open (the audio URL fetch). BB-44 adds another call per chapter open (the timestamps fetch). This doubles the per-chapter API load. With BB-26's confirmed 1500-per-window quota, this is still well within budget for any realistic usage, but recon should note the new ratio so future planning has the right baseline.

12. **End-of-wave verification.** This is the final spec in the wave. After BB-44 ships, the audio wave is complete. Recon should also verify that the wave's overall surface looks coherent: BB-26 (audio foundation), BB-29 (continuous playback), BB-28 (sleep timer), BB-27 (ambient pause), BB-44 (read-along) — all five specs together should produce a unified audio experience. If recon notices any inconsistency between the specs (different button styles, different ARIA patterns, different state management approaches), flag it for cleanup as part of BB-44 or as a follow-up wave-cleanup spec.
