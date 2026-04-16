# Feature: Homepage Stats Bar (HP-3)

**Master Plan Reference:** N/A — standalone homepage section (part of the `homepage-redesign` branch sequence: HP-1 Foundation → HP-2 Feature Showcase → **HP-3 Stats Bar** → HP-4 Pillars → HP-5 Differentiators → HP-6 Dashboard Preview → HP-7 Quiz + CTA)

---

## Overview

A compact horizontal stats strip that communicates content depth at a glance — showing first-time visitors that Worship Room is rich with resources for their spiritual journey. Positioned between the Feature Showcase (HP-2) and the upcoming Three Pillars section (HP-4), this visual breather uses animated counters to draw the eye and signal abundance without words. Numbers count up from zero when the section scrolls into view, creating a moment of delight.

## User Story

As a **logged-out visitor**, I want to **see at a glance how much content Worship Room offers** so that **I feel confident there's enough depth here to support my spiritual journey**.

## Requirements

### Functional Requirements

1. Display 6 stats in a responsive grid: 50 Devotionals, 10 Reading Plans, 24 Ambient Sounds, 6 Meditation Types, 5 Seasonal Challenges, 8 Worship Playlists
2. Numbers animate from 0 to their target value over 800ms with an ease-out curve when the section scrolls into view
3. Each stat's counter starts with an 80ms stagger (0ms, 80ms, 160ms, 240ms, 320ms, 400ms)
4. Counter animation fires only once — does not replay when scrolling away and back
5. Numbers display as plain integers (no `+` suffix, no decimals during animation)
6. Section uses `GlowBackground` with `variant="center"` for atmospheric lighting
7. Section has subtle top and bottom border separators (`border-y border-white/[0.06]`)
8. Section fades in via `scroll-reveal` CSS class (from HP-1) on scroll into view
9. Individual stats use `staggerDelay` from HP-1 for their fade-in appearance (100ms between each)
10. `useAnimatedCounter` hook is a standalone reusable hook using `requestAnimationFrame`

### Non-Functional Requirements

- **Performance**: Counter uses `requestAnimationFrame` (not `setInterval`/`setTimeout`), cleans up on unmount
- **Accessibility**: Numbers are readable by screen readers at their final values; reduced motion users see final values immediately with no animation
- **No external dependencies**: Pure React + existing hooks/utilities only

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View stats bar | Fully visible, no restrictions | Fully visible, no restrictions | N/A |

This is a passive display section with no interactive elements. No auth gating required.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 2-column grid (`grid-cols-2 gap-4`), 3 rows |
| Tablet (640px–1024px) | 3-column grid (`grid-cols-3 gap-6`), 2 rows |
| Desktop (> 1024px) | 6-column grid (`grid-cols-6 gap-6`), single row |

- Container constrained to `max-w-5xl mx-auto px-4 sm:px-6`
- Vertical spacing: `py-14 sm:py-20`
- Each stat is centered within its grid cell
- Number size scales: `text-3xl` (mobile) → `text-4xl` (tablet) → `text-5xl` (desktop)
- Label size scales: `text-xs` (mobile) → `text-sm` (tablet+)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Fully visible, no data, no persistence
- **Logged-in users:** Same — purely decorative display
- **localStorage usage:** None
- **Route type:** Public (renders on `/` landing page for logged-out users)

## Completion & Navigation

N/A — passive display section, not part of Daily Hub.

## Design Notes

- **Gradient text**: Numbers use `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx` via `GRADIENT_TEXT_STYLE` — same treatment as existing homepage headings (HP-1, HP-2)
- **Labels**: `text-white/50 text-xs sm:text-sm mt-1 tracking-wide uppercase` — muted, compact, uppercase
- **Section atmosphere**: `GlowBackground` with `variant="center"` provides a single centered purple glow orb (existing component from HP-1)
- **Border separators**: `border-y border-white/[0.06]` — subtle glass-like separators to frame the section
- **Scroll reveal**: Uses the existing `scroll-reveal` / `is-visible` CSS class pattern and `useScrollReveal` hook from HP-1
- **Stagger pattern**: Uses the existing `staggerDelay` utility from `useScrollReveal.ts` for fade-in, plus a separate 80ms stagger for counter start times
- **No SectionHeading**: This section intentionally has no heading or tagline — the numbers speak for themselves
- **Counter hook**: New `useAnimatedCounter` hook with `requestAnimationFrame`, ease-out curve (`t = 1 - Math.pow(1 - progress, 3)`), configurable duration/delay/enabled, reduced motion support
- Design system recon file exists at `_plans/recon/design-system.md` — planner should reference it for exact gradient values and spacing patterns

## Out of Scope

- No `+` suffix on numbers (these are exact content counts, not approximations)
- No click/tap interactions on stats (not linking to feature pages — that's a potential future enhancement)
- No dynamic data fetching (stats are hardcoded constants matching the verified content inventory)
- No tooltips or hover states on individual stats
- Backend API for real-time content counts (Phase 3+)

## Acceptance Criteria

- [ ] `StatsBar` renders below `FeatureShowcase` and above the HP-4 comment placeholder in `Home.tsx`
- [ ] 6 stats display: 50 Devotionals, 10 Reading Plans, 24 Ambient Sounds, 6 Meditation Types, 5 Seasonal Challenges, 8 Worship Playlists
- [ ] Desktop (>1024px): 6-column single-row grid
- [ ] Tablet (640–1024px): 3-column 2-row grid
- [ ] Mobile (<640px): 2-column 3-row grid
- [ ] Numbers use gradient text matching existing homepage headings (`WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx`)
- [ ] Labels are uppercase, muted (`text-white/50`), compact (`text-xs sm:text-sm`), with `tracking-wide`
- [ ] Numbers animate from 0 to target value on scroll into view with 800ms duration and ease-out curve
- [ ] Counter animation has 80ms stagger between each stat (0ms, 80ms, 160ms, 240ms, 320ms, 400ms)
- [ ] Counter fires only once — re-scrolling into view does not replay the animation
- [ ] `useAnimatedCounter` hook uses `requestAnimationFrame` and cleans up RAF on unmount
- [ ] Reduced motion: numbers display instantly at final values, no animation, no stagger
- [ ] `GlowBackground` with `variant="center"` wraps the section
- [ ] Top and bottom border separators visible (`border-y border-white/[0.06]`)
- [ ] Section fades in via `scroll-reveal` CSS class on scroll
- [ ] Individual stats fade in with staggered delay (100ms between each via `staggerDelay`)
- [ ] No external dependencies added
- [ ] `useAnimatedCounter` hook has passing unit tests
- [ ] `StatsBar` component has passing tests
- [ ] Build passes with 0 errors
- [ ] All existing tests still pass
