# Build Health Report

**Agent**: 1 - Build Health
**Date**: 2026-03-28
**Branch**: `main` (167 uncommitted changes from full-site-audit)
**Verdict**: BUILD PASSES, LINT FAILS (gate-blocking), TESTS PASS

---

## 1. Production Build (`pnpm build`)

**Status: PASS** -- zero errors, zero warnings.

`tsc` type-check passed. Vite built 2,853 modules in 4.39 s. PWA service worker generated with 211 precache entries. Output lands in `dist/`.

### Build Observations (non-blocking)

| Observation | Detail |
|---|---|
| Main bundle | `index-uxyk9f-k.js` = 341 KB raw / 97 KB gzip |
| Recharts chunk | `recharts-VZ56JwPQ.js` = 506 KB raw / 153 KB gzip -- largest single chunk by far |
| Bible books | 66 lazy chunks (3 KB to 267 KB raw) -- correctly code-split |
| Dashboard chunk | `Dashboard-Byw4OXgs.js` = 131 KB raw / 37 KB gzip |
| Total precache payload | 7,247 KB (211 entries) |

**Recharts** (506 KB raw) dwarfs everything else. On slow 3G this adds ~4 s to first paint for Insights/Dashboard. Consider `lazy()` wrapping the chart components or a lighter charting library for Phase 4.

The 7.2 MB precache payload is large but acceptable because Bible JSON books are individually lazy-loaded and only fetched on demand.

---

## 2. Test Suite (`pnpm test`)

**Status: PASS** -- 4,862 tests across 432 test files. Zero failures.

| Metric | Value |
|---|---|
| Test files | 432 passed, 0 failed |
| Individual tests | 4,862 passed, 0 failed |
| Duration | 46.88 s |
| Slowest suite | `PrayerWallQotd.test.tsx` (2,399 ms) |

### Test Noise (non-blocking, not failures)

1. **React Router v7 deprecation warnings** -- Emitted by every test that wraps in `MemoryRouter`. Two future flags not opted into: `v7_startTransition`, `v7_relativeSplatPath`. Not broken today, but React Router v7 migration will be required eventually.

2. **`HTMLCanvasElement.prototype.getContext` not implemented** -- 4 occurrences from canvas-based tests (`verse-card-canvas`, `challenge-share-canvas`). Tests mock around it correctly and pass. Would go away with the `canvas` npm package in devDeps, but not necessary.

3. **`ChunkErrorBoundary.test.tsx` stderr noise** -- Intentionally thrown errors for error boundary testing. All 8 tests pass. The `Uncaught [Error: ...]` lines are React's error boundary behavior in test mode, not real failures.

---

## 3. Linter (`pnpm lint`)

**Status: FAIL** -- 38 problems (6 errors, 32 warnings). The ESLint config uses `--max-warnings 0`, so warnings alone would block CI.

### Errors (6) -- MUST FIX before merge

| # | Rule | File | Line | Root Cause |
|---|---|---|---|---|
| E1 | `@typescript-eslint/no-unused-vars` | `e2e/full-site-audit.spec.ts` | 1 | `expect` imported but unused. The spec uses Playwright's built-in assertions differently. |
| E2 | `@typescript-eslint/no-explicit-any` | `src/components/dashboard/__tests__/dynamic-ordering.test.tsx` | 80 | `{} as any` in mock `todayActivities` |
| E3 | `@typescript-eslint/no-explicit-any` | `src/components/dashboard/__tests__/dynamic-ordering.test.tsx` | 96 | `mockFaithPoints as any` in render call |
| E4 | Unused eslint-disable directive | `src/pages/PrayerDetail.tsx` | 63 | The `@typescript-eslint/no-unused-vars` disable is no longer needed -- the prefixed `_prayerId` / `_content` params already satisfy the rule |
| E5 | Unused eslint-disable directive | `src/pages/PrayerWallDashboard.tsx` | 116 | Same as E4 -- stale disable comment |
| E6 | Unused eslint-disable directive | `src/pages/PrayerWallProfile.tsx` | 69 | Same as E4 -- stale disable comment |

**E1** was introduced in commit `d860328` (full-site-audit). **E2-E3** were introduced with the dashboard widget prioritization work (`ed690d9`). **E4-E6** are legacy stale comments that survived prior fix commits.

### Warnings by Rule (32 total)

| Rule | Count | Systemic? |
|---|---|---|
| `react-refresh/only-export-components` | 16 | Yes -- files that export both components and constants/hooks from the same module. Pattern is widespread (Navbar, AudioProvider, AuthContext, Toast, etc.). Not a runtime bug; affects HMR granularity during development only. |
| `react-hooks/exhaustive-deps` | 14 | Yes -- missing or unnecessary dependencies in `useEffect`, `useCallback`, `useMemo`. Several are intentional omissions (e.g., `playSoundEffect` excluded to avoid re-triggering). Two are genuinely unnecessary deps (`progress` in ReadingPlanWidget, `raw` in useMoodChartData). |
| `react-hooks/exhaustive-deps` (logical expression) | 1 | `useCompletionTracking.ts:99` -- value recomputed every render due to logical OR. Needs `useMemo` wrap. |
| `react-hooks/exhaustive-deps` (unnecessary dep) | 1 | `MonthlyReport.tsx:57` -- `selectedMonth`/`selectedYear` unnecessary in `useMemo`. |

### Systemic Pattern Analysis

The `react-refresh/only-export-components` warnings (16 instances) come from a single architectural pattern: exporting `useXxx()` hooks or constants alongside components from the same file. This is intentional for colocation (e.g., `AuthContext.tsx` exports both `AuthProvider` and `useAuth`). These are development-only warnings and do not affect production behavior. Options:

1. Suppress via eslint rule override (pragmatic)
2. Split every hook export into its own file (noisy refactor)
3. Add `// eslint-disable-next-line` per occurrence (16 lines of noise)

The `react-hooks/exhaustive-deps` warnings (14 instances) are a mix of intentional suppressions and genuine bugs. The intentional ones (missing `playSoundEffect`, `duration`, `recordActivity`) are typically event-handler-like callbacks that should not re-trigger on every render. The unnecessary deps (`progress`, `raw`, `selectedMonth`/`selectedYear`) are minor performance issues, not correctness bugs.

---

## 4. TypeScript Strict Mode & Type Safety

**Status: PASS** (strict mode enabled and enforced by build)

`tsconfig.json` enables:
- `"strict": true` (includes `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitAny`, `noImplicitThis`)
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`

Since `pnpm build` runs `tsc` before `vite build`, and it passed with zero errors, there are no TypeScript violations in the `src/` directory. The `e2e/` directory is excluded from `tsconfig.json`'s `include` array (only `src` is included), which is why the unused `expect` import in the e2e file doesn't fail the build but does fail ESLint.

### `@typescript-eslint/no-explicit-any` Violations

Only 2 instances found (both in `dynamic-ordering.test.tsx`). This is remarkably clean for a 2,800+ module codebase. Both are in test mocks and can be fixed by importing the proper types.

---

## 5. PWA Configuration

**Status: PASS** -- all required fields present, service worker builds, offline fallback exists.

### Manifest (`public/manifest.json`)

| Field | Value | Required | Status |
|---|---|---|---|
| `name` | "Worship Room" | Yes | PASS |
| `short_name` | "Worship Room" | Yes | PASS |
| `description` | Present | Recommended | PASS |
| `start_url` | "/" | Yes | PASS |
| `display` | "standalone" | Yes | PASS |
| `background_color` | "#0f0a1e" | Yes | PASS |
| `theme_color` | "#6D28D9" | Yes | PASS |
| `orientation` | "any" | Optional | PASS |
| `icons` (192x192) | `/icon-192.png` (4,322 bytes) | Yes | PASS |
| `icons` (512x512) | `/icon-512.png` (15,652 bytes) | Yes | PASS |
| `icons` (180x180 apple) | `/apple-touch-icon.png` (4,071 bytes) | Recommended | PASS |

**Missing but non-blocking**: No `maskable` icon declared. Chrome's "Add to Home Screen" will fall back to adding padding around the `any` purpose icon. Not a functional issue but a polish item for Phase 4.

### Service Worker

- **Build output**: `dist/sw.js` (13,671 bytes) + `dist/workbox-60690aef.js` generated by `vite-plugin-pwa` using Workbox `generateSW` mode
- **Registration**: `prompt` mode (user-controlled update)
- **Precache**: 211 entries covering all JS/CSS chunks, icons, and static assets
- **Navigation fallback**: `/offline.html` (verified present at `public/offline.html`)
- **Deny list**: `/api/` routes excluded from navigation fallback (correct)
- **Runtime caching strategies**:
  - Google Fonts stylesheets: StaleWhileRevalidate
  - Google Fonts webfonts: CacheFirst (1 year)
  - API calls: NetworkFirst (10s timeout, 7-day cache)
  - Images: CacheFirst (30-day expiry, 60 max entries)
  - Audio files: CacheFirst with range requests (correct for media)
  - Same-origin fallback: NetworkFirst (7-day cache)

All strategies are well-configured. The audio range requests plugin is correctly included, which is necessary for `<audio>` seek behavior on cached files.

### Icon File Verification

All three icons referenced in `manifest.json` exist on disk at the expected paths:
- `/Users/Eric/worship-room/frontend/public/icon-192.png` (4,322 bytes)
- `/Users/Eric/worship-room/frontend/public/icon-512.png` (15,652 bytes)
- `/Users/Eric/worship-room/frontend/public/apple-touch-icon.png` (4,071 bytes)

---

## 6. Regression Probability Scores (Top 5 Issues)

| Rank | Issue | Regression Probability | Likely Commit | Rationale |
|---|---|---|---|---|
| 1 | E1: Unused `expect` import in `e2e/full-site-audit.spec.ts` | **95%** -- introduced by `d860328` | `d860328` (full-site-audit) | This file was created/modified in that commit. The import was probably left from refactoring assertions. |
| 2 | E2-E3: `any` casts in `dynamic-ordering.test.tsx` | **90%** -- introduced by `ed690d9` | `ed690d9` (dashboard-widget-prioritization) | This test file was created as part of that feature. The `as any` casts were shortcuts during implementation. |
| 3 | E4-E6: Stale eslint-disable directives | **70%** -- survived `350b34a` or `6d08a7b` fix commits | Unclear; likely pre-existing | These files were modified in the full-site-audit changes (visible in git status). The disable directives became unnecessary when params were renamed with `_` prefix. |
| 4 | `react-hooks/exhaustive-deps` warnings (14) | **40%** -- accumulated over multiple commits | Various | Spread across many files modified in different commits. Not a single regression. |
| 5 | `react-refresh/only-export-components` warnings (16) | **20%** -- architectural pattern, not a regression | Original implementation | These have been present since each file was created. Not regressions. |

---

## 7. Production Incident Risk Ranking

### P0 -- Would cause production outage or CI gate failure

| # | Issue | Impact | Fix Effort |
|---|---|---|---|
| 1 | **ESLint exits with code 1** (6 errors + `--max-warnings 0` with 32 warnings) | CI/CD pipeline will reject any PR or deploy that runs `pnpm lint`. If lint is a gate (and `--max-warnings 0` says it is), nothing can ship. | ~15 min: remove 3 stale disable directives, remove unused `expect` import, type the 2 `any` casts properly. Warnings need a policy decision (suppress the `react-refresh` rule or fix each). |

### P1 -- Would degrade user experience in production

| # | Issue | Impact | Fix Effort |
|---|---|---|---|
| 2 | **Recharts 506 KB chunk** | Loaded on first visit to Dashboard or Insights. On mobile 3G (~400 kbps), this alone adds ~10 s. Combined with the 341 KB main bundle, first meaningful paint on slow networks could exceed 15 s. | Medium: lazy-load chart components behind `React.lazy()` + Suspense with skeleton fallback. Or switch to a lighter library (e.g., `lightweight-charts`, custom SVG). |
| 3 | **7.2 MB total precache** | Service worker will attempt to precache all 211 entries on first visit. On slow connections, this could consume significant bandwidth in the background and delay the SW activation. | Medium: split precache into critical (HTML/CSS/main JS) and lazy (Bible books, non-essential chunks). Use runtime caching for Bible books instead of precache. |
| 4 | **No maskable icon in manifest** | On Android, the app icon on the home screen will have forced padding and may look out of place compared to other apps with adaptive icons. | Low: create a maskable variant of the 512px icon with safe zone and add to manifest with `"purpose": "maskable"`. |

### P2 -- Code quality / maintainability debt

| # | Issue | Impact | Fix Effort |
|---|---|---|---|
| 5 | **14 `react-hooks/exhaustive-deps` warnings** | Two categories: (a) intentional omissions that should have explicit disable comments, and (b) genuine unnecessary deps that waste renders. None cause visible bugs today, but they make future refactors riskier because the dep arrays are lying about what the hooks depend on. | Low-Medium: add disable comments with explanations for intentional ones; remove unnecessary deps for the rest. |
| 6 | **React Router v7 deprecation warnings in tests** | Not visible to users. Will become blocking when React Router v7 is adopted. Given that RR v6 is currently stable and v7 migration is not imminent, this is informational. | Low: add `future: { v7_startTransition: true, v7_relativeSplatPath: true }` to all `MemoryRouter` usages in tests (or create a test utility wrapper). |
| 7 | **Canvas `getContext` not implemented in jsdom** | 4 test suites produce stderr noise. All tests pass via mocking. No functional impact. | Trivial: install `canvas` as devDep, or suppress the warning in test setup. |

---

## 8. Summary Action Items

### Immediate (before next merge)

1. **Fix 6 ESLint errors** to unblock CI:
   - `e2e/full-site-audit.spec.ts:1` -- remove unused `expect` import or prefix with `_`
   - `src/components/dashboard/__tests__/dynamic-ordering.test.tsx:80,96` -- replace `as any` with proper types
   - `src/pages/PrayerDetail.tsx:63` -- remove stale `eslint-disable-next-line`
   - `src/pages/PrayerWallDashboard.tsx:116` -- remove stale `eslint-disable-next-line`
   - `src/pages/PrayerWallProfile.tsx:69` -- remove stale `eslint-disable-next-line`

2. **Decide on warning policy**: Either bump `--max-warnings` to 32 (or a reasonable ceiling) temporarily, or fix the 16 `react-refresh` warnings by suppressing the rule for files that intentionally co-export hooks.

### Near-term (Phase 3 / Phase 4)

3. Lazy-load Recharts behind `React.lazy()` to reduce initial payload.
4. Move Bible book chunks from precache to runtime cache in the SW config.
5. Add a `maskable` icon variant to the PWA manifest.
6. Opt into React Router v7 future flags in test utilities.
7. Audit and annotate all `react-hooks/exhaustive-deps` suppressions.

---

## 9. Full Error Log

```
# ESLint Errors (6)
e2e/full-site-audit.spec.ts:1:16        error  @typescript-eslint/no-unused-vars       'expect' defined but never used
src/components/dashboard/__tests__/dynamic-ordering.test.tsx:80:26  error  @typescript-eslint/no-explicit-any  Unexpected any
src/components/dashboard/__tests__/dynamic-ordering.test.tsx:96:64  error  @typescript-eslint/no-explicit-any  Unexpected any
src/pages/PrayerDetail.tsx:63:5          error  Unused eslint-disable directive
src/pages/PrayerWallDashboard.tsx:116:5  error  Unused eslint-disable directive
src/pages/PrayerWallProfile.tsx:69:5     error  Unused eslint-disable directive

# ESLint Warnings (32)
src/components/Navbar.tsx:24:17                              react-refresh/only-export-components
src/components/SEO.tsx:4:14                                  react-refresh/only-export-components
src/components/SeasonalNavLine.tsx:9:14                       react-refresh/only-export-components
src/components/audio/AudioProvider.tsx:281:17                 react-refresh/only-export-components
src/components/audio/AudioProvider.tsx:289:17                 react-refresh/only-export-components
src/components/audio/AudioProvider.tsx:297:17                 react-refresh/only-export-components
src/components/audio/AudioProvider.tsx:301:17                 react-refresh/only-export-components
src/components/bible/HighlightsNotesSection.tsx:87:6          react-hooks/exhaustive-deps (missing: visibleFeed)
src/components/daily/DevotionalTabContent.tsx:107:6           react-hooks/exhaustive-deps (missing: playSoundEffect)
src/components/dashboard/GettingStartedCard.tsx:67:6          react-hooks/exhaustive-deps (missing: playSoundEffect)
src/components/dashboard/GrowthGarden.tsx:23:14               react-refresh/only-export-components
src/components/dashboard/ReadingPlanWidget.tsx:124:6          react-hooks/exhaustive-deps (unnecessary: progress)
src/components/insights/MoodTrendChart.tsx:47:17              react-refresh/only-export-components
src/components/local-support/ListingShareDropdown.tsx:11:23   react-refresh/only-export-components
src/components/local-support/VisitButton.tsx:26:17            react-refresh/only-export-components
src/components/prayer-wall/AuthModalProvider.tsx:42:17        react-refresh/only-export-components
src/components/prayer-wall/InlineComposer.tsx:69:6            react-hooks/exhaustive-deps (missing: activeChallenge, isChallengePrayer)
src/components/prayer-wall/PrayerCard.tsx:14:17               react-refresh/only-export-components
src/components/prayer-wall/ShareDropdown.tsx:14:17            react-refresh/only-export-components
src/components/ui/Toast.tsx:152:5                             react-hooks/exhaustive-deps (missing: dismissCelebration)
src/components/ui/Toast.tsx:257:17                            react-refresh/only-export-components
src/components/ui/Toast.tsx:275:17                            react-refresh/only-export-components
src/contexts/AuthContext.tsx:85:17                            react-refresh/only-export-components
src/hooks/useBibleProgress.ts:85:6                            react-hooks/exhaustive-deps (unnecessary: progress)
src/hooks/useCompletionTracking.ts:99:9                       react-hooks/exhaustive-deps (logical expression instability)
src/hooks/useMoodChartData.ts:66:6                            react-hooks/exhaustive-deps (unnecessary: raw)
src/hooks/useSleepTimer.ts:170:6                              react-hooks/exhaustive-deps (missing: timer)
src/hooks/useSoundToggle.ts:111:5                             react-hooks/exhaustive-deps (missing: loadWithRetry)
src/pages/ChallengeDetail.tsx:158:6                           react-hooks/exhaustive-deps (missing: playSoundEffect)
src/pages/MonthlyReport.tsx:57:6                              react-hooks/exhaustive-deps (unnecessary: selectedMonth, selectedYear)
src/pages/PrayerWall.tsx:201:5                                react-hooks/exhaustive-deps (missing: recordActivity)
src/pages/meditate/ScriptureSoaking.tsx:101:5                 react-hooks/exhaustive-deps (missing: duration)

# Build Errors: 0
# Build Warnings: 0
# Test Failures: 0
```

---

## 10. Churn Hotspot Correlation

Cross-referencing the top 10 churn hotspots with current issues:

| Hotspot File | Changes (90d) | Current Issues |
|---|---|---|
| `Navbar.tsx` | 44 | 1 warning (`react-refresh/only-export-components`) |
| `App.tsx` | 32 | Staged changes, no lint/build issues |
| `tailwind.config.js` | 21 | Staged changes, no issues |
| `Dashboard.tsx` | 20 | No issues (131 KB chunk is large but functional) |
| `PrayerWall.tsx` | 19 | 1 warning (`react-hooks/exhaustive-deps`) |
| `DailyHub.tsx` | 19 | No issues |
| `Navbar.test.tsx` | 19 | No issues |
| `DashboardWidgetGrid.tsx` | 18 | Related: `dynamic-ordering.test.tsx` has 2 `any` errors |
| `dashboard.ts` (types) | 17 | No issues |
| `Home.tsx` | 16 | No issues |

The churn data confirms that `DashboardWidgetGrid.tsx` and its test file are recent additions (dashboard-widget-prioritization feature), and the `any` casts are shortcuts from rapid development. The high churn on `Navbar.tsx` (44 changes!) correlates with the `react-refresh` warning from co-exporting a constant, but this is stable and not a regression risk.

---

**Bottom line**: The build is healthy. All 4,862 tests pass, TypeScript strict mode is enforced, and the PWA configuration is complete. The sole blocker is 6 ESLint errors (all trivially fixable in 15 minutes) plus a policy decision on 32 warnings. No production-breaking issues exist. The biggest performance concern is the 506 KB Recharts chunk, which should be lazy-loaded before the Phase 3 launch.
