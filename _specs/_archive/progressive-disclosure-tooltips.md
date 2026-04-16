# Feature: Progressive Disclosure Tooltips

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec introduces `wr_tooltips_seen`
- Cross-spec dependencies: Welcome Wizard Onboarding (Spec 1 of onboarding sequence) sets `wr_onboarding_complete` in localStorage; this spec's tooltips only fire after that flag is `"true"`
- Shared constants: Tooltip IDs, messages, and target elements defined as constants
- Shared utilities: `useAuth()` from auth context
- **Onboarding sequence**: This is Spec 2 of a 3-spec onboarding sequence (Spec 1 = Welcome Wizard, Spec 2 = Progressive Disclosure Tooltips, Spec 3 = TBD)

---

## Overview

After the Welcome Wizard introduces the user to Worship Room, progressive disclosure tooltips provide gentle, contextual guidance as the user explores for the first time. Rather than a blocking guided tour or an overlay that demands attention, these are subtle floating callouts that point to a single key UI element, teach the user what it does, and disappear once acknowledged.

This approach respects the emotional context of the app — users arriving at Worship Room may be in a vulnerable state. Tooltips never interrupt, never stack, and never require complex interaction. They appear once, teach one thing, and go away. The goal is to reduce cognitive load for new users by surfacing the most important next action on each page.

---

## User Stories

- As a **logged-in user visiting the dashboard for the first time after onboarding**, I want a subtle callout pointing me to the Quick Actions widget so that I know where to start my day.
- As a **logged-in user visiting the Daily Hub for the first time**, I want a tooltip explaining the tab bar so that I discover the Pray, Journal, and Meditate options.
- As a **logged-in user visiting the Prayer Wall for the first time**, I want a tooltip pointing at the composer so that I feel invited to share.
- As a **logged-in user visiting the Music page for the first time**, I want a tooltip highlighting the ambient sounds tab so that I discover the mixer experience.
- As a **logged-in user who has already seen a tooltip**, I do not want to see it again — ever.
- As a **logged-in user who prefers reduced motion**, I want tooltips to appear and disappear instantly without animation.

---

## Requirements

### Tooltip System Architecture

- A `wr_tooltips_seen` object in localStorage tracks which tooltips have been dismissed, keyed by tooltip ID
- Format: `{ "dashboard-quick-actions": true, "daily-hub-tabs": true, ... }`
- A tooltip only renders if:
  1. User is authenticated (`isAuthenticated === true`)
  2. `wr_onboarding_complete === "true"` in localStorage (wizard has been completed or skipped)
  3. The tooltip's ID is NOT present in `wr_tooltips_seen`
  4. No other tooltip is currently visible (one-at-a-time rule)
- Only one tooltip may be visible at any time across the entire app — never stack or overlap multiple tooltips

### Tooltip Definitions

| Tooltip ID | Page | Target Element | Message | Position (Desktop) |
|-----------|------|---------------|---------|-------------------|
| `dashboard-quick-actions` | Dashboard (`/`) | Quick Actions widget | "Start here — pick any practice to begin your day" | top |
| `daily-hub-tabs` | Daily Hub (`/daily`) | Tab bar (Pray / Journal / Meditate) | "Switch between Pray, Journal, and Meditate here" | bottom |
| `prayer-wall-composer` | Prayer Wall (`/prayer-wall`) | Inline composer | "Share what's on your heart with the community" | bottom |
| `music-ambient-tab` | Music (`/music`) | Ambient Sounds tab | "Mix ambient sounds to create your perfect atmosphere" | bottom |

### Tooltip Behavior

- **Appearance delay**: Each tooltip appears 1 second after the page has fully loaded/mounted. This avoids overwhelming the user immediately and gives time for the layout to stabilize.
- **Auto-dismiss**: If the user does not manually dismiss, the tooltip auto-dismisses after 8 seconds. On auto-dismiss, the tooltip ID is marked as seen in `wr_tooltips_seen` (same as manual dismiss).
- **Manual dismiss**: Clicking the "Got it" button immediately dismisses the tooltip and marks it as seen.
- **Keyboard dismiss**: Pressing Escape while the tooltip is visible dismisses it and marks it as seen.
- **Once per tooltip**: After dismissal (manual or auto), the tooltip never appears again for that user/browser. The tooltip ID is stored in `wr_tooltips_seen`.
- **Page navigation**: If the user navigates away before the tooltip appears (within the 1-second delay), the tooltip does not follow them — it waits for their next visit to that page.

### Reusable TooltipCallout Component

A single reusable component that accepts:

- **targetRef** — React ref pointing to the DOM element the tooltip should anchor to
- **message** — The text string displayed in the tooltip body
- **tooltipId** — Unique string identifier for tracking in `wr_tooltips_seen`
- **position** — Preferred position: `top`, `bottom`, `left`, or `right` (desktop only — see mobile override below)
- **onDismiss** — Callback fired after the tooltip is dismissed (both manual and auto)

**Positioning logic:**
- The component renders via a React Portal to ensure it sits above all other content (z-index above modals, drawers, and overlays)
- Position is calculated from the target element's `getBoundingClientRect()` on mount
- The tooltip repositions on window scroll and resize events (debounced/throttled for performance)
- **Viewport clamping**: The tooltip must never overflow the viewport edges. If the calculated position would cause overflow, shift the tooltip along the secondary axis to stay within bounds (with minimum 8px margin from viewport edges). The arrow/caret adjusts to still point at the target element's center.
- **Mobile override**: On screens < 640px, tooltips always render below the target element regardless of the `position` prop. On mobile, tooltips span nearly full viewport width with horizontal padding (`mx-4`).

### localStorage Schema

- **Key**: `wr_tooltips_seen`
- **Value**: JSON object `{ [tooltipId: string]: true }`
- **Reads**: On component mount, check if the tooltip's ID exists in the object
- **Writes**: On dismiss (manual or auto), add the tooltip's ID to the object
- **`logout()` behavior**: Does NOT clear `wr_tooltips_seen` — dismissed tooltips stay dismissed across auth sessions (same pattern as `wr_onboarding_complete`)
- **localStorage unavailable**: If localStorage is blocked, treat all tooltips as unseen (they'll show on every visit). Dismiss writes silently fail. Acceptable for MVP.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — tooltips contain only hardcoded static text strings. No user input, no free-text fields, no emotional content.
- **User input involved?**: No — the only interaction is clicking "Got it" or pressing Escape.
- **AI-generated content?**: No — all tooltip messages are hardcoded constants.

---

## Auth Gating

### Logged-out users:
- **Never see any tooltips** — tooltips require `isAuthenticated === true` AND `wr_onboarding_complete === "true"`. Logged-out users see the landing page at `/` and public pages without tooltips.
- **Zero data persistence** — no reads or writes to `wr_tooltips_seen`.

### Logged-in users:
- See tooltips on their first visit to each page after completing the Welcome Wizard
- "Got it" button and Escape key dismiss the tooltip
- Auto-dismiss after 8 seconds if not manually dismissed

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Dashboard Quick Actions tooltip | Not visible (landing page shown) | Shows on first dashboard visit after wizard completion |
| Daily Hub tab bar tooltip | Not visible | Shows on first `/daily` visit after wizard completion |
| Prayer Wall composer tooltip | Not visible | Shows on first `/prayer-wall` visit after wizard completion |
| Music ambient tab tooltip | Not visible | Shows on first `/music` visit after wizard completion |
| "Got it" dismiss button | Not accessible | Dismisses tooltip, marks as seen |

---

## Auth & Persistence

### Logged-out users (demo mode):
- See public pages without tooltips — zero persistence.

### Logged-in users:
- Tooltip system reads:
  - `wr_onboarding_complete` — to confirm wizard is complete (prerequisite)
  - `wr_tooltips_seen` — to check which tooltips have been dismissed
- Tooltip system writes:
  - `wr_tooltips_seen` — adds tooltip ID on dismissal

### Route type:
- Not a separate route. Tooltips render as overlays on existing pages via Portal. They integrate into:
  - Dashboard (`/`) — protected route
  - Daily Hub (`/daily`) — public route, but tooltip only shows for authenticated users
  - Prayer Wall (`/prayer-wall`) — public route, but tooltip only shows for authenticated users
  - Music (`/music`) — public route, but tooltip only shows for authenticated users

---

## UX & Design Notes

### Visual Design

- **Tooltip container**: Frosted glass styling — `bg-white/10 backdrop-blur-md border border-white/15 rounded-xl`. White text. Drop shadow for depth (`shadow-lg`).
- **Padding**: `p-4` internal padding. Message text and dismiss button in a compact vertical layout.
- **Message text**: Inter font, `text-sm text-white`, 1-2 lines max. No markdown, no links, no icons — just plain text.
- **"Got it" dismiss button**: Small pill-shaped button — `bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-full px-3 py-1.5`. Positioned below the message text with `mt-2` spacing.
- **Arrow/caret**: A small CSS triangle (8px) pointing at the target element. The caret is on the edge of the tooltip closest to the target (e.g., bottom edge for `position="top"`, top edge for `position="bottom"`). Same background color as the tooltip (`bg-white/10`). Uses CSS `::before` or `::after` pseudo-element with border tricks, or an inline SVG triangle.
- **Fade-in animation**: Tooltip fades in over 300ms (`opacity 0→1, translateY ±4px → 0`). The small translate creates a subtle "float in" effect from the direction of the target.
- **Fade-out animation**: On dismiss, tooltip fades out over 200ms (`opacity 1→0`). After fade-out completes, the component unmounts.
- **z-index**: Above everything — higher than modals (z-50), drawers, and the AudioPill. Suggest z-[60] or z-[9999].

### Design System Recon References

- **Frosted glass pattern**: Similar to dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) but with stronger blur (`backdrop-blur-md`) and slightly higher opacity (`bg-white/10`) to ensure readability on varied backgrounds.
- **Dark page backgrounds**: Dashboard uses `bg-[#0f0a1e]`. Inner pages (Daily Hub, Prayer Wall, Music) have light `bg-neutral-bg` backgrounds — the tooltip's frosted glass must be legible on both dark and light backgrounds.
- **Primary CTA reference**: The "Got it" button is intentionally NOT primary-styled. It's a subtle, small dismiss action — not a call to action. Uses `bg-white/15` for universality across dark and light backgrounds.

**New visual patterns**: 1
1. **Floating tooltip callout with caret** — anchored to a target element via Portal, with a CSS arrow pointing at the target. New UI element not in the existing design system. Dark frosted glass must work on both dark (dashboard) and light (Daily Hub, Prayer Wall, Music) page backgrounds.

### Animations

- **Tooltip entrance**: Fade-in with subtle translate (300ms ease-out). Direction of translate matches tooltip position:
  - `position="top"`: slides up from below (`translateY: 4px → 0`)
  - `position="bottom"`: slides down from above (`translateY: -4px → 0`)
  - `position="left"`: slides left from right (`translateX: 4px → 0`)
  - `position="right"`: slides right from left (`translateX: -4px → 0`)
- **Tooltip exit**: Fade-out (200ms ease-in), reverse of entrance translate.
- **`prefers-reduced-motion`**: No animation — tooltip appears and disappears instantly. No translate, no opacity transition.

### Light vs Dark Background Handling

The tooltip must be legible on both dark backgrounds (dashboard at `/`) and light backgrounds (Daily Hub, Prayer Wall, Music). The frosted glass styling (`bg-white/10 backdrop-blur-md`) provides a consistent semi-transparent overlay that works on both. On light backgrounds, the blur creates a softly frosted effect; on dark backgrounds, it blends into the dark theme. The `border border-white/15` provides a subtle edge on both.

If contrast is insufficient on light backgrounds during implementation, the fallback is `bg-[#1a1030]/85 backdrop-blur-md` (a dark semi-transparent background that guarantees white text readability on any background).

---

## Responsive Behavior

### Mobile (< 640px)

- **Position override**: All tooltips render below their target element regardless of the `position` prop. This avoids complex left/right positioning on narrow screens.
- **Width**: Nearly full viewport width with `mx-4` (16px) horizontal margins on each side.
- **Target arrow**: Points upward from the top edge of the tooltip to the target element. Arrow is horizontally centered on the target element (clamped to stay within the tooltip bounds).
- **Touch targets**: "Got it" button has minimum 44px touch target height.
- **Viewport clamping**: If the target element is near the bottom of the screen, the tooltip may need to render above instead (only case where mobile overrides the "always below" rule — to prevent the tooltip from being cut off by the viewport bottom).
- **Scroll behavior**: If the target element scrolls out of view, the tooltip hides (without marking it as seen). It reappears when the target scrolls back into view.

### Tablet (640px–1024px)

- **Position**: Uses the `position` prop (same as desktop).
- **Width**: Max-width ~320px. Does not span full width.
- **Viewport clamping**: Same logic as desktop — shift along secondary axis if needed.

### Desktop (> 1024px)

- **Position**: Uses the `position` prop. Tooltip floats adjacent to the target element on the specified side.
- **Width**: Max-width ~300px. Auto-width based on content, up to the max.
- **Arrow**: Points at the center of the target element's edge closest to the tooltip.
- **Offset**: 12px gap between the target element and the tooltip edge (not touching).

---

## Edge Cases

- **Wizard not complete**: If `wr_onboarding_complete` is not `"true"`, no tooltips render — ever. This prevents tooltips from appearing before the user has been introduced to the app via the wizard.
- **Target element not mounted**: If the target ref is null or the target element is not in the DOM when the tooltip tries to render, the tooltip does not render. It does not retry — the user must revisit the page. (The target element may not exist if the page hasn't loaded fully or if the component rendering order differs.)
- **Target element hidden or zero-size**: If the target element's `getBoundingClientRect()` returns zero width/height, the tooltip does not render.
- **Multiple tooltips eligible on the same page**: Only one tooltip fires per page visit. Since each page has at most one defined tooltip, this shouldn't conflict. But the system enforces one-at-a-time globally as a safety measure.
- **Page navigated before 1-second delay**: If the user leaves the page within the 1-second appearance delay, the tooltip timer is cancelled and the tooltip does not render. It is NOT marked as seen — the next visit triggers the delay again.
- **Rapid page switching**: Tooltip appearance timers are cleaned up on component unmount to prevent orphaned tooltips.
- **Logged out while tooltip is visible**: If the user logs out (via dev tools or future logout button) while a tooltip is visible, the tooltip should unmount as part of the auth state change. The tooltip may or may not have been marked as seen depending on timing.
- **Browser refresh**: Tooltip visibility state lives in React state. A refresh resets the 1-second delay timer. But `wr_tooltips_seen` persists in localStorage — already-dismissed tooltips stay dismissed.
- **`wr_tooltips_seen` corrupted or not parseable**: If `JSON.parse()` fails, treat as empty object (all tooltips unseen). Overwrite with a fresh object on next dismiss.
- **Very long pages where target is below the fold**: The tooltip only renders when its target element is in the viewport (visible). If the target is below the fold, the tooltip waits until the user scrolls to it, then starts the 1-second delay.
- **AudioPill/AudioDrawer overlap**: The tooltip's high z-index ensures it renders above the AudioPill and AudioDrawer. No special handling needed beyond z-index.
- **Resize during tooltip visibility**: Tooltip repositions on resize. If a resize causes the tooltip to not fit (e.g., window shrunk dramatically), viewport clamping keeps it visible.

---

## Out of Scope

- **Backend API persistence** — Phase 3 (tooltip seen state in localStorage only)
- **Real authentication (JWT, Spring Security)** — Phase 3 (uses simulated auth from `AuthProvider`)
- **Tooltips for features not yet built** — No tooltips for Settings, Profile, Friends, Insights, or other Phase 2.75 pages. Tooltips are added for those pages when those features ship.
- **Multi-step tooltip sequences** — The system shows one tooltip per page, not a chain. No "Next: learn about X" progression.
- **Tooltip content customization** — Messages are hardcoded. No A/B testing, no personalization, no dynamic content.
- **Animated pointing arrows or pulsing highlights on target elements** — The target element itself is not visually modified (no glow, no pulse, no highlight ring). Only the floating tooltip and its caret point at the target.
- **Analytics on tooltip interaction** — No tracking of dismiss rate, time-to-dismiss, or auto-dismiss frequency. Not in MVP.
- **Tooltip for the mood check-in** — The mood check-in is self-explanatory and has its own full-screen UI with instructions. No tooltip needed.
- **Re-showing dismissed tooltips** — Once dismissed, gone forever. No reset mechanism.
- **Spec 3 of the onboarding sequence** — Separate spec (TBD).
- **Multi-language support** — Not in MVP.
- **Rich tooltip content** — No images, icons, illustrations, or multi-step content inside tooltips. Plain text + dismiss button only.

---

## Acceptance Criteria

### Prerequisites & Lifecycle

- [ ] Tooltips never render when `wr_onboarding_complete` is not `"true"` in localStorage
- [ ] Tooltips never render when the user is not authenticated (`isAuthenticated === false`)
- [ ] Only one tooltip is visible at a time across the entire app
- [ ] `logout()` does NOT clear `wr_tooltips_seen` — dismissed tooltips stay dismissed after re-login

### Dashboard Quick Actions Tooltip

- [ ] On the user's first visit to the dashboard after wizard completion, a tooltip appears pointing at the Quick Actions widget
- [ ] Tooltip message reads: "Start here — pick any practice to begin your day"
- [ ] Tooltip appears after a 1-second delay, not immediately on page load
- [ ] After dismissing, the tooltip never appears again on subsequent dashboard visits
- [ ] The tooltip ID `dashboard-quick-actions` is stored in `wr_tooltips_seen` on dismiss

### Daily Hub Tab Bar Tooltip

- [ ] On the user's first visit to `/daily` after wizard completion, a tooltip appears pointing at the tab bar
- [ ] Tooltip message reads: "Switch between Pray, Journal, and Meditate here"
- [ ] Tooltip appears below the tab bar on all screen sizes
- [ ] After dismissing, the tooltip never appears again on subsequent `/daily` visits

### Prayer Wall Composer Tooltip

- [ ] On the user's first visit to `/prayer-wall` after wizard completion, a tooltip appears pointing at the inline composer
- [ ] Tooltip message reads: "Share what's on your heart with the community"
- [ ] After dismissing, the tooltip never appears again

### Music Ambient Tab Tooltip

- [ ] On the user's first visit to `/music` after wizard completion, a tooltip appears pointing at the ambient sounds tab
- [ ] Tooltip message reads: "Mix ambient sounds to create your perfect atmosphere"
- [ ] After dismissing, the tooltip never appears again

### Dismiss Behavior

- [ ] Clicking "Got it" immediately dismisses the tooltip with a fade-out animation
- [ ] Pressing Escape while a tooltip is visible dismisses it
- [ ] Tooltip auto-dismisses after 8 seconds if not manually dismissed
- [ ] All three dismiss methods (click, Escape, auto) mark the tooltip as seen in `wr_tooltips_seen`
- [ ] After dismiss, the `onDismiss` callback fires

### TooltipCallout Component

- [ ] Renders via a React Portal above all other content
- [ ] Positions correctly relative to the target element using `getBoundingClientRect()`
- [ ] Repositions on window scroll and resize
- [ ] Never overflows the viewport — clamped to stay within screen bounds with minimum 8px margin
- [ ] Arrow/caret points at the target element from the tooltip edge
- [ ] Supports `position` prop: `top`, `bottom`, `left`, `right`

### Responsive Layout

- [ ] Mobile (< 640px): Tooltip renders below the target element regardless of `position` prop
- [ ] Mobile (< 640px): Tooltip spans nearly full viewport width with `mx-4` margins
- [ ] Mobile (< 640px): "Got it" button has minimum 44px touch target
- [ ] Tablet (640-1024px): Tooltip uses `position` prop, max-width ~320px
- [ ] Desktop (> 1024px): Tooltip uses `position` prop, max-width ~300px, 12px gap from target

### Visual Design

- [ ] Tooltip uses frosted glass styling: `bg-white/10 backdrop-blur-md border border-white/15 rounded-xl`
- [ ] Tooltip text is white, Inter font, `text-sm`
- [ ] "Got it" button is a small pill: `bg-white/15 text-white text-xs rounded-full`
- [ ] Arrow/caret (8px) points at the target element from the closest tooltip edge
- [ ] Tooltip has `shadow-lg` drop shadow
- [ ] Tooltip is legible on both dark backgrounds (dashboard) and light backgrounds (Daily Hub, Prayer Wall, Music)

### Animation

- [ ] Tooltip fades in over 300ms with a subtle 4px translate from the target direction
- [ ] Tooltip fades out over 200ms on dismiss
- [ ] `prefers-reduced-motion`: tooltip appears and disappears instantly with no animation

### Accessibility

- [ ] Tooltip has `role="tooltip"` attribute
- [ ] Target element receives `aria-describedby` pointing to the tooltip's ID
- [ ] "Got it" button is auto-focused when the tooltip appears
- [ ] Escape key dismisses the tooltip
- [ ] Tooltip content is announced via `aria-live="polite"` region
- [ ] All interactive elements have visible focus rings
- [ ] "Got it" button has minimum 44px touch target on mobile

### Visual Verification

- [ ] Frosted glass tooltip is visible and readable against the dashboard's dark `bg-[#0f0a1e]` background
- [ ] Frosted glass tooltip is visible and readable against the Daily Hub's light `bg-neutral-bg` background
- [ ] Arrow/caret is visually connected to the tooltip and points at the correct target element
- [ ] Tooltip does not overlap or obscure the target element it's pointing at
- [ ] On mobile (375px), tooltip spans nearly full width with visible margins on both sides
- [ ] Dot stepper from wizard (Spec 1) is NOT present — tooltips are independent, not a sequential tour
