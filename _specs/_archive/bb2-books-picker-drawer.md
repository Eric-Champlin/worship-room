# BB-2: Books Picker Drawer

**Master Plan Reference:** N/A — part of the Bible Redesign series (BB-0 through BB-21) but no separate master plan document exists. Cross-spec dependencies are documented inline.

**Branch:** `bible-redesign`
**Depends on:** BB-0 (Bible landing page), BB-1 (Bible theme system)
**Hands off to:** BB-3 (chapter picker opens from book selection)

---

## Overview

The Bible section's current books picker is broken. This spec replaces it with a right-side slide-in drawer that organizes all 66 books into Old Testament and New Testament tabs, grouped by category, with search, reading progress, and card-based navigation. The drawer is a "shelf of books" metaphor — ambient, non-disruptive, always available from any Bible route — designed to keep users in their reading flow rather than forcing a full-page navigation just to switch books.

## User Story

As a **logged-out visitor or logged-in user**, I want to browse and search all 66 books of the Bible in an organized slide-in drawer so that I can quickly find and navigate to any book without losing my place.

## Requirements

### Functional Requirements

1. A right-side slide-in drawer opens when the user clicks "Browse Books" on the Bible landing page, presses `b` (when not in an input), or activates any future "Books" trigger
2. The drawer organizes all 66 books into **Old Testament** and **New Testament** tabs, with books grouped by category (Law, History, Wisdom & Poetry, Major Prophets, Minor Prophets, Gospels, History/Acts, Pauline Epistles, General Epistles, Apocalyptic)
3. Each book card displays the book name, chapter count (e.g. "50 chapters"), and estimated reading time (calculated at 200 wpm from word count data)
4. Books with reading progress show a thin progress bar at the bottom of the card (chapters read / total chapters)
5. A search input filters books in real time using fuzzy matching on book names and common abbreviations (e.g. "ps" → Psalms, "rev" → Revelation, "1cor" → 1 Corinthians)
6. Tapping a book closes the drawer and navigates to `/bible/[book-slug]/1`
7. The drawer closes via backdrop tap, Escape key, X button, or swipe-right on mobile
8. The selected testament tab persists in localStorage across drawer reopens
9. A foundational `bookMetadata.ts` data file provides the single source of truth for all book metadata (slug, name, testament, category, chapter count, word count, abbreviations) used by this and all future Bible specs

### Non-Functional Requirements

- **Performance**: Drawer opens in ≤250ms (animation). Search filters 66 items with no debounce needed — instant results.
- **Accessibility**: WCAG AA. Drawer uses `role="dialog"` + `aria-modal="true"`. Focus trap when open. Focus moves to search input on open, returns to trigger on close. All interactive elements meet 44px minimum tap target on mobile. Category headers are real `<h2>` elements. Book cards are `<button>` elements. Screen reader announces drawer state on open/close. `prefers-reduced-motion` respected (instant appear, no slide).
- **Bundle**: The drawer shell (`BibleDrawer`) is a reusable component that accepts children — BB-6 (verse action sheet) and possibly BB-3 (chapter picker) will reuse the same shell. Books-specific content lives in a separate content component.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Open drawer | Opens normally — no auth required | Opens normally | N/A |
| Search books | Works normally — no auth required | Works normally | N/A |
| Tap a book card | Navigates to `/bible/[slug]/1` — no auth required | Navigates to `/bible/[slug]/1` | N/A |
| View reading progress | No progress shown (no data in localStorage) | Progress bar shown if chapters have been read | N/A |

**No auth gating.** The books drawer is entirely public. Reading progress display is data-dependent (shows nothing when no data exists), not auth-gated.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Drawer is **full width (100vw)**, slides in from right. Book cards in **1-column** full-width grid. Swipe-right gesture to close. |
| Tablet (640px–1023px) | Drawer is **420px wide**, anchored right. Book cards in **2-column** grid. |
| Desktop (≥ 1024px) | Drawer is **480px wide**, anchored right. Bible landing/reader stays visible behind the backdrop. Book cards in **2-column** grid. |

- Backdrop fades in to ~40% opacity on all breakpoints
- Sticky header (title + search + close button) remains pinned at the top as the drawer body scrolls
- Page behind the drawer has scroll locked while the drawer is open
- Search input, testament tabs, and close button all maintain 44px minimum touch target on mobile

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The search input filters a static list of 66 book names; no crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can open the drawer, search, browse, and navigate to any book. Zero data persistence. No reading progress will be displayed (no data in localStorage).
- **Logged-in users:** Same functionality. Reading progress shown based on `wr_bible_progress` localStorage data.
- **localStorage usage:**
  - **Reads** `wr_bible_progress` — `{ [bookSlug: string]: number[] }` — array of read chapter numbers per book. BB-2 only reads this; BB-17 owns the write logic. For QA verification, a temporary stub write is included so reading a chapter adds it to the array.
  - **Writes** `wr_bible_books_tab` — `'OT' | 'NT'` — persists the selected testament tab so the drawer remembers the user's last selection on reopen. (**New key** — must be added to `11-local-storage-keys.md`.)

## Completion & Navigation

N/A — standalone Bible navigation feature, not part of the Daily Hub tabbed experience.

## Design Notes

### Drawer Shell

- The drawer slides in from the right edge of the screen over ~250ms using the existing design system ease token
- Background: dark frosted glass matching the `AudioDrawer` pattern — `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` — consistent with the existing slide-in drawer vocabulary in the app
- Backdrop: `rgba(0, 0, 0, 0.40)`
- `z-50` for the drawer + backdrop (above all content, matching modal z-index convention)
- `prefers-reduced-motion`: instant appear/disappear, no slide animation

### Sticky Header

- Title "Books of the Bible" in white, Inter bold
- Close button (X icon) top-left, 44px tap target
- Search input below title with placeholder "Find a book" — use the existing dark input styling (`bg-white/[0.06] border border-white/[0.12] rounded-xl`, white text, `placeholder:text-white/50`)

### Testament Tabs

- Segmented control: two options "Old Testament" / "New Testament"
- Active tab: filled pill with purple glow shadow (matching the Daily Hub tab bar's active pill treatment — `bg-white/[0.15] border-white/[0.15]`)
- Inactive tab: transparent with `text-white/50` hover effect

### Category Sections

- Category headers: uppercase, `text-xs font-semibold tracking-wider text-white/50` — matching the muted section-divider treatment from the design system
- Thin `border-t border-white/[0.08]` above each category header (matching homepage section divider pattern)

### Book Cards

- Use the existing `FrostedCard` component treatment: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow
- Interactive: hover adds `bg-white/[0.09] border-white/[0.18]` with intensified shadows (existing `FrostedCard` hover state)
- Content: book name (`text-base font-semibold text-white`), chapter count (`text-sm text-white/60`), reading time (`text-sm text-white/60`)
- Progress bar (when applicable): thin bar at card bottom, `bg-primary/60` fill, `bg-white/[0.06]` track, `rounded-b-2xl` to match card radius
- Grid: 2-column on desktop/tablet drawer widths, 1-column full-width on mobile

### Search Behavior

- When search is active (input has text): category headers and OT/NT tabs hide; results appear in a flat list sorted by relevance (exact match → prefix match → substring match)
- Common abbreviations resolve: "ps" → Psalms, "rev" → Revelation, "1cor" → 1 Corinthians, "song" → Song of Solomon, etc.
- Empty search restores the categorized view
- Pressing Enter opens the first result

### Footer

- Small caption at drawer bottom: "66 books · World English Bible" in `text-sm text-white/50`

### New Visual Patterns

The drawer shell pattern is **new** to the app (the existing `AudioDrawer` is similar but not identical — it's a right-side flyout with its own internal state management via `AudioProvider`). The books drawer establishes a **reusable drawer shell** that will be shared with BB-6 and possibly BB-3. The visual treatment (frosted glass, backdrop, slide-in animation) matches the `AudioDrawer` to maintain a consistent interaction vocabulary. Values derived from `AudioDrawer` patterns (background color, blur, animation timing) should be verified against the running app; mark as `[UNVERIFIED]` if exact computed values differ.

### Keyboard Shortcuts

- `b` — toggle drawer open/closed (when not focused on an input/textarea)
- `Escape` — close drawer
- `/` inside the drawer — focus the search input
- `Enter` on a focused book card — selects it (same as tap)

## Existing Components to Reuse

- **`FrostedCard`** — for book card styling (the card treatment, not the full component — book cards need to be `<button>` elements with `onClick`)
- **`useFocusTrap()`** hook — for drawer focus trapping
- **Existing `BIBLE_BOOKS` constant** (`constants/bible.ts`) — currently has slug, name, chapters, testament, category, hasFullText. The new `bookMetadata.ts` will extend this with `wordCount` and `abbreviations` fields. The existing constant may be deprecated or re-exported from the new file.
- **Existing `BIBLE_CATEGORIES` constant** (`constants/bible.ts`) — category definitions with labels and testament assignment. The spec's categories use slightly different labels (e.g. "Law" vs "Pentateuch", "Apocalyptic" vs "Prophecy"). The implementation must reconcile these; the spec's labels are the target for the drawer UI, but the underlying keys should remain compatible with the existing `BibleCategory` type.

## Out of Scope

- **Chapter picker** — BB-3 builds this. Tapping a book navigates directly to `/bible/[slug]/1` (chapter 1) until BB-3 intercepts with a chapter selection step.
- **Bible reader** — BB-4 builds the reading experience.
- **"Books" button in reader header** — that button doesn't exist yet because the reader doesn't exist; BB-4 will add it and wire it to the drawer context.
- **Reading progress writes** — BB-17 (reading streak) owns write logic. BB-2 only reads `wr_bible_progress`. A temporary stub write is included for QA verification only.
- **Reading time calibration** — uses a flat 200 wpm assumption. BB-17 may refine with user-specific reading speed.
- **Recently opened books / favorites** — BB-14 (My Bible) territory.
- **Real backend persistence** — Phase 3. Everything is localStorage for now.

## Acceptance Criteria

- [ ] Tapping "Browse Books" on the Bible landing opens the drawer with a slide-in animation from the right
- [ ] The drawer renders all 66 books organized into correct categories under Old Testament and New Testament tabs
- [ ] Old Testament tab shows 5 categories: Law (5 books), History (12 books), Wisdom & Poetry (5 books), Major Prophets (5 books), Minor Prophets (12 books)
- [ ] New Testament tab shows 5 categories: Gospels (4 books), History (1 book — Acts), Pauline Epistles (13 books), General Epistles (8 books), Apocalyptic (1 book — Revelation)
- [ ] Each book card shows: book name, chapter count (e.g. "50 chapters"), and reading time estimate (e.g. "~3 hr 20 min")
- [ ] Books with reading progress in `wr_bible_progress` show a progress bar; books without don't
- [ ] Search filters books in real time as the user types
- [ ] Search resolves common abbreviations: "ps" → Psalms, "rev" → Revelation, "1cor" → 1 Corinthians, "song" → Song of Solomon
- [ ] When search is active, the category headers and OT/NT tabs hide; results appear in a flat relevance-sorted list
- [ ] Pressing Enter in the search input opens the first matching result
- [ ] Tapping a book closes the drawer and navigates to `/bible/[slug]/1`
- [ ] Pressing `b` (when not focused on an input) toggles the drawer open/closed
- [ ] Pressing `Escape` closes the drawer
- [ ] Tapping the backdrop closes the drawer
- [ ] The close button (X icon, top-left) closes the drawer
- [ ] Swipe-right gesture closes the drawer on mobile
- [ ] Selected testament tab persists in `wr_bible_books_tab` localStorage across drawer reopens
- [ ] Drawer is full-width on mobile (< 640px), 420px on tablet (640–1023px), and 480px on desktop (≥ 1024px)
- [ ] Drawer uses dark frosted glass background matching the AudioDrawer visual language
- [ ] Book cards use FrostedCard styling with hover elevation change
- [ ] Category headers use uppercase muted label treatment with thin divider above
- [ ] All design tokens used; zero raw hex values
- [ ] `prefers-reduced-motion` is respected — instant appear/disappear, no slide animation
- [ ] Focus moves to the search input when the drawer opens
- [ ] Focus returns to the trigger element when the drawer closes
- [ ] Focus is trapped inside the drawer while open (Tab cycles inside only)
- [ ] All interactive elements have ≥ 44px tap target on mobile
- [ ] Drawer has `role="dialog"` and `aria-modal="true"`
- [ ] Page scroll is locked while the drawer is open
- [ ] `bookMetadata.ts` is created with all 66 books including slug, name, testament, category, chapterCount, wordCount, and abbreviations
- [ ] The `BibleDrawer` shell component is reusable (accepts children) — not coupled to books content
- [ ] A `BibleDrawerProvider` context allows any Bible-section component to open/close the drawer
