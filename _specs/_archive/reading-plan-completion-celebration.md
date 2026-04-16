# Feature: Reading Plan Completion Celebration

**Master Plan Reference:** N/A — standalone enhancement feature

---

## Overview

Finishing a multi-day reading plan (7, 14, or 21 days of daily scripture, reflection, and prayer) is a significant spiritual accomplishment — a sustained commitment to growing in God's word. Currently, the last day of a plan gets the same inline checkmark and "+15 pts" treatment as any other day, followed by a basic completion overlay with confetti, a single scripture quote, and a "Browse more plans" button. There's no acknowledgment of the journey's scope — no stats, no shareable moment, no sound effect, no staggered reveal. This spec transforms the plan completion into a full celebratory experience with journey stats, a shareable completion card, sound effects, and a polished animation sequence.

## User Stories

- As a **logged-in user** who just completed the final day of a reading plan, I want a meaningful celebration that reflects the scope of my accomplishment so that I feel the spiritual weight of finishing what I started.
- As a **logged-in user** celebrating a plan completion, I want to share a beautiful completion card so that I can encourage others and mark this milestone.
- As a **logged-in user** who just finished a plan, I want to see my journey stats (days completed, points earned) and next-step suggestions so that I feel accomplished and know where to go next.

## Requirements

### Functional Requirements

#### 1. Enhanced Plan Completion Overlay

The existing `PlanCompletionOverlay` component renders when the last day of a reading plan is completed. Enhance it with:

1. **Journey stats section** showing:
   - Days completed count (e.g., "21 days completed")
   - Start date and finish date (e.g., "Started March 10 - Finished March 31") — derive start date from the earliest completed day in `wr_reading_plan_progress` for this plan. If unavailable, omit the date range and show only the days count.
   - Total faith points earned (e.g., "+315 faith points earned") — calculated as `totalDays x 15` (the base `readingPlan` activity award from `ACTIVITY_POINTS`)

2. **Scripture from a curated set** about the value of God's word (WEB translation), randomly selected per completion:
   - "All Scripture is inspired by God and profitable for teaching, for reproof, for correction, and for instruction in righteousness." — 2 Timothy 3:16
   - "Your word is a lamp to my feet, and a light for my path." — Psalm 119:105
   - "The word of God is living and active, and sharper than any two-edged sword." — Hebrews 4:12
   - "Heaven and earth will pass away, but my words will not pass away." — Matthew 24:35

3. **Three CTA buttons** (replacing the current single button):
   - **Browse Plans** — navigates to `/grow?tab=plans`
   - **Share** — generates and shares a canvas completion card (see requirement 3)
   - **Done** — closes the overlay, returns to plan detail page

4. **`ascending` sound effect** plays when the overlay heading appears. Respects `wr_sound_effects_enabled` and `prefers-reduced-motion` via the existing `useSoundEffects` hook.

5. **Staggered animation sequence:**
   - 0ms: Backdrop fades in (300ms)
   - 300ms: Confetti particles begin
   - 500ms: Icon and "Plan Complete!" heading fade in with slight upward translate (300ms)
   - 900ms: Plan title fades in (200ms)
   - 1200ms: Stats card fades in (300ms)
   - 1700ms: CTA buttons fade in (200ms)
   - Sound plays at 500ms (when heading appears)
   - All animations collapse to immediate render when `prefers-reduced-motion` is active

6. **Auto-dismiss after 15 seconds** with graceful fade-out. Manual dismiss via close button or "Done" CTA at any time.

#### 2. Trigger Sequence

The existing flow already triggers `PlanCompletionOverlay` after the inline `DayCompletionCelebration` on the last day. Ensure:

1. The inline day celebration (`DayCompletionCelebration`) renders for ~1.5 seconds before the overlay mounts
2. The overlay receives: plan title, total days, plan ID, and start date (if derivable from progress data)
3. Completing a non-last day continues to show only the inline day celebration (no overlay)

#### 3. Shareable Completion Card

Generate a canvas image celebrating the plan completion, following the same canvas rendering pattern used by `challenge-share-canvas.ts`:

1. **Card content:** "Plan Complete" header, plan title in quotes, days completed + points earned, one of the 4 curated scriptures (randomly selected), "Worship Room" watermark
2. **Card design:** Dark gradient background with subtle purple accent, matching the app's visual identity
3. **Sizes:** 1080x1080 (square) as primary. 1080x1920 (story) if straightforward to add.
4. **Share flow:** Use the Web Share API with clipboard/download fallback — following the same share pattern as the existing challenge share implementation. Options: copy image, download, native share.

#### 4. Plan Progress State Verification

When the last day is completed:

1. The plan's progress state in `wr_reading_plan_progress` should reflect 100% completion (all days marked done)
2. The `ReadingPlanWidget` on the dashboard should show the completed state for this plan
3. The plan detail page should show a "Completed" state when the user returns (not prompt Day 1 again)
4. `recordActivity('readingPlan')` continues to fire on last day completion as it does for any day
5. Existing badge triggers (`first_plan`, `plans_3`, `plans_10`) continue to work through the badge engine

### Non-Functional Requirements

- **Performance:** Canvas image generation should complete within 500ms on modern devices
- **Accessibility:** Overlay traps focus via `useFocusTrap`, all content readable by screen readers, Escape key dismisses, focus restores to trigger element on close
- **Reduced motion:** All animations disabled, content shown immediately, confetti hidden, sound still plays (sound is not motion)

## Auth Gating

This feature is entirely within the reading plan detail page, which is part of the authenticated experience.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Complete final day | Reading plans require login to track progress; logged-out users cannot reach this state | Full completion overlay with stats, share, sound | N/A |
| Share completion card | N/A (unreachable logged out) | Canvas image generated, share panel opens | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Overlay content in single column, CTA buttons stack vertically, stats card full-width, max-width constrained to viewport with `mx-4` padding |
| Tablet (640-1024px) | Overlay centered with `max-w-md`, CTA buttons in a row |
| Desktop (> 1024px) | Overlay centered with `max-w-md`, comfortable spacing, confetti particle count increases |

- CTA buttons must be at least 44px tall for touch targets on mobile
- Stats card text remains readable at all sizes
- Confetti count reduces on mobile (15) vs desktop (30) — already implemented in existing overlay

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. All content is pre-authored (curated scriptures, plan titles from data files).

## Auth & Persistence

- **Logged-out users:** Cannot reach this flow — reading plan progress tracking requires authentication
- **Logged-in users:** Plan completion state persists in `wr_reading_plan_progress` (localStorage, Phase 2). Points and badges awarded via `useFaithPoints` hook. No new localStorage keys introduced.
- **Route type:** Protected (within `/reading-plans/:planId` detail page)

## Completion & Navigation

- Completing the final day fires `recordActivity('readingPlan')` as usual, awarding faith points and triggering badge checks
- After the overlay, the user can: browse more plans (`/grow?tab=plans`), share their completion, or dismiss and stay on the plan detail page
- The plan detail page should show a completed state after dismissal

## Design Notes

- **Overlay backdrop:** Dark with blur — `bg-black/70 backdrop-blur-sm` (matching the existing `PlanCompletionOverlay` and `ChallengeCompletionOverlay` pattern)
- **Content card:** Frosted glass card with `border border-white/15 bg-hero-mid/90 rounded-2xl` (existing pattern)
- **Heading:** Use `font-script` (Caveat) for "Plan Complete!" — matching the existing overlay
- **Stats section:** Frosted glass inset card `bg-white/5 border border-white/10 rounded-xl p-4` with `text-white/60 text-sm` stats text
- **CTA buttons:** Frosted glass pills matching the challenge completion overlay button style
- **Scripture:** `font-serif italic text-white/80` for the quote, `text-sm text-white/60` for the reference — matching the existing blockquote style
- **Confetti:** Reuse existing confetti generation with the same `CONFETTI_COLORS` palette and `animate-confetti-fall` animation
- **Sound:** `ascending` from `useSoundEffects` — same sound used for streak milestones and challenge celebrations
- **Canvas card:** Dark gradient background consistent with the `challenge-share-canvas.ts` visual style — dark purple base with Caveat heading font
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact gradient values and card patterns
- **New visual pattern:** The staggered animation sequence (elements fading in at different delays) is a new timing pattern not captured in the design system recon — mark delay values as implementation decisions for `/plan`

## Out of Scope

- Adding new badge definitions for plan completion (existing `first_plan`, `plans_3`, `plans_10` badges already cover this)
- Plan restart functionality (re-doing a completed plan)
- Plan recommendation algorithm (suggesting the "best next plan" based on user history)
- Changes to the per-day celebration (the inline checkmark stays as-is for non-last days)
- Changes to the reading plan data or content
- Sharing plan progress mid-plan (only completion is shareable in this spec)
- Challenge suggestion section redesign (the existing challenge cross-promotion in the overlay can remain or be simplified)

## Acceptance Criteria

- [ ] Completing the last day of a reading plan triggers the enhanced full-screen completion overlay
- [ ] The overlay shows "Plan Complete!" heading in Caveat script font
- [ ] The overlay shows the plan title below the heading
- [ ] Stats section displays: days completed count, total faith points earned (`totalDays x 15`)
- [ ] Stats section displays start/finish date range when derivable from progress data
- [ ] A scripture about God's word from the curated set of 4 appears in the overlay (WEB translation)
- [ ] `ascending` sound plays when the overlay heading appears (respects `wr_sound_effects_enabled` and `prefers-reduced-motion`)
- [ ] Animation sequence unfolds over ~2 seconds with staggered element reveals
- [ ] `prefers-reduced-motion` disables all animations (content shown immediately, confetti hidden)
- [ ] Three CTA buttons render: Browse Plans, Share, Done
- [ ] "Browse Plans" navigates to `/grow?tab=plans`
- [ ] "Done" closes the overlay and returns to the plan detail page
- [ ] "Share" generates a canvas completion card with plan title, stats, scripture, and "Worship Room" watermark
- [ ] Canvas card renders at 1080x1080 with dark gradient background
- [ ] Share flow supports: download image, copy to clipboard, native Web Share API
- [ ] Overlay auto-dismisses after 15 seconds
- [ ] Overlay traps focus via `useFocusTrap`
- [ ] Escape key dismisses the overlay
- [ ] All overlay content is accessible to screen readers (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- [ ] Completing a non-last day still shows only the existing inline checkmark celebration (no overlay change)
- [ ] Plan progress state correctly reflects completion (100%, all days marked done in `wr_reading_plan_progress`)
- [ ] Dashboard `ReadingPlanWidget` shows completed state for finished plans
- [ ] `recordActivity('readingPlan')` still fires on last day completion
- [ ] Existing badge triggers (`first_plan`, `plans_3`, `plans_10`) still work
- [ ] Mobile (375px): overlay content fits without overflow, all buttons tappable (44px minimum)
- [ ] Desktop (1440px): overlay centered with `max-w-md`, comfortable spacing

## Test Requirements

- Verify completing the last day triggers the enhanced `PlanCompletionOverlay`
- Verify completing a non-last day does NOT trigger the overlay
- Verify overlay shows correct plan title and day count
- Verify points calculation is correct (`totalDays x 15`)
- Verify a scripture renders from the curated 4-verse completion set
- Verify `ascending` sound plays (mock `useSoundEffects` in test)
- Verify "Browse Plans" navigates to `/grow?tab=plans`
- Verify "Done" closes the overlay
- Verify "Share" button triggers canvas generation
- Verify overlay traps focus
- Verify Escape key dismisses overlay
- Verify reduced motion preference disables animations and hides confetti
- Verify auto-dismiss after 15 seconds (use fake timers)
- Verify plan progress shows completed state after all days done
- Run existing reading plan tests to verify no regressions
