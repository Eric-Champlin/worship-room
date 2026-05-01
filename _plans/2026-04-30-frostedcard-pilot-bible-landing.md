# Implementation Plan: FrostedCard Redesign Pilot (BibleLanding)

**Spec:** `_specs/frostedcard-pilot-bible-landing.md`
**Date:** 2026-04-30
**Branch:** `forums-wave-continued` (do NOT create a new branch — spec § "Branch discipline" is explicit; user manages all git ops)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; predates this pilot's new patterns by design, so the recon does NOT cover violet ramp, BackgroundCanvas, accent FrostedCard, or gradient Button. Existing FrostedCard / hero-bg / `09-design-system.md` "Round 3 Visual Patterns" remain authoritative for everything except the new tokens introduced here.)
**Recon Report:** `_plans/forums/frostedcard-redesign-recon.md` (loaded — pilot recon, source-of-truth audit driving this scope)
**Master Spec Plan:** Not applicable — standalone pilot per spec line 3.

---

## Affected Frontend Routes

- `/bible`
- `/daily` (regression eyeball only — must keep its HorizonGlow; no other change)

---

## Architecture Context

**Existing primitives this spec extends (do NOT fork):**
- `FrostedCard` at `frontend/src/components/homepage/FrostedCard.tsx:1-49` — single tier today, will gain a `variant` prop. Keeps `as`, `tabIndex`, `role`, `onKeyDown`, `className`, and `onClick` props unchanged. Class merging via `cn()` from `@/lib/utils`.
- `Button` at `frontend/src/components/ui/Button.tsx:1-113` — current variants: `'primary' | 'secondary' | 'outline' | 'ghost' | 'light'`. The `'light'` variant uses a special-case branch at lines 47-48 + 57-59 that overrides the default `rounded-md` + `h-*` + `px-*` size table. The new `'gradient'` variant joins this special-case branch with its own size table modeled identically on `'light'`. `forwardRef`, `asChild`, and `isLoading` patterns require zero changes.
- `cn()` utility at `frontend/src/lib/utils.ts:4` (clsx + tailwind-merge) — the merge order in `cn()` allows consumer `className` to override variant defaults cleanly when needed.
- `tailwind.config.js` at `frontend/tailwind.config.js` — has `theme.extend.colors` (lines 6-32), `theme.extend.fontFamily` (33-37), `theme.extend.transitionDuration`/`transitionTimingFunction` (38-49), `theme.extend.keyframes`/`animation` (50-416). NO `boxShadow` extension exists today — every glow is inlined as an arbitrary-value `shadow-[…]` string. This pilot adds the first `boxShadow` extension.
- `HorizonGlow` at `frontend/src/components/daily/HorizonGlow.tsx` — DailyHub's atmospheric glow layer; the file STAYS (DailyHub still uses it). Only the import + JSX mount in `BibleLanding.tsx` is removed.

**Existing consumers being migrated:**
- `BibleLanding.tsx` at `frontend/src/pages/BibleLanding.tsx:140-141` — outer wrapper currently `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans"><HorizonGlow />…`. Migrates to `<BackgroundCanvas className="flex flex-col font-sans">…` (BackgroundCanvas owns `relative`, `min-h-screen`, `overflow-hidden`).
- `ActivePlanBanner.tsx` at `frontend/src/components/bible/landing/ActivePlanBanner.tsx:25-28` — `<FrostedCard as="article" className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]">`. Migrates to `<FrostedCard as="article" variant="accent">` with NO `className` override.
- `ResumeReadingCard.tsx` at `frontend/src/components/bible/landing/ResumeReadingCard.tsx:22-24` — same `border-l-4` + inline shadow override pattern as ActivePlanBanner. ALSO has the white-pill `<Link>` CTA at lines 37-42 (`rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px…]`) that will be replaced with `<Button variant="gradient" size="md" asChild><Link …>…</Link></Button>`. The sibling secondary "Or read the next chapter" link at lines 43-50 stays unchanged.
- `VerseOfTheDay.tsx` at `frontend/src/components/bible/landing/VerseOfTheDay.tsx:91` (skeleton) and line 116 (loaded state) — both `<FrostedCard as="article">` with no className override. Both gain explicit `variant="default"`.
- `TodaysPlanCard.tsx` at `frontend/src/components/bible/landing/TodaysPlanCard.tsx:21` — `<FrostedCard as="article">` with no override. Gains explicit `variant="default"`. The hand-built "+N more" pill at lines 43-48 (uses old surface tokens `bg-white/[0.06] border border-white/[0.12]`) is acknowledged drift — NOT fixed in this spec.
- `QuickActionsRow.tsx` at `frontend/src/components/bible/landing/QuickActionsRow.tsx:23, 37, 57` — three `<FrostedCard as="article" className="min-h-[44px]">` tiles. Each gains explicit `variant="subdued"` while preserving the `min-h-[44px]` className override (44px touch-target floor — mandatory).

**BibleHeroSlot composition** (at `frontend/src/components/bible/landing/BibleHeroSlot.tsx:7-94`): conditionally renders ActivePlanBanner + ResumeReadingCard, ResumeReadingCard alone, or VerseOfTheDay alone based on reader state. The component itself is NOT modified by this spec — only its children's variants are.

**Test patterns:**
- Vitest + React Testing Library; tests colocated under `__tests__` directories.
- FrostedCard test at `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx:1-89` (13 tests today) — class-string assertions on lines 64-87. Provider wrapping NOT required (FrostedCard is a leaf component). User events via `userEvent.setup()`.
- Button test at `frontend/src/components/ui/__tests__/Button.test.tsx:1-229` (existing, comprehensive — including `asChild`, `isLoading`, ref forwarding, size+variant combos). The new gradient tests append to this file with the same `import { Button } from '../Button'` setup.
- Consumer tests at `frontend/src/components/bible/landing/__tests__/*.test.tsx`. Confirmed during recon:
  - `ActivePlanBanner.test.tsx` — 5 tests, NO class-string assertions (verified: no matches for `border-l\|shadow-\[`).
  - `ResumeReadingCard.test.tsx:62` — ONE assertion on `'border-l-primary/60'` ("has accent border" test). MUST be updated to assert the new accent variant.
  - `VerseOfTheDay.test.tsx`, `TodaysPlanCard.test.tsx`, `QuickActionsRow.test.tsx`, `BibleHeroSlot.test.tsx` — verified during recon to have NO class-string assertions on the FrostedCard surface tokens; they assert behavioral content (text presence, link hrefs, aria attributes, click handlers).
- `BackgroundCanvas.test.tsx` is brand-new (created in Step 2). Mirror Button.test.tsx setup style: simple render + className substring assertions.

**Auth gating patterns:**
- This is a pure visual-system spec. NO new auth gates added; NO existing auth gates modified.
- Existing auth-gate behavior on the affected components is preserved untouched: `VerseOfTheDay`'s Save button still calls `useAuthModal().openAuthModal('Sign in to save verses')` for logged-out users; `QuickActionsRow`'s "My Bible" tile still gates the link via the same pattern.
- Bible Wave Auth Posture (`02-security.md`): `/bible` is fully public. The new `<Button variant="gradient" asChild><Link …>` on ResumeReadingCard navigates to `/bible/{slug}/{chapter}` with NO auth gate.

**Database / shared data models:** None. No backend changes. No localStorage changes. No new `wr_*` keys.

**Cross-spec dependencies:** None. This is a standalone pilot per spec line 3. Follow-up specs will roll the FrostedCard variant API and Button gradient variant out across the rest of the app, but each follow-up is its own spec.

---

## Auth Gating Checklist

Per spec § "Auth Gating": this is a visual-system spec only. No new interactive elements gain or lose auth behavior. All four scenarios in the spec table preserve existing behavior unchanged:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| ResumeReadingCard "Continue reading" gradient pill click | Public — navigates to `/bible/{slug}/{chapter}` for both logged-in and logged-out users | Step 7 | None (public route per Bible Wave Auth Posture) |
| ActivePlanBanner CTA click | Public — links to plan day; reading plans accessible to logged-out browse users | Step 6 | None — existing behavior preserved |
| VerseOfTheDay share/save affordances | Save action gated via existing `useAuth` + `useAuthModal` (`'Sign in to save verses'` message); share is public | Step 8 | Preserved — VerseOfTheDay.tsx:64-67 unchanged |
| QuickActionsRow tile click (Browse Books / My Bible / Reading Plans) | "My Bible" tile gated via existing `useAuth` + `useAuthModal` (`'Sign in to access your highlights, notes, and reading history.'`); other two tiles public | Step 10 | Preserved — QuickActionsRow.tsx:40-46 unchanged |

No spec-defined auth gates are missing from the implementation steps because this spec defines none.

---

## Design System Values (for UI steps)

The recon at `_plans/recon/design-system.md` predates this pilot and does NOT cover the new tokens. Values below are explicit from the spec § "Functional Requirements" (canonical source for this pilot). Existing `09-design-system.md` § "Round 3 Visual Patterns" remains authoritative for the FrostedCard tokens being EVOLVED (e.g., from `bg-white/[0.06]` to `bg-white/[0.04]` for the new default tier).

### Tokens — Tailwind config additions (Step 1)

| Token | Type | Value | Source |
|-------|------|-------|--------|
| `violet-50` | color | `#F5F3FF` | spec § Func 1 |
| `violet-100` | color | `#EDE9FE` | spec § Func 1 |
| `violet-200` | color | `#DDD6FE` | spec § Func 1 |
| `violet-300` | color | `#C4B5FD` | spec § Func 1 |
| `violet-400` | color | `#A78BFA` | spec § Func 1 |
| `violet-500` | color | `#8B5CF6` (matches existing `primary-lt`; both stay) | spec § Func 1 |
| `violet-600` | color | `#7C3AED` | spec § Func 1 |
| `violet-700` | color | `#6D28D9` (matches existing `primary`; both stay) | spec § Func 1 |
| `violet-800` | color | `#5B21B6` | spec § Func 1 |
| `violet-900` | color | `#4C1D95` | spec § Func 1 |
| `canvas-shoulder` | color | `#0F0A1A` | spec § Func 1 |
| `canvas-deep` | color | `#0A0814` | spec § Func 1 |
| `frosted-base` | boxShadow | `0 4px 16px rgba(0,0,0,0.30)` | spec § Func 1 |
| `frosted-hover` | boxShadow | `0 6px 24px rgba(0,0,0,0.35)` | spec § Func 1 |
| `frosted-accent` | boxShadow | `0 0 30px rgba(139,92,246,0.12), 0 4px 20px rgba(0,0,0,0.35)` | spec § Func 1 |
| `frosted-accent-hover` | boxShadow | `0 0 30px rgba(139,92,246,0.18), 0 6px 24px rgba(0,0,0,0.40)` | spec § Func 1 |
| `gradient-button` | boxShadow | `0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)` | spec § Func 1 |
| `gradient-button-hover` | boxShadow | `0 0 32px rgba(167,139,250,0.45), 0 6px 20px rgba(0,0,0,0.40)` | spec § Func 1 |

### FrostedCard variants (Step 4)

| Tier | bg | border | backdrop-blur | shadow | rounded | padding |
|------|-----|--------|---------------|--------|---------|---------|
| `accent` | `bg-violet-500/[0.04]` | `border border-violet-400/45` | `backdrop-blur-md md:backdrop-blur-[12px]` | `shadow-frosted-accent` | `rounded-3xl` | `p-6` |
| `default` | `bg-white/[0.04]` | `border border-white/[0.08]` | `backdrop-blur-sm md:backdrop-blur-md` | `shadow-frosted-base` | `rounded-3xl` | `p-6` |
| `subdued` | `bg-white/[0.02]` | `border border-white/[0.06]` | `backdrop-blur-sm md:backdrop-blur-md` | (none) | `rounded-3xl` | `p-5` |

### FrostedCard hover (when `onClick` is set) (Step 4)

| Tier | hover bg | hover shadow | hover translate |
|------|----------|--------------|-----------------|
| `accent` | `hover:bg-violet-500/[0.08]` | `hover:shadow-frosted-accent-hover` | `hover:-translate-y-0.5` |
| `default` | `hover:bg-white/[0.07]` | `hover:shadow-frosted-hover` | `hover:-translate-y-0.5` |
| `subdued` | `hover:bg-white/[0.04]` | (no shadow change) | (no translate) |

Preserved across all tiers (do not regress): `transition-all motion-reduce:transition-none duration-base ease-decelerate`, `motion-reduce:hover:translate-y-0`, `active:scale-[0.98]` (interactive only), `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`, `cursor-pointer` (interactive only).

### Button gradient variant (Step 3)

| Property | Value |
|----------|-------|
| Base | `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 gap-2 font-semibold min-h-[44px]` |
| Hover | `hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0` |
| Focus ring | `focus-visible:ring-violet-300` (overrides shared `focus-visible:ring-primary` via tailwind-merge) |
| Size `sm` | `px-4 py-2 text-sm` |
| Size `md` | `px-6 py-2.5 text-sm` |
| Size `lg` | `px-8 py-3 text-base` |

The gradient variant participates in the special-case branch alongside `'light'` (NOT the default size table). Existing `active:scale-[0.98]`, `focus-visible:outline-none`, and `disabled:cursor-not-allowed disabled:opacity-50` from the shared base classes (Button.tsx:42-45) remain.

### BackgroundCanvas (Step 2)

| Property | Value |
|----------|-------|
| Base classes | `relative min-h-screen overflow-hidden` |
| Inline `style` background | `radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0,0,0,0.55) 0%, transparent 70%), linear-gradient(135deg, #0F0A1A 0%, #0A0814 100%)` |
| Children | rendered as-is |
| Optional `className` | merges via `cn()` after the base classes — consumer can append e.g. `flex flex-col font-sans` |

Note: the `135deg` linear gradient uses literal hex values, NOT the new `canvas-shoulder`/`canvas-deep` Tailwind tokens. CSS custom properties or Tailwind tokens would require a different inline-style construction; the spec's inline-style string is canonical for this pilot. The Tailwind canvas color tokens are added for FUTURE consumers (other page-level gradients); they aren't consumed by BackgroundCanvas itself.

---

## Design System Reminder

**Project-specific quirks `/execute-plan` displays before each UI step:**

- **All three FrostedCard variants use `rounded-3xl`** (NOT `rounded-2xl`). Deliberate move per spec § Func 2 to match the FPU/Lovable softer feel. The pre-pilot `rounded-2xl` is being replaced; do not preserve it on any tier.
- **Default tier moves the bg from `bg-white/[0.06]` → `bg-white/[0.04]`** and the border from `border-white/[0.12]` → `border-white/[0.08]` (per spec). The old class strings appear hard-coded in the existing FrostedCard test file (`FrostedCard.test.tsx:64-87`); update those assertions per the test plan in Step 4.
- **The `border-l-4 border-l-primary/60` left-edge stripe is removed from ActivePlanBanner and ResumeReadingCard.** The new accent variant carries an all-around violet-tinted border instead. Do not retain the stripe.
- **HorizonGlow stays on Daily Hub.** The component file at `components/daily/HorizonGlow.tsx` is untouched. Only the import + JSX mount in `BibleLanding.tsx` is removed. After Step 5, eyeball-verify `/daily` still shows orbs.
- **BackgroundCanvas owns `relative min-h-screen overflow-hidden`** — do NOT duplicate them on the consumer's `className` prop. The migration in BibleLanding (Step 5) drops these from the outer div.
- **Button gradient variant must NOT participate in the default size branch** — it joins the `'light'` special-case alongside the `rounded-full` + size table override (Button.tsx:46-49 today). Implementation pattern: extend the `variant !== 'light'` guard to `variant !== 'light' && variant !== 'gradient'` for the `rounded-md` and default size rules; add a sibling `variant === 'gradient'` branch for the gradient classes; add the three gradient size lines mirroring `'light'`.
- **Button gradient + `asChild` must work end-to-end** (ResumeReadingCard CTA wraps a `<Link>`). The existing `asChild` machinery at Button.tsx:64-80 already handles class merging via `cn(merged, childElement.props.className)`, so no new code is needed beyond the variant — but the test plan in Step 3 includes an explicit `gradient + asChild` test.
- **The 44px touch-target floor (`min-h-[44px]`) on QuickActionsRow tiles is mandatory** — preserved via the existing `className="min-h-[44px]"` override on each tile, which merges via `cn()` after the variant defaults.
- **No `animate-glow-pulse` on the new gradient button** — the gradient button uses static box-shadow tokens (`shadow-gradient-button` / `shadow-gradient-button-hover`), NOT pulsing animation. Same canonical approach as the textarea glow pattern.
- **FrostedCard preserves `tabIndex` / `role` / `onKeyDown` props across all tiers** — these are a11y critical (`02-security.md` style equivalent for accessibility — removing them silently regresses keyboard accessibility on every `div` interactive consumer). Verified preserved in Step 4.
- **Drawer-aware visibility / sticky FAB / textarea glow patterns** — N/A for this spec (no FABs, no textareas, no AudioDrawer interaction).
- **Daily Hub HorizonGlow architecture** — `/daily` continues to mount HorizonGlow at the page root; this spec touches `/bible` only.
- **Animation tokens** — preserved as `duration-base ease-decelerate` (existing FrostedCard transition) and `motion-reduce:transition-none` (motion safety net). No new hardcoded ms strings or cubic-beziers introduced.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone pilot, no master plan. No shared data models, no localStorage keys, no backend contracts.

**localStorage keys this spec touches:** None. Zero new `wr_*` keys; zero modifications to existing keys (`wr_bible_last_read`, `wr_bible_active_plans`, etc. are read by the consumers and remain untouched at the data layer).

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Cards full-width within container. Accent + default tier `backdrop-blur-md` (8px). Subdued tier `backdrop-blur-sm` (4px). BackgroundCanvas radial ellipse stays at 60%/50% — visible center fade on phones. ResumeReadingCard's gradient CTA pill keeps `min-h-[44px]` for touch. QuickActionsRow tiles stack 1-column (existing `grid-cols-1 sm:grid-cols-3` preserved). |
| Tablet | 640–1024px | `md:` breakpoint engages: accent gets `backdrop-blur-[12px]`; default gets `backdrop-blur-md` (8px); subdued bumps to `backdrop-blur-md` (~6-8px in practice — Tailwind's `md` is 8px). QuickActionsRow tiles in 3-column grid. |
| Desktop | ≥ 1024px | Same tier behavior as tablet. BackgroundCanvas radial ellipse visible at full intent — darkness centered slightly right of center, faint purple in corners. Hover states (translate, shadow change, color shift) fire normally. |

**Custom breakpoints:** None introduced by this spec. The existing `sm:` and `md:` breakpoints (640px / 768px Tailwind defaults) drive the tier blur transitions.

**No layout changes** to BibleLanding's existing card stacking, grid, or main column. This spec only changes:
1. The page background (HorizonGlow → BackgroundCanvas)
2. The visual surface of cards (tier system + new tokens)
3. ResumeReadingCard's primary CTA (white pill → gradient pill)

Spec § "Responsive Behavior" line 166 confirms: "this spec only changes the visual surface of cards and the page background, not their arrangement."

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| ResumeReadingCard CTA row | Gradient "Continue reading {book} {chapter}" pill + secondary "Or read the next chapter" link (when `nextChapter` is non-null) | At `sm:` breakpoint and above (≥ 640px), both elements share the same row via `sm:flex-row sm:items-center` — `boundingBox().y` of the two should match within ±5px | Below `sm` (< 640px), both elements stack via the default `flex flex-col gap-3`. Wrapping is expected and correct. |
| ActivePlanBanner CTA row | "Continue today's reading" white pill (NOT changed by this spec) + "View plan" secondary link | Same pattern: same y-alignment ≥ 640px (`sm:flex-row sm:items-center`); stacked below | Same — stacking is expected below 640px |
| QuickActionsRow tiles | Browse Books / My Bible / Reading Plans subdued tiles | At `sm:` breakpoint and above, all three tiles share the same y-coordinate via `grid-cols-1 sm:grid-cols-3` | Below `sm` (< 640px), tiles stack vertically. Stacking is expected and correct. |

**Verification:** `/verify-with-playwright` consumes this table at Step 6l. Compare `boundingBox().y` between the gradient pill and the secondary link on ResumeReadingCard at 1440px and 768px viewport widths; expect equal y. At 375px, expect different y (stacking).

---

## Vertical Rhythm

The pilot does NOT modify BibleLanding's vertical rhythm — all `space-y-*` and `mt-*` classes on the page-level `<main>` and inner containers stay untouched. The only change to vertical spacing is INSIDE FrostedCard via the `p-6` (accent/default) vs `p-5` (subdued) padding shift on subdued tiles — and that's a tier-internal change, not a page-level rhythm change.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero (BibleHero) → first content section | unchanged from current | BibleLanding.tsx:147-152 (`<div className="border-t border-white/[0.08] max-w-6xl mx-auto" />` divider + `pt-8` on inner container) |
| Card → Card (BibleHeroSlot stack) | unchanged from current | BibleLanding.tsx:152 (`space-y-8`) |
| Last card (BibleSearchEntry) → SiteFooter | unchanged from current | BibleLanding.tsx:152 (`pb-16`) |

`/verify-with-playwright` should not flag rhythm changes here. If a rhythm difference >5px appears post-implementation, it's a regression — investigate.

---

## Assumptions & Pre-Execution Checklist

- [ ] Spec confirms NO new branch creation; user stays on `forums-wave-continued`. CC executes file edits only.
- [ ] Spec defines all 19 new tokens (10 violet ramp + 2 canvas tones + 6 box-shadow + 1 explicitly: `text-violet-900`/`from-violet-300`/etc. composed from the ramp) — no token guessing required.
- [ ] All [UNVERIFIED] values flagged below with verification methods.
- [ ] Recon report at `_plans/forums/frostedcard-redesign-recon.md` loaded for execution context.
- [ ] No prior specs in a sequence — this pilot is standalone.
- [ ] No deprecated patterns introduced. Specifically:
  - Caveat headings: not used (no headings added).
  - BackgroundSquiggle on Daily Hub: not touched.
  - GlowBackground on Daily Hub: not touched.
  - `animate-glow-pulse`: not used (gradient button uses static box-shadow tokens).
  - Cyan textarea borders: not touched (no textarea work).
  - Italic Lora prompts: not touched.
  - Soft-shadow 8px-radius cards on dark backgrounds: replaced with `rounded-3xl` FrostedCard tiers.
  - PageTransition component: not introduced.
- [ ] `09-design-system.md` § "Round 3 Visual Patterns" remains authoritative for FrostedCard pre-pilot state. The follow-up rule-file edit to document the new tier system is OUT OF SCOPE for this pilot per spec § "Out of Scope" — rolled into the eventual rollout spec.
- [ ] `frontend/playwright-screenshots/` is the screenshot output directory for any Playwright capture (per memory).

### [UNVERIFIED] values

- **[UNVERIFIED] Button gradient text contrast (`text-violet-900` on `from-violet-400 to-violet-300` gradient)** — Spec § Non-Functional Requirements line 138 acknowledges this needs verification: "must clear WCAG AA 4.5:1 contrast for body weight; `font-semibold` further helps. (If verification finds the gradient lighter end fails AA, the fix is a darker gradient endpoint, not a text-color change — the violet-900-on-light-violet pairing is the design intent.)"
  → To verify: render the gradient button in dev, take a Playwright screenshot, run a contrast checker against the lightest gradient stop (top-right of the bg-gradient-to-br = `to-violet-300` = `#C4B5FD`) vs `text-violet-900` (`#4C1D95`). Expected ratio: ~7.4:1 (passes AA easily). At the darker end (`from-violet-400` = `#A78BFA` vs `#4C1D95`), expected ~5.4:1 (still passes AA).
  → If wrong: per spec, darken the gradient endpoint (e.g., `to-violet-400` instead of `to-violet-300`); do NOT change `text-violet-900`. Re-run contrast check.

- **[UNVERIFIED] BackgroundCanvas mobile rendering** — radial ellipse at `60% 50% at 60% 50%` is sized in viewport-relative percentages, so it scales with viewport. Spec § "Responsive Behavior" line 161 says "BackgroundCanvas radial gradient ellipse stays at 60%/50% — visually still creates a center-fade on phones."
  → To verify: open `/bible` at 375px (iPhone SE) viewport in Playwright; confirm the ellipse is visible and centered slightly right; confirm corners read as faint purple (not pure black).
  → If wrong: adjust ellipse sizing only after eyeball confirms a real problem; spec is canonical.

- **[UNVERIFIED] All-tiers-rounded-3xl visual at sm breakpoint** — spec § Func 2 specifies `rounded-3xl` (24px corners) for all three tiers. No recon screenshot covers this corner radius.
  → To verify: eyeball `/bible` after migration at 375px / 768px / 1440px; cards should look noticeably softer than pre-pilot (`rounded-2xl` = 16px → `rounded-3xl` = 24px).
  → If wrong: spec is canonical — `rounded-3xl` is mandatory; do NOT revert without re-opening the spec.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put the three FrostedCard variant class definitions? | A `VARIANT_CLASSES` lookup map keyed by variant inside `FrostedCard.tsx` | Keeps all tier definitions co-located; readable at a glance; matches the project's convention of using lookup maps (see `Button.tsx:22` `SPINNER_SIZE_BY_BUTTON_SIZE`). Avoids a sprawling ternary chain. Alternative (cn() with object syntax) is workable but less readable for three multi-class blocks. |
| How to merge interactive hover classes per tier? | Same `VARIANT_CLASSES` map carries both base and hover class arrays per tier; `isInteractive ? hoverArr : []` in the `cn()` call | Mirrors the existing pattern at FrostedCard.tsx:34-43 (single `isInteractive && [...]` block). Keeps base/hover symmetrically defined. |
| Can callers still override `p-6` via `className`? | Yes — `cn()` puts `className` last so user classes win | Matches existing behavior. Spec § Func 2 line 81 explicitly preserves: "className prop merges cleanly via cn() so callers can still override per-instance if absolutely necessary." |
| Where to put the gradient variant logic in Button.tsx? | Extend the `variant !== 'light'` guards to `variant !== 'light' && variant !== 'gradient'` for the default-branch rules; add a sibling `variant === 'gradient'` block; add three gradient size lines mirroring the `light` size lines | Mirrors the `'light'` special-case pattern exactly. Keeps the existing `'primary'/'secondary'/'outline'/'ghost'` branch intact. |
| Should `BackgroundCanvas` use the new `canvas-shoulder`/`canvas-deep` Tailwind tokens via `bg-gradient-to-br` classes? | No — use inline `style` per spec § Func 4 | The composite of a radial gradient layered over a linear gradient is hard to express as a Tailwind class string. Inline `style` matches spec verbatim. The Tailwind canvas color tokens are added for FUTURE consumers (other page-level gradients) and for clarity in the design system; they aren't consumed by BackgroundCanvas itself. |
| Should the spec migrate the recon design-system file to document the new tier system? | No — out of scope for this pilot (spec § "Out of Scope") | Documentation update is a follow-up after the API surface is locked. Eyeball-only verification on `/bible` is the canonical check for this pilot. |
| Test for HorizonGlow REMOVAL on `/bible` — should we add an explicit "HorizonGlow not present" test? | No — manual eyeball at completion suffices | The component file stays at `components/daily/HorizonGlow.tsx`; only the import is removed from `BibleLanding.tsx`. A test asserting "HorizonGlow not rendered" couples to internals; the visual intent is verified by the regression eyeball check on `/daily` (still mounted) + `/bible` (no orbs). |
| Should `<Button variant="gradient">`'s focus ring override come from tailwind-merge resolving `focus-visible:ring-violet-300` after `focus-visible:ring-primary` in the merged class string? | Yes — relies on `cn()`'s tailwind-merge behavior to keep the LAST `focus-visible:ring-*` token | Existing convention in Button.tsx (the `'light'` variant doesn't override the focus ring today, so this is a new pattern). The classes merging order in Button.tsx:42-62 puts variant classes after the shared `focus-visible:ring-primary`, so `focus-visible:ring-violet-300` placed in the gradient block wins via tailwind-merge. Test in Step 3 asserts the final class contains `focus-visible:ring-violet-300`. |

---

## Implementation Steps

### Step 1: Add Tailwind tokens (violet ramp, canvas tones, box-shadow tokens)

**Objective:** Extend `tailwind.config.js` `theme.extend` with 10 violet color tokens, 2 canvas color tokens, and 6 box-shadow tokens. These are the new design tokens consumed by every subsequent step. No component changes yet.

**Files to create/modify:**
- `frontend/tailwind.config.js` — extend `theme.extend.colors` with the 12 new colors; add `theme.extend.boxShadow` (does not exist today) with the 6 new shadows.

**Details:**

Edit `frontend/tailwind.config.js`. Inside `theme.extend.colors` (currently lines 6-32), append these entries AFTER the existing entries (ordering: keep existing entries in place; append new ones at the bottom of the object so existing alphabetic-ish ordering isn't disturbed for the tokens already there):

```js
// Violet ramp (FrostedCard pilot — bridges existing `primary` / `primary-lt`)
'violet-50': '#F5F3FF',
'violet-100': '#EDE9FE',
'violet-200': '#DDD6FE',
'violet-300': '#C4B5FD',
'violet-400': '#A78BFA',
'violet-500': '#8B5CF6', // matches `primary-lt`; both stay
'violet-600': '#7C3AED',
'violet-700': '#6D28D9', // matches `primary`; both stay
'violet-800': '#5B21B6',
'violet-900': '#4C1D95',

// BackgroundCanvas tones (used for future page-level gradients; the
// canonical BackgroundCanvas component uses inline `style` with hex
// literals, so these tokens are forward-looking for other consumers.)
'canvas-shoulder': '#0F0A1A',
'canvas-deep': '#0A0814',
```

Add a NEW `boxShadow` extension to `theme.extend` (place AFTER `transitionTimingFunction` and BEFORE `keyframes`, so the structural ordering reads colors → fonts → durations → easings → shadows → keyframes → animations):

```js
boxShadow: {
  'frosted-base': '0 4px 16px rgba(0,0,0,0.30)',
  'frosted-hover': '0 6px 24px rgba(0,0,0,0.35)',
  'frosted-accent': '0 0 30px rgba(139,92,246,0.12), 0 4px 20px rgba(0,0,0,0.35)',
  'frosted-accent-hover': '0 0 30px rgba(139,92,246,0.18), 0 6px 24px rgba(0,0,0,0.40)',
  'gradient-button': '0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)',
  'gradient-button-hover': '0 0 32px rgba(167,139,250,0.45), 0 6px 20px rgba(0,0,0,0.40)',
},
```

After the edit, run `pnpm tsc --noEmit` to confirm no TypeScript noise (Tailwind config is JS, but verify the project still typechecks cleanly).

**Auth gating:** N/A — config-only change.

**Responsive behavior:** N/A — token definitions only; no UI rendered.

**Inline position expectations:** N/A — no UI in this step.

**Guardrails (DO NOT):**
- Do NOT remove or rename `primary` (`#6D28D9`) or `primary-lt` (`#8B5CF6`). Both remain — they're aliases of `violet-700` and `violet-500` respectively.
- Do NOT modify any existing keyframe or animation entries.
- Do NOT introduce a `boxShadow.DEFAULT` key — Tailwind treats `DEFAULT` specially and would change `shadow` semantics globally.
- Do NOT use single quotes inside the rgba() literals if the file uses double quotes (verify file style; the file currently uses single quotes everywhere, so single quotes inside `rgba(...)` is fine because the rgba string itself doesn't contain quotes).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing FrostedCard / Button tests must still pass after config change | regression | `pnpm test FrostedCard.test.tsx Button.test.tsx` — pre-edit baseline; tokens shouldn't break anything |
| `pnpm build` succeeds | smoke | Tailwind compiles the new tokens into the production CSS bundle without warnings |

(No unit tests for tailwind.config itself — it's configuration, not application code.)

**Expected state after completion:**
- [ ] `frontend/tailwind.config.js` has 10 new violet tokens, 2 canvas tokens, 6 box-shadow tokens
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` succeeds (Tailwind compiles new tokens)
- [ ] Existing tests still pass

---

### Step 2: Create `BackgroundCanvas` component + its test file

**Objective:** New page-wrapper component that renders the radial-darkness-over-diagonal-gradient treatment via inline `style`. Replaces `bg-hero-bg` + `<HorizonGlow />` on BibleLanding (Step 5).

**Files to create/modify:**
- `frontend/src/components/ui/BackgroundCanvas.tsx` — new file
- `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` — new file (3 tests)

**Details:**

Create `frontend/src/components/ui/BackgroundCanvas.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BackgroundCanvasProps {
  children: ReactNode
  className?: string
}

const CANVAS_BACKGROUND =
  'radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0,0,0,0.55) 0%, transparent 70%), ' +
  'linear-gradient(135deg, #0F0A1A 0%, #0A0814 100%)'

export function BackgroundCanvas({ children, className }: BackgroundCanvasProps) {
  return (
    <div
      className={cn('relative min-h-screen overflow-hidden', className)}
      style={{ background: CANVAS_BACKGROUND }}
    >
      {children}
    </div>
  )
}
```

Create `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BackgroundCanvas } from '../BackgroundCanvas'

describe('BackgroundCanvas', () => {
  it('renders children', () => {
    render(<BackgroundCanvas>Hello world</BackgroundCanvas>)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('applies custom className alongside base classes', () => {
    const { container } = render(
      <BackgroundCanvas className="flex flex-col font-sans">child</BackgroundCanvas>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('relative')
    expect(root.className).toContain('min-h-screen')
    expect(root.className).toContain('overflow-hidden')
    expect(root.className).toContain('flex')
    expect(root.className).toContain('flex-col')
    expect(root.className).toContain('font-sans')
  })

  it('has min-h-screen + relative + overflow-hidden in the merged className', () => {
    const { container } = render(<BackgroundCanvas>x</BackgroundCanvas>)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('relative')
    expect(root.className).toContain('min-h-screen')
    expect(root.className).toContain('overflow-hidden')
  })
})
```

**Auth gating:** N/A — pure presentational component.

**Responsive behavior:**
- Desktop (1440px): radial ellipse renders centered slightly right of center; corner regions show faint purple via the linear gradient diagonal; full viewport coverage via `min-h-screen`.
- Tablet (768px): same — percentage-based ellipse scales naturally.
- Mobile (375px): same — center-fade still visible per spec.

**Inline position expectations:** N/A — full-page wrapper.

**Guardrails (DO NOT):**
- Do NOT use Tailwind classes for the gradient (e.g., `bg-gradient-to-br from-canvas-shoulder to-canvas-deep`). The composite of radial-over-linear cannot be expressed cleanly in a Tailwind class chain; the inline `style` in the spec is canonical.
- Do NOT add animation, layered DOM, or pseudo-elements. Spec § Non-Functional Requirements line 141: "BackgroundCanvas renders a single `<div>` with inline `style` — no animation, no layered DOM, no impact on Lighthouse Performance."
- Do NOT default `className` to anything — leave it `undefined` so consumers control the merge order.
- Do NOT export named constants beyond the component itself.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders children | unit | `render(<BackgroundCanvas>Hello</BackgroundCanvas>)`; assert "Hello" in document |
| applies custom className | unit | Render with `className="flex flex-col font-sans"`; assert merged class string contains all base + custom classes |
| has base classes in merged className | unit | Render with no className prop; assert `relative`, `min-h-screen`, `overflow-hidden` all present |

**Expected state after completion:**
- [ ] `frontend/src/components/ui/BackgroundCanvas.tsx` exists with the component
- [ ] `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` has 3 passing tests
- [ ] Component imports cleanly when consumed elsewhere (verified via Step 5)

---

### Step 3: Extend `Button` with `gradient` variant + 6 new tests

**Objective:** Add `'gradient'` to the variant union, wire it into the special-case branch alongside `'light'`, and add 6 new tests. The existing `'primary'/'secondary'/'outline'/'ghost'/'light'` variants must continue to behave identically.

**Files to create/modify:**
- `frontend/src/components/ui/Button.tsx` — extend variant union; add gradient branch; add gradient size table
- `frontend/src/components/ui/__tests__/Button.test.tsx` — append 6 new tests

**Details:**

In `frontend/src/components/ui/Button.tsx`:

1. Update the `variant` union at line 14:
   ```ts
   variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient'
   ```

2. Update the `cn()` call at lines 42-62 to add the gradient branch. The diff:
   - Line 46 currently: `variant !== 'light' && 'rounded-md'` → change to `variant !== 'light' && variant !== 'gradient' && 'rounded-md'`
   - Line 47-48 currently: the `'light'` branch. Append a sibling for `'gradient'`:
     ```ts
     variant === 'gradient' &&
       'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
     ```
   - Inside the `{ ... }` size object (lines 49-60), update each `variant !== 'light'` guard to `variant !== 'light' && variant !== 'gradient'`. For the three default size lines:
     ```ts
     'h-9 px-3 text-sm': size === 'sm' && variant !== 'light' && variant !== 'gradient',
     'h-10 px-4': size === 'md' && variant !== 'light' && variant !== 'gradient',
     'h-12 px-6 text-lg': size === 'lg' && variant !== 'light' && variant !== 'gradient',
     ```
   - Add three gradient size lines mirroring the `light` size lines (placed right after the light size lines, lines 57-59):
     ```ts
     'px-4 py-2 text-sm': size === 'sm' && variant === 'gradient',
     'px-6 py-2.5 text-sm': size === 'md' && variant === 'gradient',
     'px-8 py-3 text-base': size === 'lg' && variant === 'gradient',
     ```

3. **Verify no other change is required:** the shared base classes at line 43-45 (`inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast motion-reduce:transition-none`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`, `disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]`) all apply to the gradient variant. The `focus-visible:ring-primary` is overridden by `focus-visible:ring-violet-300` in the gradient block via tailwind-merge (placed AFTER the shared rule in the merge order).
4. The `forwardRef`, `asChild`, and `isLoading` machinery at lines 64-103 require ZERO changes. The gradient + asChild + Link composition works via existing `cn(merged, childElement.props.className)`.

In `frontend/src/components/ui/__tests__/Button.test.tsx`, append the 6 new tests at the end of the outer `describe('Button', ...)` block (before the closing `})`):

```ts
  describe('gradient variant', () => {
    it('gradient variant renders with bg-gradient-to-br', () => {
      render(<Button variant="gradient">Go</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('bg-gradient-to-br')
      expect(btn.className).toContain('from-violet-400')
      expect(btn.className).toContain('to-violet-300')
    })

    it('gradient variant uses violet-900 text color', () => {
      render(<Button variant="gradient">Go</Button>)
      expect(screen.getByRole('button').className).toContain('text-violet-900')
    })

    it('gradient variant uses rounded-full', () => {
      render(<Button variant="gradient">Go</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('rounded-full')
      expect(btn.className).not.toContain('rounded-md')
    })

    it('gradient variant uses min-h-[44px]', () => {
      render(<Button variant="gradient">Go</Button>)
      expect(screen.getByRole('button').className).toContain('min-h-[44px]')
    })

    it('gradient variant + asChild forwards classes to child', () => {
      render(
        <Button variant="gradient" asChild>
          <a href="/x">Go</a>
        </Button>,
      )
      const link = screen.getByRole('link', { name: 'Go' })
      expect(link.tagName).toBe('A')
      expect(link.className).toContain('bg-gradient-to-br')
      expect(link.className).toContain('rounded-full')
      expect(link.className).toContain('text-violet-900')
    })

    it('gradient variant has shadow-gradient-button', () => {
      render(<Button variant="gradient">Go</Button>)
      expect(screen.getByRole('button').className).toContain('shadow-gradient-button')
    })
  })
```

**Auth gating:** N/A — pure UI primitive.

**Responsive behavior:**
- Desktop (1440px): pill renders at `size="md"` default (`px-6 py-2.5 text-sm`); hover lifts via `hover:-translate-y-0.5`.
- Tablet (768px): same.
- Mobile (375px): `min-h-[44px]` enforces touch target; `motion-reduce:hover:translate-y-0` cancels lift if prefers-reduced-motion.

**Inline position expectations:** N/A at the Button level; the inline-row position expectations live with consumers (ResumeReadingCard at Step 7).

**Guardrails (DO NOT):**
- Do NOT remove or modify the existing `'primary'/'secondary'/'outline'/'ghost'/'light'` variants. The gradient variant is purely additive.
- Do NOT remove the `variant !== 'light'` guards entirely — they must become `variant !== 'light' && variant !== 'gradient'` so the default branch excludes both special-case variants.
- Do NOT add a hardcoded duration or cubic-bezier — the gradient hover-lift uses the existing `transition-[colors,transform] duration-fast` from Button.tsx:43.
- Do NOT introduce `animate-glow-pulse` or any pulsing animation. Static box-shadow tokens only.
- Do NOT change the Button component's display name or `forwardRef` signature.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `gradient variant renders with bg-gradient-to-br` | unit | Class string contains gradient direction + endpoints |
| `gradient variant uses violet-900 text color` | unit | `text-violet-900` present |
| `gradient variant uses rounded-full` | unit | `rounded-full` present, `rounded-md` absent |
| `gradient variant uses min-h-[44px]` | unit | Touch target preserved |
| `gradient variant + asChild forwards classes to child` | unit | Wrapping `<a>` carries gradient classes |
| `gradient variant has shadow-gradient-button` | unit | New shadow token applied |
| Existing 28 Button tests | regression | All preserved unchanged; verify still pass |

**Expected state after completion:**
- [ ] Button accepts `variant="gradient"` without TypeScript errors
- [ ] `<Button variant="gradient" asChild><Link>x</Link></Button>` renders an `<a>` with all gradient classes
- [ ] All 28 existing Button tests pass
- [ ] All 6 new gradient tests pass
- [ ] `pnpm tsc --noEmit` passes

---

### Step 4: Extend `FrostedCard` with `variant` prop + rewrite/add tests

**Objective:** Add the `variant: 'accent' | 'default' | 'subdued'` prop (default `'default'`), implement all three tier class definitions, preserve all existing behavioral props (`as`, `tabIndex`, `role`, `onKeyDown`, `className`, `onClick`), update 7 brittle class-string tests, add ~9 new tier-specific tests.

**Files to create/modify:**
- `frontend/src/components/homepage/FrostedCard.tsx` — extend props; add VARIANT_CLASSES map; update merged class composition
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — rewrite 7 brittle tests; add 9 new tests

**Details:**

In `frontend/src/components/homepage/FrostedCard.tsx`, replace the entire file with:

```tsx
import { cn } from '@/lib/utils'

type FrostedCardVariant = 'accent' | 'default' | 'subdued'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
  variant?: FrostedCardVariant
}

interface VariantClassSet {
  base: string
  hover: string
}

const VARIANT_CLASSES: Record<FrostedCardVariant, VariantClassSet> = {
  accent: {
    base: 'bg-violet-500/[0.04] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/45 rounded-3xl p-6 shadow-frosted-accent',
    hover: 'hover:bg-violet-500/[0.08] hover:shadow-frosted-accent-hover hover:-translate-y-0.5',
  },
  default: {
    base: 'bg-white/[0.04] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 shadow-frosted-base',
    hover: 'hover:bg-white/[0.07] hover:shadow-frosted-hover hover:-translate-y-0.5',
  },
  subdued: {
    base: 'bg-white/[0.02] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.06] rounded-3xl p-5',
    hover: 'hover:bg-white/[0.04]',
  },
}

export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
  tabIndex,
  role,
  onKeyDown,
  variant = 'default',
}: FrostedCardProps) {
  const isInteractive = !!onClick
  const variantClasses = VARIANT_CLASSES[variant]

  return (
    <Component
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      onKeyDown={onKeyDown}
      className={cn(
        variantClasses.base,
        'transition-all motion-reduce:transition-none duration-base ease-decelerate',
        isInteractive && [
          'cursor-pointer',
          variantClasses.hover,
          'motion-reduce:hover:translate-y-0',
          'active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        ],
        className,
      )}
    >
      {children}
    </Component>
  )
}
```

**Implementation notes:**
- The `VARIANT_CLASSES.subdued.hover` carries only the bg-shift; spec § Func 2 line 72 specifies "Subdued: hover bg `bg-white/[0.04]`, no shadow change, no translate" — so no `hover:shadow-*` token, no `hover:-translate-y-0.5` in the subdued hover string.
- `motion-reduce:hover:translate-y-0` is conditionally applied alongside hover via the `isInteractive && [...]` array. The class is harmless on subdued (which has no translate to cancel) and matches the existing pattern.
- `subdued` tier with `onClick` set will still get `cursor-pointer`, `active:scale-[0.98]`, and the focus ring per spec § Func 2 line 72: "These tiles are non-interactive at the FrostedCard level; do not add hover behavior to subdued tiles in this spec." However, in the actual call sites (QuickActionsRow), the FrostedCard does NOT receive `onClick` — the inner `<button>` and `<Link>` carry the interaction. So `isInteractive` is false on the FrostedCard wrapper, and none of the hover/active classes apply. This matches the spec's intent.

In `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx`, replace the entire file with:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { FrostedCard } from '../FrostedCard'

describe('FrostedCard', () => {
  // --- Behavioral tests (preserved unchanged from pre-pilot) ---

  it('renders children', () => {
    render(<FrostedCard>Card content</FrostedCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders as div by default', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect(container.firstElementChild?.tagName).toBe('DIV')
  })

  it('as="button" renders button element', () => {
    render(
      <FrostedCard as="button" onClick={vi.fn()}>
        Click me
      </FrostedCard>,
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('as="article" renders article element', () => {
    const { container } = render(<FrostedCard as="article">Article content</FrostedCard>)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('with onClick has cursor-pointer', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('cursor-pointer')
  })

  it('without onClick lacks interactive hover classes', () => {
    const { container } = render(<FrostedCard>Static</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).not.toContain('cursor-pointer')
  })

  it('applies custom className', () => {
    const { container } = render(<FrostedCard className="my-custom-class">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('my-custom-class')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <FrostedCard as="button" onClick={handleClick}>
        Click me
      </FrostedCard>,
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  // --- Updated default-tier class-string tests (renamed; reflect new tokens) ---

  it('default tier has border-white/[0.08] base border', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-white/[0.08]')
  })

  it('default tier has bg-white/[0.04] base background', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-white/[0.04]')
  })

  it('default tier has shadow-frosted-base', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-base')
  })

  it('interactive default tier has hover bg-white/[0.07]', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('hover:bg-white/[0.07]')
  })

  it('interactive default tier has hover shadow-frosted-hover', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-hover')
  })

  // --- New tier-specific tests ---

  it('accent tier has bg-violet-500/[0.04]', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-violet-500/[0.04]')
  })

  it('accent tier has border-violet-400/45', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-violet-400/45')
  })

  it('accent tier has shadow-frosted-accent', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-accent')
  })

  it('accent tier interactive hover applies shadow-frosted-accent-hover', () => {
    const { container } = render(
      <FrostedCard variant="accent" onClick={vi.fn()}>
        Clickable
      </FrostedCard>,
    )
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'hover:shadow-frosted-accent-hover',
    )
  })

  it('subdued tier has bg-white/[0.02]', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-white/[0.02]')
  })

  it('subdued tier has border-white/[0.06]', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-white/[0.06]')
  })

  it('subdued tier has no shadow class', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).not.toContain('shadow-frosted-')
  })

  it('variant defaults to default when prop omitted', () => {
    const { container: omitted } = render(<FrostedCard>Content</FrostedCard>)
    const { container: explicit } = render(<FrostedCard variant="default">Content</FrostedCard>)
    const omittedCls = (omitted.firstElementChild as HTMLElement).className
    const explicitCls = (explicit.firstElementChild as HTMLElement).className
    // Tokens that define the default tier must appear in both
    expect(omittedCls).toContain('bg-white/[0.04]')
    expect(omittedCls).toContain('border-white/[0.08]')
    expect(omittedCls).toContain('shadow-frosted-base')
    expect(explicitCls).toContain('bg-white/[0.04]')
    expect(explicitCls).toContain('border-white/[0.08]')
    expect(explicitCls).toContain('shadow-frosted-base')
  })

  it('all variants use rounded-3xl', () => {
    for (const variant of ['accent', 'default', 'subdued'] as const) {
      const { container } = render(<FrostedCard variant={variant}>x</FrostedCard>)
      expect((container.firstElementChild as HTMLElement).className).toContain('rounded-3xl')
    }
  })
})
```

**Auth gating:** N/A — primitive component.

**Responsive behavior:**
- Desktop (1440px): all tiers render with their `md:` blur values (accent=12px, default=8px, subdued=8px).
- Tablet (768px): same — `md:` engages at 768px.
- Mobile (375px): accent=8px (from `backdrop-blur-md`), default=4px (from `backdrop-blur-sm`), subdued=4px.

**Inline position expectations:** N/A at the primitive level.

**Guardrails (DO NOT):**
- Do NOT remove or rename existing prop names (`onClick`, `className`, `as`, `tabIndex`, `role`, `onKeyDown`). Adding `variant` is purely additive.
- Do NOT change `as: Component = 'div'` default — many call sites rely on it.
- Do NOT remove the `transition-all motion-reduce:transition-none duration-base ease-decelerate` line — it's preserved across all tiers per spec § Func 2 line 75.
- Do NOT remove `motion-reduce:hover:translate-y-0` — even though subdued has no translate, the class is harmless and the existing pattern is preserved.
- Do NOT remove `active:scale-[0.98]` or the focus ring. They are part of the "preserved across all tiers" set per spec § Func 2 line 78-79.
- Do NOT use object syntax in `cn()` to compute the variant classes — the `VARIANT_CLASSES[variant].base` string approach is cleaner and more readable than a sprawling conditional object.
- Do NOT mock the variant store or any module in tests — there's no store; render the real component with each `variant` prop value.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 8 preserved behavioral tests | unit | `renders children`, `renders as div by default`, `as="button"`, `as="article"`, `with onClick has cursor-pointer`, `without onClick lacks interactive hover classes`, `applies custom className`, `calls onClick when clicked` |
| 5 updated default-tier tests | unit | New token assertions (border-white/[0.08], bg-white/[0.04], shadow-frosted-base, hover:bg-white/[0.07], shadow-frosted-hover) |
| 9 new tier-specific tests | unit | Accent (bg, border, shadow, hover-shadow); Subdued (bg, border, no-shadow); variant default behavior; all-variants-rounded-3xl |
| **Total: 22 tests** | — | spec § Testing line 260 estimates ~20; the actual count is 22 because the default-tier tests broke into 5 instead of 7 after deduplication |

**Expected state after completion:**
- [ ] FrostedCard accepts `variant: 'accent' | 'default' | 'subdued'` with default `'default'`
- [ ] All three tiers use `rounded-3xl`
- [ ] All preserved behavioral tests still pass
- [ ] All 9 new tier tests pass
- [ ] No consumer files compile-error (existing call sites without `variant` still work — Steps 6-10 add it explicitly)
- [ ] `pnpm tsc --noEmit` passes

---

### Step 5: Migrate `BibleLanding.tsx` to use `BackgroundCanvas` (remove HorizonGlow)

**Objective:** Replace the outer wrapper div + HorizonGlow on `/bible` with `BackgroundCanvas`. The HorizonGlow component file STAYS — only the import + JSX mount in BibleLanding are removed.

**Files to create/modify:**
- `frontend/src/pages/BibleLanding.tsx` — replace outer wrapper; remove HorizonGlow import + JSX

**Details:**

In `frontend/src/pages/BibleLanding.tsx`:

1. **Remove the HorizonGlow import** at line 6:
   ```ts
   import { HorizonGlow } from '@/components/daily/HorizonGlow'
   ```
   Delete this line. Confirm via grep that `HorizonGlow` is not used elsewhere in the file (it's only at line 142 — the JSX mount being removed below).

2. **Add the BackgroundCanvas import.** Add this near the other component imports (e.g., right after the SiteFooter import at line 5):
   ```ts
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   ```

3. **Replace the outer wrapper.** Lines 140-141 currently:
   ```tsx
   <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
     <HorizonGlow />
   ```
   Replace with:
   ```tsx
   <BackgroundCanvas className="flex flex-col font-sans">
   ```
   (No `<HorizonGlow />` line; BackgroundCanvas owns `relative`, `min-h-screen`, `overflow-hidden`; the consumer adds only `flex flex-col font-sans`.)

4. **Update the closing tag** at line 239 from `</div>` to `</BackgroundCanvas>`.

5. **Verify** the file's other content (Navbar, SEO, main, BibleHero, divider, BibleHeroSlot, TodaysPlanCard, QuickActionsRow, BibleSearchEntry, SiteFooter, BibleDrawer, StreakDetailModal, StreakResetWelcome) is left untouched.

**Auth gating:** Existing auth gating preserved (none on the page-level wrapper; component-level auth gates in VerseOfTheDay / QuickActionsRow remain unchanged).

**Responsive behavior:**
- Desktop (1440px): page background shows the diagonal-fade-with-dark-center treatment. Cards and content sit on top via `relative z-10` (preserved from BibleLanding.tsx:146).
- Tablet (768px): same.
- Mobile (375px): same.

**Inline position expectations:** N/A — page-level shell change.

**Guardrails (DO NOT):**
- Do NOT modify `HorizonGlow.tsx` itself. The file stays in `components/daily/HorizonGlow.tsx`. DailyHub still imports and uses it.
- Do NOT remove `bg-hero-bg` from anywhere except the BibleLanding outer div. Other pages (Home, Daily Hub) retain it.
- Do NOT add `bg-hero-bg`, `min-h-screen`, `overflow-hidden`, or `relative` to BackgroundCanvas's `className` prop — they're owned by BackgroundCanvas and adding them duplicates.
- Do NOT modify the `<main id="main-content" className="relative z-10 flex-1">` element at line 146 — the z-index stack is preserved.
- Do NOT touch SEO, Navbar transparent flag, footer, drawer, modals, or streak logic.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing BibleLanding-related tests still pass | regression | Run `pnpm test BibleLanding` and `pnpm test bible/landing` to confirm no class-string assertions break. (Verified during recon: zero existing tests assert `bg-hero-bg`, `HorizonGlow`, or `min-h-screen` on BibleLanding outer.) |
| Manual eyeball on `/bible` after dev start | manual | Page background shows radial darkness centered slightly right of center, faint purple in corners. NO purple orb glow blobs (HorizonGlow gone). |
| Manual eyeball on `/daily` after dev start (regression check) | manual | HorizonGlow orbs STILL render. Page is unchanged from pre-spec. |

**Expected state after completion:**
- [ ] BibleLanding.tsx imports BackgroundCanvas, no longer imports HorizonGlow
- [ ] Outer wrapper is `<BackgroundCanvas className="flex flex-col font-sans">…</BackgroundCanvas>`
- [ ] No `<HorizonGlow />` in BibleLanding.tsx
- [ ] No `bg-hero-bg` in the BibleLanding outer wrapper
- [ ] DailyHub continues to use HorizonGlow (file untouched)
- [ ] `pnpm tsc --noEmit` passes
- [ ] All existing tests pass

---

### Step 6: Migrate `ActivePlanBanner` to `variant="accent"`

**Objective:** Replace the hand-built `border-l-4 border-l-primary/60 shadow-[…]` className override with the new `variant="accent"`. The accent variant carries an all-around violet-tinted border + violet-tinted glow shadow, REPLACING the left-edge stripe and inline shadow string entirely.

**Files to create/modify:**
- `frontend/src/components/bible/landing/ActivePlanBanner.tsx` — change FrostedCard props
- (No test changes — `ActivePlanBanner.test.tsx` has no class-string assertions per recon verification.)

**Details:**

In `frontend/src/components/bible/landing/ActivePlanBanner.tsx`, replace lines 25-28:
```tsx
<FrostedCard
  as="article"
  className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]"
>
```
with:
```tsx
<FrostedCard as="article" variant="accent">
```

The rest of the component (lines 29-75 — the `<p>`, `<h3>`, progress bar, day preview, CTA + secondary link) is untouched.

**Auth gating:** N/A. Existing public navigation to plan day page preserved.

**Responsive behavior:**
- Desktop (1440px): accent tier renders with `backdrop-blur-[12px]`, violet-tinted border + glow.
- Tablet (768px): same.
- Mobile (375px): `backdrop-blur-md` (8px); same border / glow.

**Inline position expectations:** "Continue today's reading" white pill (NOT modified by this spec — see "Pre-existing inconsistencies acknowledged but not fixed" in spec § Design Notes line 211: "ActivePlanBanner's larger CTA pill vs. ResumeReadingCard's smaller one — pre-existing inconsistency; deferred to rollout.") + "View plan" secondary link share y-coordinate at `sm:` and above.

**Guardrails (DO NOT):**
- Do NOT preserve any part of the old `border-l-4 border-l-primary/60` or `shadow-[…]` className. The accent variant replaces both.
- Do NOT change the existing white-pill "Continue today's reading" Link CTA — that's the larger ActivePlanBanner CTA pattern, deferred for follow-up rollout.
- Do NOT modify `progressbar` aria attributes, the `bg-primary` progress fill, or any text content.
- Do NOT add a `className` prop to the FrostedCard — the variant carries everything needed.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing 5 ActivePlanBanner tests | regression | All preserved unchanged (no class-string assertions; recon verified) |

**Expected state after completion:**
- [ ] `<FrostedCard as="article" variant="accent">` (no className override)
- [ ] No `border-l-4` or `border-l-primary` on this component
- [ ] All 5 existing ActivePlanBanner tests pass

---

### Step 7: Migrate `ResumeReadingCard` to `variant="accent"` + Button gradient pill

**Objective:** Replace the same `border-l-4 + inline shadow` override with `variant="accent"`. Replace the existing white-pill "Continue reading" Link with `<Button variant="gradient" size="md" asChild><Link …>…</Link></Button>`. Update the consumer test that asserts the old `border-l-primary/60` class.

**Files to create/modify:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — change FrostedCard variant; replace primary CTA with Button gradient
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — update the "has accent border" test (line 59-63) to assert the new accent variant

**Details:**

In `frontend/src/components/bible/landing/ResumeReadingCard.tsx`:

1. **Add the Button import** near the other imports at line 1-2:
   ```ts
   import { Button } from '@/components/ui/Button'
   ```

2. **Replace lines 22-25** (the FrostedCard opening):
   ```tsx
   <FrostedCard
     as="article"
     className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]"
   >
   ```
   with:
   ```tsx
   <FrostedCard as="article" variant="accent">
   ```

3. **Replace the primary CTA Link** at lines 37-42:
   ```tsx
   <Link
     to={`/bible/${slug}/${chapter}`}
     className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none duration-base hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   >
     Continue reading {book} {chapter}
   </Link>
   ```
   with:
   ```tsx
   <Button variant="gradient" size="md" asChild>
     <Link to={`/bible/${slug}/${chapter}`}>
       Continue reading {book} {chapter}
     </Link>
   </Button>
   ```

4. **Leave the secondary "Or read the next chapter" Link** at lines 43-50 unchanged. Per spec § Func 6: "The sibling secondary 'Or read the next chapter' link (when `nextChapter` is non-null) stays unchanged — it's a quiet text link, not a CTA pill."

In `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx`:

Update the test at lines 59-63:
```tsx
it('has accent border', () => {
  const { container } = renderCard()
  const article = container.querySelector('article')
  expect(article?.className).toContain('border-l-primary/60')
})
```
to:
```tsx
it('uses accent variant (violet-tinted border)', () => {
  const { container } = renderCard()
  const article = container.querySelector('article')
  expect(article?.className).toContain('border-violet-400/45')
})
```

The other existing tests (lines 24-58, 65-83) are preserved unchanged. Note: The test at line 65-69 ('"Continue" button has 44px min height') asserts `min-h-[44px]` on the link — it still passes because Button gradient variant carries `min-h-[44px]` in the merged class string when `asChild` forwards classes onto the `<a>`.

The test at line 71-74 ('does not have a redundant aria-label (visible text carries the name)') still passes — the Button doesn't add an aria-label; the `<Link>`'s text content "Continue reading John 3" is the accessible name.

The test at line 77-83 ('focus-visible ring on links') asserts `focus-visible:ring-2` on the continue link — still passes because the gradient variant carries `focus-visible:ring-2 focus-visible:ring-violet-300` (the `focus-visible:ring-2` is from the shared base; the violet ring color is a tier-specific override).

**Auth gating:** Public route `/bible/{slug}/{chapter}` — no auth required.

**Responsive behavior:**
- Desktop (1440px): accent tier card with `backdrop-blur-[12px]`; gradient pill renders with `min-h-[44px]`, `px-6 py-2.5 text-sm`; secondary link sits to the right via `sm:flex-row`.
- Tablet (768px): same.
- Mobile (375px): card with `backdrop-blur-md` (8px). CTA pill stacks above secondary link via default `flex-col`.

**Inline position expectations (UI step renders inline-row layout):**
- At 1440px and 768px, the gradient "Continue reading {book} {chapter}" pill and the "Or read the next chapter" secondary link must share the same y-coordinate (±5px). Verified by `/verify-with-playwright` Step 6l.
- At 375px, both elements stack via `flex-col` — different y is correct.

**Guardrails (DO NOT):**
- Do NOT keep any portion of the old white-pill `<Link>` className. The Button gradient variant replaces ALL of it (the entire `inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px…]` chain is gone).
- Do NOT modify the `to={`/bible/${slug}/${chapter}`}` href.
- Do NOT modify the visible link text `Continue reading {book} {chapter}`.
- Do NOT replace the secondary "Or read the next chapter" link with a Button — it stays as a plain `<Link>`.
- Do NOT remove `border-l-4` from any selector other than the FrostedCard className (no other element in this file has it).
- Do NOT add a className override to the FrostedCard — the accent variant carries everything.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `uses accent variant (violet-tinted border)` | unit | Updated from old `border-l-primary/60` assertion to `border-violet-400/45` |
| Existing 8 ResumeReadingCard tests | regression | All preserved; verify the `min-h-[44px]` and `focus-visible:ring-2` assertions still pass with the Button-rendered link (they do — both classes are in the gradient variant's class string) |

**Expected state after completion:**
- [ ] `<FrostedCard as="article" variant="accent">` with no className override
- [ ] Primary CTA renders via `<Button variant="gradient" size="md" asChild><Link …>` wrapping the React Router Link
- [ ] No `border-l-4`, `border-l-primary`, or inline `shadow-[…]` on the article
- [ ] No raw white-pill className on the Continue link
- [ ] Updated test asserts the new accent variant
- [ ] All 9 ResumeReadingCard tests pass
- [ ] Manual eyeball: gradient pill is purple (NOT white), lifts on hover, shows violet glow ring on focus

---

### Step 8: Migrate `VerseOfTheDay` to `variant="default"` (both instances)

**Objective:** Add explicit `variant="default"` to both FrostedCard instances in VerseOfTheDay (skeleton + loaded). Strictly speaking the default variant is the new fallback, but adding the prop explicitly future-proofs against accidental tier shifts and matches spec § Func 6 line 118 ("apply the variant explicitly").

**Files to create/modify:**
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — add `variant="default"` to both FrostedCard tags

**Details:**

In `frontend/src/components/bible/landing/VerseOfTheDay.tsx`:

1. Line 91: change
   ```tsx
   <FrostedCard as="article">
   ```
   to
   ```tsx
   <FrostedCard as="article" variant="default">
   ```

2. Line 116: change
   ```tsx
   <FrostedCard as="article">
   ```
   to
   ```tsx
   <FrostedCard as="article" variant="default">
   ```

The rest of the component (skeleton structure, verse blockquote, action buttons, share modal) is untouched.

**Auth gating:** Existing auth gating preserved at line 64-67 (`useAuthModal().openAuthModal('Sign in to save verses')` for the Save action when logged-out).

**Responsive behavior:**
- Desktop (1440px): default tier with `backdrop-blur-md` (8px), `bg-white/[0.04]`, `border-white/[0.08]`, `shadow-frosted-base`.
- Tablet (768px): same.
- Mobile (375px): `backdrop-blur-sm` (4px); same other tokens.

**Inline position expectations:** N/A for this step — VerseOfTheDay's action row (Read in context / Share / Save) and the date `<time>` are inline, but their layout is unchanged from pre-pilot.

**Guardrails (DO NOT):**
- Do NOT add any className override to either FrostedCard. Default variant carries everything.
- Do NOT modify the verse blockquote or any other internal markup.
- Do NOT modify the share modal (`VotdShareModal`) interaction.
- Do NOT modify the bookmark store subscription pattern (lines 36-59) — that's a Pattern B subscription store and changing it would be a BB-45 anti-pattern.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing VerseOfTheDay tests | regression | All preserved unchanged (no class-string assertions per recon) |

**Expected state after completion:**
- [ ] Both FrostedCard instances have explicit `variant="default"`
- [ ] No className override added
- [ ] All existing VerseOfTheDay tests pass

---

### Step 9: Migrate `TodaysPlanCard` to `variant="default"`

**Objective:** Add explicit `variant="default"` to TodaysPlanCard's FrostedCard. Acknowledge but do NOT fix the pre-existing "+N more" pill drift (spec § Func 6 line 120: "Known visual drift not fixed in this spec … Flagged for follow-up cleanup.").

**Files to create/modify:**
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx` — add `variant="default"`

**Details:**

In `frontend/src/components/bible/landing/TodaysPlanCard.tsx`, line 21: change
```tsx
<FrostedCard as="article">
```
to
```tsx
<FrostedCard as="article" variant="default">
```

The "+N more" pill at lines 43-48 (`bg-white/[0.06] border border-white/[0.12]`) is INTENTIONALLY UNCHANGED in this spec. It uses the OLD FrostedCard surface tokens; after this spec the parent default tier moves to `bg-white/[0.04]` / `border-white/[0.08]`, creating a slight visual drift between the parent card and the inner pill. Per spec, this is acknowledged drift, NOT fixed here.

**Auth gating:** N/A. Public link to plan detail.

**Responsive behavior:** Same as Step 8 (default tier).

**Inline position expectations:** N/A — single card with a Link wrapping its content.

**Guardrails (DO NOT):**
- Do NOT modify the "+N more" pill className. Pre-existing drift is acknowledged for follow-up.
- Do NOT modify the progressbar markup, plan title, day count, or todayReading text.
- Do NOT add a className override to the FrostedCard.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing TodaysPlanCard tests | regression | All preserved unchanged (no class-string assertions per recon) |

**Expected state after completion:**
- [ ] `<FrostedCard as="article" variant="default">` (no override)
- [ ] All existing TodaysPlanCard tests pass

---

### Step 10: Migrate `QuickActionsRow` tiles to `variant="subdued"`

**Objective:** Add `variant="subdued"` to all 3 QuickActionsRow FrostedCard tiles, while preserving the `min-h-[44px]` className override on each (44px touch-target floor — mandatory per WCAG and spec).

**Files to create/modify:**
- `frontend/src/components/bible/landing/QuickActionsRow.tsx` — add `variant="subdued"` to all 3 tiles

**Details:**

In `frontend/src/components/bible/landing/QuickActionsRow.tsx`:

1. Line 23: change
   ```tsx
   <FrostedCard as="article" className="min-h-[44px]">
   ```
   to
   ```tsx
   <FrostedCard as="article" variant="subdued" className="min-h-[44px]">
   ```

2. Line 37: same change.

3. Line 57: same change.

Each tile retains its inner `<button>` (Browse Books) or `<Link>` (My Bible, Reading Plans) which carry the actual interaction and focus ring; the FrostedCard wrapper itself does NOT receive `onClick`, so subdued tier's hover bg-shift class does not apply (it's correctly absent). The 44px touch-target floor is preserved on the FrostedCard wrapper because the inner interactive element fills the card.

**Auth gating:**
- Browse Books: opens the BibleDrawer (no auth required). Preserved unchanged.
- My Bible: gated via `useAuth` + `useAuthModal('Sign in to access your highlights, notes, and reading history.')` for logged-out users (lines 40-47). Preserved unchanged.
- Reading Plans: public navigation. Preserved unchanged.

**Responsive behavior:**
- Desktop (1440px): subdued tier, `backdrop-blur-md` (8px), `bg-white/[0.02]`, `border-white/[0.06]`, no shadow. `p-5` padding (smaller than default's `p-6`). 3-column grid via `sm:grid-cols-3`.
- Tablet (768px): same.
- Mobile (375px): `backdrop-blur-sm` (4px); single-column stack.

**Inline position expectations:**
- At 1440px and 768px, all 3 tiles share the same y-coordinate via `grid-cols-1 sm:grid-cols-3`.
- At 375px (below 640px), tiles stack vertically — different y is correct per spec.

**Guardrails (DO NOT):**
- Do NOT remove the `min-h-[44px]` className from any tile. It's the canonical 44px touch-target floor and is mandatory per spec § Non-Functional Requirements line 139 and WCAG.
- Do NOT add `onClick` to the FrostedCard wrapper. The interaction lives on the inner `<button>` (Browse Books) and `<Link>` (My Bible, Reading Plans).
- Do NOT add hover behavior to subdued tiles in this spec. Per spec § Func 6 line 122: "These tiles are non-interactive at the FrostedCard level; do not add hover behavior to subdued tiles in this spec."
- Do NOT touch the auth-gate logic on My Bible (lines 40-47).
- Do NOT modify the BibleDrawer integration on Browse Books.
- Do NOT change icon, title, or description text.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing QuickActionsRow tests | regression | All preserved unchanged (no class-string assertions per recon; behavioral tests cover 3 tiles render, drawer open, auth gate, link href) |

**Expected state after completion:**
- [ ] All 3 FrostedCard tiles have `variant="subdued"` AND `className="min-h-[44px]"`
- [ ] Existing auth gate on My Bible preserved
- [ ] Existing BibleDrawer integration on Browse Books preserved
- [ ] All existing QuickActionsRow tests pass

---

### Step 11: End-to-end verification (typecheck, tests, manual eyeball)

**Objective:** Confirm the pilot is complete and matches the spec's acceptance criteria.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `cd frontend && pnpm tsc --noEmit` — expect clean exit. No new TypeScript errors anywhere.
2. Run `cd frontend && pnpm test` — expect:
   - No new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files).
   - The 11 pre-existing failures are documented tech debt; the count must not increase.
   - All 22 FrostedCard tests pass (was 13).
   - All 6 new Button gradient tests pass (existing 28 still pass).
   - All 3 new BackgroundCanvas tests pass.
   - The updated ResumeReadingCard "uses accent variant" test passes.
3. Run `cd frontend && pnpm build` — expect clean Tailwind compile of the new tokens; no warnings about unrecognized classes.
4. **Manual eyeball verification on `/bible`** with the dev server running (`pnpm dev`), at the four BibleLanding branches:
   - **Active plan branch** (mock or real data with active plan present): ActivePlanBanner has visible all-around violet-tinted border + violet glow; ResumeReadingCard below it also accent-styled; VerseOfTheDay (if rendered as part of stack) reads neutral.
   - **Active reader branch** (last-read present, no plan): ResumeReadingCard accent; VerseOfTheDay neutral.
   - **First-time / lapsed reader branches** (no last-read, no plan): VerseOfTheDay alone with default tier.
   - All branches: TodaysPlanCard (when plans present) reads cleaner/quieter than accent cards; QuickActionsRow's 3 tiles recede visually compared to the cards above; cards have noticeably more rounded corners than before (`rounded-3xl` vs. previous `rounded-2xl`); ResumeReadingCard's "Continue reading" CTA is a purple gradient pill with deep-purple text, lifts on hover, shows violet glow ring on focus.
5. **Manual eyeball regression check on `/daily`**: HorizonGlow purple orbs still mount; the page is unchanged from pre-spec. The DailyHub's HorizonGlow continues to render (file `components/daily/HorizonGlow.tsx` is untouched; DailyHub.tsx still imports and mounts it).
6. **Playwright headless capture (optional, encourage)**: at 1440px / 768px / 375px viewports on `/bible`, save screenshots to `frontend/playwright-screenshots/frostedcard-pilot-{viewport}.png` for review. Run with `headless: true` per memory.

**Auth gating:** N/A.

**Responsive behavior:** N/A — verification step.

**Inline position expectations:** Verified during this step against the table above.

**Guardrails (DO NOT):**
- Do NOT commit before manual eyeball verification on both `/bible` and `/daily` is complete.
- Do NOT bypass typecheck or test failures as "expected" without comparing against the documented 11-pre-existing-fail baseline.
- Do NOT skip the regression check on `/daily` — the spec explicitly requires it.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full frontend test suite | regression | `pnpm test` — fail count must equal 11 (baseline), pass count must be 8,811 + ~18 new (≈8,829) — exact growth is the new tests (FrostedCard +9, Button +6, BackgroundCanvas +3 = 18) |
| Typecheck | smoke | `pnpm tsc --noEmit` clean |
| Build | smoke | `pnpm build` succeeds |
| Manual `/bible` eyeball | manual | Per spec § Acceptance Criteria "Manual visual verification" |
| Manual `/daily` eyeball | manual | HorizonGlow regression check |

**Expected state after completion:**
- [ ] All acceptance criteria from spec § Acceptance Criteria are checked
- [ ] Test fail count unchanged (11 pre-existing, no regressions)
- [ ] Typecheck + build clean
- [ ] `/bible` shows the redesigned surface; `/daily` is unchanged

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Tailwind tokens (violet ramp, canvas tones, box-shadow) |
| 2 | 1 (canvas tones, future) | BackgroundCanvas component + 3 tests. (Note: BackgroundCanvas uses inline-style hex literals, NOT the canvas Tailwind tokens, so technically only depends on `tsc` working — but Step 1 is the natural anchor for "tokens are added.") |
| 3 | 1 | Button gradient variant (uses violet-300/400/900 + shadow-gradient-button*) + 6 tests |
| 4 | 1 | FrostedCard variant prop (uses violet-400/45, violet-500/[0.04], shadow-frosted-* tokens) + test rewrites + 9 new tests |
| 5 | 2 | BibleLanding migration to BackgroundCanvas |
| 6 | 4 | ActivePlanBanner → variant="accent" |
| 7 | 3, 4 | ResumeReadingCard → variant="accent" + Button gradient pill |
| 8 | 4 | VerseOfTheDay → variant="default" (×2) |
| 9 | 4 | TodaysPlanCard → variant="default" |
| 10 | 4 | QuickActionsRow → variant="subdued" (×3) |
| 11 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Verification + manual eyeball |

**Recommended execution order:** Steps 1 → 2 → 3 → 4 (foundation, all four can be done back-to-back without restarts). Then Step 5 (page-level shell migration). Then Steps 6 → 7 → 8 → 9 → 10 (consumer migrations, any order — they're independent). Finally Step 11 (verification).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add Tailwind tokens (violet ramp, canvas tones, box-shadow tokens) | [COMPLETE] | 2026-04-30 | `frontend/tailwind.config.js` — appended 10 violet + 2 canvas color tokens after `surface-dark`; added new `boxShadow` extension between `transitionTimingFunction` and `keyframes` with 6 frosted/gradient shadow tokens. `pnpm tsc --noEmit` clean. |
| 2 | Create `BackgroundCanvas` component + its test file | [COMPLETE] | 2026-04-30 | New `frontend/src/components/ui/BackgroundCanvas.tsx` (component with `cn()`-merged base + inline radial-over-linear gradient style). New `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` (3 passing tests). |
| 3 | Extend `Button` with `gradient` variant + 6 new tests | [COMPLETE] | 2026-04-30 | `frontend/src/components/ui/Button.tsx` — added `'gradient'` to variant union; added gradient class block in special-case branch; updated `variant !== 'light'` guards to also exclude `'gradient'`. **Deviation:** combined the `light` and `gradient` size-table conditions into single object keys (`(variant === 'light' \|\| variant === 'gradient')`) instead of duplicate keys per the plan. Same className output, no duplicate-key issue. `frontend/src/components/ui/__tests__/Button.test.tsx` — appended `describe('gradient variant')` block with 6 tests. Total: 22 prior + 6 new = 28 tests, all pass. |
| 4 | Extend `FrostedCard` with `variant` prop + rewrite/add tests | [COMPLETE] | 2026-04-30 | `frontend/src/components/homepage/FrostedCard.tsx` rewritten with `VARIANT_CLASSES` lookup map, `variant` prop default `'default'`. `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` rewritten — 22 tests total (8 preserved behavioral + 5 updated default-tier + 9 new tier-specific), all pass. `pnpm tsc --noEmit` clean across all consumers. |
| 5 | Migrate `BibleLanding.tsx` to use `BackgroundCanvas` (remove HorizonGlow) | [COMPLETE] | 2026-04-30 | `frontend/src/pages/BibleLanding.tsx` — replaced `HorizonGlow` import with `BackgroundCanvas`; outer wrapper now `<BackgroundCanvas className="flex flex-col font-sans">`; closing tag updated. HorizonGlow file untouched (still used by DailyHub, MyBiblePage, PlanBrowserPage). 25 BibleLanding tests pass. |
| 6 | Migrate `ActivePlanBanner` to `variant="accent"` | [COMPLETE] | 2026-04-30 | `frontend/src/components/bible/landing/ActivePlanBanner.tsx` — `<FrostedCard as="article" variant="accent">` (no className override). 5 tests pass. |
| 7 | Migrate `ResumeReadingCard` to `variant="accent"` + Button gradient pill | [COMPLETE] | 2026-04-30 | `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — added Button import; FrostedCard now `variant="accent"` (no className override); primary CTA replaced with `<Button variant="gradient" size="md" asChild><Link …>`; secondary "Or read the next chapter" link untouched. Test updated to assert `border-violet-400/45` instead of `border-l-primary/60`. 10 tests pass. |
| 8 | Migrate `VerseOfTheDay` to `variant="default"` (both instances) | [COMPLETE] | 2026-04-30 | `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — both FrostedCard instances (skeleton + loaded) gained `variant="default"`. 17 tests pass. |
| 9 | Migrate `TodaysPlanCard` to `variant="default"` | [COMPLETE] | 2026-04-30 | `frontend/src/components/bible/landing/TodaysPlanCard.tsx` — `<FrostedCard as="article" variant="default">`. "+N more" pill drift acknowledged but NOT fixed (per spec). 9 tests pass. |
| 10 | Migrate `QuickActionsRow` tiles to `variant="subdued"` | [COMPLETE] | 2026-04-30 | `frontend/src/components/bible/landing/QuickActionsRow.tsx` — all 3 tiles now `<FrostedCard as="article" variant="subdued" className="min-h-[44px]">` (44px touch-target preserved). 10 tests pass. |
| 11 | End-to-end verification (typecheck, tests, manual eyeball) | [COMPLETE] | 2026-04-30 | `pnpm tsc --noEmit` clean. `pnpm build` clean (Tailwind compiled new tokens; no warnings about unrecognized classes). Full test suite: 9,364 pass / 2 fail across 2 files (DOWN from documented baseline 8,811/11/7). The 2 remaining fails (`useFaithPoints.test.ts` orphan test + `Pray.test.tsx` loading-text flake) match the documented pre-existing baseline; zero new regressions. **Plan deviation:** 6 downstream consumer test files (`ConversionPrompt.test.tsx`, `PopularTopicsSection.test.tsx`, `AskPage.test.tsx`, `DifferentiatorSection.test.tsx`, `DevotionalTabContent.test.tsx` ×2 assertions) hardcoded the OLD FrostedCard default-tier tokens (`rounded-2xl`, `bg-white/[0.06]`, `border-white/[0.12]`). Recon at `_plans/forums/frostedcard-redesign-recon.md` only verified BibleLanding-children tests and missed these. Updated each to assert the new default-tier tokens (`rounded-3xl`, `bg-white/[0.04]`, `border-white/[0.08]`) — equivalent semantic assertions of the same FrostedCard contract. Manual eyeball verification on `/bible` and `/daily` (HorizonGlow regression check) is the user's final step via `pnpm dev`. |

---

## Post-Execution Notes

### Code review outcome (2026-04-30)

`/code-review _plans/forums/frostedcard-redesign-recon.md --spec _specs/frostedcard-pilot-bible-landing.md` — **CLEAN, zero blockers.** Two informational findings, neither requiring code changes:

1. Spec § Non-Functional Requirements line 142 originally claimed "Visual regression scope: Only `/bible`. `/daily` and all other routes are untouched." This contradicted the implementation, which (correctly) changes the FrostedCard `default` tier tokens — cascading slightly to every consumer that doesn't pass `variant`. Spec amended to accurately describe the cascade as intentional and to enumerate the affected manual-verify surfaces. See `_specs/frostedcard-pilot-bible-landing.md` § Non-Functional Requirements (post-amendment).
2. `09-design-system.md` § "Frosted Glass Cards (FrostedCard Component)" still documents the OLD pre-pilot tokens. Deferred per spec § Out of Scope ("follow-up rule-file edit … rolled into the eventual rollout spec"). Flagged here so it isn't forgotten when the rollout spec is scoped.

### Decision: no `legacy` variant

During review, the question came up of whether the pilot should have introduced a `'legacy'` variant preserving the OLD tokens for non-pilot consumers, with the visual change scoped strictly to `/bible`. **Decision: no.** Reasoning recorded for future spec authors:

- A `legacy` variant would be transitional cruft destined for deletion in the rollout phase. Adding API surface that we plan to remove violates "design for what you keep."
- The default-tier shift is small and directionally aligned with the rollout intent — it's the new house style, not a regression. Holding non-pilot consumers on old tokens via a `legacy` flag would freeze them in a deprecated state and create an inconsistent app.
- The implementer treated the cascade as intentional (test diffs assert the NEW tokens, not preserve the old ones). That's the correct read of spec intent.
- Skipping `legacy` means the eventual `09-design-system.md` rewrite documents actual current state, not a transient three-tier-plus-legacy state.

### Pre-commit checklist for the user

- [ ] Manual eyeball pass at `/bible` (active plan, active reader, lapsed reader, first-time branches)
- [ ] Manual eyeball pass at the cascade-affected surfaces: `/` (DifferentiatorSection), `/daily?tab=devotional` (Tier 1 reflection cards), `/ask` (verse cards + ConversionPrompt + PopularTopicsSection)
- [ ] Manual eyeball regression at `/daily` — HorizonGlow purple orbs still mount
- [ ] Manual contrast check on the new gradient pill (`text-violet-900` on `from-violet-400 to-violet-300`) — plan calculates 5.4:1–7.4:1, both pass AA; if the lighter end fails, darken the gradient endpoint, NOT the text color
- [ ] BackgroundCanvas radial-fade visible at 375px on `/bible`
