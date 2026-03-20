# Implementation Plan: Prayer Generation Experience Enhancement

**Spec:** `_specs/prayer-experience-enhance.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/prayer-experience-enhance`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon needed — enhancements are within existing Pray tab)
**Master Spec Plan:** not applicable (standalone feature, not part of multi-spec sequence)

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/daily/PrayTabContent.tsx`** — The primary file to modify. Contains the full Pray tab: textarea, chips, crisis banner, mock prayer generation (1500ms setTimeout), KaraokeText display, action buttons (Copy/ReadAloud/Save/Share), secondary CTAs ("Journal about this →", "Pray about something else"). Currently uses `KaraokeText` (TTS word highlighting) but not `KaraokeTextReveal` (word-by-word entrance).
- **`frontend/src/components/daily/KaraokeTextReveal.tsx`** — Existing component from the karaoke-scripture-reveal spec. Accepts `text`, `revealDuration` or `msPerWord`, `onRevealComplete`, `className`. Handles `prefers-reduced-motion` internally. Words at opacity 0 are in DOM (accessible). Cleanup on unmount.
- **`frontend/src/components/daily/KaraokeText.tsx`** — Existing word-highlighting component for TTS sync. Accepts `text`, `currentWordIndex`, `className`. Used by `ReadAloudButton` via `onWordIndexChange`.
- **`frontend/src/components/daily/ReadAloudButton.tsx`** — TTS button. Calls `useReadAloud()` hook. States: idle/playing/paused. `onWordIndexChange` callback tracks current TTS word.
- **`frontend/src/hooks/useReadAloud.ts`** — Browser Speech Synthesis TTS. Returns `{ state, currentWordIndex, play, pause, resume, stop }`.
- **`frontend/src/hooks/useScenePlayer.ts`** — Scene loading with auth gating, routine interrupt check, undo. `loadScene(scene)` checks `isAuthenticated`, then `activeRoutine`, then calls `executeSceneLoad`. The auth check is redundant for auto-play (user already authenticated when generating prayer).
- **`frontend/src/components/audio/AudioProvider.tsx`** — Global provider exposing `useAudioState()`, `useAudioDispatch()`, `useAudioEngine()`. State includes `activeSounds`, `masterVolume`, `isPlaying`, `currentSceneName`, `pillVisible`, `drawerOpen`, `activeRoutine`.
- **`frontend/src/data/scenes.ts`** — `SCENE_PRESETS` array and `SCENE_BY_ID` Map. "The Upper Room" has id `'the-upper-room'`.
- **`frontend/src/hooks/useReducedMotion.ts`** — Returns boolean for `prefers-reduced-motion`.
- **`frontend/src/components/daily/AmbientSoundPill.tsx`** — Existing "Enhance with sound" pill in the input view. Uses `useScenePlayer().loadScene()`.
- **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** — Existing test file with provider wrapping pattern (MemoryRouter + AuthProvider + ToastProvider + AuthModalProvider), mocks for AudioProvider, useScenePlayer, useFaithPoints.

### Directory Conventions

- Components: `frontend/src/components/daily/`
- Tests: `frontend/src/components/daily/__tests__/`
- Hooks: `frontend/src/hooks/`
- Data: `frontend/src/data/`

### Provider Wrapping for Tests

Tests use: `MemoryRouter > AuthProvider > ToastProvider > AuthModalProvider > Component`. Audio provider and scene player are vi.mock'd.

### Key Audio Dispatch Actions

- `OPEN_DRAWER` / `CLOSE_DRAWER` — toggle AudioDrawer
- `STOP_ALL` — stop all audio playback
- `SET_MASTER_VOLUME` — set master volume `{ volume: number }`

### Key Scene Data

"The Upper Room" scene:
```typescript
import { SCENE_BY_ID } from '@/data/scenes'
const upperRoom = SCENE_BY_ID.get('the-upper-room')
// id: 'the-upper-room', name: 'The Upper Room'
// sounds: cathedral-reverb (0.4), choir-hum (0.3), ambient-pads (0.35), church-bells (0.1)
```

---

## Auth Gating Checklist

**All three enhancements are auth-gated by inheritance — prayer generation already requires login (line 118-121 of PrayTabContent.tsx). No new auth checks needed.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Generate Prayer" button | Auth modal: "Sign in to generate a prayer" | Existing (unchanged) | `useAuth` + `authModal.openAuthModal` |
| Sound indicator "Change" | Not reachable without prayer gen | Step 2 | Inherited (prayer gen gated) |
| Sound indicator "Stop" | Not reachable without prayer gen | Step 2 | Inherited (prayer gen gated) |
| "Skip" link | Not reachable without prayer gen | Step 1 | Inherited (prayer gen gated) |
| Reflection pills | Not reachable without prayer gen | Step 3 | Inherited (prayer gen gated) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Prayer card container | classes | `rounded-lg bg-primary/5 p-6` | PrayTabContent.tsx:220 |
| Prayer text | classes | `font-serif text-lg leading-relaxed text-text-dark` | PrayTabContent.tsx:223 |
| Action buttons | classes | `inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50` | PrayTabContent.tsx:233 |
| Existing chip pattern | classes | `min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:border-primary hover:text-primary` | PrayTabContent.tsx:331 |
| Text light color | hex | `#7F8C8D` | design-system.md |
| Text dark color | hex | `#2C3E50` | design-system.md |
| Primary color | hex | `#6D28D9` | design-system.md |
| Animate fade-in | animation | `500ms ease-out` | design-system.md |
| Neutral background | hex | `#F5F5F5` | design-system.md (Pray tab background) |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Pray tab sits on light `#F5F5F5` background with `BackgroundSquiggle` — use dark-on-light text colors, not white-on-dark
- All tab content within `max-w-2xl` container width
- Caveat (`font-script`) for highlighted words, Inter (`font-sans`) for body, Lora (`font-serif`) for scripture/prayer text
- `animate-fade-in` is 500ms ease-out (existing Tailwind animation)
- Touch targets: minimum 44px height via padding
- Existing chip pattern: `bg-white rounded-full border border-gray-200` — reflection pills use `bg-gray-100 rounded-full` (different: filled gray, no border, with icon)
- `text-text-light` = `#7F8C8D`, `text-text-dark` = `#2C3E50`

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Reflection pills stack vertically (`flex-col`), sound indicator centered, everything full-width within `max-w-2xl px-4` |
| Tablet | 640px+ | Reflection pills horizontal row, sound indicator left-aligned |
| Desktop | 1024px+ | Same as tablet — all within `max-w-2xl` container |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Prayer card → Sound indicator | `mt-2` (8px) | Spec: indicator sits directly below prayer card |
| Sound indicator → Action buttons | `mb-4` total (indicator in 16px gap) | Existing `mb-6` on prayer card, indicator fits between |
| Action buttons → Reflection prompt | `mt-6` (24px) | Spec: `mt-6` on reflection container |
| Reflection prompt → Secondary CTAs | `mt-4` (16px) | Existing secondary CTAs margin unchanged |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `KaraokeTextReveal` component exists and works as documented
- [x] `SCENE_BY_ID.get('the-upper-room')` returns a valid scene preset
- [x] `useScenePlayer` hook available with `loadScene`, `executeSceneLoad` (private — need to use `loadScene` or call audio dispatch directly)
- [x] `useReducedMotion` hook exists at `@/hooks/useReducedMotion`
- [x] All auth-gated actions from the spec are accounted for in the plan (inherited)
- [x] Design system values verified from design-system.md and codebase inspection
- [ ] All [UNVERIFIED] values flagged with verification methods (2 flagged below)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-play uses `executeSceneLoad` directly vs `loadScene` | Use `loadScene` with active routine check, but skip auth check | `loadScene` already checks auth + routines. Since auto-play only fires after auth-gated prayer gen, auth check passes. Routine check is needed per spec. |
| Auto-play with active routine | Skip auto-play entirely (don't trigger routine interrupt UI) | Spec says: "check for active routines and skip if one is running." No confirmation UI for background auto-play. |
| How to skip KaraokeTextReveal | Expose `skipToEnd` ref callback or set reveal complete state | Simplest: track `revealComplete` state + pass `revealDuration={0}` on skip, or add a `forceComplete` prop. Preferred: add optional `forceComplete` boolean prop to `KaraokeTextReveal`. |
| "Read Aloud" during reveal: transition approach | Set `forceComplete` on KaraokeTextReveal → wait for `onRevealComplete` → start TTS | Clean handoff: visual reveal completes instantly, then TTS begins from start. |
| Sound indicator disappears when audio stops externally | Watch `audioState.activeSounds.length` and `audioState.pillVisible` | If user stops via AudioPill, activeSounds empties → indicator hidden. |
| Reflection "It resonated" fade-out timing | CSS animation with JS timeout for cleanup | 300ms fade in, 3s display, 500ms fade out, then entire section fades out 500ms. Total ~4.3s. |
| How to auto-play at 40% volume | Dispatch `SET_MASTER_VOLUME { volume: 0.4 }` before `loadScene` | Master volume must be set before scene loads so sounds start at reduced level. |

---

## Implementation Steps

### Step 1: Add `forceComplete` prop to KaraokeTextReveal

**Objective:** Enable external control to skip the reveal animation (needed for "Skip" button and "Read Aloud" during reveal).

**Files to modify:**
- `frontend/src/components/daily/KaraokeTextReveal.tsx` — Add `forceComplete` boolean prop
- `frontend/src/components/daily/__tests__/KaraokeTextReveal.test.tsx` — Add tests for `forceComplete`

**Details:**

Add an optional `forceComplete?: boolean` prop. When `forceComplete` transitions from `false` to `true`:
1. Clear all pending timeouts
2. Set `revealedCount` to `words.length` (all words visible)
3. Fire `onRevealComplete()` immediately

Implementation: Add a `useEffect` that watches `forceComplete`:
```typescript
useEffect(() => {
  if (forceComplete && text) {
    const currentWords = text.split(/\s+/)
    timeoutIdsRef.current.forEach(clearTimeout)
    timeoutIdsRef.current = []
    setRevealedCount(currentWords.length)
    // Fire callback on next tick to ensure state is committed
    const id = setTimeout(() => completeCallbackRef.current?.(), 0)
    timeoutIdsRef.current.push(id)
  }
}, [forceComplete, text])
```

**Guardrails (DO NOT):**
- Do NOT change existing behavior when `forceComplete` is `undefined` or `false`
- Do NOT break the existing `prefersReduced` shortcut
- Do NOT change the component's public API beyond adding the optional prop

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `forceComplete skips remaining words` | unit | Set `forceComplete={true}` mid-reveal → all words visible immediately |
| `forceComplete fires onRevealComplete` | unit | Verify callback fires when `forceComplete` transitions to true |
| `forceComplete=false has no effect` | unit | Normal reveal behavior when prop is false |

**Expected state after completion:**
- [ ] `KaraokeTextReveal` accepts optional `forceComplete` prop
- [ ] Setting `forceComplete={true}` instantly reveals all words and fires `onRevealComplete`
- [ ] All existing KaraokeTextReveal tests still pass
- [ ] New tests pass

---

### Step 2: Ambient sound auto-play + sound indicator

**Objective:** Auto-start "The Upper Room" ambient scene at 40% volume when prayer generates, and show a sound indicator below the prayer card.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add auto-play logic in `handleGenerate`, add sound indicator UI, add new state variables

**Details:**

**New imports:**
```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'
```

Note: `useScenePlayer` and audio imports are already used indirectly through `AmbientSoundPill`. The component already has access to these via the provider tree. However, PrayTabContent itself doesn't currently import them directly — it delegates to `AmbientSoundPill`. For auto-play, PrayTabContent needs direct access.

**New state:**
```typescript
const prefersReduced = useReducedMotion()
const audioState = useAudioState()
const audioDispatch = useAudioDispatch()
const { loadScene } = useScenePlayer()
const [autoPlayedAudio, setAutoPlayedAudio] = useState(false)
```

`autoPlayedAudio` tracks whether THIS prayer generation triggered the audio — controls sound indicator visibility.

**Modify `handleGenerate`:**

After the existing auth check and before `setIsLoading(true)`:
1. Check `!prefersReduced` AND `audioState.activeSounds.length === 0` AND `!audioState.pillVisible` AND `!audioState.activeRoutine`
2. If all conditions pass:
   - `audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: 0.4 } })`
   - Get scene: `const upperRoom = SCENE_BY_ID.get('the-upper-room')`
   - If scene exists: `loadScene(upperRoom)` then `setAutoPlayedAudio(true)`
3. If any condition fails: `setAutoPlayedAudio(false)`

**Important:** `loadScene` includes its own auth check (which will pass since we're already authenticated) and routine check (which we pre-checked). If the routine is active, we skip auto-play entirely per spec.

**Sound indicator UI** — rendered below the prayer card, above the action buttons. Only visible when `autoPlayedAudio && audioState.activeSounds.length > 0`:

```tsx
{autoPlayedAudio && audioState.activeSounds.length > 0 && (
  <div className="mb-4 text-center sm:text-left">
    <span className="text-xs text-text-light">
      Sound: The Upper Room
      <span className="mx-1 text-text-light/50">&middot;</span>
      <button
        type="button"
        onClick={() => audioDispatch({ type: audioState.drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })}
        className="text-xs text-text-light underline transition-colors hover:text-text-dark"
      >
        Change
      </button>
      <span className="mx-1 text-text-light/50">&middot;</span>
      <button
        type="button"
        onClick={() => {
          audioDispatch({ type: 'STOP_ALL' })
          setAutoPlayedAudio(false)
        }}
        className="text-xs text-text-light underline transition-colors hover:text-text-dark"
      >
        Stop
      </button>
    </span>
  </div>
)}
```

Place this JSX inside the `{prayer && !isLoading && (...)}` block, after the prayer card `div.mb-6.rounded-lg.bg-primary/5.p-6` and before the action buttons `div.mb-6.flex.items-center.gap-2`.

**Modify `handleReset`:**
Add `setAutoPlayedAudio(false)` — when user resets to try again, indicator state resets (but audio keeps playing per spec).

**Responsive behavior:**
- Mobile (< 640px): Sound indicator centered (`text-center`)
- Tablet/Desktop (640px+): Left-aligned (`sm:text-left`)
- Indicator inherits `max-w-2xl` from parent container

**Guardrails (DO NOT):**
- Do NOT stop audio when prayer flow ends or on component unmount
- Do NOT show indicator if user already had audio playing before generation
- Do NOT show indicator during loading state (only after prayer displays)
- Do NOT show error toasts if scene fails to load
- Do NOT change master volume if audio is already playing (skip the whole auto-play)
- Do NOT trigger routine interrupt confirmation UI — skip auto-play entirely if routine is active

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `auto-plays Upper Room scene on prayer generation` | integration | Generate prayer with no audio playing → verify `loadScene` called with Upper Room scene, `SET_MASTER_VOLUME` dispatched with 0.4 |
| `skips auto-play when audio already playing` | integration | Mock `activeSounds.length > 0` → generate prayer → verify `loadScene` NOT called |
| `skips auto-play when prefers-reduced-motion` | integration | Mock `useReducedMotion` returning true → generate → verify `loadScene` NOT called |
| `skips auto-play when routine active` | integration | Mock `activeRoutine` truthy → generate → verify `loadScene` NOT called |
| `sound indicator shows after prayer displays` | integration | Generate prayer → wait for display → verify "Sound: The Upper Room" text visible |
| `sound indicator hidden when audio was already playing` | integration | Mock active audio → generate → verify no sound indicator |
| `sound indicator "Change" opens AudioDrawer` | integration | Click "Change" → verify `OPEN_DRAWER` dispatched |
| `sound indicator "Stop" stops all audio` | integration | Click "Stop" → verify `STOP_ALL` dispatched, indicator disappears |
| `sound indicator disappears when audio stopped externally` | integration | Mock `activeSounds` going to empty → verify indicator not rendered |

**Expected state after completion:**
- [ ] Generating a prayer (when no audio playing) auto-starts The Upper Room at 40% volume
- [ ] Sound indicator appears below prayer card with Change/Stop actions
- [ ] All edge cases handled (existing audio, reduced motion, active routine)
- [ ] Existing prayer generation behavior unchanged for logged-out users

---

### Step 3: KaraokeTextReveal prayer display with Skip button

**Objective:** Replace static prayer text display with word-by-word reveal using `KaraokeTextReveal`, with a "Skip" link.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Replace `KaraokeText` with `KaraokeTextReveal` for generated prayer, add skip logic, manage reveal state

**Details:**

**New state:**
```typescript
const [revealComplete, setRevealComplete] = useState(false)
const [forceRevealComplete, setForceRevealComplete] = useState(false)
```

**Replace the prayer text display** inside the prayer card (`div.mb-6.rounded-lg.bg-primary/5.p-6`):

Before (current):
```tsx
<KaraokeText
  text={prayer.text}
  currentWordIndex={prayerWordIndex}
  className="font-serif text-lg leading-relaxed text-text-dark"
/>
```

After:
```tsx
{revealComplete ? (
  <KaraokeText
    text={prayer.text}
    currentWordIndex={prayerWordIndex}
    className="font-serif text-lg leading-relaxed text-text-dark"
  />
) : (
  <KaraokeTextReveal
    text={prayer.text}
    msPerWord={80}
    forceComplete={forceRevealComplete}
    onRevealComplete={() => setRevealComplete(true)}
    className="font-serif text-lg leading-relaxed text-text-dark"
  />
)}
```

**Logic:** During reveal, `KaraokeTextReveal` shows the word-by-word animation. Once reveal completes (naturally, via skip, or via Read Aloud), `revealComplete` is set to true, and we switch to `KaraokeText` for TTS word highlighting mode. This avoids conflicts between the two components' styling.

**Skip link** — below the prayer card, only visible during reveal:
```tsx
{prayer && !isLoading && !revealComplete && (
  <div className="mb-2 text-center">
    <button
      type="button"
      onClick={() => setForceRevealComplete(true)}
      className="text-xs text-text-light underline transition-colors hover:text-text-dark"
    >
      Skip
    </button>
  </div>
)}
```

Place after the prayer card `div` and before the sound indicator.

**Read Aloud interaction during reveal:**

Modify the `ReadAloudButton` `onWordIndexChange` callback or wrap the play action. When "Read Aloud" is clicked during reveal (`!revealComplete`):
1. Set `forceRevealComplete(true)` — this instantly shows all words via KaraokeTextReveal's `forceComplete`
2. Once `onRevealComplete` fires (which sets `revealComplete(true)`), the component switches to `KaraokeText` with TTS highlighting
3. TTS playback begins naturally via `ReadAloudButton`'s `play(text)` call

To make this seamless, wrap the ReadAloudButton to intercept play:

Create a small wrapper or modify the click flow. The simplest approach: the `ReadAloudButton` already calls `play(text)` when clicked in idle state. We need to force-complete the reveal at the same time. We can achieve this by:
- Wrapping `ReadAloudButton` in a container with an `onClick` handler that fires first
- OR creating a new `onPlay` callback prop on `ReadAloudButton`

Simplest approach — wrap with an `onClick` on the parent:
```tsx
<div onClick={() => { if (!revealComplete) setForceRevealComplete(true) }}>
  <ReadAloudButton text={prayer.text} onWordIndexChange={setPrayerWordIndex} />
</div>
```

This way, clicking Read Aloud during reveal: the wrapper fires `setForceRevealComplete(true)` → `onRevealComplete` fires → `revealComplete` becomes true → component re-renders with `KaraokeText` → `ReadAloudButton`'s own click handler fires `play(text)` → TTS begins → word index updates highlight `KaraokeText`. The React batching ensures smooth transition.

**Modify `handleReset`:**
Add:
```typescript
setRevealComplete(false)
setForceRevealComplete(false)
```

**Responsive behavior:**
- All breakpoints: Skip link is centered below prayer card, same width constraints
- KaraokeTextReveal handles natural line wrapping internally
- No layout shift when Skip appears/disappears (it uses its own `mb-2` spacing, and only shows during reveal)

**Guardrails (DO NOT):**
- Do NOT show both `KaraokeTextReveal` and `KaraokeText` simultaneously
- Do NOT change the prayer card container styling (`rounded-lg bg-primary/5 p-6`)
- Do NOT break the existing `ReadAloudButton` component — use wrapper approach
- Do NOT cause layout shift when switching from reveal to TTS mode
- Do NOT start TTS automatically — only when user clicks "Read Aloud"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `prayer reveals word by word using KaraokeTextReveal` | integration | Generate prayer → verify `KaraokeTextReveal` is rendered (not `KaraokeText`) |
| `skip link visible during reveal` | integration | Generate prayer → verify "Skip" button visible |
| `clicking skip shows full prayer immediately` | integration | Click "Skip" → verify all prayer text visible, skip link disappears |
| `skip link disappears after reveal completes` | integration | Wait for reveal to complete → verify skip link gone |
| `read aloud during reveal completes reveal instantly` | integration | Generate prayer → click Read Aloud before reveal complete → verify reveal completes |
| `reveal resets when generating new prayer` | integration | Generate → reset → generate again → verify new reveal starts |
| `prefers-reduced-motion shows text instantly` | unit | Mock reduced motion → generate → verify text appears immediately |

**Expected state after completion:**
- [ ] Generated prayer text appears word-by-word at 80ms/word
- [ ] "Skip" link visible during reveal, hides after reveal completes
- [ ] Clicking "Read Aloud" during reveal completes reveal and starts TTS
- [ ] Switching from reveal to TTS highlighting is seamless (no flash/jump)
- [ ] `prefers-reduced-motion` shows text instantly

---

### Step 4: Post-prayer reflection prompt

**Objective:** Add the "How did that prayer land?" reflection section with three response pills and their behaviors.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add reflection UI, manage reflection state, implement pill behaviors

**Details:**

**New state:**
```typescript
const [reflectionVisible, setReflectionVisible] = useState(false)
const [reflectionDismissed, setReflectionDismissed] = useState(false)
const [resonatedMessage, setResonatedMessage] = useState(false)
const [resonatedFading, setResonatedFading] = useState(false)
const [sectionFading, setSectionFading] = useState(false)
const [retryPrompt, setRetryPrompt] = useState<string | null>(null)
```

**New import:**
```typescript
import { Heart, RefreshCw, PenLine } from 'lucide-react'
```

**Trigger reflection appearance:**

When `revealComplete` becomes true and `!reflectionDismissed`, set a 500ms timeout to show reflection:
```typescript
useEffect(() => {
  if (revealComplete && prayer && !reflectionDismissed) {
    const timer = setTimeout(() => setReflectionVisible(true), 500)
    return () => clearTimeout(timer)
  }
}, [revealComplete, prayer, reflectionDismissed])
```

**Reflection UI** — placed between the action buttons row and the secondary CTAs:

```tsx
{reflectionVisible && !reflectionDismissed && !sectionFading && (
  <div className="mb-4 mt-6 animate-fade-in">
    <p className="mb-3 text-sm font-medium text-text-dark">
      How did that prayer land?
    </p>
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      <button
        type="button"
        onClick={handleResonated}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="It resonated — show encouraging message"
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        It resonated
      </button>
      <button
        type="button"
        onClick={handleSomethingDifferent}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Something different — try a new prayer"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Something different
      </button>
      <button
        type="button"
        onClick={handleJournalReflection}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Journal about this prayer"
      >
        <PenLine className="h-4 w-4" aria-hidden="true" />
        Journal about this
      </button>
    </div>

    {/* Encouraging message for "It resonated" */}
    {resonatedMessage && (
      <p
        className={cn(
          'mt-3 text-center text-sm italic text-text-light transition-opacity duration-300',
          resonatedFading ? 'opacity-0' : 'opacity-100',
        )}
        aria-live="polite"
      >
        We&apos;re glad. Carry this prayer with you today.
      </p>
    )}
  </div>
)}
```

**Handler implementations:**

```typescript
const handleResonated = () => {
  setResonatedMessage(true)
  // After 3 seconds, start fading message
  setTimeout(() => setResonatedFading(true), 3000)
  // After message fade out (3000 + 500), start section fade
  setTimeout(() => setSectionFading(true), 3500)
  // After section fade (3500 + 500), dismiss entirely
  setTimeout(() => {
    setReflectionDismissed(true)
    setReflectionVisible(false)
    setResonatedMessage(false)
    setResonatedFading(false)
    setSectionFading(false)
  }, 4000)
}

const handleSomethingDifferent = () => {
  setReflectionDismissed(true)
  // Reset to input view
  setPrayer(null)
  setText('')
  setSelectedChip(null)
  setNudge(false)
  setPrayerWordIndex(-1)
  setRevealComplete(false)
  setForceRevealComplete(false)
  setReflectionVisible(false)
  setAutoPlayedAudio(false)
  setRetryPrompt('Try describing what\'s on your heart differently.')
  // Focus textarea
  setTimeout(() => {
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

const handleJournalReflection = () => {
  setReflectionDismissed(true)
  onSwitchToJournal?.(extractTopic())
}
```

**Retry prompt display** — in the input section, above the textarea:
```tsx
{retryPrompt && (
  <p className="mb-2 text-center text-sm text-text-light">
    {retryPrompt}
  </p>
)}
```

Clear the retry prompt when user starts typing:
```typescript
// In textarea onChange handler, add:
if (retryPrompt) setRetryPrompt(null)
```

**Reset reflection state in `handleReset`:**
```typescript
setReflectionVisible(false)
setReflectionDismissed(false)
setResonatedMessage(false)
setResonatedFading(false)
setSectionFading(false)
setRetryPrompt(null)
```

**Reset reflection on new prayer generation:**
In `handleGenerate`, after `setIsLoading(true)`:
```typescript
setReflectionVisible(false)
setReflectionDismissed(false)
setResonatedMessage(false)
setResonatedFading(false)
setSectionFading(false)
```

**"It resonated" section fade out:** When `sectionFading` is true, apply `opacity-0 transition-opacity duration-500` to the entire reflection container. Then after 500ms, set `reflectionDismissed(true)`.

Adjust the reflection container to support section-level fade:
```tsx
<div className={cn(
  'mb-4 mt-6',
  !sectionFading && 'animate-fade-in',
  sectionFading && 'opacity-0 transition-opacity duration-500',
)}>
```

**Responsive behavior:**
- Mobile (< 640px): Pills stack vertically (`flex-col`), each full-width
- Tablet/Desktop (640px+): Pills in horizontal row (`sm:flex-row sm:gap-3`)
- Encouraging message always centered

**Guardrails (DO NOT):**
- Do NOT show reflection if prayer hasn't fully revealed (wait for `revealComplete`)
- Do NOT show reflection more than once per generated prayer
- Do NOT remove the existing secondary CTAs — reflection sits between action buttons and CTAs
- Do NOT add any new localStorage keys
- Do NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `reflection prompt appears after reveal completes` | integration | Generate prayer → wait for reveal → verify "How did that prayer land?" visible after delay |
| `reflection prompt does not appear during reveal` | integration | Generate prayer → before reveal completes → verify reflection not visible |
| `"It resonated" shows encouraging message` | integration | Click "It resonated" → verify message appears → verify message and section fade out |
| `"Something different" resets to input view` | integration | Click "Something different" → verify prayer cleared, textarea focused, retry prompt shown |
| `"Journal about this" switches to journal tab` | integration | Provide `onSwitchToJournal` mock → click pill → verify callback called |
| `reflection dismissed after pill click` | integration | Click any pill → generate new prayer → verify reflection appears again for new prayer |
| `retry prompt clears on typing` | integration | Trigger "Something different" → type in textarea → verify prompt disappears |
| `existing secondary CTAs remain visible` | integration | Generate prayer → verify "Journal about this →" and "Pray about something else" still visible |
| `reflection pills are keyboard accessible` | unit | Tab to each pill → verify focus ring visible, Enter/Space activates |
| `encouraging message uses aria-live` | unit | Verify `aria-live="polite"` on encouraging message element |
| `pill touch targets are 44px minimum` | unit | Verify `min-h-[44px]` on each pill |

**Expected state after completion:**
- [ ] Reflection section fades in 500ms after reveal completes
- [ ] "It resonated" → encouraging message → section fades away
- [ ] "Something different" → reset to input with retry prompt
- [ ] "Journal about this" → switches to Journal tab with context
- [ ] Reflection appears once per prayer, resets on new generation
- [ ] All pills keyboard-accessible with visible focus indicators
- [ ] Existing secondary CTAs unchanged

---

### Step 5: Integration tests for the full prayer experience flow

**Objective:** Add comprehensive integration tests covering the complete 3-enhancement flow working together.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add new test suites

**Details:**

Extend the existing test file with new `describe` blocks:

1. **"ambient sound auto-play"** — Tests for Step 2 behavior
2. **"karaoke prayer reveal"** — Tests for Step 3 behavior
3. **"post-prayer reflection prompt"** — Tests for Step 4 behavior
4. **"full prayer experience flow"** — End-to-end integration tests combining all 3

**Mock setup updates:**

The existing test file already mocks `useScenePlayer`, `AudioProvider`, and `useFaithPoints`. Update the mocks to be more granular for testing:

```typescript
// Make loadScene spy accessible
const mockLoadScene = vi.fn()
const mockAudioDispatch = vi.fn()
let mockAudioState = { /* ... default empty state ... */ }

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    loadScene: mockLoadScene,
    // ... other defaults
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockAudioDispatch,
}))
```

Also mock `useReducedMotion`:
```typescript
let mockReducedMotion = false
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))
```

**Key test scenarios:**

| Test | Type | Description |
|------|------|-------------|
| `full flow: generate → reveal → reflection → resonated` | integration | Type text → generate → verify ambient auto-play → verify word reveal → skip → verify reflection → click "It resonated" → verify message |
| `full flow: generate → skip → something different → regenerate` | integration | Generate → skip reveal → "Something different" → type new text → generate again → verify full cycle repeats |
| `no regressions: logged-out user sees auth modal` | integration | Clear auth → click Generate → verify auth modal opens, no ambient/reveal/reflection changes |
| `no regressions: Copy, Save, Share buttons unchanged` | integration | Generate prayer → verify Copy/Save/Share buttons present and functional |
| `no regressions: existing CTAs unchanged` | integration | Generate prayer → verify "Journal about this →" and "Pray about something else" CTAs visible |
| `prefers-reduced-motion: full flow` | integration | Enable reduced motion → generate → verify no auto-play, instant text, reflection still works |

**Guardrails (DO NOT):**
- Do NOT use real timers (use `vi.useFakeTimers()` for setTimeout-based flows)
- Do NOT test audio engine internals — mock at the hook level
- Do NOT skip provider wrapping — all tests must use the existing `renderPrayTab` pattern

**Expected state after completion:**
- [ ] All existing PrayTabContent tests pass
- [ ] New test suites cover ambient auto-play, karaoke reveal, reflection prompt, and full flow
- [ ] Edge cases tested: reduced motion, existing audio, active routine, logged-out user
- [ ] All tests pass with `pnpm test`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `forceComplete` prop to KaraokeTextReveal |
| 2 | — | Ambient sound auto-play + sound indicator |
| 3 | 1 | KaraokeTextReveal prayer display with Skip + Read Aloud interaction |
| 4 | 3 | Post-prayer reflection prompt |
| 5 | 2, 3, 4 | Integration tests for full flow |

**Note:** Steps 1 and 2 can be implemented in parallel. Step 3 depends on Step 1 (needs `forceComplete`). Step 4 depends on Step 3 (needs `revealComplete` state). Step 5 depends on all prior steps.

---

## [UNVERIFIED] Values

1. **[UNVERIFIED]** Reflection pill `bg-gray-100` on `#F5F5F5` background: May not have enough contrast differentiation.
   → To verify: Run `/verify-with-playwright` and visually inspect pills on the Pray tab background
   → If wrong: Adjust to `bg-gray-200` or add a subtle border `border border-gray-200`

2. **[UNVERIFIED]** Sound indicator `text-text-light` (`#7F8C8D`) readability on `#F5F5F5` background: The spec corrected from `text-white/50` (dark bg) to `text-text-light` (light bg), but contrast ratio of `#7F8C8D` on `#F5F5F5` is approximately 3.0:1 — below WCAG AA for small text (4.5:1).
   → To verify: Check contrast with `/verify-with-playwright` accessibility audit
   → If wrong: Use `text-subtle-gray` (`#6B7280`) which has ~4.7:1 contrast on `#F5F5F5`

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | forceComplete prop for KaraokeTextReveal | [COMPLETE] | 2026-03-20 | Added `forceComplete` boolean prop + useEffect to KaraokeTextReveal.tsx. 3 new tests added. All 16 tests pass. |
| 2 | Ambient sound auto-play + sound indicator | [COMPLETE] | 2026-03-20 | Added auto-play logic in handleGenerate, sound indicator UI, autoPlayedAudio state. Used `text-subtle-gray` (#6B7280) instead of `text-text-light` (#7F8C8D) for WCAG AA compliance (~4.7:1 vs ~3.0:1 contrast). All tests pass. |
| 3 | KaraokeTextReveal prayer display + Skip | [COMPLETE] | 2026-03-20 | Replaced KaraokeText with conditional KaraokeTextReveal/KaraokeText. Added Skip link, forceRevealComplete state. ReadAloudButton wrapped with `role="presentation" onClickCapture` span for clean reveal-skip on play. All tests pass. |
| 4 | Post-prayer reflection prompt | [COMPLETE] | 2026-03-20 | Added reflection UI with 3 pills (Heart/RefreshCw/PenLine icons), resonated message with fade-out, "Something different" reset with retry prompt, "Journal about this" with context pass. Used `bg-gray-200` instead of `bg-gray-100` for better contrast on #F5F5F5 background. All tests pass, no lint errors. |
| 5 | Integration tests for full flow | [COMPLETE] | 2026-03-20 | Rewrote test file with granular mocks (mockLoadScene, mockAudioDispatch, mockAudioState, mockReducedMotion). 4 test suites: activity integration (2), ambient auto-play (8), karaoke reveal (5), reflection prompt (9), full flow (6). Total 30 tests, all pass. Added scrollIntoView mock for jsdom. Build compiles clean. |
