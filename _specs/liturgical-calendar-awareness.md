# Feature: Liturgical Calendar Awareness

---

## Overview

The Christian liturgical calendar gives shape and rhythm to the year — Advent's anticipation, Lent's introspection, Easter's joy, Pentecost's fire. Worship Room currently treats every day identically, missing a massive engagement opportunity flagged in the competitive analysis: Hallow's Lent Pray40 challenge pushed them to #1 in the App Store by connecting users to seasonal spiritual content. This feature weaves time-of-year awareness throughout the app so that content feels alive, connected to the church calendar, and spiritually relevant to what millions of Christians are already experiencing in their faith communities.

The implementation is a constants-and-hook foundation with 6 lightweight integration points — no new routes, no new pages, no heavy infrastructure. A `useLiturgicalSeason` hook algorithmically computes the current Christian season for any year (including Easter-dependent moveable feasts), and existing features gain subtle seasonal touches: a greeting suffix on the dashboard, prioritized seasonal content for devotionals and verses, a dismissible landing page banner, seasonal QOTD prompts on the Prayer Wall, and a tiny seasonal icon in the navbar. The result is an app that feels aware and alive without any manual content updates year to year.

---

## User Stories

- As a **logged-in user**, I want my dashboard greeting to acknowledge the current liturgical season so that Worship Room feels connected to what my church community is experiencing.
- As a **logged-in user**, I want devotionals and verses that are thematically relevant to the current season so that my daily spiritual practice aligns with the rhythms of the church year.
- As a **logged-out visitor**, I want to see a subtle seasonal banner on the landing page so that I know Worship Room is a living, active community before I sign up.
- As a **logged-out visitor or logged-in user**, I want the Prayer Wall to feature seasonal reflection questions so that community conversations stay relevant and timely.
- As any **user**, I want a small seasonal visual cue in the navbar so that the app feels alive and aware of the time of year without being heavy-handed.

---

## Requirements

### 1. Liturgical Calendar Constants

Create a constants file defining the 8 major Christian seasons with computed date ranges:

**Seasons and their date logic:**

| Season | ID | Date Range | Theme Color | Lucide Icon | Greeting |
|--------|----|-----------|-------------|-------------|----------|
| Advent | `advent` | 4th Sunday before Christmas (Nov 27–Dec 3) through December 24 | Purple `#7C3AED` | `Star` | "Blessed Advent" |
| Christmas | `christmas` | December 25 through January 5 | Gold `#FBBF24` | `Gift` | "Merry Christmas" |
| Epiphany | `epiphany` | January 6 (single day) | Gold `#FBBF24` | `Sparkles` | "Happy Epiphany" |
| Lent | `lent` | Ash Wednesday (Easter minus 46 days) through Holy Saturday (Easter minus 1) — but excluding Holy Week | Deep Purple `#6B21A8` | `Heart` | "Blessed Lent" |
| Holy Week | `holy-week` | Palm Sunday (Easter minus 7) through Holy Saturday (Easter minus 1) | Dark Red `#991B1B` | `Cross` | "Blessed Holy Week" |
| Easter | `easter` | Easter Sunday through the day before Pentecost (49 days total) | White/Gold `#FDE68A` | `Sun` | "Happy Easter" |
| Pentecost | `pentecost` | Single day, 50 days after Easter (Easter + 49) | Red `#DC2626` | `Flame` | "Happy Pentecost" |
| Ordinary Time | `ordinary-time` | All days not covered by another season | Green `#059669` | `Leaf` | *(no greeting suffix)* |

**Easter calculation (Computus — Anonymous Gregorian algorithm):**
- Easter falls on the first Sunday after the first full moon on or after March 21
- Must work for any year (2026, 2027, etc.) without manual updates
- All moveable dates derive from Easter:
  - Ash Wednesday = Easter minus 46 days
  - Palm Sunday = Easter minus 7 days
  - Holy Saturday = Easter minus 1 day
  - Pentecost = Easter plus 49 days

**Fixed dates:**
- Christmas = December 25
- Epiphany = January 6
- Advent start = nearest Sunday to November 30 (range: November 27–December 3)

**Each season object includes:**
- `id` — kebab-case identifier
- `name` — display name
- `dateRange` — computed function returning `{ start: Date, end: Date }` for a given year
- `themeColor` — hex color for seasonal UI accents
- `icon` — Lucide icon name (string reference)
- `greeting` — seasonal greeting suffix (empty string for Ordinary Time)
- `suggestedContent` — array of content type suggestions relevant to the season (e.g., Advent: `['hope', 'waiting', 'prophecy', 'preparation']`)

**Priority resolution:** When seasons overlap (Lent contains Holy Week), Holy Week takes precedence. The season lookup should check in priority order: Holy Week > specific named seasons > Ordinary Time.

### 2. `useLiturgicalSeason` Hook

A pure utility hook that returns:
- `currentSeason` — the full season object for today
- `seasonName` — display name
- `themeColor` — hex color
- `icon` — Lucide icon name
- `greeting` — seasonal greeting text (empty for Ordinary Time)
- `daysUntilNextSeason` — integer countdown to the next season transition
- `isNamedSeason` — boolean, `true` for all seasons except Ordinary Time (useful for conditional rendering)

The hook has no side effects, no localStorage, no API calls. It computes everything from `new Date()` and the calendar algorithm. It should be memoized so it doesn't recalculate on every render (the season doesn't change within a single session).

### 3. Dashboard Greeting — Seasonal Suffix

**Integration point:** The existing `DashboardHero` time-aware greeting (e.g., "Good morning, Eric") gains a seasonal suffix during named seasons.

**Behavior:**
- During a named season: "Good morning, Eric — Blessed Lent" or "Good evening, Eric — Happy Easter" or "Good morning, Eric — Merry Christmas"
- During Ordinary Time: No change — keep the existing plain greeting ("Good morning, Eric")
- The separator is an em dash (` — `) between the name and the seasonal greeting
- The seasonal suffix uses the season's theme color as its text color for a subtle visual accent

**Responsive:** The seasonal suffix wraps to a second line on mobile if needed (no truncation). On desktop, it stays on the same line.

### 4. Daily Devotional — Seasonal Content Priority

**Integration point:** The existing devotional data model and rotation system.

**Changes:**
- Add an optional `season` field to the devotional data model (e.g., `season?: 'advent' | 'lent' | 'easter' | 'christmas'`)
- Seed 20 seasonal devotionals (in addition to the existing ~60 general ones):
  - 5 Advent devotionals (themes: hope, waiting, prophecy, preparation, joy of anticipation)
  - 5 Lenten devotionals (themes: repentance, fasting, humility, sacrifice, renewal)
  - 3 Easter devotionals (themes: resurrection, new life, victory over death)
  - 3 Christmas devotionals (themes: incarnation, gift of God, peace on earth)
  - 2 Holy Week devotionals (themes: sacrifice, the cross)
  - 2 Pentecost devotionals (themes: Holy Spirit, empowerment)
- All devotionals use WEB translation for scripture passages

**Selection logic:**
- When a liturgical season is active and tagged devotionals exist for that season, prioritize them over the default day-of-year rotation
- Cycle through seasonal devotionals within the season (e.g., 5 Advent devotionals rotate across the ~28 days of Advent, cycling back to the first after all 5 are shown)
- Fall back to the normal general pool rotation if no seasonal devotional matches today (e.g., during Ordinary Time, or if the seasonal cycle aligns with a day that's already been shown)
- When viewing past days (via the day offset navigation), the devotional shown should match the season that was active on that day — not today's season

### 5. Verse of the Day — Seasonal Tagging

**Integration point:** The existing verse of the day pool and `getTodaysVerse()` function.

**Changes:**
- Add an optional `season` field to 20 of the existing 60 verses, tagging them with a liturgical season
- Distribution:
  - 5 verses tagged `advent` (prophecy, hope, preparation themes)
  - 5 verses tagged `lent` (repentance, reflection, humility themes)
  - 4 verses tagged `easter` (resurrection, new life themes)
  - 3 verses tagged `christmas` (birth, incarnation, joy themes)
  - 2 verses tagged `holy-week` (sacrifice, the cross themes)
  - 1 verse tagged `pentecost` (Holy Spirit theme)

**Selection logic:**
- When a season is active and tagged verses exist for that season, prioritize a seasonal verse
- Rotate through seasonal verses within the season (similar to devotionals)
- Fall back to the normal rotation if no seasonal verse matches today or during Ordinary Time

### 6. Landing Page — Seasonal Banner

**Integration point:** The Home page, positioned below the navbar.

**Banner design:**
- A thin strip (~40px height) appearing below the navbar and above the hero section
- Background: the season's theme color at 10% opacity
- Content: the season's Lucide icon (16px, in the theme color at 70% opacity) + brief message text
- Message format: "It's [Season] — a season of [theme word]" (e.g., "It's Advent — a season of hope", "It's Lent — a season of renewal", "It's Easter — a season of joy")
- CTA: A subtle text link to `/devotional` or another relevant feature ("Read today's devotional" in the theme color)
- Dismissible: X button on the right side. Dismissed state stored in `sessionStorage` (key: `wr_seasonal_banner_dismissed`). Uses `sessionStorage` (not localStorage) so it reappears on next browser session/visit.

**Visibility rules:**
- Only shows during named seasons (not during Ordinary Time)
- Shows for both logged-in and logged-out users
- Does not show if dismissed this session

**Responsive:**
- Mobile: Icon + message text on one line (message may wrap). X button at far right. CTA below the message.
- Tablet/Desktop: Icon + message + CTA all on one line. X button at far right.

### 7. Prayer Wall — Seasonal QOTD Prompts

**Integration point:** The existing QOTD system (`getTodaysQuestion()` and `QUESTION_OF_THE_DAY_POOL`).

**Changes:**
- Add 12 season-specific questions to the QOTD pool (or a separate seasonal pool):
  - 3 Advent questions (e.g., "What are you waiting on God for this Advent season?", "How does the hope of Advent speak to your life right now?", "What does preparing your heart for Christmas look like for you?")
  - 3 Lenten questions (e.g., "What are you giving up or taking on for Lent this year?", "How is God inviting you to draw closer during this Lenten season?", "What does the journey to the cross mean for your daily life?")
  - 3 Easter questions (e.g., "What does the resurrection mean for you personally this Easter?", "How has new life shown up in your story this season?", "What chains has Christ broken in your life?")
  - 3 Christmas questions (e.g., "What gift from God are you most grateful for this Christmas?", "How do you experience the peace of Christmas in a noisy world?", "What does 'God with us' mean to you right now?")

**Selection logic:**
- When a named season is active, seasonal questions take priority over the general QOTD pool
- Rotate through the 3 seasonal questions across the days of the season
- After all 3 seasonal questions have been shown, fall back to the general pool for the remaining days of the season
- During Ordinary Time, use the existing general pool (no change)

### 8. Navbar — Seasonal Icon

**Integration point:** The navbar logo area.

**Design:**
- During named seasons, display the season's Lucide icon next to the "Worship Room" logo text
- Icon size: 16px
- Icon color: the season's theme color at 50% opacity
- Position: immediately after the "Worship Room" text, with a small gap (4-6px)
- No tooltip, no interaction — purely decorative

**Visibility:**
- Shows for both logged-in and logged-out users
- Only during named seasons (hidden during Ordinary Time)
- Visible on both desktop and mobile navbar

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature introduces no user text input. All content (devotionals, verses, prayers, questions) is pre-authored static content.
- **User input involved?**: No — the seasonal QOTD prompts are questions displayed to the user, but the actual text input for responding to them is handled by the existing Prayer Wall composer (which already has crisis detection).
- **AI-generated content?**: No — all seasonal content is hardcoded constants (devotional text, verse text, prayer questions, banner messages).

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Can see:** Landing page seasonal banner, navbar seasonal icon, Prayer Wall seasonal QOTD (as the question prompt, not any saved response)
- **Cannot see:** Dashboard greeting (dashboard is auth-gated), dashboard devotional/verse widgets (auth-gated)
- **Data persistence:** Zero. The only storage used is `sessionStorage` for the banner dismiss state, which is ephemeral and does not persist across sessions.

### Logged-in users:
- **Can see:** All 6 integration points — dashboard greeting, seasonal devotionals, seasonal verses, landing page banner (if they visit `/`), seasonal QOTD, navbar icon
- **Data persistence:** None new. Seasonal content is computed from the current date, not stored. The devotional completion (`wr_devotional_reads`) and verse display use existing localStorage keys.

### Route type:
- No new routes. All changes are modifications to existing components and data files.

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Landing page seasonal banner | Visible, dismissible (sessionStorage) | Visible, dismissible (sessionStorage) |
| Navbar seasonal icon | Visible (decorative) | Visible (decorative) |
| Dashboard greeting suffix | Not visible (landing page shown instead) | Visible with seasonal greeting |
| Seasonal devotional content | Devotional page is public — seasonal devotionals show when visiting `/devotional` | Same, plus dashboard TodaysDevotionalCard shows seasonal content |
| Seasonal verse of the day | Verse is visible on public pages (Daily Hub banner) — seasonal verses prioritized | Same, plus dashboard VerseOfTheDayCard shows seasonal verse |
| Seasonal QOTD prompt | Visible on Prayer Wall (public) — seasonal question displayed as the prompt | Same; responding to the QOTD triggers existing auth modal for posting |
| Banner dismiss (X button) | Stores to sessionStorage (ephemeral, not user data) | Same behavior |

---

## UX & Design Notes

### Visual Design Philosophy

Seasonal touches should be **subtle and ambient**, not overwhelming. The app should feel gently aware of the time of year — like walking into a church that has changed its altar cloth colors — not like a holiday-themed retail store. The seasonal theme color appears as an accent, never as a dominant background or primary UI color.

### Design System References

- **Dashboard hero gradient**: Matches the existing dark radial gradient from the design system recon — `radial-gradient` with `rgb(59, 7, 100)` center. The seasonal greeting suffix overlays this.
- **Landing page banner**: New pattern — a thin full-width strip. Similar in concept to a notification bar but with seasonal theming. Simple CSS: `height: 40px`, seasonal color at 10% opacity background, centered content.
- **Navbar logo**: Existing glassmorphic nav from `Navbar.tsx`. The seasonal icon is added adjacent to the logo text — same vertical alignment, just appended with a gap.
- **Frosted glass dashboard cards**: Existing pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`). Seasonal content in devotional/verse cards uses the same card style — no seasonal color on the cards themselves.
- **Typography**: Seasonal greeting suffix uses Inter (same as the greeting). Seasonal banner message uses Inter. No new font usage.

### New Visual Patterns Introduced

1. **Seasonal banner strip** — A 40px-height full-width bar below the navbar on the landing page. Background is `{seasonColor}10` (10% opacity), text in `text-text-dark` or `text-white/90` depending on page context (landing page hero is dark, so white text). Dismissible with X button. This pattern does not exist elsewhere in the app.
2. **Seasonal greeting color accent** — The greeting suffix text uses the season's theme color. This is the first time a non-standard text color appears in the dashboard hero area. Keep it subtle — the color should feel like an accent, not a highlight.
3. **Seasonal icon in navbar** — A 16px Lucide icon at 50% opacity of the theme color. Decorative only. First time an icon appears in the navbar logo area.

### Animations

- **Landing page banner**: Slides down from 0 height on page load (200ms ease-out). Dismiss slides up and removes from DOM.
- **Dashboard greeting suffix**: Fades in alongside the existing greeting (no separate animation).
- **Navbar icon**: No animation — static display.
- **`prefers-reduced-motion`**: Banner appears without slide animation (instant). All other elements are static already.

---

## Responsive Behavior

### Mobile (< 640px)

- **Landing page banner**: Full width. Icon + message on left, X button on right. CTA wraps below message if space is tight. Min height 40px, grows to fit content. Touch target for X button is 44px.
- **Dashboard greeting**: "Good morning, Eric" on first line, "— Blessed Lent" wraps to second line if needed. Seasonal suffix text is slightly smaller than the main greeting.
- **Navbar icon**: 14px icon (slightly smaller), same position next to logo text. Visible in both the top bar and hamburger drawer header if logo appears there.
- **Devotional/verse cards**: No layout change — seasonal content just swaps in with different text.
- **QOTD**: No layout change — seasonal question text replaces general question text.

### Tablet (640–1024px)

- **Landing page banner**: Icon + message + CTA on one line. X button at far right. Comfortable spacing.
- **Dashboard greeting**: Greeting + seasonal suffix on same line.
- **Navbar icon**: 16px icon, standard position.

### Desktop (> 1024px)

- **Landing page banner**: Same as tablet, max-width constrained to content area. Centered within the page.
- **Dashboard greeting**: Greeting + seasonal suffix on same line with generous spacing.
- **Navbar icon**: 16px icon, standard position.
- **All interactive elements (X dismiss button, CTA link)**: Visible focus rings for keyboard navigation.

---

## Edge Cases

- **Year boundary**: Advent and Christmas span the year boundary (Advent starts in late November, Christmas extends to January 5, Epiphany is January 6). The date range computation must handle this correctly — an Advent season starting in November 2026 has its Christmas and Epiphany in January 2027.
- **Leap years**: The Computus algorithm handles leap years correctly. No special handling needed.
- **Overlapping seasons**: Lent and Holy Week overlap (Holy Week is the last week of Lent). Holy Week takes priority. The priority order: Holy Week > Epiphany > Pentecost > other named seasons > Ordinary Time.
- **Single-day seasons**: Epiphany (Jan 6) and Pentecost are single days. The hook should return them correctly for those 24 hours and transition to the next season at midnight.
- **Timezone**: Use `new Date()` for local time (browser timezone). Do not use UTC. This matches the existing pattern (mood check-in, devotional rotation).
- **Server-side rendering**: Not applicable (React SPA). All computation is client-side.
- **Past day navigation (devotionals)**: When viewing a past day's devotional via the day offset, the season for that past date should be computed and the correct seasonal devotional shown.
- **Session storage vs localStorage**: The banner dismiss uses `sessionStorage` intentionally — it resets when the browser is closed, allowing the banner to reappear on the next visit. This is different from localStorage-based dismissals elsewhere in the app.
- **Ordinary Time**: The most common season. During Ordinary Time, all seasonal UI is hidden/inactive. The app looks and behaves exactly as it does today.
- **Multiple Ordinary Time periods**: Ordinary Time has two stretches in the liturgical year (after Epiphany until Lent, and after Pentecost until Advent). Both are treated identically — just "Ordinary Time."
- **Testing across seasons**: The hook accepts an optional `dateOverride` parameter for testing purposes, allowing unit tests to simulate any date without mocking `Date`.

---

## Acceptance Criteria

### Liturgical Calendar Constants & Algorithm
- [ ] A constants file defines all 8 seasons with id, name, themeColor, icon, greeting, and suggestedContent
- [ ] Easter is calculated using the Anonymous Gregorian algorithm (Computus) and is correct for 2026 (April 5), 2027 (March 28), 2028 (April 16), and 2029 (April 1)
- [ ] Ash Wednesday is correctly computed as Easter minus 46 days
- [ ] Palm Sunday is correctly computed as Easter minus 7 days
- [ ] Pentecost is correctly computed as Easter plus 49 days
- [ ] Advent start is computed as the nearest Sunday to November 30 (range: Nov 27–Dec 3)
- [ ] Christmas is fixed December 25 through January 5
- [ ] Epiphany is fixed January 6
- [ ] Holy Week (Palm Sunday through Holy Saturday) takes priority over Lent when both overlap
- [ ] Ordinary Time covers all dates not in a named season
- [ ] Date range functions work for any year without manual updates

### `useLiturgicalSeason` Hook
- [ ] Returns `currentSeason`, `seasonName`, `themeColor`, `icon`, `greeting`, `daysUntilNextSeason`, and `isNamedSeason`
- [ ] Returns correct season for today's date
- [ ] `isNamedSeason` is `false` during Ordinary Time and `true` for all other seasons
- [ ] `greeting` is an empty string during Ordinary Time
- [ ] `daysUntilNextSeason` counts down correctly to the next season transition
- [ ] Accepts an optional date override parameter for testing
- [ ] Has no side effects (no localStorage, no API calls, no state mutations)

### Dashboard Greeting
- [ ] During a named season, the greeting displays as "Good [time], [Name] — [seasonal greeting]" (e.g., "Good morning, Eric — Blessed Lent")
- [ ] The seasonal greeting suffix uses the season's theme color as text color
- [ ] During Ordinary Time, the greeting displays as before with no suffix ("Good morning, Eric")
- [ ] On mobile, the seasonal suffix wraps to a second line without truncation
- [ ] On tablet/desktop, the greeting and suffix appear on the same line

### Daily Devotional — Seasonal Content
- [ ] 20 seasonal devotionals are added: 5 Advent, 5 Lent, 3 Easter, 3 Christmas, 2 Holy Week, 2 Pentecost
- [ ] Each seasonal devotional has an optional `season` field matching a season ID
- [ ] During a named season, the daily devotional prioritizes seasonal content over the general rotation
- [ ] Seasonal devotionals cycle within their season (e.g., 5 Advent devotionals rotate across ~28 days)
- [ ] During Ordinary Time, the existing general rotation is used (no change)
- [ ] Past-day navigation shows the seasonal devotional that was active on that past date
- [ ] All seasonal devotional scripture uses WEB translation

### Verse of the Day — Seasonal Tagging
- [ ] 20 existing verses gain an optional `season` field (5 advent, 5 lent, 4 easter, 3 christmas, 2 holy-week, 1 pentecost)
- [ ] During a named season, seasonal verses are prioritized over the general rotation
- [ ] During Ordinary Time, the existing rotation is used (no change)
- [ ] Fallback to general rotation if no seasonal verse matches today

### Landing Page — Seasonal Banner
- [ ] Banner appears below the navbar during named seasons
- [ ] Banner does NOT appear during Ordinary Time
- [ ] Banner height is approximately 40px (grows to fit content on mobile)
- [ ] Banner background uses the season's theme color at 10% opacity
- [ ] Banner displays the season's icon (16px) and message: "It's [Season] — a season of [theme]"
- [ ] Banner includes a CTA link to `/devotional` in the season's theme color
- [ ] X dismiss button stores dismissed state to `sessionStorage` (key: `wr_seasonal_banner_dismissed`)
- [ ] After dismissal, banner does not reappear for the rest of the browser session
- [ ] Banner reappears on a new browser session (sessionStorage resets)
- [ ] Banner is visible to both logged-in and logged-out users
- [ ] Mobile: Icon + message on left, X on right, CTA wraps below. X touch target is 44px minimum.
- [ ] Tablet/Desktop: Icon + message + CTA on one line, X on far right

### Prayer Wall — Seasonal QOTD
- [ ] 12 seasonal questions added (3 Advent, 3 Lent, 3 Easter, 3 Christmas)
- [ ] During a named season, seasonal questions take priority in the QOTD rotation
- [ ] Seasonal questions rotate across the days of the season (not all shown on day 1)
- [ ] After all seasonal questions have been shown, fall back to the general pool
- [ ] During Ordinary Time, the existing general QOTD pool is used (no change)

### Navbar — Seasonal Icon
- [ ] During named seasons, a Lucide icon appears next to the "Worship Room" logo text
- [ ] Icon is 16px (14px on mobile) in the season's theme color at 50% opacity
- [ ] Icon has a 4-6px gap from the logo text
- [ ] Icon is purely decorative (no tooltip, no click handler, `aria-hidden="true"`)
- [ ] Icon is visible on both desktop and mobile navbar layouts
- [ ] During Ordinary Time, no icon is shown

### Accessibility
- [ ] Landing page banner dismiss button has `aria-label="Dismiss seasonal banner"`
- [ ] Banner message is readable by screen readers (semantic text, not background-only)
- [ ] Navbar seasonal icon has `aria-hidden="true"` (decorative)
- [ ] Seasonal greeting suffix is part of the same heading element as the main greeting (not a separate, disconnected element)
- [ ] All seasonal colors pass WCAG AA contrast against their backgrounds (theme colors on dark dashboard, theme colors in light banner)
- [ ] `prefers-reduced-motion`: banner entrance animation is disabled (instant render)

### General
- [ ] No new routes are added
- [ ] No new localStorage keys are introduced (only `sessionStorage` for banner dismiss)
- [ ] All seasonal UI is purely visual — no functionality is blocked during any season
- [ ] The calendar algorithm works for any year without requiring manual updates
- [ ] Unit tests cover Easter calculation for at least 4 different years
- [ ] Unit tests cover season determination for dates in every season
- [ ] Unit tests cover edge cases: year boundary (Advent/Christmas), single-day seasons (Epiphany, Pentecost), Holy Week/Lent overlap priority

---

## Out of Scope

- **Liturgical calendar page/route** — No standalone calendar view or `/liturgical-calendar` page. This feature is ambient awareness, not a calendar tool.
- **User-configurable liturgical tradition** — Some denominations calculate seasons differently (e.g., Orthodox Easter). MVP supports the Western/Gregorian calendar only.
- **Seasonal challenges or campaigns** (e.g., "Pray40" for Lent) — Future enhancement. This spec only adds content awareness, not gamified challenges.
- **Seasonal theme/skin changes** — No app-wide color theme changes per season. Only subtle accents (greeting text, banner, icon).
- **Seasonal push notifications or email** — Future enhancement (Phase 2.95 notifications spec).
- **Seasonal audio content** (e.g., Advent playlists, Easter worship sets) — Future enhancement for the Music feature.
- **Seasonal badges** (e.g., "Completed Advent", "Easter Devotion") — Could be added to badge definitions later, not in this spec.
- **Backend persistence of seasonal data** — Phase 3+. All computation is client-side.
- **Orthodox/Eastern liturgical calendar** — MVP is Western calendar only.
- **Saint days, feast days, or minor observances** — Only the 8 major seasons listed above.
- **Seasonal Prayer Wall categories** — The Prayer Wall category filter (Spec 7) is unchanged; seasonal awareness only touches QOTD.
- **Seasonal meditation content** — Meditation sub-pages are unchanged.
