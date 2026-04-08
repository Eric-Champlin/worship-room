# BB-11: Daily Hub Bridge — Journal

**Branch:** `bible-redesign`
**Depends on:** BB-10 (shared URL schema, `verseContext.ts`, `buildDailyHubVerseUrl.ts`, `useVerseContextPreload.ts`, `VersePromptCard` pattern, `closeSheet` on ActionContext)
**Hands off to:** BB-12 (Meditate bridge, same pattern)

---

## Overview

When a user reads a verse in the Bible reader and feels something stir — a question, a memory, a half-formed thought — they should be able to journal about it without losing that moment. BB-11 connects the Bible reader's "Journal about this" action to the Daily Hub Journal tab, pre-loading the selected verse as a prompt card so the user can write with the verse right in front of them. The bridge turns "I just read something meaningful" into "I want to think on paper about this."

BB-10 established all the shared infrastructure (URL schema, verse context parsing, hydration, preload hook, prompt card component, `closeSheet` method). BB-11 reuses everything and points it at the Journal tab with a journaling-specific framing line.

## User Story

As a **logged-in user** reading a Bible passage, I want to tap "Journal about this" on a verse so that I can write a reflection with the verse text right in front of me, without losing what I was reading.

## Requirements

### Functional Requirements

1. Tapping "Journal about this" in the verse action sheet closes the sheet and navigates to `/daily?tab=journal&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
2. The Journal tab renders a `VersePromptCard` (shared with BB-10's Pray tab) above the journal composer showing the verse reference, full verse text, and the journaling framing line: **"What comes up as you sit with this?"**
3. The framing line comes from a shared `VERSE_FRAMINGS` lookup (or equivalent single source of truth) so all three bridges (Pray, Journal, Meditate) stay consistent and tunable in one place
4. The composer input is empty — the verse is the prompt, not pre-filled content
5. URL query params are cleared via `router.replace` after the preload hook consumes them
6. Multi-verse selections (e.g. Psalm 23:1-4) render all verses in the prompt card with correct numbering
7. Tapping the X on the prompt card removes it without affecting any draft text in the composer
8. Submitting a journal entry with the prompt card present saves with an optional `verseContext` field (same shape as BB-10): `{ book, chapter, startVerse, endVerse, reference }`
9. Submitting after removing the prompt card saves without a `verseContext` field
10. Existing journal entries without `verseContext` continue to render correctly
11. The registry handler for `journal` replaces the BB-6 stub with a real handler mirroring BB-10's pray handler pattern
12. Invalid verse params cause silent graceful degradation — no error toast, normal Journal tab loads
13. Refreshing the page after params have been cleared does not re-trigger the preload

### Non-Functional Requirements

- **Reuse:** Zero new URL parsing, verse context loading, or prompt card logic — everything comes from BB-10's modules
- **Accessibility:** Prompt card Remove button has `aria-label="Remove verse prompt"` and 44px minimum tap target; reduced motion respected on any fade-in
- **Performance:** No additional network requests; verse text arrives via URL params and is hydrated client-side by the existing `useVerseContextPreload` hook

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Navigate via "Journal about this" | URL params arrive; Journal tab loads; verse prompt card renders above composer; user can type but cannot save | Full flow: verse prompt card + composer + save with `verseContext` | N/A — no separate auth gate for prompt card display |
| Save journal entry | Auth modal triggers (existing Journal tab behavior) | Entry saves with optional `verseContext` attached | "Sign in to save your journal entry" (existing) |
| Dismiss verse prompt card (X) | Works — removes card from UI state | Works — removes card from UI state | N/A |

The bridge navigation itself is not auth-gated. Logged-out users can arrive at the Journal tab with verse params and see the prompt card. The existing auth gate on journal entry saving handles the conversion moment.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse prompt card renders full-width above the journal textarea; long verses wrap naturally; X button is a 44px tap target in the top-right corner |
| Tablet (640-1024px) | Same as mobile — single-column layout, prompt card above composer |
| Desktop (> 1024px) | Same layout within the `max-w-2xl` container of the Journal tab |

The prompt card inherits the existing `VersePromptCard` responsive behavior from BB-10. No breakpoint-specific changes needed for BB-11.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content. The verse text comes from the WEB Bible data (already in the app) and the user writes their own journal entry. The existing Journal tab crisis keyword detection on textarea input continues to apply unchanged.

## Auth & Persistence

- **Logged-out users:** Can see the verse prompt card and type in the composer, but cannot save. Draft auto-saves to `wr_journal_draft` localStorage per existing behavior. Zero server-side persistence.
- **Logged-in users:** Journal entry saves to the existing journal store with an optional `verseContext` field attached when the prompt card is present at save time.
- **localStorage usage:** No new keys. Uses existing `wr_journal_draft` for draft persistence. The `verseContext` field is part of the journal entry save record, not a separate key.
- **Route type:** Public (Daily Hub is accessible to all users; auth gates are on actions, not navigation)

## Completion & Navigation

- **Completion tracking:** Uses existing `markJournalComplete()` — no change needed. Saving a journal entry (with or without verse context) fires the same completion signal.
- **CTAs after completion:** Existing Journal tab post-save CTAs remain unchanged.
- **Context coexistence:** If the user arrives with both a devotional context (from the Devotional tab's "Journal about this question" CTA) AND a verse context (from the Bible reader bridge), the verse context takes precedence since it was the most recent navigation. The devotional context flow uses `prayContext` state in `DailyHub.tsx`; the verse context flow uses URL params consumed by `useVerseContextPreload`. These are independent mechanisms. The plan phase should verify they don't conflict visually (e.g., both `DevotionalPreviewPanel` and `VersePromptCard` rendering simultaneously).

## Design Notes

- The `VersePromptCard` component from BB-10 is shared, not forked. If BB-10 hardcoded the Pray framing line, BB-11 parameterizes it to accept the framing as a prop (small refactor, BB-11 deliverable).
- The prompt card uses the existing `FrostedCard` tier system — likely Tier 2 (scripture callout with left border accent) to match how scripture is presented elsewhere on the Daily Hub.
- Body text in the prompt card follows the Daily Hub readability standard: `text-white`, design tokens only, zero raw hex values.
- The journaling framing line ("What comes up as you sit with this?") is intentionally quieter and more observational than the Pray framing — journaling is about noticing, not directing.
- The prompt card sits within the existing Journal tab's `mx-auto max-w-2xl px-4 py-10 sm:py-14` wrapper and inherits the transparent background over HorizonGlow.

## Out of Scope

- **No changes to the Journal tab's composer UX** — text input, draft persistence, submit flow, mode toggle, animations all stay as they are
- **No new URL schema** — same params as BB-10
- **No new navigation mechanics** — same as BB-10
- **No Meditate bridge** — BB-12
- **No "journal entries connected to verses" dashboard or feed** — BB-14 might surface this later
- **No multi-step journal prompts** — no "What would you tell a friend about this?" templates
- **No AI-generated reflections** — the user writes in their own voice
- **No re-implementation of any BB-10 utility** — if you find yourself writing a new URL parser, preload hook, or prompt card, stop and use BB-10's
- **No haptics, analytics, or BB-38 integration**

## Acceptance Criteria

- [ ] Tapping "Journal about this" in the action sheet closes the sheet and navigates to `/daily?tab=journal&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- [ ] Daily Hub loads with the Journal tab active
- [ ] The Journal tab shows a `VersePromptCard` above the composer with the verse reference, full verse text, and the framing line "What comes up as you sit with this?"
- [ ] The composer textarea is empty — the verse is the prompt, not pre-filled content
- [ ] The query params are cleared via `router.replace` after preload, leaving `/daily?tab=journal`
- [ ] Multi-verse selections (e.g. Psalm 23:1-4) render all verses in the prompt card with correct verse numbering
- [ ] Tapping the X on the verse prompt card removes it without affecting any draft text in the composer
- [ ] Submitting a journal entry with the prompt card present saves with a `verseContext` field containing `{ book, chapter, startVerse, endVerse, reference }`
- [ ] Submitting after removing the prompt card saves without a `verseContext` field
- [ ] Arriving at `/daily?tab=journal` without verse params loads the Journal tab normally with no prompt card
- [ ] Invalid verse params cause silent graceful degradation (no error toast, normal Journal tab loads)
- [ ] Refreshing the page after params have been cleared does not re-trigger the preload
- [ ] Existing Journal tab draft persistence continues to work — drafts survive the bridge flow
- [ ] Browser back button from Journal tab returns to the Bible reader correctly
- [ ] The `VERSE_FRAMINGS` lookup (or equivalent) is the single source of truth for framing lines across Pray, Journal, and Meditate bridges
- [ ] The `VersePromptCard` component is shared between Pray and Journal tabs — not forked
- [ ] The Pray tab from BB-10 continues to work correctly after any refactor to parameterize the framing line
- [ ] `buildDailyHubVerseUrl('journal', selection)` produces a correctly-encoded URL
- [ ] The registry handler correctly invokes `ctx.closeSheet()` before navigation
- [ ] Existing journal entries without `verseContext` continue to render correctly
- [ ] The verse prompt card uses design tokens — zero raw hex values
- [ ] The Remove X button has `aria-label="Remove verse prompt"` and minimum 44px tap target
- [ ] Long verses wrap naturally in the prompt card without truncation
- [ ] Reduced motion respected on any prompt card fade-in animation
- [ ] Zero new URL parsing or verse context loading logic — everything comes from BB-10's modules
- [ ] Logged-out user can see the verse prompt card and type (but not save) — existing auth gate handles save
- [ ] Verse prompt card and existing `DevotionalPreviewPanel` do not render simultaneously in a conflicting way
