# BB-1: Dark Cinematic Foundation + Page Theming

**Master Plan Reference:** N/A — part of the Bible Redesign series (BB-0 through BB-4+), but no master plan document exists yet.
**Depends on:** BB-0 (landing composition — BibleHero, ResumeReadingCard, TodaysPlanCard, VerseOfTheDay, QuickActionsRow, StreakChip, BibleSearchEntry must exist)
**Hands off to:** BB-2 (books picker inherits this theme system)

---

## Overview

The `/bible` page is one of the core gateways in Worship Room — the place where users go to encounter Scripture. Right now it has three visual sins that break the sanctuary immersion: a misused script font heading, raw violet hex values ignoring the design token system, and a flat void with no atmospheric glow. This spec applies the established dark cinematic theme from the homepage redesign to everything BB-0 scaffolded, bringing `/bible` into visual parity with `/` and `/daily` so users feel the same atmosphere of peace and beauty throughout the app.

This is a **visual-only** spec. No new behavior, no new data layer, no new tokens.

## User Story

As a **logged-out visitor or logged-in user**, I want the Bible landing page to feel like the same peaceful, immersive product as the homepage and Daily Hub so that navigating to `/bible` doesn't break the sanctuary atmosphere.

## Requirements

### Functional Requirements

1. **Kill the script font.** Remove Caveat (`font-script`) from the Bible page hero entirely. Replace with the established 2-line heading treatment using `SectionHeading` or the same Inter + `GRADIENT_TEXT_STYLE` pattern. Working copy: **"The Word of God"** (top line, white) / **"open to you"** (bottom line, white-to-purple gradient). Audit all Bible landing components for any other script font usage and remove it.

2. **Apply atmospheric background.** The Bible landing page background must use `bg-hero-bg` (#08051A) with 2-4 positioned glow orbs in the 0.25-0.50 opacity range (matching the homepage inline glow system, NOT the `GlowBackground` component defaults). Orbs use `radial-gradient(circle, rgba(139, 92, 246, CENTER_OPACITY) 0%, rgba(139, 92, 246, MID_OPACITY) 40%, transparent 70%)` — the two-stop gradient pattern from the homepage.

3. **Replace all raw hex values.** Every color in Bible landing components must use Tailwind design tokens (`text-white`, `text-white/60`, `bg-hero-bg`, `text-primary`, etc.). Zero raw hex values (`#7C3AED`, `#6D28D9` inline, `rgb(...)` inline) allowed in any Bible landing component. All borders use token classes (`border-white/[0.12]`, `border-dark-border`, etc.).

4. **Apply FrostedCard treatment to all cards.** Resume Reading, Today's Plan, Verse of the Day, and quick action cards all use the `FrostedCard` component or its exact class string: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out`. Interactive cards get the hover treatment: `bg-white/[0.09] border-white/[0.18]` with intensified shadows and `translateY(-2px)`.

5. **Hero uses the established Atmospheric PageHero pattern.** Background: `#0f0a1e` (dashboard-dark) with `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)`. The 2-line heading sits inside this with centered alignment. Subhead uses `text-white/60` with `font-sans` (not Lora italic — this page is a launcher, not a reading context).

6. **Streak chip glow.** When the streak chip is present, it has a subtle glow (`shadow-[0_0_12px_rgba(139,92,246,0.15)]`). When the streak count is > 7, the glow intensifies (`shadow-[0_0_20px_rgba(139,92,246,0.30)]`). Transition between states is `transition-shadow duration-300`.

7. **Resume Reading card gets primary visual weight.** When present, it should have slightly stronger glow/shadow treatment than other cards — a differentiated primary CTA. When absent (first-run), the "Start your first reading" empty state card takes this same primary weight slot with the same visual strength.

8. **Glow orbs respect `prefers-reduced-motion`.** Orbs with any drift/float animation must use `motion-reduce:animate-none`. Static orbs with no animation are acceptable and don't need the media query check.

9. **Section dividers.** Between the hero and card content, and between card sections if there are distinct groups, use the homepage divider pattern: `<div className="border-t border-white/[0.08] max-w-6xl mx-auto" />`.

10. **Text defaults to white.** All readable text on the Bible landing uses `text-white` as the baseline. De-emphasized text (subheads, timestamps, secondary labels) uses `text-white/60` or `text-white/50` per the design system opacity table. No text below `text-white/50` except decorative elements.

### Non-Functional Requirements

- **Performance:** Glow orbs use `will-change: transform` for GPU compositing. No more than 4 blur layers on the page.
- **Accessibility:** Text contrast meets WCAG AA (4.5:1 for body text, 3:1 for large headings). All interactive cards have visible focus rings (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`). Reduced motion respected on all animations.

## Auth Gating

**This spec makes no auth gating changes.** The Bible landing page (`/bible`) is fully public. No interactive elements added or removed.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View `/bible` landing | Full page visible | Full page visible | N/A |
| Click Resume Reading card | Navigates to last-read chapter | Navigates to last-read chapter | N/A |
| Click Today's Plan card | Navigates to reading plan | Navigates to reading plan | N/A |
| Click quick action links | Navigate to respective routes | Navigate to respective routes | N/A |

All existing auth behavior from BB-0 is preserved unchanged.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero heading scales to `text-2xl` / `text-4xl` (top/bottom lines). Glow orbs reduce size by 40% and blur by 25%. Cards stack single-column with `gap-4`. Quick actions use 2-column grid. All touch targets remain ≥ 44px. |
| Tablet (640-1024px) | Hero heading at `text-3xl` / `text-5xl`. Cards remain single-column or move to 2-column where appropriate. Orbs at intermediate sizing. |
| Desktop (> 1024px) | Full-size headings (`text-4xl` / `text-6xl`). Cards at full width within `max-w-4xl` container. Orbs at full size (400-700px) with `blur(80px)`. |

- Hero padding follows the established `PageHero` pattern: `px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`
- Content container: `mx-auto max-w-4xl px-4`
- No horizontal scroll at 375px viewport width

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full page visible. Zero data persistence (no changes from BB-0).
- **Logged-in users:** No persistence changes from BB-0. Resume Reading and Today's Plan cards read from existing `wr_bible_last_read` and `wr_bible_active_plans` localStorage keys — unchanged.
- **Route type:** Public

## Completion & Navigation

N/A — standalone page, not part of Daily Hub tabbed experience.

## Design Notes

- **Heading treatment:** Use the established `SectionHeading` 2-line pattern or replicate its styling directly. Top line: `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`. Bottom line: `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` with `GRADIENT_TEXT_STYLE` (from `constants/gradients.tsx`).
- **Glow orb implementation:** Use the homepage inline two-stop radial gradient pattern — NOT the `GlowBackground` component (which would bring its own `overflow-hidden` container semantics). Create a `BibleLandingOrbs.tsx` component with absolutely positioned divs if needed.
- **Card pattern:** Use the existing `FrostedCard` component from `components/homepage/FrostedCard.tsx`. All cards interactive (pass `onClick`).
- **Deprecated patterns to avoid:** Caveat font on headings, `animate-glow-pulse`, raw hex values, `GlowBackground` component wrapping individual sections.
- **Design system recon available:** `_plans/recon/design-system.md` has exact computed values for all hero patterns, glow opacities, card styles, and spacing. Reference the "Variant 3: Atmospheric PageHero" pattern for the hero background. Reference the "FrostedCard Component" section for exact card styles.

### Glow Orb Placement (Suggested)

3 orbs, positioned to frame the content without competing:

| Orb | Position | Size (desktop) | Center Opacity | Mid Opacity | Purpose |
|-----|----------|---------------|----------------|-------------|---------|
| 1 | top: 10%, right: 15% | 600×600px | 0.30 | 0.12 | Frame the hero |
| 2 | top: 45%, left: 10% | 500×500px | 0.25 | 0.10 | Behind VOTD card area |
| 3 | top: 75%, right: 20% | 400×400px | 0.28 | 0.10 | Behind quick actions |

Mobile: reduce sizes by 40%, blur from 80px to 60px.

Execution may adjust placement based on actual content flow, but stay within the 0.25-0.50 center opacity range and use the two-stop gradient pattern.

## Out of Scope

- **No new functionality** — BB-1 is purely visual. No behavior changes.
- **No data layer changes** — `landingState.ts`, `votdSelector.ts`, and localStorage schema are untouched.
- **No reader theming** — BB-4 will theme the reader view (`/bible/:book/:chapter`).
- **No books picker theming** — BB-2 will theme the books picker as part of building it.
- **No new design tokens** — if a token is missing for a need, stop and flag it rather than inventing one.
- **No ESLint rule creation** — enforcement of zero raw hex is verified via grep check in acceptance criteria, not a new lint rule.
- **Backend work** — all frontend-only.

## Acceptance Criteria

- [ ] The Caveat (`font-script`) font no longer appears anywhere on `/bible` landing (grep for `font-script`, `Caveat`, `font-cursive` in Bible landing components returns zero matches)
- [ ] Zero raw hex values in any Bible landing component (`grep -E '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(' src/components/bible/landing/ src/pages/BibleBrowser.tsx` returns zero matches, excluding Tailwind arbitrary values like `rgba(139,92,246,0.06)` in shadow utilities)
- [ ] The page hero uses the 2-line heading treatment: "The Word of God" (white, Inter bold) / "open to you" (gradient text, Inter bold, larger)
- [ ] Hero background matches the Atmospheric PageHero pattern: `bg-dashboard-dark` with `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)`
- [ ] 2-4 glow orbs are present with center opacity in the 0.25-0.50 range, using two-stop radial gradients
- [ ] Glow orbs respect `prefers-reduced-motion` (no animation when reduced motion is set)
- [ ] All cards use `FrostedCard` component or its exact class string (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`)
- [ ] Interactive cards show hover state: background shifts to `bg-white/[0.09]`, border to `border-white/[0.18]`, `translateY(-2px)` lift
- [ ] Resume Reading card has stronger visual weight than other cards when present (differentiated shadow/glow)
- [ ] Empty state cards receive the same visual treatment as populated cards (same FrostedCard, same atmosphere)
- [ ] Streak chip shows subtle glow; glow intensifies when streak count > 7
- [ ] All readable text uses `text-white` as baseline; de-emphasized text uses `text-white/60` or `text-white/50`
- [ ] Section dividers use `border-t border-white/[0.08] max-w-6xl mx-auto`
- [ ] Mobile (375px viewport) renders without horizontal scroll
- [ ] All touch targets are ≥ 44px
- [ ] All interactive elements have visible `focus-visible` ring
- [ ] Hero padding matches established `PageHero` spacing: `px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`
- [ ] Visual parity with the homepage — same gradient language, same orb language, same card treatment, same type system. Opening `/` and `/bible` in adjacent tabs feels like the same product.
