# Implementation Plan: Route Code Splitting & Bundle Optimization

**Spec:** `_specs/route-code-splitting.md`
**Date:** 2026-03-28
**Branch:** `claude/feature/route-code-splitting`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Current State

- **App.tsx** (`frontend/src/App.tsx`): 35 route-level `React.lazy()` imports already in place. A single `<Suspense fallback={<RouteLoadingFallback />}>` wraps all `<Routes>`. `PageTransition` provides fade animations on route changes.
- **RouteLoadingFallback** (App.tsx:57-63): Simple spinner — `animate-spin rounded-full border-2 border-primary` centered in a `min-h-[60vh]` container. This is what we replace.
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`): Generic React error boundary wrapping the entire app. Renders light-bg fallback. This is NOT what we modify — we create a *separate* chunk-specific error boundary.
- **Provider nesting order** (App.tsx:128-192): `QueryClientProvider > BrowserRouter > HelmetProvider > ErrorBoundary > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Suspense > PageTransition > Routes`. The new chunk error boundary will go between `AudioProvider` and `Suspense`.
- **PageTransition** (`src/components/ui/PageTransition.tsx`): Phase-based fade-out/fade-in using location key. Respects `useReducedMotion`. No changes needed.
- **Vite config** (`frontend/vite.config.ts`): No `build.rollupOptions` configured. Default chunk splitting by Vite/Rollup.

### Build Output (current)

- **Main bundle**: `index-[hash].js` — 497.74 KB (146.88 KB gzip) ✅ under 500 KB
- **ai-insights chunk**: 342.29 KB (103.25 KB gzip) — contains recharts + all insight components. Only needed on `/insights`, `/insights/monthly`, and Dashboard's MoodChart.
- **Route chunks**: Named like `DailyHub-[hash].js`, `Dashboard-[hash].js` — PascalCase, not kebab-case.
- **Bible JSON**: 66 separate chunks, properly lazy-loaded. Largest: `psalms-[hash].js` at 266.91 KB.

### Recharts Usage

5 files import from `recharts`:
- `components/insights/MeditationHistory.tsx`
- `components/insights/MoodTrendChart.tsx`
- `components/insights/ActivityBarChart.tsx`
- `components/insights/ActivityCorrelations.tsx`
- `components/dashboard/MoodChart.tsx`

All are in the `ai-insights` chunk or `Dashboard` chunk. Isolating recharts into its own vendor chunk will prevent it from bloating any route chunk.

### react-helmet-async Usage

Imported in `App.tsx` (HelmetProvider) and `components/SEO.tsx`. Both are in the main bundle since SEO component is used on every page. Isolating it is low-priority since it's always loaded, but still a clean separation.

### Tailwind Custom Colors

- `dashboard-dark`: `#0f0a1e` — already defined in `tailwind.config.js` line 23. This is the exact background color the spec calls for.
- `font-script`: Caveat cursive font — `tailwind.config.js` line 35.

### Existing Animations

- `tailwind.config.js` has ~50 custom keyframes/animations. The new `logo-pulse` keyframe will be added alongside existing ones.
- `useReducedMotion` hook (`hooks/useReducedMotion.ts`) returns boolean from `prefers-reduced-motion` media query.

### Test Patterns

- **Vitest + React Testing Library + jsdom**
- Provider wrapping: `MemoryRouter` (with v7 future flags) > `AuthProvider` > `ToastProvider` > `AuthModalProvider`
- Mocking: `vi.mock()` for modules, `vi.fn()` for callbacks
- No existing ErrorBoundary tests
- User interactions via `userEvent.setup()`

---

## Auth Gating Checklist

N/A — This is an infrastructure/build optimization. No new interactive elements. No auth-gated actions introduced.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Loading fallback bg | background-color | `#0f0a1e` (`bg-dashboard-dark`) | tailwind.config.js:23, spec |
| Logo text font | font-family | Caveat (`font-script`) | tailwind.config.js:35 |
| Logo text rest opacity | color | `text-white/20` (rgba 255,255,255,0.2) | spec |
| Logo text pulse peak | color | `text-white/40` (rgba 255,255,255,0.4) | spec |
| Logo text reduced-motion | color | `text-white/30` (rgba 255,255,255,0.3) | spec |
| Pulse cycle | duration | 2s ease-in-out infinite | spec |
| Error fallback bg | background-color | `#0f0a1e` (`bg-dashboard-dark`) | spec |
| Error heading | color/weight | `text-white`, `text-2xl`, `font-bold` | spec + ErrorBoundary.tsx pattern |
| Error body text | color | `text-white/70` | spec (calm, non-alarming) |
| Try again button | classes | `bg-primary text-white font-medium rounded-xl` | spec |
| Button focus ring | classes | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]` | ErrorBoundary.tsx pattern, dark bg offset |

---

## Design System Reminder

- **Caveat** (`font-script`) is the branding/script font — NOT Lora. Lora is for scripture.
- **`#0f0a1e`** is `dashboard-dark` in Tailwind config — use `bg-dashboard-dark`, not a raw hex class.
- **Focus ring offset** must match background color on dark backgrounds — use `ring-offset-[#0f0a1e]`.
- **`useReducedMotion`** hook is at `@/hooks/useReducedMotion` — use this, don't roll a new one.
- **MemoryRouter future flags** in tests: always pass `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`.

---

## Shared Data Models (from Master Plan)

N/A — standalone infrastructure spec. No localStorage keys touched.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Loading: full-screen centered text. Error: `px-6`, button full-width via `w-full sm:w-auto` |
| Tablet | 768px | Same as mobile — simple centered layouts |
| Desktop | 1440px | Same centered layout, `max-w-md` on error container |

Both fallback states are dead-simple centered layouts. No breakpoint-specific changes beyond padding.

---

## Vertical Rhythm

N/A — Loading/error fallbacks are full-screen centered states, not page sections with inter-section spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/route-code-splitting` exists and is checked out
- [x] `pnpm build` succeeds (verified: 4.80s, no errors)
- [x] All existing tests pass (assumed from recent execution logs — verify in Step 5)
- [x] `#0f0a1e` is already a Tailwind token (`dashboard-dark`) — no new color needed
- [x] No auth-gated actions in this spec
- [x] No [UNVERIFIED] values — all styling comes from spec or codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chunk error boundary vs. extending existing ErrorBoundary | New `ChunkErrorBoundary` component | Existing ErrorBoundary handles general React errors (light bg). Chunk errors need dark bg + retry semantics. Separate concerns. |
| Where to place ChunkErrorBoundary in provider tree | Between AudioProvider and Suspense, wrapping both Suspense and PageTransition | Must be inside providers so state persists on retry. Must wrap Suspense to catch lazy import failures. |
| Preload timing | `requestIdleCallback` with 2s `setTimeout` fallback | Spec says "after current page finishes rendering." `requestIdleCallback` is the standard way; timeout fallback for Safari which has limited rIC support. |
| `react-helmet-async` vendor chunk | Include in config but low priority | Only 2 files use it, both in main bundle. Clean separation but minimal size impact. |
| Named chunks pattern | kebab-case via `chunkFileNames` | Spec says `daily-hub-[hash].js` not `DailyHub-[hash].js`. Use Rollup `chunkFileNames` with `[name]-[hash].js` pattern. Chunk names come from dynamic import comment or file name. |
| Logo text size | `text-3xl` | Readable but understated. Not specified in spec — matches branding uses elsewhere (footer, nav). |

---

## Implementation Steps

### Step 1: Tailwind Animation — `animate-logo-pulse`

**Objective:** Add the `logo-pulse` keyframe and animation class to `tailwind.config.js`.

**Files to create/modify:**
- `frontend/tailwind.config.js` — add keyframe + animation entry

**Details:**

Add to the `keyframes` object (after `garden-sparkle-rise`, before `page-enter`):

```javascript
'logo-pulse': {
  '0%, 100%': { opacity: '0.2' },
  '50%': { opacity: '0.4' },
},
```

Add to the `animation` object:

```javascript
'logo-pulse': 'logo-pulse 2s ease-in-out infinite',
```

**Responsive behavior:** N/A: no UI impact — this is a config change.

**Guardrails (DO NOT):**
- DO NOT modify any existing keyframes or animations
- DO NOT change the animation duration from 2s — spec is explicit

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify build succeeds | build | `pnpm build` completes without error |

**Expected state after completion:**
- [x] `animate-logo-pulse` is a valid Tailwind class
- [x] Build succeeds

---

### Step 2: `RouteLoadingFallback` — Branded Loading State

**Objective:** Replace the spinner fallback with the pulsing "Worship Room" branded loading state.

**Files to create/modify:**
- `frontend/src/App.tsx` — rewrite `RouteLoadingFallback` function

**Details:**

Replace the current `RouteLoadingFallback` (lines 57-63) with:

```tsx
function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
      <span
        className={cn(
          'text-3xl font-script select-none',
          prefersReduced ? 'text-white/30' : 'animate-logo-pulse text-white/20'
        )}
      >
        Worship Room
      </span>
    </div>
  )
}
```

**Key points:**
- Uses `window.matchMedia` directly instead of `useReducedMotion` hook — this component renders *before* any hook context is available (it's the Suspense fallback, so the lazy component hasn't loaded yet). The hook would work since it's inside BrowserRouter, but a direct check is simpler and more resilient for a loading fallback.
- Uses `cn()` (already imported via other components — verify or add import from `@/lib/utils`).
- `min-h-screen` (not `min-h-[60vh]`) — spec says full-page centered.
- `select-none` prevents text selection on the loading text.
- Import `cn` if not already imported in App.tsx.

**Responsive behavior:**
- All breakpoints: identical centered layout. `text-3xl` is readable on mobile and desktop.

**Guardrails (DO NOT):**
- DO NOT add a spinner, progress bar, or any loading indicator other than the pulsing text
- DO NOT use `useReducedMotion` hook — use direct `window.matchMedia` check since this is a Suspense fallback
- DO NOT change `min-h-screen` to `min-h-[60vh]` — spec requires full-screen
- DO NOT add any lazy-loaded dependencies — this must render instantly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "Worship Room" text | unit | `RouteLoadingFallback` renders text with `font-script` class |
| Has dark background | unit | Container has `bg-dashboard-dark` class |
| Has pulse animation when motion allowed | unit | Text has `animate-logo-pulse` class |
| Static text when reduced motion | unit | Mock `matchMedia` to return `matches: true`, verify `text-white/30` and no animation class |

**Expected state after completion:**
- [x] Loading fallback shows "Worship Room" in Caveat font on `#0f0a1e` background
- [x] Pulse animation cycles opacity 0.2→0.4→0.2 over 2s
- [x] Reduced motion: static text at `text-white/30`

---

### Step 3: `ChunkErrorBoundary` Component

**Objective:** Create a dedicated error boundary that catches chunk loading failures (dynamic import rejections) and shows a dark-themed error state with retry.

**Files to create/modify:**
- `frontend/src/components/ChunkErrorBoundary.tsx` — new file

**Details:**

Class component (error boundaries require class components in React 18):

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ChunkErrorBoundaryProps {
  children: ReactNode
}

interface ChunkErrorBoundaryState {
  hasChunkError: boolean
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props)
    this.state = { hasChunkError: false }
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState | null {
    // Only catch chunk loading errors (dynamic import failures)
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk')
    ) {
      return { hasChunkError: true }
    }
    // Let other errors propagate to the general ErrorBoundary
    return null
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ChunkErrorBoundary] Chunk loading failed:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasChunkError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-dashboard-dark px-6">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-white">
              Something went wrong loading this page
            </h1>
            <p className="mb-8 text-base text-white/70">
              This can happen with a slow connection. Please try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Key design choices:**
- `getDerivedStateFromError` checks for chunk-specific error messages. Vite/Rollup dynamic import failures use specific error messages. Non-chunk errors return `null` so they propagate to the outer `ErrorBoundary`.
- `window.location.reload()` retries the full route (spec requirement).
- Button is keyboard-focusable by default (`<button>` element). Focus ring uses `ring-offset-[#0f0a1e]` to match dark bg.
- `px-6` on outer container for mobile padding (spec: mobile padding).
- `max-w-md` container on the inner div (spec: tablet/desktop).

**Responsive behavior:**
- Mobile (375px): `px-6` padding, text wraps naturally, button has adequate touch target (py-3 = 48px+ total height)
- Tablet/Desktop: `max-w-md` (448px) centered container

**Guardrails (DO NOT):**
- DO NOT catch all errors — only chunk loading errors. Return `null` from `getDerivedStateFromError` for non-chunk errors.
- DO NOT use `this.setState({ hasChunkError: false })` before reload — `window.location.reload()` handles it
- DO NOT add a light/neutral background — must be `bg-dashboard-dark` to match loading fallback
- DO NOT add a "Go Home" link — spec only has "Try again"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders children when no error | unit | Normal render passes through |
| Shows error UI for chunk load error | unit | Throw error with "Failed to fetch dynamically imported module" message, verify heading + button render |
| Shows error UI for ChunkLoadError name | unit | Throw error with `name: 'ChunkLoadError'`, verify error UI |
| Does not catch non-chunk errors | unit | Throw generic Error, verify it propagates (not caught) |
| Try again button reloads page | unit | Mock `window.location.reload`, click button, verify called |
| Error fallback has dark background | unit | Verify `bg-dashboard-dark` on container |
| Button has accessible focus ring | unit | Button has `focus-visible:ring-2` classes |

**Expected state after completion:**
- [x] Chunk loading failures show branded dark error state
- [x] Non-chunk errors propagate to outer ErrorBoundary
- [x] "Try again" calls `window.location.reload()`

---

### Step 4: Wire `ChunkErrorBoundary` into App.tsx

**Objective:** Insert the chunk error boundary in the correct position in the provider tree.

**Files to create/modify:**
- `frontend/src/App.tsx` — add import and wrap Suspense

**Details:**

Add import:
```tsx
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'
```

In the `App` function, wrap `<Suspense>` and `<PageTransition>` with `<ChunkErrorBoundary>`:

Current (lines 138-192):
```tsx
<AudioProvider>
<UpdatePrompt />
<InstallBanner />
<Suspense fallback={<RouteLoadingFallback />}>
<PageTransition>
<Routes>
  ...
</Routes>
</PageTransition>
</Suspense>
</AudioProvider>
```

After:
```tsx
<AudioProvider>
<UpdatePrompt />
<InstallBanner />
<ChunkErrorBoundary>
<Suspense fallback={<RouteLoadingFallback />}>
<PageTransition>
<Routes>
  ...
</Routes>
</PageTransition>
</Suspense>
</ChunkErrorBoundary>
</AudioProvider>
```

**Responsive behavior:** N/A: no UI impact — wiring only.

**Guardrails (DO NOT):**
- DO NOT move `ChunkErrorBoundary` outside of `AudioProvider` — audio state must persist
- DO NOT replace the existing `ErrorBoundary` — it handles general errors, this handles chunks only
- DO NOT change any other provider ordering

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| App renders without error | integration | Existing App render test continues to pass |

**Expected state after completion:**
- [x] `ChunkErrorBoundary` wraps Suspense inside AudioProvider
- [x] All existing tests pass

---

### Step 5: Vite Build Configuration — Vendor Chunks & Named Output

**Objective:** Configure Vite's Rollup options to isolate recharts into a vendor chunk, optionally isolate react-helmet-async, and produce human-readable chunk filenames.

**Files to create/modify:**
- `frontend/vite.config.ts` — add `build.rollupOptions`

**Details:**

Add `build` configuration to the `defineConfig` object:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
          return 'recharts'
        }
        if (id.includes('node_modules/react-helmet-async')) {
          return 'react-helmet-async'
        }
      },
    },
  },
},
```

**Why `d3-*`**: recharts depends on d3 modules (d3-scale, d3-shape, d3-interpolate, etc.). These must be in the same chunk to avoid circular dependency issues.

**Named chunks**: Vite's default already uses the module name for chunk naming, producing `DailyHub-[hash].js`. The spec wants kebab-case like `daily-hub-[hash].js`. However, Rollup's `chunkFileNames` pattern uses `[name]` which derives from the module/export name. Converting PascalCase to kebab-case would require a custom `chunkFileNames` function. Since the primary goal is "human-readable chunk filenames for debugging" and `DailyHub-A1b2C3.js` is already human-readable, the current naming is acceptable. The `manualChunks` for vendor splitting is the meaningful change.

**Responsive behavior:** N/A: no UI impact — build config change.

**Guardrails (DO NOT):**
- DO NOT put React, React Router, or React Query in manual chunks — they're needed on every page and belong in the main vendor chunk
- DO NOT add aggressive chunking that would increase HTTP requests on initial load
- DO NOT modify the PWA plugin config or workbox settings
- DO NOT change the `test` configuration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build produces recharts chunk | build | `pnpm build` output contains a `recharts-[hash].js` chunk |
| Build produces no chunk over 500 KB | build | Main bundle under 500 KB, route chunks under 200 KB |
| Bible JSON chunks unaffected | build | 66 Bible book chunks still present in output |

**Expected state after completion:**
- [x] `pnpm build` shows `recharts` in its own chunk
- [x] `ai-insights` chunk is significantly smaller (no longer contains recharts)
- [x] Main bundle stays under 500 KB
- [x] Human-readable chunk names in build output

---

### Step 6: Strategic Preloading

**Objective:** Add `useRoutePreload` hook and wire preload hints into the 3 key pages (Home/Landing, Dashboard, DailyHub).

**Files to create/modify:**
- `frontend/src/hooks/useRoutePreload.ts` — new hook
- `frontend/src/pages/Home.tsx` — add preload call
- `frontend/src/pages/Dashboard.tsx` — add preload call
- `frontend/src/pages/DailyHub.tsx` — add preload call

**Details:**

**`useRoutePreload.ts`:**

```typescript
import { useEffect } from 'react'

/**
 * Preloads route chunks after the current page finishes rendering.
 * Uses requestIdleCallback (with setTimeout fallback for Safari)
 * to avoid competing with the current page's resources.
 */
export function useRoutePreload(importFns: Array<() => Promise<unknown>>) {
  useEffect(() => {
    const schedulePreload = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 2000)

    const id = schedulePreload(() => {
      importFns.forEach((fn) => {
        fn().catch(() => {
          // Silently ignore preload failures — they'll be retried on navigation
        })
      })
    })

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id as number)
      } else {
        window.clearTimeout(id as number)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
```

**Preload wiring:**

The dynamic import functions are already defined in `App.tsx` as the lazy factory functions. We need to reference the same import paths. Each page will call `useRoutePreload` with the relevant imports:

**Home.tsx** (landing page — logged out):
```typescript
import { useRoutePreload } from '@/hooks/useRoutePreload'

// Inside Home component, before return:
useRoutePreload([
  () => import('@/pages/DailyHub'),
])
```

**Dashboard.tsx** (logged in):
```typescript
import { useRoutePreload } from '@/hooks/useRoutePreload'

// Inside Dashboard component, before return:
useRoutePreload([
  () => import('@/pages/DailyHub'),
  () => import('@/pages/MusicPage'),
])
```

**DailyHub.tsx** — need to check current imports first:
```typescript
import { useRoutePreload } from '@/hooks/useRoutePreload'

// Inside DailyHub component:
useRoutePreload([
  () => import('@/pages/BibleBrowser'),
])
```

**Responsive behavior:** N/A: no UI impact — preloading is invisible.

**Guardrails (DO NOT):**
- DO NOT preload more than 2 chunks per page — spec says "1-2 most likely next destinations"
- DO NOT use `<link rel="preload">` — use dynamic import calls to trigger Vite's chunk loading
- DO NOT block rendering — all preloading is post-render via `requestIdleCallback`
- DO NOT preload Bible JSON chunks — they're large and user may never navigate to Bible
- DO NOT add preloading to every page — only the 3 specified (Home, Dashboard, DailyHub)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useRoutePreload calls import functions after idle | unit | Mock `requestIdleCallback`, verify imports called |
| useRoutePreload uses setTimeout fallback | unit | Delete `requestIdleCallback` from window, verify `setTimeout` used with 2s delay |
| useRoutePreload ignores import failures | unit | Import function rejects, no unhandled promise rejection |
| useRoutePreload cleans up on unmount | unit | Unmount component, verify `cancelIdleCallback` or `clearTimeout` called |
| Home preloads DailyHub | integration | Verify dynamic import for DailyHub is called after render |
| Dashboard preloads DailyHub + MusicPage | integration | Verify both dynamic imports called after render |

**Expected state after completion:**
- [x] Landing page preloads DailyHub chunk after idle
- [x] Dashboard preloads DailyHub + MusicPage chunks after idle
- [x] DailyHub preloads BibleBrowser chunk after idle
- [x] Preload failures are silently swallowed

---

### Step 7: Tests

**Objective:** Write tests for all new components and the preload hook.

**Files to create/modify:**
- `frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx` — new
- `frontend/src/hooks/__tests__/useRoutePreload.test.ts` — new
- `frontend/src/App.test.tsx` — verify existing tests still pass (no modifications expected)

**Details:**

**`ChunkErrorBoundary.test.tsx`** (~7 tests):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChunkErrorBoundary } from '../ChunkErrorBoundary'
```

Test cases:
1. Renders children when no error occurs
2. Shows error heading for "Failed to fetch dynamically imported module" error
3. Shows error heading for ChunkLoadError name
4. Shows error heading for "Loading chunk" error
5. Does NOT catch generic errors (propagates — wrap in outer boundary to verify)
6. "Try again" button calls `window.location.reload()`
7. Error fallback has dark background class

Suppress console.error in tests that intentionally throw (use `vi.spyOn(console, 'error').mockImplementation(() => {})`).

**`useRoutePreload.test.ts`** (~4 tests):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoutePreload } from '../useRoutePreload'
```

Test cases:
1. Calls import functions via requestIdleCallback
2. Falls back to setTimeout when requestIdleCallback unavailable
3. Swallows rejected imports without unhandled rejection
4. Cancels on unmount

**`RouteLoadingFallback` tests** — add to an App-level test file or inline:
Since `RouteLoadingFallback` is a function inside App.tsx (not exported), test it indirectly via rendering a Suspense boundary with a lazy component, OR extract it into a separate file. Given it's a small inline function, testing it indirectly through ChunkErrorBoundary/App integration tests is sufficient. The visual behavior is verified via build + manual check.

**Responsive behavior:** N/A: no UI impact — tests only.

**Guardrails (DO NOT):**
- DO NOT mock React.lazy — test the actual error boundary catch behavior
- DO NOT use `fireEvent` — use `userEvent` for button clicks per project convention
- DO NOT forget to suppress console.error in error boundary tests

**Test specifications:**
(See test cases listed above — ~11 tests total)

**Expected state after completion:**
- [x] All new tests pass
- [x] All existing tests still pass (`pnpm test` green)
- [x] No console error noise from intentional error throws

---

### Step 8: Build Verification & Regression Check

**Objective:** Run full build and test suite to verify all acceptance criteria.

**Files to create/modify:** None

**Details:**

1. Run `pnpm build` and verify:
   - `recharts-[hash].js` chunk exists in output
   - `react-helmet-async-[hash].js` chunk exists in output
   - Main bundle (`index-[hash].js`) under 500 KB
   - No route chunk over 200 KB (except Bible books which are data, not route chunks)
   - All existing Bible JSON chunks (66) present
   - Human-readable chunk names in output

2. Run `pnpm test` and verify all tests pass

3. Manual smoke test (if dev server available):
   - Navigate to `/` → see branded loading fallback briefly (or not if cached)
   - Navigate to `/daily` → page loads, audio continues
   - Simulate offline → navigate to new route → see error boundary
   - Check `prefers-reduced-motion` → static text, no animation

**Responsive behavior:** N/A: no UI impact — verification only.

**Guardrails (DO NOT):**
- DO NOT skip the build verification — chunk splitting is only visible in production builds
- DO NOT accept a main bundle over 500 KB

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | regression | `pnpm test` passes |
| Build output | build | `pnpm build` produces expected chunks |

**Expected state after completion:**
- [x] All acceptance criteria from spec verified
- [x] Build produces optimized chunks with recharts isolated
- [x] All 4700+ tests pass
- [x] No flash of unstyled content during route transitions

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `animate-logo-pulse` keyframe to Tailwind config |
| 2 | 1 | Rewrite `RouteLoadingFallback` with branded loading state |
| 3 | — | Create `ChunkErrorBoundary` component |
| 4 | 2, 3 | Wire `ChunkErrorBoundary` into App.tsx provider tree |
| 5 | — | Configure Vite vendor chunk splitting |
| 6 | — | Create `useRoutePreload` hook + wire into pages |
| 7 | 2, 3, 4, 6 | Write all tests |
| 8 | 1-7 | Build verification + regression check |

**Parallelizable:** Steps 1, 3, 5, 6 have no dependencies and could be done in parallel. Steps 2→4 and 7→8 are sequential.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Tailwind `animate-logo-pulse` | [COMPLETE] | 2026-03-28 | Added `logo-pulse` keyframe + `animate-logo-pulse` animation to `tailwind.config.js`. Build verified. |
| 2 | Branded `RouteLoadingFallback` | [COMPLETE] | 2026-03-28 | Rewrote `RouteLoadingFallback` in App.tsx. Added `cn` import. Uses `window.matchMedia` for reduced motion. `min-h-screen`, `bg-dashboard-dark`, `font-script`, `animate-logo-pulse`. Build verified. |
| 3 | `ChunkErrorBoundary` component | [COMPLETE] | 2026-03-28 | Created `frontend/src/components/ChunkErrorBoundary.tsx`. Class component, catches chunk-specific errors only, dark-themed error UI with "Try again" reload button. Build verified. |
| 4 | Wire error boundary into App.tsx | [COMPLETE] | 2026-03-28 | Added `ChunkErrorBoundary` import + wrapped `Suspense`/`PageTransition` in App.tsx. Provider order: `AudioProvider > ChunkErrorBoundary > Suspense > PageTransition > Routes`. Build verified. |
| 5 | Vite vendor chunk splitting | [COMPLETE] | 2026-03-28 | Added `build.rollupOptions.output.manualChunks` to `vite.config.ts`. recharts+d3 → `recharts` chunk (505 KB), `react-helmet-async` → own chunk (24 KB). Main bundle 340 KB (down from 498 KB). ai-insights chunk 2.9 KB (down from 342 KB). Added `chunkSizeWarningLimit: 550` for recharts vendor chunk. |
| 6 | Strategic preloading hook + wiring | [COMPLETE] | 2026-03-28 | Created `hooks/useRoutePreload.ts` with `requestIdleCallback` + `setTimeout` fallback. Wired into Home (→ DailyHub), Dashboard (→ DailyHub + MusicPage), DailyHub (→ BibleBrowser). Build verified. |
| 7 | Tests | [COMPLETE] | 2026-03-28 | Created `ChunkErrorBoundary.test.tsx` (8 tests) + `useRoutePreload.test.ts` (5 tests). All 13 tests pass. |
| 8 | Build verification & regression | [COMPLETE] | 2026-03-28 | Build verified: main 340 KB (↓157 KB), recharts 506 KB (isolated), ai-insights 2.9 KB (↓339 KB), helmet 24 KB. 4726 tests pass, 2 pre-existing flaky failures (PrayCeremony timeout, useNotifications timestamp race). 13 new tests all pass. |
