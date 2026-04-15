# BB-29: Continuous Playback / Auto-Advance for Bible Audio

**Status:** Draft
**Date:** 2026-04-14
**Branch:** `audio-wave-bb-26-29-44`
**Depends on:** BB-26 (FCBH Audio Bible Integration) — shipped
**Depended on by:** None
**Related specs:** BB-28 (sleep timer), BB-27 (ambient layering), BB-44 (read-along)

## Master Plan Reference

Second spec in the BB-26-29-44 audio wave. BB-26 laid the foundation (DBP client, Howler engine, bottom sheet player, Media Session, supersession logic). BB-29 adds auto-advance so users can listen to multiple chapters back-to-back without tapping play at every chapter boundary. This is the smallest spec in the remaining wave — it extends BB-26's existing engine event handling rather than introducing new architecture. The request-id supersession pattern from BB-26 already handles the "user taps next chapter while auto-advance is firing" edge case for free.

## Overview

Currently, when a Bible audio chapter ends, BB-26's engine fires `onEnd` which dispatches a `STOP` action. The player resets to idle, the sheet reverts to `closed`, and the user has to navigate to the next chapter and tap play to continue listening. This is wrong for the primary use case — users who open the audio Bible typically want to listen continuously (reading a whole book, listening to scripture while falling asleep, following along during a commute), not chapter-by-chapter.

BB-29 changes the `onEnd` behavior: if continuous playback is enabled (the default), the provider automatically fetches the next chapter's audio and starts playing it. The BibleReader page navigates to follow the audio, so when the user looks at the screen they're always on the chapter currently playing. The player sheet persists through the transition in whatever state it was in (minimized or expanded). When the user reaches the end of a book, playback continues into the next book. When the user reaches the end of the Bible (Revelation 22), playback stops gracefully with a gentle end-of-Bible indication.

Continuous playback is on by default. Users can disable it via a toggle in the expanded player sheet. The preference persists across sessions via localStorage.

## User Story

As a user reading my Bible in the morning with coffee, I want to press play on John 3 and have the audio continue through John 4, John 5, John 6, and onward without me having to do anything. I might close my eyes and listen. I might follow along on screen. Either way, the audio should carry me through the book, and the screen should stay in sync so when I open my eyes I know where I am.

As a user who prefers to listen one chapter at a time (for study, meditation, or to sit with a specific passage), I want to disable continuous playback once and have it stay disabled. The next time I open the audio Bible, it should remember my preference.

## Functional Requirements

### Core auto-advance behavior

1. When `onEnd` fires for the currently playing track, if continuous playback is enabled and the current chapter is not the last chapter of the Bible (Revelation 22), the provider computes the next chapter reference and automatically starts playing it.

2. "Next chapter" is defined as:
   - If the current chapter is not the last chapter in its book, the next chapter is `(currentBook, currentChapter + 1)`.
   - If the current chapter IS the last chapter in its book, the next chapter is `(nextBook, 1)` where `nextBook` is determined by the canonical Protestant Bible order from `BIBLE_BOOKS` in `frontend/src/constants/bible.ts`.
   - If the current chapter is Revelation 22 (the last chapter of the last book), there is no next chapter. Playback stops.

3. Book boundary transitions happen automatically without user intervention. Example: Genesis 50 (chapter end) → Exodus 1 (auto-advance). The user sees the reader navigate to Exodus 1 and hears the Exodus 1 audio begin.

4. Testament boundary transitions also happen automatically. Malachi 4 (last OT chapter) → Matthew 1 (first NT chapter) requires switching the DBP fileset identifier from `EN1WEBO2DA` to `EN1WEBN2DA`. The provider handles this switch transparently; the user experience is a single seamless transition.

5. When auto-advance fires, the BibleReader page navigates to the new chapter (the URL changes from `/bible/john/3` to `/bible/john/4`). The reader content updates to show the new chapter. This navigation is triggered by the provider, not by the user.

6. The player sheet (`AudioPlayerSheet`) maintains its current state across the transition. If the sheet was minimized, it stays minimized. If it was expanded, it stays expanded. If the user had closed it, auto-advance still proceeds (audio continues playing) but the sheet does not reopen.

7. The chapter reference inside the sheet updates to reflect the new chapter. The expanded sheet shows "John 4" (instead of "John 3") as soon as the transition begins. The minimized bar updates the same way.

8. Media Session metadata updates on every auto-advance to reflect the new chapter. Lock-screen controls show the correct chapter reference at all times.

### End of Bible

9. When the currently playing track is Revelation 22 and `onEnd` fires, the provider does NOT attempt to advance. Instead, it dispatches `STOP` with a flag indicating the end of the Bible was reached. The sheet remains open (in whatever state it was in) and shows a brief, gentle message: "End of the Bible. Press play to start again from Genesis." A single button labeled "Start from Genesis" appears below the message. Tapping the button dispatches `play(genesis_1)` and continuous playback resumes normally.

10. The "end of Bible" state is NOT treated as an error. It is a successful completion of the continuous listening session. No error color, no warning icon, no toast. The visual treatment is calm and affirming.

11. If the user's sheet is closed when Revelation 22 ends, the "end of Bible" state is recorded in the provider but not surfaced (no sheet reopening, no notification). The next time the user opens the sheet, the state will be "closed" again as if nothing happened. The Start from Genesis button does not persist across sessions.

### Continuous playback toggle

12. The expanded player sheet contains a new UI control for enabling/disabling continuous playback. The control is a small labeled switch (not a full toggle button) placed below the speed picker row and above the FCBH attribution footer.

13. The label reads "Continuous playback" with a sub-label "Auto-play next chapter" in smaller, lower-contrast text.

14. The switch is a standard iOS-style toggle: on = filled track with the thumb to the right, off = unfilled track with the thumb to the left. When on, the track color matches the existing primary accent color in the design system. When off, the track is `bg-white/10`.

15. Tapping the switch toggles the preference. The change takes effect immediately — if the user toggles OFF during playback, the current chapter continues but does not auto-advance when it ends. If the user toggles ON during playback, the next chapter will auto-advance when the current one ends.

16. The toggle preference persists to localStorage under the key `bb29-v1:continuousPlayback` as a boolean. The value is read on provider mount and defaults to `true` if the key is absent or corrupt.

17. The toggle is NOT present on the minimized bar. Users must expand the sheet to change the preference. This keeps the minimized bar focused on essential playback controls only.

### Loading state between chapters

18. When auto-advance fires, there is a brief loading period while the provider fetches the next chapter's audio URL from DBP and Howler loads the MP3. During this period, the sheet shows a loading indicator: the play button in the expanded sheet becomes a small spinning indicator, and the minimized bar's play button does the same.

19. The loading indicator uses the same visual treatment as BB-26's initial-play loading state — no new loading UI is introduced. Reuse is deliberate.

20. If the fetch fails (DBP 404 for the next chapter, network error, timeout), the error handling follows BB-26's existing error paths. The sheet enters error state, shows an appropriate message ("Couldn't load the next chapter. Check your connection and try again."), and offers a dismiss button. Dismissing returns the sheet to idle state.

21. If a specific chapter has no audio available (DBP returns 404), auto-advance SKIPS that chapter and advances to the next one. Example: if Obadiah 1 has audio but some hypothetical chapter X has no audio, auto-advance would go from chapter X-1 to chapter X+1. The user is not interrupted by a single missing chapter.

22. If multiple consecutive chapters are unavailable (more than 3 in a row), auto-advance gives up and enters error state with the message "Couldn't find audio for the next several chapters. Check your connection and try again." This prevents infinite skipping in a pathological failure mode.

### Supersession during auto-advance

23. If the user manually navigates to a different chapter while auto-advance is in flight (e.g., auto-advance is loading John 4 and the user taps the Browse Books button, selects Genesis, and opens Genesis 1), BB-26's existing request-id supersession pattern automatically cancels the in-flight auto-advance. Genesis 1 becomes the active track. The user is in control.

24. If the user manually taps the AudioPlayButton on a different chapter while auto-advance is loading, same behavior — the user's action supersedes auto-advance.

25. If the user pauses playback before `onEnd` fires, auto-advance does NOT trigger on that pause. Auto-advance only triggers on natural end-of-chapter, not on user-initiated pauses.

26. If the user drags the scrubber to the end of the chapter (effectively forcing `onEnd`), auto-advance DOES trigger. This is indistinguishable from natural end-of-chapter from the provider's perspective, and the user behavior suggests they want to move on.

## Non-Functional Requirements

27. **Performance:** Auto-advance adds zero overhead to the idle state. No polling, no background work, no additional listeners beyond what BB-26 already has. The transition itself should feel seamless — the gap between `onEnd` and the next chapter starting should be under 500ms on a reasonable connection (typical DBP fetch + Howler load time).

28. **Bundle:** No new dependencies. All logic extends existing modules. Main bundle delta should be ≤1 KB gzipped.

29. **Testing:** The new auto-advance logic is tested at three levels:
    - Unit tests for the "next chapter" computation (book boundaries, testament boundaries, end of Bible)
    - Provider tests for the `onEnd` → auto-advance flow, including supersession during in-flight auto-advance
    - Integration tests at the BibleReader + provider level for full end-to-end auto-advance behavior

30. **Accessibility:** The continuous playback toggle is a standard form control with proper ARIA (`role="switch"`, `aria-checked`, `aria-labelledby`). Keyboard users can toggle it with Space or Enter.

## Auth Gating

| Action | Auth Required |
|--------|---------------|
| Auto-advance to next chapter | No |
| Toggle continuous playback preference | No |
| Persist preference across sessions | No |
| See "End of Bible" state | No |
| Tap "Start from Genesis" button | No |

BB-29 introduces zero new auth gates. Continuous playback works identically for logged-in and logged-out users. This matches the Bible wave auth posture documented in `.claude/rules/02-security.md` — Bible features are intentionally unauthenticated.

## Responsive Behavior

| Breakpoint | Width | Key behavior |
|-----------|-------|--------------|
| Mobile | 375px | Continuous playback toggle fits in the expanded sheet below the speed picker. Expanded sheet height remains 340px (verified in BB-26 Playwright pass that 340px has room for attribution footer; the toggle replaces 24px of whitespace above the footer without requiring a height bump). |
| Tablet | 768px | Same layout, wider toggle control. Expanded sheet height remains 300px. |
| Desktop | 1440px | Same layout with `max-w-2xl` constraint. |

No custom breakpoints introduced. If Playwright verification during execution finds that 340px mobile is now too tight with the added toggle, bump to 360px (the buffer is in the existing vertical rhythm, which has some slack per BB-26's verification report).

## AI Safety

Not applicable. BB-29 does not use AI and does not involve free-text user input. No crisis detection required.

## Auth & Persistence

**localStorage keys:**

| Key | Type | Description |
|-----|------|-------------|
| `bb29-v1:continuousPlayback` | `boolean` | User preference for auto-advance. Defaults to `true` when absent. |

The key follows BB-26's `bb*-v1:` prefix convention. Corruption (non-JSON, wrong type) falls back to the default `true`. No TTL — the preference persists indefinitely until the user changes it or clears their browser storage.

**Cross-session behavior:** The preference is read on `AudioPlayerProvider` mount and stored in provider state. Changes via the toggle write immediately to localStorage and update provider state. Page refresh reads the stored value.

**Cross-tab behavior:** Not synchronized across tabs in BB-29. If a user has the audio Bible open in two tabs and toggles the preference in one, the other tab will not reflect the change until it reloads. This is acceptable because simultaneous audio Bible use in two tabs is not a real use case — one tab's audio would overlap the other tab's audio.

The new key must be documented in `.claude/rules/11-local-storage-keys.md` as part of execution.

## Completion & Navigation

**Completion tracking:** BB-29 does NOT record listening activity for faith points, streaks, badges, or any gamification system. Consistent with BB-26's anti-pressure design. Auto-advancing through 30 chapters in a row does not award points.

**Navigation:** Auto-advance triggers React Router navigation via `navigate('/bible/<nextBook>/<nextChapter>')`. The navigation replaces the current history entry (uses `{ replace: true }`) rather than pushing a new one. This prevents the browser back button from being overwhelmed by a long listening session — after listening through Genesis 1 through Genesis 50, the back button still goes to wherever the user was before they started listening, not through 49 intermediate chapters.

**Deep linking:** If the user shares the URL while auto-advance is playing, the shared URL reflects the current chapter (not the starting chapter). Someone opening that URL lands on the correct chapter with no audio playing (audio requires a user gesture to start, per browser autoplay policies).

## Design Notes

### Continuous playback toggle styling

```
Toggle container:
- flex items-center justify-between
- px-6 (matching expanded sheet padding)
- mt-2 (sits between speed picker and attribution footer)

Label group:
- flex flex-col
- Label: text-white/90 text-sm font-medium ("Continuous playback")
- Sub-label: text-white/50 text-xs ("Auto-play next chapter")

Switch (iOS-style):
- role="switch"
- aria-checked={isContinuousPlayback}
- aria-labelledby={labelId}
- Track (off): w-10 h-6 rounded-full bg-white/10 transition-colors
- Track (on): bg-primary/60 (or whatever the project's primary accent token is)
- Thumb: absolute h-5 w-5 rounded-full bg-white shadow-sm transition-transform
- Thumb position (off): translate-x-0.5
- Thumb position (on): translate-x-4
- Transition duration: ANIMATION_DURATIONS.fast (150ms) — this IS a micro-interaction
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
```

Animation durations must come from `frontend/src/constants/animation.ts` per the BB-33 animation token discipline rule in CLAUDE.md.

### End-of-Bible state styling

```
Container:
- Same base layout as the existing error state in AudioPlayerExpanded
- Replaces the scrubber + controls section
- Preserves the chapter reference ("Revelation 22") and translation label at the top

Message:
- text-white/80 text-base (not text-sm — slightly more prominent)
- "End of the Bible. Press play to start again from Genesis."
- text-center mt-4

Button:
- Labeled "Start from Genesis"
- Same visual treatment as the large play button (h-14 w-14 rounded-full bg-white/10 border border-white/20)
- Icon: Play icon from lucide-react
- aria-label="Start playback from Genesis 1"
- mt-4
- Centered
```

### Vertical rhythm inside expanded sheet after BB-29

Top to bottom:
1. Corner buttons (unchanged)
2. Chapter reference + translation (unchanged)
3. Scrubber row (unchanged)
4. Play button + speed picker (unchanged)
5. **Continuous playback toggle** (new, replaces some whitespace above attribution)
6. FCBH attribution footer (unchanged)

The toggle's vertical position is between the speed picker and the attribution. It should feel like a settings control, distinct from the primary playback controls. The `mt-2` gap above and the existing gap to the attribution below provide the visual separation.

### New visual patterns

The iOS-style toggle switch is a **new pattern** in the Worship Room design system. If no reusable `Switch` component exists, BB-29 should create one at `components/ui/Switch.tsx` rather than inlining the JSX — the component is reusable and future specs (e.g., Settings page, Bible reader chrome preferences) may need it. Recon should grep for existing `role="switch"` implementations before assuming none exist.

## Anti-Pressure Design Decisions

**Continuous playback is ON by default** because the opposite is worse. Off by default means every user has to discover the toggle to get the behavior they actually want. On by default means the feature works correctly for most users without configuration.

**No "keep listening?" prompts.** Some audio apps pause after 30 minutes and ask "Are you still there?" to conserve resources. BB-29 does not. If the user started listening, they wanted to listen. Interrupting them to ask if they're still listening is exactly the kind of pressure Worship Room's design rejects.

**No listening time limits.** The user can listen through the entire Bible in one session if they want. 66 books, ~1189 chapters, roughly 70 hours of dramatized audio. The app imposes no limit.

**No gamification of auto-advance.** Listening to 10 chapters in a row does not unlock a badge. Listening to an entire book does not add faith points. The anti-pressure rule from BB-26 applies unchanged.

**End-of-Bible message is affirming, not congratulatory.** The message says "End of the Bible. Press play to start again from Genesis." It does NOT say "Congratulations! You listened to the entire Bible!" or "You completed 66 books!" or anything that frames listening as achievement. The message simply states the fact and offers a way to continue.

**Back button still works the way users expect.** Because auto-advance uses `navigate(..., { replace: true })`, a user who listens through 20 chapters and then taps back doesn't get dumped into a chapter-by-chapter history trail. They return to wherever they were before they started. The audio Bible does not hijack browser navigation.

## Out of Scope

1. **Per-book auto-advance preferences.** No "auto-advance within this book but stop at book boundaries" or "auto-advance the Gospels but not the Prophets." One global toggle, one behavior.

2. **Queueing specific chapters.** No "play John 3, 14, and 17 in sequence." Auto-advance is linear canon order only.

3. **Playlist creation.** No user-curated listening playlists. Out of scope for the entire audio wave.

4. **Background audio when the tab is not focused.** Browsers handle this via standard HTML5 audio element behavior. BB-29 does not attempt to extend or work around browser policies.

5. **Resume on page refresh.** If the user refreshes the page mid-chapter, playback does NOT resume where they left off. The player returns to idle. Persistent playback state is explicitly out of scope per BB-26's ephemeral design.

6. **Chromecast / AirPlay / external device routing.** Out of scope for the audio wave.

7. **Download for offline.** DBP license prohibits this. See BB-26 plan for details.

8. **Multiple audio versions / voice selection.** BB-26 ships one fileset per testament (EN1WEBO2DA / EN1WEBN2DA). BB-29 inherits this. Voice picker is a future spec.

9. **Sleep timer integration.** BB-28 is the sleep timer spec. If BB-28 ships first and the user has a sleep timer running, BB-29 auto-advance respects the sleep timer — when the timer fires, playback stops even if the current chapter hasn't ended. This is BB-28's responsibility, not BB-29's.

10. **Ambient layering interaction.** BB-27 is the ambient layering spec. BB-29 and BB-27 are independent. Auto-advance does not need to know about ambient audio state.

## Acceptance Criteria

- [ ] When a chapter ends and continuous playback is enabled, the next chapter automatically begins playing within 500ms on a normal connection.
- [ ] Book boundary transitions work (Genesis 50 → Exodus 1).
- [ ] Testament boundary transition works (Malachi 4 → Matthew 1) with fileset switch handled transparently.
- [ ] End of Bible (Revelation 22) triggers the end-of-Bible state with "Start from Genesis" button. Tapping the button starts playback from Genesis 1.
- [ ] When continuous playback is disabled, chapter end stops playback (BB-26 behavior preserved).
- [ ] The continuous playback toggle appears in the expanded sheet below the speed picker and above the attribution footer.
- [ ] Toggle state persists to localStorage under `bb29-v1:continuousPlayback`.
- [ ] Toggle preference is read on provider mount and defaults to `true` when absent.
- [ ] Toggle is absent from the minimized bar.
- [ ] The BibleReader navigates to the new chapter URL on every auto-advance (URL changes from `/bible/john/3` to `/bible/john/4`).
- [ ] Browser history uses `{ replace: true }` so the back button skips the intermediate chapters.
- [ ] Media Session metadata updates on every auto-advance (lock-screen shows current chapter).
- [ ] Player sheet maintains its state across transitions (minimized stays minimized, expanded stays expanded, closed means no sheet reopening).
- [ ] Manually navigating to a different chapter during auto-advance supersedes the auto-advance via BB-26's request-id pattern.
- [ ] Missing chapter audio (DBP 404) causes auto-advance to skip that chapter and continue. More than 3 consecutive missing chapters triggers error state.
- [ ] Toggle is keyboard accessible (Space/Enter).
- [ ] Toggle has proper ARIA (`role="switch"`, `aria-checked`, `aria-labelledby`).
- [ ] No new dependencies added.
- [ ] Main bundle delta ≤1 KB gzipped.
- [ ] Listening activity is NOT recorded for faith points, streaks, or badges.
- [ ] The `useBibleAudio.ts` and `SleepTimerPanel.tsx` scaffolding files remain untouched.
- [ ] BB-26's existing tests continue to pass unchanged.
- [ ] New `bb29-v1:continuousPlayback` localStorage key documented in `.claude/rules/11-local-storage-keys.md`.
- [ ] Animation durations imported from `frontend/src/constants/animation.ts`, not hardcoded.

## Notes for Plan Phase Recon

1. **`BIBLE_BOOKS` constant in `frontend/src/constants/bible.ts`** — verify the canonical Protestant book order is present and that each book has a `chapters` count or `chapterCount` field that gives the last chapter number for each book. If the constant only lists books without chapter counts, the recon needs to extend it or find an alternative source of chapter counts. The "next chapter" computation depends on knowing when we've hit the last chapter of a book.

2. **`isOldTestamentBook(slug)` helper from BB-26** — already exists at `frontend/src/lib/audio/book-codes.ts`. BB-29 uses this to determine when to switch filesets at the OT/NT boundary. Verify no changes needed.

3. **React Router `navigate` with `{ replace: true }`** — verify the BibleReader's existing router integration allows programmatic navigation from the provider. The `AudioPlayerProvider` may need access to `useNavigate()` via a wrapper component or prop drilling. Decide during planning whether to lift the navigation call into a new `AudioRouter` component or keep it in the provider.

4. **DBP rate limit under auto-advance load** — BB-26 recon confirmed 1500 requests per window per key. A user listening through a long book could make 50+ consecutive `getChapterAudio` calls. Even at 50 chapters back to back, this is well under the limit. Not a concern, but flag it in recon to confirm the assumption still holds under realistic listening patterns.

5. **Toggle switch component** — check if the project already has a reusable switch component (grep for `role="switch"` or `Switch` component name in `frontend/src/components/`). If yes, reuse it. If no, create a small `components/ui/Switch.tsx` as part of this spec rather than inlining the toggle JSX in `AudioPlayerExpanded`. The component is reusable and future specs may need it.

6. **End-of-Bible state** — verify no existing "end of content" pattern in the codebase that could inspire or conflict with BB-29's implementation. Check if the meditation or reading plan features have any analogous "you've finished" states.

7. **Media Session `nexttrack` and `previoustrack` action handlers** — BB-26 wired `play`, `pause`, `seekbackward`, `seekforward`, and `stop`. It did NOT wire `nexttrack` or `previoustrack`. BB-29 should wire these: `nexttrack` triggers manual advance to the next chapter (respecting auto-advance boundaries), `previoustrack` triggers manual advance to the previous chapter. This gives lock-screen / headphone-button users the same control as on-screen navigation. Plan this in the appropriate Media Session step.

8. **Confirm the 500ms seamless-transition target is achievable** — the typical DBP chapter fetch takes ~200-400ms and Howler's HTML5 load takes another 100-300ms depending on network. 500ms is an aggressive target. Recon should measure a few real transitions in the browser and confirm the target is realistic. If not, relax to 1000ms in the NFR.

9. **The "3 consecutive missing chapters" limit in requirement 22** is a heuristic, not a measurement. Recon should spot-check DBP coverage for gaps — are there books where 3+ chapters in a row might be missing? BB-26's recon confirmed 100% coverage across spot checks, so the limit is a defensive measure rather than a real risk. Document the reasoning in the plan.

10. **Bundle delta verification** — BB-29 is expected to add ≤1 KB gzipped to the main bundle. The new code is: "next chapter" computation helpers (small), provider reducer action for AUTO_ADVANCE (small), toggle component (small), end-of-Bible UI (small). The toggle and end-of-Bible UI live inside `AudioPlayerExpanded` which is already lazy-chunked, so those don't count against main bundle. Only the provider changes and the helper functions count. Recon should confirm the ≤1 KB target is reasonable before execution begins.
