# Process Lessons — Bible Redesign Wave (BB-30 through BB-46)

Captured during BB-37 (Code Health + Playwright Audit). Each lesson follows a "Pattern - What happened - Lesson for next time" structure.

---

## 1. Grep discipline after migrations (BB-33)

**Pattern:** Token migration without exhaustive verification.

**What happened:** BB-33 migrated animation tokens across the codebase. After the migration, a grep sweep was not run to verify all old tokens were replaced. Stale references to the old token names survived in files that weren't part of the initial search scope.

**Lesson:** After any rename/migration, always grep for the OLD pattern across the entire `src/` directory to catch stragglers. The migration isn't done until the old pattern returns zero matches.

---

## 2. "Verify" is not a terminal state (BB-35)

**Pattern:** Audit items parked in an ambiguous state.

**What happened:** The BB-35 accessibility audit marked some items as "verify" — meaning someone should check whether the issue was real. But "verify" is an action, not a resolution. Items left in this state had no clear owner and no clear next step, creating ambiguity about whether the work was done.

**Lesson:** Every item in an audit must reach a terminal state: **fixed**, **accepted** (with reason), **deferred** (with follow-up scope), or **deleted**. If an item needs verification, do the verification and then move it to a terminal state. Never close an audit with non-terminal items.

---

## 3. Layout exceptions need early documentation (BB-35)

**Pattern:** Standard audit rules applied to a non-standard layout.

**What happened:** The BibleReader uses a full-viewport immersive reading layout that intentionally breaks several standard page layout patterns (e.g., no max-width container, no standard page hero, custom scroll behavior). The BB-35 accessibility audit flagged these as issues because the auditor didn't know they were intentional design decisions. Time was spent investigating "issues" that were actually features.

**Lesson:** When a component or page has intentional layout exceptions, document them in the spec or design system BEFORE the audit runs. This prevents false positives and saves investigation time.

---

## 4. Measurement before and after optimization (BB-36)

**Pattern:** Performance work without baseline measurements.

**What happened:** BB-36 focused on performance optimization. The work was more effective because baseline measurements were captured before any changes, and the same measurements were repeated after. This made it possible to quantify the impact of each optimization and identify which changes actually helped versus which were neutral.

**Lesson:** Performance work requires before/after measurements, not assumptions. Always capture a baseline before optimization and compare afterward. Document both numbers so future work can reference the trajectory.

---

## 5. Living baselines for test and lint counts (BB-37)

**Pattern:** Spec baseline diverged from actual state.

**What happened:** The BB-37 spec was written when the codebase had 44 failing tests across 7 files and 21 lint problems. By the time BB-37 execution began, subsequent specs (BB-38 through BB-46) had introduced additional test breakage and lint issues — the actual state was 52 failing tests across 11 files and 26 lint problems. The spec's numbers were stale before work even started.

**Lesson:** Track the failing-test and lint-problem baselines as living numbers, not snapshots frozen in a spec. When a spec introduces known test breakage (e.g., by redesigning a component that existing tests target), update the debt tracking immediately rather than deferring it to a future cleanup spec.

---

## 6. Module-level cache invalidation in tests (BB-37)

**Pattern:** Tests passing individually but failing in suite due to shared module state.

**What happened:** During BB-37 test remediation, 24 of the 52 failing tests (Journal, JournalMilestones, JournalSearchFilter) shared a single root cause: the `journalStore` module uses an in-memory cache that persists across tests within the same file. While `localStorage.clear()` in `beforeEach` cleared the underlying storage, the module cache retained entries from previous tests, causing stale data to leak between tests.

**Lesson:** When a module uses a module-level cache over localStorage, test files MUST reset both localStorage AND the module cache in `beforeEach`. Modules that cache localStorage data should export a `_resetCacheForTesting()` function (prefixed with `_` to signal it's test-only). This pattern already existed in several stores but wasn't consistently applied across all test files.

---

## 7. Test files must track component redesigns (BB-37)

**Pattern:** Component redesigned, tests left behind.

**What happened:** The Bible redesign wave (BB-4 through BB-46) fundamentally changed the BibleReader's architecture — new context providers, new action system (URL-driven VerseActionSheet instead of inline toolbar), new note store (range-based instead of per-verse), removed features (TTS verse highlighting, AudioControlBar). The 23 BibleReader test failures all stemmed from tests that were written for the pre-redesign architecture and never updated.

**Lesson:** When a spec fundamentally redesigns a component, updating the tests should be part of the same spec — not deferred to a future cleanup. If a redesign is too large to include test updates in the same PR, create a companion spec specifically for test alignment and execute it immediately after.
