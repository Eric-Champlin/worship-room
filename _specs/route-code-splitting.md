# Route Code Splitting & Bundle Optimization

**Master Plan Reference:** N/A — standalone performance optimization

---

## Overview

Worship Room serves emotionally vulnerable users who may be reaching out in a moment of crisis or spiritual need. Every second of load time is a moment where someone might give up and close the tab. This spec completes the route-level code splitting work (lazy imports are already in place) by adding a branded loading experience, chunk loading error recovery, vendor library isolation, and strategic preloading — ensuring the app feels fast and reliable even on slow mobile connections.

## User Story

As a **user on a slow mobile connection**, I want the app to load quickly and show a calm, branded loading state so that I feel confident the app is working and don't abandon it before it loads.

As a **user navigating between pages**, I want route transitions to feel seamless so that the app feels like a cohesive experience rather than a collection of separate pages.

## Requirements

### Current State (Already Implemented)

Route-level lazy imports are already in `App.tsx` for all ~35 page components using `React.lazy` with dynamic imports. The main bundle (`index.js`) is ~498 KB (147 KB gzip). Bible JSON files are already lazy-loaded per book (66 separate chunks). This spec does NOT need to convert static imports to lazy — that's done.

### Functional Requirements

1. **Branded loading fallback**: Replace the current spinner fallback (`RouteLoadingFallback`) with a full-page centered loading state:
   - Dark background (`#0f0a1e` — between `hero-dark` and `hero-mid`)
   - "Worship Room" text in Caveat script font (`font-script`)
   - Text color: `text-white/20` at rest, pulsing to `text-white/40` and back
   - Pulse animation: 2-second cycle, smooth ease-in-out (opacity 0.2 to 0.4 to 0.2)
   - Vertically and horizontally centered (`flex items-center justify-center min-h-screen`)
   - No spinner, no progress bar — just the calm pulsing logo text
   - Must render instantly (no dependencies on lazy-loaded code)
   - Respects `prefers-reduced-motion`: no animation, static `text-white/30`

2. **Chunk loading error boundary**: Wrap the `Suspense` boundary in an `ErrorBoundary` that catches chunk loading failures (dynamic import rejections from network errors):
   - Error fallback shows: "Something went wrong loading this page" heading
   - "Try again" button that calls `window.location.reload()` to retry the current route
   - Same dark background as the loading fallback (`#0f0a1e`)
   - Calm, non-alarming styling — white text, simple layout
   - Error boundary only catches errors from lazy imports (not general React errors — the existing `ErrorBoundary` component handles those)

3. **Vendor chunk splitting**: Configure Vite's `build.rollupOptions.output.manualChunks` to isolate large vendor libraries:
   - `recharts` chunk — only loaded by `/insights`, `/insights/monthly`, and the Dashboard's `MoodChart`. Currently bundled into `ai-insights` chunk (~342 KB). Isolating it prevents recharts from loading on pages that don't need charts.
   - `react-helmet-async` chunk — small but only needed for SEO meta tags. Loads with first page render.
   - Keep React, React Router, and React Query in the main vendor chunk (they're needed everywhere).

4. **Named chunks**: Configure Vite build output to produce human-readable chunk filenames for debugging:
   - Pattern: `[name]-[hash].js` (e.g., `daily-hub-A1b2C3.js` instead of `DailyHub-A1b2C3.js`)
   - Route chunks should be identifiable by page name in the build output
   - This makes it easy to identify which chunk is large during future optimization

5. **Strategic preloading**: Add preload hints for the most common navigation paths so the next likely chunk starts downloading before the user clicks:
   - Landing page (`/`): preload the DailyHub chunk
   - Dashboard (`/` logged-in): preload DailyHub and MusicPage chunks
   - Daily Hub (`/daily`): preload BibleBrowser chunk
   - Implement via `useEffect` that calls the dynamic import function without awaiting it (triggers the download but doesn't block rendering)
   - Don't over-preload — only the 1-2 most likely next destinations per page
   - Preloading should happen after the current page finishes rendering (use `requestIdleCallback` or a short timeout)

6. **Route transition integration**: The existing `PageTransition` component handles visual transitions. The Suspense fallback shows while the chunk downloads. The experience flow is:
   - User clicks nav link
   - Brief pulsing logo appears (if chunk not cached)
   - Page fades in via `PageTransition`
   - On subsequent visits, chunk is cached — no fallback visible, instant transition

### Non-Functional Requirements

- **Performance**: Main bundle (shell + core vendors) should remain under 500 KB. Individual route chunks under 200 KB each (except Dashboard). Initial page load should transfer under 800 KB of JavaScript.
- **Accessibility**: Loading fallback respects `prefers-reduced-motion`. Error fallback is keyboard-navigable with clear focus indicators on the "Try again" button.
- **Stability**: All existing tests must pass — lazy loading is transparent to component internals. AudioProvider, AuthProvider, and ToastProvider must maintain state across route transitions.

## Auth Gating

N/A — This is a build/infrastructure change. No new interactive elements are introduced. All existing auth gating behavior is preserved unchanged.

## Responsive Behavior

| Breakpoint | Loading Fallback | Error Fallback |
|-----------|-----------------|----------------|
| Mobile (< 640px) | Pulsing logo centered, full-screen dark bg | Error message centered, "Try again" button full-width, `px-6` padding |
| Tablet (640-1024px) | Same as mobile, larger text if desired | Same layout, `max-w-md` container |
| Desktop (> 1024px) | Same centered layout | Same layout, `max-w-md` container |

Both fallback states are simple centered layouts that work identically across all breakpoints. No breakpoint-specific layout changes needed.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No change — landing page loads, all public routes work as before
- **Logged-in users:** No change — auth state persists across route transitions via `AuthProvider` (stays in the main bundle)
- **localStorage usage:** No new keys. Existing keys unaffected.
- **Route type:** N/A — this changes how routes load, not which routes exist

## Completion & Navigation

N/A — standalone infrastructure feature.

## Design Notes

- Loading fallback background `#0f0a1e` sits between `hero-dark` (#0D0620) and `hero-mid` (#1E0B3E) from the design system
- "Worship Room" text uses the existing `font-script` (Caveat) class
- The pulse animation should use the existing `animate-` pattern in `tailwind.config` or a new `animate-logo-pulse` keyframe
- Error fallback uses the same dark background for visual consistency — no jarring white flash
- The "Try again" button uses the existing primary button style: `bg-primary text-white font-medium rounded-xl`
- Both fallback states should feel like part of the app, not error pages from a different design system

## Out of Scope

- Converting static imports to lazy (already done)
- Per-route Suspense boundaries (one global boundary is sufficient)
- Service worker chunk caching strategy (handled by existing PWA config)
- Tree-shaking or dead code elimination (separate optimization)
- Backend performance / API response time optimization
- Image optimization or lazy loading (separate concern)
- Changing any component behavior, styling, or functionality — only how they're imported and bundled

## Acceptance Criteria

- [ ] Loading fallback shows pulsing "Worship Room" in Caveat font on dark background (#0f0a1e) instead of spinner
- [ ] Loading fallback pulse animation cycles opacity 0.2 to 0.4 over 2 seconds
- [ ] Loading fallback respects `prefers-reduced-motion` (static text, no animation)
- [ ] Error boundary catches chunk loading failures and shows "Something went wrong" with "Try again" button
- [ ] "Try again" button reloads the current route
- [ ] Error fallback uses dark background matching loading fallback
- [ ] `pnpm build` output shows `recharts` in its own chunk, separate from route chunks
- [ ] `pnpm build` output shows human-readable chunk names (e.g., `daily-hub-[hash].js`)
- [ ] Main bundle remains under 500 KB
- [ ] Landing page preloads DailyHub chunk after initial render
- [ ] Dashboard preloads DailyHub and MusicPage chunks after initial render
- [ ] Daily Hub preloads BibleBrowser chunk after initial render
- [ ] Navigating between routes does not interrupt ambient audio playback
- [ ] Auth state (simulated login) persists across route transitions
- [ ] All existing tests pass (`pnpm test`)
- [ ] Bible JSON lazy loading (66 books) still works correctly after build config changes
- [ ] No flash of unstyled content or layout shift during route transitions
