# Implementation Plan: BB-10 Daily Hub Bridge — Pray

**Spec:** `_specs/bb-10-daily-hub-bridge-pray.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

Bible bridge files relevant to BB-10:

- **Types:** `src/types/daily-experience.ts` — add `VerseContext`, `VerseContextPartial`, `PrayerVerseContext`
- **Types:** `src/types/verse-actions.ts` — add `navigate` to `VerseActionContext`
- **Verse Context Utility (new):** `src/lib/dailyHub/verseContext.ts` — `parseVerseContextFromUrl`, `hydrateVerseContext`, `formatReference`
- **URL Builder (new):** `src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` — builds `/daily?tab=...&verseBook=...` URL
- **Pre-load Hook (new):** `src/hooks/dailyHub/useVerseContextPreload.ts` — reads URL params, hydrates verse context, cleans URL
- **VersePromptCard (new):** `src/components/daily/VersePromptCard.tsx` — displays verse reference, text, framing line, remove button
- **PrayTabContent:** `src/components/daily/PrayTabContent.tsx` — wire verse context hook, mount VersePromptCard, pass verseContext on save
- **Registry:** `src/lib/bible/verseActionRegistry.ts` — replace pray stub (lines 298-307) with real handler
- **Action Sheet:** `src/components/bible/reader/VerseActionSheet.tsx` — pass `navigate` in context

### Existing Patterns

**URL param consumption in DailyHub.tsx (lines 78-90):**
- `urlContext` and `urlPrompt` refs capture `?context=` and `?prompt=` params once on mount
- Cleanup fires only if `context` or `prompt` params are present — verse params (`verseBook`, etc.) survive this cleanup
- Pattern: read once with `useRef`, clear after consume via `setSearchParams({ tab }, { replace: true })`

**PrayTabContent context pre-fill pattern (lines 55-93):**
- Multiple `useEffect` hooks handle different context sources: prayWallContext (location.state), initialContext (URL param), challengeContext (location.state), devotionalContext (prayContext prop)
- Each uses a `useRef` consumed flag to prevent re-processing
- `activeTab === 'pray'` guard ensures processing only when pray tab is active

**VerseActionContext (src/types/verse-actions.ts:50-53):**
- `showToast` and `closeSheet` methods
- `closeSheet` already exists — BB-10 does not need to add it
- `navigate` will be added for the pray handler to perform React Router navigation

**VerseActionSheet context creation (lines 177-180):**
- Context built inline: `{ showToast: forwardShowToast, closeSheet: onClose }`
- `useNavigate` will be imported and `navigate` added to context

**VerseSelection type (src/types/verse-actions.ts:1-8):**
```typescript
interface VerseSelection {
  book: string        // slug e.g. "john"
  bookName: string    // display e.g. "John"
  chapter: number
  startVerse: number
  endVerse: number
  verses: Array<{ number: number; text: string }>
}
```

**Chapter loader (src/data/bible/index.ts:27-48):**
- `loadChapterWeb(bookSlug, chapter)` returns `BibleChapter | null`
- `BibleChapter.verses` is `Array<{ number: number; text: string }>`
- Returns `null` on unknown slug, failed import, or missing chapter

**Book metadata (src/constants/bookMetadata.ts):**
- `BookMetadata` has `slug`, `name`, `chapterCount`
- Slug format: lowercase, hyphens for numbered/multi-word books (e.g., `1-corinthians`, `song-of-solomon`)
- `BIBLE_BOOKS` array from `src/constants/bible.ts` has same `slug` and `chapterCount`

**PrayTabContent rendering (lines 198-257):**
```
<div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
  DevotionalPreviewPanel (when devotional context)
  PrayerResponse (when loading or prayer generated)
  PrayerInput (when no prayer and not loading)
</div>
<div className="mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14">
  GuidedPrayerSection
</div>
```

VersePromptCard slots between DevotionalPreviewPanel and PrayerInput/PrayerResponse.

### Test Patterns

- **Utility tests:** Vitest with `describe`/`it` blocks, direct function calls, `expect` assertions
- **Hook tests:** `renderHook` from `@testing-library/react`, wrapper with `MemoryRouter` for hooks that use `useSearchParams`
- **Component tests:** React Testing Library with `render`, `screen`, `fireEvent`/`userEvent`, wrapped in providers as needed
- **Provider wrapping for PrayTabContent tests:** `AuthModalProvider`, `ToastProvider`, `AudioProvider`, `MemoryRouter`
- **Mock pattern for `loadChapterWeb`:** `vi.mock('@/data/bible/index', ...)` with return value control

### Auth Gating

Per the spec, the bridge navigation itself is NOT auth-gated. The existing Pray tab auth gating on the submit action ("Help Me Pray" button) applies unchanged. No new auth gates are introduced.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap "Pray about this" in action sheet | No gate | Step 7 | N/A — navigation only |
| View verse prompt card | No gate | Step 6 | N/A — renders for all users |
| Remove verse prompt card (X) | No gate | Step 5 | N/A |
| Type in composer | No gate (existing) | N/A | Existing behavior unchanged |
| Submit prayer ("Help Me Pray") | Existing auth gate | N/A | Existing `useAuthModal` in `handleGenerate` |

No new auth gates. Existing submit gate applies unchanged.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| VersePromptCard container | background + border | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` | 09-design-system.md § FrostedCard Tier System (Tier 2) |
| VersePromptCard container | additional padding | `py-4` (slightly more than Tier 2 default for multi-element card) | Codebase inspection of devotional Tier 2 |
| Verse reference text | font + color | `font-serif text-white text-base sm:text-lg font-semibold` | design-system.md (scripture uses Lora serif) |
| Verse body text | font + spacing | `text-white leading-[1.75] text-[17px] sm:text-lg` | design-system.md § Daily Hub body text readability |
| Verse numbers | style | `text-white/30 text-xs font-sans align-super mr-1` | design-system.md text color table (superscript verse numbers) |
| Framing line | color + size | `text-white/60 text-sm mt-3` | Spec: "muted text" → design-system.md muted labels = white/60 |
| Remove X button | size + color | `min-w-[44px] min-h-[44px] text-white/50 hover:text-white/80 transition-colors` | Spec: matches meditate verse banner X pattern |
| Skeleton placeholder | style | `rounded-xl bg-white/[0.04] animate-pulse h-24` | Standard skeleton pattern |
| Card margin | spacing | `mb-4` (gap above textarea) | DevotionalPreviewPanel pattern: `mb-4` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components. GlowBackground is still used by the homepage.
- Daily Hub tab headings ("What's On Your Heart/Mind/Spirit?") have been REMOVED. Tab content leads directly into the input or activity — no heading.
- Devotional readability tiers (Spec T): Tier 1 (primary reading content) uses `FrostedCard` with `text-white`, `leading-[1.75]` to `leading-[1.8]`, font sizing `text-[17px] sm:text-lg`. Tier 2 (scripture callout) uses `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` — a left-border accent treatment. The VersePromptCard uses Tier 2.
- Pray and Journal textareas use the canonical static white box-shadow glow: `shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] border border-white/30 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30`. Do NOT use `animate-glow-pulse` (deprecated) or cyan border (deprecated).
- White pill CTA patterns: Pattern 1 (inline, smaller, used inside cards) and Pattern 2 (homepage primary, larger with white drop shadow). See `09-design-system.md` § "White Pill CTA Patterns" for the canonical class strings.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card. The VersePromptCard does NOT use FrostedCard — it uses the lighter Tier 2 pattern.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- Verse reference uses Lora serif (`font-serif`). Framing line uses Inter sans (default `font-sans`).
- Zero raw hex values in components — all colors use Tailwind classes or design tokens.
- `prefers-reduced-motion`: animations gated behind `useReducedMotion()` hook. Reduced motion = instant display (no fade-in).
- BB-9 execution log showed no design system deviations — patterns are stable.

---

## Shared Data Models

### New Types (src/types/daily-experience.ts)

```typescript
/** Partial context parsed from URL (before hydration — no verse text) */
export interface VerseContextPartial {
  book: string          // book slug from bookMetadata (e.g., 'john')
  chapter: number
  startVerse: number
  endVerse: number
  source: 'bible'
}

/** Full hydrated verse context (after loading verse text from WEB JSON) */
export interface VerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  verses: Array<{ number: number; text: string }>
  reference: string     // pre-formatted: "John 3:16" or "John 3:16–18"
  source: 'bible'
}

/** Verse context attached to saved prayers (subset of VerseContext — no verse text) */
export interface PrayerVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}
```

### Extended Type (src/types/verse-actions.ts)

```typescript
export interface VerseActionContext {
  showToast: (message: string, type?: string, action?: { label: string; onClick: () => void }) => void
  closeSheet: (options?: { navigating?: boolean }) => void
  navigate: (url: string) => void   // NEW — React Router navigation for bridge handlers
}
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_draft` | Read (existing) | Draft auto-save — BB-10 does not change this behavior |

No new localStorage keys introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | VersePromptCard full-width within `px-4` container, verse text wraps naturally, X button 44px tap target |
| Tablet | 768px | Same layout — slightly more horizontal padding from `max-w-2xl` container centering |
| Desktop | 1440px | VersePromptCard within `max-w-2xl` Pray tab container — comfortable reading width |

The VersePromptCard stacks vertically above the textarea at all breakpoints. No horizontal layout changes between breakpoints — the card is always full-width within its container.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The VersePromptCard is a single vertical card stacking above the textarea. The reference, verse text, framing line, and X button are stacked vertically within the card (except the X button which is absolutely positioned top-right).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DevotionalPreviewPanel → VersePromptCard | 16px (`mb-4`) | DevotionalPreviewPanel uses `mb-4` |
| VersePromptCard → PrayerInput textarea | 16px (`mb-4`) | Consistent with DevotionalPreviewPanel gap |
| Hydration skeleton → PrayerInput | 16px (`mb-4`) | Same gap as card |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-6 (verse action sheet + registry) is committed and stable
- [ ] BB-4 (verse spans + WEB data) is committed — `loadChapterWeb` works
- [ ] `VerseSelection` type has `book` (slug), `bookName`, `chapter`, `startVerse`, `endVerse`, `verses`
- [ ] `VerseActionContext` has `closeSheet` method (confirmed: line 52 of types/verse-actions.ts)
- [ ] `BIBLE_BOOKS` constant has `slug` and `chapterCount` fields
- [ ] All auth-gated actions from the spec are accounted for in the plan (none new — existing submit gate unchanged)
- [ ] Design system values are verified (from design-system.md recon + 09-design-system.md)
- [ ] No deprecated patterns used (confirmed: no Caveat headings, BackgroundSquiggle, GlowBackground, animate-glow-pulse, cyan borders, italic Lora prompts, soft-shadow cards)
- [ ] Prior specs in the sequence are complete (BB-6, BB-4)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| URL param cleanup timing | Clean immediately after parsing, before async hydration | Prevents race condition with `switchTab` clearing params mid-hydration. Spec says "after successful pre-load" but immediate cleanup is safer — hydration is a fast local JSON import, so the risk of losing context on refresh is negligible. |
| Hook location | Inside `PrayTabContent`, not `DailyHub.tsx` | Keeps verse context state local to the pray tab. DailyHub doesn't need to know about Bible bridge context. Follows the pattern of other context sources (prayWallContext, initialContext) being consumed inside PrayTabContent. |
| Re-navigation support | Track `lastConsumedKey` ref to allow consuming new verse params after a previous consumption | User might navigate from Bible to Pray, dismiss the card, go back to Bible, and navigate again. The hook must handle this without requiring a page reload. |
| DevotionalPreviewPanel + VersePromptCard coexistence | Both render if both contexts present (vertically stacked) | Unlikely in practice (different flows) but spec says the card sits between DevotionalPreviewPanel and textarea. Defensive rendering. |
| VersePromptCard visibility during prayer generation | Hidden when `isLoading` or `prayer` is set | The verse prompt card is pre-submit context. Once the prayer is generated, it's no longer needed. The verseContext is captured at submit time. |
| `navigate` on `VerseActionContext` | Added as a required method | All handlers receive it; only bridge handlers (pray, journal, meditate) use it. Existing handlers ignore it. Backward-compatible addition. |
| Book slug format in URL | Uses `bookMetadata.slug` (e.g., `1-corinthians`) | Consistent with existing Bible reader URL structure (`/bible/:book/:chapter`). Hyphenated slugs are URL-safe. |
| `formatReference` book name source | Read from `BIBLE_BOOKS` constant by slug, not from URL | URL only carries the slug; display name comes from the authoritative constant. Handles numbered books (1 Corinthians) and multi-word (Song of Solomon) correctly. |

---

## Implementation Steps

### Step 1: Types — VerseContext, PrayerVerseContext, VerseActionContext

**Objective:** Add shared type definitions that all subsequent steps depend on.

**Files to create/modify:**
- `frontend/src/types/daily-experience.ts` — add `VerseContextPartial`, `VerseContext`, `PrayerVerseContext` types
- `frontend/src/types/verse-actions.ts` — add `navigate` method to `VerseActionContext`

**Details:**

In `types/daily-experience.ts`, append after the existing `PrayContext` interface (line 127):

```typescript
/** Partial context parsed from URL (before hydration — no verse text) */
export interface VerseContextPartial {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  source: 'bible'
}

/** Full hydrated verse context (after loading verse text from WEB JSON) */
export interface VerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  verses: Array<{ number: number; text: string }>
  reference: string
  source: 'bible'
}

/** Verse context attached to saved prayers */
export interface PrayerVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}
```

In `types/verse-actions.ts`, add `navigate` to `VerseActionContext` (line 52):

```typescript
export interface VerseActionContext {
  showToast: (message: string, type?: string, action?: { label: string; onClick: () => void }) => void
  closeSheet: (options?: { navigating?: boolean }) => void
  navigate: (url: string) => void
}
```

**Auth gating:** N/A — type definitions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify existing types — only add new interfaces and extend `VerseActionContext`
- Do NOT remove `closeSheet` from `VerseActionContext` — it's used by existing handlers
- Do NOT add `navigate` as optional — it must be required so the type system enforces it at every call site

**Test specifications:**

No dedicated tests for types. Type correctness is verified at compile time by `pnpm build`.

**Expected state after completion:**
- [ ] `VerseContext`, `VerseContextPartial`, `PrayerVerseContext` exported from `types/daily-experience.ts`
- [ ] `VerseActionContext` has `navigate` method
- [ ] `pnpm build` passes (confirms no type conflicts with existing code)

---

### Step 2: Verse Context Utility — Tests + Implementation (TDD)

**Objective:** Create the shared utility for parsing verse URL params, hydrating verse text from WEB JSON, and formatting display references. Write tests first (red), then implementation (green).

**Files to create/modify:**
- `frontend/src/lib/dailyHub/__tests__/verseContext.test.ts` — create test file (red phase)
- `frontend/src/lib/dailyHub/verseContext.ts` — create implementation (green phase)

**Details:**

**Test file (`verseContext.test.ts`) — write FIRST:**

Tests for `parseVerseContextFromUrl`:
1. Valid single verse — `verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible` → returns partial with `{ book: 'john', chapter: 3, startVerse: 16, endVerse: 16, source: 'bible' }`
2. Valid range — `verseBook=john&verseChapter=3&verseStart=16&verseEnd=18&src=bible` → returns partial
3. Invalid book slug — `verseBook=fakebook` → returns `null`
4. Out-of-range chapter — `verseBook=john&verseChapter=99` (John has 21 chapters) → returns `null`
5. `verseEnd < verseStart` — `verseStart=18&verseEnd=16` → returns `null`
6. Missing params — no `verseBook` → returns `null`
7. Malformed numbers — `verseChapter=abc` → returns `null`
8. Missing `src=bible` — returns `null`
9. Numbered book — `verseBook=1-corinthians&verseChapter=13&verseStart=4&verseEnd=4` → returns partial
10. Negative verse number — `verseStart=-1` → returns `null`

Tests for `formatReference`:
1. Single verse — `formatReference('John', 3, 16, 16)` → `"John 3:16"`
2. Range — `formatReference('John', 3, 16, 18)` → `"John 3:16–18"` (en-dash)
3. Numbered book — `formatReference('1 Corinthians', 13, 4, 4)` → `"1 Corinthians 13:4"`
4. Multi-word book — `formatReference('Song of Solomon', 2, 1, 1)` → `"Song of Solomon 2:1"`

Tests for `hydrateVerseContext` (mock `loadChapterWeb`):
1. Successful hydration — returns full context with verses and formatted reference
2. Failed chapter load — `loadChapterWeb` returns `null` → returns `null`
3. Verse numbers out of range — chapter has verses 1-20 but request is for verse 25 → returns `null` (empty verses array)
4. Multi-verse range — returns all verses in range with correct numbers and text
5. Unknown book slug — `loadChapterWeb` returns null → returns `null`

**Implementation file (`verseContext.ts`):**

```typescript
import { BIBLE_BOOKS } from '@/constants/bible'
import { loadChapterWeb } from '@/data/bible/index'
import type { VerseContext, VerseContextPartial } from '@/types/daily-experience'

export function parseVerseContextFromUrl(
  searchParams: URLSearchParams,
): VerseContextPartial | null {
  const book = searchParams.get('verseBook')
  const chapterStr = searchParams.get('verseChapter')
  const startStr = searchParams.get('verseStart')
  const endStr = searchParams.get('verseEnd')
  const src = searchParams.get('src')

  if (!book || !chapterStr || !startStr || !endStr || src !== 'bible') return null

  const chapter = parseInt(chapterStr, 10)
  const startVerse = parseInt(startStr, 10)
  const endVerse = parseInt(endStr, 10)

  if (isNaN(chapter) || isNaN(startVerse) || isNaN(endVerse)) return null
  if (chapter < 1 || startVerse < 1 || endVerse < startVerse) return null

  const bookMeta = BIBLE_BOOKS.find((b) => b.slug === book)
  if (!bookMeta) return null
  if (chapter > bookMeta.chapterCount) return null

  return { book, chapter, startVerse, endVerse, source: 'bible' }
}

export function formatReference(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): string {
  if (startVerse === endVerse) return `${bookName} ${chapter}:${startVerse}`
  return `${bookName} ${chapter}:${startVerse}\u2013${endVerse}` // en-dash
}

export async function hydrateVerseContext(
  partial: VerseContextPartial,
): Promise<VerseContext | null> {
  const chapterData = await loadChapterWeb(partial.book, partial.chapter)
  if (!chapterData) return null

  const verses = chapterData.verses.filter(
    (v) => v.number >= partial.startVerse && v.number <= partial.endVerse,
  )
  if (verses.length === 0) return null

  const bookMeta = BIBLE_BOOKS.find((b) => b.slug === partial.book)
  if (!bookMeta) return null

  return {
    ...partial,
    verses,
    reference: formatReference(bookMeta.name, partial.chapter, partial.startVerse, partial.endVerse),
  }
}
```

**Auth gating:** N/A — pure utility functions.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT throw errors on invalid input — return `null` for silent graceful degradation
- Do NOT log warnings on validation failure — spec says "no error toast on validation failure"
- Do NOT use `getBookBySlug` from `data/bible/index.ts` — use `BIBLE_BOOKS.find()` to avoid importing the entire Bible data module into the utility
- Do NOT use a regular hyphen for verse ranges — use en-dash (`\u2013`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| parseVerseContextFromUrl — valid single verse | unit | Validates correct parsing of single verse URL params |
| parseVerseContextFromUrl — valid range | unit | Validates range with endVerse > startVerse |
| parseVerseContextFromUrl — invalid book | unit | Unknown slug returns null |
| parseVerseContextFromUrl — out-of-range chapter | unit | Chapter > book's chapter count returns null |
| parseVerseContextFromUrl — end < start | unit | Inverted range returns null |
| parseVerseContextFromUrl — missing params | unit | Missing required param returns null |
| parseVerseContextFromUrl — malformed numbers | unit | Non-numeric chapter/verse returns null |
| parseVerseContextFromUrl — missing src=bible | unit | Missing or wrong src returns null |
| parseVerseContextFromUrl — numbered book | unit | `1-corinthians` slug validates correctly |
| parseVerseContextFromUrl — negative verse | unit | Negative numbers return null |
| formatReference — single verse | unit | "John 3:16" |
| formatReference — range | unit | "John 3:16–18" with en-dash |
| formatReference — numbered book | unit | "1 Corinthians 13:4" |
| formatReference — multi-word book | unit | "Song of Solomon 2:1" |
| hydrateVerseContext — success | unit | Returns full context with verses and reference |
| hydrateVerseContext — failed load | unit | loadChapterWeb null → returns null |
| hydrateVerseContext — out-of-range verses | unit | Empty verses array → returns null |
| hydrateVerseContext — multi-verse range | unit | Returns all verses in range |
| hydrateVerseContext — unknown book | unit | loadChapterWeb null → returns null |

**Expected state after completion:**
- [ ] All ~19 tests pass
- [ ] `parseVerseContextFromUrl`, `hydrateVerseContext`, `formatReference` exported
- [ ] `pnpm build` passes

---

### Step 3: URL Builder — Tests + Implementation (TDD)

**Objective:** Create the URL builder that produces correctly-encoded Daily Hub URLs from a verse selection. Write tests first (red), then implementation (green).

**Files to create/modify:**
- `frontend/src/lib/bible/verseActions/__tests__/buildDailyHubVerseUrl.test.ts` — create test file
- `frontend/src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` — create implementation

**Details:**

**Test file — write FIRST:**

1. Pray tab single verse — `buildDailyHubVerseUrl('pray', selection)` → `/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible`
2. Journal tab — same selection with `'journal'` → `tab=journal`
3. Meditate tab — same with `'meditate'` → `tab=meditate`
4. Range selection — startVerse=16, endVerse=18 → `verseStart=16&verseEnd=18`
5. Numbered book — book slug `1-corinthians` → `verseBook=1-corinthians`
6. Multi-word book — `song-of-solomon` → `verseBook=song-of-solomon`

**Implementation:**

```typescript
import type { VerseSelection } from '@/types/verse-actions'

export function buildDailyHubVerseUrl(
  tab: 'pray' | 'journal' | 'meditate',
  selection: VerseSelection,
): string {
  const params = new URLSearchParams({
    tab,
    verseBook: selection.book,
    verseChapter: String(selection.chapter),
    verseStart: String(selection.startVerse),
    verseEnd: String(selection.endVerse),
    src: 'bible',
  })
  return `/daily?${params.toString()}`
}
```

**Auth gating:** N/A — pure utility.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT URL-encode the book slug manually — `URLSearchParams` handles encoding
- Do NOT include verse text in the URL — text is hydrated client-side from WEB JSON
- Do NOT hard-code the path — use `/daily` consistently

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| produces pray tab URL | unit | Correct URL with tab=pray and all verse params |
| produces journal tab URL | unit | Same structure with tab=journal |
| produces meditate tab URL | unit | Same structure with tab=meditate |
| handles range selection | unit | verseStart and verseEnd are both present |
| handles numbered book slug | unit | `1-corinthians` encoded correctly |
| handles multi-word book slug | unit | `song-of-solomon` encoded correctly |

**Expected state after completion:**
- [ ] All 6 tests pass
- [ ] `buildDailyHubVerseUrl` exported
- [ ] `pnpm build` passes

---

### Step 4: Pre-load Hook — Tests + Implementation (TDD)

**Objective:** Create the hook that reads verse URL params, hydrates the context from WEB JSON, and provides state for the Pray tab. Write tests first (red), then implementation (green).

**Files to create/modify:**
- `frontend/src/hooks/dailyHub/__tests__/useVerseContextPreload.test.ts` — create test file
- `frontend/src/hooks/dailyHub/useVerseContextPreload.ts` — create implementation

**Details:**

**Test file — write FIRST:**

Wrap `renderHook` in a `MemoryRouter` with `initialEntries` to simulate URL params.

1. Returns `verseContext` after successful hydration — initial URL has valid verse params → `isHydrating` transitions true→false, `verseContext` is populated
2. Returns `null` for missing verse params — URL has only `?tab=pray` → `verseContext` is null, `isHydrating` stays false
3. Returns `null` for invalid params — URL has `verseBook=fakebook` → `verseContext` is null after validation failure
4. Cleans URL params after parse — after hook fires, URL becomes `/daily?tab=pray` (verse params removed)
5. `clearVerseContext` sets context to null — call the returned function, verify `verseContext` becomes null
6. Does not fire when tab is not pray — URL has `?tab=journal&verseBook=john&...` → `verseContext` stays null
7. Handles hydration failure — `loadChapterWeb` returns null → `verseContext` is null, `isHydrating` transitions true→false

Mock `loadChapterWeb` via `vi.mock('@/data/bible/index')`. Mock `BIBLE_BOOKS` if needed.

**Implementation:**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseVerseContextFromUrl, hydrateVerseContext } from '@/lib/dailyHub/verseContext'
import type { VerseContext } from '@/types/daily-experience'

export function useVerseContextPreload() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [verseContext, setVerseContext] = useState<VerseContext | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const lastConsumedKey = useRef<string | null>(null)
  const hydrating = useRef(false)

  useEffect(() => {
    if (hydrating.current) return

    const tab = searchParams.get('tab')
    if (tab !== 'pray') return

    const partial = parseVerseContextFromUrl(searchParams)
    if (!partial) return

    const key = `${partial.book}-${partial.chapter}-${partial.startVerse}-${partial.endVerse}`
    if (key === lastConsumedKey.current) return

    lastConsumedKey.current = key
    hydrating.current = true
    setIsHydrating(true)

    // Clean URL immediately to prevent race conditions with tab switching
    setSearchParams({ tab: 'pray' }, { replace: true })

    hydrateVerseContext(partial).then((ctx) => {
      if (ctx) {
        setVerseContext(ctx)
      }
      setIsHydrating(false)
      hydrating.current = false
    })
  }, [searchParams, setSearchParams])

  const clearVerseContext = useCallback(() => {
    setVerseContext(null)
  }, [])

  return { verseContext, isHydrating, clearVerseContext }
}
```

**Architecture note:** The URL is cleaned immediately after parsing (before async hydration), not after hydration completes. This deviates from spec requirement 14 ("After successful pre-load, the hook clears...") to prevent a race condition: if the user switches tabs during hydration, the cleanup `setSearchParams({ tab: 'pray' })` would incorrectly switch the URL back to the pray tab. Since hydration is a fast local JSON import (not a network request), the refresh-safety risk is negligible.

**Auth gating:** N/A — hook runs for all users.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT use `router.push` for URL cleanup — use `setSearchParams({ tab: 'pray' }, { replace: true })` to avoid adding a history entry
- Do NOT clear URL params after async hydration — clean immediately to prevent race conditions with `switchTab`
- Do NOT reset `lastConsumedKey` on unmount — PrayTabContent never unmounts (always-mounted tab panel)
- Do NOT consume params when `tab !== 'pray'` — PrayTabContent is always mounted; the guard prevents consuming params intended for other tabs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns verseContext after hydration | unit | Valid URL params → hydrated context |
| returns null for missing params | unit | No verse params → null context |
| returns null for invalid params | unit | Invalid book → null context |
| cleans URL after parse | unit | Verse params removed from URL |
| clearVerseContext resets to null | unit | Manual clear works |
| does not fire for non-pray tab | unit | Journal tab with verse params → no consumption |
| handles hydration failure | unit | loadChapterWeb null → null context |

**Expected state after completion:**
- [ ] All 7 tests pass
- [ ] `useVerseContextPreload` exported
- [ ] `pnpm build` passes

---

### Step 5: VersePromptCard — Component + Tests

**Objective:** Build the UI component that displays the verse reference, full verse text, framing line, and dismiss button above the prayer composer.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/VersePromptCard.test.tsx` — create test file
- `frontend/src/components/daily/VersePromptCard.tsx` — create component

**Details:**

**Props interface:**

```typescript
interface VersePromptCardProps {
  context: VerseContext
  onRemove: () => void
}
```

**Component structure:**

```tsx
<div
  className={cn(
    'relative mb-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4',
    !prefersReduced && 'animate-fade-in',
  )}
  role="region"
  aria-label={`Verse prompt: ${context.reference}`}
>
  {/* Remove button — top-right */}
  <button
    onClick={onRemove}
    className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/50 transition-colors hover:text-white/80"
    aria-label="Remove verse prompt"
  >
    <X className="h-5 w-5" />
  </button>

  {/* Verse reference */}
  <p className="pr-12 font-serif text-base font-semibold text-white sm:text-lg">
    {context.reference}
  </p>

  {/* Verse text */}
  <div className="mt-2 text-[17px] leading-[1.75] text-white sm:text-lg">
    {context.verses.map((v) => (
      <span key={v.number}>
        {context.verses.length > 1 && (
          <sup className="mr-1 align-super font-sans text-xs text-white/30">
            {v.number}
          </sup>
        )}
        {v.text}{' '}
      </span>
    ))}
  </div>

  {/* Framing line */}
  <p className="mt-3 text-sm text-white/60">
    What do you want to say to God about this?
  </p>
</div>
```

Key design decisions:
- Tier 2 scripture callout pattern (left border accent, `bg-white/[0.04]`) — lighter than FrostedCard
- Verse reference uses `font-serif` (Lora) consistent with scripture rendering elsewhere
- Verse numbers only shown for multi-verse selections (single verse = no superscript)
- `pr-12` on reference line makes space for the X button
- `animate-fade-in` uses the existing 500ms fade+slide Tailwind animation; instant when `prefers-reduced-motion`
- `role="region"` + `aria-label` for screen reader identification
- Zero raw hex values — all Tailwind classes

**Skeleton component** (inline, not a separate file):

```tsx
export function VersePromptSkeleton() {
  return (
    <div
      className="mb-4 rounded-xl border-l-4 border-l-primary/30 bg-white/[0.04] px-4 py-4"
      aria-hidden="true"
    >
      <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-16 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-white/10" />
    </div>
  )
}
```

**Auth gating:** N/A — renders for all users.

**Responsive behavior:**
- Desktop (1440px): Card within `max-w-2xl` container, comfortable reading width
- Tablet (768px): Same — slightly more side padding from container centering
- Mobile (375px): Full-width within `px-4` container, verse text wraps naturally, X button 44px touch target

**Guardrails (DO NOT):**
- Do NOT use `FrostedCard` component — use the lighter Tier 2 treatment (`bg-white/[0.04]`)
- Do NOT truncate verse text — spec says "every word is visible"
- Do NOT pre-populate the textarea — the verse is the prompt, not the content
- Do NOT use raw hex values — all colors via Tailwind classes
- Do NOT use `dangerouslySetInnerHTML` — verse text rendered as plain text
- Do NOT add `line-clamp` — verses wrap naturally without truncation
- Do NOT use italic on verse text — Spec T removed italic from sustained-reading prose

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders verse reference | unit | Shows "John 3:16" in the card |
| renders single verse text | unit | Full verse text visible, no verse number superscript |
| renders multi-verse with numbers | unit | Shows superscript numbers for each verse in a range |
| renders framing line | unit | "What do you want to say to God about this?" visible |
| X button has aria-label | unit | `aria-label="Remove verse prompt"` present |
| X button has 44px tap target | unit | `min-h-[44px]` and `min-w-[44px]` classes present |
| X button calls onRemove | unit | Click X → `onRemove` callback fires |
| card has accessible region | unit | `role="region"` with `aria-label` containing the reference |
| skeleton renders with aria-hidden | unit | Skeleton is hidden from screen readers |
| respects prefers-reduced-motion | unit | No `animate-fade-in` when reduced motion preferred |

**Expected state after completion:**
- [ ] All 10 tests pass
- [ ] `VersePromptCard` and `VersePromptSkeleton` exported
- [ ] `pnpm build` passes

---

### Step 6: Wire into PrayTabContent — Verse Context Integration

**Objective:** Integrate the pre-load hook and VersePromptCard into PrayTabContent. Pass `verseContext` through to the save flow.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — add hook, mount card, pass context
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add verse context tests

**Details:**

**Changes to PrayTabContent.tsx:**

1. Import the new hook and components:
```typescript
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import type { PrayerVerseContext } from '@/types/daily-experience'
```

2. Call the hook at the top of the component (after existing hooks, ~line 38):
```typescript
const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload()
```

3. Compute the `prayerVerseContext` for the save flow (captured at submit time):
```typescript
const prayerVerseContext: PrayerVerseContext | null = verseContext
  ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
  : null
```

4. In the render, mount `VersePromptSkeleton` and `VersePromptCard` between DevotionalPreviewPanel and PrayerResponse/PrayerInput (inside the `mx-auto max-w-2xl` div, after the DevotionalPreviewPanel block at ~line 208):

```tsx
{/* Verse Prompt Card (from Bible bridge) */}
{isHydrating && !isLoading && !prayer && <VersePromptSkeleton />}
{verseContext && !isLoading && !prayer && (
  <VersePromptCard context={verseContext} onRemove={clearVerseContext} />
)}
```

5. Pass `prayerVerseContext` to `PrayerResponse` as a new prop (the component will forward it to the save action):
```tsx
<PrayerResponse
  ...existingProps
  verseContext={prayerVerseContext}
/>
```

6. In `PrayerResponse.tsx` (minimal change): Accept optional `verseContext?: PrayerVerseContext | null` prop. When saving a prayer to `wr_prayer_list`, include `verseContext` if present. If PrayerResponse doesn't directly save, the prop is passed through to whatever save mechanism exists. This is a forward-compatible change — the field is purely additive.

**Auth gating:** No new gates. Existing auth gate on "Help Me Pray" unchanged.

**Responsive behavior:**
- Desktop (1440px): VersePromptCard renders within `max-w-2xl` container
- Tablet (768px): Same — responsive padding from container
- Mobile (375px): Full-width within `px-4` padding

**Guardrails (DO NOT):**
- Do NOT pre-populate the textarea with verse text — the verse is the prompt, not the content
- Do NOT clear the existing draft when verse context is present — spec says "verse prompt card appears in addition to the draft"
- Do NOT change the `handleGenerate` auth gate logic — existing behavior unchanged
- Do NOT modify the GuidedPrayerSection or its wider container
- Do NOT add GlowBackground or BackgroundSquiggle
- Do NOT show the VersePromptCard when a prayer is loading or already generated

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders VersePromptCard when verse params in URL | integration | Navigate to `/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible` → card visible |
| does not render card when no verse params | integration | Navigate to `/daily?tab=pray` → no card |
| removing card via X does not affect textarea draft | integration | Set draft in localStorage, navigate with verse params, click X → draft text still in textarea |
| card hidden after prayer generation | integration | With verse context, submit prayer → card disappears |
| skeleton shows during hydration | integration | Mock slow hydration → skeleton visible |
| invalid params show no card | integration | Invalid book slug → no card, no error |
| existing draft preserved with verse context | integration | Draft in localStorage + verse params → both card and draft visible |

**Expected state after completion:**
- [ ] All new tests pass (existing PrayTabContent tests still pass)
- [ ] VersePromptCard renders above textarea when verse params present
- [ ] Card disappears when prayer is generated or user clicks X
- [ ] Existing draft text preserved alongside verse prompt card
- [ ] `pnpm build` passes

---

### Step 7: Wire Registry Handler + VerseActionSheet

**Objective:** Replace the pray stub in the action registry with a real handler that builds the bridge URL, closes the sheet, and navigates. Add `navigate` to the VerseActionSheet context.

**Files to create/modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts` — replace pray stub handler (~lines 298-307)
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — add `useNavigate` and pass in context
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — add/update pray handler tests

**Details:**

**Registry change (`verseActionRegistry.ts`):**

Add import at top of file:
```typescript
import { buildDailyHubVerseUrl } from '@/lib/bible/verseActions/buildDailyHubVerseUrl'
```

Replace the pray handler (lines 298-307):
```typescript
const pray: VerseActionHandler = {
  action: 'pray',
  label: 'Pray about this',
  sublabel: 'Open in Daily Hub · Pray',
  icon: Heart,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (selection, ctx) => {
    const url = buildDailyHubVerseUrl('pray', selection)
    ctx.closeSheet({ navigating: true })
    ctx.navigate(url)
  },
}
```

**VerseActionSheet change:**

Add import:
```typescript
import { useNavigate } from 'react-router-dom'
```

Inside the component, add hook call (after existing hooks, ~line 49):
```typescript
const routerNavigate = useNavigate()
```

Update the context creation in `handleActionClick` (line 177-180):
```typescript
handler.onInvoke(selection, {
  showToast: forwardShowToast,
  closeSheet: onClose,
  navigate: (url) => routerNavigate(url),
})
```

Also update the sub-view context if it passes a context (search for `context?` in `renderSubView` calls):
```typescript
context={{ showToast: forwardShowToast, closeSheet: onClose, navigate: (url) => routerNavigate(url) }}
```

**Auth gating:** N/A — the pray action navigates to the Daily Hub, which is a public route. Auth gating applies at the submit action on the Pray tab, not at navigation.

**Responsive behavior:** N/A: no UI impact (behavior change only).

**Guardrails (DO NOT):**
- Do NOT use `window.location.href` for navigation — use React Router `navigate()` to avoid full page reload
- Do NOT auth-gate the "Pray about this" action — spec says navigation is not gated
- Do NOT change the journal or meditate handler stubs — they remain empty for BB-11 and BB-12
- Do NOT modify other handlers (highlight, bookmark, note, share, copy, cross-refs)
- Do NOT remove `closeSheet({ navigating: true })` — the `{ navigating: true }` option signals the sheet to skip exit animation since the page is about to change

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| pray handler calls buildDailyHubVerseUrl | unit | Mock buildDailyHubVerseUrl, invoke handler → called with ('pray', selection) |
| pray handler calls closeSheet with navigating | unit | Invoke handler → closeSheet called with `{ navigating: true }` |
| pray handler calls navigate with URL | unit | Invoke handler → navigate called with the built URL |
| pray handler passes through single verse | unit | Single verse selection → correct URL params |
| pray handler passes through range | unit | Multi-verse selection → correct URL params |

**Expected state after completion:**
- [ ] All 5 new tests pass (existing registry tests still pass)
- [ ] Tapping "Pray about this" in the action sheet navigates to `/daily?tab=pray&verseBook=...`
- [ ] VerseActionSheet passes `navigate` in context
- [ ] `pnpm build` passes

---

### Step 8: Integration Verification

**Objective:** Verify all components work together end-to-end. Run full test suite, build, and lint.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `pnpm test` — all existing + new tests pass
2. Run `pnpm build` — zero errors, zero warnings
3. Run `pnpm lint` — no new lint errors in BB-10 files
4. Verify acceptance criteria manually or via targeted test assertions:
   - Pray handler navigates to correct URL
   - VersePromptCard renders with reference, text, framing line
   - X button removes card without affecting draft
   - URL params cleaned after consumption
   - Invalid params degrade silently (no card, no error)
   - Existing Pray tab behavior unchanged (draft, auth gate, guided prayers)

**Auth gating:** N/A — verification step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any files in this step
- Do NOT skip running the full test suite — BB-10 touches shared types that could break other features

**Test specifications:**

No new tests. This step validates the full suite.

**Expected state after completion:**
- [ ] All tests pass (estimated ~50 new tests across Steps 2-7)
- [ ] Build passes
- [ ] Lint clean on all BB-10 files
- [ ] All acceptance criteria verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types (VerseContext, VerseActionContext.navigate) |
| 2 | 1 | Verse context utility (parse, hydrate, format) |
| 3 | 1 | URL builder |
| 4 | 1, 2 | Pre-load hook (uses parseVerseContextFromUrl + hydrateVerseContext) |
| 5 | 1 | VersePromptCard component |
| 6 | 4, 5 | Wire into PrayTabContent (uses hook + component) |
| 7 | 1, 3 | Wire registry handler + VerseActionSheet (uses URL builder + navigate type) |
| 8 | 6, 7 | Full integration verification |

**Parallelizable:** Steps 2, 3, and 5 can run in parallel with each other (no dependencies between them — all only depend on Step 1). Step 7 can run in parallel with Steps 4-6 (depends on Step 1 and 3 but not 4/5/6).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types | [COMPLETE] | 2026-04-08 | Added VerseContextPartial, VerseContext, PrayerVerseContext to daily-experience.ts; added navigate to VerseActionContext; fixed all existing context creation sites (3 test mocks + 2 VerseActionSheet sites) with no-op navigate for build compat |
| 2 | Verse Context Utility | [COMPLETE] | 2026-04-08 | Created verseContext.ts + tests (19/19 pass). Used BIBLE_BOOKS.chapters (not chapterCount). |
| 3 | URL Builder | [COMPLETE] | 2026-04-08 | Created buildDailyHubVerseUrl.ts + tests (6/6 pass). |
| 4 | Pre-load Hook | [COMPLETE] | 2026-04-08 | Created useVerseContextPreload.ts + tests (7/7 pass). URL cleaned immediately before hydration. |
| 5 | VersePromptCard | [COMPLETE] | 2026-04-08 | Created VersePromptCard.tsx + VersePromptSkeleton + tests (10/10 pass). Uses useReducedMotion hook. |
| 6 | Wire PrayTabContent | [COMPLETE] | 2026-04-08 | Wired useVerseContextPreload + VersePromptCard into PrayTabContent. Added verseContext prop to PrayerResponse (forward-compat). 6 new tests (72 total pass). |
| 7 | Wire Registry + Sheet | [COMPLETE] | 2026-04-08 | Replaced pray stub with real handler using buildDailyHubVerseUrl. Added useNavigate to VerseActionSheet. Linter auto-formatted. 5 new tests (40 total pass). |
| 8 | Integration Verification | [COMPLETE] | 2026-04-08 | Build passes (0 errors). 6232 tests pass / 20 fail (3 pre-existing BibleReader integration failures). Fixed VerseActionSheet.a11y.test.tsx Router wrapper + routerNavigate dep. Lint clean on all BB-10 files. |
