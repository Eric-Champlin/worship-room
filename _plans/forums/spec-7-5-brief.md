# Forums Wave: Spec 7.5 — Local Support Bridges (Counselor Referral on Mental Health Prayer Composition)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.5 stub (master plan lines 6449–6466). Size M, Risk Medium, prerequisites 7.4. Six-AC checklist (bridge only on Mental Health prayer requests, one-line copy with link to counselors page, session-dismissible, no re-render after dismiss, brand voice non-pressuring, ≥8 tests). Goal: *"When composing a Mental Health prayer, a quiet section below the textarea offers 'Counselors near you' link to /local-support/counselors."* (Stub goal text truncated — exact wording reconstructed from search snippets + existing CrisisBanner pattern.)

**Brief Source:** This brief, authored 2026-05-16 against the live master plan stub + live code recon.

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Date:** 2026-05-16.

**Spec ID:** `round3-phase07-spec05-local-support-bridges`

**Phase:** 7 (Cross-Feature Integration) — the fifth spec.

**Size:** M

**Risk:** Medium — the spec is small in code but lives in **load-bearing anti-pressure territory**. The Mental Health category is governed by Gate-G-MH-OMISSION HARD (Spec 6.6 master plan), which excludes Mental Health from the Answered Wall's category filter because *"healing is rarely linear, and a filter chip on a celebration"* implies pressure on people in that territory. 7.5 is the inverse — surfacing local-support resources WHEN a user is composing — which is complementary, NOT contradictory. But the brief must respect the broader anti-pressure design ethos. Risk also comes from: (a) when exactly to render the bridge (composer state observation), (b) session-scoped dismissal semantics, (c) ensuring the bridge doesn't pressure users to seek counseling when they don't need it.

**Tier:** Standard.

---

## Affected Frontend Routes

- `/prayer-wall` (the InlineComposer inline on PrayerWall renders the bridge when conditions are met)
- `/prayer-wall/:id` (PrayerDetail's InlineComposer reply mode — see R3 for whether the bridge applies here too)
- `/prayer-wall/dashboard`, `/prayer-wall/user/:id` (any route mounting InlineComposer with the Mental Health + prayer_request combo)

The bridge is composer-state-driven, NOT route-driven. It fires anywhere InlineComposer is rendered when the user picks Mental Health + Prayer Request.

---

## STAY ON BRANCH

Same as Phase 6, 7.1, 7.2, 7.3, 7.4 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

| Item | Status | Evidence |
|---|---|---|
| `'mental-health'` IS the canonical category key (kebab-case literal) | ✅ | `frontend/src/constants/prayer-categories.ts:2` — array literal `['health', 'mental-health', 'family', ...]`. Line 10 maps `'mental-health': 'Mental Health'`. Stub's category id matches |
| InlineComposer has `selectedCategory` state | ✅ | `InlineComposer.tsx:243` — `const [selectedCategory, setSelectedCategory] = useState<PrayerCategory \| null>(null)`. Set via `setSelectedCategory` in category-pill onClick at line 642 |
| InlineComposer accepts `postType` (5 canonical types: `prayer_request`, `testimony`, `question`, `discussion`, `encouragement`) | ✅ | `InlineComposer.tsx:81-137` — per-type copy config blocks. `prayer_request` is line 81-87 |
| `/local-support/counselors` route exists and is active | ✅ | `App.tsx:311` — `<Route path="/local-support/counselors" element={...} />`. `Counselors.test.tsx` exists. Page is fully shipped |
| `LOCAL_SUPPORT_LINKS` constant exports canonical link set | ✅ | `frontend/src/components/LocalSupportDropdown.tsx:6-10` — `{ label: 'Counselors', to: '/local-support/counselors' }`, plus 'Churches' and 'Celebrate Recovery' |
| `CrisisBanner.tsx` already implements the EXACT pattern this spec wants (link to /local-support/counselors with copy) | ✅ | `frontend/src/components/daily/CrisisBanner.tsx:44-48` — `<Link to="/local-support/counselors" className="text-sm font-semibold text-primary underline">`. Copy: *"Find a counselor near you"* (from test at `CrisisBanner.test.tsx:59`). **This is the canonical pattern 7.5 should mirror** |
| `useMonthlyReportSuggestions.ts:36-38` has another precedent: two CTAs (pray + counselor) | ✅ | Pattern of pairing "Talk to God about it" + "Find a counselor near you" already exists. 7.5 doesn't need both; ACs say "one-line copy with link to counselors page" |
| Session-scoped dismissal pattern exists (sessionStorage-based) | ✅ | `frontend/src/services/welcome-back-storage.ts:36-56` (`shouldShowWelcomeBack` / `markWelcomeBackShown`); `frontend/src/services/surprise-storage.ts:95-110` (`hasMidnightVerseBeenShown` / `markMidnightVerseShown`). Both use `sessionStorage.setItem` and graceful try/catch. **7.5 mirrors this pattern** |
| Gate-G-MH-OMISSION HARD context (Spec 6.6) is documented heavily in code | ✅ | `frontend/src/components/prayer-wall/AnsweredCategoryFilter.tsx:10-22` — explicit JSDoc explains WHY Mental Health is omitted from answered-wall filter chips: *"healing is rarely linear, and a filter chip on a celebration would imply pressure on people living in that territory."* Also `frontend/src/constants/answered-wall-copy.ts:91-97` `MH_OMISSION_RATIONALE` constant. **7.5's brief must not violate this ethos** |
| `PrayTabContent` is where Daily Hub Pray tab lives (not directly relevant but confirms patterns) | ✅ | Confirmed earlier from 7.4 recon. Composer is the focus of 7.5, not Daily Hub |
| 6.4 Watch crisis-suppression + 6.11b crisis-flag handling | ✅ (claim) | Per prior specs. Plan-recon confirms how the bridge interacts with active Watch / crisis-flagged posts — see R5 |

**Recon override:** Two things differ from the stub:
1. The exact bridge copy needs reconciliation — stub says "Counselors near you" but the existing CrisisBanner uses "Find a counselor near you." Plan-recon picks (or copy review picks) the canonical wording.
2. The stub says "below the textarea" but plan-recon should verify the visual placement based on InlineComposer's layout — see R2.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** The bridge renders **only when ALL THREE conditions are true:**
- `postType === 'prayer_request'`
- `selectedCategory === 'mental-health'`
- The bridge has NOT been dismissed in the current session

If any condition becomes false (user switches category, switches post type, or dismisses), the bridge hides.

**MPD-2.** The bridge is a NEW component `CounselorBridge.tsx` (or similar — plan-recon picks the name) rendered INSIDE InlineComposer. Render position: BELOW the textarea, ABOVE the submit button row, AT THE SAME visual level as existing inline callouts (e.g., the `expiryWarning` callout per `InlineComposer.tsx:54-56`). Plan-recon confirms by reading the existing component layout.

**MPD-3.** The bridge's visual treatment is QUIET:
- Single line of copy: *"Want to talk to someone? Find a counselor near you"* (plan-recon may iterate per brand voice gate R6)
- Inline icon (e.g., subtle UserCircle or similar — NOT alarming)
- Link styled as muted text-primary underline (mirrors CrisisBanner.tsx:46-48)
- Subtle Dismiss button (X icon, ghost styling, NOT prominent)
- NO surrounding card / panel / border / background color
- NO crisis-resources-banner styling (this is NOT a crisis intervention; it's a quiet bridge)

**MPD-4.** Dismissal is session-scoped via `sessionStorage`:
- Key: `wr_counselor_bridge_dismissed` (mirroring `welcome-back-storage.ts` and `surprise-storage.ts` patterns)
- Once dismissed, do NOT re-render in the same session even if user toggles category away and back
- Cleared on browser session end (tab close / browser restart)
- NEW file: `frontend/src/services/counselor-bridge-storage.ts` exporting `shouldShowCounselorBridge()` and `markCounselorBridgeDismissed()` — mirrors the existing service-storage pattern

**MPD-5.** The bridge is **distinct from** existing crisis-detection mechanisms:
- The 6.4 Watch + 6.11b crisis-flag system is content-driven (PostCrisisDetector scans `content` for crisis keywords)
- 7.5's bridge is CATEGORY-driven (user explicitly tagged the post Mental Health)
- The two systems coexist. If a user picks Mental Health AND types crisis-keyword content, BOTH the bridge AND the crisis-detection UI may render. The bridge is a low-key always-present option; crisis-detection is high-key intervention.

**MPD-6.** The bridge does NOT replace, hide, or alter existing crisis-detection UI. If a crisis-resources banner is also showing (per 6.4 / 6.11b), the bridge sits separately. Plan-recon confirms by reading the existing crisis-suppression UI lifecycle.

**MPD-7.** Auth-agnostic. Unauthenticated users composing a Mental Health prayer request also see the bridge. Counseling resources are public goods.

**MPD-8.** No backend changes. The spec is frontend-only.

---

## Plan-Recon Gating Questions (R1–R7)

**R1 — Exact category condition (load-bearing).** Three options:
- (a) **`'mental-health'` only** (default per MPD-1). Stub says "Mental Health prayer requests" so this is the canonical.
- (b) **Include `'health'` too.** Stub doesn't say but plan-recon may surface — physical health prayers sometimes have mental-health overtones (e.g., addiction). Default leans NO.
- (c) **Include `'grief'` too.** Grief is its own category and grief counselors exist. But stub specifies Mental Health only.

**Default per MPD-1: (a) `'mental-health'` only.** Plan-recon may surface if Eric wants broader category coverage. Worth knowing: expanding to (b) or (c) would require a parallel decision on whether the link target changes (counselors page handles all kinds of counselors).

**R2 — Bridge placement in composer layout.** Three options:
- (a) **Below textarea, above submit row.** Default per MPD-2.
- (b) **Above textarea, below category pills.** Alternative — appears at the moment the user picks Mental Health, before they start typing.
- (c) **Below entire composer, above the next post in feed.** Outside the composer surface. Unlikely candidate.

**Default per MPD-2: (a).** Below textarea aligns with the "quiet companion" anti-pressure design. (b) might feel like an interrogation ("we noticed you picked Mental Health, here, see this"). Plan-recon may surface for design review.

**R3 — Does the bridge fire on InlineComposer in REPLY mode (PrayerDetail.tsx)?** When someone is REPLYING to another user's Mental Health prayer in comments, should the counselor bridge appear?
- (a) **No.** The bridge is for the AUTHOR of a Mental Health post, not commenters/intercessors. The intercessor isn't seeking counsel; they're offering prayer.
- (b) **Yes.** A commenter on a mental-health prayer might also benefit from local-support resources.

**Default: (a) NO bridge in reply mode.** Plan-recon confirms by reading where InlineComposer is mounted in PrayerDetail (probably as a comment composer with different `postType` semantics). If the comment composer doesn't use postType `'prayer_request'`, MPD-1's condition naturally excludes it. Verify.

**R4 — Bridge copy + brand voice (load-bearing for anti-pressure ethos).** Specifically:
- (a) **"Want to talk to someone? Find a counselor near you"** (suggested above). Soft framing.
- (b) **"Counselors near you"** (per stub literal). Even softer — just an offer, not a question.
- (c) **"Need professional support? Find a counselor near you"** (mirrors CrisisBanner more closely). Slightly more direct but possibly more pressuring.
- (d) **"Prayer can sit alongside professional support — find a counselor near you"** (theologically respectful, removes either-or pressure).

**Default per stub: (b) "Counselors near you"** with the link going to /local-support/counselors. Plan-recon refines per brand voice. The goal: this is an offered tool, not a recommendation, not a diagnosis, not pressure.

**R5 — Interaction with crisis detection UI (Watch / 6.4 / 6.11b).** When a user has both:
- Picked Mental Health + Prayer Request (bridge condition)
- Typed content containing crisis keywords (crisis-detection condition triggers crisis-resources banner)

What renders?
- (a) **Both.** Bridge + crisis-resources banner. They serve different purposes; both visible.
- (b) **Crisis-resources banner ONLY.** The bridge is suppressed when crisis-detection has already escalated. Less visual noise.
- (c) **Bridge ONLY.** The crisis-resources banner replaces the bridge.

**Default: (a) BOTH.** They're complementary; the bridge is for "I picked Mental Health" and the crisis banner is for "the content suggests immediate danger." They aren't redundant. Plan-recon confirms with Eric.

**R6 — Brand voice gate for bridge copy.** Per AC, brand voice review must pass. Specifically:
- Copy must NOT pressure the user toward seeking counseling
- Copy must NOT imply they "need" help
- Copy must NOT diagnose ("you might be depressed")
- Copy must NOT use commercial language ("connect with a therapist today!")
- Copy must NOT use clinical language ("your symptoms")
- Copy SHOULD: offer the option naturally, in passing, as a companion to prayer

Per Gate-G-MH-OMISSION HARD's rationale (`AnsweredCategoryFilter.tsx:10-22`): *"healing is rarely linear."* The bridge copy must respect that — *"Want to talk to someone?"* is OK; *"Are you OK?"* is not. Plan-recon's brand voice review is load-bearing.

**R7 — Re-render-after-dismiss semantics.** The AC says *"Does not re-render after dismiss in same session."* Edge cases:
- (a) User dismisses → switches category to Family → switches back to Mental Health. Bridge should NOT re-appear.
- (b) User dismisses → submits successfully → opens a new composer. Bridge should NOT re-appear in the same session.
- (c) User dismisses → reloads page. Session is still active (sessionStorage persists). Bridge should NOT re-appear.
- (d) User dismisses → closes tab and reopens later. Session ended. Bridge MAY re-appear.

Default: dismissal is session-scoped (sessionStorage), so (a)/(b)/(c) NO re-appear, (d) YES re-appear. Tests cover all 4 cases.

---

## Section 1 — As-Designed Behavior

### 1.1 User opens composer

User taps "Share something" on `/prayer-wall`. InlineComposer renders. Default postType is whatever the surface configured (likely `prayer_request`). User has not picked a category. Bridge does NOT render (selectedCategory is null).

### 1.2 User picks Mental Health category

User taps the "Mental Health" category pill. `setSelectedCategory('mental-health')`. Component re-renders. The bridge condition is now true (postType='prayer_request' AND selectedCategory='mental-health' AND not-dismissed).

`<CounselorBridge />` renders below the textarea per MPD-2.

### 1.3 User dismisses

User taps the X dismiss button on the bridge. `markCounselorBridgeDismissed()` writes `wr_counselor_bridge_dismissed=true` to `sessionStorage`. Component re-renders. Bridge does NOT render.

### 1.4 User switches category and back

User taps "Family" → bridge condition false (selectedCategory='family'). Bridge does NOT render.

User taps "Mental Health" again → bridge condition: postType='prayer_request' AND selectedCategory='mental-health' AND dismissed (per session). Bridge does NOT render. Sticky dismissal.

### 1.5 User submits

User submits. Composer resets (`setSelectedCategory(null)`). Bridge does NOT render. User opens a new composer in the same session → picks Mental Health → bridge does NOT render (still dismissed for the session).

### 1.6 User reloads or returns to same tab

Session is alive. Dismissal persists. Bridge does NOT render.

### 1.7 User closes tab and reopens later

Session is gone. `sessionStorage` is cleared. User picks Mental Health + prayer_request → bridge renders again.

### 1.8 User taps the link

`<Link to="/local-support/counselors">` navigates them away from the composer. The composer state is lost (per existing behavior). Eric may want to investigate whether the composer should preserve draft state across this navigation per 6.9 — see deferred items.

---

## Section 2 — Gates

- **Gate-G-CONDITION-EXACT.** The bridge fires ONLY when `postType === 'prayer_request' AND selectedCategory === 'mental-health' AND not dismissed`. Tests cover all four condition combinations (true/true/true → fire, plus three false-branches).
- **Gate-G-SESSION-DISMISSAL.** Dismissing the bridge writes to `sessionStorage`. Re-renders within the same session do NOT re-display the bridge regardless of state changes.
- **Gate-G-PERSISTENT-DISMISSAL-WITHIN-SESSION.** Dismissed → switch category → switch back to Mental Health → bridge does NOT re-render.
- **Gate-G-CROSS-SESSION-RESET.** New session (sessionStorage cleared) → bridge re-renders when conditions met.
- **Gate-G-COPY-PASSES-BRAND-VOICE.** Bridge copy passes anti-pressure brand voice review per R6.
- **Gate-G-MH-OMISSION-RESPECTED.** The bridge does NOT undermine or violate Gate-G-MH-OMISSION HARD's ethos. Specifically: the bridge does NOT add a Mental Health filter chip to any Answered Wall or Prayer Wall feed surface (that would be a separate spec, explicitly prohibited by Gate-G-MH-OMISSION).
- **Gate-G-NO-CRISIS-UI-CONFLICT.** The bridge does NOT replace or hide the existing crisis-resources banner (Watch / 6.4 / 6.11b). Both can render simultaneously per R5 default. Tests verify both render together when both conditions met.
- **Gate-G-NO-NEW-BACKEND-CALLS.** The bridge is frontend-only. No new API endpoints, no new tracking events. Verified by code-review.
- **Gate-G-LINK-TARGET-EXACT.** The bridge's link target is `/local-support/counselors` (matches the existing route at App.tsx:311). NOT a Google Maps embed, NOT an external counseling provider link.
- **Gate-G-REPLY-MODE-EXCLUSION.** If R3 default holds (bridge does NOT fire in PrayerDetail reply mode), tests verify the bridge does not render when InlineComposer is used as a comment composer.

---

## Section 3 — Tests

Stub minimum is 8. Realistic count is 10-14. Sketch:

**CounselorBridge component (4–5 tests):**
- Renders correct copy + link to `/local-support/counselors` (Gate-G-LINK-TARGET-EXACT)
- Renders dismiss button + invokes `markCounselorBridgeDismissed()` on click (Gate-G-SESSION-DISMISSAL)
- Returns null when `shouldShowCounselorBridge()` returns false (after dismissal)
- Accessibility: dismiss button has aria-label, link has descriptive text
- Visual snapshot or DOM structure check (matches quiet treatment per MPD-3)

**counselor-bridge-storage service (2–3 tests):**
- `shouldShowCounselorBridge()` returns true when sessionStorage empty
- `shouldShowCounselorBridge()` returns false after `markCounselorBridgeDismissed()`
- Graceful failure when sessionStorage throws (matches `welcome-back-storage` pattern)

**InlineComposer integration (4–5 tests):**
- Bridge renders when conditions met (postType='prayer_request' + selectedCategory='mental-health' + not dismissed) (Gate-G-CONDITION-EXACT)
- Bridge does NOT render when postType is not 'prayer_request' (e.g., 'testimony' with mental-health category)
- Bridge does NOT render when selectedCategory is not 'mental-health' (e.g., 'prayer_request' with 'health')
- Bridge does NOT render after dismissal even when category toggles back
- Bridge does NOT render in PrayerDetail reply mode (Gate-G-REPLY-MODE-EXCLUSION, if R3 default holds)

**Crisis-UI coexistence (1–2 tests):**
- When a Mental Health prayer request contains crisis keywords, BOTH the bridge AND the crisis-resources banner render (Gate-G-NO-CRISIS-UI-CONFLICT)
- The bridge's presence does not modify the crisis-resources banner's positioning or appearance

**Optional integration (1 test):**
- End-to-end: open composer, pick Mental Health, pick Prayer Request, dismiss bridge, navigate away, return, bridge still dismissed (Gate-G-PERSISTENT-DISMISSAL-WITHIN-SESSION across navigation)

Total: ~12–16 tests. Comfortably above the 8 minimum.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The bridge is a quiet offering, not an intervention. Treat it as a *companion* to prayer, not a *replacement* or *escalation*.
- Copy MUST NOT diagnose, pressure, or label. The user picked Mental Health; that's a self-identification, not a diagnosis. The bridge respects that.
- The bridge is dismissible. Once dismissed, it stays dismissed for the session. The user is in control of whether they see it.
- The bridge does NOT log analytics for "shown" or "clicked." The user's category choice + counselor-link engagement are private. (Future spec could add aggregated metrics, but 7.5 is opt-out by silence.)
- The bridge does NOT trigger notifications. No "we noticed you're struggling" follow-up.
- Per Gate-G-MH-OMISSION HARD: the bridge does NOT add a Mental Health filter chip, does NOT surface Mental Health prayers in any new feed, does NOT call out users by their Mental Health prayer status. It ONLY offers a resource link AT COMPOSE TIME, on the user's own post.
- Unauthenticated users see the bridge too — counseling info should not be auth-gated. Per MPD-7.
- The link target is the EXISTING /local-support/counselors page; no new commercial counseling integration. The page itself is part of the Worship Room platform's curated resources.

---

## Section 5 — Deferred / Out of Scope

- **Bridge for other categories (Health, Grief, Relationships).** Stub says Mental Health only. Don't expand.
- **Bridge for other post types (testimony, question, discussion, encouragement).** Stub says prayer_request only.
- **Bridge in reply mode (PrayerDetail comments).** Per R3 default, NO. Future spec could revisit.
- **Bridge in Daily Hub Pray tab's friend-surfaced prayers (Spec 7.4).** Out of scope. 7.4 is read-side; 7.5 is compose-side.
- **Cross-session dismissal (localStorage-based persistent dismissal).** Out of scope. Per AC, dismissal is session-scoped only.
- **Composer draft preservation across counselor-page navigation.** When the user taps the bridge link, the composer state is lost. Spec 6.9 introduced draft preservation; whether the bridge link should preserve a draft is a design decision deferred for now. Future spec could address.
- **Analytics/telemetry on bridge engagement.** Out of scope; treat the bridge as private per anti-pressure.
- **Localization / non-English bridge copy.** Out of scope; matches existing copy convention.
- **Counselor recommendations based on location.** The link goes to `/local-support/counselors`; that page handles location separately. 7.5 doesn't touch the page itself.
- **All other parked items.** `useNotifications` flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization, presence WARN log noise control. Still parked.

---

## Pipeline Notes

- **`/playwright-recon` (optional):** Capture the InlineComposer at desktop + mobile with `selectedCategory='mental-health'` + `postType='prayer_request'` to set the visual baseline. New visual surface; recon helps verify placement.
- **`/spec-forums`:** Produces the actual spec file at `_specs/forums/spec-7-5.md` from this brief.
- **`/plan-forums`:** Resolves R1–R7. R4 (copy + brand voice) and R5 (crisis-UI interaction) are the most load-bearing. R6 is design-decision territory and may require Eric or a brand-voice reviewer.
- **`/execute-plan-forums`:** Implements per resolved plan. Creates `CounselorBridge.tsx` + `counselor-bridge-storage.ts`. Modifies InlineComposer to render the bridge conditionally. Pre-execution uncommitted-files check.
- **`/code-review`:** Standard pass. Specifically check Gate-G-MH-OMISSION-RESPECTED (the spec does not add any Mental Health filter chip or feed surface), Gate-G-NO-CRISIS-UI-CONFLICT, Gate-G-COPY-PASSES-BRAND-VOICE.
- **`/verify-with-playwright`:** Visual verification of the bridge appearing in InlineComposer when conditions met, dismissal removing it, session-scoped persistence.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.5 stub (master plan lines 6449–6466)
- `frontend/src/components/prayer-wall/InlineComposer.tsx:243,642` — `selectedCategory` state + setter
- `frontend/src/components/prayer-wall/InlineComposer.tsx:81-137` — per-post-type copy config blocks (`prayer_request` is line 81-87)
- `frontend/src/constants/prayer-categories.ts:2,10` — canonical `'mental-health'` literal
- `frontend/src/components/daily/CrisisBanner.tsx:44-48` — **canonical pattern to mirror** (link to /local-support/counselors with subtle styling)
- `frontend/src/components/daily/__tests__/CrisisBanner.test.tsx:59` — *"Find a counselor near you"* canonical copy (plan-recon may iterate)
- `frontend/src/components/LocalSupportDropdown.tsx:6-10` — `LOCAL_SUPPORT_LINKS` constant
- `frontend/src/App.tsx:311` — `/local-support/counselors` route definition
- `frontend/src/services/welcome-back-storage.ts:36-56` — session-scoped dismissal pattern
- `frontend/src/services/surprise-storage.ts:95-110` — same pattern, different key
- `frontend/src/components/prayer-wall/AnsweredCategoryFilter.tsx:10-22` — **Gate-G-MH-OMISSION HARD rationale** (must respect)
- `frontend/src/constants/answered-wall-copy.ts:91-97` — `MH_OMISSION_RATIONALE` constant
- `_plans/forums/spec-7-1-brief.md`, `_plans/forums/spec-7-2-brief.md`, `_plans/forums/spec-7-3-brief.md`, `_plans/forums/spec-7-4-brief.md` — sibling briefs
- Universal Rule 13 — crisis-flag suppression contract (R5 relevance)
- Spec 6.6 — Mental Health omission rationale origin
- Spec 6.4 — Watch crisis-suppression UX
- Spec 6.11b — crisis-flag handling
- Spec 6.9 — composer draft preservation (deferred draft-on-navigation question)
