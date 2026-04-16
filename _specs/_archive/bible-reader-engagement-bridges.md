# Feature: Bible Reader Engagement Bridges

**Master Plan Reference:** N/A -- standalone feature

---

## Overview

The Bible reader is the highest-content page in Worship Room (66 books, 1,189 chapters) but currently a dead end. After finishing a chapter, users see only previous/next navigation -- no invitation to journal, pray, ask a question, or meditate on what they just read. This spec adds a contextual CTA strip at the bottom of each chapter that bridges users into deeper engagement features with the passage context carried forward, turning passive reading into active spiritual practice.

## User Story

As a **logged-out visitor or logged-in user**, I want to see contextual invitations to journal, pray, ask, or meditate after reading a Bible chapter so that I can deepen my engagement with scripture without losing the context of what I just read.

## Context

Agent 3 identified this as a P1 integration gap. Agent 5 flagged Bible annotations (highlights and notes) as an isolation problem -- data is stored but never surfaced by other features. YouVersion links reading plans to passages; Glorify connects devotionals to Bible chapters. Worship Room's Bible reader is rich (highlighting, notes, audio, ambient, sleep timer) but self-contained.

**Current flow (dead end):**
1. User reads a Bible chapter (e.g., Psalm 23)
2. Chapter content ends
3. `ChapterNav` shows previous/next chapter navigation
4. User either reads another chapter or navigates away

**Target flow (engagement bridges):**
1. User reads a Bible chapter
2. Chapter content ends
3. A warm CTA strip appears: "Continue your time with Psalm 23"
4. Four options: Journal, Pray, Ask, Meditate -- each pre-loaded with chapter context
5. `ChapterNav` remains below the CTA strip
6. User taps "Journal about this passage" -> navigates to Journal tab with passage reference pre-filled

## Requirements

### 1. CTA Strip Component

A new component (`ChapterEngagementBridge`) renders at the bottom of chapter content, ABOVE the existing `ChapterNav` component.

**Visual design:**
```
----------------------------------------------------
  Continue your time with Psalm 23

  [ Journal ]  [ Pray ]  [ Ask ]  [ Meditate ]
----------------------------------------------------
```

**Styling details:**
- Container: breathing room above and below, subtle top border separator (`border-white/10`)
- Heading: "Continue your time with [Book Chapter]" in muted text, centered
- CTA buttons: frosted glass pill style matching the dark theme design system -- `bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl` with `text-white/80 hover:text-white transition-colors`
- Icon + label inside each button with appropriate gap
- Icons: Lucide icons -- `PenLine` (Journal), `HandHeart` (Pray), `MessageCircleQuestion` (Ask), `Flower2` or `Wind` (Meditate)
- Touch targets: minimum 44px height on mobile
- Mobile (< 640px): buttons wrap to 2x2 grid
- Desktop: single horizontal row

### 2. Context Passing to Each Feature

Each CTA button navigates to the target feature with passage context so the user doesn't have to re-type what they were reading. The context passing should use the same patterns already established in the codebase (e.g., Devotional -> Journal, Devotional -> Pray).

**Journal ("Journal about this passage"):**
- Navigate to: `/daily?tab=journal`
- Pass context via `location.state` using the existing `prayContext` pattern: `{ prayContext: { source: 'bible', reference: 'Psalm 23', text: 'Journal about what stood out to you in Psalm 23' } }`
- The Journal tab should receive this context and pre-fill with the passage reference, matching how Devotional -> Journal context passing works today

**Pray ("Pray about this passage"):**
- Navigate to: `/daily?tab=pray`
- Pass context via `location.state` using the existing `prayContext` pattern: `{ prayContext: { source: 'bible', reference: 'Psalm 23', text: 'Pray about what you read in Psalm 23' } }`
- The Pray tab should receive this and pre-fill the textarea or show a contextual chip, matching how Devotional -> Pray context passing works today

**Ask ("Ask about this passage"):**
- Navigate to: `/ask?q=What does Psalm 23 mean and how can I apply it to my life?`
- Use URL query parameter with `encodeURIComponent`
- The Ask page already reads the `q` param

**Meditate ("Meditate on this passage"):**
- Navigate to: `/meditate/soaking` with the passage reference if the Scripture Soaking page can accept a pre-selected verse parameter
- If Scripture Soaking cannot accept a verse parameter, fall back to `/daily?tab=meditate`
- Implementation should check whether the Scripture Soaking page supports verse pre-selection

### 3. Passage Reference Construction

Build a human-readable reference from the route params (`/bible/:book/:chapter`):

- Look up the book's display name from the `BIBLE_BOOKS` constant
- Combine with chapter number: e.g., "Psalm 23", "Genesis 1", "John 3"
- Handle the singular "Psalm" case (display name "Psalms" -> "Psalm" for individual chapter references)
- Handle numbered books: "1 Samuel 3", "Song of Solomon 2", "3 John 1"

### 4. Placement

Insert the CTA strip component after the verse display section and before the `ChapterNav` component in the Bible reader page.

### 5. Always Visible

The CTA strip should ALWAYS appear after chapter content -- including on chapters that show placeholder content ("Full text coming soon"). Users may want to pray or journal about a passage they know even if the full text isn't displayed.

## Auth Gating

**The CTA strip itself has NO auth gate.** All four buttons are visible and clickable for both logged-out and logged-in users. The target features handle their own auth gating:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click "Journal" | Navigates to Journal tab; auth modal appears when user tries to save | Navigates to Journal tab with passage context pre-filled | "Sign in to save journal entries" (existing gate) |
| Click "Pray" | Navigates to Pray tab; auth modal appears when user tries to generate | Navigates to Pray tab with passage context pre-filled | "Sign in to generate a prayer" (existing gate) |
| Click "Ask" | Navigates to Ask page; first response is available without login | Navigates to Ask page with pre-filled question | N/A (ungated for first response) |
| Click "Meditate" | Navigates to meditation page; auth modal appears at sub-page level | Navigates to Scripture Soaking with passage context | "Sign in to start a meditation" (existing gate) |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | CTA buttons in 2x2 grid, all touch targets >= 44px, heading text smaller |
| Tablet (640-1024px) | CTA buttons in a row or 2x2 grid depending on available space |
| Desktop (> 1024px) | CTA buttons in a single horizontal row, centered |

The CTA strip width follows the existing Bible reader content width. No horizontal overflow.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. It only constructs navigation links with pre-built passage references. Crisis detection is handled by the target features (Pray tab, Journal tab) when the user enters text there.

## Auth & Persistence

- **Logged-out users:** CTA strip is fully visible and clickable. Navigation works. No data persistence on the CTA strip itself (target features handle their own persistence rules).
- **Logged-in users:** Same behavior. No additional persistence needed for the bridge component.
- **localStorage usage:** None. The CTA strip is stateless -- it reads route params and renders navigation links.

## Completion & Navigation

N/A -- The CTA strip is a navigation bridge, not a completable activity. No `recordActivity()` calls on CTA click. No sound effects on CTA click. Activity recording and sound effects happen when the user completes the target action in the destination feature.

## Design Notes

- **Dark theme**: The Bible reader uses dark theme. The CTA strip should match with frosted glass pill buttons (`bg-white/5`, `border-white/10`) consistent with the Dashboard Card Pattern from the design system.
- **Design system recon**: Reference the Inner Page Hero gradient and dark background values from `_plans/recon/design-system.md` for consistent dark theme treatment.
- **Existing component patterns**: The frosted glass pill button style matches existing patterns in the ambient sound cross-pollination pills and the dashboard Quick Actions buttons. Reference these for visual consistency.
- **Icons**: Use Lucide icons already imported across the codebase (PenLine, HandHeart, MessageCircleQuestion, Flower2/Wind).
- **Typography**: Heading uses Inter (font-sans), muted white opacity for the subheading text.
- **Context passing**: Reuse the existing `prayContext` location state pattern established by Devotional -> Journal and Devotional -> Pray cross-tab navigation.
- **No new visual patterns introduced**: All styling uses existing design system values (frosted glass, white opacity borders, Lucide icons, dark theme backgrounds).

## Out of Scope

- Bible reader layout changes (width was addressed in a separate content-width spec)
- Highlighting or notes feature changes
- Audio playback changes
- Adding Bible reader data to the Insights page (identified as a separate future spec)
- Reverse bridges (from Journal/Pray back to Bible reader)
- Deep-linking to specific verses within a chapter from the CTA context
- New `recordActivity()` calls or gamification for CTA clicks
- Sound effects on CTA button clicks

## Acceptance Criteria

- [ ] CTA strip renders at the bottom of every Bible chapter, above `ChapterNav`
- [ ] CTA strip heading shows "Continue your time with [Book Chapter]" with correct book name and chapter number (e.g., "Psalm 23", "Genesis 1", "1 Samuel 3")
- [ ] Four CTA buttons render: Journal, Pray, Ask, Meditate -- each with a Lucide icon and descriptive label
- [ ] "Journal" button navigates to `/daily?tab=journal` with passage context in `location.state` using the existing `prayContext` pattern
- [ ] "Pray" button navigates to `/daily?tab=pray` with passage context in `location.state` using the existing `prayContext` pattern
- [ ] "Ask" button navigates to `/ask?q=...` with a passage-relevant question (e.g., "What does Psalm 23 mean and how can I apply it to my life?")
- [ ] "Meditate" button navigates to `/meditate/soaking` with verse parameter (or `/daily?tab=meditate` if soaking doesn't accept pre-selection)
- [ ] Journal tab receives the Bible reader context and pre-fills with passage reference (same behavior as Devotional -> Journal)
- [ ] Pray tab receives the Bible reader context and shows passage reference (same behavior as Devotional -> Pray)
- [ ] CTA strip appears on chapters with placeholder content ("Full text coming soon"), not just fully loaded chapters
- [ ] No auth gate on the CTA strip itself -- all four buttons are visible and clickable for logged-out users
- [ ] `recordActivity()` is NOT called when any CTA button is clicked
- [ ] No sound effect plays when any CTA button is clicked
- [ ] Mobile (375px): buttons display in a 2x2 grid, all touch targets >= 44px height
- [ ] Desktop (1440px): buttons display in a single horizontal row, centered
- [ ] Frosted glass pill button styling matches design system: `bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl` with `text-white/80 hover:text-white`
- [ ] Top border separator (`border-white/10`) visually separates the CTA strip from chapter content
- [ ] Existing Bible reader functionality is preserved: highlighting, notes, audio playback, ambient chip, sleep timer, chapter navigation, search, breadcrumbs

## Test Requirements

- Verify CTA strip renders on at least 3 different chapters (Genesis 1, Psalm 23, John 3)
- Verify each CTA button navigates to the correct route with correct context
- Verify Journal tab receives and displays passage context from Bible reader
- Verify Pray tab receives and displays passage context from Bible reader
- Verify Ask page receives and uses the `q` parameter from Bible reader
- Verify CTA strip renders on a chapter with placeholder content (if any exist)
- Verify mobile layout (2x2 grid) at 375px viewport
- Verify desktop layout (single row) at 1440px viewport
- Verify no `recordActivity()` calls on CTA click
- Run existing Bible reader tests to verify no regressions
