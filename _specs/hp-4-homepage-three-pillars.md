# HP-4: Homepage Three Pillars Section (Healing / Growth / Community)

**Master Plan Reference:** N/A — standalone homepage redesign section (builds on HP-1 foundation components)

---

## Overview

The Three Pillars section is the centerpiece of the homepage redesign — three vertical blocks (Healing, Growth, Community) each containing an accordion of features that expand to reveal descriptions and stylized inline previews. This section answers the visitor's core question: "What can I actually do in this app?" by organizing all of Worship Room's features into three intuitive groupings with distinct visual identities. Inspired by GitHub's homepage pillar sections where each product area has expandable feature rows with visual reveals.

## User Story

As a **logged-out visitor**, I want to **browse all of Worship Room's features organized by purpose (healing, growth, community)** so that **I understand the depth of the app and find the features most relevant to my spiritual needs**.

## Requirements

### Functional Requirements

1. **Section wrapper** — Uses `SectionHeading` with heading "Everything You Need to Heal, Grow, and Connect" and tagline "Three pillars. One journey. Your pace." centered. Container: `max-w-5xl mx-auto px-4 sm:px-6`. Vertical spacing: `py-20 sm:py-28`. Space between heading and first pillar: `mt-14 sm:mt-18`. Space between pillars: `space-y-20 sm:space-y-28`.

2. **Three pillar blocks** — Each pillar is a self-contained block wrapped in its own `GlowBackground`:
   - Healing: `variant="left"` (purple glow left)
   - Growth: `variant="right"` (purple glow right)
   - Community: `variant="center"` (centered glow)

3. **Pillar headers** — Each pillar has a header row with:
   - Lucide icon in the pillar's accent color (`w-8 h-8 sm:w-10 sm:h-10`)
   - Title in `text-2xl sm:text-3xl font-bold text-white`
   - Subtitle in `text-white/50 text-sm sm:text-base mt-1`
   - Layout: icon and title on same line (`flex items-center gap-3`), subtitle below

4. **Pillar accent colors:**
   - Healing: `text-purple-400` / `bg-purple-500/20` / `border-purple-500/30`
   - Growth: `text-emerald-400` / `bg-emerald-500/20` / `border-emerald-500/30`
   - Community: `text-amber-400` / `bg-amber-500/20` / `border-amber-500/30`

5. **Pillar icons (Lucide):** Healing = `Heart`, Growth = `TrendingUp`, Community = `Users`

6. **Pillar subtitles:**
   - Healing: "Daily practices for your inner life"
   - Growth: "Tools to measure and celebrate progress"
   - Community: "You don't have to walk alone"

7. **Accordion behavior** — Below each pillar header, a vertical list of accordion items:
   - Only one item per pillar expanded at a time (clicking a new item closes the current one)
   - First item in each pillar expanded by default
   - Expand/collapse uses `max-height` transition: collapsed = `max-height: 0; overflow: hidden`, expanded = `max-height: 500px`
   - Transition: `transition-[max-height] duration-300 ease-out`
   - Gated behind `prefers-reduced-motion` — if reduced motion, instant show/hide

8. **Collapsed accordion item** — Horizontal row:
   - Left: small accent-colored dot (`w-2 h-2 rounded-full`)
   - Center: Feature name in `text-white/70 text-base sm:text-lg font-medium`
   - Right: `ChevronDown` icon in `text-white/30 w-5 h-5`
   - Full row clickable (`cursor-pointer`), bottom border `border-b border-white/[0.06]`, padding `py-4`
   - Hover: name shifts to `text-white/90`, chevron to `text-white/50`

9. **Expanded accordion item:**
   - Chevron rotates 180deg (`rotate-180 transition-transform duration-200`)
   - Feature name becomes `text-white font-semibold`
   - Accent dot becomes slightly larger or gets a glow ring
   - Content area slides open with description (`text-white/60 text-sm leading-relaxed`, `max-w-xl`) and compact preview
   - Left border accent: `border-l-2` in pillar's accent color, `pl-4` indent
   - Padding: `pt-3 pb-6`

10. **14 features across 3 pillars** with descriptions and compact previews (detailed below)

11. **Scroll reveal** — Each pillar block uses `useScrollReveal` independently. Pillar header: `scroll-reveal` class. Accordion items: staggered with `staggerDelay` (80ms between items, 200ms initial delay after header).

12. **Integration** — `PillarSection` renders in `Home.tsx` below `StatsBar`, replacing the `{/* HP-4: PillarSection */}` comment placeholder.

### Non-Functional Requirements

- **Performance**: No external dependencies. Pure CSS + React + inline SVG previews. No images to load.
- **Accessibility**: Accordion items use `<button>` elements for triggers. Expanded content uses `aria-expanded` on trigger and `aria-hidden` on content panel. All animations gated behind `prefers-reduced-motion`. Touch targets minimum 44px height on mobile.
- **WCAG AA**: All text meets minimum opacity standards from design system. Primary text `text-white/70`, secondary `text-white/60`.

---

## Accordion Content — Healing Pillar (6 features)

### 1. Devotionals (expanded by default)

**Description:** "A fresh devotional every morning -- an inspiring quote, scripture, and reflection tied to the current season of the church year. Advent, Lent, Easter, and ordinary time each bring their own rhythm."

**Compact preview:** A small card (~200px wide) showing a quote snippet in italic Caveat font, a verse reference below, and a faint book icon. Similar to the HP-2 devotional mockup but smaller and simpler.

### 2. AI Prayer

**Description:** "Tell us what's on your heart, and receive a personalized prayer generated just for you -- with ambient sound that plays as the words appear one by one. It's like having a prayer partner who always knows what to say."

**Compact preview:** 3-4 lines of text where the first 2 lines are `text-white/80` and the remaining lines are `text-white/20` -- the karaoke effect in miniature. No animation needed.

### 3. Journaling

**Description:** "Write freely or follow guided prompts rooted in scripture. Your entries are private, safe, and always here when you need to look back and see how far you've come."

**Compact preview:** A small notepad-style element -- 3 faint horizontal lines (like lined paper) with a subtle pen/pencil icon. Minimal and evocative.

### 4. Meditation

**Description:** "Six guided meditation types -- breathing exercises, scripture soaking, gratitude reflections, ACTS prayer, psalm readings, and the daily examen. Each one meets you where you are."

**Compact preview:** A small grid of 6 tiny circles (2x3), each with a one-letter abbreviation (B, S, G, A, P, E) in `text-white/40`. The "B" circle is highlighted in the accent color.

### 5. Mood Check-in

**Description:** "Start each day by sharing how you're feeling. Your mood shapes everything -- the verse you see, the content recommended, and the gentle care the app shows you."

**Compact preview:** A row of 5 small mood-colored dots (using the mood color palette from the design system) with the middle one highlighted.

### 6. Evening Reflection

**Description:** "Before you sleep, look back on your day. Name your highlights, log gratitude, and close with a gentle prayer. Your streak stays alive, and tomorrow starts with intention."

**Compact preview:** A small crescent moon icon with 2-3 tiny stars. Simple SVG, `text-white/30` with one star in the accent color.

---

## Accordion Content — Growth Pillar (5 features)

### 1. Reading Plans (expanded by default)

**Description:** "10 multi-day plans covering anxiety, grief, gratitude, identity, forgiveness, trust, hope, healing, purpose, and relationships. Each day brings a passage, reflection, prayer, and action step."

**Compact preview:** A small progress bar at ~60% fill (accent green gradient), with "Day 5 of 21" below in `text-white/40 text-xs`.

### 2. Seasonal Challenges

**Description:** "Join community-wide challenges tied to Advent, Lent, Easter, Pentecost, and the New Year. 110 days of guided content that moves with the church calendar."

**Compact preview:** A small calendar icon with a checkmark on it, in the accent color.

### 3. Growth Garden

**Description:** "A living illustration on your dashboard that grows as you do. Your garden reflects your faith level, streak, and the activities you practice most. It's your spiritual journey, visualized."

**Compact preview:** A tiny simplified plant/tree SVG -- just a stem with 3-4 leaves, in green with a purple flower bud.

### 4. Badges & Faith Points

**Description:** "Every prayer, journal entry, chapter read, and meditation earns faith points. Hit milestones to unlock badges that celebrate your consistency, courage, and growth."

**Compact preview:** Three small badge circles in a row -- one filled (accent color), one half-filled, one empty outline.

### 5. Insights

**Description:** "See your spiritual patterns over time -- mood trends, activity correlations, and weekly summaries that help you understand how your practices are shaping your inner life."

**Compact preview:** A tiny line chart (3-4 data points connected by a line) trending upward, in the accent color. Inline SVG.

---

## Accordion Content — Community Pillar (3 features)

### 1. Prayer Wall (expanded by default)

**Description:** "Share what's on your heart and lift others up in prayer. When someone prays for your request, you feel it -- a gentle notification that someone cares. This isn't social media. It's sacred space."

**Compact preview:** Two small overlapping circles (avatar placeholders) with a small heart icon between them.

### 2. Friends & Encouragement

**Description:** "Add friends, send encouragement, and see how your community is growing together. Gentle nudges for friends who've been away -- because sometimes knowing someone noticed is enough."

**Compact preview:** A small notification-style pill: "Sarah is thinking of you" in `bg-white/[0.04] rounded-full px-3 py-1 text-white/40 text-xs`.

### 3. Local Support

**Description:** "Find churches, Christian counselors, and Celebrate Recovery meetings near you. Because sometimes healing needs a hand to hold, not just a screen to touch."

**Compact preview:** A small map pin icon with a cross on it, in the accent color.

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View section | Fully visible and interactive | Same | N/A |
| Expand/collapse accordion items | Works normally | Same | N/A |
| Click compact previews | No action (decorative only) | Same | N/A |

This is a public landing page section. No actions require authentication. All elements are informational or decorative.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column. Pillar headers stack naturally. Expanded content: description above, compact preview below (centered). Full-width accordion rows. Container padding: `px-4`. |
| Tablet (640-1024px) | Single column, wider container. Expanded content: description left, preview right (`flex gap-6`). Container padding: `px-6`. |
| Desktop (> 1024px) | Same as tablet but with more generous spacing. Two-column expanded content layout. `max-w-5xl` container. |

**Additional responsive notes:**
- Accordion rows are full-width at all breakpoints.
- Compact previews center on mobile when stacked below description.
- Touch targets: entire accordion row is tappable, min height 44px (ensured by `py-4` + content height).
- Pillar spacing increases at `sm` breakpoint (`space-y-20 sm:space-y-28`).

## AI Safety Considerations

N/A -- This section does not involve AI-generated content or free-text user input. No crisis detection required. All content is static marketing copy describing app features.

## Auth & Persistence

- **Logged-out users:** Full access. No persistence needed -- accordion state is ephemeral React state.
- **Logged-in users:** Same experience (this section appears on the landing page, which is only shown to logged-out users; logged-in users see the Dashboard instead).
- **localStorage usage:** None.
- **Route type:** Public (part of the Home/landing page).

## Completion & Navigation

N/A -- standalone landing page section. Not part of the Daily Hub tabbed experience.

## Design Notes

- **Reuse existing components:** `GlowBackground` (HP-1), `SectionHeading` (HP-1), `useScrollReveal` hook, `staggerDelay` utility.
- **Design system recon available** at `_plans/recon/design-system.md` -- reference for exact gradient, spacing, and typography values.
- **Frosted glass aesthetic** consistent with dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) -- but note the accordion items themselves are NOT cards; they use subtle borders and the expanded left-border accent pattern instead.
- **Typography:** Feature names use Inter (body font). Descriptions use Inter at `text-sm`. The devotional compact preview uses Caveat (`font-script`) for the quote snippet.
- **Mood colors:** The mood check-in compact preview should reference the mood color palette from `09-design-system.md` (Struggling: `#D97706`, Heavy: `#C2703E`, Okay: `#8B7FA8`, Good: `#2DD4BF`, Thriving: `#34D399`).
- **New visual patterns:** The accordion with left-border accent is a new pattern not captured in the design system recon. The compact previews are also new (small inline SVG/JSX illustrations).
- **`bg-hero-bg`:** `GlowBackground` uses this class -- verify it exists in the Tailwind config (it does, used by HP-1 and HP-2).

## Component Structure

```
src/components/homepage/
  PillarSection.tsx           -- Main section wrapper (heading + 3 pillars)
  PillarBlock.tsx             -- Single pillar (header + accordion)
  PillarAccordionItem.tsx     -- Single accordion row (collapse/expand + compact preview)
  pillar-data.ts              -- All pillar content (titles, descriptions, preview keys)
  index.ts                    -- Updated barrel export (add PillarSection)
```

**Data structure in `pillar-data.ts`:**

```typescript
interface PillarFeature {
  name: string
  description: string
  previewKey: string  // selects the correct compact preview in PillarAccordionItem
}

interface Pillar {
  id: string
  title: string
  subtitle: string
  icon: string        // Lucide icon name
  accent: 'purple' | 'emerald' | 'amber'
  glowVariant: 'left' | 'right' | 'center'
  features: PillarFeature[]
}
```

Compact previews are rendered inline within `PillarAccordionItem.tsx` via a switch on `previewKey`. Each preview is 5-15 lines of JSX. If the file gets too large, extract to a `PillarPreviews.tsx`.

## Out of Scope

- Click-through navigation from accordion items to actual feature pages (no links/CTAs -- this is an informational showcase only)
- Animated compact previews (all previews are static illustrations)
- Backend integration (all content is static)
- Light mode styling (dark theme only, per project decisions)
- Logged-in user experience (landing page is only shown to logged-out users)

## Acceptance Criteria

- [ ] `PillarSection` renders below `StatsBar` in `Home.tsx`, replacing the `{/* HP-4: PillarSection */}` comment
- [ ] Three pillar blocks display vertically: Healing (6 features), Growth (5 features), Community (3 features)
- [ ] Each pillar uses its own `GlowBackground` variant (Healing: `left`, Growth: `right`, Community: `center`)
- [ ] Each pillar has the correct Lucide icon: Healing = `Heart`, Growth = `TrendingUp`, Community = `Users`
- [ ] Each pillar has a distinct accent color: Healing = purple-400, Growth = emerald-400, Community = amber-400
- [ ] Each pillar has the correct subtitle text
- [ ] Accordion items expand/collapse on click with smooth `max-height` transition (300ms ease-out)
- [ ] Only one item per pillar is expanded at a time (clicking a new item closes the current one)
- [ ] First item in each pillar starts expanded by default (Devotionals, Reading Plans, Prayer Wall)
- [ ] Expanded items show description + compact preview in a two-column layout on desktop (text left, preview right)
- [ ] Expanded items show description above preview on mobile (< 640px), centered preview
- [ ] Chevron rotates 180deg on expand with 200ms transition
- [ ] Accent-colored left border (`border-l-2`) appears on expanded item content
- [ ] Feature names shift to `text-white font-semibold` when expanded
- [ ] All 14 features across 3 pillars display their correct description text
- [ ] All 14 compact previews render correctly (devotional card, karaoke text, notepad, meditation grid, mood dots, moon/stars, progress bar, calendar, plant, badges, line chart, avatar circles, notification pill, map pin)
- [ ] Each pillar block reveals independently on scroll via `useScrollReveal`
- [ ] Accordion items stagger in on scroll reveal (80ms between items, 200ms initial delay)
- [ ] All animations respect `prefers-reduced-motion` (instant show/hide when reduced motion preferred)
- [ ] Touch targets meet 44px minimum height on mobile
- [ ] All text meets WCAG AA contrast requirements (primary text >= `text-white/70`, secondary >= `text-white/60`)
- [ ] No external dependencies added
- [ ] All new components have passing tests
- [ ] Build passes with 0 errors and 0 warnings
- [ ] All existing tests still pass
- [ ] Committed on `homepage-redesign` branch
