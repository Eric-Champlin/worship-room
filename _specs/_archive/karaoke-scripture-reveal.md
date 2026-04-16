# Feature: KaraokeText Word-by-Word Scripture Reveal

## Overview

Bible verses in Worship Room appear at the most emotionally meaningful moments — after a mood check-in, during contemplative meditation, when a user shares a verse. Currently, these verses either fade in as a block or appear statically. This feature introduces a word-by-word reveal animation that transforms every meaningful verse display into a contemplative moment, as if the words are being spoken into existence one at a time.

The existing KaraokeText component (currently used only in the Pray tab for TTS-synced word highlighting) gains a new "reveal" mode that handles word-by-word fade-in without any TTS coupling. This reveal mode becomes the default scripture display animation throughout the app wherever a verse is presented as a spiritual moment rather than a reference.

This small animation change deepens the emotional impact of scripture across the entire app — every verse feels intentional and present, supporting the mission of creating a space for emotional healing through worship and scripture.

---

## User Stories

- As a **logged-in user** completing the daily mood check-in, I want the encouragement verse to appear word by word so that the moment feels contemplative and unhurried rather than abrupt.
- As a **visitor** taking the Starting Point Quiz, I want the result card's Bible verse to reveal word by word so that the verse feels like a personal message being delivered to me.
- As a **logged-in user** in Scripture Soaking meditation, I want the verse to reveal slowly, one word at a time, so that I can absorb each word as part of the contemplative exercise.
- As a **visitor** viewing a shared verse page, I want the hero verse to reveal word by word so that the verse feels alive and intentional when I arrive.
- As a **user who prefers reduced motion**, I want all verses to appear instantly and completely so that my accessibility preferences are respected.

---

## Requirements

### KaraokeText "Reveal" Mode

The existing KaraokeText component currently accepts `text`, `currentWordIndex`, and `className` props — it's designed for TTS-synced word highlighting. A new "reveal" mode must be created (either as a mode/variant on the existing component or as a sibling component) with the following behavior:

**Props for reveal mode:**
- `text` (string) — the verse text to reveal
- `revealDuration` (number, ms) — total time for the full reveal to complete. Per-word delay is calculated as `revealDuration / wordCount`
- `onRevealComplete` (optional callback) — fired when the last word has been revealed
- `className` (optional string) — applied to the container for font styling inheritance

**Animation per word:**
- Each word starts at `opacity: 0` and `translateY(4px)`
- Each word transitions to `opacity: 1` and `translateY(0)`
- The transition uses CSS transitions (not keyframe animations) triggered by adding a "revealed" class to each word's span sequentially
- Transition duration per word: 200ms ease-out (this is the individual word's fade-in duration, separate from the delay between words)
- Words are wrapped in `<span>` elements. The component does not set its own font — all typography is inherited from the parent element

**Timing calculation:**
- Per-word delay = `revealDuration / wordCount`
- Short verses (5 words at 2500ms duration): 500ms per word — feels deliberate and spacious
- Medium verses (15 words at 2500ms duration): ~167ms per word — feels natural and flowing
- Long verses (30+ words at 2500ms duration): ~83ms per word — still readable, compact but smooth
- The reveal completes at `revealDuration`, after which `onRevealComplete` fires

**Sequential reveal mechanism:**
- Use a `setTimeout` chain or `requestAnimationFrame` loop to sequentially add the "revealed" class to each word's span at the calculated interval
- Clean up all timeouts on unmount to prevent memory leaks

**No TTS coupling:**
- Reveal mode has no connection to the Read Aloud / TTS system
- No `currentWordIndex` prop in reveal mode
- No highlight-current-word behavior
- The existing TTS-synced mode remains untouched for the Pray tab's Read Aloud feature

### Location 1: Mood Check-In Verse Display

After the user selects a mood and optionally enters text, the encouragement verse currently fades in as a block (`motion-safe:animate-fade-in`). Replace the block fade-in with the word-by-word reveal.

- **Reveal duration**: 2500ms (leaves 500ms of the 3-second display duration for full visibility before auto-advance)
- **Apply to**: The verse text only (e.g., "The Lord is near to the brokenhearted, and saves those who have a crushed spirit.")
- **Do NOT apply to**: The verse reference below ("Psalm 34:18") — the reference should continue to fade in as a block after the verse reveal completes (or simultaneously with a simple opacity transition)
- **`onRevealComplete`**: Not strictly needed here — the auto-advance timer (3 seconds) already handles progression. But the reveal should complete before auto-advance fires.
- **Existing typography**: Italic serif (`font-serif italic`), `text-xl md:text-2xl`, `text-white/90` — the KaraokeText reveal must inherit this styling from its parent

### Location 2: Mood Recommendations Heading

The "Based on how you're feeling..." heading in the MoodRecommendations screen is not a Bible verse, but it is a meaningful transitional moment text displayed in Lora italic. Apply the word-by-word reveal to this heading to create visual continuity with the verse display phase that precedes it.

- **Reveal duration**: 1500ms (shorter — this is a heading, not scripture; the reveal should feel brisk)
- **Apply to**: The heading text "Based on how you're feeling..."
- **Existing typography**: Lora italic (`font-serif italic`), `text-xl md:text-2xl`, `text-white/80` — inherited from parent
- **Note**: This heading currently uses `motion-safe:animate-fade-in`. The word-by-word reveal replaces this animation.

### Location 3: Starting Point Quiz Result Verse

The quiz result card includes a blockquote Bible verse matched to the user's result. Currently rendered as static text within a `<blockquote>`.

- **Reveal duration**: 2000ms
- **Apply to**: The verse text within the blockquote only (e.g., "Come to me, all you who labor and are heavily burdened...")
- **Do NOT apply to**: The verse reference footer ("— Matthew 11:28")
- **Trigger**: The reveal should begin when the result card becomes visible (when the user sees their quiz result), not on page load
- **Existing typography**: Lora italic, theme-aware (dark: `text-white/80`, light: `text-text-dark`) — inherited from parent
- **The reference footer**: Fades in after the verse reveal completes (triggered by `onRevealComplete`)

### Location 4: Scripture Soaking Meditation Verse

The large centered verse displayed during the soaking meditation exercise. This is the most contemplative context in the app — the reveal should be noticeably slower.

- **Reveal duration**: Calculated at ~300ms per word (not a fixed total duration). For example, a 12-word verse takes ~3600ms to fully reveal. This creates a meditative pace.
- **Apply to**: The verse text in the `<blockquote>` only
- **Do NOT apply to**: The verse reference ("Psalm 23:1 WEB")
- **Trigger**: The reveal begins when the meditation session starts (the soaking timer begins)
- **Existing typography**: Lora, `text-2xl sm:text-3xl lg:text-4xl`, `text-text-dark` — the largest verse typography in the app. The reveal must handle this large text gracefully.
- **The reference**: Fades in after the verse reveal completes

### Location 5: Shared Verse Page (/verse/:id)

The hero verse display on the shareable verse landing page. Currently rendered as a static `<blockquote>`.

- **Reveal duration**: 2500ms
- **Apply to**: The verse text in the hero section only
- **Do NOT apply to**: The verse reference ("John 3:16 WEB")
- **Trigger**: The reveal begins immediately on page load (this is the hero content — the user came here to see this verse)
- **Existing typography**: Lora, `text-xl sm:text-2xl lg:text-3xl`, `text-white` — white text on dark gradient background. The reveal must handle the dark-on-light theme correctly (words start invisible and fade to white, not to dark text).
- **The reference**: Fades in after the verse reveal completes

### Location 6: Meditation Completion Screen

The current CompletionScreen component does NOT display a Bible verse — it shows a "Well done!" title with CTA links. **No KaraokeText reveal is needed here.** This location is excluded from the scope.

---

## Exclusion List (Do NOT Apply KaraokeText)

The following verse displays must remain as-is (static text or existing animations):

- **Verse references** — Only the verse text gets the reveal. References like "— Psalm 34:18" are always static or simple fade-in
- **Verses in lists or grids** — The Psalm Reading psalm selection screen shows multiple verses in a selectable list. No reveal.
- **Inline verse callouts in meditation step prompts** — The ACTS Prayer Walk has supporting verses alongside step instructions. These are reference context, not contemplative moments. No reveal.
- **Crisis banner resource text** — The crisis resource banner text is safety-critical information that must be immediately visible. No animation delay.
- **Prayer text in Pray tab** — The existing KaraokeText usage in PrayTabContent stays as-is (TTS-synced highlighting mode, not reveal mode)
- **Scripture Readings in Sleep panel** — The ScriptureTextPanel in the audio player has its own progressive highlighting system. No change.
- **Scripture Connections in Insights** — These show references only (not full verse text). No reveal.

---

## Accessibility

### prefers-reduced-motion (MANDATORY)

When `prefers-reduced-motion: reduce` is active:
- The entire verse text appears instantly at full opacity with no word-by-word animation
- The `onRevealComplete` callback fires immediately (synchronously or on next tick)
- No `setTimeout` chains are created
- All locations render identically to the current behavior (no regression)

### Screen Reader Behavior

- The full verse text must be available to screen readers from the start — the word-by-word animation is purely visual
- The container should use `aria-label` with the full verse text, or the text should be available in the DOM from mount (with individual words starting at `opacity: 0` but not `display: none` or `visibility: hidden`)
- Words at `opacity: 0` with `translateY(4px)` are still in the DOM and accessible to assistive technology — this is the correct approach
- Do NOT use `aria-hidden` on unrevealed words

### Focus Management

- No focus changes are introduced by the reveal animation
- Existing focus management (e.g., mood check-in's heading focus, recommendation heading focus) remains unchanged

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature does not add any user text input. All text being revealed is either hardcoded verse constants or existing content.
- **User input involved?**: No
- **AI-generated content?**: No — all verses are hardcoded WEB translation constants or static mock data
- **Crisis banner interaction**: The reveal animation is explicitly excluded from the crisis resource banner. Crisis text must always be immediately visible.

---

## Auth & Persistence

This is a purely visual animation enhancement. No data is read, written, or persisted.

### Logged-out users (demo mode):
- See the KaraokeText reveal on the Starting Point Quiz result verse and the Shared Verse page (/verse/:id) — both are public routes
- Zero data persistence. Zero cookies.

### Logged-in users:
- See the KaraokeText reveal on all 5 locations (mood check-in verse, recommendations heading, quiz result, Scripture Soaking, shared verse page)
- No new data saved. No localStorage changes.

### Route type:
- No new routes. This modifies existing components across multiple routes.

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Mood check-in verse reveal | Not visible (landing page shown at `/`) | Word-by-word reveal over 2.5s |
| Recommendations heading reveal | Not visible (landing page shown at `/`) | Word-by-word reveal over 1.5s |
| Quiz result verse reveal | Word-by-word reveal over 2s | Word-by-word reveal over 2s |
| Scripture Soaking verse reveal | Not visible (redirects to `/daily?tab=meditate`) | Word-by-word reveal at ~300ms/word |
| Shared verse page reveal | Word-by-word reveal over 2.5s | Word-by-word reveal over 2.5s |

---

## UX & Design Notes

### Tone

The word-by-word reveal should feel like words being gently spoken — each one arriving with intention. This is not a typewriter effect (no cursor, no typing sound association). It's closer to words materializing out of a quiet space, like ink appearing on paper.

### Visual Design

- **Word transition**: Each word fades from fully transparent (`opacity: 0`) to fully visible (`opacity: 1`) with a subtle upward micro-motion (`translateY 4px → 0`). The translateY creates a sense of the word "settling into place."
- **No cursor or caret**: Unlike a typewriter effect, there is no blinking cursor following the reveal
- **No highlight on current word**: Unlike the existing TTS mode, reveal mode does not highlight the most recently revealed word. Once a word is revealed, it stays at full opacity.
- **Font styling inheritance**: The KaraokeText reveal component renders `<span>` elements for each word. All typography (font family, size, weight, style, color) is inherited from the parent element. The component itself applies no font styles.
- **Word spacing**: Words should maintain natural spacing (`white-space: normal`). The span wrapping should not introduce visual artifacts or unexpected line breaks.

### Design System Recon References

- **Mood check-in verse**: Matches existing verse styling from design system recon — italic serif, `text-white/90`, centered
- **Quiz result verse**: Matches existing blockquote styling — Lora italic, theme-aware colors
- **Scripture Soaking verse**: Matches existing soaking verse styling — Lora, `text-2xl` to `text-4xl` responsive
- **Shared verse page**: Matches existing hero verse styling — Lora, white text on dark gradient
- **Recommendations heading**: Matches existing heading styling — Lora italic, `text-white/80`
- **No new visual patterns**: All typography and color values are inherited from existing components. The only new visual behavior is the opacity/translateY transition on individual word spans.

### Responsive Behavior

The KaraokeText reveal animation is identical across all breakpoints. Font size changes at different breakpoints are handled by the parent element's responsive classes, not by the reveal component.

#### Mobile (< 640px)
- Same reveal timing and animation as desktop
- Verse text wraps naturally within the parent's width constraints
- Word spans respect the parent's `text-center` or other alignment

#### Tablet (640px-1024px)
- Same reveal timing and animation as desktop
- Larger font sizes (responsive classes on parent) are inherited by word spans

#### Desktop (> 1024px)
- Same reveal timing and animation as desktop
- Widest text layout — more words per line, same per-word reveal timing

No breakpoint-specific animation adjustments. The reveal is purely about timing, not layout.

---

## Edge Cases

- **Very short verses** (e.g., "Be still, and know that I am God." — 9 words at 2500ms = ~278ms/word): Feels spacious and deliberate. Acceptable.
- **Very long verses** (e.g., 30+ words at 2500ms = ~83ms/word): Still readable, each word has its micro-animation. If the per-word delay drops below 50ms, the reveal may feel more like a shimmer than individual words appearing. This is acceptable — the overall effect still reads as word-by-word.
- **Component unmount during reveal** (e.g., user skips mood check-in during verse display): All setTimeout chains must be cleaned up on unmount. No stale state updates.
- **Verse text with special characters** (e.g., em dashes, quotation marks, ellipses): Split on whitespace. Punctuation stays attached to its word (e.g., "brokenhearted," is one word-span including the comma).
- **Empty text**: If `text` is empty or undefined, render nothing. Do not crash.
- **Re-renders with same text**: If the component re-renders with the same `text` prop, do not restart the reveal animation. Use a ref to track whether the reveal has already completed for the current text.
- **Re-renders with different text**: If the `text` prop changes, restart the reveal from the beginning with the new text.
- **Scripture Soaking verse change**: If the user selects a different verse during meditation, the reveal restarts for the new verse.

---

## Out of Scope

- **TTS integration with reveal mode** — The reveal mode is independent of the Read Aloud / TTS system. No synchronization between reveal timing and TTS playback.
- **Sound effects** — No audio accompaniment for the word reveal (no chime, no whisper sound)
- **Configurable reveal speed per user** — No settings or preferences for reveal speed. Timing is hardcoded per location.
- **Backend changes** — No API work. This is entirely frontend.
- **New routes** — No new routes created.
- **New localStorage keys** — No data persistence added.
- **Prayer Wall verse displays** — Prayer Wall posts may contain verse references, but these are user-generated text displayed in cards, not contemplative verse moments. No reveal.
- **Verse of the Day on dashboard** — If a Verse of the Day widget is added to the dashboard in a future spec, it would be a natural candidate for KaraokeText reveal, but it is not part of this spec.
- **Exit/fade-out animation** — This spec covers the reveal (entrance) only. How the verse fades out (e.g., mood check-in's auto-advance fade) is unchanged.

---

## Acceptance Criteria

### KaraokeText Reveal Mode

- [ ] A "reveal" mode exists (either as a mode on the existing KaraokeText component or as a new sibling component) that renders text word-by-word with fade-in animation
- [ ] Reveal mode accepts `text` (string), `revealDuration` (number, ms), and optional `onRevealComplete` (callback) props
- [ ] Each word is wrapped in a `<span>` element
- [ ] Each word transitions from `opacity: 0, translateY(4px)` to `opacity: 1, translateY(0)` with 200ms ease-out transition
- [ ] Per-word delay is calculated as `revealDuration / wordCount`
- [ ] `onRevealComplete` fires after the last word is revealed
- [ ] All timeouts are cleaned up on component unmount (no memory leaks, no stale state updates)
- [ ] Component does not set its own font styles — typography is fully inherited from parent
- [ ] Word spacing matches natural text rendering (no visual artifacts from span wrapping)
- [ ] Empty or undefined `text` renders nothing without error
- [ ] Re-render with same `text` does not restart the reveal

### prefers-reduced-motion

- [ ] When `prefers-reduced-motion: reduce` is active, all verse text appears instantly at full opacity with no word-by-word animation at ALL 5 locations
- [ ] `onRevealComplete` fires immediately when reduced motion is preferred
- [ ] No `setTimeout` chains are created when reduced motion is preferred

### Screen Reader Accessibility

- [ ] Full verse text is available in the DOM from mount (words at `opacity: 0` are in the DOM, not removed or `aria-hidden`)
- [ ] Screen readers can access the complete verse text without waiting for the reveal animation

### Location 1: Mood Check-In Verse

- [ ] After mood selection and optional text input, the encouragement verse reveals word-by-word over 2500ms (not a block fade-in)
- [ ] The verse reference (e.g., "Psalm 34:18") appears via simple fade-in after or during the verse reveal — not word-by-word
- [ ] The 3-second auto-advance timer still works correctly (verse reveal completes within 2.5s, leaving 0.5s of full visibility)
- [ ] Existing verse typography is preserved: italic serif, `text-xl md:text-2xl`, `text-white/90`, centered

### Location 2: Mood Recommendations Heading

- [ ] The "Based on how you're feeling..." heading reveals word-by-word over 1500ms
- [ ] Replaces the existing `motion-safe:animate-fade-in` on this heading
- [ ] Existing heading typography is preserved: Lora italic, `text-xl md:text-2xl`, `text-white/80`

### Location 3: Starting Point Quiz Result Verse

- [ ] The quiz result verse reveals word-by-word over 2000ms when the result card becomes visible
- [ ] The verse reference footer fades in after the verse reveal completes
- [ ] Existing blockquote typography is preserved: Lora italic, theme-aware colors
- [ ] The reveal does not play on page load — only when the result card is shown

### Location 4: Scripture Soaking Meditation Verse

- [ ] The soaking verse reveals at ~300ms per word (total duration varies by verse length)
- [ ] The verse reference fades in after the verse reveal completes
- [ ] Existing typography is preserved: Lora, `text-2xl sm:text-3xl lg:text-4xl`, `text-text-dark`
- [ ] If the user selects a different verse, the reveal restarts for the new verse

### Location 5: Shared Verse Page

- [ ] The hero verse reveals word-by-word over 2500ms on page load
- [ ] The verse reference fades in after the verse reveal completes
- [ ] Existing typography is preserved: Lora, `text-xl sm:text-2xl lg:text-3xl`, `text-white`
- [ ] Words fade in to white (not dark text) — correct for the dark gradient background

### Exclusions Verified

- [ ] Verse references are never word-by-word revealed — always simple fade-in or static
- [ ] Crisis banner text is never animated with word-by-word reveal
- [ ] Pray tab KaraokeText (TTS mode) is unchanged
- [ ] Psalm Reading list verses are unchanged
- [ ] ACTS Prayer Walk supporting verses are unchanged
- [ ] Sleep panel ScriptureTextPanel is unchanged

### Visual Verification

- [ ] Word-by-word reveal is visually perceptible at normal speed — individual words appear sequentially, not as a shimmer or block
- [ ] The 4px translateY micro-motion is subtle — words settle gently into place, not bounce or jump
- [ ] No visual artifacts from span wrapping (no unexpected gaps, no broken line wrapping, no inconsistent spacing)
- [ ] Long verses (30+ words) still feel natural at faster per-word rates
- [ ] Short verses (5 words) feel deliberate at slower per-word rates
- [ ] Verse text centering is maintained (centered verses don't shift or reflow as words appear)
