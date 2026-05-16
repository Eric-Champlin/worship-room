# Forums Wave: Spec 7.4 — Daily Hub Pray Tab Friend Surfacing

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 7.4 (lines 6420–6447, tracker row 96)
**Spec ID:** `round3-phase07-spec04-daily-hub-friend-prayers`
**Phase:** 7 (Cross-Feature Integration) — fourth spec, follows 7.1 ✅ + 7.2 ✅ + 7.3 ✅
**Branch:** `forums-wave-continued` (no branch switch — Phase 6 / 7.1 / 7.2 / 7.3 discipline)
**Date:** 2026-05-16
**Size:** M
**Risk:** Medium
**Prerequisites:** Spec 7.3 (✅ shipped per tracker row 95)
**Tier:** Standard

**Brief Source:** `_plans/forums/spec-7-4-brief.md`, authored 2026-05-16 against the live master plan stub + live code recon.

**Goal:** The Daily Hub Pray tab gets a small section: "From your friends today" showing up to 3 recent posts from friends the user has not yet prayed for. One-tap Quick Lift on each. Encourages gentle daily intercession without leaving the Daily Hub.

**Risk rationale:** The spec touches three surfaces (backend endpoint + service, frontend component, Daily Hub Pray tab integration) and introduces a new cross-feature data-fetch path (friends ↔ posts). Bounded because the `friend_relationships` table + entity + repository all shipped in Phase 2.5.x (changeset `2026-04-27-009-create-friend-relationships-table.xml`), Quick Lift is already shipped from Spec 6.2 with hook + endpoints (changeset `2026-05-12-004-create-quick-lift-sessions-table.xml`), and `PostSpecifications.visibleTo()` is ACTIVE in `PostService` (verified at `PostService.java:148, 170, 189` — see Spec-Time Recon Addendum below). The new piece is the join between `friend_relationships` + `posts` + `quick_lift_sessions` to find "posts by friends the user has not Quick Lifted yet."

---

## Spec-Time Recon Addendum (2026-05-16)

Two findings from spec-time recon narrow the plan-recon gating questions:

**1. R2 narrows to "already active — compose with visibleTo()".** `PostSpecifications.visibleTo(viewerId)` is fully implemented at `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:55-95` AND is actively composed into `PostService.listFeed()` (line 148), `getById()` (line 170), and `listAuthorPosts()` (line 189). The 7.4 endpoint can compose with the existing predicate via `Specification.where(PostSpecifications.visibleTo(viewerId)).and(<friend-and-time-and-not-prayed predicates>)` — no need to inline visibility-tier logic. This collapses R2's complexity meaningfully; plan-recon only needs to confirm the composition direction (mute filter is composed at feed + author-posts sites per `PostSpecifications.notMutedBy` docstring — plan-recon decides if 7.4 should also apply `notMutedBy`).

**2. "Quick Lifted" maps to `quick_lift_sessions.completed_at IS NOT NULL`.** Changeset `2026-05-12-004` defines `(id, user_id, post_id, started_at, completed_at, cancelled_at)`. A completed session has `completed_at` set; an abandoned session has only `started_at`. The 7.4 endpoint excludes posts the viewer has a `completed_at IS NOT NULL` row for (NOT just started — partial Quick Lifts shouldn't count as "prayed for"). This matches MPD-1's intent.

**No other recon overrides.** All other brief claims verified:
- `PrayTabContent.tsx` is the component (brief is correct; `DailyHubPray.tsx` does not exist).
- `friend_relationships` table + entity + repository all shipped.
- `useQuickLift` hook exists with `start(postId)` + state machine.
- `Post.isAnonymous` field exists on the entity (`Post.java:34-35`) — Gate-G-ANONYMOUS-AUTHORS-RESPECTED is achievable.

---

## Affected Frontend Routes

- `/daily?tab=pray` (Daily Hub Pray tab — `PrayTabContent.tsx` is the component, NOT `DailyHubPray.tsx` as the stub suggested)

Other tabs (`devotional`, `journal`, `meditate`) are NOT in scope.

---

## Affected Backend Surfaces

- `GET /api/v1/users/me/friend-prayers-today` (NEW endpoint per stub)
- `PostController.java` (add endpoint) OR a new `UserPostsController.java` (plan-recon decides — see R5)
- `FriendPrayersService.java` (NEW)
- `FriendRelationshipRepository.java` (existing, may need a new method for friend-id lookup)
- `PostRepository.java` (existing, may need a new method for "posts by user IDs, last 24h, excluding posts the viewer has Quick Lifted")
- `QuickLiftSessionRepository.java` (existing, may need a method for "post IDs the viewer has completed Quick Lifts for")

---

## STAY ON BRANCH

Same as Phase 6, 7.1, 7.2, 7.3 — stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command at any phase (spec, plan, execute, review). Eric handles git manually. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`, `git blame`) is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

| Item | Status | Evidence |
|---|---|---|
| Daily Hub Pray tab lives in `PrayTabContent.tsx`, NOT `DailyHubPray.tsx` | ⚠️ | `frontend/src/components/daily/PrayTabContent.tsx` exists; `DailyHubPray.tsx` does NOT (file search returns zero matches). Stub hedged ("or wherever the Pray tab lives") — recon confirms PrayTabContent is the file. |
| `friend_relationships` table is shipped and active (since 2026-04-27, Phase 2.5.x) | ✅ | `backend/src/main/resources/db/changelog/2026-04-27-009-create-friend-relationships-table.xml` — columns (user_id, friend_user_id), PK on (user_id, friend_user_id), CHECK constraint status IN ('active', 'blocked'), CHECK constraint user_id != friend_user_id. Mutual friendships stored as TWO rows per the file's header comment lines 6-9 |
| `FriendRelationship` entity + `FriendRelationshipRepository` exist | ✅ | `backend/src/main/java/com/worshiproom/friends/FriendRelationship.java:13-17` (`@Entity`, `@IdClass(FriendRelationshipId.class)`, table `friend_relationships`). `FriendRelationshipRepository.java:115-119` shows existing JOIN pattern with users + faith_points (used for leaderboard weekly_points) |
| Quick Lift is fully shipped (Spec 6.2) with hook + backend endpoints | ✅ | `frontend/src/hooks/useQuickLift.ts:48-75` — state machine `'starting' \| 'completing' \| ...`, POSTs to `/api/v1/quick-lift/start` (line 55) and `/api/v1/quick-lift/{sessionId}/complete` (line 74). Backend endpoints exist per these calls. The hook accepts a `postId` and orchestrates the session lifecycle |
| `quick_lift_sessions` schema confirmed | ✅ | Changeset `2026-05-12-004-create-quick-lift-sessions-table.xml` — columns `(id, user_id, post_id, started_at, completed_at, cancelled_at)`, CHECK `NOT (completed_at IS NOT NULL AND cancelled_at IS NOT NULL)`, partial indexes on active-session lookup and cleanup. "Prayed for" = `completed_at IS NOT NULL` (per Recon Addendum item 2 above). |
| `PostSpecifications.java` visibility predicate is ACTIVE in PostService | ✅ | `PostSpecifications.visibleTo(viewerId)` at `PostSpecifications.java:55-95`. Composed into PostService at lines 148 (`listFeed`), 170 (`getById`), 189 (`listAuthorPosts`). **R2 resolves toward "compose with existing predicate".** See Recon Addendum item 1 above. |
| The stub's "From your friends today" copy and "up to 3 recent posts from friends the user has not prayed for" goal | ✅ | Master plan lines 6420-6447 |
| The ACs include "Quick Lift action works inline" | ✅ | Master plan line 6444. Means: the friend prayer card embeds a Quick Lift trigger that uses the existing `useQuickLift` hook + UI pattern |
| `PrayTabContent.tsx` has section breaks (lines 247, 262) for inserting new sections | ✅ | The file has a multi-section layout. New `<FriendPrayersToday />` block can land between existing sections per plan-recon's chosen position. Lines 247 (PrayerInput) → 261 (GuidedPrayerSection container open) is the natural insertion zone |
| `Post.isAnonymous` field exists (Gate-G-ANONYMOUS-AUTHORS-RESPECTED achievable) | ✅ | `Post.java:34-35` — `@Column(name = "is_anonymous", nullable = false) private boolean isAnonymous;`. Getter at `:132`, setter at `:163` |
| 6.6b-deferred-2 / -4 / -1 / -3 are all still deferred | ✅ | Tracker (per recent specs). Not load-bearing for 7.4 |

**Recon override:** Three things differ from the stub:
1. The Pray tab component file is `PrayTabContent.tsx`, not `DailyHubPray.tsx`. Update the spec accordingly.
2. The "has not prayed for" semantics need clarification (R1): is "prayed for" = "Quick Lifted" (the existing 6.2 mechanism)? Or some other interaction (intercessor, comment, candle)? **Recon Addendum item 2 narrows to "completed Quick Lift session"** as the default per MPD-1.
3. The friends-visibility predicate from 7.7 was hedged as "may or may not be active" in the brief — **recon confirms it IS active** (Recon Addendum item 1), so 7.4 just composes with the existing predicate. Less code than the brief feared.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** "Has not prayed for" means "the viewer has NOT created a Quick Lift session with `completed_at IS NOT NULL` for this post." The check joins against `quick_lift_sessions` using `user_id = :viewer_id AND post_id = posts.id AND completed_at IS NOT NULL`. Posts where such a row exists are excluded. This is the canonical "prayer interaction" signal per Spec 6.2 and matches the brief's intent (Recon Addendum item 2 confirms).

**MPD-2.** The friend-posts query selects from `posts` joined with `friend_relationships` (where `friend_user_id = :viewer_id`, status = 'active'), filtered to the last 24 hours by `created_at`, excluding posts the viewer has already completed a Quick Lift for. Result limited to 3 most-recent posts. Order: `created_at DESC`. The base query composes `PostSpecifications.visibleTo(viewerId)` (existing, active per Recon Addendum item 1) with the new friend-and-time-and-not-prayed predicates.

**MPD-3.** Empty state is gracefully gentle. If the user has zero friends OR friends have no posts in the last 24h OR the viewer has already Quick Lifted all eligible posts, the component renders the empty state copy (per AC). Plan-recon picks copy with brand voice review (per R6).

**MPD-4.** Privacy + crisis: the endpoint MUST honor the same moderation + visibility predicates that the main Prayer Wall feed uses. Specifically:
- `posts.is_deleted = FALSE` (handled by `PostSpecifications.visibleTo`)
- `posts.moderation_status IN ('approved', 'flagged')` (handled by `PostSpecifications.visibleTo`)
- `posts.visibility` — composed with the active `visibleTo(viewerId)` predicate (Recon Addendum item 1).
- Crisis-flagged posts: include in the surface but apply the same suppression UI (Watch-pattern crisis-resources banner suppression). Plan-recon confirms whether the surface respects 6.4 / 6.11b crisis-suppression on its own or inherits.

**MPD-5.** The `FriendPrayersToday.tsx` component renders 0-3 cards. Each card shows:
- Anonymous-respecting author display (per Spec 4.6 anonymous-author affordances — if friend's post is `isAnonymous = true`, the card shows "Someone" or equivalent, NOT the friend's name)
- Post content (truncated if necessary)
- A Quick Lift inline trigger (button or affordance) that, on tap, invokes the existing `useQuickLift({ postId }).start()` mechanism
- Scripture chip if the post has one (per Spec 7.2 — chip already renders)
- Light timestamp ("1h ago") or similar

The card visual treatment should be DISTINCT from full PrayerCard — this is a daily-hub micro-surface, not a full feed card. Smaller, less interactive, focused on quick action. Plan-recon picks the exact visual treatment (see R3).

**MPD-6.** Once the viewer Quick Lifts a friend's post via this surface, the post disappears from the "From your friends today" section on next render. The endpoint excludes it. Optionally: optimistic UI (the card animates out immediately, with the endpoint refetched on next mount).

**MPD-7.** The component is auth-required. Anonymous viewers see nothing in the Pray tab where this section would render. No "sign in to see friends" CTA — the section simply doesn't mount for unauthenticated users.

**MPD-8.** Section position in PrayTabContent: insert as a NEW section, NOT inside an existing one. Plan-recon picks position; likely between the prayer-input/response section (ending around line 258) and the guided-prayer-sessions section (opening at line 261). Visually it's a smaller widget, not a peer of the main prayer UX.

---

## Plan-Recon Gating Questions (R1–R8)

**R1 — "Has not prayed for" semantic definition (load-bearing).** Three options:
- (a) **Completed Quick Lift session = "prayed for."** Default per MPD-1 + Recon Addendum item 2. Most direct mapping to Spec 6.2.
- (b) **Any post interaction = "prayed for."** Includes Quick Lift, candle, comment, intercessor signup. Broader; matches the user-intuition of "I've engaged with this prayer" but harder to implement (multiple JOINs).
- (c) **Custom signal.** Some new `prayed_for_today` boolean / table. Out of scope.

**Default per MPD-1: (a).** Plan-recon writes a representative query against `quick_lift_sessions` joining on `completed_at IS NOT NULL`. If Eric prefers (b) for richer "stop nagging me about prayers I've already engaged with" semantics, plan-recon surfaces.

**R2 — Visibility predicate composition.** **Recon Addendum item 1 resolved this in spec-time:** `PostSpecifications.visibleTo(viewerId)` IS active and composed into PostService at multiple sites. Plan-recon just confirms the composition shape (`Specification.where(visibleTo(viewerId)).and(byActiveFriendsOf(viewerId)).and(createdInLast24h()).and(notCompletedQuickLiftBy(viewerId))`).

Open sub-question for plan-recon: should 7.4 also compose `PostSpecifications.notMutedBy(viewerId)`? The mute predicate is composed at feed + author-posts sites per the docstring. Plan-recon decides if a friend-surface should respect mutes (likely YES — if I've muted a friend, their posts shouldn't surface here either).

**R3 — Card visual treatment.** Three options:
- (a) **Mini PrayerCard.** Reuse a stripped-down PrayerCard with smaller padding, fewer affordances (no comments, no full reaction set), Quick Lift as the primary action.
- (b) **Custom widget card.** New component, smaller surface, distinct visual identity from PrayerCard. Author chip + content preview + Quick Lift button.
- (c) **List row.** Inline list format, even more compact, single tap to expand or Quick Lift.

**Default per MPD-5: (b).** Distinct visual identity reinforces the surface as a Daily Hub widget, not a feed clone. Plan-recon picks the design.

**R4 — Quick Lift inline UX.** When the user taps Quick Lift on a friend prayer card, what happens?
- (a) **Inline animation + dismissal.** The card collapses/fades after a brief "Lifting..." state. Endpoint reflects the change on next mount.
- (b) **Modal / sheet expansion.** Tapping Quick Lift opens the full Quick Lift UI flow (per the existing `useQuickLift` state machine).
- (c) **Toast + dismissal.** Card animates out, toast confirms.

**Default per MPD-6: (a) for the dismissal, with the existing `useQuickLift` hook handling the actual session lifecycle in the background.** Plan-recon confirms by reading how Quick Lift is invoked elsewhere (e.g., on PrayerCard) — match the existing UX pattern.

**R5 — Endpoint location.** Three options:
- (a) **Add to `PostController.java`** (per stub).
- (b) **New `UserPostsController.java` or `FriendPostsController.java`.**
- (c) **Add to a new `DailyHubController.java`** that aggregates Daily Hub surface data.

**Default per the stub: (a) PostController.** Simplest, lowest-friction. Plan-recon confirms PostController doesn't violate any "endpoint cohesion" rule by adding a friend-scoped query. Worth checking: the path `/api/v1/users/me/friend-prayers-today` is `users`-scoped — does it belong in PostController, or in `UserController`? Plan-recon decides.

**R6 — Empty-state copy + brand voice.** Three states to design:
- "User has no friends": *"When you have friends, their prayers will show up here so you can lift them up."* (encouraging, not pressuring to add friends — no "Add a friend" CTA)
- "Friends have no recent posts": *"Your friends haven't shared anything today. Sometimes silence is its own kind of peace."* (anti-pressure: doesn't pressure friends to post)
- "Viewer has Quick Lifted all eligible posts": *"You've lifted up everything your friends shared today. Beautiful work."* (positive acknowledgment, gentle)

Plan-recon refines per brand-voice gate. **Anti-pressure checklist applies:** no exclamation points near vulnerability, no comparison, no urgency, no streak-as-shame, no false scarcity.

**R7 — Crisis-flagged friend post handling.** If a friend's recent post is crisis-flagged, should it appear in this surface?
- (a) **Yes, with the same crisis-suppression UI patterns** (CrisisResourcesBanner, Watch-style placeholder if Watch is active for the viewer).
- (b) **No, exclude from this surface.** Crisis-flagged posts are best handled in the full Prayer Wall context, not in a "Daily Hub micro-card" where there isn't room for the full safety UX.

**Default per MPD-4: (a) include, with full crisis-suppression UI inherited.** But (b) is also defensible. Plan-recon picks. **Important:** Even on path (a), `CRITICAL_NO_AI_AUTO_REPLY.md` applies — no LLM is invoked on the friend prayer surface. The surface is read-only display + Quick Lift trigger; no AI involvement.

**R8 — Rate limiting + caching.** The endpoint is called on Daily Hub mount, potentially many times per day per user. Plan-recon confirms:
- Endpoint is cached (Redis, 60-300s TTL?) or recomputed on each call
- Rate limited per user (similar to PresenceController if applicable) — Caffeine-bounded per `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES
- Idle-tab polling not warranted; the surface refreshes on mount only

Default: cache 5min in-process (no Redis yet — Caffeine-bounded per existing pattern). Per-user rate limit per `02-security.md` table (read endpoint: 100/min per authenticated user is the Forums Wave target). Plan-recon confirms.

---

## Section 1 — As-Designed Behavior

### 1.1 User opens Daily Hub Pray tab

User navigates to `/daily?tab=pray`. `PrayTabContent.tsx` mounts. If user is authenticated AND has at least 1 friend, the `<FriendPrayersToday />` section fires its endpoint call.

### 1.2 Endpoint response

`GET /api/v1/users/me/friend-prayers-today` returns up to 3 posts:
- From the authenticated user's friends (status = 'active')
- Created in the last 24 hours
- Excluding posts the viewer has completed a Quick Lift for (`completed_at IS NOT NULL`)
- Respecting visibility predicates via composed `PostSpecifications.visibleTo(viewerId)`
- Respecting moderation status (handled by `visibleTo`: `approved` or `flagged`, `is_deleted = false`)
- Respecting mutes via composed `PostSpecifications.notMutedBy(viewerId)` (pending plan-recon R2 sub-question)

Empty array if no eligible posts.

### 1.3 Component renders

`<FriendPrayersToday />` renders 0-3 cards. Each card per MPD-5 + R3 default (custom widget card).

### 1.4 Viewer taps Quick Lift on a card

Existing `useQuickLift({ postId }).start()` fires. Card animates out per R4 default (a). On next mount, the post is excluded.

### 1.5 Empty state

If endpoint returns empty, component renders the appropriate empty-state copy per R6.

### 1.6 Unauthenticated user

Component does NOT mount. No "sign in" CTA in this surface. Other Daily Hub UX handles auth flow if needed.

---

## Section 2 — Gates

- **Gate-G-MAX-THREE-POSTS.** Endpoint returns NO MORE than 3 posts. A test inserts 5 friend posts in the last 24h and asserts only 3 are returned (most recent).
- **Gate-G-NOT-PRAYED-EXCLUSION.** Posts the viewer has completed a Quick Lift for are excluded. Test creates a post, completes a Quick Lift on it (`completed_at IS NOT NULL`), asserts the post does NOT appear in subsequent endpoint call. Also test: a started-but-not-completed Quick Lift (`started_at` set, `completed_at` null) does NOT exclude (only completed sessions count per MPD-1).
- **Gate-G-FRIENDS-ONLY.** Posts by non-friends are excluded. Test creates posts by a non-friend and by a friend; asserts only the friend's post is returned.
- **Gate-G-ACTIVE-RELATIONSHIPS-ONLY.** Posts by blocked friends (status = 'blocked') are excluded. Test toggles status to 'blocked' and asserts the post is no longer surfaced.
- **Gate-G-VISIBILITY-RESPECTED.** Per Recon Addendum item 1: composed `visibleTo(viewerId)` excludes private posts (unless viewer is author), restricts friends-only posts to friends. Test inserts a friend's `visibility='private'` post → not returned. Inserts a friend's `visibility='friends'` post → returned (viewer IS a friend).
- **Gate-G-24-HOUR-WINDOW.** Posts older than 24h are excluded. Test inserts a post with `created_at` = 25h ago, asserts not returned.
- **Gate-G-ANONYMOUS-AUTHORS-RESPECTED.** If a friend's post has `isAnonymous = true`, the card displays "Someone" or equivalent, NOT the friend's name. Test asserts UI rendering.
- **Gate-G-UNAUTHENTICATED-NO-RENDER.** The component does not mount for unauthenticated users. No empty UI shell, no auth modal trigger from this surface.
- **Gate-G-EMPTY-STATE-PROPER-COPY.** Each of the 3 empty states (no friends, no recent posts, all already lifted) shows the correct copy. Tests verify each.
- **Gate-G-QUICK-LIFT-INLINE.** Quick Lift triggered from a friend prayer card invokes `useQuickLift({ postId }).start()`. Test mocks the hook, fires the action, asserts hook called with correct postId.
- **Gate-G-CARD-DISMISSAL-POST-LIFT.** After Quick Lifting a card, the card animates out (per R4 default) and the next endpoint call excludes that post. Test asserts both client-side animation and server-side exclusion.
- **Gate-G-MODERATION-RESPECTED.** Posts with `moderation_status` outside `('approved', 'flagged')` and posts with `is_deleted = true` are excluded (via composed `visibleTo`). Test verifies.
- **Gate-G-MUTES-RESPECTED.** Per R2 sub-question default: posts by users the viewer has muted are excluded (via composed `notMutedBy`). Test mutes a friend, asserts their posts no longer surface. (If plan-recon decides NOT to compose `notMutedBy`, this gate flips out.)
- **Gate-G-CRISIS-FLAG-HANDLING.** Per R7 default: crisis-flagged friend posts ARE shown with full crisis-suppression UI inherited. Test asserts the CrisisResourcesBanner pattern applies. **No LLM invoked on this surface** — `CRITICAL_NO_AI_AUTO_REPLY.md` enforced by absence (the surface is pure read + Quick Lift trigger).
- **Gate-G-BRAND-VOICE.** Empty-state copy, Quick Lift inline microcopy, and any new strings pass brand voice review (anti-pressure checklist).

---

## Section 3 — Tests

Stub minimum is 10. Realistic count is higher given the matrix. Sketch:

**Backend — FriendPrayersService (7–9 tests):**
- 3-post max (Gate-G-MAX-THREE-POSTS)
- Completed Quick Lift exclusion (Gate-G-NOT-PRAYED-EXCLUSION — completed branch)
- Started-but-not-completed Quick Lift does NOT exclude (Gate-G-NOT-PRAYED-EXCLUSION — incomplete branch)
- Friends-only filtering (Gate-G-FRIENDS-ONLY)
- Active-relationship filtering (Gate-G-ACTIVE-RELATIONSHIPS-ONLY)
- Visibility predicate composition (Gate-G-VISIBILITY-RESPECTED — exercise private + friends + public)
- 24-hour window (Gate-G-24-HOUR-WINDOW)
- Moderation status (Gate-G-MODERATION-RESPECTED)
- Mute filtering (Gate-G-MUTES-RESPECTED — if R2 sub-question lands on YES compose notMutedBy)
- Most-recent ordering when more than 3 eligible posts exist

**Backend — Endpoint controller (2 tests):**
- Authenticated returns 200 with array
- Unauthenticated returns 401

**Frontend — FriendPrayersToday component (5–7 tests):**
- Renders 0-3 cards based on prop data
- Empty state: no friends — correct copy (Gate-G-EMPTY-STATE-PROPER-COPY)
- Empty state: no recent posts — correct copy
- Empty state: all-lifted — correct copy
- Anonymous author displays "Someone" not friend name (Gate-G-ANONYMOUS-AUTHORS-RESPECTED)
- Quick Lift button click invokes `useQuickLift` (Gate-G-QUICK-LIFT-INLINE)
- Card animates out after Quick Lift, list re-renders without it (Gate-G-CARD-DISMISSAL-POST-LIFT)

**Frontend — PrayTabContent integration (1–2 tests):**
- `<FriendPrayersToday />` renders in correct section position
- Unauthenticated user → component does not mount (Gate-G-UNAUTHENTICATED-NO-RENDER)

**Optional integration (1–2 tests):**
- End-to-end: log in, see friend posts in Daily Hub Pray tab, Quick Lift one, page refresh, post no longer shown

Total: ~16–22 tests. Comfortably above the 10 minimum.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The surface shows 3 posts MAX. No "see all friends" expansion. No infinite scroll. Anti-pressure: don't make the user feel they need to engage with everything.
- Quick Lift is the only inline action. No like, no comment, no candle, no share. Single intentional action.
- Empty states are gentle, not commercial. "Your friends haven't shared anything today. Sometimes silence is its own kind of peace." — affirms quietude, doesn't pressure friends to post.
- Anonymous-respecting: a friend posting anonymously shows up as "Someone" or equivalent in this surface. The friend's identity is NOT leaked because they happen to be a friend.
- Crisis-flagged posts retain full crisis-suppression UI inherited from the post itself.
- **NO AI invocation on this surface.** Per `CRITICAL_NO_AI_AUTO_REPLY.md`, the friend-prayers surface is pure read + Quick Lift trigger. No LLM summary, no AI-generated "suggested response," no AI-classified routing. The crisis-flag respect is via the existing static UI inheritance pattern, not via any new classification call.
- No analytics tracking on "friend prayers viewed" metric. The surface is a comfort feature, not engagement bait.
- No notification triggered by friend posts appearing in this surface — the surface is opt-in by virtue of opening the Pray tab.

---

## Section 5 — Deferred / Out of Scope

- **Daily Hub other tabs (Devotional, Journal, Meditate) similar surfaces.** Each could have a parallel widget; out of scope for 7.4.
- **Push notification on friend post.** Out of scope; existing notification system handles per-post notifications independently.
- **"Pray together" group-Quick-Lift surfaces.** Out of scope.
- **Recommendation engine for which 3 posts to surface (vs. simple chronological).** Out of scope. Use most-recent ordering only.
- **Multi-friend grouping ("Sarah and 2 others shared today").** Out of scope. Cards are individual.
- **Friend post snooze ("don't show me Bob's posts in this surface").** Out of scope. Existing mute system at `user_mutes` table (per `2026-04-27-013-create-user-mutes-table.xml`) applies if plan-recon decides to compose `notMutedBy`; otherwise no friend-specific filtering.
- **7.5 / 7.6 / 7.7 cross-references.** 7.5 is friend chips on Prayer Wall, 7.6 surfaces friend posts in the Prayer Wall feed itself, 7.7 introduces visibility tiers. 7.4 is a Daily Hub-side surface only; other surfaces handled by their own specs.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, etc.** All still parked.

---

## Pipeline Notes

- **`/playwright-recon` (optional):** Capture current Daily Hub Pray tab layout so the new section's position can be visually verified against the baseline. The "From your friends today" widget is a NEW visual surface; recon-time captures help verify placement and visual rhythm.
- **`/spec-forums`:** Produces this spec file at `_specs/forums/spec-7-4.md` from the brief. ✅ (this step).
- **`/plan-forums`:** Resolves R1 (default → completed Quick Lift), R2 sub-question (notMutedBy yes/no), R3 (card visual), R4 (dismissal UX), R5 (endpoint location), R6 (empty-state copy), R7 (crisis handling), R8 (caching + rate limit). R1 is largely pre-resolved by Recon Addendum item 2; R2 is largely pre-resolved by Recon Addendum item 1.
- **`/execute-plan-forums`:** Backend changes (new service, new endpoint, new repository methods, Caffeine rate-limit config) + frontend changes (new component, PrayTabContent integration). Eric reviews execute output BEFORE `/code-review`.
- **`/code-review`:** Standard pass. Specifically check Gate-G-VISIBILITY-RESPECTED, Gate-G-NOT-PRAYED-EXCLUSION, Gate-G-ANONYMOUS-AUTHORS-RESPECTED, Gate-G-MUTES-RESPECTED (if applicable), `CRITICAL_NO_AI_AUTO_REPLY.md` enforcement (no new LLM imports near friend-content code paths), bounded-cache + per-user rate limit per `02-security.md`.
- **`/verify-with-playwright`:** Visual verification of the new section in Daily Hub Pray tab + Quick Lift inline action. Verify against `/daily?tab=pray` per the Affected Frontend Routes section.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.4 stub (master plan lines 6420–6447)
- `_plans/forums/spec-7-4-brief.md` — the brief this spec was derived from
- `frontend/src/components/daily/PrayTabContent.tsx` — Daily Hub Pray tab (NOT `DailyHubPray.tsx` as stub claimed)
- `backend/src/main/resources/db/changelog/2026-04-27-009-create-friend-relationships-table.xml` — friend_relationships table schema
- `backend/src/main/resources/db/changelog/2026-05-12-004-create-quick-lift-sessions-table.xml` — quick_lift_sessions schema (R1 anchor)
- `backend/src/main/java/com/worshiproom/friends/FriendRelationship.java` — existing entity
- `backend/src/main/java/com/worshiproom/friends/FriendRelationshipRepository.java` — existing repository (existing leaderboard JOIN pattern at lines 115-119)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` — `visibleTo(viewerId)` ACTIVE; `notMutedBy(viewerId)` available for composition (R2 sub-question)
- `backend/src/main/java/com/worshiproom/post/PostService.java:148, 170, 189` — existing `visibleTo` compositions (the canonical pattern to mirror)
- `backend/src/main/java/com/worshiproom/post/Post.java:34-35` — `isAnonymous` field (Gate-G-ANONYMOUS-AUTHORS-RESPECTED achievable)
- `backend/src/main/java/com/worshiproom/quicklift/QuickLiftSessionRepository.java` — existing repository (may need new method)
- `frontend/src/hooks/useQuickLift.ts:48-75` — existing Quick Lift hook to reuse
- `_plans/forums/spec-7-3-brief.md` — sibling brief (just shipped)
- `_plans/forums/spec-7-2-brief.md` — sibling brief (shipped earlier)
- `_plans/forums/spec-7-1-brief.md` — sibling brief (shipped earlier)
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — Universal Rule 13 enforcement; applies to any future change near this code that introduces an AI/LLM call on user content
- `.claude/rules/02-security.md` § BOUNDED EXTERNAL-INPUT CACHES — pattern for per-user rate-limit Caffeine cache (R8)
- Spec 6.2 — Quick Lift origin spec
- Spec 4.6 — anonymous-author affordances
- Spec 2.5.x — friend relationships shipping wave
- Spec 7.7 — Privacy Tiers (visibility predicate origin; R2 was resolved by recon)
