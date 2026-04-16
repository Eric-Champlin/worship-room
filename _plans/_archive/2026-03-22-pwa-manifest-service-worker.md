# Implementation Plan: PWA Manifest, Service Worker & Offline Fallback

**Spec:** `_specs/pwa-manifest-service-worker.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/pwa-manifest-service-worker`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Frontend root:** `frontend/` — React 18 + TypeScript + Vite 5 + TailwindCSS
- **Public assets:** `frontend/public/` — currently contains `audio/` (ambient/artwork/scripture/stories), `font-preview.html`, `logo-preview.html`. No existing manifest or service worker files.
- **Entry point:** `frontend/src/main.tsx` — simple ReactDOM.createRoot, no service worker registration
- **HTML template:** `frontend/index.html` — minimal, no manifest link or apple-touch-icon meta tags
- **Vite config:** `frontend/vite.config.ts` — uses `@vitejs/plugin-react`, no PWA plugin yet
- **Test setup:** `frontend/src/test/setup.ts` — jsdom environment with matchMedia, IntersectionObserver, ResizeObserver mocks

### Provider Hierarchy (App.tsx)

```
QueryClientProvider > BrowserRouter > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes
```

### Toast System (`components/ui/Toast.tsx`)

- Standard toasts: `showToast(message, type)` where type is `'success' | 'error' | 'warning'`
- Celebration toasts: `showCelebrationToast(name, message, type, icon)`
- Positioned: standard at `fixed top-4 right-4 z-50`, celebration at `fixed bottom-4 z-50`
- Auto-dismiss: 6000ms standard, 4000-5000ms celebration
- **Does NOT support persistent toasts with action buttons** — the update prompt will need a standalone component

### AudioPill Positioning

- `fixed z-[9999]` at bottom center (mobile) / bottom-right (desktop)
- Uses `mb-[max(24px,calc(env(safe-area-inset-bottom)+8px))]` for safe area on mobile
- Desktop: `lg:right-6 lg:bottom-6`
- Height: 56px (h-14)

### Ambient Audio Files

No ambient MP3s exist in `public/audio/ambient/` — only a `.gitkeep`. Audio is loaded from CDN via `VITE_AUDIO_BASE_URL`. The spec mentions precaching ambient sounds (~1.4MB), but since there are no local files to precache, this will be noted as a future enhancement when CDN assets are available locally or a precache-from-CDN strategy is added.

### Test Patterns

- Vitest + React Testing Library + jsdom
- Test files co-located with components or in `__tests__/` directories
- Naming: `ComponentName.test.tsx`
- Provider wrapping: tests wrap with relevant providers (ToastProvider, AuthProvider, etc.)
- Mocks: `vi.mock()` for modules, `vi.fn()` for functions

---

## Auth Gating Checklist

**No auth gating.** PWA features operate at the infrastructure level below the app's auth system. All features work identically for logged-out and logged-in users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Install to home screen | No auth required | Step 1-2 | N/A |
| Receive cached pages | No auth required | Step 3 | N/A |
| See offline fallback | No auth required | Step 4 | N/A |
| See update toast | No auth required | Step 5 | N/A |
| Click "Update now" | No auth required | Step 5 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Offline page background | background-color | `#0f0a1e` | spec (dashboard dark bg) |
| Offline page accent | color | `#6D28D9` | design-system.md (primary) |
| Offline page text | color | `#FFFFFF` | design-system.md (white) |
| Offline page muted text | opacity | `0.8` | spec |
| Update toast background | background | `rgba(15, 10, 30, 0.85)` | AudioPill glassmorphic pattern |
| Update toast backdrop | backdrop-filter | `blur(8px)` | AudioPill pattern |
| Update toast border | border | `1px solid rgba(109, 40, 217, 0.4)` | AudioPill `border-primary/40` |
| Update toast button | background-color | `#6D28D9` | design-system.md (primary) |
| App icons background | fill | `#6D28D9` | spec (primary purple) |
| App icons text | fill | `#FFFFFF` | spec (white) |

---

## Design System Reminder

- Worship Room uses Inter for body/UI, Lora for scripture, Caveat for script/decorative headings
- Offline page must use system fonts only (no external dependencies)
- AudioPill is at z-[9999] — update toast must position below it
- Glassmorphic dark style: `rgba(15, 10, 30, 0.85)` + `backdrop-blur(8px)` + `border-primary/40`
- Dashboard/dark surfaces use `#0f0a1e` (hero-dark is `#0D0620`, but spec explicitly says `#0f0a1e`)
- Primary purple: `#6D28D9` — used for accent buttons, icons, theme-color

---

## Shared Data Models (from Master Plan)

Not applicable — no shared data models. This spec introduces no new localStorage keys or TypeScript interfaces consumed by other specs.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Offline page: title 1.5rem, text 0.9rem, button full-width 44px min-height. Update toast: full-width minus 32px padding |
| Tablet | 640-1024px | Offline page: title 2rem, message max-width 500px, button auto-width. Update toast: max-width 480px centered |
| Desktop | > 1024px | Offline page: title 2.5rem, message max-width 600px, button auto-width. Update toast: max-width 480px centered |

---

## Vertical Rhythm

Not applicable — offline.html is a standalone page with vertically centered content. Update toast is a fixed overlay.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] `pnpm` is available and `node_modules` is up-to-date
- [ ] No existing service worker registrations in the browser that might conflict
- [ ] No ambient MP3s in `public/audio/ambient/` — precaching ambient sounds deferred to when local files exist or CDN caching strategy is added (Spec 32)
- [ ] All auth-gated actions from the spec are accounted for (N/A — no auth gating)
- [ ] Design system values are verified (from design-system.md reference + spec explicit values)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Icons will be generated as SVG inlined in HTML build script (canvas API or sharp library) — no designer needed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ambient sound precaching | Deferred — no local files exist | Ambient audio loads from CDN via `VITE_AUDIO_BASE_URL`. Precaching CDN assets requires a different strategy (Spec 32 scope). |
| Update toast vs existing Toast system | Standalone `UpdatePrompt` component | Existing toast system doesn't support persistent toasts with action buttons. A standalone component is simpler and doesn't require modifying the shared Toast API. |
| Update toast z-index | `z-[9998]` | Must appear below AudioPill (`z-[9999]`) but above standard toasts (`z-50`). |
| Update toast bottom offset | `bottom-20` (80px) on mobile when audio pill visible | AudioPill is 56px tall + 24px bottom margin = ~80px. Toast needs to clear it. |
| Icon generation approach | Node.js build script using `canvas` package | Generates PNG icons programmatically from SVG template. Runs once, outputs to `public/`. |
| Service worker scope | Default (`/`) | Vite-plugin-pwa handles this automatically. |
| Dev mode SW registration | Disabled via `vite-plugin-pwa` `devOptions` not set | Spec requires no SW in dev mode. Plugin defaults to production-only registration. |

---

## Implementation Steps

### Step 1: Install vite-plugin-pwa and Configure Vite

**Objective:** Add vite-plugin-pwa dependency and configure the Vite build to generate a service worker with the specified caching strategies.

**Files to create/modify:**
- `frontend/package.json` — add `vite-plugin-pwa` dependency
- `frontend/vite.config.ts` — add VitePWA plugin configuration

**Details:**

Install `vite-plugin-pwa` as a dev dependency:
```bash
cd frontend && pnpm add -D vite-plugin-pwa
```

Configure `vite.config.ts` with `VitePWA` plugin:
- `registerType: 'prompt'` — don't auto-update, let user choose
- `includeAssets`: `['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']`
- `manifest: false` — we'll provide our own `manifest.json` in `public/` for full control
- `workbox.globPatterns`: `['**/*.{js,css,html,ico,png,svg,woff2}']`
- `workbox.navigateFallback`: `'/offline.html'`
- `workbox.navigateFallbackDenylist`: `[/^\/api\//]` — don't serve offline.html for API calls
- `workbox.runtimeCaching` array with 5 entries per spec:
  1. Google Fonts stylesheets: `StaleWhileRevalidate`, cache `wr-google-fonts-stylesheets`, maxEntries 10, maxAgeSeconds 365 days
  2. Google Fonts webfonts: `CacheFirst`, cache `wr-google-fonts-webfonts`, maxEntries 30, maxAgeSeconds 365 days
  3. API calls (`/api/`): `NetworkFirst`, cache `wr-api-v1`, maxEntries 100, maxAgeSeconds 7 days
  4. Images: `CacheFirst`, cache `wr-images-v1`, maxEntries 60, maxAgeSeconds 30 days
  5. All other requests: `NetworkFirst`, cache `wr-runtime-v1`, maxEntries 200, maxAgeSeconds 7 days

**Guardrails (DO NOT):**
- Do NOT enable `devOptions` — service worker must not register in dev mode
- Do NOT set `registerType: 'autoUpdate'` — spec requires user-prompted updates
- Do NOT use `injectManifest` mode — `generateSW` is simpler and sufficient
- Do NOT add `selfDestroying: true` — we want the SW to persist

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| vite.config.ts exports valid config | unit | Verify config parses without errors (build smoke test) |

**Expected state after completion:**
- [ ] `vite-plugin-pwa` installed in devDependencies
- [ ] `vite.config.ts` has VitePWA plugin with all 5 runtime caching strategies
- [ ] `pnpm build` succeeds (may warn about missing manifest/icons — those come in Step 2-3)

---

### Step 2: Create Web App Manifest and App Icons

**Objective:** Create the manifest.json file and generate PNG app icons programmatically.

**Files to create/modify:**
- `frontend/public/manifest.json` — web app manifest
- `frontend/scripts/generate-icons.mjs` — icon generation script
- `frontend/public/icon-192.png` — 192x192 app icon (generated)
- `frontend/public/icon-512.png` — 512x512 app icon (generated)
- `frontend/public/apple-touch-icon.png` — 180x180 iOS icon (generated)

**Details:**

**manifest.json** — create in `public/` with exact values from spec:
```json
{
  "name": "Worship Room",
  "short_name": "Worship Room",
  "description": "A safe place to heal, grow, and connect with God",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0a1e",
  "theme_color": "#6D28D9",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

**Icon generation script** (`scripts/generate-icons.mjs`):
- Use the `canvas` npm package (or `@napi-rs/canvas` for better ARM support) to generate icons programmatically
- Draw a rounded square with `#6D28D9` fill, corner radius ~20% of icon size
- Render "WR" in white, centered, using a bold sans-serif font (system font — Caveat-style not needed for icons)
- Generate 3 sizes: 192x192, 512x512, 180x180
- Output to `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Script is run once manually (`node scripts/generate-icons.mjs`), not as part of the build

Alternative simpler approach: Create the icons as inline SVGs and convert them with `sharp` (already commonly available):
```bash
pnpm add -D sharp
```
Use sharp to rasterize SVG strings to PNG at each size.

**Guardrails (DO NOT):**
- Do NOT add `maskable` purpose to icons without a separate maskable icon (safe area requirements differ)
- Do NOT reference icons with relative paths in manifest — use absolute paths (`/icon-192.png`)
- Do NOT use Caveat font in icons — it's a Google Font not available in Node.js canvas. Use a clean bold sans-serif.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| manifest.json is valid JSON | unit | Parse manifest and verify all required fields present |
| manifest.json has correct values | unit | Verify name, short_name, start_url, display, colors, icon array |

**Expected state after completion:**
- [ ] `manifest.json` exists in `public/` with all required fields
- [ ] 3 PNG icon files exist in `public/`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- [ ] Icons show purple rounded square with "WR" in white

---

### Step 3: Update index.html with PWA Head Tags

**Objective:** Add manifest link, apple-touch-icon, and meta tags to the HTML template.

**Files to create/modify:**
- `frontend/index.html` — add PWA-related tags to `<head>`

**Details:**

Add the following tags to `<head>` in `index.html`, after the existing `<meta>` tags and before the font preconnect links:

```html
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#6D28D9">
```

**Guardrails (DO NOT):**
- Do NOT remove existing meta tags (viewport, description)
- Do NOT change the existing `<link rel="preconnect">` tags for Google Fonts
- Do NOT add a favicon link — browsers auto-discover from manifest icons

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| index.html contains manifest link | unit | Grep for `rel="manifest"` in index.html |
| index.html contains apple-touch-icon | unit | Grep for `rel="apple-touch-icon"` |
| index.html contains theme-color | unit | Grep for `name="theme-color"` with `#6D28D9` |
| index.html contains apple-mobile-web-app-capable | unit | Grep for `name="apple-mobile-web-app-capable"` |
| index.html contains apple-mobile-web-app-status-bar-style | unit | Grep for `name="apple-mobile-web-app-status-bar-style"` |

**Expected state after completion:**
- [ ] `index.html` has all 5 PWA head tags
- [ ] Existing tags unchanged
- [ ] Browser DevTools shows manifest loaded (manual verification)

---

### Step 4: Create Offline Fallback Page

**Objective:** Create a self-contained offline.html page with inline CSS, system fonts, and Worship Room branding.

**Files to create:**
- `frontend/public/offline.html` — standalone offline fallback page

**Details:**

Create `public/offline.html` as a complete, self-contained HTML page:

- `<!DOCTYPE html>` with `<html lang="en">`
- `<meta charset="UTF-8">` + `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>Worship Room - Offline</title>`
- All CSS inline in a `<style>` tag — zero external dependencies
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

**Layout:**
- `display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh;`
- `background-color: #0f0a1e;`
- Content centered with `max-width: 600px; padding: 2rem;`

**Content (top to bottom):**
1. **Cross icon** — inline SVG, ~48px, fill `#6D28D9`. Simple, clean cross shape.
2. **"Worship Room" title** — white, centered, letter-spacing 0.05em. Font sizes: 2.5rem desktop, 2rem tablet, 1.5rem mobile.
3. **Message** — "You're offline right now. Some features need an internet connection, but your saved content is still available." White text at 0.8 opacity, line-height 1.6, max-width 500px (desktop), full-width (mobile).
4. **"Try again" button** — `background-color: #6D28D9; color: white; border: none; border-radius: 8px; padding: 12px 32px; font-size: 1rem; cursor: pointer; min-height: 44px;` On hover: `background-color: #7C3AED;` (lighter purple). `onclick="location.reload()"`.

**Responsive (via media queries):**
- `@media (max-width: 640px)`: title 1.5rem, message 0.9rem, button width 100% with padding 14px
- `@media (min-width: 641px) and (max-width: 1024px)`: title 2rem, message max-width 500px
- Default (desktop): title 2.5rem, message max-width 600px

**Guardrails (DO NOT):**
- Do NOT link to any external CSS or JS files
- Do NOT use Google Fonts — system fonts only
- Do NOT add animations — keep it dependency-free and fast
- Do NOT add a "back" button — only "Try again" (reload)
- Do NOT use any Tailwind classes — all inline CSS

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| offline.html exists and is valid HTML | unit | Read file, verify doctype and basic structure |
| offline.html has no external dependencies | unit | Verify no `<link rel="stylesheet">`, no `<script src=">`, no `url()` in CSS |
| offline.html has "Try again" button | unit | Verify button with `location.reload()` exists |
| offline.html uses system fonts | unit | Verify font-family includes `-apple-system` |
| offline.html has correct background color | unit | Verify `#0f0a1e` in styles |
| offline.html has correct message text | unit | Verify exact message string from spec |

**Expected state after completion:**
- [ ] `offline.html` exists in `public/` as self-contained page
- [ ] Zero external dependencies (CSS, JS, fonts)
- [ ] Responsive across mobile/tablet/desktop
- [ ] "Try again" button is 44px+ touch target
- [ ] Warm, reassuring tone — not an error page

---

### Step 5: Create Update Prompt Component

**Objective:** Build a standalone component that appears when a new service worker version is detected, allowing users to update at their convenience.

**Files to create/modify:**
- `frontend/src/components/pwa/UpdatePrompt.tsx` — update toast component
- `frontend/src/components/pwa/UpdatePrompt.test.tsx` — tests

**Details:**

The existing Toast system (`components/ui/Toast.tsx`) does not support persistent toasts with action buttons, so this is a standalone component.

**Component: `UpdatePrompt`**

Uses `useRegisterSW` hook from `virtual:pwa-register/react` (provided by vite-plugin-pwa):
```typescript
import { useRegisterSW } from 'virtual:pwa-register/react'
```

The hook provides:
- `needRefresh` — boolean state, true when new SW version is waiting
- `updateServiceWorker` — function to activate the new SW and reload

**Rendering logic:**
- When `needRefresh` is true, render the toast
- Auto-dismiss after 30 seconds via `setTimeout` (reset on re-render)
- "Update now" calls `updateServiceWorker(true)` (triggers skipWaiting + reload)
- "Dismiss" (X button) sets local `dismissed` state to hide toast

**Styling (Tailwind classes):**
- Container: `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998]`
- Mobile: `w-[calc(100%-32px)]` (full width minus 16px padding each side)
- Tablet/Desktop: `sm:w-auto sm:max-w-[480px]`
- Background: glassmorphic dark — `bg-[rgba(15,10,30,0.85)] backdrop-blur-lg`
- Border: `border border-primary/40 rounded-xl`
- Shadow: `shadow-2xl`
- Padding: `p-4`
- Layout: `flex items-center gap-3` (icon + text + buttons)

**Content:**
- Left: small info icon (Lucide `RefreshCw` or `Download`, 20px, `text-primary`)
- Middle: "A new version of Worship Room is available" in `text-white text-sm`
- Right side:
  - "Update now" button: `bg-primary hover:bg-primary-lt text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`
  - "×" dismiss button: `text-white/60 hover:text-white ml-2` with `aria-label="Dismiss update notification"`

**Bottom offset (AudioPill awareness):**
- Import `useAudioState` to check if audio is playing
- When `pillVisible` is true on mobile, increase bottom offset: `bottom-24` (96px) to clear the AudioPill (56px + 24px margin + buffer)
- When no pill: `bottom-6` (24px)

**Entrance animation:** `animate-fade-in` (existing Tailwind animation — 500ms fade + slide up)

**Accessibility:**
- `role="status"` with `aria-live="polite"` — not critical enough for assertive
- "Update now" button has descriptive text (self-labeling)
- Dismiss button has `aria-label`
- Focus management: focus the update button when toast appears

**Placement in App.tsx:**
- Render `<UpdatePrompt />` inside the provider tree but outside Routes, after `<AudioProvider>`
- It self-manages visibility via `useRegisterSW`

**Guardrails (DO NOT):**
- Do NOT modify the existing Toast system — this is standalone
- Do NOT force-update — always let user choose
- Do NOT show in development mode — `useRegisterSW` only activates in production builds
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT import Caveat or Lora fonts — uses Inter (loaded by the app)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders nothing when no update available | unit | Mock useRegisterSW with needRefresh=false, verify empty render |
| renders toast when update available | unit | Mock useRegisterSW with needRefresh=true, verify toast content |
| displays correct message text | unit | Verify "A new version of Worship Room is available" |
| "Update now" calls updateServiceWorker | unit | Click button, verify updateServiceWorker(true) called |
| dismiss button hides toast | unit | Click X, verify toast no longer visible |
| auto-dismisses after 30 seconds | unit | Use vi.useFakeTimers, advance 30s, verify hidden |
| has correct aria attributes | unit | Verify role="status", aria-live="polite", aria-label on dismiss |
| adjusts position when AudioPill visible | unit | Mock useAudioState with pillVisible=true, verify bottom offset class |

**Expected state after completion:**
- [ ] `UpdatePrompt` component renders update toast when `needRefresh` is true
- [ ] Toast has "Update now" and dismiss actions
- [ ] Auto-dismisses after 30 seconds
- [ ] Positioned below AudioPill when audio is playing
- [ ] All tests pass

---

### Step 6: Register UpdatePrompt in App.tsx and Add Type Declarations

**Objective:** Wire up the UpdatePrompt component in the app and add TypeScript declarations for the virtual PWA module.

**Files to create/modify:**
- `frontend/src/App.tsx` — add `<UpdatePrompt />` component
- `frontend/src/vite-env.d.ts` or `frontend/src/pwa.d.ts` — add type declarations for `virtual:pwa-register/react`

**Details:**

**Type declarations:**

Create `frontend/src/pwa.d.ts`:
```typescript
/// <reference types="vite-plugin-pwa/client" />
```

This provides TypeScript types for the `virtual:pwa-register/react` import used by UpdatePrompt.

**App.tsx changes:**

Add `<UpdatePrompt />` after the `<AudioProvider>` opening tag, before `<Routes>`:
```tsx
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'

// Inside the render:
<AudioProvider>
  <UpdatePrompt />
  {/* existing Routes */}
</AudioProvider>
```

**Guardrails (DO NOT):**
- Do NOT change the provider wrapping order
- Do NOT add a new context provider — UpdatePrompt is self-contained
- Do NOT wrap UpdatePrompt in a Suspense boundary — it renders synchronously

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| App renders without errors with UpdatePrompt | integration | Verify App component mounts successfully |

**Expected state after completion:**
- [ ] `UpdatePrompt` is rendered in the component tree
- [ ] TypeScript compiles without errors for `virtual:pwa-register/react` import
- [ ] No changes to existing provider hierarchy
- [ ] `pnpm build` succeeds and generates service worker output

---

### Step 7: Build Verification and Test Suite

**Objective:** Verify the full PWA setup works end-to-end and ensure all existing tests still pass.

**Files to create/modify:**
- `frontend/src/components/pwa/__tests__/manifest.test.ts` — manifest validation tests
- `frontend/src/components/pwa/__tests__/offline.test.ts` — offline page validation tests

**Details:**

**Manifest validation tests** (`manifest.test.ts`):
- Read and parse `public/manifest.json`
- Verify all required fields: name, short_name, description, start_url, display, background_color, theme_color, orientation
- Verify icons array has entries for 192x192 and 512x512
- Verify icon paths start with `/`
- Verify color values match spec (`#0f0a1e`, `#6D28D9`)

**Offline page validation tests** (`offline.test.ts`):
- Read `public/offline.html` as string
- Verify it contains no `<link rel="stylesheet"` (no external CSS)
- Verify it contains no `<script src=` (no external JS)
- Verify it contains the exact message text from spec
- Verify it contains `location.reload()`
- Verify it contains `#0f0a1e` background color
- Verify it contains system font stack (`-apple-system`)
- Verify it contains `min-height: 44px` or similar for touch target

**Build verification** (manual steps, not automated):
1. Run `pnpm build` — verify SW file appears in `dist/`
2. Run `pnpm preview` — verify manifest loads in DevTools > Application
3. Verify service worker registers in DevTools > Application > Service Workers
4. Test offline: disconnect network, navigate to uncached page → should see `offline.html`

**Guardrails (DO NOT):**
- Do NOT test service worker registration in jsdom — it doesn't support SW API
- Do NOT create Playwright tests in this step — that's for `/verify-with-playwright`
- Do NOT modify existing test files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| manifest.json has all required fields | unit | Parse JSON, check 8 required fields |
| manifest.json icons have correct sizes | unit | Verify 192x192 and 512x512 entries |
| manifest.json colors match spec | unit | Verify background_color and theme_color |
| offline.html has no external dependencies | unit | Check for absence of external links/scripts |
| offline.html has correct content | unit | Verify message, button, background color |
| offline.html uses system fonts | unit | Verify font-family declaration |
| existing tests still pass | integration | Run full `pnpm test` suite |

**Expected state after completion:**
- [ ] All new tests pass
- [ ] All existing tests pass (no regressions)
- [ ] `pnpm build` generates service worker in dist/
- [ ] `pnpm dev` does NOT register a service worker
- [ ] Offline fallback works when previewing built app

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Install vite-plugin-pwa and configure Vite |
| 2 | — | Create manifest.json and generate app icons |
| 3 | — | Update index.html with PWA head tags |
| 4 | — | Create offline fallback page |
| 5 | 1 | Create UpdatePrompt component (needs useRegisterSW from vite-plugin-pwa) |
| 6 | 1, 5 | Wire UpdatePrompt into App.tsx and add type declarations |
| 7 | 1, 2, 3, 4, 5, 6 | Build verification and test suite |

**Note:** Steps 1-4 are independent and can be executed in any order. Steps 2, 3, 4 have zero code dependencies on each other. Step 5 depends on Step 1 (vite-plugin-pwa installed). Step 6 depends on Steps 1 and 5. Step 7 verifies everything together.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Install vite-plugin-pwa + configure Vite | [COMPLETE] | 2026-03-22 | Installed vite-plugin-pwa 1.2.0. Configured VitePWA in vite.config.ts with all 5 runtime caching strategies, prompt registerType, navigateFallback to /offline.html. Build generates sw.js + 35 precache entries. Pre-existing tsc errors unrelated to PWA changes. |
| 2 | Create manifest.json + app icons | [COMPLETE] | 2026-03-22 | Created manifest.json with all required fields. Installed sharp, created scripts/generate-icons.mjs. Generated 3 PNG icons (192x192, 512x512, 180x180) — purple rounded square with "WR" in white. Added pnpm.onlyBuiltDependencies for sharp. |
| 3 | Update index.html with PWA head tags | [COMPLETE] | 2026-03-22 | Added manifest link, apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, theme-color meta tags. Existing tags unchanged. |
| 4 | Create offline fallback page | [COMPLETE] | 2026-03-22 | Created public/offline.html — self-contained page with inline CSS, system fonts, cross icon (#6D28D9), "Worship Room" title, offline message, "Try again" button (44px min-height). Responsive at 3 breakpoints. Zero external dependencies. |
| 5 | Create UpdatePrompt component | [COMPLETE] | 2026-03-22 | Created UpdatePrompt.tsx with glassmorphic toast, useRegisterSW hook, auto-dismiss 30s, AudioPill-aware positioning, proper ARIA. 9/9 tests pass. Used fireEvent instead of userEvent for click tests (fake timers compatibility). |
| 6 | Wire UpdatePrompt into App.tsx + type declarations | [COMPLETE] | 2026-03-22 | Created pwa.d.ts with vite-plugin-pwa/client reference. Added UpdatePrompt import + render in App.tsx inside AudioProvider, before Routes. Provider hierarchy unchanged. Build succeeds with SW output. |
| 7 | Build verification + test suite | [COMPLETE] | 2026-03-22 | Created manifest.test.ts (7 tests) + offline.test.ts (9 tests). All 25 PWA tests pass. Full suite: 3565 passed, 27 failed (all pre-existing BibleReader/ActivityChecklist failures). Vite build generates sw.js with 42 precache entries. No regressions. |
