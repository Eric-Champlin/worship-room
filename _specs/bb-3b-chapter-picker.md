# BB-3b: Chapter Picker (Completion Pass)

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-2 (drawer), BB-4 (reader chrome)
**Hands off to:** BB-6 (verse action sheet reuses the view-stack mechanism)

---

## Overview

The Bible reader's book drawer currently dead-ends when a user taps a book — it closes and navigates to chapter 1. This forces users through a rigid linear flow when they want to jump to a specific chapter of a familiar book. BB-3b completes the chapter picker that was partially started in BB-3 by shipping a generic view-stack mechanism inside the drawer, building a chapter grid view, and wiring the reader's top chrome to open it directly. The result is a fluid, two-tap path from "I want to read Romans 8" to reading Romans 8 — reducing friction for users seeking comfort in specific passages.

## User Stories

As a **logged-in user** reading the Bible, I want to tap the "Book Chapter" label in the reader chrome and see a chapter grid for the current book so that I can jump to any chapter without going through the full book list.

As a **logged-in user** browsing books in the drawer, I want to tap a book and see its chapters instead of being immediately navigated away so that I can pick the exact chapter I want.

As a **logged-out visitor** browsing the Bible, I want the same chapter picker experience so that I can explore scripture freely before signing up.

## Requirements

### Functional Requirements

#### View-Stack Mechanism (Drawer Shell)

1. `BibleDrawerProvider` exposes a new API: `pushView(view)`, `popView()`, `resetStack()`, and `currentView` (the top of the stack)
2. `DrawerView` is a discriminated union: `{ type: 'books' }` or `{ type: 'chapters'; bookSlug: string }` — generic enough for BB-6 to add `{ type: 'actions'; verseId: string }` later
3. `open()` with no argument opens with `[{ type: 'books' }]` on the stack (backward-compatible with BB-2)
4. `open({ type: 'chapters', bookSlug })` opens with `[{ type: 'books' }, { type: 'chapters', bookSlug }]` pre-pushed — used by the reader top chrome
5. `pushView` adds a view to the stack and triggers a slide-in animation from the right (~220ms)
6. `popView` removes the top view from the stack and triggers a slide-out animation to the right (~220ms)
7. `close()` clears the stack and closes the drawer
8. The drawer shell uses a router map (`VIEW_COMPONENTS`) to render the component matching `currentView.type` — no hard-coded "books" or "chapters" outside this map
9. Two views can be mounted simultaneously during the slide transition; the outgoing view unmounts after the animation completes
10. Closing and reopening within 24 hours restores the last stack from localStorage (`wr_bible_drawer_stack`)
11. Stacks older than 24 hours reset to just the books view on rehydration

#### Drawer Header (Conditional)

12. When `currentView.type === 'books'`: header is identical to BB-2 state (title, search, OT/NT tabs, close button)
13. When `currentView.type === 'chapters'`: back button (left arrow) on the left, book name as title (e.g. "Romans"), subtitle with chapter count + reading time (e.g. "16 chapters ~ 1 hr 5 min"), OT/NT tabs and search hidden, close button stays on the right

#### Chapter Picker View

14. `ChapterPickerView` renders inside the drawer for a selected book
15. **Continue Reading callout** (conditional): appears only when the book has a prior reading position in `wr_bible_last_read` (if `book` matches the current `bookSlug`). Shows "Continue reading", the chapter number, and a relative timestamp. Tap closes the drawer and routes to `/bible/[book]/[chapter]`. Uses the same elevated card treatment as the landing's Resume Reading card.
16. **Chapter grid**: 6 columns on desktop (480px drawer width), 5 columns on mobile/tablet. Square cells with 44px minimum tap target. Each cell shows a centered chapter number, a small filled dot in the top-right corner if the chapter has been read at least once (from `wr_bible_progress`), and a persistent border-glow ring if this is the last-read chapter for the book. Tap closes the drawer entirely and routes to `/bible/[book]/[chapter]`. Desktop hover: glow intensifies, scale 1.02.
17. **Footer caption**: "Tap a chapter to read" — small text, hidden on mobile
18. Chapter count sourced from `bookMetadata.ts` (`BOOK_METADATA`). Read state sourced from `wr_bible_progress` (`useBibleProgress` hook). Last-read chapter derived from `wr_bible_last_read` when the book matches.

#### Top Chrome Wiring

19. The reader's center "Book Chapter" label in `ReaderChrome.tsx` opens the drawer with the chapter picker pre-pushed: `bibleDrawer.open({ type: 'chapters', bookSlug: currentBook })`. The `aria-label="Open chapter picker"` now truthfully matches the behavior.

#### Book Card Behavior Change

20. Tapping a book card in `BooksDrawerContent` pushes the chapters view onto the stack (`pushView({ type: 'chapters', bookSlug })`) instead of closing the drawer and navigating to `/{slug}/1`. Selecting a chapter from the picker is what finally closes the drawer and navigates.

#### Orphaned ChapterGrid.tsx

21. The existing `ChapterGrid.tsx` uses responsive columns (5/6/8/10/12), `<Link>` elements, and a different read-state visual treatment than what this spec requires. It does not match the spec (6/5 column fixed grid, `<button>` elements, dot indicators, glow ring). Delete the orphan and build the grid fresh inside `ChapterPickerView.tsx`.

#### Keyboard Shortcuts (Chapter View)

22. `Escape` in chapter view pops back to books view
23. `Escape` in books view closes the drawer (existing BB-2 behavior)
24. Number keys in chapter view: typing digits (e.g. "23") then Enter opens that chapter. A small overlay (`ChapterJumpOverlay`) displays the typed digits and fades after 1s of inactivity. The overlay has `aria-live="polite"`.
25. Arrow keys navigate the chapter grid cells
26. Enter on a focused chapter cell opens it
27. Backspace in chapter view pops to books view (alternative to back button)

### Non-Functional Requirements

- **Animation**: View push/pop slides over ~220ms with the design system ease curve. Distinct from the drawer's own open/close slide (different axis). Reduced motion: instant swap, no slide.
- **Accessibility**: Lighthouse accessibility score >= 95 with the chapter picker open
- **Performance**: Chapter grid renders immediately for all books (max 150 cells for Psalms — no virtualization needed at this scale)
- **Design tokens**: Zero raw hex values; all colors, borders, shadows use Tailwind tokens or design system constants

## Auth Gating

The Bible reader and drawer are **public features** — no authentication required for any interaction.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Open drawer from reader chrome | Opens chapter picker for current book | Same | N/A |
| Open drawer from books view (book card tap) | Pushes chapter picker view | Same | N/A |
| Tap a chapter cell | Closes drawer, navigates to chapter | Same | N/A |
| Tap Continue Reading callout | Closes drawer, navigates to chapter | Same | N/A |
| Use number-key jump | Opens the chapter | Same | N/A |
| Back button / Escape / Backspace | Pops to books view | Same | N/A |

Note: `markChapterRead()` in the `useBibleProgress` hook is already auth-gated (no-ops when logged out). The chapter picker itself is read-only from progress data and does not write — all write logic lives in the reader (BB-4).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Drawer is full-width. Chapter grid: 5 columns. Footer caption hidden. 44px min tap targets enforced. Swipe-right to close drawer (existing BB-2). |
| Tablet (640-1024px) | Drawer is 420px wide. Chapter grid: 5 columns. Footer caption visible. |
| Desktop (> 1024px) | Drawer is 480px wide. Chapter grid: 6 columns. Footer caption visible. Hover effects on chapter cells (glow intensify, scale 1.02). |

The view-stack slide animation runs on the horizontal axis (slide in from right / slide out to right), which is distinct from the drawer's own open/close animation (also horizontal but affecting the entire drawer panel). During a view transition, both the incoming and outgoing views are mounted; the outgoing view unmounts after the animation completes.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users**: Can browse the drawer, see chapter grids, navigate to any chapter. Chapter read-state indicators will be empty (no progress tracked for logged-out users). Continue Reading callout will not appear (no `wr_bible_last_read` data).
- **Logged-in users**: Chapter read dots and last-read glow ring reflect their reading progress from `wr_bible_progress` and `wr_bible_last_read`. Continue Reading callout appears when applicable.
- **localStorage usage**:
  - **Reads**: `wr_bible_progress` (chapter read state), `wr_bible_last_read` (last read position for continue callout and glow ring), `wr_bible_books_tab` (OT/NT tab state, existing)
  - **Writes**: `wr_bible_drawer_stack` (view stack persistence with 24-hour TTL) — new key
  - **No writes to progress data** — all progress writes happen in the reader (BB-4), not the chapter picker

### New localStorage Key

| Key | Type | Feature |
|-----|------|---------|
| `wr_bible_drawer_stack` | `{ stack: DrawerView[], timestamp: number }` | View stack persistence across reloads (24-hour TTL) |

## Completion & Navigation

N/A — standalone feature, not part of the Daily Hub tabbed experience.

## Design Notes

- **Drawer styling**: Matches BB-2's existing dark frosted glass treatment (`rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`). The design system's `BibleDrawer` component already implements this.
- **Chapter cells**: Use the `FrostedCard`-adjacent styling pattern — `bg-white/5 border border-white/10 rounded-lg` for unread, with `border-primary/30 bg-primary/20` for read chapters (similar to what `ChapterGrid.tsx` used but refined with the dot indicator and glow ring).
- **Read indicator dot**: Small (6-8px) filled circle in the top-right corner of the cell, using `bg-primary` or `bg-primary-lt`.
- **Last-read glow ring**: `ring-2 ring-primary/50 shadow-[0_0_12px_rgba(109,40,217,0.3)]` — a persistent border glow that makes the current chapter stand out without animation.
- **Continue Reading callout**: Elevated card treatment matching the Bible landing page's Resume Reading card — slightly stronger `bg-white/[0.08]` with `border-white/[0.15]`.
- **Back button**: Lucide `ChevronLeft` or `ArrowLeft` icon, same size/positioning as the close button on the opposite side.
- **Slide transition**: CSS `transform: translateX()` with 220ms duration and the design system's ease curve. `prefers-reduced-motion` replaces with instant swap.
- **Number-jump overlay**: Small floating overlay near the bottom of the chapter grid, `bg-hero-mid/90 backdrop-blur-sm rounded-lg px-4 py-2`, monospace or tabular-nums font, fades in/out over 200ms.
- **Design system recon**: `_plans/recon/design-system.md` exists and can be referenced for exact CSS values during planning.

### New Visual Patterns

1. **View-stack slide transition** (push/pop between drawer views) — new animation pattern not yet in the design system. Values to be verified during planning.
2. **Chapter cell with dot indicator and glow ring** — new cell treatment combining read-state dot + last-read glow.
3. **Number-jump overlay** — new transient overlay pattern for keyboard chapter navigation.

## Accessibility

- Back button: `aria-label="Back to books"`
- Chapter cells: real `<button>` elements with `aria-label="{BookName} chapter {N}, {read|unread}"`
- Continue Reading callout: `aria-label="Continue reading {BookName} chapter {N}"`
- Focus moves to the back button on push (chapter view entry)
- Focus returns to the previously selected book card on pop (back to books view)
- Focus trap stays within the drawer through view transitions (existing `useFocusTrap` hook)
- Screen reader announces view changes via an `aria-live="polite"` region: "Showing chapters in {BookName}"
- Number-jump overlay has `aria-live="polite"` so typed digits are announced
- `Escape` key behavior contextual: pops view in chapter view, closes drawer in books view

## Out of Scope

- No chapter picker for arbitrary books from non-reader pages (only from the books drawer and reader top chrome)
- No reading plan indicators on chapter cells — BB-21 territory
- No bookmark indicators on chapter cells — BB-7.5 territory
- No write logic for reading progress — BB-4 already handles this when a chapter loads
- No changes to the bottom `ReaderChapterNav` dropdown — it stays as a redundant nav affordance
- No real authentication — simulated auth (Phase 3 for real JWT)
- No backend API calls — all data from localStorage

## Acceptance Criteria

- [ ] Tapping "John 3" in the reader top chrome opens the drawer directly to the chapter picker for John
- [ ] Tapping a book in the books drawer slides the chapter picker view in from the right
- [ ] The drawer header shows a back button, book name, and chapter count + reading time when in chapter view
- [ ] Back button pops the view and reveals the book list with a slide-out animation
- [ ] The chapter grid renders the correct chapter count for Genesis (50), Psalms (150), Obadiah (1), Revelation (22)
- [ ] Read chapters show the small filled dot indicator in the top-right corner
- [ ] The last-read chapter in the book shows the persistent border-glow ring
- [ ] The Continue Reading callout appears only when the book has prior reading in `wr_bible_last_read`
- [ ] Tapping a chapter closes the drawer entirely and routes to `/bible/[book]/[chapter]`
- [ ] The drawer view stack persists to `wr_bible_drawer_stack` across page reloads (within 24 hours)
- [ ] Stacks older than 24 hours reset to the books view on rehydration
- [ ] Number-key jump: typing "23" + Enter opens chapter 23 in the current book; overlay displays typed digits
- [ ] Arrow keys navigate the chapter grid cells
- [ ] Escape in chapter view pops to books view; Escape in books view closes drawer
- [ ] Backspace in chapter view pops to books view
- [ ] Reduced motion: view transitions are instant swaps (no slide animation)
- [ ] Focus trap stays inside the drawer through view transitions
- [ ] Screen reader announces "Showing chapters in {BookName}" on view change
- [ ] `BibleDrawerProvider` exposes `pushView`, `popView`, `resetStack`, and `currentView`
- [ ] The orphaned `ChapterGrid.tsx` is deleted (rebuilt fresh in `ChapterPickerView`)
- [ ] Zero raw hex values; all colors/borders/shadows use design system tokens
- [ ] Lighthouse accessibility score >= 95 with the chapter picker open
- [ ] Chapter grid shows 6 columns on desktop (480px drawer) and 5 columns on mobile/tablet
- [ ] 44px minimum tap target on all chapter cells
- [ ] The view-stack mechanism is generic (uses a router map) so BB-6 can add new view types without modifying the stack logic

## Notes for Execution

- The view-stack mechanism is the load-bearing piece. Build it as a generic primitive on `BibleDrawer` (push/pop/reset/currentView with a router map) so BB-6's action sheet can reuse the exact same pattern. Do not hard-code "books" and "chapters" anywhere outside the router map.
- The slide animation between views is distinct from the drawer's own open/close slide. Two animations, two axes.
- The 24-hour persistence window prevents a stale drawer state from confusing users on their next visit without making them lose their place within a single session.
- The existing `ChapterGrid.tsx` uses `<Link>` elements, a different column layout (5/6/8/10/12), and lacks dot indicators / glow ring. Rebuild fresh inside `ChapterPickerView.tsx` and delete the orphan.
- After this spec ships, BB-6 can follow its original plan unchanged — the view-stack pattern it assumes will actually exist.

## Components to Create

- `src/components/bible/books/ChapterPickerView.tsx` — Chapter grid view for the drawer
- `src/components/bible/books/ContinueReadingCallout.tsx` — Conditional resume-reading card
- `src/components/bible/books/ChapterJumpOverlay.tsx` — Number-key jump digit display
- `src/lib/bible/drawerStack.ts` — SSR-safe read/write of `wr_bible_drawer_stack` with 24-hour TTL

## Files to Modify

- `src/components/bible/BibleDrawerProvider.tsx` (or `src/state/BibleDrawerProvider.tsx`) — add view-stack state + `pushView`, `popView`, `resetStack`, `currentView`, localStorage persistence
- `src/components/bible/BibleDrawer.tsx` — view-stack rendering with router map, slide transitions, conditional header
- `src/components/bible/books/BooksDrawerContent.tsx` — book card onClick now pushes chapters view instead of calling `onSelectBook`
- `src/components/bible/reader/ReaderChrome.tsx` — center label opens drawer with chapter view pre-pushed
- `src/components/bible/ChapterGrid.tsx` — DELETE (orphaned, does not match spec)
