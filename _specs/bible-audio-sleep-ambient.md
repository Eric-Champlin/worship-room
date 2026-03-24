# Feature: Bible Audio Sleep Timer & Ambient Pairing

**Spec sequence:** This spec builds on top of the 3-spec Bible reader sequence and the Music feature.
- Spec 23 (`bible-reader-browser.md`): Bible browser and chapter reading view
- Spec 24 (`bible-reader-highlights-notes.md`): Highlighting, notes, and verse sharing
- Spec 25 (`bible-reader-audio-playback.md`): Audio playback with TTS for chapters
- **This spec: Sleep timer integration, Bible-specific ambient scenes, audio ducking, and bedtime routine**

**Depends on:** Spec 25 (Bible Reader Audio Playback), Sleep Timer (Spec 5 — `sleep-timer-smart-fade.md`), Ambient Sound Mixer (Spec 2), Scene Presets (Spec 3), Bedtime Routines (Spec 8 — `bedtime-routines.md`), Ambient Cross-Pollination (Spec 6 — `ambient-sound-cross-pollination.md`).

---

## Overview

Falling asleep to Scripture is one of the most beloved practices in the Christian tradition — and it's the core experience that apps like Abide have built their entire business around. Worship Room already has a Bible reader with TTS audio playback (Spec 25), a sophisticated sleep timer with smart fade (Spec 5), and a rich ambient sound engine with scene presets. But these three systems don't talk to each other yet. A user who wants to fall asleep to the Bible with gentle rain in the background has to manually start TTS, navigate to the Music page to start a scene, then go back and set a sleep timer — a fragmented experience that breaks the sacred moment.

This spec connects these three systems into a seamless "fall asleep to the Bible" experience. It adds a sleep timer directly to the Bible reader's audio control bar, introduces three new ambient scene presets designed specifically for Bible reading, implements intelligent audio ducking (where ambient music automatically dips when Scripture is being spoken and rises during pauses), and creates a "Bible Before Bed" routine template that launches the complete experience with one tap. The result is a bedtime Scripture experience that rivals dedicated sleep apps — but integrated into a platform that also offers prayer, journaling, meditation, and community.

---

## User Stories

- As a **logged-in user** reading a Bible chapter at night, I want to set a sleep timer without leaving the Bible reader so that the reading fades to silence naturally and I can drift off to sleep.
- As any user, I want ambient background sounds designed for Bible reading so that I can create a calm, immersive atmosphere while listening to Scripture.
- As any user, I want the ambient music to automatically lower when a verse is being spoken and rise during pauses so that I can hear Scripture clearly without the music being distracting.
- As a **logged-in user**, I want a "Bible Before Bed" routine that starts ambient sounds and begins reading a Psalm with one tap so that my nightly Scripture ritual requires zero effort.
- As any user browsing the Sleep & Rest tab, I want quick-start options for falling asleep to Bible reading so that I can discover and use this feature without navigating to the Bible reader first.
- As a **logged-in user** with an active sleep timer from the Music feature, I want the Bible reader to show me the existing timer rather than letting me start a conflicting second timer.

---

## Requirements

### 1. Sleep Timer in the Bible Reader

#### Timer Button & Inline Panel

1. On the Bible reader's audio control bar (`/bible/:book/:chapter`), add a **"Sleep timer" button** to the right of the existing playback controls. The button uses the Lucide `Timer` icon with `text-white/40` default, `text-primary` when a timer is active.

2. Clicking the timer button opens a **compact inline timer panel** directly below the audio control bar. This follows the same inline expansion pattern used by the ambient cross-pollination pill (Spec 6) — not a modal, not a drawer.

3. The panel displays:
   - **Duration presets** as selectable pills in a horizontal row: 15, 30, 45, 60, 90 minutes (matching the existing `SLEEP_TIMER_OPTIONS` constant)
   - A **"Custom" pill** that, when selected, reveals a number input (5-480 minute range, step of 5)
   - **Fade duration options** below the duration row: 5, 10, 15 minutes as selectable pills (default: 10 minutes, matching the existing `FADE_DURATION_OPTIONS` subset)
   - A **"Start Timer" button** — full-width primary style, disabled until a duration is selected

4. The panel collapses when: the user clicks outside it, presses Escape, or starts a timer. Same dismiss patterns as the ambient suggestion panel.

#### Timer Activation & Behavior

5. Starting the timer activates the **existing sleep timer system** from the `AudioProvider` / `useSleepTimerControls()`. The Bible reader does not create a separate timer — it uses the same centralized timer that the Music feature uses.

6. **TTS volume fade behavior**: The Speech Synthesis API does not support real-time volume ramping on an active utterance. Instead, during the sleep timer's fade period, implement a progressive volume reduction by setting `SpeechSynthesisUtterance.volume` to a decreasing value on each new verse utterance. Calculate the target volume based on how far through the fade period the current moment is. Each verse spoken during the fade period gets a slightly lower volume than the previous one, creating a stepped fade effect.

7. **Timer completion**: When the sleep timer completes, stop TTS playback entirely (`speechSynthesis.cancel()`). The existing sleep timer system handles ambient sound fade via the AudioProvider's smart fade.

8. **Fade ordering** (when both ambient and TTS are active): Follow the same foreground/background ordering as the Sleep & Rest feature (Spec 5) — ambient sounds begin fading first (background), TTS fades second (foreground). Specifically: the ambient AudioProvider smart fade handles ambient sound fading on its existing schedule, while the TTS progressive volume reduction begins slightly after, so the user hears the voice lingering over fading ambient before the voice itself fades to silence.

#### Progress Ring Display

9. When a sleep timer is active, display the **existing SVG progress ring** (from the Music sleep timer UI) in the Bible reader's audio control bar, next to the timer button. The ring shows remaining time in the same visual style as the Music page's timer — thin purple stroke depleting clockwise on a `stroke: white/10` track.

10. The progress ring is compact (24px diameter) to fit within the audio bar. Tapping it opens the timer panel showing the active countdown and a "Cancel" button.

#### Conflict with Existing Music Timer

11. If a sleep timer is **already active** (started from the Music feature) when the user opens the Bible reader's timer panel, the panel shows:
    - The existing timer's remaining time (read from `useSleepTimerControls()`)
    - A message: "Timer already running from Music"
    - An **"Adjust" button** that opens the AudioDrawer's Timer tab (existing component)
    - No ability to start a second concurrent timer — the "Start Timer" button is not shown

12. Conversely, if a timer is started from the Bible reader, the Music feature's Timer tab shows the active timer as normal (since it's the same centralized timer system).

---

### 2. Bible Reading Ambient Scene Presets

#### Three New Scenes

13. Add 3 new ambient scene presets to the existing `SCENE_PRESETS` constant, tagged with a new `"bibleReading"` category:

    - **"Peaceful Study"**: Soft Piano + Gentle Wind + Flowing Stream. A calm, non-distracting atmosphere for focused reading. Default volumes: Piano 0.3, Wind 0.2, Stream 0.25.
    - **"Evening Scripture"**: Night Crickets + Fireplace + Ambient Pads. A warm evening atmosphere for winding down with the Word. Default volumes: Crickets 0.25, Fireplace 0.3, Pads 0.2.
    - **"Sacred Space"**: Cathedral Reverb + Choir Hum + Church Bells Distant. A reverent, church-like atmosphere. Default volumes: Reverb 0.2, Choir 0.15, Bells 0.1.

14. These scenes appear in two places:
    - In the **Bible reader's ambient suggestion panel** (the "Add background sounds" chip from Spec 25) — these 3 scenes replace the generic suggestions ("Still Waters", "The Upper Room", "Morning Mist") with Bible-reading-specific scenes
    - In the **general ambient browser** on `/music?tab=ambient` — available to everyone alongside the existing 8 scenes, filtered by the `"bibleReading"` category tag

15. The existing scene CSS background patterns system (`scene-backgrounds.ts`) needs a background pattern for each new scene. The patterns should evoke the scene's mood using the existing CSS gradient/pattern technique.

#### Bible Reader Ambient Chip Update

16. The "Add background sounds" chip on the Bible reader (from Spec 25) now shows the 3 Bible-reading scenes instead of the generic suggestions. The chip's behavior is otherwise identical to Spec 25's definition — same expansion pattern, same "Browse all sounds" link, same auth gating.

---

### 3. Audio Ducking (TTS + Ambient)

17. When ambient sounds are playing alongside TTS in the Bible reader, implement **automatic audio ducking**: ambient volume reduces to 25% of the user's set level while a verse is being spoken, then restores to the user's full volume during the pause between verses.

18. **Ducking implementation**: Use the AudioProvider's `masterGainNode` and the Web Audio API's `linearRampToValueAtTime` for smooth transitions:
    - When a verse utterance starts (`onstart` event on `SpeechSynthesisUtterance`): ramp `masterGainNode.gain` to `userVolume * 0.25` over 200ms
    - When a verse utterance ends (`onend` event): ramp `masterGainNode.gain` back to `userVolume` over 200ms
    - The 300ms pause between verses provides a natural window for the ambient volume to rise before the next verse ducks it again

19. **Edge cases for ducking**:
    - If the user's ambient volume is already at or below 25% of the master volume, do not reduce it further
    - If TTS is paused (`speechSynthesis.pause()`), restore ambient to full volume immediately (no ramp needed during pause since the user explicitly paused)
    - If TTS is stopped, restore ambient to full volume with a 200ms ramp
    - If no ambient sounds are playing, ducking is a no-op
    - The ducking system only activates when both TTS and ambient are simultaneously active on the Bible reader page

---

### 4. Bedtime Bible Routine

#### New Routine Template

20. Add a **"Bible Before Bed"** routine template to the existing routines data (alongside "Evening Peace", "Scripture & Sleep", and "Deep Rest"):
    - **Step 1**: Start the "Evening Scripture" ambient scene (no transition gap)
    - **Step 2**: Navigate to a random Psalm chapter in the Bible reader with auto-play enabled
    - **Sleep Timer**: 30 minutes, 10-minute fade (default)
    - **Description**: "Let the Psalms carry you to sleep. Warm ambient sounds set the mood while a Psalm is read aloud — a timeless way to end the day."

21. The routine's Step 2 navigates to `/bible/psalms/{randomChapter}?autoplay=true`, where `{randomChapter}` is randomly selected from the available Psalm chapters (1-150) at runtime.

#### `?autoplay=true` Query Parameter

22. The Bible reader (`/bible/:book/:chapter`) supports a `?autoplay=true` query parameter. When present:
    - After the chapter loads, wait 2 seconds (to allow the page to render and any ambient sounds from a routine to start)
    - Then automatically start TTS playback (equivalent to pressing the Play button)
    - The 2-second delay ensures a smooth, non-jarring start

23. **Auth requirement for autoplay**: Auto-play only activates for logged-in users. If a logged-out user navigates to a URL with `?autoplay=true`, the parameter is silently ignored — the chapter loads normally without auto-starting audio.

24. **Safety**: Auto-play never activates without the explicit `?autoplay=true` parameter. Normal Bible reader navigation never auto-plays audio.

---

### 5. Bible Reading in Sleep Context

#### Sleep & Rest Tab Integration

25. On the **Sleep & Rest tab** of the Music page (`/music?tab=sleep`), add a **"Scripture Reading"** section. Position it as a prominent card above or alongside the existing scripture readings section.

26. The section contains:
    - A **"Read the Bible" card**: Links to `/bible` with the description "Fall asleep to any chapter read aloud". Uses a book/Bible icon and warm styling.
    - **Three quick-start options** below the main card, one for each Bible reading scene:
      - "Peaceful Study" — starts the Peaceful Study scene and navigates to `/bible/psalms?autoplay=true`
      - "Evening Scripture" — starts the Evening Scripture scene and navigates to `/bible/proverbs?autoplay=true`
      - "Sacred Space" — starts the Sacred Space scene and navigates to `/bible/john?autoplay=true`

27. Each quick-start option, when tapped:
    - Starts the corresponding ambient scene (via the existing scene player)
    - Navigates to the target Bible book's first chapter with `?autoplay=true`
    - The user arrives at the Bible reader with ambient sounds playing and TTS about to start (after the 2-second delay)

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior | Auth modal message |
|---------|--------------------|--------------------|-------------------|
| Sleep timer button (Bible reader) | Visible, clickable — opens timer panel | Same | — |
| Timer duration/fade presets | Selectable (visual interaction) | Same | — |
| Custom duration input | Functional | Same | — |
| "Start Timer" button | Auth modal | Timer starts | "Sign in to use the sleep timer" |
| Sleep timer progress ring | Not visible (timer requires auth) | Shows when timer active | — |
| Cancel timer | N/A (can't start timer) | Cancels active timer | — |
| "Add background sounds" chip | Visible, expandable | Same | — |
| Bible reading scene card click | Auth modal | Scene starts playing | "Sign in to play ambient scenes" |
| Audio ducking | N/A (requires both TTS + ambient, ambient requires auth) | Automatic when both active | — |
| "Bible Before Bed" routine launch | Auth modal | Routine starts | "Sign in to use bedtime routines" |
| "Bible Before Bed" routine browse | Visible, can view description | Same | — |
| Quick-start options (Sleep tab) | Scene click triggers auth modal | Starts scene + navigates | "Sign in to play ambient scenes" |
| "Read the Bible" card (Sleep tab) | Navigates to `/bible` | Same | — |
| `?autoplay=true` parameter | Silently ignored | Auto-starts TTS after 2s | — |

### Persistence

- **No new localStorage keys.** This spec uses:
  - The existing sleep timer state (React context in AudioProvider)
  - The existing `wr_routines` key (for the new template)
  - The existing `wr_bible_progress` and `wr_meditation_history` keys (from Spec 25)
- **Three new scenes** are additions to the existing `SCENE_PRESETS` constant (code, not localStorage)
- **One new routine template** is added to the existing routines data constant
- **Route type**: All existing routes remain unchanged. No new routes created.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature involves no user text input. All interactions are button presses, timer controls, and scene selection.
- **User input involved?**: Only a numeric input for custom timer duration — no text content, no crisis risk.
- **AI-generated content?**: No. All spoken content is the WEB translation verbatim. All UI text is static.
- **Theological boundaries**: The text spoken is WEB translation word-for-word. Scene names and routine descriptions are curated static content with no interpretive claims.

---

## UX & Design Notes

### Emotional Tone

This feature should feel like pulling up a warm blanket, opening your Bible on the nightstand, and letting someone read to you as you drift off. The sleep timer panel is simple and calm — no cognitive load, just pick a time and close your eyes. The ambient scenes are atmosphere, not entertainment. The audio ducking is invisible magic — users just notice that the music seems to "know" when to be quiet and when to fill the space. The bedtime routine is a one-tap ritual that says "God's word is the last thing I want to hear tonight."

### Visual Design — Sleep Timer Panel

- **Container**: Same frosted glass as the audio control bar — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4`
- **Duration pills**: Same style as the existing sleep timer presets in the Music drawer — `rounded-full` horizontal row. Selected: `bg-primary text-white`. Unselected: `border border-white/20 text-white/50 hover:text-white/70`.
- **Fade pills**: Same style but smaller — `text-xs`. Selected: `bg-primary/20 text-primary`. Unselected: `text-white/40`.
- **Custom input**: Appears inline when "Custom" pill is selected. Number input with `bg-white/5 border border-white/15 rounded-lg` styling, "min" label suffix.
- **"Start Timer" button**: Full-width, `bg-primary hover:bg-primary-lt text-white rounded-lg py-2.5 font-medium`.
- **Active timer display**: Timer remaining as `text-lg font-semibold text-white` centered above a small "Cancel" text button in `text-white/40 hover:text-danger`.
- **Conflict message**: "Timer already running from Music" in `text-sm text-white/50` with an "Adjust" button in `text-primary hover:text-primary-lt underline`.

### Visual Design — Progress Ring (Compact)

- **Size**: 24px diameter — compact enough to sit inline in the audio bar
- **Style**: Same SVG technique as the Music timer ring — thin stroke (2px), `stroke: primary` fill depleting clockwise on `stroke: white/10` track
- **Placement**: Immediately left of the timer button in the audio bar, only visible when a timer is active
- **Tap behavior**: Tapping the ring opens the timer panel showing the countdown

### Visual Design — Bible Reading Scenes

- **Scene card style** (in ambient browser): Same card style as existing scenes — name, category tag, background pattern preview
- **Category badge**: "Bible Reading" category uses a book icon with a warm amber/gold color accent to distinguish from other categories

### Visual Design — Sleep Tab Section

- **"Read the Bible" card**: Larger hero-style card with a soft gradient background (e.g., warm amber to purple), book icon, title, and description. Rounded corners, frosted border.
- **Quick-start options**: Three smaller cards below in a horizontal row. Each shows the scene name, a small play icon, and the target book name. Same card styling as existing Sleep & Rest content cards.

### Design System Recon References

- **Frosted glass card pattern**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` — reused for the timer panel
- **Pill button pattern**: `rounded-full` pills with selected/unselected states — matches Music drawer timer presets
- **SVG progress ring**: Existing implementation in the Music sleep timer — reused at a smaller size
- **Ambient cross-pollination pill**: Spec 6 pattern — the timer panel follows the same inline expansion behavior
- **Scene card pattern**: Existing scene cards in the ambient browser — new scenes follow the same pattern

### New Visual Patterns

1. **Compact inline progress ring (24px)**: The existing progress ring is larger (in the drawer countdown display). This is a smaller, inline variant for the audio bar. New sub-pattern.
2. **Timer conflict state**: The "Timer already running from Music" message with "Adjust" link is a new informational pattern within the timer panel.
3. **Bible hero card on Sleep tab**: A larger, warmer-toned card distinguishing the Bible reading section from the scripture readings. New card variant.

---

## Responsive Behavior

### Mobile (< 640px)

- **Timer panel**: Full width within the content column. Duration pills wrap to 2 rows (3 per row: 15/30/45 on row 1, 60/90/Custom on row 2). Fade pills in a single row. "Start Timer" button full width.
- **Progress ring**: 24px, positioned in the audio bar. Tappable with 44px touch target (achieved via surrounding padding).
- **Timer panel and audio bar**: Both full width, stacked vertically.
- **Sleep tab quick-start options**: Stack vertically (one card per row) or horizontally scroll.
- **"Read the Bible" card**: Full width.

### Tablet (640px - 1024px)

- **Timer panel**: All duration pills in a single row. Fade pills in a single row. Comfortable spacing within `max-w-2xl`.
- **Progress ring**: Same 24px size, comfortably spaced in the audio bar.
- **Sleep tab**: Quick-start options in a horizontal row (3 cards across).
- **"Read the Bible" card**: Full width within the content column.

### Desktop (> 1024px)

- **Timer panel**: Same as tablet with more horizontal breathing room.
- **Progress ring**: Same, with hover tooltip showing remaining time.
- **Sleep tab**: Same as tablet. Cards have visible hover states.

---

## Edge Cases

- **Sleep timer starts during TTS fade period**: If the user starts a sleep timer while TTS is already in a manual fade (unlikely but possible), the sleep timer takes over volume management. The TTS progressive volume reduction uses the lower of: the sleep-timer-calculated volume or the current fade volume.
- **Chapter ends before sleep timer**: If the Bible chapter finishes before the timer expires, TTS stops naturally. Ambient sounds continue at full volume (no ducking since TTS is done). When the timer reaches its fade phase, only ambient fades.
- **User navigates away from Bible reader with active timer**: The sleep timer continues running (it's managed by the AudioProvider, not the Bible reader component). Ambient sounds continue playing. Only TTS stops (component unmount cancels `speechSynthesis`). The timer shows in the AudioPill/AudioDrawer as normal.
- **Routine navigates to a placeholder Psalm chapter**: The random Psalm selection should only choose from chapters that have full verse text (not placeholder chapters). If all Psalms are placeholders (unlikely), fall back to Psalm 23.
- **`?autoplay=true` with Speech Synthesis unavailable**: If `window.speechSynthesis` is undefined, the autoplay parameter is silently ignored. The chapter loads but audio does not start.
- **Multiple quick-start taps**: If the user taps a quick-start option while a scene is already playing, the existing scene player handles the scene switch (crossfade). Navigation proceeds to the new target.
- **Timer panel open + ambient panel open**: Only one inline panel should be open at a time. Opening the timer panel closes the ambient panel and vice versa.
- **Audio ducking with sleep timer fade**: During the sleep timer's fade period, ducking continues to operate but the "full volume" that ducking restores to is the fade-attenuated volume (not the original user volume). The ducking ratio (25%) is applied relative to whatever the current ambient volume target is.
- **`prefers-reduced-motion`**: Timer panel expand/collapse is instant. Progress ring animation is CSS-based and respects the preference. Ducking ramps still use `linearRampToValueAtTime` (audio transitions are not visual motion).

---

## Out of Scope

- **Real TTS audio files**: This spec uses browser Speech Synthesis API. Cloud TTS (Google, OpenAI) is Phase 4.
- **Background audio on mobile**: TTS stops when the browser is backgrounded. Native app background audio is a future platform feature.
- **Per-verse sleep timer granularity**: The timer works on time, not verse count. "Read me 10 verses then stop" is a future enhancement.
- **Playlist/queue of multiple chapters**: The bedtime routine navigates to one chapter. Continuous reading across chapters is a future enhancement.
- **Personalized scene recommendations**: Scene suggestions are static. AI-powered scene matching based on mood or content is Phase 4.
- **Timer sounds**: No chime or alarm at timer completion. Silence is the goal.
- **Audio speed persistence in routines**: The routine starts TTS at default speed (1x). Saving a preferred speed for routines is a future enhancement.
- **New routes**: No new routes. All changes are additions to existing pages and components.
- **New localStorage keys**: No new keys. All data uses existing storage.
- **Backend API**: Entirely frontend. No new endpoints.
- **Offline support**: No service worker caching. Requires active browser session.
- **Gamification integration**: No faith points for using sleep timer or bedtime routine. May come in a future spec.

---

## Acceptance Criteria

### Sleep Timer Panel — Appearance

- [ ] A "Sleep timer" button with Lucide `Timer` icon appears in the Bible reader's audio control bar, to the right of existing playback controls
- [ ] The timer button uses `text-white/40` by default and `text-primary` when a timer is active
- [ ] Clicking the timer button opens an inline timer panel below the audio control bar (not a modal)
- [ ] The panel uses frosted glass styling: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4`
- [ ] Duration presets displayed: 15, 30, 45, 60, 90 minutes as pill buttons in a horizontal row
- [ ] A "Custom" pill reveals a number input (5-480 min range) when selected
- [ ] Fade duration options displayed: 5, 10, 15 minutes as smaller pills (default: 10 min)
- [ ] "Start Timer" button is full-width primary style, disabled until a duration is selected
- [ ] Panel collapses on click-outside, Escape, or after starting a timer

### Sleep Timer — Auth Gating

- [ ] Logged-out user can view and interact with all timer setup controls (presets, fade, custom input)
- [ ] Logged-out user tapping "Start Timer" sees auth modal: "Sign in to use the sleep timer"
- [ ] Logged-in user tapping "Start Timer" activates the sleep timer

### Sleep Timer — Behavior

- [ ] Starting the timer uses the existing `useSleepTimerControls()` from the AudioProvider (same centralized timer)
- [ ] During the fade period, each new TTS verse utterance receives a progressively lower `SpeechSynthesisUtterance.volume`
- [ ] When the sleep timer completes, TTS playback stops entirely (`speechSynthesis.cancel()`)
- [ ] Ambient sounds fade via the AudioProvider's existing smart fade mechanism
- [ ] Fade ordering: ambient begins fading first, TTS fades second (matching Sleep & Rest foreground/background pattern)

### Sleep Timer — Progress Ring

- [ ] A 24px SVG progress ring appears in the audio bar when a sleep timer is active
- [ ] The ring uses `stroke: primary` depleting clockwise on a `stroke: white/10` track
- [ ] Tapping the progress ring opens the timer panel showing remaining time and "Cancel" option
- [ ] The ring is hidden when no timer is active

### Sleep Timer — Conflict Handling

- [ ] If a sleep timer is already active (from Music), the Bible reader's timer panel shows the remaining time
- [ ] The panel displays "Timer already running from Music" message
- [ ] An "Adjust" button opens the AudioDrawer's Timer tab
- [ ] The "Start Timer" button is not shown when a timer is already active
- [ ] Only one sleep timer can be active at a time across the entire app

### Bible Reading Scene Presets

- [ ] Three new scenes are added to `SCENE_PRESETS`: "Peaceful Study", "Evening Scripture", "Sacred Space"
- [ ] Each scene is tagged with a `"bibleReading"` category
- [ ] "Peaceful Study" uses: Soft Piano + Gentle Wind + Flowing Stream
- [ ] "Evening Scripture" uses: Night Crickets + Fireplace + Ambient Pads
- [ ] "Sacred Space" uses: Cathedral Reverb + Choir Hum + Church Bells Distant
- [ ] All three scenes appear in the general ambient browser on `/music?tab=ambient`
- [ ] All three scenes appear in the Bible reader's "Add background sounds" suggestion panel (replacing generic suggestions)
- [ ] Each scene has a CSS background pattern in `scene-backgrounds.ts`

### Audio Ducking

- [ ] When ambient sounds and TTS are both active, ambient volume ducks to 25% of the user's level during verse playback
- [ ] Volume reduction uses `masterGainNode.gain.linearRampToValueAtTime` with 200ms ramp time
- [ ] Volume restores to user's level during the 300ms pause between verses (200ms ramp)
- [ ] Ducking does not reduce volume below 25% if the user's volume is already at or below that level
- [ ] Pausing TTS restores ambient to full volume immediately
- [ ] Stopping TTS restores ambient to full volume with a 200ms ramp
- [ ] Ducking is inactive when no ambient sounds are playing
- [ ] Ducking is inactive when TTS is not playing

### Bedtime Bible Routine

- [ ] A "Bible Before Bed" routine template is added to the existing routines data
- [ ] The routine has 2 steps: start "Evening Scripture" scene, then navigate to a random Psalm with `?autoplay=true`
- [ ] Default sleep timer: 30 minutes with 10-minute fade
- [ ] The routine description reads: "Let the Psalms carry you to sleep. Warm ambient sounds set the mood while a Psalm is read aloud — a timeless way to end the day."
- [ ] The routine appears on `/music/routines` alongside existing templates
- [ ] Launching the routine requires authentication (same auth gate as existing routines)

### `?autoplay=true` Parameter

- [ ] The Bible reader supports `?autoplay=true` query parameter
- [ ] When present and user is logged in, TTS auto-starts after a 2-second delay
- [ ] When present and user is logged out, the parameter is silently ignored
- [ ] Auto-play never activates without the explicit parameter
- [ ] If `window.speechSynthesis` is undefined, the parameter is silently ignored

### Sleep Tab Integration

- [ ] A "Scripture Reading" section appears on the Sleep & Rest tab (`/music?tab=sleep`)
- [ ] The section contains a "Read the Bible" card linking to `/bible` with description "Fall asleep to any chapter read aloud"
- [ ] Three quick-start options are displayed: "Peaceful Study" (-> Psalms), "Evening Scripture" (-> Proverbs), "Sacred Space" (-> John)
- [ ] Each quick-start option starts the corresponding ambient scene and navigates to the target book with `?autoplay=true`
- [ ] Quick-start scene playback follows existing auth gating (logged-out users see auth modal)
- [ ] The "Read the Bible" card is accessible to all users (navigates to public `/bible` route)

### Responsive Layout

- [ ] Mobile (375px): Timer panel duration pills wrap to 2 rows; fade pills in 1 row; "Start Timer" full width; progress ring meets 44px touch target via padding
- [ ] Tablet (768px): All timer pills fit in single rows; panel within `max-w-2xl`
- [ ] Desktop (1440px): Same as tablet with more spacing; hover states visible
- [ ] Sleep tab quick-start options: vertical stack on mobile, horizontal row on tablet/desktop
- [ ] No horizontal overflow at any breakpoint

### Accessibility

- [ ] Timer button has `aria-label` ("Sleep timer" / "Sleep timer active — X minutes remaining")
- [ ] Timer panel has `aria-expanded` on the trigger button
- [ ] Duration pills use `role="radiogroup"` with `role="radio"` and `aria-checked` per pill
- [ ] Fade pills use `role="radiogroup"` with `role="radio"` and `aria-checked` per pill
- [ ] "Start Timer" button has `aria-label` including selected duration and fade
- [ ] Progress ring has `aria-label` ("Sleep timer: X minutes remaining")
- [ ] Cancel button has `aria-label="Cancel sleep timer"`
- [ ] Timer panel is keyboard-navigable (Tab between controls, Enter/Space to activate)
- [ ] Escape closes the timer panel and returns focus to the timer button
- [ ] "Timer already running" message is announced via `aria-live="polite"`
- [ ] All interactive elements meet 44px minimum touch targets
- [ ] Quick-start cards on Sleep tab have accessible names
- [ ] Ducking transitions do not create audible pops or clicks (smooth ramps)

### Cleanup & No Regressions

- [ ] Existing sleep timer in Music drawer works identically
- [ ] Existing ambient sound system works identically
- [ ] Existing Bible reader TTS playback (Spec 25) works identically when no timer is active
- [ ] Existing bedtime routines ("Evening Peace", "Scripture & Sleep", "Deep Rest") still work
- [ ] Existing ambient cross-pollination pill (Spec 6) on Daily Hub tabs still works
- [ ] Chapter completion tracking and meditation minutes recording (Spec 25) still work
- [ ] AudioPill remains visible and functional alongside Bible reader TTS controls
- [ ] No new routes created
- [ ] No new localStorage keys created

### Visual Verification

- [ ] Timer panel frosted glass is visible against the dark Bible reader background
- [ ] Duration pills clearly show selected vs. unselected states
- [ ] Fade pills are visually smaller/subtler than duration pills
- [ ] Progress ring (24px) is visible but unobtrusive in the audio bar
- [ ] Timer conflict state ("Timer already running") is clearly readable
- [ ] Bible reading scenes have distinct CSS background patterns in the ambient browser
- [ ] "Read the Bible" card on Sleep tab is visually prominent with warm styling
- [ ] Quick-start cards match the visual style of existing Sleep & Rest content cards
