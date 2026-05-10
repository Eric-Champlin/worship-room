# Forums Wave: Spec 4.7 — Composer Chooser

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 4.7 (round3-phase04-spec07-composer-chooser)
**Branch:** `forums-wave-continued` (long-lived working branch — DO NOT create per-spec sub-branches)
**Date:** 2026-05-09

---

## Affected Frontend Routes

- `/prayer-wall` (authenticated — hero button opens ComposerChooser; empty-state-page CTA when feed empty)
- `/prayer-wall` (unauthenticated — hero button opens AuthModal; chooser never rendered to unauth users)
- `/prayer-wall?category=<category>` (category-empty-state CTA when filter has no posts)
- Legacy `/prayer-wall?debug-post-type=testimony|question|discussion|encouragement` URLs — query param now silently ignored (shim REMOVED)

No new routes created; no route redirects added; no SEO/JSON-LD changes.

---
# Spec 4.7 — Composer Chooser

**Master plan ID:** `round3-phase04-spec07-composer-chooser`
**Size:** L
**Risk:** Medium (no schema changes, no new backend surface, but four production entry points to rewire + a new modal pattern + brand-voice-sensitive copy on a high-traffic UI)
**Prerequisites:** 4.6b (Image Upload). The per-type composer infrastructure is fully realized after 4.6b ships, including the testimony/question image-upload affordance integration. 4.7 is the surfacing layer that makes all 5 post types reachable through a single UX entry.
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

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

---

## 2. Tier — xHigh

No schema changes. No new backend module. No external storage. The L sizing comes from breadth, not depth: four production entry points to rewire + a new modal/sheet component with mobile and desktop variants + auth flow preservation + first-time tooltip preservation + brand-voice-sensitive copy decisions across the five post-type cards + removal of the `?debug-post-type` shim that's been load-bearing for /verify-with-playwright in 4.3-4.6b.

**Why xHigh (not Standard):**

- Four entry points to rewire (hero button auth path, hero button unauth path, empty-state-page CTA, category-empty-state CTA) and one to remove (debug query param shim per the explicit `REMOVE-IN-4.7` code comment). Standard tier consistently misses one.
- The auth gate timing (D3) has two valid choices and the brief locks one in; if CC second-guesses, the auth flow regresses.
- The TooltipCallout for first-time composer use is targeted at `composerRef` (R8). 4.7's rewire must preserve this, or new users lose the onboarding hint.
- The 'open chooser, then open InlineComposer' two-state-change is a small but real coordination problem (W11). Standard tier sometimes ships a flicker where both modals are briefly visible.
- Mobile bottom-sheet vs desktop centered-modal is a responsive concern that needs careful breakpoint handling. Different UX libraries solve this differently; the brief leaves the implementation to plan-time recon (D14) but flags the trap door.
- Brand voice on the chooser cards is high-stakes — first impression of all 5 post types as a SET. Anti-patterns (cheerleader voice, jargon, comparison) are easy to slip in.

**Why not MAX:**

- Pure frontend. No backend changes, no schema, no migration.
- The InlineComposer's API is unchanged — 4.7 just changes WHO opens it with WHAT postType.
- Per-type metadata (icon, label, description, color) is already in place from 4.3-4.6.
- Auth modal flow is preserved, not redesigned.
- The post-types.ts source-of-truth pattern is established; 4.7 reads it, doesn't extend it (assuming descriptions exist per MPD-3).

**Override moments — when to bump to MAX:**

- If CC keeps the `?debug-post-type` shim 'for migration safety' (per W3, that comment is the spec; remove it)
- If CC introduces a FAB despite the brief saying not to (W2; current code has hero button)
- If CC's modal implementation has a flicker between chooser-close and composer-open (W11)
- If CC orphans the TooltipCallout target (W5)
- If CC adds a 'remember my last choice' preference (W12)
- If CC tries to render the chooser as a separate route (`/prayer-wall/compose`) instead of a modal (architectural drift)

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **Hero button (authenticated)** at `/prayer-wall`:
   - Button label reads 'Share something' (or whatever D1 settles on)
   - Tapping opens the ComposerChooser, NOT the InlineComposer
   - The InlineComposer does NOT open until a card is selected
   - composerRef still points at this button (TooltipCallout works)

2. **Hero button (unauthenticated)** at `/prayer-wall`:
   - Button visible with same label
   - Tapping opens the auth modal, NOT the chooser (D3, W8)
   - Chooser is never shown to unauthenticated users

3. **Empty-state-page CTA** at `/prayer-wall` when feed is empty:
   - 'This space is for you' heading still renders
   - CTA label reads 'Share something' (matches hero per D2)
   - Authenticated tap opens chooser
   - Unauthenticated tap opens auth modal

4. **Category-empty-state CTA** at `/prayer-wall?category=X` when filter has no posts:
   - 'No prayers in {category} yet' heading still renders
   - CTA label reads 'Share something' (matches hero per D2)
   - Same auth-gated behavior as empty-state-page CTA

5. **ComposerChooser desktop layout** (viewport ≥ 768px):
   - Centered modal with backdrop
   - 5 cards rendered in a grid (likely 2 columns x 3 rows, or 3+2 depending on width)
   - Each card shows: icon, label, description, color accent
   - Backdrop is dark with subtle blur
   - Modal has a close affordance (X button top-right or implicit via backdrop tap)
   - Tapping outside the modal (backdrop) closes it
   - Escape key closes
   - Focus trap cycles through cards and close button

6. **ComposerChooser mobile layout** (viewport < 768px):
   - Bottom sheet with drag handle visible at top
   - 5 cards stacked vertically (or in a 2-col grid scaled to fit)
   - Each card meets 44x44 minimum touch target
   - Tapping outside (above the sheet) closes it
   - Drag handle visually present (per AC #5)
   - On orientation change, layout recomputes without breaking

7. **Card selection flow**:
   - Tapping any card closes the chooser
   - InlineComposer opens with the corresponding postType
   - No flicker between close and open (W11)
   - The composer renders all per-type behavior correctly (chrome, copy, image upload affordance for testimony/question, etc.)

8. **All 5 cards rendered with correct metadata** in the chooser:
   - Prayer Request: HandHelping icon, white wash accent, prayer-request description
   - Testimony: Sparkles icon, amber accent, testimony description
   - Question: HelpCircle icon, cyan accent, question description
   - Discussion: MessagesSquare icon, violet accent, discussion description
   - Encouragement: Heart icon, rose accent, encouragement description

9. **First-time tooltip** (TooltipCallout for 'prayer-wall-composer'):
   - Renders pointing at the same hero button that now opens the chooser
   - Dismiss behavior unchanged
   - Once dismissed, stays dismissed

10. **Debug query param shim REMOVED**:
    - `/prayer-wall?debug-post-type=testimony` no longer auto-opens the testimony composer
    - The query param is silently ignored
    - The `REMOVE-IN-4.7` comment block is gone from PrayerWall.tsx
    - /verify-with-playwright tests that previously used the shim now use the chooser path

11. **No regression on existing flows**:
    - QOTD composer (separate state, separate flow) still works (W4)
    - Posting from the chooser-driven flow creates the right post type
    - Editing existing posts (via PrayerCard's edit affordance, if any) unchanged
    - Bookmarks, reactions, comments unchanged
    - Category filter URL params unchanged

12. **Accessibility**:
    - Cards are focusable via Tab key
    - Cards are activatable via Enter or Space
    - Each card has accessible name (label) and accessible description (description)
    - Color is not the only signal (icon + text labels carry the meaning)
    - Reduced-motion preference respected (no slide animation if user has it set)

Minimum 12 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

The master plan body for 4.7 lives at `_forums_master_plan/round3-master-plan.md` lines ~4397–4429. Significant drift relative to current ground truth.

### MPD-1 — 'FAB' terminology is stale; current entry is hero button + empty-state CTAs

The master plan body says:

> **Goal:** A new modal/sheet that appears when the user taps the compose FAB, asking what they want...

> - [ ] Tapping the compose FAB opens the chooser instead of the composer directly

Recon ground truth (R1, R2): there is NO FAB anywhere on `/prayer-wall`. The composer entry points are:

- A 'Share a Prayer Request' button rendered in the `<PrayerWallHero action={...}>` slot at the top of the page (line ~741-747 in PrayerWall.tsx)
- An unauthenticated variant of the same button that opens the auth modal (line ~757-760)
- A 'Share a prayer request' CTA on the FeatureEmptyState when the feed is empty (line ~919-927)
- A 'Share a prayer request' CTA on the FeatureEmptyState when a category filter has no posts (line ~936-944)

There is also a 'shim' for /verify-with-playwright that opens the composer with a specific postType via `?debug-post-type=testimony|question|discussion` query param (line ~815-832), explicitly marked `REMOVE-IN-4.7` in a code comment.

**Action for the planner:**

- Translate every master plan reference to 'FAB' as 'hero button entry point' (the production button in the PrayerWallHero action slot)
- Recognize that there are FOUR production entry points to rewire, not one
- Recognize that the debug query param shim is part of 4.7's removal scope, not just the FAB-replacement
- Don't create a FAB despite the master plan body's terminology (W2)

The master plan body's intent is clear (single chooser surface for all 5 types); only the terminology is stale.

### MPD-2 — 4.7 includes removing the `?debug-post-type` shim

The master plan body's Files-to-Modify list mentions `frontend/src/pages/PrayerWall.tsx` but doesn't enumerate the debug shim removal. Recon ground truth: PrayerWall.tsx has an explicit code comment block at lines 815-818:

> /* REMOVE-IN-4.7: ?debug-post-type query param shim. The production
> entry-point for testimony composer is Spec 4.7's Composer Chooser;
> until that ships, this shim enables /verify-with-playwright to
> exercise the testimony variant via URL. */

This is a self-documenting feature flag with the spec number embedded in the marker. 4.7 removes:

- The `REMOVE-IN-4.7` comment block
- The conditional logic that reads `searchParams.get('debug-post-type')` and selects postType from it
- Any test fixtures or Playwright scripts that depend on the shim (these need to be migrated to the chooser-driven path)

If 4.6b's verify-with-playwright report (or any prior verification) used the shim, those scripts need migration too. Plan recon checks `frontend/tests/` (or wherever Playwright tests live) for `debug-post-type` references and updates them to click-the-chooser flow.

### MPD-3 — `post-types.ts` descriptions ALREADY EXIST

The master plan body's Files-to-Modify list says:

> - `frontend/src/constants/post-types.ts` (add description copy if not already present)

From prior recon during 4.3-4.6 brief authoring, `post-types.ts` already has a `description` field on each post type entry. For example, encouragement: `description: 'Speak a word of life over the community.'`

**Action for the planner:** verify during recon that all 5 post types have non-empty `description` strings. If any are missing or weak (e.g., placeholder copy from earlier specs), fill them in to brand-voice standards (Section 13). Most likely no edits to post-types.ts are needed beyond a copy review.

The master plan body's hedge ('if not already present') anticipated this. Treat the descriptions as already-shipped infrastructure unless recon proves otherwise.

### MPD-4 — Auth gate timing not specified in master plan body

The master plan body's Goal and AC don't address WHEN the auth check happens relative to the chooser opening. Two valid patterns:

- **(a) Auth-then-chooser**: unauth user clicks hero button → auth modal. Auth user clicks → chooser. Chooser only ever rendered to authed users.
- **(b) Chooser-then-auth**: chooser opens for everyone. Selecting a type prompts auth if needed.

**4.7 chooses (a)** per D3. Reasoning:
- Preserves existing behavior (current `setComposerOpen(true)` is gated by `isAuthenticated` check at all four entry points)
- Simpler implementation — chooser doesn't need its own auth-gating logic
- No new auth interstitial mid-flow
- Discovery for new users is solved by post-type cards being visible on the wall already (each type's chrome and labeling makes it visible)

**Override moment:** if Eric prefers (b), edit D3 before pasting. Adds ~10 lines of state management and 4-5 tests, but no new architectural surface.

### MPD-5 — TooltipCallout coupling to `composerRef` not mentioned in master plan body

The master plan body's Files-to-Modify says 'wherever the FAB lives' but doesn't address `TooltipCallout` (the first-time-user hint pointing at the composer button). Recon ground truth (R8): `composerRef` is attached to the wrapper `<div>` containing the hero button, and `TooltipCallout` targets it via `targetRef={composerRef}`.

**Action for the planner:** preserve the ref. The hero button keeps its position (top of page, in PrayerWallHero action slot), keeps `composerRef`, but its `onClick` handler now opens the chooser instead of toggling the InlineComposer.

If CC moves the hero button into the ComposerChooser component itself, the ref orphans and the tooltip stops working. The ref must stay on a stable element in PrayerWall.tsx.

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-09)

Verified on disk at `/Users/Eric/worship-room/`.

### R1 — No FAB exists in PrayerWall.tsx

Grep for 'FAB' in `frontend/src/pages/PrayerWall.tsx` returns zero matches. Grep for `floating action button` also returns zero. The master plan body's terminology is aspirational, not descriptive.

### R2 — Hero button is the always-visible composer entry

`frontend/src/pages/PrayerWall.tsx` lines 731-760 (in the JSX return):

```tsx
<PrayerWallHero
  action={
    isAuthenticated ? (
      <div
        ref={composerRef}
        className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        {...(composerTooltip.shouldShow
          ? { 'aria-describedby': 'prayer-wall-composer' }
          : {})}
      >
        <button
          type="button"
          onClick={() => setComposerOpen(!composerOpen)}
          className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-..."
        >
          Share a Prayer Request
        </button>
        <Link to="/prayer-wall/dashboard" ...>
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          My Dashboard
        </Link>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => openAuthModal?.()}
        className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-..."
      >
        ... // (label likely matches authenticated, verify in plan)
      </button>
    )
  }
/>
```

Key observations:

- Two button instances: authenticated (toggles composer open) and unauthenticated (opens auth modal)
- The `composerRef` wraps the authenticated button container only — the unauthenticated button doesn't get tooltip targeting (which makes sense: tooltip text 'click to share' is only relevant for authed users)
- The 'My Dashboard' link is a sibling, not part of the composer flow — 4.7 leaves it unchanged
- `composerOpen` is a useState; `setComposerOpen(!composerOpen)` is a TOGGLE — 4.7 changes this to `setChooserOpen(true)` (or whatever state name lands on)

### R3 — Two empty-state CTAs use FeatureEmptyState

`PrayerWall.tsx` lines 917-927 and 936-944:

```tsx
<FeatureEmptyState
  heading="This space is for you"
  description="Share what's on your heart, or simply pray for others."
  ctaLabel="Share a prayer request"
  onCtaClick={() => {
    if (isAuthenticated) {
      setComposerOpen(true)
    } else {
      openAuthModal?.('Sign in to share a prayer request')
    }
  }}
/>
```

And:

```tsx
<FeatureEmptyState
  heading={`No prayers in ${CATEGORY_LABELS[activeCategory]} yet`}
  description="Be the first to share."
  ctaLabel="Share a prayer request"
  onCtaClick={() => {
    if (isAuthenticated) {
      setComposerOpen(true)
    } else {
      openAuthModal?.('Sign in to share a prayer request')
    }
  }}
/>
```

Both currently call `setComposerOpen(true)` when authed. After 4.7, both call `setChooserOpen(true)` (the new state setter for the chooser visibility).

### R4 — Debug query param shim location and content

`PrayerWall.tsx` lines 815-832 (approximate — plan re-verifies):

```tsx
{/* REMOVE-IN-4.7: ?debug-post-type query param shim. The production
    entry-point for testimony composer is Spec 4.7's Composer Chooser;
    until that ships, this shim enables /verify-with-playwright to
    exercise the testimony variant via URL. */}
<InlineComposer
  isOpen={composerOpen}
  onClose={() => setComposerOpen(false)}
  postType={
    searchParams.get('debug-post-type') === 'testimony'
      ? 'testimony'
      : searchParams.get('debug-post-type') === 'question'
      ? 'question'
      : searchParams.get('debug-post-type') === 'discussion'
      ? 'discussion'
      : searchParams.get('debug-post-type') === 'encouragement'
      ? 'encouragement'
      : 'prayer_request'
  }
  onSubmit={handleComposerSubmit}
/>
```

After 4.7, the entire conditional ternary chain reduces to `postType={chosenPostType}` where `chosenPostType` is state set by the chooser. If no card has been selected yet, the InlineComposer is not open (`isOpen={composerOpen}` stays false until both chooser-opens AND card-clicked).

### R5 — InlineComposer's API is `{ isOpen, onClose, postType, onSubmit }`

The InlineComposer component receives `isOpen` (boolean), `onClose` (callback), `postType` (one of the 5 types), and `onSubmit` (callback). 4.7 doesn't change this API — it just changes the calling pattern from 'open with prayer_request default' to 'open with the type the user chose in the chooser'.

### R6 — `post-types.ts` descriptions exist (verify in plan)

From prior session memory, `frontend/src/constants/post-types.ts` has entries for all 5 types with `description` strings:

- `prayer_request`: probably 'Share what's on your heart for others to pray over.' or similar
- `testimony`: 'Share a story of how God has worked.' or similar
- `question`: 'Ask the community for prayer or wisdom.' or similar
- `discussion`: 'Reflect together on something you're learning.' or similar
- `encouragement`: 'Speak a word of life over the community.' (verified during 4.6 brief authoring)

Plan recon reads the actual file and confirms each description is brand-voice-aligned and fit-for-purpose. If any description is weak placeholder copy, plan upgrades it as part of 4.7.

### R7 — `POST_TYPE_ICONS` mapping in PrayerCard.tsx

From prior recon (4.6 brief): `POST_TYPE_ICONS` maps each type to a Lucide icon. Post-4.6:

```typescript
const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles,
  question: HelpCircle,
  discussion: MessagesSquare,
  encouragement: Heart,
}
```

4.7 doesn't modify this map — the chooser imports it (or imports the icons directly) to render each card's icon.

**Decision call:** does ComposerChooser import `POST_TYPE_ICONS` from PrayerCard, or duplicate the icon list? D7 settles this: import from a shared source. If POST_TYPE_ICONS is currently un-exported from PrayerCard, lift it to a shared module (`frontend/src/constants/post-type-icons.ts` or keep in `post-types.ts` as a co-located map).

### R8 — TooltipCallout for 'prayer-wall-composer'

`PrayerWall.tsx` lines 964-972:

```tsx
{composerTooltip.shouldShow && (
  <TooltipCallout
    targetRef={composerRef}
    message={TOOLTIP_DEFINITIONS['prayer-wall-composer'].message}
    tooltipId="prayer-wall-composer"
    position={TOOLTIP_DEFINITIONS['prayer-wall-composer'].position}
    onDismiss={composerTooltip.dismiss}
  />
)}
```

The `TOOLTIP_DEFINITIONS['prayer-wall-composer']` definition lives in a separate constants file (verify path during recon). The tooltip message likely says something like 'Tap here to share a prayer' — 4.7 may want to update this copy to match the new chooser-driven flow ('Tap to share something').

**Action for the planner:** read TOOLTIP_DEFINITIONS, evaluate whether the tooltip message needs updating for the new flow. If it does, that's a small constants file edit — not a separate spec.

### R9 — No existing modal/sheet pattern conventions known

The project has individual modals (auth modal, QOTD composer, share dropdown, etc.) but the brief doesn't have visibility into a project-wide modal abstraction. Plan recon checks for:

- A `<Dialog>` / `<Modal>` / `<Sheet>` shared component in `frontend/src/components/ui/`
- Use of Headless UI (`@headlessui/react`)
- Use of Radix UI (`@radix-ui/react-dialog`)
- Native `<dialog>` element use
- Custom modal via React Portal

If a shared abstraction exists, ComposerChooser uses it for consistency. If not, ComposerChooser establishes its own pattern using `react-dom`'s `createPortal` + a focus-trap library (e.g., `focus-trap-react`).

### R10 — QOTD composer is a separate flow (W4)

`QotdComposer` is a sibling component with its own state (`qotdComposerOpen`). It's opened via the QOTD card on the page (not via the hero button). 4.7 does NOT modify QOTD's flow — the chooser is for non-QOTD posts only.

This is a real concern: a future 'unified composer' might fold QOTD into the chooser, but 4.7 explicitly doesn't. QOTD has its own UX (response-prompt-driven, not type-prompt-driven) and consolidating them is a Phase 6+ decision.

### R11 — `/verify-with-playwright` test fixtures use the debug query param

During 4.3-4.6b verification, Playwright tests opened the composer with specific postTypes via `?debug-post-type=testimony|question|...`. After 4.7, those tests need to be migrated to:

- Click the hero button (or empty-state CTA)
- Click the desired card in the chooser
- Assert the composer opened with the right postType

This migration is part of 4.7's scope. The verifier's report should list the migrated tests.

If the project has more than ~20 Playwright tests using the shim, the migration is non-trivial and may extend the test surface beyond the master plan AC's '12 component tests' threshold.

### R12 — Per-type chrome classes are exported from PrayerCard or a shared utility

From prior recon: PrayerCard.tsx has a switch-case mapping postType to chrome class strings (e.g., `bg-rose-500/[0.04]` for encouragement). If the chooser cards want to apply matching accent colors, either:

- Import the chrome resolver from PrayerCard
- Use a parallel but distinct color palette tuned for chooser cards (smaller, less prominent than full PrayerCard chrome)

D15 decides: ChooserCard uses a SUBSET of the chrome (just the border + a small icon-background tint, not the full FrostedCard wash). Reasoning: chooser cards are smaller; full chrome would feel heavy.

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

4.7 is pure-frontend. No backend changes, no DB writes, no API calls beyond what InlineComposer already does.

| # | Gate | Applies to 4.7? |
| - | ---- | --- |
| 1 | Idempotency lookup BEFORE rate-limit check (createPost) | N/A (no backend changes) |
| 2 | Rate-limit consumption order | N/A |
| 3 | Cross-field validation | N/A |
| 4 | HTML sanitization BEFORE length check | N/A |
| 5 | Length check after sanitization | N/A |
| 6 | Crisis detection on sanitized content | N/A |
| 7 | AFTER_COMMIT crisis event publishing | N/A |
| 8 | Activity recording | N/A |
| 9 | EntityManager refresh for DB defaults | N/A |
| 10 | Logging IDs only (no content) | N/A |
| 11 | `ContentTooLongException` error code/message contract | N/A |
| 12 | JSR-303 enforcement | N/A |
| 13 | PostType wire-format ↔ Java enum drift sync | N/A (4.7 reads from `post-types.ts`; no enum changes) |

All 13 gates inherited from earlier specs continue to work transparently for 4.7's flow because the InlineComposer path is unchanged.

---

## 7. Decisions and divergences

### D1 — Hero button label: 'Share something'

Current label: 'Share a Prayer Request'. After 4.7, type-agnostic.

**Decision: 'Share something'.** Short (two words), calm (no exclamation), type-agnostic, action-oriented.

**Rejected alternatives:**
- 'Start a post' (transactional; reads as form-fill)
- 'Share with the community' (longer, slightly clinical)
- 'What's on your heart?' (a question, not a button label — confusing UX)
- 'Share' (too short; ambiguous about what)
- 'Compose' (jargon)
- 'Post' (verb-as-noun ambiguity)

The label appears in 3 places (hero auth button, hero unauth button, both empty-state CTAs). Use the same string in all 3. Don't differentiate the unauth label — the user shouldn't be aware they need to log in until they tap.

### D2 — Empty-state CTA labels match D1

Both `FeatureEmptyState` instances change `ctaLabel` from 'Share a prayer request' to 'Share something'.

The `description` props on the empty-state components stay the same (per recon they say 'Share what's on your heart, or simply pray for others.' and 'Be the first to share.'). Both descriptions are already type-agnostic.

### D3 — Auth gate timing: auth-then-chooser

Unauthenticated user clicks hero button → auth modal opens.
Authenticated user clicks hero button → chooser opens.
Chooser is never rendered to unauth users.

Implementation pattern (preserves existing behavior):

```tsx
// In PrayerWall.tsx
const [chooserOpen, setChooserOpen] = useState(false)
const [composerOpen, setComposerOpen] = useState(false)
const [chosenPostType, setChosenPostType] = useState<PostType>('prayer_request')

// Hero button handler:
onClick={() => {
  if (isAuthenticated) {
    setChooserOpen(true)
  } else {
    openAuthModal?.('Sign in to share something')
  }
}}

// Chooser card handler (passed as prop):
onSelect={(postType: PostType) => {
  setChosenPostType(postType)
  setChooserOpen(false)
  setComposerOpen(true)
}}
```

The `chosenPostType` state defaults to 'prayer_request'; if a card is never clicked but composerOpen flips somehow, it falls through to prayer_request. Defensive default.

### D4 — Modal layout: bottom sheet on mobile, centered modal on desktop

Breakpoint: `640px` (sm: in Tailwind, matches existing breakpoints). Below 640px = bottom sheet. At or above = centered modal.

Why not 768px (md:)? The hero already responds at 640px (`sm:flex-row`). Matching the same breakpoint keeps the responsive story consistent.

Implementation: a single `ComposerChooser` component with internal Tailwind responsive classes; CSS controls layout, JS doesn't branch on viewport.

```tsx
// Approximate styling:
<div className={cn(
  // Mobile: bottom sheet
  'fixed inset-x-0 bottom-0 rounded-t-2xl border-t border-white/20 bg-black/80 backdrop-blur-xl pb-safe',
  // Desktop: centered modal
  'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-[90vw] sm:rounded-2xl sm:border'
)}>
  ...
</div>
```

Plan refines this. The shape matters: mobile slides up from bottom, desktop appears centered.

### D5 — 5 cards rendered in the chooser

One card per post type, all 5 enabled (per 4.6 shipping `enabled: true` on encouragement). The cards render in this order:

1. Prayer Request
2. Testimony
3. Question
4. Discussion
5. Encouragement

This matches the order in `post-types.ts`'s `POST_TYPES` array. If `POST_TYPES` is iterated, the order falls out naturally; if hardcoded, match this list.

**Why this order:** Prayer Request is the most-used type historically and the brand's anchor offering, so it's first. Testimony is the natural next ('answered prayers' — follows from prayer requests). Question, Discussion, Encouragement are equally weighted; the order is arbitrary but consistent.

**Don't render a 'Default' or 'More' card.** All 5 are equal first-class citizens.

### D6 — Card content: icon + label + description + accent color

Each card shows:

- **Icon** (top): Lucide icon from POST_TYPE_ICONS, sized 24-32px, with the per-type accent color
- **Label** (middle): Post type display name (e.g., 'Prayer Request', 'Testimony') from `post-types.ts` `label` field
- **Description** (below label): One-line description from `post-types.ts` `description` field
- **Accent color** (border or icon background): Subtle per-type tint matching PrayerCard chrome

No prices, no usage stats, no 'Most popular' badges, no 'New!' tags. Just icon + label + description + color.

**Card minimum size:** 44x44 touch target. Practically, cards will be larger (probably ~120px tall on mobile, ~140px on desktop) to fit the description text.

### D7 — Cards are `<button>` elements

Semantic HTML matters here. Each card is a `<button type='button'>` (NOT `<div onClick>` with role='button'). Reasons:

- Native focus management (Tab key cycles cards)
- Native activation via Enter/Space
- Accessibility tree exposes cards as buttons
- Form/dialog interaction patterns just work

Each card has:
- `aria-label`: same as its label, OR a longer descriptive aria-label like 'Share a Prayer Request: ask others to pray for you' (verbose accessible name)
- `type='button'`: prevents form submission if nested in any form ancestor
- onClick handler: calls onSelect with the postType

### D8 — Animation: slide-up on mobile, fade-in on desktop, reduced-motion respected

Mobile: 200ms slide-up from bottom edge (transform: translateY(100%) → translateY(0)).
Desktop: 150ms fade-in (opacity 0 → 1) + subtle scale (0.95 → 1).

**Reduced-motion preference:** if `prefers-reduced-motion: reduce`, animations are disabled (instant appearance). This is a brand value (calm, not flashy) and an accessibility requirement.

Use Tailwind's `motion-reduce:transition-none` or equivalent CSS to short-circuit the transitions.

### D9 — Drag handle on mobile bottom sheet

A visible horizontal pill/bar at the top of the sheet, ~36px wide x 4px tall, white at 30% opacity, centered. This is the canonical 'bottom sheet' affordance — users recognize it from native iOS/Android sheets.

**Decision: drag handle is visual-only in 4.7.** Actual swipe-to-dismiss interaction is NOT implemented (would require a gesture library). Tap-outside-to-dismiss covers the dismissal need.

If Eric wants swipe-to-dismiss, that's a Phase 6+ polish item.

### D10 — Focus trap, escape, backdrop tap (per AC)

- **Focus trap**: when chooser opens, focus moves to the first card (or close button). Tab cycles through cards → close button → first card again. Shift+Tab reverses.
- **Escape**: closes the chooser. Focus returns to the hero button.
- **Backdrop tap**: closes the chooser. Focus returns to the hero button.
- **Tapping a card**: closes the chooser, opens the InlineComposer. Focus moves into the InlineComposer (its existing focus management takes over).

If the project has a focus-trap library (`focus-trap-react`), use it. If not, add it as a dependency — it's small and well-maintained. Don't roll a custom focus trap.

### D11 — 'Open chooser, then open InlineComposer' two-state-change is synchronous

When a card is clicked:

```tsx
onSelect={(postType) => {
  setChosenPostType(postType)
  setChooserOpen(false)
  setComposerOpen(true)
}}
```

React batches these state updates in a single render. The chooser unmounts and the InlineComposer mounts in the same paint. No flicker.

**If CC introduces an artificial delay** (e.g., setTimeout to 'wait for chooser exit animation'), reject. The chooser exit animation (D8) plays during the same render as the composer open animation. Both animations fire simultaneously. The user perceives a single transition.

If CC's implementation has a flicker (chooser briefly empty before composer appears), debug the rendering, don't add timeouts.

### D12 — No 'remember last choice' preference

The chooser starts fresh every time. No 'You usually share Testimonies' nudge. No reordering by usage. No keyboard shortcut hints.

Reasoning:
- Worship Room's brand is presence, not optimization
- 'Remember my last choice' implies the user has a preferred type; the chooser's role is to invite intentional selection
- Storing preference adds localStorage state that needs migration discipline
- No master plan body requirement for this

If Eric wants smart-ordering in the future, that's a Phase 6+ polish item.

### D13 — No platform-specific gating

All 5 cards visible on all platforms. No 'Image upload only on testimony/question' gating in the chooser — that's enforced inside the composer (4.6b), not at chooser level.

If future specs introduce role-based or trust-level-based post types (e.g., 'Welcomer Post' available only to users with the welcomer role), the chooser would gate them. 4.7 doesn't introduce that pattern.

### D14 — Modal mounting: React Portal

Mount the chooser via `react-dom`'s `createPortal` to a top-level DOM node (typically `document.body` or a dedicated `#modal-root`). Reasons:

- Avoids z-index stacking conflicts with PrayerWall's content
- Ensures backdrop covers everything below
- Standard React modal pattern

If the project has an existing `<Portal>` component or modal abstraction, use it. If not, `createPortal` directly is fine.

Plan recon confirms which modal pattern the project uses (R9). The auth modal probably uses one already — ComposerChooser uses the same.

### D15 — Chooser card chrome: subset of PrayerCard chrome

PrayerCard chrome is FULL chrome (large background wash, blur, hover effects). Chooser cards use a SUBSET:

- Border with per-type accent color at low opacity (e.g., `border border-rose-200/20`)
- Icon background with per-type accent at higher opacity (e.g., `bg-rose-500/10` on the icon container only, not the whole card)
- Card body uses the same neutral background as the modal (`bg-white/5` or similar)
- Hover state on desktop: subtle increase in border/icon-bg opacity
- Tap state on mobile: brief scale-down (0.98) for tactile feedback

This creates visual consistency with PrayerCard without making the chooser feel as visually heavy as a feed of 5 cards.

<!-- CHUNK_BOUNDARY_4 -->

---

## 8. Watch-fors

### W1 — 4.6b must ship before 4.7 starts

Verify `_forums_master_plan/spec-tracker.md` shows 4.6b ✅. The chooser presents all 5 post types as equally available; if 4.6b's image upload affordance hasn't shipped, testimony and question cards would advertise functionality the InlineComposer doesn't yet have.

If 4.6b hasn't shipped, STOP.

### W2 — Don't introduce a FAB

Per MPD-1. The master plan body's terminology is stale. Current entry is the hero button + empty-state CTAs. If CC creates a new floating action button (fixed-position circle, bottom-right), reject.

The hero button stays in the PrayerWallHero `action` slot. Its label changes ('Share a Prayer Request' → 'Share something'), its onClick handler changes (open chooser instead of toggle composer), its position and styling stay the same.

### W3 — Don't keep the `?debug-post-type` shim

Per MPD-2. The `REMOVE-IN-4.7` comment is the spec. The shim was always temporary scaffolding for /verify-with-playwright during 4.3-4.6b; its replacement (the chooser) is now ready.

If CC argues for keeping the shim 'in case the chooser breaks' or 'for testing convenience', reject. The chooser IS the production path; if it breaks, that's a bug to fix, not a reason to keep a back-channel.

### W4 — Don't break the QOTD composer

Per R10. `QotdComposer` has separate state (`qotdComposerOpen`), separate UX (response-prompt-driven), separate component file. 4.7 doesn't fold QOTD into the chooser.

If CC notices the QOTD card on the page and tries to consolidate, reject. QOTD is intentionally separate.

### W5 — Don't orphan the TooltipCallout

Per MPD-5 / R8. `composerRef` is attached to the wrapper `<div>` containing the hero button. The ref must continue to point at a stable element after 4.7's rewire.

**Specifically:** the hero button's WRAPPER div (which holds the ref) stays in PrayerWall.tsx, in the PrayerWallHero `action` slot, with the same ref attachment. The button INSIDE the wrapper changes its onClick handler. The TooltipCallout component itself doesn't change.

If CC moves the button into ComposerChooser's component, the ref orphans. Don't.

### W6 — Don't change InlineComposer's API

InlineComposer's props (`isOpen`, `onClose`, `postType`, `onSubmit`) stay exactly as-is. 4.7 changes WHO calls it with WHAT, not the contract.

If CC adds new props (e.g., `defaultPostType`, `chosenFromChooser`), reject. The chooser passes the chosen postType through PrayerWall's existing state; InlineComposer's API is unchanged.

### W7 — Don't auto-open the composer with default postType after 4.7

Before 4.7: `setComposerOpen(true)` was sufficient — InlineComposer opened with default 'prayer_request' postType.

After 4.7: `setComposerOpen(true)` should NOT happen unless a chooser card has been clicked first. The flow is:

1. Hero button click → `setChooserOpen(true)`
2. Card click → `setChosenPostType(X)` + `setChooserOpen(false)` + `setComposerOpen(true)`
3. Composer renders with `postType={chosenPostType}`

If CC keeps a code path that calls `setComposerOpen(true)` directly (skipping the chooser), reject. The chooser is the gate.

Exception: programmatic 'edit existing post' flows (if any) might open the composer directly with a specific postType. Those are out of 4.7's scope and should be left alone.

### W8 — Don't break the auth flow

Per D3. The auth check happens BEFORE the chooser opens. Unauth users get the auth modal. If CC moves the auth check into the chooser ('chooser opens for everyone, auth modal fires when card clicked'), reject — that's pattern (b) from MPD-4 which is explicitly NOT chosen.

The behavior contract: chooser is only ever rendered to authenticated users. If `isAuthenticated` is false at any chooser-render moment, the chooser shouldn't render.

Defensive: even if state somehow gets into a 'chooser open + user logged out' configuration, the chooser should auto-close. Add a `useEffect` to close the chooser if isAuthenticated flips to false.

### W9 — Don't render cards smaller than 44x44

Per AC #7. Each card meets the 44px minimum touch target. With icon + label + description, cards will naturally be larger (probably 100-140px tall), but the minimum constraint catches the edge case where a small viewport or accidental flexbox shrink could compress them.

Use `min-h-[44px] min-w-[44px]` on each card as a defensive minimum.

### W10 — Don't break category filter URL params

The `/prayer-wall?category=X` URL pattern stays. The chooser doesn't use URL params for state — chooser visibility is local React state.

If CC adds `?chooser=open` or similar URL state, reject. The chooser is ephemeral; URL state would be confusing (a refreshed page would re-open the chooser).

### W11 — Don't introduce flicker between chooser-close and composer-open

Per D11. React batches state updates within a single event handler. The two-state-change is one render. No setTimeout, no animation orchestration callbacks, no waiting-for-exit-animation.

If the implementation has a visible flicker, it's a CSS/animation issue, not a state-management issue. Debug the CSS, don't add timeouts.

### W12 — Don't add 'remember my last choice' preference

Per D12. The chooser doesn't reorder cards by usage, doesn't pre-select the user's last choice, doesn't store preference in localStorage.

If CC adds a `lastChosenPostType` state with localStorage persistence, reject. Worship Room's brand is intentional presence, not user-optimization.

### W13 — Don't introduce role/trust-level gating

Per D13. All 5 cards visible to all authenticated users. No 'available only to verified accounts', no 'unlocks after 10 posts', no progressive-disclosure tricks.

If CC sees the existing user-trust system (if any) and adds gating, reject. 4.7 is a flat 5-type chooser.

### W14 — Don't break existing InlineComposer tests

The InlineComposer's tests exercise its API. They open the composer with a specific postType and verify the composer renders correctly. After 4.7, InlineComposer's API is unchanged — those tests should pass without modification.

If CC modifies InlineComposer to support 'remembered choice' or 'default postType from props' or any other 4.7-driven change, the existing tests may break. Restore them.

### W15 — Don't render disabled types in the chooser

Per 4.6: all 5 post types have `enabled: true`. The chooser iterates `POST_TYPES.filter(t => t.enabled)` (or similar) to render only enabled types. After 4.6, all 5 are enabled, so all 5 render.

If a future spec ever disables a type (unlikely, but defensively), the chooser silently hides it without a 'Coming soon' placeholder.

If CC adds a 'Coming soon' card for disabled types or omits the `enabled` filter entirely, reject. The filter is the gate.

### W16 — Don't add cards for non-post-type entries

The chooser is for the 5 post types. Don't add cards for:

- 'Question of the Day' (separate flow per W4)
- 'Bookmark' (action, not post type)
- 'Share a Bible verse' (Phase 7 cross-feature integration; 4.7 isn't that)
- 'Daily reflection' (Daily Hub feature, not Prayer Wall)

If CC sees adjacent features and adds them to the chooser, reject. The chooser surface is precisely the 5 post types.

### W17 — Don't break empty-state CTA copy parity

Per D2. Both `FeatureEmptyState` instances change `ctaLabel` to 'Share something'. If CC differentiates them ('Share your first prayer' vs 'Share in this category'), reject. Parity matters: the user should recognize the same CTA in different empty states.

### W18 — Don't break the postType prop pipeline

The selected postType flows: chooser → PrayerWall state (`chosenPostType`) → InlineComposer prop (`postType`) → composer's per-type rendering (chrome, copy, image upload affordance, etc.).

If any link in this chain breaks, the composer renders with default 'prayer_request' regardless of card click. Test surface (Section 9) covers each link.

### W19 — Don't introduce per-card hover effects that conflict with mobile touch

Desktop hover states are fine; mobile shouldn't trigger them on tap (the iOS sticky-hover bug). Use `@media (hover: hover)` to gate hover styles to mouse devices.

```css
@media (hover: hover) {
  .chooser-card:hover { background-color: ...; }
}
```

Or Tailwind's `hover:` modifier with a `:hover:not([data-pointer-coarse])` selector. Plan picks the implementation; the watch-for is the trap.

### W20 — Don't add modal-within-modal patterns

The chooser is a modal. The InlineComposer (when open) is also a modal. They should NOT be open simultaneously — D11 enforces this.

If CC has a code path where both `chooserOpen && composerOpen` is true (e.g., 'animation in progress'), reject. The state machine has 4 states:

1. Both closed (idle)
2. Chooser open, composer closed (selecting a type)
3. Chooser closed, composer open (composing)
4. Both closed (after submit, after cancel, etc.)

State 2-and-3 transitions are atomic.

### W21 — Don't break first-tooltip behavior

Per R8 / W5. The TooltipCallout fires once for first-time users, dismissable. After 4.7, it points at the same hero button (now opens chooser). The tooltip message may need updating (R8 flags this), but the behavior contract — fires once, dismissable, persists across visits via localStorage — stays.

### W22 — Don't render the chooser via SSR

The project may use SSR (Vite's SSR mode or similar). The chooser is client-only state — it shouldn't render on the server. Use a `useEffect` + state pattern, or check `typeof document !== 'undefined'` before mounting via createPortal.

If the project doesn't use SSR (verify in plan), this watch-for is redundant. Most Vite + React apps render client-side; confirm.

### W23 — Don't add analytics that aren't already present

4.7 doesn't add new analytics events. If `setComposerOpen(true)` currently fires an analytics event ('composer_opened'), the new flow ('chooser_opened' + 'card_clicked' + 'composer_opened') should preserve the parent event.

If CC adds 'chooser_card_selected' as a new event, reject unless explicitly requested. Analytics surface is its own spec.

### W24 — Don't break aria-describedby on the composer button

Per R2 / R8. The hero button's wrapper has `aria-describedby='prayer-wall-composer'` when the tooltip is showing. After 4.7, this attribute stays. If CC removes it, the screen reader announcement breaks for first-time users.

### W25 — Don't accept invalid postType from chooser

The chooser passes a postType to PrayerWall. PrayerWall sets it as state. PrayerWall passes it as a prop to InlineComposer. If somehow an invalid value reached the prop (e.g., a typo'd type, or a stale type after a future spec removes a card), the composer would render incorrectly.

Defensive: use TypeScript's strict type checking on the postType prop. The `PostType` union type catches typos at compile time. Runtime validation in InlineComposer is unnecessary if types are enforced.

If CC weakens the type to `string`, reject.

### W26 — Don't render the chooser before the user has tapped

The chooser doesn't pre-render or pre-mount. It mounts only when `chooserOpen === true`. Don't add a `<ComposerChooser hidden={!chooserOpen}>` pattern that keeps it in the DOM with display:none.

Reasoning: keeping it mounted hidden bloats the initial DOM, slows initial paint, and can leak focus into the trapped focus zone if the user tabs through hidden elements.

Use conditional rendering: `{chooserOpen && <ComposerChooser onSelect={...} onClose={...} />}`.

<!-- CHUNK_BOUNDARY_5 -->

---

## 9. Test specifications

Target: ~30 tests. Master plan AC says ≥12; the surface justifies more.

### Frontend tests

**`frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx`** (NEW — ~14 tests):

- Renders all 5 post type cards when open
- Each card shows correct icon, label, description
- Each card has correct accent color (per-type chrome subset)
- Each card has min-h-[44px] / min-w-[44px] (touch target)
- Each card is a `<button type='button'>`
- Each card has accessible name matching its label
- Tab key cycles focus through cards
- Enter on focused card calls onSelect with correct postType
- Space on focused card calls onSelect with correct postType
- Escape calls onClose
- Clicking backdrop calls onClose
- Clicking a card calls onSelect, then onClose
- Clicking inside a card (but not on a button) doesn't bubble to backdrop close
- Reduced-motion preference disables transitions

**`frontend/src/pages/__tests__/PrayerWall.test.tsx`** (UPDATE — add ~8 tests):

- Hero button label reads 'Share something' (was 'Share a Prayer Request')
- Hero button (authenticated) opens chooser, NOT composer directly
- Hero button (unauthenticated) opens auth modal, NOT chooser
- Chooser card click opens InlineComposer with the chosen postType
- Submitting from chooser-driven flow creates a post with correct postType
- Empty-state-page CTA opens chooser when authenticated
- Empty-state-filter CTA opens chooser when authenticated
- `?debug-post-type=testimony` query param has no effect (shim removed)

**`frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx`** (UPDATE — may need 1-2 tests):

- Hero renders the action slot correctly
- (Likely no new tests; PrayerWallHero is just a layout shell)

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (existing tests should pass without modification per W14):

- All existing per-type composer tests pass unchanged
- (No new tests added by 4.7 for InlineComposer specifically)

**`frontend/tests/playwright/`** (or wherever Playwright tests live, MIGRATE — ~5 test scripts):

- Migrate 'open testimony composer' from `?debug-post-type=testimony` to 'click hero button → click testimony card'
- Same migration for question, discussion, encouragement
- Migrate 'open prayer_request composer' (if any explicit test exists; defaults may not need migration)
- Add new Playwright test: 'chooser focus trap', 'chooser keyboard navigation', 'chooser tap outside to close'

**`frontend/src/constants/__tests__/post-types.test.ts`** (UPDATE — ~3 tests):

- All 5 types have non-empty `description` strings
- Descriptions pass brand voice (anti-pattern check: no exclamations, no urgency, no comparison) — informational, not enforced
- POST_TYPES exported with the order matching D5

### Total test budget

- ComposerChooser.test.tsx: ~14 new
- PrayerWall.test.tsx: ~8 added
- PrayerWallHero.test.tsx: 0-2 added
- post-types.test.ts: ~3 added
- Playwright migrations: ~5 scripts (count varies based on existing test surface)

**Total: ~30 tests + ~5 Playwright migrations.** Exceeds the master plan AC of ≥12 substantially — reflects the rewire complexity across 4 entry points + new modal pattern.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Frontend:**

- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — The new modal/sheet component
- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx` — ~14 tests
- (Optional, depending on R7 outcome): `frontend/src/constants/post-type-icons.ts` — If POST_TYPE_ICONS map needs lifting from PrayerCard.tsx for shared access

### Files to Modify

**Frontend:**

- `frontend/src/pages/PrayerWall.tsx` — Major changes:
  - Add `chooserOpen`, `chosenPostType` state
  - Change hero button onClick from `setComposerOpen(!composerOpen)` to `setChooserOpen(true)` (with auth gate)
  - Change empty-state CTA onCtaClick from `setComposerOpen(true)` to `setChooserOpen(true)` (with auth gate, both instances)
  - Mount `<ComposerChooser>` conditionally
  - Update hero button label from 'Share a Prayer Request' to 'Share something'
  - Update both empty-state ctaLabel from 'Share a prayer request' to 'Share something'
  - REMOVE the `?debug-post-type` query param shim entirely (the conditional ternary chain in InlineComposer's postType prop)
  - REMOVE the `REMOVE-IN-4.7` comment block
  - Pass `chosenPostType` as InlineComposer's `postType` prop
  - Auto-close chooser on auth state change (defensive per W8)
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — No changes expected (action slot is generic)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — If POST_TYPE_ICONS is lifted to a shared module (R7 / D7), update the import. Otherwise no changes.
- `frontend/src/constants/post-types.ts` — Brand-voice review of all 5 type descriptions; tweak if needed (most likely no edits beyond a copy review per MPD-3)
- `frontend/src/constants/tooltip-definitions.ts` (or wherever TOOLTIP_DEFINITIONS lives, R8) — Update `prayer-wall-composer` tooltip message to match the new chooser-driven flow if the existing copy is type-specific
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — Add ~8 tests for chooser integration
- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx` — Possibly 0-2 tests if hero changes
- `frontend/src/constants/__tests__/post-types.test.ts` — Add ~3 tests verifying descriptions exist and order is correct
- `frontend/tests/playwright/...` (paths verified during plan recon, R11) — Migrate ~5 scripts from debug query param to chooser-driven flow

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.7 from ⬜ to ✅ AFTER successful merge

### Files NOT to Modify

**Stay frozen:**

- `frontend/src/components/prayer-wall/InlineComposer.tsx` — API unchanged per W6
- `frontend/src/components/prayer-wall/QotdComposer.tsx` — Separate flow per W4
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — Sibling, not affected
- `frontend/src/components/prayer-wall/PrayerCard.tsx` (chrome / icons unchanged unless POST_TYPE_ICONS lifting required by R7)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Reaction layer, not composer layer
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Comments, not composer
- `frontend/src/components/AuthModal.tsx` (or wherever it lives) — Auth flow preserved per D3
- All backend files — Pure frontend spec
- `backend/src/main/java/com/worshiproom/post/PostType.java` — No enum changes
- `backend/src/main/java/com/worshiproom/post/PostService.java` — No backend changes
- `backend/src/main/resources/openapi.yaml` — No API changes
- All Liquibase changesets — No schema changes

### Files to Delete

(none — the debug query param shim is REMOVED but it lives inside PrayerWall.tsx, which stays)

<!-- CHUNK_BOUNDARY_6 -->

---

## 11. Acceptance criteria

**Functional behavior — hero button:**

- [ ] Hero button label reads 'Share something' (was 'Share a Prayer Request')
- [ ] Hero button (authenticated) opens the ComposerChooser, NOT the InlineComposer
- [ ] Hero button (unauthenticated) opens the auth modal, NOT the chooser
- [ ] composerRef still attached to the wrapper div (TooltipCallout works)
- [ ] aria-describedby attribute preserved on wrapper when tooltip showing

**Functional behavior — empty-state CTAs:**

- [ ] 'This space is for you' CTA label is 'Share something' (matches hero per D2)
- [ ] 'No prayers in {category} yet' CTA label is 'Share something' (matches hero per D2)
- [ ] Both CTAs (authenticated) open chooser
- [ ] Both CTAs (unauthenticated) open auth modal
- [ ] Empty-state heading and description copy unchanged

**Functional behavior — ComposerChooser:**

- [ ] All 5 post type cards rendered: Prayer Request, Testimony, Question, Discussion, Encouragement (in that order per D5)
- [ ] Each card shows: icon (Lucide, per type), label (from post-types.ts), description (from post-types.ts), accent color (per-type chrome subset)
- [ ] Each card meets 44x44 minimum touch target
- [ ] Each card is a `<button type='button'>` with accessible name and onClick handler
- [ ] Mobile (<640px): bottom sheet layout with drag handle visible at top
- [ ] Desktop (≥640px): centered modal with backdrop blur
- [ ] Backdrop tap closes the chooser
- [ ] Escape key closes the chooser
- [ ] Tab key cycles focus through cards (and optional close button)
- [ ] Focus trap prevents tab from escaping the chooser
- [ ] Reduced-motion preference disables transitions
- [ ] Mounted via React Portal (chooser renders outside PrayerWall's normal DOM tree)

**Functional behavior — chooser-to-composer flow:**

- [ ] Tapping a card closes the chooser AND opens InlineComposer in a single render (no flicker)
- [ ] InlineComposer renders with the selected postType (correct chrome, copy, image upload affordance for testimony/question, etc.)
- [ ] Submitting from chooser-driven flow creates a post with the correct postType
- [ ] Closing the chooser without selecting a card returns focus to the hero button
- [ ] Closing the InlineComposer (cancel or after submit) doesn't re-open the chooser

**Functional behavior — debug query param shim removal:**

- [ ] `?debug-post-type=testimony` URL parameter has NO effect (composer doesn't auto-open with testimony)
- [ ] Same for question, discussion, encouragement
- [ ] The `REMOVE-IN-4.7` comment block is gone from PrayerWall.tsx
- [ ] The `searchParams.get('debug-post-type')` conditional ternary chain is removed
- [ ] No regression in /verify-with-playwright suite (Playwright tests migrated to chooser-driven flow)

**Functional behavior — no regressions:**

- [ ] QOTD composer still works (separate flow, unchanged)
- [ ] Category filter URL params still work (`/prayer-wall?category=X`)
- [ ] First-time TooltipCallout still fires for new users
- [ ] Tooltip dismiss state persists across page loads
- [ ] All 5 post types createable via the new flow
- [ ] All existing post-type tests pass (per-type chrome, per-type composer copy, etc.)
- [ ] Existing InlineComposer tests pass without modification (W14)

**Accessibility:**

- [ ] Cards focusable via Tab
- [ ] Cards activatable via Enter or Space
- [ ] Each card has accessible name (label)
- [ ] Each card has accessible description (description text)
- [ ] Color is not the only signal (icon + text labels carry meaning)
- [ ] Reduced-motion respected
- [ ] Focus trap works in both directions (Tab + Shift+Tab)
- [ ] Focus returns to hero button when chooser closes
- [ ] Modal has role='dialog' and aria-modal='true'
- [ ] Modal has aria-labelledby pointing to a heading or descriptive label

**Tests:**

- [ ] ~14 new ComposerChooser tests pass
- [ ] ~8 new PrayerWall tests pass
- [ ] ~3 new post-types description tests pass
- [ ] ~5 Playwright tests migrated successfully
- [ ] No regressions in any prior spec's tests (4.1–4.6b)

**Brand voice:**

- [ ] Hero button label passes the pastor's wife test
- [ ] Empty-state CTA labels pass
- [ ] Each post type's description on its card passes
- [ ] No exclamation, no urgency, no comparison, no jargon
- [ ] Tooltip message updated if needed (R8)

**Visual verification (gated on /verify-with-playwright):**

- [ ] All 12 scenarios in Section 3 pass
- [ ] Mobile bottom sheet visually correct (drag handle, backdrop, slide-up)
- [ ] Desktop centered modal visually correct (backdrop blur, centered, scale-in)
- [ ] Card grid layout adapts correctly between mobile and desktop
- [ ] All 5 cards render with correct accent colors matching PrayerCard chrome
- [ ] No flicker between chooser-close and composer-open
- [ ] First-time tooltip fires correctly pointing at the chooser-opening button

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 4.7 row flipped from ⬜ to ✅ as the final step

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.7:

- **A floating action button (FAB)** — the master plan body's terminology was stale; current entry is the hero button per W2
- **Folding QOTD into the chooser** — separate flow per W4; consolidating is Phase 6+
- **Smart-ordering or 'remember last choice'** — D12 / W12; not in 4.7
- **Role/trust-level gating on cards** — D13 / W13; flat 5-type chooser
- **Analytics events for chooser interactions** — W23; analytics is its own spec
- **Swipe-to-dismiss on mobile bottom sheet** — D9; visual handle only, no gesture in 4.7
- **Deep-link to a specific chooser card** (e.g., `?chooser=testimony`) — W10; URL state is for category filter only
- **Cards for non-post-type entries** (Bible verse, daily reflection, etc.) — W16; precisely the 5 post types
- **Modal-within-modal patterns** (chooser-then-confirm-then-composer) — W20; one-step flow
- **Pre-mount the chooser hidden** (`display:none` until opened) — W26; conditional render
- **Custom keyboard shortcuts for picking types** (e.g., 'P' for Prayer, 'T' for Testimony) — future polish
- **Tooltip onboarding for the chooser itself** — the hero-button tooltip already covers entry; chooser-specific tooltips would be over-onboarding
- **InlineComposer API changes** — W6; chooser passes the existing prop
- **Audio cues for chooser interactions** — future Phase 6+ sound design
- **Animations beyond slide-up / fade-in** (e.g., card-by-card stagger, parallax) — keep transitions calm
- **Backend changes** — pure-frontend spec
- **localStorage state for chooser preferences** — D12 / W12
- **Skipping the chooser for power users** ('always go to prayer_request') — chooser is the gate; consistency over personalization
- **Compose-from-Bible / compose-from-daily-hub integrations** — Phase 7 cross-feature

---

## 13. Brand voice quick reference (pastor's wife test)

The ComposerChooser is the first time a user sees all 5 post types as a SET. First impression matters.

**Anti-patterns to flag during /code-review:**

- 'What kind of post would you like to share?!' (exclamation; transactional)
- 'Choose your post type' (jargon: 'post type' is dev language)
- 'Pick one to get started!' (cheerleader voice)
- 'Most users share Prayer Requests' (comparison / nudge)
- '✨ Try our new Encouragement type!' (emoji + 'try our' marketing voice)
- 'Tell us what's on your heart' (reads as a survey prompt)
- 'Compose a post' (jargon)
- 'New post' (transactional, like email)
- '🔥 Trending: Encouragements' (gamification)

**Good copy in 4.7:**

- 'Share something' (hero button + empty-state CTAs) — simple, calm, type-agnostic
- (no chooser title required — the cards speak for themselves)
- (if a chooser title is needed): 'What would you like to share?' — invitational, not directive
- Card labels: 'Prayer Request', 'Testimony', 'Question', 'Discussion', 'Encouragement' — already established, no rewriting
- Card descriptions: from post-types.ts; reviewed during plan recon for brand voice
- Tooltip update (if needed): 'Tap here to share something with the community' (vs the previous 'Tap to share a prayer')

The chooser title is intentionally OPTIONAL. The cards themselves are self-explanatory; adding a title risks redundancy or pressure-creep ('PICK ONE').

**Decision: include a small, unobtrusive title.** Recommended: 'What would you like to share?' (~14 chars, fits on mobile and desktop). Matches the brand's invitational tone. If Eric prefers no title, omit the heading and rely on cards alone.

**Card descriptions** (subject to plan-time recon and possible refinement):

- Prayer Request: 'Ask others to pray with you'
- Testimony: 'Share what God has done'
- Question: 'Ask the community for prayer or wisdom'
- Discussion: 'Reflect together on something you're learning'
- Encouragement: 'Speak a word of life over the community'

If existing post-types.ts descriptions are stronger, keep them. If they're weaker, upgrade them. Plan recon decides.

All descriptions:
- 5-9 words
- Active verb
- Person-centered ('you', 'others', 'community')
- No 'features' framing ('30-day expiry', 'image upload available') — those are technical specs, not invitations
- No exclamation

---

## 14. Tier rationale

Run at **xHigh**. Justifications:

**Why not Standard:**

- Four entry points to rewire (hero auth, hero unauth, two empty-state CTAs) plus one to remove (debug shim). Standard tier consistently misses one.
- The auth gate timing (D3, MPD-4) has two valid options; the brief locks one in. Without explicit instruction, Standard tier might pick (b) which complicates auth flow.
- The TooltipCallout coupling (R8, MPD-5) is subtle. Standard tier sometimes orphans the ref by moving the button into the chooser component.
- The chooser-close + composer-open atomicity (D11, W11, W20) requires understanding React batching. Standard tier sometimes adds setTimeout, introducing flicker.
- Brand-voice anti-patterns are easy to ship in card descriptions. xHigh's stricter copy review catches them.
- Mobile bottom-sheet vs desktop centered-modal responsive layout has multiple correct implementations; xHigh's higher attention picks the simpler one.
- The Playwright test migration (R11) is detail work that Standard tier sometimes ships incomplete.

**Why not MAX:**

- Pure frontend, no schema, no backend, no migration
- InlineComposer's API unchanged; chooser is additive
- All 5 post types and their per-type metadata already exist (4.3-4.6 shipped them)
- Auth flow preserved, not redesigned
- The brief covers all 26 watch-fors and 15 decisions explicitly
- ComposerChooser is a single new component with bounded scope

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC keeps the `?debug-post-type` shim 'for testing' (W3 violation)
- If CC's modal implementation has a flicker between chooser-close and composer-open (W11)
- If CC orphans the TooltipCallout target (W5)
- If CC adds 'remember my last choice' state (W12)
- If CC's auth check moves into the chooser (D3 / MPD-4 violation)
- If CC creates a FAB despite W2
- If brand voice on cards drifts to cheerleader / urgency / jargon territory

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-7`:

```
/spec-forums spec-4-7

Write a spec for Phase 4.7: Composer Chooser. Read /Users/Eric/worship-room/_plans/forums/spec-4-7-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: xHigh.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites:
- 4.6b (Image Upload for Testimonies & Questions) must be ✅ — verify in spec-tracker.md
- The `composerCopyByType` map in InlineComposer.tsx is fully populated for all 5 types post-4.6b
- The image upload affordance is integrated into testimony and question composers

If the prerequisite check fails, STOP. Don't proceed without 4.6b shipped.

Recon checklist (re-verify on disk before starting; the brief's recon was on date 2026-05-09):

1. `frontend/src/pages/PrayerWall.tsx` lines ~731-760 — confirm hero button structure (PrayerWallHero action slot, composerRef wrapper, button onClick toggling composerOpen)
2. PrayerWall.tsx lines ~815-832 — confirm `?debug-post-type` shim with `REMOVE-IN-4.7` comment is still present
3. PrayerWall.tsx lines ~917-944 — confirm two FeatureEmptyState instances with 'Share a prayer request' ctaLabel
4. PrayerWall.tsx lines ~964-972 — confirm TooltipCallout for 'prayer-wall-composer' targeting composerRef
5. `frontend/src/constants/post-types.ts` — read all 5 post type entries; confirm `description` field exists and has non-empty content for each
6. `frontend/src/components/prayer-wall/PrayerCard.tsx` — confirm POST_TYPE_ICONS map exists; check whether it's exported (R7)
7. `frontend/src/components/prayer-wall/InlineComposer.tsx` — confirm API is `{ isOpen, onClose, postType, onSubmit }` (W6)
8. Project's modal/dialog conventions — check for existing Headless UI / Radix / native dialog use; mirror that pattern (R9, D14)
9. TOOLTIP_DEFINITIONS file (path varies; likely `frontend/src/constants/`) — read 'prayer-wall-composer' definition; evaluate whether copy needs updating (R8)
10. Playwright tests using `?debug-post-type` — grep `frontend/tests/` for `debug-post-type` references; list scripts that need migration (R11)
11. `QotdComposer.tsx` and `QotdComposer` state in PrayerWall.tsx — confirm separate flow (W4)
12. focus-trap-react or equivalent dependency — check if already installed; if not, plan adds it

Spec output structure:

- Title and metadata (size L, risk Medium, prerequisites 4.6b, branch forums-wave-continued)
- Goal — Add a ComposerChooser modal/sheet that surfaces all 5 post types when the user taps the hero composer entry; preserve auth gate, preserve TooltipCallout; remove `?debug-post-type` shim
- Approach — New `ComposerChooser` component (mobile bottom-sheet, desktop centered modal, React Portal mount, focus trap); rewire 4 entry points (hero auth, hero unauth, 2 empty-state CTAs); preserve InlineComposer's API
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~30 tests + ~5 Playwright migrations)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - 'FAB' terminology in master plan is stale; entry is hero button + empty-state CTAs (MPD-1)
  - `?debug-post-type` shim is REMOVED, not preserved (MPD-2, W3)
  - post-types.ts descriptions ALREADY EXIST; review copy, don't add (MPD-3)
  - Auth-then-chooser pattern (D3); chooser only for authed users
  - composerRef must stay attached to the same wrapper div in PrayerWall.tsx (MPD-5, W5)
  - The chooser-close + composer-open is one render (D11, W11)
  - Card content: icon + label + description + accent color subset (D6, D15)
  - Don't add 'remember my last choice' (D12, W12)
  - Migrate Playwright tests from debug query param to chooser-driven flow (R11)
  - All 26 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually.
- Pure-frontend spec; no backend changes.
- New component `ComposerChooser.tsx`; no other new files unless POST_TYPE_ICONS lifting is needed.
- The InlineComposer's API stays exactly as-is.

After writing the spec, run /plan-forums spec-4-7 with the same tier (xHigh).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-7
```

The verifier exercises Section 3's 12 visual scenarios. Verifier writes to `_plans/forums/spec-4-7-verify-report.md`.

If verification flags any of:
- A FAB has been introduced (W2)
- The `?debug-post-type` shim still works (W3)
- The QOTD composer is broken (W4)
- TooltipCallout doesn't fire on the hero button (W5, W21, W24)
- The chooser opens for unauthenticated users (W8)
- A flicker is visible between chooser-close and composer-open (W11)
- A 'remember my choice' preference exists (W12)
- Cards smaller than 44x44 (W9)
- The chooser is mounted hidden in the DOM before user opens it (W26)
- Brand voice anti-patterns in card descriptions or button labels (Section 13)

Abort and bump to MAX. Those are the canonical override moments.

For the Playwright test migration specifically, the verifier should:
1. Confirm zero references to `debug-post-type` remain in `frontend/tests/`
2. Confirm tests that previously used the shim now click through the chooser
3. Confirm the chooser-driven tests cover all 5 post types end-to-end (open chooser → select card → fill composer → submit → verify post created with correct type)

If any of these are skipped, treat as a hard fail.

---

## Prerequisites confirmed (as of 2026-05-09 brief authorship)

- ✅ 4.1 (Post Type Foundation), 4.2 (Prayer Request Polish), 4.3 (Testimony), 4.4 (Question) shipped per spec-tracker
- ⬜ 4.5 (Devotional Discussion), 4.6 (Encouragement), 4.6b (Image Upload) — must ship before 4.7
- The hero button entry pattern is established and confirmed (recon dated 2026-05-09)
- The `REMOVE-IN-4.7` comment in PrayerWall.tsx is the design intent for the debug shim removal
- The TooltipCallout on `composerRef` is the first-time-user onboarding hint that must be preserved
- The four entry points (hero auth, hero unauth → auth modal, empty-state-page CTA, category-empty CTA) are all in PrayerWall.tsx; no other files have composer-open call sites
- InlineComposer's API contract stays unchanged — 4.7 is purely about WHO calls it with WHAT
- The QOTD composer is intentionally separate; 4.7 doesn't unify the flows
- Pure-frontend spec; no backend changes, no schema, no migration

**Brief authored:** 2026-05-09, on Eric's personal laptop. Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b briefs. Phase 4 surface-completion spec — with 4.7 shipped, all 5 post types are reachable through a unified UX entry, the debug-shim scaffolding from earlier specs is retired, and the Composer Chooser is the canonical production path. The next spec, 4.7b (Ways to Help MVP), adds OPTIONAL practical-help tagging on prayer requests — builds on 4.7 because the chooser is the entry point for prayer requests too.

**End of brief.**
