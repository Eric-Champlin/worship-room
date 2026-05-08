/spec-forums spec-4-3

# Spec 4.3 — Testimony Post Type

**Master plan ID:** `round3-phase04-spec03-testimony-post-type`
**Size:** L
**Risk:** Medium
**Prerequisites:** 4.1 ✅ shipped, 4.2 ✅ shipped (per spec-tracker.md as of 2026-05-08)
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

This spec is the canary for the 4.3 → 4.6 per-post-type pattern. Every architectural call made here propagates through Question, Devotional Discussion, and Encouragement. Get it right and 4.4–4.6 inherit a clean per-type chrome system, per-type content-limit map, and per-type composer copy contract. Get it wrong and three downstream specs each have to re-litigate the same calls.

It is not MAX because:

- No safety-critical pathway changes (crisis detection, anti-enumeration, soft-delete invariants are untouched)
- No user-data-loss risk (no DB migrations beyond the @Size annotation widening)
- No security-boundary changes (auth, rate-limit, idempotency unchanged)
- The patterns this spec extends (TypeMarker, `postType` prop plumbing, idempotency hashing, HTML sanitization-then-length-check) are all already shipped and stable

xHigh + this comprehensive brief consistently outperforms MAX + a thin brief on pattern-establishing specs. The structured ground truth, decisions, and watch-fors below are what earns the tier.

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.** Do not skip — this spec adds a new card chrome variant and a new composer variant. Visible UI surface across the entire prayer-wall feature.

Verification surface:

1. **Testimony composer variant** at `/prayer-wall` when the composer is opened with `postType='testimony'` (note: there is no production code path that opens it with that prop yet — Spec 4.7 Composer Chooser will add the entry point. For 4.3 verification, exercise the variant via a Playwright fixture or a temporary debug query param documented in the plan).
   - Header copy reads correctly (sentence case, no exclamation, no urgency)
   - Placeholder copy reads correctly
   - Textarea starts visibly taller than the prayer_request variant (rows={6} per Decision 7)
   - CharacterCount max=5000, warningAt=4000, dangerAt=4800, visibleAt=2500
   - Anonymous toggle present with attribution nudge copy beneath it
   - Submit button label reads correctly
   - Submitting an empty/short/long testimony produces correct validation states

2. **Testimony card chrome** on `/prayer-wall` feed for any post with `postType='testimony'`.
   - Warmer wash applied: `bg-amber-500/[0.04]` (or whatever the planner verifies actually compiles under the project's Tailwind config — see Watch-for 18)
   - Slightly warmer border: `border-amber-200/10` or equivalent
   - FrostedCard liquid-glass aesthetic preserved (this is a tint shift, NOT a redesign)
   - Sparkles icon renders next to the timestamp (replaces the placeholder HandHelping)
   - Existing layout (avatar, name, timestamp, category badge, content, expand button, AnsweredBadge slot, children slot for InteractionBar/CommentsSection) all render unchanged

3. **No regression on prayer_request rendering** — verify across all PrayerCard render sites:
   - `/prayer-wall` (PrayerWall.tsx feed)
   - `/prayer-wall/:id` (PrayerDetail.tsx)
   - `/prayer-wall/dashboard` (PrayerWallDashboard.tsx — multiple tabs)
   - `/my-prayers` (MyPrayers.tsx)
   - Any other PrayerCard usage the planner discovers via grep

4. **No regression on existing prayer_request char limit** — composer rejects content over 1000 chars on the frontend (the existing `<CharacterCount max={1000}>` becomes `<CharacterCount max={limits.prayer_request}>` — same behavior, different source).

5. **Backend smoke** — verify via Playwright that posting a 5000-char testimony succeeds (returns 201) and posting 5001 chars fails (returns 400 with the parameterized error message). Verify that posting a 1500-char prayer_request still fails on the frontend at 1000 (max attribute on textarea) AND that the backend would reject at 2000 (a 1500-char prayer_request would be allowed; a 2500-char attempt would be rejected — but that's gated by the frontend max attribute first).

The Playwright test count for visual verification: minimum 8 scenarios (testimony composer happy path, testimony composer over-limit, testimony card chrome, testimony icon swap, prayer_request composer no-regression, prayer_request card no-regression, mixed-feed render correctness, char-count threshold transitions on testimony composer).

---

## 4. Master Plan Divergence

The master plan body for 4.3 lives at `_forums_master_plan/round3-master-plan.md` lines ~4134–4205. The body is a planning artifact written before Phase 4.1 and 4.2 actually shipped, and several of its statements are now out of sync with reality. Recon trumps the body. The divergences below are deliberate and load-bearing.

### MPD-1 — Naming collision with `lib/testimony-card-canvas.ts` (legacy)

There is an existing file `frontend/src/lib/testimony-card-canvas.ts` and an associated test at `frontend/src/lib/__tests__/testimony-card-canvas.test.ts`. **This file is unrelated to the new Testimony post type introduced by Spec 4.3.** It is the legacy share-card generator for the `MarkAsAnsweredForm` flow, where a user marks one of their existing prayer_request posts as answered and writes a 'praise text' (which the legacy code calls 'testimony' as a synonym for 'praise text'). The PNG share card it produces is generated client-side and consumed by `MyPrayers.tsx` via the `PrayerAnsweredCelebration` component.

The 4.3 Testimony post type is an entirely separate feature: a first-class post created in the InlineComposer with `postType='testimony'`, lives on the prayer-wall feed alongside prayer_request posts, has its own card chrome and composer variant.

**Implications for execution:**

- DO NOT modify, refactor, or rename `lib/testimony-card-canvas.ts` or its test. (See Files NOT to Modify.)
- DO NOT modify `MarkAsAnsweredForm.tsx`. The `praiseText` state variable inside that component is named such because the form prompts 'Share how God answered this prayer' — the variable name is internal and the field is for the answered-prayer text, not for a Testimony post.
- DO NOT conflate the two when reading the codebase. A grep for 'testimony' returns hits in BOTH features. Always context-check.
- The eventual rename of `testimony-card-canvas.ts` → `answered-prayer-share-card.ts` (or similar) is a separate cleanup spec, not 4.3's work. Out of scope for this brief; do not propose it.

### MPD-2 — Frontend / backend char-limit asymmetry is intentional

The master plan AC reads: 'Char limit on prayer request composer remains 2000.' This is wrong for the frontend. Recon:

- `frontend/src/constants/content-limits.ts` exports `PRAYER_POST_MAX_LENGTH = 1000` (NOT 2000)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` uses `<textarea maxLength={PRAYER_POST_MAX_LENGTH}>` (so 1000 chars at the input level)
- The `<CharacterCount max={1000} ...>` in InlineComposer is hardcoded to literal 1000 (drift from the constant — see W10)
- Backend `CreatePostRequest.java` has `@Size(max = 2000)` on the content field (so 2000 chars at the JSR-303 layer)
- Backend `PostService.java` re-checks `sanitizedContent.length() > 2000` after HTML sanitization (so 2000 chars at the service layer too)

The asymmetry is deliberate: the frontend wants a tighter UX limit than the backend's safety ceiling. The backend ceiling exists so a malformed client (or a curl request) can't post a 50KB prayer; the frontend ceiling exists so the composer feels constrained and intentional rather than open-ended.

**For 4.3, preserve the asymmetry:**

- Frontend prayer_request limit STAYS 1000 chars
- Backend prayer_request limit STAYS 2000 chars
- Frontend testimony limit becomes 5000 chars
- Backend testimony limit becomes 5000 chars
- The single 'highest-among-types' OpenAPI/JSR-303 ceiling becomes 5000 (raised from 2000), with per-type enforcement happening in `PostService.createPost` and `PostService.updatePost`.

This is also the reason testimony does NOT widen prayer_request to 2000 frontend or 5000 backend. Each post type carries its own front and back limit.

### MPD-3 — Activity engine deferral (testimony faith point bonus → Phase 5 follow-up)

The master plan body says: 'New activity type `testimony_posted` with slightly higher faith point reward than a regular prayer (encourages sharing of celebration)' and lists in Files to Modify:

- `backend/src/main/java/com/worshiproom/activity/constants/ActivityType.java` (add `testimony_posted`)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` (add testimony point value)

**This is deferred to a Phase 5 follow-up.** Reasoning:

The activity engine has a verbatim-port sync contract between backend and frontend (see the docstring at the top of `backend/src/main/java/com/worshiproom/activity/ActivityType.java`):

> The wire strings MUST match the frontend's ActivityType union exactly for Phase 2 dual-write parity (verbatim port of frontend/src/constants/dashboard/activity-points.ts ACTIVITY_POINTS keys).

Adding a new ActivityType requires touching, at minimum:

- `backend/src/main/java/com/worshiproom/activity/ActivityType.java` (enum constant + wireValue)
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java` (POINTS map entry)
- `frontend/src/types/dashboard.ts` (ActivityType union + DailyActivities boolean field)
- `frontend/src/constants/dashboard/activity-points.ts` (ACTIVITY_POINTS map, ACTIVITY_DISPLAY_NAMES, ACTIVITY_CHECKLIST_NAMES, ALL_ACTIVITY_TYPES, MAX_DAILY_BASE_POINTS recalc, MAX_DAILY_POINTS recalc)
- `frontend/src/services/faith-points-storage.ts` (DailyActivities default shape)
- Test surface: every activity engine test asserts on the ActivityType list — adding one type breaks the snapshot/list assertions
- Backfill considerations: existing users have no `testimonyPosted` field in their stored DailyActivities — migrations needed

This is meaningful cross-cutting work that does not belong in 4.3's scope. 4.3 is about the post type's compose path and rendering. The faith-point bonus is a reward-system tuning concern that deserves its own spec where the ripple is the focus, not a side effect.

**Action for 4.3:** Use the existing `ActivityType.PRAYER_WALL` activity type when posting a testimony. The line in `PostService.createPost` reading:

```java
activityService.recordActivity(
        authorId,
        new ActivityRequest(ActivityType.PRAYER_WALL, "prayer-wall-post", null)
);
```

stays unchanged for testimony. A user posting a testimony earns 15 faith points, same as a prayer_request, in 4.3. The +50% bonus ships in a later spec.

**Action for the planner:** File a new entry in `_plans/post-1.10-followups.md` (next available number — likely §27, but verify by reading the file and using whatever number is next):

> ## §27. Testimony activity bonus (filed by Spec 4.3)
>
> Master plan body for 4.3 specified a new ActivityType `testimony_posted` with +50% faith point reward over `prayer_request`. Deferred from 4.3 to avoid cross-cutting activity engine changes (frontend ActivityType union, DailyActivities boolean, ACTIVITY_POINTS, ACTIVITY_DISPLAY_NAMES, ACTIVITY_CHECKLIST_NAMES, ALL_ACTIVITY_TYPES, MAX_DAILY_BASE_POINTS recalc, backend ActivityType.java + PointValues.java + dual-write parity). Should ship as part of Phase 5 (or earlier dedicated spec) when the activity engine is the focus.
>
> **Implementation outline (when ready):**
> - Backend: add `ActivityType.TESTIMONY_POSTED` with wireValue `'testimonyPosted'`; add `PointValues.POINTS` entry for it (suggested 22 = 15 × 1.5 rounded down, or 23 = round-up — designer's call)
> - Frontend: extend ActivityType union; extend DailyActivities interface; extend ACTIVITY_POINTS / ACTIVITY_DISPLAY_NAMES / ACTIVITY_CHECKLIST_NAMES / ALL_ACTIVITY_TYPES; recalc MAX_DAILY_BASE_POINTS (165 → 187 if testimonyPosted=22) and MAX_DAILY_POINTS
> - PostService: branch on postType — emit `TESTIMONY_POSTED` for testimony, keep `PRAYER_WALL` for other types
> - Backfill: existing DailyActivities rows have no testimonyPosted field — handle as missing-key = false
> - Tests: every activity engine snapshot test will need updating
>
> **Priority:** LOW. The post type is fully usable without the bonus. The bonus is a reward-system tuning that adds polish but is not behaviorally load-bearing.
>
> Captured: <YYYY-MM-DD> during Spec 4.3 plan.

The planner writes this entry into `post-1.10-followups.md` as part of `/plan-forums spec-4-3` execution. Not the executor's job; not the reviewer's job.

### MPD-4 — POST_TYPES constant stays thin (no retroactive bloat)

The master plan body for Spec 4.1 listed acceptance criteria including:

> POST_TYPES constant has all 5 entries with: id, label, pluralLabel, icon (Lucide name), accentColor (Tailwind class), expiryRule, composerCopy, cardCopy

What 4.1 actually shipped (verified via reading `frontend/src/constants/post-types.ts`):

```typescript
export const POST_TYPES = [
  {
    id: 'prayer_request',
    label: 'Prayer request',
    pluralLabel: 'Prayer requests',
    icon: 'HandHelping',
    description: 'Lift up a need to the Lord with the community.',
    enabled: true,
  },
  // ... 4 more entries
] as const
```

Fields shipped: `id`, `label`, `pluralLabel`, `icon`, `description`, `enabled`. Fields NOT shipped: `accentColor`, `expiryRule`, `composerCopy`, `cardCopy`.

**4.3 does NOT retrofit those fields onto the POST_TYPES constant.** Reasoning:

- `accentColor` (Tailwind class) lives in the component layer where it co-locates with the rest of the conditional className logic. Tailwind utility classes are most legible next to the element they style.
- `composerCopy` / `cardCopy` are multiline strings (header, placeholder, submit button label, attribution nudge, success toast, auth modal CTA) — putting them in a const-as-record at the top of POST_TYPES.ts makes the constant a fat bag of presentation concerns. Better in a per-component copy module or inline in the component.
- `expiryRule` is backend-territory and 4.3 has no expiry concerns. Encouragement (4.6) introduces a non-extendable 24-hour rule, Discussion (4.5) introduces 3-day from `last_activity_at`. When those specs ship, the rules go in PostService validation logic, not in a frontend constant.

**The constant stays as the cross-frontend-backend type discriminator + minimal display metadata.** Per-type rendering specifics live with the renderers. Only the `enabled` flag flips for testimony in 4.3.

This is a deliberate departure from the master plan body's 4.1 AC. If a future spec genuinely needs accentColor or expiryRule centralized for cross-component reuse, it can be added then — YAGNI for now.

### MPD-5 — Reaction label stays 'Praying' for testimonies (Amen deferred)

The master plan body says: 'Reactions labeled "Amen" instead of "Praying."'

This is deferred to Phase 6 (Engagement Features). Reasoning:

- Per-type reaction labels is an architectural call (do we have a single reaction button with per-type label, or per-type reactions with separate counts that don't share storage?). 4.3 should not litigate that without dedicated focus.
- The current `InteractionBar.tsx` uses `prayer.prayingCount` (a single number column on Post) and renders 'Pray for this request' / 'Stop praying for this request' aria-labels. A 'Amen' label would still bump the same prayingCount field — that's fine semantically (one reaction system, just relabeled per type) but it forces every label-consumer (aria, '+1 prayer' floater, ShareDropdown title 'Prayer Request', etc.) to branch on postType.
- 4.3's scope is already L (chrome, composer, char limits, OpenAPI, backend service, tests). Adding the label-branching across InteractionBar bloats it.

**Action for 4.3:** Leave `InteractionBar.tsx` alone. Testimony cards render with the existing `HandHelping` button and 'Praying' aria-label. This is acceptable — a reader saying 'I'm praying about this testimony' is theologically coherent (intercession alongside thanksgiving). The Amen label is a polish item, not a correctness item.

**Action for the planner:** File a follow-up entry in `_plans/post-1.10-followups.md` for the per-type reaction label work, sequenced after 4.6 (so the chrome/composer scaffolding for all 5 types is in place before the reaction system gets its own pass).

### MPD-6 — Anonymous toggle attribution nudge: include, but brand-voice it

The master plan body says: 'Anonymous still allowed but the brand voice nudges toward attribution ("Testimonies often land harder when people know who they came from").'

The phrase 'land harder' fails the pastor's wife test (slightly punchy, almost marketing-deck-tone). For 4.3, render the nudge but rewrite the copy:

Suggested replacement (run pastor's wife test on the final pick during planning):

> 'Testimonies often mean more when others know who they came from. Anonymous is welcome, too.'

or

> 'Sharing your name lets others walk with you. Anonymous is also welcome.'

Pick one in the plan, single source of truth. The nudge appears as a small text element BENEATH the anonymous toggle, in `text-white/60 text-xs` styling, only when `postType === 'testimony'`. For prayer_request and other types, the nudge does not render.

### MPD-7 — Scripture pairing on testimony composer deferred to 4.5

The master plan body for 4.3 does NOT introduce scripture-pair UX. However, the existing PrayerRequest type already has optional `scriptureReference?: string` and `scriptureText?: string` fields (see `frontend/src/types/prayer-wall.ts` lines 39–40). These fields stay unused by the testimony composer in 4.3.

Spec 4.5 (Devotional Discussion Post Type) is where the scripture-pair selector UX gets introduced — the composer offers an optional 'scripture reference' field, the card renders a chip below the content linking to the Bible reader.

When 4.5 ships, a follow-up spec (or Phase 6 polish work) can extend the scripture picker to testimony cards. Testimonies often warrant scripture (a verse God brought to mind during the answered prayer); coupling that UX to 4.3 risks getting it wrong before 4.5 settles the pattern.

**Action for the planner:** File a follow-up entry:

> ## §X. Testimony composer scripture-pair selector (filed by Spec 4.3)
>
> Spec 4.3 ships testimony with no scripture-pair selector. The PrayerRequest type already carries optional `scriptureReference` and `scriptureText` fields, which testimony posts simply leave undefined. Spec 4.5 (Discussion) introduces the scripture-pair selector UX. After 4.5 ships and the pattern stabilizes, port it to the testimony composer.
>
> **Priority:** LOW. Testimonies are usable without scripture. This is a 'when something better is available, use it' enhancement.
>
> Captured: <YYYY-MM-DD> during Spec 4.3 plan.

### MPD-8 — `ContentTooLongException` message must be parameterized

Recon: `backend/src/main/java/com/worshiproom/post/ContentTooLongException.java` has a hardcoded message:

```java
super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
      "Post content exceeds the 2000 character limit after HTML sanitization.");
```

For testimony, a 5001-char post would currently throw with the same '2000 character limit' string — wrong, confusing, and a likely test-failure if any test asserts on the limit number.

**Change:** Make `ContentTooLongException` accept a `maxLength` parameter and interpolate it into the message:

```java
public class ContentTooLongException extends PostException {
    public ContentTooLongException(int maxLength) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Post content exceeds the " + maxLength + " character limit after HTML sanitization.");
    }
}
```

Update both call sites in `PostService.java` to pass the per-type limit. Tests asserting on the message string need updating to match the new template.

The error code `INVALID_INPUT` and the HttpStatus `BAD_REQUEST` STAY. Only the message text changes. This preserves API contract for any client doing error-code-based handling and only breaks clients that string-match the message (which they shouldn't be doing — but flag in the PR description so consumers of the response have a heads-up).

---

## 5. Recon Ground Truth (2026-05-08)

Concrete facts verified on disk via `Desktop Commander:read_file` and `start_search` against the working tree at `/Users/eric.champlin/worship-room/`. These are the load-bearing observations that every Decision and Watch-for below traces back to.

### R1 — `post-types.ts` shape

`frontend/src/constants/post-types.ts` (68 lines, last modified during Spec 4.1 ship):

- Exports `POST_TYPES` array of 5 const objects with fields `id`, `label`, `pluralLabel`, `icon` (Lucide name as string), `description`, `enabled`
- Testimony entry currently:
  ```typescript
  {
    id: 'testimony',
    label: 'Testimony',
    pluralLabel: 'Testimonies',
    icon: 'Sparkles',
    description: 'Share what God has done in your life.',
    enabled: false,  // ← 4.3 flips this to true
  }
  ```
- Exports `PostType` type (union of `'prayer_request' | 'testimony' | 'question' | 'discussion' | 'encouragement'`)
- Exports `PostTypeEntry` type (the inferred entry shape)
- Exports `isValidPostType(value: string | null): value is PostType` predicate
- Exports `getPostType(id: PostType): PostTypeEntry` lookup that throws on unknown id

### R2 — `PrayerCard.tsx` chrome and TypeMarker

`frontend/src/components/prayer-wall/PrayerCard.tsx` (173 lines):

Imports include:
```typescript
import { HandHelping } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PostType } from '@/constants/post-types'
```

Lines 22–28 — the placeholder icon map:
```typescript
const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: HandHelping, // placeholder until 4.3 — see _plans/post-1.10-followups.md
  question: HandHelping, // placeholder until 4.4
  discussion: HandHelping, // placeholder until 4.5
  encouragement: HandHelping, // placeholder until 4.6
}
```

Lines 30–33 — the TypeMarker render helper:
```typescript
function TypeMarker({ postType }: { postType: PostType }) {
  const Icon = POST_TYPE_ICONS[postType]
  return <Icon className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
}
```

Lines 78–82 — the `<article>` element with current chrome (single variant, all post types):
```typescript
<article
  ref={articleRef}
  className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20"
  aria-label={`Prayer by ${prayer.authorName}`}
>
```

The `aria-label` is hardcoded to 'Prayer by ${authorName}'. For testimony it should read 'Testimony by ${authorName}'. This is a tiny but real branch.

The `<TypeMarker>` invocation is at line ~118 (inline near the timestamp):
```typescript
<span className="inline-flex items-center gap-1.5">
  <TypeMarker postType={prayer.postType} />
  <time dateTime={prayer.createdAt} className="text-sm text-white/60">
    {formatFullDate(prayer.createdAt)}
  </time>
</span>
```

### R3 — `InlineComposer.tsx` postType plumbing

`frontend/src/components/prayer-wall/InlineComposer.tsx` (353 lines):

Lines 21–53 — `InlineComposerProps` interface includes:
```typescript
postType?: PostType
onSubmit: (
  content: string,
  isAnonymous: boolean,
  category: PrayerCategory,
  challengeId?: string,
  idempotencyKey?: string,
  postType?: PostType
) => boolean | Promise<boolean>
```

Line 55 — destructured with default:
```typescript
export function InlineComposer({ isOpen, onClose, postType = 'prayer_request', onSubmit }: InlineComposerProps) {
```

Line 124 — postType passed through to `onSubmit`:
```typescript
const success = await onSubmit(
  content.trim(),
  isAnonymous,
  selectedCategory,
  isChallengePrayer && activeChallenge ? activeChallenge.id : undefined,
  idempotencyKey,
  postType
)
```

The composer's other elements are hardcoded for prayer_request:

- Line 175: `<h2>Share a Prayer Request</h2>` (header)
- Line 195: `<textarea ... placeholder="What's on your heart?"` (placeholder)
- Line 196: `maxLength={PRAYER_POST_MAX_LENGTH}` (textarea attribute)
- Line 200: `aria-label="Prayer request"` (textarea aria)
- Line 201: `aria-invalid={content.length > PRAYER_POST_MAX_LENGTH ? 'true' : undefined}` (textarea aria-invalid)
- Lines 263–268: Submit button label hardcoded 'Submit Prayer Request'; disabled check uses `PRAYER_POST_MAX_LENGTH`
- Lines 271–278: `<CharacterCount current={content.length} max={1000} warningAt={800} dangerAt={960} visibleAt={500} />` — note the **literal 1000**, NOT the `PRAYER_POST_MAX_LENGTH` constant. This is drift to clean up in 4.3 (W10).
- Line 254: Footer text hardcoded 'Your prayer will be shared with the community. Be kind and respectful.'

The composer also has a category fieldset (required for prayer_request) and a challenge-prayer checkbox. **For testimony, the category fieldset should NOT appear** — testimonies don't fit into the prayer-categories taxonomy (health/family/work/etc.). This is per the existing backend logic at `PostService.createPost` line ~158:

```java
if ((postType == PostType.PRAYER_REQUEST || postType == PostType.DISCUSSION) && category == null) {
    throw new MissingCategoryException(postTypeRaw);
}
```

Category is required only for prayer_request and discussion. Testimony, question, and encouragement have NO required category. The composer should hide the entire fieldset (and skip the validation block at lines 113–116 of InlineComposer) for testimony.

Similarly, the challenge-prayer checkbox (lines 211–230) is a prayer-specific feature. Hide for testimony.

The crisis keyword check (lines 117–121) and CRISIS_RESOURCES rendering (lines 282–319) — keep for testimony. A testimony might still describe a vulnerability ('I almost gave up before God showed me…'). Don't strip safety nets.

### R4 — `PrayerWall.tsx` `handleComposerSubmit` plumbing

`frontend/src/pages/PrayerWall.tsx` (879 lines, handler at lines 286–366):

```typescript
const handleComposerSubmit = useCallback(
  async (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory,
    challengeId?: string,
    idempotencyKey?: string,
    postType: PostType = 'prayer_request'
  ): Promise<boolean> => {
    if (!isAuthenticated) {
      openAuthModal?.('Sign in to share a prayer request')  // ← hardcoded
      return false
    }
    if (!isBackendPrayerWallEnabled()) {
      // mock branch — builds a local newPrayer with postType passed through
      // ...
      showToast('Your prayer is on the wall. Others can now lift it up.')  // ← hardcoded
      return true
    }
    try {
      const created = await prayerWallApi.createPost(
        { postType, content, category, isAnonymous, challengeId: challengeId ?? null },
        idempotencyKey
      )
      // ...
      showToast('Your prayer is on the wall. Others can now lift it up.')  // ← hardcoded
      return true
    } catch (err) {
      if (err instanceof AnonymousWriteAttemptError) {
        openAuthModal?.('Sign in to share a prayer request')  // ← hardcoded
      }
      // ...
    }
  },
  [user, isAuthenticated, showToast, recordActivity, openAuthModal]
)
```

Three call sites of hardcoded copy that need to branch on postType for testimony:

1. The auth modal CTA `'Sign in to share a prayer request'` → `'Sign in to share a testimony'` for testimony
2. The success toast `'Your prayer is on the wall. Others can now lift it up.'` → testimony-specific copy (suggested: `'Your testimony is on the wall. Others can rejoice with you.'` or similar — pastor's wife test in plan)
3. The anonymous-write-attempt error auth modal CTA — same as #1

### R5 — `content-limits.ts` exports

`frontend/src/constants/content-limits.ts` (8 lines, all of it):

```typescript
/** Content length limits for user-generated content */

export const PRAYER_POST_MAX_LENGTH = 1000
export const QOTD_MAX_LENGTH = 500
export const QOTD_WARNING_THRESHOLD = 400
export const JOURNAL_MAX_LENGTH = 5000
export const JOURNAL_WARNING_THRESHOLD = 4000
export const JOURNAL_DANGER_THRESHOLD = 4800
```

Useful precedent: `JOURNAL_MAX_LENGTH = 5000` with corresponding `WARNING_THRESHOLD` and `DANGER_THRESHOLD` already exists. Testimony's 5000-char threshold mirrors this. Suggested new constants:

```typescript
export const TESTIMONY_POST_MAX_LENGTH = 5000
export const TESTIMONY_POST_WARNING_THRESHOLD = 4000
export const TESTIMONY_POST_DANGER_THRESHOLD = 4800
export const TESTIMONY_POST_VISIBLE_AT = 2500  // CharacterCount becomes visible at 2500 chars (50% of max)

// Per-type limit map for the InlineComposer to consume
export const POST_TYPE_LIMITS: Record<PostType, {
  max: number
  warningAt: number
  dangerAt: number
  visibleAt: number
}> = {
  prayer_request: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  testimony: {
    max: TESTIMONY_POST_MAX_LENGTH,
    warningAt: TESTIMONY_POST_WARNING_THRESHOLD,
    dangerAt: TESTIMONY_POST_DANGER_THRESHOLD,
    visibleAt: TESTIMONY_POST_VISIBLE_AT,
  },
  // 4.4–4.6 will fill in question / discussion / encouragement entries
  question: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  discussion: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  encouragement: {
    max: PRAYER_POST_MAX_LENGTH,  // 4.6 will lower this to 280
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
} as const
```

The non-testimony / non-prayer_request entries are 'prayer_request defaults' — 4.4–4.6 will tune them when each type ships. This means 4.3 doesn't have to predict question / discussion / encouragement limits; just provide a working default that downstream specs replace.

The `PostType` import comes from `@/constants/post-types`. Avoid a circular import — `content-limits.ts` doesn't import from `post-types.ts` today, so adding the import is fine, but verify in plan that no transitive cycle is created.

### R6 — `<CharacterCount max={1000} ...>` is a hardcoded literal

In `InlineComposer.tsx` line 273:

```typescript
<CharacterCount
  current={content.length}
  max={1000}
  warningAt={800}
  dangerAt={960}
  visibleAt={500}
  id="composer-char-count"
/>
```

The literal 1000 is drift from the `PRAYER_POST_MAX_LENGTH = 1000` constant. 4.3 must replace these literals with values from `POST_TYPE_LIMITS[postType]`. Even for prayer_request this is a non-functional change (numbers are equal); the change is to plumbing.

### R7 — `PostService.java` length check is hardcoded to 2000

`backend/src/main/java/com/worshiproom/post/PostService.java` lines 198–204 (inside `createPost`):

```java
if (sanitizedContent.length() > 2000) {
    // After sanitization, the post-strip content may still be over 2000 if
    // the user pasted hand-crafted HTML that survived the policy (unlikely
    // but possible). Re-validate.
    throw new ContentTooLongException();
}
```

Also at line 311 (inside `updatePost`):
```java
if (sanitizedContent.length() > 2000) throw new ContentTooLongException();
```

Both need to become per-type. Proposed implementation:

```java
private static int maxContentLengthFor(PostType postType) {
    return switch (postType) {
        case TESTIMONY -> 5000;
        // 4.6 will add ENCOURAGEMENT -> 280
        // For now, all other types use the prayer_request 2000 ceiling
        case PRAYER_REQUEST, QUESTION, DISCUSSION, ENCOURAGEMENT -> 2000;
    };
}
```

Then at the call sites:

```java
int maxLength = maxContentLengthFor(postType);
if (sanitizedContent.length() > maxLength) {
    throw new ContentTooLongException(maxLength);
}
```

The `updatePost` flow needs to read the *existing* post's postType (since the PATCH body doesn't include postType — postType is immutable post-creation):

```java
int maxLength = maxContentLengthFor(post.getPostType());
if (sanitizedContent.length() > maxLength) throw new ContentTooLongException(maxLength);
```

### R8 — OpenAPI maxLength 2000

`backend/src/main/resources/openapi.yaml` lines 3548–3551 (inside CreatePostRequest schema):

```yaml
content:
  type: string
  maxLength: 2000
```

Lines 3582 (inside UpdatePostRequest):
```yaml
content: { type: string, maxLength: 2000 }
```

Lines 3589 (inside UpdatePostRequest, answeredText — separate field, NOT touched by 4.3):
```yaml
answeredText: { type: string, maxLength: 2000 }
```

Lines 3592 (inside UpdatePostRequest, scriptureText — separate field):
```yaml
scriptureText: { type: string, maxLength: 2000 }
```

**For 4.3:** Raise `maxLength` on `CreatePostRequest.content` and `UpdatePostRequest.content` to 5000. Leave `answeredText` and `scriptureText` at 2000 — those are separate fields with separate semantics, and Spec 4.3 has no business widening them. (When 4.5 introduces scripture-pair UX, it can revisit `scriptureText`. When a future spec adjusts answered-prayer text length, it can revisit `answeredText`.)

The `PostDto.content` schema (response body, lines ~3454) currently has no maxLength. Leave it. Response shape just declares type, not constraints.

### R9 — `CreatePostRequest.java` JSR-303 annotations

`backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java`:

```java
@NotBlank
@Size(max = 2000)
String content,
```

Raise `@Size(max = 2000)` to `@Size(max = 5000)`. Same for `UpdatePostRequest.content`.

**Important:** the `@Size(max = 5000)` is a CEILING that allows up to 5000. The PER-TYPE limit (prayer_request 2000, testimony 5000) is enforced in service layer via `maxContentLengthFor(postType)`. A prayer_request with 4500 chars passes JSR-303 (under 5000) but throws `ContentTooLongException(2000)` in PostService. This is the deliberate flow.

Do not split `CreatePostRequest` into per-type DTOs. JSR-303 cannot conditionally apply `@Size` based on another field's value without custom validators, and a custom validator for this is overengineered when the service-layer check already covers it.

### R10 — `ActivityType.java` and `PointValues.java` (DO NOT MODIFY in 4.3)

Backend ActivityType has 13 values: MOOD, PRAY, LISTEN, PRAYER_WALL, READING_PLAN, MEDITATE, JOURNAL, GRATITUDE, REFLECTION, CHALLENGE, LOCAL_VISIT, DEVOTIONAL, INTERCESSION. PointValues.PRAYER_WALL = 15.

**Per MPD-3, 4.3 does NOT add TESTIMONY_POSTED.** The `recordActivity` call in `PostService.createPost` at line 233–235 stays:

```java
activityService.recordActivity(
        authorId,
        new ActivityRequest(ActivityType.PRAYER_WALL, "prayer-wall-post", null)
);
```

Both prayer_request and testimony posts emit the same activity. Faith point reward is 15 for both. The +50% bonus ships in the deferred follow-up.

### R11 — Naming collision file inventory

Files in the working tree that contain the substring 'testimony' AND ARE UNRELATED to the new Testimony post type — DO NOT MODIFY any of these:

| File | Purpose | Why it has 'testimony' |
| --- | --- | --- |
| `frontend/src/lib/testimony-card-canvas.ts` | Generates a PNG share card for answered prayers | Canvas function is `generateTestimonyCard` (legacy naming for praise-text card) |
| `frontend/src/lib/__tests__/testimony-card-canvas.test.ts` | Test for above | Same |
| `frontend/src/lib/__tests__/celebration-share-canvas.test.ts` | Adjacent share-card tests | Mentions 'testimony' in test descriptions |
| `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` | Form to mark a prayer as answered | Internal `praiseText` state; placeholder says 'Share how God answered this prayer' |
| `frontend/src/pages/MyPrayers.tsx` | User's prayer list with celebration modal | Imports `generateTestimonyCard`, passes it to `PrayerAnsweredCelebration` |
| `frontend/src/pages/PrayerWallDashboard.tsx` (lines ~213, 227) | Dashboard tabs | Comment mentions 'testimony' tab — but verify; this MIGHT actually be an existing testimony filter that anticipates 4.3. Recon during plan. |
| `frontend/src/pages/PrayerDetail.tsx` (lines ~187, 198) | Single-prayer detail page | Same — verify during plan whether these are answered-prayer testimony references or post-type testimony anticipation |
| `frontend/src/data/devotionals.ts` (line 785) | Devotional content | Word 'testimony' appears in a devotional theme array |
| `frontend/src/data/reading-plans/knowing-who-you-are-in-christ.ts` (line 300) | Reading plan content | Word 'testimony' in plan content |
| `frontend/src/data/bible/web/*.json`, `frontend/src/data/bible/books/json/*.json` | WEB Bible text | Scripture mentions of 'testimony' (Mark, John, 1 John, 2 Timothy, Psalms, etc.) |

**The PrayerWallDashboard.tsx and PrayerDetail.tsx hits at lines 213/227 and 187/198 are flagged for plan-time verification.** They might be:
(a) Existing 'testimony filter' tabs/buttons that were stubbed in anticipation of Spec 4.3 (in which case 4.3 connects them to real data)
(b) Legacy answered-prayer references unrelated to the post type
(c) Something else entirely

The planner reads these specific line ranges during recon and adjusts the brief accordingly. If they're (a), they wire up automatically once `testimony.enabled = true` flips and feed filtering propagates. If (b), they're untouched.

### R12 — `spec-tracker.md` Phase 4 status (2026-05-08)

```
| 63  | 4.1      | Post Type Foundation (Frontend Types + Backend Enum Sync) | M    | Low    | ✅     |
| 64  | 4.2      | Prayer Request Polish                                     | M    | Low    | ✅     |
| 65  | 4.3      | Testimony Post Type                                       | L    | Medium | ⬜     |
| 66  | 4.4      | Question Post Type                                        | L    | Medium | ⬜     |
| 67  | 4.5      | Devotional Discussion Post Type                           | M    | Medium | ⬜     |
| 68  | 4.6      | Encouragement Post Type                                   | M    | Medium | ⬜     |
| 69  | 4.6b**   | Image Upload for Testimonies & Questions                  | L    | Medium | ⬜     |
| 70  | 4.7      | Composer Chooser                                          | L    | Medium | ⬜     |
| 71  | 4.7b     | Ways to Help MVP                                          | M    | Low    | ⬜     |
| 72  | 4.8      | Room Selector and Phase 4 Cutover                         | L    | Medium | ⬜     |
```

4.1 and 4.2 are confirmed shipped. 4.3 is up next. After 4.3 ships, the executor must update the tracker — flip 4.3 from ⬜ to ✅. The tracker is source of truth.

### R13 — `post-types.test.ts` drift contract

`frontend/src/constants/__tests__/post-types.test.ts` (119 lines):

The test asserts at lines 60–66:
```typescript
it('testimony, question, discussion, encouragement are disabled', () => {
  expect(getPostType('testimony').enabled).toBe(false)
  expect(getPostType('question').enabled).toBe(false)
  expect(getPostType('discussion').enabled).toBe(false)
  expect(getPostType('encouragement').enabled).toBe(false)
})
```

When 4.3 flips `testimony.enabled` to `true`, this test must be updated:

```typescript
it('prayer_request and testimony are enabled', () => {
  expect(getPostType('prayer_request').enabled).toBe(true)
  expect(getPostType('testimony').enabled).toBe(true)
})

it('question, discussion, encouragement are disabled', () => {
  expect(getPostType('question').enabled).toBe(false)
  expect(getPostType('discussion').enabled).toBe(false)
  expect(getPostType('encouragement').enabled).toBe(false)
})
```

The drift contract docstring at the top of the test file mentions Phase 4.1 — 4.3 should add a note: 'Spec 4.3 enabled the testimony post type. Spec 4.4 will enable question, etc.'

The backend drift test at lines 49–53 (asserts that POST_TYPES.map(t => t.id) equals EXPECTED_BACKEND_VALUES) STAYS. No change to this — frontend and backend already agree on the 5-string list.

### R14 — `_plans/post-1.10-followups.md` §26

Lines ~509–516 of the followups file:

> ## 26. Phase 4 per-type icon updates (filed by Spec 4.2)
>
> POST_TYPE_ICONS in frontend/src/components/prayer-wall/PrayerCard.tsx was introduced in Spec 4.2 with placeholders for the 4 non-prayer_request types — all currently map to HandHelping. Each downstream spec replaces its placeholder with the canonical icon from POST_TYPES (constants/post-types.ts):
>
> - Spec 4.3 (Testimony) — replace `testimony: HandHelping` with `testimony: Sparkles`
> - Spec 4.4 (Question) — replace `question: HandHelping` with `question: HelpCircle`
> - Spec 4.5 (Devotional Discussion) — replace `discussion: HandHelping` with `discussion: MessagesSquare`
> - Spec 4.6 (Encouragement) — replace `encouragement: HandHelping` with `encouragement: Heart`
>
> When all four are replaced, this followup is closed. The TypeMarker render helper itself does not change.

This is a contract from 4.2's plan. 4.3 honors it: replace `testimony: HandHelping` with `testimony: Sparkles`. Add `Sparkles` to the lucide-react import line. Leave the TypeMarker render helper alone (it just looks up `POST_TYPE_ICONS[postType]`).

When the executor writes the spec/plan, also note that this followup should NOT be closed by 4.3 — it stays open until 4.6 ships, at which point all four placeholder icons are replaced.

### R15 — `PrayerRequest.postType` is required (since 4.2)

`frontend/src/types/prayer-wall.ts` lines 33–36:

```typescript
// --- Spec 3.10 (D5) — Phase 3.7+ fields. `postType` is required (flipped
// in Phase 4.2 — Prayer Request Polish); the remaining fields are optional
// and the mapper passes them through when present, so older call sites
// that don't read them are unaffected.
postType: PostType
```

Every fixture, mock, factory, builder must include a `postType` value. New testimony fixtures use `postType: 'testimony'`. Existing prayer_request fixtures use `postType: 'prayer_request'`. Mixed-feed test fixtures should include both for verification.

### R16 — Lucide `Sparkles` icon availability

Verified by inspection of the Lucide-React naming conventions and by the §26 followup explicitly naming `Sparkles`. The icon exists at `lucide-react/dist/esm/icons/sparkles.js` (or equivalent transpiled output) in modern Lucide versions. The plan should still grep `node_modules/lucide-react` to confirm the export resolves before writing the import line — but it's expected to resolve.

### R17 — `ContentTooLongException` constructor

`backend/src/main/java/com/worshiproom/post/ContentTooLongException.java` (10 lines, all of it):

```java
package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class ContentTooLongException extends PostException {
    public ContentTooLongException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Post content exceeds the 2000 character limit after HTML sanitization.");
    }
}
```

Replace with a parameterized version (per MPD-8). All call sites in PostService.java pass the per-type max. Tests asserting on the message string must update.

The error code 'INVALID_INPUT' STAYS. HttpStatus.BAD_REQUEST STAYS. Only the message string changes.

### R18 — Activity-engine related frontend files (DO NOT MODIFY in 4.3)

Per MPD-3, the following files are out of scope for 4.3 — touching them invalidates the deferral:

- `frontend/src/types/dashboard.ts` (ActivityType union)
- `frontend/src/constants/dashboard/activity-points.ts` (ACTIVITY_POINTS, ACTIVITY_DISPLAY_NAMES, ACTIVITY_CHECKLIST_NAMES, ALL_ACTIVITY_TYPES, MAX_DAILY_BASE_POINTS, MAX_DAILY_POINTS)
- `frontend/src/services/faith-points-storage.ts`
- `backend/src/main/java/com/worshiproom/activity/ActivityType.java`
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java`

If during execution Claude Code finds itself wanting to modify any of these, that's a signal to STOP and re-read MPD-3.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The Phase 3 Execution Reality Addendums in `round3-master-plan.md` cover the 13 invariants discovered during Phase 3 backend execution. For 4.3, most are N/A (this is a scoped extension of the existing post-create flow, not a new endpoint). The applicable subset:

| # | Gate | Applies to 4.3? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check | N/A | No change to ordering. Testimony posts use the same `idempotencyService.lookup` → `rateLimitService.checkAndConsume` chain as prayer_request. |
| 2 | Rate-limit consumption order (after idempotency, before validation) | N/A | Same flow; testimony hits the same rate-limit bucket as prayer_request. |
| 3 | Cross-field validation (qotdId existence, scripture pair completeness) | Partial | The category-required-when-prayer_request-or-discussion check ALREADY excludes testimony. No new cross-field rules introduced by 4.3 — the per-type content-length check is a per-type rule, not a cross-field rule. |
| 4 | HTML sanitization BEFORE length check | Applies | The new per-type length check happens AFTER `htmlSanitizerPolicy.sanitize` (preserving the existing order). A testimony with 5500 chars of which 600 are sanitized-out would pass the 5000 limit. |
| 5 | Length check after sanitization (post-sanitization size enforced) | **Applies — modified** | The current single `> 2000` becomes per-type `> maxContentLengthFor(postType)`. Same point in the flow; just per-type. |
| 6 | Crisis detection on sanitized content | Applies (unchanged) | Testimony content is run through `PostCrisisDetector.detectsCrisis` exactly like prayer_request. Crisis keywords in a testimony ('I almost killed myself before God…') still trigger the alert flow. Don't disable for testimony. |
| 7 | AFTER_COMMIT crisis event publishing | Applies (unchanged) | The `eventPublisher.publishEvent(new CrisisDetectedEvent(...))` call fires for testimony the same as prayer_request. |
| 8 | Activity recording (PRAYER_WALL ActivityType) | Applies (unchanged per MPD-3) | Testimony emits PRAYER_WALL activity, same as prayer_request. The +50% bonus is deferred. |
| 9 | EntityManager refresh for DB defaults (`created_at`, `updated_at`, `last_activity_at`) | Applies (unchanged) | The `entityManager.refresh(saved)` call after save+flush is critical for both types. |
| 10 | Logging IDs only (no content) | Applies (unchanged) | The `log.info("postCreated postId={} userId={} postType={} crisisFlag={} requestId={}", …)` line already includes postType — testimony posts will log with `postType=testimony`. No content ever in logs. |
| 11 | `ContentTooLongException` error code/message contract | **Applies — modified per MPD-8** | The error code `INVALID_INPUT` STAYS. The message becomes parameterized: 'Post content exceeds the {N} character limit after HTML sanitization.' Tests asserting on the literal '2000' string need updating. |
| 12 | JSR-303 enforcement BEFORE service-layer rules | **Applies — modified** | Raising `@Size(max = 2000)` to `@Size(max = 5000)` means a 4500-char prayer_request now passes JSR-303 and gets rejected by the service layer instead. Verify the existing prayer_request test that asserts '2001 chars rejected with X message' — it should now be rejected by the service layer (still 400, still INVALID_INPUT, but the rejection point shifts). |
| 13 | PostType wire-format ↔ Java enum drift sync | Applies (unchanged) | No new post types added; just flipping testimony.enabled. The drift test asserts `POST_TYPES.map(t => t.id) equals ['prayer_request', 'testimony', 'question', 'discussion', 'encouragement']` — still passes. |

The rows marked **Applies — modified** are the ones the planner pays special attention to. Specifically gate 11 (parameterized message) and gate 12 (the JSR-303 ceiling now leaves a service-layer-only rejection window for prayer_request between 2001–5000 chars).

For gate 12, no test currently exercises a prayer_request between 2001 and 5000 chars (the JSR ceiling was 2000). Add a regression test: prayer_request with 4500 chars submitted to POST /api/v1/posts should return 400 INVALID_INPUT with message 'Post content exceeds the 2000 character limit after HTML sanitization.' This proves the service-layer enforcement is the active gate for prayer_request after the JSR widening.

---

## 7. Decisions and divergences

### D1 — Activity engine deferral: use existing `ActivityType.PRAYER_WALL`

Already covered in MPD-3. Stated here as a Decision because it's an active call (not just a divergence from the master plan body) — it's a scope-protection move.

**Alternative considered:** Add `TESTIMONY_POSTED` activity type with 22 points (15 × 1.5).
**Rejected because:** Cross-cutting work (8+ files), dual-write parity contract, MAX_DAILY_BASE_POINTS recalc, snapshot test churn. Adds 200+ lines of noise for a +7-point reward bump that doesn't change behavior.

### D2 — Per-type chrome lives in the component layer, not the constant

Already covered in MPD-4. Restated:

```typescript
// In PrayerCard.tsx — NEW conditional chrome system:
const chromeClasses = (() => {
  switch (prayer.postType) {
    case 'testimony':
      return 'rounded-xl border border-amber-200/10 bg-amber-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
    case 'prayer_request':
    case 'question':
    case 'discussion':
    case 'encouragement':
    default:
      return 'rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
  }
})()
```

Or a Record-based equivalent in a colocated `chrome.ts` file in the prayer-wall directory if the chrome logic grows. For 4.3, an inline `switch` is fine. 4.4–4.6 can extract if needed.

**Alternative considered:** `accentColor: 'amber'` field on POST_TYPES, then `bg-${accentColor}-500/[0.04]` interpolation.
**Rejected because:** (a) Tailwind purging eats dynamic class names — the JIT can't statically detect `bg-${accentColor}-500/[0.04]`, requiring safelist entries; (b) the chrome is more than just one color (border, bg, hover-shadow), so a single `accentColor` field doesn't cleanly cover it; (c) the constant becomes a fat bag of presentation concerns — see MPD-4.

### D3 — Per-type content limit map in `frontend/src/constants/content-limits.ts`

Add `POST_TYPE_LIMITS` (shape in R5). Existing `PRAYER_POST_MAX_LENGTH` constant stays exported for any non-composer consumer that imports it directly (verify in plan whether anything outside InlineComposer imports it; if not, it could eventually be inlined into the map, but for 4.3 keep it exported for backward compatibility).

### D4 — Backend per-type validation in `PostService`, JSR `@Size(max)` raised to 5000

Already covered in MPD-2 and R7/R8/R9. Restated:

- `CreatePostRequest.content`: `@Size(max = 5000)` (was 2000)
- `UpdatePostRequest.content`: `@Size(max = 5000)` (was 2000)
- OpenAPI `CreatePostRequest.content.maxLength`: 5000 (was 2000)
- OpenAPI `UpdatePostRequest.content.maxLength`: 5000 (was 2000)
- `PostService.createPost`: replace `> 2000` with `> maxContentLengthFor(postType)`
- `PostService.updatePost`: replace `> 2000` with `> maxContentLengthFor(post.getPostType())` (read from existing post since postType is immutable)
- `ContentTooLongException`: parameterized constructor `(int maxLength)`

### D5 — Scripture pairing on testimony deferred to 4.5

Already covered in MPD-7. Restated for emphasis: testimony composer in 4.3 has NO scripture-pair UI. Existing optional `scriptureReference` and `scriptureText` fields on the PrayerRequest type stay defined; the testimony composer does not surface them.

### D6 — Reaction label stays 'Praying' (Amen deferred)

Already covered in MPD-5. `InteractionBar.tsx` is NOT modified by 4.3.

### D7 — Testimony composer textarea starts at minHeight: '180px' (visually taller)

Prayer_request composer has `style={{ minHeight: '120px' }}` (about 4 rows of text). Testimony's longer-form expectation deserves a visibly taller starting state — signals 'this field accepts a story.'

Implementation: branch the textarea minHeight on postType:

```typescript
const minHeight = postType === 'testimony' ? '180px' : '120px'

<textarea
  ref={textareaRef}
  value={content}
  onChange={handleChange}
  placeholder={composerCopy.placeholder}
  maxLength={POST_TYPE_LIMITS[postType].max}
  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 leading-relaxed text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan"
  style={{ minHeight }}
  aria-label={composerCopy.ariaLabel}
  aria-invalid={content.length > POST_TYPE_LIMITS[postType].max ? 'true' : undefined}
  aria-describedby="composer-char-count"
/>
```

Auto-expand behavior (the `textarea.style.height = textarea.scrollHeight + 'px'` logic in `handleChange`) STAYS unchanged. The change is only the *initial* visible height. Once a user types past the initial height, both variants auto-expand identically.

### D8 — Frontend asymmetry (1000 client / 2000 server for prayer_request) preserved

Already covered in MPD-2 and R5. Restated for emphasis: do NOT widen `PRAYER_POST_MAX_LENGTH` from 1000 to 2000. The client cap stays 1000.

### D9 — Composer header copy: 'Share a testimony'

Sentence case. Period at end NOT applied to headers (per existing 'Share a Prayer Request' which has no period). 'Share a testimony' fits the parallel construction.

**Alternatives considered:** 'Tell a testimony' (off — 'tell' is too theatrical), 'Write a testimony' (off — too workmanlike), 'Bear witness' (off — too churchy / King James), 'Praise God' (off — focuses on the response not the act).

'Share a testimony' is the proposed final. Run pastor's wife test once more in the plan.

### D10 — Composer placeholder: 'What has God done?'

Short, open, inviting. Mirrors the prayer_request placeholder 'What's on your heart?' in length and tone — both are 4-word questions.

**Alternatives considered:** 'How has God moved in your life?' (longer, slightly tract-like), 'Tell us what God has done…' (off — directive), 'Share a way God has shown up' (verbose).

### D11 — Anonymous toggle attribution nudge

Per MPD-6, the rewrite of the master plan's nudge. Final copy:

> 'Testimonies often mean more when others know who they came from. Anonymous is welcome, too.'

Renders only when `postType === 'testimony'`. Below the existing `<label>...Post anonymously</label>` row. Styling: `mt-1.5 text-xs text-white/60`.

### D12 — Success toast on testimony submission

Per R4, hardcoded prayer_request toast is `'Your prayer is on the wall. Others can now lift it up.'`

Testimony branch:

> 'Your testimony is on the wall. Others can rejoice with you.'

The phrase 'rejoice with you' avoids the slightly heavy 'lift it up' (which is prayer-receiving language) and lands on celebration-receiving language. Pastor's wife test passes.

In `PrayerWall.tsx handleComposerSubmit`, both the mock branch (line ~336) and the backend branch (line ~358) use the same toast. Replace both with a single per-type toast lookup:

```typescript
const successToastByType: Record<PostType, string> = {
  prayer_request: 'Your prayer is on the wall. Others can now lift it up.',
  testimony: 'Your testimony is on the wall. Others can rejoice with you.',
  // 4.4–4.6 fill in their own
  question: 'Your prayer is on the wall. Others can now lift it up.',
  discussion: 'Your prayer is on the wall. Others can now lift it up.',
  encouragement: 'Your prayer is on the wall. Others can now lift it up.',
}

showToast(successToastByType[postType])
```

The non-testimony / non-prayer_request entries are placeholders that 4.4–4.6 will tune.

### D13 — Auth modal CTA copy

Two call sites in `PrayerWall.tsx handleComposerSubmit`:

- Line 297 (unauthenticated user opens composer): `openAuthModal?.('Sign in to share a prayer request')`
- Line 360 (AnonymousWriteAttemptError): `openAuthModal?.('Sign in to share a prayer request')`

Per-type lookup:

```typescript
const authModalCtaByType: Record<PostType, string> = {
  prayer_request: 'Sign in to share a prayer request',
  testimony: 'Sign in to share a testimony',
  question: 'Sign in to share a prayer request',  // 4.4 will tune
  discussion: 'Sign in to share a prayer request',  // 4.5 will tune
  encouragement: 'Sign in to share a prayer request',  // 4.6 will tune
}

openAuthModal?.(authModalCtaByType[postType])
```

### D14 — `POST_TYPE_ICONS.testimony` swap from `HandHelping` to `Sparkles`

Per R14 (followup §26). One-line edit in `PrayerCard.tsx`:

```typescript
import { HandHelping, Sparkles } from 'lucide-react'

const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles,                  // ← was HandHelping (placeholder until 4.3)
  question: HandHelping,                // placeholder until 4.4
  discussion: HandHelping,              // placeholder until 4.5
  encouragement: HandHelping,           // placeholder until 4.6
}
```

### D15 — Card chrome wash colors

Tailwind utilities: `bg-amber-500/[0.04]` and `border-amber-200/10`. These are arbitrary-opacity Tailwind classes (`/[0.04]` syntax). Tailwind 3 supports this syntax natively.

**Verify in plan:** confirm Tailwind config doesn't have a custom `amber` palette override that would change the hex value, and confirm the `amber-500` and `amber-200` colors compile (they're default Tailwind).

If for any reason `amber-500/[0.04]` renders as transparent (sometimes happens with extended palettes that don't include amber), fall back to a manual hex: `bg-[#f59e0b]/[0.04]` (Tailwind amber-500 hex) or use a Tailwind layer extension.

The wash is INTENTIONALLY low-opacity (4%). The card retains the FrostedCard liquid-glass look. Testimony chrome is a *tint*, not a redesign. Eric explicitly called this out in pre-spec direction: "this is a TINT shift, not a redesign."

**Hover behavior:** `lg:hover:shadow-md lg:hover:shadow-black/20` stays the same as prayer_request. No per-type hover differentiation in 4.3.

### D16 — Hardcoded `<CharacterCount max={1000}>` in InlineComposer becomes per-type

Replace literal numbers with `POST_TYPE_LIMITS[postType]` lookups:

```typescript
const limits = POST_TYPE_LIMITS[postType]

<CharacterCount
  current={content.length}
  max={limits.max}
  warningAt={limits.warningAt}
  dangerAt={limits.dangerAt}
  visibleAt={limits.visibleAt}
  id="composer-char-count"
/>
```

Same change applied to:
- `<textarea maxLength={...}>` (was `PRAYER_POST_MAX_LENGTH`, becomes `limits.max`)
- `<textarea aria-invalid={content.length > ... ? 'true' : undefined}>` (was `PRAYER_POST_MAX_LENGTH`, becomes `limits.max`)
- Submit button `disabled={... || content.length > ...}` (was `PRAYER_POST_MAX_LENGTH`, becomes `limits.max`)

### D17 — Composer header / placeholder / submit-button copy via per-type lookup

Define a single per-type composer-copy map. Keep it inline at the top of `InlineComposer.tsx` (small enough; co-locates with the component that consumes it). If it grows past ~30 lines later, extract to a sibling file.

```typescript
const composerCopyByType: Record<PostType, {
  header: string
  placeholder: string
  ariaLabel: string
  submitButton: string
  footerNote: string
  showCategoryFieldset: boolean
  showChallengeCheckbox: boolean
  showAttributionNudge: boolean
}> = {
  prayer_request: {
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
  },
  testimony: {
    header: 'Share a testimony',
    placeholder: 'What has God done?',
    ariaLabel: 'Testimony',
    submitButton: 'Submit Testimony',
    footerNote: 'Your testimony will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAttributionNudge: true,
  },
  question: {
    // 4.4 will tune; for now, prayer_request defaults so the composer doesn't crash if
    // postType='question' is passed before 4.4 ships
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
  },
  discussion: {
    // 4.5 will tune
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
  },
  encouragement: {
    // 4.6 will tune
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
  },
}
```

In the component body:

```typescript
const copy = composerCopyByType[postType]
// ... later ...
<h2 className="mb-4 text-lg font-semibold text-white">{copy.header}</h2>
// ...
<textarea placeholder={copy.placeholder} aria-label={copy.ariaLabel} maxLength={limits.max} ... />
// ...
{copy.showCategoryFieldset && (
  <fieldset>...</fieldset>
)}
// ...
{copy.showChallengeCheckbox && activeChallenge && (
  <label>...</label>
)}
// ...
<Button onClick={handleSubmit}>{copy.submitButton}</Button>
// ...
<p className="mt-3 text-xs text-white/60">{copy.footerNote}</p>
{copy.showAttributionNudge && (
  <p className="mt-1.5 text-xs text-white/60">
    Testimonies often mean more when others know who they came from. Anonymous is welcome, too.
  </p>
)}
```

The category-fieldset hide is also a behavioral branch: when `showCategoryFieldset === false`, the `selectedCategory === null` validation bypass must apply. Currently the `handleSubmit` checks:

```typescript
if (!selectedCategory) {
  setShowCategoryError(true)
  return
}
```

This must guard on `copy.showCategoryFieldset`:

```typescript
if (copy.showCategoryFieldset && !selectedCategory) {
  setShowCategoryError(true)
  return
}
```

For testimony, `selectedCategory` will always be `null`, but the check passes. The submission then sends `category: null` (since `selectedCategory` is the source). The backend already accepts `category: null` for testimony (see PostService line ~158).

### D18 — `<article aria-label>` per-type

Currently `aria-label={'Prayer by ${prayer.authorName}'}`. For testimony:

```typescript
const articleAriaLabel = (() => {
  switch (prayer.postType) {
    case 'testimony':
      return `Testimony by ${prayer.authorName}`
    case 'prayer_request':
    case 'question':
    case 'discussion':
    case 'encouragement':
    default:
      return `Prayer by ${prayer.authorName}`
  }
})()
```

Question / discussion / encouragement get their own aria-labels in 4.4–4.6.

---

## 8. Watch-fors

### W1 — Naming collision: `lib/testimony-card-canvas.ts` is unrelated

Already covered in MPD-1 and R11. Worth restating because this is the highest-risk trip-up for CC: a grep for 'testimony' in the frontend returns ~100 hits, most of which are unrelated to the new post type. **Always context-check.** When in doubt, read 5 lines around the match before acting.

The legacy `testimony-card-canvas.ts` and its test are in `frontend/src/lib/` — different directory from `frontend/src/components/prayer-wall/`. The 4.3 work is entirely in the `prayer-wall/` directory and adjacent constants/types. No reason to touch `lib/`.

### W2 — Don't widen frontend prayer_request limit to 2000

The master plan AC implies prayer_request max is 2000. It's not — frontend is 1000. Preserve the 1000 cap. If CC writes `PRAYER_POST_MAX_LENGTH = 2000`, that's a regression. The plan must explicitly state: 'PRAYER_POST_MAX_LENGTH stays at 1000.'

### W3 — `ContentTooLongException` message change is a contract change

Existing tests assert on the literal string 'Post content exceeds the 2000 character limit after HTML sanitization.' Those tests must update to match the parameterized template.

API consumers (curl users, mobile clients eventually) might be string-matching the message. The error code `INVALID_INPUT` is the canonical contract; the message is informational. But flag in the PR description for any external-API consumers.

Tests to update:
- Any test in `backend/src/test/java/com/worshiproom/post/` asserting on the message literal. Search for the string fragment '2000 character limit' to find them.

### W4 — `post-types.test.ts` will fail when testimony.enabled flips

The test at lines 60–66 explicitly asserts `testimony.enabled === false`. After 4.3, that becomes `testimony.enabled === true`. CC must UPDATE the test, not delete it. The drift contract docstring at the top of the file must also be updated to mention 4.3.

Watch for: CC trying to silently delete the assertion or adding `.skip` — not allowed. Refactor to:

```typescript
it('prayer_request and testimony are enabled', () => {
  expect(getPostType('prayer_request').enabled).toBe(true)
  expect(getPostType('testimony').enabled).toBe(true)
})

it('question, discussion, encouragement are disabled', () => {
  expect(getPostType('question').enabled).toBe(false)
  expect(getPostType('discussion').enabled).toBe(false)
  expect(getPostType('encouragement').enabled).toBe(false)
})
```

### W5 — `PrayerRequest.postType` is required — every fixture needs it

If CC adds new mock data (testimony fixtures) to a mocks file, every other PrayerRequest in the same file must already have `postType` populated. If it doesn't, the file already has TypeScript errors and 4.2 didn't fully cover it — but 4.2 shipped, so this should be tight. Verify in plan that every existing fixture has `postType: 'prayer_request'`.

### W6 — PostType wire-format drift: frontend strings = backend Java enum strings, character-for-character

The drift test at `post-types.test.ts` lines 49–53 asserts:

```typescript
expect(POST_TYPES.map((t) => t.id)).toEqual([
  'prayer_request',
  'testimony',
  'question',
  'discussion',
  'encouragement',
])
```

Backend `PostType.java` enum:
```java
PRAYER_REQUEST("prayer_request"),
TESTIMONY("testimony"),
QUESTION("question"),
DISCUSSION("discussion"),
ENCOURAGEMENT("encouragement");
```

These match. Don't touch either side without touching the other. 4.3 doesn't add a new type, just flips the enabled flag — but a sloppy refactor that, e.g., renames `'testimony'` to `'testimony_post'` for some reason would silently break dual-write. The drift test is the safety net.

### W7 — Activity engine work is OUT OF SCOPE

Already covered. If CC starts editing `ActivityType.java`, `PointValues.java`, `dashboard.ts`, `activity-points.ts`, or `faith-points-storage.ts` — STOP. Re-read MPD-3.

### W8 — Don't conflate testimony post type with answered-prayer praise text

The legacy `MarkAsAnsweredForm.tsx` flow uses `praiseText` as a state variable and calls the resulting share image a 'testimony card.' The legacy `generateTestimonyCard()` function in `lib/testimony-card-canvas.ts` produces a PNG for that flow. The new Testimony post type in 4.3 is completely separate.

Specifically: when a user marks one of their prayer_request posts as answered, they get a praise-text field. That praise text is stored on the SAME prayer_request post (in the `answeredText` column on the Post entity). It does NOT create a new Testimony post. The legacy flow is unchanged by 4.3.

If a user wants to share a Testimony as a first-class post AND also mark a related prayer_request as answered, those are TWO actions: (a) create a new Testimony post via the testimony composer, (b) optionally also mark an existing prayer_request as answered via MarkAsAnsweredForm. They are independent.

### W9 — Brand voice on every copy string

Run the pastor's wife test on:

- `'Share a testimony'` (header) — passes (no exclamation, no urgency)
- `'What has God done?'` (placeholder) — passes (open question, not directive)
- `'Submit Testimony'` (button) — passes (workmanlike, not theatrical)
- `'Your testimony will be shared with the community. Be kind and respectful.'` (footer) — passes
- `'Your testimony is on the wall. Others can rejoice with you.'` (toast) — passes ('rejoice' is celebration-language, not therapy-app jargon)
- `'Sign in to share a testimony'` (auth modal CTA) — passes
- `'Testimonies often mean more when others know who they came from. Anonymous is welcome, too.'` (attribution nudge) — passes (gentle invitation, not pressure)
- `'Testimony by {authorName}'` (article aria-label) — passes (descriptive, not flowery)

Description in POST_TYPES is `'Share what God has done in your life.'` — already shipped from 4.1, passes.

**Anti-patterns to flag if any creep in:**
- Exclamation points ('Share a testimony!')
- Urgency words ('Share your testimony today')
- Comparison ('Inspire others')
- Therapy-app jargon ('Process your gratitude')
- Streak / shame ('Don't break your streak')
- False scarcity ('Limited testimony slots today')
- Hyperbole ('The most powerful thing you can do')

If CC drafts copy that includes any of these, the brief explicitly rejects them in /code-review.

### W10 — Hardcoded `max={1000}` in InlineComposer must become per-type

R6 covers the existing drift. The temptation: leave the literal 1000 in place for prayer_request and add a separate testimony branch. **Don't.** Replace with `POST_TYPE_LIMITS[postType]` lookups so all five types use the same source of truth. If CC writes a giant if/else by post type with literals scattered, that's a refactor opportunity missed.

### W11 — Hardcoded toast/auth-modal copy in PrayerWall.tsx must branch on postType

R4 covers it. CC sometimes leaves the prayer_request copy in place and adds a testimony-specific toast as a sibling — that's fine if the dispatch is a `Record<PostType, string>` map. Avoid nested if/else on postType in PrayerWall.tsx.

### W12 — Don't accidentally enable scripture-pair UI for testimony

The optional `scriptureReference` and `scriptureText` fields on PrayerRequest are tempting to surface in the testimony composer ('a verse God brought to mind'). **Don't.** Scripture-pair UX is 4.5's territory. Adding it to testimony in 4.3 couples the spec to 4.5's still-undesigned picker.

If CC drafts a 'optional scripture' field for testimony, push back during /code-review. The fields stay defined in the type; the testimony composer doesn't surface them.

### W13 — Don't introduce 'Amen' reaction label for testimony

The master plan body suggests it. MPD-5 defers it. Testimony cards keep the existing `InteractionBar` (HandHelping icon, 'Pray for this' aria-label). Different reaction names per post-type is a Phase 6 architectural call.

If CC starts editing `InteractionBar.tsx` to branch on postType for the icon or label — STOP. Re-read MPD-5.

### W14 — When raising OpenAPI maxLength, don't forget UpdatePostRequest

`CreatePostRequest.content.maxLength: 5000` is the obvious change. Also raise `UpdatePostRequest.content.maxLength: 5000`. Both schemas live in `backend/src/main/resources/openapi.yaml` (lines ~3548 and ~3582 respectively per recon).

Don't raise `UpdatePostRequest.answeredText` or `UpdatePostRequest.scriptureText` — those are separate fields with separate semantics. 4.3 has no business widening them.

### W15 — JSR-303 `@Size(max = 5000)` requires service-layer per-type enforcement

Raising the JSR ceiling from 2000 to 5000 means a 4500-char prayer_request now passes JSR. If `PostService.createPost` doesn't check per-type, prayer_request would silently accept 4500 chars — a regression.

The fix: the per-type check `if (sanitizedContent.length() > maxContentLengthFor(postType)) throw ...` is the active gate for prayer_request. JSR is now just the upper-upper-bound (sanity check).

Test surface: add a regression test that submits a 4500-char prayer_request and asserts a 400 with the parameterized message referencing 2000 (not 5000 — because the service-layer check uses 2000 for prayer_request).

### W16 — Mock data files: add testimony fixtures without breaking existing tests

Search for the prayer-wall mock data file (likely `frontend/src/data/mockPrayers.ts` or similar). Adding testimony fixtures means inserting entries with `postType: 'testimony'`. Verify existing tests that assert on counts (e.g., 'feed has 24 mocks') update to match new counts.

Mixed-feed test fixtures are valuable — at least one test should render a feed with both prayer_request and testimony posts to verify TypeMarker icon dispatch works correctly.

### W17 — Idempotency hashing contract on `request.hashCode()`

`PostService.createPost` line 168:
```java
int bodyHash = request.hashCode();
```

`CreatePostRequest` is a Java record. Records auto-generate `hashCode()` based on all components, including `content`. A 5000-char testimony content has a hash; a duplicate 5000-char post within the idempotency window will hit the cached response. This is the correct behavior — no change needed.

But: don't add new fields to `CreatePostRequest` in 4.3. The hashCode is part of the dedup contract, and adding fields silently changes the hash space.

### W18 — Tailwind amber palette compilation

D15 covers the suggested classes. Verify in plan:

```bash
# In frontend/, check tailwind.config.js / .ts for any color overrides
grep -n 'amber' tailwind.config.*
```

If amber isn't in the config and the config uses `theme: { extend: { colors: ... } }` without including amber, the JIT might still pick up `amber-500` from the default Tailwind palette (which the theme extends). If it doesn't, the fallback is manual hex with arbitrary opacity:

```typescript
'border-[#fde68a]/10 bg-[#f59e0b]/[0.04]'  // amber-200 / amber-500 hex
```

Plan verifies via building the frontend (`pnpm build` or `npm run build`) and running Playwright with the testimony chrome rendered to confirm the wash applies. If the wash is invisible, the JIT didn't pick it up.

### W19 — Composer wrapper `max-h-[800px]` may clip taller textarea

The composer's outer wrapper (line ~166) has:

```typescript
className={cn(
  'overflow-hidden transition-all duration-base ease-standard motion-reduce:transition-none',
  isOpen ? 'visible mb-4 max-h-[800px] opacity-100' : 'invisible max-h-0 opacity-0'
)}
```

`max-h-[800px]` is the open state. With a 6-row testimony textarea + auto-expand + the 5000-char-aware CharacterCount + the longer footer (attribution nudge adds ~30px) + the crisis-detected block (when triggered) — the composer might overflow 800px on a tall testimony.

**Verify in plan:** measure the composer's actual height with a 4500-char testimony in the textarea + crisis-detected block visible. If it exceeds 800px, raise `max-h-[800px]` to `max-h-[1200px]` for testimony (or remove the cap entirely and let the wrapper grow naturally — but verify the open/close transition still works).

### W20 — QotdBadge placement preserved

`PrayerCard.tsx` line 84–88:

```typescript
{prayer.qotdId && (
  <div className="mb-1">
    <QotdBadge />
  </div>
)}
```

This renders ABOVE the header. When testimony chrome is added, the QotdBadge stays above. Don't accidentally wrap the entire `<article>` content in a chrome-conditional `<div>` that pushes the badge inside the chrome layer — the badge needs to sit at the top of the card regardless of post type.

A testimony post would not normally be a QOTD response (QOTD responses are discussion type per Phase 3), but defensively the badge is rendered if `qotdId` is set on a testimony record. Don't break the conditional.

### W21 — Don't refactor `<article>` element structure

The chrome change is a className update. Don't refactor `<article>` into a wrapper div + nested article, don't change semantic HTML. Single root element, conditional className, done.

### W22 — Don't change InteractionBar imports or props

`PrayerCard.tsx` doesn't import InteractionBar directly (InteractionBar is rendered via the `children` prop pattern — see line ~155). The parent component (PrayerWall.tsx, PrayerDetail.tsx, etc.) renders `<InteractionBar>` as a child of `<PrayerCard>`. 4.3 does not modify this pattern.

Per MPD-5, InteractionBar is unmodified.

### W23 — `enabled: true` in POST_TYPES and 'is the type usable' check

Some downstream code might check `getPostType('testimony').enabled` before allowing a user to compose a testimony. Search for any caller of `getPostType()` or any reference to the `.enabled` field. Likely candidates: a post-type chooser component (which doesn't exist yet — that's 4.7), feed filtering logic, or a feature-flag-style guard.

If anything currently filters posts by `enabled === true` (e.g., for displaying only enabled types in some UI surface), flipping testimony.enabled to true might suddenly surface testimony content where it wasn't surfaced before. Verify in plan whether such filtering exists.

If existing testimony posts are in the database (unlikely — backend allows the type but no UI creates them yet), they'd suddenly become visible after the flip. Acceptable; that's the intended cutover.

### W24 — Frontend asymmetry: `<textarea maxLength>` is the FIRST gate

The textarea HTML attribute `maxLength` prevents the user from TYPING past the limit. So the frontend prayer_request limit of 1000 is enforced at the input layer — a user cannot type a 1001st character. The backend's 2000 limit is only triggered if a malformed client (curl, mobile) bypasses the textarea.

Implication: frontend tests that test 'cannot post >1000 chars' should test it via the textarea max attribute (browser enforces it; user can't get past), not via a submit-and-check-server-rejection flow.

Implication 2: when CC writes the per-type CharacterCount logic, the textarea max attribute updates per type too. Testimony textarea max=5000.

### W25 — Verify TestimonyComposer rendering across `/prayer-wall`, `/prayer-wall/dashboard`, etc.

The InlineComposer is currently only opened in `/prayer-wall` (PrayerWall.tsx). PrayerWallDashboard, MyPrayers, PrayerDetail use PrayerCard but not the composer. If 4.3 only modifies PrayerWall.tsx for the per-type toast/auth-modal copy, that's correct — testimony composer is only opened in the PrayerWall main feed, not on dashboard/detail/my-prayers pages.

Don't proactively add testimony composer entry points to other pages. That's 4.7's job.

But for the per-type CARD chrome (PrayerCard.tsx changes), that propagates to ALL render sites. Verify visually that all 5+ render sites correctly display testimony chrome when a testimony post appears.

### W26 — `recordActivity` call with 'prayer-wall-post' description string

PostService.createPost line 233–235 (already noted in R10):

```java
activityService.recordActivity(
        authorId,
        new ActivityRequest(ActivityType.PRAYER_WALL, "prayer-wall-post", null)
);
```

The string `'prayer-wall-post'` is a description (not the activity-type wire string). For testimony, this stays the same — both prayer_request and testimony emit 'prayer-wall-post' as the description.

If CC tries to update this to 'testimony-post' for testimony, that's a no-op behaviorally (the description is informational) but might trigger a code-review nit. Leave it as-is for testimony to avoid drift.

---

## 9. Test specifications

Target: ~26–32 tests across frontend + backend, broken down:

### Frontend tests

**`frontend/src/constants/__tests__/post-types.test.ts`** (UPDATE existing):

- Update `'testimony, question, discussion, encouragement are disabled'` test → split into two tests: (a) prayer_request and testimony are enabled, (b) question/discussion/encouragement are disabled. Net change: ~3 lines edited, ~1 test split.

**`frontend/src/constants/__tests__/content-limits.test.ts`** (NEW file, 5–7 tests):

```typescript
import { describe, it, expect } from 'vitest'
import {
  PRAYER_POST_MAX_LENGTH,
  TESTIMONY_POST_MAX_LENGTH,
  TESTIMONY_POST_WARNING_THRESHOLD,
  TESTIMONY_POST_DANGER_THRESHOLD,
  POST_TYPE_LIMITS,
} from '../content-limits'

describe('content-limits — testimony constants', () => {
  it('TESTIMONY_POST_MAX_LENGTH is 5000', () => {
    expect(TESTIMONY_POST_MAX_LENGTH).toBe(5000)
  })

  it('TESTIMONY_POST_WARNING_THRESHOLD is below max', () => {
    expect(TESTIMONY_POST_WARNING_THRESHOLD).toBeLessThan(TESTIMONY_POST_MAX_LENGTH)
  })

  it('TESTIMONY_POST_DANGER_THRESHOLD is between warning and max', () => {
    expect(TESTIMONY_POST_DANGER_THRESHOLD).toBeGreaterThan(TESTIMONY_POST_WARNING_THRESHOLD)
    expect(TESTIMONY_POST_DANGER_THRESHOLD).toBeLessThan(TESTIMONY_POST_MAX_LENGTH)
  })
})

describe('content-limits — POST_TYPE_LIMITS map', () => {
  it('has an entry for every PostType', () => {
    expect(POST_TYPE_LIMITS.prayer_request).toBeDefined()
    expect(POST_TYPE_LIMITS.testimony).toBeDefined()
    expect(POST_TYPE_LIMITS.question).toBeDefined()
    expect(POST_TYPE_LIMITS.discussion).toBeDefined()
    expect(POST_TYPE_LIMITS.encouragement).toBeDefined()
  })

  it('prayer_request limits match PRAYER_POST_MAX_LENGTH (asymmetry preserved)', () => {
    expect(POST_TYPE_LIMITS.prayer_request.max).toBe(PRAYER_POST_MAX_LENGTH)
    expect(POST_TYPE_LIMITS.prayer_request.max).toBe(1000)
  })

  it('testimony limits match TESTIMONY_POST_MAX_LENGTH', () => {
    expect(POST_TYPE_LIMITS.testimony.max).toBe(TESTIMONY_POST_MAX_LENGTH)
    expect(POST_TYPE_LIMITS.testimony.max).toBe(5000)
  })

  it('testimony thresholds are ordered: visibleAt < warningAt < dangerAt < max', () => {
    const t = POST_TYPE_LIMITS.testimony
    expect(t.visibleAt).toBeLessThan(t.warningAt)
    expect(t.warningAt).toBeLessThan(t.dangerAt)
    expect(t.dangerAt).toBeLessThan(t.max)
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE existing, add 5–7 tests):

```typescript
describe('PrayerCard — testimony chrome', () => {
  it('renders testimony chrome classes when postType is testimony', () => {
    const testimonyPrayer = createMockPrayer({ postType: 'testimony', content: 'Praise God for...' })
    render(<PrayerCard prayer={testimonyPrayer} />)
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-amber-500/[0.04]')
    expect(article.className).toContain('border-amber-200/10')
  })

  it('renders default chrome classes when postType is prayer_request', () => {
    const prayer = createMockPrayer({ postType: 'prayer_request' })
    render(<PrayerCard prayer={prayer} />)
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-white/[0.06]')
    expect(article.className).toContain('border-white/10')
    expect(article.className).not.toContain('amber')
  })

  it('renders Sparkles icon for testimony posts', () => {
    const testimonyPrayer = createMockPrayer({ postType: 'testimony' })
    render(<PrayerCard prayer={testimonyPrayer} />)
    // Sparkles icon has a stable lucide-class or test-id; verify presence
    // (exact assertion depends on how lucide-react exposes the icon for testing)
    const icon = screen.getByLabelText(/* TBD — lucide icons render with aria-hidden */)
    // Alternative: assert on the SVG's class containing 'lucide-sparkles' or similar
  })

  it('renders HandHelping icon for prayer_request posts', () => {
    // ... mirror of above
  })

  it('aria-label says "Testimony by {authorName}" for testimony posts', () => {
    const testimonyPrayer = createMockPrayer({ postType: 'testimony', authorName: 'Sarah' })
    render(<PrayerCard prayer={testimonyPrayer} />)
    const article = screen.getByLabelText('Testimony by Sarah')
    expect(article).toBeInTheDocument()
  })

  it('aria-label says "Prayer by {authorName}" for prayer_request posts', () => {
    // ... mirror of above
  })

  it('mixed feed renders correct chrome and icon for each type', () => {
    const prayers = [
      createMockPrayer({ id: '1', postType: 'prayer_request' }),
      createMockPrayer({ id: '2', postType: 'testimony' }),
    ]
    render(<>{prayers.map(p => <PrayerCard key={p.id} prayer={p} />)}</>)
    const articles = screen.getAllByRole('article')
    expect(articles[0].className).toContain('bg-white/[0.06]')
    expect(articles[1].className).toContain('bg-amber-500/[0.04]')
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE existing, add 7–9 tests):

```typescript
describe('InlineComposer — testimony variant', () => {
  it('renders testimony header copy when postType is testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.getByText('Share a testimony')).toBeInTheDocument()
  })

  it('renders testimony placeholder when postType is testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText('What has God done?')).toBeInTheDocument()
  })

  it('textarea maxLength is 5000 for testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    const textarea = screen.getByLabelText('Testimony')
    expect(textarea).toHaveAttribute('maxLength', '5000')
  })

  it('textarea maxLength is 1000 for prayer_request (asymmetry preserved)', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='prayer_request' onSubmit={vi.fn()} />)
    const textarea = screen.getByLabelText('Prayer request')
    expect(textarea).toHaveAttribute('maxLength', '1000')
  })

  it('CharacterCount uses testimony thresholds when postType is testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    // CharacterCount is invisible until visibleAt threshold; type 2500+ chars to surface it
    // ... type 2500 'a' chars
    // Assert CharacterCount visible with max=5000
  })

  it('attribution nudge renders for testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.getByText(/Testimonies often mean more/)).toBeInTheDocument()
  })

  it('attribution nudge does NOT render for prayer_request', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='prayer_request' onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Testimonies often mean more/)).not.toBeInTheDocument()
  })

  it('category fieldset is hidden for testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.queryByRole('radiogroup', { name: /category/i })).not.toBeInTheDocument()
  })

  it('challenge prayer checkbox is hidden for testimony', () => {
    // requires active challenge fixture; verify no checkbox
  })

  it('submit handler receives postType=testimony', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Testimony'), 'God healed my back today')
    await user.click(screen.getByRole('button', { name: /submit testimony/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      'God healed my back today',
      false,                          // isAnonymous
      null,                           // category (testimony has no category)
      undefined,                      // challengeId
      expect.any(String),             // idempotencyKey
      'testimony'                     // postType
    )
  })

  it('submit button label is "Submit Testimony" for testimony', () => {
    render(<InlineComposer isOpen={true} onClose={vi.fn()} postType='testimony' onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /submit testimony/i })).toBeInTheDocument()
  })
})
```

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE existing, add 3–4 tests):

```typescript
describe('PrayerWall — testimony submission', () => {
  it('successful testimony post shows testimony-specific toast', async () => {
    // Render PrayerWall, open composer (need to find the entry point — probably a debug fixture
    // or a future Composer Chooser; for 4.3 the entry point doesn't exist in production yet,
    // so this test exercises the handler directly via the `postType: 'testimony'` arg)
    // Mock the API to return success
    // Assert showToast called with 'Your testimony is on the wall. Others can rejoice with you.'
  })

  it('successful prayer_request post shows prayer-specific toast (no regression)', async () => {
    // Existing behavior; assert showToast called with original prayer toast
  })

  it('unauthenticated testimony composer open uses testimony auth modal CTA', async () => {
    // Mock unauthenticated state
    // Trigger composer with postType=testimony
    // Assert openAuthModal called with 'Sign in to share a testimony'
  })

  it('AnonymousWriteAttemptError on testimony submission uses testimony auth modal CTA', async () => {
    // Mock API to throw AnonymousWriteAttemptError
    // Submit testimony
    // Assert openAuthModal called with 'Sign in to share a testimony'
  })
})
```

### Backend tests

**`backend/src/test/java/com/worshiproom/post/PostServiceTest.java`** (UPDATE existing, add 5–7 tests):

```java
@Test
void createPost_testimony_with_5000_chars_succeeds() {
    String content = 'a'.repeat(5000);
    CreatePostRequest request = new CreatePostRequest(
        "testimony", content, null, false, "public", null, null, null, null
    );
    CreatePostResponse response = postService.createPost(authorId, request, idempotencyKey, requestId);
    assertThat(response.data().postType()).isEqualTo("testimony");
    assertThat(response.data().content()).hasSize(5000);
}

@Test
void createPost_testimony_with_5001_chars_throws_ContentTooLongException_with_5000_in_message() {
    String content = 'a'.repeat(5001);
    CreatePostRequest request = new CreatePostRequest(
        "testimony", content, null, false, "public", null, null, null, null
    );
    assertThatThrownBy(() -> postService.createPost(authorId, request, idempotencyKey, requestId))
        .isInstanceOf(ContentTooLongException.class)
        .hasMessageContaining("5000 character limit");
}

@Test
void createPost_prayer_request_with_2001_chars_throws_ContentTooLongException_with_2000_in_message() {
    String content = 'a'.repeat(2001);
    CreatePostRequest request = new CreatePostRequest(
        "prayer_request", content, "health", false, "public", null, null, null, null
    );
    assertThatThrownBy(() -> postService.createPost(authorId, request, idempotencyKey, requestId))
        .isInstanceOf(ContentTooLongException.class)
        .hasMessageContaining("2000 character limit");
}

@Test
void createPost_prayer_request_with_2000_chars_succeeds() {
    String content = 'a'.repeat(2000);
    CreatePostRequest request = new CreatePostRequest(
        "prayer_request", content, "health", false, "public", null, null, null, null
    );
    CreatePostResponse response = postService.createPost(authorId, request, idempotencyKey, requestId);
    assertThat(response.data().postType()).isEqualTo("prayer_request");
}

@Test
void createPost_prayer_request_with_4500_chars_passes_JSR_but_fails_service_layer() {
    // Regression test for W15: JSR @Size(max = 5000) allows 4500-char prayer_request through
    // validation, but the service layer's per-type check (2000 for prayer_request) rejects it.
    String content = 'a'.repeat(4500);
    CreatePostRequest request = new CreatePostRequest(
        "prayer_request", content, "health", false, "public", null, null, null, null
    );
    assertThatThrownBy(() -> postService.createPost(authorId, request, idempotencyKey, requestId))
        .isInstanceOf(ContentTooLongException.class)
        .hasMessageContaining("2000 character limit");
}

@Test
void createPost_testimony_does_not_require_category() {
    String content = "Praise God";
    CreatePostRequest request = new CreatePostRequest(
        "testimony", content, null, false, "public", null, null, null, null
    );
    // Testimony with null category does NOT throw MissingCategoryException
    assertThatNoException().isThrownBy(() -> postService.createPost(authorId, request, idempotencyKey, requestId));
}

@Test
void createPost_testimony_records_PRAYER_WALL_activity_not_TESTIMONY_POSTED() {
    // Per MPD-3, testimony emits PRAYER_WALL activity (TESTIMONY_POSTED is deferred)
    String content = "Praise God";
    CreatePostRequest request = new CreatePostRequest(
        "testimony", content, null, false, "public", null, null, null, null
    );
    postService.createPost(authorId, request, idempotencyKey, requestId);
    verify(activityService).recordActivity(eq(authorId),
        argThat(req -> req.activityType() == ActivityType.PRAYER_WALL));
}
```

**`backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java`** (UPDATE existing, add 2–3 tests):

```java
@Test
void POST_posts_with_testimony_5000_chars_returns_201() throws Exception {
    String content = "a".repeat(5000);
    String body = """
        {
          "postType": "testimony",
          "content": "%s",
          "isAnonymous": false
        }
        """.formatted(content);
    mockMvc.perform(post("/api/v1/posts")
            .contentType(APPLICATION_JSON)
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .header(JWT_HEADER, validJwt())
            .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.postType").value("testimony"))
        .andExpect(jsonPath("$.data.content").value(content));
}

@Test
void POST_posts_with_testimony_5001_chars_returns_400_INVALID_INPUT() throws Exception {
    String content = "a".repeat(5001);
    // ... build body, perform request
    // Assert: 400, error.code === 'INVALID_INPUT', error.message containing '5000 character limit'
    // NOTE: the 5001-char body might be rejected by JSR-303 first (since @Size(max = 5000) on the DTO).
    // The error message in that case comes from the JSR-303 validation handler, not ContentTooLongException.
    // Verify: which layer rejects 5001 first — JSR or service? Likely JSR. Adjust assertion accordingly.
}

@Test
void POST_posts_with_testimony_5500_chars_returns_400_via_JSR_303() throws Exception {
    // Specifically tests the JSR ceiling. 5500 > 5000 ceiling → JSR rejects before service runs.
}
```

### Total test budget

- post-types.test.ts: ~1 test edited
- content-limits.test.ts: ~6 new tests
- PrayerCard.test.tsx: ~7 new tests
- InlineComposer.test.tsx: ~9 new tests
- PrayerWall.test.tsx: ~4 new tests
- PostServiceTest.java: ~7 new tests
- PostControllerIntegrationTest.java: ~3 new tests

**Total: ~37 new/updated tests.** Comfortably exceeds the master plan AC's '12 component tests' threshold.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/constants/__tests__/content-limits.test.ts` — NEW test file for the per-type limit map. ~80 lines.

**Backend:**

(none — all backend changes are modifications)

### Files to Modify

**Frontend:**

- `frontend/src/constants/post-types.ts` — flip `testimony.enabled` from `false` to `true`. Single-line edit. ~1 line changed.
- `frontend/src/constants/__tests__/post-types.test.ts` — split the disabled-types test, update docstring. ~10 lines changed.
- `frontend/src/constants/content-limits.ts` — add `TESTIMONY_POST_MAX_LENGTH`, threshold constants, and the `POST_TYPE_LIMITS` map. ~50 lines added.
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add `Sparkles` to lucide-react import, swap `testimony: HandHelping` → `testimony: Sparkles`, add per-type chrome class branch, add per-type aria-label branch. ~30 lines changed.
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — add `composerCopyByType` map, add limits lookup, branch textarea/header/placeholder/submit/footer/category/challenge/anonymous-nudge on per-type copy. ~80 lines changed.
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add testimony chrome and icon tests. ~120 lines added.
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — add testimony variant tests. ~150 lines added.
- `frontend/src/pages/PrayerWall.tsx` — add `successToastByType` map, add `authModalCtaByType` map, branch the two hardcoded toast strings + two hardcoded auth modal strings on postType. ~30 lines changed.
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add testimony submission tests. ~80 lines added.
- `_plans/post-1.10-followups.md` — add new follow-up entries (one for the activity bonus deferral, one for the scripture-pair selector deferral, one for the per-type reaction labels deferral). ~50 lines added.

**Backend:**

- `backend/src/main/java/com/worshiproom/post/PostService.java` — add `maxContentLengthFor(PostType)` private static method, replace `> 2000` checks in `createPost` and `updatePost` with per-type checks, update `ContentTooLongException()` calls to pass the limit. ~25 lines changed.
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java` — change `@Size(max = 2000)` to `@Size(max = 5000)` on the `content` field. ~1 line changed.
- `backend/src/main/java/com/worshiproom/post/dto/UpdatePostRequest.java` — change `@Size(max = 2000)` to `@Size(max = 5000)` on the `content` field. ~1 line changed.
- `backend/src/main/java/com/worshiproom/post/ContentTooLongException.java` — parameterize the constructor with `int maxLength`. ~5 lines changed.
- `backend/src/main/resources/openapi.yaml` — raise `maxLength` from 2000 to 5000 on `CreatePostRequest.content` and `UpdatePostRequest.content`. ~2 lines changed.
- `backend/src/test/java/com/worshiproom/post/PostServiceTest.java` — add 7 new tests, update any test asserting on the literal '2000 character limit' string. ~150 lines added/changed.
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` — add 3 new integration tests. ~80 lines added.

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.3 from ⬜ to ✅ AFTER successful merge (this is the executor's last step, gated on /verify-with-playwright passing).

### Files NOT to Modify

**Naming-collision protection (per W1, W8):**

- `frontend/src/lib/testimony-card-canvas.ts`
- `frontend/src/lib/__tests__/testimony-card-canvas.test.ts`
- `frontend/src/lib/__tests__/celebration-share-canvas.test.ts`
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx`
- `frontend/src/components/my-prayers/PrayerAnsweredCelebration.tsx` (and any related answered-prayer celebration component)

**Activity engine deferral (per MPD-3, W7):**

- `backend/src/main/java/com/worshiproom/activity/ActivityType.java`
- `backend/src/main/java/com/worshiproom/activity/constants/PointValues.java`
- `frontend/src/types/dashboard.ts`
- `frontend/src/constants/dashboard/activity-points.ts`
- `frontend/src/services/faith-points-storage.ts`

**Reaction-label deferral (per MPD-5, W13):**

- `frontend/src/components/prayer-wall/InteractionBar.tsx`

**Scripture-pair deferral (per MPD-7, W12):**

- `frontend/src/types/prayer-wall.ts` (the `scriptureReference` and `scriptureText` fields STAY defined; do NOT remove them, do NOT surface them in the testimony composer)
- `frontend/src/components/prayer-wall/CommentItem.tsx`, `CommentsSection.tsx` (4.5 territory)
- `backend/src/main/java/com/worshiproom/post/Post.java` (no schema changes)

**Other:**

- `frontend/src/components/prayer-wall/Avatar.tsx`, `AnsweredBadge.tsx`, `CategoryBadge.tsx`, `QotdBadge.tsx` — sub-components rendered by PrayerCard; not modified by 4.3
- `frontend/src/lib/time.ts` — `formatFullDate` utility; not modified
- `frontend/src/components/ui/CharacterCount.tsx` — already accepts the per-type props via existing API; no internal changes
- `frontend/src/components/ui/Button.tsx` — no changes
- `frontend/src/components/ui/UnsavedChangesModal.tsx` — no changes
- `frontend/src/hooks/useUnsavedChanges.ts`, `useOnlineStatus.ts`, `useRovingTabindex.ts`, `useAuth.ts`, `useSoundEffects.ts` — no changes
- `frontend/src/constants/prayer-categories.ts`, `crisis-resources.ts` — no changes
- `frontend/src/data/challenges.ts` — no changes
- `frontend/src/lib/challenge-calendar.ts` — no changes

### Files to Delete

(none)

---

## 11. Acceptance criteria

Adapted from master plan body lines 4174–4188 with our decisions applied:

**Functional behavior:**

- [ ] Posting a testimony via the composer creates a post with `post_type='testimony'` (verify via DB row check in integration test)
- [ ] Testimony cards render with warmer accent (amber wash bg + amber-tinted border) on the article element
- [ ] Testimony cards show `Sparkles` icon next to the timestamp (replacing the `HandHelping` placeholder)
- [ ] Testimony composer accepts up to 5000 characters; rejects 5001+ at the textarea max attribute level
- [ ] Prayer request composer continues to accept up to 1000 characters (frontend asymmetry preserved per MPD-2)
- [ ] Prayer request backend continues to accept up to 2000 characters; rejects 2001+ via service-layer per-type check
- [ ] Prayer request submitted with 4500 characters (between old 2000 and new 5000 JSR ceiling) is rejected with `INVALID_INPUT` and message referencing 2000-char limit (W15 regression test)
- [ ] Testimony composer hides the category fieldset (testimony has no required category)
- [ ] Testimony composer hides the challenge-prayer checkbox
- [ ] Testimony composer shows the anonymous toggle WITH an attribution nudge beneath it
- [ ] Testimony composer header copy reads 'Share a testimony'
- [ ] Testimony composer placeholder reads 'What has God done?'
- [ ] Testimony composer submit button reads 'Submit Testimony'
- [ ] Testimony composer aria-label on textarea reads 'Testimony'
- [ ] Testimony composer textarea starts at `minHeight: '180px'` (taller than prayer_request's 120px)
- [ ] Testimony successful submit shows the testimony-specific toast 'Your testimony is on the wall. Others can rejoice with you.'
- [ ] Testimony composer opens with auth-modal CTA 'Sign in to share a testimony' for unauthenticated users
- [ ] Article aria-label reads 'Testimony by {authorName}' for testimony posts
- [ ] Article aria-label reads 'Prayer by {authorName}' for prayer_request posts (no regression)

**Constants and types:**

- [ ] `getPostType('testimony').enabled === true`
- [ ] `getPostType('prayer_request').enabled === true` (no regression)
- [ ] `getPostType('question').enabled === false`, `getPostType('discussion').enabled === false`, `getPostType('encouragement').enabled === false` (no regression)
- [ ] `POST_TYPE_LIMITS.testimony.max === 5000`
- [ ] `POST_TYPE_LIMITS.prayer_request.max === 1000`
- [ ] `POST_TYPE_LIMITS` has entries for all 5 PostTypes

**Backend:**

- [ ] `CreatePostRequest.content` `@Size(max = 5000)`
- [ ] `UpdatePostRequest.content` `@Size(max = 5000)`
- [ ] `ContentTooLongException` accepts `int maxLength` and interpolates it into the message
- [ ] `PostService.createPost` enforces per-type content length via `maxContentLengthFor(postType)`
- [ ] `PostService.updatePost` enforces per-type content length via `maxContentLengthFor(post.getPostType())`
- [ ] OpenAPI `CreatePostRequest.content.maxLength: 5000`
- [ ] OpenAPI `UpdatePostRequest.content.maxLength: 5000`
- [ ] Posting a testimony emits `ActivityType.PRAYER_WALL` (NOT `TESTIMONY_POSTED` — that's deferred)
- [ ] `ContentTooLongException` message references the actual per-type limit, not a hardcoded 2000
- [ ] OpenAPI `PostDto.postType.enum` still includes `'testimony'` (no change; verify present)

**Tests:**

- [ ] Frontend: ~26 new/updated tests pass
- [ ] Backend: ~10 new tests pass
- [ ] Total: ≥36 new tests pass; existing tests continue to pass with no regressions
- [ ] `post-types.test.ts` drift contract test passes (frontend POST_TYPES ids = backend Java enum values)

**Brand voice:**

- [ ] Every new copy string passes the pastor's wife test (no exclamation, no urgency, sentence case for descriptions, no comparison, no jargon)
- [ ] No hyperbole, no streak-as-shame, no false scarcity in any new copy

**Visual verification (gated on /verify-with-playwright):**

- [ ] Testimony card chrome renders correctly on `/prayer-wall` feed
- [ ] Sparkles icon renders next to timestamp on testimony cards
- [ ] Testimony composer renders with all the per-type copy and behavioral branches
- [ ] Prayer_request rendering unchanged across all 5 PrayerCard render sites
- [ ] Mixed feed (prayer_request + testimony) renders both chrome variants correctly
- [ ] CharacterCount thresholds visible at correct word counts on testimony composer
- [ ] No layout shift, no clipping at composer wrapper max-h-[800px] (or raise per W19)

**Operational:**

- [ ] `_plans/post-1.10-followups.md` updated with new follow-up entries (activity bonus deferral, scripture-pair deferral, per-type reaction labels deferral)
- [ ] `_forums_master_plan/spec-tracker.md` 4.3 row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.3:

- **New `ActivityType.TESTIMONY_POSTED` enum entry** and the +50% faith point bonus → Phase 5 follow-up (filed in post-1.10-followups.md by the planner)
- **Per-type reaction labels** ('Amen' for testimony, etc.) → Phase 6 Engagement Features
- **Scripture-pair selector on the testimony composer** → after Spec 4.5 ships and stabilizes the pattern
- **Image upload on testimony composer** → Spec 4.6b owns this
- **Attribution-encouraging persistent UX** (badges for non-anonymous testimonies, streaks, etc.) → not scoped
- **Question post type** (chrome, composer, helpful-marker) → Spec 4.4
- **Devotional Discussion post type** (chrome, composer, scripture pair) → Spec 4.5
- **Encouragement post type** (chrome, composer, 280-char limit, 24h expiry) → Spec 4.6
- **Composer Chooser UI** (the entry point that lets users pick which post type to compose) → Spec 4.7
- **Phase 4 Cutover / Room Selector** → Spec 4.8
- **Renaming legacy `lib/testimony-card-canvas.ts`** → separate cleanup spec, not 4.3's work
- **Per-type expiry rules** → Phase 6 expiry spec
- **Per-type comment behavior** (Encouragement disables comments, etc.) → respective downstream specs
- **Backend post-type-specific feed sorting** → not scoped
- **Per-type notification copy** → Phase 6 notifications work
- **Testimony-specific share-card art** → Phase 6 Shareable Cards (separate from the legacy `testimony-card-canvas.ts` answered-prayer share card)
- **`PostType.testimony` filter on GET /api/v1/posts** → already supported via the `postType` query param (Spec 3.3); no new endpoint changes
- **Testimony-specific dashboard tab** → if PrayerWallDashboard.tsx hits at lines 213/227 require updates per R11, those become 4.3 work; otherwise out of scope for 4.3
- **Refactoring `PrayerCard` chrome into a `<FrostedCard>` component wrapper** → Spec 5.1 owns the FrostedCard migration
- **Tailwind config changes** (e.g., adding amber to a custom palette) → only if W18 verification fails; otherwise out of scope

---

## 13. Brand voice / Universal Rules quick reference

Relevant rules for this spec, condensed:

**Pastor's wife test on every user-visible string.** Would I be comfortable saying this in front of a pastor's wife? If no, rewrite. Avoid theatrical / marketing / therapy-app voice.

**Sentence case for descriptions; descriptions end with periods.** `'Share what God has done in your life.'` (POST_TYPES.testimony.description). Both characteristics already shipped from 4.1.

**Title case for the labels in POST_TYPES (technically sentence-cased single-word).** `label: 'Testimony'`, `pluralLabel: 'Testimonies'` — already shipped.

**No exclamation points anywhere.** Not in headers, not in toasts, not in error messages, not in placeholders.

**No urgency words:** now, today, hurry, quick, don't miss, asap, urgent. Run `\b(now|today|hurry|quick|don'?t miss|asap|urgent)\b/i` regex on every new string.

**Anti-pressure copy checklist** (Spec 4.6b's six-item list, reusable):
- (a) no comparison
- (b) no urgency
- (c) no exclamation marks near vulnerability
- (d) no therapy-app jargon (no 'process,' 'unpack,' 'work through,' etc.)
- (e) no streak-as-shame
- (f) no false scarcity

Run all 6 checks on every new copy string.

**`POST_TYPES.testimony.description` — already passes.** Already shipped from 4.1.

**Toast / auth-modal copy lookup tables — pastor's wife test each entry.**

| String | Pastor's wife test |
| --- | --- |
| 'Your testimony is on the wall. Others can rejoice with you.' | ✓ Passes (rejoicing language; no hype) |
| 'Sign in to share a testimony' | ✓ Passes (workmanlike CTA) |
| 'Submit Testimony' | ✓ Passes (basic, not theatrical) |
| 'Share a testimony' | ✓ Passes (gentle invitation) |
| 'What has God done?' | ✓ Passes (open question) |
| 'Your testimony will be shared with the community. Be kind and respectful.' | ✓ Passes (basic guidance) |
| 'Testimony' (aria-label) | ✓ Passes (descriptive) |
| 'Testimony by {authorName}' (article aria-label) | ✓ Passes |
| 'Testimonies often mean more when others know who they came from. Anonymous is welcome, too.' | ✓ Passes (inviting; offers permission to be anonymous) |

**Universal Rules quick reference:**

- **WEB Bible translation throughout** — N/A for 4.3 (no scripture rendering)
- **All git operations manual** — see Branch discipline section
- **Single quotes in TypeScript and shell** — enforce in plan and execution
- **Test convention `__tests__/` colocated with source files** — already in use; new tests follow this convention
- **No CC commits / pushes / branches** — see Branch discipline
- **Mock data updates require fixture audit** — every PrayerRequest fixture has `postType` (W5)
- **`postType` is required on PrayerRequest** — every new mock includes it (W5)

---

## 14. Tier rationale

xHigh, deliberately not MAX, deliberately not high. Rationale:

**Why xHigh, not high:**

- This is the first per-post-type spec. Every architectural call propagates through 4.4, 4.5, 4.6. Pattern-establishing work earns more reasoning effort than pattern-following work.
- Cross-cutting surface: 5+ frontend files, 6+ backend files, 2 OpenAPI schema changes, JSR-303 annotation widening, parameterized exception, per-type validation switch, frontend asymmetry preservation, test surface across 5+ test files. Coordinating this from a thin brief is higher-risk than the deliberate xHigh budget.
- Naming collision risk requires deliberate disambiguation. Three watch-fors and two MPDs are dedicated to it. A high-tier brief would likely under-emphasize the collision and CC would conflate flows.
- Brand voice review on 9+ copy strings. Each string has to be deliberately drafted, not improvised.
- The frontend/backend asymmetry preservation (1000 client / 2000 server for prayer_request, 5000 both for testimony) is non-obvious and most engineers would flatten it on autopilot. The brief explicitly preserves it; that explicitness earns the tier.

**Why not MAX:**

- Not safety-critical. Crisis detection, auth, anti-enumeration, rate limiting, idempotency — all unchanged.
- Not user-data-loss risk. No DB migrations beyond `@Size` annotation widening. No data deletion. No backfill.
- Not security-boundary. JWT contract unchanged. CORS unchanged. CSP unchanged.
- The patterns this spec extends (TypeMarker, postType prop plumbing, per-type composer copy) are not load-bearing for safety. Get them slightly wrong and the cost is a rerun, not a security incident.
- The activity engine deferral (MPD-3) is what would push this toward MAX if accepted into scope. Deferring it caps the blast radius and keeps the spec at xHigh.

**xHigh comprehensive brief vs MAX thin brief:**

A MAX-tier execution with a thin brief would have to figure out:
- The naming collision is a real trap — CC would burn cycles disambiguating
- The frontend/backend asymmetry isn't a bug — CC might flatten it during 'helpful' refactor
- The per-type chrome system belongs in the component layer, not the constant — CC might bloat POST_TYPES retroactively
- The activity engine should be deferred — CC might add TESTIMONY_POSTED 'because the master plan said so'

A comprehensive xHigh brief preempts every one of these. The structured ground truth, decisions, and watch-fors below are the thinking the tier difference would otherwise have to do at runtime, with worse signal-to-noise.

---

## 15. Recommended planner instruction

For `/plan-forums spec-4-3`:

**Recon checklist the planner runs before writing the plan:**

1. Verify all PrayerCard render sites — search for `<PrayerCard` across frontend/src and enumerate. Expected: PrayerWall.tsx, PrayerDetail.tsx, PrayerWallDashboard.tsx (multiple usages — verify per-tab), MyPrayers.tsx, possibly fixtures/storybook. The visual verification step exercises every render site.

2. Verify InlineComposer call sites — search for `<InlineComposer` across frontend/src. Expected: only PrayerWall.tsx in production. The QotdComposer (a different component) is unaffected by 4.3 because QOTD responses use postType='discussion' and that's owned by 4.5.

3. Verify mock data files. Search for `postType: 'prayer_request'` in mocks/fixtures and confirm every existing fixture has the field. List the mock files explicitly in the plan so the executor knows where to add testimony fixtures.

4. Verify `PRAYER_POST_MAX_LENGTH` import sites. Search for `PRAYER_POST_MAX_LENGTH` across frontend/src. The only modification in 4.3 is in InlineComposer (where it becomes a per-type lookup). All other consumers of the constant stay unchanged.

5. Verify the Tailwind config for amber palette availability. If amber-200 / amber-500 aren't in the active palette, propose the manual hex fallback in the plan and document the test expectation.

6. Verify existing `PostServiceTest.java` and `PostControllerIntegrationTest.java` tests for any assertions on the literal '2000 character limit' string. List those tests by name in the plan so the executor updates them precisely.

7. Verify the spec-tracker's claim that 4.1 and 4.2 are shipped — read the actual files (post-types.ts, PrayerCard.tsx TypeMarker, InlineComposer.tsx postType prop) and confirm they exist as recon describes.

8. Verify `_plans/post-1.10-followups.md` next available section number (likely §27 but could be higher — read the file). Use the actual next number for the new follow-up entries.

9. Verify the ambiguous testimony references at PrayerWallDashboard.tsx lines ~213/227 and PrayerDetail.tsx lines ~187/198. Read 10-line ranges around each. Are they (a) feature-flag-style anticipatory hooks (in which case 4.3 might wire them up automatically once `enabled` flips), (b) legacy answered-prayer testimony references, or (c) something else? Document in the plan and adjust scope if needed.

10. Verify the OpenAPI schema lines for CreatePostRequest.content and UpdatePostRequest.content (confirmed at lines ~3548 and ~3582 by recon, but line numbers can drift between branches).

11. Verify the existing prayer_request 1000-char/2000-char asymmetry by submitting a 1500-char prayer_request via Playwright and observing: (a) the textarea blocks at 1000 chars (frontend cap), (b) a curl request with 1500 chars succeeds (backend accepts up to 2000). Confirms the asymmetry is currently in place.

**Plan must explicitly NOT propose:**

- New ActivityType, new reaction labels, scripture pair UX, image upload on testimony, share card for testimony post type
- Renaming or modifying any file in the 'Files NOT to Modify' list
- Refactoring `<article>` element structure beyond className changes
- Any git operation
- Widening `PRAYER_POST_MAX_LENGTH` from 1000 to 2000

**Plan must explicitly include:**

- The `maxContentLengthFor(PostType)` helper method signature in PostService.java
- The `composerCopyByType` map shape in InlineComposer.tsx
- The `successToastByType` and `authModalCtaByType` maps in PrayerWall.tsx
- The exact import lines for `Sparkles` (lucide-react) and any new constant imports
- The exact line numbers in OpenAPI yaml that change (post-recon — verify they haven't drifted)
- The follow-up entries to file in post-1.10-followups.md (with copy, not just 'file a followup')
- The spec-tracker.md update line (`4.3 ⬜` → `4.3 ✅`) as the FINAL execution step gated on /verify-with-playwright passing

**Plan must propose:**

- A concrete debug entry-point for `/verify-with-playwright` to exercise `postType='testimony'` in the InlineComposer (since the production entry-point is Spec 4.7's Composer Chooser, which hasn't shipped). Suggested: a temporary `?debug-post-type=testimony` query param read by PrayerWall.tsx that opens the composer with `postType='testimony'`. Mark it as REMOVE-IN-4.7 in the code comment. The Playwright test uses this query param.
- Per-test data fixtures (the mock testimony PrayerRequest objects used across PrayerCard.test.tsx, InlineComposer.test.tsx, PrayerWall.test.tsx) — define once in a shared test helper, reuse across files

---

## 16. Verification handoff

After /execute-plan-forums completes:

1. Run /code-review with the brief's MPDs, Decisions, and Watch-fors as the review rubric.
2. Run /verify-with-playwright with the visual verification scenarios from Section 3.
3. Eric verifies the visual surface manually (testimony chrome at the right warmth, attribution nudge readable, no layout shift).
4. Eric flips spec-tracker.md 4.3 from ⬜ to ✅ as the final step.
5. Eric merges manually.

If /verify-with-playwright fails: do not auto-retry. Surface the failure to Eric with screenshots and a diff of expected-vs-actual. He decides whether to fix-forward or revert.

---

## Prerequisites confirmed

- [x] Branch `forums-wave-continued` is checked out (Eric verifies this himself before pasting this brief into Claude Code)
- [x] 4.1 ✅ shipped (per spec-tracker.md, verified via reading post-types.ts)
- [x] 4.2 ✅ shipped (per spec-tracker.md, verified via reading PrayerCard.tsx TypeMarker + InlineComposer.tsx postType prop)
- [x] No uncommitted changes that would interfere (Eric verifies via `git status` before /execute-plan-forums)
- [x] /spec-forums skill loaded and ready

End of brief.
