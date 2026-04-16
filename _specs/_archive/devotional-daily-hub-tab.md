# Feature: Merge Devotional into Daily Hub as First Tab

## Overview

The daily devotional currently lives at `/devotional` as a standalone page with its own hero, date navigation, and full-page layout. While complete and functional, this separation creates a disconnected daily experience — users must leave the Daily Hub to read the devotional, then return to pray, journal, or meditate.

This spec merges the devotional into the Daily Hub as the **first tab**, creating a natural daily flow: **Devotional → Pray → Journal → Meditate**. This matches how Glorify, Hallow, and other leading Christian wellness apps structure their daily experience — devotional content first, then interactive spiritual practices.

By making the devotional the default tab (what users see when they land on `/daily`), Worship Room establishes a reading-first daily rhythm: receive God's word, then respond through prayer, journaling, or meditation. The cross-tab CTAs at the bottom of the devotional ("Journal about this →", "Pray about today's reading →") create a natural flow from receiving to responding.

This is the **first of 4 architecture and navigation specs** that restructure the app's information architecture for a cleaner, more intuitive user experience.

---

## User Stories

- As a **logged-out visitor**, I want to read today's devotional right on the Daily Hub so that I can start my spiritual practice immediately without navigating to a separate page.
- As a **logged-in user**, I want the Daily Hub to default to the devotional tab so that my daily experience begins with Scripture-grounded reading before moving to prayer, journaling, or meditation.
- As a **logged-in user**, I want to tap "Journal about this" after reading the devotional so that I can seamlessly reflect on what I just read without context-switching to a different page.
- As any user, I want my scroll position preserved when I switch between tabs so that I don't lose my place if I pause reading the devotional to quickly check the Pray or Journal tab.
- As any user who has bookmarked `/devotional`, I want the old URL to redirect me to the right place so that my bookmarks still work.

---

## Requirements

### 1. Daily Hub Tab Bar — Expand to 4 Tabs

#### 1.1 New Tab Order

The Daily Hub tab bar changes from 3 tabs to 4:

| Position | Tab | Icon | Query Param |
|----------|-----|------|-------------|
| 1 | Devotional | Lucide `BookOpen` | `?tab=devotional` |
| 2 | Pray | Lucide `Heart` | `?tab=pray` |
| 3 | Journal | Lucide `PenLine` | `?tab=journal` |
| 4 | Meditate | Lucide `Wind` | `?tab=meditate` |

#### 1.2 Default Tab Change

- When users navigate to `/daily` with **no tab parameter**, the Devotional tab is selected (was previously Pray).
- All explicit tab links (`?tab=pray`, `?tab=journal`, `?tab=meditate`) continue to work as before.
- The `isValidTab` function updates to include `'devotional'` as a valid value.

#### 1.3 Mobile Tab Bar Responsiveness (4 tabs)

- **Above 400px**: All 4 tabs display with icon + text label.
- **Below 400px**: Tabs display as icon-only (no text label) to prevent text overflow. The first tab uses the shorter label "Devos" when text is shown, to save horizontal space.
- The tab bar remains sticky on scroll with the existing frosted glass treatment.
- The animated underline indicator continues to slide between all 4 tabs.
- Tab touch targets remain at least 44px.

### 2. DevotionalTabContent — New Tab Content Component

#### 2.1 Content (moved from DevotionalPage)

Create a new `DevotionalTabContent` component following the same pattern as `PrayTabContent`, `JournalTabContent`, and `MeditateTabContent`. Move all devotional content rendering from the standalone `DevotionalPage` into this tab content component:

- **Date navigation** — left/right arrow buttons at the top of the tab content area (not in the hero). Browse back up to 7 days. Right arrow disabled when viewing today. Left arrow disabled at 7 days ago. Same `?day=` URL param behavior.
- **Devotional title** — bold, white text, centered or left-aligned to match the tab content patterns.
- **Theme tag pill** — small pill displaying the devotional's theme (e.g., "Trust", "Gratitude").
- **Inspiring quote** — Lora italic with large decorative quotation marks, attribution below.
- **Scripture passage** — reference label, verse text in Lora italic with inline verse numbers.
- **Reflection paragraphs** — Inter body text, comfortable line height, warm second-person voice.
- **Closing prayer** — "Closing Prayer" label, Lora italic text.
- **Reflection question** — frosted glass callout card with "Something to think about today:" prefix.

#### 2.2 Heading Pattern

Following the existing convention where each tab has a distinctive heading with a Caveat-highlighted word:
- Pray: "What's On Your **Heart?**"
- Journal: "What's On Your **Mind?**"
- Meditate: "What's On Your **Spirit?**"
- Devotional: "What's On Your **Soul?**" (new)

The Devotional tab should follow the same heading pattern — a large heading with the Caveat script-font highlighted word, plus the `BackgroundSquiggle` decorative SVG and `SQUIGGLE_MASK_STYLE` fade mask, matching the other 3 tabs.

#### 2.3 Date Navigation Position

The date navigation (left/right arrows flanking the formatted date) sits at the top of the tab content area, below the heading and above the devotional title. When browsing to a previous day, only the tab content updates — the Daily Hub hero always shows today's verse and today's devotional teaser card.

#### 2.4 Tab Content Mounting

The devotional tab content is mounted but CSS-hidden when not active (`hidden` attribute), same as the other 3 tabs. This preserves state when switching between tabs — if the user reads halfway through the devotional, switches to Pray, then switches back, their scroll position and any in-progress state are preserved.

#### 2.5 Related Reading Plan Callout

The existing `RelatedPlanCallout` component from the standalone DevotionalPage should be carried over into the tab content, appearing in the same relative position (after the reflection question, before the action CTAs).

### 3. Reading Completion Tracking

#### 3.1 Scroll-to-Bottom Completion

When the user scrolls to the bottom of the devotional content (Intersection Observer on the reflection question section), mark today's devotional as read in `wr_devotional_reads`. Same mechanism as the standalone page — only fires for today's devotional (not past days), only for logged-in users.

#### 3.2 Hero Devotional Card Update

The completion checkmark in the Daily Hub hero's devotional card updates immediately when the user finishes reading. No page reload required — the state change propagates via shared React state or a re-read of localStorage.

#### 3.3 Dashboard Activity Tracking

Devotional completion should integrate with the existing activity tracking system. The `recordActivity('devotional')` call should fire when the devotional is marked as read (if not already tracked). This ensures the dashboard activity checklist reflects devotional reading.

### 4. Cross-Tab CTAs

At the bottom of the devotional tab content (below the reflection question card and Related Plan Callout), show two CTAs that encourage the natural flow from reading to reflection:

- **"Journal about this →"** — Switches to the Journal tab with the devotional theme as context. The Journal tab receives the devotional title or theme as a prompt suggestion (via the existing context-passing mechanism between tabs).
- **"Pray about today's reading →"** — Switches to the Pray tab with the devotional scripture reference as context. The Pray tab can use this to pre-fill a prayer starter (e.g., "I'm reflecting on [passage reference]...").

These CTAs follow the same visual pattern as existing cross-tab CTAs (e.g., "Journal about this →" on the Pray tab).

### 5. Route Redirect

#### 5.1 `/devotional` Becomes a Redirect

Add a redirect from `/devotional` to `/daily?tab=devotional`, following the same pattern as `/pray` → `/daily?tab=pray`. The redirect should preserve the `?day=` query param if present (e.g., `/devotional?day=-3` → `/daily?tab=devotional&day=-3`).

#### 5.2 Remove Standalone DevotionalPage Route

After the redirect is in place, remove the standalone `DevotionalPage` route definition from the router. The `DevotionalPage` component can be removed or kept at implementation discretion — it is no longer rendered by any route.

### 6. Link Updates

#### 6.1 Hero Devotional Card

The Daily Hub hero's devotional card (from the hero redesign spec) currently navigates to `/devotional`. After this spec, clicking the card switches to the Devotional tab within the same page — smooth, no navigation. This is an in-page tab switch, not a route change.

#### 6.2 Navbar Link

The existing "Daily Devotional" navbar link currently points to `/devotional`. Update its target to `/daily?tab=devotional`. The link itself is not removed in this spec (formal removal happens in a later navbar consolidation spec), but it should work correctly.

#### 6.3 All Other Links

Any other links to `/devotional` throughout the app (dashboard widget, landing page CTAs, cross-feature links, mood recommendations, seasonal banner) should be updated to point to `/daily?tab=devotional`.

### 7. CLAUDE.md Route Table Update

The route table entry for `/devotional` changes from "Built" to "Redirect → /daily?tab=devotional".

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| View devotional tab content (any day) | Visible, no restrictions | Visible, no restrictions |
| Browse days (arrows) | Works, no restrictions | Works, no restrictions |
| Read Aloud (if carried over from standalone) | Works, no restrictions | Works, no restrictions |
| Reading completion tracking | Does NOT fire — no localStorage write | Fires on scroll-to-bottom of today's devotional |
| Hero devotional checkmark | Never shows | Shows if today's date is in `wr_devotional_reads` |
| "Journal about this →" CTA | Switches to Journal tab (Journal handles its own auth gating on save) | Same — switches to Journal tab |
| "Pray about today's reading →" CTA | Switches to Pray tab (Pray handles its own auth gating on generate) | Same — switches to Pray tab |
| Share (if carried over from standalone) | Copies link, shows toast — works for all | Same |
| Tab bar — Devotional tab | Visible, clickable | Same |

### Persistence

- **No new localStorage keys** introduced. Uses existing `wr_devotional_reads` (array of date strings, max 365).
- **No new data writes** beyond the existing completion tracking mechanism (moved from standalone page to tab).
- **Route type**: Public (`/daily`). No auth required to view any tab including Devotional.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. The devotional tab displays curated, hardcoded content — no user text input.
- **User input involved?**: No. All content (quotes, passages, reflections, prayers, questions) is pre-authored.
- **AI-generated content?**: No. All devotional text is hardcoded from the existing devotional data pool.
- **Theological boundaries**: The existing devotional content already adheres to the theological boundary rules in `01-ai-safety.md`. No content changes in this spec.

---

## UX & Design Notes

### Emotional Tone

The devotional tab should preserve the contemplative, unhurried feel of the standalone page — this is a reading experience, not a quick interaction. The tab format should not make the devotional feel rushed or compressed. Generous spacing, comfortable typography, and the same section-by-section visual flow.

### Design System References

- **Tab content container**: Same `max-w-2xl` centered column with `BackgroundSquiggle`, matching all other tabs.
- **Heading**: "What's On Your **Soul?**" using the existing pattern — Inter for "What's On Your", Caveat script for "Soul?" in `text-primary` purple.
- **Date navigation arrows**: Same styling from the standalone page — `text-white/40 hover:text-white/70`, Lucide `ChevronLeft`/`ChevronRight`, with 44px touch targets.
- **Quote section**: Lora italic with decorative quotation marks, matching standalone page.
- **Passage section**: Lora italic with `text-white/30` inline verse numbers, matching standalone page.
- **Reflection**: Inter body `text-white/80 leading-relaxed`, matching standalone page.
- **Prayer**: "Closing Prayer" label + Lora italic, matching standalone page.
- **Reflection question card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`, matching standalone page and dashboard card pattern.
- **Cross-tab CTAs**: Follow the existing CTA pattern from the Pray tab ("Journal about this →") — link-style text in `text-primary-lt` with right arrow icon.
- **Theme tag pill**: `bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/50`, matching the hero devotional card pill.

### Tab Bar — 4-Tab Mobile Treatment

The 4-tab layout on mobile is tighter than the current 3-tab layout. The responsive approach:

- **≥ 400px**: Icon + label for all tabs. "Devotional" is shortened to "Devos" to match the shorter labels of "Pray", "Journal", "Meditate".
- **< 400px**: Icon-only for all 4 tabs. Each icon (`BookOpen`, `Heart`, `PenLine`, `Wind`) is recognizable at icon-only size. The active tab's icon has the purple underline indicator.
- The sticky frosted glass treatment, shadow-on-scroll behavior, and sliding underline animation all continue to work with 4 tabs.

### New Visual Patterns

None — this spec reuses existing patterns exclusively. The devotional content layout, tab content container pattern, cross-tab CTAs, and frosted glass callout card all exist in the current app. The only change is WHERE the devotional renders.

### Design System Recon Reference

Reference `_plans/recon/design-system.md` for:
- **Inner Page Hero** gradient pattern (the hero remains unchanged)
- **Daily Hub tab content** max-width (`672px` / `max-w-2xl`)
- **Tab bar** styling and behavior (extended from 3 to 4 tabs)
- **Highlighted Script Word** pattern (Caveat, `text-primary`, for the "Soul?" heading word)

---

## Responsive Behavior

### Mobile (< 640px)

- **Tab bar**: 4 tabs spanning full width. Below 400px: icon-only. Above 400px: icon + short label ("Devos", "Pray", "Journal", "Meditate"). Sticky with frosted glass.
- **Date navigation**: Arrows flanking the date, full-width layout within `px-4` padding. 44px touch targets on arrows.
- **Devotional content**: Full-width with `px-4` side padding. Quote is `text-xl`. Passage, reflection, prayer are `text-base`. Reflection question card is `p-4` with full width.
- **Cross-tab CTAs**: Stacked vertically, full-width.
- **Swipe navigation** for day browsing: Same left/right swipe behavior from the standalone page should be preserved if technically feasible within the tab structure (swipe for day browsing, not tab switching).

### Tablet (640px – 1024px)

- **Tab bar**: 4 tabs with icon + label, comfortable spacing.
- **Devotional content**: `max-w-2xl` centered. Quote is `text-2xl`. Cross-tab CTAs displayed inline/horizontal.
- **Date navigation**: Centered with arrows, adequate spacing.

### Desktop (> 1024px)

- **Tab bar**: 4 tabs with icon + label, generous spacing within the content width.
- **Devotional content**: `max-w-2xl mx-auto` — optimal reading width. All sections with comfortable spacing.
- **Cross-tab CTAs**: Horizontal row, centered.
- **No swipe navigation** (arrows only for day browsing).

---

## Edge Cases

- **Day browsing within tab**: Browsing days only updates the devotional tab content. The hero always shows today's verse and devotional teaser. Other tabs are unaffected.
- **`?day=` param with other tabs**: If the URL is `/daily?tab=pray&day=-3`, the `day` param is ignored by the Pray tab. It only affects the Devotional tab. When the user switches to the Devotional tab, it shows the devotional from 3 days ago.
- **Context passing to Journal/Pray**: The "Journal about this →" CTA should pass the devotional's theme or title as context. If the user has browsed to a past day's devotional, the CTA passes THAT day's devotional context, not today's.
- **Tab switch preserves scroll**: If the user scrolls halfway through the devotional, switches to Pray, then returns, their scroll position within the Devotional tab is preserved (because the tab content is mounted but hidden, not unmounted).
- **Reading completion fires only for today**: Same rule as standalone — scrolling to the bottom of a past day's devotional does NOT fire completion. Only today (day=0 or no day param).
- **Redirect with day param**: `/devotional?day=-3` should redirect to `/daily?tab=devotional&day=-3`.
- **Back button behavior**: After being redirected from `/devotional` to `/daily?tab=devotional`, the browser back button should go to the page BEFORE `/devotional`, not loop between redirect and destination.
- **Swipe conflict**: On mobile, swiping left/right for day browsing should not conflict with tab switching. Day browsing swipe should only activate within the devotional tab content area, not on the tab bar.

---

## Acceptance Criteria

### Tab Bar — 4 Tabs

- [ ] Daily Hub tab bar displays 4 tabs in order: Devotional (BookOpen icon), Pray (Heart), Journal (PenLine), Meditate (Wind)
- [ ] Navigating to `/daily` with no tab param defaults to the Devotional tab (not Pray)
- [ ] `/daily?tab=devotional` selects the Devotional tab
- [ ] `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` continue to work as before
- [ ] The animated underline indicator slides correctly across all 4 tabs
- [ ] Tab touch targets are at least 44px on mobile

### Tab Bar — Mobile Responsiveness

- [ ] At 375px width (or below 400px), all 4 tabs show icon-only with no text label
- [ ] At 414px width (or above 400px), all 4 tabs show icon + short text label ("Devos", "Pray", "Journal", "Meditate")
- [ ] The tab bar remains sticky on scroll with frosted glass treatment
- [ ] No horizontal overflow or text truncation in the tab bar at any tested width (375px, 390px, 414px, 768px, 1440px)

### Devotional Tab Content

- [ ] Devotional tab displays the heading pattern with Caveat-highlighted script word, matching other tabs
- [ ] Today's devotional title displays in bold white text
- [ ] Theme tag pill displays below the title
- [ ] Quote section renders in Lora italic with decorative quotation marks and attribution
- [ ] Scripture passage renders with reference label, Lora italic verse text, and `text-white/30` verse numbers
- [ ] Reflection paragraphs render in Inter body text with comfortable line height
- [ ] Closing prayer renders with "Closing Prayer" label in Lora italic
- [ ] Reflection question renders in a frosted glass callout card (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Content column is `max-w-2xl` centered, matching other tabs
- [ ] BackgroundSquiggle decorative SVG and fade mask are present, matching other tabs

### Date Navigation

- [ ] Left/right arrow buttons flank the date at the top of the devotional tab content
- [ ] Left arrow navigates to the previous day's devotional
- [ ] Right arrow navigates to the next day's devotional
- [ ] Right arrow is disabled when viewing today (day=0 or no param)
- [ ] Left arrow is disabled at 7 days ago (day=-7)
- [ ] Arrows use `text-white/40 hover:text-white/70` styling, disabled arrows use `text-white/15`
- [ ] Browsing days updates only the devotional tab content — hero always shows today's content

### Reading Completion

- [ ] Intersection Observer fires when the reflection question section scrolls into view for today's devotional
- [ ] Logged-in users: today's date is added to `wr_devotional_reads` in localStorage
- [ ] Logged-out users: no localStorage write occurs
- [ ] Only fires for today's devotional (day=0), not past days
- [ ] Hero devotional card checkmark updates immediately upon completion (no reload)
- [ ] Re-reading today's devotional does not create duplicate entries

### Cross-Tab CTAs

- [ ] "Journal about this →" CTA appears below the devotional content
- [ ] Clicking "Journal about this →" switches to the Journal tab with devotional context
- [ ] "Pray about today's reading →" CTA appears below the devotional content
- [ ] Clicking "Pray about today's reading →" switches to the Pray tab with devotional scripture as context
- [ ] CTA styling matches existing cross-tab CTA patterns (link-style text with arrow)
- [ ] Both CTAs work for logged-out and logged-in users (target tabs handle their own auth gating)

### Route Redirect

- [ ] `/devotional` redirects to `/daily?tab=devotional`
- [ ] `/devotional?day=-3` redirects to `/daily?tab=devotional&day=-3`
- [ ] Browser back button after redirect goes to the page before `/devotional`, not back to the redirect
- [ ] The standalone `DevotionalPage` route is no longer in the router

### Link Updates

- [ ] Hero devotional card click switches to the Devotional tab (in-page, no navigation)
- [ ] Navbar "Daily Devotional" link points to `/daily?tab=devotional`
- [ ] Dashboard devotional widget link points to `/daily?tab=devotional`
- [ ] All other internal links to `/devotional` are updated to `/daily?tab=devotional`

### Tab State Preservation

- [ ] Switching from Devotional to Pray and back preserves scroll position in the Devotional tab
- [ ] Devotional tab content is mounted but CSS-hidden when not active (same `hidden` attribute pattern as other tabs)
- [ ] Partially-read devotional content remains in the same scroll position after tab switch

### Responsive — Devotional Content

- [ ] At 375px (mobile): Full-width content, `px-4` padding, `text-xl` quote, stacked CTAs, swipe for day browsing
- [ ] At 768px (tablet): `max-w-2xl` centered, `text-2xl` quote, horizontal CTAs
- [ ] At 1440px (desktop): `max-w-2xl` centered, generous spacing, no swipe (arrows only)

### Accessibility

- [ ] All devotional text meets WCAG AA contrast on the dark background
- [ ] Day navigation arrows are keyboard-accessible with visible focus indicators
- [ ] Arrow buttons have descriptive `aria-label` (e.g., "Previous day's devotional", "Next day's devotional")
- [ ] Disabled arrows have `aria-disabled="true"`
- [ ] Cross-tab CTAs are keyboard-accessible
- [ ] Tab bar supports keyboard navigation (arrow keys to switch between tabs)
- [ ] Active tab is indicated to screen readers (e.g., `aria-selected="true"`)
- [ ] Devotional tab panel has `role="tabpanel"` with `aria-labelledby` linking to its tab
- [ ] All interactive elements meet 44px minimum touch target on mobile

### No Regressions

- [ ] Pray, Journal, and Meditate tab content and behavior are unchanged
- [ ] Hero content (verse card + devotional card) remains unchanged
- [ ] SongPickSection, StartingPointQuiz, and SiteFooter remain unchanged
- [ ] All existing completion tracking (pray, journal, meditate) continues to work
- [ ] All existing tests pass (update assertions for tab count change and default tab change)

---

## Out of Scope

- **Devotional content changes** — No changes to the 30 devotional entries, their text, themes, quotes, or passages. Only WHERE the content renders changes.
- **Date navigation logic changes** — The 7-day browse-back, day-of-year rotation, and URL param behavior are unchanged. Only the visual position moves (from hero to tab content area).
- **Reading completion mechanism changes** — The Intersection Observer, `wr_devotional_reads` storage format, and completion rules are unchanged. Only the component that fires the observer changes.
- **Navbar link removal** — The "Daily Devotional" navbar link stays (target updated to `/daily?tab=devotional`). Formal removal is a later navbar consolidation spec.
- **Tab bar visual redesign** — The tab bar retains its current styling (frosted glass, sticky, animated underline). Only the number of tabs changes from 3 to 4.
- **New animations** — No new animations introduced.
- **Backend API** — Entirely frontend. No API changes.
- **Seasonal devotional pool expansion** — The 20 seasonal devotionals mentioned in CLAUDE.md are not modified.
- **Action buttons (Share, Read Aloud)** — These existed on the standalone page. Whether they are carried into the tab content or omitted is an implementation decision based on the tab content pattern. The cross-tab CTAs ("Journal about this", "Pray about today's reading") are required; the standalone page's Share and Read Aloud buttons are optional.
- **Swipe gesture for tab switching** — This spec only requires swipe for day browsing within the Devotional tab, not swiping between tabs.
