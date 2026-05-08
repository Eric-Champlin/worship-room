# Forums Wave: Spec 4.2 — Prayer Request Polish (postType prop plumbing + per-type icon marker)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.2
**ID:** `round3-phase04-spec02-prayer-request-polish`
**Branch:** `forums-wave-continued` (continuation branch — do NOT create a new branch)
**Date:** 2026-05-08

---

## Affected Frontend Routes

The TypeMarker icon must render correctly on every PrayerCard render site. Verify across:

- `/prayer-wall`
- `/prayer-wall/dashboard`
- `/prayer-wall/:id`
- `/prayer-wall/user/:id`

(Authenticated render of `/prayer-wall/dashboard` requires login; the other three are public.)

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

**xHigh.** Master plan body says M/Low. The risk profile is genuinely low — most of the work is mechanical type-system plumbing through existing components and mock data. The novel surface is small (the per-type icon-next-to-timestamp pattern + the field-required flip and its cascade through ~24 mock-data construction sites). The brief carries the structured reasoning explicitly. xHigh + comprehensive brief is right; MAX would be over-spending on plumbing.

**Why this spec matters despite its name:** every Phase 4 spec downstream (4.3 Testimony, 4.4 Question, 4.5 Devotional Discussion, 4.6 Encouragement) ships a new card variant + composer variant. Without 4.2 wiring `postType` through PrayerCard and InlineComposer first, each downstream spec would have to plumb the prop AND add its variant in one go — bloating the spec and creating refactor risk. 4.2 is the wire-up that lets 4.3+ each add ONE variant cleanly.

## Visual verification

**Required (lightweight).** The "Hands icon next to timestamp" change is small but real. Run `/verify-with-playwright` after execution to confirm:

- Hands icon renders on every prayer card on `/prayer-wall`, `/prayer-wall/dashboard`, `/prayer-wall/:id`, `/prayer-wall/user/:id`
- Icon size, color, position match the spec
- Existing card layout otherwise unchanged (regression check)
- No layout shift, no extra spacing introduced

This is a tighter scope than a full visual audit — focus on the icon presence and existing-layout preservation, not a 32-item checklist run.

## Master Plan Divergence

Three deliberate divergences from the master plan body's text (lines 4110–4132 of `_forums_master_plan/round3-master-plan.md`):

**MPD-1: Required-field flip is the load-bearing change, not a side effect.** Master plan body's AC says "`postType` prop added with default `'prayer_request'`" and "Existing prayer request rendering unchanged" — but doesn't mention the type-system flip from `postType?: PostType` to `postType: PostType` on `PrayerRequest`. Recon: the existing `prayer-wall.ts` line 33 has the explicit comment `// Phase 4.1 (Post Type Foundation) will make 'postType' required.` — Spec 4.1's brief deferred this flip to 4.2 to keep 4.1's scope tight.

Resolution: 4.2 owns the field-required flip + the cascade through every PrayerRequest construction site. This is the largest single change in the spec — touching ~24 mock-data entries, the InlineComposer's local-mode `newPrayer` construction, the QotdComposer's local-mode `newResponse` construction, and any test fixture that builds a PrayerRequest object. Most are mechanical: add `postType: 'prayer_request'` to the object literal. The QOTD construction site already uses `postType: 'discussion'` for backend writes (line 322 of PrayerWall.tsx) but the local-mode `newResponse` construction (line 308) doesn't include `postType` at all — that gets `'discussion'` added.

**MPD-2: The icon is a NEW per-type-marker pattern, not an existing element being relocated.** Master plan body AC item 3 says "Hands icon shows next to timestamp" without specifying the implementation pattern. Recon: PrayerCard.tsx today renders `<time>` inside a header at lines ~107-112 with no adjacent icon. The Hands icon (`HandHelping` from lucide-react) is currently only in `InteractionBar.tsx` line 2 (used for the Pray button).

Resolution: 4.2 introduces a small inline component or render helper inside PrayerCard — `<TypeMarker postType={prayer.postType} />` — that maps a postType to its Lucide icon (using the `POST_TYPES` constant from 4.1) and renders it as a 14×14px icon with `text-white/40` styling next to the timestamp. For 4.2, only `prayer_request → HandHelping` is wired. The render helper is structured so 4.3+ each just need to confirm their type's entry in POST_TYPES has the right icon name; the rendering machinery is already in place.

**MPD-3: InlineComposer does NOT get a UI-visible postType selector in this spec.** Master plan body's "Files to modify: InlineComposer.tsx" might suggest a Composer Chooser-style dropdown. Recon: the Composer Chooser is Spec 4.7's territory and is explicitly out of scope for 4.2 per master plan body line 4080 ("Spec 4.1 lays the type system... Specs 4.2-4...").

Resolution: 4.2 adds `postType?: PostType` as an InlineComposer **prop with default `'prayer_request'`** that's passed through to `onSubmit`. The composer's UI is unchanged. The `onSubmit` callback signature gains a `postType` argument:

```typescript
onSubmit: (
  content: string,
  isAnonymous: boolean,
  category: PrayerCategory,
  challengeId?: string,
  idempotencyKey?: string,
  postType?: PostType   // NEW — defaults to 'prayer_request' inside the component
) => boolean | Promise<boolean>
```

PrayerWall.tsx's `handleComposerSubmit` accepts the new arg and uses it instead of the hard-coded `'prayer_request'` literal at line 272 (in the backend createPost call). When 4.7 (Composer Chooser) ships, it can pass `postType="testimony"` (or whatever) to InlineComposer; everything downstream already supports the variation.

## Recon Ground Truth (2026-05-08)

All facts verified on the active machine (`/Users/eric.champlin/worship-room/`):

**R1 — `PrayerCard.tsx` does NOT reference `postType` today.** Verified via grep: zero matches. The component reads from `prayer.postType` (which is currently optional per `prayer-wall.ts` line 33). After 4.2, the field becomes required and PrayerCard renders the type marker.

**R2 — `InlineComposer.tsx` does NOT reference `postType` today.** Verified via grep: zero matches. The `onSubmit` signature does NOT include postType. PrayerWall.tsx's `handleComposerSubmit` hardcodes `postType: 'prayer_request'` at line 272 in the backend createPost call.

**R3 — `HandHelping` Lucide icon already in use** at `InteractionBar.tsx` line 2 (`import { HandHelping, MessageCircle, Bookmark, Share2, Plus, Check } from 'lucide-react'`). This is the icon for the Pray button. The TypeMarker render helper imports the SAME icon for the per-type marker — visual consistency between the action button and the type signal.

**R4 — Spec 4.1 is a hard prerequisite.** Per master plan body line 4115. The brief assumes 4.1 has shipped:

- `frontend/src/constants/post-types.ts` exists with `POST_TYPES` array + `PostType` type + `getPostType()` lookup + `isValidPostType()` predicate
- The `PostType` type is the canonical home; `prayer-wall.ts` re-exports for backward compat per 4.1 D6

If CC discovers 4.1 hasn't shipped (e.g., file doesn't exist), it should STOP and ask Eric to ship 4.1 first.

**R5 — `PrayerRequest.postType` field is currently optional.** `frontend/src/types/prayer-wall.ts` line 32: `postType?: PostType`. Comment at line 33 explicitly says 4.1 will make it required — but 4.1 deferred to 4.2 (per the 4.1 brief, MPD-1 there). 4.2 ships the flip.

**R6 — PrayerCard render call sites (5 locations).** All in `pages/`:

- `pages/PrayerWall.tsx:751` (main feed)
- `pages/PrayerWallDashboard.tsx:533` (My Prayers tab), :636 (Bookmarks tab), :671 (Reactions tab)
- `pages/PrayerDetail.tsx:313` (single post view)
- `pages/PrayerWallProfile.tsx:362` (user's prayers), :422 (user's reactions)

All 5 locations pass `prayer={prayer}` where `prayer` is a PrayerRequest from either the mock data (flag-off) or the backend mapper (flag-on, populated via prayer-wall-api). **None of these consumers need changes** — once the field is required and PrayerRequest objects all have `postType`, PrayerCard reads it directly. The rendering of the marker is internal to PrayerCard.

**R7 — InlineComposer render call sites (1 location):** `pages/PrayerWall.tsx:718-722`. Single render. The `onSubmit` callback at line 722 is `handleComposerSubmit`, which already builds the createPost payload with `postType: 'prayer_request'` (line 272). 4.2 plumbs the prop default through but the existing hardcoded `'prayer_request'` becomes redundant — replaced with the prop value.

**R8 — Mock data file has 24+ PrayerRequest construction sites** at `frontend/src/mocks/prayer-wall-mock-data.ts`. Verified via `prayingCount` grep: 24 matches (each construction has a `prayingCount` field). Every construction needs `postType: 'prayer_request'` added when the field becomes required. This is mechanical bulk work; each is a 1-line addition.

**R9 — InlineComposer's local-mode and backend-mode `newPrayer` constructions** at `pages/PrayerWall.tsx:243-262` (local-mode `newPrayer`) and `:268-280` (backend-mode `createPost` payload). The local-mode object literal at line 243 lacks `postType` and gets `'prayer_request'` added. The backend-mode payload at line 270 has `postType: 'prayer_request'` already.

**R10 — QotdComposer's local-mode response construction** at `pages/PrayerWall.tsx:308-323` (local-mode `newResponse`). Lacks `postType` and gets `'discussion'` added (matches the backend createPost payload at line 332 which already passes `postType: 'discussion'`). NOTE: QotdComposer.tsx itself is a separate component that 4.2 does NOT modify — only PrayerWall.tsx's QOTD-related callback state objects need the field added.

**R11 — Test files that construct PrayerRequest objects.** Recon at plan time will surface the full list via `grep -rln "prayingCount" frontend/src/components frontend/src/pages frontend/src/hooks --include="*.test.*"`. Likely 8-15 test files. Each gets `postType: 'prayer_request'` added to its test fixtures. Mechanical bulk work; this is the largest category of mechanical edits.

**R12 — `aria-label="Prayer by ${prayer.authorName}"`** is currently hardcoded at PrayerCard line 64. For 4.2, this stays unchanged (the type IS prayer_request so the label is accurate). For 4.3+ specs, this becomes type-aware — but that's the downstream spec's work, not 4.2's. Watch-for #6 below catches the temptation to refactor early.

**R13 — `time` element formatting** at PrayerCard.tsx lines 107-112 uses `formatFullDate(prayer.createdAt)`. The icon needs to fit cleanly **next to** the timestamp without disturbing this layout. Implementation: small flex container that wraps the existing `<time>` plus the new icon, with `gap-1.5` for spacing. The existing CSS class structure remains.

**R14 — `lucide-react@0.414.0` is the installed version.** Recon at plan time should `cat frontend/package.json | grep lucide-react` to verify. The `HandHelping` icon is confirmed present (used in InteractionBar). For 4.3+, future per-type icons (Sparkles, HelpCircle, MessagesSquare, Heart) need verification too — but that's downstream work.

**R15 — No `formatFullDate` change needed.** The existing time formatter at `lib/time.ts` (used at line 112) is unchanged. The icon is a SIBLING of the time element, not embedded inside it.

**R16 — `PrayerCard.test.tsx`** exists (recon at plan time to verify path). 4.2 adds tests for the `postType` prop plumbing + the icon rendering.

## Phase 3 Execution Reality Addendum gates — applicability

| #    | Convention                | Applies to 4.2?                                                                                                                                            |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-13 | (all Phase 3 gates)       | **N/A.** Frontend-only spec, no backend changes, no Liquibase, no SecurityConfig, no caches, no exception handlers, no JPQL, no schema |

No Phase 3 addendum gates apply to 4.2. Pure frontend type-plumbing spec.

## Decisions and divergences (8 items)

**D1 — `TypeMarker` is an inline render helper inside PrayerCard.tsx, not a new component file.**

For 4.2, only ONE type (prayer_request) gets a marker. Creating a separate `<TypeMarker>` component file is over-engineering. Implementation: a small `function TypeMarker({ postType }: { postType: PostType }) { ... }` defined inside `PrayerCard.tsx` (or above the component), rendered next to the `<time>` element.

```typescript
// Inside PrayerCard.tsx
import { HandHelping } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: HandHelping,    // placeholder until 4.3 — see W7
  question: HandHelping,
  discussion: HandHelping,
  encouragement: HandHelping,
}

function TypeMarker({ postType }: { postType: PostType }) {
  const Icon = POST_TYPE_ICONS[postType]
  return <Icon className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
}
```

When 4.3+ specs ship, they update the `POST_TYPE_ICONS` map to point to their type's actual icon. The TypeMarker component itself doesn't change. **Alternative considered (rejected):** look up the icon name from `POST_TYPES` constant and dynamically resolve the Lucide component. Rejected because dynamic icon resolution adds a runtime lookup helper for what is a 5-entry static map. Not worth the indirection.

**Recommendation for the placeholder values:** All 4 non-prayer_request types map to `HandHelping` as a placeholder until each downstream spec replaces them. Watch-for #7 catches the risk of forgetting to update.

**Alternative considered (rejected):** make POST_TYPE_ICONS only have `prayer_request` and rely on TypeScript's type system to flag missing entries. Rejected because TypeScript's `Record<PostType, LucideIcon>` requires all 5 entries — partial coverage produces a type error. Placeholders are cleaner than `Partial<Record<...>>` here.

**D2 — Field-required flip happens at the type level, not at runtime.**

The change from `postType?: PostType` to `postType: PostType` on the PrayerRequest interface is a one-line edit. Every consumer that constructs a PrayerRequest gets a TypeScript error until they add `postType`. This forcing function is the load-bearing guard for the cascade — TypeScript tells CC exactly which files need updating.

**Sequence for the cascade** (CC follows in this order):

1. Edit `prayer-wall.ts` line 32: `postType?: PostType` → `postType: PostType`
2. Run `npm run typecheck` — produces ~30-40 errors
3. Walk the error list, adding `postType: 'prayer_request'` (or `'discussion'` for QOTD) to each construction site
4. Re-run `npm run typecheck` until clean
5. Run `npm test` — fix any test fixture errors

**D3 — Hands icon placement: small flex container around existing `<time>` element.**

PrayerCard.tsx's header at lines 105-114 currently:

```jsx
<span className="text-white/40"> &mdash; </span>
<time
  dateTime={prayer.createdAt}
  className="text-sm text-white/60"
>
  {formatFullDate(prayer.createdAt)}
</time>
```

Becomes:

```jsx
<span className="text-white/40"> &mdash; </span>
<div className="inline-flex items-center gap-1.5">
  <TypeMarker postType={prayer.postType} />
  <time
    dateTime={prayer.createdAt}
    className="text-sm text-white/60"
  >
    {formatFullDate(prayer.createdAt)}
  </time>
</div>
```

The icon sits to the LEFT of the timestamp. `gap-1.5` is 6px spacing, matching the project's spacing rhythm. `inline-flex` preserves the inline-flow layout (the `<span>` em-dash + the new flex container all sit on one line in the header). `items-center` aligns the icon vertically with the time text.

**Recon at plan time should confirm the exact icon size that visually matches the text x-height.** `h-3.5 w-3.5` (14px) is the brief's recommendation; 12px (`h-3 w-3`) might be cleaner. Visual check during /verify-with-playwright run is the final say.

**D4 — InlineComposer prop API change with default for backward compat.**

```typescript
interface InlineComposerProps {
  isOpen: boolean
  onClose: () => void
  postType?: PostType  // NEW — defaults to 'prayer_request'
  onSubmit: (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory,
    challengeId?: string,
    idempotencyKey?: string,
    postType?: PostType  // NEW — defaults to 'prayer_request' inside the component
  ) => boolean | Promise<boolean>
}
```

Inside the component, `postType` is destructured with default `'prayer_request'` and passed to `onSubmit` along with content/category/etc. The submit handler in PrayerWall.tsx (`handleComposerSubmit`) receives the postType arg and uses it instead of the hardcoded `'prayer_request'` at line 272.

This means the existing call site at PrayerWall.tsx:718-722 doesn't change — the default propagates. When 4.7 (Composer Chooser) ships, it can pass `postType="testimony"` etc., and the rest of the wiring works without further changes.

**D5 — QotdComposer's local-mode response construction needs the field added too.**

PrayerWall.tsx's `handleQotdSubmit` callback at lines 308-323 builds a local-mode `newResponse` object that lacks `postType`. The flip in D2 will produce a TypeScript error here. Fix: add `postType: 'discussion'` to the object literal. The QOTD post type IS discussion (per backend createPost call at line 332).

QotdComposer.tsx itself does NOT need modification — it doesn't construct PrayerRequest objects directly; it submits content through onSubmit which delegates to handleQotdSubmit which builds the object.

**D6 — Mock data update is mechanical bulk edit.**

24 PrayerRequest constructions in `prayer-wall-mock-data.ts` each get one line added: `postType: 'prayer_request',`. CC should NOT add `postType` to entries that already have one (none do, but defensive check). Position the new field consistently — recommend right after `category` to group with the other domain-classification fields.

**D7 — Test fixtures: add postType to every PrayerRequest construction in test files.**

Recon at plan time enumerates the test files. For each one, add `postType: 'prayer_request'` to PrayerRequest object literals in test fixtures. Most test files build a `mockPrayer` or similar fixture once at the top — the edit is small. Some integration tests build multiple fixtures inline; each needs the field.

The drift test (no formal mechanism, but worth a sanity grep): after all edits, no remaining TypeScript errors mentioning `postType` should exist.

**D8 — Test count target ~6 tests (master plan AC says ≥4).**

The brief proposes:

- PrayerCard renders TypeMarker icon for prayer_request: 1 test
- PrayerCard TypeMarker has correct aria-hidden + size + color: 1 test
- PrayerCard layout regression: existing header structure preserved (snapshot or className assertions): 1 test
- InlineComposer default postType is `'prayer_request'` when not passed via prop: 1 test
- InlineComposer.onSubmit receives postType arg: 1 test
- InlineComposer postType prop overrides default: 1 test (testing the prop machinery for 4.7's eventual use)

Total ~6 tests, slightly above the AC's ≥4 floor. The remaining test work is fixing existing tests that broke due to the required-field flip — that's not "new tests" per se but is part of the spec's test budget.

## Watch-fors (12 items)

1. **`postType` flip from optional to required is the single load-bearing change.** Don't let CC make the field required and then ALSO try to ship downstream specs (Testimony composer, etc.) in the same PR. The flip is enough work for one spec.

2. **PrayerCard's existing rendering MUST stay byte-identical EXCEPT for the new icon.** Visual regression check via /verify-with-playwright. The header's flex structure, padding, font sizes, hover states, focus rings — all unchanged.

3. **The em-dash `<span> &mdash; </span>` stays where it is.** It's the visual separator between author name and timestamp. Don't relocate or remove it. The new flex container wraps `<time>` + icon, sits AFTER the em-dash.

4. **The TypeMarker placeholder map (D1) requires all 5 entries.** TypeScript's `Record<PostType, LucideIcon>` enforces this. CC's plan should include the placeholder values for the 4 non-prayer_request types — using `HandHelping` for all of them as a temporary placeholder. Watch-for #7 catches the followup.

5. **InlineComposer's signature change is additive, not breaking.** The new `postType` prop has a default. The new `postType` argument in `onSubmit` is optional with a default propagated through the component. PrayerWall.tsx's existing `handleComposerSubmit` signature can accept the new arg as `postType?: PostType = 'prayer_request'` without changing its caller's contract.

6. **`aria-label="Prayer by ${prayer.authorName}"` stays at PrayerCard line 64.** Type-aware aria-labels are a 4.3+ concern. Don't refactor it here.

7. **Followup entry: per-type icon map needs each downstream spec to update its entry.** Add to `_plans/post-1.10-followups.md`: "Spec 4.3 (Testimony) updates `POST_TYPE_ICONS.testimony` from placeholder `HandHelping` to `Sparkles` (or final choice). Same pattern for 4.4-4.6."

8. **Mock data update is mechanical; don't rewrite the file.** Each entry gets ONE line added. Don't restructure, don't reorder, don't reformat. This is a `str_replace` cascade, not a rewrite.

9. **`postType: 'prayer_request'` field position in object literals.** Convention: right after `category`. Keeps domain-classification fields grouped. Reviewer can spot-check by searching for `category:` lines and verifying the next non-blank line says `postType:`.

10. **No tests for the OLD optional behavior.** After the flip, `postType` is required everywhere. Don't add tests like "PrayerCard handles missing postType gracefully" — that scenario no longer exists.

11. **TypeScript errors are the navigation tool.** CC should run `npm run typecheck` after the field flip and use the error list as a worklist. If CC tries to update files speculatively without typecheck-driven discovery, it'll miss test fixture updates.

12. **`/verify-with-playwright` is required for this spec.** See "Visual verification" section above. The icon-next-to-timestamp change is small but real; verify it lands cleanly across all 5 PrayerCard render sites. Don't skip this step.

## Test specifications (target ~6 new tests, AC says ≥4)

**`PrayerCard.test.tsx` extensions (~3 tests):**

- Renders TypeMarker icon (HandHelping by name or test-id) for `postType: 'prayer_request'`
- TypeMarker has `aria-hidden="true"`, `h-3.5 w-3.5`, `text-white/40` (assertion via className)
- Layout regression: header structure intact — snapshot test OR specific assertions about author link, em-dash, time element presence

**`InlineComposer.test.tsx` extensions (~3 tests):**

- Default postType when prop not passed: onSubmit called with `postType === 'prayer_request'`
- Custom postType prop: onSubmit called with that postType value
- onSubmit signature: postType is the 6th arg (after content, isAnonymous, category, challengeId, idempotencyKey)

**Test fixture updates (no new tests, but bulk fixture edits):**

- All test files that construct PrayerRequest objects get `postType: 'prayer_request'` added to fixtures
- Estimated 8-15 files; recon at plan time enumerates

## Files to Create

```text
(none)
```

## Files to Modify

```text
frontend/src/types/prayer-wall.ts
  - Line 32: change `postType?: PostType` to `postType: PostType` (REQUIRED)
  - Remove the `// Phase 4.1 will make 'postType' required.` comment (or update to note 4.2 made the flip)

frontend/src/components/prayer-wall/PrayerCard.tsx
  - Add `import { HandHelping } from 'lucide-react'` and `import type { LucideIcon } from 'lucide-react'`
  - Add `import type { PostType } from '@/constants/post-types'`
  - Add POST_TYPE_ICONS map (Record<PostType, LucideIcon>) above the component
  - Add TypeMarker render helper above the component
  - Wrap `<time>` element at lines 109-114 in `<div className="inline-flex items-center gap-1.5">` and add `<TypeMarker postType={prayer.postType} />` before it

frontend/src/components/prayer-wall/InlineComposer.tsx
  - Add `import type { PostType } from '@/constants/post-types'`
  - Add optional `postType?: PostType` prop with default `'prayer_request'`
  - Update `onSubmit` signature to include optional `postType?: PostType` arg
  - In handleSubmit, pass `postType` to onSubmit

frontend/src/pages/PrayerWall.tsx
  - Update `handleComposerSubmit` signature to accept the new postType arg
  - Replace hardcoded `postType: 'prayer_request'` at line 272 with the prop value
  - Add `postType: 'prayer_request'` to local-mode newPrayer construction at line 243-262
  - Add `postType: 'discussion'` to local-mode newResponse construction at line 308-323

frontend/src/mocks/prayer-wall-mock-data.ts
  - Add `postType: 'prayer_request'` to all 24 PrayerRequest constructions
  - Position the new field right after `category` (D6/W9)

[Test files — recon at plan time enumerates the full list]
frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx
  - Add tests per "Test specifications" above
  - Update existing fixtures to include `postType: 'prayer_request'`

frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx
  - Add tests per "Test specifications" above

frontend/src/components/prayer-wall/__tests__/InlineComposer-offline.test.tsx
  - Update fixture if PrayerRequest is constructed (recon to verify)

frontend/src/components/prayer-wall/__tests__/ChallengeIntegration.test.tsx
  - Update fixtures

[Plus any other test files that construct PrayerRequest objects — recon enumerates]

_plans/post-1.10-followups.md
  - Add entry per W7: "Specs 4.3-4.6 update POST_TYPE_ICONS map per type"
```

## Files NOT to Modify

- `frontend/src/constants/post-types.ts` — shipped in 4.1; constants are source-of-truth here
- `frontend/src/components/prayer-wall/QotdComposer.tsx` — submits via onSubmit; postType handling is in PrayerWall.tsx's handleQotdSubmit (per D5)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — uses HandHelping for the Pray button; that's unrelated to the type marker
- `frontend/src/services/api/prayer-wall-api.ts` — already accepts postType in createPost (Spec 3.10)
- `frontend/src/lib/prayer-wall/postMappers.ts` — already maps postType from backend (Spec 3.10)
- Any backend file — pure frontend spec
- `frontend/src/lib/time.ts` — formatFullDate stays unchanged
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx`, `CategoryBadge.tsx`, `QotdBadge.tsx` — header siblings of the new icon; their rendering unchanged
- `frontend/src/components/prayer-wall/Avatar.tsx` — unchanged

## Acceptance criteria

Master plan body's 5 AC items + brief additions:

- [ ] `postType` prop added to InlineComposer with default `'prayer_request'`
- [ ] `postType` prop added to InlineComposer's `onSubmit` callback signature with default `'prayer_request'`
- [ ] `PrayerRequest.postType` field is now REQUIRED (not optional) in `prayer-wall.ts`
- [ ] PrayerCard renders TypeMarker icon next to timestamp on every prayer card
- [ ] TypeMarker maps `prayer_request` → `HandHelping` Lucide icon
- [ ] TypeMarker uses placeholders (HandHelping) for the 4 non-prayer_request types until 4.3-4.6 update them
- [ ] Existing prayer request rendering otherwise unchanged (visual regression check via Playwright)
- [ ] All 24 mock data entries include `postType: 'prayer_request'`
- [ ] PrayerWall.tsx local-mode newPrayer construction includes `postType: 'prayer_request'`
- [ ] PrayerWall.tsx local-mode newResponse (QOTD) construction includes `postType: 'discussion'`
- [ ] PrayerWall.tsx handleComposerSubmit passes the postType arg through to backend createPost
- [ ] All existing tests pass (regression check)
- [ ] At least 6 new tests cover the prop plumbing and icon rendering
- [ ] All test fixture PrayerRequest constructions updated to include `postType`
- [ ] `npm run typecheck` passes (TypeScript-driven cascade verified clean)
- [ ] `npm test` passes
- [ ] `/verify-with-playwright` confirms icon renders correctly across all 5 PrayerCard render sites
- [ ] Followup entry filed in `_plans/post-1.10-followups.md` for downstream icon updates (W7)
- [ ] Spec tracker updated to mark 4.2 as ✅ (Eric does this manually after merge)

## Out of scope (deferred to other specs)

- Type-aware aria-labels on PrayerCard (4.3+)
- Composer Chooser UI for picking a post type (4.7)
- Final per-type icons for testimony/question/discussion/encouragement (each downstream spec updates its own entry)
- Per-type card chrome variants (background tint, border accent, etc.) — that's 4.3-4.6
- Per-type composer variants (longer content allowed, scripture pair selector, etc.) — 4.3-4.6
- Backend changes — backend already has the column and validates; no changes
- Removing the `prayer-wall.ts` `PostType` re-export shim — that's a separate cleanup spec
- Filter-by-post-type UI (Phase 4.8 Room Selector)

## Brand voice / Universal Rules quick reference (4.2-relevant)

- Rule 6: All new code has tests; ≥6 new tests
- Rule 11: Brand voice — no new copy strings introduced (icon is decorative, aria-hidden)
- Rule 16: Respect existing patterns — POST_TYPES from 4.1 is source-of-truth; PrayerCard's existing layout is the regression contract
- Rule 17: Per-phase a11y smoke — minimal surface here; the icon is `aria-hidden="true"` so doesn't add to screen reader load

## Tier rationale

xHigh, not MAX. The dimensions:

1. **No novel patterns** — InlineComposer's prop signature extension is standard React. The TypeMarker render helper is a 5-line component. The required-field flip is a 1-line type change with a TypeScript-driven cascade.
2. **Recoverable failure modes** — wrong icon size is a 1-line fix. Wrong placement is a 2-line fix. Missed mock data entry produces a TypeScript error that's immediately visible.
3. **Bulk mechanical work** — most of the spec is adding one line to many files. The risk is forgetting to update one file, which TypeScript catches.
4. **Visual verification is required** but lightweight — single icon presence + layout regression check.
5. **The brief's structured reasoning is sufficient** — 8 explicit decisions, 12 watch-fors, mechanical-cascade strategy documented (D2). xHigh + this brief outperforms MAX + thin brief.

The most likely failure mode is FORGETTING a PrayerRequest construction site, which would produce a TypeScript error at build time. The brief's D2 cascade strategy (typecheck → fix → typecheck → fix) is the load-bearing guard.

## Recommended planner instruction

When invoking `/plan-forums spec-4-2`, run the Plan Tightening Audit with extra scrutiny on:

- **Lens 1 (recon completeness)** — enumerate ALL test files with PrayerRequest constructions (W7 followup tracking)
- **Lens 2 (D2 cascade strategy)** — confirm CC plans to follow the typecheck-driven discovery loop, not speculative file editing
- **Lens 4 (mock data bulk edit)** — confirm the position of the new `postType` field is consistent across all 24 entries (right after `category`, per D6/W9)
- **Lens 7 (D5 QOTD construction)** — verify CC catches the QOTD local-mode construction site separately from the prayer construction site
- **Lens 9 (D3 icon placement)** — confirm the flex container wraps both icon and time element, sits AFTER the em-dash
- **Lens 14 (W7 followup entry)** — verify CC files the followup for downstream icon updates
- **Lens 17 (Visual verification gate)** — confirm CC plans to run `/verify-with-playwright` after execution
