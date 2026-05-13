# Forums Wave: Spec 6.2 — Quick Lift

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.2 (lines 5037–5073, ~37 lines of original stub).
**Source Brief:** `_plans/forums/spec-6-2-brief.md` (authored 2026-05-12, 713 lines — **brief is binding for design intent; brief wins over master plan stub where they diverge** per MPD-1 through MPD-10. This spec's Recon Reality Overrides win over the brief where the brief's recon is wrong on disk. Rules-file standards in `.claude/rules/01-ai-safety.md`, `02-security.md`, `03-backend-standards.md`, `05-database.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md` win over both brief and spec on cross-cutting conventions.)
**ID:** `round3-phase06-spec02-quick-lift`
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted. See brief § 1 / W1.)
**Date:** 2026-05-12.

---

## Affected Frontend Routes

6.2 is full-stack (frontend + backend). The user-facing surface is the QuickLiftOverlay mounted on top of any prayer-card view. `/verify-with-playwright` is **REQUIRED** after `/code-review` (brief § 3, § 9 Playwright).

- `/prayer-wall` — feed view; Quick Lift button on every `<PrayerCard>` via `<InteractionBar>`; tapping opens the QuickLiftOverlay.
- `/prayer-wall/:id` — single-post detail; same Quick Lift button on the InteractionBar.
- `/prayer-wall/dashboard` — author's dashboard; Quick Lift button visible on cards (brief allows users to Quick Lift on their own posts per Test 7).
- `/prayer-wall/user/:id` — public profile feed; same Quick Lift affordance.
- `/` (Dashboard, authenticated) — indirectly affected: completed Quick Lifts increment the user's daily activity count + faith points; the dashboard's activity checklist gains an entry. No direct UI change in this spec — the dashboard surface inherits the new `quickLift` activity automatically through the existing `activity-points.ts` map.

The QuickLiftOverlay is a transient surface (modal/dialog) and does not have its own route. It mounts in place wherever the InteractionBar sits.

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command. Eric handles git manually.

---

## Recon Reality Overrides (2026-05-12)

**This section is the gate where brief recon meets disk reality at spec authorship.** Pattern follows Spec 3.7 § Recon R1/R2/R3, Spec 5.5 § Recon Reality Overrides, Spec 5.6 § R-OVR, and Spec 6.1 § R-OVR-S1. The codebase wins on facts; the brief's design intent (D-Mechanism through D-PostExcerptInOverlay; MPD-1 through MPD-10; W1 through W32; the 5 new gates) is preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim.

### R-OVR-1 — Brief MPD-1 / R3 are WRONG: `PointValues.java` and `BadgeCatalog.java` already exist

**Brief § 4 MPD-1 says:**
> "`PointValues.java` does NOT exist anywhere in the codebase — CREATE new at `activity/PointValues.java` … `BadgeCatalog.java` does NOT exist anywhere — CREATE new at `activity/BadgeCatalog.java`"

**Brief § 5 R3 says:**
> "`Filesystem:search_files` for `PointValues*` and `*BadgeCatalog*` across all of `backend/src/main/java/com/worshiproom/` returned zero matches."

**Disk reality at spec authorship (2026-05-12):** Both files exist at `backend/src/main/java/com/worshiproom/activity/constants/`. They shipped in **Phase 2 (Activity Engine Migration)**, Specs 2.4 / 2.5 (`spec-tracker.md` rows 19–20, both ✅). The package path is `activity/constants/`, NOT `activity/`.

```
backend/src/main/java/com/worshiproom/activity/constants/
├── BadgeCatalog.java        ← ALREADY EXISTS — 173 lines, 58 badges
├── BadgeThresholds.java     ← ALREADY EXISTS — 60 lines, all numeric thresholds
├── BibleBooks.java
├── LevelThresholds.java
├── MultiplierTiers.java
└── PointValues.java         ← ALREADY EXISTS — 30 lines, 13 ActivityType→Integer entries
```

**Override disposition for files-to-modify list:**

- `backend/.../activity/constants/PointValues.java` — **MODIFY** (add `Map.entry(ActivityType.QUICK_LIFT, 20)` to the existing `Map.ofEntries(...)` block). Do NOT create a new file. Do NOT relocate to `activity/` root.
- `backend/.../activity/constants/BadgeCatalog.java` — **MODIFY** (add a new `put(m, "faithful_watcher", "Faithful Watcher", "Held space for ten others in prayer.", "prayer-wall", CelebrationTier.TOAST_CONFETTI, false, null)` line in the prayer-wall milestones block — verify exact category + tier in plan recon by examining sibling entries like `prayerwall_25_intercessions`). Do NOT create a new file.
- `backend/.../activity/constants/BadgeThresholds.java` — **MODIFY** (extend the `ACTIVITY_MILESTONES` `LinkedHashMap` with `m.put(ActivityType.QUICK_LIFT, new int[]{10})`, OR add a sibling constant `public static final int QUICK_LIFTS = 10;` — plan recon picks based on how `BadgeService` reads thresholds).

The brief's `BadgeCatalog.java` design as **declarative criteria** (e.g., `{type: COUNT_OF_ACTIVITY, activityType: QUICK_LIFT, threshold: 10, badgeId: "faithful-watcher"}`) is the **wrong shape** — the established pattern (verified) is **metadata-only catalog** in `BadgeCatalog.java` paired with **numeric thresholds** in the separate `BadgeThresholds.java`, and the eligibility logic lives inside `BadgeService.java`. Plan recon (now-required step, was R11 in brief) confirms exact shape of the threshold lookup; whatever shape it has, Quick Lift slots into the existing pattern, not a new declarative system.

**Brief design intent preserved.** The intent — "Faithful Watcher unlocks on 10 completed Quick Lifts" — is unchanged. Only the file-system shape and the catalog architecture were misdescribed.

### R-OVR-2 — `BadgeCatalog` is metadata-only; the brief's "declarative criteria" architecture does not exist and should not be invented

Per R-OVR-1, the existing `BadgeCatalog` is a `Map<String, BadgeDefinition>` keyed by badge ID, where each `BadgeDefinition` carries: `id`, `name`, `description`, `category`, `celebrationTier`, `repeatable`, `Optional<BadgeVerse>`. **No criteria.** The brief's proposal to encode `{type: COUNT_OF_ACTIVITY, activityType: QUICK_LIFT, threshold: 10}` declaratively is a redesign that 6.2 should NOT undertake — it would force a refactor of all 58 existing badges and is out of scope.

**Override disposition:** Plan recon reads `BadgeService.checkBadges(...)` and the `prayerwall_25_intercessions` precedent (also a count-of-activity badge) to confirm the established pattern is "switch on threshold constant inside `BadgeService`." Faithful Watcher follows that same pattern: a new branch in `BadgeService` that compares the user's `QUICK_LIFT` count against `BadgeThresholds.QUICK_LIFTS` (or `ACTIVITY_MILESTONES.get(QUICK_LIFT)[0]`, depending on chosen shape).

**Brief design intent preserved.** Faithful Watcher unlocks on 10 completed Quick Lifts. The integration point shifts from a hypothetical declarative catalog to the established `BadgeService` switch pattern.

### R-OVR-3 — Frontend mirror surface is broader than brief stated; `MAX_DAILY_BASE_POINTS` constant must be updated

**Brief § 5 R4 says:** Add `quickLift: 20` to `ACTIVITY_POINTS`; add display name + checklist name; add `quickLift: boolean` to `DailyActivities` interface.

**Disk reality (2026-05-12):** `frontend/src/constants/dashboard/activity-points.ts` (read in full at spec authorship) contains FOUR maps + a constants block + an `ALL_ACTIVITY_TYPES` array, all of which need updates:

1. `ACTIVITY_POINTS` map — add `quickLift: 20` (brief noted).
2. `ACTIVITY_DISPLAY_NAMES` map — add `quickLift: 'Quick Lift'` (or wording chosen by plan recon — sibling entries like `intercession: 'Interceded'` use past-tense verb form).
3. `ACTIVITY_CHECKLIST_NAMES` map — add `quickLift: 'Lift someone in prayer'` (brief suggested; confirm in plan recon).
4. `MAX_DAILY_BASE_POINTS` constant **MUST be recalculated**: currently `165 = 5+10+10+15+15+20+25+5+10+20+10+10+10`; with QUICK_LIFT adds **20**, becomes `185 = 5+10+10+15+15+20+25+5+10+20+10+10+10+20`. The accompanying `MAX_DAILY_POINTS = 330; // 165 × 2x` becomes `370 // 185 × 2x`. **Update the inline arithmetic comment too** so the math is self-documenting.
5. `ALL_ACTIVITY_TYPES: ActivityType[]` array — append `'quickLift'` (currently 13 entries, becomes 14).

Frontend `frontend/src/constants/dashboard/badges.ts` ALSO needs updates:

6. `ACTIVITY_MILESTONE_THRESHOLDS: Record<string, number[]>` — add `quickLift: [10]` (mirrors `BadgeThresholds.ACTIVITY_MILESTONES` per backend file's docblock).
7. `BADGE_DEFINITIONS` (verbatim port of `BadgeCatalog`) — add a `faithful_watcher` entry alongside the prayer-wall milestones; mirror the BadgeCatalog change from R-OVR-1.

Frontend `frontend/src/types/dashboard.ts` (line 21):

8. `type ActivityType = ...` union — append `| 'quickLift'`.
9. `interface DailyActivities { ... }` — add `quickLift?: boolean` (or `quickLift: boolean` — match the existing field optionality convention; verified at plan recon).

**Override disposition:** Plan-time files-to-modify list expands to include all 9 surfaces above. Forgetting any one of these breaks the dashboard's daily-max calculation (R-OVR-3 item 4 would silently underreport the user's progress toward the daily ceiling), the badge celebration flow (item 7 — `BadgeService` returns a badge ID the frontend can't render), or the activity-checklist UI (item 3 — Quick Lift completion would be ungated/uncategorized).

**Brief design intent preserved.** Quick Lift = 20 points = 2× intercession. Faithful Watcher unlocks at 10 completions. The points multiplier and threshold are unchanged; only the surface area of what-needs-touching expanded.

### R-OVR-4 — Brief execution sequencing is now MOOT: 6.1 ✅ AND 1.5g ✅ both shipped

**Brief § 1 says:** *"Execution sequencing: 6.2 executes AFTER 6.1 merges to master. Should NOT run concurrently with 6.1 (shares `InteractionBar.tsx` modifications). Can execute concurrently with 1.5g IF 1.5g does NOT touch frontend (which it does — `/settings/sessions` page); therefore safest sequence is 6.1 → 1.5g → 6.2 OR 6.1 → 6.2 → 1.5g. Eric picks order."*

**Disk reality at spec authorship (2026-05-12):** `_forums_master_plan/spec-tracker.md` shows 6.1 ✅ (row 79) and 1.5g ✅ (row 14). Both prerequisites are merged.

**Override disposition:** 6.2 is **unblocked for execution.** No sequencing decision required. Plan and execute can proceed immediately after this spec is ratified.

**Brief design intent preserved.** The shared-file-collision concern (W1 in spirit — Quick Lift modifies `InteractionBar.tsx` which 6.1 touched) is moot now that 6.1 has merged. Plan recon (R10) reads the post-6.1 InteractionBar.tsx state when designing the Quick Lift button placement.

### R-OVR-5 — `useFocusTrap` hook already exists; brief R12 is partially answered

**Brief § 5 R12 says:** *"PLAN-RECON-REQUIRED: Plan reads existing overlay/modal components (likely `frontend/src/components/ui/Modal*` or equivalent) to reuse the established focus-trap, Esc-handler, and backdrop-click patterns."*

**Disk reality (2026-05-12):** `frontend/src/hooks/useFocusTrap.ts` exists with signature `useFocusTrap(isActive: boolean, onEscape?: () => void)`. Per CLAUDE.md § Accessibility (BB-35): *"`useFocusTrap()` in 37 modal/dialog components."* — this is the canonical hook for modal focus-trap + Esc handling.

**Override disposition:** QuickLiftOverlay uses `useFocusTrap(isOpen, onCancel)`. Backdrop-click handling and `role="dialog"` / `aria-modal="true"` ARIA attributes remain plan-recon-required to confirm the surrounding modal-shell pattern (e.g., whether 6.1's `PrayerReceiptModal` is the closest sibling to copy from).

**Brief design intent preserved.** Gate-G-A11Y requirements (focus trap, Esc handler, backdrop click, ARIA) all remain in force; the implementation route through `useFocusTrap` is the established way to satisfy them.

### R-OVR-6 — `PrayerReceipt.tsx` from Spec 6.1 is the closest sibling pattern; InteractionBar.tsx is post-6.1 state

**Brief § 5 R5 says:** *"File `frontend/src/components/prayer-wall/InteractionBar.tsx` has a reaction-labels dictionary (line 22-28) with entries for `praying` and `encouragement`."*

**Disk reality (2026-05-12):** Spec 6.1 shipped to `forums-wave-continued`, modifying `InteractionBar.tsx` to add the prayer-receipt surface and possibly altering the reactions dictionary. The `prayer-wall/` directory now also contains `PrayerReceipt.tsx` (6.1's component). Plan recon (R10) reads the post-6.1 state of InteractionBar.tsx (NOT the pre-6.1 state described in the brief) when designing button placement.

**Override disposition:** Plan recon also examines `PrayerReceipt.tsx` and `PrayerReceiptModal` (if present) as the closest sibling for modal/overlay structure, opening/closing animation tokens, and aria patterns. QuickLiftOverlay should match the visual language 6.1 established (frosted card, sacred quietness, no celebratory bursts) per brief W17–W19.

**Brief design intent preserved.** R10 (button placement decision) is unchanged; only the file-state baseline shifts from pre-6.1 to post-6.1. R12 (modal pattern reuse) is partially answered (R-OVR-5) and partially still plan-recon (sibling shell selection).

### R-OVR Recap

| # | Brief claim | Disk reality | Disposition |
|---|-------------|--------------|-------------|
| R-OVR-1 | Create `activity/PointValues.java` and `activity/BadgeCatalog.java` | Files exist at `activity/constants/` (Phase 2 ✅) | Modify in place at `constants/`; do NOT create. Add `BadgeThresholds.java` to modify list. |
| R-OVR-2 | Design `BadgeCatalog` as declarative criteria | Catalog is metadata-only; thresholds + logic live elsewhere | Don't redesign. Slot Faithful Watcher into existing `BadgeService` switch + `BadgeThresholds` constant pattern. |
| R-OVR-3 | Add `quickLift: 20` to `ACTIVITY_POINTS` map only | 9 frontend surfaces need updates including `MAX_DAILY_BASE_POINTS` arithmetic | Expand files-to-modify list; mandatorily update the daily-max constant + comment. |
| R-OVR-4 | 6.2 must wait for 6.1 + 1.5g; pick sequence | Both ✅ shipped | Unblocked; execute immediately after plan + Eric review. |
| R-OVR-5 | Focus-trap pattern is plan-recon-required | `useFocusTrap` hook already established (BB-35, 37 callers) | Use `useFocusTrap`; only modal-shell sibling selection remains plan-recon. |
| R-OVR-6 | InteractionBar.tsx has pre-6.1 reaction dictionary | Post-6.1 state includes PrayerReceipt + possibly reaction dict changes | Plan recon reads post-6.1 file state; PrayerReceipt is closest sibling for visual language. |

---

## Metadata

- **ID:** `round3-phase06-spec02-quick-lift`
- **Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop — 6.2 is the second spec of Phase 6, sitting between 6.1 Prayer Receipt and 6.2b Prayer Length Options. 6.1 set the brand-voice and privacy-model bar; 6.2 extends the same anti-pressure / quiet-reverence vocabulary into a server-authoritative engagement gesture.)
- **Size:** M (per master plan stub; brief ratifies — Liquibase changeset + 13 new backend Java files + 7 new frontend files + 4 backend file modifications + 9 frontend file modifications + ~28 tests).
- **Risk:** Medium (brief upgrades from master plan stub's "Low" — see brief § 4 MPD-3. Server-authoritative timing has anti-abuse implications; reduced-motion has an exploit vector; activity/points/badge pipeline integration affects user-visible rewards if buggy.)
- **Tier:** **High** (per brief § 2 / § 13 — well-understood patterns, real engineering, no brand/content curation. NOT xHigh because no novel privacy architecture and no human-in-the-loop content gates. NOT Medium because anti-abuse surface is real and reduced-motion exploit vector requires explicit design.)
- **Prerequisites:**
  - **6.1 (Prayer Receipt) ✅** — shipped per `_forums_master_plan/spec-tracker.md` row 79. Was ⏳ at brief authorship; is now ✅. See R-OVR-4.
  - **5.6 (Redis Cache Foundation) ✅** — shipped per spec-tracker row 78 (used by rate-limit infrastructure; QuickLiftStartRateLimitService follows the bucket4j + Caffeine pattern established by 5.6).
  - **1.5 (Auth Endpoints) ✅** — shipped per spec-tracker row 8.
  - **1.5g (Session Invalidation) ✅** — shipped per spec-tracker row 14. Was a sequencing concern at brief authorship; is now moot. See R-OVR-4.
  - **Activity infrastructure (Phase 2 — `ActivityType.java`, `ActivityService.java`, `FaithPointsService.java`, `BadgeService.java`, `PointValues.java`, `BadgeCatalog.java`, `BadgeThresholds.java`) ✅** — all shipped in Phase 2 (Activity Engine Migration, 10/10 specs complete). Verified via brief R1 + R-OVR-1.
  - **Bucket4j + Caffeine rate-limit pattern ✅** — established in Spec 1 (`ai-proxy-foundation`) and Specs 1.5c / 1.5f (`ChangePasswordRateLimitConfig`, `LoginRateLimitFilter`). Reused for `QuickLiftStartRateLimitConfig`.
  - **`useFocusTrap` hook ✅** — established in BB-35; used in 37 modal/dialog components. See R-OVR-5.
  - **`PrayerReceipt.tsx` and 6.1 modal/overlay sibling pattern ✅** — shipped via Spec 6.1. Closest sibling for QuickLiftOverlay's visual language (frosted card, quiet reverence, no celebration bursts).

---

## Authority Hierarchy

When sources disagree, the precedence is:

1. **Rules files** (`.claude/rules/01-ai-safety.md`, `02-security.md`, `03-backend-standards.md`, `05-database.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md`, `11-local-storage-keys.md`) — cross-cutting conventions always win.
2. **Phase 3 Execution Reality Addendum** (master plan lines 380+) — authoritative on edit windows, bulk JPQL UPDATE/DELETE flags, SecurityConfig rule ordering, per-feature rate limits, domain advices, crisis service entry point, ActivityType count.
3. **Recon Reality Overrides in this spec** (R-OVR-1 through R-OVR-6 above) — authoritative for the recon facts they correct.
4. **The brief** (`_plans/forums/spec-6-2-brief.md`) — binding for design intent (D-Mechanism through D-PostExcerptInOverlay; MPD-1 through MPD-10; W1 through W32; Gate-G-* additions; tier rationale; out-of-scope list; acceptance criteria).
5. **The master plan stub** (Spec 6.2, lines 5037–5073) — overruled by the brief on every divergence (MPD-1 through MPD-10). Useful only for the original goal statement.
6. **CLAUDE.md** — cited for cross-references.

---

## Brief Ratification (key contracts)

The brief is the design-intent source. This section ratifies and lightly enriches the most load-bearing contracts; it does NOT restate the brief verbatim. Read the brief end-to-end before planning or executing.

### Ratified design decisions (D-* from brief § 7)

All 14 decisions in the brief are ratified. Key ones flagged here for cross-spec context:

- **D-Mechanism (server-authoritative timing).** Two endpoints: `POST /api/v1/quick-lift/start` returns `{sessionId, serverStartedAt}`; `POST /api/v1/quick-lift/{sessionId}/complete` validates `(Instant.now() - session.started_at) >= 30s`, owns the activity-recording transaction, returns `{activityRecorded, pointsAwarded, badgesUnlocked}`. Frontend treats `serverStartedAt` as informational only; the server is sole source of truth.
- **D-Schema (`quick_lift_sessions` table).** New table per brief § 7 schema block. Liquibase changeset filename follows `YYYY-MM-DD-NNN-create-quick-lift-sessions-table.xml` convention; pick the next available `NNN` for the spec's authoring date by checking `ls backend/src/main/resources/db/changelog/`. Two indexes: a partial index on `(user_id, post_id)` for active-session lookup, and a partial index on `(user_id, completed_at DESC)` for badge count queries. CHECK constraint `not_both_terminal` ensures a session can't be both completed AND cancelled.
- **D-RingFill (CSS animation on SVG `stroke-dashoffset`).** GPU-accelerated, 60fps on mobile. NO JS-driven `requestAnimationFrame` loop. Reduced-motion path uses two discrete state transitions at 15s and 30s.
- **D-ReducedMotion (no points discount).** Server still requires 30 seconds for everyone. Visual differs (static jumps); points + activity recording do not. See Gate-G-REDUCED-MOTION.
- **D-Sound (wind chime).** Plan-recon-required (brief R9). Recommended: Web Audio oscillator with two notes (C5=523Hz, G5=784Hz) sequenced with 100ms gap, 50ms attack / 1500ms decay envelope, gain 0.15. Respects `wr_sound_effects_enabled` localStorage flag (per CLAUDE.md sound design + `11-local-storage-keys.md`).
- **D-Cancellation (silent close).** X / Esc / tap-outside all trigger the same handler: close locally, no server call, no toast. Cleanup job (D-Cleanup) handles abandoned server-side sessions.
- **D-FaithfulWatcher.** Badge ID `faithful_watcher`. Threshold 10 completed Quick Lifts. Stored in `BadgeCatalog` + `BadgeThresholds` per R-OVR-1 / R-OVR-2.
- **D-PointMultiplier.** 20 points per completed Quick Lift = 2× intercession baseline (10 → 20). Mirrored in backend `PointValues.java` AND frontend `activity-points.ts` per dual-write parity convention. `MAX_DAILY_BASE_POINTS` constant updates per R-OVR-3 item 4.
- **D-RateLimit.** 10 starts/min/user via new `QuickLiftStartRateLimitService` mirroring `ChangePasswordRateLimitService`. Bucket4j + Caffeine, bounded per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES" rule. Rate limit configurable via `worshiproom.quicklift.start.requests-per-minute` + `worshiproom.quicklift.start.burst-capacity` in `application-{profile}.properties` — never hardcoded.
- **D-FetchPattern.** Native fetch + useState/useEffect via `apiFetch` from `@/lib/api-client`. Consistent with 6.1 and 1.5g — no React Query / SWR / Jotai.
- **D-ServerTimeSource.** DB `NOW()` for `started_at` insertion (atomic at commit); application `Instant.now()` for elapsed check. Plan recon (R14) confirms NTP on production servers; if not, switch both reads to DB clock.
- **D-Cleanup.** `@Scheduled` job, every 15 min, prunes sessions where `completed_at IS NULL AND cancelled_at IS NULL AND started_at < now() - interval '5 minutes'`. Uses batched `DELETE ... LIMIT 1000` loop per W13 to avoid long table locks.
- **D-OverlayPersistence.** NOT persisted across page reload. On reload mid-Quick-Lift, frontend state evaporates; server-side session lingers until cleanup; next start on same post returns 409 ACTIVE_SESSION_EXISTS until pruned. Frontend handles 409 with friendly copy (W brief § Copy ratified below).
- **D-PostExcerptInOverlay.** First 80 chars + ellipsis. NO author name. NO post metadata. Encrypted/redacted posts show generic fallback "Praying for a brother or sister."

### Ratified MPDs (brief § 4)

All 10 master-plan divergences ratified. Brief is binding over the master plan stub. R-OVR-1 corrects MPD-1's misstated file paths but preserves MPD-1's intent (introduce/update `PointValues.java` and `BadgeCatalog.java` to support QUICK_LIFT). MPD-3's risk upgrade (Low → Medium) is reflected in the Metadata section above.

### Ratified gates (brief § 6)

All 5 new gates are HARD:

- **Gate-G-SERVER-TIMING-HARD** — server enforces 30s minimum dwell. NEVER trust client time.
- **Gate-G-REDUCED-MOTION** — server still requires 30s for reduced-motion users. No discount.
- **Gate-G-NO-COUNTDOWN-NUMBERS** — no digits-followed-by-"second", no "%", no "left", no "remaining" in QuickLiftOverlay component tree. Code review + Playwright DOM grep both enforce.
- **Gate-G-A11Y** — focus trap (via `useFocusTrap` per R-OVR-5), keyboard nav, screen reader announcements at discrete checkpoints (0/25/50/75/100), `role="dialog"` + `aria-modal="true"` + `role="progressbar"`, axe-core zero violations, WCAG AA color contrast.
- **Gate-G-NO-FARMING** — concurrent-session prevention per (user, postId), rate limit on start, replay protection, cross-user 403, cross-post impossibility.

Plus the standard Forums Wave gates from the brief table:
- Gate-1 Liquibase ✅ applies (new changeset)
- Gate-2 OpenAPI ✅ applies (new endpoints under `/api/v1/quick-lift/*`)
- Gate-3 Copy Deck ✅ applies (overlay strings + screen reader announcements + error toasts)
- Gate-4 Tests mandatory ✅ applies (~28 tests)
- Gate-5 Accessibility ✅ applies (HARD — see Gate-G-A11Y above)
- Gate-6 Performance ✅ applies (60fps mobile; server <50ms median, <200ms p99)
- Gate-7 Rate limiting ✅ applies (10/min/user start, 30/min/user complete defense-in-depth)
- Gate-8 Respect existing patterns ✅ applies (R-OVR-1, R-OVR-5, R-OVR-6 all anchor on existing patterns; no new architecture invented)
- Gate-9 Plain text only — N/A (no user-content rendering beyond post excerpt which already has plain-text rendering)
- Gate-10 Crisis detection supersession — N/A (Quick Lift is not a content-creation feature; reading the post excerpt re-uses the existing post-fetch pipeline which already runs crisis checks server-side)

### Ratified watch-fors (brief § 8)

All 32 watch-fors W1–W32 ratified. Highlight callouts:

- **W1 (CC-no-git):** mandatory; CC NEVER runs git operations at any phase. STAY ON BRANCH section above is the operational form.
- **W2 (server clock authority):** also encoded in Gate-G-SERVER-TIMING-HARD. NEVER accept `clientElapsedSeconds` even as a hint. Reject with 400 TIMING_TOO_EARLY if `(server_now - started_at) < 30s`.
- **W3 (cross-user → 403, not 404):** don't leak existence by status-code differences. Aligns with `02-security.md` § Auth conventions.
- **W6 (no INFO-level PII logging):** session IDs, post IDs, user IDs only at DEBUG/TRACE per `07-logging-monitoring.md` § PII Handling. Aligns with the existing rule that backend logs use UUIDs over emails and never log content.
- **W7 (atomic transaction):** activity recording happens INSIDE the same DB transaction as session completion. Use `@Transactional` per `03-backend-standards.md` § Service Conventions. If activity recording fails, session completion rolls back; user gets clean error, no half-state.
- **W8 (Quick Lift is private):** no signal to post author. Author does NOT see who Quick-Lifted. Distinct from Pray reaction (which contributes to PrayerReceipt count from 6.1). Plan and execute MUST NOT add any author-visible side effect.
- **W11 (60fps mobile):** CSS-only animation on `stroke-dashoffset`. No JS RAF.
- **W13 (cleanup batched DELETE):** `DELETE ... LIMIT 1000` loop. Single unbounded DELETE risks long table locks at scale.
- **W17–W19 (quiet completion):** brief flash + "Thank you" + wind chime + close. NO confetti, NO trophy, NO points-counter racing up. Brand voice match to 6.1's PrayerReceipt quietness.
- **W20–W23 (anti-pressure):** NO Quick Lift streak, NO leaderboard, NO first-Quick-Lift onboarding pop-up, NO "you haven't Quick-Lifted today!" prompts. Aligns with CLAUDE.md § "Gentle gamification" and `01-ai-safety.md` § "Anti-pressure voice".
- **W28–W30 (test discipline):** all anti-farming paths have integration tests; ReducedMotion + early-completion test mandatory; sound test verifies opt-out behavior.
- **W31 (cleanup INFO log):** acceptable per `07-logging-monitoring.md` (rate-limit-diagnostic INFO precedent for ephemeral operational logs). Logs row count, NOT session/post/user IDs.

### Phase 3 Execution Reality Addendum applicability

| Addendum item | Applicability |
|---------------|--------------|
| Item 1 (edit windows return 409 EDIT_WINDOW_EXPIRED) | N/A — Quick Lift has no edit semantics |
| Item 3 (`@Modifying(clearAutomatically=true, flushAutomatically=true)` on bulk JPQL UPDATE/DELETE) | **APPLIES** — `QuickLiftCleanupJob` issues bulk DELETE; if implemented as JPQL `@Modifying` query in `QuickLiftSessionRepository`, MUST include both flags. Native SQL DELETE through `JdbcTemplate` is also acceptable and bypasses the rule. |
| Item 4 (SecurityConfig method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()`) | **APPLIES** — both endpoints are `.authenticated()`. Add `requestMatchers(POST, "/api/v1/quick-lift/start").authenticated()` and `requestMatchers(POST, "/api/v1/quick-lift/*/complete").authenticated()` ABOVE the permissive block. The `*/complete` nested path needs its own explicit rule per the AntPathMatcher single-segment rule. |
| Item 5 (Caffeine-bounded per-feature rate limit cache) | **APPLIES** — `QuickLiftStartRateLimitConfig` MUST use Caffeine with `maximumSize` and `expireAfterAccess` per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES". Mirror `PostsRateLimitConfig` / `ChangePasswordRateLimitConfig` shape. Configuration via `@ConfigurationProperties(prefix = "worshiproom.quicklift.start")` reading `application-{profile}.properties`. |
| Item 6 (domain advices, scoped or unscoped per filter-vs-controller distinction) | **APPLIES** — `QuickLiftException` handler should be a package-scoped `@RestControllerAdvice(basePackages = "com.worshiproom.quicklift")` advice. If rate-limit exceptions are thrown from a filter (mirroring `LoginRateLimitFilter`), the unscoped-companion-advice pattern from `03-backend-standards.md` § "Filter-raised exception gotcha" applies. |
| Item 7 (CrisisAlertService.alert(...) for user-generated content) | N/A — Quick Lift creates no new user content; the post being prayed for already has crisis detection from Phase 3 Spec 3.5. |
| Item 9 (ActivityType total count) | **APPLIES** — adding `QUICK_LIFT` brings total to **14** ActivityType values (was 13 incl. INTERCESSION per addendum). Frontend `ALL_ACTIVITY_TYPES` array length matches: 14. |

---

## Files

Authoritative against the brief § 10, with R-OVR-1 / R-OVR-3 / R-OVR-5 corrections applied.

### To CREATE — Backend (13 files + tests)

- `backend/src/main/resources/db/changelog/YYYY-MM-DD-NNN-create-quick-lift-sessions-table.xml` — D-Schema. Pick `NNN` by `ls backend/src/main/resources/db/changelog/ | tail -5` at plan time; latest as of spec authorship is `2026-05-12-003-create-jwt-blocklist-table.xml`.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftController.java` — REST endpoints under `/api/v1/quick-lift/*`. `@RestController @RequestMapping("/api/v1/quick-lift")`. Constructor injection.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftService.java` — orchestrates session lifecycle. `@Transactional` on write paths. Owns the activity-recording call to `ActivityService.recordActivity(...)` inside the complete transaction (W7).
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftSession.java` — JPA entity. UUID PK with `@GeneratedValue(strategy = GenerationType.UUID)`. Maps `started_at`, `completed_at`, `cancelled_at`. Use `@Column(insertable=false, updatable=false)` on DB-default `started_at` and the post-`save()` `entityManager.refresh(saved)` pattern from `03-backend-standards.md` § "L1-cache trap".
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftSessionRepository.java` — `JpaRepository<QuickLiftSession, UUID>`. Custom queries: `findActiveSessionByUserAndPost(UUID userId, UUID postId)` (uses partial index), bulk DELETE via `@Modifying(clearAutomatically=true, flushAutomatically=true)` for cleanup OR JdbcTemplate native SQL.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftCleanupJob.java` — `@Scheduled(cron = "0 */15 * * * *")` (every 15 min). Batched `DELETE LIMIT 1000` loop per W13. Logs pruned row count at INFO per W31.
- `backend/src/main/java/com/worshiproom/quicklift/dto/QuickLiftStartRequest.java` — `record QuickLiftStartRequest(@NotNull UUID postId) {}` with Bean Validation.
- `backend/src/main/java/com/worshiproom/quicklift/dto/QuickLiftStartResponse.java` — `record QuickLiftStartResponse(UUID sessionId, Instant serverStartedAt) {}`.
- `backend/src/main/java/com/worshiproom/quicklift/dto/QuickLiftCompleteResponse.java` — `record QuickLiftCompleteResponse(boolean activityRecorded, int pointsAwarded, List<NewBadge> badgesUnlocked) {}` (reuses existing `NewBadge` DTO from `activity/dto/`).
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartRateLimitConfig.java` — `@ConfigurationProperties(prefix = "worshiproom.quicklift.start")`. Caffeine-bounded per addendum item 5.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartRateLimitService.java` — bucket4j enforcement. Mirror `ChangePasswordRateLimitService`.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftException.java` — sealed exception hierarchy (or single class with factory methods) for `TIMING_TOO_EARLY` (400), `ALREADY_COMPLETED` (409), `ACTIVE_SESSION_EXISTS` (409), `FORBIDDEN` (403), `NOT_FOUND` (404), `QUICK_LIFT_START_RATE_LIMITED` (429).
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftExceptionHandler.java` — `@RestControllerAdvice(basePackages = "com.worshiproom.quicklift")`. Maps each exception to standard error response shape per `03-backend-standards.md` § Standard Response Shapes. Filter-raised rate-limit exceptions follow the unscoped-companion-advice pattern if needed (per addendum item 6).
- Test files mirroring above under `backend/src/test/java/com/worshiproom/quicklift/` (see Tests section).

### To CREATE — Frontend (7 files)

- `frontend/src/components/prayer-wall/QuickLiftOverlay.tsx` — the 30-second overlay. Uses `useFocusTrap(isOpen, onCancel)` per R-OVR-5. SVG ring with CSS animation on `stroke-dashoffset`. Props: `{isOpen: boolean, postId: string, postExcerpt: string, onCancel: () => void, onComplete: (response: QuickLiftCompleteResponse) => void}`.
- `frontend/src/components/prayer-wall/__tests__/QuickLiftOverlay.test.tsx` — unit tests.
- `frontend/src/hooks/useQuickLift.ts` — orchestration hook. `useQuickLift({postId})` returns `{startSession, sessionState, error}`. Calls `apiFetch` for start and complete.
- `frontend/src/hooks/__tests__/useQuickLift.test.ts` — hook tests.
- `frontend/src/lib/quickLiftSound.ts` — wind chime audio. Mechanism per R9 / D-Sound (plan recon picks; recommend Web Audio oscillator). Reads `wr_sound_effects_enabled` per `11-local-storage-keys.md`.
- `frontend/src/types/quickLift.ts` — type declarations: `QuickLiftSession`, `QuickLiftStartResponse`, `QuickLiftCompleteResponse`, error shapes.
- `frontend/tests/e2e/quick-lift.spec.ts` — Playwright suite. Per `09-design-system.md`-aligned screenshot location: `frontend/playwright-screenshots/`. Headless per memory.

### To MODIFY — Backend (4 files; corrected per R-OVR-1)

- `backend/src/main/java/com/worshiproom/activity/ActivityType.java` — add `QUICK_LIFT("quickLift")` enum constant. Update docblock count "13 activity types" → "14 activity types".
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` — add `Map.entry(ActivityType.QUICK_LIFT, 20)` to existing `Map.ofEntries(...)` block. (R-OVR-1: file already exists; do NOT create.)
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeCatalog.java` — add Faithful Watcher entry in the prayer-wall milestones block. (R-OVR-1.)
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeThresholds.java` — extend `ACTIVITY_MILESTONES` with `m.put(ActivityType.QUICK_LIFT, new int[]{10})` OR add a sibling constant; plan recon picks. (R-OVR-1.)
- `backend/src/main/java/com/worshiproom/activity/BadgeService.java` — add Faithful Watcher branch in `checkBadges(...)` mirroring the `prayerwall_25_intercessions` count-of-activity precedent (R-OVR-2).
- `backend/src/main/java/com/worshiproom/config/SecurityConfig.java` — add `requestMatchers(POST, "/api/v1/quick-lift/start").authenticated()` and `requestMatchers(POST, "/api/v1/quick-lift/*/complete").authenticated()` ABOVE the permissive block (addendum item 4). Update import list for `HttpMethod.POST`.
- `backend/src/main/resources/openapi.yaml` — add `/quick-lift/start` and `/quick-lift/{sessionId}/complete` paths with shared error response refs.
- `backend/src/main/resources/application.properties` (and per-profile properties) — add `worshiproom.quicklift.start.requests-per-minute` and `worshiproom.quicklift.start.burst-capacity` keys with profile-appropriate defaults (dev: 30/10; prod: 10/3 — plan recon ratifies).

### To MODIFY — Frontend (9 surfaces, expanded per R-OVR-3)

- `frontend/src/components/prayer-wall/InteractionBar.tsx` — add Quick Lift button with `Hourglass` Lucide icon. Plan recon (R10) picks placement (in-reactions vs. adjacent vs. new layout group). Read post-6.1 file state per R-OVR-6.
- `frontend/src/types/dashboard.ts` — append `| 'quickLift'` to `ActivityType` union (line 21); add `quickLift?: boolean` to `DailyActivities` interface (verify field optionality convention).
- `frontend/src/constants/dashboard/activity-points.ts` — five updates per R-OVR-3:
  1. `ACTIVITY_POINTS.quickLift = 20`
  2. `ACTIVITY_DISPLAY_NAMES.quickLift = 'Quick Lift'` (verify wording)
  3. `ACTIVITY_CHECKLIST_NAMES.quickLift = 'Lift someone in prayer'` (verify wording)
  4. `MAX_DAILY_BASE_POINTS = 185` (was 165) and `MAX_DAILY_POINTS = 370` (was 330); update arithmetic comment
  5. `ALL_ACTIVITY_TYPES` array — append `'quickLift'`
- `frontend/src/constants/dashboard/badges.ts` — two updates per R-OVR-3:
  6. `ACTIVITY_MILESTONE_THRESHOLDS.quickLift = [10]`
  7. `BADGE_DEFINITIONS` — add `faithful_watcher` entry mirroring backend `BadgeCatalog` change

### NOT to modify (explicit non-targets, per brief § 10)

- `ActivityController.java` — Quick Lift uses its own controller. Activity firing happens inside `QuickLiftService` (MPD-10).
- Existing prayer/reaction code (`PostController`, `PostService`, `ReactionWriteService`, etc.) — Quick Lift is orthogonal to Pray reactions (W8).
- 6.1's `PrayerReceipt.tsx` and Prayer Receipt code — no integration with receipts (W8); Quick Lift is private.
- Settings page — no new toggle. Quick Lift is always available.
- Notification system — no notifications fire from Quick Lift (privacy, anti-pressure).

### To DELETE

None. Spec 6.2 is purely additive.

---

## Tests (~28 total)

Test inventory per brief § 9, lightly enriched with the Phase 3 addendum applicability checks.

### Backend unit tests (~4)

- `ActivityTypeTest.quickLiftWireValueIsCamelCase` — `QUICK_LIFT.wireValue() == "quickLift"`.
- `ActivityTypeTest.fromWireValueQuickLift` — `ActivityType.fromWireValue("quickLift") == QUICK_LIFT`.
- `PointValuesTest.quickLiftIsTwentyPoints` — `POINTS.get(ActivityType.QUICK_LIFT) == 20`. Sanity check on the 2× intercession multiplier.
- `BadgeCatalogTest.faithfulWatcherEntryExists` — `BadgeCatalog.lookup("faithful_watcher").isPresent()` AND verifies metadata fields.

### Backend integration tests — endpoints (~14, all extend `AbstractIntegrationTest`)

- `start_validPostId_returns201WithSessionAndStartedAt` — row exists in `quick_lift_sessions` with `started_at` populated and `completed_at = NULL`.
- `start_unauthenticated_returns401`.
- `start_nonExistentPost_returns404`.
- `start_deletedPost_returns404` (referential integrity via FK ON DELETE CASCADE OR explicit pre-insert check).
- `start_activeSessionExistsForSameUserAndPost_returns409ActiveSessionExists`.
- `start_eleventhRequestInOneMinute_returns429QuickLiftStartRateLimited` — bucket4j rate limit enforcement.
- `start_userOwnsThePost_returns201` — users CAN Quick Lift on their own posts (brief § 9 endpoint test 7).
- `complete_atTwentyNineSeconds_returns400TimingTooEarly` — session remains active (NOT marked completed or cancelled).
- `complete_atThirtySecondsExact_returns200WithActivityRecorded` — response `{activityRecorded: true, pointsAwarded: 20, badgesUnlocked: []}`; session row `completed_at` populated; activity_log row exists; faith_points row updated.
- `complete_alreadyCompletedSession_returns409AlreadyCompleted`.
- `complete_sessionBelongingToDifferentUser_returns403NotFour04` — 403 explicitly, NOT 404 (W3).
- `complete_nonExistentSessionId_returns404`.
- `complete_tenthCompletionInUserHistory_returnsBadgesUnlockedFaithfulWatcher` — response includes `badgesUnlocked: [{id: "faithful_watcher", ...}]`; user_badges row exists.
- `complete_eleventhCompletion_returnsBadgesUnlockedEmpty` — Faithful Watcher only fires once (existing `BadgeService` repeatable=false semantics).

### Backend integration tests — anti-farming (~5, Gate-G-NO-FARMING)

- `complete_serverClockManipulation_rejects` — stub server clock; insert session at T; advance to T+5s; complete returns 400 TIMING_TOO_EARLY. Verifies server clock authority over any synthetic time source.
- `complete_concurrentAttempts_exactlyOneSucceeds` — thread A and thread B call complete simultaneously after T+30s; exactly ONE returns 200, the other returns 409 ALREADY_COMPLETED. Verifies SQL UPDATE includes `WHERE completed_at IS NULL` for atomic state transition.
- `cleanup_abandonedSessionOlderThanFiveMinutes_isPruned`.
- `cleanup_recentAbandonedSessionUnderFiveMinutes_isNotPruned`.
- `cleanup_completedSession_isNotPruned` — only sessions with `completed_at IS NULL AND cancelled_at IS NULL` qualify.

### Frontend unit tests (~4)

- `QuickLiftOverlay_renderingAttributes` — `role="dialog"`, `aria-modal="true"`, contains `role="progressbar"`.
- `QuickLiftOverlay_cancelHandlers` — Esc key, backdrop click, X button all trigger `onCancel`.
- `QuickLiftOverlay_reducedMotionAttribute` — mocked `matchMedia('(prefers-reduced-motion: reduce)')` returns true → ring renders with `data-reduced-motion="true"`; CSS rule applies static state.
- `useQuickLift_409ActiveSessionExists_showsFriendlyMessage` — hook handles 409 by surfacing copy "You've already started a Quick Lift on this post — finish that one first."

### Playwright E2E (~2 scenarios)

- **Happy path:** Login, navigate to `/prayer-wall`, find post owned by different user, tap Quick Lift, verify overlay opens with post excerpt, verify Cancel button visible + focused, verify NO countdown numbers anywhere in DOM (digits-followed-by-"second" / "%" / "left" / "remaining" all return zero matches), wait 30 full seconds (test timeout 45s), verify completion animation, verify wind chime fires (audio context spy), verify overlay closes within 2 seconds, verify dashboard activity count incremented, verify 20-point increase, verify NO mention of points/score in overlay copy.
- **Reduced-motion variant:** Same as above with `page.emulateMedia({reducedMotion: 'reduce'})`. Verify ring is static at start, jumps to 50% at 15s mark, jumps to 100% at 30s mark; verify server completion still requires 30s.

If 30s wait is too painful for CI: plan can introduce a test-only header `X-Test-Time-Override` accepted by the start endpoint (gated behind `@Profile("test")` Spring bean — can never exist in prod). CI-only optimization. Plan-time decision (R-CI).

### Drift detection (Decision 12)

Backend `PointValuesTest.quickLiftPointsMatchFrontend` — drift-detection test reads `frontend/src/constants/dashboard/activity-points.ts` (or the shared fixture file `_test_fixtures/activity-engine-scenarios.json` if one already covers QUICK_LIFT) and asserts `POINTS.get(QUICK_LIFT) == ACTIVITY_POINTS.quickLift`. Same shape as existing intercession drift-detection.

---

## Acceptance Criteria

Verbatim from brief § 11; ratified.

**Functional:**
- [ ] **A.** Quick Lift button visible on every prayer card via InteractionBar modification.
- [ ] **B.** Tap opens the 30-second overlay.
- [ ] **C.** Ring fills slowly over 30 seconds (standard motion) or jumps at 15s/30s (reduced motion).
- [ ] **D.** No countdown numbers visible at any time (Gate-G-NO-COUNTDOWN-NUMBERS).
- [ ] **E.** Cancellable at any time via X / Esc / tap-outside; cancel is silent (MPD-8).
- [ ] **F.** Completing the 30 seconds fires `quick_lift` activity.
- [ ] **G.** Earns 20 points (2× intercession baseline).
- [ ] **H.** First 10 completions unlock Faithful Watcher badge.
- [ ] **I.** `prefers-reduced-motion` shows static circle that jumps at 15s and 30s; server still requires full 30s (D-ReducedMotion).
- [ ] **J.** Quiet wind chime plays at completion, respects `wr_sound_effects_enabled`.

**Security / anti-abuse:**
- [ ] **K.** Server-authoritative timing enforced; client-side time manipulation cannot cheat completion (Gate-G-SERVER-TIMING-HARD).
- [ ] **L.** Rate limit on start: 10/min/user; 11th returns 429 (MPD-5).
- [ ] **M.** One active session per (user, postId) pair; second start returns 409 (MPD-9).
- [ ] **N.** Cross-user complete attempts return 403, NOT 404 (W3).
- [ ] **O.** Replay protection: completing an already-completed session returns 409 (W4).

**Accessibility:**
- [ ] **P.** Focus trap (via `useFocusTrap`), keyboard navigation, screen-reader announcements (Gate-G-A11Y).
- [ ] **Q.** axe-core passes with zero violations.
- [ ] **R.** WCAG AA color contrast on ring + text in both themes (currently dark only per CLAUDE.md; light mode deferred to Phase 4).

**Performance / operations:**
- [ ] **S.** Ring animation at 60fps on mobile (CSS animation only, no RAF).
- [ ] **T.** Server endpoints: median <50ms, p99 <200ms.
- [ ] **U.** Cleanup job prunes abandoned sessions (>5 minutes old, no completed/cancelled timestamp) every 15 minutes.

**Tests:**
- [ ] **V.** ~28 tests total (~4 backend unit, ~14 backend endpoint integration, ~5 backend anti-farming integration, ~4 frontend unit, ~2 Playwright). May exceed; brief § 9 mandates 25-30.

**Recon override compliance (THIS spec's additions):**
- [ ] **W.** `PointValues.java`, `BadgeCatalog.java`, `BadgeThresholds.java` MODIFIED in place (R-OVR-1); no duplicate file created.
- [ ] **X.** `MAX_DAILY_BASE_POINTS` updated to 185 with arithmetic comment recalculated (R-OVR-3 item 4).
- [ ] **Y.** `ALL_ACTIVITY_TYPES` array length is 14 (R-OVR-3 item 5).
- [ ] **Z.** `SecurityConfig.java` method-specific rules added ABOVE `OPTIONAL_AUTH_PATTERNS.permitAll()` (Phase 3 Execution Reality Addendum item 4); nested `*/complete` path has its own explicit rule.
- [ ] **AA.** `QuickLiftStartRateLimitConfig` uses Caffeine-bounded cache per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES"; rate-limit values come from `application-{profile}.properties`, not hardcoded.

---

## Out of Scope

Verbatim from brief § 12; ratified.

- **Resumable sessions across page reload.** D-OverlayPersistence: NOT supported. Future spec if user feedback shows need.
- **Visible Quick Lift signal to post author.** W8: Quick Lift is private. Future spec might add anonymized count, but NOT 6.2.
- **Daily / weekly / monthly Quick Lift streaks.** W20.
- **Leaderboards or social comparison of Quick Lifts.** W21.
- **Quick Lift on comments** (post-level only per master plan).
- **Variable-duration Quick Lifts.** Always 30 seconds. Spec 6.2b (Prayer Length Options) handles longer durations on a different surface.
- **Notification on Faithful Watcher unlock.** Existing badge-celebration UI handles this; no new notification path.
- **Custom sound choices.** Wind chime only. Future spec if user feedback requests.
- **Group Quick Lift (multiple users on same post simultaneously).** Solo experience only.

---

## Plan-time Recon Required (R9–R14, R-CI)

Per brief § 14 / § 5 PLAN-RECON-REQUIRED block:

- **R9 — Wind chime sound mechanism.** Locate established sound-effect infrastructure (Music feature; Web Audio oscillator vs. howler vs. HTMLAudioElement). Pick mechanism. Recommend Web Audio oscillator per D-Sound.
- **R10 — InteractionBar slot placement.** Read POST-6.1 InteractionBar.tsx end-to-end at 3 breakpoints (mobile / tablet / desktop). Decide: in-reactions row vs. adjacent button vs. new layout group.
- **R11 — `BadgeService` unlock API.** Read `BadgeService.java`, `BadgeCheckContext.java`, `CelebrationTier.java`, AND the `prayerwall_25_intercessions` precedent (sibling count-of-activity badge). Confirm shape for adding Faithful Watcher branch (R-OVR-2 narrows but doesn't fully resolve).
- **R12 — Overlay focus-trap + Esc handler pattern.** Partially answered by R-OVR-5 (`useFocusTrap` hook). Plan still needs to read `PrayerReceiptModal` (6.1) or `Modal*` components to identify the closest sibling for the modal SHELL pattern (`role="dialog"`, ARIA, backdrop, animation tokens, frosted-card surface).
- **R13 — Explicit `/cancel` endpoint vs. cleanup-job-only.** Brief defers. Plan decides whether to add `POST /api/v1/quick-lift/{sessionId}/cancel` for cleanliness or rely solely on the cleanup job + 5-minute TTL. Trade-off: explicit endpoint frees up the `(user, postId)` slot immediately on user cancel; cleanup-job-only forces a 5-minute wait for new starts on the same post. Recommend explicit endpoint — better UX for users who cancel and immediately want to retry.
- **R14 — NTP confirmation on prod servers.** Confirm Railway / production hosting has NTP-synced clocks. If not, switch D-ServerTimeSource to all-DB-NOW() reads for both insertion AND elapsed check. Likely a no-op (Railway runs containers with synced host clocks) but verify before assuming.
- **R-CI — 30s wait optimization in Playwright.** Decide whether to add `X-Test-Time-Override` header (gated `@Profile("test")` Spring bean) for CI cycle time. Trade-off: real wait gives better confidence; override speeds CI by ~2 minutes per scenario. Recommend implementing the override; keep one wall-clock test in a nightly suite for additional coverage.

---

## Out-of-Band Notes for Eric

1. **R-OVR-1 / R-OVR-3 are the load-bearing recon corrections.** Without them, the plan would create duplicate Java files at the wrong path AND silently leave `MAX_DAILY_BASE_POINTS` stale. The drift-detection test would fail on first run. Both are caught by THIS spec at recon time, before plan/execute touches the code.
2. **6.1 and 1.5g are both shipped** (R-OVR-4) — the brief's sequencing concern is moot. Execution can start immediately after `/plan-forums` finishes and you ratify the plan.
3. **The brief's BadgeCatalog redesign (declarative criteria) is wrong-shaped** for the existing codebase. R-OVR-2 narrows the work to the established `BadgeService` + `BadgeThresholds` pattern. If you DO want the declarative redesign as a later refactor, scope it as a Phase 10 or post-Forums-Wave spec — it would touch all 58 badges and deserves its own spec.
4. **The 30-second Playwright wait** (Test V) is the largest CI-cost surface. R-CI's `X-Test-Time-Override` proposal can mitigate it cleanly via a `@Profile("test")` bean. Decide at plan time.
5. **No new copy gates or human-in-the-loop content curation** (unlike 6.1's Gate-29 verse curation). All copy strings are inline in the brief; no Eric-curated content is needed before execute.
6. **`MAX_DAILY_BASE_POINTS` change has user-visible downstream effects.** The dashboard's "you've earned X of Y possible points today" display will shift from `... of 165` → `... of 185` (or `... of 330` → `... of 370` in the multiplier-tier extreme). Brief check: any user who hits exactly 165 points today loses their "perfect day" framing once 6.2 ships. Acceptable given the bigger ceiling, but worth flagging for QA awareness.

---

## See Also

- Brief: `_plans/forums/spec-6-2-brief.md` (binding for design intent)
- Master plan stub: `_forums_master_plan/round3-master-plan.md` lines 5037–5073 (overruled by brief on every divergence)
- Spec 6.1 (prerequisite, ✅): `_specs/forums/spec-6-1.md` (closest sibling for visual language + InteractionBar context)
- Spec 3.7 (recon-override pattern reference): `_specs/forums/spec-3-7.md`
- Phase 3 Execution Reality Addendum: `_forums_master_plan/round3-master-plan.md` lines 380+ (items 3, 4, 5, 6, 9 apply per § "Phase 3 Execution Reality Addendum applicability" above)
- Activity engine code: `backend/src/main/java/com/worshiproom/activity/` (verified via R1, R-OVR-1)
- Frontend dual-write surfaces: `frontend/src/constants/dashboard/{activity-points,badges}.ts`, `frontend/src/types/dashboard.ts` (R-OVR-3)
- Rules: `01-ai-safety.md` (anti-pressure voice), `02-security.md` (rate limiting + Caffeine-bounded caches + XFF + auth), `03-backend-standards.md` (SecurityConfig ordering + L1-cache trap + scoped advices), `05-database.md` (Liquibase conventions), `06-testing.md` (Testcontainers pattern + drift detection), `07-logging-monitoring.md` (PII handling + cleanup-log INFO precedent), `09-design-system.md` (animation tokens, frosted card)
