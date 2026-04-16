# Feature: Bible Reader — Browser & Reading View

**Spec sequence:** This is Spec 1 of a 3-spec Bible reader sequence. Spec 2 will add bookmarking, highlighting, and note-taking on verses. Spec 3 will add cross-references, AI-powered verse explanations, and integration with existing features (reading plans, devotionals, prayer generation).

---

## Overview

Scripture is the foundation of everything Worship Room does — prayers reference it, devotionals unpack it, reading plans journey through it, and the mood check-in surfaces encouraging verses. Yet users currently have no way to read the Bible itself within the app. Every competitor (YouVersion, Glorify, Abide, Pray.com, Soultime) offers a Bible reader as a core feature. This is the single largest content gap in the platform.

This spec delivers a complete Bible browsing and reading experience at `/bible` and `/bible/:book/:chapter`. Users can browse all 66 books organized by testament and category, search across available verse text, and read chapters in a comfortable, focused reading view designed for contemplation rather than study. The WEB (World English Bible) translation is public domain, requiring no licensing.

For the frontend-first build, full verse text is included for 20 high-traffic books covering the most commonly read portions of Scripture. The remaining 46 books have their structure (names, chapter counts) present with a graceful placeholder linking to BibleGateway for the full text. Content files are code-split so the Bible text loads on demand rather than inflating the initial bundle.

The Bible reader is fully public — anyone can browse and read without an account. Reading progress tracking (which chapters have been read) is the only auth-gated feature, following the same pattern as all other Worship Room localStorage-backed features.

---

## User Stories

- As a **logged-out visitor**, I want to browse and read the Bible within Worship Room so that I don't have to leave the app to look up Scripture referenced in devotionals, prayers, or reading plans.
- As a **logged-out visitor**, I want to search for specific verses or phrases so that I can quickly find passages I'm looking for.
- As a **logged-in user**, I want my reading progress tracked automatically so that I can see which chapters I've read and feel a sense of accomplishment as I work through books of the Bible.
- As a **logged-in user**, I want to navigate from a chapter directly to prayer or journaling so that I can respond to what I've read without losing the moment.
- As a **logged-out visitor**, I want to see which books have full text available vs. coming soon so that I know what content is ready and where to find the rest.

---

## Requirements

### Bible Content Data Model

1. **All 66 books of the Bible** are represented in the data structure, organized by testament (Old Testament: 39 books, New Testament: 27 books) and traditional category groupings.

2. **Old Testament categories:**
   - Pentateuch (5): Genesis, Exodus, Leviticus, Numbers, Deuteronomy
   - Historical (12): Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther
   - Wisdom & Poetry (5): Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon
   - Major Prophets (5): Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel
   - Minor Prophets (12): Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi

3. **New Testament categories:**
   - Gospels (4): Matthew, Mark, Luke, John
   - History (1): Acts
   - Pauline Epistles (13): Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon
   - General Epistles (8): Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude
   - Prophecy (1): Revelation

4. **Each book has:** a display name, a URL-safe slug (e.g., `genesis`, `1-corinthians`), a chapter count, a testament, a category, and whether full text is available.

5. **20 books with full verse text** (WEB translation): Genesis, Exodus, Psalms, Proverbs, Ecclesiastes, Isaiah, Jeremiah, Lamentations, Matthew, Mark, Luke, John, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Revelation.

6. **46 books without full text** show a placeholder message on the chapter reading view: "Full text coming soon. In the meantime, read this book on BibleGateway" with a link to the WEB translation on biblegateway.com for that specific book and chapter.

7. **Code splitting:** Bible text content files are lazy-loaded on demand per book. The initial bundle includes only the book/chapter structure metadata (names, slugs, chapter counts, categories), not any verse text.

### Navigation — Navbar Integration

8. **Add a "Bible" link to the main navigation** bar, positioned between "Daily Hub" and "Prayer Wall" (before the Reading Plans link). This link appears for both logged-out and logged-in users and navigates to `/bible`.

### Browser Page (`/bible`)

9. **Page layout:** Dark background (matching the existing page hero gradient pattern). The existing `PageHero` component with heading "Bible" and subtitle "The Word of God" in Lora italic (`font-serif italic`).

10. **Two browsing modes** toggled by a segmented control below the hero: "Books" (default) and "Search". The segmented control uses the same styling pattern as existing toggle controls in the app (frosted glass pills with active/inactive states).

#### Books Mode

11. **Accordion layout:** All 66 books organized in a collapsible accordion structure. Top level: "Old Testament" and "New Testament" sections, each expandable. Old Testament expanded by default on first visit.

12. **Category sub-groups:** Within each testament, books are grouped by their traditional category (Pentateuch, Historical, etc.) as sub-accordions. Each category group shows its name and book count.

13. **Book entries:** Each book shows its display name, chapter count (e.g., "50 chapters"), and for logged-in users, a reading progress indicator showing how many chapters have been read (e.g., a mini progress bar or filled/unfilled dots). Books without full text show a subtle "Coming soon" badge.

14. **Chapter grid:** Clicking a book name expands to reveal a grid of chapter number buttons (e.g., Genesis shows buttons numbered 1-50). Each button is a small square or circle. For logged-in users, completed chapters are visually distinct (filled/highlighted vs. default). Clicking a chapter button navigates to `/bible/:bookSlug/:chapter`.

15. **Accordion behavior:** Only one book can be expanded at a time within a category group (clicking a new book collapses the previous). Testament and category accordions can be independently open/closed. The accordion state is session-only (not persisted).

#### Search Mode

16. **Search input:** A text input with placeholder "Search the Bible..." at the top of the content area. Search is debounced at 300ms. Case-insensitive. While debouncing, show "Searching..." indicator.

17. **Search scope:** Searches across all available verse text in the 20 books with full content. Books without full text are not searchable. A small note below the search input: "Searching 20 of 66 books. More books coming soon."

18. **Search results:** Each result shows the book name, chapter, and verse number as a header (e.g., "John 3:16"), the matching verse text with the search term highlighted (bold or background highlight), and 1 verse of context before and after the match for readability. Results are clickable and navigate to `/bible/:bookSlug/:chapter#verse-:verseNumber`.

19. **Empty and edge states:**
    - No query entered: show a brief prompt "Type to search across Scripture"
    - No results: "No verses found matching '[query]'. Try different words or check spelling."
    - Minimum 2 characters to trigger a search

### Reading View (`/bible/:book/:chapter`)

20. **Page hero:** Uses the existing `PageHero` component. Heading shows the full book name + "Chapter X" (e.g., "Genesis Chapter 1"). The book name portion is a clickable link back to `/bible` with the query parameter `?book=:bookSlug` so the browser page opens with that book expanded.

21. **Chapter text display:** Verse-by-verse in a single reading column (`max-w-2xl`), dark background. Each verse shows its verse number as a superscript in muted text (`text-white/30`) before the verse text. Verse text uses Lora font at a comfortable reading size (18px, 1.8 line-height) in `text-white/90` for high readability.

22. **Verse highlighting:** When navigating from search or a URL with a hash (e.g., `#verse-16`), the target verse scrolls into view and receives a brief highlight animation — a `bg-primary/10` background that fades out over 2 seconds. This draws the eye to the specific verse without being distracting.

23. **Chapter navigation:**
    - At the top: a compact chapter selector dropdown showing "Chapter X of Y", allowing quick jumps to any chapter in the book.
    - At the bottom: "Previous Chapter" and "Next Chapter" buttons. At the first chapter, "Previous Chapter" is hidden. At the last chapter, "Next Chapter" is hidden. These buttons navigate within the same book.

24. **Cross-feature CTAs:** At the very bottom of each chapter (below the navigation buttons), show two call-to-action links:
    - "Pray about this chapter" — navigates to `/daily?tab=pray`
    - "Journal your thoughts" — navigates to `/daily?tab=journal`
    These are styled as subtle text links, not prominent buttons, to avoid disrupting the reading flow.

25. **Placeholder for books without full text:** When a user navigates to a chapter in one of the 46 books without full text, show a centered message: "Full text coming soon" with a description "We're working on adding the full text of [Book Name]. In the meantime, you can read it on BibleGateway." Include a button linking to the WEB translation of that specific book and chapter on biblegateway.com (opens in a new tab).

### Reading Progress Tracking

26. **Progress storage:** For logged-in users, track which chapters have been read in a `wr_bible_progress` localStorage key. The value is a JSON object keyed by book slug, where each value is an array of completed chapter numbers. Example: `{ "genesis": [1, 2, 3], "john": [1, 3] }`.

27. **Completion detection:** A chapter is marked as read when the user scrolls to the bottom of the chapter content (using an Intersection Observer on a sentinel element at the end of the verse list, same pattern as reading plan day completion).

28. **Progress display:** On the browser page, books with any read chapters show a progress indicator (e.g., "3 of 50 chapters read" or a mini progress bar). Chapter buttons for completed chapters are visually distinct (e.g., filled/highlighted background).

29. **Storage service:** The storage follows existing Worship Room patterns — pure functions for read/write, try-catch for corrupted JSON recovery, `wr_` prefix for the localStorage key.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Browse all 66 books | Full access | Full access |
| Read chapter text | Full access | Full access |
| Search verses | Full access | Full access |
| Navigate between chapters | Full access | Full access |
| Click cross-feature CTAs | Full access (navigates to Daily Hub) | Full access |
| Reading progress tracking | Not tracked (no IO fires, no progress stored) | Auto-tracked via IO on scroll to bottom |
| Progress indicators on browser page | Not visible (no data) | Visible when chapters have been read |
| Chapter completed indicators | Not visible | Visible (filled/highlighted chapter buttons) |

### Persistence

- **`wr_bible_progress`** (NEW): JSON object keyed by book slug, values are arrays of chapter numbers. Written only for logged-in users when IO fires at chapter bottom. Read by the browser page for progress display.
- **Logged-out users:** Zero persistence. Can browse and read everything, but no progress is tracked or stored.
- **Route type:** Public. Both `/bible` and `/bible/:book/:chapter` are public routes accessible without authentication.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays only curated, canonical Bible text (WEB translation). No user text input, no AI-generated content, no free-form text fields.
- **User input involved?**: Only the search input, which searches pre-existing Bible text. No user-generated content is created or stored.
- **AI-generated content?**: No. All content is the WEB translation — a fixed, published Bible text.
- **Theological boundaries**: The text displayed is the WEB translation verbatim. No interpretive content, no commentary, no AI-generated explanations (those are Spec 3). This spec is pure Scripture display.

---

## UX & Design Notes

### Emotional Tone

The Bible reader should feel like opening a well-worn Bible — familiar, comfortable, and reverent. The reading view prioritizes readability and focus over features. No clutter, no distractions. The dark background with warm typography creates an intimate, contemplative atmosphere consistent with Worship Room's spiritual healing mission.

### Visual Design

- **Browser page:** Dark background matching existing dark-themed pages (hero gradient). Accordion sections use frosted glass card styling for category headers. Chapter buttons in a grid use subtle borders and hover states.
- **Reading view:** Clean, single-column layout on dark background. Generous line spacing for comfortable reading. Verse numbers are small and muted to not distract from the text itself. The overall feel should be "reading a Bible in a quiet room at night."
- **Segmented control:** Frosted glass pill toggle for Books/Search mode, matching existing toggle patterns.
- **Progress indicators:** Subtle, non-intrusive. A thin progress bar under the book name, or small filled/unfilled circles. Completed chapters get a muted highlight, not a bright celebration — this is about quiet consistency, not gamification.

### Design System References

- **PageHero:** Reuse existing `PageHero` component with dark gradient
- **Accordion:** Similar to the DaySelector dropdown pattern from reading plans, adapted for nested expand/collapse
- **Frosted glass cards:** `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` for category headers
- **Scripture text:** Lora (`font-serif`) at 18px/1.8 line-height — this is the primary reading font, same as used in devotionals and reading plan passages
- **Verse number:** `text-white/30 text-xs` superscript — small enough to serve as reference without competing with the text
- **Primary CTA:** Existing primary button pattern for "Read on BibleGateway" fallback
- **Chapter buttons:** Small grid buttons (`min-h-[44px] min-w-[44px]`) for touch targets

### New Visual Patterns

1. **Book accordion with nested categories:** Multi-level collapsible accordion. New pattern — existing accordions are single-level. The category sub-headers need a distinct but subordinate visual treatment.
2. **Chapter number grid:** Grid of small numbered buttons for chapter selection within an expanded book. New pattern — similar to the DaySelector but displayed inline as a grid rather than a dropdown.
3. **Verse highlight animation:** `bg-primary/10` background that fades out over 2 seconds when a verse is scrolled into view from search/hash navigation. New animation pattern.
4. **Reading progress indicators:** Mini progress bars or dot indicators on book entries. New sub-pattern for the accordion.

---

## Responsive Behavior

### Mobile (< 640px)

- **Browser page:** Full-width accordion. Chapter number grid wraps naturally (5-6 columns of small buttons). Search results full-width with comfortable padding.
- **Reading view:** Full-width text column with `px-4` padding. Verse text at 16px (slightly smaller for mobile readability). Chapter nav buttons full-width stacked vertically. Chapter selector dropdown full-width.
- **Segmented control:** Full-width, pills equally sized.
- **Touch targets:** All chapter buttons, accordion headers, and nav buttons meet 44px minimum.

### Tablet (640-1024px)

- **Browser page:** Comfortable centered layout within `max-w-4xl`. Chapter grid shows 8-10 columns.
- **Reading view:** Centered in `max-w-2xl`. Chapter nav buttons side by side.
- **Segmented control:** Auto-width, centered.

### Desktop (> 1024px)

- **Browser page:** Centered in `max-w-4xl`. Chapter grid shows 10-12 columns. Search results in a clean list.
- **Reading view:** Centered in `max-w-2xl` with generous side margins. Comfortable reading width.
- **Segmented control:** Auto-width, centered.

---

## Edge Cases

- **Book slug not found:** Show a "Book not found" message with a link back to `/bible`. Use the existing `PlanNotFound` pattern.
- **Chapter number out of range:** If chapter number exceeds the book's total chapters or is < 1, redirect to chapter 1 of that book.
- **URL hash for non-existent verse:** If `#verse-999` is in the URL but the chapter has fewer verses, ignore the hash (no scroll, no highlight).
- **Search with special characters:** Strip or escape regex-special characters from search input to prevent errors.
- **Very long books (Psalms: 150 chapters):** Chapter grid wraps naturally. On mobile, this means many rows — acceptable, as the grid is inside an expandable section.
- **Browser back from reading view:** Returns to `/bible`. If `?book=genesis` is in the URL, Genesis should be expanded in the accordion.
- **Empty progress data:** New logged-in users see no progress indicators until they read their first chapter. No empty state message needed — the absence of progress is natural.
- **Corrupted `wr_bible_progress`:** Storage service recovers gracefully — return empty object `{}` on parse error.

---

## Out of Scope

- **Verse bookmarking/highlighting:** Spec 2 — saving favorite verses, highlighting with colors, adding personal notes.
- **AI verse explanations:** Spec 3 — "Explain this verse" AI feature, cross-references, word studies.
- **Cross-feature integration:** Spec 3 — deep linking from reading plans/devotionals to the Bible reader at specific passages.
- **Audio Bible:** TTS read-aloud for Bible chapters — deferred to a future spec (requires significant audio infrastructure).
- **Multiple translations:** Only WEB for now. Comparing translations or switching translations is future work.
- **Full text for all 66 books:** This spec includes full text for 20 books. Adding the remaining 46 books' full text is ongoing content work, not a separate spec.
- **Backend API:** Entirely frontend. Bible text lives in static data files. Backend serving of Bible content is Phase 3+.
- **Gamification integration:** No faith points for reading chapters, no Bible-specific badges. These may come in Spec 2 or 3.
- **Social sharing of verses:** No "Share this verse" feature. Deferred to Spec 2 with bookmarking.
- **Reading plans integration:** Linking reading plan passages to the Bible reader is Spec 3.
- **Offline reading:** No service worker caching for offline Bible access. Future enhancement.

---

## Acceptance Criteria

### Navbar

- [ ] "Bible" link appears in the main navbar between "Daily Hub" and "Prayer Wall"
- [ ] Link navigates to `/bible`
- [ ] Link appears for both logged-out and logged-in users
- [ ] Mobile drawer includes "Bible" in the same position

### Browser Page — Books Mode

- [ ] `/bible` loads with dark background and PageHero showing "Bible" heading and "The Word of God" subtitle in Lora italic
- [ ] Segmented control shows "Books" (default active) and "Search" modes
- [ ] Old Testament section is expandable and shows 39 books across 5 categories
- [ ] New Testament section is expandable and shows 27 books across 5 categories
- [ ] Category sub-groups are expandable with category name and book count
- [ ] Each book entry shows its name and chapter count
- [ ] Books without full text show a "Coming soon" badge
- [ ] Clicking a book expands a chapter number grid
- [ ] Only one book expanded at a time within a category
- [ ] Chapter buttons are at least 44x44px touch targets
- [ ] Clicking a chapter button navigates to `/bible/:bookSlug/:chapter`
- [ ] For logged-in users, read chapters are visually distinct in the grid
- [ ] For logged-in users, books with read chapters show a progress indicator

### Browser Page — Search Mode

- [ ] Switching to "Search" mode shows a text search input
- [ ] Search is debounced at 300ms
- [ ] "Searching..." indicator appears during debounce
- [ ] Search is case-insensitive
- [ ] Results show book name, chapter, verse number as header
- [ ] Search term is highlighted in result text
- [ ] 1 verse of context before and after the match is shown
- [ ] Clicking a result navigates to `/bible/:bookSlug/:chapter#verse-:number`
- [ ] No results message appears for unmatched queries
- [ ] Minimum 2 characters required to trigger search
- [ ] Note shows "Searching 20 of 66 books"

### Reading View

- [ ] `/bible/:bookSlug/:chapter` loads with dark background and PageHero showing "[Book Name] Chapter X"
- [ ] Book name in hero links back to `/bible?book=:bookSlug`
- [ ] Verses display in single column, `max-w-2xl` centered
- [ ] Verse numbers shown as superscript in `text-white/30`
- [ ] Verse text uses Lora font at comfortable reading size (18px desktop, 16px mobile)
- [ ] Line height is 1.8 for comfortable reading
- [ ] URL hash `#verse-X` scrolls to that verse and triggers a 2-second highlight animation
- [ ] Highlight animation uses `bg-primary/10` that fades out
- [ ] Chapter selector dropdown at top shows "Chapter X of Y"
- [ ] "Previous Chapter" and "Next Chapter" buttons at bottom
- [ ] First chapter hides "Previous Chapter", last chapter hides "Next Chapter"
- [ ] Cross-feature CTAs appear at bottom: "Pray about this chapter" and "Journal your thoughts"
- [ ] "Pray about this chapter" navigates to `/daily?tab=pray`
- [ ] "Journal your thoughts" navigates to `/daily?tab=journal`

### Placeholder for Missing Books

- [ ] Books without full text show "Full text coming soon" message on reading view
- [ ] Message includes "read it on BibleGateway" link
- [ ] BibleGateway link opens in new tab with correct book/chapter URL
- [ ] Placeholder is styled consistently with the reading view (dark background, centered)

### Reading Progress

- [ ] For logged-in users, scrolling to the bottom of a chapter marks it as read
- [ ] Read status stored in `wr_bible_progress` localStorage key
- [ ] Storage uses `wr_` prefix and follows existing patterns
- [ ] Corrupted JSON in `wr_bible_progress` recovers gracefully (returns empty object)
- [ ] Logged-out users see no progress tracking (no IO fires)
- [ ] Progress persists across page refreshes for logged-in users

### Code Splitting

- [ ] Initial bundle does NOT include Bible verse text
- [ ] Verse text loads on demand when navigating to a chapter
- [ ] Book/chapter metadata (names, slugs, chapter counts) is in the main bundle

### Responsive Layout

- [ ] Mobile (375px): full-width accordion, chapter grid 5-6 columns, reading text 16px, nav buttons stacked
- [ ] Tablet (768px): centered layout, chapter grid 8-10 columns, reading text 18px
- [ ] Desktop (1440px): centered `max-w-2xl` reading, `max-w-4xl` browser, chapter grid 10-12 columns
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] No horizontal overflow at any breakpoint

### Accessibility

- [ ] Accordion headers use `aria-expanded` to indicate open/closed state
- [ ] Chapter buttons have `aria-label` (e.g., "Chapter 3" or "Chapter 3 — read" for completed)
- [ ] Search input has associated label
- [ ] Verse highlight animation respects `prefers-reduced-motion`
- [ ] Chapter selector dropdown is keyboard-navigable
- [ ] Reading view has proper heading hierarchy (h1 for book+chapter, verse numbers are not headings)

### No Regressions

- [ ] Existing navbar links still work correctly
- [ ] Mobile drawer includes Bible link without breaking existing items
- [ ] Existing routes are unaffected
- [ ] PageHero component works correctly with the new usage
