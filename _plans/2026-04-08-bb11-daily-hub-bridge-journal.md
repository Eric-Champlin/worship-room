# Implementation Plan: BB-11 Daily Hub Bridge — Journal

**Spec:** `_specs/bb-11-daily-hub-bridge-journal.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Critical Finding: BB-10 Already Implemented BB-11

During reconnaissance, every functional requirement of BB-11 was found **already implemented** as part of BB-10's execution. BB-10's plan (Step 8 "Wire JournalTabContent") wired the Journal bridge alongside the Pray bridge. Specifically:

| BB-11 Requirement | Status | Evidence |
|---|---|---|
| Registry handler for `journal` | Done | `verseActionRegistry.ts:314-327` — full handler with `buildDailyHubVerseUrl('journal', selection)`, `closeSheet`, `navigate` |
| `useVerseContextPreload('journal')` in JournalTabContent | Done | `JournalTabContent.tsx:46` |
| `JournalVerseContext` type | Done | `types/daily-experience.ts:160-166` |
| `SavedJournalEntry.verseContext` optional field | Done | `types/daily-experience.ts:105` |
| `VERSE_FRAMINGS.journal` constant | Done | `constants/daily-experience.ts:69-73` — `'What comes up as you sit with this?'` |
| VersePromptCard rendering in Journal tab | Done | `JournalTabContent.tsx:295-303` — shared component with `framingLine={VERSE_FRAMINGS.journal}` |
| VersePromptSkeleton during hydration | Done | `JournalTabContent.tsx:296` |
| verseContext attached to saved entries | Done | `JournalTabContent.tsx:195` — `...(journalVerseContext && { verseContext: journalVerseContext })` |
| VersePromptCard parameterized (not hardcoded framing) | Done | `VersePromptCard.tsx:9` — `framingLine: string` prop |
| 8 Journal bridge tests | Done | `JournalTabContent.test.tsx:686-790` — covers render, no-params, X dismiss, skeleton, invalid params, save with/without context, draft preservation |

**The plan below consists of verification-only steps.** No new code needs to be written. The purpose is to systematically confirm every acceptance criterion is met and the feature is complete.

---

## Architecture Context

### Already-Built Infrastructure (all from BB-10)

- **Types:** `src/types/daily-experience.ts` — `VerseContextPartial`, `VerseContext`, `JournalVerseContext`, `SavedJournalEntry` (with optional `verseContext`)
- **Verse Context Utility:** `src/lib/dailyHub/verseContext.ts` — `parseVerseContextFromUrl`, `hydrateVerseContext`, `formatReference`
- **URL Builder:** `src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` — `buildDailyHubVerseUrl('journal', selection)` produces `/daily?tab=journal&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- **Pre-load Hook:** `src/hooks/dailyHub/useVerseContextPreload.ts` — reads URL params, hydrates verse text, cleans URL via `router.replace`, deduplicates via `lastConsumedKey` ref
- **VersePromptCard:** `src/components/daily/VersePromptCard.tsx` — Tier 2 scripture callout styling, X button with `aria-label="Remove verse prompt"` and 44px target, `useReducedMotion` for fade-in
- **Registry Handler:** `src/lib/bible/verseActionRegistry.ts:314-327` — `journal` handler calls `closeSheet({ navigating: true })` then `navigate(url)`
- **Constants:** `src/constants/daily-experience.ts` — `VERSE_FRAMINGS = { pray: '...', journal: 'What comes up as you sit with this?', meditate: '' }`

### Integration Points

- **JournalTabContent.tsx** — Already wired: imports `useVerseContextPreload`, `VersePromptCard`, `VersePromptSkeleton`, `VERSE_FRAMINGS`; maps `verseContext` → `journalVerseContext`; renders card above `JournalInput`; attaches context to saved entries
- **JournalInput.tsx** — No changes needed. The verse prompt card renders in the parent (`JournalTabContent`), not inside `JournalInput`. `DevotionalPreviewPanel` renders inside `JournalInput` only when `prayContext?.from === 'devotional'`. These are independent mechanisms with no visual conflict — navigating from the Bible reader resets DailyHub's `prayContext` state to `null`.

### Test Coverage (already exists)

File: `src/components/daily/__tests__/JournalTabContent.test.tsx` (lines 686-790):

| Test | Coverage |
|---|---|
| Renders VersePromptCard when verse params in URL | Framing line + reference + verse text |
| No card when no verse params | Clean state |
| Removing card via X does not affect draft | X dismiss + draft integrity |
| Skeleton shows during hydration | Loading state |
| Invalid params show no card | Graceful degradation |
| Saved entry includes verseContext when card showing | Save shape |
| Saved entry omits verseContext when card removed | Save shape without context |
| Existing draft preserved alongside verse prompt card | Draft + card coexistence |

---

## Auth Gating Checklist

| Action | Spec Requirement | Status | Auth Check Method |
|---|---|---|---|
| Navigate via "Journal about this" | Not auth-gated | Already works | N/A — public navigation |
| See verse prompt card | Not auth-gated | Already works | N/A — renders for all users |
| Dismiss verse prompt card (X) | Not auth-gated | Already works | N/A — UI state only |
| Save journal entry | Auth-gated | Already works | Existing `useAuth` + `useAuthModal` in JournalInput |

All auth gating is inherited from the existing Journal tab implementation. No new auth gates needed for BB-11.

---

## Design System Values (for UI steps)

N/A — No UI changes. The `VersePromptCard` component already uses correct design tokens:

| Component | Property | Value | Verified In |
|---|---|---|---|
| VersePromptCard | container | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4` | `VersePromptCard.tsx:18` |
| VersePromptCard | reference | `font-serif text-base font-semibold text-white sm:text-lg` | `VersePromptCard.tsx:32` |
| VersePromptCard | verse text | `text-[17px] leading-[1.75] text-white sm:text-lg` | `VersePromptCard.tsx:36` |
| VersePromptCard | framing line | `text-sm text-white/60` | `VersePromptCard.tsx:49` |
| VersePromptCard | X button | `min-h-[44px] min-w-[44px]` + `aria-label="Remove verse prompt"` | `VersePromptCard.tsx:24-29` |
| VersePromptCard | animation | `animate-fade-in` gated behind `useReducedMotion` | `VersePromptCard.tsx:13,19` |

---

## Design System Reminder

Not applicable — no UI implementation steps in this plan. All design patterns were applied during BB-10 execution.

---

## Shared Data Models (from BB-10)

```typescript
// Already exists in types/daily-experience.ts
interface JournalVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}

interface SavedJournalEntry {
  id: string
  content: string
  timestamp: string
  mode: JournalMode
  promptText?: string
  reflection?: string
  verseContext?: JournalVerseContext  // optional — present when saved with verse card
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|---|---|---|
| `wr_journal_draft` | Read | Existing draft restored alongside verse prompt card |
| `wr_journal_mode` | Read | Mode persists across bridge navigation |

No new localStorage keys introduced.

---

## Responsive Structure

N/A — No layout changes. The `VersePromptCard` inherits responsive behavior from BB-10. All breakpoints behave the same way: single-column full-width card above the textarea within the `max-w-2xl` container.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The verse prompt card is a block-level element above the textarea.

---

## Vertical Rhythm

N/A — no new sections. The `VersePromptCard` uses `mb-4` spacing to separate from the content below it (already set in BB-10).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-10 (Daily Hub Bridge — Pray) is complete and committed
- [x] All BB-11 acceptance criteria have been mapped to existing implementations
- [x] No new code needs to be written — verification only
- [x] All auth-gated actions from the spec are covered by existing Journal tab auth gates
- [x] Design system values verified from VersePromptCard source code
- [x] No deprecated patterns used
- [x] 8 existing tests cover the core scenarios
- [ ] Build + tests pass with current code
- [ ] Manual walkthrough of the full Bible reader → Journal bridge flow

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| DevotionalPreviewPanel + VersePromptCard coexistence | No conflict possible | These use independent mechanisms: `prayContext` (React state, reset on navigation away from DailyHub) vs URL params (consumed once by `useVerseContextPreload`). Navigating from Bible reader resets `prayContext` to null. |
| Verse context on Free Write mode | Works — card renders above textarea regardless of mode | The verse card is prompt-agnostic; it sits above the composer and doesn't interact with Guided/Free Write toggle |
| Draft conflict on verse bridge arrival | No conflict dialog shown | Draft conflict dialog only triggers for `prayContext?.from === 'devotional'`. Verse context arrives via URL params, not `prayContext`, so no conflict detection fires. Existing draft persists alongside the card (tested). |
| Multi-verse rendering | Handled by VersePromptCard | Superscript verse numbers shown when `context.verses.length > 1` (VersePromptCard.tsx:39-42) |

---

## Implementation Steps

### Step 1: Verify Build & Test Suite

**Objective:** Confirm that all BB-11 functionality passes build and test checks in the current codebase.

**Files to verify (read-only):**
- `src/components/daily/JournalTabContent.tsx` — verse context wiring
- `src/components/daily/__tests__/JournalTabContent.test.tsx` — verse bridge tests
- `src/lib/bible/verseActionRegistry.ts` — journal handler
- `src/constants/daily-experience.ts` — VERSE_FRAMINGS

**Details:**

Run the full test suite to verify all 8 Journal bridge tests pass:
```bash
cd frontend && pnpm test -- --run src/components/daily/__tests__/JournalTabContent.test.tsx
```

Run the build to confirm zero errors:
```bash
cd frontend && pnpm build
```

Run the VersePromptCard and VERSE_FRAMINGS tests:
```bash
cd frontend && pnpm test -- --run src/components/daily/__tests__/VersePromptCard.test.tsx
cd frontend && pnpm test -- --run src/constants/__tests__/daily-experience.test.ts
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT write any new code in this step
- Do NOT modify any existing files
- Do NOT skip any test suite — all must pass

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Existing JournalTabContent verse bridge suite (8 tests) | integration | Already covers: render, no-params, X dismiss, skeleton, invalid params, save with/without context, draft preservation |
| Existing VersePromptCard suite | unit | Covers: rendering, framing line, X button accessibility, reduced motion |
| Existing VERSE_FRAMINGS tests | unit | Covers: pray, journal, meditate framing line values |

**Expected state after completion:**
- [ ] All Journal bridge tests pass
- [ ] All VersePromptCard tests pass
- [ ] All VERSE_FRAMINGS tests pass
- [ ] Build passes with zero errors

---

### Step 2: Acceptance Criteria Walkthrough

**Objective:** Map every acceptance criterion from the spec to a verified implementation artifact (code line or test).

**Files to verify (read-only):**
- All files from Step 1 plus:
- `src/hooks/dailyHub/useVerseContextPreload.ts` — URL param consumption + cleanup
- `src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` — URL generation
- `src/lib/dailyHub/verseContext.ts` — parsing + hydration
- `src/components/daily/JournalInput.tsx` — DevotionalPreviewPanel mounting condition

**Details:**

Verify each acceptance criterion against the codebase:

| # | Acceptance Criterion | Verified By |
|---|---|---|
| 1 | "Journal about this" closes sheet + navigates | `verseActionRegistry.ts:322-324` |
| 2 | Daily Hub loads with Journal tab active | URL contains `tab=journal`, DailyHub.tsx parses it |
| 3 | VersePromptCard above composer with framing line | `JournalTabContent.tsx:297-303` |
| 4 | Composer textarea empty | Verse is card, not pre-fill; test: `JournalTabContent.test.tsx:714` |
| 5 | Params cleared via router.replace | `useVerseContextPreload.ts` calls `setSearchParams({ tab }, { replace: true })` |
| 6 | Multi-verse rendering | `VersePromptCard.tsx:38-46` (superscript verse numbers) |
| 7 | X removes card, draft unaffected | Test: `JournalTabContent.test.tsx:705-724` |
| 8 | Save includes verseContext | `JournalTabContent.tsx:195` + test at line 745 |
| 9 | Save without verseContext after card removed | Test: `JournalTabContent.test.tsx:761-777` |
| 10 | No card without verse params | Test: `JournalTabContent.test.tsx:699-703` |
| 11 | Invalid params graceful degradation | Test: `JournalTabContent.test.tsx:737-743` |
| 12 | Refresh after params cleared doesn't re-trigger | `useVerseContextPreload.ts` — `lastConsumedKey` ref dedup |
| 13 | Draft persistence works | Test: `JournalTabContent.test.tsx:779-789` |
| 14 | Browser back returns to Bible reader | Natural browser history behavior |
| 15 | VERSE_FRAMINGS single source of truth | `constants/daily-experience.ts:69-73` |
| 16 | VersePromptCard shared between Pray + Journal | Same import in both `PrayTabContent.tsx:21` and `JournalTabContent.tsx:21` |
| 17 | Pray tab still works after refactor | BB-10 tests cover this |
| 18 | `buildDailyHubVerseUrl('journal', selection)` correct | `buildDailyHubVerseUrl.ts` tested in BB-10 |
| 19 | Registry handler calls closeSheet before navigate | `verseActionRegistry.ts:323-324` |
| 20 | Existing entries without verseContext render correctly | Optional field (`verseContext?: JournalVerseContext`) |
| 21 | Design tokens only (zero raw hex) | Verified in VersePromptCard.tsx source |
| 22 | X button has aria-label + 44px target | `VersePromptCard.tsx:26-27` |
| 23 | Long verses wrap naturally | No truncation in VersePromptCard |
| 24 | Reduced motion respected | `VersePromptCard.tsx:13,19` |
| 25 | Zero new URL parsing logic | All from BB-10 modules |
| 26 | Logged-out can see card but not save | Existing auth gate in JournalInput |
| 27 | No visual conflict between VersePromptCard + DevotionalPreviewPanel | Independent mechanisms; `prayContext` resets on navigation away from DailyHub |

**Responsive behavior:** N/A: no UI impact — verification only

**Guardrails (DO NOT):**
- Do NOT write any new code
- Do NOT skip any acceptance criterion — every row must be verified

**Expected state after completion:**
- [ ] All 27 acceptance criteria verified against code or tests
- [ ] No gaps identified

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | Verify build + tests pass |
| 2 | 1 | Acceptance criteria walkthrough |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verify Build & Test Suite | [COMPLETE] | 2026-04-08 | All 65 tests pass (51 JournalTabContent + 11 VersePromptCard + 3 VERSE_FRAMINGS). Build passes with 0 errors. |
| 2 | Acceptance Criteria Walkthrough | [COMPLETE] | 2026-04-08 | All 27 acceptance criteria verified against source code. No gaps found. Registry handler, URL builder, preload hook, VersePromptCard, type definitions, constants, save logic, auth gating, accessibility, reduced motion — all confirmed. |
