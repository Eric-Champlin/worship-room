# Implementation Plan: BB-46 Verse Echoes

**Spec:** `_specs/bb46-verse-echoes.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old)
**Recon Report:** N/A — feature adds cards to existing pages, no external page to recon
**Master Spec Plan:** N/A — standalone feature

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Lib**: `frontend/src/lib/` — Pure TypeScript modules (no React dependency). Reactive stores live here (e.g., `lib/bible/highlightStore.ts`, `lib/heatmap/chapterVisitStore.ts`, `lib/memorize/store.ts`)
- **Hooks**: `frontend/src/hooks/` — Custom React hooks. Bible-specific hooks in `hooks/bible/`
- **Types**: `frontend/src/types/` — TypeScript interfaces
- **Constants**: `frontend/src/constants/bible.ts` — Bible-related constants and localStorage keys
- **Components**: `frontend/src/components/` — Feature-organized (e.g., `components/daily/`, `components/memorize/`)
- **Data**: `frontend/src/data/bible/index.ts` — `loadChapterWeb(bookSlug, chapter)` returns `Promise<BibleChapter | null>` with lazy-loaded verse data
- **Tests**: Co-located `__tests__/` directories within each module

### Source Data Stores

**Highlights** (`lib/bible/highlightStore.ts`):
- Key: `wr_bible_highlights`
- Interface: `Highlight { id, book, chapter, startVerse, endVerse, color, createdAt: number, updatedAt: number }` — **no verse text field**
- API: `getAllHighlights()`, `subscribe(listener): () => void`
- Note: `getAllHighlights()` returns `[...getCache()]` (new array each call — not snapshot-stable for `useSyncExternalStore`)

**Memorization cards** (`lib/memorize/store.ts`):
- Key: `wr_memorization_cards`
- Interface: `MemorizationCard { id, book, bookName, chapter, startVerse, endVerse, verseText, reference, createdAt: number, lastReviewedAt, reviewCount }`
- API: `getAllCards()` (snapshot-cached), `subscribe(listener): () => void`
- Note: `verseText` and `bookName` are directly available — no async loading needed

**Chapter visits** (`lib/heatmap/chapterVisitStore.ts`):
- Key: `wr_chapters_visited`
- Type: `Record<string, Array<{ book: string; chapter: number }>>` — keys are `YYYY-MM-DD` date strings
- API: `getAllVisits()`, `subscribe(listener): () => void`
- Note: `getAllVisits()` returns `{ ...getCache() }` (new object each call — not snapshot-stable)

### Reactive Store Pattern

All three stores use the same listener pattern: module-level `Set<() => void>`, `subscribe()` returns an unsubscribe function. The `useEffect` + `useState` pattern (subscribe all three, recompute on any change) is the correct approach here because:
1. We need to combine data from 3 stores into a derived computation
2. Two of the three stores (`getAllHighlights`, `getAllVisits`) lack snapshot caching required by `useSyncExternalStore`
3. The spec says "No changes to BB-7, BB-43, or BB-45 data stores"

### Verse Text Resolution

`Highlight` has no `text` field. To display verse text for highlight-based echoes, the hook must async-load the chapter via `loadChapterWeb(bookSlug, chapter)` from `data/bible/index.ts` and extract the relevant verses. `MemorizationCard.verseText` is directly available. `read-on-this-day` echoes are chapter-level and have no associated verse text.

### Book Name Resolution

`BIBLE_BOOKS` array in `constants/bible.ts` provides `{ name, slug, chapters, testament }`. The existing `resolveBookName(slug)` pattern from `lib/bible/activityLoader.ts` (line 9-11): `BIBLE_BOOKS.find(b => b.slug === slug)?.name ?? slug`.

### Deep Link Contract (BB-38)

Route: `/bible/:book/:chapter` with optional `?verse=<number>` query param. Book slugs are lowercase with hyphens (e.g., `genesis`, `1-corinthians`). The BibleReader extracts verse from `useSearchParams()` and highlights it via `useVerseSelection()`.

### Dashboard Insertion Point

**File:** `frontend/src/pages/Dashboard.tsx`, lines 512-513
- After: `</div>` closing `DashboardHero` wrapper (line 512)
- Before: `{godMoments.isVisible && (` (line 513)
- Container pattern: `className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6"` with optional animation `motion-safe:animate-widget-enter`

### DevotionalTabContent Insertion Point

**File:** `frontend/src/components/daily/DevotionalTabContent.tsx`, lines 322-324
- After: `showPlanCallout` closing `)}` (line 322)
- Before: `{/* Share & Read Aloud */}` (line 324)
- The Daily Hub uses HorizonGlow at page root — the echo card's transparent background lets it show through

### Test Patterns

- Co-located `__tests__/` directories
- Vitest + React Testing Library + jsdom
- Pure module tests: direct import + assertion
- Component tests: `render()` + screen queries, `userEvent` for interaction
- Provider wrapping: `MemoryRouter` for Link/navigation, `AuthModalProvider` for auth-gated features (not needed here — no auth gates)
- Store isolation: each store exports `_resetForTesting()` to clear cache + listeners between tests
- Mock pattern for `loadChapterWeb`: `vi.mock('@/data/bible/index', () => ({ loadChapterWeb: vi.fn() }))`

---

## Auth Gating Checklist

No auth gates. Per the spec: "No new auth gates. Echoes work for both logged-in and logged-out users." The Bible reader route is public, so tapping an echo card navigates without auth.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View echo card | Works for all users | Step 3, 4, 5 | None required |
| Tap echo card | Navigates to BibleReader (public route) | Step 3 | None required |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FrostedCard (echo) | background | `bg-white/[0.06]` = `rgba(255, 255, 255, 0.06)` | design-system.md |
| FrostedCard (echo) | backdrop | `backdrop-blur-sm` = `backdrop-filter: blur(4px)` | design-system.md |
| FrostedCard (echo) | border | `border border-white/[0.12]` = `1px solid rgba(255, 255, 255, 0.12)` | design-system.md |
| FrostedCard (echo) | radius | `rounded-2xl` = `border-radius: 16px` | design-system.md |
| FrostedCard (echo) | padding | `p-5` = `20px` (spec says `p-5`) | spec |
| FrostedCard (echo) hover | background | `hover:bg-white/[0.08]` = `rgba(255, 255, 255, 0.08)` | spec |
| Label text | style | `text-xs text-white/50 mb-3` | spec |
| Icon indicator | style | `text-white/30` | spec |
| Verse text | font | `font-serif` (Lora), `text-base text-white leading-relaxed` | spec |
| Reference | style | `text-sm text-white/60 mt-3`, right-aligned | spec |
| Transition | duration | `transition-colors duration-150` | spec |
| Dashboard container | padding | `mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6` | Dashboard.tsx line 515 |
| DevotionalTab spacing | padding | `py-6 sm:py-8` (matching Pray CTA section spacing) | DevotionalTabContent.tsx line 297 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components. GlowBackground is still used by the homepage.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component for standard cards. The EchoCard intentionally does NOT use the `FrostedCard` component (it has custom click handling via `<Link>` wrapper) but matches the frosted-glass visual treatment exactly.
- Verse text uses Lora serif (`font-serif`). UI elements (labels, references) use Inter (`font-sans`). This is the project-wide scripture typography convention.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- The Dashboard uses `max-w-6xl` container width. Daily Hub content uses `max-w-2xl`. The EchoCard must respect whichever parent container it lives in.
- No deprecated patterns: no Caveat headings, no BackgroundSquiggle on Daily Hub, no GlowBackground on Daily Hub, no animate-glow-pulse, no cyan textarea borders, no italic Lora prompts, no soft-shadow 8px-radius cards.

---

## Shared Data Models (from existing stores)

```typescript
// From types/bible.ts — highlight source data
interface Highlight {
  id: string
  book: string           // slug e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number
  color: HighlightColor  // 'peace' | 'conviction' | 'joy' | 'struggle' | 'promise'
  createdAt: number      // epoch ms
  updatedAt: number      // epoch ms
}

// From types/memorize.ts — memorization source data
interface MemorizationCard {
  id: string
  book: string           // slug
  bookName: string       // display name
  chapter: number
  startVerse: number
  endVerse: number
  verseText: string      // full verse text
  reference: string      // e.g. "John 3:16"
  createdAt: number      // epoch ms
  lastReviewedAt: number | null
  reviewCount: number
}

// From types/heatmap.ts — chapter visit source data
type ChapterVisitStore = Record<string, Array<{ book: string; chapter: number }>>
// Keys: "YYYY-MM-DD", Values: [{book: "genesis", chapter: 1}, ...]
```

**localStorage keys this spec reads (zero new keys):**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_highlights` | Read | Highlight store (BB-7) |
| `wr_memorization_cards` | Read | Memorization card store (BB-45) |
| `wr_chapters_visited` | Read | Chapter visit log (BB-43) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | EchoCard full-width within container, `p-4`, verse `text-base` |
| Tablet | 768px | EchoCard within container max-width, `p-5`, same visual |
| Desktop | 1440px | EchoCard within container max-width, hover state active, `p-5` |

The EchoCard is a single-column card that lives within the parent's responsive container. No grid or multi-column layout. Width follows parent.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The EchoCard is a single-column vertical stack (label → verse text → reference).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DashboardHero → EchoCard (Dashboard) | 16px (`pb-4`) | Dashboard.tsx existing wrapper pattern |
| EchoCard → WeeklyGodMoments/WidgetGrid (Dashboard) | 16px | Same container pattern |
| RelatedPlanCallout → EchoCard (DevotionalTab) | 24-32px (`py-6 sm:py-8`) | DevotionalTabContent.tsx line 297 pattern |
| EchoCard → Share & Read Aloud (DevotionalTab) | 32-40px (`mt-8 sm:mt-10`) | DevotionalTabContent.tsx line 325 |

---

## Assumptions & Pre-Execution Checklist

- [x] BB-45 is shipped and committed (verified: execution log shows all 9 steps DONE)
- [x] BB-7 highlight store confirmed: `createdAt` as epoch ms, no `text` field, `subscribe()` available
- [x] BB-45 memorization store confirmed: `verseText` + `bookName` directly available, `subscribe()` available
- [x] BB-43 chapter visit store confirmed: `YYYY-MM-DD` keys, `{book, chapter}[]` values, `subscribe()` available
- [x] BB-38 deep link format confirmed: `/bible/:book/:chapter?verse=<n>`
- [x] Dashboard insertion point confirmed: after DashboardHero (line 512), before godMoments (line 513)
- [x] DevotionalTabContent insertion point confirmed: after showPlanCallout (line 322), before Share (line 324)
- [x] All auth-gated actions from the spec are accounted for in the plan (none — echoes are ungated)
- [x] Design system values verified from design-system.md recon + spec
- [x] No [UNVERIFIED] values — all visual patterns reuse existing FrostedCard treatment
- [x] No deprecated patterns used
- [x] Zero new localStorage keys, zero new packages

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Highlight echoes verse text | Async-load via `loadChapterWeb` in the hook, not the engine | Engine stays pure/synchronous; only the top 1-2 echoes need text loading, so async cost is minimal |
| `read-on-this-day` verse text | Empty string — card shows reference only (e.g., "John 3") without verse text block | Chapter visits have no verse-level data; loading the entire first verse would be out of context |
| `read-on-this-day` startVerse/endVerse | `startVerse: 0, endVerse: 0` | Sentinel value distinguishing chapter-level echoes from verse-level ones |
| `getAllHighlights()` snapshot instability | Use `useEffect` + `useState` instead of `useSyncExternalStore` | Highlight store returns new array on every call; spec forbids modifying BB-7 store |
| Engine receives raw store data as params | Engine functions take `(highlights, cards, visits)` not read from localStorage directly | Keeps engine pure and testable — callers (hook or tests) provide the data |
| Session freshness tracking | `Set<string>` in `useRef`, passed to engine as a param | Lost on page reload per spec; no localStorage persistence |
| EchoCard component vs FrostedCard component | EchoCard is a custom component matching frosted-glass visual, NOT wrapping FrostedCard | Spec says "NOT a FrostedCard component instance" — EchoCard has custom `<Link>` wrapper and layout |
| `prefers-reduced-motion` | Disable hover transition via `motion-reduce:transition-none` | Spec requirement 22 |

---

## Implementation Steps

### Step 1: Types & Echo Selection Engine

**Objective:** Create the Echo type and pure TypeScript selection engine at `frontend/src/lib/echoes/`.

**Files to create:**
- `frontend/src/types/echoes.ts` — Echo type + EchoKind type
- `frontend/src/lib/echoes/engine.ts` — Selection engine: candidate generation, scoring, sorting
- `frontend/src/lib/echoes/labels.ts` — Relative label generation
- `frontend/src/lib/echoes/index.ts` — Barrel export

**Details:**

**`types/echoes.ts`:**
```typescript
export type EchoKind = 'highlighted' | 'memorized' | 'read-on-this-day'

export interface Echo {
  id: string            // stable: `echo:${kind}:${book}:${chapter}:${startVerse}-${endVerse}`
  kind: EchoKind
  book: string          // slug
  bookName: string      // display name
  chapter: number
  startVerse: number    // 0 for read-on-this-day (chapter-level)
  endVerse: number      // 0 for read-on-this-day
  text: string          // verse content (empty for highlights until async-resolved, empty for read-on-this-day)
  reference: string     // "John 3:16" or "John 3:16-17" or "John 3" (chapter-level)
  relativeLabel: string // "a week ago", "on this day last year", etc.
  occurredAt: number    // epoch ms of original engagement
  score: number
}

export interface EchoOptions {
  limit?: number
  kinds?: EchoKind[]
}
```

**`lib/echoes/labels.ts`:**
```typescript
const INTERVAL_LABELS: Record<number, string> = {
  7: 'a week ago',
  14: 'two weeks ago',
  30: 'a month ago',
  60: 'two months ago',
  90: 'three months ago',
  180: 'six months ago',
  365: 'a year ago',
}

export function getRelativeLabel(matchedInterval: number, kind: EchoKind, year?: number): string
export function getMatchedInterval(daysSince: number): number | null  // returns interval or null
```

The `getMatchedInterval` function checks if `daysSince` falls within ±1 of any meaningful interval (7, 14, 30, 60, 90, 180, 365).

**`lib/echoes/engine.ts`:**

Public API:
```typescript
export function getEchoes(
  highlights: Highlight[],
  cards: MemorizationCard[],
  visits: ChapterVisitStore,
  options?: EchoOptions,
  seen?: Set<string>,
): Echo[]

export function getEchoForHomePage(
  highlights: Highlight[],
  cards: MemorizationCard[],
  visits: ChapterVisitStore,
  seen?: Set<string>,
): Echo | null
```

Internal algorithm:
1. Generate candidates from each source:
   - **Highlights**: For each highlight, compute `daysSince = floor((now - createdAt) / 86400000)`. If `getMatchedInterval(daysSince)` returns a match, create candidate with `kind: 'highlighted'`, base score 80.
   - **Memorized**: Same interval check on `createdAt`. Base score 100. `verseText` and `bookName` directly available.
   - **Read-on-this-day**: For each date key in visits, check if month+day match today but year differs. Base score 40. `startVerse: 0, endVerse: 0, text: ''`.
2. Score each candidate: `baseScore + max(0, 50 - daysSinceEngagement / 10) + (seen.has(id) ? -50 : 0)`
3. Variety filter: group by book, keep only highest-scored per book
4. Filter by `options.kinds` if provided
5. Sort by score descending
6. Limit to `options.limit` (default: 10)
7. `getEchoForHomePage` calls `getEchoes` with `limit: 1` and returns `[0] ?? null`

Book name resolution: import `BIBLE_BOOKS` from `@/constants/bible` and use `BIBLE_BOOKS.find(b => b.slug === slug)?.name ?? slug`.

Reference formatting:
- Single verse highlight: `"${bookName} ${chapter}:${startVerse}"`
- Range highlight: `"${bookName} ${chapter}:${startVerse}-${endVerse}"`
- Memorized: use `card.reference` directly
- Read-on-this-day: `"${bookName} ${chapter}"` (chapter-level, no verse)

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT import React or any React hooks in the engine
- Do NOT read from localStorage directly — receive data as function parameters
- Do NOT persist session freshness to localStorage (spec: in-memory only)
- Do NOT modify the source data (highlights, cards, visits)
- Do NOT use `Date` constructor with string arguments (timezone-unsafe) — use epoch ms arithmetic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| no history returns empty | unit | `getEchoes([], [], {})` returns `[]` |
| highlight at 7 days produces echo | unit | Highlight with `createdAt` exactly 7 days ago → 1 echo |
| highlight at 8 days (tolerance) produces echo | unit | 8 days = within ±1 of 7 → produces echo |
| highlight at 10 days produces nothing | unit | 10 days = outside any interval → no echo |
| memorized at 30 days produces echo | unit | Card at 30 days → echo with `verseText` |
| read-on-this-day matches same month/day different year | unit | Visit on "2025-04-13" when today is "2026-04-13" → echo |
| read-on-this-day rejects same year | unit | Visit on today's date same year → no echo |
| scoring: memorized > highlighted > read-on-this-day | unit | Same interval, all three kinds → sorted by base score |
| recency bonus applied correctly | unit | 7-day-old echo scores higher than 365-day-old echo of same kind |
| variety penalty: one per book | unit | Two highlights from same book → only highest-scored retained |
| freshness penalty: seen echo scores lower | unit | Pass echo ID in seen set → score reduced by 50 |
| multi-verse highlight range | unit | Highlight with startVerse=16, endVerse=17 → reference "Book N:16-17" |
| getEchoForHomePage returns top or null | unit | Returns highest-scored echo, or null if none |
| options.kinds filter | unit | Pass `kinds: ['memorized']` → only memorized echoes returned |
| options.limit respected | unit | Multiple candidates → limited to specified count |
| relative labels correct | unit | 7→"a week ago", 30→"a month ago", 365→"a year ago" |
| read-on-this-day label with year | unit | "on this day in 2024" when year differs by >1 |
| read-on-this-day label "last year" | unit | "on this day last year" when year differs by exactly 1 |
| tolerance ±1 day boundary | unit | 6 days (below 7-1) → no match; 8 days (within 7+1) → match |
| empty text for highlights | unit | Highlight echo has `text: ''` |

**Expected state after completion:**
- [ ] `types/echoes.ts` exports `Echo`, `EchoKind`, `EchoOptions`
- [ ] `lib/echoes/engine.ts` exports `getEchoes`, `getEchoForHomePage`
- [ ] `lib/echoes/labels.ts` exports `getRelativeLabel`, `getMatchedInterval`
- [ ] `lib/echoes/index.ts` barrel exports all public API
- [ ] Engine is pure TypeScript with zero React imports
- [ ] 20 unit tests passing

---

### Step 2: useEcho / useEchoes Hooks

**Objective:** Create React hooks that surface echoes reactively, with async verse text resolution for highlight-based echoes.

**Files to create:**
- `frontend/src/hooks/useEcho.ts` — React hooks

**Details:**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { getAllHighlights, subscribe as hlSubscribe } from '@/lib/bible/highlightStore'
import { getAllCards, subscribe as memSubscribe } from '@/lib/memorize'
import { getAllVisits, subscribe as visitSubscribe } from '@/lib/heatmap/chapterVisitStore'
import { getEchoes, getEchoForHomePage } from '@/lib/echoes'
import { loadChapterWeb } from '@/data/bible'
import type { Echo, EchoKind } from '@/types/echoes'
```

**`useEcho(options?: { kinds?: EchoKind[] }): Echo | null`:**
1. `useState<Echo | null>(null)` for the result
2. `useRef(new Set<string>())` for session freshness tracking
3. `useEffect` subscribes to all 3 stores, calls `getEchoForHomePage(getAllHighlights(), getAllCards(), getAllVisits(), seenRef.current)` on mount and on any store change
4. If result is a highlight echo with empty `text`, triggers `loadChapterWeb(echo.book, echo.chapter)` to resolve verse text:
   - Extract verses matching `startVerse..endVerse` from the loaded chapter
   - Concatenate with space separator
   - Update state with enriched echo
5. If no result or result has text already (memorized) → set state directly
6. Returns echo (possibly with empty text briefly while loading) or null

**`useEchoes(options?: { limit?: number; kinds?: EchoKind[] }): Echo[]`:**
1. Same subscription pattern but calls `getEchoes` instead
2. Same async text resolution for any highlight echoes in the result
3. Returns array (empty for new users)

**`markEchoSeen(id: string)`:**
Exported from the hook module. Adds to a module-level `Set<string>` (shared across hook instances in the same page session). This is NOT a React ref — it's a module-level variable so the engine can read it from any hook instance. Lost on page reload per spec.

**Memoization strategy:** The hooks only re-render consuming components when the store subscriptions fire (highlight/memorization/visit changes). Since these stores change infrequently (only when user interacts with BibleReader), re-renders from echo hooks are rare.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT use `useSyncExternalStore` (highlight store and visit store lack snapshot caching; spec forbids modifying those stores)
- Do NOT persist the seen set to localStorage
- Do NOT trigger re-renders on unrelated state changes in the parent component (the `useEffect` + `useState` pattern ensures this)
- Do NOT call `loadChapterWeb` unless there's actually a highlight echo that needs text enrichment

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns null for empty stores | unit | No highlights, no cards, no visits → `useEcho` returns null |
| returns echo when highlight matches interval | unit | Seed highlight store, verify hook returns echo |
| subscribes to all three stores | unit | Verify subscribe called for each store on mount |
| unsubscribes on unmount | unit | Verify returned unsubscribe functions called |
| async resolves verse text for highlight echo | unit | Mock `loadChapterWeb`, verify text populated after async |
| memorized echo has text immediately | unit | Card with `verseText` → echo text available synchronously |
| markEchoSeen updates session set | unit | Call `markEchoSeen`, verify subsequent calls reflect freshness penalty |
| useEchoes returns array | unit | Multiple candidates → returns sorted array |
| useEchoes respects limit option | unit | Pass `limit: 2` → max 2 results |

**Expected state after completion:**
- [ ] `hooks/useEcho.ts` exports `useEcho`, `useEchoes`, `markEchoSeen`
- [ ] Hooks subscribe to all three source stores
- [ ] Verse text async-resolved for highlight echoes
- [ ] 9 unit tests passing

---

### Step 3: EchoCard Component

**Objective:** Create the EchoCard component that renders a single echo as a frosted-glass clickable card.

**Files to create:**
- `frontend/src/components/echoes/EchoCard.tsx` — Card component

**Details:**

**Props interface:**
```typescript
interface EchoCardProps {
  echo: Echo
  onNavigate?: () => void  // called before navigation (for markEchoSeen)
}
```

**Component structure:**
```tsx
<Link
  to={`/bible/${echo.book}/${echo.chapter}${echo.startVerse > 0 ? `?verse=${echo.startVerse}` : ''}`}
  onClick={() => onNavigate?.()}
  aria-label={`Echo: you ${kindVerb} ${echo.reference} ${echo.relativeLabel}. Tap to open.`}
  className="block rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 sm:p-5 hover:bg-white/[0.08] transition-colors duration-150 motion-reduce:transition-none"
>
  {/* Label row: icon + text */}
  <div className="flex items-center gap-1.5 mb-3">
    <KindIcon className="h-3.5 w-3.5 text-white/30 shrink-0" />
    <span className="text-xs text-white/50">
      You {kindVerb} this {echo.relativeLabel}
    </span>
  </div>

  {/* Verse text (only if present) */}
  {echo.text && (
    <p className="text-base text-white leading-relaxed font-serif">
      {echo.text}
    </p>
  )}

  {/* Reference */}
  <p className="text-sm text-white/60 mt-3 text-right">
    — {echo.reference}
  </p>
</Link>
```

**Kind → icon mapping:**
- `highlighted` → `Highlighter` from lucide-react, verb = "highlighted"
- `memorized` → `Bookmark` from lucide-react, verb = "memorized"
- `read-on-this-day` → `Calendar` from lucide-react, verb = "read"

**Deep link construction:**
- Verse-level echoes: `/bible/${book}/${chapter}?verse=${startVerse}`
- Chapter-level (read-on-this-day, `startVerse === 0`): `/bible/${book}/${chapter}` (no verse param)

**Auth gating:** None — Bible routes are public

**Responsive behavior:**
- Desktop (1440px): Card within parent max-width, hover state `bg-white/[0.08]`, `p-5`
- Tablet (768px): Same as desktop, within parent max-width, `p-5`
- Mobile (375px): Full-width within parent `px-4`, `p-4 sm:p-5`, no hover

**Guardrails (DO NOT):**
- Do NOT use `FrostedCard` component (spec: "NOT a FrostedCard component instance" — custom `<Link>` wrapper)
- Do NOT add entrance animation (deferred to BB-33)
- Do NOT add dismiss button (deferred per spec)
- Do NOT use `dangerouslySetInnerHTML` for verse text
- Do NOT add `GlowBackground` (Daily Hub uses HorizonGlow; Dashboard has its own background)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders label with kind and relative label | unit | "You highlighted this a month ago" |
| renders verse text in serif font | unit | `.font-serif` on verse paragraph |
| renders reference right-aligned | unit | Reference with `text-right` |
| shows Highlighter icon for highlighted kind | unit | Icon matches kind |
| shows Bookmark icon for memorized kind | unit | Icon matches kind |
| shows Calendar icon for read-on-this-day kind | unit | Icon matches kind |
| links to correct deep link URL | unit | `to` prop = `/bible/john/3?verse=16` |
| chapter-level link omits verse param | unit | `read-on-this-day` echo → `/bible/john/3` (no `?verse=`) |
| calls onNavigate on click | unit | `userEvent.click` → `onNavigate` called |
| has correct aria-label | unit | Contains kind verb, reference, relative label |
| hides verse text when empty | unit | `read-on-this-day` with `text: ''` → no `<p>` for verse |
| applies hover class | unit | `hover:bg-white/[0.08]` in className |

**Expected state after completion:**
- [ ] `components/echoes/EchoCard.tsx` renders frosted-glass card
- [ ] Card is a `<Link>` navigating to Bible reader deep link
- [ ] 3 kind icons render correctly
- [ ] Verse text hidden when empty (read-on-this-day)
- [ ] 12 component tests passing

---

### Step 4: Dashboard Integration

**Objective:** Mount a single EchoCard on the Dashboard between the greeting section and the widget grid.

**Files to modify:**
- `frontend/src/pages/Dashboard.tsx` — Add echo import + mount point

**Details:**

Import the hook and component at the top of `Dashboard.tsx`:
```typescript
import { useEcho, markEchoSeen } from '@/hooks/useEcho'
import { EchoCard } from '@/components/echoes/EchoCard'
```

Inside the Dashboard component body, call the hook:
```typescript
const topEcho = useEcho()
```

Insert the EchoCard between the DashboardHero wrapper `</div>` (line 512) and the `godMoments` check (line 513):

```tsx
{topEcho && (
  <div
    className={cn(
      'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
      shouldAnimate && 'motion-safe:animate-widget-enter',
    )}
    style={shouldAnimate ? { animationDelay: '100ms' } : undefined}
  >
    <EchoCard
      echo={topEcho}
      onNavigate={() => markEchoSeen(topEcho.id)}
    />
  </div>
)}
```

The container uses the same `max-w-6xl` + padding pattern as the surrounding dashboard sections. The animation delay staggers after DashboardHero (0ms) and before godMoments/WidgetGrid.

**Auth gating:** Dashboard is auth-gated at the route level (only renders when `isAuthenticated`). No additional auth check needed for the echo card.

**Responsive behavior:**
- Desktop (1440px): Card within `max-w-6xl` container, `px-6` side padding, hover active
- Tablet (768px): Same container, `px-4` side padding
- Mobile (375px): Full-width within `px-4`, no hover

**Guardrails (DO NOT):**
- Do NOT add a section heading above the echo card (spec: "not stacked clutter")
- Do NOT render a placeholder when `topEcho` is null (spec: "no placeholder, no first-run message")
- Do NOT add the echo inside DashboardHero or DashboardWidgetGrid — it's a standalone section between them

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders EchoCard when echo exists | integration | Mock useEcho to return an echo → card renders |
| renders nothing when echo is null | integration | Mock useEcho to return null → no echo markup |

**Expected state after completion:**
- [ ] Dashboard shows a single EchoCard between hero and widget grid when echo data exists
- [ ] Dashboard renders normally (no extra markup) when no echoes
- [ ] 2 integration tests passing

---

### Step 5: Daily Hub Devotional Integration

**Objective:** Mount a single EchoCard at the bottom of the DevotionalTabContent, after the reading plan callout and before the Share & Read Aloud buttons.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Add echo import + mount point

**Details:**

Import the hook and component:
```typescript
import { useEcho, markEchoSeen } from '@/hooks/useEcho'
import { EchoCard } from '@/components/echoes/EchoCard'
```

Inside DevotionalTabContent, call the hook:
```typescript
const topEcho = useEcho()
```

Insert between the `showPlanCallout` closing brace (line 322) and the "Share & Read Aloud" section (line 324):

```tsx
{/* Verse echo — quiet callback to user's history */}
{topEcho && (
  <div className="py-6 sm:py-8">
    <EchoCard
      echo={topEcho}
      onNavigate={() => markEchoSeen(topEcho.id)}
    />
  </div>
)}
```

The `py-6 sm:py-8` padding matches the adjacent Pray CTA section spacing (line 297). The card sits within the existing `max-w-2xl` container of the devotional tab. No section heading per spec: "should feel like a natural 'one more thing' rather than a new section."

**Auth gating:** N/A — DevotionalTabContent is a public route

**Responsive behavior:**
- Desktop (1440px): Card within `max-w-2xl` container, hover active
- Tablet (768px): Same `max-w-2xl` container
- Mobile (375px): Full-width within container's `px-4`

**Guardrails (DO NOT):**
- Do NOT add a section heading wrapping the echo card
- Do NOT add `GlowBackground` — the HorizonGlow shows through the transparent background
- Do NOT place inside a FrostedCard wrapper — the echo IS the card
- Do NOT add the echo inside any existing section — it's a standalone element between sections

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders EchoCard in devotional tab when echo exists | integration | Mock useEcho → card renders after plan callout |
| renders nothing when echo is null | integration | Mock useEcho returns null → no echo markup |

**Expected state after completion:**
- [ ] DevotionalTabContent shows EchoCard after plan callout when echo exists
- [ ] No extra markup when no echoes
- [ ] 2 integration tests passing

---

### Step 6: Documentation

**Objective:** Create recon documentation and update localStorage key inventory.

**Files to create/modify:**
- `_plans/recon/bb46-echoes.md` — Feature documentation

**Details:**

Create `_plans/recon/bb46-echoes.md` covering:
1. **Selection algorithm** — candidate generation from 3 sources, interval matching with ±1 tolerance
2. **Scoring formula** — base scores (100/80/40), recency bonus formula, variety penalty, freshness penalty
3. **Meaningful intervals** — 7, 14, 30, 60, 90, 180, 365 days
4. **Relative label mapping** — interval → human-readable string
5. **Verse text resolution** — memorized (synchronous), highlighted (async via loadChapterWeb), read-on-this-day (empty)
6. **Integration points** — Dashboard (between hero and widgets), DevotionalTabContent (after plan callout)
7. **Deferred follow-ups** — dismiss button, echoes feed page, My Bible integration, animations (BB-33), empty states (BB-34)

**Zero new localStorage keys** — confirmed. No update to `11-local-storage-keys.md` needed.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify CLAUDE.md — this is a sub-feature within the Bible redesign wave, not a new phase

**Test specifications:** N/A — documentation only

**Expected state after completion:**
- [ ] `_plans/recon/bb46-echoes.md` created with algorithm documentation
- [ ] No changes to `11-local-storage-keys.md` (zero new keys)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Echo Selection Engine |
| 2 | 1 | useEcho / useEchoes Hooks |
| 3 | 1 | EchoCard Component |
| 4 | 2, 3 | Dashboard Integration |
| 5 | 2, 3 | Daily Hub Devotional Integration |
| 6 | 1-5 | Documentation |

Steps 2 and 3 can be implemented in parallel after Step 1. Steps 4 and 5 can be implemented in parallel after Steps 2 and 3.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Echo Selection Engine | [COMPLETE] | 2026-04-13 | Created `types/echoes.ts`, `lib/echoes/engine.ts`, `lib/echoes/labels.ts`, `lib/echoes/index.ts`. 39 tests passing (21 label + 18 engine). |
| 2 | useEcho / useEchoes Hooks | [COMPLETE] | 2026-04-13 | Created `hooks/useEcho.ts` with `useEcho`, `useEchoes`, `markEchoSeen`. 9 hook tests passing. |
| 3 | EchoCard Component | [COMPLETE] | 2026-04-13 | Created `components/echoes/EchoCard.tsx`. 12 component tests passing. |
| 4 | Dashboard Integration | [COMPLETE] | 2026-04-13 | Added EchoCard to Dashboard.tsx between hero and godMoments. 2 integration tests passing. |
| 5 | Daily Hub Devotional Integration | [COMPLETE] | 2026-04-13 | Added EchoCard to DevotionalTabContent.tsx after plan callout. 2 integration tests passing. |
| 6 | Documentation | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb46-echoes.md` with algorithm docs. No localStorage key updates needed. |
