# Feature: PWA Content Caching & Install Prompt

**Prerequisite:** Spec 31 — PWA Manifest, Service Worker & Offline Fallback (`_specs/pwa-manifest-service-worker.md`). This spec assumes the manifest, service worker (via vite-plugin-pwa), offline fallback page, and update toast are already implemented.

---

## Overview

Worship Room users often reach for the app in low-connectivity moments — bedtime with ambient sounds, morning devotionals on a commute, Bible reading in a quiet room with patchy Wi-Fi. Spec 31 laid the PWA foundation (manifest, service worker, offline fallback). This spec completes the PWA story with two capabilities: **intelligent content caching** that makes the user's most-used content available offline, and a **user-facing install prompt** that gently encourages home screen installation.

Content caching focuses on the three content types most valuable offline: ambient sounds (sleep/relaxation use case), Bible chapters (reading use case), and devotionals (daily routine use case). Spotify embeds are explicitly excluded — they require a live connection and would display errors if cached. An offline detection system (`useOnlineStatus` hook) allows every network-dependent component to gracefully degrade instead of showing broken UI.

The install prompt uses the `beforeinstallprompt` browser event to offer a polished, non-intrusive invitation to install Worship Room. It respects the user's context: it waits until the second visit, respects dismissals for 7 days, detects standalone mode, and provides iOS-specific instructions where the standard API isn't available.

---

## User Stories

- As a **logged-out visitor**, I want ambient sounds I've played before to work offline so that my bedtime routine isn't interrupted by connectivity issues.
- As a **logged-out visitor**, I want Bible chapters I've recently read to be available offline so that I can continue reading during my commute or in areas with poor signal.
- As a **logged-out visitor**, I want to see a clear message instead of broken UI when a feature needs internet so that I understand what's happening and what still works.
- As a **logged-out visitor**, I want to be invited to install Worship Room on my home screen after I've had a chance to explore the app so that the installation feels natural, not pushy.
- As a **logged-in user**, I want my dashboard to render fully from cached localStorage data when offline so that I can still see my streak, badges, and mood history.
- As a **logged-in user**, I want a subtle offline indicator in the navbar so that I know some features may be limited without feeling alarmed.

---

## Requirements

### 1. Content Caching — Ambient Sounds

Extend the service worker's runtime caching to cache ambient sound audio files when a user plays them.

- **Cache name:** `wr-audio-cache`
- **Trigger:** When a user plays an ambient sound, the audio file fetch is intercepted by the service worker and cached
- **Max entries:** 10 sounds (LRU eviction — when the 11th sound is added, the least recently used entry is evicted)
- **Scope:** Only ambient sound MP3 files (files matching the ambient audio URL pattern)
- **Benefit:** After playing a sound once, it's available offline. A user's favorite ambient mix works without internet.
- **No manual "download" button** — caching is automatic and transparent to the user

### 2. Content Caching — Bible Chapters

Cache Bible chapter content when a user reads it.

- **Cache name:** `wr-bible-cache`
- **Trigger:** When a user navigates to a Bible chapter, the chapter content response is cached
- **Max entries:** 50 chapters (LRU eviction)
- **Scope:** Bible chapter content requests (matching the Bible reader data pattern)
- **Benefit:** Recently-read chapters are available for offline Bible reading

### 3. Content Caching — Devotional Content

Cache devotional content for offline access.

- **Cache name:** `wr-devotional-cache`
- **Trigger:** When a user views the daily devotional, cache the current day's content and the previous 3 days
- **Max entries:** 4 days of devotional content
- **Scope:** Devotional content requests
- **Benefit:** Users can catch up on recent devotionals offline

### 4. Spotify Embed Handling (Offline)

Spotify embeds require a live Spotify connection. Cached iframes would display errors.

- **When offline:** Hide all Spotify embed sections entirely
- **Show replacement message:** "Spotify playlists available when online" — muted text, no broken iframe
- **When back online:** Spotify embeds reappear automatically (reactive to online status)

### 5. Offline Detection Utility — `useOnlineStatus` Hook

A shared React hook that provides reactive online/offline status.

- **Wraps:** `navigator.onLine` property with `online` and `offline` window event listeners
- **Returns:** `{ isOnline: boolean }`
- **Reactive:** Component re-renders when connectivity changes
- **Location:** Shared utility in `hooks/` directory
- **Used by:** Any component that requires network access (Spotify embeds, Google Places for local support, sharing features, prayer wall posting)

### 6. Offline Message Component

A consistent, reusable UI element for components that need network access.

- **Visual:** Small muted banner — "You're offline — this feature needs an internet connection"
- **Icon:** WiFiOff icon (from Lucide icons) in `text-white/40` (on dark backgrounds) or `text-text-light` (on light backgrounds)
- **Tone:** Gentle and informational, not alarming. Consistent with the app's compassionate tone.
- **Placement:** Inline where the network-dependent content would normally appear (replaces the content, doesn't overlay)

### 7. Install Prompt Banner — Standard (Chrome/Android/Edge)

A bottom-of-screen banner that appears when the browser fires the `beforeinstallprompt` event.

**Display conditions (ALL must be true):**
- Browser has fired `beforeinstallprompt` event
- User is NOT already in standalone/installed mode (`window.matchMedia('(display-mode: standalone)').matches` is false)
- User has NOT dismissed the banner in the last 7 days (check `wr_install_dismissed` localStorage key)
- This is NOT the user's first visit (check `wr_visit_count` localStorage — must be >= 2)

**Banner layout:**
- Fixed position at bottom of screen, above the AudioPill if present
- Frosted glass styling: `bg-white/10 backdrop-blur-md border-t border-white/15`
- Left side: Worship Room icon (32px) + text stack: "Install Worship Room" (bold, white) / "Get the full app experience" (text-white/50)
- Right side: "Install" button (primary style, small) + X dismiss button
- Full-width on mobile, max-width centered on desktop

**Install action:**
- Tapping "Install" calls the deferred `beforeinstallprompt` event's `prompt()` method
- Track the user's choice from the `userChoice` promise
- If user accepts: show celebration toast — "Worship Room installed! Find it on your home screen."
- After install: banner never appears again (standalone mode detection)

**Dismiss action:**
- Tapping X stores current timestamp in `wr_install_dismissed` localStorage key
- Banner does not reappear for 7 days (compare stored timestamp to current time)

### 8. Install Prompt Banner — iOS Safari

On iOS Safari, `beforeinstallprompt` does not fire. Detect iOS Safari and show manual instructions instead.

**iOS detection:** User agent check for iOS Safari (iPhone/iPad + Safari, not Chrome/Firefox on iOS)

**Banner content:**
- Same frosted glass styling and position as the standard banner
- Message: "Install Worship Room: tap the Share button below, then 'Add to Home Screen'"
- Small inline illustration/icon showing the iOS share icon (square with up arrow)
- Same dismiss logic: 7-day cooldown via `wr_install_dismissed`
- Same visit count requirement: only appears on second+ visit
- Same standalone check: never appears if already installed

### 9. Visit Counting

Track visit count to delay the install prompt until the second visit.

- **localStorage key:** `wr_visit_count` (number)
- **Increment:** On each app load (once per session/page load)
- **Used by:** Install prompt banner — only shows when `wr_visit_count >= 2`

### 10. Offline Dashboard Enhancements

When offline, the dashboard should still render fully from cached localStorage data.

**Fully functional offline (reads from localStorage):**
- Dashboard: all widgets (mood chart, streak, faith points, badges, activity checklist, quick actions)
- Journal writing: drafts save to localStorage
- Mood check-in: saves to localStorage
- Bible reading: cached chapters only (show message for uncached chapters)
- Ambient sounds: cached sounds only (show message for uncached sounds)
- Meditation exercises: all content is local/static

**Degraded offline (partial functionality):**
- Prayer Wall: can read cached feed (if in runtime cache) but cannot post new prayers — show inline message on composer
- Local Support: no search functionality (requires Google Places API) — show offline message on search
- Spotify embeds: hidden entirely (see Requirement 4)
- Sharing: copy-to-clipboard works, social share buttons hidden or disabled

### 11. Navbar Offline Indicator

When offline, show a subtle indicator in the navbar.

- **Icon:** Small WiFiOff icon (Lucide) next to the user's avatar (logged-in) or in the nav area (logged-out)
- **Tooltip:** "You're offline — some features are limited"
- **Styling:** Muted opacity (`text-white/40`), small size (~16px), non-intrusive
- **Reactive:** Appears/disappears as connectivity changes

---

## Auth Gating

**No auth gating.** All PWA features in this spec work identically for logged-out and logged-in users. The install prompt and offline detection are purely client-side with no auth dependency.

| Element | Logged-Out | Logged-In |
|---------|-----------|-----------|
| Ambient sound caching | Yes — automatic when played | Yes — automatic when played |
| Bible chapter caching | Yes — automatic when read | Yes — automatic when read |
| Devotional caching | Yes — automatic when viewed | Yes — automatic when viewed |
| useOnlineStatus hook | Yes — available everywhere | Yes — available everywhere |
| Offline message banners | Yes — shown when offline | Yes — shown when offline |
| Install prompt banner | Yes — after 2nd visit | Yes — after 2nd visit |
| iOS install instructions | Yes — after 2nd visit | Yes — after 2nd visit |
| Navbar offline indicator | Yes — shown in nav area | Yes — shown next to avatar |
| Dashboard offline rendering | N/A (logged-out sees landing) | Yes — all widgets from localStorage |
| Offline journal drafts | Yes — saves to localStorage | Yes — saves to localStorage |
| Offline mood check-in | N/A (logged-out sees landing) | Yes — saves to localStorage |

---

## AI Safety Considerations

- **Crisis detection needed?** No — this spec has no user text input
- **User input involved?** No — all interactions are install prompts, offline indicators, and cache management
- **AI-generated content?** No
- **No `dangerouslySetInnerHTML` usage**
- **No database writes**

---

## Auth & Persistence

- **Logged-out (demo mode):** Full PWA functionality. Service worker caching is browser-level, not user-level. Zero user data persistence beyond existing localStorage patterns.
- **Logged-in:** Identical caching behavior. Dashboard offline rendering uses existing localStorage data (mood entries, streak, faith points, badges are all already in localStorage from Phase 2.75).
- **Route type:** No new routes. All features are infrastructure-level (service worker caching), shared hooks, and UI components rendered within existing routes.
- **New localStorage keys:**
  - `wr_install_dismissed` — timestamp of last install banner dismissal (number, epoch ms)
  - `wr_visit_count` — number of app visits (number, incremented once per session)

---

## Responsive Behavior

### Install Prompt Banner
- **Mobile (< 640px):** Full-width, fixed to bottom. Content stacks if needed (icon + text on one line, buttons on next). Safe area padding for notched devices (`padding-bottom: env(safe-area-inset-bottom)`). Positioned above AudioPill if present.
- **Tablet (640-1024px):** Max-width ~560px, centered at bottom. Icon, text, and buttons all on one row.
- **Desktop (> 1024px):** Max-width ~560px, centered at bottom. Same single-row layout as tablet.

### iOS Install Instructions Banner
- Same responsive behavior as the standard install prompt banner.

### Offline Message Banners (inline)
- **All breakpoints:** Full-width within their parent container. Text wraps naturally. Icon and text on same line at all sizes. Padding: 12px on mobile, 16px on desktop.

### Navbar Offline Indicator
- **Mobile (< 640px):** WiFiOff icon in the hamburger menu header area or next to the menu button.
- **Tablet/Desktop (> 640px):** WiFiOff icon next to avatar/nav items, with tooltip on hover.

---

## UX & Design Notes

- **Tone:** All offline messaging should be gentle and reassuring. Users may be in vulnerable emotional states. "You're offline" should feel like a helpful note, not an error. Never use alarming language like "ERROR" or "FAILED."
- **Colors:** Offline messages on dark backgrounds use `text-white/40` for the icon and `text-white/60` for the message text. On light backgrounds (`bg-neutral-bg`), use `text-text-light` for both.
- **Install banner:** Uses the same frosted glass aesthetic as the AudioPill and update toast from Spec 31 — `bg-white/10 backdrop-blur-md border-t border-white/15`. This creates visual consistency across all bottom-fixed UI elements.
- **Celebration toast:** When the user installs, use the existing toast system with a success/celebration variant. Match the warm, encouraging tone of the app.
- **Typography:** Install banner heading in Inter semi-bold (600), subtext in Inter regular (400). Offline messages in Inter regular, smaller size (~0.875rem).
- **Animations:** Install banner slides up from bottom (gentle, 200-300ms). Offline indicators use a simple fade-in. No jarring transitions.
- **Z-index layering:** Install banner should be above page content but below modals. If AudioPill is present, install banner sits above it (AudioPill z-index + 1 or use a defined z-index scale).

**Design system recon reference:** `_plans/recon/design-system.md` captures the frosted glass patterns, dark background values (#0f0a1e, #0D0620), and primary purple (#6D28D9) used throughout. The AudioPill's dark overlay aesthetic (`rgba(15, 10, 30, 0.85)`) is the reference for the install banner's frosted glass treatment.

---

## Out of Scope

- **Background sync** — queuing offline actions (new prayers, journal saves) for later sync when connectivity returns is a future enhancement
- **IndexedDB** — using IndexedDB for structured offline data storage is a future enhancement; this spec uses Cache API (service worker) and localStorage only
- **Push notifications** — separate feature (Phase 2.95 spec)
- **Offline-first data layer** — full offline-first architecture with conflict resolution is a future enhancement
- **Manual download/save buttons** — no "save for offline" UI; caching is automatic and transparent
- **Cache size indicators** — no UI showing how much storage is used or how many items are cached
- **Selective cache clearing** — no UI for users to manage their offline cache
- **Backend changes** — no API modifications needed; all caching is client-side
- **Native app features** — this is web PWA only
- **Service worker changes beyond runtime caching rules** — the core service worker setup (precaching, registration, update mechanism) is Spec 31's scope; this spec only adds runtime caching strategies and client-side hooks/components

---

## Acceptance Criteria

### Content Caching — Ambient Sounds
- [ ] When a user plays an ambient sound, its audio file is cached in a `wr-audio-cache` cache (verifiable in browser DevTools > Application > Cache Storage)
- [ ] Maximum 10 sounds are stored in `wr-audio-cache`; when the 11th is added, the least recently used entry is evicted
- [ ] A previously-played ambient sound loads and plays when the device is offline
- [ ] Cache is separate from the general runtime cache (`wr-runtime-v1`)

### Content Caching — Bible Chapters
- [ ] When a user reads a Bible chapter, the chapter content is cached in a `wr-bible-cache` cache
- [ ] Maximum 50 chapters are stored in `wr-bible-cache` with LRU eviction
- [ ] A previously-read Bible chapter renders correctly when the device is offline

### Content Caching — Devotionals
- [ ] When a user views the daily devotional, the current day's content and the previous 3 days are cached in a `wr-devotional-cache`
- [ ] Maximum 4 entries in `wr-devotional-cache`
- [ ] A cached devotional renders correctly when offline

### Spotify Embed Handling
- [ ] When offline, all Spotify embed sections are hidden (no broken iframes visible)
- [ ] When offline, a message "Spotify playlists available when online" is displayed where embeds would appear
- [ ] When connectivity returns, Spotify embeds reappear without requiring a page refresh

### useOnlineStatus Hook
- [ ] `useOnlineStatus` hook exists in `hooks/` and returns `{ isOnline: boolean }`
- [ ] Hook responds to `online` and `offline` window events (component re-renders on connectivity change)
- [ ] Hook initializes with the correct value from `navigator.onLine`

### Offline Message Component
- [ ] Offline message shows "You're offline — this feature needs an internet connection" with a WiFiOff icon
- [ ] On dark backgrounds, icon uses `text-white/40` styling
- [ ] On light backgrounds (`bg-neutral-bg`), icon uses `text-text-light` styling
- [ ] Message replaces the network-dependent content inline (not an overlay)

### Install Prompt Banner — Standard
- [ ] Banner appears at the bottom of the screen when `beforeinstallprompt` fires, user is not in standalone mode, banner was not dismissed in the last 7 days, and visit count >= 2
- [ ] Banner does NOT appear on the user's first visit (visit count = 1)
- [ ] Banner uses frosted glass styling: `bg-white/10 backdrop-blur-md border-t border-white/15`
- [ ] Banner shows Worship Room icon (32px), "Install Worship Room" (bold), "Get the full app experience" (muted), Install button, and X dismiss button
- [ ] Tapping "Install" calls the deferred `beforeinstallprompt` event's `prompt()` method
- [ ] If user accepts install, a celebration toast appears: "Worship Room installed! Find it on your home screen."
- [ ] Tapping X dismiss stores timestamp in `wr_install_dismissed` localStorage key
- [ ] Banner does not reappear for 7 days after dismissal
- [ ] Banner never appears when `window.matchMedia('(display-mode: standalone)').matches` is true
- [ ] Banner is positioned above the AudioPill if the AudioPill is currently visible
- [ ] On mobile (< 640px), banner is full-width with safe area padding
- [ ] On tablet/desktop (>= 640px), banner is max-width ~560px, centered

### Install Prompt Banner — iOS Safari
- [ ] On iOS Safari (where `beforeinstallprompt` doesn't fire), a manual instruction banner appears instead
- [ ] iOS banner message: "Install Worship Room: tap the Share button below, then 'Add to Home Screen'"
- [ ] iOS banner includes a visual reference to the iOS share icon (square with up arrow)
- [ ] iOS banner uses the same 7-day dismiss logic as the standard banner
- [ ] iOS banner only appears on second+ visit (same visit count check)
- [ ] iOS banner does not appear if already in standalone mode

### Visit Counting
- [ ] `wr_visit_count` localStorage key is incremented by 1 on each app load
- [ ] Install prompt banner checks `wr_visit_count >= 2` before displaying

### Offline Dashboard
- [ ] When offline, the dashboard renders all widgets from cached localStorage data (mood chart, streak, faith points, badges, activity checklist)
- [ ] When offline, journal writing saves drafts to localStorage normally
- [ ] When offline, mood check-in saves to localStorage normally
- [ ] When offline, Bible reading works for cached chapters; uncached chapters show an offline message
- [ ] When offline, ambient sounds play for cached sounds; uncached sounds show an offline message
- [ ] When offline, meditation exercises work fully (all content is local/static)
- [ ] When offline, Prayer Wall shows cached feed but the composer displays an inline message that posting requires internet
- [ ] When offline, Local Support search shows an offline message instead of the search interface
- [ ] When offline, social share buttons are hidden or disabled; copy-to-clipboard still works

### Navbar Offline Indicator
- [ ] When offline, a small WiFiOff icon (~16px) appears in the navbar
- [ ] Icon has a tooltip: "You're offline — some features are limited"
- [ ] Icon uses muted styling (`text-white/40`) that is noticeable but not alarming
- [ ] Icon appears/disappears reactively as connectivity changes (no page refresh required)
- [ ] On desktop, icon appears next to the user's avatar (logged-in) or in the nav area (logged-out)
- [ ] On mobile, icon appears in the hamburger menu header area

### General
- [ ] All PWA features work for both logged-out and logged-out users
- [ ] No new React Router routes are added
- [ ] Existing tests continue to pass
- [ ] `pnpm build` succeeds with the new caching configuration
