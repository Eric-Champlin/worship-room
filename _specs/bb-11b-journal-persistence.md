# BB-11b: Journal Persistence Completion

**Master Plan Reference:** N/A — completion spec for BB-11 (Journal bridge)
**Depends on:** BB-11 (Journal bridge), Daily Hub Journal tab, BB-10b pattern (optional `verseContext` field on save records)
**Hands off to:** BB-14 (My Bible activity feed will now show journal cards), BB-46 (verse echoes can read journals by verse)

---

## Overview

When a user journals about a Bible verse — whether through the "Journal about this" bridge from the reader or directly on the Daily Hub — their words should be saved. BB-11 built the bridge that carries verse context to the Journal tab, and users can write freely in the composer. But journal entries do not persist to localStorage at all. There is no journal store. Submitting an entry currently has no durable effect. This spec introduces a journal entry store, wires the Journal tab's submit handler to it, and ensures the optional `verseContext` field is included when an entry is saved with a verse context active. After BB-11b ships, journal entries are real, durable artifacts on the device — and BB-14's activity feed picks them up automatically.

## User Story

As a **logged-in user**, I want my journal entries to persist to localStorage so that I can see my verse-connected reflections in my Bible activity feed and they survive page reloads.

## Requirements

### Functional Requirements

1. A new journal entry store module exists with the following API:
   - `getAllJournalEntries(): JournalEntry[]`
   - `getJournalEntriesForVerse(book: string, chapter: number, verse: number): JournalEntry[]`
   - `getJournalEntryById(id: string): JournalEntry | null`
   - `createJournalEntry(body: string, verseContext?: VerseContext): JournalEntry`
   - `updateJournalEntry(id: string, body: string): JournalEntry`
   - `deleteJournalEntry(id: string): void`
   - `subscribe(listener: () => void): () => void`

2. The journal entry data shape:
   ```
   type JournalEntry = {
     id: string;              // UUID
     body: string;            // plain text
     createdAt: number;       // epoch ms
     updatedAt: number;       // epoch ms, equals createdAt unless edited
     verseContext?: {
       book: string;          // slug
       chapter: number;
       startVerse: number;
       endVerse: number;
       reference: string;     // pre-formatted
     };
   };
   ```

3. The `verseContext` field shape is identical to BB-10b's prayer shape — same field names, same types.

4. The store is located at a path matching existing project conventions (e.g. `frontend/src/lib/bible/journalStore.ts`). The plan phase picks the path based on where the existing BB stores live (highlights, bookmarks, notes).

5. The store is a thin copy of `bookmarkStore.ts` adapted for journal entries — same pub-sub pattern, same SSR safety, same defensive parsing, same QuotaExceededError handling.

6. The Journal tab's submit handler is updated to call `createJournalEntry(body, verseContext)` instead of its current no-op/stub behavior.

7. When a verse context is active (Verse Prompt Card visible from BB-11's bridge), the submitted entry includes the `verseContext` field populated from the active state.

8. When a verse context is not active (direct navigation to `/daily?tab=journal`, or user dismissed the Verse Prompt Card), the submitted entry does NOT include a `verseContext` field.

9. Multi-verse journal entries (arriving from the bridge with a range like Psalm 23:1–6) save with correct `startVerse` and `endVerse`.

10. Existing Journal tab draft persistence (`wr_journal_draft`) continues to work independently — drafts are work-in-progress, entries are completed submissions.

11. If the Journal tab already has a "previous entries" or "history" view rendering placeholder data, BB-11b wires it to the new store. If no such view exists, BB-11b does NOT add one.

### Non-Functional Requirements

- **Performance:** No measurable impact — this adds a localStorage write to an existing submit handler.
- **Accessibility:** N/A — no UI changes beyond replacing a stub submit.
- **SSR Safety:** Every store read returns `[]` or `null` on the server. Every write is a no-op on the server.
- **Reactivity:** Pub-sub backed by a `Set<Listener>`, same as the other BB stores. `subscribe` notifies listeners on every mutation.
- **Defensive parsing:** `try/catch` around `JSON.parse` on read; filter invalid entries; log but don't throw on bad data.
- **Quota handling:** `QuotaExceededError` on write shows the shared storage-full toast (same pattern as BB-7 and BB-7.5).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Submit journal entry with verse context | Auth modal shown (existing behavior — unchanged by this spec) | Entry saved with `verseContext` field attached | Existing auth modal message (unchanged) |
| Submit journal entry without verse context | Auth modal shown (existing behavior — unchanged) | Entry saved without `verseContext` field | Existing auth modal message (unchanged) |

No new auth gates. The Journal tab's existing auth gating applies unchanged. This spec only modifies what happens during the save step for already-authenticated submissions.

## Responsive Behavior

N/A — no UI changes. This spec modifies data persistence only (replacing a stub submit handler with a real localStorage write).

## AI Safety Considerations

N/A — This spec does not introduce any new user input surface or AI-generated content. The Journal tab's existing crisis keyword detection on textarea input continues to apply unchanged.

## Auth & Persistence

- **Logged-out (demo mode):** No change. Logged-out users cannot submit journal entries (existing auth gate). Zero persistence rule unaffected.
- **Logged-in:** Journal entries are saved to a new localStorage store. The store key follows existing conventions (the plan phase determines the exact key based on how other BB stores name their keys — likely `bible:journalEntries` if the `bible:` prefix is used by bookmarks/notes, or `dailyHub:journalEntries` if no BB convention exists).
- **localStorage usage:** One new key for journal entries. No changes to existing keys. `wr_journal_draft` continues to be used independently for draft persistence.
- **Route type:** Public (Daily Hub is accessible to all users; auth gates are on actions, not navigation)

## Completion & Navigation

N/A — no changes to completion tracking or navigation. The Journal tab's existing `markJournalComplete()` signal remains unchanged. Saving a journal entry (with or without verse context) fires the same completion signal.

## Design Notes

N/A — no visual changes. Zero raw hex values. No new components, no modified components, no changed styles.

## Inspection the Plan Phase Must Do First

Before writing the implementation plan, the plan phase must answer:

1. **Does any journal store exist?** Search for `journalStore`, `journals`, or similar in `frontend/src/state/`, `frontend/src/lib/dailyHub/`, and `frontend/src/lib/`. Confirm that journal entries don't persist.
2. **Where does the Journal tab's submit handler currently route data?** Find the submit code path in the Journal tab component. It might dispatch to a context, call a no-op stub, or simply log to console.
3. **What does the existing Journal tab UI expect a saved entry to look like for display purposes?** If the tab has any "previous entries" view, the plan needs to know the rendering shape so the new store matches.
4. **Does the Journal tab persist drafts in any way?** Confirm that drafts (`wr_journal_draft`) are a separate mechanism from the new entry store.
5. **What localStorage key convention do the existing BB stores use?** Check `bookmarkStore.ts`, `highlightStore.ts`, and `notes/store.ts` for their key naming patterns.

The plan phase must report these findings before writing the implementation plan.

## Out of Scope

- No changes to the Journal tab UI beyond replacing the stub submit
- No new "view past entries" page — BB-14 already surfaces them in My Bible
- No editing UI — the store supports `updateJournalEntry` for future use, but no UI calls it yet
- No deletion UI — same; the store supports it, no UI calls it yet
- No journal entry sharing
- No journal sync across devices — no accounts; same as every other store in the wave
- No migration of any prior journal data — there isn't any, since nothing was persisting
- No prayer or meditation fixes — BB-10b handles prayer; meditation already works
- No changes to the Verse Prompt Card — works correctly (BB-11 owns this)
- No changes to the bridge URL schema or preload hook — works correctly (BB-10 owns this)
- No refactoring of the Journal tab while in there — add the store, wire submit, ship

## Acceptance Criteria

- [ ] A new `journalStore.ts` module exists with the API described above (getAllJournalEntries, getJournalEntriesForVerse, getJournalEntryById, createJournalEntry, updateJournalEntry, deleteJournalEntry, subscribe)
- [ ] Submitting a journal entry from the Journal tab creates a record in localStorage
- [ ] Submitting with a verse context active saves the entry with a `verseContext` field containing `{ book, chapter, startVerse, endVerse, reference }`
- [ ] Submitting without a verse context (direct navigation to `/daily?tab=journal`) saves the entry without a `verseContext` field
- [ ] Submitting after the user removes the Verse Prompt Card (via X) saves without a `verseContext` field
- [ ] Reloading the page after submitting an entry, the entry is still present in the store
- [ ] The store survives page reloads, browser closes, and reopening the tab
- [ ] Multi-verse journal entries (arriving from the bridge with a range like Psalm 23:1–6) save with correct `startVerse` and `endVerse`
- [ ] Existing Journal tab draft persistence (`wr_journal_draft`) continues to work — drafts are independent of the new entry store
- [ ] After this spec ships, submitting a journal entry via the bridge results in a journal card appearing in the BB-14 activity feed under "From Daily Hub"
- [ ] The store is SSR-safe — server reads return `[]`, server writes are no-ops
- [ ] The store is reactive — `subscribe` notifies listeners on every mutation
- [ ] `QuotaExceededError` on write shows the shared storage-full toast
- [ ] Malformed entries in localStorage are filtered out silently on read without crashing
- [ ] `journalStore.test.ts` unit tests cover: create, read, read-by-verse, update body, delete, subscribe, malformed data, with and without verseContext
- [ ] The `verseContext` field shape is identical to BB-10b's prayer shape — same field names, same types
- [ ] No existing Journal tab tests break
- [ ] The plan phase reports its inspection findings (where the Journal tab lives, what the submit handler currently does, whether a "past entries" view exists) before writing the implementation plan
- [ ] Zero raw hex values introduced

## Notes for Plan Phase

- **The store is a copy of `bookmarkStore.ts` with one extra optional field.** Don't reinvent. Copy, rename, adapt, ship.
- **The Journal tab inspection is the riskiest part of this spec.** If the plan can't find the Journal tab's submit handler, or if the handler turns out to be tangled with other Daily Hub code, the spec gets harder. Worst case, the plan phase reports its findings and we adjust.
- **Do not refactor the Journal tab while you're in there.** Same rule as BB-10b. Add the store, wire submit, ship.
- **Drafts and entries are different.** The Journal tab's existing draft persistence (drafts that survive navigation, page reload, etc.) is unrelated to the new entry store. Don't conflate them.
- **The simplest implementation wins.** The store is ~150 lines, the wire-up is a single function call replacement. If the plan produces a sprawling refactor, audit and trim.
- **After this spec ships, the BB-14 persistence gap is fully closed.** All six activity types (highlights, bookmarks, notes, prayers, journals, meditations) now persist with verse context where applicable, and My Bible becomes a complete record of the user's interactions with scripture.
