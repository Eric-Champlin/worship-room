# Feature: Meditate Atmosphere

**Master Plan Reference:** N/A — standalone visual spec (part of Round 3 atmospheric consistency pass)

---

## Overview

The Meditate tab is one of the three core Daily Hub practices where users come to quiet their minds and connect with God. This spec transforms its visual language to match the homepage's atmospheric design — layering purple glow backgrounds, gradient text headings, and frosted glass card styling — so the experience feels like entering a sanctuary rather than browsing a menu.

## User Story

As a **logged-in user or logged-out visitor**, I want the Meditate tab to feel visually immersive and consistent with the rest of the app so that the atmosphere itself invites me into a meditative state before I even begin.

## Requirements

### Functional Requirements

1. Add `GlowBackground` with `variant="split"` behind the existing `BackgroundSquiggle` layer — glow orbs at 25% and 75% horizontal positions to complement the 2-column card grid
2. Replace the Caveat script heading ("What's On Your **Spirit?**") with a unified gradient text heading ("What's On Your Spirit?") using `GRADIENT_TEXT_STYLE`
3. Upgrade the 6 meditation type card buttons to use FrostedCard visual DNA — `bg-white/[0.06]`, `border-white/[0.12]`, purple glow box-shadow, hover lift + shadow intensification, `motion-reduce:hover:translate-y-0`
4. Suggested cards (challenge context) keep their primary border + ring but gain an enhanced purple glow shadow
5. Update `focus-visible:ring-offset-dashboard-dark` to `focus-visible:ring-offset-hero-bg` to match the root background change from Spec 1

### Non-Functional Requirements

- **Performance**: No new network requests; all changes are CSS/className only
- **Accessibility**: All existing ARIA attributes, focus-visible rings, and keyboard navigation must be preserved exactly as-is
- **Motion**: Hover lift effect must respect `motion-reduce` (no translate on reduced motion)

## Auth Gating

No auth gating changes — this is a visuals-only spec. Existing auth behavior is preserved exactly:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Meditate tab | Can view all 6 cards | Can view all 6 cards | N/A |
| Click meditation card | Auth modal appears | Navigates to meditation sub-page | "Sign in to start meditating" |
| View completion checkmarks | Not shown | Green checkmarks on completed types | N/A |
| View "all complete" banner | Not shown | Golden glow banner when all 6 done | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 2-column card grid with `gap-4`, `p-4` card padding, glow orbs scale down ~40% |
| Tablet (640-1024px) | 2-column grid with `gap-6`, `p-5` card padding |
| Desktop (> 1024px) | Same as tablet — `max-w-2xl` constrains width |

No layout changes from current behavior. The `GlowBackground` component handles its own responsive scaling internally. Cards remain in a 2-column grid at all breakpoints.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The existing `AmbientSoundPill` and card click handlers are untouched.

## Auth & Persistence

- **Logged-out users:** Can view the tab with all visual enhancements; zero persistence
- **Logged-in users:** No new persistence; existing completion tracking via `useCompletionTracking()` is unchanged
- **Route type:** Public (within Daily Hub at `/daily?tab=meditate`)

## Completion & Navigation

No changes. Existing completion tracking (`completedMeditationTypes`, `allComplete` celebration banner) and navigation (`ROUTE_MAP` to meditation sub-pages) are untouched.

## Design Notes

- **GlowBackground** (`src/components/homepage/GlowBackground.tsx`): Use `variant="split"` which positions glow orbs at 25% and 75% horizontal — matches the 2-column grid rhythm
- **GRADIENT_TEXT_STYLE** (`src/constants/gradients.tsx`): Same `WHITE_PURPLE_GRADIENT` via `background-clip: text` used across all homepage headings
- **FrostedCard visual pattern** (from `09-design-system.md`): `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]` with dual box-shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
- **Hover states**: `bg-white/[0.09] border-white/[0.18]` with intensified shadow + `-translate-y-0.5`
- Card buttons use `cn()` utility for cleaner conditional className logic (replacing template literal)
- The `BackgroundSquiggle` remains in place — `GlowBackground` wraps the entire section as the outermost layer, with the squiggle and content nested inside

## Out of Scope

- Functional changes to meditation cards (auth checks, navigation, completion tracking, challenge context)
- Changes to the "all complete" golden glow celebration banner
- Changes to the "Suggested" badge text/layout
- Changes to the `AmbientSoundPill` component
- Changes to card inner content (icon, title, description, time, checkmarks)
- Any new components or files — all changes are in `MeditateTabContent.tsx`

## Acceptance Criteria

- [ ] Purple glow orbs are visible behind the meditation card grid at split positions (left ~25% and right ~75%)
- [ ] `BackgroundSquiggle` remains faintly visible (opacity 0.12) layered between the glow and the content
- [ ] Heading reads "What's On Your Spirit?" in white-to-purple gradient text (no Caveat script font, no separate `<span>`)
- [ ] All 6 meditation cards have frosted glass styling: `bg-white/[0.06]`, `border-white/[0.12]`, purple glow box-shadow
- [ ] Hovering a non-suggested card brightens the background to `bg-white/[0.09]`, brightens the border to `border-white/[0.18]`, lifts the card (`-translate-y-0.5`), and intensifies the shadow
- [ ] Hover lift is suppressed when `prefers-reduced-motion` is active (`motion-reduce:hover:translate-y-0`)
- [ ] Suggested card (challenge context) has `border-2 border-primary` + `ring-1 ring-primary/30` + enhanced purple glow shadow, visually distinct from standard cards
- [ ] Focus-visible ring offset uses `hero-bg` color (not `dashboard-dark`)
- [ ] The "all complete" golden glow celebration banner renders correctly above the card grid when all 6 meditations are done
- [ ] On mobile (375px), 2-column grid displays correctly with no overflow, glow orbs scale appropriately
- [ ] Card styles match the homepage `DifferentiatorSection` FrostedCards (same background opacity, border opacity, shadow values)
- [ ] Gradient heading matches the homepage gradient text headings (same gradient angle and colors)
