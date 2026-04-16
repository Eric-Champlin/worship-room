# Feature: Audio-Guided Prayer Sessions

## Overview

Worship Room's Pray tab currently offers AI-generated text prayers, but the top competitor apps (Hallow, Abide, Pray.com) center their experience on audio-guided prayer — the kind where you close your eyes, listen, and let a voice lead you through a structured prayer with scripture, reflection, and silence. This is the core product of the #1 and #2 Christian apps, and Worship Room has nothing equivalent.

This feature adds 8 pre-built guided prayer sessions directly into the Pray tab on the Daily Hub. Each session alternates between spoken narration (via Speech Synthesis API) and contemplative silence, creating an immersive eyes-closed prayer experience. Sessions range from 5 to 15 minutes and cover themes from morning offering to forgiveness to healing. The experience uses the same audio infrastructure already built for prayer read-aloud and meditation exercises — TTS, KaraokeText, ambient sounds, chimes, and wake locks — but combines them into a new guided format that bridges the gap between Worship Room's text-first approach and the audio-first experiences users expect from this category.

---

## User Stories

- As a **logged-in user** on the Pray tab, I want to browse guided prayer sessions so that I can choose a prayer experience that matches my current need or the time of day.
- As a **logged-in user**, I want to tap a session card and enter a full-screen guided prayer player so that I can close my eyes and be led through a prayer without visual distractions.
- As a **logged-in user**, I want narration read aloud with word-by-word text display so that I can follow along visually or simply listen.
- As a **logged-in user**, I want periods of silence with a soft chime so that I have space to reflect and talk to God personally.
- As a **logged-in user**, I want ambient sounds to start automatically during the session so that the atmosphere feels sacred without me having to set it up.
- As a **logged-in user**, I want to see a completion screen with a meaningful verse and CTAs so that my prayer time transitions naturally into journaling, another session, or returning to the Pray tab.
- As a **logged-out visitor**, I want to browse the guided prayer session cards so that I can see what's available before deciding to sign up.

---

## Requirements

### Session Data Model

Each guided prayer session has:
- **id**: Unique string identifier (e.g., `morning-offering`)
- **title**: Display name (e.g., "Morning Offering")
- **description**: One-sentence summary of the session's focus
- **theme**: One of `peace`, `comfort`, `gratitude`, `forgiveness`, `strength`, `healing`, `morning`, `evening`
- **durationMinutes**: Total duration — `5`, `10`, or `15`
- **icon**: Lucide icon name matching the theme (e.g., `Sunrise` for morning, `Moon` for evening, `Leaf` for peace, `Heart` for comfort, `Sparkles` for gratitude, `Unlock` for forgiveness, `Shield` for strength, `HandHeart` for healing)
- **completionVerse**: A scripture reference and text (WEB translation) shown on the completion screen, thematically matched to the session
- **script**: Array of script segments

Each script segment has:
- **type**: `"narration"` or `"silence"`
- **text**: The narration text (for narration segments; empty string for silence segments)
- **durationSeconds**: How long this segment lasts

### The 8 Sessions

1. **"Morning Offering"** — 5 min, theme: morning. Dedicate the day to God. ~8-10 segments. Opens with greeting the new day, includes Lamentations 3:22-23 (WEB), invites the user to offer their plans, closes with a blessing.
2. **"Evening Surrender"** — 5 min, theme: evening. Release the day's burdens. ~8-10 segments. Reviews the day with gratitude, includes Psalm 4:8 (WEB), invites releasing worries, closes with peaceful rest blessing.
3. **"Finding Peace"** — 10 min, theme: peace. Guided through Philippians 4:6-7 (WEB). ~14-16 segments. Longer silences for reflection, explores each phrase of the passage, invites the user to name their anxieties and release them.
4. **"Comfort in Sorrow"** — 10 min, theme: comfort. For those who are grieving. ~14-16 segments. Gentle tone, includes Psalm 34:18 (WEB), acknowledges pain without minimizing it, invites the user to bring their sorrow to God.
5. **"Gratitude Prayer"** — 5 min, theme: gratitude. Thanksgiving walk-through. ~8-10 segments. Guides through thanking God for specific areas (people, provision, beauty, grace), includes 1 Thessalonians 5:18 (WEB).
6. **"Forgiveness Release"** — 15 min, theme: forgiveness. Guided process of releasing hurt. ~18-22 segments. Longer session with extended silences, includes Matthew 6:14-15 (WEB), walks through acknowledging hurt, choosing to forgive, and releasing to God.
7. **"Strength for Today"** — 5 min, theme: strength. Armor of God meditation. ~8-10 segments. Based on Ephesians 6:10-11 (WEB), names each piece of spiritual armor, invites the user to put on each one.
8. **"Healing Prayer"** — 10 min, theme: healing. Body, mind, and spirit. ~14-16 segments. Includes Jeremiah 17:14 (WEB), guides attention through body, thoughts, and spirit, inviting God's healing touch in each area.

All narration scripts use **WEB (World English Bible)** translation for any Scripture quoted within them.

### Session Card Display

A new section within the Pray tab, positioned **below** the existing prayer generation textarea/prayer display area and **above** the existing cross-tab CTAs ("What's On Your Mind?" / "What's On Your Spirit?"):

- **Section heading**: "Guided Prayer Sessions" in `font-bold text-text-dark text-xl sm:text-2xl`
- **Subheading**: "Close your eyes and let God lead" in `font-serif italic text-text-light text-base`
- **Card layout**:
  - Mobile (< 640px): Horizontally scrollable row with `overflow-x-auto snap-x snap-mandatory`, each card `min-w-[200px] flex-shrink-0 snap-center`
  - Tablet (640-1024px): 2x4 grid with `grid grid-cols-2 gap-3`
  - Desktop (> 1024px): 2x4 grid with `grid grid-cols-4 gap-4`
- **Each card**:
  - Uses the meditation card style from the design system: `rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer`
  - Theme icon (Lucide, 24px, `text-primary`)
  - Session title in `font-medium text-sm text-text-dark`
  - One-sentence description in `text-xs text-text-light line-clamp-2`
  - Duration pill: `bg-white/10 rounded-full px-2 py-0.5 text-xs text-text-light` (e.g., "5 min")
    - Note: On a white card background, the duration pill should use `bg-gray-100 rounded-full px-2 py-0.5 text-xs text-text-light` instead of `bg-white/10` which would be invisible on white
  - Green checkmark badge (Lucide `CheckCircle2`, 16px, `text-success`) in the top-right corner if the session was completed today — same completion badge pattern as meditation cards on the Meditate tab
  - Minimum touch target: 44px height (achieved via card padding)

### Full-Screen Guided Prayer Player

When a user taps a session card, a **full-screen modal/overlay** opens within the Daily Hub (not a new route — same pattern as how meditation exercises open from the Meditate tab):

#### Player Layout
- **Dark background**: `bg-hero-dark` (#0D0620) full viewport
- **Mobile**: Truly full-screen — navbar is not visible. The player occupies the entire viewport.
- **Desktop**: Full viewport overlay with the navbar hidden behind it (z-index above navbar)
- **Centered content**:
  - Large theme icon (Lucide, 48px on mobile / 64px on desktop, `text-white/30`)
  - Session title in `font-semibold text-white text-lg sm:text-xl` below the icon
  - Main text area (for narration text or "Be still..." silence indicator) — takes up the central portion of the screen
  - Progress bar near the bottom showing elapsed vs total time
  - Transport controls (Play/Pause and Stop) below the progress bar

#### Playback Behavior

**Narration segments:**
- Text is spoken aloud via the Speech Synthesis API (same TTS engine as the existing `ReadAloudButton` / `useReadAloud` hook)
- The narration text is displayed on screen in `font-serif italic text-white text-lg sm:text-xl leading-relaxed` (Lora italic)
- Word-by-word KaraokeText reveal synced to TTS playback, using the same KaraokeText mode from the karaoke-scripture-reveal spec (Spec 10 from Phase 2.85)
- The `durationSeconds` for narration segments represents the expected reading time. If TTS finishes before the duration, the remaining time is treated as a brief silence (the text stays visible). If TTS takes longer than the duration, the segment continues until TTS completes (TTS timing wins over scripted duration for narration).

**Silence segments:**
- The narration text fades out and is replaced by "Be still..." displayed in `font-serif italic text-white/30 text-xl` — faded, contemplative
- At the start of each silence segment, play a soft chime: 528Hz sine wave via Web Audio API, same as the breathing exercise chime (the existing `playChime()` utility from `lib/audio.ts`)
- The silence lasts for `durationSeconds` exactly, then automatically advances to the next segment

**Progress bar:**
- Thin horizontal bar near the bottom: `h-1 bg-white/10 rounded-full` background track, `bg-primary rounded-full` filled portion
- Shows elapsed time / total time as text: `text-xs text-white/40` (e.g., "3:24 / 10:00")
- Updates in real-time during playback

**Transport controls:**
- **Play/Pause button**: Large circular button (56px), `bg-white/10 rounded-full`, with Lucide `Play` or `Pause` icon (24px, `text-white`)
- **Stop button**: Smaller circular button (40px), `bg-white/5 rounded-full`, with Lucide `Square` icon (20px, `text-white/60`). Stops the session and returns to the Pray tab (closes the player overlay)
- Buttons are centered horizontally with `gap-6` between them
- All controls have `focus-visible:ring-2 focus-visible:ring-primary/50` for keyboard accessibility

#### Ambient Sound Auto-Pairing

When a session starts, if no audio is already playing (checked via AudioProvider state):

| Theme | Ambient Scene |
|-------|--------------|
| peace, comfort | Still Waters |
| gratitude, morning | Morning Mist |
| forgiveness, healing | Garden of Gethsemane |
| evening | Starfield |
| strength | The Upper Room |

- Start the contextual ambient scene at **30% master volume** via the existing scene player system
- Same auto-play pattern as the prayer generation enhancement (Spec 14 from Phase 2.85) — check `prefers-reduced-motion` preference, check if audio already playing, fail silently on errors
- If audio is already playing when the session starts, leave it alone — never interrupt existing audio

**Sound indicator:** At the bottom of the player screen, show:
- "Sound: [scene name]" with two actions: "Change" (opens AudioDrawer) and "Stop" (stops ambient audio)
- Same styling and behavior as the sound indicator from the prayer generation enhancement spec
- Only shown if ambient was auto-started by this feature
- `text-xs text-white/40` — deliberately unobtrusive on the dark background

#### Wake Lock

Request a wake lock (`navigator.wakeLock.request('screen')`) when the player opens to prevent screen dimming during the session. Release the lock when the player closes. Same pattern as meditation exercises. Fail silently if the browser doesn't support the Wake Lock API.

### Completion Screen

When all segments have been played, show a completion screen within the player overlay:

- **"Amen"** in large `font-script text-5xl sm:text-6xl text-white` (Caveat script font) — centered
- Session title below in `text-lg text-white/70`
- Duration completed: "X minutes of guided prayer" in `text-sm text-white/50`
- **Completion verse**: The session's `completionVerse` displayed in `font-serif italic text-white/80 text-base leading-relaxed` with the reference below in `text-xs text-white/40`
- **CTAs** (vertical stack, centered):
  1. "Journal about this" — Primary CTA style (`bg-primary text-white rounded-lg py-3 px-8 font-semibold`). Closes the player and switches to the Journal tab with the session theme as context (same pattern as existing "Journal about this" CTAs)
  2. "Try another session" — Outline style (`border border-white/30 text-white rounded-lg py-3 px-8`). Closes the player and scrolls to the Guided Prayer Sessions section on the Pray tab
  3. "Return to Prayer" — Text link style (`text-sm text-white/50 hover:text-white/70 underline`). Closes the player

### Activity Tracking & Recording

On session completion:
- Record as a `"guidedPrayer"` activity via the existing `recordActivity()` system — worth **10 faith points** (same as the existing `pray` activity)
- Record in `wr_meditation_history` as type `"guided-prayer"` with the actual session duration in minutes — for meditation minutes tracking (same storage service from the meditation-minutes-tracking spec)
- Session cards show a **green checkmark** if completed today — using the `useCompletionTracking` hook with a new completion key per session (e.g., `guided-prayer-morning-offering`), checked against today's date

### Accessibility

- **`prefers-reduced-motion`**: No KaraokeText word-by-word animation (instant text display). No chime visual effects (audio still plays). No fade transitions (instant show/hide). Progress bar still updates.
- **Keyboard navigation**: All controls (Play/Pause, Stop, CTAs) are keyboard-accessible. Escape key closes the player. Tab navigates between controls.
- **Screen reader**: Session cards have accessible names including title and duration. Player announces segment transitions via `aria-live="polite"` region. Transport controls have `aria-label` descriptions. Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- **Touch targets**: All interactive elements minimum 44px height
- **Focus trap**: While the player overlay is open, focus is trapped within the player (using existing `useFocusTrap` hook)

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| "Guided Prayer Sessions" section heading + cards | **Visible**. Users can browse all 8 session cards, see titles, descriptions, themes, and durations. | Same |
| Session card click | **Auth modal**: "Sign in to start a guided prayer session" | Opens the full-screen guided prayer player |
| Player Play/Pause button | Not reachable (player is auth-gated) | Plays/pauses the current segment |
| Player Stop button | Not reachable | Stops session and closes player |
| Ambient sound auto-play | Not reachable | Auto-starts contextual scene at 30% volume |
| Sound indicator "Change" | Not reachable | Opens AudioDrawer |
| Sound indicator "Stop" | Not reachable | Stops ambient audio |
| Completion "Journal about this" | Not reachable | Closes player, switches to Journal tab |
| Completion "Try another session" | Not reachable | Closes player, scrolls to session cards |
| Completion "Return to Prayer" | Not reachable | Closes player |
| Green checkmark on card | Not visible (completions require auth) | Visible if session completed today |

### Persistence

- **Logged-out (demo mode)**: Zero persistence. No data saved. No cookies. No localStorage writes. Session cards are visible (browse-only).
- **Logged-in**:
  - Activity recorded via `recordActivity('guidedPrayer')` — writes to existing `wr_daily_activities` localStorage key
  - Session logged to `wr_meditation_history` as type `"guided-prayer"` — writes to existing localStorage key
  - Completion tracked via `useCompletionTracking` — writes to existing daily completion localStorage key
  - Ambient audio state managed by existing AudioProvider (no new storage)
- **Route type**: Public (the Pray tab with session cards is viewable by all; auth gate is on the *start session* action, not the *browse* action)
- **No new localStorage keys introduced** — uses existing `wr_daily_activities`, `wr_meditation_history`, and completion tracking keys

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature has no user text input. All narration content is hardcoded and curated. The session scripts are written with pastoral care and do not contain triggering language.
- **User input involved?**: No. The user interacts only via tap/click on cards and transport controls. No freeform text fields.
- **AI-generated content?**: No. All narration scripts, completion verses, and UI text are hardcoded constants. No OpenAI API calls.
- **Theological boundaries**: Narration scripts follow the AI content guidelines from `01-ai-safety.md` — encouraging tone, no authoritative claims ("Scripture encourages us..." not "God is telling you..."), no denominational bias, no directive life advice.

---

## UX & Design Notes

### Emotional Tone

The guided prayer experience should feel like being led by a gentle, unhurried friend into a quiet room. The dark full-screen player removes all distractions. The narration pace is deliberate — silences are not empty space but sacred invitations. The "Be still..." text during silence validates the user's waiting. The completion "Amen" honors the prayer as a complete act, not a task to check off.

### Design System Recon References

- **Session cards**: Use the meditation card pattern exactly — `rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md` — from the CSS Mapping Table in `design-system.md`
- **Dark player background**: `bg-hero-dark` (#0D0620) — same dark purple used in hero gradients, footer, and Song Pick section
- **Narration typography**: `font-serif italic` (Lora) — matches journal prompt styling and scripture display
- **"Amen" on completion**: `font-script` (Caveat) — matches hero H1 styling pattern
- **Progress bar**: New visual pattern for the guided prayer player — not in the existing design system. Plan should mark exact sizing values as `[UNVERIFIED]`
- **Transport controls**: New visual pattern — circular icon buttons on dark background. Similar to AudioPill/AudioDrawer control patterns but larger.
- **Sound indicator**: Reuse the same pattern from the prayer generation enhancement spec — `text-xs text-white/40` with "Change" / "Stop" actions

### New Visual Patterns

1. **Full-screen dark player overlay** — new pattern (meditation sub-pages are full pages, not overlays). Plan should verify z-index relationship with navbar.
2. **Circular transport controls** (Play/Pause, Stop) — new pattern. Mark sizing values as `[UNVERIFIED]`.
3. **Progress bar with time display** — new pattern. Mark proportions as `[UNVERIFIED]`.
4. **Horizontally scrollable card row** (mobile) — used in some existing sections but new for the Pray tab.

---

## Responsive Behavior

### Mobile (< 640px)

- **Session cards**: Horizontally scrollable row. Each card is `min-w-[200px]`. Snap scroll for natural card browsing. User can swipe left/right.
- **Player**: Truly full-screen — no navbar, no status bar overlap. Content centered vertically and horizontally. Transport controls near the bottom with comfortable thumb reach.
- **Narration text**: `text-lg` with generous `leading-relaxed` line height. Wraps naturally.
- **Progress bar**: Full width with `mx-4` side margins.
- **Completion CTAs**: Full width buttons stacked vertically with `gap-3`.
- **Sound indicator**: Centered at the bottom of the screen.

### Tablet (640px - 1024px)

- **Session cards**: 2x4 grid with `gap-3`.
- **Player**: Full viewport overlay. Content centered in a `max-w-lg` container. Transport controls centered.
- **Narration text**: `text-xl` with `leading-relaxed`.
- **Completion CTAs**: Auto-width buttons stacked vertically, centered.

### Desktop (> 1024px)

- **Session cards**: 4-column grid with `gap-4`. All 8 cards visible at once in 2 rows.
- **Player**: Full viewport overlay with content in a `max-w-xl` container, centered vertically and horizontally.
- **Narration text**: `text-xl` with generous line height.
- **Completion CTAs**: Auto-width buttons stacked vertically, centered.
- **Sound indicator**: Centered at the bottom.

---

## Edge Cases

- **TTS not available**: If the browser doesn't support Speech Synthesis API, narration text is displayed with KaraokeText timed reveal (at a calculated words-per-second pace matching `durationSeconds`) without audio. The experience degrades to a visual-only guided prayer.
- **TTS narration longer than durationSeconds**: The segment continues until TTS finishes speaking — TTS timing wins for narration segments. The progress bar reflects the actual elapsed time, which may exceed the scripted total.
- **TTS narration shorter than durationSeconds**: After TTS finishes, the remaining time is treated as a brief contemplative pause with the full narration text still visible. The segment advances when `durationSeconds` elapses.
- **User pauses mid-session**: The TTS stops, ambient audio continues playing, the timer pauses. Resuming continues from the current position in the current segment.
- **User stops mid-session**: Player closes, no completion is recorded, no activity is tracked. Ambient audio stops if it was auto-started by this feature.
- **User navigates away during session**: Player closes (component unmount), TTS cancels, wake lock releases. Ambient audio continues (global AudioProvider state). No completion recorded.
- **Audio already playing when session starts**: Ambient auto-pairing is skipped. Existing audio continues. The sound indicator does not appear.
- **Ambient scene fails to load**: Fail silently. Session continues without ambient sounds. Sound indicator does not appear.
- **Wake Lock API not supported**: Fail silently. Session plays normally, but screen may dim.
- **Multiple session completions in one day**: Each completion is recorded separately in `wr_meditation_history`. The green checkmark appears once any completion exists for today (one is enough).
- **`prefers-reduced-motion`**: KaraokeText shows text instantly. Chime audio still plays (audio is not motion). No fade transitions. Progress bar updates without animation.
- **Bedtime routine active**: If a bedtime routine is running when the user starts a session, ambient auto-pairing is skipped (same check as prayer generation enhancement — routine active counts as "audio already playing").
- **Very small screens (< 320px)**: Session cards in the scrollable row may need `min-w-[180px]` adjustment. Player content scales down but remains usable.
- **Session card layout on exactly 640px**: The breakpoint transition from scrollable row to 2-column grid should be clean — no layout flash.

---

## Out of Scope

- **Custom narration voices or voice selection** — uses the browser's default Speech Synthesis voice
- **Downloadable audio files** — all narration is generated live via TTS, not pre-recorded
- **User-created or AI-generated guided prayer sessions** — only the 8 hardcoded sessions ship
- **Session playback speed control** — narration plays at TTS default rate
- **Background playback** — the player requires the app to be in the foreground (no service worker audio)
- **Session progress saving / resume** — if the user leaves mid-session, they start from the beginning next time
- **Session analytics** (which sessions are most popular, completion rates) — no tracking beyond the binary completion flag
- **Backend API persistence** — all data is localStorage only (Phase 2 pattern)
- **Real pre-recorded narration audio** — Phase 4 (real TTS audio via Google Cloud TTS WaveNet)
- **Session recommendations based on mood** — the 8 sessions are presented statically, not personalized
- **New routes** — the player is an overlay, not a separate route
- **Sharing guided prayer sessions** — no share card or social sharing for sessions
- **Dark mode toggle** — the player is always dark; the session cards inherit the Pray tab's light background
- **Multi-language narration** — English only (per Non-Goals for MVP)
- **Music during narration** — ambient sounds play during silence segments and quietly during narration, but there's no spoken-word-over-music mixing or ducking

---

## Acceptance Criteria

### Session Card Section

- [ ] A "Guided Prayer Sessions" section appears on the Pray tab below the prayer generation area and above the cross-tab CTAs
- [ ] Section heading reads "Guided Prayer Sessions" in bold dark text
- [ ] Subheading reads "Close your eyes and let God lead" in Lora italic, muted color
- [ ] 8 session cards are displayed with correct titles: Morning Offering, Evening Surrender, Finding Peace, Comfort in Sorrow, Gratitude Prayer, Forgiveness Release, Strength for Today, Healing Prayer
- [ ] Each card shows a theme-appropriate Lucide icon, title, one-sentence description, and duration pill
- [ ] Duration pills show "5 min", "10 min", or "15 min" with `bg-gray-100 rounded-full` styling on the white card background
- [ ] Session cards use the meditation card style: `rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md`
- [ ] Cards that have been completed today show a green checkmark badge (Lucide `CheckCircle2`, `text-success`) in the top-right corner

### Session Card Layout

- [ ] Mobile (< 640px): Cards display in a horizontally scrollable row with snap scrolling, each card `min-w-[200px]`
- [ ] Tablet (640-1024px): Cards display in a 2-column grid
- [ ] Desktop (> 1024px): Cards display in a 4-column grid with all 8 cards visible in 2 rows

### Auth Gating

- [ ] Logged-out users can see and browse all 8 session cards (titles, descriptions, durations, icons)
- [ ] Logged-out users clicking a session card see the auth modal with message "Sign in to start a guided prayer session"
- [ ] Logged-in users clicking a session card opens the full-screen guided prayer player
- [ ] Green checkmarks are only visible for logged-in users who have completed a session today

### Player — Layout & Controls

- [ ] The player opens as a full-screen overlay with a dark `bg-hero-dark` (#0D0620) background
- [ ] On mobile, the player is truly full-screen with no navbar visible
- [ ] The player displays the session's theme icon (large, centered, `text-white/30`), session title, narration/silence text area, progress bar, and transport controls
- [ ] Play/Pause button is a 56px circular button with the appropriate Lucide icon
- [ ] Stop button is a 40px circular button that closes the player and returns to the Pray tab
- [ ] All controls have visible focus rings for keyboard accessibility
- [ ] Escape key closes the player
- [ ] Focus is trapped within the player while open (using `useFocusTrap`)

### Player — Narration Playback

- [ ] Narration segments are spoken aloud via Speech Synthesis API
- [ ] Narration text appears on screen in Lora italic (`font-serif italic text-white`)
- [ ] Words reveal one-by-one via KaraokeText, synced to TTS playback
- [ ] If TTS is unavailable, narration text still displays with timed word reveal (visual-only fallback)
- [ ] With `prefers-reduced-motion`, narration text appears instantly (no word-by-word animation)

### Player — Silence Segments

- [ ] During silence segments, text changes to "Be still..." in faded text (`text-white/30`)
- [ ] A soft 528Hz sine wave chime plays at the start of each silence segment (via existing `playChime()` utility)
- [ ] Silence segments last for exactly their `durationSeconds` and auto-advance to the next segment
- [ ] Chime audio still plays even with `prefers-reduced-motion` enabled

### Player — Progress Bar

- [ ] A thin progress bar shows elapsed vs total session time
- [ ] Elapsed/total time is displayed as text (e.g., "3:24 / 10:00") in `text-xs text-white/40`
- [ ] Progress bar updates in real-time during playback
- [ ] Progress bar has `role="progressbar"` with appropriate ARIA attributes

### Player — Ambient Sound Auto-Pairing

- [ ] When a session starts with no audio playing, the contextual ambient scene starts at 30% master volume
- [ ] Theme-to-scene mapping is correct: peace/comfort → Still Waters, gratitude/morning → Morning Mist, forgiveness/healing → Garden of Gethsemane, evening → Starfield, strength → The Upper Room
- [ ] If audio is already playing, ambient auto-pairing is skipped and existing audio continues
- [ ] If `prefers-reduced-motion` is enabled, ambient auto-pairing is skipped
- [ ] If a bedtime routine is active, ambient auto-pairing is skipped
- [ ] If the scene fails to load, the session continues without ambient sounds (fail silently)
- [ ] A "Sound: [scene name]" indicator with "Change" and "Stop" actions appears at the bottom of the player (only if auto-started)

### Player — Wake Lock

- [ ] Wake lock is requested when the player opens (prevents screen dimming)
- [ ] Wake lock is released when the player closes
- [ ] If Wake Lock API is not supported, the player functions normally without it

### Completion Screen

- [ ] On session completion, a completion screen appears with "Amen" in large Caveat script font (`font-script text-5xl sm:text-6xl text-white`)
- [ ] Session title and duration completed ("X minutes of guided prayer") are displayed below
- [ ] A thematically appropriate scripture verse (WEB translation) is shown
- [ ] Three CTAs appear: "Journal about this" (primary), "Try another session" (outline), "Return to Prayer" (text link)
- [ ] "Journal about this" closes the player and switches to the Journal tab with session theme as context
- [ ] "Try another session" closes the player and scrolls to the Guided Prayer Sessions section
- [ ] "Return to Prayer" closes the player

### Activity Tracking

- [ ] Session completion records a `"guidedPrayer"` activity via `recordActivity()` — worth 10 faith points
- [ ] Session completion records an entry in `wr_meditation_history` with type `"guided-prayer"` and the actual duration in minutes
- [ ] Incomplete sessions (stopped mid-way) do NOT record any activity or history
- [ ] Completing a session causes the corresponding card to show a green checkmark for the rest of the day

### Narration Content

- [ ] All 8 sessions have complete narration scripts with alternating narration and silence segments
- [ ] All Scripture within narration uses WEB (World English Bible) translation
- [ ] Narration tone is encouraging, compassionate, and non-authoritative (follows AI content guidelines)
- [ ] Each session's total segment durations add up to approximately the stated durationMinutes

### Accessibility

- [ ] All session cards are keyboard-navigable with visible focus indicators
- [ ] Player transport controls are keyboard-accessible
- [ ] Screen readers can access session card information (title, description, duration)
- [ ] Player announces segment transitions via `aria-live="polite"` region
- [ ] `prefers-reduced-motion` disables KaraokeText animation and fade transitions (audio still plays)
- [ ] Focus is trapped within the player while it's open
- [ ] All interactive elements have minimum 44px touch targets

### No Regressions

- [ ] Existing prayer generation flow (textarea, Generate Prayer, Copy, Share, Read Aloud) is unchanged
- [ ] Existing CrisisBanner on the Pray tab textarea is unchanged
- [ ] Existing cross-tab CTAs ("What's On Your Mind?" / "What's On Your Spirit?") remain visible and functional
- [ ] Existing AmbientSoundPill on the Pray tab is unchanged
- [ ] Existing meditation completion tracking is unchanged
- [ ] Global AudioPill behavior is unaffected
- [ ] No new routes created
- [ ] No new localStorage keys introduced (uses existing keys only)
