# Forums Wave: Spec 7.7 — Privacy Tiers (Public / Friends / Private)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.7 stub (master plan lines 6492–6531). Size L, Risk High, prerequisites 7.6. Six-AC checklist (composer shows 3-option visibility selector, default is Public, selected visibility persists, backend reads enforce visibility, end-to-end Playwright test, brand voice tooltip review, ≥18 tests). Goal: *"Composer adds a visibility selector with three options: Public (anyone can see), Friends (only friends can see), Private (only you can see). Selected visibility persists with the post. Backend reads enforce visibility predicates on every post-returning endpoint."*

**Brief Source:** This brief, authored 2026-05-16 against the live master plan stub + live code recon. The stub includes the canonical SQL visibility predicate verbatim (lines 6504–6519), which is the most-detailed predicate specification in the master plan and the contract every read endpoint must honor.

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Date:** 2026-05-16.

**Spec ID:** `round3-phase07-spec07-privacy-tiers`

**Phase:** 7 (Cross-Feature Integration) — the seventh and final pre-cutover spec.

**Size:** L

**Risk:** **High** — and this is the only Phase 7 spec rated High. Reasons:
- (a) **Privacy correctness is load-bearing.** A buggy visibility predicate leaks private posts to non-authors or hides friends-only posts from actual friends. The canonical SQL predicate (master plan lines 6504-6519) is the contract; any deviation is a bug.
- (b) **Universal Rule 5 mandates centralization.** Every post-returning endpoint MUST use the same predicate. The recon below shows `PostSpecifications.visibleTo(viewerId)` is the existing centralized predicate. 7.7's enforcement-audit AC requires confirming every endpoint uses it.
- (c) **The composer signature change** (`onSubmit` adding visibility) is a multi-call-site refactor.
- (d) **Friends-tier requires real friend_relationships data** — testing visibility=`'friends'` enforcement requires test fixtures with friend relationships in place.
- (e) **No "private" posts existed in production before this spec.** The `visibility` column already exists with default `'public'`, but the composer never exposed the tier choice. Once 7.7 ships, users can actually create private/friends posts and the predicate is exercised in real traffic.

Risk is bounded because: (i) the canonical SQL predicate already exists and is implemented at `PostSpecifications.visibleTo(viewerId)` (lines 56-95); (ii) `PostVisibility` enum and `request.visibility()` flow are wired; (iii) `PostSpecificationsTest` already exists per the JavaDoc reference; (iv) the multi-call-site signature change is mechanical, not subtle.

**Tier:** Standard, but **DEMANDS extra audit care.** The "Backend reads enforce visibility" AC requires plan-recon to enumerate every read endpoint and verify each uses `visibleTo`.

---

## Affected Frontend Routes

- `/prayer-wall` (composer renders visibility selector — primary surface)
- `/prayer-wall/:id` (PrayerDetail's composer in comment/reply mode — see R3 for whether this applies)
- `/prayer-wall/dashboard`, `/prayer-wall/user/:id` (any route mounting InlineComposer)

The visibility selector is composer-state-driven. It fires wherever InlineComposer is rendered.

---

## Affected Backend Surfaces

- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` (visibility predicate — verify implementation matches canonical SQL)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (audit every method that returns posts — ensure visibility composed)
- `backend/src/main/java/com/worshiproom/post/PostController.java` (audit endpoints)
- Other services that read posts: `IntercessorService`, `PrayerReceiptService`, `AnsweredFeedCache`, `FriendPrayersService` (7.4-shipped), `AnswerFeed`, `NotificationService` (if it includes post content), etc. — full enumeration in R4.
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` (add `visibility` field if not present — verify in recon)
- `backend/src/main/java/com/worshiproom/post/CreatePostRequest.java` (already has `visibility()` per recon row 7; verify)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (add visibility selector + state)
- `frontend/src/components/prayer-wall/VisibilitySelector.tsx` (NEW component)
- Frontend API client (whatever sends `POST /api/v1/posts` — add `visibility` to the payload)

---

## STAY ON BRANCH

Same as Phase 6, 7.1–7.6 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

| Item | Status | Evidence |
|---|---|---|
| `PostVisibility` enum has PRIVATE / FRIENDS / PUBLIC (active) | ✅ | `PostService.java:725-729` — switch covering all three values |
| `PostSpecifications.visibleTo(viewerId)` is fully implemented (not documented-only) | ✅ | `PostSpecifications.java:56-95` — full implementation. Returns the composable Specification with notDeleted + moderationVisible + visibilityClause (line 94 combines). Comment block at lines 18-28 documents the importance |
| Friend-relationships subquery direction is documented as critical | ✅ | `PostSpecifications.java:52-54` — *"The friend_relationships subquery direction is critical: fr.user_id = post author, fr.friend_user_id = viewer. Reversing leaks private content."* Tests in `PostSpecificationsTest` verify both directions. **This is the load-bearing direction the canonical SQL predicate (lines 6510-6513) mandates** |
| Spec 6.6b's `PostSpecifications.authorActive()` shows the extension pattern | ✅ | `PostSpecifications.java:166-176` — adds a correlated subquery for "author not deleted/banned." Same pattern 7.4's `friendsOf(viewerId)` followed at lines 180+ |
| Spec 7.4 already added `friendsOf(viewerId)` to PostSpecifications | ✅ | `PostSpecifications.java:180-190` — JavaDoc references "Spec 7.4 — restrict to posts whose author has an ACTIVE friend relationship with the viewer." This is the friend-pin predicate from 7.6 |
| `request.visibility()` field exists on CreatePostRequest and is persisted | ✅ | `PostService.java:311-313` — `post.setVisibility(request.visibility() != null ? PostVisibility.fromValue(request.visibility()) : PostVisibility.PUBLIC)`. Default-to-PUBLIC is already wired |
| InlineComposer does NOT currently expose visibility — no state variable, no UI | ✅ | `InlineComposer.tsx:74-78` — "visibility" appears only in a code COMMENT about Spec 4.3 per-type variations. No `selectedVisibility` state. No `<VisibilitySelector>` component |
| InlineComposer's `onSubmit` is positional with content/isAnonymous/category as required args | ✅ | `InlineComposer.tsx:179-182` — signature `onSubmit(content: string, isAnonymous: boolean, category: PrayerCategory \| null, ...)`. Multiple call sites pass this prop; signature change is a refactor |
| Existing radiogroup pattern at `InlineComposer.tsx:629-633` for category pills | ✅ | `role="radiogroup"`, `aria-label="Prayer category"`. **The visibility selector mirrors this exact pattern** with `aria-label="Post visibility"` |
| `isVisibilityUpgrade` + `visibilityOrder` helpers exist | ✅ | `PostService.java:717-730` — `isVisibilityUpgrade(from, to)` and `visibilityOrder(v)` ordering: PRIVATE=0, FRIENDS=1, PUBLIC=2. **This implies visibility CAN be CHANGED post-creation** (via updatePost) and the order matters. 7.7 doesn't need to support visibility downgrade on edit, but the infrastructure exists |
| `PostSpecificationsTest` exists (referenced in JavaDoc) | ✅ (claim) | `PostSpecifications.java:54` — *"Tests in PostSpecificationsTest verify both directions."* Plan-recon confirms by reading the test file directly to know test count and shape |
| The canonical SQL predicate in the stub (lines 6504-6519) IS the spec contract | ✅ | Master plan stub explicit. Every read endpoint must compose with this predicate. Universal Rule 5 mandates centralization |

**Recon override:** Three findings change the spec's framing:
1. **The backend visibility infrastructure is FULLY shipped.** 7.7's backend work is primarily an *enforcement audit + test coverage* exercise, not new implementation. The composer-side selector is the main new code.
2. **The composer's `onSubmit` signature must change.** This is a multi-call-site refactor. Plan-recon enumerates call sites.
3. **The "Default is Public" AC is already the backend default** (`PostService.java:311-313`). The frontend just needs to NOT pass a value, or explicitly pass `'public'`, to match.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Visibility selector renders BELOW the category pills, ABOVE the "Submit" button row. Plan-recon verifies the exact position. Visual: small `role="radiogroup"` row with 3 chips (Public / Friends / Private), `aria-label="Post visibility"`, mirroring the existing category-pills pattern at `InlineComposer.tsx:629-633`. Each chip has an icon (Globe / UserGroup / Lock per convention; plan-recon picks final icons) and a label.

**MPD-2.** Default is Public:
- The `selectedVisibility` state defaults to `'public'`
- The visibility chip for Public is selected on mount
- This matches the backend default at `PostService.java:313`

**MPD-3.** Visibility is passed via the existing `onSubmit` callback signature, EXTENDED:
- Current signature (per recon): `onSubmit(content, isAnonymous, category, ...)` (plan-recon enumerates the full positional args)
- New signature: add `visibility: PostVisibility` as a new parameter (likely after `category`, before scripture args)
- All call sites that pass `onSubmit` must be updated. Plan-recon enumerates: PrayerWall.tsx, PrayerDetail.tsx (if applicable), PrayerWallProfile.tsx, PrayerWallDashboard.tsx, possibly DailyHubPray / PrayTabContent (if the composer is mounted there)

**MPD-4.** Each visibility chip has a SHORT tooltip explaining the option:
- Public: *"Anyone on Worship Room can see this prayer."*
- Friends: *"Only people you've added as friends will see this prayer."*
- Private: *"Only you can see this prayer. Useful for journaling-style prayers."*

Tooltips are SHORT, non-pressuring, and brand-voice-compliant. R6 picks final copy.

**MPD-5.** Brand-voice gate: tooltip copy review per AC. Specifically:
- Don't pressure user toward public ("share with the community!")
- Don't pressure user toward private ("keep it safe!")
- Don't pressure user toward friends ("only your closest people")
- Don't use scarcity ("limited friends can see this!")
- Don't use commercial language
- DO: factual, neutral, calm

**MPD-6.** Backend enforcement audit:
- Plan-recon enumerates EVERY read endpoint that returns Post data
- Verify each composes with `PostSpecifications.visibleTo(viewerId)` per Universal Rule 5
- For each endpoint not currently using the predicate: surface to Eric (may indicate latent bug or a `Divergence` like Spec 3.3 Divergence 1 for getById direct lookups)
- The spec's deliverable includes a tracker entry listing all read endpoints and their visibility-predicate composition status

**MPD-7.** `PostResponse` DTO must include `visibility` field so the frontend can display visibility on read (e.g., a small icon on the PrayerCard showing the post's visibility tier). Plan-recon verifies whether the field already exists; if not, add it. Default UI behavior: display the visibility tier as a subtle icon next to the post timestamp, not a prominent label.

**MPD-8.** No visibility change UI on existing posts (deferred):
- The composer is for NEW posts only
- Editing an existing post's visibility (via `updatePost` endpoint at `PostService.java:397`) is OUT OF SCOPE for 7.7
- The `isVisibilityUpgrade` helper at `PostService.java:717` exists for future use but isn't exercised by 7.7
- Future spec could add visibility-on-edit; not 7.7's territory

**MPD-9.** The "End-to-end Playwright test" AC is taken literally:
- Real browser test: log in as user A, create a Friends post, log out, log in as user B (not friend), verify post is hidden; log in as user C (friend), verify post is visible
- This is the smoke test for the entire system end-to-end
- Plan-recon decides whether 1 Playwright test covers the full matrix or 3 separate tests for the 3 tiers

**MPD-10.** **Frontend audit for `PostCard` / `PrayerCard` visibility-aware display:**
- If the response includes `visibility: 'private'`, render a small lock icon next to the post (signal to the author: "this is private")
- If `visibility: 'friends'`, render a small users icon
- If `visibility: 'public'` (default), render no icon (or a globe icon — plan-recon picks)
- These icons are NOT clickable, NOT interactive — just visual cues

---

## Plan-Recon Gating Questions (R1–R8)

**R1 — Visibility selector visual treatment (load-bearing for design).** Three options:
- (a) **Chip row mirroring category pills** (default per MPD-1). Compact, consistent with existing composer pattern.
- (b) **Dropdown select.** More space-efficient but less discoverable.
- (c) **Three-button toggle.** Compact, but less standard.

**Default per MPD-1: (a) chip row.** Plan-recon confirms by mocking up the row visually + verifying it fits below category pills without overwhelming the composer.

**R2 — Default visibility per post type.** Should default differ by post type?
- (a) **Always Public.** Consistent, predictable.
- (b) **Private for certain types.** E.g., journaling-style discussions default to private, prayer requests to public.
- (c) **Sticky last-used visibility per type.** User's previous choice persists per post type (localStorage).

**Default: (a) Always Public.** Stub says "Default is Public" without per-type variation. Don't add complexity. Plan-recon confirms.

**R3 — Reply / comment composer behavior.** When InlineComposer is used as a comment composer in PrayerDetail (if it is — verify in recon):
- (a) **No visibility selector on comments.** Comments inherit post visibility automatically.
- (b) **Comments have own visibility tier.** Adds complexity.
- (c) **Comments are always public to post viewers.** Implicit inheritance.

**Default: (a) No visibility selector on comments.** Stub focuses on post composer; comment visibility is a separate concept. Plan-recon verifies whether InlineComposer is even used for comments (it may not be), and if so, suppresses the selector.

**R4 — Endpoint enforcement audit (load-bearing for correctness).** Plan-recon enumerates EVERY post-returning endpoint and verifies visibility-predicate composition. Suspected list:
- `PostService.listPosts` (main feed) — confirmed using `visibleTo` per 7.6 recon
- `PostService.findById` (single post detail) — confirmed at line 170
- `PostService.findByUsername` (profile feed)
- `PostService.findAnsweredFeed` (answered wall)
- `FriendPrayersService.findRecent` (7.4 — Daily Hub micro-surface)
- `IntercessorService` (if it returns post content)
- `PrayerReceiptService` (if it returns post content)
- `NotificationService` (if it returns post content)
- Any GET endpoint in `PostController.java` that returns posts directly
- Any cached endpoint via `AnsweredFeedCache`

For each: confirm visibility-predicate composition OR document the Divergence (per Spec 3.3 Divergence 1). 

If any endpoint is missing the predicate: STOP and surface to Eric.

**R5 — Friends tier accessibility before friend relationship is mutual.** Friend relationships in `friend_relationships` are stored as TWO rows per mutual relationship (per the 2026-04-27 changelog header comment). Question: if A requests friendship with B but B hasn't accepted yet (status = 'pending' or only one row exists), should A's Friends-tier posts be visible to B?
- (a) **Only when BOTH directions are active.** Strictest privacy. Requires both rows to exist with status='active'.
- (b) **When EITHER direction is active.** Permissive.
- (c) **When the author has any active relationship row for the viewer.** Default mirrors the existing predicate at `PostSpecifications.java:52-54`.

**Default: (c).** Per existing `visibleTo` predicate. The canonical SQL at master plan line 6510-6513 says `fr.user_id = post.user_id AND fr.friend_user_id = :viewer_id AND fr.status = 'active'` — single direction, single row. Plan-recon confirms by reading the actual `PostSpecifications.visibleTo` implementation (lines 56-95).

**R6 — Tooltip copy + brand voice (load-bearing).** Per MPD-4 + brand-voice gate. Specifically pick:
- (a) **Long-form tooltip** with explanation: 8-12 words each
- (b) **Short label only**: 3-5 words each (e.g., "Anyone can see this")
- (c) **Icon-only with hover tooltip**: minimum visual weight, info on hover

**Default per MPD-4: (a) longer tooltip.** Privacy is meaningful; users benefit from clarity. Plan-recon refines per brand voice review.

**R7 — Visibility on PostCard / PrayerCard display.** Per MPD-10:
- (a) **Show icon for non-public visibility tier.** Subtle visual cue for the author + viewers.
- (b) **Show icon only for the author's own posts.** Visibility is private info — non-authors shouldn't know post tier (security through obscurity).
- (c) **Show icon for everyone.** Universal visibility info.

**Default per MPD-10: (a).** Visibility tier is not secret — a Friends post is visible to friends BY DESIGN, so showing the tier is fine. (b) is over-conservative; (c) is fine but probably noisy.

**R8 — Cache invalidation when visibility changes.** When a user creates a new post with visibility=`'friends'`, does any existing cache need eviction?
- `AnsweredFeedCache` — only caches answered posts; new prayer_request post doesn't hit this
- `FriendPrayersService` (7.4) — uses real-time query; no cache to evict
- Other caches: plan-recon enumerates

**Default: No cache eviction needed for normal post creation.** Plan-recon verifies.

---

## Section 1 — As-Designed Behavior

### 1.1 User opens composer

User taps "Share something" on `/prayer-wall`. InlineComposer renders. The visibility selector chip row appears below category pills with Public chip selected by default (MPD-2).

### 1.2 User picks Friends

User taps the Friends chip. `setSelectedVisibility('friends')`. Tooltip on hover shows the Friends explanation.

### 1.3 User submits

The `handleSubmit` callback invokes `onSubmit(content, isAnonymous, category, visibility, ...)` per MPD-3 extended signature. The parent component (e.g., PrayerWall.tsx) constructs the POST payload including `visibility: 'friends'` and sends to backend.

### 1.4 Backend persists

`PostService.createPost` reads `request.visibility()`, calls `PostVisibility.fromValue('friends')`, sets on the entity. Persisted to DB with `visibility = 'friends'`.

### 1.5 Read enforcement

Subsequent feed reads run `PostSpecifications.visibleTo(viewerId)`:
- Anonymous reader (`viewerId = null`): friends-tier post NOT visible
- Authenticated non-friend reader: friends-tier post NOT visible
- Authenticated friend reader: friends-tier post visible
- Author reading own post: ALWAYS visible regardless of tier (per predicate line 6517)

### 1.6 Private tier

If user picked Private:
- Only the author sees the post in any feed, by-ID lookup, or notification context
- The post is excluded from EVERY visibility query for non-authors
- The post still exists in the database; it's just filter-hidden

### 1.7 Friend post viewer experience

Friend B sees A's Friends post in their feed (assuming 7.6's pin or chronological). The post's PrayerCard renders the Friends icon per MPD-10 / R7 default.

### 1.8 End-to-end Playwright

Per AC: 1 (or 3 split) Playwright tests that exercise the full create-and-enforce cycle in a real browser with real auth + real DB.

### 1.9 Visibility tier change on edit

Out of scope per MPD-8. Editing a post does not allow visibility tier change in 7.7.

---

## Section 2 — Gates

- **Gate-G-SELECTOR-RENDERS.** Visibility selector with 3 chips renders in InlineComposer below category pills. Test asserts the chip group is present with `role="radiogroup"`.
- **Gate-G-DEFAULT-PUBLIC.** Public chip is selected by default on composer mount. Tests assert `selectedVisibility === 'public'` on render.
- **Gate-G-PERSISTENCE.** Submitting with visibility=`'friends'` results in `posts.visibility = 'friends'` in the DB. Backend test verifies.
- **Gate-G-DEFAULT-PUBLIC-PERSISTENCE.** Submitting without explicitly choosing visibility results in `posts.visibility = 'public'` (default fall-through at `PostService.java:313`).
- **Gate-G-VISIBILITY-PREDICATE-CORRECTNESS.** `PostSpecifications.visibleTo(viewerId)` correctly enforces the canonical predicate per master plan lines 6504-6519. Tests cover: anonymous reader / authenticated friend / authenticated non-friend / author themselves for each tier (public/friends/private).
- **Gate-G-FRIEND-DIRECTION.** The `friend_relationships` subquery direction is `fr.user_id = post.user_id AND fr.friend_user_id = :viewer_id` (per existing predicate + canonical SQL). Tests verify reversal does NOT match — i.e., a friend relationship in the wrong direction does NOT make a private post visible.
- **Gate-G-AUTHOR-ALWAYS-VISIBLE.** The author of a private post can always see their own post regardless of tier (predicate line 6517).
- **Gate-G-ENFORCEMENT-EVERY-ENDPOINT.** Per R4, every post-returning endpoint composes with `visibleTo`. Plan-recon's enforcement audit confirms; spec output includes the tracker entry of audited endpoints.
- **Gate-G-NO-LEAKAGE.** A reader who is NOT a friend MUST NOT see a friends-tier post anywhere (feed, by-ID, notification, search, etc.). Tests cover each surface.
- **Gate-G-PRIVATE-NEVER-LEAKED.** A private post MUST NOT appear in any non-author surface — even if the author has friends. Tests verify.
- **Gate-G-CHIP-ICON-DISPLAY.** PrayerCard renders the appropriate visibility icon per MPD-10. Test asserts.
- **Gate-G-TOOLTIP-BRAND-VOICE.** Tooltips pass brand voice review (R6). Asserted by code review.
- **Gate-G-COMPOSER-SIGNATURE-PROPAGATED.** All `onSubmit` callers updated to handle the new visibility parameter. Verified by code review (no TypeScript errors).
- **Gate-G-DOES-NOT-AFFECT-EDIT.** The `updatePost` endpoint at `PostService.java:397` is NOT changed by this spec (per MPD-8). Code review verifies.
- **Gate-G-PLAYWRIGHT-E2E.** AT LEAST ONE end-to-end Playwright test verifying create-and-enforce cycle per AC.

---

## Section 3 — Tests

Stub minimum is **18** — the highest test minimum of any Phase 7 spec. Realistic count is 24-32. Sketch:

**Backend — `PostSpecifications.visibleTo` predicate (6-8 tests):**
- Anonymous viewer + public post → visible
- Anonymous viewer + friends post → NOT visible
- Anonymous viewer + private post → NOT visible
- Authenticated viewer + public post → visible
- Authenticated viewer + friends post (viewer is friend) → visible
- Authenticated viewer + friends post (viewer NOT friend) → NOT visible
- Authenticated viewer + private post (viewer is author) → visible
- Authenticated viewer + private post (viewer is NOT author) → NOT visible
- Friend direction reversal does NOT leak (Gate-G-FRIEND-DIRECTION)
- Author can always see own posts regardless of tier (Gate-G-AUTHOR-ALWAYS-VISIBLE)

**Backend — Endpoint enforcement audit (3-5 tests):**
- For each enumerated endpoint (per R4), one test asserts visibility-predicate composition
- Specifically: feed, by-ID, profile-feed, answered-feed, friend-prayers
- If any endpoint missing predicate per R4, surface; tests cover audit findings

**Backend — Create / Update path (3-4 tests):**
- `createPost` with `request.visibility = 'public'` → persists 'public'
- `createPost` with `request.visibility = 'friends'` → persists 'friends'
- `createPost` with `request.visibility = 'private'` → persists 'private'
- `createPost` with `request.visibility = null` → defaults to 'public' (Gate-G-DEFAULT-PUBLIC-PERSISTENCE)
- `createPost` with invalid visibility string → throws / returns 400

**Frontend — VisibilitySelector component (3-4 tests):**
- Renders 3 chips with correct labels (Gate-G-SELECTOR-RENDERS)
- Each chip has correct ARIA role and label
- Tooltip text matches MPD-4 / R6 default
- Clicking a chip updates state and invokes onChange

**Frontend — InlineComposer integration (3-4 tests):**
- Visibility selector renders below category pills (MPD-1)
- Default state is Public (Gate-G-DEFAULT-PUBLIC)
- Submitting with visibility=`'friends'` invokes onSubmit with the new parameter
- Switching visibility tier updates selectedVisibility state
- Submitting then re-opening composer: state resets to default Public

**Frontend — PrayerCard visibility icon (2-3 tests):**
- Renders globe (or no) icon for Public
- Renders users icon for Friends
- Renders lock icon for Private
- Per R7 default, icons visible to ALL viewers

**End-to-end Playwright (1-3 tests, per stub AC):**
- One full cycle: log in as user A, create Friends post, log out, log in as user B (non-friend), verify post hidden, log in as user C (friend), verify post visible
- Optional: separate tests for each visibility tier (3 total)
- Optional: test for private post — only author sees, not even friends

Total: ~22-30 tests. Comfortably above the 18 minimum.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- The default is Public. Users who don't think about visibility get the most common case. No "you should make this private" prompt.
- Tooltips are factual, not promotional. *"Anyone can see this"* not *"Share with the whole community!"*
- The Private tier supports journaling-style use (a private prayer for self-reflection, not communal). Anti-pressure: not all prayer is performative; some prayer is between user and God.
- The Friends tier supports trusted-circle sharing. Anti-pressure: not all prayer is for strangers; some is for known confidantes.
- No visibility-based engagement metrics (don't track "private prayers per user"). Per anti-pressure ethos.
- The visibility icon on PrayerCard is informational (lock = "this post is private"), not commercial (no upgrade prompts, no "go premium to make more friends-tier posts").
- Friends-tier posts behave consistently with the existing 7.6 friend-pin: if a Friends post is from a friend AND in last 24h, it pins. The pinning logic is unchanged; visibility is enforced upstream.
- Private posts NEVER pin (the viewer is the author; the post appears in their own feed by default per the author-always-visible predicate).
- Per Gate-G-MH-OMISSION HARD: Mental Health prayers in any tier behave the same. Mental Health is omitted from filter chips but not from visibility-tier surface.

---

## Section 5 — Deferred / Out of Scope

- **Visibility change on edit.** Existing posts cannot have their visibility tier changed (per MPD-8). Future spec could add this with downgrade restrictions (e.g., friends → public is OK; public → private is harder because content already-shared).
- **Per-friend post visibility ("only Sarah can see this").** Out of scope. Three-tier is the design.
- **Block / mute interaction with friends-tier.** A muted friend's friends-tier posts should... still be visible (mute filters from feed but doesn't change underlying visibility)? Or be excluded? Plan-recon notes default leans toward mute-filters-from-discovery, not from underlying visibility. Out of scope for 7.7 but worth thinking about.
- **Group / circle support.** No "Friends + family" or "close friends" tiers.
- **Discoverability of friends-tier posts.** Friends posts don't surface in non-friend searches by design.
- **Reply visibility tier.** Comments inherit post visibility (per R3 default). No separate reply tier.
- **Visibility-tier analytics.** No metrics.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization, presence WARN log noise, composer draft preservation on counselor-page navigation, 7.4's friend-pin ranking question.** All still parked.
- **Multi-language tooltip copy.** Out of scope.
- **Phase 7 cutover** (Spec 7.8). The cutover spec is the NEXT spec after 7.7.

---

## Pipeline Notes

- **`/playwright-recon` (REQUIRED for this spec specifically):** Capture current composer baseline + create a real `friend_relationships` fixture for the end-to-end test. The Playwright AC is mandatory.
- **`/spec-forums`:** Produces the actual spec file at `_specs/forums/spec-7-7.md` from this brief.
- **`/plan-forums`:** Resolves R1–R8. **R4 (endpoint enforcement audit) is the most load-bearing** — plan-recon must enumerate every read endpoint. R1 and R6 are design/copy decisions.
- **`/execute-plan-forums`:** Multi-surface changes:
  - Backend: enforcement audit + any missing predicate composition. Verify `PostSpecifications.visibleTo` matches canonical SQL.
  - Frontend: NEW `VisibilitySelector.tsx`, integration into InlineComposer, signature change for `onSubmit`, call-site updates, PrayerCard visibility-icon display.
  - Tests: backend predicate tests, frontend component tests, integration tests, Playwright e2e.
  - Tracker: list of audited endpoints with visibility-predicate composition status.
- **`/code-review`:** **HIGH-ATTENTION pass.** Specifically check:
  - Gate-G-VISIBILITY-PREDICATE-CORRECTNESS (canonical SQL is faithfully implemented)
  - Gate-G-NO-LEAKAGE (no non-friend can see a friends post anywhere)
  - Gate-G-PRIVATE-NEVER-LEAKED (no non-author can see a private post anywhere)
  - Gate-G-FRIEND-DIRECTION (subquery direction is correct)
  - Gate-G-ENFORCEMENT-EVERY-ENDPOINT (every endpoint uses the predicate)
- **`/verify-with-playwright`:** End-to-end test execution.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.7 stub (master plan lines 6492–6531) — **includes canonical SQL predicate at lines 6504-6519**
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:56-95` — existing `visibleTo` predicate (the canonical SQL implementation)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:18-28,52-54` — load-bearing visibility correctness comments
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:166-176` — `authorActive()` extension pattern reference
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:180-190` — `friendsOf(viewerId)` from 7.4
- `backend/src/main/java/com/worshiproom/post/PostService.java:170,725-729` — visibility enum usage + visibility ordering
- `backend/src/main/java/com/worshiproom/post/PostService.java:311-313` — default-to-PUBLIC on create
- `backend/src/main/java/com/worshiproom/post/PostService.java:717-730` — `isVisibilityUpgrade` helper (referenced for future edit-visibility feature)
- `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` — DTO to verify includes visibility field
- `backend/src/main/java/com/worshiproom/post/CreatePostRequest.java` — DTO accepts visibility() per existing flow
- `frontend/src/components/prayer-wall/InlineComposer.tsx:74-78,179-182,629-633` — composer's current visibility state (none), onSubmit signature, category radiogroup pattern to mirror
- `_plans/forums/spec-7-1-brief.md`, `_plans/forums/spec-7-2-brief.md`, `_plans/forums/spec-7-3-brief.md`, `_plans/forums/spec-7-4-brief.md`, `_plans/forums/spec-7-5-brief.md`, `_plans/forums/spec-7-6-brief.md` — sibling briefs
- Spec 7.8 — Phase 7 Cutover (next spec; 7.7 is the last new-feature spec before cutover)
- Spec 6.6 — Mental Health omission (compatible with visibility tiers; orthogonal concerns)
- Spec 4.6 — anonymous-author affordances (interacts with visibility but doesn't overlap)
- Universal Rule 5 — every post-returning endpoint must use the visibility predicate (load-bearing)
- Universal Rule 13 — crisis-flag suppression contract (orthogonal but related)
- `2026-04-27-009-create-friend-relationships-table.xml` — schema 7.7 depends on
