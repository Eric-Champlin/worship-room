# DailyHub Holistic Redesign 1A — Foundation + Meditate

**Master Plan Reference:** Recon at `_plans/forums/dailyhub-redesign-recon.md`. Builds directly on `_specs/frostedcard-pilot-bible-landing.md` and `_specs/frostedcard-iteration-1-make-it-pop.md`. This is the first of three specs (1A → 1B → 2) migrating DailyHub to the visual language shipped on BibleLanding.

**Branch discipline:** Stay on `forums-wave-continued`. Do not create new branches, commit, push, stash, or reset. The user manages all git operations manually. If you find yourself on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/daily` (default tab — Devotional)
- `/daily?tab=devotional`
- `/daily?tab=pray`
- `/daily?tab=journal`
- `/daily?tab=meditate` (primary visual target of this spec)
- `/bible` (regression check — multi-bloom BackgroundCanvas affects this page too; pilot card variants must continue to render correctly)

---

## Overview

This spec begins the migration of DailyHub (`/daily`) to the same visual language shipped on BibleLanding by the FrostedCard pilot and its first iteration. It is intentionally the simplest of the three DailyHub specs so the new patterns can be de-risked on the lightest tab (Meditate) before extending to Pray + Journal (Spec 1B) and Devotional (Spec 2).

Three patterns are introduced or extended here, all of which will be reused by the follow-up DailyHub specs:

1. **Multi-bloom BackgroundCanvas.** The pilot's BackgroundCanvas renders a single radial-darkness-over-diagonal-gradient. That treatment works on short pages (BibleLanding) but leaves long-scroll pages (DailyHub) with a dark void below the fold. This spec upgrades BackgroundCanvas to a multi-layer composition with three violet blooms (top-center, mid-right, bottom-left) plus the existing radial darkness and diagonal linear gradient — providing continuous atmospheric warmth across the full scroll height. Both `/bible` (already using BackgroundCanvas) and `/daily` (starts using it in this spec) benefit.
2. **`<Button variant="subtle">`.** A new frosted pill button variant matching the subdued FrostedCard tier — used by Specs 1B and 2 for every refreshed secondary action across all four DailyHub tabs.
3. **DailyHub tab bar visual alignment.** The existing rolls-own segmented control gets a class-string update only — same color treatment will be applied to Journal's Guided/Free Write toggle in Spec 1B. Structural and accessibility patterns (WAI-ARIA roving-tabindex, IntersectionObserver, URL-driven state) are preserved exactly.

In addition to the foundation work, this spec migrates the **Meditate tab** itself: replacing HorizonGlow with the upgraded BackgroundCanvas at the page level, and migrating the 6 meditation cards + suggested-state from rolls-own classes to the FrostedCard variant system (`accent` for the suggested card, `default` for the rest).

The emotional intent: DailyHub's Meditate tab should feel like a calm sanctuary that supports the user across the full scroll, with the suggested meditation drawing the eye without shouting, and the surrounding ambient cards providing a frosted, lifted surface that sits comfortably above a richly atmospheric canvas.

## User Story

As a **logged-out visitor or logged-in user on the Daily Hub**, I want the page background to feel atmospheric and warm across the full scroll, the active tab to read clearly with a violet-tinted pill, and the Meditate tab's cards to lift off the canvas with the suggested practice gently emphasized, so that I can find a calm meditation practice without visual noise pulling me out of the moment.

## Requirements

### Functional Requirements

#### 1. Token addition in `frontend/tailwind.config.js`

Under `theme.extend.boxShadow`, add one new shadow token:

- `subtle-button-hover: 0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)`

No new colors, no other tokens. The existing violet ramp (50–900), canvas tones, and frosted/gradient shadow tokens shipped in the pilot stay unchanged.

#### 2. BackgroundCanvas multi-bloom upgrade

Modify `frontend/src/components/ui/BackgroundCanvas.tsx`. Replace the single-radial-over-linear `style.background` with a five-layer composition:

```
radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%),
radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%),
radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%),
radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
```

Layer breakdown:

- Layer 1: violet bloom near top-center (~8% from top), 0.10 opacity
- Layer 2: violet bloom mid-right (~50% from top, ~80% from left), 0.06 opacity
- Layer 3: violet bloom bottom-left (~88% from top, ~20% from left), 0.08 opacity
- Layer 4: radial darkness behind cards (preserved from pilot/iteration 1)
- Layer 5: diagonal linear gradient base (preserved from pilot/iteration 1)

On short pages (BibleLanding), the user mostly sees Layer 1 prominently and glimpses Layer 2 near page bottom. On long pages (DailyHub), all three blooms come into view as the user scrolls, providing continuous atmospheric warmth. The component's `relative min-h-screen overflow-hidden` shell, `children`, and `className` merging via `cn()` are preserved exactly.

This is NOT a per-page composition — both `/bible` and `/daily` pick up the multi-bloom treatment automatically by virtue of using `<BackgroundCanvas>`.

#### 3. `Button` component — `'subtle'` variant

Modify `frontend/src/components/ui/Button.tsx`. Extend the variant union from:

```
'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient'
```

to:

```
'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'
```

The `subtle` variant joins the special-case branch alongside `'light'` and `'gradient'` — all three are pill-shaped (`rounded-full`), all three override the default `rounded-md` + `h-*` + `px-*` size table.

**Visual treatment (subtle variant):**

- `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm`
- Hover: `hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`
- Layout: `gap-2 font-medium min-h-[44px]`
- Focus ring: shared `focus-visible:ring-primary focus-visible:ring-offset-hero-bg` works as-is — no override needed.

**Size table for subtle variant** (modeled on `'light'` and `'gradient'`):

- `sm`: `px-4 py-2 text-sm`
- `md`: `px-6 py-2.5 text-sm`
- `lg`: `px-8 py-3 text-base`

The existing `asChild` and `isLoading` patterns require no changes. `<Button variant="subtle" asChild>` wrapping a `<Link>` must work end-to-end.

The `cn()` class-object lookup updates:

- The `rounded-md` exclusion line extends to also exclude `'subtle'` (alongside the existing `'light'` and `'gradient'` exclusions).
- A new conditional block adds the subtle visual treatment alongside the existing `'light'` and `'gradient'` branches.
- Three new size class-object literals key on `size === 'sm/md/lg' && variant === 'subtle'`.

#### 4. DailyHub tab bar visual alignment

Modify `frontend/src/pages/DailyHub.tsx`. Three class-string updates only — do NOT change the structural pattern, the WAI-ARIA roving-tabindex implementation, IntersectionObserver behavior, URL query-param-driven state, or any tab state management.

**Outer tablist container**:

- From: `flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1`
- To: `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`

**Active tab button**:

- From: `bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]`
- To: `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`

**Inactive tab button**: NO CHANGE. Already does the right thing (transparent border, `text-white/50`, gentle hover).

#### 5. DailyHub canvas: replace HorizonGlow with BackgroundCanvas

Modify `frontend/src/pages/DailyHub.tsx`. Two structural updates:

- Replace the outer `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">` with `<BackgroundCanvas className="flex flex-col font-sans">`.
- Remove the `<HorizonGlow />` mount entirely from this page.
- Remove the `import { HorizonGlow }` line if it's no longer used in `DailyHub.tsx` (it should not be after this change).
- The classes `min-h-screen`, `overflow-hidden`, `relative`, and `bg-hero-bg` are NOT duplicated on BackgroundCanvas's `className` — BackgroundCanvas owns the screen-fill shell and the background. `flex flex-col font-sans` are kept on the outer className.
- Add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`.

Everything else inside the page (`<SEO />`, `<Navbar transparent />`, hero / "Good Morning" greeting, the tab bar from requirement 4, the active tab content panel, `<DailyAmbientPillFAB />`, `<SongPickSection />`, `<SiteFooter />`) renders unchanged.

**Critical: do NOT delete `frontend/src/components/daily/HorizonGlow.tsx` itself.** The component file stays in place. Only its usage on `DailyHub.tsx` is removed. This preserves the dedicated `HorizonGlow.test.tsx` without orphaning it, and keeps the option open to use HorizonGlow on other surfaces in the future.

#### 6. Meditate tab: FrostedCard variant migration

Modify `frontend/src/components/daily/MeditateTabContent.tsx`. Migrate the 6 meditation cards from rolls-own classes to `FrostedCard` component usage with appropriate variants.

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'`.

**Conditional rendering pattern (all 6 cards):**

```tsx
<FrostedCard
  as="button"
  variant={isSuggested ? 'accent' : 'default'}
  onClick={handleClick}
  className="p-4 sm:p-5 text-left"
>
  ...children (icon + title + description + optional "Suggested" pill)...
</FrostedCard>
```

**Default-state cards** (the rolls-own class string starting `border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06)...]`) become `<FrostedCard as="button" variant="default" onClick={...}>` with the rolls-own classes removed. Specifically:

- Remove the rolls-own className for the default-state branch.
- Remove the base classes `group rounded-2xl p-4 text-left sm:p-5 transition-all motion-reduce:transition-none duration-base ease-decelerate active:scale-[0.98]` — FrostedCard handles transitions, hover, active:scale, and motion-reduce internally.
- Preserve `text-left` on FrostedCard via `className="text-left"` since the component default centers content.
- Preserve the more compact `p-4 sm:p-5` padding via `className="p-4 sm:p-5 text-left"` (overriding FrostedCard's default `p-6`).

**Suggested-state card** (the rolls-own override `border-2 border-primary bg-primary/10 ring-1 ring-primary/30 shadow-[...]`) becomes `<FrostedCard as="button" variant="accent" onClick={...}>` with the rolls-own ring + custom shadow override removed. The accent variant produces the violet-tinted treatment.

**Preserved on all 6 cards (do not regress):**

- Existing `onClick` handler.
- Existing conditional auth-modal trigger logic (auth gating preserved exactly per "Auth Gating" section below).
- Existing `aria-label` if present.
- The inner "Suggested" pill (a separate child element, not part of the card chrome).
- `<button type="button">` semantics (preserved by `as="button"` + the existing `onClick` handler).

The accent variant in this context does NOT use the `eyebrow` prop because the card's content (icon + title + description + "Suggested" pill) already establishes its featured-ness. Adding an eyebrow would duplicate the signal.

**The amber celebration banner (~lines 78-85)**: NO CHANGES. This is intentionally NOT card-shaped — it's a celebratory amber surface with `motion-safe:animate-golden-glow`. Stays rolls-own.

**`VersePromptCard` (~lines 88-95)**: NO CHANGES. Shared component used across multiple tabs and pages. Stays rolls-own.

### Non-Functional Requirements

- **Type safety:** TypeScript strict (project default). `pnpm tsc --noEmit` must pass cleanly.
- **Test pass:** `pnpm test` must pass, including all updated and new tests. No new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files documented in CLAUDE.md).
- **Accessibility (preserved, not improved):**
  - DailyHub's WAI-ARIA roving-tabindex pattern preserved exactly (this spec only touches class strings on the tablist + active tab, not focus management or `aria-*` attributes).
  - DailyHub's IntersectionObserver-driven sticky tab bar behavior preserved.
  - DailyHub's URL-query-param-driven tab state preserved.
  - Meditation cards retain `<button>` semantics, `onClick` handlers, auth-modal triggers, and any `aria-label` props. FrostedCard's `tabIndex` / `role` / `onKeyDown` / focus-visible ring behavior covers what the rolls-own buttons had.
  - Button subtle variant carries `min-h-[44px]` so any future caller satisfies the 44px touch-target floor.
  - Button subtle variant respects `motion-reduce:hover:translate-y-0`.
  - Multi-bloom BackgroundCanvas is purely decorative (inline `style.background` on a single shell `<div>`), no animation, no `aria-hidden` change needed (the BackgroundCanvas root is content-bearing).
- **Performance:** No new runtime dependencies. The new shadow token and the variant additions are build-time only. The multi-bloom background is still a single `<div>` with inline `style` — five gradient layers vs. two does not measurably change paint cost. No impact on Lighthouse Performance.
- **Visual regression scope:**
  - **Pilot routes (intentionally redesigned):** `/daily?tab=meditate` (the primary target), and the page-level shell of `/daily` across all four tabs (multi-bloom canvas + new tab bar visual).
  - **Default-token cascade (intentional, unavoidable side-effect of upgrading BackgroundCanvas):** `/bible` picks up the multi-bloom treatment too. This is desired — both pages benefit. The pilot card variants on `/bible` continue to render correctly.
  - **Untouched DailyHub tab content:** Devotional, Pray, and Journal tab content cards must look identical to pre-spec. Those tabs are migrated in Specs 1B and 2.
  - **Manual verification list before commit:** `/daily?tab=meditate` (full scroll, 6/6 complete state for amber banner regression, suggested + non-suggested branches), `/daily?tab=devotional` / `?tab=pray` / `?tab=journal` (canvas + tab bar regression only), `/bible` (canvas regression — pilot variants still correct).

## Auth Gating

This is a visual-system spec; it changes class strings, component composition, and the page background, but does not gain or lose any auth-gated actions. Existing auth gating on the affected components is preserved unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Click a Meditate card (Default tier) | Existing behavior preserved — auth modal triggers per `02-security.md` § "Auth Gating Strategy" (Meditate card clicks in MeditateTabContent gate to login) | Navigates to the meditation sub-page | Existing message preserved (e.g., "Sign in to start meditation") — not changed by this spec |
| Click the Suggested Meditate card (Accent tier) | Same auth-modal behavior as the other 5 cards (gating logic is the same — only the visual variant differs) | Navigates to the meditation sub-page | Existing message preserved |
| Click a tab in the DailyHub tab bar | Updates `?tab=` query param and renders the corresponding tab — no auth gate | Same | N/A — tab switching is public |
| Click VersePromptCard, amber celebration banner, "Good Morning" hero, Navbar, AmbientPillFAB, SongPickSection, SiteFooter | All preserved unchanged | All preserved unchanged | N/A — not modified by this spec |

`02-security.md` § "Auth Gating Strategy" remains canonical for which actions on `/daily` require login. The meditation auth-modal trigger logic is preserved exactly; only the visual chrome around the click target changes.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | DailyHub's existing single-column tab content layout preserved. Meditate's 6 cards render in their existing arrangement (single column or 2-column grid, depending on the existing implementation — this spec does NOT change card grid layout). FrostedCard accent/default tiers use `backdrop-blur-md` (8px) on mobile per the pilot. Multi-bloom BackgroundCanvas radial layers stay at their specified ellipse sizes — visually still creates atmospheric warmth on phones. Tab bar uses `backdrop-blur-md` on the outer tablist; pill shape (`rounded-full`) and 44px touch targets work identically. Button subtle variant size `md` keeps `min-h-[44px]`. |
| Tablet (640–1024px) | Same tier visual definitions. The `md:` breakpoint kicks in on FrostedCard variants per the pilot (`backdrop-blur-[12px]` for accent, `backdrop-blur-md` for default, `~6px` for subdued). Tab bar visual stable. |
| Desktop (≥ 1024px) | Same tier behavior as tablet. Multi-bloom canvas renders all five layers at full intent — top-center bloom visible above the fold, mid-right bloom visible mid-page, bottom-left bloom visible at the bottom of the long-scroll page. |

**Responsive notes:**

- This spec changes NO existing layouts, grids, or breakpoint behavior on DailyHub or its meditation cards. The only structural change is the outer wrapper swap from `<div>` to `<BackgroundCanvas>`, which preserves `flex flex-col` and `min-h-screen` semantics.
- Multi-bloom BackgroundCanvas's `min-h-screen` ensures coverage on every device.
- Hover states (translate, shadow change, color shift) only fire at hover-capable breakpoints; mobile taps trigger `active:scale-[0.98]` (FrostedCard) instead. Button subtle variant follows the same pattern.

## AI Safety Considerations

N/A — This feature is purely visual (a new shadow token, an upgraded BackgroundCanvas layer composition, a new Button variant, class-string updates on the tab bar, and a FrostedCard variant migration on existing meditation cards). No AI-generated content, no free-text user input, no crisis-detection surface area. No change to existing AI safety guardrails on any consumer component (the meditation cards' click-through pages and auth-modal copy are untouched).

## Auth & Persistence

- **Logged-out users:** No persistence; visual changes only. No new localStorage reads or writes. Existing auth-modal-trigger logic on Meditate cards preserved exactly.
- **Logged-in users:** No persistence; visual changes only. No new database tables or columns.
- **localStorage usage:** None. This spec introduces zero new localStorage keys. Existing keys read on `/daily` (e.g., `wr_daily_completion`, `wr_journal_draft`, `wr_prayer_draft`) are untouched.
- **Route type:** Public (`/daily` is public; nothing in this spec changes that).

## Completion & Navigation

N/A — visual surface changes only. No completion signals added or modified. The `wr_daily_completion` reads/writes that drive the Meditate tab's "X / 6" state and amber celebration banner are untouched. Existing in-component navigation (meditation card click → `/meditate/*` sub-page or auth modal) preserved exactly. No tab navigation, no cross-tab context passing changed.

## Design Notes

**Tokens (new — defined in this spec):**

- `subtle-button-hover` shadow token (under `theme.extend.boxShadow` in `tailwind.config.js`)

**Tokens (existing — reused without modification):**

- Violet ramp `violet-50` … `violet-900` (shipped in pilot)
- Canvas tones `canvas-shoulder`, `canvas-deep` (shipped in pilot)
- Frosted shadow tokens `frosted-base`, `frosted-hover`, `frosted-accent`, `frosted-accent-hover` (shipped in pilot)
- Gradient shadow tokens `gradient-button`, `gradient-button-hover` (shipped in pilot)

**Existing components reused (do not reinvent):**

- `cn()` utility from `@/lib/utils` — Button variant logic, BackgroundCanvas, and any new test setup merge classes via `cn()`.
- `Button` component (`frontend/src/components/ui/Button.tsx`) — extended with subtle variant, NOT replaced or duplicated.
- `BackgroundCanvas` component (`frontend/src/components/ui/BackgroundCanvas.tsx`) — internal `style.background` upgraded; props API and shell semantics unchanged.
- `FrostedCard` component (`frontend/src/components/homepage/FrostedCard.tsx`) — used as-is via the `variant` prop shipped in the pilot. NOT modified by this spec.
- `HorizonGlow` (`frontend/src/components/daily/HorizonGlow.tsx`) — file stays in place; only its import + mount in `DailyHub.tsx` is removed.
- `Navbar`, `SEO`, `SiteFooter`, `DailyAmbientPillFAB`, `SongPickSection`, `VersePromptCard`, `DevotionalPreviewPanel`, `RelatedPlanCallout`, `EchoCard` — all preserved unchanged on DailyHub and on the Meditate tab.

**New visual patterns introduced (flag as `[NEW PATTERN]` for /plan to mark `[UNVERIFIED]`):**

- Multi-bloom BackgroundCanvas — five-layer composition (3 violet blooms + radial darkness + diagonal linear gradient). The component itself shipped in the pilot, but the multi-bloom composition is new and changes the look-and-feel on both `/bible` and `/daily`.
- Button `subtle` variant — frosted pill with `bg-white/[0.07]`, `border-white/[0.12]`, white text, `backdrop-blur-sm`. Distinct from `light` (white pill, deep-purple text) and `gradient` (purple gradient pill, deep-purple text).
- DailyHub tab bar visual treatment — `bg-white/[0.07]` outer tablist + `backdrop-blur-md` + `bg-violet-500/[0.13]` active pill with `border-violet-400/45` and violet glow shadow. The same color treatment is intended for Journal's Guided/Free Write toggle in Spec 1B.

**Reference points (not requirements — context for /plan):**

- `09-design-system.md` § "Round 3 Visual Patterns" and the existing FrostedCard / BackgroundCanvas / Button gradient documentation from the pilot.
- `_specs/frostedcard-pilot-bible-landing.md` — defines the FrostedCard variant API, the `BackgroundCanvas` component shell, and the `Button` gradient variant. Read first.
- `_specs/frostedcard-iteration-1-make-it-pop.md` — the iteration that ships immediately before this spec; carries the canonical surface opacities and the editorial polish patterns the DailyHub redesign builds on.
- `_plans/forums/dailyhub-redesign-recon.md` — the recon doc (untracked but staged) that scoped DailyHub's three-spec redesign sequence. /plan should read it during recon.
- Aesthetic target: same FPU/Lovable visual energy as BibleLanding post-iteration-1 — frosted cards lifted off a richly atmospheric canvas, suggested cards tinted violet without shouting.

**Pre-existing inconsistencies acknowledged but NOT fixed in this spec (deferred):**

- Token system cleanups — focus-ring offset color drift (`focus-visible:ring-offset-dashboard-dark` vs. the actual `bg-hero-bg` / now BackgroundCanvas), deprecated `Card.tsx`, unused `liquid-glass` utility, `+N more` pill drift on `TodaysPlanCard` (BibleLanding-side, not DailyHub).
- AuthModal redesign.

## Out of Scope

- **Pray tab migration** — Spec 1B.
- **Journal tab migration** — Spec 1B (and Spec 1B will introduce the Journal Guided/Free Write toggle using the same color treatment defined here for the DailyHub tab bar).
- **Devotional tab migration** — Spec 2.
- **Violet-glow textarea pattern** — introduced in Spec 1B (when textarea-bearing tabs migrate).
- **All shared components stay rolls-own:** `DevotionalPreviewPanel`, `VersePromptCard`, `RelatedPlanCallout`, `EchoCard` — none of these are touched in this spec.
- **`FrostedCard` component** — already shipped in the pilot; NO changes in this spec.
- **The "Good Morning" greeting / hero section on DailyHub** — unchanged.
- **The Navbar, `DailyAmbientPillFAB`, `SongPickSection`, `SiteFooter`** — all unchanged.
- **The amber celebration banner on Meditate** — intentionally NOT card-shaped; stays rolls-own.
- **`HorizonGlow.tsx` component file** — stays in place at `components/daily/HorizonGlow.tsx`. Only its mount + import on `DailyHub.tsx` is removed.
- **Other surfaces:** Homepage, Dashboard, PrayerWall, Settings, Insights, Music, MyBible, BibleReader, BiblePlan*, AskPage, RegisterPage — all post-DailyHub rollout phases.
- **AuthModal redesign** — separate spec.
- **Token system cleanups** — focus-ring offset color drift, deprecated `Card.tsx`, unused `liquid-glass` utility, `+N more` pill drift.
- **Playwright visual regression baseline** — no infrastructure exists yet; manual eyeball review on the affected routes is the verification path.
- **New localStorage keys, backend changes, API shapes, content changes:** None. This is a pure visual-system spec.
- **Crisis detection or AI safety guardrails** — none added or modified.

## Testing

### `frontend/tailwind.config.js`

No tests — config file. Verified indirectly by the Button subtle-variant tests asserting the `shadow-subtle-button-hover` token name.

### `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` (existing, possibly update)

The existing tests (renders children, applies className, has `min-h-screen`) should continue to pass unchanged after the multi-bloom upgrade, because the component's children/className/shell-class behavior is preserved. If any test asserts the EXACT background string (e.g., the single-radial-over-linear from the pilot/iteration), update it to match the new multi-bloom string OR convert it to a substring assertion that only checks for `radial-gradient(` and `linear-gradient(` presence.

### `frontend/src/components/ui/__tests__/Button.test.tsx` (existing, append)

Add ~6 new subtle-variant tests:

- `'subtle variant renders with bg-white/[0.07]'`
- `'subtle variant renders with border-white/[0.12]'`
- `'subtle variant uses rounded-full'`
- `'subtle variant uses min-h-[44px]'`
- `'subtle variant has backdrop-blur-sm'`
- `'subtle variant + asChild forwards classes to child'`

(The pilot's Button.test.tsx already has analogous gradient-variant tests; the new tests follow the same pattern. If the file doesn't exist for some reason, create it with the standard Button test scaffolding plus these 6 tests.)

### `frontend/src/pages/__tests__/DailyHub.test.tsx` (existing, update)

Update class-string assertions to reflect the new tab bar visual:

- Tablist class assertions (around line 324–325): change `'bg-white/[0.06]'` to `'bg-white/[0.07]'`. Keep `'rounded-full'` assertion.
- Active tab class assertion (around line 331): change `'bg-white/[0.12]'` to `'bg-violet-500/[0.13]'`.
- Inactive tab class assertion (around line 339): no change (`'text-white/50'` still applies).
- Tab bar wrapper assertions (around line 348–349): no change (`backdrop-blur-md` still applies on the OUTER wrapper; we just added it to the inner container too — both should still pass).

Update outer-wrapper class assertions to reflect the BackgroundCanvas swap:

- Around lines 302–308: tests currently assert `root.className` contains `'relative'`, `'overflow-hidden'`, `'bg-hero-bg'`. After the change, root is the `BackgroundCanvas` div, which has `'relative'` and `'overflow-hidden'` but does NOT have `'bg-hero-bg'`. Update assertions to:
  - REMOVE the `'bg-hero-bg'` substring check.
  - KEEP the `'relative'` and `'overflow-hidden'` substring checks.
  - OPTIONALLY ADD an assertion that the inline `style.background` contains `'radial-gradient'` (verifies BackgroundCanvas is mounted).
- Around lines 310–319: tests currently assert that the first `:scope > [aria-hidden="true"].pointer-events-none` decorative layer has exactly 5 children (HorizonGlow's structure). After the change, HorizonGlow is no longer mounted on DailyHub. Update this test to:
  - REMOVE the children-count assertion (the HorizonGlow-specific test). The HorizonGlow component itself still has its own test file at `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx` which continues to verify the component's rendering — that test keeps the 5-children assertion in scope where it belongs.

All behavioral DailyHub tests (tab switching, URL query-param state, IntersectionObserver-driven sticky tab bar, roving-tabindex keyboard nav, etc.) MUST continue to pass unchanged.

### `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx` (existing, verify-and-update)

Per recon, there are no FrostedCard / `bg-white/[0.06]` / `backdrop-blur` class-string assertions in this test file. Verify by reading the file during execution.

- If any test asserts the rolls-own class string for default cards (e.g., `'border border-white/[0.12]'` or `'bg-white/[0.06]'` directly on a meditation card button), update to assert the FrostedCard default variant classes (`'bg-white/[0.07]'`, `'border-white/[0.08]'` per the iteration-1 default-tier surface).
- If any test asserts the rolls-own suggested-state classes (`'border-2 border-primary'`, `'bg-primary/10'`, `'ring-1 ring-primary/30'`), update to assert the FrostedCard accent variant classes (`'bg-violet-500/[0.08]'`, `'border-violet-400/45'` per the iteration-1 accent-tier surface).
- All behavioral tests (renders 6 cards, click triggers navigation, suggested state renders "Suggested" pill, auth modal triggers when unauthed) MUST continue to pass unchanged.

### `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx` (existing, untouched)

Stays in place. Continues to verify HorizonGlow's rendering (5-children decorative layer assertion in scope here, where it belongs). Must continue to pass unchanged. This test file now exercises the component in isolation rather than via DailyHub; that's fine — the component file at `components/daily/HorizonGlow.tsx` is preserved.

## Acceptance Criteria

### Token + component API surface

- [ ] `tailwind.config.js` extended under `theme.extend.boxShadow` with the `subtle-button-hover` shadow token (`0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)`)
- [ ] `BackgroundCanvas` `style.background` upgraded to a five-layer composition: 3 violet blooms (top-center 0.10, mid-right 0.06, bottom-left 0.08) + existing radial darkness + existing diagonal linear gradient
- [ ] BackgroundCanvas `children`, `className`-via-`cn()` merge, and `relative min-h-screen overflow-hidden` shell preserved exactly
- [ ] `Button` accepts `variant="subtle"` rendering `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm min-h-[44px]` with hover `bg-white/[0.12] border-white/[0.20] shadow-subtle-button-hover -translate-y-0.5` and `motion-reduce:hover:translate-y-0`
- [ ] Button subtle variant has 3 sizes (`sm`/`md`/`lg`) matching the pattern of `light` and `gradient` variants
- [ ] Button subtle variant works correctly with `asChild` (verified by test)

### DailyHub tab bar + canvas migration

- [ ] DailyHub tab bar outer tablist uses `bg-white/[0.07] border-white/[0.08] backdrop-blur-md` (in addition to the existing `flex w-full rounded-full p-1`)
- [ ] DailyHub active tab pill uses `bg-violet-500/[0.13] border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`
- [ ] DailyHub inactive tabs unchanged (transparent border, `text-white/50`, gentle hover)
- [ ] DailyHub WAI-ARIA roving-tabindex pattern preserved exactly (no changes to `role`, `aria-selected`, `tabIndex`, focus management, or keyboard handlers)
- [ ] DailyHub tab state via URL query param preserved exactly (no changes to read/write of `?tab=`)
- [ ] DailyHub IntersectionObserver-driven sticky tab bar behavior preserved exactly
- [ ] DailyHub renders inside `<BackgroundCanvas className="flex flex-col font-sans">` instead of the old `<div className="...bg-hero-bg...">`
- [ ] `<HorizonGlow />` no longer mounted on DailyHub
- [ ] `import { HorizonGlow }` removed from `DailyHub.tsx` if no longer referenced
- [ ] HorizonGlow component file at `components/daily/HorizonGlow.tsx` REMAINS in place (NOT deleted)
- [ ] `HorizonGlow.test.tsx` REMAINS in place and continues to pass

### Meditate tab migration

- [ ] All 6 meditation cards in `MeditateTabContent.tsx` use `<FrostedCard as="button" variant={isSuggested ? 'accent' : 'default'} onClick={handleClick} className="p-4 sm:p-5 text-left">`
- [ ] Rolls-own classes removed from default-state cards (`group rounded-2xl p-4 text-left sm:p-5 transition-all motion-reduce:transition-none duration-base ease-decelerate active:scale-[0.98] border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[…]`)
- [ ] Rolls-own classes removed from suggested-state cards (`border-2 border-primary bg-primary/10 ring-1 ring-primary/30 shadow-[…]`)
- [ ] Meditation cards preserve their existing `onClick` handlers, conditional auth-modal triggers, "Suggested" pill rendering, content layout (icon + title + description), and any `aria-label` props
- [ ] Amber celebration banner on Meditate UNCHANGED (stays rolls-own with `motion-safe:animate-golden-glow`)
- [ ] `VersePromptCard` usage on Meditate UNCHANGED (stays rolls-own)

### Tests

- [ ] `BackgroundCanvas.test.tsx` continues to pass (children, className, `min-h-screen` assertions still hold; any exact-background-string assertion updated for the new multi-bloom value or converted to a substring check)
- [ ] `Button.test.tsx` has 6 new subtle-variant tests appended and passing
- [ ] `DailyHub.test.tsx` updated for new tab bar classes, BackgroundCanvas root, and removed HorizonGlow children-count assertion; behavioral tests (tab switching, URL state, IntersectionObserver, keyboard nav) preserved and passing
- [ ] `MeditateTabContent.test.tsx` updated for FrostedCard variant classes (`bg-white/[0.07]` / `border-white/[0.08]` for default tier; `bg-violet-500/[0.08]` / `border-violet-400/45` for accent tier) where applicable; behavioral tests (renders 6 cards, click navigation, suggested state, auth modal) preserved and passing
- [ ] `HorizonGlow.test.tsx` UNCHANGED and passing
- [ ] `pnpm tsc --noEmit` passes (typecheck clean)
- [ ] `pnpm test` passes; no new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files)

### Manual visual verification (no Playwright infrastructure yet — eyeball review)

On `/daily?tab=meditate`:

- [ ] Page background shows multi-bloom atmosphere across full scroll height (top-center bloom visible above the fold; mid-right bloom visible mid-page; bottom-left bloom visible at the bottom of the long-scroll page)
- [ ] HorizonGlow's positioned glow orbs are GONE from this page
- [ ] Tab bar active state has a violet-tinted pill with violet glow (not the previous near-white pill)
- [ ] All 6 meditation cards have visible frosted treatment in their default state (cards lift off the canvas instead of sinking into it)
- [ ] When a meditation is suggested (challenge-context or verse-bridge highlight), the suggested card has a visible violet-tinted border + violet glow + lifted appearance — distinct from but not shouting over the surrounding default cards
- [ ] Amber celebration banner still amber/golden when 6/6 complete (regression check)
- [ ] VersePromptCard renders unchanged on this tab (regression check)

On `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`:

- [ ] Page background shows the same multi-bloom atmosphere on all four tabs
- [ ] Tab bar active pill changes color when switching tabs (violet pill follows the active tab)
- [ ] Devotional, Pray, and Journal tab content cards are UNCHANGED visually (those tabs are migrated in Specs 1B and 2; their content cards must look identical to pre-spec)

On `/bible` (regression check):

- [ ] Page renders correctly with multi-bloom atmosphere — at minimum the top-center bloom is visible above the fold; other blooms visible on scroll
- [ ] VOTD card, ResumeReadingCard, ActivePlanBanner, TodaysPlanCard, QuickActionsRow render unchanged from their post-iteration-1 state
- [ ] No layout regressions
