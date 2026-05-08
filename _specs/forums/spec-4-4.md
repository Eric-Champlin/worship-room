# Forums Wave: Spec 4.4 — Question Post Type

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.4
**ID:** `round3-phase04-spec04-question-post-type`
**Branch:** `forums-wave-continued` (continuation branch — do NOT create a new branch)
**Date:** 2026-05-08

---

## Affected Frontend Routes

The question composer surface is `/prayer-wall`. PrayerCard chrome (cyan wash, HelpCircle icon) and the new author-only 'This helped' button + ResolvedBadge propagate to every site that renders a PrayerCard or its CommentsSection:

- `/prayer-wall` — PrayerWall.tsx (composer + feed). The production composer entry point for question ships in Spec 4.7 (Composer Chooser); 4.4 exposes the variant via the `?debug-post-type=question` query param introduced by 4.3 for `/verify-with-playwright` only, marked `REMOVE-IN-4.7` in the code.
- `/prayer-wall/:id` — PrayerDetail.tsx (single-card render; primary surface for the 'This helped' button + ResolvedBadge interactive flow)
- `/prayer-wall/dashboard` — PrayerWallDashboard.tsx (multiple tabs each render PrayerCard; requires auth)
- `/prayer-wall/user/:id` — PrayerWallProfile.tsx
- `/my-prayers` — MyPrayers.tsx (authenticated user's own prayer list; requires auth — the most common surface where the post author sees their own questions and resolves comments)

All routes except `/prayer-wall/dashboard` and `/my-prayers` are public. There are no new routes; this spec only modifies what already-existing routes render when a post has `postType='question'` and adds the `PATCH /api/v1/posts/{id}/resolve` endpoint that the frontend mutation hook calls.

---


# Spec 4.4 — Question Post Type

**Master plan ID:** `round3-phase04-spec04-question-post-type`
**Size:** L
**Risk:** Medium
**Prerequisites:** 4.3 (Testimony Post Type) — hard prereq; the per-type chrome system, `POST_TYPE_LIMITS` map, `composerCopyByType` map, and per-type toast/auth-modal lookups are introduced in 4.3 and reused here. **4.4 cannot be planned or executed before 4.3 ships.**
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

This spec is structurally larger than 4.3 even though it inherits 4.3's per-type infrastructure. Net-new surface:

- Backend Liquibase changeset adding `question_resolved_comment_id` UUID column to `posts`
- Net-new `PATCH /api/v1/posts/{id}/resolve` endpoint with strict author-ownership auth
- Atomic resolve operation that touches both `posts` and `post_comments` rows in one transaction
- Author-only UI conditional on the 'this helped' button (a class of conditional CC commonly gets wrong — see W11)
- Frontend type extension to consume `parentCommentId` and `isHelpful` fields the backend already returns but the frontend has been ignoring
- New ResolvedBadge component (visually adjacent to but semantically separate from AnsweredBadge)
- API mutation hook with optimistic update + rollback on failure
- Per-type chrome / composer / toast entries for `question` (the cheap part — same shape as 4.3's testimony entries)

It is not MAX because:

- No safety-critical pathway changes (crisis detection, auth, anti-enumeration unchanged)
- No new external dependency (no S3, no Redis, no SMTP)
- No data loss / migration backfill risk (single nullable column added)
- The atomic resolve operation is a well-bounded transaction, not a distributed-system concern
- The author-ownership check pattern already exists in PostService for delete and update — copy that pattern, don't invent

xHigh + this brief consistently outperforms MAX + a thin brief on this kind of cross-cutting work.

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.** Do not skip — this spec adds question chrome, a new author-only button, and a new badge component. Visible UI surface across the prayer-wall feature.

Verification surface:

1. **Question composer variant** at `/prayer-wall` when the composer is opened with `postType='question'` (same debug-query-param mechanism 4.3 introduced for testimony — see Section 15 planner instructions for reuse).
   - Header copy reads correctly
   - Placeholder copy reads correctly
   - Subline copy renders below the header (the subline is NEW for question — see D11)
   - Textarea max attribute is 2000 (same as prayer_request — questions don't need 5000 chars; see D3)
   - CharacterCount thresholds match prayer_request (visibleAt=500, warningAt=800, dangerAt=960, max=2000)
   - Anonymous toggle present without attribution nudge (no testimony-style nudge for question — see D14)
   - Category fieldset hidden (questions have no category — see R6)
   - Challenge-prayer checkbox hidden (questions are not challenge-related — see D15)
   - Submit button label reads correctly

2. **Question card chrome** on `/prayer-wall` feed for any post with `postType='question'`.
   - Cooler wash applied: `bg-cyan-500/[0.04]` (verify in plan; same Tailwind palette concern as 4.3's amber — see W19)
   - Cyan-tinted border: `border-cyan-200/10` or equivalent
   - FrostedCard liquid-glass aesthetic preserved (tint shift, not redesign — same principle as 4.3)
   - HelpCircle icon renders next to timestamp (replaces HandHelping placeholder per followup §26)
   - Existing layout (avatar, name, timestamp, content, expand button, children slot) renders unchanged

3. **'This helped' button on comments — author-only**
   - When the current user IS the post author: button visible on every non-deleted comment of their own question
   - When the current user IS NOT the post author: button NEVER visible (not disabled — entirely absent from DOM)
   - When the current user is NOT authenticated: button NEVER visible
   - Button copy: 'This helped' (sentence case, no exclamation — see D8)
   - Tapping the button transitions the comment to a resolved state (badge appears, button text updates to 'Most helpful')
   - Tapping again on the same comment is a no-op (idempotent — see D9)
   - Tapping a different comment moves the resolved marker (the previous helpful comment's badge disappears, the new one's appears, button on previous returns to 'This helped' — see D10)

4. **Resolved question UX**
   - When `post.questionResolvedCommentId` is set, a small ResolvedBadge appears inline next to the helpful comment's avatar/name (see D12 for exact placement and styling)
   - The post's expiry behavior: questions are evergreen by default in 4.4 (no expires_at column shipped yet — see MPD-2). Resolution is an information signal, not an expiry-clearing signal.
   - The article aria-label reads `'Question by {authorName}'` (see D17)

5. **No regression on prayer_request and testimony rendering** — verify across all PrayerCard render sites:
   - `/prayer-wall` (PrayerWall.tsx feed — mixed feed of prayer_request, testimony, and question now)
   - `/prayer-wall/:id` (PrayerDetail.tsx)
   - `/prayer-wall/dashboard` (PrayerWallDashboard.tsx — multiple tabs)
   - `/my-prayers` (MyPrayers.tsx)
   - The cyan question wash must not bleed into prayer_request or testimony cards
   - The HelpCircle icon must only appear on question cards
   - The 'This helped' button must not appear on non-question post types even when current user is the author

6. **Backend resolve endpoint smoke** — Playwright issues a PATCH /api/v1/posts/{id}/resolve and verifies:
   - 200 response with updated PostDto (questionResolvedCommentId populated)
   - Comment row updated (isHelpful=true)
   - Subsequent GET /api/v1/posts/{id} returns the updated questionResolvedCommentId
   - Subsequent GET /api/v1/posts/{id}/comments returns the comment with isHelpful=true
   - Calling resolve as a non-author returns 403
   - Calling resolve on a non-question post returns 400
   - Calling resolve with a comment that doesn't belong to that post returns 400

7. **Threaded reply rendering — DEFERRED in 4.4** (per MPD-3). Current flat-comment rendering is preserved; the `parentCommentId` field is consumed by the type but not rendered in any visual treatment. Threading UX is its own follow-up. Verification scope: confirm parent-child relationships are not lost (a comment with `parentCommentId` set still renders in the flat list with no error, no console warning).

The Playwright test count for visual verification: minimum 12 scenarios.

---

## 4. Master Plan Divergence

The master plan body for 4.4 lives at `_forums_master_plan/round3-master-plan.md` lines ~4188–4220. Several statements are out of sync with what Phase 3 actually shipped (Phase 3 was more thorough than the body assumed). Recon trumps the body.

### MPD-1 — Activity engine deferral mirrors 4.3

The master plan body for 4.3 introduced the `testimony_posted` ActivityType + +50% faith point bonus, deferred in 4.3's brief to a Phase 5 follow-up. 4.4's master plan body does not explicitly mention a question-specific activity type, but it's the same architectural slot: a question post emits `ActivityType.PRAYER_WALL` (15 points) just like prayer_request and testimony.

**For 4.4: no new ActivityType. No PointValues changes. No faith-point tuning.** The line in `PostService.createPost` reading:

```java
activityService.recordActivity(
        authorId,
        new ActivityRequest(ActivityType.PRAYER_WALL, "prayer-wall-post", null)
);
```

stays unchanged for question. A user posting a question earns 15 faith points, same as prayer_request and testimony.

The resolve action (PATCH /api/v1/posts/{id}/resolve) does NOT emit any activity. Resolving is a metadata change, not a content-creation event. The author already earned points for posting the question; the resolve is just a curation step.

**Action for the planner:** No follow-up entry needed for 4.4 — the 4.3 follow-up §27 already covers per-post-type activity tuning generically.

### MPD-2 — Question expiry deferred to Phase 6

The master plan body says: 'Tapping it sets `is_helpful=true` on that comment, sets `posts.question_resolved_comment_id`, marks the question evergreen by clearing `expires_at`.'

Recon ground truth: there is NO `expires_at` column on the `posts` table. Phase 3 did not ship per-type expiry. Phase 6 owns the expiry feature (see master plan body sections after Phase 4).

**For 4.4: do NOT add `expires_at` column.** Doing so couples 4.4 to a Phase 6 concern (default expiry windows per type, the expiry job that soft-deletes expired posts, the visibility predicate exclusions, etc.). 4.4's resolve endpoint sets only:

- `comment.is_helpful = true` (column already exists per R3)
- `post.question_resolved_comment_id = commentId` (NEW column added by 4.4)

When Phase 6's expiry feature ships, it will check `question_resolved_comment_id IS NOT NULL` to skip expiry on resolved questions. That's the integration contract — but the integration does not need to exist until Phase 6.

**Action for the planner:** Document this in the plan. The brief's resolve endpoint contract explicitly states: 'Sets `posts.question_resolved_comment_id` and `post_comments.is_helpful`. Does NOT touch `posts.expires_at` (no such column exists in 4.4).'

### MPD-3 — Threaded reply UI deferred to follow-up

The master plan body says: 'Threaded replies render correctly with indentation' as an AC.

Recon ground truth:

- Backend ALREADY supports threading. `PostComment` entity has `parentCommentId`. `CommentDto` returns nested `replies: List<CommentDto>` trees. Phase 3's `PostCommentMapper` builds the tree.
- Frontend does NOT consume threading. `PrayerComment` interface lacks `parentCommentId`. `CommentItem.tsx` renders flat with no nesting awareness. The `Reply` button just inserts an `@-mention` in the input via `onReply(authorName)`, which is conversationally threaded (mentions) but visually flat.

**For 4.4: defer the visual threading UX to a follow-up spec.** Reasoning:

- True hierarchical comment threading is its own UX problem: indentation depth caps, 'see N more replies' toggles, mobile layout for deeply nested chains, accessibility for screen-reader navigation. None of these are 4.4's primary concern.
- The 'this helped' feature (the load-bearing part of 4.4) does not depend on threading. An author can mark a top-level comment helpful without any nested-reply rendering.
- The existing `@-mention` Reply pattern is functional for the common case ('reply to specific person'). Trading that for half-baked threading is a regression risk.

**For 4.4: do this much only.** Extend `PrayerComment` interface to include the optional `parentCommentId` and `isHelpful` fields (so the type matches the API response and TypeScript stops dropping data on the floor). The fields are SET on objects but NOT VISUALLY RENDERED beyond the helpful badge. CommentsSection still renders a flat list. CommentItem still renders without indentation. Frontend mocks include parent-child relationships only where needed for tests; production rendering is unchanged.

**Action for the planner:** File a follow-up entry in `_plans/post-1.10-followups.md`:

> ## §X. Threaded comment rendering (filed by Spec 4.4)
>
> Backend has shipped full comment threading since Phase 3 (parent_comment_id column, nested replies tree in CommentDto). Frontend renders flat. Spec 4.4 adopts the type (consumes `parentCommentId` on PrayerComment) but does not render hierarchical UI.
>
> **Implementation outline (when ready):**
> - Build a recursive `<CommentTree>` component that walks `comment.replies` and renders each level indented (max depth 3 per accessibility heuristics)
> - Add 'See N replies' toggles for collapsed sub-trees
> - Update CommentInput to accept an optional `parentCommentId` parameter (currently only @-mentions)
> - Audit accessibility: nested role=article structures, screen-reader navigation
> - Mobile: indent depth becomes more constrained — possibly cap at 2 levels
>
> **Priority:** MEDIUM. Backend is ready; frontend rendering is a polish item. The Reply button's @-mention behavior is functional for 80% of conversational use cases.
>
> Captured: <YYYY-MM-DD> during Spec 4.4 plan.

### MPD-4 — Backend already shipped most of the schema 4.4 needs

The master plan body for 4.4 frames the schema as net-new work:

> 'Comments on Question posts get a small "this helped" button visible only to the post author. Tapping it sets `is_helpful=true` on that comment...'

Implying the `is_helpful` column is added by 4.4. Recon shows otherwise:

- `post_comments.parent_comment_id` UUID column — EXISTS (from Phase 3, see R3)
- `post_comments.is_helpful` BOOLEAN NOT NULL DEFAULT false — EXISTS (from Phase 3, see R3)
- `CommentDto.parentCommentId` field — EXISTS (R4)
- `CommentDto.isHelpful` field — EXISTS (R4)
- `CommentDto.replies` nested list — EXISTS (R4)

What 4.4 actually adds at the schema layer:

- `posts.question_resolved_comment_id` UUID NULL column (NEW — single Liquibase changeset)
- A foreign-key constraint from `posts.question_resolved_comment_id` to `post_comments.id` ON DELETE SET NULL (so deleting a comment automatically nulls the resolved pointer; see D7)

That's the entire backend schema delta. Significantly smaller than the master plan body implied.

The mapper layer also gets:

- `PostMapper` populates `questionResolvedCommentId` in `PostDto`
- `PostDto` record gains `questionResolvedCommentId: UUID?` field
- OpenAPI `PostDto` schema gains the field

**Action for the planner:** Verify the column doesn't already exist via:

```bash
# In backend/, search Liquibase changelog for any prior question-resolution changeset
grep -r 'question_resolved_comment_id' backend/src/main/resources/db/
```

If it already exists (i.e., Phase 3 or a hidden patch shipped it), 4.4's schema work compresses to mapper + DTO + OpenAPI. If it doesn't, 4.4 adds the changeset.

### MPD-5 — Question content limit stays at 2000 (no per-type expansion)

4.3 introduced a per-type content limit map with prayer_request at 1000 (frontend) / 2000 (backend) and testimony at 5000 / 5000. Each downstream post type gets its own row in the map.

For question, the master plan body implies a normal-length post (questions are usually short). 4.4's default:

- Frontend `POST_TYPE_LIMITS.question.max`: 2000
- Backend `maxContentLengthFor(QUESTION)`: 2000
- Frontend warningAt: 1600, dangerAt: 1900, visibleAt: 1000 (proportionally scaled relative to testimony's thresholds)

**No frontend/backend asymmetry for question.** Both layers cap at 2000. Reasoning: questions are short by nature; a user typing 2000 chars of question is already over-explaining and the textarea cap signals 'try to be concise.' No need for the prayer_request-style 1000/2000 split.

**Action for the planner:** Update the existing `POST_TYPE_LIMITS.question` placeholder entry (which 4.3 set to prayer_request defaults of 1000) to the new 2000 ceiling. This is the only change to the limit map.

### MPD-6 — ResolvedBadge is new (semantically separate from AnsweredBadge)

The codebase has an existing `AnsweredBadge` component used by the answered-prayer flow (a prayer_request that has been marked 'Answered' via the MarkAsAnsweredForm). For Question posts, a similar-looking but semantically distinct badge marks the helpful comment.

**4.4 introduces `ResolvedBadge.tsx` as a new component.** Reasoning:

- `AnsweredBadge` says 'Answered' (visible on the post itself when `isAnswered === true`, decorating the parent post). It applies to prayer_request only.
- `ResolvedBadge` says 'Most helpful' (visible inline next to a helpful COMMENT, not on the post). It applies to question only.
- The two have different semantics, different mounting points, different copy. Sharing a component would force conditional logic that obscures both.
- The visual styling can mirror AnsweredBadge (small pill, soft accent color) but the components are siblings, not children.

**Component shape:**

```typescript
// frontend/src/components/prayer-wall/ResolvedBadge.tsx
interface ResolvedBadgeProps {
  /** Optional className override for layout adjustments at the call site */
  className?: string
}

export function ResolvedBadge({ className }: ResolvedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-200/90',
        className
      )}
      aria-label='Most helpful comment, marked by post author'
    >
      <CheckCircle2 className='h-3 w-3' aria-hidden='true' />
      Most helpful
    </span>
  )
}
```

Mount point: inside `CommentItem.tsx` next to `authorName` when `comment.isHelpful === true`. See D12 for placement details.

---

## 5. Recon Ground Truth (2026-05-08)

Concrete facts verified on disk via `Desktop Commander:read_file` against `/Users/eric.champlin/worship-room/`. These are load-bearing observations.

### R1 — `post-types.ts` question entry

`frontend/src/constants/post-types.ts` (post-4.1 state, expected unchanged through 4.3):

```typescript
{
  id: 'question',
  label: 'Question',
  pluralLabel: 'Questions',
  icon: 'HelpCircle',
  description: 'Ask the community what they think.',
  enabled: false,  // ← 4.4 flips this to true
}
```

The icon string is already `'HelpCircle'` — matching followup §26's contract. 4.4 also updates the `POST_TYPE_ICONS` map in PrayerCard.tsx to swap the placeholder `HandHelping` for `HelpCircle`.

### R2 — Per-type infrastructure (assumed shipped via 4.3)

After 4.3 ships, the following infrastructure exists for 4.4 to extend:

- `frontend/src/constants/content-limits.ts` exports `POST_TYPE_LIMITS` with a `question` entry (currently set to prayer_request defaults of 1000/800/960/500)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` has the per-type `chromeClasses` switch + `POST_TYPE_ICONS` map + per-type `articleAriaLabel`
- `frontend/src/components/prayer-wall/InlineComposer.tsx` has the `composerCopyByType` map with placeholder entries for question (currently set to prayer_request defaults)
- `frontend/src/pages/PrayerWall.tsx` has `successToastByType` and `authModalCtaByType` maps with question placeholders
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` and similar test files already have the testimony tests as a pattern to mirror

**4.4 fills in the question entries in each of these maps with question-specific values.** Same shape as 4.3's testimony work; different values.

If 4.3 has NOT shipped at the time 4.4 is executed, the brief's expectations break — STOP and ask Eric to ship 4.3 first.

### R3 — `PostComment` entity already has parent_comment_id and is_helpful

`backend/src/main/java/com/worshiproom/post/comment/PostComment.java` (line 36+):

```java
@Column(name = "parent_comment_id")
private UUID parentCommentId;

@Column(name = "content", nullable = false, columnDefinition = "TEXT")
private String content;

@Column(name = "is_helpful", nullable = false)
private boolean isHelpful;
```

Both fields have getters and setters. `is_helpful` is `nullable = false` (NOT NULL DEFAULT false in DB). `parent_comment_id` is nullable.

**Implication:** 4.4 does NOT add either column. They already exist. 4.4 just writes to them via the resolve endpoint.

The Liquibase changeset that originally added these columns is in `backend/src/main/resources/db/changelog/` — likely the Phase 3 comments changeset (changeset 015 per the docstring 'Spec 3.1 changeset 015' in the entity file). Plan should verify the changeset id during recon.

### R4 — `CommentDto` already returns parentCommentId, isHelpful, and nested replies

`backend/src/main/java/com/worshiproom/post/comment/dto/CommentDto.java`:

```java
public record CommentDto(
        UUID id,
        UUID postId,
        UUID parentCommentId,
        String content,
        boolean isHelpful,
        String moderationStatus,
        boolean crisisFlag,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        AuthorDto author,
        List<CommentDto> replies
) {}
```

Every field is already populated by the backend. The frontend has been ignoring `parentCommentId`, `isHelpful`, and `replies` — they pass through the API response into `unknown` territory.

**Implication for the frontend:** `PrayerComment` interface in `frontend/src/types/prayer-wall.ts` is missing these fields. 4.4 extends the interface:

```typescript
export interface PrayerComment {
  id: string
  prayerId: string
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string
  createdAt: string
  // --- NEW in 4.4 (consuming fields backend has been returning since Phase 3)
  parentCommentId?: string  // optional; null/undefined = top-level
  isHelpful?: boolean        // optional; defaults to false in fixtures
  replies?: PrayerComment[]  // nested replies tree; defaults to empty array if absent
}
```

The `replies` field is added defensively but NOT consumed by 4.4 rendering (per MPD-3, threaded reply UX is deferred). It's there because the API returns it and TypeScript is happier with explicit shape.

### R5 — `CommentItem.tsx` current structure

`frontend/src/components/prayer-wall/CommentItem.tsx` (73 lines, full file):

- Renders avatar + author name + timestamp + content + Reply button
- `Reply` button calls `onReply(authorName)` which inserts an `@-mention` in the parent input
- NO author-aware conditionals
- NO is_helpful awareness
- NO parent_comment_id awareness
- The author-name span and timestamp share an inline-flex baseline group

4.4 adds:

- A 'This helped' button visible only when current user is the post author (see D8)
- A `<ResolvedBadge>` rendered next to the author name when `comment.isHelpful === true` (see D12)
- A new `postAuthorId: string` prop so CommentItem can compare against the current user
- A new `currentUserId: string | null` prop or context lookup for the author check
- A new `postType: PostType` prop so the 'this helped' button only renders for question posts (the conditional is `postType === 'question' && currentUserId === postAuthorId && !comment.isDeleted`)
- A new `onResolve: (commentId: string) => void` callback prop to wire the button to the mutation

### R6 — Question category requirement (backend already excludes)

`backend/src/main/java/com/worshiproom/post/PostService.java` line ~158 (4.3 will preserve this):

```java
if ((postType == PostType.PRAYER_REQUEST || postType == PostType.DISCUSSION) && category == null) {
    throw new MissingCategoryException(postTypeRaw);
}
```

Question is NOT in the require-category list. So a question with `category: null` is accepted by the backend. 4.4's composer hides the category fieldset (mirroring the testimony pattern from 4.3's D17).

**Implication:** in the `composerCopyByType.question` entry, set `showCategoryFieldset: false`. The same change applies to `showChallengeCheckbox: false` (questions are not challenge-related).

### R7 — `Post` entity does NOT have question_resolved_comment_id

`backend/src/main/java/com/worshiproom/post/Post.java` (164 lines, all fields enumerated):

Existing columns: `id`, `user_id`, `post_type`, `content`, `category`, `is_anonymous`, `challenge_id`, `qotd_id`, `scripture_reference`, `scripture_text`, `visibility`, `is_answered`, `answered_text`, `answered_at`, `moderation_status`, `crisis_flag`, `is_deleted`, `deleted_at`, `praying_count`, `candle_count`, `comment_count`, `bookmark_count`, `report_count`, `created_at`, `updated_at`, `last_activity_at`.

NOT present: `question_resolved_comment_id`, `expires_at`.

**4.4 adds:**

- `question_resolved_comment_id UUID NULL` column to `posts`
- Foreign key constraint to `post_comments(id)` ON DELETE SET NULL
- Liquibase changeset (next available number — verify in plan; check `backend/src/main/resources/db/changelog/` for the latest changeset filename)
- `Post.java` field with getter/setter
- `PostMapper` populates `questionResolvedCommentId` in `PostDto`
- `PostDto` record gains `questionResolvedCommentId: UUID` (nullable)
- OpenAPI `PostDto` schema gains the field with `nullable: true`

**4.4 does NOT add `expires_at`** (per MPD-2).

### R8 — `PostDto` does NOT have questionResolvedCommentId

`backend/src/main/java/com/worshiproom/post/dto/PostDto.java` (37 lines, full record):

No `questionResolvedCommentId` field. 4.4 adds it.

### R9 — `PostController` has no resolve endpoint

`backend/src/main/java/com/worshiproom/post/PostController.java`:

- `grep -n 'resolve\|helpful'` returns no matches
- Existing endpoints: POST /api/v1/posts (create), GET /api/v1/posts (list), GET /api/v1/posts/{id} (read), PATCH /api/v1/posts/{id} (update), DELETE /api/v1/posts/{id} (delete), plus engagement / bookmark / reaction endpoints

**4.4 adds:** `PATCH /api/v1/posts/{id}/resolve` — see D6 for the endpoint contract.

### R10 — `prayerWallApi.ts` has no resolveQuestion method

The frontend API client at `frontend/src/services/prayer-wall-api.ts` (or similar — verify path during plan) currently has methods for create / list / get / update / delete / react / bookmark / comment. No resolve method.

**4.4 adds:** `prayerWallApi.resolveQuestion(postId, commentId)` — issues PATCH /api/v1/posts/{postId}/resolve with body `{ commentId }`.

### R11 — Lucide `HelpCircle` and `CheckCircle2` icons availability

- `HelpCircle`: standard Lucide icon, used widely. Plan can grep node_modules to confirm.
- `CheckCircle2`: standard Lucide icon (variant of `Check`/`CheckCircle`). Used by ResolvedBadge per D12.

If either fails to resolve, the plan picks a fallback (`MessageCircleQuestion` for HelpCircle, `BadgeCheck` or `CircleCheck` for CheckCircle2).

### R12 — Cyan palette in Tailwind

Same concern as 4.3's amber: verify `bg-cyan-500/[0.04]` and `border-cyan-200/10` compile under the project's Tailwind config. If cyan is in the default palette (it is by default), it should work. If a custom palette excludes it, fall back to `bg-[#06b6d4]/[0.04]` (cyan-500 hex) and `border-[#a5f3fc]/10` (cyan-200 hex).

### R13 — `PostCommentService` write methods

`backend/src/main/java/com/worshiproom/post/comment/PostCommentService.java` exists and handles create/update/delete with rate limiting, idempotency, and crisis detection.

For the resolve endpoint, the cleanest place to put the new method is `PostService.resolveQuestion(...)` (since the operation primarily mutates a Post field). PostService already has the author-ownership pattern from update/delete:

```java
// Existing pattern in PostService.updatePost / deletePost
if (!post.getUserId().equals(currentUserId)) {
    throw new PostForbiddenException();
}
```

Reuse this pattern in `resolveQuestion`. Throw `PostForbiddenException` (HTTP 403, code `POST_FORBIDDEN`) when a non-author tries to resolve.

### R14 — `PostExceptionHandler` handles existing exceptions

`backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` already maps PostForbiddenException, PostNotFoundException, ContentTooLongException, InvalidPostTypeException, etc. to standardized error responses.

**For 4.4:** add new exception types if needed:

- `PostNotAQuestionException` (HTTP 400, code `INVALID_POST_TYPE_FOR_RESOLVE`) — thrown when resolving a non-question post
- `CommentNotFoundException` (HTTP 404, code `COMMENT_NOT_FOUND`) — if there's an existing one in the comment package, reuse it; otherwise add to the `post.comment` package
- `CommentNotForThisPostException` (HTTP 400, code `COMMENT_POST_MISMATCH`) — thrown when the comment's postId doesn't match the path postId

Verify in plan whether `CommentNotFoundException` already exists at `backend/src/main/java/com/worshiproom/post/comment/PostCommentNotFoundException.java` — if so, reuse it.

### R15 — `useAuth` hook and current user access pattern

The frontend has a `useAuth()` hook that exposes `{ user, isAuthenticated }`. Pattern is well-established across the codebase (used in PrayerWall.tsx, AuthModalProvider, etc.). For 4.4's author-only conditional on the 'This helped' button:

```typescript
const { user } = useAuth()
const isPostAuthor = user?.id === postAuthorId
const showHelpedButton = postType === 'question' && isPostAuthor && !comment.isDeleted
```

The `user?.id` lookup is undefined when not authenticated, so `user?.id === postAuthorId` is false — no leakage. CC sometimes writes `user.id` (no optional chaining) which crashes for unauthenticated users; reject that.

### R16 — `PostMapper` maps Post to PostDto

`backend/src/main/java/com/worshiproom/post/PostMapper.java` exists and contains the field-by-field mapping. 4.4 adds the new `questionResolvedCommentId` mapping in this file:

```java
return new PostDto(
    post.getId(),
    post.getPostType().wireValue(),
    // ... all existing fields ...
    post.getLastActivityAt(),
    new AuthorDto(...),
    post.getQuestionResolvedCommentId()  // ← NEW field at end of constructor call
);
```

The PostDto record's positional argument order matters — adding the new field at the END of the record minimizes git-diff churn. (Adding it in a middle position would shift every subsequent field's position number, breaking any code that constructs PostDto positionally.)

### R17 — `prayer-wall.ts` PrayerRequest type extension surface

`frontend/src/types/prayer-wall.ts`:

Currently has `postType: PostType` (required since 4.2) and various optional fields including `scriptureReference?: string`. 4.4 adds:

```typescript
// inside PrayerRequest interface, near the bottom alongside other Phase 3.7+ fields
questionResolvedCommentId?: string  // optional; null/undefined = unresolved
```

PrayerComment interface (from R4):

```typescript
parentCommentId?: string
isHelpful?: boolean
replies?: PrayerComment[]
```

### R18 — Mock data files and test fixture audit

`frontend/src/mocks/prayer-wall-mock-data.ts` (or wherever the mock prayers and comments live — verify path during plan) needs to be updated:

- Add testimony fixtures (4.3 already covered) — leave alone
- Add question fixtures with `postType: 'question'`
- Some question fixtures should have `questionResolvedCommentId` set (resolved variant)
- Some comment fixtures should have `isHelpful: true` (only ONE per question — the resolve invariant)
- Some comment fixtures should have `parentCommentId` set (verifying the field flows through, even though render is flat)

The mocked feed should include AT LEAST: 1 question with no comments, 1 question with comments but no resolved, 1 question with resolved (comment marked helpful), 1 question by 'current user' (so the 'This helped' button can be exercised).

### R19 — `PostService` createPost flow accommodates question already

PostService.createPost already accepts `postType: 'question'` because:

- `PostType.QUESTION` enum value exists (R1 of 4.3 confirmed all 5 values present)
- The `(postType == PRAYER_REQUEST || postType == DISCUSSION) && category == null` check excludes question (R6)
- The current `> 2000` content length check applies; after 4.3 ships, the per-type `maxContentLengthFor(postType)` returns 2000 for question by default

**Implication:** no PostService.createPost changes for question post creation. Only the new `resolveQuestion` method is added.

### R20 — `_plans/post-1.10-followups.md` next available section

Per Spec 4.3's brief, the next available section number is likely §27 (testimony activity bonus), §28 (testimony scripture-pair selector), §29 (testimony per-type reaction labels). 4.4 adds:

- §X. Threaded comment rendering (per MPD-3)

The planner reads `_plans/post-1.10-followups.md` to confirm the current numbering and uses the next available number. Don't hardcode §30 — verify.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The 13 invariants from Phase 3. For 4.4, the post-creation path is unchanged (questions go through the same flow as prayer_request and testimony); the new resolve endpoint is a separate path that needs its own analysis.

| # | Gate | Applies to 4.4? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check (createPost) | N/A for resolve | Resolve is not a create — no idempotency key required. The PATCH operation is naturally idempotent (same input → same final state). |
| 2 | Rate-limit consumption order (createPost) | Applies | Resolve endpoint should be rate-limited (e.g., 30 resolves per user per hour) to prevent abuse. Reuse existing `PostsRateLimitService` or create a new lighter limiter. **Decision in D6.** |
| 3 | Cross-field validation | **Applies — modified** | Resolve endpoint validates: (a) post.postType == QUESTION, (b) comment.postId == path postId, (c) comment exists and not deleted. Three-way validation, atomic. |
| 4 | HTML sanitization BEFORE length check | N/A | Resolve doesn't accept user content; no sanitization needed. |
| 5 | Length check after sanitization | N/A | Same — no content. |
| 6 | Crisis detection on sanitized content | N/A | Same. |
| 7 | AFTER_COMMIT crisis event publishing | N/A | Same. |
| 8 | Activity recording (PRAYER_WALL ActivityType) | N/A per MPD-1 | Resolve does not emit activity. |
| 9 | EntityManager refresh for DB defaults | **Applies** | After resolve updates `posts.question_resolved_comment_id` and `post_comments.is_helpful`, the response must reflect the latest DB state. The save-then-refresh pattern from createPost applies — though for resolve, both rows are explicitly mutated (no DB-DEFAULT fallback), so refresh is more about consistency-via-flush than DB defaults. |
| 10 | Logging IDs only (no content) | Applies | The resolve log line is `log.info("questionResolved postId={} userId={} commentId={} requestId={}", ...)` — no content fields. |
| 11 | `ContentTooLongException` error code/message contract | N/A | Resolve doesn't deal with content length. |
| 12 | JSR-303 enforcement BEFORE service-layer rules | Applies | The resolve endpoint's path param `postId` and body field `commentId` need `@Valid` + UUID format validation. |
| 13 | PostType wire-format ↔ Java enum drift sync | Applies (unchanged) | No new post types added. The enabling of question.enabled on the frontend doesn't change the wire format. The drift test continues to pass. |

**New gate introduced by 4.4: Atomic resolve operation.**

The resolve endpoint mutates two rows: a `posts` row (sets `question_resolved_comment_id`) and a `post_comments` row (sets `is_helpful = true`). When moving the helpful marker from one comment to another, THREE rows touch (the previous helpful comment gets `is_helpful = false`, the new one gets `is_helpful = true`, the post gets the new pointer).

All of these MUST happen in a single Spring transaction (`@Transactional` on the service method). If any step fails, all roll back. If the transaction commits, all state is consistent.

**Test surface for atomicity:**

- Mock the JPA repository to throw mid-transaction → assert all writes roll back
- Concurrent resolve requests on the same question → last write wins (per default isolation), but neither corrupts the data
- Resolve a comment that was just deleted by the comment author (race condition) → returns 404 cleanly, no partial state

This is documented in W12.

---

## 7. Decisions and divergences

### D1 — Activity engine deferral (mirrors 4.3's MPD-3)

Already covered in MPD-1. Restated as a Decision: 4.4 emits `ActivityType.PRAYER_WALL` for question creation, no new activity type added. Resolve does not emit activity.

**Alternative considered:** Add `QUESTION_RESOLVED` activity type for the moment of resolution (like a Stack Overflow accepted-answer notification).
**Rejected because:** Same cross-cutting cost as 4.3's deferred testimony bonus; not worth the dual-write parity churn for a polish item.

### D2 — Question expiry deferred (mirrors MPD-2)

Already covered. No `expires_at` column. Resolve does not touch any expiry-related field.

### D3 — Question content limit stays at 2000 (no 5000-char expansion)

Already covered in MPD-5.

```typescript
// Updated POST_TYPE_LIMITS.question entry in content-limits.ts
question: {
  max: 2000,
  warningAt: 1600,
  dangerAt: 1900,
  visibleAt: 1000,
},
```

### D4 — Backend schema delta is one column + foreign key

Already covered in MPD-4 / R7. Liquibase changeset:

```xml
<changeSet id='2026-05-XX-001-add-posts-question-resolved-comment-id' author='claude'>
    <addColumn tableName='posts'>
        <column name='question_resolved_comment_id' type='UUID'>
            <constraints nullable='true'
                         foreignKeyName='fk_posts_question_resolved_comment'
                         referencedTableName='post_comments'
                         referencedColumnNames='id'
                         deleteCascade='false' />
        </column>
    </addColumn>
    <!-- ON DELETE SET NULL: when a comment is deleted, the resolved pointer is auto-cleared.
         Liquibase's `deleteCascade='false'` doesn't express SET NULL directly — use rawSql for it. -->
    <sql>
        ALTER TABLE posts
            DROP CONSTRAINT IF EXISTS fk_posts_question_resolved_comment;
        ALTER TABLE posts
            ADD CONSTRAINT fk_posts_question_resolved_comment
            FOREIGN KEY (question_resolved_comment_id)
            REFERENCES post_comments(id)
            ON DELETE SET NULL;
    </sql>
</changeSet>
```

**Verify in plan:** the existing Liquibase changesets use `<constraints foreignKeyName='...' referencedTableName='...' referencedColumnNames='...' />` syntax; pick the syntax that matches the project's prior patterns (the project may have a preferred format that handles ON DELETE SET NULL natively).

### D5 — Resolve endpoint contract

```
PATCH /api/v1/posts/{postId}/resolve
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "commentId": "uuid-of-comment-to-mark-helpful"
}
```

**Response 200:** Updated PostDto with `questionResolvedCommentId` populated. (Returns the post, not the comment — the post is the canonical mutation target.)

**Error responses:**

- `400 INVALID_POST_TYPE_FOR_RESOLVE` — post.postType is not QUESTION
- `400 COMMENT_POST_MISMATCH` — comment.postId does not match path postId
- `404 POST_NOT_FOUND` — post does not exist (or is soft-deleted)
- `404 COMMENT_NOT_FOUND` — comment does not exist (or is soft-deleted)
- `403 POST_FORBIDDEN` — current user is not the post author
- `401 UNAUTHENTICATED` — no JWT or invalid JWT
- `429 RATE_LIMITED` — too many resolves in the current window (D6)

**Idempotency:** Marking the same comment helpful twice in a row is a no-op (returns 200 with unchanged state). Marking a different comment moves the marker (sets old to false, new to true, updates post pointer) atomically.

**Unresolve:** The endpoint does NOT support clearing `questionResolvedCommentId` (i.e., 'unmarking' a helpful comment). Once an author marks a comment helpful, they can move the marker but not remove it. Reasoning: simplification — the unresolve UX would require its own button + confirmation, and an author who wants to 'un-resolve' can just mark a different comment as helpful (effectively replacing the prior).

**Decision call:** if Eric wants unresolve in 4.4, the contract gains a `commentId: null` body variant. For this brief, unresolve is OUT OF SCOPE.

### D6 — Resolve endpoint rate-limit

A separate rate-limit bucket: 30 resolves per user per hour. Reuse the existing `PostsRateLimitService` infrastructure if its bucket can be parameterized; otherwise create a lightweight `ResolveRateLimitService` mirroring the existing pattern.

**Verify in plan:** how PostsRateLimitService is structured — is it a single global bucket per user or one bucket per action type? If parameterizable, reuse. If not, copy the pattern.

The 30/hour limit is generous (a thoughtful question author might revise their helpful pick a few times as comments come in) without being permissive enough to enable abuse.

### D7 — Foreign key ON DELETE SET NULL

Already covered in D4. When a helpful comment is later deleted by its author, the `question_resolved_comment_id` is auto-cleared. The question returns to unresolved state. The post author can re-resolve by marking a different comment.

This is a desirable behavior — keeps invariants tight without requiring application-level cleanup.

### D8 — 'This helped' button copy and styling

Button copy:

- Default state (comment is not helpful): `'This helped'`
- Active state (comment IS helpful): `'Most helpful'` (button still tappable; tapping toggles to a different comment per the move-marker semantics)

Sentence case. No exclamation. Matches the calm, attribution-driven brand voice.

Styling: small text button, similar to the existing `Reply` button:

```typescript
<button
  type='button'
  onClick={() => onResolve(comment.id)}
  className='mt-1 min-h-[44px] px-2 text-xs text-cyan-300/70 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:rounded sm:min-h-0 sm:px-0'
  aria-label={comment.isHelpful ? 'Marked as most helpful' : 'Mark this comment as most helpful'}
>
  {comment.isHelpful ? 'Most helpful' : 'This helped'}
</button>
```

The button sits inline with the existing Reply button — both render in the comment's footer row. Plan verifies the resulting layout doesn't wrap awkwardly on narrow viewports (mobile).

### D9 — Resolve operation idempotency

Marking the SAME comment helpful when it is already helpful → no-op. Service:

```java
if (comment.isHelpful() && commentId.equals(post.getQuestionResolvedCommentId())) {
    // Idempotent — return current state without touching DB
    return postMapper.toDto(post, ...);
}
```

This avoids generating a DB write for a no-op AND avoids triggering any downstream side-effects (last-modified updates, etc.).

Marking a DIFFERENT comment helpful when one is already helpful → atomic move (D10).

### D10 — Atomic move semantics

When a question already has a resolved comment and the author taps 'This helped' on a different comment:

1. Find the old helpful comment via `post.getQuestionResolvedCommentId()` (might be null if first resolve)
2. If old != null: set `oldComment.setHelpful(false)` and `commentRepository.save(oldComment)`
3. Set `newComment.setHelpful(true)` and `commentRepository.save(newComment)`
4. Set `post.setQuestionResolvedCommentId(newCommentId)` and `postRepository.save(post)`
5. All within a single `@Transactional` boundary

If step 2 or 3 fails (e.g., the old comment was just deleted in another transaction), the whole resolve transaction rolls back. The author retries.

### D11 — Composer subline (NEW UX element for question)

Master plan body specifies: `'Other believers can share their experience or scripture they have leaned on'`

This is a NEW element (4.3 testimony composer didn't have a subline). 4.4 introduces subline support to `composerCopyByType`:

```typescript
// In InlineComposer.tsx composerCopyByType map, extend the type signature:
const composerCopyByType: Record<PostType, {
  header: string
  subline?: string  // NEW — only set for question (and possibly future types)
  placeholder: string
  ariaLabel: string
  submitButton: string
  footerNote: string
  showCategoryFieldset: boolean
  showChallengeCheckbox: boolean
  showAttributionNudge: boolean
}> = {
  // ... existing entries unchanged ...
  question: {
    header: 'Ask a question',
    subline: 'Other believers can share their experience or scripture they have leaned on.',
    placeholder: 'What are you wondering about?',
    ariaLabel: 'Question',
    submitButton: 'Submit Question',
    footerNote: 'Your question will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAttributionNudge: false,
  },
  // ...
}
```

In the component body:

```typescript
<h2 className='mb-1 text-lg font-semibold text-white'>{copy.header}</h2>
{copy.subline && (
  <p className='mb-4 text-sm text-white/60'>{copy.subline}</p>
)}
```

The subline ONLY renders when defined. For prayer_request and testimony, the field is undefined and the `<p>` element is skipped. No layout regression.

### D12 — ResolvedBadge placement in CommentItem

The badge renders inline next to the author name when `comment.isHelpful === true`:

```typescript
<div className='flex items-baseline gap-1.5'>
  <span className='text-sm font-semibold text-white'>
    {comment.authorName}
  </span>
  {comment.isHelpful && <ResolvedBadge />}
  <span className='text-xs text-white/40'> &mdash; </span>
  <time dateTime={comment.createdAt} className='text-xs text-white/60'>
    {timeAgo(comment.createdAt)}
  </time>
</div>
```

The badge appears between the author name and the em-dash separator. On narrow viewports, the flex-wrap behavior pushes the timestamp to a new line if needed (existing behavior — see CommentItem.tsx baseline class).

**No layout regression for non-helpful comments** — when `isHelpful === false`, the badge is not rendered (conditional renders to nothing, no empty span).

### D13 — Copy strings (full inventory)

| Element | Copy | Pastor's wife test |
| --- | --- | --- |
| Composer header | `'Ask a question'` | ✓ Direct, calm |
| Composer subline | `'Other believers can share their experience or scripture they have leaned on.'` | ✓ Inviting, no urgency |
| Composer placeholder | `'What are you wondering about?'` | ✓ Open question |
| Composer aria-label | `'Question'` | ✓ Descriptive |
| Composer submit | `'Submit Question'` | ✓ Workmanlike |
| Composer footer | `'Your question will be shared with the community. Be kind and respectful.'` | ✓ Standard |
| Success toast | `'Your question is on the wall. Others can weigh in.'` | ✓ Calm invitation |
| Auth modal CTA | `'Sign in to ask a question'` | ✓ Standard |
| Article aria-label | `'Question by {authorName}'` | ✓ Descriptive |
| 'This helped' button (default) | `'This helped'` | ✓ Sentence case, no exclamation |
| 'This helped' button (active) | `'Most helpful'` | ✓ Calm |
| Button aria-label (default) | `'Mark this comment as most helpful'` | ✓ Descriptive |
| Button aria-label (active) | `'Marked as most helpful'` | ✓ Past-tense state |
| ResolvedBadge text | `'Most helpful'` | ✓ Matches button active state |
| ResolvedBadge aria-label | `'Most helpful comment, marked by post author'` | ✓ Descriptive for screen readers |

Anti-patterns to flag if any creep in (mirrors 4.3 W9):
- Exclamations ('Submit your question!', 'Got it!')
- Urgency ('Ask now', 'Don't wait')
- Comparison ('Get the best answer')
- Therapy-app jargon ('Process this with the community')
- Streak/shame
- False scarcity

### D14 — No attribution nudge for question

Unlike testimony (which has the 'Testimonies often mean more when others know who they came from' nudge), question keeps the anonymous toggle WITHOUT a nudge. Reasoning: a question is often vulnerability-adjacent ('I'm doubting…', 'I'm struggling with…'), and pushing toward attribution there could backfire — people who would otherwise ask anonymously might just not ask. Default to no pressure.

`composerCopyByType.question.showAttributionNudge: false`

### D15 — No challenge-prayer checkbox for question

Questions are not part of the daily prayer challenge system. Hide the checkbox entirely.

`composerCopyByType.question.showChallengeCheckbox: false`

### D16 — No category fieldset for question

Per R6, the backend already excludes question from required-category. Hide the fieldset.

`composerCopyByType.question.showCategoryFieldset: false`

### D17 — Article aria-label

Adding to the existing `articleAriaLabel` switch in PrayerCard.tsx (introduced by 4.3):

```typescript
case 'question':
  return `Question by ${prayer.authorName}`
```

### D18 — Mock data: include 'current user' as a question author

For the 'This helped' button to be exercisable in mocks, at least one mock question must have `userId` matching the authenticated mock user's id. Plan verifies the mock user pattern (search for 'mockCurrentUser' or similar in `frontend/src/mocks/`) and adds a fixture.

### D19 — Optimistic update on resolve

The frontend mutation hook uses an optimistic update pattern:

1. User taps 'This helped' on a comment
2. Frontend immediately:
   - Sets `comment.isHelpful = true` in local state
   - Sets the previous helpful comment's `isHelpful = false` (if any)
   - Sets `post.questionResolvedCommentId = comment.id` in local state
3. UI re-renders: badge moves, button text updates
4. Backend PATCH /api/v1/posts/{id}/resolve fires asynchronously
5. On success: server response confirms the new state (no UI change since optimistic was correct)
6. On failure: rollback the local state changes, show a toast 'Could not mark as helpful. Try again.'

This pattern is consistent with the existing reaction-toggle / bookmark-toggle hooks in the codebase (verify pattern in plan).

### D20 — `recordActivity` description string for question

Question's createPost emits `'prayer-wall-post'` (same as prayer_request and testimony — see W26 of 4.3). Don't introduce 'question-post' as a description. Keep the description constant; the differentiator is `postType`.

---

## 8. Watch-fors

### W1 — 4.3 must ship before 4.4 starts

The brief assumes 4.3's per-type infrastructure exists (POST_TYPE_LIMITS map, composerCopyByType map, successToastByType map, authModalCtaByType map, per-type chrome switch in PrayerCard, ResolvedBadge precedent... actually no, ResolvedBadge is new in 4.4, but the per-type chrome system precedes it). If 4.3 hasn't shipped:

- POST_TYPE_LIMITS doesn't exist
- composerCopyByType doesn't exist
- The chrome switch in PrayerCard doesn't exist
- Many tests depend on 4.3-introduced patterns

**Action:** verify 4.3 is ✅ in spec-tracker.md AND verify the actual 4.3 deliverables exist on disk (search for `POST_TYPE_LIMITS` in `content-limits.ts`, search for `composerCopyByType` in `InlineComposer.tsx`). If either is missing, STOP and ask Eric to ship 4.3 first.

### W2 — `parentCommentId` field is consumed but NOT visually rendered

The `PrayerComment` type extension in R4 / MPD-3 adds `parentCommentId?: string` to the type. But CommentsSection still renders flat. Don't accidentally start rendering nested replies — that's the deferred follow-up.

If CC sees `replies?: PrayerComment[]` on the type and starts walking the tree to render hierarchy, STOP. Per MPD-3, the threading UI is deferred. The `replies` field is only present on the type for completeness; it's not consumed by 4.4 rendering.

### W3 — `is_helpful` column already exists — DO NOT add a Liquibase changeset for it

R3 confirms the column is in the DB schema from Phase 3. Adding a duplicate changeset would fail Liquibase's checksum validation and break the migration on next startup.

If CC writes a changeset like `add-is-helpful-column.xml`, REJECT in /code-review. The only schema delta is `posts.question_resolved_comment_id`.

### W4 — `parent_comment_id` column already exists — DO NOT add a Liquibase changeset for it

Same as W3. The column was added in Phase 3.

### W5 — Resolve endpoint is PATCH, not POST

The endpoint is `PATCH /api/v1/posts/{id}/resolve`. Not POST. Not PUT. The path includes `/resolve` as a sub-resource indicator (RPC-flavored), but the verb is PATCH because the operation mutates a subset of post state.

CC sometimes defaults to POST for action endpoints. The plan should specify PATCH. The OpenAPI spec entry should specify PATCH. The Spring annotation should be `@PatchMapping`.

### W6 — Resolve endpoint authorization: post.userId, not comment.userId

The resolve endpoint authorizes based on the POST author, not the comment author. The check is:

```java
if (!post.getUserId().equals(currentUser.getUserId())) {
    throw new PostForbiddenException();
}
```

Not:

```java
// WRONG
if (!comment.getUserId().equals(currentUser.getUserId())) {
    throw new PostForbiddenException();
}
```

The post author marks any comment on their question helpful. The comment author has no role in resolution.

### W7 — Don't conflate AnsweredBadge and ResolvedBadge

`AnsweredBadge.tsx` is the existing badge for `prayer.isAnswered === true` (used on answered prayer_request posts). `ResolvedBadge.tsx` is the new badge for `comment.isHelpful === true` (used on the helpful comment of a question post).

These are visually similar but semantically distinct components. Don't:
- Pass an `isAnswered` prop to ResolvedBadge
- Pass a `comment` prop to AnsweredBadge
- Refactor them into a single `<StatusBadge>` component (the conditional logic would obscure both)

### W8 — Don't render 'This helped' button on non-question post types

Even when the current user IS the post author, the button should NOT render on prayer_request, testimony, discussion, or encouragement posts. The conditional is:

```typescript
const showHelpedButton = postType === 'question'
  && currentUserId === postAuthorId
  && !comment.isDeleted
```

NOT:

```typescript
// WRONG — leaks the button onto all post types
const showHelpedButton = currentUserId === postAuthorId && !comment.isDeleted
```

### W9 — Don't render 'This helped' button to non-authors

When the current user is NOT the post author, the button does NOT render at all (not disabled, not greyed out — entirely absent from the DOM). Reasoning:

- Disabled buttons advertise functionality the user can't access ('this is where the author would mark helpful, but you can't')
- The role of helpful-marking is private to the author; non-authors shouldn't even be aware it's happening from the UI
- If a comment is marked helpful, non-authors see the ResolvedBadge (so they know the author found that comment helpful), but they don't see any way to mark or unmark

### W10 — Don't render 'This helped' button on the author's OWN comments

A subtle case: if the post author also adds a comment to their own question, should they be able to mark their own comment helpful?

**Decision: yes, technically allowed.** A genuine question author might add a follow-up comment that synthesizes the discussion; they should be able to mark their own synthesis as helpful for future readers.

But: this is uncommon and the UI doesn't need to optimize for it. Just don't ADD a guard against it. The button renders for the author on every comment of their question, including their own.

If during /code-review CC adds `comment.userId !== currentUserId` to the conditional, push back — that's an over-restriction.

### W11 — Don't trust client-side author check for security

The frontend hides the 'This helped' button when current user != post author. This is UX, not security. The backend MUST enforce the same check via PostForbiddenException — a malicious user could manually fire a PATCH /api/v1/posts/{id}/resolve via curl bypassing the UI entirely.

Backend test: as user B (not the author), call PATCH /api/v1/posts/{id-of-user-A's-question}/resolve → expect 403.

### W12 — Atomic resolve: all-or-nothing transaction

D10 covers the move semantics. The implementation MUST be `@Transactional`. A non-transactional implementation could:
- Set `oldComment.is_helpful = false` (succeed)
- Crash before setting `newComment.is_helpful = true`
- Leave the post pointing at a now-not-actually-helpful comment

Spring's default propagation is REQUIRED, so just adding `@Transactional` to `PostService.resolveQuestion` covers the boundary. Verify the annotation is present.

Test surface: mock `commentRepository.save(newComment)` to throw → assert that `oldComment.is_helpful` is unchanged in the database (rolled back).

### W13 — Resolve a soft-deleted comment → 404, not silent success

If a comment was just soft-deleted (`is_deleted = true`) when the author taps 'This helped':

- The service queries with `is_deleted = false` filter
- Returns empty Optional
- Throws `CommentNotFoundException` (404)
- Frontend rolls back the optimistic update and shows a toast: 'That comment was just removed. Pick another.'

DO NOT silently succeed by marking a deleted comment helpful — that's a referential-integrity nightmare.

### W14 — Resolve a soft-deleted post → 404

Same reasoning. If the post was soft-deleted between the user opening the page and tapping 'This helped', the service throws PostNotFoundException (404).

### W15 — Optimistic UI rollback must restore the previous helpful comment

Per D19, optimistic update sets `oldComment.isHelpful = false` and `newComment.isHelpful = true` immediately. On backend failure, BOTH must roll back:

```typescript
const previousHelpfulCommentId = post.questionResolvedCommentId
const newCommentId = comment.id

// optimistic update
setComments(prev => prev.map(c => ({
  ...c,
  isHelpful: c.id === newCommentId
})))
setPost(prev => ({ ...prev, questionResolvedCommentId: newCommentId }))

try {
  await prayerWallApi.resolveQuestion(post.id, newCommentId)
  // success — no UI change needed
} catch (err) {
  // rollback
  setComments(prev => prev.map(c => ({
    ...c,
    isHelpful: c.id === previousHelpfulCommentId  // restore old, even if it was undefined
  })))
  setPost(prev => ({ ...prev, questionResolvedCommentId: previousHelpfulCommentId }))
  showToast('Could not mark as helpful. Try again.')
}
```

If CC implements rollback as 'set everything to false', that loses the previous helpful state on failure — a regression. The rollback must restore the EXACT prior state.

### W16 — Concurrent resolve attempts: last-write-wins is acceptable

Two users (... wait, only one user can resolve — the post author, who is a single user with a single session typically). Edge case: same user with two open tabs taps 'This helped' on different comments at near-same time.

Default JPA isolation handles this fine — last-write-wins, both transactions complete successfully, the post ends up with whichever commentId was committed last. Don't over-engineer optimistic locking. The author would just see one tab show the wrong helpful state until they refresh.

This is a 'known minor inconsistency' under multi-tab concurrent edits. Document in plan if asked, otherwise move on.

### W17 — `useAuth().user?.id` not `useAuth().user.id`

CC sometimes writes `user.id` without the optional chaining when the type allows null. For unauthenticated users, `user` is null, so `user.id` crashes. The author conditional must use `user?.id`:

```typescript
const isPostAuthor = user?.id === postAuthorId
// not: const isPostAuthor = user.id === postAuthorId
```

Verify in /code-review.

### W18 — `useAuth` hook usage in CommentItem

CommentItem currently doesn't import `useAuth`. Adding the import + hook call is a minor refactor. Plan should specify the exact location and ensure the hook is called at the top of the function (Hooks rules — no conditional calls).

### W19 — Cyan palette compilation (mirrors 4.3's amber)

Per R12. Verify Tailwind config for cyan availability. Same fallback pattern as 4.3's amber if the wash renders transparent.

### W20 — Don't add expires_at column

Per MPD-2. If CC's plan or execution touches `posts.expires_at` in any form (even just adding a nullable column 'for future use'), STOP. That's Phase 6's territory. 4.4 is purely about resolved-state; expiry is unrelated.

### W21 — Don't add unresolve endpoint

Per D5. The endpoint accepts `commentId: <uuid>` only. No null-commentId variant. No DELETE /api/v1/posts/{id}/resolve. If CC adds either, push back during /code-review.

The only way to 'unresolve' (in 4.4) is to mark a different comment helpful. There's no path back to 'no helpful comment' once one has been marked.

### W22 — Don't introduce 'helpful comment count'

Some Stack Overflow-like systems show 'X helpful answers' on the question card. Resist. The 4.4 model is exactly-one-helpful-per-question. The card just shows the question content, with the helpful comment marker visible inside the comments section (when expanded).

### W23 — Threading UI is deferred (per MPD-3)

If CC starts building hierarchical comment rendering, indentation, 'see N replies' toggles — STOP. That's the follow-up. 4.4's CommentsSection renders flat exactly as it does today.

### W24 — Don't auto-collapse the comments section after resolve

The comments section is currently controlled by an `isOpen` state in the parent (PrayerCard or PrayerDetail). When the author resolves a comment, the comments section should STAY OPEN — they may want to keep reading or revise their pick. Don't add side-effects that close the section.

### W25 — Don't show 'This helped' button on encouragement (4.6) or discussion (4.5) post types

Even though those types support comments, the helpful-marker is question-specific. The conditional is `postType === 'question'` (D8 / W8). When 4.5 and 4.6 ship and add their own composer entries, this conditional must remain restrictive.

### W26 — Don't expose internal `is_deleted` filtering to the API contract

The CommentDto already filters out soft-deleted comments at the mapper layer. The 'This helped' button on a deleted comment doesn't render because the deleted comment doesn't render. But if the author had the page open BEFORE the comment was deleted, their tap would 404. That's the right behavior (W13).

Don't add a frontend guard that explicitly checks `comment.isDeleted` — the deleted comment isn't even in the local state. The `!comment.isDeleted` in W8's conditional is defensive but should rarely fire.

### W27 — Don't issue resolve from non-authenticated state

The resolve mutation hook should check `isAuthenticated` before firing. If unauthenticated (somehow — the button is hidden so this is defense-in-depth):

```typescript
const handleResolve = (commentId: string) => {
  if (!isAuthenticated) {
    openAuthModal('Sign in to mark a comment as helpful')
    return
  }
  // ... fire mutation
}
```

The auth-modal copy `'Sign in to mark a comment as helpful'` is added to a new lookup table or inline at the call site (it's not a per-post-type CTA — it's the resolve-specific CTA).

### W28 — Don't store author ID in localStorage

The author check is purely runtime — fetch user via `useAuth()`. Don't cache `currentUserId` in localStorage or sessionStorage. The auth state is the source of truth.

### W29 — Don't include questionResolvedCommentId on non-question posts

PostMapper populates `questionResolvedCommentId` for all post types because the field is on the Post entity. For prayer_request, testimony, discussion, encouragement posts, the field will always be null (since they can't be resolved). The frontend ignores the field on non-question posts.

If CC adds frontend logic to render a ResolvedBadge based on `prayer.questionResolvedCommentId !== null` WITHOUT also checking `prayer.postType === 'question'`, that's a leak. Always pair the checks.

### W30 — Don't break the existing comment count when a comment is marked helpful

`post.comment_count` is incremented when a comment is created and decremented when a comment is soft-deleted. Marking a comment helpful does NOT touch comment_count. If CC accidentally writes `post.setCommentCount(post.getCommentCount() + 1)` in the resolve flow, that's a bug.

The resolve operation is purely metadata — no engagement counts are affected.

### W31 — Mock data: the resolve flow needs a 'current user' as question author

Per D18. The mocks must include at least one question fixture authored by the mock-current-user, so the 'This helped' button is exercisable. If all questions are authored by other users, the only way to verify the button is via a manual override in tests.

### W32 — Don't change the activity log description for question posts

Per D20. PostService.createPost logs `'prayer-wall-post'` as the activity description for all post types. Don't introduce per-type descriptions in 4.4.

### W33 — `hasMessageContaining` assertions in PostServiceTest are tied to D5's exception messages

Existing tests like 'createPost_with_2001_chars_throws_ContentTooLongException' use `.hasMessageContaining('2000 character limit')` (post-4.3 update). 4.4's new tests for resolve exceptions follow the same pattern:

- `PostNotAQuestionException`: message 'Cannot resolve a non-question post.' — assert via `.hasMessageContaining('non-question')`
- `CommentNotForThisPostException`: message 'Comment does not belong to this post.' — `.hasMessageContaining('does not belong')`

Verify the exact message text in the plan and write tests with stable substring assertions.

---

## 9. Test specifications

Target: ~30–36 tests across frontend + backend. Master plan AC says ≥18 — we exceed it because 4.4's surface (resolve endpoint, atomic operations, author-only conditionals, optimistic update + rollback) requires deeper coverage than 4.3's chrome-and-composer work.

### Frontend tests

**`frontend/src/constants/__tests__/post-types.test.ts`** (UPDATE existing):

- Update the 4.3-introduced split — flip `question.enabled` from `false` to `true` in the enabled assertion
- Update the disabled assertion to only cover discussion + encouragement
- Update the docstring to mention 4.4 enabling question

```typescript
it('prayer_request, testimony, and question are enabled', () => {
  expect(getPostType('prayer_request').enabled).toBe(true)
  expect(getPostType('testimony').enabled).toBe(true)
  expect(getPostType('question').enabled).toBe(true)
})

it('discussion, encouragement are disabled', () => {
  expect(getPostType('discussion').enabled).toBe(false)
  expect(getPostType('encouragement').enabled).toBe(false)
})
```

**`frontend/src/constants/__tests__/content-limits.test.ts`** (UPDATE existing — file created in 4.3):

- Update `POST_TYPE_LIMITS.question.max` assertion: was 1000 (prayer_request default), now 2000

```typescript
it('question limits are 2000 (default for non-testimony post types)', () => {
  expect(POST_TYPE_LIMITS.question.max).toBe(2000)
  expect(POST_TYPE_LIMITS.question.warningAt).toBe(1600)
  expect(POST_TYPE_LIMITS.question.dangerAt).toBe(1900)
  expect(POST_TYPE_LIMITS.question.visibleAt).toBe(1000)
})
```

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE existing, add 6 tests):

```typescript
describe('PrayerCard — question chrome', () => {
  it('renders question chrome classes when postType is question', () => {
    const questionPrayer = createMockPrayer({ postType: 'question', content: 'How do I...' })
    render(<PrayerCard prayer={questionPrayer} />)
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-cyan-500/[0.04]')
    expect(article.className).toContain('border-cyan-200/10')
  })

  it('does not render question chrome classes when postType is prayer_request', () => {
    const prayer = createMockPrayer({ postType: 'prayer_request' })
    render(<PrayerCard prayer={prayer} />)
    const article = screen.getByRole('article')
    expect(article.className).not.toContain('cyan')
  })

  it('does not render question chrome classes when postType is testimony', () => {
    const testimonyPrayer = createMockPrayer({ postType: 'testimony' })
    render(<PrayerCard prayer={testimonyPrayer} />)
    const article = screen.getByRole('article')
    expect(article.className).not.toContain('cyan')
    expect(article.className).toContain('amber')
  })

  it('renders HelpCircle icon for question posts', () => {
    const questionPrayer = createMockPrayer({ postType: 'question' })
    render(<PrayerCard prayer={questionPrayer} />)
    // Verify SVG with lucide-help-circle class or test-id
  })

  it('aria-label says "Question by {authorName}" for question posts', () => {
    const questionPrayer = createMockPrayer({ postType: 'question', authorName: 'Sarah' })
    render(<PrayerCard prayer={questionPrayer} />)
    expect(screen.getByLabelText('Question by Sarah')).toBeInTheDocument()
  })

  it('mixed feed renders correct chrome and icon for prayer_request, testimony, and question', () => {
    const prayers = [
      createMockPrayer({ id: '1', postType: 'prayer_request' }),
      createMockPrayer({ id: '2', postType: 'testimony' }),
      createMockPrayer({ id: '3', postType: 'question' }),
    ]
    render(<>{prayers.map(p => <PrayerCard key={p.id} prayer={p} />)}</>)
    const articles = screen.getAllByRole('article')
    expect(articles[0].className).toContain('bg-white/[0.06]')
    expect(articles[1].className).toContain('bg-amber-500/[0.04]')
    expect(articles[2].className).toContain('bg-cyan-500/[0.04]')
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE existing, add 7 tests):

```typescript
describe('InlineComposer — question variant', () => {
  it('renders question header copy when postType is question', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.getByText('Ask a question')).toBeInTheDocument()
  })

  it('renders question subline below header', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.getByText(/Other believers can share/)).toBeInTheDocument()
  })

  it('does NOT render subline for testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Other believers can share/)).not.toBeInTheDocument()
  })

  it('does NOT render subline for prayer_request', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='prayer_request' onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Other believers can share/)).not.toBeInTheDocument()
  })

  it('renders question placeholder when postType is question', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText('What are you wondering about?')).toBeInTheDocument()
  })

  it('textarea maxLength is 2000 for question (no 5000-char expansion)', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    const textarea = screen.getByLabelText('Question')
    expect(textarea).toHaveAttribute('maxLength', '2000')
  })

  it('category fieldset is hidden for question', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.queryByRole('radiogroup', { name: /category/i })).not.toBeInTheDocument()
  })

  it('challenge prayer checkbox is hidden for question', () => {
    // requires active challenge fixture
    expect(screen.queryByRole('checkbox', { name: /challenge/i })).not.toBeInTheDocument()
  })

  it('attribution nudge does NOT render for question', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Testimonies often mean more/)).not.toBeInTheDocument()
  })

  it('submit button label is "Submit Question" for question', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='question' onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /submit question/i })).toBeInTheDocument()
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/CommentItem.test.tsx`** (UPDATE existing OR CREATE if not present, add 8 tests):

```typescript
describe('CommentItem — this helped button', () => {
  it('renders this-helped button when current user is post author and postType is question', () => {
    mockUseAuth({ user: { id: 'user-1' }, isAuthenticated: true })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1' })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /mark this comment as most helpful/i })).toBeInTheDocument()
  })

  it('does NOT render this-helped button when current user is NOT the post author', () => {
    mockUseAuth({ user: { id: 'user-2' }, isAuthenticated: true })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1' })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /most helpful/i })).not.toBeInTheDocument()
  })

  it('does NOT render this-helped button when not authenticated', () => {
    mockUseAuth({ user: null, isAuthenticated: false })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1' })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /most helpful/i })).not.toBeInTheDocument()
  })

  it('does NOT render this-helped button on prayer_request post type even when current user is author', () => {
    mockUseAuth({ user: { id: 'user-1' }, isAuthenticated: true })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1' })}
        postType='prayer_request'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /most helpful/i })).not.toBeInTheDocument()
  })

  it('button label reads "This helped" when comment is not yet helpful', () => {
    mockUseAuth({ user: { id: 'user-1' }, isAuthenticated: true })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1', isHelpful: false })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.getByText('This helped')).toBeInTheDocument()
  })

  it('button label reads "Most helpful" when comment is helpful', () => {
    mockUseAuth({ user: { id: 'user-1' }, isAuthenticated: true })
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1', isHelpful: true })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    // Both the button label and ResolvedBadge text say 'Most helpful' — at least one of each appears
    expect(screen.getAllByText('Most helpful').length).toBeGreaterThanOrEqual(1)
  })

  it('clicking this-helped button calls onResolve with the comment id', async () => {
    mockUseAuth({ user: { id: 'user-1' }, isAuthenticated: true })
    const onResolve = vi.fn()
    const user = userEvent.setup()
    render(
      <CommentItem
        comment={createMockComment({ id: 'c-1', isHelpful: false })}
        postType='question'
        postAuthorId='user-1'
        onResolve={onResolve}
        onReply={vi.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /mark this comment as most helpful/i }))
    expect(onResolve).toHaveBeenCalledWith('c-1')
  })

  it('renders ResolvedBadge inline with author name when isHelpful is true', () => {
    render(
      <CommentItem
        comment={createMockComment({ authorName: 'Bob', isHelpful: true })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Most helpful comment, marked by post author')).toBeInTheDocument()
  })

  it('does NOT render ResolvedBadge when isHelpful is false', () => {
    render(
      <CommentItem
        comment={createMockComment({ isHelpful: false })}
        postType='question'
        postAuthorId='user-1'
        onResolve={vi.fn()}
        onReply={vi.fn()}
      />
    )
    expect(screen.queryByLabelText(/Most helpful comment/)).not.toBeInTheDocument()
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/ResolvedBadge.test.tsx`** (NEW file, 3 tests):

```typescript
describe('ResolvedBadge', () => {
  it('renders with the correct copy', () => {
    render(<ResolvedBadge />)
    expect(screen.getByText('Most helpful')).toBeInTheDocument()
  })

  it('has the correct aria-label', () => {
    render(<ResolvedBadge />)
    expect(screen.getByLabelText('Most helpful comment, marked by post author')).toBeInTheDocument()
  })

  it('accepts and applies a className override', () => {
    const { container } = render(<ResolvedBadge className='ml-2' />)
    expect(container.querySelector('span')?.className).toContain('ml-2')
  })
})
```

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE existing, add 3 tests):

- Successful question post shows question-specific toast `'Your question is on the wall. Others can weigh in.'`
- Unauthenticated question composer open uses question auth modal CTA `'Sign in to ask a question'`
- AnonymousWriteAttemptError on question submission uses question auth modal CTA

**`frontend/src/services/__tests__/prayer-wall-api.test.ts`** (UPDATE existing OR CREATE, add 4 tests):

- `prayerWallApi.resolveQuestion` issues PATCH with correct path
- `prayerWallApi.resolveQuestion` includes commentId in body
- `prayerWallApi.resolveQuestion` returns updated PostDto
- `prayerWallApi.resolveQuestion` propagates error responses

### Backend tests

**`backend/src/test/java/com/worshiproom/post/PostServiceTest.java`** (UPDATE existing, add 12 tests):

```java
@Test
void resolveQuestion_first_resolution_sets_post_pointer_and_comment_helpful() {
    // Setup: question post with one comment, both unresolved
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);

    PostDto result = postService.resolveQuestion(postId, commentId, authorId);

    assertThat(result.questionResolvedCommentId()).isEqualTo(commentId);
    PostComment comment = commentRepository.findById(commentId).orElseThrow();
    assertThat(comment.isHelpful()).isTrue();
}

@Test
void resolveQuestion_idempotent_when_marking_already_helpful_comment() {
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    postService.resolveQuestion(postId, commentId, authorId);  // First resolve

    PostDto result = postService.resolveQuestion(postId, commentId, authorId);  // Second resolve, same comment

    assertThat(result.questionResolvedCommentId()).isEqualTo(commentId);
    // No exception, no extra DB writes (verify via spy on repository)
}

@Test
void resolveQuestion_atomic_move_marks_new_unmarks_old() {
    UUID postId = createQuestion(authorId);
    UUID commentId1 = createComment(postId, anotherUserId);
    UUID commentId2 = createComment(postId, anotherUserId);
    postService.resolveQuestion(postId, commentId1, authorId);  // First resolve

    PostDto result = postService.resolveQuestion(postId, commentId2, authorId);  // Move to commentId2

    assertThat(result.questionResolvedCommentId()).isEqualTo(commentId2);
    PostComment c1 = commentRepository.findById(commentId1).orElseThrow();
    PostComment c2 = commentRepository.findById(commentId2).orElseThrow();
    assertThat(c1.isHelpful()).isFalse();
    assertThat(c2.isHelpful()).isTrue();
}

@Test
void resolveQuestion_throws_PostNotAQuestionException_for_prayer_request() {
    UUID postId = createPrayerRequest(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId))
        .isInstanceOf(PostNotAQuestionException.class);
}

@Test
void resolveQuestion_throws_PostNotAQuestionException_for_testimony() {
    UUID postId = createTestimony(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId))
        .isInstanceOf(PostNotAQuestionException.class);
}

@Test
void resolveQuestion_throws_PostForbiddenException_when_not_author() {
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, anotherUserId))
        .isInstanceOf(PostForbiddenException.class);
}

@Test
void resolveQuestion_throws_PostNotFoundException_when_post_soft_deleted() {
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    postRepository.softDelete(postId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId))
        .isInstanceOf(PostNotFoundException.class);
}

@Test
void resolveQuestion_throws_CommentNotFoundException_when_comment_soft_deleted() {
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    commentRepository.softDelete(commentId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId, authorId))
        .isInstanceOf(PostCommentNotFoundException.class);
}

@Test
void resolveQuestion_throws_CommentNotForThisPostException_when_comment_belongs_to_different_post() {
    UUID postId1 = createQuestion(authorId);
    UUID postId2 = createQuestion(authorId);
    UUID commentOnPost2 = createComment(postId2, anotherUserId);
    assertThatThrownBy(() -> postService.resolveQuestion(postId1, commentOnPost2, authorId))
        .isInstanceOf(CommentNotForThisPostException.class);
}

@Test
void resolveQuestion_rolls_back_on_save_failure() {
    UUID postId = createQuestion(authorId);
    UUID commentId1 = createComment(postId, anotherUserId);
    UUID commentId2 = createComment(postId, anotherUserId);
    postService.resolveQuestion(postId, commentId1, authorId);

    // Mock the second save (post save) to throw
    doThrow(new RuntimeException("simulated DB failure"))
        .when(postRepository).save(argThat(p -> p.getQuestionResolvedCommentId().equals(commentId2)));

    assertThatThrownBy(() -> postService.resolveQuestion(postId, commentId2, authorId))
        .isInstanceOf(RuntimeException.class);

    // Verify NO state change: commentId1 still helpful, commentId2 still not helpful
    PostComment c1 = commentRepository.findById(commentId1).orElseThrow();
    PostComment c2 = commentRepository.findById(commentId2).orElseThrow();
    assertThat(c1.isHelpful()).isTrue();   // unchanged
    assertThat(c2.isHelpful()).isFalse();  // unchanged (rolled back)
}

@Test
void resolveQuestion_logs_ids_only_no_content() {
    // Capture logs, run resolve, assert log line includes postId, userId, commentId, requestId — not content
}

@Test
void resolveQuestion_does_not_emit_activity_per_MPD_1() {
    UUID postId = createQuestion(authorId);
    UUID commentId = createComment(postId, anotherUserId);
    reset(activityService);  // Ignore activity from createPost calls in setup

    postService.resolveQuestion(postId, commentId, authorId);

    verify(activityService, never()).recordActivity(any(), any());
}
```

**`backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java`** (UPDATE existing, add 6 tests):

- PATCH /api/v1/posts/{id}/resolve as author returns 200 with updated PostDto
- PATCH /api/v1/posts/{id}/resolve as non-author returns 403
- PATCH /api/v1/posts/{id}/resolve unauthenticated returns 401
- PATCH /api/v1/posts/{id}/resolve on prayer_request post returns 400 with INVALID_POST_TYPE_FOR_RESOLVE
- PATCH /api/v1/posts/{id}/resolve with comment id from different post returns 400 with COMMENT_POST_MISMATCH
- PATCH /api/v1/posts/{id}/resolve with deleted comment returns 404

**`backend/src/test/java/com/worshiproom/post/PostMapperTest.java`** (UPDATE if exists, add 1 test):

- PostMapper populates questionResolvedCommentId in PostDto

### Total test budget

- post-types.test.ts: 1 test edited
- content-limits.test.ts: 1 test edited
- PrayerCard.test.tsx: 6 new
- InlineComposer.test.tsx: 10 new (incl. negative no-render tests)
- CommentItem.test.tsx: 9 new
- ResolvedBadge.test.tsx: 3 new
- PrayerWall.test.tsx: 3 new
- prayer-wall-api.test.ts: 4 new
- PostServiceTest.java: 12 new
- PostControllerIntegrationTest.java: 6 new
- PostMapperTest.java: 1 new

**Total: ~56 new/updated tests.** Substantially exceeds master plan AC's ≥18 threshold (which was conservative — 4.4's surface justifies the larger budget).

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/components/prayer-wall/ResolvedBadge.tsx` — NEW component (per MPD-6 / D12). ~25 lines.
- `frontend/src/components/prayer-wall/__tests__/ResolvedBadge.test.tsx` — NEW test file. ~40 lines.

**Backend:**

- `backend/src/main/resources/db/changelog/2026-05-XX-001-add-posts-question-resolved-comment-id.xml` — NEW Liquibase changeset (per D4). The XX gets the next available date based on existing changesets in the directory.
- `backend/src/main/java/com/worshiproom/post/PostNotAQuestionException.java` — NEW exception class. ~10 lines.
- `backend/src/main/java/com/worshiproom/post/comment/CommentNotForThisPostException.java` — NEW exception class. ~10 lines.
- `backend/src/main/java/com/worshiproom/post/dto/ResolveQuestionRequest.java` — NEW request body DTO. ~6 lines.
  ```java
  package com.worshiproom.post.dto;

  import jakarta.validation.constraints.NotNull;
  import java.util.UUID;

  public record ResolveQuestionRequest(@NotNull UUID commentId) {}
  ```

### Files to Modify

**Frontend:**

- `frontend/src/constants/post-types.ts` — flip `question.enabled` from `false` to `true`. ~1 line changed.
- `frontend/src/constants/__tests__/post-types.test.ts` — update enabled-disabled split. ~5 lines changed.
- `frontend/src/constants/content-limits.ts` — update `POST_TYPE_LIMITS.question` entry from prayer_request defaults to question's 2000 ceiling. ~5 lines changed.
- `frontend/src/constants/__tests__/content-limits.test.ts` — update question limit assertion. ~5 lines changed.
- `frontend/src/types/prayer-wall.ts` — add `parentCommentId?`, `isHelpful?`, `replies?` to PrayerComment; add `questionResolvedCommentId?` to PrayerRequest. ~5 lines changed.
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add HelpCircle to lucide-react import, swap `question: HandHelping` → `question: HelpCircle` in POST_TYPE_ICONS, extend chrome switch with question case, extend articleAriaLabel switch with question case. ~10 lines changed.
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — extend the composerCopyByType type signature to include optional `subline`, replace placeholder question entry with full question entry, add subline render below header. ~25 lines changed.
- `frontend/src/components/prayer-wall/CommentItem.tsx` — add useAuth hook usage, add `postType`, `postAuthorId`, `onResolve` props, add author-only conditional, add 'This helped' button rendering, add ResolvedBadge inline next to author name. ~40 lines changed.
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — accept new `postType`, `postAuthorId`, `onResolve` props; pass them through to CommentItem. ~10 lines changed.
- `frontend/src/components/prayer-wall/__tests__/CommentItem.test.tsx` — add 9 tests for the helpful button flow. ~150 lines added.
- `frontend/src/components/prayer-wall/__tests__/CommentsSection.test.tsx` — minimal updates to pass new required props. ~10 lines changed.
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add 6 question chrome tests. ~120 lines added.
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — add 10 question variant tests. ~150 lines added.
- `frontend/src/pages/PrayerWall.tsx` — extend successToastByType.question and authModalCtaByType.question entries with question-specific copy; add resolve handler that calls prayerWallApi.resolveQuestion; pass postType/postAuthorId/onResolve down through PrayerCard children. ~30 lines changed.
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add 3 question submission tests + verify resolve flow integration. ~80 lines added.
- `frontend/src/pages/PrayerDetail.tsx` — pass postType/postAuthorId/onResolve to CommentsSection (mirror PrayerWall.tsx). ~10 lines changed.
- `frontend/src/services/prayer-wall-api.ts` (or whatever the API client file is — verify path during plan) — add `resolveQuestion(postId, commentId)` method. ~15 lines added.
- `frontend/src/services/__tests__/prayer-wall-api.test.ts` — add 4 resolveQuestion tests. ~60 lines added.
- `frontend/src/mocks/prayer-wall-mock-data.ts` (path to verify) — add question fixtures including one authored by mock-current-user. ~30 lines added.
- `_plans/post-1.10-followups.md` — add the threaded comment rendering follow-up entry. ~25 lines added.

**Backend:**

- `backend/src/main/java/com/worshiproom/post/Post.java` — add `questionResolvedCommentId` field with getter/setter; add `@Column(name = "question_resolved_comment_id")`. ~5 lines added.
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` — add `questionResolvedCommentId` to PostDto construction. ~2 lines changed.
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java` — add `questionResolvedCommentId: UUID` field at end of record. ~2 lines changed.
- `backend/src/main/java/com/worshiproom/post/PostService.java` — add `resolveQuestion(postId, commentId, currentUserId)` method with @Transactional, validate post is question, validate comment belongs to post, validate author, idempotency check, atomic move logic. ~60 lines added.
- `backend/src/main/java/com/worshiproom/post/PostController.java` — add `@PatchMapping("/posts/{id}/resolve")` endpoint, accept `@Valid ResolveQuestionRequest`, call PostService.resolveQuestion, return 200 with PostDto. ~25 lines added.
- `backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` — add handlers for PostNotAQuestionException (400 INVALID_POST_TYPE_FOR_RESOLVE) and CommentNotForThisPostException (400 COMMENT_POST_MISMATCH). ~10 lines added.
- `backend/src/main/resources/openapi.yaml` — add the resolve endpoint definition under `/posts/{id}/resolve`, add `questionResolvedCommentId` field to PostDto schema with `nullable: true`. ~50 lines added.
- `backend/src/test/java/com/worshiproom/post/PostServiceTest.java` — add 12 resolve tests. ~250 lines added.
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` — add 6 endpoint integration tests. ~120 lines added.
- `backend/src/test/java/com/worshiproom/post/PostMapperTest.java` — add 1 questionResolvedCommentId mapping test. ~15 lines added.

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.4 from ⬜ to ✅ AFTER successful merge (executor's last step, gated on /verify-with-playwright passing).

### Files NOT to Modify

**4.3-defer protections (still apply):**

- `frontend/src/lib/testimony-card-canvas.ts` (legacy answered-prayer share card)
- `frontend/src/lib/__tests__/testimony-card-canvas.test.ts`
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx`
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx` (existing badge, NOT shared with ResolvedBadge)

**Activity engine deferral (per MPD-1, W7 of 4.3):**

- `backend/src/main/java/com/worshiproom/activity/ActivityType.java`
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java`
- `frontend/src/types/dashboard.ts`
- `frontend/src/constants/dashboard/activity-points.ts`
- `frontend/src/services/faith-points-storage.ts`

**Reaction-label deferral (Phase 6):**

- `frontend/src/components/prayer-wall/InteractionBar.tsx` (4.4 does NOT change reaction labels for question; HandHelping / 'Praying' stays)

**Threading UI deferral (per MPD-3):**

- `frontend/src/components/prayer-wall/CommentInput.tsx` (no parentCommentId support added in 4.4)
- The `replies` rendering — even though the field is on the type, no recursive component is added

**Question expiry deferral (per MPD-2):**

- No `expires_at` column added to Post entity
- No expiry job in 4.4

**Schema-already-shipped protections (W3, W4):**

- DO NOT add Liquibase changeset for `is_helpful` (already in DB)
- DO NOT add Liquibase changeset for `parent_comment_id` (already in DB)

**Other:**

- `frontend/src/components/prayer-wall/CategoryBadge.tsx`, `QotdBadge.tsx`, `Avatar.tsx` — sub-components, not modified
- `frontend/src/components/ui/CharacterCount.tsx`, `Button.tsx` — generic components, not modified
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` — share UI, not changed for question (Phase 6 owns share customization per type)
- `frontend/src/data/devotionals.ts`, bible JSON files — content data, not relevant

### Files to Delete

(none)

---

## 11. Acceptance criteria

Adapted from master plan body lines 4188–4220 with our decisions applied:

**Functional behavior — composer:**

- [ ] Posting a question via the composer creates a post with `post_type='question'` (verified via DB integration test)
- [ ] Question composer header reads 'Ask a question'
- [ ] Question composer subline reads 'Other believers can share their experience or scripture they have leaned on.' (the period at end is intentional)
- [ ] Question composer placeholder reads 'What are you wondering about?'
- [ ] Question composer aria-label on textarea reads 'Question'
- [ ] Question composer textarea max attribute is 2000
- [ ] Question composer submit button reads 'Submit Question'
- [ ] Question composer hides category fieldset
- [ ] Question composer hides challenge-prayer checkbox
- [ ] Question composer does NOT show attribution nudge (testimony-only)
- [ ] Question composer keeps the anonymous toggle (functional, no nudge)

**Functional behavior — card chrome:**

- [ ] Question cards render with cyan accent (bg-cyan-500/[0.04] + border-cyan-200/10)
- [ ] Question cards show HelpCircle icon next to timestamp (replacing HandHelping placeholder)
- [ ] Article aria-label reads 'Question by {authorName}' for question posts
- [ ] No regression on prayer_request, testimony, discussion, or encouragement chrome

**Functional behavior — toast / auth modal:**

- [ ] Successful question post shows toast 'Your question is on the wall. Others can weigh in.'
- [ ] Unauthenticated question composer open uses auth modal CTA 'Sign in to ask a question'

**Functional behavior — 'This helped' button:**

- [ ] Button visible when (current user is post author) AND (postType is question) AND (comment is not deleted)
- [ ] Button NOT visible when current user is not the post author (entirely absent from DOM, not disabled)
- [ ] Button NOT visible when not authenticated
- [ ] Button NOT visible on prayer_request, testimony, discussion, or encouragement post comments
- [ ] Button label reads 'This helped' when comment.isHelpful is false
- [ ] Button label reads 'Most helpful' when comment.isHelpful is true
- [ ] Button aria-label reads 'Mark this comment as most helpful' (default) or 'Marked as most helpful' (active)
- [ ] Tapping the button calls onResolve with the comment id
- [ ] Tapping a different comment moves the helpful marker (atomic via backend)
- [ ] Tapping the same comment again is a no-op (idempotent on backend)

**Functional behavior — ResolvedBadge:**

- [ ] ResolvedBadge component exists at `frontend/src/components/prayer-wall/ResolvedBadge.tsx`
- [ ] Renders inline with the comment's author name when comment.isHelpful is true
- [ ] Has aria-label 'Most helpful comment, marked by post author'
- [ ] Visible to ALL users (authors and non-authors); does NOT require auth

**Backend:**

- [ ] `posts.question_resolved_comment_id` column added via Liquibase changeset (UUID NULL with FK to post_comments(id) ON DELETE SET NULL)
- [ ] `Post.java` entity has the new field with getter/setter
- [ ] `PostDto` record has `questionResolvedCommentId: UUID` field (positional argument at end, nullable)
- [ ] `PostMapper` populates the new field
- [ ] OpenAPI `PostDto` schema has the new field with `nullable: true`
- [ ] `PATCH /api/v1/posts/{id}/resolve` endpoint exists and accepts `{ commentId: UUID }`
- [ ] Endpoint returns 200 with updated PostDto on success
- [ ] Endpoint returns 403 PostForbiddenException when current user is not the post author
- [ ] Endpoint returns 400 PostNotAQuestionException when post is not a question
- [ ] Endpoint returns 400 CommentNotForThisPostException when comment.postId != path postId
- [ ] Endpoint returns 404 PostNotFoundException when post is soft-deleted
- [ ] Endpoint returns 404 PostCommentNotFoundException when comment is soft-deleted
- [ ] Endpoint returns 401 when JWT is missing or invalid
- [ ] Endpoint is rate-limited (30/hour per user — see D6)
- [ ] Resolve operation is `@Transactional` (atomic; all writes roll back on any failure)
- [ ] Idempotent when marking already-helpful comment helpful (no DB writes, returns 200)
- [ ] Atomic move when marking different comment helpful (old.is_helpful=false, new.is_helpful=true, post pointer updated, all in one transaction)
- [ ] Resolve does NOT emit any ActivityType (per MPD-1)
- [ ] Resolve does NOT touch posts.expires_at (column doesn't exist; per MPD-2)

**Frontend type and API consumption:**

- [ ] `PrayerComment` interface has `parentCommentId?: string`, `isHelpful?: boolean`, `replies?: PrayerComment[]`
- [ ] `PrayerRequest` interface has `questionResolvedCommentId?: string`
- [ ] `prayerWallApi.resolveQuestion(postId, commentId)` exists and issues PATCH
- [ ] Optimistic UI update on resolve with rollback on failure (per W15)
- [ ] On rollback, the previous helpful comment's state is restored (not all-set-to-false)

**Constants:**

- [ ] `getPostType('question').enabled === true`
- [ ] `getPostType('discussion').enabled === false`, `getPostType('encouragement').enabled === false` (no regression)
- [ ] `POST_TYPE_LIMITS.question.max === 2000` (was 1000 placeholder from 4.3)
- [ ] `POST_TYPE_LIMITS.question.warningAt === 1600`
- [ ] `POST_TYPE_LIMITS.question.dangerAt === 1900`
- [ ] `POST_TYPE_LIMITS.question.visibleAt === 1000`

**Tests:**

- [ ] ~56 new/updated tests across frontend + backend pass
- [ ] Existing tests continue to pass with no regressions
- [ ] PostType drift contract test passes (no new types added; just enabling)

**Brand voice:**

- [ ] All new copy strings pass the pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon, no streak/shame, no false scarcity

**Visual verification (gated on /verify-with-playwright):**

- [ ] Question composer renders correctly with all per-type copy and behavioral branches
- [ ] Question card chrome renders with cyan wash on `/prayer-wall` feed
- [ ] HelpCircle icon renders on question cards (no other types)
- [ ] 'This helped' button renders only for author on question posts
- [ ] ResolvedBadge renders inline with helpful comment's author name
- [ ] Atomic move works end-to-end (mark comment A → mark comment B → A's badge gone, B's badge present)
- [ ] Mixed feed (prayer_request, testimony, question) renders all chrome variants correctly
- [ ] No regression on prayer_request or testimony rendering across all PrayerCard render sites

**Operational:**

- [ ] `_plans/post-1.10-followups.md` updated with the threaded comment rendering follow-up entry
- [ ] `_forums_master_plan/spec-tracker.md` 4.4 row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.4:

- **Threaded comment rendering UI** (hierarchical indentation, 'see N replies' toggles) → follow-up filed in post-1.10-followups.md per MPD-3
- **Per-type expiry rules** (questions evergreen by default, expires_at column, expiry job) → Phase 6 expiry spec per MPD-2
- **New ActivityType.QUESTION_RESOLVED** and any faith-point bonus for resolving a question → Phase 5 follow-up (covered by 4.3's §27 generically)
- **Per-type reaction labels** ('Helpful' for question, 'Amen' for testimony, etc.) → Phase 6 Engagement Features
- **Unresolve endpoint** (clearing questionResolvedCommentId without setting a new one) → out per D5; if needed later, add as follow-up
- **'See more comments' threading depth** → out (mirrors deferred threading UX)
- **Per-comment reactions** (emoji reactions on comments) → Phase 6 Engagement
- **Comment editing** (already supported in Phase 3) → unchanged
- **Comment voting** (upvote/downvote independent of helpful marker) → not scoped
- **Multiple helpful comments per question** → 4.4 enforces exactly-one (per W22)
- **Helpful-comment notifications** (notify the comment author when their comment is marked helpful) → Phase 6 notifications
- **Discussion post type** (chrome, composer, scripture pair) → Spec 4.5
- **Encouragement post type** (chrome, composer, 280-char limit, 24h expiry) → Spec 4.6
- **Image upload for questions** → Spec 4.6b
- **Composer Chooser UI** → Spec 4.7
- **Phase 4 Cutover / Room Selector** → Spec 4.8
- **Refactoring `PrayerCard` chrome into a `<FrostedCard>` component** → Spec 5.1
- **Tailwind config changes** (custom palette additions) → only if W19 verification fails

---

## 13. Brand voice quick reference (pastor's wife test)

Every copy string in 4.4 must pass the test: 'would a thoughtful pastor's wife reading this think it lands appropriately for someone vulnerable enough to ask a question publicly?' Worship Room is a sanctuary, not a Stack Overflow clone. Questions can be intellectually curious ('what does Romans 8:28 mean in context?') or emotionally raw ('I'm losing faith — has anyone else gone through this?'). The composer and the helpful-marker UX serve both.

**Anti-patterns to flag during /code-review:**

- Exclamation points anywhere near vulnerability — 'Submit your question!', 'Got it!', 'Great question!'. Strip them.
- Urgency / scarcity language — 'Ask now', 'Don't wait', 'Only 5 questions per day'. Strip them.
- Comparison framing — 'Get the best answer', 'Top contributors helped'. Strip them.
- Therapy-app jargon — 'Process this with the community', 'Your truth matters'. Strip them.
- Streak / shame mechanics — 'Your streak is at risk', '14 days since you asked something'. Strip them.
- False authority — 'Expert believers can help', 'Verified members will respond'. Strip them.
- Stack Overflow imports — 'Mark as accepted answer', 'Best answer', 'Bountied'. Use 'This helped' and 'Most helpful' instead — language that affirms without ranking.
- Gamification — 'Earn the helper badge', 'Level up by asking'. Out.

**Good copy in 4.4 (already in D13):**

- 'Ask a question' — direct, calm
- 'Other believers can share their experience or scripture they have leaned on.' — inviting, no pressure
- 'What are you wondering about?' — open-ended
- 'Submit Question' — workmanlike
- 'Your question is on the wall. Others can weigh in.' — calm invitation, no urgency
- 'Sign in to ask a question' — standard
- 'This helped' / 'Most helpful' — affirms without ranking
- 'Most helpful comment, marked by post author' — descriptive aria text

If during /code-review CC has slipped in a copy variant that breaks any of these patterns, push back hard. Copy is the brand voice; it's load-bearing.

The button text 'This helped' is deliberately past-tense and modest. It does NOT say 'This is the best' (comparison) or 'Mark as solution' (Stack Overflow). The author is acknowledging that one comment moved them, not declaring a winner. Hold the line on this — CC sometimes 'improves' the copy toward more confident assertions, which is the wrong direction for Worship Room.

---

## 14. Tier rationale

Run this spec at **xHigh** (NOT MAX). The brief above is comprehensive enough that xHigh + this brief substantially outperforms MAX + a thinner brief. Reasoning:

**Why not Standard:**
- Backend introduces a net-new endpoint with author-ownership auth, a new schema column with FK + ON DELETE SET NULL, and an atomic multi-row transaction. Standard tier consistently under-tests transaction-rollback edge cases and flat-out misses the 'restore previous state on rollback' requirement (W15).
- Frontend introduces a strict author-only conditional (W11) — Standard tier sometimes renders 'disabled but visible' versions of buttons that should be entirely absent from the DOM, which leaks the existence of an author-only feature to non-authors.
- The optimistic update + rollback pattern (D19, W15) requires careful state shaping. Standard tier sometimes implements 'set everything to false on rollback' which is a regression. xHigh respects the requirement when the brief is explicit.

**Why not MAX:**
- No safety-critical pathway changes. Crisis detection unchanged. Auth flow unchanged. Anti-enumeration unchanged.
- No new external dependency. No S3, no Redis, no SMTP, no scheduled jobs.
- The atomic resolve operation is well-bounded — a single Spring `@Transactional` method touching three rows max. Not a distributed-systems concern.
- The author-ownership pattern is well-established in PostService (already used by update + delete). Copying the pattern is reliable; inventing it is not.
- 4.3 establishes the per-type chrome / composer / toast infrastructure. 4.4 fills in the question entries — most of the frontend work is fill-in-the-blank against an existing pattern.

**Cost-benefit:**
- xHigh on a comprehensive brief: ~80 minutes total runtime across spec → plan → execute → review → verify pipeline
- MAX on a comprehensive brief: ~140 minutes (same quality output, ~75% more cost)
- The brief has done the heavy lifting of decision-making. xHigh executes the decisions; MAX doesn't make them better.

**Override moments — when to bump to MAX mid-execution:**

- If during /plan or /execute the author-ownership check is being implemented incorrectly (e.g., comparing comment.userId instead of post.userId)
- If during /verify-with-playwright the 'This helped' button appears for non-authors in any rendering path
- If the resolve transaction is implemented without `@Transactional`
- If CC starts building threaded reply UI despite MPD-3

In any of those cases, abort, bump to MAX, and re-execute with explicit pointer to the failure. Don't bump preemptively.

---

## 15. Recommended planner instruction

Paste this into Claude Code as the body of the `/spec-forums spec-4-4` command. It's the prompt the planner receives.

```
/spec-forums spec-4-4

Write a spec for Phase 4.4: Question Post Type. Read /Users/eric.champlin/worship-room/_plans/forums/spec-4-4-brief.md as the source of truth. The brief contains all decisions, divergences from master plan, recon ground truth, watch-fors, and test specifications. Treat the brief as binding — do not introduce new decisions that contradict it. Where the master plan body and the brief diverge, the brief wins (the brief documents the divergences explicitly in the MPD section).

Tier: xHigh.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites: 4.3 (Testimony Post Type) must be ✅ in spec-tracker.md before this spec executes. Verify by:

1. Reading /Users/eric.champlin/worship-room/_forums_master_plan/spec-tracker.md row for 4.3
2. Confirming `POST_TYPE_LIMITS` exists in frontend/src/constants/content-limits.ts
3. Confirming `composerCopyByType` exists in frontend/src/components/prayer-wall/InlineComposer.tsx
4. Confirming the per-type chrome switch exists in frontend/src/components/prayer-wall/PrayerCard.tsx

If any check fails, STOP and report. Do not proceed without 4.3 shipped.

Recon checklist (re-verify on disk before starting; the brief's recon was on date 2026-05-08):

1. `frontend/src/components/prayer-wall/CommentItem.tsx` — confirm flat-list rendering with @-mention Reply button (no threading, no isHelpful awareness)
2. `frontend/src/components/prayer-wall/CommentsSection.tsx` — confirm flat-list rendering, no postAuthorId prop, no resolve handler
3. `frontend/src/types/prayer-wall.ts` — confirm PrayerComment lacks parentCommentId, isHelpful, replies fields; confirm PrayerRequest lacks questionResolvedCommentId
4. `backend/src/main/java/com/worshiproom/post/comment/PostComment.java` — confirm parentCommentId AND isHelpful columns ALREADY EXIST (entity has both fields with getters/setters). DO NOT add Liquibase changesets for these columns.
5. `backend/src/main/java/com/worshiproom/post/comment/dto/CommentDto.java` — confirm parentCommentId, isHelpful, and replies (List<CommentDto>) fields ALREADY EXIST in the record
6. `backend/src/main/java/com/worshiproom/post/Post.java` — confirm `question_resolved_comment_id` column does NOT exist. 4.4 adds it.
7. `backend/src/main/java/com/worshiproom/post/dto/PostDto.java` — confirm `questionResolvedCommentId` field does NOT exist. 4.4 adds it.
8. `backend/src/main/java/com/worshiproom/post/PostController.java` — confirm no `/resolve` endpoint exists. 4.4 adds it.
9. `frontend/src/services/prayer-wall-api.ts` (or equivalent) — confirm no `resolveQuestion` method exists. 4.4 adds it.
10. `_plans/post-1.10-followups.md` — read the current section numbering to determine the next section number for the threaded comment rendering follow-up entry.
11. Liquibase changelog directory — find the next available date / sequence number for the new changeset filename.

Spec output structure:

- Title and metadata (size L, risk Medium, prerequisites 4.3, branch forums-wave-continued)
- Goal — Add Question post type with author-only 'this helped' resolve UX
- Approach — Per-type chrome (cyan), per-type composer with subline (NEW UX element), 'This helped' button (author-only conditional), ResolvedBadge (new component), atomic resolve endpoint, frontend type extension to consume already-shipped backend fields (parentCommentId, isHelpful, replies)
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~56 tests)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - Threaded reply UI is DEFERRED (MPD-3); type extension only, no rendering changes
  - Question expiry is DEFERRED (MPD-2); no expires_at column
  - Activity engine is DEFERRED (MPD-1); no QUESTION_RESOLVED ActivityType, no faith-point bonus
  - Backend already shipped is_helpful and parent_comment_id columns (W3, W4); only question_resolved_comment_id is net-new
  - 'This helped' button must be entirely absent from DOM for non-authors (W11), not disabled
  - Optimistic UI rollback must restore exact prior state, not all-set-to-false (W15)
  - Resolve operation must be `@Transactional` (W12)

Critical reminders:

- Use single quotes throughout TypeScript and shell. No double-quote or backtick code drift.
- Test convention: `__tests__/` colocated with source files.
- Tracker (`_forums_master_plan/spec-tracker.md`) is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually. Claude Code never commits, pushes, or branches.
- ResolvedBadge is a NEW component (frontend/src/components/prayer-wall/ResolvedBadge.tsx). Do NOT reuse or extend AnsweredBadge.
- The auth check pattern for resolve mirrors PostService's existing update/delete authorization (compare post.userId to currentUser.userId, throw PostForbiddenException on mismatch).

After writing the spec, run /plan-forums spec-4-4 with the same tier (xHigh).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-4
```

The verifier reads the brief and the spec, then exercises the visual surface enumerated in Section 3:

1. Question composer rendering (header, subline, placeholder, hidden category, hidden challenge, no attribution nudge, max=2000)
2. Question card chrome (cyan wash, HelpCircle icon, aria-label) on `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`, `/my-prayers`
3. 'This helped' button — author-only conditional (mount as author → button visible; mount as different user → button absent; mount unauthenticated → button absent)
4. Button label transitions ('This helped' ↔ 'Most helpful')
5. ResolvedBadge inline rendering next to author name when comment.isHelpful
6. Atomic move (mark A → mark B → A's badge gone, B's appears, button on A returns to 'This helped')
7. No regression on prayer_request and testimony chrome / icon / labels
8. Backend resolve endpoint smoke test (PATCH succeeds for author, 403 for non-author, 400 for non-question post, 400 for mismatched comment, 404 for soft-deleted post or comment)

Minimum 12 Playwright scenarios. The verifier writes the report to `_plans/forums/spec-4-4-verify-report.md`.

If verification fails on any scenario, the executor (Claude Code) reads the report and patches; do not flip the tracker until all scenarios pass.

---

## Prerequisites confirmed (as of 2026-05-08 brief authorship)

- ✅ 4.1 Post Type Foundation shipped (POST_TYPES constant exists, PostType enum synced)
- ✅ 4.2 Prayer Request Polish shipped (postType prop required on PrayerRequest, mocked feed includes postType)
- ⬜ 4.3 Testimony Post Type — brief written, NOT YET SHIPPED. **Must ship before 4.4 executes.**
- Backend Phase 3 shipped parent_comment_id and is_helpful columns on post_comments (per R3)
- Backend Phase 3 returns nested replies trees in CommentDto (per R4)
- Frontend has not yet consumed the threading or helpful fields (per R5, R17)
- No `expires_at` column on posts (per R7) — defer to Phase 6
- No `question_resolved_comment_id` column on posts (per R7) — 4.4 adds
- No resolve endpoint on PostController (per R9) — 4.4 adds
- No `resolveQuestion` method on prayerWallApi (per R10) — 4.4 adds
- Lucide HelpCircle and CheckCircle2 expected available (per R11) — verify during plan
- Cyan palette expected available in Tailwind (per R12) — verify during plan, fallback to hex if not

**Brief authored:** 2026-05-08, in conversation with Claude (Opus 4.7), as the second brief of Phase 4 written in the disk-based workflow. Companion to Spec 4.3 brief (`spec-4-3-brief.md`) — same 16-section structure, same disk-based workflow, same xHigh tier guidance.

**End of brief.**
