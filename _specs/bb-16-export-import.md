# BB-16: Export & Import

**Master Plan Reference:** N/A — standalone spec in the Bible Redesign wave. Reads from and writes to stores established by BB-7 (highlights), BB-7.5 (bookmarks), BB-8 (notes), BB-10b/11b/12 (verse-attached prayers/journals/meditations). UI lives on the My Bible page (BB-14).

**Depends on:** BB-7, BB-7.5, BB-8, BB-10b, BB-11b, BB-12, BB-14, BB-15
**Hands off to:** BB-39 (PWA — export/import becomes the manual sync mechanism for multi-device users)

---

## Overview

Worship Room's Bible reader stores everything on the user's device with no account required. That promise works until the user asks: "what happens if I lose my laptop?" BB-16 answers that question by letting users download their entire personal layer — every highlight, bookmark, note, and verse-attached prayer/journal/meditation — as a single JSON file, and re-upload it on any device to restore the same data. No account, no cloud, no lock-in. The export file is the user's receipt that their writing belongs to them, and the import is the cross-device sync story for users who use Worship Room on a phone and a laptop.

After BB-16 ships, a user can back up their notes, share their highlights with a small group leader, switch laptops without losing anything, or — most importantly — *trust* that their writing belongs to them and not to a server they can't see. This is the spec that turns "your data lives in your browser" from a limitation into a feature.

## User Stories

- As a **logged-in or logged-out user**, I want to download all my highlights, bookmarks, notes, and verse-attached prayers/journals/meditations as a single file so that I can back up my data and never lose my work.
- As a **returning user on a new device**, I want to upload a previously exported file so that I can restore my personal Bible data without creating an account.
- As a **multi-device user**, I want to merge imported data with what's already on my device so that I can combine notes from my phone and laptop without losing anything from either.

## Context

BB-14 built the My Bible page with a footer trust signal that reads "Stored on this device. Export anytime in Settings." — but "Settings" is plain text, not a link. BB-16 makes that text interactive and builds the actual export/import feature behind it.

### Existing Storage Layout (verified by audit)

| Type | Path | Read Function | Reactive? | localStorage Key |
|------|------|---------------|-----------|-----------------|
| Highlights | `frontend/src/lib/bible/highlightStore.ts` | `getAllHighlights()` | yes (subscribe) | `wr_bible_highlights` |
| Bookmarks | `frontend/src/lib/bible/bookmarkStore.ts` | `getAllBookmarks()` | yes (subscribe) | `bible:bookmarks` |
| Notes | `frontend/src/lib/bible/notes/store.ts` | `getAllNotes()` | yes (subscribe) | `bible:notes` |
| Journals | `frontend/src/lib/bible/journalStore.ts` | `getAllJournalEntries()` | yes (subscribe) | `bible:journalEntries` |
| Prayers | `frontend/src/services/prayer-list-storage.ts` | `getPrayers()` | no (plain CRUD) | `wr_prayer_list` |
| Meditations | `frontend/src/services/meditation-storage.ts` | `getMeditationHistory()` | no (plain CRUD) | `wr_meditation_history` |

Prayers and meditations are plain CRUD services, not reactive stores. BB-16 adds mutation methods alongside existing CRUD functions without refactoring the architecture.

### Relevant TypeScript Types

- `Highlight` — `id`, `book`, `chapter`, `startVerse`, `endVerse`, `color`, `createdAt`, `updatedAt`
- `Bookmark` — `id`, `book`, `chapter`, `startVerse`, `endVerse`, `label?`, `createdAt`
- `Note` — `id`, `book`, `chapter`, `startVerse`, `endVerse`, `body`, `createdAt`, `updatedAt`
- `JournalEntry` — `id`, `body`, `createdAt`, `updatedAt`, `verseContext?`
- `PersonalPrayer` — defined in the prayer service file, has `verseContext?: PrayerVerseContext`
- `MeditationSession` — defined in `frontend/src/types/meditation.ts`, has `verseContext?: MeditationVerseContext`

Each verseContext shape: `{ book, chapter, startVerse, endVerse, reference }`.

## Requirements

### Functional Requirements

#### 1. Export Format

A single JSON file with a versioned envelope:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-09T18:32:11.000Z",
  "appVersion": "worship-room-bible-wave-1",
  "data": {
    "highlights": [],
    "bookmarks": [],
    "notes": [],
    "prayers": [],
    "journals": [],
    "meditations": []
  }
}
```

- **`schemaVersion`** — integer starting at 1. BB-16 ships v1. Future migrations increment this.
- **`exportedAt`** — ISO 8601 timestamp of export creation. Used for display in import preview.
- **`appVersion`** — free-form string (`"worship-room-bible-wave-1"` for BB-16). Display and debugging only.
- **`data`** — faithful snapshot of localStorage in each store's native shape. No transformation.

#### 2. What's Exported

- **highlights** — full `Highlight[]` from `getAllHighlights()`
- **bookmarks** — full `Bookmark[]` from `getAllBookmarks()`
- **notes** — full `Note[]` from `getAllNotes()`
- **prayers** — only records with `verseContext` set (filtered from `getPrayers()`)
- **journals** — only entries with `verseContext` (filtered from `getAllJournalEntries()`)
- **meditations** — only sessions with `verseContext` (filtered from `getMeditationHistory()`)

Empty arrays are preserved as `[]` in the export.

#### 3. What's NOT Exported

Reading progress, reading streak, VOTD state, reader settings (theme/type size/font family), drawer state, active reading plan progress — these are derived signals or UI preferences, not user-created content. The principle: **export contains what the user wrote, not what the app remembers.**

#### 4. Settings Modal (UI Surface)

A modal opened from the My Bible footer. BB-14's footer trust signal ("Stored on this device. Export anytime in Settings.") becomes interactive — tapping "Settings" opens the modal.

The modal contains two sections:

**Export section:**
- Heading: "Export your data"
- Description: "Download a JSON file with all your highlights, notes, bookmarks, and saved entries. You can restore it on any device — no account needed."
- Button: "Download export"
- On click: builds export object, serializes to JSON, triggers download with filename `worship-room-bible-export-YYYY-MM-DD.json` (date from `exportedAt`, not render time)
- iOS Safari fallback: opens file in new tab with instructions "Tap and hold to save" if direct download isn't supported
- After success: toast "Export downloaded"

**Import section:**
- Heading: "Import data"
- Description: "Upload a JSON file you've exported from Worship Room. You can replace your current data or merge it with what's here."
- File input: styled file picker accepting only `.json` files (`<input type="file" accept="application/json">`)
- On file selected: read via `FileReader`, parse, validate, show import preview
- No drag-and-drop in BB-16

#### 5. Import Validation

The validator is a pure function returning a tagged union (no throws):

```typescript
function validateExport(parsed: unknown):
  | { valid: true; export: BibleExportV1 }
  | { valid: false; error: string }
```

Validation checks:
1. Valid JSON
2. Top-level object has `schemaVersion`, `exportedAt`, `appVersion`, and `data`
3. `schemaVersion` is an integer equal to 1
4. `data` is an object with the six expected keys (each can be empty `[]`)
5. Each record has minimum required fields for its type (`id`, plus type-specific fields like `book`, `chapter`, `startVerse`, `endVerse`)
6. Strict on data types: `chapter` must be integer, `book` must be string, etc.

**Permissive on extra fields:** Unknown fields on records are preserved silently (round-trip clean).

Error messages:
- **Invalid JSON:** "This file isn't a valid Worship Room export. It might be corrupted or from a different app."
- **Wrong schema version (newer):** "This export was made with a newer version of Worship Room. Update the app to import it."
- **Missing/malformed data:** "This export is missing required data. It might be corrupted."

#### 6. Import Preview

Before any import action, the user sees a preview showing:

- **Source info:** `exportedAt` formatted as relative time + absolute date ("Exported 3 days ago · April 6, 2026 at 2:14 PM")
- **App version:** muted text
- **Schema version:** shown only if it differs from current app's version
- **Counts:** X highlights, Y bookmarks, Z notes, A prayers, B journals, C meditations
- **Conflict preview** (Merge mode only): count of imported records sharing an `id` with local records
- **Three action buttons:** Replace local data, Merge with local data, Cancel
- **Warning text** above buttons: "Replace will delete your current highlights, notes, and saved entries. This cannot be undone." — visible only when Replace button is focused/hovered

#### 7. Import Modes

**Replace:** Wipe all six stores and write the imported records. "Restoring on a fresh device" case.

**Merge:** For each imported record:
- No local record with same `id` → add, increment `added`
- Local record exists with same `id` and incoming `updatedAt` is newer → replace, increment `updated`
- Local record exists and is same age or newer → skip, increment `skipped`
- Records without `updatedAt` (bookmarks, possibly meditations): incoming wins on conflict

**Cancel:** Return to My Bible, no changes.

Both Replace and Merge are irreversible from the app. The preview warning makes this explicit.

#### 8. Store Mutation Methods

Each store/service gets two new methods:

**Reactive stores (highlights, bookmarks, notes, journals):**
- `replaceAll*()` — clear localStorage key, write new array, notify subscribers
- `mergeIn*()` — merge logic per record, write merged array, notify subscribers, return `{ added, updated, skipped }`

**CRUD services (prayers, meditations):**
- `replaceAll*()` — clear localStorage key, write new array
- `mergeIn*()` — merge logic, write merged array, return `{ added, updated, skipped }`
- Added alongside existing CRUD functions. No subscribe mechanism. No architectural refactoring.

#### 9. Post-Import Refresh

After successful import:
- Toast: "Imported X items" with total count
- Reactive stores (highlights, bookmarks, notes, journals) re-render via subscriber notification
- Non-reactive stores (prayers, meditations): if wiring a re-read on focus/visibility is straightforward in BB-14's implementation, do that; otherwise fall back to `window.location.reload()`. The plan phase decides which approach is cleaner.

### Non-Functional Requirements

- **Round-trip integrity:** export → import (Replace) → export again → both files have identical record sets (IDs and bodies match; timestamps may differ if `updatedAt` was bumped)
- **Unknown fields preserved:** imported records with extra fields the app doesn't recognize are kept silently
- **iOS Safari:** export download and file upload both tested on real hardware
- **Performance:** export and import operations complete synchronously for typical data sizes (< 500 items per store)

## Auth Gating

The Settings modal and all export/import functionality is **public** — no auth gates. All data lives in localStorage, accessible to all users regardless of login state.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap "Settings" in My Bible footer | Opens Settings modal | Opens Settings modal | N/A |
| Download export | Builds and downloads JSON from localStorage | Same | N/A |
| Select import file | Opens file picker | Same | N/A |
| Preview import contents | Shows preview with counts and options | Same | N/A |
| Replace local data | Wipes stores and writes imported data | Same | N/A |
| Merge with local data | Merges imported data into existing stores | Same | N/A |
| Cancel import | Closes preview, no changes | Same | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Settings modal renders as full-screen bottom sheet. Export/Import sections stack vertically. File picker full width. Import preview action buttons stack vertically. Warning text above buttons. |
| Tablet (640-1024px) | Settings modal renders centered at max-w-lg. Sections stack vertically with comfortable padding. Action buttons horizontal row. |
| Desktop (> 1024px) | Settings modal renders centered at max-w-lg. Same layout as tablet with more whitespace. |

Additional notes:
- All tap targets minimum 44px
- File picker button styled as a visible tappable area (not just the native browser input)
- Import preview scrollable if counts + buttons exceed viewport height
- Modal close via backdrop click, Escape key, or Cancel button
- Reduced motion respected: no entry/exit animations when `prefers-reduced-motion` is set

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. It exports and imports structured data. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full functionality. Export reads from localStorage; import writes to localStorage. Zero database writes.
- **Logged-in users:** Same behavior — all localStorage-based. Phase 3 backend sync is out of scope.
- **Route type:** Public (modal on existing `/bible/my` page, no new route)
- **localStorage keys read:**
  - `wr_bible_highlights` — highlights (BB-7)
  - `bible:bookmarks` — bookmarks (BB-7.5)
  - `bible:notes` — notes (BB-8)
  - `bible:journalEntries` — journals (BB-11b)
  - `wr_prayer_list` — prayers (BB-10b)
  - `wr_meditation_history` — meditations (BB-12)
- **localStorage keys written:** same six keys (on import only)
- **No new localStorage keys created.** Modal state is React state only.

## Completion & Navigation

N/A — standalone feature on the My Bible page, not part of the Daily Hub tabbed experience. No completion tracking.

## Design Notes

- **Settings modal:** dark frosted glass matching the Bible section theme (`rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`, same pattern as AudioDrawer). Not a generic system settings dialog — a quiet corner of the Bible feature.
- **Section headings:** Inter semi-bold, `text-white`, consistent with inner-page heading patterns
- **Description text:** `text-white/60`, Inter regular
- **Buttons:** "Download export" uses white pill CTA pattern. "Replace local data" uses danger styling (red-tinted border/text). "Merge with local data" uses primary CTA. "Cancel" uses ghost/outline style.
- **Import preview:** `FrostedCard` component for the preview content area, with counts displayed as a compact grid
- **Warning text:** `text-danger` (red), rendered with `role="alert"` for screen readers
- **File picker:** styled button overlaying hidden native `<input type="file">`, matching the Bible section's frosted glass button language
- **Toast notifications:** use existing toast system for success/error feedback
- **Error states:** `FrostedCard` with warning icon, error message text, and Cancel button
- **Design system recon reference:** `_plans/recon/design-system.md` available for exact CSS values
- **No new visual patterns introduced** — this spec composes existing patterns (FrostedCard, frosted glass modal, white pill CTA, toast notifications, danger button styling)
- **Zero raw hex values** in components — all colors via Tailwind design tokens

## Known Limitations

- **No cross-tab sync:** After import, other open tabs won't re-render. Users should refresh other tabs. BB-39 (PWA) or a follow-up will add `storage` event listeners.
- **Import is irreversible from the app.** Users can re-import a different file to recover, but there's no built-in undo. The warning text makes this clear.

## Out of Scope

- **No conversion of prayer/meditation services to reactive store pattern** — they remain as plain CRUD services
- **No drag-and-drop import** — file picker only
- **No partial export** ("export only my highlights") — all or nothing
- **No partial import** ("import only the notes") — same
- **No encryption of the export file** — plain JSON. Users can use OS-level encryption tools.
- **No diff preview before import** — preview shows counts, not record-by-record diff
- **No undo** — Replace and Merge are irreversible
- **No automatic backups** — manual export only
- **No cloud storage integration** (Google Drive, Dropbox, iCloud) — would violate the no-account principle
- **No CSV or PDF export** — JSON only (round-trippable)
- **No analytics on export/import events**
- **No cross-tab synchronization** — documented known limitation
- **No new routes** — modal on existing `/bible/my` page

## Acceptance Criteria

- [ ] My Bible footer trust signal is interactive — tapping "Settings" opens the Settings modal
- [ ] Footer text no longer reads as plain text placeholder — it's a tappable link/button
- [ ] Settings modal contains an Export section and an Import section
- [ ] Export section has a "Download export" button
- [ ] Clicking "Download export" produces a JSON file with `schemaVersion: 1`, valid `exportedAt` ISO timestamp, `appVersion: "worship-room-bible-wave-1"`, and `data` with all six keys
- [ ] Downloaded file is named `worship-room-bible-export-YYYY-MM-DD.json` using the export's `exportedAt` date
- [ ] Each `data` array contains records in the corresponding store's native shape
- [ ] Prayer/journal/meditation arrays only contain records with `verseContext` set
- [ ] Records without `verseContext` are excluded from the export
- [ ] Empty arrays (e.g., no notes) are present as empty `[]` in the export
- [ ] Export reads from actual function names: `getAllHighlights`, `getAllBookmarks`, `getAllNotes`, `getAllJournalEntries`, `getPrayers`, `getMeditationHistory`
- [ ] Export download falls back to new-tab approach on iOS Safari with "Tap and hold to save" instruction
- [ ] Import section has a file picker accepting only `.json` files
- [ ] File picker has a clear `aria-label`
- [ ] Selecting a valid export file shows the Import Preview with counts per record type
- [ ] Import Preview shows `exportedAt` formatted as relative time + absolute date
- [ ] Import Preview shows three action buttons: Replace local data, Merge with local data, Cancel
- [ ] Replace warning text ("Replace will delete your current highlights, notes, and saved entries. This cannot be undone.") is visible when Replace button is focused/hovered
- [ ] Replace button has `aria-describedby` pointing to the warning text
- [ ] Tapping Replace wipes all six stores and writes imported records, then shows success toast
- [ ] Tapping Merge runs merge logic per store and shows success toast with total count
- [ ] Tapping Cancel returns to My Bible without changes
- [ ] After successful import, My Bible activity feed reflects the new data (reactive stores re-render via subscribers; prayer/meditation data refreshes via reload or re-read)
- [ ] Selecting invalid JSON shows "not a valid Worship Room export" error with Cancel button
- [ ] Selecting a file with wrong `schemaVersion` shows version-mismatch error
- [ ] Selecting a file with missing required record fields shows corruption error
- [ ] All four reactive stores (highlights, bookmarks, notes, journals) have working `replaceAll*` and `mergeIn*` methods that call existing notification mechanisms
- [ ] Both CRUD services (prayers, meditations) have `replaceAll*` and `mergeIn*` methods alongside existing CRUD functions without architectural changes
- [ ] Merge correctly identifies conflicts by `id` and keeps the newer version based on `updatedAt`
- [ ] Records without `updatedAt` use "incoming wins" as the merge rule
- [ ] Round-trip: export → import (Replace) → export again → both files have identical record IDs and bodies
- [ ] Unknown fields on imported records are preserved silently, not stripped
- [ ] Validator returns a tagged union (no throws) for all valid and invalid inputs
- [ ] `exportBuilder.ts` unit tests: empty stores, populated stores, prayer/journal/meditation filtering by verseContext
- [ ] `importParser.ts` unit tests: valid v1, missing schemaVersion, wrong schemaVersion, invalid JSON, missing data field, missing required record fields, extra unknown fields preserved
- [ ] `importApplier.ts` unit tests: replace wipes correctly, merge adds/updates/skips correctly, merge counts are accurate
- [ ] Settings entry from My Bible footer works on mobile and desktop
- [ ] All tap targets >= 44px
- [ ] Reduced motion respected
- [ ] Zero raw hex values in components
- [ ] Lighthouse accessibility score >= 95 on the Settings modal

## Notes for /plan Execution

- **The validator is the most important file.** Write the tests first. Cover every malformed input: empty file, empty object, missing keys, wrong types, nested malformations, right top-level shape but garbage records.
- **The Replace warning is non-negotiable.** A user who taps Replace expecting Merge and loses six months of notes will never trust the app again.
- **Test the round-trip rigorously.** Export → Import (Replace) → verify → Export again → diff. The most likely drift is `updatedAt` getting bumped on import. Decide whether to preserve `updatedAt` exactly or accept the bump and document it.
- **iOS Safari will fight you on file uploads.** Test on real hardware. The `<input type="file">` behaves differently on iOS.
- **Default to the modal, not a dedicated page.** If a future spec adds enough settings to justify a page, that's a small refactor at that time.
- **Export filename uses the export's date, not today's date.** If the user opens the modal at 11:58 PM and clicks Download at 12:01 AM, the filename should use the 12:01 AM date.
- **The naming inconsistency between stores and services is intentional.** Highlights/bookmarks/notes/journals use `getAll*` while prayers and meditations use service-style names. The export builder must handle this inconsistency by using the actual function names. Do not unify them.
- **Non-reactive prayer/meditation services mean My Bible might not auto-refresh after import.** If wiring a re-read on focus/visibility is straightforward in BB-14's implementation, do that. Otherwise fall back to `window.location.reload()`.
- **After BB-16 ships, the My Bible story is complete.** BB-14 (dashboard) + BB-15 (search) + BB-16 (export/import) cover the entire personal layer. The no-account promise is backed by a working exit strategy.
