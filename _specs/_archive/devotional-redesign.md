# Devotional Redesign

**Master Plan Reference:** N/A — standalone visual redesign spec

---

## Overview

The Devotional tab is the daily anchor for users seeking spiritual nourishment and reflection. Currently its layout reads like a blog post — spacious padding, decorative squiggles, and a heading that repeats context the tab bar already provides. This redesign transforms it into a tighter, more atmospheric reading experience that feels like entering a quiet sanctuary rather than scrolling an article. Remove visual clutter, elevate key moments (quote, reflection question) with frosted glass treatment, add GlowBackground atmosphere, and compact the overall vertical rhythm.

## User Story

As a **logged-in user** on the Daily Hub Devotional tab, I want a focused, atmospheric reading experience so that I can engage with the daily devotional content without distraction and feel spiritually immersed.

## Requirements

### Functional Requirements

1. **Visuals only** — no functional changes. All logic (date navigation, swipe handlers, read-aloud, share panel, completion tracking, intersection observer, localStorage, callbacks) remains untouched.
2. **No ARIA changes** — all existing `role`, `aria-label`, `aria-describedby`, `aria-disabled`, and `focus-visible` styles remain exactly as-is.
3. Remove the `BackgroundSquiggle` decorative layer and its import entirely. Flatten any wrapper divs that existed solely for squiggle z-stacking.
4. Add `GlowBackground` (center variant) as the atmospheric wrapper for the devotional content area.
5. Remove the "What's On Your Soul?" heading — the tab bar already communicates context.
6. Tighten all section divider spacing from `py-8 sm:py-10` to `py-5 sm:py-6`. Update border color from `border-white/10` to `border-white/[0.08]` to match homepage section divider pattern.
7. Wrap the opening quote in a `FrostedCard` for glass-morphism elevation. Brighten quote text to `text-white` and attribution to `text-white/70`.
8. Brighten passage text from `text-white/70` to `text-white/80`. Brighten reflection body from `text-white/80` to `text-white`.
9. Compact the closing prayer: smaller text (`text-sm`), dimmer label (`text-white/50`), tighter label spacing (`mb-2`).
10. Wrap the reflection question card in `FrostedCard` with left purple border accent preserved.
11. Apply frosted glass styling to Share and Read Aloud buttons (rounded-xl, backdrop-blur, purple shadow glow on hover).
12. Reduce bottom padding from `pb-16 sm:pb-20` to `pb-8 sm:pb-12`.

### Non-Functional Requirements

- Performance: No new network requests, no new component mounts. GlowBackground and FrostedCard are lightweight CSS-only components.
- Accessibility: All existing ARIA attributes, keyboard navigation, and focus management remain unchanged. Text brightening maintains or improves WCAG AA contrast ratios on `bg-hero-bg`.

## Auth Gating

This is a visual-only redesign of an existing tab. Auth gating behavior is unchanged from the current implementation.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View devotional content | Can read devotional, quote, passage, reflection, prayer | Same | N/A |
| Date navigation (prev/next) | Functional | Functional | N/A |
| Share button | Opens share panel | Opens share panel | N/A |
| Read Aloud button | Starts TTS playback | Starts TTS playback | N/A |
| Completion tracking | Not tracked (demo mode) | Tracked via intersection observer | N/A |
| Cross-tab CTAs | Functional (navigate to Journal/Pray tabs) | Functional | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, full width. GlowBackground orbs scale down 40% per pattern. `py-5` section spacing. Quote FrostedCard stacks naturally. Buttons stack vertically if needed. |
| Tablet (640-1024px) | Single column with `max-w-4xl` centering. `sm:py-6` section spacing. GlowBackground at full desktop size. |
| Desktop (> 1024px) | Same as tablet — devotional is a reading experience, not a multi-column layout. Max width constrained for readability. |

No elements hide or change structure between breakpoints. The devotional is a single-column reading flow at all sizes.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The devotional content is pre-authored. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view devotional content. Zero persistence (demo mode). Visual changes do not affect persistence behavior.
- **Logged-in users:** Completion tracking via intersection observer unchanged. localStorage keys unchanged.
- **localStorage usage:** No new keys. Existing `worship-room-daily-completion` key behavior unchanged.

## Completion & Navigation

Unchanged. The existing intersection observer for read-completion and cross-tab CTAs (Journal, Pray) remain as-is. This is a visual-only redesign.

## Design Notes

- **GlowBackground:** Use `center` variant from `GlowBackground` component. Orb opacity in 0.25-0.35 standard range per design system.
- **FrostedCard:** From `components/homepage/FrostedCard.tsx`. `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow.
- **Section dividers:** `border-white/[0.08]` matches homepage pattern per design system.
- **Text brightening:** Follows Round 3 standard — `text-white` for all primary readable content. Attribution and secondary labels use `text-white/50` to `text-white/70`.
- **Button frosted treatment:** Matches the frosted button pattern used across the homepage redesign: `bg-white/[0.06] backdrop-blur-sm border-white/[0.12]` with subtle purple box-shadow glow.
- **Closing prayer:** Deliberately quieter treatment (smaller text, dimmer label) to feel whispered rather than shouted.
- **No new visual patterns introduced.** All treatments (GlowBackground, FrostedCard, frosted buttons, section dividers) are existing homepage patterns being applied to the Devotional tab.
- **Design system recon:** `_plans/recon/design-system.md` available for exact computed values.

## Out of Scope

- Functional changes to date navigation, swipe, read-aloud, share, completion tracking, or any callbacks
- ARIA attribute or accessibility behavior changes
- New components or new data models
- Backend/API work (Phase 3+)
- Content changes to devotional text, quotes, or prayers
- Adding SectionHeading component (the tab already has its own title treatment via the devotional title)
- Mobile-specific layout restructuring (single column at all sizes, no layout changes needed)

## Acceptance Criteria

- [ ] BackgroundSquiggle import and decorative div are completely removed from DevotionalTabContent
- [ ] No `BackgroundSquiggle` or `SQUIGGLE_MASK_STYLE` references remain in the file
- [ ] GlowBackground (center variant) wraps the devotional content area — purple glow orbs visible on dark background
- [ ] "What's On Your Soul?" heading is removed — date navigation is the first visible content
- [ ] All section dividers use `py-5 sm:py-6` spacing (not `py-8 sm:py-10`)
- [ ] All section divider borders use `border-white/[0.08]` (not `border-white/10`)
- [ ] Opening quote is wrapped in FrostedCard — glass-morphism with purple shadow glow visible
- [ ] Quote text uses `text-white` (fully white, not `text-white/70`)
- [ ] Quote attribution uses `text-white/70` (not `text-white/60`)
- [ ] Passage text uses `text-white/80` (brightened from `text-white/70`)
- [ ] Reflection body paragraphs use `text-white` (fully white, not `text-white/80`)
- [ ] Closing prayer label uses `text-white/50` and `mb-2` spacing
- [ ] Closing prayer text uses `text-sm` (not `text-base`)
- [ ] Reflection question card uses FrostedCard with `border-l-2 border-l-primary` accent preserved
- [ ] Share and Read Aloud buttons use frosted glass styling: `rounded-xl`, `backdrop-blur-sm`, `bg-white/[0.06]`, purple box-shadow
- [ ] Share and Read Aloud buttons show enhanced glow on hover
- [ ] Bottom padding is `pb-8 sm:pb-12` (not `pb-16 sm:pb-20`)
- [ ] All existing ARIA attributes remain unchanged
- [ ] Date navigation still works (clicking prev/next updates content)
- [ ] Read Aloud still works (clicking button starts/stops TTS)
- [ ] Share panel still works (clicking button opens share options)
- [ ] Mobile (375px): no horizontal overflow, glow orbs scale appropriately, all content readable
- [ ] Desktop (1280px): overall vertical rhythm is meaningfully more compact than pre-redesign
- [ ] No new TypeScript errors or test failures introduced
