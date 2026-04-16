# Feature: Form Accessibility Improvements

**Master Plan Reference:** N/A — standalone cross-cutting accessibility enhancement

---

## Overview

Worship Room handles deeply personal content — prayers, journal entries, mood reflections, gratitude items. When users pour out their hearts through these forms, they deserve immediate, clear feedback: character counts so they know their limits, inline errors so they can fix mistakes without guessing, aria attributes so screen reader users can navigate confidently, and unsaved-changes warnings so no heartfelt words are lost. This spec adds a consistent accessibility layer across every form and text input in the app without changing any existing validation logic, submission behavior, or feature functionality.

## User Story

As a **logged-in user** (or logged-out visitor interacting with demo-mode forms), I want to see **inline validation messages, character counts, and unsaved-changes warnings** on every form input so that I get **immediate feedback on input issues and never lose work unexpectedly**.

As a **screen reader user**, I want all form inputs to have **proper aria-labels, aria-invalid states, and aria-describedby connections** so that I can **understand and navigate forms confidently**.

---

## Requirements

### Shared Components

#### 1. `FormField` Wrapper Component

A presentation-only wrapper that standardizes accessible form patterns. It does not manage state or validation logic.

**Props:**
- `label` (string) — visible label text (or sr-only if the design uses placeholder-only)
- `srOnly` (boolean, default: false) — whether the label is visually hidden
- `required` (boolean, default: false) — shows a red asterisk with sr-only "required" text
- `error` (string | null) — inline error message to display below the input
- `charCount` (number, optional) — current character count
- `charMax` (number, optional) — maximum character limit
- `charWarningAt` (number, optional) — threshold for amber color (defaults to 80% of max)
- `charDangerAt` (number, optional) — threshold for red color (defaults to 96% of max)
- `charVisibleAt` (number, optional) — minimum chars before count appears (defaults to 1)
- `helpText` (string, optional) — supplementary help text below the input
- `children` — the actual input/textarea element

**Behavior:**
- Generates a unique ID (e.g., `useId()`) for aria connections
- Passes `aria-describedby` pointing to the help text and/or error message IDs
- Passes `aria-invalid="true"` to the child when `error` is non-null
- Required indicator: small asterisk in `text-red-400` next to the label, with `<span className="sr-only">required</span>`
- Error message: `text-sm text-red-400` with an `AlertCircle` icon (from Lucide), below the input
- The wrapper adds labels, errors, and counts **around** the input without changing the input's own visual styling (frosted glass `bg-white/[0.06]`, cyan glow on focus remain untouched)

#### 2. `CharacterCount` Component

A shared character count display with accessible live announcements.

**Props:**
- `current` (number) — current character count
- `max` (number) — maximum allowed
- `warningAt` (number, optional) — defaults to 80% of max
- `dangerAt` (number, optional) — defaults to 96% of max

**Visual rendering:**
- Format: `"X / Y"` in `text-xs`
- Color transitions: `text-white/40` (normal) → `text-amber-400` (warning) → `text-red-400` (danger)
- The visual count element has `aria-hidden="true"`
- Use comma formatting for numbers >= 1,000 (e.g., "4,200 / 5,000")

**Screen reader announcements:**
- A separate `sr-only` span with `aria-live="polite"`
- Announces `"X characters remaining"` **once** when crossing the warning threshold and **once** when crossing the danger threshold
- Does NOT announce on every keystroke (that would be overwhelming)
- Implementation: track previous threshold state, only announce when crossing a boundary

#### 3. `useUnsavedChanges` Hook

Tracks whether a form has unsaved modifications and warns the user before navigation.

**Parameters:**
- `isDirty` (boolean) — whether the form has unsaved changes

**Behavior:**
- When `isDirty` is true and the user tries to navigate away:
  - **Browser navigation** (back, close tab, refresh): `beforeunload` event with standard browser confirmation
  - **React Router navigation** (link clicks, tab switches, route changes): blocks navigation and shows a custom modal
- Cleans up the `beforeunload` listener on unmount or when `isDirty` becomes false

**Unsaved Changes Modal:**
- Uses the standard modal spring animation pattern (consistent with existing modals in the app)
- Dark overlay with centered modal
- Message: "You have unsaved changes. Leave without saving?"
- Two buttons: "Leave without saving" (secondary/outline) and "Keep editing" (primary/filled)
- Pressing Escape = "Keep editing" (stay on page)

---

### Per-Input Specifications

#### Daily Hub — Pray Tab Textarea
- **Character limit:** 500
- **aria-label:** "Prayer request"
- **Character count:** visible when >= 1 character typed. Shows "X / 500". Amber at 400+, red at 480+.
- **Inline error on empty submit:** "Tell God what's on your heart — even a few words is enough" — displayed as `text-sm text-red-400` with AlertCircle icon below the textarea (replaces the current less-visible colored text approach)
- **Unsaved changes:** No (prayer generation is a single action, not a draft)

#### Daily Hub — Journal Tab Textarea
- **Character limit:** 5,000
- **aria-label:** "Journal entry"
- **Character count:** visible when >= 1 character typed. Shows "X / 5,000" (comma-formatted). Amber at 4,000+, red at 4,800+.
- **Unsaved changes:** Yes — apply `useUnsavedChanges` hook. The journal draft auto-save to localStorage partially mitigates data loss, but the user should still be warned before navigation. `isDirty` = textarea content differs from last saved/submitted state.

#### Dashboard — Mood Check-In Textarea
- **Character limit:** 280
- **aria-label:** "Share what's on your heart"
- **Character count:** visible when >= 1 character typed. Shows "X / 280". Amber at 224+ (80%), red at 269+ (96%).
- **Note:** Currently shows a warning at 250+ but no actual count. Replace with the `CharacterCount` component.

#### Prayer Wall — Inline Composer Textarea
- **Character limit:** 1,000
- **aria-label:** "Prayer request"
- **Character count:** visible at 500+ characters (existing threshold logic). Shows "X / 1,000" (comma-formatted). Amber at 800+, red at 960+.
- **Category selector:** Verify the existing "Please choose a category" error uses `aria-invalid` and `aria-describedby`. Add these if missing. Add a required indicator (asterisk) on the category label.
- **Unsaved changes:** Yes — apply `useUnsavedChanges` when content is typed but not submitted.

#### Prayer Wall — Comment Input
- **Character limit:** 500
- **aria-label:** "Comment"
- **Character count:** visible at 300+ characters. Shows "X / 500". Amber at 400+, red at 480+.

#### Bible Reader — Note Editor Textarea
- **Character limit:** 300
- **aria-label:** "Verse note"
- **Character count:** visible when >= 1 character typed. Shows "X / 300". Amber at 240+, red at 288+.
- **Unsaved changes:** Yes — apply `useUnsavedChanges` when note content is typed but not saved.

#### Personal Prayer List — Title Input
- **Character limit:** 100
- **aria-label:** "Prayer title"
- **Required:** Yes — show asterisk indicator
- **Inline error on empty submit:** "Give your prayer a short title"
- **Character count:** visible at 80+ characters. Shows "X / 100". Amber at 80+, red at 96+.

#### Personal Prayer List — Description Textarea
- **Character limit:** 1,000
- **aria-label:** "Prayer details"
- **Character count:** visible at 500+ characters. Shows "X / 1,000" (comma-formatted). Amber at 800+, red at 960+.

#### Personal Prayer List — Answered Testimony Textarea
- **Character limit:** 500
- **aria-label:** "How God answered"
- **Character count:** visible at 300+ characters. Shows "X / 500". Amber at 400+, red at 480+.

#### Personal Prayer List — Add/Edit Forms
- **Unsaved changes:** Yes — apply `useUnsavedChanges` when content is typed but not saved.

#### Gratitude Dashboard Widget — Inputs (x3)
- **Character limit:** 150 each
- **aria-labels:** "Gratitude item 1", "Gratitude item 2", "Gratitude item 3"
- **Character count:** None needed (150 chars is generous for a single line)

#### Evening Reflection — Textarea
- **Character limit:** 500
- **aria-label:** "Today's highlights"
- **Character count:** visible at 300+ characters. Shows "X / 500". Amber at 400+, red at 480+.

#### AI Bible Chat — Textarea
- **Character limit:** 500
- **aria-label:** "Your question"
- **Character count:** visible at 300+ characters. Shows "X / 500". Amber at 400+, red at 480+.

#### Reading Plan AI Creation — Textarea
- **Character limit:** 500
- **aria-label:** "What's on your heart"
- **Character count:** visible at 300+ characters. Shows "X / 500". Amber at 400+, red at 480+.

#### Settings — Display Name Input
- **Character limit:** 2–30 characters
- **Inline validation:** "Name must be between 2 and 30 characters" when the value is outside this range (on blur or submit)

#### Settings — Bio Textarea
- **Character limit:** 160
- **Character count:** visible when >= 1 character typed. Shows "X / 160". Amber at 128+, red at 154+.

#### Settings — Delete Account Confirmation Input
- **aria-label:** "Type DELETE to confirm"
- **Inline error:** "Type DELETE exactly to confirm" when the input doesn't match on submit

#### Friend Search Input
- **aria-label:** "Search friends"
- No character count needed

#### Bible Search Input
- **aria-label:** "Search the Bible"
- No character count needed

#### Auth Modal — Email Input
- **aria-label:** "Email address"
- **Inline validation on submit:** "Email is required" if empty, "Please enter a valid email" if format is invalid
- **aria-invalid:** true when validation fails

#### Auth Modal — Password Input
- **aria-label:** "Password"
- **Inline validation on submit:** "Password is required" if empty, "Password must be at least 12 characters" if too short
- **aria-invalid:** true when validation fails

---

### Non-Functional Requirements

- **Accessibility:** WCAG 2.1 AA compliance for all form patterns
  - Every input has an accessible name (visible label or `aria-label`)
  - Every input with an error has `aria-invalid="true"`
  - Error messages and help text connected via `aria-describedby`
  - Character count announcements via `aria-live="polite"` (threshold-based, not per-keystroke)
- **Performance:** Character count rendering on every keystroke must not cause layout thrashing. Use lightweight state updates only.
- **Dark theme compatibility:** All colors specified above are for the dark theme (`#0f0a1e` background). `text-red-400` provides approximately 5:1 contrast ratio. `text-white/40` passes WCAG AA for supplementary (non-essential) UI.

---

## Auth Gating

This feature adds an accessibility layer on top of existing forms. It does not introduce new actions or change any auth gating behavior. Each form's existing auth behavior is unchanged:

| Form | Existing Auth Behavior | Change in This Spec |
|------|----------------------|-------------------|
| Pray tab textarea | Logged-out can type; "Generate Prayer" shows auth modal | No change — only adds aria-label, char count, inline error |
| Journal tab textarea | Logged-out can type; "Save" shows auth modal | No change — adds aria-label, char count, unsaved changes warning |
| Mood check-in | Only visible to logged-in users | No change — adds aria-label, char count |
| Prayer Wall composer | Logged-out can type; submit shows auth modal | No change — adds aria-label, char count, category aria, unsaved changes |
| Prayer Wall comments | Logged-out sees auth modal on comment | No change — adds aria-label, char count |
| Bible note editor | Logged-in only | No change — adds aria-label, char count, unsaved changes |
| Personal prayer list | Auth-gated page (`/my-prayers`) | No change — adds aria-labels, inline errors, char counts, unsaved changes |
| Gratitude widget | Dashboard (logged-in only) | No change — adds aria-labels |
| Evening reflection | Dashboard (logged-in only) | No change — adds aria-label, char count |
| AI Bible Chat | Public page, but chat is demo/mock | No change — adds aria-label, char count |
| Reading Plan AI | Auth-gated | No change — adds aria-label, char count |
| Settings forms | Auth-gated page (`/settings`) | No change — adds inline validation, char counts, aria-labels |
| Auth modal | Public (login/register stub) | No change — adds aria-labels, inline validation, aria-invalid |
| Friend search | Auth-gated page (`/friends`) | No change — adds aria-label |
| Bible search | Public page (`/bible`) | No change — adds aria-label |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All form improvements render identically. Character counts appear below inputs at full width. Error messages stack below inputs. No layout changes needed — the accessibility layer is purely additive and inherits the existing responsive behavior of each form. |
| Tablet (640–1024px) | Same as mobile — no breakpoint-specific changes. |
| Desktop (> 1024px) | Same behavior. Character counts and error messages render inline below their inputs. |

The `FormField` wrapper, `CharacterCount` component, and error messages are all block-level elements that flow naturally below inputs. The unsaved changes modal is centered and responsive (same as existing modals in the app). No breakpoint-specific overrides are needed.

---

## AI Safety Considerations

This spec does not introduce any new AI-generated content or new user input paths. It adds accessibility metadata (aria attributes, character counts, inline error messages) to **existing** forms that already have crisis detection where applicable (Pray tab, Journal tab, Mood check-in, Prayer Wall all already have `CrisisBanner` integration). No additional crisis detection is needed.

---

## Auth & Persistence

- **Logged-out users:** All accessibility improvements (aria-labels, character counts, inline errors) work in demo mode. The `useUnsavedChanges` hook also works for logged-out users (they can type in Pray/Journal textareas without saving). No new data is persisted.
- **Logged-in users:** No new data is persisted. All improvements are presentation-only.
- **localStorage usage:** None. No new `wr_*` keys are introduced.

---

## Completion & Navigation

N/A — this is a cross-cutting accessibility enhancement, not a Daily Hub feature.

---

## Design Notes

- All inputs maintain their existing visual styling — frosted glass `bg-white/[0.06]`, cyan glow on focus (`border-glow-cyan`), existing border radius and padding. The `FormField` wrapper adds labels, errors, and counts **around** the input without modifying the input itself.
- Error messages use `text-red-400` (`#F87171`) which provides sufficient contrast on the dark background (`#0f0a1e`).
- Character counts use `text-white/40` at normal state (supplementary UI), `text-amber-400` at warning, `text-red-400` at danger.
- The `AlertCircle` icon in error messages comes from Lucide (already used in the project).
- The unsaved changes modal follows the standard modal pattern used elsewhere in the app (dark overlay, centered card, spring animation from Framer Motion).
- No new visual patterns are introduced — all elements use existing colors and typography from the design system.
- Reference: Design system recon (`_plans/recon/design-system.md`) confirms the frosted glass input pattern, dark background colors, and text color tokens used throughout.

---

## Out of Scope

- **Changing any validation logic** — this spec only surfaces existing validation as inline messages. No new validation rules.
- **Changing submission behavior** — forms still submit exactly as before.
- **Adding new form fields** — only enhancing existing inputs.
- **Server-side validation** — Phase 3 concern. This is frontend accessibility only.
- **Dark mode toggle** — the app is already dark-themed; these improvements work on the existing dark background.
- **Real-time collaborative editing warnings** — single-user only.
- **Form state management library** (React Hook Form, Formik, etc.) — the `FormField` component is a lightweight wrapper, not a form library.
- **Backend API changes** — none needed.
- **Character count on inputs without limits** (Friend search, Bible search) — these don't have character limits, so no count is shown.

---

## Acceptance Criteria

### Shared Components
- [ ] `FormField` wrapper component exists and accepts `label`, `srOnly`, `required`, `error`, `charCount`, `charMax`, `helpText`, and `children` props
- [ ] `FormField` generates a unique ID and connects `aria-describedby` to error/help text elements
- [ ] `FormField` renders `aria-invalid="true"` on the child input when `error` is non-null
- [ ] `FormField` required indicator shows a red asterisk (`text-red-400`) with sr-only "required" text
- [ ] `FormField` error message renders below the input as `text-sm text-red-400` with an AlertCircle icon
- [ ] `CharacterCount` component renders "X / Y" format with comma formatting for numbers >= 1,000
- [ ] `CharacterCount` color transitions: `text-white/40` → `text-amber-400` (at warningAt) → `text-red-400` (at dangerAt)
- [ ] `CharacterCount` visual element has `aria-hidden="true"`
- [ ] `CharacterCount` has a separate sr-only `aria-live="polite"` region that announces "X characters remaining" when crossing warning and danger thresholds (not on every keystroke)
- [ ] `useUnsavedChanges` hook registers a `beforeunload` listener when `isDirty` is true
- [ ] `useUnsavedChanges` hook blocks React Router navigation when `isDirty` is true and shows a confirmation modal
- [ ] Unsaved changes modal has "Leave without saving" (secondary) and "Keep editing" (primary) buttons
- [ ] Unsaved changes modal dismisses on Escape (stays on page)
- [ ] `useUnsavedChanges` hook cleans up `beforeunload` listener on unmount

### Per-Input — Aria Labels
- [ ] Pray tab textarea has `aria-label="Prayer request"`
- [ ] Journal tab textarea has `aria-label="Journal entry"`
- [ ] Mood check-in textarea has `aria-label="Share what's on your heart"`
- [ ] Prayer Wall composer textarea has `aria-label="Prayer request"`
- [ ] Prayer Wall comment input has `aria-label="Comment"`
- [ ] Bible note editor textarea has `aria-label="Verse note"`
- [ ] Prayer title input has `aria-label="Prayer title"`
- [ ] Prayer details textarea has `aria-label="Prayer details"`
- [ ] Answered testimony textarea has `aria-label="How God answered"`
- [ ] Gratitude inputs have `aria-label="Gratitude item 1"`, `"Gratitude item 2"`, `"Gratitude item 3"`
- [ ] Evening reflection textarea has `aria-label="Today's highlights"`
- [ ] AI Bible Chat textarea has `aria-label="Your question"`
- [ ] Reading Plan AI textarea has `aria-label="What's on your heart"`
- [ ] Delete account input has `aria-label="Type DELETE to confirm"`
- [ ] Friend search input has `aria-label="Search friends"`
- [ ] Bible search input has `aria-label="Search the Bible"`
- [ ] Auth modal email input has `aria-label="Email address"`
- [ ] Auth modal password input has `aria-label="Password"`

### Per-Input — Character Counts
- [ ] Pray tab shows "X / 500" when >= 1 char, amber at 400+, red at 480+
- [ ] Journal tab shows "X / 5,000" when >= 1 char, amber at 4,000+, red at 4,800+
- [ ] Mood check-in shows "X / 280" when >= 1 char, amber at 224+, red at 269+
- [ ] Prayer Wall composer shows "X / 1,000" at 500+ chars, amber at 800+, red at 960+
- [ ] Prayer Wall comment shows "X / 500" at 300+ chars, amber at 400+, red at 480+
- [ ] Bible note editor shows "X / 300" when >= 1 char, amber at 240+, red at 288+
- [ ] Prayer title shows "X / 100" at 80+ chars, amber at 80+, red at 96+
- [ ] Prayer details shows "X / 1,000" at 500+ chars, amber at 800+, red at 960+
- [ ] Answered testimony shows "X / 500" at 300+ chars, amber at 400+, red at 480+
- [ ] Evening reflection shows "X / 500" at 300+ chars, amber at 400+, red at 480+
- [ ] AI Bible Chat shows "X / 500" at 300+ chars, amber at 400+, red at 480+
- [ ] Reading Plan AI shows "X / 500" at 300+ chars, amber at 400+, red at 480+
- [ ] Settings bio shows "X / 160" when >= 1 char, amber at 128+, red at 154+

### Per-Input — Inline Errors
- [ ] Pray tab empty submit shows "Tell God what's on your heart — even a few words is enough" as inline error below textarea
- [ ] Prayer title empty submit shows "Give your prayer a short title" as inline error
- [ ] Settings display name shows "Name must be between 2 and 30 characters" when out of range
- [ ] Delete account shows "Type DELETE exactly to confirm" when input doesn't match
- [ ] Auth modal email shows "Email is required" when empty, "Please enter a valid email" when format is invalid
- [ ] Auth modal password shows "Password is required" when empty, "Password must be at least 12 characters" when too short
- [ ] Prayer Wall category selector has `aria-invalid` and `aria-describedby` on its existing error state

### Per-Input — Unsaved Changes
- [ ] Journal tab triggers unsaved changes warning when navigating away with typed content
- [ ] Prayer Wall composer triggers unsaved changes warning when navigating away with typed content
- [ ] Prayer list add/edit triggers unsaved changes warning when navigating away with typed content
- [ ] Bible note editor triggers unsaved changes warning when navigating away with typed content

### General
- [ ] No existing validation logic, submission behavior, or feature functionality is changed
- [ ] All inputs maintain their existing visual styling (frosted glass, cyan glow)
- [ ] All improvements work on the dark theme background
- [ ] Tests pass for all modified components
