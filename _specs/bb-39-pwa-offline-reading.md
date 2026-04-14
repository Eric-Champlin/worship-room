# BB-39: PWA + Offline Reading

**Master Plan Reference:** N/A — standalone infrastructure spec on `bible-redesign` branch

**Branch:** `bible-redesign` (no new branch — all work commits directly here)

**Depends on:** BB-40 (SEO + OG cards), BB-38 (deep linking / URL contract), existing `vite-plugin-pwa` setup, BB-0 through BB-21+ (WEB Bible data files)

**Hands off to:** BB-41 (web push notifications — depends on BB-39's service worker registration)

---

## Overview

Worship Room's positioning is "a quiet place you come back to." Users who reach for the app during a crisis, at 2am, on a plane, at a hospital, or in any low-connectivity moment need the app to work — not throw a network error. BB-39 turns Worship Room into a real Progressive Web App: offline-capable, installable to the home screen, and resilient to connectivity loss. After BB-39 ships, a user who has visited once can open the app in airplane mode and read any Bible chapter, navigate the Daily Hub, and use all localStorage-backed features without an internet connection.

This is an infrastructure spec. Most of the work is configuring the service worker, designing precache and runtime caching strategies, writing the install experience, and handling offline UX gracefully. There is almost no new user-facing UI beyond an install prompt and an offline indicator.

## User Stories

- As a **logged-out visitor**, I want to install Worship Room on my home screen so that it opens like a native app in a standalone window without browser chrome.
- As a **logged-out visitor**, I want every Bible chapter to be available offline so that I can read Scripture on a plane, in a hospital, or anywhere without connectivity.
- As a **logged-out visitor**, I want to see a clear offline indicator when my connection drops so that I understand which features are available and which need internet.
- As a **logged-out visitor** on iOS Safari, I want clear instructions for adding Worship Room to my home screen since the browser doesn't support automatic install prompts.
- As a **logged-in user**, I want all my localStorage-backed features (highlights, notes, bookmarks, streaks, journal drafts) to work seamlessly offline since they never require network access.

---

## Requirements

### Functional Requirements

#### 1. PWA Manifest Configuration

Extend the existing `vite-plugin-pwa` configuration in `vite.config.ts` to produce a complete manifest:

- `name`: "Worship Room"
- `short_name`: "Worship Room"
- `description`: pulled from `HOME_METADATA.description`
- `start_url`: `/`
- `display`: `standalone`
- `theme_color`: `#08051A` (hero-bg)
- `background_color`: `#08051A` (splash screen)
- `orientation`: `portrait-primary`
- `categories`: `["books", "lifestyle", "education"]`
- `icons`: full set at 192, 256, 384, 512 sizes in PNG, plus a maskable variant for Android adaptive icons. All icons at `frontend/public/icons/`.

**Icon design direction:** Dark background (`#08051A`) with a single distinctive element that reads well at small sizes. Match the cinematic dark theme. The plan phase decides whether to generate from an existing logo asset or create via a Playwright screenshot script (same approach as BB-40's OG card generation). The maskable variant uses an 80% safe zone.

#### 2. Service Worker Strategy

Three caching strategies via Workbox (wrapped by `vite-plugin-pwa`):

**Strategy 1 — Precache at build time:**
- App shell (HTML, JS bundles, CSS)
- WEB Bible JSON data files (all 66 books, all chapters — the plan phase must measure `frontend/src/data/bible/**/*.json` total size and confirm it's under 8MB)
- OG card images from BB-40
- App icons
- Font files

**Strategy 2 — Runtime cache (StaleWhileRevalidate):**
- Reading plan data
- Devotional content
- Other dynamic-but-not-live content fetched on demand

**Strategy 3 — Network-only with graceful fallback:**
- Prayer Wall (live community content)
- Ask AI / Explain / Reflect (AI-generated responses)
- Any future backend API calls
- When offline, these features show a branded offline notice instead of broken UI

#### 3. Precache the Full WEB Bible

Precache all 66 books of the WEB Bible at build time. The tradeoff favors "the app just works offline" over "the app is smaller on first visit." 4MB is acceptable in 2026 for a PWA that positions offline reading as a core feature. If the measured size exceeds 8MB, the plan phase revisits this decision.

#### 4. Custom Install Prompt

Capture the browser's `beforeinstallprompt` event and show a custom install prompt at a contextually appropriate moment.

**Trigger rules — the prompt appears only when ALL of these are true:**
1. The user has visited at least 3 distinct pages in the current session
2. The user has not dismissed the prompt permanently (stored in localStorage via the existing `wr_install_dismissed` key)
3. The user has not already installed the app (detected via `display-mode: standalone` media query)
4. At least 2 minutes have passed since the session started
5. The user is on a page where an install prompt would not be disruptive (NOT on: BibleReader mid-read, Ask/Explain/Reflect pages)

**Prompt UI — small non-modal card at the bottom of the viewport:**
- Value proposition text: "Install Worship Room for offline reading and faster access"
- "Install" button — calls the stored `beforeinstallprompt.prompt()`
- "Not now" button — dismisses for the current session only
- "Don't ask again" link — stores permanent dismissal in localStorage

**iOS Safari variant:**
- iOS Safari does not fire `beforeinstallprompt`
- Detect iOS Safari and show a modified prompt with manual "Add to Home Screen" instructions
- Instructions include: tap the Share icon, then tap "Add to Home Screen"
- Design the iOS card to look intentional, not apologetic

#### 5. Offline Indicator

- Small persistent indicator in the bottom-left of the viewport: "Offline — some features unavailable"
- Uses `navigator.onLine` and `online`/`offline` window events
- Disappears automatically when the connection returns
- Does not obscure other fixed elements (the ambient pill FAB is bottom-right, so bottom-left is safe)

#### 6. Network-Only Feature Offline Notice

When a user navigates to a network-only feature while offline:
- The page shows a branded offline notice explaining which feature needs a connection
- Includes a link back to an offline-capable route (e.g., "Read the Bible" → `/bible`, "Go to Daily Hub" → `/daily`)
- Warm, caring copy — not a system error message

### Non-Functional Requirements

- **Performance**: Precached Bible data adds ~4MB to the service worker's precache manifest. This is the only meaningful size increase. Document the final number.
- **Accessibility**: Offline indicator and install prompt must be keyboard-navigable and screen-reader-announced. Install prompt "Don't ask again" must be reachable without a mouse. Offline notices must have appropriate ARIA roles.
- **No breaking changes**: All BB-30 through BB-40 tests continue to pass unchanged.

---

## Auth Gating

**This spec adds zero new auth gates.**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View install prompt | Sees prompt (same rules apply) | Sees prompt (same rules apply) | N/A |
| Install app | Can install | Can install | N/A |
| Dismiss install prompt | Dismissal persisted to localStorage | Dismissal persisted to localStorage | N/A |
| View offline indicator | Sees indicator when offline | Sees indicator when offline | N/A |
| Navigate to network-only feature offline | Sees branded offline notice | Sees branded offline notice | N/A |
| Read Bible offline | Full access to all 66 books | Full access to all 66 books | N/A |
| Use localStorage features offline | Works (state only, no saves) | Works (highlights, notes, bookmarks all in localStorage) | N/A |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Install prompt: full-width card pinned to bottom with 16px side margins. Offline indicator: small pill bottom-left with `env(safe-area-inset-bottom)` for notch devices. Offline notices: full-width centered content. iOS instructions card: includes visual share icon reference. |
| Tablet (640-1024px) | Install prompt: max-width ~480px, centered at bottom. Offline indicator: same position. Offline notices: centered with `max-w-lg`. |
| Desktop (> 1024px) | Install prompt: max-width ~480px, pinned bottom-center. Offline indicator: bottom-left corner. Offline notices: centered with `max-w-lg`. |

The install prompt must not overlap the ambient pill FAB (bottom-right on Daily Hub). The offline indicator is bottom-left, so no collision with the FAB.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The offline notice for AI features (Ask, Explain, Reflect) simply explains that those features need a connection — it does not generate or display AI content.

---

## Auth & Persistence

- **Logged-out users**: Can install the app, see offline indicator, use all precached content offline. Install prompt dismissal persists to localStorage via existing `wr_install_dismissed` key.
- **Logged-in users**: Same behavior. All personal data (highlights, notes, bookmarks, streaks, mood entries, journal drafts) already lives in localStorage and is inherently offline-capable.
- **Route type**: All routes remain their current access level (public or protected). BB-39 adds no auth gates.
- **localStorage usage**: Uses existing `wr_install_dismissed` key (timestamp for permanent dismissal), existing `wr_visit_count` (page visit counter), existing `wr_session_counted` (session guard). No new keys introduced.

---

## Completion & Navigation

N/A — standalone infrastructure feature. No completion tracking, no Daily Hub tab integration, no gamification points.

---

## Design Notes

- **Install prompt card**: Use the frosted glass card pattern from the design system (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`). Text uses `text-white` default. "Install" button uses the white pill CTA pattern. "Not now" uses `text-white/60`. "Don't ask again" uses `text-white/40` with underline on hover.
- **Offline indicator pill**: Small frosted pill (`bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5`). Uses a subtle wifi-off icon (Lucide `WifiOff`) + "Offline" text in `text-white/70`. Fixed position `bottom-4 left-4` with `z-50`.
- **Offline notice page content**: Centered layout matching the existing `FeatureEmptyState` component pattern. Lucide `WifiOff` icon, warm heading ("You're offline"), caring description, CTA button linking to an offline-capable route.
- **iOS instructions card**: Same frosted glass as install prompt. Step-by-step with numbered items. Include a visual reference to the iOS share icon (box-with-arrow-up).
- **App icons**: Dark background `#08051A` matching the splash screen and theme color. The plan phase determines the visual element (likely derived from the existing logo/branding).
- **Reference**: `_plans/recon/design-system.md` for exact CSS values of frosted glass patterns, pill styles, and button treatments.

---

## Architecture Notes for Plan Phase

The plan phase recon must verify:

1. **`vite-plugin-pwa` presence**: Read `frontend/package.json` and `frontend/vite.config.ts` to confirm the library is installed and report current configuration.
2. **Bible data size**: Measure `frontend/src/data/bible/**/*.json` total size. If > 8MB, revisit the precache-everything decision.
3. **Existing service worker code**: Locate any existing SW registration, `virtual:pwa-register` usage, or custom service worker files.
4. **Existing PWA manifest**: Check for `frontend/public/manifest.json` or `frontend/public/manifest.webmanifest` and report its contents.
5. **Existing offline.html**: Check if `frontend/public/offline.html` exists from the earlier PWA specs (Specs 31/32).

These findings determine whether BB-39 extends existing PWA infrastructure or configures from scratch.

---

## What BB-39 Explicitly Does NOT Do

- **No background sync** — offline changes replay on next visit, not via Background Sync API
- **No push notification wiring** — BB-41's scope. BB-39 only ensures the service worker is registered and ready for push events.
- **No offline writes to the server** — Phase 2 has no backend writes; everything is localStorage
- **No per-user precache** — same content for every user
- **No service worker update UI** — Workbox's default `skipWaiting` applies silently
- **No install event analytics** — deferred to a future spec
- **No store submission** (Google Play TWA, Microsoft Store) — standalone PWA only
- **No changes to existing UI** beyond the install prompt and offline indicator
- **No new auth gates** — zero
- **No new backend dependencies** — pure frontend
- **No changes to pre-existing failing tests**

---

## Out of Scope

- Background Sync API for offline write replay
- Web push notification handling (BB-41)
- Production icon refinement (future deployment spec)
- Production HTTPS origin configuration
- Install prompt analytics / conversion tracking
- "Refresh to update" prompt for new service worker versions
- Google Play TWA or Microsoft Store submission
- Light mode variants of the install prompt or offline indicator
- Any backend work

---

## Acceptance Criteria

- [ ] `vite-plugin-pwa` is confirmed present in `frontend/package.json` (or installed if missing)
- [ ] `frontend/vite.config.ts` configures the PWA plugin with Worship Room's manifest fields (name, short_name, description, start_url, display, theme_color, background_color, icons, categories)
- [ ] A PWA manifest is generated at build time containing all required fields
- [ ] A complete icon set exists at `frontend/public/icons/` with at least 192, 256, 384, 512 sizes plus a maskable variant
- [ ] The service worker is registered on app load via `virtual:pwa-register` (or equivalent)
- [ ] The precache manifest includes the app shell, WEB Bible JSON data, OG card images from BB-40, and font files
- [ ] Runtime caching is configured via Workbox with StaleWhileRevalidate for reading plan data and devotional content
- [ ] Network-only routes (Prayer Wall, Ask, Explain, Reflect) are explicitly listed and fall back gracefully when offline
- [ ] The custom install prompt component exists and fires only when all 5 trigger rules are satisfied
- [ ] The install prompt is dismissible per-session ("Not now") or permanently ("Don't ask again"), with permanent dismissal persisted to `wr_install_dismissed` in localStorage
- [ ] The install prompt does NOT fire on BibleReader, Ask, Explain, or Reflect pages
- [ ] iOS Safari is detected and shows manual "Add to Home Screen" instructions instead of an Install button
- [ ] An offline indicator pill appears in the bottom-left when `navigator.onLine` is false and disappears when online
- [ ] Network-only features show a branded offline notice with warm copy and a link to an offline-capable route
- [ ] The installed app opens in a standalone window (no browser chrome) with `display: standalone`
- [ ] The standalone app's splash screen uses `background_color: #08051A` and the manifest icon
- [ ] All BB-30 through BB-40 tests continue to pass unchanged
- [ ] Build size impact is documented — the precached WEB Bible adds approximately 4MB to the precache manifest
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates
- [ ] Zero new localStorage keys (uses existing `wr_install_dismissed`, `wr_visit_count`, `wr_session_counted`)
- [ ] A documentation file at `_plans/recon/bb39-pwa-strategy.md` documents the final precache manifest, runtime caching rules, network-only route list, and install prompt trigger logic
- [ ] The install prompt has at least 10 unit tests covering trigger rules, dismissal persistence, iOS Safari detection, and beforeinstallprompt event handling
- [ ] The offline indicator has at least 5 unit tests covering online/offline transitions
- [ ] An integration test verifies that loading a precached Bible chapter works with the network disabled
- [ ] An integration test verifies that loading a network-only route shows the offline notice when offline
- [ ] Lighthouse PWA audit targets a score of 100 on canonical routes
- [ ] The offline indicator does not overlap the ambient pill FAB (bottom-right) or any other fixed UI element
- [ ] The install prompt card uses the frosted glass pattern from the design system
- [ ] The iOS Safari instructions include a visual share icon reference and numbered steps
