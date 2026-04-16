# BB-18: Verse of the Day

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-0 (landing page with VOTD card slot), BB-4 (reader destination for "Read in context"), BB-13 (share-as-image destination for "Share")
**Hands off to:** BB-19 (last-read resume — both surfaces compete for hero real estate), BB-41 (web push notification using same selector logic)
**Design system recon:** `_plans/recon/design-system.md` (captured 2026-04-05)

---

## Overview

Every day, the user sees a hand-curated verse on the Bible landing page, deterministically chosen so that the same date always produces the same verse for every user. The card surfaces the verse text, the reference, three actions (Read in context, Share, Save), and a small treatment that makes opening the app feel like arriving at something fresh rather than a static menu.

This is the "what should I read today" answer for the user who doesn't know what they want. It removes choice paralysis and gives the Bible page a reason to earn daily visits — a tiny element of freshness that makes the page feel alive rather than a static menu.

## User Story

As a **logged-out visitor or logged-in user**, I want to see a fresh, curated verse every day when I open the Bible page so that I have an immediate reason to engage with Scripture even when I don't have a specific reading plan in mind.

## Requirements

### Functional Requirements

1. A hand-curated list of 366 verses lives at `frontend/src/data/bible/votd/votd-list.json`, ordered by day-of-year
2. Each entry contains: `ref` (human-readable reference), `book` (lowercase slug), `chapter`, `startVerse`, `endVerse`, `theme` (one of: love, hope, peace, strength, faith, joy, comfort, wisdom, forgiveness, provision, praise, presence)
3. The selector function `selectVotdForDate(date)` returns a deterministic verse for any given date using `(dayOfYear - 1) % LIST_LENGTH`
4. Day-of-year calculation uses the user's local timezone, not UTC — reuses the same `getTodayLocal()` pattern from BB-17's `dateUtils.ts`
5. The VerseOfTheDayCard component renders the verse text, reference, three action buttons, and today's date
6. "Read in context" navigates to `/bible/{book}/{chapter}?highlight={startVerse}` — the reader scrolls to and briefly glows the target verse(s) on mount (1.5s fade-out, visual only, not persisted to highlights store)
7. "Share" opens the BB-13 share-as-image flow (existing `ShareSubView` infrastructure) pre-loaded with the VOTD verse
8. "Save" creates a bookmark via the BB-7.5 bookmark store with label `"Verse of the Day \u00b7 {locale date}"` — toggle behavior matching existing bookmark pattern
9. The `useVerseOfTheDay(date?)` hook loads the verse text from WEB JSON data (reusing BB-4's chapter loader) and polls every 60 seconds for midnight crossover
10. Empty fallback displays John 3:16 if the VOTD list fails to load or the verse isn't found in WEB data
11. Every entry in the list is verified against the WEB JSON data at test time — a broken entry fails the test suite

### Curation Requirements

12. No more than 30% of entries from Psalms (max ~110)
13. At least 20% from the Gospels (min ~73 from Matthew, Mark, Luke, John)
14. At least 10% from Old Testament narrative books (min ~37 from Genesis, Exodus, Joshua, Judges, Samuel, Kings, etc.)
15. At most 5% from epistolary "hard" passages (max ~18 from Romans 9, Hebrews 6, etc.)
16. No verses that require significant context to understand out of isolation
17. Length cap: ~30 words per verse; longer verses use smaller font or truncate with ellipsis
18. All entries verified against WEB translation text specifically

### Non-Functional Requirements

- Performance: VOTD list is a static JSON file in the bundle — no async loading needed; verse text loaded from existing chapter JSON infrastructure
- Accessibility: `<blockquote>` with `<cite>` for verse, `aria-label` on all action buttons, 44px+ tap targets, reduced motion respected on reader highlight glow

## Existing State on `bible-redesign`

There is already a working VOTD implementation:
- **Data:** `frontend/src/data/bible/votd.json` — 366 entries with shape `{ reference, book, chapter, verse, text }`
- **Selector:** `frontend/src/lib/bible/votdSelector.ts` — `getTodaysBibleVotd(date)` function
- **Type:** `VotdEntry` in `frontend/src/types/bible-landing.ts` — `{ reference, book, chapter, verse, text }`
- **Component:** `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — FrostedCard with share button (console.log placeholder) and "Read in context" link (no highlight param)

BB-18 enhances this existing foundation:
- **Data shape evolution:** Add `startVerse`/`endVerse` (replacing single `verse`), add `theme` field, rename `reference` to `ref` for consistency with the spec's data model
- **New hook:** `useVerseOfTheDay` with midnight polling and verse text loading from WEB JSON
- **New Save action:** Bookmark integration with VOTD-labeled bookmarks
- **Share integration:** Wire to BB-13's `ShareSubView` instead of console.log
- **Reader highlight:** Add `?highlight=` query param handling to BibleReader for scroll-and-glow on arrival
- **Visual upgrade:** Cinematic display font for verse text, date treatment, responsive alignment changes
- **Robustness:** Empty fallback, skeleton, curation verification tests

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View VOTD card | Full card visible with verse, reference, date, all buttons | Same | N/A |
| Read in context | Navigates to reader (reader is public) | Same | N/A |
| Share | Opens share-as-image flow (public feature) | Same | N/A |
| Save (bookmark) | Auth modal triggers | Creates bookmark with VOTD label; toggles to "Saved" | "Sign in to save verses" |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse text centered, generous size (cinematic display). Action row: 3 buttons horizontally, equally spaced. Date bottom-right. Card spans full width within `max-w-2xl` container. |
| Tablet (640-1024px) | Same as mobile but with more breathing room. |
| Desktop (> 1024px) | Verse text left-aligned. Action row same horizontal layout. Card within `max-w-2xl` container. |

- Long verses (above ~30 words): smaller font size variant to prevent layout breakage
- All action buttons minimum 44px tap target
- Card wraps gracefully on narrow viewports (375px minimum)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All content is hand-curated scripture from the WEB Bible. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view the VOTD card, tap "Read in context" (reader is public), tap "Share" (share flow is public). Cannot save bookmarks (auth modal).
- **Logged-in users:** All actions available. Bookmarks persist to `bible:bookmarks` localStorage key via the existing bookmark store.
- **localStorage usage:** No new keys. Uses existing `bible:bookmarks` key for save action. VOTD data is a static JSON file in the bundle.

## Completion & Navigation

N/A — The VOTD is a passive landing page element, not a completable activity. It does not signal to streak/completion systems.

## The Selector Algorithm

```
selectVotdForDate(date: Date): VotdEntry
  dayOfYear = getDayOfYear(date)  // 1-366, local timezone
  index = (dayOfYear - 1) % VOTD_LIST.length
  return VOTD_LIST[index]
```

- **Deterministic:** Same date always returns same verse for all users globally
- **Predictable:** Index maps directly to list position — curators can control exactly which verse appears on any given day
- **Leap-year safe:** Day 366 only exists in leap years; `getDayOfYear` returns 366 only on Dec 31 of leap years
- **Year boundary:** For a list of exactly 366, every day maps to a unique verse. Index 365 (the 366th verse) only shows in leap years.

### Why deterministic

A user who screenshots the VOTD and shares it should see the same verse their friend sees when they open the app. Determinism also enables future server-side precomputation for SEO (BB-40) and push notifications (BB-41).

### Midnight rollover

The `useVerseOfTheDay` hook polls every 60 seconds for date change. If the user leaves the landing open across midnight, the card re-renders with the new day's verse within 1 minute without requiring a page refresh.

## Visual Design

### Card Treatment

- **Container:** `FrostedCard` component (existing) — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow
- **Top label:** `"VERSE OF THE DAY"` — small caps, tracking-wide, `text-white/50`, `text-xs font-medium uppercase`
- **Verse text:** Cinematic display font at generous size (matching hero subtitle treatment). `text-white` at full opacity. No quotation marks. `<blockquote>` semantic element. Centered on mobile, left-aligned on desktop.
- **Reference:** Below verse, `text-sm font-semibold text-white/60`. `<cite>` element. Format: `"John 3:16"` — title case book, colon separator, no translation suffix.
- **Action row:** Three buttons below reference — "Read in context" (BookOpen icon), "Share" (Share2 icon), "Save" / "Saved" (Bookmark icon). Equally spaced. 44px minimum tap targets.
- **Date:** Small text bottom-right, `text-xs text-white/40`, formatted in user's locale via `toLocaleDateString()`.

### Long Verse Handling

- Verses above ~30 words: use a slightly smaller font size to accommodate
- Multi-verse passages that are genuinely long: truncate with ellipsis at a sentence boundary; "Read in context" reveals the full text
- Curation should mostly avoid this — the length cap is part of the selection criteria

### Reader Highlight on Arrival

When the reader loads with `?highlight={startVerse}` (or `?highlight={startVerse}-{endVerse}` for ranges):
- Scroll to the target verse on mount
- Apply a brief glow animation: 1.5 seconds, fades out
- Visual only — does NOT write to the highlights store
- Respects `prefers-reduced-motion` — instant transition (no animation) under reduced motion

### Empty Fallback

If the VOTD list fails to load or the selected verse isn't found in WEB data:
- Verse: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
- Reference: "John 3:16"
- Action row: same as normal (read in context navigates to `/bible/john/3?highlight=16`)
- Console error logged for dev team

### Skeleton

Caption placeholder, two-line verse placeholder, reference placeholder, three button placeholders. Matching card dimensions. Rarely visible since data is bundled.

## Design Notes

- Reference the `FrostedCard` component from `09-design-system.md` for the card pattern
- Reference the `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` if used for the "Verse of the Day" label (alternatively, plain white small caps per the BB-0 section label pattern)
- The action row buttons should match the existing BB-0 landing component patterns (icon + text links with hover states)
- The verse text font size follows the cinematic display treatment from the design system recon: generous sizing on desktop, proportionally scaled on mobile
- The existing `VerseOfTheDay.tsx` component already uses `FrostedCard` and has the right structural skeleton — BB-18 enhances it rather than replacing from scratch
- Reference `_plans/recon/design-system.md` for exact color values — do not guess

## Recon (run before /plan)

Run `/playwright-recon` against:
- **YouVersion** (`https://www.bible.com/verse-of-the-day`) — layout, share treatment, action buttons, typography
- **Bible Gateway** (`https://www.biblegateway.com/`) — VOTD widget on homepage, competition with other content
- **Daily Verses** (`https://dailyverses.net/`) — minimalist competitor, essentials

Capture: verse vs reference visual weighting, alignment, treatment around verse, action affordances, long vs short verse handling, share image dimensions, date display format.

## Critical Edge Cases

1. **Midnight crossover:** User opens landing at 11:58 PM, navigates away, returns at 12:02 AM. The 1-minute poll detects the date change and re-renders with the new day's verse.
2. **Missing WEB data:** Selector returns a verse the WEB JSON doesn't have. Fall through to John 3:16 fallback. Log console error.
3. **Two tabs open:** Both run independent polls. Both show the same verse because selection is deterministic. No coordination needed.
4. **Timezone traveler:** User in Tokyo sees verse #99 (April 9), flies to LA where it's still April 8, sees verse #98. Correct behavior — VOTD is tied to calendar date, not personal sequence.
5. **Leap year Feb 29:** `getDayOfYear` returns 60 on Feb 29. The selector handles this via modulo. Dec 31 of a leap year returns day 366 (index 365).
6. **Already bookmarked verse:** Save button shows "Saved" from initial render. Tapping removes the bookmark (toggle).

## Out of Scope

- No personalized verse selection (every user sees the same verse on the same day)
- No "next" or "previous" day navigation (VOTD is a "today" experience)
- No multi-translation support (WEB only)
- No commentary or "why this verse" explanation (BB-30/31 territory)
- No analytics (not tracking shares/saves per verse)
- No A/B testing (single curated list)
- No backend/API (JSON file in the bundle)
- No verse-of-the-week/month variants
- No audio version (BB-26 FCBH territory)
- No direct social platform sharing (BB-13 handles share mechanics)
- No OS home screen widget (BB-39 PWA territory)
- No separate VOTD history (saved verses go to bookmarks)
- No animation on verse change at midnight (re-render, no transition)
- No streak celebration for VOTD engagement (BB-17's job)
- No server-side selection in this spec (BB-40 can add later using same deterministic selector)

## Acceptance Criteria

- [ ] The VOTD list exists at `frontend/src/data/bible/votd/votd-list.json` with at least 366 entries
- [ ] Each entry contains `ref`, `book`, `chapter`, `startVerse`, `endVerse`, `theme`
- [ ] Every entry corresponds to a real verse in the WEB JSON data (verified by test)
- [ ] No more than 30% of entries are from Psalms
- [ ] At least 20% of entries are from the Gospels
- [ ] At least 10% of entries are from Old Testament narrative books
- [ ] `selectVotdForDate(date)` returns a deterministic verse for any given date
- [ ] Two calls with the same date return identical results
- [ ] Two calls with consecutive dates return different verses
- [ ] `selectVotdForDate(new Date('2026-01-01'))` returns the first verse in the list
- [ ] Leap year February 29 returns a valid verse without error
- [ ] Non-leap year December 31 (day 365) returns a valid verse without error
- [ ] Day-of-year calculation uses local timezone, not UTC
- [ ] VerseOfTheDayCard renders caption, verse text, reference, action row, and date
- [ ] Verse text uses cinematic display font at generous size with `text-white`
- [ ] Card uses the `FrostedCard` pattern
- [ ] "Read in context" navigates to `/bible/{book}/{chapter}?highlight={startVerse}`
- [ ] Reader handles `?highlight=` by scrolling to and briefly glowing the verse on mount (1.5s fade)
- [ ] Reduced motion: highlight glow uses instant transition (no animation)
- [ ] "Save" creates bookmark with label including "Verse of the Day" and the date
- [ ] "Save" toggles to "Saved" for 2 seconds after save, then returns to "Save"
- [ ] Already-bookmarked verse shows "Saved" from initial render; tapping removes bookmark
- [ ] Logged-out user tapping "Save" sees auth modal with "Sign in to save verses"
- [ ] "Share" opens BB-13 share-as-image flow pre-loaded with VOTD verse
- [ ] Date renders in user's locale format
- [ ] Midnight crossover: card re-renders with new day's verse within 1 minute
- [ ] Empty fallback displays John 3:16 if VOTD list fails to load
- [ ] Skeleton displays correctly during any async load
- [ ] `useVerseOfTheDay()` returns correct VOTD entry combined with verse text from WEB data
- [ ] `useVerseOfTheDay(specificDate)` returns the verse for that specific date
- [ ] Unit tests cover: first day of year, last day of year, leap year, modulo for shorter lists, deterministic output
- [ ] Card is responsive on mobile (375px), tablet (768px), and desktop (1440px)
- [ ] Long verses (above 30 words) use smaller font size variant
- [ ] Verse text uses `<blockquote>` with `<cite>` for reference
- [ ] Action buttons have `aria-label` attributes
- [ ] All tap targets >= 44px
- [ ] Zero raw hex values (all colors via Tailwind tokens)
- [ ] The 366-entry list is visually verifiable: every entry is a real curated choice, not filler

## Notes for Execution

- **The list is the product, not the algorithm.** The selector is 10 lines; the list is 366 carefully chosen entries. Don't ship sequential Psalms — that's filler, not curation.
- **Verify every list entry against the WEB JSON before shipping.** Write a test that loads each entry's book/chapter/startVerse/endVerse and confirms the verse exists. A broken entry shipped to production will surface weeks/months later when that day arrives.
- **The 30% Psalms cap is a real constraint.** Reach into Hebrews, James, 1 Peter, the prophets, the wisdom books. Diversity makes VOTD interesting over a year of daily visits.
- **Test the midnight rollover explicitly.** Fake clock at 11:59:30 PM, mount the card, advance 90 seconds, verify re-render with next day's verse.
- **The "Read in context" highlight is a small but important touch.** The user who taps the button should land in the reader and immediately see their verse — no scrolling, no scanning.
- **BB-19 (last-read resume) is next** and both BB-18 and BB-19 surface in the landing hero. BB-19 will define priority logic.
