# HP-7: Homepage Quiz Polish + Final CTA + Animation Pass

**Master Plan Reference:** N/A — final spec in the HP-1 through HP-7 homepage redesign series. Builds on components introduced in HP-1 (`GlowBackground`, `SectionHeading`, `FrostedCard`, `useScrollReveal`, `WHITE_PURPLE_GRADIENT`).

**Branch Strategy:** Continue on `homepage-redesign` branch. Do NOT create a new branch.

---

## Overview

The homepage is the first thing a hurting person sees when they find Worship Room. After HP-1 through HP-6 established a cohesive dark, sanctuary-like aesthetic with frosted glass cards and glow backgrounds, the Starting Point Quiz section still uses the older visual treatment. This spec brings the quiz into visual alignment, adds a warm final call-to-action, and ensures every section on the page flows together as one seamless experience — from the hero all the way to the footer.

## User Story

As a **logged-out visitor** scrolling through the homepage, I want the quiz and closing sections to feel like a natural continuation of the page so that my experience feels cohesive, unhurried, and inviting — never jarring or disjointed.

## Requirements

### Part 1: Starting Point Quiz Visual Polish

The quiz logic, data, scoring, and routing remain unchanged. Only the visual wrapper is updated.

#### Functional Requirements

1. Replace `BackgroundSquiggle` usage in `StartingPointQuiz` with `GlowBackground` (variant `center`). If `BackgroundSquiggle` has no other consumers after this change, delete `BackgroundSquiggle.tsx`.
2. Replace the existing custom heading with the shared `SectionHeading` component. Preserve the current heading text — the goal is visual consistency via the shared component, not a copy change. If the current heading is "Not Sure Where to Start?" with tagline "Take a 30-second quiz and we'll point you in the right direction.", keep that. If different, match whatever exists using `SectionHeading` with `center` alignment.
3. Upgrade quiz option buttons to frosted glass treatment:
   - Default: `bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/70 text-left`
   - Hover: `bg-white/[0.08] border-white/[0.12]`
   - Selected: `bg-purple-500/20 border-purple-500/30 text-white`
   - Transition: `transition-all duration-150`
   - Min height: `min-h-[44px]` (touch target)
4. Wrap the quiz result card in `FrostedCard`. Add a subtle glow behind it (absolutely positioned `w-[300px] h-[300px] bg-purple-500/10 rounded-full filter blur-[80px]` centered behind the card). The `KaraokeTextReveal` behavior inside the result is unchanged.
5. Upgrade the destination CTA button in the result card: `bg-white text-hero-bg font-semibold px-6 py-3 rounded-full` (matching Dashboard Preview CTA style).
6. Upgrade the progress bar:
   - Track: `bg-white/[0.06] h-1 rounded-full`
   - Fill: `bg-gradient-to-r from-purple-500 to-white/80` with `transition-all duration-300 ease-out` on width
7. Replace `useInView` with `useScrollReveal` for the section's scroll-triggered reveal.
8. Standardize container width to `max-w-5xl mx-auto px-4 sm:px-6`.

### Part 2: Final CTA Section

#### Functional Requirements

1. New `FinalCTA` component renders between `StartingPointQuiz` and `SiteFooter` in `Home.tsx`.
2. Uses `GlowBackground` with `variant="center"`. Add an extra glow div for slightly more intensity (opacity `0.08-0.10`) compared to other sections.
3. Content (all centered, no card wrapper):
   - Heading: "Your Healing Starts Here" — `text-3xl sm:text-4xl lg:text-5xl font-bold` with `WHITE_PURPLE_GRADIENT` gradient text
   - Subtext: "No credit card. No commitment. Just a quiet room where God meets you where you are." — `text-white/55 text-base sm:text-lg mt-4 max-w-xl mx-auto leading-relaxed`
   - CTA button: "Get Started — It's Free" — `bg-white text-hero-bg font-semibold px-8 py-3.5 rounded-full text-base sm:text-lg hover:bg-white/90 transition-colors duration-200 mt-8`
   - Trust line: "Join thousands finding peace, one prayer at a time." — `text-white/30 text-xs mt-4 tracking-wide`
4. CTA button click: opens auth modal via `useAuthModal()`.
5. Scroll reveal with staggered timing: heading (0ms), subtext (150ms), button + trust line (300ms).
6. Container: `max-w-3xl mx-auto px-4 sm:px-6 text-center`
7. Vertical spacing: `py-20 sm:py-28`

### Part 3: Full-Page Animation Pass

#### Functional Requirements

1. **Scroll reveal consistency**: Every homepage section (FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview, StartingPointQuiz, FinalCTA) must use `useScrollReveal` with the `scroll-reveal` CSS class. Do NOT delete `useInView` — other non-homepage components use it.
2. **No double-trigger**: All `useScrollReveal` instances must use `triggerOnce: true` (the default). Each section animates in exactly once.
3. **Stagger timing consistency** across all sections:
   - Section heading: 0ms (immediate on reveal)
   - Primary content (tabs, grid, accordion): 150-200ms after heading
   - Individual grid items: 80-100ms between items
   - CTAs: 200-300ms after last content item
4. **Vertical spacing consistency**:
   - Standard sections: `py-20 sm:py-28`
   - Stats bar (compact): `py-14 sm:py-20`
   - Hero: unchanged
   - Quiz and Final CTA: `py-20 sm:py-28`
5. **GlowBackground variety**: No 3+ adjacent sections with the same variant. Target layout:
   - FeatureShowcase: `split`
   - StatsBar: `center`
   - PillarSection: `left`/`right`/`center` per pillar
   - DifferentiatorSection: `split`
   - DashboardPreview: `center`
   - StartingPointQuiz: `center` → adjust to `left` or `right` if 3 adjacent `center` variants result
   - FinalCTA: `center` (brighter)
6. **Home.tsx cleanup**: Remove all HP-1 placeholder comments. Final section order: Hero → FeatureShowcase → StatsBar → PillarSection → DifferentiatorSection → DashboardPreview → StartingPointQuiz → FinalCTA → SiteFooter.

### Non-Functional Requirements

- **Reduced motion**: With `prefers-reduced-motion` enabled, all sections are immediately visible (no opacity-0 states), no counter animations, no stagger delays, no tab/accordion animations. Page is fully functional and readable.
- **Mobile scroll performance**: Glow background divs should not cause scroll jank. Ensure GPU compositing via `will-change: transform` or equivalent. IntersectionObserver instances must clean up on unmount.
- **Accessibility**: All interactive elements remain keyboard accessible. Touch targets remain 44px minimum. Color contrast unchanged.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Quiz option selection | Works normally — no auth needed | Works normally | N/A |
| Quiz result CTA | Navigates to recommended feature | Navigates to recommended feature | N/A |
| Final CTA "Get Started" button | Opens auth modal | N/A (section only shows for logged-out visitors) | "Sign in to get started" (default auth modal) |

Note: The quiz is 100% client-side with no persistence. No auth gating on quiz interaction. The Final CTA section should only render for logged-out visitors (if the homepage only shows for logged-out visitors, this is implicit).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Quiz options stack full-width. Result card full-width with reduced glow (smaller blur radius). Final CTA heading `text-3xl`. Progress bar full-width. All sections single-column. |
| Tablet (640-1024px) | Quiz options 2-column grid if space allows. Result card with standard glow. Final CTA heading `text-4xl`. |
| Desktop (> 1024px) | Quiz options comfortable spacing within `max-w-5xl`. Final CTA heading `text-5xl` with full glow effect. |

- Quiz option buttons: full-width on mobile, natural width within grid on larger screens
- Final CTA: breathing section with generous vertical padding at all sizes
- Glow backgrounds: consider reducing blur radius on mobile for performance (`blur(60px)` instead of `blur(100px)`)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The quiz is a fixed-choice selection. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full quiz interaction, view Final CTA. Zero persistence — quiz state is React component state only.
- **Logged-in users:** See dashboard instead of homepage — these sections don't render.
- **localStorage usage:** None for these changes.

## Completion & Navigation

N/A — standalone homepage sections. Quiz completion routes to a recommended feature page (existing behavior, unchanged).

## Design Notes

- **Shared components used:** `GlowBackground` (HP-1), `SectionHeading` (HP-1), `FrostedCard` (HP-1), `useScrollReveal` (HP-1), `WHITE_PURPLE_GRADIENT` from `constants/gradients.tsx`
- **Auth modal:** `useAuthModal()` from `AuthModalProvider` — existing pattern used across the app
- **`BackgroundSquiggle` removal:** This component is currently listed in the design system (`09-design-system.md`) as used by all 4 Daily Hub tabs. If the quiz was its only consumer outside Daily Hub, removal is safe. If Daily Hub tabs still use it, keep the file — only remove the quiz's usage.
- **Progress bar gradient:** Uses `from-purple-500 to-white/80` which matches the site's purple-to-white aesthetic seen in level progress bars and other indicators.
- **Result card glow:** A new decorative pattern (absolutely positioned blur glow behind a card). Similar to glow orbs in `GlowBackground` but smaller and card-specific. **New pattern** — values derived from spec, mark as `[UNVERIFIED]` during planning.
- **Section flow:** All sections share `bg-hero-bg` (#0D0620) background via `GlowBackground`'s built-in `bg-hero-bg` class. No seams between sections.

## Out of Scope

- Quiz logic, data, scoring, or routing changes (visual polish only)
- Hero section changes (stays as-is from HP-1)
- Light mode support (Phase 4)
- Real authentication flow (Phase 3 — auth modal is UI shell only)
- Real analytics or conversion tracking
- A/B testing of CTA copy
- Footer modifications
- Changes to `useInView` hook (other components still use it)
- Backend API integration

## Acceptance Criteria

### Quiz Polish
- [ ] `BackgroundSquiggle` is no longer used in `StartingPointQuiz`; replaced with `GlowBackground variant="center"`
- [ ] If `BackgroundSquiggle` has no other consumers, `BackgroundSquiggle.tsx` is deleted
- [ ] Quiz heading renders via the shared `SectionHeading` component with `center` alignment
- [ ] Quiz option buttons use frosted glass styling: `bg-white/[0.05]` default, `bg-white/[0.08]` hover, `bg-purple-500/20` selected, with `border`, `rounded-xl`, and `min-h-[44px]`
- [ ] Quiz result card is wrapped in `FrostedCard` with a subtle purple radial glow (`blur-[80px]`) centered behind it
- [ ] Result card CTA button styled `bg-white text-hero-bg font-semibold px-6 py-3 rounded-full`
- [ ] Progress bar track is `bg-white/[0.06] h-1 rounded-full`; fill uses `bg-gradient-to-r from-purple-500 to-white/80` with `transition-all duration-300 ease-out`
- [ ] Quiz section uses `useScrollReveal` (not `useInView`)
- [ ] Quiz container width is `max-w-5xl mx-auto px-4 sm:px-6`

### Final CTA
- [ ] `FinalCTA` component renders between `StartingPointQuiz` and `SiteFooter` in `Home.tsx`
- [ ] Heading "Your Healing Starts Here" uses `WHITE_PURPLE_GRADIENT` for gradient text effect
- [ ] Subtext reads "No credit card. No commitment. Just a quiet room where God meets you where you are."
- [ ] CTA button reads "Get Started — It's Free" and opens auth modal on click
- [ ] Trust line "Join thousands finding peace, one prayer at a time." appears below the button in `text-white/30 text-xs`
- [ ] Section uses `GlowBackground variant="center"` with slightly brighter glow than other sections
- [ ] Scroll reveal with staggered timing: heading (0ms), subtext (150ms), button (300ms)
- [ ] Container is `max-w-3xl` with `text-center` alignment
- [ ] Vertical padding is `py-20 sm:py-28`

### Animation Pass
- [ ] All 7 homepage sections (FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview, StartingPointQuiz, FinalCTA) use `useScrollReveal` — none use `useInView`
- [ ] All scroll reveals trigger exactly once (scrolling up and back down does not re-animate)
- [ ] Stagger timing follows consistent pattern: heading 0ms, content 150-200ms, items 80-100ms apart, CTAs 200-300ms after content
- [ ] Standard sections use `py-20 sm:py-28`; StatsBar uses `py-14 sm:py-20`
- [ ] No 3+ adjacent sections share the same `GlowBackground` variant
- [ ] With `prefers-reduced-motion`: all sections immediately visible, no opacity-0 states, no animations, page fully functional
- [ ] Mobile scrolling has no visible jank from glow backgrounds or observer count
- [ ] All section boundaries from Hero to Footer flow smoothly (no double padding, no jarring color shifts, no visual collisions)

### General
- [ ] `Home.tsx` has no HP-1 placeholder comments; section order is finalized
- [ ] No external dependencies added
- [ ] All new and modified components have passing tests
- [ ] Build passes with 0 errors, 0 warnings
- [ ] All existing tests still pass
- [ ] Committed on `homepage-redesign` branch
