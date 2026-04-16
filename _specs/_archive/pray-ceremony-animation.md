# Feature: "Pray for This" Ceremony Animation & Author Notification

## Overview

The Prayer Wall's "Pray for this" button currently increments a counter silently — a missed opportunity for spiritual connection. This feature transforms that interaction into a meaningful 3-part ceremony: a gentle icon pulse, an outward ripple, and floating "+1 prayer" text that rises and fades. The ceremony creates a brief, reverent moment that acknowledges the sacred act of interceding for someone.

Additionally, prayer authors receive a warm notification when someone prays for their request ("Someone is praying for your request"), closing the feedback loop and reinforcing the communal nature of the Prayer Wall. Cross-feature CTAs at the bottom of each prayer card's comment section ("Pray about this" and "Journal about this") create natural bridges to the Daily Hub, deepening engagement across the app.

## User Stories

As a **logged-in user**, I want to see a brief, reverent animation when I tap "Pray for this" so that the moment feels spiritually meaningful rather than transactional.

As a **logged-in user viewing my own prayer on the feed**, I want to receive a warm notification when someone prays for my request so that I feel supported and know my prayer community is active.

As a **logged-out visitor or logged-in user reading a prayer**, I want to see "Pray about this" and "Journal about this" links below comments so that I can naturally transition into personal prayer or journaling inspired by someone's request.

## Requirements

### 1. Pray Ceremony Animation (3-Part, Simultaneous)

When a logged-in user taps "Pray for this" (toggling it ON), all three animations play simultaneously and complete within 600ms:

**Part 1 — Icon Scale + Glow Pulse**
- The HandHelping icon scales up to 1.3x with a soft glow in the primary color (`#6D28D9`)
- Duration: 300ms with ease-out timing
- Motion-safe only (`prefers-reduced-motion: no-preference`)
- After animation completes, icon returns to normal scale but stays in its "active/praying" color state

**Part 2 — Ripple Effect**
- A single translucent circle emanates outward from the button center
- Starts at the button's size, expands to ~2.5x, fading from `primary/30` opacity to fully transparent
- Duration: 600ms using a CSS keyframe animation
- Implemented as a separate absolutely-positioned element (not a pseudo-element) to avoid layout shift
- The ripple element is positioned behind or around the button with `pointer-events-none` so it doesn't interfere with clicks

**Part 3 — Floating "+1 prayer" Text**
- Small text "+1 prayer" appears at the button position and floats upward
- Moves `translateY(-20px)` while fading from `opacity: 1` to `opacity: 0`
- Duration: 500ms
- Font: Inter, `text-xs`, primary color
- Absolutely positioned relative to the button, `pointer-events-none`

**All animations use CSS keyframes defined in the Tailwind config** — no inline styles, no JavaScript-driven animations. After 600ms, all animation elements are removed from the DOM (or hidden via class removal).

### 2. Reduced Motion Behavior

When `prefers-reduced-motion: reduce` is active:
- No icon scale animation
- No ripple effect
- No floating text
- The icon color change and count increment happen instantly (same as current behavior)
- This is a hard requirement — all ceremony animations must be wrapped in `motion-safe:` or conditionally applied

### 3. Untoggle Behavior (Removing Prayer)

When a user taps the button to remove their prayer (toggling it OFF):
- No ceremony plays — no scale, no ripple, no floating text
- The icon returns to its default/inactive state with a quick 150ms color transition
- The count decrements by 1
- No toast notification on untoggle

### 4. Success Toast After Ceremony

After the 600ms ceremony animation completes (not during), show a toast notification:
- Message: "Your prayer has been lifted up"
- Type: `success` (standard toast tier — green accent, not celebration tier)
- Auto-dismiss: 4 seconds
- Uses the existing `useToast()` → `showToast()` method
- Only fires when toggling ON, never on untoggle

### 5. "Someone Is Praying for You" Author Notification

When any user taps "Pray for this" on a prayer card:
- Check if `prayer.authorId` matches the currently logged-in user's ID
- If YES (the author is viewing their own prayer and someone — in testing, themselves — prays for it): show a special toast
- Message: "Someone is praying for your request" (with praying hands emoji in the message)
- Type: `celebration` tier (warm golden style with frosted glass — NOT `celebration-confetti`, no confetti particles)
- Auto-dismiss: uses the celebration toast default duration (4 seconds)
- Uses `showCelebrationToast()` method
- This toast fires AFTER the ceremony completes (same 600ms delay as the success toast)
- If both toasts fire (user prays for their own prayer in testing), the author toast fires ~200ms after the success toast so they don't stack simultaneously

**Current-state note:** With mock data only, this means the simulated logged-in user can trigger this by praying for a prayer whose `authorId` matches their simulated user ID. In production with real users, this would be a server-pushed notification — the toast demonstrates the concept.

### 6. Cross-Feature CTAs in Comment Section

At the bottom of each prayer card's expanded comment section (below the last comment and comment input), add two text-link CTAs:

**"Pray about this" CTA:**
- Text: "Pray about this →" (with right arrow character)
- Navigates to `/daily?tab=pray` with the prayer's content as context
- Uses the same context-passing pattern as the existing Pray → Journal CTA: sets a `prayContext` (or equivalent) that the Pray tab can read to pre-fill the textarea or display a prompt
- The prayer content passed should be a brief summary (first 100 characters of the prayer text, or the full text if shorter)

**"Journal about this" CTA:**
- Text: "Journal about this →" (with right arrow character)
- Navigates to `/daily?tab=journal` with context
- Uses the same pattern as the existing Pray tab's "Journal about this →" CTA

**Styling:**
- Both CTAs are text links (not buttons), inline or side-by-side
- `text-sm text-primary-lt hover:text-primary` with smooth color transition
- Separated by a small gap (e.g., `gap-3` or `gap-4`)
- On mobile: stack vertically. On tablet/desktop: display horizontally
- A subtle top border or spacing separates the CTAs from the comment section above

**Auth behavior:**
- Both links work for logged-out AND logged-in users — they navigate to public pages
- On the Pray tab, if the logged-out user tries to generate a prayer, the existing auth modal handles gating
- On the Journal tab, if the logged-out user tries to save, the existing auth modal handles gating
- The CTA links themselves never trigger an auth modal

### 7. Animation Timing Summary

| Event | Timing | Action |
|-------|--------|--------|
| User taps "Pray for this" (toggle ON) | 0ms | Icon scale + glow begins, ripple begins, float text begins, count increments |
| Icon scale completes | 300ms | Icon returns to normal scale (stays active color) |
| Float text fades out | 500ms | "+1 prayer" text removed |
| Ripple fades out | 600ms | Ripple element removed |
| Success toast appears | 600ms | "Your prayer has been lifted up" toast |
| Author toast (if applicable) | 800ms | "Someone is praying for your request" toast |
| User taps "Pray for this" (toggle OFF) | 0ms | Icon color transition (150ms), count decrements. No ceremony, no toast. |

## Acceptance Criteria

### Ceremony Animation
- [ ] Tapping "Pray for this" (toggle ON) triggers all 3 animations simultaneously: icon scale+glow (300ms), ripple (600ms), floating "+1 prayer" text (500ms)
- [ ] Icon scales to 1.3x with primary-colored glow, then returns to normal scale while keeping active color state
- [ ] Ripple is a single expanding circle from primary/30 to transparent over 600ms, does not cause layout shift
- [ ] Floating "+1 prayer" text rises 20px and fades out over 500ms, uses `text-xs text-primary` styling
- [ ] All 3 animations use CSS keyframes defined in `tailwind.config.js` (no inline animation styles, no JS-driven animations)
- [ ] Animation elements are removed/hidden after completion (no orphaned DOM nodes)
- [ ] Prayer count increments by 1 at the start of the ceremony (same as current behavior)

### Reduced Motion
- [ ] With `prefers-reduced-motion: reduce`: no icon scale, no ripple, no float text — only instant icon color change and count increment
- [ ] All ceremony animations are conditionally applied via `motion-safe:` Tailwind prefix or equivalent CSS media query

### Untoggle
- [ ] Tapping "Pray for this" when already praying (toggle OFF) plays NO ceremony — icon returns to default state with 150ms color transition
- [ ] Count decrements by 1 on untoggle
- [ ] No toast fires on untoggle

### Toast Notifications
- [ ] Success toast "Your prayer has been lifted up" appears after 600ms ceremony delay, uses `success` type, auto-dismisses in 4 seconds
- [ ] If prayer author matches logged-in user, celebration toast "Someone is praying for your request" (with praying hands emoji) appears ~200ms after success toast
- [ ] Author notification uses `celebration` tier (golden frosted glass style, no confetti)
- [ ] Toast does not fire on untoggle

### Cross-Feature CTAs
- [ ] "Pray about this →" and "Journal about this →" links appear at the bottom of each expanded comment section
- [ ] "Pray about this →" navigates to `/daily?tab=pray` with prayer content as context
- [ ] "Journal about this →" navigates to `/daily?tab=journal` with prayer content as context
- [ ] CTAs styled as `text-sm text-primary-lt hover:text-primary` text links
- [ ] CTAs stack vertically on mobile (< 640px), display horizontally on tablet/desktop
- [ ] Both CTAs work for logged-out and logged-in users (no auth modal on the links themselves)
- [ ] Context is passed using the same pattern as the existing Pray → Journal CTA in the Daily Hub

### Accessibility
- [ ] All new animation elements have `pointer-events-none` and `aria-hidden="true"`
- [ ] Existing `aria-pressed` and `aria-label` on the Pray button are preserved
- [ ] Screen readers are not disrupted by animation elements
- [ ] Touch targets remain at least 44px
- [ ] Toast notifications use appropriate ARIA roles (existing toast system handles this)

### General
- [ ] All ceremony features work for logged-in users only (button is already auth-gated)
- [ ] No visual regression to the existing Prayer Wall card layout, interaction bar, or comment section
- [ ] Animations are smooth at 60fps on mid-range mobile devices

## UX & Design Notes

- **Tone**: Reverent, gentle, brief — the ceremony should feel like a moment of acknowledgment, not a celebration or gamification reward
- **Colors**: Primary violet (`#6D28D9`) for icon glow and ripple. Primary light (`#8B5CF6`) for CTA link text. No new colors introduced.
- **Typography**: Inter for all text. `text-xs` for floating "+1 prayer" text. `text-sm` for CTA links.
- **Animations**: All ease-out timing. Total ceremony duration 600ms — long enough to notice, short enough to not feel slow. Must feel instantaneous on repeated taps (if user untoggled and re-toggled quickly, the ceremony should restart cleanly).
- **Responsive**:
  - Mobile (< 640px): Same ceremony animations (they're small and contained to the button area). CTAs stack vertically.
  - Tablet (640-1024px): Same as desktop for ceremony. CTAs display horizontally.
  - Desktop (> 1024px): Same ceremony. CTAs display horizontally.
- **Design system recon**: Reference the existing `animate-celebrate-spring` (600ms cubic-bezier) pattern for the icon scale timing curve. Reference `animate-fade-in` (500ms) for the float text pattern. The ripple effect is a **new visual pattern** not currently in the design system.

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature does not introduce any new user text input. The prayer content displayed in CTAs is existing user-submitted text that was already moderated.
- **User input involved?**: No — the ceremony is triggered by a button tap, not text input.
- **AI-generated content?**: No — toast messages are hardcoded strings.

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Cannot tap "Pray for this" (button is already auth-gated — triggers auth modal)
  - CAN see and click "Pray about this →" and "Journal about this →" CTAs (these navigate to public pages)
  - No ceremony, no toasts for logged-out users
- **Logged-in**:
  - Full ceremony on pray toggle
  - Toast notifications fire as described
  - Author notification fires if authorId matches
  - Prayer reaction state managed by existing `usePrayerReactions` hook (session-only, no database persistence in Phase 2)
- **Route type**: Public (Prayer Wall is public; ceremony features only activate for authenticated users)
- **Persistence**: None — all animations and toasts are ephemeral UI. No new localStorage keys, no database writes.

## Out of Scope

- Real backend push notifications for "someone is praying for you" (Phase 3+ — currently simulated via local toast)
- Haptic feedback on mobile (future native app enhancement)
- Sound effects or audio feedback on pray tap
- Confetti or particle effects beyond the single ripple circle
- Animation customization or user preferences for ceremony intensity
- Batched notifications ("3 people prayed for your request") — future enhancement
- Any changes to the Pray button's existing auth gating logic
- Any changes to the existing prayer count persistence model
- Pray ceremony on the Prayer Detail page (`/prayer-wall/:id`) — this spec covers the feed cards only; detail page can be added later if desired
- Real-time WebSocket notifications
