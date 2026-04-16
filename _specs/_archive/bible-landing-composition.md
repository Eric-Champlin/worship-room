# BB-0: Bible Landing Composition

**Master Plan Reference:** N/A — first spec in the Bible Redesign wave. Later specs (BB-1 through BB-42) build on the scaffolding established here.

**Depends on:** none (first spec in wave)
**Hands off to:** BB-1 (applies full dark cinematic theming to everything built here)

---

## Overview

The current `/bible` page drops users into a centered book browser on a dark void with a broken `font-script` title ("The Bible" with Caveat font — deprecated per design system) and a segmented control. There is no front door — no welcome, no resume point, no daily verse, no sense of place. This spec replaces that with a composed landing page that gives returning readers instant access to where they left off, surfaces today's verse, and provides clear first actions for new visitors — all in service of making Scripture feel accessible and inviting rather than overwhelming.

## User Stories

- As a **returning reader** (logged-in or logged-out), I land on `/bible` and immediately see where I left off, today's verse, and (if on a plan) today's reading — without scrolling.
- As a **first-time visitor**, I see a welcome state with a clear "Start reading" path and a verse of the day to pull me in.
- As a **mid-engagement user**, I see my reading streak and can jump back into My Bible or browse reading plans without hunting.

## Requirements

### Functional Requirements

1. **Page hero** with two-line heading treatment (working title: "The Word of God / open to you") and a one-sentence subhead about the no-account, free, yours-forever promise. No CTA button in the hero — the cards below are the CTAs.
2. **Reading streak chip** showing current streak count + flame icon, positioned just below the hero. Tappable (stub the click handler — BB-17 builds the streak detail modal). Hidden when streak is 0.
3. **Resume Reading card** renders only when `wr_bible_last_read` exists in localStorage. Shows book name, chapter, relative timestamp ("5 minutes ago", "Yesterday"), large tap target. Tapping jumps to that chapter at the last-viewed verse. Card label: "Pick up where you left off."
4. **Today's Plan card** renders only when user has an active plan in `wr_bible_active_plans`. Shows plan name, "Day X of Y", today's reading reference, progress bar. Tapping jumps to today's reading. When multiple active plans exist, show the one with the earliest incomplete day; small "+N more" chip links to plan browser. Stub plan data structure — BB-21 fills it in.
5. **Verse of the Day** always renders. Deterministic per-date selection from a new curated VOTD seed file (`src/data/bible/votd.json`, 366 entries — leap year safe). Shows verse text, reference, share icon (stub in BB-0 — logs to console), "Read in context" link that jumps to that chapter with the verse highlighted.
6. **Quick actions row** with three equal cards in a horizontal row (stacks vertically on mobile): Browse Books (opens existing book browser), My Bible (links to `/bible/my`), Reading Plans (links to `/bible/plans`). Each card has an icon, label, and one-line description.
7. **Search entry** — full-width input with placeholder "Search the Bible — verses, words, phrases". Submitting navigates to `/bible/search?q=...`. Submitting empty input does nothing.
8. **Footer note** — small text: "World English Bible (WEB) - Public Domain - No account, ever." Trust signal, always visible.
9. **Empty/first-run state** when no `wr_bible_last_read`, no active plans, and streak is 0: Resume Reading card replaced with "Start your first reading" card linking to books picker; Today's Plan card replaced with "Try a reading plan" card linking to plan browser; streak chip hidden; VOTD, quick actions, search render normally.

### Non-Functional Requirements

- **Performance:** VOTD JSON loads at build time (static import or lazy load at page level). No runtime API calls for content.
- **Accessibility:** All tap targets minimum 44px. Search input has proper `aria-label`. Cards use semantic `<a>` or `<button>` elements. Progress bar on Today's Plan card uses `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`. Flame icon on streak chip has `aria-hidden="true"` with descriptive text for screen readers.
- **SSR safety:** All localStorage reads guarded for SSR compatibility. Server/initial render shows empty state; client hydration swaps in personalized content. No layout shift on hydration (conditional cards use reserved space or mount in consistent positions).

## Auth Gating

All content on this page is **public** — no auth gates. The Bible landing is designed to be a welcoming front door for everyone.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View page | Full landing page renders | Full landing page renders | N/A |
| Tap Resume Reading card | Navigates to reader | Navigates to reader | N/A |
| Tap Today's Plan card | Navigates to plan reading | Navigates to plan reading | N/A |
| Tap "Read in context" on VOTD | Navigates to chapter | Navigates to chapter | N/A |
| Tap Browse Books | Opens books picker | Opens books picker | N/A |
| Tap My Bible | Navigates to `/bible/my` | Navigates to `/bible/my` | N/A |
| Tap Reading Plans | Navigates to `/bible/plans` | Navigates to `/bible/plans` | N/A |
| Submit search | Navigates to `/bible/search?q=...` | Navigates to `/bible/search?q=...` | N/A |
| Tap share icon on VOTD | Console log stub | Console log stub | N/A |
| Tap streak chip | Console log stub (BB-17 builds modal) | Console log stub | N/A |

**Note:** Auth gating for My Bible, Reading Plans, and other downstream features will be defined in their respective specs (BB-14, BB-21.5). This spec only gates the landing page itself.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Quick actions stack vertically (1 column). All cards full width. Search input full width. Hero text smaller (`text-3xl`). Resume Reading and Today's Plan cards stack in a single column. |
| Tablet (640-1024px) | Quick actions in a 3-column row. Resume Reading and Today's Plan cards side by side when both present. Hero text medium (`text-4xl`). |
| Desktop (> 1024px) | Quick actions in a 3-column row. Resume Reading and Today's Plan cards side by side when both present, contained within `max-w-4xl`. Hero text large (`text-5xl`). |

- All tap targets are minimum 44px on all breakpoints
- VOTD card is full width with `max-w-2xl` on desktop for comfortable reading line length
- Search input uses `max-w-2xl` on desktop
- Footer note centers on all breakpoints

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The search input navigates to a search results page (BB-42) which will handle its own safety considerations. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can view the full landing page. Resume Reading card and Today's Plan card render based on localStorage (which persists for logged-out users). No database writes.
- **Logged-in users:** Same behavior. In Phase 3, localStorage keys will be synced to backend API; for now, all data is localStorage-based.
- **Route type:** Public

### localStorage Keys (NEW keys introduced by this spec)

These are new keys that do not exist in the current `wr_*` inventory. They follow the established `wr_` prefix convention.

| Key | Type | Feature | Written By |
|-----|------|---------|-----------|
| `wr_bible_last_read` | `{ book: string, chapter: number, verse: number, timestamp: number }` | Resume Reading card — last viewed position in the Bible reader | BB-4 (Reader spec) writes on navigation; BB-0 reads only |
| `wr_bible_active_plans` | `Array<{ planId: string, currentDay: number, totalDays: number, planName: string, todayReading: string, startedAt: number }>` | Today's Plan card — active reading plan progress | BB-21 (Plans spec) writes; BB-0 reads only |
| `wr_bible_streak` | `{ count: number, lastReadDate: string }` | Reading streak chip — Bible-specific streak count | BB-17 (Streak spec) writes; BB-0 reads only |

**BB-0 only reads these keys.** Write logic is owned by downstream specs. If the keys don't exist in localStorage, the component gracefully shows empty/first-run state.

**Existing VOTD system:** The app already has a VOTD system in `constants/verse-of-the-day.ts` (60 verses, 40 general + 20 seasonal) used by the Dashboard widget and the `VerseOfTheDayBanner` component. The Bible landing introduces a **separate, larger VOTD dataset** (`src/data/bible/votd.json`, 366 entries) specifically for the Bible front door. The deterministic selector uses the day-of-year as the index. The two systems are independent — the existing Dashboard VOTD continues to operate on its own 60-verse rotation.

## Completion & Navigation

N/A — The Bible landing is a navigation hub, not a completable activity. It does not signal to the streak/completion tracking system. Downstream specs (BB-17 for streak, BB-4 for reader) handle tracking.

## Design Notes

- **Hero:** Use the existing `PageHero` atmospheric hero pattern (`ATMOSPHERIC_HERO_BG` over `bg-dashboard-dark`). BB-1 will retheme this, but BB-0 establishes the semantic markup using the existing pattern from the design system recon (Variant 3: Atmospheric PageHero).
- **Heading:** Use `GRADIENT_TEXT_STYLE` for the hero heading (white-to-purple gradient via `background-clip: text`). Replace the current broken `font-script` (Caveat) usage. Two-line treatment using `SectionHeading` pattern or direct markup — BB-1 decides the final approach.
- **Cards:** Use the existing `FrostedCard` component for Resume Reading, Today's Plan, VOTD, and Quick Action cards. Interactive cards (with click handlers) get the hover elevation effect.
- **Streak chip:** Small frosted pill (`bg-white/[0.06] border border-white/[0.12] rounded-full px-3 py-1.5`), flame emoji or Lucide `Flame` icon, bold count number.
- **Quick actions:** Three `FrostedCard` cards with Lucide icons (`BookOpen`, `Bookmark`, `ListChecks` or similar), label, and one-line description. Interactive hover state.
- **Search input:** Dark input field matching the existing app input patterns (`bg-white/[0.06] border border-white/[0.12] rounded-xl`), with Lucide `Search` icon. Full width with max-width constraint.
- **Progress bar (Today's Plan):** Thin bar inside the card, uses `bg-primary` fill over `bg-white/[0.08]` track.
- **Text colors:** Default `text-white` for all readable text per Round 3 standards. Subhead and metadata use `text-white/60`. Footer note uses `text-white/50`.
- **Page background:** `bg-dashboard-dark` (existing inner page pattern). BB-1 may change this.
- **Layout wrapper:** Use existing `Layout` component (Navbar + SiteFooter).
- **Design system recon confirms:** All inner pages using PageHero (Bible, Music, Prayer Wall, etc.) share the same atmospheric hero pattern. BB-0 follows this existing pattern.

### New Visual Patterns

1. **Resume Reading card** — a card with primary visual weight showing a book/chapter reference and relative timestamp. No existing equivalent in the app. **[UNVERIFIED]** — BB-1 will finalize the visual treatment.
2. **Inline progress bar** — thin progress bar inside a FrostedCard. Similar to reading plan progress but embedded in a landing card. **[UNVERIFIED]** — verify against existing reading plan progress UI.

## Data Dependencies

### VOTD Seed File (`src/data/bible/votd.json`)

366 curated WEB (World English Bible) verses, one per day-of-year (index 0-365, leap year safe). Each entry:

```json
{
  "reference": "Psalm 23:1",
  "book": "Psalms",
  "chapter": 23,
  "verse": 1,
  "text": "The LORD is my shepherd; I shall not want."
}
```

The `book` field uses the exact book name from `BIBLE_BOOKS` in `constants/bible.ts` for direct navigation linking.

### VOTD Selector (`src/lib/bible/votdSelector.ts`)

Deterministic per-date picker:

- Input: current date (or any `Date` object)
- Output: the VOTD entry for that date
- Algorithm: day-of-year modulo 366
- Must return the same result for the same date across renders and page refreshes
- Must handle Dec 31 in non-leap years gracefully (day 365 maps to index 365)

### Landing State Reader (`src/lib/bible/landingState.ts`)

SSR-safe localStorage reader module. All component reads go through this module so BB-39 (PWA) can later swap in IndexedDB without touching components.

Functions:
- `getLastRead(): LastRead | null` — reads `wr_bible_last_read`
- `getActivePlans(): ActivePlan[]` — reads `wr_bible_active_plans`
- `getBibleStreak(): BibleStreak | null` — reads `wr_bible_streak`

All functions return `null` / empty array when running server-side or when the key doesn't exist.

## Components to Create

| Component | Purpose |
|-----------|---------|
| `src/pages/BibleLanding.tsx` | The landing page (replaces current `BibleBrowser` at `/bible` route) |
| `src/components/bible/landing/BibleHero.tsx` | Hero section with two-line heading + subhead |
| `src/components/bible/landing/StreakChip.tsx` | Reading streak pill, hidden when count is 0 |
| `src/components/bible/landing/ResumeReadingCard.tsx` | "Pick up where you left off" card (conditional) |
| `src/components/bible/landing/TodaysPlanCard.tsx` | Active plan card with progress bar (conditional) |
| `src/components/bible/landing/VerseOfTheDay.tsx` | Always-visible VOTD card with share stub + "Read in context" |
| `src/components/bible/landing/QuickActionsRow.tsx` | 3-card row (Browse Books, My Bible, Reading Plans) |
| `src/components/bible/landing/BibleSearchEntry.tsx` | Full-width search input |
| `src/data/bible/votd.json` | 366-entry curated VOTD seed file |
| `src/lib/bible/votdSelector.ts` | Deterministic per-date verse picker |
| `src/lib/bible/landingState.ts` | SSR-safe localStorage readers |

**Existing `BibleBrowser.tsx` disposition:** The current `BibleBrowser` component renders the books list + search + highlights/notes. The books list (`BibleBooksMode`) and search (`BibleSearchMode`) components remain — they are used by the new landing page's "Browse Books" quick action (inline or via route) and by the search results page (BB-42). The `BibleBrowser` page itself is replaced by `BibleLanding` at the `/bible` route. The `BibleBrowserSkeleton` should be updated or replaced to match the new landing layout.

## Routes

### Modified Route

| Route | Before | After |
|-------|--------|-------|
| `/bible` | `BibleBrowser` (books + search + highlights) | `BibleLanding` (new composed landing page) |

### Stub Routes (real pages built in later specs)

| Route | Stub Content | Built In |
|-------|-------------|----------|
| `/bible/my` | "My Bible — coming in BB-14" | BB-14 |
| `/bible/plans` | "Plans browser — coming in BB-21.5" | BB-21.5 |
| `/bible/search` | "Search — coming in BB-42" | BB-42 |

**Note:** `/bible/:book/:chapter` already exists and renders `BibleReader` — no stub needed. The existing route structure for the reader remains unchanged.

Stub routes should use the existing `Layout` component so BB-1's theming applies uniformly. Each stub renders a centered message on the atmospheric dark background.

## Out of Scope

- **Final theming** — BB-1 applies glow orbs, dark cinematic gradients, typography polish, and design tokens across everything BB-0 builds. BB-0 uses semantic class names and the existing design token system.
- **Verse highlighting in context** — BB-7
- **Books picker redesign** — BB-2 (BB-0 links to the existing `BibleBooksMode` or its future replacement)
- **Reader redesign** — BB-4
- **Streak write logic** — BB-17 (BB-0 only reads `wr_bible_streak`)
- **Plan data and write logic** — BB-21 (BB-0 only reads `wr_bible_active_plans`)
- **Search results page** — BB-42 (BB-0 stubs the route and wires the input)
- **Share functionality** — BB-13 (BB-0 stubs the share icon with a console log)
- **First-visit awe sequence** — BB-34
- **Animation and motion** — BB-1 handles. BB-0 ships no animation that ignores `prefers-reduced-motion`.
- **VOTD seed file population** — BB-0 defines the schema and a starter set; the user may provide or generate the full 366-entry list separately.
- **Backend API wiring** — Phase 3. All data is localStorage-based for now.

## Acceptance Criteria

- [ ] Navigating to `/bible` renders the new landing page without errors
- [ ] With empty localStorage (no `wr_bible_last_read`, no `wr_bible_active_plans`, streak 0), the empty/first-run state shows correctly: "Start your first reading" card, "Try a reading plan" card, VOTD, quick actions, search, footer note; streak chip is hidden
- [ ] With `wr_bible_last_read` set (e.g., `{ book: "John", chapter: 3, verse: 16, timestamp: Date.now() }`), the Resume Reading card appears showing "John 3" and a relative timestamp, and links to `/bible/john/3`
- [ ] With an entry in `wr_bible_active_plans`, the Today's Plan card renders showing the plan name, "Day X of Y", today's reading reference, and a progress bar
- [ ] With `wr_bible_streak.count > 0`, the streak chip appears showing the count and flame icon
- [ ] With `wr_bible_streak.count === 0` or key missing, the streak chip is hidden
- [ ] VOTD selection is deterministic — the same date returns the same verse on every render and page refresh
- [ ] VOTD "Read in context" link navigates to the correct chapter route (e.g., clicking a Psalm 23:1 VOTD navigates to `/bible/psalms/23`)
- [ ] VOTD share icon click logs to console (stub)
- [ ] Quick actions: "Browse Books" navigates to the books picker, "My Bible" navigates to `/bible/my`, "Reading Plans" navigates to `/bible/plans`
- [ ] Search input submits to `/bible/search?q=...` on Enter; empty input submission does nothing
- [ ] All three stub routes (`/bible/my`, `/bible/plans`, `/bible/search`) render placeholder content with the Layout wrapper
- [ ] Mobile (< 640px): quick actions stack vertically, all tap targets are at minimum 44px, page is fully usable on a 375px viewport
- [ ] Tablet/Desktop: quick actions render in a 3-column row
- [ ] No console errors during navigation between the landing page and stub routes
- [ ] No hydration mismatches in React strict mode (conditional cards handle SSR-safe localStorage reads)
- [ ] Hero heading uses `GRADIENT_TEXT_STYLE` (no Caveat/`font-script`)
- [ ] Footer note text "World English Bible (WEB)" is visible on all breakpoints
- [ ] Progress bar on Today's Plan card uses `role="progressbar"` with correct ARIA attributes
- [ ] The `votd.json` file contains at least 366 entries with valid WEB verse text and references that match `BIBLE_BOOKS` book names
