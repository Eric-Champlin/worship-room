# Implementation Plan: BB-39 PWA + Offline Reading

**Spec:** `_specs/bb-39-pwa-offline-reading.md`
**Date:** 2026-04-11
**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 6 days old — fresh)
**Recon Report:** N/A — BB-39 is infrastructure; no visual page work beyond install prompt and offline indicator
**Master Spec Plan:** N/A — standalone infrastructure spec

---

## Architecture Context

### Existing PWA Infrastructure (verified during recon)

BB-39 is NOT building from scratch. The project already has significant PWA infrastructure:

1. **`vite-plugin-pwa@^1.2.0`** installed in `frontend/package.json` with `workbox-window@^7.4.0`.
2. **`vite.config.ts`** (lines 10-84): VitePWA plugin configured with:
   - `registerType: 'prompt'` — shows update prompt, doesn't auto-activate new SW
   - `manifest: false` — currently using static `public/manifest.json` instead of generated
   - `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` — precaches all JS/CSS/HTML/images
   - `workbox.navigateFallback: '/offline.html'` — **BUG: should be `/index.html` for SPA routing** (offline.html is a static page, not the React app shell; serving it as the navigation fallback would break SPA navigation)
   - `workbox.navigateFallbackDenylist: [/^\/api\//]` — excludes API routes
   - Runtime caching rules for Google Fonts (StaleWhileRevalidate + CacheFirst), `/api/` (NetworkFirst), images (CacheFirst), audio (CacheFirst with range requests), same-origin catch-all (NetworkFirst)
3. **`public/manifest.json`** (static): Has basic fields (name, short_name, display:standalone, 3 icons) but wrong `background_color: '#0f0a1e'` (should be `#08051A`), wrong `theme_color: '#6D28D9'` (should be `#08051A` per spec), missing `categories`, missing `orientation: portrait-primary`.
4. **`public/offline.html`** (118 lines): Branded offline fallback page with cross icon, retry button, responsive design.
5. **`src/pwa.d.ts`**: Type reference for `vite-plugin-pwa/client`.
6. **`src/components/pwa/UpdatePrompt.tsx`**: SW update notification using `useRegisterSW` from `virtual:pwa-register/react`. Fixed bottom position, auto-dismisses after 30s.
7. **`src/components/pwa/InstallBanner.tsx`** (140 lines): Install prompt rendered INSIDE the Navbar (not fixed to viewport). Shows after 3 total visits (cross-session). Permanent dismissal only. 10s auto-dismiss. iOS variant shows "Tap Share" text. Used in `Navbar.tsx:235`.
8. **`src/components/pwa/OfflineMessage.tsx`** (29 lines): Small inline message component with WifiOff icon + text. Used by SongPickSection, InlineComposer, SearchControls.
9. **`src/contexts/InstallPromptProvider.tsx`** (163 lines): Full context provider — captures `beforeinstallprompt`, detects iOS Safari, tracks visit count (cross-session, uses `wr_visit_count` + `wr_session_counted`), permanent dismissal (uses `wr_install_dismissed`), standalone detection. Mounted in `App.tsx:167`.
10. **`src/contexts/InstallPromptContext.ts`**: Context type: `InstallPromptContextValue` with 9 fields.
11. **`src/hooks/useInstallPrompt.ts`**: Hook consuming the context.
12. **`src/components/dashboard/InstallCard.tsx`**: Secondary install prompt for dashboard. Shows after banner dismissed + not on iOS.
13. **`src/hooks/useOnlineStatus.ts`** (23 lines): Already exists — uses `useSyncExternalStore` with `navigator.onLine` and `online`/`offline` events. Has 5 tests. Used by 8+ components.

### Bible Data Size Analysis

| Directory | Raw Size | Gzipped | File Count | Used In Production? | Loading Pattern |
|-----------|----------|---------|------------|--------------------|--------------------|
| `src/data/bible/web/` | 6.0 MB | ~1.0 MB est. | 66 | YES — `loadChapterWeb()` | Dynamic import: `import(\`./web/${slug}.json\`)` |
| `src/data/bible/cross-references/` | 23 MB | 1.7 MB | 66 | YES — `crossRefs/loader.ts` | Dynamic import: `import(\`@/data/bible/cross-references/${slug}.json\`)` |
| `src/data/bible/books/json/` | 5.7 MB | — | 66 | NO — test-only static imports | Static import in test files only |
| `src/data/bible/plans/` | 100 KB | — | — | YES | Static + dynamic |
| `src/data/bible/votd/` | 56 KB | — | — | YES | Static import |
| **Total `bible/` directory** | **34 MB** | **4.5 MB** | **204** | — | — |

**Key finding:** The spec estimated 4MB for Bible data. Actual `web/` directory is 6.0MB raw. Including cross-references (which are dynamically imported into production code), the total production Bible data is 29MB raw / ~2.7MB gzipped.

**Decision:** The current `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` already captures all JS chunks produced by Vite (including Bible `web/` and `cross-references/` dynamic imports, which Vite compiles into JS modules). The total precache transfer size (~3MB gzipped including app shell + all Bible data + cross-references) is well within acceptable range for a PWA positioning offline reading as a core feature. No changes needed to `globPatterns`. The `books/json/` directory is test-only (static imports in test files) and is NOT in the production build.

### Icon Inventory

| File | Location | Size | Purpose |
|------|----------|------|---------|
| `icon-192.png` | `public/` | Exists | PWA icon 192×192 |
| `icon-512.png` | `public/` | Exists | PWA icon 512×512 |
| `apple-touch-icon.png` | `public/` | Exists | iOS home screen |

**Missing (BB-39 must add):**
- `icon-256.png` — 256×256
- `icon-384.png` — 384×384
- `icon-512-maskable.png` — 512×512 with maskable safe zone (80% inner area)

The spec says icons go at `public/icons/`. BB-39 will move existing icons there and add missing sizes.

### Network-Dependent Pages (Phase 2 Context)

In Phase 2, all features use mock data or localStorage. No features actually require network access today. However, the following pages are conceptually network-dependent and will require real network access in Phase 3:

| Page | Route | Why Network-Dependent |
|------|-------|-----------------------|
| Prayer Wall (feed) | `/prayer-wall` | Live community content |
| Prayer Wall (detail) | `/prayer-wall/:id` | Live post data |
| Prayer Wall (profile) | `/prayer-wall/user/:id` | Live user data |
| Prayer Wall (dashboard) | `/prayer-wall/dashboard` | Live user prayer data |
| Ask (AI chat) | `/ask` | AI API calls |

The Bible reader, Daily Hub, Music, Grow page, and all meditation pages work fully offline (Bible data precached, devotionals/reading plans bundled as static data, all user state in localStorage).

BB-39 will add offline-awareness to the conceptually network-dependent pages. Since they currently work with mock data, the offline notice will only trigger when `navigator.onLine === false`, preparing the UX for Phase 3 when these features will actually break without network.

### Z-Index Scale (`src/constants/z-index.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `OVERLAY` | 60 | Celebration overlays |
| `TOOLTIP` | 70 | Tooltip callouts |
| `SKIP_LINK` | 100 | Skip-to-content |
| `UPDATE_PROMPT` | 9998 | PWA update prompt |
| `AUDIO_PILL` | 9999 | Audio pill |
| `DRAWER_BACKDROP` | 10000 | Audio drawer backdrop |
| `DRAWER` | 10001 | Audio drawer panel |
| `MODAL` | 10002 | Modal dialogs |

BB-39 needs z-index values for: `OfflineIndicator` (persistent pill, should be below modals but above content), `InstallPrompt` (fixed bottom card, same level as UpdatePrompt). Add `OFFLINE_INDICATOR: 50` and `INSTALL_PROMPT: 9997` to the Z-index scale.

### Test Patterns (from existing PWA tests)

- `InstallBanner.test.tsx` (199 lines): Mocks `useInstallPrompt`, `useToastSafe`, `useReducedMotion`. Uses `vi.useFakeTimers()` for auto-dismiss testing. Tests visibility conditions, button interactions, iOS variant, auto-dismiss timer, ARIA attributes.
- `useInstallPrompt.test.ts` (171 lines): Renders the hook with `InstallPromptProvider` wrapper. Tests `beforeinstallprompt` event, `promptInstall`, dismissal, visit count, standalone detection, iOS detection.
- `useOnlineStatus.test.ts` (99 lines): Tests online/offline transitions via `Object.defineProperty(navigator, 'onLine', ...)` + dispatching `online`/`offline` events.
- Provider wrapping: Tests needing `InstallPromptProvider` use it as a wrapper. Tests needing `ToastProvider` mock `useToastSafe`.

### Existing localStorage Keys (no new keys needed)

| Key | Type | Current Usage |
|-----|------|---------------|
| `wr_install_dismissed` | timestamp | Permanent dismissal of install prompt |
| `wr_visit_count` | number | Total cross-session visit count |
| `wr_session_counted` | "true" (sessionStorage) | Guard for once-per-session visit increment |
| `wr_install_dashboard_shown` | "true" | Dashboard InstallCard shown flag |

BB-39 adds NO new localStorage keys. Session-only dismissal uses React state (lost on refresh by design). The 2-minute timer and page-visit counter also use React state.

---

## Auth Gating Checklist

**BB-39 adds zero new auth gates.** Every feature in this spec works identically for logged-in and logged-out users.

| Action | Spec Requirement | Auth Check |
|--------|-----------------|------------|
| View/dismiss install prompt | No auth required | None |
| Install app | No auth required | None |
| View offline indicator | No auth required | None |
| Navigate offline to network-only page | No auth required | None |
| Read Bible offline | No auth required | None |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Install prompt card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | spec Design Notes + 09-design-system.md Dashboard Card Pattern |
| Install prompt card | padding | `p-4` | spec Design Notes |
| Install button | style | White pill CTA Pattern 1 (inline): `inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-sm transition-all hover:bg-white/90` | 09-design-system.md § White Pill CTA Patterns |
| "Not now" text | color | `text-white/60` | spec Design Notes |
| "Don't ask again" text | color | `text-white/40 hover:underline` | spec Design Notes |
| Offline indicator pill | background | `bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5` | spec Design Notes |
| Offline indicator text | color | `text-white/70` | spec Design Notes |
| Offline indicator position | CSS | `fixed bottom-4 left-4 z-50` | spec Design Notes |
| Offline notice icon | size/color | `h-10 w-10 text-white/30 sm:h-12 sm:w-12` | FeatureEmptyState pattern |
| Offline notice heading | style | `text-lg font-bold text-white/70` | FeatureEmptyState pattern |
| Offline notice CTA | style | Primary CTA: `rounded-lg bg-primary px-8 py-3 font-semibold text-white` | FeatureEmptyState pattern |
| App background | color | `#08051A` (`hero-bg`) | 09-design-system.md Color Palette |
| Theme color | color | `#08051A` | spec requirement |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card. BUT the spec explicitly says `bg-white/5 ... border border-white/10` for the install prompt — use the spec's values (they match the Dashboard Card Pattern, not the FrostedCard component).
- White pill CTA patterns: Pattern 1 (inline, smaller) for buttons inside cards. Pattern 2 (homepage primary, larger with white drop shadow) for main actions. See `09-design-system.md` § "White Pill CTA Patterns".
- Sticky FABs use `pointer-events-none` outer + `pointer-events-auto` inner with `env(safe-area-inset-*)` for iOS notch and Android nav bar respect.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- All text on dark backgrounds defaults to `text-white` for readable content; muted opacities reserved for secondary/decorative elements per 09-design-system.md § Text Opacity Standards.
- No deprecated patterns: No Caveat headings, no BackgroundSquiggle on Daily Hub, no animate-glow-pulse, no cyan borders, no soft-shadow 8px-radius cards, no PageTransition.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec. No shared data models.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_install_dismissed` | Read + Write | Permanent dismissal timestamp (existing key, existing behavior) |
| `wr_visit_count` | Read | Total visit count (existing key, read-only by install prompt) |
| `wr_session_counted` | Read (sessionStorage) | Session guard (existing key, read-only) |
| `wr_install_dashboard_shown` | Read | Dashboard card shown flag (existing key, read-only) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Install prompt: full-width card with 16px side margins, pinned to bottom. Offline indicator: small pill bottom-left with `env(safe-area-inset-bottom)`. Offline notices: full-width centered. iOS instructions: visual share icon reference. |
| Tablet | 768px | Install prompt: max-width ~480px, centered at bottom. Offline indicator: same position. Offline notices: centered with `max-w-lg`. |
| Desktop | 1440px | Install prompt: max-width ~480px, pinned bottom-center. Offline indicator: bottom-left corner. Offline notices: centered with `max-w-lg`. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The install prompt has vertically stacked actions. The offline indicator is a single pill. The offline notice is centered block content.

---

## Vertical Rhythm

N/A — BB-39 adds fixed-position overlays (install prompt, offline indicator) and full-page takeover notices (offline notice). These do not participate in page vertical rhythm.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `vite-plugin-pwa` is installed (`package.json` verified)
- [x] `useOnlineStatus` hook exists with 5 tests (no new hook needed)
- [x] `InstallPromptProvider` exists with full context (will be enhanced, not rewritten)
- [x] `OfflineMessage.tsx` exists (will remain for inline use; new `OfflineNotice` for full-page)
- [x] All auth-gated actions from the spec accounted for (zero — none needed)
- [x] Design system values verified from design-system.md recon + spec Design Notes
- [x] No [UNVERIFIED] values — all values sourced from spec Design Notes or design system recon
- [x] No deprecated patterns used
- [x] Bible data size measured: 6.0MB raw `web/` (production), 23MB raw cross-references (production), ~3MB total gzipped precache
- [x] Existing icons verified: 192, 512, apple-touch-icon exist. 256, 384, maskable need creation.
- [ ] Run `pnpm test` to capture baseline test count before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bible data precache approach | Precache everything (web/ + cross-refs via existing `**/*.js` glob) | Total gzipped transfer ~3MB, well within spec's 8MB threshold. Background precache doesn't block first load. |
| `navigateFallback` fix | Change from `/offline.html` to `/index.html` | Current `/offline.html` is wrong for SPA — it would serve the static offline page instead of the React app shell for navigation requests. `/index.html` is the correct SPA fallback. `offline.html` remains as a static asset but isn't the navigation fallback. |
| Session-only dismissal storage | React state (not sessionStorage) | Spec says "Not now" dismisses for the current session. React state is the simplest — lost on page refresh, which is the right behavior. No need for sessionStorage. |
| Install prompt vs InstallBanner | REPLACE InstallBanner with new InstallPrompt | Spec designs a new fixed-bottom card that supersedes the Navbar-embedded banner. Keeping both would create competing install UIs. |
| Pages excluded from install prompt | BibleReader (`/bible/:book/:chapter`), AskPage (`/ask`) | Spec says "NOT on: BibleReader mid-read, Ask/Explain/Reflect pages." Explain/Reflect are modals within the Bible reader, not separate routes, so excluding BibleReader covers them. |
| Network-only page list | Prayer Wall (all sub-routes), Ask | These are the only pages that conceptually require network. Bible, Daily Hub, Music, Grow, meditation pages all work with bundled/precached data. |
| Offline notice in Phase 2 | Show notice when `!isOnline` even though mock data works | Forward-looking: prepares users for the Phase 3 experience where these features genuinely need network. Users offline on Prayer Wall or Ask would get a branded notice instead of mock data that might confuse them. |
| Cross-reference precaching | Include (don't exclude) | 1.7MB gzipped is marginal. Excluding would require `manualChunks` naming convention + `globIgnores` complexity. Including means cross-references work offline too. |
| Icon generation approach | Resize existing `icon-512.png` programmatically via sharp or canvas | Existing 512px icon has the right design. Scaling down and adding maskable padding is straightforward. |
| `manifest: false` → generated | Switch to `manifest: { ... }` in vite config, delete static `public/manifest.json` | Plugin-generated manifest is maintained alongside code, not a separate file that can drift. |

---

## Implementation Steps

### Step 1: Precache Strategy Documentation

**Objective:** Create the `_plans/recon/bb39-pwa-strategy.md` documentation artifact required by acceptance criteria, documenting final precache manifest contents, runtime caching rules, network-only route list, and install prompt trigger logic.

**Files to create/modify:**
- `_plans/recon/bb39-pwa-strategy.md` — CREATE

**Details:**

Document the following sections:
1. **Precache Manifest Contents** — app shell (HTML, JS bundles, CSS), Bible `web/` data (66 files, 6.0MB raw, ~1MB gzipped as JS chunks), Bible cross-references (66 files, 23MB raw, ~1.7MB gzipped as JS chunks), OG card image (`og-default.png`, 100KB), app icons (5 files), font files (none local — Google Fonts via runtime cache).
2. **Build Size Impact** — total precache transfer ~3MB gzipped. Document the measurement method: `du -sh frontend/src/data/bible/web/` for raw, `find ... -exec gzip -c {} \; | wc -c` for compressed estimation.
3. **Runtime Caching Rules** — Google Fonts (StaleWhileRevalidate + CacheFirst), images (CacheFirst, 30-day expiry), audio (CacheFirst with range requests), API calls (NetworkFirst with 10s timeout), same-origin catch-all (NetworkFirst).
4. **Network-Only Routes** — `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard`, `/ask`. These show `OfflineNotice` when offline.
5. **Install Prompt Trigger Logic** — 5 conditions: 3+ distinct pages in session, not permanently dismissed, not installed, 2+ minutes elapsed, not on excluded pages (BibleReader, AskPage).
6. **navigateFallback Fix** — document the change from `/offline.html` to `/index.html` and why.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT implement any code in this step — documentation only
- Do NOT delete or modify any existing files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (none) | — | Documentation artifact only |

**Expected state after completion:**
- [x] `_plans/recon/bb39-pwa-strategy.md` exists with all sections populated
- [x] Precache sizes documented
- [x] Network-only route list documented

---

### Step 2: Create PWA Icons

**Objective:** Generate the missing PWA icon sizes (256, 384) and maskable variant. Move all icons to `public/icons/` directory per spec.

**Files to create/modify:**
- `frontend/public/icons/icon-192.png` — CREATE (copy from `public/icon-192.png`)
- `frontend/public/icons/icon-256.png` — CREATE (resize from 512)
- `frontend/public/icons/icon-384.png` — CREATE (resize from 512)
- `frontend/public/icons/icon-512.png` — CREATE (copy from `public/icon-512.png`)
- `frontend/public/icons/icon-512-maskable.png` — CREATE (512px with maskable safe zone)

**Details:**

1. Create `frontend/public/icons/` directory.
2. Write a Node.js script at `frontend/scripts/generate-icons.mjs` that:
   - Reads `frontend/public/icon-512.png` as the source icon
   - Uses the `sharp` package (install as devDependency if not present) to resize to 256 and 384
   - Creates a maskable variant: 512×512 canvas with `#08051A` background, source icon scaled to 80% (409px) centered with 51px padding on each side
   - Outputs all files to `frontend/public/icons/`
   - Copies the existing 192 and 512 unchanged
3. Run the script once to generate icons.
4. Keep existing `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` in place — they're referenced by `<link>` tags in `index.html` and the existing manifest. Step 3 will update references.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT delete existing icons from `public/` root — wait until Step 3 updates references
- Do NOT commit `node_modules` or the script's output to version control (icons are committed, script is committed)
- Do NOT use a complex icon design — resize the existing icon consistently

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (none) | — | Icon files are visual assets verified by inspection |

**Expected state after completion:**
- [x] `frontend/public/icons/` directory exists with 5 PNG files
- [x] All icons are valid PNG files at correct dimensions
- [x] Maskable variant has `#08051A` background with safe zone padding
- [x] `generate-icons.mjs` script exists and can be re-run if source icon changes

---

### Step 3: Update vite.config.ts — Manifest and Workbox Configuration

**Objective:** Switch from static `public/manifest.json` to plugin-generated manifest with all required fields. Fix the `navigateFallback` bug. Refine Workbox caching strategies.

**Files to create/modify:**
- `frontend/vite.config.ts` — MODIFY (VitePWA plugin configuration)
- `frontend/public/manifest.json` — DELETE (replaced by generated manifest)

**Details:**

1. In `vite.config.ts`, change the VitePWA `manifest` from `false` to a complete manifest object:
   ```typescript
   manifest: {
     name: 'Worship Room',
     short_name: 'Worship Room',
     description: 'A safe place to heal, grow, and connect with God',
     start_url: '/',
     display: 'standalone',
     theme_color: '#08051A',
     background_color: '#08051A',
     orientation: 'portrait-primary',
     categories: ['books', 'lifestyle', 'education'],
     icons: [
       { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
       { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
       { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
       { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
       { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
       { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
     ],
   },
   ```

2. Update `includeAssets` to reference new icon paths:
   ```typescript
   includeAssets: ['apple-touch-icon.png', 'icons/*.png', 'og-default.png'],
   ```

3. Fix `navigateFallback` from `/offline.html` to `/index.html`:
   ```typescript
   navigateFallback: '/index.html',
   ```
   Keep `navigateFallbackDenylist: [/^\/api\//]` unchanged.

4. Keep all existing runtime caching rules unchanged — they're already correct:
   - Google Fonts: StaleWhileRevalidate (stylesheets) + CacheFirst (webfonts)
   - `/api/`: NetworkFirst with 10s timeout
   - Images: CacheFirst with 30-day expiry
   - Audio: CacheFirst with range requests
   - Same-origin catch-all: NetworkFirst

5. Delete `frontend/public/manifest.json` — the plugin generates `manifest.webmanifest` in the build output.

6. Update `frontend/index.html` if it has a `<link rel="manifest">` tag pointing to `manifest.json` — the plugin handles this automatically, so remove any manual `<link rel="manifest">`. Also update any `<link rel="icon">` tags to reference `/icons/` paths.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT change `registerType: 'prompt'` — it must stay prompt-based for the UpdatePrompt component to work
- Do NOT remove existing runtime caching rules — they're all still needed
- Do NOT change `globPatterns` — `['**/*.{js,css,html,ico,png,svg,woff2}']` already covers everything including Bible data chunks
- Do NOT add `manifest.webmanifest` to `.gitignore` — it's a build output, not a source file
- Do NOT change Vite build options (`rollupOptions`, `chunkSizeWarningLimit`, etc.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build verification | integration | `pnpm build` succeeds with 0 errors, 0 warnings |
| Manifest output | integration | After `pnpm build`, `dist/manifest.webmanifest` contains all required fields (name, short_name, display, theme_color, background_color, icons with 5 sizes + maskable, categories) |

**Expected state after completion:**
- [x] `vite.config.ts` has full manifest object with all spec-required fields
- [x] `public/manifest.json` deleted
- [x] `navigateFallback` changed to `/index.html`
- [x] `pnpm build` produces `dist/manifest.webmanifest` with correct contents
- [x] Existing icons still referenced correctly
- [x] `public/offline.html` remains as a static fallback asset (not the SW navigation fallback)

---

### Step 4: Add Z-Index Constants and Create OfflineIndicator Component

**Objective:** Create the persistent offline indicator pill that appears bottom-left when the user loses connectivity. Add z-index constants for BB-39 components.

**Files to create/modify:**
- `frontend/src/constants/z-index.ts` — MODIFY (add 2 constants)
- `frontend/src/components/pwa/OfflineIndicator.tsx` — CREATE
- `frontend/src/components/pwa/__tests__/OfflineIndicator.test.tsx` — CREATE

**Details:**

1. Add to `z-index.ts`:
   ```typescript
   /** Offline status indicator */
   OFFLINE_INDICATOR: 50,
   /** Install prompt card */
   INSTALL_PROMPT: 9997,
   ```
   `OFFLINE_INDICATOR` at 50 (below OVERLAY at 60) — it's persistent but shouldn't block overlays. `INSTALL_PROMPT` at 9997 (below UPDATE_PROMPT at 9998) — install prompt sits below the update prompt in z-order.

2. Create `OfflineIndicator.tsx`:
   ```tsx
   import { WifiOff } from 'lucide-react'
   import { useOnlineStatus } from '@/hooks/useOnlineStatus'
   import { Z } from '@/constants/z-index'

   export function OfflineIndicator() {
     const { isOnline } = useOnlineStatus()

     if (isOnline) return null

     return (
       <div
         role="status"
         aria-live="polite"
         className="fixed z-[${Z.OFFLINE_INDICATOR}] rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 flex items-center gap-2"
         style={{
           bottom: `max(16px, env(safe-area-inset-bottom, 0px))`,
           left: `max(16px, env(safe-area-inset-left, 0px))`,
         }}
       >
         <WifiOff className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
         <span className="text-xs text-white/70">Offline</span>
       </div>
     )
   }
   ```
   - Fixed position bottom-left with safe area insets
   - Uses existing `useOnlineStatus` hook
   - `role="status"` with `aria-live="polite"` for screen reader announcement
   - Renders `null` when online — automatic show/hide via online/offline events
   - Does NOT overlap the ambient pill FAB (which is bottom-right)

3. Test file: 5+ tests covering:
   - Does not render when online
   - Renders when offline (mock `navigator.onLine = false`)
   - Disappears when connection restores (dispatch `online` event)
   - Has correct ARIA attributes (`role="status"`, `aria-live="polite"`)
   - Contains WifiOff icon and "Offline" text

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Fixed bottom-left at `(16px, 16px)` from corner
- Tablet (768px): Same position
- Mobile (375px): Same position, respects `env(safe-area-inset-bottom)` for notch devices

**Guardrails (DO NOT):**
- Do NOT position at bottom-right — that's where the ambient pill FAB lives
- Do NOT use z-index higher than OVERLAY (60) — the indicator is informational, not blocking
- Do NOT add close/dismiss functionality — it disappears automatically when online
- Do NOT use `aria-live="assertive"` — going offline is important but not crisis-level (reserve assertive for crisis alerts)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `does not render when online` | unit | Mock `isOnline: true`, verify container not in DOM |
| `renders offline pill when offline` | unit | Mock `isOnline: false`, verify "Offline" text and WifiOff icon |
| `disappears when connection restores` | unit | Start offline, dispatch `online` event, verify removal |
| `has correct ARIA attributes` | unit | Check `role="status"` and `aria-live="polite"` |
| `pill contains WifiOff icon` | unit | Verify the WifiOff icon element exists |

**Expected state after completion:**
- [x] `OfflineIndicator` component renders correctly for online/offline states
- [x] Z-index constants added for OFFLINE_INDICATOR and INSTALL_PROMPT
- [x] 5+ tests pass

---

### Step 5: Create OfflineNotice Full-Page Component

**Objective:** Create a branded full-page offline notice that network-dependent pages show when the user is offline. Uses the `FeatureEmptyState` pattern with offline-specific content.

**Files to create/modify:**
- `frontend/src/components/pwa/OfflineNotice.tsx` — CREATE
- `frontend/src/components/pwa/__tests__/OfflineNotice.test.tsx` — CREATE

**Details:**

1. Create `OfflineNotice.tsx`:
   ```tsx
   import { WifiOff } from 'lucide-react'
   import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

   interface OfflineNoticeProps {
     /** Human-readable feature name, e.g. "Prayer Wall" */
     featureName: string
     /** Offline-capable route to link the user to, e.g. "/bible" */
     fallbackRoute?: string
     /** CTA label for the fallback link, e.g. "Read the Bible" */
     fallbackLabel?: string
   }

   export function OfflineNotice({
     featureName,
     fallbackRoute = '/bible',
     fallbackLabel = 'Read the Bible',
   }: OfflineNoticeProps) {
     return (
       <div className="flex min-h-[60vh] items-center justify-center px-4">
         <FeatureEmptyState
           icon={WifiOff}
           heading="You're offline"
           description={`${featureName} needs an internet connection. Your saved content and the full Bible are still available offline.`}
           ctaLabel={fallbackLabel}
           ctaHref={fallbackRoute}
         />
       </div>
     )
   }
   ```
   - Warm, caring copy — not a system error message
   - Links to an offline-capable route (Bible reader by default)
   - Uses `FeatureEmptyState` for consistent empty-state styling
   - Centered vertically in a `min-h-[60vh]` container

2. Test file: 5+ tests covering:
   - Renders heading "You're offline"
   - Renders feature name in description
   - Renders fallback CTA with correct link
   - Custom fallback route/label work
   - Has WifiOff icon

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Centered content with `max-w-sm` (from FeatureEmptyState)
- Tablet (768px): Same, centered
- Mobile (375px): Full-width with `px-6` padding (from FeatureEmptyState)

**Guardrails (DO NOT):**
- Do NOT show generic system error text — copy must be warm and caring
- Do NOT include retry/refresh functionality — the offline indicator (Step 4) handles reconnection status
- Do NOT show this for features that work offline (Bible, Daily Hub, Music, etc.)
- Do NOT style differently from FeatureEmptyState — consistency with existing empty states is important

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders "You're offline" heading` | unit | Verify heading text |
| `includes feature name in description` | unit | Pass `featureName="Prayer Wall"`, verify in description |
| `renders fallback CTA link` | unit | Verify CTA button with correct href |
| `uses custom fallback route and label` | unit | Pass custom props, verify rendered |
| `renders WifiOff icon` | unit | Verify icon element exists |

**Expected state after completion:**
- [x] `OfflineNotice` component matches the `FeatureEmptyState` pattern
- [x] Warm, caring copy with feature-specific messaging
- [x] 5+ tests pass

---

### Step 6: Enhance InstallPromptProvider with BB-39 Trigger Rules

**Objective:** Update `InstallPromptProvider` and its context type to support the spec's 5 trigger rules: 3+ distinct pages in session, not permanently dismissed, not installed, 2+ minutes elapsed, not on excluded pages. Add session-only dismissal.

**Files to create/modify:**
- `frontend/src/contexts/InstallPromptContext.ts` — MODIFY (add new context fields)
- `frontend/src/contexts/InstallPromptProvider.tsx` — MODIFY (add new state and logic)
- `frontend/src/hooks/useInstallPrompt.ts` — VERIFY (may need update if context shape changed)

**Details:**

1. Update `InstallPromptContextValue` in `InstallPromptContext.ts`:
   ```typescript
   export interface InstallPromptContextValue {
     // Existing fields (keep all)
     isInstallable: boolean
     isInstalled: boolean
     isIOS: boolean
     visitCount: number
     isDismissed: boolean              // permanent dismissal
     isDashboardCardShown: boolean
     promptInstall: () => Promise<'accepted' | 'dismissed' | null>
     dismissBanner: () => void          // permanent dismissal (existing — rename to dismissPermanently in the implementation but keep dismissBanner as alias for backward compat)
     markDashboardCardShown: () => void
     // New BB-39 fields
     sessionPageCount: number           // distinct pages visited in current session
     sessionElapsedMs: number           // ms since session started (for 2-min rule)
     isSessionDismissed: boolean        // session-only dismissal
     dismissSession: () => void         // dismiss for current session only
     shouldShowPrompt: (pathname: string) => boolean  // evaluates all 5 rules
   }
   ```

2. Update `InstallPromptProvider.tsx`:
   - Add `sessionPageCount` state (initialized to 0). Track via `useEffect` with a `Set<string>` ref that accumulates distinct pathnames as the user navigates. Listen to `location.pathname` changes (requires `useLocation` from react-router — but the provider is inside `BrowserRouter` so this works).
   
   Actually, `InstallPromptProvider` is inside `BrowserRouter` in `App.tsx:163-167`. But `useLocation` requires being inside a `<Router>`. Let me verify the component tree: `BrowserRouter` → `AuthProvider` → `InstallPromptProvider`. Yes, `useLocation` will work.

   - Add `sessionStartTime` ref (initialized to `Date.now()` on mount). Compute `sessionElapsedMs` reactively or expose via the `shouldShowPrompt` function.
   - Add `isSessionDismissed` state (initialized to `false`). Resets on page refresh by design (React state only).
   - Add `dismissSession` callback: `() => setIsSessionDismissed(true)`.
   - Add `shouldShowPrompt(pathname: string)` function that returns `true` only when ALL 5 conditions are met:
     1. `sessionPageCount >= 3`
     2. `!isDismissed` (not permanently dismissed)
     3. `!installed` (not in standalone mode)
     4. `Date.now() - sessionStartTime.current >= 120_000` (2 minutes elapsed)
     5. `!EXCLUDED_PATHS_RE.test(pathname)` where `EXCLUDED_PATHS_RE = /^\/bible\/[^/]+\/\d+$|^\/ask$/` (BibleReader route pattern + Ask page)
     
     Also require: `(promptAvailable || ios)` (browser supports install) AND `!isSessionDismissed`.

   - Track distinct page visits: use `useLocation()` and a `Set<string>` ref. On each `location.pathname` change, add to the set and update `sessionPageCount` state.

3. Verify `useInstallPrompt.ts` — the hook reads from context. If the context shape changed (added fields), the hook's return type automatically includes them via `InstallPromptContextValue`. The fallback value (when used outside provider) needs the new fields with safe defaults:
   ```typescript
   sessionPageCount: 0,
   sessionElapsedMs: 0,
   isSessionDismissed: false,
   dismissSession: () => {},
   shouldShowPrompt: () => false,
   ```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT break existing `dismissBanner` behavior — it must still set `wr_install_dismissed` permanently
- Do NOT remove any existing context fields — `isDismissed`, `visitCount`, `isDashboardCardShown` are all still used by `InstallCard` and potentially `InstallBanner` tests
- Do NOT use sessionStorage for session dismissal — React state is simpler and correct (lost on refresh = new session)
- Do NOT track `sessionPageCount` across page refreshes — each browser session starts at 0

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `sessionPageCount tracks distinct pages` | unit | Navigate to 3 different paths, verify count = 3 |
| `sessionPageCount does not double-count same page` | unit | Navigate to same path twice, verify count = 1 |
| `dismissSession sets isSessionDismissed` | unit | Call dismissSession, verify isSessionDismissed = true |
| `shouldShowPrompt returns false when < 3 pages` | unit | Set sessionPageCount = 2, verify false |
| `shouldShowPrompt returns false when permanently dismissed` | unit | Set isDismissed = true, verify false |
| `shouldShowPrompt returns false when installed` | unit | Set isInstalled = true, verify false |
| `shouldShowPrompt returns false when < 2 minutes elapsed` | unit | Mock Date.now to be < 2 min from start, verify false |
| `shouldShowPrompt returns false on excluded path /bible/genesis/1` | unit | Pass excluded path, verify false |
| `shouldShowPrompt returns false on excluded path /ask` | unit | Pass `/ask`, verify false |
| `shouldShowPrompt returns true when all conditions met` | unit | Set all conditions satisfied, verify true |
| `existing dismissBanner still works` | unit | Call dismissBanner, verify wr_install_dismissed written |
| `existing promptInstall still works` | unit | Fire beforeinstallprompt, call promptInstall, verify outcome |

**Expected state after completion:**
- [x] `InstallPromptContextValue` has new fields
- [x] `InstallPromptProvider` tracks session page count, elapsed time, session dismissal
- [x] `shouldShowPrompt` evaluates all 5 spec rules
- [x] All existing `useInstallPrompt` tests still pass
- [x] 12+ new/updated tests pass

---

### Step 7: Create InstallPrompt Component (Replaces InstallBanner)

**Objective:** Create the new fixed-bottom install prompt card with the spec's design: frosted glass card, Install/Not now/Don't ask again actions, iOS Safari variant with manual instructions. This component replaces `InstallBanner` in the UI.

**Files to create/modify:**
- `frontend/src/components/pwa/InstallPrompt.tsx` — CREATE
- `frontend/src/components/pwa/__tests__/InstallPrompt.test.tsx` — CREATE

**Details:**

1. Create `InstallPrompt.tsx`:
   - Uses `useInstallPrompt()` to get `shouldShowPrompt`, `isIOS`, `promptInstall`, `dismissSession`, `dismissBanner` (permanent)
   - Uses `useLocation()` to get current `pathname` for the excluded-page check
   - Renders only when `shouldShowPrompt(pathname)` returns `true`
   - Fixed position bottom-center:
     ```
     fixed bottom-4 left-1/2 -translate-x-1/2
     w-[calc(100%-32px)] sm:w-auto sm:max-w-[480px]
     z-[Z.INSTALL_PROMPT]
     ```
   - Card styling (spec's frosted glass): `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4`
   - Content layout:
     ```
     <p className="text-white text-base font-medium">
       Install Worship Room for offline reading and faster access
     </p>
     <div className="flex items-center gap-3 mt-3">
       {!isIOS && (
         <button onClick={handleInstall} className="[white pill CTA Pattern 1]">
           Install
         </button>
       )}
       <button onClick={dismissSession} className="text-white/60 text-sm min-h-[44px]">
         Not now
       </button>
     </div>
     <button onClick={dismissBanner} className="text-white/40 text-xs mt-2 hover:underline">
       Don't ask again
     </button>
     ```
   - iOS Safari variant: replace Install button and value proposition with step-by-step instructions:
     ```
     <p>Add Worship Room to your Home Screen:</p>
     <ol>
       <li>Tap the Share icon (box with arrow)</li>
       <li>Scroll down and tap "Add to Home Screen"</li>
     </ol>
     ```
     Include an inline SVG or Lucide `Share` icon as visual reference.
   - All buttons have `min-h-[44px]` touch targets
   - Focus management: "Don't ask again" link must be keyboard-reachable (tab order after other buttons)
   - Entrance animation: `motion-safe:animate-fade-in` (match UpdatePrompt pattern)
   - Does NOT overlap ambient pill FAB (ambient pill is bottom-right; install prompt is bottom-center with max-width, so no overlap at any viewport width)

2. Test file: 10+ tests covering all trigger rules, dismissal types, iOS variant, and accessibility:

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): `max-w-[480px]` centered at bottom with `bottom-4`
- Tablet (768px): Same max-width, centered
- Mobile (375px): `w-[calc(100%-32px)]` full-width with 16px side margins, `bottom-4` with `env(safe-area-inset-bottom)` via style prop

**Guardrails (DO NOT):**
- Do NOT use the FrostedCard component — the spec prescribes specific card values (`bg-white/5`) that differ from FrostedCard (`bg-white/[0.06]`)
- Do NOT add auto-dismiss timer — the spec's install prompt persists until user action (unlike InstallBanner which auto-dismissed after 10s)
- Do NOT render when `shouldShowPrompt` returns false — the provider handles all 5 conditions
- Do NOT position at bottom-right — that's the ambient pill FAB's territory
- Do NOT show on BibleReader or AskPage routes (handled by `shouldShowPrompt`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `does not render when shouldShowPrompt returns false` | unit | Mock shouldShowPrompt → false, verify not rendered |
| `renders when shouldShowPrompt returns true` | unit | Mock shouldShowPrompt → true, verify card visible |
| `Install button calls promptInstall` | unit | Click Install, verify promptInstall called |
| `Not now calls dismissSession` | unit | Click "Not now", verify dismissSession called |
| `Don't ask again calls dismissBanner (permanent)` | unit | Click "Don't ask again", verify dismissBanner called |
| `shows success toast on accepted install` | unit | Mock promptInstall → 'accepted', verify toast |
| `iOS variant shows Add to Home Screen instructions` | unit | Mock isIOS = true, verify instructions text |
| `iOS variant does not show Install button` | unit | Mock isIOS = true, verify no Install button |
| `all interactive elements have min-h-[44px]` | unit | Check className of buttons |
| `has correct ARIA role` | unit | Verify `role="complementary"` or `role="region"` |
| `does not render on /bible/:book/:chapter` | unit | Mock pathname to BibleReader route, verify not rendered |
| `does not render on /ask` | unit | Mock pathname to /ask, verify not rendered |

**Expected state after completion:**
- [x] `InstallPrompt` component renders with frosted glass card design
- [x] Three distinct actions: Install (non-iOS), Not now (session), Don't ask again (permanent)
- [x] iOS Safari variant with step-by-step instructions
- [x] All 5 trigger rules evaluated via `shouldShowPrompt`
- [x] 12+ tests pass

---

### Step 8: Wire OfflineNotice to Network-Dependent Pages

**Objective:** Add offline awareness to network-dependent pages (Prayer Wall, Ask). When offline, these pages show the `OfflineNotice` component instead of their regular content.

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — MODIFY (add offline check at top)
- `frontend/src/pages/AskPage.tsx` — MODIFY (add offline check at top)

**Details:**

1. In each page component, add at the top of the render function:
   ```tsx
   import { useOnlineStatus } from '@/hooks/useOnlineStatus'
   import { OfflineNotice } from '@/components/pwa/OfflineNotice'

   // Inside the component:
   const { isOnline } = useOnlineStatus()
   
   if (!isOnline) {
     return (
       <OfflineNotice
         featureName="Prayer Wall"  // or "Ask"
         fallbackRoute="/bible"
         fallbackLabel="Read the Bible"
       />
     )
   }
   ```

2. For `PrayerWall.tsx`:
   - `featureName="Prayer Wall"`
   - `fallbackRoute="/daily"`
   - `fallbackLabel="Go to Daily Hub"`

3. For `AskPage.tsx`:
   - `featureName="Ask"`
   - `fallbackRoute="/bible"`
   - `fallbackLabel="Read the Bible"`

4. Prayer Wall sub-routes (`/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard`) are separate page components. Add the same offline check to `PrayerDetail.tsx`, `PrayerWallProfile.tsx`, and `PrayerWallDashboard.tsx` — all with `featureName="Prayer Wall"`.

**Auth gating:** N/A — offline check runs before auth checks.

**Responsive behavior:** N/A — OfflineNotice handles its own responsive behavior (Step 5).

**Guardrails (DO NOT):**
- Do NOT add offline checks to pages that work offline: Daily Hub, Bible, Music, Grow, meditation pages, Dashboard, Settings, Friends, Insights, Local Support
- Do NOT wrap the offline check in `useEffect` — it's a synchronous render-time check
- Do NOT change any existing page logic — the offline check is an early return before existing content
- Do NOT add offline checks to redirect routes (e.g., `/pray` → `/daily?tab=pray`) — they don't render content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWall shows OfflineNotice when offline` | integration | Mock useOnlineStatus → offline, render PrayerWall, verify "You're offline" heading |
| `PrayerWall shows regular content when online` | integration | Mock useOnlineStatus → online, verify prayer wall renders |
| `AskPage shows OfflineNotice when offline` | integration | Mock useOnlineStatus → offline, render AskPage, verify "You're offline" heading |
| `AskPage shows regular content when online` | integration | Mock useOnlineStatus → online, verify ask page renders |

**Expected state after completion:**
- [x] Prayer Wall (all sub-routes) shows offline notice when `!isOnline`
- [x] Ask page shows offline notice when `!isOnline`
- [x] All other pages continue to work offline without notices
- [x] 4+ tests pass

---

### Step 9: Wire OfflineIndicator and InstallPrompt to App.tsx, Remove InstallBanner

**Objective:** Mount `OfflineIndicator` and `InstallPrompt` in `App.tsx`. Remove the old `InstallBanner` from `Navbar.tsx` and clean up references.

**Files to create/modify:**
- `frontend/src/App.tsx` — MODIFY (add OfflineIndicator and InstallPrompt)
- `frontend/src/components/Navbar.tsx` — MODIFY (remove InstallBanner import and usage)
- `frontend/src/components/pwa/InstallBanner.tsx` — DELETE
- `frontend/src/components/pwa/__tests__/InstallBanner.test.tsx` — DELETE

**Details:**

1. In `App.tsx`, add imports and mount components alongside `UpdatePrompt` and `MidnightVerse`:
   ```tsx
   import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
   import { InstallPrompt } from '@/components/pwa/InstallPrompt'
   
   // Inside the provider tree, alongside existing global components:
   <MidnightVerse />
   <UpdatePrompt />
   <OfflineIndicator />
   <InstallPrompt />
   ```
   Both components are self-contained — they read their own state from hooks and render/hide themselves.

2. In `Navbar.tsx`:
   - Remove `import { InstallBanner } from '@/components/pwa/InstallBanner'` (line 13)
   - Remove `<InstallBanner />` (line 235)
   - No other changes to Navbar

3. Delete `InstallBanner.tsx` — fully replaced by `InstallPrompt.tsx`.

4. Delete `InstallBanner.test.tsx` (199 lines) — test coverage moved to `InstallPrompt.test.tsx`.

5. Update `Navbar-offline.test.tsx` if it references `InstallBanner` — remove any test cases about the banner since it no longer exists in the Navbar. Check the test file for references.

6. `InstallCard.tsx` (dashboard card) is NOT deleted — it serves a different purpose (shows on dashboard after banner dismissal for non-iOS users). It uses `useInstallPrompt` which still provides `isDismissed`, `isDashboardCardShown`, etc. Verify it still works with the updated context.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact (mounting is structural, not visual).

**Guardrails (DO NOT):**
- Do NOT delete `InstallCard.tsx` — it's a separate dashboard component that still works
- Do NOT delete `InstallPromptProvider` or `InstallPromptContext` — they're enhanced, not replaced
- Do NOT delete `useInstallPrompt.ts` — still used by InstallPrompt, InstallCard, and settings
- Do NOT change UpdatePrompt — it handles SW updates, not install
- Do NOT remove `InstallPromptProvider` wrapping from App.tsx — it's still needed

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `OfflineIndicator renders in App` | integration | Mock offline status, verify indicator appears at document level |
| `InstallPrompt renders in App` | integration | Mock install prompt conditions, verify card appears |
| `Navbar no longer renders InstallBanner` | unit | Render Navbar, verify no InstallBanner in output |
| `InstallCard still works with updated context` | unit | Render InstallCard with updated provider, verify it still renders correctly |

**Expected state after completion:**
- [x] `OfflineIndicator` and `InstallPrompt` mounted in App.tsx
- [x] `InstallBanner` removed from Navbar and deleted
- [x] `InstallBanner.test.tsx` deleted
- [x] `InstallCard` still works
- [x] All existing tests pass (minus deleted InstallBanner tests)

---

### Step 10: Test Suite Verification and Build Validation

**Objective:** Run the full test suite, fix any breakages from Steps 2-9, run build verification, and document the final precache size.

**Files to create/modify:**
- Various test files — FIX any failures
- `_plans/recon/bb39-pwa-strategy.md` — UPDATE with actual build metrics

**Details:**

1. Run `pnpm test` — all tests must pass. Fix any failures caused by:
   - Removed `InstallBanner` references in other test files
   - Updated `InstallPromptContextValue` type requiring new fields in mocks
   - New `useOnlineStatus` mock needed in Prayer Wall / Ask page test files
   - Any test that imports or renders `InstallBanner` must be updated to use `InstallPrompt` or deleted

2. Run `pnpm lint` — zero new warnings.

3. Run `pnpm build` — must pass with 0 errors, 0 warnings.

4. After build, measure the actual precache manifest:
   - Check `dist/manifest.webmanifest` for correct contents
   - Count and size the JS chunks that correspond to Bible data
   - Document the actual total precache size in `_plans/recon/bb39-pwa-strategy.md`

5. Verify no TypeScript errors: `pnpm tsc --noEmit` (or rely on `pnpm build` which includes TS checking).

6. Grep the codebase for any remaining references to `InstallBanner` — there should be none except possibly in git history.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify tests that are failing for reasons unrelated to BB-39 (document them as pre-existing)
- Do NOT skip failing tests with `.skip` — fix them or document as pre-existing
- Do NOT change the test framework or setup

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `full test suite passes` | integration | `pnpm test` exits with 0 failures |
| `build succeeds` | integration | `pnpm build` exits with 0 errors |
| `manifest.webmanifest is correct` | integration | After build, verify file contains all required fields |

**Expected state after completion:**
- [x] All tests pass (total count documented)
- [x] Build passes with 0 errors, 0 warnings
- [x] `manifest.webmanifest` in build output contains all spec-required fields
- [x] Precache size documented
- [x] No lint warnings
- [x] No TypeScript errors
- [x] Zero references to deleted `InstallBanner`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Precache strategy documentation |
| 2 | — | Create PWA icons |
| 3 | 2 | Update vite.config.ts (needs icons at new paths) |
| 4 | — | OfflineIndicator component |
| 5 | — | OfflineNotice component |
| 6 | — | Enhance InstallPromptProvider |
| 7 | 6 | InstallPrompt component (needs updated provider) |
| 8 | 5 | Wire OfflineNotice to pages (needs OfflineNotice component) |
| 9 | 4, 7 | Wire everything to App.tsx + remove InstallBanner |
| 10 | 1-9 | Final verification |

**Parallelizable groups:**
- Steps 1, 2, 4, 5, 6 can all run in parallel (no dependencies between them)
- Step 3 depends only on Step 2
- Step 7 depends only on Step 6
- Step 8 depends only on Step 5
- Step 9 depends on Steps 4 and 7
- Step 10 is the final sequential gate

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Precache strategy documentation | [COMPLETE] | 2026-04-12 | Created `_plans/recon/bb39-pwa-strategy.md` with all 6 sections. |
| 2 | Create PWA icons | [COMPLETE] | 2026-04-12 | Updated `scripts/generate-icons.mjs`, generated 5 icons in `public/icons/` (192, 256, 384, 512, 512-maskable). sharp already installed. |
| 3 | Update vite.config.ts | [COMPLETE] | 2026-04-12 | Switched `manifest: false` → full manifest object. Fixed `navigateFallback: '/offline.html'` → `'/index.html'`. Updated `includeAssets`. Deleted `public/manifest.json`. Removed `<link rel="manifest">` from index.html. Updated theme-color meta to `#08051A`. Build produces correct `dist/manifest.webmanifest`. Precache: 407 entries (23,253 KiB). |
| 4 | OfflineIndicator component | [COMPLETE] | 2026-04-12 | Created `OfflineIndicator.tsx` + 5 tests. Added `OFFLINE_INDICATOR: 50` and `INSTALL_PROMPT: 9997` to z-index.ts. |
| 5 | OfflineNotice component | [COMPLETE] | 2026-04-12 | Created `OfflineNotice.tsx` (uses FeatureEmptyState) + 5 tests. |
| 6 | Enhance InstallPromptProvider | [COMPLETE] | 2026-04-12 | Added 4 new fields to context: `sessionPageCount`, `isSessionDismissed`, `dismissSession`, `shouldShowPrompt`. Provider now uses `useLocation` for page tracking. Added `MemoryRouter` wrapper to existing tests. 17 total tests pass (9 existing + 8 new). **Design choice (2-min timing):** The spec's "2 minutes elapsed" rule is evaluated inside `shouldShowPrompt()` via `Date.now() - sessionStartRef.current`. This fires on each render, which in practice means on each route navigation (since `InstallPrompt` re-renders on `useLocation` changes). A user sitting on one page for 5+ minutes without navigating will not see the prompt until they naturally move to another page. This is intentional — the spec says "contextually appropriate moment" and a page navigation IS that moment; interrupting a focused reading session with an install card would violate the app's "sanctuary" principle. Dropped `sessionElapsedMs` from the context interface (plan mentioned it as optional) since the time check lives entirely inside `shouldShowPrompt`. |
| 7 | InstallPrompt component | [COMPLETE] | 2026-04-12 | Created `InstallPrompt.tsx` (fixed bottom-center card, iOS variant with Share instructions) + 12 tests. Uses `shouldShowPrompt(pathname)` for all 5 trigger rules. |
| 8 | Wire OfflineNotice to pages | [COMPLETE] | 2026-04-12 | Added offline guard to 5 pages: PrayerWall, AskPage, PrayerDetail, PrayerWallProfile, PrayerWallDashboard. Created 2 offline test files (6 tests). |
| 9 | Wire to App.tsx + remove InstallBanner | [COMPLETE] | 2026-04-12 | Mounted OfflineIndicator + InstallPrompt in App.tsx. Removed InstallBanner import/usage from Navbar.tsx. Deleted InstallBanner.tsx + InstallBanner.test.tsx. Zero remaining InstallBanner references. |
| 10 | Test suite verification + build | [COMPLETE] | 2026-04-12 | Rewrote manifest.test.ts to parse vite config (10 tests). **Baseline:** 7 failed files / 44 failed / 7589 passed / 7633 total. **Final:** 7 failed files / 44 failed / 7612 passed / 7656 total. **Delta:** +23 new tests, 0 new failures. Build: 0 errors, 407 precache entries (23,253 KiB). Lint: 21 problems (16 errors, 5 warnings) — improved by 1 vs baseline (deleted InstallBanner). |
