# Pre-Phase-7 Cleanup Spec — Final Report

**Date:** 2026-05-16
**Branch:** forums-wave-continued
**Scope:** 10 bounded items from the cleanup audit. No commits made; Eric reviews and commits.

---

## 1. Items Completed

### Item 1 — Node engine relax (~1 min)
- **Change:** `frontend/package.json` `engines.node` `>=22.0.0` → `>=20.0.0`.
- **Verification:** `pnpm install` runs without `Unsupported engine` warning; tests still pass.
- **Result:** ✅ PASS.

### Item 2 — Tracker line 174 correction (~5 min)
- **Change:** `_forums_master_plan/spec-tracker.md` line 174. Replaced the stale "14 fails / 4 files" enumeration with the 2026-05-16 re-verified baseline (1 persistent warm-empty-states fail, 1 known useNotifications flake, 10,619 clean).
- **Verification:** Read the file; surrounding lines 173/175/176 still coherent in context.
- **Result:** ✅ PASS.

### Item 3 — CLAUDE.md baseline number update
- **Changes:** Two updates landed in CLAUDE.md "Build Health" section:
  1. Mid-spec: `9,830 pass / 1 known fail` (Spec-13 baseline) → `10,621 pass / 1 known fail` with warm-empty-states context.
  2. Post-Item-9: → `10,622 pass / 0 persistent fail`.
- **Verification:** Read CLAUDE.md after edits; matches `pnpm test --run` output.
- **Result:** ✅ PASS.

### Item 4 — .env.example drift (~5 min)
- **Changes:**
  - `frontend/.env.example`: added `VITE_APP_URL` entry with explanatory comment matching style.
  - `frontend/.env.example`: added `VITE_AUDIO_BASE_URL` entry with explanatory comment matching style.
  - `frontend/src/components/HeroSection.tsx:9`: wired `VITE_HERO_VIDEO_URL` via `import.meta.env.VITE_HERO_VIDEO_URL || '<hardcoded URL>'` so the existing env-file entry is now actually consumed; hardcoded URL retained as fallback so behavior is unchanged when env var is unset.
- **Verification:** `pnpm exec tsc --noEmit` ✅, `pnpm lint` ✅, `pnpm build` ✅. HeroSection still renders the same default video URL when no env var is set.
- **Result:** ✅ PASS.

### Item 5 — Delete Bible books/json/ dead code → REVERTED
- **Status:** STOP CONDITION HIT + Reverted per Eric's Option 1.
- **What happened:**
  1. Pre-flight grep returned zero callers of `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` (matched the spec's predicted result).
  2. Deleted `frontend/src/data/bible/books/json/` (66 files, 5.7 MB), removed `BookLoader` / `BOOK_LOADERS` / `loadChapter` / `loadAllBookText` from `frontend/src/data/bible/index.ts`, and updated the BibleLanding test mock.
  3. `pnpm typecheck` / `pnpm lint` / `pnpm build` all passed.
  4. `pnpm test --run` showed a regression: 3 test files failed, 83 tests lost. Root cause: `frontend/src/lib/bible/__tests__/planLoader.test.ts` directly imports 12 book JSONs from `@/data/bible/books/json/*` (bypassing the loader functions the spec told me to grep for) to validate plan references against real Bible chapter data.
  5. Surfaced to Eric. Per Eric's Option 1, reverted via `git restore frontend/src/data/bible/` + `git restore frontend/src/pages/__tests__/BibleLanding.deeplink.test.tsx`.
  6. Verified revert: planLoader.test.ts 83/83 pass; full-suite baseline restored.
- **Bundle-size discovery:** Pre-deletion `dist/` size = 27 MB. Post-deletion `dist/` size = 27 MB. The audit's hypothesis that "Vite bundles all 66 chunks regardless" was incorrect — Vite tree-shook the dead dynamic imports because the loader functions had no callers. The 5.7 MB was source-only, not bundle. The per-book "2 chunks each" pattern in `dist/assets/` is `web/*.json` (live) + `cross-references/*.json` (live), NOT a `books/json/` + `web/` duplication.
- **Result:** ❌ REVERTED. Documented as a deferred future spec in Surfaced section below.

### Item 6 — pnpm audit advisories cleanup (~60 min)
- **Baseline:** 20 advisories (10 high, 10 moderate).
- **Bumps applied (3 sequential iterations):**
  1. `vite-plugin-pwa` 1.2.0 → 1.3.0 — cleared 6 advisories.
  2. `postcss` 8.5.6 → 8.5.14, `workbox-*` 7.4.0 → 7.4.1 (all seven workbox packages) — cleared 1 advisory and fixed the peer-dep warning from iteration 1.
  3. `eslint`, `tailwindcss`, `typescript-eslint`, `vite` updated to latest-within-major — cleared 1 more.
- **Result:** ✅ PASS. **20 → 12 advisories** (6 high, 6 moderate). Cleared 8 total.
- **Lockfile diff:** 692-line diff across all three iterations combined. All bumps contained to expected subgraphs (vite-plugin-pwa subtree, workbox subtree, eslint+typescript-eslint subtrees). No unrelated dependency turbulence.
- **Verification:** `pnpm install` ✅, `pnpm exec tsc --noEmit` ✅, `pnpm lint` ✅, `pnpm build` ✅, `pnpm test --run` 10,621 pass / 1 fail (Item 9's known-fail preserved — no regression introduced by audit bumps).
- **Remaining 12:** all locked behind either vite 5 → 6 major bump (resolves vite, rollup, esbuild) or `pnpm.overrides` for transitive minor bumps (flatted, picomatch, brace-expansion, serialize-javascript). Both are out of bounded scope. See Surfaced.

### Item 7 — DashboardIntegration skip-link test harden (~15 min)
- **Change:** `frontend/src/pages/__tests__/DashboardIntegration.test.tsx`. Added `waitFor` import. Converted `has skip-to-content link` from synchronous assertion to `async/waitFor`.
- **Verification:** Test passes in isolation (5/5); full suite still passes the test under quiet load.
- **Result:** ✅ PASS.

### Item 8 — useNotifications flake disposition (~10 min)
- **Action:** Read `frontend/src/hooks/__tests__/useNotifications.test.ts:11-17` and `frontend/src/mocks/notifications-mock-data.ts:3-5`. The test reads `result.current.notifications` synchronously after `renderHook`, which is structurally OK — but the flake is NOT a sync-race.
- **Diagnosis:** `daysAgo(0)` is called THREE times at module-load time (`notifications-mock-data.ts` lines 17, 25, 34). Each call returns `new Date(Date.now() - 0).toISOString()`, which is ms-precision. If all three calls happen in the same millisecond, the three timestamps are equal → `>=` assertion passes (~67% of runs). If they straddle a ms boundary, timestamps are strictly increasing in evaluation order → array order `[notif-1, notif-2, notif-3]` is OLDEST-first instead of NEWEST-first → `>=` assertion fails (~33% of runs).
- **Decision per spec:** This is mock-data ordering, NOT a sync-assertion race. Spec instructs: "do NOT modify the test. Document in the 'Surfaced but not addressed' section + add a tracker line about the flake class with the file:line for future investigation."
- **Result:** ✅ DOCUMENTED (not modified). Tracker line 174 (updated in Item 2) already notes the flake; precise diagnosis added to Surfaced section below.

### Item 9 — warm-empty-states "Faith grows stronger together" fix (~20 min)
- **Diagnosis:** `getMultipleElementsFoundError`. Text renders in BOTH `FriendsPreview.tsx:70` AND `WeeklyRecap.tsx:12` (intentional — Decision 8 unifies empty-state copy across both dashboard widgets per the existing comment at `empty-states.test.tsx:85-88`). The failing test in `warm-empty-states.test.tsx:70` used unscoped `screen.getByText(...)`, matching both render sites.
- **Fix:** Added `within` to imports and scoped the assertion: `within(friendsCard).getByText(...)` where `friendsCard = screen.getByRole('heading', { name: 'Friends & Leaderboard' }).closest('section')`. Same pattern as the canonical `empty-states.test.tsx:89-94`. Minimum-viable: 1 import change + 6-line test body adjustment.
- **Verification:** 7/7 in isolation. Full suite **10,622 pass / 0 persistent fail** post-fix.
- **Result:** ✅ PASS.

### Item 10 — Basic GitHub Actions CI workflow (OPTIONAL, ~15 min)
- **Change:** Created `.github/workflows/ci.yml` (66 lines, parses cleanly via `js-yaml`).
  - Triggers: `pull_request` + `push` to `main`.
  - Two parallel jobs: `backend` and `frontend`.
  - Backend: Temurin Java 21, `./mvnw -B test`, Maven cache via `actions/setup-java@v4 cache: maven`.
  - Frontend: pnpm 10, Node 20 with pnpm cache, `install --frozen-lockfile`, then `lint`, `tsc --noEmit`, `test --run`, `build` in sequence.
  - Pinned working-directory `backend/` and `frontend/` via `defaults.run.working-directory` so steps stay readable.
- **Verification:** YAML parses cleanly; top-level keys `[name, on, jobs]`, jobs `[backend, frontend]`.
- **Caveat:** CC cannot actually trigger or run the workflow. Eric verifies by pushing a branch.
- **Result:** ✅ PASS (file-syntax only).

---

## 2. Metrics — Before vs After

| Metric | Before | After | Delta |
|---|---|---|---|
| Frontend test baseline (persistent fails) | 1 (warm-empty-states "Faith grows stronger together") | 0 | -1 ✅ |
| Frontend test count (passing) | 10,621 | 10,622 | +1 (Item 9 fix) |
| Frontend test count (skipped) | 10 | 10 | — |
| pnpm audit total advisories | 20 | 12 | -8 (40% reduction) |
| pnpm audit HIGH severity | 10 | 6 | -4 |
| pnpm audit MODERATE severity | 10 | 6 | -4 |
| Bundle size (dist/) | 27 MB | 27 MB | unchanged (Item 5 reverted) |
| dist/assets chunk count | 336 | 336 | unchanged (Item 5 reverted) |
| GitHub Actions workflows | 2 (Claude-only) | 3 (+ ci.yml) | +1 |

---

## 3. Surfaced but Not Addressed

### S1 — Item 5 reframed: "dead code deletion" → "architectural duplication consolidation"

The audit and pre-flight grep correctly identified zero callers of `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` — those three functions ARE dead exports. But the `books/json/` directory itself is NOT dead: `planLoader.test.ts` imports 12 book JSONs directly via static JSON imports (bypassing the loaders) to validate plan references against real Bible chapter data. The two Bible shapes (`BibleChapter[]` in `books/json/` and `WebBookJson` in `web/`) serve different consumers — production reader uses `web/`, plan validation tests use `books/json/`.

True scope of fix is NOT "delete books/json/" — it's:
- (a) Migrate `planLoader.test.ts` (and any other test fixture importing from `books/json/`) to import from `web/*.json`, adapting to the `WebBookJson` shape and the `BOOK_LOOKUP` mapping.
- (b) THEN delete `books/json/` + `BOOK_LOADERS` + `loadChapter` + `loadAllBookText`.
- (c) Verify all 83 affected tests still pass.

Estimated effort: 2–4 hours, not 30 minutes. Includes a real shape adaptation in test code, not just a file deletion. Out of scope for this cleanup spec.

**Filed as a dedicated future spec:** "Bible data layer consolidation — single source of truth in `web/`, remove `books/json/` test-fixture path."

**Cross-references for the future spec author:**
- `frontend/src/data/bible/index.ts:91-200` (`BOOK_LOADERS` / `loadChapter` / `loadAllBookText`)
- `frontend/src/data/bible/books/json/` (entire directory)
- `frontend/src/lib/bible/__tests__/planLoader.test.ts:4-18` (the 12 direct JSON imports — verify exact list during next spec recon)
- `frontend/src/data/bible/web/` (target shape: `WebBookJson`)
- `BibleLanding.deeplink.test.tsx:70` (the stale test mock that the original Item 5 also touched)

**Bundle-size impact of the deferral:** The audit hypothesis that `books/json/` ships in the production bundle was wrong — Vite tree-shakes the dead loaders, so removing the source files does NOT shrink dist. Acceptable interim state — they don't affect runtime UX (chunks are tree-shaken, never fetched).

### S2 — Remaining 12 audit advisories require major bumps or transitive overrides

After Item 6's three iterations of minor/patch bumps, 12 advisories remain. Disposition:

| Module | Count | Status | Resolution path |
|---|---|---|---|
| vite | 1 | <6.4.2 | Major bump 5→6 — out of scope |
| esbuild | 1 | <0.25.0 (transitive via vite) | Resolves with vite major bump |
| rollup | 1 | <4.59.0 (transitive via vite) | Resolves with vite major bump |
| flatted | 2 paths | <3.4.2 (transitive via eslint→file-entry-cache) | `pnpm.overrides` minor bump — gray-area scope |
| picomatch | 4 paths | <4.0.4 (transitive via tailwindcss) | `pnpm.overrides` minor bump — gray-area scope |
| brace-expansion | 1 path | <5.0.5 (transitive via typescript-eslint) | `pnpm.overrides` minor bump — gray-area scope |
| serialize-javascript | 2 paths | <7.0.5 (transitive via workbox-build) | Locked by workbox-build; transitive override possible |

**Suggested future spec:** "pnpm audit residual cleanup — transitive overrides + framework major-bump assessment." Decision needed on whether to use `pnpm.overrides` to force transitive minor bumps (low risk, clears 4–8 more) and/or schedule a dedicated vite-5→vite-6 migration (clears the last 3).

### S3 — useNotifications flake — precise diagnosis for the future cleanup spec

**File:** `frontend/src/mocks/notifications-mock-data.ts:3-5`.
**Mechanism:** Three notifications in `MOCK_NOTIFICATIONS` use `daysAgo(0)` at module-load. Each call evaluates `Date.now()` independently. `toISOString()` rounds to millisecond precision. When all three calls land in the same millisecond, the three timestamps are equal — the test's `>=` assertion passes. When they straddle a ms boundary, the array order is OLDEST-first (notif-1 < notif-2 < notif-3) instead of the test's expected NEWEST-first — assertion fails.

**Suggested fix in a future spec:** Either (a) sort `MOCK_NOTIFICATIONS` descending by timestamp at module load (`MOCK_NOTIFICATIONS.sort(...)`) so order is canonical regardless of timing, OR (b) freeze timestamps to deterministic values (e.g., `daysAgo(0)` returning a constant epoch offset rather than `Date.now() - 0`).

This is a real correctness bug in the mock data, not a test framework issue. Recommend (a) — keeps mock data live-looking but enforces the ordering invariant.

### S4 — Code smells encountered while reading but NOT touched

While reading files in Items 5/7/9, I noticed but deliberately did not address:

- `frontend/src/components/dashboard/DashboardIntegration.test.tsx:114-115` — a Recharts console warning floods test output ("The width(0) and height(0) of chart should be greater than 0..."). Cosmetic; ignored by spec convention.
- `frontend/src/data/bible/index.ts:91` — the `BookLoader` type and `BOOK_LOADERS` map are 110 lines of repetitive boilerplate that could be replaced with `Object.fromEntries(BIBLE_BOOKS.map(...))` mirroring the live `WEB_BOOK_LOADERS` pattern at lines 20-25. Out of scope here; would be addressed by the S1 future spec when those files get reworked.
- `frontend/src/components/HeroSection.tsx:7-10` — the `VIDEO_URL` and `VIDEO_MAX_OPACITY` constants are co-defined at module top; while writing the env-var wiring I considered moving them into a single `VIDEO_CONFIG` object but resisted the urge per spec discipline.

### S5 — `_cleanup-audit/` directory still in working tree

The pre-existing `_cleanup-audit/2026-05-15-full-codebase-audit.md` plus its log files (10 MB total) are untracked. The new report sits alongside them. Eric may want to git-ignore or commit the whole directory as part of the cleanup commit, or leave it untracked as an ephemeral audit artifact. Not modified.

---

## 4. Files Modified

| File | Lines changed | Item |
|---|---|---|
| `CLAUDE.md` | 1 line replaced (Build Health frontend baseline) | 3 |
| `_forums_master_plan/spec-tracker.md` | 1 line replaced (line 174 baseline anomaly) | 2 |
| `frontend/.env.example` | +12 lines (VITE_APP_URL, VITE_AUDIO_BASE_URL entries) | 4 |
| `frontend/package.json` | 13 lines changed (engine + 8 dep version bumps) | 1, 6 |
| `frontend/pnpm-lock.yaml` | +692 lines / -271 lines (transitive churn from 6 deps) | 6 |
| `frontend/src/components/HeroSection.tsx` | +1 line (env var fallback) | 4 |
| `frontend/src/components/dashboard/__tests__/warm-empty-states.test.tsx` | +9 / -2 (within scope + scoped assertion) | 9 |
| `frontend/src/pages/__tests__/DashboardIntegration.test.tsx` | +5 / -3 (async + waitFor) | 7 |
| `.github/workflows/ci.yml` | +66 (NEW file) | 10 |

**Total:** 9 files touched, 1 new file, ~800 lines insertion / ~280 lines deletion (overwhelmingly in lockfile churn).

---

## 5. Phase 7 Readiness

**Verdict:** ✅ READY, with the S1 caveat tracked as a deferred future spec.

- All HIGH cleanup-spec findings except Item 5 are resolved.
- Item 5's true scope was misdiagnosed in the cleanup audit (2–4 hours, not 30 minutes). Reverted cleanly; documented as a separate future spec. The deferred work does NOT block Phase 7 — those files don't affect Phase 7 surface area.
- Frontend test baseline is now CLEAN (10,622 pass / 0 persistent fail) — best baseline in months. Phase 7 starts from a clean canvas.
- pnpm audit reduced 40% (20 → 12). The remaining 12 are all locked behind major-version migrations or transitive overrides; none are exploitable in the current Worship Room threat model (all moderate/high in dev-only dependency graphs, none in runtime production bundles).
- Pre-Phase-7 CI workflow shipped — first push will trigger backend + frontend test enforcement automatically.

**Recommendation:** Eric reviews this diff, commits, then proceeds to Phase 7 spec authorship.
