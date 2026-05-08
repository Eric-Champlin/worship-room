# Spec 6B: Grow Detail Pages + Day Content

**Master Plan Reference:** Direction document at `_plans/direction/grow-2026-05-04.md` is the locked decision set (15 numbered decisions, with one refinement noted in this spec). Recon at `_plans/recon/grow-detail-pages-2026-05-04.md` is the source of truth for the current state of the detail-page surfaces. This is the second of three Grow sub-specs. Spec 6A (Grow shell + Plans tab + Challenge cards) shipped first and established the BackgroundCanvas atmospheric layer, FrostedCard primitive consumption, button hierarchy patches, and class-string token migrations across `/grow`. Spec 6C will cover CreatePlanFlow plus all four celebration overlays (PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration). Each sub-spec is independently shippable; failures in one do not block the others. The split mirrors Dashboard 4A/4B/4C.

This spec lands the atmospheric foundation, hero alignment, action-callout chrome migration, and not-found recovery-link migration on `/reading-plans/:planId`, `/challenges/:challengeId`, and the day-content components. Patterns this spec USES are all already shipped (FrostedCard `default` + `subdued`, multi-bloom `BackgroundCanvas`, Button `subtle`, `ATMOSPHERIC_HERO_BG`, `GRADIENT_TEXT_STYLE`, theme-color overlay logic). Patterns this spec MODIFIES: Direction doc Decision 6 — see "Refinement to direction doc" below. Patterns this spec INTRODUCES: none.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The untracked recon doc at `_plans/recon/grow-detail-pages-2026-05-04.md` is intentional input context for this spec and should remain untracked until the user commits at their discretion.

---

## Affected Frontend Routes

- `/reading-plans/:planId` — primary surface; receives BackgroundCanvas wrap, hero h1 Caveat removal, hero subtitle migration, DayContent action-callout chrome migration
- `/challenges/:challengeId` — primary surface; receives BackgroundCanvas wrap, hero subtitle migration, inline completion banner removal, ChallengeDayContent action-callout chrome migration
- `/reading-plans/<invalid-id>` — PlanNotFound recovery surface; receives BackgroundCanvas wrap and link-to-subtle-Button migration
- `/challenges/<invalid-id>` — ChallengeNotFound recovery surface; receives BackgroundCanvas wrap and link-to-subtle-Button migration
- `/reading-plans` — legacy redirect to `/grow?tab=plans`; verify redirect still fires post-migration
- `/challenges` — legacy redirect to `/grow?tab=challenges`; verify redirect still fires post-migration
- `/grow` — regression surface (Spec 6A — verify nothing drifts after detail-page migrations land)
- `/grow?tab=plans`, `/grow?tab=challenges` — regression surface (Spec 6A — verify shell unchanged)
- `/` — regression surface (Dashboard — verify atmospheric continuity reads correctly)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surface
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — regression surface (Spec 5)

---

## Refinement to direction doc

**Direction doc Decision 6 refinement:** PlanNotFound + ChallengeNotFound recovery links migrate from `font-script text-2xl text-primary` to `<Button variant="subtle">`, NOT plain underlined `text-base text-white/80` link.

Rationale: on not-found pages where the link IS the recovery action, plain underlined `text-white/80` shrinks the visible affordance to near-invisibility against an otherwise-empty page. A subtle Button preserves Decision 6's deprecation goal (no Caveat, no `text-primary`, use system color tokens) while giving the recovery action appropriate visual weight on a page whose entire purpose is "you took a wrong turn — here is how to get back."

This is a deliberate refinement, not silent drift. The direction doc remains authoritative on intent; this spec implements that intent with a more contextually appropriate component choice. Recorded here so future readers (and the inevitable cross-spec audit) have the trail.

---

## Overview

The Grow detail pages are where users land after picking a reading plan or joining a seasonal challenge. They are the engagement surfaces — `/reading-plans/:planId` is where a user reads the day's passage, completes the action step, and watches their progress accumulate; `/challenges/:challengeId` is where the seasonal-palette brand expression lives most strongly (Lent purple, Easter gold, Pentecost red, Advent deep blue) because that color tells the user which season they are in. Spec 6A migrated the listing surfaces. This spec migrates the detail surfaces those listing cards link to.

The current detail-page treatment predates the Round 3 system in three specific ways. First, neither detail page has `BackgroundCanvas` below the hero, so the atmospheric continuity that Dashboard, BibleLanding, Local Support, and `/grow` now share breaks the moment a user clicks into a plan or challenge — the page goes from glowing-bloom-dark-cinema to flat-dark-card-list. Second, both hero subtitles use the deprecated `font-serif italic text-white/60` body-italic pattern that Round 3 retired (Decision 3); ReadingPlanDetail compounds this with a hero h1 that splits its title into a uniform-gradient prefix and a Caveat-script-tail span (`<span className="font-script">{titleLastWord}</span>`), which creates the only remaining surface-level h1 in the app where a Caveat-script word is welded onto a non-Caveat heading — a deprecated pattern Decision 4 explicitly retired. Third, the action-callout panels in DayContent and ChallengeDayContent — the small "Today's Action Step" / "Today's Action" panels just above the day navigation — are rolls-own `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm` chrome instead of consuming the FrostedCard primitive. Per Decision 7's mapping table these are the canonical FrostedCard `subdued` use case (quieter than the default plan/challenge card chrome above them — they are sub-content within the page, not top-level cards).

ChallengeDetail also carries one stale state-machine artifact: an inline `justCompletedFinalDay` success banner (lines 472-484) that flashes briefly behind `ChallengeCompletionOverlay` and is functionally invisible because the overlay always renders synchronously with the banner's flag flipping. Per the recon's Q1 ruling, this banner is redundant and gets deleted in the same change set as the chrome migration — but only after CC verifies the state machine at lines 138-171 confirms `setJustCompletedFinalDay(true)` and `setCompletionOverlay({ ... })` always fire together with no flow where the banner is the only celebration surface. Likely outcome: clean delete. If CC finds a flow where the banner is load-bearing, STOP and flag.

Two not-found surfaces (PlanNotFound, ChallengeNotFound) are simpler: each renders a heading, a description, and a recovery link back to the corresponding listing tab. Today both use `font-script text-2xl text-primary` — Caveat script in primary color — for the recovery link. Decision 6 retired Caveat from non-emotional-peak surfaces. Per the refinement above, the recovery action becomes a `<Button variant="subtle">`, and the page gets the same `BackgroundCanvas` wrap as the rest of the cluster so a user who lands on `/reading-plans/totally-bogus-id` still feels like they are inside the same room as the rest of the app.

DaySelector and ChallengeDaySelector are explicitly out of migration scope — both are fully canonical per recon (ARIA listbox semantics, full keyboard navigation including Home/End/ArrowKeys/Enter/Space/Escape, focus restoration on dismiss, animation tokens, day-state visual treatments with `text-success` check icons and `text-white/30` lock icons, `min-h-[44px]` touch target on the trigger, `transition-transform motion-reduce:transition-none` on the chevron). The verification step in this spec confirms canonical state still holds; no class-string changes happen on either component.

This spec is visual + class-string + state-machine-cleanup + test. No data fetching changes, no hook changes (`useReadingPlanProgress`, `useChallengeProgress`, `useChallengeAutoDetect`, the IntersectionObserver wiring on DayContent's action step, `useFaithPoints.recordActivity`, `playSoundEffect` on Mark Complete, the seasonal `themeColor` computation feeding `heroStyle` and the Mark Complete / Join Challenge / ActionIcon / progress bar inline styles) are out of scope. Behavioral preservation is non-negotiable: every existing test that asserts on behavior (click handlers, navigation logic, the IntersectionObserver sentinel keying off action-step DOM geometry, the activity-engine `recordActivity` calls firing, the sound effect on ChallengeDetail Mark Complete, ChallengeCompletionOverlay's portal rendering as a sibling to BackgroundCanvas not a child of it, the theme-color computation, ARIA wiring on both day selectors) must continue to pass without modification.

After this spec ships, ReadingPlanDetail + ChallengeDetail + DayContent + ChallengeDayContent + PlanNotFound + ChallengeNotFound match the Round 3 system. CreatePlanFlow + four celebration overlays (Spec 6C) remain. After all three Grow sub-specs ship, the Round 3 visual migration covers Homepage → DailyHub → BibleLanding/plans → Dashboard → Local Support → Grow — the full top-level user-facing surface.

---

## User Story

As a **logged-out visitor or logged-in user clicking into a reading plan or seasonal challenge from `/grow`**, I want the detail page to feel like the same calm, atmospheric room I just left — gentle blooms gently visible behind the day content, the hero subtitle reading as plain prose rather than the deprecated body-italic, the plan title rendering as a uniform gradient heading without a Caveat-script tail welded to its last word, and the small "Today's Action" callout panel above the day navigation wearing the same FrostedCard subdued chrome as comparable sub-content elsewhere in the app — so that the visual register doesn't break the emotional thread when I'm reading today's passage and clicking the action step. When I'm on the challenge detail page and finish the final day, I should see the celebration overlay (the actual designed peak moment), not a duplicate inline banner flashing under it. When I mistype a URL and land on `/reading-plans/totally-bogus-id` or `/challenges/totally-bogus-id`, I should see the same atmospheric room with a clearly-affordanced subtle Button telling me how to get back to browsing — not a Caveat-script primary-color link that reads as a decorative flourish on an otherwise-empty page. The Mark Complete button on the challenge detail page must still wear its full seasonal palette (Decision 8 — that color is part of how I know which season I'm in), the ActionIcon next to "Today's Action" must still render in `style={{ color: themeColor }}`, the "Go to {actionLabel} →" link must still render in theme color (Decision 11), and clicking Mark Complete must still fire the sound effect, the activity-engine record, and the ChallengeCompletionOverlay portal at the right moment.

---

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. **Verify Spec 6A is merged into the working branch.** Specifically: `BackgroundCanvas` wraps below-hero content on `/grow`; PlanCard / UpcomingChallengeCard / ActiveChallengeCard / NextChallengeCountdown / PastChallengeCard / HallOfFame all consume `FrostedCard`; the Tonal Icon Pattern is applied on the Plans + Challenges tab icons; the dead `FilterBar.tsx` is deleted; the `bg-primary` solid ConfirmDialog "Pause & Start New" affordance has migrated to `<Button variant="subtle">`. The earlier verification report confirmed this — re-confirm at execution start.
2. **Verify the direction doc** at `_plans/direction/grow-2026-05-04.md` is present and the locked decisions referenced throughout this spec match — particularly Decision 2 (BackgroundCanvas added to all Grow surfaces), Decision 3 (hero subtitle italic → plain prose), Decision 4 (Caveat retired from non-emotional-peak h1s), Decision 6 (PlanNotFound / ChallengeNotFound link deprecation — see refinement above for the contextual override), Decision 7 (rolls-own FrostedCard chrome → FrostedCard primitive table; this spec lands the `subdued` mappings for action callouts), Decision 8 (theme-color CTAs preserved as inline-styled rolls-own), Decision 11 (theme-color "Go to {actionLabel} →" link preserved).
3. **Verify the recon** at `_plans/recon/grow-detail-pages-2026-05-04.md` is present.
4. **Capture a test baseline before any change.** Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. The current baseline per CLAUDE.md is **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`), with an occasional flake of `useNotifications — returns notifications sorted newest first` bringing the baseline to **9,469 pass / 2 fail across 2 files**. Any post-Spec-6A delta should be reconciled against the live count at execution start; the live number is authoritative. Any NEW failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. **Read each of the 8 implementation files in scope plus the relevant test files** to confirm current import sets (lucide-react icons, `BackgroundCanvas`, `FrostedCard`, `Button`, `ATMOSPHERIC_HERO_BG`, `GRADIENT_TEXT_STYLE`, `Layout`, `Navbar`, `SiteFooter` locations), current chrome tokens, current conditional rendering branches, current ARIA wiring on both day selectors, the IntersectionObserver wiring on DayContent's action step, the seasonal `themeColor` computation in ChallengeDetail (lines 222-225 `heroStyle` composition), the inline-banner state machine in ChallengeDetail at lines 138-171 (`handleMarkComplete`).
6. **Verify the inline completion banner is genuinely redundant before deletion (Change 6).** Read `ChallengeDetail.tsx` lines 138-171 (`handleMarkComplete`) and confirm:
   - `setJustCompletedFinalDay(true)` and `setCompletionOverlay({ ... })` always fire together
   - The overlay always renders BEFORE the user can dismiss it
   - There is NO flow where `justCompletedFinalDay = true` but `completionOverlay = null`
   If the state machine confirms redundancy, delete the inline banner. If CC finds a flow where the banner serves a real purpose (overlay opt-out, persistent celebration after dismissal, anything), STOP and flag — discuss before deciding. Likely outcome: clean delete.
7. **Verify the FrostedCard primitive's prop API for the action-callout migrations (Changes 7 + 8).** Both DayContent and ChallengeDayContent currently use `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` as the inner panel. Migration uses `<FrostedCard variant="subdued">`. FrostedCard's default `subdued` padding is `p-5`, which is between the original `p-4` mobile and `p-6` desktop. Direction doc accepts the slight tightening as a side effect of consuming the primitive. If the visual reads too tight in execution, override with `className="p-4 sm:p-6"` on the FrostedCard. Document the chosen padding in the execution log.
8. **Verify the Button primitive's `asChild` prop for the link-to-subtle-Button migrations (Changes 9b + 10b).** Spec 6A's UpcomingChallengeCard "View Details" Button uses `asChild` successfully — re-verify the prop still exists and behaves correctly. Path A (preferred): `<Button variant="subtle" size="md" asChild><Link to="/grow?tab=plans">Browse Reading Plans</Link></Button>`. Path B (fallback if `asChild` is unavailable): apply subtle-variant class strings to the `<Link>` directly, same pattern as Local Support Spec 5's Get Directions migration. Document the chosen path.
9. **Verify the IntersectionObserver wiring on DayContent's action step survives the chrome migration (Change 7).** The observer keys off DOM geometry — specifically, the outer `<section ref={ref}>` element. Migration moves the inner `<div>`'s chrome to `<FrostedCard variant="subdued">` while leaving the outer `<section ref={ref}>` untouched. Wrapping the inner content in FrostedCard does not change the outer section's geometry; the observer should continue to fire correctly. Verify visually at execution time that the action-step sentinel still triggers whatever it was triggering before (per recon, this is the visited-section flag for activity tracking).
10. **Verify the `bg-dashboard-dark` outer wrapper stays on ReadingPlanDetail (Change 1).** Same pattern as `/grow` from Spec 6A: `min-h-screen bg-dashboard-dark` outer wrapper stays as the dark base color foundation; `BackgroundCanvas` provides the atmospheric layer on top. The two are complementary, not competing.
11. **Verify the `Layout transparentNav` shape on ChallengeDetail (Change 4).** ChallengeDetail uses `<Layout transparentNav>` instead of an explicit `<div className="min-h-screen bg-dashboard-dark">` outer wrapper, relying on the Layout's default + the `#08051A` baseline. Place the `BackgroundCanvas` wrapper INSIDE `<Layout transparentNav>` but immediately after the hero `<section>`. The `ChallengeCompletionOverlay` portal stays as a sibling to (not a child of) the BackgroundCanvas — same shape as `PlanCompletionOverlay` on ReadingPlanDetail.
12. **Verify the existing tests' class-string assertions** before changing any class strings:
    - `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` line ~220-225 has a `'has all-dark background'` test that queries `document.querySelector('.bg-hero-dark')`. The test passes today by accident (looking for a class somewhere in the tree). After the BackgroundCanvas wrap, `bg-dashboard-dark` is preserved on the outer wrapper so the test should still pass. CC verifies the assertion still resolves correctly. If it breaks, update to query `.bg-dashboard-dark` explicitly OR replace with a more semantic assertion (querying the outer div by structure).
    - `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — verify whether any test currently asserts on the inline completion banner (lines 472-484). If yes, the test gets removed in the same change set as the banner deletion. If no, no test change needed.
    - `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` — per recon, no chrome assertions exist; verify and update if any do.
    - `frontend/src/components/challenges/__tests__/accessibility.test.tsx` line ~259 queries `container.querySelector('button')` to find the Mark Complete button. FrostedCard subdued is non-interactive (no onClick), so button count stays at 1; the assertion should pass unchanged. CC verifies.

#### Pattern application (locked at planning time)

**Pattern: Atmospheric layer below hero (Decision 2 application).** Both detail pages and both not-found surfaces wrap below-hero content in `BackgroundCanvas`. Hero stays OUTSIDE the wrapper so `ATMOSPHERIC_HERO_BG` (and on ChallengeDetail, the `themeColor` halo composition at lines 222-225) remains the hero's atmospheric layer; `BackgroundCanvas` provides the gentle bloom continuity behind the day content, day selector, and below-hero scaffolding. Same pattern Spec 6A applied on `/grow`.

**Pattern: Hero subtitle migration (Decision 3 application).** Both detail page hero subtitles migrate from `font-serif italic text-white/60 sm:text-lg` to `text-white/70 leading-relaxed sm:text-lg`. Drops `font-serif italic`, lifts opacity from `/60` to `/70`, adds `leading-relaxed`. Same migration pattern Spec 6A applied to `/grow`'s hero subtitle.

**Pattern: Caveat removal from non-emotional-peak h1 (Decision 4 application).** ReadingPlanDetail's hero h1 currently splits its title into `{titlePrefix} <span className="font-script">{titleLastWord}</span>`. Migration uses `{plan.title}` rendered uniformly with `GRADIENT_TEXT_STYLE`. The `titleWords.split(' ')` derivation logic at lines 160-162 plus the `titlePrefix` and `titleLastWord` locals are removed (cleanup pass). ChallengeDetail's h1 is already correct — direction doc overstated scope; verified during recon and excluded.

**Pattern: Action-callout chrome → FrostedCard subdued (Decision 7 application).** Both day-content components have a small "Today's Action Step" / "Today's Action" panel just above the day navigation. Currently rolls-own `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6`. Migration replaces the inner `<div>` with `<FrostedCard variant="subdued">` while preserving:
   - The outer `<section>` element (and on DayContent, its `ref={ref}` for IntersectionObserver)
   - The `border-t border-white/10` section divider on the outer section
   - The `text-xs font-medium uppercase tracking-widest text-white/60` eyebrow heading
   - All children inside the panel (action-step copy in DayContent; ActionIcon + label + Mark Complete button + Go to action link + ChallengeShareButton in ChallengeDayContent)
   - All theme-color inline styles in ChallengeDayContent (ActionIcon `style={{ color: themeColor }}` line 86; Mark Complete button `style={{ backgroundColor: themeColor }}` line 100; "Go to {actionLabel} →" link `style={{ color: themeColor }}` line 126)
   The `subdued` variant is correct because the action callout is sub-content within the page, not a top-level card. The plan/challenge card chrome above it (FrostedCard `default`, migrated in Spec 6A) is louder by design — the action callout reads quieter.

**Pattern: Recovery-link migration (Decision 6 + refinement).** PlanNotFound + ChallengeNotFound recovery links migrate from `font-script text-2xl text-primary transition-colors hover:text-primary-lt` to `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link to="...">`. Drops Caveat font, drops `text-primary` color, gains visible Button affordance. Same `asChild` pattern Spec 6A used on UpcomingChallengeCard "View Details."

**Pattern: BackgroundCanvas on not-found surfaces.** Both not-found pages currently use `<div className="min-h-screen bg-dashboard-dark"><Navbar transparent /><div className="flex min-h-[60vh] items-center justify-center">...</div><SiteFooter /></div>`. Migration wraps the centered content `<div>` in `<BackgroundCanvas>` so a user who mistypes a URL still feels inside the same room.

**Pattern: Inline completion banner deletion (state-machine cleanup, ChallengeDetail-only).** After verifying the state machine at lines 138-171, delete the inline `{justCompletedFinalDay && (...)}` banner block at lines 472-484. ChallengeCompletionOverlay (Spec 6C surface) remains the sole completion celebration. No replacement banner is added.

**Pattern: DaySelector + ChallengeDaySelector verification only (no migration).** Per recon both are canonical. CC reads each component and confirms:
   - `aria-haspopup="listbox"`, `aria-expanded`, `role="option"`, `aria-selected`, `aria-disabled` all present
   - Home/End/ArrowDown/ArrowUp/Enter/Space/Escape keyboard handler intact
   - `min-h-[44px]` touch target on the trigger
   - `transition-transform motion-reduce:transition-none` on the chevron
   - Completion check icon `text-success`, lock icon `text-white/30`
   - Focus restoration on dismiss
   If any drift is found (unlikely per recon), CC flags it and we discuss before changing anything.

#### Preservation requirements (non-negotiable)

**A. Behavioral preservation.** Every existing test that asserts on behavior must continue to pass without modification. This explicitly includes:
   - `useReadingPlanProgress`, `useChallengeProgress`, `useChallengeAutoDetect` hook wiring
   - `useFaithPoints.recordActivity` calls fire on Mark Complete (ChallengeDetail) and on day completion (ReadingPlanDetail)
   - `playSoundEffect` fires on ChallengeDetail Mark Complete (preserving the existing detail-page asymmetry — sound on ChallengeDetail, no sound on ReadingPlanDetail. Recon Q8 logs this asymmetry as a future product decision; this spec does not harmonize.)
   - The IntersectionObserver wiring on DayContent's action step continues to fire (verified by visual smoke test that the action-step sentinel still triggers its visited-section side effect)
   - ChallengeCompletionOverlay portal-render sibling positioning (outside BackgroundCanvas, sibling not child)
   - PlanCompletionOverlay portal-render sibling positioning (outside BackgroundCanvas, sibling not child) at ReadingPlanDetail line 318
   - ARIA wiring on both day selectors
   - ARIA wiring on ChallengeDayContent's progress bar (`role="progressbar"` + accessible labels)

**B. Theme-color preservation (Decision 8 + Decision 11).** Every theme-color inline style stays as-is:
   - ChallengeDetail `heroStyle` composition (themeColor halo + ATMOSPHERIC_HERO_BG) at lines 222-225 — preserved exactly
   - ChallengeDetail Mark Complete button `style={{ backgroundColor: themeColor }}` — preserved exactly
   - ChallengeDetail Join Challenge button `style={{ backgroundColor: themeColor }}` — preserved exactly
   - ChallengeDayContent ActionIcon `style={{ color: themeColor }}` — preserved exactly
   - ChallengeDayContent Mark Complete button `style={{ backgroundColor: themeColor }}` — preserved exactly
   - ChallengeDayContent "Go to {actionLabel} →" link `style={{ color: themeColor }}` — preserved exactly
   - ChallengeDayContent progress bar fill — preserved exactly
   - `getContrastSafeColor()` accessibility helper — preserved (no migration touches the helper)

**C. Italic preservation.** Italic stays on:
   - DayContent passage scripture (Decision 4 — scripture voice preserved)
   - DayContent closing prayer (recon Q2 ruling — italic exception extends to prayer voice)
   - ChallengeDayContent scripture (Decision 4 — same scripture-voice rule)
   No new italic is introduced. The hero subtitle migrations REMOVE italic (Decision 3). The action-callout migrations leave the inner content unchanged (just swap chrome).

**D. Section divider preservation.** Both day-content components use `border-t border-white/10` as the section divider on the outer `<section>` above the action callout. This stays. Section divider migration is out of scope per Decision 7's mapping (the mapping table covers chrome, not sub-element separators).

**E. Activity engine + sound effects + crisis detection.** No change in behavior. `recordActivity` calls still fire at the same points. `playSoundEffect` still fires on ChallengeDetail Mark Complete. No user free-text input is added or removed; crisis detection scope is unchanged.

#### Change-by-change scope

(See "Files to modify" + the brief's enumerated Changes 1-11. The 11 changes are the source of truth for execution; this section confirms the decision points.)

| # | File | Change |
|---|------|--------|
| 1 | `frontend/src/pages/ReadingPlanDetail.tsx` | Wrap below-hero content in BackgroundCanvas; preserve outer `min-h-screen bg-dashboard-dark` wrapper; preserve PlanCompletionOverlay portal as sibling; preserve IntersectionObserver wiring |
| 2 | `frontend/src/pages/ReadingPlanDetail.tsx` | Hero h1 Caveat removal — entire `{plan.title}` rendered uniformly with GRADIENT_TEXT_STYLE; remove `titleWords.split(' ')` derivation + `titlePrefix` / `titleLastWord` locals |
| 3 | `frontend/src/pages/ReadingPlanDetail.tsx` | Hero subtitle migration (`font-serif italic text-white/60` → `text-white/70 leading-relaxed`) |
| 4 | `frontend/src/pages/ChallengeDetail.tsx` | Wrap below-hero content in BackgroundCanvas inside `<Layout transparentNav>`; preserve heroStyle (themeColor halo + ATMOSPHERIC_HERO_BG); preserve ChallengeCompletionOverlay portal as sibling |
| 5 | `frontend/src/pages/ChallengeDetail.tsx` | Hero subtitle migration (same as Change 3) |
| 6 | `frontend/src/pages/ChallengeDetail.tsx` | Inline completion banner deletion (lines 472-484), AFTER state-machine verification confirms redundancy |
| 7 | `frontend/src/components/reading-plans/DayContent.tsx` | Action callout inner div → FrostedCard subdued; preserve outer `<section ref={ref}>`, eyebrow heading, scripture italic, prayer italic |
| 8 | `frontend/src/components/challenges/ChallengeDayContent.tsx` | Action callout inner div → FrostedCard subdued; preserve all theme-color inline styles (ActionIcon, Mark Complete, Go to action link, progress bar fill); preserve ChallengeShareButton |
| 9a | `frontend/src/components/reading-plans/PlanNotFound.tsx` | Wrap centered content in BackgroundCanvas; preserve outer `<div className="min-h-screen bg-dashboard-dark">` + `<Navbar transparent />` + `<SiteFooter />` |
| 9b | `frontend/src/components/reading-plans/PlanNotFound.tsx` | Recovery link migration (`font-script text-2xl text-primary` → `<Button variant="subtle" size="md" asChild>` wrapping `<Link>`) |
| 10a | `frontend/src/components/challenges/ChallengeNotFound.tsx` | Same as 9a |
| 10b | `frontend/src/components/challenges/ChallengeNotFound.tsx` | Same as 9b; link target stays `/grow?tab=challenges`; heading text "Challenge Not Found" preserved |
| 11 | `frontend/src/components/reading-plans/DaySelector.tsx` + `frontend/src/components/challenges/ChallengeDaySelector.tsx` | Verification only — no class-string changes |

#### Test updates

The class-string and behavior assertions to update are limited:
   - `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` — verify the `'has all-dark background'` assertion at line ~220-225 still resolves; if not, update to query `.bg-dashboard-dark` explicitly or replace with a structural assertion
   - `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — if any test asserts on the inline completion banner content/visibility, the test is removed in the same change set as the banner deletion. If no such test exists, no change.
   - `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` — per recon no chrome assertions exist; CC verifies and updates if any do.
   - `frontend/src/components/challenges/__tests__/accessibility.test.tsx` — line ~259 Mark Complete button query should pass unchanged; CC verifies.

If new failures appear in any test file not listed above, CC reads the failure and decides whether (a) the failure is a real regression to fix in implementation, (b) the test is asserting on a class string this spec migrates and needs an assertion update, or (c) the test is genuinely broken by an unrelated issue — in case (c), STOP and surface to the user.

### Non-Functional Requirements

- **Performance**: No new network requests, no new lazy-loaded chunks, no new heavy computation. The migration is class-string + state-machine cleanup only. Existing route code splitting on `/reading-plans/:planId` and `/challenges/:challengeId` is preserved.
- **Accessibility (WCAG 2.2 AA)**:
   - All keyboard navigation on both day selectors preserved exactly
   - All ARIA semantics preserved (tablist on `/grow` from Spec 6A is not in scope here; listbox on day selectors verified canonical; progressbar on ChallengeDayContent preserved)
   - Touch targets ≥ 44px on the day-selector triggers (verified canonical)
   - `prefers-reduced-motion` respected by all animation tokens (`motion-reduce:transition-none` on day-selector chevron — verified canonical)
   - Focus restoration on day-selector dismiss preserved
   - Subtle Button hover/focus states satisfy 3:1 contrast against the BackgroundCanvas atmospheric layer (already verified in Spec 6A's UpcomingChallengeCard "View Details" usage; same component, same context)
   - No new color-only state indicators introduced
- **Bundle size**: Net-zero or net-negative. Removing the inline completion banner block + the `titleWords.split(' ')` derivation lines + the rolls-own chrome class strings on action callouts should shrink the bundle slightly. No new imports beyond `BackgroundCanvas`, `FrostedCard`, and `Button` (all already shipped and consumed elsewhere; tree-shaking should be unchanged).
- **Test runtime**: No appreciable change. ~5-10 test files touched at most for assertion updates.

---

## Auth Gating

Detail pages and not-found pages are public — no auth gates added or removed by this spec. Auth-gated actions on these surfaces (Mark Complete on ChallengeDetail, day-completion on ReadingPlanDetail) follow the existing `useFaithPoints.recordActivity` policy and the AuthContext gating that Spec 6A inherited from prior dashboard/activity-engine specs. No change.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| View `/reading-plans/:planId` | Renders fully (browse-only) | Renders fully | N/A |
| View `/challenges/:challengeId` | Renders fully (browse-only) | Renders fully | N/A |
| Mark Complete on ChallengeDetail | Existing behavior preserved (recordActivity no-op when unauthenticated per `recordActivity` policy in `02-security.md`) | Records activity, fires sound, fires overlay on final day | N/A — no new modal added |
| Day-completion on ReadingPlanDetail | Existing behavior preserved | Records activity, fires DayCompletionCelebration on day complete | N/A — no new modal added |
| Click "Browse Reading Plans" / "Browse Challenges" subtle Button on not-found page | Navigates to `/grow?tab=plans` or `/grow?tab=challenges` | Same | N/A |
| Open day selector | Opens listbox; full keyboard navigation | Same | N/A |

Auth-modal copy and gating logic are unchanged by this spec. If a logged-out user clicks Mark Complete today and sees a particular auth-modal message (or no modal — the existing policy is `recordActivity` no-ops), the same behavior holds after this spec lands.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero subtitle reads `text-base` without italic; FrostedCard subdued action callouts use the variant's default `p-5` padding (or override `p-4` if execution determines the default reads too tight on narrow viewports — see recon item 7); day selector dropdown opens full-width below the trigger; subtle Buttons render at `size="md"` with full-width or natural width per existing Button component behavior. The BackgroundCanvas atmospheric layer renders behind day content + day selector across all breakpoints. |
| Tablet (640-1024px) | Hero subtitle bumps to `sm:text-lg` (preserved from current breakpoint logic); FrostedCard subdued padding bumps to `sm:p-6` (or stays at the variant's default per the recon item 7 decision). The BackgroundCanvas atmospheric layer continues. |
| Desktop (> 1024px) | Same as tablet for hero and action-callout chrome. The day selector and day-content sections center inside the existing layout container; BackgroundCanvas continues. |

**Cross-breakpoint preservation.** The hero composition (gradient h1 + plain-prose subtitle) reads correctly at every breakpoint because both are migrating to system tokens (`GRADIENT_TEXT_STYLE` + `text-white/70 leading-relaxed`) that already work cross-breakpoint elsewhere. The FrostedCard subdued chrome already supports cross-breakpoint use (verified on Local Support Spec 5 and Dashboard 4B/4C). Touch targets on day selectors are already ≥ 44px (verified canonical via the `min-h-[44px]` class).

---

## AI Safety Considerations

N/A — This spec does not add, remove, or modify any AI-generated content surface or any user free-text input field. Crisis detection scope is unchanged. The action-callout chrome migration leaves all inner content (action step copy, scripture, prayer, ActionIcon, Mark Complete button, Go to action link, ChallengeShareButton) unchanged.

---

## Auth & Persistence

- **Logged-out (demo mode)**: Detail pages and not-found pages render fully. No new persistence introduced. Existing `recordActivity` no-op policy applies on Mark Complete and day-completion. No localStorage writes added.
- **Logged-in**: Existing `useFaithPoints.recordActivity` writes to `wr_daily_activities` + `wr_faith_points` (per `11-local-storage-keys.md`); existing `useReadingPlanProgress` writes to `wr_reading_plan_progress`; existing `useChallengeProgress` writes to `wr_challenge_progress`; existing `useChallengeAutoDetect` reads `wr_streak` and the activity log. None of these change.
- **localStorage usage**: No new keys. No existing-key shape changes.
- **Route type**: Public.

---

## Completion & Navigation

N/A — These are detail pages and not-found pages, not Daily Hub tabs. Completion of a plan day or a challenge day fires existing `DayCompletionCelebration` (ReadingPlanDetail) or `ChallengeCompletionOverlay` (ChallengeDetail) — both Spec 6C surfaces. This spec deletes the redundant inline banner on ChallengeDetail (Change 6) but does not touch either overlay component itself. Day-to-day navigation through DaySelector / ChallengeDaySelector is preserved (verification only, no migration).

---

## Design Notes

**Reference patterns from `_plans/direction/grow-2026-05-04.md`:**

- **Decision 2**: BackgroundCanvas atmospheric layer added to all Grow surfaces. This spec applies the pattern to both detail pages and both not-found pages. Same shape Spec 6A applied to `/grow`.
- **Decision 3**: Hero subtitle italic deprecation. `font-serif italic text-white/60` → `text-white/70 leading-relaxed`. Same migration Spec 6A applied to `/grow`'s hero subtitle.
- **Decision 4**: Caveat retired from non-emotional-peak h1s. ReadingPlanDetail's hero h1 is the last remaining surface-level offender; ChallengeDetail's h1 is already correct.
- **Decision 6 (with refinement)**: PlanNotFound + ChallengeNotFound recovery links migrate to `<Button variant="subtle">`, not plain underlined text-white/80 link. See "Refinement to direction doc" above for the rationale.
- **Decision 7**: Rolls-own chrome → FrostedCard primitive table. The `subdued` variant maps to sub-content panels within a page; this spec lands the action-callout mappings on both day-content components.
- **Decision 8**: Theme-color CTAs preserved as inline-styled rolls-own. Mark Complete, Join Challenge, ActionIcon, progress bar fill, "Go to {actionLabel} →" link all stay as-is — the seasonal-palette brand expression IS the load-bearing visual contract on Challenges.
- **Decision 11**: "Go to {actionLabel} →" link's `style={{ color: themeColor }}` preserved.

**Reference components (already shipped, this spec consumes):**

- `BackgroundCanvas` — multi-bloom atmospheric layer; consumed on `/grow`, Dashboard, BibleLanding, Local Support, Daily Hub
- `FrostedCard` (`subdued` variant) — sub-content panel chrome; consumed on Dashboard widgets, Local Support sub-content
- `Button` (`subtle` variant + `asChild` prop) — quiet utility CTA; consumed on `/grow` Spec 6A's UpcomingChallengeCard "View Details" and ConfirmDialog "Pause & Start New"
- `ATMOSPHERIC_HERO_BG` — hero-only atmospheric background constant; preserved on both detail page heroes
- `GRADIENT_TEXT_STYLE` — uniform gradient h1 style; preserved on ReadingPlanDetail h1 (now without the Caveat-script-tail span)

**Reference recon (already captured):**

- `_plans/recon/grow-detail-pages-2026-05-04.md` is the source of truth for current state. CC reads it during pre-execution.
- The base design-system recon at `_plans/recon/design-system.md` (if present) is the cross-cutting reference. This spec does not introduce any new visual pattern; every value comes from existing recon.

**No new visual patterns introduced.** Every decision in this spec maps to a Decision in the direction doc (with one explicit refinement on Decision 6). No `[UNVERIFIED]` values needed during planning — every token, every variant, every prop is already in production use.

---

## Out of Scope

- **CreatePlanFlow** (Spec 6C — multi-step form with mood/topic chips, AI generation, generated-plan editor)
- **All four celebration overlays** (Spec 6C — PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration)
- **SwitchChallengeDialog** — already canonical per recon; preserved as-is
- **CommunityFeed** — preserved as-is for now; future product decision
- **ChallengeShareButton** — preserved as-is for now; future product decision
- **ChallengeIcon, CategoryTag** — data-driven components, preserved as-is
- **Theme-color CTA chrome** — preserved per Decision 8 (Mark Complete, Join Challenge, ActionIcon, progress bar fill, "Go to {action}" link all stay as inline-styled rolls-own)
- **Activity engine integration** — preserved (recordActivity calls fire as today; no new activities tracked, no existing activities changed)
- **Sound effects** — preserved as-is. The asymmetry between detail pages (sound on ChallengeDetail Mark Complete; no sound on ReadingPlanDetail day-completion) is logged in recon Q8 as a future product decision; this spec does not harmonize.
- **Section dividers in DayContent / ChallengeDayContent** — `border-t border-white/10` preserved. Decision 7's mapping covers chrome, not sub-element separators; out of scope.
- **ReadingPlanDetail progress bar `bg-primary` fill** — informational data viz, not a CTA; preserved as-is.
- **ChallengeDetail h1** — already correct; direction doc overstated scope. No change.
- **Closing prayer italic** (DayContent) — preserved per recon Q2 ruling (italic exception extends to prayer voice).
- **Sound effect asymmetry harmonization** — out of scope per recon Q8.
- **A11y semantic refactoring** — out of scope. Existing ARIA on day selectors verified canonical; no changes.
- **Performance optimization** — out of scope. No new network requests, no new lazy chunks, no new heavy computation.
- **API/backend changes** — N/A. This is a frontend visual + state-machine-cleanup spec.
- **New localStorage keys, new database columns, new endpoints** — none.
- **FrostedCard, BackgroundCanvas, Button primitives** — preserved as-is; no prop API changes.
- **Service files** — none touched.

---

## Acceptance Criteria

### BackgroundCanvas atmospheric continuity

- [ ] BackgroundCanvas wraps below-hero content on `/reading-plans/:planId` (any valid plan; verify with at least one ID like `daily-bread`)
- [ ] BackgroundCanvas wraps below-hero content on `/challenges/:challengeId` (any valid challenge; verify with the current-season challenge)
- [ ] BackgroundCanvas wraps below-hero content on `/reading-plans/<invalid>` → PlanNotFound
- [ ] BackgroundCanvas wraps below-hero content on `/challenges/<invalid>` → ChallengeNotFound
- [ ] On all four routes, the atmospheric blooms are gently visible behind day content / centered not-found content; the dark base color foundation reads as `#08051A` or equivalent dashboard-dark token

### Hero composition

- [ ] `ATMOSPHERIC_HERO_BG` preserved on both detail page heroes (no class-string drift, no inline-style drift)
- [ ] ChallengeDetail `heroStyle` composition (themeColor halo + ATMOSPHERIC_HERO_BG) at lines 222-225 preserved exactly — same color computation, same layered radial-gradient halo
- [ ] ReadingPlanDetail h1 uses `GRADIENT_TEXT_STYLE` on the entire title (no `<span className="font-script">` tail; no `titleWords.split(' ')` derivation; no `titlePrefix` / `titleLastWord` locals remain)
- [ ] Both detail page hero subtitles have migrated from `font-serif italic text-white/60` to `text-white/70 leading-relaxed` (DOM inspection confirms `font-serif` and `italic` classes absent on the subtitle `<p>`)
- [ ] ChallengeDetail h1 unchanged (verified during recon — no migration needed)

### Action callout chrome

- [ ] DayContent action callout inner panel renders as `<FrostedCard variant="subdued">` (DOM inspection confirms `rounded-3xl` from FrostedCard; old `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm` rolls-own classes absent)
- [ ] DayContent's outer `<section ref={ref}>` preserved (the IntersectionObserver still fires correctly on action-step visibility — verified by visual smoke test that whatever sentinel-side-effect existed pre-migration still triggers)
- [ ] DayContent eyebrow heading (`text-xs font-medium uppercase tracking-widest text-white/60` "Today's Action Step") preserved
- [ ] DayContent passage scripture italic preserved (Decision 4)
- [ ] DayContent closing prayer italic preserved (recon Q2 ruling)
- [ ] DayContent section divider `border-t border-white/10` preserved
- [ ] ChallengeDayContent action callout inner panel renders as `<FrostedCard variant="subdued">`
- [ ] ChallengeDayContent ActionIcon preserves `style={{ color: themeColor }}`
- [ ] ChallengeDayContent Mark Complete button preserves `style={{ backgroundColor: themeColor }}` (Decision 8)
- [ ] ChallengeDayContent "Go to {actionLabel} →" link preserves `style={{ color: themeColor }}` (Decision 11)
- [ ] ChallengeDayContent progress bar fill color preserved (theme-color rolls-own)
- [ ] ChallengeDayContent ChallengeShareButton preserved
- [ ] ChallengeDayContent scripture italic preserved (Decision 4)

### Inline completion banner deletion

- [ ] ChallengeDetail inline completion banner at lines 472-484 deleted (DOM inspection on a final-day Mark Complete confirms only the ChallengeCompletionOverlay portal renders; no inline `border-success/20 bg-success/10` banner appears under it)
- [ ] State-machine verification documented in execution log: `setJustCompletedFinalDay(true)` and `setCompletionOverlay({ ... })` always fire together; banner was redundant
- [ ] If state-machine verification surfaced a flow where the banner is load-bearing, this acceptance criterion is REPLACED by "banner preservation rationale documented in execution log; banner kept as-is" — but the likely outcome is clean delete

### Not-found surfaces

- [ ] PlanNotFound recovery action renders as `<Button variant="subtle">` (no `font-script`, no `text-2xl`, no `text-primary` class on the recovery affordance)
- [ ] PlanNotFound BackgroundCanvas wrap renders the atmospheric layer behind the centered content
- [ ] PlanNotFound `<Navbar transparent />` and `<SiteFooter />` preserved
- [ ] PlanNotFound recovery link target stays `/grow?tab=plans`
- [ ] ChallengeNotFound recovery action renders as `<Button variant="subtle">` (same checks as PlanNotFound)
- [ ] ChallengeNotFound BackgroundCanvas wrap renders the atmospheric layer
- [ ] ChallengeNotFound recovery link target stays `/grow?tab=challenges`
- [ ] ChallengeNotFound heading text "Challenge Not Found" preserved

### Day selectors (verification only)

- [ ] DaySelector preserves `aria-haspopup="listbox"`, `aria-expanded`, `role="option"`, `aria-selected`, `aria-disabled` on the appropriate elements
- [ ] DaySelector keyboard navigation (Home/End/ArrowDown/ArrowUp/Enter/Space/Escape) intact
- [ ] DaySelector `min-h-[44px]` touch target on trigger
- [ ] DaySelector `transition-transform motion-reduce:transition-none` on chevron
- [ ] DaySelector completion check icon `text-success`; lock icon `text-white/30`
- [ ] DaySelector focus restoration on dismiss
- [ ] ChallengeDaySelector matches the same six checks
- [ ] No class-string changes on either day selector (verification only)

### Behavioral preservation

- [ ] `useReadingPlanProgress` hook wiring unchanged
- [ ] `useChallengeProgress` hook wiring unchanged
- [ ] `useChallengeAutoDetect` hook wiring unchanged
- [ ] `useFaithPoints.recordActivity` calls fire on Mark Complete (ChallengeDetail) and on day-completion (ReadingPlanDetail) — verified by existing tests passing without modification
- [ ] `playSoundEffect` fires on ChallengeDetail Mark Complete (preserved)
- [ ] `ChallengeCompletionOverlay` renders as portal-style sibling to BackgroundCanvas (outside the wrapper, same parent as the hero `<section>`)
- [ ] `PlanCompletionOverlay` renders as portal-style sibling to BackgroundCanvas at ReadingPlanDetail line 318 (same shape)
- [ ] `DayCompletionCelebration` rendering preserved on ReadingPlanDetail
- [ ] IntersectionObserver wiring on DayContent's action step continues to fire correctly (verified by smoke test that the action-step sentinel triggers its visited-section side effect)

### Theme-color preservation (Decision 8)

- [ ] All theme-color inline styles preserved (ChallengeDetail heroStyle, Mark Complete, Join Challenge; ChallengeDayContent ActionIcon, Mark Complete, Go to action link, progress bar fill)
- [ ] `getContrastSafeColor()` helper preserved (no migration touches the helper)
- [ ] Mark Complete button on ChallengeDetail renders with seasonal palette (e.g., during Lent it's deep purple; during Easter it's gold; verify visually with the current season's challenge)

### Tests

- [ ] All existing tests pass post-migration; no NEW failures introduced
- [ ] Test baseline preserved relative to the live count captured at execution start (the spec's narrative cites 9,470/1 as the post-Spec-6A baseline; reconcile against the live run)
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` `'has all-dark background'` assertion still resolves (either passes by luck via preserved `bg-dashboard-dark`, or is updated to a more semantic check; the chosen path is documented in execution log)
- [ ] `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — if it asserts on the inline completion banner, the assertion is removed alongside the banner deletion; if not, no change
- [ ] `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` — no chrome-class regressions
- [ ] `frontend/src/components/challenges/__tests__/accessibility.test.tsx` line ~259 Mark Complete `container.querySelector('button')` query continues to find exactly the Mark Complete button (FrostedCard subdued is non-interactive; button count unchanged)

### Manual eyeball check — detail pages

- [ ] `/reading-plans/<valid-id>` — hero with no italic subtitle, no font-script tail; BackgroundCanvas atmospheric blooms gently visible behind day content + day selector; FrostedCard subdued action callout reads correctly (rounded-3xl, quieter than the day-content card chrome above it); DaySelector dropdown opens, navigates correctly with keyboard, focus restores on dismiss
- [ ] `/challenges/<valid-id>` — same as above, plus theme-color Mark Complete button renders with seasonal palette; theme-color halo on hero composes correctly with ATMOSPHERIC_HERO_BG; ChallengeDayContent "Today's Action" callout reads as FrostedCard subdued; ActionIcon, Mark Complete, "Go to {action} →" all wear theme color; ChallengeShareButton present and clickable

### Manual eyeball check — not-found surfaces

- [ ] `/reading-plans/invalid-id` shows BackgroundCanvas atmospheric layer + subtle Button "Browse Reading Plans" (no Caveat font, no text-primary color)
- [ ] `/challenges/invalid-id` shows BackgroundCanvas atmospheric layer + subtle Button "Browse Challenges"
- [ ] Both not-found pages preserve `<Navbar transparent />` and `<SiteFooter />`

### Regression checks (verify no drift on neighbors)

- [ ] `/grow` (Spec 6A) reads identically — BackgroundCanvas, plan cards, challenge cards, tab icons, sticky tab bar all unchanged
- [ ] `/grow?tab=plans` and `/grow?tab=challenges` unchanged
- [ ] DailyHub (`/daily?tab=*`) unchanged
- [ ] Dashboard (`/`) unchanged
- [ ] Local Support (`/local-support/*`) unchanged
- [ ] BibleLanding (`/bible`) unchanged

---

## Risks & Mitigations

**Risk:** The IntersectionObserver wiring on DayContent's action step keys off DOM geometry and could in principle be affected by the FrostedCard subdued migration if the migration accidentally introduces a new positioned ancestor or changes the section's box-model.
**Mitigation:** The migration replaces the inner `<div>` only; the outer `<section ref={ref}>` element with its `border-t` divider stays exactly as-is. FrostedCard subdued does not introduce a positioned ancestor that would interfere. CC verifies visually at execution time (smoke-test the action-step sentinel by scrolling through a day and confirming the side-effect still fires). If the observer breaks, fall back to the original rolls-own chrome on DayContent only and surface to the user.

**Risk:** The `'has all-dark background'` test in ReadingPlanDetail.test.tsx queries `.bg-hero-dark` (a class that doesn't exist in the migrated tree) and could pass today only by accident.
**Mitigation:** The test passes today because somewhere in the rendered tree there's an element matching the class — verify which element pre-migration. The migration preserves `bg-dashboard-dark` on the outer wrapper. If the test still passes post-migration, leave it. If it fails, update to query `.bg-dashboard-dark` explicitly OR replace with a structural assertion (querying the outer `<div>` directly). Document the chosen path in the execution log.

**Risk:** The inline completion banner on ChallengeDetail might be load-bearing in a flow CC hasn't accounted for (e.g., a user dismisses the overlay and wants the banner to remain as a persistent celebration, or the overlay is suppressed in some condition CC missed).
**Mitigation:** State-machine verification at lines 138-171 is mandatory before deletion. If CC finds any flow where `justCompletedFinalDay = true` but `completionOverlay = null`, STOP and flag. Spec lists this as the explicit STOP condition.

**Risk:** FrostedCard subdued's default `p-5` padding is between the original `p-4 sm:p-6` and might read too tight on mobile where the original was `p-4`.
**Mitigation:** Direction doc accepts the side effect. If execution surfaces a visual regression at the mobile breakpoint, override with `className="p-4 sm:p-6"` on the FrostedCard. Document the chosen padding in the execution log.

**Risk:** Button's `asChild` prop may have edge-case behavior with `<Link>` (e.g., focus styles, hover transitions) that differ from a direct button rendering.
**Mitigation:** Spec 6A already verified `asChild` works on UpcomingChallengeCard "View Details." If a regression surfaces, fall back to applying subtle-variant class strings to the `<Link>` directly (Path B), same pattern as Local Support Spec 5's Get Directions migration. Document the chosen path.

**Risk:** Unintended ripple from the BackgroundCanvas wrap onto the ChallengeCompletionOverlay portal positioning.
**Mitigation:** ChallengeCompletionOverlay (and PlanCompletionOverlay on ReadingPlanDetail) render as siblings to BackgroundCanvas, not children. The wrapper is placed AFTER the hero `<section>` and BEFORE the overlay sibling. CC verifies the JSX tree at execution time and documents the structural shape in the execution log. If the overlay regresses, reposition it explicitly outside the BackgroundCanvas wrapper.

---

## Implementation Notes (for /plan)

The brief enumerates 11 changes. The plan should one-to-one those changes into execution steps, with the recon items 1-12 above as the pre-execution gate (steps 1-N before any code change), the 11 changes as the migration body (one step per change), and the test-update + smoke-test verification as the closing steps.

**Suggested step ordering:**
1. Pre-execution recon (items 1-12 from "Pre-execution recon" above)
2. Capture test baseline + typecheck baseline
3. Read all 8 implementation files + relevant test files
4. Verify FrostedCard prop API + Button `asChild` prop
5. State-machine verification on ChallengeDetail (recon item 6)
6. Apply Change 1 (ReadingPlanDetail BackgroundCanvas wrap) — verify visually
7. Apply Change 2 (ReadingPlanDetail h1 Caveat removal) — verify visually
8. Apply Change 3 (ReadingPlanDetail hero subtitle) — verify visually
9. Apply Change 4 (ChallengeDetail BackgroundCanvas wrap) — verify visually
10. Apply Change 5 (ChallengeDetail hero subtitle) — verify visually
11. Apply Change 6 (ChallengeDetail inline banner deletion, IF state-machine confirms redundancy) — verify on a final-day flow
12. Apply Change 7 (DayContent action callout) — verify visually + smoke-test IntersectionObserver
13. Apply Change 8 (ChallengeDayContent action callout) — verify visually
14. Apply Change 9 (PlanNotFound) — verify on `/reading-plans/invalid`
15. Apply Change 10 (ChallengeNotFound) — verify on `/challenges/invalid`
16. Apply Change 11 (DaySelector + ChallengeDaySelector verification only)
17. Update test files for class-string and behavior assertions (per "Test updates" section)
18. Run full test suite + `pnpm typecheck`; reconcile against captured baseline
19. Manual eyeball checks on detail pages, not-found surfaces, and regression neighbors (per acceptance criteria)
20. Document execution-log decisions: FrostedCard padding choice (default vs override), Button `asChild` path (A vs B), banner-deletion verification result, ReadingPlanDetail.test.tsx assertion path

**No `[UNVERIFIED]` values expected.** Every token, variant, and prop in this spec is already in production use elsewhere. If the planner surfaces an unknown value during planning, surface to the user.
