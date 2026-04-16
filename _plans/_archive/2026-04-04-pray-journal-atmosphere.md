# Implementation Plan: Pray & Journal Atmosphere

**Spec:** `_specs/pray-journal-atmosphere.md`
**Date:** 2026-04-04
**Branch:** `claude/feature/pray-journal-atmosphere-01`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable — standalone visual spec, sibling to `devotional-atmosphere.md` and `meditate-atmosphere.md`

---

## Architecture Context

### Relevant Files

- **`frontend/src/components/daily/PrayTabContent.tsx`** (224 lines) — parent container for the Pray tab. Current structure wraps a `max-w-2xl` div around a `relative` container, a `BackgroundSquiggle` layer (opacity-[0.12] with `SQUIGGLE_MASK_STYLE`), then a sibling `relative z-10`-effect div holding `PrayerResponse` / `PrayerInput` / `GuidedPrayerSection`. `GuidedPrayerPlayer` renders as a sibling of the `max-w-2xl` div (fixed-position overlay).
- **`frontend/src/components/daily/PrayerInput.tsx`** (157 lines) — `<h2>` heading at lines 79-84 uses Caveat split pattern: white `text-2xl sm:text-3xl lg:text-4xl` base + `<span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Heart?</span>`. Also contains starter chips, textarea with cyan glow-pulse, crisis banner, error nudge, and Generate Prayer button — none of these change.
- **`frontend/src/components/daily/JournalTabContent.tsx`** (268 lines) — parent container for the Journal tab. Current structure: outer `max-w-2xl` div → `relative` squiggle wrapper (same pattern as Pray) → `JournalInput`. SavedEntriesList and FeatureEmptyState render as siblings of the squiggle wrapper (inside the `max-w-2xl` container). Also contains the toast/milestone logic (unchanged).
- **`frontend/src/components/daily/JournalInput.tsx`** (333 lines) — `<h2>` heading at lines 149-152 uses identical Caveat split pattern with "Mind?" as the script word. Also contains: mode toggle, context banner, Guided prompt card, Free Write note, textarea with cyan glow-pulse, character count, voice input mic button, draft-saved indicator, crisis banner, Save Entry button, UnsavedChangesModal — none of these change.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (85 lines) — already supports `glowOpacity?: number` prop (added in devotional-atmosphere plan Step 1). The `center` variant renders a single orb at `top-[30%] left-1/2 -translate-x-1/2` with default opacity 0.15; passing `glowOpacity={0.30}` overrides to the spec's 0.25-0.35 target range. Container applies `bg-hero-bg` (needs `className="!bg-transparent"` override since `DailyHub.tsx:196` already has `bg-hero-bg` on the page root). Children auto-wrapped in `relative z-10`.
- **`frontend/src/constants/gradients.tsx`** (32 lines) — exports `GRADIENT_TEXT_STYLE` (CSSProperties object applied via `style={}` attribute) using `WHITE_PURPLE_GRADIENT` (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`) with `WebkitBackgroundClip: 'text'` + `WebkitTextFillColor: 'transparent'`.
- **`frontend/src/components/BackgroundSquiggle.tsx`** — decorative SVG. Exports `SQUIGGLE_MASK_STYLE`. Stays in place; layered inside the GlowBackground wrapper on both tabs.
- **`frontend/src/components/daily/MeditateTabContent.tsx`** (169 lines) — **sibling precedent**. Already uses `<GlowBackground variant="split" glowOpacity={0.30} className="!bg-transparent">` wrapping a `max-w-2xl` div → relative squiggle wrapper → `relative` content div → `GRADIENT_TEXT_STYLE` h2. Pray and Journal tabs mirror this exact structure (only variant changes to `center`).
- **`frontend/src/components/daily/DevotionalTabContent.tsx`** — sibling precedent using `variant="center"` with `glowOpacity={0.30}` and `className="!bg-transparent"` (line 145 — confirmed pattern).
- **`frontend/src/pages/DailyHub.tsx`** (417 lines) — parent page. Tab panels rendered bare (no extra wrapping) at lines 343-368. GlowBackground is added INSIDE each tab content component, not at the page level. Page root has `bg-hero-bg` (line 196), which is why tab-level GlowBackground wrappers need `!bg-transparent`.

### Existing Test Files

- **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** (761 lines) — Wrapper: `MemoryRouter` + `AuthProvider` + `ToastProvider` + `AuthModalProvider`. Mocks: `AudioProvider`, `useScenePlayer`, `useFaithPoints`, `useReducedMotion`. Line 687 contains `screen.getByText(/What's On Your/)` which matches partial text — will still pass after the heading changes to "What's On Your Heart?" as a single text node.
- **`frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`** (437 lines) — Wrapper: `MemoryRouter` + `AuthProvider` + `ToastProvider` + `AuthModalProvider`. Mocks: `AudioProvider`, `useScenePlayer`, `useFaithPoints`, `useUnsavedChanges`. No existing heading text assertions — safe from breakage.
- **`frontend/src/components/daily/__tests__/JournalMilestones.test.tsx`** — Same mocks/wrapper as JournalTabContent test. No heading assertions.
- **`frontend/src/pages/__tests__/MeditateLanding.test.tsx`** lines 87-128 — reference pattern for new tests: gradient heading test (`expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })`), no `.font-script` span test, `screen.getAllByTestId('glow-orb')` for glow presence.

### Key Patterns

- **GlowBackground wrap pattern** (established by Meditate/Devotional atmosphere):
  ```tsx
  <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* existing squiggle wrapper + content */}
    </div>
  </GlowBackground>
  ```
  The `max-w-2xl` div stays INSIDE the GlowBackground wrapper. GlowBackground does NOT receive `max-w-2xl` — its orbs need full-viewport width to spread freely while content stays constrained.
- **Gradient heading pattern** (established by Meditate/Devotional atmosphere):
  ```tsx
  <h2
    className="text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
    style={GRADIENT_TEXT_STYLE}
  >
    What&apos;s On Your Heart?
  </h2>
  ```
  No `text-white` class (GRADIENT_TEXT_STYLE sets color via inline style). No inner `<span>`. Full text in gradient as a single flow.
- **BackgroundSquiggle layering:** Squiggle stays inside GlowBackground's auto-applied `relative z-10` children wrapper. Visible through the glow at opacity 0.12 (unchanged).
- **Pray-specific wrapping scope:** `PrayTabContent` has `GuidedPrayerPlayer` as a sibling of the `max-w-2xl` div (fixed-position overlay). GlowBackground wraps ONLY the `max-w-2xl` div, NOT the `GuidedPrayerPlayer`. The return becomes a fragment with two children: `<GlowBackground>...</GlowBackground>` and (conditional) `<GuidedPrayerPlayer />`.
- **Journal-specific wrapping scope:** `JournalTabContent` has SavedEntriesList and FeatureEmptyState as siblings INSIDE the `max-w-2xl` div. Spec FR2: "Wrap the entire Journal tab content (including saved entries list and empty state)." GlowBackground wraps the ENTIRE `max-w-2xl` div (saved entries + empty state stay where they are, inside the wrapper).

### Test Patterns

- Wrapper: `MemoryRouter` + `AuthProvider` + `ToastProvider` + `AuthModalProvider`
- Mocked hooks: `useAuth`, `AudioProvider`, `useScenePlayer`, `useFaithPoints`, (`useReducedMotion` on Pray), (`useUnsavedChanges` on Journal)
- Heading assertions: `screen.getByRole('heading', { name: /what's on your heart\?/i })`
- Gradient style check: `expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })`
- No-Caveat check: `expect(heading.querySelector('.font-script')).toBeNull()`
- GlowBackground presence: `expect(screen.getAllByTestId('glow-orb').length).toBeGreaterThanOrEqual(1)` (center variant = 1 orb)

---

## Auth Gating Checklist

**No auth-gating changes.** This is a visuals-only spec (spec § Auth Gating is purely documentary — all existing auth behavior is preserved exactly as-is).

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View Pray tab (logged out OR in) | Both can view with full atmosphere | N/A — no gate | N/A |
| Generate Prayer (logged out) | Auth modal "Sign in to generate a prayer" | PRESERVED (PrayTabContent.tsx:88-90 untouched) | `useAuth` + `authModal.openAuthModal()` |
| View Journal tab (logged out OR in) | Both can view with full atmosphere | N/A — no gate | N/A |
| Save Entry (logged out) | Auth modal (existing message) | PRESERVED (JournalInput.tsx:129-131 untouched) | `useAuth` + `authModal.openAuthModal()` |
| Reflect on entry (logged out) | Auth modal "Sign in to reflect on your entry" | PRESERVED (JournalTabContent.tsx:190-192 untouched) | `useAuth` + `authModal.openAuthModal()` |

All existing auth gates remain in place. No changes to auth logic, handlers, or callbacks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | variant | `center` | spec FR1, FR2 |
| GlowBackground | glowOpacity | `0.30` (spec: 0.25-0.35 range "standard section level") | spec § Design Notes + `09-design-system.md` § "Glow Backgrounds" |
| GlowBackground | container override | `className="!bg-transparent"` | `MeditateTabContent.tsx:61`, `DevotionalTabContent.tsx:145` (established pattern) |
| GlowBackground | default orb color | `rgba(139, 92, 246, OPACITY)` | `GlowBackground.tsx:14` |
| GlowBackground | center variant size | `w-[300px] h-[300px] md:w-[600px] md:h-[600px]` | `GlowBackground.tsx:15` |
| GlowBackground | center variant position | `top-[30%] left-1/2 -translate-x-1/2` | `GlowBackground.tsx:16` |
| Gradient text | style object | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` | `gradients.tsx:9-15` |
| Gradient text | gradient | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `gradients.tsx:6` |
| h2 — Pray heading | classes | `text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl` | spec acceptance criteria |
| h2 — Pray heading | text | `What\u0026apos;s On Your Heart?` (single flow, no span) | spec FR3 |
| h2 — Journal heading | classes | `text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl` | spec acceptance criteria |
| h2 — Journal heading | text | `What\u0026apos;s On Your Mind?` (single flow, no span) | spec FR4 |
| BackgroundSquiggle | opacity | `0.12` (unchanged) | `PrayTabContent.tsx:170`, `JournalTabContent.tsx:221` |
| BackgroundSquiggle | mask | `SQUIGGLE_MASK_STYLE` (unchanged) | same lines |
| max-w-2xl container | classes | `mx-auto max-w-2xl px-4 py-10 sm:py-14` (unchanged, now INSIDE GlowBackground) | `PrayTabContent.tsx:166`, `JournalTabContent.tsx:216` |

**Note:** `leading-tight` is added to both headings per spec acceptance criteria lines 106 and 108 — current headings do NOT include it. This is a minor but explicit change required by the spec.

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- `WHITE_PURPLE_GRADIENT` is `linear-gradient(223deg, ...)` — NOT 135deg
- `bg-hero-bg` is `#08051A` — NOT `#0D0620` (`bg-hero-dark` is a different, lighter color)
- FrostedCard uses bracket notation: `bg-white/[0.06]`, `border-white/[0.12]` — precision matters
- `GRADIENT_TEXT_STYLE` is a CSSProperties object applied via `style={}`, NOT Tailwind classes
- GlowBackground applies `bg-hero-bg` to its container — use `className="!bg-transparent"` when page already has `bg-hero-bg` (DailyHub.tsx:196 does)
- GlowBackground children are wrapped in `relative z-10` automatically — content sits above orbs by default
- The `BackgroundSquiggle` must remain INSIDE the GlowBackground wrapper (stays in place — squiggle appears above glow at opacity 0.12)
- When replacing Caveat heading: remove `text-white` class (GRADIENT_TEXT_STYLE handles color via inline style), remove inner `<span>`, add `leading-tight` to heading classes
- The `max-w-2xl` wrapper div stays INSIDE the GlowBackground wrapper — do NOT move `max-w-2xl` onto GlowBackground's className (orbs need full-width to spread)
- Pray tab has `GuidedPrayerPlayer` as a SIBLING of the `max-w-2xl` div (fixed-position overlay) — GlowBackground does NOT wrap it; return becomes a fragment with GlowBackground + GuidedPrayerPlayer as siblings
- Journal tab's SavedEntriesList and FeatureEmptyState render INSIDE the `max-w-2xl` div — they stay where they are (inside GlowBackground wrapper)
- Heading text uses `&apos;` HTML entity for the apostrophe (existing pattern, JSX requirement)
- `screen.getByText(/What's On Your/)` in existing PrayTabContent test line 687 will still match — regex matches partial text and will find "What's On Your Heart?" as a single text node

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual upgrade spec. No new data models, no localStorage keys touched.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | — | Visual-only changes; no localStorage modifications. Existing keys (`JOURNAL_MILESTONES_KEY`, `JOURNAL_MODE_KEY`, `JOURNAL_DRAFT_KEY`) continue to work unchanged. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `max-w-2xl` (effectively full width) with `px-4 py-10`. GlowBackground orb scales to `w-[300px] h-[300px]` with `blur-[60px]` (built-in). Heading `text-2xl leading-tight`. BackgroundSquiggle fills width at opacity 0.12. |
| Tablet | 768px | `max-w-2xl` container with `sm:py-14` vertical padding. GlowBackground orb at `md:w-[600px] md:h-[600px]` with `md:blur-[80px]`. Heading `sm:text-3xl leading-tight`. |
| Desktop | 1440px | Same `max-w-2xl` container. Heading `lg:text-4xl leading-tight`. Full glow orb effect at `w-[600px] h-[600px]`. |

All responsive behavior is inherited from existing layout and GlowBackground's built-in mobile handling. No new breakpoint logic.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab bar → Pray/Journal content top | `py-10` mobile / `sm:py-14` tablet+ top padding | `PrayTabContent.tsx:166`, `JournalTabContent.tsx:216` (unchanged) |
| Heading → ambient pill | `mt-2` on pill wrapper | `PrayerInput.tsx:85`, `JournalInput.tsx:153` (unchanged) |
| Heading wrapper → starter chips / mode toggle | `mb-4` on heading wrapper | `PrayerInput.tsx:78`, `JournalInput.tsx:148` (unchanged) |
| PrayerInput → GuidedPrayerSection | `mt-12` on wrapper | `PrayTabContent.tsx:206` (unchanged) |
| JournalInput wrapper → SavedEntriesList / empty state | No explicit gap (SavedEntriesList applies its own spacing) | `JournalTabContent.tsx:243-264` (unchanged) |

No changes to vertical rhythm — all spacing preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is a visual-only upgrade — no functional changes
- [x] No auth gating changes needed (all existing gates preserved)
- [x] `GlowBackground` component exists with `glowOpacity` prop and `center` variant (verified: `GlowBackground.tsx:3-8, 11-18, 73-85`)
- [x] `GRADIENT_TEXT_STYLE` exists in `@/constants/gradients` (verified: `gradients.tsx:9-15`)
- [x] Sibling pattern established: `MeditateTabContent.tsx` and `DevotionalTabContent.tsx` already use identical `<GlowBackground variant="center|split" glowOpacity={0.30} className="!bg-transparent">` wrap pattern
- [x] Design system values verified from codebase inspection (all file:line references confirmed)
- [x] GlowBackground center variant default opacity (0.15) is below spec requirement (0.25-0.35) — addressed via `glowOpacity={0.30}` prop (no component change needed; prop already exists)
- [x] PrayTabContent's `GuidedPrayerPlayer` fixed overlay must remain OUTSIDE GlowBackground wrapper (spec FR1 + acceptance criteria line 102)
- [x] JournalTabContent's SavedEntriesList + FeatureEmptyState must remain INSIDE GlowBackground wrapper (spec FR2 + acceptance criteria line 103)
- [x] Existing `screen.getByText(/What's On Your/)` regex test will still match new single-flow heading text
- [ ] Existing PrayTabContent and JournalTabContent tests pass before starting
- [ ] Existing JournalMilestones tests pass before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GlowBackground wrap scope (Pray) | Wrap only the `max-w-2xl` div containing squiggle + content. Keep `GuidedPrayerPlayer` as sibling outside. | Spec FR1: "excluding the fixed-position `GuidedPrayerPlayer` overlay." Acceptance criterion line 102: "still covers the full viewport when active." `GuidedPrayerPlayer` uses `position: fixed` — it must not be clipped by GlowBackground's `overflow-hidden` container. |
| GlowBackground wrap scope (Journal) | Wrap the entire `max-w-2xl` div, which naturally includes SavedEntriesList and FeatureEmptyState (they're children of it). | Spec FR2: "Wrap the entire Journal tab content (including saved entries list and empty state)." Current structure already has these as children of the outer div — wrapping the div encompasses them automatically. |
| GlowBackground variant | `variant="center"` | Spec § Design Notes: "single-column content benefits from a centered glow orb (matching the Devotional tab treatment)." Both Pray and Journal are single-column `max-w-2xl` layouts. |
| GlowBackground opacity | `glowOpacity={0.30}` (midpoint of 0.25-0.35 range) | Spec § Design Notes: "Orbs at 0.25-0.35 center opacity range (standard section level)." Same value used by sibling Devotional/Meditate atmosphere specs. Center variant default (0.15) is below spec minimum. |
| GlowBackground `bg-hero-bg` redundancy | Pass `className="!bg-transparent"` to avoid double-layering | `DailyHub.tsx:196` already applies `bg-hero-bg` to the page root. Same pattern as `MeditateTabContent.tsx:61` and `DevotionalTabContent.tsx:145`. |
| BackgroundSquiggle layering | Squiggle stays inside GlowBackground's auto-applied `relative z-10` children wrapper — appears above orbs at opacity 0.12 | Spec FR1: "Purple glow orbs should appear BEHIND the existing `BackgroundSquiggle` pattern. The squiggle remains visible through the glow." GlowBackground children are auto-wrapped in `relative z-10`, so squiggle naturally sits above orbs. Same behavior as Meditate tab precedent. |
| Heading structure | Replace Caveat `<h2>` + `<span>` with single `<h2 style={GRADIENT_TEXT_STYLE}>` | Spec FR3/FR4 + acceptance criteria lines 105-108: "single flow in white-to-purple gradient text", "no separate `<span>` for 'Heart?'/'Mind?'". Matches Meditate/Devotional heading treatment. |
| `text-white` removal | Remove `text-white` class from heading (GRADIENT_TEXT_STYLE overrides color inline) | Acceptance criteria lines 106, 108: "`text-white` removed (replaced by gradient)." Keeping `text-white` would be redundant since `color: white` is the fallback, but the spec explicitly requires its removal. |
| `leading-tight` addition | Add `leading-tight` to heading classes | Acceptance criteria lines 106, 108 explicitly list `leading-tight` in the required class set. Current headings omit this class. |
| AmbientSoundPill placement | Keep at line 85-88 (Pray) / line 153-156 (Journal), unchanged | AmbientSoundPill is a sibling of the `<h2>`, both inside the `<div className="mb-4">` wrapper. Spec does not mention it — stays exactly as-is. |
| Test consolidation | Add new heading/glow tests to existing test files (PrayTabContent.test.tsx, JournalTabContent.test.tsx) rather than creating new PrayerInput.test.tsx / JournalInput.test.tsx | PrayerInput and JournalInput are always rendered through their parent tab content components. Integration-level tests in the parent test files verify both the heading change and glow background presence together. No existing test files for the input components, so no pattern to follow there. |
| Regex-matching existing test | `screen.getByText(/What's On Your/)` at PrayTabContent.test.tsx:687 — leave untouched | Regex matches partial text and will find "What's On Your Heart?" as a single text node after the change. No test breakage. |
| JournalInput `<span>` removal in test | No existing test references `Mind?` as a separate text node (verified: grep returned zero matches) | No existing test assertions will break. |

---

## Implementation Steps

### Step 1: Wrap PrayTabContent in GlowBackground + update PrayerInput heading

**Status:** [COMPLETE]

**Objective:** Add purple glow orbs behind Pray tab content and replace the Caveat script heading with gradient text.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — add GlowBackground wrapper around the `max-w-2xl` div (keep `GuidedPrayerPlayer` as sibling outside)
- `frontend/src/components/daily/PrayerInput.tsx` — replace Caveat script heading with gradient text

**Details:**

**1a. Add imports to PrayTabContent.tsx.** At the top of the file (alongside the existing `BackgroundSquiggle` import at line 3), add:

```typescript
import { GlowBackground } from '@/components/homepage/GlowBackground'
```

**1b. Wrap the `max-w-2xl` div in GlowBackground.** The current return structure (lines 165-223) is:

```tsx
return (
  <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
    <div className="relative">
      {/* squiggle */}
      <div className="relative">
        {/* content */}
      </div>
    </div>

    {activeGuidedSession && (
      <GuidedPrayerPlayer ... />
    )}
  </div>
)
```

Change to:

```tsx
return (
  <>
    <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="relative">
          {/* squiggle — unchanged */}
          <div className="relative">
            {/* content — unchanged */}
          </div>
        </div>
      </div>
    </GlowBackground>

    {activeGuidedSession && (
      <GuidedPrayerPlayer ... />
    )}
  </>
)
```

Key: The outer `div` becomes a fragment `<>`. The `GuidedPrayerPlayer` moves OUTSIDE the GlowBackground (as a sibling) to preserve its fixed-position full-viewport overlay behavior. The inner `max-w-2xl` div, squiggle wrapper, and all content stay exactly as-is inside GlowBackground.

**Important:** The current outer `<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">` wrapper currently also contains `GuidedPrayerPlayer` as a child (line 213-221). After the change, this wrapper div is moved INSIDE GlowBackground, and `GuidedPrayerPlayer` moves OUTSIDE to a fragment sibling. The `max-w-2xl` wrapping no longer constrains `GuidedPrayerPlayer`, but this has no visual effect since `GuidedPrayerPlayer` uses `position: fixed`.

**1c. Add imports to PrayerInput.tsx.** At the top of the file (alongside existing imports at lines 1-6), add:

```typescript
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

**1d. Replace the heading in PrayerInput.tsx.** Current heading (lines 79-84):

```tsx
<h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
    Heart?
  </span>
</h2>
```

Replace with:

```tsx
<h2
  className="text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
  style={GRADIENT_TEXT_STYLE}
>
  What&apos;s On Your Heart?
</h2>
```

Changes: removed `text-white` class (GRADIENT_TEXT_STYLE sets color inline); added `leading-tight`; added `style={GRADIENT_TEXT_STYLE}`; removed inner `<span>` and the `{' '}` space separator; single-text-node heading.

The surrounding `<div className="mb-4">` wrapper and the `AmbientSoundPill` sibling remain unchanged.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): GlowBackground orb at 600×600px, opacity 0.30. Heading `lg:text-4xl leading-tight` with gradient.
- Tablet (768px): GlowBackground orb at `md:w-[600px]` with `md:blur-[80px]`. Heading `sm:text-3xl leading-tight`.
- Mobile (375px): GlowBackground orb at 300×300px with `blur-[60px]`. Heading `text-2xl leading-tight`.

**Guardrails (DO NOT):**
- DO NOT remove, reposition, or change the `BackgroundSquiggle` — it stays exactly where it is (opacity 0.12 with SQUIGGLE_MASK_STYLE)
- DO NOT change any handlers (`handleGenerate`, `handleReset`, `handleStartGuidedSession`, `handleGuidedSessionComplete`, `handleGuidedPlayerClose`, `handleGuidedJournal`, `handleGuidedTryAnother`) or their call sites
- DO NOT move, restructure, or wrap the `GuidedPrayerPlayer` inside GlowBackground — it MUST remain a fragment sibling (fixed-position overlay requirement)
- DO NOT add `text-white` to the heading — `GRADIENT_TEXT_STYLE` handles color via inline style
- DO NOT change the `max-w-2xl` container or its classes
- DO NOT change the `AmbientSoundPill` placement or props
- DO NOT change the textarea, starter chips, retry prompt display, error nudge, crisis banner, or Generate Prayer button
- DO NOT change the `<div className="mb-4">` wrapper around the heading
- DO NOT change the `initialText`, `retryPrompt`, `onRetryPromptClear`, `onSubmit`, or `isLoading` props or their usage
- DO NOT apply `max-w-2xl` to GlowBackground's className (orbs need full-width to spread)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders glow background with center variant` | integration | Render `PrayTabContent`, assert `screen.getAllByTestId('glow-orb').length` is >= 1 (center variant = 1 orb) |
| `renders gradient heading text` | integration | Assert heading reads "What's On Your Heart?" via `screen.getByRole('heading', { name: /what's on your heart\?/i })`; assert style includes `backgroundImage: expect.stringContaining('linear-gradient')` |
| `heading has no Caveat script font span` | integration | Assert `heading.querySelector('.font-script')` is null; assert `heading.className` does NOT contain `text-white` |
| `heading is single text node, no inner span` | integration | Assert `heading.querySelector('span')` is null |
| `GuidedPrayerPlayer is NOT wrapped by GlowBackground` | integration | Trigger guided session start; assert `GuidedPrayerPlayer` element is NOT a descendant of any `[data-testid="glow-orb"]` parent (sibling, not child) — verified by checking that the player's nearest GlowBackground ancestor is null OR by asserting player renders at root level of the component |
| Existing auth gate — "logged-out sees auth modal" | integration | PRESERVED (PrayTabContent.test.tsx:595-606 already covers this) |
| Existing regex partial match — "What's On Your" | integration | PRESERVED (PrayTabContent.test.tsx:687 still matches new single-flow text) |

**Expected state after completion:**
- [ ] Purple glow orb visible behind Pray tab content at center position, opacity 0.30
- [ ] BackgroundSquiggle remains visible at opacity 0.12 through the glow layer
- [ ] Heading reads "What's On Your Heart?" in white-to-purple gradient text
- [ ] No `.font-script` class anywhere in the Pray tab heading
- [ ] No `text-white` class on the heading
- [ ] `leading-tight` class present on the heading
- [ ] `GuidedPrayerPlayer` fixed overlay still works and covers full viewport when active
- [ ] All prayer generation, auto-play, KaraokeText, post-prayer reflection, guided sessions continue to function unchanged
- [ ] All existing PrayTabContent tests still pass

---

### Step 2: Wrap JournalTabContent in GlowBackground + update JournalInput heading

**Status:** [COMPLETE]

**Objective:** Add purple glow orbs behind Journal tab content (including saved entries + empty state) and replace the Caveat script heading with gradient text.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — add GlowBackground wrapper around the entire `max-w-2xl` div
- `frontend/src/components/daily/JournalInput.tsx` — replace Caveat script heading with gradient text

**Details:**

**2a. Add imports to JournalTabContent.tsx.** At the top of the file (alongside existing imports at lines 1-22), add:

```typescript
import { GlowBackground } from '@/components/homepage/GlowBackground'
```

**2b. Wrap the `max-w-2xl` div in GlowBackground.** The current return structure (lines 215-266) is:

```tsx
return (
  <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
    {/* Squiggle background wrapper */}
    <div className="relative">
      {/* squiggle */}
      <div className="relative">
        <JournalInput ... />
      </div>
    </div>

    {/* Saved Entries */}
    {savedEntries.length > 0 && (
      <SavedEntriesList ... />
    )}

    {/* Empty state */}
    {savedEntries.length === 0 && isAuthenticated && (
      <FeatureEmptyState ... />
    )}
  </div>
)
```

Change to:

```tsx
return (
  <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Squiggle background wrapper — unchanged */}
      <div className="relative">
        {/* squiggle — unchanged */}
        <div className="relative">
          <JournalInput ... />
        </div>
      </div>

      {/* Saved Entries — unchanged, still inside max-w-2xl div */}
      {savedEntries.length > 0 && (
        <SavedEntriesList ... />
      )}

      {/* Empty state — unchanged, still inside max-w-2xl div */}
      {savedEntries.length === 0 && isAuthenticated && (
        <FeatureEmptyState ... />
      )}
    </div>
  </GlowBackground>
)
```

Key: GlowBackground becomes the new outermost element. The `max-w-2xl` div stays inside, encompassing the squiggle wrapper, SavedEntriesList, and FeatureEmptyState as before. No structural changes inside.

**2c. Add imports to JournalInput.tsx.** At the top of the file (alongside existing imports at lines 1-16), add:

```typescript
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

**2d. Replace the heading in JournalInput.tsx.** Current heading (lines 149-152):

```tsx
<h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
</h2>
```

Replace with:

```tsx
<h2
  className="text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
  style={GRADIENT_TEXT_STYLE}
>
  What&apos;s On Your Mind?
</h2>
```

Same changes as Step 1d: removed `text-white`, added `leading-tight`, added `style={GRADIENT_TEXT_STYLE}`, removed `<span>` and `{' '}` separator, single-text-node heading.

The surrounding `<div className="mb-4">` wrapper and the `AmbientSoundPill` sibling remain unchanged.

**Auth gating:** N/A — no auth changes.

**Responsive behavior:**
- Desktop (1440px): GlowBackground orb at 600×600px, opacity 0.30. Heading `lg:text-4xl leading-tight` with gradient.
- Tablet (768px): GlowBackground orb at `md:w-[600px]` with `md:blur-[80px]`. Heading `sm:text-3xl leading-tight`.
- Mobile (375px): GlowBackground orb at 300×300px with `blur-[60px]`. Heading `text-2xl leading-tight`. Mode toggle (Guided/Free Write) fits within viewport (existing behavior).

**Guardrails (DO NOT):**
- DO NOT remove, reposition, or change the `BackgroundSquiggle` — it stays exactly where it is (opacity 0.12 with SQUIGGLE_MASK_STYLE)
- DO NOT restructure SavedEntriesList or FeatureEmptyState placement — they remain siblings of the squiggle wrapper, inside the `max-w-2xl` div
- DO NOT change any handlers (`handleModeChange`, `handleTryDifferentPrompt`, `handleEntrySave`, `handleReflect`, `handleWriteAnother`) or callbacks
- DO NOT change `prayContext`, `onSwitchTab`, `urlPrompt` props or their usage
- DO NOT change the mode toggle, context banner, guided prompt card, free-write note, textarea, character counter, voice input mic button, draft-saved indicator, crisis banner, Save Entry button, or UnsavedChangesModal
- DO NOT add `text-white` to the heading — `GRADIENT_TEXT_STYLE` handles color via inline style
- DO NOT change the `max-w-2xl` container or its classes
- DO NOT change the `AmbientSoundPill` placement or props
- DO NOT change the `<div className="mb-4">` wrapper around the heading
- DO NOT change any localStorage reads/writes (`JOURNAL_MODE_KEY`, `JOURNAL_DRAFT_KEY`, `JOURNAL_MILESTONES_KEY`)
- DO NOT apply `max-w-2xl` to GlowBackground's className (orbs need full-width to spread)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders glow background with center variant` | integration | Render `JournalTabContent`, assert `screen.getAllByTestId('glow-orb').length` is >= 1 |
| `renders gradient heading text` | integration | Assert heading reads "What's On Your Mind?" via `screen.getByRole('heading', { name: /what's on your mind\?/i })`; assert style includes `backgroundImage: expect.stringContaining('linear-gradient')` |
| `heading has no Caveat script font span` | integration | Assert `heading.querySelector('.font-script')` is null; assert `heading.className` does NOT contain `text-white` |
| `heading is single text node, no inner span` | integration | Assert `heading.querySelector('span')` is null |
| `saved entries list renders inside GlowBackground wrapper` | integration | Save an entry, then assert SavedEntriesList heading/content is a descendant of the glow-orb's parent (same wrapper) |
| `empty state renders inside GlowBackground wrapper` | integration | With zero saved entries + authenticated, assert "Your journal is waiting" text is a descendant of the glow-orb's parent |
| Existing auth gate — Save Entry opens auth modal when logged-out | integration | PRESERVED (JournalInput.tsx:129-131 untouched) |
| Existing auth gate — Reflect opens auth modal when logged-out | integration | PRESERVED (JournalTabContent.tsx:190-192 untouched) |
| Existing empty state tests | integration | PRESERVED (JournalTabContent.test.tsx:347-395 all pass unchanged) |
| Existing voice input tests | integration | PRESERVED (JournalTabContent.test.tsx:141-343 all pass unchanged) |
| Existing milestone tests | integration | PRESERVED (JournalMilestones.test.tsx passes unchanged) |

**Expected state after completion:**
- [ ] Purple glow orb visible behind Journal tab content at center position, opacity 0.30
- [ ] Glow extends to cover SavedEntriesList and FeatureEmptyState as a unified visual context
- [ ] BackgroundSquiggle remains visible at opacity 0.12 through the glow layer
- [ ] Heading reads "What's On Your Mind?" in white-to-purple gradient text
- [ ] No `.font-script` class anywhere in the Journal tab heading
- [ ] No `text-white` class on the heading
- [ ] `leading-tight` class present on the heading
- [ ] Mode toggle (Guided/Free Write), prompt card, textarea, voice input, save, reflection, crisis banner, milestone celebrations all function unchanged
- [ ] Draft auto-save continues to work (localStorage)
- [ ] All existing JournalTabContent and JournalMilestones tests still pass

---

### Step 3: Add atmospheric visual tests to existing test files

**Status:** [COMPLETE]

**Objective:** Verify the new glow background + gradient heading visual changes are present. Confirm no regressions in existing tests.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — add 5 new tests in a new `describe('PrayTabContent atmospheric visuals')` block
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — add 6 new tests in a new `describe('JournalTabContent atmospheric visuals')` block

**Details:**

**3a. Add PrayTabContent visual tests.** Append a new `describe` block at the end of `PrayTabContent.test.tsx`:

```typescript
describe('PrayTabContent atmospheric visuals', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    resetAudioState()
    mockReducedMotion = false
  })

  it('renders glow background with center variant (1 orb)', () => {
    renderPrayTab()
    expect(screen.getAllByTestId('glow-orb').length).toBeGreaterThanOrEqual(1)
  })

  it('renders gradient heading text "What\'s On Your Heart?"', () => {
    renderPrayTab()
    const heading = screen.getByRole('heading', { name: /what's on your heart\?/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })
  })

  it('heading has no Caveat script font span', () => {
    renderPrayTab()
    const heading = screen.getByRole('heading', { name: /what's on your heart\?/i })
    expect(heading.querySelector('.font-script')).toBeNull()
  })

  it('heading is a single text node (no inner span)', () => {
    renderPrayTab()
    const heading = screen.getByRole('heading', { name: /what's on your heart\?/i })
    expect(heading.querySelector('span')).toBeNull()
  })

  it('heading has leading-tight class and no text-white class', () => {
    renderPrayTab()
    const heading = screen.getByRole('heading', { name: /what's on your heart\?/i })
    expect(heading.className).toContain('leading-tight')
    expect(heading.className).not.toContain('text-white')
  })
})
```

**3b. Add JournalTabContent visual tests.** Append a new `describe` block at the end of `JournalTabContent.test.tsx`:

```typescript
describe('JournalTabContent atmospheric visuals', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    mockRecordActivity.mockClear()
  })

  it('renders glow background with center variant (1 orb)', () => {
    renderJournalTab()
    expect(screen.getAllByTestId('glow-orb').length).toBeGreaterThanOrEqual(1)
  })

  it('renders gradient heading text "What\'s On Your Mind?"', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })
  })

  it('heading has no Caveat script font span', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.querySelector('.font-script')).toBeNull()
  })

  it('heading is a single text node (no inner span)', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.querySelector('span')).toBeNull()
  })

  it('heading has leading-tight class and no text-white class', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.className).toContain('leading-tight')
    expect(heading.className).not.toContain('text-white')
  })

  it('empty state renders inside GlowBackground wrapper', () => {
    renderJournalTab()
    const emptyStateText = screen.getByText('Your journal is waiting')
    const glowOrb = screen.getAllByTestId('glow-orb')[0]
    // Walk up from empty state to find the GlowBackground container.
    // Since glow orb and empty state share the GlowBackground root as ancestor,
    // the glow orb's ancestor chain must contain the same root as the empty state's chain.
    const glowRoot = glowOrb.parentElement!
    expect(glowRoot.contains(emptyStateText)).toBe(true)
  })
})
```

**Auth gating:** N/A

**Responsive behavior:** N/A — test file only.

**Guardrails (DO NOT):**
- DO NOT remove, skip, or modify any existing passing tests
- DO NOT change the existing test render wrappers (`MemoryRouter` + `AuthProvider` + `ToastProvider` + `AuthModalProvider`)
- DO NOT add new mocks — use the existing mock setup already in each file
- DO NOT mock `GlowBackground`, `GRADIENT_TEXT_STYLE`, `PrayerInput`, or `JournalInput` — let them render naturally to verify integration
- DO NOT change the existing regex partial match at PrayTabContent.test.tsx:687 (`screen.getByText(/What's On Your/)`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayTabContent — glow orb presence | integration | 1 orb (center variant) |
| PrayTabContent — gradient heading text | integration | role=heading, gradient style, "What's On Your Heart?" |
| PrayTabContent — no font-script | integration | querySelector('.font-script') is null |
| PrayTabContent — no inner span | integration | querySelector('span') is null |
| PrayTabContent — leading-tight + no text-white | integration | className assertions |
| JournalTabContent — glow orb presence | integration | 1 orb (center variant) |
| JournalTabContent — gradient heading text | integration | role=heading, gradient style, "What's On Your Mind?" |
| JournalTabContent — no font-script | integration | querySelector('.font-script') is null |
| JournalTabContent — no inner span | integration | querySelector('span') is null |
| JournalTabContent — leading-tight + no text-white | integration | className assertions |
| JournalTabContent — empty state inside GlowBackground | integration | glow orb parent contains the empty state text |

**Expected state after completion:**
- [ ] 5 new tests pass in PrayTabContent.test.tsx
- [ ] 6 new tests pass in JournalTabContent.test.tsx
- [ ] All existing PrayTabContent tests (all 44+ existing) still pass
- [ ] All existing JournalTabContent tests (all 22+ existing) still pass
- [ ] All existing JournalMilestones tests still pass
- [ ] `pnpm test` green

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | PrayTabContent GlowBackground wrap + PrayerInput gradient heading |
| 2 | — | JournalTabContent GlowBackground wrap + JournalInput gradient heading |
| 3 | 1, 2 | Add visual atmosphere tests (verifies Step 1 + Step 2 changes) |

Steps 1 and 2 are independent (different files). Step 3 verifies both and must run after.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | PrayTabContent GlowBackground wrap + PrayerInput gradient heading | [COMPLETE] | 2026-04-04 | Modified `PrayTabContent.tsx` (wrapped max-w-2xl div in `<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">`, converted outer to fragment with GuidedPrayerPlayer as sibling) and `PrayerInput.tsx` (replaced Caveat heading with single-flow gradient text using `GRADIENT_TEXT_STYLE`, added `leading-tight`, removed `text-white` and inner span). All 39 existing tests pass. Visual verification all YES. |
| 2 | JournalTabContent GlowBackground wrap + JournalInput gradient heading | [COMPLETE] | 2026-04-04 | Modified `JournalTabContent.tsx` (wrapped entire max-w-2xl div in `<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">`, SavedEntriesList + FeatureEmptyState remain inside) and `JournalInput.tsx` (replaced Caveat heading with single-flow gradient text using `GRADIENT_TEXT_STYLE`, added `leading-tight`, removed `text-white` and inner span). All 21 JournalTabContent + 9 JournalMilestones tests pass. Visual verification all YES. |
| 3 | Atmospheric visual tests | [COMPLETE] | 2026-04-04 | Added 5 tests to `PrayTabContent.test.tsx` and 6 tests to `JournalTabContent.test.tsx` (both in new `atmospheric visuals` describe blocks). Deviation: Fixed regression in `src/pages/__tests__/Pray.test.tsx:103` (test expected old `<span>Heart?</span>` — updated to use `getByRole('heading', { name: /what's on your heart\?/i })`). This file was not identified in the plan but required the same update per spec FR3. Full suite: 5542 pass / 4 fail (all 4 failures pre-existing in FinalCTA.test.tsx, confirmed via git stash). Build passes with 0 errors. |
