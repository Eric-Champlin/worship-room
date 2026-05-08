# Spec 8C: Bible Cluster — Reading Plans

**Master Plan Reference:** Direction document at `_plans/direction/bible-cluster-2026-05-05.md` is the locked decision set (19 numbered decisions covering all three Bible sub-specs). Recon at `_plans/recon/bible-2026-05-05.md` is the source of truth for current line numbers, atmospheric treatments, plan-detail/plan-day chrome, TodaysPlanCard URL, and the BibleStub / PlanFilterBar / PlanFilterPill orphan inventory. Spec 8C is the **second sub-spec** of the Bible cluster — it consumes the patterns Spec 8B established (BackgroundCanvas atmospheric layer for outer Bible surfaces, FrostedCard primitive adoption, subtle Button conventions, anti-pressure logged-out posture) and applies them mechanically to the reading-plan surfaces. Specs 6A/6B/6C/6D (Grow cluster), Spec 7 (Auth surfaces), and Spec 8B (MyBible) are prerequisites — verify all merged into the working branch at execution start.

This is a **medium spec**. Mostly mechanical pattern application following 8B's established Bible-cluster conventions. Scope combines (1) atmospheric layer migration on three pages — BibleBrowse, BiblePlanDetail, BiblePlanDay — from inline `ATMOSPHERIC_HERO_BG` + `bg-dashboard-dark` flat to the canonical `<BackgroundCanvas>` wrap, (2) one real navigation bug fix on TodaysPlanCard (its Link routes Bible plan slugs to Grow's `/reading-plans/:planId` URL pattern, landing the user on Grow's PlanNotFound page), (3) dead-code deletion of `BibleStub.tsx` (pre-redesign placeholder, no production import) and the orphan `PlanFilterBar` + `PlanFilterPill` components (never imported by `PlanBrowserPage` per Eric's "no filtering" call), (4) heading-semantics tightening on BiblePlanDay (replace three weak `<p className="text-xs uppercase">` section labels — Devotional / Passages / Reflection prompts — with semantic `<h2>` elements; class string preserved exactly), (5) consolidation of inline `ATMOSPHERIC_HERO_BG` gradient duplication that PageHero.tsx already exports canonically, and (6) verification (no migration) that `PlanCompletionCelebration` preserves its intentional divergence from Grow's `PlanCompletionOverlay` per Decision 5 — the contemplative tone of finishing a Bible reading plan stays intentionally quieter than the achievement tone of a Grow challenge.

Patterns this spec USES (already shipped via Specs 4A–8B): `<BackgroundCanvas>` atmospheric layer (canonical on Dashboard, Local Support, Grow `/grow`, BibleLanding, PlanBrowserPage, MyBiblePage post-8B); `<FrostedCard>` primitive (already in use on the plan card components — `PlanInProgressCard`, `PlanBrowseCard`, `PlanCompletedCard`, `PlanBrowserEmptyState` — no migration needed there); `<Button variant="subtle">` (canonical for non-climactic CTAs across the app); the white-pill homepage-primary CTA pattern (canonical for plan-detail "Start", "Continue", plan-day "Mark day complete", "Read this passage", "Journal about this"); `GRADIENT_TEXT_STYLE` on plan + day h1s (already in use); `<h2>` heading hierarchy (canonical for major page sections). Patterns this spec INTRODUCES: none. 8C is pure pattern application — no new visual primitives, no new auth posture, no new architecture decisions. Patterns this spec MODIFIES: none.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/bible-2026-05-05.md`, `_plans/direction/bible-cluster-2026-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/bible/browse` — BibleBrowse migration. Replace `<Layout>` wrapper + inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone with the canonical `<BackgroundCanvas>` wrap pattern matching BibleLanding and 8B's MyBiblePage. SEO metadata, `BibleBooksMode` rendering, "Browse Books" h1 with `GRADIENT_TEXT_STYLE`, and the absence of a subtitle are all preserved exactly. Hero spacing aligned to BibleLanding's `pt-28 pb-12` rhythm if not already there.
- `/bible/plans/:planId` — BiblePlanDetail migration. Replace `min-h-screen bg-dashboard-dark` + inline `ATMOSPHERIC_HERO_BG` (per recon, the page duplicates the gradient string inline rather than importing the canonical export from PageHero.tsx) with the `<BackgroundCanvas>` wrap. The per-plan `coverGradient` overlay (20% opacity, varies per plan theme) PRESERVED on the hero — that's the per-plan visual identity, parallel to how Grow Challenge `themeColor` halos preserved on top of canonical atmospheric in Spec 6B. The plan h1's `GRADIENT_TEXT_STYLE`, plan description, theme pill, duration, time-per-day, curator, progress bar, full CTA row (Start / Continue / Pause / Restart), reflection card on completed plans, day list (5 visible by default + "Show all N days" toggle, with `DayStatusIndicator` components), and auth-modal triggering for start/pause/restart actions are all preserved exactly. The three `bg-primary/N` decorative tints at lines 128, 162, 296 (badge, progress-bar fill, day-status indicator) stay per Decision 11 — those are categorical signals, not CTAs. `duration-200` drift stays per Decision 12.
- `/bible/plans/:planId/day/:dayNumber` — BiblePlanDay migration AND heading-semantics tightening. Same atmospheric migration pattern as BiblePlanDetail. PLUS three section labels — **Devotional**, **Passages**, **Reflection prompts** — each currently rendered as `<p className="text-xs font-medium uppercase tracking-widest text-white/60">` change to semantic `<h2>` elements. Class string preserved exactly. Hierarchy after the change: h1 (day title, gradient) → h2 (Devotional) → h2 (Passages) → h2 (Reflection prompts), no skips. Hero with day number + plan title + `GRADIENT_TEXT_STYLE` h1, Devotional FrostedCard, Passage card grid (1 or 2 cols), Reflection prompts FrostedCard, bottom day nav (prev/next), Mark day complete sticky CTA (homepage-primary white pill), `PlanCompletionCelebration` trigger logic, and auth-modal triggering for mark-complete are all preserved exactly.
- `/bible` — verification only (BibleLanding, already canvas-based per Spec 8B's atmospheric foundation). Behavior change visible to the user: the Today's Plan card now actually navigates to the right URL when a Bible reading plan is active — clicking it lands on `/bible/plans/{slug}` (BiblePlanDetail) rather than `/reading-plans/{slug}` (which routes to Grow's PlanNotFound because Grow's URL space owns `/reading-plans/*`). This is the TodaysPlanCard URL bug fix (Change 1).
- `/bible/plans` — verification only (PlanBrowserPage, already uses BackgroundCanvas per recon). Behavior change visible to the user: no filter UI on the page, because `PlanFilterBar` + `PlanFilterPill` components are deleted. URL-driven filtering still works — a user can land on `/bible/plans?theme=anxiety` from a hand-typed URL or external link, and the `usePlanBrowser` hook still reads URL params and filters the plan list. The hook's filter API (`theme`, `duration`, `setTheme`, `setDuration`, `clearFilters`) is preserved per Change 7d's Option A — no UI consumer remains, but URL-driven plumbing is low-overhead and gives external marketing links the option to deep-link to filtered subsets.
- `*` — App.tsx historical comment about BibleStub (line 85 per recon) cleaned up if stale (TODO-style comment removed; historical-context-style comment preserved).

The single non-route effect: the dead-code deletions remove `BibleStub.tsx`, `BibleStub.test.tsx`, `PlanFilterBar.tsx`, `PlanFilterPill.tsx`, and any associated test files. None are imported in production. Type-check (`npm run typecheck`) and full test suite (`pnpm test`) must pass after deletion to confirm no lingering references.

---

## Overview

The Bible cluster's reading-plan surfaces — `/bible/browse`, `/bible/plans/:planId`, `/bible/plans/:planId/day/:dayNumber` — sit on inconsistent atmospheric chrome relative to the canonical pattern. BibleBrowse uses a `<Layout>` wrapper with an inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone (importing the canonical export from PageHero.tsx but applying it to a hero region rather than the page background). BiblePlanDetail and BiblePlanDay each use `min-h-screen bg-dashboard-dark` as the page background and duplicate the same `ATMOSPHERIC_HERO_BG` gradient string inline on the hero zone — three different paths to roughly the same visual outcome, two of which silently shadow the canonical PageHero.tsx export. Spec 8B established `<BackgroundCanvas>` as the canonical atmospheric layer for outer Bible surfaces (Decision 1: BibleLanding, BibleBrowse, MyBiblePage, PlanBrowserPage, BiblePlanDetail, BiblePlanDay all standardize on it; HorizonGlow stays scoped to Daily Hub). Spec 8C applies that decision to the three plan surfaces.

The TodaysPlanCard URL bug is a real, user-visible navigation defect. Per recon, `frontend/src/components/bible/landing/TodaysPlanCard.tsx` line 22 area renders `<Link to={`/reading-plans/${plan.planId}`}>`. The `plan.planId` value is a Bible plan slug (per `useActivePlan.ts:75`), not a Grow plan slug. Grow's URL space owns `/reading-plans/*` — so when a user lands on `/bible` with an active Bible plan and clicks the Today's Plan card, they hit Grow's PlanNotFound page instead of the corresponding BiblePlanDetail. The fix is one line: change the Link target to `/bible/plans/${plan.planId}`. The recon also notes the Bible-side codebase shouldn't reference Grow's URL pattern at all, so a sweep (`grep -rn "reading-plans" frontend/src/components/bible`) is part of the change to confirm no other leaks exist.

The dead-code deletions are housekeeping. `BibleStub.tsx` is a pre-redesign placeholder that's been orphaned since Spec 8B's MyBible work landed — App.tsx:85 carries a comment confirming it's dead. `PlanFilterBar.tsx` (67 LOC) and `PlanFilterPill.tsx` (22 LOC) are an orphaned filter UI pair that were built early in the plans rollout but never wired into PlanBrowserPage; per Eric's "no filtering" call, they shouldn't be wired in. Leaving them on disk creates two risks: (1) future spec authors may rediscover and consume them, contradicting the "no filtering" decision; (2) `code-quality-reviewer` and the `_protocol/01-prompt-build-and-code-health.md` dead-code sweep flag them on every run. Deleting them now closes both holes. Their test files (if any) are deleted alongside.

The BiblePlanDay heading-semantics tightening is a small WCAG 2.2 AA correctness improvement that's been latent. The three section labels — Devotional, Passages, Reflection prompts — render as paragraphs with `text-xs font-medium uppercase tracking-widest text-white/60` styling. Visually they read as eyebrow headings, but semantically they're paragraphs, which means screen readers don't announce the day's structure as a heading hierarchy and keyboard navigation via heading-roles (commonly used by JAWS, NVDA, and VoiceOver users) skips over them entirely. Replacing the elements with `<h2>` while preserving the class string fixes the semantic gap without any visual change. The resulting hierarchy is h1 (day title, gradient) → h2 (Devotional) → h2 (Passages) → h2 (Reflection prompts), with no skips — a clean, screen-reader-friendly structure.

Inline gradient consolidation is a smaller cleanup riding along with the atmospheric migration. PageHero.tsx exports `ATMOSPHERIC_HERO_BG` as a named constant. BibleBrowse imports it. BiblePlanDetail and BiblePlanDay each duplicate the gradient string inline. After the three atmospheric migrations land (Changes 2, 3, 4), the `<BackgroundCanvas>` wrap removes the consumer use case in all three pages — no Bible file should still have an inline duplicate or even an import of `ATMOSPHERIC_HERO_BG` at the end of this spec. The export itself stays in PageHero.tsx for any non-Bible consumers.

`PlanCompletionCelebration` verification (Change 8) is the no-op check. Decision 5 explicitly says "keep diverged from Grow's PlanCompletionOverlay" — the contemplative tone of finishing a Bible reading plan is intentionally quieter than Grow's achievement tone. Per recon, the component (138 LOC) uses `text-3xl font-bold text-white` for its h2 (no Caveat, no `GRADIENT_TEXT_STYLE`), no confetti animation, no sound effect, three quiet actions (Continue, Start another plan, Share your completion), and `useFocusTrap`. CC's job in 8C is to read the file and confirm none of that has drifted; if any drift is found, STOP and report — do not silently align it to Grow's overlay.

After this spec ships, all three Bible plan-related page surfaces are on the canonical `<BackgroundCanvas>` atmospheric layer matching the rest of the Bible cluster, the TodaysPlanCard navigates correctly to BiblePlanDetail rather than Grow's PlanNotFound, BibleStub and the PlanFilter orphans are gone, BiblePlanDay's section labels are semantic h2 elements with the same visual treatment as before, no Bible file holds an inline duplicate of `ATMOSPHERIC_HERO_BG`, and `PlanCompletionCelebration`'s contemplative divergence from Grow's celebration overlay is verified preserved. Spec 8A inherits a fully canvas-migrated, lint-clean Bible cluster on which to apply its reader validation-error-page chrome work.

---

## User Story

As a **logged-out visitor on `/bible/browse`**, I want the page to feel like the rest of the Bible cluster — the same calm atmospheric chrome as `/bible` (BibleLanding) and `/bible/my` (MyBiblePage post-8B) — rather than the inline-hero-gradient-on-flat-background hybrid the page currently uses. I'm coming from BibleLanding's "Browse Books" link and the visual continuity matters; jumping into a different atmospheric treatment breaks the sanctuary feel.

As a **logged-in user with an active Bible reading plan**, I want clicking the Today's Plan card on `/bible` to actually take me to my plan, not to Grow's "Plan Not Found" page. The card has been broken since launch — silently routing Bible plan slugs to Grow's URL pattern. When I click it, I expect BiblePlanDetail, not a 404 surface I have to back out of.

As **either logged-out or logged-in, on a plan detail page (`/bible/plans/:planId`)**, I want the page to feel like the rest of the Bible cluster atmospherically while preserving the per-plan theme tint (the soft `coverGradient` overlay that gives each plan its visual identity — psalms-30-days reads differently than when-anxious differently than john-story-of-jesus). I want the BackgroundCanvas atmosphere visible at the page edges, the coverGradient overlay tinting the hero zone, and the hero h1 with its gradient text fully readable on top of the composed atmosphere. Plan title card chrome should read cleanly. CTAs (Start / Continue / Pause / Restart) and the day list should render exactly as they do today; the day-status decorative tints stay (those are categorical signals, not CTAs).

As **either logged-out or logged-in, on a plan day page (`/bible/plans/:planId/day/:dayNumber`)**, I want the same atmospheric consistency, AND I want the page's structure to be navigable by screen reader. Today, when I'm using NVDA or VoiceOver and I press `H` to jump between headings, the day title (h1) is the only heading on the page — the section labels above the Devotional, Passages, and Reflection prompts cards are paragraphs in disguise. After this spec ships, those labels are real h2 elements — same visual treatment, but my screen reader announces them and lets me jump into the day's structure quickly. This matters most on long days with all three sections (devotional + passages + reflection prompts), where the page can be 2-3 screens of content.

As a **future spec author or `code-quality-reviewer` operator**, I want `BibleStub.tsx` and the `PlanFilter*` orphan pair gone from the codebase. They've been showing up in dead-code sweeps for multiple cycles and they're a mild rediscovery hazard — someone might import them thinking they're current. Per the "no filtering" call on plan browse, they shouldn't be wired in. Deleting them now closes the loop.

As a **`/code-review` or `code-quality-reviewer` operator on a future Bible-cluster spec**, I want there to be exactly one canonical place for the Bible/Daily-Hub-style atmospheric gradient (`PageHero.tsx`'s `ATMOSPHERIC_HERO_BG` export). After 8C, no Bible page holds an inline duplicate of the gradient string and the only remaining consumers (if any) import the canonical export idiomatically. The export stays on disk for any non-Bible consumer that might exist.

---

## Requirements

### Functional Requirements

1. **TodaysPlanCard URL bug fix.** `frontend/src/components/bible/landing/TodaysPlanCard.tsx` line 22 area: change `<Link to={`/reading-plans/${plan.planId}`}>` to `<Link to={`/bible/plans/${plan.planId}`}>`. After the fix, clicking the Today's Plan card on `/bible` with an active Bible reading plan navigates to the corresponding `BiblePlanDetail` page (not Grow's `PlanNotFound`).
2. **No other Grow-URL leaks in Bible code.** A sweep `grep -rn "reading-plans" frontend/src/components/bible` returns zero matches after the TodaysPlanCard fix. Bible-side code never references Grow's URL pattern. If matches exist before the fix, report and resolve them.
3. **BibleBrowse atmospheric migration.** Migrate `frontend/src/pages/BibleBrowse.tsx` from `<Layout>` + inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone to the canonical `<BackgroundCanvas className="flex flex-col font-sans">` wrap. Wrap with `<BibleDrawerProvider>`. Add `<Navbar transparent />` at the top of the canvas, `<main id="main-content" className="relative z-10 flex-1">` for the body region, `<SiteFooter />` at the bottom, and `<BibleDrawer ... />` mount (verify whether the drawer mount belongs at the BibleBrowse level or inside `BibleBooksMode` — recon notes BibleBrowse is "thin shell that delegates to BibleBooksMode", so the drawer may already be mounted there). The `<SEO {...BIBLE_BROWSE_METADATA} />` props, `BibleBooksMode` rendering, "Browse Books" h1 with `GRADIENT_TEXT_STYLE`, and the absence of a subtitle are all preserved exactly. Hero spacing aligned to BibleLanding's `pt-28 pb-12` rhythm if not already there.
4. **BibleBrowse import cleanup.** After the atmospheric migration, remove the `import { ATMOSPHERIC_HERO_BG } from '@/components/ui/PageHero'` line if no other consumer remains in the file.
5. **BiblePlanDetail atmospheric migration.** Migrate `frontend/src/pages/BiblePlanDetail.tsx` from `min-h-screen bg-dashboard-dark` flat + inline `ATMOSPHERIC_HERO_BG` (recon notes line 107 area for the bg-dashboard-dark) to the canonical `<BackgroundCanvas className="flex flex-col font-sans">` wrap. Same wrap structure as BibleBrowse: `<BibleDrawerProvider>` outer, `<Navbar transparent />`, `<SEO ... />`, `<main id="main-content" className="relative z-10 flex-1">`, `<SiteFooter />`, `<BibleDrawer ... />`. The hero coverGradient overlay (20% opacity, varies per plan theme) PRESERVED — it composites on top of `<BackgroundCanvas>` to provide per-plan visual identity. After the migration verify visually: BackgroundCanvas atmosphere visible at the page edges, coverGradient overlay tints the hero zone with the plan's theme color, hero h1 (gradient text) is readable, plan title card chrome reads cleanly against the composed atmosphere.
6. **BiblePlanDetail behavioral preservation.** Plan h1 with `GRADIENT_TEXT_STYLE`, plan description, theme pill, duration, time-per-day, curator, progress bar, full CTA row (Start / Continue / Pause / Restart), reflection card on completed plans, day list (5 visible by default + "Show all N days" toggle with `DayStatusIndicator` components), and auth-modal triggering for start/pause/restart all preserved exactly. The three `bg-primary/N` decorative tints at lines 128, 162, 296 (badge, progress-bar fill, day-status indicator) preserved per Decision 11. `duration-200` drift preserved per Decision 12.
7. **BiblePlanDay atmospheric migration.** Migrate `frontend/src/pages/BiblePlanDay.tsx` using the same pattern as BiblePlanDetail. The hero with day number + plan title + `GRADIENT_TEXT_STYLE` h1, Devotional FrostedCard (when `day.devotional` present), Passage card grid (1 or 2 cols), Reflection prompts FrostedCard (when `day.reflectionPrompts?.length > 0`), bottom day nav (prev/next), Mark day complete sticky CTA (homepage-primary white pill), `PlanCompletionCelebration` trigger logic, and auth-modal triggering for mark-complete all preserved exactly.
8. **BiblePlanDay heading semantics: section labels become `<h2>` elements.** The three section labels — Devotional, Passages, Reflection prompts — currently render as `<p className="text-xs font-medium uppercase tracking-widest text-white/60">{label}</p>`. Replace the `<p>` element with `<h2>` while preserving the class string exactly. (If any of the three currently uses a different class string, preserve THAT class string but change the element.) Apply to all three section labels: Devotional (above the devotional FrostedCard), Passages (above the passage card grid), Reflection prompts (above the reflection prompts FrostedCard).
9. **BiblePlanDay heading hierarchy verification.** After the section-label migration, the heading hierarchy on a day page with all three sections is h1 (day title, gradient) → h2 (Devotional) → h2 (Passages) → h2 (Reflection prompts). No h1 → h3 skips. Tested via `getByRole('heading', { level: 2, name: ... })` on each section label.
10. **Inline `ATMOSPHERIC_HERO_BG` duplication consolidation.** After Changes 2, 3, and 4 land, no Bible file holds an inline duplicate of the gradient string and no Bible file imports `ATMOSPHERIC_HERO_BG` unless it consumes the export idiomatically. The named export in `PageHero.tsx` itself is preserved for any non-Bible consumer that may exist.
11. **BibleStub deletion.** Delete `frontend/src/pages/BibleStub.tsx` and its test file `frontend/src/pages/__tests__/BibleStub.test.tsx`. After deletion, `grep -rn "BibleStub" frontend/src` returns zero matches (excluding the deleted files themselves). If App.tsx:85 carries a "TODO: delete BibleStub"-style comment, remove the comment; if it carries a historical-context comment about WHY BibleStub was removed, preserve it.
12. **PlanFilterBar + PlanFilterPill deletion.** Delete `frontend/src/components/bible/plans/PlanFilterBar.tsx` (67 LOC) and `frontend/src/components/bible/plans/PlanFilterPill.tsx` (22 LOC). Delete their test files if they exist. After deletion, `grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src` returns zero matches.
13. **`usePlanBrowser` filter API preservation (Option A).** The hook's `theme`, `duration`, `setTheme`, `setDuration`, and `clearFilters` return values stay. URL-driven filtering still works — manual test: navigating to `/bible/plans?theme=anxiety` should still filter the plan list. Removing the filter API entirely (Option B) is out of scope for 8C; if it's truly desired in the future, that's a separate cleanup spec.
14. **PlanCompletionCelebration verification (no migration).** Read `frontend/src/components/bible/plans/PlanCompletionCelebration.tsx` (138 LOC) and verify five preservation points: (a) h2 uses `text-3xl font-bold text-white` (NOT Caveat, NOT `GRADIENT_TEXT_STYLE`); (b) NO confetti animation (no `<Confetti>` component, no `confetti-fall` keyframe); (c) NO sound effect (no `useSoundEffects` import, no `playSoundEffect` call); (d) three actions intact — "Continue" homepage-primary white pill (saves reflection on click), "Start another plan" text link to `/bible/plans`, "Share your completion" text button (Canvas image generation via `renderPlanCompletionCard`); (e) `useFocusTrap(true, onClose)` on container. If ANY drift from Decision 5's "keep diverged from Grow's PlanCompletionOverlay" is found, STOP and report — do not silently align it to Grow's overlay.

### Non-Functional Requirements

- **Performance:** No regression. The `<BackgroundCanvas>` migration is chrome-only — no new network requests, no new heavy components. Bundle size impact is negative or zero (deleting BibleStub + PlanFilter* components removes ~125 LOC; the wrapper changes are class-string-level). Lighthouse Performance target on `/bible/browse`, `/bible/plans/:planId`, and `/bible/plans/:planId/day/:dayNumber` is 90+.
- **Accessibility:** WCAG 2.2 AA. The BiblePlanDay heading semantics fix is itself an accessibility improvement — screen readers can now announce and navigate the day's structure via heading roles. Lighthouse Accessibility target 95+ on all three plan pages. `useFocusTrap` on `PlanCompletionCelebration` preserved per Change 8.
- **Test coverage:** All existing tests pass. Updated tests pass. No new test failures (regression baseline: 9,470 pass / 1 pre-existing fail per `CLAUDE.md` Build Health). `pnpm test:typecheck` (or `npm run typecheck`) passes — verifies no broken imports after deletions.

---

## Auth Gating

This spec is **chrome-only** for the existing auth-gated actions on the plan surfaces. No auth-gating posture changes; existing AuthModal trigger sites preserved.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Click Today's Plan card on `/bible` (Change 1: URL bug fix only) | Card may render if active plan exists in `wr_bible_active_plans` localStorage; clicking navigates to `/bible/plans/{slug}` (the Bible-side BiblePlanDetail). No auth modal — Bible reading plans are part of the unauthenticated personal layer just like highlights, notes, bookmarks, memorization. Decision 2 and the BB-0–BB-46 "the unauthenticated experience must be complete" promise apply. | Same — navigates to `/bible/plans/{slug}`. | N/A |
| Browse books on `/bible/browse` (Change 2: atmospheric migration only) | Full access. No auth modal. | Full access. | N/A |
| View a plan detail page on `/bible/plans/:planId` (Change 3: atmospheric migration only) | Full access — read the plan description, theme, duration, day list. No auth modal. | Full access. | N/A |
| Click "Start" on a plan detail page | Auth modal: "Sign in to start a reading plan" (preserved exactly from existing behavior). | Plan starts; progress writes to `wr_bible_active_plans` and `bible:plans` localStorage stores. | "Sign in to start a reading plan" |
| Click "Continue" on a plan detail page | Auth modal: "Sign in to resume this challenge" (preserved exactly from existing behavior — note: the existing copy says "challenge" even though it's a Bible plan; preserved as-is, scope-bounded). | Navigates into the next unstarted day's `/bible/plans/:planId/day/:dayNumber`. | "Sign in to resume this challenge" |
| Click "Pause" or "Restart" on a plan detail page | Auth modal triggered; preserved exactly. | Pause flips plan state in `bible:plans` store. Restart resets plan progress. | (existing copy preserved) |
| View a plan day page on `/bible/plans/:planId/day/:dayNumber` (Change 4: atmospheric migration only) | Full access — read the devotional, passages, reflection prompts. No auth modal. | Full access. | N/A |
| Click "Mark day complete" on a plan day page | Auth modal triggered; preserved exactly. | Day completes in `bible:plans` store. If it was the final day, `PlanCompletionCelebration` fires. | (existing copy preserved) |
| Click "Read this passage" on a plan day passage card | No auth modal — navigates to BibleReader at the verse range. | Same. | N/A |
| Click "Journal about this" on a plan day reflection prompt | No auth modal at click — navigates into Journal with prefilled context. (Auth gating on journal save is out of scope for 8C; lives at the Journal save site.) | Same. | N/A |
| Click "Continue" on `PlanCompletionCelebration` (Change 8: verification only) | Auth modal triggered (saves reflection on click); preserved exactly. | Reflection saves; navigates back to BiblePlanDetail. | (existing copy preserved) |
| Click "Start another plan" or "Share your completion" on `PlanCompletionCelebration` | "Start another plan" navigates to `/bible/plans`. "Share your completion" generates a Canvas image. Neither requires auth at the click site. | Same. | N/A |

The four AuthModal trigger sites for Bible plans (Start / Continue / Pause / Restart on detail, Mark day complete on day, Continue on celebration) are explicitly OUT OF SCOPE for chrome changes — they stay exactly as the master plan defined them. If during execution the migration accidentally drops or rewires an AuthModal trigger, that's a regression, not a feature.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All three pages (`/bible/browse`, `/bible/plans/:planId`, `/bible/plans/:planId/day/:dayNumber`) preserve their current mobile layouts exactly. BibleBrowse: book grid stacks. BiblePlanDetail: single-column hero, single-column CTA stack, day list with 5 visible + "Show all N days" toggle. BiblePlanDay: single-column hero, devotional FrostedCard full-width, passage cards single-column (1-col grid), reflection prompts FrostedCard full-width, Mark day complete sticky to viewport bottom on mobile. The three section labels (Devotional / Passages / Reflection prompts) sit above each section as before — only the element changes from `<p>` to `<h2>`, no visual repositioning. |
| Tablet (640–1024px) | Layouts preserved exactly. BibleBrowse: book grid widens to multi-column. BiblePlanDetail: hero gains breathing room, CTA row may sit horizontally. BiblePlanDay: passage cards may render in a 2-column grid if `day.passages.length > 1`, reflection prompts FrostedCard preserved, Mark day complete CTA may transition from sticky to static. |
| Desktop (> 1024px) | Layouts preserved exactly. Same component arrangement as today; only the page-background atmospheric layer changes from inline gradient / `bg-dashboard-dark` to `<BackgroundCanvas>`. Hero spacing on BibleBrowse aligned to BibleLanding's `pt-28 pb-12` rhythm if not already there; BiblePlanDetail and BiblePlanDay preserved if already aligned, otherwise aligned to the cluster pattern. |

The atmospheric migration is responsive-neutral — `<BackgroundCanvas>` is a fixed atmospheric surface that doesn't change layout. The coverGradient overlay on BiblePlanDetail's hero is similarly responsive-neutral. The heading-semantics change on BiblePlanDay is responsive-neutral — no visual change at any breakpoint.

---

## AI Safety Considerations

N/A — This spec touches atmospheric chrome (page-background gradient migrations), one navigation URL bug, dead-code deletion, and heading semantics. It does not involve AI-generated content, free-text user input handling, crisis detection, or any of the AI-safety surfaces. The plan content (devotionals, reflection prompts, passages) is curated content in `data/bible/plans/*.json` and is not modified by this spec. The `PlanCompletionCelebration` reflection save flow is preserved as-is and is verification-only in 8C — its existing crisis-handling posture (which lives at the Journal save site downstream) is unchanged.

---

## Auth & Persistence

- **Logged-out users:** Read-only access to BibleBrowse, BiblePlanDetail, BiblePlanDay surfaces. Browsing the book grid, reading plan descriptions, viewing day content (devotional + passages + reflection prompts) all work without an account, consistent with BB-0–BB-46's "the unauthenticated experience must be complete" promise. Clicking gated actions (Start / Continue / Pause / Restart on detail, Mark day complete on day) triggers the existing AuthModal with the existing copy. No demo-mode database writes; logged-out users do not write to the backend at all (consistent with `02-security.md`'s Demo Mode Data Policy).
- **Logged-in users:** Plan progress persists. The two relevant localStorage stores are `wr_bible_active_plans` (Decision 15 bridge — defer to separate cleanup spec; preserved as-is in 8C) and `bible:plans` (the canonical reactive store at `lib/bible/plansStore.ts`). The Decision 15 cleanup of the `wr_bible_active_plans` bridge is explicitly OUT OF SCOPE for 8C. No new database tables, no new backend persistence — Bible reading plan progress remains client-side until a future Phase 3 sync spec ships.
- **localStorage usage:** This spec does NOT introduce any new localStorage keys. Existing keys consumed indirectly through preserved code paths: `wr_bible_active_plans` (read by TodaysPlanCard via `useActivePlan` to determine whether to render the card, which `plan.planId` to embed in the URL — Change 1 fixes the URL pattern but does not change how `plan.planId` is sourced); `bible:plans` (Bible plan progress reactive store at `lib/bible/plansStore.ts`, consumed by BiblePlanDetail and BiblePlanDay; preserved as-is); `wr_bible_streak` / `bible:streak` (preserved on BibleLanding and elsewhere; not touched by 8C); `wr_bible_progress` / `wr_chapters_visited` (heatmap and progress map keys, not touched by 8C — those are 8B's domain). All keys are documented in `.claude/rules/11-local-storage-keys.md` and `.claude/rules/11b-local-storage-keys-bible.md`; no new entries needed for 8C.

---

## Completion & Navigation

N/A — This spec is not part of the Daily Hub tabbed experience. The plan-related routes (`/bible/plans/:planId`, `/bible/plans/:planId/day/:dayNumber`) are independent navigation surfaces with their own internal flow (browse → detail → day → next day → completion). 8C does not change that flow. Day-completion → `PlanCompletionCelebration` → "Continue" / "Start another plan" / "Share your completion" all preserved exactly per Change 8 verification.

The single navigation behavior change visible to the user (Change 1 — TodaysPlanCard URL fix) is described under Affected Frontend Routes and Auth Gating: the Today's Plan card on `/bible` now navigates to the right Bible plan detail page rather than landing the user on Grow's PlanNotFound.

---

## Design Notes

- **Atmospheric layer:** `<BackgroundCanvas>` from `@/components/ui/BackgroundCanvas` is the canonical atmospheric layer for outer Bible surfaces (Decision 1, established and applied throughout the cluster: BibleLanding, MyBiblePage post-8B, PlanBrowserPage, and now BibleBrowse + BiblePlanDetail + BiblePlanDay via 8C). The wrap pattern matches BibleLanding's structure exactly. Per `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" and the cluster-recon-2026-05-05 reference, BackgroundCanvas provides a calm, soft, omnidirectional atmospheric glow that reads as "sanctuary background" rather than "Daily Hub chrome".
- **Per-plan coverGradient overlay (BiblePlanDetail):** preserved exactly. The 20% opacity per-plan-theme color overlay sits ON TOP of `<BackgroundCanvas>` in the hero zone, parallel to how Grow Challenge `themeColor` halos preserved on top of canonical atmospheric in Spec 6B. After migration, the composite reads as: BackgroundCanvas atmosphere at page edges + per-plan coverGradient tint in the hero zone + gradient h1 readable on top.
- **FrostedCard primitive (existing usage on plan card components):** `PlanInProgressCard`, `PlanBrowseCard`, `PlanCompletedCard`, `PlanBrowserEmptyState`, the BiblePlanDetail reflection card on completed plans, the BiblePlanDay devotional FrostedCard, and the BiblePlanDay reflection prompts FrostedCard ALL already use the canonical FrostedCard primitive. 8C does NOT migrate any additional card chrome to FrostedCard — those migrations were Spec 8B's scope and already shipped.
- **Subtle Button variant (existing usage on plan-related CTAs):** non-climactic CTAs across the plan surfaces (back navigation, secondary actions) already use `<Button variant="subtle">` per Decision 16's pattern. 8C does NOT migrate any additional CTAs to subtle — those migrations were Spec 8B's scope.
- **White-pill homepage-primary CTA (preserved):** the climactic CTAs on plan surfaces — "Start" / "Continue" on BiblePlanDetail, "Mark day complete" / "Read this passage" / "Journal about this" on BiblePlanDay, "Continue" on PlanCompletionCelebration — all use the canonical white-pill homepage-primary pattern. 8C preserves all of these exactly.
- **GRADIENT_TEXT_STYLE on h1s (preserved):** plan titles on BiblePlanDetail and day titles on BiblePlanDay use the canonical `GRADIENT_TEXT_STYLE` h1 treatment. 8C preserves all of these exactly. BibleBrowse's "Browse Books" h1 also uses `GRADIENT_TEXT_STYLE` and is preserved.
- **Heading hierarchy convention (h2 for section labels):** `<h2>` is the canonical element for section labels in eyebrow-style treatments (per `09-design-system.md`'s heading conventions). The BiblePlanDay change replaces three `<p>` elements with `<h2>` while preserving the class string `text-xs font-medium uppercase tracking-widest text-white/60`. The visual reading is identical; the semantic reading goes from "three paragraph eyebrows" to "three section headings". This is the same h2 treatment used elsewhere in the app for major content sections (per the canonical `<h2>` heading hierarchy referenced in `09-design-system.md`).
- **Decorative `bg-primary/N` tints (preserved per Decision 11):** BiblePlanDetail.tsx:128, 162, 296 hold `bg-primary/N` decorative tints (badge, progress-bar fill, day-status indicator). These are categorical signals, not CTAs. They stay.
- **`duration-200` drift (preserved per Decision 12):** the canonical animation duration on the plan surfaces is `duration-300`, but a few `duration-200` instances exist as documentation drift in `09-design-system.md`. Migrating them is aesthetic churn with no functional improvement and significant test churn. They stay.
- **`PlanCompletionCelebration` chrome (preserved diverged per Decision 5):** the contemplative tone of finishing a Bible reading plan is intentionally quieter than Grow's achievement tone. h2 uses `text-3xl font-bold text-white` (no Caveat, no `GRADIENT_TEXT_STYLE`); no confetti, no sound effect. Three quiet actions (Continue / Start another plan / Share). 8C verifies (Change 8) that none of this has drifted; if any drift is found, STOP and report.
- **Plan-related design system recon reference:** `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" covers the BackgroundCanvas pattern, FrostedCard tier system, white-pill homepage-primary CTA pattern. `_plans/recon/bible-2026-05-05.md` carries the line-level recon for BibleBrowse, BiblePlanDetail, BiblePlanDay, TodaysPlanCard, PlanCompletionCelebration. `_plans/direction/bible-cluster-2026-05-05.md` carries the 19 numbered decisions; Decisions 1, 5, 11, 12, 13, 15, 16, 18 all relate to 8C's scope.

No new visual patterns are introduced by 8C. All values are derivable from existing canonical patterns.

---

## Out of Scope

- **Spec 8A work (Reader validation errors).** The three validation-error pages on the BibleReader (invalid book, invalid chapter, invalid verse range) live in 8A's scope. Not touched by 8C.
- **Spec 8B work (MyBible).** MyBiblePage atmospheric migration, auth-gate removal, device-local-storage banner, FrostedCard primitive adoption on stat cards and MemorizationFlipCard, BookmarkLabelEditor / BibleSettingsModal subtle Button migrations, BB-43/`useBibleProgress`/`useActivityFeed`/`HighlightCard`/`HighlightCardMemorize.test.tsx` reactive-store correctness fixes, BookmarkCard placeholder de-italicization, MemorizationFlipCard `role="button"` → real `<button>` a11y refactor — all 8B's domain, not 8C's.
- **BibleLanding atmospheric layer.** BibleLanding is already on `<BackgroundCanvas>` per the cluster's atmospheric foundation (verification only in 8C, not migrated).
- **PlanBrowserPage atmospheric layer.** PlanBrowserPage already uses `<BackgroundCanvas>` per recon (verification only in 8C, not migrated).
- **BibleReader chrome.** Decision 13 explicitly bounds reader chrome out of scope — `ReaderChrome`, `TypographySheet`, `VerseActionSheet`, all reader sub-views, `AmbientAudioPicker`, `FocusVignette`, `VerseJumpPill`, `VerseBookmarkMarker`, `VerseNoteMarker`, `ActivePlanReaderBanner`, `NotificationPrompt`, `HighlightColorPicker`, BB-26/27/28/29/44 audio cluster, BB-42 search, BB-32 cache, BB-41 push — all stay completely untouched.
- **`PlanCompletionCelebration` alignment with Grow's `PlanCompletionOverlay` (Decision 5).** Explicitly out of scope. The Bible cluster's plan-completion tone is intentionally diverged from Grow's. 8C verifies preservation, not alignment.
- **`bg-primary` decorative tints on plan detail (Decision 11).** Lines 128, 162, 296 stay. Migrating them is aesthetic churn with no functional improvement.
- **`duration-200` drift (Decision 12).** Stays as documentation drift in `09-design-system.md`. Addressing it belongs in a documentation-only update, not a code spec.
- **`wr_bible_active_plans` localStorage bridge cleanup (Decision 15).** Defer to a separate cleanup spec. The bridge is preserved as-is for 8C.
- **`usePlanBrowser` filter API removal (Option B in Change 7d).** Out of scope per the recommendation to preserve URL-driven filtering. If it's truly desired in the future, that's a separate cleanup spec.
- **Plan card primitive consolidation.** The plan card components (`PlanInProgressCard`, `PlanBrowseCard`, `PlanCompletedCard`, `PlanBrowserEmptyState`) already use FrostedCard. No further consolidation in 8C.
- **AuthModal trigger sites.** Existing AuthModal trigger copy and behavior preserved exactly. The "Sign in to start a reading plan" / "Sign in to resume this challenge" / "Sign in to create a personalized reading plan" trigger sites are not modified.
- **Bible plan content / data.** `data/bible/plans/*.json` files are not touched. WEB translation handling (verified clean per recon) preserved.
- **Reactive store work.** Spec 8B handled the BB-43/`useBibleProgress`/`useActivityFeed`/`HighlightCard`/`HighlightCardMemorize` reactive-store correctness fixes. 8C does not introduce or modify any reactive stores.
- **AI panels** (Explain / Reflect / Ask), audio cluster (BB-26/27/28/29/44), full-text search (BB-42), AI cache (BB-32), web push (BB-41). All out of scope for 8C.
- **Forums Wave backend integration.** Out of scope. Bible reading plans remain client-side localStorage until a future sync spec ships.
- **All non-Bible surfaces.** Daily Hub, Dashboard, Local Support, Music, Prayer Wall, Grow surfaces — all unchanged.

---

## Acceptance Criteria

### TodaysPlanCard URL fix (Change 1)

- [ ] `frontend/src/components/bible/landing/TodaysPlanCard.tsx` line 22 area: Link target is `/bible/plans/${plan.planId}` (Bible URL pattern), NOT `/reading-plans/${plan.planId}` (Grow URL pattern).
- [ ] `grep -rn "reading-plans" frontend/src/components/bible` returns zero matches.
- [ ] Test in `landing/__tests__/TodaysPlanCard.test.tsx` (existing or new) asserts the Link's href contains `/bible/plans/` and does NOT contain `/reading-plans/`.
- [ ] Manual eyeball: on `/bible` with an active Bible reading plan in `wr_bible_active_plans`, clicking the Today's Plan card navigates to `/bible/plans/{slug}` (BiblePlanDetail loads), NOT to `/reading-plans/{slug}` (PlanNotFound).

### BibleBrowse atmospheric migration (Change 2)

- [ ] `<BackgroundCanvas className="flex flex-col font-sans">` wraps the page contents.
- [ ] `<BibleDrawerProvider>` is the outer wrapper.
- [ ] `<Navbar transparent />` renders inside the canvas.
- [ ] `<main id="main-content" className="relative z-10 flex-1">` wraps the body region.
- [ ] `<SiteFooter />` renders at the bottom of the canvas.
- [ ] `<BibleDrawer ... />` mount preserved (verify whether at BibleBrowse level or inside `BibleBooksMode`).
- [ ] Inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone removed.
- [ ] `import { ATMOSPHERIC_HERO_BG } from '@/components/ui/PageHero'` removed if no other consumer remains.
- [ ] `<SEO {...BIBLE_BROWSE_METADATA} />` props preserved.
- [ ] `BibleBooksMode` rendering preserved.
- [ ] "Browse Books" h1 with `GRADIENT_TEXT_STYLE` preserved (no subtitle).
- [ ] Hero spacing aligned to BibleLanding's `pt-28 pb-12` rhythm (or equivalent matching the cluster pattern).
- [ ] Skip link from Navbar still functions.

### BiblePlanDetail atmospheric migration (Change 3)

- [ ] `<BackgroundCanvas className="flex flex-col font-sans">` wraps the page.
- [ ] `<BibleDrawerProvider>` is the outer wrapper.
- [ ] `min-h-screen bg-dashboard-dark` removed from the page wrapper.
- [ ] Inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone removed.
- [ ] No inline duplicate of the `ATMOSPHERIC_HERO_BG` gradient string remains in the file.
- [ ] Per-plan `coverGradient` overlay (20% opacity) PRESERVED on the hero, compositing on top of `<BackgroundCanvas>`.
- [ ] After migration: BackgroundCanvas atmosphere visible at page edges, coverGradient tint visible in hero zone, hero h1 (gradient text) readable, plan title card chrome reads cleanly against composed atmosphere.
- [ ] Plan h1 with `GRADIENT_TEXT_STYLE` preserved.
- [ ] Plan description, theme pill, duration, time-per-day, curator, progress bar all preserved.
- [ ] Full CTA row (Start / Continue / Pause / Restart) preserved.
- [ ] Reflection card (completed plans) preserved as FrostedCard.
- [ ] Day list (5 visible by default + "Show all N days" toggle) preserved.
- [ ] `DayStatusIndicator` components preserved (decorative tints stay per Decision 11).
- [ ] AuthModal triggering for start/pause/restart preserved with existing copy.

### BiblePlanDay atmospheric migration + heading semantics (Change 4)

- [ ] `<BackgroundCanvas className="flex flex-col font-sans">` wraps the page.
- [ ] `<BibleDrawerProvider>` is the outer wrapper.
- [ ] `min-h-screen bg-dashboard-dark` removed from the page wrapper.
- [ ] Inline `style={{ background: ATMOSPHERIC_HERO_BG }}` on the hero zone removed.
- [ ] No inline duplicate of the `ATMOSPHERIC_HERO_BG` gradient string remains in the file.
- [ ] Hero with day number + plan title + `GRADIENT_TEXT_STYLE` h1 preserved.
- [ ] Devotional section label is `<h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Devotional</h2>` (or `<h2>` with the file's actual current class string preserved exactly).
- [ ] Passages section label is `<h2>` with the same class-string preservation rule.
- [ ] Reflection prompts section label is `<h2>` with the same class-string preservation rule.
- [ ] Heading hierarchy on a day with all three sections: h1 (day title) → h2 (Devotional) → h2 (Passages) → h2 (Reflection prompts). No h1 → h3 skips.
- [ ] Tested with `getByRole('heading', { level: 2, name: /devotional/i })`, `getByRole('heading', { level: 2, name: /passages/i })`, `getByRole('heading', { level: 2, name: /reflection/i })` — all three resolve.
- [ ] Devotional FrostedCard preserved (when `day.devotional` is present).
- [ ] Passage card grid (1 or 2 cols) + "Read this passage" CTAs preserved.
- [ ] Reflection prompts FrostedCard + "Journal about this" CTAs preserved.
- [ ] Bottom day nav (prev/next) preserved.
- [ ] Mark day complete sticky CTA preserved (homepage-primary white pill).
- [ ] `PlanCompletionCelebration` trigger logic preserved.
- [ ] AuthModal triggering for mark-complete preserved with existing copy.

### Inline gradient duplication consolidation (Change 5)

- [ ] No file under `frontend/src/pages/Bible*.tsx` or `frontend/src/components/bible/**` holds an inline duplicate of the `ATMOSPHERIC_HERO_BG` gradient string.
- [ ] No Bible file imports `ATMOSPHERIC_HERO_BG` post-migration unless it consumes the export idiomatically.
- [ ] `ATMOSPHERIC_HERO_BG` remains exported from `frontend/src/components/ui/PageHero.tsx` for any non-Bible consumer.

### Dead code deletion (Changes 6 + 7)

- [ ] `frontend/src/pages/BibleStub.tsx` deleted.
- [ ] `frontend/src/pages/__tests__/BibleStub.test.tsx` deleted.
- [ ] `frontend/src/components/bible/plans/PlanFilterBar.tsx` deleted.
- [ ] `frontend/src/components/bible/plans/PlanFilterPill.tsx` deleted.
- [ ] `frontend/src/components/bible/plans/__tests__/PlanFilterBar.test.tsx` deleted (if it existed).
- [ ] `frontend/src/components/bible/plans/__tests__/PlanFilterPill.test.tsx` deleted (if it existed).
- [ ] `grep -rn "BibleStub" frontend/src` returns zero matches (excluding the deleted files).
- [ ] `grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src` returns zero matches (excluding the deleted files).
- [ ] App.tsx historical comment about BibleStub at line 85 area: cleaned up if it was a TODO-style comment; preserved if it was a historical-context comment.
- [ ] `npm run typecheck` (or `pnpm test:typecheck`) passes — confirms no lingering imports of any deleted file.

### Filter API preservation (Change 7d)

- [ ] `usePlanBrowser` hook continues to expose `theme`, `duration`, `setTheme`, `setDuration`, `clearFilters` in its return.
- [ ] URL-driven filtering still works: navigating manually to `/bible/plans?theme=anxiety` filters the plan list to the anxiety theme. Same for `?duration=7-days` and similar permutations.
- [ ] PlanBrowserPage renders correctly without the filter UI (no orphan layout slots, no "where the filter bar should be" gap).

### PlanCompletionCelebration verification (Change 8)

- [ ] No code changes to `frontend/src/components/bible/plans/PlanCompletionCelebration.tsx`.
- [ ] h2 still uses `text-3xl font-bold text-white` (no Caveat, no `GRADIENT_TEXT_STYLE`).
- [ ] No `<Confetti>` component or `confetti-fall` keyframe present.
- [ ] No `useSoundEffects` import or `playSoundEffect` call present.
- [ ] Three actions intact: "Continue" homepage-primary white pill (saves reflection), "Start another plan" text link to `/bible/plans`, "Share your completion" text button (Canvas image generation via `renderPlanCompletionCard`).
- [ ] `useFocusTrap(true, onClose)` on container.
- [ ] If ANY drift from Decision 5's "keep diverged from Grow's PlanCompletionOverlay" was found during execution, the report MUST be raised before any code changes ship — DO NOT silently align it to Grow's overlay.

### Tests

- [ ] All existing tests pass; updated tests pass; no new failures.
- [ ] `pnpm test` regression baseline preserved (9,470 pass / 1 pre-existing fail per CLAUDE.md, with possible second flaky test in `useNotifications` per CLAUDE.md Build Health).
- [ ] `pages/__tests__/BibleBrowse.test.tsx` atmospheric assertions updated: removes `style={{ background: ATMOSPHERIC_HERO_BG }}` assertion, adds `<BackgroundCanvas>` outer-wrapper assertion (via test ID, distinguishing class, or DOM structure check), removes any orphan `ATMOSPHERIC_HERO_BG` import.
- [ ] `pages/__tests__/BiblePlanDetail.test.tsx` atmospheric assertions updated: removes `bg-dashboard-dark` assertion, removes inline gradient style assertion, adds `<BackgroundCanvas>` wrapper assertion, preserves coverGradient overlay assertion (still applied to hero), preserves all behavioral tests (start/pause/restart, day list rendering, completion state, AuthModal triggering).
- [ ] `pages/__tests__/BiblePlanDay.test.tsx` updated: atmospheric assertions same pattern as BiblePlanDetail, PLUS three heading-semantic assertions via `getByRole('heading', { level: 2, name: /devotional/i })` etc., preserves all behavioral tests (mark complete, day nav, journal CTA routing, reflection prompts list rendering).
- [ ] `landing/__tests__/TodaysPlanCard.test.tsx` (existing or new) asserts the Link's href contains `/bible/plans/` and does NOT contain `/reading-plans/`.
- [ ] `BibleStub.test.tsx` deleted (no orphan test).
- [ ] `PlanFilterBar.test.tsx` and `PlanFilterPill.test.tsx` deleted if they existed (no orphan tests).
- [ ] `pages/bible/__tests__/PlanBrowserPage.test.tsx` still passes — likely no changes needed since the deleted components were never imported by PlanBrowserPage. If a test referenced `PlanFilterBar` or `PlanFilterPill` directly, that reference is removed.
- [ ] `npm run typecheck` (or `pnpm test:typecheck`) passes.

### Manual eyeball checks

- [ ] `/bible/browse`: BackgroundCanvas atmosphere visible at page edges; "Browse Books" h1 with gradient text renders; book grid renders cleanly; no flat `bg-dashboard-dark` background visible; no broken Layout.
- [ ] `/bible/plans/:planId` (try at least three plan slugs covering different themes — psalms-30-days, john-story-of-jesus, when-anxious): BackgroundCanvas atmosphere visible at page edges; per-plan coverGradient overlay tints the hero zone with the plan's theme color; hero h1 (gradient text) readable on top of composed atmosphere; CTAs render; day list renders; AuthModal fires on Start/Continue/Pause/Restart for logged-out user.
- [ ] `/bible/plans/:planId/day/:dayNumber` (try a day with all three sections — devotional + passages + reflection prompts): BackgroundCanvas atmosphere visible; section labels render as semantic h2 headings (verify with browser devtools "Accessibility" panel — the three labels should be announced as headings, level 2); Mark day complete CTA sticky on mobile, static on desktop; "Read this passage" and "Journal about this" CTAs render and route correctly.
- [ ] `/bible` (BibleLanding): TodaysPlanCard renders when an active Bible plan is in `wr_bible_active_plans`; clicking it lands on `/bible/plans/{slug}` (BiblePlanDetail) NOT `/reading-plans/{slug}` (Grow's PlanNotFound).
- [ ] `/bible/plans` (PlanBrowserPage): renders without filter UI; no broken layout where the filter bar used to sit; URL-driven filtering still works — manually typing `/bible/plans?theme=anxiety` filters the plan list.
- [ ] `PlanCompletionCelebration` overlay (trigger by completing a plan, or via test): h2 reads as `text-3xl font-bold text-white` (no Caveat / gradient); no confetti, no sound; three actions present (Continue / Start another plan / Share); useFocusTrap holds focus.

### Regression checks

- [ ] `/bible` (BibleLanding) unchanged from 8B's wrap-up state — atmospheric layer preserved, TodaysPlanCard renders correctly.
- [ ] `/bible/my` (MyBiblePage) unchanged from 8B's wrap-up state — atmospheric, FrostedCard adoption, banner, reactive-store correctness all preserved.
- [ ] `/bible/:book/:chapter` (BibleReader) unchanged — Decision 13's reader chrome scope bound holds; only 8B's two-line chapter-mount effect changes (recordChapterVisit + markChapterRead refactor) are visible, no 8C-related changes.
- [ ] All non-Bible surfaces unchanged (Daily Hub, Dashboard, Local Support, Music, Prayer Wall, Grow).
- [ ] WEB translation preserved across all Bible plan content (no translation drift in plans data).
- [ ] Backend baseline preserved (~720 pass / 0 fail per CLAUDE.md Build Health) — 8C is frontend-only, so backend test count should not move.
