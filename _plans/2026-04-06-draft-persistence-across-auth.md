# Implementation Plan: Draft Persistence Across Auth (Journal + Pray)

**Spec:** `_specs/draft-persistence-across-auth.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/draft-persistence-across-auth`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable (behavioral feature, no visual changes)
**Master Spec Plan:** not applicable — standalone feature

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/daily/`
- Constants: `frontend/src/constants/daily-experience.ts`
- Types: `frontend/src/types/daily-experience.ts`
- Tests: `frontend/src/components/daily/__tests__/`
- Rules: `.claude/rules/11-local-storage-keys.md`

### Key Files

| File | Path | Role |
|------|------|------|
| Constants | `frontend/src/constants/daily-experience.ts:1-4` | `JOURNAL_DRAFT_KEY` and other localStorage keys; add `PRAYER_DRAFT_KEY` here |
| PrayerInput | `frontend/src/components/daily/PrayerInput.tsx` | Stateless textarea component; needs draft restore/save logic |
| PrayTabContent | `frontend/src/components/daily/PrayTabContent.tsx` | Parent component managing `initialText` state; needs draft clear on success |
| JournalInput | `frontend/src/components/daily/JournalInput.tsx:51-53,114-128,140-154` | Reference pattern: debounced draft save to `JOURNAL_DRAFT_KEY` |
| PrayTabContent test | `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` | 901 lines, existing tests; add draft persistence tests here |
| localStorage inventory | `.claude/rules/11-local-storage-keys.md` | Document new `wr_prayer_draft` key |

### Existing Journal Draft Pattern (to replicate)

From `JournalInput.tsx`:

1. **Restore on mount** (line 51-52): `useState(() => localStorage.getItem(JOURNAL_DRAFT_KEY) ?? '')`
2. **Debounced save** (lines 114-128): `useEffect` watching `text` → `clearTimeout` → `setTimeout(1000)` → `if (text.trim()) localStorage.setItem(...)` with cleanup
3. **Clear on submit** (line 153): `localStorage.removeItem(JOURNAL_DRAFT_KEY)` after successful save
4. **No try/catch** in Journal's current implementation (spec requires it for prayer)

### PrayerInput Current Architecture

- `PrayerInput` receives `initialText` prop from parent `PrayTabContent`
- Syncs `initialText` → local `text` state via `useEffect` (line 35-41)
- Has no awareness of localStorage
- `PrayTabContent.handleGenerate` (line 107-139) is where auth check + generation happens
- `PrayTabContent.handleReset` (line 141-147) clears `initialText` to empty string

### Auth Gating Pattern

- `PrayTabContent` uses `useAuth()` + `useAuthModal()` from context
- `handleGenerate` checks `!isAuthenticated` → `authModal?.openAuthModal('Sign in to generate a prayer')` → early return
- Auth modal is a UI overlay; component state (including textarea text) persists underneath

### Test Patterns

- Provider wrapping: `MemoryRouter > AuthProvider > ToastProvider > AuthModalProvider > PrayTabContent`
- Fake timers: `vi.useFakeTimers({ shouldAdvanceTime: true })` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`
- `beforeEach`: `localStorage.clear()`, set `wr_auth_simulated`/`wr_user_name`, clear mocks
- `afterEach`: `vi.useRealTimers()`
- Helper `renderPrayTab()` accepts optional props
- Helper `generatePrayer()` types text and clicks button
- `Element.prototype.scrollIntoView = vi.fn()` for jsdom compatibility

---

## Auth Gating Checklist

**No new auth gates in this feature.** The existing auth gate on prayer generation (line 108-111 of PrayTabContent.tsx) is unchanged. Draft saving to localStorage is explicitly allowed for both logged-in and logged-out users per the spec.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Type in Pray textarea + draft saves | No auth required | Step 2 | None — localStorage save for all users |
| Click "Help Me Pray" (generate) | Existing auth gate (unchanged) | N/A | Existing `useAuth + authModal` pattern |

---

## Design System Values (for UI steps)

N/A — this feature has no visual changes. It is purely behavioral (localStorage persistence logic).

---

## Design System Reminder

N/A — no UI steps in this plan.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_draft` | Both (NEW) | Prayer textarea draft, debounce-saved every 1s, cleared on successful generation |
| `wr_journal_draft` | Neither (unchanged) | Existing journal draft — must not regress |

---

## Responsive Structure

N/A — no visual changes. The existing Pray tab textarea is already responsive.

---

## Vertical Rhythm

N/A — no visual changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `PRAYER_DRAFT_KEY` does not yet exist in the codebase (confirmed: Grep returned no matches)
- [x] PrayerInput has no existing localStorage logic (confirmed: purely prop-driven)
- [x] JournalInput's debounced draft save pattern is the reference to follow
- [x] PrayTabContent.handleReset (line 141-147) should NOT clear the draft per spec requirement 5
- [x] All auth-gated actions from the spec are accounted for in the plan (no new auth gates)
- [x] No [UNVERIFIED] values — this is a behavioral-only feature

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put draft save logic | In `PrayerInput` (not `PrayTabContent`) | Matches Journal pattern: `JournalInput` owns its own draft save. Keeps persistence co-located with the textarea. |
| Draft restore initialization | `useState(() => localStorage.getItem(...) ?? '')` in PrayerInput | Matches Journal pattern (JournalInput line 51-52). Lazy initializer avoids re-reading localStorage on every render. |
| Conflict between `initialText` prop and stored draft | Prop wins when non-empty (pre-fill from Prayer Wall, devotional, challenge); draft used only when prop is empty/undefined | Pre-fill sources are intentional context from other features; they should override a stale draft. Draft serves as fallback for "return to tab" scenarios. |
| Draft cleared on "Pray again" / reset | No | Spec requirement 5: user may want to refine their previous text. `handleReset` sets `initialText=''` which will NOT clear localStorage. |
| Draft cleared on successful generation | Yes, in PrayTabContent after prayer displays | Spec requirement 4. PrayTabContent owns the generation success path. |
| try/catch on all localStorage operations | Yes | Spec non-functional requirement. Private browsing mode or full storage must not crash. |
| Empty text handling | Remove key from localStorage (not persist empty string) | Spec requirement 3. Prevents stale empty-string from persisting. |
| Draft save visual feedback | None (silent save) | Spec design notes: "No visual draft indicator — silent save, matching Journal's pattern." JournalInput has a `draftSaved` indicator but the spec explicitly says no indicator for prayer. |

---

## Implementation Steps

### Step 1: Add PRAYER_DRAFT_KEY constant and update localStorage inventory

**Objective:** Add the `wr_prayer_draft` constant to the daily experience constants file and document it in the localStorage key inventory.

**Files to create/modify:**
- `frontend/src/constants/daily-experience.ts` — add `PRAYER_DRAFT_KEY` export
- `.claude/rules/11-local-storage-keys.md` — add `wr_prayer_draft` to the Daily Hub & Journal table

**Details:**

Add after line 2 of `daily-experience.ts`:
```typescript
export const PRAYER_DRAFT_KEY = 'wr_prayer_draft'
```

In `.claude/rules/11-local-storage-keys.md`, add to the "Daily Hub & Journal" table:
```
| `wr_prayer_draft`     | string          | Prayer textarea draft auto-save    |
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT rename or modify `JOURNAL_DRAFT_KEY` or any existing constants
- DO NOT add the key to any other constants file — keep it co-located with `JOURNAL_DRAFT_KEY`

**Test specifications:**
No tests for this step — it is a constant declaration. Verified transitively by Step 3 tests.

**Expected state after completion:**
- [ ] `PRAYER_DRAFT_KEY = 'wr_prayer_draft'` exported from `daily-experience.ts`
- [ ] `wr_prayer_draft` documented in `.claude/rules/11-local-storage-keys.md`

---

### Step 2: Add draft persistence to PrayerInput

**Objective:** Add debounced draft auto-save, draft restore on mount, and empty-text cleanup to `PrayerInput`. This replicates the exact pattern from `JournalInput` lines 51-52 and 114-128.

**Files to create/modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — add draft save/restore logic

**Details:**

1. Import `PRAYER_DRAFT_KEY` from `@/constants/daily-experience`.

2. **Restore on mount** — change the `text` state initializer from `useState('')` to:
```typescript
const [text, setText] = useState(() => {
  try {
    return localStorage.getItem(PRAYER_DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
})
```

3. **Debounced draft save** — add a new `useEffect` and ref (modeled on JournalInput lines 114-128):
```typescript
const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
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
  return () => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
  }
}, [text])
```

Key difference from JournalInput: the `else` branch removes the key when text is empty (spec requirement 3). JournalInput only saves when `text.trim()` is truthy and doesn't explicitly remove — but prayer spec requires explicit removal.

4. **initialText prop override** — the existing `useEffect` at line 35-41 already syncs `initialText` → `text`. When `initialText` is set (e.g., from Prayer Wall context, devotional context, challenge context), it will overwrite the draft-initialized text. This is correct behavior: cross-feature pre-fills should override a stale draft.

5. **No draft saved indicator** — per spec, silent save. Do NOT add a `draftSaved` state or visual feedback.

**Auth gating:** None — draft saves for all users.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add any visual "draft saved" indicator (spec explicitly says no indicator)
- DO NOT remove the existing `initialText` sync `useEffect` — it must remain for cross-feature pre-fills
- DO NOT clear the draft in `handleSubmit` — that happens in `PrayTabContent` (Step 3)
- DO NOT modify the `handleChipClick` function — chips set text which will trigger the debounced save naturally
- DO NOT wrap `onChange` in try/catch — only wrap localStorage reads/writes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Draft restore on mount | integration | Set `wr_prayer_draft` in localStorage before render → textarea should have that value |
| No restore when empty | unit | No `wr_prayer_draft` in localStorage → textarea starts empty |
| Debounced save after typing | integration | Type text → advance timer 1000ms → `wr_prayer_draft` should be in localStorage |
| No save before debounce | integration | Type text → advance timer 500ms → `wr_prayer_draft` should NOT be in localStorage |
| Empty text removes key | integration | Set `wr_prayer_draft` → render → clear textarea → advance timer → key removed |
| initialText prop overrides draft | integration | Set `wr_prayer_draft` in localStorage → render with `initialText="custom"` → textarea shows "custom" |

**Expected state after completion:**
- [ ] PrayerInput initializes textarea from `wr_prayer_draft` localStorage value
- [ ] Typing in textarea triggers debounced (1s) save to `wr_prayer_draft`
- [ ] Clearing textarea removes `wr_prayer_draft` from localStorage
- [ ] All localStorage operations wrapped in try/catch
- [ ] `initialText` prop still overrides draft when present

---

### Step 3: Clear draft on successful prayer generation in PrayTabContent

**Objective:** After a prayer is successfully generated (mock response displays), clear the `wr_prayer_draft` from localStorage. Ensure `handleReset` does NOT clear the draft.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — add draft clear in `handleGenerate` success path

**Details:**

1. Import `PRAYER_DRAFT_KEY` from `@/constants/daily-experience`.

2. In `handleGenerate`, inside the `setTimeout` callback (line 132-138) that sets `setPrayer(result)`, add draft clear:
```typescript
setTimeout(() => {
  const result = getMockPrayer(inputText)
  setPrayer(result)
  setIsLoading(false)
  markPrayComplete()
  recordActivity('pray')
  try {
    localStorage.removeItem(PRAYER_DRAFT_KEY)
  } catch {
    // localStorage failure is non-critical
  }
}, 1500)
```

3. **Do NOT modify `handleReset`** (line 141-147). `handleReset` sets `initialText` to `''`, which will cause PrayerInput's `useEffect` to sync `text` to `''`, which will trigger the debounced save that removes the key. BUT — the 1-second debounce means the user has time to see the input again before the key is removed. This is acceptable: the spec says "Draft NOT cleared on reset" which means we don't explicitly clear it. The debounced save removing the empty string is the correct behavior — if the user starts typing again within 1 second, the new text will be saved.

   Wait — actually this is a problem. `handleReset` sets `initialText = ''`, which triggers PrayerInput's `useEffect` to set `text = ''`, which triggers the debounced save, which removes the key from localStorage. The spec says "Draft NOT cleared on reset."

   **Fix:** The `initialText` sync `useEffect` in PrayerInput currently fires when `initialText !== undefined && initialText !== ''`. So when `handleReset` sets `initialText = ''`, the sync effect will NOT fire because `initialText === ''`. The text state in PrayerInput resets because PrayerInput unmounts and remounts (it's conditionally rendered: `{!prayer && !isLoading && <PrayerInput ... />}`). On remount, the lazy `useState` initializer reads from localStorage — which still has the draft since we didn't clear it.

   Actually, let me re-examine: when `handleReset` fires, `setPrayer(null)` triggers. PrayerInput was hidden (because `prayer` was not null), and now it re-renders. Since PrayerInput unmounts when `prayer` is set and remounts when `prayer` is null, the `useState` initializer runs fresh — reading from localStorage. The draft is NOT removed by `handleGenerate` reset path, only by the success path. So the draft persists across reset. This is correct.

   But wait — Step 3 says we clear the draft in `handleGenerate`'s success callback. So after generation, the draft is cleared. Then `handleReset` remounts PrayerInput with no draft → empty textarea. The spec says "Draft NOT cleared on reset" but the draft was already cleared by the prior successful generation. The spec intent is: if the user never generates (just resets), the draft should persist. But since `handleReset` only fires AFTER generation (it's the "Pray again" button after viewing a prayer), the draft has already been cleared by the success callback.

   Hmm, re-reading the spec more carefully: "Clicking 'Pray again' (reset) does NOT clear the draft from localStorage." This means even if we cleared it on generation, the reset action itself should not perform an additional clear. Since `handleReset` doesn't touch localStorage, this is naturally satisfied.

   But actually the user might want the text they typed BEFORE generation to come back when they hit "Pray again". Since we clear on generation success, it won't. Let me re-read the spec acceptance criteria: "Clicking 'Pray again' (reset) does NOT clear the draft from localStorage." This is testing that `handleReset` doesn't clear it. But `handleGenerate` success does. The net effect is: after generation+reset, the textarea will be empty (draft was cleared on generation). This seems intentional — the user already submitted that text.

   Decision: This is correct. The spec says draft cleared on successful submission (requirement 4) and NOT cleared on reset (requirement 5). These are about the triggering action, not the cumulative state.

**Auth gating:** N/A — the auth check already happens before `handleGenerate` proceeds.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add `localStorage.removeItem(PRAYER_DRAFT_KEY)` to `handleReset`
- DO NOT modify the `initialText` pre-fill effects (Prayer Wall, URL context, challenge, devotional)
- DO NOT modify the auth gating check in `handleGenerate`
- DO NOT wrap `handleGenerate` in try/catch — only wrap the specific `localStorage.removeItem` call

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Draft cleared after successful generation | integration | Type text → generate prayer → advance timer → `wr_prayer_draft` should be null |
| Draft NOT cleared on reset | integration | Set `wr_prayer_draft` → generate → reset → `wr_prayer_draft` was cleared by generation (not by reset) |
| Draft survives auth modal round-trip | integration | Logged out: type text → click generate → auth modal appears → draft still in localStorage |
| Draft restored after page remount | integration | Set `wr_prayer_draft` → render → textarea has draft text |
| Draft independent from journal | integration | Set both `wr_prayer_draft` and `wr_journal_draft` → generate prayer → only prayer draft cleared, journal draft untouched |
| No regression: logged-out user still sees auth modal | integration | Logged out: generate → auth modal appears (existing test, verify still passes) |
| No regression: Journal draft auto-save unchanged | integration | Journal draft key is not touched by any prayer operations |

**Expected state after completion:**
- [ ] Successful prayer generation clears `wr_prayer_draft` from localStorage
- [ ] `handleReset` does NOT clear `wr_prayer_draft`
- [ ] `wr_journal_draft` is never affected by prayer operations
- [ ] Auth modal round-trip preserves draft in localStorage

---

### Step 4: Write tests for draft persistence

**Objective:** Add comprehensive tests for the new draft persistence behavior to the existing `PrayTabContent.test.tsx` test file.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add new `describe('prayer draft persistence', ...)` block

**Details:**

Add a new describe block at the end of the test file (before the closing), using the existing `renderPrayTab`, `generatePrayer`, mock setup, and provider wrapping patterns.

Tests to add (new `describe('prayer draft persistence', ...)` block):

```typescript
describe('prayer draft persistence', () => {
  // 1. Draft restore on mount
  it('restores draft from localStorage on mount', () => {
    localStorage.setItem('wr_prayer_draft', 'My ongoing prayer')
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('My ongoing prayer')
  })

  // 2. Empty localStorage → empty textarea
  it('starts with empty textarea when no draft exists', () => {
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('')
  })

  // 3. Debounced save after typing
  it('saves draft to localStorage after 1-second debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'Help me with anxiety')
    // Before debounce fires
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
    // After debounce
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Help me with anxiety')
  })

  // 4. No save before debounce completes
  it('does not save draft before debounce completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'Hello')
    act(() => { vi.advanceTimersByTime(500) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  // 5. Clearing textarea removes key
  it('removes draft key when textarea is cleared', async () => {
    localStorage.setItem('wr_prayer_draft', 'Existing draft')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    await user.clear(textarea)
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  // 6. Draft cleared on successful generation
  it('clears draft after successful prayer generation', async () => {
    localStorage.setItem('wr_prayer_draft', 'My prayer text')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  // 7. Draft survives auth modal (logged-out)
  it('preserves draft in localStorage when auth modal opens (logged out)', async () => {
    localStorage.removeItem('wr_auth_simulated')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'Vulnerable prayer')
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Vulnerable prayer')
    // Click generate — auth modal opens
    await user.click(screen.getByRole('button', { name: /help me pray/i }))
    // Draft should still be in localStorage
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Vulnerable prayer')
  })

  // 8. initialText prop overrides draft
  it('initialText prop overrides stored draft', () => {
    localStorage.setItem('wr_prayer_draft', 'Stale draft')
    renderPrayTab({
      prayContext: {
        from: 'devotional',
        topic: 'Trust',
        customPrompt: 'Fresh devotional context',
      },
    })
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Fresh devotional context')
  })

  // 9. Prayer and journal drafts are independent
  it('prayer draft operations do not affect journal draft', async () => {
    localStorage.setItem('wr_journal_draft', 'My journal entry')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })
    // Prayer draft cleared, journal draft untouched
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
    expect(localStorage.getItem('wr_journal_draft')).toBe('My journal entry')
  })

  // 10. Draft persists across tab switches (remount)
  it('draft persists when component remounts', () => {
    localStorage.setItem('wr_prayer_draft', 'Persisted draft')
    const { unmount } = renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Persisted draft')
    unmount()
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Persisted draft')
  })
})
```

Use `vi.useFakeTimers({ shouldAdvanceTime: true })` which is already set up in the existing `beforeEach`.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any existing tests — only add new ones
- DO NOT change the existing `beforeEach` / `afterEach` / mock setup
- DO NOT import new modules — all needed imports already exist in the test file
- DO NOT test JournalInput behavior — that is out of scope (spec says "no regression to journal" but we verify indirectly via test 9)

**Expected state after completion:**
- [ ] 10 new tests added in `describe('prayer draft persistence', ...)`
- [ ] All existing tests still pass
- [ ] All new tests pass
- [ ] Test coverage: draft restore, debounced save, empty cleanup, generation clear, auth modal survival, prop override, independence, remount persistence

---

### Step 5: Run tests and verify

**Objective:** Run the full test suite to verify no regressions and all new tests pass.

**Files to create/modify:** None

**Details:**

Run:
```bash
cd frontend && pnpm test -- --reporter=verbose
```

Verify:
1. All existing PrayTabContent tests pass (existing 40+ tests)
2. All 10 new draft persistence tests pass
3. All JournalTabContent tests pass (no regression to journal draft)
4. No other test failures across the suite

If any test fails, diagnose and fix before proceeding.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT skip failing tests or mark them as `.skip`
- DO NOT modify existing tests to accommodate new behavior — the new behavior should be additive

**Expected state after completion:**
- [ ] All tests pass (0 failures)
- [ ] No regressions in existing PrayTabContent tests
- [ ] No regressions in JournalTabContent tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add PRAYER_DRAFT_KEY constant + update docs |
| 2 | 1 | Add draft persistence to PrayerInput |
| 3 | 1 | Add draft clear on generation success in PrayTabContent |
| 4 | 2, 3 | Write tests for draft persistence |
| 5 | 4 | Run tests and verify |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add PRAYER_DRAFT_KEY constant + docs | [COMPLETE] | 2026-04-06 | Added `PRAYER_DRAFT_KEY` to `daily-experience.ts` line 3; added `wr_prayer_draft` to `11-local-storage-keys.md` Daily Hub & Journal table |
| 2 | Add draft persistence to PrayerInput | [COMPLETE] | 2026-04-06 | Added PRAYER_DRAFT_KEY import, lazy useState initializer with try/catch, debounced save useEffect with draftTimerRef. No visual indicator. |
| 3 | Clear draft on generation success | [COMPLETE] | 2026-04-06 | Added PRAYER_DRAFT_KEY import + localStorage.removeItem in handleGenerate setTimeout callback. handleReset untouched. |
| 4 | Write tests | [COMPLETE] | 2026-04-06 | 10 new tests in `describe('prayer draft persistence')` — restore, empty, debounced save, pre-debounce, clear on empty, clear on generation, auth modal survival, prop override, journal independence, remount persistence. 63 total PrayTabContent tests. |
| 5 | Run tests and verify | [COMPLETE] | 2026-04-06 | 5,591 tests pass / 0 fail / 474 files. No regressions. |
