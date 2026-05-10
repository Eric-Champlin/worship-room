/spec-forums spec-4-7b

# Spec 4.7b — Ways to Help MVP

**Master plan ID:** `round3-phase04-spec07b-ways-to-help`
**Size:** M
**Risk:** Low (additive content attribute on prayer requests; uses established per-type composer infrastructure pattern from 4.3-4.6 and the existing edit-window mechanism)
**Prerequisites:** 4.2 (Prayer Request Polish), 4.7 (Composer Chooser), 4.6b (Image Upload — implicit; per-type composer infrastructure must be fully realized). The master plan body lists prereqs as 4.1, 4.7 — the 4.1 reference is stale per-renumbering; current numbering is 4.2 for Prayer Request Polish.
**Tier:** High

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

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

---

## 2. Tier — High

This is genuinely a Risk: Low spec. The surface is bounded:

- One new column on `posts` table (Liquibase changeset, NOT NULL DEFAULT '')
- Two small new frontend components (chip picker, pills row)
- One new constants file (enum + display labels)
- Per-type composer integration via the established `composerCopyByType` pattern (one new optional field, gated to prayer_request only)
- One new switch in PrayerCard for pills row
- Backend create-post and update-post both accept help_tags; both validate against enum
- Edit-tags within the existing edit-window mechanism (already shipped — see R4)

**Why High (not Standard):**

- The 'pills only for non-`just_prayer` tags' rule is subtle (D8 / W5). Standard tier sometimes renders `just_prayer` as a 'Just prayer, please' pill, defeating the design intent.
- The comma-separated-list parsing has edge cases (empty string, trailing commas, dedup, ordering). Standard tier sometimes ships incomplete validation.
- Cross-type rejection (non-prayer_request post sending help_tags) requires a new exception class. Standard tier sometimes silently coerces empty.
- The edit-window addition (extending UpdatePostRequest with helpTags) requires careful Javadoc updates and test coverage. Standard tier sometimes ships the create path but forgets the edit path.
- Brand-voice on chip and helper-text copy is sensitive. Standard tier sometimes ships 'Help your community!' or similar pressure-coded copy.
- The default empty string semantics (D14) need precise handling — 'no tags' is not the same as 'just_prayer' (D6 explains).

**Why not xHigh:**

- All architectural patterns are established (per-type composer field, exception→HTTP-code mapping, Liquibase + JPA)
- No new external dependencies, no schema migrations beyond one column, no novel coordination
- The two new components are render-only with bounded behavior
- The brief covers all watch-fors and decisions explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC writes the helpTags column as nullable instead of NOT NULL DEFAULT '' (D14 violation)
- If CC renders `just_prayer` as a visible pill on cards (W5 violation)
- If CC adds a 'Volunteer to help' button instead of relying on comments (W7, master plan anti-feature)
- If CC's parsing accepts arbitrary string values without enum validation (W8, security)
- If CC adds notifications when comments offer help (W3)
- If brand voice on chips drifts to 'Help others!' / 'Be a blessing!' / cheerleader voice

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **Prayer Request composer with WaysToHelpPicker** at `/prayer-wall` (open via chooser → select Prayer Request):
   - Section label reads 'What would help?'
   - Helper text reads 'Optional — leave blank if prayer is what you need right now.'
   - 5 chips visible: Meals, Rides, Errands, Visits, Just prayer, please
   - Chips render in canonical order (Meals first, Just prayer, please last)
   - Picker placement is BELOW category fieldset, ABOVE submit button
   - All chips are unselected by default
   - Tapping a chip toggles its selection state visually
   - Multiple chips can be selected simultaneously
   - Selecting and then deselecting a chip returns it to baseline
   - Submitting with NO chips selected creates a post with empty help_tags
   - Submitting with chips selected creates a post with the selected tags

2. **Picker ABSENT for other post types** (testimony, question, discussion, encouragement composers):
   - WaysToHelpPicker section is entirely absent from DOM (not just hidden)
   - Composer layout doesn't have an empty space where the picker would be

3. **PrayerCard pills rendering** — various tag configurations on prayer_request posts:
   - Post with no tags (help_tags = ''): NO pills row rendered
   - Post with only `just_prayer`: NO pills row rendered (matches no-tags behavior)
   - Post with `meals`: renders a single 'Meals' pill
   - Post with `meals,rides`: renders 'Meals' and 'Rides' pills in canonical order
   - Post with `meals,just_prayer`: renders ONLY 'Meals' pill (just_prayer suppressed per D8 / W5)
   - Post with all 4 helpful tags + just_prayer: renders 4 pills (meals, rides, errands, visits) in canonical order
   - Post with tags submitted in non-canonical order (e.g., 'visits,meals'): pills still render in canonical order (meals, visits)

4. **Pills NOT rendered on other post types**:
   - Testimony, question, discussion, encouragement cards never show pills (defensive: backend rejects help_tags on non-prayer_request, but frontend should also gate the render)

5. **Pills accessibility**:
   - Each pill has aria-label 'Author would welcome: {tag}'
   - Pills have sufficient color contrast against card chrome
   - Pills are not focusable / not interactive (display-only)

6. **Picker accessibility**:
   - Each chip is a `<button>` with `aria-pressed` reflecting selection state
   - Tab key cycles focus through chips
   - Space toggles selection on focused chip
   - Screen reader announces 'Meals, button, not pressed' / 'Meals, button, pressed' style

7. **Edit existing post**: 
   - Author can edit a published post within the 5-minute edit window
   - Help tags can be added, removed, or changed via the edit flow
   - After window expires, edit attempt with help_tags returns 400 EDIT_WINDOW_EXPIRED

8. **Backend API behavior**:
   - POST /api/v1/posts with valid help_tags on prayer_request: 201 with stored tags
   - POST /api/v1/posts with invalid tag value (e.g., 'pizza'): 400 with INVALID_HELP_TAG
   - POST /api/v1/posts with help_tags on non-prayer_request: 400 with HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE
   - POST /api/v1/posts with no help_tags field: 201 with help_tags = '' (default)
   - PATCH /api/v1/posts/{id} with help_tags within edit window: 200 with updated tags
   - PATCH /api/v1/posts/{id} with help_tags after edit window: 400 EDIT_WINDOW_EXPIRED
   - PATCH /api/v1/posts/{id} with help_tags on non-prayer_request: 400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE

9. **Storage normalization**:
   - Tags stored without leading/trailing whitespace
   - Tags stored without duplicates (server-side dedup)
   - Tags stored in canonical order (server normalizes input order)
   - Empty string used when no tags (NOT NULL semantics; column never null)

10. **No regressions**:
    - Posts created without help_tags work unchanged
    - Existing prayer_request posts (created before 4.7b's migration) display correctly with no pills (default '' from migration)
    - Composer submission for non-prayer_request types unchanged
    - PrayerCard rendering for non-prayer_request types unchanged
    - Edit window for other fields (content, category, etc.) still works

11. **Mixed feed**:
    - prayer_request with pills, prayer_request without pills, testimony with image, question, discussion, encouragement — all interleave correctly
    - Pills row doesn't bump InteractionBar layout
    - Card heights vary naturally based on tag presence (no awkward gaps)

12. **Brand voice spot-check**:
    - Helper text gives permission ('leave blank if prayer is what you need') rather than pressure
    - Pill aria-labels read 'Author would welcome:' framing (invitation, not demand)
    - No exclamation, no urgency, no comparison in any 4.7b copy

Minimum 12 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

The master plan body for 4.7b lives at `_forums_master_plan/round3-master-plan.md` lines ~4431–4520+. Several drift items.

### MPD-1 — Stale prereq numbering

Master plan body lists prereqs as 4.1 (Prayer Request polish), 4.7 (Composer Chooser). After Phase 4 renumbering, Prayer Request Polish is 4.2 (4.1 is Post Type Foundation). Plus 4.6b should be implicit (per-type composer infrastructure must be complete).

**Action for the planner:** Treat actual prereqs as **4.2 + 4.6b + 4.7**. Verify all three are ✅ in spec-tracker.md before proceeding.

### MPD-2 — 'PrayerRequestComposer.tsx or equivalent' is stale

Master plan body's Files-to-Modify list says:

> - `PrayerRequestComposer.tsx` or equivalent (integrates WaysToHelpPicker)

There's no per-type composer file. The codebase has `InlineComposer` with the `composerCopyByType` map (added in 4.3, extended in 4.4-4.6 with various optional fields). 4.6b may have added more fields.

**4.7b extends the same map** with two new optional fields:

```typescript
interface ComposerCopy {
  // ... existing fields from 4.3-4.6b ...
  showWaysToHelpPicker?: boolean        // NEW in 4.7b — only true for prayer_request
  waysToHelpHelperText?: string         // NEW in 4.7b — the 'Optional — leave blank...' copy
}
```

Matches the established pattern: each new optional UI affordance / behavioral override becomes another optional field on `ComposerCopy`.

### MPD-3 — Edit-window mechanism EXISTS (per recon R4)

Master plan body's anti-pressure design § 5 says:

> - Tags can be edited or removed post-publication by the author (same 5-minute edit window as any post)

Recon ground truth: `EditWindowExpiredException.java` exists at `backend/src/main/java/com/worshiproom/post/`. The class-level Javadoc lists window-gated operations: 'content, category, qotdId, challengeId, scripture fields, visibility-upgrade.' `PostService.updatePost()` exists at line 347 and uses the window check (line ~382).

**4.7b extends the existing edit-window mechanism** to include `helpTags`:

- `UpdatePostRequest` record gains a `helpTags` field (or `helpTagsRaw` if internal naming differs)
- `PostService.updatePost()` handles the field within the existing `withinWindow` guard
- The Javadoc comment on `EditWindowExpiredException` is updated to add 'help_tags' to the list

No new exception class for the window itself (existing one suffices). Cross-type and invalid-tag rejections still need their own exceptions (D12, D13).

### MPD-4 — Storage format: VARCHAR(200) comma-separated, NOT PostgreSQL array

Master plan body says:

> Liquibase changeset adds `help_tags VARCHAR(200) NOT NULL DEFAULT ''` to `posts`

And:

> Confirm `help_tags` as VARCHAR vs PostgreSQL array type (recommendation: VARCHAR + Java Set parsing)

**Decision: VARCHAR(200) with comma-separated string.** Reasoning:

- Simpler than PostgreSQL `TEXT[]` for queries (no array operators needed)
- Matches the recommendation
- 200 chars is generous: 5 tag values comma-joined is at most ~38 characters; 200 leaves headroom for future tag additions
- Default empty string '' represents 'no tags' (NOT NULL semantic; never null)
- Java parses to `Set<HelpTag>` at the boundary; serializes back to comma-joined string for storage

**What this means in practice:**

- DB column: `help_tags VARCHAR(200) NOT NULL DEFAULT ''`
- JPA entity field: `String helpTagsRaw` (the comma-separated string)
- Domain model: a derived `Set<HelpTag>` parsed in the entity getter or in mapping
- DTO: `Set<String>` or `List<String>` (frontend-friendly)
- Frontend: `string[]` of typed `HelpTag` values

Note: an empty Set serializes to ''. A Set of {meals, rides} serializes to 'meals,rides' (canonical order, regardless of input order — D11).

### MPD-5 — 'PrayerCard.tsx (renders WaysToHelpPills when tags present)' needs precision

Master plan body's Files-to-Modify says:

> - `PrayerCard.tsx` (renders WaysToHelpPills when tags present)

The simple rule 'when tags present' is wrong per the master plan body itself § 'Tag semantics on the card':

> - No tags OR only `just_prayer`: no pills rendered (baseline; doesn't clutter the card)
> - One or more of `meals` / `rides` / `errands` / `visits`: renders those as pills (does NOT render `just_prayer`)

**Correct rendering rule (per D8):**

```typescript
const displayableTags = tags.filter(t => t !== 'just_prayer')
if (displayableTags.length === 0) return null  // No row at all
return <WaysToHelpPills tags={displayableTags} />
```

The `just_prayer` tag is a SIGNAL FROM THE AUTHOR (intent declaration), but it's NEVER displayed as a visible pill. This is the most subtle part of the spec.

### MPD-6 — 'Out-of-band notes for Eric' from 4.6b storage adapter doesn't apply

The master plan body for 4.6b ends with:

> **Out-of-band notes for Eric:** The S3 adapter abstraction is load-bearing.

That note is for 4.6b's storage adapter, not 4.7b. 4.7b's only out-of-band concern is the edit-window Javadoc update (MPD-3). No new infrastructure dependencies, no new env vars, no operational handoff.

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-09)

Verified on disk at `/Users/Eric/worship-room/`.

### R1 — No `help_tags` column exists on posts

Grep of `help_tags|helpTags|HelpTag` in `backend/src/main/java/com/worshiproom/post/` returns zero matches. Plan recon re-verifies before adding the changeset.

### R2 — Liquibase changelog naming convention

From 4.6b's brief and prior recon: changesets are named `YYYY-MM-DD-NNN-description.xml`. The next available number is whatever follows 4.6b's image-columns changeset.

4.7b's changeset suggested name: `2026-05-XX-NNN-add-posts-help-tags.xml` (planner picks the date). The master plan body's name `2026-04-20-002-add-posts-help-tags.xml` is stale (date is from when the master plan was authored).

**Action for the planner:** Use today's date (or the date of execution) for the changeset filename. The naming is operational, not architectural.

### R3 — `composerCopyByType` map post-4.6b state

The map should have entries for all 5 post types with the following fields available (post-4.6b):

- `header`, `placeholder`, `ariaLabel`, `submitButton`, `footerNote`
- `subline?` (4.4 — question only)
- `showCategoryFieldset`, `showChallengeCheckbox`, `showAttributionNudge`
- `showScriptureReferenceField?` (4.5 — discussion only)
- `showAnonymousToggle?`, `expiryWarning?`, `submitsAsCategory?`, `minHeight?` (4.6)
- `showImageUpload?`, `imageUploadHelperText?` (4.6b)

4.7b adds:

- `showWaysToHelpPicker?: boolean` — only `true` for prayer_request
- `waysToHelpHelperText?: string` — inline helper for the picker section

Following the established pattern.

### R4 — Edit-window mechanism EXISTS

Verified during recon for this brief:

- `backend/src/main/java/com/worshiproom/post/EditWindowExpiredException.java` — class with Javadoc listing window-gated operations: 'content, category, qotdId, challengeId, scripture fields, visibility-upgrade'
- `backend/src/main/java/com/worshiproom/post/PostService.java` line 347 — `@Transactional public PostDto updatePost(UUID postId, AuthenticatedUser principal, UpdatePostRequest request, String requestId)`
- Line ~382 — `OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC); boolean withinWindow = !now.isAfter(post.getCreatedAt().plus(EditWindow.DURATION));` (approximate — plan re-verifies)
- The window duration is presumably 5 minutes per master plan body; verify in plan via `EditWindow.DURATION` constant or similar

4.7b's required changes here:

- Add `helpTags` (or similar) to `UpdatePostRequest` (likely a `Set<String>` or null-when-not-set)
- Inside `updatePost()`, if `request.helpTags != null`, validate within the existing `withinWindow` block; if `!withinWindow`, throw `EditWindowExpiredException`
- Update the Javadoc on `EditWindowExpiredException` to include 'help_tags'

### R5 — No existing `WaysToHelpPicker` or `WaysToHelpPills` components

Grep returns zero matches. 4.7b creates both.

### R6 — PrayerCard.tsx pills row placement

From prior recon (4.6 / 4.6b briefs): PrayerCard renders, in order:

- Type-specific chrome (rose / cyan / amber / violet / white wash)
- Type-specific icon (`POST_TYPE_ICONS` map)
- QotdBadge (when `qotdId` set)
- AuthorName + timestamp
- Content body
- ScriptureChip (when `scriptureReference` set)
- PostImage (when `image` set, on testimony/question only — 4.6b)
- InteractionBar (with type-specific reaction labels and conditional comment button)
- Conditional CommentsSection

4.7b adds the WaysToHelpPills row between content body and InteractionBar, after PostImage if both are present:

- Position: BELOW content/scripture chip/image, ABOVE InteractionBar
- Spacing: small mb-3 between content area and pills row, small mb-3 between pills and InteractionBar
- Render rule (D8 / MPD-5): only when `displayableTags.length > 0`

### R7 — Post entity / DTO / mapper integration

`backend/src/main/java/com/worshiproom/post/Post.java` is the JPA entity. 4.7b adds:

```java
@Column(name = "help_tags", nullable = false, length = 200)
private String helpTagsRaw = "";  // empty string means 'no tags'
```

The entity stores the raw comma-separated string. Conversion to `Set<HelpTag>` happens at:

- DTO mapping (PostMapper) — raw string → Set<String> in the DTO
- Service layer parsing (PostService.createPost / updatePost) — input Set<String> → validated Set<HelpTag> → normalized comma-joined string

`PostDto.java` (record) gains:

```java
public record PostDto(
    UUID id,
    // ... existing fields ...
    Set<String> helpTags  // empty Set when no tags; never null
) {}
```

`CreatePostRequest.java` gains an optional `helpTags` field (Set<String>, null-when-omitted).
`UpdatePostRequest.java` gains an optional `helpTags` field (Set<String>, null-when-omitted).

### R8 — No existing rate limit on tag changes

The edit-window itself is the rate limit (5 minutes from creation). No additional rate limiting needed for help_tags edits.

### R9 — OpenAPI schema

`backend/src/main/resources/openapi.yaml` (or wherever it lives — verify path during recon). 4.7b adds:

- `helpTags` field on `CreatePostRequest` schema (optional array of strings, enum-constrained)
- `helpTags` field on `UpdatePostRequest` schema (optional array of strings)
- `helpTags` field on `PostDto` response schema (always present, may be empty array)
- New error codes: `INVALID_HELP_TAG`, `HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE`

### R10 — Frontend type for help tags

`frontend/src/types/prayer-wall.ts` (or wherever PrayerRequest type lives — verify path) gains:

```typescript
export type HelpTag = 'meals' | 'rides' | 'errands' | 'visits' | 'just_prayer'

export interface PrayerRequest {
  // ... existing fields ...
  helpTags?: HelpTag[]  // empty array or undefined when no tags
}
```

### R11 — No existing chip/pill component shared abstraction

Grep for existing chip/pill components: there's likely no shared `<Chip>` component. CategoryFilterBar may have a similar pattern. Plan recon evaluates whether 4.7b should:

- Build `WaysToHelpPicker` and `WaysToHelpPills` from scratch (recommended; small components, bounded scope)
- Extract a shared `<Chip>` abstraction for both these and CategoryFilterBar (over-engineering for 4.7b)

**Decision: build standalone.** Don't refactor CategoryFilterBar in 4.7b.

### R12 — No existing 'volunteer' or 'help' feature

Verify by grepping `volunteer|offer to help|offering`. Should return zero matches in feature code. 4.7b is the first 'practical help' feature; future Phase 6+ specs may add fulfillment tracking, but 4.7b stays MVP.

### R13 — Mock data fixtures

`frontend/src/mocks/prayer-wall-mock-data.ts` (verify path). 4.7b adds:

- 1 prayer_request fixture with no tags
- 1 prayer_request fixture with `just_prayer` only (NO pills should render)
- 1 prayer_request fixture with `meals` only (1 pill renders)
- 1 prayer_request fixture with `meals,rides,errands,visits` (4 pills render)
- 1 prayer_request fixture with `meals,just_prayer` (1 pill renders, just_prayer suppressed)
- 1 prayer_request fixture with tags submitted in non-canonical order (verify normalization in feed)

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

| # | Gate | Applies to 4.7b? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check (createPost) | Applies (unchanged) | Encouragement createPost contract preserved |
| 2 | Rate-limit consumption order | Applies (unchanged) | No new rate limiter for help_tags |
| 3 | Cross-field validation | **Applies — extended** | New rule: if `postType != PRAYER_REQUEST && helpTags is non-empty`, throw HelpTagsNotAllowedForPostTypeException. Placement: with other cross-field checks (alongside scripture pair check, anonymous check, image-allowed check) |
| 4 | HTML sanitization BEFORE length check | N/A | help_tags doesn't accept free-text; only enum values |
| 5 | Length check after sanitization | N/A | Per-tag length is bounded by enum values |
| 6 | Crisis detection on sanitized content | N/A | Tag values are not user-authored content |
| 7 | AFTER_COMMIT crisis event publishing | Applies (unchanged) | No 4.7b-specific changes |
| 8 | Activity recording | Applies (unchanged) | Post creation emits PRAYER_WALL activity; help_tags don't add their own activity |
| 9 | EntityManager refresh for DB defaults | Applies | The `help_tags VARCHAR(200) NOT NULL DEFAULT ''` default needs refresh to read back the empty string when not provided |
| 10 | Logging IDs only (no content) | Applies | Tag values are technically enum-bounded so safe-ish; still log IDs not content for posts |
| 11 | `ContentTooLongException` error code/message contract | N/A for help_tags | Tag values are constrained, not free-text |
| 12 | JSR-303 enforcement BEFORE service-layer rules | Applies | `@Size(max=5)` on the helpTags Set if applicable; service-layer enum validation layered on top |
| 13 | PostType wire-format ↔ Java enum drift sync | Applies (unchanged) | No PostType changes |

**New addendum gates introduced by 4.7b:**

**Gate 14: HelpTag enum validation.** Each value in the helpTags input is validated against the `HelpTag` Java enum. Unknown values throw `InvalidHelpTagException` (HTTP 400, code `INVALID_HELP_TAG`). The full set of valid values: `meals`, `rides`, `errands`, `visits`, `just_prayer`.

**Gate 15: Cross-type rejection.** If `postType != PRAYER_REQUEST` and `helpTags` is non-null/non-empty, throw `HelpTagsNotAllowedForPostTypeException` (HTTP 400, code `HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE`). The error message includes the post type for client-side messaging.

**Gate 16: Storage normalization.** When persisting helpTags, the service:
1. Trims whitespace from each input value
2. Filters out empty strings
3. Validates each against the HelpTag enum (throws on invalid)
4. Deduplicates (Set semantics)
5. Sorts in canonical order: meals, rides, errands, visits, just_prayer
6. Joins with comma into the storage VARCHAR

Reading back: split on comma, trim each, filter empties, parse to HelpTag, return as Set.

---

## 7. Decisions and divergences

### D1 — Five tag values, fixed enum: `meals`, `rides`, `errands`, `visits`, `just_prayer`

Per master plan body. The Java enum:

```java
public enum HelpTag {
    MEALS("meals"),
    RIDES("rides"),
    ERRANDS("errands"),
    VISITS("visits"),
    JUST_PRAYER("just_prayer");
    
    private final String wireValue;
    // ... constructor, getter, fromWireValue() ...
}
```

The wire values are lowercase snake_case to match JSON convention. The Java enum constants are SCREAMING_SNAKE per Java convention.

**No 'other' or 'custom' option.** Master plan body explicitly limits to these 5; future tags are a future spec.

### D2 — Storage: VARCHAR(200) NOT NULL DEFAULT ''

Per MPD-4. Liquibase changeset:

```xml
<changeSet id="add-posts-help-tags" author="4.7b">
    <addColumn tableName="posts">
        <column name="help_tags" type="VARCHAR(200)" defaultValue="">
            <constraints nullable="false"/>
        </column>
    </addColumn>
</changeSet>
```

Default is empty string `''`. Existing rows get '' on migration. Application code treats '' as 'no tags'.

**No CHECK constraint at the DB level** — enum validation lives in Java service layer. Reasoning: easier to evolve (add a tag = Java change only, no schema migration).

### D3 — Canonical sort order at the boundary

When serializing to storage, tags are always sorted in canonical order:

1. meals
2. rides
3. errands
4. visits
5. just_prayer

This means input `'visits,meals'` is stored as `'meals,visits'`. Frontend ALWAYS receives tags in canonical order from the API. Frontend rendering doesn't need to sort (just trust the API).

Reasoning: a single source of truth for ordering simplifies UI logic (pills always render in the same order), and it normalizes storage for predictable diff/audit.

### D4 — No empty tag values, no duplicates

Server-side validation rejects:
- Tag values containing only whitespace (after trim, empty) — silently filtered
- Duplicate tags — Set semantics (silently deduped)
- Unknown enum values — throw InvalidHelpTagException

**Why dedupe silently vs throw on dupes:** if the frontend submits 'meals,meals' due to a UI bug, the user shouldn't see a 400. Idempotent dedup is friendlier.

**Why throw on unknown enum:** unknown values likely indicate a malicious request or a frontend/backend version skew; surface the issue rather than coerce.

### D5 — Cross-type rejection: 400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE

If a client sends help_tags on a non-prayer_request post type, the backend rejects with HTTP 400. New exception class:

```java
package com.worshiproom.post;

public class HelpTagsNotAllowedForPostTypeException extends RuntimeException {
    private final String postType;
    
    public HelpTagsNotAllowedForPostTypeException(String postType) {
        super(String.format("Help tags are not allowed for %s posts.", postType));
        this.postType = postType;
    }
    
    public String getPostType() { return postType; }
}
```

Mapped in PostExceptionHandler to 400 with code `HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE`.

**Why throw, not silently drop:** matches 4.6's pattern for `AnonymousNotAllowedException` (4.6 D16) and 4.6b's `ImageNotAllowedForPostTypeException`. A buggy client deserves a loud 400, not silent acceptance that hides the contract violation.

### D6 — `just_prayer` as an explicit selectable tag (NOT absence-of-tags)

The master plan body explicitly justifies this design choice:

> Users who want to communicate "ONLY prayer, please don't bring meals" should be able to express that as a positive selection, not just absence of tags.

This is a SIGNAL FROM THE AUTHOR. By selecting `just_prayer`, the author is communicating intent ("please respect my preference for prayer-only support") even though the visible card looks identical to a tagless post.

**The implication for storage and rendering:**
- Storage: `just_prayer` is a real, persisted enum value
- Composer: `just_prayer` is a selectable chip
- Card rendering: `just_prayer` is filtered out before pill rendering (D8 / MPD-5 / W5)

**Why this is right:** the alternative ('absence of tags' = 'just prayer') would conflate two distinct cases:
- Author hasn't thought about practical help (tagless) — ambiguous
- Author has thought about it and wants prayer specifically (just_prayer selected) — explicit

The explicit case enables future features (e.g., a 'prefers prayer over practical help' filter, or analytics on declared preferences) without retro-data-mining.

### D7 — Composer integration via `composerCopyByType` map

```typescript
// In InlineComposer.tsx composerCopyByType:
prayer_request: {
  // ... existing prayer_request entries ...
  showWaysToHelpPicker: true,
  waysToHelpHelperText: 'Optional — leave blank if prayer is what you need right now.',
},
// testimony, question, discussion, encouragement: showWaysToHelpPicker omitted (defaults to false)
```

The `<WaysToHelpPicker>` component is conditionally rendered when `copy.showWaysToHelpPicker === true`. Following the established pattern from 4.3-4.6b.

### D8 — Pills render rule: filter out `just_prayer`, render only displayable tags, no row if empty

```typescript
// In PrayerCard.tsx (or WaysToHelpPills component):
const displayableTags = (prayer.helpTags ?? []).filter(t => t !== 'just_prayer')
if (displayableTags.length === 0) {
  return null  // No pills row at all
}
return (
  <div className="mb-3 flex flex-wrap gap-2">
    {displayableTags.map(tag => (
      <WaysToHelpPills.Pill key={tag} tag={tag} />
    ))}
  </div>
)
```

**The 'no row at all' detail matters.** An empty row with only padding looks like a layout bug. Conditional null-return ensures the layout flows naturally when tags absent.

### D9 — Picker placement: below category fieldset, above submit button

In the InlineComposer's prayer_request layout:

1. Header / textarea / character count
2. Category fieldset (existing)
3. Challenge prayer checkbox (existing)
4. **WaysToHelpPicker (NEW)**
5. Anonymous toggle (existing)
6. Submit button area

The picker fits naturally in the 'optional fields' section, between mandatory category and anonymous toggle.

Plan verifies the exact order during recon; the position should feel natural in the existing layout flow.

### D10 — Picker UI: chip group with multi-select

Each chip is a `<button type='button' aria-pressed={selected}>` with:
- Visual selected state (filled background + border + check icon)
- Visual unselected state (subtle border, no fill)
- Hover state on desktop only (per 4.7's W19 hover-on-touch trap)
- Keyboard: Tab cycles through chips, Space toggles
- Touch target: 44x44 minimum

**No 'select all' or 'select none' button.** The picker is a small set; users tap individual chips.

**No tag-search input.** 5 chips is small enough to scan visually.

### D11 — Pill styling: subtle, neutral, not type-tinted

Pills are NOT colored per category or per tag. All pills use the same neutral styling:

- Background: `bg-white/10` or similar (subtle)
- Border: `border border-white/20`
- Text: small (text-xs), `text-white/80`
- Padding: rounded-full, px-3 py-1
- Optional small icon per tag (e.g., utensils for meals, car for rides) — verify via Lucide

**Why neutral:** the pills are informational, not decorative. They communicate practical needs without competing with the post type's chrome.

**Tag-specific icons (D11.5):** Lucide icons for visual reinforcement:
- meals: `Utensils` or `UtensilsCrossed`
- rides: `Car`
- errands: `ShoppingBag` or `Package`
- visits: `Home` or `HandHelping`
- just_prayer: N/A (never rendered as pill)

Icons are small (h-3 w-3) and inline-positioned before the label. Text remains the primary signal.

### D12 — Backend: InvalidHelpTagException for unknown values

New exception class:

```java
package com.worshiproom.post;

public class InvalidHelpTagException extends RuntimeException {
    private final String invalidValue;
    
    public InvalidHelpTagException(String invalidValue) {
        super(String.format("Invalid help tag: %s", invalidValue));
        this.invalidValue = invalidValue;
    }
    
    public String getInvalidValue() { return invalidValue; }
}
```

Mapped in PostExceptionHandler to 400 with code `INVALID_HELP_TAG`.

Thrown by `HelpTag.fromWireValue(String)` when the wire value doesn't match any enum constant.

### D13 — Edit-window integration: extend existing EditWindowExpiredException, update Javadoc

Per MPD-3 / R4. The existing `EditWindowExpiredException` covers help_tags edits. The Javadoc on the class needs updating:

```java
/**
 * Thrown when a post mutation is attempted outside the edit window.
 * 
 * Window-gated operations: content, category, qotdId, challengeId,
 * scripture fields, visibility-upgrade, help_tags. // <-- ADD help_tags
 */
public class EditWindowExpiredException extends RuntimeException { ... }
```

`PostService.updatePost()` already has the window check; 4.7b just routes help_tags through the same path.

### D14 — Default empty string semantics

`help_tags VARCHAR(200) NOT NULL DEFAULT ''`. The column is NEVER null.

Application code treats '' as 'no tags':
- Java: `helpTagsRaw.isEmpty()` → empty Set
- DTO: empty Set serializes to `[]` in JSON
- Frontend: empty array (or undefined; both render as 'no pills')

**Why NOT NULL with empty default:**
- Existing rows on migration get '' (no migration data hassle)
- Application doesn't need null-checks everywhere
- Empty string is a valid 'no tags' representation

**Why not nullable:** distinguishing 'never set' from 'explicitly empty' has no value here. Both mean 'no tags'. Simplifying to NOT NULL with default '' eliminates a null-handling concern.

### D15 — Constants file: `frontend/src/constants/ways-to-help.ts`

New file containing:

```typescript
import { Utensils, Car, ShoppingBag, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type HelpTag = 'meals' | 'rides' | 'errands' | 'visits' | 'just_prayer'

export const HELP_TAG_ORDER: HelpTag[] = ['meals', 'rides', 'errands', 'visits', 'just_prayer']

export const HELP_TAG_LABELS: Record<HelpTag, string> = {
  meals: 'Meals',
  rides: 'Rides',
  errands: 'Errands',
  visits: 'Visits',
  just_prayer: 'Just prayer, please',
}

export const HELP_TAG_ICONS: Record<Exclude<HelpTag, 'just_prayer'>, LucideIcon> = {
  meals: Utensils,
  rides: Car,
  errands: ShoppingBag,
  visits: Home,
}

export const DISPLAYABLE_TAGS: HelpTag[] = HELP_TAG_ORDER.filter(t => t !== 'just_prayer')

export function isDisplayableTag(tag: HelpTag): tag is Exclude<HelpTag, 'just_prayer'> {
  return tag !== 'just_prayer'
}
```

The constants are co-located with the rest of the prayer-wall feature constants (post-types.ts, content-limits.ts, etc.).

<!-- CHUNK_BOUNDARY_4 -->

---

## 8. Watch-fors

### W1 — 4.7 must ship before 4.7b starts

Verify spec-tracker.md shows 4.7 ✅. The ComposerChooser is the entry point for prayer_request composers; without it, 4.7b's picker integration has no production path.

Also verify 4.6b ✅ — the per-type composer infrastructure must be fully realized.

### W2 — Don't add a 'Volunteer to help' button on cards or as part of comments

Master plan body explicit anti-feature: 'Offering help is via normal comments, NOT a special I'll help button.' Helpers comment: 'I can bring lasagna Wednesday' or similar. No structured volunteer interface in 4.7b.

If CC adds:
- A 'Volunteer to help' button on the card
- A 'Mark as fulfilled' button for authors
- A `help_offers` table tracking who volunteered
- A separate UI flow for offering help

Reject. The simplicity of 'help is offered via comments' is the design.

### W3 — Don't add notifications when comments offer help

Master plan body: 'No notifications when a comment offers help (commenting fires the existing comment_received notification, nothing 4.7b-specific).'

The existing comment-received notification is the entire notification surface for help offers. No new notification type for 'help offered'. No keyword detection on comments to flag 'I'll bring meals' specifically.

### W4 — Don't add fulfillment tracking

Master plan body: 'No tracking of fulfillment ("did someone bring the meal?") — that's the author's and helper's business.'

If CC adds:
- A 'fulfilled' state on help_tags
- A 'thank you' button after fulfillment
- Analytics on fulfillment rate

Reject. The implicit social contract handles fulfillment; the app stays out of the way.

### W5 — Don't render `just_prayer` as a visible pill

The most subtle rule of 4.7b. Per D8 / MPD-5:

```typescript
const displayableTags = tags.filter(t => t !== 'just_prayer')
```

If CC ships pill rendering as 'render every tag', the 'Just prayer, please' chip would appear on cards. That defeats the design intent: the card should look IDENTICAL to a tagless post when only `just_prayer` is selected. The signal is internal/declarative, not visible.

Watch /code-review for any code path that maps over `prayer.helpTags` directly without filtering.

### W6 — Don't render an empty pills row when no displayable tags

Per D8. If `displayableTags.length === 0`, return null — don't render an empty `<div>` with margin/padding. Empty row creates visual gap that looks like a layout bug.

If CC writes:

```tsx
<div className="mb-3 flex gap-2">
  {displayableTags.map(...)}
</div>
```

Without the empty-array guard, the div renders with margins even when no children. Reject.

### W7 — Don't show the picker for non-prayer_request types

Per D7 / D9. The `composerCopyByType` flag is only set true for prayer_request. If CC accidentally sets it true for other types, or omits the gate entirely (always renders picker), reject.

The picker should be entirely absent from DOM (not just hidden via CSS) for non-prayer_request composers.

### W8 — Don't accept arbitrary string values without enum validation

Per D4 / Gate 14. The backend MUST validate every input tag value against the `HelpTag` enum. Unknown values throw `InvalidHelpTagException`.

If CC writes:

```java
post.setHelpTagsRaw(String.join(",", request.helpTags()));
```

Without enum validation, the DB could store arbitrary strings (e.g., 'pizza' if a malicious client submits it). Reject — enum validation is a security boundary.

### W9 — Don't break existing post creation

The `helpTags` field is optional. Existing clients (not yet aware of 4.7b) submit posts WITHOUT helpTags; backend accepts and stores '' (default). Existing tests should continue to pass without modification.

If CC requires helpTags as a non-optional field (e.g., `@NotNull` on CreatePostRequest), reject. Backward compatibility matters.

### W10 — Don't break the 5-minute edit window for other fields

Per D13 / R4. The existing edit-window mechanism gates content, category, qotdId, challengeId, scripture fields, visibility-upgrade. 4.7b ADDS help_tags to that list — it doesn't replace or modify the existing gates.

If CC's changes break the window check for content edits (e.g., an existing test for 'cannot edit content after 5 minutes' starts failing), reject. The window mechanism is shared infrastructure; 4.7b is a consumer, not a redesigner.

### W11 — Don't introduce per-tag styling on cards

Per D11. All pills use the same neutral styling. No green pills for meals, no blue pills for rides, no per-tag color coding.

If CC adds per-tag color logic, reject. The pills are informational; uniformity reduces visual noise.

Exception: per-tag ICONS (D11.5) ARE allowed and recommended. Icons are small visual reinforcement, not color coding.

### W12 — Don't add a custom-tag input ('Other...')

Per D1. The enum is fixed at 5 values. No 'Other' option, no free-text custom tags.

If CC adds an 'Other' chip with a text input, reject. Custom tags would:
- Allow PII (a desperate user might write their address)
- Defeat the structured data model (server can't validate)
- Open the door to abuse (tags as covert messaging)
- Add complexity without proven need

Future spec can add tags if research shows the 5 are insufficient; not 4.7b.

### W13 — Don't add tag count or aggregation features

No 'Most requested help: meals (47%)' analytics. No 'Hot tag this week' nudges. No leaderboards.

This is anti-pressure design — the moment you aggregate help requests, users feel observed and game the system.

### W14 — Don't break test fixture loading

Frontend mocks (R13) need updating to include various tag configurations. Existing prayer_request fixtures without `helpTags` should still load correctly (default to empty array or undefined).

If CC's TypeScript type makes `helpTags` non-optional, existing fixtures without the field break. Keep `helpTags?: HelpTag[]` (optional).

### W15 — Don't ignore canonical sort order

Per D3. Server normalizes input to canonical order. Frontend trusts the API order.

If CC writes frontend code that sorts tags client-side ('just to be safe'), it's redundant but not wrong. If CC writes frontend code that PRESERVES the order from the API but the API isn't returning canonical order, both ends are broken. Verify in tests that the API normalizes.

### W16 — Don't add hover effects on the pills

Per D11 (informational, not interactive). Pills are display-only. They are NOT focusable, NOT clickable, NOT hover-styled.

If CC adds `onClick` or `:hover` to pills, reject. The pill is visual signal, not affordance.

### W17 — Don't make tags filterable on the feed

4.7b doesn't add a 'Show only meals' filter to the prayer wall. The CategoryFilterBar (existing) filters by category, not by help_tags. Adding a help_tags filter would require new API params and is out of scope.

If CC adds tag filtering, reject. Future spec if appetite emerges.

### W18 — Don't change InteractionBar layout

The pills row sits ABOVE InteractionBar. The InteractionBar itself is unchanged. If CC modifies InteractionBar to know about help_tags (e.g., a tag count next to comment count), reject. InteractionBar is type-aware (4.6 added per-type reaction labels) but tag-blind.

### W19 — Don't break the JPA entity for existing rows

The Liquibase changeset adds the column with `DEFAULT ''` and `NOT NULL`. Existing rows on production migrate to ''.

If the JPA entity declares `private String helpTagsRaw;` (no default), Hibernate may throw on existing rows that have NULL during a transitional migration window. Use `private String helpTagsRaw = "";` to ensure the entity can construct cleanly.

Verify with an integration test that loads an existing-style row (no helpTags column populated) and ensures the entity reads '' correctly.

### W20 — Don't introduce a separate help_tags storage table

CRDT-style or many-to-many storage (a `post_help_tags` join table) is over-engineering. The VARCHAR(200) comma-separated approach works for the bounded enum.

If CC proposes a separate table for normalization, reject. The schema overhead doesn't pay off for 5 enum values.

### W21 — Don't allow tag selection in the auth modal flow

The picker only renders inside an authenticated composer. If unauth users somehow reach the picker (e.g., via debug paths), the chips don't render or don't persist on submit. Defensive: the chooser → composer flow already gates auth (per 4.7's D3); 4.7b doesn't need additional auth checks.

### W22 — Don't store wire values in the Java enum's wire-value field

The HelpTag enum has wire values like `meals`, `rides`, etc. (lowercase, snake_case). These match the JSON field values. The Java enum constants are MEALS, RIDES (uppercase Java convention).

If CC accidentally inverts these (Java constant `meals`, wire value `MEALS`), the JSON serialization breaks. Verify in OpenAPI test or a contract test.

<!-- CHUNK_BOUNDARY_5 -->

---

## 9. Test specifications

Target: ~28 tests. Master plan AC says ≥12; the surface justifies more.

### Backend tests

**`backend/src/test/java/com/worshiproom/post/HelpTagTest.java`** (NEW — ~5 tests):

Pure-unit enum tests:

- `fromWireValue('meals') returns MEALS`
- `fromWireValue('JUST_PRAYER') throws InvalidHelpTagException` (case-sensitive)
- `fromWireValue('pizza') throws InvalidHelpTagException`
- `fromWireValue(null) throws InvalidHelpTagException`
- `fromWireValue('') throws InvalidHelpTagException`

**`backend/src/test/java/com/worshiproom/post/PostServiceTest.java`** (UPDATE — add ~10 tests):

- `createPost_with_no_helpTags_persists_empty_string`
- `createPost_with_meals_only_persists_meals`
- `createPost_with_meals_and_rides_persists_in_canonical_order`
- `createPost_with_visits_meals_normalizes_to_meals_visits`
- `createPost_with_invalid_tag_throws_InvalidHelpTagException`
- `createPost_with_helpTags_on_testimony_throws_HelpTagsNotAllowedForPostTypeException`
- `createPost_with_helpTags_on_question_throws_HelpTagsNotAllowedForPostTypeException`
- `createPost_with_helpTags_on_discussion_throws`
- `createPost_with_helpTags_on_encouragement_throws`
- `createPost_with_duplicate_tags_dedupes_silently`
- `updatePost_with_helpTags_within_window_succeeds`
- `updatePost_with_helpTags_after_window_throws_EditWindowExpiredException`
- `updatePost_with_helpTags_on_non_prayer_request_throws_HelpTagsNotAllowedForPostTypeException`
- `updatePost_clearing_helpTags_persists_empty_string`

**`backend/src/test/java/com/worshiproom/post/PostMapperTest.java`** (UPDATE — add ~3 tests):

- `toDto_with_empty_helpTagsRaw_includes_empty_set`
- `toDto_with_meals_rides_helpTagsRaw_includes_set_of_meals_rides`
- `toDto_just_prayer_helpTagsRaw_includes_just_prayer_in_set` (verify it's in DTO but card-side filtering happens in frontend)

**`backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java`** (UPDATE — add ~5 tests):

- `POST_posts_with_meals_returns_201_with_helpTags_meals`
- `POST_posts_with_invalid_tag_returns_400_INVALID_HELP_TAG`
- `POST_posts_with_helpTags_on_testimony_returns_400_HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE`
- `PATCH_posts_with_helpTags_within_window_returns_200`
- `PATCH_posts_with_helpTags_after_window_returns_400_EDIT_WINDOW_EXPIRED`

### Frontend tests

**`frontend/src/components/prayer-wall/__tests__/WaysToHelpPicker.test.tsx`** (NEW — ~7 tests):

- Renders all 5 chips in canonical order
- Each chip is a button with aria-pressed reflecting selection
- Tapping a chip toggles its selection
- Selecting multiple chips works
- Tab cycles through chips
- Space toggles selection on focused chip
- Helper text rendered if provided via props

**`frontend/src/components/prayer-wall/__tests__/WaysToHelpPills.test.tsx`** (NEW — ~5 tests):

- Renders nothing when tags array is empty
- Renders nothing when only `just_prayer` is in tags
- Renders 'Meals' pill for `['meals']`
- Renders Meals + Visits pills for `['meals', 'visits']` (canonical order)
- Renders 4 pills for `['meals', 'rides', 'errands', 'visits', 'just_prayer']` (just_prayer suppressed)

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE — add ~3 tests):

- WaysToHelpPicker renders for prayer_request composer
- WaysToHelpPicker absent for testimony, question, discussion, encouragement
- Submit payload includes helpTags array when chips selected

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE — add ~3 tests):

- Pills row renders for prayer_request with `meals` tag
- Pills row absent for prayer_request with no tags
- Pills row absent for prayer_request with only `just_prayer`

**`frontend/src/constants/__tests__/ways-to-help.test.ts`** (NEW — ~3 tests):

- HELP_TAG_ORDER includes all 5 tags in canonical order
- HELP_TAG_LABELS has entries for all 5 tags
- DISPLAYABLE_TAGS excludes just_prayer

### Total test budget

- HelpTagTest.java: ~5 new
- PostServiceTest.java: ~14 added
- PostMapperTest.java: ~3 added
- PostControllerIntegrationTest.java: ~5 added
- WaysToHelpPicker.test.tsx: ~7 new
- WaysToHelpPills.test.tsx: ~5 new
- InlineComposer.test.tsx: 3 added
- PrayerCard.test.tsx: 3 added
- ways-to-help.test.ts: ~3 new

**Total: ~48 tests.** Comfortably exceeds the master plan AC of ≥12.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Backend:**

- `backend/src/main/java/com/worshiproom/post/HelpTag.java` — NEW enum
- `backend/src/main/java/com/worshiproom/post/InvalidHelpTagException.java` — NEW exception
- `backend/src/main/java/com/worshiproom/post/HelpTagsNotAllowedForPostTypeException.java` — NEW exception
- `backend/src/main/resources/db/changelog/2026-05-XX-NNN-add-posts-help-tags.xml` — NEW Liquibase changeset (planner picks date and number per R2)
- `backend/src/test/java/com/worshiproom/post/HelpTagTest.java` — ~5 tests

**Frontend:**

- `frontend/src/constants/ways-to-help.ts` — NEW constants (D15)
- `frontend/src/constants/__tests__/ways-to-help.test.ts` — ~3 tests
- `frontend/src/components/prayer-wall/WaysToHelpPicker.tsx` — NEW composer chip picker
- `frontend/src/components/prayer-wall/WaysToHelpPills.tsx` — NEW card display row
- `frontend/src/components/prayer-wall/__tests__/WaysToHelpPicker.test.tsx` — ~7 tests
- `frontend/src/components/prayer-wall/__tests__/WaysToHelpPills.test.tsx` — ~5 tests

### Files to Modify

**Backend:**

- `backend/src/main/java/com/worshiproom/post/Post.java` — add `helpTagsRaw` column field with default ''
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java` — add `helpTags: Set<String>` field
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java` — add optional `helpTags: Set<String>` field
- `backend/src/main/java/com/worshiproom/post/dto/UpdatePostRequest.java` — add optional `helpTags: Set<String>` field
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` — parse helpTagsRaw → Set<String> in toDto
- `backend/src/main/java/com/worshiproom/post/PostService.java` — createPost: validate helpTags against enum, normalize, persist; updatePost: same with edit-window guard
- `backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` — handlers for InvalidHelpTagException (400 INVALID_HELP_TAG) and HelpTagsNotAllowedForPostTypeException (400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE)
- `backend/src/main/java/com/worshiproom/post/EditWindowExpiredException.java` — update Javadoc to add 'help_tags' to gated-operations list
- `backend/src/main/resources/openapi.yaml` — add helpTags to PostDto, CreatePostRequest, UpdatePostRequest schemas; add INVALID_HELP_TAG and HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE error codes
- `backend/src/test/java/com/worshiproom/post/PostServiceTest.java` — ~14 tests
- `backend/src/test/java/com/worshiproom/post/PostMapperTest.java` — ~3 tests
- `backend/src/test/java/com/worshiproom/post/PostControllerIntegrationTest.java` — ~5 tests

**Frontend:**

- `frontend/src/types/prayer-wall.ts` — add `HelpTag` import (or re-export from constants); add `helpTags?: HelpTag[]` to PrayerRequest interface
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — add `showWaysToHelpPicker?` and `waysToHelpHelperText?` to ComposerCopy interface; render WaysToHelpPicker when flag is true; thread helpTags through submit payload; set the flag for prayer_request only
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — render `<WaysToHelpPills tags={prayer.helpTags ?? []} />` between content/image and InteractionBar
- `frontend/src/services/prayer-wall-api.ts` — update CreatePostRequest TypeScript type to include optional helpTags; same for UpdatePostRequest if it exists
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — ~3 tests
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — ~3 tests
- `frontend/src/mocks/prayer-wall-mock-data.ts` — add fixtures for various helpTags configurations (per R13)

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.7b from ⬜ to ✅ AFTER successful merge

### Files NOT to Modify

- `backend/src/main/java/com/worshiproom/post/PostType.java` (no enum changes)
- `backend/src/main/java/com/worshiproom/post/PostController.java` (no new endpoints; existing POST and PATCH handle helpTags via DTO changes)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` (no new query predicate for helpTags filtering — W17)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (W18)
- `frontend/src/components/prayer-wall/CommentItem.tsx`, `CommentsSection.tsx` (W2 — help offered via existing comments, no new flow)
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (W17 — no tag filtering)
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` (4.7's component; chooser doesn't need to know about helpTags)
- All other prayer-wall components not listed in 'Files to Modify'

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Functional behavior — composer:**

- [ ] Prayer Request composer renders WaysToHelpPicker section
- [ ] Section label reads 'What would help?'
- [ ] Helper text reads 'Optional — leave blank if prayer is what you need right now.'
- [ ] 5 chips render in canonical order: Meals, Rides, Errands, Visits, Just prayer, please
- [ ] Picker placement is below category fieldset, above submit button
- [ ] All chips unselected by default
- [ ] Tapping toggles selection
- [ ] Multiple chips can be selected
- [ ] Submit with no chips selected: post created with empty helpTags
- [ ] Submit with chips selected: post created with selected tags (canonical order)
- [ ] Picker is ABSENT from DOM for testimony, question, discussion, encouragement composers
- [ ] Each chip has aria-pressed reflecting state
- [ ] Tab cycles through chips
- [ ] Space toggles focused chip

**Functional behavior — card pills:**

- [ ] No pills row when post has no tags
- [ ] No pills row when post has ONLY `just_prayer`
- [ ] One 'Meals' pill renders for `['meals']`
- [ ] Two pills render in canonical order for `['meals', 'rides']`
- [ ] Pill row renders only displayable tags when `['meals', 'just_prayer']` (Meals only)
- [ ] All 4 helpful tags render when post has all 5 tags including just_prayer (just_prayer suppressed)
- [ ] Pills render in canonical order regardless of input order from API
- [ ] Each pill has aria-label 'Author would welcome: {tag label}'
- [ ] Pills have neutral styling (no per-tag color)
- [ ] Pills have small icons per tag (per D11.5)
- [ ] Pills are NOT focusable / not interactive
- [ ] Pills NEVER render on testimony/question/discussion/encouragement cards

**Backend — create/update:**

- [ ] POST /posts with valid helpTags on prayer_request: 201 with stored tags in canonical order
- [ ] POST /posts with no helpTags field: 201 with helpTags: []
- [ ] POST /posts with invalid tag value: 400 INVALID_HELP_TAG
- [ ] POST /posts with helpTags on non-prayer_request: 400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE
- [ ] POST /posts with duplicate tags: 201 (silently deduped)
- [ ] POST /posts with tags in non-canonical order: 201 (server normalizes)
- [ ] PATCH /posts/{id} with helpTags within edit window: 200 with updated tags
- [ ] PATCH /posts/{id} with helpTags after edit window: 400 EDIT_WINDOW_EXPIRED
- [ ] PATCH /posts/{id} with helpTags on non-prayer_request: 400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE
- [ ] PATCH /posts/{id} clearing helpTags persists empty string

**Schema:**

- [ ] `posts.help_tags` column exists, VARCHAR(200), NOT NULL, DEFAULT ''
- [ ] Existing rows have help_tags = '' after migration
- [ ] Liquibase rollback drops the column safely
- [ ] Java enum HelpTag with 5 wire values exists
- [ ] InvalidHelpTagException and HelpTagsNotAllowedForPostTypeException exist
- [ ] EditWindowExpiredException Javadoc lists 'help_tags' in gated-operations list

**Tests:**

- [ ] ~48 new/updated tests pass
- [ ] Existing tests pass without modification
- [ ] Schema test verifies column existence + default value

**Brand voice:**

- [ ] All copy passes pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon
- [ ] Helper text gives permission, not pressure
- [ ] Pill aria-labels invitational, not demanding

**Visual verification:**

- [ ] All 12 scenarios in Section 3 pass
- [ ] Mixed feed renders correctly with various tag configurations
- [ ] No regression on existing card layouts
- [ ] Pills row doesn't bump InteractionBar

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 4.7b row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.7b:

- **Volunteer matchmaking** ('Here are 3 people near you who picked Meals') — W2; future Phase 6+ if appetite
- **'I'll help' / 'Volunteer' button** — W2; help offered via comments only
- **Fulfillment tracking** — W4; author and helper handle privately
- **Notifications when help is offered** — W3; existing comment notification suffices
- **Per-tag analytics or aggregation** — W13; no 'Most needed help' counts
- **Custom / 'Other...' tag option** — W12; fixed 5-value enum
- **Per-tag color coding** — W11; uniform neutral styling
- **Tag filtering on the feed** — W17; filter by category only
- **Per-tag categories or relationships** — tags are flat
- **Help-offer reactions** — W2; comments only
- **Tag suggestions based on post content** — author chooses
- **Tag-based search** — future spec
- **Tag analytics dashboard for moderators** — future spec
- **Multi-language tag labels** — i18n is its own spec; 4.7b ships English copy
- **Tag-based privacy controls** ('only my friends see I need meals') — future privacy spec
- **Tag-based moderation** ('flag posts asking for meals as suspicious') — not a 4.7b concern
- **Help-offer commitment tracking** ('Sarah committed to bringing dinner Thursday') — author and helper coordinate via comments
- **Recurring help requests** ('I need rides every Tuesday') — single post per request
- **Tag-based notifications digest** ('You're tagged Meals on 3 posts this week') — future notifications spec

---

## 13. Brand voice quick reference (pastor's wife test)

Ways to Help is a delicate feature — it's about people in vulnerable moments asking for practical help. The voice must feel like a friend offering, not a marketplace transaction.

**Anti-patterns to flag during /code-review:**

- 'Tell us how we can help!' (cheerleader voice; presumption of capacity)
- 'Need meals? Rides? Errands?' (transactional, marketplace-coded)
- 'Help your community thrive!' (corporate inspiration voice)
- 'Be a blessing — volunteer!' (pressure-coded, prosperity-language adjacent)
- 'Don't suffer alone, ask for help!' (urgency / shame)
- '✨ Specify what you need to get help faster!' (emoji + speed nudge)
- 'Tag your needs for better matches' (algorithm-speak)
- 'Most popular: Meals (47% of requests)' (analytics gamification)
- 'New feature: Ways to Help!' (marketing voice)

**Good copy in 4.7b:**

- 'What would help?' (composer label) — simple question, no presumption
- 'Optional — leave blank if prayer is what you need right now.' (helper text) — PERMISSION-giving (it's okay to not specify), HONORS the spiritual primary purpose (prayer)
- Chip labels: 'Meals', 'Rides', 'Errands', 'Visits', 'Just prayer, please' — plain nouns, no decoration
- Pill labels: same as chip labels (minus 'Just prayer, please' which doesn't render)
- Aria label on pills: 'Author would welcome: {label}' — invitational, third-person, gentle

The 'Optional — leave blank if prayer is what you need right now' helper text is load-bearing. It acknowledges:

- The author may be in a moment where they can't think about practical help
- Prayer alone is a valid choice, not a fallback
- 'Right now' is a temporal frame: even a person who'd usually accept practical help might genuinely just want prayer in this moment

The 'Just prayer, please' chip label is also load-bearing. The 'please' is what makes it sound like a friend's voice ('I just want prayer right now, please') vs an admin setting ('Prayer-only mode'). Don't shorten to 'Just prayer' or 'Prayer only'.

The 'Author would welcome' aria framing matters too. Alternatives like 'Author needs' or 'Author requests' are heavier; 'would welcome' is appropriately humble (the author isn't demanding, they're opening a door).

---

## 14. Tier rationale

Run at **High**. Justifications:

**Why not Standard:**

- The pills-only-for-non-just_prayer rule (D8 / W5) is the most subtle architectural constraint in 4.7b. Standard tier sometimes ships pill rendering without filtering, putting 'Just prayer, please' as a visible pill on cards (which defeats the design).
- The comma-separated parsing has edge cases (empty, whitespace, dedupe, ordering) that Standard tier sometimes ships partially.
- Edit-window integration (D13 / R4) requires understanding the existing mechanism and updating shared documentation (the EditWindowExpiredException Javadoc). Standard tier sometimes ships the create path but forgets the edit path.
- Cross-type rejection requires a new exception class. Standard tier sometimes silently accepts.
- Brand voice on chip and helper-text copy is sensitive. Standard tier sometimes drifts to 'Need meals? Just tap!' or similar marketplace voice.

**Why not xHigh:**

- All architectural patterns are established (per-type composer field, exception→HTTP-code mapping, Liquibase + JPA, edit-window mechanism)
- No new external dependencies
- No novel coordination (single transaction, no async events, no background jobs)
- The two new components are render-only with bounded behavior
- The brief covers all 22 watch-fors and 15 decisions explicitly
- Genuinely a Risk: Low feature per master plan body's classification

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC writes pill rendering without filtering `just_prayer` (D8 / W5)
- If CC ships the column as nullable or without DEFAULT '' (D2, D14)
- If CC adds a 'Volunteer' button despite W2
- If CC silently coerces invalid tags instead of throwing (D4, W8)
- If CC introduces tag filtering on the feed (W17)
- If brand voice drifts to marketplace / urgency / cheerleader

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-7b`:

```
/spec-forums spec-4-7b

Write a spec for Phase 4.7b: Ways to Help MVP. Read /Users/Eric/worship-room/_plans/forums/spec-4-7b-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: High.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites:
- 4.2 (Prayer Request Polish) must be ✅
- 4.6b (Image Upload) must be ✅ — the per-type composer infrastructure must be fully realized
- 4.7 (Composer Chooser) must be ✅ — the prayer_request entry point goes through the chooser

If any prerequisite check fails, STOP. Don't proceed.

Recon checklist (re-verify on disk before starting; brief recon was on date 2026-05-09):

1. `backend/src/main/java/com/worshiproom/post/Post.java` — confirm no help_tags column yet
2. `backend/src/main/java/com/worshiproom/post/EditWindowExpiredException.java` — read class-level Javadoc for window-gated operations list
3. `backend/src/main/java/com/worshiproom/post/PostService.java` — confirm updatePost() exists at ~line 347; locate the withinWindow check at ~line 382
4. `backend/src/main/java/com/worshiproom/post/dto/UpdatePostRequest.java` — read existing fields to know where helpTags goes
5. `frontend/src/components/prayer-wall/InlineComposer.tsx` — confirm composerCopyByType map post-4.6b state; identify where to add showWaysToHelpPicker flag
6. `frontend/src/components/prayer-wall/PrayerCard.tsx` — identify the layout position for the pills row (between content/image and InteractionBar)
7. `frontend/src/types/prayer-wall.ts` — confirm PrayerRequest interface for adding helpTags field
8. Liquibase changelog directory — list existing changesets to determine next number for 4.7b's changeset
9. `backend/src/main/resources/openapi.yaml` (or wherever OpenAPI lives) — confirm path; identify schemas to extend
10. `frontend/src/mocks/prayer-wall-mock-data.ts` — confirm path for adding helpTags fixtures
11. CategoryFilterBar.tsx (verify a chip pattern exists; learn from it but don't refactor it — R11)

Spec output structure:

- Title and metadata (size M, risk Low, prerequisites 4.2/4.6b/4.7, branch forums-wave-continued)
- Goal — Add OPTIONAL practical-help tagging on prayer requests; new help_tags column; per-type composer integration; pills row on cards (filtering out just_prayer); cross-type rejection; edit within existing 5-minute window
- Approach — New HelpTag enum + 2 new exception classes; one new column with VARCHAR(200) NOT NULL DEFAULT ''; per-type composer flag (showWaysToHelpPicker); two new small frontend components (WaysToHelpPicker for composer, WaysToHelpPills for cards); extend existing edit-window mechanism
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~48 tests)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - 'PrayerRequestComposer.tsx' is stale terminology; integration is via InlineComposer's composerCopyByType (MPD-2)
  - Edit-window mechanism EXISTS at EditWindowExpiredException.java; 4.7b extends to include help_tags (MPD-3, R4)
  - Storage: VARCHAR(200) NOT NULL DEFAULT '' (MPD-4, D2)
  - just_prayer is a real selectable enum value but NEVER renders as a visible pill (D6, D8, MPD-5, W5) — the most critical rule
  - Empty pills row should not render at all when no displayable tags (D8, W6)
  - Cross-type rejection throws HelpTagsNotAllowedForPostTypeException, never silently coerces (D5, W8)
  - Server normalizes tag order (canonical) and dedupes; frontend trusts API order (D3, D4, W15)
  - All 22 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually.
- New backend exceptions, new column, new Liquibase changeset.
- Frontend extends existing ComposerCopy with two new optional fields.
- 4.7b CONSUMES the existing edit-window mechanism (don't recreate).
- The just_prayer rendering rule is the spec's most subtle invariant.

After writing the spec, run /plan-forums spec-4-7b with the same tier (High).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-7b
```

The verifier exercises Section 3's 12 visual scenarios. Verifier writes to `_plans/forums/spec-4-7b-verify-report.md`.

If verification flags any of:
- 'Just prayer, please' rendering as a visible pill on a card (W5)
- Empty pills row rendering when no displayable tags (W6)
- WaysToHelpPicker rendering on non-prayer_request composers (W7)
- An invalid tag value (e.g., 'pizza') being silently accepted instead of rejected with 400 (W8)
- A 'Volunteer' or 'I'll help' button on cards (W2)
- Notifications fired specifically for 'help offered' comments (W3)
- Per-tag color coding on pills (W11)
- Tag filtering surfaces on the feed (W17)
- Helper text using pressure-coded language (Section 13 anti-patterns)

Abort and bump to MAX. Those are the canonical override moments.

For the just_prayer filtering rule specifically, the verifier should:
1. Create a prayer_request post with `helpTags = ['just_prayer']`
2. Assert the rendered card has NO pills row (no `<WaysToHelpPills>` element in DOM)
3. Verify the card's visual layout matches a tagless prayer_request (no extra spacing where the pills would be)
4. Same test for `helpTags = ['meals', 'just_prayer']`: assert ONLY the Meals pill renders

If any of these are skipped, treat as a hard fail.

---

## Prerequisites confirmed (as of 2026-05-09 brief authorship)

- ✅ 4.1 (Post Type Foundation), 4.3 (Testimony), 4.4 (Question) shipped per spec-tracker
- ⬜ 4.2 (Prayer Request Polish) — confirm ✅ status before 4.7b execution (if not yet ✅, brief is correct that this is a prereq)
- ⬜ 4.5, 4.6, 4.6b, 4.7 — must ship before 4.7b
- The edit-window mechanism EXISTS at `backend/src/main/java/com/worshiproom/post/EditWindowExpiredException.java` (R4, recon dated 2026-05-09)
- `PostService.updatePost()` exists at ~line 347; the withinWindow check at ~line 382
- The Javadoc on EditWindowExpiredException lists current window-gated operations: 'content, category, qotdId, challengeId, scripture fields, visibility-upgrade'
- 4.7b adds 'help_tags' to that list
- No `help_tags` column on posts table currently (R1)
- No existing `WaysToHelpPicker` or `WaysToHelpPills` components (R5)
- The `composerCopyByType` map in InlineComposer is the established per-type extension point (4.3-4.6b pattern)
- VARCHAR(200) comma-separated storage chosen over PostgreSQL TEXT[] per master plan body recommendation (MPD-4)
- `just_prayer` is an explicit selectable tag with invisible card semantics — the spec's most subtle invariant (D6, D8, MPD-5, W5)

**Brief authored:** 2026-05-09, on Eric's personal laptop. Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7 briefs. Penultimate Phase 4 spec — 4.7b adds OPTIONAL practical-help tagging on prayer requests, building on 4.7's chooser entry point. The next and final Phase 4 spec, 4.8 (Phase 4 Cutover), wraps up Phase 4 polish, removes any remaining feature flags, finalizes the prayer wall production state, and prepares the codebase for Phase 5 (visual design system migration).

**End of brief.**
