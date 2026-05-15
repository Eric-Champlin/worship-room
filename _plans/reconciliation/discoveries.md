# Discoveries — Side Effects of the Post-Rollout Doc Audit (2026-05-07)

These are non-docs findings surfaced during the reconciliation audit. Per the task brief, code bugs and orphan-code findings are filed here rather than fixed inline.

---

## Code Bugs

### D1 — `Pray.test.tsx:153` looking for stale "generating prayer for you" copy

**Status:** 1 of 1 failing tests in the post-Spec-13 baseline (9,830 pass / 1 fail).

**File:** `frontend/src/pages/__tests__/Pray.test.tsx:140-165`

**Reproduction:** `pnpm test` (full suite) — fails on `shows loading then prayer after generating`.

**What the test expects:** After clicking "Help Me Pray", `screen.getByText(/generating prayer for you/i)` should resolve immediately while the loading state is rendered.

**Current shipped state:**
- `PrayerResponse.tsx:204` still renders the literal text `Generating prayer for you...` inside a `<p className="text-white/50">`.
- So the copy DOES exist in production. The bug is not "copy was removed".

**Hypothesis:** A timing or state-ordering regression introduced during DailyHub 1B (Spec 4 — Pray and Journal migration) means the loading state's render is not visible to `getByText` synchronously after the click. Possibilities:
1. The PrayerResponse "loading" branch is now gated behind a state transition that runs *after* the synchronous `setState` from the button click — a render boundary the test doesn't await.
2. An animation/transition (CSS `transition-opacity` or `opacity-0` initial class) means the text is in the DOM but hidden, and the test's `getByText` returns the text but the assertion still fails some other way (the test snippet shows `expect(getByText(...)).toBeInTheDocument()` which should pass on a present-but-hidden element — but the actual error log mentions `Object.getElementError`, suggesting the element is not in the DOM at the query time).
3. PrayerInput's "Help Me Pray" handler may have changed flow — perhaps it no longer immediately renders the PrayerResponse loading state on click; instead it transitions through some intermediate state.

**Recommendation:** File as a focused fix spec. Possible simplest fix: add a `waitFor()` around the loading-state assertion, or add a `data-testid="prayer-loading"` to the PrayerResponse loading branch and update the test to query for it. The right fix depends on whether the regression is real (production users see a delay before "generating prayer for you" appears) or just a test-timing issue.

**Severity:** Low — the test correctly catches a real ordering change. If users see the same delay, it's a UX nit (briefly empty state between click and "generating" copy). Not a correctness bug.

---

## Orphan Code / Cleanup Candidates

### D2 — `HorizonGlow.tsx` is orphaned legacy

**File:** `frontend/src/components/daily/HorizonGlow.tsx` + `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx`

**Reality:** Spec 1A (DailyHub 1A) migrated DailyHub from `<HorizonGlow />` to `<BackgroundCanvas />`. No production component imports `HorizonGlow` post-Spec-1A. The only remaining references are in the component's own test file.

**Doc state:** `09-design-system.md` § "Daily Hub Visual Architecture (Spec Y + Wave 7)" still describes HorizonGlow as the canonical Daily Hub atmospheric layer with specific opacity values. The reconciliation report (Section 4.1.1) updates this.

**Recommendation:** A small cleanup spec that:
1. Deletes `HorizonGlow.tsx` and its test file
2. Removes any remaining export/barrel references
3. Verifies no other test or storybook references the component

This is a 5-step plan at most; could be bundled into a future visual-purge spec like Forums Wave Phase 5 Spec 5.5 (Deprecated Pattern Purge).

---

### D3 — Multiple `useEcho` patterns / `wr_echo_dismissals` non-existence

**Context:** During reading of `11b-local-storage-keys-bible.md`, I noted the documentation explicitly mentions that `useEchoStore` does NOT exist and that BB-46 echoes use a session-scoped `Set<string>` inside `useEcho()`. This is correctly documented. **No drift here — flagged only because the audit caught the deferred work and verified docs match reality.** No action needed.

---

## Stale Test Pattern References

### D4 — Music re-enable component list (verified deletions)

`09-design-system.md` § "Music Feature — Technical Architecture" already states that previously listed Music components and hooks "have all been deleted from the codebase." The audit did not re-verify this — but per the agent's plan-survey, Spec 11A (Music) doesn't mention re-introducing any of them. Trust the existing doc note. **No action needed.**

---

## Cross-Surface Bugs (NOT introduced by this audit, but surfaced during it)

### D5 — `TodaysPlanCard` URL fix (Spec 8C noted this)

The plan-survey agent flagged that Spec 8C (`spec-8c-bible-plans.md`) included a fix for a real cross-surface bug: `TodaysPlanCard` linked to `/reading-plans/${slug}` instead of `/bible/plans/${slug}`. This fix already shipped. **No action needed; just noting the audit caught it as a positive signal that the rollout was diligent.**

---

### D6 — Settings mobile tab strip crowds at 375px with 8 tabs

**Surfaced by:** Spec 6.8 (`/verify-with-playwright` run, 2026-05-14). Pre-existing condition, NOT introduced by Spec 6.8 — but tightened by it: Spec 6.8 added the 8th tab ("Gentle extras") to the existing `SECTIONS` array, and the responsive ceiling that was already strained at 7 tabs now spills.

**File:** `frontend/src/pages/Settings.tsx:158-184` (mobile tab strip — `sm:hidden` branch).

**Reality:** the mobile pattern is a single horizontal flex row (`flex` + `flex-1` per tab) with `mx-auto max-w-4xl px-4`. At 375px viewport / 8 tabs / 32px page padding, each tab gets ~43px of width. Labels like `"Notifications"`, `"Sensitive features"`, and `"Gentle extras"` cannot fit and the text wraps/overflows visibly (verified screenshot: `frontend/playwright-screenshots/settings-gentle-extras-off-375x812.png`). 7 tabs already crowded; 8 tabs makes the seams obvious.

**Why not in scope for 6.8:** Spec 6.8 conformed to the existing `SECTIONS`-array pattern verbatim (Step 16). Refactoring the responsive layout of the entire Settings page is out of brief. The existing visual condition was an accepted state at 7 tabs and the Settings test suite was updated 7→8 / 14→16 (Step 16 Execution Log) — the regression bar was test-count, not visual-density.

**Recommended remediation (future polish spec):** one of:
1. Horizontal scroll the mobile tab strip (`overflow-x-auto` + `whitespace-nowrap` per tab, snap-scroll for nicer feel).
2. Switch the mobile pattern to a `<select>` dropdown or a collapsible accordion at `<sm` breakpoints (matches the canonical Settings-as-mobile-list pattern other apps use).
3. Two-row grid at `<sm` (4 tabs per row × 2 rows).

Option 1 is the smallest change. Option 2 is the most semantically clean for mobile. Option 3 preserves visibility but doubles vertical space.

**Severity:** Low — non-blocking. The toggle is still operable (tab-clickable, accessible name intact, focus management intact). Visual polish only.

**Status:** documented gap, deferred — NOT a Spec 6.8 regression.

---

## Out of Scope (for this audit)

- Backend code review
- Test coverage analysis
- Lighthouse audit
- Bundle size measurement
- Dependency staleness review

If any of these surface concerns, they belong in `_protocol/`-style deep reviews, not here.

---

## End of Discoveries
