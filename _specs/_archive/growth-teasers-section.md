# Feature: Growth Teasers Section

## Overview

Many visitors arrive at Worship Room in a moment of need — they pray, read scripture, or journal — and then leave. The Growth Teasers section answers the question "why should I come back?" by showing logged-out visitors a tangible preview of what a free account unlocks: mood tracking insights, daily streaks with faith points, and a friends leaderboard for mutual encouragement. By making the invisible visible — showing what their spiritual journey could look like over time — this section transforms a one-time visit into the beginning of an ongoing healing journey.

This section sits between the Journey Section (which shows *what* you can do) and the Starting Point Quiz (which helps you decide *where* to start), creating a natural progression: here's the journey → here's what you'll build along the way → here's where to begin.

## User Story

As a **logged-out visitor**, I want to **see a preview of the personal dashboard features I'd unlock with a free account** so that **I'm motivated to return and create an account, knowing my spiritual growth will be tracked and celebrated over time**.

## Requirements

- Display a section on the landing page between the Journey Section and the Starting Point Quiz placeholder
- Section background transitions from the Journey Section's light background into dark purple (Hero Dark #0D0620), creating a smooth visual re-entry into the immersive hero space
- Section heading: "See How You're Growing" with Caveat script accent on "Growing" (matching Journey Section heading style). Subheading below in lighter text
- Display 3 preview cards side-by-side on desktop, stacked on mobile:
  1. **Mood Insights** — Mini mood heatmap grid (7x4 colored squares like GitHub contributions) + SVG trend line, with frosted glass lock overlay
  2. **Streaks & Faith Points** — Streak counter, point total, and milestone badges, with frosted glass lock overlay
  3. **Friends & Leaderboard** — Mini leaderboard table with blurred usernames and point totals, with frosted glass lock overlay
- Each card has: a preview area at top (~150px) with lock overlay, followed by an icon, title, and description below
- All preview content is 100% static HTML/CSS — no API calls, no real data, no JavaScript logic
- Previews must look like realistic, believable dashboard screenshots that are blurred/locked — not empty placeholder boxes
- CTA button below cards: "Create a Free Account" linking to /register
- Secondary reassurance text below CTA: "It's free. No credit card. No catch."
- Cards animate in with staggered fade-in on scroll (Intersection Observer pattern matching Journey Section)
- Hover effect on cards: slight lift + shadow increase

## Acceptance Criteria

- [ ] Section renders on the landing page between the Journey Section and the quiz placeholder
- [ ] Background gradient transitions smoothly from light (Journey Section bottom) to dark purple
- [ ] Heading "See How You're Growing" displays with "Growing" in Caveat script purple accent
- [ ] Subheading text is visible in lighter color below the heading
- [ ] 3 preview cards are rendered with correct titles: "Mood Insights", "Streaks & Faith Points", "Friends & Leaderboard"
- [ ] Each card has a visible preview area with frosted glass overlay and lock icon
- [ ] Mood Insights card contains a grid of colored squares and an SVG trend line
- [ ] Streaks card contains streak counter text, point total, and badge circles
- [ ] Leaderboard card contains a mini table with rank numbers, blurred names, and point totals
- [ ] "Create a Free Account" button links to /register
- [ ] Reassurance text "It's free. No credit card. No catch." is visible below the CTA
- [ ] Cards fade in with stagger animation on scroll
- [ ] Cards lift slightly on hover with increased shadow
- [ ] Responsive: 3 columns on desktop, stacked on mobile
- [ ] All content is static — no API calls or dynamic data
- [ ] Tests verify section renders, 3 cards present, CTA links to /register

## UX & Design Notes

- **Tone**: Aspirational and inviting, not pushy. This is showing someone what their spiritual journey *could* look like — making the abstract concrete. The message is "you're already building something meaningful; let us help you see it."
- **Colors**:
  - Section background: gradient from #F5F5F5 (or white) at top → Hero Dark #0D0620
  - Heading text: white, with "Growing" in Primary violet (#6D28D9) Caveat script
  - Card background: #1a1030 with 1px solid #2a2040 border
  - Card icon colors: Primary violet (Mood Insights), orange/amber #F39C12 (Streaks), cyan #00D4FF (Leaderboard)
  - Frosted overlay: backdrop-blur with rgba(13, 6, 32, 0.5) background
  - CTA button: Primary violet background, white text
  - Reassurance text: Text Light color
- **Typography**: Inter (sans-serif) for all text. Caveat cursive for "Growing" accent. Card titles are medium/semibold. Descriptions are regular weight, smaller.
- **Responsive**:
  - Desktop (>1024px): 3 cards in a row, equal width
  - Tablet (640-1024px): 3 cards in a row, slightly compressed
  - Mobile (<640px): stacked vertically, full width
- **Animations**: Cards fade in with staggered delay on scroll (same Intersection Observer pattern as Journey Section). Cards lift translateY(-4px) on hover with shadow increase. Gradient background transition should feel smooth, no hard color boundary.
- **Card layout**: Preview area at top (~150px), then icon + title + description below. Border-radius 16px. Hover lifts card with shadow.

## AI Safety Considerations

- **Crisis detection needed?**: No — this section contains no user input and no AI-generated content. All content is static preview mockups.
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out (demo mode)**: Fully visible. No data persistence. All content is static. Zero data captured or stored. This section exists specifically to convert logged-out visitors.
- **Logged-in**: Same rendering for now. Future enhancement: hide this section for logged-in users (not implemented yet — no auth system exists).
- **Route type**: Public (landing page component)

## Out of Scope

- Hiding the section for logged-in users (requires auth system — future enhancement)
- Real dashboard data or API integration — all previews are static mockups
- Interactive previews (clicking on heatmap squares, leaderboard rows, etc.)
- Analytics tracking of CTA clicks or section impressions
- A/B testing of card content or ordering
- Faith Points system implementation (post-launch growth feature)
- Friends system or leaderboard API (post-launch growth feature)
- Dark mode variants of the cards
- Mobile-specific card layouts beyond stacking (no carousel, no swipe)
