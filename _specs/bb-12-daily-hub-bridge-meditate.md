# BB-12: Daily Hub Bridge — Meditate

**Branch:** `bible-redesign`
**Depends on:** BB-10 (shared URL schema, `verseContext.ts`, `buildDailyHubVerseUrl.ts`, `useVerseContextPreload.ts`, `VersePromptCard`, `closeSheet` on ActionContext, `VERSE_FRAMINGS` in constants), BB-11 (confirmed the shared card pattern generalizes across tabs)
**Hands off to:** BB-13 (Share), which completes the primary + bridge action row

---

## Overview

When a user reads a verse that invites stillness — "Be still, and know that I am God" — they should be able to move from reading into meditation without losing the verse. BB-12 makes the "Meditate on this" action in the verse action sheet a real bridge: tapping it closes the sheet, navigates to the Daily Hub Meditate tab, and surfaces the selected verse as the session's anchor. Unlike Pray (outward — speaking to God) and Journal (inward — thinking on paper), Meditate asks the user to simply *be* with the verse, returning to it whenever the mind wanders.

This is the third and final Daily Hub bridge. BB-10 built all the shared infrastructure; BB-11 confirmed it generalizes. BB-12 wires the last handler, integrates the verse into the Meditate tab's existing card-based UX, and completes the read-to-heal loop that makes Worship Room's Bible reader unique.

## User Stories

As a **logged-in user** reading Psalm 46:10 in the Bible reader, I want to tap "Meditate on this" and land on the Meditate tab with that verse displayed as my meditation focus so that I can sit with the words without losing what I was reading.

As a **logged-out visitor** reading the Bible, I want the "Meditate on this" action to navigate me to the Meditate tab with the verse context visible so that I can see the verse (auth gating applies when I tap a meditation card, not at navigation).

## Requirements

### Functional Requirements

1. Tapping "Meditate on this" in the verse action sheet closes the sheet and navigates to `/daily?tab=meditate&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
2. The Meditate tab renders the verse prominently as the session focus — verse reference, full verse text, and the meditation framing line: **"Return to these words whenever your mind wanders."**
3. The framing line comes from the shared `VERSE_FRAMINGS` lookup (already established in `daily-experience.ts` constants by BB-10/BB-11) — all three bridges share a single source of truth
4. There is **no composer or text input** associated with the verse on the Meditate tab — the verse is a subject for stillness, not a prompt for writing
5. URL query params are cleared via `router.replace` after the preload hook consumes them, leaving `/daily?tab=meditate`
6. Multi-verse selections render all verses in the verse focus surface with correct verse numbering
7. A small Remove (X) button clears the verse from the session — the user can then meditate freely or pick one of the existing meditation cards
8. The `meditate` registry handler replaces the BB-6 stub with a real handler using `buildDailyHubVerseUrl('meditate', selection)`, `ctx.closeSheet()`, and `router.push(url)`
9. Invalid verse params cause silent graceful degradation — the Meditate tab loads normally with no verse subject
10. Refreshing the page after params have been cleared does not re-trigger the preload
11. Switching tabs away from Meditate clears the verse context from component state so that returning starts fresh
12. The existing 6 meditation cards (Breathing, Soaking, Gratitude, ACTS, Psalms, Examen) continue to work unchanged whether or not a verse context is present
13. The existing Spec Z verse-aware meditation flow (devotional "Meditate on this passage" CTA using `verseRef`/`verseText`/`verseTheme` params) continues to work — BB-12 uses different query param names (`verseBook`, `verseChapter`, `verseStart`, `verseEnd`, `src`) so the two flows do not collide

### Meditation History Integration

14. The existing meditation history store (`wr_meditation_history` via `meditation-storage.ts`) gains an optional `verseContext` field on the `MeditationSession` type: `{ book, chapter, startVerse, endVerse, reference }`
15. When a meditation session completes while a verse context is present, the `verseContext` is included in the session record
16. Sessions without a verse context continue to save and render correctly — the field is purely additive
17. This enables future features (BB-14 "My Bible" surfacing "meditations on this verse," BB-46 echoes) without requiring another migration

### Non-Functional Requirements

- **Reuse:** Zero new URL parsing, verse context loading, or prompt card logic — everything comes from BB-10's shared modules
- **Accessibility:** WCAG AA compliance; Remove X button has `aria-label="Remove verse focus"` and minimum 44px tap target; reduced motion respected on any verse fade-in
- **Performance:** No additional network requests beyond the existing verse hydration from chapter JSON

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap "Meditate on this" in action sheet | Navigates to `/daily?tab=meditate&...` with verse context (no gate on navigation) | Same — navigates with verse context | N/A |
| View verse focus on Meditate tab | Verse renders with reference, text, and framing line | Same | N/A |
| Remove verse focus (X button) | Works — removes verse from state | Same | N/A |
| Tap a meditation card | Auth modal: "Sign in to start a meditation" (existing behavior) | Navigates to meditation sub-page | "Sign in to start a meditation" |

The bridge navigation is not auth-gated. The existing Meditate tab auth gating on card clicks applies unchanged.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse focus renders full-width within the `px-4` container; verse text wraps naturally; X button is 44px tap target; 6 meditation cards remain in 2-column grid below |
| Tablet (640-1024px) | Same single-column layout with slightly more horizontal padding from `max-w-2xl` container |
| Desktop (> 1024px) | Verse focus within the `max-w-2xl` Meditate tab container; comfortable reading width for verse text |

The verse focus renders above the existing meditation card grid at all breakpoints. No horizontal layout changes between breakpoints — the verse is always full-width within the tab container.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The verse text comes from WEB Bible data (already in the app). The Meditate tab has no text composer. No crisis detection required.

## Auth & Persistence

- **Logged-out (demo mode):** Can navigate to Meditate tab with verse context and see the verse focus. Cannot start a meditation session (existing auth gate on card clicks). Zero persistence.
- **Logged-in:** Full flow — navigate, view verse focus, start a meditation with the verse as context. Session records in `wr_meditation_history` gain an optional `verseContext` field.
- **Route type:** Public (the `/daily` route is public; auth gates are at the action level)
- **localStorage keys used:** `wr_meditation_history` (existing — optional `verseContext` field added to session record type). No new keys introduced.

## Completion & Navigation

- **Completion tracking:** Uses existing meditation completion tracking (`markMeditateComplete()` or equivalent). BB-12 does not change when or how completion fires — only adds the optional `verseContext` to the session record.
- **Post-session:** Existing meditation completion UI applies unchanged.
- **Context coexistence with Spec Z:** The existing Spec Z flow uses `verseRef`/`verseText`/`verseTheme` query params and renders a verse banner + card highlighting. BB-12 uses `verseBook`/`verseChapter`/`verseStart`/`verseEnd`/`src` params and renders a verse focus surface. The two param sets are disjoint, so the flows do not collide. The plan phase should verify that both `pendingVerse` (Spec Z) and `verseContext` (BB-12) state can coexist without visual conflict — if both are present simultaneously, verse context (BB-12) should take precedence since it represents a more recent, explicit navigation from the Bible reader.

## Design Notes

- The verse focus surface should use the shared `VersePromptCard` component from BB-10 if it fits the Meditate tab's aesthetic. The card is already parameterized with a `tab` prop for framing line lookup. If the Meditate tab needs a different visual treatment (no input below, stillness-oriented), the plan phase evaluates whether `VersePromptCard` can be reused with a `tab="meditate"` prop or whether a lightweight wrapper is needed.
- The verse focus surface uses the existing FrostedCard tier system — likely Tier 2 (scripture callout with left border accent at `border-l-primary/60`) to match how scripture is presented elsewhere on the Daily Hub
- Verse reference text uses `font-serif` consistent with scripture rendering
- The framing line ("Return to these words whenever your mind wanders.") uses muted styling (`text-white/60 text-sm`) — it's a gentle instruction, not a headline
- The Remove X button matches the pattern from the other bridges — `min-w-[44px] min-h-[44px]` touch target, `text-white/50 hover:text-white/80` transition
- Card fade-in respects `prefers-reduced-motion`
- Zero raw hex values — all colors reference design tokens or Tailwind classes
- The verse focus sits above the existing 6-card meditation grid, within the `mx-auto max-w-2xl px-4 py-10 sm:py-14` wrapper
- Design system recon at `_plans/recon/design-system.md` is available for exact CSS value reference during planning

## Out of Scope

- **No new meditation features** — timer, ambient audio, guided content, scripture readings all stay exactly as they are today
- **No Bible-specific meditation sessions** — BB-12 surfaces a verse as the session focus; it doesn't create "guided meditation on John 3:16" content
- **No new session types** — the Meditate tab offers the same 6 meditation types tomorrow as it does today
- **No AI-generated meditation guidance** — same values stance as BB-10 and BB-11: the user sits with the verse in silence, the product holds the space
- **No session recording or "mood after meditation" tracking** — out of scope; would be its own spec
- **No changes to Pray or Journal bridges** — BB-10 and BB-11 remain unchanged
- **No changes to Spec Z flow** — the existing devotional "Meditate on this passage" flow with `verseRef`/`verseText`/`verseTheme` params continues unchanged
- **No BB-38 integration, no analytics, no haptics**
- **No changes to the Meditate tab's existing card grid, auth gating, or completion tracking logic** — BB-12 only adds a verse context surface above the cards and an optional field to the session record

## Acceptance Criteria

- [ ] Tapping "Meditate on this" in the action sheet closes the sheet and navigates to `/daily?tab=meditate&verseBook=...&verseChapter=...&verseStart=...&verseEnd=...&src=bible`
- [ ] Daily Hub loads with the Meditate tab active
- [ ] The verse appears prominently on the Meditate tab as the session focus, with reference, full verse text, and the meditation framing line "Return to these words whenever your mind wanders."
- [ ] There is no composer or text input associated with the verse — the verse is a subject for stillness, not a prompt for writing
- [ ] The query params are cleared via `router.replace` after preload, leaving `/daily?tab=meditate`
- [ ] Multi-verse selections (e.g. Psalm 23:1-6) render all verses in the verse focus surface with correct verse numbering
- [ ] A small X "Remove" affordance clears the verse from the session
- [ ] The Remove X button has `aria-label="Remove verse focus"` and minimum 44px tap target
- [ ] Arriving at `/daily?tab=meditate` without verse params loads the Meditate tab normally with no verse subject
- [ ] Invalid verse params cause silent graceful degradation — no error toast, normal Meditate tab loads
- [ ] Refreshing the page after params have been cleared does not re-trigger the preload
- [ ] Switching tabs away from Meditate clears the verse context from state
- [ ] Browser back button from Meditate returns to the Bible reader correctly
- [ ] The `VERSE_FRAMINGS` lookup contains all three bridges (pray, journal, meditate) and is the single source of truth
- [ ] The shared `VersePromptCard` is reused where it fits — a Meditate-specific component is only created if parameterization doesn't cover the need
- [ ] `buildDailyHubVerseUrl('meditate', selection)` produces a correctly-encoded URL
- [ ] The registry handler correctly invokes `ctx.closeSheet()` before navigation
- [ ] Existing Meditate tab behavior (6 meditation cards, auth gating on card clicks, Spec Z verse banner flow) works unchanged whether or not a BB-12 verse context is present
- [ ] The `MeditationSession` type in `meditation-storage.ts` gains an optional `verseContext` field; existing sessions without it render correctly
- [ ] When a meditation session completes with a verse context present, the saved session record includes the `verseContext`
- [ ] The verse focus surface uses design tokens — zero raw hex values
- [ ] Long verses wrap naturally without truncation
- [ ] Reduced motion respected on any verse fade-in
- [ ] Zero new URL parsing or verse context loading logic — everything comes from BB-10's modules
- [ ] The three Daily Hub bridges (Pray, Journal, Meditate) all use `buildDailyHubVerseUrl`, `useVerseContextPreload`, and `VERSE_FRAMINGS` consistently
- [ ] Logged-out users can navigate to the Meditate tab with verse context and see the verse focus (auth gate only on meditation card clicks)
- [ ] The BB-12 verse context (`verseBook`/`verseChapter`/`verseStart`/`verseEnd`/`src` params) and Spec Z verse context (`verseRef`/`verseText`/`verseTheme` params) do not interfere with each other
