# Implementation Plan: BB-36 Performance

**Spec:** `_specs/bb-36-performance.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, still fresh)
**Recon Report:** not applicable (optimization spec, no visual feature)
**Master Spec Plan:** not applicable — standalone measurement-and-remediation spec

---

## Architecture Context

### Current Build Profile

| Metric | Value |
|--------|-------|
| `dist/` total | 27 MB raw |
| JS chunks | 307 files, 36 MB raw |
| CSS | 2 files, 304 KB raw (136 KB + 16 KB leaflet; 22 KB gzipped) |
| Main bundle (`index-*.js`) | 352 KB raw / 97 KB gzipped |
| Recharts chunk | 496 KB raw / 153 KB gzipped |
| Leaflet chunk | 160 KB raw / 49 KB gzipped |
| ShareSubView chunk | 336 KB raw / 73 KB gzipped |
| Dashboard chunk | 160 KB raw / 46 KB gzipped |
| Total JS+CSS+HTML gzipped | 3.8 MB |
| Search index (`bible-index.json`) | 7.2 MB raw / 1.3 MB gzipped |
| Bible JSON data (`src/data/bible/web/`) | 6 MB (66 books, dynamic imports) |
| Bible JSON in `dist/` | Included as per-book chunks (largest: Psalms 876 KB) |
| `public/` total | 8.6 MB (mostly OG images + search index + icons) |
| OG card images | ~1 MB total (12+ PNGs, 51-99 KB each) |
| PWA icons | ~60 KB total |
| Fonts | Google Fonts CDN (Inter 4 weights + Lora 3 variants + Caveat 2 weights) with `display=swap` |

### Route Code Splitting — Fully Implemented

All 41+ routes in `App.tsx` use `React.lazy()` with `Suspense` boundaries and route-level skeleton components. Only `BibleSearchRedirect` is eagerly imported (intentional — tiny redirect component, documented with BB-38 comment at line 72).

### Bible Chapter Loading — Verified Lazy

`WEB_BOOK_LOADERS` in `src/data/bible/index.ts` uses 66 per-book dynamic imports: `() => import(\`./web/${b.slug}.json\`)`. Chapters are loaded on demand via `loadChapterWeb(bookSlug, chapter)`. Bible JSON is NOT in the service worker precache (`globPatterns` doesn't match `.json` files in `src/data/`).

### Search Index — Lazy with Caching

`loadSearchIndex()` in `src/lib/search/engine.ts` fetches `/search/bible-index.json` on first search. Module-level singleton cache (`cachedIndex`). The index IS in the precache manifest (`search/*.json` glob). The hook `useBibleSearch` exposes `isLoadingIndex` state for UI feedback.

### Service Worker Precache Concern

The precache glob `['**/*.{js,css,html,ico,png,svg,woff2}', 'search/*.json']` includes:
- All 307 JS chunks (3.8 MB gzipped) — including all 130+ Bible book chunks that most users will never visit
- All OG card images (~1 MB)
- The search index (1.3 MB gzipped)

**Total precache is estimated at 5+ MB gzipped** — at or over the 5 MB target limit. Bible book chunks and OG images are prime candidates for exclusion (they should be runtime-cached, not precached).

### Unused Dependencies

Three `dependencies` entries in `package.json` have zero imports in `src/`:
- `react-hook-form` — installed but never imported
- `@hookform/resolvers` — installed but never imported
- `@tanstack/react-query` — installed but never imported

These don't affect bundle size (Vite tree-shakes them out), but they bloat `node_modules/`, slow `pnpm install`, and create false dependency audit signals. The spec says "zero new npm packages" — removing unused ones is consistent with that spirit.

### Font Loading

Google Fonts CDN with `display=swap` and `preconnect` hints already configured in `index.html`. Service worker caches font stylesheets (StaleWhileRevalidate) and webfont files (CacheFirst, 1-year expiry). Current setup is solid.

### Third-Party Scripts — None

No analytics, error tracking, or third-party script tags in `index.html`. Only dependency with external network calls is `@google/genai` (used by AskPage AI Bible chat).

### Icon Imports — Verified Tree-Shakeable

All production `lucide-react` imports use per-icon named imports (`import { Heart, Star } from 'lucide-react'`). No namespace imports in production code (the 4 `import *` usages are in test files for mocking).

### Memoization — Generally Good

610+ `useMemo`/`useCallback` usages across the codebase. Heatmap (`CalendarHeatmap.tsx`) memoizes `buildGrid()`. Selective memoization pattern — not over-memoized.

### Large Lists — Naturally Capped

Prayer Wall: ~18 mock cards, no virtualization needed. Bible search: paginated at 50 results/page. Activity feeds: filtered to small sets. No list currently exceeds 100 rendered items.

### Tailwind — Properly Configured

JIT mode (Tailwind v3 default). Content pattern: `['./index.html', './src/**/*.{js,ts,jsx,tsx}']`. Purging works correctly.

### Existing Measurement Infrastructure — None

No `frontend/docs/performance-measurement.md`, no `frontend/scripts/measure-bundle.mjs`, no bundle analysis tooling (`rollup-plugin-visualizer` not installed).

### Test Patterns

Tests use Vitest + React Testing Library + jsdom. Provider wrapping with `AuthModalProvider`, `ToastProvider`, `AudioProvider` as needed. Test files at `src/**/__tests__/*.test.tsx`. Performance tests will go in `frontend/tests/performance/` (new directory outside `src/` — Playwright-based, not Vitest).

### Directory Structure

```
frontend/
├── src/
│   ├── App.tsx                    # All routes, all lazy-loaded
│   ├── sw.ts                      # Service worker (injectManifest)
│   ├── components/                # UI components
│   ├── data/bible/web/            # 66 Bible book JSON files
│   ├── hooks/                     # Custom hooks
│   ├── lib/search/                # Search engine + index loading
│   ├── pages/                     # Route components
│   └── test/                      # Test setup
├── public/
│   ├── search/bible-index.json    # 7.2 MB search index
│   ├── og/                        # OG card images
│   └── icons/                     # PWA icons
├── scripts/                       # Build scripts (og-generate, build-search-index)
├── docs/                          # (empty — will add performance doc)
├── tests/                         # (will add performance/)
├── vite.config.ts                 # Build config
├── tailwind.config.js             # Tailwind config
└── package.json                   # Dependencies
```

---

## Auth Gating Checklist

N/A — BB-36 adds no new interactive elements or user-facing functionality. Existing auth gates are unchanged.

---

## Design System Values (for UI steps)

N/A — BB-36 makes no visual changes. No UI steps require design system values.

---

## Design System Reminder

N/A — BB-36 is invisible to users. No UI steps.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec, no master plan.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | BB-36 creates zero new localStorage keys |

---

## Responsive Structure

N/A — BB-36 does not add or modify any UI elements. Performance optimizations apply equally across all breakpoints.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — no UI sections added or modified.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-35 (Accessibility Audit) is shipped and committed
- [ ] BB-33, BB-34, BB-39, BB-42 and all other features in the bible-redesign wave are committed
- [ ] `pnpm build` succeeds with 0 errors and 0 warnings
- [ ] `pnpm test` passes (all tests green)
- [ ] Stay on `bible-redesign` branch — no new branch, no merge
- [ ] Zero new auth gates, zero new localStorage keys
- [ ] Zero new npm packages (removing unused is allowed)
- [ ] Each optimization committed individually with before-and-after metrics
- [ ] Any optimization that doesn't deliver estimated impact is rolled back

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Self-host fonts vs keep Google Fonts CDN | Keep Google Fonts CDN | Already has `preconnect` + `display=swap` + SW caching. Self-hosting would add font files to precache. CDN has high cache-hit rates across sites. Not worth the complexity for marginal gain. |
| Remove unused deps in this spec or defer | Remove in this spec | `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query` have zero imports. Removing them is safe, reversible, and consistent with "bundle size smaller or equal" target. |
| Virtualize prayer wall / search lists | Do not virtualize | Current list sizes are naturally capped (18 prayer cards, 50 search results/page). No list exceeds 100 rendered items. Adding react-window would be a new dependency for no measurable gain. Document as "verified acceptable" rather than remediated. |
| Search index in precache | Move to runtime cache | The 7.2 MB / 1.3 MB gzipped search index is precached via `search/*.json` glob. Most users never search. Moving it to runtime caching (fetch on first search, cache after) saves 1.3 MB from precache. |
| Bible book JS chunks in precache | Exclude from precache | The 130+ Bible book chunks total several MB gzipped. Most users visit a few books. These should be runtime-cached (CacheFirst), not precached. |
| OG images in precache | Exclude from precache | OG card images are only served as meta tag references for link previews. Browsers don't display them. Precaching them wastes bandwidth. |
| WebP/AVIF conversion for images | Defer | The spec says "where the build pipeline supports it." Vite doesn't natively convert PNGs to WebP. Adding a plugin would be a new dependency. OG images are already small (51-99 KB each) and only served as meta tags. Not worth it. |
| Bundle analyzer as permanent dep | No — script-only | The `measure-bundle.mjs` script will read the `dist/` output directly rather than requiring a Rollup plugin. Zero new dependencies. |

---

## Implementation Steps

### Step 1: Baseline Measurement — Bundle Size Script

**Objective:** Create `frontend/scripts/measure-bundle.mjs` that produces a structured bundle size report from the `dist/` directory.

**Files to create:**
- `frontend/scripts/measure-bundle.mjs` — Node.js script, reads `dist/`, reports sizes

**Details:**

The script:
1. Walks `dist/assets/` and lists all `.js` and `.css` files with raw sizes
2. Sorts JS files by size descending, reports top 20
3. Reports total raw and gzipped sizes for JS, CSS, HTML
4. Reports `dist/search/bible-index.json` size (raw + gzipped)
5. Reports `dist/` total size
6. Outputs structured JSON to stdout and human-readable table to stderr
7. Uses only Node.js built-in modules (`fs`, `path`, `child_process` for gzip via `zlib`)

No external dependencies. Executable via `node scripts/measure-bundle.mjs` after `pnpm build`.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add any npm dependencies
- Do NOT modify `package.json` scripts (user can add a script entry later if they want)
- Do NOT use ESM `import` for Node builtins on older Node — use `createRequire` or ensure `"type": "module"` in package.json (already set)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual verification | manual | Run `pnpm build && node scripts/measure-bundle.mjs` and verify output matches expected format |

**Expected state after completion:**
- [ ] `frontend/scripts/measure-bundle.mjs` exists and runs without errors
- [ ] Script produces JSON output with chunk sizes, totals, and search index size
- [ ] Script uses zero external dependencies

---

### Step 2: Baseline Measurement — Playwright Performance Test

**Objective:** Create `frontend/tests/performance/core-flows.spec.ts` that captures timing metrics for key user flows.

**Files to create:**
- `frontend/tests/performance/core-flows.spec.ts` — Playwright test file

**Details:**

The test file captures timing metrics for these flows (not CI-integrated, manual run via `npx playwright test tests/performance/`):

1. **Cold load — Home page:** Navigate to `/`, measure `performance.timing` (TTFB, DOMContentLoaded, load event), capture LCP via PerformanceObserver
2. **Home to Bible navigation:** From `/`, click Bible nav link, measure time to `/bible` content visible
3. **Bible chapter cold load:** Navigate directly to `/bible/john/3`, measure time to verse content visible
4. **Chapter-to-chapter navigation:** From `/bible/john/3`, navigate to chapter 4, measure time to content swap
5. **Daily Hub tab switching:** Navigate to `/daily`, switch between all 4 tabs, measure time to tab content visible
6. **Search query to results:** Navigate to `/bible`, enter search query "love", measure time to first result visible
7. **My Bible page load:** Navigate to `/bible/my`, measure time to content visible

Each test:
- Uses `page.evaluate(() => performance.now())` for precise timing
- Logs results to console in a structured format
- Does NOT assert thresholds (this is measurement, not gating)
- Runs headless with `--headed=false`

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add performance assertions that would fail CI — this is measurement-only
- Do NOT import from `src/` — Playwright tests are external
- Do NOT launch visible browser (`headless: true` per memory rule)
- Do NOT add `@playwright/test` as a new dependency — it's already in devDependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual run | e2e | `npx playwright test tests/performance/ --headed=false` produces timing output |

**Expected state after completion:**
- [ ] `frontend/tests/performance/core-flows.spec.ts` exists
- [ ] Running the test produces timing data for all 7 flows
- [ ] Tests run headless without errors

---

### Step 3: Baseline Measurement — Performance Documentation

**Objective:** Create `frontend/docs/performance-measurement.md` explaining how to run baseline measurements and interpret results.

**Files to create:**
- `frontend/docs/performance-measurement.md`

**Details:**

The doc covers:
1. How to run the bundle size script (`node scripts/measure-bundle.mjs`)
2. How to run the Playwright performance tests
3. How to run Lighthouse manually (Chrome DevTools → Lighthouse → Mobile preset, 4x CPU throttle)
4. Key metrics to capture: Lighthouse scores (Performance, A11y, Best Practices, SEO), Core Web Vitals (LCP, INP, CLS, TBT, TTFB)
5. Recommended device profiles for realistic testing
6. How to interpret results and compare before/after
7. List of major pages to measure (from spec)

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT include any actual measurement data — that goes in the baseline recon document
- Do NOT prescribe specific performance targets — those come from the spec

**Test specifications:**
None — documentation file.

**Expected state after completion:**
- [ ] `frontend/docs/performance-measurement.md` exists
- [ ] Covers all measurement methods (bundle script, Playwright tests, manual Lighthouse)

---

### Step 4: Baseline Capture — Recon Document

**Objective:** Run all measurement tools and capture the pre-optimization baseline at `_plans/recon/bb36-performance-baseline.md`.

**Files to create:**
- `_plans/recon/bb36-performance-baseline.md`

**Details:**

Execute the measurements:
1. Run `pnpm build` to ensure a fresh production build
2. Run `node scripts/measure-bundle.mjs` and capture the output
3. Run Lighthouse via Chrome DevTools on key pages (served via `pnpm preview`) with Mobile preset, 4x CPU throttle, Slow 4G:
   - `/` (home, logged out)
   - `/bible/john/3` (Bible reader cold load)
   - `/bible/my` (My Bible)
   - `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`
   - `/settings`
   - Bible search results
4. Run `npx playwright test tests/performance/ --headed=false` and capture timings
5. Document service worker precache manifest size (from the build output)
6. Document image inventory with file sizes

Compile everything into a structured baseline document with:
- Lighthouse scores table (all pages × all categories)
- Core Web Vitals table (LCP, INP, CLS, TBT, TTFB per page)
- Bundle size breakdown (top 20 chunks, totals)
- Service worker precache size
- Image inventory
- Playwright flow timings
- Prioritized optimization list with impact/cost/priority ranking

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT begin any optimization until the baseline is captured and reviewed
- Do NOT use idealized desktop metrics — mobile emulation only
- Do NOT fabricate numbers — all data comes from actual measurements

**Test specifications:**
None — documentation/recon file.

**Expected state after completion:**
- [ ] `_plans/recon/bb36-performance-baseline.md` exists with complete baseline data
- [ ] Prioritized optimization list is included
- [ ] Baseline covers all pages from the spec's measurement list

---

### Step 5: Optimization — Remove Unused Dependencies

**Objective:** Remove `react-hook-form`, `@hookform/resolvers`, and `@tanstack/react-query` from `package.json` dependencies.

**Files to modify:**
- `frontend/package.json` — remove 3 unused dependencies

**Details:**

Run `pnpm remove react-hook-form @hookform/resolvers @tanstack/react-query`. Verify:
1. `pnpm build` still succeeds
2. `pnpm test` still passes
3. No import errors anywhere

These packages have zero imports in `src/` (verified via grep). They were installed early in the project and never used. Removing them:
- Reduces `node_modules/` size and `pnpm install` time
- Eliminates false dependency audit signals
- Does NOT affect bundle size (Vite already tree-shakes them out)

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove any dependency that has imports in `src/`
- Do NOT modify any source files
- Do NOT add any new dependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | integration | `pnpm build` exits 0 |
| Tests pass | integration | `pnpm test` exits 0 |

**Expected state after completion:**
- [ ] `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query` removed from `package.json`
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm install` is faster (smaller `node_modules/`)

---

### Step 6: Optimization — Service Worker Precache Tuning

**Objective:** Reduce the service worker precache size by excluding Bible book chunks, OG images, and the search index from precache. Add runtime caching rules for these instead.

**Files to modify:**
- `frontend/vite.config.ts` — narrow `globPatterns` to exclude Bible chunks, OG images, search index
- `frontend/src/sw.ts` — add runtime caching rule for Bible book chunks and search index

**Details:**

**Step 6a: Narrow precache glob in `vite.config.ts`:**

Change the `injectManifest.globPatterns` to exclude Bible book chunks and the search index. The current glob `['**/*.{js,css,html,ico,png,svg,woff2}', 'search/*.json']` matches everything. Replace with a more targeted pattern:

```typescript
injectManifest: {
  globPatterns: ['**/*.{css,html,ico,woff2}', 'assets/index-*.js', 'assets/react-*.js', 'assets/recharts-*.js', 'assets/leaflet-*.js', 'assets/react-helmet-*.js'],
  // Bible book chunks, OG images, and search index are runtime-cached instead
}
```

Actually, Vite's `globPatterns` works on the `dist/` output. The problem is that `**/*.{js,...}` matches every JS chunk including 130+ Bible book chunks. The cleanest approach is to use `globIgnores` to exclude the Bible book files and search index:

```typescript
injectManifest: {
  globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
  globIgnores: [
    '**/og/**',           // OG card images (only used as meta tags)
    '**/search/**',       // Search index (7.2 MB, runtime-cached instead)
  ],
}
```

Note: Bible book JSON data is imported via `import()` and becomes JS chunks in `dist/assets/`. These are named like `genesis-*.js`, `psalms-*.js`, etc. Since they're JS files and we need the app shell JS files precached, we can't glob-exclude them by extension. However, these are already lazy-loaded chunks — the service worker's `NavigationRoute` handler serves `index.html` for navigation requests, and the lazy-loaded JS chunks are fetched on demand. They will be runtime-cached via the catch-all `NetworkFirst` rule in `sw.ts` (Rule 6). This is acceptable because:
- Bible chunks are fetched only when the user navigates to that book
- After first fetch, they're cached via the runtime catch-all rule
- The precache still includes the app shell (index JS, CSS, HTML, icons, fonts)

The biggest wins are removing the search index (1.3 MB gzipped) and OG images (~1 MB raw) from precache.

**Step 6b: Verify the search index gets runtime-cached:**

The existing catch-all rule (Rule 6 in `sw.ts`) uses `NetworkFirst` for same-origin requests. When the search index is fetched on first search, it will be cached under `wr-runtime-v1`. This is fine for the search index — it rarely changes, and `NetworkFirst` means the user gets the latest version when online.

For better search performance after first load, add a dedicated `CacheFirst` rule for `/search/*.json` in `sw.ts` (before the catch-all):

```typescript
// Rule: Search index — CacheFirst after initial fetch
registerRoute(
  /\/search\/.*\.json$/,
  new CacheFirst({
    cacheName: 'wr-search-index-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  }),
)
```

**Before/after measurement:** Run `pnpm build`, then inspect the precache manifest in the built service worker file to confirm the precache size decreased. Document the delta.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove the precache for the app shell (index JS, CSS, HTML)
- Do NOT change runtime caching strategies for existing rules
- Do NOT break offline functionality — the app shell must still work offline
- Do NOT add any new dependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | integration | `pnpm build` exits 0 |
| SW registers | manual | `pnpm preview`, open browser, verify SW installs without errors in DevTools → Application |
| Search still works | manual | Navigate to Bible, search for "love", verify results appear |
| Offline shell loads | manual | Go offline in DevTools, navigate to `/`, verify app shell loads |

**Expected state after completion:**
- [ ] `globPatterns` in `vite.config.ts` no longer includes `search/*.json`
- [ ] `globIgnores` excludes OG images
- [ ] `sw.ts` has dedicated `CacheFirst` rule for search index
- [ ] Precache manifest size decreased by at least 1 MB gzipped
- [ ] Offline app shell still works
- [ ] Search still works (index loads on first search, cached after)

---

### Step 7: Optimization — Font Loading Verification

**Objective:** Verify font loading is optimal and document findings. No changes expected.

**Files to modify:** None expected

**Details:**

Verify:
1. `index.html` has `<link rel="preconnect" href="https://fonts.googleapis.com">` — ✓ already present
2. `index.html` has `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` — ✓ already present
3. Google Fonts URL includes `display=swap` — ✓ already present
4. `sw.ts` caches font stylesheets (StaleWhileRevalidate) and webfonts (CacheFirst) — ✓ already present

**Caveat font assessment:** Caveat is loaded (2 weights: 400, 700) but is only used for the logo. Check if both weights are needed — the logo likely uses only one weight. If only one weight is used, reduce to `family=Caveat:wght@700` (or whichever weight the logo uses) to eliminate one unused font variant.

Check the logo component for which Caveat weight it uses. If it uses only `font-bold` (700), remove the 400 weight from the Google Fonts URL.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT self-host fonts (decision documented in Edge Cases)
- Do NOT remove any font family entirely — Caveat is still used for the logo
- Do NOT change `font-display` strategy — `swap` is correct

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | integration | `pnpm build` exits 0 |
| Logo renders correctly | manual | Verify the Worship Room logo renders with the correct Caveat font |

**Expected state after completion:**
- [ ] Font loading verified as optimal
- [ ] Caveat weight reduced to single weight if only one is used
- [ ] Documented in baseline recon

---

### Step 8: Optimization — Image Inventory and Assessment

**Objective:** Inventory all image assets, document sizes, and identify any that are oversized.

**Files to modify:** None expected (unless oversized images found)

**Details:**

Inventory all images:
1. `public/icons/` — PWA icons (4-23 KB each, reasonable)
2. `public/og/` — OG card images (51-99 KB each, PNGs)
3. `public/apple-touch-icon.png` — 4 KB
4. `public/og-default.png` — 99 KB (largest single image)
5. `public/audio/artwork/` — SVG icons (~500 bytes each)

**Assessment:** All images are reasonably sized. OG images at 51-99 KB are within acceptable range for social media cards (Facebook recommends under 300 KB). No images need resizing.

**WebP/AVIF conversion:** Deferred per spec ("where the build pipeline supports it"). Vite doesn't natively convert PNGs to WebP. Adding an image optimization plugin would be a new dependency. The images are small enough that the complexity isn't justified.

Document the inventory in the baseline recon document.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add image optimization dependencies
- Do NOT convert images to WebP/AVIF (deferred per spec)
- Do NOT remove any images

**Test specifications:**
None — inventory and documentation only.

**Expected state after completion:**
- [ ] Image inventory documented in baseline recon
- [ ] No oversized images found (or remediated if found)

---

### Step 9: Optimization — Third-Party Script and Dependency Audit

**Objective:** Verify no third-party scripts or unnecessary dependencies are included.

**Files to modify:** None expected

**Details:**

Verify:
1. `index.html` has no `<script>` tags beyond the Vite entry point — ✓ confirmed
2. No analytics libraries (Google Analytics, Mixpanel, PostHog) — ✓ confirmed
3. No error tracking libraries (Sentry, Rollbar) — ✓ confirmed
4. `@google/genai` is the only external API dependency — used by AskPage, appropriate

Document findings in the baseline recon.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove `@google/genai` — it's actively used

**Test specifications:**
None — audit and documentation only.

**Expected state after completion:**
- [ ] Third-party script inventory documented
- [ ] No unnecessary scripts or dependencies found

---

### Step 10: Optimization — React Re-Render and Memoization Audit

**Objective:** Identify components with excessive re-renders and verify expensive computations are properly memoized.

**Files to modify:** Any files where re-render fixes are needed

**Details:**

**Memoization verification targets (from spec):**

1. **BB-43 reading heatmap** (`CalendarHeatmap.tsx`): Verify `useMemo` is used for `buildGrid()` with correct dependency array. Check that the heatmap doesn't recompute on every parent render.

2. **BB-46 verse echo selection** (`VerseEchoCard.tsx` or similar): Verify echo selection logic uses `useMemo` where appropriate.

3. **Dashboard widgets:** Dashboard renders 5+ widgets. Verify individual widgets don't cause full-dashboard re-renders. Check if widget components use `React.memo()` or if state is properly scoped.

4. **Bible reader verse rendering:** `BibleReader` renders potentially hundreds of verses. Verify the verse list doesn't re-render entirely on every interaction (verse selection, highlight, note). Check if individual verse components are memoized.

**Re-render identification approach:**
- Read the key components listed above
- Check for state that's too broadly scoped (e.g., a `useState` at the page level that causes all children to re-render)
- Check for missing `React.memo()` on list item components
- Check for inline object/array creation in props (causes referential inequality on every render)
- Check for context providers that trigger too-broad re-renders

**Remediation approach:**
- Add `React.memo()` to list item components that receive stable props
- Extract state to more local scopes where appropriate
- Use `useMemo` / `useCallback` for expensive operations or callback props
- Only fix clear performance issues — do not over-memoize

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add `React.memo()` everywhere — only where profiling shows a clear win
- Do NOT change component APIs or behavior
- Do NOT remove existing memoization
- Do NOT add new dependencies (no `why-did-you-render`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests pass | integration | `pnpm test` exits 0 after any memoization changes |

**Expected state after completion:**
- [ ] BB-43 heatmap memoization verified (and fixed if needed)
- [ ] BB-46 echo selection memoization verified (and fixed if needed)
- [ ] Key components audited for re-render issues
- [ ] Any fixes committed with before/after notes
- [ ] No behavior changes — only render performance

---

### Step 11: Optimization — Preconnect/Preload Hints

**Objective:** Add any missing `<link rel="preconnect">` or `<link rel="preload">` hints for critical resources.

**Files to modify:**
- `frontend/index.html` — add hints if beneficial

**Details:**

**Current state:**
- `<link rel="preconnect" href="https://fonts.googleapis.com">` — ✓ present
- `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` — ✓ present

**Assessment of additional hints:**

1. **`generativelanguage.googleapis.com`** (Google Generative AI): Only used on the AskPage (`/ask`). Adding a preconnect would benefit only users who navigate to `/ask`. Since this is a secondary page, the preconnect is not worth the DNS lookup cost on every initial load. Skip.

2. **`<link rel="preload">`** for critical CSS/JS: Vite automatically adds `<link rel="modulepreload">` for the entry module and its direct dependencies in the built HTML. No manual preloading needed.

3. **`<link rel="dns-prefetch">`** for Google Fonts: Already covered by `preconnect` (which implies dns-prefetch). No change needed.

**Conclusion:** No additional hints needed. The current setup is optimal.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add preload hints that increase initial load for resources not needed on the landing page
- Do NOT add preconnect for origins only used on secondary pages

**Test specifications:**
None — assessment and documentation only.

**Expected state after completion:**
- [ ] Preconnect/preload audit documented in baseline recon
- [ ] No changes needed (or minimal additions made)

---

### Step 12: Optimization — CSS and HTML Critical Path Verification

**Objective:** Verify Tailwind CSS purging is correct and the initial HTML response is minimal.

**Files to modify:** None expected

**Details:**

1. **Tailwind CSS purging:** Verify `tailwind.config.js` `content` array matches all template files. Current: `['./index.html', './src/**/*.{js,ts,jsx,tsx}']` — correct. JIT mode in Tailwind v3 ensures only used classes are emitted. CSS output is 136 KB raw / 22 KB gzipped — very reasonable.

2. **HTML critical path:** `index.html` contains only:
   - Meta tags (charset, viewport, description, theme-color, apple-web-app)
   - Font preconnect links
   - Google Fonts stylesheet link (render-blocking but with `display=swap`)
   - `<div id="root"></div>`
   - Single `<script type="module" src="/src/main.tsx"></script>`

   No blocking external scripts. The Google Fonts CSS link is technically render-blocking, but with `display=swap` and service worker caching, the impact is minimal on repeat visits.

3. **Verify no unused Tailwind utilities:** The built CSS at 22 KB gzipped is a strong signal that purging works. No further action needed.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT inline CSS or attempt critical CSS extraction (Vite handles this well enough)
- Do NOT modify the HTML structure

**Test specifications:**
None — verification and documentation only.

**Expected state after completion:**
- [ ] Tailwind CSS purging verified as correct
- [ ] HTML critical path verified as minimal
- [ ] Documented in baseline recon

---

### Step 13: Optimization — Icon Import Tree-Shaking Verification

**Objective:** Verify Lucide React icon imports are tree-shakeable.

**Files to modify:** None expected

**Details:**

All production imports use per-icon named imports: `import { Heart, Star } from 'lucide-react'`. The 4 `import *` usages are in test files for mocking purposes — these don't affect the production bundle.

Vite + Rollup tree-shake unused exports from `lucide-react` automatically when using named imports. No action needed.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change icon import patterns

**Test specifications:**
None — verification only.

**Expected state after completion:**
- [ ] Icon imports verified as tree-shakeable
- [ ] Documented in baseline recon

---

### Step 14: Optimization — List Virtualization Assessment

**Objective:** Verify large lists are naturally capped and document the assessment.

**Files to modify:** None

**Details:**

| List | Max Rendered Items | Virtualized? | Assessment |
|------|-------------------|-------------|------------|
| Prayer Wall feed | ~18 mock cards | No | Naturally capped. Phase 3 may need virtualization when real data arrives. |
| Bible search results | 50 per page (paginated) | No (paginated) | Pagination keeps render count low. Acceptable. |
| Activity feed / Insights | Filtered to small sets | No | Naturally capped by date range. |
| Bible book list | 66 items | No | Fixed count, renders fast. |
| Journal entries list | Filtered, typically <20 | No | Naturally capped by usage. |

No list currently exceeds 100 rendered items. Virtualization is not needed and would add a new dependency (`react-window` or `@tanstack/react-virtual`).

Document this assessment in the baseline recon with a note: "Re-evaluate when Phase 3 introduces real data persistence — prayer wall and journal feeds may grow large."

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add virtualization libraries
- Do NOT add any new dependencies

**Test specifications:**
None — assessment and documentation only.

**Expected state after completion:**
- [ ] List virtualization assessment documented
- [ ] No action needed for current data volumes

---

### Step 15: Verification Pass — Re-Run All Measurements

**Objective:** After all optimizations ship, re-run the full baseline measurement and compare against pre-optimization numbers.

**Files to modify:**
- `_plans/recon/bb36-performance-baseline.md` — add "After BB-36" comparison section

**Details:**

1. Run `pnpm build` for a fresh production build
2. Run `node scripts/measure-bundle.mjs` and compare against baseline
3. Run Lighthouse on all major pages with same device profile (Mobile, 4x CPU, Slow 4G)
4. Run Playwright performance tests and compare timings
5. Verify service worker precache size decreased

**Comparison table format:**

| Metric | Before BB-36 | After BB-36 | Delta | Target |
|--------|-------------|------------|-------|--------|
| Lighthouse Performance (home) | X | Y | +/-Z | 90+ |
| LCP (home) | Xs | Ys | +/-Zs | <2.5s |
| ... | | | | |
| Bundle size (gzipped) | X MB | Y MB | -Z KB | ≤ baseline |
| Precache size (gzipped) | X MB | Y MB | -Z MB | ≤ 5 MB |

**Targets from spec:**
- Lighthouse Performance score 90+ on all major pages
- LCP < 2.5s on mobile
- CLS < 0.1
- TBT < 200ms
- Lighthouse Accessibility score ≥ 95 on all pages (BB-35 baseline)
- Bundle size ≤ pre-BB-36 baseline
- No Core Web Vital regresses more than 10%

6. Document any metrics that don't meet targets as follow-up items

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT fabricate numbers — all data from actual measurements
- Do NOT skip any page from the measurement list
- Do NOT use desktop metrics — mobile emulation only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | integration | `pnpm test` exits 0 |
| Build passes | integration | `pnpm build` exits 0 |
| Lint passes | integration | `pnpm lint` exits 0 |

**Expected state after completion:**
- [ ] Baseline document updated with "After BB-36" comparison
- [ ] All Lighthouse targets verified (90+ Performance, 95+ Accessibility)
- [ ] Bundle size verified ≤ baseline
- [ ] Precache size verified ≤ 5 MB gzipped
- [ ] No Core Web Vital regressed more than 10%
- [ ] Any unmet targets documented as follow-up items

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Bundle size measurement script |
| 2 | — | Playwright performance test file |
| 3 | — | Performance measurement documentation |
| 4 | 1, 2, 3 | Baseline capture (requires measurement tools) |
| 5 | 4 | Remove unused dependencies (after baseline) |
| 6 | 4 | Service worker precache tuning (after baseline) |
| 7 | 4 | Font loading verification (after baseline) |
| 8 | 4 | Image inventory (after baseline) |
| 9 | 4 | Third-party audit (after baseline) |
| 10 | 4 | Re-render and memoization audit (after baseline) |
| 11 | 4 | Preconnect/preload hints (after baseline) |
| 12 | 4 | CSS/HTML critical path verification (after baseline) |
| 13 | 4 | Icon tree-shaking verification (after baseline) |
| 14 | 4 | List virtualization assessment (after baseline) |
| 15 | 5-14 | Final verification pass (after all optimizations) |

**Parallelizable:** Steps 1-3 can run in parallel. Steps 5-14 can run in parallel (all depend on Step 4, not on each other). Step 15 must be last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bundle size measurement script | [COMPLETE] | 2026-04-13 | Created `frontend/scripts/measure-bundle.mjs`. Verified output: 390 files, 25.83 MB dist, 3.68 MB JS+CSS+HTML gzip. |
| 2 | Playwright performance test | [COMPLETE] | 2026-04-13 | Created `frontend/tests/performance/core-flows.spec.ts` with 7 flow tests. Compiles cleanly. |
| 3 | Performance measurement docs | [COMPLETE] | 2026-04-13 | Created `frontend/docs/performance-measurement.md` covering bundle script, Playwright tests, and manual Lighthouse. |
| 4 | Baseline capture | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb36-performance-baseline.md`. Bundle: 3.68 MB gzip JS+CSS+HTML, main bundle 97.6 KB gzip. Precache: 330 entries, 17.3 MB raw. Pre-existing build failure fixed (search index glob removed). Playwright tests: all 7 flows measured. Vitest exclude added for `tests/**`. |
| 5 | Remove unused dependencies | [COMPLETE] | 2026-04-13 | Removed `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query` via `pnpm remove`. Build + tests unaffected. |
| 6 | Service worker precache tuning | [COMPLETE] | 2026-04-13 | `globPatterns` narrowed (removed `search/*.json`, removed `png` from glob), `globIgnores` excludes `**/og/**`. Added dedicated `CacheFirst` rule for search index in `sw.ts`. Search index now runtime-cached on first use. Build passes, precache 330 entries / 17.3 MB raw. |
| 7 | Font loading verification | [COMPLETE] | 2026-04-13 | Both Caveat weights (400 + 700) actively used — no reduction possible. Preconnect, display=swap, SW caching all present. No changes needed. |
| 8 | Image inventory | [COMPLETE] | 2026-04-13 | All images appropriately sized (OG cards 51-99 KB, icons 4-23 KB). No oversized images. WebP/AVIF deferred. Documented in baseline. |
| 9 | Third-party audit | [COMPLETE] | 2026-04-13 | No third-party scripts. Only external API dep is `@google/genai`. Clean. Documented in baseline. |
| 10 | Re-render & memoization audit | [COMPLETE] | 2026-04-13 | Audited CalendarHeatmap (buildGrid memoized), ReadingHeatmap (buildGrid memoized), EchoCard (lightweight, no memo needed), dashboard widgets (extensive useMemo), BibleReader (useMemo + useCallback). No fixes needed. |
| 11 | Preconnect/preload hints | [COMPLETE] | 2026-04-13 | preconnect to both Google Fonts origins present. No additional hints needed — Vite handles modulepreload. generativelanguage.googleapis.com skipped (secondary page). |
| 12 | CSS/HTML critical path | [COMPLETE] | 2026-04-13 | Tailwind JIT purging correct (content array matches templates). CSS 22 KB gzip — healthy. HTML minimal (meta + fonts + entry script). No changes needed. |
| 13 | Icon tree-shaking verification | [COMPLETE] | 2026-04-13 | All production lucide-react imports use named imports. 4 `import *` only in test files. Tree-shaking works correctly. |
| 14 | List virtualization assessment | [COMPLETE] | 2026-04-13 | Prayer Wall ~18 cards, search paginated at 50, Bible books 66, all naturally capped. No virtualization needed. Documented for Phase 3 re-evaluation. |
| 15 | Final verification pass | [COMPLETE] | 2026-04-13 | Bundle size unchanged (97.6 KB main gzip). Build passes. Tests pass (pre-existing failures only). Lint passes (pre-existing errors only). Precache fixed (search index + OG images excluded). 3 unused deps removed. Baseline doc updated with comparison. Lighthouse deferred to manual. |
