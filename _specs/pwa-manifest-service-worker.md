# Feature: PWA Manifest, Service Worker & Offline Fallback

## Overview

Worship Room serves users in their most vulnerable moments -- late-night prayer, early-morning devotionals, bedtime wind-down with ambient sounds. These moments often happen on phones, in bed, with spotty Wi-Fi. Turning Worship Room into a Progressive Web App means users can install it on their home screen like a native app and access cached content even when their connection drops. This is the foundational infrastructure spec (Spec 31 of 2 in the PWA sequence). It creates the manifest, service worker, offline fallback, and update mechanism. Spec 32 will add content-specific caching strategies and a user-facing install prompt.

## User Stories

- As a **logged-out visitor**, I want to install Worship Room on my phone's home screen so that it feels like a native app and I can access it with one tap.
- As a **logged-out visitor**, I want previously visited pages to load even when I have no internet so that my worship experience isn't interrupted by connectivity issues.
- As a **logged-out visitor**, I want ambient sound files to be cached so that I can use sleep sounds without internet (the most common offline use case).
- As a **logged-out visitor**, I want to see a friendly offline page when I try to visit a page that hasn't been cached yet so that I understand what's happening and can retry.
- As a **logged-in user**, I want to be notified when a new version of Worship Room is available so that I can update at my convenience without losing my current session.

---

## Requirements

### 1. Web App Manifest

A `manifest.json` file in the `public/` directory that enables installability on all platforms.

**Manifest fields:**
- `name`: "Worship Room"
- `short_name`: "Worship Room"
- `description`: "A safe place to heal, grow, and connect with God"
- `start_url`: "/"
- `display`: "standalone"
- `background_color`: "#0f0a1e" (dashboard dark background)
- `theme_color`: "#6D28D9" (primary purple)
- `orientation`: "any"
- `icons`: array with 192x192 and 512x512 PNG icons (see Icon Requirements below)

**Icon requirements:**
- 192x192 PNG (`icon-192.png`)
- 512x512 PNG (`icon-512.png`)
- 180x180 PNG (`apple-touch-icon.png`) for iOS
- All icons: dark purple (#6D28D9) rounded square background with "WR" in white, centered. Use a bold, clean font style reminiscent of Caveat (the app's decorative font). Rounded corners proportional to icon size (~20% radius).
- Icons generated programmatically (no designer required) -- use a build script, canvas API, or SVG-to-PNG conversion.

### 2. HTML Head Tags

Add to `index.html` `<head>`:
- `<link rel="manifest" href="/manifest.json">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="theme-color" content="#6D28D9">`

### 3. Service Worker (Workbox via vite-plugin-pwa)

Use `vite-plugin-pwa` for Workbox integration with Vite 5. This is the simplest approach -- it auto-generates the service worker at build time, handles precaching of the app shell, and provides runtime caching configuration.

**Precache strategy (build-time, automatic):**
- App shell: `index.html`, all JS/CSS bundles produced by Vite
- Static assets in `public/`: icons, fonts (via Google Fonts -- these are external and handled via runtime caching instead)
- Ambient sound placeholder MP3s in `public/audio/ambient/` (~1.4MB total) -- these are the highest-priority offline content because users play sleep sounds without internet

**Runtime caching strategies:**

| URL Pattern | Strategy | Cache Name | Max Entries | Max Age |
|------------|----------|------------|-------------|---------|
| Google Fonts stylesheets (`fonts.googleapis.com`) | StaleWhileRevalidate | `wr-google-fonts-stylesheets` | 10 | 365 days |
| Google Fonts webfonts (`fonts.gstatic.com`) | CacheFirst | `wr-google-fonts-webfonts` | 30 | 365 days |
| API calls (`/api/`) | NetworkFirst | `wr-api-v1` | 100 | 7 days |
| Images (png, jpg, svg, ico) | CacheFirst | `wr-images-v1` | 60 | 30 days |
| All other requests | NetworkFirst | `wr-runtime-v1` | 200 | 7 days |

**Cache limits:**
- Total runtime cache: 50MB max (enforced by Workbox's `ExpirationPlugin`)
- API cache max age: 7 days (future-proofing for when the backend exists)

**Navigation fallback:**
- When a navigation request fails (network unavailable AND page not in precache), serve `/offline.html`
- Configured via Workbox's `navigateFallback` option

### 4. Offline Fallback Page

A self-contained HTML page at `public/offline.html` with zero external dependencies:

**Visual design:**
- Background: `#0f0a1e` (dashboard dark background)
- "Worship Room" text styled to match the site's branding -- white, large, centered, with subtle letter-spacing
- Cross/worship icon (inline SVG) above the title in primary purple (#6D28D9)
- Message: "You're offline right now. Some features need an internet connection, but your saved content is still available."
- Message typography: white text, slightly muted opacity (~0.8), centered, comfortable reading width
- "Try again" button: primary purple background (#6D28D9), white text, rounded corners, hover brightens. Calls `location.reload()` on click.
- All CSS inline (no external stylesheets)
- All fonts inline or system fonts (no Google Fonts dependency)
- Vertically and horizontally centered content
- Responsive -- works on all screen sizes

### 5. Service Worker Registration

Register the service worker from the app's entry point (`main.tsx` or a dedicated `sw-register.ts` utility).

**Registration rules:**
- Only register in production (`import.meta.env.PROD`) -- Vite's dev server handles HMR and service workers interfere with it
- Wait until the `window load` event to avoid blocking initial render
- Handle registration errors gracefully: `console.warn()`, never crash the app
- Log successful registration to console

### 6. Update Detection & Prompt

When a new service worker version is detected (the `onNeedRefresh` callback from vite-plugin-pwa):

**Update toast:**
- Position: bottom of the screen, centered, above any audio pill if present
- Message: "A new version of Worship Room is available"
- "Update now" button that calls `updateServiceWorker(true)` (triggers skipWaiting + reload)
- "Dismiss" action (X button or swipe) to close the toast -- user can update later
- Toast style: dark frosted glass consistent with the audio pill aesthetic (`rgba(15, 10, 30, 0.85)` with `backdrop-blur`), white text, purple accent button
- Toast auto-dismisses after 30 seconds if no action taken
- Toast does NOT force-update -- user chooses when to update
- Use the existing `useToast()` hook/Toast system if it supports persistent toasts with action buttons; otherwise create a standalone update prompt component

---

## Auth Gating

**No auth gating.** PWA features operate at the infrastructure level below the app's auth system. Every feature in this spec works identically for logged-out and logged-in users.

| Element | Logged-Out | Logged-In |
|---------|-----------|-----------|
| Install app to home screen | Yes | Yes |
| Receive cached pages offline | Yes | Yes |
| See offline fallback page | Yes | Yes |
| See update available toast | Yes | Yes |
| Click "Update now" | Yes | Yes |

---

## AI Safety Considerations

- **Crisis detection needed?** No -- this spec has no user text input
- **User input involved?** No -- all interactions are install prompts, offline display, and update buttons
- **AI-generated content?** No
- **No `dangerouslySetInnerHTML` usage**
- **No database writes**

---

## Auth & Persistence

- **Logged-out (demo mode):** Full PWA functionality. Service worker caching is browser-level, not user-level. Zero user data persistence.
- **Logged-in:** Identical behavior. Service worker doesn't distinguish between auth states.
- **Route type:** N/A -- manifest, service worker, and offline page are infrastructure, not routes. `offline.html` is served by the service worker, not React Router.
- **No new localStorage keys** -- `vite-plugin-pwa` manages its own internal state

---

## Responsive Behavior

### Offline Fallback Page
- **Mobile (< 640px):** Content centered, title ~1.5rem, message text ~0.9rem, button full-width with generous padding (44px min height). Comfortable thumb reach.
- **Tablet (640-1024px):** Content centered, title ~2rem, message max-width ~500px, button auto-width with horizontal padding.
- **Desktop (> 1024px):** Content centered, title ~2.5rem, message max-width ~600px, button auto-width. More whitespace around content.

### Update Toast
- **Mobile (< 640px):** Full-width minus padding (16px each side), fixed to bottom, above safe area inset. Stacks message and button vertically if needed.
- **Tablet (640-1024px):** Max-width ~480px, centered at bottom.
- **Desktop (> 1024px):** Max-width ~480px, centered at bottom. Consistent with existing toast positioning.

### Install Prompt (Spec 32)
- Install prompt UI is NOT in this spec -- only the manifest and service worker that enable installability.

---

## UX & Design Notes

- **Tone:** The offline page should feel warm and reassuring, not like an error page. The user is in a spiritual app during a vulnerable moment -- "you're offline" should feel like a gentle note, not a broken experience.
- **Colors:** Use the dashboard dark palette (`#0f0a1e` background, `#6D28D9` accent, white text). The offline page should feel like it belongs to Worship Room, not a generic browser error.
- **Typography:** System fonts on the offline page (no external font loading). Use `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` font stack. The update toast uses the app's loaded Inter font since it appears within the running app.
- **Animations:** None on the offline page (keeping it dependency-free and fast). The update toast can use a gentle slide-up entrance consistent with existing toast behavior.
- **Icons:** App icons use the brand purple with "WR" lettering. Simple, recognizable, works at small sizes (notification tray, app drawer). The rounded square shape matches iOS and Android conventions.

**Design system recon reference:** `_plans/recon/design-system.md` exists and captures exact color values. The dark purple backgrounds (#0f0a1e, #0D0620) and primary purple (#6D28D9) are consistent across all dark-themed surfaces.

---

## Out of Scope

- **User-facing install prompt UI** -- Spec 32 will add a "Install Worship Room" banner/button that detects the `beforeinstallprompt` event and guides users through installation
- **Content-specific caching strategies** -- Spec 32 will add intelligent caching for scripture data, prayer wall posts, journal drafts, and devotional content
- **Background sync** -- queuing offline actions (prayers, journal saves) for later sync is a future enhancement
- **Push notifications** -- separate feature (Phase 2.95 spec)
- **Offline-first data layer** -- IndexedDB for structured offline data is a future enhancement
- **Custom splash screens** -- native splash screen images for iOS/Android are a future enhancement beyond the manifest's basic splash
- **Backend changes** -- no API modifications needed
- **Native app features** -- this is web PWA only

---

## Acceptance Criteria

### Manifest
- [ ] `manifest.json` exists in `public/` with all required fields: name, short_name, description, start_url, display, background_color, theme_color, orientation
- [ ] `manifest.json` references icons at 192x192 and 512x512 sizes
- [ ] Icon files exist in `public/`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- [ ] Icons display a dark purple (#6D28D9) rounded square with "WR" in white text, legible at all sizes
- [ ] `index.html` contains `<link rel="manifest" href="/manifest.json">`
- [ ] `index.html` contains `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- [ ] `index.html` contains `<meta name="apple-mobile-web-app-capable" content="yes">`
- [ ] `index.html` contains `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- [ ] `index.html` contains `<meta name="theme-color" content="#6D28D9">`

### Service Worker
- [ ] `vite-plugin-pwa` (or equivalent Workbox integration) is installed and configured in `vite.config.ts`
- [ ] Service worker is generated at build time with precached app shell (index.html, JS/CSS bundles)
- [ ] Ambient sound MP3s in `public/audio/ambient/` are included in precache
- [ ] Google Fonts are cached via runtime caching (StaleWhileRevalidate for stylesheets, CacheFirst for webfonts)
- [ ] API calls (`/api/*`) use NetworkFirst strategy with 7-day max age
- [ ] Images use CacheFirst strategy with 30-day max age
- [ ] Runtime cache enforces 50MB max size via ExpirationPlugin
- [ ] Service worker only registers in production (not in dev mode)
- [ ] Registration waits for `window load` event
- [ ] Registration errors are caught and logged with `console.warn` (app does not crash)
- [ ] Successful registration is logged to console

### Offline Fallback
- [ ] `offline.html` exists in `public/` as a self-contained HTML page with inline CSS, no external dependencies
- [ ] Offline page has dark purple background (#0f0a1e) matching the app's dark theme
- [ ] Offline page displays "Worship Room" branding text
- [ ] Offline page displays the message: "You're offline right now. Some features need an internet connection, but your saved content is still available."
- [ ] Offline page has a "Try again" button that calls `location.reload()`
- [ ] "Try again" button has minimum 44px height for touch accessibility
- [ ] Offline page is responsive: comfortable layout on mobile (< 640px), tablet (640-1024px), and desktop (> 1024px)
- [ ] Offline page uses system fonts only (no external font loading)
- [ ] When network is unavailable and a navigation request fails, the service worker serves `offline.html`

### Update Detection
- [ ] When a new service worker version is detected, a toast appears at the bottom of the screen
- [ ] Toast message reads: "A new version of Worship Room is available"
- [ ] Toast has an "Update now" button that triggers skipWaiting and page reload
- [ ] Toast has a dismiss action (does not force-update)
- [ ] Toast auto-dismisses after 30 seconds if no action taken
- [ ] Toast is styled with dark frosted glass aesthetic consistent with the app's dark UI elements
- [ ] Toast is positioned above any audio pill if present
- [ ] Toast is responsive: full-width on mobile, max-width ~480px centered on tablet/desktop

### Lighthouse PWA Audit
- [ ] Production build passes Lighthouse installability check (manifest + service worker + icons)
- [ ] Production build passes Lighthouse offline capability check (fallback page served)
- [ ] Production build passes Lighthouse icon size requirements (192x192 and 512x512)

### Build & Dev Experience
- [ ] `pnpm build` succeeds and generates service worker in build output
- [ ] `pnpm preview` serves the built app with service worker active
- [ ] `pnpm dev` does NOT register the service worker (no interference with HMR)
- [ ] Existing tests continue to pass (service worker registration is production-only, does not affect test environment)
- [ ] No new localStorage keys introduced
- [ ] No new React Router routes added (offline.html is served by service worker, not the router)
