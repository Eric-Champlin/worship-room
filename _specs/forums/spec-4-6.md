# Forums Wave: Spec 4.6 — Encouragement Post Type

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.6
**ID:** `round3-phase04-spec06-encouragement-post-type`
**Branch:** `forums-wave-continued` (continuation branch — do NOT create a new branch)
**Date:** 2026-05-09

---

## Affected Frontend Routes

The encouragement composer surface is `/prayer-wall`. PrayerCard chrome (rose wash, `Heart` icon) and the InteractionBar's per-type reaction maps (`Heart` icon, 'Send thanks' / 'Remove thanks' aria-labels, '+1 thanks' floating text) propagate to every site that renders a PrayerCard. The 24-hour `notExpired()` query predicate composes at feed sites only — single-post detail still resolves expired encouragements (D17), so bookmarks and shared links continue to work.

- `/prayer-wall` — PrayerWall.tsx (composer + main feed). Production composer entry for encouragement ships in Spec 4.7 (Composer Chooser); 4.6 exposes the variant via the existing `?compose=encouragement` debug query param introduced in earlier Phase 4 specs for `/verify-with-playwright` only.
- `/prayer-wall/:id` — PrayerDetail.tsx (single-card render; expired encouragements still resolve here per D17). CommentsSection NOT mounted for encouragement.
- `/prayer-wall/dashboard` — PrayerWallDashboard.tsx (multiple tabs each render PrayerCard; requires auth).
- `/prayer-wall/user/:id` — PrayerWallProfile.tsx (author profile feed; `notExpired()` composed via `getByAuthor()`).
- `/my-prayers` — MyPrayers.tsx (authenticated user's saved/bookmarked prayers; uses direct `getById()` lookups, so bookmarked expired encouragements continue to render).

All routes except `/prayer-wall/dashboard` and `/my-prayers` are public. There are no new routes; this spec only modifies what already-existing routes render when a post has `postType='encouragement'`. Backend delta: 2 new exception classes, 1 new Specification factory, modifications to existing services. Zero schema changes (per MPD-3 — 24-hour expiry via SQL math, not an `expires_at` column).

---

# Spec 4.6 — Encouragement Post Type

**Master plan ID:** `round3-phase04-spec06-encouragement-post-type`
**Size:** M (rated; effective surface closer to L due to cross-cutting changes — see Section 2)
**Risk:** Medium
**Prerequisites:** 4.5 (Devotional Discussion Post Type) — hard prereq. The per-type chrome system, `composerCopyByType` map, `POST_TYPE_LIMITS`, `successToastByType`, `authModalCtaByType`, `ScriptureChip` decoupled-from-postType pattern, and the chapter-only edge case discipline all exist after 4.5 ships. **4.6 cannot be planned or executed before 4.5 ships.**
**Tier:** xHigh

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout`
- `git checkout -b`
- `git switch`
- `git switch -c`
- `git branch`
- `git commit`
- `git commit -am`
- `git push`
- `git stash`
- `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed (e.g., 'this change should be on its own branch'), surface it as a recommendation in the response and STOP. Eric will execute it manually outside the chat. Do NOT propose autopilot git workflows.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`. Anything that mutates working tree, index, or refs is off-limits.

If Claude Code finds itself thinking 'I should checkout main quickly to verify,' the answer is no. Verify via `git diff main...HEAD -- <path>` instead.

---

## 2. Tier — xHigh

The master plan rated this M. The effective surface area is closer to L because 4.6 introduces FOUR new behavioral patterns the codebase doesn't have yet:

1. **Per-type reaction label and icon** (NEW pattern, partially overrides 4.3's deferral) — `InteractionBar.tsx` currently hardcodes 'Pray', '+1 prayer', and `HandHelping`. 4.6 adds a per-type label/icon map and threads `postType` through the prop chain.
2. **Comments disabled per post type** (NEW pattern) — `PostCommentService.createComment` currently allows comments on any post. 4.6 introduces the first per-type comment-block rejection.
3. **Anonymous disabled per post type** (NEW pattern) — `PostService.createPost` currently allows anonymous on any post. 4.6 rejects `isAnonymous=true` on encouragement.
4. **Per-type expiry via query predicate** (NEW pattern, partially overrides 4.4 MPD-2 deferral) — `PostSpecifications` gets a `notExpired()` factory. No `expires_at` column. Phase 6 still owns the general per-type expiry mechanism; 4.6 ships only encouragement's 24-hour rule via SQL math.

Run at xHigh because:

- The four new patterns each have an explicit anti-pattern CC commonly trips on (W4, W6, W12, W18 cover them)
- Multiple safety / privacy concerns: leaking expired encouragements through any feed is a brand violation; comment-on-encouragement bypassing rejection is a backend invariant violation
- The `notExpired()` Specification's composition sites must be precise — over-composing leaks expired posts to single-post detail (breaks bookmarks); under-composing leaks them to feeds
- The per-type reaction infrastructure sets precedent for testimony's deferred 'Amen' and question's deferred reaction relabeling — getting the abstraction shape right matters

It is not MAX because:

- No new external dependency. No schema migrations. No background jobs.
- No atomic multi-row transactions (resolve-style operations).
- No new auth conditionals (no author-only UI like 4.4's 'this helped' button).
- The expiry mechanism is intentionally simple (SQL math vs columns vs jobs); 4.6 picks the simplest viable implementation.

xHigh + this brief should produce a working spec on the first pass. Override moments listed in Section 14.

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **Encouragement composer variant** at `/prayer-wall` opened with `postType='encouragement'` (reuse the existing debug-query-param mechanism — `?compose=encouragement`):
   - Header copy reads correctly
   - Placeholder copy reads correctly
   - Inline expiry warning visible above the textarea (NEW UX element — see D8)
   - Textarea max attribute is 280
   - CharacterCount transitions from visibleAt=140 → warningAt=240 → dangerAt=270 → max=280
   - Anonymous toggle is HIDDEN entirely (not just disabled — absent from DOM)
   - Category fieldset HIDDEN
   - Challenge checkbox HIDDEN
   - Submit button reads 'Send Encouragement'
   - Submit succeeds with valid content (≤280 chars), POST body has `category: 'other'` and `isAnonymous: false`

2. **Encouragement card chrome** on `/prayer-wall` for any post with `postType='encouragement'`:
   - Soft rose accent applied: `bg-rose-500/[0.04]` and `border-rose-200/10`
   - FrostedCard liquid-glass aesthetic preserved
   - Heart icon next to timestamp (replaces `HandHelping` placeholder per R3)
   - Article aria-label reads `'Encouragement by {authorName}'`
   - Author name always visible (never 'Anonymous' — encouragements are always attributed)

3. **Encouragement card has NO comments UI**:
   - Comment button is ENTIRELY ABSENT from the InteractionBar (not disabled, not zero-count — gone from DOM)
   - The inline `CommentsSection` component is not mounted on encouragement cards
   - The expand-content link target on the InteractionBar's expand affordance does not include comments
   - On `/prayer-wall/:id` (PrayerDetail.tsx), the comments section is also absent
   - `prayer.commentCount` is not rendered anywhere on the card

4. **Encouragement reaction button**:
   - Heart icon (instead of HandHelping)
   - Aria-label reads `'Send thanks for this encouragement (N praying)'` / `'Remove thanks (N praying)'`
   - Floating text on tap reads `'+1 thanks'` (instead of `'+1 prayer'`)
   - The reaction count rendering is unchanged (still shows `(N)`)
   - The data-layer reaction is the same `isPraying` boolean — only the UI labels/icon change (D2)

5. **24-hour expiry behavior**:
   - An encouragement post with `created_at` more than 24 hours ago does NOT appear in the main feed (`/prayer-wall`)
   - The same expired encouragement does NOT appear on the author's profile (`/prayer-wall/user/{userId}`)
   - The same expired encouragement DOES still resolve via direct ID lookup (`/prayer-wall/{id}`) — the post exists, it's just feed-invisible (D17)
   - Expired encouragements DO NOT appear in `?postType=encouragement` filtered queries (notExpired composes BEFORE byPostType)
   - Non-encouragement posts older than 24 hours DO appear normally (the expiry filter is encouragement-specific)

6. **No regression on prayer_request, testimony, question, discussion**:
   - Each existing post type renders with its established chrome, icon, composer copy, reaction label
   - 'Pray' label remains on prayer_request, testimony, question, discussion
   - HandHelping icon remains as the default reaction icon for non-encouragement types
   - Comment buttons remain on non-encouragement post types

7. **Composer-side guards**:
   - In a session where the composer was previously open as `postType='prayer_request'` with `isAnonymous=true`, switching to encouragement clears the anonymous flag (the toggle is removed from the DOM, and the underlying state is reset)
   - User cannot type past 280 characters on encouragement
   - On submit, the auth modal CTA reads `'Sign in to send encouragement'` for unauthenticated users

8. **Backend rejection paths**:
   - `POST /api/v1/posts` with `postType: 'encouragement', isAnonymous: true` returns 400 with code `ANONYMOUS_NOT_ALLOWED` (D16)
   - `POST /api/v1/posts/{encouragementId}/comments` returns 400 with code `COMMENTS_NOT_ALLOWED` (D15)
   - `GET /api/v1/posts/{expiredEncouragementId}` returns 200 with the post data (single-post detail bypasses expiry per D17)
   - `GET /api/v1/posts?postType=encouragement` returns only non-expired encouragements

The Playwright test count for visual verification: minimum 12 scenarios.

---

## 4. Master Plan Divergence

The master plan body for 4.6 lives at `_forums_master_plan/round3-master-plan.md` lines ~4254–4280.

### MPD-1 — Activity engine deferral (mirrors 4.3, 4.4, 4.5)

Encouragement posts emit `ActivityType.PRAYER_WALL` (15 points), same as every other post type. No new activity type. No bonus.

### MPD-2 — Per-type reaction labels and icons partially DELIVERED in 4.6

**This overrides 4.3's deferral of per-type reaction labels to Phase 6.**

Background: 4.3's brief deferred testimony's 'Amen' reaction label to a Phase 6 follow-up (§29 — per-type reaction labels). The reasoning was that 'Praying' reads acceptably on testimony cards even if 'Amen' would be more natural.

Encouragement is different. The post type's whole identity is 'a quick word of life over the community' — using 'Praying' as the reaction label on those cards is semantically broken. 'Thanks' is load-bearing copy.

**4.6's approach: introduce minimal per-type reaction infrastructure, fill in encouragement specifically, leave other types unchanged.**

```typescript
// frontend/src/components/prayer-wall/InteractionBar.tsx (NEW per-type maps)
const REACTION_LABEL_BY_TYPE: Record<PostType, { active: string; inactive: string; floatingText: string }> = {
  prayer_request: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },
  testimony: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },  // unchanged — Phase 6 will switch to 'Amen'
  question: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },   // unchanged
  discussion: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' }, // unchanged
  encouragement: { active: 'Remove thanks', inactive: 'Send thanks', floatingText: '+1 thanks' },
}

const REACTION_ICON_BY_TYPE: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: HandHelping,    // unchanged — Phase 6 may switch to a celebratory icon
  question: HandHelping,     // unchanged
  discussion: HandHelping,   // unchanged
  encouragement: Heart,
}
```

The Phase 6 follow-up §29 (testimony 'Amen', possibly 'Sparkle' icon) and any future per-type changes just update these maps. The infrastructure is now in place.

**Important: data-layer is unchanged.** `is_praying` boolean stays as the single reaction flag. Encouragement reactions are stored as `is_praying = true` rows in `post_reactions`, exactly like every other reaction. The semantic difference ('thanks' vs 'praying') is purely UI-layer. Phase 6 may eventually introduce per-type reaction TYPES at the data layer; that's not 4.6's scope.

**Action for the planner:** the §29 follow-up entry in `_plans/post-1.10-followups.md` (filed by 4.3) gets an UPDATE noting that the per-type label/icon infrastructure shipped in 4.6, and §29 is now the much smaller 'flip testimony to Amen + celebratory icon' entry.

### MPD-3 — 24-hour expiry IMPLEMENTED via query predicate (not via expires_at column)

**This partially overrides 4.4 MPD-2's blanket deferral of expiry to Phase 6.**

Background: 4.4 and 4.5 deferred all expiry mechanisms (expires_at column, expiry job, per-type defaults) to a Phase 6 expiry spec. The reasoning: those types either have no expiry (testimony) or have expiry contingent on resolution (question), and their visibility didn't depend on a working expiry mechanism.

Encouragement is different. Its defining feature is 'fades after 24 hours, non-extendable.' Without an expiry mechanism, encouragement IS just a short prayer_request. The post type loses its identity.

**4.6's approach: implement encouragement-specific expiry via a SQL-side predicate, no column added.**

```java
// backend/src/main/java/com/worshiproom/post/PostSpecifications.java (NEW factory)
public static Specification<Post> notExpired() {
    return (root, query, cb) -> {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusHours(24);
        Predicate isEncouragement = cb.equal(root.get("postType"), PostType.ENCOURAGEMENT);
        Predicate isStale = cb.lessThan(root.get("createdAt"), cutoff);
        Predicate isExpired = cb.and(isEncouragement, isStale);
        return cb.not(isExpired);
    };
}
```

Composed at the two feed sites in `PostService` (R7) — `list()` and `getByAuthor()`. NOT composed at `getById()` (single-post detail).

**Why this is the right call:**

- Zero schema changes. No Liquibase changeset. No migration risk.
- No background jobs. No 'soft-delete after 24 hours' worker that could fail silently.
- The cutoff is computed at query time (`NOW() - INTERVAL '24 hours'`). Always accurate — no clock drift between job runs.
- The post stays in the DB. Bookmarks and saved-prayer references don't 404; the user can still read what they bookmarked.
- Easy to evolve: when Phase 6 ships a general per-type expiry table, the `notExpired()` factory can be replaced with a generic `notExpiredPerType()` that reads from the table. The composition sites stay the same.

**Single-post detail behavior (D17):**

A direct `GET /api/v1/posts/{id}` of an expired encouragement returns 200 with the post data. Reasoning:

- The post exists. It's not deleted, not flagged, not hidden — it just doesn't appear in feeds anymore.
- Bookmarks, saves, and shared URLs to encouragements should still work after 24 hours. A user who bookmarks 'this beautiful encouragement' shouldn't lose access.
- Expiry is about feed VISIBILITY (the 'fade' UX is feed-clutter prevention), not data lifecycle.

If Eric wants harder expiry (404 on direct lookup, full hard-delete after some grace period), that's a Phase 6 enhancement — file a follow-up.

### MPD-4 — Comments disabled is a NEW per-type behavior

The master plan body says: 'Comments are not enabled — the comment count never displays, comment input never renders. Backend validates: 280 char max, no comments allowed (returns 400 if a comment is attempted).'

The codebase has no per-type comment-block precedent. 4.6 introduces the pattern.

**Frontend:** `InteractionBar` conditionally renders the Comment button (D12). `PrayerCard` conditionally mounts `<CommentsSection>` (D13). Neither is replaced with a 'Comments not available on encouragements' message — the absence is intentional; explanation would clutter the UX.

**Backend:** `PostCommentService.createComment` rejects with `CommentsNotAllowedException` (HTTP 400, code `COMMENTS_NOT_ALLOWED`) when the parent post's `postType == ENCOURAGEMENT` (D15).

**Read endpoint:** `GET /api/v1/posts/{encouragementId}/comments` returns an empty list (since no comments exist), no special handling needed. The endpoint stays accessible for forward compat — if a Phase 6 spec ever reverses 'no comments on encouragement', the read path doesn't need re-enabling.

### MPD-5 — Anonymous disabled is a NEW per-type behavior

The master plan body says: 'No anonymous option (the warmth requires attribution).'

The codebase currently treats `isAnonymous` as a per-post boolean toggleable by the user on every post type. 4.6 introduces per-type anonymity rules.

**Frontend:** `InlineComposer` conditionally renders the anonymous toggle. For encouragement, the toggle is absent from the DOM (D9).

**Backend:** `PostService.createPost` rejects with `AnonymousNotAllowedException` (HTTP 400, code `ANONYMOUS_NOT_ALLOWED`) when `postType == ENCOURAGEMENT && isAnonymous == true` (D16).

The rejection is loud, not silent — sending `isAnonymous: true` for encouragement is a contract violation, not a value to coerce. Reasoning: a buggy client that omits the type-check could otherwise silently strip user intent. Better to surface the constraint via 400.

### MPD-6 — Threading deferral remains (mirrors 4.4 MPD-3, 4.5 MPD-3)

Encouragement has no comments at all. Threading is moot. No related work.

### MPD-7 — ScriptureChip naturally absent from encouragement (no scripture reference field on composer)

The `ScriptureChip` component (4.5) renders whenever `prayer.scriptureReference` is set, decoupled from postType. Encouragement composer does NOT include the scripture-reference input (D6.5 — `showScriptureReferenceField: false`), so encouragement posts never have a scripture reference set. The chip naturally never renders on encouragement cards.

No code change needed for this — the existing 4.5 conditional handles it.

---

## 5. Recon Ground Truth (2026-05-08)

### R1 — `post-types.ts` encouragement entry exists

`frontend/src/constants/post-types.ts`:

```typescript
{
  id: 'encouragement',
  label: 'Encouragement',
  pluralLabel: 'Encouragements',
  icon: 'Heart',
  description: 'Speak a word of life over the community.',
  enabled: false,  // ← 4.6 flips this to true
}
```

Icon already chosen as `'Heart'` — matches Lucide. 4.6 flips `enabled` to true.

### R2 — `composerCopyByType` encouragement entry is placeholder copy of prayer_request

`frontend/src/components/prayer-wall/InlineComposer.tsx` (post-4.4 state, expected unchanged through 4.5):

```typescript
encouragement: {
  header: 'Share a Prayer Request',
  placeholder: "What's on your heart?",
  ariaLabel: 'Prayer request',
  submitButton: 'Submit Prayer Request',
  footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
  showCategoryFieldset: true,
  showChallengeCheckbox: true,
  showAttributionNudge: false,
  minHeight: '120px',
},
```

4.6 replaces this entirely. New optional fields added to the `ComposerCopy` type (atop the 4.4-introduced `subline` and 4.5-introduced `showScriptureReferenceField`):

- `showAnonymousToggle?: boolean` (defaults to `true` if absent — preserves existing behavior for prayer_request, testimony, question, discussion)
- `expiryWarning?: string` (NEW — only set for encouragement)
- `submitsAsCategory?: PrayerCategory` (NEW — auto-fills category at submit; only set for encouragement = `'other'`)

The pattern: each new optional UI affordance / behavioral override becomes another optional field on `ComposerCopy`. Same shape as 4.4 (`subline`) and 4.5 (`showScriptureReferenceField`).

### R3 — `PrayerCard.tsx` POST_TYPE_ICONS placeholder

```typescript
const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles,
  question: HelpCircle,
  discussion: MessagesSquare, // 4.5 (assumes 4.5 shipped)
  encouragement: HandHelping, // placeholder until 4.6
}
```

4.6 imports `Heart` from lucide-react alongside existing imports and updates encouragement to `Heart, // 4.6`.

### R4 — `PrayerCard.tsx` chrome switch

After 4.5 ships, the switch covers prayer_request (default), testimony (amber), question (cyan), discussion (violet). Encouragement falls through to default (white wash).

4.6 adds:

```typescript
case 'encouragement':
  return 'rounded-xl border border-rose-200/10 bg-rose-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
```

Removes `'encouragement'` from the fall-through default group.

### R5 — `articleAriaLabel` switch

4.6 adds:

```typescript
case 'encouragement':
  return `Encouragement by ${prayer.authorName}`
```

Note: `authorName` is always real (never 'Anonymous') because anonymous is disabled for encouragement (D9, MPD-5).

### R6 — `PrayerCard.tsx` CommentsSection mount point

PrayerCard renders `<CommentsSection>` (or in some variants, the InteractionBar's `onToggleComments` opens an inline section). The exact mount logic in the current codebase:

The InteractionBar exposes an `isCommentsOpen` boolean and an `onToggleComments` callback. The parent (PrayerCard) holds the state and conditionally renders CommentsSection when open.

4.6's required changes to PrayerCard:

- For encouragement posts, do NOT render CommentsSection at all (regardless of state)
- For encouragement posts, do NOT render the comment-toggle button (this is enforced in InteractionBar; PrayerCard relies on InteractionBar's conditional)
- Pass `postType` prop to InteractionBar (currently inferred via `prayer.postType`)

Plan should verify the exact mount logic of CommentsSection in the current PrayerCard (it may be nested differently in PrayerDetail.tsx vs PrayerWall.tsx feed cards).

### R7 — `PostSpecifications` composition sites in PostService

`backend/src/main/java/com/worshiproom/post/PostService.java`:

- Line 114–118: `list()` method (main feed query) — composes `visibleTo`, `notMutedBy`, `byCategory`, `byPostType`, `byQotdId`. **4.6 adds `notExpired()` here.**
- Line 130–131: `getById()` method (single-post detail) — composes `visibleTo` and id equality only. **4.6 does NOT compose `notExpired()` here** (D17).
- Line 149–151: `getByAuthor()` method (author profile feed) — composes `visibleTo`, `notMutedBy`, `byAuthor`. **4.6 adds `notExpired()` here.**

The composition order matters mostly for query optimizer behavior, not correctness. Place `notExpired()` after `byPostType()` if present (so the type filter narrows first), but the SQL planner will reorder anyway.

### R8 — `PostCommentService.createComment` rejection injection point

`backend/src/main/java/com/worshiproom/post/comment/PostCommentService.java` line 169 (post-Phase 3):

```java
// 3. Parent post existence — live posts only (soft-deleted = 404).
postRepository.findByIdAndIsDeletedFalse(postId)
        .orElseThrow(PostNotFoundException::new);
```

The Post entity is loaded but discarded. 4.6 captures it:

```java
// 3. Parent post existence — live posts only (soft-deleted = 404).
Post parentPost = postRepository.findByIdAndIsDeletedFalse(postId)
        .orElseThrow(PostNotFoundException::new);

// 3a. Per-type comment policy. (NEW in 4.6)
if (parentPost.getPostType() == PostType.ENCOURAGEMENT) {
    throw new CommentsNotAllowedException();
}
```

The rejection happens BEFORE rate-limit consumption (which is step 2 — already executed) but BEFORE crisis detection / sanitization / DB writes. Rate-limit reverse: not worth special-casing. The user paid the rate-limit cost for an invalid request; that's standard.

### R9 — `PostService.createPost` anonymous-rejection injection point

The createPost method has multiple validation steps (idempotency, rate limit, post-type validation, category check, qotdId check, scripture pair check, sanitization, length, crisis). The right place to inject the anonymous-on-encouragement rejection is at the cross-field validation step (Gate 3 in the Phase 3 Addendum), alongside the existing scripture pair check.

```java
// (After scripture pair check at line ~191-195)

// Per-type anonymous policy. (NEW in 4.6)
if (postType == PostType.ENCOURAGEMENT && request.isAnonymous()) {
    throw new AnonymousNotAllowedException(postType.wireValue());
}
```

The exception class is NEW. Add to the post package alongside InvalidScripturePairException.

### R10 — `InteractionBar` component current shape

Per recon read (228 lines, full file). Findings:

- Imports `HandHelping, MessageCircle, Bookmark, Share2, Plus, Check` from lucide-react
- The Pray button hardcodes:
  - `HandHelping` icon (line 110)
  - aria-label: `'Pray for this request (${prayer.prayingCount} praying)'` / `'Stop praying for this request (...)'` (line 105)
  - Floating text: `'+1 prayer'` (line 130)
  - Sound effect: `playSoundEffect('whisper')` (line 60)
- No `postType` prop currently — the component reads `prayer.postType` indirectly via the `prayer` prop, but never branches on it
- The Comment button (line 137-148) is unconditionally rendered

4.6 changes:

1. Add per-type maps `REACTION_LABEL_BY_TYPE` and `REACTION_ICON_BY_TYPE` at module scope
2. In the Pray button, look up label and icon by `prayer.postType`
3. Use the resolved label in aria-label, the resolved icon for `<Icon className="h-4 w-4">`, and the resolved floatingText
4. Wrap the Comment button in `{prayer.postType !== 'encouragement' && (...)}`
5. Sound effect stays `'whisper'` for all types — encouragement reactions still feel like an act of presence, just with different copy

### R11 — `InlineComposer` anonymous toggle render

The current InlineComposer renders the anonymous toggle as part of the form layout (specific line locations vary; plan recon will pin them). The toggle has its own state (`isAnonymous`) and an `onChange` handler.

4.6 changes:

1. Add `showAnonymousToggle?: boolean` to `ComposerCopy` interface (defaults to true)
2. In each existing entry (prayer_request, testimony, question, discussion), the field is omitted (relies on default true)
3. Encouragement entry sets `showAnonymousToggle: false`
4. The toggle is wrapped in `{copy.showAnonymousToggle !== false && (...)}`
5. When the toggle is hidden, force `isAnonymous` state to `false` on entry (a `useEffect` resetting state on postType change handles cross-session leftover state — see W17)

### R12 — `InlineComposer` submit handler shape

The submit handler builds a `CreatePostRequest`-shaped payload. For encouragement, the payload must:

- Include `category: 'other'` (from D18 / `composerCopy.submitsAsCategory`)
- Include `isAnonymous: false` (forced; even if state somehow had `true`)
- Include `challengeId: undefined` (no challenge for encouragement)
- Include `qotdId: undefined`
- Include scripture fields as `undefined` (composer doesn't expose the scripture input for encouragement)
- Include `content: <user's text, ≤280 chars>`
- Include `postType: 'encouragement'`

The payload-building logic is centralized in InlineComposer's submit; 4.6 adds the encouragement branch.

### R13 — `POST_TYPE_LIMITS` encouragement entry

`frontend/src/constants/content-limits.ts`. After 4.5 ships, the map has prayer_request (1000/2000), testimony (5000), question (2000), discussion (2000), and encouragement still at prayer_request defaults (1000).

4.6 updates encouragement to:

```typescript
encouragement: {
  max: 280,
  warningAt: 240,
  dangerAt: 270,
  visibleAt: 140,
},
```

Backend's `maxContentLengthFor(ENCOURAGEMENT)` returns 280. Verify in plan.

The thresholds are scaled to fit 280 — visibleAt at 50%, warningAt at 86%, dangerAt at 96%. The CharacterCount component already supports per-type thresholds.

### R14 — `PrayerWall.tsx` per-type maps

`successToastByType.encouragement` and `authModalCtaByType.encouragement` are placeholders. 4.6 fills them in:

```typescript
successToastByType.encouragement = 'Your encouragement is on the wall. It will fade gently in 24 hours.'
authModalCtaByType.encouragement = 'Sign in to send encouragement'
```

The toast copy nods to the ephemeral nature without making it punitive.

### R15 — Existing exception infrastructure

`PostExceptionHandler` already maps:

- `InvalidPostTypeException` → 400 INVALID_POST_TYPE
- `InvalidScripturePairException` → 400 INVALID_SCRIPTURE_PAIR
- `MissingCategoryException` → 400 MISSING_CATEGORY
- (etc.)

4.6 adds:

- `AnonymousNotAllowedException` → 400 ANONYMOUS_NOT_ALLOWED, message `'Anonymous posting is not allowed for {postType} posts.'`
- `CommentsNotAllowedException` → 400 COMMENTS_NOT_ALLOWED, message `'Comments are not enabled for encouragements.'` (handled in `CommentExceptionHandler`)

### R16 — `Heart` Lucide icon

Standard Lucide. Used for bookmarks ('Like'-style hearts), reactions, etc. Already verified available via post-types.ts:R1 reference. Plan verifies once during recon by importing.

### R17 — Rose palette in Tailwind

Tailwind default palette includes `rose` (rose-50 through rose-950, all opacity stops). Should compile without issue.

Same fallback discipline as 4.3 (amber), 4.4 (cyan), 4.5 (violet): if `bg-rose-500/[0.04]` renders transparent or compilation fails, fall back to `bg-[#f43f5e]/[0.04]` (rose-500 hex) and `border-[#fecdd3]/10` (rose-200 hex).

### R18 — Mock data fixtures

`frontend/src/mocks/prayer-wall-mock-data.ts` (or whatever the path is — verify in plan). 4.6 adds:

- 1 encouragement fixture, recent (created within 24 hours) — appears in feeds
- 1 encouragement fixture, expired (created >24 hours ago) — only resolves via direct ID lookup
- 1 encouragement fixture authored by mock-current-user — exercises 'author sees own expired' (which we DECIDED against — D17 — feeds exclude even for the author)
- All encouragement fixtures have `isAnonymous: false`, `commentCount: 0`, `category: 'other'`

### R19 — Existing `notExpired()` does NOT exist

A grep of `PostSpecifications.java` for `notExpired` should return zero matches before 4.6 runs. If anything exists with that name, recon is wrong — abort.

```bash
grep -n 'notExpired\|expires_at\|expiresAt' backend/src/main/java/com/worshiproom/post/PostSpecifications.java
# Should return zero matches in 4.6 starting state.
```

### R20 — `_plans/post-1.10-followups.md` updates needed

After 4.5 files (or skips) the per-type expiry follow-up, 4.6 needs to:

- UPDATE the §29 entry (per-type reaction labels, originally filed by 4.3): note that the per-type label/icon infrastructure shipped in 4.6 with encouragement; §29 is now reduced to 'flip testimony to Amen + sparkle icon'
- UPDATE the per-type expiry entry (filed by 4.4 or 4.5): note that encouragement's 24-hour expiry shipped in 4.6 via `notExpired()` Specification; the remaining work is generalizing to a per-type expiry table for question/discussion if Phase 6 chooses to add expiry to those

If neither §29 nor the expiry entry exist by the time 4.6 runs, 4.6 files them with the correct framing.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

| # | Gate | Applies to 4.6? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check (createPost) | Applies (unchanged) | Encouragement createPost goes through the same idempotency contract |
| 2 | Rate-limit consumption order | Applies (unchanged) | Existing PostsRateLimitService applies to encouragement creation |
| 3 | Cross-field validation | **Applies — extended** | New rule: `postType == ENCOURAGEMENT && isAnonymous == true` → AnonymousNotAllowedException. Placement: AFTER scripture pair check, BEFORE sanitization |
| 4 | HTML sanitization BEFORE length check | Applies (unchanged) | Encouragement content sanitized like any other |
| 5 | Length check after sanitization | **Applies — narrower limit** | maxContentLengthFor(ENCOURAGEMENT) returns 280; ContentTooLongException message includes '280' |
| 6 | Crisis detection on sanitized content | Applies (unchanged) | Encouragements subject to crisis detection |
| 7 | AFTER_COMMIT crisis event publishing | Applies (unchanged) | No 4.6-specific changes |
| 8 | Activity recording (PRAYER_WALL ActivityType) | Applies (unchanged) per MPD-1 | Encouragement creation emits PRAYER_WALL activity |
| 9 | EntityManager refresh for DB defaults | Applies (unchanged) | Save-then-refresh pattern unchanged |
| 10 | Logging IDs only (no content) | Applies (unchanged) | No new logging for 4.6 |
| 11 | `ContentTooLongException` error code/message contract | **Applies — message updated** | The message includes the type-specific limit ('280 character limit' for encouragement). Pattern matches 4.3's per-type message handling |
| 12 | JSR-303 enforcement BEFORE service-layer rules | Applies (unchanged) | content `@Size(max=2000)` already covers ≤280 (more permissive at the JSR layer; service narrows) |
| 13 | PostType wire-format ↔ Java enum drift sync | Applies (unchanged) | encouragement enum value already exists |

**New addendum gate introduced by 4.6: Per-type comment policy enforcement at PostCommentService.**

`PostCommentService.createComment` now rejects comments on encouragement posts BEFORE doing any further work (parent comment validation, sanitization, crisis detection). The rejection happens at step 3a (right after parent post existence check). Reasoning: cheaper to reject early; the comment content was never going to be persisted.

**Test surface for the new gate:**
- Create comment on prayer_request → 200
- Create comment on testimony → 200
- Create comment on question → 200
- Create comment on discussion → 200
- Create comment on encouragement → 400 COMMENTS_NOT_ALLOWED
- Reply (with parentCommentId) on encouragement → 400 COMMENTS_NOT_ALLOWED (rejection precedes parent validation)

---

## 7. Decisions and divergences

### D1 — Activity engine deferral (mirrors prior)

Already covered.

### D2 — Reaction label and icon: 'Send thanks' / 'Remove thanks' / `Heart` / '+1 thanks'

Per MPD-2.

**Rejected alternatives:**
- 'Amen' for encouragement reaction. Considered. Rejected because 'Amen' lands better as a celebratory affirmation (testimony Phase 6 use), whereas 'Thanks' is a quieter acknowledgment that matches encouragement's brand of warmth without amplification.
- 'Like' / heart icon with no label. Rejected — 'Like' is FB-shaped, not Worship Room-shaped.
- A separate reaction TYPE at the data layer (`is_thanks` vs `is_praying`). Rejected for 4.6 — adds DB schema work without UI benefit; the current single-flag model is sufficient. Phase 6 may revisit if multi-reaction-per-post becomes needed.

### D3 — Reaction sound effect stays 'whisper' for encouragement

The `playSoundEffect('whisper')` call stays for all post types including encouragement. Reasoning: the whisper sound is a soft acknowledgment that fits both 'I'm praying for this' and 'thanks for this kind word.' Adding a per-type sound switch would be over-engineering for a polish item.

If Eric wants a distinct sound for encouragement (e.g., a soft chime), that's a Phase 6 audio polish item.

### D4 — Floating animation text: '+1 thanks'

The InteractionBar's floating text on tap reads `'+1 thanks'` for encouragement. Matches the reaction label semantics. The animation timing and styling are unchanged.

### D5 — Chrome wash: rose

```typescript
case 'encouragement':
  return 'rounded-xl border border-rose-200/10 bg-rose-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
```

Rose is the warm-pink end of the spectrum — soft, comforting, gift-adjacent. Not as fiery as red, not as decorative as pink. Matches the 'gentle word of life' brand of encouragement.

**Rejected alternatives:** pink (too saccharine), peach (too pale on dark theme), red (too urgent / alarm-coded), salmon (not in Tailwind palette).

### D6 — Heart icon for both card type-marker AND reaction

```typescript
// In POST_TYPE_ICONS:
encouragement: Heart, // 4.6 — was HandHelping placeholder

// In REACTION_ICON_BY_TYPE:
encouragement: Heart,
```

Same icon in two places. Reasoning: the encouragement post type IS the heart of the brand — using the same icon for the type-marker and the reaction reinforces the identity. The visual repetition doesn't feel cluttered because the contexts are clear (one is in the header next to timestamp, the other is the action affordance).

### D6.5 — Composer does NOT include scripture reference field

Encouragement composer omits the scripture-reference UX (introduced by 4.5 for discussion). `composerCopyByType.encouragement.showScriptureReferenceField: false` (or absent — defaults to false).

Reasoning: encouragements are short, conversational, immediate. Adding a scripture pairing affordance would add friction that contradicts the post type's 'low-friction' goal. If a user wants to attach scripture to a longer reflection, that's what discussion or testimony is for.

### D7 — 280-char limit (NEW)

```typescript
// frontend/src/constants/content-limits.ts
encouragement: {
  max: 280,
  warningAt: 240,
  dangerAt: 270,
  visibleAt: 140,
},

// backend/src/main/java/com/worshiproom/post/PostService.java
private static int maxContentLengthFor(PostType type) {
    return switch (type) {
        case TESTIMONY -> 5000;
        case ENCOURAGEMENT -> 280;
        default -> 2000;
    };
}
```

The 280 number comes from the master plan body. It's a deliberate echo of the original Twitter character limit — short enough to discipline the user toward a single thought, long enough to express warmth. CharacterCount thresholds scaled proportionally.

### D8 — Composer expiry warning copy

Inline warning rendered above the textarea (NEW UX element):

> 'Encouragements gently fade after 24 hours. Say what is on your heart and let it go.'

Wrapped in a soft callout (rose-tinted background, small font, with a clock icon — Lucide `Clock`):

```typescript
{copy.expiryWarning && (
  <div className='mb-3 flex items-start gap-2 rounded-md bg-rose-500/10 p-3 text-xs text-rose-200/90'>
    <Clock className='mt-0.5 h-3.5 w-3.5 flex-shrink-0' aria-hidden='true' />
    <p>{copy.expiryWarning}</p>
  </div>
)}
```

The copy is direct, warm, and gives a permission ('let it go') rather than a warning. Nothing punitive.

**Rejected alternatives:**
- 'Encouragements expire after 24 hours.' (Too transactional. 'Expire' is contractual language; 'fade' is brand-coherent.)
- 'Quick! Say it before it's gone.' (Urgency anti-pattern.)
- No warning, just the 24-hour limit silently enforced. (Surprises users when their post disappears.)

### D9 — Anonymous toggle hidden (frontend)

`composerCopyByType.encouragement.showAnonymousToggle: false`

The toggle is absent from the DOM. The underlying `isAnonymous` state is force-reset to `false` whenever postType changes to encouragement (W17).

### D10 — Category fieldset hidden, auto-fills 'other'

`composerCopyByType.encouragement.showCategoryFieldset: false`
`composerCopyByType.encouragement.submitsAsCategory: 'other'`

The composer auto-fills `category: 'other'` at submit time. `'other'` is in `VALID_CATEGORIES` (PostController line 56), so backend accepts.

The master plan body says: 'No category required (defaults to other).' The required-category check in PostService.createPost (lines ~183-186) covers `(PRAYER_REQUEST || DISCUSSION) && category == null`. ENCOURAGEMENT is not in the required set, so omitting category would also be fine. But explicitly setting `'other'` keeps DB rows uniform (every post has a category) and matches existing test patterns.

### D11 — Challenge checkbox hidden

`composerCopyByType.encouragement.showChallengeCheckbox: false`

Encouragements are not part of the daily prayer challenge.

### D12 — Comment button hidden in InteractionBar

```typescript
{prayer.postType !== 'encouragement' && (
  <button type="button" onClick={onToggleComments} ...>
    <MessageCircle className="h-4 w-4" aria-hidden="true" />
    <span>({prayer.commentCount})</span>
  </button>
)}
```

**Rejected alternative:** disabled-but-visible button with tooltip 'Comments not enabled for encouragements.' Rejected because it advertises a UX path that doesn't exist; absence is cleaner.

### D13 — CommentsSection never renders for encouragement (PrayerCard)

```typescript
{prayer.postType !== 'encouragement' && (
  <CommentsSection
    prayerId={prayer.id}
    isOpen={isCommentsOpen}
    comments={comments}
    totalCount={prayer.commentCount}
    onSubmitComment={handleSubmitComment}
    prayerContent={prayer.content}
  />
)}
```

Same on PrayerDetail.tsx — no comments section for encouragement.

### D14 — Comment count never renders on encouragement cards

The `prayer.commentCount` is rendered inside the comment button (per InteractionBar). Hiding the button (D12) hides the count. No additional changes needed.

If commentCount is rendered anywhere else on the card (e.g., in a header summary), 4.6 hides it for encouragement. Plan recon verifies.

### D15 — Backend rejects comments via CommentsNotAllowedException

```java
// New exception class
package com.worshiproom.post.comment;

public class CommentsNotAllowedException extends RuntimeException {
    public CommentsNotAllowedException() {
        super("Comments are not enabled for encouragements.");
    }
}

// CommentExceptionHandler addition
@ExceptionHandler(CommentsNotAllowedException.class)
public ResponseEntity<ProxyError> handle(CommentsNotAllowedException ex, ...) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
        new ProxyError("COMMENTS_NOT_ALLOWED", ex.getMessage(), requestId)
    );
}
```

Plan verifies the exact error response shape used by other handlers in the package (the codebase has its own conventions).

### D16 — Backend rejects anonymous-on-encouragement via AnonymousNotAllowedException

```java
// New exception class
package com.worshiproom.post;

public class AnonymousNotAllowedException extends RuntimeException {
    private final String postType;
    public AnonymousNotAllowedException(String postType) {
        super(String.format("Anonymous posting is not allowed for %s posts.", postType));
        this.postType = postType;
    }
    public String getPostType() { return postType; }
}

// PostExceptionHandler addition
@ExceptionHandler(AnonymousNotAllowedException.class)
public ResponseEntity<ProxyError> handle(AnonymousNotAllowedException ex, ...) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
        new ProxyError("ANONYMOUS_NOT_ALLOWED", ex.getMessage(), requestId)
    );
}
```

The exception carries the `postType` for future tooling that may surface per-type policy errors differently.

### D17 — `notExpired()` Specification: feed-only composition

Per MPD-3 / R7. `notExpired()` is composed at:

- `PostService.list()` (line 114-118)
- `PostService.getByAuthor()` (line 149-151)

NOT at:

- `PostService.getById()` (line 130-131) — direct ID lookup bypasses expiry
- Anywhere else (e.g., bookmark lookups, search results — verify in plan that these don't compose visibility predicates differently)

**Rejected alternative:** compose `notExpired()` at single-post detail, returning 404 for expired encouragements. Rejected because:
- Bookmarks and shared URLs become broken links after 24h
- Saved prayers (which include the encouragement reference) would 404 instead of rendering
- The expiry concept is feed-clutter prevention, not data lifecycle

### D18 — Auto-fill `category: 'other'` at composer submit

Per D10. The composer's submit handler reads `composerCopyByType[postType].submitsAsCategory` and uses that value if defined, else uses the user-selected category from the fieldset.

```typescript
const submitCategory = copy.submitsAsCategory ?? category
const payload = {
  // ...
  category: submitCategory,
  // ...
}
```

### D19 — Auto-set `isAnonymous: false` at composer submit (defense in depth)

Even though the toggle is hidden (D9), the submit handler explicitly sets `isAnonymous: false` for encouragement, regardless of any prior state:

```typescript
const submitIsAnonymous = postType === 'encouragement' ? false : isAnonymous
```

Belt-and-suspenders against state leakage from a prior open-and-close cycle of the composer.

### D20 — Composer minHeight: 100px (smaller — encouragements are short)

`composerCopyByType.encouragement.minHeight: '100px'`

Smaller than prayer_request (120px), question (120px), discussion (160px), testimony (180px). Encouragements are quick. The smaller min-height signals 'short message expected' visually.

### D21 — Toast and auth modal copy

```typescript
successToastByType.encouragement = 'Your encouragement is on the wall. It will fade gently in 24 hours.'
authModalCtaByType.encouragement = 'Sign in to send encouragement'
```

Toast nods to the ephemeral nature without dwelling on it. 'Fade gently' echoes the composer warning's 'gently fade' for consistency.

### D22 — Header copy: 'Send encouragement'

```typescript
encouragement: {
  header: 'Send encouragement',
  placeholder: 'A quick word of life. Anything that comes to mind.',
  ariaLabel: 'Encouragement',
  submitButton: 'Send Encouragement',
  footerNote: 'Your encouragement will be shared with the community. Be kind and respectful.',
  expiryWarning: 'Encouragements gently fade after 24 hours. Say what is on your heart and let it go.',
  showCategoryFieldset: false,
  showChallengeCheckbox: false,
  showAnonymousToggle: false,
  showAttributionNudge: false,
  showScriptureReferenceField: false,
  submitsAsCategory: 'other',
  minHeight: '100px',
}
```

'Send' verb (not 'Share' / 'Post' / 'Submit' for the user-facing header) — matches the 'a word OVER the community' framing from the master plan body. The submit button keeps 'Send Encouragement' for parity with submit conventions.

---

## 8. Watch-fors

### W1 — 4.5 must ship before 4.6 starts

Verify in tracker that 4.5 is ✅. Verify on disk:

- `composerCopyByType.discussion` has full discussion entries (not placeholders)
- `ScriptureReferenceInput.tsx` and `ScriptureChip.tsx` exist
- `PrayerCard` has the violet wash for discussion

If 4.5 hasn't shipped, STOP.

### W2 — Don't add `expires_at` column

Per MPD-3. The 24-hour expiry is implemented via SQL math in `notExpired()`. No schema delta. If CC's plan or execution touches Liquibase, abort.

### W3 — Don't compose `notExpired()` at `getById()` (single-post detail)

Per D17. Composing it there would 404 expired encouragements on direct ID lookup, breaking bookmarks/saves/shared URLs. The composition is intentional to feed query sites only.

CC sometimes 'helpfully' applies the predicate uniformly. Push back during /code-review.

### W4 — Don't introduce a new ActivityType for encouragement

Per MPD-1. Keep using `ActivityType.PRAYER_WALL` for encouragement creation. No `ENCOURAGEMENT_SENT` ActivityType. No bonus points.

### W5 — Don't refactor the entire reaction system around per-type types

Per D2 / MPD-2. The data layer stays single-flag (`is_praying` boolean). 4.6's per-type changes are UI-layer only — labels, icons, floating text. CC sometimes over-engineers and proposes a `reaction_type` enum column. That's Phase 6 territory if needed at all.

### W6 — Don't disable the comment button (render it as disabled with a tooltip)

Per D12. The button is ENTIRELY ABSENT from the DOM, not disabled. CC sometimes renders a disabled button with `'Comments not enabled for encouragements'` tooltip — that advertises a path that doesn't exist.

### W7 — Don't add a 'Comments disabled' message to the card

Per D13. The CommentsSection is unmounted; nothing replaces it. No 'Comments are turned off for this post' notice. The absence is intentional UX.

### W8 — Don't render the comment count anywhere on encouragement cards

Per D14. `prayer.commentCount` should be 0 for encouragement (no comments ever exist), but defensively, hide the count display anywhere it shows up.

### W9 — Don't allow `isAnonymous: true` to slip through the frontend submit for encouragement

Per D19. Even though the toggle is hidden, the submit handler force-sets `isAnonymous: false` for encouragement. Belt-and-suspenders.

### W10 — Don't silently coerce isAnonymous to false on the backend

Per D16 / MPD-5. The backend THROWS when `postType=encouragement && isAnonymous=true`. It does NOT silently coerce. Reasoning: a buggy client should get a loud 400, not silent acceptance that hides the contract violation.

### W11 — Don't expose internal `is_anonymous` filtering in the public API

The `isAnonymous` field on responses stays as-is. 4.6 just adds creation-time validation. No changes to read-side handling.

### W12 — Don't write the same comment-rejection logic in two places

The check happens in `PostCommentService.createComment` (backend) AT step 3a. It does NOT also live in:
- The CommentController (which delegates to the service)
- Some new aspect/interceptor
- The frontend (which silently does not call the API for encouragement comments because the button doesn't render)

Single source of truth for the policy: PostCommentService. Frontend's not rendering the button is a UX nicety, not a duplicate enforcement.

### W13 — Don't break existing comment writes on non-encouragement posts

The reject is gated on `parentPost.getPostType() == PostType.ENCOURAGEMENT`. If CC writes the check as a positive list (`if (postType IN [PRAYER_REQUEST, TESTIMONY, QUESTION, DISCUSSION])`), they'd accidentally lock out future post types. Use the negative list pattern.

### W14 — Don't apply expiry to non-encouragement post types

Per MPD-3 / D17. The `notExpired()` predicate ONLY applies to encouragement (`isEncouragement = postType == ENCOURAGEMENT`). If CC's implementation drops the postType filter and broadly excludes posts older than 24h, that breaks every other post type's feed visibility.

The Specification's predicate structure:

```java
Predicate isExpired = cb.and(isEncouragement, isStale);
return cb.not(isExpired);
```

`cb.not(cb.and(A, B))` = NOT (A AND B) = (NOT A) OR (NOT B) = (NOT encouragement) OR (NOT stale). Both prayer_request posts and recent encouragements pass. Only old encouragements are filtered.

If CC writes `cb.not(isStale)` (unconditionally), every post older than 24h is hidden. Big regression.

### W15 — Don't introduce a 'restore expired encouragement' admin path

Encouragement is non-extendable per the master plan body. No undo. No 'pin this encouragement' override. If a user really wants their content to persist, they should use a different post type. Don't add admin tooling for this in 4.6.

### W16 — Don't change the `postType` enum's wire-format value

`encouragement` is the wire-format value. The enum drift test (4.1's contract) catches changes. Don't 'improve' this to camelCase or some other casing.

### W17 — Reset `isAnonymous` state on postType change to encouragement

Per D9 / D19. If a user opens the composer as `postType='prayer_request'` with `isAnonymous=true`, then switches to `postType='encouragement'` (via the Composer Chooser in a future spec, or via debug query param), the toggle disappears but the state could be stale.

Add a `useEffect`:

```typescript
useEffect(() => {
  if (postType === 'encouragement' && isAnonymous) {
    setIsAnonymous(false)
  }
}, [postType])
```

OR simpler: recompute the submit payload to force `isAnonymous=false` for encouragement (D19), without touching the underlying state. Both work; the submit-time recompute is less surprising.

### W18 — Don't break the `successToastByType.encouragement` lookup when post creation fails

The toast displays only on successful creation. If the backend returns 400 (e.g., AnonymousNotAllowedException due to a frontend bug), the toast must NOT display. Standard error-handling — but verify the `onSubmit` boolean return path is plumbed correctly.

### W19 — Don't introduce 'rose' as a prayer category in the UI

Same pattern as 4.5's W20 (don't introduce 'discussion' as a category). The rose chrome is just visual styling, not a category tag. CategoryBadge / CategoryFilterBar don't render 'rose' or 'encouragement' as a filterable category.

### W20 — Don't auto-open the composer for new users with `postType='encouragement'`

The composer's default postType is 'prayer_request'. If 4.7 (Composer Chooser) ships before 4.7 expectations, encouragement opens through the chooser. 4.6 itself doesn't change the default open behavior.

### W21 — Don't invent a special 'fade-out' animation on the card when expiry approaches

Per master plan body. The expiry is a feed-visibility filter, not a visual effect. Cards either render or don't. Adding an opacity gradient based on `created_at` proximity to the cutoff is over-engineering.

### W22 — Don't break the `useSoundEffects()` hook for non-encouragement types

Per D3. The sound effect stays `'whisper'` for all types. Don't add per-type sound mapping. Phase 6 audio polish if needed.

### W23 — Don't apply the rose chrome based on `postType` ALONE in any other place

The rose styling (`bg-rose-500/[0.04]`) lives in the chrome switch in PrayerCard.tsx. Don't accidentally tint the InteractionBar pulse animation, the comment input, or the auth modal in rose. Each subcomponent has its own styling; postType drives the OUTER chrome only.

### W24 — Don't render `<ScriptureChip>` on encouragement cards

Per MPD-7. The chip's existing `{prayer.scriptureReference && ...}` conditional handles this naturally because encouragements never have a scripture reference. But: if CC mistakenly populates `scriptureReference` from somewhere on encouragement posts (e.g., via mock data with copy-paste error), the chip would render incongruously.

Mock data fixtures for encouragement explicitly leave `scriptureReference: undefined`. Verify in plan.

### W25 — Don't leak expired encouragements via search

If the backend has a search endpoint (or Phase 6 adds one), `notExpired()` should compose at search query sites too. Plan verifies whether a search endpoint currently exists; if it does, add the composition.

If no search endpoint exists in 4.6's starting state, this is a forward-compatibility note, not a 4.6 deliverable.

### W26 — Don't break encouragement creation when the user's session has stale state

A common bug: composer opens with prayer_request defaults, user switches to encouragement, user types content, submits. The submit reads `category` state (which may have been set when the fieldset was visible for prayer_request) — if the auto-fill (D18) takes precedence correctly, this works; if `category` is read directly from form state, it could leak prayer_request's selection.

The submit logic must use `copy.submitsAsCategory ?? category`. If `submitsAsCategory` is set (encouragement), it overrides the fieldset selection. Verify this path during /code-review.

### W27 — Don't trust the bookmark / save UI to gracefully handle expired encouragements

A user who bookmarked an encouragement before it expired should still see it in `/my-prayers` (which uses `getById` for each saved prayer — direct ID lookup bypasses notExpired per D17). Verify in plan that the saved-prayers fetch path uses direct ID lookups, not feed queries.

If saved-prayers uses a feed query (it shouldn't, but verify), expired encouragements would disappear from the user's saved list — bad UX.

### W28 — Don't compose notExpired() at the wrong layer

The Specification is composed at the Spring `Specification<Post>` chain inside PostService. Don't move the cutoff calculation to the SQL repository (`@Query` annotation with parameterized cutoff) or to the controller. The Specification factory pattern is well-established; stay in it.

### W29 — Don't add a 'this encouragement has expired' UI when accessed via direct ID

A user who clicks a stale shared URL to an expired encouragement gets the post (200 OK per D17). They see the content normally. Don't add a 'this encouragement has expired' banner on the detail page — the user's intent is to read the content, and the content is fine.

If we wanted to indicate ephemerality on the detail page, that's a Phase 6 decoration; not 4.6.

### W30 — Don't re-render the InteractionBar entirely when postType changes

The per-type maps are looked up at render time, not stored as state. CC sometimes adds `useMemo` or `useState` around the lookups, which is overkill. The maps are O(1) constant-time lookups; render cost is negligible.

### W31 — Don't conflate REACTION_LABEL_BY_TYPE with the toast/auth-modal maps

The reaction maps live in `InteractionBar.tsx` (component-scoped). The toast and auth-modal CTA maps live in `PrayerWall.tsx` (page-scoped). Don't try to consolidate them into a single `postTypeMetadata` mega-map — they have different scopes, different consumers, and different lifecycles.

### W32 — Don't auto-clear the user's typed content when they switch postType

If a user has typed content as a prayer_request (say, 1500 chars), then switches to encouragement (max 280), the content does NOT auto-truncate. It would feel destructive.

The submit will fail validation (over 280 chars), and the user can manually shorten. The CharacterCount component will show the over-limit state.

### W33 — Don't break the existing PostType drift test

4.1's contract test asserts that POST_TYPES (frontend) matches PostType (backend). 4.6 doesn't add or remove enum values — encouragement was already there. The test continues to pass.

---

## 9. Test specifications

Target: ~38 tests across frontend + backend. Master plan AC says ≥14 — the surface justifies more.

### Frontend tests

**`frontend/src/constants/__tests__/post-types.test.ts`** (UPDATE — flip encouragement enabled):

```typescript
it('all 5 post types are enabled', () => {
  expect(getPostType('prayer_request').enabled).toBe(true)
  expect(getPostType('testimony').enabled).toBe(true)
  expect(getPostType('question').enabled).toBe(true)
  expect(getPostType('discussion').enabled).toBe(true)
  expect(getPostType('encouragement').enabled).toBe(true)
})

it('no post types are disabled (Phase 4 complete)', () => {
  const disabled = POST_TYPES.filter(t => !t.enabled)
  expect(disabled).toEqual([])
})
```

**`frontend/src/constants/__tests__/content-limits.test.ts`** (UPDATE):

```typescript
it('encouragement limits are 280 (short-form)', () => {
  expect(POST_TYPE_LIMITS.encouragement.max).toBe(280)
  expect(POST_TYPE_LIMITS.encouragement.warningAt).toBe(240)
  expect(POST_TYPE_LIMITS.encouragement.dangerAt).toBe(270)
  expect(POST_TYPE_LIMITS.encouragement.visibleAt).toBe(140)
})
```

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE — add 6 tests):

```typescript
describe('PrayerCard — encouragement chrome', () => {
  it('renders rose chrome when postType is encouragement', () => {
    const enc = createMockPrayer({ postType: 'encouragement' })
    render(<PrayerCard prayer={enc} />)
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-rose-500/[0.04]')
    expect(article.className).toContain('border-rose-200/10')
  })

  it('renders Heart icon for encouragement type marker', () => {
    // Verify Heart SVG / lucide-heart class appears
  })

  it('aria-label says "Encouragement by {authorName}"', () => {
    const enc = createMockPrayer({ postType: 'encouragement', authorName: 'Sarah' })
    render(<PrayerCard prayer={enc} />)
    expect(screen.getByLabelText('Encouragement by Sarah')).toBeInTheDocument()
  })

  it('does NOT mount CommentsSection for encouragement', () => {
    const enc = createMockPrayer({ postType: 'encouragement', commentCount: 0 })
    render(<PrayerCard prayer={enc} />)
    expect(screen.queryByText(/comments/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/write a comment/i)).not.toBeInTheDocument()
  })

  it('mixed feed renders correct chrome for all 5 types', () => {
    // Verifies no chrome bleed across types
  })

  it('encouragement card never displays comment count', () => {
    const enc = createMockPrayer({ postType: 'encouragement', commentCount: 0 })
    render(<PrayerCard prayer={enc} />)
    expect(screen.queryByText('(0)')).not.toBeInTheDocument()  // (or however count displays)
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/InteractionBar.test.tsx`** (UPDATE — add 8 tests):

```typescript
describe('InteractionBar — encouragement variant', () => {
  it('renders Heart icon (not HandHelping) when postType is encouragement', () => {
    const enc = createMockPrayer({ postType: 'encouragement' })
    render(<InteractionBar prayer={enc} reactions={undefined} ... />)
    // Assert Heart svg class
  })

  it('reaction button label reads "Send thanks" when not yet praying', () => {
    const enc = createMockPrayer({ postType: 'encouragement', prayingCount: 0 })
    render(<InteractionBar prayer={enc} reactions={undefined} ... />)
    expect(screen.getByLabelText(/Send thanks for this encouragement/)).toBeInTheDocument()
  })

  it('reaction button label reads "Remove thanks" when already praying', () => {
    const enc = createMockPrayer({ postType: 'encouragement', prayingCount: 5 })
    const reactions = { isPraying: true, isBookmarked: false, isCandle: false }
    render(<InteractionBar prayer={enc} reactions={reactions} ... />)
    expect(screen.getByLabelText(/Remove thanks/)).toBeInTheDocument()
  })

  it('floating text reads "+1 thanks" on tap for encouragement', async () => {
    // Animate the click, assert floating text content
  })

  it('floating text reads "+1 prayer" on tap for prayer_request', async () => {
    // Verify non-encouragement types unchanged
  })

  it('comment button is ABSENT from DOM for encouragement', () => {
    const enc = createMockPrayer({ postType: 'encouragement' })
    render(<InteractionBar prayer={enc} reactions={undefined} ... />)
    expect(screen.queryByLabelText(/Comments,/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/comment/i)).not.toBeInTheDocument()  // case-insensitive guard
  })

  it('comment button IS present for prayer_request, testimony, question, discussion', () => {
    // Loop over the 4 non-encouragement types, render, assert button present
  })

  it('bookmark and share buttons remain on encouragement', () => {
    // Encouragements can be bookmarked and shared
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE — add 10 tests):

```typescript
describe('InlineComposer — encouragement variant', () => {
  it('renders header "Send encouragement"', () => { ... })
  it('renders the expiry warning callout', () => {
    expect(screen.getByText(/Encouragements gently fade after 24 hours/)).toBeInTheDocument()
  })
  it('does NOT render expiry warning for non-encouragement types', () => { ... })
  it('textarea max attribute is 280', () => { ... })
  it('CharacterCount visibleAt threshold is 140 for encouragement', () => { ... })
  it('anonymous toggle is ABSENT from DOM for encouragement', () => {
    expect(screen.queryByLabelText(/anonymous/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /anonymous/i })).not.toBeInTheDocument()
  })
  it('category fieldset is ABSENT from DOM for encouragement', () => { ... })
  it('challenge checkbox is ABSENT from DOM for encouragement', () => { ... })
  it('submit button reads "Send Encouragement"', () => { ... })
  it('submit payload has category="other" and isAnonymous=false for encouragement', () => {
    // Spy on onSubmit, fire submit, assert payload shape
  })
})
```

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE — add 3 tests):

- Successful encouragement post shows toast 'Your encouragement is on the wall. It will fade gently in 24 hours.'
- Unauthenticated encouragement composer open uses auth modal CTA 'Sign in to send encouragement'
- Encouragement post creation that fails (e.g., 400 from backend) does NOT show success toast

### Backend tests

**`backend/src/test/java/com/worshiproom/post/PostServiceTest.java`** (UPDATE — add 6 tests):

```java
@Test
void createPost_with_encouragement_and_isAnonymous_true_throws_AnonymousNotAllowedException() {
    CreatePostRequest req = new CreatePostRequest(
        "Thinking of you all today.", "encouragement", "other", true,
        null, null, null, null, "public"
    );
    assertThatThrownBy(() -> postService.createPost(authorId, req, "ikey", "rid"))
        .isInstanceOf(AnonymousNotAllowedException.class)
        .hasMessageContaining("encouragement");
}

@Test
void createPost_with_encouragement_and_isAnonymous_false_succeeds() {
    CreatePostRequest req = new CreatePostRequest(
        "Thinking of you all today.", "encouragement", "other", false,
        null, null, null, null, "public"
    );
    CreatePostResponse resp = postService.createPost(authorId, req, "ikey", "rid");
    assertThat(resp.data().postType()).isEqualTo("encouragement");
    assertThat(resp.data().isAnonymous()).isFalse();
}

@Test
void createPost_with_encouragement_over_280_chars_throws_ContentTooLongException() {
    String over280 = "x".repeat(281);
    CreatePostRequest req = new CreatePostRequest(over280, "encouragement", "other", false, ...);
    assertThatThrownBy(() -> postService.createPost(authorId, req, "ikey", "rid"))
        .isInstanceOf(ContentTooLongException.class)
        .hasMessageContaining("280");
}

@Test
void createPost_with_other_post_types_and_isAnonymous_true_succeeds() {
    // Verify the rejection is encouragement-specific
}

@Test
void list_excludes_expired_encouragements() {
    // Insert an encouragement with created_at = NOW() - 25h
    // Insert a recent encouragement
    // Insert a 25h-old prayer_request
    // Call list()
    // Assert: recent encouragement present, old encouragement absent, old prayer_request present
}

@Test
void getById_returns_expired_encouragement() {
    // Insert an encouragement with created_at = NOW() - 25h
    // Call getById()
    // Assert: returns 200 with the post (D17)
}
```

**`backend/src/test/java/com/worshiproom/post/comment/PostCommentServiceTest.java`** (UPDATE — add 4 tests):

```java
@Test
void createComment_on_encouragement_throws_CommentsNotAllowedException() {
    UUID encId = createEncouragement(authorId);
    CreateCommentRequest req = new CreateCommentRequest("Nice!", null);
    assertThatThrownBy(() -> postCommentService.createComment(encId, otherUserId, req, "ikey", "rid"))
        .isInstanceOf(CommentsNotAllowedException.class);
}

@Test
void createComment_on_encouragement_with_parent_id_throws_CommentsNotAllowed_BEFORE_parent_validation() {
    // Verify the encouragement check happens before parent comment validation
}

@Test
void createComment_on_prayer_request_succeeds() {
    // Sanity check: rejection is encouragement-specific
}

@Test
void createComment_on_testimony_question_discussion_all_succeed() {
    // Sanity check: only encouragement is blocked
}
```

**`backend/src/test/java/com/worshiproom/post/PostSpecificationsTest.java`** (UPDATE — add 4 tests):

```java
@Test
void notExpired_excludes_encouragements_older_than_24_hours() {
    // Use a JPA test or a mock to verify the predicate
}

@Test
void notExpired_does_not_exclude_recent_encouragements() {
    // Encouragement created 23h ago passes
}

@Test
void notExpired_does_not_exclude_old_non_encouragements() {
    // Prayer_request from 30 days ago passes
}

@Test
void notExpired_uses_24_hour_window() {
    // Encouragement from exactly 23h59m ago passes; from 24h00m ago does not
}
```

**`backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java`** (UPDATE — add 5 tests):

- POST /api/v1/posts with encouragement + isAnonymous=true returns 400 ANONYMOUS_NOT_ALLOWED
- POST /api/v1/posts with encouragement + isAnonymous=false succeeds
- GET /api/v1/posts excludes expired encouragements
- GET /api/v1/posts/{id} returns expired encouragement (200)
- POST /api/v1/posts/{encouragementId}/comments returns 400 COMMENTS_NOT_ALLOWED

### Total test budget

- post-types.test.ts: 2 tests updated
- content-limits.test.ts: 1 test added
- PrayerCard.test.tsx: 6 new
- InteractionBar.test.tsx: 8 new
- InlineComposer.test.tsx: 10 new
- PrayerWall.test.tsx: 3 new
- PostServiceTest.java: 6 new
- PostCommentServiceTest.java: 4 new
- PostSpecificationsTest.java: 4 new
- PostControllerIntegrationTest.java: 5 new

**Total: ~49 tests.** Substantially exceeds master plan AC's ≥14 threshold (which was conservative for the per-type chrome / composer slots; the actual surface around comments + anonymous + expiry justifies more).

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Backend:**

- `backend/src/main/java/com/worshiproom/post/AnonymousNotAllowedException.java` — NEW exception. ~15 lines.
- `backend/src/main/java/com/worshiproom/post/comment/CommentsNotAllowedException.java` — NEW exception. ~10 lines.

**Frontend:**

- (none — all 4.6 frontend changes are extensions of existing files)

### Files to Modify

**Frontend:**

- `frontend/src/constants/post-types.ts` — flip `encouragement.enabled` from false to true
- `frontend/src/constants/__tests__/post-types.test.ts` — update enabled-disabled split
- `frontend/src/constants/content-limits.ts` — update `POST_TYPE_LIMITS.encouragement` from prayer_request defaults to 280-char limit
- `frontend/src/constants/__tests__/content-limits.test.ts` — add encouragement limit assertion
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — import `Heart` from lucide-react, swap `encouragement: HandHelping` → `encouragement: Heart` in POST_TYPE_ICONS, add `case 'encouragement':` with rose wash in articleChromeClasses, add `case 'encouragement':` in articleAriaLabel, conditionally unmount CommentsSection for encouragement
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — replace placeholder encouragement entry in composerCopyByType with full entry (D22), add `showAnonymousToggle?`, `expiryWarning?`, `submitsAsCategory?` to ComposerCopy interface, render expiry warning callout when set, conditionally render anonymous toggle, force isAnonymous=false at submit for encouragement, force category=submitsAsCategory at submit
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — add `REACTION_LABEL_BY_TYPE` and `REACTION_ICON_BY_TYPE` maps, import `Heart`, look up reaction label/icon/floating-text from maps, conditionally render comment button when postType !== encouragement
- `frontend/src/pages/PrayerWall.tsx` — fill in `successToastByType.encouragement` and `authModalCtaByType.encouragement`
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add 6 encouragement tests
- `frontend/src/components/prayer-wall/__tests__/InteractionBar.test.tsx` — add 8 encouragement tests
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — add 10 encouragement tests
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add 3 encouragement tests
- `frontend/src/mocks/prayer-wall-mock-data.ts` — add encouragement fixtures (recent, expired, attributed)
- `_plans/post-1.10-followups.md` — UPDATE §29 (per-type reaction labels) to note 4.6 shipped the infrastructure

**Backend:**

- `backend/src/main/java/com/worshiproom/post/PostService.java` — add `if (postType == ENCOURAGEMENT && request.isAnonymous()) throw new AnonymousNotAllowedException(...)` cross-field validation; update `maxContentLengthFor(ENCOURAGEMENT)` to return 280; compose `notExpired()` in `list()` and `getByAuthor()` query specs
- `backend/src/main/java/com/worshiproom/post/comment/PostCommentService.java` — capture `Post parentPost = postRepository.findByIdAndIsDeletedFalse(...)`, add `if (parentPost.getPostType() == ENCOURAGEMENT) throw new CommentsNotAllowedException()`
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` — add `notExpired()` factory method
- `backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` — add handler for `AnonymousNotAllowedException` → 400 ANONYMOUS_NOT_ALLOWED
- `backend/src/main/java/com/worshiproom/post/comment/CommentExceptionHandler.java` — add handler for `CommentsNotAllowedException` → 400 COMMENTS_NOT_ALLOWED
- `backend/src/main/resources/openapi.yaml` — document new error codes ANONYMOUS_NOT_ALLOWED and COMMENTS_NOT_ALLOWED in error response schemas
- `backend/src/test/java/com/worshiproom/post/PostServiceTest.java` — add 6 tests
- `backend/src/test/java/com/worshiproom/post/comment/PostCommentServiceTest.java` — add 4 tests
- `backend/src/test/java/com/worshiproom/post/PostSpecificationsTest.java` — add 4 tests
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` — add 5 tests

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.6 from ⬜ to ✅ AFTER successful merge

### Files NOT to Modify

**Schema (no changes):**

- Liquibase changelog directory — DO NOT add a changeset (no schema delta)
- `backend/src/main/java/com/worshiproom/post/Post.java` (no new columns)
- `backend/src/main/java/com/worshiproom/post/PostType.java` (encouragement enum value already exists)

**Activity engine (per MPD-1):**

- `backend/src/main/java/com/worshiproom/activity/ActivityType.java`
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java`

**Reaction data layer (per D2):**

- `backend/src/main/java/com/worshiproom/post/engagement/PostReaction.java`
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionWriteService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/dto/*.java`

**Comment read path:**

- `PostCommentService.listForPost` (encouragement reads return empty list naturally — no special handling needed)

**Single-post detail (per D17):**

- `PostService.getById()` — does NOT compose `notExpired()`

**Other:**

- `frontend/src/components/prayer-wall/CommentItem.tsx` (per MPD-6 — threading deferred, comments disabled on encouragement so this is doubly out of scope)
- `frontend/src/components/prayer-wall/CommentsSection.tsx` (no changes; the conditional unmount happens in PrayerCard)
- `frontend/src/components/prayer-wall/ScriptureChip.tsx` (no changes; chip naturally absent for encouragement per MPD-7)
- `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` (no changes)
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx`, `ResolvedBadge.tsx`, `QotdBadge.tsx`
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` (per W19 — no rose category)
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx`
- `frontend/src/components/prayer-wall/QotdComposer.tsx`

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Functional behavior — composer:**

- [ ] Posting an encouragement creates a post with `post_type='encouragement'`
- [ ] Composer header reads 'Send encouragement'
- [ ] Composer placeholder reads 'A quick word of life. Anything that comes to mind.'
- [ ] Composer aria-label on textarea reads 'Encouragement'
- [ ] Composer textarea max attribute is 280
- [ ] CharacterCount shows visibleAt=140, warningAt=240, dangerAt=270, max=280
- [ ] Composer submit button reads 'Send Encouragement'
- [ ] Composer footer note renders ('Your encouragement will be shared...')
- [ ] Composer expiry warning callout renders above textarea ('Encouragements gently fade after 24 hours...')
- [ ] Composer minHeight is 100px (smaller than other types)
- [ ] Composer hides anonymous toggle (entirely absent from DOM)
- [ ] Composer hides category fieldset (absent from DOM)
- [ ] Composer hides challenge-prayer checkbox (absent from DOM)
- [ ] Composer does NOT render scripture-reference field
- [ ] Composer does NOT render attribution nudge
- [ ] Submit auto-fills `category: 'other'`
- [ ] Submit auto-sets `isAnonymous: false` (defense in depth)

**Functional behavior — card chrome:**

- [ ] Encouragement cards render with rose accent (`bg-rose-500/[0.04]` + `border-rose-200/10`)
- [ ] Encouragement cards show `Heart` icon next to timestamp (replacing HandHelping placeholder)
- [ ] Article aria-label reads 'Encouragement by {authorName}'
- [ ] No regression on prayer_request, testimony, question, discussion chrome
- [ ] Author name always renders (never 'Anonymous' for encouragement)

**Functional behavior — InteractionBar:**

- [ ] Reaction button uses `Heart` icon for encouragement (instead of `HandHelping`)
- [ ] Reaction button aria-label reads 'Send thanks for this encouragement (N praying)' / 'Remove thanks (N praying)'
- [ ] Floating animation text reads '+1 thanks' on tap (not '+1 prayer')
- [ ] Reaction count rendering unchanged
- [ ] Sound effect 'whisper' plays on tap (unchanged)
- [ ] Comment button is ABSENT from DOM (not disabled — entirely absent)
- [ ] Bookmark button remains present
- [ ] Share button remains present
- [ ] Save button remains present
- [ ] No regression on reaction labels for prayer_request, testimony, question, discussion ('Pray', '+1 prayer', HandHelping unchanged)

**Functional behavior — comments disabled:**

- [ ] CommentsSection is NOT mounted on encouragement cards (PrayerCard.tsx)
- [ ] CommentsSection is NOT mounted on encouragement detail page (PrayerDetail.tsx)
- [ ] Comment count is not displayed anywhere on encouragement cards
- [ ] No 'Comments disabled' message replaces the comments section (clean absence)

**Functional behavior — toast / auth modal:**

- [ ] Successful encouragement post shows toast 'Your encouragement is on the wall. It will fade gently in 24 hours.'
- [ ] Unauthenticated encouragement composer open uses auth modal CTA 'Sign in to send encouragement'
- [ ] Failed creation does not show success toast

**Backend — anonymous rejection:**

- [ ] `POST /api/v1/posts` with `postType='encouragement'` and `isAnonymous=true` returns 400 with code `ANONYMOUS_NOT_ALLOWED`
- [ ] `POST /api/v1/posts` with `postType='encouragement'` and `isAnonymous=false` succeeds
- [ ] Other post types (prayer_request, testimony, question, discussion) continue to allow `isAnonymous=true`
- [ ] `AnonymousNotAllowedException` exception class exists at `backend/src/main/java/com/worshiproom/post/`
- [ ] `PostExceptionHandler` maps the exception to 400 with the documented code

**Backend — comments rejection:**

- [ ] `POST /api/v1/posts/{encouragementId}/comments` returns 400 with code `COMMENTS_NOT_ALLOWED`
- [ ] `POST /api/v1/posts/{nonEncouragementId}/comments` succeeds (no regression)
- [ ] Reply (with parentCommentId) on encouragement also returns 400 (rejection precedes parent validation)
- [ ] `GET /api/v1/posts/{encouragementId}/comments` returns empty list (no special handling, just no comments exist)
- [ ] `CommentsNotAllowedException` exception class exists at `backend/src/main/java/com/worshiproom/post/comment/`

**Backend — content limit:**

- [ ] `POST /api/v1/posts` with `postType='encouragement'` and content > 280 chars returns 400 with `ContentTooLongException` mentioning '280'
- [ ] `POST /api/v1/posts` with `postType='encouragement'` and content ≤ 280 chars succeeds
- [ ] Other post types continue to use their existing limits (1000/2000/5000)

**Backend — expiry:**

- [ ] `notExpired()` Specification factory exists at `backend/src/main/java/com/worshiproom/post/PostSpecifications.java`
- [ ] `notExpired()` is composed at `PostService.list()` (line ~114)
- [ ] `notExpired()` is composed at `PostService.getByAuthor()` (line ~149)
- [ ] `notExpired()` is NOT composed at `PostService.getById()` (line ~130)
- [ ] `notExpired()` excludes encouragements created > 24 hours ago
- [ ] `notExpired()` does NOT exclude recent encouragements (< 24 hours)
- [ ] `notExpired()` does NOT exclude non-encouragement posts of any age
- [ ] `GET /api/v1/posts` excludes expired encouragements
- [ ] `GET /api/v1/posts/{expiredEncouragementId}` returns 200 with the post (D17)
- [ ] `GET /api/v1/posts?postType=encouragement` returns only non-expired encouragements
- [ ] No `expires_at` column added to posts table
- [ ] No Liquibase changeset added for expiry

**Constants:**

- [ ] `getPostType('encouragement').enabled === true`
- [ ] All 5 post types are now enabled (`POST_TYPES.filter(t => !t.enabled)` returns empty array)
- [ ] `POST_TYPE_LIMITS.encouragement.max === 280`
- [ ] `POST_TYPE_LIMITS.encouragement.warningAt === 240`
- [ ] `POST_TYPE_LIMITS.encouragement.dangerAt === 270`
- [ ] `POST_TYPE_LIMITS.encouragement.visibleAt === 140`

**Tests:**

- [ ] ~49 new/updated tests pass
- [ ] Existing tests continue to pass (no regressions on any prior post type behavior)
- [ ] PostType drift contract test passes (no enum changes)
- [ ] Specification tests verify the 24-hour cutoff is correct
- [ ] Backend integration tests verify the four new error codes (ANONYMOUS_NOT_ALLOWED, COMMENTS_NOT_ALLOWED, plus the existing CONTENT_TOO_LONG with 280 message)

**Brand voice:**

- [ ] All new copy strings pass the pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon, no streak/shame, no false scarcity

**Visual verification (gated on /verify-with-playwright):**

- [ ] Encouragement composer renders with all per-type copy and behavioral branches
- [ ] Encouragement card chrome renders with rose wash on `/prayer-wall` feed
- [ ] Heart icon appears in two places (type marker + reaction button)
- [ ] Comment button is absent on encouragement cards
- [ ] Reaction button shows 'Send thanks' / 'Remove thanks' aria-labels
- [ ] Floating animation reads '+1 thanks'
- [ ] Mixed feed (all 5 types) renders all chrome variants correctly
- [ ] Expired encouragement does not appear in feed
- [ ] Expired encouragement IS accessible via direct URL
- [ ] Bookmarked expired encouragement still renders on `/my-prayers`
- [ ] No regression on existing post types

**Operational:**

- [ ] `_plans/post-1.10-followups.md` updated to note 4.6 shipped per-type reaction infrastructure
- [ ] `_forums_master_plan/spec-tracker.md` 4.6 row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.6:

- **General per-type expiry mechanism** (expires_at column, expiry job, per-type defaults table) → Phase 6 expiry spec; 4.6 ships only encouragement's 24-hour rule via SQL math
- **Hard-delete of expired encouragements** → out; expired encouragements stay in DB indefinitely (no scheduled deletion in 4.6)
- **404 on direct lookup of expired encouragement** → out per D17; bookmarks/saves/shared URLs continue to resolve
- **Per-type reaction TYPES at the data layer** (e.g., `reaction_type` enum column, multi-reaction-per-post) → Phase 6 if needed
- **Testimony's 'Amen' reaction label** → still deferred to Phase 5 follow-up §29 (now reduced in scope since infrastructure shipped)
- **Question's per-type reaction relabeling** → still deferred
- **Threaded replies UI** → moot for encouragement (no comments at all); covered by 4.4's filed follow-up for other post types
- **Composer Chooser UI to surface all 5 post types** → Spec 4.7
- **Phase 4 Cutover / Room Selector** → Spec 4.8
- **Image upload on encouragements** → out (4.6b only adds images for testimonies + questions)
- **Scripture reference on encouragements** → out per D6.5
- **Per-type sound effects** → out per D3 / W22
- **Distinct fade-out animation as expiry approaches** → out per W21
- **'This encouragement has expired' banner on direct-link detail page** → out per W29
- **Pinning / extending encouragements** → out per W15 (master plan body says non-extendable)
- **Notifications when an encouragement is reacted to** → Phase 6 notifications
- **Encouragement-specific feed (`/encouragements` page)** → out (encouragements live in mixed feeds)
- **Sharing expired encouragements externally with a 'this faded' watermark** → out (the URL renders the post normally; no special UI for shared expired posts)
- **Allowing comments on encouragement at admin's discretion** → out (the rejection is uniform; no override path)
- **Per-type anonymous policy beyond encouragement** → encouragement is the only type with anonymous-disabled in Phase 4
- **Encouragement as a category** in CategoryBadge / CategoryFilterBar → out per W19

---

## 13. Brand voice quick reference (pastor's wife test)

Encouragement is the warmest, most casual, most ephemeral post type. The brand voice should feel like a hand on a shoulder — present, kind, brief.

**Anti-patterns to flag during /code-review:**

- 'Drop an encouragement!' / 'Spread some love!' (Cheerleader voice — too loud)
- 'Encouragements expire in 24 hours.' (Transactional 'expire' — wrong word)
- '🌹 Your encouragement is live!' (Emoji + 'live' is gamification voice)
- 'Send positive vibes' (Generic-spirituality voice)
- 'Your kind words can make someone's day!' (Pressure / outcome promise)
- 'Encouragements help you connect deeper with the community.' (App-jargon)
- '24 hours left to be encouraged!' (Urgency)
- 'Most popular encouragements' / 'Top encouragements' (Comparison / ranking)
- 'You've sent 12 encouragements this week' (Streak / metric pressure)
- 'Send your encouragement before time runs out' (Scarcity)

**Good copy in 4.6:**

- 'Send encouragement' — direct verb, calm noun
- 'A quick word of life. Anything that comes to mind.' — invitational, low pressure, permission-giving
- 'Encouragements gently fade after 24 hours. Say what is on your heart and let it go.' — honest about ephemerality, reframes it as freeing rather than restrictive
- 'Your encouragement is on the wall. It will fade gently in 24 hours.' — confirmation + brand-coherent reminder
- 'Sign in to send encouragement' — standard
- 'Send thanks' / 'Remove thanks' — calm acknowledgment, not amplification
- 'Encouragement by {authorName}' — descriptive, attributed (matches the always-attributed nature)
- '+1 thanks' — minimal, parallel to existing '+1 prayer' pattern

The phrase 'gently fade' and 'let it go' are load-bearing. They reframe the 24-hour limit from 'use it or lose it' (urgency) to 'a small offering, freely given, no expectation' (gift). If CC drifts to 'expire', 'time-limited', 'temporary', push back.

The 'Send' verb (vs 'Share' / 'Post' / 'Submit') — encouragements are sent like cards or notes. The verb carries warmth that 'Submit Prayer Request' or 'Submit Testimony' deliberately don't.

---

## 14. Tier rationale

Run at **xHigh**. Justifications:

**Why not Standard:**

- Four NEW patterns introduced (per-type reaction labels, comments disabled, anonymous disabled, query-side expiry). Standard tier consistently misses one or more.
- The query-side expiry composition (D17 / W3 / W14) is precise. Standard tier sometimes broad-matches the predicate, breaking other post types' visibility.
- The anonymous rejection at the BACKEND (D16, W10) has a subtle anti-pattern: silently coercing isAnonymous=false. Standard tier often picks the silent coercion path, which hides the contract violation.
- The reaction label/icon abstraction (D2, MPD-2) needs to fit alongside future Phase 6 work. xHigh respects the 'minimal infrastructure now, generalize later' shape.

**Why not MAX:**

- No new external dependency. No schema changes. No background jobs.
- No atomic multi-row transactions.
- The per-type composer infrastructure is well-patterned by 4.3, 4.4, 4.5. Encouragement is filling in slots.
- The new exception classes follow established codebase patterns.

**Override moments — when to bump to MAX:**

- During /plan or /execute, if the `notExpired()` composition gets applied to `getById()` (D17 violation) or to a generic 'all queries' pattern (W14 violation)
- If the comment-rejection check is implemented as a positive list (W13)
- If the anonymous rejection is implemented as silent coercion instead of throwing (W10)
- If the per-type reaction infrastructure is over-engineered into a multi-reaction data-layer change (W5)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-6`:

```
/spec-forums spec-4-6

Write a spec for Phase 4.6: Encouragement Post Type. Read /Users/Eric/worship-room/_plans/forums/spec-4-6-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: xHigh.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites: 4.5 (Devotional Discussion Post Type) must be ✅ in spec-tracker.md before this spec executes. Verify by:

1. Reading /Users/Eric/worship-room/_forums_master_plan/spec-tracker.md row for 4.5
2. Confirming `composerCopyByType.discussion` has full discussion entries (not placeholders) in InlineComposer.tsx
3. Confirming `ScriptureChip.tsx` and `ScriptureReferenceInput.tsx` exist
4. Confirming PrayerCard chrome has the violet wash for discussion

If any check fails, STOP. Don't proceed without 4.5 shipped.

Recon checklist (re-verify on disk before starting; the brief's recon was on date 2026-05-08):

1. `frontend/src/constants/post-types.ts` — confirm encouragement entry has `icon: 'Heart'` and `enabled: false`
2. `frontend/src/components/prayer-wall/InteractionBar.tsx` — confirm hardcoded HandHelping icon, '+1 prayer' floating text, 'Pray for this request' aria-label (NO postType awareness yet)
3. `frontend/src/components/prayer-wall/InlineComposer.tsx` — confirm composerCopyByType.encouragement is currently a placeholder copying prayer_request defaults
4. `frontend/src/components/prayer-wall/PrayerCard.tsx` — confirm POST_TYPE_ICONS.encouragement is HandHelping placeholder; confirm chrome switch falls through to default; confirm articleAriaLabel falls through to default
5. `backend/src/main/java/com/worshiproom/post/comment/PostCommentService.java` line 169 — confirm parent post is loaded but discarded (`postRepository.findByIdAndIsDeletedFalse(postId).orElseThrow(...)`)
6. `backend/src/main/java/com/worshiproom/post/PostService.java` line 191-195 — confirm scripture pair check is present (this is where the new anonymous rejection sits next to)
7. `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` — confirm NO `notExpired` factory exists yet
8. `backend/src/main/java/com/worshiproom/post/PostService.java` lines 114, 130, 149 — confirm three composition sites for visibleTo()
9. Liquibase changelog directory — DO NOT add changesets (no schema delta)
10. `_plans/post-1.10-followups.md` — read current §29 entry (per-type reaction labels) to update with infrastructure-shipped note

Spec output structure:

- Title and metadata (size M, risk Medium, prerequisites 4.5, branch forums-wave-continued)
- Goal — Add Encouragement post type with rose chrome, Heart icon, 280-char limit, expiry warning, per-type reaction labels (Thanks/Heart), comments disabled, anonymous disabled, 24-hour query-side expiry
- Approach — 2 new exception classes (AnonymousNotAllowedException, CommentsNotAllowedException), per-type reaction maps in InteractionBar, conditional comment button + CommentsSection, expiry warning callout in composer, notExpired() Specification, all backend rejections at the right injection points
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~49 tests)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - Per-type reaction infrastructure is NEW (MPD-2) — partially overrides 4.3's deferral
  - 24-hour expiry uses SQL math via notExpired() (MPD-3) — no expires_at column
  - notExpired() composes at list() and getByAuthor() ONLY, not getById() (D17)
  - Anonymous rejection THROWS, never silently coerces (D16, W10)
  - Comment rejection happens BEFORE parent validation (D15, R8)
  - Comment button entirely ABSENT from DOM, not disabled (D12, W6)
  - Anonymous toggle entirely ABSENT from DOM, not disabled (D9)
  - Submit auto-fills category='other' and isAnonymous=false (D18, D19)
  - Heart icon used in two places: type marker + reaction button (D6)

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually.
- Two NEW exception classes, NO new entity columns, NO new Liquibase changesets.
- The data layer for reactions stays single-flag (is_praying); per-type changes are UI-only.

After writing the spec, run /plan-forums spec-4-6 with the same tier (xHigh).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-6
```

The verifier exercises Section 3's visual surface. Minimum 12 Playwright scenarios. Verifier writes to `_plans/forums/spec-4-6-verify-report.md`.

If verification flags either:
- Comment button visible on encouragement cards
- Expired encouragement visible in any feed
- Anonymous toggle visible on encouragement composer

Abort and bump to MAX. Those are the canonical override moments.

---

## Prerequisites confirmed (as of 2026-05-08 brief authorship)

- ✅ 4.1, 4.2, 4.3, 4.4 shipped per spec-tracker
- ⬜ 4.5 — must ship before 4.6 executes
- Backend `Post` entity has all needed columns; no schema delta for 4.6 (per R-section)
- `PostSpecifications` is the right injection layer for `notExpired()` (per R7)
- `PostCommentService.createComment` line 169 is the right injection point for the comment-rejection (per R8)
- `PostService.createPost` cross-field validation block (lines ~191-195) is the right place for the anonymous-rejection (per R9)
- `InteractionBar` has zero per-type awareness today; 4.6 introduces the maps (per R10)
- Lucide `Heart` icon expected available (per R16) — verify during plan
- Rose palette expected available in Tailwind (per R17, W22) — verify, fallback to hex

**Brief authored:** 2026-05-08, written on Eric's personal laptop after a mid-session machine switch (recon refreshed against `/Users/Eric/worship-room/`). Companion to Spec 4.3, 4.4, 4.5 briefs. Smaller test surface than 4.4 but more cross-cutting changes than 4.5 — per-type infrastructure introduced in 4.6 sets precedent for future Phase 6 work.

**End of brief.**
