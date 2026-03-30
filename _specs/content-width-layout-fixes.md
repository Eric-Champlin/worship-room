# Content Width & Layout Fixes

**Master Plan Reference:** N/A — standalone polish spec

---

## Overview

Several pages constrain their content to narrow widths (`max-w-2xl` at 672px), creating thin centered columns that waste screen real estate on tablet and desktop. Additionally, Caveat script font titles on hero sections are clipped due to `bg-clip-text` combined with the font's natural flourishes extending beyond layout bounds. These fixes widen content areas for a more spacious reading experience and ensure all hero titles render fully.

## User Story

As a **logged-out visitor or logged-in user**, I want content to use available screen width and hero titles to render fully so that the app feels spacious and polished rather than cramped and glitchy.

## Requirements

### 1. Daily Hub Devotional Tab Content Width

**Current state:** DevotionalTabContent wraps all content in `max-w-2xl` (672px). On a 1440px screen, the devotional quote card, passage, reflection, and prayer occupy ~40% of the viewport with large empty margins.

**Target state:**
- Widen the devotional content container from `max-w-2xl` to `max-w-4xl` (896px)
- Keep `mx-auto px-4` centering and padding
- The Pray, Journal, and Meditate tabs each have their own inner containers — check whether they share the `max-w-2xl` constraint or have independent wrappers. If each tab controls its own width, only widen Devotional. If a shared parent wrapper exists, evaluate whether widening benefits all tabs or if Pray/Journal should keep narrower widths for their textarea-focused layouts.

### 2. Bible Browser Content Width

**Current state:** BibleBrowser content area uses `max-w-4xl` (896px). The Old/New Testament book list and search results feel narrow at desktop widths, especially given the accordion UI with book names and chapter counts.

**Target state:**
- Widen the content container from `max-w-4xl` to `max-w-5xl` (1024px)
- Keep `mx-auto px-4` centering and padding
- Add `lg:px-8` for additional desktop padding
- Hero section remains full-width (already uses `w-full`)

### 3. Caveat Script Font Title Cutoff (Systemic Fix)

**Current state:** Hero titles using Caveat (`font-script`) with gradient text (`bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`) are clipped on the right side. The `bg-clip-text` property clips the background to the text's layout bounding box, but Caveat's script flourishes (especially on letters like "l", "g", "y", "!") extend beyond that box, causing visible cutoff. This affects:
- "Prayer Wall" title in PrayerWallHero
- "Good Morning!" / "Good Afternoon!" / "Good Evening!" in DailyHub hero
- Potentially other PageHero titles across 9+ pages

**Root cause:** `bg-clip-text` clips to the text's CSS layout box. Script fonts like Caveat render glyph strokes that overshoot the layout box (italic slant, ascender/descender flourishes). The overshooting parts have no background to show through, so they appear invisible/clipped.

Additionally, PrayerWall.tsx wraps its entire page in `overflow-x-hidden`, which could further clip content at the page level.

**Target state:**
- Add horizontal padding (`px-2` or `px-3`) directly on the `h1`/`h2` elements using `font-script` + `bg-clip-text` to give flourishes room to render within the layout box
- This fix should be applied at the shared component level (PageHero) and anywhere else the `font-script bg-clip-text text-transparent` pattern is used (PrayerWallHero, DailyHub hero)
- Verify the fix works at all viewport widths (375px, 768px, 1440px)
- Verify no horizontal scrollbars are introduced

**Pages to check (all use PageHero or ATMOSPHERIC_HERO_BG with Caveat titles):**
- `/prayer-wall` — PrayerWallHero (custom hero, not PageHero)
- `/daily` — DailyHub hero (custom hero, not PageHero)
- `/music` — PageHero via MusicPage
- `/bible` — BibleBrowser (custom hero matching PageHero pattern)
- `/ask` — AskPage via PageHero
- `/grow` — GrowPage (custom hero matching PageHero pattern)
- `/my-prayers` — MyPrayers via PageHero
- 6 meditation sub-pages — via PageHero
- Local Support pages — LocalSupportHero (custom hero)

## Auth Gating

No auth changes. All affected elements are purely visual (content width, text rendering). No interactive elements are added or modified.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| N/A | Visual-only changes, no new interactions | Same | N/A |

## Responsive Behavior

| Breakpoint | Content Width Changes | Title Fix |
|-----------|----------------------|-----------|
| Mobile (< 640px) | No change — content is already full-width on mobile with `px-4` padding | Padding may be `px-1` to avoid wasting mobile space |
| Tablet (640-1024px) | Devotional: wider but still centered. Bible: wider. Both still have side margins | Same padding as desktop |
| Desktop (> 1024px) | Devotional: `max-w-4xl` (896px) instead of 672px. Bible: `max-w-5xl` (1024px) instead of 896px | `px-2` or `px-3` on script titles |

**Critical:** No horizontal scrollbars should be introduced at any viewport width. The `px-*` padding on titles should not push content beyond the viewport.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** See wider layouts and fixed titles. No data involved.
- **Logged-in users:** Same visual changes. No data involved.
- **Route type:** Public (all affected routes are public or have unchanged auth behavior)
- **localStorage usage:** None. Purely visual changes.

## Completion & Navigation

N/A — standalone visual polish spec. No completion tracking or navigation changes.

## Design Notes

- Reference the existing `PageHero` component pattern: `font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl`
- The title padding fix should work generically for any text using `font-script` + `bg-clip-text` — not just specific words
- Content width values follow Tailwind's max-width scale: `max-w-2xl` (672px) < `max-w-3xl` (768px) < `max-w-4xl` (896px) < `max-w-5xl` (1024px)
- Line length readability: `max-w-4xl` (896px) keeps body text at ~80-90 characters per line at 16px, which is within the readable range. `max-w-5xl` (1024px) is appropriate for the Bible Browser since it has structured lists rather than long-form prose
- PrayerWall.tsx uses `overflow-x-hidden` on its page wrapper — evaluate if this contributes to the title cutoff and whether it can be safely removed or scoped more narrowly

## Out of Scope

- Daily Hub hero redesign (separate spec)
- Font changes or typography scale adjustments
- Prayer Wall category filter layout changes (separate spec)
- Inner page hero font standardization (separate spec)
- Changing the `bg-clip-text` gradient approach itself — the fix should work within the existing pattern
- Widening the Prayer Wall main content area (`max-w-[720px]`) — that's a separate layout decision

## Acceptance Criteria

- [ ] DevotionalTabContent uses `max-w-4xl` (896px) instead of `max-w-2xl` (672px) — verified via computed width at 1440px viewport
- [ ] Other Daily Hub tabs (Pray, Journal, Meditate) are checked — either widened if they share the same constraint, or left at their current width with justification
- [ ] BibleBrowser content area uses `max-w-5xl` (1024px) instead of `max-w-4xl` (896px)
- [ ] "Prayer Wall" title renders fully at 375px, 768px, and 1440px — no letters clipped
- [ ] "Good Morning!" / "Good Afternoon!" / "Good Evening!" renders fully at 375px, 768px, and 1440px — no clipping
- [ ] ALL pages using `PageHero` component are checked for title cutoff — fix applied at shared component level if possible
- [ ] Custom hero components (PrayerWallHero, DailyHub hero, BibleBrowser hero, LocalSupportHero) checked and fixed for same cutoff pattern
- [ ] Mobile layouts (375px) unchanged — content is still full-width with `px-4` padding
- [ ] No horizontal scrollbars at any viewport width (375px, 428px, 768px, 1024px, 1440px, 1920px)
- [ ] Existing functionality preserved: Daily Hub tab switching, Bible Browser accordion expand/collapse, Bible search, Prayer Wall interactions
- [ ] No new lint errors or test failures introduced
