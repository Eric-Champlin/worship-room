# BB-8: Notes

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (verse spans), BB-6 (action sheet + registry + ActionContext APIs), BB-7 (store pattern, highlight persistence), BB-7.5 (bookmark store, showToast/keepSheetOpen APIs)
**Hands off to:** BB-14 (My Bible renders notes), BB-16 (export includes notes), BB-38 (deep linking enables verse-reference-to-jump inside notes)

---

## Overview

When a verse hits home — during a hard season, a Sunday sermon, or a quiet Tuesday morning — the most natural response is to write. Notes are where the Bible becomes personal. A prayer request woven into Romans 8:28, a sermon takeaway on John 3:16, a margin thought on Psalm 23 that a user needs to see again next month. This spec makes the Note action in the verse action sheet fully functional: tapping Note opens a calm, trustworthy editor sub-view with autosave, verse-reference linking inside the body, and localStorage persistence.

This is the third and final spec that makes a primary action row button real (Highlight → BB-7, Bookmark → BB-7.5, Note → BB-8). After BB-8 ships, three of the four most-used actions work end to end and the Share button is the only stub left in the primary row.

## User Stories

As a **logged-in user** reading the Bible, I want to write a note on a verse so that I can capture what a passage means to me — prayers, reflections, sermon takeaways — and find it again when I return.

As a **logged-out visitor** reading the Bible, I want to write and save a note on a verse without creating an account so that I can start capturing my thoughts immediately and build trust with the app.

As a **logged-in user** reopening a chapter I studied last week, I want to see a small marker on verses with notes so that I feel reassured my reflections are still there and can trust the persistence.

As a **logged-in user** writing a note, I want references I type (e.g., "see also Romans 8:28") to be recognized and displayed as tappable links when viewing the note, so that my cross-references become navigable.

## Requirements

### Data Model

1. Notes persist to `localStorage['bible:notes']` as a flat array of `Note` objects
2. Each Note contains: `id` (UUID), `book` (slug), `chapter` (number), `startVerse` (number), `endVerse` (number, equals startVerse for single-verse), `body` (string, plain text, max 10,000 chars), `createdAt` (epoch ms), `updatedAt` (epoch ms, bumped on any body change)
3. Plain text only — no Markdown, no rich text, no HTML. Line breaks are the only formatting
4. One note per verse range — if a note already overlaps the selected verse(s), the editor loads the existing note body. No "second note" creation
5. Range handling: notes don't split or merge on overlap. If a note exists on 3:16–18 and the user taps 3:17, the editor opens the existing 3:16–18 note with its full range preserved. The range does not shrink to match the selection

### Storage Layer

6. Storage API at `src/lib/bible/notes/store.ts` following the same SSR-safe, reactive, defensive, QuotaExceededError-handling pattern as BB-7 highlights and BB-7.5 bookmarks
7. API surface: `getAllNotes()`, `getNotesForChapter(book, chapter)`, `getNoteForVerse(book, chapter, verse)`, `getNoteForSelection(selection)`, `upsertNote(selection, body)`, `updateNoteBody(id, body)`, `deleteNote(id)`, `restoreNote(note)`, `subscribe(listener)`
8. `upsertNote` is create-or-update: overlapping note → update body (preserve id, createdAt, bump updatedAt); no overlap → create new record
9. `updateNoteBody` is the autosave fast path — takes id directly, bumps updatedAt, skips write if body unchanged
10. `restoreNote` re-inserts a deleted note with its original id and createdAt (supports undo)

### Note Editor Sub-View

11. Tapping Note in the action sheet opens the `NoteEditor` sub-view (replaces the existing `NoteEditorStub` from BB-6)
12. **Header:** back button (top-left), verse reference title (e.g., "John 3:16" or "John 3:16–18"), subtitle ("New note" for new / "Edited just now" / "Edited 3 min ago" for existing), delete icon (trash, right side, only visible for existing notes)
13. When the editor loads an existing note because the tapped verse falls inside a wider range, the header shows the full range (e.g., "John 3:16–18") to make it clear the note covers more than the tapped verse
14. **Verse preview strip:** truncated display of the verse text (2 lines max, muted, non-interactive), reminding the user what they're writing about
15. **Textarea:** large, takes most of the sub-view height. Respects user's reading font preference (serif/sans from BB-4 setting). Generous line height. Placeholder: "Write what this passage means to you…". Autofocus on open. No toolbar, no formatting buttons
16. **Character counter:** bottom-right corner of textarea. Muted below 9,000 chars, warning color at 9,000–9,999, red at 10,000. Hard stop at 10,000 prevents further typing; pasting beyond the limit truncates
17. **Tab key behavior:** Tab inserts a tab character (not focus-next). Shift-Tab removes a tab character
18. **Footer:** pinned to bottom. Left: save status ("Saved" / "Saving…" / "Unsaved changes"). Right: "Autosaves every 2 seconds" hint

### Autosave Behavior

19. Debounced autosave fires 2 seconds after the user stops typing (each keystroke resets the timer)
20. On close (back button, sheet close, Escape): if the body has unsaved changes, save immediately before closing
21. First save uses `upsertNote` and stashes the returned id. Subsequent saves use `updateNoteBody(id, body)`
22. Saves are idempotent — if body hasn't changed since last save, skip the write
23. On successful save: status shows "Saved", header subtitle updates to "Edited just now"
24. On QuotaExceededError: shows the shared storage-full toast, status shows "Couldn't save — storage full"
25. On any other error: status shows "Couldn't save — try again"

### Delete & Undo

26. Tapping the trash icon opens a confirm prompt inside the sub-view (not a separate modal): "Delete this note?" with Delete (destructive) and Cancel buttons
27. Confirming delete: removes the note via `deleteNote(id)`, pops the sub-view, shows "Note deleted" toast with Undo (5-second TTL)
28. Undo within 5 seconds: restores the note with the same id and createdAt via `restoreNote(note)` on the store

### Reference Parser

29. A reference parser at `src/lib/bible/notes/referenceParser.ts` scans note body text for verse reference patterns
30. Supported patterns: full book names and common abbreviations (reusing the abbreviation map from BB-2's book search), single verses ("John 3:16"), verse ranges with hyphen or en-dash ("John 3:16-18", "John 3:16–18"), chapter-only references ("Psalm 23"), numbered books ("1 John 4:8", "2 Timothy 3:16")
31. Must NOT match: prose descriptions ("Genesis chapter 1 verse 1"), references split across line breaks, non-reference number patterns ("3:16pm", "at 3:16 p.m.")
32. In display mode (BB-14's My Bible view), matched references render as `<button>` elements with underline and accent color
33. Inside the editor textarea, references stay as plain text — no live highlighting while typing
34. Tapping a parsed reference currently shows a toast: "Jump-to-reference ships with deep linking" (BB-38 will replace with real navigation). If BB-38 has shipped by execution time, wire real navigation instead

### Visual Indicator on the Reader

35. Verses with notes display a small note marker (pencil or document outline icon) in the verse number area
36. The note marker is positioned after the verse number, offset from the bookmark marker position (bookmark is left of number, note marker is right of number). Layout with both: `[bookmark] 16 [note] verse text…`
37. Marker uses a theme-scoped token (`--note-marker`), one token with three theme overrides (midnight, parchment, sepia), same pattern as bookmarks
38. The marker coexists cleanly with highlight backgrounds and bookmark markers — all can appear on the same verse simultaneously

### Primary Actions Row State

39. The Note icon in PrimaryActionsRow shows outline state when no note exists for the current selection, filled state when a note exists
40. For multi-verse selections, filled if any verse in the range has a note (same rule as highlights and bookmarks)

### Registry Handler

41. The existing `note` stub in the action registry is replaced with a real handler that calls `getNoteForSelection` for state and `ctx.pushSubView({ type: 'note-editor', selection })` on invoke

### Render Layer Integration

42. `VerseSpan.tsx` accepts a new `note` prop (`Note | null`) and renders the note marker when present
43. `ReaderBody.tsx` loads notes for the current chapter via `useChapterNotes(book, chapter)` and passes them down to each `VerseSpan`
44. Screen reader announcement for verses with notes: "John 3:16, has a note". If both bookmarked and noted: "John 3:16, bookmarked, has a note"

### Keyboard Shortcuts

45. Inside the editor: `Cmd/Ctrl + S` → force save immediately. `Escape` → save and close. `Tab` / `Shift+Tab` → insert/remove tab character. `Cmd/Ctrl + Backspace` → delete current line
46. Focus trap stays inside the sub-view. Tab cycles through back button, delete button, textarea, footer controls

### Reusable Autosave Hook

47. `useAutosave` hook at `src/hooks/useAutosave.ts` — takes a value, a save function, and a debounce delay; manages status states ("idle" / "saving" / "saved" / "error"). Designed for reuse by BB-14 (inline note editing) and future editor surfaces

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View note markers on verses | Visible (markers render for any persisted notes) | Visible | N/A |
| Tap Note in action sheet | Opens the note editor sub-view (no auth gate) | Opens the note editor sub-view | N/A |
| Write and autosave a note | Note saves to localStorage (no account required — same as bookmarks and highlights) | Note saves to localStorage | N/A |
| Delete a note | Deletes from localStorage | Deletes from localStorage | N/A |

**No auth gate on any note action.** Notes persist to localStorage only (no server in Phase 2). Both logged-in and logged-out users can create, edit, and delete notes. This matches the bookmark and highlight behavior established in BB-7 and BB-7.5. Phase 3 will migrate to server persistence with auth.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Note editor sub-view fills the action sheet width. Textarea takes remaining height after header and verse preview. Footer pinned to bottom. Character counter positioned bottom-right of textarea. Delete confirm buttons stack if needed. Touch targets 44px minimum |
| Tablet (640–1024px) | Same as mobile — the action sheet is a fixed-width bottom sheet on all screen sizes |
| Desktop (> 1024px) | Same layout within the action sheet. Tab key inserts tab character (not focus-next). Cmd+S shortcut active. Long-form writing is comfortable with the generous textarea height |

The action sheet itself handles responsive width/height — the note editor fills whatever space the sheet provides. No breakpoint-specific layout changes needed inside the editor beyond standard text reflow.

Note markers on the reader follow the same responsive behavior as bookmark markers — they scale with the verse number font size and maintain their position relative to the verse number across all breakpoints.

## AI Safety Considerations

**Crisis detection needed?** No — notes are private, plain-text, localStorage-only content that is never displayed publicly, never sent to an AI API, and never moderated. Unlike Prayer Wall posts or prayer generation input, note content has no audience beyond the user themselves. Crisis detection would be intrusive in a private writing space and could discourage honest reflection.

**User input involved?** Yes — the textarea accepts free-form text up to 10,000 characters. However, this input is never sent to a server, never displayed to other users, and never processed by AI. It stays in localStorage on the user's device.

**AI-generated content?** No.

## Auth & Persistence

- **Logged-out users:** Can create, edit, and delete notes. Notes persist to `localStorage['bible:notes']`. No server writes, no database table (Phase 2)
- **Logged-in users:** Same behavior as logged-out. Notes persist to localStorage only in Phase 2. Phase 3 will migrate to server persistence
- **localStorage key:** `bible:notes` — follows the `bible:` prefix convention established by BB-7.5 bookmarks (`bible:bookmarks`), distinct from the legacy `wr_bible_notes` key used by the pre-redesign Bible reader
- **Route type:** Public (the Bible reader at `/bible/:book/:chapter` is a public route)

## Completion & Navigation

N/A — the Bible reader is not part of the Daily Hub tabbed experience. Note creation does not signal to the Daily Hub completion tracking system. The reader has its own engagement tracking (reading streak via `wr_bible_streak`, chapters read via `wr_bible_progress`) which is unaffected by this spec.

## Design Notes

- **Editor tone:** Calm, trustworthy, minimal. No playful animations, no confetti on save, no friendly error messages. The footer's "Saved" indicator is the only feedback the editor gives. Notes are where people write prayers, confessions, and heavy reflections — the space should feel like a blank journal page, not a chat interface
- **Theme tokens:** One new CSS custom property `--note-marker` with overrides for midnight, parchment, and sepia themes. Same pattern as `--bookmark-marker` from BB-7.5
- **Textarea styling:** Follows the user's reading font preference (serif/sans from `wr_bible_reader_font_family`). Generous line height for comfortable writing. Uses the reader's theme-scoped background and text colors, not the Daily Hub's white textarea glow pattern
- **FrostedCard:** Not used inside the editor — the sub-view has its own minimal styling within the action sheet chrome. The verse preview strip and header use theme-scoped colors from the reader's existing token system
- **Character counter colors:** Muted text at <9,000 (theme default muted color), warning color at 9,000–9,999 (amber/orange), red at 10,000 (destructive/danger). Use existing design system tokens — no raw hex values
- **Delete confirm prompt:** Inline within the sub-view, not a separate modal. Destructive button uses the existing danger/destructive button pattern
- **Note marker icon:** Small and muted. Users who wrote a note notice it; users who didn't find it invisible. Same visual weight as the bookmark marker
- **Reduced motion:** Respects `prefers-reduced-motion` on sub-view open/close transitions and any micro-animations. The editor itself has no decorative animations
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact CSS values of the action sheet sub-view transitions and reader theme tokens

## Out of Scope

- **My Bible notes view** — BB-14. This spec persists notes and surfaces them on the reader; BB-14 builds the browsable notes dashboard
- **Rich text or Markdown** — plain text only. Line breaks are the only formatting. BB-16 export could serialize to Markdown; a future spec could add rich text
- **Voice notes** — rejected in Round 3
- **Image attachments** — not in the wave
- **Sharing notes** — notes stay private per the no-account promise. BB-13 is for sharing verses, not notes
- **Collaborative editing** — no accounts, no collaboration
- **Version history** — `updatedAt` captures the latest edit; prior versions are not retained
- **Wire-up of reference link navigation** — BB-38 owns that. BB-8 parses and displays references but taps show a toast placeholder
- **AI "rewrite this note" or "suggest a reflection"** — BB-30 is for explaining passages, not editing user content
- **Export** — BB-16
- **Cross-tab sync** — same as bookmarks; optional future enhancement via `storage` event
- **Note templates** (e.g., "Observation / Interpretation / Application" prompts) — overbuilt for a plain editor. A future spec could add optional templates if users ask
- **Server persistence** — Phase 3

## Acceptance Criteria

- [ ] Tapping Note in the action sheet opens the note editor sub-view
- [ ] The editor autofocuses the textarea on open (cursor ready, keyboard up on mobile)
- [ ] The header shows the correct verse reference (e.g., "John 3:16" or "John 3:16–18")
- [ ] For new notes, the header subtitle reads "New note"
- [ ] For existing notes, the header shows "Edited Xm ago" and the delete button (trash icon) is visible
- [ ] When editing a note via a verse inside its range (e.g., tapping 3:17 when a note exists on 3:16–18), the header shows the full range "John 3:16–18"
- [ ] Typing in the editor updates the character counter in real time
- [ ] Character counter is muted below 9,000, warning color at 9,000–9,999, red at 10,000
- [ ] Hard stop at 10,000 characters prevents further typing; pasting beyond the limit truncates
- [ ] Autosave fires 2 seconds after the user stops typing
- [ ] Save status indicator cycles: "Unsaved changes" → "Saving…" → "Saved"
- [ ] First save creates a note in `localStorage['bible:notes']`; subsequent saves update the same record (preserving id and createdAt)
- [ ] Closing the sub-view with unsaved changes forces an immediate save before close
- [ ] Reloading the page shows the saved note body when reopening the editor for the same verse
- [ ] Opening the editor on a verse inside an existing range loads the existing note body
- [ ] Tab key inserts a tab character instead of moving focus
- [ ] Shift-Tab removes a tab character
- [ ] Cmd/Ctrl+S triggers an immediate save
- [ ] Escape saves and closes the sub-view
- [ ] Tapping the trash icon opens the inline delete confirm prompt ("Delete this note?" with Delete and Cancel)
- [ ] Confirming delete removes the note, pops the sub-view, shows "Note deleted" toast with Undo (5-second TTL)
- [ ] Undo within 5 seconds restores the note with the same id and createdAt
- [ ] Verses with notes render the note marker (pencil/document icon) in the verse number area
- [ ] The note marker coexists with bookmark markers and highlight backgrounds without visual collision
- [ ] Layout with both markers: bookmark left of number, note right of number, verse text follows
- [ ] Screen readers announce "has a note" on verses with notes; "bookmarked, has a note" when both present
- [ ] The Note icon in the primary actions row shows filled state when the selection has a note, outline when it doesn't
- [ ] For multi-verse selections, the Note icon is filled if any verse in the range has a note
- [ ] Reference parser correctly matches: "John 3:16", "1 Corinthians 13:4-7", "Rom 8:28", "Philippians 4:6–7", "Psalm 23", "1 John 4:8", "2 Timothy 3:16"
- [ ] Reference parser ignores: "Genesis chapter 1 verse 1" (prose), references split across line breaks, "3:16pm", "at 3:16 p.m."
- [ ] In display mode, matched references render as buttons with underline and accent color
- [ ] Tapping a parsed reference shows "Jump-to-reference ships with deep linking" toast (or real navigation if BB-38 has shipped)
- [ ] QuotaExceededError shows the shared storage-full toast without crashing; status shows "Couldn't save — storage full"
- [ ] `store.ts` unit tests cover: create, read, upsert-existing, update body, delete, restore, subscribe, QuotaExceededError handling
- [ ] `referenceParser.ts` unit tests cover: all supported patterns and at least five negative cases
- [ ] All tap targets are at least 44px
- [ ] Zero raw hex values in new code
- [ ] Reduced motion respected on sub-view transitions
- [ ] Textarea `aria-label` set to "Note for [verse reference]"
- [ ] Character count announced via `aria-live="polite"` only when approaching the limit (9,000+)
- [ ] Save status announced via `aria-live="polite"`
- [ ] Delete confirmation has proper focus management
- [ ] `useAutosave` hook is generic and reusable (not coupled to notes)
