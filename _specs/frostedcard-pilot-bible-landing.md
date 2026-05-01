# FrostedCard Redesign Pilot (BibleLanding)

**Master Plan Reference:** N/A — standalone pilot. Recon at `_plans/forums/frostedcard-redesign-recon.md` is the source-of-truth audit; this spec is the canonical pilot scope.

**Branch discipline:** Stay on `forums-wave-continued`. Do not create new branches, commit, push, stash, or reset. The user manages all git operations manually.

---

## Affected Frontend Routes

- `/bible`
- `/daily` (regression check only — must keep its HorizonGlow; no other change)

---

## Overview

This spec rebuilds the visual surface of `BibleLanding` (`/bible`) so the page reads as a calm, layered sanctuary instead of a flat, mid-purple wash. It introduces a 3-tier `FrostedCard` system (accent / default / subdued) in Worship Room violet, adds a `gradient` purple-pill variant to the shared `Button`, and replaces BibleLanding's `HorizonGlow` + flat `bg-hero-bg` with a new `BackgroundCanvas` that renders a radial-darkness-over-diagonal-gradient treatment. The aesthetic target is the "Financial Push Ups" Lovable site — gradient pill button, frosted cards on a diagonal-fade dark canvas, with featured cards getting a tinted border + glow accent — translated into Worship Room purple.

This is explicitly a **pilot**. The prop API surface lands now and gets pattern-applied across the rest of the app in follow-up specs once locked. The scope is intentionally bounded to BibleLanding so the API can prove out before broader rollout.

The emotional intent: a Bible-focused user lands on `/bible` and feels stillness, focus, and depth — accent cards quietly draw the eye to "what you're doing right now," default cards hold daily ambient content, and subdued cards recede so they don't compete. The radial canvas gives the surface itself a slight focus pull toward the center, the way a reading lamp falls on a page.

## User Story

As a **logged-out visitor or logged-in reader**, I want the Bible landing page to feel calm, focused, and visually layered, so that the most relevant content (what I was reading, what I'm in a plan for, today's verse) reads as the priority and ambient surfaces fall into the background.

## Requirements

### Functional Requirements

1. **Token additions in `frontend/tailwind.config.js`** under `theme.extend`:
   - **Violet ramp** (50–900): `violet-50 #F5F3FF`, `violet-100 #EDE9FE`, `violet-200 #DDD6FE`, `violet-300 #C4B5FD`, `violet-400 #A78BFA`, `violet-500 #8B5CF6` (matches existing `primary-lt`), `violet-600 #7C3AED`, `violet-700 #6D28D9` (matches existing `primary`), `violet-800 #5B21B6`, `violet-900 #4C1D95`. Bridges existing `primary` / `primary-lt` without replacing them — both stay for backward compat.
   - **Canvas tones**: `canvas-shoulder #0F0A1A` (faintest purple, light corners), `canvas-deep #0A0814` (dark center).
   - **Six new box-shadow tokens**:
     - `frosted-base: 0 4px 16px rgba(0,0,0,0.30)`
     - `frosted-hover: 0 6px 24px rgba(0,0,0,0.35)`
     - `frosted-accent: 0 0 30px rgba(139,92,246,0.12), 0 4px 20px rgba(0,0,0,0.35)`
     - `frosted-accent-hover: 0 0 30px rgba(139,92,246,0.18), 0 6px 24px rgba(0,0,0,0.40)`
     - `gradient-button: 0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)`
     - `gradient-button-hover: 0 0 32px rgba(167,139,250,0.45), 0 6px 20px rgba(0,0,0,0.40)`

2. **`FrostedCard` component (`frontend/src/components/homepage/FrostedCard.tsx`)** gains a `variant` prop with three values: `'accent' | 'default' | 'subdued'`. Default is `'default'` so existing consumers without the prop continue to render with the workhorse tier. ALL three tiers use `rounded-3xl` (24px corners) — a deliberate move from today's `rounded-2xl` to match the FPU/Lovable softer feel.

   **Accent tier** (featured/active cards):
   - bg `bg-violet-500/[0.04]`
   - border `border border-violet-400/45`
   - backdrop-blur `backdrop-blur-md md:backdrop-blur-[12px]` (8px mobile / 12px desktop)
   - shadow `shadow-frosted-accent`
   - rounded `rounded-3xl`
   - padding `p-6`

   **Default tier** (workhorse, neutral frost):
   - bg `bg-white/[0.04]` (slightly lighter than today's `0.06`; pairs better with the stronger blur)
   - border `border border-white/[0.08]`
   - backdrop-blur `backdrop-blur-sm md:backdrop-blur-md` (4px mobile / 8px desktop)
   - shadow `shadow-frosted-base`
   - rounded `rounded-3xl`
   - padding `p-6`

   **Subdued tier** (nested or secondary content; recedes):
   - bg `bg-white/[0.02]`
   - border `border border-white/[0.06]`
   - backdrop-blur `backdrop-blur-sm md:backdrop-blur-md` (4px mobile / 6px desktop)
   - shadow none
   - rounded `rounded-3xl`
   - padding `p-5`

   **Hover treatment** (when `onClick` is set), per tier:
   - Accent: hover bg `bg-violet-500/[0.08]`, hover shadow `shadow-frosted-accent-hover`, hover `-translate-y-0.5`
   - Default: hover bg `bg-white/[0.07]`, hover shadow `shadow-frosted-hover`, hover `-translate-y-0.5`
   - Subdued: hover bg `bg-white/[0.04]`, no shadow change, no translate

   **Preserved on all tiers (do not regress):**
   - `transition-all motion-reduce:transition-none duration-base ease-decelerate`
   - `motion-reduce:hover:translate-y-0`
   - `active:scale-[0.98]` (interactive only)
   - `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`
   - `as` polymorphism (`div` | `button` | `article`)
   - `tabIndex`, `role`, `onKeyDown` props (a11y critical)
   - `className` prop merges cleanly via `cn()` so callers can still override per-instance if absolutely necessary

3. **`Button` component (`frontend/src/components/ui/Button.tsx`)** extends its variant union from `'primary' | 'secondary' | 'outline' | 'ghost' | 'light'` to add `'gradient'`. The `gradient` variant joins the special-case branch alongside `'light'` (both are pill-shaped, both override the default `rounded-md` + `h-*` + `px-*` size table).

   **Visual treatment (gradient variant):**
   - `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900`
   - hover: `hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`
   - `gap-2 font-semibold min-h-[44px]`
   - focus ring: `focus-visible:ring-violet-300` (overrides the shared `focus-visible:ring-primary` rule via tailwind-merge)

   **Size table for gradient variant** (modeled on `'light'`, NOT participating in the default size branch):
   - `sm`: `px-4 py-2 text-sm`
   - `md`: `px-6 py-2.5 text-sm`
   - `lg`: `px-8 py-3 text-base`

   The existing `asChild` and `isLoading` patterns require no changes. `<Button variant="gradient" asChild>` wrapping a `<Link>` must work end-to-end.

4. **New `BackgroundCanvas` component** at `frontend/src/components/ui/BackgroundCanvas.tsx`. Wraps a page in the FPU-style radial-darkness-over-diagonal-gradient treatment. Owns `relative min-h-screen overflow-hidden` plus the inline `style` background:
   ```
   radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0,0,0,0.55) 0%, transparent 70%),
   linear-gradient(135deg, #0F0A1A 0%, #0A0814 100%)
   ```
   Accepts `children` and an optional `className` that merges via `cn()`.

5. **`BibleLanding.tsx` migration**:
   - Replace the outer `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">` with `<BackgroundCanvas className="flex flex-col font-sans">`.
   - Remove the `<HorizonGlow />` mount from BibleLanding entirely. The `HorizonGlow` import from BibleLanding is removed if not used elsewhere in the file.
   - The `HorizonGlow.tsx` component file itself stays at `components/daily/HorizonGlow.tsx` — DailyHub still uses it.
   - `bg-hero-bg`, `min-h-screen`, `overflow-hidden`, `relative` are NOT duplicated on BackgroundCanvas's `className` (BackgroundCanvas owns them).
   - Everything else inside (`<Navbar transparent />`, `<SEO />`, `<main>`, `<SiteFooter />`, drawer, modals) renders unchanged.

6. **Tier mapping for the 5 BibleLanding FrostedCard consumers** (reflects how `BibleHeroSlot` stacks them — accent for active/actionable, default for ambient daily content, subdued for navigational tiles):

   - **`ActivePlanBanner.tsx`** → `variant="accent"`. REMOVE the existing `className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]"` override. The accent variant absorbs both the violet weight and the shadow; do not retain the left-edge stripe (accent is an all-around violet-tinted border).

   - **`ResumeReadingCard.tsx`** → `variant="accent"`. REMOVE the identical `border-l-4 border-l-primary/60 shadow-[…]` override. ALSO replace the existing primary CTA `<Link>` (the white-pill "Continue reading" with `rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)]` …) with `<Button variant="gradient" size="md" asChild><Link …>Continue reading {book} {chapter}</Link></Button>`. Add `import { Button } from '@/components/ui/Button'`. The sibling secondary "Or read the next chapter" link (when `nextChapter` is non-null) stays unchanged — it's a quiet text link, not a CTA pill.

   - **`VerseOfTheDay.tsx`** → `variant="default"` on BOTH `<FrostedCard as="article">` instances (loading skeleton at ~line 74 and loaded state at ~line 116). No existing className overrides to remove.

   - **`TodaysPlanCard.tsx`** → `variant="default"`. Plain `<FrostedCard as="article">` with no override today; apply the variant explicitly. **Known visual drift not fixed in this spec:** the hand-built "+N more" pill inside the card copies the OLD FrostedCard surface tokens (`bg-white/[0.06] border border-white/[0.12]`); after this spec the parent default tier moves to `bg-white/[0.04] border-white/[0.08]` and the pill drifts slightly. Flagged for follow-up cleanup.

   - **`QuickActionsRow.tsx`** → `variant="subdued"` on all 3 inner action tiles (Browse Books, My Bible, Reading Plans). Each tile keeps its existing `className="min-h-[44px]"` override (44px touch-target floor — not part of the variant system, mandatory). These tiles are non-interactive at the FrostedCard level; do not add hover behavior to subdued tiles in this spec.

7. **Test updates** (full detail under "Testing" below):
   - `FrostedCard.test.tsx`: 7 brittle class-string tests rewritten, ~9 new tier-specific tests added, 6 behavioral tests preserved unchanged. ~20 tests total expected.
   - `Button.test.tsx`: 6 new gradient-variant tests appended (file already exists).
   - `BackgroundCanvas.test.tsx`: new file, 3 tests.
   - `bible/landing/__tests__/*` consumer tests: verify-and-update pattern only — likely no class-string assertions exist today, but if any test asserts the OLD `border-l-4 border-l-primary/60` override on ActivePlanBanner or ResumeReadingCard, the assertion is updated to verify the new accent variant is applied.

### Non-Functional Requirements

- **Type safety:** TypeScript strict (project default). `pnpm tsc --noEmit` must pass cleanly.
- **Test pass:** `pnpm test` must pass, including all updated and new tests. No new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files).
- **Accessibility (preserved, not improved):**
  - FrostedCard's `tabIndex` / `role` / `onKeyDown` / focus-visible ring behavior preserved across all tiers.
  - All three tier hover/active states remain `motion-reduce`-safe (no translate when reduced motion is preferred).
  - Button gradient variant respects `motion-reduce:hover:translate-y-0`.
  - Button gradient text contrast: `text-violet-900` (`#4C1D95`) on `from-violet-400 to-violet-300` background — must clear WCAG AA 4.5:1 contrast for body weight; `font-semibold` further helps. (If verification finds the gradient lighter end fails AA, the fix is a darker gradient endpoint, not a text-color change — the violet-900-on-light-violet pairing is the design intent.)
  - 44px touch-target floor preserved on QuickActionsRow tiles (`min-h-[44px]` className kept).
  - Button gradient variant carries `min-h-[44px]` so the new ResumeReadingCard CTA also satisfies the touch-target floor.
- **Performance:** No new runtime dependencies. Tailwind tokens are build-time only. BackgroundCanvas renders a single `<div>` with inline `style` — no animation, no layered DOM, no impact on Lighthouse Performance.
- **Visual regression scope:**
  - **Pilot route (intentionally redesigned):** `/bible`. Card variants are wired explicitly per requirement 6; the page background flips from `bg-hero-bg + HorizonGlow` to `BackgroundCanvas`.
  - **Default-token cascade (intentional, unavoidable side-effect of the new pilot API):** Every consumer of `FrostedCard` that does NOT pass an explicit `variant` prop picks up the new default tier (`bg-white/[0.04]`, `border-white/[0.08]`, `rounded-3xl`, `shadow-frosted-base`, `backdrop-blur-sm md:backdrop-blur-md`). Confirmed callsites that shift visually as a result: `DifferentiatorSection` (homepage), `DevotionalTabContent` Tier 1 cards (Daily Hub `/daily?tab=devotional`), `AskPage` verse cards (`/ask`), `ConversionPrompt` (`/ask`), `PopularTopicsSection` (`/ask`). The shift is small (slightly more recessed surface, softer corners) and directionally aligned with the rollout intent — this is the new design language, not a regression. **No `legacy` variant is introduced** (would be transitional cruft destined for deletion in the rollout phase).
  - **Roll-your-own card consumers (untouched):** Pages that hand-code the old `bg-white/[0.06] border-white/[0.12] rounded-2xl` tokens directly (Dashboard, Settings, PrayerWall feed, Insights, Music, Challenges, Bible chrome, Daily Hub helpers per § Out of Scope) do NOT use the `FrostedCard` component and therefore do not shift. Each is migrated in its own follow-up spec.
  - **Page-level shells (untouched):** `/daily` keeps its `HorizonGlow` mount; manual eyeball check confirms.
  - **Manual verification list before commit:** `/bible` (every state — active plan, active reader, lapsed reader, first-time), `/daily?tab=devotional` (Tier 1 reflection cards), `/`  (homepage `DifferentiatorSection`), `/ask` (verse cards + ConversionPrompt + PopularTopicsSection), `/daily` HorizonGlow regression.

## Auth Gating

This is a visual-system spec only. No new interactive elements gain or lose auth behavior. Existing auth gating on the affected components is preserved unchanged:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Click ResumeReadingCard "Continue reading" gradient pill | Navigates to `/bible/{slug}/{chapter}` (Bible reading is public; no auth required per Bible Wave Auth Posture in `02-security.md`) | Same — navigates | N/A — no auth gate on Bible reading |
| Click ActivePlanBanner | Existing behavior preserved (links to plan day; reading plans are accessible to logged-out users in browse mode) | Same | N/A |
| Click VerseOfTheDay share/refresh affordances | Existing behavior preserved | Same | N/A |
| Click QuickActionsRow tiles (Browse Books / My Bible / Reading Plans) | Navigates to public Bible routes | Same | N/A |

`02-security.md` § "Bible Wave Auth Posture" is canonical: the Bible wave deliberately adds zero new auth gates. This pilot does not touch that posture.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Cards full-width within container; FrostedCard accent/default tiers use `backdrop-blur-md` (8px); subdued tier and default tier mobile fallback use `backdrop-blur-sm` (4px). BackgroundCanvas radial gradient ellipse stays at 60%/50% — visually still creates a center-fade on phones. Button gradient size `md` keeps `min-h-[44px]` for touch. QuickActionsRow remains in its existing layout (3 tiles in a row or stacked per current implementation — unchanged by this spec). |
| Tablet (640–1024px) | Same tier visual definitions. The `md:` breakpoint kicks in: accent gets `backdrop-blur-[12px]`; default gets `backdrop-blur-md` (8px); subdued bumps to ~6px. |
| Desktop (≥ 1024px) | Same tier behavior as tablet. BackgroundCanvas radial ellipse renders at full intent — visible darkness centered slightly right of center, faint purple undertone in corners. |

**Responsive notes:**
- No layout changes to BibleLanding's existing card stacking, grid, or main column — this spec only changes the visual surface of cards and the page background, not their arrangement.
- BackgroundCanvas's `min-h-screen` ensures the radial+linear background covers full viewport on every device.
- The Button gradient variant's pill shape (`rounded-full`) and 44px minimum height work identically across breakpoints.
- Hover states (translate, shadow change, color shift) only fire at hover-capable breakpoints; mobile taps trigger `active:scale-[0.98]` instead.

## AI Safety Considerations

N/A — This feature is purely visual (tokens, component variants, page background). No AI-generated content, no free-text user input, no crisis-detection surface area. No change to existing AI safety guardrails on any consumer component.

## Auth & Persistence

- **Logged-out users:** No persistence; visual changes only. No new localStorage reads or writes.
- **Logged-in users:** No persistence; visual changes only. No new database tables or columns.
- **localStorage usage:** None. This spec introduces zero new localStorage keys. Existing keys read by the affected components (e.g., `wr_bible_last_read`, `wr_bible_active_plans`) are untouched.
- **Route type:** Public (`/bible` is public; nothing in this spec changes that).

## Completion & Navigation

N/A — visual surface changes only. No completion signals, no navigation-flow impact. Existing in-component navigation (links, buttons, drawer triggers) preserved unchanged.

## Design Notes

**Tokens (new — defined in this spec):**
- Violet ramp `violet-50` … `violet-900` per requirement 1 above
- `canvas-shoulder #0F0A1A`, `canvas-deep #0A0814`
- 6 new box-shadow tokens (`frosted-base`, `frosted-hover`, `frosted-accent`, `frosted-accent-hover`, `gradient-button`, `gradient-button-hover`)

**Existing components reused (do not reinvent):**
- `cn()` utility from `@/lib/utils` — both new components and the FrostedCard variant logic merge classes via `cn()` so consumer-supplied `className` continues to override cleanly.
- `Button` component at `frontend/src/components/ui/Button.tsx` — extended with gradient variant, NOT replaced or duplicated.
- `FrostedCard` component at `frontend/src/components/homepage/FrostedCard.tsx` — extended with variant prop, NOT forked.
- `HorizonGlow.tsx` (`components/daily/HorizonGlow.tsx`) — file stays in place; only the import + mount in `BibleLanding.tsx` is removed. DailyHub continues to use HorizonGlow unchanged.
- `Navbar`, `SEO`, `SiteFooter`, `BibleHeroSlot`, drawer, modals — all preserved on BibleLanding without modification.

**New visual patterns introduced (not yet in design system recon — flag as `[NEW PATTERN]` for /plan):**
- Three-tier FrostedCard (accent / default / subdued) — the pattern itself is new even though the underlying surface tokens (frost on glass) are existing language.
- BackgroundCanvas radial-over-linear treatment — new page-level background pattern. Distinct from HorizonGlow (which uses positioned glow orbs) and from the existing `bg-hero-bg` flat fill.
- Button gradient variant (purple gradient pill with deep-purple text) — new CTA treatment. Distinct from `light` (white pill) and `primary` (solid color rect).

**Reference points (not requirements — context for /plan):**
- `09-design-system.md` § "Round 3 Visual Patterns" documents the existing FrostedCard tokens and HorizonGlow architecture this pilot evolves from.
- `_plans/forums/frostedcard-redesign-recon.md` (recon doc, untracked but staged) is the audit that drove this scope. /plan should read it during recon.
- Aesthetic target: "Financial Push Ups" Lovable site — gradient pill button, frosted cards on a diagonal-fade dark canvas, with featured cards getting a tinted border + glow accent. Translated to Worship Room purple.

**Pre-existing inconsistencies acknowledged but NOT fixed in this spec:**
- `ActivePlanBanner`'s larger CTA pill vs. `ResumeReadingCard`'s smaller one — pre-existing inconsistency; deferred to rollout.
- Focus-ring offset color drift (`focus-visible:ring-offset-dashboard-dark` vs. the actual `bg-hero-bg` / now BackgroundCanvas) — pre-existing; deferred.
- `TodaysPlanCard`'s hand-built "+N more" pill copying old FrostedCard tokens — visual drift acknowledged; deferred.
- Deprecated `Card.tsx` and unused `liquid-glass` utility — out of scope for this pilot.

## Out of Scope

- **Other FrostedCard consumers:** Homepage, MyBible, BibleReader, BiblePlanDetail, BiblePlanDay, RegisterPage, Daily Hub Devotional, AskPage. Each becomes a separate migration spec once the pilot's API surface is locked.
- **Rolls-own card consumers:** Dashboard, Settings, PrayerWall feed, Insights cluster, Music, Challenges, Bible chrome, Daily Hub helpers — none migrated in this pilot.
- **Other Button gradient adoptions:** Only ResumeReadingCard's primary CTA in this spec. Other CTAs across the app stay on their current variants.
- **AuthModal redesign:** The FPU login screenshot's green-link → purple-link treatment is a separate spec.
- **HorizonGlow removal anywhere except BibleLanding:** DailyHub continues to render HorizonGlow. The component file stays at `components/daily/HorizonGlow.tsx`.
- **Pre-existing inconsistency cleanup:** ActivePlanBanner ↔ ResumeReadingCard CTA size mismatch, focus-ring offset color drift, TodaysPlanCard "+N more" pill drift, deprecated `Card.tsx`, unused `liquid-glass` utility — all deferred.
- **Playwright visual regression baseline:** No infrastructure exists yet; manual eyeball review on `/bible` and regression eyeball on `/daily` is the verification path for this pilot.
- **New localStorage keys, backend changes, API shapes, content changes:** None. This is a pure visual-system spec.
- **Crisis detection or AI safety guardrails:** None added or modified.

## Testing

### `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` (existing, ~13 tests)

**Preserve unchanged (6 behavioral tests, class-string-agnostic):**
- renders children
- polymorphism (`as="div"`, `as="button"`, `as="article"`)
- onClick fires when clicked
- className prop merges via `cn()`
- `tabIndex` / `role` / `onKeyDown` props pass through
- Any other test that does not assert literal class strings on the rendered card

**Update (7 brittle class-string tests):**
1. `'has border-white/[0.12] base border'` → rename `'default tier has border-white/[0.08] base border'`. Assert new default tier border class.
2. `'has bg-white/[0.06] base background'` → rename `'default tier has bg-white/[0.04] base background'`. Assert new default tier bg class.
3. `'has base box-shadow'` → rename `'default tier has shadow-frosted-base'`. Assert presence of `shadow-frosted-base`.
4. `'with onClick has cursor-pointer'` → preserve as-is (cursor-pointer still applied for all interactive tiers).
5. `'without onClick lacks interactive hover classes'` → preserve as-is.
6. `'interactive card has hover border-white/[0.18]'` → rename `'interactive default tier has hover bg-white/[0.07]'`. Hover treatment now lives on bg, not border.
7. `'interactive card has hover shadow'` → update assertion from `'shadow-[0_0_35px'` substring to `'shadow-frosted-hover'` token name.

**Add (~9 new tier-specific tests):**
- `'accent tier has bg-violet-500/[0.04]'`
- `'accent tier has border-violet-400/45'`
- `'accent tier has shadow-frosted-accent'`
- `'accent tier interactive hover applies shadow-frosted-accent-hover'`
- `'subdued tier has bg-white/[0.02]'`
- `'subdued tier has border-white/[0.06]'`
- `'subdued tier has no shadow class'` (assert NOT toContain `shadow-frosted-`)
- `'variant defaults to default when prop omitted'` (compare className with explicit `variant="default"` to className with prop omitted; expect identical bg/border/shadow tokens)
- `'all variants use rounded-3xl'` (render each variant, assert each has `rounded-3xl`)

**Total expected after updates:** ~20 tests.

### `frontend/src/components/ui/__tests__/Button.test.tsx` (existing, append)

**Add 6 new gradient-variant tests:**
- `'gradient variant renders with bg-gradient-to-br'`
- `'gradient variant uses violet-900 text color'`
- `'gradient variant uses rounded-full'`
- `'gradient variant uses min-h-[44px]'`
- `'gradient variant + asChild forwards classes to child'`
- `'gradient variant has shadow-gradient-button'`

### `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` (new file, 3 tests)

- renders children
- applies custom className
- has `min-h-screen` + `relative` + `overflow-hidden` in the merged className

### `components/bible/landing/__tests__/*` consumer tests (verify-and-update)

- The recon flagged that consumer test files likely have NO class-string assertions on FrostedCard surface tokens. Verify during execution.
- If any consumer test asserts the OLD `border-l-4 border-l-primary/60` className override on ActivePlanBanner or ResumeReadingCard, update those assertions to verify the new accent variant is applied (e.g., assert `bg-violet-500/[0.04]` or assert `variant="accent"` was passed via a test-id strategy if the test uses one).
- `__tests__/BibleHeroSlot.test.tsx` exists. If it asserts class strings on rendered children (unlikely — it should only assert which child components render in which branch), preserve. If it does assert className strings, update those assertions.

## Acceptance Criteria

### Token + component API surface

- [ ] `tailwind.config.js` extended under `theme.extend`: violet ramp 50–900 (10 colors), 2 canvas color tokens (`canvas-shoulder`, `canvas-deep`), 6 box-shadow tokens (`frosted-base`, `frosted-hover`, `frosted-accent`, `frosted-accent-hover`, `gradient-button`, `gradient-button-hover`)
- [ ] `FrostedCard` accepts `variant: 'accent' | 'default' | 'subdued'` with default `'default'`
- [ ] All three FrostedCard variants render with their specified bg / border / blur / shadow / padding per the spec
- [ ] All three FrostedCard variants use `rounded-3xl` (not `rounded-2xl`)
- [ ] FrostedCard preserves `as` polymorphism (`div` | `button` | `article`), `tabIndex` / `role` / `onKeyDown` props, focus-visible ring (`ring-2 ring-white/50`), `active:scale-[0.98]`, and motion-reduce safety nets (`motion-reduce:transition-none`, `motion-reduce:hover:translate-y-0`)
- [ ] `Button` accepts `variant="gradient"` rendering `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 min-h-[44px]` with `shadow-gradient-button` and `focus-visible:ring-violet-300`
- [ ] Button gradient variant works correctly with `asChild` (verified by ResumeReadingCard CTA wrapping a `<Link>`)
- [ ] `BackgroundCanvas` component exists at `frontend/src/components/ui/BackgroundCanvas.tsx`, wraps children with the radial-over-linear gradient via inline `style`, uses `relative min-h-screen overflow-hidden` plus the consumer-supplied `className`

### BibleLanding migration

- [ ] BibleLanding renders inside `<BackgroundCanvas>`; `<HorizonGlow />` is no longer mounted on this page
- [ ] BibleLanding outer no longer carries `bg-hero-bg`
- [ ] `<HorizonGlow />` import removed from BibleLanding.tsx (component file stays in `components/daily/`; DailyHub continues to use it)
- [ ] `ActivePlanBanner` renders with `variant="accent"`, NO `border-l-4 border-l-primary/60` className override, NO inline shadow override
- [ ] `ResumeReadingCard` renders with `variant="accent"`, NO `border-l-4 border-l-primary/60` className override, NO inline shadow override; primary CTA uses `<Button variant="gradient" size="md" asChild>` wrapping the `<Link>`
- [ ] `VerseOfTheDay`'s two FrostedCard usages (skeleton + loaded states) render with default tier
- [ ] `TodaysPlanCard` renders with default tier
- [ ] `QuickActionsRow`'s 3 tiles render with `variant="subdued"` and preserve their `min-h-[44px]` className override

### Tests

- [ ] `FrostedCard.test.tsx` updated: 7 brittle tests rewritten (per the rename + assertion mapping above), ~9 new tier-specific tests added, 6 behavioral tests preserved
- [ ] `Button.test.tsx` has 6 new gradient-variant tests appended
- [ ] `BackgroundCanvas.test.tsx` created with 3 tests
- [ ] Consumer test files in `components/bible/landing/__tests__/*` verified — any old `border-l-4 border-l-primary/60` className assertions updated to the new accent variant pattern; otherwise unchanged
- [ ] `pnpm tsc --noEmit` passes (typecheck clean)
- [ ] `pnpm test` passes; no new failing files relative to the post-Key-Protection regression baseline

### Manual visual verification (no Playwright infrastructure yet — eyeball review)

On `/bible`:
- [ ] Page background shows the diagonal-fade-with-dark-center treatment (radial darkness centered slightly right of center, faint purple undertone in corners)
- [ ] HorizonGlow's purple orbs are GONE from this page
- [ ] **Active plan branch:** ActivePlanBanner has visible violet-tinted border + glow; ResumeReadingCard below it also has violet-tinted border + glow; VerseOfTheDay below them looks neutral / cleaner
- [ ] **Active reader branch (no plan):** ResumeReadingCard violet, VOTD neutral
- [ ] **First-time / lapsed reader branches:** VOTD shown alone with default tier
- [ ] TodaysPlanCard reads cleaner / quieter than the accent cards above it
- [ ] QuickActionsRow's 3 tiles recede visually compared to the cards above
- [ ] Cards have noticeably more rounded corners than before (`rounded-3xl` vs. previous `rounded-2xl`)
- [ ] ResumeReadingCard's "Continue reading" CTA is a purple gradient pill with deep-purple text, lifts on hover, shows a violet glow ring on focus

On `/daily` (regression check):
- [ ] HorizonGlow still mounts and renders its purple orbs; the page is unchanged from pre-spec state
