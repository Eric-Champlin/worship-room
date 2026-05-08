# Forums Wave: Spec 4.1 — Post Type Foundation (Frontend Types + Backend Enum Sync)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.1 (lines 4082-4108)
**Master Plan Spec ID:** `round3-phase04-spec01-post-type-foundation`
**Branch:** `forums-wave-continued` (user-managed; CC stays on this branch — no git operations)
**Date:** 2026-05-08

---

## Affected Frontend Routes

N/A — constants and types only; no UI surfaces touched. Downstream specs (4.2 Prayer Request Polish, 4.3 Testimony, 4.4 Question, 4.5 Devotional Discussion, 4.6 Encouragement, 4.7 Composer Chooser, 4.8 Room Selector) own the UI consumption surfaces. `/verify-with-playwright` is not applicable for this spec; the drift test (D5) and brand-voice tests (D10) are the load-bearing verification.

---

## Branch discipline (CRITICAL)

CC MUST stay on `forums-wave-continued`. Specifically:
- Do NOT call `git checkout -b <new-branch>`
- Do NOT call `git branch <new-branch>`
- Do NOT call `git switch -c <new-branch>`
- Do NOT call any git operation that creates, switches, or deletes branches
- Do NOT call `git commit`, `git push`, `git stash`, or `git reset`

The user manages all git operations manually. CC's only job is to write
files; the user reviews and commits. If CC notices it has somehow ended
up on a different branch than expected, STOP and ask the user before
any further action.

## Tier

**xHigh.** Master plan body says M/Low. The risk profile is genuinely low — this is a constants-and-types spec with strong existing scaffolding. The novel surface is small (5-element rich constant + a brand voice review + a backend-frontend drift test). The brief carries the structured reasoning explicitly. xHigh + comprehensive brief is right; MAX would be over-spending on a foundation spec.

**Why this spec matters despite its size:** every Phase 4 spec downstream (4.2 Prayer Request Polish, 4.3 Testimony, 4.4 Question, 4.5 Devotional Discussion, 4.6 Encouragement, 4.7 Composer Chooser, 4.8 Room Selector + Cutover) depends on the constants and types this spec ships. Brand-voice copy locked in here propagates to every Composer header, every empty state, every filter chip, every share-card label, every chat metadata read by Phase 8 profile pages. Get the labels right, and seven downstream specs inherit clean copy. Get them wrong, and seven downstream specs propagate the mistake.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 4082–4108 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: PostType type already exists on frontend; this spec MOVES it, not creates.** Master plan body says "Create `frontend/src/constants/post-types.ts`." Recon: Spec 3.10 already shipped the `PostType` string-literal union type at `frontend/src/types/prayer-wall.ts` lines 45-51:
```typescript
export type PostType =
  | 'prayer_request'
  | 'testimony'
  | 'question'
  | 'discussion'
  | 'encouragement'
```
Resolution: Spec 4.1 MOVES the type alias from `prayer-wall.ts` to the new `constants/post-types.ts`, then re-exports from `prayer-wall.ts` for backward compat (so existing imports don't break). The new file becomes the canonical home for the type and the new rich `POST_TYPES` constant. Six existing files import `PostType` from `@/types/prayer-wall` per recon — keeping the re-export means zero consumer changes for this spec.

**MPD-2: Backend enum is already complete; "validation helpers" means an `isValid(String)` boolean at most.** Master plan body says "add validation helpers" to `PostType.java`. Recon: the existing `PostType.java` already has `value()` getter, `fromValue(String)` static factory that throws `IllegalArgumentException` on unknown values. `InvalidPostTypeException.java` exists. `PostTypeConverter.java` (JPA AttributeConverter) exists. Resolution: the only reasonable "validation helper" remaining is a static `isValid(String value)` boolean check that doesn't throw — useful for request-validation paths that want to check before parsing. Add this single method, plus a unit test for it. Don't add display labels or plural labels to the Java enum — those are frontend brand-voice concerns, not backend domain concerns. Keeping the Java enum lean preserves clean separation.

**MPD-3: No OpenAPI spec exists; replace OpenAPI verification with a hard-coded drift test.** Master plan body says "ensure PostType enum is in `backend/api/openapi.yaml`" and "Frontend tests verify constants match backend enum via OpenAPI types." Recon: `backend/api/` directory does not exist; there is no OpenAPI spec to update. The project ships its API surface via Spring Boot @RestController endpoints, not an OpenAPI document.

Resolution: replace the OpenAPI-based AC with a **hard-coded drift test** in `frontend/src/constants/__tests__/post-types.test.ts`. The test asserts the exact 5 string values match a hard-coded array that mirrors the Java enum. If anyone adds a 6th post type in the Java enum without updating the frontend constant (or vice versa), the test fails. The hard-coded expected values are the contract; they only change when both sides change in lockstep. This is the same pattern Spec 0.5 used for `wr_prayer_reactions` shape preservation (via the canonical-shape test).

A future spec MAY introduce a real OpenAPI generator + type-sync workflow (likely Phase 16 territory). For now, the drift test is the contract.

**MPD-4 (additional, surfaced during spec-forums recon):** Master plan body's AC also lists `accentColor` (Tailwind class), `expiryRule`, `composerCopy`, and `cardCopy` as fields on each `POST_TYPES` entry. The brief consolidates these into the simpler set (`id`, `label`, `pluralLabel`, `icon`, `description`, `enabled`) per D1 — shipping less surface area in 4.1, deferring composer/card copy to the per-type specs (4.2-4.6) that own those surfaces, and deferring `accentColor` + `expiryRule` to the visual / business-logic specs that consume them. Justification: each downstream spec has more accurate context for its own copy and color than 4.1 can predict. **Plan-time check:** if the planner believes any of these deferred fields belong in 4.1, surface that in the Plan Tightening Audit before execution — but the default position is "defer."

## Recon Ground Truth (2026-05-08)

All facts verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — Backend `PostType.java` is fully populated** at `backend/src/main/java/com/worshiproom/post/PostType.java`. All 5 values shipped:
- `PRAYER_REQUEST("prayer_request")`
- `TESTIMONY("testimony")`
- `QUESTION("question")`
- `DISCUSSION("discussion")`
- `ENCOURAGEMENT("encouragement")`

Methods: `value()` getter, `fromValue(String)` factory that throws `IllegalArgumentException` on unknown values. **No changes to existing methods needed.**

**R2 — `InvalidPostTypeException.java` exists** at `com.worshiproom.post.InvalidPostTypeException`. Extends `PostException`, returns 400 with errorCode "INVALID_INPUT". Already used by `PostService` validation paths. No changes.

**R3 — `PostTypeConverter.java` exists** as a JPA AttributeConverter at `com.worshiproom.post.PostTypeConverter`. `@Converter(autoApply = false)`, converts to/from the database string column. Backend persistence is solid.

**R4 — Frontend `PostType` type alias already shipped (Spec 3.10).** Located at `frontend/src/types/prayer-wall.ts` lines 45-51. String-literal union with all 5 values. Comment at line 45 reads `/** Spec 3.10 — discriminator for the unified posts table (Decision 4). */`. The file ALSO defines `PrayerRequest.postType?: PostType` as an optional field (line 33) with comment `// Phase 4.1 (Post Type Foundation) will make 'postType' required.` — this comment is the breadcrumb that 4.1 was anticipated to flip the field from optional to required. **However, that flip is OUT OF SCOPE for 4.1 per MPD-3 framing**: making `postType` required ripples through every PrayerRequest construction site (mocks, test fixtures, consumer pages) which is Phase 4.2 territory ("Prayer Request Polish"). 4.1 ships the constants; 4.2 makes the field required.

**R5 — `frontend/src/constants/post-types.ts` does NOT exist yet.** Confirmed via `ls`. The new file is the deliverable.

**R6 — `frontend/src/constants/__tests__/post-types.test.ts` does NOT exist yet.** New file.

**R7 — `backend/api/openapi.yaml` does NOT exist.** Confirmed — no `backend/api/` directory at all. The OpenAPI-related AC (item 4 in master plan body) needs replacement per MPD-3.

**R8 — Existing constant-file pattern is documented.** Recon of `frontend/src/constants/prayer-categories.ts` shows the established convention:
- `as const` readonly tuple for the values
- `(typeof X)[number]` for the type alias
- `Record<X, string>` for label maps
- `isValidX(value: string | null): value is X` type predicate

The new `post-types.ts` follows this convention with one extension: instead of separate `POST_TYPES` array + `POST_TYPE_LABELS` record, it uses a single rich `POST_TYPES` array of objects (one entry per type) so all metadata for a given type is colocated. The type alias is derived from the array. This was the master plan body's intent ("`POST_TYPES` constant has all 5 entries with: `id`, `label`, `pluralLabel`, `icon` (Lucide name)...").

**R9 — Lucide icons in use today, by component.** Verified via grep:
- `InteractionBar.tsx`: `HandHelping` for prayer
- Other prayer-wall components: various icons
- Available icon library: lucide-react v0.414.0 (per package.json)

The 5 icons proposed for POST_TYPES (recommended, recon at plan time to verify they exist in the installed Lucide version):
- `prayer_request` → `HandHelping` (already in use; matches existing UX)
- `testimony` → `Sparkles` (testimonies are stories of God's work; sparkles connote wonder/light)
- `question` → `HelpCircle` (the Lucide canonical question icon; widely understood)
- `discussion` → `MessagesSquare` (chat/conversation iconography)
- `encouragement` → `Heart` (warmth, support; aligns with brand voice)

These are recommendations; Eric may override during execution.

**R10 — Current `PostType` consumers.** Files that import `PostType` from `@/types/prayer-wall`:
- `frontend/src/services/api/prayer-wall-api.ts` (Spec 3.10 — uses for API DTO types)
- `frontend/src/lib/prayer-wall/postMappers.ts` (Spec 3.10 — uses for mapper output types)
- A few test files

After 4.1, the canonical import path becomes `@/constants/post-types`. The re-export from `@/types/prayer-wall` stays (MPD-1) for backward compat. New code imports from constants; existing code keeps working.

**R11 — `prayer-categories.ts` uses kebab-case for one slug ('mental-health').** Worth mirroring? **No — the convention diverges between the two domains.** Categories are user-facing slugs that may appear in URLs (e.g., `/prayer-wall?category=mental-health`), so kebab-case fits URL conventions. PostType values are NOT URL params — they're DTO field values. The backend enum uses snake_case (`prayer_request`) which matches the Java enum value. Frontend constants must match backend strings character-for-character per AC 3, so frontend uses snake_case too. This is correct.

**R12 — Phase 3 had 13 `[Phase 3 Execution Reality]` addendum gates.** The Phase 4 execution reality addendum doesn't exist yet (Phase 4 is starting now). The applicable gate carryovers for Spec 4.1:
- Addendum #4 (SecurityConfig method-specific rule ordering) — N/A; no SecurityConfig changes
- Addendum #5 (Caffeine-bounded bucket pattern) — N/A; no caches
- Addendum #6 (Domain-scoped @RestControllerAdvice) — N/A; no new exception handlers
- Addendum #10 (`wr_prayer_reactions` shape) — N/A; not touching reactions store
- Addendum #11 (Liquibase filename convention) — N/A; no Liquibase changesets
- Addendum #12 (BB-45 cross-mount subscription test) — N/A; not a Pattern A spec

Effectively no Phase 3 addendum gates apply. Spec 4.1 is a clean foundation spec.

## Decisions and divergences (10 items)

**D1 — `POST_TYPES` is an array of objects, not a string-tuple plus a label map.**

Following the master plan body's AC ("`POST_TYPES` constant has all 5 entries with: `id`, `label`, `pluralLabel`, `icon` (Lucide name)..."), the constant is shaped:
```typescript
export const POST_TYPES = [
  {
    id: 'prayer_request',
    label: 'Prayer request',
    pluralLabel: 'Prayer requests',
    icon: 'HandHelping',
    description: 'Lift up a need to the Lord with the community.',
    enabled: true,  // Phase 4.2 makes this canonically true; remaining types flip per Phase 4 sequence
  },
  // ... 4 more
] as const

export type PostType = (typeof POST_TYPES)[number]['id']
```

The `id` field is the discriminator; it matches the backend enum `value()` exactly. The `label` and `pluralLabel` are brand-voice copy. The `icon` field is a Lucide name string (component lookup at consume time, NOT an imported component). The `description` is short copy explaining the post type — used by the Composer Chooser (Spec 4.7) and possibly empty-state copy. The `enabled` boolean is the feature flag — only `prayer_request` is enabled in 4.1; the others flip to true as Specs 4.3-4.6 ship their respective feature work.

**D2 — `enabled` as a runtime feature flag, NOT a build-time env var.**

Master plan body's AC mentions "feature flag" loosely. Resolution: a runtime boolean on the constant (`enabled: true | false`) controls UI gating. When 4.1 ships:
- `prayer_request.enabled = true` (already canonical)
- `testimony.enabled = false` (until 4.3)
- `question.enabled = false` (until 4.4)
- `discussion.enabled = false` (until 4.5)
- `encouragement.enabled = false` (until 4.6)

UI consumers (Composer Chooser, filter chips) skip-render disabled types. This pattern lets Phase 4.3-4.6 each flip their own type's flag without touching unrelated code. **Crucially, the `enabled` flag does NOT control the type alias** — `PostType` is always the union of all 5 values, because the BACKEND accepts all 5 (the Java enum has all 5; Spec 3.5 PostMapper maps all 5). Frontend type-checking allows posting any type; UI gating prevents the Composer from offering a type that isn't ready. This separation is critical: a server-stored testimony post (created in dev or via API) doesn't break the frontend type system just because `testimony.enabled === false`.

**Alternative considered (rejected):** make `PostType` derive from the array filtered by `enabled === true`. Rejected because it would require type-narrowing every API response based on a runtime boolean, which TypeScript can't do statically. The flag is for UI; the type is for data.

**D3 — Brand voice review of every copy string passes the pastor's-wife test.**

Master plan body AC 2. Concrete checks for each `label` / `pluralLabel` / `description`:
- Sentence case + period termination on descriptions (label/pluralLabel are noun phrases, no period)
- No exclamation points in descriptions (anti-pressure)
- No urgency framing ("right now", "today only", "before it's too late")
- No "should" / "must" / "ought to" — invitation, not obligation
- No comparative or competitive framing
- No FOMO triggers

Proposed copy strings (recon at plan time may surface tweaks, but these clear the bar):

| Type | label | pluralLabel | description |
|---|---|---|---|
| prayer_request | Prayer request | Prayer requests | Lift up a need to the Lord with the community. |
| testimony | Testimony | Testimonies | Share what God has done in your life. |
| question | Question | Questions | Ask the community for wisdom or perspective. |
| discussion | Discussion | Discussions | Open a thread on a passage or topic worth exploring. |
| encouragement | Encouragement | Encouragements | Speak a word of life over the community. |

Watch-fors below catch common drift.

**D4 — Backend `PostType.java` adds exactly ONE method: `isValid(String value)`.**

Single line of new logic:
```java
public static boolean isValid(String value) {
    if (value == null) return false;
    for (PostType t : values()) {
        if (t.value.equals(value)) return true;
    }
    return false;
}
```

Used by request-validation paths that want to check before parsing without throwing. Existing `fromValue(String)` continues to throw (used in JPA converter path, where invalid values indicate data corruption and SHOULD throw).

Add a unit test in `backend/src/test/java/com/worshiproom/post/PostTypeTest.java` (recon to verify path; create if missing). Three tests: returns true for valid value, returns false for unknown string, returns false for null.

**D5 — Drift test is the contract; the contract is a hard-coded array.**

Per MPD-3, the frontend test asserts the exact values match a hard-coded mirror of the Java enum:
```typescript
// post-types.test.ts
const EXPECTED_BACKEND_VALUES = [
  'prayer_request',
  'testimony',
  'question',
  'discussion',
  'encouragement',
] as const

it('POST_TYPES ids match backend Java enum exactly (drift test)', () => {
  const ids = POST_TYPES.map((t) => t.id)
  expect(ids).toEqual(EXPECTED_BACKEND_VALUES)
})
```

When a Phase 4.5+ spec adds a new post type (or renames one), this test fails until both the array AND `EXPECTED_BACKEND_VALUES` are updated. This is intentional — the test is a tripwire that forces sync.

The test file's top comment explicitly documents the contract: "If you change `EXPECTED_BACKEND_VALUES` in this file, update `backend/src/main/java/com/worshiproom/post/PostType.java` to match. Both must change in the same commit. The drift test is the only mechanism guarding sync between frontend and backend post-type strings."

**D6 — `frontend/src/types/prayer-wall.ts` keeps the re-export.**

To avoid breaking the 6 existing import sites, `prayer-wall.ts` becomes:
```typescript
// Spec 3.10 type, moved to constants/post-types.ts in Spec 4.1.
// Re-exported here for backward compatibility.
export type { PostType } from '@/constants/post-types'
```

New code imports from `@/constants/post-types`. Existing code keeps working. A future cleanup spec can sweep imports across the codebase if desired (low priority).

**D7 — `PrayerRequest.postType` stays optional.**

Master plan body comment hints at "make `postType` required" but recon shows the same comment explicitly defers this to a future spec ("Phase 4.1 will make `postType` required"). **Defer to Spec 4.2 (Prayer Request Polish).** The 4.2 brief will own the field-required flip plus the cascade through PrayerCard, InlineComposer, mock data, and tests. 4.1 should ONLY ship constants + type + drift test + brand voice — keep the scope tight.

If CC tries to make `postType` required in this spec, push back: that's 4.2's work.

**D8 — Lucide icon names stay as strings, not imported components.**

The constant stores `icon: 'HandHelping'` (string), not `icon: HandHelping` (component). Why:
- String values keep the constant tree-shakable in a way that imported components don't (Lucide imports are small, but multiplying across consumers adds up)
- Component lookup at consume time (e.g., `<DynamicIcon name={postType.icon} />`) keeps consumers in control of icon styling/sizing
- Easier to lint: the drift test can assert `icon` is a known Lucide name without importing every component

Helper utility for consumers (out of scope for this spec but documented for clarity): a `getIconComponent(name: string)` lookup. Phase 4.7 (Composer Chooser) will likely build this; not 4.1's job.

**D9 — `description` is optional in the type but populated for all 5 entries.**

Why optional: future post-type ideas (admin-only types, deprecated types) might not have user-facing descriptions. Why populated for all 5: every current type has Composer-Chooser-relevant copy.

**D10 — Test count target ~12 tests (master plan AC says ≥8).**

The brief proposes:
- Constant shape (`POST_TYPES` is an array, has 5 entries): 2 tests
- Each entry has all required fields (id, label, pluralLabel, icon, description, enabled): 1 test (loop over array)
- `id` values match backend enum exactly (drift test): 1 test
- `enabled` flag is `true` for prayer_request, `false` for others: 1 test
- Type predicate `isValidPostType` returns true for all 5 ids: 1 test
- Type predicate returns false for null, empty string, and known-bad values: 1 test
- Brand voice: no exclamation points in descriptions: 1 test
- Brand voice: descriptions end in periods (sentence-style copy): 1 test
- Brand voice: no urgency words in descriptions: 1 test
- Lookup helper `getPostType(id)` returns the entry, throws on unknown: 1 test
- `pluralLabel` is genuinely plural (basic heuristic: ends in 's'): 1 test
- Backend Java enum unit tests (`isValid` returns true/false correctly): 3 tests in `PostTypeTest.java`

Total ~13 tests across 2 test files. Well above the AC's ≥8 floor.

## Watch-fors (15 items)

1. **`PostType` type alias must remain compatible after the move.** Six existing files (mostly Spec 3.10 era) import `PostType` from `@/types/prayer-wall`. The re-export in `prayer-wall.ts` (D6) is the load-bearing compat shim. Don't remove it.

2. **Backend Java enum strings are the contract.** Frontend `id` values MUST match Java `value()` strings character-for-character. The drift test (D5) catches divergence. Reviewer should manually verify the 5 Java strings against the 5 frontend ids during code review, not just trust the test.

3. **`enabled` flag does NOT change the type union.** The TypeScript type `PostType` is always the union of all 5 ids. The `enabled` flag is runtime-only. If CC writes `type PostType = typeof POST_TYPES[number] extends { enabled: true } ? ...`, push back — that's a misread of D2.

4. **`PrayerRequest.postType` stays optional in this spec.** D7 defers the required flip to 4.2. If CC changes `postType?:` to `postType:` in `prayer-wall.ts`, push back.

5. **No new icons imported in `post-types.ts`.** D8 keeps icon names as strings. If CC writes `import { HandHelping } from 'lucide-react'` in the constants file, push back — that's component coupling we don't want in a constants module.

6. **Brand voice on `description` strings.** D3's pastor's-wife checklist applies to every description string. Watch for: "Share something powerful!" (exclamation), "Tell us what God did!" (urgency + exclamation), "You should post if..." (obligation). All bad.

7. **`pluralLabel` should be the natural English plural, not "Prayer request (s)".** "Prayer requests" not "Prayer requests(s)" or "PrayerRequests".

8. **`description` is sentence-case + period.** Labels are noun-phrase title case without period. Don't mix them up.

9. **Backend `isValid(String)` handles null gracefully.** Returns false; doesn't throw. The existing `fromValue(String)` throws on null per its own contract; `isValid` doesn't.

10. **No backend changes besides `isValid` method.** D4 explicitly scopes the Java edit. If CC proposes adding `displayLabel()` or `pluralLabel()` to the Java enum, push back — that's frontend-only territory per the separation principle.

11. **The drift test's `EXPECTED_BACKEND_VALUES` array is the contract.** It must NOT be derived from `POST_TYPES` (that would defeat the purpose). Hard-coded values only. The top-of-file comment explicitly documents this.

12. **`getPostType(id)` lookup helper throws on unknown.** Don't let CC make it return undefined silently — that would mask drift bugs at runtime. Throw with a clear error like `Unknown post type id: ${id}. Did you mean one of: ${POST_TYPES.map(t => t.id).join(', ')}`.

13. **Tests should not import the Java enum.** No JNI bridge, no JSON file shared between front and back. The drift test's `EXPECTED_BACKEND_VALUES` is the explicit hard-coded contract per D5/W11.

14. **Single quotes** for shell commands and string literals in TypeScript per project convention.

15. **Don't extend `prayer-wall.ts` with new content.** All net-new code lives in `constants/post-types.ts` and its test. The only edit to `prayer-wall.ts` is the D6 re-export shim (and removing the now-orphaned local `PostType` type definition).

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 4.1? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit endpoint changes |
| 2 | L1-cache trap (entityManager.refresh) | N/A — no JPA changes |
| 3 | `@Modifying` flags | N/A — no JPQL UPDATE |
| 4 | SecurityConfig method-specific rule ordering | N/A — no SecurityConfig changes |
| 5 | Caffeine-bounded bucket pattern | N/A — no caches |
| 6 | Domain-scoped @RestControllerAdvice | N/A — no new exception handlers |
| 7 | CrisisAlertService unified entry | N/A — no crisis paths |
| 8 | Schema realities (do NOT recreate) | N/A — no schema changes |
| 9 | INTERCESSION ActivityType | N/A |
| 10 | wr_prayer_reactions shape | N/A — not touching reactions |
| 11 | Liquibase filename convention | N/A — no changesets |
| 12 | BB-45 cross-mount subscription test | N/A — not a Pattern A spec |
| 13 | (varies) | N/A |

No Phase 3 addendum gates apply to 4.1. Pure constants + types spec.

## Files to Create

```
frontend/src/constants/post-types.ts
frontend/src/constants/__tests__/post-types.test.ts
backend/src/test/java/com/worshiproom/post/PostTypeTest.java     (recon to verify path; if test file already exists for PostType class, extend it instead of creating)
```

## Files to Modify

```
frontend/src/types/prayer-wall.ts
  - Remove the local `PostType` type definition (lines 45-51)
  - Add the re-export shim: export type { PostType } from '@/constants/post-types'
  - Keep all other content unchanged

backend/src/main/java/com/worshiproom/post/PostType.java
  - Add static method `isValid(String value): boolean` per D4
```

## Files NOT to Modify

- `frontend/src/services/api/prayer-wall-api.ts` — uses `PostType` from `prayer-wall.ts`; the re-export shim keeps this working
- `frontend/src/lib/prayer-wall/postMappers.ts` — same
- Any consumer of the `PostType` type alias — the re-export means zero consumer changes
- `frontend/src/types/api/prayer-wall.ts` — API DTO types stay
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — postType field rendering is 4.2's work
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — same
- `frontend/src/mocks/prayer-wall-mock-data.ts` — making postType required on mocks is 4.2's work
- Any backend file besides `PostType.java` — Spec 4.1 is type-foundation, not backend logic
- `backend/src/main/java/com/worshiproom/post/InvalidPostTypeException.java` — already shipped per R2
- `backend/src/main/java/com/worshiproom/post/PostTypeConverter.java` — already shipped per R3
- `backend/api/openapi.yaml` — does not exist; MPD-3 replaces with drift test

## Acceptance criteria

Master plan body's 5 AC items + brief additions:

- [ ] `frontend/src/constants/post-types.ts` exists and exports `POST_TYPES`, `PostType`, `isValidPostType`, `getPostType` (lookup helper)
- [ ] `POST_TYPES` array has all 5 entries: prayer_request, testimony, question, discussion, encouragement
- [ ] Each entry has fields: `id`, `label`, `pluralLabel`, `icon` (Lucide name string), `description`, `enabled`
- [ ] `prayer_request.enabled === true`; the other 4 entries have `enabled === false`
- [ ] Each entry's `id` matches the backend Java `PostType.value()` strings character-for-character
- [ ] Drift test (per D5) hard-codes the expected backend values and asserts equality with `POST_TYPES.map(t => t.id)`
- [ ] Brand voice review of every `label`, `pluralLabel`, `description` passes the pastor's-wife test (no exclamation points, no urgency, sentence case + period for descriptions, title case noun phrases for labels)
- [ ] `frontend/src/types/prayer-wall.ts` has the local `PostType` type definition REMOVED and replaced with the re-export shim from `@/constants/post-types`
- [ ] All 6 existing files importing `PostType` from `@/types/prayer-wall` continue to work (manual smoke check by typecheck pass)
- [ ] `backend/src/main/java/com/worshiproom/post/PostType.java` has a new `isValid(String value): boolean` method that handles null + unknown values gracefully (returns false)
- [ ] Backend test for `isValid()` covers: valid value returns true, unknown string returns false, null returns false
- [ ] At least 12 frontend tests pass (well above the ≥8 floor)
- [ ] At least 3 backend tests pass for the new `isValid()` method
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all updated tests green)
- [ ] `mvn test` passes (backend tests green)
- [ ] No regressions in any existing test
- [ ] Spec tracker updated to mark 4.1 as ✅ (Eric does this manually after merge)

## Out of scope (deferred to other specs)

- Making `PrayerRequest.postType` field required (Spec 4.2)
- Wiring `postType` into PrayerCard rendering (Spec 4.2)
- Wiring `postType` into InlineComposer (Spec 4.2)
- Any per-type icon rendering (Spec 4.2 + 4.7)
- Composer Chooser UI (Spec 4.7)
- Room Selector / filter chips (Spec 4.8)
- OpenAPI generator setup (future infrastructure spec, Phase 16+)
- TypeScript-Java code generation tooling (out of scope for foreseeable future)
- Removing the `prayer-wall.ts` re-export shim (low-priority cleanup, separate spec)
- Migration of existing posts with NULL `post_type` (no NULL rows expected — Spec 3.5 made the column NOT NULL with default `prayer_request`)
- Post-type-specific rate limits (Spec 4.6b territory if at all)
- Post-type-specific moderation rules (Phase 10)
- Post-type analytics (Phase 13)
- `accentColor`, `expiryRule`, `composerCopy`, `cardCopy` fields on POST_TYPES entries (per MPD-4 — defer to per-type specs that own those surfaces)

## Brand voice / Universal Rules quick reference (4.1-relevant)

- Rule 6: All new code has tests; aim for ≥12 frontend + ≥3 backend tests
- Rule 11: Brand voice — pastor's-wife test on every copy string in POST_TYPES
- Rule 12: Anti-pressure copy — no exclamation points in descriptions, no urgency framing, no obligation language
- Rule 16: Respect existing patterns — `prayer-categories.ts` is the convention template; follow its structure
- Rule 17: Per-phase a11y smoke — N/A for a constants-only spec; the consumers (4.2+) will be the a11y test surface

## Tier rationale

xHigh, not MAX. The dimensions:
1. **No novel patterns** — the prayer-categories.ts file is a complete template. The drift-test pattern is a single hard-coded array assertion. The Java enum addition is one method.
2. **No data migration** — backend already has the column populated; frontend already has the type alias. This spec organizes existing artifacts into their canonical location.
3. **No security surface** — constants and types only. No new endpoints, no new auth gates.
4. **Recoverable failure modes** — a typo in a label is a 1-line fix. A wrong feature flag default is a 1-line fix. A wrong Lucide icon name is a 1-line fix. Failure modes self-localize.
5. **The brief's structured reasoning is sufficient** — 10 explicit decisions, 15 watch-fors, brand voice review checklist, drift test contract documented. xHigh + this brief outperforms MAX + thin brief.

The most likely failure mode for this spec is BRAND VOICE drift in the description strings — copy that sneaks in pressure language, urgency, or exclamation points. The pastor's-wife checklist (D3) and the brand-voice tests (D10) are the load-bearing guards.

## Recommended planner instruction

When invoking `/plan-forums spec-4-1`, run the Plan Tightening Audit with extra scrutiny on:
- **Lens 3 (D3 brand voice)** — every description string passes the pastor's-wife checklist; tests verify no exclamation points and period-termination
- **Lens 4 (D5 drift test)** — `EXPECTED_BACKEND_VALUES` is a hard-coded array, NOT derived from POST_TYPES; the test is a tripwire, not a tautology
- **Lens 7 (D6 re-export shim)** — `prayer-wall.ts` keeps a re-export; existing imports unchanged; manual verification via typecheck pass
- **Lens 9 (D10 test count)** — at least 12 frontend tests covering all 6 fields + drift + brand voice; at least 3 backend tests for `isValid()`
- **Lens 14 (W4 scope creep)** — `PrayerRequest.postType` stays optional; do not flip to required in this spec
- **Lens 17 (W3 type vs flag)** — `PostType` union is all 5 ids regardless of `enabled`; the flag is runtime UI, not compile-time type
