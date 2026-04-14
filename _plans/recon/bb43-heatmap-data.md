# BB-43 Heatmap Data Source Recon

**Date:** 2026-04-13
**Feature:** Reading Heatmap / Bible Progress Map
**Question:** Which existing localStorage keys provide per-day chapter-level reading history?

---

## Data Sources Investigated

| Key | Shape | Has Timestamps? | Per-Day History? | BB-43 Use |
|-----|-------|-----------------|------------------|-----------|
| `wr_bible_progress` | `Record<string, number[]>` (book slug → chapter numbers) | **No** | **No** — tracks WHICH chapters, not WHEN | Progress map: chapters read per book |
| `bible:streak` | `StreakRecord { currentStreak, lastReadDate, totalDaysRead, ... }` | Single ISO date only | **No** — only last read date, no daily log | Streak count display |
| `wr_bible_highlights` | `Highlight[] { book, chapter, createdAt }` | **Yes** (epoch ms) | Partial — only annotation activity, not reading | Supplementary daily signal |
| `bible:bookmarks` | `Bookmark[] { book, chapter, createdAt }` | **Yes** (epoch ms) | Partial — only annotation activity | Supplementary daily signal |
| `bible:notes` | `Note[] { book, chapter, createdAt }` | **Yes** (epoch ms) | Partial — only annotation activity | Supplementary daily signal |
| `wr_bible_last_read` | `{ book, chapter, verse, timestamp }` | **Yes** (epoch ms) | **No** — single entry, overwritten on each view | Not useful (BB-19 confirmed) |

## Key Finding

**No existing key provides per-day chapter-level reading history.** A user who reads 5 chapters without highlighting, bookmarking, or noting anything would show 0 activity on the heatmap using only existing data sources.

## Decision: New `wr_chapters_visited` Key

The spec authorized a fallback key when no existing data source was sufficient. After confirming that none of BB-7 (highlights), BB-17 (streaks), BB-19 (last read), or BB-21 (reading plans) store per-day reading history, the `wr_chapters_visited` key was created as the primary data source for the heatmap.

**Shape:** `Record<string, Array<{ book: string; chapter: number }>>`
- Key: YYYY-MM-DD date string (local timezone)
- Value: array of `{ book, chapter }` objects — one per unique chapter visited that day
- Deduplication: same book+chapter on same day stored once
- Cap: 400 days (365 for heatmap display + 35 buffer), oldest-first eviction
- Written by: `VerseDisplay` on chapter mount (captures all chapter opens including quick references)
- Estimated max size: ~120KB for 400 days of moderate reading

## Aggregation Logic

The heatmap merges data from multiple sources for richer coverage:

1. **Primary source:** `wr_chapters_visited` — records every chapter opened by authenticated users
2. **Supplementary sources:** `wr_bible_highlights`, `bible:bookmarks`, `bible:notes` — grouped by `createdAt` date, extracting `book:chapter` pairs
3. **Deduplication:** All sources merged per-date, deduplicated by `book:chapter` key (prevents double-counting a chapter that was both read and highlighted on the same day)

## Visual Encoding

### Heatmap (5-state intensity scale)

| Chapter Count | Intensity | Color |
|---------------|-----------|-------|
| 0 | 0 | `bg-white/5` |
| 1-2 | 1 | `bg-primary/30` |
| 3-5 | 2 | `bg-primary/50` |
| 6-9 | 3 | `bg-primary/70` |
| 10+ | 4 | `bg-primary/90` |

### Progress Map (3-state scale)

| State | Color | Meaning |
|-------|-------|---------|
| Unread | `bg-white/[0.08]` | Chapter not in `wr_bible_progress` |
| Read | `bg-primary/60` | Chapter in `wr_bible_progress` |
| Highlighted | `bg-primary/80` | Chapter has at least one highlight |
