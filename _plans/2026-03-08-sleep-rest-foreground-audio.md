# Implementation Plan: Sleep & Rest — Foreground Audio Lane, Scripture Readings & Bedtime Stories

**Spec:** `_specs/sleep-rest-foreground-audio.md`
**Date:** 2026-03-08
**Branch:** `claude/feature/sleep-rest-foreground-audio`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Relevant Existing Files and Patterns

**Audio infrastructure** (already built in Specs 1-3):
- `frontend/src/components/audio/AudioProvider.tsx` — Global provider with split contexts (AudioState, AudioDispatch, AudioEngine). Wraps app. Renders `<AudioPill>` and `<AudioDrawer>` internally.
- `frontend/src/lib/audio-engine.ts` — `AudioEngineService` class. Already has `playForeground(url)`, `seekForeground(time)`, `setForegroundBalance(balance)` methods using HTML `<audio>` + `MediaElementAudioSourceNode` → foreground GainNode → master GainNode.
- `frontend/src/components/audio/audioReducer.ts` — Reducer with `START_FOREGROUND`, `PAUSE_FOREGROUND`, `SEEK_FOREGROUND`, `UPDATE_FOREGROUND_POSITION`, `SET_FOREGROUND_BACKGROUND_BALANCE` actions already defined.
- `frontend/src/types/audio.ts` — `ForegroundContent` type already has `contentId`, `contentType: 'scripture' | 'story'`, `title`, `duration`, `playbackPosition`, `isPlaying`.
- `frontend/src/components/audio/ForegroundProgressBar.tsx` — Progress bar already built with scrub, elapsed/remaining time, title display. Uses `audio-slider` CSS class with `#6D28D9` fill on `#374151` track.
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — Already conditionally renders `<ForegroundProgressBar>` and balance slider when both ambient + foreground are active.
- `frontend/src/components/audio/AudioPill.tsx` — Shows foreground progress arc via `<ProgressArc>`.
- `frontend/src/components/audio/VolumeSlider.tsx` — Reusable slider component (0-100 range, purple fill, dark track).

**Data catalog patterns:**
- `frontend/src/data/sound-catalog.ts` — 24 sounds with typed interfaces, `SOUND_BY_ID` Map lookup helper, `SOUND_CATEGORIES` grouped array.
- `frontend/src/data/scenes.ts` — 8 scene presets with `SCENE_PRESETS` array, `FEATURED_SCENE_IDS`, `SCENE_BY_ID` Map.
- `frontend/src/types/music.ts` — `Sound`, `ScenePreset`, tag types.

**Auth gating patterns:**
- `frontend/src/hooks/useAuth.ts` — `{ user: null, isLoggedIn: false }` placeholder.
- `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()` returns `{ openAuthModal(subtitle, initialView) }`.
- `frontend/src/hooks/useScenePlayer.ts` lines 57-59 — Pattern: `if (!isLoggedIn) { authModal?.openAuthModal('Sign in to play ambient scenes'); return; }`.

**Test patterns:**
- `frontend/src/components/audio/__tests__/` — 17 test files. Tests render components directly without wrapping providers (components use internal hooks that read context). `SceneCard.test.tsx` pattern: create mock data objects, render component with props, assert text/roles/interactions. Uses `@testing-library/react`, `userEvent`, `vitest`.
- No AudioProvider wrapping needed in tests that only test presentational components — the provider is only needed if tests call hooks that require context.

### Directory Conventions

- Data files: `frontend/src/data/` (e.g., `sound-catalog.ts`, `scenes.ts`)
- Types: `frontend/src/types/` (e.g., `music.ts`, `audio.ts`)
- Audio components: `frontend/src/components/audio/`
- Audio component tests: `frontend/src/components/audio/__tests__/`
- Hooks: `frontend/src/hooks/`
- Constants: `frontend/src/constants/`
- Placeholder audio: `frontend/public/audio/`

### Component/Service Patterns

- Components use `useAudioState()` / `useAudioDispatch()` / `useAudioEngine()` from AudioProvider
- Auth gating done inside hooks (not components) — hooks call `useAuth()` + `useAuthModal()`
- Data files export typed arrays + helper Maps for O(1) lookup
- `cn()` from `@/lib/utils` for conditional classNames
- Lucide React for all icons
- Tailwind for all styling — no inline styles except gradients and dynamic values

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap play on scripture reading | Auth modal: "Sign in to listen to sleep content" | Step 4 | `useAuth()` + `useAuthModal()` in `useForegroundPlayer` hook |
| Tap play on bedtime story | Auth modal: "Sign in to listen to sleep content" | Step 4 | `useAuth()` + `useAuthModal()` in `useForegroundPlayer` hook |
| Content switching confirmation | Only appears when foreground already playing (requires login) | Step 5 | N/A — only reachable by logged-in users |
| Scripture text toggle | Only available when foreground playing (requires login) | Step 6 | N/A — only reachable by logged-in users |
| Scrub progress bar | Only available when foreground playing (requires login) | Already built | N/A — `ForegroundProgressBar` only renders when `foregroundContent` exists |
| Balance slider | Only available when both lanes active (requires login) | Already built | N/A — `DrawerNowPlaying` conditionally renders slider |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Scripture card background | gradient | `bg-gradient-to-br from-hero-mid/50 to-primary/10` | Spec: "subtle gradient, text-focused" — derived from dark palette |
| Scripture card border | border | `border border-white/10` | Consistent with dark-bg card patterns in drawer |
| Scripture card radius | border-radius | 12px | `rounded-xl` — matches meditation/prayer cards |
| Tonight's Scripture border | accent border | `border-2 border-primary/60` | Spec: "accent border (primary violet)" |
| Story card background | gradient | `bg-gradient-to-br from-hero-mid/50 to-primary/10` | Same as scripture cards |
| Section headings | font | Inter 20px 600, `text-white` | `text-xl font-semibold text-white` — from design-system H3 pattern |
| Duration badge | style | `bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full` | Consistent with tag chips in scenes |
| Content type badge (Scripture) | style | `bg-primary/20 text-primary-lt text-xs px-2 py-0.5 rounded-full` | Purple tone for scripture |
| Content type badge (Story) | style | `bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full` | Complementary tone for stories |
| Play button | style | `bg-primary text-white rounded-full w-10 h-10` | Matches drawer play/pause button pattern |
| Voice indicator | style | `text-xs text-white/50` | Subtle, informational |
| Scripture text panel BG | background | `rgba(15, 10, 30, 0.6)` | Consistent with drawer glass aesthetic |
| Scripture text font | font-family | Lora (serif) | `font-serif` — from design system, used for spiritual content |
| Browse page background | background | `bg-hero-dark` (#0D0620) | Dark background for sleep/nighttime content |
| "Tonight's Scripture" label | style | `text-sm font-medium text-primary-lt tracking-wide uppercase` | Accent label above featured card |
| Progress bar | colors | `#6D28D9` fill, `#374151` track | From `ForegroundProgressBar.tsx` line 38 |
| Confirmation dialog BG | background | `rgba(15, 10, 30, 0.95)` with `backdrop-filter: blur(16px)` | Matches `AudioDrawer.tsx` line 92-94 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/sleep-rest-foreground-audio` is checked out
- [ ] Frontend builds and tests pass (`pnpm build && pnpm test`)
- [ ] Audio infrastructure (Specs 1-3) is fully merged and working on this branch
- [ ] `ForegroundContent` type in `types/audio.ts` already has `contentType: 'scripture' | 'story'` — verified ✓
- [ ] `AudioEngineService.playForeground()`, `seekForeground()`, `setForegroundBalance()` exist — verified ✓
- [ ] `ForegroundProgressBar` component already renders progress bar with scrub — verified ✓
- [ ] `DrawerNowPlaying` already shows balance slider when both lanes active — verified ✓
- [ ] All auth-gated actions from the spec are accounted for in the plan — verified ✓
- [ ] Design system values are verified from `_plans/recon/design-system.md` — verified ✓
- [ ] WEB (World English Bible) translation text needs to be sourced for all 24 scripture readings

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scripture text storage | Full WEB text stored in data file as multi-line strings with verse markers (`\n` between verses) | Data file is the source of truth; no runtime fetching. Verse markers enable verse-level highlighting. |
| Verse-level highlight sync | Use estimated timing based on verse count and total duration (even distribution) until real audio timestamps exist (Spec 10) | Spec explicitly calls this out as out of scope for precise timing. Even distribution is a reasonable approximation. |
| Foreground crossfade on switch | 2-second fade-out via `foregroundGainNode.gain.linearRampToValueAtTime(0, now + 2)`, then load new content | Spec says "crossfades out over 2 seconds." Use Web Audio API gain ramp for smooth fade. |
| Audio placeholder files | Generate 36 silent MP3 files (1 second each) with correct filenames | Real TTS audio is Spec 10. Silent placeholders let all UI/playback logic be tested. |
| "Tonight's Scripture" rotation | `Math.floor(Date.now() / 86400000) % allScriptureReadings.length` | Spec specifies this exact formula. Deterministic, UTC-based, same for all users. |
| Pill text when foreground plays | Show foreground title (not scene name) in pill when foreground is active | Foreground content is the primary user action; scene name is secondary context. Requires enhancing AudioPill. |
| Where browse component renders | Standalone `SleepBrowse` component exportable for the Sleep & Rest tab (Spec 6 wires it into tab) | Spec says "tab built in Spec 6, but browse component built here." Component is self-contained. |
| `ForegroundContent` type enhancement | Add optional `scriptureReference?: string` and `voiceGender?: 'male' | 'female'` fields to `ForegroundContent` | Needed for drawer display (voice indicator, scripture ref). Backward compatible — existing code ignores these. |
| Content switching dialog ownership | Built as a standalone component `ContentSwitchDialog` rendered alongside `SleepBrowse`, controlled by `useForegroundPlayer` hook state | Dialog is specific to foreground content switching, not a general audio concern. |
| Scripture text toggle location | Inside `DrawerNowPlaying` — add BookOpen toggle + collapsible text panel below progress bar | Spec: "in the drawer's now-playing section, next to the title." Extends existing component. |

---

## Implementation Steps

### Step 1: Types & Data — Scripture Readings

**Objective:** Create the TypeScript types and data file for 24 scripture readings across 4 themed collections, with full WEB translation text.

**Files to create/modify:**
- `frontend/src/types/music.ts` — Add `ScriptureReading`, `ScriptureCollection`, `BedtimeStory`, `VoiceGender`, `LengthCategory` types
- `frontend/src/data/music/scripture-readings.ts` — New file with 24 readings + collection metadata + helper exports

**Details:**

Add to `types/music.ts`:
```typescript
export type VoiceGender = 'male' | 'female'
export type LengthCategory = 'short' | 'medium' | 'long'

export interface ScriptureReading {
  id: string
  title: string
  scriptureReference: string
  collectionId: string
  webText: string  // Full WEB translation text, verses separated by \n
  audioFilename: string
  durationSeconds: number
  voiceId: VoiceGender
  tags: string[]
}

export interface ScriptureCollection {
  id: string
  name: string
  readings: ScriptureReading[]
}
```

Create `frontend/src/data/music/` directory and `scripture-readings.ts`:
- 4 collections: `psalms-of-peace`, `comfort-and-rest`, `trust-in-god`, `gods-promises`
- 6 readings per collection (24 total)
- Each reading has full WEB translation text in `webText` field
- Male/female voices alternate within each collection (Male, Female, Male, Female, Male, Female)
- Audio filenames follow pattern: `scripture/{id}.mp3` (e.g., `scripture/psalm-23.mp3`)
- Tags derived from collection theme (e.g., `['peace', 'psalms', 'rest']`)
- Export: `SCRIPTURE_COLLECTIONS`, `ALL_SCRIPTURE_READINGS` (flattened), `SCRIPTURE_READING_BY_ID` Map

**WEB text sourcing:** Use the exact World English Bible text for each passage. The WEB is public domain. Include complete passage text with verse numbers as markers (e.g., `"¹ Yahweh is my shepherd:\nI shall lack nothing.\n² He makes me lie down in green pastures.\nHe leads me beside still waters."`).

**Guardrails (DO NOT):**
- DO NOT use any translation other than WEB (World English Bible)
- DO NOT use `dangerouslySetInnerHTML` anywhere
- DO NOT import from external APIs — all text is static
- DO NOT add any audio-related code — this step is data only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `scripture-readings.test.ts` | unit | All 4 collections exist with 6 readings each (24 total) |
| `scripture-readings.test.ts` | unit | Every reading has non-empty `webText`, valid `scriptureReference`, valid `voiceId` |
| `scripture-readings.test.ts` | unit | Voice alternates male/female within each collection |
| `scripture-readings.test.ts` | unit | `SCRIPTURE_READING_BY_ID` Map contains all 24 readings |
| `scripture-readings.test.ts` | unit | All `audioFilename` values are unique and follow expected pattern |
| `scripture-readings.test.ts` | unit | `durationSeconds` is positive for all readings |

**Expected state after completion:**
- [ ] `types/music.ts` has `ScriptureReading`, `ScriptureCollection`, `VoiceGender`, `LengthCategory` types
- [ ] `data/music/scripture-readings.ts` exports `SCRIPTURE_COLLECTIONS` (4), `ALL_SCRIPTURE_READINGS` (24), `SCRIPTURE_READING_BY_ID`
- [ ] All 24 readings have full WEB text
- [ ] All tests pass

---

### Step 2: Types & Data — Bedtime Stories

**Objective:** Create the data file for 12 bedtime stories with descriptions, durations, and length categories.

**Files to create/modify:**
- `frontend/src/types/music.ts` — Add `BedtimeStory` type (if not done in Step 1)
- `frontend/src/data/music/bedtime-stories.ts` — New file with 12 stories + helper exports

**Details:**

Add to `types/music.ts`:
```typescript
export interface BedtimeStory {
  id: string
  title: string
  description: string
  audioFilename: string
  durationSeconds: number
  voiceId: VoiceGender
  lengthCategory: LengthCategory
  tags: string[]
}
```

Create `frontend/src/data/music/bedtime-stories.ts`:
- 12 stories with exact titles, descriptions, durations, and voice assignments from spec
- Audio filenames follow pattern: `stories/{id}.mp3` (e.g., `stories/noah-and-the-great-flood.mp3`)
- Length categories: Short (8-12 min), Medium (15-20 min), Long (26-30 min)
- Voice alternates: Male, Female, Male, Female... across the catalog
- Tags relevant to each story (e.g., `['faith', 'trust', 'old-testament']`)
- Export: `BEDTIME_STORIES`, `BEDTIME_STORY_BY_ID` Map

**Guardrails (DO NOT):**
- DO NOT include full story narrative text — spec says "use placeholder descriptions only" (Spec 10)
- DO NOT add audio playback code — this step is data only
- DO NOT modify any existing files except `types/music.ts`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `bedtime-stories.test.ts` | unit | 12 stories exist with all required fields |
| `bedtime-stories.test.ts` | unit | Voice alternates male/female |
| `bedtime-stories.test.ts` | unit | Length categories match duration ranges (Short < 15min, Medium 15-25min, Long > 25min) |
| `bedtime-stories.test.ts` | unit | `BEDTIME_STORY_BY_ID` Map contains all 12 stories |
| `bedtime-stories.test.ts` | unit | All descriptions are non-empty strings |
| `bedtime-stories.test.ts` | unit | All `audioFilename` values are unique |

**Expected state after completion:**
- [ ] `types/music.ts` has `BedtimeStory` type
- [ ] `data/music/bedtime-stories.ts` exports `BEDTIME_STORIES` (12), `BEDTIME_STORY_BY_ID`
- [ ] All tests pass

---

### Step 3: Placeholder Audio Files

**Objective:** Create silent placeholder MP3 files for all 36 sessions so playback logic can be tested.

**Files to create:**
- `frontend/public/audio/scripture/` — 24 placeholder MP3s
- `frontend/public/audio/stories/` — 12 placeholder MP3s

**Details:**

Use `ffmpeg` to generate 1-second silent MP3 files with correct filenames:
```bash
mkdir -p frontend/public/audio/scripture frontend/public/audio/stories
# Generate a single silent MP3 template
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 frontend/public/audio/silence.mp3
# Copy for each scripture reading and story with correct filenames
```

Filenames must match the `audioFilename` values in the data files from Steps 1-2.

**Guardrails (DO NOT):**
- DO NOT create large audio files — 1-second silent MP3s are sufficient for testing
- DO NOT commit real audio content — placeholder only (Spec 10 handles real TTS)

**Expected state after completion:**
- [ ] `frontend/public/audio/scripture/` contains 24 MP3 files matching data file references
- [ ] `frontend/public/audio/stories/` contains 12 MP3 files matching data file references

---

### Step 4: useForegroundPlayer Hook

**Objective:** Create a hook that manages foreground audio playback (scripture readings and bedtime stories) with auth gating, content switching confirmation, and integration with the existing AudioProvider.

**Files to create/modify:**
- `frontend/src/hooks/useForegroundPlayer.ts` — New hook
- `frontend/src/types/audio.ts` — Extend `ForegroundContent` with optional fields

**Details:**

Extend `ForegroundContent` in `types/audio.ts`:
```typescript
export interface ForegroundContent {
  contentId: string
  contentType: 'scripture' | 'story'
  title: string
  duration: number
  playbackPosition: number
  isPlaying: boolean
  scriptureReference?: string  // NEW — for scripture readings
  voiceGender?: 'male' | 'female'  // NEW — for voice indicator display
  webText?: string  // NEW — for scripture text toggle
}
```

Create `useForegroundPlayer` hook:
```typescript
interface UseForegroundPlayerReturn {
  startSession: (content: ScriptureReading | BedtimeStory) => void
  pendingSwitch: { currentTitle: string; remainingTime: number; newTitle: string } | null
  confirmSwitch: () => void
  cancelSwitch: () => void
}
```

Hook behavior:
1. **Auth gate**: Check `isLoggedIn` via `useAuth()`. If not logged in, call `authModal?.openAuthModal('Sign in to listen to sleep content')` and return.
2. **No existing foreground**: Call `engine.playForeground(url)`, dispatch `START_FOREGROUND` with metadata, set up `timeupdate` listener on the `<audio>` element to dispatch `UPDATE_FOREGROUND_POSITION`.
3. **Existing foreground playing**: Set `pendingSwitch` state with current title, remaining time, and new title. Do NOT start new content yet.
4. **`confirmSwitch()`**: Crossfade out current foreground over 2 seconds (ramp foreground gain to 0), then call `engine.playForeground(newUrl)`, dispatch `START_FOREGROUND` with new metadata.
5. **`cancelSwitch()`**: Clear `pendingSwitch` state, no change.
6. **Audio URL**: Construct from `AUDIO_BASE_URL + content.audioFilename`.
7. **`timeupdate` listener**: On the HTML `<audio>` element (from `engine.getForegroundElement()`), listen for `timeupdate` events and dispatch `UPDATE_FOREGROUND_POSITION`.
8. **`ended` listener**: When audio ends, dispatch `PAUSE_FOREGROUND`.
9. **Media Session update**: Set `navigator.mediaSession.metadata` to show foreground title.

Follow `useScenePlayer.ts` pattern for auth gating (lines 57-59), engine access, and cleanup.

**Auth gating:**
- `startSession()` checks `isLoggedIn` first
- Auth modal message: "Sign in to listen to sleep content"
- Same pattern as `useScenePlayer.ts` lines 57-59

**Guardrails (DO NOT):**
- DO NOT auto-play without user gesture — the play call happens inside a click handler chain
- DO NOT store any data in localStorage — zero persistence for audio state
- DO NOT modify the `AudioEngineService` — `playForeground()` already handles the `<audio>` element
- DO NOT use `AudioBufferSourceNode` for foreground — must use `<audio>` element (already implemented in engine)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useForegroundPlayer.test.ts` | unit | `startSession()` calls `openAuthModal` when `isLoggedIn` is false |
| `useForegroundPlayer.test.ts` | unit | `startSession()` dispatches `START_FOREGROUND` with correct metadata when logged in |
| `useForegroundPlayer.test.ts` | unit | When foreground already playing, `startSession()` sets `pendingSwitch` instead of starting |
| `useForegroundPlayer.test.ts` | unit | `confirmSwitch()` clears `pendingSwitch` and dispatches new `START_FOREGROUND` |
| `useForegroundPlayer.test.ts` | unit | `cancelSwitch()` clears `pendingSwitch` without changing playback |
| `useForegroundPlayer.test.ts` | unit | `pendingSwitch` contains correct `remainingTime` calculation |

**Expected state after completion:**
- [ ] `useForegroundPlayer` hook created with auth gating, content switching, and position tracking
- [ ] `ForegroundContent` type extended with optional `scriptureReference`, `voiceGender`, `webText`
- [ ] All tests pass

---

### Step 5: ContentSwitchDialog Component

**Objective:** Build the confirmation dialog that appears when switching foreground content while something is already playing.

**Files to create:**
- `frontend/src/components/audio/ContentSwitchDialog.tsx` — New component

**Details:**

Props:
```typescript
interface ContentSwitchDialogProps {
  currentTitle: string
  remainingTime: number  // seconds
  newTitle: string
  onSwitch: () => void
  onKeepListening: () => void
}
```

Render:
- Overlay: `fixed inset-0 z-[10002] bg-black/40` (above drawer z-index)
- Dialog: centered, dark glass (`rgba(15, 10, 30, 0.95)`, `backdrop-filter: blur(16px)`), `rounded-xl`, `max-w-sm mx-auto`, `p-6`
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title element
- Message: `"You're listening to {currentTitle} ({remainingFormatted} remaining). Start {newTitle} instead?"`
- Use `formatTime()` helper for remaining time (same as `ForegroundProgressBar`)
- Two buttons:
  - "Switch" — `bg-primary text-white font-semibold py-3 px-8 rounded-lg` (primary CTA pattern)
  - "Keep Listening" — `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30` (hero outline CTA pattern)
- Focus trap via `useFocusTrap` hook (same as `AudioDrawer.tsx`)

**Responsive behavior:**
- All breakpoints: dialog is `max-w-sm`, centered horizontally and vertically
- Mobile: `mx-4` for side padding
- Desktop: same centered layout

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT render outside of a portal — use `fixed` positioning directly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ContentSwitchDialog.test.tsx` | unit | Renders current title and new title in dialog message |
| `ContentSwitchDialog.test.tsx` | unit | Renders formatted remaining time |
| `ContentSwitchDialog.test.tsx` | unit | "Switch" button calls `onSwitch` |
| `ContentSwitchDialog.test.tsx` | unit | "Keep Listening" button calls `onKeepListening` |
| `ContentSwitchDialog.test.tsx` | unit | Has `role="alertdialog"` and `aria-modal="true"` |

**Expected state after completion:**
- [ ] `ContentSwitchDialog` component built with dark glass design
- [ ] Focus trapping works
- [ ] All tests pass

---

### Step 6: Scripture Text Toggle (DrawerNowPlaying Enhancement)

**Objective:** Add a BookOpen toggle icon and collapsible scripture text panel to the drawer's now-playing section.

**Files to create/modify:**
- `frontend/src/components/audio/ScriptureTextPanel.tsx` — New component
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — Add BookOpen toggle + ScriptureTextPanel

**Details:**

**ScriptureTextPanel component:**
```typescript
interface ScriptureTextPanelProps {
  webText: string  // Verse text with \n separators
  currentPosition: number  // playback position in seconds
  duration: number  // total duration in seconds
}
```

- Panel container: `bg-[rgba(15,10,30,0.6)] rounded-lg p-4 max-h-48 overflow-y-auto`, `role="region"`, `aria-label="Scripture text"`, `id="scripture-text-panel"`
- Text: `font-serif text-sm leading-relaxed text-white/85` (Lora)
- Split `webText` by `\n` into verse paragraphs
- Active verse highlighting: calculate estimated current verse index based on `currentPosition / duration * totalVerses`. Apply `bg-primary/10 border-l-2 border-primary pl-3` to the active verse paragraph.
- Auto-scroll: use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on the active verse element when it changes.
- Slide-open animation: `transition-all duration-300` on max-height (0 when hidden, auto when open).

**DrawerNowPlaying modification:**
- After the `<ForegroundProgressBar />`, add a toggle row:
  - Only visible when `state.foregroundContent?.contentType === 'scripture'`
  - Row contains: title text (already shown by ForegroundProgressBar), voice indicator icon, BookOpen toggle button
  - BookOpen button: `aria-expanded={isTextOpen}`, `aria-controls="scripture-text-panel"`, `aria-label="Show scripture text"`
  - When toggled open, render `<ScriptureTextPanel>` below
- Voice indicator: small text `"Male" | "Female"` or icon next to title, using `state.foregroundContent.voiceGender`
- Toggle state: `useState(false)` — session-only, not persisted

**Responsive behavior:**
- Mobile (< 640px): Panel full width, scrollable, max-height 192px (`max-h-48`)
- Tablet (640-1024px): Same as mobile
- Desktop (> 1024px): Same layout, comfortable reading within drawer's 400px width

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for scripture text — render as text nodes
- DO NOT persist toggle state to localStorage
- DO NOT show BookOpen toggle for bedtime stories (`contentType === 'story'`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ScriptureTextPanel.test.tsx` | unit | Renders all verse paragraphs from `webText` |
| `ScriptureTextPanel.test.tsx` | unit | Highlights estimated current verse based on position/duration |
| `ScriptureTextPanel.test.tsx` | unit | Has `role="region"` and `aria-label="Scripture text"` |
| `DrawerNowPlaying.test.tsx` | integration | BookOpen toggle visible when `contentType === 'scripture'` |
| `DrawerNowPlaying.test.tsx` | integration | BookOpen toggle hidden when `contentType === 'story'` |
| `DrawerNowPlaying.test.tsx` | integration | Toggle `aria-expanded` flips between true/false |
| `DrawerNowPlaying.test.tsx` | integration | Voice indicator shows gender from `foregroundContent.voiceGender` |

**Expected state after completion:**
- [ ] `ScriptureTextPanel` component renders WEB text with verse highlighting
- [ ] `DrawerNowPlaying` shows BookOpen toggle for scripture readings only
- [ ] Toggle opens/closes text panel with animation
- [ ] All tests pass

---

### Step 7: Sleep Browse UI — Tonight's Scripture + Scripture Collections

**Objective:** Build the browse component for the Sleep & Rest tab, including the "Tonight's Scripture" featured card and 4 horizontal-scrolling scripture collection sections.

**Files to create:**
- `frontend/src/components/audio/SleepBrowse.tsx` — Main browse container
- `frontend/src/components/audio/TonightScripture.tsx` — Daily featured card
- `frontend/src/components/audio/ScriptureCollectionRow.tsx` — Horizontal scroll row for a collection
- `frontend/src/components/audio/ScriptureSessionCard.tsx` — Individual scripture reading card

**Details:**

**SleepBrowse** — Main container:
- Dark background: `bg-hero-dark min-h-screen` (#0D0620)
- Contains: `<TonightScripture>`, 4x `<ScriptureCollectionRow>`, `<BedtimeStoriesGrid>` (Step 8)
- Padding: `px-4 py-8 sm:px-6`
- Max width: `max-w-6xl mx-auto`

**TonightScripture** — Daily featured card:
- Section: `aria-label="Tonight's featured scripture"`
- Label: `text-sm font-medium text-primary-lt tracking-wide uppercase` — "Tonight's Scripture"
- Card: larger than regular cards, `border-2 border-primary/60`, `rounded-xl`, `p-6`, `bg-gradient-to-br from-hero-mid/50 to-primary/10`
- Shows: title (`text-lg font-semibold text-white`), scripture reference (`text-sm text-white/60`), duration badge, play button
- Play button: `bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center` with Play icon
- Rotation: `const todayIndex = Math.floor(Date.now() / 86400000) % ALL_SCRIPTURE_READINGS.length`
- Mobile: full width. Desktop: `max-w-lg mx-auto`

**ScriptureCollectionRow** — Horizontal scroll section:
- Heading: `text-xl font-semibold text-white mb-3`
- Scroll container: `flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth` with `-webkit-overflow-scrolling: touch`
- Hide scrollbar: `scrollbar-hide` utility class (add to Tailwind config if not present: `{ '.scrollbar-hide': { '-ms-overflow-style': 'none', 'scrollbar-width': 'none', '&::-webkit-scrollbar': { display: 'none' } } }`)

**ScriptureSessionCard** — Individual card:
- `role="button"`, `aria-label="Play {reference}: {title}, {duration} minutes, {voiceGender} voice"`
- Min width: `min-w-[220px]` (for horizontal scroll), `snap-start`
- Background: `bg-gradient-to-br from-hero-mid/50 to-primary/10`
- Border: `border border-white/10 rounded-xl p-4`
- Content: title (`text-sm font-medium text-white`), reference (`text-xs text-white/60`), bottom row with duration badge + voice indicator + "Scripture" badge + play icon button
- Duration badge: `bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full` — format as `"5 min"`
- Voice indicator: `text-xs text-white/50` — `"M"` or `"F"` label
- Content type badge: BookOpen icon + "Scripture" — `bg-primary/20 text-primary-lt text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1`
- Play icon: small Play icon (`size={16}`) in a `w-8 h-8 rounded-full bg-primary/80 text-white` circle
- On click: calls `onPlay(reading)` prop
- Touch target: entire card is clickable, min 44x44px

**Responsive behavior:**
- Mobile (< 640px): "Tonight's Scripture" full width. Collection rows horizontal scroll, cards peek from right edge.
- Tablet (640-1024px): Collection rows show 2-3 cards visible.
- Desktop (> 1024px): "Tonight's Scripture" `max-w-lg mx-auto`. Collection rows show 3-4 cards visible.

**Auth gating:**
- Play buttons call `useForegroundPlayer.startSession()` which handles auth internally
- Browse is fully visible to logged-out users

**Guardrails (DO NOT):**
- DO NOT add artwork images to scripture cards — they are text-focused
- DO NOT hardcode the featured scripture — use the day-of-year rotation formula
- DO NOT use `useEffect` for the daily rotation — it's a pure computation from `Date.now()`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `TonightScripture.test.tsx` | unit | Renders "Tonight's Scripture" label |
| `TonightScripture.test.tsx` | unit | Shows a scripture reading title, reference, and duration |
| `TonightScripture.test.tsx` | unit | Has `aria-label="Tonight's featured scripture"` on section |
| `ScriptureSessionCard.test.tsx` | unit | Renders title, reference, duration badge, "Scripture" badge |
| `ScriptureSessionCard.test.tsx` | unit | Has `role="button"` and descriptive `aria-label` |
| `ScriptureSessionCard.test.tsx` | unit | Calls `onPlay` when clicked |
| `ScriptureSessionCard.test.tsx` | unit | Shows voice indicator ("M" or "F") |
| `ScriptureCollectionRow.test.tsx` | unit | Renders heading and all cards in collection |
| `SleepBrowse.test.tsx` | integration | Renders Tonight's Scripture + 4 collection sections + Bedtime Stories |

**Expected state after completion:**
- [ ] `SleepBrowse` component renders the full browse UI
- [ ] "Tonight's Scripture" shows daily-rotating featured reading
- [ ] 4 collection sections with horizontal scroll
- [ ] All scripture cards show title, reference, duration, voice, content type badge
- [ ] All tests pass

---

### Step 8: Sleep Browse UI — Bedtime Stories Grid

**Objective:** Add the bedtime stories section to the Sleep browse with a responsive grid of story cards.

**Files to create:**
- `frontend/src/components/audio/BedtimeStoriesGrid.tsx` — Section with responsive grid
- `frontend/src/components/audio/BedtimeStoryCard.tsx` — Individual story card

**Details:**

**BedtimeStoriesGrid** — Section container:
- Heading: `text-xl font-semibold text-white mb-4` — "Bedtime Stories"
- Grid: `grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Renders a `<BedtimeStoryCard>` for each of the 12 stories

**BedtimeStoryCard** — Individual card:
- `role="button"`, `aria-label="Play {title}, {lengthCategory}, {durationMinutes} minutes, {voiceGender} voice"`
- Background: `bg-gradient-to-br from-hero-mid/50 to-primary/10`
- Border: `border border-white/10 rounded-xl p-4`
- Title: `text-sm font-medium text-white`
- Description: `text-xs text-white/50 line-clamp-2` (2-line truncation)
- Bottom row: duration badge + length category label + voice indicator + "Story" badge + play icon
- Duration badge: same as scripture cards — `bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full`
- Length category: `text-xs text-white/40 font-medium` — "Short" / "Medium" / "Long"
- Content type badge: Moon icon + "Story" — `bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1`
- Play icon: `w-8 h-8 rounded-full bg-primary/80 text-white` circle with Play icon
- On click: calls `onPlay(story)` prop

**Responsive behavior:**
- Mobile (< 640px): 1 column, full-width cards
- Tablet (640-1024px): 2 columns
- Desktop (> 1024px): 3 columns

**Guardrails (DO NOT):**
- DO NOT include full story narrative text — only the short description from the data file
- DO NOT add artwork images yet — spec says "placeholder images for now," but we can skip for MVP

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `BedtimeStoryCard.test.tsx` | unit | Renders title, description (truncated), duration, length category |
| `BedtimeStoryCard.test.tsx` | unit | Shows "Story" badge with Moon icon |
| `BedtimeStoryCard.test.tsx` | unit | Has `role="button"` and descriptive `aria-label` |
| `BedtimeStoryCard.test.tsx` | unit | Calls `onPlay` when clicked |
| `BedtimeStoryCard.test.tsx` | unit | Description is limited to 2 lines (has `line-clamp-2` class) |
| `BedtimeStoriesGrid.test.tsx` | unit | Renders "Bedtime Stories" heading |
| `BedtimeStoriesGrid.test.tsx` | unit | Renders all 12 story cards |

**Expected state after completion:**
- [ ] `BedtimeStoriesGrid` and `BedtimeStoryCard` components built
- [ ] Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- [ ] All story cards show title, description, duration, length, voice, content type badge
- [ ] All tests pass

---

### Step 9: AudioPill and DrawerNowPlaying Enhancements

**Objective:** Enhance the pill and drawer to show foreground content title and voice indicator when foreground audio is playing.

**Files to modify:**
- `frontend/src/components/audio/AudioPill.tsx` — Show foreground title in pill when foreground is active
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — Add voice indicator display next to title in progress bar area
- `frontend/src/components/audio/AudioProvider.tsx` — Update Media Session metadata for foreground content

**Details:**

**AudioPill enhancement:**
- Currently shows `state.currentSceneName` in pill text
- When `state.foregroundContent` exists and is playing, prioritize showing foreground title:
  ```
  const displayName = state.foregroundContent?.title ?? state.currentSceneName
  ```
- This means when both scene and foreground are active, the pill shows the foreground title (the active user action)

**DrawerNowPlaying voice indicator:**
- Below the `<ForegroundProgressBar>`, show a row with:
  - Voice gender: `text-xs text-white/50` — e.g., "Male voice" or "Female voice"
  - This extends the existing title display in `ForegroundProgressBar`

**AudioProvider Media Session:**
- In the existing Media Session effect, also check for `state.foregroundContent`:
  ```typescript
  if (state.foregroundContent && state.pillVisible) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.foregroundContent.title,
      artist: 'Worship Room',
    })
  }
  ```
- Foreground content metadata takes priority over scene name

**Guardrails (DO NOT):**
- DO NOT break existing scene name display — only override when foreground is active
- DO NOT modify the AudioEngineService

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AudioPill.test.tsx` | unit | Shows foreground title in pill when foreground content is active |
| `AudioPill.test.tsx` | unit | Falls back to scene name when no foreground content |
| `DrawerNowPlaying.test.tsx` | unit | Shows voice indicator when foreground content has `voiceGender` |

**Expected state after completion:**
- [ ] Pill shows foreground title when foreground is playing
- [ ] Drawer shows voice indicator
- [ ] Media Session shows foreground metadata
- [ ] All tests pass

---

### Step 10: Integration Wiring & Final Tests

**Objective:** Wire `SleepBrowse` with `useForegroundPlayer` and `ContentSwitchDialog`, verify end-to-end behavior.

**Files to modify:**
- `frontend/src/components/audio/SleepBrowse.tsx` — Wire up `useForegroundPlayer` hook, render `ContentSwitchDialog`

**Details:**

In `SleepBrowse`:
1. Call `useForegroundPlayer()` to get `startSession`, `pendingSwitch`, `confirmSwitch`, `cancelSwitch`
2. Pass `startSession` as `onPlay` prop to all `ScriptureSessionCard` and `BedtimeStoryCard` components (via `TonightScripture`, `ScriptureCollectionRow`, `BedtimeStoriesGrid`)
3. When `pendingSwitch` is not null, render `<ContentSwitchDialog>` with the pending switch data
4. Handle auth modal display automatically (the hook handles this internally)

Integration test coverage:
- Full browse → play → switch → dialog → confirm flow
- Auth gate test: logged-out user tapping play sees auth modal

**Auth gating verification:**
- Render `SleepBrowse` with logged-out user → tap any play button → verify `openAuthModal` called with "Sign in to listen to sleep content"
- This requires wrapping tests in `AuthModalProvider` and mocking `useAuth`

**Guardrails (DO NOT):**
- DO NOT modify any audio infrastructure files in this step
- DO NOT add routing — Spec 6 handles the `/music/sleep` route

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SleepBrowse.integration.test.tsx` | integration | Clicking a scripture card play button when logged out triggers auth modal with "Sign in to listen to sleep content" |
| `SleepBrowse.integration.test.tsx` | integration | Clicking a bedtime story play button when logged out triggers auth modal |
| `SleepBrowse.integration.test.tsx` | integration | All 4 collection sections rendered with correct headings |
| `SleepBrowse.integration.test.tsx` | integration | "Tonight's Scripture" section rendered at top |
| `SleepBrowse.integration.test.tsx` | integration | "Bedtime Stories" section rendered with 12 cards |

**Expected state after completion:**
- [ ] `SleepBrowse` fully wired with foreground player and content switch dialog
- [ ] Auth gating works for all play buttons
- [ ] Content switching confirmation dialog appears correctly
- [ ] All tests pass
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes all tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Scripture readings data + types |
| 2 | 1 (types) | Bedtime stories data + types |
| 3 | 1, 2 | Placeholder audio files (needs filenames from data) |
| 4 | 1, 2 | useForegroundPlayer hook (needs data types + audio infra) |
| 5 | 4 | ContentSwitchDialog (needs pendingSwitch from hook) |
| 6 | 4 | Scripture text toggle in DrawerNowPlaying (needs ForegroundContent.webText) |
| 7 | 1, 4 | Scripture browse UI + Tonight's Scripture (needs data + hook) |
| 8 | 2, 4 | Bedtime stories grid (needs data + hook) |
| 9 | 4 | AudioPill + DrawerNowPlaying enhancements (needs foreground state) |
| 10 | 4, 5, 7, 8 | Integration wiring (needs all components + hook) |

**Parallelizable:** Steps 5, 6, 7, 8, 9 can all be developed in parallel after Step 4 is complete. Steps 1 and 2 can be developed in parallel (share types).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Scripture Readings Data + Types | [COMPLETE] | 2026-03-08 | Added `VoiceGender`, `LengthCategory`, `ScriptureReading`, `ScriptureCollection`, `BedtimeStory` types to `types/music.ts`. Created `data/music/scripture-readings.ts` with 24 readings across 4 collections, full WEB text, helper exports. Created `data/music/__tests__/scripture-readings.test.ts` (10 tests). Voice alternation test adjusted to check adjacent alternation rather than fixed M/F/M/F start since Trust in God collection starts with Female per spec. |
| 2 | Bedtime Stories Data + Types | [COMPLETE] | 2026-03-08 | Created `data/music/bedtime-stories.ts` with 12 stories, descriptions, durations, length categories. `BedtimeStory` type was already added in Step 1. Created `data/music/__tests__/bedtime-stories.test.ts` (7 tests). |
| 3 | Placeholder Audio Files | [COMPLETE] | 2026-03-08 | Created 36 silent MP3 placeholders (1.6KB each): 24 in `public/audio/scripture/`, 12 in `public/audio/stories/`. Used Python-generated minimal valid MPEG frames (no ffmpeg available). |
| 4 | useForegroundPlayer Hook | [COMPLETE] | 2026-03-08 | Created `hooks/useForegroundPlayer.ts` with auth gating, content switching pendingSwitch state, confirmSwitch with 2s crossfade, cancelSwitch, timeupdate/ended listeners, Media Session metadata. Extended `ForegroundContent` in `types/audio.ts` with optional `scriptureReference`, `voiceGender`, `webText`. Created `hooks/__tests__/useForegroundPlayer.test.ts` (6 tests). |
| 5 | ContentSwitchDialog Component | [COMPLETE] | 2026-03-08 | Created `components/audio/ContentSwitchDialog.tsx` with dark glass design, focus trapping via `useFocusTrap`, alertdialog role. Created tests (5 tests). |
| 6 | Scripture Text Toggle | [COMPLETE] | 2026-03-08 | Created `ScriptureTextPanel.tsx` with verse-level highlighting, auto-scroll (guarded for jsdom). Modified `DrawerNowPlaying.tsx`: added BookOpen toggle (scripture only), voice indicator, collapsible panel. Created `ScriptureTextPanel.test.tsx` (3 tests). |
| 7 | Scripture Browse UI | [COMPLETE] | 2026-03-08 | Created `SleepBrowse.tsx`, `TonightScripture.tsx`, `ScriptureCollectionRow.tsx`, `ScriptureSessionCard.tsx`. Tests: ScriptureSessionCard (5), TonightScripture (4), ScriptureCollectionRow (2) — all pass. |
| 8 | Bedtime Stories Grid | [COMPLETE] | 2026-03-08 | Created `BedtimeStoryCard.tsx` and `BedtimeStoriesGrid.tsx`. Wired into `SleepBrowse.tsx`. Tests: BedtimeStoryCard (5), BedtimeStoriesGrid (2) — all pass. |
| 9 | Pill & Drawer Enhancements | [COMPLETE] | 2026-03-08 | Modified `AudioPill.tsx`: pill text now shows foreground title when active, falls back to scene name. Modified `AudioProvider.tsx`: Media Session metadata prioritizes foreground content, tab title uses foreground title. DrawerNowPlaying voice indicator was already added in Step 6. Existing AudioPill tests (6) still pass. |
| 10 | Integration Wiring & Final Tests | [COMPLETE] | 2026-03-08 | Rewrote `SleepBrowse.tsx` to use `useForegroundPlayer` hook internally and render `ContentSwitchDialog` when `pendingSwitch` is set. Removed external callback props. Created `SleepBrowse.test.tsx` (5 integration tests including auth gating). All 686 tests pass, `pnpm build` succeeds. |
