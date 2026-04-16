# Implementation Plan: Audio-Guided Prayer Sessions

**Spec:** `_specs/audio-guided-prayer-sessions.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/audio-guided-prayer-sessions`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files and Patterns

**Pray Tab (the host for this feature):**
- `frontend/src/components/daily/PrayTabContent.tsx` — Full Pray tab: textarea, chips, prayer gen, KaraokeText, action buttons, ambient auto-play, sound indicator, cross-tab CTAs. New guided prayer section inserts into this file.
- `frontend/src/pages/DailyHub.tsx` — Tab host page. PrayTabContent is mounted always (CSS show/hide). No changes needed to DailyHub itself.

**Audio and TTS infrastructure (reuse):**
- `frontend/src/hooks/useReadAloud.ts` — Speech Synthesis API wrapper. Provides `play(text)`, `pause()`, `resume()`, `stop()`, word boundary tracking via `onboundary`. Returns `{ state, currentWordIndex, play, pause, resume, stop }`.
- `frontend/src/components/daily/KaraokeTextReveal.tsx` — Word-by-word reveal with `msPerWord` timing. Supports `forceComplete`, `onRevealComplete`. Respects `prefers-reduced-motion`.
- `frontend/src/components/daily/KaraokeText.tsx` — Highlights current word during Read Aloud. Used for TTS-synced display.
- `frontend/src/lib/audio.ts` — `playChime()` utility: 528Hz sine wave, 0.5s duration, Web Audio API. Used for silence segment transitions.
- `frontend/src/components/audio/AudioProvider.tsx` — Global audio state. `useAudioState()` for read, `useAudioDispatch()` for mutations.
- `frontend/src/hooks/useScenePlayer.ts` — `loadScene(scene)` loads ambient scene. Auth-gated (has its own auth check). `SCENE_BY_ID` map for lookup. Handles routine interrupts.
- `frontend/src/data/scenes.ts` — `SCENE_PRESETS` array, `SCENE_BY_ID` map. Scenes: `garden-of-gethsemane`, `still-waters`, `midnight-rain`, `ember-and-stone`, `morning-mist`, `the-upper-room`, `starfield`, `mountain-refuge`.

**Completion and activity tracking (extend):**
- `frontend/src/hooks/useCompletionTracking.ts` — Daily completion per practice type. Stores `DailyCompletion` in localStorage key `worship-room-daily-completion`. Has `markPrayComplete()`, `markMeditationComplete(type)`. Needs extension for guided prayer per-session tracking.
- `frontend/src/types/daily-experience.ts` — `MeditationType` union: `'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen' | 'bible-audio'`. `DailyCompletion` interface.
- `frontend/src/types/meditation.ts` — `MeditationSession` interface: `{ id, type: MeditationType, date, durationMinutes, completedAt }`.
- `frontend/src/services/meditation-storage.ts` — `saveMeditationSession(session)`, `getMeditationHistory()`. Writes to `wr_meditation_history`.
- `frontend/src/hooks/useFaithPoints.ts` — `recordActivity(type: ActivityType)`. `ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'readingPlan' | 'meditate' | 'journal'`.

**Accessibility hooks (reuse):**
- `frontend/src/hooks/useFocusTrap.ts` — `useFocusTrap(isActive, onEscape)` returns `containerRef`. Traps Tab/Shift+Tab, Escape triggers `onEscape`. Used by AuthModal, dialogs.
- `frontend/src/hooks/useReducedMotion.ts` — Returns `boolean`. Listens to `prefers-reduced-motion` media query.

**Auth gating pattern:**
- `useAuth()` from `@/hooks/useAuth` for `{ isAuthenticated }`.
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` for `openAuthModal(message)`.
- Pattern: check `isAuthenticated`, if false call `authModal?.openAuthModal('Sign in to ...')` and return early.

**Overlay/modal pattern:**
- Full-screen overlays use `fixed inset-0 z-50` (AuthModal, MoodCheckIn, WelcomeWizard).
- Lock body scroll: `document.body.style.overflow = 'hidden'` on open, restore on close.
- Focus trap via `useFocusTrap(isActive, onEscape)`.

**Test patterns:**
- Tests in `__tests__/` directories colocated with source.
- Provider wrapping: `MemoryRouter`, `AuthProvider` (from `@/contexts/AuthContext`), `ToastProvider`, `AuthModalProvider`.
- Audio system mocked: `vi.mock('@/components/audio/AudioProvider')`, `vi.mock('@/hooks/useScenePlayer')`, `vi.mock('@/hooks/useFaithPoints')`, `vi.mock('@/hooks/useReducedMotion')`.
- See `PrayTabContent.test.tsx` lines 1-80 for the full mock setup pattern.

### Directory Conventions

- Components: `frontend/src/components/daily/` for Daily Hub components
- Hooks: `frontend/src/hooks/`
- Data/constants: `frontend/src/data/` for content data, `frontend/src/constants/` for config
- Types: `frontend/src/types/`
- Services: `frontend/src/services/`
- Tests: `__tests__/` colocated with source files

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Session card click (start session) | Logged-out → auth modal "Sign in to start a guided prayer session" | Step 5 | `useAuth` + `useAuthModal` |
| Green checkmark visibility | Only shown for logged-in users who completed today | Step 5 | `useAuth` for `isAuthenticated` conditional rendering |
| Activity recording on completion | Only recorded for logged-in users | Step 2 | `recordActivity()` already no-ops when not authenticated |
| Meditation history recording | Only recorded for logged-in users | Step 2 | Auth check in `useCompletionTracking` extension |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Session card (meditation pattern) | background | `bg-white` | design-system.md Card (meditation) |
| Session card | border-radius | 12px / `rounded-xl` | design-system.md |
| Session card | border | `1px solid #E5E7EB` / `border border-gray-200` | design-system.md |
| Session card | box-shadow | `shadow-sm` | design-system.md |
| Session card | padding | 16px / `p-4` | spec (uses `p-4` not `p-5`) |
| Session card | hover | `hover:shadow-md` | design-system.md |
| Player background | background-color | `#0D0620` / `bg-hero-dark` | design-system.md |
| Primary CTA button | styles | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Outline button | styles | `border border-white/30 text-white rounded-lg py-3 px-8` | spec (Prayer Wall hero CTA variant on dark bg) |
| Narration text | font | `font-serif italic text-white text-lg sm:text-xl leading-relaxed` (Lora italic) | spec + design-system.md |
| "Amen" heading | font | `font-script text-5xl sm:text-6xl text-white` (Caveat) | spec |
| Section heading | styles | `font-bold text-text-dark text-xl sm:text-2xl` | spec |
| Subheading | styles | `font-serif italic text-text-light text-base` (Lora italic) | spec |
| Duration pill | styles | `bg-gray-100 rounded-full px-2 py-0.5 text-xs text-text-light` | spec (corrected from `bg-white/10`) |
| Progress bar track | styles | `h-1 bg-white/10 rounded-full` | spec |
| Progress bar fill | styles | `bg-primary rounded-full` | spec |
| Time display | styles | `text-xs text-white/40` | spec |
| Play/Pause button | size/styles | 56px / `bg-white/10 rounded-full` | spec |
| Stop button | size/styles | 40px / `bg-white/5 rounded-full` | spec |
| "Be still..." text | styles | `font-serif italic text-white/30 text-xl` | spec |
| Sound indicator | styles | `text-xs text-white/40` | spec |
| Player z-index | z-index | `z-50` (above sticky tab bar z-40) | codebase pattern (AuthModal, MoodCheckIn) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Caveat (`font-script`) is for decorative/branding text — used for "Amen" on completion
- Lora (`font-serif`) is for scripture text and journal prompts — used for narration text in italic
- Inter (`font-sans`) is for all body text, headings, and UI elements
- Meditation cards use `p-4` or `p-5` — spec says `p-4` for these guided prayer cards
- The Pray tab container is `max-w-2xl mx-auto px-4 py-10 sm:py-14` with `BackgroundSquiggle`
- Sound indicator pattern from PrayTabContent (lines 387-412): "Sound: [name]" + "Change" + "Stop" in `text-xs text-subtle-gray`
- Auth modal pattern: `authModal?.openAuthModal('Sign in to ...')` — never gate browsing, only gate starting
- `playChime()` from `@/lib/audio` creates a 528Hz sine wave for 0.5s — no parameters needed
- All full-screen overlays use `fixed inset-0 z-50 bg-hero-dark` and set `document.body.style.overflow = 'hidden'`
- `useCompletionTracking` reads from `worship-room-daily-completion` localStorage key, resets daily

---

## Shared Data Models

### Existing types this spec depends on:

```typescript
// types/daily-experience.ts
export type MeditationType = 'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen' | 'bible-audio'
// Will add: | 'guided-prayer'

export interface DailyCompletion {
  date: string
  pray: boolean
  journal: boolean
  meditate: { completed: boolean; types: MeditationType[] }
  // Will add: guidedPrayer?: string[]
}

// types/meditation.ts
export interface MeditationSession {
  id: string
  type: MeditationType
  date: string
  durationMinutes: number
  completedAt: string
}

// types/dashboard.ts
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'readingPlan' | 'meditate' | 'journal'
```

### New types this spec introduces:

```typescript
// data/guided-prayer-sessions.ts (or types/guided-prayer.ts)
export interface GuidedPrayerSegment {
  type: 'narration' | 'silence'
  text: string            // narration text (empty string for silence)
  durationSeconds: number // expected duration
}

export interface GuidedPrayerSession {
  id: string              // e.g., 'morning-offering'
  title: string           // e.g., 'Morning Offering'
  description: string     // one-sentence summary
  theme: 'peace' | 'comfort' | 'gratitude' | 'forgiveness' | 'strength' | 'healing' | 'morning' | 'evening'
  durationMinutes: 5 | 10 | 15
  icon: string            // Lucide icon name
  completionVerse: {
    reference: string     // e.g., 'Lamentations 3:22-23'
    text: string          // WEB translation
  }
  script: GuidedPrayerSegment[]
}
```

### localStorage keys this spec touches:

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `worship-room-daily-completion` | Both | Extended with `guidedPrayer?: string[]` field for per-session completion |
| `wr_meditation_history` | Write | Records guided prayer sessions as type `'guided-prayer'` |
| `wr_daily_activities` | Write | Records pray activity via `recordActivity('pray')` |
| `wr_faith_points` | Write | Points updated via `recordActivity('pray')` |
| `wr_streak` | Write | Streak updated via `recordActivity('pray')` |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Session cards: horizontally scrollable row (`min-w-[200px]` each, snap scroll). Player: full viewport, transport controls near bottom, progress bar with `mx-4`. Completion CTAs: full-width stacked. |
| Tablet | 640-1024px | Session cards: 2-column grid (`grid-cols-2 gap-3`). Player: full viewport, content in `max-w-lg` container. Completion CTAs: auto-width, centered. |
| Desktop | > 1024px | Session cards: 4-column grid (`grid-cols-4 gap-4`), all 8 visible in 2 rows. Player: full viewport, content in `max-w-xl` container. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Prayer display/input → Guided Prayer section | `mt-12` (~48px) — visual breathing room between primary content and new section | [UNVERIFIED] → To verify: visually compare gap to meditation section on Meditate tab. → If wrong: Adjust to match existing section spacing. |
| Guided Prayer section → Cross-tab CTAs | `mt-8` (~32px) — same gap as existing spacing between sections in Pray tab | codebase inspection (PrayTabContent existing spacing) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The Pray tab (`PrayTabContent.tsx`) is stable and not being modified by another in-progress spec
- [ ] The `useReadAloud` hook works in the test environment (Speech Synthesis may need mocking)
- [ ] `playChime()` from `@/lib/audio` is accessible and tested
- [ ] `useScenePlayer`'s `loadScene()` can be called programmatically (not just from user interaction in AmbientSoundPill)
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from design-system.md reference)
- [ ] All [UNVERIFIED] values are flagged with verification methods

**Decision: `recordActivity('pray')` vs new `'guidedPrayer'` ActivityType:**
The spec says to record as `"guidedPrayer"` activity. However, `guidedPrayer` does not exist in `ActivityType`. Adding it would require changes to 10+ files (types, constants, dashboard checklist, badge engine, tests). Since the spec says it's worth 10 faith points — identical to `pray` — and guided prayer IS prayer, this plan uses `recordActivity('pray')`. This means the "Pray" checklist item is marked complete by either regular prayer generation or guided prayer completion. If the user wants a separate `guidedPrayer` activity type, that's a dashboard architecture change beyond this spec's scope.

**Note: ⚠️ Design system recon captured 2026-03-06.** Phase 2.85 and parts of Phase 2.9 completed since then. Core design tokens (colors, typography, card patterns) are stable. KaraokeTextReveal and animation patterns were verified by reading current source files.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Activity recording type | Use `recordActivity('pray')` | Avoids invasive `ActivityType` changes; spec's 10 pts matches `pray` exactly |
| Per-session completion tracking | Extend `DailyCompletion` with `guidedPrayer?: string[]` | Avoids new localStorage keys; keeps per-session granularity; backwards-compatible (optional field) |
| MeditationType for history | Add `'guided-prayer'` to union | Single type for all 8 sessions; session ID goes in `MeditationSession.id` |
| Player overlay vs route | Overlay within Pray tab (no new route) | Spec requirement: "not a new route" |
| TTS unavailable fallback | Timed KaraokeTextReveal at words/durationSeconds rate | Spec requirement: graceful degradation to visual-only |
| Scene loading for auto-pair | Call `loadScene()` directly (bypass auth check since player is already auth-gated) | Avoids double auth check; player only opens for logged-in users |
| Ambient stop on player close (user-stopped) | Stop ambient only if auto-started by this feature | Spec: "Ambient audio stops if it was auto-started by this feature" |
| Ambient on user navigates away | Leave ambient running (global AudioProvider state) | Spec: "Ambient audio continues (global AudioProvider state)" |
| Player z-index | `z-50` | Above sticky tab bar (`z-40`), same as other full-screen overlays. Below AudioDrawer (`z-[10000]`). |

---

## Implementation Steps

### Step 1: Session Data Model, Types, and Narration Scripts

**Objective:** Create the 8 guided prayer session definitions with complete narration scripts and update types to support guided prayer tracking.

**Files to create/modify:**
- `frontend/src/data/guided-prayer-sessions.ts` — NEW: session definitions + scripts
- `frontend/src/types/guided-prayer.ts` — NEW: `GuidedPrayerSession`, `GuidedPrayerSegment` interfaces
- `frontend/src/types/daily-experience.ts` — MODIFY: add `'guided-prayer'` to `MeditationType`

**Details:**

1. Create `frontend/src/types/guided-prayer.ts`:
```typescript
export type GuidedPrayerTheme = 'peace' | 'comfort' | 'gratitude' | 'forgiveness' | 'strength' | 'healing' | 'morning' | 'evening'

export interface GuidedPrayerSegment {
  type: 'narration' | 'silence'
  text: string
  durationSeconds: number
}

export interface GuidedPrayerSession {
  id: string
  title: string
  description: string
  theme: GuidedPrayerTheme
  durationMinutes: 5 | 10 | 15
  icon: string
  completionVerse: { reference: string; text: string }
  script: GuidedPrayerSegment[]
}
```

2. Create `frontend/src/data/guided-prayer-sessions.ts` with all 8 sessions. Each session must:
   - Have alternating narration and silence segments
   - Use WEB translation for all scripture
   - Follow encouraging, non-authoritative tone ("Scripture encourages us..." not "God is telling you...")
   - Total segment durations ≈ stated `durationMinutes` (±30 seconds)
   - Narration `durationSeconds` based on ~150 words/minute TTS rate

   Theme-to-ambient-scene mapping constant:
   ```typescript
   export const THEME_SCENE_MAP: Record<GuidedPrayerTheme, string> = {
     peace: 'still-waters',
     comfort: 'still-waters',
     gratitude: 'morning-mist',
     morning: 'morning-mist',
     forgiveness: 'garden-of-gethsemane',
     healing: 'garden-of-gethsemane',
     evening: 'starfield',
     strength: 'the-upper-room',
   }
   ```

   Theme-to-icon mapping:
   ```typescript
   export const THEME_ICON_MAP: Record<GuidedPrayerTheme, string> = {
     morning: 'Sunrise',
     evening: 'Moon',
     peace: 'Leaf',
     comfort: 'Heart',
     gratitude: 'Sparkles',
     forgiveness: 'Unlock',
     strength: 'Shield',
     healing: 'HandHeart',
   }
   ```

3. Add `'guided-prayer'` to `MeditationType` in `types/daily-experience.ts`:
   ```typescript
   export type MeditationType =
     | 'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen' | 'bible-audio'
     | 'guided-prayer'
   ```

**The 8 sessions (content requirements):**

| # | ID | Title | Duration | Theme | Key Scripture (WEB) | Segments |
|---|-----|-------|----------|-------|-------------------|----------|
| 1 | `morning-offering` | Morning Offering | 5 min | morning | Lamentations 3:22-23 | ~8-10 |
| 2 | `evening-surrender` | Evening Surrender | 5 min | evening | Psalm 4:8 | ~8-10 |
| 3 | `finding-peace` | Finding Peace | 10 min | peace | Philippians 4:6-7 | ~14-16 |
| 4 | `comfort-in-sorrow` | Comfort in Sorrow | 10 min | comfort | Psalm 34:18 | ~14-16 |
| 5 | `gratitude-prayer` | Gratitude Prayer | 5 min | gratitude | 1 Thessalonians 5:18 | ~8-10 |
| 6 | `forgiveness-release` | Forgiveness Release | 15 min | forgiveness | Matthew 6:14-15 | ~18-22 |
| 7 | `strength-for-today` | Strength for Today | 5 min | strength | Ephesians 6:10-11 | ~8-10 |
| 8 | `healing-prayer` | Healing Prayer | 10 min | healing | Jeremiah 17:14 | ~14-16 |

Each session's `completionVerse` should be a different verse from the key scripture used in narration, thematically matched.

**Auth gating:** N/A (data layer only)

**Responsive behavior:** N/A (data layer only)

**Guardrails (DO NOT):**
- DO NOT use any translation other than WEB (World English Bible) for scripture
- DO NOT use authoritative theological language ("God told me", "God is telling you")
- DO NOT include content that could be triggering (no detailed descriptions of suffering, abuse, etc.)
- DO NOT make segment durations add up to significantly more/less than the stated durationMinutes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 8 sessions exist | unit | `GUIDED_PRAYER_SESSIONS.length === 8` |
| Session IDs are unique | unit | No duplicate IDs |
| Session durations match | unit | Sum of segment durations ≈ durationMinutes × 60 (within 30s) |
| Segments alternate correctly | unit | No two consecutive silence segments |
| Scripture uses WEB | unit | Verify completion verses include "(WEB)" or are from WEB corpus |
| Theme-scene mapping covers all themes | unit | Every theme in the map has a valid scene ID |
| MeditationType includes guided-prayer | unit | Type assertion test |

**Expected state after completion:**
- [ ] 8 complete guided prayer sessions with narration scripts in `data/guided-prayer-sessions.ts`
- [ ] Types defined in `types/guided-prayer.ts`
- [ ] `MeditationType` updated to include `'guided-prayer'`
- [ ] Theme-to-scene and theme-to-icon mappings exported

---

### Step 2: Completion Tracking Extensions

**Objective:** Extend `useCompletionTracking` to support per-session guided prayer completion. No new localStorage keys — extends the existing `DailyCompletion` structure.

**Files to modify:**
- `frontend/src/types/daily-experience.ts` — Add `guidedPrayer?: string[]` to `DailyCompletion`
- `frontend/src/hooks/useCompletionTracking.ts` — Add `markGuidedPrayerComplete(sessionId)` and `completedGuidedPrayerSessions`

**Details:**

1. Extend `DailyCompletion` in `types/daily-experience.ts`:
   ```typescript
   export interface DailyCompletion {
     date: string
     pray: boolean
     journal: boolean
     meditate: { completed: boolean; types: MeditationType[] }
     guidedPrayer?: string[]  // session IDs completed today
   }
   ```

2. Extend `useCompletionTracking` hook:
   - Add `markGuidedPrayerComplete(sessionId: string)` — adds session ID to `guidedPrayer` array, deduplicates
   - Add `completedGuidedPrayerSessions: string[]` — returns the array (or empty array if undefined)
   - Add `isGuidedPrayerComplete(sessionId: string): boolean` — convenience check
   - The `getEmptyCompletion()` function should return `guidedPrayer: []` for new days
   - The `readCompletion()` function should handle missing `guidedPrayer` field gracefully (backwards-compatible)

3. Export `CompletionTracking` interface update:
   ```typescript
   export interface CompletionTracking {
     // ... existing fields ...
     markGuidedPrayerComplete: (sessionId: string) => void
     completedGuidedPrayerSessions: string[]
     isGuidedPrayerComplete: (sessionId: string) => boolean
   }
   ```

**Auth gating:** The `markGuidedPrayerComplete` writes to localStorage unconditionally (same as existing `markPrayComplete`). Auth gating happens at the caller level (the player component only opens for authenticated users).

**Guardrails (DO NOT):**
- DO NOT introduce a new localStorage key — extend the existing `worship-room-daily-completion` key
- DO NOT break backwards compatibility — the `guidedPrayer` field must be optional
- DO NOT modify `readCompletion()` in a way that throws if old data lacks the field

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| markGuidedPrayerComplete adds session ID | unit | After marking, `completedGuidedPrayerSessions` includes the ID |
| Duplicate marking is idempotent | unit | Marking same session twice doesn't create duplicate entries |
| isGuidedPrayerComplete returns correct value | unit | True for completed, false for not completed |
| Daily reset clears guided prayer completions | unit | After date change, `completedGuidedPrayerSessions` is empty |
| Backwards compatibility with old data | unit | Reading old `DailyCompletion` without `guidedPrayer` field returns empty array |
| Multiple sessions can be completed in one day | unit | Completing 3 different sessions results in array of 3 IDs |

**Expected state after completion:**
- [ ] `DailyCompletion` type extended with optional `guidedPrayer` field
- [ ] `useCompletionTracking` returns new methods/state for guided prayer completion
- [ ] Existing completion tracking behavior is unchanged
- [ ] All tests pass

---

### Step 3: useGuidedPrayerPlayer Hook

**Objective:** Create the core playback engine hook that manages segment sequencing, TTS narration, silence timers, progress tracking, ambient auto-pairing, and wake lock.

**Files to create:**
- `frontend/src/hooks/useGuidedPrayerPlayer.ts` — NEW: the playback engine hook

**Details:**

The hook manages the full lifecycle of a guided prayer session playback.

```typescript
interface UseGuidedPrayerPlayerProps {
  session: GuidedPrayerSession | null  // null = player not active
  onComplete: () => void               // called when all segments finish
  onClose: () => void                  // called when user stops/closes
}

interface UseGuidedPrayerPlayerReturn {
  // Playback state
  isPlaying: boolean
  isPaused: boolean
  isComplete: boolean
  currentSegmentIndex: number
  currentSegment: GuidedPrayerSegment | null

  // TTS state
  currentWordIndex: number           // for KaraokeText sync
  ttsAvailable: boolean              // whether Speech Synthesis works

  // Progress
  elapsedSeconds: number
  totalDurationSeconds: number       // sum of all segment durations
  progressPercent: number

  // Controls
  play: () => void                   // start or resume
  pause: () => void
  stop: () => void                   // stops and triggers onClose

  // Ambient state
  autoStartedAmbient: boolean        // whether this session started ambient audio
  ambientSceneName: string | null    // for sound indicator display
}
```

**Core playback logic:**

1. **Initialization** (when `session` becomes non-null):
   - Calculate `totalDurationSeconds` from segment durations
   - Set `currentSegmentIndex = 0`
   - Check TTS availability: `typeof window !== 'undefined' && 'speechSynthesis' in window`
   - Request wake lock: `navigator.wakeLock?.request('screen')` — fail silently
   - Auto-pair ambient sound (see ambient section below)
   - Begin playback of first segment

2. **Narration segment playback:**
   - If TTS available: call `speechSynthesis.speak(utterance)` with `onboundary` for word index tracking. Use a dedicated `SpeechSynthesisUtterance` per segment.
   - If TTS unavailable: use `KaraokeTextReveal` timing (words / durationSeconds = wordsPerSecond, converted to msPerWord)
   - Segment ends when: TTS finishes AND `durationSeconds` elapses (whichever is later)
   - If TTS finishes early: remaining time is brief silence (text stays visible)
   - If TTS runs long: wait for TTS to finish (TTS timing wins)
   - On segment end: advance to next segment

3. **Silence segment playback:**
   - Call `playChime()` from `@/lib/audio`
   - Display "Be still..." text
   - Timer for `durationSeconds`
   - On timer end: advance to next segment

4. **Progress tracking:**
   - `elapsedSeconds` updated every 250ms via `setInterval`
   - Account for TTS overrun: if actual elapsed exceeds scripted total, progress clamps at 100%

5. **Pause/Resume:**
   - Pause: `speechSynthesis.pause()`, pause elapsed timer, ambient continues
   - Resume: `speechSynthesis.resume()`, resume elapsed timer

6. **Stop (user-initiated):**
   - `speechSynthesis.cancel()`
   - Release wake lock
   - If `autoStartedAmbient`: dispatch `STOP_ALL` to AudioProvider
   - Call `onClose()`
   - No activity/completion recording

7. **Completion (all segments finished):**
   - Call `onComplete()` — the parent component handles activity recording
   - Do NOT release wake lock yet (completion screen still showing)
   - Do NOT stop ambient (completion screen still showing)

8. **Cleanup on unmount:**
   - `speechSynthesis.cancel()`
   - Clear all timers
   - Release wake lock

**Ambient auto-pairing:**

```typescript
// Check conditions (same pattern as PrayTabContent handleGenerate):
const shouldAutoPlay =
  !prefersReduced &&
  audioState.activeSounds.length === 0 &&
  !audioState.pillVisible &&
  !audioState.activeRoutine

if (shouldAutoPlay) {
  const sceneId = THEME_SCENE_MAP[session.theme]
  const scene = SCENE_BY_ID.get(sceneId)
  if (scene) {
    // Set volume to 30% before loading
    audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: 0.3 } })
    // Load scene — but bypass useScenePlayer's auth check since player is already auth-gated
    // Use executeSceneLoad-like logic or call loadScene directly (it will work since user is authenticated)
    loadScene(scene)
    setAutoStartedAmbient(true)
    setAmbientSceneName(scene.name)
  }
}
```

**Wake lock:**
```typescript
let wakeLock: WakeLockSentinel | null = null
try {
  wakeLock = await navigator.wakeLock?.request('screen')
} catch { /* fail silently */ }
// Release on cleanup:
wakeLock?.release()
```

**Dependencies (hooks used inside):**
- `useReducedMotion()` — for prefers-reduced-motion check
- `useAudioState()`, `useAudioDispatch()` — for ambient state checks and control
- `useScenePlayer()` — for `loadScene()`

**Auth gating:** N/A (hook is only called from an auth-gated component)

**Guardrails (DO NOT):**
- DO NOT create a new AudioContext — use the existing `playChime()` utility which manages its own context
- DO NOT destroy/recreate AudioContext (matches `AudioEngineService` pattern)
- DO NOT call `speechSynthesis.speak()` without first calling `speechSynthesis.cancel()` to clear queue
- DO NOT use `setInterval` without clearing on unmount — use refs for timer IDs
- DO NOT auto-play ambient if `prefers-reduced-motion` is true
- DO NOT record activity on stop (only on completion)
- DO NOT suppress `onboundary` events — they're needed for KaraokeText sync

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Initializes with correct state | unit | isPlaying false, currentSegmentIndex 0, progress 0 |
| Starts playback on play() | unit | isPlaying becomes true |
| Advances segments sequentially | unit | After segment duration, moves to next segment |
| Pauses and resumes correctly | unit | Pause stops TTS and timer; resume restarts |
| Stop cancels TTS and calls onClose | unit | speechSynthesis.cancel() called, onClose called |
| Calls onComplete when all segments finish | unit | After last segment, onComplete is called |
| No activity recorded on stop | unit | recordActivity NOT called on stop |
| Ambient auto-play when no audio active | unit | loadScene called with correct scene for theme |
| Ambient NOT auto-played when audio active | unit | loadScene NOT called when activeSounds > 0 |
| Ambient NOT auto-played with reduced motion | unit | loadScene NOT called when prefersReduced |
| Wake lock requested on init | unit | navigator.wakeLock.request called |
| Wake lock released on cleanup | unit | wakeLock.release() called on unmount |
| TTS unavailable fallback uses timed reveal | unit | When speechSynthesis unavailable, msPerWord calculated |
| Elapsed seconds tracks correctly | unit | After 5 seconds, elapsedSeconds ≈ 5 |
| Chime plays at start of silence segments | unit | playChime() called when silence segment starts |
| Handles TTS running longer than durationSeconds | unit | Segment doesn't advance until TTS finishes |

**Expected state after completion:**
- [ ] `useGuidedPrayerPlayer` hook created with full playback lifecycle
- [ ] TTS + KaraokeText sync working
- [ ] Silence segments with chime working
- [ ] Progress tracking working
- [ ] Ambient auto-pairing working
- [ ] Wake lock working
- [ ] Cleanup on unmount working

---

### Step 4: GuidedPrayerPlayer Component

**Objective:** Build the full-screen overlay UI for the guided prayer player — the dark-background experience with narration text, progress bar, transport controls, and completion screen.

**Files to create:**
- `frontend/src/components/daily/GuidedPrayerPlayer.tsx` — NEW: the player overlay component

**Details:**

Props:
```typescript
interface GuidedPrayerPlayerProps {
  session: GuidedPrayerSession
  onClose: () => void
  onComplete: () => void
  onJournalAboutThis: () => void    // closes player, switches to Journal tab
  onTryAnother: () => void          // closes player, scrolls to session cards
}
```

**Component structure:**

```
<div ref={containerRef} className="fixed inset-0 z-50 bg-hero-dark">
  {/* Full-screen overlay */}

  {isComplete ? (
    <CompletionView ... />
  ) : (
    <PlaybackView ... />
  )}
</div>
```

**PlaybackView layout (centered flex column):**

```
┌─────────────────────────────────┐
│                                 │
│         [Theme Icon 48/64px]    │
│         Session Title           │
│                                 │
│     Narration text (KaraokeText)│
│     -- or --                    │
│     "Be still..."              │
│                                 │
│   ─────────────────────── (bar) │
│          3:24 / 10:00           │
│                                 │
│       [▶/⏸]    [■ Stop]        │
│                                 │
│     Sound: Morning Mist         │
│     Change · Stop               │
└─────────────────────────────────┘
```

**Key implementation details:**

1. **Body scroll lock:** `document.body.style.overflow = 'hidden'` on mount, restore on unmount.

2. **Focus trap:** `useFocusTrap(true, onClose)` — Escape key closes the player.

3. **Theme icon rendering:** Use dynamic Lucide icon import:
   ```typescript
   import { Sunrise, Moon, Leaf, Heart, Sparkles, Unlock, Shield, HandHeart } from 'lucide-react'
   const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
     Sunrise, Moon, Leaf, Heart, Sparkles, Unlock, Shield, HandHeart,
   }
   const ThemeIcon = ICON_COMPONENTS[session.icon]
   ```

4. **Narration display:**
   - During narration segments: `<KaraokeTextReveal>` for initial reveal OR `<KaraokeText>` for TTS-synced highlighting (depending on TTS availability)
   - If TTS available: use `KaraokeText` with `currentWordIndex` from hook (TTS drives the word reveal via `onboundary`)
   - If TTS unavailable: use `KaraokeTextReveal` with `msPerWord` calculated from segment's word count and `durationSeconds`
   - With `prefers-reduced-motion`: text appears instantly (no animation, `KaraokeTextReveal` handles this internally)
   - Narration text styled: `font-serif italic text-white text-lg sm:text-xl leading-relaxed`

5. **Silence display:**
   - "Be still..." in `font-serif italic text-white/30 text-xl`
   - Fade transition between narration and silence (unless reduced motion, then instant swap)

6. **Progress bar:**
   ```jsx
   <div role="progressbar" aria-valuenow={elapsedSeconds} aria-valuemin={0} aria-valuemax={totalDurationSeconds}
        aria-label={`Session progress: ${formatTime(elapsedSeconds)} of ${formatTime(totalDurationSeconds)}`}
        className="w-full">
     <div className="h-1 bg-white/10 rounded-full overflow-hidden">
       <div className="h-full bg-primary rounded-full transition-[width] duration-250"
            style={{ width: `${progressPercent}%` }} />
     </div>
     <p className="mt-1 text-center text-xs text-white/40">
       {formatTime(elapsedSeconds)} / {formatTime(totalDurationSeconds)}
     </p>
   </div>
   ```

7. **Transport controls:**
   ```jsx
   <div className="flex items-center justify-center gap-6">
     <button onClick={isPlaying ? pause : play}
             className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-primary/50"
             aria-label={isPlaying ? 'Pause' : 'Play'}>
       {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white" />}
     </button>
     <button onClick={stop}
             className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50"
             aria-label="Stop and close">
       <Square className="h-5 w-5 text-white/60" />
     </button>
   </div>
   ```

8. **Sound indicator** (only if ambient was auto-started):
   ```jsx
   {autoStartedAmbient && audioState.activeSounds.length > 0 && (
     <div className="text-center text-xs text-white/40">
       Sound: {ambientSceneName}
       <span className="mx-1 text-white/20">&middot;</span>
       <button onClick={openDrawer} className="text-white/40 underline hover:text-white/60">Change</button>
       <span className="mx-1 text-white/20">&middot;</span>
       <button onClick={stopAmbient} className="text-white/40 underline hover:text-white/60">Stop</button>
     </div>
   )}
   ```

9. **Screen reader announcements:**
   - `aria-live="polite"` region that announces segment transitions: "Narration: [first few words]..." or "Silence: Be still..."

10. **CompletionView:**
    ```
    ┌─────────────────────────────────┐
    │                                 │
    │            Amen                 │   ← font-script text-5xl sm:text-6xl text-white
    │       Session Title             │   ← text-lg text-white/70
    │   X minutes of guided prayer    │   ← text-sm text-white/50
    │                                 │
    │   "Completion verse text..."    │   ← font-serif italic text-white/80
    │      — Reference               │   ← text-xs text-white/40
    │                                 │
    │   [Journal about this]          │   ← bg-primary text-white rounded-lg py-3 px-8 font-semibold
    │   [Try another session]         │   ← border border-white/30 text-white rounded-lg py-3 px-8
    │   Return to Prayer              │   ← text-sm text-white/50 hover:text-white/70 underline
    │                                 │
    └─────────────────────────────────┘
    ```

**Responsive behavior:**
- Mobile (< 640px): Full viewport. Theme icon 48px. Narration text `text-lg`. Progress bar `mx-4`. CTAs full width (`w-full`). Transport controls near bottom with `mb-safe` for safe area.
- Tablet (640-1024px): Content in `max-w-lg mx-auto`. Theme icon 48px. Narration text `text-xl`. CTAs auto-width centered.
- Desktop (> 1024px): Content in `max-w-xl mx-auto`. Theme icon 64px. Narration text `text-xl`. CTAs auto-width centered.

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any content — all text is plain text
- DO NOT forget to restore `document.body.style.overflow` on unmount
- DO NOT render the sound indicator if ambient was not auto-started by this feature
- DO NOT allow tab navigation outside the player (focus trap)
- DO NOT forget `aria-live` region for segment transitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders full-screen overlay with dark background | integration | `bg-hero-dark` and `fixed inset-0` classes present |
| Shows session title and theme icon | integration | Title text and icon visible |
| Shows narration text during narration segment | integration | Narration text from script displayed |
| Shows "Be still..." during silence segment | integration | "Be still..." text visible |
| Play/Pause button toggles state | integration | Click toggles between Play and Pause icons |
| Stop button closes player | integration | Click calls onClose |
| Escape key closes player | integration | Pressing Escape calls onClose |
| Progress bar has correct ARIA attributes | integration | `role="progressbar"`, `aria-valuenow`, etc. |
| Completion screen shows "Amen" | integration | After all segments, "Amen" text visible |
| Completion screen shows verse | integration | Completion verse text and reference displayed |
| "Journal about this" CTA calls handler | integration | Click calls onJournalAboutThis |
| "Try another session" CTA calls handler | integration | Click calls onTryAnother |
| "Return to Prayer" CTA calls handler | integration | Click calls onClose |
| Sound indicator shown when ambient auto-started | integration | "Sound: [name]" text visible |
| Sound indicator hidden when no ambient | integration | No "Sound:" text when ambient not auto-started |
| Focus is trapped within player | integration | Tab cycles within player controls only |
| Body scroll is locked while player is open | integration | `document.body.style.overflow` is 'hidden' |

**Expected state after completion:**
- [ ] Full-screen player overlay renders correctly on dark background
- [ ] Narration text displays with KaraokeText/KaraokeTextReveal
- [ ] Silence segments show "Be still..." with chime
- [ ] Progress bar updates in real-time
- [ ] Transport controls (Play/Pause, Stop) work
- [ ] Completion screen with "Amen", verse, and CTAs
- [ ] Sound indicator displays when ambient auto-started
- [ ] Focus trap and Escape key work
- [ ] Body scroll locked while open

---

### Step 5: GuidedPrayerSection Component + PrayTabContent Integration

**Objective:** Create the session card grid component and integrate it into the Pray tab between the prayer area and cross-tab CTAs.

**Files to create/modify:**
- `frontend/src/components/daily/GuidedPrayerSection.tsx` — NEW: session card grid with heading
- `frontend/src/components/daily/PrayTabContent.tsx` — MODIFY: add GuidedPrayerSection + GuidedPrayerPlayer

**Details:**

**GuidedPrayerSection component:**

Props:
```typescript
interface GuidedPrayerSectionProps {
  onStartSession: (session: GuidedPrayerSession) => void
}
```

Layout:
```
<section aria-labelledby="guided-prayer-heading" id="guided-prayer-section">
  <h2 id="guided-prayer-heading" className="font-bold text-text-dark text-xl sm:text-2xl">
    Guided Prayer Sessions
  </h2>
  <p className="mt-1 font-serif italic text-text-light text-base">
    Close your eyes and let God lead
  </p>

  {/* Card grid */}
  <div className={/* responsive classes */}>
    {GUIDED_PRAYER_SESSIONS.map(session => (
      <SessionCard key={session.id} session={session} onStart={onStartSession} />
    ))}
  </div>
</section>
```

**Session card responsive layout:**
- Mobile (< 640px): `flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4` — horizontal scroll with snap. Each card: `min-w-[200px] flex-shrink-0 snap-center`.
- Tablet (sm to lg): `grid grid-cols-2 gap-3`
- Desktop (lg+): `grid grid-cols-4 gap-4`

Implementation: use `sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4` for the grid, with the mobile scroll as the default (no prefix).

**Session card:**
```jsx
<button
  type="button"
  onClick={() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a guided prayer session')
      return
    }
    onStart(session)
  }}
  className="relative rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  {/* Completion checkmark (top-right) */}
  {isAuthenticated && isComplete && (
    <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-success" aria-hidden="true" />
  )}

  {/* Theme icon */}
  <ThemeIcon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />

  {/* Title */}
  <h3 className="font-medium text-sm text-text-dark">{session.title}</h3>

  {/* Description */}
  <p className="mt-1 text-xs text-text-light line-clamp-2">{session.description}</p>

  {/* Duration pill */}
  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-light">
    {session.durationMinutes} min
  </span>
</button>
```

**PrayTabContent integration:**

Add the guided prayer section and player to `PrayTabContent.tsx`:

1. Import `GuidedPrayerSection`, `GuidedPrayerPlayer`, `GUIDED_PRAYER_SESSIONS`, types.
2. Add state:
   ```typescript
   const [activeSession, setActiveSession] = useState<GuidedPrayerSession | null>(null)
   ```
3. Add handlers:
   ```typescript
   const handleStartSession = (session: GuidedPrayerSession) => {
     setActiveSession(session)
   }

   const handleSessionComplete = () => {
     // Record activity
     recordActivity('pray')
     markGuidedPrayerComplete(activeSession!.id)

     // Save to meditation history
     saveMeditationSession({
       id: `guided-prayer-${activeSession!.id}-${Date.now()}`,
       type: 'guided-prayer',
       date: getLocalDateString(new Date()),
       durationMinutes: activeSession!.durationMinutes,
       completedAt: new Date().toISOString(),
     })
   }

   const handlePlayerClose = () => {
     setActiveSession(null)
   }

   const handleJournalFromSession = () => {
     setActiveSession(null)
     onSwitchToJournal?.(activeSession!.theme)
   }

   const handleTryAnother = () => {
     setActiveSession(null)
     // Scroll to guided prayer section
     document.getElementById('guided-prayer-section')?.scrollIntoView({ behavior: 'smooth' })
   }
   ```

4. Position in the JSX:
   - The `GuidedPrayerSection` goes AFTER the prayer display/input area and BEFORE the existing cross-tab CTAs ("Journal about this →" / "Pray about something else").
   - It should always be visible (not hidden behind prayer state).
   - Add a `mt-12` spacer above the section for visual separation.

   In the JSX, after the existing input section and prayer display:
   ```jsx
   {/* Guided Prayer Sessions — always visible */}
   <div className="mt-12">
     <GuidedPrayerSection onStartSession={handleStartSession} />
   </div>

   {/* Player overlay (portal-like, rendered at component level) */}
   {activeSession && (
     <GuidedPrayerPlayer
       session={activeSession}
       onClose={handlePlayerClose}
       onComplete={handleSessionComplete}
       onJournalAboutThis={handleJournalFromSession}
       onTryAnother={handleTryAnother}
     />
   )}
   ```

   Note: The `GuidedPrayerPlayer` is rendered within PrayTabContent's JSX tree but uses `fixed inset-0 z-50` positioning, so it visually escapes the component's layout and covers the full viewport. This is the same pattern used by AuthModal and MoodCheckIn.

5. Add imports:
   ```typescript
   import { GuidedPrayerSection } from '@/components/daily/GuidedPrayerSection'
   import { GuidedPrayerPlayer } from '@/components/daily/GuidedPrayerPlayer'
   import { saveMeditationSession } from '@/services/meditation-storage'
   import { getLocalDateString } from '@/utils/date'
   ```

**Auth gating:**
- Session card click: `isAuthenticated` check + auth modal for logged-out users (in GuidedPrayerSection)
- Green checkmark: Only rendered when `isAuthenticated` (in GuidedPrayerSection)
- Player: Only renders when `activeSession` is non-null, which only happens after auth check passes

**Responsive behavior:**
- Session cards: scroll on mobile, 2-col on tablet, 4-col on desktop (described above)
- Player: Full viewport on all sizes (described in Step 4)
- Section heading and subheading: standard text sizing per spec

**Guardrails (DO NOT):**
- DO NOT remove or modify the existing prayer generation flow
- DO NOT modify the CrisisBanner, AmbientSoundPill, or cross-tab CTAs
- DO NOT gate browsing the session cards — only gate starting a session
- DO NOT introduce new routes — the player is an overlay, not a page
- DO NOT break the existing `PrayTabContent` state management (prayer, text, chips, etc.)
- DO NOT forget the scroll indicator visual cue for the mobile horizontal scroll (the cards naturally overflow and the horizontal scroll is discoverable via snap)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GuidedPrayerSection renders 8 session cards | integration | 8 buttons with correct titles rendered |
| Session cards show correct icons, titles, descriptions, durations | integration | Content matches session data |
| Duration pills show "5 min", "10 min", "15 min" | integration | Correct text in pill elements |
| Logged-out user sees all cards | integration | Cards visible without auth |
| Logged-out user clicking card triggers auth modal | integration | openAuthModal called with correct message |
| Logged-in user clicking card opens player | integration | activeSession set, player renders |
| Green checkmark shows for completed sessions | integration | CheckCircle2 visible for completed session IDs |
| Green checkmark hidden for logged-out users | integration | No checkmarks when not authenticated |
| Section heading and subheading render correctly | integration | "Guided Prayer Sessions" and "Close your eyes and let God lead" visible |
| Mobile layout: cards in scrollable row | integration | Correct flex/scroll classes at mobile viewport |
| Tablet layout: 2-column grid | integration | Correct grid classes |
| Desktop layout: 4-column grid | integration | Correct grid classes |
| Cards have minimum 44px touch target | integration | Card height >= 44px via padding |
| Player opens within PrayTabContent | integration | Player overlay renders when session selected |
| Activity recorded on completion | integration | recordActivity('pray') called |
| Meditation history saved on completion | integration | saveMeditationSession called with type 'guided-prayer' |
| Guided prayer completion tracked | integration | markGuidedPrayerComplete called with session ID |
| Player closes on "Return to Prayer" | integration | activeSession set to null |
| "Journal about this" switches to journal tab | integration | onSwitchToJournal called with theme |
| "Try another session" scrolls to section | integration | scrollIntoView called on section element |
| Existing prayer generation flow unchanged | integration | Generate Prayer button still works |

**Expected state after completion:**
- [ ] Session cards display on the Pray tab below prayer area
- [ ] Auth gating works correctly (browse without login, start requires login)
- [ ] Player opens when authenticated user clicks a card
- [ ] Completion recording works (faith points, meditation history, completion tracking)
- [ ] All 3 completion CTAs work (journal, try another, return)
- [ ] No regressions to existing Pray tab functionality

---

### Step 6: Data and Completion Tracking Tests

**Objective:** Write unit tests for the session data model, type correctness, and completion tracking extensions.

**Files to create:**
- `frontend/src/data/__tests__/guided-prayer-sessions.test.ts` — NEW
- `frontend/src/hooks/__tests__/useCompletionTracking-guided-prayer.test.ts` — NEW

**Details:**

**Session data tests (`guided-prayer-sessions.test.ts`):**
- All 8 sessions exist with correct IDs
- No duplicate session IDs
- Each session has valid theme, icon, durationMinutes
- Each session's script has at least 2 segments
- No two consecutive silence segments in any script
- Sum of segment durations ≈ durationMinutes × 60 (within 30 seconds)
- All completion verses have non-empty reference and text
- Theme-scene mapping covers all 8 themes
- All scene IDs in the mapping exist in `SCENE_BY_ID`
- Theme-icon mapping covers all 8 themes

**Completion tracking tests (`useCompletionTracking-guided-prayer.test.ts`):**
- Setup: `renderHook(() => useCompletionTracking())` with `MemoryRouter` wrapper
- Test `markGuidedPrayerComplete(sessionId)` adds to array
- Test deduplication (marking same session twice)
- Test `isGuidedPrayerComplete(sessionId)` correctness
- Test `completedGuidedPrayerSessions` returns correct array
- Test daily reset (change date, array clears)
- Test backwards compatibility (old data without `guidedPrayer` field)
- Test multiple sessions completed in one day

**Guardrails (DO NOT):**
- DO NOT skip testing the backwards-compatibility case — this prevents breaking existing users
- DO NOT hardcode session IDs in tests — import from the data file and test structurally

**Expected state after completion:**
- [ ] Data model tests passing
- [ ] Completion tracking tests passing
- [ ] All edge cases covered (deduplication, daily reset, backwards compat)

---

### Step 7: Player Hook Tests

**Objective:** Write unit tests for the `useGuidedPrayerPlayer` hook covering playback lifecycle, TTS, timers, ambient, and wake lock.

**Files to create:**
- `frontend/src/hooks/__tests__/useGuidedPrayerPlayer.test.ts` — NEW

**Details:**

**Mock setup:**
- Mock `window.speechSynthesis` with `speak`, `cancel`, `pause`, `resume`
- Mock `SpeechSynthesisUtterance` with `onboundary`, `onend`, `onerror` callbacks
- Mock `navigator.wakeLock` with `request` returning `{ release: vi.fn() }`
- Mock `@/lib/audio` `playChime`
- Mock `@/components/audio/AudioProvider` (useAudioState, useAudioDispatch)
- Mock `@/hooks/useScenePlayer` (loadScene)
- Mock `@/hooks/useReducedMotion`
- Use `vi.useFakeTimers()` for timer control

**Test cases:**
1. **Initialization:** Hook returns idle state when session is null
2. **Start playback:** play() sets isPlaying to true, starts TTS for first narration segment
3. **Segment sequencing:** After first segment duration, advances to next segment
4. **Narration → silence transition:** TTS stops, chime plays, "Be still..." state
5. **Silence → narration transition:** New TTS utterance created, word index resets
6. **Pause/resume:** Pausing stops timer and TTS, resuming restarts both
7. **Stop:** Cancels TTS, releases wake lock, calls onClose
8. **Completion:** After last segment, calls onComplete, isComplete becomes true
9. **Ambient auto-play:** When no audio active, loadScene called with correct scene
10. **Ambient skipped:** When audio already active, loadScene NOT called
11. **Ambient skipped with reduced motion:** loadScene NOT called
12. **Wake lock:** Requested on init, released on cleanup
13. **TTS unavailable:** ttsAvailable is false, msPerWord calculated correctly
14. **TTS finishes early:** Timer still runs for remaining durationSeconds
15. **TTS runs long:** Segment waits for TTS to finish
16. **Progress tracking:** elapsedSeconds increases over time
17. **Cleanup on unmount:** TTS cancelled, timers cleared, wake lock released

**Guardrails (DO NOT):**
- DO NOT test actual audio playback — mock everything
- DO NOT use real timers — use `vi.useFakeTimers()` for predictable tests

**Expected state after completion:**
- [ ] All hook lifecycle tests passing
- [ ] TTS interaction tests passing
- [ ] Timer/progress tests passing
- [ ] Ambient and wake lock tests passing

---

### Step 8: Component Tests (Player, Section, Integration)

**Objective:** Write component-level integration tests for the player overlay, session card grid, and the full PrayTabContent integration.

**Files to create:**
- `frontend/src/components/daily/__tests__/GuidedPrayerPlayer.test.tsx` — NEW
- `frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx` — NEW
- Update existing `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` with new tests

**Details:**

**Provider wrapping pattern** (follow PrayTabContent.test.tsx):
```typescript
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            {ui}
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**GuidedPrayerPlayer.test.tsx:**
- Mock `useGuidedPrayerPlayer` hook to control playback state
- Test: renders dark full-screen overlay
- Test: shows session title and theme icon
- Test: shows narration text during narration segment
- Test: shows "Be still..." during silence
- Test: Play/Pause button toggles
- Test: Stop button calls onClose
- Test: Escape key calls onClose (focus trap)
- Test: completion screen shows "Amen" and verse
- Test: CTAs call correct handlers
- Test: progress bar has correct ARIA attributes
- Test: sound indicator conditionally renders
- Test: focus is trapped within player

**GuidedPrayerSection.test.tsx:**
- Test: renders 8 session cards
- Test: card content matches session data (title, description, duration, icon)
- Test: logged-out click triggers auth modal
- Test: logged-in click calls onStartSession
- Test: green checkmarks for completed sessions (logged-in)
- Test: no checkmarks when logged-out
- Test: cards have accessible names
- Test: cards meet 44px minimum touch target

**PrayTabContent.test.tsx updates:**
- Test: Guided Prayer Section renders within Pray tab
- Test: Section appears below prayer input/display area
- Test: Player opens when session card clicked (authenticated)
- Test: Player closes on "Return to Prayer"
- Test: Existing prayer flow unaffected (no regression)

**Guardrails (DO NOT):**
- DO NOT test TTS or actual audio in component tests — mock the hook
- DO NOT skip auth gating tests — they are mandatory per spec
- DO NOT break existing PrayTabContent tests when adding new ones

**Expected state after completion:**
- [ ] All component tests passing
- [ ] Auth gating tested for logged-in and logged-out
- [ ] Accessibility attributes tested (ARIA, focus trap, keyboard)
- [ ] No regressions in existing PrayTabContent tests
- [ ] Full test suite passes with `pnpm test`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Session data model, types, narration scripts |
| 2 | 1 | Completion tracking extensions (uses MeditationType from Step 1) |
| 3 | 1 | Player hook (uses session data types from Step 1) |
| 4 | 1, 3 | Player component (uses hook from Step 3, types from Step 1) |
| 5 | 1, 2, 4 | Section + integration (uses all above) |
| 6 | 1, 2 | Data + completion tracking tests |
| 7 | 3 | Player hook tests |
| 8 | 4, 5 | Component tests |

**Parallelizable:** Steps 2 and 3 can run in parallel (both depend only on Step 1). Steps 6 and 7 can run in parallel. But for serial execution, the order 1→2→3→4→5→6→7→8 is recommended.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Session data model, types, narration scripts | [COMPLETE] | 2026-03-22 | Created `types/guided-prayer.ts`, `data/guided-prayer-sessions.ts` (8 sessions, all within 30s of target). Added `'guided-prayer'` to `MeditationType`. Updated `MeditationHistory.tsx` colors/labels/allTypes for new type. |
| 2 | Completion tracking extensions | [COMPLETE] | 2026-03-22 | Extended `DailyCompletion` with `guidedPrayer?: string[]`. Added `markGuidedPrayerComplete`, `completedGuidedPrayerSessions`, `isGuidedPrayerComplete` to hook. All 9 existing tests pass. |
| 3 | useGuidedPrayerPlayer hook | [COMPLETE] | 2026-03-22 | Created `hooks/useGuidedPrayerPlayer.ts` with full playback lifecycle, TTS sync, silence+chime, progress tracking, ambient auto-pairing, wake lock, cleanup. |
| 4 | GuidedPrayerPlayer component | [COMPLETE] | 2026-03-22 | Created `components/daily/GuidedPrayerPlayer.tsx` with playback view (narration/silence), completion view (Amen, verse, CTAs), progress bar, transport controls, sound indicator, focus trap, body scroll lock, aria-live. |
| 5 | GuidedPrayerSection + PrayTabContent integration | [COMPLETE] | 2026-03-22 | Created `GuidedPrayerSection.tsx` with session card grid (horizontal scroll mobile, 2-col tablet, 4-col desktop). Integrated into `PrayTabContent.tsx` with state, handlers, player overlay. All 30 existing tests pass. |
| 6 | Data + completion tracking tests | [COMPLETE] | 2026-03-22 | Created `data/__tests__/guided-prayer-sessions.test.ts` (10 tests) and `hooks/__tests__/useCompletionTracking-guided-prayer.test.ts` (10 tests). All 20 pass. |
| 7 | Player hook tests | [COMPLETE] | 2026-03-22 | Created `hooks/__tests__/useGuidedPrayerPlayer.test.ts` (22 tests). All pass. Covers playback lifecycle, TTS, timers, ambient, wake lock, cleanup. |
| 8 | Component tests (player, section, integration) | [COMPLETE] | 2026-03-22 | Created `GuidedPrayerPlayer.test.tsx` (22 tests), `GuidedPrayerSection.test.tsx` (12 tests). Added 4 integration tests to `PrayTabContent.test.tsx`. Total: 38 new tests, all pass. Full suite: 3338 pass, 15 pre-existing BibleReader failures. |
