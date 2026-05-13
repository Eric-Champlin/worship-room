# Forums Wave: Spec 6.2b — Prayer Length Options

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.2b (lines 5075–5166, ~92 lines of original stub).
**Source Brief:** `_plans/forums/spec-6-2b-brief.md` (authored 2026-05-12, 711 lines — **brief is binding for design intent; brief wins over master plan stub where they diverge** per MPD-1 through MPD-10. This spec's Recon Reality Overrides win over the brief where the brief's recon is wrong on disk. Rules-file standards in `.claude/rules/01-ai-safety.md`, `02-security.md`, `03-backend-standards.md`, `04-frontend-standards.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md`, `11-local-storage-keys.md` win over both brief and spec on cross-cutting conventions.)
**ID:** `round3-phase06-spec02b-prayer-length-options`
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted. See brief § 1 / W1.)
**Date:** 2026-05-12.

---

## Affected Frontend Routes

6.2b is **frontend-only** (zero backend changes per master plan stub line 5119 + brief Section 3). The user-facing surface is the existing Daily Hub Pray tab plus a new full-screen `PraySession` view layered on top of it. `/verify-with-playwright` is **REQUIRED** after `/code-review` (brief § 3 Playwright, § 9 Test Specifications).

- `/daily?tab=pray` — existing Pray tab; new `<PrayLengthPicker />` section ("Start a timed session") renders above or below existing PrayTabContent content (plan recon picks placement per brief § 10 MODIFY).
- `/daily?tab=pray&length=1` — deep link directly into a 1-minute session (picker bypassed; PraySession mounts immediately).
- `/daily?tab=pray&length=5` — deep link directly into a 5-minute session.
- `/daily?tab=pray&length=10` — deep link directly into a 10-minute session.
- `/daily?tab=pray&length=invalid` (and any other non-`{1,5,10}` value) — picker visible, no session started, NO error toast (MPD-6 / Gate-G-DEEP-LINK-GRACEFUL).
- `/daily?tab=pray&length=5&tab=journal` — `length` param ignored (only honored when `tab=pray`; brief § 3 Visual Verification "Deep-link variants").

The `PraySession` full-screen view is a **transient surface** (component mount, not a route) and lives in place atop the Daily Hub. It does NOT have its own URL path — the `?length=` query param drives both the picker-bypass and the session lifecycle. On natural completion OR early exit, the user redirects back to `/daily?tab=pray` (no length param) per D-AmenScreen.

Indirectly affected:

- `/` (Dashboard, authenticated) — completed sessions increment the user's daily activity count + faith points; the dashboard's activity checklist gains an entry. No direct UI change in this spec — the dashboard surface inherits the new `pray` activity completion automatically through the existing `useFaithPoints.recordActivity('pray', sourceFeature)` flow. (Note: 6.2b reuses the existing `'pray'` `ActivityType`, NOT a new type — see R-OVR-3 below.)

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command. Eric handles git manually.

---

## Recon Reality Overrides (2026-05-12)

**This section is the gate where brief recon meets disk reality at spec authorship.** Pattern follows Spec 3.7 § Recon R1/R2/R3, Spec 5.5 § Recon Reality Overrides, Spec 5.6 § R-OVR, Spec 6.1 § R-OVR-S1, and Spec 6.2 § R-OVR. The codebase wins on facts; the brief's design intent (D-Mechanism through D-PromptArrayLocation; MPD-1 through MPD-10; W1 through W25; the 4 new gates: G-PROMPT-COPY, G-A11Y, G-ANTI-PRESSURE, G-DEEP-LINK-GRACEFUL) is preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim.

### R-OVR-1 — `useFaithPoints.recordActivity` does NOT forward arbitrary metadata to the backend today (brief MPD-4 / D-FetchPattern assumption is partially wrong)

**Brief MPD-4 says:**
> "Activity metadata expanded beyond `{length, ended_early}` … Rationale: future analytics … and product-direction signal. The metadata field on ActivityRequest already supports arbitrary keys (R3 plan-recon verifies)."

**Brief D-FetchPattern says:**
> "No native fetch needed. Existing hook handles dual-write to backend. Frontend just calls `await recordActivity('pray', metadata)` on completion or early-exit."

**Disk reality at spec authorship (2026-05-12):**

Two related-but-different facts on disk:

1. **The backend DTO `ActivityRequest` DOES accept arbitrary metadata** (brief R3 partially verified). Per `backend/src/main/java/com/worshiproom/activity/dto/ActivityRequest.java`:
   ```java
   public record ActivityRequest(
       @NotNull ActivityType activityType,
       @NotBlank @Size(max = 50) String sourceFeature,
       Map<String, Object> metadata
   ) {}
   ```
   The JavaDoc explicitly says: *"metadata — optional; opaque Map<String, Object> persisted as JSONB. The backend does NOT inspect or validate metadata contents (per spec § Architectural Decision #15)."* So the backend half of MPD-4 is real and unblocked.

2. **The frontend hook signature does NOT have a metadata parameter, and `postActivityToBackend` is called without one.** Per `frontend/src/hooks/useFaithPoints.ts`:
   - Line 151: `recordActivity: (type: ActivityType, sourceFeature: string, options?: RecordActivityOptions) => void`
   - Line 298: `postActivityToBackend(type, sourceFeature).catch(...)` — no metadata passed
   - `RecordActivityOptions` (line 131-140) only exposes `skipBackendDualWrite?: boolean` (Spec 6.2's addition). No `metadata` field.

   The current contract is "frontend computes `{type, sourceFeature}` and sends those two fields to the backend; metadata stays empty / null on the dual-write."

**Override disposition:** brief MPD-4 design intent is preserved — completed sessions DO record `{length, ended_early, prompts_seen, audio_used}` somewhere — but **the path to get the metadata into the backend changes**:

- **Option A (RECOMMENDED — plan-recon picks):** Expand `RecordActivityOptions` to include `metadata?: Record<string, unknown>`, and forward it in `postActivityToBackend(type, sourceFeature, options?.metadata)`. This is a small, additive frontend change to `useFaithPoints.ts` and the helper in `services/activity-backend.ts` (or wherever `postActivityToBackend` lives). Plan recon reads the helper and chooses the exact signature. This option preserves the existing hook idiom and keeps `recordActivity` as the single call site for ALL activity recording across the app.
- **Option B (FALLBACK if Option A surfaces complexity):** PraySession bypasses `recordActivity` for the backend call and uses a direct `fetch` (or the underlying `postActivityToBackend` helper) for the metadata-bearing dual-write, while still calling `recordActivity('pray', 'daily_hub_session', { skipBackendDualWrite: true })` for the localStorage half. This keeps the existing hook untouched at the cost of a one-off backend call. Less idiomatic; only choose if Option A breaks an invariant.

**Brief design intent preserved.** The intent — sessions record `{length, ended_early: false, prompts_seen, audio_used}` on completion and `{length, ended_early: true, prompts_seen: N, audio_used}` on early exit — is unchanged. Only the path from frontend hook → backend POST shifts. The localStorage half (`wr_daily_activities`, `wr_faith_points`, `wr_streak`, badge data) continues to work identically because that codepath does not touch metadata today and doesn't need to (the localStorage activity log records `{ type: true }`, not metadata — metadata is a backend-only persistence).

**Plan recon MUST:**
1. Read `frontend/src/services/activity-backend.ts` (or wherever `postActivityToBackend` lives — grep for the export).
2. Confirm whether the helper already accepts a third metadata argument that simply isn't wired through (lucky path) or needs the signature widened (likely path).
3. Pick Option A unless a concrete blocker surfaces. Document the chosen option in the Plan-Time Divergences section of the generated plan.

### R-OVR-2 — `frontend/src/pages/daily/` directory does NOT exist; PraySession is the first occupant

**Brief § 10 CREATE says:**
> "`frontend/src/pages/daily/PraySession.tsx` — full-screen session view"

**Disk reality at spec authorship:** `ls frontend/src/pages/daily/ 2>/dev/null` returns nothing — the directory does not exist. Other Daily Hub pages live at `frontend/src/pages/DailyHub.tsx` (single file, not a directory).

**Override disposition:** Plan creates the directory `frontend/src/pages/daily/` as part of the file creation step. `PraySession.tsx` is the first file in it. No path correction needed — the brief's path is the correct target path. This is informational so the plan author doesn't assume the directory exists and skip directory creation.

Test file location follows: `frontend/src/pages/daily/__tests__/PraySession.test.tsx` (mirroring the page location).

**Brief design intent preserved.** The decision to use `pages/daily/` as a subdirectory (instead of putting PraySession directly under `pages/`) is a sensible namespace move for future Daily Hub-related full-screen views. No change.

### R-OVR-3 — Reuses existing `'pray'` ActivityType; does NOT introduce a new type

**Brief § 4 MPD-4 + § 7 D-Mechanism + § 12 Out of scope:**
The brief implicitly assumes 6.2b's session completion records as `activityType: 'pray'` (the existing type) — confirmed by D-Mechanism: *"On completion or early exit, calls `recordActivity('pray', metadata)` which uses the existing dual-write flow."*

**Disk reality at spec authorship:** Per `09-design-system.md` § "Dashboard Constants" and `frontend/src/constants/dashboard/activity-points.ts`, `'pray'` is in the existing `ACTIVITY_POINTS` map at 10 points (NOT 5 as brief § 7 D-Mechanism says — see R-OVR-4 below). The backend `ActivityType` enum (per master plan Phase 2 + Spec 6.2's `QUICK_LIFT` addition) currently has 13 values including `INTERCESSION` and the recently-added `QUICK_LIFT`. `PRAY` is one of those 13.

**Override disposition:** 6.2b explicitly does NOT add a new `ActivityType` value. Completed sessions record as `recordActivity('pray', 'daily_hub_session')` (or similar `sourceFeature` string — plan recon picks the exact string, must be ≤50 chars per ActivityRequest's `@Size(max = 50)` constraint). The metadata payload (Option A from R-OVR-1) carries the length/ended_early/prompts_seen/audio_used signal.

**Implication for idempotency check:** The brief does not address this, but the existing `recordActivity` hook (line 174) has an idempotency check: `if (todayEntry[type]) return;`. **This means a second `recordActivity('pray', ...)` call on the same day is a no-op for the localStorage half** (no double-counting points or streak). The first completed 6.2b session AND the first untimed PrayTabContent prayer of the day BOTH funnel into the same `todayActivities.pray = true` flag.

**Plan recon must confirm:** is the desired behavior "the first pray-anything on a given day flips the flag, subsequent prays of either type are no-ops for points/badges/streak"? Per brief § 7 D-Mechanism (*"'pray' activity = 5 points (existing intercession baseline / 2); user can't meaningfully farm by faking sessions because the points payoff is small and there's no per-day cap incentive to spoof multiple sessions"*) and brief § 11 acceptance criterion F (*"Early exit still records activity with `ended_early: true` flag; still awards full +5 points; still counts toward streak"*), this matches existing behavior — and that's correct. The backend dual-write, however, is NOT idempotency-checked at the same level — every `POST /api/v1/activity` call inserts an `activity_log` row. This means the backend gets every 6.2b session as a distinct row (good for the analytics signal MPD-4 asks for) while the localStorage / points / streak / badge system de-dupes on the daily flag (good for anti-cheat / anti-farming).

**Brief design intent preserved.** No new ActivityType. The points payoff per session matches existing `'pray'` (with R-OVR-4 correcting the points value). Backend records every session distinctly for analytics; localStorage de-dupes on daily flag.

### R-OVR-4 — Existing `'pray'` activity = 10 points, NOT 5 (brief § 7 D-Mechanism is wrong)

**Brief § 7 D-Mechanism says:**
> "'pray' activity = 5 points (existing intercession baseline / 2)"

**Brief § 11 acceptance criteria F + § 16 says:**
> "still awards full +5 points"

**Brief § 15 verification handoff step 5 says:**
> "verify +5 points still awarded"

**Disk reality at spec authorship:** Per `09-design-system.md` § "Dashboard Constants":
> **dashboard/activity-points.ts** — `ACTIVITY_POINTS` (mood:5, **pray:10**, listen:10, prayerWall:15, meditate:20, journal:25)

`'pray'` is **10 points**, not 5. The brief's reference to "intercession baseline / 2" appears to be a mis-remembering of the points table — INTERCESSION (Phase 3 addition) is at its own value, but the default `'pray'` activity has been 10 points since Phase 2.

**Override disposition:** 6.2b reuses the existing `'pray'` activity, which awards **10 points** per the existing `ACTIVITY_POINTS` map. Brief acceptance criterion F is corrected to "+10 points" (not "+5 points"). Brief verification handoff step 5 is corrected the same way.

**Brief design intent preserved.** The intent — completed sessions award the standard pray points; early exit does NOT reduce or penalize — is unchanged. Only the numeric value in the brief was wrong. The "anti-cheat / anti-farming" justification in D-Mechanism still holds: the daily idempotency check (R-OVR-3) caps at 10 points per day for pray regardless of how many sessions a user runs. No per-day cap incentive to spoof.

**Verification plan:** plan recon re-reads `frontend/src/constants/dashboard/activity-points.ts` and confirms the exact value before the plan locks in copy/test assertions.

### R-OVR-5 — Music feature audio cluster is a HARD-RULE off-limits surface (Decision 24 reconciled to Outcome A)

**Brief MPD-5 says:**
> "Audio integration deferred to plan recon, not a hard requirement at brief level. Stub mentions 'Optional ambient sound selection (leverages Phase 6's Sound Effects settings)' — but the Sound Effects spec (6.11) isn't built yet. Brief decides: 6.2b ships with audio toggle disabled by default. If audio infrastructure exists at plan-recon time (e.g., via existing Music feature), wire it up."

**Brief R4 (PLAN-RECON-REQUIRED) says:**
> "Music feature audio infrastructure … Determine if it's reusable as a thin wrapper in PraySession, OR if 6.2b needs its own tiny audio player. If reusable: import and use. If not reusable + simple to build: build minimal HTMLAudioElement-based player with crossfade. If not reusable + complex: defer audio toggle to follow-up spec per MPD-5."

**Disk reality at spec authorship (2026-05-12):** Per `09-design-system.md` § "Music Feature — Technical Architecture" and the **Decision 24 hard rule** quoted there:

> "**Hard rule (cite Decision 24 from Music direction): No future spec migrates Music chrome to `BackgroundCanvas`, `FrostedCard`, or any other canonical atmospheric primitive without first reconciling against the AudioProvider / audioReducer / AudioContext cluster integrity (Decision 24).**"

The Music feature exposes 4 contexts (`AudioStateContext`, `AudioDispatchContext`, `AudioEngineContext`, `SleepTimerControlsContext`), a single global `AudioContext` (Web Audio API instance, suspend/resume only — never destroy/recreate), `AudioEngineService` with crossfade-double-buffer state, and the `audioReducer` that owns 14 fields of audio-only state. The provider mounts at `App.tsx` between `AuthModalProvider` and `<Routes>`. Decision 24 reconciled to **Outcome A — Decoupled**: the audio cluster is load-bearing and decoupled from chrome.

**Override disposition for R4 audio recon:** plan recon **MUST** treat the existing Music feature audio cluster as **off-limits for reuse in 6.2b**. The decision is:

- Plan does NOT import `AudioProvider`, `AudioEngineService`, `useAudioState`, `useAudioDispatch`, or any audio-cluster member into PraySession.
- Plan does NOT mount a second `<AudioProvider>` instance inside PraySession.
- Plan does NOT call `dispatch({ type: 'PLAY_SCENE', ... })` or any audio-cluster action from PraySession.

The reason is **not** that the Music infrastructure is technically unusable for ambient — it's that the existing infrastructure is **highly opinionated about scene/sound choreography, sleep timers, routine steppers, and master volume / foreground-background balance**. PraySession's needs are simpler (one ambient track at a soft fixed volume during a session, fade out at session end) and tangling the two surfaces would risk regressing the audio cluster's coordination contracts (e.g., `pausedByBibleAudio`, `pillVisible`, `drawerOpen` — all of which would interact unpredictably with a second consumer).

**Brief MPD-5 escalation:** Given Decision 24, **6.2b ships WITHOUT the audio toggle**. The toggle is moved to a follow-up spec ("Spec 6.2c — Prayer Session Ambient Audio") that lands AFTER 6.11 (Sound Effects Settings Polish, currently ⬜) ships and the audio cluster's reuse story is formally documented. This is the right tradeoff for ship safety.

Concretely:
- `<PrayAudioToggle />` is **NOT created** for 6.2b (deleted from the brief's § 10 CREATE list).
- The activity metadata always records `audio_used: false` consistently per brief MPD-5 final paragraph.
- The localStorage key `wr_prayer_session_audio_preference` is **NOT introduced** in 6.2b (R8's plan recon work is moot for this spec).
- The brief's R4 / R8 plan recon items are removed (they belong in 6.2c).

**Brief design intent preserved.** The intent — "audio is an opt-in enhancement, not a requirement; if it's not trivially reusable, defer it" — is upheld. The brief's escape hatch in MPD-5 final paragraph ("If audio infrastructure isn't available at execute-time, the toggle is hidden entirely; `audio_used` is always `false`") is exactly what 6.2b ships.

**6.2c follow-up spec scope (out of band for 6.2b plan / execute):** Once 6.11 lands and the Music cluster's reuse story is documented, 6.2c will:
- Add `<PrayAudioToggle />` to PraySession.
- Introduce `wr_prayer_session_audio_preference` per brief's R8.
- Wire ambient audio playback (likely via a thin standalone HTMLAudioElement wrapper, NOT the full audio cluster, per Decision 24).
- Update activity metadata's `audio_used` to flow from the actual playback state.

### R-OVR-6 — `useFaithPoints` skips writes for unauthenticated users (auth gating already enforced at the hook layer)

**Brief D-AuthGating says:**
> "Auth required to start a session. Unauthenticated users see PrayLengthPicker as visible but tapping any button opens auth modal (existing pattern from PrayTabContent). After login, user lands back on PrayLengthPicker — does NOT auto-start the session they attempted before login (avoids the surprise-session UX)."

**Disk reality at spec authorship:** Per `frontend/src/hooks/useFaithPoints.ts` lines 162-167:
```ts
const recordActivity = useCallback((type, sourceFeature, options?) => {
  if (!isAuthenticated) return;
  // ...
});
```

The hook is already a no-op for unauthenticated users. PraySession's session-completion `recordActivity` call is silently safe if somehow invoked while logged out. But that doesn't replace the brief's design intent (don't START a session unauthenticated).

**Override disposition:** Brief D-AuthGating is the binding intent. Plan implements the auth-modal gate **at the PrayLengthPicker button click handler** (per the existing PrayTabContent pattern via `useAuthModal()`), NOT at the session-completion call site. The hook's auth-check is a defense-in-depth backstop. Both layers must agree.

**Concrete check:** if a logged-out user manipulates the URL to `/daily?tab=pray&length=5` directly (bypassing the picker click handler), what happens?

Brief design intent (D-AuthGating + D-DeepLink) is ambiguous on this case. **Plan recon decides** between:

- **Option C-1 (RECOMMENDED):** deep-linked `?length=X` while unauthenticated → picker visible, auth modal opens automatically with subtitle "Sign in to start a timed session", URL `?length=X` is preserved in case user wants to retry after login. The session does NOT auto-start because the brief explicitly forbids the surprise-session UX. After login, the user is on the picker with `?length=X` still in the URL; they can tap to start, or the consumer cleans up `?length=X` after the auth modal fires (plan picks).
- **Option C-2:** deep-linked `?length=X` while unauthenticated → picker visible, NO auth modal opens (consistent with the "no auto-start" rule), URL `?length=X` is consumed via `replaceState` and removed. User is treated as if they'd landed on the picker fresh. Less direct than C-1 but avoids the surprise of the auth modal popping unsolicited.

Plan-recon picks one and documents in the Plan-Time Divergences section. Option C-1 is slightly more helpful (carries forward the user's intent through login); Option C-2 is slightly less surprising (no unsolicited modal). Both honor the "no surprise-session UX" rule.

**Brief design intent preserved.** The session never auto-starts post-login. Either option respects that.

### R-OVR-V1 through R-OVR-V4 — VERIFIED brief claims ratified at spec authorship

All four VERIFIED items in brief § 5 (R1, R2, R5, and the parts of R3 about backend metadata acceptance) were re-verified on disk at spec authorship:

- **R1 DailyHub + PrayTabContent infrastructure** — ratified. `frontend/src/pages/DailyHub.tsx` exists; `frontend/src/components/daily/PrayTabContent.tsx` exists; `PrayTabContent` imports `useFaithPoints.recordActivity` (lines 36, 151, 176 — verified via grep), `useCompletionTracking.markPrayComplete`, `useAuthModal`.
- **R2 useFaithPoints hook** — ratified. `frontend/src/hooks/useFaithPoints.ts` exists. `RecordActivityOptions.skipBackendDualWrite` (line 139) is the Spec 6.2 addition. 6.2b uses `recordActivity` with the default behavior (no `skipBackendDualWrite`) because 6.2b has NO backend endpoint of its own (per brief R2 final paragraph). **(See R-OVR-1 for the metadata-forwarding gap that is NOT in this VERIFIED line.)**
- **R3 (backend half only)** ActivityRequest metadata shape — ratified. The backend DTO accepts arbitrary metadata. (The frontend forwarding gap is R-OVR-1.)
- **R5 React Router + URL state pattern** — ratified. DailyHub.tsx uses `useSearchParams` for `?tab=` reading. The same hook + setter idiom is the canonical pattern for `?length=` reading + `replaceState` cleanup.

---

## Metadata

- **ID:** `round3-phase06-spec02b-prayer-length-options`
- **Phase:** 6 (Engagement Features — 6.2b lands AFTER 6.2 Quick Lift, fills the gap between Quick Lift's 30-second moment and the full Daily Hub meditation flow)
- **Size:** M (per master plan; brief ratifies — purely frontend; one new full-screen page + 3 components + 1 hook + 1 constants file + ~14 tests; smaller surface than 6.2)
- **Risk:** Low (per master plan; brief ratifies — frontend-only, uses existing activity infrastructure, no anti-abuse surface, no backend endpoints, no new DB schema; brand-voice and a11y are the load-bearing dimensions, NOT correctness)
- **Tier:** **High** (per brief § 2 / § 13 — content curation across 15 prompts, anti-pressure brand voice gates HARD, accessibility precision (`role="status"` + `aria-live="polite"` semantics matter), silence-interval design is locked per length. High not xHigh because no content-scale-like-6.1 and no anti-abuse-surface-like-6.2)
- **Prerequisites:**
  - **6.1 (Prayer Receipt) ✅** — shipped per `_forums_master_plan/spec-tracker.md` row 79 (verified 2026-05-12).
  - **6.2 (Quick Lift) ✅** — shipped per `_forums_master_plan/spec-tracker.md` row 80 (verified 2026-05-12). Brief recommends sequencing 6.2 → 6.2b serial for review-load reasons. 6.2b execution is **unblocked** on 6.2's prerequisites.
  - **Existing DailyHub + PrayTabContent infrastructure** — verified via R1.
  - **Existing `useFaithPoints.recordActivity`** — verified via R2 (with R-OVR-1 documenting the metadata-forwarding gap to address).
  - **Existing auth-modal pattern** — verified (`useAuthModal()` already used by PrayTabContent).
  - **`prefers-reduced-motion` global safety net** — verified per `09-design-system.md` § "Reduced-Motion Safety Net". 6.2b's reduced-motion accommodation (D-ReducedMotion) is layered on top of this — the global rule disables animations automatically; 6.2b only needs to ensure **silence-interval timing is unchanged** when motion is reduced (D-ReducedMotion explicitly affirms this).
  - **Music feature audio cluster** — **OFF-LIMITS per R-OVR-5 / Decision 24.** Audio toggle deferred to follow-up Spec 6.2c.
  - **localStorage rules file** — verified per `11-local-storage-keys.md`. NO new keys introduced in 6.2b (the `wr_prayer_session_audio_preference` key from brief R8 is deferred to 6.2c per R-OVR-5).

---

## Goal

Fill the gap between Quick Lift's 30-second "pray for someone on my feed" moment and the full Daily Hub meditation flow. Users pick a length — 1 minute, 5 minutes, or 10 minutes — and enter a guided prayer session with gentle prompts interleaved with deliberate silence. The guided prompts exist to remove the "what do I say" hesitation that stops some people from praying longer, while the silences exist because prayer is not a podcast. This is the spec for users who want to **sit with prayer** rather than react to it.

The silences matter more than the prompts. The "End early" button being always-visible is non-negotiable.

---

## Approach

A new full-screen `PraySession` view at `/daily?tab=pray&length={1|5|10}` mounted atop the existing Pray tab. The picker is a **new section** within the existing PrayTabContent (NOT a replacement — MPD-1) labeled "Start a timed session" with three frosted-glass buttons. Tapping a length transitions into the full-screen timer view: a centered prompt that crossfades every 30-75 seconds (length-dependent), an always-visible "End early" button in the top-right corner, optional audio toggle (DEFERRED to 6.2c per R-OVR-5), and a closing "Amen." screen for 3 seconds before redirect.

Prompts are length-specific (D-Prompts: 2 prompts for 1-min, 5 prompts for 5-min, 8 prompts for 10-min) and **shuffled per session** within fixed-position constraints (first prompt always first; last prompt of 5-min and 10-min always last; D-PromptShuffle). Silences between prompts are **deliberately longer than most apps** (D-SilenceTiming: 35-75s for 5-min, 60-75s for 10-min, 25-30s for 1-min) — research on meditation apps shows that anything under 30s trains users out of actually settling.

The session ends with a single word — **"Amen."** (D-AmenScreen: 3 seconds, NOT dismissible, NOT skippable, fades out → redirect to `/daily?tab=pray`). No "You prayed for X minutes!", no points counter, no streak indicator, no badge celebration, no sharing prompt. Activity is recorded silently in the background via `recordActivity('pray', 'daily_hub_session', { metadata: {...} })` — see R-OVR-1 for the metadata-forwarding mechanism.

**Anti-pressure design (load-bearing):**
- "End early" button visible the entire session (never hidden, never requires confirmation)
- Activity STILL fires on early exit with `ended_early: true`, STILL awards full points (R-OVR-4: 10 points, not 5)
- NO "you almost made it!" guilt copy
- NO "session X of Y" progress bar
- NO countdown timer visible (D-Mechanism — silences pace the experience, NOT a visible clock)
- Completion screen is just "Amen." — period
- NO sharing prompt after session ends
- "Stare at the screen the whole time" is a valid prayer (W21-W25 brand-voice guardrails)

**Audio is OUT OF SCOPE for 6.2b.** Per R-OVR-5 (Decision 24 hard rule against Music cluster reuse), the audio toggle is deferred to follow-up Spec 6.2c. The brief's MPD-5 escape hatch ("ship without audio + add the toggle in a follow-up spec when 6.11 lands") is taken. Activity metadata records `audio_used: false` consistently.

---

## Files to CREATE

**Frontend:**

- `frontend/src/pages/daily/PraySession.tsx` — full-screen session view. Hosts the timer, the crossfading prompt container, the End-early button, the Amen screen handoff. Reads `?length=` from URL on mount. On unmount or completion, redirects to `/daily?tab=pray` (no length param) via `setSearchParams({ tab: 'pray' }, { replace: true })`. **NEW directory `frontend/src/pages/daily/` created as part of this spec — see R-OVR-2.**
- `frontend/src/components/daily/PrayLengthPicker.tsx` — 3-button picker (1/5/10 minutes). Rendered inside existing PrayTabContent. Each button uses `<FrostedCard variant="default">` with `rounded-3xl` per Visual Rollout canonical patterns (plan recon picks exact styling — see "Visual System Integration" below). Section heading above buttons: "Start a timed session" using `SectionHeading` 2-line treatment OR a simpler inline heading (plan picks).
- `frontend/src/components/daily/PrayTimer.tsx` — internal timer logic component. Uses `setTimeout` chain (NOT `setInterval` — clearer per-prompt scheduling). Exposes `onPromptChange(promptIndex)`, `onComplete()`, `onEarlyExit()` callbacks. Manages the prompt index lifecycle but renders no UI itself (UI lives in PraySession).
- `frontend/src/components/daily/PrayCompletionScreen.tsx` — the "Amen." screen. 3-second hold, then fires `onComplete` callback. Uses CSS transition for fade-in (animation tokens from `frontend/src/constants/animation.ts` — `slow` duration 400ms for the fade-in, then 3s hold). Reduced-motion: instant swap (handled automatically by global `prefers-reduced-motion` rule).
- `frontend/src/constants/pray-session-prompts.ts` — the curated prompt arrays (D-Prompts content):
  ```ts
  export type PrayPrompt = {
    text: string
    silenceMs: number
    fixedPosition?: 'first' | 'last'
  }

  export const PRAY_PROMPTS_1MIN: ReadonlyArray<PrayPrompt> = [ /* 2 entries */ ] as const
  export const PRAY_PROMPTS_5MIN: ReadonlyArray<PrayPrompt> = [ /* 5 entries */ ] as const
  export const PRAY_PROMPTS_10MIN: ReadonlyArray<PrayPrompt> = [ /* 8 entries */ ] as const
  ```
  Runtime validators at module load (per D-PromptArrayLocation): length checks (2/5/8), `fixedPosition` correctness, non-empty `text`, positive `silenceMs`. Throw at module load on validation failure.
- `frontend/src/hooks/usePraySession.ts` — session orchestration hook. Manages prompt index, shuffle (Fisher-Yates with fixed-position respect — D-PromptShuffle), elapsed time tracking (for `prompts_seen` metadata), and fires `recordActivity` on completion or early exit. Encapsulates the metadata-forwarding logic from R-OVR-1.

**Test files** (mirroring component locations):

- `frontend/src/pages/daily/__tests__/PraySession.test.tsx`
- `frontend/src/components/daily/__tests__/PrayLengthPicker.test.tsx`
- `frontend/src/components/daily/__tests__/PrayTimer.test.tsx`
- `frontend/src/components/daily/__tests__/PrayCompletionScreen.test.tsx`
- `frontend/src/constants/__tests__/pray-session-prompts.test.ts`
- `frontend/src/hooks/__tests__/usePraySession.test.ts`
- `frontend/e2e/pray-session.spec.ts` (or `frontend/tests/e2e/...` per existing Playwright convention — plan recon picks the canonical path)

## Files to MODIFY

**Frontend:**

- `frontend/src/components/daily/PrayTabContent.tsx` — add `<PrayLengthPicker />` section. Placement (above or below the existing PrayerInput / "Help Me Pray" flow) picked by plan recon based on visual hierarchy. The existing prayer-prompt-to-journal flow remains accessible (MPD-1).
- `frontend/src/pages/DailyHub.tsx` — read `?length=` query param from `useSearchParams`. When `tab === 'pray' && length ∈ {1, 5, 10}`, mount `<PraySession length={length} />` in place of (or layered above) `<PrayTabContent />`. When `length=invalid` or absent, fall through to normal PrayTabContent rendering. Cleanup of the `?length=` param on session end is PraySession's responsibility (D-DeepLink).
- `frontend/src/hooks/useFaithPoints.ts` (if Option A from R-OVR-1 chosen) — expand `RecordActivityOptions` to include `metadata?: Record<string, unknown>`. Forward to `postActivityToBackend(type, sourceFeature, options?.metadata)`.
- `frontend/src/services/activity-backend.ts` (or wherever `postActivityToBackend` lives — plan recon greps) — accept an optional third `metadata` argument and include it in the POST body when present.

**No frontend types changes** beyond the optional `RecordActivityOptions.metadata` field. `'pray'` is already in the `ActivityType` union (R-OVR-3).

**`.claude/rules/11-local-storage-keys.md`** — **NO update needed for 6.2b.** Per R-OVR-5, the `wr_prayer_session_audio_preference` key is deferred to Spec 6.2c. The rules file change moves with that spec.

**No backend changes** — verified R3 (the backend half — `ActivityRequest.metadata` already accepts arbitrary `Map<String, Object>`).

## Files NOT to MODIFY (explicit non-targets)

- **Backend Java code** — zero backend changes for 6.2b. Reuses existing `'pray'` `ActivityType` (R-OVR-3) and existing `POST /api/v1/activity` endpoint with its existing `ActivityRequest.metadata` JSONB field.
- **`useCompletionTracking.ts`** — existing hook. Plan recon decides whether to call `markPrayComplete()` (existing untimed pray) or `markGuidedPrayerComplete()` (existing audio-guided sessions) on PraySession completion, per brief R6. Hook itself NOT modified.
- **6.1 (Prayer Receipt) code** — orthogonal.
- **6.2 (Quick Lift) code** — orthogonal. Different surface, different mechanics. PointValues / BadgeCatalog / BadgeThresholds updates from 6.2 (R-OVR-1/2/3 of Spec 6.2) are NOT touched by 6.2b.
- **Music feature audio cluster** — OFF-LIMITS per R-OVR-5 / Decision 24. Do NOT import `AudioProvider`, `useAudioState`, `useAudioDispatch`, `AudioEngineService`, or any audio cluster member.
- **Settings page** — NO new toggle. Audio toggle is per-session in 6.2c, NOT a global setting.

## Files to DELETE

None. 6.2b is purely additive.

---

## Database Changes (Liquibase)

**None.** 6.2b is frontend-only. The existing `activity_log` table (Spec 2.1, ✅) accepts the new metadata payload via its existing JSONB `metadata` column — no schema change.

---

## API Changes

**None.** 6.2b reuses the existing `POST /api/v1/activity` endpoint with its existing `ActivityRequest` DTO. The metadata payload (`{length, ended_early, prompts_seen, audio_used}`) flows through as an opaque `Map<String, Object>` per `ActivityRequest.metadata`'s JavaDoc contract — backend does not inspect or validate.

The frontend-side helper `postActivityToBackend` may gain a third optional metadata argument per R-OVR-1 Option A — that is a **frontend** API shape change, NOT a backend API change.

---

## Visual System Integration

Per `04-frontend-standards.md` + `09-design-system.md`:

- **PrayLengthPicker buttons:** Use `<FrostedCard variant="default">` per Visual Rollout Spec 1A canonical patterns (`bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl`). Each card is a tappable Link or button with the cross-surface card pattern (Spec 3 — `<button> + FrostedCard` group-hover) — group-hover elevates the card. Subtitle below the label uses `text-white/60` muted treatment. Plan recon picks exact spacing and grid layout (3 cards horizontal on desktop, stacked on mobile per responsive standards).
- **Section heading "Start a timed session":** Plan recon picks between `<SectionHeading topLine="..." bottomLine="..." />` 2-line treatment and a simpler inline `<h2>` with `GRADIENT_TEXT_STYLE`. The brief is silent on this; pick what looks best in context of the existing PrayTabContent layout.
- **PraySession full-screen view:** Mounts atop DailyHub's existing `<BackgroundCanvas>` atmospheric layer. PraySession is `position: relative z-10` so it sits above the canvas. Prompt container is centered (`mx-auto max-w-2xl` per Daily Hub padding pattern). Typography: prompts use `font-serif` Lora (the canonical scripture/reflective font) at large size — `text-2xl sm:text-3xl text-white text-center leading-relaxed`. Plan recon picks exact size — should feel reverent, not headline-loud.
- **"Amen." screen:** Single word, large serif typography matching brand. `text-5xl sm:text-6xl font-serif text-white text-center` — plan recon picks exact size. Centered on the same `BackgroundCanvas` atmospheric layer.
- **End-early button:** Top-right corner of the session view. Use `<Button variant="subtle" size="sm">` (frosted pill) per Visual Rollout canonical patterns. Includes `aria-label="End prayer session early"`. Plan recon picks exact positioning (likely `absolute top-4 right-4` or `fixed top-4 right-4` with `env(safe-area-inset-top)` respect).
- **Animation tokens:** All animations import from `frontend/src/constants/animation.ts` (BB-33 canonical tokens). Prompt crossfade duration = `slow` (400ms) — chosen for reverent pacing. Wait — brief § 3 says 1500ms; that's longer than the `slow` token. Plan recon decides:
  - **Option D-1:** Use `slow` (400ms) for consistency with BB-33 token system.
  - **Option D-2:** Add a new `meditative` (1500ms) duration token to `animation.ts` for cases where pacing exceeds standard UI timing.
  - **Option D-3:** Inline `1500ms` as documented intentional drift with a comment citing the spec.

  Recommendation: **Option D-2** is the most principled — the meditative pacing is a real cross-feature pattern (audio Bible's slow fades, breathing exercise's 4-second inhale, etc.) and a token captures the intent. Option D-3 is acceptable as a short-term compromise. Option D-1 is wrong — 400ms feels too fast for the "reverent" crossfade brief describes.

  Easing: `decelerate` per BB-33 — feels like the prompt is "arriving" rather than "snapping".

- **Reduced motion:** Global safety net (`frontend/src/styles/animations.css`) handles disabling automatically. PraySession does NOT need to check `prefers-reduced-motion` itself. **Critical:** silence intervals (D-SilenceTiming) MUST NOT change when motion is reduced — D-ReducedMotion is visual-only.

- **Layout context:** PraySession mounts inside DailyHub which already has `<BackgroundCanvas>` at root. Do NOT mount a second `BackgroundCanvas`. The Daily Hub's existing `transparentNav: true` Layout default (Visual Rollout Spec 12) means the navbar overlays the page — that may or may not be visible during a session. Plan recon decides:
  - **Option E-1 (RECOMMENDED):** PraySession overlays the navbar with `fixed inset-0 z-50` so the session feels truly immersive (no navbar, no tabs, no footer visible). This is consistent with the "looking out into space" Spec Y / Visual Rollout 1A atmospheric design philosophy AND mirrors the BibleReader's immersive treatment.
  - **Option E-2:** PraySession renders inline within DailyHub (replacing tab content), navbar remains visible. Less immersive.

  Recommendation: Option E-1. The session is a brief, intentional, immersive moment. Per the audio cluster's analogous decoupling, PraySession is allowed to break the Layout chrome contract. **If Option E-1 is chosen, PraySession must mount its own skip-to-main-content link** (since the canonical Navbar skip link is not visible). Mirror the BibleReader pattern documented in `09-design-system.md` § "Layout Exception: BibleReader".

---

## Anti-Pressure Design Decisions (load-bearing — Gate-G-ANTI-PRESSURE)

Per brief § 4 MPD-7, MPD-8, MPD-9, MPD-10 + Universal Rule 12 + master plan v2.9 Phase 3 Execution Reality Addendum Universal Rule 13 (crisis detection supersession — N/A for 6.2b per MPD-10):

1. **No countdown timer visible during session.** D-Mechanism. The user is in time with God; the clock is not the point. Silences pace the experience instead.
2. **No "session X of Y" progress bar.** MPD-9 / W7. Sessions are not quota-based.
3. **No points-counter animation at completion.** W3. Points land silently in the dashboard.
4. **No streak indicator anywhere in the session UI.** W4. Streak math happens silently.
5. **No sharing prompt after session.** MPD-8 / W5. No "share your session", no "invite a friend to pray with you", no confetti, no badge unlock celebration.
6. **"Amen." screen says exactly "Amen."** D-AmenScreen / W2. Not "Amen!", not "Great job!", not "You prayed for X minutes!". A single word, a period, large serif typography. 3 seconds. Not dismissible. Not skippable.
7. **End-early button is always visible, never requires confirmation.** D-EarlyExit / W7. Hidden-exit apps feel hostile within two sessions.
8. **Early exit awards full points and counts toward streak.** D-EarlyExit / acceptance criterion F. NO partial credit, NO penalty. Brief § 11 wrongly states "+5 points" — R-OVR-4 corrects to "+10 points" (the existing `'pray'` activity value).
9. **No crisis-keyword detection in 6.2b.** MPD-10. PraySession has NO text input — prompts are read-only. Crisis detection does not apply (no user-generated content surface).
10. **"Stare at the screen the whole time" is a valid prayer.** The session completes whether or not the user did anything; the timer runs regardless. There is no engagement detection, no "are you still there?" prompt, no penalty for non-interaction.

### Anti-Pressure Copy Checklist (Gate-G-ANTI-PRESSURE — HARD)

All prompt strings, length picker labels, completion screen, deep-link error fallback (none — graceful silence per Gate-G-DEEP-LINK-GRACEFUL), and any other user-facing copy in 6.2b must pass:

- [ ] **No comparison** — no "more than yesterday", "longer than last time", "streak day N", "X prayers this week".
- [ ] **No urgency** — no "don't miss", "quick before", "hurry", "just one more".
- [ ] **No guilt** — no "you almost made it", "keep trying", "try again tomorrow", "you can do better".
- [ ] **No achievement framing** — no "great job", "you did it", "unlocked", "level up", "milestone".
- [ ] **No quota framing** — no "3 of 8 prompts", "halfway", "final stretch", "X minutes left".
- [ ] **No sharing nudge** — no "tell a friend", "share your session", "let others know".
- [ ] **No exclamation points near vulnerability content.** Even in the length picker subtitles ("Quick pause", "Settled prayer", "Deep sit"), no exclamation points.

Code review applies a grep-based check on `pray-session-prompts.ts`, `PrayLengthPicker.tsx`, and `PrayCompletionScreen.tsx` for any of these patterns. Presence of words like "streak", "unlock", "share", "great", "keep", "almost", "hurry", "quick" in CTA context (not the legitimate "Quick pause" subtitle), or any exclamation point — triggers manual review.

### Accessibility (Gate-G-A11Y — HARD)

Per `04-frontend-standards.md` + `09-design-system.md` § "Accessibility Patterns (BB-35)" + brief § 6 Gate-G-A11Y:

- [ ] **Prompt container** has `role="status"` + `aria-live="polite"` (NOT `assertive` — prompts should never interrupt mid-thought). Each prompt change triggers ONE announcement.
- [ ] **Silences are silent for screen reader.** No periodic announcements during silence intervals — that would flood the user.
- [ ] **Focus moves to End-early button on session start.** Keyboard users can immediately escape if needed.
- [ ] **Tab order during session:** End-early button → nothing else focusable (the prompt container itself is `role="status"`, not focusable; no audio toggle in 6.2b per R-OVR-5).
- [ ] **End-early button** has `aria-label="End prayer session early"` + 44×44 px minimum touch target + visible focus ring.
- [ ] **Length picker buttons** have descriptive `aria-label` combining label + subtitle ("1 minute, Quick pause" / "5 minutes, Settled prayer" / "10 minutes, Deep sit"). 44×44 px minimum.
- [ ] **Amen screen** has `role="status"` + `aria-live="polite"` so screen readers announce "Amen." once. NOT `assertive` (the session is ending, not interrupting).
- [ ] **Color contrast** on prompt text + button affordances meets WCAG AA 4.5:1 in dark theme (Bible reader themes don't apply — PraySession uses the canonical dark theme regardless).
- [ ] **Axe-core scan** on length picker, session view (during prompt display), and Amen screen each pass with zero violations.
- [ ] **Reduced-motion** accommodation is visual-only; silence intervals (D-SilenceTiming) and total session duration are identical for all users. Global safety net handles the animation disabling.
- [ ] **No `outline-none` without visible replacement** on any focusable element. Use `focus-visible:ring-2 focus-visible:ring-white/50` or equivalent.

---

## Copy Deck

**Length picker section heading:**
- "Start a timed session"

**Length picker buttons:**
- Label "1 minute" / subtitle "Quick pause"
- Label "5 minutes" / subtitle "Settled prayer"
- Label "10 minutes" / subtitle "Deep sit"

**End-early button:**
- Visible text: "End early"
- Accessible label: `aria-label="End prayer session early"`

**Completion screen:**
- "Amen." (exactly this string — no exclamation mark, no celebration copy)

**Auth modal subtitle when length-picker tapped while logged out:**
- "Sign in to start a timed session" (or existing canonical subtitle — plan picks)

**Prompt arrays (D-Prompts — Gate-G-PROMPT-COPY HARD-LOCKED; CC may light-edit by ≤2 words for layout fit but MUST NOT replace wholesale):**

*1-minute session (2 prompts):*
1. "Breathe. What's heavy right now?" (fixedPosition: 'first')
2. "Hand it over."

*5-minute session (5 prompts):*
1. "Settle. Notice your breath." (fixedPosition: 'first')
2. "Who needs prayer today?"
3. "Name what hurts."
4. "Thank God for one thing."
5. "Sit with God in silence." (fixedPosition: 'last')

*10-minute session (8 prompts):*
1. "Settle. Breathe deeply, three times." (fixedPosition: 'first')
2. "Where has God been in your day?"
3. "Who needs prayer? Name them."
4. "Hold one person in your heart."
5. "Name what hurts in your own life."
6. "Where do you need wisdom?"
7. "Thank God for three things."
8. "Sit in silence with the Father." (fixedPosition: 'last')

**Anti-pressure compliance check:** Every prompt is an invitation, not a command. No comparison, urgency, guilt, achievement framing, or quota framing. Plain text only (Gate-9: no markdown, no HTML, no embedded scripture-reference components — just text strings).

**Eric MUST review + approve this set before execute.** Edits welcome. Plan may shorten by 1-2 words for layout fit; cannot replace a prompt wholesale.

### Silence Timing (D-SilenceTiming — LOCKED per length)

Per brief § 7. Plan may refine exact decimal seconds for clean math; the rough proportions (settle short, intercession longest, gratitude/silence medium) are fixed.

*1-minute session (~60s total):*
- Prompt 1: 5s visible + 1.5s fade-out + 25s silence = 31.5s
- Prompt 2: 1.5s fade-in + 5s visible + 1.5s fade-out + 18s silence = 26s
- Amen screen: 3s
- Total: ~60.5s

*5-minute session (~300s total):*
- Prompt 1 (settle): 5s + 1.5s + 35s = 41.5s
- Prompt 2 (intercession): 6s + 1.5s + 70s = 77.5s (longest silence — deep intercession)
- Prompt 3 (hurt): 5s + 1.5s + 55s = 61.5s
- Prompt 4 (gratitude): 5s + 1.5s + 50s = 56.5s
- Prompt 5 (sit): 5s + 1.5s + 55s = 61.5s
- Amen screen: 3s
- Total: ~301.5s

*10-minute session (~600s total):*
- Prompt 1 (settle): 5s + 1.5s + 60s = 66.5s
- Prompt 2 (presence): 6s + 1.5s + 70s = 77.5s
- Prompt 3 (intercession opens): 6s + 1.5s + 75s = 82.5s
- Prompt 4 (name a person): 6s + 1.5s + 75s = 82.5s
- Prompt 5 (hurt): 6s + 1.5s + 70s = 77.5s
- Prompt 6 (wisdom): 6s + 1.5s + 65s = 72.5s
- Prompt 7 (gratitude): 6s + 1.5s + 75s = 82.5s
- Prompt 8 (silence): 6s + 1.5s + 70s = 77.5s
- Amen screen: 3s
- Total: ~602.5s

**CC during execute MAY refine decimals for cleaner math (e.g., rounding to nearest 5s) but MUST NOT shorten silences below 25s. Below 30s trains users out of settling (W23). Brief out-of-band note: test with 60s silences first; if too long, shorten to 45s. Do not go below 30.**

---

## Acceptance Criteria

**Functional (from master plan + brief):**

- [ ] A. Three-button length picker on Daily Hub Pray tab (1 / 5 / 10 minutes).
- [ ] B. Full-screen timer view renders current prompt + End-early button (NO countdown numbers, NO progress bar).
- [ ] C. Prompts fade in/out with CSS transitions; reduced-motion = instant swaps (handled by global safety net).
- [ ] D. Prompt order shuffled per session within first/last fixed positions (Fisher-Yates over positions 2..N-1 for 5-min; full shuffle of positions 2..7 for 10-min; no shuffle for 1-min — only 2 prompts, both fixed).
- [ ] E. Session completes with "Amen." screen for 3s → fires `recordActivity('pray', 'daily_hub_session', { metadata: {...} })` → redirects to `/daily?tab=pray` (no length param).
- [ ] F. Early exit still records activity with `ended_early: true` flag; still awards full **+10 points** (R-OVR-4 corrects brief's "+5 points" to +10); still counts toward streak.
- [ ] G. Activity metadata payload: `{ length: 1|5|10, ended_early: boolean, prompts_seen: number, audio_used: false }` (audio_used always false in 6.2b per R-OVR-5).
- [ ] H. No streak penalty for early exit.
- [ ] I. URL query param `?length=5` deep-links into a 5-minute session directly (picker bypassed).
- [ ] J. `?length=invalid` (or any value outside {1, 5, 10}) falls back silently to the picker view; NO error toast, NO redirect with error message (Gate-G-DEEP-LINK-GRACEFUL).
- [ ] K. `?length=X` param is consumed once on first render and removed from URL via `replaceState` so refresh during a session does not restart it (and silence on refresh — session is ephemeral).
- [ ] L. Screen reader announces each prompt as `role="status"` + `aria-live="polite"` (NOT `assertive`); silences are silent for screen reader.

**Brand voice (brief-mandated, master plan reinforces):**

- [ ] M. Completion screen says exactly "Amen." — no exclamation, no celebration copy.
- [ ] N. NO points display, NO streak indicator, NO badge celebration, NO confetti in session UI.
- [ ] O. NO sharing prompt after session.
- [ ] P. NO progress bar / progress percentage / "X of Y prompts" indicator during session.
- [ ] Q. NO countdown timer visible during session.
- [ ] R. Prompts pass Gate-G-ANTI-PRESSURE grep check (no comparison/urgency/guilt/achievement/quota/share words).

**Accessibility (Gate-G-A11Y):**

- [ ] S. `role="status"` + `aria-live="polite"` on prompt container; NEVER `assertive`.
- [ ] T. Focus moves to End-early button on session start.
- [ ] U. End-early button: `aria-label="End prayer session early"`, 44×44 px minimum touch target.
- [ ] V. Length picker buttons: descriptive `aria-label` combining label + subtitle.
- [ ] W. Axe-core scans pass with zero violations on picker, session, Amen screen.
- [ ] X. Reduced-motion accommodation visual-only; timing identical for all users.
- [ ] Y. WCAG AA color contrast on all text.
- [ ] Z. Skip-to-main-content link works during PraySession (mount own root-level skip link if Option E-1 chosen — see "Visual System Integration").

**Performance:**

- [ ] AA. Crossfade animations at 60fps on mobile (CSS opacity transitions only; no JS RAF loops).
- [ ] BB. Session state ephemeral (no localStorage persistence across reload — sessions just end on refresh per W19; no context provider; component-level `useState` / `useReducer` only — W18).

**Testing (~14 tests):**

- [ ] CC. At least 14 tests covering prompt shuffling, activity recording happy path, early-exit flow, length deep-linking (valid + invalid), reduced-motion, auth gating, accessibility (axe-core).

---

## Testing Notes

Per `06-testing.md` + brief § 9 Test Specifications:

### Frontend unit tests (~3)

1. `pray-session-prompts.ts` module load — validates array lengths (2/5/8), `fixedPosition` correctness, non-empty `text`, positive `silenceMs`. Throws on validation failure (assert throw with `import` wrapped in try/catch in test).
2. `shufflePrompts(length)` function (lives in `usePraySession.ts` or a sibling utility — plan picks) — given a length, returns array with first prompt fixed at position 0 and (for 5-min and 10-min) last prompt fixed at last position. Run 100 times and check positions 2..N-1 are randomized (statistical test: at least 2 distinct orderings observed).
3. `PrayLengthPicker` component — renders 3 buttons with correct labels and subtitles; each button has correct `aria-label` ("1 minute, Quick pause" etc.); 44×44 px touch targets.

### Frontend component integration tests (~8 using Vitest fake timers)

4. `<PraySession length={1}>` — renders prompt 1 immediately; advances 31.5s; verifies prompt 2 visible; advances 26s; verifies Amen screen mounted; advances 3s; verifies redirect to `/daily?tab=pray` (no length).
5. `<PraySession length={5}>` — runs full 5-min session with fake timers; verifies all 5 prompts visible in order (respecting shuffle of positions 2..4); verifies `recordActivity('pray', 'daily_hub_session', { metadata: { length: 5, ended_early: false, prompts_seen: 5, audio_used: false }})` fired exactly once on completion.
6. End-early at prompt 3 of 10-min session — verifies `recordActivity` fired with `{ length: 10, ended_early: true, prompts_seen: 3, audio_used: false }`; verifies immediate transition to Amen screen (no fade-out of current prompt); verifies redirect after 3s.
7. Deep-link `?length=5` query param — session starts immediately; URL has `length` param removed after first render (`setSearchParams({ tab: 'pray' }, { replace: true })` called once); picker NOT rendered.
8. Deep-link `?length=invalid` — picker view rendered; no session started; no error toast (Gate-G-DEEP-LINK-GRACEFUL).
9. Deep-link `?length=5&tab=journal` — `length` param ignored; journal tab renders; no session started.
10. Reduced-motion preference (`matchMedia` mock returns `(prefers-reduced-motion: reduce)` match) — global safety net applies; verify prompt transitions have effectively 0 animation duration. Silence intervals MUST still be the full D-SilenceTiming durations (this test guards against the easy mistake of reducing timing along with animation).
11. Auth gating — unauthenticated user taps PrayLengthPicker button → auth modal opens; session NOT started; `recordActivity` NOT called (hook is no-op for unauthenticated anyway, but verify at the click-handler layer too).

### Playwright E2E (~2 scenarios — `frontend/e2e/pray-session.spec.ts`)

12. **1-minute session happy path:** Login, navigate to `/daily?tab=pray`, click "1 minute" picker button, verify session view opens, wait ~62s real time, verify Amen screen, verify redirect to `/daily?tab=pray`, verify dashboard reflects pray activity completion (and +10 points per R-OVR-4).
13. **Early-exit variant:** Login, click "5 minutes", wait ~30s (mid-session, real time), click End-early button, verify immediate transition to Amen, wait 3s, verify redirect, verify activity recorded with `ended_early: true` (assert via dashboard or via a backend log check — plan recon picks).

Wall-clock cost for #12: ~70s including setup. Acceptable. 5-min and 10-min full Playwright runs are NOT in scope — fake-timer integration tests (#5 + #6) cover those at near-instant speeds.

### Accessibility tests (~1)

14. **Axe-core scans** on three views (picker, session during prompt display, Amen screen) — zero violations on each.

### Test count expectation

Spec is **M** size → 10-20 tests per `06-testing.md` § "Test Count Expectations". 14 tests targeted. Includes the **reactive store consumer test pattern** (`06-testing.md` § "Reactive Store Consumer Pattern") — N/A for 6.2b since this spec does not introduce a new reactive store (no `wr_*` localStorage write — R-OVR-5 deferred the audio key to 6.2c).

---

## Notes for Plan Phase Recon

These items are PLAN-RECON-REQUIRED. The brief's R3-R10 plan-recon items are restated here with R-OVR adjustments. Plan recon resolves each before generating the implementation plan.

1. **R3-resolved:** Backend `ActivityRequest.metadata` accepts arbitrary `Map<String, Object>` — verified at spec authorship (R-OVR-V1). NO backend change needed.
2. **R-OVR-1 plan-time decision:** Pick Option A (expand `RecordActivityOptions.metadata` and forward through `postActivityToBackend`) vs Option B (PraySession bypasses `recordActivity` for backend dual-write). Read `frontend/src/services/activity-backend.ts` (or wherever the helper lives) to confirm signature and pick. Recommendation: Option A. Document in Plan-Time Divergences.
3. **R4 / R-OVR-5 plan-time decision: NONE needed — already resolved.** Audio toggle is DEFERRED to Spec 6.2c per R-OVR-5. Do NOT touch Music feature audio cluster. Do NOT introduce `wr_prayer_session_audio_preference` in 6.2b.
4. **R6: useCompletionTracking integration.** Read `frontend/src/hooks/useCompletionTracking.ts` (the hook exists per the constants/hooks recon — `useCompletionTracking` is in the hooks dir). Decide: PraySession completion calls `markPrayComplete()` (existing untimed pray, used by PrayTabContent at line 151) OR `markGuidedPrayerComplete()` (existing audio-guided sessions). Recommendation: `markPrayComplete()` because 6.2b is a "real" pray (silent prompts, no audio narration), and it should de-dupe daily with the existing untimed pray flow. Verify: does the hook handle midnight reset correctly? Are there dashboard-checklist implications? Document the chosen integration point.
5. **R7 / R-OVR-6: Auth gating implementation.** Confirm PrayLengthPicker uses `useAuthModal()` for the click-handler auth gate (consistent with existing PrayTabContent). Pick Option C-1 or C-2 from R-OVR-6 for the deep-link-while-unauthenticated edge case. Document.
6. **R8 / R-OVR-5: localStorage key registry.** NO new key in 6.2b (R-OVR-5 deferred `wr_prayer_session_audio_preference` to 6.2c). NO change to `.claude/rules/11-local-storage-keys.md` for this spec.
7. **R9: Crossfade animation duration.** Pick Option D-1 / D-2 / D-3 from "Visual System Integration" → Animation tokens. Recommendation: Option D-2 (add `meditative` token to `animation.ts`). Document.
8. **R10: PrayTabContent prompt-display pattern.** Read `frontend/src/components/daily/PrayTabContent.tsx` end-to-end. Confirm PrayLengthPicker placement (above or below the existing PrayerInput / "Help Me Pray" CTA / GuidedPrayerSection sections). The picker should NOT compete with the existing flow but should be discoverable. Recommendation: above the existing PrayerInput, framed as a calmer alternative to the "Help Me Pray" generation flow. Document.
9. **NEW: Option E-1 vs E-2 — full-screen overlay vs inline.** Recommendation: Option E-1 (immersive full-screen overlay, mirrors BibleReader pattern, mounts own skip link). Plan recon confirms this matches the "looking out into space" Spec Y / Visual Rollout 1A philosophy and is technically feasible without breaking the DailyHub `<BackgroundCanvas>` layering.
10. **NEW: Where does `postActivityToBackend` live?** Grep for the export. Likely `frontend/src/services/activity-backend.ts` (per Phase 2 conventions in `09-design-system.md`). Confirm the helper's signature and pick R-OVR-1 Option A or B accordingly.
11. **NEW: Pre-execute Eric approval gate (Gate-G-PROMPT-COPY).** Before `/execute-plan-forums` runs, Eric reviews and approves the prompt set in the Copy Deck section (or edits it). This is lower-ceremony than 6.1's Gate-29 (60 verses) — only 15 prompts to review, all in the Copy Deck above. CC during execute may light-edit by ≤2 words per prompt for layout fit but MUST NOT replace a prompt wholesale.

---

## Plan-Time Divergence Reporting

Per Spec 6.1 § Plan-Time Divergences and Spec 6.2 § Plan-Time Divergences pattern, the generated plan from `/plan-forums` MUST include a "Plan-Time Divergences" section documenting:

- Decision on R-OVR-1 (Option A or B)
- Decision on R-OVR-6 (Option C-1 or C-2)
- Decision on animation duration (Option D-1, D-2, or D-3)
- Decision on session overlay style (Option E-1 or E-2)
- Decision on `useCompletionTracking` integration point (`markPrayComplete` vs `markGuidedPrayerComplete`)
- Decision on PrayLengthPicker placement within PrayTabContent
- Any other divergences from this spec that surface during plan-time recon

If the plan diverges from a brief-level decision (MPD-1 through MPD-10), the divergence MUST be justified in writing in the plan body. Justifiable divergences are welcome; surface them.

---

## Phase 3 Execution Reality Addendum Applicability

Per master plan v2.9 + the Phase 3 Execution Reality Addendum referenced in `02-security.md` § "Forums Wave Rate Limits" and `03-backend-standards.md` § "Forums Wave Master Plan Integration":

| Addendum item | Applicability | Notes |
|---|---|---|
| 1. Edit-window endpoints return 409 `EDIT_WINDOW_EXPIRED` | **N/A.** | No new endpoints. |
| 2. (deferred) | — | — |
| 3. `@Modifying(clearAutomatically=true, flushAutomatically=true)` on bulk JPQL | **N/A.** | No new repositories. |
| 4. SecurityConfig method-specific rules ABOVE `OPTIONAL_AUTH_PATTERNS` | **N/A.** | No new endpoints. |
| 5. Per-feature rate limits / idempotency caches use Caffeine-bounded pattern | **N/A.** | No new endpoints. Reuses existing `POST /api/v1/activity` which has its own rate limiting per `02-security.md`. |
| 6. Domain advices package-scoped | **N/A.** | No new advices. |
| 7. User-generated content uses `CrisisAlertService.alert(contentId, authorId, ContentType)` | **N/A.** | No user-generated content. Prompts are read-only static strings (MPD-10). |
| 8. (deferred) | — | — |
| 9. New ActivityType values update both backend enum AND frontend `ACTIVITY_POINTS` (current total: 13 incl. INTERCESSION) | **N/A.** | 6.2b reuses existing `'pray'` (R-OVR-3). NO new ActivityType. Backend enum count stays at 13. |

Pattern A reference (per the addendum-related sanity check in `/spec-forums` skill self-review): N/A — 6.2b does not introduce a new reactive store. Sessions are ephemeral component state (W18). The `useFaithPoints` reactive integration is via the existing hook (Pattern A — `useSyncExternalStore`-based hook, already documented in `11-local-storage-keys.md`).

---

## Out of Scope

Explicitly NOT in 6.2b (some deferred to future specs, some anti-features):

- **Audio toggle / ambient audio during sessions** — DEFERRED to Spec 6.2c per R-OVR-5 (Decision 24 audio cluster integrity).
- **Custom user-authored prompts** — future spec if user feedback shows demand.
- **Group prayer sessions** ("pray together for 5 minutes with a friend") — different feature category.
- **Voice-guided sessions** (audio narration of prompts) — accessibility consideration; deferred to future a11y-focused spec.
- **Specific prayer lists loaded into session** ("pray for everyone on my prayer list") — different feature.
- **Custom length picker** (e.g., user-picked 3 minutes) — three locked options only; per master plan stub line 5156 recommendation.
- **Session resumption across page reload** — sessions are ephemeral; reload = lost session.
- **Streak-based unlocks tied to Pray sessions** — existing streak math handles this orthogonally; no new streak surface in 6.2b.
- **Notification on session completion** ("You prayed for 5 minutes!") — anti-pressure; the activity log is the only record needed.
- **Cross-session analytics dashboards** ("You've prayed 15 times this month") — existing dashboard handles activity counts; no new analytics surface.
- **Premium length options** (e.g., 30-minute sessions paywalled) — free for everyone; no premium gating.
- **Crisis-keyword detection** — N/A per MPD-10; no text input field in PraySession.

---

## Out-of-Band Notes for Eric

(Preserved verbatim from brief § 7 D-SilenceTiming + master plan stub Out-of-band notes.)

1. **The silences matter more than the prompts.** Test with 60-second silences first; if they feel too long, shorten to 45. Do not shorten below 30 — there's research on meditation apps showing that anything under 30 seconds between prompts trains users out of actually settling.
2. **The "End early" button being always-visible is non-negotiable.** Every hidden-exit app feels hostile within two sessions.
3. **Pre-execute approval gate (Gate-G-PROMPT-COPY):** review the 15-prompt curated set in the Copy Deck. Edits welcome. Lower-ceremony than 6.1's 60-verse Gate-29.
4. **Wall-clock test cost:** Playwright #12 takes ~70s real-time for the 1-minute session E2E. 5-min and 10-min full Playwright runs are NOT in scope.

---

## Pipeline

This spec → `/plan-forums _specs/forums/spec-6-2b.md` → `/execute-plan-forums _plans/forums/<date>-spec-6-2b.md` → `/code-review` → `/verify-with-playwright _plans/forums/<date>-spec-6-2b.md`. The Playwright verification step IS required (frontend changes — Section "Affected Frontend Routes" lists the user-facing surfaces). Verification must cover:

- Picker visible on `/daily?tab=pray`
- Deep-link `?length=1` starts a 1-min session directly
- Deep-link `?length=invalid` shows picker silently
- 1-minute session happy path end-to-end (real wall-clock)
- Early-exit at mid-session records activity correctly
- Reduced-motion respects timing (use `prefers-reduced-motion: reduce` emulation)
- Screen reader: `role="status"` + `aria-live="polite"` announcements verified
- Axe-core zero violations on all three views

---

## End of Spec
