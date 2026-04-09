# Implementation Plan: BB-10b Pray Persistence Completion

**Spec:** `_specs/bb-10b-pray-persistence-completion.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — completion spec for BB-10 (Pray bridge)

---

## Architecture Context

### Project Structure

This is a pure plumbing spec. The diff touches the prayer persistence pipeline — no UI changes, no new components, no styling.

**Files involved in the prayer save flow:**

1. **Type definition:** `src/types/personal-prayer.ts` — `PersonalPrayer` interface. Currently has `sourceType?` and `sourceId?` optional fields for Prayer Wall origin. Does NOT have `verseContext`. This is the type stored in `wr_prayer_list` localStorage.

2. **Storage service:** `src/services/prayer-list-storage.ts` — `addPrayer(input)` creates a `PersonalPrayer` from an input object and writes to `wr_prayer_list`. The input type currently accepts `{ title, description, category, sourceType?, sourceId? }`. Does NOT accept `verseContext`.

3. **Save form:** `src/components/daily/SaveToPrayerListForm.tsx` — Renders title input + category picker + Save button. Calls `addPrayer({ title, description, category })`. Does NOT receive or pass `verseContext`.

4. **Prayer response:** `src/components/daily/PrayerResponse.tsx` — Receives `verseContext?: PrayerVerseContext | null` as a prop (line 39) but destructures it as `_verseContext` (line 53) — explicitly unused, forward-compatible placeholder. Renders `SaveToPrayerListForm` at line 376 without passing `verseContext`.

5. **Pray tab content:** `src/components/daily/PrayTabContent.tsx` — Already builds `prayerVerseContext` (line 55-57) from the hydrated `verseContext` returned by `useVerseContextPreload('pray')` and passes it to `PrayerResponse` at line 237. The `reference` field is already pre-formatted by `formatReference()` inside `hydrateVerseContext()` (`src/lib/dailyHub/verseContext.ts:57`). **No changes needed here.**

6. **Verse context type:** `src/types/daily-experience.ts:151-157` — `PrayerVerseContext { book, chapter, startVerse, endVerse, reference }`. Already exists with exactly the shape the spec requires. **No changes needed here.**

### Save Flow (Current)

```
PrayTabContent.handleGenerate()
  → setPrayer(mockPrayer)
  → PrayerResponse receives { prayer, verseContext: prayerVerseContext }
    → User clicks "Save to Prayer List"
      → SaveToPrayerListForm mounts
        → User picks category, clicks Save
          → addPrayer({ title, description, category })  ← verseContext NOT passed
            → PersonalPrayer created (no verseContext field)
              → written to wr_prayer_list
```

### Save Flow (After This Spec)

```
Same flow, but:
  → SaveToPrayerListForm receives verseContext prop
    → addPrayer({ title, description, category, verseContext })  ← NEW
      → PersonalPrayer created WITH optional verseContext field
        → written to wr_prayer_list
```

### Key Insight: `reference` Is Already Formatted

The `PrayerVerseContext.reference` field is populated by `formatReference()` during verse hydration (`verseContext.ts:57`). The spec requires using the existing `formatReference` helper — this is already satisfied by the existing BB-10 bridge code. No duplicate formatting logic is introduced by this spec.

### Downstream Consumer

BB-14 (My Bible) reads from `wr_prayer_list` and filters for prayers with `verseContext`. Once this spec ships, verse-attached prayers automatically appear in the BB-14 activity feed.

### Test Patterns

- **SaveToPrayerListForm tests:** `src/components/daily/__tests__/SaveToPrayerListForm.test.tsx` — renders with `MemoryRouter` + `ToastProvider`, uses `userEvent`, asserts against `getPrayers()` from localStorage.
- **Prayer storage tests:** No dedicated test file exists for `prayer-list-storage.ts`. Tests go through `SaveToPrayerListForm.test.tsx`.

---

## Auth Gating Checklist

No new auth gates. The existing Pray tab auth gating applies unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Submit prayer with verse context | Existing auth gate (unchanged) | N/A — not modified by this spec | useAuth + auth modal (existing in PrayTabContent.handleGenerate) |
| Save to prayer list | Existing auth gate (unchanged) | N/A — not modified by this spec | useAuth + auth modal (existing in PrayerResponse.handleSaveToList) |

---

## Design System Values (for UI steps)

N/A — no UI changes. This spec modifies data persistence only.

---

## Design System Reminder

N/A — no UI steps in this plan.

---

## Shared Data Models (from Master Plan)

**Existing type reused (no changes):**

```typescript
// src/types/daily-experience.ts:151-157
export interface PrayerVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}
```

**Type modified:**

```typescript
// src/types/personal-prayer.ts — adding optional verseContext
export interface PersonalPrayer {
  // ... existing fields ...
  verseContext?: PrayerVerseContext  // NEW — optional, from BB-10b
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_list` | Write (modified shape) | Prayer records may now include optional `verseContext` field |

---

## Responsive Structure

N/A — no UI changes.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — no UI changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-10 (Pray bridge) is complete and committed — `verseContext` state is available in PrayTabContent
- [x] `PrayerVerseContext` type already exists in `types/daily-experience.ts`
- [x] `formatReference` is already called during hydration — no duplicate formatting needed
- [x] All auth-gated actions from the spec are accounted for (none new)
- [x] Design system values N/A (no UI changes)
- [x] No [UNVERIFIED] values (no visual changes)
- [x] No deprecated patterns introduced
- [ ] Existing SaveToPrayerListForm tests pass before changes (run `pnpm test SaveToPrayerListForm`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to import `PrayerVerseContext` in `personal-prayer.ts` | Import from `@/types/daily-experience` | Single source of truth — the type already exists there. No duplicate definition. |
| Pass `verseContext` as `undefined` vs omit entirely when no verse | Pass `undefined` — let `addPrayer` spread it naturally | `undefined` values are dropped by `JSON.stringify`, so records without verse context will not have the field in localStorage. Clean serialization. |
| Multi-verse edge case (e.g. John 3:16-18) | Already handled by `hydrateVerseContext` | `startVerse` and `endVerse` are parsed from URL params by `parseVerseContextFromUrl`. No new parsing needed. |
| Existing prayers without `verseContext` in localStorage | No migration needed | Field is optional on the type. `JSON.parse` will return records without the field, and TypeScript treats missing optional fields as `undefined`. |
| `verseContext` after VersePromptCard dismissed (X button) | `null` — not saved | When user dismisses the card, `clearVerseContext()` sets `verseContext` to `null`, so `prayerVerseContext` becomes `null`. The save form receives `null`, which is not passed to `addPrayer`. |

---

## Implementation Steps

### Step 1: Add `verseContext` to PersonalPrayer type

**Objective:** Add the optional `verseContext` field to the `PersonalPrayer` interface.

**Files to modify:**
- `src/types/personal-prayer.ts` — add optional `verseContext?: PrayerVerseContext` field with import

**Details:**

Add import for `PrayerVerseContext` from `@/types/daily-experience` at the top of the file. Add `verseContext?: PrayerVerseContext` as an optional field on the `PersonalPrayer` interface, after the `sourceId` field.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT create a new `VerseContext` type — reuse `PrayerVerseContext` from `daily-experience.ts`
- DO NOT make `verseContext` required — it must be optional for backward compatibility
- DO NOT add any other fields to `PersonalPrayer`
- DO NOT touch any other type files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A — type-only change | N/A | TypeScript compiler validates the type. No runtime test needed for this step alone. |

**Expected state after completion:**
- [x] `PersonalPrayer` interface includes `verseContext?: PrayerVerseContext`
- [x] Import from `@/types/daily-experience` is present
- [x] No other changes to the file

---

### Step 2: Update `addPrayer` to accept and persist `verseContext`

**Objective:** Extend the `addPrayer` input parameter to accept an optional `verseContext` and include it in the persisted `PersonalPrayer` record.

**Files to modify:**
- `src/services/prayer-list-storage.ts` — update `addPrayer` input type and record construction

**Details:**

Add `verseContext?: PrayerVerseContext` to the `addPrayer` input parameter type (line 35-40). Import `PrayerVerseContext` from `@/types/daily-experience`. In the `PersonalPrayer` construction (line 46-59), add `verseContext: input.verseContext` to the object literal.

When `input.verseContext` is `undefined`, `JSON.stringify` will drop the key from the serialized output, so existing records and new records without verse context will have identical serialization.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify `readPrayers`, `writePrayers`, `updatePrayer`, `deletePrayer`, or any other function
- DO NOT add migration logic for existing records
- DO NOT add validation on the `verseContext` fields — the data is already validated during hydration in `verseContext.ts`
- DO NOT refactor the storage service

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| addPrayer persists verseContext when provided | unit | Call `addPrayer` with a `verseContext` object. Read back via `getPrayers()`. Assert the saved record has `verseContext` with correct `book`, `chapter`, `startVerse`, `endVerse`, `reference`. |
| addPrayer omits verseContext when not provided | unit | Call `addPrayer` without `verseContext`. Read back. Assert the record does NOT have a `verseContext` property (or it is `undefined`). |
| Existing records without verseContext deserialize correctly | unit | Write a raw `PersonalPrayer` JSON (without `verseContext`) to `wr_prayer_list`. Call `getPrayers()`. Assert it returns a valid array with the record, and `record.verseContext` is `undefined`. |
| Multi-verse verseContext round-trips correctly | unit | Call `addPrayer` with `verseContext: { book: 'john', chapter: 3, startVerse: 16, endVerse: 18, reference: 'John 3:16–18' }`. Read back. Assert all fields match. |

**Expected state after completion:**
- [x] `addPrayer` accepts optional `verseContext` in its input
- [x] Saved `PersonalPrayer` records include `verseContext` when provided
- [x] Records without `verseContext` serialize identically to before (no `verseContext` key in JSON)
- [x] All 4 new tests pass

---

### Step 3: Pass `verseContext` through SaveToPrayerListForm and PrayerResponse

**Objective:** Thread `verseContext` from PrayerResponse through SaveToPrayerListForm to the `addPrayer` call.

**Files to modify:**
- `src/components/daily/SaveToPrayerListForm.tsx` — accept optional `verseContext` prop, pass to `addPrayer`
- `src/components/daily/PrayerResponse.tsx` — un-alias `_verseContext`, pass to `SaveToPrayerListForm`

**Details:**

**SaveToPrayerListForm.tsx:**
1. Import `PrayerVerseContext` from `@/types/daily-experience`
2. Add `verseContext?: PrayerVerseContext | null` to `SaveToPrayerListFormProps` interface (line 9-14)
3. Destructure `verseContext` in the component function
4. In `handleSave` (line 33-48), update the `addPrayer` call to include `verseContext: verseContext ?? undefined` — converts `null` to `undefined` so it's cleanly omitted from serialization

**PrayerResponse.tsx:**
1. Change `verseContext: _verseContext` to `verseContext` in the destructuring (line 53) — remove the underscore alias
2. Pass `verseContext={verseContext}` to `<SaveToPrayerListForm>` at line 376-385

**Auth gating:** N/A — no new auth gates

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify SaveToPrayerListForm's visual layout — no CSS changes
- DO NOT add any UI indication of verse context in the save form (no badge, no label, no reference display)
- DO NOT modify PrayerResponse's visual layout
- DO NOT change how PrayTabContent passes verseContext to PrayerResponse (it already works)
- DO NOT touch PrayTabContent at all

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SaveToPrayerListForm saves verseContext when provided | integration | Render form with `verseContext={{ book: 'john', chapter: 3, startVerse: 16, endVerse: 16, reference: 'John 3:16' }}`. Select category, click Save. Assert `getPrayers()[0].verseContext` matches. |
| SaveToPrayerListForm omits verseContext when null | integration | Render form with `verseContext={null}`. Select category, click Save. Assert `getPrayers()[0].verseContext` is `undefined`. |
| SaveToPrayerListForm omits verseContext when not passed | integration | Render form without `verseContext` prop. Select category, click Save. Assert `getPrayers()[0].verseContext` is `undefined`. |
| Existing SaveToPrayerListForm tests still pass | regression | All 6 existing tests in `SaveToPrayerListForm.test.tsx` pass without modification (form prop is optional — existing tests don't provide it). |

**Expected state after completion:**
- [x] `SaveToPrayerListForm` accepts optional `verseContext` prop
- [x] `PrayerResponse` passes `verseContext` to `SaveToPrayerListForm`
- [x] Prayers saved with verse context include the `verseContext` field in localStorage
- [x] Prayers saved without verse context have no `verseContext` field (identical to current behavior)
- [x] All existing tests pass without modification
- [x] All 3 new tests pass
- [x] Zero raw hex values introduced
- [x] No visual changes to the save form

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `verseContext` to PersonalPrayer type |
| 2 | 1 | Update `addPrayer` to accept and persist verseContext |
| 3 | 1, 2 | Thread verseContext through SaveToPrayerListForm and PrayerResponse |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add verseContext to PersonalPrayer type | [COMPLETE] | 2026-04-09 | Modified `src/types/personal-prayer.ts` — added import + optional field |
| 2 | Update addPrayer to persist verseContext | [COMPLETE] | 2026-04-09 | Modified `prayer-list-storage.ts` (import + input type + record construction). Added 4 tests to `prayer-list-storage.test.ts` |
| 3 | Thread verseContext through components | [COMPLETE] | 2026-04-09 | Modified `SaveToPrayerListForm.tsx` (prop + addPrayer call), `PrayerResponse.tsx` (un-aliased _verseContext, passed to form). Added 3 tests to `SaveToPrayerListForm.test.tsx` |
