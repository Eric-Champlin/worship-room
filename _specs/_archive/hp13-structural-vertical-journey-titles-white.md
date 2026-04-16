# HP-13: Structural — Vertical Journey, 2-Line Titles, Grey→White Text Pass

**Branch Strategy:** Continue on `homepage-redesign` — do NOT create a new branch.

---

## Overview

Four structural changes across the homepage that improve visual hierarchy, readability, and consistency. The Journey section reverts to a vertical layout with descriptions and squiggles. All section titles adopt a 2-line treatment (smaller white top line + larger purple gradient bottom line). The Final CTA gets trimmed. And a systematic pass converts all grey/muted text to white for stronger contrast.

## User Story

As a **logged-out visitor**, I want to see a clear, high-contrast homepage with consistent heading treatments and a detailed journey walkthrough so that I understand what Worship Room offers and feel drawn to sign up.

## Requirements

### Part 1: Journey Section — Back to Vertical

1. Revert `JourneySection` from horizontal layout (HP-8b) to a vertical numbered list
2. Numbered circles connected by a vertical line, each step has title + description
3. 7 steps with these titles and descriptions:

| Step | Title | Description |
|------|-------|-------------|
| 1 | Read a **Devotional** | Start each morning with an inspiring quote, a scripture passage, and a reflection that ties it all together. Fresh content daily, shaped by the season of the church year. |
| 2 | Learn to **Pray** | Begin with what's on your heart. Share how you're feeling and receive a personalized prayer grounded in Scripture — with ambient worship music as the words appear. |
| 3 | Learn to **Journal** | Put your thoughts into words. Write freely or follow guided prompts rooted in Scripture. Your entries are private, safe, and always here when you need to look back. |
| 4 | Learn to **Meditate** | Quiet your mind with six guided meditation types — breathing exercises, scripture soaking, gratitude reflections, and more. Let peace settle in. |
| 5 | Listen to **Music** | Let worship carry you deeper. Curated Spotify playlists, 24 ambient sounds with crossfade mixing, and a full sleep library — scripture readings, bedtime stories, and rest routines. |
| 6 | Write on the **Prayer Wall** | You're not alone. Share prayer requests and lift others up in a safe, supportive community. When someone prays for you, you'll feel it. |
| 7 | Find **Local Support** | Find churches, Christian counselors, and Celebrate Recovery meetings near you. Sometimes healing needs a hand to hold, not just a screen to touch. |

4. Bolded keyword in each title uses `WHITE_PURPLE_GRADIENT` via `background-clip: text` + `text-transparent` (NOT Caveat script font)
5. Each step wraps in a `<Link>` to its feature route:
   - Devotional → `/daily?tab=devotional`
   - Pray → `/daily?tab=pray`
   - Journal → `/daily?tab=journal`
   - Meditate → `/daily?tab=meditate`
   - Music → `/music`
   - Prayer Wall → `/prayer-wall`
   - Local Support → `/local-support/churches`
6. Hover: subtle background lift + arrow icon appears
7. Numbered circles: `w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40` with glow `shadow-[0_0_20px_rgba(139,92,246,0.25)]`
8. Connecting line: `w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30`
9. `BackgroundSquiggle` restored, constrained to center 40-50% of viewport width (NOT full-width). Squiggles must be narrow and centered behind the steps.
10. Two glow orbs (top-left, mid-right) behind squiggles and content
11. Description text: `text-white text-sm sm:text-base leading-relaxed max-w-lg`
12. Container: `max-w-2xl mx-auto px-4 sm:px-6`, `py-20 sm:py-28`
13. Scroll reveal with `useScrollReveal`, staggered at 120ms between items

### Part 2: 2-Line Section Title Treatment

14. Update `SectionHeading` to accept `topLine` + `bottomLine` props
15. Top line: `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`
16. Bottom line: `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1` with `WHITE_PURPLE_GRADIENT`
17. Optional `tagline` prop: `text-white text-base sm:text-lg mt-4 max-w-2xl mx-auto`
18. Backward compatibility: if old `heading` prop is provided, render as single line
19. Apply 2-line treatment to all homepage sections:

| Section | Top Line | Bottom Line | Tagline |
|---------|----------|-------------|---------|
| JourneySection | "Your Journey to" | "Healing" | "From prayer to community, every step draws you closer to peace." |
| DashboardPreview | "See What's" | "Waiting for You" | "Create a free account and unlock your personal dashboard." |
| DifferentiatorSection | "Built for" | "Your Heart" | "The things we'll never do matter as much as the things we will." |
| StartingPointQuiz | "Not Sure Where to" | "Start?" | "Take a 30-second quiz and we'll point you in the right direction." |
| FinalCTA | "Your Healing" | "Starts Here" | N/A (subtitle and button follow separately) |

20. FinalCTA must match the 2-line sizing even if it doesn't use `SectionHeading` directly

### Part 3: Final CTA Copy Edits

21. Shorten subtext to: "No credit card. No commitment." (remove "Just a quiet room where God meets you where you are.")
22. Remove trust line entirely ("Join thousands finding peace, one prayer at a time.")
23. Keep "Get Started — It's Free" button unchanged

### Part 4: Grey → White Text Pass

24. Convert all `text-white/30` through `text-white/70` to `text-white` across all homepage files
25. Exception: StatsBar ALL CAPS labels → `text-white/90` (not full white)
26. Exception: Lock overlay text stays `text-white/50`, lock overlay icon stays `text-white/40`
27. Exception: `placeholder:text-white/...` on inputs stays muted
28. Files to sweep: JourneySection, StartingPointQuiz, StatsBar, DashboardPreview, DashboardPreviewCard, DifferentiatorSection, differentiator-data, FinalCTA, SectionHeading, FrostedCard, GlowBackground, dashboard-preview-data

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click journey step link | Navigates to feature route (public) | Navigates to feature route | N/A |
| Click "Get Started — It's Free" | Opens auth modal | N/A (button not shown to logged-in users) | Standard auth modal |
| View all content | Full homepage visible | Redirects to dashboard | N/A |

No new auth gates introduced. All changes are visual/structural.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Journey steps stack vertically (same as desktop but tighter). Section headings scale down (text-2xl top / text-4xl bottom). Squiggles still centered at 40-50% width. |
| Tablet (640-1024px) | Same vertical layout. Headings at sm breakpoint sizes (text-3xl top / text-5xl bottom). |
| Desktop (> 1024px) | Full vertical layout with max-w-2xl container. Headings at lg sizes (text-4xl top / text-6xl bottom). |

Journey section is inherently mobile-friendly as a vertical list. No layout changes between breakpoints — only typography scaling.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full homepage visible, no persistence needed
- **Logged-in users:** Redirected to dashboard (never see homepage)
- **localStorage usage:** None — purely visual changes

## Completion & Navigation

N/A — Homepage landing page, not a Daily Hub feature.

## Design Notes

- Reference `WHITE_PURPLE_GRADIENT` constant from the existing design system for gradient text
- Reference `BackgroundSquiggle` component for journey background decoration
- Reference `useScrollReveal` hook for scroll-triggered animations
- Reference existing `SectionHeading` component — extend it with backward compatibility
- Reference existing `FinalCTA` component structure
- The 2-line heading treatment is a **new pattern** not yet in the design system — top line white, bottom line gradient, with specific size ratios
- Squiggle width constraint (40-50% centered) may require a new wrapper — verify `BackgroundSquiggle` accepts className or needs container constraint

## Out of Scope

- Light mode support (Phase 4)
- Non-homepage pages (this pass is homepage-only)
- New components or pages
- Backend changes
- Test content changes (only update test assertions if they check for muted text classes)

## Acceptance Criteria

### Journey Section
- [ ] Vertical layout restored (not horizontal flex-wrap)
- [ ] 7 steps rendered with numbered circles, titles, and descriptions
- [ ] Keyword in each title uses `WHITE_PURPLE_GRADIENT` gradient text (not Caveat font)
- [ ] All 7 steps are clickable links routing to correct feature pages
- [ ] Vertical connecting line visible between numbered circles
- [ ] `BackgroundSquiggle` rendered narrow and centered (middle 40-50% of viewport width)
- [ ] Squiggles do NOT stretch to full page width
- [ ] Two glow orbs present behind content
- [ ] All description text is `text-white` (not grey/muted)
- [ ] Scroll reveal animates steps with 120ms stagger

### 2-Line Titles
- [ ] `SectionHeading` accepts `topLine` + `bottomLine` props
- [ ] Top line renders at `text-2xl sm:text-3xl lg:text-4xl` in white
- [ ] Bottom line renders at `text-4xl sm:text-5xl lg:text-6xl` in purple gradient
- [ ] Old `heading` prop still works (backward compatibility)
- [ ] JourneySection heading: "Your Journey to" / "Healing"
- [ ] DashboardPreview heading: "See What's" / "Waiting for You"
- [ ] DifferentiatorSection heading: "Built for" / "Your Heart"
- [ ] StartingPointQuiz heading: "Not Sure Where to" / "Start?"
- [ ] FinalCTA heading: "Your Healing" / "Starts Here" with matching 2-line sizing

### Final CTA
- [ ] Subtext is exactly "No credit card. No commitment." (no additional text)
- [ ] Trust line ("Join thousands...") completely removed
- [ ] "Get Started — It's Free" button unchanged and functional

### Grey → White
- [ ] No `text-white/50`, `text-white/55`, `text-white/60`, or `text-white/70` on readable text in homepage files
- [ ] StatsBar ALL CAPS labels use `text-white/90`
- [ ] Lock overlay text remains `text-white/50` and icon remains `text-white/40`
- [ ] Input `placeholder:text-white/...` values unchanged
- [ ] Taglines, descriptions, card text all render as `text-white`

### General
- [ ] Build passes with 0 errors
- [ ] All existing tests pass (assertions updated if checking for muted text classes)
- [ ] Changes committed on `homepage-redesign` branch

## Files Modified

| Action | File |
|--------|------|
| MODIFY | `src/components/JourneySection.tsx` |
| MODIFY | `src/components/homepage/SectionHeading.tsx` |
| MODIFY | `src/components/homepage/StatsBar.tsx` |
| MODIFY | `src/components/homepage/DashboardPreview.tsx` |
| MODIFY | `src/components/homepage/DashboardPreviewCard.tsx` |
| MODIFY | `src/components/homepage/DifferentiatorSection.tsx` |
| MODIFY | `src/components/homepage/differentiator-data.ts` |
| MODIFY | `src/components/homepage/FinalCTA.tsx` |
| MODIFY | `src/components/StartingPointQuiz.tsx` |
