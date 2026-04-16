# BB-7.5: Bookmarks

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (verse spans), BB-6 (action sheet + registry), BB-7 (established the store + registry handler patterns)
**Hands off to:** BB-14 (My Bible surfaces bookmarks), BB-16 (export includes bookmarks), BB-19 (last-read resume may compete with bookmarks on the landing)

---

## Overview

When scripture speaks to a hurting heart, sometimes the response is "I want to come back here." Bookmarks are that promise to return — a navigation shortcut to the verses a user needs right now, whether it's Philippians 4:6 during an anxious week or Psalm 23 before a hard conversation. Unlike highlights (which mark emotional meaning), bookmarks mark location. This spec ships persistence, toggle behavior, an optional label, a visual marker on the reader, and the foundation BB-14 will use to render a bookmarks list on the My Bible page.

## User Stories

As a **logged-in user** reading the Bible, I want to bookmark verses so that I can quickly return to passages I need right now without scrolling through chapters.

As a **logged-out visitor** reading the Bible, I want to bookmark verses without creating an account so that I can start building my personal collection of go-to passages immediately.

As a **logged-in user** revisiting a bookmarked chapter, I want to see a visual marker on my bookmarked verses so that I feel reassured they're saved and can trust the persistence.

As a **logged-in user** bookmarking a verse, I want the option to add a short label (e.g., "For Monday's small group") so that I remember why I saved it when I see it later in My Bible.

## Why Bookmarks Are Distinct From Highlights

A user highlighting John 3:16 in Joy is saying: *this verse is joyful to me*. That's a persistent emotional association with the text. They may read John 3 a hundred more times and that highlight stays.

A user bookmarking Philippians 4:6 is saying: *when I'm anxious, I want to find this fast*. That's a navigation shortcut, often time-boxed to a life circumstance. They might delete it in a month when the anxiety passes.

Merging the two into "a highlight color that doubles as a bookmark" confuses both mental models. Users end up with a "Bookmarked" color that isn't really a color, a highlight filter that has to exclude one color, and a My Bible dashboard that can't cleanly separate the two views. Keeping them distinct is the cleaner design, and the cost is small.

## Requirements

### Functional Requirements

#### Data Model

1. Bookmarks persist to `localStorage['bible:bookmarks']` as a flat array, mirroring the highlights store pattern
2. Each bookmark record contains: `id` (UUID), `book` (slug), `chapter` (number), `startVerse` (number), `endVerse` (number, equals startVerse for single-verse), `label?` (string, max 80 chars), `createdAt` (epoch ms)
3. No `updatedAt` field — bookmarks are present or absent; label edits are rare enough not to warrant a timestamp
4. Multi-verse bookmarks are supported (single record spanning the range) but single-verse is the common case
5. Flat array structure — BB-14 filters across the whole Bible in one pass, BB-16 dumps the array, no nesting required

#### Toggle Behavior (Primary Action — No Sub-View)

6. Tapping the Bookmark icon in the primary actions row toggles immediately with no sub-view (unlike highlights which open a color picker)
7. Tap on unbookmarked selection: creates bookmark with no label, icon switches to filled state, shows "Bookmarked" toast with 4-second Undo link
8. Tap on bookmarked selection: removes bookmark, icon switches to outline state, shows "Bookmark removed" toast with 4-second Undo link
9. The action sheet stays open after tapping Bookmark (intentional deviation from Copy actions which auto-close after 400ms — bookmarks are often paired with a highlight or note)
10. `toggleBookmark` returns `{ created: boolean; bookmark: Bookmark | null }` so the handler shows the right toast without a second store call

#### Multi-Verse Toggle Logic

11. If any verse in the range is bookmarked, tapping Bookmark removes all bookmarks overlapping the range
12. If no verse in the range is bookmarked, tapping Bookmark creates one bookmark spanning the full range
13. No overlapping bookmarks from the action sheet — users bookmark individual verses for fine-grained control

#### Undo

14. Tapping Undo within 4 seconds reverts the previous action (create or remove)
15. Undo after create: removes the just-created bookmark by id
16. Undo after remove: restores the removed bookmark(s) with original id, label, and createdAt via `restoreBookmarks()` store method
17. Rapid toggle protection: two quick toggles should not let the first undo clobber the second

#### Optional Label

18. Long-press (mobile) or right-click (desktop) the Bookmark icon in the primary actions row opens a label editor popover
19. Label editor: small rounded rect popover (~300px wide), single-line text input, Save/Cancel buttons, character counter showing N/80
20. If the verse isn't bookmarked yet, saving a label creates the bookmark with that label in one action
21. If the label is empty on save, the bookmark is kept but the label is cleared (not removed)
22. Popover closes on Escape, Enter (saves), tap outside (cancels), or Save/Cancel buttons
23. Long-press on the Bookmark icon inside the sheet does NOT conflict with the existing long-press-to-open-action-sheet gesture on verse text (different DOM contexts)
24. Labels do not render on the reader page — they are private metadata for the bookmarks list view (BB-14)

#### Visual Indicator on the Reader

25. Bookmarked verses display a small filled bookmark icon in the verse number area, positioned to the left of the verse number
26. The marker is roughly the same size as the verse number itself, in a muted theme-scoped token color (`--bookmark-marker`)
27. The marker coexists with highlight backgrounds: highlight is a background fill, the bookmark icon is inline with the number
28. Hover (desktop): the icon brightens slightly to hint interactivity (though tapping it opens the action sheet via normal verse tap, not a direct bookmark action)
29. No animation on the marker — reduced motion is irrelevant since it's static

#### Primary Actions Row State

30. Outline bookmark icon when selection isn't bookmarked; filled icon when bookmarked
31. For multi-verse selections where some but not all verses are bookmarked, the icon shows filled state (same rule as highlights)

#### Storage Layer

32. Store API mirrors BB-7's highlights store pattern: `getAllBookmarks()`, `getBookmarksForChapter()`, `getBookmarkForVerse()`, `isSelectionBookmarked()`, `toggleBookmark()`, `setBookmarkLabel()`, `removeBookmark()`, `removeBookmarksInRange()`, `restoreBookmarks()`, `subscribe()`
33. SSR-safe, reactive, migration-safe — same guards as highlights store
34. QuotaExceededError handling: reuse the shared storage-full toast from BB-7
35. Malformed entries in localStorage filtered silently on read (try/catch around JSON.parse)

#### New Action Sheet Context APIs

36. `ctx.showToast({ message, action })` — renders a toast with optional undo action (if not already present from BB-6)
37. `ctx.keepSheetOpen()` — explicitly signals the sheet should not auto-close (if not already present from BB-6)
38. Both APIs will be reused by BB-8 (notes), BB-13 (share), BB-45 (memorize)

### Non-Functional Requirements

- **Performance**: Bookmark lookup per verse should be O(n) at worst on the flat array for a chapter load; chapter-scoped filtering keeps per-render cost low
- **Accessibility**: Bookmark marker announced to screen readers as part of the verse's accessible label (e.g., "John 3:16, bookmarked"). All tap targets >= 44px on mobile. Lighthouse accessibility score >= 95 with action sheet open
- **Design tokens**: Zero raw hex values — all colors via theme-scoped CSS custom properties

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Bookmark a verse (tap toggle) | Bookmark persists to localStorage, works fully | Same — localStorage persistence | N/A |
| Add a bookmark label (long-press) | Label editor opens, saves to localStorage | Same — localStorage persistence | N/A |
| View bookmark markers on reader | Markers display from localStorage | Same | N/A |
| Remove a bookmark | Removes from localStorage | Same | N/A |

**Note:** Bookmarks are not auth-gated in the current phase. Like highlights (BB-7), they persist to localStorage for both logged-in and logged-out users. Phase 3 backend wiring will sync localStorage to the database for logged-in users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Label editor popover is wider, sits above the action sheet (positioned absolutely). Primary actions row icons at 44px touch targets. Bookmark marker scales with verse number size. |
| Tablet (640-1024px) | Same as mobile layout with slightly more popover width. |
| Desktop (> 1024px) | Label editor popover ~300px wide, anchored to Bookmark icon. Hover brightening on bookmark markers. Right-click opens label editor. |

- The bookmark marker (small icon) scales proportionally with verse number font size across reader typography settings (s/m/l/xl)
- The label editor popover is positioned absolutely, not inside the sheet's stack, so it doesn't push sheet content
- On mobile, the popover sits above the action sheet to avoid being obscured by the keyboard

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The optional label field is limited to 80 characters and is private metadata (not shared publicly), so no crisis detection or content moderation is required.

## Auth & Persistence

- **Logged-out users:** Full bookmark functionality. Bookmarks persist to `localStorage['bible:bookmarks']` as a flat `Bookmark[]` array. Zero server-side persistence.
- **Logged-in users:** Same localStorage persistence. Phase 3 backend wiring will sync to database.
- **localStorage key:** `bible:bookmarks` — follows the Bible redesign wave's namespacing convention (not the `wr_*` prefix used by earlier features)

## Completion & Navigation

N/A — Bookmarks are a persistent annotation feature, not a daily completable activity. No streak/points/completion tracking. BB-14 (My Bible) will surface bookmarks in a list view; BB-19 (last-read resume) is the navigation feature for returning to a reading position.

## Design Notes

- **Theme tokens:** One CSS custom property `--bookmark-marker` with three theme overrides (Midnight, Parchment, Sepia). Much simpler than the 45 highlight tokens BB-7 added.
- **Bookmark marker:** Small filled bookmark SVG icon, positioned absolutely inside the verse number container. Muted color from `--bookmark-marker` token. Does not displace text flow.
- **Primary actions row:** Reuses the same filled/outline icon toggle pattern established by BB-7 for highlights.
- **Toast with undo:** Brief toast at the bottom of the viewport with message + "Undo" link. Auto-dismisses after 4 seconds. This is a new shared pattern that BB-8, BB-13, and BB-45 will reuse.
- **Label editor popover:** Minimal — rounded rect, single-line input, Save/Cancel, character counter. No glass card treatment needed; this is a utility popover, not a content card.
- **Visual coexistence:** Selected (outline ring) > Highlighted (background fill) > Bookmarked (inline icon marker). All three can appear on the same verse simultaneously without visual collision.
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact CSS values on existing action sheet patterns, toast positioning, and theme token structure.
- **New visual pattern:** The bookmark marker icon in the verse number area is a new pattern not yet captured in the design system. Mark derived values as `[UNVERIFIED]` during planning.

## Out of Scope

- **No My Bible bookmarks view** — BB-14 builds the dashboard. BB-7.5 just persists.
- **No bookmark folders or categories** — flat list only. Adding hierarchy re-introduces the highlight-vs-bookmark confusion this spec avoids.
- **No bookmark sharing** — BB-13 share is per-verse, not per-bookmark. Sharing a bookmark is the same as sharing the verse.
- **No bookmark reminders or notifications** — BB-41 handles notifications at the daily verse / streak level, not per-bookmark.
- **No drag-to-reorder** — bookmarks sorted by `createdAt` descending in BB-14. Labels serve as user-defined context.
- **No "recent bookmarks" section on the landing** — BB-19 handles last-read resume. Surfacing recent bookmarks is BB-14's job.
- **No export** — BB-16 handles export including bookmarks.
- **No cross-tab sync** — same as highlights. Optional nice-to-have via `storage` event; out of scope for this spec.
- **No backend persistence** — Phase 3.

## Components to Create

- `src/components/bible/reader/actionSheet/BookmarkLabelEditor.tsx` — popover for optional label editing
- `src/components/bible/reader/VerseBookmarkMarker.tsx` — small bookmark icon rendered in verse number area
- `src/lib/bible/bookmarks/store.ts` — localStorage persistence with reactive subscriptions
- `src/lib/bible/bookmarks/types.ts` — Bookmark type definition
- `src/hooks/useChapterBookmarks.ts` — hook to load bookmarks for a chapter
- `src/hooks/useIsSelectionBookmarked.ts` — hook to check if current selection is bookmarked
- `src/lib/bible/bookmarks/__tests__/store.test.ts` — unit tests for store

## Files to Modify

- `src/components/bible/reader/VerseSpan.tsx` — accept `bookmarked` prop, render marker
- `src/components/bible/reader/ReaderBody.tsx` — load bookmarks via hook, pass to VerseSpan
- `src/components/bible/reader/actionSheet/PrimaryActionsRow.tsx` — show filled Bookmark icon when active, add long-press handler for label editor
- `src/lib/bible/verseActions/registry.ts` — replace bookmark stub with real handler
- `src/lib/bible/verseActions/stubs.ts` — remove bookmark from stub exports
- `src/lib/bible/verseActions/types.ts` — add `showToast` and `keepSheetOpen` to ActionContext if not present
- `src/components/bible/reader/actionSheet/VerseActionSheet.tsx` — implement `keepSheetOpen` behavior, render toast with undo
- Theme tokens file — add `--bookmark-marker` token with three theme overrides

## Notes for Execution

- **BB-7 did the hard pattern work. Reuse it.** The store shape, the subscribe pattern, the SSR guards, the try/catch defensiveness, the QuotaExceededError toast — all carry over. If something feels novel, check whether BB-7 already solved it.
- **The `keepSheetOpen` and `showToast` APIs are the main new surface.** They'll be reused by BB-8 (notes), BB-13 (share), BB-45 (memorize). Get the types right once.
- **The label editor is the most cuttable feature.** If execution runs long, ship toggle behavior and defer the label editor. Most bookmarks won't have labels and the toggle is the core value.
- **The visual marker on the reader is non-negotiable.** A bookmark without a marker feels like nothing happened. The marker makes users trust the persistence.
- **Test the Undo flow paranoidly.** Capture state before toggle, show toast, user taps undo, state restores. Verify `restoreBookmarks` preserves ids. Verify rapid toggles don't corrupt state.
- **The test:** A user bookmarks Philippians 4:6, closes the tab, comes back next week, and sees the bookmark marker the moment they open the chapter.

## Acceptance Criteria

- [ ] Tapping the Bookmark icon in the action sheet on an unbookmarked selection creates a bookmark and shows a "Bookmarked" toast with an Undo link
- [ ] Tapping Bookmark again on the same selection removes the bookmark and shows "Bookmark removed" with Undo
- [ ] The Bookmark icon in the primary actions row shows filled state when the selection is bookmarked, outline state when not
- [ ] The sheet stays open after tapping Bookmark (does not auto-close)
- [ ] Tapping Undo within 4 seconds reverts the previous action
- [ ] Reloading the page shows bookmarks still applied (persistence works)
- [ ] Bookmarked verses render a small bookmark marker icon in the verse number area on the reader page
- [ ] The marker coexists with highlight backgrounds without visual collision
- [ ] Long-press (mobile) or right-click (desktop) the Bookmark icon opens the label editor popover
- [ ] The label editor allows saving a label up to 80 characters with character counter
- [ ] Saving a label on an unbookmarked verse creates the bookmark with that label
- [ ] Saving an empty label on a bookmarked verse clears the label without removing the bookmark
- [ ] The label editor closes on Escape, Enter, tap outside, or Save
- [ ] Multi-verse bookmark creates a single record spanning the range
- [ ] Multi-verse toggle on a partially-bookmarked range removes all overlapping bookmarks
- [ ] `toggleBookmark` returns `{ created: boolean, bookmark: Bookmark | null }` so the handler can show the right toast
- [ ] `restoreBookmarks` preserves ids so Undo works correctly after a remove
- [ ] Theme tokens for the bookmark marker work correctly on Midnight, Parchment, and Sepia
- [ ] QuotaExceededError shows the shared storage-full toast without crashing
- [ ] Malformed entries in localStorage are filtered silently on read
- [ ] `store.ts` unit tests cover: create, read, toggle-create, toggle-remove, label set/clear, restore, subscribe/unsubscribe
- [ ] Lighthouse accessibility score >= 95 with the action sheet open
- [ ] All tap targets >= 44px on mobile
- [ ] Zero raw hex values — all colors via theme tokens
- [ ] The bookmark marker is announced to screen readers as part of the verse's accessible label (e.g., "John 3:16, bookmarked")
- [ ] Long-press on Bookmark icon inside sheet doesn't conflict with long-press-to-open-action-sheet on verse text (different DOM contexts)
