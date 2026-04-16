# HP-5: Homepage Differentiator Section

**Master Plan Reference:** N/A — standalone homepage section (part of homepage redesign series HP-1 through HP-7)

---

## Overview

The Differentiator Section communicates Worship Room's core values — the promises that set it apart from every other Christian app. This is the "why us" section, and the tone is quiet confidence: what we do and what we'll never do. No competitor names, no sales pitch. Just values stated plainly enough that users draw their own conclusions.

This section sits below the Three Pillars (HP-4) and above the Dashboard Preview (HP-6), anchoring the emotional journey from "what can I do here?" to "why should I trust this place?"

## User Story

As a **logged-out visitor**, I want to understand what makes Worship Room different so that I can decide whether this is a place I want to invest my spiritual life.

## Requirements

### Functional Requirements

1. Section renders 6 informational cards in a responsive grid, each communicating one differentiator
2. Each card displays an icon (inside a subtle accent container), a title, and a description
3. Cards are **not interactive** — no click handlers, no hover lift, no cursor pointer
4. Section uses `GlowBackground` with `variant="split"` for atmospheric lighting
5. Section heading uses `SectionHeading` with gradient text
6. Cards use `FrostedCard` from the homepage component library
7. No competitor names appear anywhere in the copy (implicit differentiation only)

### Non-Functional Requirements

- **Performance:** No additional network requests. All content is static/hardcoded.
- **Accessibility:** All icons must have `aria-hidden="true"` (decorative). Card titles provide the semantic content. Section has `aria-label` for screen readers.
- **Animation:** Scroll reveal with staggered card entrance. All animations respect `prefers-reduced-motion`.

## Auth Gating

This section is purely informational and appears on the public landing page. No auth gating required.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View section | Visible on landing page | N/A (logged-in users see Dashboard, not landing page) | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `grid-cols-1 gap-4` — single column, full-width cards |
| Tablet (640px–1024px) | `grid-cols-2 gap-6` — 2 columns, 3 rows |
| Desktop (> 1024px) | `grid-cols-3 gap-6` — 3 columns, 2 rows |

- Icon container and all text are **left-aligned** within cards on all breakpoints
- Grid spacing: `mt-12 sm:mt-16` between heading and grid

## AI Safety Considerations

N/A — This section does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Section is fully visible. No data persistence.
- **Logged-in users:** N/A — logged-in users see the Dashboard at `/`, not the landing page.
- **localStorage usage:** None.

## Completion & Navigation

N/A — standalone informational section, not part of the Daily Hub.

## Card Content

### Card 1: No Ads — Ever

- **Icon:** `ShieldOff` from Lucide (or best available "protection/no-intrusion" icon — verify export exists)
- **Title:** "Your prayer time is sacred"
- **Description:** "No ads. No sponsored content. No interruptions. When you open Worship Room, the only voice you'll hear is the one you came to listen to."

### Card 2: No Data Harvesting

- **Icon:** `EyeOff` from Lucide
- **Title:** "Your prayers stay between you and God"
- **Description:** "We don't sell your data, track your behavior for advertisers, or share your journal entries with anyone. Your spiritual life is private. Period."

### Card 3: No Surprise Charges

- **Icon:** `CreditCard` from Lucide (or `BadgeDollarSign` if it better conveys "honest pricing")
- **Title:** "Honest from day one"
- **Description:** "No hidden fees, no auto-renewing traps buried in fine print, no paywall that appears after you've invested weeks of your heart. You'll always know exactly where you stand."

### Card 4: Grace-Based, Not Guilt-Based

- **Icon:** `HeartHandshake` from Lucide
- **Title:** "We'll never guilt you for missing a day"
- **Description:** "Life happens. God's grace covers every gap. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we say welcome — not where have you been."

### Card 5: AI-Personalized Prayers

- **Icon:** `Sparkles` from Lucide
- **Title:** "Prayers that know your heart"
- **Description:** "Tell us how you're feeling, and we'll write a prayer just for you. Not a template. Not a generic blessing. A prayer shaped by your words, your moment, your need."

### Card 6: Crisis Resources Built In

- **Icon:** `LifeBuoy` from Lucide
- **Title:** "A safe space when it matters most"
- **Description:** "If you're in crisis, we won't just offer a verse. We'll connect you with the 988 Suicide & Crisis Lifeline, Crisis Text Line, and SAMHSA — because spiritual care and professional help belong together."

## Scroll Reveal Behavior

1. Section heading reveals on scroll enter via `useScrollReveal`
2. Cards use staggered reveal via `staggerDelay` from `useScrollReveal` — 100ms between cards, starting 200ms after heading
3. Stagger follows reading order: left-to-right, top-to-bottom (index 0–5 maps naturally to CSS grid flow)
4. All animations skip when `prefers-reduced-motion: reduce` is active (elements render immediately visible)

## Design Notes

- Uses existing `GlowBackground` component with `variant="split"` (left purple, right white glow)
- Uses existing `SectionHeading` component for heading with gradient text
- Uses existing `FrostedCard` component — pass no `onClick` prop so no hover/lift effects apply
- Icon container: `w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06]` with centered icon in `text-white/80`
- Title: `text-white text-base sm:text-lg font-semibold mt-4`
- Description: `text-white/55 text-sm leading-relaxed mt-2` (note: `text-white/55` is slightly below the WCAG AA threshold documented in the design system for secondary text at `text-white/60` — this is an intentional design choice for soft atmospheric copy on large cards where readability is maintained by large card size and ample spacing, matching the pattern established in existing homepage sections)
- Section wrapper: `py-20 sm:py-28` vertical spacing, `max-w-5xl mx-auto px-4 sm:px-6` container
- Data file pattern follows `pillar-data.ts` convention (array of typed objects with icon references)

## Component Structure

```
src/components/homepage/
├── DifferentiatorSection.tsx     ← Main section component
├── differentiator-data.ts        ← Card content array (typed, icons imported here)
└── index.ts                      ← Updated barrel export (add DifferentiatorSection)
```

Integration point: `DifferentiatorSection` added to `Home.tsx` below `PillarSection`.

## Out of Scope

- No click behavior on cards (they are informational, not navigational)
- No modal or expanded view for cards
- No backend API — all content is hardcoded
- No dynamic content based on user state or season
- No animations beyond scroll reveal (no card hover effects, no icon animations)
- Light mode styling (deferred to Phase 4)

## Acceptance Criteria

- [ ] `DifferentiatorSection` renders below `PillarSection` in `Home.tsx`
- [ ] 6 cards display in a responsive grid: 3 columns on desktop (>1024px), 2 columns on tablet (640–1024px), 1 column on mobile (<640px)
- [ ] Each card displays the correct Lucide icon, title text, and description text as specified
- [ ] Cards use `FrostedCard` from the homepage component library with no `onClick` prop (no hover lift, no cursor pointer)
- [ ] Icons render inside `rounded-xl` containers with `bg-white/[0.06]` background
- [ ] Icons have `aria-hidden="true"` (decorative)
- [ ] No competitor names appear anywhere in the source code or rendered copy
- [ ] `GlowBackground` with `variant="split"` wraps the section content
- [ ] `SectionHeading` renders heading "Built for Your Heart, Not Our Bottom Line" with gradient text
- [ ] `SectionHeading` renders tagline "The things we'll never do matter as much as the things we will."
- [ ] Scroll reveal triggers on section enter with staggered card appearance (100ms between cards, 200ms initial delay)
- [ ] All animations are skipped when `prefers-reduced-motion: reduce` is active (cards render immediately visible)
- [ ] Text is left-aligned within cards on all breakpoints
- [ ] Section has `aria-label` for screen readers
- [ ] Card content data is extracted into a separate `differentiator-data.ts` file
- [ ] `index.ts` barrel export includes `DifferentiatorSection`
- [ ] No new external dependencies added
- [ ] All new components have passing tests
- [ ] Build passes with 0 errors
- [ ] All existing tests still pass
