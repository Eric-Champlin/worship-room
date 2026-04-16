# BB-10: Daily Hub Bridge — Pray

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (verse spans + WEB data), BB-6 (action sheet + registry), Daily Hub Pray tab (already shipped)
**Hands off to:** BB-11 (Journal bridge, same pattern), BB-12 (Meditate bridge, same pattern)

---

## Overview

When a user reads a verse and feels moved to pray, the distance between reading and praying should be zero. BB-10 makes the "Pray about this" action in the verse action sheet a real bridge: tapping it closes the sheet, navigates to the Daily Hub Pray tab, and pre-loads the selected verse as the prayer prompt. The user lands in Pray with the verse reference, full text, and a gentle framing — everything they need to start writing their own prayer, not an empty form they have to fill in themselves.

This is the first of three structurally identical bridges (BB-10 Pray, BB-11 Journal, BB-12 Meditate). BB-10 establishes the shared plumbing — URL schema, verse context loader, pre-load hook — that BB-11 and BB-12 inherit.

## User Stories

As a **logged-in user** reading the Bible, I want to tap "Pray about this" on a verse and land in the Pray tab with that verse pre-loaded so that I can immediately write a prayer grounded in what I just read.

As a **logged-in user** selecting a range of verses (e.g., John 3:16–18), I want all selected verses to appear in the prayer prompt card so that I can pray about the full passage.

As a **logged-out visitor** reading the Bible, I want the "Pray about this" action to navigate me to the Pray tab with the verse context so that I can type a prayer (auth gating applies at submit, not at navigation).

## Requirements

### URL Schema (Shared with BB-11, BB-12)

1. The Bible reader navigates to Daily Hub via: `/daily?tab={pray|journal|meditate}&verseBook={slug}&verseChapter={n}&verseStart={n}&verseEnd={n}&src=bible`
2. `verseBook` uses the book slug from `bookMetadata.ts` (e.g., `john`, `1corinthians`)
3. `verseChapter` is a positive integer within the book's chapter count
4. `verseStart` and `verseEnd` are positive integers with `verseEnd >= verseStart`; equal for single-verse selections
5. `src` is always `bible` for the BB-10/11/12 bridges (reserved for future bridge sources)
6. Query params are chosen over hash fragments or in-memory state for deep-linkability, refresh safety, and shareability

### URL Validation

7. Invalid params (unknown book slug, out-of-range chapter, `verseEnd < verseStart`, malformed numbers) cause the pre-load to silently fail — the Pray tab loads empty as it would without params
8. No error toast on validation failure — silent graceful degradation

### Verse Context Loader (Shared Utility)

9. A shared utility at `src/lib/dailyHub/verseContext.ts` provides:
   - `parseVerseContextFromUrl(searchParams)` — synchronous, validates params, returns a partial context (no verse text) or `null`
   - `hydrateVerseContext(partial)` — async, loads verse text from WEB JSON via the existing chapter loader, returns full context or `null` on failure
   - `formatReference(ctx)` — formats display references: "John 3:16" for single verse, "John 3:16–18" for ranges, handles numbered books ("1 Corinthians") and multi-word books ("Song of Solomon")
10. The `VerseContext` type includes: `book`, `chapter`, `startVerse`, `endVerse`, `verses` (array of `{ number, text }`), `reference` (pre-formatted string), `source` (`'bible'`)

### URL Builder (Shared Helper)

11. A shared helper at `src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` produces the fully-formed URL from a tab name and verse selection
12. BB-11 and BB-12 reuse this helper with different tab values

### Pre-Load Hook

13. A hook at `src/hooks/dailyHub/useVerseContextPreload.ts` runs on mount in the Pray tab, reads verse query params, hydrates the verse context, and passes it to the tab's state
14. After successful pre-load, the hook clears the verse-related query params from the URL via `router.replace` (not `push`) to avoid adding a history entry — the URL cleans up to `/daily?tab=pray`
15. If hydration fails (missing chapter JSON, network error), the Pray tab silently falls back to its empty state
16. During hydration, a subtle skeleton placeholder appears where the verse prompt card will render

### Registry Handler

17. The `pray` stub from BB-6 is replaced with a real handler that builds the URL via `buildDailyHubVerseUrl('pray', selection)`, calls `ctx.closeSheet()`, and navigates via `router.push(url)`
18. If `closeSheet` does not exist on `ActionContext` from BB-6, it is added alongside the existing context methods (`showToast`, `keepSheetOpen`, `pushSubView`)

### Verse Prompt Card

19. A new component `VersePromptCard` renders above the composer input showing:
    - The verse reference in the Pray tab's existing heading style
    - The full verse text (no truncation — every word is visible for prayer context)
    - A gentle framing line: "What do you want to say to God about this?" in muted text
    - A Remove (X) button in the top-right corner
20. The composer input itself is NOT pre-populated with text — the verse is the prompt, not the content
21. Multi-verse selections show all verses with verse numbers
22. Long verses and large ranges wrap naturally without truncation
23. The card uses the Pray tab's existing visual language (FrostedCard tier, colors, spacing) — no new design patterns introduced

### Save Integration

24. The prayer save shape gains an optional `verseContext` field: `{ book, chapter, startVerse, endVerse, reference }`
25. Present when the verse prompt card is showing at submit time; omitted when the user has removed the card or arrived without verse params
26. Existing prayers without a `verseContext` field continue to render correctly — the field is purely additive

### Draft Handling

27. If a user arrives with verse context and there is already a draft in the composer, the verse prompt card appears in addition to the draft — it does not overwrite the draft text
28. Removing the verse prompt card via the X button does not affect the draft text

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap "Pray about this" in action sheet | Navigates to `/daily?tab=pray&...` with verse context (no gate on navigation) | Same — navigates with verse context | N/A |
| View verse prompt card on Pray tab | Card renders with verse text and framing | Same | N/A |
| Remove verse prompt card (X button) | Card is removed | Same | N/A |
| Type in the prayer composer | Can type freely; draft auto-saves to localStorage | Same | N/A |
| Submit prayer ("Help Me Pray") | Auth modal: "Sign in to generate a prayer" (existing behavior) | Prayer saves with `verseContext` if prompt card is present | "Sign in to generate a prayer" |

The bridge navigation itself is not auth-gated. The existing Pray tab auth gating on the submit action applies unchanged.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse prompt card full-width with `px-4` padding; X button 44px tap target; verse text wraps naturally |
| Tablet (640–1024px) | Same as mobile with slightly more horizontal padding from the `max-w-2xl` container |
| Desktop (> 1024px) | Verse prompt card within the existing `max-w-2xl` Pray tab container; comfortable reading width |

The verse prompt card stacks vertically above the textarea at all breakpoints. No horizontal layout changes between breakpoints — the card is always full-width within its container.

## AI Safety Considerations

N/A for the bridge plumbing itself. The existing Pray tab already has crisis keyword detection on the textarea input — BB-10 does not change the textarea or the crisis detection flow. The verse prompt card displays read-only scripture text (WEB Bible data), which does not require content filtering.

## Auth & Persistence

- **Logged-out (demo mode):** Can navigate to Pray tab with verse context, view the prompt card, and type in the composer. Draft auto-saves to `wr_prayer_draft` localStorage. Cannot submit (existing auth gate).
- **Logged-in:** Full flow — navigate, view prompt card, type, submit. Prayer saves with optional `verseContext` field.
- **Route type:** Public (the `/daily` route is public; auth gating is at the action level)
- **localStorage keys used:** `wr_prayer_draft` (existing — no new keys introduced)

## Completion & Navigation

BB-10 does not change Daily Hub completion tracking. The existing Pray tab calls `markPrayComplete()` on prayer submission — that behavior is unchanged. The verse prompt card is prompt-level context, not a completion event.

After submitting a prayer with verse context, the existing Pray tab post-submit UI applies (action buttons, "Journal about this" CTA, etc.). No new post-submit behavior is added.

## Design Notes

- The `VersePromptCard` uses the same FrostedCard treatment as the Pray tab's existing cards — `bg-white/[0.04]` with a subtle border, matching the Tier 2 scripture callout pattern from `09-design-system.md` (left border accent at `border-l-primary/60`)
- Verse reference text uses `font-serif` (Lora) consistent with scripture rendering elsewhere
- Framing line ("What do you want to say to God about this?") uses `text-white/60 text-sm` — muted, not competing with the verse text
- The Remove X button uses the same icon/sizing pattern as the verse banner X on the Meditate tab (Spec Z) — `min-w-[44px] min-h-[44px]` touch target, `text-white/50 hover:text-white/80` transition
- Card fade-in respects `prefers-reduced-motion` — instant display when reduced motion is preferred
- Zero raw hex values — all colors reference design tokens or Tailwind classes
- The card sits between any `DevotionalPreviewPanel` (if present from devotional context) and the textarea, maintaining the existing vertical stack order
- Design system recon at `_plans/recon/design-system.md` is available for exact CSS value reference during planning

## Out of Scope

- **Journal bridge** — BB-11 (reuses the shared plumbing from this spec)
- **Meditate bridge** — BB-12 (same)
- **Prayer history by verse** ("3 prayers about John 3:16") — future feature (BB-14 or later); BB-10 only saves the `verseContext` field
- **Verse echo notifications** ("you prayed about this verse 12 days ago") — BB-46; depends on the `verseContext` field shape established here
- **AI-generated prayers** — explicitly excluded. Prayer is the user's own words to God. The product holds the space, not fills it.
- **Prayer templates** — the framing line is gentle context, not a template
- **Aggregation UI** ("5 people prayed about this verse") — no accounts, no aggregation
- **Haptic feedback** on mobile
- **Analytics on bridge usage**
- **Changes to the Pray tab's composer UX** — textarea, draft persistence, submit flow, ambient pill, animations all unchanged
- **Changes to Daily Hub tab routing** — BB-10 uses the existing `?tab=` mechanism
- **BB-38 deep-link integration** — the URL schema is already deep-linkable on its own

## Acceptance Criteria

- [ ] Tapping "Pray about this" in the action sheet closes the sheet and navigates to `/daily?tab=pray&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- [ ] Daily Hub loads with the Pray tab active
- [ ] The Pray tab's composer shows a verse prompt card above the input with the verse reference, full verse text, and gentle framing line ("What do you want to say to God about this?")
- [ ] The composer input itself is empty — the verse is the prompt, not the content
- [ ] The query params are cleared from the URL via `router.replace` after pre-load, leaving `/daily?tab=pray`
- [ ] Multi-verse selections (e.g., John 3:16–18) show all verses in the prompt card with correct verse numbers
- [ ] Tapping the X on the verse prompt card removes it without affecting any draft text in the composer
- [ ] Submitting a prayer with the verse prompt card present saves the prayer with a `verseContext` field containing `book`, `chapter`, `startVerse`, `endVerse`, and `reference`
- [ ] Submitting a prayer after removing the prompt card saves the prayer without a `verseContext` field
- [ ] Arriving at `/daily?tab=pray` without verse params loads the Pray tab normally with no prompt card
- [ ] Invalid verse params (unknown book slug, out-of-range chapter, `verseEnd < verseStart`, malformed numbers) cause the pre-load to silently fail and the Pray tab to load empty
- [ ] Refreshing the page after the params have been cleared does not re-trigger the pre-load
- [ ] The existing Pray tab draft persistence continues to work — drafts survive across the bridge flow
- [ ] Navigating back from Daily Hub to the Bible reader via browser back works correctly
- [ ] `parseVerseContextFromUrl` unit tests cover: valid single verse, valid range, invalid book, invalid chapter, invalid verse range (end < start), missing params
- [ ] `hydrateVerseContext` unit tests cover: successful hydration, failed chapter load, verse numbers out of range
- [ ] `formatReference` unit tests cover: single verse ("John 3:16"), range ("John 3:16–18"), numbered books ("1 Corinthians 13:4"), multi-word books ("Song of Solomon 2:1")
- [ ] `buildDailyHubVerseUrl` produces correctly-encoded URLs for all three tab variants (pray, journal, meditate)
- [ ] The verse prompt card uses design tokens — zero raw hex values
- [ ] The verse prompt card's Remove X button has `aria-label="Remove verse prompt"` and a minimum 44px tap target
- [ ] Long verses wrap naturally in the prompt card without truncation
- [ ] Verse prompt card fade-in respects `prefers-reduced-motion`
- [ ] The `verseContext` field on the prayer save is optional — existing prayers without the field render correctly
- [ ] The `closeSheet` method exists on `ActionContext` and is callable from registry handlers
- [ ] Logged-out users can navigate to the Pray tab with verse context, see the prompt card, and type (auth gate only on submit)
- [ ] A user arriving with verse context and an existing draft sees both the prompt card and their draft text preserved
