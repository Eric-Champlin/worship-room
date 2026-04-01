# Implementation Plan: Form Accessibility Migration

**Spec:** `_specs/form-accessibility-migration.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/form-accessibility-migration`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> Design system recon was captured 2026-03-06, before Round 2 dark theme conversions. Visual values are verified from codebase inspection below — this spec does not introduce new visual patterns, only aria attributes and inline error messages using existing patterns.

---

## Architecture Context

### Relevant Files and Patterns

**FormField component** (`frontend/src/components/ui/FormField.tsx`):
- Props: `label, srOnly, required, error, charCount, charMax, charWarningAt, charDangerAt, charVisibleAt, helpText, children, className`
- Uses `cloneElement` to inject `aria-describedby` and `aria-invalid="true"` on the child element
- Auto-generates IDs via `useId()` for error, help, and count elements
- Error: `<p id={errorId} role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">` with `AlertCircle` icon
- Required indicator: `<span className="text-red-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>`
- Label: `block text-sm font-medium text-white/70 mb-1` (visible) or `sr-only` (hidden)

**CharacterCount component** (`frontend/src/components/ui/CharacterCount.tsx`):
- Props: `current, max, warningAt, dangerAt, visibleAt, id, className`
- Visual: `aria-hidden="true"` with zone-based colors (normal: `text-white/60`, warning: `text-amber-400`, danger: `text-red-400`)
- SR: `<span className="sr-only" role="status" aria-live="polite">` — announces zone transitions only

**MoodCheckIn roving tabindex pattern** (`frontend/src/components/dashboard/MoodCheckIn.tsx` lines 31, 96-119, 142-160):
- Container: `role="radiogroup"` + `aria-label="Select your mood"` + `onKeyDown={handleKeyDown}`
- Buttons: `role="radio"` + `aria-checked={isSelected}` + `aria-label={mood.label}` + `tabIndex={focusedIndex === index ? 0 : -1}`
- State: `focusedIndex` (number), `orbRefs` (ref array of HTMLButtonElement)
- KeyDown handler: ArrowRight/Down → `(focusedIndex + 1) % len`, ArrowLeft/Up → `(focusedIndex - 1 + len) % len`, Enter/Space → select
- Focus: `orbRefs.current[newIndex]?.focus()`

**Category pill current pattern** (InlineComposer, PrayerComposer, EditPrayerForm):
- `<fieldset>` with `<legend>` containing "Category" + required indicator
- Individual `<button>` elements with `aria-pressed={selectedCategory === cat}`
- Fieldset has `aria-invalid` and `aria-describedby` for category error
- Error: `<p role="alert">Please choose a category</p>`
- All buttons individually tabbable (12+ tab stops per group)

**Strategy decision:** All forms use **Option B** (apply FormField patterns directly) rather than wrapping in `FormField`. Rationale: all target forms have established layouts, custom styling, and existing test suites. Wrapping in FormField would change DOM structure and break tests without accessibility benefit beyond what direct attribute application provides.

### Directory Conventions

- Components: `frontend/src/components/{feature}/ComponentName.tsx`
- Hooks: `frontend/src/hooks/hookName.ts`
- Tests: `frontend/src/components/{feature}/__tests__/ComponentName.test.tsx` or `frontend/src/hooks/__tests__/hookName.test.ts`
- Constants: `frontend/src/constants/`

### Test Patterns

- `import { render, screen } from '@testing-library/react'`
- `import userEvent from '@testing-library/user-event'`
- Router-dependent: `<MemoryRouter>` wrapper
- Auth-dependent: `vi.mock('@/hooks/useAuth')` or `vi.mock('@/contexts/AuthProvider')`
- Toast-dependent: `<ToastProvider>` wrapper
- `describe` blocks, `beforeEach` for setup, `vi.fn()` for mocks
- Accessibility: `screen.getByRole()`, `screen.getByLabelText()`, `.toHaveAttribute('aria-invalid', 'true')`

### Existing Test Files for Target Components

| Component | Test File | Status |
|-----------|-----------|--------|
| FormField | `components/ui/__tests__/FormField.test.tsx` | Exists |
| CharacterCount | `components/ui/__tests__/CharacterCount.test.tsx` | Exists |
| MoodCheckIn | `components/dashboard/__tests__/MoodCheckIn.test.tsx` | Exists |
| AuthModal | `components/prayer-wall/__tests__/AuthModal.test.tsx` | Exists |
| PrayerComposer | `components/my-prayers/__tests__/PrayerComposer.test.tsx` | Exists |
| GratitudeWidget | `components/dashboard/__tests__/GratitudeWidget.test.tsx` | Exists |
| WelcomeWizard | `components/dashboard/__tests__/WelcomeWizard.test.tsx` | Exists |
| ReportDialog | `components/prayer-wall/__tests__/ReportDialog.test.tsx` | Exists |
| SleepTimerPanel | `components/bible/__tests__/SleepTimerPanel.test.tsx` | Exists |
| SearchControls | `components/local-support/__tests__/SearchControls.test.tsx` | Exists |
| EveningReflection | `components/dashboard/__tests__/EveningReflection.test.tsx` | Exists |
| VerseCardActions | `components/ask/__tests__/VerseCardActions.test.tsx` | Exists |
| InlineComposer | No dedicated test file found | Needs creation |
| QotdComposer | No dedicated test file found | Needs creation |
| CommentInput | No dedicated test file found | Needs creation |
| EditPrayerForm | No dedicated test file found | Needs creation |
| RoutineBuilder | No dedicated test file found | Needs creation |
| BibleSearchMode | No dedicated test file found | Needs creation |

---

## Auth Gating Checklist

**This spec modifies the accessibility layer of existing forms only. No new actions are introduced. No auth behavior changes.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No new auth-gated actions | N/A | Existing auth gates preserved |

All existing auth gates remain unchanged. Spec explicitly states: "No new actions are introduced. No auth behavior changes."

---

## Design System Values (for UI steps)

This spec adds accessibility attributes and inline error messages using existing visual patterns. No new visual patterns are introduced.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Error message text | color | `text-red-400` | FormField.tsx:72 |
| Error message icon | component | `AlertCircle` from lucide-react, `h-4 w-4 shrink-0` | FormField.tsx:73 |
| Error message container | layout | `mt-1 flex items-center gap-1.5 text-sm` | FormField.tsx:72 |
| Required indicator asterisk | color | `text-red-400 ml-0.5` | FormField.tsx:63 |
| Required indicator sr text | content | `<span className="sr-only"> required</span>` | FormField.tsx:64 |
| Character count (normal) | color | `text-white/60` | CharacterCount.tsx:22 |
| Character count (warning) | color | `text-amber-400` | CharacterCount.tsx:23 |
| Character count (danger) | color | `text-red-400` | CharacterCount.tsx:24 |
| Label (visible) | style | `block text-sm font-medium text-white/70 mb-1` | FormField.tsx:58 |
| Category error text | color | `text-warning` (amber/orange) | InlineComposer.tsx existing |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Error messages use `text-red-400` with `AlertCircle` icon from lucide-react — consistent with FormField pattern
- Required indicators: red asterisk `text-red-400 ml-0.5` + `sr-only` "required" text — consistent with FormField pattern
- Category error messages use `text-warning` (not `text-red-400`) — this is the existing InlineComposer pattern, preserve it
- Character count uses `CharacterCount` component from `components/ui/CharacterCount.tsx` — do not hand-roll
- All inputs on dark backgrounds use `bg-white/[0.06]` with `border-glow-cyan` focus glow — do not modify input styling
- `aria-invalid` value is `'true'` (string) when error exists, `undefined` when no error — never `'false'`
- `aria-describedby` should list space-separated IDs; remove the attribute entirely (not empty string) when no descriptions exist
- Roving tabindex: only ONE item has `tabIndex={0}` at a time; all others have `tabIndex={-1}`

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec.

**localStorage keys this spec touches:** None. All changes are presentation-only DOM attribute additions.

---

## Responsive Structure

**This spec does not introduce layout changes.** All additions (aria attributes, inline errors, character counts) are block-level elements that inherit the existing responsive layout of each form.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Error messages render full-width below inputs. Category pill radiogroups wrap naturally. Verify AuthModal register view doesn't overflow with stacked inline errors. |
| Tablet | 768px | Same as mobile — all additions flow with existing layouts |
| Desktop | 1440px | Same behavior — inline errors and character counts render below inputs |

---

## Vertical Rhythm

Not applicable — no new sections or page-level spacing. Error messages use `mt-1` (4px) margin consistent with FormField pattern.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/form-accessibility-migration` exists and is checked out
- [ ] All tests pass on current branch before starting (`pnpm test`)
- [ ] FormField component exists at `frontend/src/components/ui/FormField.tsx` (verified)
- [ ] CharacterCount component exists at `frontend/src/components/ui/CharacterCount.tsx` (verified)
- [ ] MoodCheckIn roving tabindex pattern exists at `frontend/src/components/dashboard/MoodCheckIn.tsx` (verified)
- [ ] All target component files exist at expected paths (verified via reconnaissance)
- [ ] No [UNVERIFIED] values in this plan — all patterns verified from codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FormField adoption vs direct patterns | Option B (direct patterns) for all forms | All target forms have established layouts and test suites. Direct attribute application preserves DOM structure and test compatibility. |
| Category pill migration scope | InlineComposer, PrayerComposer, EditPrayerForm | Three components use the pattern. All three are converted. |
| `useRovingTabindex` hook vs inline | Create shared hook | Three consumers (InlineComposer, PrayerComposer, EditPrayerForm) justify a small shared utility. MoodCheckIn is NOT migrated (out of scope, working code). |
| AuthModal confirm password | Add match validation + inline error | Clear gap in current implementation. Error message: "Passwords do not match". |
| QotdComposer character count | Migrate from inline to `CharacterCount` component | Existing inline implementation is inconsistent with the rest of the app. |
| WelcomeWizard changes | Verify only — may be a no-op | Reconnaissance shows it already has `aria-invalid` and `aria-describedby`. Verify and note in execution log. |
| SleepTimerPanel custom input | Verify only — may be a no-op | Already has `<label htmlFor>` association and sr-only label. Verify accessible name is sufficient. |
| GratitudeWidget + EveningReflection aria-labels | Update from "Gratitude item N" to spec-required descriptive labels | Spec explicitly requires "First thing you're grateful for", "Second thing you're grateful for", "Third thing you're grateful for". |
| Category error color | Preserve existing `text-warning` | InlineComposer already uses `text-warning` for category errors. Don't change to `text-red-400` — this is an existing pattern. |

---

## Implementation Steps

### Step 1: Create `useRovingTabindex` Hook

**Objective:** Extract the roving tabindex keyboard navigation pattern (from MoodCheckIn) into a reusable hook for category pill migration in Steps 3-4.

**Files to create/modify:**
- `frontend/src/hooks/useRovingTabindex.ts` — New hook file
- `frontend/src/hooks/__tests__/useRovingTabindex.test.ts` — New test file

**Details:**

Create a hook that encapsulates the roving tabindex pattern used in MoodCheckIn.tsx lines 31, 96-119, 142-160.

```typescript
interface UseRovingTabindexOptions {
  itemCount: number
  onSelect: (index: number) => void
  orientation?: 'horizontal' | 'vertical' | 'both'
  initialIndex?: number
}

interface UseRovingTabindexReturn {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  getItemProps: (index: number) => {
    tabIndex: number
    onKeyDown: (e: React.KeyboardEvent) => void
    ref: (el: HTMLElement | null) => void
  }
}
```

- `orientation: 'horizontal'` (default) — ArrowLeft/ArrowRight navigate
- `orientation: 'vertical'` — ArrowUp/ArrowDown navigate
- `orientation: 'both'` — all 4 arrow keys navigate (matches MoodCheckIn)
- Enter/Space calls `onSelect(focusedIndex)`
- Wraps around at boundaries (modular arithmetic)
- Manages `itemRefs` ref array internally
- Focus management: `itemRefs.current[newIndex]?.focus()`

Follow the exact keyboard handling pattern from MoodCheckIn.tsx lines 96-119.

**Auth gating (if applicable):** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify MoodCheckIn.tsx — it stays as-is with its inline implementation
- DO NOT add any visual styling — this hook only manages focus state and keyboard events
- DO NOT handle selection state (aria-checked) — consumers manage their own selection state
- DO NOT prevent default on keys other than arrow keys, Enter, and Space

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns focusedIndex starting at 0 by default` | unit | Verify initial state |
| `returns focusedIndex starting at initialIndex` | unit | Verify custom initial index |
| `ArrowRight moves focus to next item` | unit | Simulate keydown, verify focusedIndex increments |
| `ArrowLeft moves focus to previous item` | unit | Simulate keydown, verify focusedIndex decrements |
| `wraps around from last to first` | unit | ArrowRight at last index → index 0 |
| `wraps around from first to last` | unit | ArrowLeft at index 0 → last index |
| `Enter calls onSelect with current index` | unit | Verify callback |
| `Space calls onSelect with current index` | unit | Verify callback |
| `only focused item has tabIndex 0` | unit | Verify getItemProps returns correct tabIndex |
| `non-focused items have tabIndex -1` | unit | Verify getItemProps |

**Expected state after completion:**
- [ ] `useRovingTabindex` hook exists and exports correctly
- [ ] All 10 tests pass
- [ ] Hook follows exact MoodCheckIn keyboard pattern

---

### Step 2: AuthModal — Full Accessibility Migration

**Objective:** Add missing `aria-invalid`, `aria-describedby`, inline errors, required indicators, and confirm password validation to all three AuthModal views (Login, Register, Password Reset).

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — Modify
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` — Modify

**Details:**

**Login view** (existing Email + Password fields):
- Both fields already have `aria-invalid` and `aria-describedby` — verify they work correctly.
- Add `required` attribute to both inputs.
- Add required indicator (red asterisk + sr-only text) to labels. Follow FormField pattern: `<span className="text-red-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>`.

**Register view** (5 fields: First name, Last name, Email, Password, Confirm password):
- First name input: Add `aria-invalid={firstNameError ? 'true' : undefined}`, `aria-describedby={firstNameError ? 'firstname-error' : undefined}`. Add error state + inline error `<p id="firstname-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{firstNameError}</p>`. Add `required` attribute + required indicator.
- Last name input: Same pattern with `lastname-error` ID.
- Email + Password inputs: Already have aria attributes — add `required` attribute + required indicator.
- Confirm password input: Add `aria-invalid`, `aria-describedby` linking to `confirmpassword-error`. Add validation: compare against password field value. Error message: "Passwords do not match" when `confirmPassword !== password && confirmPassword.length > 0`. Also validate on form submit. Add `required` attribute + required indicator.
- All 5 fields: Validate on blur (`onBlur` handler sets field-touched state) AND on submit. Only show inline error if field has been blurred or form has been submitted.

**Password Reset view** (Email field):
- Add `aria-invalid={resetEmailError ? 'true' : undefined}`, `aria-describedby={resetEmailError ? 'reset-email-error' : undefined}`.
- Add inline error below input for empty/invalid email.
- Add `required` attribute + required indicator.

**Validation state management:**
- Add `touched` state tracking per field: `const [touched, setTouched] = useState<Record<string, boolean>>({})`.
- Add `submitted` state per view: `const [submitted, setSubmitted] = useState(false)`.
- Error shows when `(touched[fieldName] || submitted) && errorCondition`.
- First name/Last name error: "First name is required" / "Last name is required" when empty.
- Confirm password errors: "Confirm password is required" when empty, "Passwords do not match" when non-empty and doesn't match password.

**Auth gating:** N/A — AuthModal is the auth gate itself.

**Responsive behavior:**
- Mobile (375px): Verify stacked inline errors don't cause overflow in the Register view (5 fields + errors in modal). Use `overflow-y-auto` on modal body if not already present.
- Tablet/Desktop: No layout changes.

**Guardrails (DO NOT):**
- DO NOT change existing form submission behavior or toast messages
- DO NOT add real authentication logic (Phase 3)
- DO NOT modify the modal's dialog/overlay structure
- DO NOT change the visual styling of inputs (bg, border, focus glow)
- DO NOT remove existing `aria-label` attributes on inputs — they serve as accessible names when labels are sr-only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Register: first name shows inline error on blur when empty` | integration | Blur empty first name → error visible |
| `Register: first name has aria-invalid when error shows` | integration | Verify attribute |
| `Register: last name shows inline error on blur when empty` | integration | Same pattern |
| `Register: confirm password shows "Passwords do not match" when mismatched` | integration | Type different passwords → error |
| `Register: confirm password error clears when passwords match` | integration | Fix mismatch → error gone |
| `Register: all 5 fields show required indicator` | integration | Query for asterisks / sr-only text |
| `Register: submit with empty fields shows all inline errors` | integration | Submit → all errors visible |
| `Login: fields have required attribute` | integration | Verify `required` on inputs |
| `Password Reset: empty email shows inline error` | integration | Submit → error visible |
| `Password Reset: email has aria-invalid on error` | integration | Verify attribute |

**Expected state after completion:**
- [ ] Login: both inputs have `required` + required indicators
- [ ] Register: all 5 fields have `aria-invalid`, `aria-describedby`, inline errors, `required`, required indicators
- [ ] Register: confirm password validates against password field
- [ ] Password Reset: email has `aria-invalid`, `aria-describedby`, inline error
- [ ] All existing AuthModal tests pass (updated where DOM structure changed)
- [ ] New tests pass

---

### Step 3: InlineComposer — Textarea Accessibility + Category Radiogroup

**Objective:** Add `aria-invalid` to textarea for over-limit state. Convert category pills from individually-tabbable `aria-pressed` buttons to a `role="radiogroup"` with roving tabindex.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — Modify
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — Create new test file

**Details:**

**Textarea enhancements:**
- Add `aria-invalid={content.length > PRAYER_POST_MAX_LENGTH ? 'true' : undefined}` to textarea.
- Verify existing `aria-describedby="composer-char-count"` is always present (currently conditional — make it unconditional so screen readers always know the count element exists). If the CharacterCount isn't visible (below `visibleAt`), it returns `null` — `aria-describedby` pointing to a non-existent ID is harmless per spec.

**Category pill radiogroup migration:**
- Replace the `<fieldset>` container's inner `<div>` with `<div role="radiogroup" aria-label="Prayer category">`.
- Keep the `<fieldset>` and `<legend>` wrapper for the overall grouping with required indicator.
- Change each pill `<button>`:
  - Remove `aria-pressed`
  - Add `role="radio"`
  - Add `aria-checked={selectedCategory === cat}`
  - Add `tabIndex` via `useRovingTabindex` hook's `getItemProps(index)`
- Wire `useRovingTabindex` with `itemCount: PRAYER_CATEGORIES.length`, `onSelect: (index) => { setSelectedCategory(PRAYER_CATEGORIES[index]); setShowCategoryError(false); }`, `orientation: 'horizontal'`.
- When a category is selected via click, also update `useRovingTabindex`'s `focusedIndex` to match (call `setFocusedIndex(index)` in onClick handler).
- Keep the existing fieldset `aria-invalid` and `aria-describedby` for the category error state.

**Auth gating:** N/A — existing auth gates preserved.

**Responsive behavior:**
- Mobile (375px): Category pills already wrap via `flex-wrap` on `lg:` and scroll horizontally on mobile. Arrow key navigation works regardless of visual layout — it moves through the logical order.
- Tablet/Desktop: No layout changes.

**Guardrails (DO NOT):**
- DO NOT change the visual appearance of category pills (colors, sizing, spacing)
- DO NOT modify the crisis detection or auth gating behavior
- DO NOT remove the `<fieldset>`/`<legend>` — it provides grouping semantics
- DO NOT change the category error message text or styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `textarea has aria-invalid when content exceeds max length` | integration | Type beyond limit → aria-invalid="true" |
| `textarea has aria-describedby linking to char count` | integration | Verify attribute value |
| `category container has role="radiogroup"` | integration | `getByRole('radiogroup', { name: 'Prayer category' })` |
| `category pills have role="radio"` | integration | `getAllByRole('radio')` → 9 items |
| `selected category pill has aria-checked="true"` | integration | Click pill → verify attribute |
| `unselected pills have aria-checked="false"` | integration | Verify all non-selected |
| `only one pill has tabIndex 0` | integration | Verify roving tabindex |
| `ArrowRight moves focus to next pill` | integration | Keyboard event → focus moves |
| `Enter selects focused pill` | integration | Keyboard event → category selected |
| `submitting without category shows inline error` | integration | Submit → error with role="alert" visible |
| `category fieldset has aria-invalid when error shows` | integration | Verify attribute on fieldset |

**Expected state after completion:**
- [ ] Textarea has `aria-invalid` for over-limit
- [ ] Category pills use `role="radiogroup"` + `role="radio"` + roving tabindex
- [ ] Arrow key navigation works between pills
- [ ] Tab stops reduced from 9+ to 1 per group
- [ ] All tests pass

---

### Step 4: PrayerComposer + EditPrayerForm — Category Radiogroup

**Objective:** Convert category pills in PrayerComposer and EditPrayerForm from `aria-pressed` buttons to `role="radiogroup"` with roving tabindex, matching the InlineComposer pattern from Step 3.

**Files to create/modify:**
- `frontend/src/components/my-prayers/PrayerComposer.tsx` — Modify
- `frontend/src/components/my-prayers/EditPrayerForm.tsx` — Modify
- `frontend/src/components/my-prayers/__tests__/PrayerComposer.test.tsx` — Modify

**Details:**

Apply the exact same category pill transformation as Step 3 to both components:

**PrayerComposer:**
- Replace inner `<div>` within category fieldset with `<div role="radiogroup" aria-label="Prayer category">`.
- Change pills: remove `aria-pressed`, add `role="radio"`, `aria-checked`, `tabIndex` via `useRovingTabindex`.
- Wire `useRovingTabindex` with `itemCount: PRAYER_CATEGORIES.length`, `onSelect` callback matching existing selection logic.
- Keep existing fieldset `aria-invalid` and `aria-describedby` for error state.
- Existing title and description fields already have aria attributes — no changes needed.

**EditPrayerForm:**
- Same transformation as PrayerComposer.
- Use ID prefix `edit-` to avoid ID collisions when both forms could theoretically be on the same page.

**Update PrayerComposer tests:** Existing tests reference `aria-pressed` on category buttons — update to use `role="radio"` + `aria-checked` queries instead.

**Auth gating:** N/A — existing auth gates preserved.

**Responsive behavior:** N/A: no UI impact beyond attribute changes.

**Guardrails (DO NOT):**
- DO NOT change visual appearance of category pills
- DO NOT modify title/description field accessibility (already correct)
- DO NOT change the crisis banner integration
- DO NOT modify the `useUnsavedChanges` hook integration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerComposer: category container has role="radiogroup"` | integration | `getByRole('radiogroup', { name: 'Prayer category' })` |
| `PrayerComposer: pills have role="radio" with aria-checked` | integration | Verify attributes |
| `PrayerComposer: arrow key navigation between pills` | integration | Keyboard events |
| `PrayerComposer: Enter/Space selects focused pill` | integration | Keyboard events |
| `EditPrayerForm: category pills use radiogroup pattern` | integration | Same verification |
| `EditPrayerForm: arrow key navigation works` | integration | Keyboard events |

**Expected state after completion:**
- [ ] PrayerComposer category pills use radiogroup + roving tabindex
- [ ] EditPrayerForm category pills use radiogroup + roving tabindex
- [ ] Existing PrayerComposer tests updated and passing
- [ ] New tests pass
- [ ] Tab stops reduced to 1 per pill group in both components

---

### Step 5: QotdComposer + CommentInput — Verify & Enhance

**Objective:** Migrate QotdComposer's inline character count to use the `CharacterCount` component. Verify CommentInput's existing accessibility attributes.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/QotdComposer.tsx` — Modify
- `frontend/src/components/prayer-wall/CommentInput.tsx` — Verify (minor changes if needed)
- `frontend/src/components/prayer-wall/__tests__/QotdComposer.test.tsx` — Create new test file

**Details:**

**QotdComposer:**
- Replace the custom inline `<p id="qotd-char-count" aria-live="polite">` character count with the `CharacterCount` component:
  ```tsx
  <CharacterCount
    current={content.length}
    max={QOTD_MAX_LENGTH}
    visibleAt={QOTD_WARNING_THRESHOLD}
    id="qotd-char-count"
  />
  ```
- Ensure `aria-describedby="qotd-char-count"` is always present on the textarea (not conditional on threshold).
- Add `aria-invalid={content.length > QOTD_MAX_LENGTH ? 'true' : undefined}` to textarea.

**CommentInput:**
- Verify existing attributes: `aria-label="Comment"`, `aria-invalid` for crisis detection, `aria-describedby` with dynamic IDs linking to crisis banner and char count.
- If verification finds all attributes correct, document as "verified — no changes needed" in execution log.
- If any gaps found, add missing attributes following existing patterns in the file.

**Auth gating:** N/A — existing auth gates preserved.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the QotdComposer's crisis detection behavior
- DO NOT change CommentInput's dynamic ID pattern (it supports multiple instances per page)
- DO NOT modify form submission behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `QotdComposer: textarea has aria-describedby linking to char count` | integration | Verify attribute |
| `QotdComposer: CharacterCount renders when above threshold` | integration | Type enough text → count visible |
| `QotdComposer: textarea has aria-invalid when over limit` | integration | Type beyond max → attribute present |
| `QotdComposer: CharacterCount uses zone-based colors` | integration | Verify warning/danger thresholds |
| `CommentInput: textarea has aria-label` | integration | Verify "Comment" label |
| `CommentInput: textarea has aria-invalid when crisis detected` | integration | Type crisis keyword → attribute |

**Expected state after completion:**
- [ ] QotdComposer uses `CharacterCount` component instead of inline count
- [ ] QotdComposer textarea always has `aria-describedby`
- [ ] QotdComposer textarea has `aria-invalid` for over-limit
- [ ] CommentInput accessibility verified
- [ ] Tests pass

---

### Step 6: ReportDialog + RoutineBuilder — Content Form Accessibility

**Objective:** Add character count and aria attributes to ReportDialog textarea. Add validation error and accessible name to RoutineBuilder name input.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Modify
- `frontend/src/components/music/RoutineBuilder.tsx` — Modify
- `frontend/src/components/prayer-wall/__tests__/ReportDialog.test.tsx` — Modify

**Details:**

**ReportDialog:**
- Add `maxLength={500}` to textarea.
- Add `CharacterCount` component below textarea:
  ```tsx
  <CharacterCount current={reason.length} max={500} visibleAt={300} id="report-char-count" />
  ```
- Add `aria-describedby="report-char-count"` to textarea (unconditional).
- Keep existing `aria-label="Report reason"` — it provides the accessible name.

**RoutineBuilder:**
- The name input already has `<label htmlFor="routine-name">Routine Name</label>` — this is the visible label. Verify it's a proper `<label>` element.
- Add character count display below name input:
  ```tsx
  <CharacterCount current={name.length} max={50} visibleAt={35} id="routine-name-count" />
  ```
- Add `aria-describedby` to name input linking to error and char count.
- Add validation: when user clicks Save with empty name, show inline error:
  ```tsx
  {showNameError && (
    <p id="routine-name-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      Routine name is required
    </p>
  )}
  ```
- Add `aria-invalid={showNameError ? 'true' : undefined}` to name input.
- Track `showNameError` state: set to `true` on save attempt when name is empty, clear when user types.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change ReportDialog's dialog/overlay structure
- DO NOT change RoutineBuilder's step management or audio playback logic
- DO NOT add crisis detection to ReportDialog (not a user content creation form)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ReportDialog: textarea has maxLength 500` | unit | Verify attribute |
| `ReportDialog: character count renders when typing` | integration | Type 300+ chars → count visible |
| `ReportDialog: textarea has aria-describedby` | unit | Verify attribute |
| `RoutineBuilder: shows error when saving with empty name` | integration | Click save → error visible |
| `RoutineBuilder: name input has aria-invalid on error` | integration | Verify attribute |
| `RoutineBuilder: error clears when user types` | integration | Type → error gone |
| `RoutineBuilder: character count shows near limit` | integration | Type 35+ chars → count visible |

**Expected state after completion:**
- [ ] ReportDialog textarea has maxLength, character count, aria-describedby
- [ ] RoutineBuilder name input has validation error, aria-invalid, character count
- [ ] Tests pass

---

### Step 7: SleepTimerPanel + BibleSearchMode — Minor Accessibility Additions

**Objective:** Add `aria-label` to SleepTimerPanel custom minutes input if missing. Add `aria-describedby` to BibleSearchMode linking search input to results status.

**Files to create/modify:**
- `frontend/src/components/bible/SleepTimerPanel.tsx` — Verify/modify
- `frontend/src/components/bible/BibleSearchMode.tsx` — Modify

**Details:**

**SleepTimerPanel:**
- Reconnaissance shows custom minutes input has `id="custom-timer-input"` with an associated `<label htmlFor="custom-timer-input">` (sr-only: "Custom timer duration in minutes").
- The spec asks for `aria-label="Custom minutes"`. Since a `<label>` association already exists, `aria-label` would override it. The existing label is more descriptive.
- **Decision:** Verify the `<label>` → `<input>` association works correctly. If it does, document as "verified — existing label association is sufficient, more descriptive than spec's suggestion." If the label is missing or broken, add `aria-label="Custom minutes"` as fallback.
- Add `aria-invalid` for invalid number input (e.g., below 5 or above 480): `aria-invalid={customMinutes && (parseInt(customMinutes) < 5 || parseInt(customMinutes) > 480) ? 'true' : undefined}`.

**BibleSearchMode:**
- The results status already has `aria-live="polite"` with `aria-atomic="true"` (line 72). It renders messages like "3 verses found" or "No verses found".
- Add an `id` to the results status element: `id="bible-search-status"`.
- Add `aria-describedby="bible-search-status"` to the search input.
- This links the input to its associated results status for screen readers.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change SleepTimerPanel's existing radiogroup patterns for preset durations
- DO NOT change BibleSearchMode's search logic or debounce behavior
- DO NOT add character limits to the search input

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SleepTimerPanel: custom input has accessible name` | unit | Verify label association or aria-label |
| `SleepTimerPanel: custom input has aria-invalid for out-of-range` | unit | Type 3 → aria-invalid="true" |
| `BibleSearchMode: search input has aria-describedby` | unit | Verify `aria-describedby="bible-search-status"` |
| `BibleSearchMode: status element has matching id` | unit | Verify `id="bible-search-status"` |
| `BibleSearchMode: status announces search results` | integration | Type search → status text updates |

**Expected state after completion:**
- [ ] SleepTimerPanel custom input accessibility verified/enhanced
- [ ] BibleSearchMode search input linked to results status via `aria-describedby`
- [ ] Tests pass

---

### Step 8: GratitudeWidget + EveningReflection — Aria-Label Updates

**Objective:** Update gratitude input `aria-label` values from generic "Gratitude item N" to descriptive spec-required labels. Verify EveningReflection textarea accessibility.

**Files to create/modify:**
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — Modify
- `frontend/src/components/dashboard/EveningReflection.tsx` — Modify
- `frontend/src/components/dashboard/__tests__/GratitudeWidget.test.tsx` — Modify

**Details:**

**GratitudeWidget:**
- Update the 3 input `aria-label` attributes from `aria-label={`Gratitude item ${i + 1}`}` to the spec-required descriptive labels:
  ```typescript
  const GRATITUDE_LABELS = [
    'First thing you\'re grateful for',
    'Second thing you\'re grateful for',
    'Third thing you\'re grateful for',
  ] as const
  ```
- Apply: `aria-label={GRATITUDE_LABELS[i]}`
- Update existing tests that query by the old `aria-label` values.

**EveningReflection:**
- Step 2 (Highlights textarea): Already has `aria-label="Today's highlights"` and `aria-describedby="evening-char-count"`. Verify these are correct — no changes expected.
- Step 3 (Gratitude inputs): Update from `aria-label={`Gratitude item ${i + 1}`}` to `aria-label={GRATITUDE_LABELS[i]}` using the same constant array (import from a shared location or define inline).
- Since both GratitudeWidget and EveningReflection need the same labels, define `GRATITUDE_LABELS` in a shared location: `frontend/src/constants/gratitude.ts`. Both components import from there.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the EveningReflection's step flow or mood radiogroup
- DO NOT change the GratitudeWidget's save/load logic
- DO NOT modify crisis detection in either component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `GratitudeWidget: first input has aria-label "First thing you're grateful for"` | unit | `getByLabelText('First thing you\'re grateful for')` |
| `GratitudeWidget: second input has correct aria-label` | unit | Same pattern |
| `GratitudeWidget: third input has correct aria-label` | unit | Same pattern |
| `EveningReflection: highlights textarea has aria-label` | unit | Verify "Today's highlights" |
| `EveningReflection: highlights textarea has aria-describedby for char count` | unit | Verify attribute |
| `EveningReflection: gratitude inputs have descriptive aria-labels` | unit | Verify spec-required labels |

**Expected state after completion:**
- [ ] GratitudeWidget inputs have descriptive `aria-label` attributes
- [ ] EveningReflection gratitude inputs match GratitudeWidget labels
- [ ] EveningReflection highlight textarea verified
- [ ] Shared `GRATITUDE_LABELS` constant created
- [ ] Updated GratitudeWidget tests pass

---

### Step 9: WelcomeWizard + VerseCardActions + SearchControls — Final Accessibility Additions

**Objective:** Verify WelcomeWizard accessibility (likely no-op). Add `aria-invalid` to VerseCardActions note textarea. Add `aria-label` and `aria-describedby` to SearchControls location input.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx` — Verify (modify only if gaps found)
- `frontend/src/components/ask/VerseCardActions.tsx` — Modify
- `frontend/src/components/local-support/SearchControls.tsx` — Modify

**Details:**

**WelcomeWizard:**
- Reconnaissance shows display name input already has:
  - `aria-invalid={showNameError ? 'true' : undefined}`
  - `aria-describedby="wizard-name-error"` (conditional)
  - Inline error with `id="wizard-name-error"` and `role="alert"`
- Verify `aria-describedby` links correctly (ID matches error element).
- If already correct, document as "verified — no changes needed" in execution log.
- If `aria-describedby` is conditional (only present when error shows), make it unconditional — screen readers should always know the description target. When error isn't visible, the element won't exist, which is fine per ARIA spec.

**VerseCardActions:**
- Note textarea currently has `id={`note-${verse.reference}`}` and `<label htmlFor>` but no `aria-invalid`.
- Add `aria-invalid={noteText.length > NOTE_MAX_CHARS ? 'true' : undefined}` to textarea.
- The existing character count display (`{noteText.length} / {NOTE_MAX_CHARS}`) is plain text, not using `CharacterCount` component. Add `aria-describedby` linking to a count element:
  - Add `id={`note-count-${verse.reference}`}` to the count display `<span>`.
  - Add `aria-describedby={`note-count-${verse.reference}`}` to the textarea.

**SearchControls:**
- Location input currently has sr-only `<label htmlFor="location-input">` with text "City or zip code".
- Spec wants `aria-label="Search location"` — but the existing `<label>` association provides the accessible name. Adding `aria-label` would override the label text.
- **Decision:** Keep the existing `<label>` association (it's more descriptive). Do NOT add `aria-label` that would override it.
- Add `aria-describedby` linking to the geo status message element. The geo status is at `<p role="status">` — add `id="location-geo-status"` to that element and `aria-describedby="location-geo-status"` to the input.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change WelcomeWizard's screen flow or validation logic
- DO NOT change VerseCardActions' save/share behavior
- DO NOT change SearchControls' geolocation or search logic
- DO NOT override existing `<label>` associations with `aria-label`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `WelcomeWizard: name input has aria-describedby` | unit | Verify attribute present |
| `WelcomeWizard: name input has aria-invalid when error shows` | unit | Verify attribute |
| `VerseCardActions: note textarea has aria-invalid when over limit` | unit | Type beyond limit → attribute |
| `VerseCardActions: note textarea has aria-describedby for count` | unit | Verify attribute |
| `SearchControls: location input has aria-describedby for geo status` | unit | Verify attribute |
| `SearchControls: geo status element has matching id` | unit | Verify `id="location-geo-status"` |

**Expected state after completion:**
- [ ] WelcomeWizard accessibility verified (no changes or minor fix)
- [ ] VerseCardActions note textarea has `aria-invalid` and `aria-describedby`
- [ ] SearchControls location input linked to geo status via `aria-describedby`
- [ ] All tests pass
- [ ] Full test suite passes (`pnpm test`)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `useRovingTabindex` hook |
| 2 | — | AuthModal full accessibility migration |
| 3 | 1 | InlineComposer textarea + category radiogroup |
| 4 | 1 | PrayerComposer + EditPrayerForm radiogroup |
| 5 | — | QotdComposer + CommentInput verify/enhance |
| 6 | — | ReportDialog + RoutineBuilder accessibility |
| 7 | — | SleepTimerPanel + BibleSearchMode accessibility |
| 8 | — | GratitudeWidget + EveningReflection aria-labels |
| 9 | — | WelcomeWizard + VerseCardActions + SearchControls |

Steps 1 and 2 can run in parallel. Steps 3 and 4 depend on Step 1. Steps 5-9 are independent of each other and of Steps 2-4.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create `useRovingTabindex` hook | [COMPLETE] | 2026-04-01 | Created `hooks/useRovingTabindex.ts` + `hooks/__tests__/useRovingTabindex.test.ts`. 14 tests pass. Hook supports horizontal/vertical/both orientations with wrapping navigation. |
| 2 | AuthModal full accessibility migration | [COMPLETE] | 2026-04-01 | Modified `AuthModal.tsx` + tests. Added: required indicators on all labels, `noValidate` on forms (custom JS validation), register field validation (first name, last name, confirm password with blur+submit), reset email validation with aria-invalid/describedby. 23 tests pass. |
| 3 | InlineComposer accessibility + category radiogroup | [COMPLETE] | 2026-04-01 | Modified `InlineComposer.tsx` + tests. Added aria-invalid on textarea, converted category pills to radiogroup with roving tabindex. Updated existing tests from aria-pressed to aria-checked. 27 tests pass. |
| 4 | PrayerComposer + EditPrayerForm radiogroup | [COMPLETE] | 2026-04-01 | Modified `PrayerComposer.tsx`, `EditPrayerForm.tsx`, `PrayerComposer.test.tsx`, `CardActions.test.tsx`. Converted pills to radiogroup + roving tabindex. Updated aria-pressed → aria-checked in tests. 24+18 tests pass. |
| 5 | QotdComposer + CommentInput verify/enhance | [COMPLETE] | 2026-04-01 | QotdComposer: replaced inline char count with CharacterCount component, made aria-describedby unconditional, added aria-invalid for over-limit. CommentInput: verified — already has aria-label, aria-invalid, aria-describedby with dynamic IDs. No changes needed. 15+5 tests pass. |
| 6 | ReportDialog + RoutineBuilder accessibility | [COMPLETE] | 2026-04-01 | ReportDialog: added maxLength=500, CharacterCount, aria-describedby. RoutineBuilder: added name validation with aria-invalid, inline error, CharacterCount. Created `music/__tests__/RoutineBuilder.test.tsx`. 6+4 tests pass. |
| 7 | SleepTimerPanel + BibleSearchMode accessibility | [COMPLETE] | 2026-04-01 | SleepTimerPanel: verified existing label association is sufficient, added aria-invalid for out-of-range. BibleSearchMode: added id="bible-search-status" to status div, aria-describedby to search input. Created `bible/__tests__/BibleSearchMode.test.tsx`. 17+3 tests pass. |
| 8 | GratitudeWidget + EveningReflection aria-labels | [COMPLETE] | 2026-04-01 | Created `constants/gratitude.ts` with shared GRATITUDE_LABELS. Updated GratitudeWidget.tsx + EveningReflection.tsx to use descriptive labels. Updated GratitudeWidget tests. EveningReflection highlights textarea verified — already has correct aria-label and aria-describedby. 15+40 tests pass. |
| 9 | WelcomeWizard + VerseCardActions + SearchControls | [COMPLETE] | 2026-04-01 | WelcomeWizard: made aria-describedby unconditional (minor fix). VerseCardActions: added aria-invalid for over-limit, aria-describedby + id on count span. SearchControls: added aria-describedby to input, id to geo status. Fixed MyPrayers.test.tsx reference to aria-pressed → radio. Full suite: 463 files, 5288 tests pass. |
