# Implementation Plan: Spec 13 — Homepage Chrome Polish

**Spec:** `_specs/spec-13-homepage-polish.md`
**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/homepage-2026-05-07.md` (loaded)
**Master Spec Plan:** not applicable (Spec 13 is a standalone polish spec at the close of the visual rollout)

---

## Affected Frontend Routes

- `/` (Home — logged-out renders the landing page; logged-in renders Dashboard, untouched here)
- `/register` (RegisterPage — DashboardPreview is also mounted here, so Decisions 3 + 11 affect this route transitively)

---

## Architecture Context

### Files to modify (production)

- `frontend/src/components/StartingPointQuiz.tsx` (430 lines) — Decisions 4, 5, 6, 7, 11. Five steps batched into a single edit pass.
- `frontend/src/components/homepage/DashboardPreview.tsx` (252 lines) — Decisions 3, 11. Two steps batched.
- `frontend/src/components/homepage/FinalCTA.tsx` (60 lines) — Decision 10. Single step.
- `frontend/src/pages/RegisterPage.tsx` (~397 lines) — Decision 9. Two CTA occurrences (line 163-169 hero + line 379-385 final), single step.

### Files to modify (tests)

- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — extend with ~32 assertions across Steps 1-5
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — extend with ~7 assertions (Steps 6-7)
- `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx` — extend with ~5 assertions (Step 9)
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — extend with ~8 assertions (Step 8)

### Files this spec does NOT touch

- `frontend/src/components/HeroSection.tsx`, `frontend/src/components/TypewriterInput.tsx`, `frontend/src/components/homepage/GlowBackground.tsx`, `frontend/src/components/homepage/JourneySection.tsx`, `frontend/src/components/homepage/StatsBar.tsx`, `frontend/src/components/homepage/DifferentiatorSection.tsx`, `frontend/src/components/homepage/SectionHeading.tsx`, `frontend/src/components/homepage/FrostedCard.tsx`, `frontend/src/pages/Home.tsx` — preserved (recon decisions D.1-D.4 + Decision 1).
- `frontend/src/components/prayer-wall/AuthModal.tsx` — out of scope (Forums Wave Phase 1 territory).
- All site chrome (Navbar, Layout, error boundaries) — Spec 12 just shipped, preserved.
- All audio engine, BibleReader, Daily Hub HorizonGlow, RoutinesPage, Music surfaces.

### Patterns and primitives used by this spec

- **Canonical white-pill Pattern 2** verbatim string (used for Decisions 3, 7, 9, 10):

  ```text
  inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none
  ```

- **`<FrostedCard>` component** — `frontend/src/components/homepage/FrostedCard.tsx` (NOT `frontend/src/components/FrostedCard.tsx` — that path doesn't exist; the file lives in `homepage/`). Default variant is `default` (Tier 1): `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`. Accepts `className` prop merged via `cn()` (clsx + tailwind-merge — last-class-wins for conflicting padding utilities). Used for Decision 4.
- **Spec 11A muted-white active state** — `bg-white/15 border-white/[0.18] text-white`. Used for Decision 5.
- **`WHITE_PURPLE_GRADIENT` constant** — exported from `@/constants/gradients`. Used as background-clip text fill via inline `style` block. Preserved for Decision 6.
- **`useId()` from React 19** — for generating unique question heading IDs in the radiogroup pattern (Decision 11). Already available in this React 19 project.
- **`SectionHeading` `id` prop** — verified present (`SectionHeading.tsx:11,21,28,41`). Renders as the `id` on the `<h2>` element. DashboardPreview can pass `id="dashboard-preview-heading"` and use `aria-labelledby` referencing it.

### Auth gating patterns (existing, preserved)

- DashboardPreview "Create a Free Account" CTA: `<button onClick>` calling `authModal?.openAuthModal(undefined, 'register')` (verified `DashboardPreview.tsx:233-246`). NOT a `<Link to="/register">` despite the spec's Step 6 example — the spec parenthetical at line 750 acknowledges this: "verify whether the CTA is a button or Link in the actual code; if so, keep as button." **Keep as button.**
- FinalCTA "Get Started — It's Free" CTA: `<button onClick>` calling `authModal?.openAuthModal(undefined, 'register')` (verified `FinalCTA.tsx:48-54`). NOT a `<Link>`. **Keep as button.**
- RegisterPage hero + final CTAs: `<button onClick>` calling `authModal?.openAuthModal(undefined, 'register')` (verified `RegisterPage.tsx:163-169` + `RegisterPage.tsx:379-385`). Both already buttons. Both preserve `animate-shine` and `disabled:opacity-50`.
- StartingPointQuiz Result CTA: `<Link to={destination.route}>` (verified `StartingPointQuiz.tsx:364-373`). Stays a Link.

### Test patterns to match

- Vitest + React Testing Library, jsdom
- `MemoryRouter` wrapping for components that use `<Link>` (verified in existing `StartingPointQuiz.test.tsx`)
- `userEvent.setup()` for click + keyboard interactions
- `vi.mock('@/hooks/useScrollReveal')` and `vi.mock('@/hooks/useReducedMotion')` to bypass scroll observer + reduced-motion gating in tests (verified in existing test file)
- For DashboardPreview / RegisterPage / FinalCTA tests: `AuthModalProvider` wrapping is required because all three call `useAuthModal()` — verify each existing test file's provider setup

### Critical pre-execution notes

- **The StartingPointQuiz `<section>` already uses `aria-labelledby="quiz-heading"`** (verified `StartingPointQuiz.tsx:170`) and `SectionHeading` already renders `id="quiz-heading"` on the `<h2>` (verified `StartingPointQuiz.tsx:183` passing `id="quiz-heading"` and `SectionHeading.tsx:28` rendering it). **Step 5a is already done — no migration required.** Add a regression test asserting the current state.
- **The dark-variant Result section is wrapped in `<FrostedCard>` already** (verified `StartingPointQuiz.tsx:131-138`). Step 4 modifies the inner Link's chrome only. Do NOT remove the FrostedCard wrapper around ResultCard — it's load-bearing for the result tier visual.
- **The DashboardPreview CTA currently uses `WHITE_PURPLE_GRADIENT` background via inline `style`** (verified `DashboardPreview.tsx:243`). Removing the inline `style` is part of Step 6.
- **The FinalCTA CTA already has most of Pattern 2** (verified `FinalCTA.tsx:51`) — drift is `min-h-[44px]` missing, `inline-flex items-center gap-2` missing, `duration-base` (should be `duration-200`), `focus-visible:ring-primary` (should be `ring-white/50`), missing `focus-visible:ring-offset-hero-bg`. Step 9 reconciles all five drifts to the canonical Pattern 2 string verbatim.
- **The LIGHT variant of StartingPointQuiz is dead code on the homepage** (`Home.tsx` only renders `<StartingPointQuiz />` with default `variant="dark"`). All five StartingPointQuiz steps (1-5) only modify the `isDark === true` branches.
- **Pre-existing test baseline:** post-Spec-12, 9,470+ pass / 0 known fails. Spec 13 must maintain.

---

## Auth Gating Checklist

Spec 13 introduces NO new auth gates. Every existing gate is preserved.

| Action | Auth required | Path | Planned in step |
|---|---|---|---|
| Tap DashboardPreview "Create a Free Account" | Auth modal opens | `authModal?.openAuthModal(undefined, 'register')` | Step 6 (chrome change only — auth flow preserved) |
| Tap RegisterPage hero "Create Your Account" | Auth modal opens | `authModal?.openAuthModal(undefined, 'register')` | Step 8 (chrome change only) |
| Tap RegisterPage final "Create Your Account" | Auth modal opens | `authModal?.openAuthModal(undefined, 'register')` | Step 8 (chrome change only) |
| Tap FinalCTA "Get Started — It's Free" | Auth modal opens | `authModal?.openAuthModal(undefined, 'register')` | Step 9 (chrome change only) |
| Tap StartingPointQuiz answer option | NO | local quiz state | Steps 2 + 5 |
| Tap StartingPointQuiz Retake Quiz | NO | local quiz state reset | Step 3 |
| Tap StartingPointQuiz Result CTA | NO | `<Link to={destination.route}>` | Step 4 |

All auth-gated actions retain their existing `useAuthModal()` invocation. Tests for Steps 6, 8, and 9 must verify the click handler still fires `openAuthModal(undefined, 'register')` after the chrome migration.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|---|---|---|---|
| StartingPointQuiz container | wrapping component | `<FrostedCard className="relative mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">` | Decision 4 |
| FrostedCard default tier base | bg + border + radius + padding | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `FrostedCard.tsx:36` |
| StartingPointQuiz answer option base | bg + border | `bg-white/[0.05] border-white/[0.12]` (border bumped from `[0.08]`) | Decision 5 |
| StartingPointQuiz answer option hover | bg + border | `hover:bg-white/[0.08] hover:border-white/[0.18]` | Decision 5 |
| StartingPointQuiz answer option selected | bg + border + text | `bg-white/15 border-white/[0.18] text-white` | Decision 5 / Spec 11A muted-white |
| StartingPointQuiz Retake Quiz button | font + size + weight | `font-sans text-xl font-semibold` (replaces `font-script font-normal`) | Decision 6 |
| StartingPointQuiz Retake Quiz button | gradient text | `style={{ background: WHITE_PURPLE_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}` | Decision 6 (preserved) |
| StartingPointQuiz Retake Quiz transition | className addition | `duration-base motion-reduce:transition-none` (BB-33 token + safety net) | Decision 6 |
| StartingPointQuiz Result CTA, DashboardPreview CTA, FinalCTA CTA, RegisterPage CTAs | full chrome | Pattern 2 verbatim (see Architecture Context) | Decisions 3, 7, 9, 10 |
| RegisterPage CTA preservation | additional classes | `animate-shine` and `disabled:opacity-50` (NOT in Pattern 2 verbatim — preserve as additive) | Decision 9 |
| DashboardPreview CTA preservation | additional classes | `w-full sm:w-auto justify-center` (NOT in Pattern 2 verbatim — preserve mobile full-width) | Decision 3 |
| StartingPointQuiz section ARIA | already correct | `aria-labelledby="quiz-heading"` (already present at line 170) | Decision 11 (no migration needed) |
| StartingPointQuiz QuestionCard wrapper | role + ARIA | `role="radiogroup" aria-labelledby={questionId}` (questionId from `useId()`) | Decision 11 |
| StartingPointQuiz answer option | role + ARIA | `role="radio" aria-checked={isSelected ? 'true' : 'false'}` (replaces `aria-pressed`) | Decision 11 |
| StartingPointQuiz progress label | ARIA | `aria-live="polite" aria-atomic="true"` on the `<p>Question N of 5</p>` | Decision 11 |
| DashboardPreview section ARIA | migration | `aria-labelledby="dashboard-preview-heading"` (replaces `aria-label="Dashboard preview"`) — pass `id="dashboard-preview-heading"` to SectionHeading | Decision 11 |

---

## Design System Reminder

These project-specific quirks `/execute-plan` displays before each UI step. Patterns documented here have caused past bugs.

- **Worship Room canonical white-pill Pattern 2** uses `duration-200` (Tailwind raw `200ms`), NOT `duration-base` (250ms). Do not substitute one for the other — the canonical Pattern 2 string in `09-design-system.md` § "White Pill CTA Patterns" specifies `duration-200`.
- **Pattern 2 focus ring is white**: `focus-visible:ring-white/50` with `focus-visible:ring-offset-hero-bg`. Older CTAs used `focus-visible:ring-primary` or `focus-visible:ring-primary-lt` — both are drift, both must be replaced during this spec.
- **`min-h-[44px]` is mandatory** on every Pattern 2 CTA. The 44px touch target floor is project-wide non-negotiable. Pattern 2 explicitly includes it.
- **`inline-flex items-center gap-2`** on every Pattern 2 CTA. Plain `<button>` without `inline-flex` rounds differently and the canonical icon-text gap of `gap-2` defines correct spacing for any current/future icon adjacent to the button text.
- **`active:scale-[0.98]` press feedback** is canonical on ~30 CTAs site-wide. Pattern 2 includes it. Do not omit.
- **`motion-reduce:transition-none`** is the safety-net class on Pattern 2 CTAs. The global `prefers-reduced-motion` rule in `frontend/src/styles/animations.css` already handles site-wide animation cancellation; this class is the per-element belt-and-suspenders for transitions specifically.
- **GRADIENT_TEXT_STYLE for headings** uses `background-clip: text` + `WebkitTextFillColor: transparent`. The Retake Quiz button's gradient text uses the same technique via inline `style`. The inline-style block is load-bearing because Tailwind's `bg-gradient-to-r` does not include the `background-clip: text` directive.
- **Caveat font is deprecated for headings** (only the logo still uses it). Decision 6 removes the last Caveat usage on the homepage from the dark-variant Retake Quiz button.
- **Saturated decorative tints (purple-500/20, purple-500/30) are NOT canonical active states.** Spec 11A established muted-white (`bg-white/15 border-white/[0.18]`) as the canonical active state for selectable list items. Step 2 closes this drift on StartingPointQuiz answer options. The progress bar's `bg-gradient-to-r from-purple-500 to-white/80` IS preserved (Step 2 guardrail) — it's a decorative gradient on a progress affordance, not an active state.
- **`<FrostedCard>` lives at `homepage/FrostedCard.tsx`**, not `components/FrostedCard.tsx`. The spec body refers to "frontend/src/components/FrostedCard.tsx" but that path does not exist; the canonical import is `import { FrostedCard } from '@/components/homepage/FrostedCard'`.
- **`<FrostedCard className="...">` merges via `cn()` (clsx + tailwind-merge).** Last-class-wins for conflicting Tailwind utilities. Passing `className="p-6 sm:p-8 lg:p-10"` correctly overrides the default `p-6` from the FrostedCard variant — the `cn()` merge resolves to the override at all three breakpoints, not stacking.
- **`<FrostedCard>` default variant already includes `transition-all motion-reduce:transition-none duration-base ease-decelerate`** (FrostedCard.tsx:78). The wrapping component className override does NOT need to add transition utilities — they're inherited from the default.
- **The dark-variant Result section's FrostedCard wrapper** (StartingPointQuiz.tsx:131-138) is preserved in Step 4. Step 4 only changes the inner `<Link>` chrome.
- **Inline-style preservation discipline** for the Retake Quiz button: do NOT delete the `style={{ background: WHITE_PURPLE_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}` block. Decision 6 only changes the className.
- **DashboardPreview locked preview cards are intentional drift** (the documented "Locked Preview Card Pattern"). Steps 6 and 7 do NOT touch the 6 preview cards' chrome — only the section ARIA and the bottom CTA.

---

## Shared Data Models (from Master Plan)

Not applicable — Spec 13 is a standalone polish spec. No shared data models, no localStorage keys touched.

**localStorage keys this spec touches:** none.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | StartingPointQuiz container at `p-6`; CTAs render at `text-base` size; DashboardPreview CTA renders `w-full` (full-width); RegisterPage CTAs at `text-base`; touch targets all 44px+ |
| Tablet | 768px | StartingPointQuiz container at `sm:p-8`; CTAs render at `sm:text-lg` size; DashboardPreview CTA renders `sm:w-auto` (auto-width) |
| Desktop | 1440px | StartingPointQuiz container at `lg:p-10`; CTAs at `sm:text-lg`; full homepage stack visible |

No layout structure changes — only chrome alignment within existing structure. Pattern 2 responsive sizing (`text-base` mobile, `sm:text-lg` tablet+) is canonical.

---

## Inline Element Position Expectations

Spec 13 makes no inline-row layout changes. All elements maintain their existing positions within their parent containers. Only structural change: in Step 1, the hand-rolled `<div>` glass container is replaced with `<FrostedCard>` — children render identically; only the wrapper element changes.

For the Retake Quiz button (Step 3), font weight changes from `font-normal` → `font-semibold` may render text ~5-10% wider, but the button is centered and the surrounding layout has padding to absorb the width change. Verify no overflow at 375px mobile width.

**No inline-row layouts in this feature.** N/A — no Inline Element Position table needed.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|---|---|---|
| StartingPointQuiz container internal padding | `p-6 sm:p-8 lg:p-10` (preserved exactly via FrostedCard className override) | Decision 4 |
| StartingPointQuiz `<section>` py | `py-20 sm:py-28` (preserved on the `GlowBackground` wrapper) | StartingPointQuiz.tsx:172 |
| DashboardPreview CTA top margin (above CTA) | `mt-12 sm:mt-16` (on the wrapping div, preserved) | DashboardPreview.tsx:227 |
| DashboardPreview CTA → "It's free. No catch." copy | `mb-4` (preserved) | DashboardPreview.tsx:230 |
| FinalCTA `<section>` py | `py-20 sm:py-28` (preserved on `GlowBackground` wrapper) | FinalCTA.tsx:12 |
| FinalCTA CTA → tagline | `mt-8` (preserved) | FinalCTA.tsx:51 |
| RegisterPage hero CTA → "Already have an account?" | `mt-4` (preserved) | RegisterPage.tsx:170 |
| RegisterPage final CTA → "No credit card." | `mt-4` (preserved) | RegisterPage.tsx:386 |

No vertical-rhythm changes. Existing gaps preserved exactly.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `forums-wave-continued` is active (verified: `git branch --show-current` returns `forums-wave-continued`)
- [ ] Recent commits show specs 11A, 11B, 11c, 12 shipped (verified: `git log --oneline | head -5` shows `d9e7e30 spec-12 execution`, `b964a59 spec-11c execution`, `0ab97ce spec 11b`, `ddc284f spec 11a`)
- [ ] No uncommitted production changes in working tree (only `_specs/spec-13-homepage-polish.md` and `_plans/recon/homepage-2026-05-07.md` should be untracked)
- [ ] `pnpm test` baseline 9,470+ pass / 0 known fails (post-Spec-12)
- [ ] `<FrostedCard>` accepts `className` and merges via `cn()` correctly (verified: `FrostedCard.tsx:76-87`)
- [ ] `<FrostedCard>` default variant is Tier 1 (`bg-white/[0.07]`, `border-white/[0.12]`, `rounded-3xl`, `p-6`, `shadow-frosted-base`) (verified: `FrostedCard.tsx:36`)
- [ ] `WHITE_PURPLE_GRADIENT` constant exported from `@/constants/gradients` (verified — already imported in StartingPointQuiz.tsx:8 and DashboardPreview.tsx:5)
- [ ] `useId` from React 19 available (verified — React 19 is in this project)
- [ ] `SectionHeading` accepts `id` prop and renders it on the `<h2>` (verified: `SectionHeading.tsx:11,21,28,41`)
- [ ] No new dependencies needed
- [ ] All auth-gated actions from the spec are accounted for in the plan (yes — Step 6, 8, 9 preserve `openAuthModal` calls)
- [ ] Design system values are verified (every value in the Design System Values table is sourced from `09-design-system.md` § "White Pill CTA Patterns" or recon `homepage-2026-05-07.md`)
- [ ] Zero [UNVERIFIED] values in this plan
- [ ] No deprecated patterns used (no Caveat headings introduced — Decision 6 actually removes Caveat from Retake Quiz; no BackgroundSquiggle on Daily Hub; no GlowBackground on Daily Hub; no `animate-glow-pulse`; no cyan textarea borders; no italic Lora prompts; no soft-shadow 8px-radius cards on dark backgrounds; no PageTransition)
- [ ] Recon report `_plans/recon/homepage-2026-05-07.md` is the authoritative line-number source for current code locations

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| FrostedCard className override conflict with default `p-6` | Use `cn()` merge — last-class-wins for padding utilities | Tailwind merge canonical behavior; verified in FrostedCard.tsx:76-87 |
| Should the FrostedCard variant default (Tier 1) be used or should we pass `variant="default"` explicitly | Use default (omit `variant` prop) — same result, cleaner code | `variant = 'default'` is the FrostedCard default param value |
| StartingPointQuiz answer option in selected + hover state simultaneously | Selected state takes precedence (selected styles render after hover styles in `cn()` order) | Active state is the user's choice; hover is exploratory |
| Arrow-key nav on answer options when an option is already selected | Arrow keys move focus only — do NOT change selection. Enter/Space confirms focused option. | Standard WAI-ARIA radiogroup pattern |
| Arrow-key nav at first/last option | Wraps (last → first on Down/Right; first → last on Up/Left) | Standard WAI-ARIA radiogroup pattern |
| Tab key on answer options | Tab moves OUT of radiogroup to next focusable element (so users escape the group) | Standard WAI-ARIA radiogroup pattern |
| Should the radiogroup wrap the question h3 or just the option list | Wrap the entire question + options block (so `aria-labelledby` to the h3 makes the radiogroup name == the question) | Aligned with WAI-ARIA Authoring Practices for radiogroup naming |
| Result CTA promoted to Pattern 2 — what about the "Or explore all features" tertiary link below it | NO change. Tertiary text-link is intentionally not a primary CTA. Stays as-is. | Hierarchy preservation |
| RegisterPage CTA `animate-shine` interaction with Pattern 2 hover shadow | `animate-shine` is a continuous animation; hover shadow is event-based. Both run simultaneously without conflict. | Animation/transition independence |
| User with `prefers-reduced-motion` on RegisterPage CTA | `animate-shine` should be cancelled by the global reduced-motion safety net at `frontend/src/styles/animations.css`. The Pattern 2 `motion-reduce:transition-none` cancels the transition; the shine animation cancels via the global rule. | Global reduced-motion safety net handles it |
| StartingPointQuiz aria-live announcement on every question advance | `aria-live="polite"` defers to user idle moments — won't interrupt active screen reader speech | Standard live-region behavior |
| StartingPointQuiz on Result reveal — should aria-live announce completion | NO. The Result h3 announces via heading navigation; FrostedCard wrapper exists; no live-region needed for the result reveal. | Standard heading-tier announcement |
| DashboardPreview CTA migration affects `/register` AND `/` simultaneously | Yes. DashboardPreview is mounted on both routes. Both render the migrated CTA after Spec 13 ships. | Recon-flagged coupling — verify both during /verify-with-playwright |
| DashboardPreview CTA — keep `<button onClick>` or change to `<Link to="/register">` | KEEP as `<button onClick>` calling `openAuthModal(undefined, 'register')`. The spec's Step 6 example showed a Link form, but the actual code is a button + auth modal. Spec parenthetical line 750 acknowledges this. | Match actual code |
| FinalCTA CTA — keep `<button onClick>` or change to `<Link to="/register">` | KEEP as `<button onClick>` calling `openAuthModal(undefined, 'register')`. Same reasoning as DashboardPreview. | Match actual code |
| The current FrostedCard around ResultCard (StartingPointQuiz.tsx:131-138) — keep or remove during Step 4 | KEEP. The spec's Step 4 modifies only the inner `<Link>` chrome. The wrapping FrostedCard is the result tier visual and is load-bearing. | Step 4 scope = inner Link only |
| Section ARIA on StartingPointQuiz — migrate aria-label or already correct | ALREADY CORRECT. Verified at StartingPointQuiz.tsx:170 (`aria-labelledby="quiz-heading"`) + SectionHeading.tsx:28 (renders `id`). Add a regression test asserting the current state; no migration code needed. | Verified |
| Should the QuestionCard reactively recompute `useId()` per question | NO. `useId()` is called once per QuestionCard render. Each question instance gets its own ID via component remount on `key={currentQuestion}` (StartingPointQuiz.tsx:151). | React 19 `useId` semantics |
| Test for arrow-key nav: how to assert `document.activeElement` after fireEvent | Use `fireEvent.keyDown(focusedButton, { key: 'ArrowDown' })` from `@testing-library/react`, then assert `expect(secondOption).toHaveFocus()` | React Testing Library convention |
| Test for `WHITE_PURPLE_GRADIENT` style preservation on Retake Quiz | Use `getByRole('button', { name: /retake quiz/i })` then `expect(btn.style.background).toContain('linear-gradient')` AND `expect(btn.style.webkitBackgroundClip).toBe('text')` | jsdom inline-style serialization |

---

## Implementation Steps

### Step 1: StartingPointQuiz container — replace hand-rolled glass with `<FrostedCard>`

**Objective:** Replace the hand-rolled `<div>` (StartingPointQuiz.tsx:195-204) with `<FrostedCard>` in the dark variant only. Preserve bespoke `p-6 sm:p-8 lg:p-10` padding via className override.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx` — replace lines 195-204 (the dark-variant glass container) with `<FrostedCard>` invocation
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — add 5 assertions

**Details:**

The `FrostedCard` import already exists at line 11. No new imports.

Current state (StartingPointQuiz.tsx:195-204):

```tsx
{/* Frosted glass container */}
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
{/* Canonical frosted glass container — Tier 1 default variant with bespoke dialog-tier padding */}
<FrostedCard className="relative mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
  <div className="relative mx-auto max-w-[600px]">
    {quizContent}
  </div>
</FrostedCard>
```

The `cn()` merge inside FrostedCard resolves the className override correctly: the default `p-6` is overridden at every breakpoint by the explicit `p-6 sm:p-8 lg:p-10` chain (Tailwind merge: last-class-wins). The default tier 1 background, border, radius, and box-shadow remain. The `relative mx-auto max-w-3xl` classes are merged additively (no conflicts).

**LIGHT variant preservation:** Lines 209-232 (the `else` branch, light variant) are NOT modified. Specifically, the `<div className="relative mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">` at line 228 stays untouched.

**Auth gating:** N/A.

**Responsive behavior:**

- Desktop (1440px): FrostedCard renders at `lg:p-10` (40px padding all sides) — bespoke override wins over default `p-6`
- Tablet (768px): FrostedCard renders at `sm:p-8` (32px padding all sides)
- Mobile (375px): FrostedCard renders at `p-6` (24px padding all sides) — matches default

**Inline position expectations:** N/A — no inline-row layout in this step. Children render identically to before.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT variant container (lines 209-232).
- DO NOT change the inner `<div className="relative mx-auto max-w-[600px]">` wrapper — children layout preserved.
- DO NOT add a `variant` prop to FrostedCard. The default variant (Tier 1) is correct for this surface.
- DO NOT touch the surrounding `<GlowBackground variant="none" className="py-20 sm:py-28">` wrapper or the inline focused-glow orb at lines 174-180.
- DO NOT touch the SectionHeading at lines 182-189.
- DO NOT add `as="section"` to FrostedCard — the parent `<section id="quiz">` already provides the semantic landmark.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Container renders as FrostedCard component (DARK variant) | unit | After `render(<StartingPointQuiz />)`, the quiz section's first descendant matching the class pattern `rounded-3xl` should ALSO contain `bg-white/[0.07]` (FrostedCard default tier base, NOT the deprecated `bg-white/[0.04]`). |
| Container className contains the override padding chain | unit | The same element's className includes `p-6` AND `sm:p-8` AND `lg:p-10` (override chain) AND `mx-auto max-w-3xl` (additive). |
| Container does NOT use the deprecated bg | unit | The element's className does NOT contain `bg-white/[0.04]` and does NOT contain `border-white/[0.10]` (deprecated hand-rolled chrome). |
| Container has FrostedCard tier 1 border | unit | The element's className contains `border-white/[0.12]` (tier 1 default). |
| Inner max-w-[600px] wrapper preserved | unit | Children render inside a child `<div>` with className containing `relative mx-auto max-w-[600px]`. |

**Expected state after completion:**

- [ ] DARK-variant container migrated to `<FrostedCard>`
- [ ] LIGHT variant lines 209-232 untouched
- [ ] Bespoke `p-6 sm:p-8 lg:p-10` padding preserved via className override
- [ ] FrostedCard import already present (line 11) — no new import needed
- [ ] 5 test assertions passing in `StartingPointQuiz.test.tsx`

---

### Step 2: StartingPointQuiz answer options — migrate to canonical muted-white active state

**Objective:** Migrate the dark-variant answer-option chrome (StartingPointQuiz.tsx:298-304) — base border bumped, hover border bumped, selected state migrated from saturated purple to canonical muted-white.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx` — modify the conditional className at lines 298-304 (DARK branch only)
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — add 5 assertions

**Details:**

Current state (StartingPointQuiz.tsx:298-304):

```tsx
isSelected
  ? isDark
    ? 'bg-purple-500/20 border-purple-500/30 text-white'
    : 'border-primary bg-[#8B5CF620]'
  : isDark
    ? 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]'
    : 'border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5'
```

Replace the DARK branches with:

```tsx
isSelected
  ? isDark
    ? 'bg-white/15 border-white/[0.18] text-white'
    : 'border-primary bg-[#8B5CF620]'
  : isDark
    ? 'bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.18]'
    : 'border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5'
```

Changes (DARK branch only):

- Selected: `bg-purple-500/20 border-purple-500/30 text-white` → `bg-white/15 border-white/[0.18] text-white` (Spec 11A muted-white pattern)
- Unselected base border: `border-white/[0.08]` → `border-white/[0.12]` (canonical)
- Unselected hover border: `hover:border-white/[0.12]` → `hover:border-white/[0.18]` (canonical)
- Unselected base bg `bg-white/[0.05]`: preserved
- Unselected hover bg `hover:bg-white/[0.08]`: preserved

LIGHT branch (lines `border-primary bg-[#8B5CF620]` and `border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5`) is NOT modified.

**Auth gating:** N/A.

**Responsive behavior:** No change — chrome migration only.

**Inline position expectations:** No change.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT branch.
- DO NOT modify the progress bar gradient (`bg-gradient-to-r from-purple-500 to-white/80` at line 95) — decorative, not active state.
- DO NOT change the focus-visible ring color (`focus-visible:ring-primary` at line 293) — out of scope; the Result CTA's focus ring change in Step 4 is unrelated.
- DO NOT change the `min-h-[44px]` touch target at line 295 (DARK branch padding utilities preserved).
- DO NOT modify the option button's `<span>` content rendering at lines 307-310.
- DO NOT change the Check icon rendering at lines 308-310.
- DO NOT change `aria-pressed` here — that migration to `aria-checked` happens in Step 5.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Unselected answer option uses canonical border opacity | unit | After `renderQuiz()`, the first answer-option button's className contains `border-white/[0.12]` AND does NOT contain `border-white/[0.08]`. |
| Unselected hover border canonical | unit | Same button's className contains `hover:border-white/[0.18]` AND does NOT contain `hover:border-white/[0.12]`. |
| Selected answer option uses canonical muted-white | unit | After clicking an option (and within the auto-advance timeout window or by stubbing the timeout), assert the just-selected option's className contains `bg-white/15` AND `border-white/[0.18]` AND `text-white` AND does NOT contain `bg-purple-500/20` AND does NOT contain `border-purple-500/30`. May require `vi.useFakeTimers()` to inspect the element before auto-advance fires. |
| Touch target preserved | unit | Unselected option className contains `min-h-[44px]`. |
| Base bg preserved | unit | Unselected option className contains `bg-white/[0.05]` AND `hover:bg-white/[0.08]`. |

**Expected state after completion:**

- [ ] DARK-variant base border + hover border migrated to canonical
- [ ] DARK-variant selected state migrated from saturated purple to canonical muted-white
- [ ] LIGHT branch untouched
- [ ] `min-h-[44px]` touch target preserved
- [ ] Progress bar gradient preserved (decorative)
- [ ] 5 test assertions passing

---

### Step 3: StartingPointQuiz Retake Quiz button — Caveat → Inter

**Objective:** Replace `font-script font-normal` with `font-sans font-semibold` on the dark-variant Retake Quiz button (StartingPointQuiz.tsx:404-416). Preserve `WHITE_PURPLE_GRADIENT` background-clip text fill via inline `style`. Add BB-33 `duration-base` token and `motion-reduce:transition-none` safety net.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx` — modify the className on the dark-variant Retake Quiz button at line 407 (the `<button>` element opens at 404, className at 407)
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — add 6 assertions

**Details:**

Current state (StartingPointQuiz.tsx:403-416):

```tsx
{isDark ? (
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
) : (
  // ... LIGHT variant (line 418-425) — leave untouched
)}
```

Replace the DARK variant className with:

```tsx
className="inline-flex min-h-[44px] items-center pb-1 font-sans text-xl font-semibold transition-colors duration-base hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
```

Changes (DARK branch only):

- `font-script` → `font-sans` (Inter)
- `font-normal` → `font-semibold`
- Add `duration-base` BB-33 token (current `transition-colors` lacks duration — added for canonical consistency)
- Add `motion-reduce:transition-none` (defensive safety net)
- Inline `style` block preserved verbatim (gradient text fill via `background-clip: text`)
- All other classes preserved: `inline-flex min-h-[44px] items-center pb-1 text-xl transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`

LIGHT variant (lines 418-425): leave untouched (Caveat usage on dead-code path; defer cleanup).

**Auth gating:** N/A.

**Responsive behavior:** Same — `text-xl` at all breakpoints. Font weight bump from `font-normal` → `font-semibold` may render text ~5-10% wider; the button is centered with surrounding margin, no overflow expected at 375px.

**Inline position expectations:** Same — `inline-flex min-h-[44px]`.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT branch (lines 418-425).
- DO NOT remove the inline `style` block — load-bearing for gradient text rendering.
- DO NOT change `text-xl` size.
- DO NOT change `min-h-[44px]` touch target.
- DO NOT change `focus-visible:ring-primary` — out of scope.
- DO NOT change the button copy "Retake Quiz".

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Retake Quiz button uses Inter font | unit | After advancing through all 5 questions to the result, find button by `getByRole('button', { name: /retake quiz/i })`. className contains `font-sans` AND does NOT contain `font-script`. |
| Retake Quiz button uses semibold weight | unit | Same button's className contains `font-semibold` AND does NOT contain `font-normal`. |
| Retake Quiz button preserves gradient text via inline style | unit | Same button's `style.background` contains `linear-gradient` (or `WHITE_PURPLE_GRADIENT`'s exact CSS string), `style.backgroundClip` is `text`, `style.webkitBackgroundClip` is `text`, `style.webkitTextFillColor` is `transparent`. |
| Retake Quiz button uses BB-33 duration token | unit | Same button's className contains `duration-base`. |
| Retake Quiz button has motion-reduce safety net | unit | Same button's className contains `motion-reduce:transition-none`. |
| Retake Quiz button preserves min-h-[44px] | unit | Same button's className contains `min-h-[44px]`. |

**Expected state after completion:**

- [ ] Caveat removed from DARK Retake Quiz
- [ ] Inter font applied
- [ ] Semibold weight
- [ ] Gradient text preserved via inline style
- [ ] BB-33 duration-base token added
- [ ] motion-reduce safety net added
- [ ] LIGHT branch untouched
- [ ] 6 test assertions passing

---

### Step 4: StartingPointQuiz Result CTA — promote to Pattern 2

**Objective:** Promote the dark-variant Result CTA `<Link>` (StartingPointQuiz.tsx:364-373) to canonical Pattern 2 verbatim. Preserve `mx-6 mt-6` positioning. Preserve the wrapping FrostedCard around ResultCard.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx` — modify the `<Link>` at lines 364-373 (DARK branch of the result CTA conditional)
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — add 7 assertions

**Details:**

Current state (StartingPointQuiz.tsx:363-373, DARK branch):

```tsx
{isDark ? (
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
) : (
  // LIGHT variant lines 375-385 — leave untouched
)}
```

Replace the DARK Link with Pattern 2 verbatim, prefixed with the preserved positioning classes:

```tsx
<Link
  to={destination.route}
  className="mx-6 mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
>
  Go to {destination.ctaLabel}
</Link>
```

Changes (DARK branch only):

- `inline-block` → `inline-flex items-center gap-2`
- Add `min-h-[44px]`
- `px-6 py-3` → `px-8 py-3.5`
- Add `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
- `transition-colors duration-base` → `transition-all duration-200`
- Add `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`
- Add `sm:text-lg`
- `focus-visible:ring-primary` → `focus-visible:ring-white/50`
- Add `focus-visible:ring-offset-hero-bg`
- Add `active:scale-[0.98]`
- Add `motion-reduce:transition-none`
- `mx-6 mt-6` positioning prefix preserved
- `bg-white text-hero-bg font-semibold rounded-full text-base hover:bg-white/90` preserved
- The `cn()` call wrapping the className is dropped (no longer needed — single string)

LIGHT branch (lines 375-385): leave untouched.

**FrostedCard wrapper around ResultCard (lines 131-138):** preserved. Step 4 only changes the inner Link.

**Auth gating:** N/A.

**Responsive behavior:** `text-base` mobile → `text-lg` tablet+ (canonical Pattern 2 responsive). `mx-6 mt-6` positioning preserved at all breakpoints.

**Inline position expectations:** Same — Link renders as inline-flex with margin (effectively block-level via `mx-6`).

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT branch (lines 375-385).
- DO NOT change `mx-6 mt-6` positioning prefix.
- DO NOT change the `to={destination.route}` prop binding.
- DO NOT change the `Go to {destination.ctaLabel}` text content.
- DO NOT touch the "Or explore all features" tertiary link below this CTA (lines 387-400).
- DO NOT remove the wrapping FrostedCard at StartingPointQuiz.tsx:131-138.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Result CTA uses Pattern 2 sizing | unit | Advance to result. `getByRole('link', { name: /^go to /i })` (matches "Go to <ctaLabel>"). className contains `px-8` AND `py-3.5` AND `min-h-[44px]`. |
| Result CTA has canonical drop shadow | unit | Same Link's className contains `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| Result CTA has canonical hover shadow | unit | Same Link's className contains `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| Result CTA uses transition-all + duration-200 | unit | Same Link's className contains `transition-all duration-200` AND does NOT contain `duration-base` (in conjunction with transition-all on this element). |
| Result CTA uses canonical white focus ring | unit | Same Link's className contains `focus-visible:ring-white/50` AND does NOT contain `focus-visible:ring-primary`. |
| Result CTA has active:scale | unit | Same Link's className contains `active:scale-[0.98]`. |
| Result CTA does NOT use deprecated px-6 py-3 sizing | unit | Same Link's className does NOT contain ` px-6 ` (with surrounding spaces — guard against matching `px-6` as substring of `mx-6`) AND does NOT contain ` py-3 ` (similarly). |

**Expected state after completion:**

- [ ] Result CTA promoted to Pattern 2 verbatim
- [ ] `mx-6 mt-6` preserved
- [ ] LIGHT branch untouched
- [ ] FrostedCard wrapper at StartingPointQuiz.tsx:131-138 preserved
- [ ] 7 test assertions passing

---

### Step 5: StartingPointQuiz a11y — radiogroup pattern

**Objective:** Add WAI-ARIA radiogroup semantics to the question/answer interaction. Add `role="radiogroup"` + `aria-labelledby` on the question container; `role="radio"` + `aria-checked` on each option (replacing `aria-pressed`); arrow-key keyboard navigation with wrap; Enter/Space to select; `aria-live="polite"` on the progress label.

**Files to modify:**

- `frontend/src/components/StartingPointQuiz.tsx` — multiple regions (see below)
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — add 9 assertions

**Details:**

#### Step 5a — Section ARIA already correct (regression test only)

Verify StartingPointQuiz.tsx:170 already reads `<section id="quiz" aria-labelledby="quiz-heading">`. Verify SectionHeading.tsx:28 renders the `id` on the `<h2>`. Both confirmed during recon. **NO migration code required.** Add a regression test (in the test specifications below) asserting the section uses `aria-labelledby="quiz-heading"`.

#### Step 5b — QuestionCard radiogroup wrapper

Modify the QuestionCard component (lines 246-317). Add `useId` to the imports at line 1:

```tsx
import { useState, useRef, useCallback, useEffect, useId } from 'react'
```

Inside QuestionCard, add a `useId` call and an `optionRefs` ref array for keyboard nav:

```tsx
function QuestionCard({ questionIndex, selectedAnswer, onSelect, onBack, isDark }: QuestionCardProps) {
  const question = QUIZ_QUESTIONS[questionIndex]
  const questionId = useId()
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleAnswerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const optionsLen = question.options.length
      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % optionsLen
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          nextIndex = currentIndex === 0 ? optionsLen - 1 : currentIndex - 1
          break
        case ' ':
        case 'Enter':
          e.preventDefault()
          onSelect(currentIndex)
          return
        default:
          return
      }

      if (nextIndex !== null) {
        e.preventDefault()
        optionRefs.current[nextIndex]?.focus()
      }
    },
    [question.options.length, onSelect]
  )

  // ... rest of component
}
```

Wrap the question heading + answer options in a `role="radiogroup"` container. The wrap goes around the question h3 (line 274-279) and the answer-option list (lines 282-314). Replace the current `<div>` enclosing them (which currently is just the QuestionCard root `<div>` at line 250) with a structured wrapper:

The simplest and safest structural change: wrap the existing h3 + options block in a new inner `<div role="radiogroup" aria-labelledby={questionId}>`. Apply `id={questionId}` to the existing `<h3>`.

```tsx
return (
  <div>
    {/* Back button — unchanged at lines 252-271 */}
    <div className="px-6 pt-4">{/* ... */}</div>

    <div role="radiogroup" aria-labelledby={questionId}>
      {/* Question text */}
      <h3
        id={questionId}
        className={cn(
          'mb-4 px-6 pt-2 text-lg font-semibold sm:mb-6',
          isDark ? 'text-white' : 'text-text-dark'
        )}
      >
        {question.question}
      </h3>

      {/* Answer options */}
      <div className="flex flex-col gap-3 px-6 pb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          return (
            <button
              type="button"
              key={index}
              ref={(el) => { optionRefs.current[index] = el }}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(index)}
              onKeyDown={(e) => handleAnswerKeyDown(e, index)}
              className={cn(
                /* ... unchanged class chain from Step 2 ... */
              )}
            >
              <span>{option.label}</span>
              {isSelected && (
                <Check className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  </div>
)
```

Changes:

- Wrap the h3 + options list in `<div role="radiogroup" aria-labelledby={questionId}>`
- Add `id={questionId}` to the h3
- On each option button: REMOVE `aria-pressed={isSelected}` (line 290), ADD `role="radio"` + `aria-checked={isSelected}` + `onKeyDown={(e) => handleAnswerKeyDown(e, index)}` + `ref={(el) => { optionRefs.current[index] = el }}`
- The className conditional (Step 2's migration target) is preserved exactly

**Note on aria-pressed → aria-checked:** Per WAI-ARIA, `role="radio"` MUST use `aria-checked` (not `aria-pressed`). The migration is mandatory.

#### Step 5c — Progress label aria-live

Modify the progress label at lines 104-109. Change:

```tsx
<p className={cn(
  'mb-2 mt-3 text-center text-sm',
  isDark ? 'text-white' : 'text-text-light'
)}>
  Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
</p>
```

to:

```tsx
<p
  aria-live="polite"
  aria-atomic="true"
  className={cn(
    'mb-2 mt-3 text-center text-sm',
    isDark ? 'text-white' : 'text-text-light'
  )}
>
  Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
</p>
```

Add `aria-live="polite"` and `aria-atomic="true"`. No other changes.

**Auth gating:** N/A.

**Responsive behavior:** No change — ARIA attributes don't affect layout.

**Inline position expectations:** No change.

**Guardrails (DO NOT):**

- DO NOT modify the LIGHT branch.
- DO NOT change the question text or answer text content.
- DO NOT change the `onSelect` callback or its arguments — keyboard nav calls `onSelect(currentIndex)` with the same numeric arg as click handlers.
- DO NOT add `role="radiogroup"` to the outer `<section>` (that's `region` semantically — the section already has `aria-labelledby`).
- DO NOT remove existing `focus-visible:` chrome on option buttons.
- DO NOT change the auto-advance behavior — keyboard Enter/Space triggers `onSelect`, which already has the auto-advance side-effect.
- DO NOT change the back button keyboard behavior (it's outside the radiogroup).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Section uses aria-labelledby (regression) | unit | Find the quiz section by `id="quiz"` (or via container query). It has `aria-labelledby="quiz-heading"`. SectionHeading h2 is found by id "quiz-heading". |
| Question container has role="radiogroup" with aria-labelledby | unit | Find element via `getByRole('radiogroup')`. Has `aria-labelledby` attribute. The referenced ID resolves to the question h3 element. |
| Answer options have role="radio" | unit | `getAllByRole('radio')` returns N buttons matching the current question's `options.length`. |
| Selected option has aria-checked="true" | unit | Click an option (within auto-advance window or with fake timers). That option element has `aria-checked="true"`; the others have `aria-checked="false"`. The `aria-pressed` attribute is NOT present on any of them. |
| ArrowDown moves focus to next option | unit | After `renderQuiz()`, focus the first option via `radioElements[0].focus()`. Fire `keyDown` with `{ key: 'ArrowDown' }`. Assert `radioElements[1]` has document focus. |
| ArrowUp from first option wraps to last | unit | Focus first option. Fire `keyDown` with `{ key: 'ArrowUp' }`. Assert the last `radioElements[radioElements.length - 1]` has focus. |
| Enter on focused option selects it | unit | Focus an option (e.g., index 1). Fire `keyDown` with `{ key: 'Enter' }`. After advancing for auto-advance (or stubbing), the next question OR result renders, AND the selected answer matches index 1's value when the result is computed. |
| Space on focused option selects it | unit | Same as Enter test but with `{ key: ' ' }`. |
| Progress label has aria-live + aria-atomic | unit | Find the `<p>Question 1 of 5</p>` element. Has attribute `aria-live="polite"` AND `aria-atomic="true"`. |

**Expected state after completion:**

- [ ] Section ARIA verified correct (regression test added)
- [ ] QuestionCard wrapped in `role="radiogroup"` with `aria-labelledby` to question h3 id
- [ ] `useId` import added to React imports
- [ ] Each option has `role="radio"` + `aria-checked` (replacing `aria-pressed`)
- [ ] Arrow keys navigate options with wrap; Enter/Space selects
- [ ] Progress label has `aria-live="polite" aria-atomic="true"`
- [ ] LIGHT branch untouched (radiogroup wraps both branches at the structural level — but the LIGHT-only chrome is preserved)
- [ ] 9 test assertions passing

---

### Step 6: DashboardPreview "Create a Free Account" CTA — migrate to Pattern 2

**Objective:** Migrate the hybrid `WHITE_PURPLE_GRADIENT` pill at DashboardPreview.tsx:233-246 to canonical Pattern 2. Preserve mobile full-width treatment (`w-full sm:w-auto`). Keep as `<button onClick>` calling `openAuthModal(undefined, 'register')` (NOT a Link).

**Files to modify:**

- `frontend/src/components/homepage/DashboardPreview.tsx` — modify the button at lines 233-246 (drop `cn()` wrapper since className becomes a single string; remove inline `style`)
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — add 6 assertions

**Details:**

Current state (DashboardPreview.tsx:233-246):

```tsx
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className={cn(
    'inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-hero-bg sm:w-auto',
    'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    'transition-all motion-reduce:transition-none hover:shadow-lg hover:brightness-110',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'active:scale-[0.98]'
  )}
  style={{ background: WHITE_PURPLE_GRADIENT }}
>
  Create a Free Account
</button>
```

Replace with (Pattern 2 verbatim + `w-full sm:w-auto justify-center` preserved as additive):

```tsx
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:w-auto sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
>
  Create a Free Account
</button>
```

Changes:

- Remove `style={{ background: WHITE_PURPLE_GRADIENT }}` inline style
- Add `bg-white` (solid white, canonical Pattern 2 fill)
- Drop `cn()` wrapper — className is now a single string
- `px-8 py-3` → `px-8 py-3.5`
- Add `min-h-[44px]`
- Add `gap-2` (canonical icon-text spacing)
- `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
- Add `hover:bg-white/90`
- `transition-all motion-reduce:transition-none` → `transition-all duration-200 ... motion-reduce:transition-none` (motion-reduce moved to end per Pattern 2 verbatim ordering)
- `hover:shadow-lg hover:brightness-110` → `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`
- Add `sm:text-lg` (canonical responsive)
- `focus-visible:ring-primary` → `focus-visible:ring-white/50`
- Add `focus-visible:ring-offset-hero-bg`
- Preserve `w-full sm:w-auto justify-center` (intentional mobile full-width treatment)
- Preserve `active:scale-[0.98]`
- Preserve `inline-flex items-center` (Pattern 2 default + the prior `items-center justify-center` reconciled to `inline-flex items-center justify-center`)

The `WHITE_PURPLE_GRADIENT` import at DashboardPreview.tsx:5 may become unused after this change — verify and remove if so. If still imported elsewhere in the file, leave it.

**Auth gating:** Preserved. `authModal?.openAuthModal(undefined, 'register')` invocation unchanged.

**Responsive behavior:**

- Desktop (1440px): `sm:w-auto` (auto-width pill); `sm:text-lg` (18px font)
- Tablet (768px): `sm:w-auto`; `sm:text-lg`
- Mobile (375px): `w-full` (full-width pill); `text-base` (16px font)

**Inline position expectations:** Same DOM position; same wrapper. No layout change beyond chrome.

**Guardrails (DO NOT):**

- DO NOT remove `w-full sm:w-auto justify-center` (intentional mobile treatment).
- DO NOT change the surrounding section structure or "It's free. No catch." copy at line 230.
- DO NOT remove `min-h-[44px]`.
- DO NOT change the auth modal call signature.
- DO NOT touch the 6 locked preview cards above this CTA (lines 188-223).
- DO NOT introduce a `<Link>` — keep as `<button onClick>`.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| CTA uses canonical Pattern 2 chrome | unit | After `render(<DashboardPreview />)` (with AuthModalProvider wrapping), find button by `getByRole('button', { name: /create a free account/i })`. className contains `bg-white` AND `px-8` AND `py-3.5` AND `min-h-[44px]`. |
| CTA does NOT use gradient fill | unit | Same button does NOT have inline `style.background` containing `linear-gradient` (the WHITE_PURPLE_GRADIENT inline style was removed). |
| CTA has canonical drop shadow | unit | Same button's className contains `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| CTA has canonical hover shadow | unit | Same button's className contains `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` AND does NOT contain `hover:shadow-lg` AND does NOT contain `hover:brightness-110`. |
| CTA preserves mobile full-width treatment | unit | Same button's className contains `w-full` AND `sm:w-auto` AND `justify-center`. |
| CTA does NOT use deprecated focus-visible:ring-primary | unit | Same button's className does NOT contain `focus-visible:ring-primary` (no suffix — the legacy class) AND contains `focus-visible:ring-white/50`. |
| CTA still triggers auth modal on click | unit | After clicking the button, the `openAuthModal` mock is called with `(undefined, 'register')`. |

**Expected state after completion:**

- [ ] CTA migrated to canonical Pattern 2 + `w-full sm:w-auto` preserved
- [ ] Inline `WHITE_PURPLE_GRADIENT` background style removed
- [ ] Auth modal call preserved
- [ ] Mobile full-width preserved
- [ ] Touch target explicit
- [ ] `WHITE_PURPLE_GRADIENT` import cleaned up if unused (verify before removing)
- [ ] 7 test assertions passing

---

### Step 7: DashboardPreview aria-labelledby

**Objective:** Migrate the DashboardPreview `<section aria-label="Dashboard preview">` (line 173) to `aria-labelledby="dashboard-preview-heading"` referencing the SectionHeading h2 id. Pass `id="dashboard-preview-heading"` to SectionHeading.

**Files to modify:**

- `frontend/src/components/homepage/DashboardPreview.tsx` — modify line 173 (section ARIA) and lines 180-184 (SectionHeading prop)
- `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx` — add 1 assertion (extend existing if any)

**Details:**

Current state (DashboardPreview.tsx:173-185):

```tsx
<section aria-label="Dashboard preview">
  <div ref={ref as React.RefObject<HTMLDivElement>} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
    {/* Heading */}
    <div
      className={cn('scroll-reveal', isVisible && 'is-visible')}
      style={staggerDelay(0, 100, 0)}
    >
      <SectionHeading
        topLine="See How You're"
        bottomLine="Growing"
        tagline="Create a free account and unlock your personal dashboard."
      />
    </div>
```

Replace with:

```tsx
<section aria-labelledby="dashboard-preview-heading">
  <div ref={ref as React.RefObject<HTMLDivElement>} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
    {/* Heading */}
    <div
      className={cn('scroll-reveal', isVisible && 'is-visible')}
      style={staggerDelay(0, 100, 0)}
    >
      <SectionHeading
        id="dashboard-preview-heading"
        topLine="See How You're"
        bottomLine="Growing"
        tagline="Create a free account and unlock your personal dashboard."
      />
    </div>
```

Changes:

- `aria-label="Dashboard preview"` → `aria-labelledby="dashboard-preview-heading"`
- Pass `id="dashboard-preview-heading"` to SectionHeading

SectionHeading.tsx already accepts and renders `id` (verified at line 11, 21, 28 — the topLine/bottomLine variant renders `<h2 id={id}>` at line 28).

**Auth gating:** N/A.

**Responsive behavior:** N/A (ARIA only).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT extend SectionHeading — already accepts `id` (verified during recon).
- DO NOT remove the section's `aria-label` AND leave the section without ANY accessible name (always do both edits in the same atomic change).
- DO NOT change the SectionHeading copy.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Section uses aria-labelledby | unit | After `render(<DashboardPreview />)`, find the `<section>` element. Has `aria-labelledby="dashboard-preview-heading"` AND does NOT have `aria-label`. The element with id `dashboard-preview-heading` resolves to an h2 (the SectionHeading's h2). |

**Expected state after completion:**

- [ ] Section ARIA migrated to `aria-labelledby`
- [ ] SectionHeading receives `id="dashboard-preview-heading"`
- [ ] 1 test assertion passing

---

### Step 8: RegisterPage "Create Your Account" CTA alignment (both occurrences)

**Objective:** Align both `/register` "Create Your Account" CTAs (RegisterPage.tsx:163-169 hero + 379-385 final) to canonical Pattern 2. Preserve `animate-shine` and `disabled:opacity-50` as additive classes.

**Files to modify:**

- `frontend/src/pages/RegisterPage.tsx` — modify line 166 (hero CTA className) and line 382 (final CTA className)
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — add 8 assertions

**Details:**

Current state (RegisterPage.tsx:166, hero):

```tsx
className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
```

Replace with (Pattern 2 verbatim + `animate-shine`, `mt-8`, `disabled:opacity-50`, `justify-center` preserved):

```tsx
className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
```

Changes (apply identically to both occurrences):

- `py-4` → `py-3.5` (Pattern 2 padding)
- `text-lg` → `text-base sm:text-lg` (canonical responsive — adds `sm:text-lg`, replaces `text-lg`)
- `transition-colors duration-base` → `transition-all duration-200`
- `hover:bg-gray-100` → `hover:bg-white/90`
- ADD `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` (canonical hover shadow)
- `focus-visible:ring-primary-lt` → `focus-visible:ring-white/50`
- Preserve `animate-shine` (Decision 9)
- Preserve `mt-8` positioning
- Preserve `min-h-[44px]`, `inline-flex items-center justify-center gap-2`, `rounded-full bg-white`, `px-8`, `text-hero-bg`, `font-semibold`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`, `active:scale-[0.98]`, `disabled:opacity-50`, `motion-reduce:transition-none`

Apply the SAME className replacement at line 166 AND line 382.

**Auth gating:** Preserved. Both buttons call `authModal?.openAuthModal(undefined, 'register')`.

**Responsive behavior:**

- Desktop (1440px): `sm:text-lg` (18px font)
- Tablet (768px): `sm:text-lg` (18px font)
- Mobile (375px): `text-base` (16px font)
- All breakpoints: `min-h-[44px]` touch target, `animate-shine` continuous animation

**Inline position expectations:** Same.

**Guardrails (DO NOT):**

- DO NOT remove `animate-shine` (Decision 9 explicitly preserves it).
- DO NOT remove `disabled:opacity-50`.
- DO NOT remove `mt-8`.
- DO NOT change the auth modal call.
- DO NOT change the button copy "Create Your Account".
- DO NOT modify either CTA in only one location — apply the change identically at both line 166 AND line 382.
- DO NOT touch the surrounding hero copy (lines 152-161) or final-CTA copy (lines 376-378).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Both CTAs use Pattern 2 padding | unit | After `render(<RegisterPage />)` (with AuthModalProvider wrapping), `getAllByRole('button', { name: /create your account/i })` returns exactly 2 buttons. Both classNames contain `py-3.5` AND do NOT contain `py-4`. |
| Both CTAs use responsive text sizing | unit | Both classNames contain `text-base` AND `sm:text-lg`. |
| Both CTAs use canonical hover bg | unit | Both classNames contain `hover:bg-white/90` AND do NOT contain `hover:bg-gray-100`. |
| Both CTAs have canonical hover shadow | unit | Both classNames contain `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| Both CTAs use transition-all duration-200 | unit | Both classNames contain `transition-all duration-200` AND do NOT contain `transition-colors`. |
| Both CTAs use canonical white focus ring | unit | Both classNames contain `focus-visible:ring-white/50` AND do NOT contain `focus-visible:ring-primary-lt`. |
| Both CTAs preserve animate-shine | unit | Both classNames contain `animate-shine`. |
| Both CTAs preserve disabled:opacity-50 | unit | Both classNames contain `disabled:opacity-50`. |

**Expected state after completion:**

- [ ] Both Create Your Account CTAs aligned to Pattern 2
- [ ] `animate-shine` preserved on both
- [ ] `disabled:opacity-50` preserved on both
- [ ] Auth modal call unchanged on both
- [ ] 8 test assertions passing

---

### Step 9: FinalCTA "Get Started — It's Free" CTA alignment

**Objective:** Align the FinalCTA primary CTA (FinalCTA.tsx:48-54) to canonical Pattern 2 verbatim. Add explicit `min-h-[44px]`. Reconcile the five drift attributes surfaced by recon.

**Files to modify:**

- `frontend/src/components/homepage/FinalCTA.tsx` — modify the className at line 51
- `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx` — add 5 assertions

**Details:**

Current state (FinalCTA.tsx:51):

```tsx
className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
```

Replace with Pattern 2 verbatim + `mt-8` preserved:

```tsx
className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] motion-reduce:transition-none"
```

Drift reconciliations (5 changes identified by recon):

- ADD `inline-flex items-center gap-2` (was missing — recon called this out as Pattern 2 attribute drift)
- ADD `min-h-[44px]` (was missing — recon's primary flag)
- `transition-all motion-reduce:transition-none duration-base` → `transition-all duration-200 ... motion-reduce:transition-none` (relocate motion-reduce to end per Pattern 2 verbatim ordering; replace `duration-base` with `duration-200`)
- `focus-visible:ring-primary` → `focus-visible:ring-white/50`
- ADD `focus-visible:ring-offset-hero-bg`
- Preserve `mt-8`, `bg-white`, `px-8 py-3.5 text-base font-semibold text-hero-bg`, `rounded-full`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`, `hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`, `sm:text-lg`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`, `active:scale-[0.98]`

**Auth gating:** Preserved. `authModal?.openAuthModal(undefined, 'register')` invocation unchanged.

**Responsive behavior:** Same as Pattern 2 canonical (text-base mobile, sm:text-lg tablet+).

**Inline position expectations:** Same DOM position. Adding `inline-flex` does not break the surrounding `staggerDelay`-driven scroll-reveal wrapper.

**Guardrails (DO NOT):**

- DO NOT change CTA copy "Get Started — It's Free".
- DO NOT change the auth modal call.
- DO NOT change surrounding FinalCTA section structure (h2 + tagline preserved).
- DO NOT modify the FinalCTA `<GlowBackground variant="none" className="py-20 sm:py-28">` wrapper at line 12.
- DO NOT introduce a `<Link>` — keep as `<button onClick>`.
- DO NOT change `mt-8`.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| CTA has explicit min-h-[44px] | unit | After `render(<FinalCTA />)` (with AuthModalProvider wrapping), find button by `getByRole('button', { name: /get started/i })`. className contains `min-h-[44px]`. |
| CTA matches canonical Pattern 2 padding | unit | Same button's className contains `px-8` AND `py-3.5`. |
| CTA matches canonical Pattern 2 chrome | unit | Same button's className contains `bg-white` AND `text-hero-bg` AND `shadow-[0_0_30px_rgba(255,255,255,0.20)]` AND `inline-flex` AND `items-center` AND `gap-2`. |
| CTA matches canonical Pattern 2 hover | unit | Same button's className contains `hover:bg-white/90` AND `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]`. |
| CTA matches canonical Pattern 2 focus ring | unit | Same button's className contains `focus-visible:ring-white/50` AND `focus-visible:ring-offset-hero-bg` AND does NOT contain `focus-visible:ring-primary` (no suffix — the legacy class). |
| CTA uses transition-all duration-200 | unit | Same button's className contains `transition-all duration-200` AND does NOT contain `duration-base`. |

**Expected state after completion:**

- [ ] FinalCTA CTA aligned to Pattern 2 verbatim
- [ ] All 5 recon-flagged drifts reconciled
- [ ] Touch target explicit
- [ ] `mt-8` preserved
- [ ] Auth modal call preserved
- [ ] 6 test assertions passing (one extra to cover transition-all/duration-200 reconciliation)

---

## Step Dependency Map

| Step | Depends on | Description |
|---|---|---|
| 1 | — | StartingPointQuiz container → FrostedCard (DARK only) |
| 2 | — | StartingPointQuiz answer-option chrome (DARK only) |
| 3 | — | StartingPointQuiz Retake Quiz Caveat → Inter (DARK only) |
| 4 | — | StartingPointQuiz Result CTA → Pattern 2 (DARK only) |
| 5 | 2 (touches the same option-button conditional Step 2 modifies — sequence after Step 2's chrome lands so the Step 5 ARIA changes layer on the canonical chrome) | StartingPointQuiz radiogroup pattern + a11y |
| 6 | — | DashboardPreview "Create a Free Account" CTA → Pattern 2 |
| 7 | 6 (free-rider on the same file — apply both edits in one pass) | DashboardPreview aria-labelledby |
| 8 | — | RegisterPage CTA alignment (both hero + final, identical edit) |
| 9 | — | FinalCTA → Pattern 2 |

**Suggested execution order (batched by file):**

1. **Pass 1 — StartingPointQuiz** (Steps 1, 2, 3, 4, 5): all five steps batch into a single edit pass on `frontend/src/components/StartingPointQuiz.tsx`. Run `pnpm test src/components/__tests__/StartingPointQuiz.test.tsx` after the pass.
2. **Pass 2 — DashboardPreview** (Steps 6, 7): single edit pass on `frontend/src/components/homepage/DashboardPreview.tsx`. Run `pnpm test src/components/homepage/__tests__/DashboardPreview.test.tsx`.
3. **Pass 3 — RegisterPage** (Step 8): single edit pass on `frontend/src/pages/RegisterPage.tsx` modifying both line 166 and line 382 identically. Run `pnpm test src/pages/__tests__/RegisterPage.test.tsx`.
4. **Pass 4 — FinalCTA** (Step 9): single edit pass on `frontend/src/components/homepage/FinalCTA.tsx`. Run `pnpm test src/components/homepage/__tests__/FinalCTA.test.tsx`.
5. **Pass 5 — Full regression**: `pnpm test` + `pnpm build` + `pnpm lint`. Confirm baseline 9,470+ pass / 0 known fails maintained.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | StartingPointQuiz container → FrostedCard (DARK only) | [COMPLETE] | 2026-05-07 | StartingPointQuiz.tsx + test.tsx (81/81 pass) |
| 2 | StartingPointQuiz answer options muted-white (DARK only) | [COMPLETE] | 2026-05-07 | StartingPointQuiz.tsx + test.tsx |
| 3 | StartingPointQuiz Retake Quiz Caveat → Inter (DARK only) | [COMPLETE] | 2026-05-07 | StartingPointQuiz.tsx + test.tsx |
| 4 | StartingPointQuiz Result CTA → Pattern 2 (DARK only) | [COMPLETE] | 2026-05-07 | StartingPointQuiz.tsx + test.tsx |
| 5 | StartingPointQuiz radiogroup a11y | [COMPLETE] | 2026-05-07 | StartingPointQuiz.tsx + test.tsx |
| 6 | DashboardPreview CTA → Pattern 2 | [COMPLETE] | 2026-05-07 | DashboardPreview.tsx + DashboardPreview.test.tsx + Home.test.tsx (aria-label→aria-labelledby) |
| 7 | DashboardPreview aria-labelledby | [COMPLETE] | 2026-05-07 | DashboardPreview.tsx (section ARIA + SectionHeading id) |
| 8 | RegisterPage CTAs → Pattern 2 (preserve animate-shine + disabled:opacity-50) | [COMPLETE] | 2026-05-07 | RegisterPage.tsx (both occurrences) + RegisterPage.test.tsx |
| 9 | FinalCTA → Pattern 2 | [COMPLETE] | 2026-05-07 | FinalCTA.tsx + FinalCTA.test.tsx |
