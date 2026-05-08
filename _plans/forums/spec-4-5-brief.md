/spec-forums spec-4-5

# Spec 4.5 — Devotional Discussion Post Type

**Master plan ID:** `round3-phase04-spec05-discussion-post-type`
**Size:** M
**Risk:** Medium
**Prerequisites:** 4.4 (Question Post Type) — hard prereq. The per-type chrome system, `composerCopyByType` map (with subline support added in 4.4), `POST_TYPE_LIMITS`, `successToastByType`, `authModalCtaByType`, and frontend type extension patterns all live in 4.3/4.4 surface area. Verify 4.4 is ✅ on tracker before starting.
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

This spec is structurally smaller than 4.3 and 4.4. The backend changes are zero (schema, validation, and exception class for scripture pairing all shipped in Phase 3). The frontend introduces one genuinely new UX pattern — an inline async-validating scripture reference field with verse-text lookup — but most of the spec is filling in question/testimony-shaped slots with discussion-specific values.

It is xHigh (not Standard) because:

- The async verse-text lookup has subtle race conditions (debounce + abort + 'reference changed mid-fetch' state machine). Standard tier consistently mishandles these and ships UI that flickers between valid/invalid states.
- The backend pair contract (`InvalidScripturePairException`) is unforgiving — frontend MUST send scripture_reference and scripture_text together or neither. CC sometimes sends only the reference, hitting a 400 response, which surfaces as a confusing toast.
- The scripture chip on the card is a NEW shared component used by discussion AND any future post types that pair scripture (e.g., testimony scripture-pair selector deferred to Phase 5). Designing the component well here pays forward.
- QOTD responses already use `post_type='discussion'` (from Phase 3 — see R8). The chrome and behavior changes must NOT regress the QOTD reading experience. CC sometimes assumes discussion = manual-only and breaks QOTD rendering.

It is not MAX because:

- No backend endpoint changes. No schema migrations. No new auth conditionals.
- No atomic transactions. No new exception classes (InvalidScripturePairException already exists per R3).
- The per-type chrome / composer / toast infrastructure is fully patterned by 4.3 and 4.4. This spec fills in the discussion entries.
- The validation primitive (`parseReference`) and the verse lookup primitive (`loadChapterWeb` / `loadVerseTexts`) both ship today. No new utilities required.

xHigh + this brief should reliably produce a working spec on the first run. Override to MAX only if the verse-lookup state machine is being implemented incorrectly (see W11).

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.** Visible UI surface across discussion composer + card chrome + scripture chip.

Verification surface:

1. **Discussion composer variant** at `/prayer-wall` opened with `postType='discussion'` (reuse the same debug-query-param mechanism 4.3/4.4 introduced — likely `?compose=discussion`):
   - Header copy reads correctly
   - Placeholder reads correctly
   - Scripture reference input renders below the textarea (NEW — the only post type so far with this field)
   - Scripture reference input is OPTIONAL — submit succeeds with the field empty
   - When the user types a valid reference (e.g., 'John 3:16'), a small green checkmark indicator appears AND a preview of the verse text renders below the input
   - When the user types an invalid reference (e.g., 'Foo 99:99'), a subtle error indicator appears (red dot or warn-color underline); no verse preview
   - Anonymous toggle present without nudge
   - Category fieldset hidden (discussions are not prayer-categorized)
   - Challenge checkbox hidden
   - Submit button reads correctly
   - Submit with invalid scripture reference is BLOCKED until the user clears the field or fixes it (see D14)
   - Submit with empty scripture reference succeeds (the field is optional)

2. **Discussion card chrome** on `/prayer-wall` for any post with `postType='discussion'`:
   - Quiet violet accent applied: `bg-violet-500/[0.04]` and `border-violet-200/10` (verify in plan whether `primary` semantic token resolves to this — see D5)
   - FrostedCard liquid-glass aesthetic preserved (tint shift, not redesign)
   - MessagesSquare icon next to timestamp (replaces HandHelping placeholder per R4)
   - Article aria-label reads `'Discussion by {authorName}'`

3. **Scripture chip on discussion cards with scripture_reference**:
   - Small chip rendered below the content text, above the InteractionBar
   - Chip text is the human-readable reference (e.g., 'John 3:16') with a small Bible icon (Lucide `BookOpen` or `BookMarked`)
   - Chip is a `<Link>` to `/bible/{book.slug}/{chapter}?verse={n}` (path computed via `parseReference` on the stored reference — see D7)
   - Chip is keyboard-accessible (focusable, Enter activates the link)
   - Hover state shows a tooltip OR the chip slightly brightens
   - Chip is NOT rendered when `prayer.scriptureReference` is null/undefined
   - Chip respects narrow viewport (mobile): wraps gracefully, doesn't overflow the card

4. **QOTD response rendering — NO REGRESSION**:
   - A post with `postType='discussion'` AND `qotdId` set still renders the existing QotdBadge above the header (R5 confirms this is `qotdId`-driven, not `postType`-driven)
   - Existing QOTD response chrome (background, layout, copy) is unchanged
   - The new violet wash applies to BOTH QOTD responses and manual discussions (since both are postType='discussion')
   - This is intentional — QOTD responses are 'a kind of discussion'; the chrome reflects that

5. **Mixed feed correctness** at `/prayer-wall`, `/prayer-wall/dashboard`, `/my-prayers`:
   - prayer_request: white default chrome, HandHelping icon
   - testimony: amber chrome, Sparkles icon
   - question: cyan chrome, HelpCircle icon
   - discussion (manual): violet chrome, MessagesSquare icon, NO QotdBadge, scripture chip if reference present
   - discussion (QOTD): violet chrome, MessagesSquare icon, QotdBadge present, scripture chip if reference present
   - Each variant renders correctly without bleed (icon and chrome are post-type-specific, not class-leaked)

6. **Scripture chip behavior**:
   - Tap/click navigates to the Bible reader at the right path
   - The Bible reader's `useSearchParams` correctly reads the `verse` query param and scrolls to / highlights that verse
   - Browser back returns to the prayer wall feed with scroll position preserved (existing behavior, no regression)

7. **Composer scripture lookup flow — async correctness**:
   - User types 'John 3:1', then continues typing to '...6'. The lookup that fired for '3:1' must NOT overwrite the lookup for '3:16' if the latter resolves first (race condition — see W11).
   - User types a valid ref, then deletes the input. The previous verse preview disappears immediately (not stale).
   - User types invalid ref, then valid. The error indicator is replaced by the success state.
   - The lookup is debounced (~300ms) so per-keystroke fetches don't fire.

The Playwright test count for visual verification: minimum 10 scenarios.

---

## 4. Master Plan Divergence

The master plan body for 4.5 lives at `_forums_master_plan/round3-master-plan.md` lines ~4225–4250. Several statements have shipped already; one significant scope item is deferred.

### MPD-1 — Activity engine deferral (mirrors 4.3 MPD-1, 4.4 MPD-1)

Discussion posts emit `ActivityType.PRAYER_WALL` (15 points) like every other post type. No new activity type. No faith-point bonus for discussion. No 'discussion_resolved' or 'thread_started' fanciness.

Reasoning: the activity engine churn (frontend ActivityType union, DailyActivities, ACTIVITY_POINTS, MAX_DAILY_BASE_POINTS recalc, dual-write parity) is not worth the cost for incremental per-type tuning. The Phase 5 follow-up §27 (filed by 4.3) covers per-post-type activity tuning generically.

### MPD-2 — 3-day expiry deferred to Phase 6

The master plan body says: 'Discussion expiry is 3 days from `last_activity_at` (per Decision 4).'

Recon ground truth: there is NO `expires_at` column on `posts`. Phase 3 did not ship per-type expiry. Phase 6 owns the expiry feature.

**For 4.5: do NOT implement 3-day expiry.** No `expires_at` column added. No expiry job. Discussions are evergreen until Phase 6 ships the expiry mechanic, at which point Phase 6 will set `expires_at = last_activity_at + INTERVAL '3 days'` for postType='discussion'.

The master plan body's '3-day expiry from last_activity_at' is captured as future Phase 6 behavior, not as a 4.5 deliverable.

**Action for the planner:** if the followup tracker file `_plans/post-1.10-followups.md` does not already have a Phase 6 expiry rules entry, file one with a per-type expiry table:

| Post type | Default expiry from last_activity_at | Notes |
| --- | --- | --- |
| prayer_request | none (evergreen) | Stays until soft-deleted |
| testimony | none (evergreen) | Celebrations don't expire |
| question | none until resolved (resolves stay evergreen forever) | Per Spec 4.4 |
| discussion | 3 days | Per Spec 4.5 master plan body |
| encouragement | 24 hours, non-extendable | Per Spec 4.6 master plan body |

### MPD-3 — Threaded reply UI deferred (mirrors 4.4 MPD-3)

The master plan body says: 'Threaded replies enabled (same as Question).'

Recon ground truth: 4.4 deferred threaded reply UI to a follow-up. CommentItem still renders flat with the @-mention Reply button. The PrayerComment type carries `parentCommentId?` and `replies?` but they're not rendered hierarchically.

**For 4.5: same deferral.** Discussions render comments flat, exactly like questions and prayer_requests. The threading-UI follow-up filed by 4.4 already covers all post types — no separate follow-up needed for 4.5.

If CC starts building hierarchical threading specifically for discussion ('this spec said threaded replies'), STOP. The deferred follow-up is the right place; 4.5's threading scope is just 'the type carries the field; rendering is flat.'

### MPD-4 — Backend already shipped scripture pair validation, columns, exception class

The master plan body's Files-to-Modify list says:

> - `backend/src/main/java/com/worshiproom/post/Post.java` (add nullable `scripture_reference` column)
> - `backend/src/main/resources/db/changelog/2026-04-18-002-add-scripture-reference-to-posts.xml`

Recon ground truth (per R3):

- `Post.java` already has `scripture_reference` (VARCHAR 100) and `scripture_text` (TEXT) columns, both nullable. Phase 3 added them.
- `PostService.createPost` already validates the pair: if exactly one of (scriptureReference, scriptureText) is null, throws `InvalidScripturePairException`.
- `InvalidScripturePairException` already exists at `backend/src/main/java/com/worshiproom/post/InvalidScripturePairException.java`.
- `PostExceptionHandler` already maps it to a 400 error response.
- `CreatePostRequest` DTO already has `scriptureReference` and `scriptureText` fields.
- `PostMapper` already populates both fields in `PostDto`.
- `PostDto` already has both fields.
- OpenAPI `PostDto` schema already has both fields.

**4.5's actual backend delta: ZERO.** No Liquibase changeset. No entity changes. No DTO changes. No exception classes.

If CC's plan or execution touches any backend file in this list, STOP. The planner can use a one-line bash check during recon to avoid regressing this:

```bash
grep -rn 'scripture_reference\|scriptureReference' backend/src/main/java/com/worshiproom/post/Post.java
# Should return at least one match — if zero, recon is wrong and someone reverted Phase 3.
```

### MPD-5 — Frontend type already has scriptureReference

`frontend/src/types/prayer-wall.ts` PrayerRequest interface already has:

```typescript
scriptureReference?: string
scriptureText?: string
```

Per R6. No frontend type changes needed for the discussion scripture field. The mapper in `frontend/src/lib/prayer-wall/postMappers.ts` already passes through the fields when present (per R7).

**4.5's frontend type delta: ZERO additions.** All type extensions for scripture happened in Phase 3 alongside the QOTD/devotional pairing infrastructure.

### MPD-6 — Composer scripture reference field IS a new UX element

While the type and the backend are ready, the COMPOSER does not yet have a scripture-reference input. 4.5 introduces this UX element. Pattern parallels question's subline (4.4 MPD): adds a per-type optional UI affordance to the existing `composerCopyByType` infrastructure.

**Pattern for additive composer fields:**

The `composerCopyByType` map gets a new optional flag: `showScriptureReferenceField?: boolean` (defaults to false). Only `discussion` sets it to `true` in 4.5. The InlineComposer body conditionally renders a `<ScriptureReferenceInput>` component when the flag is true.

The component is a NEW file: `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` — it owns the debounced parseReference + verse-text-lookup + race-condition state machine internally, exposing a clean callback shape `onChange(scriptureReference: string | null, scriptureText: string | null)`.

### MPD-7 — Scripture chip on PrayerCard IS a new component

`PrayerCard.tsx` does not currently render anything based on `prayer.scriptureReference`. 4.5 introduces a new component:

`frontend/src/components/prayer-wall/ScriptureChip.tsx` — small chip with the reference text + Bible icon, links to the Bible reader. Mounted inside `PrayerCard.tsx` between the content body and the InteractionBar (or wherever placement testing settles — see D8).

The component is decoupled from postType. It renders whenever `prayer.scriptureReference` is set, regardless of post type. This matters because:

- Future testimony scripture-pair selector (Phase 5 follow-up §28) will mount the same chip on testimonies
- Future testimony share-card export (Phase 6) will reuse the chip rendering
- QOTD responses that include scripture references will get the chip for free

Decoupling avoids per-postType branching here.

---

## 5. Recon Ground Truth (2026-05-08)

### R1 — `post-types.ts` discussion entry exists with proper icon

`frontend/src/constants/post-types.ts` (post-4.4 state, current):

```typescript
{
  id: 'discussion',
  label: 'Discussion',
  pluralLabel: 'Discussions',
  icon: 'MessagesSquare',
  description: 'Open a thread on a passage or topic worth exploring.',
  enabled: false,  // ← 4.5 flips this to true
}
```

The icon is already `'MessagesSquare'` — matches Lucide and matches followup §26 contract. 4.5 flips `enabled` to true and updates POST_TYPE_ICONS.discussion in PrayerCard.tsx from the HandHelping placeholder to MessagesSquare.

### R2 — `composerCopyByType` discussion entry is placeholder copy of prayer_request

`frontend/src/components/prayer-wall/InlineComposer.tsx` lines 79–88:

```typescript
discussion: {
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

4.5 replaces this entirely with discussion-specific copy. New optional field `showScriptureReferenceField: true` is added. The ComposerCopy interface (defined elsewhere in the file) gets the new field added with `showScriptureReferenceField?: boolean`.

The 4.4 PR already added `subline?: string` as an optional field on ComposerCopy. 4.5 adds `showScriptureReferenceField?: boolean` next to it. Pattern: every new optional UI affordance becomes another optional field on ComposerCopy.

### R3 — Backend scripture-pair validation already lives in PostService

`backend/src/main/java/com/worshiproom/post/PostService.java` lines 191–195:

```java
boolean scriptureRefPresent = request.scriptureReference() != null;
boolean scriptureTextPresent = request.scriptureText() != null;
if (scriptureRefPresent != scriptureTextPresent) {
    throw new InvalidScripturePairException();
}
```

Located in createPost between the qotdId existence check (line 188) and the HTML sanitization step (line 197). The contract: scripture_reference and scripture_text MUST both be present or both null.

`InvalidScripturePairException` exists. `PostExceptionHandler` maps it. `CreatePostRequest` DTO has both fields. No backend changes for 4.5.

### R4 — `PrayerCard.tsx` POST_TYPE_ICONS placeholder

`frontend/src/components/prayer-wall/PrayerCard.tsx` lines 22–28:

```typescript
const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles, // 4.3 — was HandHelping placeholder
  question: HelpCircle, // 4.4 — was HandHelping placeholder
  discussion: HandHelping, // placeholder until 4.5
  encouragement: HandHelping, // placeholder until 4.6
}
```

4.5 imports `MessagesSquare` from lucide-react alongside the existing `HandHelping, HelpCircle, Sparkles` imports and updates the discussion line to `discussion: MessagesSquare, // 4.5`. Comment updated to match the testimony / question precedent.

### R5 — `PrayerCard.tsx` chrome switch — discussion currently in default case

Lines 70–82:

```typescript
const articleChromeClasses = (() => {
  switch (prayer.postType) {
    case 'testimony':
      return 'rounded-xl border border-amber-200/10 bg-amber-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
    case 'question':
      return 'rounded-xl border border-cyan-200/10 bg-cyan-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
    case 'prayer_request':
    case 'discussion':
    case 'encouragement':
    default:
      return 'rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
  }
})()
```

4.5 adds a `case 'discussion':` branch returning the violet wash. Removes 'discussion' from the fall-through group with prayer_request and encouragement.

### R6 — `articleAriaLabel` switch — discussion currently in default

Lines 85–95:

```typescript
const articleAriaLabel = (() => {
  switch (prayer.postType) {
    case 'testimony':
      return `Testimony by ${prayer.authorName}`
    case 'question':
      return `Question by ${prayer.authorName}`
    case 'prayer_request':
    case 'discussion':
    case 'encouragement':
    default:
      return `Prayer by ${prayer.authorName}`
  }
})()
```

4.5 adds:

```typescript
case 'discussion':
  return `Discussion by ${prayer.authorName}`
```

And removes 'discussion' from the default fall-through group.

### R7 — `PrayerCard.tsx` QotdBadge renders on `qotdId`, not postType

Lines 100–104:

```typescript
{prayer.qotdId && (
  <div className="mb-1">
    <QotdBadge />
  </div>
)}
```

This logic is independent of postType. Manual discussions (no qotdId) render no badge; QOTD responses (qotdId set) render the badge regardless of whether the discussion is manual or QOTD-originated.

**Implication:** the master plan body AC 'QOTD responses continue to render with QotdBadge (no regression)' is ALREADY satisfied by existing code. 4.5 doesn't need to add or modify any QOTD logic.

### R8 — QOTD responses already use post_type='discussion' from Phase 3

Confirmed: backend QotdService and the frontend QOTD response submission flow set `post_type='discussion'` when persisting QOTD answers. The discussion type has been live in production data since Phase 3.7+; 4.5 just enables manual discussion composition for non-QOTD-originated posts.

This means 4.5 must verify NO regression on:
- QOTD response card rendering (chrome, badge, content layout)
- QOTD response card aria-label (will now read 'Discussion by {authorName}' — which is technically a copy regression from 'Prayer by {authorName}'; surface this in the brief but ship the change since 'Discussion' is more accurate)
- QOTD response feed query (postType filter that includes 'discussion' continues to surface QOTD answers)

If there's an a11y test that asserts QOTD response aria-label = 'Prayer by ...', it will need to update to 'Discussion by ...'. Plan should grep:

```bash
grep -rn "Prayer by " frontend/src --include='*.test.*'
```

### R9 — `PrayerRequest` type already has scriptureReference + scriptureText

`frontend/src/types/prayer-wall.ts` (per earlier 4.4 recon):

```typescript
scriptureReference?: string
scriptureText?: string
```

Both optional. No type changes for 4.5.

### R10 — `parseReference` utility location and contract

`frontend/src/lib/search/reference-parser.ts`:

```typescript
export interface ParsedReference {
  book: string      // book slug (e.g., 'john', 'genesis')
  chapter: number
  verse?: number
  verseEnd?: number
}

export function parseReference(input: string): ParsedReference | null
```

Returns null for invalid input. The slug ('john') matches the URL path segment used by the Bible reader. Note: input like 'John' (book only, no chapter) returns null — chapter is required.

The function is synchronous, pure, and side-effect-free. Use it in the debounced effect of ScriptureReferenceInput.

### R11 — Verse text lookup utility

`frontend/src/lib/search/engine.ts` line 247–:

```typescript
export async function loadVerseTexts(refs: VerseRef[]): Promise<Map<string, string>>
```

`VerseRef` is a tuple `[bookSlug, chapter, verse]`. The function returns a Map keyed by `'bookSlug:chapter:verse'` → verse text.

For 4.5's single-verse lookup, this is overkill. A simpler helper exists in the same module — `loadChapterWeb(bookSlug, chapter)` returns the chapter JSON, from which the specific verse can be picked.

**Decision (D9):** ScriptureReferenceInput uses `loadChapterWeb` + manual verse extraction. Don't pull in `loadVerseTexts` for a single ref — it's over-engineered for that case.

If `loadChapterWeb` is not exported from the public surface of `@/lib/search/engine` or another module, the plan finds the closest equivalent (or wraps `loadVerseTexts` with a 1-element refs array as a fallback).

### R12 — Bible reader URL pattern

`frontend/src/components/bible/BibleSearchMode.tsx` line 91–92:

```typescript
const verseSuffix = ref.verse !== undefined ? `?verse=${ref.verse}` : ''
navigate(`/bible/${ref.book}/${ref.chapter}${verseSuffix}`)
```

Path: `/bible/{book.slug}/{chapter}` with optional `?verse={n}` query param. Used by ScriptureChip's `<Link to={...}>` target.

### R13 — Lucide `MessagesSquare` and `BookOpen` icons availability

- `MessagesSquare`: standard Lucide icon, used for chat/discussion contexts. Plan can grep node_modules to confirm.
- `BookOpen` (or `BookMarked`, or `Bookmark`): standard Lucide. Used by ScriptureChip. Pick one in plan after visual review of the chip.

If `MessagesSquare` is missing in the project's Lucide version (older versions had `MessageSquare` only), fallback is `MessageCircle` or `MessageSquare`.

### R14 — Violet/purple palette in Tailwind

Same recurring concern as 4.3's amber and 4.4's cyan: verify the violet utilities (`bg-violet-500/[0.04]`, `border-violet-200/10`) compile under the project's Tailwind config.

If the project has a `primary` semantic color matching #8B5CF6 (violet-500), the chrome could alternatively use `bg-primary/[0.04]` and `border-primary/10` — but this requires the `primary` color to be configured in `tailwind.config.js` AND to support the `/[0.04]` opacity modifier (which it should under Tailwind 3+).

**Decision (D5):** default to `bg-violet-500/[0.04]` + `border-violet-200/10` for parity with the explicit color choices used in 4.3 and 4.4. If the project's `primary` token is in fact violet-500, the plan can swap to `bg-primary/[0.04]` for brand cohesion. Either is acceptable.

Fallback if violet is missing: use hex `bg-[#8B5CF6]/[0.04]` and `border-[#C4B5FD]/10`.

### R15 — `_plans/post-1.10-followups.md` next available section

After 4.4 filed §X (threading) and possibly §Y (testimony scripture-pair selector deferred from 4.3), the next available number for 4.5's filings is whatever comes next. The planner reads the file at plan time.

**4.5 may file:**

- `Per-type expiry rules` (one combined entry covering questions, discussions, encouragements — see MPD-2's expiry table)

If 4.4 did not file the per-type expiry entry, 4.5 owns it.

### R16 — `prayer-wall-mock-data.ts` (or equivalent) state

The mock data file currently has fixtures for prayer_request, testimony (post-4.3), and question (post-4.4). 4.5 adds:

- 1 manual discussion fixture without scripture reference
- 1 manual discussion fixture WITH scripture reference (use a real reference like 'Romans 8:28')
- 1 QOTD-response discussion (with `qotdId` set) — verify this fixture already exists from Phase 3
- Optional: 1 discussion with comments to exercise threaded-reply rendering (flat, per MPD-3)

The verse text for the WITH-scripture fixture should be the actual WEB translation text (Eric uses WEB throughout — see the userMemories context). The plan can fetch the text from the Bible data directly OR hard-code the verse text in the fixture (acceptable for mocks).

### R17 — `PrayerWall.tsx` per-type maps for toast and auth modal

Files: `frontend/src/pages/PrayerWall.tsx` (or wherever the maps live — verify path during plan):

- `successToastByType.discussion` is currently a placeholder. 4.5 fills in.
- `authModalCtaByType.discussion` is currently a placeholder. 4.5 fills in.

Pattern from 4.4:

```typescript
const successToastByType: Record<PostType, string> = {
  prayer_request: 'Your prayer is on the wall. The community can lift it up with you.',
  testimony: 'Your testimony is on the wall. Others can rejoice with you.',
  question: 'Your question is on the wall. Others can weigh in.',
  discussion: 'Your discussion is on the wall. Others can think it through with you.',
  encouragement: '...',
}
```

### R18 — `POST_TYPE_LIMITS` discussion entry

`frontend/src/constants/content-limits.ts` discussion entry currently set to prayer_request defaults (max 1000). 4.5 updates to 2000 (matching question — discussions are mid-length, not essay-length like testimony).

```typescript
discussion: {
  max: 2000,
  warningAt: 1600,
  dangerAt: 1900,
  visibleAt: 1000,
},
```

Backend's `maxContentLengthFor(DISCUSSION)` should already return 2000 (per the 4.3 brief MPD-5 / D3 pattern of 'non-testimony types stay at 2000'). Verify in plan.

### R19 — `loadChapterWeb` confirmation

Recon needs a final pass on `loadChapterWeb`'s exact import path during plan. Likely candidates:

- `@/lib/bible/chapters` or `@/data/bible/chapters` or similar
- Returns `{ verses: Array<{ number: number; text: string }> }` based on the destructuring shown in `loadVerseTexts`

The plan reads the actual function signature and adapts. If `loadChapterWeb` is internal-only (not exported), the plan either:
(a) Re-exports it
(b) Uses `loadVerseTexts` with a 1-element array
(c) Imports the raw chapter JSON

### R20 — No `expires_at` column on Post entity (mirrors 4.4 R7)

Post entity has no `expires_at` column. MPD-2 explicitly defers expiry. 4.5 does NOT add the column. Don't let CC sneak it in.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

| # | Gate | Applies to 4.5? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check (createPost) | Applies (unchanged) | Discussion goes through createPost; existing idempotency contract unchanged |
| 2 | Rate-limit consumption order | Applies (unchanged) | Existing PostsRateLimitService applies |
| 3 | Cross-field validation | **Applies — extended via existing pair check** | InvalidScripturePairException already validates the pair; 4.5 must NOT change the validation order |
| 4 | HTML sanitization BEFORE length check | Applies (unchanged) | Discussion content goes through the same sanitization path |
| 5 | Length check after sanitization | Applies (unchanged) | maxContentLengthFor(DISCUSSION) returns 2000 |
| 6 | Crisis detection on sanitized content | Applies (unchanged) | Discussions are subject to crisis detection like all post types |
| 7 | AFTER_COMMIT crisis event publishing | Applies (unchanged) | No 4.5-specific changes |
| 8 | Activity recording (PRAYER_WALL ActivityType) | Applies (unchanged) per MPD-1 | Discussion creation emits PRAYER_WALL activity |
| 9 | EntityManager refresh for DB defaults | Applies (unchanged) | Save-then-refresh pattern unchanged |
| 10 | Logging IDs only (no content) | Applies (unchanged) | No new logging in 4.5 |
| 11 | `ContentTooLongException` error code/message contract | Applies (unchanged) | Discussion 2000-char limit message follows the pattern |
| 12 | JSR-303 enforcement BEFORE service-layer rules | Applies (unchanged) | scriptureReference @Size(max=100), scriptureText @Size(max=2000) — already configured |
| 13 | PostType wire-format ↔ Java enum drift sync | Applies (unchanged) | discussion enum value already exists |

**No new addendum gate introduced by 4.5.** The async verse-text lookup is FRONTEND-only (Section 7 D11) and doesn't add a backend invariant.

---

## 7. Decisions and divergences

### D1 — Activity engine deferral (mirrors 4.3, 4.4)

Already covered in MPD-1.

### D2 — Expiry deferred (mirrors 4.4 MPD-2)

Already covered in MPD-2.

### D3 — Threading UI deferred (mirrors 4.4 MPD-3)

Already covered in MPD-3.

### D4 — Discussion content limit 2000 (matches question)

```typescript
discussion: {
  max: 2000,
  warningAt: 1600,
  dangerAt: 1900,
  visibleAt: 1000,
},
```

Same numbers as question. Discussions are conversational; 2000 chars is the right cap.

### D5 — Chrome wash: violet utilities (with primary token fallback)

```typescript
case 'discussion':
  return 'rounded-xl border border-violet-200/10 bg-violet-500/[0.04] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20'
```

The brief defaults to `violet-*` over `primary` because:
- Tailwind's `violet` palette is guaranteed available (default config)
- `primary` requires verification of the project's tailwind.config.js
- 4.3 used `amber-*` and 4.4 used `cyan-*` — discussion using `violet-*` follows the same naming pattern (named palette, not semantic token)

If the plan finds that the project's `primary` semantic token is configured to `#8B5CF6` (violet-500), it MAY swap `bg-violet-500/[0.04]` → `bg-primary/[0.04]` for brand cohesion. Either is acceptable.

**Rejected alternative:** indigo or purple palette. Violet matches Eric's existing brand gradient endpoint (`#8B5CF6`) most closely.

### D6 — Discussion icon: MessagesSquare

Already chosen in `post-types.ts` (R1). PrayerCard's POST_TYPE_ICONS map updated to import and use it. Comment line: `discussion: MessagesSquare, // 4.5`.

### D7 — ScriptureChip component contract

```typescript
// frontend/src/components/prayer-wall/ScriptureChip.tsx
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { parseReference } from '@/lib/search/reference-parser'
import { cn } from '@/lib/utils'

interface ScriptureChipProps {
  reference: string  // human-readable, e.g., 'John 3:16'
  className?: string
}

export function ScriptureChip({ reference, className }: ScriptureChipProps) {
  const parsed = parseReference(reference)

  // If the stored reference is unparseable (data corruption / older format),
  // render a non-link span instead of failing. Defensive — should never fire
  // in normal flow, since the composer validates before submit.
  if (!parsed) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200/90',
          className
        )}
        aria-label='Scripture reference (unlinked)'
      >
        <BookOpen className='h-3 w-3' aria-hidden='true' />
        {reference}
      </span>
    )
  }

  const verseSuffix = parsed.verse !== undefined ? `?verse=${parsed.verse}` : ''
  const path = `/bible/${parsed.book}/${parsed.chapter}${verseSuffix}`

  return (
    <Link
      to={path}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200/90 transition-colors hover:bg-violet-500/25 hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300',
        className
      )}
      aria-label={`Read ${reference} in the Bible`}
    >
      <BookOpen className='h-3 w-3' aria-hidden='true' />
      {reference}
    </Link>
  )
}
```

**Rejected alternative:** showing a tooltip with the verse text on hover. Out of scope for 4.5 — adds complexity and may interact poorly with existing card hover states. Future enhancement; not blocking ship.

### D8 — ScriptureChip placement on PrayerCard

Mounted between the content body and the InteractionBar. The exact placement code:

```typescript
<p className='whitespace-pre-wrap text-sm leading-relaxed text-white/85'>
  {displayText}
</p>

{prayer.scriptureReference && (
  <div className='mt-3'>
    <ScriptureChip reference={prayer.scriptureReference} />
  </div>
)}

{/* ... existing InteractionBar mount ... */}
```

The `mt-3` separation is intentional — the chip needs visual breathing room from the content. It's a navigational affordance, not a decoration.

For posts without scripture (most prayer_requests, testimonies, encouragements), the conditional renders nothing — no empty div, no layout shift.

### D9 — Verse text lookup uses loadChapterWeb

Per R11 / R19. ScriptureReferenceInput's lookup code:

```typescript
import { parseReference } from '@/lib/search/reference-parser'
// loadChapterWeb path verified during plan — likely '@/lib/bible/chapters' or similar

async function lookupVerseText(reference: string): Promise<string | null> {
  const parsed = parseReference(reference)
  if (!parsed || parsed.verse === undefined) return null

  try {
    const chapter = await loadChapterWeb(parsed.book, parsed.chapter)
    const verse = chapter?.verses.find(v => v.number === parsed.verse)
    return verse?.text ?? null
  } catch {
    return null
  }
}
```

**Decision:** if `parsed.verse` is undefined (user entered just 'John 3' with no verse), the lookup returns null. The composer treats this as 'reference is valid for navigation but has no specific verse text' and submits an empty/no scripture pair (D14).

Rationale: a chapter-only reference doesn't have a single verse text to populate `scripture_text`. Storing the entire chapter as scripture_text is too much. Storing the first verse is misleading. Cleaner to require a specific verse for the pair to commit.

### D10 — ScriptureReferenceInput component contract

```typescript
// frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx

interface ScriptureReferenceInputProps {
  /** Called whenever the validated reference + text pair changes.
   *  Both null = field empty or invalid; both set = valid + text loaded. */
  onChange: (reference: string | null, text: string | null) => void
}

// Component owns:
// - Local state for the raw input string
// - Debounced effect that runs parseReference + loadChapterWeb
// - Race condition guard via abort controller / fetch sequence number
// - Three visible states: empty (no indicator), valid (green check + verse preview), invalid (red dot)
//
// External contract: emits onChange when the resolved state changes.
//   - User types 'Joh' → onChange(null, null) (still typing, not valid yet)
//   - User types 'John 3:16' → debounce, lookup, onChange('John 3:16', 'For God so loved...')
//   - User clears → onChange(null, null)
//   - User types invalid → onChange(null, null) AND inline error indicator
```

The InlineComposer uses the emitted values to fill scriptureReference + scriptureText in the create-post payload. When both are null at submit time, neither field is sent. When both are set, both are sent.

### D11 — Async lookup state machine

The component must handle three race conditions:

1. **Sequential keystrokes:** user types 'John 3:1' (lookup fires), then '...6' (second lookup fires before first resolves). The first lookup's response must be DISCARDED.
2. **Empty after typing:** user types 'John 3:16' (lookup fires), then deletes the entire input. The lookup response, when it resolves, must NOT populate state.
3. **Invalid after valid:** user types 'John 3:16' (lookup succeeds, text shown), then changes to 'Foo 99:99' (parse fails). The previous valid state must be discarded.

**Implementation:**

```typescript
const [rawInput, setRawInput] = useState('')
const [resolvedRef, setResolvedRef] = useState<string | null>(null)
const [resolvedText, setResolvedText] = useState<string | null>(null)
const [isLookingUp, setIsLookingUp] = useState(false)
const [hasError, setHasError] = useState(false)
const lookupSeqRef = useRef(0)

useEffect(() => {
  // Whenever rawInput changes, clear external state immediately.
  // The lookup will repopulate if it resolves to a valid pair.
  if (rawInput.trim() === '') {
    setResolvedRef(null)
    setResolvedText(null)
    setHasError(false)
    onChange(null, null)
    return
  }

  const parsed = parseReference(rawInput)
  if (!parsed) {
    setResolvedRef(null)
    setResolvedText(null)
    setHasError(true)
    onChange(null, null)
    return
  }

  if (parsed.verse === undefined) {
    // Chapter-only reference. Per D9, no scripture pair is committed.
    setResolvedRef(null)
    setResolvedText(null)
    setHasError(false)
    onChange(null, null)
    return
  }

  // Valid reference with verse. Look up the text.
  setHasError(false)
  const seq = ++lookupSeqRef.current
  setIsLookingUp(true)

  const debounceHandle = setTimeout(async () => {
    const text = await lookupVerseText(rawInput)

    // Stale-response guard
    if (seq !== lookupSeqRef.current) return

    setIsLookingUp(false)
    if (text) {
      setResolvedRef(rawInput)
      setResolvedText(text)
      onChange(rawInput, text)
    } else {
      setResolvedRef(null)
      setResolvedText(null)
      setHasError(true)
      onChange(null, null)
    }
  }, 300)

  return () => clearTimeout(debounceHandle)
}, [rawInput, onChange])
```

The `lookupSeqRef` increment-and-compare pattern is the load-bearing guard. Every effect run increments the seq; only the lookup whose seq matches the latest one is allowed to update state. This is more reliable than AbortController for non-fetch async (loadChapterWeb may use a cache hit and return synchronously-ish).

### D12 — Composer rejects submit with invalid scripture reference

If the user has typed a reference that fails validation (red error indicator showing), the Submit button is DISABLED. Tooltip / helper text explains: 'Fix the scripture reference or clear the field to continue.'

Rationale: silently submitting with no scripture pair when the user clearly meant to attach one would be a UX trap. Easier to block submit than to discard the user's typed input.

The Submit button stays ENABLED when:
- The scripture field is empty (no scripture pair sent)
- The scripture field has a valid reference WITH verse text loaded (full pair sent)
- The scripture field has a valid chapter-only reference (no pair sent per D9; show a small note 'Specify a verse to attach scripture' below the input — but don't block submit)

### D13 — Copy strings (full inventory)

| Element | Copy | Pastor's wife test |
| --- | --- | --- |
| Composer header | `'Start a discussion'` | ✓ Inviting, calm |
| Composer placeholder | `'What scripture or topic do you want to think through with others?'` | ✓ Direct from master plan; thoughtful |
| Composer aria-label | `'Discussion'` | ✓ Descriptive |
| Composer submit | `'Start Discussion'` | ✓ Active voice, workmanlike |
| Composer footer | `'Your discussion will be shared with the community. Be kind and respectful.'` | ✓ Standard |
| Scripture field label | `'Scripture reference (optional)'` | ✓ Clear, honest |
| Scripture field placeholder | `'e.g., Romans 8:28'` | ✓ Example-driven |
| Scripture verse preview prefix | `'WEB:'` (followed by the verse text) | ✓ Translation transparent |
| Scripture chapter-only note | `'Specify a verse to attach scripture (e.g., Romans 8:28).'` | ✓ Helpful, not punitive |
| Scripture invalid error | `'That reference doesn't match a Bible book and chapter.'` | ✓ Plain, not alarming |
| Submit-blocked tooltip | `'Fix the scripture reference or clear the field to continue.'` | ✓ Clear corrective |
| Success toast | `'Your discussion is on the wall. Others can think it through with you.'` | ✓ Calm invitation |
| Auth modal CTA | `'Sign in to start a discussion'` | ✓ Standard |
| Article aria-label | `'Discussion by {authorName}'` | ✓ Descriptive |
| ScriptureChip aria-label | `'Read {reference} in the Bible'` | ✓ Action-oriented |
| ScriptureChip fallback aria-label | `'Scripture reference (unlinked)'` | ✓ Defensive copy |

### D14 — Anonymous toggle behavior for discussion

Keep the toggle visible. No attribution nudge.

Rationale: discussions are conversational and not vulnerability-adjacent in the way questions can be. The default-anonymous behavior matches prayer_request. No need for testimony-style nudge.

`composerCopyByType.discussion.showAttributionNudge: false`

### D15 — Hide category fieldset for discussion

Discussions are not prayer-categorized (no 'health' / 'family' / 'work' tags). Hide the category fieldset.

Backend already excludes discussion from the require-category check (see PostService line 158, where only PRAYER_REQUEST is required to have a category — discussion was previously also required, but the existing check only applies to prayer_request and discussion if the user-provided value is missing... let me double-check). Plan verifies this during recon.

Actually — per 4.4 brief R6: backend requires category for `(PRAYER_REQUEST || DISCUSSION) && category == null`. 4.5 needs to either:
(a) Remove DISCUSSION from the require-category check (allow discussion with no category)
(b) Have the composer auto-fill `category: 'discussion'` (using the existing 'discussion' VALID_CATEGORIES entry from PostController line 56)

**Decision:** option (b). The frontend hides the fieldset and submits `category: 'discussion'`. Backend validation is unchanged. The 'discussion' value in VALID_CATEGORIES is already there exactly for this case (Phase 3 added it for QOTD responses).

`composerCopyByType.discussion.showCategoryFieldset: false`

In the InlineComposer's submit handler, when postType is 'discussion' and the fieldset is hidden, set `category: 'discussion'` before sending.

### D16 — Hide challenge checkbox for discussion

Discussions are not part of the daily prayer challenge. Hide.

`composerCopyByType.discussion.showChallengeCheckbox: false`

### D17 — composerCopy minHeight: 160px

Between prayer_request (120px) and testimony (180px). Discussions tend to run longer than a one-liner prayer but shorter than a full testimony.

### D18 — `subline` is NOT used by discussion

The 4.4-introduced subline field (`composerCopyByType.question.subline`) is question-specific. Discussion does NOT set `subline`. Reasoning: the discussion's prompt is in the placeholder (`'What scripture or topic do you want to think through with others?'`), which is more action-oriented than a separate explanatory line. Adding both a placeholder and a subline would be over-explaining.

---

## 8. Watch-fors

### W1 — 4.4 must ship before 4.5 starts

Verify in `_forums_master_plan/spec-tracker.md` that 4.4 is ✅. Verify on disk that:

- `composerCopyByType.question.subline` exists in InlineComposer.tsx (4.4's new field)
- `ResolvedBadge.tsx` exists (4.4's new component)
- `prayerWallApi.resolveQuestion` exists in the API client
- `PATCH /api/v1/posts/{id}/resolve` endpoint exists in PostController.java

If any of these are missing, STOP. Don't proceed without 4.4 shipped.

### W2 — Don't add expires_at column

Per MPD-2. The 3-day discussion expiry from the master plan body is Phase 6 territory.

### W3 — Don't add scripture_reference or scripture_text columns

Per MPD-4 / R3. They already exist on Post entity. Adding a duplicate Liquibase changeset breaks the migration.

### W4 — Don't change `InvalidScripturePairException` or its handler

The exception class, the throwing logic in PostService, and the ExceptionHandler mapping ALL exist and work. Don't refactor or 'improve' them.

### W5 — Don't break QOTD response rendering

QOTD responses use `postType='discussion'` and have `qotdId` set. They render with the existing QotdBadge above the header (R7). The new violet wash WILL apply to them — that's intentional. But:

- The QotdBadge must continue to render (no regression in the conditional)
- The QOTD-specific copy ('Today's question:' or whatever the badge says) is unchanged
- The QOTD response feed (which filters by qotdId presence or by a separate flag) continues to work

If during /verify-with-playwright a QOTD response renders without QotdBadge, that's a regression. The fix is in PrayerCard.tsx — verify the `{prayer.qotdId && ...}` block was not modified.

### W6 — ScriptureReferenceInput must be debounced

Per D11. Without debounce, every keystroke fires a chapter fetch. The Bible chapter JSON files are not tiny — for a long book like Psalms or Isaiah, fetching 150 chapters worth of unnecessary data is bad. Debounce 300ms is the floor.

If CC writes the lookup as a non-debounced effect, /code-review must catch it.

### W7 — ScriptureReferenceInput must guard against stale responses

Per D11. The seq counter pattern (or AbortController) is required. Without it, fast typing produces visible flicker as out-of-order responses overwrite each other.

Test surface: type 'John 3:1' (let it resolve), then type '6' to make 'John 3:16'. The verse preview must show John 3:16's text, not John 3:1's. Add a unit test that triggers two lookups in quick sequence and asserts only the second's result is used.

### W8 — Submit must NOT send only scriptureReference (or only scriptureText)

Per R3 / D11. The backend's pair contract is unforgiving — sending one without the other returns 400. The InlineComposer's submit logic must check:

```typescript
const submitPayload = {
  // ... other fields ...
  scriptureReference: resolvedRef ?? undefined,
  scriptureText: resolvedText ?? undefined,
}
```

Sending `null` for one and a string for the other = 400 from backend. The brief's contract: ScriptureReferenceInput's onChange always emits BOTH null or BOTH set. Submit reads from the same state pair.

### W9 — Don't auto-fill scripture text from the input field

CC sometimes 'helpfully' tries to skip the lookup by just submitting `{ scriptureReference: input, scriptureText: input }` (using the reference as the text). This sends bogus data to the backend (the text would be 'John 3:16' instead of 'For God so loved the world...').

The text MUST come from the verse data. If the lookup fails, no scripture pair is sent (D14).

### W10 — Don't render ScriptureChip when scriptureReference is null

Per D8. The conditional `{prayer.scriptureReference && ...}` handles this. But CC sometimes renders an empty wrapper or an empty fallback string. The chip is conditional ALL the way — no wrapper div, no placeholder text, no fallback rendering.

### W11 — Don't try to pre-fetch the entire Bible

The lookup uses `loadChapterWeb(book, chapter)` for a SINGLE chapter at a time. Don't refactor it to load the full Bible upfront. The Bible reader's existing chapter-on-demand loading is the right pattern; don't change it for discussion composition.

### W12 — Don't put scripture reference in the URL params at submit

The composer sends scripture in the JSON body of the create-post POST, not as URL params. CC sometimes constructs `/api/v1/posts?scriptureRef=...` — wrong.

### W13 — Don't change the post-types.ts ordering

The POST_TYPES array is positional in some test assertions. Discussion stays at index 3 (between question and encouragement). Don't reorder.

### W14 — Don't modify QotdComposer

`frontend/src/components/prayer-wall/QotdComposer.tsx` is the QOTD-specific submission flow (separate from InlineComposer for the QOTD modal). 4.5 does NOT modify it. The QOTD answer flow continues to use its own composer with its own copy. The InlineComposer's discussion variant is for MANUAL discussions, not QOTD answers.

### W15 — Don't auto-redirect to Bible reader on chip click in mobile

Mobile devices may handle external link clicks differently. The chip uses `<Link>` (React Router internal navigation), not `<a>` (browser navigation). Don't refactor to `<a target='_blank'>` or `window.open` — both break the SPA navigation model.

### W16 — Don't show the scripture chip on the composer preview

If the InlineComposer renders any kind of post-creation preview (it doesn't currently, but if 4.7 Composer Chooser introduces one), the scripture chip would NOT render in the preview. The chip is for AFTER post creation. The composer's own scripture preview (D11 verse text under the input) is sufficient.

### W17 — Don't break the chapter-only valid-but-no-pair case (D9)

User types 'John 3' (chapter only, no verse). parseReference returns valid. ScriptureReferenceInput sees parsed.verse === undefined and:
- Does NOT show the red error indicator (the reference IS valid for navigation)
- Does NOT show the green success indicator (no pair to commit)
- Shows the helpful note: 'Specify a verse to attach scripture'
- Submit stays ENABLED — user can submit the discussion without scripture

If CC treats chapter-only as invalid (red error + submit blocked), that's a UX regression.

### W18 — Don't add scripture reference TO THE TEXTAREA content

Some users might paste 'John 3:16 - For God so loved...' into the main content textarea. That's their choice; don't auto-extract the reference from the content and populate the scripture field. Auto-extraction is fragile and surprising. The scripture field is a separate, opt-in input.

### W19 — Violet palette compilation (mirrors 4.3 amber, 4.4 cyan)

Per R14. Verify Tailwind config. Fallback to hex literals if needed.

### W20 — Don't introduce 'discussion' as a prayer category in the UI

The backend already has 'discussion' in `VALID_CATEGORIES` (PostController line 56) for the QOTD case. The composer for a discussion post auto-fills `category: 'discussion'` per D15. But the CategoryFilterBar / CategoryBadge UI does NOT need to handle 'discussion' as a user-visible category — it's an internal classification, not a tag users see.

If CC adds 'discussion' to the CategoryBadge's prayer-category map or the CategoryFilterBar's filter chips, that's a leak.

### W21 — Don't change the Bible reader URL pattern

The path `/bible/{book.slug}/{chapter}?verse={n}` is the Bible reader's existing public URL. ScriptureChip's `<Link to={...}>` builds this path. Don't introduce a new chip-specific path like `/scripture/{ref}` — the chip should land on the existing reader.

### W22 — Don't fetch verse text on PrayerCard render

The ScriptureChip displays the reference TEXT, not the verse text. The verse text is stored in `prayer.scriptureText` from the backend; the chip doesn't need to re-fetch it. Some implementations might try to pre-fetch the text for display in a tooltip — explicitly out of scope for 4.5 (D7's rejected alternative).

### W23 — Don't break the discussion onSubmit signature

InlineComposer's `onSubmit` callback signature includes `postType` (added in 4.2) and accepts the same shape regardless of post type. The scripture pair fields are NOT part of the onSubmit signature — they're set on the payload built INSIDE the composer before calling the API.

If CC wants to pass scripture fields through onSubmit, that's a refactor outside 4.5's scope.

### W24 — Don't auto-link references inside the content body

The content `<p>` rendering parses `@-mentions` (per CommentItem.tsx pattern). It does NOT auto-link scripture references mentioned IN the content body. If a user writes 'I was reading Romans 8:28 and...' in the content, that text stays as-is. The chip is the dedicated affordance.

### W25 — Don't use scripture chip for non-discussion post types in 4.5

Per D7, ScriptureChip is decoupled from postType — it renders whenever scriptureReference is set. But in 4.5, the only post type that POPULATES scriptureReference is discussion. Testimony scripture-pair selector is a Phase 5 follow-up.

If CC's plan adds the chip to testimony composer, STOP — that's the deferred §28 follow-up, not 4.5.

### W26 — Don't tie discussion existence to QOTD

The 'discussion' post type now has TWO sources:
1. Manual discussion creation via InlineComposer (NEW in 4.5)
2. QOTD response submission (existing from Phase 3)

Both sources produce posts with `postType='discussion'`. The QOTD source ADDITIONALLY sets `qotdId`. The chrome and composer logic in 4.5 must NOT assume `discussion === QOTD response`; it's a superset.

### W27 — Don't break 'discussion' wiring in feed filters

Existing feed queries that filter by postType include 'discussion' (because QOTD responses are visible in mixed feeds). Don't add a new filter that excludes manual discussions.

If there's a 'show only manual discussions' or 'show only QOTD responses' filter requested in the future, that's a separate feature.

### W28 — Don't store the verse text in localStorage

The composer's verse-text lookup is per-session. Don't cache to localStorage — the WEB Bible data is small enough that re-fetching on each composer open is fine, and cache invalidation (when the Bible data updates) becomes a problem otherwise.

### W29 — Don't validate scripture as part of JSR-303

The backend's JSR-303 validation on CreatePostRequest already covers `scriptureReference @Size(max=100)` and `scriptureText @Size(max=2000)`. The PAIR validation (both-or-neither) is in service-layer code (PostService line 191–195). Don't try to express the pair invariant via JSR-303 cross-field annotations — service-layer is the right place.

### W30 — Don't show ScriptureChip while the verse text is loading

The chip is rendered based on `prayer.scriptureReference` from saved post data. There's no 'loading' state for the chip — by the time it renders, the data is committed. Don't introduce a skeleton or shimmer.

### W31 — Don't break the InlineComposer when category is auto-filled

Per D15, discussion composer auto-fills `category: 'discussion'` at submit time. If CC implements this by setting state on every render, it can cause infinite re-renders. The auto-fill happens ONCE in the submit handler, not on every render.

### W32 — Don't accidentally submit the scripture preview verse text

The verse-text preview shown below the scripture input is for the user's confirmation only. The composer's submit pulls scriptureText from the resolved-state value, not from any DOM element's text content. Don't read `.textContent` of the preview to populate scriptureText.

---

## 9. Test specifications

Target: ~30 tests across frontend (no backend changes per MPD-4). Master plan AC says ≥12 — we exceed for the lookup state machine and chip behavior.

### Frontend tests

**`frontend/src/constants/__tests__/post-types.test.ts`** (UPDATE — flip discussion enabled, leave encouragement disabled):

```typescript
it('prayer_request, testimony, question, and discussion are enabled', () => {
  expect(getPostType('prayer_request').enabled).toBe(true)
  expect(getPostType('testimony').enabled).toBe(true)
  expect(getPostType('question').enabled).toBe(true)
  expect(getPostType('discussion').enabled).toBe(true)
})

it('encouragement is the only disabled post type', () => {
  expect(getPostType('encouragement').enabled).toBe(false)
})
```

**`frontend/src/constants/__tests__/content-limits.test.ts`** (UPDATE — discussion limits):

```typescript
it('discussion limits are 2000 (matches question)', () => {
  expect(POST_TYPE_LIMITS.discussion.max).toBe(2000)
  expect(POST_TYPE_LIMITS.discussion.warningAt).toBe(1600)
  expect(POST_TYPE_LIMITS.discussion.dangerAt).toBe(1900)
  expect(POST_TYPE_LIMITS.discussion.visibleAt).toBe(1000)
})
```

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE — add 5 tests):

- Discussion chrome: `bg-violet-500/[0.04]` and `border-violet-200/10` applied when postType is discussion
- Discussion chrome NOT applied for prayer_request, testimony, question
- Discussion icon: MessagesSquare rendered for postType=discussion
- Article aria-label: 'Discussion by {authorName}' for postType=discussion
- QotdBadge still renders on QOTD-tagged discussion (qotdId set + postType=discussion)

**`frontend/src/components/prayer-wall/__tests__/ScriptureChip.test.tsx`** (NEW — 6 tests):

- Renders the reference text and BookOpen icon
- Builds correct path `/bible/{book}/{chapter}?verse={n}` for ref with verse
- Builds correct path `/bible/{book}/{chapter}` (no query) for chapter-only ref
- Has correct aria-label `'Read {reference} in the Bible'`
- Renders fallback span (not Link) when reference is unparseable
- Accepts and applies className override

```typescript
describe('ScriptureChip', () => {
  it('renders reference text and link to Bible reader', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference='John 3:16' />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /Read John 3:16/ })).toHaveAttribute('href', '/bible/john/3?verse=16')
  })

  it('handles chapter-only reference (no verse query param)', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference='Romans 8' />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/bible/romans/8')
  })

  it('renders unlinked span when reference is unparseable', () => {
    render(<ScriptureChip reference='Foo 99:99' />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Scripture reference (unlinked)')).toBeInTheDocument()
  })

  // ... etc
})
```

**`frontend/src/components/prayer-wall/__tests__/ScriptureReferenceInput.test.tsx`** (NEW — 8 tests):

- Renders the input with correct label and placeholder
- Empty input emits `onChange(null, null)`
- Invalid input emits `onChange(null, null)` and shows error indicator
- Valid input with verse triggers debounced lookup; emits `onChange(reference, text)` after 300ms
- Multiple rapid keystrokes only commit the LAST resolved value (race guard)
- Clearing the input after a valid lookup emits `onChange(null, null)` immediately
- Chapter-only reference shows the helpful note, doesn't show error, doesn't emit pair
- Mock `loadChapterWeb` returning a chapter with the matching verse → state machine resolves correctly

This is the most subtle test surface. The race-condition test:

```typescript
it('only commits the last lookup result when typing rapidly', async () => {
  const onChange = vi.fn()
  let resolveLookup1: (text: string) => void
  let resolveLookup2: (text: string) => void

  const mockLoadChapter = vi.fn()
    .mockImplementationOnce(() => new Promise(resolve => {
      resolveLookup1 = (text) => resolve({ verses: [{ number: 1, text }] })
    }))
    .mockImplementationOnce(() => new Promise(resolve => {
      resolveLookup2 = (text) => resolve({ verses: [{ number: 16, text }] })
    }))

  vi.mocked(loadChapterWeb).mockImplementation(mockLoadChapter)

  const user = userEvent.setup()
  render(<ScriptureReferenceInput onChange={onChange} />)

  await user.type(screen.getByLabelText(/scripture reference/i), 'John 3:1')
  // wait for debounce
  await new Promise(r => setTimeout(r, 350))

  await user.type(screen.getByLabelText(/scripture reference/i), '6')
  await new Promise(r => setTimeout(r, 350))

  // Resolve the SECOND lookup first
  resolveLookup2!('For God so loved...')
  // Then resolve the first (stale)
  resolveLookup1!('There was a man...')

  await waitFor(() => {
    // Expect only the second lookup's result to be committed
    expect(onChange).toHaveBeenLastCalledWith('John 3:16', 'For God so loved...')
  })
})
```

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE — add 8 tests):

- Discussion variant header `'Start a discussion'`
- Discussion variant placeholder `'What scripture or topic do you want to think through with others?'`
- Discussion variant submit button `'Start Discussion'`
- ScriptureReferenceInput renders for postType=discussion
- ScriptureReferenceInput does NOT render for prayer_request, testimony, question
- Submit DISABLED when scripture field is invalid; enabled when empty or valid
- Submit payload includes scripture pair when valid; excludes when empty
- Discussion submit auto-fills `category: 'discussion'` (D15)

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE — add 2 tests):

- Successful discussion post shows toast `'Your discussion is on the wall. Others can think it through with you.'`
- Unauthenticated discussion composer open uses auth modal CTA `'Sign in to start a discussion'`

### Total test budget

- post-types.test.ts: 2 tests updated
- content-limits.test.ts: 1 test added
- PrayerCard.test.tsx: 5 new
- ScriptureChip.test.tsx: 6 new (new file)
- ScriptureReferenceInput.test.tsx: 8 new (new file)
- InlineComposer.test.tsx: 8 new
- PrayerWall.test.tsx: 2 new

**Total: ~32 tests.** Comfortably exceeds master plan AC's ≥12 threshold.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/components/prayer-wall/ScriptureChip.tsx` — NEW component (per D7). ~50 lines.
- `frontend/src/components/prayer-wall/__tests__/ScriptureChip.test.tsx` — NEW test file. ~80 lines.
- `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` — NEW component (per D10, D11). ~120 lines.
- `frontend/src/components/prayer-wall/__tests__/ScriptureReferenceInput.test.tsx` — NEW test file. ~180 lines.

**Backend:**

- (none) — per MPD-4

### Files to Modify

**Frontend:**

- `frontend/src/constants/post-types.ts` — flip `discussion.enabled` from false to true
- `frontend/src/constants/__tests__/post-types.test.ts` — update enabled-disabled split
- `frontend/src/constants/content-limits.ts` — update `POST_TYPE_LIMITS.discussion` from prayer_request defaults to question's 2000 ceiling
- `frontend/src/constants/__tests__/content-limits.test.ts` — add discussion limit assertion
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add `MessagesSquare` to lucide imports, swap `discussion: HandHelping` → `discussion: MessagesSquare`, add `case 'discussion':` in chrome switch (violet wash), add `case 'discussion':` in articleAriaLabel switch, mount `<ScriptureChip>` between content and InteractionBar when `prayer.scriptureReference` is set
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — replace placeholder discussion entry in composerCopyByType with full discussion entry (header, placeholder, submit, footer, scripture field flag, no category, no challenge, no nudge, minHeight 160px), add ComposerCopy interface field `showScriptureReferenceField?: boolean`, conditionally render `<ScriptureReferenceInput>` when flag is true, integrate the resolved-pair state into the submit payload
- `frontend/src/pages/PrayerWall.tsx` — fill in `successToastByType.discussion` and `authModalCtaByType.discussion` with discussion-specific copy
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add 5 discussion chrome / icon / aria-label / scripture chip mounting tests
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — add 8 discussion variant tests
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add 2 discussion submission tests
- `frontend/src/mocks/prayer-wall-mock-data.ts` (path verify in plan) — add manual discussion fixtures (with and without scripture); confirm at least one QOTD-response discussion fixture exists from Phase 3
- `_plans/post-1.10-followups.md` — file the per-type expiry rules entry (if not already filed by 4.4)

**Backend:**

- (none — explicit zero per MPD-4)

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.5 from ⬜ to ✅ AFTER successful merge (executor's last step)

### Files NOT to Modify

**Backend (per MPD-4):**

- `backend/src/main/java/com/worshiproom/post/Post.java`
- `backend/src/main/java/com/worshiproom/post/PostService.java` (no validation changes)
- `backend/src/main/java/com/worshiproom/post/InvalidScripturePairException.java`
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java`
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java`
- `backend/src/main/java/com/worshiproom/post/PostMapper.java`
- `backend/src/main/resources/openapi.yaml` (no API surface changes)
- Liquibase changelog directory — DO NOT add a scripture changeset

**Frontend:**

- `frontend/src/components/prayer-wall/QotdComposer.tsx` (per W14 — QOTD-specific composer)
- `frontend/src/components/prayer-wall/QotdBadge.tsx` (no changes; existing badge renders correctly for discussion+qotdId)
- `frontend/src/components/prayer-wall/CommentItem.tsx` (per MPD-3 — threading deferred)
- `frontend/src/components/prayer-wall/CommentsSection.tsx` (per MPD-3)
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx`
- `frontend/src/components/prayer-wall/ResolvedBadge.tsx` (4.4 component — unchanged)
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` (per W20 — discussion as internal category, not user-visible tag)
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (per W20)
- `frontend/src/lib/search/reference-parser.ts` (utility used as-is)
- `frontend/src/lib/search/engine.ts` (utility used as-is)
- `frontend/src/types/prayer-wall.ts` (per MPD-5 — type fields already present)
- `frontend/src/lib/prayer-wall/postMappers.ts` (mappers already pass through scriptureReference + scriptureText per Phase 3)
- `frontend/src/services/prayer-wall-api.ts` (createPost already accepts scripture pair)

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Functional behavior — composer:**

- [ ] Posting a discussion creates a post with `post_type='discussion'` (verified via DB integration test fixture)
- [ ] Discussion composer header reads 'Start a discussion'
- [ ] Discussion composer placeholder reads 'What scripture or topic do you want to think through with others?'
- [ ] Discussion composer aria-label on textarea reads 'Discussion'
- [ ] Discussion composer textarea max attribute is 2000
- [ ] Discussion composer submit button reads 'Start Discussion'
- [ ] Discussion composer hides category fieldset
- [ ] Discussion composer hides challenge-prayer checkbox
- [ ] Discussion composer keeps the anonymous toggle (no nudge)
- [ ] Discussion composer auto-fills `category: 'discussion'` at submit time
- [ ] Discussion composer renders the ScriptureReferenceInput below the textarea

**Functional behavior — scripture reference field:**

- [ ] Empty input is valid; submit is enabled
- [ ] Valid reference with verse (e.g., 'John 3:16') triggers debounced lookup, shows verse preview, enables submit with scripture pair
- [ ] Valid chapter-only reference (e.g., 'Romans 8') shows helpful note, no preview, enables submit WITHOUT scripture pair
- [ ] Invalid reference (e.g., 'Foo 99:99') shows error indicator, BLOCKS submit
- [ ] Race condition: rapid typing only commits the last lookup result
- [ ] Lookup is debounced 300ms
- [ ] Stale-response guard via seq counter prevents flicker

**Functional behavior — card chrome:**

- [ ] Discussion cards render with violet accent (`bg-violet-500/[0.04]` + `border-violet-200/10`)
- [ ] Discussion cards show MessagesSquare icon next to timestamp
- [ ] Article aria-label reads 'Discussion by {authorName}'
- [ ] No regression on prayer_request, testimony, question, or encouragement chrome
- [ ] QOTD response (postType=discussion + qotdId) renders QotdBadge above header (no regression)

**Functional behavior — scripture chip:**

- [ ] ScriptureChip component exists at `frontend/src/components/prayer-wall/ScriptureChip.tsx`
- [ ] Chip renders below content, above InteractionBar, when `prayer.scriptureReference` is set
- [ ] Chip is a `<Link>` to `/bible/{book}/{chapter}?verse={n}` for ref with verse
- [ ] Chip is a `<Link>` to `/bible/{book}/{chapter}` for chapter-only ref
- [ ] Chip renders unlinked span (defensive) for unparseable reference
- [ ] Chip aria-label reads 'Read {reference} in the Bible'
- [ ] Chip is keyboard-accessible (focusable, Enter activates)
- [ ] Chip does NOT render when scriptureReference is null/undefined
- [ ] Chip is decoupled from postType (renders for any post with scriptureReference set, including QOTD responses with scripture)

**Functional behavior — toast / auth modal:**

- [ ] Successful discussion post shows toast 'Your discussion is on the wall. Others can think it through with you.'
- [ ] Unauthenticated discussion composer open uses auth modal CTA 'Sign in to start a discussion'

**Backend (verified by NO modifications):**

- [ ] No Liquibase changeset added for scripture columns (per MPD-4)
- [ ] No Post entity changes (per MPD-4)
- [ ] No PostService validation changes (per MPD-4)
- [ ] InvalidScripturePairException unchanged
- [ ] Existing scripture pair contract still enforced (sending only one of the pair returns 400)

**Constants:**

- [ ] `getPostType('discussion').enabled === true`
- [ ] `getPostType('encouragement').enabled === false` (no regression)
- [ ] `POST_TYPE_LIMITS.discussion.max === 2000`
- [ ] `POST_TYPE_LIMITS.discussion.warningAt === 1600`
- [ ] `POST_TYPE_LIMITS.discussion.dangerAt === 1900`
- [ ] `POST_TYPE_LIMITS.discussion.visibleAt === 1000`

**Tests:**

- [ ] ~32 new/updated tests pass
- [ ] Existing tests continue to pass (no regressions on QOTD, prayer_request, testimony, question)
- [ ] PostType drift contract test passes
- [ ] Race-condition test for ScriptureReferenceInput passes (no flicker on rapid typing)

**Brand voice:**

- [ ] All new copy strings pass the pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon, no streak/shame, no false scarcity

**Visual verification (gated on /verify-with-playwright):**

- [ ] Discussion composer renders correctly with all per-type copy and behavioral branches
- [ ] Discussion card chrome renders with violet wash on `/prayer-wall` feed
- [ ] MessagesSquare icon renders on discussion cards
- [ ] ScriptureChip renders below content for discussions with scripture
- [ ] Mixed feed (prayer_request, testimony, question, discussion, QOTD response) renders all chrome variants correctly
- [ ] QOTD responses still render QotdBadge (no regression)
- [ ] Scripture chip click navigates to Bible reader and scrolls to the verse
- [ ] Race condition test passes in Playwright (rapid typing in scripture field)
- [ ] No regression on existing post types

**Operational:**

- [ ] `_plans/post-1.10-followups.md` updated with per-type expiry rules entry (if 4.4 didn't already)
- [ ] `_forums_master_plan/spec-tracker.md` 4.5 row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.5:

- **3-day discussion expiry** (expires_at column, expiry job, last_activity_at-based countdown) → Phase 6 expiry spec per MPD-2
- **Threaded comment rendering UI** for discussions → covered by 4.4's filed follow-up per MPD-3
- **Per-type expiry rules implementation** (the actual code) → Phase 6
- **Testimony scripture-pair selector** (mounting ScriptureReferenceInput on testimony composer) → Phase 5 follow-up §28
- **Scripture chip on testimony cards** (rendering ScriptureChip when testimony has scripture set) → Phase 5 follow-up §28 alongside the composer change
- **Tooltip showing verse text on chip hover** → out of scope (D7 rejected alternative)
- **Auto-link of scripture references in content body** → out (W24)
- **Bible reader inline embed** (rendering verse text directly on the prayer card) → out (privacy + complexity; chip-as-link is sufficient)
- **'Discussion' as a user-visible category tag** in CategoryBadge / CategoryFilterBar → out (W20)
- **New ActivityType.DISCUSSION_STARTED** and faith-point bonus → Phase 5 follow-up §27 (generic per-type tuning)
- **Auto-detection of scripture references in pasted content** → out (W18)
- **Multi-verse range selection** (`John 3:16-17`) — supported by parseReference's verseEnd field but NOT plumbed through to the composer or chip rendering in 4.5 → future enhancement
- **Translations other than WEB** → out (Worship Room is WEB-only per Eric's product decisions)
- **Encouragement post type** (chrome, composer, 280-char limit, 24h expiry, no comments) → Spec 4.6
- **Image upload for discussions** → NOT scoped (4.6b only adds images for testimonies + questions)
- **Composer Chooser UI** → Spec 4.7
- **Phase 4 Cutover / Room Selector** → Spec 4.8

---

## 13. Brand voice quick reference (pastor's wife test)

Discussion is the most 'community gathering' of the post types — invitational, exploratory, conversational. The brand voice should feel like an open seat at the table, not a debate forum.

**Anti-patterns to flag during /code-review:**

- Stack Overflow imports — 'Mark as accepted answer', 'Best response', 'Bountied'. Out (mirrors 4.4 question discipline).
- Forum-thread-isms — 'Bump', 'Necro', 'Lock thread', 'Sticky'. Wrong vibe entirely.
- Debate framing — 'Disagree', 'Counter-argue', 'Refute'. The discussion type is for thinking together, not winning.
- Engagement gamification — 'Most active discussion', 'Hot thread', 'Trending'. Out.
- Therapy-app jargon — 'Process this together', 'Hold space for the group'. Out.
- Streak / shame — 'Your streak depends on starting a discussion'. Out.
- Religious gatekeeping — 'Verified theologians can answer'. Out.

**Good copy in 4.5:**

- 'Start a discussion' — invitational, action-oriented
- 'What scripture or topic do you want to think through with others?' — direct from master plan; thoughtful and inviting
- 'Other believers can share their experience or scripture they have leaned on.' — wait, that's 4.4 question copy. 4.5's discussion subline (if added) would be different. Per D18, discussion does NOT use a subline — the placeholder carries the prompt.
- 'Your discussion is on the wall. Others can think it through with you.' — 'think it through' is the load-bearing phrase. Discussions are for working through together, not for getting answers.
- 'Sign in to start a discussion' — standard
- 'Read {reference} in the Bible' — chip aria-label, action-oriented

The composer copy 'think through with others' carries the 4.5 brand DNA. If CC drifts to 'discuss with the community' or 'share your thoughts on', push back — those are weaker. 'Think through' implies humility (not arrived-at conclusions, working it out).

The chip aria-label 'Read {reference} in the Bible' is intentionally not 'Open in Bible reader' (too app-jargon) or 'View scripture' (too distant). Reading scripture is the action; the Bible is the place.

---

## 14. Tier rationale

Run at **xHigh**. Justifications:

**Why not Standard:**
- The async race-condition state machine in ScriptureReferenceInput (D11) is the failure mode Standard tier reliably misses. Visible flicker on rapid typing, stale state overwrites, missing debounce — all common.
- The backend pair contract (R3) is a foot-gun. Standard tier sometimes sends `{ scriptureReference: 'John 3:16', scriptureText: null }` and gets a confusing 400, then chases the wrong fix.
- The QOTD non-regression (W5) is easy to miss without the brief explicitly calling it out. Standard tier sometimes refactors the QotdBadge mounting condition, breaking it.
- The chapter-only valid-but-no-pair edge case (D9, W17) is a UX subtlety. Standard tier conflates 'valid for navigation' with 'commit pair' and either over-blocks submit or under-handles the chapter-only state.

**Why not MAX:**
- Zero backend changes (per MPD-4). The biggest source of risk in 4.4 (atomic transaction, author auth, schema migration) is absent from 4.5.
- The frontend patterns are all extensions of 4.3/4.4 infrastructure. Per-type chrome, per-type composer copy, per-type toast — fill-in-the-blank work.
- The two new components (ScriptureChip, ScriptureReferenceInput) are well-bounded. Each has a clean interface and a small surface.
- The async lookup uses existing primitives (parseReference, loadChapterWeb). No new infrastructure.

**Cost-benefit:**
- xHigh on a comprehensive brief: ~50-60 minutes pipeline runtime (smaller spec than 4.3/4.4)
- MAX on a comprehensive brief: ~100 minutes (~75% more cost, same quality)
- The brief covers the trap doors. xHigh executes; MAX won't catch what the brief missed.

**Override moments — when to bump to MAX:**
- During /code-review, if the race-condition test for ScriptureReferenceInput is missing or implemented without a seq guard
- If CC adds a Liquibase changeset for any scripture column (MPD-4 violation)
- If the QotdBadge mounting condition is modified (W5)
- If the submit handler sends only one of (scriptureReference, scriptureText)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-5`:

```
/spec-forums spec-4-5

Write a spec for Phase 4.5: Devotional Discussion Post Type. Read /Users/eric.champlin/worship-room/_plans/forums/spec-4-5-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins (the brief documents divergences explicitly in the MPD section).

Tier: xHigh.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites: 4.4 (Question Post Type) must be ✅ in spec-tracker.md before this spec executes. Verify by:

1. Reading /Users/eric.champlin/worship-room/_forums_master_plan/spec-tracker.md row for 4.4
2. Confirming `composerCopyByType.question.subline` exists in InlineComposer.tsx (4.4's new optional field)
3. Confirming `ResolvedBadge.tsx` exists at frontend/src/components/prayer-wall/
4. Confirming the resolve endpoint exists in PostController.java

If any check fails, STOP and report. Do not proceed without 4.4 shipped.

Recon checklist (re-verify on disk before starting; the brief's recon was on date 2026-05-08):

1. `frontend/src/constants/post-types.ts` — confirm discussion entry has `icon: 'MessagesSquare'` and `enabled: false`
2. `frontend/src/components/prayer-wall/InlineComposer.tsx` — confirm composerCopyByType.discussion is currently a placeholder copying prayer_request defaults
3. `frontend/src/components/prayer-wall/PrayerCard.tsx` — confirm POST_TYPE_ICONS.discussion is HandHelping placeholder; confirm chrome switch falls through to default for discussion; confirm articleAriaLabel switch falls through to default
4. `backend/src/main/java/com/worshiproom/post/Post.java` — confirm scripture_reference and scripture_text columns ALREADY EXIST. DO NOT add Liquibase changesets for these columns.
5. `backend/src/main/java/com/worshiproom/post/PostService.java` — confirm scripture pair validation already in place (lines ~191-195). DO NOT modify.
6. `backend/src/main/java/com/worshiproom/post/InvalidScripturePairException.java` — confirm exists
7. `frontend/src/types/prayer-wall.ts` — confirm PrayerRequest already has scriptureReference and scriptureText optional fields
8. `frontend/src/lib/search/reference-parser.ts` — confirm parseReference function exists with the documented signature
9. `frontend/src/lib/search/engine.ts` — confirm loadVerseTexts and loadChapterWeb (or equivalent) exist for verse text fetching
10. `_plans/post-1.10-followups.md` — read current section numbering. If 4.4 already filed a per-type expiry rules entry, skip; otherwise file one for 4.5.

Spec output structure:

- Title and metadata (size M, risk Medium, prerequisites 4.4, branch forums-wave-continued)
- Goal — Add Discussion post type with composer + violet chrome + optional scripture reference field + scripture chip on cards
- Approach — Per-type chrome (violet), per-type composer (no subline, scripture field flag), 2 new components (ScriptureChip, ScriptureReferenceInput), async lookup with race-condition guard, frontend-only changes (zero backend delta)
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~32 tests)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - Expiry deferred (MPD-2); no expires_at column
  - Threading deferred (MPD-3); CommentsSection still flat
  - Activity engine deferred (MPD-1); no DISCUSSION_STARTED ActivityType
  - Backend already shipped scripture pair infrastructure (MPD-4); zero backend changes
  - QotdBadge already mounts on qotdId, NOT postType (R7); existing logic handles QOTD-discussion correctly
  - ScriptureReferenceInput needs seq counter for race condition (D11, W7)
  - Composer auto-fills `category: 'discussion'` at submit (D15)
  - Submit BLOCKED when scripture is invalid (D12); enabled when empty or valid

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually.
- ScriptureChip and ScriptureReferenceInput are NEW components — separate files.
- ScriptureChip is decoupled from postType — renders whenever scriptureReference is set on any post.
- The lookup uses existing parseReference + loadChapterWeb primitives. Don't introduce new utilities.
- Backend changes: ZERO. If the plan or execution touches any backend file, that's a violation of MPD-4.

After writing the spec, run /plan-forums spec-4-5 with the same tier (xHigh).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-5
```

The verifier exercises Section 3's visual surface:

1. Discussion composer rendering (header, placeholder, scripture field, hidden category, hidden challenge, no nudge)
2. Scripture reference field state machine (empty / valid / invalid / chapter-only / racing keystrokes)
3. Discussion card chrome (violet wash, MessagesSquare icon, aria-label)
4. ScriptureChip rendering and navigation
5. QOTD response non-regression (QotdBadge still mounts on qotdId-tagged discussions)
6. Mixed feed correctness across all 4 enabled post types
7. Submit blocking behavior when scripture is invalid

Minimum 10 Playwright scenarios. Verifier writes to `_plans/forums/spec-4-5-verify-report.md`.

If verification flags the race-condition test failing, abort and bump to MAX — that's the canonical override moment for this spec.

---

## Prerequisites confirmed (as of 2026-05-08 brief authorship)

- ✅ 4.1 Post Type Foundation shipped
- ✅ 4.2 Prayer Request Polish shipped
- ✅ 4.3 Testimony Post Type shipped
- ✅ 4.4 Question Post Type shipped (per tracker reading mid-session)
- Backend Phase 3 shipped scripture_reference + scripture_text columns and pair validation (per R3, R9)
- `parseReference` utility lives at `@/lib/search/reference-parser` (per R10)
- Verse text lookup primitives live at `@/lib/search/engine` (per R11)
- Bible reader URL pattern is `/bible/{slug}/{chapter}?verse={n}` (per R12)
- `MessagesSquare` and `BookOpen` Lucide icons expected available (per R13) — verify during plan
- Violet palette expected available in Tailwind (per R14, W19) — verify, fallback to hex

**Brief authored:** 2026-05-08, in conversation with Claude (Opus 4.7), as the third brief of Phase 4 written in the disk-based workflow. Companion to Spec 4.3 and 4.4 briefs. Smaller scope than 4.4 (M vs L) — zero backend delta, two new frontend components (ScriptureChip, ScriptureReferenceInput), per-type slot fill-in.

**End of brief.**
