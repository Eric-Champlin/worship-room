# Feature: BB-43 Reading Heatmap / Bible Progress Map

**Branch:** `bible-redesign` (no new branch — commits directly to `bible-redesign`)

**Depends on:**
- BB-42 (Full-text search — already shipped)
- BB-17 (Reading streak system — `wr_bible_streak` daily-read tracking)
- BB-7 (Highlights system — `wr_bible_highlights` per-verse highlight data)
- BB-19 (Reading session tracking — per-chapter completion state if it exists)
- BB-21 (Reading plans — plan-day completion state)
- BB-38 (Deep linking — chapter URL contract `/bible/<book>/<chapter>`)
- BB-40 (SEO + canonical URLs — My Bible page metadata)

**Hands off to:**
- BB-45 (Verse memorization deck) — independent
- BB-46 (Verse echoes) — could consume the heatmap data structure
- A future spec for plan-completion or chapter-mastery overlays
- A future export spec for reading history as JSON or PDF

---

## Overview

Add two visual data displays to the My Bible page (`/bible/my`) that surface the user's existing reading activity in a way they can see and benefit from. The first is a GitHub-contribution-style **reading heatmap** showing daily reading activity for the past year. The second is a **Bible progress map** showing all 66 books with visual indicators for which chapters the user has read, partially read, or not yet visited.

Together they answer two questions a returning user naturally asks: "How consistent have I been?" and "How much of the Bible have I covered?" Both displays read from existing localStorage state — BB-43 doesn't add new tracking, it visualizes what's already being tracked.

The single most powerful retention mechanism in any habit app is showing the user their own progress. GitHub's contribution graph, Duolingo's streak calendar, and Apple Health's activity rings all work because seeing your own pattern over time creates intrinsic motivation. Worship Room already tracks the data needed for both visualizations — none of this data is currently shown back to the user in any meaningful visual form.

Both visualizations are explicitly NOT scored, ranked, or shamed. No "you missed 30 days" or "you're behind." The data speaks for itself. This matches BB-31/BB-32's anti-pressure voice — the heatmap is informational, not motivational.

## User Story

As a **logged-in user**, I want to **see a visual overview of my reading consistency over the past year and my coverage across the Bible's 66 books** so that **I can appreciate my reading journey and discover which parts of Scripture I haven't explored yet, without pressure or shame.**

---

## Requirements

### Functional Requirements

#### Data Aggregation Layer (`frontend/src/lib/heatmap/`)

1. A new module exports `getDailyActivityForLastYear()` and `getBibleCoverage()` as pure functions
2. `getDailyActivityForLastYear()` returns a 365-day array (366 in leap years) ending today, each entry containing the date, chapter count, and optional reference list
3. `getBibleCoverage()` returns a 66-element array in canonical order, each entry containing the book name/slug, total chapter count, set of read chapters, and set of highlighted chapters
4. Data reads from `wr_bible_streak` (BB-17), `wr_bible_highlights` (BB-7), `wr_bible_progress` (chapters read per book), and BB-19 reading session data if it exists
5. If no chapter-level coverage data exists in any existing key, a new fallback key `wr_chapters_visited` is added and BibleReader writes to it on chapter mount — **plan phase decides via recon**

#### Reading Heatmap Component

6. A 53-column x 7-row grid (week columns x day-of-week rows), GitHub-contribution-style
7. Leftmost column = week starting closest to one year ago; rightmost = current week
8. Cell sizing: 8-12px on mobile, 12-14px on desktop, 2px border radius
9. 5-state color scale for cells:
   - No activity: `bg-white/5`
   - 1-2 chapters: `bg-primary/30`
   - 3-5 chapters: `bg-primary/50`
   - 6-9 chapters: `bg-primary/70`
   - 10+ chapters: `bg-primary/90`
10. Hover (desktop) or tap (mobile) shows tooltip: "March 12, 2026 — 3 chapters read: John 3, Romans 8, Psalm 23"
11. Today's cell has a subtle visible border marker
12. Month labels along the top showing where each month starts
13. Day-of-week labels on the left ("Mon", "Wed", "Fri")
14. Legend below the grid: color scale from "Less" to "More"
15. Above the grid: "You've read on N of the past 365 days" — count only, no praise or judgment
16. Current streak shown only when > 0: "Current streak: N days" — informational language
17. Empty state: show empty grid with "Your reading history will show up here as you read." — no fake data
18. Tapping today's cell navigates to the BibleReader entry point or daily devotional
19. All other cells are informational only, not navigable

#### Bible Progress Map Component

20. Two sections: Old Testament (39 books) and New Testament (27 books) with section headings
21. Each book is a card with the book name, read count ("12 / 50 chapters"), and a horizontal row of per-chapter cells
22. Chapter cells: small squares (6-10px), 3-state color scale:
    - Not read: `bg-white/8`
    - Read: `bg-primary/60`
    - Highlighted (at least one highlight): `bg-primary/80`
23. Books in responsive grid: 1 column (mobile), 2-3 columns (tablet), 4-5 columns (desktop)
24. Books with many chapters wrap cell rows to multiple lines (Option A — uniform cell size)
25. Tapping a chapter cell navigates to `/bible/<book>/<chapter>` per BB-38 deep link contract
26. Tapping a book name navigates to the book's chapter list
27. Above the map: "X of 1,189 chapters read" and "Y of 66 books visited" — counts only, no percentages
28. Empty state: "Your reading map will show up here as you read."

#### Integration

29. Both components integrated into `MyBiblePage` — heatmap at the top, progress map below, existing highlights/notes/bookmarks content below that
30. No changes to existing My Bible page auth gating or SEO settings

### Non-Functional Requirements

- **Performance:** Heatmap (365 cells) and progress map (1,189 cells) must each render in under 100ms on a mid-range mobile device. Use CSS grid/flexbox, not SVG
- **Accessibility:** Keyboard-navigable cells, ARIA labels for tooltips, screen-reader-friendly summary text
- **Zero new packages:** Both components are hand-built with React + Tailwind — no charting library

---

## Auth Gating

The My Bible page is already auth-gated at the route level. BB-43 doesn't add any new auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View reading heatmap | Page is auth-gated — redirects before reaching component | Full heatmap rendered with user's data | N/A |
| View Bible progress map | Page is auth-gated — redirects before reaching component | Full progress map rendered with user's data | N/A |
| Hover/tap heatmap cell | N/A (page gated) | Shows tooltip with date and chapter details | N/A |
| Tap chapter cell in progress map | N/A (page gated) | Navigates to `/bible/<book>/<chapter>` | N/A |
| Tap today's heatmap cell | N/A (page gated) | Navigates to BibleReader or daily devotional | N/A |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Heatmap cells 8-10px, horizontally scrollable if needed. Progress map books in 1-column grid. Chapter cells 6px. Tooltip via tap. |
| Tablet (640-1024px) | Heatmap cells 10-12px, fits without scroll. Progress map books in 2-3 column grid. Chapter cells 7-8px. |
| Desktop (> 1024px) | Heatmap cells 12-14px. Progress map books in 4-5 column grid. Chapter cells 8-10px. Tooltip on hover. |

**Additional responsive notes:**
- The heatmap's 53-column grid is naturally wide. On mobile, the grid may need horizontal scroll within a container, or cells may shrink to 8px to fit
- Day-of-week labels may abbreviate to single letters on mobile ("M", "W", "F")
- Progress map book cards stack to 1 column on mobile with full-width chapter cell rows
- Touch targets for chapter cells should be at least 24px (using padding around 6px cells) for mobile tap accuracy

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. Both components are read-only data visualizations.

---

## Auth & Persistence

- **Logged-out users:** Cannot access — My Bible page is auth-gated at the route level
- **Logged-in users:** Both components read from existing localStorage keys:
  - `wr_bible_streak` — `{ count: number, lastReadDate: string }` (BB-17)
  - `wr_bible_highlights` — `BibleHighlight[] (max 500)` (BB-7)
  - `wr_bible_progress` — `{book: number[]}` — chapters read per book
  - BB-19 session data if it exists (plan phase recon determines)
- **localStorage usage:**
  - Reads: `wr_bible_streak`, `wr_bible_highlights`, `wr_bible_progress`, and potentially BB-19 session data
  - Writes: At most one new key `wr_chapters_visited` as a fallback — **only if recon shows no existing key covers chapter-level reading state**
- **Route type:** Protected (existing auth gate on `/bible/my`)

---

## Data Source Architecture (Plan Phase Recon Required)

The plan phase must perform recon on these existing data stores before execution:

1. **`wr_bible_streak`** (BB-17): Confirm the per-day data shape. The documented shape is `{ count: number, lastReadDate: string }` — this only stores the current streak count and last read date, NOT a per-day history. The heatmap needs per-day data. **Recon must determine how to get per-day reading activity.**

2. **`wr_bible_progress`**: Documented as `{book: number[]}` — chapters read per book. This is the primary data source for the Bible progress map. Recon must confirm the exact shape and whether it provides chapter-level granularity.

3. **BB-19 reading session tracking**: Does it exist? What does it persist? Can it provide per-day chapter lists for the heatmap's intensity-based coloring?

4. **`wr_bible_highlights`** (BB-7): Documented as `BibleHighlight[] (max 500)` with 4 colors. Each highlight presumably includes a book/chapter/verse reference. Recon must confirm the shape for the "highlighted chapters" lookup in the progress map.

5. **Fallback decision:** If no existing key provides per-day chapter-level reading history, the spec permits adding `wr_chapters_visited` as a last resort. The plan phase reports this decision for approval before execution.

---

## Completion & Navigation

N/A — standalone feature on the My Bible page, not part of the Daily Hub tabbed experience.

---

## Design Notes

- Both components use the dark theme cinematic aesthetic consistent with the Bible reader redesign
- Color scale uses `primary` (`#6D28D9`) at varying opacities, which reads well against the dark backgrounds used on inner pages
- Empty cells use `bg-white/5` (heatmap) and `bg-white/8` (progress map) — subtle enough to show the grid structure without competing with active cells
- Text follows the inner page standard: `text-white/70` for primary, `text-white/60` for secondary
- Summary text above each visualization uses `text-white` for emphasis
- Tooltips use frosted glass styling consistent with the design system: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-lg`
- FrostedCard component may be used as wrapper for each visualization section
- Book cards in the progress map use a simplified version of the Dashboard Card Pattern: `bg-white/5 border border-white/10 rounded-xl`
- Month/day labels use `text-white/40` at small font size (`text-xs`)
- Legend uses `text-white/50` labels with color swatches
- No design system recon patterns file was consulted for exact CSS values — `_plans/recon/design-system.md` exists and should be referenced during planning
- **No animation beyond subtle hover/focus transitions.** Grid renders statically. No cell count-up animations. The calm aesthetic is non-negotiable.
- **New visual patterns:** The 53x7 heatmap grid and the per-book chapter cell rows are new patterns not captured in the design system recon. Mark derived values as `[UNVERIFIED]` during planning.

---

## Anti-Pressure Positioning (Non-Negotiable)

- No completion percentages or progress bars
- No "you missed X days" or "you're behind" messaging
- No comparisons across users
- No goal-setting or "read N chapters this week" challenges
- No streak shaming — streak count shown only when > 0 and in informational language
- No animation that feels like a video game (cell fill animations, count-ups, progress ring fills)
- No praise language ("Great job!", "Keep it up!") — just the data
- The empty state treats sparse activity as valid: "Your reading history will show up here as you read"

---

## Out of Scope

- No backend — pure client-side, reads from localStorage only
- No social sharing of the heatmap or progress map
- No yearly summary or year-end recap
- No reading speed or time-spent tracking
- No data export (JSON, PDF, image)
- No print stylesheet
- No new auth gates
- No changes to BB-17's streak logic, BB-7's highlights, BB-19's session tracking, or BB-21's plan completion
- No changes to the BB-38 deep link contract
- No charting library or new npm packages
- Backend wiring (Phase 3+)

---

## Acceptance Criteria

- [ ] A new module at `frontend/src/lib/heatmap/` exports `getDailyActivityForLastYear()` and `getBibleCoverage()` as pure functions
- [ ] Data aggregation reads from `wr_bible_streak` (BB-17), the highlights store (BB-7), and BB-19 reading session data if it exists
- [ ] If no chapter-level coverage data exists in any existing key, a new fallback key `wr_chapters_visited` is added and BibleReader writes to it on chapter mount
- [ ] `ReadingHeatmap` component renders a 53-column x 7-row grid for the past 365 days
- [ ] Heatmap cells use the 5-state intensity scale (empty, 1-2, 3-5, 6-9, 10+ chapters)
- [ ] Hover (desktop) or tap (mobile) shows tooltip with date and chapters read
- [ ] Today's cell has a visible border marker
- [ ] Month labels appear along the top of the heatmap grid
- [ ] Day-of-week labels appear on the left of the heatmap grid
- [ ] Legend below the grid shows color scale from "Less" to "More"
- [ ] Above heatmap: "You've read on N of the past 365 days" with no praise or judgment
- [ ] Current streak shown only when > 0, using informational language
- [ ] Empty state for new users shows friendly message, not fake data
- [ ] Tapping today's cell navigates to BibleReader or daily devotional
- [ ] `BibleProgressMap` component renders all 66 books in two sections (OT, NT)
- [ ] Each book card shows book name, read count ("X / Y chapters"), and per-chapter cell row
- [ ] Chapter cells use 3-state scale (empty, read, highlighted)
- [ ] Books with many chapters wrap cell rows to multiple lines (Option A)
- [ ] Tapping a chapter cell navigates to `/bible/<book>/<chapter>` per BB-38
- [ ] Tapping a book name navigates to the book's chapter list
- [ ] Above progress map: "X of 1,189 chapters read" and "Y of 66 books visited" — counts only
- [ ] Empty state for new users shows friendly message
- [ ] Both components integrated into `MyBiblePage` — heatmap above progress map, both above existing content
- [ ] Renders correctly on mobile (375px), tablet (768px), and desktop (1440px)
- [ ] Accessible: keyboard-navigable cells, ARIA labels for tooltips, screen-reader-friendly summary text
- [ ] All BB-30 through BB-42 tests continue to pass unchanged
- [ ] At least 15 unit tests cover data aggregation functions
- [ ] At least 10 component tests cover `ReadingHeatmap` (rendering, tooltip, empty state, color scale)
- [ ] At least 10 component tests cover `BibleProgressMap` (rendering, chapter cell click, empty state, responsiveness)
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates
- [ ] At most one new localStorage key (`wr_chapters_visited`) added only if recon shows no existing key covers chapter-level reading state
- [ ] Recon document at `_plans/recon/bb43-heatmap-data.md` documents data sources, aggregation logic, and visual encoding

---

## Pre-Execution Checklist (for CC, before /execute-plan)

1. BB-42 is shipped and committed
2. BB-17's `wr_bible_streak` structure documented during recon — per-day data shape confirmed
3. BB-19's reading session tracking verified — does it exist, what does it persist, per-day chapter lists?
4. BB-7's highlights data structure verified for "highlighted chapters" lookup
5. `wr_bible_progress` structure verified for chapter-level coverage
6. Recon decides whether fallback `wr_chapters_visited` key is needed — reports decision before execution
7. Visual encoding (5-color heatmap, 3-state progress map) reviewed against design system colors
8. Bible progress map layout (Option A: wrapping cells) mocked at both extremes (Psalms 150, Obadiah 1)
9. Stay on `bible-redesign` branch — no new branch, no merge
10. Zero new npm packages

---

## Notes for Execution

- **The recon step is the load-bearing question.** CC must read BB-17, BB-7, BB-19, BB-21, and `wr_bible_progress` structures to determine which keys provide which signals. Report findings and get approval before adding any fallback key.
- **Variable book widths in the progress map are a real layout challenge.** Psalms has 150 chapters, Obadiah has 1. Option A (wrapping with uniform cell size) keeps visual rhythm but the plan phase should confirm the result looks intentional at both extremes.
- **Performance matters for 1,554 total cells.** Use CSS grid/flexbox, not SVG. Virtualization is unlikely to be needed but the plan phase should confirm rendering approach.
- **Pre-existing failing tests are NOT touched.**
- **After BB-43 ships, BB-45 (verse memorization deck) is next.**
