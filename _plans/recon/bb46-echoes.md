# BB-46: Verse Echoes — Algorithm & Architecture Reference

## Overview

Verse Echoes surface contextual callbacks to verses the user has engaged with in the past. They appear as frosted-glass cards on the Dashboard and Daily Hub devotional tab. Echoes complement VOTD — VOTD introduces new verses; echoes strengthen the relationship with verses the user has already chosen.

## Selection Algorithm

### Data Sources (Read-Only)

| Source | localStorage Key | Interface | Available Fields |
|--------|-----------------|-----------|-----------------|
| Highlights | `wr_bible_highlights` | `Highlight` | book, chapter, startVerse, endVerse, createdAt (epoch ms) — NO verse text |
| Memorization | `wr_memorization_cards` | `MemorizationCard` | book, bookName, chapter, startVerse, endVerse, verseText, reference, createdAt |
| Chapter visits | `wr_chapters_visited` | `ChapterVisitStore` | Record<YYYY-MM-DD, Array<{book, chapter}>> |

Zero new localStorage keys. Session freshness tracking is in-memory only.

### Meaningful Intervals

Echoes trigger when an engagement matches a meaningful interval: **7, 14, 30, 60, 90, 180, or 365 days** with **±1 day tolerance** for timezone edge cases.

`read-on-this-day` echoes trigger when the month and day match today but the year is different (requires at least one year of history).

### Scoring Formula

```
score = baseScore + recencyBonus + freshnesspenalty
```

| Component | Formula |
|-----------|---------|
| Base score | memorized: 100, highlighted: 80, read-on-this-day: 40 |
| Recency bonus | `max(0, 50 - daysSinceEngagement / 10)` |
| Freshness penalty | -50 if the echo was seen in the current session |

### Filters

1. **Kind filter**: Optional `kinds` array restricts which echo kinds are returned
2. **Variety filter**: Group by book, keep only the highest-scored echo per book
3. **Sort**: Score descending
4. **Limit**: Default 10, configurable

### Relative Labels

| Interval | Label |
|----------|-------|
| 7 | "a week ago" |
| 14 | "two weeks ago" |
| 30 | "a month ago" |
| 60 | "two months ago" |
| 90 | "three months ago" |
| 180 | "six months ago" |
| 365 | "a year ago" |
| read-on-this-day (1yr diff) | "on this day last year" |
| read-on-this-day (>1yr diff) | "on this day in [year]" |

## Verse Text Resolution

| Echo Kind | Text Source | Sync/Async |
|-----------|-----------|------------|
| Memorized | `MemorizationCard.verseText` | Synchronous |
| Highlighted | `loadChapterWeb(book, chapter)` → extract verses | Async (in hook) |
| Read-on-this-day | Empty string (chapter-level, no verse) | N/A |

The engine is pure TypeScript (no React, no async). The `useEcho` hook handles async text resolution for highlight echoes only.

## Integration Points

### Dashboard (`pages/Dashboard.tsx`)

- Single `EchoCard` mounted between `DashboardHero` and `WeeklyGodMoments`
- Container: `mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6`
- Animation: `motion-safe:animate-widget-enter` with `animationDelay: '100ms'`
- Renders nothing when `useEcho()` returns null

### Daily Hub Devotional (`components/daily/DevotionalTabContent.tsx`)

- Single `EchoCard` mounted after the reading plan callout, before Share & Read Aloud buttons
- Container: `py-6 sm:py-8` wrapper within existing `max-w-2xl` parent
- No section heading — feels like a natural "one more thing"
- Renders nothing when `useEcho()` returns null

## Module Structure

```
frontend/src/
├── types/echoes.ts          # Echo, EchoKind, EchoOptions types
├── lib/echoes/
│   ├── engine.ts            # Pure selection engine (getEchoes, getEchoForHomePage)
│   ├── labels.ts            # Interval matching + relative label generation
│   └── index.ts             # Barrel exports
├── hooks/useEcho.ts         # useEcho, useEchoes, markEchoSeen
└── components/echoes/
    └── EchoCard.tsx          # Frosted-glass card component
```

## Deferred Follow-ups

- **Dismiss button**: Allow users to dismiss an echo (no localStorage key yet)
- **Echoes feed page**: `/bible/echoes` for browsing all echoes
- **My Bible integration**: Intentionally excluded in v1 (My Bible is for intentional browsing)
- **Animations**: Entrance animation deferred to BB-33
- **Empty states**: Deferred to BB-34
- **Social sharing**: Echoes are private reminders, not shareable
- **Analytics**: Tap rate tracking for future engagement analysis
- **Reading plan / devotional echoes**: Only highlights, memorization, and reading activity in v1
