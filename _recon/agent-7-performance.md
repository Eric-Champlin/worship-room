# Agent 7 - Performance Audit

## 1. Build & Bundle Analysis

### Production Build Summary

Total dist output: **8.0 MB** (uncompressed). Build time: 4.12s. 2,853 modules transformed. PWA precaches 211 entries (7,247 KB).

### Main JS Bundle

The entry bundle `index-uxyk9f-k.js` is **341 KB uncompressed / 97 KB gzipped**. This is well under the 500 KB gzip / 1.5 MB uncompressed thresholds. No flag needed.

### CSS Bundle

Single CSS file: **115 KB / 24 KB gzipped**. Healthy for a Tailwind app of this size.

### Largest Code Chunks (non-Bible-data)

| Chunk | Uncompressed | Gzipped | Concern |
|-------|-------------|---------|---------|
| recharts | 506 KB | 153 KB | Isolated via manualChunks. Only loaded on pages with charts. Acceptable. |
| LocalSupportPage | 212 KB | 66 KB | **FLAG**: Bundles Leaflet + react-leaflet map library. Should be lazy-loaded within the component. |
| useReadingPlanProgress | 156 KB | 53 KB | **FLAG**: All 10 reading plan data files (3,400 lines of devotional text) are bundled into this chunk. Plans should be lazy-loaded individually. |
| Dashboard | 131 KB | 37 KB | Large but justified given widget count. |
| DailyHub | 96 KB | 27 KB | Contains dynamic imports for sub-chunks. Acceptable. |
| verse-of-the-day | 94 KB | 31 KB | 60 verse entries with full text. Could be a JSON file loaded at runtime. |
| challenges (data) | 83 KB | 30 KB | 5 full challenge definitions with daily content. Same suggestion: lazy-load JSON. |
| AskPage | 57 KB | 19 KB | Mock conversation data inflates this. Will shrink in Phase 3 when mock data is removed. |

### Bible Book Chunks

66 individual Bible book chunks range from 0.14 KB (3 John) to 267 KB (Psalms). These are properly code-split and lazy-loaded. Total Bible data: ~4.5 MB uncompressed across all books, only loaded on demand.

### Vite Config Assessment

- **Code splitting**: All 34 route components use `React.lazy()` with dynamic imports. Well done.
- **Manual chunks**: `recharts` and `react-helmet-async` are manually chunked. Good.
- **Build target**: Uses Vite defaults (modern browsers with ES modules). Acceptable.
- **Source maps**: Not explicitly disabled for production. Vite defaults to no source maps for `build` mode, so this is fine.
- **`chunkSizeWarningLimit`**: Set to 550 KB, which suppresses the warning for the recharts chunk. Appropriate.

**Missing optimization**: No `manualChunks` entry for Leaflet/react-leaflet. These 212 KB get bundled into LocalSupportPage instead of being a shared chunk loadable across all three local support routes.

## 2. Dependencies

### Production Dependencies Assessment

| Dependency | Bundle Contribution | Verdict |
|-----------|-------------------|---------|
| react, react-dom | ~130 KB | Required. No alternative. |
| recharts (v3.8.0) | 506 KB chunk | **Heavy**. Pulls in D3 modules. Only used on Insights, Dashboard, MonthlyReport. Already isolated via manual chunking. Lighter alternative: `lightweight-charts` or `uPlot` (10-15 KB), but would require rewriting chart components. Keep for now; reassess in Phase 4. |
| leaflet + react-leaflet | ~212 KB (in LocalSupportPage chunk) | Used only for map display on 3 local support pages. Already lazy-loaded at route level. Could further defer by lazy-loading the map component within the page (only render map after user interaction). |
| react-helmet-async | 24 KB chunk | SEO meta tags. Already chunked separately. Fine. |
| react-router-dom | In main bundle | Required for SPA routing. |
| @tanstack/react-query | In main bundle | Required for data fetching patterns. Not yet actively used (Phase 3). Could be removed until Phase 3 to save ~12 KB gzipped from the entry bundle. |
| react-hook-form + @hookform/resolvers + zod | In main bundle | Only used by AuthModal (a stub form). Adds ~15 KB gzipped to entry. Could defer until Phase 3 when real forms exist. |
| lucide-react | Tree-shaken per icon | Each icon ~0.3-0.6 KB. Properly tree-shaken. Fine. |
| clsx + tailwind-merge | ~2 KB combined | Minimal. Fine. |

**Recommendation**: Remove `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, and `zod` from the production build until Phase 3. They are loaded in the entry bundle but barely used. Estimated savings: ~25-30 KB gzipped from the critical path.

## 3. Code Quality

### Components Over 400 Lines

| File | Lines | Assessment |
|------|-------|-----------|
| `data/devotionals.ts` | 1,823 | Data file. 50 devotionals. No refactor needed; could become a JSON file for better lazy-loading. |
| `data/challenges.ts` | 1,124 | Data file. 5 challenge definitions. Same as above. |
| `dashboard/GrowthGarden.tsx` | 765 | SVG rendering component with 6 growth stages. Complex but inherently visual. Could split each stage into a sub-component, but the complexity is in the SVG paths, not logic. Low priority. |
| `dashboard/WelcomeWizard.tsx` | 557 | 4-screen wizard. Each screen could be a separate component. **Moderate refactor candidate** -- extract GreetingScreen, AvatarScreen, QuizScreen, ResultsScreen. |
| `pages/PrayerWall.tsx` | 553 | Page component with filtering, QOTD, inline composer, comments. Would benefit from extracting filter logic into a custom hook and separating the prayer feed into its own component. **Moderate refactor candidate**. |
| `daily/PrayerResponse.tsx` | 541 | Prayer display with KaraokeText, actions, ambient integration. Complex but cohesive. Could extract the action buttons bar. Low-medium priority. |
| `pages/ChallengeDetail.tsx` | 528 | Challenge detail page. Import-heavy. Could extract day content renderer and progress sidebar. |
| `lib/verse-card-canvas.ts` | 521 | Canvas API drawing code for shareable verse images. Procedural by nature. Fine as-is. |
| `hooks/useRoutinePlayer.ts` | 505 | Complex state machine for bedtime routines. Already well-isolated as a hook. Fine. |
| `pages/PrayerWallDashboard.tsx` | 498 | Dashboard variant of prayer wall. Similar to PrayerWall.tsx -- shared extraction would help. |
| `pages/Dashboard.tsx` | 498 | Main dashboard page. Already delegates to sub-components. Acceptable. |
| `dashboard/EveningReflection.tsx` | 487 | 4-step reflection flow. Could extract each step. **Moderate refactor candidate**. |
| `sharing/SharePanel.tsx` | 479 | Share UI with multiple share targets. Acceptable complexity. |
| `local-support/LocalSupportPage.tsx` | 454 | Shared page for 3 local support types. Could extract search logic into a hook. |
| `StartingPointQuiz.tsx` | 468 | Quiz with 5 questions and result. Could extract QuizQuestion component. |
| `shared/AvatarPickerModal.tsx` | 447 | Avatar selection modal with categories. Could extract category grid. |

### TODO/FIXME/HACK/XXX Comments

All 5 found comments are intentional Phase 3 markers:

1. `PrayerWallDashboard.tsx:53` -- `TODO(phase-3): fetch real user profile from backend`
2. `PrayerWall.tsx:310` -- `TODO(phase-3): POST to /api/prayer-replies`
3. `InlineComposer.tsx:47` -- `TODO(phase-3): replace keyword check with backend crisis detection API`
4. `CommentInput.tsx:44` -- `TODO(phase-3): replace keyword check with backend crisis detection API`
5. `ListenTracker.tsx:11` -- `TODO: Replace readAuthFromStorage() with useAuth()`

**Verdict**: Clean. No forgotten debt. All TODOs are clearly tagged for Phase 3.

## 4. Storage Growth Analysis

### localStorage Key Inventory

662 total references to `localStorage`/`sessionStorage` across 100 source files.

### Bounded Storage (caps enforced)

| Key | Cap | Est. Size at Cap |
|-----|-----|-----------------|
| `wr_mood_entries` | 365 entries | ~50 KB |
| `wr_meditation_history` | 365 entries | ~35 KB |
| `wr_gratitude_entries` | 365 entries | ~40 KB |
| `wr_local_visits` | 500 entries | ~60 KB |
| `wr_prayer_list` | 200 entries | ~80 KB |
| `wr_listening_history` | 100 entries | ~15 KB |
| `wr_notifications` | 50 entries (in `notifications-storage.ts`) | ~10 KB |
| `wr_milestone_feed` | 50 entries (MILESTONE_FEED_CAP) | ~8 KB |
| `wr_bible_highlights` | 500 entries | ~40 KB |
| `wr_bible_notes` | 200 entries | ~60 KB |

### UNBOUNDED STORAGE (no cap enforced)

| Key | Risk | Issue |
|-----|------|-------|
| `wr_social_interactions` | **HIGH** | `addNotification()` in `social-storage.ts` line 118 pushes to `existing` array with no cap. Over 6 months of daily use with friend interactions, this array grows without bound. |
| `wr_reading_plan_progress` | **MEDIUM** | Object keyed by `planId`. Currently 10 built-in plans + user-created. Each plan stores per-day completion data. With AI-generated custom plans, this could grow unbounded. |
| `wr_challenge_progress` | **LOW** | Keyed by challengeId. Only 5 seasonal challenges exist. Bounded by content, not code. |
| `wr_bible_progress` | **LOW** | Object of `{book: number[]}`. Max 66 books x ~150 chapters = fixed upper bound (~10 KB). |
| `wr_badges` | **LOW** | Fixed badge set (~45 badges). Bounded by content. |
| `wr_friends` | **MEDIUM** | No explicit friend count limit. Friend list, pending requests, and blocked users all grow without caps. |
| `wr_daily_activities` | **HIGH** | Keyed by date string. One entry per day of use. After 1 year: 365 keys. After 3 years: 1,095 keys. Never pruned. |
| `wr_devotional_reads` | **MEDIUM** | Array of date strings, doc says max 365 but need to verify enforcement. |

### Estimated 6-Month Storage Total

At max caps with daily use: **~400-500 KB** in localStorage. The 5 MB browser limit should not be hit, but `wr_social_interactions` and `wr_daily_activities` are the most likely to cause issues over long-term use (1+ years).

**Critical fix needed**: `addNotification()` in `social-storage.ts` (line 106-129) pushes notifications without any cap. The separate `notifications-storage.ts` has a 50-entry cap in `setNotifications()`, but `social-storage.ts` bypasses it by writing directly to the same key. This is a bug -- two modules write to `wr_notifications` with different capping logic.

## 5. Render Performance

### Context Provider Analysis

The app wraps routes in 6 nested providers:

```
QueryClientProvider > HelmetProvider > ErrorBoundary > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider
```

**AuthProvider**: Well-optimized. Uses `useMemo` to stabilize the context value. `login`/`logout` wrapped in `useCallback`. Cross-tab sync via `storage` event. No unnecessary re-renders.

**AudioProvider**: Creates 4 separate contexts (state, dispatch, engine, sleep timer). This is a good pattern -- consumers only subscribe to the context they need, avoiding re-renders from unrelated state changes.

**ToastProvider**: Standard pattern. Low re-render risk since toast state changes are infrequent.

### Missing Memoization Patterns

The `useMemo`/`useCallback` usage count of 476 across 100 files is healthy for a codebase of this size. The major providers are properly memoized.

**Potential issues spotted**:
- `PrayerWall.tsx` creates multiple inline callbacks in the render body without `useCallback`. With 18+ prayer cards, each re-render recreates all handlers. The `usePrayerReactions` hook (47 KB chunk) suggests complex reaction state.
- Large page components (Dashboard, DailyHub, PrayerWall) import 15-25 modules each. While React.lazy handles route splitting, within-page component trees are not lazy-loaded. The Dashboard imports GrowthGarden (765 lines of SVG) eagerly even when it's below the fold.

### React.lazy Coverage

All 34 route-level components use `React.lazy` with `Suspense`. This is comprehensive. The `ChunkErrorBoundary` handles dynamic import failures gracefully.

**Missing opportunity**: Heavy below-the-fold components within pages (GrowthGarden on Dashboard, StartingPointQuiz on DailyHub, Leaflet map on LocalSupportPage) could benefit from intersection-observer-triggered lazy loading.

## 6. Assets

### Image Optimization

**No images in `src/`**. All images are in `public/`:

| File | Size | Format |
|------|------|--------|
| `og-default.png` | 99 KB | PNG |
| `icon-512.png` | 15 KB | PNG |
| `icon-192.png` | 4.2 KB | PNG |
| `apple-touch-icon.png` | 4.0 KB | PNG |
| 8 SVG artwork files | <1 KB each | SVG |

**Assessment**: Image footprint is minimal. The OG image at 99 KB could be converted to WebP for ~30% savings but it's only loaded by social media crawlers, not users. App icons must remain PNG per PWA spec. No action needed.

**No `<img>` tags with missing `width`/`height`**: The codebase uses Spotify iframes and SVGs for visual content, not raster images. All iframes that embed external content use `loading="lazy"` (verified in 8 locations).

## 7. Security

### Secrets in Source

**No API keys, tokens, or secrets found in frontend source code.**

Environment variables used:
- `VITE_API_BASE_URL` -- backend URL, defaults to localhost. Safe.
- `VITE_AUDIO_BASE_URL` -- CDN path for audio files. Safe.
- `VITE_SITE_URL` -- canonical site URL. Safe.
- `VITE_HERO_VIDEO_URL` -- CloudFront video URL. Safe (public CDN URL).
- `VITE_APP_URL` -- used for invite link generation. Safe.

The `.env` file contains a CloudFront video URL (not a secret) and is properly gitignored (verified: not tracked by git, `.gitignore` at repo root includes `.env`).

**No hardcoded fetch calls to authenticated endpoints** -- all API interaction is through the stub `api/client.ts` which reads `VITE_API_BASE_URL`.

### Other Security Notes

- `AuthModal.tsx` handles password fields correctly with `autoComplete` attributes and proper `aria-invalid` states.
- Crisis detection uses client-side keyword matching (Phase 2). The TODO to move this to backend in Phase 3 is properly tracked.
- No `dangerouslySetInnerHTML` usage found in the codebase.

## 8. SEO

### Title & Meta Coverage

The `<SEO>` component provides `<title>`, `<meta description>`, Open Graph (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`), Twitter Cards (`summary_large_image`), canonical URLs, optional `noIndex`, and JSON-LD structured data. This is comprehensive.

**Every route has an `<SEO>` component**: Verified across all 34+ route components. Pages that should not be indexed (Settings, Insights, meditation sub-pages, health check) properly use `noIndex`.

### Canonical URL Handling

The `buildCanonicalUrl()` function in `SEO.tsx` strips UI-state query params (`tab`) from canonical URLs. This prevents duplicate content issues from tab-based routes like `/daily?tab=pray` vs `/daily?tab=journal`.

### JSON-LD Structured Data

Found on: Churches, Counselors, CelebrateRecovery (BreadcrumbList), PrayerWall (BreadcrumbList), BibleBrowser (BreadcrumbList), DailyHub (BreadcrumbList), MusicPage (BreadcrumbList). GrowPage uses structured data as well.

**Missing JSON-LD**: The landing page (`Home.tsx`) has `<SEO>` with title/description but could benefit from `WebSite` or `Organization` schema. Bible chapter pages (`BibleReader.tsx`) could use `Article` or `WebPage` schema.

### Open Graph Image

Defaults to `/og-default.png` (99 KB). Individual pages like SharedVerse and SharedPrayer override with custom paths. The OG image is properly served as an absolute URL.

## Summary of Actionable Findings

### Critical (fix before production)

1. **Unbounded `wr_social_interactions` and `wr_daily_activities`** storage growth with no pruning. `addNotification()` in `social-storage.ts` bypasses the 50-entry cap in `notifications-storage.ts`.

### High Priority (significant performance impact)

2. **Reading plan data (156 KB chunk)**: All 10 reading plans bundled together. Lazy-load each plan individually to cut 80%+ from this chunk.
3. **Leaflet not isolated**: 212 KB LocalSupportPage chunk bundles the map library. Add Leaflet to `manualChunks` or lazy-load `ResultsMap` with `React.lazy`.
4. **Unused production dependencies**: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, and `zod` add ~25-30 KB gzipped to the entry bundle but are barely used. Defer to Phase 3.

### Medium Priority (quality improvements)

5. **Large components**: WelcomeWizard (557 lines), PrayerWall (553 lines), EveningReflection (487 lines) should be split into sub-components for maintainability and potential lazy-loading.
6. **Static data as code**: `devotionals.ts` (1,823 lines), `challenges.ts` (1,124 lines), `verse-of-the-day` (94 KB chunk) are large data files compiled as JS. Moving to JSON and loading on demand would reduce initial parse time and enable better caching.
7. **Below-fold lazy loading**: GrowthGarden (765 lines of SVG) is eagerly imported by Dashboard. Use intersection observer + React.lazy to defer.

### Low Priority (polish)

8. **Missing JSON-LD on Home and BibleReader pages**: Add `WebSite`/`Organization` schema to landing page and `Article` schema to Bible chapters for richer search results.
9. **Recharts at 506 KB**: Already isolated. Consider lighter alternatives in Phase 4 if charting needs remain simple.
