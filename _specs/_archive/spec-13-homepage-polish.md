# Spec 13 — Homepage Chrome Polish (StartingPointQuiz + CTA Alignment + Selective A11y)

**Branch:** `forums-wave-continued`
**Posture:** Polish/audit spec. Mostly mechanical chrome alignment. Last spec in the visual rollout.
**Direction doc:** locked in chat — recap in Section "Direction summary" below.
**Recon:** `_plans/recon/homepage-2026-05-07.md`

---

## Affected Frontend Routes

- `/` (Home — logged-out renders Home page; logged-in renders Dashboard, which Spec 13 does not modify)
- `/register` (RegisterPage — DashboardPreview component is also mounted here, so Decisions 3 + 11 affect this route transitively)

---

## Problem statement

The Homepage was largely untouched throughout the visual rollout. The user identified three glass containers as suspected unmigrated; recon confirmed only one (StartingPointQuiz quiz container) is real drift. DifferentiatorSection is already canonical (uses `<FrostedCard>` directly). DashboardPreview locked cards match the documented "Locked Preview Card Pattern" — intentional drift to preserve.

Beyond the container question, recon surfaced CTA polish drift across DashboardPreview, RegisterPage, FinalCTA, plus internal drift on StartingPointQuiz (answer-option selected state, Retake Quiz Caveat button, Result CTA Pattern 1 sizing on a Pattern 2 surface).

Spec 13 closes the visual rollout. ~9 surfaces to touch. No structural redesign. The user explicitly preserves: hero glow orbs, HeroSection cinematic treatment, TypewriterInput, JourneySection idiom, StatsBar, DashboardPreview locked cards, all atmospheric architecture.

---

## Direction summary (locked)

Numbered decisions from chat, copied here for execution reference:

1. **DifferentiatorSection** — no action (already canonical).
2. **DashboardPreview locked cards** — preserve (documented pattern).
3. **DashboardPreview "Create a Free Account" CTA** — migrate gradient-fill hybrid → canonical white-pill Pattern 2.
4. **StartingPointQuiz quiz container** — migrate to canonical FrostedCard. Direction: replace hand-rolled glass with `<FrostedCard>` component directly using className override for bespoke `p-6 sm:p-8 lg:p-10` dialog-tier padding.
5. **StartingPointQuiz answer options** — migrate selected state from saturated `bg-purple-500/20 border-purple-500/30` to canonical muted-white `bg-white/15 border-white/[0.18]`. Migrate base border `[0.08]` → `[0.12]`.
6. **StartingPointQuiz Retake Quiz button** — Caveat → Inter. `font-script` → `font-sans text-xl font-semibold`. PRESERVE `WHITE_PURPLE_GRADIENT` background-clip text fill.
7. **StartingPointQuiz Result CTA** — promote from Pattern 1 (`px-6 py-3`) to Pattern 2 (`px-8 py-3.5 text-base sm:text-lg` + canonical drop shadow + hover shadow + `active:scale-[0.98]` + `min-h-[44px]`).
8. **`/register` GlowBackground** — NO action (Option E.2.e polish-only, but even polish unnecessary).
9. **`/register` "Create Your Account" CTA** — align to Pattern 2 attributes: hover bg, hover shadow, transition tokens, focus ring color, responsive text sizing, padding. PRESERVE `animate-shine`.
10. **FinalCTA "Get Started — It's Free" CTA** — add explicit `min-h-[44px]`, reconcile any remaining Pattern 2 attribute drift.
11. **Selective a11y polish:**
    - DashboardPreview `aria-label` → `aria-labelledby` (free-rider since we're touching it for Decision 3)
    - StartingPointQuiz `aria-label` → `aria-labelledby`
    - StartingPointQuiz: add `role="radiogroup"` + `role="radio"` + `aria-checked` + arrow-key keyboard nav
    - StartingPointQuiz: add `aria-live="polite"` for question progression
    - All migrated CTAs get `min-h-[44px]` per their Pattern 2 alignment

---

## Architecture context

### Files this spec touches (production)

- `frontend/src/components/StartingPointQuiz.tsx` — Decisions 4, 5, 6, 7, 11 (largest set of changes)
- `frontend/src/components/homepage/DashboardPreview.tsx` — Decisions 3, 11
- `frontend/src/components/homepage/FinalCTA.tsx` — Decision 10
- `frontend/src/pages/RegisterPage.tsx` — Decision 9

### Files this spec touches (tests)

- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — extensive extension (~10-15 new assertions)
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — extend (CTA chrome + aria-labelledby)
- `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx` — extend (CTA chrome)
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — extend (CTA chrome)

### Files this spec does NOT touch

- `frontend/src/pages/Home.tsx` — no chrome changes; the page renders the components Spec 13 modifies but doesn't itself need edits
- `frontend/src/components/HeroSection.tsx` — preserved per Decision D.2
- `frontend/src/components/TypewriterInput.tsx` — preserved per Decision D.3
- `frontend/src/components/homepage/GlowBackground.tsx` — preserved per Decision 8
- `frontend/src/components/homepage/JourneySection.tsx` — preserved (recon confirmed no drift)
- `frontend/src/components/homepage/StatsBar.tsx` — preserved (already canonical)
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — preserved (already canonical)
- `frontend/src/components/homepage/SectionHeading.tsx` — preserved
- `frontend/src/components/FrostedCard.tsx` — read-only consumer (used by Decision 4)
- `frontend/src/components/prayer-wall/AuthModal.tsx` — out of scope (Forums Wave Phase 1 territory)
- All site chrome (Navbar, Layout, error boundaries) — Spec 12 just shipped, preserved
- All audio engine — Decision 24 from music cluster still applies
- All BibleReader, Daily Hub HorizonGlow, RoutinesPage, Music surfaces

### Patterns to follow

- **Canonical white-pill Pattern 2** — verbatim class string from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. Used for Decisions 3, 7, 9, 10.

  ```text
  inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none
  ```

- **`<FrostedCard>` component** — `frontend/src/components/FrostedCard.tsx`. Default variant is tier 1 (`bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`). Accepts `className` override for padding adjustments. Used for Decision 4.
- **Spec 11A muted-white active state** — `bg-white/15 border-white/[0.18] text-white`. Used for Decision 5.
- **`WHITE_PURPLE_GRADIENT` background-clip text fill** — Inter font + gradient text via `background: WHITE_PURPLE_GRADIENT; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;`. Used for Decision 6.
- **`useId()` hook** — for generating unique IDs for `aria-labelledby` linkage. Used for Decision 11.
- **Spec 12 site-chrome canonical patterns** — preserved.

### Critical pre-execution recon notes

- **DashboardPreview is mounted on BOTH `/` and `/register`.** Decision 3 (CTA migration) + Decision 11 (aria-labelledby) affect both pages simultaneously. Verify both routes during /verify-with-playwright.
- **StartingPointQuiz LIGHT variant is dead code on the homepage.** The component supports `variant="dark"` (default, used by Home.tsx) and `variant="light"` (no production consumer). Spec 13 modifies the DARK variant chrome. The LIGHT variant code path stays untouched; it would be cleaned up in a separate dead-code spec if at all.
- **`<FrostedCard>` accepts `className` for additive override.** When Decision 4 replaces the hand-rolled glass with `<FrostedCard>`, the className passes through `cn()` (Tailwind merge). Verify the merge resolves padding correctly (`p-6 sm:p-8 lg:p-10` should override the default `p-6` from FrostedCard, not stack with it).
- **`animate-shine` is unique to RegisterPage CTA.** Decision 9 explicitly preserves it. Don't strip during the Pattern 2 alignment.
- **StartingPointQuiz selected option uses `bg-purple-500/20 border-purple-500/30 text-white`.** Decision 5 migrates this to canonical muted-white. Per Spec 11A precedent, active states are NOT decorative tints — they get muted-white. Decision 11 from Spec 11B (decorative-tint preservation for categorical badges) does NOT apply here.
- **StartingPointQuiz progress bar fill uses `bg-gradient-to-r from-purple-500 to-white/80`.** This is decorative gradient on the progress affordance, NOT an active state. Preserve.
- **StartingPointQuiz Retake Quiz uses `WHITE_PURPLE_GRADIENT` background-clip text fill.** Decision 6 preserves the gradient text but changes the font from Caveat to Inter. The `style={{ background: WHITE_PURPLE_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}` block stays; only the className changes (`font-script` → `font-sans`, `font-normal` → `font-semibold`).
- **StartingPointQuiz Result CTA currently uses `transition-colors duration-base hover:bg-white/90`.** Decision 7 promotes to Pattern 2 which uses `transition-all duration-200`. The `transition-all` token is the canonical homepage transition (matches Pattern 2 verbatim string).
- **Pre-existing test baseline:** post-Spec-12, 9,470+ pass / 0 known fails. Spec 13 must maintain this baseline.

---

## Auth gating checklist

Spec 13 introduces NO new auth gates. Existing gates preserved:

| Action | Auth required | Path |
|---|---|---|
| Tap "Create a Free Account" CTA on DashboardPreview | NO (link to `/register`) | `<Link to="/register">` |
| Tap "Create Your Account" CTA on RegisterPage | NO | `useAuthModal.openAuthModal(undefined, 'register')` |
| Tap "Get Started — It's Free" CTA on FinalCTA | NO (link to `/register`) | `<Link to="/register">` |
| Tap StartingPointQuiz answer option | NO | local quiz state |
| Tap StartingPointQuiz Retake Quiz | NO | local quiz state reset |
| Tap StartingPointQuiz Result CTA | NO | `<Link to={destination.route}>` |

---

## Design system values

| Component | Property | Value | Source |
|---|---|---|---|
| StartingPointQuiz container | full glass chrome | `<FrostedCard className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">` | Decision 4 |
| StartingPointQuiz answer option base | `bg + border` | `bg-white/[0.05] border border-white/[0.12]` (border bumped from `[0.08]`) | Decision 5 |
| StartingPointQuiz answer option hover | `bg + border` | `hover:bg-white/[0.08] hover:border-white/[0.18]` | Decision 5 (canonical) |
| StartingPointQuiz answer option selected | `bg + border + text` | `bg-white/15 border-white/[0.18] text-white` | Decision 5 (Spec 11A muted-white) |
| StartingPointQuiz Retake Quiz button | font + size + weight | `font-sans text-xl font-semibold` (was `font-script font-normal`) | Decision 6 |
| StartingPointQuiz Retake Quiz button | gradient text | `style={{ background: WHITE_PURPLE_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}` | Decision 6 (preserved) |
| StartingPointQuiz Result CTA | full chrome | Pattern 2 verbatim | Decision 7 |
| StartingPointQuiz `<section>` | aria | `aria-labelledby="quiz-heading"` (was `aria-label="Find your starting point"` or similar — verify actual current attribute) | Decision 11 |
| StartingPointQuiz question container | aria | `role="radiogroup" aria-labelledby="<question-heading-id>"` | Decision 11 |
| StartingPointQuiz answer options | aria | `role="radio" aria-checked={isSelected ? 'true' : 'false'}` | Decision 11 |
| StartingPointQuiz progress region | aria | `aria-live="polite" aria-atomic="true"` on the progress label | Decision 11 |
| DashboardPreview "Create a Free Account" CTA | full chrome | Pattern 2 verbatim | Decision 3 |
| DashboardPreview `<section>` | aria | `aria-labelledby="<section-heading-id>"` | Decision 11 |
| RegisterPage "Create Your Account" CTAs | full chrome | Pattern 2 base + `animate-shine` preserved | Decision 9 |
| FinalCTA "Get Started — It's Free" CTA | full chrome | Pattern 2 verbatim | Decision 10 |

---

## Design system reminder

- **DO NOT touch HeroSection.** Video, masks, h1, gradient — all preserved per recon Decision D.2.
- **DO NOT touch TypewriterInput.** Preserved per recon Decision D.3.
- **DO NOT touch any glow orbs.** Preserved per recon Decision D.1.
- **DO NOT touch GlowBackground component.** No new variants. No prop tuning.
- **DO NOT touch DashboardPreview locked preview cards.** Documented "Locked Preview Card Pattern."
- **DO NOT touch DifferentiatorSection cards.** Already canonical.
- **DO NOT touch JourneySection.** Squiggle SVGs and step list preserved.
- **DO NOT touch StatsBar.** Already canonical.
- **DO NOT migrate StartingPointQuiz progress bar gradient.** `bg-gradient-to-r from-purple-500 to-white/80` is decorative progress affordance, not active state.
- **DO NOT touch StartingPointQuiz LIGHT variant code path.** Dead code on the homepage; cleanup deferred.
- **DO NOT remove `animate-shine` from RegisterPage CTA.** Preserved per Decision 9.
- **DO NOT touch AuthModal form chrome.** Forums Wave Phase 1 territory.
- **DO NOT touch site chrome.** Navbar, Layout, error boundaries — Spec 12 just shipped.
- **DO NOT touch audio engine.** Decision 24 still applies.
- **DO NOT touch RoutinesPage, Music surfaces, BibleReader.**
- **DO NOT add ATMOSPHERIC_HERO_BG to homepage sections.** Inner-page only.
- **DO NOT introduce HorizonGlow on homepage or register.** Daily Hub-only primitive.
- **DO NOT add new design tokens.** Use existing canonical palette and animation tokens.
- **DO NOT add `aria-modal` to MobileDrawer.** Out of scope (Spec 12 deferred).

---

## Responsive structure

- **Desktop (≥1024px):** Homepage renders all 7 sections; StartingPointQuiz container at `lg:p-10` padding; CTAs render `sm:text-lg` size.
- **Tablet (768–1024px):** StartingPointQuiz at `sm:p-8`; CTAs render `sm:text-lg`.
- **Mobile (<768px):** StartingPointQuiz at `p-6`; CTAs render `text-base`. All migrated CTAs maintain `min-h-[44px]` touch target. StartingPointQuiz answer options stay at `min-h-[44px]`.

No layout structure changes — only chrome alignment within existing structure.

---

## Inline element position expectations

Spec 13 makes no inline-row layout changes. All elements maintain their existing positions within their parent containers. The only structural change is internal to StartingPointQuiz container (Decision 4) where the hand-rolled glass div is replaced with `<FrostedCard>`. The children render identically; only the wrapper element changes.

For the Retake Quiz button (Decision 6): font weight changes from `font-normal` → `font-semibold` may affect rendered text width by ~5-10%. Verify no overflow at mobile width.

---

## Vertical rhythm

| From → To | Expected gap | Source |
|---|---|---|
| StartingPointQuiz container internal padding | `p-6 sm:p-8 lg:p-10` (preserved via FrostedCard className override) | Decision 4 |
| StartingPointQuiz progress bar → question heading | preserved (no change) | — |
| StartingPointQuiz question heading → answer options | preserved (no change) | — |
| StartingPointQuiz answer option → next answer option | preserved (no change) | — |
| StartingPointQuiz Result CTA → Retake Quiz button | preserved (no change) | — |
| Result CTA internal: gap between text and any icon | `gap-2` (Pattern 2 default) | Decision 7 |
| DashboardPreview "Create a Free Account" CTA: section bottom margin | `mt-12 sm:mt-16` (preserved) | — |
| FinalCTA bottom margin | preserved | — |

---

## Assumptions & pre-execution checklist

Before executing this plan, confirm:

- [ ] Spec 11A + 11B + 11c + 12 shipped (verify via `git log --oneline | head -30`)
- [ ] `forums-wave-continued` branch active
- [ ] No uncommitted changes in working tree
- [ ] `pnpm test` baseline: 9,470+ pass / 0 known fails (post-Spec-12)
- [ ] `<FrostedCard>` component accepts `className` prop and merges via `cn()` correctly (verify by reading FrostedCard.tsx)
- [ ] `WHITE_PURPLE_GRADIENT` constant exported from `@/constants/gradients` (verified in recon)
- [ ] `useId` from React is available (React 19 — verified in project memory)
- [ ] No new dependencies needed
- [ ] StartingPointQuiz currently has `id="quiz-heading"` on its SectionHeading h2 (verify — needed for Decision 11 aria-labelledby)

---

## Edge cases & decisions

| Decision | Choice | Rationale |
|---|---|---|
| FrostedCard className override conflicts with default `p-6` | Use `cn()` merge — last-class-wins for padding | Tailwind merge canonical behavior |
| StartingPointQuiz answer option in selected + hover state simultaneously | Selected state takes precedence | Active state is the user's choice; hover is exploratory |
| Arrow-key nav on answer options when an option is already selected | Arrow keys move focus, do NOT change selection | Standard radiogroup pattern |
| Arrow-key nav at first/last option | Wraps (last → first on Down, first → last on Up) | Standard radiogroup pattern |
| Tab key on answer options | Tab moves OUT of radiogroup to the next focusable element | Standard radiogroup pattern; arrow keys nav within group |
| Result CTA promoted to Pattern 2 — what about the "Or explore all features" link below it? | NO change. The "Or explore all features" link is a tertiary text-link, not a primary CTA. Stays as-is. | Hierarchy preservation |
| RegisterPage CTA `animate-shine` interaction with Pattern 2 hover shadow | `animate-shine` is a continuous animation; hover shadow is event-based. Both can run simultaneously. | No conflict |
| User with `prefers-reduced-motion` on RegisterPage CTA | `animate-shine` should respect motion-reduce per existing `motion-reduce:transition-none` on the CTA | Preserve existing reduced-motion behavior |
| StartingPointQuiz aria-live announcement on every question advance | `aria-live="polite"` defers to user idle moments — won't interrupt active screen reader speech | Standard live-region behavior |
| StartingPointQuiz on Result reveal — should aria-live announce completion? | The Result card uses canonical FrostedCard — no live-region needed; the Result h3 announces via heading navigation | Standard heading-tier announcement |
| DashboardPreview CTA migration affects `/register` AND `/` simultaneously | This is a coupling per recon. Verify both pages during /verify-with-playwright. | Recon-flagged coupling |

---

## Implementation steps

### Step 1: StartingPointQuiz container — replace hand-rolled glass with `<FrostedCard>`

**Objective:** Replace the hand-rolled `<div>` with canonical FrostedCard chrome at `StartingPointQuiz.tsx:195-200` (DARK variant). Preserve bespoke dialog-tier padding via className override.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

Current state (DARK variant, line 195-200 approximately):

```tsx
<div className={cn(
  'relative mx-auto max-w-3xl',
  'bg-white/[0.04] backdrop-blur-sm border border-white/[0.10] rounded-3xl',
  'shadow-[0_0_30px_rgba(139,92,246,0.08),0_4px_25px_rgba(0,0,0,0.25)]',
  'p-6 sm:p-8 lg:p-10'
)}>
  <div className="relative mx-auto max-w-[600px]">
    {quizContent}
  </div>
</div>
```

Replace with:

```tsx
<FrostedCard className="relative mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
  <div className="relative mx-auto max-w-[600px]">
    {quizContent}
  </div>
</FrostedCard>
```

Add `import { FrostedCard } from '@/components/FrostedCard'` to the imports if not already present.

**LIGHT variant preservation:** If the LIGHT variant has its own version of this container, leave it untouched (dead code on homepage). Only the DARK variant migrates.

**Auth gating:** N/A.

**Responsive behavior:** FrostedCard's default `p-6` is overridden by the className `p-6 sm:p-8 lg:p-10`. Verify Tailwind merge resolves correctly (last-class-wins).

**Inline position expectations:** No layout change. Children render identically.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant container.
- DO NOT change the inner `<div className="relative mx-auto max-w-[600px]">` wrapper — children layout preserved.
- DO NOT add a `variant` prop to FrostedCard unless the default variant doesn't render correctly (verify default variant is tier 1).
- DO NOT touch the surrounding `<GlowBackground variant="none">` wrapper or the inline focused-glow orb.

**Test specifications (StartingPointQuiz.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Container uses FrostedCard component (DARK variant) | unit | Render `<StartingPointQuiz />` (default dark). Query for the FrostedCard element via test ID or role; assert presence + className contains `p-6 sm:p-8 lg:p-10` AND `mx-auto max-w-3xl`. |
| Container has canonical FrostedCard tier 1 chrome | unit | Verify outer FrostedCard rendered className contains `bg-white/[0.07]` AND `border-white/[0.12]` AND `rounded-3xl` (these come from FrostedCard's default variant, not from the wrapper override). |
| Container does NOT use deprecated bg-white/[0.04] | unit | className does NOT contain `bg-white/[0.04]`. |
| Container does NOT use deprecated border-white/[0.10] | unit | className does NOT contain `border-white/[0.10]`. |
| Inner max-w-[600px] wrapper preserved | unit | Children render inside `relative mx-auto max-w-[600px]`. |

**Expected state after completion:**

- [ ] FrostedCard imported in StartingPointQuiz.tsx
- [ ] DARK variant container migrated
- [ ] LIGHT variant untouched
- [ ] Bespoke padding preserved via className
- [ ] 5 test assertions

---

### Step 2: StartingPointQuiz answer options — migrate to canonical muted-white active state

**Objective:** Migrate answer-option chrome at `StartingPointQuiz.tsx:282-313` (DARK variant). Base border + selected state.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

Current state (DARK variant, around line 285-313 — verify exact line numbers):

```tsx
// Unselected (DARK variant):
'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]'
// Selected (DARK variant):
'bg-purple-500/20 border-purple-500/30 text-white'
```

Replace with:

```tsx
// Unselected (DARK variant):
'bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.18]'
// Selected (DARK variant):
'bg-white/15 border-white/[0.18] text-white'
```

Changes:

- Base border `border-white/[0.08]` → `border-white/[0.12]` (canonical)
- Hover border `[0.12]` → `[0.18]` (canonical)
- Selected `bg-purple-500/20 border-purple-500/30` → `bg-white/15 border-white/[0.18]` (Spec 11A muted-white pattern)
- Selected text-white preserved

LIGHT variant (line 295-310 if separate): leave untouched.

Identify the exact ternary or conditional that switches between unselected/selected — apply the migration only inside that conditional branch.

**Auth gating:** N/A.

**Responsive behavior:** No change.

**Inline position expectations:** No change.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant.
- DO NOT modify the progress bar gradient (decorative).
- DO NOT change the focus-visible ring color or other a11y chrome.
- DO NOT change the `min-h-[44px]` touch target.
- DO NOT modify the option button's `<span>` content (text rendering).

**Test specifications (StartingPointQuiz.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Unselected answer option uses canonical border opacity | unit | Render quiz, click an option to deselect another. Find unselected option button; className contains `border-white/[0.12]` and does NOT contain `border-white/[0.08]`. |
| Hover border canonical | unit | className contains `hover:border-white/[0.18]` and does NOT contain `hover:border-white/[0.12]`. |
| Selected answer option uses canonical muted-white | unit | Click an option to select. className contains `bg-white/15` AND `border-white/[0.18]` AND does NOT contain `bg-purple-500/20`. |
| Selected answer option preserves text-white | unit | className contains `text-white`. |
| Touch target preserved | unit | className contains `min-h-[44px]`. |

**Expected state after completion:**

- [ ] Base border + hover migrated to canonical
- [ ] Selected state migrated from saturated purple to canonical muted-white
- [ ] LIGHT variant untouched
- [ ] Touch target preserved
- [ ] 5 test assertions

---

### Step 3: StartingPointQuiz Retake Quiz button — Caveat → Inter

**Objective:** Replace `font-script` with `font-sans text-xl font-semibold` on the Retake Quiz button at `StartingPointQuiz.tsx:402-426` (DARK variant). PRESERVE the WHITE_PURPLE_GRADIENT background-clip text fill.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

Current state (DARK variant, line 402-426 approximately):

```tsx
<button
  type="button"
  onClick={onRetake}
  className="inline-flex min-h-[44px] items-center pb-1 font-script text-xl font-normal transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  style={{
    background: WHITE_PURPLE_GRADIENT,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
>
  Retake Quiz
</button>
```

Replace with:

```tsx
<button
  type="button"
  onClick={onRetake}
  className="inline-flex min-h-[44px] items-center pb-1 font-sans text-xl font-semibold transition-colors duration-base hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
  style={{
    background: WHITE_PURPLE_GRADIENT,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
>
  Retake Quiz
</button>
```

Changes:

- `font-script` → `font-sans` (Inter)
- `font-normal` → `font-semibold`
- Add `duration-base` BB-33 token (the existing transition lacks a duration — add for canonical)
- Add `motion-reduce:transition-none` (defensive)
- Inline style block preserved verbatim (gradient text fill)

LIGHT variant (line 421 area): leave untouched (Caveat usage on dead-code path).

**Auth gating:** N/A.

**Responsive behavior:** Same — `text-xl` at all breakpoints. The font weight bump may render text ~5-10% wider; verify no overflow at mobile.

**Inline position expectations:** Same — inline-flex with `min-h-[44px]`.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant.
- DO NOT remove the inline gradient text style block.
- DO NOT change `text-xl` size.
- DO NOT change `min-h-[44px]` touch target.
- DO NOT change focus-visible behavior.

**Test specifications (StartingPointQuiz.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Retake Quiz button uses Inter font (not Caveat) | unit | Render quiz, advance to result. Find button by name "Retake Quiz". className contains `font-sans` AND does NOT contain `font-script`. |
| Retake Quiz button uses semibold weight | unit | className contains `font-semibold` AND does NOT contain `font-normal`. |
| Retake Quiz button preserves gradient text | unit | Style attribute includes `background-clip: text` AND `WebkitBackgroundClip: text` AND background contains gradient (verify via inline style query). |
| Retake Quiz button uses BB-33 duration token | unit | className contains `duration-base`. |
| Retake Quiz button has motion-reduce safety net | unit | className contains `motion-reduce:transition-none`. |
| Retake Quiz button preserves min-h-[44px] | unit | className contains `min-h-[44px]`. |

**Expected state after completion:**

- [ ] Caveat removed from DARK variant Retake Quiz
- [ ] Inter font applied
- [ ] Semibold weight
- [ ] Gradient text preserved
- [ ] BB-33 token added
- [ ] Motion-reduce safety net added
- [ ] LIGHT variant untouched
- [ ] 6 test assertions

---

### Step 4: StartingPointQuiz Result CTA — promote to Pattern 2

**Objective:** Promote the Result CTA Link at `StartingPointQuiz.tsx:363-385` (DARK variant) from Pattern 1 sizing to Pattern 2 verbatim.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

Current state (DARK variant, line 363-385 approximately):

```tsx
<Link
  to={destination.route}
  className={cn(
    'mx-6 mt-6 inline-block rounded-full bg-white px-6 py-3 text-base font-semibold text-hero-bg',
    'transition-colors duration-base hover:bg-white/90',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  )}
>
  Go to {destination.ctaLabel}
</Link>
```

Replace with Pattern 2:

```tsx
<Link
  to={destination.route}
  className="mx-6 mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
>
  Go to {destination.ctaLabel}
</Link>
```

Changes:

- `inline-block` → `inline-flex items-center gap-2` (canonical)
- Add `min-h-[44px]` touch target
- `px-6 py-3` → `px-8 py-3.5` (Pattern 2 sizing)
- Add `shadow-[0_0_30px_rgba(255,255,255,0.20)]` drop shadow
- `transition-colors duration-base hover:bg-white/90` → `transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`
- Add `sm:text-lg` responsive (canonical)
- `focus-visible:ring-primary` → `focus-visible:ring-white/50` (Pattern 2 ring color)
- Add `focus-visible:ring-offset-hero-bg`
- Add `active:scale-[0.98]` press affordance
- Add `motion-reduce:transition-none` safety net
- `mx-6 mt-6` (positioning) preserved

LIGHT variant Result CTA: leave untouched.

**Auth gating:** N/A.

**Responsive behavior:** `text-base` mobile → `text-lg` at sm+ breakpoint (canonical Pattern 2 responsive).

**Inline position expectations:** Same — Link rendered as block-level (`mx-6 mt-6 inline-flex`).

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant.
- DO NOT change `mx-6 mt-6` positioning.
- DO NOT change the destination route prop.
- DO NOT modify the `Go to {destination.ctaLabel}` text content.
- DO NOT touch the "Or explore all features" tertiary link below this CTA.

**Test specifications (StartingPointQuiz.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Result CTA uses Pattern 2 sizing | unit | Render quiz, advance to result. Find Link by text "Go to ..." (or by `getByRole('link', { name: /Go to/ })`). className contains `px-8` AND `py-3.5` AND `min-h-[44px]`. |
| Result CTA has canonical drop shadow | unit | className contains `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| Result CTA has canonical hover shadow | unit | className contains `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| Result CTA uses transition-all + duration-200 | unit | className contains `transition-all duration-200`. |
| Result CTA uses canonical white focus ring | unit | className contains `focus-visible:ring-white/50` AND does NOT contain `focus-visible:ring-primary`. |
| Result CTA has active:scale | unit | className contains `active:scale-[0.98]`. |
| Result CTA does NOT use deprecated px-6 py-3 sizing | unit | className does NOT contain ` px-6 ` (with surrounding spaces, to avoid matching `px-6` in `mx-6`). |

**Expected state after completion:**

- [ ] Result CTA promoted to Pattern 2 verbatim
- [ ] Drop shadow + hover shadow added
- [ ] Touch target explicit
- [ ] Active scale + motion-reduce added
- [ ] LIGHT variant untouched
- [ ] 7 test assertions

---

### Step 5: StartingPointQuiz a11y — radiogroup pattern

**Objective:** Add WAI-ARIA radiogroup semantics to the question/answer interaction. `role="radiogroup"`, `role="radio"`, `aria-checked`, arrow-key keyboard navigation, `aria-live="polite"` for progression announcements.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx`

**Details:**

**Step 5a — Section aria-labelledby:**

Find the outer `<section>` (around line 506):

Current:

```tsx
<section id="quiz" aria-labelledby="quiz-heading">
```

Verify the SectionHeading at line 510 renders an h2 with `id="quiz-heading"`. If yes, this is already correct — preserve.

If the current attribute is `aria-label` instead of `aria-labelledby`, migrate to `aria-labelledby` referencing the SectionHeading h2 id.

**Step 5b — QuestionCard radiogroup:**

Find the QuestionCard component (around line 246-317). Add `role="radiogroup"` to the question container (the element wrapping the question heading + answer options) and `aria-labelledby` linking to the question h3.

The question h3 needs an `id`. Use `useId()` for unique ID generation (React 19):

```tsx
import { useId } from 'react'

// Inside QuestionCard:
const questionId = useId()

// On the question container:
<div role="radiogroup" aria-labelledby={questionId}>
  <h3 id={questionId} className="...existing...">
    {questionText}
  </h3>
  {/* answer options */}
</div>
```

Verify the actual DOM structure of QuestionCard during execution — the radiogroup wrapper may need to be added or an existing wrapper repurposed.

**Step 5c — Answer option `role="radio"`:**

Find the answer-option button render (around line 282-313). Each option button gets:

- `role="radio"` (currently a `<button>`; the role override semantically promotes it to a radio)
- `aria-checked={isSelected ? 'true' : 'false'}` (verify the variable name for the selection state — likely `isSelected` from the conditional rendering)
- Keep `type="button"` (HTML button type)

**Step 5d — Arrow-key keyboard navigation:**

Add a `onKeyDown` handler to each answer-option button:

```tsx
const handleAnswerKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
  const options = currentQuestion.options
  let nextIndex: number | null = null

  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      nextIndex = (currentIndex + 1) % options.length
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1
      break
    case ' ':
    case 'Enter':
      e.preventDefault()
      onAnswerSelect(options[currentIndex].value)
      return
    default:
      return
  }

  if (nextIndex !== null) {
    e.preventDefault()
    const nextButton = document.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]
    nextButton?.focus()
  }
}
```

(Adapt to the actual component structure — function/hook scope, prop access for options, callback name for selection.)

Bind: `onKeyDown={(e) => handleAnswerKeyDown(e, index)}` on each answer button.

**Step 5e — Progress region aria-live:**

Find the progress label render (around line 84-110). Add `aria-live="polite"` and `aria-atomic="true"` to the label element so screen readers announce question progression as the user advances.

```tsx
<p aria-live="polite" aria-atomic="true" className="...existing classes...">
  Question {currentIndex + 1} of {questions.length}
</p>
```

(Verify the actual progress text and adapt.)

**Auth gating:** N/A.

**Responsive behavior:** No change — a11y attributes don't affect layout.

**Inline position expectations:** No change.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant.
- DO NOT change the question text or answer text content.
- DO NOT change the answer-selection callback or its arguments.
- DO NOT add `role="radiogroup"` to the outer `<section>` (that's `region` semantically).
- DO NOT remove existing `focus-visible:` chrome.

**Test specifications (StartingPointQuiz.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Section uses aria-labelledby (not aria-label) | unit | Find the quiz section. Has `aria-labelledby` attribute (verify value resolves to a real element id). Does NOT have `aria-label`. |
| Question container has role="radiogroup" | unit | Find element by `[role="radiogroup"]`. Has `aria-labelledby` linking to question heading id. |
| Answer options have role="radio" | unit | Query all `[role="radio"]`. Count matches options.length for current question. |
| Selected option has aria-checked="true" | unit | Click an option. That option element has `aria-checked="true"`; others have `aria-checked="false"`. |
| ArrowDown moves focus to next option | unit | Focus first option. Fire ArrowDown. Second option has document.activeElement. |
| ArrowUp from first option wraps to last | unit | Focus first option. Fire ArrowUp. Last option has focus. |
| Enter on focused option selects it | unit | Focus an option. Fire Enter. onAnswerSelect callback invoked with option value. |
| Space on focused option selects it | unit | Focus an option. Fire Space (`{ key: ' ' }`). onAnswerSelect callback invoked. |
| Progress label has aria-live="polite" | unit | Find progress label. Has attribute `aria-live="polite"` AND `aria-atomic="true"`. |

**Expected state after completion:**

- [ ] Section aria-labelledby verified or migrated
- [ ] QuestionCard radiogroup pattern
- [ ] Answer options role="radio" + aria-checked
- [ ] Arrow-key + Enter/Space keyboard nav
- [ ] Progress aria-live region
- [ ] LIGHT variant untouched
- [ ] 9 test assertions

---

### Step 6: DashboardPreview "Create a Free Account" CTA migration

**Objective:** Migrate the hybrid `WHITE_PURPLE_GRADIENT` pill at `DashboardPreview.tsx:232-247` to canonical white-pill Pattern 2.

**Files to modify:**

- `frontend/src/components/homepage/DashboardPreview.tsx`

**Details:**

Current state (line 232-247 approximately):

```tsx
<button
  type="button"
  onClick={...}
  className="inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-hero-bg sm:w-auto shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
  style={{ background: WHITE_PURPLE_GRADIENT }}
>
  Create a Free Account
</button>
```

Replace with Pattern 2 (verify whether the CTA is a button or Link in the actual code — likely a Link to `/register`):

```tsx
<Link
  to="/register"
  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:w-auto sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
>
  Create a Free Account
</Link>
```

Changes:

- `<button onClick>` → `<Link to="/register">` (verify whether onClick handler does anything beyond navigation; if so, keep as button)
- Remove `style={{ background: WHITE_PURPLE_GRADIENT }}`
- Add `bg-white` (solid white, canonical Pattern 2)
- `px-8 py-3` → `px-8 py-3.5`
- Add `min-h-[44px]`
- `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
- Add `hover:bg-white/90`
- `hover:shadow-lg hover:brightness-110` → `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`
- Add `sm:text-lg` responsive
- `focus-visible:ring-primary` → `focus-visible:ring-white/50`
- Add `focus-visible:ring-offset-hero-bg`
- `transition-all` → `transition-all duration-200`
- Preserve `w-full sm:w-auto` (mobile full-width treatment)
- Preserve `active:scale-[0.98]` and `motion-reduce:transition-none`

**Auth gating:** N/A (link to public `/register` page).

**Responsive behavior:** Mobile full-width, desktop auto-width. `text-base` mobile → `text-lg` at sm+ (canonical Pattern 2).

**Inline position expectations:** Same DOM position; same wrapper.

**Guardrails (DO NOT):**

- DO NOT remove `w-full sm:w-auto` (intentional mobile treatment).
- DO NOT change the surrounding section structure or copy.
- DO NOT remove `min-h-[44px]`.

**Test specifications (DashboardPreview.test.tsx):**

| Test | Type | Description |
|---|---|---|
| CTA uses canonical Pattern 2 chrome | unit | Find Link/button by name "Create a Free Account". className contains `bg-white` AND `px-8` AND `py-3.5` AND `min-h-[44px]`. |
| CTA does NOT use gradient fill | unit | Element does NOT have inline style with `WHITE_PURPLE_GRADIENT` background. |
| CTA has canonical drop shadow | unit | className contains `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| CTA has canonical hover shadow | unit | className contains `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| CTA preserves mobile full-width treatment | unit | className contains `w-full sm:w-auto`. |
| CTA does NOT use deprecated focus-visible:ring-primary | unit | className does NOT contain `focus-visible:ring-primary` (without `-lt` suffix). |

**Expected state after completion:**

- [ ] CTA migrated to canonical Pattern 2
- [ ] Gradient fill removed
- [ ] Mobile full-width preserved
- [ ] Touch target explicit
- [ ] 6 test assertions

---

### Step 7: DashboardPreview aria-labelledby

**Objective:** Migrate the DashboardPreview `<section>` aria attribute from `aria-label` to `aria-labelledby` referencing the SectionHeading h2 id.

**Files to modify:**

- `frontend/src/components/homepage/DashboardPreview.tsx`

**Details:**

Current state (line 153-167 approximately):

```tsx
<section aria-label="Dashboard preview">
  <div ref={ref} className="...">
    <SectionHeading
      topLine="See How"
      bottomLine="You're Growing"
      tagline="..."
    />
    {/* rest */}
  </div>
</section>
```

Verify the SectionHeading component renders an h2 with an id. If yes, reuse that id. If not, add an `id` prop pass-through:

```tsx
<section aria-labelledby="dashboard-preview-heading">
  <div ref={ref} className="...">
    <SectionHeading
      id="dashboard-preview-heading"
      topLine="See How"
      bottomLine="You're Growing"
      tagline="..."
    />
    {/* rest */}
  </div>
</section>
```

If SectionHeading doesn't accept an `id` prop, this requires a small extension to SectionHeading — out of Spec 13 scope. Alternative: wrap SectionHeading's h2 with an inline span+id, but that's fragile.

Best approach: read SectionHeading.tsx, check whether it already accepts `id` prop. If yes, pass it through. If no, the SectionHeading id pattern would need extending — which extends Spec 13 scope into SectionHeading. **Direction call during execution:** if SectionHeading doesn't accept id, use `useId()` and pass to a custom h2 wrapper, OR document the limitation and defer to a SectionHeading extension spec.

**Recommended:** verify SectionHeading accepts an `id` prop FIRST. If yes, simple pass-through. If no, defer the aria-labelledby migration on DashboardPreview (keep `aria-label`) and document for a later spec.

**Auth gating:** N/A.

**Responsive behavior:** No change.

**Inline position expectations:** No change.

**Guardrails (DO NOT):**

- DO NOT extend SectionHeading component if it doesn't accept an id prop. Out of Spec 13 scope.
- DO NOT remove the DashboardPreview `aria-label` until `aria-labelledby` is verified to resolve correctly.

**Test specifications (DashboardPreview.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Section uses aria-labelledby (if SectionHeading accepts id) | unit | Section element has `aria-labelledby` attribute pointing to a real element id. |
| If aria-labelledby not feasible, aria-label preserved | unit | Section element has `aria-label="Dashboard preview"` (fallback). |

**Expected state after completion:**

- [ ] Section uses canonical aria-labelledby IF SectionHeading supports id
- [ ] OR fallback to existing aria-label IF SectionHeading needs extending
- [ ] 1 test assertion (whichever path applied)

---

### Step 8: RegisterPage "Create Your Account" CTA alignment

**Objective:** Align both `/register` "Create Your Account" CTAs (line 163-169 hero + line 379-385 final) to canonical Pattern 2 attributes. Preserve `animate-shine`.

**Files to modify:**

- `frontend/src/pages/RegisterPage.tsx`

**Details:**

Current state (both occurrences):

```tsx
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
>
  Create Your Account
</button>
```

Replace both with canonical Pattern 2 + `animate-shine`:

```tsx
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
>
  Create Your Account
</button>
```

Changes:

- `py-4` → `py-3.5` (Pattern 2 padding)
- `text-lg` → `text-base sm:text-lg` (canonical responsive)
- `transition-colors duration-base` → `transition-all duration-200` (canonical Pattern 2 transition)
- `hover:bg-gray-100` → `hover:bg-white/90` (light-theme token → canonical)
- Add `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` (canonical hover shadow)
- `focus-visible:ring-primary-lt` → `focus-visible:ring-white/50` (canonical Pattern 2 ring color)
- PRESERVE `animate-shine` (Decision 9 — emotional weight at conversion peak)
- PRESERVE `disabled:opacity-50`
- PRESERVE `mt-8` positioning
- PRESERVE `active:scale-[0.98]` and `motion-reduce:transition-none`

Apply to BOTH occurrences (hero CTA at line 163-169, final CTA at line 379-385).

**Auth gating:** N/A (button opens auth modal — gate is in the modal itself).

**Responsive behavior:** `text-base` mobile → `text-lg` at sm+ (canonical Pattern 2). `mt-8` preserved.

**Inline position expectations:** Same.

**Guardrails (DO NOT):**

- DO NOT remove `animate-shine` (preservation).
- DO NOT remove `disabled:opacity-50`.
- DO NOT change the auth modal call (`openAuthModal(undefined, 'register')`).
- DO NOT change the button copy.
- DO NOT change the `mt-8` margin or other positioning.

**Test specifications (RegisterPage.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Both CTAs use canonical Pattern 2 padding | unit | Find both buttons by name "Create Your Account". Both classNames contain `py-3.5` AND do NOT contain `py-4`. |
| Both CTAs use responsive text sizing | unit | classNames contain `text-base` AND `sm:text-lg`. |
| Both CTAs use canonical hover bg (not gray-100) | unit | classNames contain `hover:bg-white/90` AND do NOT contain `hover:bg-gray-100`. |
| Both CTAs have canonical hover shadow | unit | classNames contain `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| Both CTAs use transition-all duration-200 | unit | classNames contain `transition-all duration-200`. |
| Both CTAs use canonical white focus ring | unit | classNames contain `focus-visible:ring-white/50` AND do NOT contain `focus-visible:ring-primary-lt`. |
| Both CTAs preserve animate-shine | unit | classNames contain `animate-shine`. |
| Both CTAs preserve disabled:opacity-50 | unit | classNames contain `disabled:opacity-50`. |

**Expected state after completion:**

- [ ] Both Create Your Account CTAs aligned to Pattern 2
- [ ] animate-shine preserved
- [ ] disabled state preserved
- [ ] Auth modal call unchanged
- [ ] 8 test assertions

---

### Step 9: FinalCTA "Get Started — It's Free" CTA alignment

**Objective:** Align the FinalCTA primary CTA at `FinalCTA.tsx:51` (approximate) to canonical Pattern 2. Add explicit `min-h-[44px]`. Reconcile any other Pattern 2 attribute drift surfaced by recon.

**Files to modify:**

- `frontend/src/components/homepage/FinalCTA.tsx`

**Details:**

Read the current FinalCTA CTA implementation. Recon noted: "FinalCTA 'Get Started — It's Free' CTA: matches canonical Pattern 2 with one drift — missing `min-h-[44px]` explicit."

Apply the canonical Pattern 2 class string verbatim:

```tsx
<Link
  to="/register"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
>
  Get Started — It's Free
</Link>
```

Verify the actual current chrome and reconcile each attribute against this canonical string. The recon flagged only `min-h-[44px]` as missing; verify no other drift during execution.

**Auth gating:** N/A (link to public `/register`).

**Responsive behavior:** Same — Pattern 2 canonical responsive.

**Inline position expectations:** Same DOM position; same wrapper.

**Guardrails (DO NOT):**

- DO NOT change CTA copy ("Get Started — It's Free").
- DO NOT change destination route (`/register`).
- DO NOT change surrounding FinalCTA section structure.
- DO NOT modify the FinalCTA h2 or supporting copy.

**Test specifications (FinalCTA.test.tsx):**

| Test | Type | Description |
|---|---|---|
| CTA has explicit min-h-[44px] | unit | Find Link by name "Get Started — It's Free". className contains `min-h-[44px]`. |
| CTA matches canonical Pattern 2 padding | unit | className contains `px-8 py-3.5`. |
| CTA matches canonical Pattern 2 chrome | unit | className contains `bg-white` AND `text-hero-bg` AND `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| CTA matches canonical Pattern 2 hover | unit | className contains `hover:bg-white/90` AND `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| CTA matches canonical Pattern 2 focus ring | unit | className contains `focus-visible:ring-white/50`. |

**Expected state after completion:**

- [ ] FinalCTA CTA aligned to Pattern 2 verbatim
- [ ] Touch target explicit
- [ ] 5 test assertions

---

## Step Dependency Map

| Step | Depends on | Description |
|---|---|---|
| 1 | — | StartingPointQuiz container → FrostedCard |
| 2 | — | StartingPointQuiz answer options chrome migration |
| 3 | — | StartingPointQuiz Retake Quiz Caveat → Inter |
| 4 | — | StartingPointQuiz Result CTA → Pattern 2 |
| 5 | 1, 2 (changes a11y on the same component areas being modified — sequence after chrome lands) | StartingPointQuiz radiogroup pattern + a11y |
| 6 | — | DashboardPreview "Create a Free Account" CTA migration |
| 7 | 6 (free-rider on the same file) | DashboardPreview aria-labelledby |
| 8 | — | RegisterPage CTA alignment |
| 9 | — | FinalCTA CTA alignment |

**Suggested execution order (batched by file):**

1. **Pass 1 — StartingPointQuiz** (Steps 1, 2, 3, 4, 5): all five steps batch into a single edit pass on StartingPointQuiz.tsx. Run StartingPointQuiz.test.tsx after the pass.
2. **Pass 2 — DashboardPreview** (Steps 6, 7): single edit pass on DashboardPreview.tsx. Run DashboardPreview.test.tsx after.
3. **Pass 3 — RegisterPage** (Step 8): single edit pass on RegisterPage.tsx. Run RegisterPage.test.tsx after.
4. **Pass 4 — FinalCTA** (Step 9): single edit pass on FinalCTA.tsx. Run FinalCTA.test.tsx after.
5. **Pass 5 — Full regression**: `pnpm test`. Confirm baseline 9,470+ pass / 0 known fails.

---

## Acceptance Criteria

- [ ] StartingPointQuiz quiz container renders as `<FrostedCard>` (not hand-rolled glass), preserving bespoke `p-6 sm:p-8 lg:p-10` padding via className override
- [ ] StartingPointQuiz answer-option base border = `border-white/[0.12]` (canonical), hover border = `hover:border-white/[0.18]`
- [ ] StartingPointQuiz selected answer-option chrome = `bg-white/15 border-white/[0.18] text-white` (Spec 11A muted-white) — no purple tint
- [ ] StartingPointQuiz Retake Quiz button uses Inter (`font-sans text-xl font-semibold`), preserves `WHITE_PURPLE_GRADIENT` background-clip text fill via inline style
- [ ] StartingPointQuiz Result CTA matches canonical Pattern 2 verbatim (`px-8 py-3.5`, `min-h-[44px]`, drop shadow, hover shadow, `transition-all duration-200`, white focus ring, `active:scale-[0.98]`, `motion-reduce:transition-none`)
- [ ] StartingPointQuiz section uses `aria-labelledby` (referencing SectionHeading h2 id), not `aria-label`
- [ ] StartingPointQuiz question container has `role="radiogroup"` with `aria-labelledby` linking to question h3 id
- [ ] StartingPointQuiz answer options render with `role="radio"` and `aria-checked` reflecting selection state
- [ ] StartingPointQuiz arrow-key navigation works (Down/Right next, Up/Left previous, wrap at boundaries); Enter/Space selects focused option
- [ ] StartingPointQuiz progress label has `aria-live="polite" aria-atomic="true"` so screen readers announce question progression
- [ ] DashboardPreview "Create a Free Account" CTA matches canonical Pattern 2 verbatim, no `WHITE_PURPLE_GRADIENT` background, preserves `w-full sm:w-auto` mobile treatment
- [ ] DashboardPreview section uses `aria-labelledby` if SectionHeading accepts `id` prop; otherwise existing `aria-label` preserved with limitation documented
- [ ] RegisterPage both "Create Your Account" CTAs (hero + final) match canonical Pattern 2 attributes (`py-3.5`, `text-base sm:text-lg`, `transition-all duration-200`, `hover:bg-white/90`, `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`, `focus-visible:ring-white/50`); `animate-shine` and `disabled:opacity-50` preserved
- [ ] FinalCTA "Get Started — It's Free" CTA has explicit `min-h-[44px]` and matches canonical Pattern 2 verbatim
- [ ] StartingPointQuiz LIGHT variant code path untouched (dead code on homepage)
- [ ] StartingPointQuiz progress bar gradient (`bg-gradient-to-r from-purple-500 to-white/80`) preserved (decorative, not active state)
- [ ] HeroSection, TypewriterInput, JourneySection, StatsBar, DifferentiatorSection, GlowBackground, DashboardPreview locked preview cards all untouched
- [ ] Site chrome (Navbar, Layout, error boundaries) untouched (Spec 12 territory)
- [ ] AuthModal form chrome untouched (Forums Wave Phase 1 territory)
- [ ] `pnpm test` baseline maintained: 9,470+ pass / 0 known fails
- [ ] `pnpm tsc --noEmit -p tsconfig.json` clean
- [ ] `pnpm lint` clean
- [ ] Visual verification at desktop 1280px confirms StartingPointQuiz renders canonical FrostedCard chrome, muted-white selected options, Inter Retake Quiz, Pattern 2 Result CTA on `/`
- [ ] Visual verification at desktop 1280px confirms DashboardPreview CTA renders canonical white pill (no gradient fill) on both `/` and `/register`
- [ ] Visual verification at desktop 1280px confirms FinalCTA renders canonical Pattern 2 on `/`
- [ ] Visual verification at desktop 1280px confirms both `/register` "Create Your Account" CTAs render Pattern 2 with `animate-shine` preserved
- [ ] Mobile verification at 375px confirms touch targets and responsive sizing on `/` and `/register`
- [ ] Reduced-motion verification confirms `animate-shine`, glow-float orbs, transitions all respect motion preference
- [ ] Keyboard navigation smoke check (Tab into quiz, Arrow keys navigate options, Enter/Space selects) and screen reader smoke check confirm a11y improvements work

---

## Pre-MR checklist

Before opening MR (when Eric is ready to commit):

- [ ] `pnpm test` — full suite passes; baseline 9,470+ pass / 0 known fails (post-Spec-12 baseline maintained)
- [ ] `pnpm tsc --noEmit -p tsconfig.json` — clean
- [ ] `pnpm lint` — clean
- [ ] Visual verification at desktop 1280px on:
  - `/` — full scroll, all 7 sections render
  - `/` StartingPointQuiz section — quiz container renders canonical FrostedCard chrome; answer options render canonical muted-white selected state; Retake Quiz button renders Inter (not Caveat) gradient text; Result CTA renders Pattern 2 showstopper sizing
  - `/` DashboardPreview section — "Create a Free Account" CTA renders canonical white pill (no gradient fill)
  - `/` FinalCTA section — "Get Started — It's Free" CTA renders canonical Pattern 2
  - `/register` — full scroll, both "Create Your Account" CTAs render Pattern 2 with `animate-shine` preserved
  - `/register` — DashboardPreview section (mounted on register too) renders the migrated CTA
- [ ] Mobile verification at 375px viewport on `/` and `/register` — touch targets confirmed, responsive sizing works
- [ ] Reduced-motion verification (browser prefers-reduced-motion: reduce) — `animate-shine`, glow-float orbs, transitions all respect motion preference
- [ ] StartingPointQuiz keyboard navigation — Tab into question, Arrow keys navigate options, Enter/Space selects, focus visible on each option
- [ ] StartingPointQuiz screen reader smoke check (VoiceOver / NVDA) — question announced, options announced as radio with checked state, progression announced via aria-live
- [ ] DevTools Console — no new errors

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | StartingPointQuiz container → FrostedCard | [NOT STARTED] | | |
| 2 | StartingPointQuiz answer options muted-white | [NOT STARTED] | | |
| 3 | StartingPointQuiz Retake Quiz Caveat → Inter | [NOT STARTED] | | |
| 4 | StartingPointQuiz Result CTA → Pattern 2 | [NOT STARTED] | | |
| 5 | StartingPointQuiz radiogroup a11y | [NOT STARTED] | | |
| 6 | DashboardPreview CTA → Pattern 2 | [NOT STARTED] | | |
| 7 | DashboardPreview aria-labelledby | [NOT STARTED] | | |
| 8 | RegisterPage CTAs → Pattern 2 (preserve animate-shine) | [NOT STARTED] | | |
| 9 | FinalCTA → Pattern 2 | [NOT STARTED] | | |

---

## Out-of-scope reminder

- HeroSection (video, masks, h1, gradient — preserved per recon Decision D.2)
- TypewriterInput (preserved per recon Decision D.3)
- All glow orbs across all sections (preserved per recon Decision D.1)
- GlowBackground component (no new variants, no prop tuning)
- DashboardPreview locked preview cards (documented "Locked Preview Card Pattern")
- DifferentiatorSection cards (already canonical)
- JourneySection (squiggle SVGs and step list preserved)
- StatsBar (already canonical)
- SectionHeading (no extensions in Spec 13)
- StartingPointQuiz LIGHT variant (dead code on homepage)
- StartingPointQuiz progress bar gradient (decorative)
- AuthModal form chrome (Forums Wave Phase 1 territory)
- Site chrome — Navbar, Layout, error boundaries (Spec 12 just shipped)
- SiteFooter footer-link tightening (separate concern)
- BibleReader ReaderChrome (documented exception)
- Daily Hub HorizonGlow (Daily Hub-only)
- Audio engine, AudioProvider, audioReducer (Decision 24)
- RoutinesPage post-11c (preserved)
- Music feature surfaces (preserved)
- Forums Wave Phase 4+ surfaces (PrayerWallHero, profile surfaces)

---

## Pipeline

1. Eric reviews this brief
2. `/plan _specs/spec-13-homepage-polish.md` (CC's plan-from-jira2 or equivalent)
3. `/execute-plan _plans/<plan-filename>`
4. `/verify-with-playwright /` — verify homepage chrome at desktop 1280px AND mobile 375px
5. `/verify-with-playwright /register` — verify register page chrome (DashboardPreview is also rendered here)
6. `/code-review _plans/<plan-filename>`
7. Eric commits when satisfied

After Spec 13 ships, the visual rollout closes. Every chrome surface in the app matches Round 3.

Stay on `forums-wave-continued`. CC does NOT commit, push, or branch — Eric handles all git operations manually.
