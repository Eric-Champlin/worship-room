/spec-forums spec-4-6

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

