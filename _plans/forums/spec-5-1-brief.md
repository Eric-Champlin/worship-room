/spec-forums spec-5-1

# Spec 5.1 — FrostedCard Migration

**Master plan ID:** `round3-phase05-spec01-frosted-card-migration`
**Size:** L
**Risk:** Medium (10 components touched, per-type chrome preservation is subtle, visual regression risk)
**Prerequisites:** Phase 4 complete (4.1–4.8 all ✅). Recon dated 2026-05-09 confirms FrostedCard component exists at `frontend/src/components/homepage/FrostedCard.tsx`.
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

**Note:** 5.1 is the first real Phase 5 spec (5.0 was closed without ceremony; 5.2 shipped via Spec 14). The visual refactor surface is large — 10 components — but the changes are mechanical pattern migration, not architectural. Stay disciplined: one component at a time, visual parity verified after each.

---

## 2. Tier — High

**Why High (not Standard):**

- **The per-type chrome preservation challenge is the central design decision** (D2). FrostedCard ships with 3 variants (`accent` / `default` / `subdued`), but PrayerCard requires 5 per-type accent washes (rose / amber / cyan / violet / white) from 4.3–4.6. Standard tier sometimes 'simplifies' by dropping per-type accents to the closest FrostedCard variant, breaking the per-type chrome contract.
- 10 components touched is enough surface for one to be missed or partially migrated.
- Visual regression risk is real: a wrong opacity value, a missing hover state, a backdrop-blur level difference — these are easy to ship and hard to spot in code review.
- FrostedCard's `type` prop defaults to `'button'` (W4) which is a load-bearing safety against form submission. Standard tier sometimes overrides this when migrating dialog Cancel/Confirm patterns, breaking the safety.
- Existing tabIndex/role/aria/onKeyDown patterns on PrayerCard must survive migration (W3). Standard tier sometimes drops them as 'unused props' when migrating to FrostedCard.
- The pre-existing `cn()` className composition pattern needs to thread through FrostedCard's `className` prop, not replace it.
- Component test files for each migrated component will likely need updates to assert against the new structure.

**Why not xHigh:**

- No new component creation; FrostedCard already exists
- No schema, no backend, no migration
- No novel coordination problem; mechanical pattern application
- The 10 components are bounded; the brief covers each
- All architectural patterns are established (FrostedCard's API, `cn()` composition, per-type chrome conventions from 4.3–4.6)
- Brief covers all decisions and watch-fors explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC drops per-type chrome to fit FrostedCard's 3 variants (D2 violation)
- If CC migrates ComposerChooser's inner chooser cards to FrostedCard (W5 — those are buttons, not frosted cards)
- If CC breaks a dialog's form submission by overriding FrostedCard's `type='button'` default in the wrong place (W4)
- If CC updates visual regression baselines without manual review (W10)
- If CC migrates RoomSelector or CategoryFilterBar pills to FrostedCard (W15 — those are pills, not cards)
- If CC introduces a new dependency to 'help with the migration' (W12)
- If visual output changes (opacity, blur level, border color) before/after migration (W8)

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

The central verification concern: **visual parity before and after migration**. The user should not be able to tell anything changed. The internal markup changed; the rendered output should be identical (or near-identical, within 1-2 pixels of border opacity tolerance).

Verification surface:

1. **PrayerCard — per-type chrome preserved** across all 5 types:
   - `/prayer-wall` feed renders prayer_request cards with white wash, neutral border
   - Testimony cards render with amber wash, amber-tinted border, Sparkles icon
   - Question cards render with cyan wash, cyan-tinted border, HelpCircle icon, ResolvedBadge when resolved
   - Discussion cards render with violet wash, violet-tinted border, MessagesSquare icon, scripture chip when set
   - Encouragement cards render with rose wash, rose-tinted border, Heart icon, 24h expiry warning
   - Each card's WaysToHelpPills (if present, prayer_request only) renders below content
   - Per-type backdrop-blur level matches pre-migration (mobile vs desktop blur tier)
   - All hover states on interactive elements (reaction buttons, comment count) preserved

2. **QuestionOfTheDay** — featured Tier 1 card on Prayer Wall:
   - Renders with `variant="accent"` styling (violet accent wash, rounded-2xl, accent border)
   - Eyebrow line ('Question of the Day') with violet leading dot if D4 chooses to apply eyebrow
   - QotdBadge inline behavior preserved
   - Composer toggle button works
   - Scroll-to-responses action works

3. **CommentsSection** — nested below PrayerCard expanded view:
   - Renders with `variant="subdued"` styling (lighter background, less prominent than parent card)
   - Comment list rendering unchanged
   - Reply composer toggles unchanged
   - Loading state during fetch unchanged

4. **InlineComposer** — the per-type composer modal:
   - Composer panel renders with `variant="default"`
   - Per-type chrome (composerCopyByType chrome class) preserved INSIDE the FrostedCard wrapper
   - Submit button text per type unchanged
   - WaysToHelpPicker (prayer_request only) renders
   - Image upload affordance (testimony/question only) renders
   - Scripture reference field (discussion only) renders with debounced WEB loader
   - Anonymous toggle (where applicable) renders
   - Form submission still works (`type="submit"` on actual submit button preserved)

5. **ComposerChooser** — the modal that picks post type before opening InlineComposer:
   - Modal panel itself uses `<FrostedCard variant="default">` for the dialog shell
   - **The 5 inner type-cards remain as `<button>` elements with their own chrome — they are NOT migrated to FrostedCard** (W5)
   - Hero-to-chooser flow still works (auth-then-chooser per 4.7 D3)
   - Card selection still closes chooser and opens InlineComposer with correct postType

6. **AuthModal** — sign-in/sign-up dialog:
   - Modal panel uses `<FrostedCard variant="default">` for shell
   - Auth provider buttons (Google / email / etc.) inside the FrostedCard preserve their styling
   - Form submission works (login button has correct `type="submit"`)
   - Close affordance works

7. **ReportDialog** — report a post for moderation:
   - Modal panel uses `<FrostedCard variant="default">`
   - Report reason radio group renders correctly
   - Optional details textarea renders
   - Cancel button: `type="button"` (no form submit)
   - Submit Report button: `type="submit"` (triggers form)

8. **DeletePrayerDialog** — confirmation before destructive delete:
   - Modal panel uses `<FrostedCard variant="default">`
   - Confirmation copy renders correctly
   - **Destructive button uses `<Button variant="alertdialog">`** per design system canonical (NOT a FrostedCard concern; verify this is consistent)
   - Cancel button is `type="button"`

9. **MarkAsAnsweredForm** — question-specific resolution form:
   - Form panel uses `<FrostedCard variant="default">`
   - Resolution text input renders
   - Submit button still triggers atomic-resolve flow (from 4.4)

10. **SaveToPrayersForm** — save-to-personal-prayers flow:
    - Form panel uses `<FrostedCard variant="default">`
    - Personal prayer-list selection works
    - Submit still routes to saved-prayers API

11. **No inline frosted-card class strings remain in `frontend/src/components/prayer-wall/`**:
    - Grep `frontend/src/components/prayer-wall/` for `rounded-xl border border-white/.* bg-white/\[0\.06\].* backdrop-blur` returns ZERO matches
    - Per-type accent strings on PrayerCard remain (those are layered ON TOP via `className` prop)
    - Sticky wrapper on PrayerWall.tsx (Filter Bar) is NOT a card, NOT migrated
    - RoomSelector and CategoryFilterBar pills are NOT cards, NOT migrated

12. **No regression on existing functionality**:
    - All 5 post types still createable
    - QOTD, composer chooser, all dialogs all open and close
    - Comments, reactions, bookmarks still work
    - Keyboard accessibility on PrayerCard preserved (tabIndex, role, aria-label, onKeyDown)
    - Focus trap on modals preserved
    - Existing component tests pass without modification (or with minimal updates for new structure)

13. **Visual regression test pass**:
    - Playwright screenshot baselines re-generated AFTER manual visual review confirms parity
    - Baselines reviewed by Eric, not auto-accepted
    - CI runs visual regression against new baselines and passes

Minimum 13 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

Master plan body for 5.1 lives at `_forums_master_plan/round3-master-plan.md` lines ~4609–4637. Several drift items.

### MPD-1 — FrostedCard location is `homepage/`, NOT `ui/`

Master plan body says:

> Replace the inline `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-...` with `<FrostedCard>`...

It doesn't specify the import path. Recon confirms FrostedCard lives at:

```
frontend/src/components/homepage/FrostedCard.tsx
```

NOT `frontend/src/components/ui/FrostedCard.tsx` (where one might naively expect a shared UI component to live).

**Action for the planner:** import path is `import { FrostedCard } from '@/components/homepage/FrostedCard'`. The fact that the component lives under `homepage/` is a historical artifact (it was authored for the homepage redesign and never relocated). 5.1 does NOT relocate the file — that's scope creep. Just import from `homepage/`.

If a future spec consolidates shared UI primitives under `components/ui/`, that's its own concern.

### MPD-2 — FrostedCard has only 3 variants; PrayerCard has 5 per-type accents

Master plan body's AC says:

> All cards use `<FrostedCard>` with appropriate tier

Recon confirms FrostedCard has three variants: `'accent' | 'default' | 'subdued'`. PrayerCard renders 5 distinct per-type chromes (4.3–4.6 spec accumulation):

- prayer_request: white wash (existing default-ish)
- testimony: amber wash + amber border
- question: cyan wash + cyan border
- discussion: violet wash + violet border
- encouragement: rose wash + rose border

**The migration cannot map 5 per-type accents to 3 FrostedCard variants directly.** The pattern that preserves both is:

```tsx
<FrostedCard
  variant="default"
  className={cn(perTypeChromeClass(prayer.postType))}
  as="article"
  role="article"
  aria-label={...}
>
```

Where `perTypeChromeClass()` returns the per-type accent string (e.g., `'bg-rose-500/[0.04] border-rose-300/20'` for encouragement). FrostedCard's base `variant="default"` provides the frosted glass shell; the `className` prop layers the per-type accent on top.

This is D2's central decision. The brief explicitly resolves it because the master plan body's 'appropriate tier' phrasing leaves it ambiguous.

### MPD-3 — ComposerChooser inner type-cards are NOT FrostedCard candidates

Master plan body's Files-to-Modify list says:

> - `frontend/src/components/prayer-wall/ComposerChooser.tsx`

The ComposerChooser file has TWO distinct card-like surfaces:

1. **The chooser modal panel itself** — the outer container that holds the 5 cards. This IS migrated to `<FrostedCard variant="default">`.
2. **The 5 inner chooser cards** (one per post type) — these are `<button>` elements with their own chrome and icon styling per 4.7 D6/D7/D10. They are NOT FrostedCards — they're interactive selection buttons with tappable affordance.

**Action for the planner:** when migrating ComposerChooser, ONLY the modal shell migrates. The inner cards stay as `<button>` per 4.7's design.

If CC migrates the inner cards to FrostedCard, the chooser visually changes (heavier chrome, different padding, lose the per-type accent buttons), and 4.7 D6's design intent is broken.

### MPD-4 — 'Eyebrow' usage is opt-in, not required

Master plan body lists eyebrow as a canonical Phase 5 pattern but doesn't require every card to use it. 5.0 (now closed without ceremony) listed:

> Eyebrow + violet leading dot on Tier 1 cards via `<FrostedCard variant="accent" eyebrow="..." />`

Key word: **Tier 1**. PrayerCard is a Tier 2 / content card, not Tier 1. QuestionOfTheDay is the only Tier 1 candidate among 5.1's targets.

**Eyebrow usage decision per component:**

- QuestionOfTheDay: YES, eyebrow `'Question of the Day'` with `eyebrowColor="violet"` (D4)
- PrayerCard: NO eyebrow (Tier 2; has its own per-type chrome and icon header)
- CommentsSection: NO eyebrow (subdued; nested context)
- All modals/dialogs: NO eyebrow (their own header pattern)

If CC adds eyebrow to PrayerCard or the dialogs, reject — they're not Tier 1 cards.

### MPD-5 — Visual regression test infrastructure existence

Master plan body AC says:

> Visual regression tests pass (Playwright screenshots)

The project has Playwright tests (4.8 added the axe-core test infrastructure to `frontend/tests/playwright/`). Whether visual regression testing (screenshot diffing) is already wired is uncertain.

**Plan recon checks:**

- `frontend/tests/playwright/` for `*.spec.ts` files that take screenshots
- `frontend/playwright.config.ts` for screenshot/visual configuration
- Existence of baseline images directory (often `__screenshots__/` or `tests/visual/snapshots/`)
- Whether `@playwright/test`'s `toHaveScreenshot()` is in use

**Likely state:** screenshot infrastructure is partial or absent. 5.1 may need to establish baseline screenshots for the 10 migrated components. This adds scope: a one-time baseline-generation pass after migration is complete, with manual visual review.

If no screenshot infrastructure exists, the brief downgrades AC #13 to: 'Manual visual review by Eric before merging; future spec establishes automated visual regression.' Surface this as a follow-up.

### MPD-6 — Reconciliation report is the canonical Phase 5 patterns reference

5.0 was closed without producing a separate orientation doc. The canonical Phase 5 patterns reference is:

```
_plans/reconciliation/2026-05-07-post-rollout-audit.md
```

Plan recon should read this report's FrostedCard section for canonical variant usage, eyebrow conventions, and any Phase 5-relevant patterns the rest of the app already applies.

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-09)

Verified on disk at `/Users/eric.champlin/worship-room/`.

### R1 — FrostedCard component shape

`frontend/src/components/homepage/FrostedCard.tsx`:

```typescript
type FrostedCardVariant = 'accent' | 'default' | 'subdued'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article' | 'section'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
  variant?: FrostedCardVariant  // (verify default value; likely 'default')
  eyebrow?: string
  eyebrowColor?: 'violet' | 'white'
  type?: 'button' | 'submit' | 'reset'  // ONLY when as='button'; defaults to 'button'
  'aria-label'?: string
  'aria-labelledby'?: string
  style?: React.CSSProperties
}
```

Variant base classes (partial):
- `subdued`: `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-...`
- `default`: (verify in plan recon — likely `bg-white/[0.06]` or similar)
- `accent`: (verify in plan recon — likely violet-tinted: `bg-violet-500/[0.08] border-violet-400/70 rounded-2xl`)

Variant hover classes are separate (`hover: ...`) and only apply when `isInteractive` (i.e., onClick is provided).

Key API notes:
- `as` defaults to `'div'`
- `type` defaults to `'button'` (defensive against form submission — critical for dialog Cancel buttons)
- `isInteractive` is derived from `!!onClick` — hover styles auto-apply when card is clickable

### R2 — PrayerCard.tsx current per-type chrome pattern

`frontend/src/components/prayer-wall/PrayerCard.tsx` line ~78–90 has a switch:

```typescript
switch (prayer.postType) {
  case 'testimony':
    // returns chrome string with backdrop-blur, amber wash, amber border
  case 'question':
    // returns chrome string with backdrop-blur, cyan wash, cyan border
  case 'discussion':
    // returns chrome string with backdrop-blur, violet wash, violet border
  case 'encouragement':
    // returns chrome string with backdrop-blur, rose wash, rose border
  case 'prayer_request':
  default:
    // returns chrome string with backdrop-blur, white wash, neutral border
}
```

Plan recon reads the exact strings to verify the per-type accent classes are isolatable. The migration extracts these into a helper like `getPerTypeChromeClass(postType: PostType): string` that returns ONLY the accent-layer classes (background + border tint), NOT the base frosted glass classes (FrostedCard provides those).

### R3 — PrayerCard ARIA and interaction props

Plan recon verifies what PrayerCard currently does for keyboard/screen reader semantics:

- `role` attribute (likely `'article'` since each card is a discrete content item)
- `tabIndex` (likely `0` if cards are keyboard-navigable, or absent if pure read context)
- `aria-label` or `aria-labelledby` for accessible name
- `onKeyDown` for Enter/Space activation if cards are interactive

**FrostedCard's API supports all of these.** Migration preserves them via direct prop pass-through. If PrayerCard currently uses `tabIndex={0}` and `role='button'`, those props pass to FrostedCard. If PrayerCard uses `role='article'`, that passes too.

### R4 — The 10 components and their current frosted patterns

From master plan body's 'Files to modify' list (verify each in plan recon):

1. `PrayerCard.tsx` — per-type chrome switch (R2)
2. `QuestionOfTheDay.tsx` — Tier 1 featured card; likely uses an inline frosted pattern, candidate for `variant="accent"` + eyebrow
3. `CommentsSection.tsx` — nested container; subdued context
4. `InlineComposer.tsx` — the composer modal panel; per-type chrome layered on top of FrostedCard
5. `ComposerChooser.tsx` — modal shell only (inner cards stay as buttons per MPD-3)
6. `AuthModal.tsx` — dialog panel
7. `ReportDialog.tsx` — dialog panel
8. `DeletePrayerDialog.tsx` — alert dialog panel
9. `MarkAsAnsweredForm.tsx` — form panel
10. `SaveToPrayersForm.tsx` — form panel

Not all 10 components have identical inline frosted patterns; some may use shared utility classes, some may have custom Tailwind. Plan recon catalogs each.

### R5 — `cn()` className composition utility

`frontend/src/lib/utils.ts` exports the `cn()` function (likely a tailwind-merge wrapper). It's used throughout the codebase for conditional class composition.

The migration uses `cn()` to compose FrostedCard's `className` prop:

```tsx
<FrostedCard
  variant="default"
  className={cn(
    getPerTypeChromeClass(prayer.postType),
    isHighlighted && 'ring-2 ring-violet-400',
    className,  // pass-through from parent
  )}
>
```

If CC reimplements `cn()` inline, reject. Use the existing utility.

### R6 — Reconciliation report path

`_plans/reconciliation/2026-05-07-post-rollout-audit.md` exists per session memory. Plan recon should read its FrostedCard section to confirm canonical patterns match the brief's interpretation.

If the reconciliation report contradicts something in this brief, the report wins (it's the canonical source per 5.0's closure).

### R7 — Playwright test infrastructure post-4.8

4.8 added `frontend/tests/playwright/accessibility.spec.ts` and `frontend/tests/playwright/room-selector.spec.ts`. Plan recon verifies:

- `frontend/playwright.config.ts` configuration
- Whether `toHaveScreenshot()` calls exist anywhere
- Baseline screenshot directory location
- Whether visual regression is part of CI runs

If NO visual regression infrastructure exists, 5.1 either:
- (a) Establishes screenshot baselines as part of 5.1 scope (adds ~1–2 hours of setup + baseline generation)
- (b) Defers visual regression to a follow-up spec; 5.1 relies on manual visual review by Eric

**Recommendation: (b).** Visual regression infrastructure is its own concern; 5.1's primary deliverable is the migration. Manual visual review by Eric is sufficient for a refactor where the expected output is 'identical to before.'

### R8 — Existing component test files

Plan recon enumerates which of the 10 components have `__tests__/` test files:

- `PrayerCard.test.tsx` — almost certainly exists; updates needed for new structure
- `QuestionOfTheDay.test.tsx` — likely exists
- `CommentsSection.test.tsx` — likely exists
- `InlineComposer.test.tsx` — exists (per 4.3–4.6b briefs)
- `ComposerChooser.test.tsx` — exists (per 4.7 brief)
- `AuthModal.test.tsx` — likely exists
- `ReportDialog.test.tsx` — may exist
- `DeletePrayerDialog.test.tsx` — may exist
- `MarkAsAnsweredForm.test.tsx` — likely exists (per 4.4 brief)
- `SaveToPrayersForm.test.tsx` — may exist

**Test update strategy (D7):** existing tests SHOULD pass without modification because the component's rendered output and interactive behavior should be unchanged. If a test breaks during migration:

- If it asserts on the OLD inline class string → update the assertion to match the new FrostedCard-composed class string
- If it asserts on rendered output (text, role, aria) → should NOT break; if it does, the migration changed semantics, fix the migration
- If it asserts on internal markup (e.g., `expect(container.firstChild.tagName).toBe('DIV')`) → may need update if `as` prop changes

**Add one new test per migrated component:** assert that FrostedCard is in the rendered output (`expect(container.querySelector('[data-frosted-card]')` or similar, if FrostedCard exposes a test hook). If no test hook exists, skip this and rely on visual review.

### R9 — Per-type chrome class strings location

Plan recon identifies WHERE the per-type chrome classes are defined. Two possibilities:

- (a) Hardcoded inline in PrayerCard.tsx switch (most likely)
- (b) Exported from `frontend/src/constants/post-types.ts` or similar

**If (a):** 5.1 extracts the per-type classes into a helper function `getPerTypeChromeClass(postType: PostType): string` colocated in PrayerCard.tsx OR lifted to `frontend/src/constants/post-type-chrome.ts` (new file).

**If (b):** 5.1 uses the existing exported map directly; no new helper needed.

**Recommendation:** Lift to `frontend/src/constants/post-type-chrome.ts` as a new file. Reasons:

- Single source of truth for per-type accent classes
- Importable by RoomSelector pills (which also use per-type accents per 4.8 D3)
- Easier to update in future visual tweaks
- Matches the pattern of `post-types.ts` for type metadata

This adds 1 new file to 5.1's scope (and 1 new test file). Bounded.

### R10 — Skeleton component (PrayerWallSkeleton) is NOT in scope

The master plan body's Files-to-modify list does NOT include `frontend/src/components/skeletons/PrayerWallSkeleton.tsx`. Skeletons render before content loads; they're typically inline frosted patterns matching the card they replace.

**5.1 does NOT migrate skeletons.** Skeletons are a separate visual concern — they need to match the FrostedCard appearance closely enough to prevent layout shift, but updating them is a follow-up.

If a skeleton's inline pattern is noticeably different from the migrated FrostedCard, file a follow-up. Don't migrate it in 5.1.

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

5.1 is pure-frontend visual refactor. None of the Phase 3 backend gates apply.

| # | Gate | Applies to 5.1? |
| - | ---- | --- |
| 1-13 | All Phase 3 backend gates | N/A (no backend changes) |
| 17 | Universal Rule 17 axe-core (from 4.8) | Indirect — the migration must NOT introduce new accessibility violations. Re-run 4.8's axe-core tests after migration to confirm. |

**New addendum gate introduced by 5.1:**

**Gate 18: Visual parity gate.** Before/after manual visual review for each of the 10 migrated components. The user must not be able to tell the migration happened from the rendered UI alone. Brief explicitly resolves the per-type chrome preservation challenge (D2).

---

## 7. Decisions and divergences

### D1 — Variant assignment per component

Mapping of each migrated component to its FrostedCard variant:

| Component | Variant | Eyebrow | `as` | Rationale |
| --------- | ------- | ------- | ---- | --------- |
| PrayerCard | `default` | NO | `article` | Tier 2 content card; per-type chrome layered via className |
| QuestionOfTheDay | `accent` | YES (`Question of the Day`) | `article` | Tier 1 featured card on Prayer Wall |
| CommentsSection | `subdued` | NO | `section` | Nested low-key context |
| InlineComposer | `default` | NO | `div` | Form context; per-type chrome layered via className |
| ComposerChooser (modal shell only) | `default` | NO | `div` | Dialog shell; inner cards stay as buttons (MPD-3) |
| AuthModal | `default` | NO | `div` | Dialog panel |
| ReportDialog | `default` | NO | `div` | Dialog panel |
| DeletePrayerDialog | `default` | NO | `div` | Alert dialog panel |
| MarkAsAnsweredForm | `default` | NO | `div` | Form panel |
| SaveToPrayersForm | `default` | NO | `div` | Form panel |

**Why `as="article"` for PrayerCard and QuestionOfTheDay:** semantic HTML matters; each is a discrete content unit in the feed. `article` is the correct semantic element. Screen readers benefit.

**Why `as="section"` for CommentsSection:** it's a logical grouping inside a parent article, but not a standalone article itself. `section` fits.

**Why `as="div"` for dialogs and forms:** dialogs are not content articles; they're modal containers. `div` with appropriate ARIA (role='dialog', aria-labelledby, aria-modal) is right.

### D2 — Per-type chrome preservation via `className` prop

Per MPD-2. The migration pattern for PrayerCard and InlineComposer:

```tsx
<FrostedCard
  variant="default"
  className={cn(getPerTypeChromeClass(prayer.postType))}
  as="article"
  role="article"
  aria-label={prayer.postType === 'encouragement' ? 'Encouragement post' : 'Prayer post'}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {/* card content */}
</FrostedCard>
```

Where `getPerTypeChromeClass` returns ONLY the per-type accent layer:

```typescript
// frontend/src/constants/post-type-chrome.ts (new file)
import type { PostType } from '@/constants/post-types'

const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',  // baseline; no override
  testimony: 'bg-amber-500/[0.04] border-amber-300/20',
  question: 'bg-cyan-500/[0.04] border-cyan-300/20',
  discussion: 'bg-violet-500/[0.04] border-violet-300/20',
  encouragement: 'bg-rose-500/[0.04] border-rose-300/20',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
```

The exact opacity values and border colors come from plan recon of the current PrayerCard switch — the example above is illustrative; do NOT change opacity values during migration.

### D3 — New constants file `post-type-chrome.ts`

Per R9. Lift the per-type chrome to `frontend/src/constants/post-type-chrome.ts`. Reasons:

- Single source of truth
- RoomSelector pills (4.8 D3) can also import from this file if not already
- Future visual tweaks happen in one place
- Matches `post-types.ts` and `ways-to-help.ts` pattern

The file exports:
- `PER_TYPE_CHROME` (typed Record)
- `getPerTypeChromeClass(postType: PostType): string` (helper)
- Optionally `getPerTypePillAccent(postType)` if RoomSelector's per-pill accent isn't already centralized (4.8 may have already lifted this)

### D4 — Eyebrow usage: QuestionOfTheDay only

Per MPD-4. Among the 10 migrated components, only QuestionOfTheDay is Tier 1 (featured card on Prayer Wall). It uses:

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

No other component gets eyebrow in 5.1. If future specs add Tier 1 surfaces (e.g., featured testimony of the week), they'd add eyebrow then.

### D5 — Form submission safety: `type` prop discipline

FrostedCard's `type` prop defaults to `'button'` (W4). This is a safety against forms accidentally submitting when an interactive FrostedCard is clicked.

**5.1's dialogs have ACTUAL submit buttons inside FrostedCard.** Those `<button type="submit">` elements are NOT FrostedCard themselves — they're regular buttons inside FrostedCard's children.

**Migration pattern for dialog forms:**

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

The FrostedCard itself is NOT `as="button"`, so its `type` prop is irrelevant. The form's submit button is a regular `<Button>` with explicit `type="submit"`.

**Watch-for (W4):** if a dialog accidentally renders FrostedCard with `as="button"` and the inner Submit button is `type="submit"`, the click bubbles and may double-fire submission. The brief enforces: FrostedCard `as="div"` for all dialog shells; submit buttons are regular `<Button>` elements.

### D6 — Hover state preservation

FrostedCard auto-applies hover styles when `onClick` is provided (`isInteractive` derived from `!!onClick`). For PrayerCard:

- If PrayerCard's outer wrapper currently has `onClick` (e.g., to expand or navigate), FrostedCard's hover styles auto-apply
- If PrayerCard's outer is NOT interactive (pure read context), no hover styles apply
- Per-type accent in `className` layer should NOT include hover variants — FrostedCard handles that

If existing PrayerCard hover styles differ from FrostedCard's auto-applied hover, surface the divergence:

- If they're visually equivalent: trust FrostedCard, drop the custom hover
- If they differ visually (e.g., per-type hover tint): layer the per-type hover via `className` like `hover:bg-rose-500/[0.06]`

Plan recon catalogs current hover behavior per component.

### D7 — Test update strategy

Per R8. Existing tests should largely pass unchanged. The exceptions:

- Tests asserting on OLD inline class strings (e.g., `expect(container.firstChild.className).toContain('rounded-xl')`) need updates because the inline classes are gone; the new classes come from FrostedCard's variant
- Tests asserting on tag name (if `as` changed from `div` to `article`) need updates
- Tests asserting on rendered TEXT / interactive behavior — should NOT need changes

**Adding NEW tests per component is NOT required.** The migration is a refactor with expected visual parity; existing tests cover behavior. New tests would just assert on internal FrostedCard usage, which doesn't add coverage.

Exception: if FrostedCard exposes a `data-testid` or similar test hook, add one assertion per migrated component that the FrostedCard is in the rendered tree. This is small (1 line per test file) and provides confidence the migration happened.

### D8 — Migration order (recommended)

Migrate from simplest to most complex. Each migration is its own logical commit (Eric handles git manually):

1. **SaveToPrayersForm** (simplest — form panel, no per-type chrome)
2. **MarkAsAnsweredForm** (similar)
3. **DeletePrayerDialog** (alert dialog — watch the destructive button pattern)
4. **ReportDialog** (form with radio group)
5. **AuthModal** (form with provider buttons)
6. **CommentsSection** (subdued variant; nested context)
7. **ComposerChooser** (modal shell only; preserve inner cards per MPD-3)
8. **InlineComposer** (per-type chrome integration; complex)
9. **QuestionOfTheDay** (accent variant + eyebrow)
10. **PrayerCard** (most complex — 5 per-type accents)

Why this order: dialogs are simpler than feed cards. PrayerCard last because the per-type chrome extraction (D3's new constants file) benefits from doing dialogs first and accumulating muscle memory.

If CC migrates in a different order, that's fine — but each component's migration commits independently for easier rollback if visual regression appears.

### D9 — NO visual regression test setup in 5.1

Per R7 / MPD-5. 5.1 does NOT establish Playwright screenshot baseline infrastructure.

AC #13 downgrades to: **'Manual visual review by Eric: every page route renders identically to pre-migration.'**

Follow-up filing: a future spec establishes `@playwright/test`'s screenshot testing with baselines, integrates into CI. Not 5.1.

If during execution CC finds existing screenshot infrastructure is already wired and just needs new baselines, that's acceptable — capture baselines as part of 5.1's deliverable. But don't establish new infrastructure.

### D10 — NO migration of skeletons, RoomSelector, CategoryFilterBar

Per R10, W15. The following are explicitly OUT of 5.1's scope:

- `PrayerWallSkeleton.tsx` and any other skeleton components
- `RoomSelector.tsx` pills
- `CategoryFilterBar.tsx` pills
- The Filter Bar sticky wrapper on PrayerWall.tsx
- Any non-card visual elements (badges, chips, pills)

If CC migrates any of these, reject. They're not 'cards' in the design system sense; FrostedCard is wrong for them.

<!-- CHUNK_BOUNDARY_4 -->

---

## 8. Watch-fors

### W1 — Phase 4 must be complete

Verify spec-tracker.md shows 4.1–4.8 all ✅. Phase 5 prereq is 'Phase 4 complete' per master plan.

### W2 — Don't drop per-type chrome to fit FrostedCard's 3 variants

Per MPD-2 / D2. The 5 per-type accents (rose / amber / cyan / violet / white) MUST survive migration. If CC says 'FrostedCard only has 3 variants so I picked the closest one for each type' — reject. The `className` prop is the bridge.

### W3 — Don't drop tabIndex / role / aria / onKeyDown on PrayerCard

FrostedCard's API supports all of these. Migration is direct prop pass-through. If PrayerCard's outer wrapper has `tabIndex={0}` and `role='button'` (or `role='article'`), those props go to FrostedCard, not dropped.

### W4 — Don't break form submission via FrostedCard's `type='button'` default

Per D5. FrostedCard's `type` defaults to `'button'`, but this is only relevant when `as="button"`. For dialog forms with submit buttons:

- FrostedCard outer = `as="div"` (its `type` prop is irrelevant)
- Inner submit button = regular `<Button type="submit">` (NOT a FrostedCard)

If CC sets FrostedCard `as="button"` AND there's a form submit button inside, the click handling may misbehave.

### W5 — Don't migrate ComposerChooser's inner type-cards to FrostedCard

Per MPD-3. ONLY the outer modal shell migrates. The 5 inner type-selection buttons stay as `<button>` per 4.7 D6/D7.

If CC migrates the inner cards, the chooser changes appearance (heavier chrome, different padding, loses per-type accent buttons) — breaks 4.7's design.

### W6 — Don't relocate FrostedCard from `homepage/` to `ui/`

Per MPD-1. 5.1 imports FrostedCard from `@/components/homepage/FrostedCard`. Relocating the file is scope creep.

### W7 — Don't preempt Spec 5.3 (2-line heading) or 5.4 (animation tokens)

5.3 applies the 2-line heading treatment to PrayerWallHero and dashboard headers. 5.4 migrates hardcoded animation durations to imports from `constants/animation.ts`. Neither is 5.1's job.

If CC notices a hardcoded `200ms` transition during 5.1 migration and 'fixes it along the way', reject. Stay scoped.

If CC notices a heading that could use the 2-line treatment, reject. Stay scoped.

### W8 — Don't change visual output before/after migration

This is a refactor, not a redesign. The rendered UI MUST look identical (within 1-2 px tolerance on border opacity).

If CC 'cleans up' opacity values (`bg-rose-500/[0.04]` → `bg-rose-500/5`), reject. Even if the new value is visually identical, the migration's primary contract is parity.

Future visual tweaks happen in their own specs.

### W9 — Don't lose the `subdued` variant for CommentsSection

Per D1. CommentsSection is nested context; `variant="subdued"` is correct. Standard tier sometimes ships `variant="default"` for everything, losing the visual hierarchy.

### W10 — Don't update visual regression baselines without manual review

If screenshot baselines exist (R7), regenerating them blindly hides regressions. Manual visual diff first, then regenerate baselines only after confirming parity.

### W11 — Don't preempt skeleton migration

Per D10 / R10. Skeletons are NOT in 5.1 scope. They render before content loads and may visually drift from FrostedCard appearance after migration — file a follow-up if so, don't migrate in 5.1.

### W12 — Don't introduce new dependencies

5.1 is pure refactor using an existing component. No new npm packages. No new utility libraries. Reject 'I added clsx for class composition' — `cn()` already exists.

### W13 — Don't reimplement `cn()` inline

Per R5. The `cn()` utility from `@/lib/utils` is the canonical composition helper. Use it.

### W14 — Don't change component public APIs

Migrating component internals does NOT change public-facing props. If `PrayerCard` exposes `<PrayerCard prayer={p} onReact={...} />`, those props stay. The internal markup changes; the external contract doesn't.

If CC adds new props or removes existing ones during migration, reject — scope creep.

### W15 — Don't migrate RoomSelector or CategoryFilterBar pills

Per D10. Pills are not cards. They have their own visual pattern (rounded-full, smaller padding, per-type accent via inline classes from 4.8 D3). FrostedCard is wrong for them.

### W16 — Don't break mobile blur level

FrostedCard's variants include responsive backdrop-blur (e.g., `backdrop-blur-sm md:backdrop-blur-md` in `subdued`). The migration preserves the mobile vs desktop blur tier. Don't 'simplify' to a single blur level — the responsive tier is intentional for performance.

### W17 — Don't lose existing accessibility tree

If PrayerCard currently has `role='article'`, FrostedCard's `role` prop must receive it. Same for `aria-label`, `aria-labelledby`.

Axe-core test (Universal Rule 17 from 4.8) re-runs after migration to confirm zero violations.

### W18 — Don't introduce new test-id values

If existing tests use `data-testid='prayer-card'`, the migrated component keeps the same `data-testid`. Don't rename to `data-testid='frosted-prayer-card'` or similar — it breaks test selectors.

If FrostedCard exposes its own `data-testid`, it's additive, not a replacement.

### W19 — Don't migrate PrayerWallSkeleton

Explicit per R10. Skeleton is in `frontend/src/components/skeletons/`, not `prayer-wall/`. It's NOT in master plan's Files-to-modify list.

### W20 — Don't introduce new TypeScript errors

FrostedCard's prop types may not match existing inline div's `React.HTMLAttributes<HTMLDivElement>` exactly. For example, FrostedCard's `onClick` is `() => void`, not `(e: MouseEvent) => void`. If the migrated component needs the event object, refactor accordingly (extract handler that ignores event, or accept the API constraint).

If CC bypasses with `as any`, reject.

### W21 — Don't break focus management on dialogs

Dialog components (AuthModal, ReportDialog, DeletePrayerDialog) likely have focus-trap logic. The FrostedCard `as="div"` wrapper should NOT interfere with focus management. Plan recon verifies focus-trap library usage (likely `focus-trap-react` per 4.7's brief).

### W22 — Don't break Phase 5 prerequisite chain for 5.3, 5.4, 5.5

5.3 (2-line heading) depends on 5.1 / 5.2 being done. 5.4 depends on 5.3. 5.5 depends on 5.4. Don't ship 5.1 with structural changes that complicate 5.3 (e.g., extracting heading into a separate sub-component that 5.3 then has to undo).

The 2-line heading treatment (5.3) is applied to PrayerWallHero and dashboard section headers. PrayerWallHero is NOT in 5.1's scope; it's already shipped via Spec 14 cinematic hero rollout. So 5.1 doesn't touch headings.

### W23 — Don't lose the existing pre-Phase-5 visual regression baselines (if any)

If the project DOES have screenshot baselines from before 5.1, they'll all fail after migration (because visual output is intended to be IDENTICAL, but in practice 1-2 pixel differences happen). Plan recon verifies whether baselines exist; if so, plan an explicit baseline-regeneration step AFTER manual visual review confirms parity.

### W24 — Don't migrate UI in unrelated directories

The migration is scoped to `frontend/src/components/prayer-wall/`. If there are inline frosted patterns in `frontend/src/pages/` (e.g., PrayerWallDashboard's per-card chrome), those are NOT in 5.1's scope. File follow-up.

<!-- CHUNK_BOUNDARY_5 -->

---

## 9. Test specifications

Target: ~15 tests (mostly updates to existing tests; the migration is a refactor with expected behavioral parity).

### Frontend tests

**`frontend/src/constants/__tests__/post-type-chrome.test.ts`** (NEW — ~3 tests):

- All 5 post types have an entry in PER_TYPE_CHROME
- `getPerTypeChromeClass('encouragement')` returns the rose accent string
- `getPerTypeChromeClass('prayer_request')` returns the baseline (empty string or default)

**Per-component tests** (UPDATE existing — likely ~10 total small updates):

- `PrayerCard.test.tsx`: update class-string assertions to check for FrostedCard composition; verify per-type chrome still applies; verify role/aria/tabIndex preservation
- `QuestionOfTheDay.test.tsx`: verify FrostedCard accent variant; verify eyebrow renders with 'Question of the Day' text
- `CommentsSection.test.tsx`: verify FrostedCard subdued variant
- `InlineComposer.test.tsx`: verify FrostedCard default variant; verify per-type chrome layered correctly
- `ComposerChooser.test.tsx`: verify modal shell uses FrostedCard; verify inner type-cards remain as `<button>` (W5 enforcement)
- `AuthModal.test.tsx`: verify FrostedCard default variant; verify form submit still works
- `ReportDialog.test.tsx`: verify FrostedCard default variant; verify Cancel is `type='button'` and Submit is `type='submit'`
- `DeletePrayerDialog.test.tsx`: verify FrostedCard default variant; verify destructive button still uses `<Button variant='alertdialog'>`
- `MarkAsAnsweredForm.test.tsx`: verify FrostedCard default variant; verify atomic-resolve flow still works
- `SaveToPrayersForm.test.tsx`: verify FrostedCard default variant

**`frontend/tests/playwright/accessibility.spec.ts`** (UPDATE — 0 new tests; re-run existing 4.8 axe-core tests after migration to confirm no regressions):

No new test code; just verify the existing axe-core scans on `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health` still pass with the migrated components.

### Total test budget

- post-type-chrome.test.ts: ~3 new
- 10 component test files: ~10 small updates (assertions on class strings, role, aria, type)
- Playwright axe-core: 0 new (existing tests re-run as regression check)

**Total: ~3 new + ~10 updates.** Migration is a refactor; new test coverage is minimal because existing tests cover behavior.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/constants/post-type-chrome.ts` — NEW per-type accent class lookup (D3)
- `frontend/src/constants/__tests__/post-type-chrome.test.ts` — ~3 tests

### Files to Modify

**Frontend (the 10 migration targets per master plan body):**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — migrate outer wrapper to FrostedCard; extract per-type chrome to import from `post-type-chrome.ts`
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — migrate to FrostedCard with `variant='accent'` and eyebrow
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — migrate to FrostedCard with `variant='subdued'`
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — migrate to FrostedCard with `variant='default'`; per-type chrome via className (composerCopyByType pattern preserved)
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — migrate ONLY outer modal shell; inner chooser cards stay as `<button>` (W5)
- `frontend/src/components/prayer-wall/AuthModal.tsx` — migrate modal panel to FrostedCard
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — migrate dialog panel to FrostedCard
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — migrate dialog panel to FrostedCard
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` — migrate form panel to FrostedCard
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` — migrate form panel to FrostedCard

**Per-component test files** — update class-string assertions per D7 (~10 small updates).

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 5.1 from ⬜ to ✅ AFTER successful merge AND manual visual review

### Files NOT to Modify

- `frontend/src/components/homepage/FrostedCard.tsx` — component unchanged; 5.1 is a consumer, not a maintainer
- `frontend/src/components/skeletons/PrayerWallSkeleton.tsx` — W19; out of scope
- `frontend/src/components/prayer-wall/RoomSelector.tsx` — W15; pill pattern, not card
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — W15; pill pattern, not card
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — not a card; not in scope
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — already shipped via Spec 14 cinematic hero; not in scope (W22)
- `frontend/src/pages/PrayerWall.tsx` — page layout file; not a card; not in scope (W24)
- `frontend/src/pages/PrayerWallDashboard.tsx` — W24; if it has inline frosted patterns, file follow-up
- `frontend/src/pages/PrayerDetail.tsx` — same as above
- `frontend/src/pages/PrayerWallProfile.tsx` — same as above
- All backend files — pure frontend spec

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Migration completeness:**

- [ ] All 10 listed components migrated to use `<FrostedCard>`
- [ ] Each component uses the correct variant per D1
- [ ] QuestionOfTheDay has eyebrow `'Question of the Day'` with `eyebrowColor='violet'`
- [ ] PrayerCard has `as='article'`, preserves tabIndex/role/aria/onKeyDown
- [ ] PrayerCard's per-type chrome (rose / amber / cyan / violet / white) preserved via `className`
- [ ] InlineComposer's per-type chrome preserved via `className`
- [ ] ComposerChooser's inner type-cards remain as `<button>` (NOT migrated)
- [ ] Dialog/form components use `as='div'` with appropriate `role` and `aria-labelledby`
- [ ] Form submit buttons inside dialogs are regular `<Button type='submit'>`, NOT FrostedCard with type='submit'

**Visual parity:**

- [ ] Manual visual review by Eric: every page route renders identically to pre-migration
- [ ] No opacity 'cleanup' or 'normalization' (W8)
- [ ] Mobile blur level preserved (W16)
- [ ] Hover states preserved or equivalent

**No inline frosted patterns remain:**

- [ ] Grep `frontend/src/components/prayer-wall/` for `rounded-xl border border-white/.* bg-white/\[0\.06\].* backdrop-blur` returns ZERO matches
- [ ] Per-type accent strings remain ONLY in `post-type-chrome.ts` and (layered on) FrostedCard via className

**New constants file:**

- [ ] `frontend/src/constants/post-type-chrome.ts` created
- [ ] All 5 post types have entries
- [ ] `getPerTypeChromeClass()` helper exported
- [ ] 3 tests pass

**Test updates:**

- [ ] ~10 component test files have class-string assertions updated
- [ ] All existing tests pass (behavior unchanged)
- [ ] No new TypeScript errors
- [ ] No `as any` bypasses (W20)

**No regressions:**

- [ ] All 5 post types still createable via composer chooser
- [ ] QOTD, all dialogs still open and close
- [ ] Comments, reactions, bookmarks unchanged
- [ ] Keyboard accessibility on PrayerCard preserved
- [ ] Focus trap on modals preserved
- [ ] Universal Rule 17 axe-core tests (from 4.8) re-run and pass with zero violations

**Out of scope verification:**

- [ ] PrayerWallSkeleton NOT migrated
- [ ] RoomSelector pills NOT migrated
- [ ] CategoryFilterBar pills NOT migrated
- [ ] PrayerWallHero NOT touched (already shipped via Spec 14)
- [ ] No new dependencies introduced
- [ ] No component public APIs changed
- [ ] No opacity 'cleanup'

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 5.1 row flipped from ⬜ to ✅ AFTER manual visual review confirms parity

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 5.1:

- **PrayerWallSkeleton migration** — W19; follow-up if visual drift
- **RoomSelector pill migration** — W15; pills are not cards
- **CategoryFilterBar pill migration** — W15
- **PrayerWallHero touch** — already shipped via Spec 14 (W22)
- **PrayerWallDashboard / PrayerDetail / PrayerWallProfile inline patterns** — W24; follow-up
- **2-line heading treatment** — Spec 5.3 (W7)
- **Animation token migration** — Spec 5.4 (W7)
- **Visual regression test infrastructure** — D9; follow-up spec
- **Opacity 'cleanup' or color normalization** — W8
- **Relocating FrostedCard from `homepage/` to `ui/`** — W6
- **Adding new variants to FrostedCard** — Phase 5 doesn't change FrostedCard's API
- **Refactoring `cn()` utility** — W13
- **Changing component public APIs** — W14
- **Per-pill chrome migration in RoomSelector** — W15
- **Touch event handling changes on FrostedCard** — trust FrostedCard's implementation
- **Color contrast adjustments** — if axe-core tests pass, contrast is fine; if they fail, fix is part of 5.1, but don't tune contrast 'preventively'
- **New shared utility components** — use what exists
- **Storybook stories for FrostedCard variants** — not in Phase 5
- **Documentation updates beyond Files-to-modify** — 5.1 is code refactor; design system docs are 5.5

---

## 13. Brand voice quick reference

5.1 is a pure visual refactor; no new copy is introduced. Brand voice concerns are limited to:

**QuestionOfTheDay eyebrow text:** `'Question of the Day'` — plain, lowercase-the, no emoji, no decoration. If the existing QOTD has different copy ('Today's Question', '✨ Question of the Day'), the brief enforces the canonical 'Question of the Day' phrasing (matches the post-rollout audit).

**Dialog headings** (within FrostedCard children, NOT new copy): existing copy stays. 'Report this post', 'Delete prayer?', 'Mark as answered' — unchanged.

**No anti-patterns expected in 5.1** because no new copy is introduced. If CC drifts (e.g., 'Featured Question ✨' eyebrow), reject.

---

## 14. Tier rationale

Run at **High**. Justifications:

**Why not Standard:**

- Per-type chrome preservation (D2 / MPD-2) is the central design challenge; Standard tier sometimes drops to FrostedCard's 3 variants
- 10 components touched is enough surface for one to be missed
- Form submission safety via `type` prop (D5 / W4) is subtle; Standard tier sometimes overrides incorrectly
- ComposerChooser inner-cards exception (W5) requires careful migration scope
- ARIA/tabIndex/role pass-through (W3 / W17) is critical for keyboard accessibility
- Visual parity gate (Gate 18) is an objective standard; Standard tier sometimes 'cleans up' opacity

**Why not xHigh:**

- No new component creation
- No schema, no backend, no novel coordination
- All architectural patterns established (FrostedCard, cn(), per-type chrome conventions)
- 10 components is bounded; brief covers each
- The brief covers all 24 watch-fors and 10 decisions explicitly

**Override moments — when to bump to MAX:**

- If CC drops per-type chrome (D2 / W2)
- If CC migrates ComposerChooser's inner cards (W5)
- If CC breaks form submission (D5 / W4)
- If CC changes visual output (W8)
- If CC migrates skeletons, pills, or out-of-scope components (W11, W15, W19, W24)
- If CC introduces new dependencies (W12)
- If CC changes component public APIs (W14)
- If axe-core tests fail (W17)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-5-1`:

```
/spec-forums spec-5-1

Write a spec for Phase 5.1: FrostedCard Migration. Read /Users/eric.champlin/worship-room/_plans/forums/spec-5-1-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: High.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

This is the first real Phase 5 spec. 5.0 was closed without ceremony; the reconciliation report at `_plans/reconciliation/2026-05-07-post-rollout-audit.md` is the canonical patterns reference.

Prerequisites:
- ALL Phase 4 specs (4.1–4.8) must be ✅ in spec-tracker.md
- If any are still ⬜, STOP. Don't proceed.

Recon checklist (re-verify on disk before starting; brief recon was on date 2026-05-09):

1. `frontend/src/components/homepage/FrostedCard.tsx` — confirm component API (variants, props, defaults); confirm `accent` and `default` variant base classes
2. `frontend/src/components/prayer-wall/PrayerCard.tsx` lines ~78–90 — read the exact per-type chrome switch; extract opacity values and border colors for `post-type-chrome.ts`
3. Each of the 10 components in Files-to-modify — catalog current inline frosted pattern and identify variant + className strategy
4. `frontend/src/lib/utils.ts` — confirm `cn()` utility exists; verify import path
5. `_plans/reconciliation/2026-05-07-post-rollout-audit.md` — read FrostedCard section; confirm brief's interpretation matches
6. `frontend/src/constants/post-types.ts` — confirm PostType union type for new constants file's import
7. `frontend/playwright.config.ts` + `frontend/tests/playwright/` — check for existing screenshot baseline infrastructure (R7 / D9)
8. Existing component test files — enumerate which exist; plan class-string assertion updates
9. Universal Rule 17 axe-core test from 4.8 — confirm tests at `frontend/tests/playwright/accessibility.spec.ts`; plan to re-run as regression check
10. Focus-trap library usage in dialogs (likely `focus-trap-react` per 4.7 brief) — confirm preservation strategy

Spec output structure:

- Title and metadata (size L, risk Medium, prerequisites Phase 4 complete, branch forums-wave-continued)
- Goal — Migrate 10 Prayer Wall components from inline frosted patterns to `<FrostedCard>` while preserving per-type chrome (rose / amber / cyan / violet / white) via className layer
- Approach — Existing FrostedCard at `components/homepage/`; map each component to variant per D1; extract per-type chrome to new `post-type-chrome.ts`; preserve all ARIA/tabIndex/role/onKeyDown via prop pass-through; ComposerChooser shell only (inner cards stay as buttons); dialog submit buttons stay as regular `<Button type='submit'>` not FrostedCard
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~3 new + ~10 updates)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - FrostedCard lives at `components/homepage/`, not `components/ui/` (MPD-1)
  - Per-type chrome preserved via className prop (MPD-2 / D2 — central design decision)
  - ComposerChooser inner cards stay as buttons (MPD-3 / W5)
  - Eyebrow only on QuestionOfTheDay (MPD-4 / D4)
  - No visual regression infrastructure setup (MPD-5 / D9); manual review by Eric
  - Reconciliation report is canonical (MPD-6)
  - Migration order: dialogs first, PrayerCard last (D8)
  - All 24 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge AND manual visual review confirms parity.
- Eric handles all git operations manually.
- This is a pure refactor; visual output must be IDENTICAL before/after.
- No new dependencies, no API changes, no scope creep into 5.3 / 5.4 territory.
- Per-type chrome preservation is the central design decision; FrostedCard's `className` prop is the bridge.

After writing the spec, run /plan-forums spec-5-1 with the same tier (High).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-5-1
```

The verifier exercises Section 3's 13 visual scenarios. Verifier writes to `_plans/forums/spec-5-1-verify-report.md`.

If verification flags any of:
- Per-type chrome lost or changed (D2 / W2 / W8)
- Visual output differs from pre-migration (W8)
- ComposerChooser inner cards migrated (W5)
- Form submission broken (D5 / W4)
- PrayerCard accessibility tree changed (W3 / W17)
- Skeletons, pills, or out-of-scope components migrated (W11, W15, W19)
- New dependencies introduced (W12)
- axe-core tests fail (Universal Rule 17 / W17)
- Component public APIs changed (W14)

Abort and bump to MAX. Those are the canonical override moments.

**Manual visual review by Eric is required before merge.** Verifier produces side-by-side screenshots of each migrated component (pre-migration baseline vs post-migration); Eric confirms parity.

If any visual divergence is intentional (e.g., FrostedCard's hover style is slightly different from current PrayerCard hover), document the divergence in the verify report and Eric approves explicitly.

---

## Prerequisites confirmed (as of 2026-05-09 brief authorship)

- ✅ Phase 4 complete (4.1–4.8 all ✅ per spec-tracker)
- ✅ FrostedCard exists at `frontend/src/components/homepage/FrostedCard.tsx` (R1)
- ✅ FrostedCard has 3 variants: `accent`, `default`, `subdued` (R1)
- ✅ FrostedCard supports `as`, `eyebrow`, `eyebrowColor`, `tabIndex`, `role`, `onKeyDown`, `aria-label`, `aria-labelledby`, `className`, `type` (R1)
- ✅ PrayerCard has per-type chrome switch at ~line 78–90 (R2)
- ✅ 5 per-type accents (rose / amber / cyan / violet / white) need preservation
- ✅ ComposerChooser shipped in 4.7; inner cards are `<button>` elements (R5 / W5)
- ✅ `cn()` utility exists at `frontend/src/lib/utils.ts` (R5)
- ✅ Universal Rule 17 axe-core test infrastructure shipped in 4.8 (R7)
- ✅ Reconciliation report at `_plans/reconciliation/2026-05-07-post-rollout-audit.md` (R6)
- ⬜ Visual regression screenshot infrastructure — likely absent; plan recon confirms (R7 / D9 — follow-up if needed)
- ⬜ Per-component test class-string assertions — need updates per D7 (~10 small changes)

**Brief authored:** 2026-05-09, on Eric's work laptop. First real Phase 5 brief (5.0 closed without ceremony; 5.2 shipped via Spec 14). Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b, 4.8 briefs. The Phase 5 visual migration begins here — after 5.1 ships, the remaining Phase 5 specs (5.3 2-line heading, 5.4 animation tokens, 5.5 deprecated pattern purge, 5.6 Redis cache foundation) follow in sequence. 5.6 is tonally different (infrastructure spec, not visual); will warrant its own brief-planning session.

The master plan re-review pass (60–90 min Claude Desktop session, targeted patches, bump to v3.0) remains deferred. Earliest natural moment is between 5.4 and 5.5, or after Phase 5 closes entirely. Not blocking.

**End of brief.**
