# HP-2: Feature Experience Showcase

**Master Plan Reference:** N/A — standalone homepage redesign section (builds on HP-1 foundation components)

---

## Overview

The Feature Experience Showcase is the first major section below the Hero on the landing page. It replaces the old `JourneySection` numbered list with an interactive tabbed preview of Worship Room's core experiences. Where the journey section *described* features in text, this section *shows* them through stylized code-built mockups inside a frosted glass panel with smooth tab transitions. It's the visitor's first impression of what the app actually does — it needs to immediately communicate "this app does something real and beautiful."

Inspired by GitHub's homepage tabbed feature sections: click a tab, see a rich preview of that experience, with smooth crossfade transitions between tabs.

## User Story

As a **logged-out visitor**, I want to **see interactive previews of Worship Room's key features** so that **I understand what the app offers and feel drawn to explore further**.

## Requirements

### Functional Requirements

1. **Section wrapper** — Uses `GlowBackground` with `variant="split"` (left purple, right white glow) and `SectionHeading` with heading "Experience Worship Room" and tagline "Everything you need for your spiritual journey — in one place." centered.
2. **5 tabs** — Horizontal pill-shaped buttons: Daily Devotional (BookOpen), AI Prayer (Heart), Meditation & Sound (Headphones), Prayer Wall (Users), Your Growth (Sprout). All using Lucide icons.
3. **Tab switching** — Clicking a tab swaps the preview panel content with a crossfade animation (150ms fade-out, 200ms fade-in).
4. **Preview panel** — Each tab displays a two-column layout inside a `FrostedCard`: left column has feature title (gradient text), description, and bullet highlights; right column has a stylized mockup preview.
5. **5 unique mockup previews** — Each tab has a distinct React component that looks like a miniature app screenshot built in code (not an image).
6. **Scroll reveal** — The section fades in on scroll using `useScrollReveal`, with staggered delays for heading (0ms), tab bar (200ms), and preview panel (400ms).
7. **Integration** — Renders inside `Home.tsx` between `HeroSection` and `GrowthTeasersSection`, flowing seamlessly (both sections use `bg-hero-bg`).

### Non-Functional Requirements

- **Performance**: No external dependencies. Pure CSS + React. No images to load. All mockups are code-built.
- **Accessibility**: Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA pattern. Active tab has `aria-selected="true"`. Tab panels use `aria-labelledby` linking to their tab. Keyboard navigation (arrow keys for tab switching). All animations gated behind `prefers-reduced-motion`.
- **WCAG AA**: All text meets minimum opacity standards from the design system (primary text `text-white/70`, secondary `text-white/60`, interactive `text-white/50`).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View section | Fully visible and interactive | Same | N/A |
| Click tabs | Switches preview content | Same | N/A |
| Click mockup pill buttons | No action (decorative only) | Same | N/A |

This is a public landing page section. No actions require authentication. All elements are either informational or decorative.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Tab bar: horizontally scrollable, icon-only pills (no labels). Preview panel: single column (text stacked above mockup). Min height: `280px`. Container padding: `px-4`. |
| Tablet (640-1024px) | Tab bar: icon + label pills, centered row. Preview panel: single column. Min height: `320px`. Container padding: `px-6`. |
| Desktop (> 1024px) | Tab bar: icon + label pills, centered row. Preview panel: two-column grid (`grid-cols-2`), text left / mockup right. Min height: `400px`. |

**Additional responsive notes:**
- Tab bar uses `overflow-x-auto flex-nowrap` on mobile with hidden scrollbar (`scrollbar-hide` utility).
- Sound mixer grid (Tab 3) stays 2x3 at all sizes.
- Prayer wall cards (Tab 4) stack vertically on mobile.
- All mockup cards scale down gracefully — padding and font sizes reduce on smaller screens.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All content is static, decorative mockup text. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full access. Zero persistence (no data to persist — this is a static display section).
- **Logged-in users:** Same experience (this section only appears on the landing page, which only renders for logged-out users via the route switch in `Home.tsx` / `Dashboard`).
- **localStorage usage:** None.

## Tab Content Specifications

### Tab 1: Daily Devotional

**Left column:**
- Title: "Start Each Day with Purpose"
- Description: "A fresh devotional every morning -- an inspiring quote, a scripture passage, and a reflection that ties everything together. Complete your quiet time in just 10 minutes."
- Highlights: "50 devotionals across every season of the church year" | "Liturgical calendar awareness -- content shifts with Advent, Lent, Easter" | "Journal and pray directly from the devotional"

**Right column mockup (DevotionalPreview):**
- Dark card with rounded corners and subtle top-to-bottom purple gradient overlay (~3% opacity)
- Date stamp: "April 2, 2026" in `text-white/40 text-xs`
- Quote: "Be still, and know that I am God." in Caveat/script font (`font-script`), `text-white/80 italic`
- Divider: `border-white/10`
- Passage: "Psalm 46:10 (WEB)" in `text-white/50 text-sm`
- Body snippet: 2-3 lines of devotional text in `text-white/60 text-sm leading-relaxed`
- Two decorative pill buttons: "Journal about this" and "Pray about this" in `bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1`

### Tab 2: AI Prayer (Most Visually Impressive)

**Left column:**
- Title: "Prayers That Know Your Heart"
- Description: "Tell us how you're feeling, and we'll generate a personalized prayer just for you -- with ambient worship music that plays as the words appear, one by one."
- Highlights: "AI-generated prayers tailored to your exact situation" | "Karaoke-style text reveal with ambient soundscape" | "Copy, share, or continue the conversation"

**Right column mockup (PrayerPreview):**
- Dark card with animated purple pulse border glow (CSS `@keyframes`, 3s cycle, `border-color` from `rgba(139,92,246,0.1)` to `rgba(139,92,246,0.25)`) -- gated behind `prefers-reduced-motion: no-preference`
- Input area: text showing "I'm feeling anxious about the future..." with subtle cyan glow border (matching glow-cyan `#00D4FF`)
- Prayer text with static karaoke effect: visible words in `text-white/90`, upcoming words in `text-white/20`. Sample prayer text (2-3 sentences).
- Ambient sound indicator: 3 vertical bars at different heights in purple (waveform/equalizer icon), bottom-right

### Tab 3: Meditation & Sound

**Left column:**
- Title: "Your Sanctuary of Sound"
- Description: "24 ambient sounds with crossfade mixing, 6 guided meditation types, and a full sleep library -- scripture readings, bedtime stories, and rest routines."
- Highlights: "Mix multiple sounds into your perfect atmosphere" | "Breathing exercises, gratitude reflections, psalm readings" | "Sleep timer with gentle fade-out"

**Right column mockup (MeditationPreview):**
- Dark card with 6 sound tiles in 2x3 grid: Rain (`CloudRain`), Ocean (`Waves`), Forest (`TreePine`), Fireplace (`Flame`), Night (`Moon`), Stream (`Droplets`)
- Each tile: `bg-white/[0.04] rounded-xl p-3 text-center` with Lucide icon + label
- 2 tiles appear "active": `bg-white/[0.08] border border-purple-500/30` with purple icon (Rain and Ocean)
- Below grid: two horizontal volume/mix bars at different levels in purple

### Tab 4: Prayer Wall

**Left column:**
- Title: "Pray Together, Heal Together"
- Description: "A community prayer wall where you can share what's on your heart, lift others up in prayer, and feel the warmth of knowing someone is praying for you."
- Highlights: "Share prayer requests and receive community support" | "Question of the Day sparks meaningful discussions" | "Grace-based -- never performative, always warm"

**Right column mockup (PrayerWallPreview):**
- Dark card with 3 stacked mini prayer cards with slight overlap (negative margin)
- Each card: avatar circle (initials in purple circle), name in `text-white/70 text-sm font-medium`, prayer snippet in `text-white/50 text-xs`, prayer count "12" in `text-white/30 text-xs`
- Sample names/initials: "Sarah M." (S.M.), "David K." (D.K.), "Rachel P." (R.P.)
- Decorative "Pray for someone" pill button below

### Tab 5: Your Growth

**Left column:**
- Title: "Watch Yourself Grow"
- Description: "Track your spiritual journey with a visual growth garden, reading plans, seasonal challenges, and mood insights that reflect your progress back to you."
- Highlights: "10 reading plans from 7 to 21 days" | "Seasonal challenges tied to Advent, Lent, Easter, and more" | "A living garden that grows as you do"

**Right column mockup (GrowthPreview):**
- Dark card, top half: simple SVG garden illustration (ground line, small tree/plant, sun, butterfly) in 3-4 colors (green, purple, gold, white). Static, no animations.
- Bottom half: two stat rows -- "14-day streak" in `text-white/70 text-sm` and "Day 5 of 21 -- Knowing Who You Are in Christ" in `text-white/50 text-xs`

## Tab Transition Animation

1. Active panel fades out: opacity 1 to 0, 150ms
2. New panel fades in: opacity 0 to 1, 200ms
3. Implementation: CSS `transition-opacity` with React state, or mount-all-hide-inactive pattern
4. `prefers-reduced-motion`: instant swap, no transition

## Scroll Reveal

Uses `useScrollReveal` hook from HP-1 with `staggerDelay` helper:
- Section heading: fade-in on scroll (0ms delay)
- Tab bar: fade-in (200ms delay)
- Preview panel: fade-in (400ms delay)

Uses the `scroll-reveal` CSS class pattern established in HP-1.

## Design Notes

- **Background**: `GlowBackground` with `variant="split"` -- purple orb left, white orb right. Both `bg-hero-bg` so it flows seamlessly from the `HeroSection` above.
- **Section heading**: `SectionHeading` component with `GRADIENT_TEXT_STYLE` (white-to-purple gradient text from `constants/gradients.tsx`).
- **Preview panel wrapper**: `FrostedCard` with `p-0` override, then internal `p-6 sm:p-8`.
- **Tab active state glow**: `shadow-[0_0_20px_rgba(139,92,246,0.15)]` matches the primary-lt purple.
- **Left column titles**: Use `GRADIENT_TEXT_STYLE` for gradient text effect.
- **Bullet highlights**: Small purple dot indicator (e.g., `w-1.5 h-1.5 rounded-full bg-purple-500`) before each item.
- **Prayer preview border glow**: New CSS `@keyframes` animation -- flag as **new pattern** for the design system.
- **Mockup typography**: Uses existing font families -- Inter (body), Caveat (`font-script` for devotional quote), Lora (`font-serif`) where appropriate.
- **Icons**: All from Lucide React (already in project): `BookOpen`, `Heart`, `Headphones`, `Users`, `Sprout`, `CloudRain`, `Waves`, `TreePine`, `Flame`, `Moon`, `Droplets`.
- **Tab ARIA pattern**: Uses established `role="tablist"` / `role="tab"` / `role="tabpanel"` accessible tabs pattern.

**New visual patterns (will be marked [UNVERIFIED] during planning):**
1. Animated border pulse glow on the AI Prayer mockup card
2. Static karaoke text effect (split word opacity)
3. Waveform/equalizer icon (3 bars SVG)
4. Mini garden SVG illustration
5. Overlapping prayer cards with negative margin

## Component Structure

```
src/components/homepage/
  FeatureShowcase.tsx          -- Main section component
  FeatureShowcaseTabs.tsx      -- Tab bar component
  FeatureShowcasePanel.tsx     -- Preview panel wrapper with transition logic
  previews/
    DevotionalPreview.tsx      -- Tab 1 mockup
    PrayerPreview.tsx          -- Tab 2 mockup (most elaborate)
    MeditationPreview.tsx      -- Tab 3 mockup
    PrayerWallPreview.tsx      -- Tab 4 mockup
    GrowthPreview.tsx          -- Tab 5 mockup
  index.ts                     -- Updated barrel export
```

## Out of Scope

- **Clickable mockup elements**: All pill buttons and interactive-looking elements in mockups are decorative only. No navigation or actions.
- **Real data**: All mockup content is hardcoded sample text, not pulled from actual data files.
- **Animated karaoke text**: The prayer mockup shows a *static* karaoke effect (words at different opacities). No live animation of words appearing.
- **Auto-cycling tabs**: Tabs only change on user click. No auto-rotation.
- **Backend integration**: No API calls. Pure frontend presentation.
- **Light mode**: Dark theme only (consistent with app-wide dark theme).

## Acceptance Criteria

- [ ] `FeatureShowcase` renders below `HeroSection` in `Home.tsx` with no visible gap (both use `bg-hero-bg`)
- [ ] 5 tabs are visible and clickable, with correct Lucide icons and labels
- [ ] Active tab has `text-white bg-white/[0.1] border-white/[0.15]` styling with purple glow shadow
- [ ] Inactive tabs have `text-white/50 bg-transparent border border-white/[0.06]` styling
- [ ] Clicking a tab switches the preview panel content with a crossfade (150ms out, 200ms in)
- [ ] Each tab displays a unique mockup preview in the right column (desktop) or below the text (mobile)
- [ ] Daily Devotional mockup shows date, quote in Caveat font, divider, passage reference, body text, and two decorative pill buttons
- [ ] AI Prayer mockup has the static karaoke text effect (words at `text-white/90` and `text-white/20`), cyan glow input border, and animated purple border glow (3s cycle)
- [ ] Meditation mockup shows 6 sound tiles in 2x3 grid with 2 "active" tiles highlighted in purple
- [ ] Prayer Wall mockup shows 3 overlapping prayer cards with avatars, names, snippets, and prayer counts
- [ ] Growth mockup shows a simple SVG garden illustration and two stat rows
- [ ] Tab bar is horizontally scrollable on mobile (`< 640px`) with icon-only compact pills (no labels)
- [ ] Tab bar shows icon + label at `sm` breakpoint and above
- [ ] Preview panel uses `FrostedCard` with two-column `grid-cols-2` layout on `lg+`, single column below
- [ ] Left column titles use `GRADIENT_TEXT_STYLE` gradient text
- [ ] Scroll reveal triggers as section enters viewport with staggered delays (heading 0ms, tabs 200ms, panel 400ms)
- [ ] All animations respect `prefers-reduced-motion` (instant swap for tabs, no glow animation, scroll reveal starts visible)
- [ ] `GlowBackground` with `variant="split"` provides atmospheric lighting behind the section
- [ ] Tab bar implements `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA pattern with `aria-selected`
- [ ] Tabs are keyboard-navigable (arrow keys to switch, Enter/Space to activate)
- [ ] No external dependencies added -- pure CSS + React + existing project dependencies (Lucide)
- [ ] All new components have passing tests
- [ ] Build passes with 0 errors and 0 warnings
- [ ] All existing tests still pass
- [ ] Committed on `homepage-redesign` branch
