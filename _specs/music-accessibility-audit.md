# Feature: Music Accessibility Audit

## Overview

A comprehensive accessibility pass across the entire Music feature — the floating pill, audio drawer, ambient sound mixer, scene presets, sleep & rest content, sleep timer, bedtime routines, saved mixes, and favorites. While each functional spec (1–8) included accessibility requirements within its scope, this audit catches cross-component gaps that only surface when the full system is assembled: focus order when navigating between pill, drawer, tab content, and page; screen reader announcement sequencing across concurrent audio state changes; keyboard navigation flow across the entire music experience; and consistent ARIA patterns across components built in different specs.

This pass ensures the Music feature meets WCAG 2.1 AA compliance and provides a coherent, non-frustrating experience for keyboard-only users, screen reader users, and users with vestibular or motion sensitivities. For an app that serves emotionally vulnerable users seeking comfort and healing, accessibility isn't a nice-to-have — it's foundational to the mission.

---

## User Stories

- As a **screen reader user**, I want clear, concise announcements when audio state changes (sounds added/removed, scenes loaded, timer events, routine progress) so I can understand what's happening without visual cues.
- As a **keyboard-only user**, I want to navigate the entire music experience — pill, drawer, tabs, sound grid, sliders, scene cards, routine builder — using only my keyboard, with logical tab order and no traps.
- As a **user with vestibular sensitivity**, I want all visual animations (waveform, pulse, morph, drift, glow) disabled when I've set `prefers-reduced-motion: reduce`, while audio crossfades and fade-ins still work normally.
- As a **mobile user with motor impairments**, I want all interactive elements (icons, hearts, buttons, slider thumbs) to be large enough to tap without frustration (44x44px minimum).
- As a **low-vision user**, I want all text and UI elements to have sufficient contrast against their backgrounds so I can read them comfortably.

---

## Requirements

### 1. Focus Management Flow

Audit and fix the complete focus chain across the Music feature:

**Drawer open/close cycle:**
- When the drawer opens (via pill tap or keyboard activation), focus moves into the drawer — specifically to the first focusable element inside it (typically the active tab or the first interactive control).
- While the drawer is open, focus is trapped — pressing Tab cycles only within the drawer. Focus does not escape to the page behind.
- When the drawer closes (via close button, Escape key, or pill toggle), focus returns to the floating pill — or to the specific element that triggered the drawer if it was opened from a different control.

**Dialog focus cycles:**
- Confirmation dialogs (delete mix, switch scene with unsaved changes, end routine early) trap focus when open.
- On dialog close (confirm or cancel), focus returns to the element that triggered the dialog — not to the page body or the drawer's first element.

**Routine builder focus:**
- When the routine builder modal or panel opens, focus moves into it.
- Step reordering is fully keyboard-operable (grab, move, drop pattern using Space and Arrow keys).
- On builder close, focus returns to the trigger element.

**General rules:**
- No focus loss — focus should never land on `<body>` after closing a panel, dialog, or modal.
- Hidden/offscreen elements must not receive focus. Elements inside a closed drawer, hidden tab panels, or collapsed sections must have `tabindex="-1"` or be removed from the tab order.
- Tab order must be logical and match the visual order within each component.

### 2. Screen Reader Announcements

All audio state changes must be announced to screen readers. Announcements should be:
- **Concise** — include only the essential information, not redundant context.
- **Appropriately prioritized** — most use `aria-live="polite"` (non-interrupting); only critical/time-sensitive events use `aria-live="assertive"`.
- **Debounced for rapid changes** — if multiple state changes happen in quick succession (e.g., user toggles several sounds rapidly), batch them into a single announcement rather than flooding the screen reader queue.

**Polite announcements (`aria-live="polite"`):**
- Audio starting: "Now playing: [scene/sound name]. [N] sounds active."
- Audio pausing: "Audio paused."
- Audio resuming: "Audio resumed."
- Sound added to mix: "[Sound name] added to mix. [N] of 6 sounds active."
- Sound removed from mix: "[Sound name] removed from mix. [N] of 6 sounds active."
- Scene loaded: "Now playing: [Scene name]. [N] sounds active."
- Routine step advanced: "Step [N] of [total]: [step name]."
- Mix saved: "Mix saved as [mix name]."
- Favorite toggled: "[Name] added to favorites." / "[Name] removed from favorites."

**Assertive announcements (`aria-live="assertive"`):**
- Sleep timer fade warning: "Sleep timer fading in [N] minutes."
- Sleep timer complete: "Sleep timer complete. Audio paused."
- Errors: "Couldn't load [sound name]. Tap to retry."

**Contextual announcements (polite, with undo hint):**
- Scene transition with undo: "Switched to [Scene name]. Press Z to undo."
- Sleep timer started: "Sleep timer set for [duration] with [fade] minute fade."
- Routine started: "[Routine name] routine started. Step 1 of [N]: [step name]."
- Routine complete: "[Routine name] routine complete. Ambient continuing with sleep timer."

**What is NOT announced:**
- Individual volume slider changes during drag (only final value on release, and only if the slider has focus).
- Background crossfade loop boundaries.
- Visual-only state changes (glow, pulse, waveform animation).

### 3. Keyboard Navigation

Every interactive element in the Music feature must be keyboard-reachable and operable. The full keyboard mapping:

**Floating Pill:**
- Enter/Space: Toggle drawer open/close
- Enter/Space (when pill shows a routine shortcut): Start the routine

**Drawer:**
- Escape: Close drawer and return focus to pill
- Tab/Shift+Tab: Cycle through focusable elements within drawer (trapped)

**Drawer Tabs:**
- Arrow Left/Right: Move between tabs (Mixer, Scenes, Sleep, Routines)
- Enter/Space: Activate the focused tab
- Home/End: Jump to first/last tab

**Volume Sliders (individual sound and master):**
- Arrow Left/Right: Decrease/increase by 1%
- Page Up/Page Down: Increase/decrease by 10%
- Home: Set to minimum (0%)
- End: Set to maximum (100%)

**Sound Icon Grid:**
- Enter/Space: Toggle sound on/off
- Arrow keys: Navigate between icons in the grid (row/column navigation)
- Tab: Move out of the grid to the next component

**Scene Cards / Sleep Session Cards:**
- Enter/Space: Load the scene or start the session
- Tab: Move between cards

**Sleep Content Progress Bar:**
- Arrow Left/Right: Seek backward/forward by 10 seconds

**Tab Bar (Ambient page, Sleep page):**
- Arrow Left/Right: Switch between tabs

**Routine Builder — Step Reordering:**
- Space (on drag handle): Grab the step
- Arrow Up/Down (while grabbed): Move the step up/down
- Space/Enter (while grabbed): Drop the step in its new position
- Escape (while grabbed): Cancel the reorder and return step to original position

**General:**
- No keyboard traps — the user can always Tab or Escape out of any component
- Arrow key navigation wraps at boundaries (last item → first item) where appropriate
- Escape closes the innermost open layer (dialog first, then drawer)

### 4. ARIA Attribute Consistency

All interactive elements must have correct, consistent ARIA attributes across every music component:

**Toggle buttons (sound icons, favorite hearts, play/pause):**
- All use `aria-pressed` (not a mix of `aria-pressed` and `aria-checked`)
- Descriptive `aria-label` that includes the element name and current state context

**Expandable elements (drawer toggle, filter panels, text panels):**
- `aria-expanded` on the trigger element, reflecting open/closed state
- `aria-controls` on the trigger, pointing to the controlled panel's `id`

**Tabs (drawer tabs, page-level tabs):**
- Container has `role="tablist"`
- Each tab has `role="tab"` with `aria-selected`
- Each tab panel has `role="tabpanel"` with `aria-labelledby` pointing to its tab

**Sliders (volume controls, master volume):**
- `role="slider"` (or native `<input type="range">`)
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- `aria-valuetext` with human-readable value (e.g., "70 percent")
- `aria-label` with the sound name (e.g., "Gentle Rain volume")

**Loading states:**
- `aria-busy="true"` on the loading element
- Remove `aria-busy` once loading completes

**Disabled controls:**
- `aria-disabled="true"` on controls that are visible but not currently operable (e.g., save button when no changes exist)

**Filter chips:**
- `aria-pressed` for toggleable filter chips (consistent with toggle button pattern)

**Toasts:**
- `role="alert"` for error and limit toasts
- `role="status"` for informational toasts (save confirmations, etc.)

**Dialogs:**
- `role="alertdialog"` for confirmation dialogs requiring user decision
- `role="dialog"` for non-urgent dialogs (routine builder, etc.)
- `aria-modal="true"` on all dialogs
- `aria-labelledby` pointing to the dialog's heading

### 5. Reduced Motion Support

When `prefers-reduced-motion: reduce` is active, all visual animations are disabled:

**Disabled animations:**
- Pill waveform animation — bars freeze at mid-height position
- Pill morph-to-drawer animation — drawer opens/closes instantly (no morph transition)
- Active sound icon pulse animation — purple glow border stays, but the scale pulse stops
- CSS ambient animations in the drawer (drift, pulse, glow effects) — all disabled
- Scene crossfade visual transitions — scene changes happen instantly (no visual transition)
- Tab transition animations — tab panels swap instantly
- Progress arc animation on the pill — static progress indicator instead
- Undo toast slide-in animation — toast appears instantly

**NOT affected by reduced motion (audio is always smooth):**
- Audio crossfades between scenes (1.5-second crossfade still happens)
- Sound fade-in/fade-out (1-second ramp still happens)
- Sleep timer audio fade-out (gradual volume reduction still happens)
- Routine step transitions (audio transitions still smooth)

**Implementation check:** Every `@keyframes` and CSS `transition` in music-related components must be wrapped in a `prefers-reduced-motion` check, either via a media query or Tailwind's `motion-safe:` / `motion-reduce:` utilities.

### 6. Color Contrast

All text and interactive elements must meet WCAG AA contrast ratios:

**4.5:1 minimum for normal text (< 18pt / < 14pt bold):**
- White text on semi-transparent pill background (verify across all page backgrounds the pill might float over)
- White text on dark drawer background
- Muted/inactive text on dark backgrounds (e.g., "Add Sound" helper text, empty state messages)
- Filter chip text in both active and inactive states
- Timer countdown text
- Sound name labels on icon cards

**3:1 minimum for large text (≥ 18pt / ≥ 14pt bold) and UI components:**
- Purple active state indicators against dark backgrounds
- Slider thumb against slider track
- Slider filled track against unfilled track
- Error indicator (orange dot) against card background
- "New" badge on scene cards
- Focus outlines on all focusable elements

**Specific areas of concern:**
- Semi-transparent backgrounds (pill, cards) may not provide consistent contrast depending on what's behind them. Verify contrast at the lowest-contrast scenario.
- Muted text colors (e.g., `text-white/50`) may fall below 4.5:1 on dark backgrounds — audit and adjust opacity or use a higher-contrast muted color.

### 7. Touch Targets

All interactive elements must meet the 44x44px minimum touch target size (WCAG 2.5.5):

**Already adequate (verify):**
- Floating pill (56px tall)
- Sound icons in grid (80-90px)

**Potentially undersized (audit and fix):**
- Volume slider thumbs — native browser thumbs are often < 44px on mobile; custom styling may be needed
- Favorite heart icons on scene cards — often rendered at 20-24px; need adequate padding or hit area
- Three-dot menu triggers on routine/mix cards — often rendered small; need adequate touch area
- Close (X) buttons on drawer and dialogs — verify at least 44x44px clickable area
- Skip-forward button on routine progress indicator
- Filter chip labels in scene browsing — verify tap area covers the full chip
- Drawer tab labels — verify each tab has adequate tap height

**Fix approach:** Where the visual element is intentionally smaller than 44px (e.g., a 20px heart icon), ensure the clickable/tappable area extends to at least 44x44px via padding, `min-height`/`min-width`, or an invisible touch target expansion.

---

## Auth Gating

No auth gating changes in this spec. This is a code quality and accessibility audit only. All existing auth gates remain as defined in their respective functional specs (1–8).

---

## Responsive Behavior

This spec does not introduce new UI layouts. All responsive behavior is defined in the functional specs (1–8). However, this audit verifies that accessibility holds across breakpoints:

### Mobile (< 640px)
- Drawer opens as full-width bottom sheet — focus trap and Escape-to-close still work
- Touch targets are especially critical at this size — verify 44px minimums
- Sound icon grid at 3 columns still has adequate spacing for touch
- Volume slider thumbs are large enough to drag accurately on touch screens

### Tablet (640px – 1024px)
- Drawer opens as wider bottom sheet — focus management unchanged
- Icon grid at 4 columns — verify arrow key grid navigation still works
- No additional accessibility concerns beyond mobile

### Desktop (> 1024px)
- Drawer may be a side panel — focus trap must still work when panel is alongside page content
- Keyboard users must be able to move focus between the page and the drawer panel using Tab
- Icon grid at 6 columns — verify arrow key grid navigation handles the wider grid

---

## UX & Design Notes

- **Tone:** This is an invisible-to-users quality pass. No visual changes should be noticeable to sighted users who don't use assistive technologies (except possibly slightly larger touch targets and improved focus outlines).
- **Focus outlines:** Ensure all focusable elements have a visible focus indicator. Use the existing focus ring style from the design system (or establish one if none exists — suggest a 2px purple outline with 2px offset for visibility against dark backgrounds).
- **Screen reader testing:** All announcements should be tested with VoiceOver (macOS/iOS) at minimum.
- **Colors:** Do not change brand colors. If contrast is insufficient, adjust opacity or add a subtle background behind text rather than changing the color itself.
- **Typography:** No changes to font sizes or weights.

---

## AI Safety Considerations

- **Crisis detection needed?** No — this spec makes no changes to user input flows.
- **User input involved?** No — this is an audit of existing interactive elements, not new input fields.
- **AI-generated content?** No — no new content is introduced.

---

## Auth & Persistence

- **Logged-out (demo mode):** No changes. Existing auth gates remain in place.
- **Logged-in:** No changes. No new data is persisted.
- **Route type:** N/A — this spec touches components across multiple routes, all of which retain their existing route type (public or protected).

---

## Worship Room Safety

- No user text input changes
- No `dangerouslySetInnerHTML` usage
- No database writes
- No AI-generated content
- No changes to crisis detection or content moderation

---

## Out of Scope

- **New features or UI elements** — this spec only audits and fixes existing components from Specs 1–8
- **Backend accessibility** — API responses, server-side rendering (not applicable to this SPA)
- **WCAG AAA compliance** — this audit targets AA; AAA (e.g., 7:1 contrast ratio, sign language for audio) is a future enhancement
- **Automated accessibility testing setup** — adding axe-core, Lighthouse CI, or other automated a11y tools to the test pipeline (valuable but separate scope)
- **Screen reader testing on Windows** — NVDA/JAWS testing is deferred; VoiceOver is the primary target
- **Non-music components** — Prayer Wall, Daily Hub, Local Support, and other features have their own accessibility concerns; this spec is scoped to Music only
- **Right-to-left (RTL) language support** — internationalization is a non-goal for MVP

---

## Acceptance Criteria

### Focus Management
- [ ] Opening the drawer moves focus to the first focusable element inside the drawer
- [ ] Focus is trapped within the drawer — Tab/Shift+Tab cycles only within drawer content
- [ ] Closing the drawer returns focus to the floating pill (or the element that opened it)
- [ ] Opening a confirmation dialog traps focus within the dialog
- [ ] Closing a dialog (confirm or cancel) returns focus to the element that triggered it
- [ ] Opening the routine builder moves focus into the builder
- [ ] Closing the routine builder returns focus to the trigger element
- [ ] No focus is ever lost to `<body>` after closing any panel, drawer, or dialog
- [ ] Hidden elements (closed drawer content, inactive tab panels, collapsed sections) do not receive focus
- [ ] Tab order within each component matches the visual reading order

### Screen Reader Announcements
- [ ] Audio starting announces: "Now playing: [name]. [N] sounds active."
- [ ] Audio pausing announces: "Audio paused."
- [ ] Audio resuming announces: "Audio resumed."
- [ ] Sound added announces: "[Name] added to mix. [N] of 6 sounds active."
- [ ] Sound removed announces: "[Name] removed from mix. [N] of 6 sounds active."
- [ ] Scene loaded announces: "Now playing: [Scene name]. [N] sounds active."
- [ ] Scene transition with undo announces: "Switched to [Scene name]. Press Z to undo."
- [ ] Sleep timer start announces: "Sleep timer set for [duration] with [fade] minute fade."
- [ ] Timer fade warning uses `aria-live="assertive"`: "Sleep timer fading in [N] minutes."
- [ ] Timer complete uses `aria-live="assertive"`: "Sleep timer complete. Audio paused."
- [ ] Routine started announces: "[Name] routine started. Step 1 of [N]: [step name]."
- [ ] Routine step advanced announces: "Step [N] of [total]: [step name]."
- [ ] Routine complete announces: "[Name] routine complete. Ambient continuing with sleep timer."
- [ ] Mix saved announces: "Mix saved as [mix name]."
- [ ] Favorite toggled announces: "[Name] added to favorites." / "[Name] removed from favorites."
- [ ] Rapid state changes are debounced — screen reader is not flooded with multiple quick announcements
- [ ] Volume slider changes during drag are NOT announced (only final value if slider has focus)

### Keyboard Navigation
- [ ] Pill: Enter/Space toggles drawer open/close
- [ ] Drawer tabs: Arrow Left/Right moves between tabs, Enter/Space activates
- [ ] Volume sliders: Arrow Left/Right adjusts by 1%, Page Up/Down by 10%, Home/End for min/max
- [ ] Sound icon grid: Enter/Space toggles sound, Arrow keys navigate by row/column
- [ ] Scene cards: Enter/Space loads the scene
- [ ] Sleep session cards: Enter/Space starts playback
- [ ] Progress bar: Arrow Left/Right seeks by 10 seconds
- [ ] Routine builder steps: Space grabs, Arrow Up/Down moves, Space/Enter drops, Escape cancels
- [ ] Drawer: Escape closes drawer
- [ ] Dialogs: Escape closes dialog
- [ ] No keyboard traps exist anywhere in the music feature
- [ ] Arrow key navigation wraps at grid boundaries where appropriate

### ARIA Attributes
- [ ] All toggle buttons (sound icons, favorites, play/pause) use `aria-pressed`
- [ ] All expandable triggers have `aria-expanded` and `aria-controls`
- [ ] All tab containers have `role="tablist"`, tabs have `role="tab"` with `aria-selected`, panels have `role="tabpanel"` with `aria-labelledby`
- [ ] All sliders have `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and descriptive `aria-valuetext`
- [ ] All sliders have `aria-label` including the sound name (e.g., "Gentle Rain volume")
- [ ] Loading states use `aria-busy="true"`
- [ ] Disabled controls use `aria-disabled="true"`
- [ ] Error toasts use `role="alert"`; informational toasts use `role="status"`
- [ ] Confirmation dialogs use `role="alertdialog"` with `aria-modal="true"` and `aria-labelledby`
- [ ] Non-urgent dialogs use `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
- [ ] ARIA patterns are consistent across all music components (no mixed patterns)

### Reduced Motion
- [ ] Pill waveform animation stops (bars freeze at mid-height) when `prefers-reduced-motion: reduce` is active
- [ ] Pill morph-to-drawer transition is instant (no animation) when reduced motion is active
- [ ] Active sound icon pulse animation is disabled (glow stays, pulse stops) when reduced motion is active
- [ ] CSS ambient animations in drawer (drift, pulse, glow) are all disabled when reduced motion is active
- [ ] Scene change visual transitions are instant when reduced motion is active
- [ ] Tab transition animations are instant when reduced motion is active
- [ ] Progress arc animation on pill is static when reduced motion is active
- [ ] Undo toast appears instantly (no slide animation) when reduced motion is active
- [ ] Audio crossfades are NOT affected by reduced motion (still 1.5-second crossfade)
- [ ] Sound fade-in/fade-out is NOT affected by reduced motion (still 1-second ramp)
- [ ] Sleep timer audio fade is NOT affected by reduced motion

### Color Contrast
- [ ] White text on pill background meets 4.5:1 contrast ratio across all page backgrounds
- [ ] White text on drawer background meets 4.5:1 contrast ratio
- [ ] Muted/inactive text on dark backgrounds meets 4.5:1 contrast ratio (adjust opacity if needed)
- [ ] Purple active indicators meet 3:1 contrast ratio against dark backgrounds
- [ ] Slider thumb and track colors meet 3:1 contrast ratio
- [ ] Filter chip text meets 4.5:1 contrast in both active and inactive states
- [ ] Error indicator (orange dot) meets 3:1 contrast against card backgrounds
- [ ] All focus outlines are clearly visible (2px minimum, adequate contrast)

### Touch Targets
- [ ] Volume slider thumbs are at least 44x44px tappable area on mobile
- [ ] Favorite heart icons have at least 44x44px tappable area
- [ ] Three-dot menu triggers have at least 44x44px tappable area
- [ ] Close (X) buttons on drawer and dialogs have at least 44x44px tappable area
- [ ] Skip-forward button on routine progress has at least 44x44px tappable area
- [ ] Drawer tab labels each have adequate tap height (at least 44px)
- [ ] Filter chips have at least 44x44px tappable area
