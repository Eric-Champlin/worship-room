# Phase 5 Cutover Checklist (Prayer Wall Visual Migration)

**Spec 5.5 deliverable** — produced 2026-05-11.

## Phase 5 Spec Inventory

| Spec | Status | Tracker row | Notes |
| --- | --- | --- | --- |
| 5.0 — Architecture Context Refresh | ✅ closed | — | Closed without ceremony |
| 5.1 — FrostedCard Migration | ✅ shipped | 73 | |
| 5.2 — BackgroundCanvas at Prayer Wall Root | ✅ shipped via Spec 14 Step 6 | 74 | |
| 5.3 — 2-Line Heading Treatment | ✅ closed as no-op | 75 | PrayerWallHero shipped via Spec 14; PrayerWallDashboard has no qualifying section headers |
| 5.4 — Animation Token Migration | ✅ shipped | 76 | |
| 5.5 — Deprecated Pattern Purge and Visual Audit | ⬜ pending | 77 | THIS spec; row flips ✅ post-merge + manual audit |
| 5.6 — Redis Cache Foundation | ⬜ open | 78 | Backend spec; ships at Phase 5 end whenever Eric is ready. Does NOT gate Phase 5 visual closure. |

## Phase 5 Visual Closure Gates

- [ ] 5.5 merges to `forums-wave-continued`.
- [ ] Eric completes manual side-by-side audit (`/daily` vs each Prayer Wall route at 1440px and 375px).
- [ ] Manual audit confirms "Prayer Wall feels like Daily Hub" per D13.
- [ ] Eric flips `_forums_master_plan/spec-tracker.md` row 77 from ⬜ to ✅.

## Notes

- This checklist is a Phase 5 visual scope closure document — NOT a dual-write cutover. Phase 5 has no feature-flag flip.
- Spec 5.6 (Redis) ships independently and does not block this checklist.
- Universal Rule 17's "per-phase accessibility smoke evidence" applies to dual-write cutover specs (Phase 1.10, 2, 2.5, 3); Phase 5 is a visual migration phase, not a dual-write phase, so Rule 17 does not produce a separate `_cutover-evidence/phase05-a11y-smoke.json` artifact. The `/verify-with-playwright` report (Step 9) serves as the equivalent evidence for Phase 5.
