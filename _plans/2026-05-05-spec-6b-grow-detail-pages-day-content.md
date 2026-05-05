# Implementation Plan: Spec 6B — Grow Detail Pages + Day Content

**Spec:** `_specs/spec-6b-grow-detail-pages-day-content.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (no new branch — user manages git)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — header confirms presence)
**Recon Report:** `_plans/recon/grow-detail-pages-2026-05-04.md` (loaded)
**Direction Doc:** `_plans/direction/grow-2026-05-04.md` (loaded — locked decisions 2/3/4/6/7/8/11)
**Master Spec Plan:** N/A (Grow's three sub-specs share a direction doc rather than a master plan; Spec 6A is the precedent reference)

---

## Affected Frontend Routes

- `/reading-plans/:planId`
- `/challenges/:challengeId`
- `/reading-plans/<invalid-id>` (PlanNotFound)
- `/challenges/<invalid-id>` (ChallengeNotFound)
- `/reading-plans` (legacy redirect → `/grow?tab=plans` — regression check)
- `/challenges` (legacy redirect → `/grow?tab=challenges` — regression check)
- `/grow`, `/grow?tab=plans`, `/grow?tab=challenges` (Spec 6A regression check)
- `/` (Dashboard — atmospheric continuity regression check)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` (regression)
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` (regression)

---

## Architecture Context

### Files in scope (8 implementation + 4 test)

| File | LOC | Purpose | Changes |
|------|-----|---------|---------|
| `frontend/src/pages/ReadingPlanDetail.tsx` | 329 | `/reading-plans/:planId` page | Changes 1, 2, 3 |
| `frontend/src/pages/ChallengeDetail.tsx` | 566 | `/challenges/:challengeId` page | Changes 4, 5, 6 |
| `frontend/src/components/reading-plans/DayContent.tsx` | 73 | Reading-plan day body | Change 7 |
| `frontend/src/components/challenges/ChallengeDayContent.tsx` | 146 | Challenge day body | Change 8 |
| `frontend/src/components/reading-plans/PlanNotFound.tsx` | 29 | 404 fallback | Changes 9a + 9b |
| `frontend/src/components/challenges/ChallengeNotFound.tsx` | 29 | 404 fallback | Changes 10a + 10b |
| `frontend/src/components/reading-plans/DaySelector.tsx` | 182 | Day selector listbox | Verification only (Change 11) |
| `frontend/src/components/challenges/ChallengeDaySelector.tsx` | 185 | Day selector listbox | Verification only (Change 11) |
| `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` | 273 (~19 tests) | Page tests | Possibly update `'has all-dark background'` (line ~220-225) |
| `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` | 287 (~21 tests) | Page tests | Verify no inline-banner assertion (recon: none found) |
| `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` | 37 (1 test) | DayContent test | Verify no chrome-class regressions (recon: none) |
| `frontend/src/components/challenges/__tests__/accessibility.test.tsx` | 283 (~12 tests) | Day-selector + day-content a11y | Verify `container.querySelector('button')` still resolves (line ~259) |

### Existing patterns to follow

- **BackgroundCanvas wrap pattern** — `frontend/src/components/ui/BackgroundCanvas.tsx`. Component renders `<div className="relative min-h-screen overflow-hidden" style={{ background: CANVAS_BACKGROUND }}>{children}</div>`. Multi-bloom radial-gradient + linear-gradient inline style. Spec 6A applied this on `/grow` below the hero. Same shape used on Dashboard, BibleLanding, Local Support.
- **FrostedCard primitive** — `frontend/src/components/homepage/FrostedCard.tsx`. Three variants: `accent`, `default`, `subdued`. The `subdued` variant resolves to `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` (lines 39–42). Accepts `as: 'div' | 'button' | 'article' | 'section'`, optional `eyebrow`, `eyebrowColor`, `style`, `className`. Hover variants apply only when `onClick` is provided. The `subdued` variant is non-interactive in this spec (no `onClick`) — button count stays at 1 in any container.
- **Button `subtle` variant + `asChild`** — `frontend/src/components/ui/Button.tsx`. `subtle` variant resolves to `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` (line 51–52). `asChild` works at line 68: `Children.only(children)`, `cloneElement` with merged className + ref. Used by Spec 6A's UpcomingChallengeCard "View Details" Button (Path A, preferred). Path B fallback: apply subtle-variant class strings directly to `<Link>` if `asChild` regresses (Spec 5 Local Support precedent).
- **`ATMOSPHERIC_HERO_BG`** — exported from `frontend/src/components/PageHero.tsx`. Used inline as `style={ATMOSPHERIC_HERO_BG}` on hero `<section>`. ChallengeDetail composes it with the per-challenge themeColor halo at lines 222–225 (radial-gradient layered over the canonical purple ellipse).
- **`GRADIENT_TEXT_STYLE`** — exported from `frontend/src/constants/gradients.tsx`. Inline style for white-to-purple gradient text via `background-clip: text`. Applied to hero h1s and section headings on dark backgrounds.

### Patterns to avoid (deprecated per `09-design-system.md`)

- `font-script` Caveat font on h1s — `GRADIENT_TEXT_STYLE` only.
- `font-serif italic text-white/60` on hero subtitles — `text-white/70 leading-relaxed` is the Round 3 standard (Direction Decision 3).
- Rolls-own `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm` chrome — `FrostedCard variant="subdued"` for sub-content panels (Direction Decision 7).
- Hardcoded ms / cubic-bezier (BB-33). All tokens already canonical in scope; do not introduce hardcoded values.

### Auth gating posture (no change)

Public routes. `useFaithPoints.recordActivity` no-ops when unauthenticated. Mark Complete on ChallengeDetail and day-completion on ReadingPlanDetail follow existing AuthContext gating policy. PlanNotFound + ChallengeNotFound recovery actions navigate to `/grow?tab=*` (no auth required). Day-selector logged-out gates already canonical (lines 113–133 ReadingPlanDetail, 113–126 ChallengeDetail).

### Behavioral preservation surfaces (every one of these MUST keep working byte-identical)

- `useReadingPlanProgress` hook wiring (ReadingPlanDetail line 31)
- `useChallengeProgress` hook wiring (ChallengeDetail line 50–53)
- `useChallengeAutoDetect` hook wiring (ChallengeDetail line 71–77)
- `useFaithPoints.recordActivity` calls (ReadingPlanDetail line 78; ChallengeDetail line 60–68 wrapped via `recordActivityForChallenge`)
- `playSoundEffect('ascending')` on ChallengeDetail Mark Complete (line 144) — preserved; ReadingPlanDetail intentionally has no equivalent (recon Q8 — out of scope)
- `IntersectionObserver` on ReadingPlanDetail line 66–87 keying off `actionStepRef` forwarded to DayContent's outer `<section ref={ref}>` at DayContent.tsx:62 (threshold 0.5)
- ChallengeDetail `heroStyle` composition at lines 222–225 (themeColor halo + ATMOSPHERIC_HERO_BG)
- All theme-color inline styles on ChallengeDayContent (ActionIcon line 84–88, Mark Complete line 96–101, "Go to {actionLabel} →" Link line 104–129, ChallengeShareButton line 131–141)
- `ChallengeCompletionOverlay` portal-render sibling positioning (ChallengeDetail line 554–563 — outside the BackgroundCanvas wrapper, sibling to the hero)
- `PlanCompletionOverlay` portal-render sibling positioning (ReadingPlanDetail line 317–326)
- ARIA wiring on both day selectors (verified canonical; out of class-string-change scope)

### Test patterns (provider wrapping)

- ReadingPlanDetail tests render the page inside `<MemoryRouter>` + `AuthModalProvider` + `ToastProvider` per existing patterns. Same applies to ChallengeDetail tests.
- ChallengeDayContent / ChallengeDaySelector accessibility tests render inside `<MemoryRouter>` only (no auth providers needed because the components consume props, not hooks).
- DayContent test renders inside `<MemoryRouter>` (single test on VerseLink href).

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View `/reading-plans/:planId` | Public, full render | Step 3 (Change 1) | None — preserved |
| View `/challenges/:challengeId` | Public, full render | Step 6 (Change 4) | None — preserved |
| Mark Complete (ChallengeDetail) | recordActivity no-ops when unauthenticated | Step 7 (Change 5) — preservation, not migration | Existing `recordActivityForChallenge` — preserved |
| Day completion via IO observer (ReadingPlanDetail) | Only fires when `isAuthenticated` (line 67) | Step 9 (Change 7) — observer wiring preserved | Existing `if (!isAuthenticated) return` guard — preserved |
| Open day selector locked day (ReadingPlanDetail) | Logged-out → `'Sign in to start this reading plan'` | Step 13 (Change 11 verification) | Existing `authModal?.openAuthModal(...)` at line 124 — preserved |
| Open day selector locked day (ChallengeDetail) | Logged-out → `'Sign in to join this challenge'` | Step 13 (Change 11 verification) | Existing `authModal?.openAuthModal(...)` at line 117 — preserved |
| Click Browse Reading Plans / Browse Challenges (not-found surfaces) | Navigates to `/grow?tab=*` | Steps 11 + 12 (Changes 9b + 10b) | None — public navigation |

**Verdict:** This spec adds NO new auth gates and removes NO auth gates. Every existing gate listed above is preserved without code change.

---

## Design System Values (for UI steps)

All values verified from `_plans/recon/design-system.md`, `09-design-system.md`, and current codebase. No `[UNVERIFIED]` values in this plan — every token, variant, and prop is in production use elsewhere.

| Component / Surface | Property | Value | Source |
|---------------------|----------|-------|--------|
| BackgroundCanvas wrapper | container | `<BackgroundCanvas>` from `@/components/ui/BackgroundCanvas` | `frontend/src/components/ui/BackgroundCanvas.tsx:17–26` |
| BackgroundCanvas | inline background | 5-stop multi-bloom (3 violet ellipses + dark vignette + diagonal linear-gradient) | `BackgroundCanvas.tsx:9–15` |
| BackgroundCanvas | wrapper classes | `relative min-h-screen overflow-hidden` | `BackgroundCanvas.tsx:20` |
| FrostedCard variant=subdued | base classes | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `FrostedCard.tsx:39–42` |
| FrostedCard | transition | `transition-all motion-reduce:transition-none duration-base ease-decelerate` (always applied) | `FrostedCard.tsx:78` |
| Button variant=subtle | classes | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | `Button.tsx:51–52` |
| Button size=md (subtle/light/gradient) | sizing | `px-6 py-2.5 text-sm` | `Button.tsx:62` |
| Hero subtitle (NEW target) | classes | `mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg` | Direction Decision 3; same migration Spec 6A used for `/grow` hero subtitle |
| Hero h1 (target) | inline style | `style={GRADIENT_TEXT_STYLE}` | `frontend/src/constants/gradients.tsx` |
| Hero h1 (target) | classes | `mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2` (UNCHANGED — only `<span className="font-script">` removed) | ReadingPlanDetail.tsx:199 |
| ATMOSPHERIC_HERO_BG | inline style on hero `<section>` | preserved exactly | `PageHero.tsx` (export); ReadingPlanDetail.tsx:193, ChallengeDetail.tsx:261 |
| ChallengeDetail heroStyle | composition | `{ ...ATMOSPHERIC_HERO_BG, backgroundImage: \`radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), ${ATMOSPHERIC_HERO_BG.backgroundImage}\` }` | ChallengeDetail.tsx:222–225 — preserved exactly |
| Action callout outer `<section>` | classes (DayContent) | `border-t border-white/10 py-8 sm:py-10` (UNCHANGED) + `ref={ref}` (UNCHANGED) | DayContent.tsx:62 |
| Action callout outer `<section>` | classes (ChallengeDayContent) | `border-t border-white/10 py-8 sm:py-10` (UNCHANGED) | ChallengeDayContent.tsx:81 |
| Action callout eyebrow (DayContent) | classes | `text-sm text-white/60` (UNCHANGED) | DayContent.tsx:64 |
| Action callout eyebrow (ChallengeDayContent) | classes | `text-sm text-white/60` (UNCHANGED) | ChallengeDayContent.tsx:89 |
| Mark Complete (ChallengeDayContent) | inline style | `style={{ backgroundColor: themeColor }}` (PRESERVED) | ChallengeDayContent.tsx:98 |
| ActionIcon (ChallengeDayContent) | inline style | `style={{ color: themeColor }}` (PRESERVED) | ChallengeDayContent.tsx:86 |
| "Go to {action} →" Link (ChallengeDayContent) | inline style | `style={{ color: themeColor }}` (PRESERVED) | ChallengeDayContent.tsx:126 |
| Progress bar fill (ChallengeDetail) | inline style | `style={{ width: \`${communityPercent}%\`, backgroundColor: challenge.themeColor }}` (PRESERVED) | ChallengeDetail.tsx:336–340 |
| PlanNotFound / ChallengeNotFound outer wrapper | classes | `min-h-screen bg-dashboard-dark` (PRESERVED — same pattern Spec 6A kept on ReadingPlanDetail outer) | PlanNotFound.tsx:8, ChallengeNotFound.tsx:8 |

---

## Design System Reminder

Project-specific quirks `/execute-plan` displays before every UI step:

- **GRADIENT_TEXT_STYLE for hero h1.** Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero/section headings on dark backgrounds. Caveat (`font-script`) is deprecated for headings — used only for the logo. ReadingPlanDetail's h1 currently splits its title with `<span className="font-script">{titleLastWord}</span>` — this is the LAST remaining surface-level h1 with this pattern; it must go.
- **Hero subtitle migration target.** `font-serif italic text-white/60` → `text-white/70 leading-relaxed`. Drops `font-serif` and `italic`; lifts opacity from `/60` to `/70`; adds `leading-relaxed`. Same migration Spec 6A applied to `/grow`.
- **FrostedCard subdued is the action-callout chrome.** Inner `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` migrates to `<FrostedCard variant="subdued">`. Side effects accepted by direction doc: radius `rounded-2xl` → `rounded-3xl` (16px → 24px), padding `p-4 sm:p-6` → `p-5` (no sm bump). If the visual reads too tight at 375px, override with `className="p-4 sm:p-6"` and document in Execution Log.
- **The outer `<section>` is NOT migrated.** Only the inner panel chrome changes. The outer `<section ref={ref}>` (DayContent only) and `<section className="border-t border-white/10 py-8 sm:py-10">` divider stay exactly as-is. The IntersectionObserver in ReadingPlanDetail observes the OUTER `<section>` boundingbox; the FrostedCard sits inside as visible chrome. Observer behavior is preserved.
- **Theme-color inline styles are LOAD-BEARING (Direction Decision 8 + 11).** Every `style={{ backgroundColor: themeColor }}` and `style={{ color: themeColor }}` on Mark Complete, Join Challenge, ActionIcon, "Go to {action} →" Link, progress bar fill, and ChallengeShareButton MUST stay exactly as-is. The seasonal palette IS the brand expression on Challenges. `getContrastSafeColor()` helper untouched.
- **Italic preservation in scripture and prayer.** DayContent passage scripture (`font-serif italic` line 27), DayContent closing prayer (`font-serif italic` line 56), ChallengeDayContent scripture (`font-serif italic` line 63) all stay italic per Direction Decision 4 + recon Q2 ruling. The hero subtitles REMOVE italic. The action-callout panels do not change inner content; only the chrome.
- **Caveat removal in NotFound recovery links.** Refinement to direction doc: `font-script text-2xl text-primary` → `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link to="...">`. Drops Caveat font, drops `text-primary`, gains visible Button affordance. Decision 6's intent (no Caveat, no `text-primary`) is preserved; the contextually appropriate component on a not-found page is a subtle Button, not a plain underlined link that would shrink to near-invisibility.
- **The `bg-dashboard-dark` outer wrapper STAYS** on ReadingPlanDetail and the two NotFound components. BackgroundCanvas is the atmospheric layer ON TOP of the dark base color; they are complementary. Spec 6A precedent on `/grow`.
- **`<Layout transparentNav>` stays on ChallengeDetail.** BackgroundCanvas wrapper goes INSIDE `<Layout transparentNav>` and AFTER the hero `<section>`. ChallengeCompletionOverlay portal stays as a SIBLING (not child) of BackgroundCanvas.
- **Inline completion banner (ChallengeDetail lines 472–484) — DELETE only after state-machine verification.** `setJustCompletedFinalDay(true)` and `setCompletionOverlay({ ... })` always fire together at line 147 + 150. The inline banner flashes briefly under the overlay and is functionally invisible. Likely outcome: clean delete. STOP and flag if any flow has `justCompletedFinalDay = true` while `completionOverlay = null`.
- **No new visual patterns.** Every token, variant, and prop is already in production. No `[UNVERIFIED]` values needed.

---

## Shared Data Models

N/A — this spec is a class-string + state-machine-cleanup migration. No new types, no new localStorage keys, no new constants.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Read (preserved through `useReadingPlanProgress`) | Read-only on the page; no write changes |
| `wr_challenge_progress` | Read (preserved through `useChallengeProgress`) | Read-only on the page; no write changes |
| `wr_challenge_reminders` | Read (preserved through `getReminders`) | Read-only on the page; no write changes |
| `wr_daily_activities`, `wr_faith_points`, `wr_streak` | Write via `recordActivity` (preserved) | Behavior preserved exactly; no shape change |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero subtitle reads `text-base` without italic. FrostedCard subdued action callouts use the variant default `p-5` (or `p-4 sm:p-6` override if the visual reads too tight — gate decided at execution). Day selector dropdown opens full-width below the trigger. Subtle Buttons on NotFound surfaces render at `size="md"` natural width. BackgroundCanvas atmospheric layer renders behind day content + day selector at all breakpoints. |
| Tablet | 768px | Hero subtitle bumps to `sm:text-lg` (preserved). FrostedCard subdued may bump to `sm:p-6` if the override is applied; otherwise stays `p-5`. BackgroundCanvas continues. Subtle Button hover translation `hover:-translate-y-0.5` engages on pointer-capable devices. |
| Desktop | 1440px | Same hero/action-callout chrome as tablet. Day selector and day-content sections center inside the existing `max-w-2xl` container. BackgroundCanvas continues. Theme-color buttons render with seasonal palette inline-style (verified at execution with the current liturgical season's challenge). |

**Custom breakpoints:** none. All breakpoints follow the canonical `sm:` (640px) convention. ChallengeDetail hero `max-w-4xl` and below-hero `max-w-2xl` per existing layout.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| ReadingPlanDetail hero pill row (lines 207–214) | "X days" pill, difficulty pill | No wrap allowed at 1440px and 768px (children stay within row's vertical span) | Wrapping below 375px is acceptable |
| ChallengeDetail hero pill row (lines 282–289) | season pill, "X days" pill | No wrap allowed at 1440px and 768px | Wrapping below 375px is acceptable |
| ReadingPlanDetail prev/next button row (lines 279–311) | Previous Day, Next Day | Side-by-side at `sm:flex-row sm:justify-center`, stacked below `sm:` per existing CSS | Wrapping below `sm:` is BY DESIGN (`flex-col sm:flex-row`) |
| ChallengeDetail prev/next button row (lines 499–531) | Previous Day, Next Day | Same as ReadingPlanDetail | Same as ReadingPlanDetail |
| ChallengeDayContent action callout heading row (line 83–90) | ActionIcon, "Today's action:" h3 | Items-center alignment, no wrap allowed at any breakpoint | None — always inline |
| ChallengeDayContent action button column (lines 93–141) | Mark Complete button (full-width), "Go to {action} →" Link, ChallengeShareButton | Stacked column, `mt-3 inline-flex` on Link, `mt-4 w-full` on Mark Complete | N/A — column layout, not row |
| Hero subtitle (both pages) | single `<p>` | One line at desktop, may wrap at smaller widths per `max-w-xl` constraint | Wrapping is BY DESIGN (long descriptions) |

**Note:** The action-callout migration to FrostedCard subdued does not change inline-element layout — only the wrapping chrome. The button column inside the callout stays the same. Verification at execution time confirms `boundingBox().y` of ActionIcon and "Today's action:" heading match within ±5px (children of the same `flex items-center` row with similar intrinsic heights — top-y matching is the right assertion here).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| ReadingPlanDetail hero `<section>` (pb-8) → BackgroundCanvas Breadcrumb (component owns its top spacing) | Preserved | ReadingPlanDetail.tsx:192 (`pb-8 sm:pb-12`) — UNCHANGED |
| ReadingPlanDetail Breadcrumb → DayContent root (`pt-8 sm:pt-10` on h2 inside) | Preserved | DayContent.tsx:15 — UNCHANGED |
| DayContent section → next section | `border-t border-white/10 py-8 sm:py-10` per section divider | DayContent.tsx:20, 40, 52, 62 — UNCHANGED across all four sections including the post-migration action callout |
| DayContent action callout → DayCompletionCelebration | `mt-8 flex flex-col items-center gap-4 sm:mt-10` on the day-nav wrapper | ReadingPlanDetail.tsx:270 — UNCHANGED |
| ChallengeDetail hero `<section>` (pb-8) → Breadcrumb | Preserved | ChallengeDetail.tsx:260 (`pb-8 sm:pb-12`) — UNCHANGED |
| ChallengeDetail Breadcrumb → MilestoneCard / ChallengeDayContent | Component-owned spacing | ChallengeDetail.tsx:411–456 — UNCHANGED |
| ChallengeDayContent section dividers | `border-t border-white/10 py-8 sm:py-10` per section | ChallengeDayContent.tsx:59, 69, 81 — UNCHANGED |
| ChallengeDayContent action callout → CommunityFeed | Component-owned spacing | ChallengeDetail.tsx:459–469 — UNCHANGED |
| Day-nav wrapper top → ChallengeDaySelector | `mt-8 sm:mt-10` | ChallengeDetail.tsx:489 — UNCHANGED |

**Rule:** This spec changes ONLY the inner panel chrome of two action callouts and the wrapping ancestry of below-hero content. Every section divider (`border-t border-white/10 py-8 sm:py-10`) and every inter-section gap stays byte-identical.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 6A is merged: `BackgroundCanvas` wraps `/grow` below-hero, `FrostedCard` consumed on PlanCard / UpcomingChallengeCard / ActiveChallengeCard / NextChallengeCountdown / PastChallengeCard / HallOfFame, Tonal Icon Pattern on Plans/Challenges tab icons, dead `FilterBar.tsx` deleted, ConfirmDialog "Pause & Start New" migrated to subtle Button. Re-verify by inspecting `frontend/src/pages/GrowPage.tsx` and the card components.
- [ ] Direction doc at `_plans/direction/grow-2026-05-04.md` is present and Decisions 2/3/4/6/7/8/11 match this plan's reading.
- [ ] Recon at `_plans/recon/grow-detail-pages-2026-05-04.md` is present.
- [ ] Pre-execution test baseline captured: `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. Expected baseline per CLAUDE.md: **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`); occasional flake brings to 9,469/2 across 2 files. Live numbers are authoritative; record in Execution Log Step 0.
- [ ] FrostedCard prop API verified: `as: 'div' | 'button' | 'article' | 'section'`, `subdued` variant resolves to `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`, `onClick`-gated hover (no hover when `onClick` is undefined). Verified at planning time — `FrostedCard.tsx:39–42, 78–86`.
- [ ] Button `subtle` variant + `asChild` prop verified: `Button.tsx:51–52` for class strings, `Button.tsx:68–84` for `asChild` cloneElement logic. Spec 6A precedent on UpcomingChallengeCard "View Details" confirmed working.
- [ ] State-machine verification on ChallengeDetail lines 138–171 completed: `setJustCompletedFinalDay(true)` and `setCompletionOverlay({...})` always fire together with no path where the banner is the only celebration surface. (See Step 2.)
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards, PageTransition).
- [ ] All auth-gated actions from the spec are accounted for in the plan (verified — none added or removed).
- [ ] Design system values are verified from the design system reference and the codebase. No `[UNVERIFIED]` values in this plan.
- [ ] Recon report loaded for visual verification during execution.
- [ ] Master plan: N/A; direction doc loaded.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FrostedCard subdued padding (default `p-5` vs override `p-4 sm:p-6`) | DEFAULT (`p-5`) at planning time; override only if mobile reads too tight at 375px | Direction doc accepts the slight tightening (recon item 7). Override is the documented escape hatch; record choice in Execution Log. |
| Button `asChild` (Path A) vs subtle-variant class strings on Link (Path B) | PATH A (`<Button variant="subtle" size="md" asChild><Link>...</Link></Button>`) | Spec 6A precedent verified working. Path B is the documented fallback if `asChild` regresses on `<Link>`. |
| Inline completion banner (ChallengeDetail lines 472–484) | DELETE — state machine confirms redundancy | `setJustCompletedFinalDay(true)` and `setCompletionOverlay({...})` fire on the same tick at lines 147 + 150. The banner flashes briefly behind the overlay and is functionally invisible. STOP and flag only if Step 2 verification surfaces a flow where the banner is load-bearing. |
| `'has all-dark background'` test (ReadingPlanDetail.test.tsx ~line 220–225) | ATTEMPT no test change; verify it still resolves post-migration. If it breaks, update query to `.bg-dashboard-dark` explicitly OR replace with a structural assertion (e.g., `container.firstChild` querying the outer wrapper) | The test queries `.bg-hero-dark` which today resolves to the Navbar's non-transparent variant (`Navbar.tsx:182` — when `transparent={false}`, applies `bg-hero-dark`). ReadingPlanDetail uses `<Layout>` with default `transparent={false}` — so the Navbar provides `bg-hero-dark`. Wrapping below-hero content in BackgroundCanvas does NOT change this. The test should pass unchanged. Record in Execution Log. |
| ReadingPlanDetail outer `<div className="min-h-screen bg-dashboard-dark">` (line 189) | KEEP as outer; place `<BackgroundCanvas>` inside, wrapping content from line ~190 (the hero `<section>`) through the bottom of the body BEFORE the `PlanCompletionOverlay` portal sibling | Recon item 10. Same pattern Spec 6A used on `/grow`: `bg-dashboard-dark` is the dark base color foundation; BackgroundCanvas is the atmospheric layer on top. **Hero stays OUTSIDE the BackgroundCanvas wrapper** so `ATMOSPHERIC_HERO_BG` is the hero's atmospheric layer (Spec 6A precedent — Spec 6A wrapped only `<main>` content below the hero on `/grow`). Confirmed by recon item 10. |
| ChallengeDetail outer wrapper | KEEP `<Layout transparentNav>` exactly as-is | Recon item 11. Layout's `'contents'` shape with `transparentNav` and the `#08051A` baseline on html/body/#root is sufficient. BackgroundCanvas wrapper goes INSIDE `<Layout transparentNav>` AFTER the hero `<section>`. |
| Hero scope under BackgroundCanvas | Hero stays OUTSIDE the BackgroundCanvas wrapper on BOTH pages | Direction Decision 2 explicitly preserves `ATMOSPHERIC_HERO_BG` on the hero; BackgroundCanvas fills below. ChallengeDetail also preserves the themeColor halo composition exactly. |
| Completion overlay sibling positioning | PlanCompletionOverlay (ReadingPlanDetail line 318) and ChallengeCompletionOverlay (ChallengeDetail line 555) stay as PORTAL-STYLE SIBLINGS to BackgroundCanvas, not children | Behavior preservation Requirement A. The overlays render at the page root after the BackgroundCanvas wrapper closes. The conditional `{completionOverlay && <ChallengeCompletionOverlay ... />}` and `{showPlanOverlay && <PlanCompletionOverlay ... />}` blocks stay at their current line positions in the JSX tree. |
| Italic on prayer text (DayContent line 56) | PRESERVED | Recon Q2 ruling — italic exception extends from scripture to prayer voice. Direction Decision 4 covers scripture; recon explicitly extends to prayer. |
| Sound effect asymmetry harmonization | OUT OF SCOPE | Recon Q8 — future product decision. ChallengeDetail keeps its `playSoundEffect('ascending')`; ReadingPlanDetail keeps no sound. |
| ReadingPlanDetail loading state (`<Layout><div className="flex min-h-screen items-center justify-center bg-dashboard-dark">...</div></Layout>` at lines 146–156) | LEAVE unchanged | Loading state is brief, not user-facing for any meaningful duration; no migration value. |
| `titleWords.split(' ')` derivation locals (ReadingPlanDetail lines 160–162: `titleWords`, `titleLastWord`, `titlePrefix`) | DELETE in same change set as the h1 migration (Change 2) | Cleanup pass — locals become unused after `<span className="font-script">` is removed. |

---

## Implementation Steps

### Step 0: Pre-execution recon + baselines

**Objective:** Confirm Spec 6A is merged, direction doc and recon are present, capture baselines, and read all 8 implementation files + 4 test files for current state.

**Files to create/modify:** None — this is a recon step.

**Details:**

1. Verify Spec 6A is merged. Inspect `frontend/src/pages/GrowPage.tsx` for the `BackgroundCanvas` wrap below the hero. Inspect `frontend/src/components/reading-plans/PlanCard.tsx` for `FrostedCard variant="default"` consumption. Inspect `frontend/src/components/challenges/UpcomingChallengeCard.tsx` for `Button asChild` usage on "View Details." Inspect `frontend/src/components/reading-plans/FilterBar.tsx` — should NOT exist (deleted in Spec 6A). If any of these conditions fail, STOP and flag.
2. Verify `_plans/direction/grow-2026-05-04.md` is present.
3. Verify `_plans/recon/grow-detail-pages-2026-05-04.md` is present.
4. Capture test baseline:
   ```
   cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80
   pnpm typecheck
   pnpm lint
   ```
   Record total pass/fail counts in Execution Log (Step 0 row). CLAUDE.md baseline: **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`). Live numbers authoritative.
5. Read each of the 8 implementation files in scope (ReadingPlanDetail, ChallengeDetail, DayContent, ChallengeDayContent, DaySelector, ChallengeDaySelector, PlanNotFound, ChallengeNotFound) to confirm current import sets, current chrome tokens, and current conditional-rendering branches. Confirm:
   - ReadingPlanDetail.tsx lines 160–162 have the `titleWords.split(' ')` derivation; line 200 has `<span className="font-script">{titleLastWord}</span>`; line 203 has `font-serif italic text-white/60`; line 189 has `<div className="min-h-screen bg-dashboard-dark">`.
   - ChallengeDetail.tsx line 222–225 has the `heroStyle` composition; line 250 has `<Layout transparentNav>`; line 271–276 has the gradient h1 (no font-script — already correct); line 278–280 has `font-serif italic text-white/60`; lines 472–484 have the inline completion banner.
   - DayContent.tsx line 62 has `<section ... ref={ref}>`; line 63 has `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">`; lines 27, 56 have scripture/prayer italic.
   - ChallengeDayContent.tsx line 81–82 has the rolls-own action callout; lines 86, 98, 126 have theme-color inline styles; line 131–141 has ChallengeShareButton.
   - PlanNotFound.tsx + ChallengeNotFound.tsx lines 18–23 each have `font-script text-2xl text-primary` recovery links.
6. Read each of the 4 test files to confirm at-risk assertions:
   - `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` — confirm lines 220–225 query `document.querySelector('.bg-hero-dark')`. Check Navbar usage to confirm `.bg-hero-dark` resolves at runtime via `<Navbar transparent={false}>`.
   - `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — grep for any assertion mentioning the inline completion banner content ("You've completed", "incredible journey"). Recon: none. Re-verify.
   - `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` — grep for chrome class assertions. Recon: none. Re-verify.
   - `frontend/src/components/challenges/__tests__/accessibility.test.tsx` lines ~242–263 — confirm `container.querySelector('button')` finds Mark Complete button. FrostedCard subdued is non-interactive (no `onClick`), button count stays at 1.

**Auth gating (if applicable):** N/A — recon step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any files in this step.
- DO NOT run any git command beyond status/log/diff (read-only).
- DO NOT trigger any file watcher or `pnpm dev` server during baseline capture.

**Test specifications:** None — read-only.

**Expected state after completion:**
- [ ] Pre-execution baseline pass/fail counts recorded in Execution Log.
- [ ] Spec 6A merge state confirmed.
- [ ] Direction doc + recon presence confirmed.
- [ ] All 8 implementation files + 4 test files read; current chrome tokens/branches confirmed.

---

### Step 1: Verify FrostedCard `subdued` + Button `asChild` prop API

**Objective:** Confirm at execution time the prop signatures planning relied on are still valid.

**Files to create/modify:** None.

**Details:**

1. Open `frontend/src/components/homepage/FrostedCard.tsx`. Confirm:
   - Line 3: `type FrostedCardVariant = 'accent' | 'default' | 'subdued'`
   - Lines 39–42: `subdued` variant resolves to `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`
   - Lines 7–23: prop signature includes `as: 'div' | 'button' | 'article' | 'section'`, optional `eyebrow`, `eyebrowColor`, `style`, `className`
   - Lines 78–86: hover and active styles applied only when `onClick` is provided (`isInteractive = !!onClick`)
2. Open `frontend/src/components/ui/Button.tsx`. Confirm:
   - Line 14: `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'`
   - Line 16: `asChild?: boolean`
   - Lines 51–52: `subtle` variant classes
   - Lines 68–84: `asChild` cloneElement logic
3. Open `frontend/src/components/challenges/UpcomingChallengeCard.tsx` (Spec 6A precedent). Confirm `<Button variant="subtle" size="md" asChild><Link to="...">View Details</Link></Button>` shape is in production and currently working. (Verifies Path A is the chosen-and-validated path; Path B is fallback only.)
4. Decision: PATH A is the planned approach for Changes 9b + 10b. Document.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any prop signatures in FrostedCard or Button.
- DO NOT introduce a new variant on either primitive.

**Test specifications:** None — verification only.

**Expected state after completion:**
- [ ] FrostedCard prop API verified; `subdued` variant class string confirmed.
- [ ] Button `subtle` variant + `asChild` prop verified.
- [ ] Path A confirmed for NotFound recovery-link migration.

---

### Step 2: State-machine verification on ChallengeDetail (gate for Change 6)

**Objective:** Confirm the inline completion banner at ChallengeDetail.tsx lines 472–484 is genuinely redundant before deletion. STOP and flag if any flow surfaces where the banner is load-bearing.

**Files to create/modify:** None.

**Details:**

1. Open `frontend/src/pages/ChallengeDetail.tsx` lines 138–171 (`handleMarkComplete`).
2. Trace every path:
   - Line 143: `completeDay(challengeId, selectedDay, recordActivityForChallenge)` returns `result: CompletionResult`.
   - Line 144: `playSoundEffect('ascending')` fires.
   - Line 146 `if (result.isCompletion)`: line 147 `setJustCompletedFinalDay(true)`; lines 148–156 `setCompletionOverlay({...})`. Both fire on the same React commit; both state setters batch.
   - Line 157 `else`: only milestone logic; `justCompletedFinalDay` is NOT set.
3. Confirm there is NO branch where `setJustCompletedFinalDay(true)` is called WITHOUT `setCompletionOverlay({...})`. (Verified at planning: lines 147 + 150 are inside the same `if (result.isCompletion)` block; impossible to set one without the other.)
4. Confirm there is NO place ELSEWHERE in the file that sets `justCompletedFinalDay`. Grep: `grep -n "setJustCompletedFinalDay" frontend/src/pages/ChallengeDetail.tsx`. Should return ONLY line 147 (the setter call) and the useState declaration at line 94.
5. Confirm `setCompletionOverlay(null)` only fires from the overlay's `onDismiss` (line 561). After dismissal, `justCompletedFinalDay` REMAINS `true` (state never reset). This means after the user dismisses the overlay, the inline banner WOULD appear — but in practice, the user navigates away or the page unmounts on route change. If the user stays and dismisses, they would see the inline banner. **This is a real UX path.** Examine: does the inline banner add value AFTER overlay dismissal?
6. Decision per direction doc and spec: the overlay IS the canonical celebration moment. The inline banner duplicates the overlay's content (challenge title + participant count) less elegantly. Direction doc Decision 7 mapping table treats the inline banner as redundant; the spec lists the deletion as Change 6.
7. **DECISION GATE:** If after reading Step 2 verification, the planner/executor concludes there IS a flow where the banner serves real value (e.g., the user dismisses the overlay and wants persistent celebration), STOP and flag for user discussion before applying Change 6. Otherwise, proceed with the documented clean delete.
8. Document the verification result in Execution Log Step 2 row: "State-machine verified — banner redundant. Proceeding with Change 6 clean delete." OR "State-machine verified — banner load-bearing in dismissal flow. STOPPING; user discussion required."

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any state-setter logic.
- DO NOT delete the inline banner in this step. Deletion happens in Step 8 (Change 6) only after this verification passes.

**Test specifications:** None — verification only.

**Expected state after completion:**
- [ ] State-machine traced and documented.
- [ ] Decision gate result recorded in Execution Log.

---

### Step 3: Change 1 — ReadingPlanDetail BackgroundCanvas wrap

**Objective:** Wrap below-hero content in `<BackgroundCanvas>` while preserving the outer `<div className="min-h-screen bg-dashboard-dark">` wrapper, the hero's `ATMOSPHERIC_HERO_BG`, and the PlanCompletionOverlay portal sibling.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — add `BackgroundCanvas` import; restructure JSX so the BackgroundCanvas wraps the content from after the hero `<section>` through the bottom of the body, with PlanCompletionOverlay remaining a sibling.

**Details:**

1. Add import at the top of the file (alphabetical with other `@/components/ui/*` imports if any; keep grouped with other UI imports — match existing style):
   ```tsx
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   ```
2. Restructure the return statement (currently lines 180–328). The outer `<Layout>` and the inner `<div className="min-h-screen bg-dashboard-dark">` stay. The hero `<section>` (lines 191–236) stays as a direct child of `<div className="min-h-screen bg-dashboard-dark">`. The Breadcrumb, DayContent, DayCompletionCelebration, and day-navigation block (lines 239–313) move INSIDE a new `<BackgroundCanvas>` wrapper. The `</div>` for `bg-dashboard-dark` closes after BackgroundCanvas. PlanCompletionOverlay (lines 317–326) remains as a sibling to `bg-dashboard-dark` (still inside `<Layout>` but OUTSIDE the dark wrapper — same as today).

   **Target shape (paraphrased — preserve every other detail exactly):**
   ```tsx
   return (
     <Layout>
       <SEO ... />
       <div className="min-h-screen bg-dashboard-dark">
         <section className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40" style={ATMOSPHERIC_HERO_BG}>
           {/* hero content — UNCHANGED in this step */}
         </section>

         <BackgroundCanvas>
           <Breadcrumb ... />
           {currentDayContent && (<DayContent day={currentDayContent} ref={actionStepRef} />)}
           {justCompletedDay === selectedDay && (...)}
           <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
             {/* day navigation — UNCHANGED */}
           </div>
         </BackgroundCanvas>
       </div>

       {showPlanOverlay && (
         <PlanCompletionOverlay ... />
       )}
     </Layout>
   )
   ```
3. Verify `BackgroundCanvas` does NOT introduce a positioned ancestor that would break the IntersectionObserver. The IO observer at line 66–87 observes `actionStepRef.current` (the `<section ref={ref}>` inside DayContent at DayContent.tsx:62). BackgroundCanvas is `position: relative` (line 20: `relative min-h-screen overflow-hidden`). The observer uses the default root (viewport), so a non-scrolling `position: relative` ancestor does NOT change the observed element's intersection ratio with the viewport. Behavior preserved.
4. Verify `BackgroundCanvas` `min-h-screen` does not double up with the outer `<div className="min-h-screen bg-dashboard-dark">`. Both apply `min-h-screen` (each at least viewport height). The outer's `min-h-screen` ensures the dark base color extends below; BackgroundCanvas's `min-h-screen` ensures the atmospheric bloom extends below. Together they render correctly — the outer wins for the bottom edge if BackgroundCanvas's content is shorter (fills with `bg-dashboard-dark`); BackgroundCanvas's atmospheric layer covers above. Verify visually at execution time.
5. Visual smoke: after the change, scroll past the hero on `/reading-plans/finding-peace-in-anxiety`. Atmospheric blooms must be gently visible behind day content + day selector. Hero retains `ATMOSPHERIC_HERO_BG`'s purple ellipse. PlanCompletionOverlay still renders as a portal-style sibling (only on completion).

**Auth gating:** N/A — page is public.

**Responsive behavior:**
- Desktop (1440px): BackgroundCanvas atmospheric blooms visible behind day content section centered in `max-w-2xl`. Hero `ATMOSPHERIC_HERO_BG` visible in the hero zone.
- Tablet (768px): same as desktop.
- Mobile (375px): BackgroundCanvas atmospheric blooms visible behind day content; full-width on narrow viewport. Hero `ATMOSPHERIC_HERO_BG` visible.

**Inline position expectations:** N/A — wrapper change does not affect inline layouts.

**Guardrails (DO NOT):**
- DO NOT remove the outer `<div className="min-h-screen bg-dashboard-dark">`.
- DO NOT move the hero `<section>` inside `<BackgroundCanvas>`. Hero stays OUTSIDE.
- DO NOT move `PlanCompletionOverlay` inside `<BackgroundCanvas>`. It must remain a sibling.
- DO NOT modify `BackgroundCanvas.tsx` source.
- DO NOT add a damping overlay; visual tuning is post-migration if required, not during.
- DO NOT change any class strings inside the hero, Breadcrumb, DayContent, DayCompletionCelebration, or day-navigation in this step.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) `'has all-dark background'` | integration (via render + querySelector) | Should still pass — `<Layout transparent={false}>` renders Navbar with `bg-hero-dark`. Verify after change. |
| (existing) page-level smoke tests | integration | All ~19 existing tests should pass without modification. Verify. |

**Expected state after completion:**
- [ ] `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` added.
- [ ] BackgroundCanvas wraps below-hero content (Breadcrumb through day-navigation block).
- [ ] Hero stays OUTSIDE BackgroundCanvas.
- [ ] PlanCompletionOverlay stays a sibling to the BackgroundCanvas wrapper.
- [ ] `bg-dashboard-dark` outer wrapper preserved.
- [ ] Visual smoke confirms blooms visible behind day content; observer wiring intact.

---

### Step 4: Change 2 — ReadingPlanDetail h1 Caveat removal

**Objective:** Remove the `<span className="font-script">{titleLastWord}</span>` from the hero h1 so the entire title renders uniformly with `GRADIENT_TEXT_STYLE`. Delete the now-unused `titleWords.split(' ')` derivation locals.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — modify h1 at line 199–201; delete `titleWords` / `titleLastWord` / `titlePrefix` locals at lines 160–162.

**Details:**

1. Replace lines 199–201:
   ```tsx
   {/* before */}
   <h1 className="mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
     {titlePrefix} <span className="font-script">{titleLastWord}</span>
   </h1>
   ```
   →
   ```tsx
   {/* after */}
   <h1 className="mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
     {plan.title}
   </h1>
   ```
2. Delete the now-unused locals at lines 160–162:
   ```tsx
   const titleWords = plan.title.split(' ')
   const titleLastWord = titleWords[titleWords.length - 1]
   const titlePrefix = titleWords.slice(0, -1).join(' ')
   ```
3. Verify no other code in the file references `titleWords`, `titleLastWord`, or `titlePrefix`. Grep: `grep -n "titleWords\|titleLastWord\|titlePrefix" frontend/src/pages/ReadingPlanDetail.tsx`. Should return 0 matches after deletion.
4. Visual smoke: hero h1 reads as a single uniform gradient phrase (e.g., "Finding Peace in Anxiety" entirely in white-to-purple gradient — no Caveat tail).

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): h1 renders `text-5xl` uniform gradient.
- Tablet (768px): h1 renders `text-4xl` uniform gradient.
- Mobile (375px): h1 renders `text-3xl` uniform gradient.

**Inline position expectations:** N/A — single-element heading.

**Guardrails (DO NOT):**
- DO NOT change any other classes on the h1 (`mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2`).
- DO NOT change `style={GRADIENT_TEXT_STYLE}`.
- DO NOT delete `plan.title` — that is the actual data being rendered.
- DO NOT introduce any new locals.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (new, optional) hero h1 has no Caveat | integration | Mirror Spec 6A precedent on ChallengeDetail.test.tsx line 259–264: `expect(h1.querySelector('.font-script')).toBeNull()`. Acceptable to add as a single test in ReadingPlanDetail.test.tsx; not strictly required since the h1 already has no Caveat after migration and existing tests pass. Decision: only add if `pnpm test --run` surfaces a regression that suggests the assertion would have caught it. |
| (existing) `'displays plan title and metadata'` | integration | Should still pass — query is `findByRole('heading', { level: 1, name: /finding peace in anxiety/i })` style. Verify. |

**Expected state after completion:**
- [ ] `<span className="font-script">` removed from h1.
- [ ] `titleWords`, `titleLastWord`, `titlePrefix` locals deleted.
- [ ] `pnpm typecheck` passes.
- [ ] Visual smoke confirms uniform gradient h1 with no Caveat tail.

---

### Step 5: Change 3 — ReadingPlanDetail hero subtitle migration

**Objective:** Migrate hero subtitle from `font-serif italic text-white/60` to `text-white/70 leading-relaxed` (Direction Decision 3).

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — modify subtitle `<p>` at line 203–205.

**Details:**

1. Replace lines 203–205:
   ```tsx
   {/* before */}
   <p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
     {plan.description}
   </p>
   ```
   →
   ```tsx
   {/* after */}
   <p className="mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg">
     {plan.description}
   </p>
   ```
2. Verify the resulting class string matches the same migration Spec 6A used for `/grow` hero subtitle. Cross-reference `frontend/src/pages/GrowPage.tsx` if needed.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): subtitle renders `text-lg` plain prose with `leading-relaxed`.
- Tablet (768px): same as desktop.
- Mobile (375px): subtitle renders `text-base` plain prose with `leading-relaxed`.

**Inline position expectations:** N/A — single-element subtitle.

**Guardrails (DO NOT):**
- DO NOT change `mx-auto mt-3 max-w-xl` or `text-base` or `sm:text-lg` (these stay).
- DO NOT introduce any italic, font-serif, or other decorative typography.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) subtitle text rendering | integration | Existing test that asserts `screen.findByText(plan.description)` passes unchanged — text content unchanged. |

**Expected state after completion:**
- [ ] Subtitle class string is `mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg`.
- [ ] DOM inspection confirms `font-serif` and `italic` classes absent on subtitle `<p>`.

---

### Step 6: Change 4 — ChallengeDetail BackgroundCanvas wrap

**Objective:** Wrap below-hero content in `<BackgroundCanvas>` inside `<Layout transparentNav>`, while preserving the heroStyle (themeColor halo + ATMOSPHERIC_HERO_BG) and the ChallengeCompletionOverlay portal sibling.

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — add `BackgroundCanvas` import; restructure JSX so the BackgroundCanvas wraps below-hero content from Breadcrumb through day-navigation block, with hero `<section>` OUTSIDE and ChallengeCompletionOverlay remaining a sibling.

**Details:**

1. Add import:
   ```tsx
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   ```
2. Restructure the return statement (currently lines 249–565):

   **Current shape (paraphrased):**
   ```tsx
   <Layout transparentNav>
     <SEO ... />
     <section style={heroStyle}>...</section>
     <Breadcrumb ... />
     {activeMilestone && <MilestoneCard ... />}
     {showDayContent && <ChallengeDayContent ... />}
     <CommunityFeed ... />
     {justCompletedFinalDay && <inline banner />}
     {!isFutureChallenge && <day-navigation block>}
     {switchDialog && <SwitchChallengeDialog ... />}
     {completionOverlay && <ChallengeCompletionOverlay ... />}
   </Layout>
   ```

   **Target shape:**
   ```tsx
   <Layout transparentNav>
     <SEO ... />
     <section style={heroStyle}>...</section>

     <BackgroundCanvas>
       <Breadcrumb ... />
       {activeMilestone && <MilestoneCard ... />}
       {showDayContent && <ChallengeDayContent ... />}
       <CommunityFeed ... />
       {justCompletedFinalDay && <inline banner />}        {/* deleted in Step 8 */}
       {!isFutureChallenge && <day-navigation block>}
     </BackgroundCanvas>

     {switchDialog && <SwitchChallengeDialog ... />}
     {completionOverlay && <ChallengeCompletionOverlay ... />}
   </Layout>
   ```
3. SwitchChallengeDialog and ChallengeCompletionOverlay remain SIBLINGS to BackgroundCanvas (still inside `<Layout transparentNav>` but OUTSIDE BackgroundCanvas). This preserves portal-render sibling positioning.
4. Hero `<section>` stays OUTSIDE BackgroundCanvas. The `heroStyle` composition at lines 222–225 (themeColor halo + ATMOSPHERIC_HERO_BG) is unchanged.
5. Visual smoke: navigate to `/challenges/<active-id>`. Atmospheric blooms gently visible behind ChallengeDayContent + day selector + CommunityFeed. Hero retains its themeColor halo composed with the canonical purple ellipse. Theme-color Mark Complete button renders with seasonal palette.

**Auth gating:** N/A — page is public.

**Responsive behavior:**
- Desktop (1440px): BackgroundCanvas blooms behind below-hero content; hero composition intact.
- Tablet (768px): same as desktop.
- Mobile (375px): same.

**Inline position expectations:** N/A — wrapper change.

**Guardrails (DO NOT):**
- DO NOT remove `<Layout transparentNav>`.
- DO NOT move the hero `<section>` inside BackgroundCanvas.
- DO NOT move ChallengeCompletionOverlay or SwitchChallengeDialog inside BackgroundCanvas.
- DO NOT modify `heroStyle` composition (lines 222–225).
- DO NOT add a `bg-dashboard-dark` outer wrapper (ChallengeDetail relies on Layout + #08051A baseline; recon item 11).
- DO NOT change any class strings inside the hero, Breadcrumb, MilestoneCard, ChallengeDayContent, CommunityFeed, day-navigation, or overlays in this step.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) page-level smoke tests | integration | All ~21 existing tests should pass without modification. Verify. |
| (existing) `'hero h1 does NOT use font-script'` (line 259–264) | integration | Already passes today; should continue. Verify. |

**Expected state after completion:**
- [ ] `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` added.
- [ ] BackgroundCanvas wraps below-hero content (Breadcrumb through day-navigation block).
- [ ] Hero stays OUTSIDE BackgroundCanvas.
- [ ] heroStyle composition preserved (themeColor halo + ATMOSPHERIC_HERO_BG).
- [ ] ChallengeCompletionOverlay + SwitchChallengeDialog stay siblings to BackgroundCanvas.

---

### Step 7: Change 5 — ChallengeDetail hero subtitle migration

**Objective:** Migrate hero subtitle from `font-serif italic text-white/60` to `text-white/70 leading-relaxed` (Direction Decision 3 — same migration as Step 5 on ReadingPlanDetail).

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — modify subtitle `<p>` at line 278–280.

**Details:**

1. Replace lines 278–280:
   ```tsx
   {/* before */}
   <p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
     {challenge.description}
   </p>
   ```
   →
   ```tsx
   {/* after */}
   <p className="mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg">
     {challenge.description}
   </p>
   ```
2. Verify class string matches the migration Step 5 just applied to ReadingPlanDetail.

**Auth gating:** N/A.

**Responsive behavior:** Same as Step 5 (subtitle reads `text-base` mobile, `text-lg` tablet+, plain prose with `leading-relaxed` at all breakpoints).

**Inline position expectations:** N/A — single-element subtitle.

**Guardrails (DO NOT):**
- DO NOT change `mx-auto mt-3 max-w-xl` or sizing classes.
- DO NOT introduce italic, font-serif, or other decorative typography.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) subtitle text rendering | integration | Text content unchanged; existing assertions pass. |

**Expected state after completion:**
- [ ] Subtitle class string is `mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg`.
- [ ] DOM inspection confirms `font-serif` and `italic` classes absent.

---

### Step 8: Change 6 — ChallengeDetail inline completion banner deletion

**Objective:** Delete the inline `{justCompletedFinalDay && (...)}` banner at lines 472–484 (post-migration line numbers may shift slightly after Step 6's wrapper change). ChallengeCompletionOverlay remains the canonical celebration surface.

**Pre-condition:** Step 2 state-machine verification PASSED with "banner redundant" decision. If Step 2 surfaced any flow where the banner is load-bearing, this step is REPLACED by "banner preservation rationale documented in Execution Log; banner kept as-is."

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — delete the inline banner block (current lines 472–484).

**Details:**

1. Locate the block (post-Step-6 placement is INSIDE BackgroundCanvas; post-Step-8 it is removed entirely):
   ```tsx
   {justCompletedFinalDay && (
     <div className="mx-auto max-w-2xl px-4 sm:px-6">
       <div className="rounded-2xl border border-success/20 bg-success/10 p-6 text-center">
         <p className="text-lg font-semibold text-white">
           You&apos;ve completed {challenge.title}!
         </p>
         <p className="mt-2 text-sm text-white/70">
           What an incredible journey. {participantCount.toLocaleString()} others
           completed this challenge with you.
         </p>
       </div>
     </div>
   )}
   ```
2. Delete the entire block (the entire `{justCompletedFinalDay && (...)}` JSX expression).
3. Verify no other code references `justCompletedFinalDay` for rendering. The state setter at line 147 (`setJustCompletedFinalDay(true)`) and the useState declaration at line 94 (`const [justCompletedFinalDay, setJustCompletedFinalDay] = useState(false)`) STAY — the state is still set on completion (preserving the state-machine), but the inline banner is no longer rendered. **Do NOT delete the useState or the setter call** — that would be a wider behavior change that requires its own decision. The state is now an internal flag with no UI consumer; that is acceptable and the smaller, safer migration.

   _Alternative consideration:_ delete `justCompletedFinalDay` state entirely (useState declaration + setter call). However, the state is set inside `handleMarkComplete` at line 147 which has no other callers; deleting it would have zero behavioral effect and simplify the file. **Decision: leave the state in place.** Rationale: smaller diff; preserves the state machine in case a future product decision wants to reintroduce a celebration surface gated on the same flag.

   _Final rule for this step:_ delete ONLY the JSX render block, not the state declaration or setter.

4. Visual smoke: navigate to `/challenges/<id>`, log in, complete every day. On final-day Mark Complete, confirm only the ChallengeCompletionOverlay portal renders. No inline `border-success/20 bg-success/10` banner appears beneath it.

**Auth gating:** N/A (final-day completion path requires `isCurrentDay && isAuthenticated && !isPastChallenge` — preserved via existing wiring).

**Responsive behavior:** N/A: deleted UI element.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT delete `useState(false)` declaration at line 94.
- DO NOT delete `setJustCompletedFinalDay(true)` call at line 147.
- DO NOT modify ChallengeCompletionOverlay or its rendering condition (`{completionOverlay && ...}`).
- DO NOT delete in this step if Step 2 surfaced a flow where the banner is load-bearing — STOP and flag.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) ChallengeDetail.test.tsx tests | integration | Recon confirmed no test asserts on the inline banner. Verify all existing tests still pass. If any test queries for "You've completed" or "incredible journey" copy, remove the assertion in this step. |

**Expected state after completion:**
- [ ] Inline `{justCompletedFinalDay && (...)}` JSX block removed.
- [ ] `justCompletedFinalDay` useState + setter STAY in place (smaller diff).
- [ ] On final-day Mark Complete, only ChallengeCompletionOverlay renders.
- [ ] No tests reference the deleted banner copy.

---

### Step 9: Change 7 — DayContent action callout chrome migration

**Objective:** Replace inner `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` at DayContent.tsx line 63 with `<FrostedCard variant="subdued">`. Preserve the outer `<section ref={ref}>`, the `border-t border-white/10` divider, and the eyebrow heading. The IntersectionObserver wiring on `actionStepRef` (forwarded into the outer `<section>`) is preserved.

**Files to create/modify:**
- `frontend/src/components/reading-plans/DayContent.tsx` — add `FrostedCard` import; replace inner `<div>` at line 63 with `<FrostedCard variant="subdued">`.

**Details:**

1. Add import:
   ```tsx
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```
2. Replace the inner div at lines 63–68:
   ```tsx
   {/* before */}
   <section className="border-t border-white/10 py-8 sm:py-10" ref={ref}>
     <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
       <p className="text-sm text-white/60">Today&apos;s Action Step</p>
       <p className="mt-2 text-lg font-medium text-white">
         {day.actionStep}
       </p>
     </div>
   </section>
   ```
   →
   ```tsx
   {/* after */}
   <section className="border-t border-white/10 py-8 sm:py-10" ref={ref}>
     <FrostedCard variant="subdued">
       <p className="text-sm text-white/60">Today&apos;s Action Step</p>
       <p className="mt-2 text-lg font-medium text-white">
         {day.actionStep}
       </p>
     </FrostedCard>
   </section>
   ```
3. Verify the outer `<section ref={ref}>` is UNTOUCHED — ref forwarding still goes to the outer section element.
4. Verify the eyebrow heading "Today's Action Step" stays as `<p className="text-sm text-white/60">` (NOT promoted to FrostedCard's `eyebrow` prop, because the FrostedCard `eyebrow` prop renders an uppercase tracked-widest dot+label format which differs visually from the existing eyebrow. The recon's "preserve eyebrow heading" requirement and the "FrostedCard subdued is non-interactive" rule both argue for keeping the eyebrow as a plain `<p>` inside the FrostedCard children.)
5. Padding side effect: FrostedCard subdued's default `p-5` replaces the original `p-4 sm:p-6`. Visual gate: if the action callout reads too tight at 375px, override with `<FrostedCard variant="subdued" className="p-4 sm:p-6">`. Document the chosen padding in Execution Log.
6. Visual smoke + IO observer smoke: log in (so the IO observer at ReadingPlanDetail line 66–87 fires), navigate to `/reading-plans/<id>` Day N where N is `progress.currentDay`, scroll until the action-step section reaches 50% visibility. Confirm `recordActivity('readingPlan', 'reading_plan')` fires (verifiable via dashboard streak/points update OR via React DevTools Profiler showing `setJustCompletedDay` state change). If the observer fails to fire, check that `actionStepRef.current` resolves to the outer `<section>` and that the section's boundingbox geometry is not changed by FrostedCard subdued's `rounded-3xl` (it is not — radius only affects visual rendering, not geometry).

**Auth gating:** Day-completion via observer only fires when `isAuthenticated` (preserved via existing guard at line 67 of ReadingPlanDetail).

**Responsive behavior:**
- Desktop (1440px): FrostedCard subdued reads as `rounded-3xl p-5` quieter chrome inside the action-step section.
- Tablet (768px): same; if `p-5` reads too tight, override applied at `sm:p-6`.
- Mobile (375px): FrostedCard subdued at `p-5` (or `p-4` if override applied).

**Inline position expectations:** N/A — single-content panel.

**Guardrails (DO NOT):**
- DO NOT move `ref={ref}` to the FrostedCard. The ref must stay on the outer `<section>`.
- DO NOT remove the `<section className="border-t border-white/10 py-8 sm:py-10">` wrapper.
- DO NOT use FrostedCard's `eyebrow` prop. Keep the existing `<p className="text-sm text-white/60">` eyebrow inline.
- DO NOT add any onClick or interactive behavior to FrostedCard (must stay non-interactive — button count must not change).
- DO NOT migrate scripture italic (line 27) or prayer italic (line 56) or any other section.
- DO NOT change section dividers `border-t border-white/10 py-8 sm:py-10` on any of the 4 sections.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) DayContent.test.tsx single test (`'reading plan day reference is a link'`) | integration | Asserts VerseLink href; not affected by chrome change. Verify still passes. |
| (existing) ReadingPlanDetail.test.tsx page tests | integration | ~19 tests; verify all pass. The chrome change is internal to DayContent; page-level assertions are unaffected. |

**Expected state after completion:**
- [ ] `import { FrostedCard } from '@/components/homepage/FrostedCard'` added.
- [ ] Inner `<div>` chrome replaced by `<FrostedCard variant="subdued">`.
- [ ] Outer `<section ref={ref}>` preserved.
- [ ] Eyebrow heading + action-step copy preserved as children.
- [ ] IO observer continues to fire (verified by smoke test).
- [ ] Padding choice documented in Execution Log (default `p-5` vs override `p-4 sm:p-6`).

---

### Step 10: Change 8 — ChallengeDayContent action callout chrome migration

**Objective:** Replace inner `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` at ChallengeDayContent.tsx line 82 with `<FrostedCard variant="subdued">`. Preserve all theme-color inline styles (ActionIcon, Mark Complete, "Go to {action}" Link), the ChallengeShareButton, the eyebrow heading row (ActionIcon + h3), the section divider, and the scripture italic.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeDayContent.tsx` — add `FrostedCard` import; replace inner `<div>` at line 82 with `<FrostedCard variant="subdued">`.

**Details:**

1. Add import:
   ```tsx
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```
2. Replace lines 81–143:
   ```tsx
   {/* before */}
   <section className="border-t border-white/10 py-8 sm:py-10">
     <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
       <div className="mb-3 flex items-center gap-3">
         <ActionIcon className="h-5 w-5 shrink-0" style={{ color: themeColor }} aria-hidden="true" />
         <h3 className="text-sm text-white/60">Today&apos;s action:</h3>
       </div>
       <p className="text-lg font-medium text-white">{day.dailyAction}</p>

       {isCurrentDay && isAuthenticated && !isPastChallenge && (
         <button type="button" onClick={onMarkComplete} className="mt-4 w-full min-h-[44px] rounded-lg py-3 text-center font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70" style={{ backgroundColor: themeColor }}>
           Mark Complete
         </button>
       )}

       <Link to={...} state={...} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium transition-opacity motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70" style={{ color: themeColor }}>
         Go to {actionLabel} &rarr;
       </Link>

       {isAuthenticated && challengeId && challengeTitle && completedDaysCount > 0 && (
         <ChallengeShareButton ... />
       )}
     </div>
   </section>
   ```
   →
   ```tsx
   {/* after */}
   <section className="border-t border-white/10 py-8 sm:py-10">
     <FrostedCard variant="subdued">
       <div className="mb-3 flex items-center gap-3">
         <ActionIcon className="h-5 w-5 shrink-0" style={{ color: themeColor }} aria-hidden="true" />
         <h3 className="text-sm text-white/60">Today&apos;s action:</h3>
       </div>
       <p className="text-lg font-medium text-white">{day.dailyAction}</p>

       {isCurrentDay && isAuthenticated && !isPastChallenge && (
         <button type="button" onClick={onMarkComplete} className="mt-4 w-full min-h-[44px] rounded-lg py-3 text-center font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70" style={{ backgroundColor: themeColor }}>
           Mark Complete
         </button>
       )}

       <Link to={...} state={...} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium transition-opacity motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70" style={{ color: themeColor }}>
         Go to {actionLabel} &rarr;
       </Link>

       {isAuthenticated && challengeId && challengeTitle && completedDaysCount > 0 && (
         <ChallengeShareButton ... />
       )}
     </FrostedCard>
   </section>
   ```
3. Verify every theme-color inline style is byte-identical (ActionIcon line 84–88, Mark Complete line 96–101, "Go to" Link line 104–129).
4. Verify ChallengeShareButton props (line 131–141) are byte-identical.
5. Verify the eyebrow row `<div className="mb-3 flex items-center gap-3">` with ActionIcon + h3 is byte-identical (do NOT promote to FrostedCard `eyebrow` prop — same reasoning as DayContent: the eyebrow includes a Lucide icon with theme-color inline style, which the FrostedCard `eyebrow` prop's dot+label shape cannot represent).
6. Padding side effect: same as Step 9. Default `p-5` from FrostedCard subdued. Override to `p-4 sm:p-6` if mobile reads too tight. Document.
7. Visual smoke: navigate to `/challenges/<active-id>` while logged in. Action callout reads as FrostedCard subdued (`rounded-3xl`, `bg-white/[0.05]` with `border-white/[0.10]`, `backdrop-blur-sm md:backdrop-blur-md`, `p-5`). Mark Complete button still wears seasonal palette via `style={{ backgroundColor: themeColor }}`. ActionIcon still wears `style={{ color: themeColor }}`. "Go to {action} →" Link still wears `style={{ color: themeColor }}`. Click Mark Complete → sound effect fires; activity recorded; on final day, ChallengeCompletionOverlay portal renders.

**Auth gating:** Mark Complete only renders when `isCurrentDay && isAuthenticated && !isPastChallenge` (preserved). ChallengeShareButton only renders when `isAuthenticated && challengeId && challengeTitle && completedDaysCount > 0` (preserved).

**Responsive behavior:**
- Desktop (1440px): FrostedCard subdued reads as `rounded-3xl p-5` quieter chrome with full theme-color buttons inside.
- Tablet (768px): same.
- Mobile (375px): same; padding override applied if tight.

**Inline position expectations:**
- ActionIcon and "Today's action:" h3 share y-coordinate at `flex items-center gap-3` (line 83 in current file). Top-y matching expected (±5px) at all breakpoints. Both children are roughly the same intrinsic height (icon `h-5 w-5` ≈ 20px; h3 `text-sm` ≈ 20px line-height) so top-y matching is the right assertion here.

**Guardrails (DO NOT):**
- DO NOT change any theme-color inline style.
- DO NOT use FrostedCard's `eyebrow` prop — keep the existing icon-and-h3 row.
- DO NOT add onClick to FrostedCard (must stay non-interactive — Mark Complete button count must remain 1 per the accessibility test on line 259 of accessibility.test.tsx).
- DO NOT modify the scripture italic at line 63, the section divider, or the reflection section.
- DO NOT change ChallengeShareButton props.
- DO NOT migrate the Mark Complete button to a Button primitive (Decision 8 — theme-color CTAs preserved as inline-styled rolls-own).
- DO NOT migrate the "Go to {action} →" Link to a Button primitive (Decision 11 — theme-color preserved).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) accessibility.test.tsx `'Mark Complete button has min-h-[44px]'` (line ~244) | integration | `container.querySelector('button')` finds Mark Complete (FrostedCard subdued is non-interactive, button count = 1). Verify still passes. |
| (existing) accessibility.test.tsx `'uses h3 for section headings'` (line ~262) | integration | `getAllByRole('heading', { level: 3 })` finds Reflection h3 + "Today's action:" h3. Verify still passes. |
| (existing) ChallengeDetail.test.tsx page-level tests | integration | Page-level assertions; not affected by ChallengeDayContent chrome change. Verify all pass. |

**Expected state after completion:**
- [ ] `import { FrostedCard } from '@/components/homepage/FrostedCard'` added.
- [ ] Inner `<div>` chrome replaced by `<FrostedCard variant="subdued">`.
- [ ] All theme-color inline styles byte-identical.
- [ ] ChallengeShareButton preserved.
- [ ] Section divider + scripture italic preserved.
- [ ] Padding choice documented in Execution Log.
- [ ] `container.querySelector('button')` test still resolves to Mark Complete.

---

### Step 11: Changes 9a + 9b — PlanNotFound migration

**Objective:** Wrap centered content in `<BackgroundCanvas>` and migrate the recovery link from `<Link className="font-script text-2xl text-primary ...">` to `<Button variant="subtle" size="md" asChild><Link>...</Link></Button>` (Path A).

**Files to create/modify:**
- `frontend/src/components/reading-plans/PlanNotFound.tsx` — add `BackgroundCanvas` + `Button` imports; restructure body; migrate the recovery link.

**Details:**

1. Add imports:
   ```tsx
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   import { Button } from '@/components/ui/Button'
   ```
2. Restructure the return statement:
   ```tsx
   {/* before — full file body */}
   return (
     <div className="min-h-screen bg-dashboard-dark">
       <Navbar transparent />
       <div className="flex min-h-[60vh] items-center justify-center">
         <div className="max-w-md text-center">
           <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
             Plan Not Found
           </h1>
           <p className="mb-6 text-base text-white/60 sm:text-lg">
             The reading plan you&apos;re looking for doesn&apos;t exist.
           </p>
           <Link
             to="/grow?tab=plans"
             className="font-script text-2xl text-primary transition-colors hover:text-primary-lt"
           >
             Browse Reading Plans
           </Link>
         </div>
       </div>
       <SiteFooter />
     </div>
   )
   ```
   →
   ```tsx
   {/* after */}
   return (
     <div className="min-h-screen bg-dashboard-dark">
       <Navbar transparent />
       <BackgroundCanvas>
         <div className="flex min-h-[60vh] items-center justify-center">
           <div className="max-w-md text-center">
             <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
               Plan Not Found
             </h1>
             <p className="mb-6 text-base text-white/60 sm:text-lg">
               The reading plan you&apos;re looking for doesn&apos;t exist.
             </p>
             <Button variant="subtle" size="md" asChild>
               <Link to="/grow?tab=plans">Browse Reading Plans</Link>
             </Button>
           </div>
         </div>
       </BackgroundCanvas>
       <SiteFooter />
     </div>
   )
   ```
3. Outer `<div className="min-h-screen bg-dashboard-dark">` preserved (recon item: same precedent as Spec 6A on `/grow`).
4. `<Navbar transparent />` and `<SiteFooter />` preserved.
5. h1 ("Plan Not Found") and description `<p>` preserved exactly.
6. Recovery link target stays `/grow?tab=plans`.
7. Button `asChild` is Path A (verified at Step 1). If at execution Path A surfaces a regression (focus-visible behavior on Link, hover styles not propagating), fall back to Path B: apply subtle-variant class strings directly to the `<Link>` (`className="inline-flex items-center justify-center font-medium ... rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px] px-6 py-2.5 text-sm"`). Document the chosen path in Execution Log.
8. Visual smoke: navigate to `/reading-plans/totally-bogus-id`. BackgroundCanvas atmospheric blooms gently visible behind the centered card. Recovery action renders as a subtle Button — visible affordance, no Caveat, no `text-primary` color.

**Auth gating:** N/A — public 404 page.

**Responsive behavior:**
- Desktop (1440px): centered card on `bg-dashboard-dark` with BackgroundCanvas blooms behind. Subtle Button at natural width.
- Tablet (768px): same.
- Mobile (375px): centered card, full mobile width up to `max-w-md`. Subtle Button natural width.

**Inline position expectations:** N/A — single-element recovery link.

**Guardrails (DO NOT):**
- DO NOT remove `<Navbar transparent />` or `<SiteFooter />`.
- DO NOT remove the outer `<div className="min-h-screen bg-dashboard-dark">`.
- DO NOT change h1 or description copy.
- DO NOT change the `to="/grow?tab=plans"` link target.
- DO NOT promote h1 to `GRADIENT_TEXT_STYLE` (out of scope; recon line 322–323 explicitly excludes it).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (new) renders recovery action | integration | Spec 6B does not require new tests; if any existing test renders PlanNotFound (none currently), verify it still passes. PlanNotFound has no dedicated test file. |

**Expected state after completion:**
- [ ] BackgroundCanvas wraps the centered content.
- [ ] Recovery action is a `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link to="/grow?tab=plans">`.
- [ ] No `font-script`, no `text-2xl`, no `text-primary` on the recovery affordance.
- [ ] `<Navbar transparent />` and `<SiteFooter />` preserved.
- [ ] Path A vs Path B decision documented in Execution Log.

---

### Step 12: Changes 10a + 10b — ChallengeNotFound migration

**Objective:** Same migration as Step 11 applied to ChallengeNotFound.tsx.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeNotFound.tsx` — same structural change as Step 11.

**Details:**

1. Add imports:
   ```tsx
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   import { Button } from '@/components/ui/Button'
   ```
2. Apply the same restructure as Step 11. Differences from PlanNotFound:
   - h1 text: "Challenge Not Found" (preserve)
   - link target: `/grow?tab=challenges`
   - link text: "Browse Challenges"
3. Same Path A vs Path B decision rule as Step 11 — Path A preferred; document in Execution Log.
4. Visual smoke: navigate to `/challenges/totally-bogus-id`. BackgroundCanvas atmospheric blooms visible. Subtle Button "Browse Challenges" renders.

**Auth gating:** N/A — public 404 page.

**Responsive behavior:** Same as Step 11.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove `<Navbar transparent />` or `<SiteFooter />`.
- DO NOT remove the outer `<div className="min-h-screen bg-dashboard-dark">`.
- DO NOT change h1 ("Challenge Not Found") or description copy.
- DO NOT change link target `/grow?tab=challenges` or link text "Browse Challenges".

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) ChallengeDetail.test.tsx `'renders ChallengeNotFound when challengeId is invalid'` | integration | Verify still passes. If the test asserts on the recovery affordance text "Browse Challenges", it stays — only the wrapping component changed. If the test asserts on `font-script` class, update to assert no Caveat font is present. |

**Expected state after completion:**
- [ ] BackgroundCanvas wraps the centered content.
- [ ] Recovery action is a `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link to="/grow?tab=challenges">`.
- [ ] No `font-script`, no `text-2xl`, no `text-primary` on the recovery affordance.
- [ ] Heading text "Challenge Not Found" preserved.

---

### Step 13: Change 11 — DaySelector + ChallengeDaySelector verification only

**Objective:** Confirm both day selectors retain their canonical patterns. NO class-string changes.

**Files to create/modify:** None.

**Details:**

1. Open `frontend/src/components/reading-plans/DaySelector.tsx`. Confirm:
   - Line 124–125: `aria-haspopup="listbox"` and `aria-expanded={isOpen}` on trigger.
   - Line 126: `min-h-[44px]` on trigger.
   - Line 131: `transition-transform motion-reduce:transition-none` on chevron.
   - Line 139–140: `role="listbox"` and `aria-label="Select a day"` on panel.
   - Line 152–155: `role="option"`, `aria-selected={isCurrent}`, `aria-disabled={locked}`, `tabIndex={-1}` on each option.
   - Lines 54–87: keyboard handler for ArrowDown/Up/Enter/Space/Escape/Home/End.
   - Lines 90–104: outside-click dismissal.
   - Lines 107–113: scrollIntoView on focused item.
   - Line 167: completion `<Check size={16} className="text-success" />`.
   - Line 169: locked `<Lock size={14} className="text-white/30" />`.
   - Focus restoration on dismiss: triggerRef.current?.focus() (canonical per recon).
2. Open `frontend/src/components/challenges/ChallengeDaySelector.tsx`. Confirm parity (lines 127–172). The only structural difference from DaySelector is `isPastChallenge` prop wiring at line 14, 23 — out of class-string-change scope.
3. If any drift surfaces, STOP and flag for user discussion before changing anything (recon explicitly says verification only).

**Auth gating:** Logged-out clicking a locked day on either selector triggers existing auth modal flow (preserved).

**Responsive behavior:** N/A: no UI change.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify class strings on either selector.
- DO NOT modify ARIA attributes.
- DO NOT modify keyboard handlers.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (existing) `'day selector opens dropdown on click'` (ReadingPlanDetail.test.tsx ~line 212) | integration | Verify still passes. |
| (existing) accessibility.test.tsx `'locked days have aria-disabled'` + `'keyboard navigation works'` (~line 193–240) | integration | Verify still passes. |

**Expected state after completion:**
- [ ] Both day selectors verified canonical.
- [ ] No class-string changes.
- [ ] Existing tests pass unchanged.

---

### Step 14: Update test class-string assertions

**Objective:** Update at-risk test assertions in the 4 in-scope test files. Most are expected to pass unchanged; this step is the corrective gate.

**Files to create/modify:**
- `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` — possibly update `'has all-dark background'` (line ~220–225) if the assertion no longer resolves.
- `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — possibly remove any inline-banner assertion (recon: none found; re-verify).
- `frontend/src/components/reading-plans/__tests__/DayContent.test.tsx` — possibly update if any chrome assertion exists (recon: none).
- `frontend/src/components/challenges/__tests__/accessibility.test.tsx` — verify Mark Complete button query still resolves (FrostedCard subdued is non-interactive; expected to pass unchanged).

**Details:**

1. **`'has all-dark background'` (ReadingPlanDetail.test.tsx ~line 220–225):**
   - Pre-change behavior: `document.querySelector('.bg-hero-dark')` finds the Navbar's `bg-hero-dark` class (Navbar.tsx:182 — when `transparent={false}`).
   - Post-change expectation: `<Layout transparent={false}>` is the default for ReadingPlanDetail; the Navbar still renders `bg-hero-dark`. The test should pass unchanged.
   - **If the test FAILS post-Change-1:** investigate whether Navbar is rendering with `transparent={true}` (it should not be — only ChallengeDetail uses `transparentNav`). If Navbar is correctly rendering with `bg-hero-dark`, the assertion should resolve. If for some reason the test fails, update to `document.querySelector('.bg-dashboard-dark')` or to a structural query (`container.firstElementChild`). Document the choice in Execution Log.
2. **ChallengeDetail.test.tsx inline-banner check:**
   - Grep for "You've completed", "incredible journey", "completed this challenge with you" in ChallengeDetail.test.tsx. Recon: none found. Re-verify.
   - If any test asserts on the deleted banner copy, REMOVE that assertion (the banner is gone in Step 8).
3. **DayContent.test.tsx chrome check:**
   - Grep for `rounded-2xl`, `bg-white/5`, `backdrop-blur` in DayContent.test.tsx. Recon: none. Re-verify.
   - If any chrome class assertion exists, update to either `rounded-3xl` (FrostedCard subdued) or remove the assertion.
4. **accessibility.test.tsx `container.querySelector('button')` check:**
   - The test expects the first `<button>` to be Mark Complete (line 259). FrostedCard subdued is non-interactive (no onClick). Button count stays at 1. Test passes unchanged.
   - **If for some reason the test fails:** check that no FrostedCard prop accidentally added an onClick (must not). The expected outcome is no test change.
5. Run targeted test files post-step:
   ```
   pnpm test --run frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx
   pnpm test --run frontend/src/pages/__tests__/ChallengeDetail.test.tsx
   pnpm test --run frontend/src/components/reading-plans/__tests__/DayContent.test.tsx
   pnpm test --run frontend/src/components/challenges/__tests__/accessibility.test.tsx
   ```

**Auth gating:** N/A.

**Responsive behavior:** N/A: test changes only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT add new tests beyond what is necessary to maintain or correct existing assertions.
- DO NOT skip or `.todo` any failing test — fix the assertion or fix the implementation.
- DO NOT change behavior tests (click handlers, navigation logic, IO observer side effects, ARIA wiring).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `'has all-dark background'` | integration | Pass unchanged or update query to resolve to a structural or canonical class assertion. |
| Mark Complete button query in accessibility.test.tsx | integration | Pass unchanged. |
| All other ~45 in-scope tests | integration | Pass unchanged. |

**Expected state after completion:**
- [ ] All 4 in-scope test files pass.
- [ ] Any class-string assertion that needed updating is documented in Execution Log.
- [ ] No tests skipped, no `.todo`, no `xit`.

---

### Step 15: Run full test suite + typecheck + lint + manual smoke

**Objective:** Reconcile against captured baselines; verify no regressions on neighbor surfaces; confirm acceptance criteria.

**Files to create/modify:** None — verification only.

**Details:**

1. Run full test suite:
   ```
   cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -120
   ```
   Reconcile against Step 0 baseline. Expected: same pass/fail counts. New failures must be reconciled before completion.
2. Run typecheck:
   ```
   pnpm typecheck
   ```
   Expected: 0 errors.
3. Run lint:
   ```
   pnpm lint
   ```
   Expected: 0 new errors. If lint surfaces unused imports (e.g., a stray `cn` import after the migration), remove them.
4. Run build:
   ```
   pnpm build
   ```
   Expected: build succeeds. Bundle size delta is net-zero or net-negative (Spec 6B removes the inline banner block + `titleWords.split(' ')` derivation + rolls-own chrome class strings; adds `BackgroundCanvas` + `FrostedCard` + `Button` imports — all already in production bundle).
5. **Manual eyeball checks on detail pages (per acceptance criteria):**
   - `/reading-plans/finding-peace-in-anxiety` (or any valid plan): hero with no italic subtitle, no font-script tail; BackgroundCanvas atmospheric blooms gently visible behind day content + day selector; FrostedCard subdued action callout reads correctly (rounded-3xl, quieter than the day-content card chrome above); DaySelector dropdown opens, navigates correctly with keyboard, focus restores on dismiss.
   - `/challenges/<active-id>` (current season): same checks, plus theme-color Mark Complete button renders with seasonal palette; theme-color halo on hero composes correctly with ATMOSPHERIC_HERO_BG; ChallengeDayContent action callout reads as FrostedCard subdued; ActionIcon, Mark Complete, "Go to {action} →" all wear theme color; ChallengeShareButton present and clickable when authenticated.
6. **Manual eyeball checks on not-found surfaces:**
   - `/reading-plans/totally-bogus-id` shows BackgroundCanvas atmospheric layer + subtle Button "Browse Reading Plans" (no Caveat font, no text-primary color).
   - `/challenges/totally-bogus-id` shows BackgroundCanvas atmospheric layer + subtle Button "Browse Challenges".
   - Both not-found pages preserve `<Navbar transparent />` and `<SiteFooter />`.
7. **Regression checks on neighbor surfaces:**
   - `/grow` (Spec 6A) reads identically — BackgroundCanvas, plan cards, challenge cards, tab icons, sticky tab bar all unchanged.
   - `/grow?tab=plans` and `/grow?tab=challenges` unchanged.
   - DailyHub (`/daily?tab=*`) unchanged.
   - Dashboard (`/`) unchanged.
   - Local Support (`/local-support/*`) unchanged.
   - BibleLanding (`/bible`) unchanged.
8. **IO observer smoke (ReadingPlanDetail Day completion):**
   - Log in (simulated auth via dev toggle). Navigate to `/reading-plans/finding-peace-in-anxiety` Day 1 (or `progress.currentDay` if user has progress). Scroll until the action-step section is 50%+ in viewport. Confirm `recordActivity` fires (verify via dashboard streak/points update or React DevTools).
9. **Mark Complete + sound effect smoke (ChallengeDetail):**
   - Log in. Navigate to a challenge where `selectedDay === progress.currentDay`. Click Mark Complete. Confirm `playSoundEffect('ascending')` plays (audible). Confirm `recordActivity` fires. On final-day completion, ChallengeCompletionOverlay portal renders. Inline `border-success/20 bg-success/10` banner does NOT render under the overlay.
10. **DaySelector keyboard nav smoke:**
    - Tab to day-selector trigger → Enter (opens listbox) → ArrowDown/Up to navigate options → Enter (selects + closes) → focus restores to trigger. Repeat with Escape (closes without selecting; focus restores).

**Auth gating:** N/A — verification step.

**Responsive behavior:**
- Verify BackgroundCanvas blooms render at 375px, 768px, 1440px.
- Verify FrostedCard subdued padding choice at 375px (default `p-5` vs override `p-4 sm:p-6`); document the chosen path in Execution Log.
- Verify subtle Button hover translation (`hover:-translate-y-0.5`) engages on pointer-capable devices and disables on `motion-reduce`.

**Inline position expectations:** Verify ActionIcon and "Today's action:" h3 share top-y at all breakpoints (within ±5px).

**Guardrails (DO NOT):**
- DO NOT mark the spec complete if any NEW test failure exists.
- DO NOT mark the spec complete if `pnpm typecheck` or `pnpm lint` surfaces new errors.
- DO NOT mark the spec complete if any acceptance criterion fails on manual eyeball.
- DO NOT commit, push, or stash — user manages all git operations.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | integration | All ~9,470 tests pass (1 pre-existing fail). |
| Typecheck | static | 0 errors. |
| Lint | static | 0 new errors. |
| Build | static | Successful. |

**Expected state after completion:**
- [ ] Test pass/fail counts match Step 0 baseline (no NEW failures).
- [ ] Typecheck clean.
- [ ] Lint clean.
- [ ] Build succeeds.
- [ ] All manual eyeball checks pass.
- [ ] All neighbor regression checks pass.
- [ ] IO observer + sound effect + Mark Complete smoke tests pass.

---

### Step 16: Document execution-log decisions

**Objective:** Record the decisions made during execution so future readers (and the inevitable cross-spec audit) have the trail.

**Files to create/modify:** This plan's Execution Log section.

**Details:**

Document in the Execution Log:
1. Pre-execution test baseline (live numbers from Step 0).
2. FrostedCard padding choice — default `p-5` vs override `p-4 sm:p-6` (Step 9 + Step 10).
3. Button `asChild` path choice — Path A vs Path B (Step 11 + Step 12).
4. State-machine verification result (Step 2) — "redundant; clean delete" vs "load-bearing; banner kept".
5. ReadingPlanDetail.test.tsx `'has all-dark background'` assertion path (Step 14) — "passes unchanged" vs "updated to query X".
6. Any deviation from this plan's prescribed steps with reasoning.
7. Final test pass/fail counts and any reconciliation notes.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT skip documentation. Future audits need the trail.

**Test specifications:** None — documentation step.

**Expected state after completion:**
- [ ] Execution Log fully populated with all 6 decisions enumerated above.
- [ ] Plan is durable artifact for downstream `/code-review` and `/verify-with-playwright`.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 0 | — | Pre-execution recon + baselines |
| 1 | 0 | Verify FrostedCard + Button asChild prop API |
| 2 | 0 | State-machine verification on ChallengeDetail (gate for Step 8) |
| 3 | 0, 1 | Change 1 — ReadingPlanDetail BackgroundCanvas wrap |
| 4 | 0 | Change 2 — ReadingPlanDetail h1 Caveat removal (independent of Step 3 but ordered for cohesion) |
| 5 | 0 | Change 3 — ReadingPlanDetail hero subtitle (independent of Steps 3+4 but ordered for cohesion) |
| 6 | 0, 1 | Change 4 — ChallengeDetail BackgroundCanvas wrap |
| 7 | 0 | Change 5 — ChallengeDetail hero subtitle (independent of Step 6 but ordered for cohesion) |
| 8 | 2, 6, 7 | Change 6 — ChallengeDetail inline banner deletion (gated by Step 2 verification; ordered after Step 6 because banner moves into BackgroundCanvas first then is deleted) |
| 9 | 0, 1 | Change 7 — DayContent action callout |
| 10 | 0, 1 | Change 8 — ChallengeDayContent action callout |
| 11 | 0, 1 | Changes 9a + 9b — PlanNotFound migration |
| 12 | 0, 1 | Changes 10a + 10b — ChallengeNotFound migration |
| 13 | 0 | Change 11 — DaySelector + ChallengeDaySelector verification only |
| 14 | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | Update test class-string assertions |
| 15 | 14 | Full test suite + typecheck + lint + manual smoke |
| 16 | 15 | Document execution-log decisions |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 0 | Pre-execution recon + baselines | [COMPLETE] | 2026-05-05 | **Baseline:** Test 9,473 pass / 16 fail across 6 files (none in Spec 6B scope — all in `useFaithPoints`, `GrowthGarden*`, `warm-empty-states`, plus rotating flake between `Pray.test.tsx` and `useNotifications.test.ts`). Typecheck: 0 errors. Lint: 0 errors. Spec 6A merge confirmed (BackgroundCanvas on `/grow`, FrostedCard on PlanCard, asChild on UpcomingChallengeCard, FilterBar.tsx deleted). Direction doc + recon present. All 8 implementation files match plan expectations. ChallengeDetail.test.tsx has 19 tests (plan estimated ~21). |
| 1 | Verify FrostedCard + Button asChild prop API | [COMPLETE] | 2026-05-05 | FrostedCard `subdued` confirmed at lines 39-42 (`bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`); `isInteractive = !!onClick` gates hover/active/cursor at line 79. Button `subtle` variant + `asChild` cloneElement at lines 51-52 + 68-84. Spec 6A precedent on UpcomingChallengeCard (`size="sm"`) confirmed. **Decision: Path A** for NotFound recovery-link migration. |
| 2 | State-machine verification on ChallengeDetail | [COMPLETE] | 2026-05-05 | **Decision: BANNER REDUNDANT — proceed with clean delete.** Trace: line 94 useState declaration; line 147 `setJustCompletedFinalDay(true)` only fires inside `if (result.isCompletion)` at line 146, immediately preceded by `setCompletionOverlay({...})` at line 150. Same React commit, batched. ELSE branch (line 157) only sets milestone, NOT `justCompletedFinalDay`. After overlay dismissal at line 561 (`setCompletionOverlay(null)`), `justCompletedFinalDay` remains `true` so the banner WOULD persist beneath dismissed overlay — but staying on a completed challenge page after dismissal is uncommon, and banner duplicates overlay's content (less elegantly). |
| 3 | Change 1 — ReadingPlanDetail BackgroundCanvas wrap | [COMPLETE] | 2026-05-05 | Modified: `frontend/src/pages/ReadingPlanDetail.tsx`. Added `BackgroundCanvas` import. Wrapped Breadcrumb through day-navigation block in `<BackgroundCanvas>`. Hero `<section>` stays direct child of `<div className="min-h-screen bg-dashboard-dark">`. PlanCompletionOverlay remains sibling outside BackgroundCanvas. 21/21 ReadingPlanDetail.test.tsx pass. |
| 4 | Change 2 — ReadingPlanDetail h1 Caveat removal | [COMPLETE] | 2026-05-05 | Removed `<span className="font-script">` from h1; deleted `titleWords`/`titleLastWord`/`titlePrefix` locals (3 lines). h1 now renders `{plan.title}` uniformly with `GRADIENT_TEXT_STYLE`. |
| 5 | Change 3 — ReadingPlanDetail hero subtitle | [COMPLETE] | 2026-05-05 | Subtitle migrated from `font-serif italic text-base text-white/60 sm:text-lg` to `text-base text-white/70 leading-relaxed sm:text-lg`. |
| 6 | Change 4 — ChallengeDetail BackgroundCanvas wrap | [COMPLETE] | 2026-05-05 | Modified: `frontend/src/pages/ChallengeDetail.tsx`. Added `BackgroundCanvas` import. Wrapped Breadcrumb through day-navigation block in `<BackgroundCanvas>`. Hero `<section>` stays inside `<Layout transparentNav>` outside BackgroundCanvas. SwitchChallengeDialog and ChallengeCompletionOverlay remain siblings outside BackgroundCanvas. heroStyle composition (line 222-225) preserved exactly. 19/19 ChallengeDetail.test.tsx pass. |
| 7 | Change 5 — ChallengeDetail hero subtitle | [COMPLETE] | 2026-05-05 | Subtitle migrated to match Step 5. |
| 8 | Change 6 — ChallengeDetail inline banner deletion | [COMPLETE] | 2026-05-05 | **DEVIATION FROM PLAN — User-approved.** Plan said "leave useState + setter in place; smaller diff". Reality: TS6133 + ESLint `@typescript-eslint/no-unused-vars` flagged `justCompletedFinalDay` after JSX consumer was removed. User approved Option 1 (delete state declaration line 94 + setter call line 147 entirely). Plan explicitly enumerated this as acceptable alternative under "Alternative consideration": *"deleting it would have zero behavioral effect and simplify the file."* `setCompletionOverlay({...})` SEPARATE state machine intact (lines 56, 149, 548) — ChallengeCompletionOverlay still fires. Typecheck + lint clean post-deletion. 19/19 ChallengeDetail.test.tsx pass. |
| 9 | Change 7 — DayContent action callout | [COMPLETE] | 2026-05-05 | Modified: `frontend/src/components/reading-plans/DayContent.tsx`. Added `FrostedCard` import. Replaced inner `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` with `<FrostedCard variant="subdued">`. Outer `<section ref={ref}>` preserved (IO observer wiring intact). Eyebrow stays as plain `<p className="text-sm text-white/60">`. **Padding decision: kept default `p-5`** per plan (no override applied; visual smoke at Step 15 may surface need for `p-4 sm:p-6` override on 375px). 1/1 DayContent.test.tsx pass. |
| 10 | Change 8 — ChallengeDayContent action callout | [COMPLETE] | 2026-05-05 | Modified: `frontend/src/components/challenges/ChallengeDayContent.tsx`. Added `FrostedCard` import. Replaced inner `<div>` with `<FrostedCard variant="subdued">`. All theme-color inline styles byte-identical (ActionIcon line 84, Mark Complete line 96, "Go to" Link line 122). ChallengeShareButton preserved. Eyebrow row (icon + h3) preserved as inline children (NOT promoted to FrostedCard `eyebrow` prop). **Padding decision: kept default `p-5`**. 13/13 accessibility.test.tsx pass — `container.querySelector('button')` resolves to Mark Complete because FrostedCard subdued is non-interactive (no onClick). |
| 11 | Changes 9a + 9b — PlanNotFound migration | [COMPLETE] | 2026-05-05 | Modified: `frontend/src/components/reading-plans/PlanNotFound.tsx`. Added `BackgroundCanvas` + `Button` imports. Wrapped centered content in `<BackgroundCanvas>` (between Navbar and SiteFooter). Migrated recovery link from `font-script text-2xl text-primary` to `<Button variant="subtle" size="md" asChild><Link to="/grow?tab=plans">Browse Reading Plans</Link></Button>`. **Path A** chosen (verified working). Outer `<div className="min-h-screen bg-dashboard-dark">` preserved. h1 + description copy unchanged. |
| 12 | Changes 10a + 10b — ChallengeNotFound migration | [COMPLETE] | 2026-05-05 | Same migration as Step 11 applied to `frontend/src/components/challenges/ChallengeNotFound.tsx`. Link target `/grow?tab=challenges`, link text "Browse Challenges", h1 "Challenge Not Found" preserved. Path A. Typecheck + lint clean. |
| 13 | Change 11 — DaySelector + ChallengeDaySelector verification | [COMPLETE] | 2026-05-05 | Both selectors verified canonical. `aria-haspopup="listbox"`, `aria-expanded`, `min-h-[44px]`, `transition-transform motion-reduce:transition-none`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-disabled`, `tabIndex={-1}` all present. No drift. No class-string changes needed. |
| 14 | Update test class-string assertions | [COMPLETE] | 2026-05-05 | **All 4 in-scope test files pass without modification — 54/54 tests total.** `'has all-dark background'` (RPD line 223) passes unchanged via Navbar's `bg-hero-dark`. ChallengeDetail.test.tsx has no inline-banner assertion; the `/completed this challenge/` regex at line 272 resolves via CommunityFeed's completed-state copy. DayContent.test.tsx has no chrome assertions. accessibility.test.tsx `container.querySelector('button')` resolves to Mark Complete (FrostedCard subdued non-interactive). |
| 15 | Full test suite + typecheck + lint + manual smoke | [COMPLETE] | 2026-05-05 | **Full suite: 9,473 pass / 16 fail across 6 files — IDENTICAL to Step 0 baseline. Zero regressions from Spec 6B.** All 16 failures pre-existing (useFaithPoints, GrowthGarden*, warm-empty-states, plus rotating flake between Pray.test.tsx and useNotifications.test.ts). Typecheck: 0 errors. Lint: 0 errors. Build: succeeded (~7.4s). Bundle warnings pre-existing (Bible book JSON chunks). **Manual eyeball checks (sub-items 5-10) deferred to `/verify-with-playwright` or manual user verification post-merge** — execute-plan environment does not run interactive browser smoke. |
| 16 | Document execution-log decisions | [COMPLETE] | 2026-05-05 | All decisions captured in this Execution Log. Plan retained as durable artifact. |

### Summary of decisions made during execution

1. **Pre-execution test baseline:** 9,473 pass / 16 fail across 6 files (useFaithPoints, GrowthGarden-a11y, GrowthGarden-transition, GrowthGarden, warm-empty-states, plus rotating flake between Pray.test.tsx and useNotifications.test.ts). All 16 failures are pre-existing and outside Spec 6B's scope. Typecheck and lint clean at baseline.
2. **FrostedCard padding choice:** Default `p-5` kept on both Step 9 (DayContent) and Step 10 (ChallengeDayContent). No override applied. `/verify-with-playwright` may surface need for `p-4 sm:p-6` override at 375px.
3. **Button `asChild` path:** Path A chosen for both Step 11 (PlanNotFound) and Step 12 (ChallengeNotFound). Path B (subtle-variant class strings on `<Link>`) was the documented fallback but never needed.
4. **State-machine verification (Step 2):** Banner redundant — proceeded with clean delete.
5. **`'has all-dark background'` assertion path (Step 14):** Passed unchanged. No test modification needed.
6. **Plan deviation in Step 8 (user-approved):** Plan said "leave `justCompletedFinalDay` useState + setter in place; smaller diff". Strict TypeScript (TS6133) and ESLint (`no-unused-vars`) flagged the unused state after JSX consumer was deleted, forcing a workaround. User approved Option 1 — delete state declaration (line 94) + setter call (line 147) entirely. Plan's "Alternative consideration" block explicitly enumerated this as acceptable: *"deleting it would have zero behavioral effect and simplify the file."* `setCompletionOverlay` SEPARATE state machine that drives ChallengeCompletionOverlay remains fully intact.
7. **Final test pass/fail:** 9,473 pass / 16 fail (identical to baseline). Zero regressions. All 4 in-scope test files: 54/54 passing. Build, typecheck, lint all clean.
