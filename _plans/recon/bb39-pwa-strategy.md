# BB-39 PWA + Offline Reading — Strategy Recon

## 1. Precache Manifest Contents

### App Shell

Workbox `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` captures all static build artifacts at service worker install time:

- `index.html` — SPA entry point
- All JS bundles (main chunk, lazy-loaded route chunks, vendor chunks)
- All CSS files
- All `.png`, `.svg`, `.ico` assets emitted by Vite into `dist/`
- `.woff2` font files (none local — see Font Files note below)

### Bible Web Data (66 files)

Location: `frontend/src/data/bible/web/`

- 66 JSON files, one per book (e.g. `genesis.json`, `matthew.json`)
- Raw size: ~6.0 MB
- Gzipped size: ~1.0 MB
- Import mechanism: dynamic imports compiled to individual JS chunks by Vite. These chunks land in `dist/assets/` and are captured by the `**/*.js` glob — no additional Workbox configuration needed.

### Bible Cross-References (66 files)

Location: `frontend/src/data/bible/cross-references/`

- 66 JSON files, one per book
- Raw size: ~23 MB
- Gzipped size: ~1.7 MB
- Same import mechanism as web data: dynamic imports → JS chunks → captured by glob.

### OG Card Image

- File: `public/og-default.png`
- Size: ~100 KB
- Captured by `**/*.png` glob.

### App Icons (5 files)

Location: `public/icons/`

| File | Purpose |
|------|---------|
| `icon-192x192.png` | Standard Android home screen |
| `icon-256x256.png` | General purpose |
| `icon-384x384.png` | General purpose |
| `icon-512x512.png` | Splash screen / PWA splash |
| `icon-512x512-maskable.png` | Android adaptive icon |

All captured by `**/*.png` glob.

### Font Files

No local font files. Inter and Lora are loaded from Google Fonts CDN (`fonts.googleapis.com` / `fonts.gstatic.com`). These are covered by the runtime cache rules for Google Fonts (see Section 3), not the precache manifest.

---

## 2. Build Size Impact

### Total Precache Transfer

| Asset Group | Raw | Gzipped |
|-------------|-----|---------|
| Bible web data (66 files) | ~6.0 MB | ~1.0 MB |
| Bible cross-references (66 files) | ~23 MB | ~1.7 MB |
| App shell (JS/CSS/HTML) | varies | ~0.3 MB est. |
| Images + icons | ~0.5 MB | ~0.4 MB |
| **Total** | **~30 MB** | **~3.4 MB** |

**Effective install transfer: ~3 MB gzipped.**

This is within acceptable range for a PWA install prompt — users see the install benefit (full offline Bible) and pay a one-time ~3 MB cost.

### Measurement Commands

```bash
# Raw size of Bible web data
du -sh frontend/src/data/bible/web/

# Raw size of cross-references
du -sh frontend/src/data/bible/cross-references/

# Approximate gzipped size of Bible web data
find frontend/src/data/bible/web/ -type f -exec gzip -c {} \; | wc -c

# Approximate gzipped size of cross-references
find frontend/src/data/bible/cross-references/ -type f -exec gzip -c {} \; | wc -c
```

---

## 3. Runtime Caching Rules

These rules apply to requests that are NOT in the precache manifest (i.e., CDN resources, API calls, dynamically requested assets).

| Route / Pattern | Strategy | Cache Name | Expiry |
|-----------------|----------|------------|--------|
| Google Fonts stylesheets (`fonts.googleapis.com`) | StaleWhileRevalidate | `wr-google-fonts-stylesheets` | 365 days |
| Google Fonts webfonts (`fonts.gstatic.com`) | CacheFirst | `wr-google-fonts-webfonts` | 365 days |
| `/api/` | NetworkFirst (10s timeout) | `wr-api-v1` | 7 days |
| Images (`*.png`, `*.jpg`, `*.svg`, `*.gif`, `*.webp`) | CacheFirst | `wr-images-v1` | 30 days |
| Audio (`*.mp3`, `*.wav`, `*.ogg`, `*.m4a`) | CacheFirst + range request support | `wr-audio-cache` | (no expiry set) |
| Same-origin catch-all | NetworkFirst | `wr-runtime-v1` | 7 days |

**Notes on audio caching:**
Range request support (`RangeRequestsPlugin`) is required for audio files so that the browser's media element can seek within a cached audio file. Without it, seeking would fail on cached audio.

**Notes on API caching:**
NetworkFirst with a 10-second timeout ensures fresh data when online. The 7-day cached fallback allows previously fetched API responses to load offline (e.g., the last-viewed prayer wall state, if it was cached before going offline).

---

## 4. Network-Only Routes (Show OfflineNotice When Offline)

The following routes depend on live server data and must show the `OfflineNotice` component when the device is offline. They are excluded from the SW navigation cache:

| Route | Feature | Why Network-Only |
|-------|---------|-----------------|
| `/prayer-wall` | Prayer Wall feed | Live community posts |
| `/prayer-wall/:id` | Prayer detail | Live post + comments |
| `/prayer-wall/user/:id` | Prayer Wall public profile | Live user data |
| `/prayer-wall/dashboard` | Prayer Wall personal dashboard | Live prayer stats |
| `/ask` | AI Bible chat | AI responses require server |

**Implementation:** The service worker checks `navigator.onLine` (or intercepts the navigation fetch and detects network failure) for these paths and injects / allows the React app to render `OfflineNotice` instead of stale content.

---

## 5. Install Prompt Trigger Logic

The install prompt fires when **all 5 conditions are simultaneously true**:

1. **Page visit depth**: User has visited 3 or more distinct pages in the current browser session (tracked in memory, not localStorage).
2. **Not permanently dismissed**: `wr_install_dismissed` is NOT set in `localStorage`.
3. **Not already installed**: `window.matchMedia('(display-mode: standalone)').matches` returns `false`.
4. **Minimum dwell time**: At least 2 minutes have elapsed since the session started.
5. **Not on high-focus pages**: Current route is NOT `/bible/:book/:chapter` (BibleReader) or `/ask` (AskPage) — these pages require concentration and should not be interrupted.

**Browser support condition (fires install UI):**
- Desktop / Android Chrome: `beforeinstallprompt` event has fired (deferred and stored), OR
- iOS Safari: detected via user agent (iOS Safari does not fire `beforeinstallprompt` but supports "Add to Home Screen" — UI must show manual instructions)

---

## 6. navigateFallback Fix

### Change

```
Before: navigateFallback: '/offline.html'
After:  navigateFallback: '/index.html'
```

### Reason

`/offline.html` is a static HTML file that does not include the React app shell. When the service worker intercepted a navigation request (e.g. the user navigated to `/bible/matthew/5`) and the network was unavailable, it served the bare static offline page — bypassing React Router entirely. Every SPA route would render the offline page instead of the React app, even for routes whose content is fully precached and available offline.

The correct fallback for a Vite SPA is `/index.html` — the compiled React app shell. When served for any navigation request, React Router resolves the URL client-side, lazy-loads the appropriate chunk (which is precached), and renders the page offline. Only features that genuinely require the network (Section 4) then show the `OfflineNotice` component.

### Disposition of offline.html

`/offline.html` is retained as a static asset in `public/` and is NOT deleted. It may still be served as a direct URL (`/offline.html`) but is no longer wired as the SW navigation fallback. Future use cases (e.g., a no-JS fallback, a deep-link error page for non-SPA hosts) may repurpose it.

---

## 7. Known Follow-Ups

- **Manifest test fragility (BB-37 territory):** `manifest.test.ts` parses the `vite.config.ts` source via regex to extract the manifest object. This works for the current config format but would break on reformatting, added comments, or non-trivial value patterns. A more robust approach would be a post-build integration test that reads `dist/manifest.webmanifest` as JSON directly. Not BB-39 scope — file under code health / BB-37.
