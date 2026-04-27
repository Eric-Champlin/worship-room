# Phase 2 Accessibility Notes — Cutover Smoke Test

**Status:** PLACEHOLDER — replace this file's body during the Phase 2 cutover smoke test execution. CC scaffolds the structure; Eric authors the real content.

**Cutover spec:** Spec 2.9 — Phase 2 Cutover
**Cutover date:** _____________ (Eric fills in)
**Authored by:** Eric Champlin
**Pairs with:** `_cutover-evidence/phase2-a11y-smoke.json` (axe-core JSON output)

---

## Scope (Universal Rule 17)

Phase 2 modified the `useFaithPoints.recordActivity` hook only; no new user-visible UI was added. The accessibility smoke test verifies that the routes touched indirectly by Phase 2 still scan clean — it is a regression check, not a net-new audit.

**Routes scanned:** `/`, `/daily`, `/prayer-wall`, `/bible`, `/music`.

---

## 1. axe-core automated scan

- [ ] Scan completed against the routes listed above
- [ ] Zero CRITICAL violations across all scanned routes
- [ ] JSON output committed to `_cutover-evidence/phase2-a11y-smoke.json`
- [ ] Any non-CRITICAL findings recorded as follow-up entries in `_plans/post-1.10-followups.md`

**Findings summary:** _____________ (Eric fills in: e.g., "0 CRITICAL, 0 SERIOUS — scan clean" or "0 CRITICAL, 1 SERIOUS color-contrast on /prayer-wall (existing follow-up from Phase 1)")

---

## 2. Keyboard-only walkthrough

Primary flow: open Daily Hub → tap Pray → see activity recorded indicator.

- [ ] Walkthrough completed without dead-ends
- [ ] Skip-to-main-content link reachable from page load
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicators visible at every step

**Notes:** _____________ (Eric fills in: any blocked-flow observations, focus management deviations, or "clean")

---

## 3. VoiceOver (macOS) spot-check

Target: Prayer Wall pray-button interaction.

- [ ] Spot-check completed without blocking issues
- [ ] Pray button announced with role and label
- [ ] State change after tap announced (e.g., "Praying" then "Prayed for")
- [ ] No phantom announcements or stale regions

**Notes:** _____________ (Eric fills in: any deviations or "clean")

---

## Sign-off

- [ ] All three checks completed (or explicitly deferred with tracking note in `_plans/post-1.10-followups.md`)
- [ ] Phase 2 a11y smoke evidence committed
- [ ] Cutover sign-off date: _____________
