# HP-8: Recover "Your Journey to Healing" + Delete Feature Showcase

**Master Plan Reference:** N/A — part of the HP-1 through HP-9 homepage redesign series. Builds on shared components from HP-1 (`SectionHeading`, `useScrollReveal`, `staggerDelay`) and replaces the HP-2 `FeatureShowcase` with a recovered and upgraded `JourneySection`.

**Branch Strategy:** Continue on `homepage-redesign` branch. Do NOT create a new branch.

---

## Overview

The homepage guides a hurting person from curiosity to their first step toward healing. The "Your Journey to Healing" section is the emotional bridge between the hero's open-ended question and the specific features Worship Room offers. It presents a clear, numbered path — devotional, prayer, journaling, meditation, music, community, and local support — so visitors can see exactly what awaits them without feeling overwhelmed.

The current "Experience Worship Room" tabbed feature showcase (HP-2) is being replaced because a simple vertical list communicates the journey metaphor more naturally than tabs, reduces cognitive load, and better matches the sanctuary aesthetic established in HP-1 through HP-7.

## User Story

As a **logged-out visitor** scrolling the homepage, I want to see a clear step-by-step path through Worship Room's features so that I understand what the app offers and feel drawn to try the feature that meets my need.

## Requirements

### Part 1: Recover Original JourneySection from Git History

#### Functional Requirements

1. Recover `JourneySection.tsx` from git history (deleted in HP-1). The old component had numbered circles, a vertical connecting line, Caveat script font highlights, `BackgroundSquiggle` background, `useInView` scroll reveal, and a `JOURNEY_STEPS` array with 7 items (prefix, highlight, description, route).
2. Verify the recovered component renders before modifying it.

### Part 2: Update Content — New 7 Steps

#### Functional Requirements

Replace the old `JOURNEY_STEPS` array with these 7 steps:

| # | Prefix | Highlight (Caveat font) | Description | Route |
|---|--------|------------------------|-------------|-------|
| 1 | "Read a" | "Devotional" | "Start each morning with an inspiring quote, a scripture passage, and a reflection that ties it all together. Fresh content daily, shaped by the season of the church year." | `/daily?tab=devotional` |
| 2 | "Learn to" | "Pray" | "Begin with what's on your heart. Share how you're feeling and receive a personalized prayer grounded in Scripture — with ambient worship music as the words appear." | `/daily?tab=pray` |
| 3 | "Learn to" | "Journal" | "Put your thoughts into words. Write freely or follow guided prompts rooted in Scripture. Your entries are private, safe, and always here when you need to look back." | `/daily?tab=journal` |
| 4 | "Learn to" | "Meditate" | "Quiet your mind with six guided meditation types — breathing exercises, scripture soaking, gratitude reflections, and more. Let peace settle in." | `/daily?tab=meditate` |
| 5 | "Listen to" | "Music" | "Let worship carry you deeper. Curated Spotify playlists, 24 ambient sounds with crossfade mixing, and a full sleep library — scripture readings, bedtime stories, and rest routines." | `/music` |
| 6 | "Write on the" | "Prayer Wall" | "You're not alone. Share prayer requests and lift others up in a safe, supportive community. When someone prays for you, you'll feel it." | `/prayer-wall` |
| 7 | "Find" | "Local Support" | "Find churches, Christian counselors, and Celebrate Recovery meetings near you. Sometimes healing needs a hand to hold, not just a screen to touch." | `/local-support/churches` |

### Part 3: Visual Upgrade

#### 3a. Background Treatment — Squiggles + Glow Accents

1. Keep `BackgroundSquiggle` as the repeating background texture (it fills the full height of this tall section well).
2. Add two subtle glow orbs for atmospheric depth:
   - Top glow: ~15% from top, ~25% from left. Purple tinted (`bg-purple-500/[0.05]`, `w-[400px] h-[400px]`, `filter: blur(100px)`, `rounded-full`, `absolute`, `z-0`).
   - Middle glow: ~50% from top, ~75% from left. Same treatment.
3. Content renders at `z-1` (relative) above the glow orbs.
4. Any subtle float animation on glow orbs must be gated behind `prefers-reduced-motion: no-preference`.

#### 3b. Numbered Circles

1. Upgrade step number circles: `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-white font-semibold text-sm`.
2. Add subtle glow: `shadow-[0_0_15px_rgba(139,92,246,0.2)]`.

#### 3c. Connecting Vertical Line

1. Replace plain border/div with gradient line: `w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30`.
2. Line connects between numbered circles, creating a visual thread that's stronger near circles and fades in between.

#### 3d. Step Titles — Clickable with Hover

1. Each step title (prefix + highlight) wraps in a React Router `<Link to={step.route}>`.
2. Each step wrapper uses `group` class. On hover: `hover:bg-white/[0.02] rounded-xl transition-colors duration-200`.
3. Highlight word keeps Caveat font with purple gradient treatment.
4. Arrow icon (`ArrowRight` from Lucide, `w-4 h-4 text-white/30`) appears on hover after the description: `opacity-0 group-hover:opacity-100 transition-opacity duration-200`.

#### 3e. Description Text

1. Descriptions use: `text-white/60 text-sm sm:text-base leading-relaxed max-w-lg`.
2. The `max-w-lg` prevents descriptions from stretching too wide on desktop.

#### 3f. Scroll Reveal

1. Replace `useInView` with `useScrollReveal` from HP-1 for consistency with the rest of the homepage.
2. Keep staggered reveal at 120ms between items using `staggerDelay()` helper.

#### 3g. Section Heading

1. Use `SectionHeading` component from the homepage barrel.
   - Heading: **"Your Journey to Healing"**
   - Tagline: **"From prayer to community, every step draws you closer to peace."**
   - Alignment: `center`
2. The word "Healing" in the heading should use Caveat/script font with gradient treatment, preserving the emotional emphasis from the old design. This may require using the `SectionHeading` structurally but customizing the heading content via a render prop or inline JSX rather than a plain string.

#### 3h. Container

1. `max-w-2xl mx-auto px-4 sm:px-6` — narrow container appropriate for a vertical list.
2. Vertical spacing: `py-20 sm:py-28` — matching other homepage sections.

### Part 4: Delete FeatureShowcase and All Preview Components

#### Functional Requirements

1. Delete: `FeatureShowcase.tsx`, `FeatureShowcaseTabs.tsx`, `FeatureShowcasePanel.tsx`.
2. Delete all preview components: `DevotionalPreview.tsx`, `PrayerPreview.tsx`, `MeditationPreview.tsx`, `PrayerWallPreview.tsx`, `GrowthPreview.tsx`.
3. Delete the `previews/` directory.
4. Delete all associated test files (FeatureShowcase, FeatureShowcaseTabs, FeatureShowcasePanel, and all preview test files).
5. Remove `FeatureShowcase` export from `src/components/homepage/index.ts`.

### Part 5: Update Home.tsx

#### Functional Requirements

1. Replace `FeatureShowcase` with `JourneySection` in the homepage layout.
2. Import `JourneySection` from `@/components/JourneySection` (not from the homepage barrel).
3. Remove `PillarSection` from the layout (HP-9 will handle reordering).
4. Final section order:
   ```
   HeroSection
   JourneySection
   StatsBar
   DashboardPreview
   DifferentiatorSection
   StartingPointQuiz
   FinalCTA
   ```

### Non-Functional Requirements

- Performance: No additional network requests. All content is static.
- Accessibility: All links must have accessible names. Step numbers provide visual order context. Arrow icon on hover is decorative (`aria-hidden`). Touch targets on mobile meet 44px minimum.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click step link | Navigates to feature page (all routes are public) | Navigates to feature page | N/A |

No auth gating required — all 7 step links point to publicly accessible routes.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column. Numbered circles + text stack naturally. `px-4` padding. Descriptions at `text-sm`. Section padding `py-20`. |
| Tablet (640-1024px) | Same vertical list layout, slightly more breathing room with `px-6`. Descriptions at `text-base`. |
| Desktop (> 1024px) | Same vertical list in `max-w-2xl` centered container. Section padding `py-28`. Hover effects active (arrow reveal, background lift). |

The vertical list layout is inherently responsive — no layout changes needed between breakpoints. Text sizes and padding scale via Tailwind responsive prefixes.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full access. No data persistence needed.
- **Logged-in users:** Same experience. No data persistence needed.
- **localStorage usage:** None.

## Completion & Navigation

N/A — standalone homepage section. Each step links to its respective feature page for exploration.

## Design Notes

- **Reuse existing components:** `SectionHeading` for the heading, `BackgroundSquiggle` for background texture, `useScrollReveal` + `staggerDelay` for scroll animation.
- **Caveat font** (`font-script` in Tailwind) used for highlight words in step titles — matches existing heading pattern across the app ("Heart?", "Mind?", "Spirit?").
- **Purple gradient text** on highlight words should match the `GRADIENT_TEXT_STYLE` or `WHITE_PURPLE_GRADIENT` pattern used elsewhere on the homepage.
- **Glow orbs** match the atmospheric depth pattern established in HP-1 `GlowBackground` but are implemented inline since only two static orbs are needed (not a full component).
- **Vertical line gradient** is a new pattern — gradient connecting line between anchored circles. Flag for design system documentation.
- **`SectionHeading` may need minor enhancement** to support inline JSX (Caveat font on "Healing") rather than a plain string heading. If `SectionHeading` accepts only a string, the implementer should either extend it with a `headingContent` render prop or render the heading structure inline while keeping `SectionHeading`'s tagline and alignment behavior.

## Out of Scope

- Reordering DashboardPreview and DifferentiatorSection (HP-9)
- Any changes to StatsBar, DashboardPreview, DifferentiatorSection, StartingPointQuiz, or FinalCTA
- Backend wiring or data persistence (Phase 3)
- Light mode variant (Phase 4)
- Animated line-drawing effect on the connecting vertical line (future enhancement)

## Acceptance Criteria

- [ ] `JourneySection.tsx` recovered from git history and renders without errors
- [ ] 7 steps display with correct prefixes, highlights, descriptions, and routes per the content table
- [ ] Each step title is a clickable `<Link>` that navigates to the correct route
- [ ] Highlight words render in Caveat (`font-script`) font with purple gradient treatment
- [ ] Step number circles have purple glow treatment (`shadow-[0_0_15px_rgba(139,92,246,0.2)]`, `bg-purple-500/20`, `border-purple-500/40`)
- [ ] Connecting vertical line uses gradient (`from-purple-500/30 via-purple-500/15 to-purple-500/30`)
- [ ] `BackgroundSquiggle` renders as background texture for the full section height
- [ ] Two glow orbs render at ~15%/25% and ~50%/75% positions with `bg-purple-500/[0.05]` and `blur(100px)`
- [ ] Glow orb float animation (if any) is gated behind `prefers-reduced-motion: no-preference`
- [ ] Section heading reads "Your Journey to Healing" with "Healing" in Caveat script font
- [ ] Tagline reads "From prayer to community, every step draws you closer to peace."
- [ ] `useScrollReveal` drives scroll-triggered reveal (not `useInView`)
- [ ] Staggered reveal at ~120ms between items via `staggerDelay()`
- [ ] On hover, step rows show subtle background lift (`bg-white/[0.02]`) and `ArrowRight` icon fades in
- [ ] Descriptions are constrained to `max-w-lg` width
- [ ] Container is `max-w-2xl mx-auto` with `py-20 sm:py-28` vertical spacing
- [ ] `FeatureShowcase.tsx`, `FeatureShowcaseTabs.tsx`, `FeatureShowcasePanel.tsx` are deleted
- [ ] All 5 preview components are deleted (`DevotionalPreview`, `PrayerPreview`, `MeditationPreview`, `PrayerWallPreview`, `GrowthPreview`)
- [ ] `previews/` directory is deleted
- [ ] All FeatureShowcase-related test files are deleted (FeatureShowcase, FeatureShowcaseTabs, FeatureShowcasePanel, and all 5 preview tests)
- [ ] `FeatureShowcase` export removed from `src/components/homepage/index.ts`
- [ ] `Home.tsx` renders `JourneySection` imported from `@/components/JourneySection`
- [ ] `Home.tsx` no longer imports or renders `FeatureShowcase` or `PillarSection`
- [ ] All 7 step links navigate correctly when clicked
- [ ] All animations respect `prefers-reduced-motion` (instant visibility, no transitions)
- [ ] Build passes with 0 errors
- [ ] All remaining tests pass (FeatureShowcase test count removed, JourneySection tests added)
- [ ] Committed on `homepage-redesign` branch
