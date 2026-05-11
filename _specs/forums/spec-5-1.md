# Forums Wave: Spec 5.1 — FrostedCard Migration

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 5.1 (lines ~4609–4637)
**Source Brief:** `_plans/forums/spec-5-1-brief.md` (authored 2026-05-09 — **brief is binding; brief wins over master plan body where they diverge**)
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations)
**Date:** 2026-05-11

---

## Affected Frontend Routes

- `/prayer-wall`
- `/prayer-wall?postType=testimony`
- `/prayer-wall?postType=question`
- `/prayer-wall?postType=discussion`
- `/prayer-wall?postType=encouragement`
- `/prayer-wall?postType=encouragement&category=mental-health`
- `/prayer-wall/:id` (PrayerDetail — renders PrayerCard, CommentsSection, dialogs)
- `/prayer-wall/user/:id` (PrayerWallProfile — renders PrayerCard)
- `/prayer-wall/dashboard` (PrayerWallDashboard — renders PrayerCard, save-flow dialog)

All 10 migrated components are mounted by these routes. No new routes are added. Visual parity must hold across every route, including the auth-modal overlay (`/?auth=login` or any route that triggers `AuthModal`), the ReportDialog overlay (any PrayerCard's report action), the DeletePrayerDialog overlay (any owned-prayer delete action), the MarkAsAnsweredForm overlay (any owned question's resolve action), and the SaveToPrayersForm overlay (any prayer's save-to-personal-list action).

---

## Metadata

- **ID:** `round3-phase05-spec01-frosted-card-migration`
- **Phase:** 5 (Prayer Wall Visual Migration — first real Phase 5 spec; 5.0 was closed without ceremony, 5.2 shipped via Spec 14 cinematic hero rollout)
- **Size:** L
- **Risk:** Medium (10 components touched, per-type chrome preservation is subtle, visual regression risk is real)
- **Tier:** High (per brief Section 2 — per-type chrome preservation across 5 PrayerCard variants vs FrostedCard's 3 variants is the central design decision; 10 components is enough surface for one to be partially migrated; form-submission safety via `type` prop is subtle; ComposerChooser inner-cards exception requires careful migration scope)
- **Prerequisites:** ALL of Phase 4 (4.1–4.8) must be ✅ in `spec-tracker.md`. Verified 2026-05-11: Phase 4 is fully ✅ in tracker. FrostedCard exists at `frontend/src/components/homepage/FrostedCard.tsx`. `cn()` utility exists at `frontend/src/lib/utils.ts`. PrayerCard has per-type chrome switch at `frontend/src/components/prayer-wall/PrayerCard.tsx:78–~150`. All 10 migration target components exist on disk.

---

## Goal

Migrate 10 Prayer Wall components from inline frosted-glass class strings to `<FrostedCard>` while preserving:

1. **Per-type chrome on PrayerCard** — 5 distinct accent washes (prayer_request white-baseline / testimony amber / question cyan / discussion violet / encouragement rose) survive the migration via FrostedCard's `className` prop. FrostedCard ships with only 3 variants (`accent` / `default` / `subdued`); the 5 per-type accents are layered on top of `variant="default"` through `className`, not collapsed into the 3 variants.
2. **All ARIA, tabIndex, role, onKeyDown, aria-label semantics** on PrayerCard — direct prop pass-through to FrostedCard, never dropped.
3. **Form-submission safety on dialogs** — FrostedCard's `as="div"` for all dialog shells (NOT `as="button"`); inner submit buttons remain regular `<Button type="submit">` elements, never collapsed into FrostedCard.
4. **ComposerChooser's inner type-selection buttons** stay as `<button>` elements per 4.7 D6/D7 — ONLY the outer modal shell migrates.
5. **Visual parity** — rendered output is identical (or within 1–2 pixel border-opacity tolerance) before and after the migration. This is a refactor, not a redesign.

Secondary deliverable: lift the per-type chrome class strings out of PrayerCard's inline switch into a new constants file `frontend/src/constants/post-type-chrome.ts`, importable by future surfaces (RoomSelector pills already have their own per-pill accent from 4.8 D3, but lifting the PrayerCard variant centralizes the source of truth).

After 5.1 ships, no inline `rounded-xl border border-white/.* bg-white/\[0\.06\].* backdrop-blur` patterns remain in `frontend/src/components/prayer-wall/` (per acceptance criteria); FrostedCard is the canonical card shell for the directory; and Phase 5's remaining specs (5.3 2-line heading, 5.4 animation tokens, 5.5 deprecated pattern purge) are unblocked.

---

## Approach

**5.1 is pure-frontend visual refactor.** No backend changes, no schema changes, no API changes, no new npm dependencies, no component-public-API changes. Recon confirms FrostedCard at `frontend/src/components/homepage/FrostedCard.tsx` already supports every prop the migration needs (`variant`, `eyebrow`, `eyebrowColor`, `as`, `className`, `tabIndex`, `role`, `onKeyDown`, `aria-label`, `aria-labelledby`, `type`).

### Variant assignment per component (brief D1)

| Component | Variant | Eyebrow | `as` | Rationale |
| --------- | ------- | ------- | ---- | --------- |
| PrayerCard | `default` | NO | `article` | Tier 2 content card; per-type chrome layered via className |
| QuestionOfTheDay | `accent` | YES (`Question of the Day`, `eyebrowColor="violet"`) | `article` | Tier 1 featured card on Prayer Wall |
| CommentsSection | `subdued` | NO | `section` | Nested low-key context inside parent article |
| InlineComposer | `default` | NO | `div` | Form context; per-type chrome layered via className (composerCopyByType pattern preserved) |
| ComposerChooser (modal shell ONLY) | `default` | NO | `div` | Dialog shell; inner type-cards stay as `<button>` per MPD-3 / W5 |
| AuthModal | `default` | NO | `div` | Dialog panel |
| ReportDialog | `default` | NO | `div` | Dialog panel |
| DeletePrayerDialog | `default` | NO | `div` | Alert dialog panel |
| MarkAsAnsweredForm | `default` | NO | `div` | Form panel |
| SaveToPrayersForm | `default` | NO | `div` | Form panel |

### Per-type chrome preservation (brief MPD-2 / D2 — the central design decision)

The migration cannot map 5 per-type accents to 3 FrostedCard variants. The pattern:

```tsx
<FrostedCard
  variant="default"
  className={cn(getPerTypeChromeClass(prayer.postType))}
  as="article"
  role="article"
  aria-label={ariaLabel}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {/* card content */}
</FrostedCard>
```

`getPerTypeChromeClass(postType)` returns ONLY the accent layer (background tint + border tint), NOT the base frosted-glass classes — FrostedCard provides those via `variant="default"`. The exact opacity values and border colors come from plan-time recon of `PrayerCard.tsx:78–~150` switch; **do NOT alter opacity values during migration** (W8).

Same pattern applies to InlineComposer's `composerCopyByType` chrome — its per-type accents layer on top of `variant="default"` via `className`.

### New constants file `post-type-chrome.ts` (brief D3 / R9)

Lift the per-type chrome strings out of `PrayerCard.tsx`'s inline switch into:

```typescript
// frontend/src/constants/post-type-chrome.ts (new file)
import type { PostType } from '@/constants/post-types'

const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',  // baseline; no override layer
  testimony: '<exact string from PrayerCard switch>',
  question: '<exact string from PrayerCard switch>',
  discussion: '<exact string from PrayerCard switch>',
  encouragement: '<exact string from PrayerCard switch>',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
```

Plan-time recon copies the exact class strings verbatim from PrayerCard's switch. The example above is illustrative; do not invent values.

Reasons to lift (D3):
- Single source of truth for per-type accent classes
- Importable by RoomSelector pills (which have their own per-pill accent from 4.8 D3 — if those overlap with PrayerCard's chrome, future consolidation can use this file)
- Matches the pattern of `post-types.ts` / `ways-to-help.ts`

### Form-submission safety (brief D5 / W4)

FrostedCard's `type` prop defaults to `'button'` (defensive safety against form submission) but is only relevant when `as="button"`. The migration pattern for dialog forms:

```tsx
<FrostedCard variant="default" as="div" role="dialog" aria-labelledby="report-title">
  <form onSubmit={handleSubmit}>
    <h2 id="report-title">Report this post</h2>
    {/* form fields */}
    <Button type="button" onClick={handleCancel}>Cancel</Button>
    <Button type="submit">Submit report</Button>
  </form>
</FrostedCard>
```

FrostedCard is `as="div"`; its `type` prop is irrelevant. The form's submit button is a regular `<Button>` with explicit `type="submit"`. **Never** set FrostedCard `as="button"` for dialog shells — the inner submit button's click would double-fire submission.

DeletePrayerDialog's destructive button uses `<Button variant="alertdialog">` per design system canonical (NOT a FrostedCard concern — verify this is unchanged at plan time).

### ComposerChooser carve-out (brief MPD-3 / W5)

ComposerChooser has TWO card-like surfaces:

1. **The outer chooser modal panel** — IS migrated to `<FrostedCard variant="default">`.
2. **The 5 inner chooser cards** (one per post type) — `<button>` elements with their own chrome and per-type icon styling per 4.7 D6/D7/D10. **NOT migrated.** They are interactive selection buttons with tappable affordance, NOT frosted-glass content cards.

If the inner cards are migrated to FrostedCard, the chooser visually changes (heavier chrome, different padding, loses per-type accent buttons), and 4.7's design intent breaks.

### Eyebrow usage (brief MPD-4 / D4)

Eyebrow is a Tier 1 pattern from the Round 3 Visual Rollout. Among the 10 migration targets, **only QuestionOfTheDay is Tier 1**:

```tsx
<FrostedCard
  variant="accent"
  eyebrow="Question of the Day"
  eyebrowColor="violet"
  as="article"
>
  {/* QOTD content */}
</FrostedCard>
```

No eyebrow on PrayerCard (Tier 2 content card; has its own per-type chrome and icon header), CommentsSection (subdued nested context), or any dialog/form (their own header pattern).

### Migration order (brief D8)

Simplest to most complex. Each component migrates in isolation; Eric handles git operations manually so individual rollbacks remain trivial.

1. SaveToPrayersForm — simplest form panel
2. MarkAsAnsweredForm — similar
3. DeletePrayerDialog — alert dialog (watch destructive button pattern)
4. ReportDialog — form with radio group
5. AuthModal — form with provider buttons
6. CommentsSection — `variant="subdued"`; nested context
7. ComposerChooser — modal shell only (preserve inner buttons per W5)
8. InlineComposer — per-type chrome integration; complex
9. QuestionOfTheDay — `variant="accent"` + eyebrow
10. PrayerCard — most complex; 5 per-type accents + new constants file extraction

A different order is acceptable as long as each component migrates as an independently-revertible unit and visual parity is verified per-component.

### `cn()` composition (brief R5 / W13)

Use the existing `cn()` utility from `@/lib/utils` (verified at `frontend/src/lib/utils.ts:4`) for `className` composition into FrostedCard. Do not reimplement, do not introduce `clsx` or any new utility (W12 / W13).

### Visual regression infrastructure (brief D9 / R7 / MPD-5)

5.1 does **NOT** establish Playwright screenshot baseline infrastructure. Per brief D9, acceptance criterion #13 downgrades to: **"Manual visual review by Eric: every page route renders identically to pre-migration."**

If plan-time recon finds existing screenshot infrastructure already wired (e.g., `toHaveScreenshot()` already in use in `frontend/e2e/`), capture baselines as part of 5.1's deliverable. But do not establish new infrastructure as a side effect.

Visual regression test infrastructure is its own future spec — file a follow-up if needed.

### Out-of-scope components (brief D10 / R10 / W11 / W15 / W19 / W22 / W24)

Explicitly **NOT** migrated in 5.1 (see "Files NOT to modify" below):

- `PrayerWallSkeleton.tsx` and any other skeleton components — render before content loads; updating them is a follow-up
- `RoomSelector.tsx` pills — not cards; have their own pill pattern from 4.8
- `CategoryFilterBar.tsx` pills — not cards
- The Filter Bar sticky wrapper on `PrayerWall.tsx` — not a card
- `PrayerWallHero.tsx` — already shipped via Spec 14 cinematic hero rollout
- `InteractionBar.tsx` — not a card; reaction buttons
- Inline frosted patterns in `frontend/src/pages/PrayerWallDashboard.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx`, or any other page-level file — if any exist, file follow-up

---

## Files to create

**Frontend:**

- `frontend/src/constants/post-type-chrome.ts` — new per-type accent class lookup (brief D3); exports `PER_TYPE_CHROME` (typed `Record<PostType, string>`) and `getPerTypeChromeClass(postType: PostType): string`
- `frontend/src/constants/__tests__/post-type-chrome.test.ts` — ~3 unit tests:
  - All 5 post types have an entry in `PER_TYPE_CHROME`
  - `getPerTypeChromeClass('encouragement')` returns the rose accent string
  - `getPerTypeChromeClass('prayer_request')` returns the baseline (empty string)

## Files to modify

**Frontend (the 10 migration targets per master plan body):**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — migrate outer wrapper to `<FrostedCard variant="default" as="article">`; extract per-type chrome switch (~lines 78–150) to imports from `post-type-chrome.ts`; preserve `role`, `tabIndex`, `aria-label`, `onKeyDown` via direct prop pass-through
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — migrate to `<FrostedCard variant="accent" eyebrow="Question of the Day" eyebrowColor="violet" as="article">`
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — migrate to `<FrostedCard variant="subdued" as="section">`
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — migrate to `<FrostedCard variant="default" as="div">`; per-type chrome (composerCopyByType pattern) layered via `className`; submit button stays as regular `<Button type="submit">`
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — migrate ONLY the outer modal panel to `<FrostedCard variant="default" as="div">`; the 5 inner type-selection `<button>` elements **MUST stay unchanged** (per MPD-3 / W5)
- `frontend/src/components/prayer-wall/AuthModal.tsx` — migrate modal panel to `<FrostedCard variant="default" as="div">`; auth provider buttons inside stay unchanged
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — migrate dialog panel to `<FrostedCard variant="default" as="div">`; Cancel = `<Button type="button">`, Submit Report = `<Button type="submit">`
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — migrate alert dialog panel to `<FrostedCard variant="default" as="div">`; destructive button continues to use `<Button variant="alertdialog">`
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` — migrate form panel to `<FrostedCard variant="default" as="div">`; atomic-resolve submit flow unchanged
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` — migrate form panel to `<FrostedCard variant="default" as="div">`

**Per-component test files** — update class-string assertions per D7 (~10 small updates):

- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/QuestionOfTheDay.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/CommentsSection.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/ReportDialog.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/DeletePrayerDialog.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/MarkAsAnsweredForm.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/SaveToPrayersForm.test.tsx`

(Plan-time recon enumerates which of these test files actually exist; some may need creation if missing, but per brief R8 most are expected to exist. Each update is small — assertion-only — and existing rendered-output / interactive-behavior tests should pass unchanged.)

**Operational:**

- `_forums_master_plan/spec-tracker.md` — Eric flips the 5.1 row from ⬜ to ✅ AFTER successful merge AND manual visual review confirms parity. CC does NOT flip the tracker.

## Files NOT to modify

- `frontend/src/components/homepage/FrostedCard.tsx` — component unchanged; 5.1 is a consumer, not a maintainer (W6 — and do NOT relocate the file to `components/ui/`)
- `frontend/src/components/skeletons/PrayerWallSkeleton.tsx` — W19 / R10; out of scope
- `frontend/src/components/prayer-wall/RoomSelector.tsx` — W15; pill pattern, not card
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — W15; pill pattern, not card
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — not a card; not in scope
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — already shipped via Spec 14 cinematic hero (W22)
- `frontend/src/pages/PrayerWall.tsx` — page layout file; not a card; W24
- `frontend/src/pages/PrayerWallDashboard.tsx` — W24; file follow-up if it has inline frosted patterns
- `frontend/src/pages/PrayerDetail.tsx` — W24; follow-up if needed
- `frontend/src/pages/PrayerWallProfile.tsx` — W24; follow-up if needed
- `frontend/src/lib/utils.ts` — `cn()` utility unchanged (W13)
- All backend files — pure frontend spec

## Files to delete

(none)

---

## Database changes (Liquibase)

None — pure frontend visual refactor.

---

## API changes (endpoints)

None — pure frontend visual refactor. No backend wire shape changes, no new endpoints, no modifications to existing endpoints.

---

## Copy Deck

5.1 introduces no new copy. Brand-voice concerns are limited to one canonical phrase:

**QuestionOfTheDay eyebrow:** `'Question of the Day'`

- Lowercase 'the' inside the phrase
- No emoji, no decorative sparkle, no leading colon
- `eyebrowColor="violet"` per D4
- If existing QOTD has different copy ('Today's Question', '✨ Question of the Day', etc.), the migration enforces `'Question of the Day'` as the canonical phrasing (matches `_plans/reconciliation/2026-05-07-post-rollout-audit.md`)

**Existing dialog headings inside FrostedCard children stay unchanged:** 'Report this post', 'Delete prayer?', 'Mark as answered', 'Sign in', 'Save to my prayers', etc. The migration relocates them inside FrostedCard, never rewords them.

---

## Anti-Pressure Copy Checklist

5.1 introduces no new user-facing copy beyond the QuestionOfTheDay eyebrow, so the anti-pressure checklist has nothing to evaluate. Existing copy on the 10 migrated components is unchanged. The QOTD eyebrow `'Question of the Day'` is a label (a category marker, not a prompt or directive), so anti-pressure concerns do not apply.

---

## Anti-Pressure Design Decisions

5.1 is a visual refactor — no design decisions touch anti-pressure tone. Per-type chrome (rose / amber / cyan / violet / white) preserves the existing visual hierarchy without amplifying urgency, comparison, or shame. The migration's primary contract is visual parity.

---

## Acceptance criteria

**Migration completeness:**

- [ ] All 10 listed components migrated to use `<FrostedCard>`
- [ ] Each component uses the correct variant per D1
- [ ] QuestionOfTheDay has `eyebrow="Question of the Day"` with `eyebrowColor="violet"`
- [ ] PrayerCard has `as="article"`; preserves tabIndex, role, aria-label, onKeyDown
- [ ] PrayerCard's per-type chrome (rose / amber / cyan / violet / white) preserved via `className` layer
- [ ] InlineComposer's per-type chrome preserved via `className`
- [ ] ComposerChooser's inner type-selection buttons remain as `<button>` elements (NOT migrated to FrostedCard)
- [ ] Dialog/form components use `as="div"` with appropriate `role` and `aria-labelledby`
- [ ] Form submit buttons inside dialogs are regular `<Button type="submit">`, never FrostedCard with `type="submit"`

**Visual parity:**

- [ ] Manual visual review by Eric: every affected page route renders identically to pre-migration
- [ ] No opacity 'cleanup' or 'normalization' (W8) — opacity values stay verbatim
- [ ] Mobile vs desktop backdrop-blur tier preserved (W16)
- [ ] Hover states preserved or visually equivalent (D6)

**No inline frosted patterns remain:**

- [ ] `grep -rE 'rounded-(xl|2xl|3xl) border border-white/.* bg-white/\[0\.0[56]\].* backdrop-blur' frontend/src/components/prayer-wall/` returns ZERO matches (allow plan-time tuning of the regex to match the actual pre-migration pattern)
- [ ] Per-type accent strings exist ONLY in `frontend/src/constants/post-type-chrome.ts` (and are layered onto FrostedCard via `className`); no per-type chrome strings remain inlined in `PrayerCard.tsx` or `InlineComposer.tsx`

**New constants file:**

- [ ] `frontend/src/constants/post-type-chrome.ts` created
- [ ] All 5 post types have entries in `PER_TYPE_CHROME`
- [ ] `getPerTypeChromeClass()` helper exported
- [ ] ~3 unit tests pass

**Test updates:**

- [ ] ~10 component test files have class-string assertions updated where needed
- [ ] All existing tests pass (rendered-output / interactive-behavior unchanged)
- [ ] No new TypeScript errors
- [ ] No `as any` bypasses (W20)

**No regressions:**

- [ ] All 5 post types still createable via composer chooser
- [ ] QOTD, all dialogs (AuthModal, ReportDialog, DeletePrayerDialog, MarkAsAnsweredForm, SaveToPrayersForm) still open and close
- [ ] Comments, reactions, bookmarks unchanged
- [ ] Keyboard accessibility on PrayerCard preserved (Enter/Space activation, focus-visible, tab order)
- [ ] Focus trap on modals preserved (likely `focus-trap-react` per 4.7 brief)
- [ ] Universal Rule 17 axe-core tests (from 4.8 — `frontend/e2e/accessibility.spec.ts`) re-run and pass with zero violations on `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health`

**Out-of-scope verification:**

- [ ] `PrayerWallSkeleton` NOT migrated (W19)
- [ ] `RoomSelector` pills NOT migrated (W15)
- [ ] `CategoryFilterBar` pills NOT migrated (W15)
- [ ] `PrayerWallHero` NOT touched (W22)
- [ ] No new dependencies introduced (W12)
- [ ] No component public APIs changed (W14)
- [ ] No opacity 'cleanup' (W8)
- [ ] `cn()` utility not reimplemented or replaced (W13)

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 5.1 row flipped from ⬜ to ✅ AFTER manual visual review confirms parity (Eric does the flip; not CC)

---

## Testing notes

**Target: ~3 new + ~10 small updates.** The migration is a refactor with expected behavioral parity; existing tests cover behavior. New coverage is limited to the new constants file.

### Frontend unit tests

**`frontend/src/constants/__tests__/post-type-chrome.test.ts`** (NEW — ~3 tests):

- All 5 `PostType` values exist as keys in `PER_TYPE_CHROME`
- `getPerTypeChromeClass('encouragement')` returns the rose accent string (assert against the exact string lifted from PrayerCard)
- `getPerTypeChromeClass('prayer_request')` returns the baseline (empty string per D3, or whatever the lifted baseline is)

**Per-component tests** (UPDATE existing — ~10 small assertion updates):

| File | Update |
| ---- | ------ |
| `PrayerCard.test.tsx` | Class-string assertions updated to check FrostedCard composition; verify per-type chrome still applies; verify `role="article"`, `tabIndex`, `aria-label`, `onKeyDown` preservation |
| `QuestionOfTheDay.test.tsx` | Verify FrostedCard `variant="accent"`; verify eyebrow renders with text `Question of the Day` |
| `CommentsSection.test.tsx` | Verify FrostedCard `variant="subdued"` |
| `InlineComposer.test.tsx` | Verify FrostedCard `variant="default"`; verify per-type chrome layered via className; verify form submit still works |
| `ComposerChooser.test.tsx` | Verify modal shell uses FrostedCard; **verify inner type-cards remain as `<button>` elements** (W5 enforcement test) |
| `AuthModal.test.tsx` | Verify FrostedCard `variant="default"`; verify form submit still works |
| `ReportDialog.test.tsx` | Verify FrostedCard `variant="default"`; verify Cancel is `type="button"` and Submit is `type="submit"` |
| `DeletePrayerDialog.test.tsx` | Verify FrostedCard `variant="default"`; verify destructive button uses `<Button variant="alertdialog">` |
| `MarkAsAnsweredForm.test.tsx` | Verify FrostedCard `variant="default"`; verify atomic-resolve flow still works |
| `SaveToPrayersForm.test.tsx` | Verify FrostedCard `variant="default"` |

### Playwright / accessibility regression

**`frontend/e2e/accessibility.spec.ts`** (NO new tests — re-run existing 4.8 axe-core suite as regression check):

- Existing axe-core scans on `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health` must continue to pass with zero violations after migration.

If pre-existing scans were not run on the additional routes touched by 5.1's dialogs (`/?auth=login`, etc.), plan-time may extend the axe-core suite as a regression-protection follow-up — but expanding the axe-core suite is NOT a 5.1 deliverable.

### Visual regression test infrastructure (D9)

5.1 does NOT establish Playwright `toHaveScreenshot()` baseline infrastructure. Manual visual review by Eric is the gate. If plan-time recon finds existing screenshot infrastructure already wired, capture baselines as part of 5.1; otherwise, file a follow-up.

### Test count summary

- post-type-chrome.test.ts: ~3 new
- 10 component test files: ~10 small updates (class-string assertions, role, aria, type)
- Playwright axe-core: 0 new (existing tests re-run)
- Total: ~3 new + ~10 updates

---

## Notes for plan phase recon

Plan-time (`/plan-forums`) recon should re-verify on disk before authoring the implementation plan:

1. **FrostedCard API** — re-read `frontend/src/components/homepage/FrostedCard.tsx` end-to-end. Confirm:
   - Variant base classes for `accent` / `default` / `subdued` (R1 — brief notes the `subdued` base class but flags `accent` and `default` as `verify in plan recon`)
   - Default `variant` value
   - `as` default value (likely `'div'`)
   - `type` default value (likely `'button'` per W4 / D5)
   - `isInteractive` derivation (likely `!!onClick`)
   - Hover class application logic
2. **PrayerCard per-type chrome switch** — read `frontend/src/components/prayer-wall/PrayerCard.tsx` lines around 78–150. Copy the exact opacity values and border colors for each of the 5 post types into `post-type-chrome.ts`. Recon-verified: there are TWO switches at lines 78 and 94; identify which one(s) hold the per-type chrome strings vs other per-type metadata.
3. **Each of the 10 migration targets** — read each component's current inline frosted pattern. Catalog:
   - Variant assignment per D1
   - Whether per-type chrome is needed (only PrayerCard + InlineComposer)
   - Whether ARIA / tabIndex / role / onKeyDown exist on the outer wrapper (PrayerCard only)
   - Whether the outer wrapper has `onClick` (affects FrostedCard's auto-hover behavior — D6)
   - Whether the form's submit button is correctly typed (D5)
4. **`cn()` utility** — confirm `frontend/src/lib/utils.ts:4` exports `cn`. Verified.
5. **`_plans/reconciliation/2026-05-07-post-rollout-audit.md`** — read the FrostedCard section to confirm brief's interpretation matches canonical patterns. If the report contradicts the brief, the report wins (MPD-6 / R6).
6. **`frontend/src/constants/post-types.ts`** — confirm `PostType` union shape for the new constants file's type import.
7. **`frontend/playwright.config.ts` + `frontend/e2e/`** — check for existing screenshot baseline infrastructure (R7 / D9). If `toHaveScreenshot()` is already in use, plan a baseline-regeneration step after manual review; otherwise, no infrastructure setup in 5.1.
8. **Existing component test files** — enumerate which exist; identify which assertions need class-string updates.
9. **Universal Rule 17 axe-core test** from 4.8 — confirm test file path is `frontend/e2e/accessibility.spec.ts` (recon corrects the brief's `frontend/tests/playwright/` reference — Spec 4.8 ships tests at `frontend/e2e/`). Plan to re-run as regression check.
10. **Focus-trap usage in dialogs** — likely `focus-trap-react` per 4.7 brief. Confirm at plan time; the FrostedCard `as="div"` wrapper must NOT interfere with focus-trap behavior.
11. **DeletePrayerDialog destructive button** — confirm it uses `<Button variant="alertdialog">` today; the migration must NOT regress this.
12. **InlineComposer's `composerCopyByType` chrome** — identify the existing per-type chrome string for the composer (may differ from PrayerCard's per-type chrome). Plan the className layer accordingly.

---

## Out of scope

Explicit deferrals — do NOT include any of these in 5.1:

- **PrayerWallSkeleton migration** — W19 / R10; file follow-up if visual drift appears
- **RoomSelector pill migration** — W15; pills are not cards
- **CategoryFilterBar pill migration** — W15
- **PrayerWallHero touch** — already shipped via Spec 14 cinematic hero rollout (W22)
- **PrayerWallDashboard / PrayerDetail / PrayerWallProfile inline patterns** — W24; follow-up if needed
- **2-line heading treatment** — Spec 5.3 (W7)
- **Animation token migration** — Spec 5.4 (W7)
- **Visual regression test infrastructure** — D9 / MPD-5; follow-up spec
- **Opacity 'cleanup' or color normalization** — W8 (migration's contract is parity, not improvement)
- **Relocating FrostedCard from `components/homepage/` to `components/ui/`** — W6 / MPD-1
- **Adding new variants to FrostedCard** — Phase 5 doesn't change FrostedCard's API
- **Refactoring `cn()` utility** — W13
- **Changing component public APIs** — W14 (scope creep)
- **Touch event handling changes on FrostedCard** — trust FrostedCard's implementation
- **Color contrast preventive adjustments** — if axe-core passes, contrast is fine; if it fails, fix is part of 5.1, but no preventive tuning
- **New shared utility components** — use what exists
- **Storybook stories for FrostedCard variants** — not in Phase 5
- **Documentation updates beyond Files-to-modify** — design system docs are 5.5

---

## Out-of-band notes for Eric

**Branch:** stay on `forums-wave-continued` for the entire 5.1 cycle. Brief Section 1 lists every `git` mutation CC must NEVER run. Eric handles all git operations manually. The skill confirmed clean working tree on `forums-wave-continued` at 2026-05-11 before saving this spec.

**Phase 4 prerequisite verified:** `spec-tracker.md` shows 4.1–4.8 all ✅ as of 2026-05-11.

**Central design decision (per-type chrome preservation, brief MPD-2 / D2):** the migration cannot collapse 5 per-type accents to FrostedCard's 3 variants. The `className` prop is the bridge. If `/plan-forums` or `/execute-plan-forums` proposes simplifying to FrostedCard's 3 variants, that's a tier-bump moment per brief Section 14.

**FrostedCard location quirk (MPD-1):** lives at `components/homepage/`, not `components/ui/`. Historical artifact. 5.1 does NOT relocate it.

**ComposerChooser carve-out (MPD-3 / W5):** only the outer modal shell migrates. The 5 inner type-selection `<button>` elements stay. If CC migrates the inner cards, the chooser's visual design (per 4.7 D6/D7/D10) breaks.

**Eyebrow only on QuestionOfTheDay (MPD-4 / D4):** Tier 1 surface marker. No other component in 5.1's scope gets an eyebrow.

**No visual regression infrastructure setup (D9 / MPD-5):** manual review by Eric is the gate. If plan-time recon finds existing `toHaveScreenshot()` infrastructure, capture baselines as part of 5.1; otherwise, file a follow-up spec.

**Reconciliation report is canonical (MPD-6 / R6):** `_plans/reconciliation/2026-05-07-post-rollout-audit.md` is the canonical Phase 5 patterns reference. If it contradicts this brief, the report wins.

**Migration order (D8):** simplest to most complex. PrayerCard last because its per-type chrome extraction benefits from doing dialogs first.

**Form-submission safety (D5 / W4):** FrostedCard `as="div"` for ALL dialog shells. Submit buttons stay as `<Button type="submit">`. Never let FrostedCard be `as="button"` with an inner submit form.

**Test convention:** `__tests__/` colocated with source files. Single quotes throughout TypeScript and shell.

**Tier:** High per brief Section 2. Override moments per Section 14:
- CC drops per-type chrome to fit 3 variants (D2 / W2 violation)
- CC migrates ComposerChooser inner cards (W5)
- CC breaks form submission via FrostedCard's `type` default (D5 / W4)
- CC updates visual regression baselines without manual review (W10)
- CC migrates RoomSelector / CategoryFilterBar pills (W15)
- CC introduces new dependencies (W12)
- CC changes visual output (W8 — opacity tuning, color normalization)
- CC migrates skeletons (W19 / R10)
- CC changes component public APIs (W14)
- CC adds eyebrow to non-Tier-1 components (MPD-4 / D4)
- axe-core regression test fails (W17 / Universal Rule 17)

**Universal Rule 17 (axe-core, from 4.8):** the existing `frontend/e2e/accessibility.spec.ts` suite re-runs as a regression gate. Migration must not introduce new accessibility violations.

**Next steps after this spec lands on disk:**

1. Run `/plan-forums _specs/forums/spec-5-1.md` to generate the implementation plan
2. Review the plan
3. Run `/execute-plan-forums _plans/<plan>.md` to execute
4. Run `/code-review` for pre-commit quality check
5. Run `/verify-with-playwright _specs/forums/spec-5-1.md` for visual verification (manual review by Eric required before merge — D9)
6. Eric manually flips `_forums_master_plan/spec-tracker.md` 5.1 row from ⬜ to ✅ after merge AND manual visual review confirms parity

**Verification handoff (brief Section 16):** the verifier produces side-by-side screenshots of each migrated component (pre vs post). Manual visual review by Eric is required before merge. If any visual divergence is intentional (e.g., FrostedCard's hover differs from PrayerCard's), document the divergence in the verify report and Eric approves explicitly.
