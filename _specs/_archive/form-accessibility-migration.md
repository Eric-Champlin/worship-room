# Feature: Form Accessibility Migration

**Master Plan Reference:** N/A — standalone cross-cutting accessibility enhancement. Builds on the existing `FormField` component and `CharacterCount` component created in the previous `form-accessibility-improvements` spec.

**Prior Spec Reference:** `_specs/form-accessibility-improvements.md` — built the `FormField` and `CharacterCount` shared components. This spec addresses the adoption gap: migrating production forms to use those components or applying their patterns directly.

---

## Overview

Worship Room's `FormField` component was built during Round 2 to standardize accessible form patterns — `aria-invalid`, `aria-describedby`, character counts, inline error messages, required indicators — but zero production forms adopted it. Every form in the app hand-rolls its own accessibility attributes, leading to inconsistent coverage: some inputs lack labels, some errors are only surfaced via toasts, some textareas have no character counts, and category pill selectors require 12+ tab stops when one would do. This spec migrates the highest-impact forms to use `FormField` (or applies its patterns directly where the component doesn't fit) and converts category pill selectors to a roving-tabindex radiogroup pattern.

Users who pour out vulnerable prayers, journal entries, and mood reflections deserve forms that guide them with clear feedback — visible labels, inline errors at the point of input, and keyboard navigation that respects their time. Screen reader users deserve equal access to every form in the app.

## User Stories

As a **logged-in user**, I want to see **inline validation errors directly below each form input** so that I **know exactly what to fix without hunting for toast messages**.

As a **screen reader user**, I want every form input to have **proper `aria-invalid`, `aria-describedby`, and `aria-label` attributes** so that I can **navigate forms confidently and understand errors when they occur**.

As a **keyboard-only user**, I want category pill selectors to use **arrow-key navigation** so that I **don't have to tab through 12+ individual pills**.

---

## Requirements

### Functional Requirements

#### Strategy: FormField Adoption vs Direct Patterns

1. **Option A (default):** Wrap each input in the existing `FormField` component, which automatically handles `aria-invalid`, `aria-describedby`, error display, character count, required indicator, and label.
2. **Option B (fallback):** For forms where `FormField`'s block-level wrapper doesn't fit the layout (e.g., inline side-by-side fields), apply `FormField`'s patterns directly — same `aria-*` attributes, same error message structure, same IDs.
3. Document which approach was used for each form in the implementation.

#### Priority 1 — Auth Modal (highest traffic form)

The AuthModal (`components/prayer-wall/AuthModal.tsx`) has 3 views: Login, Register, Password Reset.

**Login view:**
- Email and Password inputs: ensure `aria-invalid` toggles on validation error, `aria-describedby` links to inline error message, inline error renders below each input (not just toast).

**Register view:**
- First name input: add `aria-invalid`, `aria-describedby`, inline error message for empty field.
- Last name input: same as first name.
- Email input: ensure full coverage (`aria-invalid`, `aria-describedby`, inline error).
- Password input: ensure full coverage.
- Confirm password input: add `aria-invalid`, `aria-describedby`, inline error. Add validation that value must match the password field — error message: "Passwords do not match".
- All 5 fields: ensure `required` attribute and visible required indicator (asterisk).
- All fields show inline errors on blur and on submit, not only via toasts.

**Password Reset view:**
- Email input: add `aria-invalid`, `aria-describedby`, inline error for empty/invalid email.

#### Priority 2 — Prayer Wall Composers

**InlineComposer** (`components/prayer-wall/InlineComposer.tsx`):
- Textarea: add `aria-invalid` when content exceeds max length. Verify `aria-describedby` links to the existing `CharacterCount`.
- Category selector fieldset: add `aria-invalid` and `aria-describedby` when no category is selected on form submission. Show inline error: "Please choose a category".

**PrayerComposer** (`components/my-prayers/PrayerComposer.tsx`):
- Category fieldset: add `aria-invalid` and `aria-describedby` for category error.
- Textarea: verify proper label and error handling.

**QotdComposer** (`components/prayer-wall/QotdComposer.tsx`):
- Textarea: verify character count and `aria-describedby` linkage. Add if missing.

**CommentInput** (`components/prayer-wall/CommentInput.tsx`):
- Textarea: verify label, `aria-invalid`, and character count integration.

#### Priority 3 — Content Creation Forms

**ReportDialog** (`components/prayer-wall/ReportDialog.tsx`):
- Textarea: add character count (max 500), add `aria-describedby` link, add visible label or `aria-label`.

**RoutineBuilder** (`components/music/RoutineBuilder.tsx`):
- Name input: add visible label ("Routine name") or `aria-label`. Add max length and character count. Add validation error if name is empty on save attempt.

**SleepTimerPanel** (`components/bible/SleepTimerPanel.tsx`):
- Custom minutes number input: add `aria-label="Custom minutes"`. Add validation feedback for invalid numbers.

**BibleSearchMode** (`components/bible/BibleSearchMode.tsx`):
- Search input: add `aria-describedby` linking to a results status element (e.g., "3 results found" or "No results").

#### Priority 4 — Dashboard Forms

**WelcomeWizard** (`components/dashboard/WelcomeWizard.tsx`):
- Display name input: add `aria-describedby` linking to error message. Ensure `aria-invalid` is set when error is visible.

**GratitudeWidget** (`components/dashboard/GratitudeWidget.tsx`):
- 3 gratitude inputs: add `aria-label` attributes ("First thing you're grateful for", "Second thing you're grateful for", "Third thing you're grateful for").

**EveningReflection** (`components/dashboard/EveningReflection.tsx`):
- Highlight textarea: add `aria-label` or visible label. Add `aria-describedby` for any validation messages.
- Gratitude inputs within the evening flow: add `aria-label` attributes (same pattern as GratitudeWidget).

**VerseCardActions** (`components/ask/VerseCardActions.tsx`):
- Note textarea: add `aria-invalid` when note exceeds limit or has validation error.

**SearchControls** (`components/local-support/SearchControls.tsx`):
- Location input: add `aria-label="Search location"`. Add `aria-describedby` linking to the geo status message element.

#### Priority 5 — Category Pill Keyboard Efficiency

Convert category pill selectors from individually-tabbable buttons to a `role="radiogroup"` with roving tabindex:

- Wrap pill container in `<div role="radiogroup" aria-label="Prayer category">`.
- Each pill gets `role="radio"` and `aria-checked="true"/"false"`.
- Only the selected pill (or first pill if none selected) has `tabIndex={0}`; all others have `tabIndex={-1}`.
- Left/Right arrow keys move focus between pills.
- Spacebar or Enter selects the focused pill.
- Reduces tab stops from 12+ to 1 per pill group.

**Applies to:** InlineComposer, PrayerComposer, and any other component with category pill selectors (e.g., EditPrayerForm if it exists).

**Reference pattern:** MoodCheckIn orbs already implement `role="radiogroup"` with roving tabindex correctly — use the same approach.

### Non-Functional Requirements

- **Accessibility:** WCAG 2.1 AA compliance for all modified forms. Every input has an accessible name, every error has `aria-invalid` + `aria-describedby`, every required field has an indicator.
- **Performance:** No new network requests or heavy rendering. All changes are DOM attribute additions and lightweight error state rendering.
- **Backwards compatibility:** All existing form functionality preserved — submission behavior, toast messages, crisis detection, character limits, auth gating.

---

## Auth Gating

This spec modifies the accessibility layer of existing forms only. No new actions are introduced. No auth behavior changes.

| Form | Existing Auth Behavior | Change in This Spec |
|------|----------------------|-------------------|
| AuthModal (Login/Register/Reset) | Public — UI shell only (Phase 3 for real auth) | Adds `aria-invalid`, `aria-describedby`, inline errors, required indicators, confirm password validation |
| InlineComposer | Logged-out can type; submit shows auth modal "Sign in to share a prayer" | Adds `aria-invalid`, category fieldset error, textarea error state |
| PrayerComposer | Auth-gated page (`/my-prayers`) | Adds category `aria-invalid`, `aria-describedby` |
| QotdComposer | Logged-out can type; submit shows auth modal | Verifies/adds character count + `aria-describedby` |
| CommentInput | Logged-out sees auth modal on comment submit | Verifies/adds label, `aria-invalid`, character count |
| ReportDialog | Available to all users (report action) | Adds character count, label |
| RoutineBuilder | Music page (public) | Adds label, validation, character count |
| SleepTimerPanel | Bible reader (public) | Adds `aria-label` on custom minutes input |
| BibleSearchMode | Bible page (public) | Adds `aria-describedby` for results status |
| WelcomeWizard | Dashboard (logged-in only) | Adds `aria-describedby`, `aria-invalid` |
| GratitudeWidget | Dashboard (logged-in only) | Adds `aria-label` on all 3 inputs |
| EveningReflection | Dashboard (logged-in only, after 6 PM) | Adds `aria-label`, `aria-describedby` |
| VerseCardActions | AI chat page (public) | Adds `aria-invalid` on note textarea |
| SearchControls | Local Support (public) | Adds `aria-label`, `aria-describedby` for geo status |
| Category pills | InlineComposer, PrayerComposer (same auth as parent) | Converts to radiogroup with roving tabindex |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All accessibility additions (inline errors, labels, character counts) render block-level below their inputs and inherit existing responsive layouts. Error messages use full width. Category pill radiogroups wrap naturally. No layout changes needed. |
| Tablet (640-1024px) | Same as mobile. All additions are purely additive and flow with existing layouts. |
| Desktop (> 1024px) | Same behavior. Inline errors and character counts render below their inputs as block elements. |

Mobile (375px) note: error messages must render without overlapping inputs. The `FormField` component uses `mt-1` margin which provides adequate spacing. Verify on the AuthModal register view (most fields in the tightest space) that stacked inline errors don't cause overflow.

---

## AI Safety Considerations

N/A — This spec does not introduce any new user input paths or AI-generated content. All modified forms already have crisis detection where applicable (Pray tab, Journal tab, Mood check-in, Prayer Wall all have `CrisisBanner` integration). The accessibility layer is purely additive and does not affect crisis detection behavior.

---

## Auth & Persistence

- **Logged-out users:** All accessibility improvements work in demo mode. `aria-*` attributes, inline errors, character counts, and radiogroup keyboard navigation are presentation-only and require no persistence.
- **Logged-in users:** No new data is persisted. All improvements are presentation-only.
- **localStorage usage:** None. No new `wr_*` keys are introduced.

---

## Completion & Navigation

N/A — this is a cross-cutting accessibility enhancement, not a Daily Hub feature.

---

## Design Notes

- All inputs maintain existing visual styling — frosted glass `bg-white/[0.06]`, cyan glow on focus (`border-glow-cyan`), existing border radius and padding. The `FormField` wrapper adds labels, errors, and counts **around** the input without modifying the input itself.
- Error messages use the existing `FormField` pattern: `text-red-400` with `AlertCircle` icon from Lucide. This provides sufficient contrast on the dark background.
- Required indicators use the existing `FormField` pattern: red asterisk (`text-red-400 ml-0.5`) with sr-only "required" text.
- The `CharacterCount` component (already built) handles color transitions and `aria-live` announcements.
- Category pill radiogroup styling: pills maintain their existing visual appearance (selected = filled, unselected = outlined). The change is semantic (`role="radio"`, `aria-checked`) and behavioral (arrow key navigation), not visual.
- Reference: design system recon (`_plans/recon/design-system.md`) confirms frosted glass input pattern, dark background colors, and text color tokens.
- No new visual patterns are introduced — all elements use existing colors, typography, and component patterns from the design system.

---

## Out of Scope

- **FormField component redesign** — use it as-is or apply its patterns directly.
- **Real form submission** — backend auth is Phase 3.
- **Form submission loading states** — spinners, disabled buttons during async.
- **Multi-step form validation** — wizard-style sequential validation.
- **New validation rules** — no email format, password strength meter, or other rules beyond what currently exists (except confirm password match, which is a clear gap).
- **Touch/mobile keyboard behavior** — autocomplete hints, input type optimization.
- **Unsaved changes warnings** — already covered by the previous `form-accessibility-improvements` spec.
- **Character count additions** — already covered by the previous spec for most inputs. This spec focuses on `aria-*` attributes, inline errors, labels, and category pill keyboard patterns.

---

## Acceptance Criteria

### Auth Modal
- [ ] Login: all inputs have `aria-invalid="true"` when validation error exists
- [ ] Login: all inputs have `aria-describedby` linking to their inline error message element
- [ ] Login: submitting with empty fields shows inline error messages below each invalid input
- [ ] Register: First name, Last name, Email, Password, and Confirm password all have `aria-invalid` on error
- [ ] Register: all 5 fields have `aria-describedby` linking to error message elements with matching IDs
- [ ] Register: all 5 fields have visible required indicator (red asterisk)
- [ ] Register: Confirm password validates against password field — shows "Passwords do not match" when mismatched
- [ ] Register: all fields show inline errors on blur and on submit (not only via toasts)
- [ ] Password Reset: email input has `aria-invalid` and inline error for empty/invalid email

### Prayer Wall Forms
- [ ] InlineComposer textarea has `aria-invalid="true"` when content exceeds max length
- [ ] InlineComposer category fieldset has `aria-invalid="true"` and shows inline error when no category selected on submit
- [ ] InlineComposer category error has `aria-describedby` linking category fieldset to error message
- [ ] PrayerComposer category has `aria-invalid` and `aria-describedby` for category error state
- [ ] QotdComposer textarea has character count linked via `aria-describedby`
- [ ] CommentInput textarea has a proper label (visible or `aria-label`) and `aria-invalid` support

### Content Forms
- [ ] ReportDialog textarea has character count (max 500) with `aria-describedby` link
- [ ] ReportDialog textarea has a visible label or `aria-label`
- [ ] RoutineBuilder name input has a visible label ("Routine name") or `aria-label`
- [ ] RoutineBuilder name input shows validation error if empty on save attempt
- [ ] SleepTimerPanel custom minutes input has `aria-label="Custom minutes"`
- [ ] BibleSearchMode search input has `aria-describedby` linking to a results status element

### Dashboard Forms
- [ ] WelcomeWizard display name input has `aria-describedby` linking to its error message
- [ ] WelcomeWizard display name input has `aria-invalid="true"` when error is visible
- [ ] GratitudeWidget 3 inputs have `aria-label` attributes ("First thing you're grateful for", "Second thing you're grateful for", "Third thing you're grateful for")
- [ ] EveningReflection textareas have `aria-label` or visible labels
- [ ] VerseCardActions note textarea has `aria-invalid` support when exceeding limit
- [ ] SearchControls location input has `aria-label="Search location"`
- [ ] SearchControls location input has `aria-describedby` linking to the geo status message

### Category Pills
- [ ] InlineComposer category pills use `role="radiogroup"` container with `aria-label="Prayer category"`
- [ ] Each category pill has `role="radio"` and `aria-checked="true"/"false"`
- [ ] Only selected (or first) pill has `tabIndex={0}`; others have `tabIndex={-1}`
- [ ] Left/Right arrow keys move focus between pills
- [ ] Spacebar or Enter selects the focused pill
- [ ] PrayerComposer category pills use the same radiogroup pattern
- [ ] Tab stops reduced from 12+ to 1 per pill group

### General
- [ ] Every input that can have an error has `aria-invalid` support
- [ ] Every error message is linked to its input via `aria-describedby` with matching IDs
- [ ] Every input has either a visible `<label>` (with `htmlFor`) or an `aria-label`
- [ ] Required fields have a visible required indicator
- [ ] All existing form functionality is preserved (submission, validation, toast messages, crisis detection)
- [ ] Mobile (375px): error messages render below inputs without overlapping
- [ ] All existing tests pass (tests updated where DOM structure changed)

---

## Test Requirements

- Verify `aria-invalid` toggles correctly on each Priority 1-2 form when errors exist and when errors are cleared
- Verify `aria-describedby` IDs on inputs match the `id` attributes of their associated error message elements
- Verify category pill keyboard navigation: arrow keys move focus, Enter/Space selects, Tab enters/exits group
- Verify AuthModal register confirm password validation shows error on mismatch and clears on match
- Verify ReportDialog character count renders and updates as user types
- Verify screen reader can navigate all Priority 1-2 forms (simulated via `aria-*` attribute assertions in RTL)
- Run existing AuthModal, InlineComposer, PrayerComposer, CommentInput tests — update any that reference changed DOM structure
