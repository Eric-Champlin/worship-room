# HP-14: Card Redesign — Dashboard Preview + Differentiator Cards

**Master Plan Reference:** N/A — standalone homepage polish task on `homepage-redesign` branch.

**Branch Strategy:** Continue on `homepage-redesign`. Do NOT create a new branch.

---

## Overview

The Dashboard Preview section ("See What's Waiting for You") and the Differentiator section ("Built for Your Heart") are two of the highest-impact conversion areas on the landing page. This spec redesigns the Dashboard Preview cards to place the preview mockup on top with a lock overlay, with the title and description in clear text below — matching the intended "See How You're Growing" screenshot design. It also trims Differentiator card descriptions to uniform length for visual consistency.

## User Story

As a **logged-out visitor**, I want to see clean, well-structured preview cards that clearly show what dashboard features I'd unlock by creating an account, so that I'm motivated to sign up.

---

## Requirements

### Part 1: Dashboard Preview Card Redesign

#### Card Structure

Each card follows a top-to-bottom layout:

1. **Top area** — Preview mockup content (mood heatmap, streak number, garden SVG, checklist, friends list, evening steps) with a frosted lock overlay covering only this area.
2. **Divider** — A subtle bottom border (`border-white/[0.06]`) separating the preview area from the text area.
3. **Bottom area** — Icon + title + description in clear, unblurred text.

#### Card Visual Specifications

| Property | Value |
|----------|-------|
| Card border | `border border-white/[0.12]` |
| Card background | `bg-white/[0.04]` |
| Card radius | `rounded-2xl` |
| Overflow | `hidden` (clips preview area corners) |
| Preview area background | `bg-white/[0.02]` |
| Preview area min-height | `min-h-[160px] sm:min-h-[180px]` |
| Lock overlay | `bg-hero-bg/50 backdrop-blur-[3px]` |
| Lock icon | `Lock` from lucide-react, `w-5 h-5 text-white/40` |
| Lock text | "Create account to unlock", `text-white/50 text-xs` |
| Text area padding | `p-4 sm:p-5` |
| Title | `text-white font-semibold text-sm sm:text-base` |
| Description | `text-white/90 text-xs sm:text-sm leading-relaxed` |

#### Card Data (6 cards)

| # | ID | Icon | Icon Color | Title | Description |
|---|-----|------|------------|-------|-------------|
| 1 | mood | `BarChart3` | `text-purple-400` | Mood Insights | See how God is meeting you over time. |
| 2 | streak | `Flame` | `text-orange-400` | Streaks & Faith Points | Build daily habits and watch your faith grow. |
| 3 | garden | `Sprout` | `text-emerald-400` | Growth Garden | A living illustration that grows with your journey. |
| 4 | practices | `CheckSquare` | `text-purple-400` | Today's Practices | Your daily rhythm of prayer, journaling, and worship. |
| 5 | friends | `Users` | `text-blue-400` | Friends | Grow together and encourage each other. |
| 6 | evening | `Moon` | `text-purple-400` | Evening Reflection | Wind down your day with gratitude and prayer. |

Note: The "Streak & Faith Points" title gains an "s" → "Streaks & Faith Points" to match the spec table.

#### Grid Layout

```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 auto-rows-fr
```

`auto-rows-fr` ensures all cards in each row match height.

#### Preview Mockup Content

No changes to the mockup content inside the blurred area. The existing sub-components (MoodInsightsPreview, StreakPreview, GardenPreview, PracticesPreview, FriendsPreview, EveningReflectionPreview) remain as-is.

#### CTA Below Cards

- **Button text:** "Create a Free Account"
- **Trust line below button:** "It's free. No catch."
- Button continues to open auth modal in register mode.
- Current button says "Get Started" with text "All of this is free. All of it is yours." — both should be updated.

### Part 2: Differentiator Cards — Uniform Height

#### Trimmed Descriptions

All 6 descriptions should be approximately equal length (~2 lines at desktop width):

| # | Title | Description |
|---|-------|-------------|
| 1 | Your time is sacred | No ads. No sponsored content. No interruptions. When you open Worship Room, the only voice is yours. |
| 2 | Your conversations stay private | We don't sell your data or share your journal entries with anyone. Your spiritual life is private. Period. |
| 3 | Honest from day one | No hidden fees, no auto-renewing traps, no paywall that appears after you've invested your heart. |
| 4 | We'll never guilt you for missing a day | Life happens. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we welcome you back. |
| 5 | AI That Meets You Where You Are | Share how you're feeling and receive a personalized prayer. Ask questions about Scripture. Journal and receive reflections. |
| 6 | A safe space when it matters most | If you're in crisis, we connect you with the 988 Lifeline, Crisis Text Line, and SAMHSA. Help is always here. |

#### Equal Height CSS

Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr`

Each card: `h-full flex flex-col` to fill its grid cell. Description paragraph: `flex-1` to push all card bottoms to the same level.

#### Description Text Color

Per the HP-13 grey-to-white pass, description text should be `text-white` (currently correct per DifferentiatorSection.tsx).

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View preview cards | Can view all 6 cards with lock overlays | N/A (logged-in users see dashboard, not landing page) | N/A |
| Click "Create a Free Account" CTA | Opens auth modal in register mode | N/A (button not shown on dashboard) | Standard register modal |

No new auth gates — this is a visual redesign of existing logged-out-only content.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 1-column card grid, `min-h-[160px]` preview area, `p-4` text area |
| Tablet (640-1024px) | 2-column card grid, `min-h-[180px]` preview area, `p-5` text area |
| Desktop (> 1024px) | 3-column card grid, same as tablet sizing |

Both Dashboard Preview and Differentiator sections follow the same responsive grid pattern.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** See the landing page with preview cards and differentiator cards. Zero persistence.
- **Logged-in users:** See the dashboard instead of the landing page — these sections are not rendered.
- **Route type:** Public (landing page only)

---

## Design Notes

- Card styling uses the existing FrostedCard component as reference but with a restructured layout (preview on top, text on bottom). The new card may need a custom structure rather than wrapping in FrostedCard, since the card now has two distinct zones.
- Icon colors vary per card (purple, orange, emerald, blue) — this is a departure from the current uniform white icons.
- The design system recon (`_plans/recon/design-system.md`) is available for exact CSS values.
- Lock overlay uses `bg-hero-bg/50` which references the `hero-bg` Tailwind custom color.

---

## Out of Scope

- Preview mockup content changes (the heatmap, streak number, garden SVG, etc. stay as-is)
- Logged-in dashboard card styling (this only affects the landing page preview)
- New card types or additional cards
- Animation changes beyond the existing scroll-reveal behavior
- Backend work (Phase 3+)

---

## Acceptance Criteria

### Dashboard Preview Cards
- [ ] Preview mockup area is on TOP of each card (not bottom, not behind header)
- [ ] Lock overlay with `backdrop-blur-[3px]` covers ONLY the preview area, not the text below
- [ ] Title + colored icon + description are BELOW the preview area in clear (unblurred) text
- [ ] Each card has a visible border (`border-white/[0.12]`)
- [ ] Each card icon has its designated color: mood=purple-400, streak=orange-400, garden=emerald-400, practices=purple-400, friends=blue-400, evening=purple-400
- [ ] A subtle bottom border (`border-white/[0.06]`) separates preview area from text area
- [ ] All 6 cards are the same height via `auto-rows-fr`
- [ ] CTA button text is "Create a Free Account" (not "Get Started")
- [ ] Trust line below CTA is "It's free. No catch." (not "All of this is free...")
- [ ] Card titles match the data table (including "Streaks & Faith Points" with the s)

### Differentiator Cards
- [ ] All 6 descriptions match the trimmed text in the spec table
- [ ] Cards render at equal height via `auto-rows-fr` + `h-full`
- [ ] Description text is `text-white` (not grey)
- [ ] Description paragraph uses `flex-1` for vertical alignment

### General
- [ ] Build passes with 0 errors
- [ ] All existing tests pass
- [ ] Responsive: 1-col on mobile, 2-col on tablet, 3-col on desktop for both card grids
- [ ] Committed on `homepage-redesign` branch

---

## Files Modified

| Action | File |
|--------|------|
| MODIFY | `src/components/homepage/DashboardPreviewCard.tsx` (complete restructure — if it exists) |
| MODIFY | `src/components/homepage/DashboardPreview.tsx` (card structure, CTA text, grid verification) |
| MODIFY | `src/components/homepage/dashboard-preview-data.ts` (add descriptions, icon colors) |
| MODIFY | `src/components/homepage/differentiator-data.ts` (trim descriptions) |
| MODIFY | `src/components/homepage/DifferentiatorSection.tsx` (grid + flex verification) |
| MODIFY | Tests for DashboardPreview (update assertions for new structure) |
