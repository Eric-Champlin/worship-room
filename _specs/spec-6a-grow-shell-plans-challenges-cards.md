# Spec 6A: Grow Shell + Plans Tab + Challenge Cards

**Master Plan Reference:** Direction document at `_plans/direction/grow-2026-05-04.md` is the locked decision set (15 numbered decisions). Recon at `_plans/recon/grow-2026-05-04.md` is the verified pre-state inventory across the full Grow cluster (`/grow`, `/reading-plans/:planId`, `/challenges/:challengeId`, CreatePlanFlow, 4 overlay/celebration components — total ~7,000 LOC, 31 production files, 23 test files). This spec is the first of three Grow sub-specs. Spec 6B covers detail pages + day content. Spec 6C covers CreatePlanFlow + completion overlays. Each is independently shippable; failures in one do not block the others. The split mirrors Dashboard 4A/4B/4C, where ~7,000 LOC + ~40 test updates was too much to review in one PR.

This spec follows the Round 3 visual rollout pattern established by Spec 4A (Dashboard foundation — BackgroundCanvas + FrostedCard primitive + subtle Button variant + global ghost link migration), Spec 4B (Dashboard data widgets — Tonal Icon Pattern across 11 widgets), Spec 4C (Dashboard social/recap/tiles — pattern application across 8 more widgets + ceremony heading typography), and Spec 5 (Local Support — full surface migration). Patterns this spec USES are all already shipped: FrostedCard `default` and `subdued` variants, multi-bloom `BackgroundCanvas`, Button `subtle` variant, the violet Tabs primitive, `ATMOSPHERIC_HERO_BG` (preserved on hero), `GRADIENT_TEXT_STYLE` (preserved on hero h1), and the Tonal Icon Pattern from Dashboard 4B. Patterns this spec MODIFIES: none. Patterns this spec INTRODUCES: none.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. If the working tree is on a different branch than expected, STOP and ask. The untracked `_plans/direction/grow-2026-05-04.md` direction doc is intentional context for this spec and should remain untracked until the user commits at their discretion.

---

## Affected Frontend Routes

- `/grow` — primary surface; receives every shell-level change (BackgroundCanvas wrap, hero subtitle migration, sticky tab bar background tint, tab icon tonal colors) plus the Plans tab and Challenges tab listing-card migrations rendered inside the tabpanels
- `/grow?tab=plans` — Plans tab variant; PlanCard grid + Create-Your-Own-Plan card render new chrome
- `/grow?tab=challenges` — Challenges tab variant; UpcomingChallengeCard / NextChallengeCountdown / ActiveChallengeCard / PastChallengeCard / HallOfFame items render new chrome
- `/reading-plans` — legacy redirect to `/grow?tab=plans`; verify redirect still fires post-migration
- `/challenges` — legacy redirect to `/grow?tab=challenges`; verify redirect still fires post-migration
- `/reading-plans/:planId` — regression surface; PlanCard chrome change ripples into the page header thumbnail if a `<PlanCard>` is rendered there (Spec 6B will fully migrate the detail page; this spec only validates that the partial ripple does not break)
- `/challenges/:challengeId` — regression surface; ActiveChallengeCard chrome change ripples into the detail page if a `<ActiveChallengeCard>` is rendered there (same Spec 6B caveat)
- `/` — regression surface (Dashboard — verify no drift after BackgroundCanvas / FrostedCard token usage)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surface (DailyHub Tabs primitive source — verify nothing drifts)
- `/bible` — regression surface (BibleLanding — same atmospheric system)
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — regression surface (Spec 5 just shipped — verify Round 3 migration still reads correctly with new neighbor)

---

## Overview

Grow is the surface where users invest in themselves over time — choosing a reading plan, joining a seasonal challenge, completing milestones day after day. The current visual treatment predates the Round 3 system: `/grow` ships without `BackgroundCanvas` so atmospheric continuity breaks the moment a user navigates from Dashboard or BibleLanding; the hero subtitle uses the deprecated `font-serif italic text-white/60` body-italic pattern that Round 3 retired; the sticky tab bar uses `backdrop-blur-md` over a transparent background so once a user scrolls past the hero the bar reads as floating disconnected over the content; and every card primitive on both tabs (PlanCard, UpcomingChallengeCard, NextChallengeCountdown, ActiveChallengeCard, PastChallengeCard, HallOfFame items, Create-Your-Own-Plan card) rolls its own `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[...]` chrome instead of consuming the FrostedCard primitive. The deprecated-pattern density across the full Grow cluster is the highest of any surface migrated so far.

This spec lands the atmospheric foundation, hero alignment, and listing-surface card chrome migrations for `/grow` only. Detail pages (`/reading-plans/:planId`, `/challenges/:challengeId`, DayContent, ChallengeDayContent, DaySelector, ChallengeDaySelector, PlanNotFound, ChallengeNotFound) are deferred to Spec 6B. CreatePlanFlow plus all four celebration overlays (PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration) are deferred to Spec 6C. The split is justified at the direction-doc level (Decision 1): each sub-spec covers 1–2 pattern types, not 5; reviewing ~700 LOC + ~10 files is feasible in a single PR; reviewing the full ~7,000 LOC Grow cluster is not.

The core constraint is restraint mixed with brand fidelity. Grow has two emotional registers — the calm browsing state ("which plan should I pick?") AND the engagement state ("I'm three days into this challenge"). The browsing surfaces (Plans tab, Challenges tab listing cards) get the standard FrostedCard default variant; the engagement surface (ActiveChallengeCard, the only card that surfaces an active progress bar and Continue/Resume CTA) gets FrostedCard default with a `border-2 border-primary/30` emphasis override to mark it as the highest-priority card on the page. The seasonal **theme-color CTAs** that mark each challenge's brand (Resume / Continue / Join Challenge buttons in ActiveChallengeCard, plus the progress bar fill) are preserved AS-IS as inline-styled rolls-own — `style={{ backgroundColor: themeColor }}` with `getContrastSafeColor()` for accessibility — because the seasonal-palette brand expression IS the load-bearing visual contract on Challenges. Migrating those buttons to the `<Button>` primitive would erase the seasonal identity that distinguishes Lent (purple) from Easter (gold) from Pentecost (red) from Advent (deep blue). Per Decision 8 of the direction doc, this is locked. Only the surrounding card chrome migrates; the buttons themselves stay rolls-own.

A second secondary deliverable: the `bg-primary` solid button on the ConfirmDialog "Pause & Start New" affordance migrates to `<Button variant="subtle">`. Per Decision 9, ConfirmDialog is utility navigation (the user is switching one plan for another), not an emotional climax. The gradient-showstopper Button variant is reserved for genuine emotional peaks like CreatePlanFlow's "Generate" button (Spec 6C); subtle is correct here. The "Keep Current" cancel button stays as the existing outlined affordance — it is the safer/quieter action and deserves the quieter chrome.

A third tertiary cleanup: dead `FilterBar.tsx` (78 LOC, 0 imports per recon Decision 12) is deleted. Pre-execution verification with `grep -r "FilterBar" frontend/src/` confirms zero imports before the file is removed. If any imports do exist (recon was wrong), CC stops and asks.

This spec is visual + class-string + test + cleanup. No data fetching changes, no hook changes (`useReadingPlanProgress`, `useChallengeProgress` are out of scope), no service changes, no new localStorage keys, no API/backend changes. Behavioral preservation is non-negotiable: every existing test that asserts on behavior (click handlers, navigation logic, conditional rendering branches, the IntersectionObserver sentinel for the sticky tab bar shadow, both tab panels mounted simultaneously via `hidden` toggle, ARIA tablist semantics, theme-color computation, progress percentage calculation, pulse-dot animation) must continue to pass without modification. Tests that asserted on specific class names changed by this spec are updated to the new tokens — `PlanCard.test.tsx` alone has 13 explicit class-string assertions, plus updates needed for `UpcomingChallengeCard.test.tsx`, `NextChallengeCountdown.test.tsx`, `HallOfFame.test.tsx`, and the `GrowPage.test.tsx` / `ReadingPlans.test.tsx` / `Challenges.test.tsx` shell tests.

After this spec ships, the Grow shell + Plans tab + Challenges-tab listing surfaces match the Round 3 system. The detail pages (Spec 6B) and CreatePlanFlow + celebration overlays (Spec 6C) remain. After all three Grow sub-specs ship, the Round 3 visual migration covers Homepage → DailyHub → BibleLanding/plans → Dashboard → Local Support → Grow — the full top-level user-facing surface.

## User Story

As a **logged-out visitor or logged-in user navigating from Dashboard or DailyHub to Grow**, I want the page to feel like the same calm room I just left — atmospheric blooms gently visible behind the tab bar and tab content, the sticky tab bar anchored with a subtle dark tint instead of floating disconnected over the content, the hero subtitle reading as plain prose rather than the deprecated body-italic, and every plan card and challenge card wearing the same FrostedCard chrome as the rest of the app — so that the visual register doesn't break the emotional thread when I'm exploring what to read or which seasonal challenge to join. When I look at the Plans tab the BookOpen tab icon should read as sky-blue (the study/scripture family color I already saw on Dashboard's TodaysDevotional widget); when I look at the Challenges tab the Flame tab icon should read as warm amber (the effort family color I already saw on Dashboard's StreakCard and ChallengeWidget). When my eye lands on the Active challenge card I want it to clearly read as the most important card on the page — the `border-2 border-primary/30` emphasis ring tells me this is where I'm engaged right now — and I want my Continue button on that card to keep its full seasonal-palette color (deep purple during Lent, gold during Easter, red during Pentecost, deep blue during Advent) because that color is part of how I know which season I'm in. When I finish a plan and want to switch to a new one, the "Pause & Start New" button in the confirmation dialog should feel like quiet utility navigation (it's a switch, not a celebration), not the same showstopper styling as a peak emotional moment. And when I scroll past the hero, the sticky tab bar should anchor visually with its new `bg-hero-bg/70` tint and its subtle shadow appears just like before — the IntersectionObserver sentinel still does its job, the tab bar is still always reachable, the pulse dot on the Challenges tab still pulses in the active-challenge brand color.

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. Verify the working branch (`forums-wave-continued`) contains Spec 4A + Spec 4B + Spec 4C + Spec 5 all merged. Specifically:
   - `BackgroundCanvas` wraps `<main>` on the Dashboard route (`/`) and on BibleLanding and on all three Local Support routes.
   - `FrostedCard` exposes `default`, `subdued`, and `accent` variants in `frontend/src/components/homepage/FrostedCard.tsx` (or wherever the canonical export lives — verify path).
   - The `subtle` Button variant exists in the shared Button component.
   - The Tabs primitive at `frontend/src/components/ui/Tabs.tsx` (or wherever the canonical export lives) is the same primitive in use on DailyHub. Per the brief, `/grow` is already on the Tabs primitive — no migration needed in this spec, only icon-tonal-color updates on the existing `items` array.
   - The Tonal Icon Pattern is documented in the Dashboard direction doc (`_plans/direction/dashboard-2026-05-04.md` Decision 11) and the Grow direction doc (`_plans/direction/grow-2026-05-04.md` Decision 11) extends the table to Grow's iconography.
2. Verify the direction doc at `_plans/direction/grow-2026-05-04.md` is present and the locked decisions referenced throughout this spec match — particularly Decision 2 (BackgroundCanvas added to all Grow surfaces), Decision 3 (hero subtitle italic → plain prose), Decision 5 (sticky tab bar background tint), Decision 7 (rolls-own FrostedCard chrome → FrostedCard primitive table), Decision 8 (theme-color CTAs preserved), Decision 9 (`bg-primary` solid → subtle for ConfirmDialog), Decision 11 (Tonal Icon Pattern — this spec's subset: Plans tab BookOpen sky-300, Challenges tab Flame amber-300, Create-Your-Own-Plan Sparkles violet-300, HallOfFame Trophy amber-300, pulse dot preserved as theme-color brand), Decision 12 (delete dead `FilterBar.tsx`), Decision 14 (PastChallengeCard `role="button"` preserved as out-of-scope deviation).
3. Verify the recon at `_plans/recon/grow-2026-05-04.md` is present.
4. **Capture a test baseline before any change.** Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. The current baseline per CLAUDE.md is **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`), with an occasional flake of `useNotifications — returns notifications sorted newest first` bringing the baseline to **9,469 pass / 2 fail across 2 files**. The brief mentions a prior baseline of `9437/2` from Spec 5 verification — reconcile this against the live baseline at execution start; the live number is authoritative. Any NEW failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. Read each of the 8 implementation files in scope plus the 7 test files to confirm current import sets (lucide-react icons, `BackgroundCanvas`, `FrostedCard`, `Button`, `Tabs` locations), current chrome tokens, current conditional rendering branches, current ARIA wiring on the tab bar (`role="tablist"` / `role="tab"` / `role="tabpanel"` / `aria-selected` / `aria-controls` / roving tabindex / Home/End/ArrowLeft/Right keyboard navigation if Tabs primitive supports it), current IntersectionObserver sentinel wiring for the sticky tab bar shadow, the theme-color computation in ActiveChallengeCard, and the progress bar `role="progressbar"` markup.
6. **Verify FrostedCard's prop API for the PlanCard `<Link>` migration (Change 5).** PlanCard currently wraps in `<Link to={...}>` for navigation. Two paths exist: Path A — FrostedCard supports `as={Link}` polymorphism, in which case PlanCard becomes `<FrostedCard as={Link} to={...} variant="default">`; Path B — FrostedCard does not support polymorphism, in which case PlanCard wraps the FrostedCard inside a `<Link>` with the focus-visible ring moved to the Link wrapper. Read FrostedCard's prop API first. Path A is preferred (cleaner, single rounded-3xl shell); Path B is the fallback. Document the chosen path in the execution log.
7. **Verify FrostedCard's prop API for the UpcomingChallengeCard `as="article"` migration (Change 6).** UpcomingChallengeCard currently uses `<article>` as its root. If FrostedCard supports `as` polymorphism (verified in step 6 above), use `<FrostedCard as="article" variant="default">`. If it does not support polymorphism, wrap a default `<FrostedCard>` inside `<article>` with semantic structure preserved.
8. **Verify the `bg-hero-bg` Tailwind token (Change 3).** The brief specifies `bg-hero-bg/70` for the sticky tab bar background tint, where `bg-hero-bg` resolves to canonical `#08051A`. Read `frontend/tailwind.config.js` (or `tailwind.config.ts`) to confirm the token exists. If `bg-hero-bg` is not in the config, fall back to `bg-[#08051A]/70` as a literal arbitrary value, or use `bg-dashboard-dark/70` if that token covers the same hex. Document the chosen token in the execution log so Spec 6B and 6C can match.
9. **Verify FilterBar.tsx is dead code (Change 13).** Run `grep -r "FilterBar" frontend/src/` from the repo root before deletion. Recon Decision 12 confirms zero imports; this re-verification at execution time is the safety check. If any import exists, STOP and ask the user — do not delete. If zero imports confirmed, delete the file in the same change set as the migrations.
10. **Verify FrostedCard's default border tokens (Change 8).** ActiveChallengeCard's `border-2 border-primary/30` emphasis is intentional brand on the most-important-card-on-the-page. Two implementation paths: Path A — apply the emphasis as a className override on the FrostedCard wrapper itself (`<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">`); Path B — wrap the FrostedCard in a `<div className="rounded-3xl border-2 border-primary/30">` so the emphasis ring sits outside the FrostedCard chrome and the FrostedCard's default border lives inside. Path A is cleaner if FrostedCard's default border (`border border-white/[0.12]`) and the emphasis override (`border-2 border-primary/30`) compose correctly without visual conflict. Path B is the fallback if Path A double-borders or otherwise reads incorrectly. Test both visually during execution and document the chosen path.
11. **Verify the IntersectionObserver sentinel still fires correctly after the sticky tab bar background tint is added.** The current sentinel is positioned just above the sticky tab bar (`<div ref={sentinelRef} aria-hidden="true" />`); when the sentinel scrolls out of view, `isSticky` flips to `true` and `shadow-md shadow-black/20` is added to the tab bar wrapper. Adding `bg-hero-bg/70` to the wrapper's base classes does not affect the sentinel logic — the wrapper is still the same element, the sentinel is still the same element, the IO observer is still the same observer. Verify visually after the change that the shadow still appears once the user scrolls past the hero.

#### Tonal Icon Pattern — application convention (continuation from Spec 5)

The pattern lives in `_plans/direction/dashboard-2026-05-04.md` Decision 11 and was debuted in Spec 4B. Local Support's direction doc Decision 7 extended the table; Grow's direction doc Decision 11 extends it again. Restated here for executor reference, scoped to Spec 6A's surfaces only:

**The pattern:**
- Card chrome stays in the violet/glass system (already shipped in 4A; Grow card primitives migrate in this spec).
- Icon container is a small rounded square at `bg-white/[0.05]` when the existing structure uses a container. When the existing structure has the icon inline with the heading or as part of the tab item (no container), keep it inline and apply the tonal color directly.
- Icon itself carries a tonal color signaling category. Colors are muted/pastel, never fully saturated.
- The icon is the ONLY colored element in the card; everything else stays violet/glass.

**Tonal token assignments for Spec 6A** (the Spec 6A subset of the full Grow direction-doc Decision 11 table; CC may select a 1-step-lighter or darker shade per usage during execution if rendered contrast against the FrostedCard chrome reads incorrectly — these are the families/defaults locked at planning time):

| Surface                               | Icon          | Tonal default                              | Family rationale                                                                |
| ------------------------------------- | ------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Plans tab item                        | BookOpen      | `text-sky-300`                             | Study/scripture; matches Dashboard TodaysDevotional pattern                     |
| Challenges tab item                   | Flame         | `text-amber-300`                           | Warm/effort; matches Dashboard StreakCard + ChallengeWidget pattern             |
| Pulse dot on Challenges tab           | (small dot)   | preserve themeColor                        | Functional categorical signal (active-challenge brand) — NOT Tonal Icon Pattern |
| Create-Your-Own-Plan card             | Sparkles      | `text-violet-300`                          | Discovery/creation                                                              |
| Create-Your-Own-Plan icon container   | (rounded box) | `bg-white/[0.05]`                          | System-aligned neutral (replaces `bg-primary/10`)                               |
| HallOfFame item Trophy                | Trophy        | `text-amber-300`                           | Celebration/achievement (replaces `text-amber-500`)                             |
| PlanCard cover                        | (emoji)       | preserve emoji                             | Plan-specific identity                                                          |
| ChallengeIcon (Upcoming/Active/etc.)  | (component)   | preserve themeColor                        | Theme-color brand (data-driven)                                                 |
| ActiveChallengeCard CTA buttons       | (icon may be present, depending on state) | inline `style={{ backgroundColor: themeColor }}` (preserved) | Theme-color brand — NOT Tonal Icon Pattern                              |
| ActiveChallengeCard progress bar fill | n/a (bar)     | inline `style={{ backgroundColor: themeColor, width: progressPercent% }}` (preserved) | Theme-color brand — NOT Tonal Icon Pattern    |
| NextChallengeCountdown countdown text | (no icon)     | conditional `text-red-400` ≤1d / `text-amber-300` ≤7d / `text-white` (preserved) | Time-pressure semantics; preserved AS-IS                |
| Tabs primitive active-state indicator | n/a (chrome)  | violet pattern from DailyHub (preserved)   | Tabs primitive owns its active-state styling                                    |

**Application discipline:** Apply the pattern in a way that fits each component's existing structure. Tab icons go inline in the Tabs primitive's `items` array — no container imposition. Trophy in HallOfFame goes inline in the heading row — no container imposition (existing structure has no container). Sparkles in Create-Your-Own-Plan keeps its existing `rounded-lg` container but the container background changes from `bg-primary/10` to `bg-white/[0.05]` and the icon color changes from `text-primary` to `text-violet-300`. The end-state contract is "icon carries tonal color, everything else stays in-system, theme-color brand stays preserved as inline-styled rolls-own."

#### Change 1 — BackgroundCanvas wraps GrowPage main content (below hero)

Modify `frontend/src/pages/GrowPage.tsx`.

Wrap the IntersectionObserver sentinel + the sticky tab bar wrapper + both tabpanels (Plans + Challenges) inside `<BackgroundCanvas>`. The hero `<section>` (with `style={ATMOSPHERIC_HERO_BG}`) stays inside `<main>` but OUTSIDE the BackgroundCanvas wrapper. The hero's stronger atmospheric effect (radial purple ellipse at top center) is appropriate for the hero zone; BackgroundCanvas fills the area below with subtler multi-bloom layers. `Navbar transparent` and `SiteFooter` stay outside `<main>` and outside BackgroundCanvas. The outer `<div>` `flex min-h-screen flex-col bg-dashboard-dark font-sans` stays as base color and base layout.

Add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` (verify exact import path during execution — match the path used in Spec 4A Dashboard / Spec 5 Local Support).

**Critical preservation:**
- `ATMOSPHERIC_HERO_BG` style on hero section (preserved exactly).
- `<Navbar transparent />` outside BackgroundCanvas (preserved exactly).
- IntersectionObserver sentinel (`<div ref={sentinelRef} aria-hidden="true" />`) — placed INSIDE BackgroundCanvas. The IO observer needs to fire when the sentinel scrolls past the hero; keeping it inside the canvas wrapper preserves the geometry. The sentinel was outside both the hero and the tab bar before; it stays in the same logical position relative to them, just inside the new BackgroundCanvas wrapper.
- Sticky tab bar wrapper element identity (the wrapper that gets `bg-hero-bg/70` added in Change 3) — same element, same `ref`-less structure, same conditional `shadow-md shadow-black/20`, same `cn()` helper usage.
- Both tabpanels mount simultaneously (`hidden={activeTab !== 'plans'}` / `hidden={activeTab !== 'challenges'}` toggle preserved exactly — do not switch to conditional rendering, the `hidden` attribute is load-bearing for ARIA and for not unmounting child component state when switching tabs).
- All ARIA: `role="tabpanel"`, `id="tabpanel-plans"`, `id="tabpanel-challenges"`, `aria-labelledby` on each tabpanel pointing at the tab item it pairs with.
- `<SiteFooter />` outside BackgroundCanvas (preserved exactly).

**Atmospheric tuning authorization (parallel to Spec 5 Decision 1).** BackgroundCanvas opacity values used elsewhere may need slight reduction for Grow specifically. Grow is a longer-dwell browse-and-pick surface — atmospheric blooms that work on a quick-scan Dashboard could feel too active during a 3-minute plan-comparison session. CC verifies the rendered atmosphere during execution. If the blooms feel too active, tune opacity downward (e.g., reduce one or more bloom layers' opacity by ~20–30%) and document the choice. Tuning is preferred over removal — atmospheric continuity with Dashboard / BibleLanding / Local Support is the primary goal.

#### Change 2 — Hero subtitle migration (italic → plain prose)

Modify `frontend/src/pages/GrowPage.tsx` (line ~78 area; verify exact line during execution).

Current:
```tsx
<p className="mt-2 font-serif italic text-base text-white/60 sm:text-lg">
  Structured journeys to deepen your walk with God
</p>
```

Migrate to:
```tsx
<p className="mt-2 text-base text-white/70 leading-relaxed sm:text-lg">
  Structured journeys to deepen your walk with God
</p>
```

Rationale per direction doc Decision 3: italic on body subtitles is deprecated. Removing `font-serif italic` aligns with the Round 3 system. Bumping muted color from `text-white/60` to `text-white/70` slightly improves readability against the new BackgroundCanvas atmosphere (Change 1 introduces atmospheric blooms behind the content; the slight color bump compensates for the reduced perceived contrast). Adding `leading-relaxed` provides the prose breathing that the italic display previously implied through letterform spacing.

The hero `<h1>` with `style={GRADIENT_TEXT_STYLE}` (the canonical white-to-purple gradient text), the surrounding `<section>` element, the `aria-labelledby="grow-heading"` wiring, all spacing classes, and the accessible heading id are preserved exactly.

#### Change 3 — Sticky tab bar background tint

Same file (`frontend/src/pages/GrowPage.tsx`). The sticky tab bar wrapper currently:

```tsx
<div className={cn(
  'sticky top-0 z-40 backdrop-blur-md transition-shadow ...',
  isSticky && 'shadow-md shadow-black/20'
)}>
  {/* tab bar */}
</div>
```

Add `bg-hero-bg/70` to the base classes (token verification per recon step 8 above):

```tsx
<div className={cn(
  'sticky top-0 z-40 bg-hero-bg/70 backdrop-blur-md transition-shadow duration-base ...',
  isSticky && 'shadow-md shadow-black/20'
)}>
  {/* tab bar */}
</div>
```

Rationale per direction doc Decision 5: `bg-hero-bg` resolves to canonical `#08051A`. At 70% opacity with `backdrop-blur-md`, the tab bar reads as a frosted-anchored bar rather than floating disconnected over content. The `transition-shadow` keeps the shadow IO sentinel logic working as before. The `duration-base` token aligns with BB-33 animation tokens (`frontend/src/constants/animation.ts`) per the project rule that animation durations should not be hardcoded; if the existing class string already uses `duration-base` (or a synonymous animation token), preserve it; if it uses a hardcoded `duration-200` or similar, replace with `duration-base`.

If `bg-hero-bg` is not in `tailwind.config`, fall back to `bg-[#08051A]/70` (literal arbitrary value) or `bg-dashboard-dark/70` (if that token already resolves to the same or close hex). Document the choice in the execution log so Spec 6B and 6C can match the same token usage on `/reading-plans/:planId` and `/challenges/:challengeId` sticky regions.

Verify visually post-change that the IO sentinel still triggers shadow correctly — the shadow should still appear once the user scrolls past the hero, the tab bar should still be reachable, and the new background tint should not visually conflict with the existing shadow.

#### Change 4 — Tab icon tonal colors

Same file. The Tabs primitive items array currently:

```tsx
<Tabs ariaLabel="Grow in Faith sections" activeId={activeTab} onChange={switchTab} items={[
  { id: 'plans', label: 'Reading Plans', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'challenges', label: 'Challenges', icon: <Flame className="h-4 w-4" />, badge: <pulse-dot/> },
]} />
```

Apply tonal colors to icons per direction doc Decision 11:

```tsx
<Tabs ariaLabel="Grow in Faith sections" activeId={activeTab} onChange={switchTab} items={[
  { id: 'plans', label: 'Reading Plans', icon: <BookOpen className="h-4 w-4 text-sky-300" /> },
  { id: 'challenges', label: 'Challenges', icon: <Flame className="h-4 w-4 text-amber-300" />, badge: <pulse-dot/> },
]} />
```

The pulse dot on the Challenges tab is preserved AS-IS — it carries the active-challenge themeColor as a functional categorical signal (which seasonal challenge is currently active, encoded by color), not a Tonal Icon Pattern application. The pulse animation is preserved AS-IS.

The tonal colors apply regardless of active/inactive state — the Tabs primitive's active-state styling may apply a brightness boost (or a violet-glow ring) on top of the icon color, which is fine and expected. Verify post-change that both active and inactive states read correctly.

#### Change 5 — PlanCard chrome migration (FrostedCard default + Link integration)

Modify `frontend/src/components/reading-plans/PlanCard.tsx`.

The current root `<Link>` chrome (`flex h-full flex-col rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`) migrates to FrostedCard default.

Implementation per recon step 6 above:

**Path A (preferred — FrostedCard supports `as={Link}` polymorphism):**
```tsx
<FrostedCard
  as={Link}
  to={`/reading-plans/${id}`}
  variant="default"
  className="flex h-full flex-col p-6"
>
  {/* card content */}
</FrostedCard>
```

**Path B (fallback — wrap FrostedCard in Link):**
```tsx
<Link
  to={`/reading-plans/${id}`}
  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30 rounded-3xl"
>
  <FrostedCard variant="default" className="flex h-full flex-col p-6">
    {/* card content */}
  </FrostedCard>
</Link>
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'` (verify path during execution).

**Critical preservation:**
- All inner content: cover emoji + title row, "Created for you" badge (when AI-generated), description, day/difficulty/theme badges, progress text, status action (StatusAction sub-component which renders the "Start" / "Continue" / "Completed" / "Resume" affordance based on plan progress).
- Hover lift comes free from FrostedCard variant — do not apply manual `hover:bg-*` overrides.
- Focus-visible ring: FrostedCard's default focus ring may differ from current `ring-white/50`. Adjust to system standard (`ring-violet-400/30`) if Path A is used; the FrostedCard primitive's own focus-visible behavior is the source of truth. If Path B is used, the focus ring lives on the Link wrapper at `ring-violet-400/30` (system standard).
- Link `to={...}` navigation behavior is preserved exactly.
- The component's prop signature does not change — `id`, `title`, `description`, `daysCount`, `difficulty`, `theme`, `coverEmoji`, `isAiGenerated`, `progress`, etc. are all preserved exactly.

**Side effect:** rounded radius bumps from `rounded-2xl` (current) → `rounded-3xl` (FrostedCard default). This is the intended Round 3 visual unification; PlanCard joins every other migrated card primitive at the canonical `rounded-3xl` radius. Tests that asserted on `rounded-2xl` are updated.

**Test impact:** `PlanCard.test.tsx` has 13 explicit class-string assertions (`rounded-2xl`, `bg-white/[0.06]`, `border-white/[0.12]`, `hover:bg-white/[0.08]`, `focus-visible:ring-white/50`, plus shadow/transition assertions). All need updating to FrostedCard's default tokens (`rounded-3xl`, `bg-white/[0.07]` if that's the actual token — verify against FrostedCard source, otherwise use whatever the actual token is, `border-white/[0.12]` likely unchanged but verify, `hover:bg-white/[0.10]` if that's the actual hover token — verify). Behavioral assertions (Link `to` value, click target, conditional rendering of "Created for you" badge, StatusAction rendering, accessible name from heading) are preserved unchanged.

#### Change 6 — UpcomingChallengeCard chrome migration

Modify `frontend/src/components/challenges/UpcomingChallengeCard.tsx`.

The current root `<article>` chrome (`flex h-full flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] hover:border-white/20`) migrates to FrostedCard default with `as="article"`:

```tsx
<FrostedCard as="article" variant="default" className="flex h-full flex-col p-6">
  {/* card content */}
</FrostedCard>
```

If FrostedCard does not support `as="article"` (verify per recon step 7), wrap a default FrostedCard inside an `<article>` with the semantic structure preserved:

```tsx
<article className="contents">
  <FrostedCard variant="default" className="flex h-full flex-col p-6">
    {/* card content */}
  </FrostedCard>
</article>
```

Add the FrostedCard import.

**Critical preservation:**
- ChallengeIcon + title row (the icon carries the seasonal themeColor — preserved AS-IS, data-driven).
- CategoryTag (the seasonal palette tag — preserved AS-IS per direction doc Decision 11; CategoryTag has its own color tokens that are out-of-scope for the Tonal Icon Pattern).
- Description.
- Action buttons (Remind me / View Details — these are likely already canonical Button or ghost-link affordances from earlier migrations; verify and preserve).

**Side effect:** rounded radius bumps from `rounded-xl` → `rounded-3xl`.

**Test impact:** `UpcomingChallengeCard.test.tsx` has class-string assertions on `rounded-xl`. Update to `rounded-3xl` and update any other token assertions to FrostedCard's defaults. Behavioral assertions preserved.

#### Change 7 — NextChallengeCountdown chrome migration

Modify `frontend/src/components/challenges/NextChallengeCountdown.tsx`.

The current root chrome (`rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 sm:p-8 backdrop-blur-sm shadow-[...]`) migrates to FrostedCard default:

```tsx
<FrostedCard variant="default" className="p-6 sm:p-8">
  {/* card content */}
</FrostedCard>
```

Add the FrostedCard import.

**Critical preservation:**
- "NEXT CHALLENGE" eyebrow text (preserved exactly — typography, color, letter-spacing).
- Icon + title + CategoryTag row (icon = ChallengeIcon, themeColor preserved; CategoryTag preserved).
- Color-coded countdown text — the conditional logic that applies `text-red-400` when ≤1 day remains, `text-amber-300` when ≤7 days, `text-white` otherwise — is preserved EXACTLY. This is time-pressure semantics, not a Tonal Icon Pattern application.
- Action buttons (Remind me / View Details — preserve).

**Side effect:** rounded radius preserved or bumped depending on FrostedCard default — verify; the brief specifies `rounded-2xl` → FrostedCard default which is likely `rounded-3xl`.

**Test impact:** `NextChallengeCountdown.test.tsx` has class-string assertions. Update to FrostedCard tokens. Behavioral assertions (countdown color logic, days-remaining computation, action button click handlers) preserved.

#### Change 8 — ActiveChallengeCard chrome migration (theme-color preservation critical)

Modify `frontend/src/components/challenges/ActiveChallengeCard.tsx`.

The current root chrome (`rounded-2xl border-2 border-primary/30 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8`) migrates to FrostedCard default with the `border-2 border-primary/30` emphasis preserved per direction doc Decision 7 (ActiveChallengeCard row).

Implementation per recon step 10 above:

**Path A (preferred — className override):**
```tsx
<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">
  {/* card content */}
</FrostedCard>
```

**Path B (fallback — wrapper div):**
```tsx
<div className="rounded-3xl border-2 border-primary/30">
  <FrostedCard variant="default" className="p-6 sm:p-8">
    {/* card content */}
  </FrostedCard>
</div>
```

Test both visually during execution. Path A is cleaner if the FrostedCard's default border (`border border-white/[0.12]`) does not visually conflict with the `border-2 border-primary/30` override. Path B is the fallback if Path A double-borders or otherwise reads incorrectly.

Add the FrostedCard import.

**CRITICAL — theme-color CTAs and progress bar preserved AS-IS as rolls-own (Decision 8).** The buttons inside ActiveChallengeCard (Resume / Continue / Join Challenge — the specific button rendered depends on `isJoined` and `isCompleted` state) use inline `style={{ backgroundColor: themeColor }}` and stay as rolls-own. Example (preserved exactly):

```tsx
{isJoined && !isCompleted && (
  <button
    onClick={...}
    style={{ backgroundColor: themeColor }}
    className="inline-flex min-h-[44px] items-center rounded-full px-6 py-2 text-sm font-semibold text-white"
  >
    Continue
  </button>
)}
```

These buttons DO NOT migrate to the `<Button>` primitive. The seasonal themeColor brand expression (deep purple Lent, gold Easter, red Pentecost, deep blue Advent, etc.) is load-bearing for category identity and the contrast safety is already handled by `getContrastSafeColor()`. Only the surrounding card chrome changes.

The progress bar inside ActiveChallengeCard is similarly preserved AS-IS:

```tsx
<div role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
  <div
    style={{ width: `${progressPercent}%`, backgroundColor: themeColor }}
    className="..."
  />
</div>
```

Both the progressbar wrapper's `role="progressbar"` ARIA semantics and the inline-styled fill bar (with `width: progressPercent%` and `backgroundColor: themeColor`) are preserved. Only the surrounding card chrome moves to FrostedCard default.

**Critical preservation:**
- All internal layout: ChallengeIcon + title row, CategoryTag, "Day N of M" text, the progress bar markup with `role="progressbar"` and aria-valuenow / aria-valuemin / aria-valuemax, the conditional Resume/Continue/Join Challenge button rendering, the themeColor + getContrastSafeColor logic, the `min-h-[44px]` touch target on the buttons (44px minimum is the project rule).
- Behavioral logic: `isJoined` / `isCompleted` state, click handlers, `progressPercent` computation, themeColor passthrough.
- Existing tests on this file must continue to pass with no behavioral assertion changes; class-string assertions on the outer chrome update to FrostedCard tokens (or to the wrapper div + FrostedCard combo, depending on Path A vs Path B).

#### Change 9 — PastChallengeCard chrome migration (subdued variant)

Modify `frontend/src/components/challenges/PastChallengeCard.tsx`.

The current root chrome (`rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 ...` with `role="button"`) migrates to FrostedCard subdued. The `role="button"` semantic is pre-existing; per direction doc Decision 14, leaving this as a future a11y-focused fix is in scope for a separate spec. Do NOT change the role in this spec — that is out of scope.

```tsx
<FrostedCard
  variant="subdued"
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onClick={handleClick}
  className="p-4 cursor-pointer"
>
  {/* card content */}
</FrostedCard>
```

Verify FrostedCard's prop API supports `role`, `tabIndex`, `onKeyDown`, `onClick` passthrough. If it does not (rare for a primitive built for component composition), fall back to wrapping a `<FrostedCard variant="subdued">` inside a `<div role="button" tabIndex={0} onKeyDown={...} onClick={...}>` — Path B is the fallback shape, parallel to Change 5 / Change 6.

Add the FrostedCard import.

**Critical preservation:**
- All internal content: ChallengeIcon, title, completion date, achievement badge if any.
- Keyboard activation: the existing `handleKeyDown` (likely Enter / Space → click) is preserved exactly.
- Click handler navigates to the challenge detail page — preserved exactly.
- The component reads as "this is a past challenge, completed already" — the subdued variant is correct; the brief uses `bg-white/[0.04]` currently which is in the subdued range, so the visual register matches.

**Side effect:** rounded radius bumps from `rounded-xl` → `rounded-2xl` (FrostedCard subdued's default; verify against FrostedCard source).

#### Change 10 — HallOfFame items chrome migration (subdued variant + Trophy tonal color)

Modify `frontend/src/components/challenges/HallOfFame.tsx`.

The current item chrome (`rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm`) migrates to FrostedCard subdued:

```tsx
<FrostedCard variant="subdued" className="p-5">
  {/* item content */}
</FrostedCard>
```

The Trophy icon currently uses `text-amber-500` — apply Tonal Icon Pattern per direction doc Decision 11: change to `text-amber-300` (slightly desaturated, system-aligned with Dashboard's StreakCard amber and the Challenges tab Flame amber).

```tsx
<Trophy className="h-X w-X text-amber-300" />
```

(Preserve the existing icon size — only the color token changes.)

Add the FrostedCard import.

**Critical preservation:**
- All other internal content: challenge name, completion year/season, accessible heading hierarchy.
- The Trophy icon's structural placement (heading row vs inline) — whatever the existing structure is, preserve it. Apply the `text-amber-300` token directly to the existing icon's className without imposing a container.

**Test impact:** `HallOfFame.test.tsx` has class-string assertions. Update tokens.

#### Change 11 — Create-Your-Own-Plan card chrome migration + Tonal Icon Pattern

Modify `frontend/src/pages/ReadingPlans.tsx` (line ~165 area; verify exact line during execution).

The current `<section>` chrome (`rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`) migrates to FrostedCard default. Inside the card, two coordinated token changes apply Tonal Icon Pattern: the Sparkles icon container background changes from `bg-primary/10` to `bg-white/[0.05]` (system-aligned neutral), and the icon color changes from `text-primary` to `text-violet-300` (the discovery/creation tonal token). Description text color bumps from `text-white/60` to `text-white/70` (mirrors the hero subtitle bump in Change 2 — same readability rationale).

Final shape:

```tsx
<FrostedCard variant="default" className="p-6">
  <div className="flex items-center gap-4">
    <div className="rounded-lg bg-white/[0.05] p-3">
      <Sparkles className="h-6 w-6 text-violet-300" aria-hidden="true" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-white">Create Your Own Plan</h3>
      <p className="mt-1 text-sm text-white/70">{description}</p>
    </div>
    <Button variant="light" onClick={handleCreatePlanClick} className="mt-4 sm:mt-0 sm:ml-4">
      Create Plan
    </Button>
  </div>
</FrostedCard>
```

The "Create Plan" Button stays `variant="light"` (white-pill primary CTA). Per direction doc Decision 9, this card is an emotional invitation ("create something new for yourself") — the white-pill primary CTA is correct here; subtle would be too quiet for an inviting affordance. Distinct from Change 12 below where the ConfirmDialog "Pause & Start New" button is utility navigation and gets subtle.

Add the FrostedCard import (or verify already imported).

**Critical preservation:**
- The entire layout (icon column + title/description column + CTA column on desktop, stacking on mobile) is preserved. The brief's snippet collapses the structure for clarity; verify the exact existing layout (`sm:flex-row sm:items-center` patterns, etc.) and preserve those breakpoints.
- The `description` prop passthrough.
- The `handleCreatePlanClick` handler.
- The `aria-hidden="true"` on the Sparkles icon (decorative — accessibility preserved).

#### Change 12 — ConfirmDialog "Pause & Start New" button migration (`bg-primary` → subtle)

Modify `frontend/src/pages/ReadingPlans.tsx` (line 22–73 area; the inline ConfirmDialog component).

The current dialog has two buttons:

```tsx
<button onClick={onCancel} className="... border border-white/20 bg-transparent text-white ...">
  Keep Current
</button>
<button onClick={onConfirm} className="... bg-primary text-white ...">
  Pause & Start New
</button>
```

Migrate "Pause & Start New" from `bg-primary` solid to `<Button variant="subtle">`:

```tsx
<Button variant="subtle" onClick={onConfirm}>
  Pause & Start New
</Button>
```

"Keep Current" stays as the existing outlined button (the cancel/safer action — quieter chrome is correct).

Per direction doc Decision 9: ConfirmDialog is utility navigation (the user is switching one plan for another), not an emotional climax. Subtle is correct. Reserve gradient-showstopper Button variants for genuine emotional peaks (CreatePlanFlow's "Generate" in Spec 6C).

Add the Button import (or verify already imported).

**Critical preservation:**
- Both buttons keep their click handlers (`onCancel`, `onConfirm`).
- The dialog's surrounding chrome (overlay, focus trap, ARIA `role="dialog"` / `aria-modal="true"` / `aria-labelledby`, escape-key close) is preserved exactly.
- The min-44px touch target on both buttons is preserved (Button primitive enforces this; verify the cancel button still meets the rule).

**Test impact:** `ReadingPlans.test.tsx` may have class-string assertions on `bg-primary` for the Pause button. Update.

#### Change 13 — Delete dead `FilterBar.tsx`

Per recon Decision 12 / step 9 above:

1. Run `grep -r "FilterBar" frontend/src/` from the repo root.
2. If output is empty (zero imports — expected), delete `frontend/src/components/reading-plans/FilterBar.tsx`.
3. If FilterBar has a co-located test file (e.g., `frontend/src/components/reading-plans/__tests__/FilterBar.test.tsx`), delete that too.
4. If output is non-empty (any import), STOP and ask the user. Do not delete.

This is dead code (78 LOC, 0 imports per recon). Removing it reduces noise in the components directory and prevents future engineers from referencing a non-rendered component.

#### Change 14 — Update test class-string assertions across affected files

Update class-string assertions in the following test files to match the new FrostedCard / Button / token outputs from Changes 1–12. Behavioral assertions (click handlers, conditional rendering, ARIA, navigation, theme-color computation) are preserved unchanged.

| Test file                                                                       | What changes                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/pages/__tests__/GrowPage.test.tsx`                                | If the test asserts on the sticky tab bar's class string, update to include `bg-hero-bg/70` (or whatever token Change 3 chose). If the test asserts on the hero subtitle's `font-serif italic` or `text-white/60`, update to the new shape (`text-white/70 leading-relaxed`, no italic). |
| `frontend/src/pages/__tests__/ReadingPlans.test.tsx`                            | Update Create-Your-Own-Plan card class string to FrostedCard tokens; update Sparkles icon className to `text-violet-300` and container to `bg-white/[0.05]`; update description color to `text-white/70`. Update ConfirmDialog Pause-button class string to subtle Button variant.      |
| `frontend/src/pages/__tests__/Challenges.test.tsx`                              | Verification only — section structure preserved per brief's "Challenges.tsx (verification only — section structure preserved, no chrome migration)". If any class-string assertions break due to Tonal Icon Pattern application or sticky tab bar token, update.                       |
| `frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx`             | 13 class-string assertions per brief. Update `rounded-2xl` → `rounded-3xl`; update `bg-white/[0.06]` to FrostedCard's default token; update `border-white/[0.12]` if it changed (likely unchanged); update `hover:bg-white/[0.08]` to FrostedCard's hover token; update `focus-visible:ring-white/50` to system standard ring (or to FrostedCard's primitive focus ring per Path A vs Path B). All other shadow/transition assertions verified against FrostedCard defaults. |
| `frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx`   | Update `rounded-xl` → `rounded-3xl` plus other token updates from Change 6.                                                                                                                                                                                                             |
| `frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx`  | Update class-string assertions per Change 7. Countdown color logic assertions (`text-red-400` ≤1d / `text-amber-300` ≤7d / `text-white` otherwise) PRESERVED unchanged.                                                                                                                |
| `frontend/src/components/challenges/__tests__/HallOfFame.test.tsx`              | Update class-string assertions per Change 10. Trophy color update `text-amber-500` → `text-amber-300` is a class-string change that may or may not be asserted on; if asserted, update; if not, leave the test alone.                                                                  |

Additional test files that may be affected (verify during execution): `ActiveChallengeCard.test.tsx` (chrome update — but the inline-style theme-color assertions PRESERVED unchanged), `PastChallengeCard.test.tsx` (chrome update — but `role="button"` assertion PRESERVED), and any `__tests__` co-located with `FilterBar.tsx` if such exists (delete alongside the source file in Change 13).

CC may discover additional class-string failures during the test re-run; resolve each by updating the asserted token to the new shape, never by suppressing or skipping the test.

### Non-Functional Requirements

- **Performance:** No bundle-size regression — FrostedCard / BackgroundCanvas / Button / Tabs are already in the bundle from Specs 4A / 5; this spec adds no new dependencies. Existing route code-splitting on `/grow` is preserved.
- **Accessibility:** WCAG 2.2 AA target. Tabs primitive ARIA (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, roving tabindex, Home/End/ArrowLeft/ArrowRight keyboard navigation if Tabs primitive supports it) preserved exactly. Skip-to-main-content link on `/grow` preserved exactly. ActiveChallengeCard progress bar `role="progressbar"` + aria-valuenow / aria-valuemin / aria-valuemax preserved exactly. PastChallengeCard `role="button"` + tabIndex / onKeyDown preserved exactly (Decision 14 — out of scope for this spec). Min 44px touch target on all buttons preserved. Theme-color CTAs use `getContrastSafeColor()` to ensure foreground text meets WCAG AA contrast against the seasonal themeColor — preserved exactly.
- **Responsive:** Defined for 3 breakpoints (see Responsive Behavior section below). All FrostedCard primitives inherit the same responsive padding behavior already shipped on Dashboard / Local Support.
- **Animation tokens:** Per project rule, no hardcoded `200ms` or `cubic-bezier(...)` strings. Use `duration-base` / `duration-medium` / `ease-organic` etc. tokens from `frontend/src/constants/animation.ts` (BB-33). The sticky tab bar `transition-shadow duration-base` references the canonical token. FrostedCard's hover/focus transitions are owned by the primitive; do not override.
- **Reduced motion:** `prefers-reduced-motion` is respected via the global safety net at `frontend/src/styles/animations.css`. The pulse-dot animation on the Challenges tab and any transition-* on the FrostedCards / Tabs primitive are gated by this safety net. No new motion-reduce class names are introduced in this spec.

## Auth Gating

Grow is a public route per `12-project-reference.md`. Logged-out visitors can browse plans, view challenges, expand cards, and read details. Logged-in users see additional state (active challenge progress, completed challenge ribbons, active reading plan progress in StatusAction). This spec does not add or remove any auth gates — every interactive element preserves its current logged-out vs logged-in behavior.

| Action                                                  | Logged-Out Behavior                                                                                                          | Logged-In Behavior                                                                                                                                              | Auth Modal Message |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Visit `/grow`                                           | Public — full page renders, both tabs accessible                                                                             | Public — same                                                                                                                                                   | n/a                |
| Switch tabs (Plans ↔ Challenges)                        | Works, no auth required                                                                                                       | Works, no auth required                                                                                                                                         | n/a                |
| Click a PlanCard                                        | Navigates to `/reading-plans/:planId` (public route — Spec 6B will fully migrate)                                            | Same navigation                                                                                                                                                 | n/a                |
| Click "Create Plan" on Create-Your-Own-Plan card        | Existing behavior preserved — currently triggers CreatePlanFlow for all users (CreatePlanFlow's auth gating is its own concern, deferred to Spec 6C) | Same behavior                                                                                                                                                   | n/a (no spec change here) |
| Click an UpcomingChallengeCard / NextChallengeCountdown / PastChallengeCard | Navigates to `/challenges/:challengeId` (public route)                                                                       | Same navigation; if logged-in user has joined that challenge, ActiveChallengeCard shows progress instead                                                       | n/a                |
| Click ActiveChallengeCard "Resume" / "Continue" button  | Existing behavior preserved (likely auth-gated already since "joining a challenge" requires login — verify existing handler) | Continues to challenge detail or marks day complete per existing logic                                                                                          | (existing modal copy preserved, no change)               |
| Click ActiveChallengeCard "Join Challenge" button       | Existing behavior preserved (likely auth-gated)                                                                              | Joins the challenge per existing handler                                                                                                                        | (existing modal copy preserved, no change)               |
| ConfirmDialog "Pause & Start New"                       | Existing behavior preserved                                                                                                  | Existing behavior preserved                                                                                                                                     | n/a                |

**No new auth gates introduced.** Every interactive element preserves its current behavior. The auth modal is not invoked by anything new in this spec.

## Responsive Behavior

| Breakpoint            | Layout                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile (< 640px)      | Single-column tab content; PlanCards stack vertically full-width; UpcomingChallengeCard stacks; ActiveChallengeCard takes full width with `p-6` padding; HallOfFame items stack; Create-Your-Own-Plan card stacks (icon row above title row above CTA — `flex-col sm:flex-row` pattern preserved); sticky tab bar full-width; hero subtitle reads at `text-base`.                            |
| Tablet (640–1024px)   | PlanCards in 2-column grid; UpcomingChallengeCards in 2-column grid; ActiveChallengeCard takes full container width with `sm:p-8` padding; Create-Your-Own-Plan card horizontal layout (icon + title side-by-side + CTA right-aligned); hero subtitle reads at `sm:text-lg`.                                                                                                                  |
| Desktop (> 1024px)    | PlanCards in 2-column grid (continues — verify against existing breakpoints; some pages bump to 3-column at `lg:`); UpcomingChallengeCards same; ActiveChallengeCard same; sticky tab bar centered with content max-width; sticky-shadow appears once user scrolls past hero (IO sentinel logic).                                                                                            |

**Responsive specifics preserved AS-IS:** Every existing breakpoint (`sm:`, `md:`, `lg:`, `xl:`) currently applied to the migrated components is preserved exactly. FrostedCard's responsive padding is inherited; do not introduce new breakpoints during the migration. The only responsive class addition in this spec is `sm:p-8` on ActiveChallengeCard (preserved from current code) and the sticky tab bar's mobile/desktop behavior (preserved exactly — `sticky top-0` works identically across breakpoints; the `bg-hero-bg/70` token added in Change 3 applies at all breakpoints).

**Mobile-specific interactions:** PastChallengeCard's `role="button"` + `tabIndex={0}` + `onKeyDown` keyboard activation is preserved on touch devices (Enter/Space key activation maps to tap on touch — already working). Pulse-dot animation on the Challenges tab is the same on mobile as desktop. ActiveChallengeCard theme-color CTAs maintain `min-h-[44px]` touch target across all breakpoints.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The Grow shell + Plans tab + Challenge cards surfaces are read-only browsing surfaces. (AI Plan Generation lives in CreatePlanFlow which is deferred to Spec 6C, and its AI safety considerations were already established in earlier specs that introduced the mock generation flow.)

## Auth & Persistence

- **Logged-out users:** Grow `/grow` is fully browsable — Plans tab and Challenges tab content render, cards are interactive (click navigates to detail pages), tabs are switchable, no data is persisted to backend. The demo-mode zero-persistence rule applies: no localStorage writes from this spec. Any localStorage interactions on `/grow` (active challenge tracking via `useChallengeProgress`, active reading plan tracking via `useReadingPlanProgress`) are preserved AS-IS — no key changes.
- **Logged-in users:** Same browsing experience plus the additional state surfaces ActiveChallengeCard progress, ChallengeIcon themeColor for joined challenges, etc. No backend writes from this spec.
- **localStorage usage:** No new localStorage keys introduced. Existing keys consumed by the affected components (`wr_reading_plan_progress`, `wr_challenge_progress`, `wr_challenge_reminders`, `wr_challenge_nudge_shown`, `wr_custom_plans`) are preserved AS-IS — no shape changes, no key renames, no eviction logic changes. Per `11-local-storage-keys.md`, all existing key documentation remains accurate post-spec.
- **Route type:** Public.

## Completion & Navigation

N/A — Grow shell + Plans tab + Challenge cards is not part of the Daily Hub completion-tracking system. No completion signaling changes. The Daily Hub completion tracking (`wr_daily_completion`) is a separate system that does not interact with `/grow`.

Cross-feature navigation preserved: clicking any plan or challenge card still routes to the corresponding detail page (`/reading-plans/:planId` or `/challenges/:challengeId`). The legacy `/reading-plans` and `/challenges` redirects to `/grow?tab=*` are preserved (no router changes).

## Design Notes

- Follow the Round 3 visual system documented in `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" and the Round 3 visual rollout patterns from Specs 4A / 4B / 4C / 5.
- **FrostedCard primitive (already shipped):** consume `default` for primary listing surfaces (PlanCard, UpcomingChallengeCard, NextChallengeCountdown, ActiveChallengeCard, Create-Your-Own-Plan card) and `subdued` for secondary/historical surfaces (PastChallengeCard, HallOfFame items). Match the FrostedCard usage pattern from Spec 5's ListingCard migration.
- **BackgroundCanvas primitive (already shipped):** use the same multi-bloom pattern wrapped around `<main>` content below the hero. Match the wrapping pattern from Spec 5's `LocalSupportPage.tsx`.
- **Button `subtle` variant (already shipped):** use for ConfirmDialog "Pause & Start New" only in this spec. Do NOT use for any other Grow CTA — Create Plan stays `light`, theme-color CTAs stay rolls-own.
- **Tabs primitive (already correct on `/grow`):** no migration of the primitive itself. Only the icon `className` props in the `items` array change (Change 4).
- **Tonal Icon Pattern (already shipped on Dashboard):** apply per direction doc Decision 11 table. Subset for this spec: BookOpen sky-300 (Plans tab), Flame amber-300 (Challenges tab), Sparkles violet-300 (Create-Your-Own-Plan), Trophy amber-300 (HallOfFame). Pulse dot preserved as theme-color brand. CategoryTag preserved AS-IS. Theme-color CTAs preserved AS-IS.
- **`ATMOSPHERIC_HERO_BG` (already shipped, preserved):** preserved exactly on the hero `<section>`. The hero's stronger atmospheric effect (radial purple ellipse at top center) is appropriate for the hero zone; BackgroundCanvas fills below.
- **`GRADIENT_TEXT_STYLE` (already shipped, preserved):** preserved exactly on the hero `<h1>`. The white-to-purple gradient text is the canonical Round 3 hero treatment.
- **No new visual patterns introduced.** All patterns in this spec are already shipped and verified on Dashboard / BibleLanding / Local Support. Reference design system rule files for canonical class strings.
- **Animation token discipline:** all transitions use BB-33 tokens from `frontend/src/constants/animation.ts`. The sticky tab bar `transition-shadow duration-base` is the only animation-related class in this spec; verify the existing duration is `duration-base` (or update if hardcoded).
- **Reduced-motion safety net:** the global `frontend/src/styles/animations.css` covers all transitions in this spec. Pulse-dot animation gating is preserved AS-IS.

If `_plans/recon/grow-2026-05-04.md` references additional patterns not enumerated here, defer to the recon. The direction doc's Decision 7 table (rolls-own → FrostedCard mapping) is the single source of truth for which variant each component receives.

## Out of Scope

Files NOT modified by this spec (deferred to Spec 6B):
- `frontend/src/pages/ReadingPlanDetail.tsx`
- `frontend/src/pages/ChallengeDetail.tsx`
- `frontend/src/components/reading-plans/DayContent.tsx`
- `frontend/src/components/challenges/ChallengeDayContent.tsx`
- `frontend/src/components/reading-plans/DaySelector.tsx`
- `frontend/src/components/challenges/ChallengeDaySelector.tsx`
- `frontend/src/components/reading-plans/PlanNotFound.tsx`
- `frontend/src/components/challenges/ChallengeNotFound.tsx`

Files NOT modified by this spec (deferred to Spec 6C):
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx`
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx`
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx`
- `frontend/src/components/challenges/MilestoneCard.tsx`
- `frontend/src/components/challenges/DayCompletionCelebration.tsx`

Other items explicitly out of scope:
- ActiveChallengeCard theme-color CTAs (Resume / Continue / Join Challenge) — preserved AS-IS as inline-styled rolls-own per direction doc Decision 8.
- ActiveChallengeCard progress bar inline-styled fill — preserved AS-IS per direction doc Decision 8.
- `ChallengeIcon.tsx` — data-driven component preserving themeColor; preserved AS-IS.
- `CategoryTag.tsx` — seasonal palette tag with its own color tokens; preserved AS-IS per direction doc Decision 12 (called out in Open follow-up items: "if ever migrating to Tonal Icon Pattern, that's a separate thoughtful exercise").
- `SwitchChallengeDialog.tsx` — already uses canonical dialog chrome; preserved AS-IS.
- `CommunityFeed.tsx` and `ChallengeShareButton.tsx` — only consumed by detail pages; Spec 6B handles if needed.
- Hooks: `useReadingPlanProgress`, `useChallengeProgress` — no changes.
- Pulse-dot animation logic on Challenges tab — preserved AS-IS.
- PastChallengeCard `role="button"` semantic — pre-existing accessibility deviation; Decision 14 leaves this as a future a11y-focused fix; out of scope for this spec.
- AudioPill global behavior on Grow surfaces — out of scope per direction doc Decision 15 ("AudioPill behavior on Grow surfaces — out of scope. Same future 'UX tuning on crisis-adjacent surfaces' follow-up as Local Support captures this concern, but Grow likely isn't included since it's growth-oriented, not crisis-oriented.").
- Performance optimization on detail pages (`/reading-plans/:planId`, `/challenges/:challengeId` not lazy-loaded) — future spec; explicitly out of scope.
- FrostedCard, BackgroundCanvas, Button, Tabs primitives — consumed only; primitive sources NOT modified.
- Service files — none touched.
- API/backend changes — none.
- Documentation updates to `09-design-system.md` or `12-project-reference.md` — no design-system updates needed (no new patterns); no route inventory updates needed (no route additions).
- `wr_*` localStorage key additions or shape changes — none.

## Acceptance Criteria

### Pre-execution recon and baseline

- [ ] Working branch is `forums-wave-continued` and contains Spec 4A + 4B + 4C + 5 merged.
- [ ] Direction doc at `_plans/direction/grow-2026-05-04.md` is present.
- [ ] Recon at `_plans/recon/grow-2026-05-04.md` is present.
- [ ] Pre-execution test baseline captured. Live count recorded (expected: ~9,470 pass / 1 pre-existing fail — `useFaithPoints — intercession activity drift`; reconcile against the live numbers at execution start).
- [ ] FrostedCard prop API verified for `as` polymorphism (Path A vs Path B chosen for PlanCard, UpcomingChallengeCard, ActiveChallengeCard, PastChallengeCard).
- [ ] `bg-hero-bg` Tailwind token verified in config; chosen token (`bg-hero-bg/70` or fallback) documented in execution log.
- [ ] `grep -r "FilterBar" frontend/src/` confirms zero imports before deletion.

### Shell-level changes

- [ ] BackgroundCanvas wraps `<main>` content below the hero on `/grow`. Hero `<section>` stays inside `<main>` but OUTSIDE BackgroundCanvas. Navbar and SiteFooter stay outside the BackgroundCanvas.
- [ ] Multi-bloom violet atmospheric layer is visible behind the sticky tab bar and tab content.
- [ ] Hero subtitle migrates from `font-serif italic text-base text-white/60 sm:text-lg` to `text-base text-white/70 leading-relaxed sm:text-lg` (no italic, color bumped, leading added).
- [ ] Sticky tab bar wrapper adds `bg-hero-bg/70` (or chosen fallback) to its base classes; visually anchors at scroll.
- [ ] IntersectionObserver sentinel still triggers `shadow-md shadow-black/20` on the sticky tab bar wrapper when user scrolls past hero (verified visually).
- [ ] Tabs primitive Plans-tab BookOpen icon renders with `text-sky-300`.
- [ ] Tabs primitive Challenges-tab Flame icon renders with `text-amber-300`.
- [ ] Pulse dot on Challenges tab preserved (animation works, theme-color brand color preserved AS-IS — pulse dot is NOT migrated to a tonal token).
- [ ] Tabs primitive ARIA preserved exactly (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, keyboard navigation if Tabs primitive supports it).
- [ ] Both tabpanels mount simultaneously (`hidden={activeTab !== 'plans'}` / `hidden={activeTab !== 'challenges'}` toggle preserved exactly — verify by switching tabs and confirming child component state in the inactive tab persists).

### Card chrome migrations

- [ ] PlanCard renders with FrostedCard `default` variant. Link navigation to `/reading-plans/:planId` preserved exactly. Rounded radius is `rounded-3xl` (FrostedCard default). Hover lift comes from FrostedCard. Focus-visible ring at `ring-violet-400/30` (or FrostedCard's primitive focus ring per Path A). All inner content (cover emoji + title row, "Created for you" badge, description, day/difficulty/theme badges, progress text, StatusAction) preserved exactly.
- [ ] UpcomingChallengeCard renders with FrostedCard `default` variant. Rounded radius is `rounded-3xl`. ChallengeIcon + CategoryTag preserved AS-IS (theme-color brand maintained). Action buttons preserved.
- [ ] NextChallengeCountdown renders with FrostedCard `default` variant. "NEXT CHALLENGE" eyebrow, ChallengeIcon, CategoryTag, color-coded countdown text (`text-red-400` ≤1d / `text-amber-300` ≤7d / `text-white` otherwise) preserved EXACTLY. Action buttons preserved.
- [ ] ActiveChallengeCard renders with FrostedCard `default` variant + `border-2 border-primary/30` emphasis (Path A or Path B per recon step 10). All theme-color CTA buttons (Resume / Continue / Join Challenge — depending on `isJoined` and `isCompleted` state) preserved AS-IS as rolls-own with `style={{ backgroundColor: themeColor }}`. Progress bar preserved AS-IS with `role="progressbar"` + aria-valuenow / aria-valuemin / aria-valuemax + inline-styled `width: progressPercent%` and `backgroundColor: themeColor`. `min-h-[44px]` touch target preserved on all theme-color buttons.
- [ ] PastChallengeCard renders with FrostedCard `subdued` variant. `role="button"` + `tabIndex={0}` + `onKeyDown` keyboard activation preserved exactly (Decision 14 — out of scope to fix). Rounded radius is `rounded-2xl` (FrostedCard subdued's default).
- [ ] HallOfFame items render with FrostedCard `subdued` variant. Trophy icon migrates from `text-amber-500` to `text-amber-300`.
- [ ] Create-Your-Own-Plan card renders with FrostedCard `default` variant. Sparkles icon at `text-violet-300`. Sparkles container background `bg-white/[0.05]`. Description color `text-white/70`. "Create Plan" Button stays `variant="light"` (white-pill primary CTA preserved per direction doc Decision 9 — emotional invitation, not utility).
- [ ] ConfirmDialog "Pause & Start New" button migrates to `<Button variant="subtle">`. "Keep Current" button stays as existing outlined cancel affordance. Dialog ARIA (role, modal, labelledby, focus trap, escape-to-close) preserved.
- [ ] `frontend/src/components/reading-plans/FilterBar.tsx` deleted (verified zero imports first via grep).
- [ ] FilterBar co-located test file deleted alongside source if such exists.

### Test impact + baseline preservation

- [ ] `frontend/src/pages/__tests__/GrowPage.test.tsx` updated for sticky tab bar token + hero subtitle token; behavioral assertions preserved.
- [ ] `frontend/src/pages/__tests__/ReadingPlans.test.tsx` updated for Create-Your-Own-Plan card tokens + ConfirmDialog Pause-button class string; behavioral assertions preserved.
- [ ] `frontend/src/pages/__tests__/Challenges.test.tsx` verification only; updates only if class-string assertions break due to Tonal Icon Pattern application or sticky tab bar token.
- [ ] `frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx` 13 class-string assertions updated to FrostedCard tokens. Behavioral assertions (Link `to`, click target, conditional rendering, StatusAction rendering, accessible name) preserved unchanged.
- [ ] `frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx` `rounded-xl` → `rounded-3xl` plus other token updates.
- [ ] `frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx` chrome-token updates. Countdown color logic assertions preserved unchanged.
- [ ] `frontend/src/components/challenges/__tests__/HallOfFame.test.tsx` chrome-token updates. Trophy color update applied if asserted.
- [ ] Additional test files affected by Changes (ActiveChallengeCard.test, PastChallengeCard.test) updated for chrome class strings; theme-color inline-style assertions preserved unchanged.
- [ ] `pnpm test --run` post-spec: pre-existing failures match baseline (1–2 fail). Zero new failures introduced. If new failures exist, reconcile each as either (a) class-string update needed, or (b) genuine behavioral regression that must be fixed before spec is considered complete.
- [ ] `pnpm typecheck` post-spec: passes with no new type errors.

### Manual visual verification on `/grow`

- [ ] Atmospheric BackgroundCanvas layer is visible behind tab bar and tab content (subtle, doesn't compete with hero's stronger atmospheric).
- [ ] Hero subtitle reads as plain prose (no italic), `text-white/70`, slightly more relaxed line-height than before.
- [ ] Sticky tab bar tints with `bg-hero-bg/70` (or chosen fallback) at scroll past hero. Shadow appears once IO sentinel scrolls past.
- [ ] BookOpen tab icon = sky-300, Flame tab icon = amber-300. Active vs inactive states render correctly (Tabs primitive's active-state styling layers on top correctly).
- [ ] Pulse dot on Challenges tab still animates and still uses the active-challenge themeColor.
- [ ] Plans tab: PlanCards in grid layout, all migrated to FrostedCard chrome. Create-Your-Own-Plan card at top (or wherever the existing layout places it) reads with new chrome + Sparkles violet-300.
- [ ] Challenges tab: all card types (Upcoming, NextChallengeCountdown, Active, Past, HallOfFame items) render new chrome.
- [ ] ActiveChallengeCard reads as the most-prominent card on the page (the `border-2 border-primary/30` emphasis is visible). Resume/Continue/Join Challenge buttons render with the active challenge's themeColor (verify across multiple seasonal contexts if test data permits — Lent purple, Easter gold, Pentecost red, Advent deep blue).
- [ ] Hover lift on all FrostedCards works (verified manually on a desktop browser).
- [ ] Keyboard navigation: Tab through interactive elements; focus rings visible on PlanCard, UpcomingChallengeCard, NextChallengeCountdown, ActiveChallengeCard buttons, PastChallengeCard, Create-Your-Own-Plan CTA, ConfirmDialog buttons.

### Regression checks (no changes expected — verify nothing drifts)

- [ ] `/` (Dashboard) — full visual unchanged; FrostedCard / BackgroundCanvas / Tonal Icon Pattern still render as Spec 4A/4B/4C left them.
- [ ] `/daily?tab=*` (DailyHub) — full visual unchanged; Tabs primitive looks identical.
- [ ] `/bible` (BibleLanding) — full visual unchanged; BackgroundCanvas atmosphere matches.
- [ ] `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — full visual unchanged; Spec 5's migration looks identical.
- [ ] `/reading-plans/:planId` — chrome partially affected by PlanCard migration if the detail page renders a PlanCard component (verify); otherwise untouched until Spec 6B. If a partial ripple occurs, document and ensure it does not break the detail page.
- [ ] `/challenges/:challengeId` — same caveat as above for ActiveChallengeCard rippling into the detail page; document and ensure no break.
- [ ] `/reading-plans` legacy redirect to `/grow?tab=plans` still fires.
- [ ] `/challenges` legacy redirect to `/grow?tab=challenges` still fires.

### Plumbing / hygiene

- [ ] No new `wr_*` localStorage keys introduced. `11-local-storage-keys.md` requires no updates.
- [ ] No new shared components introduced. `09-design-system.md` requires no updates.
- [ ] No new routes added. `12-project-reference.md` requires no updates.
- [ ] No new env vars. No backend changes. No API contract changes.
- [ ] Animation tokens used (no hardcoded `200ms` / `cubic-bezier(...)`).
- [ ] If atmosphere tuning was applied per Change 1's authorization, the chosen opacity is documented in the execution log so Spec 6B and 6C can match.
