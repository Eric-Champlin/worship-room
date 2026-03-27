# Feature: Sound Effects Feedback

**Master Plan Reference:** N/A — standalone feature

---

## Overview

Worship Room currently relies entirely on visual feedback for achievements and milestones. Competitors like Hallow use sound extensively to create atmosphere and make spiritual moments feel tangible. This feature adds warm, organic sound effects at key emotional moments — badge celebrations, mood check-ins, streak milestones, answered prayers — making the experience more immersive and spiritually resonant. Sound is enhancement, never required: it fails silently and respects accessibility preferences.

## User Story

As a **logged-in user**, I want to **hear subtle, warm audio feedback when I reach milestones and complete meaningful actions** so that **achievements feel tangible and spiritually resonant rather than purely visual**.

## Requirements

### Functional Requirements

#### Sound System Architecture

1. A shared `useSoundEffects` hook provides a `playSoundEffect(soundId: string)` function that plays a requested sound at the appropriate volume.
2. The hook checks two conditions before playing: (a) the user hasn't disabled sound effects in settings (`wr_sound_effects_enabled` localStorage key, default `true`), and (b) the browser allows audio playback (user has interacted with the page — required by autoplay policies).
3. Sound effects use the Web Audio API, sharing the same `AudioContext` as the ambient sound system via `AudioProvider` / `AudioEngineService` to avoid creating competing audio contexts.
4. Each sound is a short synthesized buffer (under 2 seconds) generated programmatically using Web Audio API oscillators and gain envelopes — no external audio files needed, keeping the bundle small.
5. Sound buffers are generated once and cached for reuse.
6. If the `AudioContext` isn't available or sound generation fails, fail silently — sound effects are enhancement, never required.

#### Sound Library — 6 Programmatic Sounds

| Sound ID | Description | Synthesis | Volume | Used For |
|----------|-------------|-----------|--------|----------|
| `chime` | Soft singing bowl tone | Single sine wave at 528Hz (C5), gentle attack (100ms), sustain (400ms), exponential decay (1s) | 0.3 | Badge earned (toast tier), mood check-in completion, devotional read, gratitude saved |
| `ascending` | 3-note ascending sequence | Three sine waves at 396Hz, 528Hz, 660Hz (G4, C5, E5) played 150ms apart, each with 100ms attack and 600ms decay | 0.3 | Level up, streak milestone, challenge day completion |
| `harp` | Gentle pluck sound | Triangle wave at 440Hz (A4) with instant attack (5ms), quick decay (300ms), and a slight chorus effect (second oscillator at 441Hz for warmth) | 0.3 | Prayer answered, challenge complete, reading plan complete |
| `bell` | Single clear bell tone | Sine wave at 784Hz (G5) with 10ms attack, 200ms sustain, 1.5s exponential decay. Higher and clearer than chime | 0.3 | Evening reflection start, Bible book completion |
| `whisper` | Soft breathy wash | White noise filtered through a bandpass filter at 800Hz with Q of 2, 200ms attack, 800ms sustain, 500ms decay | 0.15 | "Pray for this" ceremony, streak repair success |
| `sparkle` | Quick bright twinkle | Two sine waves at 1047Hz and 1319Hz (C6 and E6) with 5ms attack, 100ms decay, played simultaneously | 0.1 | Faith points earned, getting started checklist item completion |

#### Sound Trigger Integration Points

All trigger points are within auth-gated flows. Only add `playSoundEffect` calls — do not change any visual behavior, animations, celebrations, or feature logic.

| Trigger | Component/Flow | Sound | When |
|---------|---------------|-------|------|
| Badge celebration | CelebrationOverlay / badge toast system | toast → `chime`, toast-confetti → `chime`, special-toast → `ascending`, full-screen → `harp` | When the celebration component mounts |
| Mood check-in completion | MoodCheckIn | `chime` | When transitioning to the verse display phase (after mood selection, before KaraokeTextReveal) |
| Streak milestone | StreakCard | `ascending` | When streak counter shows a milestone value (7, 14, 30, 60, 90, 180, 365) that wasn't shown before (compare against a `lastCelebratedStreak` ref) |
| Level up | useFaithPoints | `ascending` | When the user's level changes (compare previous level to current level) |
| Faith points earned | useFaithPoints / recordActivity | `sparkle` at 0.1 gain | When `recordActivity` successfully awards points. Ultra-subtle — barely perceptible |
| Prayer answered | MyPrayers page | `harp` | When a prayer is marked as answered and the celebration overlay fires |
| Streak repair | StreakCard | `whisper` | When `repairStreak` succeeds and the celebration toast fires |
| Evening reflection start | Evening reflection overlay | `bell` | When the evening reflection overlay opens (user clicks "Reflect Now") |
| Challenge day completion | ChallengeDetail | `ascending` | When "Mark Complete" is clicked and the day is recorded |
| Bible book completion | Bible reader | `bell` | When the book completion celebration toast fires |
| Gratitude saved | GratitudeCard widget | `chime` | When the gratitude widget save succeeds |
| Pray for this ceremony | InteractionBar (Prayer Wall) | `whisper` | When the "Pray for this" animation triggers (layers with the visual ripple effect) |
| Getting started checklist item | GettingStartedCard | `sparkle` | When an item auto-completes or is checked off |
| Devotional read | Devotional page | `chime` (soft) | When the Intersection Observer fires marking the devotional as read |

#### Volume Rules

- Base volume for all sounds: **0.3** (30% of max) except `sparkle` at **0.1** (10%) and `whisper` at **0.15** (15%).
- If ambient sounds are currently playing, sound effects layer on top at their normal volume — they're short enough not to conflict.
- `sparkle` plays frequently (every `recordActivity` call) so it must be ultra-subtle — barely perceptible, more felt than heard.

#### Settings Integration

- Add a "Sound Effects" toggle in the Settings page under a new **Sound** section or within the existing Notifications section.
- Toggle label: **"Sound Effects"**
- Toggle description: **"Play subtle sounds on achievements and milestones."**
- Default: **on** (enabled).
- The toggle writes to `wr_sound_effects_enabled` in localStorage.
- Independent of ambient sound volume — a user can have sound effects on but ambient sounds off, or vice versa.

#### Accessibility: prefers-reduced-motion

- When the user has `prefers-reduced-motion: reduce` enabled, disable all sound effects automatically regardless of the settings toggle.
- The `useSoundEffects` hook checks this via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- The hook returns a no-op `playSoundEffect` when either the setting is off or reduced motion is preferred.

#### Mobile Considerations

- On iOS Safari, Web Audio API requires a user interaction before audio can play. The `AudioContext` is likely already unlocked if the user has interacted with ambient sounds. If not, the first sound effect call may be silent — this is acceptable. Do not show an error or prompt.
- On Android Chrome, Web Audio API works after any user gesture on the page (tap, click).

### Non-Functional Requirements

- **Performance**: Sound synthesis code adds zero network requests. Cached buffers reuse memory. No perceptible UI jank from sound generation.
- **Bundle size**: Entirely programmatic — no audio files, no CDN dependencies, no additional bundle size beyond the synthesis code.
- **Accessibility**: Respects `prefers-reduced-motion`. Sounds are non-essential — all information is conveyed visually. Toggle available in Settings.

## Auth Gating

All sound effects are logged-in only since they're tied to gamification events that only fire for authenticated users. The `useSoundEffects` hook can be used anywhere but every trigger point is within an auth-gated flow.

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Sound effects on achievements | No sound (gamification events don't fire for logged-out users) | Sound plays at trigger points per the integration table |
| Sound Effects toggle in Settings | Settings page is auth-gated — logged-out users cannot reach it | Toggle controls `wr_sound_effects_enabled` localStorage key |

## Responsive Behavior

This feature has no UI layout changes — it adds audio feedback only. The only UI addition is a Settings toggle, which follows the existing Settings page responsive pattern:

| Breakpoint | Settings Toggle Layout |
|-----------|----------------------|
| Mobile (< 640px) | Full-width toggle row within the active Settings section, matching existing toggle styling |
| Tablet (640-1024px) | Same as mobile — Settings content panel fills available width |
| Desktop (> 1024px) | Toggle in the right content panel of the Settings two-column layout |

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users**: No sound effects play (all trigger points are within auth-gated gamification flows).
- **Logged-in users**: Sound effects play at trigger points. Preference persisted to localStorage.
- **localStorage usage**:
  - `wr_sound_effects_enabled` — `"true"` / `"false"` (string). Default: not set (treated as `true`). Controls whether sound effects play.

## Completion & Navigation

N/A — standalone feature. No Daily Hub completion integration.

## Design Notes

- The Settings toggle should match the existing toggle pattern used in the Settings page for notification preferences (same toggle component, same label/description layout).
- Sound effects are invisible in the UI — no visual indicators, no speaker icons, no waveform displays. The feature is purely auditory.
- The existing `playChime()` utility in `lib/audio.ts` already creates a 528Hz sine wave — the new sound system supersedes this with a more comprehensive, cached approach. The existing function can remain untouched; the new system is additive.
- Sound synthesis uses the same `AudioContext` exposed by the existing `AudioEngineService` / `AudioProvider` system to avoid competing contexts.
- Reference `_plans/recon/design-system.md` for Settings page styling (toggle component styles, section headings, content panel padding).

## Out of Scope

- **Custom volume slider** for sound effects — the fixed volume levels (0.1, 0.15, 0.3) are intentional. A slider adds complexity without proportional value.
- **Per-sound enable/disable** — users can toggle all sound effects on/off; individual sound control is unnecessary at this stage.
- **Audio file loading** — all sounds are programmatic. No MP3/WAV/OGG files, no CDN hosting, no preloading strategies.
- **Sound effects for logged-out users** — all trigger points are auth-gated. No demo-mode sounds.
- **Visual changes** — no animations, celebrations, or feature logic changes. Audio only.
- **Backend integration** — no API endpoints needed. All client-side.
- **Dark mode considerations** — this feature has no visual component to theme.
- **Notification sounds** — browser push notification audio is a separate concern.

## Acceptance Criteria

- [ ] `useSoundEffects` hook exists and returns a `playSoundEffect(soundId: string)` function
- [ ] Hook shares the `AudioContext` from the existing `AudioProvider` / `AudioEngineService` system (no competing audio contexts created)
- [ ] All 6 sounds (`chime`, `ascending`, `harp`, `bell`, `whisper`, `sparkle`) are generated programmatically using Web Audio API oscillators — no external audio files
- [ ] `chime` plays a 528Hz sine wave with 100ms attack, 400ms sustain, 1s exponential decay
- [ ] `ascending` plays 3 notes (396Hz, 528Hz, 660Hz) sequentially 150ms apart
- [ ] `harp` plays a 440Hz triangle wave with 5ms attack, 300ms decay, and chorus effect (second oscillator at 441Hz)
- [ ] `bell` plays a 784Hz sine wave with 10ms attack, 200ms sustain, 1.5s exponential decay
- [ ] `whisper` generates white noise filtered through a bandpass at 800Hz with Q of 2
- [ ] `sparkle` plays two simultaneous sine waves at 1047Hz and 1319Hz with 5ms attack, 100ms decay
- [ ] Sound buffers are cached after first generation (not re-synthesized on every play)
- [ ] Base volume is 0.3 for chime/ascending/harp/bell, 0.15 for whisper, 0.1 for sparkle
- [ ] Badge celebration plays sound matching tier: toast → chime, toast-confetti → chime, special-toast → ascending, full-screen → harp
- [ ] Mood check-in completion plays `chime` when transitioning to verse display phase
- [ ] Streak milestone (7, 14, 30, 60, 90, 180, 365) plays `ascending` only once per milestone (not on re-render)
- [ ] Level up plays `ascending` when level changes
- [ ] `recordActivity` plays `sparkle` when points are awarded
- [ ] Prayer answered plays `harp` when the celebration fires
- [ ] Streak repair success plays `whisper`
- [ ] Evening reflection overlay opening plays `bell`
- [ ] Challenge day completion plays `ascending`
- [ ] Bible book completion plays `bell`
- [ ] Gratitude save plays `chime`
- [ ] "Pray for this" ceremony plays `whisper` alongside the visual ripple
- [ ] Getting started checklist item completion plays `sparkle`
- [ ] Devotional read (Intersection Observer) plays `chime`
- [ ] Settings page has a "Sound Effects" toggle with description "Play subtle sounds on achievements and milestones."
- [ ] Toggle default is on (enabled)
- [ ] Toggle writes to `wr_sound_effects_enabled` in localStorage
- [ ] When toggle is off, no sound effects play
- [ ] When `prefers-reduced-motion: reduce` is active, no sound effects play regardless of toggle state
- [ ] If `AudioContext` is unavailable or sound generation fails, hook fails silently (no error, no prompt)
- [ ] On iOS Safari, if AudioContext is not yet unlocked, sound calls are silent (no error shown)
- [ ] No visual behavior, animations, celebrations, or feature logic is changed — only audio feedback is added
- [ ] No external audio files are loaded — zero additional network requests for sounds
