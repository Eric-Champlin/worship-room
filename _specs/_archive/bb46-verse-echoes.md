# BB-46: Verse Echoes

**Master Plan Reference:** N/A -- standalone feature within the Bible redesign wave. Depends on BB-45 (memorization deck), BB-7 (highlights), BB-43 (reading heatmap), BB-17 (streak system), BB-38 (deep linking), BB-18 (Verse of the Day). Hands off to BB-33 (animations), BB-34 (empty states).

**Branch:** `bible-redesign` (all work commits directly to this branch)

---

## Overview

The single most underused resource in any personal app is the user's own history. A user who highlighted a verse two months ago has no way to rediscover it without deliberately opening My Bible, filtering their highlights, and scrolling. A user who memorized a verse three weeks ago has no natural re-entry point. Worship Room has all the data to surface these moments, but no mechanism that does it.

Verse Echoes are small contextual callbacks to verses the user has engaged with in the past -- a verse they highlighted, memorized, or read on a significant date. They appear as a quiet single-card display saying something like "A month ago you highlighted this" followed by the verse text. Tapping opens the verse in the Bible reader via BB-38's deep link contract. The tone is subtle: "On this day" memories, not push notifications. Echoes complement the BB-18 Verse of the Day system -- VOTD introduces new verses; echoes strengthen the relationship with verses the user has already chosen.

This feature adds zero new tracking. Every data source (highlights, memorization cards, chapter visits) already exists from BB-7, BB-43, and BB-45. BB-46 is purely a selection and presentation layer over existing user history.

## User Story

As a **logged-in user**, I want to **see occasional callbacks to verses I've highlighted, memorized, or read on significant dates** so that **verses I've already chosen to engage with resurface at meaningful moments without me having to go looking for them**.

## Requirements

### Functional Requirements

#### Echo Selection Engine

1. A new pure TypeScript module at `frontend/src/lib/echoes/` implements the echo selection engine with no React dependencies
2. The engine reads from three existing localStorage data sources: `wr_bible_highlights` (BB-7), `wr_memorization_cards` (BB-45), and `wr_chapters_visited` (BB-43)
3. Three echo kinds are supported: `highlighted` (user highlighted this verse), `memorized` (user added to memorization deck), `read-on-this-day` (user read this chapter on this calendar day in a previous year)
4. The engine generates candidate echoes when an engagement matches a "meaningful interval": 7, 14, 30, 60, 90, 180, or 365 days ago, with +/- 1 day tolerance for timezone edge cases
5. `read-on-this-day` echoes trigger when the month and day match today but the year is different (requires at least one year of history)
6. Each candidate echo is scored using the following formula:
   - Base score: 100 (memorized), 80 (highlighted), 40 (read-on-this-day)
   - Recency bonus: `max(0, 50 - daysSinceEngagement / 10)`
   - Variety penalty: if multiple echoes from the same book, only the highest-scored one is retained
   - Freshness penalty: -50 points if the user has seen this exact echo in the current session (tracked in memory, not persisted)
7. The engine generates natural `relativeLabel` values: 7 days = "a week ago", 14 = "two weeks ago", 30 = "a month ago", 60 = "two months ago", 90 = "three months ago", 180 = "six months ago", 365 = "a year ago", read-on-this-day = "on this day last year" or "on this day in [year]"
8. Public API: `getEchoes(options?: { limit?: number; kinds?: EchoKind[] }): Echo[]` returns sorted by score descending
9. `getEchoForHomePage(): Echo | null` convenience wrapper returning the top echo or null
10. `markEchoSeen(id: string): void` tracks session freshness in memory only (lost on page reload)
11. Multi-verse highlights generate echoes with the full verse range and concatenated text
12. Zero new localStorage keys -- session freshness tracking is in-memory only

#### Echo Type

13. Each Echo object contains: `id` (stable, derived from source + target), `kind` (EchoKind), `book` (slug), `bookName` (display), `chapter`, `startVerse`, `endVerse`, `text` (verse content), `reference` (formatted), `relativeLabel` (human-readable), `occurredAt` (epoch ms of original engagement), `score`

#### EchoCard Component

14. A new `EchoCard` component at `frontend/src/components/echoes/EchoCard.tsx` renders a single echo
15. Frosted-glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-5`
16. Top line: small muted label with echo reason and time, e.g. "You highlighted this a month ago" -- styled `text-xs text-white/50 mb-3`
17. Each echo kind has a subtle icon indicator next to the label: highlight = highlighter icon, memorized = bookmark icon, read-on-this-day = calendar icon -- all at `text-white/30`
18. Verse text: `text-base text-white leading-relaxed font-serif` (Lora) for reading weight
19. Reference below verse text: `text-sm text-white/60 mt-3` right-aligned
20. Entire card is clickable, navigating to `/bible/<book>/<chapter>?verse=<n>` via BB-38
21. Clicking calls `markEchoSeen(id)` before navigating
22. Desktop hover: `hover:bg-white/[0.08] transition-colors` (150ms, respects `prefers-reduced-motion`)
23. Proper ARIA: `aria-label="Echo: you [kind] [reference] [relativeLabel]. Tap to open."` with the card wrapped in a `<Link>` for keyboard navigation
24. No entrance animation in v1 (deferred to BB-33)
25. No dismiss button in v1

#### useEcho Hook

26. A new React hook at `frontend/src/hooks/useEcho.ts` surfaces echoes to consuming pages
27. `useEcho(options?: { kinds?: EchoKind[] }): Echo | null` returns a single echo or null
28. `useEchoes(options?: { limit?: number; kinds?: EchoKind[] }): Echo[]` returns an array
29. Both hooks subscribe to the underlying stores (highlights, memorization, chapter visits) via their `subscribe()` methods and recompute reactively when any source fires
30. Output is memoized so consumers don't re-render unnecessarily when unrelated state changes
31. Returns null / empty array for brand-new users with zero history

#### Integration Points

32. **Dashboard / home page**: a single `EchoCard` is mounted between the greeting section and the VOTD card. Renders nothing if `useEcho` returns null.
33. **Daily Hub devotional tab** (`/daily?tab=devotional`): a single `EchoCard` is mounted below the devotional content, before the footer/next-steps area. Renders nothing if `useEcho` returns null.
34. **My Bible page**: NOT included in v1. My Bible is for intentional history browsing; echoes are for unexpected moments.

### Non-Functional Requirements

- **Performance**: Selection engine runs on in-memory data; computation is cheap. Hook memoization prevents unnecessary re-renders.
- **Accessibility**: Card uses semantic `<Link>`, has descriptive `aria-label`, is keyboard-navigable and screen-reader friendly. 44px minimum touch target on mobile.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View echo card | Rendered if user has localStorage history (unlikely but possible for logged-out users who have used the Bible reader) | Rendered if history exists, nothing if not | N/A |
| Tap echo card | Navigates to verse in BibleReader (no auth required -- Bible is a public route) | Navigates to verse in BibleReader | N/A |

No new auth gates. Echoes work for both logged-in and logged-out users. The practical reality is that logged-out users have very little history (no highlights or memorization, only chapter visits), so they'll rarely see echoes.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | EchoCard full-width within its container (`px-4`), verse text `text-base`, card padding `p-4 sm:p-5` |
| Tablet (640-1024px) | EchoCard within max-width container, same visual treatment |
| Desktop (> 1024px) | EchoCard within max-width container, hover state active |

The EchoCard is a single-column card that lives within the parent's existing responsive container (Dashboard or Daily Hub). No grid or multi-column layout. The card width follows its parent.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. It only displays existing verse text from the user's own history. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can see echoes if they have localStorage history (chapter visits). Zero new persistence. Session freshness tracking is in-memory only.
- **Logged-in users:** Same behavior -- echoes are computed from existing localStorage data. No new data is written to localStorage or any database.
- **Route type:** Echoes appear on existing routes (Dashboard = protected, Daily Hub devotional = public). No new routes.
- **localStorage usage:** Zero new keys. Reads from existing `wr_bible_highlights`, `wr_memorization_cards`, `wr_chapters_visited`.

## Completion & Navigation

N/A -- Echoes are passive display cards, not a completable activity. They don't signal to the streak/completion tracking system. Tapping an echo navigates to the BibleReader via BB-38's deep link contract.

## Design Notes

- **Card pattern**: Reuse the existing `FrostedCard` visual treatment (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`) documented in `09-design-system.md`. The EchoCard is NOT a FrostedCard component instance (it has custom click handling and layout), but matches the frosted-glass visual.
- **Verse typography**: Lora serif (`font-serif`) for verse text, matching the BibleReader's scripture typography. UI elements (label, reference) use Inter (`font-sans`). This visual contrast signals "this is scripture, not chrome."
- **Label icons**: Use Lucide icons matching the existing icon vocabulary. Highlight = `Highlighter`, Memorize = `Bookmark`, Read = `Calendar`. All at `text-white/30` to stay subtle.
- **Dashboard integration**: Must not clutter the greeting area. The echo card sits between the greeting and the VOTD section. If both VOTD and echo are present, they should feel like peers, not stacked clutter. The plan phase should review the Dashboard layout and confirm spacing.
- **Daily Hub integration**: The echo card below the devotional should feel like a natural "one more thing" rather than a new section. No section heading wrapping the echo.
- **HorizonGlow**: On the Daily Hub, the EchoCard's transparent background allows the HorizonGlow atmospheric layer to show through, consistent with other Daily Hub content components.
- **Design system recon**: Reference `_plans/recon/design-system.md` for exact computed values of the FrostedCard pattern, frosted-glass backgrounds, and Daily Hub section spacing.
- **No new visual patterns**: The EchoCard reuses existing frosted-glass treatment. No `[UNVERIFIED]` values needed.

## Out of Scope

- **No new tracking or localStorage keys** -- BB-46 is a pure consumer of existing data
- **No dismiss or "don't show me this" button** -- deferred to a future spec
- **No echoes feed page** -- if demand exists, a future `/bible/echoes` route can be added
- **No weekly/monthly digest** -- deferred until email infrastructure exists
- **No social sharing of echoes** -- echoes are private reminders
- **No ML or personalization** -- scoring is deterministic, based on user-declared signals and calendar math
- **No cross-device sync** -- localStorage per device; revisited when Phase 3 backend ships
- **No analytics on echo engagement** -- a future spec can track tap rates
- **No echoes for reading plans or devotionals** -- only highlights, memorization, and reading activity
- **No animation in v1** -- deferred to BB-33 (animations & micro-interactions)
- **No changes to BB-7, BB-17, BB-43, or BB-45 data stores** -- BB-46 is a pure consumer
- **No changes to BB-38 deep link contract** -- uses existing `/bible/<book>/<chapter>?verse=<n>`
- **No My Bible page integration** -- My Bible is for intentional browsing; echoes are for unexpected moments
- **No notifications or push for echoes** -- inline-only in v1
- **Backend/API work** -- Phase 3+

## Edge Cases

- **Brand-new users with zero history**: `getEchoes()` returns empty array. Components render nothing. No placeholder, no first-run message.
- **Users with history but no eligible intervals today**: No echoes today. Engine returns empty array. This is correct -- echoes are occasional, not constant.
- **Users who have seen the same echo in this session**: Freshness penalty (-50) pushes it down the ranking. Not persisted across sessions intentionally -- the same echo can appear tomorrow if the interval still matches.
- **Multi-verse highlights**: Echo uses the full range (e.g., "John 3:16-17") with concatenated verse text.
- **Deleted verses**: If a highlight or memorization card is removed after echo computation, the reactive store subscription triggers recomputation and the removed source disappears. No stale echoes.
- **Interval overlap**: A highlight from exactly 30 days ago could match both the 30-day and (if timezone shifts) the 29-day window. The +/- 1 day tolerance handles this gracefully. Each interval generates at most one candidate per source item.

## Acceptance Criteria

- [ ] A new module at `frontend/src/lib/echoes/` exports the echo selection engine as a pure TypeScript module with no React imports
- [ ] The engine reads from `wr_bible_highlights`, `wr_memorization_cards`, and `wr_chapters_visited` (zero new localStorage keys)
- [ ] Three echo kinds supported: `highlighted`, `memorized`, `read-on-this-day`
- [ ] Meaningful intervals: 7, 14, 30, 60, 90, 180, 365 days with +/- 1 day tolerance
- [ ] Scoring uses base + recency bonus + variety penalty + freshness penalty as documented
- [ ] Natural relative labels: "a week ago", "a month ago", "on this day last year", etc.
- [ ] `getEchoes(options)` returns `Echo[]` sorted by score descending
- [ ] `getEchoForHomePage()` returns top echo or null
- [ ] `markEchoSeen(id)` tracks freshness in memory only (not persisted)
- [ ] Multi-verse highlights produce echoes with the full range and concatenated text
- [ ] Variety penalty prevents multiple echoes from the same book in a single result set
- [ ] `EchoCard` component renders frosted-glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-5`
- [ ] Verse text in Lora serif (`font-serif`), UI elements in Inter
- [ ] Each echo kind has a subtle icon indicator (Highlighter, Bookmark, Calendar) at `text-white/30`
- [ ] Card is clickable via `<Link>` navigating to `/bible/<book>/<chapter>?verse=<n>`
- [ ] Clicking calls `markEchoSeen(id)` before navigation
- [ ] `aria-label` on card: "Echo: you [kind] [reference] [relativeLabel]. Tap to open."
- [ ] Desktop hover: `hover:bg-white/[0.08]` with 150ms transition
- [ ] `useEcho` hook returns single echo or null, subscribes to all three source stores reactively
- [ ] `useEchoes` hook returns array, same reactive subscription
- [ ] Both hooks memoize output to prevent unnecessary re-renders
- [ ] Dashboard: `EchoCard` mounted between greeting and VOTD section, nothing rendered when null
- [ ] Daily Hub devotional tab: `EchoCard` mounted below devotional content, nothing rendered when null
- [ ] Brand-new users see no echo cards (no placeholder, no first-run message)
- [ ] Session freshness penalty prevents same echo appearing twice in one session
- [ ] All BB-30 through BB-45 tests continue to pass unchanged
- [ ] At least 20 unit tests for the selection engine (scoring, intervals, labels, edge cases)
- [ ] At least 8 component tests for EchoCard (rendering, click, ARIA labels)
- [ ] At least 6 tests for useEcho/useEchoes hooks (reactive updates, memoization)
- [ ] At least 4 integration tests for Dashboard and Daily Hub integration points
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys
- [ ] Documentation at `_plans/recon/bb46-echoes.md` covering the selection algorithm, scoring, intervals, labels, and deferred follow-ups

## Pre-Execution Checklist (for /plan)

1. BB-45 is shipped and committed
2. Re-confirm BB-7 highlight store structure: `createdAt` epoch ms, `book`, `chapter`, `startVerse`, `endVerse`, verse text or lookup method
3. Re-confirm BB-45 memorization card store structure: `createdAt`, captured verse text
4. Re-confirm BB-43 `wr_chapters_visited` structure: date keys as `YYYY-MM-DD`, values as `{book, chapter}[]`
5. Identify Dashboard component and document exact mount point (which file, what's above/below)
6. Identify Daily Hub DevotionalTabContent and document exact mount point below devotional content
7. Note BibleReader verse typography (font, size, line height) for EchoCard matching
8. Interval list approved: 7, 14, 30, 60, 90, 180, 365 days
9. My Bible NOT included in v1
10. Stay on `bible-redesign` branch
11. Zero new localStorage keys, zero new packages
