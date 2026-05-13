# Forums Wave: Spec 6.4 — 3am Watch (v1)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.4 (lines 5202–5318, ~117 lines of stub).
**Source Brief:** `_plans/forums/spec-6-4-brief.md` (1054 lines, authored 2026-05-13 — **the brief is binding for design intent; brief wins over master-plan stub where they diverge** per MPD-1 through MPD-15). This spec's **Recon Reality Overrides** (R-OVR-S1 through R-OVR-S7 below) win over the brief where the brief's recon is wrong on disk. Rules-file standards in `.claude/rules/01-ai-safety.md`, `02-security.md`, `04-frontend-standards.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md`, `11-local-storage-keys.md`, `12-project-reference.md` win over both brief and spec on cross-cutting conventions.
**ID:** `round3-phase06-spec04-three-am-watch`
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `git rebase`, no `git merge`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted. See brief § 1 / W1.)
**Date:** 2026-05-13.
**Tier:** **MAX** (highest in this wave; crisis-adjacent UX with real wellbeing stakes; multiple HARD safety gates; first backend changes in the 6.x phase; explicit AI-auto-reply prohibition that must be documented for future-spec compliance).

---

## Affected Frontend Routes

6.4 v1 is **frontend + minimal backend** (no DB changes; one query parameter accepted on existing `GET /api/v1/posts`). The user-facing surface is the Prayer Wall family of routes (where Watch UI elements mount when active) plus the Settings page (where the opt-in toggle lives). `/verify-with-playwright` is **REQUIRED** after `/code-review` for v1 (brief § 3 Frontend Playwright + § 9 Playwright E2E).

- `/prayer-wall` — main feed; `<WatchIndicator />` mounts in PrayerWall header when `useWatchMode().active === true`; `<CrisisResourcesBanner />` mounts at the top of the feed area when active; composer placeholder swaps to the Watch variant; `<QuestionOfTheDay />` renders nothing when active (suppression handled inside the QOTD component reading `useWatchMode().active`).
- `/prayer-wall/:id` — single-post detail; same Prayer-Wall-family treatment if Watch is active (plan-recon R6 confirms whether detail page reuses the Prayer-Wall layout shell — if so, banner + chip ride along automatically; if not, each page applies the elements itself).
- `/prayer-wall/dashboard` — author's dashboard; same treatment (plan-recon R6).
- `/prayer-wall/user/:id` — public profile feed; same treatment (plan-recon R6).
- `/settings` — Settings page gains a new "Sensitive features" section (MPD-11) containing the `<WatchToggle />` 3-radio control (`'off'` / `'auto'` / `'on'`, default `'off'`). Tapping `'auto'` or `'on'` opens `<WatchOptInConfirmModal />` (a transient overlay, not a route). Tapping `'off'` persists immediately without confirmation.

Out-of-scope routes that MUST stay unchanged regardless of Watch state (per Gate-G-SCOPE-PRAYER-WALL-ONLY inherited from 6.3, plus Watch's narrower scope of "Prayer Wall when active"):

- `/`, `/daily`, `/grow`, `/music`, `/bible`, `/bible/*`, `/ask`, `/local-support/*`, `/insights`, `/insights/monthly`, `/friends`, `/profile/:userId`, `/my-prayers`, `/accessibility`, `/community-guidelines`, every other public + protected route enumerated in `.claude/rules/12-project-reference.md`. None receive Watch UI elements regardless of `useWatchMode().active`.

---

## STAY ON BRANCH

Same as the rest of the wave (6.1, 6.2, 6.2b, 6.3). Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command at any phase (spec, plan, execute, review). Eric handles git manually. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`) is permitted. See brief § 1 (W1).

**6.4-specific extra discipline (brief § 1 paragraph 3):** ANY safety-classified change during execute — Watch toggle UX, crisis banner copy, confirmation modal copy, classifier integration paths, share-disabled enforcement, fail-closed defaults — requires Eric's explicit chat sign-off BEFORE the change lands on disk. Execute may NOT implement a safety-classified surface differently from the brief/spec without pausing for confirmation. Violation halts execute and flags.

---

## Recon Reality Overrides (2026-05-13)

**This section is the gate where the brief's recon meets disk reality at spec authorship.** Pattern follows Spec 3.7 § Recon R1/R2/R3 and the prior 6.x specs (6.1 § R-OVR-S1, 6.2 § R-OVR-1 through R-OVR-3, 6.3 § R-OVR-S1 through R-OVR-S3). The codebase wins on facts; the brief's design intent (D-Scope through D-OptOutFriction; MPD-1 through MPD-15; W1 through W35; the new gates Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE / Gate-G-NO-AI-AUTO-REPLY / Gate-G-NO-ENGAGEMENT-METRICS / Gate-G-TRUST-LEVEL-SERVER-ENFORCED / Gate-G-DETERMINISTIC-FEED / Gate-G-DEGRADED-MODE / Gate-G-COPY / Gate-G-A11Y / Gate-G-FAIL-CLOSED-OPT-IN) is **preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim or its premise.**

**The brief was authored before significant safety + friends infrastructure landed.** Two of the brief's brief-recon claims (R2, R4) are now stale on disk. **The recon overrides DO NOT change v1 scope** — v1 still ships framework only with no feed slicing (per MPD-1 / D-Scope, justified by safety discipline, not by infrastructure absence). What changes is the **rationale** behind the v1/v2 split: several pieces 6.4b will need are already on disk and 6.4b's lift will be smaller than the brief assumes.

### R-OVR-S1 — Brief R2 "Friend system: PARTIAL (DB tables, no Java)" is WRONG on disk

**Brief claim (§ 5 R2):** *"`backend/src/main/java/com/worshiproom/friends/` directory does NOT exist. Friend system was DB-prepped in Phase 2.5.1 but the Java service layer is unbuilt."*

**Disk reality (2026-05-13):** `backend/src/main/java/com/worshiproom/friends/` exists and is fully populated:

- `FriendsController.java`, `FriendsService.java`, `FriendsExceptionHandler.java`, `FriendsValidationExceptionHandler.java`
- `FriendRelationship.java`, `FriendRelationshipId.java`, `FriendRelationshipRepository.java`, `FriendRelationshipStatus.java`, `FriendRelationshipStatusConverter.java`
- `FriendRequest.java`, `FriendRequestRepository.java`, `FriendRequestStatus.java`, `FriendRequestStatusConverter.java`
- `FriendsListProjection.java`, `WeekStartCalculator.java`
- Exception types: `AlreadyFriendsException`, `BlockedUserException`, `DuplicateFriendRequestException`, `FriendRequestNotFoundException`, `InvalidInputException`, `InvalidRequestStateException`, `NotBlockedException`, `NotFriendsException`, `SelfActionException`, `UnauthorizedActionException`, `UserNotFoundException`
- `dto/` sub-package with friend-related DTOs

The friend system Java layer **shipped in Phase 2.5** (per CLAUDE.md Phase 2.5 status). A friend-lookup-based feed slice in 6.4b is technically achievable today — it's deferred for **scope discipline**, not infrastructure absence.

**Disposition for v1:** No change to v1 scope. **MPD-4 (Friend system OMITTED from v1) stands** but its premise is reframed: friend slicing in 6.4b is deferred as a scope decision (keep v1 small, ship the framework + banner without the slicing complexity), NOT because friend Java is unbuilt. Plan/execute do NOT introduce friend lookups in v1 regardless. **Brief W22 ("NO friend lookup in v1, NO calls to friend-relationship tables") is HONORED VERBATIM in v1.**

**Disposition for 6.4b future spec:** 6.4b's friend-slice section can directly consume `FriendsService` and `FriendsListProjection` once authored. The 6.4b brief should be updated to reflect this when it's drafted (not in this spec).

### R-OVR-S2 — Brief R4 "Crisis classifier: DOES NOT EXIST" is WRONG on disk

**Brief claim (§ 5 R4):** *"NO `*Crisis*` Java files anywhere in `backend/src/main/java/com/worshiproom/`."*

**Disk reality (2026-05-13):** `backend/src/main/java/com/worshiproom/safety/` exists and is fully populated:

- `CrisisAlertService.java` — canonical alert side-effect service. Method signature `alert(UUID contentId, UUID authorId, ContentType type)`. Logs structured INFO + emits Sentry WARNING. **CLAUDE.md Phase 3 Execution Reality Addendum item 7 makes this service the MANDATORY entry point for user-generated-content crisis flagging — "do NOT introduce sibling alert services."** v1 does not invoke `CrisisAlertService` directly (no UGC creation in v1's surface), but ANY future 6.4b code that operates on crisis-flagged posts MUST respect the existing alert pipeline and NOT duplicate it.
- `CrisisDetectedEvent.java` + `CrisisDetectedEventListener.java` — Spring application-event pipeline, fires AFTER_COMMIT so alerts only fire for content that successfully persisted.
- `PostCrisisDetector.java` + `CommentCrisisDetector.java` — keyword-match detectors invoked from `PostService` (already wired at `PostService.java:269` — `boolean crisisFlag = PostCrisisDetector.detectsCrisis(detectionInput);`) and `CommentService` respectively.
- `CrisisResource.java` (single resource record) + `CrisisResources.java` (static `RESOURCES` list — 988 + Crisis Text Line + SAMHSA + `INTRO_MESSAGE`) + `CrisisResourcesBlock.java` (response-payload DTO returned alongside `PostDto` on crisis-flagged post creation).
- `ContentType.java` — enum discriminator (`POST` / `COMMENT`).

The crisis-detection pipeline **shipped during Phase 3** (Spec 3.8 / 10.5 precursor work — the keyword-based first-tier detector). What is NOT shipped: the AI-classifier-fronted three-tier escalation per master plan Spec 10.5/10.6, and Trust Level (R3 verified correct below). Crisis-flag DATA is already on Post (`Post.crisisFlag` boolean at `Post.java:67`, mirrored in `PostDto.crisisFlag` at `PostDto.java:29`).

**Disposition for v1:** No change to v1 scope. **MPD-3 (Crisis classifier is a NO-OP STUB in v1) stands** but its premise is reframed: v1 doesn't perform classifier checks because v1 doesn't do feed slicing — NOT because the classifier doesn't exist. v1 does NOT invoke `CrisisAlertService`, `PostCrisisDetector`, or any other safety/* class. **W20 ("NO classifier integration in v1, NO `Crisis*` imports, NO calls to a crisis-classification service") is HONORED VERBATIM in v1.**

**Crucial 6.4b implication (documented for the future spec, NOT v1 work):** 6.4b's crisis-flagged feed slice can read `Post.crisisFlag` directly from existing data — it does NOT need to invoke the detector. The data is already populated for every post in the database. 6.4b's lift is "filter `WHERE crisis_flag = true AND created_at > now() - 24h`," not "build a classifier integration." The full master plan 10.5/10.6 escalation (AI classifier + moderator queue + green/yellow/red tiers) is still pending and **6.4b should NOT block on 10.5/10.6 if the keyword-based `crisisFlag` is sufficient for the night-watch slice.** The 6.4b brief author will make that call.

**Crucial cross-feature implication:** the existing `frontend/src/constants/crisis-resources.ts` (which exports `CRISIS_RESOURCES`, `SELF_HARM_KEYWORDS`, `containsCrisisKeyword`) is the canonical client-side crisis-data source per CLAUDE.md `01-ai-safety.md` § "Crisis Resources (Hardcoded Constants)". **The new `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` (v1 file-to-create) MUST import + reuse `CRISIS_RESOURCES` from this module** rather than inline-authoring its own 988/Crisis-Text-Line/SAMHSA strings. The visible-text "Call or text 988" and "Chat with 988 online" labels from D-CrisisBannerCopy are the banner's UI copy; the underlying resource data (phone numbers, URLs) comes from the constants module. The backend `CrisisResources.java` is the parity mirror — any future content change to `CRISIS_RESOURCES` must update both per the existing `CrisisResourcesParityTest`.

### R-OVR-S3 — Brief R3 "Trust Level infrastructure: DOES NOT EXIST" is CORRECT on disk

**Brief claim (§ 5 R3):** *"NO `*Trust*` Java files anywhere in `backend/src/main/java/com/worshiproom/`."*

**Disk reality (2026-05-13):** Verified — no `TrustLevel`, `trust_level`, `trustLevel` references in production code. (The handful of grep hits — `IpResolver.java` "trusting them", `AskService.java` "Trust in Yahweh", `ProxyConfig.java` `trustForwardedHeaders` — are unrelated semantic uses of the word "trust.") No trust-level entity, no `users.trust_level` column, no enforcement filter, no `@PreAuthorize("hasTrustLevel(...)")` annotation pattern.

**Disposition for v1:** **MPD-2 (Trust Level enforcement is a server-side STUB in v1) stands verbatim and is RATIFIED.** The v1 stub at `PostController.getPosts(... @RequestParam(value = "watch", defaultValue = "false") boolean watch)` accepts the parameter and ignores it (pass-through to standard handler with `// TODO Spec 10.4: enforce Trust Level 2+` comment). **W21 ("NO trust level check in v1. ANY authenticated user can opt in") is HONORED VERBATIM.**

### R-OVR-S4 — Existing frontend `CrisisBanner` component is keyword-triggered; new `CrisisResourcesBanner` is Watch-triggered (deliberately different)

**Disk reality (2026-05-13):** `frontend/src/components/daily/CrisisBanner.tsx` already exists. Its prop signature is `{ text: string }`. It renders an alert banner with the 988 / Crisis Text Line / SAMHSA resources, gated by `containsCrisisKeyword(text)` from `@/constants/crisis-resources`. Currently consumed by: `MoodCheckIn`, `EveningReflection`, `GratitudeWidget`, `InlineComposer` (Prayer Wall composer), `CommentInput`, `QotdComposer`. Treatment: `role="alert"` + `aria-live="assertive"`, frosted warning palette (`bg-warning/10 border-warning/30`).

**Disposition for v1:** Brief § 10 mandates creating `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` as a NEW file. **This is the correct call** — the new banner has fundamentally different semantics:

| Aspect | Existing `daily/CrisisBanner.tsx` | New `prayer-wall/CrisisResourcesBanner.tsx` (v1) |
|---|---|---|
| **Trigger** | Keyword-detected in user input text | Watch mode active (time + opt-in) |
| **Dismissibility** | Implicit (disappears when text changes) | **Non-dismissible during Watch session** (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE / D-NoDismissal) |
| **ARIA** | `role="alert"` + `aria-live="assertive"` | `role="region"` + `aria-labelledby` (NOT alert — banner is ambient harm-reduction infrastructure, not a reactive alert to crisis input) |
| **Copy framing** | Reactive: "If you're in crisis, help is available:" | Calm: "You're not alone" + "If you're going through something heavy right now, support is available." |
| **Visible-text labels** | "988" / "Text HOME to 741741" / "1-800-662-4357" raw | "Call or text 988" / "Chat with 988 online" (per D-CrisisBannerCopy) |
| **Chat link** | Not present | Required: `https://988lifeline.org/chat/` opens in new tab |
| **Surface scope** | Used inline near textareas across multiple features | Mounted at top of `/prayer-wall` feed only |

The two banners coexist by design. v1 does NOT modify `daily/CrisisBanner.tsx`. Plan-execute MUST **reuse the underlying `CRISIS_RESOURCES` constants from `@/constants/crisis-resources`** in the new banner (so phone numbers and URLs come from a single source of truth) but author the new visible-text labels per D-CrisisBannerCopy. **Adding a new entry to `CRISIS_RESOURCES`** (e.g., a `chat_url` field on the `suicide_prevention` entry to expose the chat link) is acceptable and probably necessary; this counts as a content-management change that must ALSO update `backend/src/main/java/com/worshiproom/safety/CrisisResources.java` per the parity rule (see `CrisisResourcesParityTest`). Plan should call out this decision explicitly.

### R-OVR-S5 — `useNightMode()` hook ships with `{active, source, userPreference}` exactly as brief assumed

**Disk reality (2026-05-13):** `frontend/src/hooks/useNightMode.ts` exists. Return type:

```typescript
export interface UseNightModeReturn {
  active: boolean
  source: 'auto' | 'manual'
  userPreference: NightModePreference
}
```

Polling tick is 60_000ms via `setInterval`, cleared on unmount (matches brief's D-LivePolling reuse).

**Disposition for v1:** Brief's D-HookAPI for `useWatchMode()` (which composes useNightMode + opt-in + hours) is buildable as-specified. The brief's claim that the new hook reuses 6.3's 60s tick is achievable by either (a) consuming `useNightMode()` directly and inheriting its tick, or (b) having `useWatchMode` run its own 60s `setInterval`. **Plan-recon (RR7) determines which approach is cleaner.** Recommend (a) since `useWatchMode` needs `useNightMode().active` anyway for the `'auto'` preference branch — reusing the tick avoids two timers running in parallel. The brief implicitly assumes (a) per W5 / Gate-6.

### R-OVR-S6 — `UserSettingsPrayerWall` namespace already exists with `prayerReceiptsVisible` + `nightMode`; brief proposes adding `watchEnabled`

**Disk reality (2026-05-13):** `frontend/src/types/settings.ts:39-56`:

```typescript
export interface UserSettingsPrayerWall {
  prayerReceiptsVisible: boolean         // Spec 6.1
  nightMode: NightModePreference         // Spec 6.3
}
```

**Disposition for v1:** Brief's D-PreferenceStates adds `watchEnabled: WatchPreference` to this same interface. **Type-naming consistency note:** brief uses `watchEnabled` as the field name (carryover from `prayerReceiptsVisible`); 6.3 used the shorter `nightMode` (preference value typed as `NightModePreference`). The brief's name is acceptable — `enabled` reads naturally as a 3-state preference field (the value still conveys off/auto/on via the `WatchPreference` type alias). Plan/execute MUST use `watchEnabled: WatchPreference` exactly as the brief specifies. The TypeScript type alias is also `WatchPreference` per brief D-PreferenceStates (`type WatchPreference = 'off' | 'auto' | 'on'`).

Default value: `'off'` (per D-OptInDefault). Plan-recon (RR4) reads `frontend/src/services/settings-storage.ts` to confirm the default-settings shape extension point and `frontend/src/hooks/useSettings.ts` for the consumption pattern; these were verified shipping for 6.1 + 6.3 so the extension is mechanical.

### R-OVR-S7 — `PrayerWall.tsx` already consumes `useNightMode()` at line 95; the integration target for `useWatchMode()` is straightforward

**Disk reality (2026-05-13):** `frontend/src/pages/PrayerWall.tsx` is 1125 lines and already imports `useNightMode` at line 13, consumes it at line 95 (`const { active: nightActive, source: nightSource } = useNightMode()`), uses it to drive composer tooltip behavior, and the page is wrapped by `PageShell.tsx` (which already applies `data-night-mode={active ? 'on' : 'off'}` at the root). QOTD is imported at line 24 (`QuestionOfTheDay`) and mounted at line 918. Composer state is at lines 117 / 286-288. The page already has the architecture 6.4 needs.

**Disposition for v1:** Brief § 10 "Files to MODIFY" — `frontend/src/pages/PrayerWall.tsx` (consume `useWatchMode`, mount `<CrisisResourcesBanner />` at feed top, mount `<WatchIndicator />` in header, pass watchActive to composer for placeholder swap). **This is straightforward additive work** alongside the existing useNightMode consumption. Plan-recon (RR6 / RR8 / RR9 from brief § 5) picks the exact DOM insertion points; the recon questions are answerable from this file alone.

**QOTD suppression (MPD-14, D-FeedSortStub-adjacent):** `QuestionOfTheDay` component is the modification target. Plan picks: either (a) the QOTD component reads `useWatchMode().active` and renders `null`, or (b) PrayerWall.tsx conditionally renders the QOTD subtree based on `watchActive`. Recommend (a) per MPD-14 ("frontend check, NOT a server change") so the suppression logic lives with the component, not as a render-tree branch in the parent. Brief is explicit that the API doesn't change.

### R-OVR-S8 — Brief R5 ratifies (no `WatchFeedService.java`, no `feed/` package), R6 ratifies in spirit (no separate `PrayerWallFeed.tsx`; feed lives inside `PrayerWall.tsx`)

**Disk reality (2026-05-13):** No `backend/src/main/java/com/worshiproom/feed/` directory. No `WatchFeedService.java`. No `PrayerWallFeed.tsx` separate component — feed-rendering logic lives inside `frontend/src/pages/PrayerWall.tsx` as confirmed by R-OVR-S7 above. Brief § 10 "NOT to modify" correctly excludes both.

**Disposition for v1:** No backend service creation. The `?watch=true` query parameter handling is a MINIMAL edit to `backend/src/main/java/com/worshiproom/post/PostController.java` (accept the param, pass-through to standard handler, ignore the param value in v1 logic). 6.4b will introduce the dedicated re-sort logic — possibly in `WatchFeedService` (new file) or possibly as a `PostSpecifications` extension (`PostSpecifications.java` already exists per R1). That decision belongs to the 6.4b spec, not v1.

---

**Recon override disposition summary:** Brief design intent for v1 (15 MPDs, 16 decisions, 35 watch-fors) is **PRESERVED VERBATIM** with no behavioral changes. Three of the brief's recon assumptions (R2, R4, and partially R6) are stale on disk; this changes the **reasoning** behind several deferral decisions but NOT the deferral decisions themselves. **v1 ships exactly the surface the brief authored.** The recon overrides serve two purposes: (1) preventing plan/execute from being confused if they grep for things the brief said don't exist and find them, (2) flagging for the future 6.4b spec author that 6.4b's lift will be smaller than the brief assumed because friend Java and crisis-flag data are already in place.

---

## Metadata

- **ID:** `round3-phase06-spec04-three-am-watch`
- **Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop — 6.4 is the fourth and final spec of Phase 6 in this wave; sits atop 6.1 Prayer Receipt, 6.2 Quick Lift, 6.2b Quick Lift follow-up, and 6.3 Night Mode; the most safety-critical surface in the entire phase)
- **Size:** L for v1 (per master plan; brief ratifies — six new components + one new hook + one new pure-functions lib + one new constants file + one new rules file + modifications to PrayerWall.tsx + Settings.tsx + composer + QOTD + types/storage + minimal backend + ~30 tests; spans frontend + backend; v2 deferred to a future Spec 6.4b that would be XL on its own)
- **Risk:** **HIGH** per master plan; **brief escalates the operational treatment to MAX tier** for spec/plan/execute because of (a) crisis-adjacent UX with real wellbeing stakes, (b) multiple HARD safety gates that block code-review approval on violation, (c) un-shipped target infrastructure for 6.4b requiring degraded-mode-as-default design, (d) first backend changes in 6.x, (e) explicit AI-auto-reply prohibition that must be documented for future-spec compliance. **Practical execution implication:** CC uses Opus 4.7 thinking `xhigh` for ALL phases (no exceptions, even routine edits). See brief § 13 Tier Rationale.
- **Tier:** **MAX** (highest in the Phase 6 wave; rare designation reserved for crisis-adjacent surfaces). Brief § 2 itemizes the rationale at length. Eric reviews: every safety-relevant code path, all crisis-related copy strings (banner / modal / settings / indicator / composer reminder), the fail-closed defaults at every junction, the complete test list with explicit crisis-path coverage, server-side enforcement of every frontend hiding, the `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` content, AND a manual flow-walking at 11pm local time on a fresh account.
- **Prerequisites:**
  - **6.3 (Night Mode) ✅** — shipped, verified via spec-tracker line 164. Provides `useNightMode()` hook (R-OVR-S5 verified return shape), `NightModePreference` type, `wr_night_mode_hint` localStorage key, the `[data-night-mode='on']` CSS attribute selector pattern at `index.css`, and the polling/no-FOUC infrastructure 6.4 builds on. `PageShell.tsx` (which wraps Prayer Wall surfaces with `data-night-mode`) is also from 6.3.
  - **6.2 (Quick Lift) ✅** — shipped (per CLAUDE.md "Recent commits").
  - **6.1 (Prayer Receipt) ✅** — shipped. Provides `UserSettingsPrayerWall` namespace at `frontend/src/types/settings.ts:39` (R-OVR-S6 verified) into which `watchEnabled` is added.
  - **Existing PrayerWall.tsx structure with useNightMode integration** ✅ — verified at `frontend/src/pages/PrayerWall.tsx:13,95` (R-OVR-S7).
  - **Existing Settings + useSettings + settings-storage** ✅ — verified ship from 6.1 (R-OVR-S6 ratified).
  - **Existing PostController + PostService + PostDto** ✅ — verified ship (R-OVR-S8). The v1 stub endpoint is a query-parameter addition to existing GET /api/v1/posts.
  - **NO existing `useWatchMode`, `watch-mode-resolver`, `WatchIndicator`, `CrisisResourcesBanner` (prayer-wall variant), `WatchToggle`, `WatchOptInConfirmModal`, `watch-copy`** ✅ confirmed — 6.4 is genuinely additive. Brief's "Files to CREATE" list is correct.
- **Runtime-gated dependencies (NOT prerequisites for shipping v1; required for full functionality in 6.4b):**
  - **10.4 (Trust Levels)** — NOT SHIPPED (R-OVR-S3 ratified). v1 stubs the trust check; 6.4b enforces.
  - **10.5 (Three-tier escalation pipeline)** — NOT SHIPPED. v1 omits the crisis-flagged feed slice; 6.4b adds it once 10.5 lands (or earlier — see R-OVR-S2 note about the keyword-based `Post.crisisFlag` being sufficient for night-watch slicing without the full 10.5 pipeline).
  - **10.6 (Automated AI flagging classifier)** — NOT SHIPPED. v1 omits classifier-dependent surfaces; 6.4b adds them.
  - **Friend system Java layer** — **SHIPPED per R-OVR-S1.** v1 still omits the friends slice as a scope decision, NOT an infrastructure blocker. 6.4b can wire this up cleanly.
  - **Mental-health post category** — NEEDS PLAN-RECON (RR1 below; brief's R7). v1 doesn't depend on it.
- **No Eric-curated content pre-execute** (unlike 6.1's 60-WEB-verse Gate-29), but THREE Eric-approval gates exist (all Gate-G-COPY HARD):
  - **D-CrisisBannerCopy** — banner heading + body + visible-text labels. Eric reviews + approves before execute.
  - **D-ConfirmationModalCopy** — modal header + body + primary/secondary action labels. Eric reviews + approves before execute.
  - **D-SettingsToggleCopy + D-WatchIndicatorCopy + D-ComposerReminderCopy** — settings section + toggle labels + indicator chip + composer placeholder. Eric reviews + approves before execute.

---

## Goal

Ship a SAFE v1 of 3am Watch: an opt-in framework that lets users who explicitly choose it experience a calmer Prayer Wall during late-night hours (11pm–5am browser-local), with a non-dismissible crisis-resources banner (988 phone + chat link) always visible during Watch hours, a quiet "Watch is on" indicator in the page header, a gentle composer placeholder reminder ("Simple presence matters. You don't need to fix it."), and QOTD suppression. The framework includes a 3-state preference (`'off'` / `'auto'` / `'on'`) in a new "Sensitive features" Settings section gated behind a confirmation modal on opt-in; opt-out is friction-free.

v1 ships **deliberately WITHOUT the feed-slicing functionality** described in the master plan stub (crisis-flagged / mental-health / friends slices, section dividers, share-disabled-on-crisis, trust level enforcement). Those land in a future **Spec 6.4b** once 10.4 / 10.5 / 10.6 (or a scoped-down classifier path per R-OVR-S2) are in place. v1's `?watch=true` query parameter on `GET /api/v1/posts` is a server-side stub that accepts the param and returns standard ordering — establishing API stability without committing to the slicing semantics before they're safe to enforce.

The brief's load-bearing claim is that **the v1 surface itself delivers real harm reduction** — the 988 banner visible during Watch hours, calmer copy in the composer, suppressed engagement prompts (QOTD) — independent of feed prioritization. 6.4 v1 ships this safe degraded mode as the **permanent fallback** for when 6.4b's enhancements are unavailable (Gate-G-DEGRADED-MODE).

6.4 v1 is **frontend-heavy + minimal backend**. The single backend change is a one-line query parameter addition to `PostController` (Spec 4 in `_specs/forums/` lineage of backend-touching specs); no Liquibase changes, no new services, no new packages, no new DTOs. **No new database tables. No new database columns. No new endpoints. No new authentication paths. No new dependencies.** The setting persists via existing dual-write settings infrastructure (`wr_settings.prayerWall.watchEnabled`).

---

## Approach

A new `useWatchMode()` hook composes `useNightMode()` (from 6.3) with a user opt-in setting and a Watch-hours predicate. The hook reads:

1. `UserSettings.prayerWall.watchEnabled` (3-state preference, default `'off'`) via `useSettings()`.
2. `useNightMode()` for Night Mode state (required for `'auto'` preference resolution).
3. Browser-local hour via `new Date().getHours()` (matches 6.3's D-TimeSource).
4. Reuses 6.3's 60-second polling tick via `useNightMode()` (R-OVR-S5 disposition) — no second `setInterval`.

A pure-functions library `frontend/src/lib/watch-mode-resolver.ts` exports `isWatchHour(hour: number): boolean` (returns `true` for `hour >= 23 || hour < 5` — inclusive start of 23, exclusive end of 5) and `resolveWatchModeActive(preference, hour, nightModeActive): boolean`. These are unit-testable in isolation and consumed by `useWatchMode.ts`.

`useWatchMode()` returns `{ active: boolean, source: 'auto' | 'manual', userPreference: WatchPreference, degraded: boolean }`. The `degraded` field is true for v1 (no feed slicing); 6.4b's enhancements toggle it to false. Brief's D-HookAPI is the contract; the field is a forward-compat signal.

**Settings UI:** A new "Sensitive features" section in `Settings.tsx` (plan-recon RR4 picks the exact insertion point) houses `<WatchToggle />`. The toggle is a 3-radio group ("Off" / "Auto" / "Always during late hours" per D-SettingsToggleCopy). Tapping "Auto" or "Always" opens `<WatchOptInConfirmModal />` and does NOT immediately persist the setting; the modal's "Yes, turn on" persists; "Not right now" reverts to the previous state. Tapping "Off" persists immediately without confirmation (D-OptOutFriction).

**Prayer Wall integration:** `PrayerWall.tsx` (which already consumes `useNightMode()` per R-OVR-S7) gains `useWatchMode()` consumption. When `active === true`:
- `<WatchIndicator />` renders in the page header (small "Watch is on" chip, Lora italic, muted, non-interactive — D-WatchIndicatorCopy).
- `<CrisisResourcesBanner />` renders at the top of the feed area, **non-dismissible** (D-NoDismissal / Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE).
- Composer (plan-recon RR3 picks the exact composer component — likely `InlineComposer.tsx`) reads `useWatchMode().active` and swaps the textarea `placeholder` to "Simple presence matters. You don't need to fix it." (MPD-13: placeholder, NOT pre-typed content).
- `<QuestionOfTheDay />` reads `useWatchMode().active` and short-circuits rendering (MPD-14: frontend check, no server change).

**Backend stub:** `PostController.getPosts(...)` accepts an additional `@RequestParam(value = "watch", defaultValue = "false") boolean watch` parameter. In v1, the param is ignored — the handler passes through to the existing PostService logic, returning identical feed ordering whether `?watch=true` or `?watch=false`. Inline `// TODO Spec 6.4b: enforce Trust Level 2+ and apply feed slicing` documents the future enforcement site. Three integration tests cover the param's presence/absence + auth gating + parse-fallback. **No new endpoint, no new package, no new service class.**

**No-FOUC concern:** Inherited from 6.3 via PageShell + the inline `index.html` script. Watch doesn't add a new no-FOUC surface — the Watch indicator + banner mount during normal React hydration; a brief flash of "Night Mode without Watch overlays" for ~50ms during hydration is acceptable (v1 doesn't claim Watch-no-FOUC).

**Fail-closed defaults at every junction (Gate-G-FAIL-CLOSED-OPT-IN):**
- If `useSettings()` returns null/error/undefined → `useWatchMode()` returns `active: false`.
- If `isWatchHour()` is called with an invalid hour → falls back to false.
- If `useNightMode()` hasn't resolved yet → `useWatchMode()` returns `active: false`.
- If the user has never opted in (preference is `'off'`) → `active: false` regardless of hour or Night Mode state.

**`.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` documentation:** A new rule file documenting Gate-G-NO-AI-AUTO-REPLY. Future specs adding AI features must check crisis-classification status before invoking AI on user content. Code review hard-blocks any future PR with `openai`, `anthropic`, `llm`, `claude`, or `gemini` in an import path operating on UGC unless the PR explicitly documents how crisis-content exclusion is enforced. This file is the durable record of that policy.

---

## Master Plan Divergences (MPDs)

**All 15 MPDs from brief § 4 are PRESERVED VERBATIM.** Plan and execute MUST honor the brief, not the master plan stub. Several MPDs have their PREMISES updated by the recon overrides above (R-OVR-S1, R-OVR-S2, R-OVR-S6), but the BEHAVIORS are unchanged.

- **MPD-1 (Scope reduced to v1 framework; feed re-sort logic deferred to 6.4b).** Stub describes full Watch experience with feed slices + section dividers + share-disabled + trust enforcement. v1 ships opt-in flow + Watch indicator + crisis banner + composer reminder + QOTD suppression + Settings UI + server-side stub endpoint. v1 does NOT ship slicing/prioritization/dividers/share-disabled/TL-enforcement. Rationale: shipping framework now without dependent functionality is safer than waiting; avoids the temptation to stub-implement crisis classification (which would carry unacceptable risk of wrong behavior).
- **MPD-2 (Trust Level enforcement is a server-side STUB in v1).** Per R-OVR-S3, Trust Level Java doesn't exist. v1's `?watch=true` endpoint allows any authenticated user; `// TODO Spec 10.4` marker documents the future gate location. Frontend hiding of the WatchToggle for TL<2 users ALSO deferred. Defense-in-depth applies once 10.4 lands.
- **MPD-3 (Crisis classifier is a NO-OP STUB in v1; premise updated per R-OVR-S2).** v1 has NO classifier dependency. Watch activates when (a) user opted in AND (b) browser-local hour in [23..04]. **Premise update:** classifier infrastructure DOES exist on disk (PostCrisisDetector, CrisisAlertService, CrisisResources). v1 doesn't invoke it because v1 doesn't slice the feed — not because the classifier is missing. 6.4b's premise per R-OVR-S2 is therefore easier than the brief assumed.
- **MPD-4 (Friend system OMITTED from v1; premise updated per R-OVR-S1).** v1 has no friend lookup. **Premise update:** Friend Java DOES exist on disk (FriendsService, FriendsListProjection, etc.). v1 omits friend slicing as a scope decision, not as an infrastructure blocker. 6.4b can wire this up cleanly.
- **MPD-5 (3-state preference, `'off' | 'auto' | 'on'`, NOT a binary).** `type WatchPreference = 'off' | 'auto' | 'on'`. UI: 3 radio buttons (NOT toggle switch). Labels per D-SettingsToggleCopy. Default `'off'`.
- **MPD-6 (Watch hours are 11pm–5am local browser timezone, NOT user.timezone column).** `isWatchHour(hour) = hour >= 23 || hour < 5`. Browser-local. Matches 6.3's D-TimeSource. Known limitation: VPN-masked timezone or wrong system clock may yield incorrect mode — accepted. Note: 11pm–5am is a 6-hour span; tighter than 6.3's 9pm–6am Night Mode window.
- **MPD-7 (NO AI auto-reply, HARD; reinforced from master plan).** v1 has no AI integration. Brief mandates future AI specs must honor the prohibition on AI replies to crisis-flagged posts. Documented in new `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` file.
- **MPD-8 (NO engagement metrics during Watch hours, HARD).** Forbidden tracking enumerated in Gate-G-NO-ENGAGEMENT-METRICS below. Aggregate anonymous server-side request counts per hour ARE allowed (capacity planning); user-behavior data forbidden.
- **MPD-9 (NO push notifications for Watch-period content, HARD).** No notification path exists for Watch in v1; future specs must respect.
- **MPD-10 (Crisis banner is ALWAYS visible during Watch hours, HARD).** Single most important v1 behavioral invariant. Tests verify across all v1 surface render paths.
- **MPD-11 (Settings page section named "Sensitive features", specific name).** Exact section heading + helper text per D-SettingsToggleCopy. Section becomes home for future safety opt-in features.
- **MPD-12 (`useWatchMode()` hook composes `useNightMode()` and adds opt-in/hours logic).** New hook at `frontend/src/hooks/useWatchMode.ts`. Returns `{active, source, userPreference, degraded}`. The `degraded` field is forward-compat (v1: true; 6.4b: false once slicing wires).
- **MPD-13 (Composer reminder is a placeholder, NOT pre-typed content).** Rendered as textarea `placeholder` attribute. Disappears on typing. Submitting empty composer with just the reminder visible = empty content (the reminder is not in the textarea value).
- **MPD-14 (QOTD suppression is a frontend check, NOT a server change).** `QuestionOfTheDay` component reads `useWatchMode().active` and short-circuits rendering. No QOTD API change. No new query parameter.
- **MPD-15 (Watch is US-English only for v1).** 988 is US-specific. International users opting into Watch see the same 988 banner. v1 documents the limitation; 6.4b or a follow-up i18n spec adds country-specific banner copy with locale-appropriate crisis hotlines.

---

## Decisions Catalog (D-*)

**All 16 decisions from brief § 7 are PRESERVED VERBATIM.** Implementation must honor each.

- **D-Scope:** v1 ships framework, NOT feed slicing. (MPD-1) See § "Approach" + Section 2.5 of brief for the full v1 vs v2 split.
- **D-OptInDefault:** Preference defaults to `'off'`. NEVER auto-enable for any user. Only path to active state is explicit user opt-in via confirmation flow.
- **D-OptInFlow:** 4-step opt-in:
  1. User has Trust Level 2+ (server-stubbed in v1; future TL check)
  2. User taps "On" or "Auto" radio in Settings
  3. `<WatchOptInConfirmModal />` opens (NOT for opt-out; only for opt-in)
  4. User taps "Yes, turn on" → setting persists; modal closes

  Opt-out: tap "Off" radio → setting persists immediately, no confirmation.
- **D-PreferenceStates:** `type WatchPreference = 'off' | 'auto' | 'on'`; `DEFAULT_WATCH_PREFERENCE: WatchPreference = 'off'`. Stored at `UserSettings.prayerWall.watchEnabled`. Type alias exported for reuse.
  - `'off'` (default): Watch never activates
  - `'auto'`: Watch activates ONLY when Night Mode is also active
  - `'on'`: Watch activates whenever Watch hours [23..04] apply (independent of Night Mode)
- **D-WatchHours:** `[23, 0, 1, 2, 3, 4]` local browser hour.
  ```typescript
  function isWatchHour(hour: number): boolean {
    return hour >= 23 || hour < 5
  }
  ```
  6-hour span. Browser-local. Live re-evaluation via 6.3's 60s setInterval (R-OVR-S5 disposition).
- **D-TrustGateStub:** v1 server-side allows any authenticated user.
  ```java
  // In PostController.getPosts(...)
  @RequestParam(value = "watch", defaultValue = "false") boolean watch
  // ...
  if (watch) {
      // TODO Spec 10.4: enforce Trust Level 2+
      // For v1, all authenticated users may set watch=true; returns standard feed
      // 6.4b: insert trust level check here, return 403 if TL < 2
  }
  return postService.getPosts(/* standard params */);
  ```
  Integration tests verify v1 stub; comments document expected future behavior.
- **D-ClassifierStub:** v1 has NO classifier dependency. Watch activates purely on opt-in + hours. (Premise updated per R-OVR-S2; behavior unchanged.)
- **D-FeedSortStub:** v1 returns standard ordering. `GET /api/v1/posts?watch=true` returns identical results to `GET /api/v1/posts?watch=false`. Param accepted for API stability; doesn't change response.
- **D-CrisisBannerCopy:** Authored inline (Gate-G-COPY).
  - **Banner heading:** "You're not alone"
  - **Banner body:** "If you're going through something heavy right now, support is available. The 988 Suicide and Crisis Lifeline is free, confidential, and open 24/7."
  - **Phone link visible text:** "Call or text 988" — `href="tel:988"` — `aria-label="Call 988 Suicide and Crisis Lifeline"`
  - **Chat link visible text:** "Chat with 988 online" — `href="https://988lifeline.org/chat/"` — `target="_blank"` `rel="noopener noreferrer"` — `aria-label="Open 988 Lifeline chat in new tab"` — standard external-link icon
  - **Tone:** calm, informational, NOT alarming. Framing is "if you need this, it's here" — NOT "are you in crisis?" or "click here for help."
- **D-ConfirmationModalCopy:** Authored inline (Gate-G-COPY). Uses master-plan-stub copy (lines 5314–5318 of master plan) verbatim:
  - **Header:** "Turn on 3am Watch?"
  - **Body:** "You'll see mental-health and crisis-flagged posts prioritized in the feed during late-night hours (11pm – 5am), with crisis resources always visible at the top. Watch is opt-in and won't change your feed during the day."
  - **Primary action:** "Yes, turn on"
  - **Secondary action:** "Not right now"
  - **Honesty caveat (brief W19):** modal copy describes the FULL intended behavior (feed prioritization). v1 doesn't actually do the slicing yet. The crisis banner DOES appear. Brief acknowledges this is a known dissonance for v1; the banner's harm-reduction value justifies the opt-in framing. 6.4b updates the modal copy once slicing actually ships.
- **D-SettingsToggleCopy:** Authored inline (Gate-G-COPY).
  - **Section heading:** "Sensitive features"
  - **Section helper text:** "These features are designed for sensitive content. They're opt-in and can be turned off at any time."
  - **Toggle label:** "3am Watch"
  - **Toggle description:** "During night hours, the Prayer Wall leads with mental-health and crisis-flagged posts. A crisis-resources banner stays visible at the top. (11pm – 5am local time)"
  - **Radio options:**
    - "Off" — "Watch never activates." (default)
    - "Auto" — "Watch activates when Night Mode is also on."
    - "Always during late hours" — "Watch activates every night between 11pm and 5am."
- **D-WatchIndicatorCopy:** Authored inline (Gate-G-COPY).
  - **Chip text:** "Watch is on" (in Lora italic, muted color, non-interactive)
  - No subtitle in v1; chip is purely status. Future 6.4b may add a popover with explainer.
- **D-ComposerReminderCopy:** Authored inline (Gate-G-COPY).
  - **Placeholder text when Watch is active:** "Simple presence matters. You don't need to fix it."
  - Standard placeholder behavior: disappears on typing; reappears on clear.
  - Watch-off placeholder: existing composer placeholder unchanged.
- **D-HookAPI:** `useWatchMode()` returns `{active, source, userPreference, degraded}`.
  ```typescript
  type UseWatchModeReturn = {
    active: boolean              // is Watch currently active right now
    source: 'auto' | 'manual'    // 'auto' = hours-based via Night Mode; 'manual' = always-during-watch-hours setting
    userPreference: WatchPreference
    degraded: boolean            // true for v1 (no feed slicing); false once 6.4b ships
  }
  ```
- **D-NoTracking:** NO analytics on Watch behavior (Gate-G-NO-ENGAGEMENT-METRICS).
- **D-FailClosedOptIn:** Settings load error → Watch off (Gate-G-FAIL-CLOSED-OPT-IN).
- **D-NoDismissal:** Crisis banner is non-dismissible (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE).
- **D-OptOutFriction:** Opt-out is friction-free (no confirmation modal); opt-in REQUIRES confirmation.

---

## Watch-fors (W*)

**All 35 watch-fors from brief § 8 are PRESERVED VERBATIM.** Plan and execute must honor each. Organized by theme.

### Safety-critical (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE, Gate-G-NO-AI-AUTO-REPLY)
- **W1 (CC-no-git):** Claude Code never runs git operations at any phase.
- **W2:** Crisis banner MUST render whenever `useWatchMode().active === true`. No conditional hiding for any reason.
- **W3:** Crisis banner is NOT dismissible. NO close button. NO "already seen" state.
- **W4:** 988 phone link uses `tel:988` format (correct iOS + Android).
- **W5:** 988 chat link uses `target="_blank"` AND `rel="noopener noreferrer"`.
- **W6:** NO AI/LLM API call from ANY code path in v1. v1 doesn't add AI infrastructure. Future specs must respect Gate-G-NO-AI-AUTO-REPLY.
- **W7:** NO crisis-keyword detection happens in v1 (different concern from this spec; existing keyword detection in `containsCrisisKeyword` is unchanged).

### Opt-in discipline (Gate-G-FAIL-CLOSED-OPT-IN)
- **W8:** Default user preference is `'off'`. NEVER auto-enable.
- **W9:** Opt-in REQUIRES confirmation modal. Tapping the radio is NOT sufficient by itself.
- **W10:** Opt-OUT is friction-free: tapping "Off" radio persists immediately, no confirmation.
- **W11:** If `useSettings()` returns null/error/loading, `useWatchMode()` returns `active: false`. NEVER assume opt-in during loading.
- **W12:** After user opts in, setting persists across sessions, devices (via dual-write), page refreshes.
- **W13:** Confirmation modal can be cancelled ("Not right now" OR Esc OR click outside) and the toggle reverts to its previous state (NOT auto-saved as the new state).

### Brand voice / copy (Gate-G-COPY)
- **W14:** Crisis banner copy is calm, NOT alarming. "Support is available" not "Get help now."
- **W15:** Confirmation modal copy frames opt-in as a choice, NOT a recommendation. "Yes, turn on" and "Not right now" feel equally valid.
- **W16:** Settings description uses "opt-in" and "turned off at any time" language to reinforce user agency.
- **W17:** WatchIndicator chip text is neutral status ("Watch is on"). NOT performative ("Watching with you tonight"). NOT engagement-bait ("3 people watching now").
- **W18:** Composer reminder uses "You don't need to fix it" — permission, not pressure.
- **W19:** Honesty about v1 vs. v2: confirmation modal copy describes the FULL intended behavior (feed prioritization). The crisis banner does work; the feed prioritization is deferred to 6.4b. Plan documents this known dissonance; 6.4b updates the modal copy to match actual behavior.

### Scope discipline (per § "Recon Reality Overrides" + brief § 2.5)
- **W20:** NO classifier integration in v1. NO `Crisis*` imports. NO calls to `CrisisAlertService` / `PostCrisisDetector` / `CommentCrisisDetector`. (Premise updated by R-OVR-S2; behavior unchanged: v1 still imports none.)
- **W21:** NO trust level check in v1. ANY authenticated user can opt in (TL infra unbuilt per R-OVR-S3).
- **W22:** NO friend lookup in v1. NO calls to `FriendsService` / `FriendRelationshipRepository`. (Premise updated by R-OVR-S1; behavior unchanged: v1 still imports none.)
- **W23:** Feed re-sort STUB returns identical data to non-watch endpoint. NO slicing logic in v1.
- **W24:** NO mental-health post slicing in v1. NO `Post.category = 'MENTAL_HEALTH'` filter in v1.
- **W25:** NO section dividers in v1 (no slicing → nothing to divide).
- **W26:** NO share-as-image disabling in v1 (depends on classifier).

### Anti-metrics (Gate-G-NO-ENGAGEMENT-METRICS)
- **W27:** NO new analytics events for Watch behavior. NO `watch.*` events. NO surveillance of Watch users.
- **W28:** NO "N people watching tonight" counters EVER.
- **W29:** NO time-on-page metrics during Watch hours.
- **W30:** Aggregate server-side request counts per hour ARE allowed (capacity planning only); NEVER surface to users or include user identifiers.

### Accessibility (Gate-G-A11Y)
- **W31:** Confirmation modal is `role="alertdialog"` (alert variant for safety-related decisions), `aria-modal="true"`, focus trap via `useFocusTrap()` per `09-design-system.md`.
- **W32:** Focus moves to PRIMARY action ("Yes, turn on") on modal open. Tab cycles between primary, secondary, close-X.
- **W33:** Esc key closes modal AS "Not right now" (treated as user declining opt-in, not as silent cancel).
- **W34:** 988 phone link is the FIRST focusable element in the crisis banner (screen-reader users get to the most actionable item first).
- **W35:** All Watch UI elements respect `prefers-reduced-motion: reduce` per the global safety net at `frontend/src/styles/animations.css`.

---

## Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes for v1. |
| Gate-2 (OpenAPI updates) | **Applies.** | Document `?watch=true` query param on GET /api/v1/posts with v1 stub semantics ("accepted; returns standard feed in v1; full slicing in 6.4b"). |
| Gate-3 (Copy Deck) | **Applies (HARD).** | ALL Watch-related copy (banner, modal, settings, composer reminder, indicator) in Copy Deck below. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | ~30 tests for v1 (more than typical because of safety requirements). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Banner role=region, 988 link aria-label, focus trap in confirmation modal, reduced-motion. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | useWatchMode polling reuses 6.3's 60s tick; no extra setInterval (R-OVR-S5 disposition). |
| Gate-7 (Rate limiting on ALL endpoints) | **N/A.** | Stub endpoint reuses existing GET /api/v1/posts rate limit. No new endpoint. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse `useNightMode` (R-OVR-S5), `useSettings`, `UserSettingsPrayerWall` namespace (R-OVR-S6), `useFocusTrap` (per `09-design-system.md`), `CRISIS_RESOURCES` constants (R-OVR-S4), existing PostController + PostService (R-OVR-S8). |
| Gate-9 (Plain text only) | **Applies.** | Banner content is plain text + `tel:` + `https:` links. No markdown. No `dangerouslySetInnerHTML`. |
| Gate-10 (Crisis detection supersession, Universal Rule 13) | **Applies (forward-looking).** | v1 has no crisis content surface but DOES define the forward-looking AI-auto-reply prohibition that Universal Rule 13 reinforces. New `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` codifies this. |

**New gates specific to 6.4 (all HARD; code-review hard-blocks violations):**

- **Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE (HARD).** When `useWatchMode().active === true`, `<CrisisResourcesBanner />` MUST render at the top of the Prayer Wall feed area. No conditional hiding. No "user dismissed it." No "already shown today." Integration tests cover: banner visible at 11pm with Watch opted in; visible at 3am with Watch opted in; visible after page refresh during Watch hours; ABSENT at 11pm with Watch NOT opted in; ABSENT at 11am with Watch opted in.

- **Gate-G-NO-AI-AUTO-REPLY (HARD; future-proofing).** NO code path in v1 sends content to an LLM/AI in response to user content. v1 doesn't have AI infrastructure on the Watch surface. Forward-looking: any future spec that adds AI features MUST include a check that the targeted user content is NOT crisis-classified before invoking AI. New `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` documents this. Code review of any future PR with `openai`, `anthropic`, `llm`, `claude`, or `gemini` in an import path operating on user-generated content hard-blocks unless the PR explicitly documents how crisis-content exclusion is enforced.

- **Gate-G-NO-ENGAGEMENT-METRICS (HARD).** NO new telemetry events emitted for Watch-mode user behavior. Specifically forbidden:
  - `watch.toggled_on` / `watch.toggled_off`
  - `watch.banner_clicked` / `watch.banner_dismissed`
  - `watch.session_duration`
  - `watch.posts_viewed`
  - `watch.composer_opened`
  - Any event with `watch` in the name

  Aggregate anonymous server-side request logs per hour ARE allowed (capacity planning only). Code review hard-blocks any new analytics event with Watch-related context.

- **Gate-G-TRUST-LEVEL-SERVER-ENFORCED (HARD; deferred to 6.4b).** v1 stubs trust level. Brief mandates 6.4b's enforcement MUST be server-side:
  - The `?watch=true` query parameter, when wired to actual TL gate, returns 403 for TL<2 users.
  - Frontend hiding of the toggle is defense-in-depth only.
  - NO client-side trust level state is trusted (server is source of truth).

  v1 itself doesn't trigger this gate (no enforcement in v1). Brief documents for 6.4b.

- **Gate-G-DETERMINISTIC-FEED (HARD; deferred to 6.4b).** When 6.4b adds actual feed slicing, it MUST be deterministic SQL with stable tiebreakers. NO ML scoring, NO randomization, NO algorithmic re-ranking. Same inputs produce same output. v1's stub endpoint already satisfies (standard `last_activity_at DESC`).

- **Gate-G-DEGRADED-MODE (HARD).** v1 IS the degraded mode. v1's behavior is the safe fallback when 10.4/10.5/10.6 are unavailable, EVEN AFTER 6.4b ships:
  - If 6.4b's classifier becomes unavailable, the Watch surface reverts to v1's behavior (no crisis slicing, banner still visible, opt-in still works).
  - If 6.4b's friend system becomes unavailable (transient), the friends slice is omitted but other slices continue.
  - If 6.4b's trust check becomes unavailable, the server fails CLOSED (return 503 or omit Watch slicing) — NEVER fail open.

  v1 ships this fallback as the default; 6.4b adds enhancements on top.

- **Gate-G-COPY (HARD).** All Watch-related copy is authored in D-Copy decisions above. Eric reviews + approves before execute. CC executes against the approved set. **NO copy variation between brief and execute without re-approval** (Watch copy is safety-relevant; word choice matters more than typical UX copy). Plan may flag candidates for 2-word fit edits; cannot replace wholesale.

- **Gate-G-A11Y (HARD).** MUST cover:
  - `<CrisisResourcesBanner />` has `role="region"` + `aria-labelledby` pointing to its heading.
  - 988 phone link has `aria-label="Call 988 Suicide and Crisis Lifeline"`.
  - 988 chat link has `aria-label="Open 988 Lifeline chat in new tab"`.
  - `<WatchIndicator />` chip has `aria-label="3am Watch is on"`.
  - `<WatchToggle />` radio buttons each have descriptive aria-labels.
  - Confirmation modal: `role="alertdialog"` (alert variant for safety-related), `aria-modal="true"`, focus trap via `useFocusTrap()`, focus moves to primary action on open, Esc closes as "Not right now".
  - All night-state contrast meets WCAG AA per 6.3.
  - Axe-core passes zero violations at 3 viewport widths in Watch state.

- **Gate-G-FAIL-CLOSED-OPT-IN (HARD).** If `useSettings()` hook returns undefined/null/error (during initial load or settings-storage failure), `useWatchMode()` MUST default to `active: false` — NEVER `true`. Integration test simulates `useSettings()` returning null/error during initial render; verifies Watch UI is hidden; user is treated as Watch-off until settings finish loading.

---

## Files to Create

**Frontend:**
- `frontend/src/hooks/useWatchMode.ts` — the hook per D-HookAPI / MPD-12 / R-OVR-S5
- `frontend/src/hooks/__tests__/useWatchMode.test.ts` — unit + integration tests
- `frontend/src/lib/watch-mode-resolver.ts` — pure functions: `isWatchHour()`, `resolveWatchModeActive()`
- `frontend/src/lib/__tests__/watch-mode-resolver.test.ts` — unit tests
- `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` — banner per D-CrisisBannerCopy + Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE; reuses `CRISIS_RESOURCES` from `@/constants/crisis-resources` per R-OVR-S4 (may add a `chat_url` field to the `suicide_prevention` entry; if so, mirror the change to `backend/src/main/java/com/worshiproom/safety/CrisisResources.java` per the parity rule)
- `frontend/src/components/prayer-wall/__tests__/CrisisResourcesBanner.test.tsx` — banner tests
- `frontend/src/components/prayer-wall/WatchIndicator.tsx` — chip per D-WatchIndicatorCopy
- `frontend/src/components/prayer-wall/__tests__/WatchIndicator.test.tsx` — indicator tests
- `frontend/src/components/settings/WatchToggle.tsx` — 3-radio toggle per D-PreferenceStates / D-OptInFlow / D-OptOutFriction
- `frontend/src/components/settings/__tests__/WatchToggle.test.tsx` — toggle tests
- `frontend/src/components/settings/WatchOptInConfirmModal.tsx` — confirmation modal per D-ConfirmationModalCopy + W31-W33 (focus trap via `useFocusTrap`, role="alertdialog", aria-modal="true")
- `frontend/src/components/settings/__tests__/WatchOptInConfirmModal.test.tsx` — modal tests
- `frontend/src/constants/watch-copy.ts` — all Watch strings per D-Copy decisions (banner, modal, settings, indicator, composer reminder)
- `frontend/tests/e2e/watch-mode.spec.ts` — Playwright E2E suite (3 scenarios per § "Testing Notes" → Playwright E2E)

**Rules documentation:**
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — documents Gate-G-NO-AI-AUTO-REPLY for future-spec compliance. Eric reviews + approves before execute. Content scope: prohibition + reasoning + enforcement mechanism (code review of any future PR with `openai` / `anthropic` / `gemini` / `claude` / `llm` in an import path operating on user-generated content) + cross-references to `01-ai-safety.md` Universal Rule 13. Plan authors the content; Eric approves before execute writes it.

---

## Files to Modify

**Frontend:**
- `frontend/src/pages/PrayerWall.tsx` (1125 lines, already imports `useNightMode` at line 13) — add `useWatchMode()` consumption; render `<CrisisResourcesBanner />` at top of feed when active; render `<WatchIndicator />` in page header when active; pass `watchActive` to composer for placeholder swap. Plan-recon RR2 picks exact DOM insertion points.
- `frontend/src/pages/Settings.tsx` — add "Sensitive features" section per MPD-11 / D-SettingsToggleCopy; mount `<WatchToggle />` inside it. Plan-recon RR4 picks insertion point.
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (or whichever composer component plan-recon RR3 identifies) — swap textarea `placeholder` to D-ComposerReminderCopy variant when `useWatchMode().active`. Existing crisis-keyword check via `containsCrisisKeyword` is UNCHANGED (W7).
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — read `useWatchMode().active`; short-circuit rendering when true (MPD-14). No QOTD API change.
- `frontend/src/types/settings.ts` — add `watchEnabled: WatchPreference` to `UserSettingsPrayerWall` interface (R-OVR-S6); export `WatchPreference` type alias.
- `frontend/src/services/settings-storage.ts` — update default settings shape to include `watchEnabled: 'off'` (D-OptInDefault).
- `frontend/src/constants/crisis-resources.ts` — IF banner needs a chat URL exposed (plan-recon RR5 confirms), add `chat_url: 'https://988lifeline.org/chat/'` to the `suicide_prevention` entry. Mirror the change to backend per R-OVR-S4 (see backend Modify section).
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.prayerWall.watchEnabled` semantics (the watch preference is stored inside the `wr_settings` JSON, not as a top-level localStorage key — the existing `wr_settings` row in the inventory is augmented with the new field; if a dedicated row is preferred, follow the 6.1 `prayerReceiptsVisible` + 6.3 `nightMode` precedent). Plan-recon RR10 confirms the documentation pattern.

**Backend:**
- `backend/src/main/java/com/worshiproom/post/PostController.java` — accept optional `@RequestParam(value = "watch", defaultValue = "false") boolean watch` on `GET /api/v1/posts`. v1 STUB behavior: ignore the param, pass through to standard handler. Add `// TODO Spec 6.4b: enforce Trust Level 2+ and apply feed slicing` comment at the future enforcement site (D-TrustGateStub).
- `backend/src/main/resources/openapi.yaml` (or wherever the OpenAPI spec is generated — plan-recon RR11 confirms) — document `?watch` query param + Spec 6.4 v1 semantics.
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` (or similar — plan-recon RR12 confirms exact file) — add 3 tests per § "Testing Notes" → Backend integration tests.
- `backend/src/main/java/com/worshiproom/safety/CrisisResources.java` — IF frontend `CRISIS_RESOURCES` is extended with `chat_url` per R-OVR-S4 disposition, mirror the change here to maintain `CrisisResourcesParityTest`.

---

## Files NOT to Modify (explicit non-targets)

- **Frontend:** no new feed component; integrations happen in `PrayerWall.tsx` (per R-OVR-S7 / brief R6)
- **Frontend:** `frontend/src/components/daily/CrisisBanner.tsx` is UNCHANGED (R-OVR-S4 — distinct keyword-triggered banner; do not delete, do not modify)
- **Frontend:** `frontend/src/components/prayer-wall/PageShell.tsx` is UNCHANGED (Night Mode wrap is already 6.3-correct)
- **Frontend:** `frontend/src/hooks/useNightMode.ts` is UNCHANGED (6.4 USES useNightMode but does NOT modify it; the hook's public API is stable per R-OVR-S5)
- **Backend:** NO new `WatchFeedService.java` in v1 (per R-OVR-S8 / brief R5; deferred to 6.4b)
- **Backend:** NO new `feed/` package directory (per R-OVR-S8 / brief R5)
- **Backend:** NO friend-system Java modifications (per R-OVR-S1 / W22; friend Java is shipped but v1 doesn't consume it)
- **Backend:** NO trust level Java code (per R-OVR-S3 / W21; doesn't exist yet)
- **Backend:** NO crisis classifier Java code modifications (per R-OVR-S2 / W20; classifier is shipped but v1 doesn't consume it; do NOT introduce a sibling alert service per CLAUDE.md Phase 3 Addendum item 7)
- **Backend:** `PostSpecifications.java` — NOT modified in v1; 6.4b uses this for actual feed slicing
- **Backend:** `Post.java` — NOT modified in v1. `crisisFlag` column already exists (R-OVR-S2) but v1 doesn't filter on it.
- **6.1's Prayer Receipt code** — orthogonal, untouched
- **6.2's Quick Lift code** — orthogonal, untouched
- **6.2b's Quick Lift follow-up code** — orthogonal, untouched
- **6.3's Night Mode code (hook, components, index.css, PageShell)** — 6.4 USES `useNightMode()` but does NOT modify it; the hook's public API is stable per D-Hook-API forward-compat

---

## Files to Delete

None. 6.4 v1 is purely additive.

---

## Database Changes

**None.** 6.4 v1 has no Liquibase changesets, no new tables, no new columns, no new indexes. The `watchEnabled` preference is a frontend-only persistence (lives in the existing `wr_settings` localStorage JSON via the `UserSettingsPrayerWall.watchEnabled` field added in this spec).

---

## API Changes

**One change:** `GET /api/v1/posts` accepts an optional `watch` query parameter (boolean, default `false`).

- **v1 semantics (stub):** the parameter is accepted but does NOT change response. Returns identical feed ordering whether `?watch=true`, `?watch=false`, or `?watch` absent.
- **v1 trust gate:** no Trust Level enforcement (allows any authenticated user; D-TrustGateStub).
- **v1 auth gate:** unchanged — unauthenticated requests continue to return 401 per existing auth filter.
- **v1 rate limit:** unchanged — reuses existing GET /api/v1/posts rate limit (no new endpoint, no new bucket).
- **6.4b future semantics (documented but NOT implemented in v1):** Trust Level 2+ enforcement (returns 403 for TL<2); feed re-sort with crisis-flagged → mental-health → friends → regular slicing; section dividers; deterministic SQL ordering.

OpenAPI documentation update: document the parameter with v1 stub semantics + 6.4b future semantics in a `description:` block. Mark explicitly as "stubbed in 6.4 v1; full semantics in 6.4b" so consumers don't infer slicing semantics from the parameter's existence.

---

## Copy Deck (Gate-3 / Gate-G-COPY HARD-block)

All Watch-related copy strings. Eric reviews + approves BEFORE execute. CC executes against the approved set. NO variation without re-approval.

### Crisis Resources Banner (D-CrisisBannerCopy)

- **Heading:** "You're not alone"
- **Body:** "If you're going through something heavy right now, support is available. The 988 Suicide and Crisis Lifeline is free, confidential, and open 24/7."
- **Phone link visible text:** "Call or text 988"
- **Phone link href:** `tel:988`
- **Phone link aria-label:** "Call 988 Suicide and Crisis Lifeline"
- **Chat link visible text:** "Chat with 988 online"
- **Chat link href:** `https://988lifeline.org/chat/`
- **Chat link target:** `_blank`
- **Chat link rel:** `noopener noreferrer`
- **Chat link aria-label:** "Open 988 Lifeline chat in new tab"

### Confirmation Modal (D-ConfirmationModalCopy)

- **Header:** "Turn on 3am Watch?"
- **Body:** "You'll see mental-health and crisis-flagged posts prioritized in the feed during late-night hours (11pm – 5am), with crisis resources always visible at the top. Watch is opt-in and won't change your feed during the day."
- **Primary action label:** "Yes, turn on"
- **Secondary action label:** "Not right now"

### Settings — "Sensitive features" Section (D-SettingsToggleCopy)

- **Section heading:** "Sensitive features"
- **Section helper text:** "These features are designed for sensitive content. They're opt-in and can be turned off at any time."

### Settings — 3am Watch Toggle (D-SettingsToggleCopy)

- **Toggle label:** "3am Watch"
- **Toggle description:** "During night hours, the Prayer Wall leads with mental-health and crisis-flagged posts. A crisis-resources banner stays visible at the top. (11pm – 5am local time)"
- **Radio "Off" label:** "Off"
- **Radio "Off" description:** "Watch never activates."
- **Radio "Auto" label:** "Auto"
- **Radio "Auto" description:** "Watch activates when Night Mode is also on."
- **Radio "Always during late hours" label:** "Always during late hours"
- **Radio "Always during late hours" description:** "Watch activates every night between 11pm and 5am."

### Watch Indicator (D-WatchIndicatorCopy)

- **Chip text:** "Watch is on"
- **Chip aria-label:** "3am Watch is on"
- **Chip typography:** Lora italic, muted color (per `09-design-system.md` Lora serif scripture-font use case extended to ambient status text), non-interactive
- **Reduced-motion:** breathing-glow animation (if any inherited from 6.3 NightWatchChip pattern) disabled

### Composer Reminder (D-ComposerReminderCopy)

- **Placeholder text when Watch is active:** "Simple presence matters. You don't need to fix it."
- **Placeholder text when Watch is NOT active:** unchanged (existing composer placeholder)

### Anti-Pressure Copy Checklist (HARD)

Every string above must pass:

- [ ] **No comparison** — none of the strings reference "other users," "behind," or comparative metrics.
- [ ] **No urgency** — no "NOW," "today only," "hurry."
- [ ] **No exclamation points near vulnerability** — verified: zero exclamation points in any Watch string.
- [ ] **No therapy-app jargon** — no "take a breath," "center yourself."
- [ ] **No streak-as-shame or missed-X framing.**
- [ ] **No false scarcity.**
- [ ] **Blameless framing** in any error state derived from Watch flows (currently no error state in v1; future 6.4b "temporarily unavailable" copy must inherit this).
- [ ] **Sentence case, complete sentences, period terminators** — verified.
- [ ] **Permission not pressure** — "You don't need to fix it" is permission; "Watch is opt-in and won't change your feed during the day" reinforces user agency.
- [ ] **Calm not alarming** — banner heading is "You're not alone," not "Crisis? Click here."

---

## Acceptance Criteria

**Functional (v1 scope):**

- **A.** `useWatchMode()` hook returns `{active, source, userPreference, degraded}` per D-HookAPI
- **B.** WatchToggle in Settings "Sensitive features" section; 3 radio options (Off / Auto / Always during late hours); default `'off'`
- **C.** Tapping "On" or "Auto" opens confirmation modal; user must tap "Yes, turn on" to persist; tapping "Not right now" reverts toggle
- **D.** Tapping "Off" persists immediately (no confirmation)
- **E.** WatchIndicator chip visible in PrayerWall page header when `active: true`
- **F.** CrisisResourcesBanner visible at top of Prayer Wall feed when `active: true`; non-dismissible (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE)
- **G.** Banner contains 988 phone link (`tel:988`) + 988 chat link (`https://988lifeline.org/chat/` opening in new tab via `target="_blank" rel="noopener noreferrer"`)
- **H.** Composer placeholder swaps to "Simple presence matters. You don't need to fix it." when `active: true`
- **I.** QOTD widget suppressed when `active: true` (frontend short-circuit in `QuestionOfTheDay`; no server change)
- **J.** Setting persists across sessions, devices (via dual-write), and page refreshes
- **K.** Server-side `GET /api/v1/posts?watch=true` stub endpoint accepts param; returns standard feed (v1 stub)
- **L.** ~30 tests covering all safety invariants in v1 scope

**Safety invariants (HARD):**

- **M.** Default user preference is `'off'`; NEVER auto-enable for any user (Gate-G-FAIL-CLOSED-OPT-IN)
- **N.** `useSettings()` null/error/loading state → `useWatchMode()` returns `active: false`
- **O.** NO AI/LLM integration in v1 (Gate-G-NO-AI-AUTO-REPLY)
- **P.** NO new analytics events for Watch behavior (Gate-G-NO-ENGAGEMENT-METRICS)
- **Q.** Crisis banner is non-dismissible during entire Watch session (D-NoDismissal)
- **R.** `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` documents the prohibition for future specs

**Accessibility:**

- **S.** Confirmation modal: `role="alertdialog"`, `aria-modal="true"`, focus trap via `useFocusTrap()`, focus moves to primary action on open, Esc closes as "Not right now"
- **T.** Crisis banner: `role="region"`, `aria-labelledby` pointing to heading, 988 phone link is first focusable element
- **U.** WatchIndicator chip has `aria-label="3am Watch is on"`
- **V.** All WatchToggle radio buttons have descriptive `aria-label`
- **W.** Axe-core passes zero violations at desktop + tablet + mobile widths in Watch state
- **X.** Reduced-motion accommodation: chip's breathing-glow (if any) disabled; banner has no fade-in (per global safety net at `frontend/src/styles/animations.css`)

**Brand voice:**

- **Y.** All Watch copy passes Anti-Pressure Copy Checklist (calm, non-coercive, opt-in framing)
- **Z.** Banner copy frames support as available, not urgent
- **AA.** Confirmation modal copy makes "Not right now" feel equally valid as "Yes, turn on"

**Scope discipline (per R-OVR-S1 through R-OVR-S8):**

- **BB.** NO feed slicing in v1 (deferred to 6.4b)
- **CC.** NO trust level enforcement in v1 (server-stubbed; R-OVR-S3 ratified)
- **DD.** NO classifier integration in v1 (R-OVR-S2 — premise updated but behavior unchanged)
- **EE.** NO friend system integration in v1 (R-OVR-S1 — premise updated but behavior unchanged)
- **FF.** NO share-as-image disabling in v1

---

## Testing Notes

**~30 tests total.** Heavy on safety-critical assertions and integration tests with mocked time. Brief § 9 is the authoritative test list; preserved verbatim below.

### Frontend unit tests (~5)

- `isWatchHour(hour)`: returns true for 23, 0, 1, 2, 3, 4; false for 5, 6, …, 22.
- `isWatchHour(5)`: returns false (exclusive end-of-window).
- `isWatchHour(23)`: returns true (inclusive start-of-window).
- `resolveWatchModeActive(preference, hour, nightModeActive)`:
  - returns false for `('off', any, any)` (default-off invariant)
  - returns true for `('on', 23, false)` (Watch hours, regardless of Night Mode)
  - returns false for `('on', 12, false)` (outside Watch hours)
  - returns true for `('auto', 23, true)` (Watch hours AND Night Mode active)
  - returns false for `('auto', 23, false)` (Watch hours but Night Mode OFF)
- `useWatchMode()` returns `degraded: true` (v1 invariant; future 6.4b changes this).

### Frontend integration tests (~12)

- `useWatchMode()`: mock hour 23, preference 'on', verify `active: true`.
- `useWatchMode()`: mock hour 23, preference 'off', verify `active: false` (Gate-G-FAIL-CLOSED-OPT-IN).
- `useWatchMode()`: useSettings returns null (loading state), verify `active: false` (Gate-G-FAIL-CLOSED-OPT-IN).
- `useWatchMode()`: useSettings throws error, verify `active: false` (degraded gracefully).
- `<CrisisResourcesBanner>`: renders with `role="region"`, `aria-labelledby` pointing to heading.
- `<CrisisResourcesBanner>`: contains `tel:988` link with correct aria-label.
- `<CrisisResourcesBanner>`: contains chat link with `target="_blank"` `rel="noopener noreferrer"`.
- `<CrisisResourcesBanner>`: NO close button rendered (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE).
- `<WatchToggle>`: tapping "On" radio opens confirmation modal (does NOT immediately persist setting).
- `<WatchToggle>`: tapping "Off" radio when current state is on persists immediately, no modal (D-OptOutFriction).
- `<WatchOptInConfirmModal>`: tap "Yes, turn on" persists 'on' to settings; modal closes.
- `<WatchOptInConfirmModal>`: tap "Not right now" closes modal; setting reverts to previous value (NOT 'on').
- `<WatchOptInConfirmModal>`: Esc key closes modal as "Not right now".
- `<WatchIndicator>`: renders "Watch is on" text when `active: true`; renders nothing when `active: false`.

### Frontend behavioral tests (~5)

- Prayer Wall at 11pm with Watch opted in: banner visible, indicator visible, QOTD hidden, composer placeholder swapped.
- Prayer Wall at 11am with Watch opted in: banner ABSENT, indicator ABSENT, QOTD visible, composer placeholder normal.
- Prayer Wall at 11pm with Watch NOT opted in: NO Watch UI elements (banner/indicator/composer reminder absent); QOTD visible.
- Settings change during Watch: user toggles off mid-session; verify banner/indicator/composer reminder disappear within next 60s polling tick; verify QOTD reappears.
- Live transition at 11:00pm: user on Prayer Wall at 10:59pm; verify Watch UI absent; at 11:00pm tick, Watch UI appears (banner + indicator + composer + QOTD-hidden).

### Backend integration tests (~3)

- `GET /api/v1/posts?watch=true` from authenticated user: returns 200 with feed in standard order (identical to `?watch=false`).
- `GET /api/v1/posts?watch=true` from unauthenticated request: returns 401.
- `GET /api/v1/posts?watch=invalid`: parameter parsing falls back to false; returns 200 with standard feed; NO error.

### Playwright E2E (~3)

- **Happy-path opt-in:** Login, navigate to Settings, find "Sensitive features" section, click "On" radio, verify confirmation modal appears with exact authored copy, click "Yes, turn on", verify modal closes, verify setting persists across refresh.
- **Watch active during Watch hours:** With Watch opted in, mock browser time to 11:00pm, navigate to Prayer Wall, verify `<CrisisResourcesBanner />` visible with 988 link, verify `<WatchIndicator />` chip visible, verify composer placeholder is the Watch variant, verify QOTD widget is NOT rendered.
- **Watch inactive outside Watch hours:** With Watch opted in, mock browser time to 11:00am, navigate to Prayer Wall, verify NO Watch UI elements (banner absent, indicator absent, composer normal placeholder, QOTD visible).

### Accessibility tests (~2)

- Axe-core scan on Prayer Wall in Watch state: zero violations at desktop + tablet + mobile widths.
- Axe-core scan on confirmation modal: zero violations.

### BB-45 Reactive-Store-Consumer Pattern

**N/A for 6.4 v1.** `useWatchMode()` is NOT a reactive store — it's a derivation hook over `useSettings()` + `useNightMode()` polling. The underlying reactive consumers (`useSettings`, `useNightMode`) already follow Pattern A correctly per `09-design-system.md` § "Reactive stores across the codebase". No new reactive store added.

---

## Notes for Plan Phase Recon (RR1–RR12)

Plan-time recon items the `/plan-forums` agent will resolve when generating the implementation plan. Brief's R7–R12 are renumbered to RR1–RR6 here for plan-phase grouping; RR7–RR12 are this spec's additional questions surfaced by R-OVR-S1 through R-OVR-S8.

- **RR1 (was brief R7) — Post.category enum values.** Plan reads `Post.java` / related category enum. Determine: is there a `category` field on Post? What enum values exist (PRAYER_REQUEST, PRAISE, MENTAL_HEALTH, etc.)? Is MENTAL_HEALTH already a category? Plan-recon discovers; not blocking for v1; informs 6.4b's lift estimate.
- **RR2 (was brief R6 refined) — PrayerWall.tsx DOM insertion points.** Plan reads `frontend/src/pages/PrayerWall.tsx:838+` (composer area) and the header area. Picks: (a) where `<CrisisResourcesBanner />` mounts in the feed render tree (above filter bar? above QOTD card?), (b) where `<WatchIndicator />` mounts in the page header (next to existing chips? new line?).
- **RR3 (was brief R9) — Compose modal / composer textarea location.** Plan finds the compose modal/textarea component. Most likely `InlineComposer.tsx` per recon. Determines exact placeholder-swap insertion point.
- **RR4 (was brief R11) — Settings page section structure.** Plan reads `Settings.tsx` (post-6.3, which has a Night Mode preference section per R-OVR-S6). Determines insertion point for "Sensitive features" section (likely after privacy section; not in the Night Mode appearance section since Night Mode is appearance, Watch is sensitive).
- **RR5 — Crisis Resources Banner content verification.** Brief authors banner copy inline (D-CrisisBannerCopy). Plan-time recon verifies: `tel:988` is the correct phone link format; chat URL `https://988lifeline.org/chat/` is current. International routing: v1 targets US English; international users see same banner with 988 link (MPD-15 limitation). ALSO: decide whether to add `chat_url` to `frontend/src/constants/crisis-resources.ts` `suicide_prevention` entry (and mirror in backend `CrisisResources.java`) per R-OVR-S4 disposition, OR hardcode the chat URL inside the banner component. Recommend adding to constants for parity / single-source-of-truth.
- **RR6 (was brief R12) — Existing confirmation modal pattern.** Plan finds an existing confirmation modal component (e.g., `09-design-system.md` mentions 37 modals using `useFocusTrap()`). Reuses for the Watch opt-in confirmation. If no reusable component exists OR pattern requires variant for `role="alertdialog"`, plan picks: (a) build a generic `<ConfirmModal>` in this spec, or (b) build one-off `<WatchOptInConfirmModal>` specific to 6.4. **Recommend (b)** for v1 to minimize scope creep; future specs can refactor.
- **RR7 (new, per R-OVR-S5) — `useWatchMode()` polling architecture.** Plan picks: (a) `useWatchMode()` consumes `useNightMode()` directly, inheriting the 60s tick (recommended — avoids parallel timers); or (b) `useWatchMode()` runs its own 60s `setInterval`. Brief implicitly assumes (a) per Gate-6 / W5.
- **RR8 (new) — `<WatchIndicator />` position in PrayerWall header.** 6.3 introduced `<NightWatchChip />` (already present when Night Mode active). Plan decides: do both chips render simultaneously (Watch + Night Watch)? Recommend yes — they convey different states and are both "ambient status." If side-by-side: order is Night Watch then Watch (Watch is the more privileged feature, sits to the right). Plan visualizes.
- **RR9 (new) — Existing `daily/CrisisBanner.tsx` interaction.** Plan confirms R-OVR-S4 disposition: the new `prayer-wall/CrisisResourcesBanner.tsx` is a NEW file with distinct semantics. The existing `daily/CrisisBanner.tsx` is UNCHANGED. Plan documents the differences and reuses `CRISIS_RESOURCES` constants.
- **RR10 (new) — `11-local-storage-keys.md` documentation pattern.** Plan reads existing 6.1 + 6.3 entries (`prayerReceiptsVisible`, `nightMode`) in `11-local-storage-keys.md`. Picks: (a) augment the existing `wr_settings` row to mention `prayerWall.watchEnabled` alongside the other prayerWall keys, OR (b) add a new dedicated row per the 6.1 / 6.3 precedent. Match whichever pattern 6.3 used. Reference `11-local-storage-keys.md` lines 80-89 — they consolidate `wr_settings` plus prayerWall namespace entries inside the same row.
- **RR11 (new) — OpenAPI generation pipeline.** Plan locates whichever file defines the `GET /api/v1/posts` OpenAPI schema (could be `openapi.yaml` at backend root, could be generated from controller annotations via springdoc-openapi). Picks where to document the `?watch` parameter.
- **RR12 (new) — PostController integration test file.** Plan locates existing PostController integration test file pattern. Adds 3 tests to existing file (or creates new test class if existing pattern dictates per-test-class organization).

---

## Out of Scope (Explicit Non-Targets — brief § 12)

### Deferred to 6.4b (once dependencies ship)

- Crisis-flagged content slice in feed re-sort (depends on 10.5 + 10.6 classifier OR scoped-down path per R-OVR-S2: 6.4b could ship slicing using existing `Post.crisisFlag` data without waiting for full 10.5/10.6 pipeline)
- Mental-health post slice in feed re-sort (depends on Post.category recon RR1)
- Friends & family post slice in feed re-sort (depends on friend-Java consumption — R-OVR-S1 says it's available now; 6.4b can wire)
- Section dividers between feed slices ("From the last day" / "Friends & family" / "Also here today")
- Share-as-image disabled on crisis-flagged posts during Watch (depends on classifier or `Post.crisisFlag` consumption in share path)
- Trust Level 2+ server-side enforcement (depends on 10.4 — R-OVR-S3 ratified absent)
- Frontend hiding of WatchToggle for TL<2 users (depends on 10.4)
- Server-side classifier availability check + graceful fallback messaging (depends on classifier infrastructure surface)
- `WatchFeedService.java` backend service OR `PostSpecifications` extension for feed slicing
- Mental-health category Liquibase changes (if Post.category needs MENTAL_HEALTH value added per RR1 recon)

### Anti-features (NEVER)

- "N people watching tonight" counter
- Push notifications when new crisis content appears
- AI auto-reply to crisis posts (ANY future spec must respect — codified in new `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md`)
- Engagement metrics during Watch hours
- Surveillance over Watch-user behavior
- Performative "Thank you for watching" badges or celebrations
- Pressure copy ("You haven't Watched in a while")
- Recommending Watch to users who haven't opted in
- ML-scored or algorithmic feed re-ranking (6.4b's slicing MUST be deterministic SQL only — Gate-G-DETERMINISTIC-FEED)
- Per-post view tracking during Watch hours
- Time-on-page metrics during Watch hours
- "100-Night Watcher" / "Faithful Watcher" / any Watch-gamification badge

### Different concerns (out of scope for this spec entirely)

- Crisis-keyword detection in composer (different system; existing `containsCrisisKeyword` is unchanged — W7)
- Post-level crisis flagging by users (a Report system; separate concern; reports already wired in Phase 3 Spec 3.8 per CLAUDE.md)
- Moderator review of crisis-flagged content (Phase 11 / moderation system)
- Crisis-content visibility settings beyond Watch (e.g., "never show me crisis posts")
- Mental-health category creation as a user-selectable post type (different feature; RR1 recon may surface that the enum already exists)
- International crisis hotlines beyond 988 (US-only for v1 per MPD-15; future i18n spec)
- Site-wide dark mode (different concern from Watch; Worship Room is already dark-themed throughout)

---

## Out-of-Band Notes for Eric

These are flagged for your attention during plan review and pre-execute approval. Not code; not test; not gate — context for safety-relevant decisions.

1. **Three copy-approval gates before execute can write any banner/modal/settings copy:** D-CrisisBannerCopy, D-ConfirmationModalCopy, D-SettingsToggleCopy + D-WatchIndicatorCopy + D-ComposerReminderCopy. All Gate-G-COPY HARD. The plan generated from this spec MUST surface these for your explicit approval before execute. NO 2-word edits during execute (unlike 6.3's allowance) — all Watch copy is safety-relevant.

2. **`.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` content scope:** Plan authors the file's content; you approve before execute writes it. The content needs to be enforceable in future code review — specific enough that any future PR can be hard-blocked on violation, but general enough that the policy survives feature evolution. Recommend the rule states: "Any code path that invokes an LLM/AI on user-generated content (post body, comment body, journal text, prayer body) MUST first check the content is NOT crisis-flagged. Implementation: read `Post.crisisFlag` (or equivalent for comment/journal); if true, do NOT invoke the LLM and return a neutral non-AI response."

3. **R-OVR-S2's implication for 6.4b lift:** The brief's main reason for deferring crisis-slicing to 6.4b was "classifier doesn't exist." Per R-OVR-S2, the keyword-based detector + `Post.crisisFlag` data column DO exist today. **This means 6.4b is shippable without the full 10.5/10.6 escalation pipeline** — a 6.4b spec could be authored to slice on `Post.crisisFlag = true AND created_at > now() - 24h` and ship before the AI classifier replaces keyword detection. That's a future-spec authoring decision; flagging here so you can consider whether to author 6.4b sooner than the brief's "wait for 10.5/10.6" timeline implied.

4. **`useWatchMode()` polling tick reuse (RR7):** Strongly recommend (a) — `useWatchMode()` consumes `useNightMode()` directly. Two timers per page = double the wake-ups for the same end result. Plan should default to (a) unless plan-time recon surfaces a reason to deviate.

5. **WatchIndicator + NightWatchChip simultaneous rendering (RR8):** With Watch opted in at 11pm, BOTH chips render (Night Watch from 6.3 + Watch from 6.4). This is correct — they convey different states. Eric verifies visually during manual flow-walking that the two chips don't compete or look cluttered. If they do, decide before execute: (a) suppress Night Watch chip when Watch chip is active (Watch supersedes), or (b) align them visually so they read as a single status group. Recommend deferring this UX call until manual review during/after execute, since plan can't predict the visual interaction.

6. **Honesty dissonance in confirmation modal copy (W19):** The modal copy says "you'll see mental-health and crisis-flagged posts prioritized" but v1 doesn't actually do prioritization. The crisis banner IS the harm-reduction value. This dissonance is INTENTIONAL — describing the full feature gives users accurate expectations for what they're consenting to over time (6.4b will deliver the prioritization). Plan documents it explicitly so the discussion happens before execute, not as a surprise.

7. **Manual flow-walking at 11pm local time:** MAX-tier discipline (brief § 13). After execute lands code, before merge, Eric walks the entire opt-in flow on a fresh account at 11pm local time on a real device. Tests can simulate; the human "does this feel right at the moment when someone might actually open it?" is irreplaceable for crisis-adjacent surfaces.

8. **Reduced-motion verification:** Currently no Watch-specific animation is specified in v1 (no breathing-glow on the chip yet). If plan adds animation (e.g., subtle fade-in on banner mount), plan MUST document the reduced-motion accommodation explicitly and Eric verifies in dev tools. The global safety net at `frontend/src/styles/animations.css` covers all animations site-wide, so this is mostly about not introducing component-level inline animations that bypass the global rule.

9. **Post-merge:** Spec-tracker line 165 flips ⬜ → ✅ for 6.4 (v1). A future Spec 6.4b is authored when 10.4 ships AND a decision is made about whether to slice on `Post.crisisFlag` immediately (per note 3 above) or wait for 10.5/10.6 full pipeline. The v1 framework persists permanently as the safe degraded mode (Gate-G-DEGRADED-MODE).

---

## End of Spec
