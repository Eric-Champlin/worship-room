# BB-10b: Pray Persistence Completion

**Master Plan Reference:** N/A — completion spec for BB-10 (Pray bridge)
**Depends on:** BB-10 (Pray bridge), Daily Hub Pray tab
**Hands off to:** BB-14 (My Bible activity feed), BB-46 (verse echoes)

---

## Overview

When a user reads a Bible verse that moves them and taps "Pray about this," the prayer they write should remember which verse inspired it. BB-10 built the bridge that carries the verse context to the Pray tab, but the save path drops it. This spec closes that gap so that verse-attached prayers can surface in the My Bible activity feed (BB-14) and future verse echo features (BB-46).

## User Story

As a **logged-in user**, I want my prayer to remember which Bible verse inspired it so that I can see my verse-connected prayers in my Bible activity feed.

## Requirements

### Functional Requirements

1. The prayer record type gains an optional `verseContext` field:
   ```
   verseContext?: {
     book: string;          // slug, e.g. "john"
     chapter: number;
     startVerse: number;
     endVerse: number;
     reference: string;     // pre-formatted, e.g. "John 3:16" or "John 3:16-18"
   }
   ```
2. When a user submits a prayer while the Verse Prompt Card is visible (verse context is active), the saved prayer record includes the `verseContext` field populated from the active state.
3. When a user submits a prayer after dismissing the Verse Prompt Card (via X), the saved prayer record does NOT include a `verseContext` field.
4. When a user submits a prayer via direct navigation to `/daily?tab=pray` (no verse params), the saved prayer record does NOT include a `verseContext` field.
5. The `reference` field uses the existing `formatReference` helper (from `verseActionRegistry.ts` or its actual location) — no duplicate formatting logic.
6. Multi-verse selections (e.g. John 3:16-18) save with correct `startVerse` and `endVerse` values.
7. Existing prayer records in localStorage without the `verseContext` field continue to deserialize and render correctly — no migration needed.
8. The localStorage serialization round-trips records with and without `verseContext` correctly.

### Non-Functional Requirements

- Performance: No measurable impact — this adds one optional field to an existing save operation.
- Accessibility: N/A — no UI changes.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Submit prayer with verse context | Auth modal shown (existing behavior — unchanged by this spec) | Prayer saved with `verseContext` field attached | Existing auth modal message (unchanged) |

No new auth gates. The Pray tab's existing auth gating applies unchanged. This spec only modifies what data is included in the save payload for already-authenticated submissions.

## Responsive Behavior

N/A — no UI changes. This spec modifies data persistence only.

## AI Safety Considerations

N/A — this spec does not introduce any new user input surface or AI-generated content. The Pray tab's existing crisis detection and content handling remain unchanged.

## Auth & Persistence

- **Logged-out (demo mode):** No change. Logged-out users cannot submit prayers (existing auth gate). Zero persistence rule unaffected.
- **Logged-in:** Prayer records are saved to the existing Pray tab localStorage store (the plan phase must identify the exact key — likely managed through a store/hook). The only change is that the saved record may now include the optional `verseContext` field.
- **localStorage usage:** No new keys. The existing prayer store key gains records that may contain the `verseContext` field. The field is optional, so existing records without it are unaffected.

## Completion & Navigation

N/A — no changes to completion tracking or navigation. The Pray tab's existing completion signals remain unchanged.

## Design Notes

N/A — no visual changes. Zero raw hex values. No new components, no modified components, no changed styles.

## Out of Scope

- Bridge URL schema changes (BB-10 owns this — working correctly)
- Preload hook changes (BB-10 owns this — working correctly)
- Verse Prompt Card changes (BB-10 owns this — working correctly)
- Pray tab composer UX (text input, submit flow, ambient pill, drafts — all unchanged)
- Prayer rendering UI (existing display works with or without `verseContext`)
- Migration of existing prayers (old records stay as-is)
- My Bible integration (BB-14 reads from the store; prayers with `verseContext` will appear automatically)
- New types files (extend existing prayer record type)
- Bridge flow tests (BB-10's responsibility)
- Journal persistence (BB-11b handles this separately)
- Meditation persistence (already works correctly per BB-14 audit)
- Pray store refactoring (if the existing code is messy, leave it messy)

## Acceptance Criteria

- [ ] Submitting a prayer with the Verse Prompt Card visible saves a record containing `verseContext` with `book`, `chapter`, `startVerse`, `endVerse`, and `reference`
- [ ] The `reference` field is pre-formatted using the existing `formatReference` helper — no duplicate formatting logic
- [ ] Submitting a prayer after dismissing the Verse Prompt Card (via X) saves a record without `verseContext`
- [ ] Submitting a prayer via direct navigation to `/daily?tab=pray` (no verse params) saves a record without `verseContext`
- [ ] Existing prayer records in localStorage without `verseContext` continue to render correctly
- [ ] The prayer record TypeScript type includes the optional `verseContext` field
- [ ] The `verseContext` field shape matches BB-10's spec exactly: `{ book: string, chapter: number, startVerse: number, endVerse: number, reference: string }`
- [ ] Multi-verse prayers (e.g. John 3:16-18) save with correct `startVerse` and `endVerse`
- [ ] localStorage serialization round-trips records with and without `verseContext`
- [ ] After this spec ships, submitting a prayer via the bridge results in a prayer card appearing in the BB-14 activity feed
- [ ] No existing Pray tab tests break
- [ ] Zero raw hex values introduced

## Notes for Plan Phase

- **This is a pure plumbing spec.** The diff should be tiny — likely a TypeScript type update and a save handler change. If the plan produces more than ~3 files of changes, audit for scope creep.
- **Read existing Pray tab code before planning.** The plan must locate: (1) where verse context state lives, (2) where the prayer save is triggered, (3) the current save shape and owning file.
- **Do not refactor the Pray store.** Add the field, ship the spec, move on.
- **Simplest possible implementation.** Read verse context state at submit, spread into save payload if present, done.
