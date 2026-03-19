# Feature: Ambient Sound Cross-Pollination

## Overview

Worship Room's Music feature has a rich ambient sound system with 8 scene presets, but it lives in isolation at `/music`. Users who are praying, journaling, or meditating have to manually navigate away from their practice to set the mood — breaking the flow of a sacred moment.

This feature bridges that gap by placing a gentle "Enhance with sound" pill directly in the Pray, Journal, and Meditate tabs of the Daily Hub, plus the meditation sub-pages. The pill offers 3 contextually curated scene suggestions (e.g., "Still Waters" during prayer, "Midnight Rain" while journaling) that start playing with a single tap. No navigation required, no flow interrupted.

The pill is ambient and optional — it sits quietly and invites, never demands. It's a whisper, not a shout. Users who want silence can ignore it entirely. Users who want atmosphere can tap once and return to their practice with the soundscape already running.

---

## User Stories

- As a **logged-out visitor** or **logged-in user** on the Pray tab, I want to quickly start calming ambient sounds without leaving the page so that I can create an atmosphere of prayer without breaking my focus.
- As a **logged-in user** writing in my journal, I want gentle sound suggestions that match the reflective mood of journaling so that my writing practice feels immersive and peaceful.
- As a **logged-in user** on a meditation sub-page, I want ambient sounds available alongside the meditation without conflicting with the exercise's own audio (breathing chimes, voice guidance).
- As a **user with audio already playing**, I want the pill to show me what's playing and give me quick access to the audio drawer so I can adjust without navigating away.

---

## Requirements

### The Pill (Collapsed State)

1. A small, non-intrusive pill/chip appears at the top of each tab's content area (below the tab bar, above the main content) on: Pray tab, Journal tab, Meditate tab, and all 6 meditation sub-pages
2. The pill displays a music note icon (Lucide `Music`) + "Enhance with sound" text
3. Clicking the pill expands it into a compact inline suggestion panel (not a modal, not a drawer)
4. The pill uses frosted glass styling on the tab's background — transparent overlay, not a solid block

### The Pill (Audio Playing State)

5. If audio is already playing (ambient sounds active via AudioProvider), the pill changes to show: a subtle waveform animation + "Playing: [scene name]" text (or "Playing: Custom mix" if no scene is named)
6. Tapping the pill in this state opens the AudioDrawer (existing component) instead of showing the suggestion panel
7. If the current scene name is one of the 3 suggested scenes for the current context, the pill may subtly indicate this (e.g., slightly brighter text), but this is not required

### The Suggestion Panel (Expanded State)

8. Expands inline below the pill — not a modal, not a drawer, not a separate route
9. Shows exactly 3 scene preset cards, contextually chosen per location (see mapping below)
10. Each card shows: the scene name, its category/mood icon, and a one-tap play action
11. Clicking a scene card starts it immediately via the existing audio system (scene player)
12. The panel includes a "Browse all sounds" link that navigates to `/music?tab=ambient`
13. The panel collapses back to the pill when: the user clicks outside it, clicks a scene card (after starting playback), or presses Escape
14. Only one suggestion panel can be open at a time across the page

### Scene Suggestions Per Context

| Location | Scene 1 | Scene 2 | Scene 3 |
|----------|---------|---------|---------|
| Pray tab | The Upper Room | Ember & Stone | Still Waters |
| Journal tab | Midnight Rain | Morning Mist | Starfield |
| Meditate tab | Garden of Gethsemane | Still Waters | Mountain Refuge |
| Breathing Exercise | Still Waters | Morning Mist | Garden of Gethsemane |
| Scripture Soaking | The Upper Room | Starfield | Garden of Gethsemane |
| Other meditation sub-pages (Gratitude, ACTS, Psalms, Examen) | Garden of Gethsemane | Still Waters | Mountain Refuge |

### Meditation Sub-Page Visibility Rules

15. On meditation sub-pages that have their own audio controls (Breathing Exercise with chime toggle + voice guidance), the pill should only appear if no exercise audio is currently active (i.e., the exercise has not been started, or has completed). Once the user starts the breathing exercise, the pill hides to avoid audio confusion. When the exercise completes, the pill reappears.
16. On meditation sub-pages without independent audio controls (Scripture Soaking, Gratitude, ACTS, Psalms, Examen), the pill always appears.

### Persistence & Behavior

17. The pill renders on every visit — it's a persistent gentle suggestion, not a one-time prompt or dismissable tooltip
18. No new localStorage keys. No saved state. The pill's expanded/collapsed state is React component state only, reset on navigation
19. No new routes

---

## Auth & Persistence

### Auth Gating Per Interactive Element

**Important finding**: The existing `useScenePlayer` hook is auth-gated — it opens the auth modal for logged-out users trying to play scenes. This spec must decide whether to preserve that gate or bypass it for cross-pollination.

**Decision: Preserve the existing auth gate.** Scene playback through the suggestion panel follows the same auth rules as playing scenes from `/music`. This is consistent and avoids creating a loophole where logged-out users can play scenes from Daily Hub but not from the Music page.

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Pill (collapsed, no audio) | Visible. "Enhance with sound" text. Clickable to expand panel. | Same |
| Pill (collapsed, audio playing) | Not reachable — audio requires auth | Visible. "Playing: [scene name]". Clickable to open AudioDrawer. |
| Suggestion panel | Visible when pill is expanded. Scene cards are clickable. | Same |
| Scene card click | Auth modal appears: "Sign in to play ambient scenes" | Scene starts playing immediately |
| "Browse all sounds" link | Navigates to `/music?tab=ambient` (public page) | Same |
| Escape / click-outside | Collapses panel | Same |

### Persistence

- **Logged-out (demo mode)**: Zero persistence. Pill state is React component state only. No cookies, no localStorage writes, no IP tracking.
- **Logged-in**: Scene playback uses the existing AudioProvider system (which already handles state). No additional data is saved by this feature.
- **Route type**: Public (pill visible on public and auth-gated pages alike; auth gate is on the *play action*, not the *visibility*)

---

## UX & Design Notes

### Emotional Tone

The pill should feel like a candle being offered in a quiet room — you can accept it or let it be. It's not a banner, not a notification, not an upsell. The text "Enhance with sound" is a gentle invitation. The frosted glass styling makes it feel like part of the room, not an overlay on top of it.

### Visual Design — Pill (Collapsed)

- **Container**: `bg-white/10 backdrop-blur-md border border-white/15 rounded-full` (frosted glass on dark hero backgrounds) OR `bg-gray-100/80 backdrop-blur-md border border-gray-200/50 rounded-full` (frosted glass on light `#F5F5F5` backgrounds — adapt to the current page's background context)
- **Background context rule**: The Pray, Journal, and Meditate tabs have a light `#F5F5F5` background with the BackgroundSquiggle. The pill sits at the top of the content area below the hero. It should use the light-background variant. On meditation sub-pages which have darker or varied backgrounds, use the dark variant.
- **Icon**: Lucide `Music`, 16px, `text-white/50` (dark bg) or `text-gray-500` (light bg)
- **Text**: "Enhance with sound", `text-sm`, `text-white/70` (dark bg) or `text-gray-600` (light bg)
- **Padding**: `py-2 px-4` — compact, not tall
- **Minimum height**: 36px (pill is intentionally smaller than 44px action buttons — it's a passive suggestion, not a primary action). Touch target achieved via padding around the pill.
- **Hover**: Background opacity increases slightly (`bg-white/15` or `bg-gray-200/80`)
- **Transition**: `transition-colors duration-200`

### Visual Design — Pill (Audio Playing State)

- **Container**: Same frosted glass as collapsed, but with a subtle left-border accent in `primary` color (2px) to indicate active state
- **Content**: Animated waveform icon (3 bars, CSS animation, 16px) + "Playing: [Scene Name]" in `text-sm font-medium`
- **Waveform animation**: 3 vertical bars with staggered `scaleY` animation (0.3 to 1.0, different durations: 0.4s, 0.6s, 0.5s). Respects `prefers-reduced-motion` — static bars when reduced motion is preferred.

### Visual Design — Suggestion Panel (Expanded)

- **Container**: `bg-white/10 backdrop-blur-md border border-white/15 rounded-xl` (dark bg) or `bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg` (light bg)
- **Width**: On mobile, full content width. On desktop, `max-w-[480px]`, left-aligned under the pill.
- **Padding**: `p-3`
- **Scene cards**: 3 cards in a row. Each card:
  - Container: `bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors` (dark bg) or `bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition-colors` (light bg)
  - Scene name: `text-sm font-medium text-white` (dark) or `text-sm font-medium text-gray-800` (light)
  - Category indicator: small icon or subtle dot in the scene's animation category color
  - Minimum height: 44px (touch target compliance)
  - Focus state: `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none`
- **"Browse all sounds" link**: Below the cards. `text-xs text-white/40 hover:text-white/60` (dark) or `text-xs text-gray-400 hover:text-gray-600` (light). Right-aligned or centered.
- **Expand/collapse animation**: Height transition (200ms ease-out), opacity 0→1. `prefers-reduced-motion`: instant, no animation.
- **Click-outside dismissal**: Use a click-outside handler (event listener on document). Escape key also closes.

### New Visual Patterns

1. **Waveform animation** (3 bars, CSS-only): New pattern not in design system recon. Plan should mark animation timing values as `[UNVERIFIED]`.
2. **Frosted pill on light background** (`bg-gray-100/80 backdrop-blur-md`): New variant of the frosted glass pattern. Existing frosted glass patterns in the design system are all on dark backgrounds. Plan should verify this looks good on the `#F5F5F5` neutral background.

### Design System Recon References

- **Frosted glass pattern (dark)**: From `09-design-system.md` — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (dashboard cards). The pill and panel use a similar but more opaque variant (`bg-white/10 backdrop-blur-md border border-white/15`) since they overlay varied backgrounds rather than sitting in a controlled dark container.
- **Chip/Tag Pattern**: From the design system recon — the collapsed pill shares proportions with the existing chip pattern (`rounded-full`, `py-2 px-4`, `text-sm`) but uses frosted glass instead of solid white.
- **Tab content area**: From the Tab Bar Pattern — the pill sits below the sticky tab bar and above the tab's heading ("What's On Your Heart?" etc.). It's within the `max-w-2xl` content container.

---

## Responsive Behavior

### Mobile (< 640px)

- Pill: Full content width within the `max-w-2xl` container (centered with auto margins)
- Expanded panel: Full content width, scene cards stack horizontally in a scrollable row (`flex overflow-x-auto gap-2 snap-x snap-mandatory`). Each card is `min-w-[140px] flex-shrink-0 snap-center`.
- "Browse all sounds" link below the scrollable row
- Touch targets: All scene cards minimum 44px height

### Tablet (640px - 1024px)

- Pill: Auto-width (fits content), left-aligned in the content area
- Expanded panel: `max-w-[480px]`, left-aligned under the pill
- Scene cards in a horizontal row (3 across, no scroll needed at this width)

### Desktop (> 1024px)

- Pill: Auto-width (fits content), left-aligned in the content area
- Expanded panel: `max-w-[480px]`, left-aligned under the pill
- Scene cards in a horizontal row (3 across)
- Hover states visible on cards

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature has no user text input. It's a display-only UI element with click interactions.
- **User input involved?**: No.
- **AI-generated content?**: No — all text is static (scene names, "Enhance with sound" label).

---

## Edge Cases

- **AudioProvider not available**: The pill should gracefully handle the case where AudioProvider context is not available (e.g., if rendered outside the provider tree). In practice this shouldn't happen since AudioProvider wraps the entire app, but a null check is appropriate.
- **Scene already playing is the suggested scene**: If the user clicks a scene card for a scene that's already active (same `sceneId`), toggle play/pause (existing `useScenePlayer` behavior) rather than reloading the scene.
- **Routine in progress**: If a bedtime routine is active and user clicks a scene card, the existing `useScenePlayer` routine interrupt confirmation should work as-is.
- **Multiple tabs on same page**: Since the pill appears on Pray, Journal, and Meditate tabs, and tab content is mounted at all times but hidden, ensure only the visible tab's pill is interactive. Hidden tabs' pills should not interfere with click-outside handling or keyboard navigation.
- **Breathing Exercise state detection**: The pill needs to know whether the Breathing Exercise has active audio. This requires either: (a) the BreathingExercise exposing its active state via a shared context/callback, or (b) the pill checking if browser Speech Synthesis or Web Audio is active. Approach (a) is cleaner — a simple boolean prop or context value.
- **AudioDrawer already open**: If the user clicks the "Playing" pill while the AudioDrawer is already open, the pill click should close the drawer (toggle behavior) rather than being a no-op.
- **Scene playback failure**: If a scene fails to load (network error on audio files), the existing audio system handles errors. The pill should not show a separate error state — the AudioPill (global component) already handles playback errors.
- **`prefers-reduced-motion`**: Waveform animation uses static bars. Expand/collapse transition is instant. No other motion in this feature.

---

## Out of Scope

- **AI-powered scene recommendations** based on mood or journal content — this uses a static mapping. Personalized audio suggestions are deferred to Phase 4.
- **Auto-playing scenes** when a tab loads — the pill is always user-initiated. Never auto-play audio.
- **Saving scene preferences per tab** — no localStorage writes. Scene suggestions are always the same static set.
- **Custom scene suggestions** — users cannot configure which scenes appear in the pill. The mapping is hardcoded.
- **Scene previews** (short audio samples before committing to play) — out of scope. One tap plays the full scene.
- **Ambient sound suggestions in the Dashboard** — the pill only appears in Daily Hub tabs and meditation sub-pages. Dashboard has its own Quick Actions widget.
- **New ambient sounds or scenes** — this feature uses the existing 8 scenes.
- **Listen page or standalone audio route** — explicitly a non-goal per CLAUDE.md.
- **Backend API** — entirely frontend. No new endpoints.

---

## Acceptance Criteria

### Pill Visibility

- [ ] The "Enhance with sound" pill appears on the Pray tab content area, below the tab bar, above "What's On Your Heart?"
- [ ] The pill appears on the Journal tab content area, below the tab bar, above "What's On Your Mind?"
- [ ] The pill appears on the Meditate tab content area, below the tab bar, above "What's On Your Spirit?"
- [ ] The pill appears on the Scripture Soaking meditation sub-page
- [ ] The pill appears on the Gratitude Reflection meditation sub-page
- [ ] The pill appears on the ACTS Prayer Walk meditation sub-page
- [ ] The pill appears on the Psalm Reading meditation sub-page
- [ ] The pill appears on the Examen Reflection meditation sub-page
- [ ] The pill appears on the Breathing Exercise page ONLY when the exercise is not actively running
- [ ] The pill hides when the Breathing Exercise starts and reappears when it completes

### Pill States

- [ ] When no audio is playing, the pill shows Lucide `Music` icon + "Enhance with sound" text
- [ ] When audio is playing, the pill shows a waveform animation + "Playing: [scene name]" (or "Playing: Custom mix" if no scene name)
- [ ] When `prefers-reduced-motion` is active, the waveform animation shows static bars instead of animated bars

### Suggestion Panel

- [ ] Clicking the pill (no audio state) expands a suggestion panel inline below the pill
- [ ] The panel shows exactly 3 scene cards
- [ ] Pray tab shows: "The Upper Room", "Ember & Stone", "Still Waters"
- [ ] Journal tab shows: "Midnight Rain", "Morning Mist", "Starfield"
- [ ] Meditate tab shows: "Garden of Gethsemane", "Still Waters", "Mountain Refuge"
- [ ] Breathing Exercise shows: "Still Waters", "Morning Mist", "Garden of Gethsemane"
- [ ] Scripture Soaking shows: "The Upper Room", "Starfield", "Garden of Gethsemane"
- [ ] Other meditation sub-pages show: "Garden of Gethsemane", "Still Waters", "Mountain Refuge"
- [ ] The panel includes a "Browse all sounds" link pointing to `/music?tab=ambient`
- [ ] Clicking a scene card (when logged in) starts the scene playing immediately
- [ ] Clicking a scene card (when logged out) shows the auth modal with message "Sign in to play ambient scenes"
- [ ] Clicking outside the panel collapses it back to the pill
- [ ] Pressing Escape collapses the panel back to the pill
- [ ] Clicking a scene card collapses the panel after starting playback

### Audio Playing Pill

- [ ] Tapping the pill when audio is playing opens the AudioDrawer (existing component)
- [ ] If the AudioDrawer is already open, tapping the pill closes it (toggle)

### Visual Design

- [ ] Pill uses frosted glass styling appropriate to the background: light variant on Daily Hub tabs (`bg-gray-100/80 backdrop-blur-md border border-gray-200/50 rounded-full`), dark variant on meditation sub-pages if applicable
- [ ] Expanded panel uses frosted glass styling matching the pill's variant
- [ ] Scene cards have `rounded-lg` corners, adequate padding, and visible hover state
- [ ] "Browse all sounds" link is subtle and non-prominent (`text-xs`, muted color)
- [ ] Panel expand/collapse has a smooth 200ms transition (or instant with `prefers-reduced-motion`)

### Responsive Layout

- [ ] Mobile (< 640px): Pill is full content width; expanded panel is full content width with horizontally scrollable scene cards (`overflow-x-auto`)
- [ ] Tablet (640-1024px): Pill is auto-width, left-aligned; panel is `max-w-[480px]`
- [ ] Desktop (> 1024px): Same as tablet; scene cards in a horizontal row without scrolling
- [ ] All scene cards have minimum 44px touch target height

### Accessibility

- [ ] Pill is keyboard-focusable with visible focus ring
- [ ] Scene cards are keyboard-navigable (Tab between cards)
- [ ] Each scene card has an accessible name (the scene name)
- [ ] Escape key closes the expanded panel
- [ ] Expanded panel has `role="region"` or `role="listbox"` with appropriate `aria-label`
- [ ] When panel expands, focus moves to the first scene card
- [ ] When panel collapses (via Escape or click-outside), focus returns to the pill
- [ ] Screen reader announces panel expansion/collapse via `aria-expanded` on the pill button
- [ ] Waveform animation is decorative (`aria-hidden="true"`)

### No Regressions

- [ ] Existing AudioPill (global fixed-position component) is not affected
- [ ] Existing AudioDrawer behavior is unchanged
- [ ] Existing scene playback from `/music` page works identically
- [ ] Tab switching in Daily Hub preserves pill state correctly (hidden tabs don't interfere)
- [ ] No new localStorage keys are written
- [ ] No new routes are created
