# BB-19: Last-Read Resume

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-0 (landing hero + ResumeReadingCard stub), BB-4 (reader writes `wr_bible_last_read` on every chapter mount), BB-17 (streak store + dateUtils + `useStreakStore` with 1-minute at-risk interval), BB-18 (VOTD card + `useVerseOfTheDay` with 1-minute midnight poll)
**Hands off to:** BB-41 (web push — "you left off in John 3, come back" notifications use the same `wr_bible_last_read` data)
**Design system recon:** `_plans/recon/design-system.md` (captured 2026-04-05)

---

## Overview

A returning Bible reader should feel like they're resuming a book, not restarting an app. BB-19 surfaces the user's last-read chapter on the Bible landing page hero so they can pick up where they left off in one tap. It defines a priority rule that decides whether the hero slot shows the resume card or the Verse of the Day, depending on how recently the user read. For emotionally vulnerable users coming back to scripture after a hard day, the app should remember where they were and welcome them back gently.

## User Stories

- As a **daily Bible reader**, I want to see my last-read chapter front and center when I open the Bible page so that I can continue reading without hunting for where I was.
- As a **returning reader who has been away for a while**, I want the Verse of the Day to greet me instead of a prominent reminder of how long I've been gone, with a quiet link to my last position if I want it.
- As a **first-time reader**, I want to see the Verse of the Day without any resume clutter so that the page feels inviting and uncluttered.

## Requirements

### Functional Requirements

#### Hero Priority Rule (the core decision)

1. **Active reader** (read within last 24 hours, timestamp-based): Hero shows the resume card. VOTD demoted to a smaller secondary card below.
2. **Lapsed reader** (read more than 24 hours ago, but has read at least once ever): Hero shows the VOTD card. A small "Last read: {Book} {Chapter} · {time ago}" link appears in a secondary area.
3. **First-time reader** (no `wr_bible_last_read` entry or corrupted data): Hero shows the VOTD card. No resume affordance.
4. The 24-hour threshold is timestamp-based (`Date.now() - timestamp < 86_400_000`), not date-based. A user who reads at 11:59 PM and returns at 12:01 AM is still active (2 minutes elapsed).
5. The priority is not user-configurable. The app picks based on behavior.
6. State is recomputed every minute via a shared time tick (see Performance section) and on landing mount.

#### Resume Card (active reader state)

7. Shows the book name and chapter number in large display font (e.g., "John 3")
8. Shows the first line of the chapter text (~80 characters, truncated with ellipsis), loaded from the WEB JSON via the existing chapter loader
9. Shows a time-aware relative label (e.g., "Read 3 hours ago", "Earlier today", "Yesterday")
10. Primary "Continue" button navigates to `/bible/{slug}/{chapter}` — the same chapter, not the next one (the user may not have finished)
11. Secondary "Or read the next chapter" link navigates to `/bible/{slug}/{chapter+1}` if a next chapter exists in that book; hidden if the user was on the last chapter
12. Uses the existing FrostedCard component with a subtle warm accent border to distinguish from the VOTD card

#### Secondary VOTD Card (when active reader)

13. The existing VerseOfTheDay card from BB-18 renders in a secondary area below the resume card
14. Same content and actions, just demoted in visual hierarchy (smaller, less visually weighted)

#### Lapsed Reader Link

15. A single-line text link: "Last read: {Book} {Chapter} · {time ago}" styled as a subtle accent
16. Tapping navigates to `/bible/{slug}/{chapter}`

#### Time Formatting

17. A pure utility function `formatRelativeReadTime(timestamp, now?)` with these thresholds:
    - Less than 1 hour: "Just now"
    - 1-6 hours: "X hours ago"
    - 6-18 hours, same calendar day: "Earlier today"
    - Same calendar day, 18+ hours: "This morning"
    - Yesterday (calendar day): "Yesterday"
    - 2-6 days: "X days ago"
    - 7-13 days: "1 week ago"
    - 14-27 days: "X weeks ago"
    - 28-59 days: "1 month ago"
    - 60-364 days: "X months ago"
    - 365+ days: "Over a year ago"
18. Accepts optional `now` parameter for deterministic testing

#### Shared Time Tick (performance consolidation)

19. A single `useTimeTick()` hook that ticks every 60 seconds, exposing `{ now: Date; today: string; currentMinute: number }`
20. `useStreakStore`, `useVerseOfTheDay`, and the new `useLastRead` all consume `useTimeTick` instead of running their own `setInterval`s — one interval total for all three
21. The tick pauses when the page is hidden (Page Visibility API) and resumes immediately when the tab becomes visible again

#### useLastRead Hook

22. Returns `{ book, chapter, timestamp, isActiveReader, isLapsedReader, isFirstTimeReader, relativeTime, firstLineOfChapter }`
23. Reads from `wr_bible_last_read` localStorage key (existing key written by BB-4)
24. If `wr_bible_last_read` is missing, malformed, or missing required fields (`book`, `chapter`, `timestamp`), returns `isFirstTimeReader: true`
25. Loads the first line of the chapter from WEB JSON via the existing `loadChapterWeb()` function
26. Re-derives state on every time tick

### Non-Functional Requirements

- Performance: One shared `setInterval` across streak, VOTD, and last-read (down from three)
- Accessibility: Semantic HTML (`<article>`, `<blockquote>`/`<cite>` where appropriate), `aria-label` on interactive elements, 44px+ tap targets, reduced motion respected
- SSR safety: Server reads (where `typeof window === 'undefined'`) return first-time-reader state

## Existing State on `bible-redesign`

The following already exist and will be enhanced/refactored by BB-19:

| Component / Module | Path | Current State |
|---|---|---|
| `ResumeReadingCard` | `frontend/src/components/bible/landing/ResumeReadingCard.tsx` | Basic card with "Pick up where you left off" text, book + chapter, `timeAgo()` label, link to reader. No first-line preview, no "next chapter" link, no priority logic. |
| `VerseOfTheDay` | `frontend/src/components/bible/landing/VerseOfTheDay.tsx` | Full VOTD card with share, read-in-context, save actions. |
| `BibleHero` | `frontend/src/components/bible/landing/BibleHero.tsx` | Static "The Word of God / open to you" hero section. |
| `BibleLanding` page | `frontend/src/pages/BibleLanding.tsx` | Composes hero, streak chip, resume + plan cards (2-col grid), VOTD, quick actions, search. No priority logic — resume card and VOTD always show. |
| `useVerseOfTheDay` | `frontend/src/hooks/bible/useVerseOfTheDay.ts` | Loads VOTD with its own 60s `setInterval` for midnight polling. |
| `useStreakStore` | `frontend/src/hooks/bible/useStreakStore.ts` | Subscribes to streak store with its own 60s `setInterval` for at-risk checking. |
| `getLastRead()` | `frontend/src/lib/bible/landingState.ts` | Reads + validates `wr_bible_last_read` from localStorage. Returns `LastRead \| null`. |
| `LastRead` type | `frontend/src/types/bible-landing.ts` | `{ book: string, chapter: number, verse: number, timestamp: number }` |

**Important data clarification:** The spec's user input references `bible:lastRead` — the actual key in the codebase is `wr_bible_last_read`. The `LastRead` type includes a `verse` field (1-indexed, last viewed verse) in addition to `book`, `chapter`, and `timestamp`.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View resume card | Visible (resume is computed from localStorage, not auth state) | Same | N/A |
| Tap "Continue" button | Navigates to reader (reader is public) | Same | N/A |
| Tap "Or read the next chapter" | Navigates to reader (reader is public) | Same | N/A |
| View VOTD card (any state) | Visible with all actions except Save | Save triggers auth modal | "Sign in to save verses" |
| Tap lapsed-reader link | Navigates to reader (reader is public) | Same | N/A |

No new auth gates. The resume card reads from localStorage which exists for all users (logged-in or logged-out) who have opened a chapter.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Stacked single column. Active reader: resume card full width, secondary VOTD below. Lapsed reader: VOTD full width, "Last read" link below. |
| Tablet (640-1024px) | Same stacked layout with more horizontal padding. |
| Desktop (> 1024px) | Active reader: resume card takes hero slot, VOTD as smaller secondary below. Lapsed reader: VOTD takes hero slot, "Last read" link below. |

- The resume card's "Continue" button and "next chapter" link are stacked vertically on mobile, inline on desktop
- All interactive elements have minimum 44px tap targets
- Long book names (e.g., "1 Thessalonians 5") do not overflow on 375px screens
- The first-line preview text truncates gracefully at all widths

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All content is from the WEB Bible and localStorage metadata. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Resume card is functional — `wr_bible_last_read` is written by the reader for all users. No new localStorage keys created.
- **Logged-in users:** Same behavior. No database persistence — all data is localStorage.
- **localStorage usage:** Reads existing `wr_bible_last_read` key (shape: `{ book: string, chapter: number, verse: number, timestamp: number }`). No new keys.
- **Route type:** Public (the Bible landing page `/bible` is public)

## Completion & Navigation

N/A — standalone Bible landing feature. Not part of the Daily Hub tabbed experience.

## Design Notes

- The resume card uses the existing `FrostedCard` component with an optional warm accent border (`border-l-4 border-l-primary/60` or similar — the Tier 2 scripture callout border style) to visually differentiate it from the neutral VOTD card
- "Continue reading" caption text uses `text-white/60 uppercase tracking-wide text-xs` consistent with label treatments elsewhere on the Bible landing
- Book + chapter heading uses large display font: `text-2xl sm:text-3xl font-bold text-white`
- First-line preview uses `text-white/70 text-sm sm:text-base` with truncation
- Time label uses `text-white/50 text-xs sm:text-sm`
- "Continue" button matches the white pill CTA pattern from the design system (Pattern 1 — inline, smaller)
- "Or read the next chapter" uses `text-primary-lt text-sm` as a subtle accent link
- The lapsed-reader link uses `text-white/50 text-sm` with the book/chapter in `text-white/70`
- The state transition (24-hour boundary crossing) is a simple re-render with no animation — reduced motion is respected by default since there is no transition animation
- **Reference:** `_plans/recon/design-system.md` for exact FrostedCard box-shadow, border, and backdrop values

### Integration with Existing Landing Layout

The current `BibleLanding.tsx` renders resume card and VOTD as separate sibling sections (resume + plan cards in a 2-col grid, VOTD as its own section below). BB-19 replaces this with a composed hero section that conditionally renders based on priority state. The `TodaysPlanCard` grid position may shift based on the hero state — the plan phase determines exact layout.

## Critical Edge Cases

1. **24-hour boundary while page is open:** User opens landing at 23h 58m since last read; 2 minutes later the time tick fires and state transitions to lapsed. The resume card disappears, VOTD takes the hero, lapsed link appears. No animation — just a quiet re-render.
2. **Immediate return from reader:** User reads a chapter, taps back. Landing remounts, reads fresh `wr_bible_last_read`. Resume card shows the chapter they just left.
3. **Corrupted `wr_bible_last_read`:** Malformed JSON or missing required fields → treat as first-time reader. Show VOTD, no resume affordance.
4. **Multiple browser tabs:** Known limitation. Tab 2 won't auto-update when tab 1 reads a chapter. Future BB-39 (PWA) can add `storage` event listeners.
5. **User reads at 11:59 PM, returns at 12:01 AM:** Timestamp-based, not date-based — 2 minutes elapsed, resume card shows (correct).
6. **User has read once, six months ago:** Lapsed reader state. VOTD in hero, "Last read: John 3 · 6 months ago" link below.
7. **User has zero reading history:** First-time reader state. VOTD in hero, no resume link.
8. **Last chapter of a book:** "Or read the next chapter" link hidden (there is no next chapter in that book).

## Out of Scope

- **No multi-book recent reading list** — only the single most recent chapter is shown
- **No reading progress percentage** — BB-4 records chapter opens, not scroll position
- **No "next up in your reading plan" integration** — BB-21 reading plans have their own resume affordance
- **No user-configurable hero priority** — the 24-hour rule is automatic
- **No cross-device resume** — localStorage only, no sync
- **No streak callout on the resume card** — that's the StreakChip's job
- **No push notification when the 24-hour window is about to expire** — BB-41
- **No reading history view** — BB-43 (heatmap)
- **No A/B testing on the priority rule** — single rule, picked deliberately
- **Backend / Phase 3 persistence** — resume data stays in localStorage until Phase 3

## Acceptance Criteria

- [ ] The landing hero composes the resume card and VOTD card based on the priority rule
- [ ] Active-reader state (read within last 24h) shows the resume card as the primary hero element and the VOTD as a smaller secondary card below
- [ ] Lapsed-reader state (read more than 24h ago but has read at least once) shows the VOTD in the hero and a small "Last read: {Book} {Chapter} · {time ago}" link in a secondary area
- [ ] First-time reader state (never read, or corrupted data) shows the VOTD in the hero with no resume affordance
- [ ] The resume card shows the book name, chapter number, first ~80 characters of the chapter text (with ellipsis), and a relative time label
- [ ] The resume card has a primary "Continue" button that navigates to `/bible/{slug}/{chapter}`
- [ ] The resume card has a secondary "Or read the next chapter" link that navigates to `/bible/{slug}/{chapter+1}` when a next chapter exists; hidden for the last chapter of a book
- [ ] The lapsed-reader link navigates to `/bible/{slug}/{chapter}`
- [ ] The relative time label uses the documented thresholds: Just now, X hours ago, Earlier today, This morning, Yesterday, X days ago, X weeks ago, X months ago, Over a year ago
- [ ] `formatRelativeReadTime` is a pure function that accepts an optional `now` parameter for deterministic testing
- [ ] `useLastRead` returns correct state for active/lapsed/first-time given the current `wr_bible_last_read` value
- [ ] `useLastRead` returns `isFirstTimeReader: true` when `wr_bible_last_read` is missing, malformed, or has missing required fields
- [ ] `useTimeTick` ticks every 60 seconds and exposes `{ now, today, currentMinute }`
- [ ] `useTimeTick` pauses ticking when the page is hidden (Page Visibility API) and resumes when the tab becomes visible
- [ ] `useStreakStore` and `useVerseOfTheDay` consume `useTimeTick` instead of running their own intervals — one shared interval total
- [ ] The state transitions correctly when the 24-hour boundary crosses while the page is open (resume card disappears, VOTD takes hero, lapsed link appears)
- [ ] No animation on the state transition (reduced motion safe by default)
- [ ] The first line of the chapter is loaded from WEB JSON via the existing `loadChapterWeb()` function
- [ ] The resume card is responsive on mobile (375px+), tablet, and desktop
- [ ] All interactive elements (Continue button, next chapter link, lapsed-reader link) have tap targets of at least 44px
- [ ] The card has appropriate `aria-label` and semantic HTML
- [ ] `timeFormat.test.ts` covers all threshold boundaries (just now, hours, earlier today, this morning, yesterday, days, weeks, months, year+)
- [ ] `useLastRead.test.ts` covers active/lapsed/first-time states with mock localStorage and mock time
- [ ] Navigating back from the reader to the landing reads the freshly updated `wr_bible_last_read`
- [ ] The lapsed-reader link is visually distinct from the active-reader resume card (small, secondary, subtle)
- [ ] Zero raw hex values — all colors reference Tailwind tokens or CSS custom properties
- [ ] The shared time tick is the only `setInterval` used by streak, VOTD, and last-read hooks combined
- [ ] SSR-safe — server reads return first-time-reader state; client hydrates correctly
