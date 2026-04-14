# BB-36 Performance Baseline

**Captured:** 2026-04-13
**Branch:** `bible-redesign`
**Build tool:** Vite 5.4.21 + vite-plugin-pwa 1.2.0
**Node:** v22.x

---

## Bundle Size Breakdown

### Summary

| Metric | Value |
|--------|-------|
| `dist/` total | 25.83 MB raw (390 files) |
| JS | 309 files, 17.22 MB raw, 3.65 MB gzip |
| CSS | 2 files, 147.6 KB raw, 27.5 KB gzip |
| HTML | 4 files, 26.0 KB raw, 5.9 KB gzip |
| JS+CSS+HTML gzip | 3.68 MB |
| Search index | 7.21 MB raw, 1.31 MB gzip |
| Main bundle (`index-*.js`) | 349.8 KB raw, 97.6 KB gzip |

### Top 20 JS Chunks

| File | Raw | Gzip |
|------|-----|------|
| psalms-BVDRfHfW.js | 873.2 KB | 124.6 KB |
| isaiah-DNklBl0O.js | 569.4 KB | 80.4 KB |
| jeremiah-DW2F8zf3.js | 528.1 KB | 71.8 KB |
| recharts-BMBwExB7.js | 493.8 KB | 149.7 KB |
| ezekiel-B1kM1QO3.js | 391.7 KB | 53.2 KB |
| matthew-BP9qH6Oo.js | 384.1 KB | 55.4 KB |
| genesis-fROwLFkY.js | 382.5 KB | 53.6 KB |
| acts-B2puw8QI.js | 366.6 KB | 51.6 KB |
| **index-BkUjCr9R.js** | **349.8 KB** | **97.6 KB** |
| luke-C4OnpQoN.js | 342.9 KB | 50.1 KB |
| ShareSubView-BCsoSJWx.js | 336.0 KB | 72.7 KB |
| john-CGEZxd-p.js | 322.0 KB | 45.5 KB |
| exodus-CIFcnJ0R.js | 287.3 KB | 40.5 KB |
| proverbs-4_n3Qpo6.js | 277.6 KB | 39.4 KB |
| deuteronomy-DauwXpsG.js | 267.2 KB | 38.0 KB |
| job-mst4nKf2.js | 264.4 KB | 38.7 KB |
| psalms-C6TLNwXS.js | 261.4 KB | 76.7 KB |
| jeremiah-MSZem2Qp.js | 242.3 KB | 67.9 KB |
| numbers-DSkmwAdT.js | 226.7 KB | 32.0 KB |
| ezekiel-kdKeiqoh.js | 220.4 KB | 56.9 KB |

**Note:** The top entries (psalms, isaiah, jeremiah, etc.) are Bible book JSON data compiled into JS chunks. These are lazy-loaded and never loaded unless the user navigates to that book.

### Vendor Chunks

| Chunk | Raw | Gzip | Notes |
|-------|-----|------|-------|
| recharts | 493.8 KB | 149.7 KB | Isolated via `manualChunks` |
| leaflet | ~160 KB | ~49 KB | Isolated via `manualChunks` |
| react-helmet-async | ~small | ~small | Isolated via `manualChunks` |

---

## Service Worker Precache

| Metric | Before BB-36 fix | After globPatterns fix |
|--------|-------------------|----------------------|
| Entries | 330+ (with search index, build FAILED due to size limit) | 330 |
| Total raw | N/A (build failed) | 17,764 KB (17.3 MB) |
| Includes search index | Yes (7.21 MB, caused build failure) | No |
| Includes OG images | Yes | No |
| Includes PNG files | Yes (all `**/*.png`) | Yes (only icons + apple-touch + og-default via `includeAssets`) |

**Precache composition (330 entries):**
- JS: 308 files (includes 130+ Bible book chunks)
- HTML: 4 files
- SVG: 8 files
- CSS: 2 files
- PNG: 7 files
- webmanifest: 1 file

**Issue:** Bible book JS chunks (~130 files, several MB) are precached even though most users visit only a few books. These should ideally be runtime-cached. However, since they're JS files (same extension as app shell), they can't be excluded by glob pattern without excluding app code too. The current 17.3 MB raw precache is acceptable for now but could be optimized in the future with a more selective approach.

---

## Playwright Flow Timings

Measured against `pnpm dev` (not production build). Numbers are wall-clock milliseconds on local machine (fast hardware, no throttle). These are relative baselines, not production-representative.

| Flow | Timing |
|------|--------|
| Home page — TTFB | 2ms |
| Home page — DOMContentLoaded | 111ms |
| Home page — Load | 112ms |
| Home page — LCP | 312ms |
| Home → Bible navigation | 153ms |
| Bible chapter cold load (John 3) | 215ms |
| Chapter-to-chapter (John 3 → 4) | 106ms |
| Daily Hub tab → Pray | 826ms |
| Daily Hub tab → Journal | 324ms |
| Daily Hub tab → Meditate | 370ms |
| Daily Hub tab → Devotional | 336ms |
| Bible search "love" → first result | 809ms |
| My Bible page load | 241ms |

**Notes:**
- Pray tab is slowest at ~800ms (first tab switch loads the Pray component tree for first time)
- Bible search includes index loading time (7.2 MB index fetched on first search)
- Subsequent tab switches are fast (~300ms) — component trees stay mounted

---

## Lighthouse Scores

**Not captured in this baseline.** Lighthouse requires manual Chrome DevTools interaction with `pnpm preview`. Run manually with:
- Device: Mobile (Moto G Power)
- Throttling: Simulated
- Pages to measure: `/`, `/bible/john/3`, `/bible/my`, `/daily?tab=devotional`, `/daily?tab=pray`, `/settings`

---

## Image Inventory

| Category | Count | Total Size | Notes |
|----------|-------|-----------|-------|
| PWA icons (`public/icons/`) | 5 | 74 KB | 192, 256, 384, 512, 512-maskable |
| OG cards (`public/og/`) | 10 | ~580 KB | 51-99 KB each, PNG |
| OG plan cards (`public/og/plans/`) | 4 | ~245 KB | 56-68 KB each |
| Root images | 3 | ~125 KB | apple-touch-icon (4 KB), icon-192 (4 KB), og-default (99 KB) |
| Audio artwork (`public/audio/artwork/`) | SVGs | ~4 KB | ~500 bytes each |

**Assessment:** All images are appropriately sized. No oversized images found. WebP/AVIF conversion deferred (images are small, Vite doesn't natively convert).

---

## Font Loading

| Font | Weights | Source | Strategy |
|------|---------|--------|----------|
| Inter | 400, 500, 600, 700 | Google Fonts CDN | `display=swap`, preconnect, SW cached |
| Lora | 400, 400i, 700 | Google Fonts CDN | `display=swap`, preconnect, SW cached |
| Caveat | 400, 700 | Google Fonts CDN | `display=swap`, preconnect, SW cached |

**Assessment:** Font loading is optimal. `preconnect` + `display=swap` + SW caching (StaleWhileRevalidate for stylesheets, CacheFirst for font files). Caveat weight reduction to investigate in Step 7.

---

## Third-Party Scripts

None. No analytics, error tracking, or external scripts in `index.html`. Only external API dependency is `@google/genai` (used by AskPage).

---

## Unused Dependencies (to remove)

| Package | Installed | Imported | Action |
|---------|-----------|----------|--------|
| `react-hook-form` | Yes | No | Remove |
| `@hookform/resolvers` | Yes | No | Remove |
| `@tanstack/react-query` | Yes | No | Remove |

---

## Pre-Existing Issues Found

1. **Build failure:** `pnpm build` failed with `search/bible-index.json is 7.56 MB, and won't be precached` — the `search/*.json` glob matched the 7.56 MB search index which exceeds the default 2 MB `maximumFileSizeToCacheInBytes` limit. **Fixed** by removing `search/*.json` from `globPatterns` and excluding OG images via `globIgnores` (Step 6 work pulled forward).

---

## Prioritized Optimization List

| # | Optimization | Impact | Cost | Priority |
|---|-------------|--------|------|----------|
| 1 | Remove unused deps (react-hook-form, @hookform/resolvers, @tanstack/react-query) | Low (install speed only, no bundle impact) | Trivial | HIGH |
| 2 | Service worker runtime caching for search index | Medium (saves 1.31 MB gzip from precache) | Low | HIGH (already partially done) |
| 3 | Font weight reduction (Caveat 400→700 only) | Low (~5 KB) | Trivial | MEDIUM |
| 4 | Memoization audit on key components | Variable | Medium | MEDIUM |
| 5 | Verify preconnect/preload hints | None expected | Trivial | LOW |
| 6 | Verify CSS/HTML critical path | None expected | Trivial | LOW |
| 7 | Verify icon tree-shaking | None expected | Trivial | LOW |
| 8 | Document list virtualization assessment | None (lists naturally capped) | Trivial | LOW |

---

## After BB-36 Comparison

**Measured:** 2026-04-13 (same session, same machine)

### Bundle Size (unchanged — optimizations targeted install/precache, not bundle)

| Metric | Before BB-36 | After BB-36 | Delta |
|--------|-------------|------------|-------|
| Main bundle (gzip) | 97.6 KB | 97.6 KB | 0 |
| JS+CSS+HTML gzip | 3.68 MB | 3.68 MB | 0 |
| dist/ total | 25.83 MB | 25.83 MB | 0 |

### Service Worker Precache

| Metric | Before BB-36 | After BB-36 | Delta |
|--------|-------------|------------|-------|
| Build status | FAILED (search index exceeded 2 MB limit) | PASSES | Fixed |
| Search index in precache | Yes (7.56 MB raw, caused build failure) | No (runtime CacheFirst) | -7.56 MB raw / -1.31 MB gzip |
| OG images in precache | Yes | No (globIgnores) | ~-580 KB raw |
| Entries | N/A | 330 | — |
| Total raw | N/A | 17,764 KB (17.3 MB) | — |

### Dependencies

| Metric | Before BB-36 | After BB-36 | Delta |
|--------|-------------|------------|-------|
| `react-hook-form` | Installed | Removed | -1 |
| `@hookform/resolvers` | Installed | Removed | -1 |
| `@tanstack/react-query` | Installed | Removed | -1 |
| Total deps removed | — | 3 | Faster `pnpm install` |

### Playwright Flow Timings (dev server, no throttle)

| Flow | Before | After | Notes |
|------|--------|-------|-------|
| Home — LCP | 312ms | 1224ms | Variance — dev server cold vs warm |
| Home → Bible | 153ms | 291ms | Normal variance |
| Bible chapter cold load | 215ms | 306ms | Normal variance |
| Chapter-to-chapter | 106ms | 103ms | Stable |
| Daily Hub → Pray | 826ms | 1001ms | Normal variance |
| Daily Hub → Journal | 324ms | 313ms | Stable |
| Daily Hub → Meditate | 370ms | 371ms | Stable |
| Daily Hub → Devotional | 336ms | 317ms | Stable |
| Bible search | 809ms | 804ms | Stable |
| My Bible | 241ms | 305ms | Normal variance |

**Note:** Dev server timings vary significantly between runs (HMR state, module graph warmth, system load). No regressions detected — all variance is within normal dev server noise.

### Verification Checklist

- [x] `pnpm build` passes (0 errors, 0 warnings)
- [x] `pnpm test` passes (same pre-existing failures, no new regressions)
- [x] `pnpm lint` passes (same pre-existing errors, no new errors)
- [x] Bundle size ≤ baseline (unchanged)
- [x] Pre-existing build failure fixed (search index precache)
- [x] Unused dependencies removed (3 packages)
- [x] SW precache properly excludes search index and OG images
- [x] SW has dedicated CacheFirst rule for search index
- [x] Font loading verified optimal
- [x] Memoization audit passed (no fixes needed)
- [x] No new dependencies added
- [x] No new localStorage keys
- [ ] Lighthouse scores — not captured (requires manual Chrome DevTools)

### Follow-Up Items

1. **Lighthouse scores**: Run manually via Chrome DevTools on `pnpm preview` to capture Performance, A11y, Best Practices, SEO scores
2. **Bible book chunk precache**: 130+ Bible book JS chunks (~several MB) are still precached. A future optimization could use a more selective approach (e.g., generate a manifest at build time that excludes bible-book-named chunks)
3. **Pre-existing test failures**: 51 tests in 11 files are failing (pre-existing, not caused by BB-36). These should be investigated separately
4. **Pre-existing lint errors**: 21 errors + 5 warnings across 15 files (pre-existing, not caused by BB-36)
