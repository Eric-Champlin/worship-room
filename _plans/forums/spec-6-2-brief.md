# Brief: Spec 6.2 — Quick Lift

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` lines 5037-5073

**Spec ID:** `round3-phase06-spec02-quick-lift`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** M

**Risk:** Medium (master plan says Low; brief upgrades to Medium because server-authoritative timing + anti-farming architecture warrants careful test coverage)

**Prerequisites:**
- 6.1 (Prayer Receipt) → must merge first
- 5.6 (Redis Cache Foundation) ✅
- 1.5 (Auth Endpoints) ✅
- Existing activity infrastructure (ActivityService, FaithPointsService, BadgeService) ✅

**Tier:** **High** (well-understood patterns, real engineering, no brand/content curation)

**Pipeline:** This brief → `/spec-forums spec-6-2-brief.md` → `/plan-forums spec-6-2.md` → execute → review.

**Execution sequencing:** 6.2 executes AFTER 6.1 merges to master. Should NOT run concurrently with 6.1 (shares `InteractionBar.tsx` modifications). Can execute concurrently with 1.5g IF 1.5g does NOT touch frontend (which it does — `/settings/sessions` page); therefore safest sequence is 6.1 → 1.5g → 6.2 OR 6.1 → 6.2 → 1.5g. Eric picks order.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that the working tree is clean except for any pending 6.2 work. No `git add`, no `git stash`, no mutation of any kind.

---

## 2. Tier — High (not xHigh)

6.2 is **High** tier.

**Why not xHigh:**
- No brand-defining content curation (vs. 6.1's 60 verses).
- No privacy-by-construction wire-format design (vs. 6.1's friend-attribution leak risk).
- The visual surface (filling ring overlay) is signature-adjacent but not load-bearing for the WR brand identity.
- Anti-farming pattern (server-authoritative timing) is well-understood industry practice — not novel design.

**Why not Medium:**
- Server-authoritative timing has anti-abuse implications: a sloppy implementation lets users farm `quick_lift` activities and badges trivially (open 100 tabs, click Quick Lift, wait, complete all). The brief mandates careful test coverage on the anti-farming surface.
- Activity logging + points + badge unlocks all fire on completion: a bug in any of these breaks the user-visible reward system silently.
- The reduced-motion accommodation has an exploit vector (set `prefers-reduced-motion: reduce` in browser to halve the dwell?) that needs an explicit design decision.

**Practical execution implication:** High tier means CC uses Opus 4.7 thinking `xhigh` for spec-from-brief + plan; routine execute steps use `high`. Eric reviews the server-timing integration tests after execute, manually verifies the overlay UX at 3 breakpoints (mobile, tablet, desktop), and confirms the wind chime + reduced-motion accommodations work.

No HUMAN-IN-THE-LOOP content gates like 6.1's Gate-29 (verse curation) or Gate-34 (brand voice audit). The brief contains all copy strings inline (no external curation needed).

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

The primary visual surface is the QuickLiftOverlay. Verification covers:

**Overlay open/close:**
- Tap Quick Lift button on a prayer card → overlay opens, backdrop fades in, ring begins filling
- Cancel via X button → overlay closes, no activity recorded, no points awarded
- Cancel via Escape key → same as X button
- Cancel via tap-outside (on backdrop) → same as X button
- Cancel while overlay is at 95% fill → NO activity recorded (server enforces full 30s)

**Completion flow:**
- Wait 30 seconds (full duration) → ring reaches 100%, completion animation fires, wind chime sound plays, overlay shows brief "Thank you" state, activity fires, overlay closes after ~2 seconds
- Reload page mid-overlay → overlay does NOT persist (deliberate — each Quick Lift starts fresh; partial sessions are not resumable)
- Complete 10th Quick Lift → Faithful Watcher badge celebration fires (existing BadgeService unlock flow)

**Anti-farming surface:**
- Open browser dev tools → manually set system clock forward 30s → click "complete" → server rejects (its own clock didn't advance) → toast: "Couldn't complete — try again"
- Open multiple tabs, start Quick Lift on the same post in tab A and tab B → server tracks per-(user, post) sessions; only one can be active at a time per (user, post) pair
- Spam-click start button → rate limited (10 starts per minute per user via existing rate-limit infrastructure)

**Reduced-motion:**
- Set `prefers-reduced-motion: reduce` in browser → overlay opens, ring appears static (NOT smoothly filling), at 15s the ring jumps visually to 50% filled, at 30s jumps to 100%, completion fires identically. **Server still requires full 30s.** (See D-ReducedMotion.)

**Accessibility:**
- Overlay is keyboard-trapped (focus stays inside; Tab cycles through Cancel button only)
- Screen reader announces "Quick Lift in progress" on open, "Quick Lift complete" on completion, "Quick Lift cancelled" on cancel
- Ring fill is announced as a progress region with `role="progressbar"` + `aria-valuenow` updated at 25%, 50%, 75%, 100% only (not every frame — would flood screen reader)
- No countdown numbers visible (intentional — no urgency framing); `aria-label` on the ring says "Praying for [post excerpt]" not "15 seconds remaining"

### Backend (Integration tests with Testcontainers + Redis)

- Start endpoint creates a `quick_lift_session` row with server-side `started_at` (Instant.now())
- Complete endpoint within 30s rejects with 400 Bad Request, code TIMING_TOO_EARLY
- Complete endpoint at exactly 30s succeeds; activity fires; points awarded; session marked completed
- Complete endpoint with already-completed session ID rejects with 409 Conflict, code ALREADY_COMPLETED
- Complete endpoint with invalid session ID rejects with 404
- Complete endpoint with session belonging to a different user rejects with 403 (NOT 404 — don't leak existence)
- Start endpoint with existing active session for same (user, postId) rejects with 409 ACTIVE_SESSION_EXISTS (forces user to cancel or complete the existing one)
- Start endpoint rate limit (10/min/user) returns 429 after threshold
- Activity fire awards 20 points (2× intercession = 2 × 10)
- 10th completion in a user's history unlocks Faithful Watcher badge
- Server clock manipulation (start at T, complete at T+30s where server's `now()` is T+5s) rejects

### Manual verification by Eric after execute

- Three browser test: tap Quick Lift on a post you don't own; wait 30 full seconds; verify activity appears in dashboard; verify points went up by 20; verify badge celebration on 10th completion
- Reduced-motion test: enable in OS accessibility settings; verify static treatment matches D-ReducedMotion spec
- Anti-farming sanity: open dev tools, run a script that POSTs to the complete endpoint 100 times with random UUIDs — verify all return 404 (or 403); no points accrue; rate limit triggers after 10 starts per minute
- Sound: enable sound in settings, complete a Quick Lift, confirm wind chime plays at completion; disable sound, complete another, confirm silent

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub at lines 5037-5073. Plan/execute MUST honor the brief, not the stub.

**MPD-1: File paths corrected from stub.**
Stub says modify `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` and `constants/PointValues.java` and `constants/BadgeCatalog.java`. Real recon (R1) shows:
- `ActivityType.java` lives at `activity/` root (no `constants/` subfolder) — modify in place
- `PointValues.java` does NOT exist anywhere in the codebase — CREATE new at `activity/PointValues.java`
- `BadgeCatalog.java` does NOT exist anywhere — CREATE new at `activity/BadgeCatalog.java`
- Existing points-mapping lives at frontend `frontend/src/constants/dashboard/activity-points.ts` (TS map) and is dual-write parity with backend per the ActivityType.java docblock

Brief decision: Add backend `PointValues.java` and `BadgeCatalog.java` as new constants files (cleaner than scattering literals). Frontend `activity-points.ts` gets a parallel `quickLift: 20` entry per the dual-write convention.

**MPD-2: Server-authoritative timing made explicit.**
Stub mentions "Frontend timers alone are unreliable" as a parenthetical. Brief promotes this to a first-class architectural decision (D-Mechanism): introduce a `quick_lift_sessions` table, dual-endpoint pattern (start → complete), server clock as source of truth. The full design is locked down in Section 7.

**MPD-3: Risk upgraded Low → Medium.**
Stub says "Risk: Low." Brief upgrades to Medium because:
- Anti-farming surface is a real attack vector (10× trivial points multiplier if implemented wrong)
- New table + new endpoint pair + activity-firing pipeline = larger surface than "Low" implies
- Reduced-motion has an exploit vector that requires explicit design (D-ReducedMotion)

Practical impact: 25-30 tests expected (stub said "at least 12"). Brief mandates the higher count.

**MPD-4: ReducedMotion server-side enforcement (resolving stub ambiguity).**
Stub says: "`prefers-reduced-motion` shows a static circle that fills at 15 seconds." Ambiguous — does the reduced-motion user complete in 15s (half time) or do they still need 30s with a 15s visual cue?

Brief decides: **server still requires 30 seconds for everyone.** Reduced-motion is purely a UX accommodation (no continuous animation), not a points discount. The visual jumps at the 15s and 30s marks (discrete states) as a substitute for the smooth fill animation. This closes the exploit vector where a user could flip the OS setting to halve farming time. See D-ReducedMotion.

**MPD-5: Anti-farming rate limit on start endpoint.**
Stub doesn't mention. Brief mandates: 10 start requests per minute per user via existing rate-limit infrastructure (reuse pattern from Spec 1.5c ChangePasswordRateLimitConfig + existing bucket4j/Caffeine setup). Without this, a user could trivially script 100 starts/sec, wait 30s, then complete all of them = 2000 points / 30s.

**MPD-6: Wind chime mechanism deferred to plan recon.**
Stub says "Sound: quiet wind chime at completion." Doesn't specify mechanism. Brief flags as R9 (plan-recon-required): the music feature uses some pattern (Web Audio API per memory of Spec 6 round 2; or howler.js per package.json). Plan locates the established pattern, picks one of three mechanisms (Web Audio oscillator, howler one-shot, HTMLAudioElement with bundled file). See D-Sound.

**MPD-7: No countdown numbers, NO mid-progress text either.**
Stub says "No countdown numbers visible (no urgency)." Brief extends: NO numeric progress feedback at all. NO "15 seconds left." NO "halfway there!" NO percentage. The ONLY user-visible affordances during the 30s are:
- The filling ring (or static jumps in reduced-motion)
- The post excerpt being prayed for (text inside the ring or below)
- The Cancel (X) button

This maintains the "slow sanctuary" tonal commitment. Anything that creates urgency — numbers, progress percentages, countdown text — corrupts the experience.

**MPD-8: Cancel mid-session is silent, not punitive.**
Stub doesn't address cancellation UX. Brief decides: when user cancels (X / Esc / tap-outside), the overlay closes cleanly. NO toast saying "Quick Lift cancelled." NO sad shaming message. NO partial-credit. The cancellation is acknowledged via the overlay simply disappearing. The user knows they cancelled because they did the action; they don't need to be told.

**MPD-9: One active session per (user, postId) pair.**
Stub doesn't address concurrent sessions. Brief mandates: a user can have at most one active Quick Lift session per post at a time. Attempting to start a second on the same post while one is active returns 409 ACTIVE_SESSION_EXISTS. Across DIFFERENT posts, concurrency is fine (rate-limited by MPD-5). This prevents a trivial farming pattern (open 10 tabs on the same post, start all, wait, complete all).

Frontend handles 409 ACTIVE_SESSION_EXISTS gracefully: "You've already started a Quick Lift on this post — finish that one first." (No anger; just direction.)

**MPD-10: Activity fires server-side on complete endpoint, NOT via separate POST from frontend.**
Stub describes Quick Lift as "firing the `quick_lift` activity" on completion. Brief makes this explicit: the SAME server endpoint that validates the 30s timer also records the activity log, awards points, and triggers badge checks — all in a single transaction. Frontend just receives 200 OK with the activity result. NO separate POST `/api/v1/activity` call from the client. Rationale: prevents the race condition where a user could intercept the network response and reuse the session token to fire multiple activities.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R8) or flagged for plan-time recon (R9-R12).

**R1 — Activity infrastructure: VERIFIED.**
Directory `backend/src/main/java/com/worshiproom/activity/` contains:
- `ActivityType.java` (enum with 13 types: MOOD, PRAY, LISTEN, PRAYER_WALL, READING_PLAN, ..., DEVOTIONAL, INTERCESSION; each with camelCase wire format via @JsonValue/@JsonCreator)
- `ActivityService.java`, `ActivityController.java`, `ActivityLog.java`, `ActivityLogRepository.java`
- `FaithPoints.java`, `FaithPointsService.java`, `FaithPointsRepository.java`
- `BadgeService.java`, `BadgeRepository.java`, `UserBadge.java`, `UserBadgeId.java`
- `StreakService.java`, `StreakRepository.java`, etc.
- `CelebrationTier.java`, `MultiplierTier.java`, `BadgeCheckContext.java`
The pipeline for adding a new activity type is well-established. POST `/api/v1/activity` (per recon line 41 of ActivityController) handles recording, point awarding, and badge checking via ActivityService.

**R2 — ActivityType.java structure: VERIFIED.**
Lines 17-34 show the enum constants in SCREAMING_SNAKE_CASE with camelCase wire mapping. Example: `INTERCESSION("intercession")`. The docblock at line 9-11 explains the dual-format pattern. Adding QUICK_LIFT requires:
- New enum constant: `QUICK_LIFT("quickLift")`
- No other change to this file (constructor + JsonValue/JsonCreator wiring is shared)

**R3 — PointValues / BadgeCatalog files DO NOT EXIST: VERIFIED.**
`Filesystem:search_files` for `PointValues*` and `*BadgeCatalog*` across all of `backend/src/main/java/com/worshiproom/` returned zero matches. The stub's mention of these files implies CREATE, not MODIFY. Brief makes this explicit (MPD-1).

**R4 — Frontend dual-write parity: VERIFIED.**
File `frontend/src/constants/dashboard/activity-points.ts` exports:
- `ACTIVITY_POINTS` map (e.g., `intercession: 10`, `pray: 5`, `mood: 5`, `readingPlan: 15`, `meditate: 20`)
- `ACTIVITY_DISPLAY_NAMES` map ("Logged mood", "Reading Plan", etc.)
- `ACTIVITY_CHECKLIST_NAMES` map ("Log your mood", etc.)
6.2 adds `quickLift: 20` (2× intercession = 20 per D-PointMultiplier), display name "Quick Lift", checklist name "Lift someone in prayer" (or similar — plan recon picks final copy).

Type file `frontend/src/types/dashboard.ts` exports `type ActivityType = ...` union (line 21, truncated in search). Needs `'quickLift'` added. `DailyActivities` interface needs `quickLift: boolean` added.

**R5 — InteractionBar.tsx: VERIFIED.**
File `frontend/src/components/prayer-wall/InteractionBar.tsx` has a reaction-labels dictionary (line 22-28) with entries for `praying` and `encouragement` (active/inactive/floatingText fields). The component renders a row of reaction buttons. Adding Quick Lift means:
- New entry in the labels dictionary (or adopting a different mechanism if Quick Lift isn't a "reaction" but a separate button)
- New icon: Lucide `Hourglass` (per stub line 5045)
- New onClick handler that opens QuickLiftOverlay
- Plan-time recon (R10) decides whether Quick Lift visually slots into the reactions row or sits adjacent (e.g., as a fourth button after Pray + Encouragement + Bookmark)

**R6 — Activity request flow: VERIFIED.**
`ActivityController.java` line 41-44 shows `@PostMapping` with `@AuthenticationPrincipal AuthenticatedUser principal, @Valid @RequestBody ActivityRequest request`. The existing pattern is: frontend sends `{type, postId?, metadata?}`, server records to `activity_log`, awards points, checks badges. For 6.2, this endpoint is NOT called directly by Quick Lift (per MPD-10). Instead the QuickLiftCompleteController internally calls ActivityService.recordActivity(...) within its own transaction.

**R7 — BadgeService unlock mechanism: PARTIAL.**
Recon shows BadgeService exists. Plan-time recon (R11) reads its public API to determine the exact unlock-pattern: is it `badgeService.checkAndUnlock(userId, activityType)` after every activity? Is it badge-catalog-driven? The brief documents the integration requirement ("10th quick_lift unlocks Faithful Watcher") and defers mechanism to plan.

**R8 — 5.6 rate limiting pattern: VERIFIED via 6.1 recon.**
Existing bucket4j + Caffeine pattern (used by ChangePasswordRateLimitService per 1.5g recon). 6.2 mirrors this pattern in a new `QuickLiftStartRateLimitService` (10 starts/min/user). Reuses the same bucket4j configuration class structure.

**R9 — PLAN-RECON-REQUIRED: Wind chime sound mechanism.**
Plan reads:
- `frontend/src/pages/Music*` or wherever the music feature lives (memory says Web Audio API oscillators were used)
- `node_modules/howler/` presence + any howler-using component
- Existing sound-settings hook (e.g., `useSoundSettings()` if it exists)
Plan picks one of three mechanisms (Web Audio oscillator, howler one-shot, HTMLAudioElement). Recommend Web Audio oscillator with a short envelope (200-400ms attack, 1500ms decay, frequencies around C5 + G5 for a chime feel) — zero asset bytes, works offline, respects user's audio context permissions.

**R10 — PLAN-RECON-REQUIRED: InteractionBar slot placement.**
Plan reads the full InteractionBar.tsx + adjacent CSS to decide whether Quick Lift:
- (a) slots into the existing reactions row as a third reaction (alongside praying + encouragement)
- (b) becomes a separate button adjacent to but visually distinct from reactions
- (c) replaces or augments an existing layout pattern
Visual recon at 3 breakpoints (mobile, tablet, desktop) informs the decision. Plan documents in a placement-decision section.

**R11 — PLAN-RECON-REQUIRED: BadgeService unlock API.**
Plan reads `BadgeService.java`, `BadgeCheckContext.java`, `UserBadge.java` to determine:
- The exact method signature for checking + unlocking badges
- Whether badges are catalog-driven (i.e., `BadgeCatalog.java` defines criteria like `{type: COUNT_OF_ACTIVITY, activityType: QUICK_LIFT, threshold: 10, badgeId: "faithful-watcher"}`)
- The celebration UI integration (existing celebration tier mechanism per `CelebrationTier.java`)
Plan designs `BadgeCatalog.java` to express the Faithful Watcher criterion declaratively rather than hard-coding the count check.

**R12 — PLAN-RECON-REQUIRED: Overlay focus-trap + Esc handler pattern.**
Plan reads existing overlay/modal components (likely `frontend/src/components/ui/Modal*` or equivalent) to reuse the established focus-trap, Esc-handler, and backdrop-click patterns. QuickLiftOverlay should be a thin wrapper over the existing pattern, NOT a from-scratch implementation.

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies.** | New changeset for `quick_lift_sessions` table. Additive, no data migration. |
| Gate-2 (OpenAPI updates) | **Applies.** | New endpoints under `/api/v1/quick-lift/*`. |
| Gate-3 (Copy Deck) | **Applies.** | All overlay copy strings + screen reader announcements + error messages added to Copy Deck. |
| Gate-4 (Tests mandatory) | **Applies.** | 25-30 tests (brief mandates higher count than stub's "12"). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Focus trap, keyboard navigation, screen-reader announcements, `prefers-reduced-motion` accommodation. See Gate-G-A11Y below. |
| Gate-6 (Performance) | **Applies.** | Ring animation must run at 60fps on mobile (CSS transform/opacity only, no layout-triggering properties). Server timing endpoints: median <50ms, p99 <200ms. |
| Gate-7 (Rate limiting on ALL endpoints) | **Applies.** | Start endpoint: 10/min/user (MPD-5). Complete endpoint: 30/min/user (looser — user can only complete sessions they started). |
| Gate-8 (Respect existing patterns) | **Applies.** | Reuse: bucket4j rate-limit pattern, ActivityService.recordActivity, BadgeService unlock flow, existing modal/focus-trap pattern, existing sound infrastructure (R9). |
| Gate-9 (Plain text only) | **N/A.** | No user-content rendering beyond the post excerpt (which already has plain-text rendering). |
| Gate-10 (Crisis detection supersession) | **N/A.** | Not a content-creation feature. |

**New gates specific to 6.2:**

**Gate-G-SERVER-TIMING-HARD (server enforces 30s minimum dwell — HARD).**
The complete endpoint MUST verify `Instant.now().minusSeconds(30).isAfter(session.started_at)` before recording any activity. Time difference is computed using server clock only (NEVER trust a client-supplied timestamp). Integration test must cover the rejection path (complete at T+29.9s → 400 TIMING_TOO_EARLY). Tolerance for clock skew between server start and complete: zero (the same server measures both timestamps).

**Gate-G-REDUCED-MOTION (no points discount — HARD).**
A user with `prefers-reduced-motion: reduce` still requires 30 server-side seconds to earn the activity + points. The visual treatment differs (static jumps at 15s and 30s instead of continuous fill) but the underlying timer is identical. Integration test: simulate a user setting reduced-motion + completing the visual flow at 15s — server rejects with TIMING_TOO_EARLY.

**Gate-G-NO-COUNTDOWN-NUMBERS (HARD).**
No numeric progress feedback anywhere in the overlay. Code review hard-blocks any string containing digits-followed-by-"second" or "%" or "left" or "remaining" in the QuickLiftOverlay component tree. The component's only acceptable progress signals are:
- The CSS-animated ring (continuous fill on standard motion)
- Two discrete visual states (50% / 100%) on reduced-motion
- The Cancel button (always visible)
Nothing else.

**Gate-G-A11Y (accessibility — HARD).**
MUST cover:
- Focus trap on overlay open (focus stays inside; Tab cycles only Cancel button; Shift+Tab cycles back)
- Esc key closes overlay (Cancel handler)
- Backdrop click closes overlay (Cancel handler)
- `role="dialog"` + `aria-modal="true"` on overlay container
- `aria-labelledby` pointing to a visually-hidden heading ("Quick Lift in progress")
- Ring as `role="progressbar"` with `aria-valuemin=0, aria-valuemax=100, aria-valuenow={0|25|50|75|100}` (updated at discrete checkpoints only, not every frame)
- Live region announces "Quick Lift complete" at completion and "Quick Lift cancelled" at cancel
- Color contrast ratios on ring and text meet WCAG AA at all themes (light + dark)
- Axe-core test passes with zero violations

**Gate-G-NO-FARMING (anti-abuse — HARD).**
Integration tests MUST cover:
- Same-post concurrent session prevention (MPD-9): user starts session A on post X, attempts to start session B on post X while A is active → 409 ACTIVE_SESSION_EXISTS
- Start rate limit (MPD-5): 11th start within 60s window → 429
- Replay attack: user completes session A successfully, attempts to call complete on session A again → 409 ALREADY_COMPLETED
- Cross-user attack: user A starts session X, user B attempts to complete session X → 403 (NOT 404 — we know the session exists, B just doesn't own it)
- Cross-post: completing a session for a different post than what was started → should be impossible (session is tied to postId at creation), but assert it via integration test anyway

---

## 7. Decisions Catalog

The 14 design decisions baked into the brief that plan and execute must honor.

**D-Mechanism: Server-authoritative timing via start + complete endpoint pair.** (MPD-2)
Two endpoints:
- POST `/api/v1/quick-lift/start` with `{postId}` → creates a `quick_lift_sessions` row with `server_started_at = Instant.now()`; returns `{sessionId, serverStartedAt}` (serverStartedAt is informational only for frontend UI timing; the server doesn't trust the frontend's reported elapsed time)
- POST `/api/v1/quick-lift/{sessionId}/complete` → verifies `(Instant.now() - started_at) >= 30s` AND session not already completed AND session belongs to caller; on success, records activity + points + badge check in single transaction; marks session completed

Frontend uses `serverStartedAt` for visual animation timing (compute elapsed locally for the ring fill), but the server is sole source of truth for whether 30s elapsed.

**D-Schema: quick_lift_sessions table.**
```sql
CREATE TABLE quick_lift_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,                      -- NULL = active; NOT NULL = completed
  cancelled_at TIMESTAMP WITH TIME ZONE,                      -- NULL = not cancelled; NOT NULL = cancelled
  CONSTRAINT not_both_terminal CHECK (
    completed_at IS NULL OR cancelled_at IS NULL
  )
);

CREATE INDEX quick_lift_sessions_user_post_active_idx
  ON quick_lift_sessions (user_id, post_id)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;     -- partial index for active-session lookup

CREATE INDEX quick_lift_sessions_user_completed_idx
  ON quick_lift_sessions (user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;                          -- for badge count queries
```

Note on cancel: Brief decision is that an explicit cancel endpoint is NOT necessary (MPD-8 — cancel is silent). The frontend just discards the session locally. Server-side, the row remains with both completed_at and cancelled_at NULL until the cleanup job (D-Cleanup) prunes it. This is fine — a stale active session blocks new starts on the SAME post until pruned, but the next attempted start returns 409 with the existing sessionId which the frontend can then re-use (or call an explicit `/cancel` endpoint if implemented). Plan recon (R13) decides whether to add `/cancel` endpoint for cleanliness.

**D-Server30sCheck: Use Instant.now() comparison, not Duration.between with frontend-supplied time.**
The complete endpoint computes elapsed as `Instant.now().getEpochSecond() - session.started_at.getEpochSecond() >= 30`. Frontend's perception of elapsed time is irrelevant. NEVER accept a client-supplied `clientElapsedSeconds` field even as a hint.

**D-RingFill: CSS animation on SVG circle's stroke-dashoffset.**
Standard motion path: SVG `<circle>` with `stroke-dasharray = circumference` and CSS animation transitioning `stroke-dashoffset` from `circumference` to `0` over 30s. Single CSS property, GPU-accelerated, 60fps on mobile. NO JS-driven `requestAnimationFrame` loop (worse perf, drains battery).

Reduced-motion path: two discrete states. Initial: `stroke-dashoffset = circumference` (empty). At 15s: setTimeout flips state to `stroke-dashoffset = circumference / 2` (half). At 30s: setTimeout flips to `stroke-dashoffset = 0` (full). No transition; instant state changes.

**D-ReducedMotion: 30s server-side; static jumps at 15s and 30s on the frontend.** (MPD-4 / Gate-G-REDUCED-MOTION)
No points discount. Visual is the only thing that changes. The 15s mid-jump is a UX cue that progress is happening — reduced-motion users would otherwise stare at an unchanging circle for 30 seconds and wonder if anything's working.

**D-Sound: Wind chime via plan-chosen mechanism (R9).** (MPD-6)
Plan picks Web Audio oscillator, howler one-shot, or HTMLAudioElement. Recommend Web Audio oscillator: 2 notes (C5 = 523Hz, G5 = 784Hz) played in sequence with 100ms gap; envelope = 50ms attack, 1500ms decay; volume = 0.15 (quiet by default; respects sound-settings hook output).

Respects existing sound settings hook. If user has sound disabled in Settings, no sound plays. Test verifies this.

**D-Cancellation: X button + Esc + tap-outside; silent close.** (MPD-8)
Three affordances for cancel:
- X button in top-right corner of overlay (always visible)
- Esc key handler (when overlay has focus)
- Tap/click on backdrop (anywhere outside the overlay content)
All three trigger the same handler: close overlay locally, do NOT call any server endpoint, do NOT show a toast.

Server-side cleanup of abandoned sessions: see D-Cleanup.

**D-FaithfulWatcher: Badge unlocks on 10th completed quick_lift.**
Criterion: COUNT_OF_ACTIVITY where activityType = QUICK_LIFT, threshold = 10. Expressed declaratively in `BadgeCatalog.java` (plan-recon decides exact structure per R11). Existing celebration UI fires on unlock.

Badge metadata:
- id: `faithful-watcher`
- title: "Faithful Watcher"
- description: "Held space for ten others in prayer."
- icon: Lucide `Hourglass` (matches Quick Lift button icon)

**D-PointMultiplier: 20 points per completed Quick Lift (2× intercession).**
Intercession = 10 points. Quick Lift = 20. Documented in `PointValues.java` as `int QUICK_LIFT_POINTS = 20;` with javadoc explaining the 2× multiplier from intercession baseline. Mirrored in frontend `activity-points.ts` as `quickLift: 20`. Tests verify both backend and frontend match.

**D-RateLimit: 10 start requests per minute per user.** (MPD-5)
QuickLiftStartRateLimitService mirrors ChangePasswordRateLimitService pattern. Bucket: 10 tokens, refill 10/min. Exceeding returns 429 with code QUICK_LIFT_START_RATE_LIMITED. No rate limit on complete endpoint (limit by session-state instead: a user can only complete sessions they started).

Complete endpoint loose rate limit: 30/min/user (defense in depth, not primary anti-abuse).

**D-FetchPattern: Native fetch + useState/useEffect (consistent with 6.1 + 1.5g).**
Frontend `useQuickLift()` hook follows the established pattern. No React Query / SWR / Jotai. `apiFetch` from `@/lib/api-client`. Manual loading/error state.

**D-ServerTimeSource: Database NOW() for started_at; application Instant.now() for elapsed check.**
Insertion of new session uses Postgres `NOW()` via Liquibase column default — ensures atomic clock-read at the moment the row is committed (no application-server clock-skew risk).

Complete endpoint uses `Instant.now()` (application server clock) compared to the stored `started_at`. If application server is restarted/migrated between start and complete, this could in theory introduce skew — in practice, application server clocks are NTP-synced and skew is sub-second.

Brief decision: this hybrid is fine. Plan-time recon (R14) confirms NTP is configured on production servers; if not, switch both reads to DB `NOW()` (via `SELECT NOW() AS server_now` in a single query that also updates the session row).

**D-Cleanup: Scheduled job prunes abandoned sessions.**
`@Scheduled` job (cron, every 15 minutes) deletes `quick_lift_sessions` rows where:
- `completed_at IS NULL AND cancelled_at IS NULL AND started_at < now() - interval '5 minutes'`

Rationale: an abandoned session (user closed browser, refreshed, etc.) blocks new starts on the same (user, postId) pair until pruned. 5-minute TTL is generous (user's 30-second timer with a 4.5-minute grace window for slow networks / brief distractions). After 5 minutes the session is unambiguously abandoned.

**D-OverlayPersistence: NOT persisted across page reload.**
On page reload mid-Quick-Lift:
- Frontend state evaporates (component unmounts)
- Server-side session remains active until cleanup job prunes it (D-Cleanup)
- Next start on the same post returns 409 ACTIVE_SESSION_EXISTS until pruned
- Frontend handles 409: show friendly message "You started a Quick Lift on this post a moment ago. It'll be available again in a few minutes," or auto-cancel via explicit endpoint if implemented (R13)

Brief decides NOT to support resumable sessions. Adds complexity for a low-value case (how often do users reload mid-prayer?). If user feedback later shows this matters, future spec adds resume.

**D-PostExcerptInOverlay: First 80 characters of post text + ellipsis if longer.**
The overlay shows the post excerpt being prayed for (UX cue: "who am I praying for right now"). Truncated to 80 chars + ellipsis. NO author name (anonymous posts must stay anonymous; even author-of-the-post-is-praying-for-themselves should see same treatment for visual consistency). NO post metadata (timestamp, reactions count, etc.).

If post is encrypted (Spec 4.x crisis-tier?) or otherwise unviewable, overlay shows generic text: "Praying for a brother or sister."

---

## 8. Watch-fors

Organized by theme. ~30 items total.

### Security / anti-abuse
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: Server clock is sole source of truth for 30s dwell. NEVER accept client-supplied elapsed time, even as a hint.
- W3: Complete endpoint MUST verify session ownership (session.user_id == principal.userId). Cross-user attempts return 403, NEVER 404 (don't leak existence by status code differences).
- W4: Replay protection. Once a session is marked completed, subsequent complete calls return 409. Idempotency NOT desired here (we don't want to silently no-op an attacker's replay).
- W5: Rate limit on start endpoint (10/min/user). 11th start within window returns 429.
- W6: NEVER log session IDs, post IDs, or user IDs at INFO or above. Only DEBUG/TRACE. Logging at INFO would create a privacy-leaking activity timeline ("user X started Quick Lift on post Y at timestamp Z") visible in production logs.
- W7: Activity recording happens inside the same DB transaction as session completion. If activity recording fails, session completion rolls back; user gets a clear error, no half-state.

### Privacy
- W8: Quick Lift on a post does NOT create any visible signal to the post author (unlike Pray reaction, which contributes to the Prayer Receipt count). Quick Lift is a private act of intercession; the post author doesn't see who Quick-Lifted on their post. (This may evolve in a future spec; for 6.2 it's strictly private.)
- W9: Post excerpt shown in overlay is truncated server-side OR client-side (plan picks); regardless, the original post is loaded via existing post-fetch API so any field-level redaction is preserved.
- W10: Anonymous posts: overlay shows the post excerpt but NO author indicator (no avatar, no name, no "a friend"). The post's anonymity is preserved — the user prays without knowing whom.

### Performance
- W11: Ring animation runs at 60fps on mobile. Use CSS animation on stroke-dashoffset (a transformable property), not JS-driven RAF. Profile on a mid-tier Android device during plan-time recon if possible.
- W12: Server endpoints budget: median <50ms, p99 <200ms for both start and complete (excluding the wait time itself).
- W13: Cleanup job (D-Cleanup) batches deletes to avoid long table locks. Use `DELETE ... WHERE ... LIMIT 1000` in a loop until zero rows affected, NOT a single unbounded DELETE.
- W14: Active-session lookup uses the partial index (D-Schema). Verify EXPLAIN ANALYZE on the start endpoint's existence-check query uses the partial index.

### UX / brand voice
- W15: NO countdown numbers anywhere (Gate-G-NO-COUNTDOWN-NUMBERS). No "15s", no "50%", no "halfway".
- W16: Cancel is silent (MPD-8). NO toast on cancel. NO "are you sure?" confirmation.
- W17: Completion celebration is gentle. Brief flash of the ring at 100%, brief "Thank you" text, wind chime sound — then overlay closes. NOT a confetti burst, NOT an animated trophy, NOT a points-counter racing up. The reward is the quiet acknowledgment, not the dopamine hit.
- W18: "Thank you" copy at completion is the only post-completion copy. NOT "Great job!", NOT "You earned 20 points!", NOT "Faithful Watcher unlocked!". Just "Thank you." (The badge celebration, if triggered, is a SEPARATE UI flow handled by existing BadgeService unlock UX.)
- W19: The hourglass icon and the filling ring are the visual identity. NO sparkles, NO halos, NO glow effects. Quiet and reverent.

### Anti-pressure / anti-gamification
- W20: NO daily-Quick-Lift streak. NO "you've done X Quick Lifts this week" stat surfaced unless explicitly part of an existing dashboard summary (which dashboard plan-recon decides). The Quick Lift surface itself shows zero count history.
- W21: NO leaderboard or social comparison of Quick Lifts. (Future spec might add anonymized "global Quick Lifts today" stat — explicitly out of scope for 6.2.)
- W22: NO "first Quick Lift" celebratory onboarding pop-up. The Faithful Watcher badge at 10 is the only milestone celebration.
- W23: NO urgent prompts like "You haven't Quick-Lifted today!" anywhere in the app.

### Accessibility (Gate-G-A11Y items also)
- W24: Focus trap on overlay open. Focus moves to Cancel button on open; Tab cycles within overlay only.
- W25: Reduced-motion accommodation (D-ReducedMotion). 30s server requirement preserved.
- W26: Screen reader announces state transitions at 0% (open), 25%, 50%, 75%, 100% (complete). NOT every frame.
- W27: Color contrast on ring + text meets WCAG AA in both light and dark themes. Tested via axe-core.

### Test discipline
- W28: ALL anti-farming paths have explicit integration tests (Gate-G-NO-FARMING).
- W29: ReducedMotion + early-completion test (Gate-G-REDUCED-MOTION integration test) is mandatory.
- W30: Sound test: integration verifies sound plays when settings.soundEnabled=true and silent when soundEnabled=false. Use a Web Audio API mock or detect the oscillator's gain output.

### Operations
- W31: Cleanup job logs row count pruned at INFO. Surfaces metrics for Phase 12 observability.
- W32: `quick_lift_sessions` table size growth: estimate 10 rows/active-user/day average; cleanup keeps it under 1M rows even at 100K daily active users. Verify EXPLAIN ANALYZE on partial indexes shows index-only scans.

---

## 9. Test Specifications

~28 tests total. Backend integration is heaviest; frontend unit + Playwright cover the UI flow.

### Backend unit tests (~4)
- `ActivityTypeTest`: `QUICK_LIFT.wireValue()` returns `"quickLift"`.
- `ActivityTypeTest`: `ActivityType.fromWire("quickLift")` returns `QUICK_LIFT`.
- `PointValuesTest`: `QUICK_LIFT_POINTS == 20`. Sanity check that the multiplier (2× intercession) is correct.
- `BadgeCatalogTest`: Faithful Watcher entry exists with `activityType=QUICK_LIFT, threshold=10`.

### Backend integration tests — endpoints (~14)
- `POST /api/v1/quick-lift/start` with valid postId → 201 Created with `{sessionId, serverStartedAt}`; row exists in `quick_lift_sessions` with `started_at` populated and `completed_at = NULL`.
- `POST /start` without auth → 401.
- `POST /start` with non-existent postId → 404.
- `POST /start` with deleted post → 404 (referential integrity via FK ON DELETE CASCADE; or explicit check before insert).
- `POST /start` while an active session exists for same (user, postId) → 409 ACTIVE_SESSION_EXISTS.
- `POST /start` after 10 in 60s → 429 QUICK_LIFT_START_RATE_LIMITED.
- `POST /start` for a post the user owns → 201 (users CAN Quick Lift on their own posts; brief allows this).
- `POST /quick-lift/{sessionId}/complete` at T+29.9s → 400 TIMING_TOO_EARLY; session remains active (NOT marked completed or cancelled).
- `POST /complete` at T+30s exact → 200 with `{activityRecorded: true, pointsAwarded: 20, badgesUnlocked: []}`; session row updated with `completed_at` populated.
- `POST /complete` on already-completed session → 409 ALREADY_COMPLETED.
- `POST /complete` on session belonging to different user → 403 (not 404).
- `POST /complete` on non-existent sessionId → 404.
- 10th successful complete in user's history → response includes `badgesUnlocked: [{id: "faithful-watcher", title: "Faithful Watcher", ...}]`; UserBadge row exists.
- 11th successful complete → `badgesUnlocked: []` (badge only fires once).

### Backend integration tests — anti-farming (~5)
- Server clock manipulation: stub server time at T, insert session with started_at=T; stub server time at T+5s; call complete → 400 TIMING_TOO_EARLY. Verifies the server clock is the source of truth even if database clock differs.
- Concurrent complete attempts: thread A and thread B both call complete on the same sessionId at the same instant (after T+30s) → exactly ONE succeeds (200), the other gets 409 ALREADY_COMPLETED. Verifies the SQL UPDATE includes `WHERE completed_at IS NULL` to enforce atomic state transition.
- Cleanup job: insert a session with started_at = now - 10 minutes, completed_at = NULL, cancelled_at = NULL; run cleanup; assert row deleted.
- Cleanup job NOT pruning recent abandoned sessions: insert with started_at = now - 2 minutes; run cleanup; assert row NOT deleted.
- Cleanup job NOT pruning completed sessions: insert with started_at = now - 10 minutes, completed_at = now - 9 minutes; run cleanup; assert row NOT deleted (only abandoned sessions are pruned).

### Frontend unit tests (~4)
- `<QuickLiftOverlay>`: renders with `role="dialog"`, `aria-modal="true"`, contains a `role="progressbar"`.
- `<QuickLiftOverlay>`: Esc key triggers onCancel; backdrop click triggers onCancel; X button triggers onCancel.
- `<QuickLiftOverlay>`: reduced-motion preference (mocked via `matchMedia`) renders ring with `data-reduced-motion="true"`; CSS rule applies static state.
- `useQuickLift()` hook: orchestrates start → wait → complete flow; handles 409 ACTIVE_SESSION_EXISTS by showing friendly message.

### Playwright E2E (~1 scenario, but with deep coverage)
Note: 30-second wait per test makes Playwright expensive. Strategy: ONE comprehensive scenario test that exercises the full flow, plus an isolated `prefers-reduced-motion` variant.

- **Happy path scenario:** Login, navigate to /prayer-wall, find a post owned by a different user, tap Quick Lift, verify overlay opens with post excerpt, verify Cancel button visible + focused, verify NO countdown numbers anywhere in DOM, wait 30 full seconds (test timeout: 45s), verify completion animation, verify wind chime fires (network/audio context spy), verify overlay closes within 2 seconds, verify dashboard activity count incremented, verify 20-point increase, verify NO mention of points or score in the overlay copy.
- **Reduced-motion variant:** Same scenario with `page.emulateMedia({reducedMotion: 'reduce'})`; verify ring is static at start, jumps to 50% visible at 15s mark, jumps to 100% at 30s mark; verify server completion still requires 30s.

If 30s wait is too painful for CI: plan can introduce a test-only header `X-Test-Time-Override` that the start endpoint accepts to backdate `started_at` (gated behind a `@Profile("test")` Spring bean so it can never exist in prod). This is a CI-only optimization. Decide at plan time.

---

## 10. Files

### To CREATE

**Backend:**
- `backend/src/main/resources/db/changelog/YYYY-MM-DD-NNN-create-quick-lift-sessions-table.xml` — D-Schema.
- `backend/src/main/java/com/worshiproom/activity/PointValues.java` — constants holder for activity point values (per MPD-1, this is a NEW file).
- `backend/src/main/java/com/worshiproom/activity/BadgeCatalog.java` — declarative badge criteria (per MPD-1, NEW file). Faithful Watcher entry.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftController.java` — REST endpoints (start, complete).
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftService.java` — orchestrates session lifecycle.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftSession.java` — JPA entity.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftSessionRepository.java` — JPA repo with custom queries.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftCleanupJob.java` — @Scheduled cleanup of abandoned sessions.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartRequest.java` — DTO.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartResponse.java` — DTO `{sessionId, serverStartedAt}`.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftCompleteResponse.java` — DTO `{activityRecorded, pointsAwarded, badgesUnlocked}`.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartRateLimitConfig.java` — bucket4j config.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftStartRateLimitService.java` — rate limit enforcement.
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftException.java` — extends a base exception; factory methods for TIMING_TOO_EARLY / ALREADY_COMPLETED / ACTIVE_SESSION_EXISTS / FORBIDDEN / NOT_FOUND.
- Test files mirroring the above (under `backend/src/test/java/.../quicklift/`).

**Frontend:**
- `frontend/src/components/prayer-wall/QuickLiftOverlay.tsx` — the 30-second overlay component.
- `frontend/src/components/prayer-wall/__tests__/QuickLiftOverlay.test.tsx` — unit tests.
- `frontend/src/hooks/useQuickLift.ts` — orchestration hook (start → wait → complete).
- `frontend/src/hooks/__tests__/useQuickLift.test.ts` — hook tests.
- `frontend/src/lib/quickLiftSound.ts` — wind chime audio implementation (mechanism per R9 / D-Sound).
- `frontend/src/types/quickLift.ts` — type declarations.
- `frontend/tests/e2e/quick-lift.spec.ts` — Playwright suite.

### To MODIFY

**Backend:**
- `backend/src/main/java/com/worshiproom/activity/ActivityType.java` — add `QUICK_LIFT("quickLift")` enum constant.
- `backend/src/main/java/com/worshiproom/activity/ActivityService.java` — verify it handles QUICK_LIFT type (likely just works via the enum, but confirm point lookup uses PointValues).
- `backend/src/main/java/com/worshiproom/activity/BadgeService.java` — verify badge-check pipeline reads BadgeCatalog (plan-recon R11 determines exact change).
- `backend/src/main/resources/openapi.yaml` — new `/quick-lift/start` and `/quick-lift/{sessionId}/complete` endpoints.

**Frontend:**
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — add Quick Lift button + onClick → open QuickLiftOverlay. Plan-recon R10 picks placement.
- `frontend/src/types/dashboard.ts` — add `'quickLift'` to `ActivityType` union; add `quickLift: boolean` to `DailyActivities` interface.
- `frontend/src/constants/dashboard/activity-points.ts` — add `quickLift: 20` to `ACTIVITY_POINTS`; add display name + checklist name entries.

### NOT to modify (explicit non-targets)
- `ActivityController.java` — Quick Lift uses its OWN controller (MPD-10). Activity-firing happens inside QuickLiftService inside the same transaction as session completion.
- Existing prayer/reaction code (PostController, ReactionService, etc.) — Quick Lift is orthogonal to Pray reactions.
- 6.1's Prayer Receipt code — no integration with receipts; Quick Lift is private (W8).
- Settings page — no new toggle. Quick Lift is always available; users who don't want it just don't tap the button.
- Notification system — no notifications fire from Quick Lift (privacy, anti-pressure).

### To DELETE
None. 6.2 is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan):**
- A. Quick Lift button visible on every prayer card via InteractionBar modification.
- B. Tap opens the 30-second overlay.
- C. Ring fills slowly over 30 seconds (standard motion) or jumps at 15s/30s (reduced motion).
- D. No countdown numbers visible at any time (Gate-G-NO-COUNTDOWN-NUMBERS).
- E. Cancellable at any time via X / Esc / tap-outside; cancel is silent (MPD-8).
- F. Completing the 30 seconds fires `quick_lift` activity.
- G. Earns 20 points (2× intercession baseline).
- H. First 10 completions unlock Faithful Watcher badge.
- I. `prefers-reduced-motion` shows static circle that jumps at 15s and 30s; server still requires full 30s (D-ReducedMotion).
- J. Quiet wind chime plays at completion, respects sound settings.

**Security / anti-abuse (brief-mandated):**
- K. Server-authoritative timing enforced; client-side time manipulation cannot cheat completion (Gate-G-SERVER-TIMING-HARD).
- L. Rate limit on start: 10/min/user; 11th returns 429 (MPD-5).
- M. One active session per (user, postId) pair; second start returns 409 (MPD-9).
- N. Cross-user complete attempts return 403, not 404 (W3).
- O. Replay protection: completing an already-completed session returns 409 (W4).

**Accessibility:**
- P. Focus trap, keyboard navigation, screen-reader announcements (Gate-G-A11Y).
- Q. Axe-core passes with zero violations.
- R. WCAG AA color contrast on ring + text in both themes.

**Performance / operations:**
- S. Ring animation at 60fps on mobile (CSS animation only, no RAF).
- T. Server endpoints: median <50ms, p99 <200ms.
- U. Cleanup job prunes abandoned sessions (>5 minutes old, no completed/cancelled timestamp) every 15 minutes.

**Tests:**
- V. 25-30 tests total (~4 unit, ~14 endpoint integration, ~5 anti-farming integration, ~4 frontend unit, ~2 Playwright).

---

## 12. Out of Scope

Explicitly NOT in 6.2:

- **Resumable sessions across page reload.** D-OverlayPersistence: NOT supported. Future spec if user feedback shows need.
- **Visible Quick Lift signal to post author.** W8: Quick Lift is private. Future spec might add anonymized count, but NOT 6.2.
- **Daily / weekly / monthly Quick Lift streaks.** W20: NOT in 6.2.
- **Leaderboards or social comparison of Quick Lifts.** W21: NOT in 6.2.
- **Quick Lift on comments** (not just posts). The master plan stub specifies post-level only.
- **Variable-duration Quick Lifts.** Always 30 seconds. Spec 6.2b (Prayer Length Options) handles longer durations on a different surface (`/daily?tab=pray`), per master plan lines 5075+.
- **Notification on Faithful Watcher unlock.** Existing badge-celebration UI handles this; no new notification path.
- **Custom sound choices.** Wind chime is the only option. Future spec if user feedback shows want.
- **Group Quick Lift (multiple users on same post simultaneously).** Solo experience only.

---

## 13. Tier Rationale

**Why High not xHigh:** see Section 2. No content curation, no novel privacy architecture. Server-authoritative timing is well-understood industry practice.

**Why High not Medium:** anti-abuse surface is real; reduced-motion has an exploit vector; activity/points/badge pipeline integration affects user-visible rewards if buggy.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: Opus 4.7 thinking xhigh
- execute: high for routine code, xhigh on server-timing logic + anti-farming tests + reduced-motion accommodation
- review: high baseline, xhigh focus on the timing endpoints + Gate-G-NO-FARMING tests

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.2 per /Users/Eric/worship-room/_plans/forums/spec-6-2-brief.md.

Tier: High. Use Opus 4.7 thinking depth xhigh.

Honor all 10 MPDs, 14 decisions, ~32 watch-fors, ~28 tests, and 5 new gates
(Gate-G-SERVER-TIMING-HARD, Gate-G-REDUCED-MOTION, Gate-G-NO-COUNTDOWN-NUMBERS,
Gate-G-A11Y, Gate-G-NO-FARMING).

Required plan-time recon (R9-R14):
- R9: locate established sound-effect infrastructure (Music feature; Web Audio
  oscillator vs howler vs HTMLAudioElement); pick mechanism for wind chime
- R10: read InteractionBar.tsx end-to-end at 3 breakpoints; decide Quick Lift
  button placement (in-reactions vs adjacent vs new layout group)
- R11: read BadgeService.java + BadgeCheckContext.java + CelebrationTier.java;
  design BadgeCatalog.java structure for declarative criteria
- R12: locate existing overlay/modal focus-trap pattern; reuse it for
  QuickLiftOverlay (NOT a from-scratch implementation)
- R13: decide whether to add explicit POST /quick-lift/{sessionId}/cancel
  endpoint (for cleanliness) or rely solely on cleanup job for abandoned
  sessions (simpler; matches D-Cancellation silence)
- R14: confirm NTP is configured on production servers; if NOT, switch
  D-ServerTimeSource to all-DB-NOW() reads

Plan-time divergences from brief: document in a Plan-Time Divergences section
(same pattern as 6.1's plan). Justifiable divergences welcome; surface them.

Step dependency map: backend cluster (ActivityType enum, PointValues,
BadgeCatalog, Liquibase, service, controller, rate-limit, cleanup job) is
largely independent of frontend cluster (overlay, hook, sound, InteractionBar
integration). Plan can parallelize aggressively.

Do NOT plan for execution while Spec 6.1 OR 1.5g is running. The plan can be
authored at any time. Execute waits for both 6.1 and (Eric's chosen sequence)
1.5g to fully merge.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review code diff section by section.
2. Manually verify server-timing enforcement: open dev tools while Quick Lift is active, run `fetch('/api/v1/quick-lift/{sessionId}/complete', {method: 'POST', headers: {...}})` at the 5-second mark; confirm 400 TIMING_TOO_EARLY.
3. Manually verify reduced-motion: enable OS-level reduced motion (System Preferences → Accessibility → Display → Reduce Motion on macOS); verify ring is static, jumps at 15s and 30s; verify server STILL requires 30s.
4. Manually verify rate limit: spam-click the Quick Lift button across 11 different posts within 60 seconds; verify 11th returns 429 with friendly toast.
5. Manually verify anti-farming: open two tabs on same post; start Quick Lift in tab A; attempt start in tab B; verify 409 ACTIVE_SESSION_EXISTS with friendly message.
6. Manually verify wind chime: enable sound in settings, complete a Quick Lift, confirm chime plays at completion; disable sound, complete another, confirm silent.
7. Manually verify Faithful Watcher: rapidly complete 10 Quick Lifts (across different posts); verify badge celebration fires on 10th; verify 11th does NOT re-trigger.
8. Run Playwright suite (with reduced-motion variant).
9. Run axe-core a11y check on overlay; confirm zero violations.
10. Verify NO countdown numbers anywhere in the overlay DOM (grep test, document inspection).

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.2 flips ⬜ → ✅.

---

## 16. Prerequisites Confirmed

- **6.1 (Prayer Receipt):** must merge first (shares InteractionBar.tsx). Currently EXECUTING at brief-authoring time.
- **5.6 (Redis Cache Foundation):** ✅ (shipped).
- **1.5 (Auth Endpoints):** ✅.
- **Activity infrastructure** (ActivityService, FaithPointsService, BadgeService, ActivityType.java, etc.): ✅ verified via R1.
- **Existing rate-limit pattern** (bucket4j + Caffeine via 5.6 / 1.5c): ✅ verified via R8.
- **Existing modal/overlay pattern** for focus trap reuse: plan-recon-required (R12).
- **Existing sound infrastructure** for wind chime: plan-recon-required (R9).

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 OR 6.1 → 6.2 → 1.5g. Eric picks. Do NOT execute concurrently with either 6.1 (shared InteractionBar.tsx) or 1.5g (shared frontend AuthContext for the apiFetch wrapper).

After 6.1 + chosen-sequence prerequisite merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Run `/spec-forums spec-6-2-brief.md` → generates spec file
- Run `/plan-forums spec-6-2.md` → generates plan file (with R9-R14 plan-time recon)
- Eric reviews plan
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-2.md` → executes
- Eric reviews code + manual verification
- Eric commits + pushes + MRs + merges

---

## End of Brief
