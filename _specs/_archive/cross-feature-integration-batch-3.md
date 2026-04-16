# Feature: Cross-Feature Integration Batch 3

**Master Plan Reference:** N/A — standalone integration batch closing remaining data and navigation silos.

---

## Overview

Worship Room stores rich personal data — prayer lists, Bible highlights, mood history, activity patterns — but much of it lives in isolated features with no bridges between them. This batch connects five data silos so that a user's prayer life shows up in their insights, community prayers flow into their personal list, Bible highlights surface on their dashboard, daily verses lead into meditation, and monthly reports offer gentle, data-driven suggestions for what to try next. Each integration reinforces the truth that small acts of faithfulness form a connected whole.

## User Stories

- As a **logged-in user**, I want to see my prayer life patterns on the insights page so that I understand how my prayer practice connects to my emotional well-being.
- As a **logged-in user**, I want to save a Prayer Wall prayer to my personal prayer list so that I can carry someone's request into my daily prayer time.
- As a **logged-in user**, I want to see my recent Bible highlights on the dashboard so that my Scripture engagement stays visible and accessible.
- As a **logged-in user**, I want to meditate on the Verse of the Day so that I can deepen my engagement with today's verse beyond just reading it.
- As a **logged-in user**, I want actionable suggestions in my monthly report so that I know what to try next based on how my month actually went.

---

## Integration 1: Prayer List to Insights Correlations

### Current State

The personal prayer list (`wr_prayer_list`) tracks prayers with title, description, category (8 categories), status (`active`/`answered`), `createdAt`, `answeredAt`, and `prayedAt` dates (array of ISO date strings, recorded each time the user taps "Pray for this" on a prayer item). The `/insights` page (`MoodInsights`) shows mood heatmap, trend chart, activity correlations (gratitude, meditation, etc.), and meditation history — but has zero prayer list data.

### Requirements

1. **"Prayer Life" section**: Add a new section to the `/insights` page, positioned after the existing activity correlations section. Section heading: **"Prayer Life"** with a `HandHeart` icon (Lucide).

2. **Stat card**: A frosted glass card showing three stats in a row:
   - **Active Prayers**: count of prayers with `status: "active"`
   - **Answered Prayers**: count of prayers with `status: "answered"`
   - **Answer Rate**: `"X of Y prayers answered — Z%"` where Y = total prayers (active + answered), X = answered count, Z = percentage rounded to nearest integer
   - Layout: three stats side-by-side on desktop/tablet, stacked vertically on mobile. Each stat has a number (large, white, font-semibold) and a label below (text-sm, `text-white/60`).

3. **Mood correlation card**: Cross-reference `prayedAt` dates from prayer items with `wr_mood_entries` for those same dates. Calculate the average mood value on days the user prayed for their personal prayer list. Display as a correlation card matching the existing pattern (frosted glass, icon, correlation text, sample size):
   - Icon: `Heart` (Lucide)
   - Text: **"On days you prayed for your prayer list, your mood averaged X.X"**
   - Sample size: **"Based on N days"**
   - Only show when **5 or more** matching data points exist (days with both a prayedAt entry and a mood entry).

4. **Category breakdown card**: A frosted glass card showing prayer distribution across categories.
   - Heading: **"You pray most about [top category]"**
   - A small horizontal stacked bar showing the distribution of prayers across categories (each category as a colored segment, proportional to count). Use distinct muted colors for each segment.
   - Below the bar, show the top 3 categories with counts: e.g., "Health (5) / Family (3) / Guidance (2)"
   - Only show when the user has **3 or more** prayers total.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Prayer Life section | N/A — `/insights` is auth-gated | Section renders with prayer data | — |

The `/insights` page is already fully auth-gated. No additional gating needed.

---

## Integration 2: Prayer Wall Save to My Prayers

### Current State

Each `PrayerCard` in the Prayer Wall feed has an `InteractionBar` with Pray, Comments, Bookmark, and Share buttons. The personal prayer list (`wr_prayer_list`) accepts items with title, description, category, status, and metadata fields. There is no way to transfer a Prayer Wall prayer into the personal list.

### Requirements

1. **"Save" button in InteractionBar**: Add a Save button to the interaction bar on every `PrayerCard`, positioned after Share. Desktop: `Plus` icon (Lucide) + "Save" text label. Mobile (< 640px): `Plus` icon only (no text) to conserve space. Button styling matches the existing interaction bar buttons (same size, color, hover state).

2. **Inline save form**: Clicking Save opens a compact expandable section below the prayer card (same expand/collapse pattern as the comment section — slides down with height transition, not a modal). The form contains:
   - **Title input**: Pre-filled with the first 100 characters of the prayer content, editable. Standard text input with white/10 border.
   - **Category selector**: 8 pill buttons matching the existing prayer list categories. Pre-selected to match the Prayer Wall post's category if it has one; otherwise defaults to "Other."
   - **Action buttons**: "Save to My Prayers" (primary button) and "Cancel" (text button). Cancel collapses the form.

3. **Save behavior**: Creates a new entry in `wr_prayer_list` with:
   - `title`: from the title input
   - `description`: full prayer content text
   - `category`: selected category
   - `status`: `"active"`
   - `sourceType`: `"prayer_wall"`
   - `sourceId`: the Prayer Wall post's ID (for potential future linking)
   - `createdAt`: current ISO timestamp
   - `prayedAt`: empty array

4. **Success feedback**: After saving, show a toast: **"Saved to your prayer list"** with a **"View >"** action link navigating to `/my-prayers`. The Save button on that prayer card changes to a checkmark (`Check` icon, Lucide) with "Saved" text (non-clickable, `text-white/50` muted styling). The "Saved" state is tracked in React component state (not localStorage) — it's a session-only convenience indicator.

5. **Auth gating**: The Save button is visible to all users. Clicking it when logged out triggers the auth modal with message: **"Sign in to save prayers to your list."** The inline form does not open for logged-out users.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See Save button | Visible (button renders) | Visible | — |
| Click Save button | Auth modal appears | Inline save form expands | "Sign in to save prayers to your list." |
| Submit save form | N/A — can't open form | Prayer saved to `wr_prayer_list`, toast shown | — |

---

## Integration 3: Bible Highlights to Dashboard Widget

### Current State

Bible highlights (`wr_bible_highlights`) store verse highlights with `bookSlug`, `chapter`, `verse`, `color` (4 options), `text` (verse content), `reference` (e.g., "John 3:16"), and `createdAt`. Bible notes (`wr_bible_notes`) store notes with similar fields plus `noteText`. Neither data source is surfaced outside the Bible reader. The dashboard has a grid of collapsible frosted glass widget cards.

### Requirements

1. **"Recent Highlights" widget**: A new collapsible dashboard widget card, positioned after the Prayer List widget in the grid order. Widget title: **"Recent Highlights"** with a `Highlighter` icon (Lucide).

2. **Content**: Shows the **3 most recent** items from `wr_bible_highlights` and `wr_bible_notes` combined, sorted by `createdAt` descending. Each item displays:
   - Verse text truncated to 1 line (CSS `line-clamp-1`)
   - Reference (e.g., "John 3:16") — `text-sm text-white/60`
   - For highlights: a small colored dot (8px circle) matching the highlight color
   - For notes: a `StickyNote` icon (Lucide, `text-white/40`, 14px)
   - Relative timestamp (e.g., "2 hours ago") using the existing `timeAgo()` utility — `text-xs text-white/40`

3. **Click behavior**: Clicking any item navigates to `/bible/:bookSlug/:chapter#verse-:verseNumber` so the verse scrolls into view in the Bible reader.

4. **"See all" link**: Below the 3 items, a **"See all >"** text link navigates to `/bible` (the "My Highlights & Notes" section at the bottom of the Bible browser). Style: `text-primary-lt text-sm hover:text-primary`.

5. **Empty state**: If the user has no highlights or notes, show: `BookOpen` icon (Lucide, `text-white/30`, 32px), **"Start highlighting as you read"** (text-sm, `text-white/50`), and **"Open Bible >"** link to `/bible` (`text-primary-lt text-sm hover:text-primary`).

6. **Widget styling**: Standard dashboard frosted glass card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`). Collapsible via the existing `DashboardCard` collapse pattern, state persisted in `wr_dashboard_collapsed`.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See widget | N/A — dashboard is auth-gated | Widget renders with highlight/note data | — |
| Click highlight item | N/A | Navigates to Bible chapter with verse anchor | — |
| Click "Open Bible" (empty state) | N/A | Navigates to `/bible` | — |

The dashboard is already fully auth-gated. No additional gating needed.

---

## Integration 4: Verse of the Day to Meditation Link

### Current State

The Verse of the Day appears in two places: a dashboard widget and the Daily Hub hero card. Both show the verse text, reference, and a Share button. There is no connection to meditation. The Scripture Soaking page (`/meditate/soaking`) selects a random verse on mount for the pre-start screen and allows "Try another verse" to shuffle.

### Requirements

1. **"Meditate on this verse" link**: Add a text link below the verse reference on both the dashboard VOTD widget and the Daily Hub hero VOTD card:
   - Text: **"Meditate on this verse >"**
   - Style: `text-primary-lt text-sm hover:text-primary transition-colors`
   - On mobile: the link sits below the reference and above the Share button to maintain vertical card flow.
   - On desktop: same position (below reference, above Share).

2. **Navigation**: Clicking the link navigates to `/meditate/soaking?verse=[encoded verse reference]` — e.g., `/meditate/soaking?verse=John%203%3A16`. The verse reference string (e.g., "John 3:16") is URL-encoded.

3. **Scripture Soaking URL parameter support**: The `ScriptureSoaking` component reads the `?verse` URL parameter on mount:
   - If `?verse` is present: find the matching verse from the soaking verse pool by reference string. If found, use it as the initial soaking verse on the pre-start screen instead of a random verse. If not found (reference doesn't match any verse in the pool), fall back to random selection.
   - If `?verse` is absent: existing random selection behavior unchanged.
   - The "Try another verse" button on the pre-start screen still works — it replaces whatever verse is showing (including a VOTD-loaded one) with a random verse from the pool.

4. **No changes to existing VOTD or soaking behavior** beyond adding the link and accepting the URL parameter.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| See "Meditate on this verse" link on dashboard | N/A — dashboard is auth-gated | Link visible below verse reference | — |
| See "Meditate on this verse" link on Daily Hub | Link visible (Daily Hub is public) | Link visible | — |
| Click the meditation link (Daily Hub, logged out) | Redirects to `/daily?tab=meditate` (meditation sub-pages redirect when logged out) | Navigates to `/meditate/soaking?verse=...` | — |
| Click the meditation link (dashboard) | N/A | Navigates to `/meditate/soaking?verse=...` | — |

Meditation sub-pages already redirect logged-out users. The link on the Daily Hub is visible but will hit the existing meditation auth redirect — this is acceptable behavior (consistent with tapping any meditation card while logged out).

---

## Integration 5: Monthly Report Actionable CTAs

### Current State

The monthly report (`/insights/monthly`, `MonthlyReport` component) shows: days active, faith points earned, mood trend (improved/stable/declined), mood heatmap, activity breakdown chart, and a highlights section. It ends with a share button. There are no suggestions or next-step CTAs based on the data.

### Requirements

1. **"Suggestions for Next Month" section**: Add a new section at the bottom of the monthly report, positioned after the highlights section and before the share button. Section heading: **"Suggestions for Next Month"** with a `Lightbulb` icon (Lucide).

2. **Suggestion generation logic**: Based on the report's data, generate up to **3** personalized CTA cards. Logic rules (evaluated in priority order):

   | Priority | Condition | Suggestion Text | Icon | CTA Text | CTA Link |
   |----------|-----------|----------------|------|----------|----------|
   | 1 (highest) | Mood trend declined this month | "This month was tough. You're not alone." | `Heart` | "Talk to God about it >" + "Find a counselor >" | `/daily?tab=pray` + `/local-support/counselors` |
   | 2 | Meditated fewer than 4 times | "Try meditating more — even 2 minutes helps" | `Brain` | "Start a meditation >" | `/daily?tab=meditate` |
   | 3 | Journaled fewer than 4 times | "Writing helps process emotions — try journaling this week" | `PenLine` | "Open journal >" | `/daily?tab=journal` |
   | 4 | No gratitude entries this month | "Try gratitude — it's linked to better mood" | `Sparkles` | "Start today >" | `/` (dashboard, scrolls to gratitude widget via `#gratitude`) |
   | 5 | Completed a reading plan this month | "You finished [Plan Name]! Ready for another?" | `BookOpen` | "Browse plans >" | `/grow?tab=plans` |
   | 6 (lowest) | Mood trend improved this month | "Your mood improved this month! Here's what worked:" + list of top 3 most-done activities | `TrendingUp` | "Keep it up!" (no link, just encouragement) | — |

   **Priority 1** (mood decline) always takes a slot if applicable — connecting struggling users to prayer and professional support is the most important suggestion. Remaining slots filled by priorities 2-6 in order. Maximum 3 cards shown.

3. **Suggestion card styling**: Each card uses frosted glass styling: `bg-white/[0.08] border border-white/10 rounded-xl p-4`. Content layout: icon (Lucide, 20px, `text-white/60`) top-left, suggestion text (white, text-sm), CTA link(s) below (`text-primary-lt text-sm hover:text-primary`). Cards stack vertically with `gap-3`.

4. **Mood decline dual-CTA**: The mood decline suggestion card is unique in having two CTA links. Both appear on separate lines within the card. The counselor link specifically connects data-driven emotional insight to professional support — this is intentional and important.

5. **Activity count sources**: Meditation count from `wr_meditation_history` (filter by month). Journal count from saved journal entries (filter by month). Gratitude entries from `wr_gratitude_entries` (filter by month). Reading plan completions from `wr_reading_plan_progress` (check `completedAt` dates). Mood trend from the existing trend calculation in the monthly report.

6. **"What worked" list** (priority 6): If mood improved, show the user's top 3 most-done activity types this month (e.g., "Prayer (12 times), Meditation (8 times), Journaling (5 times)"). Activity counts sourced from `wr_daily_activities` for the month.

7. **No suggestions fallback**: If none of the conditions match (unlikely but possible — e.g., the user did everything consistently and mood was stable), do not show the section at all. The section heading and cards only render when at least 1 suggestion exists.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View monthly report | N/A — `/insights/monthly` is auth-gated | Report renders with suggestions section | — |
| Click suggestion CTA | N/A | Navigates to respective route | — |

The monthly report is already fully auth-gated. No additional gating needed.

---

## Responsive Behavior

| Breakpoint | Int. 1 (Prayer Insights) | Int. 2 (Save to Prayers) | Int. 3 (Highlights Widget) | Int. 4 (VOTD Meditation) | Int. 5 (Report CTAs) |
|-----------|-------------------------|-------------------------|---------------------------|-------------------------|---------------------|
| Mobile (< 640px) | Stats stack vertically; correlation card full-width; category bar full-width | Save button icon-only (no text); inline form full-width below card | Widget full-width in dashboard grid; items stack with truncated text | Link below reference, above Share button | Suggestion cards stack full-width |
| Tablet (640-1024px) | Stats side-by-side; cards full-width | Save button with icon + "Save" text; inline form full-width | Widget takes 1 column of dashboard grid | Same as mobile | Same as mobile |
| Desktop (> 1024px) | Stats side-by-side; cards in natural flow of insights page | Same as tablet | Widget takes 1 column of dashboard grid | Same as mobile (VOTD widget is single-column) | Same as mobile (report is centered column) |

All five integrations are additions to existing responsive layouts. No new breakpoint-specific behavior beyond what the host components already handle.

---

## AI Safety Considerations

N/A — None of these integrations involve AI-generated content or free-text user input. All content is derived from existing stored data (prayer list entries, Bible highlights, mood entries, activity counts) and system-generated text (stats, labels, suggestion copy). No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Cannot trigger any of these integrations. Integrations 1, 3, and 5 live on auth-gated pages. Integration 2 shows the button but gates the action with the auth modal. Integration 4's Daily Hub link is visible but the destination (meditation) redirects when logged out.
- **Logged-in users:** All data read from existing localStorage keys. One new field added to prayer list items (`sourceType`, `sourceId`), but no new localStorage keys.
- **Existing keys used:** `wr_prayer_list`, `wr_mood_entries`, `wr_bible_highlights`, `wr_bible_notes`, `wr_dashboard_collapsed`, `wr_meditation_history`, `wr_gratitude_entries`, `wr_reading_plan_progress`, `wr_daily_activities`
- **New localStorage keys:** None.

---

## Completion & Navigation

N/A — standalone integration batch. No Daily Hub completion tracking affected.

---

## Design Notes

- **Frosted glass cards** (Integrations 1, 3, 5): `bg-white/[0.08] border border-white/10 rounded-xl p-4` for insights cards; standard `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` for the dashboard widget — matches the Dashboard Card Pattern from the design system recon.
- **Correlation card pattern** (Integration 1): Matches existing gratitude/meditation correlation cards on `/insights` — frosted glass, icon, correlation text, sample size note. Use the same component or follow the same structure.
- **Inline expansion pattern** (Integration 2): Matches the comment section expansion on Prayer Wall cards — height transition, same container styling. Not a modal.
- **Text link styling** (Integrations 3, 4): `text-primary-lt text-sm hover:text-primary transition-colors` — consistent with link patterns in Batches 1 and 2.
- **Dashboard widget** (Integration 3): Uses the existing `DashboardCard` component with collapse behavior. Position in grid after Prayer List widget. Colored dot for highlights uses the 4 highlight colors already defined in the Bible reader.
- **Suggestion cards** (Integration 5): Frosted glass with icon + text + CTA link. Intentionally simple — one visual pattern, repeated up to 3 times. No animations or transitions beyond hover state.
- **Category bar** (Integration 1): Small horizontal stacked bar (8-12px height, rounded-full) with distinct muted colors per category. Keep it subtle — it's supporting information, not a data visualization feature.
- Design system recon (`_plans/recon/design-system.md`) is referenced for color values and spacing patterns.
- No new visual patterns introduced — all elements reuse existing card, link, and correlation patterns.

---

## Out of Scope

- Real-time sync between Prayer Wall save and prayer list updates (save is a one-time copy, not a live link)
- Deep linking from the highlights widget to a specific highlight/note within the Bible reader's "My Highlights & Notes" section (navigates to `/bible` generally)
- Verse of the Day integration with other meditation types beyond Scripture Soaking
- AI-generated suggestions in the monthly report (all suggestion logic is rule-based from activity counts and mood trend)
- Push notifications for monthly report availability or suggestion reminders
- Backend API for any of these calculations (all client-side localStorage)
- Dark mode variants of the new UI elements (Phase 4)
- Animated transitions for the prayer insights section or highlights widget beyond standard card rendering

---

## Acceptance Criteria

### Integration 1: Prayer List to Insights Correlations
- [ ] "Prayer Life" section appears on `/insights` page after the existing activity correlations section
- [ ] Section heading shows "Prayer Life" with `HandHeart` icon
- [ ] Stat card displays active prayer count, answered prayer count, and answer rate percentage ("X of Y prayers answered — Z%")
- [ ] Stats are side-by-side on desktop/tablet, stacked vertically on mobile
- [ ] Mood correlation card shows "On days you prayed for your prayer list, your mood averaged X.X" with correct calculation from `prayedAt` dates cross-referenced with `wr_mood_entries`
- [ ] Mood correlation card only appears when 5+ matching data points exist
- [ ] Category breakdown shows "You pray most about [top category]" with a horizontal bar of category distribution
- [ ] Category breakdown only appears when user has 3+ prayers total
- [ ] All cards use frosted glass styling matching existing correlation cards

### Integration 2: Prayer Wall Save to My Prayers
- [ ] Save button appears in the `InteractionBar` on every `PrayerCard` in the Prayer Wall feed
- [ ] Desktop: `Plus` icon + "Save" text; Mobile: `Plus` icon only
- [ ] Clicking Save (logged in) opens an inline expandable form below the prayer card (not a modal)
- [ ] Form has pre-filled title input (first 100 chars of prayer content, editable)
- [ ] Form has 8 category pill buttons, pre-selected to match prayer's category or "Other"
- [ ] "Save to My Prayers" button creates entry in `wr_prayer_list` with `sourceType: "prayer_wall"` and `sourceId` referencing the prayer wall post ID
- [ ] Success toast shows "Saved to your prayer list" with "View >" link to `/my-prayers`
- [ ] Save button changes to checkmark with "Saved" text after successful save (session only, not persisted)
- [ ] Clicking Save when logged out triggers auth modal: "Sign in to save prayers to your list."

### Integration 3: Bible Highlights to Dashboard Widget
- [ ] "Recent Highlights" widget appears on dashboard after the Prayer List widget in grid order
- [ ] Widget title shows "Recent Highlights" with `Highlighter` icon
- [ ] Widget displays the 3 most recent items from `wr_bible_highlights` and `wr_bible_notes` combined, sorted by `createdAt`
- [ ] Each item shows: truncated verse text (1 line), reference, colored dot (highlight) or `StickyNote` icon (note), relative timestamp
- [ ] Clicking an item navigates to `/bible/:bookSlug/:chapter#verse-:verseNumber`
- [ ] Empty state shows `BookOpen` icon, "Start highlighting as you read" text, and "Open Bible >" link to `/bible`
- [ ] "See all >" link below items navigates to `/bible`
- [ ] Widget uses standard dashboard frosted glass card styling and is collapsible

### Integration 4: Verse of the Day to Meditation Link
- [ ] "Meditate on this verse >" link appears below the verse reference on the dashboard VOTD widget
- [ ] "Meditate on this verse >" link appears below the verse reference on the Daily Hub hero VOTD card
- [ ] Link styling: `text-primary-lt text-sm hover:text-primary transition-colors`
- [ ] On mobile, the link sits below the reference and above the Share button
- [ ] Clicking the link navigates to `/meditate/soaking?verse=[encoded reference]`
- [ ] `ScriptureSoaking` component reads `?verse` URL parameter and uses the matching verse as the initial soaking verse
- [ ] If `?verse` doesn't match any verse in the pool, falls back to random selection
- [ ] "Try another verse" button still works to replace the VOTD-loaded verse with a random one
- [ ] Logged-out users clicking the Daily Hub link are redirected by the existing meditation auth gate

### Integration 5: Monthly Report Actionable CTAs
- [ ] "Suggestions for Next Month" section appears on `/insights/monthly` after highlights and before the share button
- [ ] Section heading shows "Suggestions for Next Month" with `Lightbulb` icon
- [ ] Mood decline suggestion takes priority and always fills a slot when applicable, with two CTA links (prayer + counselor)
- [ ] Low meditation count (< 4) generates a "Try meditating more" suggestion with link to `/daily?tab=meditate`
- [ ] Low journal count (< 4) generates a "Writing helps process emotions" suggestion with link to `/daily?tab=journal`
- [ ] No gratitude entries generates a "Try gratitude" suggestion with link to dashboard
- [ ] Completed reading plan generates a celebration suggestion with link to `/grow?tab=plans`
- [ ] Improved mood generates a "Here's what worked" suggestion listing top 3 activities
- [ ] Maximum 3 suggestions shown, prioritized by defined order
- [ ] Each suggestion card uses frosted glass styling (`bg-white/[0.08] border border-white/10 rounded-xl p-4`)
- [ ] Section does not render if no suggestions apply

### General
- [ ] All five integrations are for logged-in users only (except Integration 2's button visibility and Integration 4's Daily Hub link visibility)
- [ ] No new localStorage keys introduced
- [ ] No existing feature behavior changed beyond the specified additions
- [ ] All integrations are responsive (mobile, tablet, desktop)
