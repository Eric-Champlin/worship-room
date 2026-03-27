# Implementation Plan: Form Accessibility Improvements

**Spec:** `_specs/form-accessibility-improvements.md`
**Date:** 2026-03-27
**Branch:** `claude/feature/form-accessibility-improvements`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/<feature>/ComponentName.tsx`
- Hooks: `frontend/src/hooks/hookName.ts`
- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Tests: `frontend/src/components/<feature>/__tests__/ComponentName.test.tsx` or `frontend/src/hooks/__tests__/hookName.test.tsx`
- Pages: `frontend/src/pages/PageName.tsx`

### Existing Patterns

**Character counts:** Currently inline `<span>` elements with inconsistent implementation. Some use `aria-live`, some don't. Some show at threshold, some always show. Colors vary. The spec standardizes all of these via a `CharacterCount` component.

**Error display:** Some forms use `role="alert"` (PrayerComposer, InlineComposer), some use color-only nudges (PrayTabContent). The spec standardizes via `FormField` wrapper with `text-sm text-red-400` + AlertCircle icon.

**Aria attributes:** Inconsistent. Some inputs have `aria-label` (PrayTabContent, InlineComposer, GratitudeWidget), some have `<label>` elements (AuthModal, BibleSearch), some have neither (MoodCheckIn textarea, ProfileSection bio). The spec adds accessible names to all.

**Modal pattern:** All modals use:
- `fixed inset-0 z-50` overlay
- `role="dialog"` or `role="alertdialog"` + `aria-modal="true"`
- `useFocusTrap(isOpen, onClose)` for keyboard trapping
- `isClosing` state + `motion-safe:animate-backdrop-fade-in/out` + `motion-safe:animate-modal-spring-in/out`
- `useReducedMotion()` to skip animation
- 150ms close timeout before calling `onClose()`
- `document.body.style.overflow = 'hidden'` while open
- Examples: `AuthModal.tsx:25-51`, `DeletePrayerDialog.tsx`, `ReportDialog.tsx`

**React Router:** v6.22.0. `useBlocker` is available but NOT currently used anywhere. The `useUnsavedChanges` hook will be the first consumer.

**Test patterns (Vitest + React Testing Library):**
- Files: `__tests__/ComponentName.test.tsx`
- Imports: `{ render, screen } from '@testing-library/react'`, `{ describe, it, expect, vi, beforeEach } from 'vitest'`, `userEvent from '@testing-library/user-event'`
- Provider wrapping via `wrapper` function or inline JSX
- Queries: `screen.getByRole()`, `screen.getByText()`, `screen.getByLabelText()`, `screen.queryByText()`
- Assertions: `toBeInTheDocument()`, `toHaveAttribute()`, `toBe()`

### Key Files Inventory

| Input | File | Approx Lines |
|-------|------|-------------|
| Pray textarea | `src/components/daily/PrayTabContent.tsx` | ~703-722 |
| Journal textarea | `src/components/daily/JournalTabContent.tsx` | ~463-517 |
| Mood check-in textarea | `src/components/dashboard/MoodCheckIn.tsx` | ~207-218 |
| Prayer Wall composer | `src/components/prayer-wall/InlineComposer.tsx` | ~101-111 |
| Prayer Wall comment | `src/components/prayer-wall/CommentInput.tsx` | ~66-83 |
| Bible note editor | `src/components/bible/NoteEditor.tsx` | ~49-71 |
| Prayer title | `src/components/my-prayers/PrayerComposer.tsx` | ~59-90 |
| Prayer description | `src/components/my-prayers/PrayerComposer.tsx` | ~98-117 |
| Answered testimony | `src/components/my-prayers/PrayerComposer.tsx` or related | TBD |
| Edit prayer form | `src/components/my-prayers/EditPrayerForm.tsx` | TBD |
| Gratitude inputs (x3) | `src/components/dashboard/GratitudeWidget.tsx` | ~152-162 |
| Evening reflection | `src/components/dashboard/EveningReflection.tsx` | ~322-332 |
| AI Bible Chat | `src/pages/AskPage.tsx` | ~223-246 |
| Reading Plan AI | `src/components/reading-plans/CreatePlanFlow.tsx` | ~188-199 |
| Display name | `src/components/settings/ProfileSection.tsx` | ~128-148 |
| Bio textarea | `src/components/settings/ProfileSection.tsx` | ~156-171 |
| Delete account | `src/components/settings/DeleteAccountModal.tsx` | buttons only |
| Friend search | `src/components/friends/FriendSearch.tsx` | ~111-125 |
| Bible search | `src/components/bible/BibleSearchMode.tsx` | ~42-49 |
| Auth email | `src/components/prayer-wall/AuthModal.tsx` | ~205-211 |
| Auth password | `src/components/prayer-wall/AuthModal.tsx` | ~218-225 |

---

## Auth Gating Checklist

This spec does NOT introduce any new auth-gated actions. All forms retain their existing auth behavior. No new auth checks are needed.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No new auth gates | N/A | Existing auth behavior unchanged |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Error text | color | `text-red-400` (#F87171) | spec |
| Error text | size | `text-sm` (14px) | spec |
| Error icon | component | `AlertCircle` from Lucide | spec |
| Char count (normal) | color | `text-white/40` | spec |
| Char count (warning) | color | `text-amber-400` (#FBBF24) | spec |
| Char count (danger) | color | `text-red-400` (#F87171) | spec |
| Char count | size | `text-xs` (12px) | spec |
| Required indicator | color | `text-red-400` (#F87171) | spec |
| Input focus glow | border | `border-glow-cyan` (#00D4FF) | design-system.md |
| Input background | bg | `bg-white/[0.06]` | spec (frosted glass) |
| Modal overlay | bg | `bg-black/50` | AuthModal.tsx:98 |
| Modal panel | bg | `bg-[#1a0f2e]` or `bg-white` | varies (dark context here) |
| Modal animation (in) | class | `motion-safe:animate-modal-spring-in` | AuthModal.tsx:94 |
| Modal animation (out) | class | `motion-safe:animate-modal-spring-out` | AuthModal.tsx:93 |
| Backdrop animation (in) | class | `motion-safe:animate-backdrop-fade-in` | AuthModal.tsx:91 |
| Backdrop animation (out) | class | `motion-safe:animate-backdrop-fade-out` | AuthModal.tsx:90 |

---

## Design System Reminder

**Project-specific quirks for every UI step:**

- Worship Room uses Caveat (`font-script`) for hero headings, not Lora
- All textareas use frosted glass `bg-white/[0.06]` with `border-glow-cyan` focus glow — do NOT change input styling
- Modal animations use `motion-safe:animate-modal-spring-in/out` + `motion-safe:animate-backdrop-fade-in/out` with 150ms close timeout
- `useReducedMotion()` hook (from `@/hooks/useReducedMotion`) to skip animations for `prefers-reduced-motion`
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dark background pages use `text-white/40` for muted text, `text-white/70` for secondary text
- All modals use `useFocusTrap(isOpen, onClose)` from `@/hooks/useFocusTrap`
- Error messages in Prayer Wall already use `role="alert"` — maintain this pattern
- Crisis detection is already integrated in all relevant forms — do NOT touch crisis banner logic

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec.

**localStorage keys this spec touches:** None. No new `wr_*` keys introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | All form improvements render identically. Char counts/errors stack below inputs at full width. |
| Tablet | 768px | Same — no breakpoint-specific changes. |
| Desktop | 1440px | Same — char counts and error messages render inline below their inputs. |

The `FormField` wrapper, `CharacterCount` component, and error messages are all block-level elements that flow naturally below inputs. The unsaved changes modal is centered and responsive (same as existing modals). No breakpoint-specific overrides needed.

---

## Vertical Rhythm

Not applicable — this spec adds elements below existing inputs (char counts, errors) and does not change section spacing. The added elements use `mt-1` (4px) gap below inputs, consistent with existing char count spacing in PrayerComposer.tsx.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **Delete Account confirmation input does NOT exist.** The spec lists "Settings — Delete Account Confirmation Input" but `DeleteAccountModal.tsx` only has button-based confirmation (no text input). Per the spec's own Out of Scope rule ("Adding new form fields — only enhancing existing inputs"), this input is SKIPPED. If the user wants to add a DELETE confirmation input, that is a separate feature.
- [ ] **Friend search already has `aria-label="Search for friends"`** — spec wants `"Search friends"`. Plan updates to match spec.
- [ ] **Bible search already has a sr-only `<label>`** — spec wants `aria-label="Search the Bible"`. Plan adds aria-label for consistency.
- [ ] **Auth modal inputs already have visible `<label>` elements** — spec wants `aria-label` attributes. Plan adds aria-labels AND inline validation errors.
- [ ] **Comment input is `<input>` not `<textarea>`** — spec says "Comment Input" but actual element is a single-line input. Character count and aria attributes apply the same way.
- [ ] **Answered testimony textarea** — need to locate exact component during execution (may be in PrayerComposer.tsx or a separate MarkAsAnsweredForm.tsx)
- [ ] React Router 6.22.0 supports `useBlocker` — confirmed
- [ ] No existing `useBlocker` usage in codebase — confirmed, this is the first implementation
- [ ] All auth-gated actions from the spec are accounted for — N/A, no new auth gates
- [ ] Design system values verified from spec + codebase inspection
- [ ] All [UNVERIFIED] values flagged — none needed (spec provides exact values)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delete Account confirmation input | Skip | Does not exist in codebase; spec's Out of Scope says "only enhancing existing inputs" |
| FormField wrapping strategy | Selective wrapping — use FormField where layout allows; add individual aria/count props where deep embedding makes wrapping impractical | Some inputs (e.g., mood check-in inside a modal, gratitude widget in a compact card) have tight layouts. FormField provides the accessibility attributes via `children` render prop or React.cloneElement. |
| CharacterCount threshold announcements | Track previous threshold in a ref, announce via sr-only aria-live="polite" span only when crossing warning→danger boundaries | Spec explicitly says "not on every keystroke" — use ref to track previous zone |
| useBlocker behavior | Use React Router's `useBlocker` with `shouldBlock` callback | React Router 6.22 stable API. Blocker state drives the confirmation modal. |
| FormField aria-describedby injection | Use `React.cloneElement` to inject aria-describedby/aria-invalid onto the child input | Avoids requiring input components to accept these props explicitly — FormField handles it transparently |
| Journal unsaved changes isDirty definition | `isDirty = text !== lastSavedText` where lastSavedText updates on save/submit AND on initial load from localStorage draft | Draft auto-save already exists; the user should be warned about changes since last save, not since page load |
| Char count visibility thresholds | Per-input as specified in the spec (some at 1 char, some at 300+, some at 500+) | Pass `charVisibleAt` prop to FormField/CharacterCount |

---

## Implementation Steps

### Step 1: Create `CharacterCount` Component

**Objective:** Build the shared character count display with accessible threshold announcements.

**Files to create/modify:**
- `frontend/src/components/ui/CharacterCount.tsx` — new component
- `frontend/src/components/ui/__tests__/CharacterCount.test.tsx` — new tests

**Details:**

```typescript
interface CharacterCountProps {
  current: number
  max: number
  warningAt?: number   // defaults to Math.floor(max * 0.8)
  dangerAt?: number    // defaults to Math.floor(max * 0.96)
  visibleAt?: number   // minimum chars before count appears (defaults to 1)
  id?: string          // for aria-describedby connection
  className?: string   // additional positioning classes
}
```

Implementation:
- Format numbers with `toLocaleString()` for comma formatting (e.g., "4,000 / 5,000")
- Visual display: `<span aria-hidden="true" className="text-xs {colorClass}">X / Y</span>`
- Color logic: `current >= dangerAt ? 'text-red-400' : current >= warningAt ? 'text-amber-400' : 'text-white/40'`
- SR announcements: separate `<span className="sr-only" aria-live="polite">` that ONLY updates text when crossing a threshold boundary
- Use `useRef` to track previous zone ('normal' | 'warning' | 'danger'), announce `"{remaining} characters remaining"` only when zone changes
- Return `null` when `current < visibleAt`
- The component renders as an inline block element positioned by the consumer

**Responsive behavior:** N/A: no UI impact — component inherits parent layout.

**Guardrails (DO NOT):**
- DO NOT announce on every keystroke — only at threshold crossings
- DO NOT use `aria-live="assertive"` — use `"polite"` to avoid interrupting screen reader flow
- DO NOT change any existing input styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders count in X / Y format | unit | Given current=50, max=500, renders "50 / 500" |
| formats numbers with commas | unit | Given current=4200, max=5000, renders "4,200 / 5,000" |
| normal color below warning | unit | current=100, max=500 → has class `text-white/40` |
| warning color at threshold | unit | current=400, max=500, warningAt=400 → has class `text-amber-400` |
| danger color at threshold | unit | current=480, max=500, dangerAt=480 → has class `text-red-400` |
| visual element has aria-hidden | unit | The visible count span has `aria-hidden="true"` |
| sr announcement on warning crossing | unit | Simulate crossing from normal→warning zone → sr-only text updates to "X characters remaining" |
| sr announcement on danger crossing | unit | Simulate crossing from warning→danger zone → sr-only text updates |
| no sr announcement within same zone | unit | current changes within normal zone → sr-only text does not update |
| hidden below visibleAt | unit | current=0, visibleAt=1 → renders null |
| visible at visibleAt | unit | current=1, visibleAt=1 → renders count |
| custom visibleAt threshold | unit | current=299, visibleAt=300 → renders null; current=300 → renders |

**Expected state after completion:**
- [ ] `CharacterCount` component exists at `components/ui/CharacterCount.tsx`
- [ ] All 12 tests pass
- [ ] Component exported from `components/ui/CharacterCount.tsx`

---

### Step 2: Create `FormField` Wrapper Component

**Objective:** Build the presentation-only wrapper that standardizes accessible form patterns.

**Files to create/modify:**
- `frontend/src/components/ui/FormField.tsx` — new component
- `frontend/src/components/ui/__tests__/FormField.test.tsx` — new tests

**Details:**

```typescript
interface FormFieldProps {
  label: string
  srOnly?: boolean          // default false — visually hide label
  required?: boolean        // default false — show red asterisk
  error?: string | null     // inline error message
  charCount?: number        // current character count
  charMax?: number          // max character limit
  charWarningAt?: number    // amber threshold
  charDangerAt?: number     // red threshold
  charVisibleAt?: number    // min chars before count appears (default 1)
  helpText?: string         // supplementary help text
  children: React.ReactElement // the actual input/textarea
  className?: string        // wrapper class
}
```

Implementation:
- Generate unique IDs via `useId()`: `${id}-error`, `${id}-help`, `${id}-count`
- Build `aria-describedby` string from present IDs (error > help > count)
- Use `React.cloneElement(children, { 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined })` to inject props onto child
- Label: `<label htmlFor={childId} className={srOnly ? 'sr-only' : 'block text-sm font-medium text-white/70 mb-1'}>` with `{required && <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>}<span className="sr-only">{required ? ' required' : ''}</span>`
- Error: `{error && <p id={errorId} role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}`
- Character count: render `<CharacterCount>` when `charMax` is provided, positioned below input with `mt-1`
- Help text: `{helpText && <p id={helpId} className="mt-1 text-xs text-white/40">{helpText}</p>}`
- The wrapper div gets `className` prop for positioning
- Child input's existing `id` is used for `htmlFor` if present; otherwise generate one

**Responsive behavior:** N/A: no UI impact — wrapper inherits parent layout. Error/count elements are block-level and stack naturally.

**Guardrails (DO NOT):**
- DO NOT change any styling on the child input element — only inject aria attributes
- DO NOT add margin/padding to the wrapper that would displace existing layout
- DO NOT manage form state — this is presentation only
- DO NOT use `dangerouslySetInnerHTML` for error messages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders label and child | unit | Label text visible, child input renders |
| sr-only label when srOnly=true | unit | Label has `sr-only` class |
| required asterisk renders | unit | When required=true, red asterisk visible |
| required sr-only text | unit | Screen reader text "required" present |
| error message renders with icon | unit | When error="msg", AlertCircle icon + text visible |
| error has role=alert | unit | Error `<p>` has `role="alert"` |
| aria-invalid injected on error | unit | Child input gets `aria-invalid="true"` when error present |
| aria-invalid absent without error | unit | Child input does NOT have `aria-invalid` when error=null |
| aria-describedby connects error | unit | Child input's `aria-describedby` includes error element ID |
| aria-describedby connects help | unit | When helpText provided, child's `aria-describedby` includes help ID |
| character count renders | unit | When charCount and charMax provided, CharacterCount renders |
| help text renders | unit | When helpText provided, text visible below input |

**Expected state after completion:**
- [ ] `FormField` component exists at `components/ui/FormField.tsx`
- [ ] All 12 tests pass
- [ ] Component uses `CharacterCount` from Step 1

---

### Step 3: Create `useUnsavedChanges` Hook + Modal

**Objective:** Build the unsaved changes detection hook with React Router navigation blocking and browser beforeunload.

**Files to create/modify:**
- `frontend/src/hooks/useUnsavedChanges.ts` — new hook
- `frontend/src/components/ui/UnsavedChangesModal.tsx` — new modal component
- `frontend/src/hooks/__tests__/useUnsavedChanges.test.ts` — new tests
- `frontend/src/components/ui/__tests__/UnsavedChangesModal.test.tsx` — new tests

**Details:**

**`useUnsavedChanges` hook:**
```typescript
function useUnsavedChanges(isDirty: boolean): void
```

- When `isDirty` is true: register `beforeunload` event listener that calls `e.preventDefault()` (standard browser confirmation dialog)
- When `isDirty` is true: call `useBlocker(() => isDirty)` from `react-router-dom` to block React Router navigation
- Render `<UnsavedChangesModal>` when blocker state is `'blocked'` — the hook returns a React element or uses a portal
- Alternative approach: the hook returns `{ blocker }` and the consumer renders the modal. This is cleaner since hooks can't render JSX. The consumer wraps the modal.
- Clean up `beforeunload` listener on unmount or when `isDirty` becomes false

**Revised API (hooks can't return JSX):**
```typescript
function useUnsavedChanges(isDirty: boolean): {
  showModal: boolean
  confirmLeave: () => void
  cancelLeave: () => void
}
```

- `showModal`: true when React Router navigation is blocked
- `confirmLeave`: proceeds with navigation (`blocker.proceed()`)
- `cancelLeave`: cancels navigation (`blocker.reset()`)
- The consumer renders `<UnsavedChangesModal>` using these values

**`UnsavedChangesModal` component:**
```typescript
interface UnsavedChangesModalProps {
  isOpen: boolean
  onLeave: () => void    // "Leave without saving"
  onStay: () => void     // "Keep editing"
}
```

- Same modal pattern as AuthModal/DeletePrayerDialog: `isClosing` state, 150ms timeout, `useFocusTrap`, `useReducedMotion`, spring animations
- Dark-themed to match the app: `bg-[#1a0f2e] border border-white/10 rounded-2xl`
- `role="alertdialog"` (destructive action warning)
- `aria-labelledby` pointing to heading
- `aria-describedby` pointing to message
- Message: "You have unsaved changes. Leave without saving?"
- "Leave without saving" button: `bg-white/10 text-white border border-white/15` (secondary)
- "Keep editing" button: `bg-primary text-white` (primary, auto-focused)
- Escape key = "Keep editing" (stay on page) — handled by `useFocusTrap(isOpen, onStay)`
- `document.body.style.overflow = 'hidden'` while open

**Responsive behavior:** N/A: modal is centered and responsive via `max-w-md w-full mx-4` (same as other modals).

**Guardrails (DO NOT):**
- DO NOT use `unstable_useBlocker` — use `useBlocker` (stable in React Router 6.22)
- DO NOT block navigation when `isDirty` is false
- DO NOT use Framer Motion — use CSS animation classes consistent with other modals
- DO NOT persist any state to localStorage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| beforeunload listener added when dirty | unit | Mock addEventListener, verify `beforeunload` registered |
| beforeunload listener removed when not dirty | unit | Set isDirty false → listener removed |
| beforeunload listener cleaned up on unmount | unit | Unmount hook → listener removed |
| showModal false when not blocked | unit | isDirty=false → showModal=false |
| confirmLeave calls blocker.proceed | unit | Mock useBlocker, verify proceed called |
| cancelLeave calls blocker.reset | unit | Mock useBlocker, verify reset called |
| modal renders message | unit | UnsavedChangesModal isOpen=true → "You have unsaved changes" visible |
| modal Leave button calls onLeave | unit | Click "Leave without saving" → onLeave called |
| modal Stay button calls onStay | unit | Click "Keep editing" → onStay called |
| modal Escape calls onStay | unit | Press Escape → onStay called |
| modal has alertdialog role | unit | role="alertdialog" present |
| modal focus trapped | unit | Tab cycles within modal |

**Expected state after completion:**
- [ ] `useUnsavedChanges` hook exists at `hooks/useUnsavedChanges.ts`
- [ ] `UnsavedChangesModal` exists at `components/ui/UnsavedChangesModal.tsx`
- [ ] All 12 tests pass
- [ ] `useBlocker` imported from `react-router-dom`

---

### Step 4: Daily Hub — Pray Tab

**Objective:** Add `CharacterCount` component, inline error on empty submit, and verify `aria-label` on the Pray tab textarea.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — modify
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — modify (add tests)

**Details:**

Current state (PrayTabContent.tsx ~703-722):
- Textarea already has `aria-label="Prayer request"` and `maxLength={500}`
- Has `aria-describedby="pray-char-count"` connecting to a simple `{text.length}/500` span
- Empty submit shows a "nudge" state (colored text) but NOT the spec's inline error format

Changes:
1. Replace the existing `{text.length}/500` span with `<CharacterCount current={text.length} max={500} warningAt={400} dangerAt={480} id="pray-char-count" />` — maintains the existing `aria-describedby` connection
2. Add inline error on empty submit: when the existing "nudge" state fires, render `<p id="pray-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />Tell God what's on your heart — even a few words is enough</p>` below the textarea
3. Add `aria-invalid={nudgeActive ? 'true' : undefined}` to the textarea
4. Update `aria-describedby` to include error ID when error is showing: `aria-describedby={nudgeActive ? 'pray-error pray-char-count' : 'pray-char-count'}`

**Auth gating:** No change — existing auth behavior unchanged.

**Responsive behavior:** N/A: error message and char count are block elements that stack below textarea at all widths.

**Guardrails (DO NOT):**
- DO NOT change the nudge/validation logic itself — only add the inline error display
- DO NOT remove the existing `aria-label` or `aria-describedby` attributes
- DO NOT touch the crisis banner, KaraokeText, or prayer generation logic
- DO NOT change textarea styling (frosted glass, glow, etc.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| character count renders with CharacterCount component | integration | Type text → "X / 500" format visible |
| character count warning color at 400 | integration | Type 400 chars → amber color class |
| inline error on empty submit | integration | Click generate with empty textarea → error message visible |
| error has AlertCircle icon | integration | Error state shows AlertCircle icon |
| aria-invalid on empty submit | integration | textarea gets `aria-invalid="true"` during nudge |

**Expected state after completion:**
- [ ] Pray tab textarea shows `CharacterCount` component
- [ ] Empty submit shows inline error with AlertCircle icon
- [ ] `aria-invalid` set during error state
- [ ] All existing Pray tab tests still pass + 5 new tests pass

---

### Step 5: Daily Hub — Journal Tab

**Objective:** Replace existing character count with `CharacterCount` component and add `useUnsavedChanges` hook.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — modify
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — modify (add tests)

**Details:**

Current state (JournalTabContent.tsx ~463-517):
- Textarea already has `aria-label="Journal entry"` and `maxLength={5000}`
- Has `aria-describedby="journal-char-count"` with an existing char count span
- Has `aria-live="polite"` on char count (only at 4500+)
- Has `onDirtyChange` callback to parent for dirty tracking

Changes:
1. Replace the existing char count span with `<CharacterCount current={text.length} max={5000} warningAt={4000} dangerAt={4800} id="journal-char-count" />`
2. Add `useUnsavedChanges` hook: `const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)` where `isDirty` = text content differs from last saved/submitted state (use existing dirty tracking logic)
3. Render `<UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />` at end of component
4. Determine `isDirty`: compare current `text` state against `lastSavedText` ref that updates on save/submit and initial draft load

**Auth gating:** No change.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change draft auto-save logic
- DO NOT change the existing `onDirtyChange` callback behavior
- DO NOT remove existing `aria-label` or crisis detection
- DO NOT change textarea styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| character count uses CharacterCount component | integration | Type text → comma-formatted count visible |
| warning color at 4000 chars | integration | Type 4000+ chars → amber color |
| unsaved changes modal shows on navigation | integration | Type text, attempt navigate → modal visible |
| "Keep editing" stays on page | integration | Click "Keep editing" → modal closes, text preserved |

**Expected state after completion:**
- [ ] Journal textarea shows `CharacterCount` component with comma formatting
- [ ] `useUnsavedChanges` active when text differs from last saved state
- [ ] All existing Journal tests pass + 4 new tests

---

### Step 6: Dashboard — Mood Check-In

**Objective:** Add `aria-label` and replace existing character count with `CharacterCount` component on the mood text textarea.

**Files to create/modify:**
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — modify
- `frontend/src/components/dashboard/__tests__/MoodCheckIn.test.tsx` — modify (add tests)

**Details:**

Current state (MoodCheckIn.tsx ~207-218):
- Textarea has `maxLength={280}` (via `MAX_MOOD_TEXT_LENGTH`)
- Has a char count display with color coding at thresholds
- Missing `aria-label`
- No `aria-describedby` connection

Changes:
1. Add `aria-label="Share what's on your heart"` to textarea
2. Replace existing char count span with `<CharacterCount current={charCount} max={280} warningAt={224} dangerAt={269} id="mood-char-count" />`
3. Add `aria-describedby="mood-char-count"` to textarea

**Auth gating:** No change — mood check-in is already dashboard-only (logged-in).

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the mood orb selection logic
- DO NOT change the encouragement verse flow
- DO NOT touch crisis detection
- DO NOT change the modal overlay behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| textarea has aria-label | integration | textarea has `aria-label="Share what's on your heart"` |
| character count renders | integration | Type text → "X / 280" visible |
| warning color at 224 | integration | Type 224+ chars → amber |

**Expected state after completion:**
- [ ] Mood check-in textarea has `aria-label` and `aria-describedby`
- [ ] Character count uses `CharacterCount` component
- [ ] All existing MoodCheckIn tests pass + 3 new tests

---

### Step 7: Prayer Wall — Composer + Comment

**Objective:** Add `CharacterCount` to composer and comment input, add `useUnsavedChanges` to composer, verify category selector aria attributes.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — modify
- `frontend/src/components/prayer-wall/CommentInput.tsx` — modify
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — modify (add tests)
- `frontend/src/components/prayer-wall/__tests__/CommentInput.test.tsx` — modify (add tests)

**Details:**

**InlineComposer (composer textarea):**
Current: `aria-label="Prayer request"`, `maxLength={1000}`, char count at 800+ chars, category error with `role="alert"`
Changes:
1. Replace existing char count with `<CharacterCount current={content.length} max={1000} warningAt={800} dangerAt={960} visibleAt={500} id="composer-char-count" />`
2. Update textarea `aria-describedby` to connect to char count
3. Verify category selector error has `aria-invalid="true"` on the fieldset/select and `aria-describedby` connecting to error. Add if missing.
4. Add required indicator (asterisk) to category label/legend
5. Add `useUnsavedChanges(content.length > 0)` — dirty when any text is typed but not submitted
6. Render `<UnsavedChangesModal>` at bottom of component

**CommentInput:**
Current: `aria-label="Write a comment"` (spec wants "Comment"), `maxLength={500}`, no char count display
Changes:
1. Change `aria-label` to `"Comment"` per spec
2. Add `<CharacterCount current={value.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id={`comment-char-count-${prayerId}`} />`
3. Add `aria-describedby` connecting to char count (when visible)

**Auth gating:** No change.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the auto-expanding textarea behavior
- DO NOT change the anonymous checkbox or category pill buttons
- DO NOT touch crisis detection or prayer submission logic
- DO NOT change the existing `role="alert"` on category error

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| composer char count at 500+ chars | integration | Type 500+ chars → count visible |
| composer warning at 800 | integration | Type 800+ chars → amber |
| composer category required indicator | integration | Asterisk visible on category label |
| composer unsaved changes on navigation | integration | Type text, navigate → modal shows |
| comment aria-label is "Comment" | unit | Input has `aria-label="Comment"` |
| comment char count at 300+ | integration | Type 300+ chars → count visible |

**Expected state after completion:**
- [ ] Composer has `CharacterCount`, `useUnsavedChanges`, category required indicator
- [ ] Comment input has updated `aria-label`, `CharacterCount`
- [ ] All existing tests pass + 6 new tests

---

### Step 8: Bible Reader — Note Editor

**Objective:** Replace existing character count with `CharacterCount` component and add `useUnsavedChanges`.

**Files to create/modify:**
- `frontend/src/components/bible/NoteEditor.tsx` — modify
- `frontend/src/components/bible/__tests__/NoteEditor.test.tsx` — modify (add tests)

**Details:**

Current state (NoteEditor.tsx ~49-71):
- Textarea has `aria-label` (includes verse number)
- Has `maxLength={300}` (from `NOTE_MAX_CHARS`)
- Has char count display with warning color
- Has `isDirty` state and `onDirtyChange` callback

Changes:
1. Replace existing char count with `<CharacterCount current={text.length} max={300} warningAt={240} dangerAt={288} id="note-char-count" />`
2. Add `aria-describedby="note-char-count"` to textarea
3. Add `useUnsavedChanges(isDirty)` — use existing `isDirty` state
4. Render `<UnsavedChangesModal>` at bottom of component

**Auth gating:** No change — Bible notes are logged-in only.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the note save/delete logic
- DO NOT change the existing `aria-label` (it includes verse context)
- DO NOT touch crisis detection

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| char count uses CharacterCount | integration | Type text → "X / 300" visible |
| warning at 240 | integration | Type 240+ chars → amber |
| unsaved changes warning | integration | Type text, navigate → modal shows |

**Expected state after completion:**
- [ ] Note editor uses `CharacterCount` component
- [ ] `useUnsavedChanges` active when note is dirty
- [ ] All existing tests pass + 3 new tests

---

### Step 9: Personal Prayer List Forms

**Objective:** Add `aria-label`s, inline errors, character counts, and `useUnsavedChanges` to prayer list forms.

**Files to create/modify:**
- `frontend/src/components/my-prayers/PrayerComposer.tsx` — modify
- `frontend/src/components/my-prayers/EditPrayerForm.tsx` — modify
- `frontend/src/components/my-prayers/__tests__/PrayerComposer.test.tsx` — modify (add tests)

**Details:**

**PrayerComposer — Title input:**
Current: `maxLength={100}`, has `aria-invalid` + `aria-describedby` for error, char count at 80+
Changes:
1. Add `aria-label="Prayer title"` to input
2. Replace existing char count with `<CharacterCount current={title.length} max={100} warningAt={80} dangerAt={96} visibleAt={80} id="title-char-count" />`
3. Add required indicator (asterisk) — use `<span className="text-red-400" aria-hidden="true">*</span><span className="sr-only">required</span>` next to "Title" label
4. Ensure inline error text matches spec: "Give your prayer a short title"

**PrayerComposer — Description textarea:**
Current: `maxLength={1000}`, char count at 800+
Changes:
1. Add `aria-label="Prayer details"` to textarea
2. Replace existing char count with `<CharacterCount current={description.length} max={1000} warningAt={800} dangerAt={960} visibleAt={500} id="desc-char-count" />`
3. Add `aria-describedby="desc-char-count"` to textarea

**PrayerComposer — Answered testimony textarea:**
Locate the testimony/answered textarea (may be in `MarkAsAnsweredForm.tsx` or similar).
Changes:
1. Add `aria-label="How God answered"` to textarea
2. Add `<CharacterCount current={testimony.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} />`

**Add/Edit forms — Unsaved changes:**
1. Add `useUnsavedChanges(isDirty)` to PrayerComposer — `isDirty = title.length > 0 || description.length > 0`
2. Add `useUnsavedChanges(isDirty)` to EditPrayerForm — `isDirty = any field changed from original`
3. Render `<UnsavedChangesModal>` in each

**Auth gating:** No change — `/my-prayers` is auth-gated.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change prayer submission logic
- DO NOT change category selector behavior
- DO NOT touch crisis detection
- DO NOT change existing `role="alert"` on error messages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| title has aria-label | unit | Input has `aria-label="Prayer title"` |
| title required indicator | unit | Asterisk visible near title label |
| title error message text | integration | Submit empty → "Give your prayer a short title" |
| description has aria-label | unit | Textarea has `aria-label="Prayer details"` |
| description char count at 500+ | integration | Type 500+ chars → count visible |
| unsaved changes on navigation | integration | Type text, navigate → modal shows |

**Expected state after completion:**
- [ ] Prayer title has `aria-label`, required indicator, `CharacterCount`
- [ ] Prayer description has `aria-label`, `CharacterCount`
- [ ] Testimony textarea has `aria-label`, `CharacterCount`
- [ ] `useUnsavedChanges` on Composer and EditPrayerForm
- [ ] All existing tests pass + 6 new tests

---

### Step 10: Dashboard Widgets — Gratitude + Evening Reflection

**Objective:** Add proper `aria-label`s to gratitude inputs and replace evening reflection char count with `CharacterCount`.

**Files to create/modify:**
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — modify
- `frontend/src/components/dashboard/EveningReflection.tsx` — modify
- `frontend/src/components/dashboard/__tests__/EveningReflection.test.tsx` — modify (add tests)

**Details:**

**GratitudeWidget (3 inputs):**
Current: Already has `aria-label={`Gratitude item ${i + 1}`}` and `maxLength={150}`. No char count needed per spec.
Changes: Verify the existing `aria-label` attributes match spec. No further changes needed — gratitude inputs already have correct labels and 150-char limit is generous enough for no count.

**EveningReflection (Step 2 highlights textarea):**
Current: `maxLength={500}`, char count display `{highlightText.length}/{HIGHLIGHT_MAX_LENGTH}`, no `aria-label`
Changes:
1. Add `aria-label="Today's highlights"` to textarea
2. Replace char count with `<CharacterCount current={highlightText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="evening-char-count" />`
3. Add `aria-describedby="evening-char-count"` to textarea

**Auth gating:** No change — both are dashboard-only (logged-in).

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the 4-step evening reflection flow
- DO NOT change gratitude save/edit logic
- DO NOT touch mood orb radiogroup behavior
- DO NOT change the existing `role="radiogroup"` or `role="radio"` in evening reflection step 1

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| gratitude inputs have correct aria-labels | unit | 3 inputs have "Gratitude item 1/2/3" |
| evening textarea has aria-label | unit | Textarea has `aria-label="Today's highlights"` |
| evening char count renders | integration | Type 300+ chars → count visible |
| evening warning at 400 | integration | Type 400+ chars → amber |

**Expected state after completion:**
- [ ] Gratitude inputs verified (already correct)
- [ ] Evening reflection textarea has `aria-label`, `CharacterCount`
- [ ] All existing tests pass + 4 new tests

---

### Step 11: AI Bible Chat + Reading Plan AI

**Objective:** Add/replace character counts on AI Bible Chat and Reading Plan creation textareas.

**Files to create/modify:**
- `frontend/src/pages/AskPage.tsx` — modify
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify

**Details:**

**AskPage (AI Bible Chat textarea):**
Current: `maxLength={500}`, has `aria-describedby="ask-char-count"`, char count with color coding at 450/490
Changes:
1. Replace existing char count with `<CharacterCount current={question.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="ask-char-count" />`
2. Add `aria-label="Your question"` (currently may use placeholder text, not aria-label)
3. Keep existing `aria-describedby`

**CreatePlanFlow (Reading Plan AI textarea):**
Current: `maxLength={500}`, `aria-label="Describe what's on your heart"`, basic char count display
Changes:
1. Update `aria-label` to `"What's on your heart"` per spec
2. Replace char count with `<CharacterCount current={topicText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="plan-char-count" />`
3. Add `aria-describedby="plan-char-count"` to textarea

**Auth gating:** No change.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change AI chat logic or follow-up chip behavior
- DO NOT change plan creation flow steps
- DO NOT touch crisis detection

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ask textarea has aria-label | unit | Textarea has `aria-label="Your question"` |
| ask char count at 300+ | integration | Type 300+ chars → count visible |
| plan textarea has updated aria-label | unit | Textarea has `aria-label="What's on your heart"` |

**Expected state after completion:**
- [ ] AI Bible Chat has `CharacterCount` with correct thresholds
- [ ] Reading Plan AI has updated `aria-label` and `CharacterCount`
- [ ] 3 new tests pass

---

### Step 12: Settings Forms

**Objective:** Add inline validation, character counts, and aria attributes to Settings form inputs.

**Files to create/modify:**
- `frontend/src/components/settings/ProfileSection.tsx` — modify
- `frontend/src/components/settings/__tests__/ProfileSection.test.tsx` — modify (add tests)

**Details:**

**Display Name input:**
Current: `maxLength={30}`, `minLength` validation (2 chars), error display with `role="alert"`, char count
Changes:
1. Add `aria-label="Display name"` (or ensure visible label connects via `htmlFor`)
2. Add `aria-invalid={nameError ? 'true' : undefined}` to input
3. Add `aria-describedby` connecting to error message ID when error is showing
4. Ensure error text matches spec: "Name must be between 2 and 30 characters"
5. Replace char count with `<CharacterCount>` — but the display name is short (30 chars), so keep the simple counter. Per spec, no char count specified for display name.

**Bio textarea:**
Current: `maxLength={160}`, char count display, no `aria-label`
Changes:
1. Add `aria-label="Bio"` to textarea (or add a visible label)
2. Replace char count with `<CharacterCount current={bio.length} max={160} warningAt={128} dangerAt={154} id="bio-char-count" />`
3. Add `aria-describedby="bio-char-count"` to textarea

**Delete Account:** Skipped — no text input exists (button-only dialog). See Assumptions.

**Auth gating:** No change — `/settings` is auth-gated.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the name validation logic
- DO NOT change save behavior
- DO NOT add a DELETE confirmation text input

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| name input has aria-invalid on error | unit | Invalid name → `aria-invalid="true"` |
| name error text matches spec | unit | Error shows "Name must be between 2 and 30 characters" |
| name aria-describedby on error | unit | Input's `aria-describedby` includes error ID |
| bio textarea has aria-label | unit | Textarea has `aria-label` |
| bio char count renders | integration | Type text → "X / 160" visible |

**Expected state after completion:**
- [ ] Display name has `aria-invalid`, `aria-describedby` on error
- [ ] Bio textarea has `aria-label`, `CharacterCount`
- [ ] 5 new tests pass

---

### Step 13: Auth Modal + Search Inputs

**Objective:** Add aria-labels, inline validation, and aria-invalid to Auth Modal inputs. Verify search input aria-labels.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — modify
- `frontend/src/components/friends/FriendSearch.tsx` — modify (minimal)
- `frontend/src/components/bible/BibleSearchMode.tsx` — modify (minimal)
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` — modify (add tests)

**Details:**

**AuthModal — Email input:**
Current: Has `<label>` element, `required`, `autoComplete="email"`, no inline validation display
Changes:
1. Add `aria-label="Email address"` to input (redundant with label but spec requires it)
2. Add validation state: `const [emailError, setEmailError] = useState<string | null>(null)`
3. On submit: if empty → `setEmailError("Email is required")`; if invalid format → `setEmailError("Please enter a valid email")`
4. Render error: `{emailError && <p id="email-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-500"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{emailError}</p>}`
5. Add `aria-invalid={emailError ? 'true' : undefined}` and `aria-describedby={emailError ? 'email-error' : undefined}` to input
6. Clear errors on input change

Note: Use `text-red-500` in AuthModal (light background) vs `text-red-400` in dark-background forms. The AuthModal has a white bg (`bg-white`).

**AuthModal — Password input:**
Same pattern as email:
1. Add `aria-label="Password"` to input
2. On submit: if empty → "Password is required"; if `< 12 chars` → "Password must be at least 12 characters"
3. Render error with same pattern
4. `aria-invalid` + `aria-describedby`

**FriendSearch:**
Current: `aria-label="Search for friends"` — spec wants "Search friends"
Change: Update `aria-label` to `"Search friends"`

**BibleSearchMode:**
Current: Has `<label htmlFor="bible-search-input" className="sr-only">` — accessible name already provided via label
Change: Add `aria-label="Search the Bible"` to input for belt-and-suspenders (label text may differ)

**Auth gating:** No change.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT implement real authentication — this is still a UI shell
- DO NOT change the `handleSubmit` → toast → close flow
- DO NOT change focus trap or modal animation behavior
- DO NOT use `text-red-400` in the light-background AuthModal — use `text-red-500` for sufficient contrast on white

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| email error on empty submit | integration | Submit with empty email → "Email is required" |
| email error on invalid format | integration | Submit with "abc" → "Please enter a valid email" |
| email aria-invalid on error | unit | Error state → `aria-invalid="true"` |
| password error on empty | integration | Submit with empty password → "Password is required" |
| password error on short | integration | Submit with "short" → "Password must be at least 12 characters" |
| password aria-invalid on error | unit | Error state → `aria-invalid="true"` |
| errors clear on input change | integration | Type after error → error clears |
| friend search aria-label updated | unit | Input has `aria-label="Search friends"` |
| bible search aria-label | unit | Input has `aria-label="Search the Bible"` |

**Expected state after completion:**
- [ ] Auth modal has inline email/password validation with `aria-invalid`, `aria-describedby`
- [ ] Friend search label updated to "Search friends"
- [ ] Bible search has `aria-label="Search the Bible"`
- [ ] 9 new tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `CharacterCount` component |
| 2 | 1 | Create `FormField` wrapper (uses CharacterCount) |
| 3 | — | Create `useUnsavedChanges` hook + modal |
| 4 | 1 | Pray tab — CharacterCount + inline error |
| 5 | 1, 3 | Journal tab — CharacterCount + unsaved changes |
| 6 | 1 | Mood check-in — aria-label + CharacterCount |
| 7 | 1, 3 | Prayer Wall — CharacterCount + unsaved changes |
| 8 | 1, 3 | Bible note editor — CharacterCount + unsaved changes |
| 9 | 1, 3 | Personal prayer list — all improvements |
| 10 | 1 | Gratitude + Evening Reflection |
| 11 | 1 | AI Bible Chat + Reading Plan AI |
| 12 | 1 | Settings forms |
| 13 | — | Auth Modal validation + search labels |

Note: Steps 1 and 3 have no dependencies and can be built in parallel. Steps 4-13 depend on Step 1. Steps 5, 7, 8, 9 also depend on Step 3. Step 2 (FormField) depends on Step 1 but is available for use in Steps 4-13 where wrapping makes sense — however, the per-input steps integrate CharacterCount directly and add aria attributes inline rather than always wrapping with FormField, since many inputs have complex existing layouts. FormField is primarily useful for new forms or clean refactors.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | CharacterCount component | [COMPLETE] | 2026-03-27 | Created `components/ui/CharacterCount.tsx` + `__tests__/CharacterCount.test.tsx`. Added `role="status"` to sr-only span for accessible querying. 12/12 tests pass. |
| 2 | FormField wrapper | [COMPLETE] | 2026-03-27 | Created `components/ui/FormField.tsx` + `__tests__/FormField.test.tsx`. Uses CharacterCount from Step 1. 12/12 tests pass. |
| 3 | useUnsavedChanges hook + modal | [COMPLETE] | 2026-03-27 | Created `hooks/useUnsavedChanges.ts`, `components/ui/UnsavedChangesModal.tsx` + tests. Uses `useBlocker` from react-router-dom. 12/12 tests pass. |
| 4 | Pray tab accessibility | [COMPLETE] | 2026-03-27 | Modified PrayTabContent.tsx: replaced inline char count with CharacterCount, added AlertCircle inline error, aria-invalid on nudge, updated aria-describedby. 5 new tests, 39/39 pass. |
| 5 | Journal tab accessibility | [COMPLETE] | 2026-03-27 | Modified JournalTabContent.tsx: replaced char count with CharacterCount, added useUnsavedChanges + UnsavedChangesModal. Updated 1 existing test (char counter position). 4 new tests, 21/21 pass. |
| 6 | Mood check-in accessibility | [COMPLETE] | 2026-03-27 | Modified MoodCheckIn.tsx: added aria-label, replaced char count with CharacterCount, added aria-describedby. Removed unused MOOD_TEXT_WARNING_THRESHOLD import. Updated 1 existing test. 3 new tests, 38/38 pass. |
| 7 | Prayer Wall composer + comment | [COMPLETE] | 2026-03-27 | Modified InlineComposer.tsx: CharacterCount, useUnsavedChanges, category required indicator. Modified CommentInput.tsx: aria-label to "Comment", CharacterCount. Updated 1 existing test. 6 new tests, 21/21 pass. |
| 8 | Bible note editor | [COMPLETE] | 2026-03-27 | Modified NoteEditor.tsx: CharacterCount, aria-describedby, useUnsavedChanges. Updated 3 existing tests for new format. 3 new tests, 17/17 pass. |
| 9 | Personal prayer list forms | [COMPLETE] | 2026-03-27 | Modified PrayerComposer, EditPrayerForm, MarkAnsweredForm: aria-labels, CharacterCount, required indicators, useUnsavedChanges, updated error text. Updated multiple existing tests. 6 new tests, 39/39 pass. |
| 10 | Gratitude + Evening Reflection | [COMPLETE] | 2026-03-27 | Gratitude verified (already correct). Modified EveningReflection.tsx: updated aria-label, replaced char count with CharacterCount. Updated 1 existing test. 3 new tests, 25/25 pass. |
| 11 | AI Bible Chat + Reading Plan AI | [COMPLETE] | 2026-03-27 | Modified AskPage.tsx: added aria-label, replaced char count with CharacterCount. Modified CreatePlanFlow.tsx: updated aria-label, replaced char count. Added global useUnsavedChanges mock to test/setup.ts. Updated existing tests across multiple files. |
| 12 | Settings forms | [COMPLETE] | 2026-03-27 | Modified ProfileSection.tsx: aria-label, aria-invalid, aria-describedby on name input, updated error text, CharacterCount on bio. Updated 3 existing tests. 5 new tests, 17/17 pass. |
| 13 | Auth Modal + search inputs | [COMPLETE] | 2026-03-27 | Modified AuthModal.tsx: added email/password validation, aria-labels, aria-invalid, controlled inputs. FriendSearch: updated aria-label to "Search friends". BibleSearchMode: added aria-label. Created AuthModal.test.tsx (7 tests). Updated Friends.test.tsx + FriendSearch.test.tsx. |
