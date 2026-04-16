# Feature: Cross-Feature Integration Batch 1

**Master Plan Reference:** N/A — standalone integration batch connecting existing features.

---

## Overview

Worship Room's features are individually strong but currently feel siloed — a user reads a Bible verse in a devotional but can't tap it to read the full chapter, a person in crisis sees hotline numbers but not the counselor locator two clicks away, gratitude practice never surfaces in mood insights, and visiting a local church doesn't celebrate the step of faith with points or a badge. This spec bridges four high-impact gaps that make the app feel like one cohesive healing journey instead of separate tools.

## User Stories

- As a **user** (logged in or out), I want every Bible verse reference displayed in the app to be a clickable link so that I can read the full passage in context without hunting for it.
- As a **user in crisis**, I want to see a "Find a counselor near you" link alongside the crisis hotlines so that I can take a concrete next step toward professional help.
- As a **logged-in user**, I want my gratitude practice to appear in my mood insights so that I can see how counting blessings affects my emotional well-being.
- As a **logged-in user**, I want to earn faith points and a badge when I visit local support locations so that my real-world faith steps are celebrated alongside my digital ones.

---

## Integration 1: Universal Verse Linking

### Current State

`parseVerseReferences()` utility exists at `lib/parse-verse-references.ts`. `LinkedAnswerText` component exists at `components/ask/LinkedAnswerText.tsx` and is used on the `/ask` page to make inline verse references clickable. The verse cards in Ask responses already link to `/bible/:book/:chapter#verse-:verseStart`. **This integration is already complete on `/ask`.**

### What's Missing

Verse references appear as plain, unlinked text in these locations:

1. **Devotional tab** (`DevotionalTabContent`) — The scripture passage reference header (e.g., "PROVERBS 3:5-6") is styled `text-xs font-medium uppercase tracking-widest text-primary-lt` but is not a link.
2. **Verse of the Day banner** (`VerseOfTheDayBanner`) — The reference below the verse text (e.g., "— Psalm 34:18") is plain text in `text-white/40`.
3. **Mood check-in encouragement verse** — The verse reference shown after mood selection (e.g., "Psalm 34:18") is not linked.
4. **Reading plan daily scripture references** — Scripture references in reading plan day content are plain text.
5. **Landing page Verse of the Day section** — Same verse reference as the banner, unlinked.

### Requirements

1. Extract `LinkedAnswerText` into a shared, reusable component (or make the existing one the canonical import path for all consumers). The component wraps any text containing Bible references, parsing them with `parseVerseReferences()` and rendering matches as `<Link>` elements to `/bible/:book/:chapter#verse-:verseStart`.
2. Apply `LinkedAnswerText` (or a lightweight `VerseLink` single-reference component) to all 5 locations listed above. For locations that display a single known reference (devotional header, Verse of the Day, mood verse), a simpler single-reference link component that takes `{ reference: string }` and outputs a `<Link>` may be more appropriate than parsing free text.
3. Link styling: `text-primary-lt hover:text-primary hover:underline transition-colors` — consistent with the existing Ask page links. For locations where the reference text uses a different base color (e.g., `text-white/40` on Verse of the Day), apply `hover:text-primary hover:underline` while keeping the base color contextual. The link must be visually distinguishable from surrounding non-interactive text.
4. All links navigate to `/bible/:book/:chapter#verse-:verseStart`. For verse ranges (e.g., "Romans 8:28-30"), link to the first verse.
5. If the Bible reader doesn't have content for the referenced chapter, the link still navigates — the Bible reader handles missing content gracefully.
6. The `parseVerseReferences` utility handles: single verses (John 3:16), verse ranges (Romans 8:28-30), numbered books (1 Corinthians, 2 Timothy), books with spaces (Song of Solomon), and the Psalm/Psalms alias. No changes needed to the parser — it already covers all these cases.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Click verse link | Navigates to Bible reader (public route) | Same — navigates to Bible reader |

No auth gating needed. The Bible reader is a public route.

---

## Integration 2: Crisis Banner Counselor CTA

### Current State

`CrisisBanner` displays 3 crisis resources (988, Crisis Text Line, SAMHSA) in an `warning/10` background with `warning/30` border. It appears whenever `containsCrisisKeyword(text)` returns true, on the Pray tab, Journal tab, Mood check-in, Prayer Wall composer, and Comment input.

### Requirements

1. Add a fourth item below the three hotline resources: **"Find a counselor near you →"** linking to `/local-support/counselors`.
2. This is a standard React Router `<Link>`, not a `tel:` link.
3. Styling: Use `text-primary font-semibold underline` to match the existing hotline link styling (the 988 and SAMHSA phone links already use `font-semibold text-primary underline`). This ensures visual consistency within the banner and meets WCAG AA contrast on the `warning/10` (light orange/amber) background.
4. The link appears on **every** CrisisBanner instance — since it's added to the component itself, it automatically appears everywhere the banner renders.
5. Visually separate the counselor link from the hotline list with a small top margin or a subtle divider to distinguish "call now" resources from "find help nearby."

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Click "Find a counselor near you" | Navigates to `/local-support/counselors` (public route) | Same |

No auth gating needed. The counselors page is public.

### AI Safety Considerations

This enhancement strengthens the crisis safety system by connecting it to the local support system. A user in distress seeing the banner gains an additional concrete path to professional help. No changes to crisis detection logic.

---

## Integration 3: Gratitude-to-Insights Correlations

### Current State

The `ActivityCorrelations` component on `/insights` displays a bar chart with **mock data** for 5 activities (Journaling, Prayer, Meditation, Gratitude, Reading Plan). It shows a disclaimer: "Based on example data. Real correlations coming soon." Gratitude is already in the mock data but no real calculation exists.

The `GratitudeWidget` stores entries in `wr_gratitude_entries` via `gratitude-storage.ts`. The service exposes `getGratitudeEntries()` (all entries) and `getGratitudeStreak()` (consecutive days). Mood data is in `wr_mood_entries`.

### Requirements

1. **Gratitude correlation card**: Add a standalone frosted glass card in the Activity Correlations section (or near it) showing real gratitude-mood correlation data. Format: "On days you practiced gratitude, your mood averaged **X.X**" — calculated by cross-referencing `wr_gratitude_entries` dates with `wr_mood_entries` mood values for matching dates.
2. **Card design**: Use the existing dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`). Include:
   - Correlation icon: `Heart` (from Lucide) in pink (`text-pink-400`)
   - Correlation text with the calculated average
   - Sample size note: "Based on X days of data"
   - Encouraging message based on result
3. **Minimum data threshold**: Only show the gratitude correlation card when the user has **at least 5 days** where both a gratitude entry and a mood entry exist for the same date.
4. **Encouraging text**:
   - If gratitude-day average mood > non-gratitude-day average mood: "Gratitude seems to lift your spirits! Keep counting your blessings."
   - If equal or lower: "Every act of gratitude matters, even when it doesn't feel like it."
5. **Gratitude streak display**: Show "Current gratitude streak: X days" near the existing streak information on the insights page. Use `getGratitudeStreak()` from `gratitude-storage.ts`.
6. The existing mock bar chart can remain as-is for now (it already includes Gratitude). The new correlation card is an **addition**, not a replacement — it provides the real, personalized data alongside the illustrative chart.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| View gratitude correlation | N/A — `/insights` is auth-gated | Shows real correlation if data threshold met |
| View gratitude streak | N/A — `/insights` is auth-gated | Shows current streak count |

The entire `/insights` page is auth-gated. No additional gating needed.

### Auth & Persistence

- **Logged-out users:** Cannot access `/insights` (redirected).
- **Logged-in users:** Correlation computed client-side from `wr_gratitude_entries` and `wr_mood_entries` localStorage data. No new localStorage keys needed.

---

## Integration 4: Local Support Visits to Faith Points

### Current State

`LocalSupportPage.tsx` already calls `recordActivity('localVisit')` in `handleVisit` (line 49). The `localVisit` activity type exists in `ACTIVITY_POINTS` with a value of **10 points**. The `wr_local_visits` storage tracks visit records.

**What's already working:** Visits are recorded, faith points are awarded.

### What's Missing

1. **No success toast** — The user gets no visible feedback that they earned faith points for the visit.
2. **No "Local Support Seeker" badge** — No badge rewards visiting multiple locations.

### Requirements

1. **Success toast**: After `recordActivity('localVisit')` is called (when user clicks "I visited" and the visit is confirmed), show a success toast: **"Visit recorded! +10 faith points"** using the existing toast system (`useToast()`). Use the `success` tier.
2. **"Local Support Seeker" badge**: Add a new badge to the badge definitions:
   - **ID**: `local_support_5`
   - **Name**: "Local Support Seeker"
   - **Description**: "You've visited 5 local support locations. Your faith is lived, not just digital."
   - **Icon**: `MapPin` (from Lucide)
   - **Trigger**: Total unique locations visited reaches 5 (counted from `wr_local_visits` — unique `placeId` values, not total visit count)
   - **Celebration tier**: Standard (same as other milestone badges)
   - **Category**: Community badges (alongside prayer wall and friends badges)
3. The badge should fire through the normal badge system — when `recordActivity('localVisit')` updates the activity counter, the badge check evaluates whether the threshold is met, and if so, the `CelebrationOverlay` fires.
4. The daily activity checklist's conditional "Visit local support" item should continue to work as-is (it already shows for users with visit history based on the `localVisit` activity type).

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Click "I visited" | Not shown (visit button is auth-gated) | Records visit, awards 10 faith points, shows toast |
| Earn "Local Support Seeker" badge | N/A | Badge celebration fires when 5 unique locations visited |

The visit button already only renders when `isAuthenticated` is true (`showVisitButton={isAuthenticated}`).

### Auth & Persistence

- **Logged-out users:** Visit button not shown.
- **Logged-in users:** Visit stored in `wr_local_visits`, activity recorded via `recordActivity('localVisit')` to `wr_daily_activities` / `wr_faith_points`, badge earned to `wr_badges`. No new localStorage keys needed.

---

## Responsive Behavior

| Breakpoint | Integration 1 (Verse Links) | Integration 2 (Crisis CTA) | Integration 3 (Gratitude Insights) | Integration 4 (Visit Toast/Badge) |
|-----------|----------------------------|----------------------------|------------------------------------|------------------------------------|
| Mobile (< 640px) | Links are tappable with sufficient touch target (inherits from text line height, minimum 44px touch area via padding) | Counselor link stacks below hotlines in the single-column layout | Correlation card is full-width, single column | Toast appears at standard position, badge celebration is full-screen overlay |
| Tablet (640-1024px) | Same as mobile | Same as mobile | Card may sit alongside other correlation content | Same as mobile |
| Desktop (> 1024px) | Same as mobile (text links behave identically) | Same as mobile | Card sits within the insights grid layout | Same as mobile |

All four integrations are minor additions to existing responsive layouts. No new breakpoint-specific behavior needed beyond what the host components already handle.

---

## AI Safety Considerations

- **Integration 2** (Crisis Banner CTA) enhances the existing crisis safety system by providing an additional path to professional help. No changes to crisis detection logic.
- **Integrations 1, 3, 4** do not involve AI-generated content or free-text user input. No crisis detection required.

---

## Design Notes

- **Verse link styling** matches the existing `LinkedAnswerText` pattern on `/ask`: `text-primary-lt hover:text-primary hover:underline transition-colors`. Reference the Color System in `_plans/recon/design-system.md` for exact values (`#8B5CF6` primary-lt, `#6D28D9` primary).
- **Crisis banner CTA** uses the same `text-primary font-semibold underline` as existing hotline links within the banner. The banner background is `warning/10` — verify the primary color meets WCAG AA contrast on this background (it should, given the light amber background and the deep violet text).
- **Gratitude correlation card** uses the existing Dashboard Card Pattern from the design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`. The Heart icon in `text-pink-400` follows the pattern of other correlation icons.
- **Toast for visit recording** uses the existing `useToast()` system. No new visual patterns introduced.
- **Badge icon** (`MapPin`) is already used in the `VisitButton` component, maintaining visual consistency.

No new visual patterns are introduced by this spec. All four integrations use existing components and design tokens.

---

## Out of Scope

- Replacing the mock Activity Correlations bar chart with real calculations for all activities (only gratitude gets a real correlation card in this spec)
- Backend API for correlation calculations (client-side localStorage only)
- Verse linking in user-generated content (prayer wall posts, journal entries, comments)
- Deep linking to specific verse highlight/note state from verse links
- Counselor CTA on the SiteFooter crisis resources section (only the CrisisBanner component)
- Real-time notifications for badge earning (uses existing CelebrationOverlay system)
- Any changes to existing feature behavior beyond the specific integrations described

---

## Acceptance Criteria

### Integration 1: Universal Verse Linking
- [ ] Devotional tab scripture reference header (e.g., "PROVERBS 3:5-6") is a clickable link navigating to `/bible/proverbs/3#verse-5`
- [ ] Verse of the Day banner reference (e.g., "— Psalm 34:18") is a clickable link navigating to `/bible/psalms/34#verse-18`
- [ ] Mood check-in encouragement verse reference is a clickable link to the Bible reader
- [ ] Reading plan daily scripture references are clickable links to the Bible reader
- [ ] Landing page Verse of the Day reference is a clickable link
- [ ] Verse links use `text-primary-lt hover:text-primary hover:underline transition-colors` styling
- [ ] Links for verse ranges (e.g., "Romans 8:28-30") navigate to the first verse
- [ ] Numbered books (1 Corinthians, 2 Timothy) and books with spaces (Song of Solomon) link correctly
- [ ] All verse links navigate to `/bible/:book/:chapter#verse-:verseStart` format

### Integration 2: Crisis Banner Counselor CTA
- [ ] CrisisBanner shows "Find a counselor near you →" below the three hotline resources
- [ ] The link navigates to `/local-support/counselors` (React Router Link, not tel: link)
- [ ] Link styling uses `text-primary font-semibold underline` matching existing hotline link style
- [ ] Link text color meets WCAG AA contrast on the `warning/10` banner background
- [ ] The CTA appears on every CrisisBanner instance (Pray tab, Journal tab, Mood check-in, Prayer Wall, Comment input)
- [ ] Visual separation (margin or divider) distinguishes the counselor CTA from the hotline list

### Integration 3: Gratitude-to-Insights Correlations
- [ ] Gratitude correlation card appears on `/insights` when user has 5+ days with both gratitude entries and mood entries
- [ ] Card shows "On days you practiced gratitude, your mood averaged X.X" with real calculated value
- [ ] Card uses frosted glass style (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Card includes Heart icon in `text-pink-400`, correlation text, sample size note, and encouraging message
- [ ] Encouraging text shows "Gratitude seems to lift your spirits!" when gratitude days have higher average mood
- [ ] Encouraging text shows "Every act of gratitude matters" when average is equal or lower
- [ ] Card does NOT appear when fewer than 5 qualifying days exist
- [ ] Gratitude streak ("Current gratitude streak: X days") appears near existing streak information on insights page

### Integration 4: Local Support Visits to Faith Points
- [ ] Success toast "Visit recorded! +10 faith points" appears after clicking "I visited" on a local support listing
- [ ] Toast uses the `success` tier from the existing toast system
- [ ] "Local Support Seeker" badge definition exists with MapPin icon, triggered at 5 unique locations
- [ ] Badge celebration fires through normal badge system when 5th unique location is visited
- [ ] Badge appears in the community badges category in the badge grid

### General
- [ ] No existing feature behavior is changed beyond the specific integrations described
- [ ] All verse links work for logged-out users (Bible reader is public)
- [ ] Gratitude correlation and visit toast are auth-gated (only for logged-in users)
- [ ] All integrations are responsive (mobile, tablet, desktop)
