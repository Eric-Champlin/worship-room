# BB-11: Daily Hub Bridge -- Journal

**Master Plan Reference:** N/A -- standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-10 (URL schema, `verseContext.ts`, `buildDailyHubVerseUrl.ts`, `useVerseContextPreload.ts`, `VersePromptCard`, `closeSheet` on ActionContext), Daily Hub Journal tab (already shipped)
**Hands off to:** BB-12 (Meditate bridge, same pattern)

---

## Overview

When a user reads a verse and something stirs -- a question, a memory, something they want to hold onto -- the distance between reading and reflecting should be zero. BB-11 makes the "Journal about this" action in the verse action sheet a real bridge: tapping it closes the sheet, navigates to the Daily Hub Journal tab, and pre-loads the selected verse as the journal prompt. The user lands in Journal with the verse reference, full text, and a gentle framing that invites reflection -- everything they need to start writing, not an empty form.

This is the second of three structurally identical bridges (BB-10 Pray, BB-11 Journal, BB-12 Meditate). BB-10 established the shared plumbing. BB-11 reuses all of it, changing only the tab target, the framing line, and the integration points on the Journal tab side.

## User Stories

As a **logged-in user** reading the Bible, I want to tap "Journal about this" on a verse and land in the Journal tab with that verse pre-loaded so that I can immediately write a reflection grounded in what I just read.

As a **logged-in user** selecting a range of verses (e.g., Psalm 23:1--4), I want all selected verses to appear in the journal prompt card so that I can reflect on the full passage.

As a **logged-out visitor** reading the Bible, I want the "Journal about this" action to navigate me to the Journal tab with the verse context so that I can start writing (auth gating applies at save, not at navigation).

## Requirements

### Reused from BB-10 (no changes)

1. URL schema: `/daily?tab=journal&verseBook={slug}&verseChapter={n}&verseStart={n}&verseEnd={n}&src=bible`
2. `parseVerseContextFromUrl` and `hydrateVerseContext` from `verseContext.ts` -- unchanged
3. `formatReference` -- unchanged
4. `buildDailyHubVerseUrl('journal', selection)` -- already parameterized, no changes needed

### Registry Handler (replace stub)

5. The `journal` handler in `verseActionRegistry.ts` currently has an empty `onInvoke: () => {}`. Replace it with a real handler that calls `buildDailyHubVerseUrl('journal', selection)`, invokes `ctx.closeSheet({ navigating: true })`, and navigates via `ctx.navigate(url)` -- mirroring the `pray` handler pattern
6. The handler's existing `label`, `sublabel`, `icon`, and `category` remain unchanged

### useVerseContextPreload Parameterization

7. The hook currently hardcodes `if (tab !== 'pray') return` on line 17. Parameterize it to accept a `tab` argument so the Journal tab (and later Meditate tab) can reuse the same hook
8. The hook should accept a `tab` parameter: `useVerseContextPreload(tab: string)` -- the Pray tab passes `'pray'`, the Journal tab passes `'journal'`
9. After successful hydration, the URL cleans up to `/daily?tab=journal` (matching the tab passed in)

### VersePromptCard Parameterization

10. The card currently hardcodes the framing line "What do you want to say to God about this?" on line 49. Add a `framingLine` prop to make it parameterizable
11. The Pray tab continues to pass `"What do you want to say to God about this?"`
12. The Journal tab passes `"What comes up as you sit with this?"`
13. A shared `VERSE_FRAMINGS` constant centralizes the framing lines for all three bridges so they can be tuned in one place

### Journal Tab Integration

14. The Journal tab's root component (`JournalTabContent`) calls `useVerseContextPreload('journal')` on mount
15. When the hook returns a hydrated `VerseContext`, the Journal tab renders `<VersePromptCard>` above the composer input with the journal-specific framing line
16. During hydration, `<VersePromptSkeleton>` shows where the card will appear
17. The composer input itself is NOT pre-populated with text -- the verse is the prompt, not the content
18. If a draft exists in localStorage when the user arrives via the bridge, the prompt card appears **in addition** to the draft text, not instead of it
19. Tapping the X "Remove" button on the prompt card clears the verse context from component state without affecting any draft text in the composer
20. Multi-verse selections render all verses in the prompt card with correct verse numbering

### Save Integration

21. The `SavedJournalEntry` type gains an optional `verseContext` field with shape: `{ book, chapter, startVerse, endVerse, reference }`
22. When the verse prompt card is showing at submit time, the save payload includes the `verseContext` field
23. When the user has removed the prompt card (or arrived without verse params), the save payload omits the `verseContext` field
24. Existing journal entries without the `verseContext` field continue to render correctly -- no migration needed

### Validation & Graceful Degradation

25. Invalid verse params (unknown book slug, out-of-range chapter/verse, malformed numbers) cause the pre-load to silently fail -- the Journal tab loads empty as it would without params
26. No error toast on validation failure
27. Refreshing the page after params have been cleared does not re-trigger the preload
28. Browser back button from Journal tab returns to the Bible reader correctly

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap "Journal about this" in action sheet | Navigates to `/daily?tab=journal` with verse params -- can view prompt card and type | Navigates and types normally | N/A |
| Submit journal entry | Auth modal appears: "Sign in to save your journal entry" | Entry saves with optional `verseContext` | "Sign in to save your journal entry" |
| Dismiss verse prompt card (X button) | Works -- UI-only interaction | Works | N/A |

Auth gating on submit is inherited from the existing Journal tab -- BB-11 does not change it. Navigation and prompt card rendering work for all users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse prompt card is full-width above the composer. Reference text wraps naturally. X button has 44px tap target. |
| Tablet (640-1024px) | Same layout, slightly more horizontal space for verse text. |
| Desktop (> 1024px) | Same layout. Prompt card respects `max-w-2xl` if the Journal tab uses it. |

The verse prompt card inherits the Journal tab's existing responsive behavior. No breakpoint-specific layout changes are introduced by BB-11.

## AI Safety Considerations

N/A -- BB-11 does not introduce new user text input or AI-generated content. The Journal tab's existing crisis detection on submit (if any) continues to apply unchanged.

## Auth & Persistence

- **Logged-out users:** Can navigate to Journal tab with verse context, see the prompt card, type in the composer. Zero data persistence -- draft auto-save to localStorage works as before (existing Journal tab behavior), but submitting triggers the auth modal.
- **Logged-in users:** Journal entry saves with optional `verseContext` field to existing journal storage.
- **localStorage usage:** No new keys. Uses existing `wr_journal_draft` for draft persistence. The `verseContext` field is attached to saved entries in the existing journal entry store.

## Completion & Navigation

- Journal tab completion tracking is unchanged -- saving a journal entry (with or without verse context) signals completion as it does today.
- After saving, the existing Journal tab post-save flow applies unchanged.
- The verse prompt card does not affect completion tracking -- it's a prompt, not a completeable action.

## Design Notes

- The `VersePromptCard` component from BB-10 is reused directly -- same frosted glass style (`bg-white/[0.04]`), same left border accent (`border-l-primary/60`), same typography. No new visual patterns.
- The Journal tab's existing design language (dark theme, white text, existing spacing) provides the context for the card. The card was designed to inherit from the tab context, not hardcode Pray-specific styling.
- The framing line uses `text-sm text-white/60` -- same muted treatment as BB-10's pray framing.
- The `VersePromptSkeleton` loading state from BB-10 is reused during hydration.

## Out of Scope

- No changes to the Journal tab's composer UX (text input, draft persistence, submit flow, animations)
- No new URL schema -- same as BB-10
- No new navigation mechanics -- same as BB-10
- No Meditate bridge -- BB-12
- No "journal entries connected to verses" dashboard or browsing surface -- potential future feature
- No multi-step journal prompts or AI-generated reflection questions
- No re-implementation of any BB-10 utility
- No haptics, analytics, or telemetry
- No backend API integration -- Phase 3

## Acceptance Criteria

- [ ] Tapping "Journal about this" in the action sheet closes the sheet and navigates to `/daily?tab=journal&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- [ ] Daily Hub loads with the Journal tab active
- [ ] The Journal tab shows a verse prompt card above the composer with the verse reference, full verse text, and the journaling framing line "What comes up as you sit with this?"
- [ ] The composer input itself is empty -- the verse is the prompt, not the content
- [ ] The query params are cleared via `router.replace` after preload, leaving `/daily?tab=journal`
- [ ] Multi-verse selections (e.g. Psalm 23:1--4) render all verses in the prompt card with correct numbering
- [ ] Tapping the X on the verse prompt card removes it without affecting any draft text in the composer
- [ ] Submitting a journal entry with the verse prompt card present saves with a `verseContext` field containing book, chapter, startVerse, endVerse, reference
- [ ] Submitting a journal entry after removing the prompt card saves without a `verseContext` field
- [ ] Arriving at `/daily?tab=journal` without verse params loads the Journal tab normally with no prompt card
- [ ] Invalid verse params cause silent graceful degradation (no error toast, empty Journal tab loads normally)
- [ ] Refreshing the page after params have been cleared does not re-trigger the preload
- [ ] Existing Journal tab draft persistence continues to work -- drafts survive the bridge flow
- [ ] Browser back button from Journal tab returns to the Bible reader correctly
- [ ] The `VERSE_FRAMINGS` lookup (or equivalent shared constant) is the single source of truth for the framing lines across all three bridges
- [ ] The `VersePromptCard` component is shared between Pray and Journal tabs via a `framingLine` prop, not forked
- [ ] The Pray tab from BB-10 continues to work correctly after the refactor to parameterize the framing line
- [ ] `buildDailyHubVerseUrl('journal', selection)` produces a correctly-encoded URL
- [ ] The registry handler correctly invokes `ctx.closeSheet({ navigating: true })` before navigation
- [ ] Existing journal entries in the store without `verseContext` continue to render correctly
- [ ] The verse prompt card uses design tokens only -- zero raw hex values
- [ ] The Remove X button has `aria-label="Remove verse prompt"` and min 44px tap target
- [ ] Long verses wrap naturally in the prompt card without truncation
- [ ] `useVerseContextPreload` is parameterized to accept a tab argument, used by both Pray (`'pray'`) and Journal (`'journal'`)
- [ ] Reduced motion is respected on prompt card fade-in animation
- [ ] Zero new URL parsing or verse context loading logic -- everything comes from BB-10's modules
- [ ] `VersePromptSkeleton` shows during hydration on the Journal tab
