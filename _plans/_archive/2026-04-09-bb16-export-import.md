# Implementation Plan: BB-16 Export & Import

**Spec:** `_specs/bb-16-export-import.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave

---

## Architecture Context

### Project Structure

BB-16 adds export/import to the My Bible page (BB-14). All data lives in localStorage — no backend involvement.

**Existing stores (reactive — module-level cache + subscriber notification):**

| Store | File | Read | localStorage Key | Has `subscribe` | Has `restoreAll`/`restoreOne` |
|-------|------|------|-----------------|-----------------|-------------------------------|
| Highlights | `src/lib/bible/highlightStore.ts` | `getAllHighlights()` | `wr_bible_highlights` | yes | no |
| Bookmarks | `src/lib/bible/bookmarkStore.ts` | `getAllBookmarks()` | `bible:bookmarks` | yes | `restoreBookmarks()` (add-only, no merge) |
| Notes | `src/lib/bible/notes/store.ts` | `getAllNotes()` | `bible:notes` | yes | `restoreNote()` (single, add-only) |
| Journals | `src/lib/bible/journalStore.ts` | `getAllJournalEntries()` | `bible:journalEntries` | yes | no |

**Existing services (plain CRUD — no cache, no subscribers):**

| Service | File | Read | localStorage Key |
|---------|------|------|-----------------|
| Prayers | `src/services/prayer-list-storage.ts` | `getPrayers()` | `wr_prayer_list` |
| Meditations | `src/services/meditation-storage.ts` | `getMeditationHistory()` | `wr_meditation_history` |

**Key types (all epoch ms timestamps unless noted):**

- `Highlight` — `{ id, book, chapter, startVerse, endVerse, color: HighlightColor, createdAt, updatedAt }` (`src/types/bible.ts:69-78`)
- `Bookmark` — `{ id, book, chapter, startVerse, endVerse, label?, createdAt }` — no `updatedAt` (`src/types/bible.ts:80-88`)
- `Note` — `{ id, book, chapter, startVerse, endVerse, body, createdAt, updatedAt }` (`src/types/bible.ts:90-99`)
- `JournalEntry` — `{ id, body, createdAt, updatedAt, verseContext? }` — verseContext: `{ book, chapter, startVerse, endVerse, reference }` (`src/types/bible.ts:101-113`)
- `PersonalPrayer` — `{ id, title, description, category, status, createdAt(ISO), updatedAt(ISO), ... verseContext?: PrayerVerseContext }` — ISO 8601 strings, not epoch ms (`src/types/personal-prayer.ts`)
- `MeditationSession` — `{ id, type, date(YYYY-MM-DD), durationMinutes, completedAt(ISO), verseContext?: MeditationVerseContext }` (`src/types/meditation.ts`)

**Activity feed hook** (`src/hooks/bible/useActivityFeed.ts`):
- Subscribes to highlights, bookmarks, notes — NOT journals
- Reload callback calls `loadAllActivity()` which reads ALL 6 stores
- `loadAllActivity()` in `src/lib/bible/activityLoader.ts` already filters journals and meditations by `verseContext`

**My Bible page** (`src/pages/MyBiblePage.tsx`):
- Footer trust signal at line 227-229: `<p className="py-8 text-center text-xs text-white/40">Stored on this device. Export anytime in Settings.</p>` — "Settings" is plain text, not interactive
- Wrapped in `BibleDrawerProvider`
- Uses `useActivityFeed` hook

**Modal/drawer pattern:**
- AudioDrawer: `rgba(15, 10, 30, 0.95)` bg + `backdrop-blur(16px)`, focus trap, close via X/backdrop/Escape
- `FrostedCard`: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`

**Toast system:** `useToast()` → `showToast(message, type)` from `src/components/ui/Toast.tsx`

**Test patterns:** Pure function tests with factory functions. Component tests with `MemoryRouter` + `ToastProvider`. No `AuthModalProvider` needed (My Bible is public).

### Post-Import Refresh Strategy

When the import applier writes to stores:
1. **Reactive stores** (highlights, bookmarks, notes) → `notifyListeners()` → `useActivityFeed` reload callback calls `loadAllActivity()` → picks up ALL 6 stores including journals/prayers/meditations
2. **Known bug (BB-14 follow-up):** `useActivityFeed` does NOT subscribe to the journal store's `subscribe()`. This is a pre-existing BB-14 omission — BB-16 does not fix it. In practice, any import that includes highlights, bookmarks, or notes will trigger a full reload that also picks up journal changes.
3. **Edge case — import with ONLY journals/prayers/meditations (zero highlights/bookmarks/notes):** No subscribed store fires → feed doesn't auto-refresh. Solution: `onImportComplete` callback in `MyBiblePage` calls `window.location.reload()` as the spec-approved fallback. This is a one-time action after a deliberate user import, so a page reload is acceptable UX.
4. **BB-16 does NOT modify `useActivityFeed.ts`.** All refresh behavior is handled via reactive store subscriptions (common case) or `window.location.reload()` (edge case).

---

## Auth Gating Checklist

**All export/import functionality is public — no auth gates.** All data lives in localStorage, accessible to all users regardless of login state.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap "Settings" in footer | Public | Step 7 | None |
| Download export | Public | Step 6 | None |
| Select import file | Public | Step 6 | None |
| Preview import | Public | Step 6 | None |
| Replace local data | Public | Step 6 | None |
| Merge with local data | Public | Step 6 | None |
| Cancel import | Public | Step 6 | None |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Modal backdrop | background | `rgba(0, 0, 0, 0.5)` | codebase AudioDrawer pattern |
| Modal panel | background | `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` | design-system.md (dashboard-dark `#0f0a1e`) |
| Modal panel | border | `border border-white/[0.12] rounded-2xl` | FrostedCard pattern |
| Modal panel | max-width | `max-w-lg` (512px) | spec responsive section |
| Section headings | font | Inter semi-bold (`font-semibold`), `text-white` | spec design notes |
| Description text | color | `text-white/60` | spec design notes |
| Export button | classes | White pill CTA Pattern 1: `inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#08051A] transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]` | 09-design-system.md § White Pill CTA Patterns |
| Replace button | classes | `rounded-full border border-danger/40 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger transition-all hover:bg-danger/20` | danger styling per spec |
| Merge button | classes | `rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/80` | primary CTA |
| Cancel button | classes | `rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/60 transition-all hover:bg-white/5` | ghost/outline |
| Warning text | color | `text-danger` (`#E74C3C`) | spec + design-system.md |
| Import preview | component | `FrostedCard` | spec |
| File picker button | styling | Frosted glass: `rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.09]` | Bible section button language |
| Footer link | styling | `text-white/60 underline underline-offset-2 hover:text-white/80 cursor-pointer` | interactive version of existing `text-white/40` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- All Daily Hub tab content components use `max-w-2xl` container width. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- White pill CTA patterns: Pattern 1 (inline, smaller, used inside cards) and Pattern 2 (homepage primary, larger with white drop shadow). See `09-design-system.md` § "White Pill CTA Patterns" for the canonical class strings.
- Zero raw hex values in components — all colors via Tailwind design tokens.
- `text-white/60` for secondary/description text on dark backgrounds. `text-white` for primary text.
- Modal pattern: dark frosted glass `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`, matching AudioDrawer.
- `text-danger` for warning/destructive text (`#E74C3C`).
- Reduced motion: no entry/exit animations when `prefers-reduced-motion` is set.
- All tap targets minimum 44px.

**No deviations found in recent execution logs** (BB-15, BB-14, BB-11b all completed cleanly).

---

## Shared Data Models (from Master Plan)

N/A — BB-16 is standalone. It reads existing types from `src/types/bible.ts`, `src/types/personal-prayer.ts`, and `src/types/meditation.ts`.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_highlights` | Read (export) / Write (import) | Highlight records |
| `bible:bookmarks` | Read / Write | Bookmark records |
| `bible:notes` | Read / Write | Note records |
| `bible:journalEntries` | Read / Write | Journal entries (filter by verseContext for export) |
| `wr_prayer_list` | Read / Write | Personal prayers (filter by verseContext for export) |
| `wr_meditation_history` | Read / Write | Meditation sessions (filter by verseContext for export) |

**No new localStorage keys created.** Modal state is React state only.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Modal renders as full-screen bottom sheet. Export/Import sections stack vertically. File picker full width. Import preview action buttons stack vertically. |
| Tablet | 640-1024px | Modal renders centered at `max-w-lg`. Sections stack vertically. Action buttons horizontal row. |
| Desktop | > 1024px | Same as tablet with more whitespace. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. All buttons stack vertically on mobile, horizontal on tablet+.

---

## Vertical Rhythm

N/A — this is a modal overlay, not a page layout. Internal spacing uses `space-y-6` between sections, `space-y-4` within sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-14 (My Bible page) is built and merged
- [x] BB-15 (Search) is built and merged
- [x] All 6 stores/services exist with the expected read functions
- [x] No auth gates needed — all public
- [x] Design system values are verified from recon + codebase inspection
- [x] No [UNVERIFIED] values — all patterns are existing and documented
- [x] No deprecated patterns used
- [ ] `MeditationSession` has `id` field (verified: `src/types/meditation.ts:12` — yes, has `id: string`)
- [ ] `PersonalPrayer` timestamps are ISO strings, not epoch ms (verified: `src/types/personal-prayer.ts:10-11` — `createdAt: string`, `updatedAt: string`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timestamp format mismatch between stores | Export preserves native format: epoch ms for Bible stores, ISO strings for prayers/meditations | Spec says "faithful snapshot of localStorage in each store's native shape. No transformation." |
| Merge conflict for records without `updatedAt` | Incoming wins | Bookmarks have no `updatedAt`. Meditations have `completedAt` but no `updatedAt`. Spec says "incoming wins on conflict" for these. |
| Merge conflict for prayers (ISO string timestamps) | Compare ISO string timestamps directly | ISO 8601 strings are lexicographically orderable |
| Journal subscription missing in `useActivityFeed` | Wire it in Step 4 | Bug fix / improvement — journals already have `subscribe()` but it wasn't wired |
| Post-import refresh for journals/prayers/meditations-only imports | `onImportComplete` calls `window.location.reload()` | Spec-approved fallback. Avoids modifying `useActivityFeed` (which has a pre-existing BB-14 bug of missing journal subscription — separate follow-up). Common case (import includes highlights/bookmarks/notes) refreshes automatically via reactive subscribers. |
| iOS Safari file download fallback | Detect via `navigator.userAgent` + feature test for Blob URL download | Open JSON in new tab with "Tap and hold to save" instruction |
| Export filename date | Use `exportedAt` timestamp (from when export is built), not a pre-computed date | Spec: "filename should use the 12:01 AM date" if user clicks after midnight |
| `replaceAll` on empty import array | Still wipes local data | Replace means "make local match import exactly" — even if import has zero highlights, user wants to clear their local highlights |
| Unknown fields on records | Preserved silently — validator checks required fields only, spread operator preserves extras | Spec: "Unknown fields on records are preserved silently (round-trip clean)" |
| Merge result counts | Return `{ added, updated, skipped }` per store type, sum for toast | Spec: toast shows total count |

---

## Implementation Steps

### Step 1: Export/Import Types and Constants

**Objective:** Define the `BibleExportV1` type envelope and schema version constant.

**Files to create/modify:**
- `frontend/src/types/bible-export.ts` — new file

**Details:**

```typescript
import type { Highlight, Bookmark, Note, JournalEntry } from './bible'
import type { PersonalPrayer } from './personal-prayer'
import type { MeditationSession } from './meditation'

export const CURRENT_SCHEMA_VERSION = 1
export const APP_VERSION = 'worship-room-bible-wave-1'

export interface BibleExportV1 {
  schemaVersion: 1
  exportedAt: string // ISO 8601
  appVersion: string
  data: {
    highlights: Highlight[]
    bookmarks: Bookmark[]
    notes: Note[]
    prayers: PersonalPrayer[]
    journals: JournalEntry[]
    meditations: MeditationSession[]
  }
}

export interface MergeResult {
  added: number
  updated: number
  skipped: number
}

export interface ImportResult {
  mode: 'replace' | 'merge'
  totalItems: number
  highlights: MergeResult
  bookmarks: MergeResult
  notes: MergeResult
  prayers: MergeResult
  journals: MergeResult
  meditations: MergeResult
}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add any fields beyond what the spec defines
- DO NOT use `any` types
- DO NOT add optional fields to the envelope — all four top-level fields are required

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Type compilation | unit | TypeScript compiler validates the interface (no runtime tests needed — types only) |

**Expected state after completion:**
- [x] `BibleExportV1` type is importable from `@/types/bible-export`
- [x] `CURRENT_SCHEMA_VERSION` and `APP_VERSION` constants are exported
- [x] `MergeResult` and `ImportResult` types are defined for use by downstream steps

---

### Step 2: Export Builder (TDD)

**Objective:** Pure function that collects data from all 6 stores and builds the export envelope. Tests first.

**Files to create/modify:**
- `frontend/src/lib/bible/exportBuilder.ts` — new file
- `frontend/src/lib/bible/__tests__/exportBuilder.test.ts` — new file (write first)

**Details:**

The export builder:

```typescript
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { getAllJournalEntries } from '@/lib/bible/journalStore'
import { getPrayers } from '@/services/prayer-list-storage'
import { getMeditationHistory } from '@/services/meditation-storage'
import { CURRENT_SCHEMA_VERSION, APP_VERSION } from '@/types/bible-export'
import type { BibleExportV1 } from '@/types/bible-export'

export function buildExport(): BibleExportV1 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      highlights: getAllHighlights(),
      bookmarks: getAllBookmarks(),
      notes: getAllNotes(),
      prayers: getPrayers().filter((p) => p.verseContext != null),
      journals: getAllJournalEntries().filter((j) => j.verseContext != null),
      meditations: getMeditationHistory().filter((m) => m.verseContext != null),
    },
  }
}
```

Tests mock all 6 store read functions via `vi.mock`. Test cases:

1. Empty stores → all data arrays are `[]`, envelope has correct schema/version/timestamp
2. Populated stores → all records present
3. Prayers without `verseContext` are excluded
4. Journals without `verseContext` are excluded
5. Meditations without `verseContext` are excluded
6. Mixed: some prayers with and without `verseContext` → only verse-linked included
7. `exportedAt` is a valid ISO 8601 timestamp
8. `schemaVersion` is 1
9. `appVersion` is `'worship-room-bible-wave-1'`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT transform record shapes — store data is exported as-is
- DO NOT add any filtering beyond `verseContext` for prayers/journals/meditations
- DO NOT catch errors from store reads — let them propagate

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| empty stores produce valid envelope | unit | All 6 data arrays empty, envelope fields correct |
| populated stores produce correct data | unit | All records present in output |
| prayers without verseContext excluded | unit | Filter logic verification |
| journals without verseContext excluded | unit | Filter logic verification |
| meditations without verseContext excluded | unit | Filter logic verification |
| mixed verseContext filtering | unit | Some with, some without |
| exportedAt is valid ISO 8601 | unit | Parse and verify |
| schemaVersion is 1 | unit | Literal check |
| appVersion matches constant | unit | Literal check |

**Expected state after completion:**
- [x] `buildExport()` is importable and returns a valid `BibleExportV1`
- [x] 9 tests pass
- [x] All tests written before implementation (TDD)

---

### Step 3: Import Validator (TDD)

**Objective:** Pure function returning a tagged union — validates the export file structure. Tests first. This is the most important file per the spec.

**Files to create/modify:**
- `frontend/src/lib/bible/importValidator.ts` — new file
- `frontend/src/lib/bible/__tests__/importValidator.test.ts` — new file (write first)

**Details:**

```typescript
import type { BibleExportV1 } from '@/types/bible-export'
import { CURRENT_SCHEMA_VERSION } from '@/types/bible-export'

export type ValidationResult =
  | { valid: true; export: BibleExportV1 }
  | { valid: false; error: string }

export function validateExport(parsed: unknown): ValidationResult
```

Validation checks (in order):
1. `parsed` is a non-null object
2. Has `schemaVersion` (integer), `exportedAt` (string), `appVersion` (string), `data` (object)
3. `schemaVersion` equals `CURRENT_SCHEMA_VERSION` (1). If higher: "newer version" error. If missing/non-integer/zero/negative: "missing required data" error.
4. `data` has all 6 keys: `highlights`, `bookmarks`, `notes`, `prayers`, `journals`, `meditations` — each is an array
5. Per-record validation: each record in each array has minimum required fields with correct types:
   - Highlights: `id(string)`, `book(string)`, `chapter(integer)`, `startVerse(integer)`, `endVerse(integer)`, `color(string)`, `createdAt(number)`, `updatedAt(number)`
   - Bookmarks: `id(string)`, `book(string)`, `chapter(integer)`, `startVerse(integer)`, `endVerse(integer)`, `createdAt(number)`
   - Notes: `id(string)`, `book(string)`, `chapter(integer)`, `startVerse(integer)`, `endVerse(integer)`, `body(string)`, `createdAt(number)`, `updatedAt(number)`
   - Journals: `id(string)`, `body(string)`, `createdAt(number)`, `updatedAt(number)`
   - Prayers: `id(string)`, `title(string)`, `description(string)`, `createdAt(string)`, `updatedAt(string)`
   - Meditations: `id(string)`, `type(string)`, `date(string)`, `durationMinutes(number)`, `completedAt(string)`
6. Strict on types: `chapter` must be integer (use `Number.isInteger`), not float

**Permissive on extra fields:** Unknown fields on records are preserved. The validator only checks required fields exist with correct types.

**Error messages (exact strings from spec):**
- Invalid shape: `"This file isn't a valid Worship Room export. It might be corrupted or from a different app."`
- Wrong schema version (newer): `"This export was made with a newer version of Worship Room. Update the app to import it."`
- Missing/malformed data: `"This export is missing required data. It might be corrupted."`

Test cases (write first):

1. Valid v1 export → `{ valid: true, export: ... }`
2. `null` input → invalid
3. Non-object input (string, number, array) → invalid
4. Missing `schemaVersion` → invalid ("missing required data")
5. `schemaVersion: 2` (newer) → "newer version" error
6. `schemaVersion: 0` → "missing required data"
7. `schemaVersion: 1.5` (non-integer) → "missing required data"
8. Missing `data` field → "missing required data"
9. `data` not an object → "missing required data"
10. Missing one of the 6 data keys → "missing required data"
11. Data key is not an array → "missing required data"
12. Highlight record missing `id` → "missing required data"
13. Highlight record with `chapter` as float → "missing required data"
14. Bookmark record missing `book` → "missing required data"
15. Note record missing `body` → "missing required data"
16. Journal record missing `updatedAt` → "missing required data"
17. Prayer record with non-string `createdAt` → "missing required data"
18. Meditation record missing `durationMinutes` → "missing required data"
19. Empty arrays in all data keys → valid
20. Extra unknown fields on records are preserved in output
21. Extra unknown fields on top-level object → valid (permissive)
22. Valid records mixed with extra fields → all preserved

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT throw exceptions — return tagged union only
- DO NOT strip unknown fields — preserve them for round-trip integrity
- DO NOT validate `exportedAt` format strictly — just check it's a string
- DO NOT validate `appVersion` content — just check it's a string

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| valid v1 export | unit | Returns `{ valid: true }` with the export object |
| null/non-object/array inputs | unit | Returns invalid with "not a valid" message |
| missing schemaVersion | unit | Returns invalid with "missing required data" |
| newer schemaVersion | unit | Returns "newer version" error |
| non-integer schemaVersion | unit | Returns "missing required data" |
| missing data field | unit | Returns "missing required data" |
| missing data keys | unit | Each of 6 keys tested |
| per-record field validation | unit | Each type tested with missing/wrong-type fields |
| empty arrays valid | unit | All data keys as `[]` → valid |
| extra fields preserved | unit | Unknown fields survive validation |

**Expected state after completion:**
- [x] `validateExport()` handles every malformed input from the spec
- [x] 22+ tests pass
- [x] All tests written before implementation (TDD)
- [x] No `throw` in the validator — only tagged union returns

---

### Step 4: Store Mutation Methods (replaceAll + mergeIn)

**Objective:** Add `replaceAll` and `mergeIn` methods to all 6 stores/services. `useActivityFeed` is NOT modified (missing journal subscription is a pre-existing BB-14 bug — separate follow-up).

**Files to modify:**
- `frontend/src/lib/bible/highlightStore.ts` — add `replaceAllHighlights()`, `mergeInHighlights()`
- `frontend/src/lib/bible/bookmarkStore.ts` — add `replaceAllBookmarks()`, `mergeInBookmarks()`
- `frontend/src/lib/bible/notes/store.ts` — add `replaceAllNotes()`, `mergeInNotes()`
- `frontend/src/lib/bible/journalStore.ts` — add `replaceAllJournals()`, `mergeInJournals()`
- `frontend/src/services/prayer-list-storage.ts` — add `replaceAllPrayers()`, `mergeInPrayers()`
- `frontend/src/services/meditation-storage.ts` — add `replaceAllMeditations()`, `mergeInMeditations()`

**Files to create:**
- `frontend/src/lib/bible/__tests__/storeMutations.test.ts` — new file (tests for all 6 stores' new methods)

**Details:**

**Reactive stores (highlights, bookmarks, notes, journals)** — follow existing internal patterns:

```typescript
// Pattern for each reactive store:
export function replaceAll*(records: Type[]): void {
  cache = [...records]
  writeToStorage(cache)
  notifyListeners()
}

export function mergeIn*(incoming: Type[]): MergeResult {
  const local = getCache()
  const localMap = new Map(local.map((r) => [r.id, r]))
  const result: MergeResult = { added: 0, updated: 0, skipped: 0 }

  for (const record of incoming) {
    const existing = localMap.get(record.id)
    if (!existing) {
      localMap.set(record.id, record)
      result.added++
    } else if (hasUpdatedAt) {
      // Compare updatedAt: incoming newer → replace
      if (record.updatedAt > existing.updatedAt) {
        localMap.set(record.id, record)
        result.updated++
      } else {
        result.skipped++
      }
    } else {
      // No updatedAt (bookmarks): incoming wins
      localMap.set(record.id, record)
      result.updated++
    }
  }

  cache = Array.from(localMap.values())
  writeToStorage(cache)
  notifyListeners()
  return result
}
```

**Merge rules per type:**
- **Highlights** — has `updatedAt` (epoch ms) → compare, newer wins
- **Bookmarks** — no `updatedAt` → incoming wins on conflict
- **Notes** — has `updatedAt` (epoch ms) → compare, newer wins
- **Journals** — has `updatedAt` (epoch ms) → compare, newer wins
- **Prayers** — has `updatedAt` (ISO string) → compare lexicographically, newer wins
- **Meditations** — has `completedAt` (ISO string) but no `updatedAt` → incoming wins on conflict

**CRUD services (prayers, meditations)** — no cache or listeners, write directly:

```typescript
// Pattern for CRUD services:
export function replaceAll*(records: Type[]): void {
  writePrayers(records)  // or equivalent
}

export function mergeIn*(incoming: Type[]): MergeResult {
  const local = readPrayers()  // or equivalent
  const localMap = new Map(local.map((r) => [r.id, r]))
  // ... same merge logic ...
  writePrayers(Array.from(localMap.values()))
  return result
}
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT refactor prayer/meditation services to use reactive store pattern (spec explicitly prohibits this)
- DO NOT modify existing read/write methods — add new methods alongside them
- DO NOT add subscriber mechanisms to prayer/meditation services
- DO NOT modify the existing `restoreBookmarks()` or `restoreNote()` — they have different semantics (add-only vs merge)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| replaceAllHighlights writes and notifies | unit | Verify localStorage written, listeners called |
| replaceAllHighlights with empty array clears store | unit | Local data wiped |
| mergeInHighlights adds new records | unit | Record with new id → added |
| mergeInHighlights updates newer records | unit | Same id, newer updatedAt → replaced |
| mergeInHighlights skips older records | unit | Same id, older updatedAt → skipped |
| mergeInHighlights returns correct counts | unit | added/updated/skipped counts match |
| replaceAllBookmarks writes and notifies | unit | Same pattern |
| mergeInBookmarks incoming wins on conflict | unit | No updatedAt → incoming replaces |
| replaceAllNotes writes and notifies | unit | Same pattern |
| mergeInNotes respects updatedAt | unit | Newer wins |
| replaceAllJournals writes and notifies | unit | Same pattern |
| mergeInJournals respects updatedAt | unit | Newer wins |
| replaceAllPrayers writes | unit | No listeners (CRUD service) |
| mergeInPrayers compares ISO timestamps | unit | Lexicographic comparison |
| replaceAllMeditations writes | unit | No listeners (CRUD service) |
| mergeInMeditations incoming wins on conflict | unit | No updatedAt → incoming wins |

**Expected state after completion:**
- [x] All 6 stores have `replaceAll*()` and `mergeIn*()` methods
- [x] Reactive stores call `notifyListeners()` after mutation
- [x] CRUD services write directly without cache/listeners
- [x] `useActivityFeed` is NOT modified (BB-14 follow-up for journal subscription)
- [x] 16 tests pass

---

### Step 5: Import Applier (TDD)

**Objective:** Orchestration function that calls store mutations for Replace and Merge modes. Returns `ImportResult` with per-store counts. Tests first.

**Files to create/modify:**
- `frontend/src/lib/bible/importApplier.ts` — new file
- `frontend/src/lib/bible/__tests__/importApplier.test.ts` — new file (write first)

**Details:**

```typescript
import type { BibleExportV1, ImportResult, MergeResult } from '@/types/bible-export'
import { replaceAllHighlights, mergeInHighlights } from '@/lib/bible/highlightStore'
import { replaceAllBookmarks, mergeInBookmarks } from '@/lib/bible/bookmarkStore'
import { replaceAllNotes, mergeInNotes } from '@/lib/bible/notes/store'
import { replaceAllJournals, mergeInJournals } from '@/lib/bible/journalStore'
import { replaceAllPrayers, mergeInPrayers } from '@/services/prayer-list-storage'
import { replaceAllMeditations, mergeInMeditations } from '@/services/meditation-storage'

export function applyReplace(data: BibleExportV1['data']): ImportResult {
  replaceAllHighlights(data.highlights)
  replaceAllBookmarks(data.bookmarks)
  replaceAllNotes(data.notes)
  replaceAllJournals(data.journals)
  replaceAllPrayers(data.prayers)
  replaceAllMeditations(data.meditations)

  const total = data.highlights.length + data.bookmarks.length + data.notes.length
    + data.prayers.length + data.journals.length + data.meditations.length

  return {
    mode: 'replace',
    totalItems: total,
    highlights: { added: data.highlights.length, updated: 0, skipped: 0 },
    bookmarks: { added: data.bookmarks.length, updated: 0, skipped: 0 },
    notes: { added: data.notes.length, updated: 0, skipped: 0 },
    prayers: { added: data.prayers.length, updated: 0, skipped: 0 },
    journals: { added: data.journals.length, updated: 0, skipped: 0 },
    meditations: { added: data.meditations.length, updated: 0, skipped: 0 },
  }
}

export function applyMerge(data: BibleExportV1['data']): ImportResult {
  const highlights = mergeInHighlights(data.highlights)
  const bookmarks = mergeInBookmarks(data.bookmarks)
  const notes = mergeInNotes(data.notes)
  const journals = mergeInJournals(data.journals)
  const prayers = mergeInPrayers(data.prayers)
  const meditations = mergeInMeditations(data.meditations)

  const total = highlights.added + highlights.updated
    + bookmarks.added + bookmarks.updated
    + notes.added + notes.updated
    + prayers.added + prayers.updated
    + journals.added + journals.updated
    + meditations.added + meditations.updated

  return { mode: 'merge', totalItems: total, highlights, bookmarks, notes, prayers, journals, meditations }
}
```

Tests mock all 12 store mutation functions via `vi.mock`.

Test cases:

1. `applyReplace` calls all 6 `replaceAll*` functions with correct data
2. `applyReplace` returns correct total count
3. `applyReplace` with empty arrays → total 0, all stores called with `[]`
4. `applyMerge` calls all 6 `mergeIn*` functions with correct data
5. `applyMerge` sums counts correctly (total = added + updated across all stores)
6. `applyMerge` returns per-store MergeResult objects
7. `applyReplace` returns mode `'replace'`
8. `applyMerge` returns mode `'merge'`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT catch errors from store mutations — let them propagate to the UI layer
- DO NOT add side effects (toasts, navigation) — this is pure orchestration
- DO NOT modify the import data — pass through as-is

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| applyReplace calls all 6 replaceAll | unit | Verify each mock called with correct data |
| applyReplace returns correct totals | unit | Sum of all array lengths |
| applyReplace with empty data | unit | All stores called with [], total 0 |
| applyMerge calls all 6 mergeIn | unit | Verify each mock called |
| applyMerge sums counts correctly | unit | total = sum of added + updated |
| applyMerge returns per-store results | unit | Each store's MergeResult in output |
| applyReplace mode is 'replace' | unit | Literal check |
| applyMerge mode is 'merge' | unit | Literal check |

**Expected state after completion:**
- [x] `applyReplace()` and `applyMerge()` are importable
- [x] Both return `ImportResult` with accurate per-store counts
- [x] 8 tests pass

---

### Step 6: Settings Modal UI

**Objective:** Build the `BibleSettingsModal` component with Export section, Import section, file validation, import preview, and action buttons.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/BibleSettingsModal.tsx` — new file
- `frontend/src/components/bible/my-bible/__tests__/BibleSettingsModal.test.ts` — new file

**Details:**

**Component interface:**

```typescript
interface BibleSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void  // called after successful import — parent decides refresh strategy
}
```

**Modal structure:**

```
<div> {/* Backdrop: fixed inset-0 z-50 bg-black/50 */}
  <div> {/* Panel: centered or bottom-sheet on mobile */}
    <div> {/* Header: "Settings" heading + X close button */}
    <div> {/* Scrollable content */}
      {/* Export section */}
      <section>
        <h3>Export your data</h3>
        <p>Download a JSON file with all your highlights, notes, bookmarks, and saved entries. You can restore it on any device — no account needed.</p>
        <button>Download export</button>
      </section>

      <hr /> {/* divider: border-white/[0.08] */}

      {/* Import section */}
      <section>
        <h3>Import data</h3>
        <p>Upload a JSON file you've exported from Worship Room. You can replace your current data or merge it with what's here.</p>
        <FilePickerButton />
      </section>

      {/* Import preview (conditional) */}
      {importState === 'preview' && <ImportPreview />}

      {/* Error state (conditional) */}
      {importState === 'error' && <ImportError />}
    </div>
  </div>
</div>
```

**State machine for import flow:**

```
idle → file-selected → validating → preview | error
preview → replacing | merging → success
error → idle (via Cancel)
```

Use `useState` with a discriminated union:

```typescript
type ImportState =
  | { step: 'idle' }
  | { step: 'preview'; export: BibleExportV1; conflictCounts?: ConflictCounts }
  | { step: 'error'; message: string }
  | { step: 'importing' }
```

**Export download logic:**

```typescript
function handleExport() {
  const exportData = buildExport()
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  // Date from exportedAt for filename
  const date = exportData.exportedAt.slice(0, 10) // YYYY-MM-DD
  const filename = `worship-room-bible-export-${date}.json`

  // iOS Safari fallback
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS && !('showSaveFilePicker' in window)) {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    showToast('Tap and hold the page to save the file', 'success')
    return
  }

  // Standard download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Export downloaded', 'success')
}
```

**File picker:** Hidden `<input type="file" accept="application/json">` with a styled button overlay. The button has `aria-label="Choose a JSON file to import"`. On change, read file via `FileReader`, parse JSON, validate, set state.

**Import preview (inside `FrostedCard`):**

- Source info: `exportedAt` formatted as relative time + absolute date. Use a simple `formatRelativeDate` helper (e.g., "3 days ago · April 6, 2026 at 2:14 PM").
- App version: `text-white/40`
- Counts grid: 2-column grid, each cell shows count + label (e.g., "12 highlights")
- Conflict preview (merge mode hover): count of imported records sharing an `id` with local records. Computed lazily on first render.
- Action buttons: Replace (danger), Merge (primary), Cancel (ghost)
- Warning text: `<p role="alert" id="replace-warning" className="text-danger text-xs">Replace will delete your current highlights, notes, and saved entries. This cannot be undone.</p>` — visible only when Replace button is focused/hovered. Use `onFocus`/`onBlur`/`onMouseEnter`/`onMouseLeave` state.
- Replace button has `aria-describedby="replace-warning"`

**Responsive:**
- Mobile (< 640px): Modal as full-screen bottom sheet — `fixed inset-0` with `pt-12` for status bar. Action buttons stack vertically with `flex-col` and `gap-3`.
- Tablet/Desktop (≥ 640px): Centered modal — `fixed inset-0 flex items-center justify-center`. Panel at `max-w-lg w-full mx-4`. Action buttons horizontal with `flex-row gap-3`.

**Close handlers:** Backdrop click, Escape key (via `useEffect` keydown listener), X button, Cancel button. All call `onClose()`. Close also resets import state to `idle`.

**Reduced motion:** No entry/exit animation when `prefers-reduced-motion` is set. Check via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` or just omit animation and use instant show/hide.

**Post-import flow:**

```typescript
function handleReplace(data: BibleExportV1['data']) {
  setImportState({ step: 'importing' })
  const result = applyReplace(data)
  showToast(`Imported ${result.totalItems} items`, 'success')
  setImportState({ step: 'idle' })
  onImportComplete()
}

function handleMerge(data: BibleExportV1['data']) {
  setImportState({ step: 'importing' })
  const result = applyMerge(data)
  showToast(`Imported ${result.totalItems} items`, 'success')
  setImportState({ step: 'idle' })
  onImportComplete()
}
```

**Refresh path after import:** The modal calls `onImportComplete()`. The parent (`MyBiblePage`) handles the refresh strategy — see Step 7. The modal itself does NOT call `window.location.reload()` or manipulate the activity feed.

Test cases:

1. Renders export section with heading and download button
2. Renders import section with heading and file picker
3. Download button calls `buildExport` and triggers download
4. File picker accepts only `.json` files
5. Valid file shows import preview with counts
6. Invalid file shows error message
7. Newer schema version shows version-mismatch error
8. Cancel button in error state returns to idle
9. Replace button calls `applyReplace` and shows toast
10. Merge button calls `applyMerge` and shows toast
11. Cancel button in preview state returns to idle
12. Replace warning text visible on focus/hover, hidden otherwise
13. Replace button has `aria-describedby` pointing to warning
14. Modal closes on backdrop click
15. Modal closes on Escape key
16. `onImportComplete` called after successful import
17. File picker has `aria-label`

**Auth gating:** None

**Responsive behavior:**
- Desktop (1440px): Centered modal at `max-w-lg`, action buttons horizontal row
- Tablet (768px): Same as desktop
- Mobile (375px): Full-screen bottom sheet, action buttons stacked vertically

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT add drag-and-drop (out of scope per spec)
- DO NOT add partial export/import (out of scope)
- DO NOT add encryption (out of scope)
- DO NOT use raw hex values — all colors via Tailwind tokens
- DO NOT use deprecated patterns (animate-glow-pulse, Caveat font, soft-shadow cards)
- DO NOT use `FrostedCard` for the modal panel itself (it's a frosted glass modal, not a card) — use `FrostedCard` for the import preview content area inside the modal
- DO NOT forget `role="alert"` on the Replace warning text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders export section | integration | Heading, description, download button present |
| renders import section | integration | Heading, description, file picker present |
| download triggers export | integration | Mock `buildExport`, verify blob creation |
| valid file shows preview | integration | Upload valid JSON, verify counts display |
| invalid file shows error | integration | Upload garbage, verify error message |
| newer schema shows version error | integration | `schemaVersion: 2`, verify error |
| replace calls applyReplace | integration | Click Replace, verify mock called |
| merge calls applyMerge | integration | Click Merge, verify mock called |
| cancel returns to idle | integration | Click Cancel, verify state reset |
| warning visible on replace focus | integration | Focus Replace button, verify warning text |
| aria-describedby on replace | integration | Replace button references warning ID |
| escape closes modal | integration | Fire Escape key, verify onClose called |
| backdrop click closes | integration | Click backdrop, verify onClose called |
| onImportComplete called after import | integration | After Replace/Merge, verify callback |
| file picker accepts json only | integration | Verify `accept` attribute |
| file picker has aria-label | integration | Verify accessible name |
| counts display correct numbers | integration | Verify each type count in preview |

**Expected state after completion:**
- [x] `BibleSettingsModal` renders export and import sections
- [x] Full import flow works: file select → validate → preview → replace/merge → toast
- [x] Error states handled for all validation failures
- [x] Accessibility: `aria-label`, `aria-describedby`, `role="alert"`, keyboard close
- [x] 17 tests pass

---

### Step 7: Wire Into MyBiblePage + Footer Link

**Objective:** Make the footer trust signal interactive, add Settings modal state to `MyBiblePage`, wire `onImportComplete` to `window.location.reload()`.

**Files to modify:**
- `frontend/src/pages/MyBiblePage.tsx` — footer link + modal mount + reload wiring

**Details:**

**Footer trust signal change (line 227-229):**

```tsx
// Before:
<p className="py-8 text-center text-xs text-white/40">
  Stored on this device. Export anytime in Settings.
</p>

// After:
<p className="py-8 text-center text-xs text-white/40">
  Stored on this device. Export anytime in{' '}
  <button
    type="button"
    className="text-white/60 underline underline-offset-2 hover:text-white/80"
    onClick={() => setSettingsOpen(true)}
  >
    Settings
  </button>
  .
</p>
```

**Modal state and wiring in `MyBiblePageInner`:**

```typescript
const [settingsOpen, setSettingsOpen] = useState(false)

// onImportComplete triggers a full page reload to ensure all stores
// (including non-reactive prayers/meditations and unsubscribed journals)
// are re-read by the activity feed. This is a one-time action after a
// deliberate user import, so the reload is acceptable UX.
// Note: useActivityFeed subscribes to highlights/bookmarks/notes but
// NOT journals (pre-existing BB-14 bug — separate follow-up).
const handleImportComplete = useCallback(() => {
  window.location.reload()
}, [])

// In JSX, before closing </Layout>:
<BibleSettingsModal
  isOpen={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  onImportComplete={handleImportComplete}
/>
```

**Lazy import for modal** (keep the page's initial bundle small):

```typescript
const BibleSettingsModal = lazy(() =>
  import('@/components/bible/my-bible/BibleSettingsModal').then((m) => ({
    default: m.BibleSettingsModal,
  }))
)
```

Wrap the modal render in `<Suspense fallback={null}>`.

Test cases:

1. Footer "Settings" text is a button (not plain text)
2. Clicking "Settings" opens the modal
3. Modal receives `onClose` that resets state
4. Modal receives `onImportComplete` callback
5. Settings button has min 44px tap target (via padding)

**Auth gating:** None

**Responsive behavior:**
- Desktop (1440px): Footer text centered, "Settings" is inline link-button. Modal centered overlay.
- Tablet (768px): Same
- Mobile (375px): Same footer layout. Modal renders as bottom sheet (handled by Step 6's responsive logic).

**Guardrails (DO NOT):**
- DO NOT add the modal to `App.tsx` routes — it's a modal on an existing page, not a new route
- DO NOT remove the `BibleDrawerProvider` wrapping — it's needed for the drawer
- DO NOT change the footer text wording beyond making "Settings" interactive
- DO NOT import `BibleSettingsModal` eagerly — use lazy import

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| footer Settings is a button | integration | Query by role="button", verify text |
| clicking Settings opens modal | integration | Click button, verify modal renders |
| modal close resets state | integration | Open then close, verify modal gone |
| onImportComplete callback wired | integration | Verify callback prop passed to modal |
| Settings button meets 44px target | integration | Verify button height via computed style or class |

**Expected state after completion:**
- [x] Footer trust signal is interactive — "Settings" opens the modal
- [x] Import triggers `window.location.reload()` via `onImportComplete`
- [x] Modal is lazy-loaded
- [x] 5 tests pass
- [x] All acceptance criteria from the spec are met

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types and constants |
| 2 | 1 | Export builder (uses types) |
| 3 | 1 | Import validator (uses types) |
| 4 | 1 | Store mutation methods (uses MergeResult type) |
| 5 | 1, 4 | Import applier (calls store mutations) |
| 6 | 1, 2, 3, 5 | Settings modal UI (uses builder, validator, applier) |
| 7 | 6 | Wire into page (uses modal, page reload for refresh) |

Steps 2, 3, and 4 can be built in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types and Constants | [COMPLETE] | 2026-04-09 | Created `frontend/src/types/bible-export.ts` with BibleExportV1, MergeResult, ImportResult types and CURRENT_SCHEMA_VERSION/APP_VERSION constants. Clean compilation. |
| 2 | Export Builder (TDD) | [COMPLETE] | 2026-04-09 | Created `exportBuilder.ts` and `__tests__/exportBuilder.test.ts`. 9 tests pass. TDD — tests written first. |
| 3 | Import Validator (TDD) | [COMPLETE] | 2026-04-09 | Created `importValidator.ts` and `__tests__/importValidator.test.ts`. 24 tests pass. TDD — tests written first. No exceptions thrown — tagged union only. |
| 4 | Store Mutation Methods | [COMPLETE] | 2026-04-09 | Added replaceAll/mergeIn to all 6 stores. 16 new tests pass. 93 existing store tests pass (no regressions). |
| 5 | Import Applier (TDD) | [COMPLETE] | 2026-04-09 | Created `importApplier.ts` and `__tests__/importApplier.test.ts`. 8 tests pass. TDD — tests written first. |
| 6 | Settings Modal UI | [COMPLETE] | 2026-04-09 | Created `BibleSettingsModal.tsx` and `__tests__/BibleSettingsModal.test.tsx`. 18 tests pass. Full export/import flow, error states, accessibility (aria-label, aria-describedby, role="alert", keyboard close). Build compiles cleanly. Visual verification deferred to Step 7 (modal requires wiring). |
| 7 | Wire Into MyBiblePage | [COMPLETE] | 2026-04-09 | Modified `MyBiblePage.tsx`: footer "Settings" is now a button, lazy-loaded BibleSettingsModal, onImportComplete calls window.location.reload(). Visual verification passed at 1440px (centered modal) and 375px (bottom sheet). 168 BB-16 + related tests pass. Build clean. |
