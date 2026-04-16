# Implementation Plan: Devotional Context Banner — "View Full Devotional" Link

**Spec:** `_specs/devotional-context-banner-link.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/devotional-context-banner-link`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a small UI enhancement to three existing components. No new components, no new state beyond one boolean, no new hooks, no new routes, no data model changes, no localStorage changes.

**Files to modify:**

1. **`frontend/src/components/daily/JournalInput.tsx`** (376 lines) — Contains the devotional context banners (guided mode at lines 206-237 and free-write mode at lines 264-288). Each banner currently has a single dismiss button. We add a "View full devotional" `<a>` link and wrap both actions in a flex container.
2. **`frontend/src/components/daily/PrayTabContent.tsx`** (241 lines) — Currently passes `prayContext.customPrompt` as `initialText` to `PrayerInput` (line 88) but does NOT render a visible context banner. We add a devotional context banner (matching JournalInput's guided-mode pattern) with dismiss + "View full devotional" link, rendered directly in PrayTabContent (between the GlowBackground open and the PrayerResponse/PrayerInput section).
3. **`frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`** (~633 lines) — Existing devotional context tests (lines 541-633). We add tests for the new "View full devotional" link in both guided and free-write modes.
4. **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** (~980 lines) — Existing devotional context tests (lines 841-876). We add tests for the new Pray tab context banner with dismiss and link.

**Component hierarchy:**
- `DailyHub.tsx` manages `prayContext` state (line 61) and passes it to both `PrayTabContent` (line 301) and `JournalTabContent` (line 313)
- `JournalTabContent` passes `prayContext` down to `JournalInput` (line 294)
- `PrayTabContent` currently only uses `prayContext.customPrompt` to pre-fill `initialText` — it does NOT pass `prayContext` to `PrayerInput`

**Existing banner pattern (from JournalInput lines 208-236):**
```tsx
<div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3" role="status">
  <p className="text-sm text-white/80">
    Reflecting on today's devotional on <span className="font-medium">{prayContext.topic}</span>
  </p>
  <button onClick={onDismissContext} className="mt-1 text-xs text-primary underline hover:text-primary-light ...">
    Write about something else
  </button>
</div>
```

**Test patterns:**
- Both test files wrap in `MemoryRouter > AuthProvider > ToastProvider > AuthModalProvider`
- PrayTabContent tests use `vi.useFakeTimers()` and mock audio providers
- JournalTabContent tests mock `useUnsavedChanges` and audio providers
- Devotional context in JournalTabContent test uses `prayContext: { from: 'devotional', topic: 'Trust', customPrompt: '...' }`

**ExternalLink icon usage:** Already imported in `frontend/src/components/local-support/ListingCard.tsx` — pattern: `import { ExternalLink } from 'lucide-react'`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View context banner (Journal) | Only appears in auth-gated devotional→journal flow | N/A — inherited from existing flow | Banner only renders when `prayContext?.from === 'devotional'`, which requires auth-gated CTA |
| View context banner (Pray) | Only appears in auth-gated devotional→pray flow | N/A — inherited from existing flow | Banner only renders when `prayContext?.from === 'devotional'`, which requires auth-gated CTA |
| Click "View full devotional" | N/A — static `<a>` link, no auth needed | Steps 1, 2 | No auth check — navigation only |

No new auth gates needed. All banners are already behind auth-gated flows.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Context banner | background | `bg-primary/5` | JournalInput.tsx:209 |
| Context banner | border | `border border-primary/20` | JournalInput.tsx:209 |
| Context banner | border-radius | `rounded-lg` | JournalInput.tsx:209 |
| Context banner | padding | `p-3` | JournalInput.tsx:209 |
| Context banner | text | `text-sm text-white/80` | JournalInput.tsx:210 |
| Dismiss link | style | `text-xs text-primary underline hover:text-primary-light` | JournalInput.tsx:216-217 |
| "View full devotional" link | style | `text-xs text-white/60 underline hover:text-white/80` | spec design notes |
| ExternalLink icon | size | `h-3 w-3` (12px) | spec design notes |
| Links container | layout | `flex flex-wrap items-center gap-x-4 gap-y-1` | spec design notes |
| Focus ring | style | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded` | spec design notes + existing pattern |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Context banners use `border-primary/20 bg-primary/5 rounded-lg p-3` — match exactly
- Inner-page secondary text uses `text-white/60` per Text Opacity Standards in `09-design-system.md`
- Focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` — existing pattern in JournalInput
- `ExternalLink` is imported from `lucide-react` — same icon library used everywhere
- Dismiss buttons use `text-primary underline hover:text-primary-light` — visually dominant, "View full devotional" must be subordinate (`text-white/60`)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature, no new data models or localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Both links wrap to separate lines via `flex-wrap` + `gap-y-1`; each meets 44px touch target via `min-h-[44px]` on the `<a>` |
| Tablet | 768px | Both links on same row via `flex` + `gap-x-4` |
| Desktop | 1440px | Same as tablet — both links on one row |

---

## Vertical Rhythm

N/A — modifying existing banner internals only. No section spacing changes. Banner `mb-4` unchanged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `ExternalLink` is available from `lucide-react` (verified: used in ListingCard.tsx)
- [x] `prayContext` prop is already wired from DailyHub → PrayTabContent (verified: DailyHub.tsx:301)
- [x] JournalInput's context banners render at lines 206-237 (guided) and 264-288 (free-write)
- [x] PrayTabContent has NO visible context banner currently (only textarea pre-fill at line 88)
- [x] All auth-gated actions from the spec are accounted for in the plan (none — inherited)
- [x] Design system values are verified from codebase inspection (JournalInput.tsx lines 209-217)
- [x] No [UNVERIFIED] values — all styling matches existing patterns or spec design notes
- [x] No recon report needed (no new visual sections, modifying existing banner internals)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to render Pray tab banner | In `PrayTabContent.tsx` directly, not in `PrayerInput` | PrayerInput has no `prayContext` prop and is a general-purpose input. Banner is context-specific to the tab, matching the JournalTabContent → JournalInput split pattern |
| `contextDismissed` state location | New `useState` in PrayTabContent | Matches JournalTabContent pattern (line 59). Reset via useEffect when prayContext changes |
| Link element | `<a href>` not `<Link>` | Opening in new tab (`target="_blank"`) — React Router `<Link>` doesn't support `target`. Plain `<a>` is correct |
| Banner visibility when prayer is loading/displayed | Hide banner when `isLoading || prayer` | User has already submitted — banner would be confusing alongside the prayer response |
| Free-write mode banner in Pray tab | Not applicable | Pray tab has no mode toggle — there is only one banner variant |

---

## Implementation Steps

### Step 1: Add "View full devotional" link to JournalInput context banners

**Objective:** Enhance both guided-mode and free-write-mode devotional context banners with a "View full devotional" `<a>` link in a flex container alongside the existing dismiss button.

**Files to create/modify:**
- `frontend/src/components/daily/JournalInput.tsx` — Add ExternalLink import, restructure banner actions into flex containers

**Details:**

1. Add `ExternalLink` to the lucide-react import at line 2
2. **Guided-mode devotional banner (lines 223-237):** Replace the standalone dismiss `<button>` with a flex container:
   ```tsx
   <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
     <button
       type="button"
       onClick={onDismissContext}
       className="inline-flex min-h-[44px] items-center text-xs text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
     >
       Write about something else
     </button>
     <a
       href="/daily?tab=devotional"
       target="_blank"
       rel="noopener noreferrer"
       className="inline-flex min-h-[44px] items-center gap-1 text-xs text-white/60 underline hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
     >
       View full devotional
       <ExternalLink className="h-3 w-3" aria-hidden="true" />
     </a>
   </div>
   ```
3. **Guided-mode pray banner (lines 208-221):** Same flex container treatment — wrap the existing "Write about something else" button. Add the "View full devotional" link ONLY when `prayContext?.from === 'devotional'` is false (pray context doesn't need it). Actually, this banner is for `prayContext?.from === 'pray'` so NO change needed here.
4. **Free-write devotional banner (lines 277-288):** Replace the inline `<button>` within the `<p>` with a structured layout. Change from `<p>` to `<div>`:
   ```tsx
   <div className="mb-4 text-sm text-white/50">
     <p>Reflecting on today's devotional on {prayContext.topic ?? 'today\u2019s reading'}.</p>
     <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
       <button ... className="inline-flex min-h-[44px] items-center text-primary underline hover:text-primary-light ...">
         Dismiss
       </button>
       <a href="/daily?tab=devotional" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1 text-xs text-white/60 underline hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded">
         View full devotional
         <ExternalLink className="h-3 w-3" aria-hidden="true" />
       </a>
     </div>
   </div>
   ```

**Auth gating:** None — inherited from existing flow.

**Responsive behavior:**
- Desktop (1440px): Both links on same row (flex row, gap-x-4)
- Tablet (768px): Same as desktop
- Mobile (375px): Links wrap to separate lines via `flex-wrap` + `gap-y-1`; each link has `min-h-[44px]` for touch targets

**Guardrails (DO NOT):**
- DO NOT change the guided-mode `prayContext?.from === 'pray'` banner — it has no "View full devotional" link (pray context, not devotional)
- DO NOT change any conditional rendering logic — only restructure the action area within existing banners
- DO NOT change the banner's outer `div` classes (`mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3`)
- DO NOT change the `role="status"` or `aria-live` attributes on the banner wrapper
- DO NOT use `<Link>` from react-router-dom — use plain `<a>` with `target="_blank"`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| guided-mode devotional banner has "View full devotional" link | integration | Render JournalTabContent with devotional prayContext; verify link present with correct href and target |
| "View full devotional" link opens in new tab | integration | Verify `target="_blank"` and `rel="noopener noreferrer"` attributes |
| ExternalLink icon is aria-hidden | integration | Verify the SVG icon has `aria-hidden="true"` |
| free-write mode devotional banner has "View full devotional" link | integration | Switch to free-write mode, verify link present |
| dismiss still works in guided mode with devotional context | integration | Click "Write about something else" — banner disappears (existing test, verify not broken) |
| dismiss still works in free-write mode with devotional context | integration | Click "Dismiss" — banner disappears (existing test, verify not broken) |
| pray context banner does NOT have "View full devotional" link | integration | Render with `from: 'pray'` context — verify no "View full devotional" link |

**Expected state after completion:**
- [ ] JournalInput guided-mode devotional banner shows both "Write about something else" and "View full devotional" links in a flex row
- [ ] JournalInput free-write devotional banner shows both "Dismiss" and "View full devotional" links in a flex row
- [ ] Pray context banners (from: 'pray') are unchanged
- [ ] All existing JournalTabContent tests still pass
- [ ] `ExternalLink` imported from lucide-react

---

### Step 2: Add devotional context banner to PrayTabContent

**Objective:** Add a visible devotional context banner to the Pray tab (matching JournalInput's guided-mode pattern) with dismiss and "View full devotional" link.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add banner with dismiss state, ExternalLink import

**Details:**

1. Add `ExternalLink` to the lucide-react import (currently no lucide imports in this file — add fresh import)
2. Add `contextDismissed` state:
   ```tsx
   const [contextDismissed, setContextDismissed] = useState(false)
   ```
3. Add useEffect to reset `contextDismissed` when `prayContext` changes (matching JournalTabContent pattern at line 80-86):
   ```tsx
   useEffect(() => {
     if (prayContext?.from === 'devotional' && prayContext.customPrompt) {
       setContextDismissed(false)
     }
   }, [prayContext])
   ```
4. Render the banner inside the `max-w-2xl` container div (line 193), BEFORE the PrayerResponse/PrayerInput conditional blocks (line 195). Only show when `prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && !isLoading && !prayer`:
   ```tsx
   {prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && !isLoading && !prayer && (
     <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3" role="status" aria-live="polite">
       <p className="text-sm text-white/80">
         Praying about today&apos;s devotional on{' '}
         <span className="font-medium">{prayContext.topic ?? 'today\u2019s reading'}</span>
       </p>
       <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
         <button
           type="button"
           onClick={() => setContextDismissed(true)}
           className="inline-flex min-h-[44px] items-center text-xs text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
         >
           Pray about something else
         </button>
         <a
           href="/daily?tab=devotional"
           target="_blank"
           rel="noopener noreferrer"
           className="inline-flex min-h-[44px] items-center gap-1 text-xs text-white/60 underline hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
         >
           View full devotional
           <ExternalLink className="h-3 w-3" aria-hidden="true" />
         </a>
       </div>
     </div>
   )}
   ```

**Auth gating:** None — inherited from existing flow. The banner only appears when `prayContext?.from === 'devotional'`, which requires having clicked a CTA from the devotional tab (auth-gated flow).

**Responsive behavior:**
- Desktop (1440px): Both links on same row
- Tablet (768px): Same as desktop
- Mobile (375px): Links wrap to separate lines via `flex-wrap` + `gap-y-1`

**Guardrails (DO NOT):**
- DO NOT modify PrayerInput.tsx — the banner lives in PrayTabContent, not PrayerInput
- DO NOT change the existing textarea pre-fill logic (lines 80-92) — the banner is additive
- DO NOT show the banner when prayer is loading or displayed (`!isLoading && !prayer`)
- DO NOT add any new localStorage keys
- DO NOT change the `prayContext` type or add new fields

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| devotional context banner appears when prayContext.from === 'devotional' | integration | Render with devotional prayContext; verify banner text "Praying about today's devotional on Trust" |
| banner has "Pray about something else" dismiss button | integration | Verify button text and click dismisses banner |
| banner has "View full devotional" link with correct attributes | integration | Verify href="/daily?tab=devotional", target="_blank", rel="noopener noreferrer" |
| banner hidden when prayer is loading | integration | Generate prayer (trigger loading state), verify banner not visible |
| banner hidden when prayer is displayed | integration | Complete prayer generation, verify banner not visible |
| contextDismissed resets when prayContext changes | integration | Dismiss banner, re-render with new prayContext, verify banner reappears |
| no banner when prayContext is null | integration | Render without prayContext, verify no banner |
| no banner when prayContext.from === 'pray' (not devotional) | integration | Render with pray context, verify no devotional banner |

**Expected state after completion:**
- [ ] PrayTabContent renders devotional context banner when `prayContext.from === 'devotional'`
- [ ] Banner has both "Pray about something else" (dismiss) and "View full devotional" (new tab) links
- [ ] Banner disappears on dismiss
- [ ] Banner hidden during prayer loading/display
- [ ] All existing PrayTabContent tests still pass

---

### Step 3: Update tests for JournalTabContent

**Objective:** Add tests for the new "View full devotional" link in JournalTabContent's devotional context banners (guided + free-write modes).

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add new test cases within the existing `describe('JournalTabContent devotional context')` block

**Details:**

Add the following tests inside the existing `describe('JournalTabContent devotional context')` block (after line 632):

1. **`'guided-mode devotional banner has "View full devotional" link'`** — Render with devotional prayContext. Query `screen.getByRole('link', { name: /view full devotional/i })`. Assert `href` is `/daily?tab=devotional`, `target` is `_blank`, `rel` is `noopener noreferrer`.

2. **`'free-write mode devotional banner has "View full devotional" link'`** — Render with devotional prayContext, switch to Free Write mode. Query same link. Assert same attributes.

3. **`'ExternalLink icon is aria-hidden in guided mode'`** — Render with devotional prayContext. Find the link, find the SVG child. Assert `aria-hidden="true"`.

4. **`'pray context banner does not have "View full devotional" link'`** — Render with `{ from: 'pray', topic: 'anxiety' }`. Assert `screen.queryByRole('link', { name: /view full devotional/i })` returns null.

5. **`'dismiss still works in guided mode alongside "View full devotional"'`** — Render with devotional prayContext. Click "Write about something else". Verify both links disappear (banner dismissed).

6. **`'dismiss still works in free-write mode alongside "View full devotional"'`** — Render with devotional prayContext, switch to Free Write. Click "Dismiss". Verify both links disappear.

**Auth gating:** N/A — tests run with simulated auth (existing pattern: `localStorage.setItem('wr_auth_simulated', 'true')` in `beforeEach`).

**Responsive behavior:** N/A: no UI impact (test file).

**Guardrails (DO NOT):**
- DO NOT modify existing tests — only add new ones
- DO NOT change the `renderJournalTab` helper or mocks
- DO NOT add new mock dependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tests listed above | integration | 6 new tests covering link presence, attributes, icon a11y, and dismiss behavior |

**Expected state after completion:**
- [ ] 6 new tests added to `JournalTabContent.test.tsx`
- [ ] All existing tests still pass
- [ ] New tests verify link href, target, rel, icon aria-hidden, and dismiss behavior

---

### Step 4: Update tests for PrayTabContent

**Objective:** Add tests for the new devotional context banner in PrayTabContent.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add new test cases within or after the existing `describe('PrayTabContent devotional context')` block

**Details:**

Add tests inside (or adjacent to) the existing `describe('PrayTabContent devotional context')` block (after line 876):

1. **`'devotional context banner appears with prayContext.from === "devotional"'`** — Render with devotional prayContext. Query `screen.getByRole('status')` or `screen.getByText(/praying about today.s devotional/i)`. Assert present.

2. **`'banner has "Pray about something else" dismiss button'`** — Render with devotional prayContext. Click `screen.getByRole('button', { name: /pray about something else/i })`. Assert banner text disappears.

3. **`'banner has "View full devotional" link with correct attributes'`** — Query `screen.getByRole('link', { name: /view full devotional/i })`. Assert `href`, `target`, `rel`.

4. **`'banner hidden when prayer is loading'`** — Generate a prayer (trigger loading). Assert banner text not in document.

5. **`'banner hidden when prayer response is displayed'`** — Complete generation. Assert banner text not in document.

6. **`'no devotional banner when prayContext is null'`** — Render without prayContext. Assert no "Praying about today's devotional" text.

7. **`'no devotional banner when prayContext.from === "pray"'`** — Render with `{ from: 'pray', topic: 'anxiety' }`. Assert no devotional banner.

8. **`'contextDismissed resets when prayContext changes'`** — Dismiss banner, rerender with new prayContext. Assert banner reappears.

**Auth gating:** N/A — tests run with simulated auth.

**Responsive behavior:** N/A: no UI impact (test file).

**Guardrails (DO NOT):**
- DO NOT modify existing PrayTabContent tests
- DO NOT change the `renderPrayTab` helper signature (but the helper already accepts `prayContext` — no change needed)
- DO NOT add new mock dependencies beyond what's already there

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tests listed above | integration | 8 new tests covering banner presence, dismiss, link attributes, loading/display hiding, and context reset |

**Expected state after completion:**
- [ ] 8 new tests added to `PrayTabContent.test.tsx`
- [ ] All existing tests still pass
- [ ] New tests verify banner visibility, dismiss, link attributes, and conditional hiding

---

### Step 5: Run full test suite and verify build

**Objective:** Confirm all tests pass and build is clean.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `cd frontend && pnpm test` — expect all tests pass (including the ~14 new tests from steps 3-4)
2. Run `cd frontend && pnpm build` — expect 0 errors, 0 warnings
3. Run `cd frontend && pnpm lint` — expect no new lint errors

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT skip this step
- DO NOT ignore pre-existing test failures — note them but do not fix unrelated issues

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full suite | verification | All tests pass, build clean |

**Expected state after completion:**
- [ ] All tests pass (5,613+ existing + ~14 new)
- [ ] Build produces 0 errors
- [ ] No new lint errors introduced

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add "View full devotional" link to JournalInput banners |
| 2 | — | Add devotional context banner to PrayTabContent |
| 3 | 1 | Update JournalTabContent tests for new link |
| 4 | 2 | Update PrayTabContent tests for new banner |
| 5 | 1, 2, 3, 4 | Run full test suite and verify build |

Steps 1 and 2 are independent and can execute in parallel.
Steps 3 and 4 are independent of each other but depend on their respective implementation steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | JournalInput banner links | [COMPLETE] | 2026-04-06 | Added ExternalLink import, flex container with "View full devotional" link to both guided-mode and free-write-mode devotional banners in JournalInput.tsx |
| 2 | PrayTabContent banner | [COMPLETE] | 2026-04-06 | Added ExternalLink import, contextDismissed state + reset useEffect, devotional context banner with dismiss + link in PrayTabContent.tsx |
| 3 | JournalTabContent tests | [COMPLETE] | 2026-04-06 | 6 new tests added: link presence (guided + free-write), icon a11y, pray context exclusion, dismiss behavior (guided + free-write) |
| 4 | PrayTabContent tests | [COMPLETE] | 2026-04-06 | 8 new tests added: banner presence, dismiss, link attributes, loading/display hiding, null/pray context exclusion, contextDismissed reset |
| 5 | Full test suite verification | [COMPLETE] | 2026-04-06 | 5629 tests pass (+14 new), 2 pre-existing failures (SongPickSection). Build: 0 errors. Lint: clean. |
