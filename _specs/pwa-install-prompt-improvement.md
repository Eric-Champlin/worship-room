# Feature: PWA Install Prompt Improvement

**Master Plan Reference:** N/A -- standalone feature. Supersedes the install prompt section of `_specs/pwa-content-caching-install.md` (Requirements 7-9). All other PWA specs (service worker, offline, content caching) remain unaffected.

---

## Overview

The current PWA install prompt is a bottom-overlay banner that covers page content -- it feels like a cookie consent bar, not a warm invitation. For an app built around emotional healing and spiritual sanctuary, every UI element should respect the user's space. This spec replaces the intrusive bottom overlay with a gentler three-touch approach: a one-time top notification bar on the 3rd visit that auto-dismisses, a permanent "Install App" option in Settings for users who want to install later, and a one-time inline dashboard card for a second gentle nudge.

The browser already handles installed users correctly -- `beforeinstallprompt` doesn't fire when the PWA is installed, so no install UI appears for installed users. The existing `wr_install_dismissed` and `wr_visit_count` localStorage keys continue to control timing and dismissal. This spec changes only the presentation and persistence behavior.

---

## User Stories

- As a **logged-out visitor** on my 3rd visit, I want to see a brief, non-intrusive suggestion to install the app so that I feel invited rather than pressured.
- As a **logged-in user**, I want to find an "Install App" option in Settings so that I can install later on my own terms if I dismissed the initial banner.
- As a **logged-in user**, I want to see a gentle one-time install card on my dashboard so that I have a second chance to install without being nagged repeatedly.

---

## Requirements

### 1. Redesign the Install Banner (Top Notification Bar)

Replace the existing bottom-fixed overlay banner with a top notification bar that sits in the page flow below the navbar (and below the seasonal banner if present). The banner pushes content down rather than covering it.

**Banner content:**
- Small app icon (24px) + "Worship Room is better as an app" message + compact "Install" button + dismiss X
- Single horizontal row, compact height (~44-48px)

**Display conditions (ALL must be true):**
- Browser has fired `beforeinstallprompt` event (app is installable)
- App is NOT in standalone/installed mode
- `wr_install_dismissed` is NOT set (banner has never been dismissed)
- `wr_visit_count` >= 3 (3rd visit or later)

**Styling:**
- Same max-width as the navbar pill and seasonal banner (`max-w-6xl mx-auto`)
- Glassmorphic treatment: `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl`
- Message: `text-white/70 text-sm`
- Install button: `bg-primary text-white text-sm rounded-full px-4 py-1.5` (compact purple pill)
- Dismiss X: `text-white/40 hover:text-white/60` with 44px touch target (`h-11 w-11`)
- Spacing: `mt-2` below the seasonal banner (or below the navbar if no seasonal banner)

**Position in layout:**
- Render in the same layout area as the seasonal banner (inside `<nav>` after the seasonal banner, or in the shared layout area -- whichever is consistent with how the seasonal banner is currently placed)

**Animation:**
- Slide down (200ms ease-out) when appearing
- Slide up (200ms ease-in) when dismissing

**Dismissal behavior:**
- After showing once and being dismissed (manually or auto), the banner NEVER shows again on any page
- Changed from previous spec: no 7-day cooldown. Dismissal is permanent. Users who want to install later can find the option in Settings.

### 2. Auto-Dismiss Behavior

The banner auto-dismisses after 10 seconds if the user doesn't interact.

- Auto-dismiss sets the same `wr_install_dismissed` localStorage key as manual dismiss
- A thin progress line at the bottom of the banner shrinks from full width to zero over 10 seconds, giving visual feedback that the banner will auto-dismiss (implement if straightforward, skip if complex)
- Tapping "Install" before auto-dismiss fires the browser's native install prompt and dismisses the banner
- Tapping X before auto-dismiss dismisses the banner immediately
- Both manual dismiss and auto-dismiss are permanent (no cooldown, no reappearance)

### 3. Settings Page Install Option

After the banner is dismissed (or for users who never saw it), add an "Install App" row in the Settings page.

**Display conditions:**
- `beforeinstallprompt` event has been captured (app is installable)
- App is NOT already installed (standalone mode check)

**Row content:**
- Download/Smartphone icon + "Install Worship Room" label + "Add to your home screen for the full experience" description
- Tapping the row triggers the browser's native install prompt

**After successful installation:**
- Row either hides entirely or shows "App Installed" confirmation in green as a non-interactive indicator

**Placement:** In the "Account" section or a new "App" section of the Settings page.

### 4. Dashboard Inline Card (One-Time)

After the banner has been dismissed, show a subtle inline card on the dashboard ONE TIME to give the user a second chance to install.

**Display conditions (ALL must be true):**
- `wr_install_dismissed` is set (banner was dismissed)
- `wr_install_dashboard_shown` is NOT set (card hasn't been shown yet)
- `beforeinstallprompt` event is available (app is installable)
- App is not already installed

**Card content:**
- "Take Worship Room with you" heading + "Install the app for a faster, fuller experience." description
- "Install" button + "Not now" text link

**Styling:**
- Same frosted glass as other dashboard cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4`
- Lower visual priority -- placed at the BOTTOM of the widget grid (last widget)
- "Take Worship Room with you" -- `text-white text-base font-medium`
- Description -- `text-white/60 text-sm`
- Install button: `bg-primary text-white text-sm rounded-full px-4 py-2`
- "Not now": `text-white/40 hover:text-white/60 text-sm`

**After interaction:**
- "Install" tapped: trigger browser install prompt, set `wr_install_dashboard_shown`, remove card
- "Not now" tapped: set `wr_install_dashboard_shown`, remove card
- Once `wr_install_dashboard_shown` is set, the card never appears again

### 5. Shared Install Prompt Context

The `beforeinstallprompt` event must be accessible by three consumers: the install banner, the Settings page install row, and the dashboard install card.

The context/hook should:
1. Listen for `beforeinstallprompt` on `window` early (on mount)
2. Store the deferred prompt
3. Expose: `isInstallable` (prompt captured), `isInstalled` (standalone mode), `promptInstall()` (triggers native prompt), dismissal state
4. `isInstalled` checks `window.matchMedia('(display-mode: standalone)').matches`

If the prompt event is currently captured only inside the install banner component, it needs to be lifted to a shared context or hook so all three consumers can access it.

### 6. Visit Count Threshold Change

The install banner's visit count threshold changes from >= 2 (current) to >= 3 (new). The `wr_visit_count` key and increment logic remain unchanged.

### 7. Landing Page + Seasonal Banner Coexistence

The banner can appear on the landing page (logged-out) if it's the user's 3rd visit. When both the seasonal banner and install banner would show, the install banner renders below the seasonal banner with `mt-2` spacing.

If both banners together create too much visual noise (implementation judgment call), prioritize the seasonal banner and defer the install banner to the next page navigation.

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View install banner | Shown on 3rd visit (any page) | Shown on 3rd visit (any page) | N/A |
| Tap "Install" on banner | Triggers native install prompt | Triggers native install prompt | N/A |
| Dismiss banner | Permanently dismissed | Permanently dismissed | N/A |
| View Settings install row | N/A (Settings is auth-gated) | Shown when installable + not installed | N/A |
| Tap Settings install row | N/A | Triggers native install prompt | N/A |
| View dashboard install card | N/A (Dashboard is auth-gated) | Shown once after banner dismissed | N/A |
| Tap "Install" on card | N/A | Triggers native install prompt | N/A |
| Tap "Not now" on card | N/A | Permanently hides card | N/A |

**No new auth gating required.** The banner works for both logged-out and logged-in users. The Settings row and dashboard card are on already-auth-gated pages.

---

## Responsive Behavior

| Breakpoint | Install Banner | Settings Row | Dashboard Card |
|-----------|---------------|-------------|---------------|
| Mobile (< 640px) | Full-width within `max-w-6xl` container. Icon + text + Install + X in single row. Install and X buttons >= 44px touch targets. | Full-width row in settings list. | Full-width card at bottom of single-column widget layout. |
| Tablet (640-1024px) | Centered within `max-w-6xl` container. Comfortable single row. | Same as mobile. | Card at bottom of widget grid. |
| Desktop (> 1024px) | Centered within `max-w-6xl` container. Plenty of space for single row. | Same as mobile. | Card at bottom of 2-column (60%/40%) dashboard grid, spanning full width or in the narrower column. |

**Mobile-specific notes:**
- Banner Install button and dismiss X must both be >= 44px touch targets
- Dashboard card Install and "Not now" buttons must be >= 44px touch targets
- On very narrow screens (320px), the banner message may need to truncate or the layout should not wrap awkwardly

---

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out (demo mode):** Banner appears and can be dismissed. Dismissal persists via localStorage (`wr_install_dismissed`). Visit count persists via localStorage (`wr_visit_count`). Zero server-side persistence.
- **Logged-in:** Same localStorage keys plus `wr_install_dashboard_shown` for the one-time dashboard card. Settings install row reads from the shared install prompt context (no persistence needed -- it's derived from browser state).
- **Route type:** No new routes. Install banner renders in the global layout. Dashboard card renders on the existing protected dashboard. Settings row renders on the existing protected Settings page.

**localStorage keys:**

| Key | Type | Description | Change |
|-----|------|-------------|--------|
| `wr_install_dismissed` | timestamp (number) | Banner dismissal timestamp | Existing -- no key change. Behavior change: dismissal is now permanent (no 7-day cooldown). Set by manual dismiss, auto-dismiss, and successful install. |
| `wr_visit_count` | number | App visit count | Existing -- no change. Threshold for banner display changes from >= 2 to >= 3. |
| `wr_install_dashboard_shown` | "true" | Dashboard install card shown/dismissed | NEW -- set after install card interaction (Install tap or "Not now" tap). |

---

## Completion & Navigation

N/A -- standalone infrastructure feature. Not part of the Daily Hub tabbed experience.

---

## Design Notes

- **Banner glassmorphic treatment** matches the existing seasonal banner and navbar style: `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl`. Reference the Navbar Glassmorphic Pattern from the design system recon.
- **Dashboard card** uses the existing `DashboardCard` frosted glass pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4`. This is the same pattern used by all dashboard widgets.
- **Install button** uses the primary purple pill style (`bg-primary text-white rounded-full`) already used throughout the app for CTAs.
- **Text opacities** follow WCAG AA standards from the design system: `text-white/70` for primary text, `text-white/60` for secondary, `text-white/40` for decorative/dismiss elements.
- **Settings row** should match the existing Settings page row pattern (icon + label + description layout used by other settings items).
- **Animation** uses simple CSS transitions (200ms ease) consistent with the app's gentle animation philosophy -- no jarring movements.
- **Auto-dismiss progress line** (if implemented): thin bar (`h-0.5`) at the bottom of the banner using `bg-white/20`, shrinking via CSS animation over 10 seconds. This is a **new pattern** not captured in the design system recon.

---

## Out of Scope

- PWA service worker changes (caching strategy, precache manifest)
- Offline fallback page changes
- App icon or splash screen changes
- iOS-specific install instructions (iOS doesn't support `beforeinstallprompt` -- Safari has its own "Add to Home Screen" flow). The existing iOS banner from the prior spec is unaffected by this redesign.
- Push notification prompt (Phase 3)
- Install analytics (tracking install conversion rate)
- A/B testing different install prompt copy or timing
- Changes to the offline detection, content caching, or navbar offline indicator (these remain as specified in `pwa-content-caching-install.md`)

---

## Acceptance Criteria

### Banner Redesign
- [ ] Install banner renders as a top notification bar below the navbar (not a bottom-fixed overlay)
- [ ] Banner sits in the page flow and pushes content down (not fixed/overlaying)
- [ ] Banner uses glassmorphic styling: `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl`
- [ ] Banner width matches the navbar pill width (`max-w-6xl mx-auto`)
- [ ] Banner contains: app icon (24px) + "Worship Room is better as an app" message + Install button + dismiss X
- [ ] Banner appears on the 3rd visit (`wr_visit_count >= 3`) when `beforeinstallprompt` is available
- [ ] Banner does NOT appear on 1st or 2nd visit
- [ ] "Install" button triggers the browser's native install prompt via `deferredPrompt.prompt()`
- [ ] Dismiss X hides the banner and sets `wr_install_dismissed` in localStorage
- [ ] Banner auto-dismisses after 10 seconds, setting `wr_install_dismissed`
- [ ] Banner NEVER shows again after dismissal (no 7-day cooldown -- permanent dismissal)
- [ ] Banner does NOT appear if the app is already installed as a PWA (standalone mode)
- [ ] Banner does NOT appear if `wr_install_dismissed` is set
- [ ] Banner animation: slides down (200ms) when appearing, slides up (200ms) when dismissing
- [ ] On mobile (375px): banner renders correctly, Install button and X are tappable (>= 44px touch targets)
- [ ] On desktop (1440px): banner renders correctly, centered within `max-w-6xl`

### Auto-Dismiss
- [ ] Banner auto-dismisses after exactly 10 seconds if no user interaction
- [ ] Auto-dismiss sets `wr_install_dismissed` in localStorage (same as manual dismiss)
- [ ] Timer resets/cancels if user taps Install or X before 10 seconds
- [ ] Optional: thin progress line at bottom of banner shrinks over 10 seconds

### Settings Integration
- [ ] "Install App" row appears in Settings when the app is installable (`beforeinstallprompt` captured) and not installed (not standalone mode)
- [ ] Row shows download icon + "Install Worship Room" + "Add to your home screen for the full experience"
- [ ] Tapping the row triggers the browser's native install prompt
- [ ] Row is hidden (or shows "App Installed" in green) when the app is already installed
- [ ] Row is hidden when `beforeinstallprompt` has not fired (app not installable)

### Dashboard Card
- [ ] Install card appears on the dashboard ONCE after `wr_install_dismissed` is set
- [ ] Card does NOT appear if `wr_install_dashboard_shown` is set
- [ ] Card does NOT appear if the app is already installed
- [ ] Card does NOT appear if `beforeinstallprompt` has not fired
- [ ] Card renders at the bottom of the dashboard widget grid (last widget)
- [ ] Card shows "Take Worship Room with you" heading + description + Install button + "Not now" link
- [ ] Card uses dashboard frosted glass styling: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4`
- [ ] "Install" button triggers browser install prompt and sets `wr_install_dashboard_shown`
- [ ] "Not now" sets `wr_install_dashboard_shown` and removes the card
- [ ] Card never reappears after either interaction

### Shared Context
- [ ] `beforeinstallprompt` event is captured globally (not just inside the banner component)
- [ ] All three consumers (banner, settings row, dashboard card) can access the deferred prompt
- [ ] `isInstalled` correctly detects standalone PWA mode via `matchMedia`
- [ ] `promptInstall()` triggers the native install prompt from any consumer

### Coexistence with Seasonal Banner
- [ ] If both seasonal banner and install banner would show, they render cleanly together with appropriate spacing (`mt-2`)
- [ ] Install banner appears below the seasonal banner (not above, not overlapping)

### General
- [ ] No install UI appears when the app is already installed as a PWA
- [ ] All existing PWA functionality is preserved (service worker, offline fallback, precaching)
- [ ] All existing tests pass after changes
- [ ] `pnpm build` succeeds
