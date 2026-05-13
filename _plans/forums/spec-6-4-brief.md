# Brief: Spec 6.4 — 3am Watch

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` lines 5202-5318

**Spec ID:** `round3-phase06-spec04-three-am-watch`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** L (Large) for v1; XL if v1+v2 combined (v2 deferred to 6.4b)

**Risk:** **MAX** (master plan says HIGH; brief escalates to MAX because brief recon revealed that target infrastructure is mostly un-built, AND the surface is crisis-adjacent)

**Prerequisites:**
- 6.3 (Night Mode) — must merge first; 6.4 builds on `useNightMode()` hook
- 6.2 (Quick Lift) ✅ (prerequisite chain: 6.1 → 6.2 → 6.3 → 6.4)
- 6.1 (Prayer Receipt) ✅ (provides `UserSettings.prayerWall` namespace)
- Existing Post infrastructure (verified via R1)

**Runtime-gated dependencies (NOT prerequisites for shipping v1; required for full functionality):**
- 10.4 (Trust Levels) — NOT SHIPPED. v1 stubs trust check (always allows TL2+; future spec wires actual TL gate).
- 10.5 (Three-tier escalation pipeline) — NOT SHIPPED. v1 omits crisis-flagged feed slice.
- 10.6 (Automated flagging classifier) — NOT SHIPPED. v1 omits classifier-dependent surfaces.
- Friend system Java layer — NOT SHIPPED (tables exist). v1 omits "friends & family" feed slice if friend lookup is unavailable.
- Mental-health post category — NEEDS RECON. v1 ships an opt-in framework that gracefully degrades if the category doesn't exist on Post yet.

**Tier:** **MAX** (highest in this wave; rare designation reserved for crisis-adjacent UX)

**Pipeline:** This brief → `/spec-forums spec-6-4-brief.md` → `/plan-forums spec-6-4.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.3 merges. No conflict with 1.5g (different surfaces). 6.4 should NOT execute concurrently with 6.3 (same useNightMode()/Prayer Wall surface). Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 OR 6.1 → 6.2 → 6.2b → 6.3 → 6.4 → 1.5g.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.4 work.

**6.4 has additional discipline: ANY safety-classified change (Watch toggle UX, crisis banner copy, classifier integration) requires Eric's explicit sign-off in chat before being committed.** Execute may not implement a safety-classified surface differently from the brief without pausing for confirmation.

---

## 2. Tier — MAX (highest in this wave)

6.4 is the only **MAX** tier spec in the Phase 6 wave. The bump from 6.3's xHigh is justified by:

**Crisis-adjacent UX with real wellbeing stakes.**
Users seeing this surface at 3am may be in active emotional distress, suicidal ideation, or acute mental-health crisis. A bug here doesn't just look bad — it can do real harm. Examples of harm vectors this brief explicitly designs against:
- A crisis-flagged post failing to surface support resources nearby → user has no immediate path to help
- AI-generated comfort reply to a crisis post → trivializes the moment, may be wrong/harmful, undermines trust
- "N people are watching" counter → turns vigil into performance metric, gamifies presence near suffering
- Engagement-tracking telemetry during Watch hours → surveillance over content where users are most vulnerable
- Sharing-as-image enabled on a crisis post → well-intentioned screenshot ends up in screenshot of someone's suicidal ideation forwarded to people who shouldn't have it
- Algorithmic re-ranking of crisis content → ML scoring artifacts can systematically bury or surface the wrong content

The brief contains HARD safety gates that block code-review approval on any violation of these. See Section 6.

**Most target infrastructure does NOT exist yet (per Section 2.5 below).**
Unlike 6.3 which built on shipped infrastructure, 6.4 targets a pipeline of un-shipped components (10.4 trust levels, 10.5 escalation, 10.6 classifier, friend-system Java layer). The brief mandates that v1 ships a graceful DEGRADED MODE that works correctly without those, and is FAIL-CLOSED on any safety-relevant decision (when uncertain: don't surface crisis content, fall back to Night Mode, hide Watch toggle, never AI-respond).

**Server-side enforcement is HARD.**
Unlike 6.3 which was purely frontend, 6.4 has backend code. The Watch toggle, trust-level gate, classifier check, and feed re-sort all need server-side enforcement — frontend hiding is defense-in-depth only.

**Multi-layered opt-in:**
Users DO NOT discover 3am Watch automatically. They:
1. Have Trust Level 2+ (Member) — server-side gated
2. See the Watch toggle in Settings under "Sensitive features" section
3. Open the confirmation modal explaining what Watch is + what they'll see
4. Confirm with "Yes, turn on" (NOT a default; NOT a "learn more" CTA)
5. Watch then activates on their next entry into Watch hours (11pm-5am local timezone)

Each layer is load-bearing. Removing any layer is a regression.

**Practical execution implication:** MAX tier means CC uses Opus 4.7 thinking `xhigh` for ALL phases (no exceptions). Eric reviews:
- Every safety-relevant code path (banner visibility, classifier check, toggle UX, share-disabled enforcement)
- All crisis-related copy strings (banner, modal, settings descriptions)
- The fail-closed defaults at every junction (degraded mode, classifier unavailable, trust check uncertain)
- The complete test list with explicit coverage of crisis paths
- Server-side enforcement of every frontend hiding
- Manual flow-walking at 11pm local time on a fresh account

---

## 2.5. Scope Reality — What v1 Ships vs. What's Deferred

**This section is unusual for a brief, but 6.4 warrants it.**

The master plan stub (lines 5202-5318) describes a feature that depends on infrastructure mostly un-built. Brief recon confirmed:

| Master plan element | Required infrastructure | Current state |
|---|---|---|
| Trust Level 2+ gate | Spec 10.4 | **NOT SHIPPED** |
| Crisis-flagged content slice | Spec 10.5 + 10.6 | **NOT SHIPPED** |
| Friends & family feed slice | Friend system Java layer | **NOT SHIPPED** (DB tables exist; no Java) |
| Mental-health category slice | `Post.category = 'MENTAL_HEALTH'` | **NEEDS PLAN-RECON** (category infra exists per R1; specific value unverified) |
| Crisis resources banner | None new — static copy | ✅ buildable |
| Watch toggle in Settings | UserSettings.prayerWall namespace | ✅ (from 6.1) |
| Opt-in confirmation modal | Existing modal infra | ✅ |
| useWatchMode hook | useNightMode (6.3) | ✅ once 6.3 ships |
| Compose composer pre-fill reminder | Existing composer | ✅ |
| QOTD suppression during Watch | Existing QOTD flag | ✅ |
| Share-as-image disabled on crisis posts | Crisis classification | ❌ (no classification yet) |

**Conclusion:** v1 of 6.4 ships the OPT-IN FRAMEWORK + CRISIS BANNER + UI HOOKS, without the dependent feed re-sort logic. The full re-sort lands in a follow-up spec (call it **6.4b**) once 10.4/10.5/10.6/friend-Java are in place.

**v1 scope (this brief authors):**
1. `useWatchMode()` hook (composes `useNightMode` + user opt-in + degraded-mode safety)
2. `WatchToggle.tsx` in Settings (3-state: "Off", "On", "On during late hours only"); opens confirmation modal on opt-in
3. Confirmation modal with master-plan-stub copy (lines 5314-5318)
4. `WatchIndicator.tsx` (header chip; reuses `NightWatchChip` pattern from 6.3; shows "Watch is on" when active)
5. `CrisisResourcesBanner.tsx` (always-visible during Watch hours; static copy with 988 + chat link)
6. Composer pre-fill reminder when Watch is active ("Simple presence matters. You don't need to fix it.")
7. QOTD suppression during Watch hours
8. Server-side trust gate STUB (allows any authenticated user for v1; future 10.4 wires actual TL check)
9. Feed re-sort STUB (`?watch=true` returns standard `last_activity_at DESC` ordering with NO crisis/MH/friends slicing; future 6.4b adds the actual slicing)
10. Settings page "Sensitive features" section (created here; future safety features mount here)
11. localStorage settings key `wr_settings.prayerWall.watchEnabled` (3-state enum)
12. ~25-30 tests covering all safety invariants in the v1 scope

**v1 NON-scope (deferred to 6.4b once dependencies land):**
- Crisis-flagged post slice in feed re-sort (depends on 10.5/10.6)
- Mental-health post slice in feed re-sort (depends on Post.category recon)
- Friends & family post slice in feed re-sort (depends on friend-Java)
- Share-as-image disabled on crisis posts (depends on classifier)
- Trust Level 2+ enforcement (depends on 10.4)
- Section dividers between feed slices (depends on slicing existing)
- Server-side classifier availability check (depends on classifier existing)

**Why ship v1 now without v2 functionality?**

Because the opt-in framework + crisis banner + composer reminder + QOTD suppression are GENUINELY VALUABLE on their own:
- Users who self-identify as wanting a quieter night-hours experience get the visual treatment + composer reminder + banner
- The opt-in flow is exercised in production before the higher-risk classifier integration lands
- The Settings "Sensitive features" section establishes a home for future safety UX
- The crisis banner provides at minimum the 988 hotline always visible during Watch hours — this is real harm reduction even without crisis content prioritization

And because the v1 scope is itself substantial (~25-30 tests, 6+ new files), shipping it as one cohesive unit before v2 keeps each spec's review surface manageable.

**Critical: v1 ships SAFELY without v2.** Section 7's decisions and Section 6's gates are designed so that absent classifier/trust-level/friend-system infrastructure, the user experience is correct (just less rich), never wrong (never surfacing crisis content unsafely or letting AI auto-reply).

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

**Opt-in flow:**
- User at 2pm visits Settings; scrolls to "Sensitive features" section; sees "3am Watch" toggle (default state per D-DefaultState)
- Tap toggle ON → confirmation modal opens with title "Turn on 3am Watch?" and body copy from Copy Deck
- Tap "Not right now" → modal closes; toggle remains off
- Tap "Yes, turn on" → modal closes; toggle switches to on; localStorage updated; Settings shows confirmation state
- Toggle off (no confirmation needed for opt-out; opt-out is friction-free): tap → toggle switches off immediately

**Watch activation behavior:**
- User with Watch on, at 10:59pm: Prayer Wall renders in Night Mode (per 6.3) WITHOUT Watch indicator chip
- Same user at 11:00pm: Watch activates; WatchIndicator chip appears ("Watch is on"); CrisisResourcesBanner renders at top of feed; composer FAB tooltip swaps to Watch variant; QOTD is suppressed
- Same user at 4:59am: Watch still active
- Same user at 5:00am: Watch deactivates; Night Mode continues until 6am per 6.3; WatchIndicator removed; CrisisResourcesBanner removed; QOTD re-enabled

**User without opt-in:**
- At 3am: Prayer Wall renders in Night Mode only (per 6.3); NO Watch chip, NO crisis banner, NO composer reminder, QOTD visible. The Watch surface is gated on opt-in.

**Crisis resources banner:**
- Visible at top of Prayer Wall feed when Watch is active
- Contains: heading "You're not alone", body text, 988 phone link (`tel:988`), chat link to crisis hotline web chat
- Banner is NOT dismissible during the Watch session (intentional — it must be visible)
- Banner reappears every page load if still in Watch hours
- Banner is keyboard-accessible: Tab to phone link, Enter to call; Tab to chat link, Enter to open

**Composer pre-fill:**
- During Watch hours, opening the compose modal pre-fills the textarea with a gentle reminder: "Simple presence matters. You don't need to fix it."
- Reminder text is selectable + deletable (NOT locked); the user can clear it and write whatever they want
- The reminder is a placeholder-style affordance, NOT actual pre-typed content (so submitting an empty composer with just the reminder visible is treated as empty content)

**QOTD suppression:**
- At 2pm: QOTD widget visible on Prayer Wall as normal
- During Watch hours: QOTD widget hidden
- After Watch hours end: QOTD widget reappears

**Server-side trust gate (stub for v1):**
- POST `/api/v1/posts?watch=true` from any authenticated user returns 200 with standard feed (v1 stub)
- Future 6.4b: 403 if Trust Level < 2 (server-enforced)

**Server-side feed re-sort (stub for v1):**
- GET `/api/v1/posts?watch=true` returns posts in standard `last_activity_at DESC` order (v1 stub)
- Future 6.4b: returns crisis-first → mental-health → friends → regular slicing

**Reduced motion:**
- All Watch UI elements respect `prefers-reduced-motion: reduce`
- WatchIndicator chip: no breathing-glow animation in reduced motion
- CrisisResourcesBanner: no fade-in animation in reduced motion

**Accessibility:**
- CrisisResourcesBanner has `role="region"` with `aria-labelledby` pointing to its heading
- 988 phone link uses `tel:988` with descriptive `aria-label="Call 988 Suicide and Crisis Lifeline"`
- Watch indicator chip has descriptive `aria-label="3am Watch is on"`
- Settings toggle has accessible label "3am Watch"
- Confirmation modal traps focus while open; Esc closes (treated as "Not right now")
- All night-state contrast meets WCAG AA per 6.3

### Backend (Integration tests with Testcontainers + Redis)

**v1 stub endpoint:**
- GET `/api/v1/posts?watch=true` from authenticated user: returns 200 with feed in `last_activity_at DESC` order (same as ?watch=false for v1)
- GET `/api/v1/posts?watch=true` from unauthenticated request: returns 401 (existing auth filter)
- GET `/api/v1/posts?watch=invalid`: parameter parsing falls back to false (no error)

### Manual verification by Eric after execute

- Visit Settings at 2pm; find "Sensitive features" section; verify 3am Watch toggle is OFF by default
- Tap toggle ON; verify confirmation modal opens with EXACT master-plan-stub copy (lines 5314-5318)
- Read confirmation modal aloud — verify it doesn't feel coercive or scary; verify the "Not right now" option feels equally valid as "Yes, turn on"
- Confirm; verify toggle persists across page refresh
- At 11pm local time (or via test harness): verify Watch activates; verify crisis banner appears with 988 link; verify composer reminder appears; verify QOTD is hidden
- Tap the 988 link on a real phone; verify it opens the phone app with 988 pre-dialed (do NOT actually call — the dialer should just be open)
- Read all Watch copy aloud (banner heading, banner body, composer reminder, indicator chip text, settings toggle label, settings description, confirmation modal copy) — verify NOTHING feels coercive, performative, or surveillant
- Verify a user with Watch off at 3am sees ONLY Night Mode (no Watch UI elements)
- Verify reduced-motion accommodation works for all Watch UI elements

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub at lines 5202-5318. Plan/execute MUST honor the brief, not the stub. 6.4 diverges more substantially than any other Phase 6 spec because of the un-shipped infrastructure (per Section 2.5).

**MPD-1: Scope reduced to v1 framework; feed re-sort logic deferred to 6.4b.**
Stub describes a full Watch experience with crisis/MH/friends feed slices, section dividers, share-disabled crisis posts, and Trust Level 2 enforcement. Brief defers all of these to **Spec 6.4b** (a future spec authored when 10.4/10.5/10.6/friend-Java are in place).

v1 ships: opt-in flow, Watch indicator, crisis banner (988 link), composer reminder, QOTD suppression, settings UI, server-side stub endpoint.

v1 does NOT ship: feed slicing, crisis-flagged content prioritization, mental-health content prioritization, friends-and-family slice, section dividers, share-disabled-on-crisis, trust level enforcement.

Rationale: shipping the framework now without dependent functionality is safer than waiting to ship everything (gets the opt-in flow and crisis banner into production) and avoids the temptation to stub-implement crisis classification (which would carry unacceptable risk of wrong behavior).

**MPD-2: Trust Level enforcement is a server-side STUB in v1.**
Stub mandates "3am Watch is only available to users at Trust Level 2 (Member) or higher." Brief defers actual enforcement: in v1, the server-side `?watch=true` endpoint allows any authenticated user. A code comment + a `// TODO Spec 10.4` marker documents the future gate location.

This is safe because v1's stub endpoint doesn't expose any sensitive feed surface (it returns the same content as `?watch=false`). When 10.4 lands, a follow-up spec wires actual TL enforcement before 6.4b's sensitive feed slicing ships.

Frontend hiding of the Watch toggle for TL<2 users is ALSO deferred (v1 shows toggle to all authenticated users). Defense-in-depth applies once 10.4 lands.

**MPD-3: Crisis classifier is a NO-OP STUB in v1.**
Stub mandates "If the backend crisis classifier is UNAVAILABLE, 3am Watch DISABLES." Brief defers actual classifier integration: in v1, there is NO classifier dependency. Watch activates when (a) the user has opted in AND (b) the local timezone hour is in [23..04].

This is safe because v1 doesn't show any crisis-flagged content (no slicing). When 10.6 lands, 6.4b adds the classifier-availability check; if classifier is down, 6.4b's logic falls back to v1's behavior (Watch active, banner visible, NO feed slicing). v1's behavior is the safe degraded mode.

**MPD-4: Friend system is OMITTED from v1.**
Stub mandates a "friends & family" feed slice. Brief defers: v1 has no friend lookup. When the friend-system Java layer ships (sometime after Phase 2.5.1's tables), 6.4b adds the friends slice. v1 ships without it.

**MPD-5: 3-state preference (`'off' | 'auto-with-night-mode' | 'always-during-watch-hours'`), NOT a binary.**
Stub implies a binary on/off toggle. Brief decides 3 states for forward-compatibility with future opt-in granularity:
- `'off'` (default) — Watch never activates
- `'auto'` — Watch activates ONLY when user is also in Night Mode (the conservative option; effectively gates Watch behind Night Mode being active or set to 'on')
- `'on'` — Watch activates whenever Watch hours are in effect (regardless of Night Mode state)

This 3-state lets users who don't want Night Mode (set to `'off'`) still opt into Watch independently if they choose. Default is `'off'` (no Watch at all without explicit user action).

UI implementation: a 3-radio choice in Settings, NOT a toggle switch.

**MPD-6: Watch hours are 11pm-5am local browser timezone (NOT user.timezone column).**
Stub says "user's local timezone (per Spec 1.3b timezone column)." Brief decides: browser-local timezone (consistent with 6.3's D-TimeSource decision). Same rationale: reflects user's CURRENT physical environment, not the stale registration setting.

This is a meaningful divergence from the stub's intent (server-side timezone), justified by:
- Consistency with 6.3's `useNightMode()` time source
- Avoiding API call to fetch user's timezone (synchronous determination)
- The watch experience is about user's current moment, not their configured timezone

Note: 11pm-5am is a 6-hour span. This is tighter than 6.3's 9pm-6am Night Mode window. Watch is ONLY active during the deepest hours.

**MPD-7: NO AI auto-reply (HARD; reinforced from master plan).**
Stub already says "NEVER auto-reply to crisis-flagged posts with AI-generated comfort." Brief elevates this to a HARD gate (Gate-G-NO-AI-AUTO-REPLY) and extends scope:
- v1: no AI integration at all in the Watch surface (we don't have AI infra anyway)
- v1 brief mandates: when 10.x AI features ship in the future (any future spec), they MUST honor the prohibition on AI replies to crisis-flagged posts
- Code review hard-blocks any future PR that calls an LLM/AI API from a crisis-context code path

**MPD-8: NO engagement metrics during Watch hours (HARD).**
Stub says "deliberately anti-metrics." Brief elevates to a HARD gate (Gate-G-NO-ENGAGEMENT-METRICS) and lists explicit forbidden tracking:
- NO per-post view tracking during Watch hours
- NO time-on-page metrics during Watch hours
- NO scroll-depth metrics during Watch hours
- NO interaction-rate metrics during Watch hours
- NO "how many people watching tonight" counters EVER

Aggregate anonymous DAU during Watch hours for capacity planning IS allowed (server-side log of request counts per hour); this is operational data, not user-behavior data.

**MPD-9: NO push notifications for Watch-period content (HARD).**
Stub says "NEVER send push notifications when new crisis content appears during Watch." Brief reinforces: no notification path exists for Watch in v1, and if it ever does in a future spec, it must be opt-in and clearly framed (not surveillance-style alerts).

**MPD-10: Crisis banner is ALWAYS visible during Watch hours (HARD).**
Stub says "Crisis resources banner is ALWAYS visible during Watch hours at the top of the feed." Brief reinforces this as the SINGLE most important behavioral invariant in v1: the banner is always present when Watch is active. Tests verify this across all v1 surface render paths.

The banner content (988 phone link, chat link) is the harm-reduction value v1 delivers even without feed slicing.

**MPD-11: Settings page section is named "Sensitive features" (specific name).**
Stub mentions "a dedicated 'Sensitive features' section." Brief locks the EXACT name: "Sensitive features". Section heading + helper text in Copy Deck.

This section becomes the home for future safety-related opt-in features (e.g., 10.4 trust level visibility, 10.5 report-receipt visibility). Establishing it in v1 makes future safety UX more coherent.

**MPD-12: `useWatchMode()` hook composes `useNightMode()` and adds opt-in/hours logic.**
Stub doesn't specify hook architecture. Brief locks: `useWatchMode()` is a new hook in `frontend/src/hooks/useWatchMode.ts` that:
- Calls `useNightMode()` for Night Mode state
- Reads `UserSettings.prayerWall.watchEnabled` from `useSettings()` for opt-in
- Computes Watch hour [23..04] from browser local time
- Returns `{ active: boolean, source: 'auto' | 'manual', userPreference: 'off' | 'auto' | 'on', degraded: boolean }`

The `degraded: boolean` field is true when v1's stub state applies (no crisis slicing). 6.4b's enhancements toggle this to false once they ship.

**MPD-13: Composer reminder is a placeholder, NOT pre-typed content.**
Stub says "composer pre-fill in the composer with a gentle reminder." Brief disambiguates: the reminder is rendered as the textarea's `placeholder` attribute, NOT as actual pre-typed content. When the user begins typing, the reminder disappears.

If the reminder were pre-typed content, submitting it as-is would create a post with the reminder text in it (which would be bizarre). Placeholder behavior is the right choice.

Note: at this writing, the placeholder swap is conditional on Watch being active. Outside Watch hours, the existing composer placeholder applies.

**MPD-14: QOTD suppression is a frontend check, NOT a server change.**
Stub says "QOTD is suppressed during Watch hours." Brief locks: the QOTD component (or wherever QOTD renders) reads `useWatchMode().active` and short-circuits rendering when true. NO change to QOTD server logic; NO new query parameter.

This is intentional: QOTD's API doesn't need to know about Watch mode. The suppression is a UX concern, not a data concern.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R6) or flagged for plan-time recon (R7-R12).

**R1 — Post infrastructure: VERIFIED RICH.**
Directory `backend/src/main/java/com/worshiproom/post/` contains ~50 files. Key files for 6.4:
- `Post.java` — entity
- `PostController.java` — REST endpoints (includes the existing GET /api/v1/posts)
- `PostService.java` — service layer
- `PostSpecifications.java` — JPA Criteria for dynamic queries (PERFECT for adding `?watch=true` re-sort in 6.4b; v1 doesn't use)
- `PostRepository.java` — JPA repo
- `ModerationStatus.java` + `ModerationStatusConverter.java` — moderation framework exists
- `HelpTag.java` + `InvalidHelpTagException.java` — tagging system exists
- `InvalidCategoryException.java` + `MissingCategoryException.java` — categories exist on Post (specific enum values plan-recon-required)
- `PostType.java`, `PostVisibility.java` — enums for type + visibility

v1's stub endpoint: add `?watch=true` query param to existing GET /api/v1/posts; for v1, pass-through to standard ordering. 6.4b's enhancements wire actual re-sort logic via PostSpecifications.

**R2 — Friend system: PARTIAL (DB tables, no Java).**
- Liquibase: `2026-04-27-009-create-friend-relationships-table.xml` + `2026-04-27-010-create-friend-requests-table.xml`
- NO Java files matching `*Friend*` or `*Relationship*` in `backend/src/main/java/com/worshiproom/`
- Implication: friend system was DB-prepped in Phase 2.5.1 but the Java service layer is unbuilt
- Confirms MPD-4: friend slice deferred to 6.4b

**R3 — Trust Level infrastructure: DOES NOT EXIST.**
- NO `*Trust*` Java files anywhere in `backend/src/main/java/com/worshiproom/`
- Confirms MPD-2: trust level enforcement is a v1 stub

**R4 — Crisis classifier: DOES NOT EXIST.**
- NO `*Crisis*` Java files anywhere in `backend/src/main/java/com/worshiproom/`
- Confirms MPD-3: classifier integration is a v1 stub (no-op)

**R5 — WatchFeedService: DOES NOT EXIST.**
- Master plan stub references `backend/src/main/java/com/worshiproom/feed/WatchFeedService.java`
- NO `*Feed*` Java files anywhere in the backend
- NO `feed/` directory exists
- Confirms MPD-1: v1 doesn't create WatchFeedService; the stub endpoint lives in PostController as a query parameter handler

**R6 — PrayerWallFeed.tsx: DOES NOT EXIST.**
- Master plan stub references `PrayerWallFeed.tsx`
- NO `*Feed*` Frontend files exist
- Feed rendering logic is currently inside `PrayerWall.tsx` (~800 lines, per R6 from 6.3 brief)
- v1 doesn't create PrayerWallFeed.tsx; integrations happen inside PrayerWall.tsx where the feed renders today

**R7 — PLAN-RECON-REQUIRED: Post.category enum values.**
Plan reads `Post.java` or related category enum to determine:
- Is there a `category` field on Post?
- What enum values exist (PRAYER_REQUEST, PRAISE, MENTAL_HEALTH, etc.)?
- Is MENTAL_HEALTH already a category?

This determines whether 6.4b will be able to do mental-health feed slicing once it ships. For v1, the recon is not blocking but informs the brief's confidence about future infrastructure.

**R8 — PLAN-RECON-REQUIRED: Existing QOTD component location.**
Plan finds where QOTD renders in the Prayer Wall page tree. Likely candidates: inside `PrayerWall.tsx`, or as a sub-component referenced from there. Plan determines where to insert the Watch-suppression check (likely the QOTD component itself, checking `useWatchMode()`).

**R9 — PLAN-RECON-REQUIRED: Compose modal / composer textarea location.**
Plan finds the compose modal/textarea component. Determines where to swap the placeholder text based on `useWatchMode().active`.

**R10 — PLAN-RECON-REQUIRED: 988 Crisis Resources Banner content.**
Brief authors the banner copy inline (Section 7 D-CrisisBannerCopy). Plan-time recon verifies:
- `tel:988` is the correct phone link format
- Crisis hotline chat URL (https://988lifeline.org/chat/) is current
- Any country-specific routing requirements (v1 targets US English; international users see same banner with 988 link which may not be applicable for them; this is a known v1 limitation documented in MPD-15 below)

**R11 — PLAN-RECON-REQUIRED: Settings page section structure.**
Plan reads `Settings.tsx` (per R10 from 6.3 brief). Determines:
- Where to insert the "Sensitive features" section (likely after existing privacy section)
- Whether 6.3's Night Mode preference is in a section that could be renamed/repurposed (probably NOT — Night Mode is appearance, Watch is sensitive)
- The visual treatment for the "Sensitive features" section heading

**R12 — PLAN-RECON-REQUIRED: Existing confirmation modal pattern.**
Plan finds an existing confirmation modal component (e.g., a generic `<ConfirmModal>` if one exists, or the pattern for one-off confirmations) and reuses it for the Watch opt-in confirmation. If no reusable component exists, plan picks whether to:
- (a) Build a generic `<ConfirmModal>` in this spec
- (b) Build a one-off `<WatchOptInConfirmModal>` specific to 6.4
Recommend (b) for v1 to minimize scope creep; future specs can refactor to a generic component.

**MPD-15: Watch is US-English only for v1.**
Not strictly a divergence, but worth noting: the 988 number is US-specific. International users who opt into Watch see the same 988 banner. v1 documents this as a known limitation; 6.4b or a follow-up i18n spec adds country-specific banner copy with locale-appropriate crisis hotlines.

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes for v1. |
| Gate-2 (OpenAPI updates) | **Applies.** | Document `?watch=true` query param on GET /api/v1/posts (stub behavior for v1). |
| Gate-3 (Copy Deck) | **Applies (HARD).** | ALL Watch-related copy (banner, modal, settings, composer reminder, indicator) in Copy Deck. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | ~25-30 tests for v1 (more than typical because of safety requirements). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Banner role=region, 988 link aria-label, focus trap in confirmation modal, reduced-motion. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | useWatchMode polling is reuses 6.3's 60s tick; no extra setInterval. |
| Gate-7 (Rate limiting on ALL endpoints) | **N/A.** | Stub endpoint reuses existing GET /api/v1/posts rate limit. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse useNightMode, useSettings, NightWatchChip pattern, existing modal patterns. |
| Gate-9 (Plain text only) | **Applies.** | Banner content is plain text + tel: + https: links. No markdown. |
| Gate-10 (Crisis detection supersession) | **N/A.** | v1 has no crisis content surface. |

**New gates specific to 6.4 (all HARD; code-review hard-blocks violations):**

**Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE (HARD).**
When `useWatchMode().active === true`, the `<CrisisResourcesBanner />` MUST render at the top of the Prayer Wall feed area. No conditional hiding. No "user dismissed it." No "already shown today."

Integration tests:
- Banner visible at 11pm with Watch opted in (multiple test renderings)
- Banner visible at 3am with Watch opted in
- Banner visible after page refresh during Watch hours
- Banner ABSENT at 11pm with Watch NOT opted in
- Banner ABSENT at 11am with Watch opted in (outside Watch hours)

**Gate-G-NO-AI-AUTO-REPLY (HARD; future-proofing).**
NO code path in v1 sends content to an LLM/AI in response to user content. v1 doesn't have AI infrastructure, so this gate is forward-looking: any future spec that adds AI features MUST include a check that the targeted user content is NOT crisis-classified before invoking AI.

Documentation: brief adds a `CRITICAL_NO_AI_AUTO_REPLY.md` file to `.claude/rules/` describing the prohibition. Code review of any future PR with `openai`, `anthropic`, `llm`, or `claude` in import path hard-blocks unless the PR explicitly documents how the crisis-content exclusion is enforced.

**Gate-G-NO-ENGAGEMENT-METRICS (HARD).**
NO new telemetry events emitted for Watch-mode user behavior. Specifically forbidden:
- `watch.toggled_on` / `watch.toggled_off` events
- `watch.banner_clicked` / `watch.banner_dismissed` events
- `watch.session_duration` metrics
- `watch.posts_viewed` metrics
- `watch.composer_opened` metrics
- Any event with `watch` in the name

Server-side request logs (aggregate, anonymous) per hour ARE allowed ("Prayer Wall served 1000 requests at 3am") because they're for capacity planning, not user behavior tracking.

Code review hard-blocks any new analytics event that includes Watch-related context.

**Gate-G-TRUST-LEVEL-SERVER-ENFORCED (HARD; deferred to 6.4b).**
v1 stubs trust level (allows any authenticated user). Brief mandates that 6.4b's enforcement MUST be server-side:
- The `?watch=true` query parameter, when wired to actual TL gate, returns 403 for TL<2 users
- Frontend hiding of the toggle is defense-in-depth only
- NO client-side trust level state is trusted (server is source of truth)

v1 itself doesn't trigger this gate (no enforcement in v1). Brief documents it for 6.4b.

**Gate-G-DETERMINISTIC-FEED (HARD; deferred to 6.4b).**
When 6.4b adds actual feed slicing, it MUST be deterministic SQL with stable tiebreakers. NO ML scoring, NO randomization, NO algorithmic re-ranking. Same inputs produce same output.

v1's stub endpoint already satisfies this (it returns standard `last_activity_at DESC` ordering, which is deterministic). Brief documents the constraint for 6.4b.

**Gate-G-DEGRADED-MODE (HARD).**
v1 IS the degraded mode. The brief mandates that v1's behavior remains the safe fallback when 10.4/10.5/10.6 are unavailable, even after 6.4b ships. Specifically:
- If 6.4b's classifier becomes unavailable, the Watch surface reverts to v1's behavior (no crisis slicing, banner still visible, opt-in still works)
- If 6.4b's friend system becomes unavailable, the friends slice is omitted but other slices continue
- If 6.4b's trust check becomes unavailable, the server fails CLOSED (return 503 or omit Watch slicing) — NEVER fail open

v1 ships this fallback as the default; 6.4b adds the enhancements on top.

**Gate-G-COPY (HARD).**
All Watch-related copy is authored in Section 7 D-Copy below. Eric reviews + approves before execute. CC executes against the approved set. NO copy variation between brief and execute without re-approval (Watch copy is safety-relevant; word choice matters more than typical UX copy).

**Gate-G-A11Y (HARD).**
MUST cover:
- `<CrisisResourcesBanner />` has `role="region"` + `aria-labelledby` pointing to its heading
- 988 phone link has `aria-label="Call 988 Suicide and Crisis Lifeline"`
- 988 chat link has `aria-label="Open 988 Lifeline chat in new tab"`
- WatchIndicator chip has `aria-label="3am Watch is on"`
- WatchToggle radio buttons each have descriptive aria-labels
- Confirmation modal has `role="alertdialog"` (alert variant for safety-related), `aria-modal="true"`, focus trap, focus moves to primary action on open, Esc closes (treated as "Not right now")
- All night-state contrast meets WCAG AA per 6.3
- Axe-core passes zero violations at 3 viewport widths in Watch state

**Gate-G-FAIL-CLOSED-OPT-IN (HARD).**
If `useSettings()` hook returns undefined/null/error (e.g., during initial load, or after settings-storage failure), `useWatchMode()` MUST default to OFF — NEVER ON.

This prevents a settings-load race condition from accidentally showing Watch UI to users who haven't opted in.

Integration test: simulate `useSettings()` returning null/error during initial render; verify Watch UI is hidden; verify the user is treated as Watch-off until settings finish loading.

---

## 7. Decisions Catalog

The 16 design decisions baked into the brief that plan and execute must honor.

**D-Scope: v1 ships framework, NOT feed slicing.** (MPD-1)
See Section 2.5 for the full v1 vs. v2 split.

**D-OptInDefault: `'off'` (NEVER auto-enable).** (MPD-5)
New users default to Watch off. Existing users (when 6.4 ships) default to Watch off. Watch is NEVER auto-enabled. The only path to Watch active is explicit user opt-in via the confirmation flow.

**D-OptInFlow: 4-step opt-in.**
1. User has Trust Level 2+ (server-stubbed in v1; future TL check)
2. User taps the WatchToggle radio in Settings ("On" or "Auto")
3. Confirmation modal opens (NOT for opt-out; only for opt-in)
4. User taps "Yes, turn on" → setting persists; modal closes

Opt-out is friction-free: tap "Off" radio → setting persists immediately, no confirmation.

**D-PreferenceStates: `'off' | 'auto' | 'on'`.** (MPD-5)
```typescript
type WatchPreference = 'off' | 'auto' | 'on'
const DEFAULT_WATCH_PREFERENCE: WatchPreference = 'off'
```
Stored at `UserSettings.prayerWall.watchEnabled`. Type alias exported for reuse.

Semantics:
- `'off'` (default): Watch never activates regardless of time/Night Mode
- `'auto'`: Watch activates ONLY when Night Mode is also active (composes with Night Mode)
- `'on'`: Watch activates whenever Watch hours [23..04] apply (independent of Night Mode)

**D-WatchHours: [23, 0, 1, 2, 3, 4] local browser hour.** (MPD-6)
```typescript
function isWatchHour(hour: number): boolean {
  return hour >= 23 || hour < 5
}
```
6-hour span. Browser-local timezone. Live re-evaluation via 60s polling (reuses 6.3's setInterval).

**D-TrustGateStub: v1 server-side, allows any authenticated user.** (MPD-2)
```java
// PostController.getPosts(... @RequestParam(value = "watch", defaultValue = "false") boolean watch)
if (watch) {
    // TODO Spec 10.4: enforce Trust Level 2+
    // For v1, all authenticated users may set watch=true; returns standard feed
    // 6.4b: insert trust level check here, return 403 if TL < 2
}
return postService.getPosts(/* standard params */);
```
Integration tests verify v1 stub behavior; tests with `// TODO 6.4b` comments document expected future behavior.

**D-ClassifierStub: v1 has NO classifier dependency.** (MPD-3)
v1 doesn't check classifier availability. Watch activates purely on opt-in + hours. The classifier integration is added in 6.4b; v1's behavior is the safe fallback (per Gate-G-DEGRADED-MODE).

**D-FeedSortStub: v1 returns standard ordering.** (MPD-1)
`GET /api/v1/posts?watch=true` returns identical results to `GET /api/v1/posts?watch=false` in v1. The query parameter is accepted (for API stability) but doesn't change response.

6.4b modifies this to return the crisis/MH/friends slicing.

**D-CrisisBannerCopy: Authored inline.** (Gate-G-COPY)

Banner heading: **"You're not alone"**

Banner body: 
> If you're going through something heavy right now, support is available. The 988 Suicide and Crisis Lifeline is free, confidential, and open 24/7.

Phone link: `tel:988` with visible text **"Call or text 988"**

Chat link: `https://988lifeline.org/chat/` (opens in new tab) with visible text **"Chat with 988 online"** and the standard external-link icon

Note: the banner is calm and informational, NOT alarming. The framing is "if you need this, it's here" — not "are you in crisis?" or "click here for help."

**D-ConfirmationModalCopy: Authored inline.** (Gate-G-COPY)

Uses master-plan-stub copy (lines 5314-5318) verbatim:

Header: **"Turn on 3am Watch?"**

Body: 
> You'll see mental-health and crisis-flagged posts prioritized in the feed during late-night hours (11pm – 5am), with crisis resources always visible at the top. Watch is opt-in and won't change your feed during the day.

Primary action: **"Yes, turn on"**

Secondary action: **"Not right now"**

Note: Body mentions "mental-health and crisis-flagged posts prioritized" — which is the FUTURE v2 behavior. v1 doesn't actually do this prioritization yet. Brief addresses this in W-Honesty (Watch-fors section below): the v1 modal copy describes the FULL intended behavior so users opt in with accurate expectations even though the slicing won't actually happen until 6.4b ships. The crisis banner DOES appear, so the user gets the safety value either way.

**D-SettingsToggleCopy: Authored inline.** (Gate-G-COPY)

Section heading: **"Sensitive features"**

Section helper text: 
> These features are designed for sensitive content. They're opt-in and can be turned off at any time.

Toggle label: **"3am Watch"**

Toggle description:
> During night hours, the Prayer Wall leads with mental-health and crisis-flagged posts. A crisis-resources banner stays visible at the top. (11pm – 5am local time)

Radio options:
- **"Off"** — "Watch never activates." (default)
- **"Auto"** — "Watch activates when Night Mode is also on."
- **"Always during late hours"** — "Watch activates every night between 11pm and 5am."

**D-WatchIndicatorCopy: Authored inline.** (Gate-G-COPY)

Chip text: **"Watch is on"** (in Lora italic, muted color, non-interactive)

Optional subtitle (if hovered or tapped to expand): no subtitle in v1; the chip is purely a status indicator. Future 6.4b may add a popover with explainer.

**D-ComposerReminderCopy: Authored inline.** (Gate-G-COPY)

Placeholder text in the compose textarea when Watch is active: 
> Simple presence matters. You don't need to fix it.

When the user begins typing, the placeholder disappears (standard placeholder behavior). When user clears their typed text, the placeholder reappears.

Watch-off placeholder: the existing composer placeholder is unchanged (whatever it currently is).

**D-HookAPI: `useWatchMode()` returns `{active, source, userPreference, degraded}`.**
```typescript
type UseWatchModeReturn = {
  active: boolean                              // is Watch currently active right now
  source: 'auto' | 'manual'                    // 'auto' = hours-based; 'manual' = always-during-watch-hours setting
  userPreference: WatchPreference              // 'off' | 'auto' | 'on'
  degraded: boolean                            // true for v1 (no feed slicing); false once 6.4b ships
}
```

The `degraded` field is a forward-compat signal. v1 sets it to `true`. 6.4b modifies the hook to set it to `false` once feed slicing is wired.

**D-NoTracking: NO analytics on Watch behavior.** (Gate-G-NO-ENGAGEMENT-METRICS)
Reinforces 6.3's D-NoTracking. Specifically forbidden events listed in Gate-G-NO-ENGAGEMENT-METRICS.

**D-FailClosedOptIn: Settings load error → Watch off.** (Gate-G-FAIL-CLOSED-OPT-IN)
If `useSettings()` returns null/error/undefined, `useWatchMode()` returns `active: false`. The user never sees Watch UI in an inconsistent state.

**D-NoDismissal: Crisis banner is non-dismissible.** (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE)
The `<CrisisResourcesBanner />` has NO close button, NO "I've seen this" affordance. It remains visible for the entire Watch session. Each new page load during Watch hours re-renders it.

**D-OptOutFriction: Opt-out is friction-free (no confirmation modal).**
Unlike opt-in (which requires a confirmation modal), opt-out is immediate: tap the "Off" radio → setting persists. No "Are you sure?" prompt. Watch should be easy to leave; we should NOT add friction that makes users feel trapped in a sensitive mode.

---

## 8. Watch-fors

Organized by theme. ~35 items total. (More than other specs because of safety stakes.)

### Safety-critical (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE, Gate-G-NO-AI-AUTO-REPLY)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: Crisis banner MUST render whenever `useWatchMode().active === true`. No conditional hiding for any reason.
- W3: Crisis banner is NOT dismissible. NO close button. NO "already seen" state.
- W4: 988 phone link uses `tel:988` format (correct iOS + Android format).
- W5: 988 chat link opens in a new tab via `target="_blank"` AND `rel="noopener noreferrer"` (security best practice).
- W6: NO AI/LLM API call from ANY code path in v1. v1 doesn't add AI infrastructure. Future specs must respect Gate-G-NO-AI-AUTO-REPLY.
- W7: NO crisis-keyword detection happens in v1 (different concern from this spec).

### Opt-in discipline (Gate-G-FAIL-CLOSED-OPT-IN)
- W8: Default user preference is `'off'`. NEVER auto-enable for any user.
- W9: Opt-in REQUIRES confirmation modal. Tapping the radio is NOT sufficient by itself.
- W10: Opt-OUT is friction-free: tapping "Off" radio persists immediately, no confirmation.
- W11: If `useSettings()` returns null/error/loading, `useWatchMode()` returns `active: false`. NEVER assume opt-in during loading.
- W12: After user opts in, the setting persists across sessions, devices (via dual-write), and page refreshes.
- W13: Confirmation modal can be cancelled ("Not right now" OR Esc OR click outside) and the toggle reverts to its previous state (NOT auto-saved as the new state).

### Brand voice / copy (Gate-G-COPY)
- W14: Crisis banner copy is calm, NOT alarming. "Support is available" not "Get help now."
- W15: Confirmation modal copy frames opt-in as a choice, NOT a recommendation. "Yes, turn on" and "Not right now" feel equally valid.
- W16: Settings description uses "opt-in" and "turned off at any time" language to reinforce user agency.
- W17: WatchIndicator chip text is neutral status ("Watch is on"). NOT performative ("Watching with you tonight"). NOT engagement-bait ("3 people watching now").
- W18: Composer reminder uses "You don't need to fix it" — permission, not pressure.
- W19: Honesty about v1 vs. v2: confirmation modal copy describes the FULL intended behavior (feed prioritization). The crisis banner does work; the feed prioritization is deferred to 6.4b. **Brief acknowledges this is a known dissonance for v1; the banner's harm-reduction value justifies the opt-in framing.** Plan documents this in the v1 plan; future 6.4b updates the modal copy to match actual behavior.

### Scope discipline (per Section 2.5)
- W20: NO classifier integration in v1. NO `Crisis*` imports. NO calls to a crisis-classification service.
- W21: NO trust level check in v1. ANY authenticated user can opt in (defense-in-depth deferred).
- W22: NO friend lookup in v1. NO calls to friend-relationship tables.
- W23: Feed re-sort STUB returns identical data to non-watch endpoint. NO slicing logic in v1.
- W24: NO mental-health post slicing in v1. NO `Post.category = 'MENTAL_HEALTH'` filter in v1.
- W25: NO section dividers in v1 (no slicing → nothing to divide).
- W26: NO share-as-image disabling in v1 (depends on classifier).

### Anti-metrics (Gate-G-NO-ENGAGEMENT-METRICS)
- W27: NO new analytics events for Watch behavior. NO `watch.*` events. NO surveillance of Watch users.
- W28: NO "N people watching tonight" counters EVER.
- W29: NO time-on-page metrics during Watch hours.
- W30: Aggregate server-side request counts per hour ARE allowed (capacity planning only); but NEVER surface to users or include user identifiers.

### Accessibility (Gate-G-A11Y)
- W31: Confirmation modal is `role="alertdialog"` (alert variant for safety-related decisions), `aria-modal="true"`, focus trap.
- W32: Focus moves to PRIMARY action ("Yes, turn on") on modal open. Tab cycles between primary, secondary, close-X.
- W33: Esc key closes modal AS "Not right now" (treated as user declining opt-in, not as silent cancel).
- W34: 988 phone link is the FIRST focusable element in the crisis banner (screen reader users get to the most actionable item first).
- W35: All Watch UI elements respect `prefers-reduced-motion: reduce`.

---

## 9. Test Specifications

~30 tests total. Heavy on safety-critical assertions and integration tests with mocked time.

### Frontend unit tests (~5)
- `isWatchHour(hour)`: returns true for 23, 0, 1, 2, 3, 4; false for 5, 6, ..., 22.
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
- `<CrisisResourcesBanner>`: renders with role="region", aria-labelledby pointing to heading.
- `<CrisisResourcesBanner>`: contains tel:988 link with correct aria-label.
- `<CrisisResourcesBanner>`: contains chat link with target="_blank" rel="noopener noreferrer".
- `<CrisisResourcesBanner>`: NO close button rendered (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE).
- `<WatchToggle>`: tapping "On" radio opens confirmation modal (does NOT immediately persist setting).
- `<WatchToggle>`: tapping "Off" radio when current state is on, persists immediately, no modal (Gate-G-OPT-OUT-FRICTIONLESS).
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
- `GET /api/v1/posts?watch=true` from authenticated user: returns 200 with feed in standard order.
- `GET /api/v1/posts?watch=true` from unauthenticated request: returns 401.
- `GET /api/v1/posts?watch=invalid`: parameter parsing falls back to false; returns 200 with standard feed; NO error.

### Playwright E2E (~3)
- **Happy-path opt-in:** Login, navigate to Settings, find "Sensitive features" section, click "On" radio, verify confirmation modal appears with exact authored copy, click "Yes, turn on", verify modal closes, verify setting persists across refresh.
- **Watch active during Watch hours:** With Watch opted in, mock browser time to 11:00pm, navigate to Prayer Wall, verify CrisisResourcesBanner visible with 988 link, verify WatchIndicator chip visible, verify composer placeholder is the Watch variant, verify QOTD widget is NOT rendered.
- **Watch inactive outside Watch hours:** With Watch opted in, mock browser time to 11:00am, navigate to Prayer Wall, verify NO Watch UI elements (banner absent, indicator absent, composer normal placeholder, QOTD visible).

### Accessibility test (~2)
- Axe-core scan on Prayer Wall in Watch state: zero violations at desktop + tablet + mobile widths.
- Axe-core scan on confirmation modal: zero violations.

---

## 10. Files

### To CREATE

**Frontend:**
- `frontend/src/hooks/useWatchMode.ts` — the hook per D-HookAPI
- `frontend/src/hooks/__tests__/useWatchMode.test.ts` — unit + integration tests
- `frontend/src/lib/watch-mode-resolver.ts` — pure functions: `isWatchHour()`, `resolveWatchModeActive()`
- `frontend/src/lib/__tests__/watch-mode-resolver.test.ts` — unit tests
- `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` — banner per D-CrisisBannerCopy + Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE
- `frontend/src/components/prayer-wall/__tests__/CrisisResourcesBanner.test.tsx` — banner tests
- `frontend/src/components/prayer-wall/WatchIndicator.tsx` — chip per D-WatchIndicatorCopy
- `frontend/src/components/prayer-wall/__tests__/WatchIndicator.test.tsx` — indicator tests
- `frontend/src/components/settings/WatchToggle.tsx` — 3-radio toggle per D-PreferenceStates
- `frontend/src/components/settings/__tests__/WatchToggle.test.tsx` — toggle tests
- `frontend/src/components/settings/WatchOptInConfirmModal.tsx` — confirmation modal per D-ConfirmationModalCopy
- `frontend/src/components/settings/__tests__/WatchOptInConfirmModal.test.tsx` — modal tests
- `frontend/src/constants/watch-copy.ts` — all Watch strings per Section 7 D-Copy decisions (banner, modal, settings, indicator, composer reminder)
- `frontend/tests/e2e/watch-mode.spec.ts` — Playwright E2E suite
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — documentation per Gate-G-NO-AI-AUTO-REPLY

### To MODIFY

**Frontend:**
- `frontend/src/pages/PrayerWall.tsx` — read `useWatchMode()`; render `<CrisisResourcesBanner />` at top of feed when active; render `<WatchIndicator />` in page header when active; pass watchActive to composer for placeholder swap
- `frontend/src/pages/Settings.tsx` — add "Sensitive features" section per MPD-11; mount `<WatchToggle />` inside it
- `frontend/src/components/prayer-wall/<Composer>` — plan-recon finds the exact composer component; swap placeholder when `useWatchMode().active`
- `frontend/src/components/prayer-wall/<QOTD>` — plan-recon finds the QOTD component; suppress rendering when `useWatchMode().active`
- `frontend/src/types/settings.ts` — add `watchEnabled: WatchPreference` to `UserSettings.prayerWall` namespace; export `WatchPreference` type
- `frontend/src/services/settings-storage.ts` — update default settings shape to include `watchEnabled: 'off'`
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.prayerWall.watchEnabled` semantics

**Backend:**
- `backend/src/main/java/com/worshiproom/post/PostController.java` — accept optional `?watch=true` query param on GET /api/v1/posts; STUB behavior: ignore the param for v1, pass through to standard handler (with `// TODO Spec 6.4b` comment)
- `backend/src/main/resources/openapi.yaml` — document `?watch` query param + Spec 6.4 v1 semantics
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` (or similar) — add 3 tests per Section 9 backend integration

### NOT to modify (explicit non-targets)
- Frontend: no new feed component; integrations happen in `PrayerWall.tsx` where feed renders today (per R6)
- Backend: NO new `WatchFeedService.java` in v1 (per R5; deferred to 6.4b)
- Backend: NO new `feed/` package directory
- Backend: NO friend-system Java code (per R2; v1 doesn't need it)
- Backend: NO trust level Java code (per R3; v1 stubs it)
- Backend: NO crisis classifier Java code (per R4; v1 doesn't depend on it)
- `PostSpecifications.java` — not modified in v1; 6.4b uses this for actual feed slicing
- 6.1's Prayer Receipt code — orthogonal
- 6.2's Quick Lift code — orthogonal
- 6.3's Night Mode code — 6.4 USES `useNightMode()` but does NOT modify it; the hook's public API is stable per D-Hook-API forward-compat

### To DELETE
None. 6.4 is purely additive.

---

## 11. Acceptance Criteria

**Functional (v1 scope):**
- A. `useWatchMode()` hook returns `{active, source, userPreference, degraded}` per D-HookAPI
- B. WatchToggle in Settings "Sensitive features" section; 3 radio options (Off / Auto / Always during late hours); default 'off'
- C. Tapping "On" or "Auto" opens confirmation modal; user must tap "Yes, turn on" to persist; tapping "Not right now" reverts toggle
- D. Tapping "Off" persists immediately (no confirmation)
- E. WatchIndicator chip visible in PrayerWall page header when `active: true`
- F. CrisisResourcesBanner visible at top of Prayer Wall feed when `active: true`; non-dismissible (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE)
- G. Banner contains 988 phone link (tel:988) + 988 chat link (https://988lifeline.org/chat/ opening in new tab)
- H. Composer placeholder swaps to "Simple presence matters. You don't need to fix it." when `active: true`
- I. QOTD widget suppressed when `active: true`
- J. Setting persists across sessions, devices (via dual-write), and page refreshes
- K. Server-side `GET /api/v1/posts?watch=true` stub endpoint accepts param; returns standard feed (v1 stub)
- L. ~30 tests covering all safety invariants in v1 scope

**Safety invariants (HARD):**
- M. Default user preference is 'off'; NEVER auto-enable for any user (Gate-G-FAIL-CLOSED-OPT-IN)
- N. `useSettings()` null/error/loading state → `useWatchMode()` returns `active: false`
- O. NO AI/LLM integration in v1 (Gate-G-NO-AI-AUTO-REPLY)
- P. NO new analytics events for Watch behavior (Gate-G-NO-ENGAGEMENT-METRICS)
- Q. Crisis banner is non-dismissible during entire Watch session
- R. `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` documents the prohibition for future specs

**Accessibility:**
- S. Confirmation modal: `role="alertdialog"`, `aria-modal="true"`, focus trap, focus moves to primary action on open, Esc closes as "Not right now"
- T. Crisis banner: `role="region"`, `aria-labelledby` pointing to heading, 988 phone link is first focusable element
- U. WatchIndicator chip has `aria-label="3am Watch is on"`
- V. All WatchToggle radio buttons have descriptive `aria-label`
- W. Axe-core passes zero violations at desktop + tablet + mobile widths in Watch state
- X. Reduced-motion accommodation: chip's breathing-glow disabled (inherits from NightWatchChip pattern), banner has no fade-in

**Brand voice:**
- Y. All Watch copy passes Gate-G-COPY audit (calm, non-coercive, opt-in framing)
- Z. Banner copy frames support as available, not urgent
- AA. Confirmation modal copy makes "Not right now" feel equally valid as "Yes, turn on"

**Scope discipline:**
- BB. NO feed slicing in v1 (Section 2.5; deferred to 6.4b)
- CC. NO trust level enforcement in v1 (server-stubbed)
- DD. NO classifier integration in v1
- EE. NO friend system integration in v1
- FF. NO share-as-image disabling in v1

---

## 12. Out of Scope (v1)

Explicitly NOT in 6.4 v1. Some are deferred to **6.4b** (which lands once 10.4/10.5/10.6/friend-Java ship); some are anti-features (never).

### Deferred to 6.4b (once dependencies ship)
- Crisis-flagged content slice in feed re-sort (depends on 10.5 + 10.6 classifier)
- Mental-health post slice in feed re-sort (depends on Post.category recon)
- Friends & family post slice in feed re-sort (depends on friend-Java)
- Section dividers between feed slices ("From the last day" / "Friends & family" / "Also here today")
- Share-as-image disabled on crisis-flagged posts during Watch (depends on classifier)
- Trust Level 2+ server-side enforcement (depends on 10.4)
- Frontend hiding of WatchToggle for TL<2 users (depends on 10.4)
- Server-side classifier availability check + graceful fallback messaging (depends on classifier infrastructure)
- `WatchFeedService.java` backend service
- Mental-health category Liquibase changes (if Post.category needs MENTAL_HEALTH value added)

### Anti-features (never)
- "N people watching tonight" counter
- Push notifications when new crisis content appears
- AI auto-reply to crisis posts (ANY future spec must respect this)
- Engagement metrics during Watch hours
- Surveillance over Watch-user behavior
- Performative "Thank you for watching" badges or celebrations
- Pressure copy ("You haven't Watched in a while")
- Recommending Watch to users who haven't opted in
- ML-scored or algorithmic feed re-ranking (6.4b's slicing is deterministic SQL only)
- Per-post view tracking during Watch hours
- Time-on-page metrics during Watch hours

### Different concerns (out of scope for this spec entirely)
- Crisis-keyword detection in composer (different system; future spec if any)
- Post-level crisis flagging by users (a Report system; separate concern)
- Moderator review of crisis-flagged content (Phase 11 / moderation system)
- Crisis-content visibility settings beyond Watch (e.g., "never show me crisis posts")
- Mental-health category creation as a user-selectable post type (different feature)
- International crisis hotlines beyond 988 (US-only for v1; future i18n spec)
- Site-wide dark mode (different concern from Watch)

---

## 13. Tier Rationale

**Why MAX not xHigh:** Crisis-adjacent UX with real wellbeing stakes; multiple HARD safety gates; backend changes (first in 6.x); server-side enforcement requirements; multi-layered opt-in; un-shipped target infrastructure requiring degraded-mode design; explicit prohibition on AI auto-reply that must be documented for future-spec compliance.

**Why MAX not "this can't ship now":** v1 ships a SAFE degraded mode. The opt-in framework + crisis banner + composer reminder + QOTD suppression deliver real value (988 visible during Watch hours is harm reduction) WITHOUT relying on un-shipped infrastructure. v1 is correct, just less rich than the full vision. 6.4b lands the full vision once dependencies are in place.

**Practical execution implication:** MAX tier means CC uses Opus 4.7 thinking `xhigh` for ALL phases (no exceptions, even routine edits). Eric reviews:
- Every safety-relevant code path before merge
- All Watch copy strings (banner, modal, settings, indicator, composer reminder)
- Server-side stub endpoint and its tests
- The `useWatchMode()` hook public API (forward-compat with 6.4b)
- Settings UX flow (toggle behavior, confirmation modal, opt-out friction)
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` content
- Manual flow-walking at 11pm local time on a fresh account
- Reading every copy variant aloud and verifying gentleness
- Verifying NO analytics events are emitted in Watch mode (network tab check)

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.4 v1 per
/Users/eric.champlin/worship-room/_plans/forums/spec-6-4-brief.md.

Tier: MAX. Use Opus 4.7 thinking depth xhigh throughout ALL phases.

Honor all 15 MPDs, 16 decisions, ~35 watch-fors, ~30 tests, and 7 new gates
(Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE, Gate-G-NO-AI-AUTO-REPLY,
Gate-G-NO-ENGAGEMENT-METRICS, Gate-G-TRUST-LEVEL-SERVER-ENFORCED [deferred to
6.4b], Gate-G-DETERMINISTIC-FEED [deferred to 6.4b], Gate-G-DEGRADED-MODE,
Gate-G-COPY, Gate-G-A11Y, Gate-G-FAIL-CLOSED-OPT-IN).

CRITICAL: Section 2.5 is brief-level Scope Reality. The v1 scope is the
framework (opt-in flow + banner + composer reminder + QOTD suppression +
settings UI + stub endpoint). The v2 scope (feed slicing + classifier +
trust + friends) is deferred to a future Spec 6.4b.

Required plan-time recon (R7-R12):
- R7: read Post.java + category enum (verify infrastructure; not blocking)
- R8: locate QOTD component; pick suppression integration point
- R9: locate compose modal / textarea; pick placeholder swap integration point
- R10: verify 988 chat URL is current (https://988lifeline.org/chat/)
- R11: read Settings.tsx (post-6.3); pick insertion point for "Sensitive
  features" section
- R12: find existing confirmation modal pattern; reuse OR build one-off
  WatchOptInConfirmModal

Plan-time divergences from brief: document in a Plan-Time Divergences
section. Justifiable divergences welcome; surface them. Safety-critical
divergences require Eric's explicit chat sign-off before execute.

Do NOT plan for execution while Spec 6.3 is running. 6.3 must merge first
so 6.4 can build on `useNightMode()`. The plan can be authored at any time.

ALL Watch copy (banner, modal, settings, indicator, composer reminder) in
Section 7 D-Copy is BRIEF-LEVEL CONTENT. Generate plan referencing verbatim.
CC during execute may NOT light-edit Watch copy (vs. other specs where
2-word edits are OK). All Watch copy is safety-relevant; word choice matters
more than typical UX copy.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist (this one is longer than other specs because of MAX tier):**

1. Review code diff section by section. Pay special attention to:
   - `useWatchMode.ts` (hook correctness; especially fail-closed opt-in)
   - `CrisisResourcesBanner.tsx` (banner content; 988 link format; non-dismissibility)
   - `WatchOptInConfirmModal.tsx` (modal copy verbatim; focus trap; primary-action focus on open)
   - `WatchToggle.tsx` (opt-in vs opt-out friction asymmetry)
   - `PostController.java` (stub endpoint; TODO comment for 6.4b)
   - `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` (documentation content)

2. Open Settings at 2pm. Find "Sensitive features" section. Verify it's clearly labeled. Verify section helper text is calm + informative.

3. Verify WatchToggle default state is "Off". Tap "Off" radio when already off — verify nothing happens (no modal, no state change).

4. Tap "On" radio. Verify confirmation modal opens with EXACT brief-authored copy. Read modal copy aloud:
   - Header: "Turn on 3am Watch?"
   - Body: matches brief
   - Primary: "Yes, turn on"
   - Secondary: "Not right now"
   - Verify both buttons feel equally valid (not "Yes" emphasis + "No" de-emphasis).

5. Tap "Not right now". Verify modal closes and toggle reverts to "Off" (NOT persisted as "On").

6. Tap "On" radio again. Tap "Yes, turn on". Verify modal closes; toggle stays at "On"; refresh page; verify setting persisted.

7. Tap "Off" radio. Verify NO confirmation modal appears (friction-free opt-out). Verify setting persists immediately.

8. With Watch opted in, at 11pm local time (or via test harness mock):
   - Navigate to Prayer Wall
   - Verify CrisisResourcesBanner is visible at top of feed
   - Verify banner copy matches brief verbatim
   - Verify NO close button on banner
   - Tap the 988 phone link on a real phone; verify phone app opens with 988 pre-dialed (DO NOT actually call)
   - Tap the chat link; verify it opens https://988lifeline.org/chat/ in a new tab
   - Verify WatchIndicator chip is visible in page header
   - Verify composer placeholder is the Watch variant when opening compose modal
   - Verify QOTD widget is NOT rendered

9. With Watch opted in, at 11am (outside Watch hours): verify NO Watch UI elements (banner absent, indicator absent, composer normal, QOTD visible).

10. With Watch NOT opted in, at 3am: verify NO Watch UI elements (the user is in Night Mode per 6.3 but Watch is gated on opt-in).

11. With Watch opted in at 11pm: open browser dev tools → Network tab. Reload page. Verify NO new analytics events with `watch.*` names. Verify NO time-on-page tracking. Verify NO per-post view tracking. (Gate-G-NO-ENGAGEMENT-METRICS)

12. With Watch opted in, toggle off mid-session. Verify banner/indicator/composer/QOTD all transition to normal within 60s (next polling tick).

13. Run axe-core scan on Prayer Wall in Watch state. Verify zero violations at desktop, tablet, mobile widths.

14. Run axe-core scan on confirmation modal. Verify zero violations.

15. With screen reader (VoiceOver or NVDA): navigate to Prayer Wall in Watch state. Verify:
    - CrisisResourcesBanner is announced as a region
    - 988 phone link is the first focusable element in the banner
    - WatchIndicator chip is announced as "3am Watch is on"
    - Confirmation modal traps focus when open

16. Open the brief's `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md`. Read it aloud. Verify it's clear that ANY future spec adding AI features must check crisis-classification before invoking AI on user content.

17. Visual judgment (the MAX-tier call only Eric can make): does the entire Watch experience feel like a calm presence for someone who's awake at 3am, or does it feel like a clinical safety panel? The brief intends presence-not-panel. If it feels off, flag specific elements for revision before merge.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.4 (v1) flips ⬜ → ✅.

**If any safety-relevant element feels wrong:** Halt merge. Open chat with Claude. Discuss revision before commit. Do NOT merge a safety-adjacent feature on "good enough."

---

## 16. Prerequisites Confirmed

- **6.3 (Night Mode):** must merge first; 6.4 builds on `useNightMode()` hook
- **6.2 (Quick Lift):** ✅ (prerequisite chain: 6.1 → 6.2 → 6.3 → 6.4)
- **6.1 (Prayer Receipt):** ✅ (provides `UserSettings.prayerWall` namespace)
- **Post infrastructure:** ✅ verified via R1 (PostController + ~50 files)
- **Existing Settings + useSettings + settings-storage:** ✅ (from 6.1)
- **Existing PrayerWall.tsx feed location:** ✅ verified via R6 (feed in PrayerWall.tsx; no Feed component)

**Runtime-gated dependencies (NOT blockers for v1; required for 6.4b):**
- 10.4 Trust Levels — NOT SHIPPED. v1 stubs.
- 10.5 Three-tier escalation — NOT SHIPPED. v1 omits.
- 10.6 Automated flagging — NOT SHIPPED. v1 omits.
- Friend system Java layer — NOT SHIPPED. v1 omits.
- Post.category MENTAL_HEALTH enum value — NEEDS PLAN-RECON (R7). v1 doesn't depend on it.

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 OR 6.1 → 6.2 → 6.2b → 6.3 → 6.4 → 1.5g. 6.4 cannot execute concurrently with 6.3 (shared useNightMode/PrayerWall surface).

After 6.3 merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves ALL Watch copy in Section 7 D-Copy decisions
- Eric reviews + approves Section 2.5 Scope Reality (the v1/v2 split)
- Run `/spec-forums spec-6-4-brief.md` → generates spec file
- Run `/plan-forums spec-6-4.md` → generates plan file (with R7-R12 plan-recon)
- Eric reviews plan + verifies it honors all 7 new HARD gates + 16 decisions
- Eric verifies plan flags safety-critical changes that require chat sign-off before execute
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-4.md` → executes
- Eric reviews code via the 17-item verification checklist above
- Eric commits + pushes + MRs + merges

**Post-merge:** 6.4 (v1) ships. Future Spec 6.4b is authored when 10.4/10.5/10.6/friend-Java land; 6.4b adds the feed slicing + trust gate + classifier integration on top of v1's framework.

---

## End of Brief
