# Implementation Plan: Draft Persistence Reassurance UI

**Spec:** `_specs/draft-persistence-reassurance-ui.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/draft-persistence-reassurance-ui`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a focused UI enhancement touching 2 existing components and their test files. No new components, no new hooks, no new routes, no new localStorage keys.

**Files to modify:**

1. **`frontend/src/components/daily/JournalInput.tsx`** — Enhance existing "Draft saved" indicator (line 345-352) with `CheckCircle2` icon, right-aligned fixed-height wrapper. Modify `handleSave` (line 140-154) to pass context-aware auth modal subtitle.
2. **`frontend/src/components/daily/PrayerInput.tsx`** (165 lines) — Add `draftSaved` state + feedback timer + "Draft saved" indicator matching Journal's enhanced pattern. No change to submission logic.
3. **`frontend/src/components/daily/PrayTabContent.tsx`** — Modify `handleGenerate` (line 104-108) to pass context-aware auth modal subtitle based on whether `inputText` is non-empty.
4. **`frontend/src/pages/__tests__/Journal.test.tsx`** — Update auth modal subtitle assertion to match new context-aware message.
5. **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** — Add tests for context-aware auth modal subtitle. Add tests for PrayerInput's draft saved indicator.

**Component hierarchy:**
- `PrayTabContent.tsx` renders `PrayerInput` and calls `handleGenerate(inputText)` — the auth modal call is in PrayTabContent, NOT PrayerInput. PrayerInput calls `onSubmit(text)` which PrayTabContent receives as `handleGenerate`.
- `JournalTabContent.tsx` renders `JournalInput` — the auth modal call is inside JournalInput's `handleSave`.

**Existing draft persistence (unchanged):**
- Journal: `wr_journal_draft` — debounced 1s save, `draftSaved` state + 2s auto-hide, feedback timer ref
- Pray: `wr_prayer_draft` — debounced 1s save, NO visual indicator currently

**Auth modal interface:** `openAuthModal(subtitle?: string, initialView?: 'login' | 'register')` from `AuthModalProvider.tsx`. Subtitle renders as `<p className="mt-2 text-center text-sm text-white/90">` inside the modal.

**Test patterns:**
- PrayTabContent tests: `MemoryRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider` → component. `vi.useFakeTimers({ shouldAdvanceTime: true })`. Auth toggled via `localStorage.setItem('wr_auth_simulated', 'true')`.
- Journal tests: Same provider wrapping. Auth mocked via `vi.mock('@/hooks/useAuth')` with `mockUseAuth.mockReturnValue(...)`.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Save journal entry (non-empty text) | Auth modal with "Your draft is safe" suffix | Step 1 | useAuth + openAuthModal (existing check in JournalInput.handleSave) |
| Save journal entry (empty text) | Existing subtitle (no change) | Step 1 | Same — `text.trim()` guard returns before auth check |
| Generate prayer (non-empty text) | Auth modal with "Your draft is safe" suffix | Step 2 | useAuth + openAuthModal (existing check in PrayTabContent.handleGenerate) |
| Generate prayer (empty text) | Existing subtitle (no change) | Step 2 | Same — PrayerInput.handleSubmit nudge guard returns before onSubmit |
| Draft saved indicator | No auth gate — shows for all users | Steps 1, 3 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Draft saved icon | color | `text-success` (`#27AE60`) | design-system.md: Success token |
| Draft saved text | color | `text-white/50` | JournalInput.tsx:348 (existing) |
| Draft saved text | size | `text-xs` (12px) | JournalInput.tsx:348 (existing) |
| Draft saved wrapper | height | `h-5` (20px) | spec requirement |
| Draft saved wrapper | layout | `flex items-center justify-end` | spec requirement |
| Draft saved animation | class | `motion-safe:animate-fade-in` | spec requirement; existing pattern in JournalInput |
| Auth modal subtitle | style | `text-sm text-white/90 text-center` | AuthModal.tsx:219 |
| CheckCircle2 icon | size | `h-3.5 w-3.5` | Proportional to text-xs (12px) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- `text-success` is `#27AE60` — the correct green token for positive indicators
- `animate-fade-in` is 500ms ease-out with translateY(8px→0) — defined in tailwind.config.js
- `motion-safe:` prefix gates animation behind `prefers-reduced-motion: no-preference`
- `aria-live="polite"` announces changes at next pause — correct for non-urgent status updates
- Icon inside `aria-live` region must be `aria-hidden="true"` to avoid announcing icon name
- All Daily Hub tabs share `max-w-2xl` container width
- Auth modal subtitle is an optional string passed via `openAuthModal(subtitle?)` — it renders as a `<p>` below the modal heading when truthy

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new data models.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_journal_draft` | Read (in handleSave to check if draft exists) | Existing journal draft auto-save |
| `wr_prayer_draft` | Read (in handleGenerate to check if draft exists) | Existing prayer draft auto-save |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Indicator right-aligned below textarea, `text-xs`. Auth modal subtitle wraps naturally. |
| Tablet | 768px | Same as mobile. No special treatment. |
| Desktop | 1440px | Same layout. Indicator small and unobtrusive at all sizes. |

No responsive complexity — this feature is a small text line + icon.

---

## Vertical Rhythm

N/A — this feature adds a fixed-height wrapper (`h-5` = 20px) in place of the existing `h-4` (16px) wrapper in Journal, and adds a new `h-5` wrapper in Pray. Net impact: 4px additional height in Journal, 20px new reserved space in Pray. No cross-section spacing changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] JournalInput.tsx has existing `draftSaved` state and "Draft saved" indicator (lines 57, 345-352)
- [x] PrayerInput.tsx has draft save to localStorage but NO visual indicator
- [x] PrayTabContent.tsx `handleGenerate` receives `inputText` string from PrayerInput's `onSubmit`
- [x] `openAuthModal(subtitle?)` accepts an optional subtitle string
- [x] `CheckCircle2` is available from `lucide-react` (used elsewhere in codebase)
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from codebase inspection with exact line numbers)
- [x] No [UNVERIFIED] values — all values are from existing code or spec requirements
- [x] Prior specs in the sequence are complete and committed (standalone feature)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Empty text + save click in Journal | `text.trim()` guard returns before auth check — no modal at all | Existing behavior, unchanged. Auth modal subtitle decision is moot. |
| Empty text + generate in Pray | PrayerInput's `handleSubmit` shows nudge error and never calls `onSubmit` | Existing behavior. `handleGenerate` never fires, so no auth modal. |
| Draft exists but text is empty at click time | Impossible — draft only saves when `text.trim()` is truthy | Draft existence correlates with non-empty text. |
| `CheckCircle2` icon accessibility | `aria-hidden="true"` on icon, text "Draft saved" is the accessible name | Icon is decorative; screen reader should say "Draft saved" not "CheckCircle2 Draft saved" |
| Indicator wrapper height change (Journal) | `h-4` → `h-5` to accommodate icon | Spec requires `h-5`. 4px difference is negligible for layout. |
| Timer cleanup on unmount (Pray) | Cleanup both `draftTimerRef` and `draftFeedbackTimerRef` in useEffect return | Prevents state updates on unmounted component |

---

## Implementation Steps

### Step 1: JournalInput — Enhanced draft indicator + context-aware auth subtitle

**Objective:** Enhance the existing "Draft saved" indicator with CheckCircle2 icon, right-aligned fixed-height wrapper, and pass context-aware subtitle to auth modal.

**Files to modify:**
- `frontend/src/components/daily/JournalInput.tsx` — indicator + handleSave

**Details:**

1. **Add import:** Add `CheckCircle2` to the existing lucide-react import (line 2 area).

2. **Modify `handleSave`** (lines 140-144):
   - Current:
     ```typescript
     if (!isAuthenticated) {
       authModal?.openAuthModal('Sign in to save your journal entries')
       return
     }
     ```
   - New:
     ```typescript
     if (!isAuthenticated) {
       const subtitle = text.trim()
         ? 'Sign in to save your journal entries. Your draft is safe — we\u2019ll bring it back after.'
         : 'Sign in to save your journal entries'
       authModal?.openAuthModal(subtitle)
       return
     }
     ```
   Note: The `text.trim()` check on line 141 returns early if empty, so the auth check only runs with non-empty text. The conditional is still included for spec compliance and clarity.

3. **Enhance "Draft saved" indicator** (lines 345-352):
   - Current:
     ```tsx
     <div className="mb-4 h-4" aria-live="polite">
       {draftSaved && (
         <p className="motion-safe:animate-fade-in text-xs text-white/50">
           Draft saved
         </p>
       )}
     </div>
     ```
   - New:
     ```tsx
     <div className="mb-4 flex h-5 items-center justify-end" aria-live="polite">
       {draftSaved && (
         <p className="motion-safe:animate-fade-in flex items-center gap-1 text-xs text-white/50">
           <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
           Draft saved
         </p>
       )}
     </div>
     ```

**Auth gating:** Existing check in `handleSave` — enhanced subtitle only.

**Responsive behavior:**
- Desktop (1440px): Indicator right-aligned within `max-w-2xl` container
- Tablet (768px): Same
- Mobile (375px): Same — `text-xs` + small icon, no wrapping concerns

**Guardrails (DO NOT):**
- DO NOT change the draft save timing (1s debounce, 2s auto-hide)
- DO NOT change the `draftSaved` state management logic
- DO NOT modify the `draftFeedbackTimerRef` cleanup
- DO NOT change the character count, voice input, or crisis banner
- DO NOT add new state variables — reuse existing `draftSaved`
- DO NOT change the auth modal for empty text — the `text.trim()` early return on line 141 handles that

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| auth modal shows draft-aware subtitle when text is non-empty | integration | Type text, click Save Entry while logged out, verify subtitle contains "Your draft is safe" |
| auth modal shows original subtitle when text is empty | integration | Already covered by existing test — empty text returns early before auth check, so no modal appears |
| draft saved indicator has CheckCircle2 icon | unit | Trigger draft save, verify SVG icon renders within the indicator |
| draft saved indicator is right-aligned | unit | Verify wrapper has `justify-end` class |
| draft saved indicator has fixed height wrapper | unit | Verify wrapper has `h-5` class |
| draft saved indicator icon is aria-hidden | unit | Verify icon has `aria-hidden="true"` |

**Expected state after completion:**
- [ ] JournalInput shows CheckCircle2 icon + "Draft saved" text, right-aligned
- [ ] Auth modal shows "Your draft is safe" suffix when text is non-empty
- [ ] Existing draft save timing unchanged
- [ ] No layout shift (fixed-height wrapper)

---

### Step 2: PrayTabContent — Context-aware auth modal subtitle

**Objective:** Pass a context-aware subtitle to the auth modal in `handleGenerate` based on whether the user has typed text.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — handleGenerate

**Details:**

1. **Modify `handleGenerate`** (lines 104-107):
   - Current:
     ```typescript
     const handleGenerate = (inputText: string) => {
       if (!isAuthenticated) {
         authModal?.openAuthModal('Sign in to generate a prayer')
         return
       }
     ```
   - New:
     ```typescript
     const handleGenerate = (inputText: string) => {
       if (!isAuthenticated) {
         const subtitle = inputText.trim()
           ? 'Sign in to pray together. Your draft is safe — we\u2019ll bring it back after.'
           : 'Sign in to generate a prayer'
         authModal?.openAuthModal(subtitle)
         return
       }
     ```
   Note: `handleGenerate` is only called from PrayerInput's `handleSubmit` which already guards against empty text (shows nudge error). The conditional is included for spec compliance.

**Auth gating:** Existing check in `handleGenerate` — enhanced subtitle only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the `handleGenerate` logic after the auth check (auto-play, mock prayer, etc.)
- DO NOT change PrayerInput's `onSubmit` callback or `handleSubmit`
- DO NOT add new imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| auth modal shows draft-aware subtitle when text is non-empty | integration | Type text, click Help Me Pray while logged out, verify subtitle contains "Your draft is safe" |
| auth modal shows original subtitle when text is empty | integration | Already covered — PrayerInput shows nudge error for empty text, never calls onSubmit |

**Expected state after completion:**
- [ ] Auth modal shows "Your draft is safe" suffix when prayer text is non-empty
- [ ] Existing prayer generation flow unchanged
- [ ] Existing draft preservation behavior unchanged

---

### Step 3: PrayerInput — Add "Draft saved" indicator

**Objective:** Add a visual "Draft saved" indicator to PrayerInput matching Journal's enhanced pattern, with `draftSaved` state, feedback timer, and CheckCircle2 icon.

**Files to modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — add state, timer, indicator JSX

**Details:**

1. **Add import:** Add `CheckCircle2` from `lucide-react` (new import line).

2. **Add state and ref** (after line 32, near existing `textareaRef`):
   ```typescript
   const [draftSaved, setDraftSaved] = useState(false)
   const draftFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
   ```

3. **Modify draft save useEffect** (lines 56-72) to trigger the indicator:
   - Current (lines 58-68):
     ```typescript
     draftTimerRef.current = setTimeout(() => {
       try {
         if (text.trim()) {
           localStorage.setItem(PRAYER_DRAFT_KEY, text)
         } else {
           localStorage.removeItem(PRAYER_DRAFT_KEY)
         }
       } catch {
         // localStorage failure is non-critical
       }
     }, 1000)
     ```
   - New:
     ```typescript
     draftTimerRef.current = setTimeout(() => {
       try {
         if (text.trim()) {
           localStorage.setItem(PRAYER_DRAFT_KEY, text)
           setDraftSaved(true)
           draftFeedbackTimerRef.current = setTimeout(() => setDraftSaved(false), 2000)
         } else {
           localStorage.removeItem(PRAYER_DRAFT_KEY)
         }
       } catch {
         // localStorage failure is non-critical
       }
     }, 1000)
     ```

4. **Update useEffect cleanup** (lines 69-71) to also clean up the feedback timer:
   - Current:
     ```typescript
     return () => {
       if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
     }
     ```
   - New:
     ```typescript
     return () => {
       if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
       if (draftFeedbackTimerRef.current) clearTimeout(draftFeedbackTimerRef.current)
     }
     ```

5. **Add indicator JSX** — insert between the `CharacterCount` wrapper (`</div>` at line 141) and the `<CrisisBanner>` (line 144):
   ```tsx
   <div className="mb-4 flex h-5 items-center justify-end" aria-live="polite">
     {draftSaved && (
       <p className="motion-safe:animate-fade-in flex items-center gap-1 text-xs text-white/50">
         <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
         Draft saved
       </p>
     )}
   </div>
   ```

**Auth gating:** N/A — indicator shows for all users regardless of auth state.

**Responsive behavior:**
- Desktop (1440px): Indicator right-aligned within `max-w-2xl` container
- Tablet (768px): Same
- Mobile (375px): Same

**Guardrails (DO NOT):**
- DO NOT change the draft save debounce timing (1s)
- DO NOT change the localStorage key or save/remove logic
- DO NOT change the `handleSubmit`, `handleChipClick`, or any other existing logic
- DO NOT move or restructure existing elements (chips, textarea, CharacterCount, CrisisBanner, nudge, button)
- DO NOT change the existing `draftTimerRef` variable name

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows "Draft saved" indicator after typing | integration | Type text, advance timers 1100ms, verify "Draft saved" text appears |
| "Draft saved" indicator has CheckCircle2 icon | unit | Trigger draft save, verify SVG icon renders |
| "Draft saved" indicator auto-hides after 2 seconds | integration | Trigger draft save, advance 2100ms, verify indicator disappears |
| indicator wrapper has aria-live="polite" | unit | Query the wrapper div, verify attribute |
| indicator does not show for empty text | unit | Clear text, advance timers, verify indicator absent |
| indicator icon is aria-hidden | unit | Trigger draft save, verify icon has `aria-hidden="true"` |
| feedback timer cleaned up on unmount | unit | Mount, type, unmount before timer fires — no act warnings |

**Expected state after completion:**
- [ ] PrayerInput shows "Draft saved" with CheckCircle2 icon after 1s debounce
- [ ] Indicator auto-hides after 2 seconds
- [ ] No layout shift (fixed-height wrapper)
- [ ] Screen readers announce "Draft saved" via `aria-live="polite"`
- [ ] All timers cleaned up on unmount

---

### Step 4: Update tests

**Objective:** Update existing test assertions for the new auth modal subtitles and add new tests for PrayerInput's draft saved indicator.

**Files to modify:**
- `frontend/src/pages/__tests__/Journal.test.tsx` — update auth modal subtitle assertion
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add subtitle tests + draft indicator tests

**Details:**

1. **Journal.test.tsx** — Update the auth gate test (line 267-283):
   - Current assertion (line 279):
     ```typescript
     expect(
       screen.getByText('Sign in to save your journal entries'),
     ).toBeInTheDocument()
     ```
   - New assertion:
     ```typescript
     expect(
       screen.getByText('Sign in to save your journal entries. Your draft is safe — we\u2019ll bring it back after.'),
     ).toBeInTheDocument()
     ```
   The test types "Today I am grateful" (non-empty) before clicking Save Entry, so the draft-aware subtitle should appear.

2. **PrayTabContent.test.tsx** — Update the existing logged-out auth modal regression test (line 606) to verify the subtitle text:
   - After the `generatePrayer(user)` call and the assertion that loading isn't shown, add:
     ```typescript
     expect(
       screen.getByText('Sign in to pray together. Your draft is safe — we\u2019ll bring it back after.'),
     ).toBeInTheDocument()
     ```

3. **PrayTabContent.test.tsx** — Add new test for PrayerInput draft saved indicator:
   ```typescript
   it('shows draft saved indicator after typing in prayer input', async () => {
     const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
     renderPrayTab()
     await user.type(screen.getByLabelText('Prayer request'), 'My heartfelt prayer')
     act(() => { vi.advanceTimersByTime(1100) })
     expect(screen.getByText('Draft saved')).toBeInTheDocument()
   })

   it('draft saved indicator auto-hides after 2 seconds', async () => {
     const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
     renderPrayTab()
     await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
     act(() => { vi.advanceTimersByTime(1100) })
     expect(screen.getByText('Draft saved')).toBeInTheDocument()
     act(() => { vi.advanceTimersByTime(2100) })
     expect(screen.queryByText('Draft saved')).not.toBeInTheDocument()
   })
   ```

**Auth gating:** Tests verify that draft-aware subtitle appears only when text is non-empty.

**Responsive behavior:** N/A: no UI impact (tests only).

**Guardrails (DO NOT):**
- DO NOT remove any existing test cases
- DO NOT change the test provider wrapping pattern
- DO NOT change mock setup or beforeEach hooks
- DO NOT add new mock modules

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All modified tests pass | verification | Run test suite, verify 0 failures |

**Expected state after completion:**
- [ ] Journal auth gate test asserts new draft-aware subtitle
- [ ] PrayTabContent auth gate test asserts new draft-aware subtitle
- [ ] PrayerInput draft saved indicator tests pass
- [ ] No existing tests broken

---

### Step 5: Full test suite verification + build check

**Objective:** Verify all tests pass and the build succeeds.

**Files to modify:** None — verification only.

**Details:**

1. Run `cd frontend && pnpm test` — verify all tests pass (5600+ tests, 0 new failures)
2. Run `cd frontend && pnpm build` — verify build succeeds (0 errors, 0 warnings)
3. Run `cd frontend && pnpm lint` — verify no new lint errors

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any source files in this step
- DO NOT skip any test suite

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | verification | All tests pass |
| Production build | verification | Build succeeds |

**Expected state after completion:**
- [ ] All tests pass (0 new failures)
- [ ] Production build succeeds
- [ ] No new lint errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | JournalInput: enhanced indicator + context-aware auth subtitle |
| 2 | — | PrayTabContent: context-aware auth subtitle |
| 3 | — | PrayerInput: add draft saved indicator |
| 4 | 1, 2, 3 | Update all tests |
| 5 | 4 | Full test suite verification |

Steps 1, 2, and 3 are independent and can be executed in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | JournalInput enhancements | [COMPLETE] | 2026-04-06 | Modified JournalInput.tsx: added CheckCircle2 import, context-aware auth subtitle in handleSave, enhanced indicator with icon + right-align + h-5 wrapper. No deviations. |
| 2 | PrayTabContent auth subtitle | [COMPLETE] | 2026-04-06 | Modified PrayTabContent.tsx: context-aware subtitle in handleGenerate. No deviations. |
| 3 | PrayerInput draft indicator | [COMPLETE] | 2026-04-06 | Modified PrayerInput.tsx: added CheckCircle2 import, draftSaved state + feedbackTimerRef, draft save triggers indicator, cleanup on unmount, indicator JSX between CharacterCount and CrisisBanner. No deviations. |
| 4 | Update tests | [COMPLETE] | 2026-04-06 | Updated Journal.test.tsx (subtitle assertion), Pray.test.tsx (subtitle assertion — not in original plan, discovered during test run), PrayTabContent.test.tsx (subtitle assertion + 2 new draft indicator tests). All 98 tests in modified files pass. |
| 5 | Full verification | [COMPLETE] | 2026-04-06 | Build passes, lint passes. 3 pre-existing test failures in SongPickSection + BibleReaderNotes (unrelated). All modified files' tests pass (98/98). |
