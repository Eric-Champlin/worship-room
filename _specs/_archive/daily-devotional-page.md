# Feature: Daily Devotional Page

## Overview

The daily devotional is the single most common feature across every competitor in the Christian wellness space — Glorify, Hallow, Pray.com, Lectio 365, and Abide all lead with it. It's the feature that gives users a reason to open the app every morning and the biggest content gap in Worship Room today.

This feature introduces a new `/devotional` route that serves a complete daily devotional experience: an inspiring quote, a Bible passage (WEB translation), a written reflection, a closing prayer, and a reflection question. The structure follows Glorify's proven format, adapted for Worship Room's dark, contemplative aesthetic.

The devotional rotates daily using the same deterministic day-of-year index pattern as Verse of the Day, so all users see the same devotional on the same day — creating a shared daily rhythm. A pool of 30 hardcoded devotionals covers 10 themes central to emotional healing: trust in hard times, gratitude, forgiveness, identity in Christ, anxiety and peace, God's faithfulness, purpose, hope, healing, and community.

This is Spec 16 of Phase 2.9 — the first of a 2-spec devotional sequence. Spec 17 will add dashboard integration (devotional widget, devotional completion tracking in the activity checklist) and mood-based personalization (surfacing devotionals that match the user's recent mood patterns).

---

## User Stories

- As a **logged-out visitor**, I want to read today's devotional so that I can start my morning with God without needing to create an account.
- As a **logged-out visitor**, I want to share today's devotional with a friend so that I can encourage someone else with what I read.
- As a **logged-in user**, I want to journal about the devotional I just read so that I can process my thoughts and connect the scripture to my life.
- As a **logged-in user**, I want to see that I've completed today's devotional so that I feel a sense of daily spiritual rhythm.
- As a **logged-in user**, I want to browse back through the past week's devotionals so that I can revisit one I missed or want to re-read.
- As any user, I want the devotional to rotate daily with the same content for everyone so that I feel connected to the broader Worship Room community.

---

## Requirements

### Devotional Content Data Model

1. **30 hardcoded devotional entries** stored in a dedicated constants/data file. Each entry has:
   - `id` — unique string identifier (e.g., `"devotional-01"`)
   - `dayIndex` — integer 0-29, used for day-of-year rotation (`dayOfYear % 30`)
   - `title` — human-readable title (e.g., "Finding Peace in the Storm")
   - `theme` — one of 10 themes: `trust`, `gratitude`, `forgiveness`, `identity`, `anxiety-and-peace`, `faithfulness`, `purpose`, `hope`, `healing`, `community`
   - `quote` — object with `text` (1-2 sentences) and `attribution` (person or "Unknown")
   - `passage` — object with `reference` (e.g., "Psalm 46:1-3") and `verses` (array of `{ number: number, text: string }` objects, WEB translation)
   - `reflection` — array of 3-5 paragraph strings, written in warm second-person voice ("you" language), connecting the passage to daily life
   - `prayer` — single paragraph string, a closing prayer
   - `reflectionQuestion` — string, formatted as "Something to think about today: ..."

2. **Theme distribution**: 3 devotionals per theme (3 x 10 = 30 total). Themes are distributed across the rotation so users don't get consecutive days with the same theme.

3. **Bible passages must use the WEB translation** (World English Bible, public domain). Each passage includes 2-6 verses with verse numbers.

4. **Reflection paragraphs** should be warm, encouraging, practical, and non-denominational. They connect the scripture to everyday struggles and joys. Written in second-person ("you") voice — never preachy, never judgmental, always hopeful.

5. **Quotes** should be from a mix of sources: classic Christian writers (C.S. Lewis, Corrie ten Boom, A.W. Tozer, Dietrich Bonhoeffer), modern voices, and anonymous/traditional. No living controversial figures.

### Daily Rotation

6. **Deterministic daily rotation** using the same pattern as Verse of the Day: `devotionalPool[dayOfYear % devotionalPool.length]`. Day of year is based on the user's local date. All users see the same devotional on the same day. No randomness, no backend.

7. **Day boundary**: Devotional changes at midnight local time. If the user has the app open across midnight, the devotional does NOT auto-update — it updates on next page load/navigation.

### Page Layout (`/devotional`)

8. **Dark background** matching the inner page style (same hero gradient pattern as Daily Hub, Prayer Wall, Local Support pages — fading from dark purple to the page background).

9. **PageHero component** with:
   - Title: "Daily Devotional"
   - Subtitle: Today's date formatted as "Day of week, Month Day, Year" (e.g., "Friday, March 20, 2026")
   - For logged-in users who have completed today's devotional: a subtle checkmark icon and "Completed" label next to the date

10. **Content column**: Single centered column, `max-w-2xl`, matching the Daily Hub content width. Content flows vertically with each section visually separated.

11. **Section order and typography**:
    - **Devotional title**: Large heading, Inter bold, centered above all content sections
    - **Quote section**: Lora italic with large decorative quotation marks (styled `"` characters, not images), quote text in `text-lg` or larger, attribution below in smaller muted text. Separated from the next section by a subtle divider (`border-white/10`).
    - **Passage section**: Reference displayed as a label above the verses (e.g., "Psalm 46:1-3"). Each verse on its own line with verse number in `text-white/30` (e.g., "^1") preceding the verse text in Lora italic. Separated by divider.
    - **Reflection section**: Inter body text, normal weight, comfortable line height (`leading-relaxed`). Paragraphs separated by normal spacing. Separated by divider.
    - **Prayer section**: Lora italic, slightly smaller than reflection text. Preceded by a "Closing Prayer" label. Separated by divider.
    - **Reflection question section**: Displayed in a frosted glass callout card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`). Question text in Inter, slightly emphasized. The "Something to think about today:" prefix in muted text, the actual question in full white.

### Navigation (Day Browsing)

12. **Browse up to 7 days back** from today. Navigation via left/right arrow buttons flanking the date in the hero. Left arrow goes to the previous day, right arrow goes to the next day. Right arrow is disabled when viewing today's devotional (cannot browse into the future).

13. **Swipe navigation** on mobile: swipe left to go forward (next day), swipe right to go back (previous day). Same 7-day limit.

14. **URL state**: The current day offset is stored in the URL as a query param (e.g., `/devotional?day=-3` for 3 days ago). No query param or `?day=0` means today. This makes devotional links shareable.

15. **Arrow visual treatment**: Subtle, not prominent — the focus is on reading, not navigation. Arrows use `text-white/40 hover:text-white/70` styling. Disabled arrow (at 7-day limit or at today) is `text-white/15 cursor-not-allowed`.

### Action Buttons

16. **Three action buttons** at the bottom of the devotional content, below the reflection question card:
    - **"Journal about this"**: Links to `/daily?tab=journal` with the devotional theme as context (e.g., `?tab=journal&context=devotional&theme=trust`). This is the natural auth gate — journaling requires login. Logged-out users clicking this see the auth modal.
    - **"Share today's devotional"**: Copies a shareable link to the clipboard (the current URL including any `?day=` param). Shows a "Link copied!" toast. No auth required.
    - **"Read aloud"**: Uses the existing ReadAloudButton/TTS pattern to read the full devotional content (quote → passage → reflection → prayer → question) aloud. No auth required.

17. **Button styling**: Horizontal row on desktop (3 buttons side by side), stacked vertically on mobile. Use the existing action button patterns (outline style on dark backgrounds, similar to prayer action buttons).

### Navbar Integration

18. **Add "Daily Devotional" to the navbar** as a new top-level link between "Daily Hub" and "Prayer Wall". The link goes to `/devotional`.

19. **Desktop navbar**: "Daily Devotional" appears as a text link with a small sparkle/star icon (Lucide `Sparkles` or `Star`) to draw attention as a new feature. Same styling as other nav links.

20. **Mobile drawer**: "Daily Devotional" appears between "Daily Hub" and "Prayer Wall" in the drawer menu.

21. **Active state**: The link shows the active underline when on `/devotional` or `/devotional?day=*`.

### Landing Page Teaser

22. **Add a devotional teaser** on the landing page. Position: between the JourneySection and GrowthTeasersSection (same slot as the Verse of the Day section if it exists, or adjacent to it).

23. **Teaser content**:
    - Small label: "Daily Devotional" in `text-xs uppercase tracking-widest text-white/40`
    - Heading: "Start Each Morning with God" in large serif (Lora) or heading font
    - Today's devotional title displayed below (e.g., "Today: Finding Peace in the Storm") in muted text
    - CTA button: "Read Today's Devotional" linking to `/devotional`. Use the Hero Outline CTA style (`bg-white/10 text-white border border-white/30 rounded-lg`)
    - Dark background section matching the Growth Teasers aesthetic

24. **Responsive**: The teaser section is full-width, centered content, adequate vertical padding (`py-16 sm:py-20`).

### Reading Completion Tracking

25. **For logged-in users only**: When the user scrolls to the bottom of the devotional (Intersection Observer on the reflection question section — the last content section), mark today's devotional as read.

26. **Storage**: `wr_devotional_reads` localStorage key — an array of date strings (format `YYYY-MM-DD`), capped at 365 entries (oldest entries removed when cap is reached).

27. **Visual indicator**: After the devotional is marked as read, the hero shows a subtle checkmark icon next to the date with "Completed" text (e.g., `text-white/50` with a small `Check` icon). This only appears for today's devotional, not for past days.

28. **No persistence for logged-out users**: Zero data written to localStorage, cookies, or any storage. The completion feature simply doesn't activate.

29. **Completion only fires for today's devotional**: Scrolling to the bottom of a past day's devotional (via day browsing) does NOT mark it as read. Only today's devotional triggers completion tracking.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| View devotional (any day) | Visible, no restrictions | Visible, no restrictions |
| Browse days (arrows/swipe) | Works, no restrictions | Works, no restrictions |
| "Share today's devotional" | Copies link, shows toast | Same |
| "Read aloud" | TTS playback works | Same |
| "Journal about this" | Auth modal: "Sign in to journal about this devotional" | Navigates to `/daily?tab=journal` with devotional context |
| Reading completion checkmark | Not shown, not tracked | Shows after scrolling to bottom of today's devotional |
| Navbar "Daily Devotional" link | Visible, links to `/devotional` | Same |
| Landing page teaser CTA | Visible, links to `/devotional` | Same |

### Persistence

- **Logged-out**: Zero persistence. No localStorage writes, no cookies. Devotional content is computed from the date each time.
- **Logged-in**: One new localStorage key: `wr_devotional_reads` (array of date strings, max 365). Written only when today's devotional is read to completion.
- **Route type**: Public (`/devotional`). No auth required to view.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays curated, hardcoded content — no user text input, no AI-generated content.
- **User input involved?**: No. All content is pre-written and hardcoded.
- **AI-generated content?**: No. All devotional text (quotes, passages, reflections, prayers, questions) is pre-authored and curated.
- **Theological boundaries**: Reflections and prayers must follow the existing theological boundary rules: never claim divine authority, avoid denominational bias, use encouraging language ("Scripture encourages us..." not "God is telling you..."). See `01-ai-safety.md`.

---

## UX & Design Notes

### Emotional Tone

The devotional page should feel like a quiet morning ritual — unhurried, contemplative, warm. The design should encourage slow reading, not scanning. Generous whitespace, comfortable typography, gentle visual hierarchy. Each section breathes. The page is a resting place, not a dashboard.

### Visual Design — Page Layout

- **Background**: Dark inner page pattern — same hero gradient as Daily Hub/Prayer Wall/Local Support (dark purple fading to page background). The entire page stays dark (unlike inner pages that fade to light) since the devotional is a contemplative experience. Use `bg-hero-dark` or the dark gradient throughout, similar to the dashboard's all-dark theme.
- **Content column**: `max-w-2xl mx-auto px-4 sm:px-6` — centered, comfortable reading width
- **Section dividers**: `border-t border-white/10` between each major section, with `py-8 sm:py-10` vertical spacing per section

### Visual Design — Quote Section

- **Large decorative quotation marks**: Use styled `"` and `"` characters in a large font size (e.g., `text-5xl text-white/20 font-serif`) positioned as a decorative element above or before the quote text
- **Quote text**: `font-serif italic text-xl sm:text-2xl text-white leading-relaxed`
- **Attribution**: `text-sm text-white/50 mt-3` — preceded by an em dash: `— C.S. Lewis`

### Visual Design — Passage Section

- **Reference label**: `text-xs uppercase tracking-widest text-white/40 font-medium mb-4`
- **Verse text**: `font-serif italic text-base sm:text-lg text-white/90 leading-relaxed`
- **Verse numbers**: `text-white/30 text-xs font-sans mr-1 align-super` — superscript-style, subtle
- **Each verse**: Separated by a small gap but flowing as continuous text (not one verse per line — flowing paragraph style with inline verse numbers)

### Visual Design — Reflection Section

- **Body text**: `font-sans text-base text-white/80 leading-relaxed`
- **Paragraph spacing**: `space-y-4` between paragraphs
- **No heading** above this section — the divider and paragraph format are self-explanatory

### Visual Design — Prayer Section

- **Label**: "Closing Prayer" in `text-xs uppercase tracking-widest text-white/40 font-medium mb-4`
- **Prayer text**: `font-serif italic text-base text-white/80 leading-relaxed`

### Visual Design — Reflection Question Section

- **Callout card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`
- **Prefix**: "Something to think about today:" in `text-sm text-white/40`
- **Question**: `text-lg text-white font-medium mt-2`

### Visual Design — Action Buttons

- **Layout**: Horizontal row on desktop (`flex gap-3 justify-center`), vertical stack on mobile (`flex flex-col gap-3`)
- **Style**: Outline buttons on dark background — `bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 hover:bg-white/15 transition-colors text-sm font-medium`
- **Icons**: Each button has a small Lucide icon (BookOpen for Journal, Share2 for Share, Volume2 for Read Aloud) preceding the label

### Visual Design — Day Navigation Arrows

- **Position**: Flanking the date text in the hero (left arrow | date | right arrow)
- **Style**: `text-white/40 hover:text-white/70 transition-colors` — Lucide `ChevronLeft` and `ChevronRight`
- **Disabled state**: `text-white/15 cursor-not-allowed`
- **Size**: 24px icons, with adequate padding for 44px touch targets on mobile

### Visual Design — Landing Page Teaser

- **Background**: Dark section matching Growth Teasers aesthetic. `bg-hero-dark` or subtle gradient between `#0D0620` and `#1E0B3E`.
- **Label**: `text-xs uppercase tracking-widest text-white/40 font-medium mb-2`
- **Heading**: `font-serif text-2xl sm:text-3xl text-white mb-3`
- **Today's title**: `text-base text-white/50 mb-6`
- **CTA**: Hero Outline CTA style from design system recon (`bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30 hover:bg-white/15`)
- **Padding**: `py-16 sm:py-20`, centered content, `max-w-3xl mx-auto`

### Design System Recon References

- **Inner page hero gradient**: Design system recon "Inner Page Hero" pattern
- **Dashboard card pattern** (for reflection question callout): `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Hero Outline CTA button**: `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30`
- **Dropdown panel style**: `bg-hero-mid border-white/15` for share panel if expanded
- **Action button patterns**: Reference prayer action buttons from the Pray tab

### New Visual Patterns

1. **All-dark devotional page**: A full-page dark experience (similar to dashboard) rather than the standard dark-hero-fading-to-light inner page pattern. This is a new treatment that emphasizes contemplation. Plan should verify readability of body text at `text-white/80` on the dark background.
2. **Decorative quotation marks**: Large `"` characters as visual accent. New decorative pattern.
3. **Day browsing arrows in hero**: Left/right navigation integrated into the hero date line. Similar to calendar navigation patterns but new to Worship Room.

---

## Responsive Behavior

### Mobile (< 640px)

- **Hero**: Title and date stack vertically. Day navigation arrows flanking the date. Reduced padding.
- **Content column**: Full-width with `px-4` side padding.
- **Quote**: `text-xl`, decorative quotation marks scaled down.
- **Passage**: `text-base`, flowing paragraph.
- **Reflection**: `text-base`, comfortable line height.
- **Prayer**: `text-base`.
- **Reflection question card**: Full-width, `p-4`.
- **Action buttons**: Stacked vertically, full-width.
- **Swipe navigation**: Enabled for day browsing (left/right swipe).
- **Landing page teaser**: Single column, `text-2xl` heading, full-width CTA.

### Tablet (640px - 1024px)

- **Hero**: Same as desktop but slightly reduced padding.
- **Content column**: `max-w-2xl` centered.
- **Quote**: `text-2xl`.
- **Action buttons**: Horizontal row, centered.
- **Swipe navigation**: Enabled.
- **Landing page teaser**: Same as desktop layout.

### Desktop (> 1024px)

- **Hero**: Full PageHero with generous padding. Date with arrow navigation centered.
- **Content column**: `max-w-2xl mx-auto` — optimal reading width.
- **Quote**: `text-2xl`, large decorative marks.
- **Action buttons**: Horizontal row, centered, comfortable spacing.
- **No swipe navigation** (arrows only).
- **Landing page teaser**: Centered with `max-w-3xl`, `text-3xl` heading.

---

## Edge Cases

- **Day boundary at midnight**: Devotional changes on next page load, not in real-time (same as Verse of the Day and mood check-in).
- **Leap year**: Day 366 wraps via modulo (366 % 30 = 6). No special handling.
- **7-day browsing limit**: Cannot browse beyond 7 days back. Left arrow disabled at day -7. Cannot browse into the future. Right arrow disabled at day 0 (today).
- **Shared link for past day**: Links with `?day=-3` work for anyone, always showing the same devotional for that relative day. Note: "3 days ago" is relative to the viewer's current date, so the shared link shows whatever is 3 days before the viewer's today — not a fixed date.
- **Reading completion on past days**: Scrolling to the bottom of a past day's devotional does NOT trigger completion. Only today's devotional (day=0 or no param) triggers the Intersection Observer.
- **Already completed today**: If the user re-reads today's devotional, the completion checkmark stays and no duplicate entry is written to localStorage.
- **localStorage cap**: When `wr_devotional_reads` exceeds 365 entries, the oldest entries are removed. This is a FIFO trim on write.
- **Long reflection text**: Paragraphs wrap naturally. No truncation. The reading experience should never feel rushed or cut short.
- **Read aloud**: TTS reads sections in order: quote text → passage text (without verse numbers spoken) → all reflection paragraphs → prayer → reflection question. Uses the existing ReadAloud/TTS pattern.

---

## Out of Scope

- **Backend API**: Entirely frontend. No API endpoints. No database storage for devotional content or reads. Backend persistence is Phase 3+.
- **AI-generated devotionals**: All content is hardcoded. AI personalization (mood-based devotional selection) is Spec 17.
- **Dashboard widget**: Devotional widget on the dashboard is Spec 17.
- **Activity checklist integration**: Recording devotional reading as a tracked activity (faith points) is Spec 17.
- **Audio narration**: No pre-recorded audio. TTS via browser Speech Synthesis only (using existing ReadAloudButton).
- **Bookmarking/favoriting devotionals**: Not in this spec. May integrate with existing favorites system in a future spec.
- **Devotional notifications/reminders**: No push notifications or email. Post-MVP feature.
- **Comments or community discussion on devotionals**: Not in this spec.
- **More than 30 devotionals**: The initial pool is 30. Expansion is a future content effort.
- **Custom sharing image**: No canvas-generated share card (unlike Verse of the Day). Link sharing only.
- **Verse of the Day integration**: The devotional is a separate feature from Verse of the Day. They may coexist on the landing page. No deduplication of verses between the two features.

---

## Acceptance Criteria

### Devotional Data

- [ ] 30 devotional entries exist in a dedicated data/constants file
- [ ] Each entry has all required fields: `id`, `dayIndex`, `title`, `theme`, `quote` (text + attribution), `passage` (reference + verses array), `reflection` (3-5 paragraphs), `prayer`, `reflectionQuestion`
- [ ] 10 themes with 3 devotionals each: trust, gratitude, forgiveness, identity, anxiety-and-peace, faithfulness, purpose, hope, healing, community
- [ ] All Bible passages use WEB translation with 2-6 verses each
- [ ] Verse numbers are included in the verses array
- [ ] Reflection paragraphs are written in warm second-person ("you") voice
- [ ] Quotes are attributed and from non-controversial sources
- [ ] Themes are distributed across the 30-day rotation so consecutive days don't repeat the same theme

### Daily Rotation

- [ ] Devotional is computed as `devotionalPool[dayOfYear % 30]` using local date
- [ ] All users see the same devotional on the same calendar day
- [ ] Devotional changes at midnight local time (same pattern as Verse of the Day)
- [ ] No localStorage reads, no randomness, no backend — purely date-based for the rotation itself

### Page Layout (`/devotional`)

- [ ] Route `/devotional` exists and renders the devotional page
- [ ] Page uses dark background throughout (all-dark contemplative style, not fading to light)
- [ ] PageHero displays "Daily Devotional" title and today's formatted date
- [ ] Devotional title is displayed prominently above all content sections
- [ ] Quote section: Lora italic text with decorative quotation marks and attribution
- [ ] Passage section: reference label above, verse text in Lora italic with inline verse numbers in `text-white/30`
- [ ] Reflection section: Inter body text, 3-5 paragraphs, comfortable line height
- [ ] Prayer section: "Closing Prayer" label, Lora italic text
- [ ] Reflection question section: frosted glass callout card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Sections are separated by subtle dividers (`border-white/10`)
- [ ] Content is in a centered `max-w-2xl` column

### Day Navigation

- [ ] Left/right arrow buttons flank the date in the hero
- [ ] Left arrow navigates to the previous day's devotional
- [ ] Right arrow navigates to the next day's devotional
- [ ] Right arrow is disabled when viewing today (day=0)
- [ ] Left arrow is disabled at 7 days ago (day=-7)
- [ ] URL updates with `?day=` query param when browsing
- [ ] Direct link to `/devotional?day=-3` works and shows the correct devotional
- [ ] Swipe left/right on mobile navigates between days
- [ ] Cannot swipe past today or past 7 days ago

### Action Buttons

- [ ] "Journal about this" button navigates to `/daily?tab=journal` with devotional context
- [ ] "Journal about this" triggers auth modal for logged-out users with message "Sign in to journal about this devotional"
- [ ] "Share today's devotional" copies the current URL to clipboard and shows a "Link copied!" toast
- [ ] "Read aloud" uses TTS to read the full devotional content in section order
- [ ] Buttons display horizontally on desktop, stacked vertically on mobile
- [ ] Each button has an appropriate Lucide icon

### Navbar Integration

- [ ] "Daily Devotional" link appears in the desktop navbar between "Daily Hub" and "Prayer Wall"
- [ ] Link includes a sparkle/star icon (Lucide `Sparkles` or `Star`)
- [ ] "Daily Devotional" appears in the mobile drawer between "Daily Hub" and "Prayer Wall"
- [ ] Active state (underline) shows when on `/devotional` or `/devotional?day=*`
- [ ] Navbar styling is consistent with existing nav links

### Landing Page Teaser

- [ ] Devotional teaser section appears on the landing page between JourneySection and GrowthTeasersSection
- [ ] Section shows "Daily Devotional" label, "Start Each Morning with God" heading, today's devotional title, and CTA button
- [ ] CTA "Read Today's Devotional" links to `/devotional`
- [ ] Dark background matches the Growth Teasers aesthetic
- [ ] Section has adequate vertical padding (`py-16 sm:py-20`)
- [ ] Content is centered with appropriate max-width

### Reading Completion

- [ ] Intersection Observer fires when the reflection question section scrolls into view
- [ ] Only fires for today's devotional (day=0), not past days
- [ ] Logged-in users: today's date string is written to `wr_devotional_reads` localStorage
- [ ] Logged-out users: no localStorage write occurs
- [ ] `wr_devotional_reads` is capped at 365 entries (FIFO trim)
- [ ] Hero shows a checkmark + "Completed" label next to the date after reading today's devotional
- [ ] Re-reading today's devotional does not create duplicate entries
- [ ] Completion state persists across page reloads (read from localStorage on mount)

### Responsive Layout

- [ ] Mobile (< 640px): Full-width content with `px-4`, stacked action buttons, swipe navigation enabled, quotation marks scaled down
- [ ] Tablet (640-1024px): `max-w-2xl` centered content, horizontal action buttons, swipe navigation enabled
- [ ] Desktop (> 1024px): `max-w-2xl` centered content, horizontal action buttons, no swipe (arrows only), generous padding

### Accessibility

- [ ] All text meets WCAG AA color contrast against the dark background
- [ ] Day navigation arrows are keyboard-accessible with visible focus indicators
- [ ] Arrow buttons have descriptive `aria-label` (e.g., "Previous day's devotional", "Next day's devotional")
- [ ] Disabled arrows have `aria-disabled="true"`
- [ ] Action buttons are keyboard-accessible with visible focus indicators
- [ ] Reflection question card is not an interactive element (no misleading ARIA roles)
- [ ] "Read aloud" button follows existing ReadAloudButton accessibility patterns
- [ ] Swipe navigation does not interfere with screen reader navigation
- [ ] Page has logical heading hierarchy (h1 for page title, h2 for devotional title, no heading jumps)
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] `prefers-reduced-motion` respected for any entrance animations

### Visual Verification

- [ ] Dark background is consistent throughout the page (no light sections breaking the contemplative feel)
- [ ] Quote section has visible decorative quotation marks that enhance rather than distract
- [ ] Passage verse numbers are subtle (`text-white/30`) and don't compete with verse text
- [ ] Section dividers are subtle (`border-white/10`) — present but not heavy
- [ ] Reflection question callout card is visually distinct from surrounding content
- [ ] Action buttons are visually consistent with existing outline button patterns in the app
- [ ] Hero date navigation arrows are subtle and don't dominate the hero
- [ ] Landing page teaser section transitions smoothly from JourneySection above and into GrowthTeasersSection below
- [ ] Navbar "Daily Devotional" link with sparkle icon is visually balanced with adjacent nav items

### No Regressions

- [ ] Existing Verse of the Day feature is unaffected
- [ ] Existing navbar links and behavior are unchanged (only insertion of new link)
- [ ] Landing page existing sections (Journey, Growth Teasers, Quiz, Footer) are unchanged
- [ ] Daily Hub (`/daily`) is unaffected
- [ ] No existing routes are modified
- [ ] No existing localStorage keys are modified
