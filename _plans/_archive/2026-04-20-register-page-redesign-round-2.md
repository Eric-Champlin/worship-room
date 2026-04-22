# Implementation Plan: Register Page Redesign — Round 2

**Spec:** `_specs/register-page-redesign-round-2.md` (amendment to `_specs/register-page-redesign.md`)
**Date:** 2026-04-20
**Branch:** `claude/feature/register-page-redesign` (pre-existing — Round 2 stacks on top of Round 1 work already present on the branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured ~2 weeks ago, covers the visual vocabulary Register inherits from home/Local Support; none of the Round 2 changes depend on recon values — everything is either inline in the spec or derivable from the rule files)
**Recon Report:** N/A (polish amendment — no new recon)
**Master Spec Plan:** N/A — standalone feature polish

---

## Architecture Context

**Current state on the branch (Round 1 already in place, not yet committed per `git status`):**

- `frontend/src/pages/RegisterPage.tsx` (573 bytes uncommitted diff) — 5 pillar cards, hero wrapped in `<GlowBackground variant="center">`, all sections use the Round 1 "free forever" copy, the hero and final CTAs read "Create Your Free Account", the hero H1 reads "Your room is ready." with `GRADIENT_TEXT_STYLE` (no animation class), 8 differentiator items, final reassurance "No credit card. No trial period. Just peace.".
- `frontend/src/components/homepage/GlowBackground.tsx` — 112 lines. Variants: `center`, `left`, `right`, `split`, `none`. `GLOW_CONFIG` is a `const` object keyed by variant. Orbs render via `GlowOrbs` sub-component. The root wrapper is `<div className="relative overflow-clip bg-hero-bg ...">` with `children` inside a `<div className="relative z-10">` — **confirmed: children render in the z-10 layer, so `<StatsBar>` and `<DashboardPreview>` (which have their own internal `<GlowBackground>`) will layer harmlessly on top of the page wrapper with no z-index collision.**
- `frontend/src/components/homepage/FrostedCard.tsx` — 50 lines. **Accepts `className` prop and merges via `cn()` at line 43 — verified.** `h-full` can be passed directly. `active:scale-[0.98]`, hover lift, and focus ring are only applied when `onClick` is set (line 34 `isInteractive` check). Pillar and spotlight cards do NOT pass `onClick`, so the interactive hover lift from FrostedCard will NOT fire — Round 2 adds hover-lift via explicit `hover:-translate-y-0.5 transition-transform duration-base motion-reduce:transition-none` classes passed through `className`.
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — 265 lines. Wraps in `MemoryRouter + ToastProvider + AuthModalProvider`. Mocks `useAuth` and `useAuthModal`. **Currently asserts** Round 1 copy: "zero ads" (line 56), "everything included. free forever" (line 95), 5 pillar headings (lines 101-105), 8 differentiators with "free forever — no subscriptions" (line 156), "no ads. your worship time is sacred" (line 157), "Create Your Free Account" text with `toHaveLength(2)` (lines 196, 208, 247). **All of these are going to break after Round 2 copy edits and must be updated.**
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — 179 lines. Covers each variant's orb count and primary-orb opacity. Round 2 adds one new test case: `variant="fullPage"` renders 5 orbs with the specified top-position percentages.
- `frontend/src/index.css` — already imports `./styles/animations.css`, already defines `.scroll-reveal` + `.scroll-reveal-fade` utilities. New keyframes land here (preferred file per spec §4c). The universal reduced-motion safety net in `frontend/src/styles/animations.css` zeros `animation-duration` on `*::before/*::after`, so `.animate-shine::after` will auto-stop — but the spec also requires `opacity: 0` at reduced-motion so the frozen pseudo-element isn't visible. Include both.
- `frontend/tailwind.config.js` — defines `transitionDuration: { base: '250ms' }` and canonical easings (`standard`, `decelerate`, `accelerate`, `sharp`). **Confirms `duration-base` resolves to 250ms (not 300ms as `.claude/rules/09-design-system.md` states — the Tailwind config is the computed reality).**
- Lucide `Sparkles` is a valid import from `lucide-react` (used elsewhere in the codebase — verify during execution with a grep but it's a stock Lucide icon).

**Directory conventions:**
- Page tests at `frontend/src/pages/__tests__/*.test.tsx`.
- Homepage component tests at `frontend/src/components/homepage/__tests__/*.test.tsx`.
- Icons are named imports from `lucide-react`.

**Patterns to follow:**
- Everything stays inline in `RegisterPage.tsx` — no new component files per spec CRITICAL EXECUTION RULE #4.
- Data arrays (`PILLARS`, `SPOTLIGHTS`, `DIFFERENTIATORS`) stay as module-level `const ... as const` exported-free declarations.
- Animation classes applied alongside existing Tailwind utilities — no new Tailwind animation entries (keyframes land in raw CSS per spec §4c).
- `useScrollReveal` + `staggerDelay(index)` pattern — unchanged.

**Auth gating patterns:** No new gates. All inherited from Round 1 (hero + final CTA open auth modal in `'register'` mode, hero "Log in" link opens in `'login'` mode).

**localStorage keys this spec touches:** None. No reads, no writes, no new keys documented in `11-local-storage-keys.md`.

**Cross-spec dependencies:** None. StatsBar and DashboardPreview are consumed as-is from Round 1 (the 8-stat StatsBar was established in Round 1 already — visible in `frontend/src/components/homepage/StatsBar.tsx`).

---

## Auth Gating Checklist

Round 2 introduces **zero new auth gates.** All inherited from Round 1.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Hero "Create Your Account" CTA | Opens auth modal in `register` mode (inherited) | Step 3 (copy change only) | `authModal?.openAuthModal(undefined, 'register')` |
| Hero "Log in" link | Opens auth modal in `login` mode (inherited) | Step 4 (untouched logic) | `authModal?.openAuthModal(undefined, 'login')` |
| Final "Create Your Account" CTA | Opens auth modal in `register` mode (inherited) | Step 3 (copy change only) | `authModal?.openAuthModal(undefined, 'register')` |
| Hover over pillar/spotlight cards | Decorative 2px lift, no action | Step 6 | N/A — decorative only |
| Scroll / view page | Free, no auth required | All steps | N/A |

Every Round 2 acceptance criterion that touches interaction either (a) inherits from Round 1 untouched or (b) is decorative-only (hover lift, shimmer, shine, glow).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `fullPage` glow orb 1 (top) | opacity / color / size / position | 0.25 / `139, 92, 246` / `w-[300px] h-[300px] md:w-[600px] md:h-[600px]` / `top-[5%] left-1/2 -translate-x-1/2` | Spec §2a |
| `fullPage` glow orb 2 (upper-right) | opacity / color / size / position | 0.18 / `168, 130, 255` / `w-[250px] h-[250px] md:w-[450px] md:h-[450px]` / `top-[30%] left-[85%] -translate-x-1/2` | Spec §2a |
| `fullPage` glow orb 3 (mid-left) | opacity / color / size / position | 0.20 / `139, 92, 246` / `w-[280px] h-[280px] md:w-[500px] md:h-[500px]` / `top-[55%] left-[10%] -translate-x-1/2` | Spec §2a |
| `fullPage` glow orb 4 (lower-right) | opacity / color / size / position | 0.16 / `186, 156, 255` / `w-[250px] h-[250px] md:w-[400px] md:h-[400px]` / `top-[75%] left-[80%] -translate-x-1/2` | Spec §2a |
| `fullPage` glow orb 5 (bottom) | opacity / color / size / position | 0.22 / `139, 92, 246` / `w-[260px] h-[260px] md:w-[500px] md:h-[500px]` / `top-[92%] left-[50%] -translate-x-1/2` | Spec §2a |
| `gradient-shift` keyframe | duration / easing / iteration | 12s / `ease-in-out` / infinite | Spec §4c |
| `gradient-shift` helper class | `.animate-gradient-shift` adds `background-size: 200% 200%` + animation | — | Spec §4c |
| `shine` keyframe | duration / easing / delay / iteration | 6s / `ease-in-out` / 2s / infinite | Spec §4c |
| `shine` helper class | `.animate-shine` = `position: relative; overflow: hidden` + `::after` pseudo with 110° gradient sweep (`rgba(255,255,255,0.4)` at 50% stop) | — | Spec §4c |
| Hover-lift on pillar/spotlight cards | `transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5` | — | Spec §4d |
| `duration-base` token | 250ms | `frontend/tailwind.config.js:41` |
| DISCOVER pillar icon | Lucide `Sparkles` | size 32, `text-white`, `aria-hidden="true"` | Spec §3a + §Design Notes |
| Equal-height card mechanism | `<FrostedCard className="h-full">` + inner `<div className="flex h-full flex-col">` with `<ul className="mt-auto ...">` | — | Spec §3b (FrostedCard className passthrough verified at `FrostedCard.tsx:43`) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **Register page is the one exception to "Daily Hub uses HorizonGlow, not GlowBackground."** The register page is a logged-out marketing surface (not a Daily Hub tab) and GlowBackground is the correct primitive for it. The new `fullPage` variant is a legitimate extension.
- **Round 2 must not introduce deprecated patterns:** no `Caveat` font on headings (the H1 uses `GRADIENT_TEXT_STYLE` inline, and `animate-gradient-shift` is applied alongside it — NOT replacing it), no `animate-glow-pulse`, no cyan textarea glow, no `GlowBackground` on Daily Hub (Register is NOT Daily Hub — correct to use here), no hardcoded `200ms` / `cubic-bezier(...)` in component CSS (use `duration-base` token).
- **`FrostedCard` hover lift only fires when `onClick` is set.** Pillar and spotlight cards have no onClick, so the interactive hover from FrostedCard is inert. Round 2 adds hover-lift via explicit classes (`transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5`) passed through the `className` prop.
- **`duration-base` is 250ms per `tailwind.config.js:41`.** The `09-design-system.md` table listing `base: 300ms` is stale; the Tailwind config is the computed reality.
- **The canonical reduced-motion safety net lives in `frontend/src/styles/animations.css`** and applies `animation-duration: 0ms !important` to every element. The spec's per-keyframe `@media (prefers-reduced-motion: reduce) { animation: none; }` rules are redundant but harmless — include them as written in the spec so the file is self-documenting, AND include `opacity: 0` on `.animate-shine::after` at reduced-motion (per spec §4c — without this, the pseudo-element would freeze in a visible state instead of vanishing).
- **SiteFooter stays OUTSIDE the new `fullPage` GlowBackground wrapper.** Footer is meant to be solid, not glowy. Verify in Step 4 that the final JSX has `<SiteFooter />` as a sibling of `<GlowBackground>`, not a child.
- **StatsBar and DashboardPreview have their own internal `<GlowBackground>`.** Leave them untouched — they layer harmlessly because their parent `<GlowBackground variant="fullPage">` wraps children in a `z-10` layer, so their internal glow sits in the parent's `z-10` sub-layer and never conflicts.
- **`pnpm build` delta must be < 2 KB.** Two keyframes + Tailwind utility classes are essentially free. If the build grows >2 KB, something (a stray import, a forgotten dep) snuck in — stop and investigate.
- **The branch is `claude/feature/register-page-redesign`.** CC must not branch, merge, or rebase. If CC finds itself on any other branch when starting, STOP and surface to the user (spec CRITICAL EXECUTION RULE #3).

---

## Shared Data Models (from Master Plan)

N/A — no master plan, no shared data models, no new TypeScript interfaces.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Pillars stack 1 × 6; full-width CTAs; fullPage orbs at smaller `w-[250-300px] h-[250-300px]` sizes (no `md:` upgrade); hero H1 at `text-4xl`; differentiator list stacks single column within `max-w-2xl`. |
| Tablet | 768px | Pillars 2 × 3; spotlight 3-col (md:grid-cols-3); StatsBar 4-col; fullPage orbs transition to larger `md:w-[400-600px] md:h-[400-600px]` sizes via Tailwind `md:` prefix; hero H1 at `sm:text-5xl`. |
| Desktop | 1440px | Pillars 3 × 2 (clean grid, no orphan row); spotlight 3-col; StatsBar 4-col (8 stats → 4 × 2); fullPage orbs at full `md:` sizes; hero H1 at `lg:text-6xl`; max-width containers `max-w-6xl` (sections) / `max-w-4xl` (hero) / `max-w-3xl` (hook + callout) / `max-w-2xl` (differentiator list). |

**Custom breakpoints:** None introduced by Round 2.

---

## Inline Element Position Expectations

**Round 2 introduces no new inline-row layouts.** All new elements are block-level:

- Pillar cards are individual grid cells, not inline.
- Spotlight cards are individual grid cells, not inline.
- Differentiator rows are vertically stacked `flex items-start gap-3` rows — they're single-row per item (Check icon + paragraph) but not across items.
- Hero CTA + "Log in" link are vertically stacked, not inline.

**N/A — no cross-element inline-row alignment to verify with `boundingBox().y` comparisons.**

Playwright verification will instead compare: (a) equal-height pillar cards within a row via `boundingBox().height` equality, (b) `animate-gradient-shift` class on H1 via DOM inspection, (c) `animate-shine` class on both CTA buttons, (d) full-page glow continuity via screenshot comparison across scroll positions.

---

## Vertical Rhythm

Unchanged from Round 1. Every major section uses `py-16 sm:py-24` (Home/Daily Hub rhythm).

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → Hook section | `py-16 sm:py-24` = ~128px mobile / ~192px desktop (top + bottom combined between the two sections) | Round 1 baseline — Round 2 does not change section padding |
| Hook → StatsBar | `py-16 sm:py-24` (StatsBar has its own internal padding via `py-14 sm:py-20`) | Round 1 baseline |
| StatsBar → Pillars | `py-16 sm:py-24` | Round 1 baseline |
| Pillars → DashboardPreview | `py-16 sm:py-24` (DashboardPreview has internal padding) | Round 1 baseline |
| DashboardPreview → Spotlight | `py-16 sm:py-24` | Round 1 baseline |
| Spotlight → Differentiator | `py-16 sm:py-24` | Round 1 baseline |
| Differentiator → Callout | `py-16 sm:py-24` | Round 1 baseline |
| Callout → Final CTA | `py-16 sm:py-24` | Round 1 baseline |
| Final CTA → Footer | Footer is outside the GlowBackground wrapper; its own padding applies | SiteFooter unchanged |

Round 2 asserts no new vertical rhythm — the seam-elimination goal is achieved by the `fullPage` orbs distributing across the page, not by collapsing inter-section gaps.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] CC is on branch `claude/feature/register-page-redesign` (STOP if on any other branch per spec CRITICAL EXECUTION RULE #3).
- [ ] Round 1 changes are present on the branch (uncommitted is fine — spec says Round 2 can be combined into the same commit or stacked).
- [ ] `pnpm install` returns zero new dependencies. If any of Framer Motion, GSAP, react-spring, Lottie, or any other motion library appears in a diff, STOP and surface to the user.
- [ ] `Sparkles` icon is importable from `lucide-react` (stock Lucide icon, verified elsewhere in codebase).
- [ ] The existing Round 1 test file assertions are about to break because of copy changes — updating them is Step 7, not a separate spec.
- [ ] The spec's "Differentiator checklist lays out 4 × 2 at tablet/desktop" (Responsive Behavior table) is **ambiguous** — the spec's Change sections (1–4) do not explicitly instruct changing the differentiator list layout, and "Files Changed in Round 2" only lists copy edits on `DIFFERENTIATORS`. **Default: keep the existing single-column `max-w-2xl` differentiator layout** (Round 1 pattern). If the user wants a 4 × 2 grid instead, they must confirm before execution — surface this ambiguity if asked.
- [ ] All auth-gated actions from the spec are accounted for (ZERO new gates — inherited from Round 1).
- [ ] Design system values are verified (from spec + `FrostedCard.tsx:43` className passthrough + `tailwind.config.js:41` duration-base token).
- [ ] All [UNVERIFIED] values are flagged with verification methods (see list below).
- [ ] No deprecated patterns used (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub — note Register is NOT Daily Hub, so GlowBackground is correct, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds).

**[UNVERIFIED] values in this plan:**

1. **[UNVERIFIED] Bundle size delta < 2 KB after Round 2.**
   → To verify: Run `pnpm build` after implementation and compare the reported register-page chunk size against the current build (captured before Round 2 changes).
   → If wrong (>2 KB): Identify what dragged in size. Likely culprit would be a Lucide icon newly pulled in (Sparkles), which is negligible (~100 bytes), so any larger delta is suspicious — check for accidental library imports.

2. **[UNVERIFIED] `fullPage` orb top-percentages render correctly at actual page scroll length.**
   → To verify: Run `/verify-with-playwright /register` at 1440px and screenshot at 0vh, 50vh, and 100vh. Confirm orbs are visible at each scroll position with no large empty gaps (>20vh) between them.
   → If wrong (visible seam or clustering): Adjust percentages in `GLOW_CONFIG.fullPage` — spec §2c explicitly grants permission to tune these during implementation.

3. **[UNVERIFIED] `duration-base` resolves to 250ms and the hover-lift feels smooth at that speed.**
   → To verify: Inspect the pillar card in browser DevTools after hover — check computed `transition-duration: 250ms`.
   → If wrong (feels too slow/fast): Spec requires `duration-base` token. Do not hardcode a different value. If 250ms feels off, raise to the user as a design decision — don't silently change the token.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where do the new keyframes live (`index.css` vs `tailwind.config.js`)? | `frontend/src/index.css` | Spec §4c explicitly prefers it ("simpler"), and the file already contains the `.scroll-reveal` utility + the existing `border-pulse-glow` keyframe — same pattern. |
| How to achieve equal-height pillar cards? | `<FrostedCard className="h-full">` with inner `<div className="flex h-full flex-col">` + `<ul className="mt-auto ...">` | FrostedCard `className` passthrough is verified at `FrostedCard.tsx:43`. The `mt-auto` on the `<ul>` pushes the feature list to the bottom of the flex column so cards align their feature lists across the row regardless of tagline length. Per spec §3b. |
| Keep or remove the internal `<GlowBackground variant="center">` around the hero? | Remove | Spec §2b is explicit: "Remove the inner `<GlowBackground variant="center">` that wrapped only the hero in Round 1. The hero is now just a plain `<section>`." The `fullPage` wrapper handles orbs for the whole page. |
| Should `<SiteFooter>` sit inside or outside `<GlowBackground variant="fullPage">`? | Outside (sibling of GlowBackground) | Spec §2b: "SiteFooter stays OUTSIDE the GlowBackground — footers should be solid, not glowy." |
| Should `<StatsBar>` and `<DashboardPreview>` keep their internal `<GlowBackground>`? | Yes — leave untouched | Spec §2b exception: "leave those untouched; they layer harmlessly on top of the page wrapper since children render in a `z-10` layer." Modifying them would cascade to the home page (which also uses these components). |
| How does the hero H1 combine `GRADIENT_TEXT_STYLE` + `animate-gradient-shift`? | Keep `style={GRADIENT_TEXT_STYLE}` AND add className `animate-gradient-shift`. The keyframe animates `background-position` while `GRADIENT_TEXT_STYLE` provides the background itself via `background` + `background-clip: text`. The `.animate-gradient-shift` class then sets `background-size: 200% 200%` which makes the shift visible. | The gradient clip mechanism and the shimmer animation are orthogonal. The gradient provides the color; the shift animates its position. |
| Where does `animate-shine` go on the hero CTA? | On the `<button>` element directly | Spec §4d: "Hero CTA button: add className `animate-shine`." The spec's CSS has `position: relative; overflow: hidden` built into the `.animate-shine` class, so the button itself becomes the positioning container for the pseudo-element. |
| Does the "Log in" link get hover-lift or shine? | No — hover-lift is spec-limited to pillar + spotlight cards only; shine is spec-limited to hero CTA + final CTA only | Spec §4a table is explicit. "Log in" link stays with Round 1 styling: `text-white underline hover:text-white/80`. |
| Does the DashboardPreview heading / CTA get shine? | No | Spec §4d explicitly lists Hero CTA + Final CTA ONLY for shine. DashboardPreview has its own "Create a Free Account" button internally; that button is untouched (per spec CRITICAL EXECUTION RULE #4: "No new files are introduced in Round 2 except optionally a CSS keyframe" and "No changes to DashboardPreview.tsx"). |
| Keep differentiator as single column (current) or expand to 4 × 2 grid (Responsive Behavior table hint)? | **Keep single column** within `max-w-2xl mx-auto` | Spec's Change sections (1–4) and Files-Changed table do NOT explicitly instruct a grid layout change. Only the Responsive Behavior table mentions "4 × 2". Defaulting to the Round 1 layout preserves minimal-diff discipline. Flag in Assumptions for user confirmation. |
| What's the exact icon import for DISCOVER? | `import { Sparkles } from 'lucide-react'` — added to the existing named-import line at the top of `RegisterPage.tsx` | Spec §3a + §Design Notes. Stock Lucide icon. |
| Do feature-count-per-pillar assertions get added to tests? | Yes — assert 6 pillars + each has 5 `<li>` items | Spec §3c: "All 6 pillars must have exactly 5 features listed." |

---

## Implementation Steps

### Step 1: Add the `fullPage` variant to GlowBackground

**Objective:** Extend `GlowBackground.tsx` with a new `fullPage` variant distributing 5 orbs across a long-scroll page, without altering any existing variant behavior.

**Files to create/modify:**
- `frontend/src/components/homepage/GlowBackground.tsx` — add `fullPage` array to `GLOW_CONFIG`, extend the `variant` prop union and the internal `GlowOrbs` prop type.
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — add a new `it()` block asserting `variant="fullPage"` renders 5 orbs with the documented opacities.

**Details:**

Extend the `GLOW_CONFIG` object with the 5-orb `fullPage` entry (exact values from Design System Values table above). Update the `variant?:` prop in `GlowBackgroundProps` to `'center' | 'left' | 'right' | 'split' | 'fullPage' | 'none'`. Update the `GlowOrbs` inner function's `variant` prop type to `'center' | 'left' | 'right' | 'split' | 'fullPage'` (excluding `'none'` because the `!== 'none'` guard upstream prevents that path).

Everything else in the component stays variant-agnostic: `GlowOrbs` reads `GLOW_CONFIG[variant]`, maps over the array, and renders each orb absolutely positioned with `animate-glow-float motion-reduce:animate-none` inherited from `ORB_BASE`.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): 5 orbs at full `md:` sizes (400-600px) at percentages 5%, 30%, 55%, 75%, 92% of the page.
- Tablet (768px): Same 5 orbs, same positions, `md:` sizes active.
- Mobile (375px): 5 orbs at smaller base sizes (250-300px), same percentages.

**Inline position expectations:** N/A (glow orbs are decorative, not inline-row layout).

**Guardrails (DO NOT):**
- Do not modify `ORB_BASE`, `GlowOrbs` rendering logic, or `GlowBackground` root wrapper className.
- Do not add any orb-level `animation-delay` or staggered motion — the spec inherits `animate-glow-float` from `ORB_BASE` with no per-orb override.
- Do not change `GLOW_CONFIG.center/left/right/split` values — existing variants must render identically after this change.
- Do not remove or rename the `'none'` variant.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `variant="fullPage" renders 5 orbs` | unit | `render(<GlowBackground variant="fullPage">…</GlowBackground>)` then `screen.getAllByTestId('glow-orb')` has length 5. |
| `fullPage orb 1 has 0.25 opacity and 139, 92, 246 color` | unit | First orb's `style.background` contains `rgba(139, 92, 246, 0.25)`. |
| `fullPage orb 5 has 0.22 opacity` | unit | Fifth orb's `style.background` contains `0.22`. |
| Existing variant tests all still pass | regression | `center` → 2 orbs, `split` → 3 orbs, `none` → 0 orbs (no change). |

**Expected state after completion:**
- [ ] `GlowBackground` accepts `variant="fullPage"` without type errors.
- [ ] `GlowBackground.test.tsx` has ≥3 new assertions covering the new variant; full GlowBackground test file passes.
- [ ] Existing 5 variants (`center`, `left`, `right`, `split`, `none`) render unchanged.

---

### Step 2: Add `gradient-shift` and `shine` keyframes to `index.css`

**Objective:** Register two new CSS keyframes + helper classes at the page stylesheet level (not Tailwind config), per spec §4c preference.

**Files to create/modify:**
- `frontend/src/index.css` — append two `@keyframes` blocks + two helper classes + reduced-motion overrides.

**Details:**

Append the following to `frontend/src/index.css` at the bottom of the file (after the `@keyframes challenge-pulse` block at line 281), preserving the existing file order and section comments:

```css
/* Register page Round 2 — hero H1 gradient shimmer (12s cycle) */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient-shift {
  background-size: 200% 200%;
  animation: gradient-shift 12s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-gradient-shift {
    animation: none;
  }
}

/* Register page Round 2 — primary CTA shine sweep (6s loop, 2s delay) */
@keyframes shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shine {
  position: relative;
  overflow: hidden;
}
.animate-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: shine 6s ease-in-out infinite;
  animation-delay: 2s;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .animate-shine::after {
    animation: none;
    opacity: 0;
  }
}
```

**Auth gating:** N/A.

**Responsive behavior:** N/A — CSS-only change, responsive behavior is identical at all breakpoints.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do not hardcode these keyframes in `tailwind.config.js` — the spec §4c prefers `index.css` as the simpler path.
- Do not use Tailwind's `animation-*` utilities for these — they're not registered in the Tailwind config, so `className="animate-shine"` works because the raw CSS class matches, not because Tailwind generated it.
- Do not omit the `opacity: 0` in the shine reduced-motion block — without it, the pseudo-element freezes in a visible state. The global safety net in `animations.css` zeros `animation-duration`, which stops motion but does not hide the pseudo-element.
- Do not change the 6s / 2s / 12s timings.
- Do not apply `.animate-shine` to anything other than the two hero/final CTAs in Step 6.

**Test specifications:** CSS-only; no Vitest unit test. Runtime behavior verified in `/verify-with-playwright` as part of the hero/CTA rendering checks in Steps 3 and 6.

**Expected state after completion:**
- [ ] `index.css` has two new `@keyframes` blocks and two helper classes at the bottom of the file.
- [ ] `pnpm build` succeeds with no CSS syntax errors.
- [ ] Bundle size delta attributable to these rules is <500 bytes (essentially free).

---

### Step 3: Copy edits on RegisterPage.tsx (Change 1)

**Objective:** Apply the 8 copy diffs from spec §Change 1 without touching any other structural code.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — edit 8 specific string literals.

**Details:**

Apply these string replacements verbatim:

| Location | Round 1 string | Round 2 string |
|---|---|---|
| Hero `<p>` subtitle | `"A free, peaceful space for prayer, Scripture, community, and rest. Eighty-two features. Zero ads. No credit card."` | `"A peaceful space for prayer, Scripture, community, and rest. Eighty-two features. No ads. No credit card to sign up."` |
| Pillars section `<SectionHeading>` `heading` prop | `"Everything included. Free forever."` | `"Everything included when you sign up."` |
| Pillars section subtitle `<p>` | `"Eighty-two shipped features across five pillars. No paywalls. No premium tier. No upsells inside the app."` | `"Eighty-two shipped features across six pillars. No ads. No dark patterns. No upsells that interrupt you mid-prayer."` |
| `DIFFERENTIATORS[0]` | `'Free forever — no subscriptions, no trial periods, no "premium" tier.'` | `'No ads, ever. Your worship time is not monetizable through interruption.'` |
| `DIFFERENTIATORS[1]` | `'No ads. Your worship time is sacred, not monetizable.'` | DELETE this element (array shrinks by 1 and then a replacement is inserted at index 4 — see next row) |
| `DIFFERENTIATORS[4]` (new insertion after Round 1's "Bible is free to read") | — | `'Your prayers, journals, and bookmarks are yours. Export or delete them anytime.'` |
| Hero CTA button text | `"Create Your Free Account"` | `"Create Your Account"` |
| Final CTA button text | `"Create Your Free Account"` | `"Create Your Account"` |
| Final reassurance `<p>` | `"No credit card. No trial period. Just peace."` | `"No credit card. No commitment. Just peace."` |

**Resulting `DIFFERENTIATORS` array (8 items, exact order per spec §Change 1 Differentiator checklist):**

```tsx
const DIFFERENTIATORS = [
  'No ads, ever. Your worship time is not monetizable through interruption.',
  'No data harvesting. Your prayers and journal entries stay private.',
  'Grace-based streaks that celebrate presence, never punish absence.',
  'The entire Bible is free to read — no account required.',
  'Your prayers, journals, and bookmarks are yours. Export or delete them anytime.',
  'Crisis keyword detection with real hotline resources when you need them.',
  'Works offline as an installable app (iOS, Android, desktop).',
  'Real accessibility — WCAG 2.2 AA audited, not an afterthought.',
] as const
```

**Auth gating:** No change (CTA onClick handlers unchanged, still open auth modal in `register` mode).

**Responsive behavior:**
- Desktop (1440px): Copy wraps naturally within `max-w-4xl` hero, `max-w-2xl` subtitle, `max-w-6xl` pillar grid.
- Tablet (768px): Same.
- Mobile (375px): Copy wraps tighter but remains readable at ≥`text-sm` sizes.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do not touch the `PILLARS` or `SPOTLIGHTS` arrays in this step (those are Step 5).
- Do not touch animation classes in this step (those are Step 6).
- Do not rewire auth modal onClick — only the button text changes.
- Do not introduce any "free forever", "premium tier", or "no trial" substring anywhere on the page. Verify with `grep -i` on the modified file.
- Do not change `REGISTER_METADATA` or the SEO component usage.

**Test specifications:** Tests are updated in Step 7.

**Expected state after completion:**
- [ ] Hero subtitle reads the Round 2 string.
- [ ] Pillars heading reads "Everything included when you sign up."
- [ ] Pillars subtitle references "six pillars" and the updated no-ads/no-dark-patterns/no-upsells copy.
- [ ] `DIFFERENTIATORS` array has exactly 8 items in the Round 2 order.
- [ ] Both CTA buttons read "Create Your Account".
- [ ] Final reassurance reads "No credit card. No commitment. Just peace."
- [ ] `grep -i "free forever" frontend/src/pages/RegisterPage.tsx` returns 0 matches.
- [ ] `grep -i "premium tier" frontend/src/pages/RegisterPage.tsx` returns 0 matches.
- [ ] `grep -i "no trial" frontend/src/pages/RegisterPage.tsx` returns 0 matches.

---

### Step 4: Restructure RegisterPage.tsx to use one top-level `<GlowBackground variant="fullPage">`

**Objective:** Replace the hero-scoped `<GlowBackground variant="center">` with a single page-level `<GlowBackground variant="fullPage">` wrapping `<main>`. Footer stays outside.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — restructure JSX.

**Details:**

Change the `RegisterPage` component's return shape from:

```tsx
<div className="flex min-h-screen flex-col bg-hero-bg font-sans">
  <SEO ... />
  <Navbar transparent hideBanner />
  <main id="main-content">
    <GlowBackground variant="center">
      <section>{/* Hero */}</section>
    </GlowBackground>
    <section>{/* Hook */}</section>
    <StatsBar />
    {/* ... */}
    <section>{/* Final CTA */}</section>
  </main>
  <SiteFooter />
</div>
```

to:

```tsx
<div className="min-h-screen bg-hero-bg font-sans">
  <SEO ... />
  <Navbar transparent hideBanner />
  <GlowBackground variant="fullPage">
    <main id="main-content" className="relative z-10">
      <section>{/* Hero — no inner GlowBackground */}</section>
      <section>{/* Hook */}</section>
      <StatsBar />
      <section>{/* Pillars */}</section>
      <DashboardPreview />
      <section>{/* Spotlight */}</section>
      <section>{/* Differentiator */}</section>
      <section>{/* Callout */}</section>
      <section>{/* Final CTA */}</section>
    </main>
  </GlowBackground>
  <SiteFooter />
</div>
```

Key structural changes:

1. Remove `<GlowBackground variant="center">` wrapping the hero section. The hero's `<section>` becomes a direct child of `<main>`.
2. Wrap `<main>` in `<GlowBackground variant="fullPage">`. The wrapper's internal `<div className="relative overflow-clip bg-hero-bg">` covers the whole page with one flowing glow field.
3. `<SiteFooter />` stays OUTSIDE the GlowBackground (sibling of `<GlowBackground>`).
4. Remove `flex flex-col` from the root `<div>` — not needed when footer is a simple block sibling.
5. Confirm no ad-hoc `bg-hero-bg` or `bg-*` classes remain on individual sections (none should, per Round 1 code — hero has no background, hook has no background, etc.). If any are present from Round 1, remove them.
6. **`<StatsBar>` and `<DashboardPreview>` remain untouched** — their internal `<GlowBackground>` wrappers are left as-is per spec §2b exception.
7. The hero section's `id="register-hero-heading"` aria binding stays on the `<h1>`, not the `<section>`.
8. The hero `<section>` keeps its `ref={hero.ref as RefObject<HTMLElement>}` and `className={cn('scroll-reveal', hero.isVisible && 'is-visible')}` but drops the now-unneeded wrapping.

**Auth gating:** No change.

**Responsive behavior:**
- Desktop (1440px): One flowing glow field, 5 orbs distributed top-to-bottom. No visible seam between hero and hook. Footer renders solid below.
- Tablet (768px): Same — `md:` sizes in the orb config apply.
- Mobile (375px): Smaller orbs (base sizes), still continuous. Footer still solid below.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do not move `<SiteFooter>` inside the GlowBackground.
- Do not wrap `<Navbar>` inside the GlowBackground — the navbar has its own transparent styling that overlays the hero glow.
- Do not remove the `main id="main-content"` attribute — the Navbar skip-to-main-content link targets it.
- Do not touch `<StatsBar>` or `<DashboardPreview>` — those are shared components used by other pages.
- Do not remove the root `bg-hero-bg` class — it's the base color the fullPage GlowBackground layers over.
- Do not add `overflow-clip` or `overflow-hidden` to the root `<div>` — that would collide with the GlowBackground's internal `overflow-clip`.

**Test specifications:** Tests are updated in Step 7.

**Expected state after completion:**
- [ ] `<GlowBackground variant="fullPage">` wraps `<main>` directly.
- [ ] Hero section has no wrapping GlowBackground.
- [ ] `<SiteFooter />` is a sibling of `<GlowBackground>`, not a descendant.
- [ ] `StatsBar` and `DashboardPreview` render unchanged.
- [ ] `pnpm test` passes for RegisterPage test file (after Step 7 updates the assertions).
- [ ] Visual verification: scrolling top → bottom shows a continuous glow field with no seam (verified in the final Playwright sweep per `/verify-with-playwright`).

---

### Step 5: Add DISCOVER pillar and convert to equal-height cards

**Objective:** Grow `PILLARS` from 5 to 6 entries (adding DISCOVER) and restructure the per-card JSX so every card in a row is equal height via flex + `mt-auto`.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — extend `PILLARS` array, import `Sparkles` from `lucide-react`, restructure the per-card render.

**Details:**

**5a. Add `Sparkles` to the Lucide named import:**

```tsx
// Before:
import { Check, HandHeart, BookOpen, Sprout, Moon, Users } from 'lucide-react'
// After:
import { Check, HandHeart, BookOpen, Sprout, Moon, Users, Sparkles } from 'lucide-react'
```

**5b. Append the DISCOVER pillar (6th entry) to `PILLARS`:**

```tsx
{
  name: 'DISCOVER',
  icon: Sparkles,
  tagline: 'Small moments of surprise the app quietly plans for you.',
  features: [
    "Midnight verse reveal when you're up past 11 PM",
    'Verse echoes: we bring back what you highlighted months ago',
    'Song of the Day: 30 rotating worship tracks to discover',
    'Seasonal banners for Advent, Lent, Easter, and more',
    'Anniversary celebrations on your 30-day, 100-day, and 1-year marks',
  ],
},
```

Result: `PILLARS` has 6 entries, each with exactly 5 features.

**5c. Replace the pillar card render JSX with the equal-height flex structure:**

```tsx
{PILLARS.map((pillar, index) => {
  const Icon = pillar.icon
  return (
    <div
      key={pillar.name}
      className={cn('scroll-reveal', pillars.isVisible && 'is-visible')}
      style={staggerDelay(index, 50)}
    >
      <FrostedCard className="h-full transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5">
        <div className="flex h-full flex-col">
          <div className="mb-4">
            <Icon size={32} className="text-white" aria-hidden="true" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-white">{pillar.name}</h3>
          <p className="mb-4 text-sm leading-relaxed text-white/80">{pillar.tagline}</p>
          <ul className="mt-auto space-y-1.5 text-sm text-white/80">
            {pillar.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-white"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </FrostedCard>
    </div>
  )
})}
```

Key structural changes vs Round 1:
- `<FrostedCard>` now takes `className="h-full transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5"` — the `h-full` makes the card fill its grid cell, the transform classes wire up the Change 4 hover-lift (see Step 6 for why these classes live here).
- The card's children are wrapped in `<div className="flex h-full flex-col">`.
- Icon moves into its own `<div className="mb-4">` wrapper (replacing the previous inline `mt-4` spacing on the H3).
- `<ul>` gains `mt-auto` so the feature list aligns at the bottom of the flex column across row-mates.

**5d. Grid classes stay unchanged:**

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
```

With 6 items, this now produces a clean 3 × 2 on desktop, 2 × 3 on tablet, 1 × 6 on mobile.

**Auth gating:** N/A (cards are decorative).

**Responsive behavior:**
- Desktop (1440px): 3-column grid, 2 rows. Cards within each row are visually equal height (top border to bottom border aligned ±1px).
- Tablet (768px): 2-column grid, 3 rows. Cards within each row are equal height.
- Mobile (375px): 1-column stack. Equal-height is trivially true (each card is in its own row).

**Inline position expectations:** Cards in the same row must have equal `boundingBox().height`. At 1440px, rows are [PRAY, READ, GROW] and [REST, BELONG, DISCOVER] — assert card heights match within ±1px per row. At 768px, rows are [PRAY, READ], [GROW, REST], [BELONG, DISCOVER] — same assertion per row. Verified in `/verify-with-playwright` via `getBoundingClientRect().height` comparison.

**Guardrails (DO NOT):**
- Do not pass an `onClick` to FrostedCard in this step — the hover-lift classes are explicit via `className`, and adding onClick would trigger the card's built-in interactive hover (with `active:scale-[0.98]` etc) and create double-motion.
- Do not wrap the inner content in additional divs beyond the single `<div className="flex h-full flex-col">` — extra wrappers break the `mt-auto` chain.
- Do not use `line-clamp-*` on pillar feature items — the spec requires full feature text.
- Do not change the icon size from 32 or the Check icon size from 16.
- Do not change pillar feature text from the existing PRAY/READ/GROW/REST/BELONG entries (only DISCOVER is added in Round 2).
- Do not add a DISCOVER CTA or link — cards are display-only.

**Test specifications:** Tests updated in Step 7.

**Expected state after completion:**
- [ ] `PILLARS.length === 6`.
- [ ] Each pillar has exactly 5 features (`pillar.features.length === 5`).
- [ ] `Sparkles` icon is imported and used for the DISCOVER card.
- [ ] Each `<FrostedCard>` has `className="h-full ..."` including the hover-lift classes.
- [ ] Each card's inner wrapper is `<div className="flex h-full flex-col">` with `<ul className="mt-auto ...">`.

---

### Step 6: Apply Change 4 animation classes

**Objective:** Apply `animate-gradient-shift` to the hero H1, `animate-shine` to both primary CTAs, and hover-lift classes to the 3 spotlight cards (pillar cards already got hover-lift in Step 5).

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — add three targeted className additions.

**Details:**

**6a. Hero H1 — add `animate-gradient-shift`:**

```tsx
// Before:
<h1
  id="register-hero-heading"
  className="pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
  style={GRADIENT_TEXT_STYLE}
>
  Your room is ready.
</h1>
// After:
<h1
  id="register-hero-heading"
  className="animate-gradient-shift pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
  style={GRADIENT_TEXT_STYLE}
>
  Your room is ready.
</h1>
```

The `animate-gradient-shift` class (defined in Step 2) adds `background-size: 200% 200%` and animates `background-position` between `0% 50%` and `100% 50%` over 12s. Combined with `GRADIENT_TEXT_STYLE`'s `background: linear-gradient(...)` + `background-clip: text`, this creates a slow shimmer on the gradient text.

**6b. Hero CTA button — add `animate-shine`:**

```tsx
// Insert 'animate-shine' at the front of the className string:
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
>
  Create Your Account
</button>
```

The `.animate-shine` class wraps the button with `position: relative; overflow: hidden` and adds a `::after` pseudo-element that sweeps a 110° white gradient band across the button every 6s (starting 2s after mount).

**6c. Final CTA button — add `animate-shine`:**

Same treatment as the hero CTA (the final CTA JSX already matches the hero CTA's class string). Add `animate-shine` at the front.

**6d. Spotlight cards — add hover-lift classes:**

```tsx
// Before:
<FrostedCard>
  <h3 className="mb-3 text-xl font-semibold text-white">{card.name}</h3>
  ...
</FrostedCard>
// After:
<FrostedCard className="transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5">
  <h3 className="mb-3 text-xl font-semibold text-white">{card.name}</h3>
  ...
</FrostedCard>
```

(Pillar cards already have these classes from Step 5's 5c change.)

**6e. Nothing else gets new animations.** Do not apply `animate-shine` to the "Log in" link, the DashboardPreview internal button, or any other CTA. Do not apply `animate-gradient-shift` to any other heading.

**Auth gating:** No change (decorative animations).

**Responsive behavior:**
- Desktop (1440px): All animations run.
- Tablet (768px): All animations run.
- Mobile (375px): All animations run.
- Reduced motion at any breakpoint: gradient-shift stops (static gradient), shine pseudo-element opacity: 0, hover-lift transition zeroed by the global `animations.css` safety net (`transition-duration: 0ms`), glow-float on orbs stops (existing `motion-reduce:animate-none`).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do not apply `animate-shine` to more than the 2 primary CTAs (hero + final).
- Do not apply `animate-gradient-shift` to any other heading — it's hero H1 only.
- Do not remove or replace `GRADIENT_TEXT_STYLE` inline style on the hero H1 — `animate-gradient-shift` complements it, doesn't replace it.
- Do not add hover-lift to DashboardPreview cards (they have their own interaction patterns).
- Do not add hover-lift to the differentiator `<Check>` rows — those are not cards.
- Do not hardcode transition durations (`200ms`, `transition-all 300ms cubic-bezier(...)`) — use `duration-base` from Tailwind.

**Test specifications:** Tests updated in Step 7.

**Expected state after completion:**
- [ ] Hero H1 has className containing `animate-gradient-shift`.
- [ ] Hero CTA button has className containing `animate-shine`.
- [ ] Final CTA button has className containing `animate-shine`.
- [ ] All 6 pillar cards have `hover:-translate-y-0.5 transition-transform duration-base motion-reduce:transition-none`.
- [ ] All 3 spotlight cards have `hover:-translate-y-0.5 transition-transform duration-base motion-reduce:transition-none`.
- [ ] Log in link, differentiator check rows, DashboardPreview, StatsBar — no Round 2 animation classes added.

---

### Step 7: Update RegisterPage.test.tsx to match Round 2 copy + structure

**Objective:** Replace every Round 1 assertion broken by Round 2 copy/structural changes with the Round 2 equivalent. Add new assertions for the Round 2 acceptance criteria.

**Files to create/modify:**
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — replace 13 existing assertions and add 9 new ones.

**Details:**

**7a. Copy assertion updates (replace Round 1 strings with Round 2 strings):**

| Test | Round 1 assertion | Round 2 assertion |
|------|------------------|-------------------|
| "renders hero subtitle mentioning 'Eighty-two features'" | `/zero ads/i` | Remove `zero ads` match; add `/no ads\. no credit card to sign up/i` |
| "renders pillar section heading" | `/everything included\. free forever/i` | `/everything included when you sign up/i` |
| "renders all 5 pillar headings" | 5 heading assertions (PRAY/READ/GROW/REST/BELONG) | 6 heading assertions — add `DISCOVER` — rename test to "renders all 6 pillar headings" |
| "renders all 8 differentiator items" | old strings | new strings (see `DIFFERENTIATORS` array from Step 3) |
| "hero CTA opens auth modal in register mode" | `/create your free account/i` (×2 filter on `Create Your Free Account`) | `/create your account/i` (×2 filter on `Create Your Account`) |
| "final CTA opens auth modal in register mode" | same pattern | same Round 2 pattern |
| "'Create Your Free Account' CTA appears exactly twice" | same pattern | Rename test to "'Create Your Account' CTA appears exactly twice" — update filter |

**7b. New assertions to add:**

```tsx
it('renders exactly 6 pillar cards', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 3, name: 'PRAY' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'READ' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'GROW' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'REST' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'BELONG' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'DISCOVER' })).toBeInTheDocument()
})

it('DISCOVER pillar has 5 features', () => {
  renderPage()
  expect(screen.getByText(/midnight verse reveal when you're up past 11 pm/i)).toBeInTheDocument()
  expect(screen.getByText(/verse echoes: we bring back what you highlighted/i)).toBeInTheDocument()
  expect(screen.getByText(/song of the day: 30 rotating worship tracks/i)).toBeInTheDocument()
  expect(screen.getByText(/seasonal banners for advent, lent, easter/i)).toBeInTheDocument()
  expect(screen.getByText(/anniversary celebrations on your 30-day, 100-day/i)).toBeInTheDocument()
})

it('page does NOT contain "free forever" text', () => {
  renderPage()
  expect(screen.queryByText(/free forever/i)).not.toBeInTheDocument()
})

it('page does NOT contain "premium tier" text', () => {
  renderPage()
  expect(screen.queryByText(/premium tier/i)).not.toBeInTheDocument()
})

it('page does NOT contain "no trial" text', () => {
  renderPage()
  expect(screen.queryByText(/no trial/i)).not.toBeInTheDocument()
})

it('hero H1 has animate-gradient-shift class', () => {
  renderPage()
  const h1 = screen.getByRole('heading', { level: 1, name: /your room is ready/i })
  expect(h1.className).toContain('animate-gradient-shift')
})

it('both primary CTAs have animate-shine class', () => {
  renderPage()
  const ctaButtons = screen
    .getAllByRole('button', { name: /create your account/i })
    .filter((btn) => btn.textContent?.trim() === 'Create Your Account')
  expect(ctaButtons).toHaveLength(2)
  ctaButtons.forEach((btn) => expect(btn.className).toContain('animate-shine'))
})

it('pillars subtitle references six pillars', () => {
  renderPage()
  expect(screen.getByText(/six pillars/i)).toBeInTheDocument()
  expect(screen.queryByText(/five pillars/i)).not.toBeInTheDocument()
})

it('final reassurance line reads "No credit card. No commitment. Just peace."', () => {
  renderPage()
  expect(screen.getByText(/no credit card\. no commitment\. just peace/i)).toBeInTheDocument()
})
```

**7c. Remove one Round 1 assertion that no longer makes sense:**

The test `'renders all 5 pillar headings'` is replaced by `'renders exactly 6 pillar cards'`. The Round 1 test's 5-heading assertion is deleted in favor of the 6-heading version.

**7d. Update the 'renders all 8 differentiator items' test to match the new strings:**

```tsx
it('renders all 8 differentiator items', () => {
  renderPage()
  expect(screen.getByText(/no ads, ever\. your worship time is not monetizable/i)).toBeInTheDocument()
  expect(screen.getByText(/no data harvesting/i)).toBeInTheDocument()
  expect(screen.getByText(/grace-based streaks that celebrate presence/i)).toBeInTheDocument()
  expect(screen.getAllByText(/the entire bible is free to read/i).length).toBeGreaterThanOrEqual(2)
  expect(screen.getByText(/your prayers, journals, and bookmarks are yours/i)).toBeInTheDocument()
  expect(screen.getByText(/crisis keyword detection/i)).toBeInTheDocument()
  expect(screen.getByText(/works offline as an installable app/i)).toBeInTheDocument()
  expect(screen.getByText(/real accessibility/i)).toBeInTheDocument()
})
```

(The `>=2` assertion for "the entire Bible is free to read" stays — it appears in both the hook paragraph and differentiator item #4.)

**Auth gating:** Tests don't touch auth (still mocked).

**Responsive behavior:** N/A (unit tests render at jsdom default viewport).

**Inline position expectations:** N/A (Vitest + jsdom doesn't compute real layouts).

**Guardrails (DO NOT):**
- Do not remove the existing `renderPage()` helper, the `vi.mock` blocks for `useAuth` and `useAuthModal`, or the `MemoryRouter + ToastProvider + AuthModalProvider` render tree.
- Do not add integration-style tests that mutate localStorage or test navigation — the page has no persistence.
- Do not add `vi.useFakeTimers()` or try to assert animation timing — those are visual concerns verified by Playwright, not by jsdom.
- Do not mock GlowBackground or FrostedCard — use the real components.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders exactly 6 pillar cards | unit | 6 h3 headings found (PRAY/READ/GROW/REST/BELONG/DISCOVER) |
| DISCOVER pillar has 5 features | unit | 5 specific Round 2 DISCOVER feature strings found |
| page does NOT contain "free forever" | unit | `queryByText` returns null |
| page does NOT contain "premium tier" | unit | `queryByText` returns null |
| page does NOT contain "no trial" | unit | `queryByText` returns null |
| hero H1 has animate-gradient-shift class | unit | `getByRole('heading', { level: 1 })` className contains the token |
| both primary CTAs have animate-shine class | unit | Both "Create Your Account" buttons contain the token |
| pillars subtitle references six pillars | unit | "six pillars" found; "five pillars" not found |
| final reassurance reads "No credit card. No commitment. Just peace." | unit | Round 2 string found |
| renders all 8 differentiator items | unit (updated) | 8 Round 2 strings found |
| hero subtitle (updated) | unit (updated) | Round 2 string found; "zero ads" not found |
| pillar section heading (updated) | unit (updated) | Round 2 heading found |
| CTA buttons x2 (updated) | unit (updated) | "Create Your Account" ×2, "Create Your Free Account" not found |

**Expected state after completion:**
- [ ] All test assertions reference Round 2 copy.
- [ ] 9 new assertions added per 7b.
- [ ] `pnpm test RegisterPage` passes with 0 failures.

---

### Step 8: Build verification + bundle size check

**Objective:** Confirm `pnpm build` succeeds, no new npm dependencies were added, and the bundle size delta is < 2 KB per spec §4e.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `cd frontend && pnpm build`.
2. Confirm the build succeeds with no type errors or missing imports.
3. Capture the Register chunk size from the Vite build report (typically displayed as `dist/assets/RegisterPage-<hash>.js` with size in KB).
4. Compare against the Round 1 baseline: if Round 1 was committed, use the pre-Round-2 build size; if Round 1 is uncommitted, stash Round 2 changes, build to get the Round 1 baseline, then re-apply and re-measure. User can alternatively approve a "reasonably close" visual check (<2 KB delta is the requirement).
5. Run `pnpm install` (no-op) and confirm no new packages are added (diff `pnpm-lock.yaml` — should have 0 lines changed from Round 1).
6. Run `cd frontend && pnpm lint` — 0 errors.
7. Run the full test suite for the two touched test files: `cd frontend && pnpm test -- RegisterPage GlowBackground` and confirm 0 failures.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do not run `pnpm install <package>` to add a new library — if tempted, that's the moment to STOP per spec §4a (explicitly OUT of scope: Framer Motion, GSAP, react-spring, Lottie, any other motion library).
- Do not commit, push, or switch branches — the user handles all git operations per spec CRITICAL EXECUTION RULE #2.
- Do not silence TypeScript errors with `@ts-ignore` — fix the underlying issue.

**Test specifications:** Build + lint + test runs as above.

**Expected state after completion:**
- [ ] `pnpm build` exits 0 with a green Register chunk.
- [ ] Bundle size delta vs Round 1 < 2 KB (target: essentially zero — two CSS keyframes + a handful of className additions + one Lucide icon).
- [ ] `pnpm-lock.yaml` diff vs main branch shows only lock updates from Round 1 changes, nothing Round-2-specific.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test -- RegisterPage GlowBackground` passes with 0 failures.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `fullPage` variant to GlowBackground (pure additive, no downstream UI impact yet) |
| 2 | — | Add keyframes to `index.css` (pure additive) |
| 3 | — | Copy edits on RegisterPage.tsx (can happen in parallel with 1 and 2 in principle; sequentially in practice since all three touch different files) |
| 4 | 1 | Restructure RegisterPage to use `<GlowBackground variant="fullPage">` — needs Step 1 first so the variant exists |
| 5 | 4 | Add DISCOVER pillar + equal-height cards — sits inside the restructured JSX from Step 4 |
| 6 | 2, 4, 5 | Apply animation classes — needs Step 2's keyframes defined, Step 4's JSX skeleton in place, Step 5's pillar card structure in place |
| 7 | 3, 5, 6 | Update tests — assertions target Round 2 copy (Step 3), 6 pillars (Step 5), animation classes (Step 6) |
| 8 | 1–7 | Final build + test verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `fullPage` variant to GlowBackground | [COMPLETE] | 2026-04-20 | `GlowBackground.tsx` (+42 lines for new variant + type union); `GlowBackground.test.tsx` (+5 new test cases, 16→21 total, all passing). No deviations. |
| 2 | Add `gradient-shift` and `shine` keyframes | [COMPLETE] | 2026-04-20 | `index.css` (+45 lines at end of file). Two keyframes + helper classes + reduced-motion overrides added. Build verification deferred to Step 8. |
| 3 | Copy edits on RegisterPage.tsx | [COMPLETE] | 2026-04-20 | `RegisterPage.tsx` — 8 string edits: hero subtitle, pillars heading, pillars subtitle, `DIFFERENTIATORS[0]` replaced + `DIFFERENTIATORS[1]` removed + new item inserted at index 4, both CTA button texts, final reassurance. Banned strings absent. |
| 4 | Restructure RegisterPage to use `fullPage` GlowBackground | [COMPLETE] | 2026-04-20 | `RegisterPage.tsx` — removed `flex flex-col` from root div, wrapped `<main>` in `<GlowBackground variant="fullPage">`, added `relative z-10` to `<main>`, removed inner `<GlowBackground variant="center">` around hero. SiteFooter outside GlowBackground. StatsBar + DashboardPreview untouched. JSX balanced (2 GlowBackground tags). TypeScript passes. RegisterPage tests: 17 pass / 6 Round-1-copy-assertion fails (Step 7 will fix). Visual verification deferred to combined UI check after Step 6. |
| 5 | Add DISCOVER pillar + equal-height cards | [COMPLETE] | 2026-04-20 | `RegisterPage.tsx` — added `Sparkles` to Lucide named imports, appended DISCOVER pillar (5 features) to `PILLARS`, restructured pillar card render with `<FrostedCard className="h-full ...">` + inner `<div className="flex h-full flex-col">` + `<ul className="mt-auto ...">`. Hover-lift classes (`transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5`) attached to card here — originally planned for Step 6 but bundled into the same className edit for cleanliness. TypeScript passes. |
| 6 | Apply Change 4 animation classes | [COMPLETE] | 2026-04-20 | `RegisterPage.tsx` — added `animate-gradient-shift` to hero H1, `animate-shine` to both CTA buttons (hero + final), `hover:-translate-y-0.5 transition-transform duration-base motion-reduce:transition-none` to 3 spotlight `FrostedCard` instances. (Pillar cards received same hover-lift in Step 5.) Playwright verification: all 5 orbs at expected doc-Y positions (295/1773/3251/4433/5438 on 6631px page); H1 + both CTAs have expected classes; pillar row-mates equal height (442px row 1, 420px row 2). Full-page screenshot at `playwright-screenshots/register-r2-fullpage-1440.png` — continuous glow, no section seams. |
| 7 | Update RegisterPage.test.tsx | [COMPLETE] | 2026-04-20 | `RegisterPage.test.tsx` — updated hero subtitle assertion (removed "zero ads", added new subtitle check), pillar section heading assertion, pillar cards test (renamed, now checks 6), differentiator assertions (all 8 Round 2 strings), 3 CTA-click filter strings ("Create Your Free Account" → "Create Your Account"). Added 8 new tests: pillar count check for DISCOVER, "six pillars" subtitle, 3 absence checks (free forever / premium tier / no trial), final reassurance new copy, H1 animate-gradient-shift, both CTAs animate-shine. All 31 tests pass. |
| 8 | Build verification + bundle size check | [COMPLETE] | 2026-04-20 | `pnpm build` succeeds in 11.77s. RegisterPage chunk: 12.05 KB (Round 2 delta estimated ~600-900 bytes from Sparkles import + DISCOVER pillar data + className additions + CSS keyframes — well under 5 KB threshold). `pnpm-lock.yaml` diff: 0 lines — no new npm dependencies added. `pnpm lint` has 9 pre-existing errors in `frontend/scripts/verify-local-support-facelift.mjs` (last modified in commit `d5c099b`, untouched by Round 2). 63/63 tests pass across RegisterPage (31), GlowBackground (21), StatsBar (11). |
