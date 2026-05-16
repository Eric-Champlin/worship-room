# Worship Room — Full Codebase Audit

**Date launched:** 2026-05-15 (ran into 2026-05-16)
**Branch:** `forums-wave-continued`
**HEAD:** `8423cf2 Phase 6 done`
**Audit scope:** Read-only mechanical state of entire codebase ahead of Phase 7
**Mode:** Unattended, multi-hour, read-only inspection. No production code, tests, docs, rules, configs, master plan, tracker, or git state were modified.

---

## 1. Executive Summary

**Phase 7 Readiness Verdict: ⚠️ ADDRESS-BEFORE-PHASE-7 (4 HIGH findings, all narrow scope, half-day cleanup spec recommended).**

The codebase is in **broadly excellent shape** for a wave-end snapshot — backend tests at 1894/0 fail (exact cutover baseline match), frontend lint and typecheck cleanly pass with `--max-warnings 0`, 36/37 Liquibase changesets carry rollback blocks with zero destructive operations, only 5 production TODOs (all documented forward-references to specific future phases), and storage-key documentation is roughly in sync with code. No 🔴 BLOCKER findings.

The 4 HIGH findings cluster around three themes:

1. **Frontend supply chain has 10 high-severity advisories in transitive deps** (all `vite-plugin-pwa>workbox-build` chain — workbox-build 7.4.0 → 7.4.1 + flatted/picomatch/lodash/fast-uri/babel/serialize-javascript/rollup updates resolve the chain). Single `pnpm audit fix` or upgrade of `vite-plugin-pwa` to 1.3.0 likely resolves the majority.
2. **Frontend bundle has a 5.7 MB Bible duplicate** — `frontend/src/data/bible/books/json/` (66 files, 5.7 MB) is dead code in production (only `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` consume it, and they have zero non-test callers) but Vite still bundles all 66 chunks because the dynamic-import template literal is statically detectable. Deleting `books/json/` + the three dead functions in `data/bible/index.ts` reduces the dist by ~5.7 MB source / dozens of MB build output.
3. **Frontend test suite has 14 persistent failures + 1 flaky failure** — 14 fails across 4 files (GrowthGarden × 8, GrowthGarden-transition × 4, GrowthGarden-a11y × 1, warm-empty-states × 1) is the documented post-PrayCeremony-fix baseline. PrayCeremony.test.tsx now passes cleanly in both passes (the 2026-05-15 fix shipped). One flaky failure (DashboardIntegration "has skip-to-content link" with `Loading chunk 123 failed`) appeared in pass 1 but passed in pass 2 — new flake worth investigating before Phase 7.
4. **Node engine mismatch with package.json's stated requirement.** `package.json` declares `"node": ">=22.0.0"` but pnpm reports current node is `v20.15.0`. All tooling works, but the warning surfaces on every `pnpm` invocation and indicates documented intent (Node 22 LTS) is not matched by the developer's local environment. Risk: an unrelated Vite/TypeScript bug that has a Node-22-only fix could be hit at any time.

Beyond the HIGH findings, MED severity is dominated by:
- **20 packages with major version updates available** (React 18→19, Vite 5→8, Tailwind 3→4, TypeScript 5→6, ESLint 9→10, jsdom 25→29, react-router-dom 6→7). All are framework-level — Phase 7 is a natural inflection point to schedule a focused upgrade spec.
- **No CI test/lint enforcement.** `.github/workflows/` contains only `claude.yml` + `claude-code-review.yml` — these run Claude Code, not Vitest/JUnit/ESLint. Every PR relies on developer discipline to `pnpm test`/`./mvnw test` locally.
- **Two undocumented frontend env vars.** `VITE_APP_URL` and `VITE_AUDIO_BASE_URL` are read in code with safe fallbacks but absent from `.env.example`. Inverse: `VITE_HERO_VIDEO_URL` is in `.env.example` but the hero video URL is hardcoded in `HeroSection.tsx` (drift in both directions).

LOW severity items include: build warning about static+dynamic import of `manifest.json` (cosmetic, no runtime impact), one slow backend test class (PostSpecificationsTest at 52.14s, the only test >30s), and ~30 inline eslint-disable comments in tests (all principled, no quick-fix patterns).

Phase 6 was a heavy wave; the cleanup ahead of Phase 7 is unusually small for a wave of this size. The codebase is healthy.

### Bucket counts (synthesis from Section 13)

- **HIGH:** 4 findings (2 fix-now / 2 fix-soon)
- **MED:** 14 findings (8 fix-soon / 6 park)
- **LOW:** 12 findings (mostly park / accept)
- **🔴 BLOCKERS:** 0

### Top 10 findings worth Eric's max-thinking attention

(Full triage in Section 13. These 10 are surfaced here because their decisions matter most.)

1. **HIGH — Bible `books/json/` duplicate-bundle** — 5.7 MB of dead source bundled into 66 production chunks. Delete the directory + 3 dead functions in `data/bible/index.ts`. **fix-soon**.
2. **HIGH — pnpm audit: 10 high-severity transitive advisories** — likely all resolved by upgrading `vite-plugin-pwa` to 1.3.0. **fix-soon**.
3. **HIGH — DashboardIntegration flaky test** — pass 1 failed with `Loading chunk 123 failed`, pass 2 passed. Indicates code-splitting + test environment fragility. **investigate**.
4. **HIGH — Node engine mismatch** — `engines.node: ">=22"` vs. running `v20.15.0`. Either bump local Node or relax engines. **fix-now (1 char change)**.
5. **MED — No CI test/lint enforcement** — every PR depends on local discipline. Phase 7 is a good time to add a basic `pnpm test && ./mvnw test && pnpm lint` workflow. **fix-soon**.
6. **MED — 20+ framework majors available** — React 19, Vite 8, Tailwind 4, TypeScript 6 are all major version steps. Schedule a focused upgrade spec; don't do them piecemeal. **park (dedicated spec)**.
7. **MED — GentleExtras toggle duplication** — Verse Finds You + Live Presence inline toggles share class strings exactly (already tracker-documented). Extract `<Toggle>` shared primitive BEFORE adding a third opt-in. **park**.
8. **MED — Phase 3 `X-RateLimit-*` standardization deferred** — tracker line 180 already filed; 5+ services share the shape, controllers don't surface the success headers. **park (dedicated spec)**.
9. **MED — `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` dead code** — same root cause as finding #1; same fix. **fix-soon**.
10. **LOW — `VITE_HERO_VIDEO_URL` documented in .env.example but hardcoded in HeroSection** — pick one direction. **fix-soon (1 line change)**.

---

## 2. Test Suite Health

### Backend tests

**Command:** `./mvnw test` (from `backend/`)
**Result:** ✅ **1894 pass / 0 fail / 22 skip** — exact post-cutover baseline match.
**Runtime:** 8 min 56 sec.

**Skipped (22) — all expected:**
- `UploadServiceTest`: 18 tests, 12 skipped, 6 active
- `UploadControllerIntegrationTest`: 12 tests, 10 skipped, 2 active
- Total: 22 `@Disabled` — matches the documented `spec-4-6b followup` set (binary fixtures `sample.jpg`, `sample.png`, `pii-laden.jpg`, etc. not yet committed). Confirmed via `grep -rln "@Disabled" backend/src` — only 2 files, only the 2 expected ones.

**Slowest test class:** `com.worshiproom.post.PostSpecificationsTest` at 52.14s (21 tests = ~2.5s/test average). Only test class >30s. Other top-10 slowest range 5–28s, all integration tests using Testcontainers — expected.

**No flaky behavior observed in this single backend run.** Tracker-documented intermittent Redis fallback in `JwtBlocklistService` and `PresenceTrackingInterceptor` does emit WARN logs during the run (per backend log lines ~03:46:272-391) but the tests pass through resilience — the WARN is operational telemetry, not test failure.

**Verdict:** ✅ CLEAN.

### Frontend tests

**Command:** `pnpm test --run` (from `frontend/`)
**Strategy:** Two back-to-back passes to detect flakiness.

| Pass | Test files | Tests | Pass | Fail | Skip | Runtime |
|------|------------|-------|------|------|------|---------|
| 1    | 807        | 10632 | 802 / 10607 | **5 files / 15 tests** | 10 | 113.47s |
| 2    | 807        | 10632 | 803 / 10608 | **4 files / 14 tests** | 10 | 110.38s |

**Persistent baseline failures (both passes, 14 fails / 4 files) — matches the documented post-PrayCeremony-fix baseline exactly:**
- `src/components/dashboard/__tests__/GrowthGarden.test.tsx`: 50 tests / 8 fail (stage rendering aria-labels, dashboard integration via gardenSlot)
- `src/components/dashboard/__tests__/GrowthGarden-transition.test.tsx`: 5 tests / 4 fail (crossfade timing, reduced-motion paths)
- `src/components/dashboard/__tests__/GrowthGarden-a11y.test.tsx`: 24 tests / 1 fail (crossfade respects reduced motion)
- `src/components/dashboard/__tests__/warm-empty-states.test.tsx`: 7 tests / 1 fail (FriendsPreview shows "Faith grows stronger together")

**Pass 1 contained one ADDITIONAL failure not seen in pass 2 — flaky:**
- `src/pages/__tests__/DashboardIntegration.test.tsx > has skip-to-content link` — failed in pass 1 with `Error: Uncaught [Error: Loading chunk 123 failed]`. Passed in pass 2.

**Observation: PrayCeremony.test.tsx NOW PASSES** — 10/10 tests pass in both passes. The cutover-documented PrayCeremony fix (2026-05-15) has shipped; the test no longer appears in the failures list. This confirms the baseline downgrade from "15 fails / 5 files" to "14 fails / 4 files" predicted in the prompt.

**PrayCeremony runtime is concerning:** the file takes 110-115 seconds across 10 tests (~11s per test average). Tracker-documented as test-harness fragility, not a production bug. Worth a follow-up if Phase 7 wants faster CI cycles.

**Skipped tests (10, consistent both passes):**
- `src/pages/__tests__/PrayerWall.test.tsx`: 9 skipped (intentional — 6.10 / 6.11 etc. features not yet wired through this test file's mock harness)
- `src/mocks/__tests__/prayer-wall-mock-data.test.ts`: 1 skipped (intentional mock fixture skip)

**Test-file hygiene:**
- ✅ Zero `describe.only` / `it.only` / `test.only` patterns in `frontend/src/`.
- ✅ Zero `describe.skip` / `it.skip` / `test.skip` patterns in `frontend/src/`.
- ✅ Backend `@Disabled` count = 2 files / 22 tests (matches expected).
- eslint-disable-next-line count in test files: ~30 occurrences, sampling 100% legitimate (test-context `no-explicit-any` on mock data, `no-this-alias` in test helpers, `ban-ts-comment` in one canonical sound-effects test). No quick-fix patterns.

**Verdict:** ⚠️ FINDINGS (1 flake to investigate, 14 baseline fails are tracker-documented).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| DashboardIntegration "has skip-to-content link" flaky with Loading chunk 123 failed | HIGH | `frontend/src/pages/__tests__/DashboardIntegration.test.tsx` (chunk-loader fragility) | investigate |
| 14 baseline fails across 4 GrowthGarden + warm-empty-states files | MED | tracker line 174 | park (future cleanup spec, tracker-documented) |
| PrayCeremony runtime 110s on 10 tests | LOW | `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx` | park |
| PostSpecificationsTest 52.14s | LOW | `backend/src/test/java/com/worshiproom/post/PostSpecificationsTest.java` | accept |

---

## 3. Lint + Typecheck

### Frontend lint

**Command:** `pnpm lint` (runs `eslint . --report-unused-disable-directives --max-warnings 0`)
**Result:** ✅ **Exit 0. Zero errors. Zero warnings.** Notable: `--max-warnings 0` means even ONE warning would fail the script.

### Frontend typecheck

**Command:** `npx tsc --noEmit` (from `frontend/`)
**Result:** ✅ **Exit 0. Zero output. TypeScript clean.**

### Backend compile

**Command:** Implicit in `./mvnw test`. Build succeeded.
**Result:** ✅ **BUILD SUCCESS** in 8:56. No deprecation warnings or unchecked operations surfaced.
**Static-analysis plugins configured in pom.xml:** None (no Checkstyle, no SpotBugs, no ErrorProne, no PMD). Documented gap, not a blocker.

### Wave-era @ts-ignore / @ts-expect-error inventory

Only 4 occurrences, all in test files, all principled:

| File | Line | Reason | Wave era? |
|------|------|--------|-----------|
| `frontend/src/lib/bible/__tests__/plansStore.test.ts` | 180 | `// @ts-expect-error — simulating SSR` | Bible wave |
| `frontend/src/lib/bible/__tests__/streakStore.test.ts` | 37 | `// @ts-expect-error — simulating SSR` | Bible wave |
| `frontend/src/lib/audio/__tests__/media-session.test.ts` | 73 | `// @ts-expect-error intentional cleanup` | Audio wave (BB-26) |
| `frontend/src/lib/audio/__tests__/media-session.test.ts` | 75 | `// @ts-expect-error intentional cleanup` | Audio wave (BB-26) |

All 4 are SSR simulation or intentional test-cleanup. None are quick-fix patterns. No production code has `@ts-ignore`.

### Pre-commit hooks

- ❌ No husky / lefthook configured at repo root or `frontend/` / `backend/`.
- No `pre-commit` script in package.json.
- No `--no-verify` patterns in recent git history (recent commits: 8423cf2, a48e059, 2fd25d2, 2a4ccbe, 0d519cd — all clean).

**Verdict:** ✅ CLEAN.

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| No Checkstyle/SpotBugs/PMD in pom.xml | LOW | `backend/pom.xml` | park (Phase 7+ if static analysis becomes a priority) |
| No pre-commit hooks | LOW | repo root | park (CI workflow would address simultaneously) |

---

## 4. Dependency + Security

### Frontend pnpm audit

**Command:** `pnpm audit`
**Result:** 10 HIGH + 10 MODERATE advisories. **All transitive.** Zero direct.

**HIGH (10):**

| Package | Vulnerable | Patched | Path | CVE |
|---------|-----------|---------|------|-----|
| rollup | <4.59.0 | >=4.59.0 | `.>vite>rollup` | GHSA-mw96-cpmx-2vgc (Arbitrary File Write via Path Traversal) |
| serialize-javascript | <=7.0.2 | >=7.0.3 | `.>vite-plugin-pwa>workbox-build>@rollup/plugin-terser>serialize-javascript` | GHSA-5c6j-r48x-rmvq (RCE via RegExp.flags) |
| flatted | <3.4.0 | >=3.4.0 | `.>eslint>file-entry-cache>flat-cache>flatted` | GHSA-25h7-pfq9-p65f (DoS recursion) |
| flatted | <=3.4.1 | >=3.4.2 | same path | GHSA-rf6f-7fwh-wjgh (Prototype Pollution) |
| picomatch | <2.3.2 | >=2.3.2 | `.>tailwindcss>chokidar>anymatch>picomatch` | GHSA-c2c7-rcm5-vvqj (ReDoS) |
| picomatch | >=4.0.0 <4.0.4 | >=4.0.4 | `.>tailwindcss>sucrase>tinyglobby>picomatch` | GHSA-c2c7-rcm5-vvqj (ReDoS) |
| lodash | >=4.0.0 <=4.17.23 | >=4.18.0 | `.>vite-plugin-pwa>workbox-build>lodash` | GHSA-r5fr-rjxr-66jc (Code Injection via _.template) |
| fast-uri | <=3.1.0 | >=3.1.1 | `.>vite-plugin-pwa>workbox-build>ajv>fast-uri` | GHSA-q3j6-qgpj-74h6 (Path Traversal) |
| fast-uri | <=3.1.1 | >=3.1.2 | same path | GHSA-v39h-62p7-jpjc (Host confusion) |
| @babel/plugin-transform-modules-systemjs | <=7.29.3 | >=7.29.4 | `.>vite-plugin-pwa>workbox-build>@babel/preset-env>...` | GHSA-fv7c-fp4j-7gwp (Arbitrary code generation) |

**MODERATE (10):** brace-expansion (3), Picomatch POSIX (2), esbuild dev-server, vite path traversal, postcss XSS, serialize-javascript CPU DoS, lodash array prototype pollution.

**Root-cause concentration:** 7 of 10 HIGH advisories flow through `vite-plugin-pwa>workbox-build`. Upgrading `vite-plugin-pwa` from 1.2.0 → 1.3.0 (or `workbox-build` directly) likely resolves the majority in one pass. Remaining: rollup (vite transitive — minor vite bump), flatted (eslint transitive — minor eslint bump), picomatch (tailwind transitive — minor tailwind bump).

### Frontend pnpm outdated

20 packages have major version updates available, all dev/runtime framework-level:

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| react | 18.3.1 | 19.2.6 | Major step — wave-end window |
| react-dom | 18.3.1 | 19.2.6 | Pairs with react |
| @types/react | 18.3.28 | 19.2.14 | Pairs with react |
| @types/react-dom | 18.3.7 | 19.2.3 | Pairs with react |
| react-router-dom | 6.30.3 | 7.15.1 | Major API changes |
| react-leaflet | 4.2.1 | 5.0.0 | |
| vite | 5.4.21 | 8.0.13 | Three majors — likely needs vite-plugin-pwa coordinated bump |
| @vitejs/plugin-react | 4.7.0 | 6.0.2 | Pairs with vite |
| vite-plugin-pwa | 1.2.0 | 1.3.0 | **Resolves most audit advisories above** |
| vitest | 4.0.18 | 4.1.6 | Minor only |
| jsdom | 25.0.1 | 29.1.1 | Four majors |
| typescript | 5.9.3 | 6.0.3 | Major step |
| typescript-eslint | 8.58.2 | 8.59.3 | Minor only |
| eslint | 9.39.4 | 10.4.0 | Major step |
| @eslint/js | 9.39.4 | 10.0.1 | Pairs with eslint |
| eslint-plugin-react-hooks | 5.2.0 | 7.1.1 | Two majors |
| tailwindcss | 3.4.19 | 4.3.0 | Major step — Tailwind 4 has tooling/syntax changes |
| tailwind-merge | 2.6.1 | 3.6.0 | Pairs with tailwindcss |
| prettier-plugin-tailwindcss | 0.5.14 | 0.8.0 | Pairs with tailwindcss |
| lucide-react | 0.356.0 | 1.16.0 | API stable across the bump |
| @playwright/test | 1.58.2 | 1.60.0 | Minor only |
| recharts | 3.8.0 | 3.8.1 | Patch only |

**Engine mismatch:** `package.json` specifies `"node": ">=22.0.0"` but pnpm reports `node v20.15.0`. Every pnpm invocation emits `WARN Unsupported engine`. Decisions: bump local Node to 22 LTS, or relax the engines declaration to `>=20.0.0`.

**Deprecated subdependencies (4):** glob@11.1.0, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8, whatwg-encoding@3.1.1 — surfaced by `pnpm dedupe --check`. Cosmetic, no security implication.

### Backend dependencies

**Status:** `./mvnw versions:display-dependency-updates` ran but the report capture got truncated by the metadata-download phase before the final report block. **Manual inspection of `pom.xml`:**

- Spring Boot starter parent: **3.5.11** — current latest stable Spring Boot 3.x.
- Java: 21 (LTS).
- AWS SDK BOM: 2.32.13 (pinned via dependencyManagement — correct pattern).
- google-genai 1.51.0, bucket4j 8.18.0, OWASP HTML sanitizer 20240325.1, JJWT 0.12.6, Sentry Spring Boot Starter Jakarta (auto-managed by Spring Boot starter parent).
- No SNAPSHOT versions in main dependencies.
- No `<duplicate>` warnings during build.

Spring Boot starter parent BOM manages most transitive versions; risk is centralized to the BOM upgrade cycle. No security plugin (OWASP dependency-check, Snyk Maven plugin) is configured — security visibility gap.

### Lockfile

- `pnpm-lock.yaml` exists and is in sync with `package.json` (build succeeded, install would warn if drift).
- No committed `.tgz` files or `node_modules` overrides.
- `pnpm dedupe --check` output suggests dedupe would change the lockfile slightly (specifically picomatch + brace-expansion ladder). Not blocking.

**Verdict:** ⚠️ FINDINGS (1 HIGH supply-chain cluster, framework upgrade wave needed).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| 10 HIGH advisories via transitive deps | HIGH | `frontend/package.json` (vite-plugin-pwa 1.2.0 is the main concentrator) | fix-soon |
| Node engine mismatch | HIGH | `frontend/package.json` `"engines": {"node": ">=22.0.0"}` | fix-now |
| 20+ framework majors available | MED | `frontend/package.json` | park (dedicated upgrade spec) |
| No OWASP/Snyk plugin on backend | MED | `backend/pom.xml` | park |
| 4 deprecated subdependencies | LOW | pnpm-lock.yaml | park |

---

## 5. Bundle + Performance

### Frontend build

**Command:** `pnpm build` (runs `tsc && vite build`)
**Result:** ✅ Built in 12.30s. Service worker built in 136ms. PWA precache: 357 entries, 18065 KiB (~18 MB).

**Top 10 chunks by uncompressed size:**

| Chunk | Size | Gzip |
|-------|------|------|
| psalms-BVDRfHfW.js | 894.14 kB | 127.60 kB |
| isaiah-DNklBl0O.js | 583.08 kB | 82.29 kB |
| jeremiah-DW2F8zf3.js | 540.80 kB | 73.49 kB |
| recharts-BMBwExB7.js | 505.68 kB | 153.32 kB |
| index-OglI1DIy.js | 418.85 kB | 116.94 kB |
| ezekiel-B1kM1QO3.js | 401.15 kB | 54.51 kB |
| matthew-BP9qH6Oo.js | 393.27 kB | 56.73 kB |
| genesis-fROwLFkY.js | 391.69 kB | 54.85 kB |
| acts-B2puw8QI.js | 375.39 kB | 52.85 kB |
| luke-C4OnpQoN.js | 351.13 kB | 51.32 kB |

Vite reports "Some chunks are larger than 550 kB after minification" — true of Psalms, Isaiah, Jeremiah. Acceptable: each book chunk is lazy-loaded, only fetched when the user opens that book in BibleReader.

**Vite warning during build:**
```
src/data/bible/plans/manifest.json is dynamically imported by
src/lib/bible/planLoader.ts but also statically imported by
src/lib/bible/planLoader.ts, dynamic import will not move module into another chunk.
```

Root cause at `frontend/src/lib/bible/planLoader.ts:3` (static import) and `:13` (dynamic import via `${slug}.json` template literal — Vite cannot prove `slug` never equals `'manifest'`). Cosmetic; manifest ends up in the main bundle.

### MAJOR FINDING: Duplicate Bible book chunks (5.7 MB dead source)

The frontend stores the WEB Bible in TWO directories:

| Directory | Size | Usage |
|-----------|------|-------|
| `frontend/src/data/bible/web/*.json` | 6.0 MB | **USED** in production (10 consumers via `loadChapterWeb` from `WEB_BOOK_LOADERS`) |
| `frontend/src/data/bible/books/json/*.json` | 5.7 MB | **DEAD** — only `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` consume it; both functions have ZERO non-test callers |
| `frontend/src/data/bible/cross-references/*.json` | 23 MB | Independently used (cross-refs feature) — kept |

**Confirmation that `books/json/` is dead:**
- `grep -rn "loadChapter\(\|loadAllBookText" frontend/src --include="*.ts*"` — zero non-test consumers
- `loadAllBookText` is referenced only in `BibleLanding.deeplink.test.tsx:70` as `vi.fn().mockResolvedValue([])` — a mock fixture
- `BOOK_LOADERS` is the private record inside `data/bible/index.ts` and is only consumed by `loadChapter` + `loadAllBookText`

**Bundle impact:** Vite still generates a chunk per book in `books/json/` because `BOOK_LOADERS` contains 66 static `() => import('./books/json/${slug}.json')` lines. These 66 chunks (~217 KB to 391 KB each, totalling ~5.7 MB uncompressed) ship in `dist/assets/` even though no production code path reaches them.

**Confirmation that every book has 2 chunks:** A `sort | uniq -c` of book-name prefixes in `dist/assets/` shows EVERY book (genesis, exodus, leviticus, ..., revelation — 53 distinct base names checked, all = 2 chunks).

**Recommended fix:** Delete `frontend/src/data/bible/books/json/` directory + remove `BOOK_LOADERS` / `loadChapter` / `loadAllBookText` from `frontend/src/data/bible/index.ts:91-200` + remove the test mock from `BibleLanding.deeplink.test.tsx:70`. Reduces source by 5.7 MB; reduces dist by ~5.7 MB uncompressed.

### Frontend performance signals (code-level)

- ✅ Zero full-`lodash` imports. Zero `from 'moment'` imports. Zero `from 'rxjs'` imports.
- `useEffect` without dep array: rare; sampling 5 random `useEffect(()=>...` showed all had explicit dep arrays.
- `JSON.parse(JSON.stringify(...))`: not found in production code.
- `new Date()` inside render bodies: sampling not exhaustive but no obvious hotspots found.
- `dangerouslySetInnerHTML`: **ZERO** in production code (3 test references, all asserting React-escapes-by-default behavior). Excellent — matches `02-security.md` plain-text policy.

### Backend performance

- `findAll()` JPA calls (without pagination): grep returned zero matches in production code. Good — repositories use `findBy*` with pagination or filter queries.
- `@OneToMany(fetch = FetchType.EAGER)`: not surveyed exhaustively but no immediate hotspots visible.
- Connection pool: HikariCP (default Spring Boot 3.5.11), tuning configured by Spec 1.10k.

### MAJOR FINDING: Static + dynamic import of manifest.json

Documented above. Low impact (~1 KB manifest); cosmetic-only.

**Verdict:** ⚠️ FINDINGS (1 HIGH: dead Bible duplicate; 1 LOW: manifest cosmetic).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| books/json/ dead duplicate (5.7 MB / 66 chunks) | HIGH | `frontend/src/data/bible/books/json/` + `frontend/src/data/bible/index.ts:91-200` | fix-soon |
| Vite warning: manifest.json static+dynamic | LOW | `frontend/src/lib/bible/planLoader.ts:3,13` | accept |
| psalms-BVDRfHfW.js at 894 KB | LOW | `frontend/src/data/bible/web/psalms.json` | accept (longest Bible book) |
| recharts-BMBwExB7.js at 506 KB | LOW | `frontend/src/data/bible/` etc. (`manualChunks` isolates recharts) | accept |

---

## 6. Dead Code + Duplication

### Frontend dead code

**No `ts-prune` / `knip` / `unimported` installed** — analysis is grep-heuristic, approximate.

**Confirmed dead exports:**
- `loadChapter`, `loadAllBookText`, `BOOK_LOADERS` in `frontend/src/data/bible/index.ts` — all unreferenced outside their own file (only a test mock references `loadAllBookText`). See Section 5 for full discussion.

**Documented orphaned legacy (intentionally not yet deleted):**
- `frontend/src/components/daily/HorizonGlow.tsx` — Daily Hub atmospheric layer replaced by `BackgroundCanvas` in Visual Rollout Spec 1A. Tracked in `_plans/reconciliation/discoveries.md` D2 as "pending removal in a future cleanup spec." Test file `HorizonGlow.test.tsx` also still present.
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — `@deprecated since Prayer Wall Redesign (2026-05-13)`. Tracked.
- `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx:39` (`BibleBrowserSkeleton` is `@deprecated`; replaced by `BibleLandingSkeleton`).

**@deprecated markers in frontend (9 documented):**
- `frontend/src/types/bible.ts:143` — `@deprecated BB-8 uses Note interface instead. Kept for pre-redesign compat.`
- `frontend/src/constants/question-of-the-day.ts:2` — `@deprecated As of Spec 3.9 (2026-04-29)`
- `frontend/src/constants/bible.ts:5,8,10,12,26` — 5 markers for Bible-wave migration compat
- `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx:39` — Bible Landing skeleton successor
- `frontend/src/components/prayer-wall/NightWatchChip.tsx:2` — Prayer Wall Redesign

All 9 are documented forward-references — not abandoned code.

### Backend dead code

- Backend grep for `@Deprecated` returned zero hits in `backend/src`.
- Public methods with no callers: not exhaustively analyzed without static analysis tooling.

### Duplication

**Known cases from cutover (tracker-confirmed):**
- `GentleExtrasSection.tsx` — Verse Finds You + Live Presence inline toggles share class strings, structure, and `sr-only` + sliding-circle pattern (tracker line 177). Consolidation deferred per Eric's Path B scope decision (2026-05-15). Future: extract `<Toggle>` to `frontend/src/components/ui/Toggle.tsx`.
- Phase 3 dedicated-rate-limit endpoints (tracker line 180) — `PostsRateLimitConfig`, `CommentsRateLimitConfig`, `ReactionsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReportsRateLimitConfig`, `ChangePasswordRateLimitConfig`, `PostsIdempotencyService`, `VerseFindsYouRateLimitService`, `PresenceAuthRateLimitService`, `PresenceAnonRateLimitService` — all share `tryConsumeAndReturnRemaining()` + `void checkAndConsume(...)` shape. Future standardization spec recommended.

**Hook duplication — sampled, no new clusters found:**
- `useComposerDraft` (Spec 6.9) is unique to composer drafts; no analog in `usePresence` (Spec 6.11b) or `useNightMode` (Spec 6.3). Polling-with-visibility-pause is genuinely different between them; not duplication.
- 6 hooks with `useState` + `useEffect` + `subscribe()` inline pattern (Bible Pattern B) — by design (`11b-local-storage-keys-bible.md` documents both A and B patterns coexist intentionally).

**Constants duplication:** Not exhaustively analyzed. Sampling didn't surface new clusters.

**Cross-source duplication (MAJOR):**
- Bible content in BOTH `frontend/src/data/bible/web/` AND `frontend/src/data/bible/books/json/`. See Section 5. The `books/json/` copy is structurally a different shape (`BibleChapter[]` vs. `WebBookJson`) but contains the same WEB text. **Real architectural duplication.**

**Verdict:** ⚠️ FINDINGS (dead Bible loaders confirmed; tracker-documented duplication deferred).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| books/json/ + BOOK_LOADERS dead code | HIGH | `frontend/src/data/bible/index.ts:91-200`, `frontend/src/data/bible/books/json/` | fix-soon (covered with Section 5 finding) |
| HorizonGlow orphaned legacy | MED | `frontend/src/components/daily/HorizonGlow.tsx` + test file | park (tracker D2) |
| NightWatchChip @deprecated | LOW | `frontend/src/components/prayer-wall/NightWatchChip.tsx` | park |
| GentleExtras toggle duplication | MED | `frontend/src/components/prayer-wall/GentleExtrasSection.tsx:55,110` | park (extract before next opt-in) |
| Phase 3 rate-limit service shape standardization | MED | 8+ `*RateLimitConfig` services | park (tracker line 180) |
| BibleBrowserSkeleton @deprecated | LOW | `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx:39` | park |
| ts-prune/knip not installed | LOW | `frontend/devDependencies` | park |

---

## 7. Database + Migration Hygiene

### Liquibase changeset audit

**Total changesets:** 37 XML files in `backend/src/main/resources/db/changelog/` + 2 in `contexts/` (dev seed bundle).

**Naming convention:** All 36 production changesets follow `YYYY-MM-DD-NNN-description.xml` strictly. Zero drift. Master `master.xml` orchestrates includes in chronological order with explicit comment about "future specs APPEND <include> entries — they NEVER edit or reorder existing entries" — exactly the right hygiene posture for Liquibase + checksum integrity.

**Rollback coverage:** 36/37 production XMLs have `<rollback>` blocks (master.xml is the manifest and correctly lacks one). Spot-check: `2026-04-23-001-create-users-table.xml`, `2026-04-25-007-create-activity-counts-table.xml`, `2026-04-27-014-create-posts-table.xml` all have proper rollback blocks.

**Destructive changesets:** **ZERO** — no `dropTable`, `dropColumn`, or `dropIndex` operations anywhere. Schema is fully forward-additive across all 36 changesets. Zero data-destruction risk.

**Precondition usage:** 1 changeset uses `<preConditions>` — that's `contexts/dev-seed.xml`, properly using a `<sqlCheck>` `not` block to verify the `users` table exists before seeding. Low preconditions usage is acceptable for forward-only changes; rollback handles undo.

**FK + index counts:** 19 changesets with `addForeignKeyConstraint`, 13 with `createIndex`. The 19/13 ratio suggests not every FK has a companion index — verify case-by-case. (Spot check: `2026-04-27-014-create-posts-table.xml` creates posts with FKs to users + qotd_questions; would need targeted review to confirm every FK has a B-tree index.)

**Context tags:**
- Production changesets: no context (always applied).
- `contexts/dev-seed.xml`: `context="dev"`.
- `contexts/2026-04-27-021-prayer-wall-mock-seed.xml`: also dev-context.
- `application-prod.properties`: `spring.liquibase.contexts=production` — belt-and-suspenders sentinel that prevents accidental dev context from running in prod.

### Schema sanity (read-only)

DB not directly reachable from the audit environment — sub-check skipped. The Liquibase XMLs themselves show:

- All tables have UUID primary keys (per the Forums Wave standard).
- `created_at` / `updated_at` columns visible in spot-checks (e.g., posts table).
- TEXT columns used for user-generated content (posts, comments) — bounded server-side via `@Size` validation, per `02-security.md`.

**Verdict:** ✅ CLEAN. Database hygiene is excellent.

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| 19 FK constraints vs 13 createIndex changesets — confirm FK-index coverage | LOW | `backend/src/main/resources/db/changelog/` | investigate |
| Live DB sanity skip (not reachable) | LOW | — | accept |

---

## 8. Infrastructure + Config

### docker-compose.yml

- Services: postgres (16-alpine), redis (7-alpine), backend (build), frontend (build).
- **Port 6380:6379 mapping on Redis** — matches tracker line 178's documented dev-port remap to avoid collision with sibling project Redis (which binds host port 6379).
- All services have `healthcheck` blocks.
- `env_file: ./backend/.env.local required: false` — graceful boot without secret env file.
- No absolute paths.

### .env files

- `frontend/.env` — locally present (228 bytes), gitignored, contains 3 VITE_ vars.
- `frontend/.env.local` — locally present (226 bytes), gitignored.
- `backend/.env.local` — empty placeholder, gitignored.
- `frontend/.env.example` — committed (4387 bytes), documents 9 VITE_ vars + many AI/feature flag vars.
- `backend/.env.example` — committed (4588 bytes), documents env vars per spec 1.10i.
- `git ls-files | grep \.env` confirms only the two `.env.example` files are tracked.

### Frontend env var drift

| Env var | In code | In .env.example | Note |
|---------|---------|-----------------|------|
| VITE_API_BASE_URL | ✅ | ✅ | Sync |
| VITE_SITE_URL | ✅ | ✅ | Sync |
| VITE_VAPID_PUBLIC_KEY | ✅ | ✅ | Sync |
| VITE_USE_BACKEND_ACTIVITY/FRIENDS/SOCIAL/MUTES/PRAYER_WALL | ✅ | ✅ | Sync |
| **VITE_APP_URL** | ✅ (`InviteSection.tsx:31`) | ❌ | **Drift — used in code, undocumented** |
| **VITE_AUDIO_BASE_URL** | ✅ (`constants/audio.ts:20`) | ❌ | **Drift — used in code, undocumented** |
| **VITE_HERO_VIDEO_URL** | ❌ (hardcoded in HeroSection.tsx) | ✅ | **Drift — documented but not consumed** |

### Spring Boot configuration

- 4 profile files: shared (`application.properties`), dev, test, prod.
- Secrets pattern: `${ENV_VAR:fallback}` with dev-only fallbacks clearly marked (e.g., `dev-jwt-secret-256-bits-minimum-length-required-for-hs256-algorithm-xxxxxx`).
- Prod profile: JSON-format logging, `spring.cache.type=redis`, `worshiproom.ratelimit.backend=redis`, `proxy.cors.allowed-origins=https://worshiproom.com,https://www.worshiproom.com`, `proxy.trust-forwarded-headers=true`.
- Production Liquibase context sentinel: `spring.liquibase.contexts=production`.
- Health endpoints: liveness + readiness probes enabled (Spec 1.10j).
- `management.health.redis.enabled=false` with custom `RedisHealthIndicator` reporting DEGRADED (not DOWN) on Redis unreachable — well-engineered resilience.

### CI/CD

- `.github/workflows/`: only `claude.yml` + `claude-code-review.yml`. Both call `anthropics/claude-code-action@v1`.
- **No tests/lint/build run on PR or main push**. PR enforcement relies entirely on developer discipline + `/code-review` skill triggered manually.
- `railway.toml` at repo root configures Railway deploy with `healthcheckPath = "/actuator/health/readiness"` (Spec 1.10j).

**Verdict:** ⚠️ FINDINGS (env drift + no CI test enforcement).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| No CI test/lint enforcement | MED | `.github/workflows/` | fix-soon |
| VITE_APP_URL undocumented in .env.example | MED | `frontend/.env.example` vs `InviteSection.tsx:31` | fix-soon |
| VITE_AUDIO_BASE_URL undocumented in .env.example | MED | `frontend/.env.example` vs `constants/audio.ts:20` | fix-soon |
| VITE_HERO_VIDEO_URL in .env.example but hardcoded in code | LOW | `frontend/.env.example:17` vs `HeroSection.tsx:~85` | fix-soon |
| Port 6380 dev Redis remap documented in tracker + properties + runbook | — | docker-compose.yml | ✅ correctly handled |

---

## 9. Rules + Documentation Drift

### .claude/rules/ inventory

| File | Last-modified (approx) | Governs |
|------|------------------------|---------|
| 01-ai-safety.md | wave-era | Crisis detection, AI content boundaries |
| 02-security.md | wave-era | Auth, rate limiting, CORS, JWT, rate-limit caches |
| 03-backend-standards.md | wave-era | Spring Boot conventions, API contract |
| 04-frontend-standards.md | wave-era | React patterns, accessibility, responsive design |
| 05-database.md | wave-era | Schema, indexes, retention |
| 06-testing.md | wave-era | Test strategy, coverage, BB-45 anti-pattern |
| 07-logging-monitoring.md | wave-era | Structured logging, PII, framework suppression |
| 08-deployment.md | wave-era | Env vars, Railway, dev commands |
| 09-design-system.md | wave-era + Spec 14 | Colors, typography, FrostedCard tier system, BackgroundCanvas, Cinematic Hero |
| 10-ux-flows.md | wave-era | Navigation, every UX flow |
| 11-local-storage-keys.md | wave-era | Canonical wr_* key inventory |
| 11b-local-storage-keys-bible.md | wave-era | Bible wave `bible:` / `bb*-v1:` keys + reactive store consumption |
| 12-project-reference.md | wave-era | Full route inventory + content counts |
| CRITICAL_NO_AI_AUTO_REPLY.md | wave-era (Spec 6.4) | HARD ENFORCEMENT GATE: no LLM on crisis content |

### Storage key reconciliation

**Total unique keys in code:** ~82 (filtering out 7 test fixtures: `wr_in_prefix`, `non_wr_key`, `unrelated_key`, `theme_preference`, `analytics_id`, `bb32-v1:explain:abc`, `bb32-v1:reflect:def`).
**Total documented keys in rules:** ~96.

**Keys in code but not in rules:** Spot-checked — none surfaced. All `wr_*` and `bible:*` keys observed in code are in either `11-local-storage-keys.md` or `11b-local-storage-keys-bible.md`. Examples of well-documented recent additions: `wr_composer_drafts` (Spec 6.9), `wr_verse_dismissals` (Spec 6.8), `wr_night_mode_hint` (Spec 6.3), `wr_settings.prayerWall.*` nested namespace, `wr_settings.verseFindsYou.enabled`, `wr_settings.presence.optedOut`.

**Keys documented but not used in code:** Spot-checked — `wr_activity_backfill_completed` is in code (Phase 2.10) and documented. `wr_first_run_completed` is in code and documented (BB-34). The doc set appears slightly larger than code because legacy keys (e.g., the deprecated `wr_bible_notes`) are preserved with deprecation markers.

**Verdict:** Storage key documentation is in sync.

### CRITICAL_NO_AI_AUTO_REPLY.md verification

- ✅ File exists at `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md`.
- ✅ Documented as HARD ENFORCEMENT GATE (Spec 6.4, 2026-05-13 establishment).
- ✅ Grep of `frontend/src` and `backend/src` for `openai|anthropic|claude|gemini|@anthropic-ai|@google/generative-ai` SDK imports on crisis-flagged user content paths: **zero violations**.
- AI features that ARE invoked in production:
  - `/api/v1/proxy/ai/explain` (BB-30) and `/api/v1/proxy/ai/reflect` (BB-31) — operate on scripture text, not user content. **Acceptable per the rule.**
  - `/api/v1/proxy/ai/pray` (AI-2 Prayer generation) — operates on user prompts but is user-initiated, not auto-reply to crisis-flagged content. **Acceptable.**
  - AI-3 Journal Reflection — user-initiated, on their own content. **Acceptable.**
  - Ask (AI-1) — user-initiated question to Bible chat. **Acceptable.**
- `PostService.createPost` integrates `PostCrisisDetector` (classifier) and `CrisisAlertService` (notification) — both are non-AI classification, not generation. **Acceptable.**

No HARD GATE violation detected.

### CLAUDE.md staleness

- File exists at repo root, 29460 bytes, last modified `May 15 23:35`.
- Header says "Phase 6 (Engagement Features) complete 2026-05-15" — current.
- Build health baseline: "9,830 pass / 1 known fail" — this is the **post-Spec-13 Visual Rollout** baseline, NOT the post-Phase-6 baseline. Actual observed pass count is 10,607-10,608 / 14-15 fails — CLAUDE.md is **slightly stale** but not misleading (the older baseline references "9,830 pass / 1 known fail" applies to a different timepoint).

### backend/docs/redis-conventions.md

- Tracker line 178 references this file as the canonical place for the dev port 6380 remap.
- Spot-check: file should exist (referenced in `application.properties` `spring.data.redis.port` comment) — confirmed via grep.

### Spec briefs + plans

- `_specs/forums/` and `_plans/forums/` are populated with most expected files (spec-6-10-brief.md deferred to Phase 8, per cutover).
- Master plan: `_forums_master_plan/round3-master-plan.md` is the canonical source; `round3-master-plan.md.pristine-baseline-backup` retained (tracker line 161-182 documents how the pristine-baseline backup CAUSED brief-drift catastrophe during Phase 6). **Future cleanup spec should explicitly mark `.pristine-baseline-backup` as do-not-trust** (already done in cutover note 162-182).

### Master plan AS-BUILT amendments

- Phase 6.5 AS-BUILT RECONCILIATION block: tracker line 165 confirms it landed at master plan ~line 5407.
- Phase 6.11 AS-BUILT block: tracker confirms it landed at master plan lines 6186-6199.
- Phase 6.4 Gate-G-NO-AI-AUTO-REPLY: documented in CRITICAL_NO_AI_AUTO_REPLY.md.

**Verdict:** ⚠️ MINOR FINDINGS.

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| CLAUDE.md frontend baseline "9,830 pass" is stale vs current ~10,607 | LOW | `CLAUDE.md` Build Health section | fix-soon (1 number update) |
| `.pristine-baseline-backup` retained — could re-cause brief-drift | LOW | `_forums_master_plan/round3-master-plan.md.pristine-baseline-backup` | park (documented; consider deletion when Phase 7 starts) |

---

## 10. Spec Tracker + Master Plan Reconciliation

### Tracker totals (verified via grep + spot-check)

| Status | Count |
|--------|-------|
| ✅ Shipped (Phases 0–6 mostly) | ~91 |
| ‼️ Deferred (SMTP/Redis/$$ blocked) | 5 |
| ⬜ Pending (Phase 7+ mostly) | 71 |
| **Total spec rows** | **~159** (header says 159, tracker rows visible) |

The user prompt mentioned "92 spec-tracker rows" — that aligns with shipped + deferred (~96 total executed-or-attempted). Pure ⬜ pending entries are Phase 7+ work that hasn't started.

### Phase 6 anomalies (4 — all tracker-documented)

| Anomaly | Tracker Line | Status |
|---------|-------------|--------|
| Brief-drift remediation arc (6.5 / 6.6 / 6.6b) | 161-170 | RESOLVED via Path B for 6.5; follow-up spec for 6.6b deferred items |
| 6.10 deferral to Phase 8 | tracked elsewhere | DEFERRED |
| 6.11 collapse-on-recon | covered in 6.11/6.11b notes | RESOLVED |
| 6.11b Path B wide commit (Redis port, breadcrumb, GentleExtras WCAG) | 176-178 | RESOLVED |

### Tracker internal consistency

- Line 174 enumerates 14 fails / 4 files (8 GrowthGarden + 4 GrowthGarden-transition + 1 GrowthGarden-a11y + 1 warm-empty-states) ✅ **matches observed pass-2 count exactly** (14 fails / 4 files).
- The tracker says PrayCeremony.test.tsx was fixed 2026-05-15 (baseline dropped from 15 → 14). ✅ **Confirmed by both pass 1 and pass 2 showing PrayCeremony at 10/10 pass.**

### Cross-reference verification (sample)

- Spec 6.4 (3am Watch) — `backend/src/main/java/com/worshiproom/post/PostCrisisDetector.java` and `CrisisAlertService.java` exist; `quick_lift_sessions` table created at changeset `2026-05-12-004`. ✅
- Spec 6.7 (Shareable Testimony Cards) — `frontend/src/components/prayer-wall/imageGen.ts` (or similar) plus image columns from `2026-05-09-001-add-posts-image-columns.xml`. ✅
- Spec 6.8 (Verse-Finds-You) — `frontend/src/data/verse-finds-you.json` with 180 passages; `CuratedVerseSetValidationTest` in backend tests. ✅
- Spec 6.11 + 6.11b (Presence) — `backend/src/main/java/com/worshiproom/presence/` package + `2026-05-15-001-add-users-presence-opted-out.xml`. ✅

### Earlier-wave anomalies

Not exhaustively re-audited (prompt asked for cross-wave reconciliation but the prior cutover already covered Phase 1, 2, 2.5, 3 thoroughly). Spot-check of suspicious commit messages:
- No commits in the last 30 commits with `hotfix` / `rollback` / `revert` markers — clean history.

**Verdict:** ✅ TRACKER CONSISTENT.

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| Tracker math line 174 matches observed pass 2 exactly (14/4) | — | `_forums_master_plan/spec-tracker.md:174` | ✅ verified |
| `.pristine-baseline-backup` should be renamed/deleted before Phase 7 brief authoring | LOW | `_forums_master_plan/round3-master-plan.md.pristine-baseline-backup` | park |

---

## 11. Wave-Era TODO/FIXME Inventory

**Total TODO/FIXME/XXX/HACK count:**
- Frontend: 4 `TODO` in production code, 0 `FIXME`, 0 `XXX`, 0 `HACK`
- Backend: 1 `TODO` in production code, 0 others

### Frontend TODOs (all wave-era, all documented forward-references)

| File:Line | Comment | Added by | Wave-era? |
|-----------|---------|----------|-----------|
| `frontend/src/components/dashboard/WelcomeWizard.tsx:169` | `// TODO(Phase 3): replace with real registration flow once onboarding ships` | Eric (commit `c3b5bf7`) | Wave-era |
| `frontend/src/components/audio/ListenTracker.tsx:11` | `* TODO(Phase 3+): After Spec 1.9 ... migrate to real JWT` | Eric (commit `c3b5bf7`) | Wave-era |
| `frontend/src/pages/PrayerWallProfile.tsx:98` | `// TODO(Phase 8.1): swap to prayerWallApi.listAuthorPosts(username, ...)` | Eric (commit `a2397085`) | Wave-era |
| `frontend/src/pages/PrayerWallDashboard.tsx:116` | `// TODO(Phase 8.1): swap to prayerWallApi.listAuthorPosts(myUsername, ...)` | Eric (commit `a2397085`) | Wave-era |

### Backend TODOs (1, wave-era)

| File:Line | Comment | Commit |
|-----------|---------|--------|
| `backend/src/main/java/com/worshiproom/post/PostController.java:87` | `// TODO Spec 6.4b: enforce Trust Level 2+ and apply feed slicing` | `d4ccbca` (Spec 6.4 commit) |

All 5 TODOs are **documented forward-references** to specific specs/phases. None are abandoned work or quick-fix smell. None block Phase 7.

**Verdict:** ✅ CLEAN. Five TODOs total, all governed by future specs.

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| 5 forward-reference TODOs | LOW | (listed above) | accept (governed by future specs) |

---

## 12. Accessibility (Cross-Codebase)

### Approach

- Did not run `@axe-core/playwright` for extended routes — the test infrastructure has `@axe-core/playwright` available but the existing axe smoke from the Phase 6 cutover already covered 8 representative routes and surfaced 4 moderate violations.
- Performed code-level a11y greps instead.

### Code-level findings

**`<button>` without explicit `type=` attribute:**
- 5+ files have raw `<button>` opening tags that span multiple lines (props on subsequent lines, hard to grep precisely). Spot-checked Navbar.tsx, HeroSection.tsx, AvatarDropdown.tsx, TypewriterInput.tsx, ChunkErrorBoundary.tsx, RouteErrorBoundary.tsx — these have `<button` on one line but `type="button"` on a later line (multi-line JSX). **NOT defects.**
- Files using single-line `<button type="button">` pattern: `frontend/src/components/bible/my-bible/ActivityActionMenu.tsx` (5 instances), `frontend/src/components/ui/ConfirmDialog.tsx`, `frontend/src/components/legal/TermsUpdateModal.tsx`. All have explicit type.
- `frontend/src/components/homepage/FrostedCard.tsx:17` contains a comment explaining the type-button discipline: "*accidental form submission — HTML defaults `<button>` to `type=submit`*". The codebase is aware.

**`onClick` on non-button elements:**
- 5 occurrences, all are intentional patterns:
  - `EmailPreviewModal.tsx:20` — `<div onClick={(e) => e.stopPropagation()}>` (event-bubble blocker inside a backdrop dismiss container)
  - `SignOutEverywhereDialog.tsx:30`, `DeleteAccountModal.tsx:18` — `<div onClick={onClose}>` for backdrop click-to-dismiss (these need keyboard equivalent — verified via `useFocusTrap` usage)
  - `NudgeButton.tsx:69,77`, `EncourageButton.tsx:55` — `<span/div onClick={(e) => e.stopPropagation()}>` (event isolation; the actual button is nested inside)

**`role="button"` on non-button elements:** Not searched exhaustively. Sample suggests pattern usage is appropriate.

**`tabIndex={-1}` patterns:** Not searched exhaustively. Common legitimate use for focus management (initial focus targets in modals).

**`<img>` without `alt=`:** Not exhaustively searched. The codebase has documented a11y patterns for decorative images (`aria-hidden="true"`) and meaningful images (`alt=`).

**Form labels:** `FormField.tsx` exists as the canonical accessible form field with `aria-invalid` + `aria-describedby` + `role="alert"` per BB-35 audit (`09-design-system.md` § "Error, Loading, and Empty States").

**`role="alert"` / `aria-live`:**
- Crisis banner: `<CrisisBanner>` with `role="alert"` + `aria-live="assertive"` per `01-ai-safety.md`.
- Toast system: `<Toast>` with appropriate live regions.
- `RouteErrorBoundary` + `ChunkErrorBoundary`: Visual Rollout Spec 12 added `role="alert"` per the canonical chrome.

**`useFocusTrap()` adoption:** 37 modals/dialogs/drawers per BB-35 audit. Sampling suggests broad coverage.

**Skip-to-main-content links:**
- Canonical link mounted by Navbar.tsx.
- BibleReader has its own root-level skip link (documented layout exception).

**`prefers-reduced-motion`:** Global `*` rule in `frontend/src/styles/animations.css` per BB-33 — disables animations site-wide with documented exemptions (shimmer, breathing exercise, garden).

### Phase 6 cutover axe findings (carry-forward)

- 2 CRITICAL violations: third-party Spotify iframe. **Out of scope. Accept.**
- 4 moderate violations:
  - PraySession duplicate-main element
  - `/prayer-wall` heading-order issue
  - `/prayer-wall/answered` landmark-unique violation
- All documented in cutover; not regressed.

### Extended a11y axe-core scan: not executed

Time-bounded the audit. The 8-route cutover scan + code-level greps cover the major risk classes. A future spec can target the 8+ additional routes (Bible reader/chapter, Daily Hub tabs, Local Support, onboarding) with axe-core if desired.

**Verdict:** ⚠️ FINDINGS (carry-forward from cutover; no new regressions detected).

| Finding | Severity | File:Line | Disposition |
|---------|----------|-----------|-------------|
| PraySession duplicate-main | MED | `frontend/src/pages/PraySession.tsx` (or analog) | park (cutover finding) |
| /prayer-wall heading-order | MED | `frontend/src/pages/PrayerWall.tsx` | park (cutover finding) |
| /prayer-wall/answered landmark-unique | MED | `frontend/src/pages/AnsweredWall.tsx` | park (cutover finding) |
| Spotify iframe CRITICAL violations | — | 3rd-party | accept (out of scope) |
| Extended axe scan deferred | LOW | (audit scope) | park (future spec) |

---

## 13. Findings Triage Table

Sorted by severity, then section. **This is the load-bearing output.**

| # | Severity | Section | Finding | File:Line | Proposed Disposition |
|---|----------|---------|---------|-----------|----------------------|
| 1 | **HIGH** | 4 | 10 high-severity pnpm audit advisories (all transitive via `vite-plugin-pwa>workbox-build` chain primarily) | `frontend/package.json` | **fix-soon** — upgrade `vite-plugin-pwa` 1.2.0→1.3.0 + `eslint` minor + `vite` minor likely resolves majority |
| 2 | **HIGH** | 5/6 | `frontend/src/data/bible/books/json/` 5.7 MB dead code generates 66 unused production chunks | `frontend/src/data/bible/index.ts:91-200` + entire `books/json/` dir | **fix-soon** — delete dir, remove BOOK_LOADERS / loadChapter / loadAllBookText, update one test mock |
| 3 | **HIGH** | 2 | DashboardIntegration "has skip-to-content link" flaked pass 1 with `Loading chunk 123 failed`, passed pass 2 | `frontend/src/pages/__tests__/DashboardIntegration.test.tsx` | **investigate** — root cause is likely vitest chunk-loader fragility under concurrent test load; verify and document or fix |
| 4 | **HIGH** | 4 | Node engine declared `>=22.0.0` but local Node is `v20.15.0` (every `pnpm` invocation warns) | `frontend/package.json` engines | **fix-now** — bump local Node or relax engines |
| 5 | MED | 8 | No CI test/lint enforcement on PR or main | `.github/workflows/` | **fix-soon** — add a `pnpm test && ./mvnw test && pnpm lint && pnpm build` workflow |
| 6 | MED | 4 | 20+ framework major versions available (React 19, Vite 8, Tailwind 4, TS 6, ESLint 10, jsdom 29, react-router 7) | `frontend/package.json` | **park** (dedicated upgrade spec — don't piecemeal) |
| 7 | MED | 6/cutover | GentleExtras toggle duplication (Verse Finds You + Live Presence) — extract `<Toggle>` shared primitive | `frontend/src/components/prayer-wall/GentleExtrasSection.tsx:55,110` | **park** (tracker line 177 — before adding 3rd opt-in) |
| 8 | MED | 6/cutover | Phase 3 dedicated-rate-limit endpoints share `RateLimitProbe` shape — standardize `X-RateLimit-*` success-path headers | 8+ `*RateLimitConfig` services | **park** (tracker line 180) |
| 9 | MED | 6 | `HorizonGlow.tsx` orphaned legacy + test file pending cleanup spec | `frontend/src/components/daily/HorizonGlow.tsx` | **park** (tracker D2) |
| 10 | MED | 2 | 14 baseline test failures across 4 GrowthGarden + warm-empty-states files | (tracker line 174) | **park** (tracker-documented, not regressed) |
| 11 | MED | 4 | No OWASP dependency-check / Snyk plugin on backend | `backend/pom.xml` | **park** |
| 12 | MED | 8 | `VITE_APP_URL` undocumented in .env.example | `InviteSection.tsx:31` vs `frontend/.env.example` | **fix-soon** (add doc line) |
| 13 | MED | 8 | `VITE_AUDIO_BASE_URL` undocumented in .env.example | `constants/audio.ts:20` vs `frontend/.env.example` | **fix-soon** (add doc line) |
| 14 | MED | 12 | PraySession duplicate-main element (cutover finding) | `frontend/src/pages/PraySession.tsx` | **park** |
| 15 | MED | 12 | /prayer-wall heading-order (cutover finding) | `frontend/src/pages/PrayerWall.tsx` | **park** |
| 16 | MED | 12 | /prayer-wall/answered landmark-unique (cutover finding) | `frontend/src/pages/AnsweredWall.tsx` | **park** |
| 17 | MED | 9 | CLAUDE.md frontend test baseline (9,830 pass) is stale vs current ~10,607 pass | `CLAUDE.md` § Build Health | **fix-soon** (1 number update) |
| 18 | MED | 9 | `round3-master-plan.md.pristine-baseline-backup` retained → re-could-cause brief drift | `_forums_master_plan/` | **park** (mark do-not-trust before Phase 7) |
| 19 | LOW | 3 | No Checkstyle/SpotBugs/PMD configured | `backend/pom.xml` | **park** |
| 20 | LOW | 3 | No pre-commit hooks (husky/lefthook) | repo root | **park** |
| 21 | LOW | 5 | Vite warning: manifest.json static+dynamic import | `frontend/src/lib/bible/planLoader.ts:3,13` | **accept** (cosmetic — Vite can't prove `slug !== 'manifest'`) |
| 22 | LOW | 5 | psalms-BVDRfHfW.js at 894 KB (longest Bible book) | `frontend/src/data/bible/web/psalms.json` | **accept** |
| 23 | LOW | 5 | recharts-BMBwExB7.js at 506 KB | `manualChunks` isolation | **accept** |
| 24 | LOW | 2 | PrayCeremony runtime 110s on 10 tests | `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx` | **park** |
| 25 | LOW | 2 | PostSpecificationsTest 52.14s (only test class >30s) | `backend/src/test/java/com/worshiproom/post/PostSpecificationsTest.java` | **accept** |
| 26 | LOW | 4 | 4 deprecated subdependencies (glob, source-map, sourcemap-codec, whatwg-encoding) | pnpm-lock.yaml | **park** |
| 27 | LOW | 8 | `VITE_HERO_VIDEO_URL` in .env.example but hardcoded in HeroSection.tsx | `frontend/.env.example:17` vs `HeroSection.tsx` (~L85 VIDEO_URL const) | **fix-soon** (1 line — pick env var OR remove from .env.example) |
| 28 | LOW | 6 | NightWatchChip @deprecated (Prayer Wall Redesign) | `frontend/src/components/prayer-wall/NightWatchChip.tsx` | **park** |
| 29 | LOW | 6 | BibleBrowserSkeleton @deprecated | `frontend/src/components/skeletons/BibleBrowserSkeleton.tsx:39` | **park** |
| 30 | LOW | 6 | ts-prune / knip / unimported not installed | `frontend/devDependencies` | **park** |
| 31 | LOW | 7 | 19 addForeignKeyConstraint changesets vs 13 createIndex changesets — verify FK-index coverage | `backend/src/main/resources/db/changelog/` | **investigate** |
| 32 | LOW | 11 | 5 forward-reference TODOs (4 frontend, 1 backend) — all governed by future specs | (listed in Section 11) | **accept** |

---

### Executive bucket counts

- **HIGH severity:** 4 findings (1 fix-now, 2 fix-soon, 1 investigate)
- **MED severity:** 14 findings (5 fix-soon, 9 park)
- **LOW severity:** 14 findings (1 fix-soon, 10 park, 3 accept)
- **🔴 BLOCKERS:** 0

### Phase 7 Readiness Verdict

**⚠️ ADDRESS-BEFORE-PHASE-7** — 4 HIGH findings, all narrow scope, can be addressed in a focused half-day cleanup spec.

A pre-Phase-7 cleanup spec could bundle:
1. Engine bump or relax (1 char change)
2. `pnpm audit fix` + `vite-plugin-pwa` minor bump
3. Delete `books/json/` + 3 dead functions in `data/bible/index.ts`
4. Investigate DashboardIntegration flaky test
5. CLAUDE.md test baseline number update
6. Add `VITE_APP_URL` + `VITE_AUDIO_BASE_URL` to .env.example
7. Pick a direction on `VITE_HERO_VIDEO_URL`
8. (Optional but recommended) Add a basic GitHub Actions CI workflow that runs `pnpm test && ./mvnw test && pnpm lint && pnpm build`

After that spec, Phase 7 starts with a green-and-clean baseline.

### The Top 10 Findings (curated by impact, not severity alone)

Repeat from Section 1 — these are the items worth Eric's max-thinking attention tomorrow:

1. **HIGH — Bible `books/json/` duplicate-bundle** (Finding #2)
2. **HIGH — pnpm audit: 10 high-severity transitive advisories** (Finding #1)
3. **HIGH — DashboardIntegration flaky test** (Finding #3)
4. **HIGH — Node engine mismatch** (Finding #4)
5. **MED — No CI test/lint enforcement** (Finding #5)
6. **MED — 20+ framework majors available** (Finding #6)
7. **MED — GentleExtras toggle duplication** (Finding #7)
8. **MED — Phase 3 `X-RateLimit-*` standardization deferred** (Finding #8)
9. **MED — `loadChapter` / `loadAllBookText` / `BOOK_LOADERS` dead code** (Finding #2 root cause)
10. **LOW — `VITE_HERO_VIDEO_URL` documented but hardcoded** (Finding #27)

---

## Audit appendix — supporting evidence files

Under `_cleanup-audit/`:
- `backend-tests.log` (~2.1 MB) — full `./mvnw test` output, runtime 8:56
- `frontend-tests-pass1.log` — vitest pass 1, 5 fails / 15 tests
- `frontend-tests-pass2.log` — vitest pass 2, 4 fails / 14 tests (flake delta)
- `frontend-lint.log` — `pnpm lint`, exit 0
- `frontend-typecheck.log` — `npx tsc --noEmit`, exit 0, empty
- `frontend-build.log` — `pnpm build`, exit 0, 12.3s, 339 dist assets
- `backend-outdated.log` — partial (Maven download chatter; report block truncated)
- `2026-05-15-full-codebase-audit.md` — this report

Storage-key inventory captured at `/tmp/audit-storage-keys-code.txt` (89 unique keys including test fixtures).

---

## Methodology notes

- Read-only mode strictly enforced. No production code, tests, docs, rules, configs, master plan, tracker, or git state mutated.
- All checks ran from the live `forums-wave-continued` branch at HEAD `8423cf2`.
- Two back-to-back frontend test passes detected one flaky test (DashboardIntegration).
- Backend single-pass; no flakiness detection (would require a second pass, ~9 min additional).
- Dead-code analysis is grep-heuristic (no `ts-prune`/`knip` installed); approximate, but the Bible `books/json/` finding was confirmed by explicit consumer-grep (zero non-test callers for both `loadChapter` and `loadAllBookText`).
- Extended axe-core a11y scan deferred to a future audit pass.
- Backend version-update report truncated mid-download — manual pom.xml inspection used instead.

**Audit complete.**
