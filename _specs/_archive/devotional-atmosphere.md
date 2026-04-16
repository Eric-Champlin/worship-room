# Feature: Devotional Atmosphere

**Master Plan Reference:** N/A — standalone visual upgrade spec (part of Round 3 atmospheric consistency pass)

---

## Overview

The Devotional tab is where users encounter daily spiritual encouragement — a quote, passage, reflection, and prayer. Currently it uses its own visual language (Caveat script heading, inline card styles) that diverges from the homepage's atmospheric dark-theme aesthetic. This spec brings the Devotional tab into visual alignment with the homepage's established patterns: GlowBackground, gradient text headings, FrostedCard, and frosted glass buttons — creating a cohesive sanctuary feel across the entire app.

## User Story

As a **logged-in user** reading my daily devotional, I want the Devotional tab to feel as immersive and visually cohesive as the homepage so that the experience of reading scripture and reflecting feels like entering a sanctuary, not switching between different apps.

## Requirements

### Functional Requirements

1. **GlowBackground layer**: Wrap the entire Devotional tab content in `GlowBackground` (variant: `center`) to add purple glow orbs behind the existing `BackgroundSquiggle` pattern. The squiggle remains visible underneath.
2. **Gradient text heading**: Replace the "What's On Your Soul?" heading's Caveat script accent (`font-script text-primary`) with `GRADIENT_TEXT_STYLE` (white-to-purple gradient), matching homepage heading treatment.
3. **Frosted reflection card**: Replace the reflection question card's inline styling with `FrostedCard`, preserving the left purple border accent (`border-l-2 border-l-primary`).
4. **Frosted glass buttons**: Upgrade Share and Read Aloud buttons to frosted glass styling matching the FrostedCard visual palette, with subtle purple glow on hover.

### Non-Functional Requirements

- **Performance**: No new network requests. GlowBackground uses CSS gradients only.
- **Accessibility**: Zero changes to ARIA attributes, roles, labels, focus-visible styles, or keyboard navigation. All existing accessibility behavior preserved exactly.
- **No functional changes**: Date navigation, swipe handlers, read-aloud, share panel, completion tracking, intersection observer, localStorage, and all callbacks remain untouched.

## Auth Gating

The Devotional tab is part of the Daily Hub, which is a **public route** (`/daily?tab=devotional`). No auth gating changes in this spec.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View devotional content | Can view fully | Can view fully | N/A |
| Read Aloud button | Works (browser TTS) | Works (browser TTS) | N/A |
| Share button | Works (Web Share API) | Works (Web Share API) | N/A |
| Date navigation | Works | Works | N/A |

No auth gating changes — this is a visual-only upgrade.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | GlowBackground orbs scale down (~40% smaller, ~25% less blur per design system spec). Heading `text-2xl`. Cards stack vertically. Padding `px-4 py-10`. |
| Tablet (640-1024px) | GlowBackground at standard size. Heading `text-3xl`. `max-w-4xl` constrains width. Padding `sm:py-14`. |
| Desktop (> 1024px) | Full glow orb effect. Heading `text-4xl`. Generous whitespace within `max-w-4xl`. |

All responsive behavior is inherited from existing layout and the `GlowBackground` component's built-in mobile handling. No new breakpoint logic needed.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. (The Devotional tab does display hardcoded devotional content, but all safety handling for that content already exists and is not modified by this spec.)

## Auth & Persistence

- **Logged-out users**: Can view devotional content, use date navigation, read aloud, and share. No persistence changes.
- **Logged-in users**: Devotional read completion tracking continues to use `wr_devotional_reads` in localStorage. No persistence changes.
- **localStorage usage**: No changes to any localStorage keys.

## Completion & Navigation

N/A — No changes to completion tracking or navigation. The Devotional tab's existing completion signal to the daily tracking system (`useCompletionTracking`) is preserved exactly.

## Design Notes

- **GlowBackground**: Use `variant="center"` from `src/components/homepage/GlowBackground.tsx`. Orbs at 0.25-0.35 opacity range (standard section level, per design system). Glow appears BEHIND the `BackgroundSquiggle`, not replacing it.
- **Gradient text**: Use `GRADIENT_TEXT_STYLE` from `src/constants/gradients.tsx` — the same white-to-purple gradient used on homepage headings. Replaces Caveat script accent.
- **FrostedCard**: Use existing `FrostedCard` from `src/components/homepage/FrostedCard.tsx`. Provides `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with purple glow shadow. The left purple border accent (`border-l-2 border-l-primary`) is preserved via className override.
- **Frosted glass buttons**: Match the FrostedCard visual palette — `bg-white/[0.06]`, `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-xl`, subtle purple box-shadow on hover (`rgba(139,92,246,0.04)` default, `0.08` on hover).
- **BackgroundSquiggle**: Stays in place. GlowBackground wraps outside it. The squiggle should remain faintly visible through the glow layer.
- **Section dividers**: All existing `border-t border-white/10` dividers remain as-is.
- **Design system recon reference**: Match FrostedCard shadow values from `_plans/recon/design-system.md` and homepage gradient text treatment.

### New Visual Patterns

None — all patterns used (GlowBackground, FrostedCard, gradient text, frosted glass buttons) are established homepage patterns being applied to an inner page for the first time.

## Out of Scope

- `RelatedPlanCallout` component styling (separate file, not edited in this spec)
- Any functional changes (logic, data, navigation, tracking)
- Any accessibility changes (ARIA, roles, labels, focus)
- Other Daily Hub tabs (Pray, Journal, Meditate) — separate specs
- Light mode support (Phase 4)
- Real TTS audio (Phase 4)

## Acceptance Criteria

- [ ] GlowBackground with `variant="center"` wraps the Devotional tab content, producing visible purple glow orbs (0.25-0.35 opacity range) behind the content
- [ ] BackgroundSquiggle remains visible underneath the glow layer (not removed or obscured)
- [ ] "What's On Your Soul?" heading renders with white-to-purple gradient text (`GRADIENT_TEXT_STYLE`), no Caveat script font
- [ ] Heading text is a single flow ("What's On Your Soul?") — no separate `<span>` for "Soul?"
- [ ] Reflection question card uses `FrostedCard` component with visible frosted glass styling (translucent background, blur, border)
- [ ] Reflection question card preserves left purple border accent (`border-l-2 border-l-primary`)
- [ ] Share button has frosted glass styling with `rounded-xl`, `bg-white/[0.06]`, `border-white/[0.12]`, and purple glow shadow on hover
- [ ] Read Aloud button has the same frosted glass styling as the Share button
- [ ] On mobile (375px), glow orbs scale down, heading remains readable at `text-2xl`, cards don't overflow viewport
- [ ] Date navigation still works — clicking previous/next day arrows updates content without visual regression
- [ ] Swipe navigation still works on touch devices
- [ ] Read Aloud functionality unchanged — clicking plays TTS as before
- [ ] Share functionality unchanged — clicking opens share options as before
- [ ] All existing ARIA attributes, roles, and labels are preserved exactly
- [ ] No new lint errors or TypeScript errors introduced
- [ ] Existing Devotional tab tests continue to pass
