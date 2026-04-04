# Feature: Pray & Journal Atmosphere

**Master Plan Reference:** N/A — standalone visual spec (part of Round 3 atmospheric consistency pass, sibling to `devotional-atmosphere.md` and `meditate-atmosphere.md`)

---

## Overview

The Pray and Journal tabs are where users bring their inner life to God — the most vulnerable, intimate moments inside the Daily Hub. Today these two tabs already layer a `BackgroundSquiggle` decoration behind their content, but they lack the purple glow orbs and unified gradient heading treatment that now define the homepage, the Meditate tab, and the Devotional tab. This spec brings the Pray and Journal tabs into visual alignment with the rest of Round 3's atmospheric pass: layering `GlowBackground` behind the existing squiggle and replacing the Caveat script accent headings with unified white-to-purple gradient text.

## User Story

As a **logged-in user or logged-out visitor**, I want the Pray and Journal tabs to feel visually continuous with the homepage, the Devotional tab, and the Meditate tab so that switching between these practices feels like moving through different rooms of the same sanctuary rather than hopping between different apps.

## Requirements

### Functional Requirements

1. **Pray tab — GlowBackground layer**: Wrap the Pray tab's main content (excluding the fixed-position `GuidedPrayerPlayer` overlay) in `GlowBackground` with `variant="center"`. Purple glow orbs should appear BEHIND the existing `BackgroundSquiggle` pattern. The squiggle remains visible through the glow.
2. **Journal tab — GlowBackground layer**: Wrap the entire Journal tab content (including saved entries list and empty state) in `GlowBackground` with `variant="center"`. Purple glow orbs should appear behind the existing `BackgroundSquiggle` and extend to cover the saved entries section as a single unified visual context.
3. **Pray heading — gradient text**: In `PrayerInput.tsx`, replace the "What's On Your **Heart?**" heading's Caveat script accent (`font-script text-primary`) with `GRADIENT_TEXT_STYLE` (white-to-purple gradient) applied to the full heading as a single flow. No separate `<span>`.
4. **Journal heading — gradient text**: In `JournalInput.tsx`, replace the "What's On Your **Mind?**" heading's Caveat script accent with `GRADIENT_TEXT_STYLE` applied to the full heading as a single flow. No separate `<span>`.

### Non-Functional Requirements

- **Performance**: No new network requests. `GlowBackground` uses CSS gradients only.
- **Accessibility**: Zero changes to ARIA attributes, roles, labels, focus-visible styles, or keyboard navigation. All existing accessibility behavior preserved exactly.
- **No functional changes**: Auth checks, prayer generation, journal saving, voice input, draft persistence, crisis banner, context banners, mode toggle, milestone celebrations, guided prayer player, saved entries list, empty state, and all callbacks remain untouched.

## Auth Gating

No auth gating changes — this is a visuals-only spec. Existing auth behavior is preserved exactly:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Pray tab | Can view with full atmosphere | Can view with full atmosphere | N/A |
| Type into Pray textarea | Can type (no save) | Can type | N/A |
| Click "Generate Prayer" | Auth modal appears | Prayer generates | "Sign in to generate a prayer" |
| Click guided prayer card | Works (existing behavior) | Works (existing behavior) | N/A (handled in GuidedPrayerSection) |
| View Journal tab | Can view with full atmosphere | Can view with full atmosphere | N/A |
| Type into Journal textarea | Can type (draft auto-save to localStorage) | Can type (draft auto-save) | N/A |
| Click "Save Entry" | Auth modal appears (existing behavior) | Entry saves | Existing message (unchanged) |
| Click "Reflect on my entry" | Auth modal appears | AI reflection appears | "Sign in to reflect on your entry" |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `max-w-2xl` + `px-4 py-10`. GlowBackground orbs scale down (~40% smaller, ~25% less blur per design system spec). Heading `text-2xl`. BackgroundSquiggle fills width. |
| Tablet (640-1024px) | Same `max-w-2xl` container. `sm:py-14` vertical padding. Heading `text-3xl`. GlowBackground at standard size. |
| Desktop (> 1024px) | Same `max-w-2xl` container. Heading `lg:text-4xl`. Full glow orb effect. |

All responsive behavior is inherited from existing layout and the `GlowBackground` component's built-in mobile handling. No new breakpoint logic. Note that `GlowBackground` replaces the outermost `max-w-2xl` wrapper div on both tabs (and accepts the same `className` to preserve container width, padding, and centering).

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input that wasn't already present. The existing `CrisisBanner` and crisis keyword detection on both Pray and Journal textareas remain untouched. No crisis detection behavior changes in this spec.

## Auth & Persistence

- **Logged-out users:** Can view both tabs with full atmospheric enhancements; existing zero-persistence rules preserved (Journal draft may still auto-save to localStorage, unchanged behavior).
- **Logged-in users:** No new persistence. Existing prayer generation completion (`markPrayComplete`, `markGuidedPrayerComplete`), journal entry saving (session state), and activity tracking (`recordActivity`) are unchanged.
- **localStorage usage:** No changes to any localStorage keys. Existing keys (`JOURNAL_MILESTONES_KEY`, `JOURNAL_MODE_KEY`, `JOURNAL_DRAFT_KEY`) continue to work exactly as before.

## Completion & Navigation

N/A — No changes to completion tracking or navigation. Existing Daily Hub completion signals (`markPrayComplete`, `markJournalComplete`, `markGuidedPrayerComplete`) and cross-tab CTAs (`onSwitchToJournal`, `onSwitchTab`) are preserved exactly.

## Design Notes

- **GlowBackground** (`src/components/homepage/GlowBackground.tsx`): Use `variant="center"` on both tabs — single-column content benefits from a centered glow orb (matching the Devotional tab treatment from `devotional-atmosphere.md`). Orbs at 0.25-0.35 center opacity range (standard section level).
- **GRADIENT_TEXT_STYLE** (`src/constants/gradients.tsx`): Same white-to-purple gradient via `background-clip: text` used across the homepage, Devotional tab, and Meditate tab headings.
- **BackgroundSquiggle** (`src/components/BackgroundSquiggle.tsx`): Stays in place on both tabs. `GlowBackground` wraps outside the squiggle wrapper. Squiggle should remain faintly visible (opacity 0.12) through the glow layer — same layering pattern as Meditate tab.
- **Pray tab structure**: `GlowBackground` wraps only the main content (`PrayerResponse`, `PrayerInput`, `GuidedPrayerSection`) — NOT the fixed-position `GuidedPrayerPlayer` overlay, which remains a sibling of `GlowBackground` because it uses `position: fixed` to cover the full viewport.
- **Journal tab structure**: `GlowBackground` wraps the ENTIRE return — including the squiggle wrapper, saved entries list, and empty state — since they're all part of the same visual context.
- **Heading pattern consistency**: After this spec, all three interactive Daily Hub tabs share the same heading treatment:
  - Pray: "What's On Your Heart?"
  - Journal: "What's On Your Mind?"
  - Meditate: "What's On Your Spirit?" (already migrated in `meditate-atmosphere.md`)
  - All three use `GRADIENT_TEXT_STYLE`, same sizing (`text-2xl sm:text-3xl lg:text-4xl`), `leading-tight`, no Caveat script, no separate `<span>`.
- **Design system recon reference**: Match FrostedCard shadow values and gradient text treatment from `_plans/recon/design-system.md` and the `devotional-atmosphere.md` / `meditate-atmosphere.md` sibling specs.

### New Visual Patterns

None — all patterns used (GlowBackground variant="center" behind BackgroundSquiggle, gradient text headings) are established patterns already applied to the Devotional and Meditate tabs. This spec completes the atmospheric consistency pass across all four Daily Hub tabs.

## Out of Scope

- Any functional changes (logic, auth checks, prayer generation, journal saving, voice input, draft persistence, milestone celebrations, guided prayer player)
- Any accessibility changes (ARIA, roles, labels, focus rings, crisis banner behavior)
- `PrayerResponse.tsx`, `GuidedPrayerSection.tsx`, `GuidedPrayerPlayer.tsx`, `SavedEntriesList.tsx`, `FeatureEmptyState.tsx` — these are separate files not edited in this spec
- The cyan glow-pulse border on textareas (unchanged, existing behavior)
- The starter chips, crisis banner, context banners, mode toggle, prompt card — all unchanged
- Daily Hub hero section, tab bar, SongPickSection, SiteFooter — separate concerns
- Devotional tab and Meditate tab — already migrated in sibling specs
- Light mode support (Phase 4)

## Acceptance Criteria

- [ ] **Pray tab**: `GlowBackground` with `variant="center"` wraps the main Pray tab content, producing visible purple glow orbs (0.25-0.35 opacity range) behind the content
- [ ] **Pray tab**: `BackgroundSquiggle` remains visible underneath the glow layer at opacity 0.12 (not removed or obscured)
- [ ] **Pray tab**: `GuidedPrayerPlayer` fixed overlay is OUTSIDE the `GlowBackground` wrapper and still covers the full viewport when active
- [ ] **Journal tab**: `GlowBackground` with `variant="center"` wraps the entire Journal tab return (squiggle wrapper + saved entries list + empty state), producing visible purple glow orbs behind all content
- [ ] **Journal tab**: `BackgroundSquiggle` remains visible underneath the glow layer at opacity 0.12
- [ ] **PrayerInput heading**: Reads "What's On Your Heart?" as a single flow in white-to-purple gradient text (`GRADIENT_TEXT_STYLE`), no Caveat script font, no separate `<span>` for "Heart?"
- [ ] **PrayerInput heading**: Classes include `text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl` — `text-white` removed (replaced by gradient)
- [ ] **JournalInput heading**: Reads "What's On Your Mind?" as a single flow in white-to-purple gradient text (`GRADIENT_TEXT_STYLE`), no Caveat script font, no separate `<span>` for "Mind?"
- [ ] **JournalInput heading**: Classes include `text-center font-sans text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl` — `text-white` removed (replaced by gradient)
- [ ] Prayer starter chips ("I'm feeling anxious", etc.) render correctly against the new atmospheric background
- [ ] Prayer textarea retains existing cyan glow-pulse border styling on the new background
- [ ] Submitting a prayer still renders `PrayerResponse` with audio controls, and the reset button returns to input state — all on the new atmospheric background
- [ ] Journal Guided mode renders the prompt card, "Try a different prompt" button, and mode toggle correctly on the new background
- [ ] Clicking "Free Write" toggle still switches mode, changes textarea placeholder, and hides the guided prompt card
- [ ] Saving a journal entry still appends to the saved entries list below, styled correctly on the new background
- [ ] On mobile (375px), glow orbs scale down, headings remain readable at `text-2xl`, textareas fill width, no horizontal overflow
- [ ] On mobile (375px), Journal mode toggle (Guided/Free Write) fits within viewport
- [ ] Gradient heading matches the homepage, Devotional tab, and Meditate tab gradient text headings (same gradient angle, colors, and size tokens)
- [ ] All existing ARIA attributes, roles, labels, and focus-visible styles are preserved exactly
- [ ] Crisis banner, context banners, milestone celebration toasts, and guided prayer player all continue to function unchanged
- [ ] No new lint errors or TypeScript errors introduced
- [ ] Existing Pray tab and Journal tab tests continue to pass
