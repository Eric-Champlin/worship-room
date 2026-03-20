# Implementation Plan: KaraokeText Word-by-Word Scripture Reveal

**Spec:** `_specs/karaoke-scripture-reveal.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/karaoke-scripture-reveal`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon — this spec adds animation behavior, not new pages/layouts)
**Master Spec Plan:** not applicable (standalone spec, not part of a multi-spec sequence)

> **Note:** Design system recon was captured 2026-03-06. Dashboard entrance animations (`feat: dashboard-entrance-animations`) and pray ceremony animation (`feat: pray-ceremony-animation`) were committed after recon capture. These may have introduced new animation patterns. However, this spec does not depend on those patterns — it creates its own word-by-word reveal mechanism. No staleness concern.

---

## Architecture Context

### Relevant Existing Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `frontend/src/components/daily/KaraokeText.tsx` | TTS-synced word highlighting | Sibling component — reveal mode will be a new component alongside this |
| `frontend/src/components/dashboard/MoodCheckIn.tsx` | Mood check-in flow | Integration point 1: verse display at line 231-244 |
| `frontend/src/components/dashboard/MoodRecommendations.tsx` | Post-check-in recommendations | Integration point 2: heading at line 90-96 |
| `frontend/src/components/StartingPointQuiz.tsx` | Quiz with result card | Integration point 3: blockquote verse at line 378-383 |
| `frontend/src/pages/meditate/ScriptureSoaking.tsx` | Soaking meditation | Integration point 4: blockquote verse at line 128-133 |
| `frontend/src/pages/SharedVerse.tsx` | Shareable verse page | Integration point 5: hero blockquote at line 75-80 |
| `frontend/src/hooks/useReducedMotion.ts` | `prefers-reduced-motion` hook | Used by reveal component for accessibility |
| `frontend/src/constants/dashboard/mood.ts` | `VERSE_DISPLAY_DURATION_MS = 3000` | Timing constraint for mood check-in reveal |

### Directory Conventions

- Components: `frontend/src/components/daily/` (KaraokeText lives here)
- Tests: `__tests__/` subdirectory adjacent to component (e.g., `components/daily/__tests__/KaraokeText.test.tsx`)
- Hooks: `frontend/src/hooks/`
- Pages: `frontend/src/pages/`

### Component Patterns

- **Word splitting**: `text.split(/\s+/)` — existing KaraokeText pattern
- **CSS utilities**: `cn()` from `@/lib/utils` for conditional classes
- **Reduced motion**: `useReducedMotion()` hook returns boolean; used conditionally in class application (see `MoodRecommendations.tsx` line 108)
- **Animations**: Existing uses `motion-safe:animate-fade-in` CSS class (500ms ease-out) — the reveal replaces this with JS-driven sequential reveals

### Test Patterns

- **Framework**: Vitest + React Testing Library
- **Fake timers**: `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.advanceTimersByTime()` + `vi.useRealTimers()` in `afterEach`
- **Reduced motion mocking**: `vi.mock('@/hooks/useReducedMotion')` + `vi.mocked(useReducedMotion).mockReturnValue(true/false)`
- **User events**: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` when using fake timers
- **No provider wrapping needed**: KaraokeText and verse displays don't require AuthModalProvider/ToastProvider
- **MoodCheckIn tests**: Direct render with props `userName`, `onComplete`, `onSkip` — no router needed
- **SharedVerse tests**: Wrapped in `MemoryRouter` with `initialEntries` for route params
- **ScriptureSoaking tests**: No existing test file found — tests in this plan will be new

---

## Auth Gating Checklist

This feature is **purely visual** — no auth-gated actions are introduced. The existing auth gating on each route remains unchanged:

| Location | Auth Behavior | Change Needed |
|----------|---------------|---------------|
| Mood Check-In | Only visible to authenticated users (dashboard route) | None — reveal only appears when verse is shown |
| Mood Recommendations | Only visible to authenticated users | None |
| Starting Point Quiz | Public (available to all) | None |
| Scripture Soaking | Auth-gated (redirects logged-out users) | None |
| Shared Verse Page | Public (available to all) | None |

No auth gating implementation needed in this plan.

---

## Design System Values (for UI steps)

This feature introduces **no new visual styles**. All typography is inherited from parent elements. The only new CSS is the per-word transition:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Word span (hidden) | opacity | `0` | Spec requirement |
| Word span (hidden) | transform | `translateY(4px)` | Spec requirement |
| Word span (revealed) | opacity | `1` | Spec requirement |
| Word span (revealed) | transform | `translateY(0)` | Spec requirement |
| Word span transition | duration | `200ms` | Spec requirement |
| Word span transition | easing | `ease-out` | Spec requirement |

No new colors, fonts, or layout values are needed.

---

## Design System Reminder

- **No font styles on KaraokeTextReveal** — all typography inherited from parent element
- **Word spacing must be natural** — span wrapping must not introduce visual artifacts or line break changes
- **Existing `motion-safe:animate-fade-in`** on integration points will be removed/replaced by the reveal animation
- **`useReducedMotion()` hook** already exists at `@/hooks/useReducedMotion` — use it, do not create a new one
- **Mood check-in verse display** has a 3000ms auto-advance timer (`VERSE_DISPLAY_DURATION_MS`) — the 2500ms reveal must complete before auto-advance fires
- **Scripture Soaking** uses `text-text-dark` on light background — words fade to dark, not white
- **Shared Verse** uses `text-white` on dark gradient — words fade to white
- **Caveat is for hero H1s** — none of the integration points use Caveat; all use Lora (serif) or Inter (sans)

---

## Responsive Structure

The reveal animation is **identical across all breakpoints**. Font size changes are handled by existing responsive classes on parent elements. No breakpoint-specific animation behavior.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Same reveal timing; text wraps within parent width constraints |
| Tablet | 768px | Same reveal timing; larger font sizes from parent responsive classes |
| Desktop | 1440px | Same reveal timing; widest text layout, more words per line |

---

## Vertical Rhythm

No changes to vertical rhythm. The reveal animation does not affect spacing between sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The existing KaraokeText component (`components/daily/KaraokeText.tsx`) is unchanged from reconnaissance (32 lines, TTS-only)
- [ ] `VERSE_DISPLAY_DURATION_MS` is still 3000ms in `constants/dashboard/mood.ts`
- [ ] `useReducedMotion` hook exists at `hooks/useReducedMotion.ts`
- [ ] MoodCheckIn verse display is at lines 231-244 with `motion-safe:animate-fade-in`
- [ ] MoodRecommendations heading is at lines 90-96 with `motion-safe:animate-fade-in`
- [ ] No [UNVERIFIED] values in this plan (all values are from spec requirements or codebase inspection)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sibling component vs mode variant | New `KaraokeTextReveal` component | Props are completely different from TTS mode; keeping existing `KaraokeText` untouched avoids regression risk |
| Per-word delay calculation for Scripture Soaking | `msPerWord` prop (instead of `revealDuration`) | Soaking uses ~300ms/word with variable total duration, unlike the other 4 locations which use fixed total duration |
| Prop API for variable timing | Discriminated: `revealDuration` OR `msPerWord` (provide one, component calculates the other) | Simplifies consumer code — mood check-in passes `revealDuration={2500}`, soaking passes `msPerWord={300}` |
| Curly quotes in verse text | Quotes are added by parent elements (`&ldquo;`/`&rdquo;`) wrapping the reveal component, NOT inside it | Avoids the reveal treating quote marks as separate words |
| Verse reference fade-in after reveal | Parent handles reference visibility via `onRevealComplete` callback + CSS transition | Keeps the reveal component single-responsibility |
| Re-render with same text | Use `useRef` to track last-revealed text; skip re-reveal if unchanged | Prevents flickering on React re-renders |

---

## Implementation Steps

### Step 1: Create KaraokeTextReveal Component

**Objective:** Build the word-by-word reveal animation component as a sibling to the existing KaraokeText.

**Files to create:**
- `frontend/src/components/daily/KaraokeTextReveal.tsx` — New component

**Details:**

```typescript
interface KaraokeTextRevealProps {
  text: string
  /** Total time (ms) for the full reveal. Mutually exclusive with msPerWord. */
  revealDuration?: number
  /** Per-word delay (ms). Used for variable-length reveals (Scripture Soaking). Mutually exclusive with revealDuration. */
  msPerWord?: number
  /** Fired after the last word is fully revealed */
  onRevealComplete?: () => void
  /** Applied to the container element for font styling inheritance */
  className?: string
}
```

**Implementation details:**

1. Split `text` on `/\s+/` into words array (same pattern as existing `KaraokeText`)
2. Calculate per-word delay:
   - If `revealDuration` provided: `revealDuration / words.length`
   - If `msPerWord` provided: use directly (total = `msPerWord * words.length`)
   - If neither: default `revealDuration = 2500`
3. State: `revealedCount` (number) starting at 0
4. Use `useReducedMotion()` hook:
   - If reduced motion: set `revealedCount = words.length` immediately, fire `onRevealComplete` on next tick
   - If normal motion: start `setTimeout` chain
5. `setTimeout` chain in a `useEffect`:
   - For each word index, schedule `setTimeout(setRevealedCount(i + 1), delay * i)`
   - After last word: schedule `onRevealComplete` at `delay * words.length` (after the last word's delay)
   - Store all timeout IDs in a `ref` for cleanup
   - Return cleanup function that clears all timeouts
6. Track revealed text in a `ref` to prevent re-reveal on same text re-render:
   - If `text` changes → reset `revealedCount` to 0 and restart reveal
   - If `text` is same → no-op
7. Render:
   ```tsx
   <p className={cn('leading-relaxed', className)}>
     {words.map((word, index) => (
       <span
         key={`${index}-${word}`}
         style={{
           opacity: index < revealedCount ? 1 : 0,
           transform: index < revealedCount ? 'translateY(0)' : 'translateY(4px)',
           transition: 'opacity 200ms ease-out, transform 200ms ease-out',
           display: 'inline',
         }}
       >
         {word}
         {index < words.length - 1 ? ' ' : ''}
       </span>
     ))}
   </p>
   ```
8. Empty/undefined `text`: render `null`

**Guardrails (DO NOT):**
- DO NOT set any font styles (font-family, font-size, font-weight, color) — all inherited from parent
- DO NOT use `display: none`, `visibility: hidden`, or `aria-hidden` on unrevealed words — they must be in the DOM for screen readers
- DO NOT use CSS keyframe animations — use CSS transitions triggered by state change
- DO NOT use `requestAnimationFrame` — `setTimeout` is appropriate here for discrete word reveals
- DO NOT import or interact with TTS/ReadAloud functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders all words from text | unit | All words present in DOM regardless of reveal state |
| words start with opacity 0 | unit | Before reveal, all word spans have `opacity: 0` style |
| words reveal sequentially | unit | After advancing timers, words gain `opacity: 1` in order |
| fires onRevealComplete after last word | unit | Callback fires after full reveal duration |
| cleans up timeouts on unmount | unit | Unmount during reveal does not cause state updates |
| respects prefers-reduced-motion | unit | All words visible immediately, onRevealComplete fires on next tick |
| empty text renders nothing | unit | `text=""` renders null |
| re-render with same text does not restart | unit | Component stable on re-render with identical text prop |
| re-render with different text restarts reveal | unit | New text resets and re-reveals |
| applies custom className to container | unit | className prop forwarded to `<p>` element |
| calculates per-word delay from revealDuration | unit | 10 words + 2500ms = 250ms per word |
| uses msPerWord when provided | unit | 10 words + 300ms/word = 3000ms total |
| no font styles applied to spans | unit | Word spans have no font-family/size/weight/color styles |

**Expected state after completion:**
- [ ] `KaraokeTextReveal` component exists and exports from `components/daily/KaraokeTextReveal.tsx`
- [ ] All 13 tests pass
- [ ] Existing `KaraokeText` component is completely untouched
- [ ] No regression in existing tests

---

### Step 2: Integrate at Mood Check-In Verse Display

**Objective:** Replace the block fade-in on the mood check-in encouragement verse with the word-by-word reveal.

**Files to modify:**
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — Replace verse rendering (lines 231-244)

**Details:**

Replace the verse `<p>` (line 238-240) with `KaraokeTextReveal`:

**Before (current code):**
```tsx
<div
  ref={verseRef}
  tabIndex={-1}
  aria-live="polite"
  className="flex flex-col items-center outline-none motion-safe:animate-fade-in"
>
  <p className="max-w-lg text-center font-serif text-xl italic text-white/90 md:text-2xl">
    &ldquo;{selectedMood.verse}&rdquo;
  </p>
  <p className="mt-3 text-center font-sans text-sm text-white/50">
    {selectedMood.verseReference}
  </p>
</div>
```

**After:**
```tsx
<div
  ref={verseRef}
  tabIndex={-1}
  aria-live="polite"
  className="flex flex-col items-center outline-none"
>
  <div className="max-w-lg text-center font-serif text-xl italic text-white/90 md:text-2xl">
    &ldquo;<KaraokeTextReveal
      text={selectedMood.verse}
      revealDuration={2500}
      onRevealComplete={() => setVerseRevealed(true)}
      className="inline"
    />&rdquo;
  </div>
  <p
    className={cn(
      'mt-3 text-center font-sans text-sm text-white/50 transition-opacity duration-300',
      verseRevealed ? 'opacity-100' : 'opacity-0'
    )}
  >
    {selectedMood.verseReference}
  </p>
</div>
```

**Changes:**
1. Remove `motion-safe:animate-fade-in` from the container `div`
2. Add `verseRevealed` state (boolean, default `false`)
3. Reset `verseRevealed` to `false` when entering `verse_display` phase
4. `KaraokeTextReveal` with `revealDuration={2500}` and `onRevealComplete` sets `verseRevealed = true`
5. The `<p>` element wrapping the verse becomes a `<div>` so the inline `<KaraokeTextReveal>` renders inside it (the reveal component renders a `<p>`, so we avoid `<p>` inside `<p>`)
   - **Alternative:** Make `KaraokeTextReveal` render a `<span>` instead of `<p>` — this is better for composition. **Decision: Use `<span>` as the root element in the reveal component** (update Step 1 accordingly — render `<span>` not `<p>`)
6. Verse reference fades in via CSS opacity transition after `onRevealComplete`
7. The 3000ms auto-advance timer (`VERSE_DISPLAY_DURATION_MS`) remains unchanged — the 2500ms reveal completes 500ms before auto-advance

**Important: Update Step 1** — The reveal component should render a `<span>` (not `<p>`) as its root element to allow flexible composition. The consumer wraps it in whatever semantic element they need. Update `className` default from `'leading-relaxed'` to just pass-through.

**Guardrails (DO NOT):**
- DO NOT change the auto-advance timer (VERSE_DISPLAY_DURATION_MS stays at 3000ms)
- DO NOT modify the crisis banner phase or crisis detection logic
- DO NOT change the focus management (verseRef still gets focus)
- DO NOT remove `aria-live="polite"` from the container

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| verse text renders via KaraokeTextReveal | integration | After mood selection + continue, verse words are present in DOM |
| verse reference hidden until reveal completes | integration | Reference has opacity-0 initially, gains opacity-100 after reveal |
| auto-advance still fires after VERSE_DISPLAY_DURATION_MS | integration | onComplete called after 3000ms (existing test — verify no regression) |
| reduced motion shows verse immediately | integration | With useReducedMotion mocked true, verse and reference both visible immediately |

**Expected state after completion:**
- [ ] Mood check-in verse displays word-by-word over 2500ms
- [ ] Verse reference fades in after reveal completes
- [ ] Auto-advance timer still works at 3000ms
- [ ] All existing MoodCheckIn tests pass (no regression)
- [ ] New integration tests pass

---

### Step 3: Integrate at Mood Recommendations Heading

**Objective:** Replace the block fade-in on the "Based on how you're feeling..." heading with word-by-word reveal.

**Files to modify:**
- `frontend/src/components/dashboard/MoodRecommendations.tsx` — Replace heading animation (lines 90-96)

**Details:**

**Before:**
```tsx
<h2
  ref={headingRef}
  tabIndex={-1}
  className="mb-6 text-center font-serif italic text-xl text-white/80 outline-none motion-safe:animate-fade-in md:text-2xl"
>
  Based on how you're feeling...
</h2>
```

**After:**
```tsx
<h2
  ref={headingRef}
  tabIndex={-1}
  className="mb-6 text-center font-serif italic text-xl text-white/80 outline-none md:text-2xl"
>
  <KaraokeTextReveal
    text="Based on how you're feeling..."
    revealDuration={1500}
  />
</h2>
```

**Changes:**
1. Remove `motion-safe:animate-fade-in` from the `<h2>` class
2. Wrap heading text in `KaraokeTextReveal` with `revealDuration={1500}`
3. No `onRevealComplete` needed — the heading has no dependent element to show after
4. The `KaraokeTextReveal` renders a `<span>` inside the `<h2>` — semantically correct

**Guardrails (DO NOT):**
- DO NOT change the auto-advance timer (5000ms)
- DO NOT change focus management (headingRef still gets focus)
- DO NOT change card stagger animation (cards still use their own `animate-fade-in` with delays)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| heading renders via KaraokeTextReveal | integration | "Based on how you're feeling..." words are in the DOM |
| reduced motion shows heading immediately | integration | With reduced motion, all words visible at once |
| existing card stagger animations unchanged | integration | Cards still get `animate-fade-in` with delays (regression check) |

**Expected state after completion:**
- [ ] Heading reveals word-by-word over 1500ms
- [ ] `motion-safe:animate-fade-in` removed from heading
- [ ] Cards still animate with stagger delays
- [ ] All existing MoodRecommendations tests pass

---

### Step 4: Integrate at Starting Point Quiz Result Verse

**Objective:** Add word-by-word reveal to the quiz result card's Bible verse.

**Files to modify:**
- `frontend/src/components/StartingPointQuiz.tsx` — Modify `ResultCard` component (lines 367-383)

**Details:**

The quiz result card becomes visible when `showResult` is true (when `currentQuestion >= QUIZ_QUESTIONS.length`). The reveal should start when the result card renders.

**Before:**
```tsx
<blockquote className={cn('mt-4 px-6 font-serif italic', isDark ? 'text-white/80' : 'text-text-dark')}>
  &ldquo;{destination.verse}&rdquo;
  <footer className={cn('mt-1 font-sans text-sm not-italic', isDark ? 'text-white/50' : 'text-text-light')}>
    &mdash; {destination.verseReference}
  </footer>
</blockquote>
```

**After:**
```tsx
<blockquote className={cn('mt-4 px-6 font-serif italic', isDark ? 'text-white/80' : 'text-text-dark')}>
  &ldquo;<KaraokeTextReveal
    text={destination.verse}
    revealDuration={2000}
    onRevealComplete={() => setReferenceVisible(true)}
  />&rdquo;
  <footer
    className={cn(
      'mt-1 font-sans text-sm not-italic transition-opacity duration-300',
      referenceVisible ? 'opacity-100' : 'opacity-0',
      isDark ? 'text-white/50' : 'text-text-light',
    )}
  >
    &mdash; {destination.verseReference}
  </footer>
</blockquote>
```

**Changes:**
1. Add `referenceVisible` state to `ResultCard` (boolean, default `false`)
2. Replace static verse text with `KaraokeTextReveal` at `revealDuration={2000}`
3. `onRevealComplete` sets `referenceVisible = true`
4. Verse reference footer starts at `opacity-0` and transitions to `opacity-100`
5. The reveal triggers on mount of `ResultCard` (which happens when quiz completes) — correct timing per spec

**Guardrails (DO NOT):**
- DO NOT add any animation to the result card heading/description — only the verse
- DO NOT change quiz scoring logic or question flow
- DO NOT change the quiz slide transitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| result verse renders via KaraokeTextReveal | integration | After completing quiz, verse words are in DOM |
| verse reference hidden until reveal completes | integration | Reference footer starts at opacity-0 |
| verse reference visible after reveal | integration | After advancing timers past 2000ms, reference has opacity-100 |
| reduced motion shows verse and reference immediately | integration | Both visible at once |

**Expected state after completion:**
- [ ] Quiz result verse reveals word-by-word over 2000ms
- [ ] Verse reference fades in after reveal completes
- [ ] All existing StartingPointQuiz tests pass

---

### Step 5: Integrate at Scripture Soaking Meditation Verse

**Objective:** Add word-by-word reveal to the soaking meditation verse display with a meditative ~300ms/word pace.

**Files to modify:**
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — Modify exercise screen blockquote (lines 124-133)

**Details:**

**Before:**
```tsx
<blockquote className="mx-auto max-w-2xl font-serif text-2xl leading-relaxed text-text-dark sm:text-3xl lg:text-4xl">
  &ldquo;{selectedVerse.text}&rdquo;
</blockquote>
<p className="mt-4 text-sm text-text-light">
  {selectedVerse.reference} WEB
</p>
```

**After:**
```tsx
<blockquote className="mx-auto max-w-2xl font-serif text-2xl leading-relaxed text-text-dark sm:text-3xl lg:text-4xl">
  &ldquo;<KaraokeTextReveal
    text={selectedVerse.text}
    msPerWord={300}
    onRevealComplete={() => setReferenceVisible(true)}
    key={selectedVerse.reference}
  />&rdquo;
</blockquote>
<p
  className={cn(
    'mt-4 text-sm text-text-light transition-opacity duration-300',
    referenceVisible ? 'opacity-100' : 'opacity-0',
  )}
>
  {selectedVerse.reference} WEB
</p>
```

**Changes:**
1. Add `referenceVisible` state to `ScriptureSoakingContent` (boolean, default `false`)
2. Replace static verse text with `KaraokeTextReveal` using `msPerWord={300}`
3. Add `key={selectedVerse.reference}` to force re-mount (and re-reveal) when verse changes
4. `onRevealComplete` sets `referenceVisible = true`
5. Reset `referenceVisible = false` when starting exercise (in `handleBegin`)
6. Reference fades in via CSS opacity transition

**Guardrails (DO NOT):**
- DO NOT change the meditation timer logic (pause/resume, progress bar, completion)
- DO NOT change the verse selection or "Try another" logic
- DO NOT change the pre-start screen or completion screen
- DO NOT change auth gating (Navigate redirect for logged-out users)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| verse renders via KaraokeTextReveal when exercise starts | integration | After selecting duration + Begin, verse words in DOM |
| uses msPerWord not revealDuration | integration | Component receives `msPerWord={300}` prop |
| verse reference hidden until reveal completes | integration | Reference at opacity-0 initially |
| new verse selection restarts reveal | integration | key change forces re-mount and re-reveal |
| reduced motion shows verse immediately | integration | All words visible, reference visible |

**Expected state after completion:**
- [ ] Soaking verse reveals at ~300ms per word
- [ ] Reference fades in after reveal completes
- [ ] Changing verse restarts the reveal
- [ ] Timer/pause/resume functionality unchanged

---

### Step 6: Integrate at Shared Verse Page

**Objective:** Add word-by-word reveal to the hero verse on the shared verse page.

**Files to modify:**
- `frontend/src/pages/SharedVerse.tsx` — Modify hero blockquote (lines 75-80)

**Details:**

**Before:**
```tsx
<blockquote className="mx-auto max-w-2xl font-serif text-xl leading-relaxed text-white sm:text-2xl lg:text-3xl">
  &ldquo;{verse.text}&rdquo;
</blockquote>
<p className="mt-3 text-sm text-white/80">
  {verse.reference} WEB
</p>
```

**After:**
```tsx
<blockquote className="mx-auto max-w-2xl font-serif text-xl leading-relaxed text-white sm:text-2xl lg:text-3xl">
  &ldquo;<KaraokeTextReveal
    text={verse.text}
    revealDuration={2500}
    onRevealComplete={() => setReferenceVisible(true)}
  />&rdquo;
</blockquote>
<p
  className={cn(
    'mt-3 text-sm text-white/80 transition-opacity duration-300',
    referenceVisible ? 'opacity-100' : 'opacity-0',
  )}
>
  {verse.reference} WEB
</p>
```

**Changes:**
1. Add `referenceVisible` state (boolean, default `false`)
2. Replace static verse text with `KaraokeTextReveal` at `revealDuration={2500}`
3. `onRevealComplete` sets `referenceVisible = true`
4. Reference starts hidden, fades in after reveal
5. Import `cn` from `@/lib/utils` and `KaraokeTextReveal` from `@/components/daily/KaraokeTextReveal`
6. The reveal starts on page load (component mount) — correct per spec

**Guardrails (DO NOT):**
- DO NOT change the hero gradient or branding text ("Worship Room")
- DO NOT change the Spotify embed section or CTAs below
- DO NOT change the "not found" state
- DO NOT change the skip-to-content link or footer

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| hero verse renders via KaraokeTextReveal | integration | Verse words present in DOM on page load |
| verse reference hidden until reveal completes | integration | Reference at opacity-0 initially |
| verse reference visible after reveal | integration | After 2500ms, reference at opacity-100 |
| reduced motion shows verse and reference immediately | integration | Both visible at once |
| "not found" state unchanged | regression | Invalid ID still shows "Verse not found" |

**Expected state after completion:**
- [ ] Shared verse page hero verse reveals word-by-word over 2500ms
- [ ] Reference fades in after reveal completes
- [ ] Words fade to white (correct for dark background — inherited from parent `text-white`)
- [ ] All existing SharedVerse tests pass

---

### Step 7: Verify Exclusions & Run Full Test Suite

**Objective:** Confirm that no excluded locations were affected and all tests pass.

**Files to check (NOT modify):**
- `frontend/src/components/daily/KaraokeText.tsx` — Must be unchanged
- `frontend/src/components/daily/PrayTabContent.tsx` — TTS KaraokeText usage must be unchanged
- `frontend/src/components/daily/CompletionScreen.tsx` — No verse display, must be unchanged
- `frontend/src/constants/crisis-resources.ts` — Crisis banner text must be unchanged

**Details:**

1. Run full test suite: `cd frontend && pnpm test`
2. Verify existing `KaraokeText.test.tsx` passes (4 tests — unchanged)
3. Verify all integration tests from Steps 2-6 pass
4. Verify no modifications to excluded files
5. Manual check: grep for `KaraokeTextReveal` to ensure it's only imported at the 5 planned locations

**Guardrails (DO NOT):**
- DO NOT modify any files in this step — this is verification only
- DO NOT add KaraokeTextReveal to any location not in the spec

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | regression | `pnpm test` passes with 0 failures |
| Existing KaraokeText unchanged | regression | `KaraokeText.test.tsx` 4 tests pass |
| No KaraokeTextReveal in excluded locations | verification | Grep confirms 5 import locations only |

**Expected state after completion:**
- [ ] All tests pass (existing + new)
- [ ] KaraokeTextReveal appears only at the 5 specified locations
- [ ] Existing KaraokeText (TTS mode) is completely untouched
- [ ] Crisis banner text has no animation delay

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create KaraokeTextReveal component + tests |
| 2 | 1 | Integrate at Mood Check-In verse display |
| 3 | 1 | Integrate at Mood Recommendations heading |
| 4 | 1 | Integrate at Starting Point Quiz result verse |
| 5 | 1 | Integrate at Scripture Soaking meditation verse |
| 6 | 1 | Integrate at Shared Verse page hero |
| 7 | 1-6 | Verify exclusions + full test suite |

Steps 2-6 depend only on Step 1 and are independent of each other.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create KaraokeTextReveal component | [COMPLETE] | 2026-03-19 | Created `components/daily/KaraokeTextReveal.tsx` (renders `<span>` root per Step 2 note) + `__tests__/KaraokeTextReveal.test.tsx` (13 tests). Removed unused `delay` variable caught by tsc. |
| 2 | Mood Check-In verse integration | [COMPLETE] | 2026-03-19 | Modified `MoodCheckIn.tsx`: replaced `<p>` verse with `<div>` + `KaraokeTextReveal` (2500ms), added `verseRevealed` state for reference fade-in. Updated 4 existing tests for split-text queries, added 3 new integration tests. |
| 3 | Mood Recommendations heading integration | [COMPLETE] | 2026-03-19 | Modified `MoodRecommendations.tsx`: replaced heading text with `KaraokeTextReveal` (1500ms), removed `motion-safe:animate-fade-in` from `<h2>`. Updated 2 existing tests for split-text queries, added 3 new integration tests. |
| 4 | Starting Point Quiz result verse integration | [COMPLETE] | 2026-03-19 | Modified `StartingPointQuiz.tsx`: added `referenceVisible` state to `ResultCard`, replaced static verse with `KaraokeTextReveal` (2000ms), reference footer fades in on complete. Updated 1 existing test, added 4 new integration tests. |
| 5 | Scripture Soaking meditation verse integration | [COMPLETE] | 2026-03-19 | Modified `ScriptureSoaking.tsx`: added `referenceVisible` state, replaced static verse with `KaraokeTextReveal` (msPerWord=300), added `key` for re-mount on verse change, reset in `handleBegin`. Created new test file `ScriptureSoaking-reveal.test.tsx` (3 tests). |
| 6 | Shared Verse page hero integration | [COMPLETE] | 2026-03-19 | Modified `SharedVerse.tsx`: added `referenceVisible` state, replaced static verse with `KaraokeTextReveal` (2500ms), reference fades in on complete. Added 5 new integration tests to existing test file. |
| 7 | Verify exclusions + full test suite | [COMPLETE] | 2026-03-19 | KaraokeText.tsx unchanged. 5 import locations confirmed. All excluded files unchanged. Fixed 1 broken assertion in `Dashboard.test.tsx` (split text query). Full suite: 2468 passed, 9 failed (all pre-existing in transition-animation + Accessibility tests). |
