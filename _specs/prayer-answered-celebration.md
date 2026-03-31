# Feature: Prayer Answered Celebration + Testimony Share Card

**Master Plan Reference:** N/A — standalone feature

---

## Overview

When a user marks a prayer as answered, it's potentially the most emotionally charged moment in the entire app — someone's faith was confirmed, God responded. Currently, this moment gets the same generic confetti overlay used for badge unlocks. No unique visual treatment, no scripture, no share action. This spec gives the answered prayer moment its own celebration and adds a shareable testimony card so users can tell the world "God answered my prayer."

## User Story

As a **logged-in user**, I want to **see a unique, warm golden celebration with scripture when I mark a prayer as answered, and share a beautiful testimony card** so that **this sacred moment feels as emotionally significant as it truly is, and I can tell others about God's faithfulness**.

## Context

Agent 5 rated the current Prayer Answered celebration at 6/10 — "Same visual as badge — needs unique warmth." The synthesis identified this as Enhancement Opportunity #1.

The verse share canvas system (4 templates x 3 sizes) is production-quality and already generates beautiful, Instagram-worthy images. It should be the template for testimony cards.

**Current flow (underwhelming):**
1. User goes to My Prayers page
2. Taps "Mark as Answered" on a prayer
3. Fills in the MarkAsAnsweredForm (optional testimony text)
4. `PrayerAnsweredCelebration` overlay appears — same purple confetti + backdrop blur as badge celebrations
5. "Praise God!" heading, prayer topic text, "Close" button
6. No share action. No scripture. No unique visual. No sound distinct from badges.

**Target flow (remarkable):**
1. Same steps 1-3
2. A unique golden celebration appears — warm amber/gold wash, NOT purple confetti
3. A scripture about God's faithfulness fades in
4. The harp sound effect plays
5. The user sees their prayer topic with a "God answered" message
6. A "Share Your Testimony" button generates a beautiful testimony card
7. The card can be shared to social media, messages, or copied as an image

## Requirements

### 1. Unique Celebration Overlay

**Replace the generic celebration in `PrayerAnsweredCelebration` with a unique golden treatment:**

**Background:**
- Warm golden radial gradient instead of the purple backdrop used for badges
- `background: radial-gradient(ellipse at center, rgba(217, 119, 6, 0.15) 0%, rgba(13, 6, 32, 0.95) 60%)` — amber glow fading to dark
- `backdrop-blur-xl` — keep the blur

**Particles/confetti:**
- Replace purple confetti with golden sparkle particles — warm amber/gold colors (`#D97706`, `#F59E0B`, `#FBBF24`) instead of the purple palette
- Fewer, slower particles — this is a sacred moment, not a party. Think candlelight flicker, not confetti cannon
- If the current confetti is CSS-only (`animate-confetti-fall`), create a variant with gold colors and slower timing (3-4s instead of 2s)

**Layout (centered, full-screen overlay):**

```
[Golden radial gradient background with slow sparkle particles]

                    [sparkle icon]

          God Answered Your Prayer

     "[prayer topic / title from the form]"

   "The Lord has heard my cry for mercy;
    the Lord accepts my prayer."
              -- Psalm 6:9

        [Share Your Testimony]  [Close]
```

**Typography:**
- "God Answered Your Prayer" — `text-white text-2xl sm:text-3xl font-bold` (Inter, not Caveat — this is a declaration, not a greeting)
- Prayer topic — `text-white/80 text-lg font-serif italic` in quotes, Lora italic
- Scripture — `text-white/60 text-base font-serif italic mt-6` — Lora italic, smaller than the prayer topic
- Scripture reference — `text-white/50 text-sm mt-1`

**Scripture selection:**
Pick one random scripture about God's faithfulness each time. Use WEB translation. Store 6 options:

1. "The Lord has heard my cry for mercy; the Lord accepts my prayer." — Psalm 6:9
2. "You will call on me and come and pray to me, and I will listen to you." — Jeremiah 29:12
3. "Before they call, I will answer; and while they are yet speaking, I will hear." — Isaiah 65:24
4. "The righteous cry out, and the Lord hears, and delivers them out of all their troubles." — Psalm 34:17
5. "Cast your burden on the Lord, and he will sustain you." — Psalm 55:22
6. "Every good gift and every perfect gift is from above, coming down from the Father of lights." — James 1:17

Randomize the selection — don't show the same verse every time. Use `Math.random()` on mount.

### 2. Sound Effect

- Play the `harp` sound effect when the celebration overlay appears
- The harp sound is already defined in `sound-effects.ts` and is already mapped to prayer answered in `MyPrayers.tsx`
- Verify the harp still plays (it may already work from the existing implementation). If it's playing on form submit but not on the overlay appear, move the trigger to the overlay mount
- Respect `wr_sound_effects_enabled` and `prefers-reduced-motion`

### 3. Animation Timing

The celebration should unfold as a sequence, not appear all at once:

1. **0ms:** Golden backdrop fades in (300ms)
2. **300ms:** Sparkle particles begin (slow drift)
3. **500ms:** "God Answered Your Prayer" heading fades in + slight Y-translate up (300ms)
4. **900ms:** Prayer topic text fades in (300ms)
5. **1400ms:** Scripture fades in (400ms — slower, reverential)
6. **2000ms:** "Share Your Testimony" and "Close" buttons fade in (200ms)
7. **Harp sound plays at 300ms** (when the heading starts appearing)

All animations respect `prefers-reduced-motion` — if reduced motion, show everything immediately.

Auto-dismiss: do NOT auto-dismiss this overlay. This is a sacred moment. The user closes it when they're ready via the "Close" button or by tapping outside the content area. The dismiss button appears after 2 seconds so the user has time to absorb the moment before seeing the exit.

### 4. Shareable Testimony Card

**"Share Your Testimony" button** generates a canvas image and opens the share flow.

**Card design (canvas-rendered, similar to verse share cards):**

```
+--------------------------------------+
|                                      |
|          God Answered                |
|                                      |
|    "[prayer topic / title]"          |
|                                      |
|    "[user's testimony text           |
|     if they provided one]"           |
|                                      |
|    -----------------------           |
|                                      |
|    "The Lord has heard my cry        |
|     for mercy; the Lord accepts      |
|     my prayer." -- Psalm 6:9        |
|                                      |
|              Worship Room            |
|                                      |
+--------------------------------------+
```

**Canvas implementation:**
- Extend the existing `verse-card-canvas.ts` system OR create a new `testimony-card-canvas.ts` following the same patterns
- Background: dark gradient with golden accent (match the celebration overlay's warm palette)
- Text rendering: same canvas text rendering approach as verse cards (font loading, word wrapping, dynamic sizing)
- Watermark: "Worship Room" at the bottom — same treatment as verse cards
- Size options: match the verse card sizes — Square (1080x1080), Story (1080x1920), Wide (1920x1080)

**Card content:**
- "God Answered" heading — centered, bold
- Prayer topic in quotes — Lora italic
- Testimony text (if provided) — smaller, below the topic. If no testimony text was entered, omit this section
- A scripture verse (same one shown in the overlay) — small, italic, near the bottom
- "Worship Room" watermark — bottom center

**Share flow:**
- Use the same `SharePanel` component used for verse sharing
- Share options: Copy image, Download, Web Share API (native share sheet on mobile)
- If the user doesn't want to share, they just tap "Close" — sharing is optional, never forced

### 5. Integration with Existing Components

The `MarkAsAnsweredForm` component (in `components/prayer-wall/`) collects:
- Confirmation that the prayer is answered
- Optional testimony text (how God answered)

After the form is submitted:
1. The form closes
2. The prayer is marked as answered in the data
3. `PrayerAnsweredCelebration` mounts with the prayer data (topic, testimony text)
4. The celebration overlay plays the full sequence
5. The "Share Your Testimony" button generates a card using the prayer topic + testimony text

**Key existing files:**
- `components/my-prayers/PrayerAnsweredCelebration.tsx` — main celebration overlay (redesign target)
- `components/prayer-wall/MarkAsAnsweredForm.tsx` — form component (verify it passes data correctly)
- `components/sharing/SharePanel.tsx` — share UI (may need minor extension for testimony cards)
- `lib/verse-card-canvas.ts` — canvas rendering reference implementation
- `lib/challenge-share-canvas.ts` — another canvas rendering reference

### 6. Data Flow

The testimony card needs access to:
- **Prayer topic/title** — from the prayer item data, already available in MyPrayers page state
- **Testimony text** — from the MarkAsAnsweredForm submission, passed to the celebration component
- **Scripture verse** — randomly selected from the constants, stored in celebration component state
- **User name** — omit from the card. The card should be about God's faithfulness, not personal attribution

## Auth Gating

This feature is entirely within the My Prayers page, which is auth-gated. No logged-out user can reach it.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View My Prayers page | Redirected (auth-gated route) | Full access | N/A |
| Mark prayer as answered | Cannot access | Opens MarkAsAnsweredForm | N/A |
| See celebration overlay | Cannot access | Overlay plays after marking as answered | N/A |
| Share testimony card | Cannot access | Generates canvas image + SharePanel | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Overlay fills viewport. Content stacks vertically with `px-6`. Heading is `text-2xl`. Buttons stack vertically, full-width, min-height 44px. Scripture wraps naturally. |
| Tablet (640-1024px) | Overlay fills viewport. Content max-width ~500px centered. Heading is `text-3xl`. Buttons side-by-side. |
| Desktop (> 1024px) | Overlay fills viewport. Content max-width ~500px centered. Heading is `text-3xl`. Buttons side-by-side. |

- Buttons must be at least 44px tall on all breakpoints (touch target requirement)
- Testimony card canvas sizes are fixed (1080x1080, 1080x1920, 1920x1080) regardless of viewport
- On mobile, the share panel should use the native Web Share API when available for a better experience

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The testimony text is user-authored (already handled by the existing MarkAsAnsweredForm) and the scripture verses are hardcoded constants using WEB translation. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Cannot access (My Prayers is a protected route)
- **Logged-in users:** Prayer answered status is persisted to `wr_prayer_list` in localStorage. The celebration is transient (not persisted). The generated testimony card image is ephemeral (generated on-demand, not stored).
- **Route type:** Protected (accessed via `/my-prayers`)
- **localStorage usage:** Reads from `wr_prayer_list` (existing). No new localStorage keys introduced.

## Completion & Navigation

N/A — standalone feature on the My Prayers page, not part of Daily Hub tabs.

## Design Notes

- **Golden palette is NEW for this feature** — the app currently has no amber/gold treatment. The golden radial gradient (`rgba(217, 119, 6, 0.15)` amber glow fading to `rgba(13, 6, 32, 0.95)` hero-dark) and gold particle colors (`#D97706`, `#F59E0B`, `#FBBF24`) are new visual patterns not captured in the design system recon. These should be marked `[UNVERIFIED]` during planning until visually confirmed.
- **Existing patterns to match:** The overlay structure (full-screen, backdrop-blur, centered content, close button) should follow the same pattern as `CelebrationOverlay` used for badge celebrations — same z-index, focus trap, dismiss behavior. The visual TREATMENT changes (golden vs purple) but the structural pattern stays the same.
- **Typography:** Use Lora (serif) for scripture and prayer topic text, Inter for the heading and buttons — consistent with the design system's font usage conventions.
- **Canvas testimony card:** Follow the exact same canvas rendering patterns from `verse-card-canvas.ts` — font loading, word wrapping, dynamic sizing, watermark positioning. The only differences are the golden background gradient and the content layout (heading + topic + testimony + scripture vs. just verse text + reference).
- **Share panel:** The existing `SharePanel` component handles canvas image sharing. Verify it accepts a custom canvas or image blob; if it's tightly coupled to verse card data, it may need a minor interface extension to accept testimony card data.
- **Sound:** The `harp` sound from `sound-effects.ts` is appropriate for this sacred moment. It's already mapped to prayer answered events — just verify the trigger timing aligns with the overlay mount (300ms into the sequence).
- **Confetti animation:** The existing `animate-confetti-fall` is CSS-only. A gold variant needs different colors and slower timing. This is a new animation keyframe variant.

## Out of Scope

- Sharing answered prayers to the Prayer Wall (would require a "public testimony" concept)
- Answered prayer history view or timeline
- Push notifications about answered prayers
- Changing the MarkAsAnsweredForm UI
- Extending share to other celebration types (badges, streaks) — that's a separate spec
- Social media deep-link previews for shared testimony cards (would require backend OG tags)
- Adding golden treatment to any other celebration type

## Acceptance Criteria

### Celebration Overlay
- [ ] Prayer Answered celebration has a unique golden visual treatment — NOT the same purple confetti as badges
- [ ] Golden radial gradient background renders (warm amber `rgba(217,119,6,0.15)` center, fading to dark `rgba(13,6,32,0.95)`)
- [ ] Sparkle particles are gold/amber colored (`#D97706`, `#F59E0B`, `#FBBF24`) and slower than badge confetti (3-4s vs 2s)
- [ ] "God Answered Your Prayer" heading displays in Inter bold, `text-2xl` on mobile / `text-3xl` on desktop
- [ ] Prayer topic text displays in Lora italic with quotes
- [ ] A random scripture about God's faithfulness appears from the 6-verse WEB set
- [ ] Scripture reference appears below the verse text in smaller, muted text
- [ ] All scriptures use WEB translation

### Sound & Animation
- [ ] Harp sound effect plays at 300ms into the sequence (respects `wr_sound_effects_enabled` and `prefers-reduced-motion`)
- [ ] Animation sequence unfolds over ~2 seconds (backdrop -> heading -> topic -> scripture -> buttons)
- [ ] `prefers-reduced-motion` disables all animations — all content shows immediately
- [ ] Overlay does NOT auto-dismiss — user closes manually
- [ ] "Close" button appears after 2 seconds (immediate if reduced motion)
- [ ] "Close" button and backdrop click both dismiss the overlay

### Testimony Card & Sharing
- [ ] "Share Your Testimony" button generates a canvas-rendered testimony card
- [ ] Testimony card includes: "God Answered" heading, prayer topic in quotes, scripture verse + reference, "Worship Room" watermark
- [ ] Testimony card includes testimony text (if user provided one in the form)
- [ ] Testimony card renders correctly without testimony text (topic + scripture only)
- [ ] Card is available in at least Square (1080x1080) size. Story (1080x1920) and Wide (1920x1080) are bonus.
- [ ] Card background uses dark gradient with golden accent (matching the overlay palette)
- [ ] Share flow uses the existing `SharePanel` component (or compatible pattern)
- [ ] Share options include: copy image, download, native share (Web Share API)

### Accessibility
- [ ] Focus is trapped in the celebration overlay (using existing `useFocusTrap` pattern)
- [ ] Overlay content is announced to screen readers via `aria-live="polite"` region
- [ ] "Share Your Testimony" and "Close" buttons are keyboard accessible with 44px minimum touch targets
- [ ] All overlay text is readable by screen readers

### Responsive
- [ ] Mobile (375px): overlay content fits without overflow, buttons stack vertically, all tappable at 44px+
- [ ] Desktop (1440px): overlay is centered with ~500px max-width content area

### Preservation
- [ ] Existing prayer answered functionality is preserved (prayer marked as answered, faith points awarded, badge triggers checked)
- [ ] `recordActivity` or equivalent still fires on answered prayer (verify existing behavior)
- [ ] All existing PrayerAnsweredCelebration tests still pass (or are updated to match the new design)

## Test Requirements

- Verify celebration overlay renders with golden treatment (not purple)
- Verify a scripture appears and is from the 6-verse WEB faithfulness set
- Verify harp sound plays (mock audio in test)
- Verify animation sequence timing (or verify all elements render with reduced motion)
- Verify "Share Your Testimony" button generates a canvas image
- Verify testimony card includes prayer topic text
- Verify testimony card includes testimony text when provided
- Verify testimony card renders without testimony text when not provided
- Verify overlay traps focus
- Verify overlay dismisses on "Close" and backdrop click
- Verify existing prayer answered tests still pass
- Verify gamification: `recordActivity` still fires, badges still trigger
