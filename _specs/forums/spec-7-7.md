# Forums Wave: Spec 7.7 — Privacy Tiers (Public / Friends / Private)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.7 (master plan lines 6492–6531). Size L, Risk High, prerequisites 7.6. Six-AC checklist (composer shows 3-option visibility selector, default is Public, selected visibility persists, backend reads enforce visibility, end-to-end Playwright test, brand voice tooltip review, ≥18 tests). Master plan stub includes the canonical SQL visibility predicate verbatim (lines 6504–6519).

**Brief Source:** `_plans/forums/spec-7-7-brief.md`, authored 2026-05-16 against the live master plan stub + live code recon.

**Spec ID:** `round3-phase07-spec07-privacy-tiers`

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Date:** 2026-05-16

**Phase:** 7 (Cross-Feature Integration) — the seventh and final pre-cutover spec.

**Size:** L

**Risk:** **High** — the only Phase 7 spec rated High. Reasons:

- (a) **Privacy correctness is load-bearing.** A buggy visibility predicate leaks private posts to non-authors or hides friends-only posts from actual friends. The canonical SQL predicate (master plan lines 6504–6519) is the contract; any deviation is a bug.
- (b) **Universal Rule 5 mandates centralization.** Every post-returning endpoint MUST use the same predicate. The recon below shows `PostSpecifications.visibleTo(viewerId)` is the existing centralized predicate. 7.7's enforcement-audit AC requires confirming every endpoint uses it.
- (c) **The composer signature change** (`onSubmit` adding visibility) is a multi-call-site refactor.
- (d) **Friends-tier requires real `friend_relationships` data** — testing `visibility = 'friends'` enforcement requires test fixtures with friend relationships in place.
- (e) **No "private" or "friends" posts existed in production before this spec.** The `visibility` column already exists with default `'public'`, but the composer never exposed the tier choice. Once 7.7 ships, users can actually create private/friends posts and the predicate is exercised in real traffic.

Risk is bounded because: (i) the canonical SQL predicate already exists and is implemented at `PostSpecifications.visibleTo(viewerId)` (lines 57–97); (ii) `PostVisibility` enum and `request.visibility()` flow are wired; (iii) `PostSpecificationsTest` already exists per the JavaDoc reference; (iv) the multi-call-site signature change is mechanical, not subtle; (v) `PostDto.visibility` already exists (see Recon Override Addendum item 1) so the read-side wire shape is already in place.

**Tier:** Standard, but **DEMANDS extra audit care.** The "Backend reads enforce visibility" AC requires plan-recon to enumerate every read endpoint and verify each uses `visibleTo`.

---

## Affected Frontend Routes

- `/prayer-wall` (composer renders visibility selector — primary surface)
- `/prayer-wall/:id` (PrayerDetail's composer in comment/reply mode — see R3 for whether this applies)
- `/prayer-wall/dashboard` (any route mounting InlineComposer)
- `/prayer-wall/user/:id` (any route mounting InlineComposer)

The visibility selector is composer-state-driven. It fires wherever InlineComposer is rendered.

---

## Affected Backend Surfaces

- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` (visibility predicate — verify implementation matches canonical SQL)
- `backend/src/main/java/com/worshiproom/post/PostService.java` (audit every method that returns posts — ensure visibility composed)
- `backend/src/main/java/com/worshiproom/post/PostController.java` (audit endpoints)
- Other services that read posts: `IntercessorService`, `PrayerReceiptService`, `AnsweredFeedCache`, `FriendPrayersService` (7.4-shipped), `AnswerFeed`, `NotificationService` (if it includes post content), etc. — full enumeration in R4.
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java` (verify the existing `visibility` field is correctly mapped — see Recon Override Addendum item 1)
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java` (already has `visibility()` per recon; verify)
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` (verify it sets `visibility` on the outgoing DTO — see Recon Override Addendum item 2)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` (add visibility selector + state)
- `frontend/src/components/prayer-wall/VisibilitySelector.tsx` (NEW component)
- Frontend API client (whatever sends `POST /api/v1/posts` — add `visibility` to the payload)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` (render visibility icon per MPD-10)

---

## STAY ON BRANCH

Same as Phase 6, 7.1–7.6 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection is permitted.

---

## Spec-Time Recon Override Addendum (verified on disk 2026-05-17)

The brief's recon was thorough but a few claims drifted at the line-number level or referred to filenames that don't match the current codebase. These overrides are AUTHORITATIVE — plan-recon should target the names/lines below, not the brief's older values.

**1. DTO filename: `PostDto.java`, NOT `PostResponse.java`.** Same drift Spec 7.6 documented. `backend/src/main/java/com/worshiproom/post/dto/PostResponse.java` does NOT exist on disk. The actual feed-item DTO is `dto/PostDto.java`. A `CreatePostResponse.java` exists but is the create-wrapper, not the feed item DTO. Brief lines 46 and 119 (MPD-7) should be read as referring to `PostDto.java`.

**2. `PostDto` already exposes `visibility` field.** Verified at `dto/PostDto.java:24` — the record signature includes `String visibility`. MPD-7 reframes from "add visibility field" to "verify the existing field is correctly populated by `PostMapper` and surfaced to frontend consumers." The brief's note at MPD-7 ("Plan-recon verifies whether the field already exists; if not, add it") is satisfied positively — it exists. Plan-recon focus shifts to: (a) confirm `PostMapper` writes the field on every code path; (b) confirm the frontend `PostDto` TypeScript type includes the field; (c) confirm `PrayerCard` consumes it.

**3. `PostMapper.java` does NOT currently grep-match on `visibility`.** A targeted grep returned no hit — but this does NOT necessarily mean the field is unmapped. The mapper may set it via constructor positional argument (records). Plan-recon must read `PostMapper.toDto(...)` line by line and confirm the `visibility` slot is populated from `post.getVisibility().value()` (or equivalent). If the slot is unpopulated, the spec adds that mapping — a single-line change.

**4. `isVisibilityUpgrade` is at `PostService.java:784`, `visibilityOrder` is at `:791`.** The brief cited lines 717–730. Line numbers drifted (likely from intervening specs growing PostService). The methods exist and the brief's behavioral description is accurate. The methods are referenced from `updatePost` at `PostService.java:522` (the `isUpgrade` boolean). MPD-8 (visibility-change-on-edit out of scope) is unaffected — the infrastructure exists for a future spec to exercise.

**5. `PostSpecifications.visibleTo(viewerId)` lines are 57–97, NOT 56–95.** Off-by-one drift. The implementation (anonymous viewer disjunction; FRIENDS predicate with friend-relationships EXISTS subquery in the direction `fr.user_id = post author / fr.friend_user_id = viewer`; PRIVATE branch gated by `userId == viewerId`; ownPost branch always matches) is exactly as documented in the brief and exactly matches the canonical SQL predicate at master plan lines 6504–6519.

**6. `PostSpecifications.byActiveFriendsOf(UUID viewerId)` (Spec 7.4) is at lines 193–204, NOT 180–190.** Brief cited 180–190; minor drift. Behavior unchanged — the JavaDoc explicitly references Spec 7.4 and documents the load-bearing subquery direction. Brief's claim that 7.4 added a `friendsOf(viewerId)` predicate is correct in spirit; the actual method name is `byActiveFriendsOf`.

**7. Spec 7.6 prereq satisfied via commit, not yet via tracker.** Tracker (`_forums_master_plan/spec-tracker.md:212`) shows row 98 (Spec 7.6) as ⬜. However, `git log` shows commit `bb38a3f spec-7-6` on the `forums-wave-continued` branch. Per the standard Forums Wave workflow, the tracker is updated post-merge — the commit being on-branch satisfies the prerequisite even though the tracker row hasn't been flipped. No further action needed; this is normal in-progress state.

**8. Universal Rule 5 reference.** The brief invokes "Universal Rule 5 mandates centralization." In the v2.9 master plan, the canonical centralization-of-the-predicate language lives at the Spec 7.7 stub itself (master plan line 6521): *"This predicate is centralized as a JPA Specification or a @Query fragment that every post-returning service composes into its query. A Phase 3.3 acceptance criterion is 'predicate exists in exactly one place; every post-fetching query references it.' Drift here means privacy bugs."* This is the contract Plan-Recon must enforce regardless of which Universal Rule numbering the master plan currently uses. The principle stands.

**9. Composer `onSubmit` is at `InlineComposer.tsx:179`.** Spec 4.2 added `postType` as the 6th positional argument; Spec 4.5 added the scripture pair (positions 7–8); Spec 4.6b added the image pair (positions 9–10); Spec 4.7b added `helpTags` (position 11). 7.7's new `visibility` parameter slots in between `category` (position 3) and `challengeId` (position 4) per MPD-3, OR appends at position 12 — plan-recon picks the position based on grouping clarity. Defaulting to **immediately-after-`category`** keeps the visibility argument adjacent to the other identity-scope arguments. Either choice requires updating every call site.

**10. Category radiogroup pattern verified.** `InlineComposer.tsx:629–633` confirms the pattern: outer `<div role="radiogroup" aria-label="Prayer category">` wrapping `<button role="radio" aria-checked={...} tabIndex={...}>` children with roving tabindex via `getCategoryItemProps(index)`. The visibility selector mirrors this exact pattern with `aria-label="Post visibility"` (3 chips instead of N category buttons).

No other recon overrides. All other brief claims verified.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Visibility selector renders BELOW the category pills, ABOVE the "Submit" button row. Plan-recon verifies the exact position. Visual: small `role="radiogroup"` row with 3 chips (Public / Friends / Private), `aria-label="Post visibility"`, mirroring the existing category-pills pattern at `InlineComposer.tsx:629–633`. Each chip has an icon (Globe / UserGroup / Lock per convention; plan-recon picks final icons) and a label.

**MPD-2.** Default is Public:

- The `selectedVisibility` state defaults to `'public'`
- The visibility chip for Public is selected on mount
- This matches the backend default at `PostService.java:378–380` (the `post.setVisibility(... ?? PostVisibility.PUBLIC)` line)

**MPD-3.** Visibility is passed via the existing `onSubmit` callback signature, EXTENDED:

- Current signature (per recon): `onSubmit(content, isAnonymous, category, challengeId?, idempotencyKey?, postType?, scriptureReference?, scriptureText?, imageUploadId?, imageAltText?, helpTags?)` (11 positional args)
- New signature: add `visibility: PostVisibility` as a new parameter, defaulting to immediately-after-`category` (position 4) — keeps identity-scope arguments grouped
- All call sites that pass `onSubmit` must be updated. Plan-recon enumerates: `PrayerWall.tsx`, `PrayerDetail.tsx` (if applicable per R3), `PrayerWallProfile.tsx`, `PrayerWallDashboard.tsx`, possibly `DailyHubPray` / `PrayTabContent` (if the composer is mounted there)

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
- Verify each composes with `PostSpecifications.visibleTo(viewerId)` per the centralization contract at master plan line 6521
- For each endpoint not currently using the predicate: surface to Eric (may indicate latent bug or a `Divergence` like Spec 3.3 Divergence 1 for `getById` direct lookups)
- The spec's deliverable includes a tracker entry listing all read endpoints and their visibility-predicate composition status

**MPD-7 (revised per Recon Override Addendum items 1, 2, 3).** `PostDto` already includes a `String visibility` field at `dto/PostDto.java:24`. The work is verification + mapping confirmation, NOT addition:

- Plan-recon reads `PostMapper.toDto(...)` line by line and confirms the `visibility` slot is populated from `post.getVisibility().value()` (or equivalent string-form serialization of the enum)
- If the slot is currently `null`-passing or unpopulated: spec adds the single-line mapper change
- Frontend `PostDto` TypeScript type must include `visibility: 'public' | 'friends' | 'private'`
- `PrayerCard` consumes the field per MPD-10

Default UI behavior: display the visibility tier as a subtle icon next to the post timestamp, not a prominent label.

**MPD-8.** No visibility change UI on existing posts (deferred):

- The composer is for NEW posts only
- Editing an existing post's visibility (via `updatePost` endpoint at `PostService.java:397` and the `isVisibilityUpgrade` helper at `:784`) is OUT OF SCOPE for 7.7
- The `isVisibilityUpgrade` helper exists for future use but isn't exercised by 7.7
- Future spec could add visibility-on-edit; not 7.7's territory

**MPD-9.** The "End-to-end Playwright test" AC is taken literally:

- Real browser test: log in as user A, create a Friends post, log out, log in as user B (not friend), verify post is hidden; log in as user C (friend), verify post is visible
- This is the smoke test for the entire system end-to-end
- Plan-recon decides whether 1 Playwright test covers the full matrix or 3 separate tests for the 3 tiers

**MPD-10.** Frontend audit for `PrayerCard` visibility-aware display:

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

- `PostService.listPosts` (main feed) — confirmed using `visibleTo` per 7.6 recon (`:170` principal call site)
- `PostService.findById` (single post detail) — confirmed at line 170 in 7.6 recon
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
- (c) **When the author has any active relationship row for the viewer.** Default mirrors the existing predicate at `PostSpecifications.java:57–97`.

**Default: (c).** Per existing `visibleTo` predicate. The canonical SQL at master plan line 6510–6513 says `fr.user_id = post.user_id AND fr.friend_user_id = :viewer_id AND fr.status = 'active'` — single direction, single row. Plan-recon confirms by reading the actual `PostSpecifications.visibleTo` implementation.

**R6 — Tooltip copy + brand voice (load-bearing).** Per MPD-4 + brand-voice gate. Specifically pick:

- (a) **Long-form tooltip** with explanation: 8–12 words each
- (b) **Short label only**: 3–5 words each (e.g., "Anyone can see this")
- (c) **Icon-only with hover tooltip**: minimum visual weight, info on hover

**Default per MPD-4: (a) longer tooltip.** Privacy is meaningful; users benefit from clarity. Plan-recon refines per brand voice review.

**R7 — Visibility on PrayerCard display.** Per MPD-10:

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
- Author reading own post: ALWAYS visible regardless of tier (per predicate)

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

- **Gate-G-SELECTOR-RENDERS.** Visibility selector with 3 chips renders in InlineComposer below category pills. Test asserts the chip group is present with `role="radiogroup"` and `aria-label="Post visibility"`.
- **Gate-G-DEFAULT-PUBLIC.** Public chip is selected by default on composer mount. Tests assert `selectedVisibility === 'public'` on render.
- **Gate-G-PERSISTENCE.** Submitting with visibility=`'friends'` results in `posts.visibility = 'friends'` in the DB. Backend test verifies.
- **Gate-G-DEFAULT-PUBLIC-PERSISTENCE.** Submitting without explicitly choosing visibility (e.g., `request.visibility() == null`) results in `posts.visibility = 'public'` (default fall-through at `PostService.java:378–380`).
- **Gate-G-VISIBILITY-PREDICATE-CORRECTNESS.** `PostSpecifications.visibleTo(viewerId)` correctly enforces the canonical predicate per master plan lines 6504–6519. Tests cover: anonymous reader / authenticated friend / authenticated non-friend / author themselves for each tier (public/friends/private).
- **Gate-G-FRIEND-DIRECTION.** The `friend_relationships` subquery direction is `fr.user_id = post.user_id AND fr.friend_user_id = :viewer_id` (per existing predicate + canonical SQL). Tests verify reversal does NOT match — i.e., a friend relationship in the wrong direction does NOT make a private post visible.
- **Gate-G-AUTHOR-ALWAYS-VISIBLE.** The author of a private post can always see their own post regardless of tier (predicate `ownPost` branch).
- **Gate-G-ENFORCEMENT-EVERY-ENDPOINT.** Per R4, every post-returning endpoint composes with `visibleTo`. Plan-recon's enforcement audit confirms; spec output includes the tracker entry of audited endpoints.
- **Gate-G-NO-LEAKAGE.** A reader who is NOT a friend MUST NOT see a friends-tier post anywhere (feed, by-ID, notification, search, etc.). Tests cover each surface.
- **Gate-G-PRIVATE-NEVER-LEAKED.** A private post MUST NOT appear in any non-author surface — even if the author has friends. Tests verify.
- **Gate-G-CHIP-ICON-DISPLAY.** PrayerCard renders the appropriate visibility icon per MPD-10. Test asserts.
- **Gate-G-TOOLTIP-BRAND-VOICE.** Tooltips pass brand voice review (R6). Asserted by code review.
- **Gate-G-COMPOSER-SIGNATURE-PROPAGATED.** All `onSubmit` callers updated to handle the new visibility parameter. Verified by code review (no TypeScript errors).
- **Gate-G-DOES-NOT-AFFECT-EDIT.** The `updatePost` endpoint at `PostService.java:397` is NOT changed by this spec (per MPD-8). Code review verifies.
- **Gate-G-PLAYWRIGHT-E2E.** AT LEAST ONE end-to-end Playwright test verifying create-and-enforce cycle per AC.
- **Gate-G-DTO-VISIBILITY-MAPPED.** `PostMapper.toDto(...)` populates the existing `PostDto.visibility` slot from `post.getVisibility().value()` (or equivalent enum-to-string). Backend test asserts the DTO emitted by `GET /api/v1/posts/{id}` includes the field with the correct value.

---

## Section 3 — Tests

Stub minimum is **18** — the highest test minimum of any Phase 7 spec. Realistic count is 24–32. Sketch:

**Backend — `PostSpecifications.visibleTo` predicate (6–8 tests):**

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

**Backend — Endpoint enforcement audit (3–5 tests):**

- For each enumerated endpoint (per R4), one test asserts visibility-predicate composition
- Specifically: feed, by-ID, profile-feed, answered-feed, friend-prayers
- If any endpoint missing predicate per R4, surface; tests cover audit findings

**Backend — Create / Update path (3–4 tests):**

- `createPost` with `request.visibility = 'public'` → persists 'public'
- `createPost` with `request.visibility = 'friends'` → persists 'friends'
- `createPost` with `request.visibility = 'private'` → persists 'private'
- `createPost` with `request.visibility = null` → defaults to 'public' (Gate-G-DEFAULT-PUBLIC-PERSISTENCE)
- `createPost` with invalid visibility string → throws / returns 400

**Backend — Mapper coverage (1 test):**

- `PostMapper.toDto(post)` emits `PostDto.visibility = post.getVisibility().value()` for each of public/friends/private (Gate-G-DTO-VISIBILITY-MAPPED)

**Frontend — VisibilitySelector component (3–4 tests):**

- Renders 3 chips with correct labels (Gate-G-SELECTOR-RENDERS)
- Each chip has correct ARIA role and label (`role="radio"`, `aria-checked`)
- Tooltip text matches MPD-4 / R6 default
- Clicking a chip updates state and invokes onChange

**Frontend — InlineComposer integration (3–4 tests):**

- Visibility selector renders below category pills (MPD-1)
- Default state is Public (Gate-G-DEFAULT-PUBLIC)
- Submitting with visibility=`'friends'` invokes onSubmit with the new parameter
- Switching visibility tier updates selectedVisibility state
- Submitting then re-opening composer: state resets to default Public

**Frontend — PrayerCard visibility icon (2–3 tests):**

- Renders globe (or no) icon for Public
- Renders users icon for Friends
- Renders lock icon for Private
- Per R7 default, icons visible to ALL viewers

**End-to-end Playwright (1–3 tests, per stub AC):**

- One full cycle: log in as user A, create Friends post, log out, log in as user B (non-friend), verify post hidden, log in as user C (friend), verify post visible
- Optional: separate tests for each visibility tier (3 total)
- Optional: test for private post — only author sees, not even friends

Total: ~22–32 tests. Comfortably above the 18 minimum.

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

- **Visibility change on edit.** Existing posts cannot have their visibility tier changed (per MPD-8). Future spec could add this with downgrade restrictions (e.g., friends → public is OK; public → private is harder because content already-shared). The `isVisibilityUpgrade` helper at `PostService.java:784` is the infrastructure for that future spec.
- **Per-friend post visibility ("only Sarah can see this").** Out of scope. Three-tier is the design.
- **Block / mute interaction with friends-tier.** A muted friend's friends-tier posts should... still be visible (mute filters from feed but doesn't change underlying visibility)? Or be excluded? Plan-recon notes default leans toward mute-filters-from-discovery, not from underlying visibility. Out of scope for 7.7 but worth thinking about.
- **Group / circle support.** No "Friends + family" or "close friends" tiers.
- **Discoverability of friends-tier posts.** Friends posts don't surface in non-friend searches by design.
- **Reply visibility tier.** Comments inherit post visibility (per R3 default). No separate reply tier.
- **Visibility-tier analytics.** No metrics.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, `X-RateLimit-*` standardization, presence WARN log noise, composer draft preservation on counselor-page navigation, 7.4's friend-pin ranking question.** All still parked.
- **Multi-language tooltip copy.** Out of scope.
- **Phase 7 cutover** (Spec 7.8). The cutover spec is the NEXT spec after 7.7.

---

## Pipeline Notes

- **`/playwright-recon` (REQUIRED for this spec specifically):** Capture current composer baseline + create a real `friend_relationships` fixture for the end-to-end test. The Playwright AC is mandatory.
- **`/spec-forums`:** Produces this spec file at `_specs/forums/spec-7-7.md`. ✅ done by this invocation.
- **`/plan-forums`:** Resolves R1–R8. **R4 (endpoint enforcement audit) is the most load-bearing** — plan-recon must enumerate every read endpoint. R1 and R6 are design/copy decisions.
- **`/execute-plan-forums`:** Multi-surface changes:
  - Backend: enforcement audit + any missing predicate composition. Verify `PostSpecifications.visibleTo` matches canonical SQL. Confirm `PostMapper` populates `PostDto.visibility`.
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

- `_forums_master_plan/round3-master-plan.md` Spec 7.7 stub (master plan lines 6492–6531) — **includes canonical SQL predicate at lines 6504–6519**
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:57–97` — existing `visibleTo` predicate (the canonical SQL implementation)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:34–55` — load-bearing visibility correctness JavaDoc
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:167–178` — `authorActive()` extension pattern reference (Spec 6.6b)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java:193–204` — `byActiveFriendsOf(viewerId)` from Spec 7.4
- `backend/src/main/java/com/worshiproom/post/PostService.java:378–380` — default-to-PUBLIC on create
- `backend/src/main/java/com/worshiproom/post/PostService.java:784–791` — `isVisibilityUpgrade` + `visibilityOrder` helpers (infrastructure for a future visibility-on-edit spec; NOT exercised here)
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java:24` — existing `visibility` String field on the feed-item DTO (already shipped — confirm mapper populates it)
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java` — accepts `visibility()` per existing flow
- `frontend/src/components/prayer-wall/InlineComposer.tsx:179` — current `onSubmit` positional signature to extend
- `frontend/src/components/prayer-wall/InlineComposer.tsx:629–633` — category radiogroup pattern to mirror
- `_specs/forums/spec-7-1.md`, `_specs/forums/spec-7-2.md`, `_specs/forums/spec-7-3.md`, `_specs/forums/spec-7-4.md`, `_specs/forums/spec-7-5.md`, `_specs/forums/spec-7-6.md` — sibling specs
- Spec 7.8 — Phase 7 Cutover (next spec; 7.7 is the last new-feature spec before cutover)
- Spec 6.6 — Mental Health omission (compatible with visibility tiers; orthogonal concerns)
- Spec 4.6 — anonymous-author affordances (interacts with visibility but doesn't overlap)
- Universal Rule 13 — crisis-flag suppression contract (orthogonal but related)
- `2026-04-27-009-create-friend-relationships-table.xml` — schema 7.7 depends on
- Canonical centralization contract for the visibility predicate — master plan line 6521 (*"predicate exists in exactly one place; every post-fetching query references it. Drift here means privacy bugs"*)
