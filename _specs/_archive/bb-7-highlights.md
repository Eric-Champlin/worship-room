# BB-7: Highlights

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (reader + verse spans), BB-6 (verse action sheet + registry)
**Hands off to:** BB-14 (My Bible surfaces highlights), BB-16 (export includes highlights), BB-46 (verse echoes read highlight timestamps)

---

## Overview

When scripture speaks to someone, they want to mark it — to say "this one matters." Highlighting is the first persistent action in the Bible redesign wave: the moment the reader stops feeling like a demo and starts feeling like the user's own space. BB-7 makes the Highlight action in the verse action sheet functional, with five emotion-mapped colors that persist to localStorage, render immediately, and survive page reloads indefinitely.

## User Stories

As a **logged-in user** reading the Bible, I want to highlight verses in emotion-mapped colors so that I can mark passages that speak to me and find them later by how they made me feel.

As a **logged-out visitor** reading the Bible, I want to highlight verses without creating an account so that I can start making the Bible my own immediately — and know my highlights will still be there tomorrow.

As a **logged-in user** reading a passage, I want to select a range of verses and highlight the entire range in one color so that I can mark whole passages, not just individual verses.

## Requirements

### Functional Requirements

#### Emotion-Color Mapping

1. Five highlight colors, each mapped to a reading emotion:
   - **Peace** — soft blue, the color of still water
   - **Conviction** — warm amber, the color of a fire that refines
   - **Joy** — bright gold, the color of sunrise
   - **Struggle** — muted violet, the color of bruised evenings
   - **Promise** — deep green, the color of a field after rain
2. No custom colors — the fixed five enable emotion-based filtering in BB-14 (My Bible)

#### Color Picker Sub-View

3. Tapping the Highlight action in the verse action sheet opens a color picker sub-view (replacing the BB-6 stub)
4. The picker shows a back button (returns to action sheet root without applying), a title ("Choose a color"), and five colored circular swatches in a horizontal row
5. Each swatch is a circular button (~56px diameter mobile, ~64px desktop) filled with the color at full opacity, with the emotion label underneath ("Peace", "Conviction", "Joy", "Struggle", "Promise")
6. Tap target extends to include the label so small fingers don't miss — all tap targets >= 44px
7. If the current selection is already highlighted, the picker shows the current color pre-selected (filled inner dot + thicker outer ring) and a sixth **Remove** button at the end of the row
8. If the current selection is NOT highlighted, the Remove button is hidden
9. Tapping a color swatch immediately applies the highlight, the verse repaints in that color, and the sheet closes after ~300ms so the user sees the color before dismissal
10. Tapping Remove deletes the highlight for this range, the verse returns to unhighlighted, and the sheet closes
11. Tapping the back button returns to the action sheet root without applying anything

#### Highlight Application & Range Math

12. Single-verse selections create a single highlight record
13. Multi-verse selections (e.g., John 3:16-18) create a single highlight record spanning the range — not three separate records
14. Applying a highlight to a verse that already has a different color **replaces** the existing color (same range = color swap, not duplicate creation)
15. Applying a highlight to a range that **partially overlaps** an existing highlight **splits** the existing highlight: the overlapping verses get the new color, the non-overlapping portions retain their original color as separate records
16. Example: Highlight John 3:16-18 in Peace, then highlight John 3:17 in Joy. Result: John 3:16 = Peace, John 3:17 = Joy, John 3:18 = Peace (three records after the split)

#### Persistence

17. Highlights persist to localStorage as a flat array (not nested by book)
18. Reloading the page shows all highlights exactly where the user left them
19. Highlights persist across book boundaries — creating highlights in John and Romans doesn't corrupt either
20. No account required for persistence — localStorage is the storage layer
21. No sync across devices — BB-16 export/import is the manual sync mechanism

#### Reader Rendering

22. Highlighted verses show a background fill in the color's low-opacity background variant. No border. Text color unchanged.
23. Long verses wrapping multiple lines render the highlight background correctly on all lines (use `box-decoration-break: clone`)
24. If a highlight range crosses a paragraph break, each verse in the range gets its own background fill independently
25. When a highlighted verse is also selected (via the action sheet), both the selection ring and the highlight background are visible simultaneously. Ring color matches the highlight color if present.
26. Switching reading themes (Midnight/Parchment/Sepia) shows theme-appropriate highlight colors — darker themes use lower opacity backgrounds (~15-20%), lighter themes use higher opacity (~25-30%) so highlights don't look like smudges

#### Action Sheet Integration

27. When a user taps a verse that's already highlighted, the Highlight icon in the action sheet shows a filled version in the current highlight color (not the default outline)
28. The verse preview area shows the highlight color as a small swatch next to the reference when the verse is highlighted
29. For multi-verse ranges where some but not all verses are highlighted: the Highlight icon shows filled using the color of the first highlighted verse; the picker opens with no pre-selection (mixed colors)

#### Feedback Animation

30. On first application, the highlight background fades in over ~250ms (easing from 0 to full opacity)
31. A subtle pulse on the highlighted verse(s) on first application — one gentle brightness pulse, ~400ms, then settles
32. `prefers-reduced-motion`: instant paint, no pulse
33. No sound effect

### Non-Functional Requirements

- **Performance**: No upper limit on highlights. 1,000+ highlights (~120KB) well within localStorage's ~5MB cap. Chapter render cost is O(N) filter — sub-millisecond for 1,000 highlights.
- **Storage quota**: Write path catches `QuotaExceededError` and shows a toast: "Storage full — export your highlights and clear old ones." (BB-16 export is the release valve.)
- **Malformed data tolerance**: Read logic tolerates missing or malformed localStorage entries — filters invalid records silently, never throws.
- **Accessibility**: Lighthouse score >= 95 with the picker open. All tap targets >= 44px on mobile. Color picker swatches have accessible labels.

## Auth Gating

Highlights require **no authentication**. This is the first feature in the wave that delivers real persistence to every visitor.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap Highlight in action sheet | Opens color picker | Opens color picker | N/A |
| Apply a highlight color | Applies + persists to localStorage | Applies + persists to localStorage | N/A |
| Remove a highlight | Removes from localStorage | Removes from localStorage | N/A |
| Change a highlight color | Updates in localStorage | Updates in localStorage | N/A |

**No auth gate on any highlight action.** Both logged-in and logged-out users get identical behavior. Phase 3 will add server sync for logged-in users; until then, localStorage is the single source of truth for everyone.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Color picker: 5 swatches in a single row, ~56px diameter, emotion labels below each. Remove button at end of row. Sheet is full-width bottom sheet. |
| Tablet (640-1024px) | Same layout as mobile, slightly more spacing between swatches. Sheet is 440px centered. |
| Desktop (> 1024px) | Swatches slightly larger (~64px diameter). Sheet is 440px positioned bottom-center of reader. |

- Swatch layout is always a single horizontal row — no grid or wrapping
- Touch targets are >= 44px at all breakpoints
- The color picker sub-view inherits the sheet's existing responsive behavior from BB-6

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full functionality. Highlights persist to localStorage indefinitely with no account.
- **Logged-in users:** Same behavior as logged-out. Phase 3 will add server sync.
- **Route type:** Public (the Bible reader is public)

### Data Model

Highlights persist to localStorage as a flat array:

```typescript
type HighlightColor = 'peace' | 'conviction' | 'joy' | 'struggle' | 'promise';

type Highlight = {
  id: string;              // UUID, generated on create
  book: string;            // slug, e.g. 'john'
  chapter: number;
  startVerse: number;
  endVerse: number;        // equals startVerse for single-verse highlights
  color: HighlightColor;
  createdAt: number;       // epoch ms
  updatedAt: number;       // epoch ms, for color changes
};
```

**localStorage key:** Uses existing `wr_bible_highlights` key (per established `wr_*` convention). Shape: `Highlight[]`.

**Why flat (not nested by book):** BB-14 needs "all highlights ever" sorted by date, filtered by color. BB-16 export dumps the whole array. BB-46 verse echoes needs highlights across all books. Flat = single `.filter()` pass for every consumer.

**Why verse ranges (not per-verse rows):** A user highlighting John 3:16-18 should get one record, not three. Ranges matter for BB-14 display ("John 3:16-18 — Joy"), BB-13 share cards, and general data hygiene.

### Storage Layer API

All highlight reads and writes go through a single store module:

- `getAllHighlights(): Highlight[]`
- `getHighlightsForChapter(book, chapter): Highlight[]`
- `getHighlightForVerse(book, chapter, verse): Highlight | null`
- `applyHighlight(selection, color): Highlight` — handles overlapping ranges via split logic
- `removeHighlight(id): void`
- `removeHighlightsInRange(selection): void`
- `updateHighlightColor(id, color): void`
- `subscribe(listener: () => void): () => void` — pub-sub for reactive re-renders

**SSR-safe:** Reads return `[]` or `null` on server; writes are no-ops on server.

**Reactive:** The `subscribe` mechanism is load-bearing for BB-14 (My Bible). It lets the reader and future My Bible page re-render when highlights change from any source.

**Migration-safe:** Reads tolerate missing/malformed entries via try/catch + filter. BB-16 will add schema versioning; BB-7 writes v1.

## Design Notes

### Color Tokens

Add semantic highlight tokens to the design system, scoped to each reading theme (using the existing `[data-reader-theme="*"]` pattern in `index.css`):

For each of the five colors (peace, conviction, joy, struggle, promise), three variants per theme:
- `--highlight-{color}` — full-intensity swatch color
- `--highlight-{color}-bg` — low-opacity background for applied highlights
- `--highlight-{color}-ring` — ring color for selection indicator on highlighted verses

That's 5 colors x 3 variants x 3 themes = **45 token values**.

**Opacity guidance:**
- Midnight (dark): backgrounds at ~15-20% opacity
- Parchment (cream) and Sepia (warm tan): backgrounds at ~25-30% opacity — lighter themes need more saturation to read as highlights, not smudges
- Don't just lighten Midnight colors for light themes — pick actual colors that feel right on cream and tan

**Zero raw hex values in component code.** All colors must reference tokens.

### Existing Patterns Referenced

- **Verse action sheet** (BB-6) — the sheet structure, sub-view stack, and handler registry are the foundation this feature plugs into
- **Reader theme tokens** — existing `[data-reader-theme]` scoped CSS custom properties in `index.css` for Midnight/Parchment/Sepia
- **Selection ring** — BB-6's verse selection visual state (outline ring) which BB-7 extends with highlight-aware ring colors

### New Visual Patterns

- **Highlight background fill** — inline `<span>` background using `box-decoration-break: clone` for multi-line verses (new pattern, not yet in design system)
- **Color picker swatch** — circular button with emotion label, selected-state indicator (filled inner dot + thicker ring) (new pattern)
- **Highlight pulse animation** — single brightness pulse on first application, 400ms (new micro-animation)

## Range Math (Critical Logic)

The range overlap/split logic is the most dangerous part of this spec. It handles:

- **Same range overwrite:** Highlight John 3:16 in Peace, then John 3:16 in Joy → one record, color = Joy
- **Partial overlap (left):** Existing 16-18 Peace, new 15-17 Joy → 15-17 Joy + 18 Peace
- **Partial overlap (right):** Existing 16-18 Peace, new 17-19 Joy → 16 Peace + 17-19 Joy
- **Engulfing range:** Existing 16-18 Peace, new 15-20 Joy → 15-20 Joy (old record deleted)
- **Engulfed range:** Existing 15-20 Peace, new 17-18 Joy → 15-16 Peace + 17-18 Joy + 19-20 Peace
- **Adjacent ranges (no merge):** Existing 16 Peace + 17 Joy → they stay separate; adjacent highlights don't merge even if same color
- **Multi-split:** New range crosses three existing highlights → all three split appropriately

**This logic needs thorough unit tests before any integration.** A buggy range op will corrupt highlights in a way users can't recover without manually editing localStorage.

## Completion & Navigation

N/A — standalone feature within the Bible reader. No completion signal to tracking system. No cross-tab CTAs.

## Out of Scope

- **My Bible integration** — BB-14 will read from the store and render a highlights dashboard
- **Export/import** — BB-16 will serialize the store for export and add schema versioning
- **Verse echoes** — BB-46 will read highlight timestamps
- **Share card with highlight color** — BB-13 may read highlight color for share cards
- **Sync across devices** — no account = no sync; BB-16 export/import is the manual mechanism
- **Custom colors** — five is the list; adding custom colors breaks BB-14's emotion-filter feature
- **Highlight notes** — notes are BB-8, separate from highlights; a verse can have both independently
- **Highlight styles** (underline, bold, strikethrough) — only background fill
- **Undo** — if a user applies the wrong color, they pick a different one or hit Remove
- **Cross-tab sync** (AC #16 in the user spec) — listening for `storage` events from other browser tabs is a nice-to-have; flag as stretch goal if it adds scope

## Acceptance Criteria

- [ ] Tapping Highlight in the action sheet opens the color picker sub-view
- [ ] The picker shows five colored swatches with emotion labels (Peace, Conviction, Joy, Struggle, Promise)
- [ ] Tapping a swatch applies the highlight to the selected range and closes the sheet
- [ ] The verse background repaints in the correct color immediately
- [ ] Reloading the page shows the highlight still applied (persistence works)
- [ ] Tapping a highlighted verse shows the action sheet with the Highlight icon filled in the current color
- [ ] The color picker opens with the current color pre-selected when revisiting a highlighted verse
- [ ] The Remove button is visible only when the current selection is highlighted
- [ ] Tapping Remove deletes the highlight and repaints the verse to unhighlighted
- [ ] Tapping a different color on an already-highlighted verse updates the color (not creates a second record)
- [ ] Multi-verse selections apply a single highlight record spanning the range
- [ ] Applying a highlight that partially overlaps an existing one correctly splits the existing highlight
- [ ] Long verses spanning multiple lines render the highlight background correctly on all lines (`box-decoration-break: clone`)
- [ ] Switching reading themes (Midnight/Parchment/Sepia) shows theme-appropriate highlight colors
- [ ] The first-application pulse animation plays on initial highlight and respects `prefers-reduced-motion`
- [ ] `QuotaExceededError` shows the "Storage full" toast without crashing
- [ ] Malformed entries in localStorage are filtered out silently on read without crashing
- [ ] Range operations unit tests cover: same range overwrite, partial overlap split (left and right), engulfing range, engulfed range, adjacent ranges (no merge), multi-split across three existing highlights
- [ ] Store unit tests cover: create, read, update color, delete, list-all, list-for-chapter, subscribe/unsubscribe
- [ ] Highlights persist correctly across book boundaries (John + Romans highlights don't corrupt each other)
- [ ] Lighthouse accessibility score >= 95 with the picker open
- [ ] All tap targets >= 44px on mobile
- [ ] Zero raw hex values in any new component code — all colors reference design tokens

## Notes for Execution

- **Range math is the dangerous part.** Write the tests first. Cover every overlap topology: identical, disjoint, partial-left, partial-right, engulfing, engulfed, adjacent. Treat this module like financial code.
- **Theme-scoped tokens are the second-hardest part.** Parchment and Sepia highlights need actual light-theme colors that feel right on cream and tan — not just lightened Midnight colors.
- **The pulse animation is a wow-moment detail.** It's the first time a user sees a persistent mark on scripture. The micro-animation tells their brain "this is mine now."
- **Test persistence paranoidly.** Apply highlight, reload, apply another, reload, remove one, reload, change color, reload. Every transition must survive.
- **The `subscribe` mechanism is load-bearing for BB-14.** Get it right once and BB-14 is "render the subscribed list."
- **The ultimate test:** Open John 3 in the reader, highlight John 3:16 in Joy, close the tab, reopen it. If your eyes land on that gold verse immediately, the spec worked.
