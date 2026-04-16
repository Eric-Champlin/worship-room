# Implementation Plan: BB-11b Journal Persistence Completion

**Spec:** `_specs/bb-11b-journal-persistence.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — not needed; this spec has zero UI changes)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Store location:** `frontend/src/lib/bible/` — all BB stores (bookmarkStore, highlightStore, notes/store) live here
- **Types:** `frontend/src/types/bible.ts` — Bookmark, Highlight, Note types for BB stores
- **Constants:** `frontend/src/constants/bible.ts` — localStorage key constants (`BIBLE_BOOKMARKS_KEY = 'bible:bookmarks'`, `BIBLE_NOTES_STORAGE_KEY = 'bible:notes'`)
- **Activity loader:** `frontend/src/lib/bible/activityLoader.ts` — aggregates highlights, bookmarks, notes, meditations into `ActivityItem[]`
- **Activity types:** `frontend/src/types/my-bible.ts` — `ActivityItemType`, `ActivityItemData` discriminated union
- **Activity cards:** `frontend/src/components/bible/my-bible/` — per-type card components (HighlightCard, BookmarkCard, NoteCard, MeditationCard)
- **Journal tab:** `frontend/src/components/daily/JournalTabContent.tsx` — submit handler at line 188, in-memory `savedEntries` state at line 75
- **Journal types:** `frontend/src/types/daily-experience.ts` — `SavedJournalEntry` (UI type), `JournalVerseContext` (persistence-safe type)

### Store Pattern (canonical — from bookmarkStore.ts / notes/store.ts)

Every BB store follows this exact structure:
1. **Module-level state:** `let cache: T[] | null = null` + `const listeners = new Set<() => void>()`
2. **Custom error class:** `class XStorageFullError extends Error` with QuotaExceededError wrapping
3. **ID generation:** `crypto.randomUUID()` with `Date.now().toString(36) + Math.random()` fallback
4. **Validation:** `isValidX(record: unknown): record is X` type guard for defensive parsing
5. **Storage I/O:** `readFromStorage()` (SSR-safe via `typeof window === 'undefined'` check, try/catch JSON.parse, filter via validator) and `writeToStorage()` (SSR no-op, QuotaExceededError catch)
6. **Cache layer:** `getCache()` reads from storage on first access, returns module-level cache
7. **Notification:** `notifyListeners()` iterates `listeners` set after every mutation
8. **Read API:** `getAllX()` returns `[...getCache()]` (shallow copy); query methods filter the cache
9. **Write API:** mutate `cache` in-place, call `writeToStorage(cache)`, call `notifyListeners()`
10. **Subscribe:** `subscribe(listener)` adds to Set, returns unsubscribe function
11. **Testing helper:** `_resetCacheForTesting()` sets `cache = null`

### Test Pattern (canonical — from bookmarkStore.test.ts)

- Dynamic import via `async function loadStore() { return await import('../storeName') }` so `vi.resetModules()` gives a fresh module per test
- `beforeEach: localStorage.clear() + vi.resetModules()`
- Helper `makeX(overrides: Partial<X> = {}): X` factory function
- Direct localStorage manipulation for setup (`localStorage.setItem(KEY, JSON.stringify([...]))`)
- Cache coherence verified (re-import after mutation to confirm persistence)
- Subscription tested by adding a spy listener and verifying call count

### Current Journal Tab Submit Flow (JournalTabContent.tsx:188–232)

1. `handleEntrySave(entry)` creates a `SavedJournalEntry` with `id: 'entry-' + Date.now()`
2. Pushes to in-memory `savedEntries` state — **no persistence**
3. Calls `markJournalComplete()`, `recordActivity('journal')`, `showToast()`
4. Checks milestone count against `JOURNAL_MILESTONES` and fires celebration

### Type Relationship

- **Store type (`JournalEntry`):** `{ id, body, createdAt, updatedAt, verseContext? }` — minimal, persistence-focused
- **UI type (`SavedJournalEntry`):** `{ id, content, timestamp, mode, promptText?, reflection?, verseContext? }` — richer, session-focused
- **Mapping store→UI:** `content=body`, `timestamp=new Date(createdAt).toISOString()`, `mode='free'` (default for loaded entries)
- **On submit:** persist to store (minimal) AND push to in-memory UI state (rich)

### Activity Feed (BB-14) Integration

The `activityLoader.ts` currently aggregates 4 types: highlight, bookmark, note, meditation. The `'daily-hub'` filter matches only meditation. To satisfy the acceptance criterion "journal card appearing in the BB-14 activity feed under 'From Daily Hub'", this spec must:
1. Add `'journal'` to `ActivityItemType`
2. Add `JournalData` to `ActivityItemData` union
3. Wire `loadAllActivity()` to consume from `journalStore`
4. Update `filterActivity()` so `'daily-hub'` matches both meditation and journal
5. Create `JournalCard.tsx` and wire into `ActivityCard.tsx`

Only journal entries WITH a `verseContext` appear in the activity feed (matching the meditation pattern — entries without verse context have no Bible-reader context to display).

---

## Auth Gating Checklist

**No new auth gates.** The Journal tab's existing auth gating applies unchanged. This spec only modifies what happens during the save step for already-authenticated submissions.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Submit journal entry | Existing auth gate unchanged | Step 4 | Existing useAuth + authModal in JournalInput |

---

## Design System Values (for UI steps)

N/A — this spec has zero visual changes. The only new rendering is the `JournalCard.tsx` in the BB-14 activity feed, which follows the existing `NoteCard`/`MeditationCard` pattern exactly.

---

## Design System Reminder

N/A — no UI steps that touch Daily Hub visuals. The JournalCard follows existing activity card patterns.

---

## Shared Data Models

### New Store Type (to be added to `types/bible.ts`)

```typescript
export interface JournalEntry {
  id: string              // UUID
  body: string            // plain text
  createdAt: number       // epoch ms
  updatedAt: number       // epoch ms, equals createdAt unless edited
  verseContext?: {
    book: string          // slug
    chapter: number
    startVerse: number
    endVerse: number
    reference: string     // pre-formatted
  }
}
```

The `verseContext` field reuses `JournalVerseContext` from `types/daily-experience.ts` (identical shape to `PrayerVerseContext`).

### New Activity Feed Type (to be added to `types/my-bible.ts`)

```typescript
export interface JournalData {
  type: 'journal'
  body: string
  reference: string
}
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:journalEntries` | Both | New — journal entry store |
| `wr_journal_draft` | Read (existing) | Unchanged — draft auto-save |
| `wr_journal_milestones` | Read/Write (existing) | Unchanged — milestone celebrations |

---

## Responsive Structure

N/A — no UI changes beyond the JournalCard activity card, which inherits responsive behavior from `ActivityCard`.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — no page-level layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] No journal store currently exists (confirmed: only in-memory `useState` + `wr_journal_draft`)
- [x] Submit handler is a pure in-memory operation at `JournalTabContent.tsx:188-232`
- [x] `SavedEntriesList` exists and renders from in-memory state (wiring needed)
- [x] BB store pattern is consistent across bookmarkStore, notes/store, highlightStore
- [x] `JournalVerseContext` already exists in `types/daily-experience.ts`
- [x] BB-14 activity feed does NOT currently include journal entries (confirmed in `activityLoader.ts`)
- [x] All auth-gated actions from the spec are accounted for (none — existing gates unchanged)
- [x] No deprecated patterns used
- [x] Prior specs (BB-11, BB-14, BB-10b) are complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| localStorage key name | `bible:journalEntries` | Matches `bible:bookmarks` and `bible:notes` convention |
| Store type vs UI type | Separate types — `JournalEntry` (store) vs `SavedJournalEntry` (UI) | Store type is minimal (body + timestamps); UI type has session-only fields (mode, promptText, reflection). Spec defines store type explicitly. |
| Loading from store on mount | Load all entries, map to `SavedJournalEntry` with `mode: 'free'` default | Minimal mapping; loaded entries lose mode/promptText but gain persistence |
| Activity feed: entries without verseContext | Excluded from activity feed | Matches meditation pattern — only verse-linked activities appear in My Bible. Non-verse journal entries have no Bible reader context. |
| Max entries | No hard limit (unlike prayers at 200) | Journal entries are small (body + optional verseContext). Storage quota is the natural limit, handled by QuotaExceededError. |
| Milestone count on mount | Uses loaded entries count | Correctly accounts for historical entries. Already-celebrated milestones tracked separately in `wr_journal_milestones`. |

---

## Implementation Steps

### Step 1: Add JournalEntry type + localStorage key constant

**Objective:** Define the persistence type and storage key constant, following the exact patterns of Bookmark and Note.

**Files to create/modify:**
- `frontend/src/types/bible.ts` — Add `JournalEntry` interface
- `frontend/src/constants/bible.ts` — Add `BIBLE_JOURNAL_ENTRIES_KEY` constant

**Details:**

Add to `frontend/src/types/bible.ts` (after the `Note` interface, around line 99):

```typescript
export interface JournalEntry {
  id: string              // UUID
  body: string            // plain text
  createdAt: number       // epoch ms
  updatedAt: number       // epoch ms, equals createdAt unless edited
  verseContext?: {
    book: string          // slug
    chapter: number
    startVerse: number
    endVerse: number
    reference: string     // pre-formatted
  }
}
```

Add to `frontend/src/constants/bible.ts`:

```typescript
export const BIBLE_JOURNAL_ENTRIES_KEY = 'bible:journalEntries'
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any existing types
- DO NOT add fields beyond what the spec defines (no mode, promptText, reflection)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Type-only change; TypeScript compiler validates |

**Expected state after completion:**
- [x] `JournalEntry` type is exported from `types/bible.ts`
- [x] `BIBLE_JOURNAL_ENTRIES_KEY` is exported from `constants/bible.ts` with value `'bible:journalEntries'`
- [x] Build passes with no errors

---

### Step 2: Create journalStore.ts

**Objective:** Create the journal entry store module as a thin copy of `bookmarkStore.ts`, adapted for journal entries per the spec's API.

**Files to create/modify:**
- `frontend/src/lib/bible/journalStore.ts` — New file

**Details:**

Copy the structure from `bookmarkStore.ts` (lines 1-245). Adapt:

1. **Imports:** `BIBLE_JOURNAL_ENTRIES_KEY` from `@/constants/bible`, `JournalEntry` from `@/types/bible`
2. **Error class:** `JournalStorageFullError` extending `Error` with message `'Storage full — clear some journal entries to free space.'`
3. **Validation:** `isValidJournalEntry(record: unknown): record is JournalEntry` — check: id (string), body (string), createdAt (number), updatedAt (number). `verseContext` is optional; if present, validate book (string), chapter (number), startVerse (number), endVerse (number), reference (string).
4. **Read API:**
   - `getAllJournalEntries(): JournalEntry[]` — returns `[...getCache()]`
   - `getJournalEntriesForVerse(book: string, chapter: number, verse: number): JournalEntry[]` — filters entries where `verseContext` exists and verse falls within startVerse–endVerse range
   - `getJournalEntryById(id: string): JournalEntry | null` — find by id
5. **Write API:**
   - `createJournalEntry(body: string, verseContext?: JournalEntry['verseContext']): JournalEntry` — generates UUID, creates entry with `createdAt = updatedAt = Date.now()`, prepends to cache, writes, notifies, returns entry
   - `updateJournalEntry(id: string, body: string): JournalEntry` — finds by id, updates body + updatedAt, writes, notifies, returns updated entry. Throws if not found? No — returns early silently (matching bookmarkStore's `setBookmarkLabel` pattern of early return when idx === -1). Wait, spec says returns `JournalEntry`. If not found, throw? Let me check — the spec's API says `updateJournalEntry(id: string, body: string): JournalEntry`. Since it must return a `JournalEntry`, and no UI calls this yet (out of scope), I'll throw if not found for correctness. Actually, looking at notes/store's `updateNoteBody` — it returns void and silently returns if not found. The spec says the return type is `JournalEntry`. Let's make it return the updated entry, and silently return the existing entry unchanged if body hasn't changed (matching notes/store's no-op pattern). If id is not found, we can't return anything meaningful, so return early without notification... but the spec says return type is `JournalEntry`. I'll deviate slightly: return `JournalEntry | null` if not found to stay safe, or just not export this until UI needs it. Actually, simplest: match the spec exactly — `updateJournalEntry(id: string, body: string): JournalEntry`. If not found, throw an error. The spec says the store supports update for "future use, but no UI calls it yet."
   - `deleteJournalEntry(id: string): void` — removes by id, writes, notifies
6. **Subscribe:** `subscribe(listener: () => void): () => void` — standard Set pattern
7. **Testing helper:** `_resetCacheForTesting(): void`

**Key implementation patterns (follow bookmarkStore exactly):**
- `generateId()` with crypto.randomUUID() + fallback (lines 17-22 of bookmarkStore)
- `readFromStorage()` with SSR guard + try/catch + filter(isValidJournalEntry) (lines 39-51)
- `writeToStorage()` with SSR guard + QuotaExceededError catch (lines 53-63)
- `getCache()` lazy init from storage (lines 65-70)
- `notifyListeners()` iterating Set (lines 72-76)
- Module-level `cache` and `listeners` (lines 4-6)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add max entry limits (spec does not define one; QuotaExceededError is the natural limit)
- DO NOT add mode, promptText, or reflection fields — those are UI-only concerns
- DO NOT import from daily-experience.ts — the verseContext shape is inlined in the JournalEntry type
- DO NOT add migration logic — there is no prior journal data to migrate

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Covered in Step 3 | unit | Dedicated test file |

**Expected state after completion:**
- [x] `frontend/src/lib/bible/journalStore.ts` exists with the full API
- [x] All 7 exported functions + error class + testing helper are present
- [x] Build passes

---

### Step 3: Write journalStore.test.ts

**Objective:** Comprehensive unit tests for the journal store, following the bookmarkStore.test.ts pattern exactly.

**Files to create/modify:**
- `frontend/src/lib/bible/__tests__/journalStore.test.ts` — New file

**Details:**

Follow the test pattern from `bookmarkStore.test.ts`:
- Dynamic import: `async function loadStore() { return await import('../journalStore') }`
- `beforeEach: localStorage.clear() + vi.resetModules()`
- Helper: `makeJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry` with defaults `{ id: crypto.randomUUID(), body: 'Test entry', createdAt: Date.now(), updatedAt: Date.now() }`

**Test cases:**

```
describe('journalStore')
  describe('read API')
    it('returns empty array when no entries exist')
    it('getAllJournalEntries returns shallow copy')
    it('getJournalEntriesForVerse filters by book/chapter/verse within range')
    it('getJournalEntriesForVerse returns empty when no match')
    it('getJournalEntriesForVerse excludes entries without verseContext')
    it('getJournalEntryById returns entry when found')
    it('getJournalEntryById returns null when not found')
  describe('write API')
    it('createJournalEntry persists and returns entry with UUID')
    it('createJournalEntry with verseContext attaches context')
    it('createJournalEntry without verseContext omits field')
    it('createJournalEntry sets createdAt === updatedAt')
    it('updateJournalEntry updates body and updatedAt')
    it('deleteJournalEntry removes entry')
    it('deleteJournalEntry no-ops for unknown id')
  describe('subscription')
    it('subscribe notifies on create')
    it('subscribe notifies on update')
    it('subscribe notifies on delete')
    it('unsubscribe stops notifications')
  describe('SSR safety')
    it('returns empty array when window is undefined')
  describe('defensive parsing')
    it('filters out entries with missing required fields')
    it('filters out non-array JSON')
    it('handles corrupt JSON gracefully')
    it('preserves valid entries alongside invalid ones')
  describe('QuotaExceededError')
    it('throws JournalStorageFullError on quota exceeded')
  describe('cache coherence')
    it('re-import after mutation reflects persisted data')
  describe('multi-verse entries')
    it('saves entry with startVerse !== endVerse (e.g. Psalm 23:1-6)')
    it('getJournalEntriesForVerse matches any verse within range')
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test UI behavior (SavedEntriesList, JournalTabContent) — those are Step 4 concerns
- DO NOT mock localStorage — use the real localStorage (cleared in beforeEach)
- DO NOT use `vi.spyOn(localStorage, ...)` — tests use direct localStorage manipulation per bookmarkStore pattern

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ~25 unit tests | unit | Full coverage of CRUD, subscription, SSR, parsing, quota, multi-verse |

**Expected state after completion:**
- [x] `frontend/src/lib/bible/__tests__/journalStore.test.ts` exists
- [x] All tests pass (`pnpm test -- journalStore`)
- [x] Coverage: every exported function + error paths + edge cases

---

### Step 4: Wire JournalTabContent submit handler + load from store

**Objective:** Replace the in-memory-only submit with persistent storage, and load historical entries on mount.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — Wire submit + mount loading

**Details:**

**Import additions (top of file):**
```typescript
import { getAllJournalEntries, createJournalEntry } from '@/lib/bible/journalStore'
```

**Load from store on mount** — replace the empty `useState<SavedJournalEntry[]>([])` at line 75 with a lazy initializer:

```typescript
const [savedEntries, setSavedEntries] = useState<SavedJournalEntry[]>(() => {
  try {
    return getAllJournalEntries()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((e) => ({
        id: e.id,
        content: e.body,
        timestamp: new Date(e.createdAt).toISOString(),
        mode: 'free' as JournalMode,
        ...(e.verseContext && { verseContext: e.verseContext }),
      }))
  } catch {
    return []
  }
})
```

**Modify `handleEntrySave`** (line 188) — add `createJournalEntry` call before the in-memory state update:

```typescript
const handleEntrySave = (entry: { content: string; mode: JournalMode; promptText?: string }) => {
  // Persist to journal store
  const storeEntry = createJournalEntry(
    entry.content,
    journalVerseContext ?? undefined,
  )

  const savedEntry: SavedJournalEntry = {
    id: storeEntry.id,                                    // Use store-generated UUID
    content: entry.content,
    timestamp: new Date(storeEntry.createdAt).toISOString(),
    mode: entry.mode,
    promptText: entry.promptText,
    ...(journalVerseContext && { verseContext: journalVerseContext }),
  }
  setSavedEntries((prev) => [savedEntry, ...prev])
  markJournalComplete()
  recordActivity('journal')
  showToast('Your words are safe. Well done today.')

  // Milestone celebration check (unchanged — uses savedEntries.length + 1)
  // ...existing milestone logic unchanged...
}
```

Key changes:
1. `createJournalEntry(entry.content, journalVerseContext ?? undefined)` persists the entry
2. The `id` now uses the store-generated UUID instead of `'entry-' + Date.now()`
3. The `timestamp` is derived from the store's `createdAt` for consistency

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT refactor the Journal tab — add the store call, wire the mount loading, preserve all existing behavior
- DO NOT change SavedEntriesList or JournalInput — they consume the same `SavedJournalEntry[]` shape
- DO NOT add subscription-based reactivity — the in-memory state is the rendering source; store is for persistence
- DO NOT change the draft persistence mechanism (`wr_journal_draft`) — it remains independent
- DO NOT change the milestone celebration logic — it works correctly with the loaded entries count
- DO NOT wrap `createJournalEntry` in try/catch for QuotaExceededError — the store throws `JournalStorageFullError` which should surface. Actually, add a try/catch that catches `JournalStorageFullError` and shows a toast ("Storage full — clear some journal entries to free space.") but still allows the in-memory save and side effects to proceed (the entry was created in the session even if persistence failed).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing JournalTabContent tests must still pass | regression | Run existing tests to verify no breakage |

**Expected state after completion:**
- [x] Submitting a journal entry persists it to `bible:journalEntries` localStorage
- [x] Reloading the page shows previously saved entries in the SavedEntriesList
- [x] Entries with verse context save with `verseContext` field
- [x] Entries without verse context save without `verseContext` field
- [x] Draft persistence (`wr_journal_draft`) continues to work independently
- [x] All existing JournalTabContent tests pass

---

### Step 5: Add journal type to My Bible activity types + wire activityLoader

**Objective:** Extend the BB-14 activity feed data layer to include journal entries.

**Files to create/modify:**
- `frontend/src/types/my-bible.ts` — Add `'journal'` to types + `JournalData` interface
- `frontend/src/lib/bible/activityLoader.ts` — Import journalStore, add journal entries to `loadAllActivity()`, update `filterActivity()`

**Details:**

**`types/my-bible.ts` changes:**

```typescript
// Update ActivityItemType
export type ActivityItemType = 'highlight' | 'bookmark' | 'note' | 'meditation' | 'journal'

// Add JournalData
export interface JournalData {
  type: 'journal'
  body: string
  reference: string
}

// Update union
export type ActivityItemData = HighlightData | BookmarkData | NoteData | MeditationData | JournalData
```

**`activityLoader.ts` changes:**

Add import:
```typescript
import { getAllJournalEntries } from '@/lib/bible/journalStore'
```

Add to `loadAllActivity()` (after the meditation loop):
```typescript
for (const entry of getAllJournalEntries()) {
  if (!entry.verseContext) continue  // Only verse-linked entries appear in activity feed
  const vc = entry.verseContext
  items.push({
    type: 'journal',
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    book: vc.book,
    bookName: resolveBookName(vc.book),
    chapter: vc.chapter,
    startVerse: vc.startVerse,
    endVerse: vc.endVerse,
    data: {
      type: 'journal',
      body: entry.body,
      reference: vc.reference,
    },
  })
}
```

Update `filterActivity()` — change the `'daily-hub'` case (line 98) to match both meditation and journal:
```typescript
case 'daily-hub':
  return item.type === 'meditation' || item.type === 'journal'
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT include journal entries without verseContext in the activity feed
- DO NOT modify existing activity types or data interfaces
- DO NOT change the sort behavior — journal entries sort by createdAt/updatedAt like all other types

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| activityLoader includes journal entries with verseContext | unit | Mock journalStore, verify loadAllActivity includes journal items |
| activityLoader excludes journal entries without verseContext | unit | Mock journalStore with no-context entries, verify they're excluded |
| filterActivity 'daily-hub' matches both meditation and journal | unit | Verify filter returns both types |

**Expected state after completion:**
- [x] `ActivityItemType` includes `'journal'`
- [x] `JournalData` interface exists in `types/my-bible.ts`
- [x] `loadAllActivity()` returns journal entries with verse context
- [x] `filterActivity()` with `'daily-hub'` filter matches journal entries
- [x] Build passes

---

### Step 6: Create JournalCard + wire into ActivityCard

**Objective:** Render journal entries in the BB-14 activity feed, following the NoteCard/MeditationCard pattern.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/JournalCard.tsx` — New file
- `frontend/src/components/bible/my-bible/ActivityCard.tsx` — Add journal dispatch + icon

**Details:**

**`JournalCard.tsx`** — modeled on `MeditationCard.tsx` (simple display) with expandable body from `NoteCard.tsx`:

```typescript
import { useState, useCallback } from 'react'
import type { JournalData } from '@/types/my-bible'

interface JournalCardProps {
  data: JournalData
  verseText: string | null
}

export function JournalCard({ data, verseText }: JournalCardProps) {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div className="mt-2 space-y-1">
      {verseText ? (
        <p className="text-sm text-white/60">{verseText}</p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <div className={expanded ? '' : 'line-clamp-3'}>
        <p className="text-sm text-white">{data.body}</p>
      </div>
      {data.body.length > 300 && (
        <button
          type="button"
          onClick={toggleExpand}
          className="cursor-pointer text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      <p className="text-xs text-white/50">
        You journaled about this verse
      </p>
    </div>
  )
}
```

**`ActivityCard.tsx` changes:**

Add import:
```typescript
import { BookOpenText } from 'lucide-react'  // Journal icon (distinct from PenLine used for notes)
import { JournalCard } from './JournalCard'
```

Update `TYPE_ICONS`:
```typescript
const TYPE_ICONS = {
  highlight: Paintbrush,
  bookmark: Bookmark,
  note: PenLine,
  meditation: Brain,
  journal: BookOpenText,
} as const
```

Add badge for journal (after the meditation badge, line 71-75):
```typescript
{item.type === 'journal' && (
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
    Journal
  </span>
)}
```

Add rendering dispatch (after the meditation card, line 100-102):
```typescript
{item.data.type === 'journal' && (
  <JournalCard data={item.data} verseText={verseText} />
)}
```

**Responsive behavior:** N/A: inherits from ActivityCard's existing responsive behavior

**Guardrails (DO NOT):**
- DO NOT add inline scripture reference parsing (NoteCard has this; JournalCard does not need it)
- DO NOT add edit/delete actions — spec says no editing/deletion UI
- DO NOT add new hex colors — use existing `text-white/50`, `text-white/60`, `text-primary` classes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| JournalCard renders body text | unit | Verify body text is displayed |
| JournalCard renders verse text when available | unit | Verify verse text appears |
| JournalCard shows loading skeleton when verseText is null | unit | Verify skeleton shows |
| JournalCard expand/collapse works for long entries | unit | Verify toggle behavior |
| ActivityCard renders JournalCard for journal items | unit | Verify dispatch to JournalCard |

**Expected state after completion:**
- [x] `JournalCard.tsx` exists with expandable body + verse text display
- [x] `ActivityCard.tsx` dispatches to JournalCard for journal-type items
- [x] Journal entries with verse context appear in My Bible activity feed
- [x] Journal entries show "Journal" badge in the activity card header
- [x] Build passes

---

### Step 7: Update localStorage key inventory

**Objective:** Document the new `bible:journalEntries` key in the localStorage key inventory.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — Add entry to Bible Reader section

**Details:**

Add to the "Bible Reader" section of `11-local-storage-keys.md`, after the existing `bible:notes` entry:

```
| `bible:journalEntries` | `JournalEntry[]`           | Journal entries — verse-linked and freeform (BB-11b) |
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any other entries in the inventory
- DO NOT add the key to the "Daily Hub & Journal" section — it uses the `bible:` prefix and belongs with the other Bible reader keys

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Documentation change only |

**Expected state after completion:**
- [x] `bible:journalEntries` is documented in the localStorage key inventory
- [x] Type and description match the implementation

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Type + constant definitions |
| 2 | 1 | Journal store module (needs type + key) |
| 3 | 2 | Store tests (needs store module) |
| 4 | 2 | Wire JournalTabContent (needs store module) |
| 5 | 2 | Activity types + loader wiring (needs store module) |
| 6 | 5 | JournalCard rendering (needs activity types) |
| 7 | 1 | Documentation (needs key name decided) |

Steps 3, 4, 5 can run in parallel after Step 2. Step 6 depends on Step 5. Step 7 can run at any time after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | JournalEntry type + key constant | [COMPLETE] | 2026-04-09 | Added `JournalEntry` interface to `types/bible.ts` (after Note), added `BIBLE_JOURNAL_ENTRIES_KEY` to `constants/bible.ts` |
| 2 | Create journalStore.ts | [COMPLETE] | 2026-04-09 | Created `frontend/src/lib/bible/journalStore.ts` with full API: getAllJournalEntries, getJournalEntriesForVerse, getJournalEntryById, createJournalEntry, updateJournalEntry, deleteJournalEntry, subscribe, _resetCacheForTesting |
| 3 | Write journalStore.test.ts | [COMPLETE] | 2026-04-09 | Created `__tests__/journalStore.test.ts` with 27 tests covering CRUD, subscription, SSR, parsing, quota, cache coherence, multi-verse |
| 4 | Wire JournalTabContent | [COMPLETE] | 2026-04-09 | Wired `createJournalEntry` in handleEntrySave with JournalStorageFullError catch, added lazy initializer loading from store on mount. Added journalStore mock to JournalTabContent.test.tsx to prevent cache leaking between tests. |
| 5 | Activity types + loader | [COMPLETE] | 2026-04-09 | Added `'journal'` to ActivityItemType, `JournalData` interface to my-bible.ts, wired journalStore into activityLoader.ts, updated `daily-hub` filter. Added journal icon to ActivityCard TYPE_ICONS (prerequisite for Step 6). Added 3 journal-specific tests to activityLoader.test.ts (21 total). |
| 6 | JournalCard + ActivityCard | [COMPLETE] | 2026-04-09 | Created `JournalCard.tsx` with expandable body + verse text display. Added Journal badge, JournalCard import, and rendering dispatch to `ActivityCard.tsx`. Added 6 tests to `ActivityCard.test.tsx` (21 total). |
| 7 | Update localStorage inventory | [COMPLETE] | 2026-04-09 | Added `bible:journalEntries` to Bible Reader section of `11-local-storage-keys.md` |
