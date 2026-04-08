# Implementation Plan: BB-11 Daily Hub Bridge — Journal

**Spec:** `_specs/bb-11-daily-hub-bridge-journal.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

BB-11 reuses all shared plumbing from BB-10 (Pray bridge). The changes are minimal and structurally identical to BB-10, targeting only:

- **Refactor targets (BB-10 code to parameterize):**
  - `src/hooks/dailyHub/useVerseContextPreload.ts` — hardcodes `tab !== 'pray'` guard (line 17). Parameterize to accept a `tab` argument.
  - `src/components/daily/VersePromptCard.tsx` — hardcodes framing line "What do you want to say to God about this?" (line 49). Add `framingLine` prop.

- **New constant:**
  - `src/constants/daily-experience.ts` — add `VERSE_FRAMINGS` lookup for centralized framing lines.

- **Registry fix:**
  - `src/lib/bible/verseActionRegistry.ts` — replace empty `onInvoke: () => {}` on journal handler (line 322) with real handler mirroring the pray handler.

- **Journal tab integration:**
  - `src/components/daily/JournalTabContent.tsx` — call `useVerseContextPreload('journal')`, mount `VersePromptCard`/`VersePromptSkeleton`, pass `verseContext` to save flow.

- **Type extension:**
  - `src/types/daily-experience.ts` — add optional `verseContext` field to `SavedJournalEntry`.

### Existing Patterns (from BB-10)

**useVerseContextPreload (47 lines):**
- Reads `searchParams.get('tab')`, currently hardcoded to `'pray'`
- Parses verse context via `parseVerseContextFromUrl(searchParams)`
- Deduplicates with `lastConsumedKey` ref
- Cleans URL immediately via `setSearchParams({ tab: 'pray' }, { replace: true })` — this must become `{ tab }` (the passed parameter)
- Returns `{ verseContext, isHydrating, clearVerseContext }`

**VersePromptCard (67 lines):**
- Props: `{ context: VerseContext, onRemove: () => void }`
- Uses Tier 2 treatment: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4`
- Framing line hardcoded at line 49: `"What do you want to say to God about this?"`
- `VersePromptSkeleton` exported from same file

**PrayTabContent integration (from BB-10 Step 6):**
- Hook called at top of component: `const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload()`
- VersePromptCard mounted between DevotionalPreviewPanel and PrayerInput/PrayerResponse
- Guard: only show card/skeleton when `!isLoading && !prayer`
- verseContext passed through to PrayerResponse for save

**verseActionRegistry pray handler (lines 299-312):**
```typescript
onInvoke: (selection, ctx) => {
  const url = buildDailyHubVerseUrl('pray', selection)
  ctx.closeSheet({ navigating: true })
  ctx.navigate(url)
}
```
Journal handler at lines 314-323 has identical structure but empty `onInvoke: () => {}`.

**JournalTabContent save flow (lines 180-223):**
- `handleEntrySave` receives `{ content, mode, promptText? }` from `JournalInput`
- Creates `SavedJournalEntry` with `id`, `content`, `timestamp`, `mode`, `promptText`
- The verseContext must be captured from component state and included in the entry

**JournalInput save flow (lines 139-156):**
- Auth-gated: logged out → auth modal
- Calls `onSave({ content: text, mode, promptText })` — does NOT need to know about verseContext
- The verseContext is captured in `JournalTabContent` (parent), not `JournalInput`

### Test Patterns

- **Hook tests:** `renderHook` from `@testing-library/react`, wrapper with `MemoryRouter` + `initialEntries`
- **Component tests:** React Testing Library, wrapped in `AuthProvider`, `ToastProvider`, `AuthModalProvider`, `MemoryRouter`
- **JournalTabContent tests** mock: `AudioProvider` (useAudioState/useAudioDispatch), `useScenePlayer`, `useFaithPoints`
- **VersePromptCard tests:** Simple render tests with mock `VerseContext` objects
- **Registry tests:** Unit tests calling `handler.onInvoke(selection, ctx)` with mock context

### Auth Gating

Per the spec, BB-11 introduces NO new auth gates. Navigation from Bible → Journal is public. Auth gating on journal submit is inherited from the existing `JournalInput.handleSave`. The verse prompt card renders for all users.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap "Journal about this" in action sheet | No gate | Step 5 | N/A — navigation only |
| View verse prompt card on Journal tab | No gate | Step 4 | N/A — renders for all users |
| Type in journal composer | No gate (existing) | N/A | Existing behavior unchanged |
| Remove verse prompt card (X) | No gate | Step 4 | N/A — UI-only interaction |
| Submit journal entry | Existing auth gate | N/A | Existing `useAuthModal` in `JournalInput.handleSave` |

No new auth gates. Existing submit gate applies unchanged.

---

## Design System Values (for UI steps)

No new UI components are created in BB-11. The `VersePromptCard` and `VersePromptSkeleton` from BB-10 are reused directly. The only visual change is the framing line text, which uses the same styling (`text-sm text-white/60 mt-3`).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| VersePromptCard | framing line | `text-sm text-white/60 mt-3` | BB-10 VersePromptCard.tsx:48 |
| VersePromptCard | all other styles | Unchanged from BB-10 | VersePromptCard.tsx:17-51 |
| VersePromptSkeleton | all styles | Unchanged from BB-10 | VersePromptCard.tsx:56-65 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components.
- Pray and Journal textareas use the canonical static white box-shadow glow. Do NOT use `animate-glow-pulse` (deprecated) or cyan border (deprecated).
- Frosted glass cards: use the `FrostedCard` component. The VersePromptCard does NOT use FrostedCard — it uses the lighter Tier 2 pattern (`bg-white/[0.04]`).
- Verse reference uses Lora serif (`font-serif`). Framing line uses Inter sans (default `font-sans`).
- Zero raw hex values in components — all colors use Tailwind classes or design tokens.
- `prefers-reduced-motion`: animations gated behind `useReducedMotion()` hook.
- BB-10 execution log showed no design system deviations — patterns are stable.

---

## Shared Data Models

**Types this spec modifies:**

```typescript
// src/types/daily-experience.ts — add optional field to SavedJournalEntry
export interface SavedJournalEntry {
  id: string
  content: string
  timestamp: string
  mode: JournalMode
  promptText?: string
  reflection?: string
  verseContext?: JournalVerseContext  // NEW — BB-11
}

// NEW type — same shape as PrayerVerseContext
export interface JournalVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}
```

**Constants this spec adds:**

```typescript
// src/constants/daily-experience.ts
export const VERSE_FRAMINGS = {
  pray: 'What do you want to say to God about this?',
  journal: 'What comes up as you sit with this?',
  meditate: '', // BB-12 will fill this in
} as const
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_journal_draft` | Read | Existing draft checked on bridge arrival — preserved alongside verse context |

No new localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | VersePromptCard full-width within `px-4` padding, text wraps naturally, X button 44px tap target |
| Tablet | 768px | Same layout — slightly more horizontal space from `max-w-2xl` centering |
| Desktop | 1440px | Same layout — card within `max-w-2xl` container |

The verse prompt card inherits the Journal tab's existing responsive behavior. No breakpoint-specific layout changes introduced by BB-11.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The VersePromptCard is a full-width block element stacked above the journal composer.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| VersePromptCard → JournalInput mode toggle | 16px (`mb-4` on VersePromptCard) | VersePromptCard.tsx:17 |

Same spacing as BB-10 (VersePromptCard → PrayerInput textarea).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-10 is committed and all its tests pass
- [x] `useVerseContextPreload`, `VersePromptCard`, `VersePromptSkeleton`, `buildDailyHubVerseUrl`, `verseContext.ts` all exist from BB-10
- [x] The journal handler in `verseActionRegistry.ts` has an empty `onInvoke` (confirmed at line 322)
- [x] `useVerseContextPreload` hardcodes `tab !== 'pray'` at line 17
- [x] `VersePromptCard` hardcodes framing line at line 49
- [x] All auth-gated actions from the spec are accounted for in the plan (none new — existing submit gate inherited)
- [x] Design system values verified from BB-10 codebase (no new UI patterns)
- [x] No [UNVERIFIED] values — all styling comes from existing BB-10 components
- [x] No deprecated patterns used
- [x] `SavedJournalEntry` type at `daily-experience.ts:98-105` is the correct extension point

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to mount VersePromptCard in Journal tab | Between draft conflict dialog and `<JournalInput>` component, inside the `mx-auto max-w-2xl` div | Mirrors BB-10 placement pattern (between DevotionalPreviewPanel and PrayerInput). The card must appear above the composer but below any draft conflict dialog. |
| Should verse context switch journal to Guided mode? | No — mode stays as-is | Spec says "The composer input itself is NOT pre-populated with text — the verse is the prompt, not the content." The verse context is independent of journal mode. User can be in Guided or Free Write; the prompt card shows either way. |
| What happens if both devotional context AND verse context arrive? | Verse context takes priority via URL params; devotional context via prayContext prop | These are mutually exclusive in practice — devotional CTA goes through `onSwitchTab`/`prayContext`, Bible bridge goes through URL params. If both exist, both render (DevotionalPreviewPanel + VersePromptCard). |
| Reuse `PrayerVerseContext` or create `JournalVerseContext`? | Create `JournalVerseContext` as a separate type with identical shape | Semantic clarity — the types serve different features even though the shape is the same. If one evolves independently later, no coupling. |
| Hide VersePromptCard after saving? | No — card stays visible after save | Unlike Pray tab (where prayer generation replaces the input), Journal tab shows saved entries below. The prompt card stays as context for subsequent entries. User can manually dismiss via X. |
| Guard VersePromptCard behind `activeTab === 'journal'`? | No guard needed | `useVerseContextPreload('journal')` already gates on `tab === 'journal'` in the URL params. The hook only fires when the journal tab is active via URL. |

---

## Implementation Steps

### Step 1: Types + Constants (foundation)

**Objective:** Add `JournalVerseContext` type to `SavedJournalEntry`, and add `VERSE_FRAMINGS` constant. Update `useVerseContextPreload` signature type. Write tests first for the constant.

**Files to create/modify:**
- `frontend/src/types/daily-experience.ts` — add `JournalVerseContext` interface, add optional `verseContext` field to `SavedJournalEntry`
- `frontend/src/constants/daily-experience.ts` — add `VERSE_FRAMINGS` constant

**Details:**

**Type changes (`daily-experience.ts`):**

Add after `PrayerVerseContext` (line 156):

```typescript
/** Verse context attached to saved journal entries */
export interface JournalVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}
```

Add optional `verseContext` field to `SavedJournalEntry` (line 104, before closing `}`):

```typescript
  verseContext?: JournalVerseContext
```

**Constant (`daily-experience.ts`):**

Add after `BREATHING_PHASES` (line 67):

```typescript
export const VERSE_FRAMINGS = {
  pray: 'What do you want to say to God about this?',
  journal: 'What comes up as you sit with this?',
  meditate: '',
} as const
```

**Auth gating:** N/A — type/constant definitions.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT remove or rename `PrayerVerseContext` — it is used by BB-10's PrayTabContent
- Do NOT change the shape of `SavedJournalEntry`'s existing fields
- Do NOT add `verseContext` as a required field — it must be optional to avoid breaking existing entries

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| VERSE_FRAMINGS has pray key | unit | `VERSE_FRAMINGS.pray` equals the existing BB-10 framing line |
| VERSE_FRAMINGS has journal key | unit | `VERSE_FRAMINGS.journal` equals "What comes up as you sit with this?" |
| VERSE_FRAMINGS has meditate key | unit | `VERSE_FRAMINGS.meditate` exists (empty string, placeholder for BB-12) |

**Expected state after completion:**
- [ ] `JournalVerseContext` type exported
- [ ] `SavedJournalEntry` has optional `verseContext` field
- [ ] `VERSE_FRAMINGS` constant exported with 3 keys
- [ ] `pnpm build` passes
- [ ] Existing tests pass (type change is additive)

---

### Step 2: Parameterize `useVerseContextPreload` (refactor + test update)

**Objective:** Change the hook from hardcoded `'pray'` to accept a `tab` parameter. Update existing tests. Write new tests for `'journal'` tab. TDD: update tests first (red), then implementation (green).

**Files to create/modify:**
- `frontend/src/hooks/dailyHub/__tests__/useVerseContextPreload.test.ts` — update existing tests to pass `'pray'`, add journal-tab tests
- `frontend/src/hooks/dailyHub/useVerseContextPreload.ts` — accept `tab` parameter

**Details:**

**Hook signature change:**

```typescript
// Before:
export function useVerseContextPreload()

// After:
export function useVerseContextPreload(tab: string)
```

**Implementation changes (3 lines):**

1. Line 6: `export function useVerseContextPreload(tab: string) {`
2. Line 17: `if (searchParams.get('tab') !== tab) return` (was `!== 'pray'`)
3. Line 30: `setSearchParams({ tab }, { replace: true })` (was `{ tab: 'pray' }`)

**Test updates:**

All existing tests (7 tests) must be updated to pass `'pray'` as the argument:
```typescript
// Before:
renderHook(() => useVerseContextPreload(), { ... })

// After:
renderHook(() => useVerseContextPreload('pray'), { ... })
```

**New tests to add:**

8. `returns verseContext for journal tab` — URL: `/daily?tab=journal&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible`, hook called with `'journal'` → `verseContext` populated
9. `does not fire when tab does not match argument` — URL has `?tab=pray&verseBook=...`, hook called with `'journal'` → `verseContext` stays null
10. `cleans URL to tab=journal after parse` — after hook fires with `'journal'`, URL becomes `/daily?tab=journal`

**Auth gating:** N/A — hook runs for all users.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT change the hook's return type — `{ verseContext, isHydrating, clearVerseContext }` stays the same
- Do NOT break the existing PrayTabContent caller — it must be updated in this same step to pass `'pray'`
- Do NOT accept a default parameter value — each caller must explicitly pass the tab name

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing 7 tests) — updated to pass 'pray' | unit | All existing tests pass with explicit 'pray' argument |
| returns verseContext for journal tab | unit | Journal tab with valid verse params → hydrated context |
| does not fire when tab mismatch | unit | Pray URL params + journal hook → null |
| cleans URL to tab=journal | unit | After parse, URL shows `?tab=journal` |

**Expected state after completion:**
- [ ] All 10 tests pass (7 updated + 3 new)
- [ ] `useVerseContextPreload` accepts `tab: string`
- [ ] PrayTabContent updated to pass `'pray'` (build would fail otherwise)
- [ ] `pnpm build` passes

---

### Step 3: Parameterize `VersePromptCard` (refactor + test update)

**Objective:** Add `framingLine` prop to `VersePromptCard`. Update existing tests. Wire `VERSE_FRAMINGS` into PrayTabContent's usage. TDD: update tests first, then implementation.

**Files to create/modify:**
- `frontend/src/components/daily/VersePromptCard.tsx` — add `framingLine` prop
- `frontend/src/components/daily/__tests__/VersePromptCard.test.tsx` — update existing tests, add journal framing test
- `frontend/src/components/daily/PrayTabContent.tsx` — pass `VERSE_FRAMINGS.pray` as `framingLine` prop

**Details:**

**Props change:**

```typescript
// Before:
interface VersePromptCardProps {
  context: VerseContext
  onRemove: () => void
}

// After:
interface VersePromptCardProps {
  context: VerseContext
  onRemove: () => void
  framingLine: string
}
```

**Component change (line 49):**

```tsx
// Before:
<p className="mt-3 text-sm text-white/60">
  What do you want to say to God about this?
</p>

// After:
<p className="mt-3 text-sm text-white/60">
  {framingLine}
</p>
```

**PrayTabContent update:**

Where `VersePromptCard` is mounted (add `framingLine` prop):
```tsx
<VersePromptCard
  context={verseContext}
  onRemove={clearVerseContext}
  framingLine={VERSE_FRAMINGS.pray}
/>
```

Import `VERSE_FRAMINGS` from `@/constants/daily-experience`.

**Existing test updates:**

All tests that render `VersePromptCard` must pass a `framingLine` prop. The existing "renders framing line" test should assert the passed-in text, not a hardcoded string:

```typescript
// Before:
render(<VersePromptCard context={mockContext} onRemove={vi.fn()} />)
expect(screen.getByText('What do you want to say to God about this?')).toBeInTheDocument()

// After:
render(<VersePromptCard context={mockContext} onRemove={vi.fn()} framingLine="What do you want to say to God about this?" />)
expect(screen.getByText('What do you want to say to God about this?')).toBeInTheDocument()
```

**New test:**

11. `renders custom framing line` — pass `"What comes up as you sit with this?"` → that text visible in DOM

**Auth gating:** N/A — component renders for all users.

**Responsive behavior:** N/A: no UI impact (text content change only).

**Guardrails (DO NOT):**
- Do NOT make `framingLine` optional — every caller must provide it explicitly
- Do NOT change the framing line styling (`text-sm text-white/60 mt-3`)
- Do NOT fork the component — it must remain shared between Pray and Journal tabs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing ~10 tests) — updated to pass framingLine | unit | All existing tests pass with explicit framingLine prop |
| renders custom framing line | unit | Journal framing text renders correctly |

**Expected state after completion:**
- [ ] All ~11 tests pass
- [ ] `VersePromptCard` accepts `framingLine` prop
- [ ] PrayTabContent passes `VERSE_FRAMINGS.pray`
- [ ] Pray tab behavior unchanged (same framing text via constant)
- [ ] `pnpm build` passes

---

### Step 4: Wire into JournalTabContent — Verse Context Integration + Tests

**Objective:** Call `useVerseContextPreload('journal')` in `JournalTabContent`, mount `VersePromptCard`/`VersePromptSkeleton`, and pass `verseContext` through to the save flow. TDD: write tests first.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — add verse context tests
- `frontend/src/components/daily/JournalTabContent.tsx` — wire hook, mount card, update save handler

**Details:**

**Changes to JournalTabContent.tsx:**

1. Add imports:
```typescript
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import { VERSE_FRAMINGS } from '@/constants/daily-experience'
import type { JournalVerseContext } from '@/types/daily-experience'
```

2. Call hook at top of component (after line 43, existing hooks):
```typescript
const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload('journal')
```

3. Compute `journalVerseContext` for the save payload:
```typescript
const journalVerseContext: JournalVerseContext | null = verseContext
  ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
  : null
```

4. Mount VersePromptCard/Skeleton in the render, between the draft conflict dialog and `<JournalInput>` (inside the `mx-auto max-w-2xl` div at line 253, after the draft conflict dialog block at line 284):
```tsx
{/* Verse Prompt Card (from Bible bridge) */}
{isHydrating && <VersePromptSkeleton />}
{verseContext && (
  <VersePromptCard
    context={verseContext}
    onRemove={clearVerseContext}
    framingLine={VERSE_FRAMINGS.journal}
  />
)}
```

5. Update `handleEntrySave` to include verseContext when present. Modify line 181-187:
```typescript
const savedEntry: SavedJournalEntry = {
  id: `entry-${Date.now()}`,
  content: entry.content,
  timestamp: new Date().toISOString(),
  mode: entry.mode,
  promptText: entry.promptText,
  ...(journalVerseContext && { verseContext: journalVerseContext }),
}
```

**Test file additions:**

The test file needs to mock `loadChapterWeb` for the `useVerseContextPreload` hook:

```typescript
vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible/index'
```

New tests:

1. `renders VersePromptCard when verse params in URL` — navigate to `/daily?tab=journal&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible` → "What comes up as you sit with this?" visible
2. `does not render card when no verse params` — navigate to `/daily?tab=journal` → no framing line text
3. `removing card via X does not affect draft text` — set `wr_journal_draft` in localStorage, navigate with verse params, click X → draft text preserved in textarea
4. `skeleton shows during hydration` — mock slow `loadChapterWeb` → skeleton visible (aria-hidden element)
5. `invalid params show no card` — navigate with `verseBook=fakebook` → no card, no error
6. `saved entry includes verseContext when prompt card is showing` — navigate with verse params, type text, save → verify `verseContext` in saved entry (spy on save handler)
7. `saved entry omits verseContext when prompt card is removed` — navigate with verse params, click X, save → no `verseContext` in saved entry
8. `existing draft preserved alongside verse prompt card` — set draft in localStorage + verse params → both card and draft visible

**Auth gating:** No new gates. Existing submit gate inherited from `JournalInput.handleSave`.

**Responsive behavior:**
- Desktop (1440px): VersePromptCard within `max-w-2xl` container
- Tablet (768px): Same — responsive padding from container centering
- Mobile (375px): Full-width within `px-4`, text wraps naturally

**Guardrails (DO NOT):**
- Do NOT pre-populate the textarea with verse text — "the verse is the prompt, not the content"
- Do NOT clear the existing draft when verse context is present — "drafts survive the bridge flow"
- Do NOT switch journal mode when verse context arrives — verse context is independent of mode
- Do NOT add GlowBackground or BackgroundSquiggle
- Do NOT modify `JournalInput` — it doesn't need to know about verseContext
- Do NOT affect the DevotionalPreviewPanel rendering — both can coexist
- Do NOT hide the card after save — unlike Pray tab, Journal allows multiple entries

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders VersePromptCard when verse params in URL | integration | Card visible with correct framing |
| does not render card without verse params | integration | No card renders |
| removing card via X preserves draft | integration | Draft text unaffected |
| skeleton shows during hydration | integration | Skeleton visible with aria-hidden |
| invalid params show no card | integration | Silent degradation |
| saved entry includes verseContext | integration | verseContext in saved entry |
| saved entry omits verseContext after removal | integration | No verseContext after X |
| existing draft preserved alongside card | integration | Both card and draft visible |

**Expected state after completion:**
- [ ] All 8 new tests pass (existing JournalTabContent tests still pass)
- [ ] VersePromptCard renders above JournalInput when verse params present
- [ ] Card shows journal-specific framing: "What comes up as you sit with this?"
- [ ] Save includes verseContext when card is visible, omits when dismissed
- [ ] Existing draft preserved alongside verse prompt card
- [ ] `pnpm build` passes

---

### Step 5: Wire Registry Handler (replace journal stub)

**Objective:** Replace the empty `onInvoke` on the journal handler in `verseActionRegistry.ts` with a real handler that builds the bridge URL, closes the sheet, and navigates. Add tests.

**Files to create/modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts` — replace journal stub (line 322)
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — add journal handler tests

**Details:**

**Registry change:**

Replace line 322:
```typescript
// Before:
onInvoke: () => {},

// After:
onInvoke: (selection, ctx) => {
  const url = buildDailyHubVerseUrl('journal', selection)
  ctx.closeSheet({ navigating: true })
  ctx.navigate(url)
},
```

The `buildDailyHubVerseUrl` import already exists (added in BB-10 for the pray handler).

**Test additions:**

Mirror the BB-10 pray handler tests:

1. `journal handler calls buildDailyHubVerseUrl with journal` — invoke handler → URL built with `'journal'`
2. `journal handler calls closeSheet with navigating` — invoke handler → `closeSheet({ navigating: true })`
3. `journal handler calls navigate with URL` — invoke handler → `navigate` called with built URL
4. `journal handler passes through single verse` — single verse selection → correct URL
5. `journal handler passes through range` — multi-verse selection → correct URL

**Auth gating:** N/A — navigation is not auth-gated per the spec.

**Responsive behavior:** N/A: no UI impact (behavior change only).

**Guardrails (DO NOT):**
- Do NOT change the journal handler's `label`, `sublabel`, `icon`, or `category` — spec says these remain unchanged
- Do NOT modify the pray handler — it's already wired from BB-10
- Do NOT modify the meditate handler stub — that's BB-12
- Do NOT auth-gate the navigation — spec says "Navigates to `/daily?tab=journal` with verse params"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| journal handler calls buildDailyHubVerseUrl | unit | Called with ('journal', selection) |
| journal handler calls closeSheet with navigating | unit | closeSheet called with `{ navigating: true }` |
| journal handler calls navigate with URL | unit | navigate called with built URL |
| journal handler passes single verse | unit | Correct URL for single verse |
| journal handler passes range | unit | Correct URL for verse range |

**Expected state after completion:**
- [ ] All 5 new tests pass (existing registry tests still pass)
- [ ] Tapping "Journal about this" in action sheet navigates to `/daily?tab=journal&verseBook=...`
- [ ] `pnpm build` passes

---

### Step 6: Integration Verification

**Objective:** Verify all components work together end-to-end. Run full test suite, build, and lint.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `pnpm test` — all existing + new tests pass
2. Run `pnpm build` — zero errors, zero warnings
3. Run `pnpm lint` — no new lint errors in BB-11 files
4. Verify acceptance criteria:
   - Journal handler navigates to correct URL
   - VersePromptCard renders on Journal tab with journal framing line
   - Pray tab still works with pray framing line (no regression)
   - X button removes card without affecting draft
   - URL params cleaned after consumption (to `?tab=journal`)
   - Save includes/omits verseContext correctly
   - Invalid params degrade silently
   - Existing Journal tab behavior unchanged (mode toggle, draft persistence, devotional context, prayer wall context, challenge context, milestones)
   - Multi-verse selections render all verses
   - `VERSE_FRAMINGS` constant is the single source of truth for framing lines

**Auth gating:** N/A — verification step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any files in this step
- Do NOT skip running the full test suite — BB-11 touches shared types and shared components

**Test specifications:**

No new tests. This step validates the full suite.

**Expected state after completion:**
- [ ] All tests pass (estimated ~27 new/updated tests across Steps 1-5)
- [ ] Build passes
- [ ] Lint clean on all BB-11 files
- [ ] All acceptance criteria verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types (JournalVerseContext) + Constants (VERSE_FRAMINGS) |
| 2 | 1 | Parameterize useVerseContextPreload (uses tab arg) |
| 3 | 1 | Parameterize VersePromptCard (uses VERSE_FRAMINGS) |
| 4 | 1, 2, 3 | Wire into JournalTabContent (uses hook + component + types) |
| 5 | — | Wire registry handler (independent — uses existing buildDailyHubVerseUrl) |
| 6 | 4, 5 | Full integration verification |

**Parallelizable:** Steps 2 and 3 can run in parallel (both depend only on Step 1). Step 5 is independent of Steps 2-4 and can run at any time.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types + Constants | [COMPLETE] | 2026-04-08 | Added `JournalVerseContext` type + `verseContext?` field on `SavedJournalEntry` in `daily-experience.ts` types; added `VERSE_FRAMINGS` constant in `daily-experience.ts` constants; 3 tests pass |
| 2 | Parameterize useVerseContextPreload | [COMPLETE] | 2026-04-08 | Hook accepts `tab: string` param; removed shadowing local var; added `tab` to deps array; PrayTabContent passes `'pray'`; 10/10 hook tests + 72/72 PrayTabContent tests pass |
| 3 | Parameterize VersePromptCard | [COMPLETE] | 2026-04-08 | Added `framingLine` prop to VersePromptCard; PrayTabContent passes `VERSE_FRAMINGS.pray`; 11/11 card tests + 72/72 PrayTabContent tests pass |
| 4 | Wire JournalTabContent | [COMPLETE] | 2026-04-08 | Hook call + VersePromptCard/Skeleton mounted between draft dialog and JournalInput; save includes verseContext; 51/51 tests pass; build clean |
| 5 | Wire Registry Handler | [COMPLETE] | 2026-04-08 | Replaced empty `onInvoke` with real handler using `buildDailyHubVerseUrl('journal', ...)` + `closeSheet` + `navigate`; 45/45 registry tests pass |
| 6 | Integration Verification | [COMPLETE] | 2026-04-08 | 120/120 BB-11 tests pass; build clean; lint clean on all BB-11 files; 4 pre-existing BibleReader test failures (unrelated — BibleReaderAudio, BibleReaderHighlights, BibleReaderNotes) |
