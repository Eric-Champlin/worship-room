# Implementation Plan: BB-12 Daily Hub Bridge — Meditate

**Spec:** `_specs/bb-12-daily-hub-bridge-meditate.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Shared Infrastructure (all from BB-10, confirmed by BB-11)

The three Daily Hub bridges (Pray, Journal, Meditate) follow an identical pattern. BB-10 built the infrastructure; BB-11 confirmed it generalizes; BB-12 wires the last handler.

- **Types:** `src/types/daily-experience.ts` — `VerseContextPartial`, `VerseContext`, `PrayerVerseContext`, `JournalVerseContext`
- **Verse Context Utility:** `src/lib/dailyHub/verseContext.ts` — `parseVerseContextFromUrl()`, `hydrateVerseContext()`, `formatReference()`
- **URL Builder:** `src/lib/bible/verseActions/buildDailyHubVerseUrl.ts` — `buildDailyHubVerseUrl('meditate', selection)` produces `/daily?tab=meditate&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- **Preload Hook:** `src/hooks/dailyHub/useVerseContextPreload.ts` — reads URL params, hydrates verse text from WEB JSON, cleans URL via `setSearchParams({ tab }, { replace: true })`, deduplicates via `lastConsumedKey` ref
- **VersePromptCard:** `src/components/daily/VersePromptCard.tsx` — Tier 2 scripture callout (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]`), X button with `aria-label="Remove verse prompt"` and 44px target, `useReducedMotion` for fade-in. Also exports `VersePromptSkeleton`.
- **Constants:** `src/constants/daily-experience.ts` — `VERSE_FRAMINGS = { pray: '...', journal: '...', meditate: '' }` (meditate is currently an empty string stub)
- **Registry Handler:** `src/lib/bible/verseActionRegistry.ts:329-338` — `meditate` handler is a stub with `onInvoke: () => {}`

### MeditateTabContent (current state)

File: `src/components/daily/MeditateTabContent.tsx` (143 lines)

- Renders 6 meditation cards in a 2-column grid from `MEDITATION_TYPES` constant
- Auth gating: card clicks trigger `authModal.openAuthModal('Sign in to start meditating')` for logged-out users
- Completion tracking: green checkmarks + all-6-complete celebration banner
- Challenge context: reads `challengeContext` from `location.state` to highlight a suggested card
- **No verse context handling** — no Spec Z verse banner, no BB-12 code. The Spec Z flow described in UX docs sends params directly to meditation sub-pages; it does NOT render a banner in MeditateTabContent.
- Currently accepts **zero props** — `<MeditateTabContent />` in DailyHub.tsx
- Wrapper: `<div><div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">`

### DailyHub Tab Management

File: `src/pages/DailyHub.tsx` — all 4 tab panels are always mounted but hidden via `hidden={activeTab !== tabId}`. State persists between tab switches. The `switchTab()` callback clears `prayContext` but touches nothing on MeditateTabContent.

### Meditation Session Persistence

- **Type:** `src/types/meditation.ts` — `MeditationSession { id, type, date, durationMinutes, completedAt }`. No `verseContext` field yet.
- **Storage:** `src/services/meditation-storage.ts` — `saveMeditationSession()` writes to `wr_meditation_history` (max 365 entries)
- **Callers:** All 6 meditation sub-pages call `saveMeditationSession()` directly:
  - `src/pages/meditate/BreathingExercise.tsx:113`
  - `src/pages/meditate/ScriptureSoaking.tsx:105`
  - `src/pages/meditate/GratitudeReflection.tsx:76`
  - `src/pages/meditate/ActsPrayerWalk.tsx:39`
  - `src/pages/meditate/PsalmReading.tsx:76`
  - `src/pages/meditate/ExamenReflection.tsx:39`
- Also called by `PrayTabContent.tsx:179` for guided prayer sessions (not relevant to BB-12)
- None of the meditation sub-pages currently import `useLocation`; all import `Navigate` from `react-router-dom`

### Spec Z Coexistence

The Spec Z verse-aware meditation flow uses `verseRef`/`verseText`/`verseTheme` params from the Devotional tab's "Meditate on this passage" CTA. These params flow directly to meditation sub-pages (BreathingExercise, ScriptureSoaking). BB-12 uses `verseBook`/`verseChapter`/`verseStart`/`verseEnd`/`src` params from the Bible reader's action sheet. The param sets are disjoint — no collision possible.

### Test Patterns

- PrayTabContent tests wrap with: `MemoryRouter > AuthProvider > ToastProvider > AuthModalProvider`
- JournalTabContent tests use the same wrapper pattern
- **No existing MeditateTabContent test file** — `MeditateTabContent.test.tsx` does not exist
- The VERSE_FRAMINGS test (`constants/__tests__/daily-experience.test.ts`) currently expects `meditate` to be `''`
- Bible JSON loading is mocked via `vi.mock('@/lib/bible/loadChapterWeb')` returning chapter data

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Navigate via "Meditate on this" in action sheet | Not auth-gated | Step 2 | N/A — public navigation |
| View verse focus on Meditate tab | Not auth-gated | Step 3 | N/A — renders for all users |
| Remove verse focus (X button) | Not auth-gated | Step 3 | N/A — UI state only |
| Tap a meditation card | Auth-gated (existing) | Unchanged | Existing `useAuth` + `useAuthModal` in MeditateTabContent |

All auth gating is inherited from the existing Meditate tab implementation. No new auth gates introduced by BB-12.

---

## Design System Values (for UI steps)

No new UI components are being created. The `VersePromptCard` component (shared from BB-10) already uses verified design tokens:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| VersePromptCard | container | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4` | `VersePromptCard.tsx:18` |
| VersePromptCard | reference | `font-serif text-base font-semibold text-white sm:text-lg` | `VersePromptCard.tsx:32` |
| VersePromptCard | verse text | `text-[17px] leading-[1.75] text-white sm:text-lg` | `VersePromptCard.tsx:36` |
| VersePromptCard | framing line | `text-sm text-white/60` | `VersePromptCard.tsx:49` |
| VersePromptCard | X button | `min-h-[44px] min-w-[44px]` + `aria-label="Remove verse prompt"` | `VersePromptCard.tsx:24-29` |
| VersePromptCard | animation | `animate-fade-in` gated behind `useReducedMotion` | `VersePromptCard.tsx:13,19` |
| VersePromptSkeleton | container | `border-l-primary/30 bg-white/[0.04]` + pulse backgrounds | `VersePromptCard.tsx:58-66` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components.
- Daily Hub tab headings ("What's On Your Heart/Mind/Spirit?") have been REMOVED. Tab content leads directly into the input or activity — no heading.
- Frosted glass cards: use the `FrostedCard` component or `VersePromptCard`. Do NOT roll custom cards.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- `animate-glow-pulse` is deprecated — do NOT use.
- Zero raw hex values in components — use design tokens and Tailwind classes only.

---

## Shared Data Models

```typescript
// NEW — add to types/meditation.ts
export interface MeditationVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}

// UPDATED — add optional verseContext to existing type
export interface MeditationSession {
  id: string
  type: MeditationType
  date: string
  durationMinutes: number
  completedAt: string
  verseContext?: MeditationVerseContext  // BB-12: optional verse context
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_meditation_history` | Write | Existing key — sessions now include optional `verseContext` field |

No new localStorage keys introduced.

---

## Responsive Structure

No new responsive layouts. The `VersePromptCard` renders as a full-width block element within the existing `max-w-2xl` container, above the 2-column meditation card grid. The same single-column verse card layout applies at all breakpoints.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Verse focus full-width within `px-4`; verse text wraps; X button 44px tap target; 6 cards in 2-col grid below |
| Tablet | 768px | Same layout, slightly more padding from `max-w-2xl` |
| Desktop | 1440px | Verse focus within `max-w-2xl`; comfortable reading width |

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The verse prompt card is a block-level element above the meditation card grid.

---

## Vertical Rhythm

No new sections added. The `VersePromptCard` uses `mb-4` spacing (built into the component) to separate from the content below it.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| VersePromptCard → meditation card grid | 16px (`mb-4`) | `VersePromptCard.tsx:18` |
| All-complete banner → VersePromptCard (if both present) | 32px (`mb-8` on banner) | `MeditateTabContent.tsx:60` |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-10 (Daily Hub Bridge — Pray) is complete and committed
- [x] BB-11 (Daily Hub Bridge — Journal) is complete and committed (verified as already implemented by BB-10)
- [x] All auth-gated actions from the spec are accounted for (only existing card-click gate, no new gates)
- [x] Design system values verified from VersePromptCard source code
- [x] No [UNVERIFIED] values — all UI reuses existing VersePromptCard
- [x] No deprecated patterns used
- [x] Spec Z and BB-12 param sets are confirmed disjoint (verseRef/verseText/verseTheme vs verseBook/verseChapter/verseStart/verseEnd/src)
- [ ] Build + tests pass with current code before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| How to pass verse context from MeditateTabContent to sub-pages | `location.state` via `navigate(route, { state: { verseContext } })` | Same pattern used by `challengeContext`. Ephemeral, no localStorage needed, no URL pollution on sub-page routes. |
| How MeditateTabContent detects tab inactivity | Read `searchParams.get('tab')` inside the component and clear verse context when tab !== 'meditate' | Avoids adding a new prop to DailyHub. Same `useSearchParams` that the preload hook already uses. |
| Hydration race condition on rapid tab switch | Accept — no mitigation | The race requires switching tabs within ~50ms of arrival. If it occurs, a stale verse sits in hidden component state and gets cleared on next tab switch. Consequence is negligible. |
| All-complete banner + VersePromptCard coexistence | Both render — banner above, verse card below, cards below that | All-complete banner has `mb-8`; verse card has `mb-4`. Both are block elements in the same container. |
| Verse context + challenge context coexistence | Both can coexist — verse card above cards, challenge highlight on a card | Independent mechanisms: verse comes from URL params, challenge comes from location.state. Navigation from Bible reader doesn't set challenge state. |
| `VersePromptCard` vs custom Meditate-specific card | Reuse `VersePromptCard` with `framingLine` | The card is parameterized via `framingLine` prop. Meditate needs no input below the card, and the card doesn't render one. The shared component fits perfectly. |
| Clearing verse context when navigating to sub-page | Do NOT clear — user may press back and want to see the verse | The verse focus shows the user what they're meditating on. If they back-navigate, they should see it. The tab-switch clearing handles cleanup. |
| VERSE_FRAMINGS.meditate framing line | `'Return to these words whenever your mind wanders.'` | Per spec requirement 2. Stored in the shared constant — single source of truth. |
| Where to define `MeditationVerseContext` type | `src/types/meditation.ts` alongside `MeditationSession` | Keeps meditation types together. Parallel to `PrayerVerseContext` in `types/daily-experience.ts`. |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Add the `MeditationVerseContext` type, update `MeditationSession` with the optional `verseContext` field, fill in the `VERSE_FRAMINGS.meditate` constant, and update its test.

**Files to create/modify:**
- `src/types/meditation.ts` — add `MeditationVerseContext` interface, add optional `verseContext` to `MeditationSession`
- `src/constants/daily-experience.ts` — set `VERSE_FRAMINGS.meditate` to `'Return to these words whenever your mind wanders.'`
- `src/constants/__tests__/daily-experience.test.ts` — update test to expect the new string

**Details:**

In `src/types/meditation.ts`, add the `MeditationVerseContext` interface and the optional field:

```typescript
export interface MeditationVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}

export interface MeditationSession {
  id: string
  type: MeditationType
  date: string
  durationMinutes: number
  completedAt: string
  verseContext?: MeditationVerseContext
}
```

In `src/constants/daily-experience.ts` line 72, change `meditate: ''` to `meditate: 'Return to these words whenever your mind wanders.'`.

In `src/constants/__tests__/daily-experience.test.ts` line 14, change the test assertion from `expect(VERSE_FRAMINGS.meditate).toBe('')` to `expect(VERSE_FRAMINGS.meditate).toBe('Return to these words whenever your mind wanders.')`.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add any new localStorage keys
- Do NOT change the shape of `PrayerVerseContext` or `JournalVerseContext` — `MeditationVerseContext` is a parallel type with the same shape
- Do NOT modify `saveMeditationSession()` — the function already accepts `MeditationSession` objects; the optional `verseContext` field will be serialized via `JSON.stringify` automatically

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| VERSE_FRAMINGS.meditate has correct value | unit | Update existing test: `expect(VERSE_FRAMINGS.meditate).toBe('Return to these words whenever your mind wanders.')` |

**Expected state after completion:**
- [x] `MeditationVerseContext` type exported from `types/meditation.ts`
- [x] `MeditationSession.verseContext` is optional field typed as `MeditationVerseContext`
- [x] `VERSE_FRAMINGS.meditate` is `'Return to these words whenever your mind wanders.'`
- [x] VERSE_FRAMINGS test passes with the new value
- [x] Build passes — existing callers of `saveMeditationSession` don't break (field is optional)

---

### Step 2: Registry Handler

**Objective:** Replace the stub `meditate` handler in the verse action registry with a real implementation that builds the URL, closes the sheet, and navigates.

**Files to create/modify:**
- `src/lib/bible/verseActionRegistry.ts` — replace `onInvoke: () => {}` on lines 337 with the real handler

**Details:**

Replace the `meditate` handler's `onInvoke` at line 337:

```typescript
// Before:
onInvoke: () => {},

// After:
onInvoke: (selection, ctx) => {
  const url = buildDailyHubVerseUrl('meditate', selection)
  ctx.closeSheet({ navigating: true })
  ctx.navigate(url)
},
```

Verify that `buildDailyHubVerseUrl` is already imported at the top of the file (it is — used by the `pray` and `journal` handlers).

Follow the exact pattern from the `journal` handler at lines 322-326:
```typescript
onInvoke: (selection, ctx) => {
  const url = buildDailyHubVerseUrl('journal', selection)
  ctx.closeSheet({ navigating: true })
  ctx.navigate(url)
},
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change the handler's `label`, `sublabel`, `icon`, `category`, or `isAvailable` — only replace `onInvoke`
- Do NOT add any new imports — `buildDailyHubVerseUrl` is already imported
- Do NOT modify the `pray` or `journal` handlers

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (verified via MeditateTabContent integration tests in Step 5) | — | The handler is tested end-to-end by navigating from Bible reader to Meditate tab |

**Expected state after completion:**
- [x] `meditate` handler invokes `buildDailyHubVerseUrl('meditate', selection)`, `ctx.closeSheet({ navigating: true })`, `ctx.navigate(url)`
- [x] Tapping "Meditate on this" in the action sheet closes the sheet and navigates to `/daily?tab=meditate&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`

---

### Step 3: MeditateTabContent & DailyHub Wiring

**Objective:** Wire the verse context preload hook and VersePromptCard rendering into MeditateTabContent. Pass verse context to meditation sub-pages via `location.state`. Clear verse context when tab switches away. Update DailyHub to pass an `isActive` prop.

**Files to create/modify:**
- `src/components/daily/MeditateTabContent.tsx` — add preload hook, card rendering, tab-clearing, location.state passing
- `src/pages/DailyHub.tsx` — pass `isActive={activeTab === 'meditate'}` prop to `MeditateTabContent`

**Details:**

**MeditateTabContent.tsx changes:**

1. Add imports:
```typescript
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import { VERSE_FRAMINGS } from '@/constants/daily-experience'
import type { MeditationVerseContext } from '@/types/meditation'
```

2. Add `isActive` prop:
```typescript
interface MeditateTabContentProps {
  isActive?: boolean
}

export function MeditateTabContent({ isActive = true }: MeditateTabContentProps) {
```

3. Call the preload hook:
```typescript
const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload('meditate')
```

4. Build the `MeditationVerseContext` for location.state passing:
```typescript
const meditationVerseContext: MeditationVerseContext | null = verseContext
  ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
  : null
```

5. Clear verse context when tab becomes inactive:
```typescript
import { useEffect } from 'react'
// (already imports from react if needed for useEffect)

useEffect(() => {
  if (!isActive) {
    clearVerseContext()
  }
}, [isActive, clearVerseContext])
```

6. Render `VersePromptSkeleton` and `VersePromptCard` above the meditation card grid, below the all-complete banner:

```tsx
{/* Verse Prompt Card (from Bible bridge) */}
{isHydrating && <VersePromptSkeleton />}
{verseContext && (
  <VersePromptCard
    context={verseContext}
    onRemove={clearVerseContext}
    framingLine={VERSE_FRAMINGS.meditate}
  />
)}
```

Place this JSX AFTER the all-complete celebration banner (`{isAuthenticated && allComplete && (...)}`) and BEFORE the `<div className="grid grid-cols-2 gap-4 sm:gap-6">` card grid.

7. Pass verse context via `location.state` when navigating to a sub-page. Modify the card click handler (line 88):

```typescript
// Before:
navigate(ROUTE_MAP[type.id])

// After:
navigate(ROUTE_MAP[type.id], {
  ...(meditationVerseContext && { state: { meditationVerseContext } }),
})
```

Note: when `challengeContext` is present AND `meditationVerseContext` is present, the `navigate` call on line 88 runs after the `challengeContext` clearing navigate on line 86. The second `navigate` replaces the first since they're in the same event handler. The `state` only includes `meditationVerseContext` — `challengeContext` was already consumed for card highlighting.

**DailyHub.tsx changes:**

Pass the `isActive` prop to `MeditateTabContent` (line 345):

```tsx
// Before:
<MeditateTabContent />

// After:
<MeditateTabContent isActive={activeTab === 'meditate'} />
```

**Responsive behavior:**
- Desktop (1440px): VersePromptCard renders full-width within `max-w-2xl`, comfortable reading width
- Tablet (768px): Same single-column layout
- Mobile (375px): Verse text wraps naturally, X button is 44px tap target

All responsive behavior is inherited from the existing `VersePromptCard` component.

**Guardrails (DO NOT):**
- Do NOT add `GlowBackground` or any background styling to MeditateTabContent
- Do NOT add a heading above the verse card — the card speaks for itself (consistent with other Daily Hub tabs)
- Do NOT modify the existing card grid, auth gating, or completion tracking
- Do NOT clear the `challengeContext` from location.state when verse context is present — they are independent
- Do NOT add any new CSS classes or raw hex values — the VersePromptCard handles all styling
- Do NOT add `useSearchParams` for tab-clearing — use the `isActive` prop from DailyHub instead

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (covered by Step 5 tests) | — | Full integration tests for verse context rendering, removal, and clearing |

**Expected state after completion:**
- [x] Verse prompt card renders on Meditate tab when arriving from Bible reader with verse params
- [x] Skeleton shows during hydration
- [x] X button removes the card
- [x] Verse context clears when switching to another tab
- [x] Card click passes `meditationVerseContext` to sub-page via `location.state`
- [x] DailyHub passes `isActive` prop

---

### Step 4: Meditation Sub-Pages — Batch 1 (Breathing, Soaking, Gratitude)

**Objective:** Update 3 meditation sub-pages to read `meditationVerseContext` from `location.state` and include it in the `saveMeditationSession` call.

**Files to create/modify:**
- `src/pages/meditate/BreathingExercise.tsx` — add `useLocation`, read verse context, include in save
- `src/pages/meditate/ScriptureSoaking.tsx` — same
- `src/pages/meditate/GratitudeReflection.tsx` — same

**Details:**

The change is identical across all 3 files. In each file:

1. Add `useLocation` to the react-router-dom import:
```typescript
// BreathingExercise.tsx (line 2):
import { Navigate, useLocation } from 'react-router-dom'

// ScriptureSoaking.tsx (line 2):
import { Navigate, useSearchParams, useLocation } from 'react-router-dom'

// GratitudeReflection.tsx (line 2):
import { Navigate, useLocation } from 'react-router-dom'
```

2. Add the `MeditationVerseContext` type import:
```typescript
import type { MeditationVerseContext } from '@/types/meditation'
```

3. Inside the component function, read verse context from location.state:
```typescript
const location = useLocation()
const meditationVerseContext = (location.state as { meditationVerseContext?: MeditationVerseContext } | null)?.meditationVerseContext ?? null
```

4. In the `saveMeditationSession` call, spread the verse context:
```typescript
saveMeditationSession({
  id: crypto.randomUUID(),
  type: 'breathing', // or 'soaking', 'gratitude'
  date: getLocalDateString(),
  durationMinutes: duration!, // or minutes
  completedAt: new Date().toISOString(),
  ...(meditationVerseContext && { verseContext: meditationVerseContext }),
})
```

**Specific line references:**
- `BreathingExercise.tsx`: save call at line 113-119
- `ScriptureSoaking.tsx`: save call at line 105-110
- `GratitudeReflection.tsx`: save call at line 76-81

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify the existing save call shape beyond adding the optional spread — the 5 existing fields must remain unchanged
- Do NOT add any UI rendering of the verse context on the sub-page — that's out of scope for BB-12
- Do NOT touch the completion tracking, activity recording, or chime playing logic
- Do NOT use `verseContext` as the location.state key — use `meditationVerseContext` to avoid collision with future state keys

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (covered by existing meditation-activity.test.tsx which tests save calls) | — | Existing tests verify save call structure; the optional field is additive |

**Expected state after completion:**
- [x] All 3 sub-pages read `meditationVerseContext` from `location.state`
- [x] Session records include `verseContext` when present
- [x] Session records work correctly without verse context (existing behavior preserved)

---

### Step 5: Meditation Sub-Pages — Batch 2 (ACTS, Psalms, Examen)

**Objective:** Update the remaining 3 meditation sub-pages with the same verse context save pattern.

**Files to create/modify:**
- `src/pages/meditate/ActsPrayerWalk.tsx` — add `useLocation`, read verse context, include in save
- `src/pages/meditate/PsalmReading.tsx` — same
- `src/pages/meditate/ExamenReflection.tsx` — same

**Details:**

Identical pattern to Step 4. In each file:

1. Add `useLocation` to the react-router-dom import:
```typescript
import { Navigate, useLocation } from 'react-router-dom'
```

2. Add the type import:
```typescript
import type { MeditationVerseContext } from '@/types/meditation'
```

3. Read from location.state:
```typescript
const location = useLocation()
const meditationVerseContext = (location.state as { meditationVerseContext?: MeditationVerseContext } | null)?.meditationVerseContext ?? null
```

4. Spread into the save call:
```typescript
...(meditationVerseContext && { verseContext: meditationVerseContext }),
```

**Specific line references:**
- `ActsPrayerWalk.tsx`: save call at line 39-44
- `PsalmReading.tsx`: save call at line 76-81
- `ExamenReflection.tsx`: save call at line 39-44

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Same guardrails as Step 4

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (same as Step 4) | — | Additive optional field, existing tests cover save structure |

**Expected state after completion:**
- [x] All 6 meditation sub-pages now include optional `verseContext` in session records
- [x] No regressions in existing functionality

---

### Step 6: Tests

**Objective:** Write integration tests for MeditateTabContent verse context rendering, removal, clearing, and sub-page state passing. Update the existing VERSE_FRAMINGS test was already updated in Step 1.

**Files to create/modify:**
- `src/components/daily/__tests__/MeditateTabContent.test.tsx` — new file

**Details:**

Create `src/components/daily/__tests__/MeditateTabContent.test.tsx`. Follow the test patterns from `PrayTabContent.test.tsx` (provider wrapping, `MemoryRouter` with `initialEntries`, mock for `loadChapterWeb`).

**Test wrapper:**
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { MeditateTabContent } from '../MeditateTabContent'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/bible/loadChapterWeb', () => ({
  loadChapterWeb: vi.fn(),
}))

// Mock chapter data (same pattern as PrayTabContent.test.tsx)
const PSALM_46_CHAPTER = {
  book: 'Psalms',
  chapter: 46,
  verses: [
    // ... include verse 10 at minimum
    { number: 10, text: 'Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.' },
  ],
}

function renderMeditateTab(props: { isActive?: boolean; initialUrl?: string } = {}) {
  const initialEntries = props.initialUrl ? [props.initialUrl] : ['/daily?tab=meditate']
  return render(
    <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <MeditateTabContent isActive={props.isActive ?? true} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}
```

**Test cases (8 tests in a `describe('MeditateTabContent verse context (Bible bridge)')` block):**

| Test | Type | Description |
|------|------|-------------|
| Renders VersePromptCard when verse params in URL | integration | Navigate to `/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible`. Expect card with reference "Psalms 46:10", verse text, and framing line "Return to these words whenever your mind wanders." |
| No card when no verse params | integration | Navigate to `/daily?tab=meditate`. Expect no region with `name=/verse prompt/i`. Meditation cards still render. |
| Removing card via X does not affect meditation cards | integration | Render with verse params. Click X button. Card disappears. All 6 meditation cards still present. |
| Skeleton shows during hydration | integration | Mock `loadChapterWeb` to return a delayed promise. Expect skeleton to appear (animated pulse elements). |
| Invalid params show no card | integration | Navigate with `verseBook=invalid&verseChapter=abc`. Expect no card, no error, meditation cards still render. |
| All-complete banner and verse card coexist | integration | Simulate logged-in with all 6 meditations complete. Render with verse params. Both banner and verse card are visible. |
| Card click passes meditationVerseContext in state | integration | Render with verse params. Simulate logged-in. Click a meditation card. Verify `navigate` was called with `state: { meditationVerseContext: { book, chapter, startVerse, endVerse, reference } }`. |
| Verse context clears when isActive becomes false | integration | Render with verse params and `isActive={true}`. Rerender with `isActive={false}`. Card disappears. |

**Responsive behavior:** N/A: no UI impact — tests only

**Guardrails (DO NOT):**
- Do NOT mock the VersePromptCard component — test the real rendering
- Do NOT test auth gating on card clicks — that's existing behavior covered by the meditation auth test suite
- Do NOT duplicate tests that exist in the VersePromptCard test suite (X button a11y, reduced motion, etc.)

**Expected state after completion:**
- [x] 8 new tests covering all BB-12 verse context behavior
- [x] All tests pass (`pnpm test -- --run src/components/daily/__tests__/MeditateTabContent.test.tsx`)
- [x] Full test suite passes
- [x] Build passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & constants |
| 2 | — | Registry handler (independent of Step 1) |
| 3 | 1 | MeditateTabContent wiring (needs `MeditationVerseContext` type + `VERSE_FRAMINGS.meditate`) |
| 4 | 1 | Sub-pages batch 1 (needs `MeditationVerseContext` type) |
| 5 | 1 | Sub-pages batch 2 (needs `MeditationVerseContext` type) |
| 6 | 1, 2, 3 | Tests (needs all implementation steps) |

Steps 2, 4, and 5 are independent of each other and can be executed in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [COMPLETE] | 2026-04-08 | Added `MeditationVerseContext` to `types/meditation.ts`, added optional `verseContext` to `MeditationSession`, set `VERSE_FRAMINGS.meditate`, updated test |
| 2 | Registry Handler | [COMPLETE] | 2026-04-08 | Replaced stub `onInvoke: () => {}` with real handler in `verseActionRegistry.ts:337-340` |
| 3 | MeditateTabContent & DailyHub Wiring | [COMPLETE] | 2026-04-08 | Wired preload hook, VersePromptCard, tab-clearing via isActive, location.state passing in MeditateTabContent.tsx; passed isActive prop from DailyHub.tsx. Visual verified at 1440px, 375px. |
| 4 | Sub-Pages Batch 1 (Breathing, Soaking, Gratitude) | [COMPLETE] | 2026-04-08 | Added useLocation + MeditationVerseContext reading + verseContext spread in save calls for BreathingExercise.tsx, ScriptureSoaking.tsx, GratitudeReflection.tsx |
| 5 | Sub-Pages Batch 2 (ACTS, Psalms, Examen) | [COMPLETE] | 2026-04-08 | Same pattern for ActsPrayerWalk.tsx, PsalmReading.tsx, ExamenReflection.tsx |
| 6 | Tests | [COMPLETE] | 2026-04-08 | Created MeditateTabContent.test.tsx with 8 tests covering verse card rendering, removal, skeleton, invalid params, all-complete coexistence, state passing, and tab-clearing |
