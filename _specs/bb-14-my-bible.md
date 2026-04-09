# BB-14: My Bible

**Master Plan Reference:** N/A — standalone spec in the Bible Redesign wave. Reads from stores established by BB-7 (highlights), BB-7.5 (bookmarks), BB-8 (notes), and BB-10/11/12 (verse-attached prayers/journals/meditations).

**Depends on:** BB-7, BB-7.5, BB-8, BB-10/11/12
**Hands off to:** BB-15 (search across My Bible), BB-16 (export & import), BB-43 (reading heatmap), BB-46 (verse echoes)

---

## Overview

The Bible reader is the highest-content surface in Worship Room, and over the past several specs users have accumulated highlights, bookmarks, notes, verse-attached prayers, journal entries, and meditation sessions across dozens of chapters. But until now, all of those artifacts have been scattered across individual chapter pages with no way to see them together. My Bible is the personal dashboard that unifies everything a user has ever marked, written, or prayed about in scripture into a single browsable, filterable feed. It transforms the app from a Bible reader into a personal record of a user's walk with scripture — owned entirely by them, stored on their device, exportable anytime, no account required.

## User Stories

- As a **logged-in user**, I want to see all my highlights, bookmarks, notes, and verse-attached prayers/journals/meditations in one place so that I can rediscover what I've marked and reflect on my journey through scripture.
- As a **logged-out visitor**, I want to see my locally-stored highlights, bookmarks, and notes on the My Bible page so that I can benefit from the "no account ever" promise.
- As a **returning user**, I want to filter my activity by type (highlights, notes, bookmarks) and by book so that I can quickly find specific items without scrolling through everything.

## Context

BB-0 stubbed the `/bible/my` route as a placeholder. BB-7 built the highlight store, BB-7.5 built the bookmark store, BB-8 built the note store, and BB-10/11/12 added verse-attached prayers/journals/meditations from the Daily Hub engagement bridges. All of these stores persist to localStorage and expose subscribe methods for reactive updates. BB-14 is the first spec that reads from all of them simultaneously.

**Competitive positioning:** YouVersion has separate Highlights, Notes, and Bookmarks pages — but they require an account, separate items by type (forcing users to know what they're looking for), and don't surface verse-attached prayers at all. Worship Room's My Bible is unified (all types interleaved), local-first (no account), and includes verse-attached prayers/journals/meditations as a category nobody else has.

## Requirements

### Functional Requirements

#### 1. Page Hero

- Two-line heading treatment using `SectionHeading` pattern: top line "My Bible", bottom line "everything you've marked" (or similar) with `GRADIENT_TEXT_STYLE`
- Dynamic subhead based on item counts:
  - With items: "X highlights, Y notes, Z bookmarks across N books"
  - Empty: "Nothing yet. Tap a verse in the reader to start."
- Dark cinematic theme matching the Bible section (BB-1 tokens, atmospheric hero background from `PageHero` pattern)
- Glow orbs at 0.25-0.50 opacity matching the homepage glow standard

#### 2. Quick Stats Row

- Horizontal row of 3-5 small stat cards (render only stats with count > 0, plus "Books touched" always when any items exist):
  - **Highlights** count (paintbrush icon)
  - **Notes** count (pencil icon)
  - **Bookmarks** count (bookmark icon)
  - **Books touched** count (number of distinct Bible books with at least one item)
  - **Day streak** count (flame icon) — only if `wr_bible_streak` exists with count > 0; omit entirely if BB-17 hasn't shipped or streak is 0
- Each card is tappable: tapping a stat card sets the type filter in the activity feed to that type
- Stats are derived live from the stores; no separate cache or localStorage key
- Cards use frosted glass styling matching the Bible section card language

#### 3. Activity Filter Bar (sticky)

A sticky filter bar below the hero that controls the activity feed. Three filter dimensions:

**Type filter** (segmented control):
- **All** (default) — shows all item types interleaved
- **Highlights**
- **Notes**
- **Bookmarks**
- **From Daily Hub** — shows only verse-attached prayers, journals, and meditations (items from BB-10/11/12 bridges)

**Book filter** (dropdown or bottom sheet):
- **All books** (default)
- Lists only books that have at least one item
- Shows item count next to each book name
- On mobile, opens as a bottom sheet; on desktop, a dropdown popover

**Sort** (segmented toggle):
- **Most recent** (default) — newest items first, using `createdAt` (or `updatedAt` if more recent)
- **Canonical order** — Genesis 1:1 first through Revelation 22:21, ignoring date

The filter bar sticks to the top of the viewport on scroll (below the navbar). On mobile, the filter bar collapses into a compact single-row form with filter chips that expand on tap.

#### 4. Color Filter Strip (highlights only)

When the type filter is set to **Highlights**, an additional row of color filter chips appears below the filter bar:

- **All colors** (default) — gradient circle combining all five colors
- **Peace** | **Conviction** | **Joy** | **Struggle** | **Promise** — each chip is a circular swatch (~32px) in the corresponding highlight color from BB-7's emotion tokens
- Active state: filled inner dot + thicker outer ring
- Tapping a chip filters highlights to that color only
- The strip is hidden (and colorFilter resets to "all") when the type filter changes to anything other than Highlights

#### 5. Activity Feed

A vertical list of cards, one per item. Cards share a common layout grammar via a shell component:

**Top row:** type icon + verse reference (formatted via existing `formatReference` helper) + relative timestamp ("3 days ago", "yesterday", "just now") with absolute time shown on hover/long-press tooltip

**Card types:**

- **Highlight card:** verse text with highlight color as background fill matching reader rendering; small emotion chip ("Joy", "Peace", etc.)
- **Bookmark card:** verse text (no background fill); optional user-provided label in muted text below reference
- **Note card:** verse text in muted color; note body below in primary color; max 4 lines with "Show more" expanding inline; "edited Xm ago" indicator when `updatedAt > createdAt`; reference links inside note body parsed via BB-8's `referenceParser` and rendered as styled buttons (toast stub until BB-38)
- **Prayer card:** verse text in muted color; prayer body below, max 4 lines with "Show more"; small "Pray" badge next to timestamp
- **Journal card:** same structure as Prayer card with "Journal" badge; journal entry text as body
- **Meditation card:** verse text; if meditation store persists text content, show it; otherwise show "You meditated on this verse" with no body text; "Meditate" badge

**Tap behavior:** Tapping any card navigates to the chapter in the reader via a centralized `navigateToActivityItem` helper function. Until BB-38 ships, navigation goes to `/bible/{book}/{chapter}` without verse anchoring. BB-38 will upgrade this single function to add `#v{startVerse}` anchoring.

**Long-press / right-click behavior:** Opens a type-specific action menu popover:

| Card Type | Actions |
|-----------|---------|
| Highlight | Change color, Remove, Open in reader |
| Bookmark | Edit label, Remove, Open in reader |
| Note | Edit (navigates to verse + opens note editor), Delete, Open in reader |
| Prayer | Open verse in reader |
| Journal | Open verse in reader |
| Meditation | Open verse in reader |

Action handlers call existing store mutation methods. Desktop users right-click; mobile users long-press (400ms). Tap outside or Escape closes the menu.

**Verse text in cards:** Loaded from the WEB JSON data via the existing chapter loader. Each card resolves the verse text for its reference range.

#### 6. Cross-Store Activity Feed (data layer)

A shared `ActivityItem` envelope type wraps items from all six stores into a unified sorted stream. The activity loader:

- Reads from highlight store, bookmark store, note store, and Daily Hub prayer/journal/meditation stores
- Wraps each entry in an `ActivityItem` envelope with common fields: `type`, `id`, `createdAt`, `updatedAt`, `book`, `chapter`, `startVerse`, `endVerse`, `data`
- Daily Hub items (prayers, journals, meditations) are included **only** if they have a `verseContext` field (added by BB-10/11/12). Items without verseContext are normal Daily Hub entries unrelated to a verse and must not appear in My Bible.
- `loadAllActivity()` concatenates all items without sorting or filtering
- `filterActivity()` and `sortActivity()` are pure functions consumed by the hook

A `useActivityFeed(filters, sort)` hook owns reactive subscription to all stores:
1. Loads all activity on first render
2. Subscribes to every store's change events
3. On any store change, re-loads, re-filters, re-sorts
4. Cleans up all subscriptions on unmount

**If the plan phase discovers that Daily Hub stores don't have the `verseContext` field (BB-10/11/12 not yet merged), ship BB-14 without prayer/journal/meditation cards and flag the gap explicitly in the console and in the empty state for "From Daily Hub" filter.**

#### 7. Empty States

Three empty-state variants:

**Truly empty** (no items in any store):
- Muted icon (e.g., `BookOpen` or similar)
- Heading: "Nothing here yet."
- Subtext: "Tap a verse in the reader and choose Highlight, Bookmark, or Note. They'll show up here."
- "Open the reader" button routing to `/bible`
- Uses the existing `FeatureEmptyState` component pattern

**Empty with filter applied** (items exist but current filters show zero):
- Text: "No [type] in [book] match this filter."
- "Clear filters" button that resets type to All, book to All, color to All

**Type-specific empty** (e.g., user selected Notes but has no notes):
- Text: "No notes yet. Long-press a verse to write one."
- "Clear filter" button to return to All

#### 8. Footer Trust Signal

Small caption at the bottom: "Stored on this device. Export anytime in Settings." The "Settings" text is a link — route to `/settings` if BB-16 has shipped, otherwise render as plain text (no dead link).

#### 9. Bible Drawer Access

The page inherits the Bible drawer system from BB-2. The books drawer can be opened from the My Bible page via the existing keyboard shortcut (`b` key) and any persistent drawer toggle affordance.

## Auth Gating

My Bible is a **public** page — all content renders from localStorage which is available to all users. No auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View My Bible page | Full page renders with localStorage items | Full page renders with localStorage items | N/A |
| Tap a stat card to filter | Filters activity feed | Filters activity feed | N/A |
| Use type/book/sort/color filters | Works fully | Works fully | N/A |
| Tap a card to navigate to reader | Navigates to chapter | Navigates to chapter | N/A |
| Long-press → Change color | Calls highlight store mutation | Calls highlight store mutation | N/A |
| Long-press → Remove bookmark | Calls bookmark store mutation | Calls bookmark store mutation | N/A |
| Long-press → Delete note | Calls note store mutation | Calls note store mutation | N/A |
| Long-press → Edit label | Opens bookmark label editor | Opens bookmark label editor | N/A |
| Long-press → Edit note | Navigates to verse in reader | Navigates to verse in reader | N/A |

**Note:** The underlying stores (highlights, bookmarks, notes) already handle their own auth gating on write operations. My Bible only reads and calls existing mutation methods.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Quick stats row: horizontal scroll with snap. Filter bar: compact single-row with chips that expand on tap, book filter as bottom sheet. Activity cards: full width, single column. Color chips: horizontal scroll if needed. Hero text smaller (`text-3xl` / `text-4xl`). |
| Tablet (640-1024px) | Quick stats row: centered flex row. Filter bar: full form visible, book filter as dropdown. Activity cards: full width, max-w-2xl centered. Hero text medium. |
| Desktop (> 1024px) | Quick stats row: centered flex row. Filter bar: full form visible, book filter as dropdown. Activity cards: max-w-2xl centered with comfortable reading width. Hero text large (`text-5xl` / `text-6xl`). |

Additional responsive notes:
- All tap targets minimum 44px on all breakpoints
- Filter bar sticky position: top of viewport below navbar on all breakpoints
- Color filter strip: horizontal scroll with hidden scrollbar on mobile, flex wrap on desktop
- Long-press action menu: positioned relative to card on desktop, centered bottom sheet on mobile
- Activity cards support "Show more" expansion without layout shift
- Page fully usable on 375px viewport width

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. It is a read-only dashboard displaying previously saved items. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full page renders. All data comes from localStorage (`wr_bible_highlights`, `bible:bookmarks`, `bible:notes`, and Daily Hub stores). Zero database writes. This is the "no account ever" promise in action.
- **Logged-in users:** Same behavior — localStorage-based. In Phase 3, localStorage keys will sync to backend API.
- **Route type:** Public
- **localStorage keys read (no new keys created):**
  - `wr_bible_highlights` — highlights (BB-7)
  - `bible:bookmarks` — bookmarks (BB-7.5)
  - `bible:notes` — notes (BB-8)
  - `wr_bible_streak` — streak count (BB-17, if shipped)
  - Daily Hub prayer/journal/meditation stores (paths TBD by plan phase — requires `verseContext` field from BB-10/11/12)
- **No new localStorage keys.** Filter state is React state only, not persisted.

## Completion & Navigation

N/A — standalone page, not part of the Daily Hub tabbed experience. No completion tracking. Navigation is outward (card tap → reader) and inward (stat card tap → filter feed, "Open the reader" CTA → `/bible`).

## Recon (run before /plan)

Run `/playwright-recon` against:
- **YouVersion web "Highlights" view** — layout, filtering, card design
- **YouVersion "Notes" view** — note preview, expand behavior
- **YouVersion "Bookmarks" view** — label display, sort options
- **Bible Gateway's account dashboard** if accessible

Capture: item listing format (cards/rows/grid), filtering options (by book/date/color), default sort order, note preview truncation, verse reference formatting, unified vs. separate views per type.

**What to improve on:** YouVersion separates highlights/notes/bookmarks into different sections (forces users to know what they're looking for). Their filtering is limited (usually just by book). Verse-attached prayers from a Pray feature are not surfaced anywhere — that's a new category.

## Design Notes

- **Page background:** Atmospheric hero background using `PageHero` pattern (radial gradient `rgba(109, 40, 217, 0.15)` over `dashboard-dark` #0f0a1e), matching Bible, Music, Prayer Wall, and other inner pages
- **Hero heading:** `SectionHeading` with `GRADIENT_TEXT_STYLE` (white-to-purple gradient), matching BB-0's Bible landing page pattern
- **Cards:** Frosted glass treatment matching `FrostedCard` component — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Interactive cards get hover elevation (`bg-white/[0.09] border-white/[0.18]`)
- **Text colors:** `text-white` for primary content, `text-white/60` for muted verse text in note/prayer/journal cards, `text-white/50` for timestamps. Zero raw hex values.
- **Highlight color backgrounds in cards:** Use the exact same color tokens from BB-7's highlight system so card rendering matches what the user sees in the reader
- **Filter bar:** Frosted glass pill treatment matching Daily Hub tab bar styling (rounded-full, glass border, active state with purple glow shadow)
- **Color chips:** Circular swatches using BB-7 emotion colors. Active state: ring treatment with glow
- **Empty states:** Use existing `FeatureEmptyState` component pattern with warm copy
- **Action menu popover:** Dark frosted glass (`rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`) matching AudioDrawer styling
- **Design system recon reference:** `_plans/recon/design-system.md` available — use for exact CSS values on atmospheric hero, FrostedCard, gradient text
- **No new visual patterns introduced** — this spec composes existing patterns (PageHero, FrostedCard, filter pills, action menus, empty states)

## Out of Scope

- **Inline editing of items on My Bible page** — long-press menus surface mutation actions but heavy edits (rewriting a note body) route to the verse in the reader. No inline editors.
- **Multi-select or bulk actions** — no "delete all highlights in Romans." BB-14 is a read-and-navigate surface.
- **Search** — BB-15 owns search across My Bible. BB-14 has filters, not search.
- **Reading heatmap** — BB-43 owns the visual progress map. BB-14 has stat counts only.
- **Verse echoes** — BB-46. The "you highlighted this 23 days ago" pill is a different surface.
- **Export & import** — BB-16.
- **Streak details** — BB-17 owns the streak experience. BB-14 displays the count if it exists.
- **Verse-anchor scrolling on navigation** — BB-38 will upgrade the centralized navigate helper.
- **New store mutations** — BB-14 only reads. Long-press actions call existing mutation methods.
- **"What to do today" prompts** — this is a record of past activity, not a suggestion engine.
- **Social sharing of My Bible totals** — out of scope; the focus is private reflection.
- **Analytics** — not tracking per the wave's privacy stance.
- **Virtualized list rendering** — default to non-virtualized. Only add if verify-with-playwright shows scroll jank with 1000+ items.

## Acceptance Criteria

- [ ] Navigating to `/bible/my` renders the My Bible page with atmospheric dark hero background matching the Bible section theme
- [ ] Hero shows two-line heading with `GRADIENT_TEXT_STYLE` gradient text treatment
- [ ] Dynamic subhead shows correct item counts (e.g., "12 highlights, 3 notes, 5 bookmarks across 8 books")
- [ ] Dynamic subhead shows "Nothing yet. Tap a verse in the reader to start." when no items exist
- [ ] Quick stats row shows correct counts for highlights, notes, bookmarks, and books touched
- [ ] Quick stats row omits the streak card when `wr_bible_streak` doesn't exist or count is 0
- [ ] Tapping a stat card sets the type filter in the activity feed to that type
- [ ] Activity filter bar shows All / Highlights / Notes / Bookmarks / From Daily Hub type options
- [ ] Default state: type=All, book=All books, sort=Most Recent
- [ ] Book filter dropdown shows only books with at least one item, with item counts next to each name
- [ ] Sort toggle switches between Most Recent and Canonical Order, with feed re-rendering immediately
- [ ] Color filter chip strip appears only when type filter is set to Highlights
- [ ] Color filter chip strip hides and colorFilter resets when type changes to non-Highlights
- [ ] Each color chip filters highlights to that emotion color only
- [ ] Highlight cards render verse text with the correct background color matching the highlight emotion from BB-7
- [ ] Bookmark cards show the optional user-provided label in muted text when present
- [ ] Note cards show verse text in muted color (`text-white/60`) and note body in primary color (`text-white`), max 4 lines with "Show more"
- [ ] Note cards show "edited Xm ago" when `updatedAt > createdAt`
- [ ] Reference links in note bodies are parsed via BB-8's `referenceParser` and rendered as styled buttons (toast stub until BB-38)
- [ ] Prayer/Journal/Meditation cards appear only when the corresponding store contains an entry with a `verseContext` field
- [ ] If no Daily Hub stores have `verseContext` entries, the "From Daily Hub" filter shows a descriptive empty state (not silent zero cards)
- [ ] Tapping any card navigates to the chapter via the centralized `navigateToActivityItem` helper
- [ ] Long-press on mobile (400ms) opens the type-specific action menu popover
- [ ] Right-click on desktop opens the same action menu (custom context menu, suppresses browser default)
- [ ] Action menu: Highlight → Change color, Remove, Open in reader
- [ ] Action menu: Bookmark → Edit label, Remove, Open in reader
- [ ] Action menu: Note → Edit (navigates to verse), Delete, Open in reader
- [ ] Action menu actions call existing store mutation methods and feed re-renders reactively
- [ ] Activity feed re-renders when any underlying store changes (subscribe/unsubscribe pattern works)
- [ ] Truly empty state renders with icon, heading, subtext, and "Open the reader" button when no items exist
- [ ] Filtered-empty state renders with "No [type] in [book] match this filter" and "Clear filters" button when items exist but current filters match zero
- [ ] Filter bar is sticky to the top of the viewport on scroll (below navbar)
- [ ] On mobile (< 640px), filter bar collapses into a compact form with expandable chips
- [ ] On mobile, book filter opens as a bottom sheet; on desktop, as a dropdown popover
- [ ] Card timestamps show relative time ("3 days ago", "yesterday", "just now") with absolute time on hover
- [ ] Verse text in cards is loaded from WEB JSON data via the existing chapter loader
- [ ] Reference labels formatted via existing `formatReference` helper
- [ ] Footer trust signal renders: "Stored on this device. Export anytime in Settings."
- [ ] Page is fully usable on a 375px mobile viewport (no horizontal overflow, no truncated controls)
- [ ] All design tokens used; zero raw hex values in any component
- [ ] Lighthouse accessibility score >= 95
- [ ] Reduced motion respected: no card hover animations or list transitions when `prefers-reduced-motion` is set
- [ ] `activityLoader` unit tests cover: empty state (zero items), mixed types merged correctly, items without verseContext excluded from prayer/journal/meditation lists, items with verseContext included
- [ ] `filterAndSort` unit tests cover: filter by each type, filter by book, filter by color, sort by recent (newest first), sort by canonical (Genesis-Revelation), combined type+book+color filters
- [ ] Filtering and sorting functions are pure (no side effects, no store mutations)
- [ ] Bible drawer can be opened from the My Bible page via existing keyboard shortcut
- [ ] Card hover/glow treatment matches FrostedCard interactive pattern from design system

## Notes for /plan Execution

- **The activity loader is the load-bearing piece.** It merges six different data shapes from six stores into a single sorted stream. Get the `ActivityItem` envelope type right once and the rest falls into place.
- **The plan phase MUST locate the actual Daily Hub prayer/journal/meditate stores** by inspecting the file structure. Find the exact paths and verify the `verseContext` field exists. If stores can't be found or verseContext isn't being saved, ship without those card types and flag the gap.
- **Reactive subscriptions must be cleaned up on unmount.** The `useActivityFeed` hook subscribes to 3-6 stores; every subscription must be unsubscribed in the cleanup function.
- **Long-press on desktop = right-click.** Don't make desktop users press-and-hold. Right-click → suppress browser context menu → custom action menu. Mobile users get 400ms press-and-hold.
- **The `navigateToActivityItem` helper is BB-38's seam.** Centralize all card navigation in this one function. BB-38 only needs to update it to add verse anchoring.
- **Card content truncation matters.** Notes can be up to 10,000 characters; truncate to 4 lines with "Show more" expanding inline. Multi-verse highlight ranges should display all verses without breaking card layout.
- **Don't recreate the verse action sheet on cards.** Cards are previews and navigation entry points. Deep interaction path: tap card → reader → tap verse → action sheet.
