# BB-5: Reader Focus Mode

**Master Plan Reference:** N/A — standalone spec within the Bible Redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (reader view core — provides ReaderChrome, ReaderChapterNav, TypographySheet, useChromeDim placeholder, reader theme system)
**Hands off to:** BB-6 (verse action sheet must coexist with focus mode via pause/resume primitive)

---

## Overview

The Bible reader should feel like a quiet room with the Word — not a webpage with Bible text on it. After a few seconds of stillness, the top chrome and bottom nav fade away, subtle vignette gradients appear, and the user is left with just scripture on the page. Any interaction — scroll, tap, mouse move, key press — restores the chrome instantly. BB-5 replaces BB-4's basic 4-second top-chrome auto-dim placeholder with a real focus mode: full chrome dismissal (top + bottom), atmospheric vignette framing, configurable timing, a manual toggle, and proper interaction handling with jitter filtering.

## User Story

As a **logged-out visitor or logged-in user**, I want the reader chrome to automatically disappear when I'm still so that I can read scripture in a distraction-free, peaceful environment that feels like a sanctuary rather than a webpage.

## Requirements

### Functional Requirements

#### Focus Mode State Machine

1. Focus mode has three states: **idle** (disabled or paused), **active** (chrome visible, idle timer running), **focused** (chrome hidden, vignette visible)
2. Transitions:
   - `idle` → `active` when focus mode is enabled in settings AND not paused
   - `active` → `focused` after the configured delay (default 6 seconds) of no user interaction
   - `focused` → `active` on any qualifying interaction (restore triggers)
   - `active` or `focused` → `idle` when paused (drawer open, action sheet open, etc.)
   - `idle` → `active` when resumed (timer resets to 0)
   - `active` or `focused` → `idle` when focus mode is disabled in settings
3. The idle timer resets to 0 after every qualifying interaction

#### Activity Detection

4. The following events qualify as user interaction and reset the idle timer:
   - Mouse movement with cumulative delta > 5px (filters trackpad jitter)
   - Touch start
   - Scroll (any axis)
   - Key press (any key)
   - Wheel event
   - Window focus returning (tab becoming active again)
5. Mouse move events are debounced to ~100ms to avoid resetting the timer 60 times/second
6. Mouse movements with cumulative delta < 5px since last reset are ignored — this prevents trackpad micro-movements at rest from repeatedly breaking focus

#### Focused State Visuals

7. **Top chrome** (the `ReaderChrome` sticky header) fades from full opacity to 0 over 600ms, then receives `pointer-events: none` so it does not block taps on verses underneath
8. **Bottom chapter nav** (`ReaderChapterNav`) fades from full opacity to 0 over 600ms with the same `pointer-events: none` treatment
9. **Vignette gradients** appear at the very top and bottom of the viewport — subtle darkening overlays (10-15% darker than the reader background) that frame the text and compensate for the missing chrome. These use `pointer-events: none` always (decorative only)
10. The reader body (verse text, chapter heading) does **not** change — text stays at full opacity, theme stays the same, layout does not shift
11. Entering or exiting focus mode never changes scroll position

#### Restore Behavior

12. Any qualifying interaction instantly returns the page to active state
13. Restore animation is 200ms (fast — chrome appears the instant the user reaches for it)
14. When restoring, `pointer-events: auto` is set on the chrome containers **before** the fade-in starts so they are interactive immediately
15. When fading out, `pointer-events: none` is set **after** the fade-out completes so buttons remain clickable during the fade

#### Manual Focus Toggle

16. A focus mode toggle button appears in the top chrome's icon row, between the Aa (typography) icon and the Books icon
17. Icon: a Lucide icon that conveys focus/immersion (e.g., `Minimize2`, `EyeOff`, or `Focus`)
18. Tapping the toggle immediately enters focused state (skips the idle timer wait)
19. After manual trigger, the next interaction restores chrome — the timer then resets and the user will re-enter focused state after the configured delay (manual trigger does not disable focus mode)
20. The toggle icon shows a small filled accent dot when focus mode was manually triggered, so the user knows it's "armed"

#### Focus Mode Settings (added to TypographySheet)

21. A new "Focus mode" section at the bottom of the existing TypographySheet
22. **Enabled toggle** — on by default. When off, focus mode never activates regardless of activity. Persists in `wr_bible_focus_enabled` localStorage
23. **Timing buttons** — three options: 3s / 6s (default) / 12s. Persists in `wr_bible_focus_delay` localStorage. Takes effect immediately on the next idle period (no page reload needed)
24. **Dim orbs toggle** — on by default. Controls whether atmospheric orbs (if present on the reader) reduce opacity during focused state. Persists in `wr_bible_focus_dim_orbs` localStorage. (Currently the reader has no glow orbs — see Design Notes; this setting is a forward-compatible API for when orbs are added to the reader)
25. Explanatory caption below the section: "The chrome fades when you're still. Move or tap to bring it back."

#### Pause/Resume Primitive

26. The focus mode hook exposes `pauseFocusMode()` and `resumeFocusMode()` functions
27. Pause/resume is **ref-counted** — multiple consumers can pause simultaneously (books drawer, verse action sheet in BB-6, audio player in BB-26); focus mode resumes only when the pause count returns to 0
28. Opening the books drawer pauses focus mode; closing it resumes
29. The pause/resume methods are the contract for BB-6 (verse action sheet) and BB-26 (audio player) — those specs call these methods without modifying BB-5's internals

#### Coexistence with BB-6 (contract, not implemented here)

30. When the action sheet is open (BB-6), focus mode is paused
31. When the action sheet closes, the focus timer resets and counts from 0
32. If the user is in focused state and taps a verse, the chrome restores AND the action sheet opens on the same tap

### Non-Functional Requirements

- **Performance:** Activity listeners must not cause layout thrashing. Mousemove debounced to ~100ms. No forced reflows during opacity transitions.
- **Accessibility:** Lighthouse accessibility score >= 95 with focus mode active. Focused-state chrome must be truly non-interactive (`pointer-events: none`, removed from tab order). Reduced motion must be respected on all transitions. All new controls (toggle, settings) keyboard-accessible with visible focus rings.
- **Zero raw hex values:** All colors use design system tokens.

## Auth Gating

**Focus mode is fully public. No auth gates.** Same as BB-4 — the Bible reader is public and focus mode is a reading enhancement, not a data-persisting feature.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Automatic focus mode activation | Works — chrome fades after idle period | Same | N/A |
| Manual focus toggle | Works | Same | N/A |
| Change focus mode settings | Works — persists in localStorage | Same | N/A |
| Verse interaction during focused state | Taps pass through to verses (BB-6 will handle actions) | Same | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Focus mode works identically. Vignette gradients use the full viewport width. The focus toggle icon maintains 44px minimum touch target. Touch start is the primary restore trigger (mouse events less relevant). The TypographySheet's new Focus mode section renders in the bottom sheet layout. |
| Tablet (640-1024px) | Same as mobile — focus mode, vignette, and settings all render identically. Swipe navigation (from BB-4) still functions; a swipe gesture restores chrome and navigates simultaneously. |
| Desktop (> 1024px) | Focus mode works identically. Mouse movement with jitter filtering is the primary activity signal. The TypographySheet's Focus mode section renders in the floating panel. The focus toggle icon sits in the chrome icon row. |

**Cross-breakpoint notes:**
- The vignette gradient height adapts to the viewport — taller on desktop, proportionally shorter on mobile
- The focus toggle icon stays in the same position in the chrome icon row at all breakpoints
- Touch targets for the focus toggle are >= 44px at all breakpoints (inherits the existing `ICON_BTN` class from ReaderChrome)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full focus mode access. Settings persist in localStorage.
- **Logged-in users:** Same behavior. Phase 3 may sync reader preferences to server.
- **Route type:** Public
- **localStorage keys (new):**

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `wr_bible_focus_enabled` | `'true' \| 'false'` | `'true'` | Focus mode enabled/disabled |
| `wr_bible_focus_delay` | `'3000' \| '6000' \| '12000'` | `'6000'` | Idle timeout in milliseconds |
| `wr_bible_focus_dim_orbs` | `'true' \| 'false'` | `'true'` | Whether orbs dim during focused state (forward-compatible) |

**Note:** The spec input used `bible:focusModeEnabled` etc. These have been normalized to the project's `wr_bible_*` convention per `11-local-storage-keys.md`.

## Completion & Navigation

N/A — The Bible reader is a standalone page, not part of the Daily Hub tabbed experience. Focus mode is a reading enhancement with no completion signal.

## Design Notes

### Existing Components and Hooks to Reference

- **ReaderChrome** (`components/bible/reader/ReaderChrome.tsx`) — the sticky top chrome header. Currently uses `useChromeDim` for the BB-4 placeholder auto-dim. BB-5 replaces `useChromeDim` with the new focus mode system.
- **ReaderChapterNav** (`components/bible/reader/ReaderChapterNav.tsx`) — the bottom chapter navigation footer. Currently has no opacity control — BB-5 adds focus-driven opacity.
- **TypographySheet** (`components/bible/reader/TypographySheet.tsx`) — existing settings panel with Theme/Size/Line Height/Font sections. BB-5 adds a Focus mode section below the existing "Reset to defaults" link.
- **useChromeDim** (`hooks/useChromeDim.ts`) — BB-4's placeholder hook (4-second idle timer, dims to 0.3 opacity, basic mousemove/touchstart/scroll listeners, no jitter filtering). BB-5 fully replaces this.
- **useBibleDrawer** — provides `isOpen` state. BB-5 watches this to pause focus mode when the drawer is open.
- **useReducedMotion** — existing hook. BB-5 uses it to make all transitions instant (0ms) when `prefers-reduced-motion: reduce` is active.
- **useFocusTrap** — existing hook. Already used by TypographySheet. Not needed for focus mode itself (focus mode doesn't trap focus).
- Design system color tokens: `hero-bg`, `hero-dark`, `primary`, `primary-lt`
- Design system panel style from TypographySheet: `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`
- The existing `ICON_BTN` class in ReaderChrome provides the 44px touch target styling for icon buttons

### Current Reader Orb Status (Important Discovery)

The Bible reader page (`/bible/book/chapter`) currently has **no glow orbs**. The Midnight theme uses a solid `var(--reader-bg)` background (resolves to `#08051A`). Glow orbs exist on the Bible landing page (`/bible`, via BB-1) but not on the reader.

The "dim orbs in focus" setting and the `dimmed` prop API should still be built as specified — they are forward-compatible for when atmospheric orbs are added to the Midnight reader theme in a future spec. The setting toggle should render in the TypographySheet regardless, with no visible effect until orbs exist.

### New Visual Patterns (flagged for /plan)

1. **Focus vignette gradients** — NEW: top and bottom viewport overlays using `pointer-events: none`, gradient from the current reader background color (10-15% darker) to transparent. These are absolutely positioned within the reader root. Must adapt to the active reading theme (Midnight uses dark vignette; Parchment/Sepia would use warm-toned vignettes if they ever get focus mode — currently Midnight is the only theme with atmospheric treatment).
2. **Focus toggle icon with armed indicator** — NEW: small filled dot in the design system accent color overlaid on or adjacent to the focus icon when manually triggered. Similar concept to notification badge dots but purely decorative/informational.
3. **Chrome fade-out with pointer-events sequencing** — NEW: the specific pattern of fading opacity to 0 over 600ms then setting `pointer-events: none` after completion, and the reverse (setting `pointer-events: auto` before fade-in starts at 200ms). This timing coordination is unique to focus mode.

### Design System Recon Reference

The design system recon (`_plans/recon/design-system.md`) captures the current reader page styling but does not include focus mode visuals (since they don't exist yet). The vignette gradient colors and focus toggle styles are new patterns that will need to be marked `[UNVERIFIED]` during planning.

## Out of Scope

- **No focus mode on non-reader pages** — the Bible landing, books drawer, other sections of the app never enter focus mode
- **No reading time tracking** — BB-17 owns reading time
- **No scroll-direction-based dimming** — focus mode is about stillness, not scroll direction
- **No tap-to-toggle on the reader body** — tapping a verse will open the action sheet in BB-6; tapping empty space is ambiguous. Restore happens via real interaction events.
- **No focus mode keyboard shortcut** — adding `f` would conflict with future search shortcuts. Can be added later if requested.
- **No haptic feedback on mobile** — out of scope
- **No adding glow orbs to the reader** — the "dim orbs" setting is forward-compatible but this spec does not add orbs to the reader page. That's a separate visual decision.
- **No audio player focus behavior** — BB-26 will decide its own focus-mode chrome behavior using the pause/resume primitive
- **No modifying BB-4's verse data attributes or layout** — BB-5 only adds opacity transitions and overlays
- **Backend API persistence** — Phase 3

## Acceptance Criteria

- [ ] After 6 seconds of no interaction on `/bible/john/3`, the top chrome (ReaderChrome) fades to 0 opacity over 600ms
- [ ] The bottom chapter nav (ReaderChapterNav) fades to 0 opacity over the same 600ms
- [ ] Top and bottom vignette gradients appear during focused state, using the reader theme's background color darkened 10-15%
- [ ] The reader body (verse text, chapter heading) opacity is unchanged in focused state — verses stay at 100%
- [ ] Mouse movement (>5px cumulative delta), touch start, scroll, key press, or wheel event restores chrome within 200ms
- [ ] Mouse movements with <5px cumulative delta (trackpad jitter) do NOT reset the focus timer
- [ ] Focused-state chrome has `pointer-events: none` so taps pass through to verses underneath
- [ ] When restoring, `pointer-events: auto` is set before the fade-in animation starts
- [ ] When fading out, `pointer-events: none` is set after the fade-out animation completes
- [ ] The focus mode toggle icon appears in the top chrome's icon row between the Aa icon and the Books icon
- [ ] Tapping the toggle immediately enters focused state without waiting for the idle timer
- [ ] The toggle icon shows a small filled accent-colored dot when manually triggered ("armed" state)
- [ ] After manual trigger, the next interaction restores chrome, and the idle timer resets (does not disable focus mode)
- [ ] The TypographySheet has a "Focus mode" section with enabled toggle, timing buttons (3s/6s/12s), and dim-orbs toggle
- [ ] The TypographySheet caption reads "The chrome fades when you're still. Move or tap to bring it back."
- [ ] Disabling focus mode in settings prevents it from ever activating — chrome stays visible always
- [ ] Changing the timing setting takes effect immediately on the next idle period (no page reload)
- [ ] All three settings (`wr_bible_focus_enabled`, `wr_bible_focus_delay`, `wr_bible_focus_dim_orbs`) persist across page reloads
- [ ] `prefers-reduced-motion: reduce` makes all focus transitions instant (0ms) but preserves the focused/active state changes and vignette appearance
- [ ] Opening the books drawer pauses focus mode; closing it resumes (idle timer resets)
- [ ] The `pauseFocusMode()` and `resumeFocusMode()` hook methods are exposed and ref-counted (multiple simultaneous pausers supported)
- [ ] No layout shift when transitioning between active and focused states — no content reflow, no scroll position change
- [ ] The focus timer resets correctly after each qualifying interaction
- [ ] BB-4's `useChromeDim` placeholder is fully replaced — no 4-second auto-dim, no 0.3 opacity dim
- [ ] The VerseJumpPill (floating bottom-right on long chapters) is unaffected by focus mode — it remains visible and interactive
- [ ] Lighthouse accessibility score >= 95 with focus mode active on `/bible/john/3`
- [ ] Zero raw hex color values in any new code
- [ ] Reduced motion respected on all transitions
- [ ] Focus toggle button has minimum 44px touch target and visible focus ring
- [ ] Vignette gradients have `pointer-events: none` always (never intercept taps)
