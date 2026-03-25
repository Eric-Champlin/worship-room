# Feature: Daily Hub Hero Redesign

## Overview

The Daily Hub hero currently shows a time-aware greeting, a generic subtitle ("Start with any practice below"), and a quiz teaser link. While functional, it misses the opportunity to surface today's most important content — the Verse of the Day and the Daily Devotional — right where users land. This spec redesigns the hero into a content-rich entry point with two frosted glass cards that immediately offer spiritual nourishment before the user even scrolls.

Additionally, this spec cleans up the landing page by removing three sections (Today's Verse, Devotional Teaser, Seasonal Challenge Banner) that now live elsewhere, and integrates the seasonal banner into the navbar itself rather than floating it as a disconnected strip above the hero.

This is the **sixth and final visual foundation spec**.

---

## User Story

As a **logged-out visitor or logged-in user**, I want to see today's verse and devotional immediately when I land on the Daily Hub, so that I can start my spiritual practice with content that speaks to me today — without scrolling or navigating.

---

## Requirements

### 1. Daily Hub Hero Redesign (`/daily`)

#### 1.1 Greeting (remains, with adjustment)

- Time-aware greeting stays: "Good Morning!", "Good Afternoon!", "Good Evening!"
- Logged-in users see personalized form: "Good Evening, [Name]!"
- Caveat script font (`font-script`), centered, with gradient text treatment (`bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`)
- Desktop: `text-4xl`, Mobile: `text-3xl` (matching the inner page hero pattern from Spec 5)

#### 1.2 Remove subtitle

- The old "Start with any practice below." subtitle is removed. The two content cards below the greeting ARE the starting point now.

#### 1.3 Two Content Cards (new)

Below the greeting, a two-column layout with two frosted glass content cards side by side on desktop, stacked vertically on mobile.

**Shared card styling:**
- `bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-5`
- Minimum height to prevent cards from looking too small when content is short (suggest `min-h-[140px]` on desktop)
- Cards sit within the hero's radial gradient glow area (the atmospheric hero from Spec 5), creating a cohesive content-forward hero

##### Left Card — "Today's Verse"

- Verse text in Lora italic (`font-serif italic text-lg`), white text (`text-white/90`)
- Reference below in `text-sm text-white/50`
- Small Share icon button (Lucide `Share2`, `h-4 w-4`) positioned in the bottom-right corner of the card, `text-white/40 hover:text-white/70`
- Clicking the Share button opens the existing `VerseSharePanel` (reuse from the current `VerseOfTheDayBanner`)
- Clicking the card body (excluding the share button) or a "Read more" link navigates to `/bible` at the verse's book and chapter. The `VerseOfTheDay` type currently has `reference` (e.g. "Philippians 4:6-7") — parse the book name and chapter from the reference to construct the `/bible/:book/:chapter` link
- If the verse text is long, truncate with line-clamp (suggest 3 lines on mobile, 4 on desktop) — the full verse is available at the Bible reader destination
- Data source: `getTodaysVerse()` from `@/constants/verse-of-the-day`

##### Right Card — "Today's Devotional"

- "DAILY DEVOTIONAL" label in `text-xs uppercase tracking-wide text-primary-lt`
- Devotional title in bold white (`font-bold text-lg text-white`)
- Theme tag displayed as a small pill: `bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/50`
- "Read today's devotional" link in `text-primary-lt text-sm` with right arrow
- If the logged-in user has already read today's devotional (check `wr_devotional_reads` for today's date), show a subtle green checkmark (Lucide `Check`, `text-success h-4 w-4`) next to the title
- Clicking the card navigates to `/devotional`
- Data source: `getTodaysDevotional()` from `@/data/devotionals`

#### 1.4 Quiz Teaser Link (remains)

- "Not sure where to start? Take a 30-second quiz" stays below the two content cards
- Styled in `text-white/50` (downgraded from current `text-white/90` to reduce visual weight now that the cards are the primary focus)
- Underline on hover
- Scrolls to `#quiz`

#### 1.5 Hero Background

- Uses the atmospheric hero pattern from Spec 5: `ATMOSPHERIC_HERO_BG` (radial-gradient ellipse at top center, rgba(109, 40, 217, 0.15), fading to transparent on `#0f0a1e`)
- No change to this pattern — the cards sit within the existing glow area

#### 1.6 Below the Hero

- The tab bar follows immediately after the hero (Pray | Journal | Meditate)
- No gap between hero and tab bar
- All existing tab behavior, tab content, SongPickSection, StartingPointQuiz, and SiteFooter remain unchanged

#### 1.7 Remove VerseOfTheDayBanner from Daily Hub

- The current `VerseOfTheDayBanner` component rendered between the hero and the tab bar is removed from the Daily Hub page. Its content now lives in the hero's verse card.
- The `VerseOfTheDayBanner` component itself is not deleted (it may be used elsewhere) — it is simply no longer rendered in `DailyHub.tsx`.

#### 1.8 Remove ChallengeStrip from Daily Hub

- The `ChallengeStrip` currently rendered between the VerseOfTheDayBanner and the tab bar is removed from the Daily Hub page. Users discover challenges through the navbar "Grow" link, the seasonal banner integration (Requirement 3), and the dashboard challenge widget.
- The `ChallengeStrip` component itself is not deleted — it is simply no longer rendered in `DailyHub.tsx`.

### 2. Landing Page Cleanup

Remove three sections from `Home.tsx`:

#### 2.1 Remove `TodaysVerseSection`

- The "Today's Verse" section currently between `JourneySection` and `GrowthTeasersSection` is removed. This content now lives in the Daily Hub hero's verse card.
- The `TodaysVerseSection` component file can be kept or removed at implementation discretion — it is simply no longer rendered in `Home.tsx`.

#### 2.2 Remove `DevotionalTeaser`

- The "Start Each Morning with God" / "Read Today's Devotional" section is removed. This content now lives in the Daily Hub hero's devotional card.
- The `DevotionalTeaser` component file can be kept or removed at implementation discretion.

#### 2.3 Remove `ChallengeBanner`

- The seasonal challenge banner ("Pray40: A Lenten Journey" style card with "Join the Challenge" button) is removed from the landing page. Users discover challenges through the navbar, the seasonal banner integration (Requirement 3), and the dashboard challenge widget.
- The `ChallengeBanner` component file is not deleted — it is still used on the Daily Hub (or may be re-used elsewhere).

#### 2.4 Resulting Landing Page Structure

After removals, the landing page structure becomes:
```
Navbar (transparent) -> SeasonalBanner (moves inside navbar per Req 3) -> HeroSection (video + TypewriterInput) -> JourneySection -> GrowthTeasersSection -> StartingPointQuiz -> SiteFooter
```

Cleaner, more focused on conversion.

### 3. Seasonal Navbar Banner Integration

The current `SeasonalBanner` component sits as a separate strip above the hero/navbar and looks disconnected. Integrate the seasonal message into the navbar itself.

#### 3.1 New Placement

- Add a thin line of text below the navbar links, inside the navbar's frosted glass container
- Season icon + "It's [Season] — a season of [theme]" in `text-xs text-white/40`
- "Read today's devotional" as a `text-primary-lt` link
- This sits inside the navbar background, not as a separate element above it

#### 3.2 Visibility Rules

- Only appears during named liturgical seasons (Advent, Christmas, Lent, Holy Week, Easter, Pentecost)
- Does NOT appear during Ordinary Time
- Dismissible via a small X button that sets `sessionStorage` (reappears on next visit/session)
- Uses the existing `useLiturgicalSeason` hook for season detection

#### 3.3 Mobile Behavior

- On mobile, the seasonal line does NOT appear below the navbar links (not enough room)
- Instead, it appears as the first item inside the mobile drawer (hamburger menu)
- Same content: season icon + message + devotional link
- Dismissible within the drawer as well

#### 3.4 Remove Standalone `SeasonalBanner`

- The standalone `SeasonalBanner` component is no longer rendered as a separate element in `Home.tsx`
- The seasonal content is now part of the `Navbar` component itself
- The `SeasonalBanner` component file can be kept or removed at implementation discretion

---

## Acceptance Criteria

### Daily Hub Hero — Greeting
- [ ] Time-aware greeting displays in Caveat script font centered with gradient text (white to `primary-lt`)
- [ ] Greeting shows "[Time], [Name]!" when logged in, "[Time]!" when logged out
- [ ] Greeting is `text-3xl` on mobile, `text-4xl` on desktop
- [ ] The old "Start with any practice below." subtitle is no longer visible

### Daily Hub Hero — Verse Card
- [ ] Left card displays today's verse text in Lora italic (`font-serif italic`) `text-lg` with `text-white/90`
- [ ] Verse reference displays below in `text-sm text-white/50`
- [ ] Share icon button (`Share2`, `h-4 w-4`) appears in the bottom-right corner of the card in `text-white/40`
- [ ] Clicking the share button opens the existing verse share panel (same functionality as the current VerseOfTheDayBanner share)
- [ ] Clicking the card body navigates to `/bible/:book/:chapter` matching the verse's reference
- [ ] Card uses `bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-5`
- [ ] Long verse text is truncated with line-clamp (visible truncation, not cut off mid-word)

### Daily Hub Hero — Devotional Card
- [ ] Right card displays "DAILY DEVOTIONAL" label in `text-xs uppercase tracking-wide text-primary-lt`
- [ ] Devotional title displays in `font-bold text-lg text-white`
- [ ] Theme tag displays as a pill: `bg-white/10 rounded-full text-xs text-white/50`
- [ ] "Read today's devotional" link displays in `text-primary-lt text-sm`
- [ ] Clicking the card navigates to `/devotional`
- [ ] When logged-in user has read today's devotional (in `wr_devotional_reads`), a green checkmark (`text-success h-4 w-4`) appears next to the title
- [ ] When logged out or devotional not yet read, no checkmark appears
- [ ] Card uses the same frosted glass styling as the verse card

### Daily Hub Hero — Layout
- [ ] On desktop (> 640px), the two cards display side by side with `gap-4` between them
- [ ] On mobile (< 640px), the two cards stack vertically — verse card on top, devotional card below, each full width
- [ ] Cards have a minimum height that prevents them from looking too small when content is short
- [ ] Quiz teaser link ("Not sure where to start? Take a 30-second quiz") appears below both cards in `text-white/50`
- [ ] No visual gap between the hero section and the tab bar below
- [ ] The hero uses the atmospheric radial gradient background (from Spec 5's `ATMOSPHERIC_HERO_BG`)

### Daily Hub — Removed Elements
- [ ] The `VerseOfTheDayBanner` is no longer rendered between the hero and the tab bar
- [ ] The `ChallengeStrip` is no longer rendered between the hero and the tab bar
- [ ] Tab bar follows immediately after the hero section

### Landing Page Cleanup
- [ ] `TodaysVerseSection` is no longer rendered on the landing page
- [ ] `DevotionalTeaser` ("Start Each Morning with God" section) is no longer rendered on the landing page
- [ ] `ChallengeBanner` (seasonal challenge card) is no longer rendered on the landing page
- [ ] Landing page structure is: Navbar -> HeroSection -> JourneySection -> GrowthTeasersSection -> StartingPointQuiz -> SiteFooter
- [ ] No visual gaps or seams where removed sections used to be

### Seasonal Navbar Banner
- [ ] During named liturgical seasons, a thin line appears inside the navbar (below the nav links) with season icon + "It's [Season] — a season of [theme]" in `text-xs text-white/40` + "Read today's devotional" in `text-primary-lt`
- [ ] During Ordinary Time, the seasonal line does not appear
- [ ] The seasonal line is dismissible via a small X button; dismissed state stored in `sessionStorage` (reappears on next session/visit)
- [ ] On mobile, the seasonal content appears as the first item in the mobile drawer instead of below the navbar links
- [ ] The standalone `SeasonalBanner` strip no longer renders above the hero on the landing page
- [ ] The seasonal line renders on ALL pages (it's part of the navbar), not just the landing page

### Responsive
- [ ] At 375px (mobile): cards stack vertically, full width, verse card on top, devotional below. Greeting is `text-3xl`. Cards have adequate padding and readable text.
- [ ] At 768px (tablet): cards display side by side with `gap-4`. Intermediate sizing.
- [ ] At 1440px (desktop): cards display side by side with `gap-4`. Greeting is `text-4xl`. Cards are proportionally sized within the hero's `max-w-3xl` (or similar) content constraint.
- [ ] Seasonal navbar line is hidden on mobile; shows in mobile drawer instead
- [ ] All text meets WCAG AA contrast on the dark gradient background

### Accessibility
- [ ] All hero text meets WCAG AA contrast on the dark gradient background (white on `#0f0a1e` is approximately 17:1)
- [ ] Verse card and devotional card are keyboard navigable and have appropriate interactive roles (clickable cards should be links or have `role="link"`)
- [ ] Share button has an accessible label ("Share verse of the day" or similar)
- [ ] Green checkmark on devotional card has screen-reader-only text ("Already read today" or similar)
- [ ] Seasonal banner dismiss button has an accessible label
- [ ] Focus indicators remain visible on all interactive elements within the dark hero

### General
- [ ] Tab bar behavior, tab content, and all content below the hero remain unchanged
- [ ] StartingPointQuiz and SiteFooter remain unchanged
- [ ] All existing tests pass (update test assertions for removed components and changed structure)

---

## UX & Design Notes

- **Tone**: The two content cards create an immediate sense of daily renewal — "Here's what God has for you today." The verse grounds the user in Scripture; the devotional invites deeper reflection. Together they make the Daily Hub feel alive and purposeful, not just a navigation hub.
- **Colors**: Uses the existing dark palette. Frosted glass cards (`bg-white/[0.08]`) match the dashboard card pattern at slightly higher opacity for readability. The `text-primary-lt` accent on the devotional card creates a warm visual anchor.
- **Typography**: Caveat for the greeting (warmth), Lora italic for the verse (reverence), Inter for the devotional metadata (clarity). This mirrors the hierarchy established throughout the app.
- **Design system recon reference**: The atmospheric hero gradient from Spec 5 (`ATMOSPHERIC_HERO_BG`) provides the backdrop. Card styling follows the Dashboard Card Pattern from `09-design-system.md` (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) bumped to `bg-white/[0.08]` for better text readability.
- **New visual patterns**:
  1. Hero content cards — frosted glass cards within the atmospheric hero glow area. This is a **new pattern** (cards inside a hero section rather than below it). Implementation should verify the cards look good within the radial gradient glow.
  2. Inline seasonal navbar message — a subtle seasonal strip inside the navbar glass container. This is a **new pattern** for the navbar component.
- **Existing patterns reused**: `VerseSharePanel` for verse sharing, `getTodaysVerse()` and `getTodaysDevotional()` data sources, `useLiturgicalSeason` hook, `ATMOSPHERIC_HERO_BG` hero pattern.

### Responsive Behavior

- **Mobile (< 640px)**: Cards stack vertically — verse on top, devotional below. Each card takes full width within the hero's horizontal padding. Greeting is `text-3xl`. Cards have `p-4` (slightly reduced) for mobile. Quiz teaser text wraps naturally. Seasonal navbar content appears in mobile drawer as first item.
- **Tablet (640px - 1024px)**: Cards sit side by side with `gap-4`. Greeting is `text-4xl`. Cards share equal width. Seasonal navbar line appears below desktop nav links.
- **Desktop (> 1024px)**: Same as tablet but with wider cards. Content constrained to `max-w-3xl` or similar within the hero. Seasonal navbar line comfortably fits in one line.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec does not introduce or modify any user text input. The Pray and Journal tab textareas (which have existing crisis detection via `CrisisBanner`) are unchanged.
- **User input involved?**: No new input fields. The hero cards are read-only content displays.
- **AI-generated content?**: No — verse and devotional content is static/pre-authored data from the existing pools.

---

## Auth & Persistence

### Auth Behavior (explicit for every interactive element)

| Element | Logged Out | Logged In |
|---------|-----------|-----------|
| Greeting text | Shows "[Time]!" | Shows "[Time], [Name]!" |
| Verse card — view | Visible | Visible |
| Verse card — click to Bible | Navigates to `/bible/:book/:chapter` (public route) | Same |
| Verse card — share button | Opens share panel (functional for all users) | Same |
| Devotional card — view | Visible (no checkmark) | Visible (checkmark if read) |
| Devotional card — click to Devotional | Navigates to `/devotional` (public route) | Same |
| Devotional card — "already read" checkmark | Never shows (requires `wr_devotional_reads`) | Shows if today's date is in `wr_devotional_reads` |
| Quiz teaser link | Scrolls to `#quiz` | Same |
| Seasonal navbar message | Visible during named seasons | Same |
| Seasonal dismiss button | Dismisses via `sessionStorage` | Same |

- **Route type**: Public (`/daily`)
- **No new persistence**: No new localStorage keys introduced. The verse card reads from `getTodaysVerse()` (static). The devotional card reads from `getTodaysDevotional()` (static) and optionally checks `wr_devotional_reads` (existing key, read-only).
- **No data writes**: The hero cards are read-only displays — no data is saved when viewing them.

---

## Out of Scope

- **Tab bar changes** — the tab bar behavior, tab content (Pray, Journal, Meditate), and tab order are unchanged
- **StartingPointQuiz or SiteFooter changes** — these remain exactly as they are
- **Content below the hero** — all tab panel content, SongPickSection, etc. are unchanged
- **New data sources or API calls** — uses existing `getTodaysVerse()` and `getTodaysDevotional()` functions
- **Verse-to-Bible-reader deep linking accuracy** — parsing book/chapter from a reference like "Philippians 4:6-7" is implementation detail; if parsing is complex, linking to `/bible` (the browser root) is an acceptable fallback
- **Backend changes** — no API or backend changes
- **Dark mode toggle** — this is a permanent visual change
- **New animations** — no new animations introduced; existing animations remain
- **Devotional tab merging into Daily Hub** — that is a separate spec (Spec 7). This spec works with the current 3-tab layout.
- **Navbar restructure** — only the seasonal banner integration is in scope. The nav link order, dropdown panels, and mobile drawer structure are unchanged except for the new seasonal line
- **ChallengeBanner or ChallengeStrip component deletion** — components are kept, just no longer rendered in their current locations
