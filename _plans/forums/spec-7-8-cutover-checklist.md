# Phase 7 Cutover Checklist — Spec 7.8

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.8 stub (master plan lines 6533–6546). Size S, Risk Low, prerequisites 7.7. Four ACs: all 7 integrations manually verified, no regressions in adjacent features, cutover checklist completed, Universal Rule 17 axe-core a11y smoke passes on Prayer Wall routes.

**Authored:** 2026-05-17, against Phase 7 baseline after specs 7.1–7.7 ship.

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Format key (mirrors Phase 6's `2026-05-15-spec-6-12-cutover-checklist.md`):**
- `[⚠️]` = HUMAN-REQUIRED — interactive UI step, navigation, system clock change, multi-user test, dev tooling
- `[🤖]` = INFERRED — test coverage exists; reasonable to mark covered without re-running
- `[✅]` = EVIDENCE — existing code/test/comment is the proof
- `[ ]` = unchecked; mark as done with one of the above when verified

**This document doubles as a CC execution prompt.** Section 2 onward can be pasted to CC directly. Sections marked `🤖` are evidence-gathering tasks CC can perform autonomously (read tests, verify file existence, run lint/typecheck/test). Sections marked `⚠️` require Eric's manual interaction.

---

## Section 1 — Phase 7 Scope Summary

- 7 cross-feature integration specs shipped:
  - **7.1** — Bible to Prayer Wall Bridge (compose prayer with scripture pre-fill from any verse)
  - **7.2** — Prayer Wall to Bible Bridge (scripture chip on prayer card → reader scroll)
  - **7.3** — Music During Prayer Wall (AudioProvider continuity + FAB overlap verification)
  - **7.4** — Daily Hub Pray Tab Friend Surfacing (`From your friends today` widget)
  - **7.5** — Local Support Bridges on Mental Health Posts (counselor bridge)
  - **7.6** — Friends Pin to Top of Feed (`isFromFriend` chip)
  - **7.7** — Privacy Tiers (Public / Friends / Private visibility selector)
- All hero features shipped on `forums-wave-continued`. Eric handles all git operations manually.
- Each spec was authored against the live master plan + live code recon. Briefs at `_plans/forums/spec-7-N-brief.md`.

---

## Section 2 — Pre-Flight Baseline (run once at start of cutover)

These establish the baseline before manual QA. Run sequentially.

### 2.1 Git + branch state

- [ ] `[⚠️]` `git status` returns clean (no uncommitted changes other than this file and untracked `_plans/forums/spec-7-*.md` briefs / QA logs). If anything else is dirty → STOP and surface to Eric.
- [ ] `[⚠️]` `git branch --show-current` returns `forums-wave-continued`.
- [ ] `[⚠️]` `git log -10 --oneline` shows the 7 Phase 7 commits in expected order (7.1 → 7.7) plus any cleanup / fix commits Eric did between specs.

### 2.2 Backend test baseline

- [ ] `[⚠️]` `cd backend && ./mvnw test` runs full suite. Expected: ~1894 + (Phase 7 additions ~40-60) = approximately **1934–1954 tests passing / 0 fail / 22 skipped**. Report exact counts.
- [ ] `[🤖]` If any test that previously passed now fails → STOP and surface to Eric. Do not fix; surface only.

### 2.3 Frontend test baseline

- [ ] `[⚠️]` `cd frontend && pnpm test --run` runs full suite. Expected: ~10,622 + (Phase 7 additions ~80-120) = approximately **10,700–10,750 tests passing / 0 persistent fail / 10 skipped**. The known `useNotifications` mock-data flake (~33% intermittent) and PrayCeremony load-induced timeout flake remain documented at spec-tracker.md line 174–175. Neither counts as a persistent fail.
- [ ] `[🤖]` Report exact counts. If a NEW persistent fail appeared → STOP and surface.

### 2.4 Lint + typecheck

- [ ] `[🤖]` `cd frontend && pnpm lint` exits 0 (`--max-warnings 0` enforced).
- [ ] `[🤖]` `cd frontend && pnpm exec tsc --noEmit` exits 0.
- [ ] `[🤖]` `cd backend && ./mvnw compile -DskipTests` exits 0.

### 2.5 CI workflow check

- [ ] `[🤖]` Verify `.github/workflows/ci.yml` is unchanged from the pre-Phase-7 cleanup spec. If Phase 7 specs touched it, surface.

### 2.6 Bundle size sanity

- [ ] `[🤖]` `cd frontend && pnpm build` succeeds. Note final bundle size (in MB) — Phase 7 added components (`FromFriendChip`, `CounselorBridge`, `VisibilitySelector`, `FriendPrayersToday`) so a small increase is expected. Anything over 30 MB warrants a closer look.

### 2.7 Dev environment

- [ ] `[⚠️]` `docker compose ps` shows Redis (port 6380) + Postgres healthy.
- [ ] `[⚠️]` `lsof -ti :8080` returns a PID. Backend is running. If not, `cd backend && ./mvnw spring-boot:run` and wait for "Started WorshipRoomApplication".
- [ ] `[⚠️]` `curl -s http://localhost:8080/api/v1/prayer-wall/presence | head -c 200` returns 200 with `{ "data": { "count": ... } }` (presence-fix from earlier session is in place).
- [ ] `[⚠️]` Frontend dev server: `cd frontend && pnpm dev` running on port 5173 (or whichever port is configured).

---

## Section 3 — Spec 7.1 Verification (Bible to Prayer Wall Bridge)

Walk through on a dev environment with valid auth (logged in as a user with at least 1 active friend for cross-spec coverage).

### 3.1 Bible-side action surface

- [ ] `[⚠️]` Navigate to `/bible/john/14` (or any chapter). Verify the page renders normally.
- [ ] `[⚠️]` Long-press or tap a verse to open `<VerseActionSheet>`. (⚠️ HUMAN-REQUIRED: interaction step.)
- [ ] `[⚠️]` Verify the `prayWithPassage` action is present in the sheet alongside the existing 14 actions.
- [ ] `[⚠️]` Verify the existing `pray` action (label: "Pray about this" / sublabel: "Open in Daily Hub · Pray") is STILL present and UNCHANGED (Gate-G-EXISTING-PRAY-UNCHANGED from 7.1 brief).
- [ ] `[🤖]` Verify naming differentiation: `prayWithPassage` should have label "Pray with this passage" (or whatever copy plan-recon picked). Cite the label from `verseActionRegistry.ts`.

### 3.2 Post-type chooser submenu

- [ ] `[⚠️]` Tap `prayWithPassage`. Verify a submenu appears with 5 post-type options: Prayer request / Testimony / Question / Discussion / Encouragement.
- [ ] `[⚠️]` Tap "Discussion" option. Verify navigation to `/prayer-wall?compose=discussion&scripture=<encoded-reference>` (or whichever URL contract was picked — verify it matches R5's resolution in the plan).

### 3.3 Composer pre-fill

- [ ] `[⚠️]` On `/prayer-wall`, verify the InlineComposer auto-opens with `postType='discussion'` and the scripture reference pre-filled (e.g., "John 14:1").
- [ ] `[⚠️]` Verify the `<ScriptureReferenceInput>` is in the `'valid'` state on mount (chapter+verse resolved).
- [ ] `[⚠️]` Verify the URL is cleared (`?compose=` and `?scripture=` removed from `location.search`) immediately after composer opens (Gate-G-URL-CLEARED-ON-OPEN).
- [ ] `[⚠️]` Repeat for each of the other 4 post types. Verify the composer opens for each. Verify the scripture field is also activated for the type (Gate-G-FIVE-TYPES-IDENTICAL-FIELD from 7.1 brief, confirmed shipped in 7.1's parameterized 5-types test).

### 3.4 Submit + round-trip

- [ ] `[⚠️]` Submit one prayer with scripture pre-filled. Verify post appears in feed.
- [ ] `[⚠️]` Tap the resulting `<PrayerCard>`'s scripture chip. Verify navigation back to `/bible/john/14?verse=1&scroll-to=1` (or matching the chip URL contract from 7.2 brief).
- [ ] `[⚠️]` Verify the Bible reader scrolls to the verse on arrival (7.2's `?scroll-to=` enhancement).

### 3.5 Draft-wins behavior

- [ ] `[⚠️]` On `/prayer-wall`, manually open the composer (without arriving via scripture link). Type some text. Close the composer (the draft is now saved per 6.9).
- [ ] `[⚠️]` Navigate to `/bible/john/14`, use `prayWithPassage` to compose Discussion with scripture pre-fill.
- [ ] `[⚠️]` Verify the `<RestoreDraftPrompt>` appears. Verify if user picks "Restore draft," the scripture pre-fill is DISCARDED (Gate-G-DRAFT-WINS).
- [ ] `[⚠️]` If user picks "Start fresh," the scripture pre-fill applies.

### 3.6 Crisis-flag + Watch interaction

- [ ] `[🤖]` Per Gate-G-NO-PRAYER-SCRIPTURE-CRISIS-FALSE-POSITIVE: the `PostCrisisDetector` ignores `scripture_text`. Verified by test (cite: `PostServiceTest.java` or similar).
- [ ] `[⚠️]` Enable Watch via Settings. Navigate to `/bible/john/14`, use `prayWithPassage` for Discussion. Verify the Watch composer placeholder applies WHILE pre-fill remains (Gate-G-WATCH-RESPECTED).

---

## Section 4 — Spec 7.2 Verification (Prayer Wall to Bible Bridge)

### 4.1 Chip URL format

- [ ] `[⚠️]` On `/prayer-wall`, find a PrayerCard with scripture (likely from 3.4 above). Inspect the chip's link `href` via DevTools.
- [ ] `[🤖]` Verify `href` includes BOTH `?verse=<n>` AND `&scroll-to=<n>` (Gate-G-SCROLL-TO-PRESENT + Gate-G-VERSE-AND-SCROLL-TO-MATCH from 7.2 brief).

### 4.2 4-route coverage

- [ ] `[⚠️]` `/prayer-wall` — chip surfaces with correct URL ✅ (verified 4.1)
- [ ] `[⚠️]` `/prayer-wall/:id` — navigate to a specific prayer with scripture. Chip surfaces with correct URL.
- [ ] `[⚠️]` `/prayer-wall/dashboard` — chip surfaces on dashboard mosaic cards.
- [ ] `[⚠️]` `/prayer-wall/user/:id` — chip surfaces on a user's profile feed (if any of their posts have scripture).

### 4.3 5-post-type coverage

- [ ] `[🤖]` 7.1 added a parameterized 5-types test at `PrayerCard.test.tsx:822-852` that 7.2's execution updated to assert the new URL format. Verify the test passes and the URL includes both params for all 5 types.

### 4.4 Chip click navigates correctly

- [ ] `[⚠️]` Click the chip on at least one PrayerCard. Verify `BibleReader.tsx` opens at the correct chapter AND auto-scrolls to the linked verse (Gate-G-SCROLL-TO-PRESENT downstream).
- [ ] `[⚠️]` Verify the arrival glow (one-shot scroll indicator from BB-38) fires.

### 4.5 Chapter-only fallback

- [ ] `[⚠️]` Find or create a prayer with `scriptureReference = "Romans 8"` (chapter-only, no verse). Verify the chip renders as unlinked `<span>` per Gate-G-CHAPTER-ONLY-UNLINKED from 7.2 brief.

### 4.6 Crisis-flagged chip preservation

- [ ] `[🤖]` Per Gate-G-CRISIS-CARD-CHIP-VISIBLE (7.2 brief): crisis-flagged cards retain the chip. Verified by test.

---

## Section 5 — Spec 7.3 Verification (Music During Prayer Wall)

### 5.1 Manual QA from spec-7-3-qa-log.md

- [ ] `[⚠️]` Open `_plans/forums/spec-7-3-qa-log.md`. Verify all 6 QA cases are marked PASS (or document any FAIL with screenshot).
- [ ] `[⚠️]` Specifically re-verify QA-5 (FAB overlap check at 3 viewport sizes: desktop 1366px, tablet 768px, mobile 375px). Visual inspection.
- [ ] `[⚠️]` Re-verify QA-1: start a worship playlist on `/music`, navigate to `/prayer-wall`. Playback continues uninterrupted. AudioPill visible on Prayer Wall.

### 5.2 If CSS fix shipped

- [ ] `[🤖]` IF 7.3's execution shipped a CSS fix keyed on `html[data-prayer-wall]`: verify the `night-mode-resolver-parity.test.ts` still passes unchanged (Gate-G-DATA-PRAYER-WALL-NO-REGRESSION from 7.3 brief).
- [ ] `[🤖]` Verify no diffs landed in `AudioProvider.tsx`, `audioReducer.ts`, or `AudioEngineService` (Gate-G-NO-NEW-AUDIO-CODE).

---

## Section 6 — Spec 7.4 Verification (Daily Hub Pray Tab Friend Surfacing)

### 6.1 Empty-friends state

- [ ] `[⚠️]` Log in as a user with NO friends. Navigate to `/daily?tab=pray`. Verify `<FriendPrayersToday />` shows the "When you have friends, their prayers will show up here so you can lift them up." copy (or whatever R6 picked).

### 6.2 Friends-with-posts state

- [ ] `[⚠️]` Log in as a user with at least 1 active friend. Have a friend post a Prayer Request in the last 24h (or seed via dev tooling).
- [ ] `[⚠️]` Navigate to `/daily?tab=pray`. Verify `<FriendPrayersToday />` shows the friend's post as a card.
- [ ] `[⚠️]` Verify maximum 3 cards (Gate-G-MAX-THREE-POSTS).

### 6.3 Quick Lift inline

- [ ] `[⚠️]` Tap the Quick Lift button on a friend prayer card. Verify the existing `useQuickLift` flow fires (the Quick Lift overlay opens).
- [ ] `[⚠️]` Complete the Quick Lift session.
- [ ] `[⚠️]` Refresh `/daily?tab=pray`. Verify the post NO LONGER appears in `<FriendPrayersToday />` (Gate-G-NOT-PRAYED-EXCLUSION).

### 6.4 24-hour window

- [ ] `[🤖]` 7.4's tests verify this. Re-run `cd backend && ./mvnw test -Dtest=FriendPrayersServiceTest` — should pass.

### 6.5 Anonymous-author respect

- [ ] `[⚠️]` Have a friend post anonymously. Verify the card displays "Someone" not the friend's name (Gate-G-ANONYMOUS-AUTHORS-RESPECTED).

### 6.6 Unauthenticated user

- [ ] `[⚠️]` Log out. Navigate to `/daily?tab=pray`. Verify `<FriendPrayersToday />` does NOT mount (Gate-G-UNAUTHENTICATED-NO-RENDER). The rest of the Pray tab renders normally.

---

## Section 7 — Spec 7.5 Verification (Local Support Bridges on Mental Health Posts)

### 7.1 Bridge conditional render

- [ ] `[⚠️]` Open InlineComposer on `/prayer-wall`. Select postType=Prayer Request. Verify the bridge does NOT appear yet.
- [ ] `[⚠️]` Pick the Mental Health category pill. Verify `<CounselorBridge />` renders below the textarea with copy "Counselors near you" (or R4-resolved copy) and link to `/local-support/counselors`.

### 7.2 Bridge condition exactness

- [ ] `[⚠️]` Switch postType to Testimony. Verify bridge HIDES.
- [ ] `[⚠️]` Switch back to Prayer Request. Verify bridge RE-APPEARS.
- [ ] `[⚠️]` Switch category to Health. Verify bridge HIDES.
- [ ] `[⚠️]` Switch back to Mental Health. Verify bridge RE-APPEARS.

### 7.3 Dismissal

- [ ] `[⚠️]` Tap the dismiss button on the bridge. Verify the bridge HIDES.
- [ ] `[⚠️]` Switch category to Family then back to Mental Health. Verify bridge DOES NOT re-render in this session (Gate-G-PERSISTENT-DISMISSAL-WITHIN-SESSION).
- [ ] `[⚠️]` Close the composer, re-open it. Verify bridge still HIDDEN (dismissal persists across composer mounts in same session).
- [ ] `[⚠️]` Reload the page (Cmd+R / F5). Verify bridge still HIDDEN (sessionStorage persists across reloads).

### 7.4 New session reset

- [ ] `[⚠️]` Close the entire browser tab. Open a new tab to `/prayer-wall`. Open composer, select Mental Health + Prayer Request. Verify bridge RE-APPEARS (Gate-G-CROSS-SESSION-RESET).

### 7.5 Counselors page link

- [ ] `[⚠️]` Tap the bridge's link. Verify navigation to `/local-support/counselors` (Gate-G-LINK-TARGET-EXACT). Page renders.

### 7.6 Crisis-UI coexistence

- [ ] `[⚠️]` Compose a Mental Health prayer with crisis keywords in the body (e.g., the existing crisis-detection set). Verify BOTH the bridge AND the crisis-resources banner render (Gate-G-NO-CRISIS-UI-CONFLICT from 7.5 brief).

### 7.7 Reply-mode exclusion

- [ ] `[🤖]` Verify (per Gate-G-REPLY-MODE-EXCLUSION from 7.5 brief) that the bridge does NOT appear in PrayerDetail comment composer. Verified by test if 7.5 execution shipped the test.

### 7.8 Gate-G-MH-OMISSION respected

- [ ] `[⚠️]` Navigate to `/prayer-wall/answered`. Verify NO Mental Health filter chip in the AnsweredCategoryFilter. The 7.5 bridge did NOT introduce one (Gate-G-MH-OMISSION-RESPECTED from 7.5 brief).

---

## Section 8 — Spec 7.6 Verification (Friends Pin to Top of Feed)

### 8.1 Friend-pin display

- [ ] `[⚠️]` Log in as a user with at least 1 active friend. Have a friend post a public Prayer Request in last 24h.
- [ ] `[⚠️]` Navigate to `/prayer-wall`. Verify the friend's post appears AT THE TOP of the feed (position 0, before the chronological remainder).
- [ ] `[⚠️]` Verify the post has the "From a friend" chip rendered.
- [ ] `[⚠️]` Verify maximum 3 friend posts pin (Gate-G-MAX-THREE-PINS).

### 8.2 No duplication

- [ ] `[⚠️]` Scroll through the rest of the feed (chronological remainder). Verify the friend's post does NOT appear again (Gate-G-NO-DUPLICATION).
- [ ] `[⚠️]` Scroll to page 2 (or click "Load more"). Verify friend post does NOT appear on page 2 (Gate-G-PAGE-1-ONLY-PINNING).

### 8.3 Empty-friends state

- [ ] `[⚠️]` Log in as a user with NO friends. Navigate to `/prayer-wall`. Verify NO pins at top (Gate-G-EMPTY-FRIENDS-NO-PINS) — feed is purely chronological.

### 8.4 Unauthenticated state

- [ ] `[⚠️]` Log out. Navigate to `/prayer-wall`. Verify NO pins, no errors, no `isFromFriend` chip anywhere (Gate-G-UNAUTHENTICATED-NO-PINS).

### 8.5 No self-pinning

- [ ] `[⚠️]` Log in. Compose a post of your own. Refresh feed. Verify your OWN post is NOT pinned at top (Gate-G-NO-SELF-PINNING). It appears at chronological position only.

### 8.6 Visibility respected

- [ ] `[⚠️]` Have a friend post a private post (if 7.7 is shipped). Verify it does NOT appear in your pinned section. Verify it does NOT appear in chronological either (Gate-G-VISIBILITY-RESPECTED).
- [ ] `[⚠️]` Have a friend post a friends-tier post. Verify it DOES appear pinned (you are their friend).

### 8.7 Quick Lift coexistence

- [ ] `[⚠️]` Quick Lift a pinned friend's post. Refresh feed. Verify the post IS STILL pinned (Gate-G-NO-QUICK-LIFT-EXCLUSION from 7.6 brief; distinct from 7.4's exclusion behavior).

### 8.8 Anonymous friend post

- [ ] `[⚠️]` Have a friend post anonymously. Verify their post pins with "From a friend" chip AND the author shows "Someone" (Gate-G-ANONYMOUS-CHIP-RESPECTED).

---

## Section 9 — Spec 7.7 Verification (Privacy Tiers)

### 9.1 Visibility selector renders

- [ ] `[⚠️]` Open InlineComposer on `/prayer-wall`. Verify the visibility selector chip row renders below the category pills with 3 options: Public / Friends / Private (Gate-G-SELECTOR-RENDERS).
- [ ] `[⚠️]` Verify Public is selected by default (Gate-G-DEFAULT-PUBLIC).

### 9.2 Tooltips

- [ ] `[⚠️]` Hover each chip. Verify the tooltips show R6-resolved copy (likely: "Anyone on Worship Room can see this prayer." / "Only people you've added as friends will see this prayer." / "Only you can see this prayer. Useful for journaling-style prayers.").

### 9.3 Private tier persistence + enforcement

- [ ] `[⚠️]` Pick Private. Submit a Prayer Request. Verify the post is created.
- [ ] `[🤖]` Verify in DB or via API: `posts.visibility = 'private'` for the new post.
- [ ] `[⚠️]` Refresh `/prayer-wall`. Verify your private post appears in YOUR feed (Gate-G-AUTHOR-ALWAYS-VISIBLE).
- [ ] `[⚠️]` Log out (or switch to another user). Verify the private post does NOT appear anywhere (Gate-G-PRIVATE-NEVER-LEAKED).

### 9.4 Friends tier persistence + enforcement

- [ ] `[⚠️]` Log back in as original user. Pick Friends. Submit another Prayer Request.
- [ ] `[🤖]` Verify in DB: `posts.visibility = 'friends'`.
- [ ] `[⚠️]` Log in as a friend of the original user. Navigate to `/prayer-wall`. Verify the Friends post IS visible (with "From a friend" chip from 7.6).
- [ ] `[⚠️]` Log in as a non-friend user. Verify the Friends post is NOT visible anywhere (Gate-G-NO-LEAKAGE).

### 9.5 Default fall-through

- [ ] `[⚠️]` Open composer, DO NOT change visibility (leave Public selected — the default). Submit.
- [ ] `[🤖]` Verify `posts.visibility = 'public'` (Gate-G-DEFAULT-PUBLIC-PERSISTENCE).

### 9.6 Friend direction (load-bearing privacy correctness)

- [ ] `[🤖]` Verify `PostSpecifications.visibleTo` friend subquery direction is `fr.user_id = post.user_id AND fr.friend_user_id = :viewer_id` per the canonical SQL at master plan line 6510-6513 (Gate-G-FRIEND-DIRECTION).
- [ ] `[🤖]` Verify the test `PostSpecificationsTest` covers the reversal case (asserts that reversal does NOT match) — `PostSpecifications.java:54` references this test.

### 9.7 Endpoint enforcement audit

- [ ] `[🤖]` Plan-recon (R4 from 7.7 brief) enumerated every read endpoint and verified `visibleTo` composition. Verify the tracker entry (or a `_plans/forums/spec-7-7-endpoint-audit.md` log file from execute output) is in place. If missing → STOP and surface.
- [ ] `[🤖]` For each enumerated endpoint, verify a test exists asserting visibility-predicate composition (Gate-G-ENFORCEMENT-EVERY-ENDPOINT).

### 9.8 PostResponse + PrayerCard visibility icon

- [ ] `[⚠️]` Navigate to `/prayer-wall`. Verify a Friends post displays the users-icon next to timestamp. Verify a Private post (your own) displays the lock-icon. Verify Public posts display either no icon or a subtle globe-icon (per MPD-10 / R7).

### 9.9 End-to-end Playwright

- [ ] `[🤖]` Verify the Playwright test added by 7.7 passes. `cd frontend && pnpm exec playwright test --grep 'visibility-tier'` (or whatever pattern 7.7's test was tagged with).

### 9.10 No edit-visibility-tier UI

- [ ] `[⚠️]` Tap a post you authored. Verify there is NO UI affordance to change its visibility tier post-creation (Gate-G-DOES-NOT-AFFECT-EDIT from 7.7 brief). Out-of-scope; deferred.

---

## Section 10 — Regression Spot-checks (Adjacent Features)

These are NOT Phase 7 features but are touched by Phase 7's surface changes. Verify no regression.

### 10.1 Existing Phase 6 features

- [ ] `[⚠️]` Quick Lift on a non-friend's PrayerCard from `/prayer-wall`. Should work identically to pre-7.4 behavior (Spec 6.2 origin).
- [ ] `[⚠️]` Compose a Prayer Request with category=Health, post type=prayer_request. Verify no CounselorBridge appears (7.5 only fires on Mental Health).
- [ ] `[⚠️]` Navigate to `/prayer-wall/answered`. Verify the Answered Wall feed renders normally. Verify Gate-G-MH-OMISSION HARD is intact (no Mental Health filter chip in AnsweredCategoryFilter).
- [ ] `[⚠️]` Intercessor flow on a Prayer Request (Spec 6.5). Verify it still works post-7.x.
- [ ] `[⚠️]` Night Mode toggle in Settings. Verify the `data-prayer-wall` attribute on `<html>` still sets correctly (per 6.3 origin). 7.3 may have added a CSS rule consuming this attribute but should NOT have changed its setter.

### 10.2 Existing Phase 4 features

- [ ] `[⚠️]` Compose a Discussion post with scripture reference (Spec 4.5 origin). Verify the scripture field still renders + persists + scripture chip appears on the resulting card.
- [ ] `[⚠️]` Anonymous toggle on a Prayer Request (Spec 4.6 origin). Verify the toggle still works + the resulting card shows "Someone" instead of author name.

### 10.3 Audio + Bible reader

- [ ] `[⚠️]` Start a playlist on `/music`. Navigate to `/bible/john/14`. Verify playback continues. Verify AudioPill remains visible.
- [ ] `[⚠️]` Click a verse-action menu item like `note` or `bookmark`. Verify these still work (not just `prayWithPassage` from 7.1).

### 10.4 Composer drafts (6.9)

- [ ] `[⚠️]` Open composer, type some text, close. Re-open composer; verify `<RestoreDraftPrompt>` appears. Verify drafts still persist correctly.

### 10.5 Crisis-resources / Watch (6.4 + 6.11b)

- [ ] `[⚠️]` Compose a prayer with crisis keywords. Verify the crisis-resources banner appears. Verify the Watch UX (if enabled) still applies.
- [ ] `[⚠️]` Verify PostCrisisDetector behavior is unchanged — it scans `content` only, NOT `scripture_text` (per Gate-G-NO-PRAYER-SCRIPTURE-CRISIS-FALSE-POSITIVE from 7.1 brief).

### 10.6 PresenceIndicator (6.11b + presence-fix)

- [ ] `[⚠️]` Verify PresenceIndicator renders on `/prayer-wall` with the actual count (post-fix from earlier session). Open multiple browser tabs to bump the count. Verify N=1 doesn't render (hidden-at-N=0 rule), N>=2 does.

### 10.7 Mute / block (Spec 6.6b context)

- [ ] `[⚠️]` Verify muted users' posts are still filtered from the feed even when those users are friends (mute > friend, the mute filter is the discovery layer).
- [ ] `[🤖]` Verify no regression in `PostSpecifications.muteFilter` integration with the visibility predicate.

---

## Section 11 — Universal Rule 17 — Per-Phase A11y Smoke Test

Per AC: axe-core automated scan on Prayer Wall routes + Daily Hub Pray tab.

### 11.1 axe-core smoke targets

The Phase 7 routes that materially changed:
- `/prayer-wall` (feed view — pin behavior, visibility icons, composer with new visibility selector)
- `/prayer-wall/:id` (PrayerDetail — scripture chip linking)
- `/prayer-wall/dashboard`
- `/prayer-wall/user/:id`
- `/daily?tab=pray` (FriendPrayersToday widget)
- `/bible/:bookSlug/:chapter` (verse action sheet with new prayWithPassage entry)

### 11.2 Run axe-core

- [ ] `[⚠️]` From the frontend dev server, navigate to each route above.
- [ ] `[⚠️]` Use the axe DevTools browser extension (or `pnpm exec axe-core-cli http://localhost:5173/<path>` if Eric's preferred tooling). Run scan on each route.
- [ ] `[⚠️]` Expected outcome: ZERO new critical or serious violations introduced by Phase 7 specs. Pre-existing violations (if any) should be unchanged.
- [ ] `[⚠️]` If any new critical/serious violation surfaces on a Phase 7-touched component → surface to Eric. Likely fix is localized to the new component (CounselorBridge, VisibilitySelector, FriendPrayersToday, FromFriendChip).

### 11.3 Manual a11y spot-checks

- [ ] `[⚠️]` Tab through the new visibility selector. Verify focus order is logical, focus rings are visible, ARIA radiogroup semantics are correct (one selected at a time, arrow-key navigation).
- [ ] `[⚠️]` Tab through the new prayWithPassage submenu in `<VerseActionSheet>`. Verify focus trap is intact (Gate-G-A11Y from 7.1 brief).
- [ ] `[⚠️]` Screen-reader spot check on a friend prayer card (Dashboard or PrayerWall): verify "From a friend" chip is announced. Verify "Someone" is announced for anonymous-author rows. Verify visibility-icon (lock/users) is announced with a meaningful label.

---

## Section 12 — Final Sign-off

### 12.1 Documentation

- [ ] `[⚠️]` Update `CLAUDE.md`'s "Build Health" section with the new test baseline (frontend ~10,700+, backend ~1934+).
- [ ] `[⚠️]` Update `_forums_master_plan/spec-tracker.md` lines 93-100 (7.1-7.8 rows) — mark each spec as `✅` or `⬜` per its actual cutover verification outcome.

### 12.2 Deferred items registry

Confirm these items are still parked (don't accidentally pick up during cutover):

- [ ] `[✅]` 6.6b-deferred-1 (CommentInput placeholder)
- [ ] `[✅]` 6.6b-deferred-3 (anonymous-author affordances)
- [ ] `[✅]` 6.6b-deferred-4 (cross-route Celebrate + Praising)
- [ ] `[✅]` `useNotifications` mock-data flake (S3 from pre-Phase-7 audit)
- [ ] `[✅]` Bible data layer consolidation (S1 from pre-Phase-7 audit)
- [ ] `[✅]` Framework majors (React 19, Vite 8, Tailwind 4, TS 6)
- [ ] `[✅]` Phase 3 `X-RateLimit-*` standardization (tracker line 180)
- [ ] `[✅]` Presence WARN log noise control
- [ ] `[✅]` Composer draft preservation on counselor-page navigation (7.5 deferred)
- [ ] `[✅]` 7.4's friend-pin ranking (Open Questions Log item 3, master plan line 8199)
- [ ] `[✅]` Visibility tier change on edit (7.7 MPD-8, deferred)

### 12.3 If anything failed

If any `[⚠️]` step above fails:
- (a) STOP. Do not commit cutover.
- (b) Surface to Eric with the specific failing item.
- (c) Eric decides: fix in place, file a follow-up spec, or accept-and-document.

### 12.4 If everything passes

- [ ] `[⚠️]` Phase 7 is complete. The Forums Wave Cross-Feature Integration phase is closed.
- [ ] `[⚠️]` Eric commits the tracker + CLAUDE.md updates manually with a message like:
  ```
  spec-7-8-cutover: Phase 7 (Cross-Feature Integration) closed.
  
  7 cross-feature specs shipped (7.1–7.7). Cutover checklist complete.
  All manual QA cases verified. Universal Rule 17 a11y smoke passed.
  No regressions in adjacent features.
  
  Phase 7 baseline:
  - Backend: ~1934+ tests passing (count per actual)
  - Frontend: ~10,700+ tests passing (count per actual)
  - Lint + typecheck: clean
  
  Phase 8 (Unified Profile System) ready to begin.
  ```
- [ ] `[⚠️]` Tag the commit if you tag waves (optional).

---

## How to Use This Document

### As a sequential checklist
Walk Section 2 (Pre-Flight) end-to-end first. Then Sections 3-9 (per-spec verifications) in any order. Then Section 10 (regressions). Then Section 11 (a11y). Then Section 12 (sign-off). Mark each item as you go.

### As a CC handover prompt
Sections 2.2-2.6 (baseline tests + lint + typecheck + build), Section 4.3 (5-post-type coverage test), Section 5.2 (no audio code regressions), Section 6.4 (24h window backend test), Section 9.6 (PostSpecifications direction), Section 9.7 (endpoint audit verification), Section 9.9 (Playwright), and Section 11.2 (axe-core) are all `[🤖]` or scriptable. Eric can paste these specific sections to CC and ask for "report status of each item; do not modify code; surface failures."

### What this is NOT
- This is NOT a brief that goes through `/spec-forums`. The cutover is the manual + automated verification itself; no code-execution pipeline applies.
- This is NOT a new feature spec. No new code lands in 7.8.
- This is NOT optional. Universal Rule 17 a11y smoke is REQUIRED per the master plan AC.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.8 stub (lines 6533–6546)
- `_plans/forums/2026-05-15-spec-6-12-cutover-checklist.md` — Phase 6's cutover (pattern this document mirrors)
- `_plans/forums/spec-5-5-phase5-cutover.md` — Phase 5's cutover (similar pattern)
- `_plans/forums/spec-7-1-brief.md` through `_plans/forums/spec-7-7-brief.md` — sibling Phase 7 briefs (cutover verifies each)
- `_plans/forums/spec-7-3-qa-log.md` — 7.3's manual QA log (subsumed by Section 5)
- Universal Rule 17 — per-phase a11y smoke contract
- `_forums_master_plan/spec-tracker.md:93-100` — Phase 7 spec rows to update at sign-off
- `CLAUDE.md` "Build Health" section — to update at sign-off

---

**End of Phase 7 Cutover Checklist.**
