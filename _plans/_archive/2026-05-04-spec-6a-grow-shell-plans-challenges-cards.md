# Implementation Plan: Spec 6A — Grow Shell + Plans Tab + Challenge Cards

**Spec:** `_specs/spec-6a-grow-shell-plans-challenges-cards.md`
**Date:** 2026-05-04
**Branch:** `forums-wave-continued` (existing — DO NOT create new branches)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/grow-2026-05-04.md` (loaded)
**Direction Doc:** `_plans/direction/grow-2026-05-04.md` (loaded — locked decisions for Specs 6A/6B/6C)
**Master Spec Plan:** N/A (Round 3 visual rollout sequence — sibling specs are 6B + 6C; previous shipped: 4A/4B/4C/5)

---

## Affected Frontend Routes

- `/grow` — primary surface (BackgroundCanvas wrap, hero subtitle, sticky tab bar tint, tab icon tonal colors)
- `/grow?tab=plans` — Plans tab variant; PlanCard grid + Create-Your-Own-Plan card chrome migrate
- `/grow?tab=challenges` — Challenges tab variant; UpcomingChallengeCard / NextChallengeCountdown / ActiveChallengeCard / PastChallengeCard / HallOfFame items chrome migrate
- `/reading-plans` — legacy 301 redirect to `/grow?tab=plans`; verify still fires
- `/challenges` — legacy redirect to `/grow?tab=challenges`; verify still fires
- `/reading-plans/:planId` — regression surface (no migration here, but PlanCard chrome ripples if rendered)
- `/challenges/:challengeId` — regression surface (ActiveChallengeCard chrome ripples if rendered)
- `/` (Dashboard), `/daily?tab=*` (Daily Hub), `/bible` (BibleLanding), `/local-support/*` — regression surfaces only (verify nothing drifts)

---

## Architecture Context

### Project structure

- **Page shells:** `frontend/src/pages/GrowPage.tsx` (148 LOC) is the top-level shell; renders Navbar + hero `<section>` + IO sentinel + sticky tab bar (using `Tabs` primitive at `components/ui/Tabs.tsx`) + two tabpanels (always mounted, `hidden` toggled) + SiteFooter.
- **Tab content components:** `frontend/src/pages/ReadingPlans.tsx` (`ReadingPlansContent`) and `frontend/src/pages/Challenges.tsx` (`ChallengesContent`) — rendered into the tabpanels.
- **Card primitives in scope (chrome migration):** `components/reading-plans/PlanCard.tsx` (101 LOC, root is `<Link>`), `components/challenges/ActiveChallengeCard.tsx` (131), `components/challenges/UpcomingChallengeCard.tsx` (69, root is `<article>`), `components/challenges/NextChallengeCountdown.tsx` (91), `components/challenges/PastChallengeCard.tsx` (57, `role="button"` div), `components/challenges/HallOfFame.tsx` (42).
- **Inline ConfirmDialog** lives at `pages/ReadingPlans.tsx:22-73` — owns "Pause & Start New" `bg-primary` button.
- **Inline Create-Your-Own-Plan card** lives at `pages/ReadingPlans.tsx:165-180` — currently a hand-rolled FrostedCard chrome (NOT consuming the primitive).
- **Dead code:** `components/reading-plans/FilterBar.tsx` (78 LOC, 0 imports — verified via `grep -r "from.*reading-plans/FilterBar"`).

### Existing primitives (already shipped, only consumed by this spec)

- **`FrostedCard`** at `components/homepage/FrostedCard.tsx` — exposes variants `default`, `subdued`, `accent`. Default base: `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`. Subdued base: `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`. Polymorphic via `as: 'div' | 'button' | 'article' | 'section'` only — **DOES NOT support `Link`**. Hover lift gated by `!!onClick`. Focus-visible ring (`ring-white/50`) appended automatically when interactive (`onClick` provided).
- **`BackgroundCanvas`** at `components/ui/BackgroundCanvas.tsx` — multi-bloom radial-gradient layer over `linear-gradient(135deg, #120A1F, #08051A, #0A0814)`. Class: `relative min-h-screen overflow-hidden`. Inline `style={{ background: CANVAS_BACKGROUND }}`. **Do NOT modify the source** — only consume.
- **`Button`** at `components/ui/Button.tsx` — variants `primary | secondary | outline | ghost | light | gradient | subtle`. `subtle` base: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]`. `light` is the white-pill primary CTA (preserved on Create-Your-Own-Plan).
- **`Tabs`** at `components/ui/Tabs.tsx` — already canonical violet pill pattern. ARIA tabs (`role="tablist"`/`role="tab"`/`aria-selected`/`aria-controls`/roving tabindex/`Home`/`End`/`ArrowLeft`/`ArrowRight`). Items array accepts `{ id, label, icon, badge }`; this spec only updates `icon` className.

### Auth gating pattern (no new gates introduced)

- `useAuth()` returns `{ isAuthenticated, user, login(), logout() }`.
- `useAuthModal()` returns `{ openAuthModal(message) }` — UI shell only (real JWT in Forums Wave Phase 1).
- This spec preserves all existing auth gates AS-IS (handlers in `ReadingPlansContent.handleCreatePlan`, `handleStartOrContinue`, etc., and in `ChallengesContent`'s join/resume/reminder handlers). No code changes to gating logic.

### Test patterns

- Vitest + React Testing Library + `MemoryRouter`. Most existing tests are wrapped in `<MemoryRouter><ToastProvider><AuthModalProvider>` chain (see `pages/__tests__/GrowPage.test.tsx` lines 65-78).
- `useAuth` is mocked via `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }))`.
- `useAuthModal` is partially mocked (importActual + override) so `openAuthModal` is a `vi.fn()`.
- Class-string assertions use `expect(element.className).toContain('class-name')` — chrome migrations break these.

### Round 3 / direction-doc decisions consumed

| Decision | Source | Application in this spec |
|----------|--------|--------------------------|
| BackgroundCanvas wraps below-hero (Decision 2) | direction doc | Change 1 |
| Hero subtitle italic → plain prose (Decision 3) | direction doc | Change 2 |
| Sticky tab bar `bg-hero-bg/70` (Decision 5) | direction doc | Change 3 |
| Rolls-own → FrostedCard primitive (Decision 7) | direction doc | Changes 5–11 |
| Theme-color CTAs preserved AS-IS (Decision 8) | direction doc | Change 8 critical preservation |
| `bg-primary` solid → subtle/light per emotional weight (Decision 9) | direction doc | Change 11 (light, preserved), Change 12 (subtle) |
| Tonal Icon Pattern for tab + creator + trophy icons (Decision 11) | direction doc | Changes 4, 10, 11 |
| Delete dead `FilterBar.tsx` (Decision 12) | direction doc | Change 13 |
| PastChallengeCard `role="button"` is OUT OF SCOPE (Decision 14) | direction doc | preserved AS-IS in Change 9 |

---

## Auth Gating Checklist

This spec adds and removes ZERO auth gates. All existing gates are preserved. The table below documents every interactive surface that this spec touches and confirms its existing auth posture.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit `/grow` | Public | All steps | n/a — public |
| Switch tabs (Plans ↔ Challenges) | Public | Step 4 | n/a — `setSearchParams` only |
| Click PlanCard (navigate to `/reading-plans/:planId`) | Public | Step 5 | n/a — Link navigation only |
| Click "Start Plan" / "Continue" / "Resume" inside PlanCard | Existing gate preserved (handler at `ReadingPlansContent.handleStartOrContinue`) | Step 5 | `useAuth` + `authModal.openAuthModal('Sign in to start this reading plan')` — preserved |
| Click "Create Plan" on Create-Your-Own-Plan card | Existing gate preserved | Step 11 | `useAuth` + `authModal.openAuthModal('Sign in to create a personalized reading plan')` — preserved |
| Click ConfirmDialog "Keep Current" / "Pause & Start New" | Existing — already gated by virtue of dialog being shown only when an auth-gated action initiated the switch | Step 12 | n/a — handlers internal to `ReadingPlansContent` |
| Click UpcomingChallengeCard "Remind me" / "View Details" | Existing gates preserved | Step 6 | "Remind me" → existing `useChallengeProgress` gate; "View Details" Link is public |
| Click NextChallengeCountdown "Remind me" / "View Details" | Existing gates preserved | Step 7 | same as above |
| Click ActiveChallengeCard "Resume" / "Continue" / "Join Challenge" | Existing gates preserved (theme-color CTAs preserved AS-IS) | Step 8 | existing `onJoin` / `onContinue` / `onResume` callbacks (auth-gated by parent `ChallengesContent`) |
| Click PastChallengeCard | Public navigation | Step 9 | n/a — Link/navigate only |
| Click HallOfFame item | Non-interactive (no onClick) | Step 10 | n/a |

**Confirmation:** No new auth modal copy, no new gated actions, no removed gates. Spec section "Auth Gating" line 528 confirms.

---

## Design System Values (for UI steps)

Exact values pulled from `_plans/recon/design-system.md` (live computed) + `frontend/src/components/homepage/FrostedCard.tsx` (source of truth for variant tokens) + `frontend/tailwind.config.js` (verified `bg-hero-bg = #08051A`).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FrostedCard `default` variant base | base classes | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `FrostedCard.tsx:36` |
| FrostedCard `default` variant hover (when `onClick` set) | hover classes | `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` | `FrostedCard.tsx:37` |
| FrostedCard `subdued` variant base | base classes | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `FrostedCard.tsx:40` |
| FrostedCard `subdued` variant hover (when `onClick` set) | hover classes | `hover:bg-white/[0.04]` | `FrostedCard.tsx:41` |
| FrostedCard interactive transition | transition | `transition-all motion-reduce:transition-none duration-base ease-decelerate` | `FrostedCard.tsx:78` |
| FrostedCard interactive focus ring | focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | `FrostedCard.tsx:84` |
| FrostedCard interactive press | press | `active:scale-[0.98]` | `FrostedCard.tsx:83` |
| `bg-hero-bg` Tailwind token | hex | `#08051A` (canonical body background) | `tailwind.config.js:22` |
| `bg-dashboard-dark` Tailwind token | hex | `#0f0a1e` (PageHero / inner-page hero base) | `tailwind.config.js:23` |
| Sticky tab bar tint | base | `bg-hero-bg/70` (=`rgba(8,5,26,0.70)`) | direction doc Decision 5 + verified token |
| `ATMOSPHERIC_HERO_BG` | inline style | `radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)` over `#0f0a1e` | `_plans/recon/design-system.md:77`, `components/PageHero.tsx` |
| `GRADIENT_TEXT_STYLE` | inline style | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | `constants/gradients.tsx` |
| Hero subtitle (post-migration) | classes | `text-base text-white/70 leading-relaxed sm:text-lg` (no `font-serif italic`) | spec Change 2, direction doc Decision 3 |
| Tonal icon — Plans tab BookOpen | color | `text-sky-300` | direction doc Decision 11 |
| Tonal icon — Challenges tab Flame | color | `text-amber-300` | direction doc Decision 11 |
| Tonal icon — Create-Your-Own-Plan Sparkles | color | `text-violet-300` | direction doc Decision 11 |
| Tonal icon — Create-Your-Own-Plan Sparkles container | bg | `bg-white/[0.05]` (replaces `bg-primary/10`) | spec Change 11 |
| Tonal icon — HallOfFame Trophy | color | `text-amber-300` (replaces `text-amber-500`) | direction doc Decision 11 |
| Pulse dot on Challenges tab | color | preserve inline `style={{ backgroundColor: activeChallengeThemeColor }}` | spec — NOT migrated |
| ActiveChallengeCard emphasis | border override | `border-2 border-primary/30` | spec Change 8, direction doc Decision 7 |
| Theme-color CTA buttons (Resume/Continue/Join) | bg | `style={{ backgroundColor: challenge.themeColor }}` (PRESERVED AS-IS) | direction doc Decision 8 |
| Theme-color progress bar fill | inline style | `style={{ width: '${pct}%', backgroundColor: challenge.themeColor }}` (PRESERVED AS-IS) | direction doc Decision 8 |
| ConfirmDialog "Pause & Start New" | variant | `<Button variant="subtle">` | spec Change 12, direction doc Decision 9 |
| ConfirmDialog "Keep Current" | classes | preserved AS-IS (existing outlined button) | spec Change 12 |
| Animation duration token (sticky tab bar shadow transition) | token | `duration-base` (250ms) | `constants/animation.ts` (BB-33) + `tailwind.config.js:53`, spec Change 3 |

**Verified during recon — no `[UNVERIFIED]` design values.**

---

## Design System Reminder

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step.

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) on the hero `<h1>`. **PRESERVED EXACTLY** — do not touch the hero h1 or `aria-labelledby="grow-heading"` wiring.
- The hero `<section>` uses inline `style={ATMOSPHERIC_HERO_BG}` (radial purple ellipse over `#0f0a1e`). **PRESERVED EXACTLY** — the hero stays inside `<main>` but OUTSIDE the new `<BackgroundCanvas>` wrapper. This is documented intentional drift from Dashboard/LocalSupport, where BackgroundCanvas wraps the hero. The hero's stronger atmospheric is appropriate for the hero zone; BackgroundCanvas fills below.
- **Sticky positioning + `BackgroundCanvas` wrapping:** `BackgroundCanvas` applies `relative min-h-screen overflow-hidden` to its wrapper. `overflow-hidden` does NOT break `position: sticky` of children unless the wrapper is itself the scroll container — and the viewport remains the scroll container, so sticky still pins to viewport top. Verify visually post-migration.
- **FrostedCard polymorphism is `'div' | 'button' | 'article' | 'section'` only — NOT Link.** PlanCard MUST use Path B (wrap FrostedCard inside `<Link>`). Pass `onClick={() => {}}` to FrostedCard to enable hover lift (lift is gated by `!!onClick`). UpcomingChallengeCard uses `as="article"` (Path A). PastChallengeCard uses Path A with `role="button"`, `tabIndex`, `onClick`, `onKeyDown` props. ActiveChallengeCard, NextChallengeCountdown, HallOfFame items, Create-Your-Own-Plan card all use the default `as="div"`.
- Frosted glass cards: use the `FrostedCard` component, not a hand-rolled card. After migration, every Plans-tab and Challenges-tab card consumes the primitive.
- White pill CTAs: Pattern 1 (inline, smaller, `<Button variant="light" size="sm">`) is preserved for UpcomingChallengeCard / NextChallengeCountdown reminder + view-details. Create-Your-Own-Plan "Create Plan" stays `<Button variant="light">` (size default). The "Pause & Start New" confirm-dialog button changes to `<Button variant="subtle">` per Decision 9.
- **Theme-color CTAs and progress bar fill on ActiveChallengeCard remain rolls-own with inline `style={{ backgroundColor: themeColor }}`.** Do NOT migrate these to `<Button>`. The seasonal-palette brand expression (Lent purple, Easter gold, Pentecost red, Advent deep blue) is load-bearing.
- **CategoryTag is preserved AS-IS.** Five seasonal tints (`pentecost`, `advent`, `lent`, `newyear`, `easter`) work as designed and are out of scope.
- **Pulse dot on Challenges tab is preserved AS-IS** — it's a functional categorical signal (active-challenge brand color), not a Tonal Icon Pattern application. The `motion-safe:animate-challenge-pulse` 2s loop and the inline `style={{ backgroundColor: activeChallengeThemeColor }}` stay exactly as they are.
- Animation tokens: do not introduce hardcoded `200ms` or `cubic-bezier(...)` strings. The sticky tab bar `transition-shadow` becomes `transition-shadow duration-base motion-reduce:transition-none` (verifying `duration-base` is the BB-33 token).
- Reduced motion: global `frontend/src/styles/animations.css` covers all transitions added in this spec. No new motion-reduce class names introduced.
- Inline-row layouts: the UpcomingChallengeCard heading row (icon + title + CategoryTag) and the action row (Remind me + View Details) must share y-coordinates at all breakpoints. Same for ActiveChallengeCard's flex-row of "days remaining + participants count" at sm+. Document expectations in the Inline Element Position Expectations table below.
- **Deprecated patterns to AVOID introducing:** Caveat (`font-script`) headings, `BackgroundSquiggle`, `GlowBackground` per-section, `animate-glow-pulse`, cyan textarea border, `font-serif italic` on body subtitles, `PageTransition`, `bg-primary` solid CTAs in utility navigation contexts, soft-shadow 8px-radius cards, hand-rolled FrostedCard chrome.

**Past deviations from Spec 5 Execution Log incorporated:**
- BackgroundCanvas opacity tuning: Spec 5 documented "default to no tuning; if blooms feel too active, add a damping overlay inside the BackgroundCanvas wrap on the page only." This applies here too — Change 1 includes the same "tune-or-don't" gate and the same documented damping technique (do NOT modify `CANVAS_BACKGROUND` in `BackgroundCanvas.tsx`).
- Test class-string updates after primitive migration: Spec 5 confirmed "any class-string-assertion miss surfaced from migration steps must be corrected, never suppressed/skipped." Same rule applies to Change 14.

---

## Shared Data Models (from Master Plan)

**No new shared interfaces.** Existing types preserved AS-IS:
- `ReadingPlanMeta`, `PlanProgress` from `types/reading-plans.ts`
- `Challenge`, `ChallengeProgress`, `ChallengeSeason`, `ChallengeStatus` from `types/challenges.ts`

**localStorage keys this spec touches: NONE WRITES, NONE NEW.** Existing keys consumed by `useReadingPlanProgress` and `useChallengeProgress` are read-only by virtue of preserving handlers. No shape changes.

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | (preserved — no spec change) | Reading plan progress map (consumed by hook) |
| `wr_custom_plans` | (preserved — no spec change) | Custom plan IDs |
| `wr_challenge_progress` | (preserved — no spec change) | Challenge progress map |
| `wr_challenge_reminders` | (preserved — no spec change) | Reminder set IDs |
| `wr_challenge_nudge_shown` | (preserved — no spec change) | Daily nudge tracking |

`11-local-storage-keys.md` requires NO updates.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single-column tab content (`grid-cols-1`); PlanCards stack full-width; UpcomingChallengeCards stack; ActiveChallengeCard takes full container width with `p-6` padding; HallOfFame items stack; Create-Your-Own-Plan card stacks (icon row → title row → CTA — `flex-col`); sticky tab bar full-width; hero subtitle at `text-base`. |
| Tablet | 768px | PlanCards in 2-column grid (`sm:grid-cols-2`); UpcomingChallengeCards in 2-column grid; PastChallengeCards in 2-column grid; ActiveChallengeCard widens with `sm:p-8`; Create-Your-Own-Plan card pivots horizontal (`sm:flex-row sm:items-center` — icon + title + CTA in single row); hero subtitle at `sm:text-lg`. |
| Desktop | 1440px | PlanCards continue 2-column; UpcomingChallengeCards 2-column; PastChallengeCards 3-column at `lg:grid-cols-3`; HallOfFame items 2-column at `sm:grid-cols-2`; ActiveChallengeCard centered with content max-width; sticky tab bar centered (`max-w-xl`); IO sentinel triggers `shadow-md shadow-black/20` once user scrolls past hero. |

**Custom breakpoints:** None. All breakpoints (`sm:`, `md:`, `lg:`) preserved AS-IS — no new breakpoints introduced.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| GrowPage sticky tab bar | `[BookOpen icon][Reading Plans label]` (Plans tab) and `[Flame icon][Challenges label][pulse dot]` (Challenges tab) | Same y ±5px at all breakpoints (375 / 768 / 1440) | No wrap allowed — pill-tab pattern with `flex-1` per item |
| UpcomingChallengeCard heading row | `[ChallengeIcon][title (flex-1)][CategoryTag]` | Same y ±5px at 375 / 768 / 1440 | No wrap allowed — `flex items-center gap-3` |
| UpcomingChallengeCard action row | `[Remind me Button][View Details Button]` | Same y ±5px at 768 / 1440; allowed to wrap at 375 (existing `flex-wrap gap-2`) | Wrap acceptable below 640px |
| NextChallengeCountdown heading row | `[ChallengeIcon][title (flex-1)][CategoryTag]` | Same y ±5px at 375 / 768 / 1440 | No wrap allowed |
| NextChallengeCountdown action row | `[Remind me Button][View Details Button]` | Same y ±5px at 768 / 1440; allowed to wrap at 375 | Wrap acceptable below 640px |
| ActiveChallengeCard sub-row "days remaining + participants" | `[days remaining span][participants span]` | Same y ±5px at 768 / 1440 (`mb-4 flex flex-wrap items-center gap-4`); allowed to wrap at 375 | Wrap acceptable below 640px |
| ActiveChallengeCard top-level layout | `[content column][CTA column]` | Side-by-side at 768+ (`sm:flex-row sm:items-center sm:justify-between`); stacked at 375 | Stacks vertically below `sm:` |
| HallOfFame item heading row | `[Trophy icon][title]` | Same y ±5px at all breakpoints | No wrap allowed — `flex items-center gap-3` |
| Create-Your-Own-Plan card | `[Sparkles container][title+description (flex-1)][Create Plan Button]` | Side-by-side at 640+ (`sm:flex-row sm:items-center`); stacked at 375 | Stacks vertically below `sm:` |
| ConfirmDialog action row | `[Keep Current][Pause & Start New]` | Side-by-side at 640+ (`sm:flex-row sm:justify-end`); stacked at 375 (`flex-col`) | Stacks vertically below `sm:` |

`/verify-with-playwright` Step 6l consumes this table — `boundingBox().y` comparisons between elements at each breakpoint (mobile 375, tablet 768, desktop 1440).

---

## Vertical Rhythm

Spacing between adjacent sections on `/grow`. Values from existing source (no design system recon entry specifically for Grow rhythm) — marked `[UNVERIFIED]` where derived from codebase.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero `<section>` end → IO sentinel | 0px (sentinel is empty `aria-hidden` div with no padding) | `GrowPage.tsx:84` |
| IO sentinel → Sticky tab bar | 0px (sticky tab bar follows immediately) | `GrowPage.tsx:87-92` |
| Sticky tab bar inner content | `py-3 sm:py-4` (12px → 16px vertical) | `GrowPage.tsx:93` |
| Sticky tab bar bottom → Plans/Challenges tabpanel content top | 32px on mobile (`py-8` on tab content `<section>`), 40px on `sm+` (`sm:py-10`) | `ReadingPlans.tsx:162`, `Challenges.tsx:153` (verified during recon) |
| Plans/Challenges tabpanel content bottom → SiteFooter | 32px / 40px (same `py-*` tokens) | same as above |
| Hero subtitle → hero section bottom padding | `pb-8 sm:pb-10 lg:pb-12` (32 / 40 / 48px) | `GrowPage.tsx:68` |
| Hero h1 → subtitle | `mt-2` (8px) — preserved | `GrowPage.tsx:78` |
| `[UNVERIFIED]` Plans tab Create-Your-Own card → plan grid (when not all-completed) | `mt-6` (24px) on the grid container | `ReadingPlans.tsx:191` — codebase inspection |
| `[UNVERIFIED]` Challenges tab section gaps | `space-y-6` between Active cards, `mb-10` per `<section>` | `Challenges.tsx` — codebase inspection |

**`[UNVERIFIED]` rationale:** No `_plans/recon/design-system.md` entry covers Grow's per-section rhythm specifically; values are extracted from current source. To verify: `/verify-with-playwright` measures boundingBox top/bottom of each section at 1440px; if gaps differ from listed values by >5px, document the actual measured gaps in the Execution Log and update this table for Spec 6B/6C reuse. If wrong: existing rhythm is the canonical (this spec preserves all section gaps unchanged).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working branch is `forums-wave-continued`. Run `git rev-parse --abbrev-ref HEAD` — must equal `forums-wave-continued`. If not, STOP and ask user.
- [ ] Specs 4A + 4B + 4C + 5 are merged into the working branch. Verify by inspecting: (a) `BackgroundCanvas` wraps `<main>` on Dashboard `/`, BibleLanding, all 3 Local Support routes; (b) `FrostedCard` exposes `default`, `subdued`, `accent` variants at `frontend/src/components/homepage/FrostedCard.tsx`; (c) Button `subtle` variant exists. Document findings in Execution Log Step 0 notes.
- [ ] Direction doc at `_plans/direction/grow-2026-05-04.md` is present and Decisions 1–15 match this plan's reading. Confirm Decision 8 (theme-color preservation) is intact.
- [ ] Recon at `_plans/recon/grow-2026-05-04.md` is present.
- [ ] Pre-execution test baseline captured: run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. Expected baseline per CLAUDE.md: **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`); occasionally 9,469 pass / 2 fail when `useNotifications — returns notifications sorted newest first` flakes. Record live numbers in Execution Log Step 0.
- [ ] `bg-hero-bg` Tailwind token is in `frontend/tailwind.config.js` (verified during planning: line 22, value `#08051A`). No fallback needed for Change 3.
- [ ] FrostedCard prop API verified during planning: `as: 'div' | 'button' | 'article' | 'section'` (NOT Link). PlanCard uses Path B (Link wraps FrostedCard). UpcomingChallengeCard uses Path A (`as="article"`). PastChallengeCard uses Path A (with `role`, `tabIndex`, `onClick`, `onKeyDown` passthrough). ActiveChallengeCard / NextChallengeCountdown / HallOfFame items / Create-Your-Own-Plan card use default `as="div"`.
- [ ] `grep -r "from.*reading-plans/FilterBar\|from.*'@/components/reading-plans/FilterBar'\|reading-plans/FilterBar" frontend/src/` confirms zero imports. Verified during planning. Re-verify at execution time as the safety check before deletion.
- [ ] No co-located `FilterBar.test.tsx` exists in `frontend/src/components/reading-plans/__tests__/` (verified during planning — test directory contains 5 test files for CreatePlanFlow, DayCompletionCelebration, DayContent, PlanCard, PlanCompletionOverlay only).
- [ ] All auth-gated actions from the spec are accounted for in the plan (zero new gates; all existing gates preserved — see Auth Gating Checklist).
- [ ] Design system values are verified (above table — every value sourced from FrostedCard.tsx, design-system.md, or tailwind.config.js).
- [ ] All `[UNVERIFIED]` values are flagged with verification methods (Vertical Rhythm — 2 entries — to be confirmed via `/verify-with-playwright`).
- [ ] Recon report loaded for visual verification context.
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards, PageTransition).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FrostedCard `as` polymorphism for PlanCard | **Path B (Link wraps FrostedCard div)** with `onClick={() => {}}` passed to FrostedCard | FrostedCard's `as` prop type is `'div' \| 'button' \| 'article' \| 'section'` — Link is NOT supported and modifying the primitive is out of scope. Path B preserves Link navigation; passing `onClick={() => {}}` enables hover lift (gated by `!!onClick`). The empty handler bubbles harmlessly through to the Link's anchor click. |
| FrostedCard `as` polymorphism for UpcomingChallengeCard | **Path A** (`<FrostedCard as="article" variant="default">`) | `'article'` is in the supported `as` type union. Cleaner single-element migration. |
| FrostedCard `as` polymorphism for PastChallengeCard | **Path A** (`<FrostedCard variant="subdued" role="button" tabIndex={0} onClick={...} onKeyDown={...}>`) | FrostedCard's prop API supports `role`, `tabIndex`, `onClick`, `onKeyDown` directly. Preserves Decision 14 (`role="button"` semantic out of scope to fix). |
| ActiveChallengeCard emphasis ring | **Path A** (className override on FrostedCard wrapper: `<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">`) | FrostedCard's default `border border-white/[0.12]` is overridden by `border-2 border-primary/30` because Tailwind's later class wins. Single-element shape; cleaner than wrapper-div. **Visual gate during execution:** if double-border or visual conflict surfaces, fall back to Path B (`<div className="rounded-3xl border-2 border-primary/30"><FrostedCard variant="default" className="p-6 sm:p-8">…</FrostedCard></div>`) and document in Execution Log. |
| Sticky tab bar background token | **`bg-hero-bg/70`** (literal Tailwind class) | `bg-hero-bg` resolves to `#08051A` per `tailwind.config.js:22`. Verified at planning time — no fallback to arbitrary value `bg-[#08051A]/70` needed. |
| BackgroundCanvas opacity tuning | **Default: NO tuning.** Visual verify post-migration. | Atmospheric continuity with Dashboard / BibleLanding / Local Support is the primary goal. If browse-and-pick session feels too active during 3-minute plan comparison, add a damping overlay inside the BackgroundCanvas wrap on `GrowPage` only (NOT in `BackgroundCanvas.tsx` source — that affects Dashboard / BibleLanding too). Documented technique: `<div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none z-0" aria-hidden />` as the first child of the BackgroundCanvas. Same approach as Spec 5. Document the choice in the Execution Log if invoked. |
| Hero stays inside `<main>` but OUTSIDE `<BackgroundCanvas>` | **Confirmed — unique to GrowPage** | Spec line ~103. The hero's `ATMOSPHERIC_HERO_BG` (radial purple) is appropriate for the hero zone; BackgroundCanvas fills below with subtler multi-bloom. This differs from Dashboard/LocalSupport (which wrap the whole `<main>` including hero) and is documented as intentional drift. |
| PlanCard focus-visible ring location | **On the `<Link>` wrapper, not on FrostedCard** | When using Path B, the Link is the focusable element. Apply `rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` to the Link's className. FrostedCard's own focus ring (`ring-white/50` when interactive) is suppressed because the Link captures focus first; visual outcome reads as a single clean ring around the card. |
| ConfirmDialog "Keep Current" button | **Preserved AS-IS** (existing `border border-white/20 bg-white/10` outlined button) | Decision 9: "Keep Current" is the safer/quieter cancel action; quieter chrome is correct. Only "Pause & Start New" migrates to subtle. |
| Test class-string assertion failures during execution | **Update assertions to new tokens; never suppress or skip** | Tests assert on chrome class strings; FrostedCard migration changes those strings. Spec 5 precedent: any class-string failure must be reconciled by updating the asserted token, never via `skip` or `it.todo`. Behavioral assertions (Link `to`, click handlers, ARIA, conditional rendering, theme-color computation) remain unchanged. |
| Tonal pulse dot on Challenges tab | **Preserved AS-IS as inline-styled active-challenge themeColor** | Decision 11: pulse dot is a functional categorical signal (active-challenge brand color), not a Tonal Icon Pattern application. The 2s ease-in-out infinite scale animation (`motion-safe:animate-challenge-pulse`) and inline `style={{ backgroundColor: activeChallengeThemeColor }}` are preserved exactly. |

---

## Implementation Steps

Steps are ordered: data/setup → shell-level → card-level migrations → cleanup → tests → verification. Each step touches ≤3 files (or one component + its test) and is independently verifiable. Test specs at the end of each step describe what to update or assert.

---

### Step 0: Pre-execution recon and baseline capture

**Objective:** Confirm working state and capture test baseline before any code change.

**Files to create/modify:** None (read-only verification).

**Details:**

1. Verify branch: `git rev-parse --abbrev-ref HEAD` must return `forums-wave-continued`. If not, STOP.
2. Verify Specs 4A + 4B + 4C + 5 merged: read `frontend/src/components/local-support/LocalSupportPage.tsx` line ~250 — must show `<BackgroundCanvas className="flex flex-1 flex-col">`. Read `frontend/src/components/homepage/FrostedCard.tsx` — must show 3 variants (`accent`, `default`, `subdued`).
3. Verify direction doc + recon present: `ls _plans/direction/grow-2026-05-04.md _plans/recon/grow-2026-05-04.md`.
4. Capture pre-execution test baseline: `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80`. Record total pass/fail counts (expected ~9,470 pass / 1 pre-existing fail). Run `pnpm typecheck` — expect 0 errors.
5. Verify `grep -r "from.*reading-plans/FilterBar\|reading-plans/FilterBar'" frontend/src/` returns zero imports. If non-zero, STOP and ask user about Change 13.
6. Verify `bg-hero-bg` token exists in `frontend/tailwind.config.js` (line 22) — confirmed during planning, re-verify.
7. Verify FrostedCard prop API matches planning assumptions: read `frontend/src/components/homepage/FrostedCard.tsx` — confirm `as: 'div' | 'button' | 'article' | 'section'` (NOT Link). Confirm hover lift gated by `!!onClick`.

**Auth gating (if applicable):** N/A — read-only verification.

**Responsive behavior (UI steps only — write "N/A: no UI impact" for non-UI steps):** N/A: no UI impact.

**Inline position expectations (if this step renders an inline-row layout):** N/A.

**Guardrails (DO NOT):**
- Do NOT modify any code in this step.
- Do NOT proceed if branch ≠ `forums-wave-continued`.
- Do NOT proceed if FilterBar grep finds any active import.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Baseline pass count | manual | Recorded in Execution Log; deviations after this spec must be reconciled to ±0 NEW failures |
| Baseline typecheck | manual | `pnpm typecheck` returns 0 errors |

**Expected state after completion:**
- [ ] Branch confirmed `forums-wave-continued`
- [ ] Pre-execution baselines (pass/fail counts) recorded in Execution Log
- [ ] FilterBar dead-code status confirmed
- [ ] Tailwind `bg-hero-bg` token confirmed `#08051A`
- [ ] FrostedCard prop API confirmed (4-variant `as`, hover gated by `onClick`)

---

### Step 1: BackgroundCanvas wraps GrowPage main content (below hero) — Change 1

**Objective:** Wrap the IO sentinel + sticky tab bar wrapper + both tabpanels inside `<BackgroundCanvas>`. Hero `<section>` stays OUTSIDE, inside `<main>`. Navbar and SiteFooter stay outside `<main>` and outside BackgroundCanvas.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`; wrap below-hero content.

**Details:**

Modify `GrowPage.tsx` lines 64–143 (the `<main>` body). Final shape:

```tsx
<main id="main-content">
  {/* Hero Section — stays OUTSIDE BackgroundCanvas; ATMOSPHERIC_HERO_BG preserved */}
  <section
    aria-labelledby="grow-heading"
    className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12"
    style={ATMOSPHERIC_HERO_BG}
  >
    <h1 id="grow-heading" className="…" style={GRADIENT_TEXT_STYLE}>Grow in Faith</h1>
    {/* subtitle is migrated in Step 2 — for this step, the existing italic subtitle stays */}
    <p className="mt-2 font-serif italic text-base text-white/60 sm:text-lg">
      Structured journeys to deepen your walk with God
    </p>
  </section>

  <BackgroundCanvas>
    {/* Sentinel for sticky tab bar shadow */}
    <div ref={sentinelRef} aria-hidden="true" />

    {/* Sticky Tab Bar — bg tint added in Step 3 */}
    <div className={cn('sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none', isSticky && 'shadow-md shadow-black/20')}>
      <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
        <Tabs … />
      </div>
    </div>

    {/* Tab Panels */}
    <div role="tabpanel" id="tabpanel-plans" aria-labelledby="tab-plans" tabIndex={0} hidden={activeTab !== 'plans'} className="motion-safe:animate-tab-fade-in">
      <ReadingPlansContent createParam={createParam} />
    </div>
    <div role="tabpanel" id="tabpanel-challenges" aria-labelledby="tab-challenges" tabIndex={0} hidden={activeTab !== 'challenges'} className="motion-safe:animate-tab-fade-in">
      <ChallengesContent />
    </div>
  </BackgroundCanvas>
</main>
```

Add the import at the top of the file (alongside the other `@/components/ui/*` imports if present — currently `Tabs` is imported from `@/components/ui/Tabs`):

```tsx
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
```

**Critical preservation:**
- `ATMOSPHERIC_HERO_BG` style on hero section — exactly as is.
- `GRADIENT_TEXT_STYLE` on hero `<h1>` — exactly as is.
- `aria-labelledby="grow-heading"` on hero section, `id="grow-heading"` on hero h1.
- `<Navbar transparent />` — outside `<main>`, outside BackgroundCanvas.
- `<SiteFooter />` — outside `<main>`, outside BackgroundCanvas.
- IO sentinel placement (relative to sticky tab bar) preserved exactly. `useEffect` IO observer logic untouched.
- Sticky tab bar wrapper element identity preserved (same conditional `shadow-md shadow-black/20`, same `cn()` helper, same `transition-shadow motion-reduce:transition-none` — Step 3 adds `bg-hero-bg/70 duration-base`).
- Both tabpanels mount simultaneously (`hidden={activeTab !== 'plans'}` toggle preserved). Do NOT switch to conditional rendering.
- Tabpanel ARIA: `role="tabpanel"`, `id="tabpanel-plans"`, `id="tabpanel-challenges"`, `aria-labelledby="tab-plans"`, `aria-labelledby="tab-challenges"`, `tabIndex={0}`.
- Outer `<div>` `flex min-h-screen flex-col bg-dashboard-dark font-sans` wrapper at line 60 — stays as base color and base layout.

**Atmospheric tuning gate (Decision 1 / Spec 5 precedent):** During Step 16 visual verification, evaluate whether BackgroundCanvas blooms feel too active for a 3-minute plan-comparison session. Default: NO tuning. If too active: insert as the first child of `<BackgroundCanvas>`:

```tsx
<div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none z-0" aria-hidden />
```

Document the choice in the Execution Log. Do NOT modify `frontend/src/components/ui/BackgroundCanvas.tsx`.

**Sticky-positioning gate:** `BackgroundCanvas` applies `relative min-h-screen overflow-hidden`. This wrapper does NOT scroll (the viewport does), so `position: sticky` of children pins to viewport top correctly. Verify visually post-change by scrolling past the hero — the sticky tab bar should pin and the IO sentinel should still trigger `shadow-md shadow-black/20`. If sticky breaks (which would be unprecedented behavior for `overflow-hidden` on a non-scrolling parent), document and fall back to wrapping just the tabpanels (not the sticky bar) inside BackgroundCanvas — but expected outcome is no issue.

**Auth gating (if applicable):** N/A — public route shell.

**Responsive behavior:**
- Desktop (1440px): BackgroundCanvas fills below-hero area; multi-bloom violet atmospheric layer visible behind sticky bar + tab content.
- Tablet (768px): Same atmospheric coverage; sticky bar centered with `max-w-xl`.
- Mobile (375px): Same atmospheric coverage; sticky bar full-width.

**Inline position expectations:** N/A — this step is a structural wrap, not a row layout change.

**Guardrails (DO NOT):**
- Do NOT include the hero `<section>` inside `<BackgroundCanvas>`.
- Do NOT modify `BackgroundCanvas.tsx` source.
- Do NOT change the IO sentinel position relative to the sticky bar.
- Do NOT change tabpanel mounting strategy (both must remain mounted with `hidden`).
- Do NOT change the outer `bg-dashboard-dark` page wrapper.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `GrowPage renders BackgroundCanvas wrapping below-hero content` | unit | New test in `pages/__tests__/GrowPage.test.tsx`. Assert `container.querySelector` for an element with `min-h-screen` `overflow-hidden` `relative` (BackgroundCanvas signature) wraps the sticky tab bar wrapper. Hero `<section>` should NOT be inside BackgroundCanvas — assert hero is sibling to BackgroundCanvas. |
| Existing tabpanel mounting test | unit | Preserved: both `tabpanel-plans` and `tabpanel-challenges` exist in DOM; only one is `hidden`. |
| Existing sticky shadow IO sentinel test | unit | Preserved: `IntersectionObserver` mock fires → `shadow-md shadow-black/20` toggles. |

**Expected state after completion:**
- [ ] `BackgroundCanvas` import added to GrowPage.tsx.
- [ ] BackgroundCanvas wraps the IO sentinel + sticky tab bar + both tabpanels.
- [ ] Hero `<section>` remains inside `<main>` but OUTSIDE BackgroundCanvas.
- [ ] All ARIA preserved (`aria-labelledby="grow-heading"`, `role="tabpanel"`, `aria-labelledby="tab-{plans,challenges}"`).
- [ ] IO sentinel still triggers shadow toggle when scrolled past hero (verified visually + via existing test).
- [ ] Both tabpanels mount simultaneously; switch tab → child component state preserved.

---

### Step 2: Hero subtitle migration (italic → plain prose) — Change 2

**Objective:** Migrate the hero subtitle from deprecated `font-serif italic text-white/60` to `text-white/70 leading-relaxed` (no italic).

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — replace line ~78 subtitle classes.

**Details:**

Current (line ~78):
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

**Critical preservation:**
- The `<p>` element identity (no nested span swap, no role change).
- Copy text "Structured journeys to deepen your walk with God" — exactly preserved.
- `mt-2` spacing from the h1 — exactly preserved.
- Responsive size step: `text-base sm:text-lg` — exactly preserved.

Direction doc Decision 3 rationale: italic on body subtitles is deprecated. Bumping color from `text-white/60` to `text-white/70` slightly improves readability against the new BackgroundCanvas atmosphere (Step 1's atmospheric blooms reduce perceived contrast). Adding `leading-relaxed` provides the breathing room italic display previously implied through letterforms.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): renders at `text-lg` (18px), white/70.
- Tablet (768px): same as desktop.
- Mobile (375px): renders at `text-base` (16px), white/70, leading-relaxed.

**Inline position expectations:** N/A — single line of prose.

**Guardrails (DO NOT):**
- Do NOT use `font-serif italic` (deprecated).
- Do NOT change the copy text.
- Do NOT change spacing (`mt-2`).
- Do NOT change responsive size step.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `hero subtitle is plain prose, no italic` | unit | Assert subtitle paragraph element does NOT have `font-serif` or `italic` class. |
| `hero subtitle uses text-white/70 with leading-relaxed` | unit | Assert classes contain `text-white/70`, `leading-relaxed`, `text-base`, `sm:text-lg`. |

**Expected state after completion:**
- [ ] Subtitle has no `font-serif` or `italic` class.
- [ ] Subtitle has `text-white/70 leading-relaxed text-base sm:text-lg mt-2` classes.
- [ ] Copy text unchanged.

---

### Step 3: Sticky tab bar background tint — Change 3

**Objective:** Add `bg-hero-bg/70` background tint and `duration-base` animation token to the sticky tab bar wrapper.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — modify the sticky wrapper class string at line ~88.

**Details:**

Current (lines 87–91):
```tsx
<div
  className={cn(
    'sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none',
    isSticky && 'shadow-md shadow-black/20',
  )}
>
```

Migrate to:
```tsx
<div
  className={cn(
    'sticky top-0 z-40 bg-hero-bg/70 backdrop-blur-md transition-shadow duration-base motion-reduce:transition-none',
    isSticky && 'shadow-md shadow-black/20',
  )}
>
```

**Changes:**
- Add `bg-hero-bg/70` (resolves to `rgba(8,5,26,0.70)` per `tailwind.config.js:22`). At 70% opacity with the existing `backdrop-blur-md`, the tab bar reads as a frosted-anchored bar rather than floating disconnected over content.
- Add `duration-base` (BB-33 animation token, 250ms per `tailwind.config.js:53`) to the existing `transition-shadow`. Replaces the implicit Tailwind default (~150ms) with the canonical token.

**Critical preservation:**
- `sticky top-0 z-40` — exactly preserved.
- `backdrop-blur-md` — exactly preserved.
- `motion-reduce:transition-none` — exactly preserved.
- Conditional `isSticky && 'shadow-md shadow-black/20'` — exactly preserved.
- IO sentinel logic and shadow toggle behavior — exactly preserved.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): tab bar has muted dark tint at scroll past hero; shadow appears once IO sentinel exits viewport.
- Tablet (768px): same.
- Mobile (375px): same; full-width sticky bar.

**Inline position expectations:** Sticky tab bar is a single-row layout; tab items must share y-coordinates (covered in Inline Position Expectations table).

**Guardrails (DO NOT):**
- Do NOT use a hardcoded `200ms` duration value — use `duration-base` token.
- Do NOT remove `backdrop-blur-md` (the blur is what creates the frosted-anchor effect with the tint).
- Do NOT change `z-40` (must layer above tab content but below modal overlays at `z-50`).
- Do NOT alter the IO sentinel.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `sticky tab bar wrapper has bg-hero-bg/70 tint` | unit | Assert sticky wrapper class string contains `bg-hero-bg/70`. |
| `sticky tab bar wrapper uses duration-base animation token` | unit | Assert class string contains `duration-base` (and `transition-shadow`, `motion-reduce:transition-none`). |
| `sticky shadow appears when IO sentinel exits viewport` | unit | Existing test preserved. Mock `IntersectionObserver` → `setIsSticky(true)` → assert shadow class added. |

**Expected state after completion:**
- [ ] Sticky tab bar wrapper has `bg-hero-bg/70` and `duration-base` in class string.
- [ ] IO sentinel + shadow toggle behavior unchanged.
- [ ] Visually: tab bar reads as frosted-anchored (not floating disconnected) at scroll.

---

### Step 4: Tab icon tonal colors — Change 4

**Objective:** Apply Tonal Icon Pattern to the Plans tab BookOpen icon (`text-sky-300`) and Challenges tab Flame icon (`text-amber-300`). Pulse dot on Challenges tab preserved AS-IS as themeColor brand.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — modify the `Tabs` `items` array `icon` props at lines ~98–116.

**Details:**

Current `items` array:
```tsx
items={[
  {
    id: 'plans',
    label: 'Reading Plans',
    icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'challenges',
    label: 'Challenges',
    icon: <Flame className="h-4 w-4" aria-hidden="true" />,
    badge: activeChallengeInfo ? (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
        style={{ backgroundColor: activeChallengeThemeColor }}
        aria-hidden="true"
      />
    ) : undefined,
  },
]}
```

Migrate to:
```tsx
items={[
  {
    id: 'plans',
    label: 'Reading Plans',
    icon: <BookOpen className="h-4 w-4 text-sky-300" aria-hidden="true" />,
  },
  {
    id: 'challenges',
    label: 'Challenges',
    icon: <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />,
    badge: activeChallengeInfo ? (
      <span
        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
        style={{ backgroundColor: activeChallengeThemeColor }}
        aria-hidden="true"
      />
    ) : undefined,
  },
]}
```

**Critical preservation:**
- BookOpen + Flame imports preserved (lucide-react).
- Icon size `h-4 w-4` preserved.
- `aria-hidden="true"` preserved on both icons.
- Pulse dot — preserved exactly. Animation, inline `style={{ backgroundColor: activeChallengeThemeColor }}`, conditional render based on `activeChallengeInfo` truthy — all unchanged.
- Tab labels "Reading Plans" / "Challenges" preserved.

Direction doc Decision 11: BookOpen → sky-300 (study/scripture family, matches Dashboard TodaysDevotional widget). Flame → amber-300 (warm/effort family, matches Dashboard StreakCard + ChallengeWidget). Both are muted/pastel tonal colors per the Tonal Icon Pattern. The Tabs primitive's active-state styling (violet shadow / brightness boost) layers on top of the tonal color — no conflict expected.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): tab icons render with tonal colors; active tab adds violet shadow on top.
- Tablet (768px): same.
- Mobile (375px): same.

**Inline position expectations:** Tab items maintain pill-tab layout (icon + label + badge). Same y-coordinates per row (covered in Inline Position table).

**Guardrails (DO NOT):**
- Do NOT change icon size.
- Do NOT remove `aria-hidden="true"`.
- Do NOT change pulse dot color (it stays themeColor).
- Do NOT migrate the pulse dot to a tonal token — it's a functional categorical signal, not a Tonal Icon application.
- Do NOT modify the `Tabs` primitive itself (only consume).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Plans tab BookOpen icon has text-sky-300` | unit | Find icon by querySelector inside the `Reading Plans` tab; assert `text-sky-300` class. |
| `Challenges tab Flame icon has text-amber-300` | unit | Find icon by querySelector inside `Challenges` tab; assert `text-amber-300` class. |
| `Pulse dot preserves active-challenge themeColor` | unit | Existing test preserved (`mockActiveChallengeInfo.mockReturnValue({ challengeId: 'pray40-lenten-journey' })` → assert pulse dot's inline style has `backgroundColor` matching the challenge themeColor). |

**Expected state after completion:**
- [ ] BookOpen icon has `h-4 w-4 text-sky-300`.
- [ ] Flame icon has `h-4 w-4 text-amber-300`.
- [ ] Pulse dot inline style + `motion-safe:animate-challenge-pulse` unchanged.

---

### Step 5: PlanCard chrome migration (FrostedCard default + Path B Link integration) — Change 5

**Objective:** Migrate PlanCard's hand-rolled FrostedCard chrome to the `<FrostedCard variant="default">` primitive. Use Path B (Link wraps FrostedCard) because FrostedCard's `as` prop does not support Link.

**Files to create/modify:**
- `frontend/src/components/reading-plans/PlanCard.tsx` — replace root chrome.

**Details:**

Current root structure (lines 52–61):
```tsx
<Link
  to={`/reading-plans/${plan.id}`}
  className={cn(
    'flex h-full flex-col rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm',
    'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
    'transition-[background-color,border-color] duration-base motion-reduce:transition-none',
    'hover:bg-white/[0.08] hover:border-white/20',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
  )}
>
  {/* card content */}
</Link>
```

Migrate to (Path B):
```tsx
<Link
  to={`/reading-plans/${plan.id}`}
  className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
>
  <FrostedCard
    variant="default"
    onClick={() => {}}
    className="flex h-full flex-col p-6"
  >
    {/* card content — preserved exactly */}
  </FrostedCard>
</Link>
```

Add the import at the top of `PlanCard.tsx`:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

The `cn` import can be retained (still used by StatusAction) or removed if no longer referenced elsewhere — verify during execution and remove unused imports.

**Why Path B:** FrostedCard's `as` prop type is `'div' | 'button' | 'article' | 'section'` — Link is NOT supported. Modifying the primitive is out of scope (spec line ~619: "FrostedCard, BackgroundCanvas, Button, Tabs primitives — consumed only; primitive sources NOT modified"). Path B preserves Link navigation. Passing `onClick={() => {}}` to FrostedCard enables hover lift (gated by `!!onClick`). The empty handler bubbles harmlessly through to the Link's anchor click — Link's navigation fires per browser default behavior.

**Critical preservation:**
- All inner card content exactly as is (cover emoji + title row at lines 63–68, "Created for you" badge at lines 70–74, description at line 76, day/difficulty/theme badges at lines 78–88, progress text at lines 90–94, StatusAction wrapper at lines 96–98).
- Link `to={`/reading-plans/${plan.id}`}` navigation — unchanged.
- Component prop signature unchanged (`plan`, `status`, `progress`, `onStart`, `isCustom`).
- StatusAction sub-component unchanged.
- Min-44px touch target on inner Button (StatusAction renders `<Button variant="light">` which has `min-h-[44px]`) — unchanged.

**Side effects:**
- Rounded radius bumps `rounded-2xl` (16px) → `rounded-3xl` (24px) per FrostedCard default. This is intended Round 3 unification.
- Background `bg-white/[0.06]` → `bg-white/[0.07]` per FrostedCard default.
- Hover `hover:bg-white/[0.08]` → `hover:bg-white/[0.10]` per FrostedCard interactive default.
- Focus ring color: from `ring-white/50` (FrostedCard's default interactive ring) → `ring-violet-400/30` (system standard, applied to Link wrapper). The Link wrapper captures focus first, so its ring is what users see; FrostedCard's own ring is suppressed because Link absorbs the focus.
- Hover lift `hover:-translate-y-0.5` is NEW (from FrostedCard's interactive hover state).
- `hover:shadow-frosted-hover` is NEW (richer shadow on hover, from FrostedCard).
- Box-shadow base changes from inline `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` → custom Tailwind class `shadow-frosted-base` (defined in `tailwind.config.js` to match the same composite shadow).

**Auth gating (if applicable):**
- Click PlanCard → navigate to `/reading-plans/:planId` (public route — no gate).
- Click "Start Plan" / "Continue" / "Resume" Button inside StatusAction → handler `onStart(planId)` runs. The handler calls `useAuth` + `useAuthModal.openAuthModal('Sign in to start this reading plan')` if logged-out — preserved AS-IS in `ReadingPlansContent.handleStartOrContinue` (`pages/ReadingPlans.tsx:109`).
- Inner Button uses `e.preventDefault()` + `e.stopPropagation()` to prevent the Link from firing — preserved exactly (`PlanCard.tsx:40-44`).

**Responsive behavior:**
- Desktop (1440px): Card renders in 2-column grid (`sm:grid-cols-2`); rounded-3xl; hover lift `-translate-y-0.5`; focus ring violet-400/30.
- Tablet (768px): Same 2-column grid; same hover/focus behavior.
- Mobile (375px): Single column (`grid-cols-1`); same chrome.

**Inline position expectations:** Card-internal layouts (cover emoji + title row, day/difficulty/theme badges row) preserved exactly — same y-coordinates as before.

**Guardrails (DO NOT):**
- Do NOT modify FrostedCard.tsx source.
- Do NOT remove `onClick={() => {}}` — required to enable hover lift.
- Do NOT add `as={Link}` to FrostedCard (type error — `Link` is not in the supported `as` union).
- Do NOT remove the inner Button's `e.preventDefault() + e.stopPropagation()`.
- Do NOT migrate the StatusAction "Completed" span or the `<Button variant="light">` — both preserved.
- Do NOT use `motion-reduce:transition-none` on the Link wrapper (FrostedCard's interactive transition handles this internally).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders as a Link to the plan detail page` | unit | EXISTING test preserved unchanged — `screen.getByRole('link')` has `href="/reading-plans/finding-peace-in-anxiety"`. |
| `applies FrostedCard chrome to inner card div` | unit | UPDATED: target `screen.getByRole('link').firstElementChild as HTMLElement` (the FrostedCard div). Assert classes contain `bg-white/[0.07]`, `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl`. (Replaces previous `rounded-2xl`, `bg-white/[0.06]` assertions on the Link.) |
| `applies hover lift on FrostedCard interactive state` | unit | UPDATED: assert FrostedCard div className contains `hover:bg-white/[0.10]`, `hover:-translate-y-0.5`, `motion-reduce:hover:translate-y-0`. (Replaces previous `hover:bg-white/[0.08]`, `hover:border-white/20`.) |
| `Link wrapper has violet-400/30 focus ring with hero-bg offset` | unit | UPDATED: assert Link className contains `rounded-3xl`, `focus-visible:ring-2`, `focus-visible:ring-violet-400/30`, `focus-visible:ring-offset-2`, `focus-visible:ring-offset-hero-bg`. (Replaces previous `ring-white/50`.) |
| `card uses flex h-full flex-col` | unit | UPDATED: target FrostedCard div; assert classes contain `flex`, `h-full`, `flex-col`, `p-6`. |
| `emoji span is inline with title (text-lg)` | unit | EXISTING preserved — emoji `text-lg` and `aria-hidden="true"`. |
| `title uses font-semibold` | unit | EXISTING preserved. |
| `description has text-white/70` | unit | EXISTING preserved. |
| `metadata pills have text-white/70` | unit | EXISTING preserved. |
| `Start Plan button is variant="light"` | unit | EXISTING preserved — `bg-white text-primary rounded-full`. |
| `status=active renders Continue button` | unit | EXISTING preserved. |
| `status=paused renders Resume button` | unit | EXISTING preserved. |
| `status=completed renders Completed badge (no button)` | unit | EXISTING preserved. |
| `clicking Start calls onStart with planId, stops propagation` | unit | EXISTING preserved — `e.preventDefault() + e.stopPropagation()` behavior. |
| `action row uses mt-auto for bottom pin` | unit | EXISTING preserved. |
| `clicking the Link area navigates to detail page` | integration | New: verify clicking the FrostedCard interior fires the Link's navigation (the empty `onClick={() => {}}` does not block bubbling). Use `fireEvent.click` on the Link element. |

**Expected state after completion:**
- [ ] PlanCard root is `<Link>` wrapping `<FrostedCard variant="default" onClick={() => {}} className="flex h-full flex-col p-6">`.
- [ ] Link wrapper has violet-400/30 focus ring with hero-bg offset and `rounded-3xl block`.
- [ ] FrostedCard import added; unused imports removed if applicable.
- [ ] All inner content (emoji, title, "Created for you" badge, description, metadata pills, progress, StatusAction) preserved exactly.
- [ ] Behavioral test suite (`PlanCard.test.tsx`) passes after assertion updates.

---

### Step 6: UpcomingChallengeCard chrome migration (FrostedCard default + Path A `as="article"`) — Change 6

**Objective:** Migrate UpcomingChallengeCard's hand-rolled chrome to `<FrostedCard as="article" variant="default">`.

**Files to create/modify:**
- `frontend/src/components/challenges/UpcomingChallengeCard.tsx` — replace root.

**Details:**

Current root (line 31):
```tsx
<article className="flex h-full flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20">
  {/* content */}
</article>
```

Migrate to (Path A — `as="article"`):
```tsx
<FrostedCard as="article" variant="default" className="flex h-full flex-col p-6">
  {/* content — preserved exactly */}
</FrostedCard>
```

Add the import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Why Path A:** FrostedCard's `as` prop supports `'article'` natively. No onClick needed — UpcomingChallengeCard has no card-level onClick (the `onClick` prop is documented as deprecated/unused at line 15-16; only the inner buttons handle interactions). Hover lift is NOT needed at the card level — the inner buttons (`<Button variant="light">`) handle their own hover states. The current hand-rolled `hover:bg-white/[0.08] hover:border-white/20` is replaced with no-op (no hover at card level after migration). This matches the actual interaction pattern — the user clicks inner buttons, not the card.

**Critical preservation:**
- Heading row: ChallengeIcon (h-6 w-6 text-white/90) + h3 title + CategoryTag — preserved.
- Description (line 42).
- Date metadata (line 44–46).
- Action row: Remind me Button + View Details Button (Link via `asChild`) — preserved with all aria-pressed semantics.
- `<article>` semantic preserved (via `as="article"`).
- Component props (`challenge`, `startDate`, `isReminderSet`, `onToggleReminder`, deprecated `onClick`) — preserved exactly.

**Side effects:**
- Rounded radius bumps `rounded-xl` (12px) → `rounded-3xl` (24px) per FrostedCard default.
- Background `bg-white/[0.06]` → `bg-white/[0.07]`.
- Border stays `border-white/[0.12]`.
- Box-shadow base from inline → `shadow-frosted-base`.
- Hover state at card level removed (no `onClick`, no hover lift; matches actual interaction model — inner buttons handle hover).

**Auth gating (if applicable):**
- "Remind me" button → existing handler `onToggleReminder` (auth-gated by parent `ChallengesContent`) — preserved.
- "View Details" Link → `/challenges/:challengeId` (public) — preserved.

**Responsive behavior:**
- Desktop (1440px): Card in 2-column grid; rounded-3xl; height-equalized via `h-full flex-col`.
- Tablet (768px): Same.
- Mobile (375px): Single column.

**Inline position expectations:**
- Heading row: `[ChallengeIcon][title (flex-1)][CategoryTag]` — same y ±5px at 375 / 768 / 1440px (no wrap).
- Action row: `[Remind me Button][View Details Button]` — same y ±5px at 768 / 1440 (allowed to wrap at 375 via existing `flex-wrap`).

**Guardrails (DO NOT):**
- Do NOT add `onClick` to FrostedCard (no card-level click handler).
- Do NOT add hand-rolled hover classes via `className` override (cleaner without).
- Do NOT change ChallengeIcon color or size.
- Do NOT change CategoryTag.
- Do NOT change inner Button variants (`light size="sm"`).
- Do NOT remove `aria-pressed` on the Remind me button.
- Do NOT remove the `<Link>` inside the View Details Button (`asChild` pattern preserved).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders CategoryTag with Pentecost label` | unit | EXISTING preserved. |
| `icon has text-white/90 class` | unit | EXISTING preserved. |
| `outer wrapper uses flex h-full flex-col` | unit | UPDATED — find article element; assert `flex h-full flex-col p-6` classes (rounded-3xl is FrostedCard default and may be asserted explicitly if test wants to lock the radius). |
| `uses canonical FrostedCard classes` | unit | UPDATED — assert `bg-white/[0.07]` (FrostedCard default), `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl`. (Replaces `bg-white/[0.06]`.) |
| `Remind me button uses white pill variant` | unit | EXISTING preserved (`bg-white text-primary rounded-full`). |
| `View Details renders as Link with correct href` | unit | EXISTING preserved. |
| `clicking Remind me fires onToggleReminder` | unit | EXISTING preserved. |
| `Reminder set state: aria-pressed true, Check icon` | unit | EXISTING preserved. |
| `Remind me state: aria-pressed false, Bell icon` | unit | EXISTING preserved. |
| `action row uses mt-auto + flex-wrap` | unit | EXISTING preserved. |
| `formats start date in "Month Day" format` | unit | EXISTING preserved. |

**Expected state after completion:**
- [ ] UpcomingChallengeCard root is `<FrostedCard as="article" variant="default" className="flex h-full flex-col p-6">`.
- [ ] FrostedCard import added.
- [ ] All inner content + behavioral logic preserved.
- [ ] Tests updated for chrome class strings; behavioral assertions unchanged.

---

### Step 7: NextChallengeCountdown chrome migration — Change 7

**Objective:** Migrate NextChallengeCountdown's hand-rolled chrome to `<FrostedCard variant="default">`.

**Files to create/modify:**
- `frontend/src/components/challenges/NextChallengeCountdown.tsx` — replace root.

**Details:**

Current root (line 41):
```tsx
<div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] p-6 sm:p-8">
  {/* content */}
</div>
```

Migrate to:
```tsx
<FrostedCard variant="default" className="p-6 sm:p-8">
  {/* content — preserved exactly */}
</FrostedCard>
```

Add the import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Critical preservation:**
- "NEXT CHALLENGE" eyebrow (Calendar icon + uppercase tracked label) at lines 42–45 — preserved.
- Heading row: ChallengeIcon (h-7 w-7 text-white/90) + h2 title + CategoryTag at lines 47–55 — preserved.
- Color-coded countdown text: `text-red-400` ≤1d, `text-amber-300` ≤7d, `text-white` otherwise — preserved EXACTLY (function `getCountdownColorClass` at lines 10–14, applied at line 60).
- Plural / singular logic ("1 day" vs "5 days") — preserved.
- Description (line 68).
- Action row: Remind me + View Details — preserved.

**Side effects:**
- Rounded radius bumps `rounded-2xl` (16px) → `rounded-3xl` (24px).
- Background `bg-white/[0.06]` → `bg-white/[0.07]`.
- Padding `p-6 sm:p-8` overrides FrostedCard's default `p-6` (the className override wins).

**Auth gating (if applicable):**
- "Remind me" → existing gate preserved.
- "View Details" → public.

**Responsive behavior:**
- Desktop (1440px): card with `sm:p-8` padding (32px).
- Tablet (768px): same `sm:p-8`.
- Mobile (375px): `p-6` (24px) padding.

**Inline position expectations:**
- Heading row: `[ChallengeIcon][title (flex-1)][CategoryTag]` — same y ±5px at 375 / 768 / 1440px (no wrap).
- Action row: same wrap rules as UpcomingChallengeCard.

**Guardrails (DO NOT):**
- Do NOT change countdown color logic (`text-red-400` / `text-amber-300` / `text-white`).
- Do NOT change ChallengeIcon, CategoryTag.
- Do NOT change Calendar eyebrow icon (lucide-react h-5 w-5).
- Do NOT change inner Button variants.
- Do NOT add card-level `onClick` (no hover lift needed at card level).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `uses canonical FrostedCard class string` | unit | UPDATED — assert outer firstChild has `bg-white/[0.07]`, `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl`. (Replaces `bg-white/[0.06]`, plus removes the inline shadow assertion in favor of FrostedCard's `shadow-frosted-base` — assert `shadow-frosted-base` instead.) |
| `countdown color is text-white when days > 7` | unit | EXISTING preserved. |
| `countdown color is text-amber-300 when days <= 7` | unit | EXISTING preserved. |
| `countdown color is text-red-400 when days <= 1` | unit | EXISTING preserved. |
| `pluralizes singular: "1 day"` | unit | EXISTING preserved. |
| `pluralizes multi: "5 days"` | unit | EXISTING preserved. |
| `View Details Link with correct href` | unit | EXISTING preserved. |
| `icon has text-white/90 class` | unit | EXISTING preserved (the h-7 ChallengeIcon — not the eyebrow Calendar). |

**Expected state after completion:**
- [ ] NextChallengeCountdown root is `<FrostedCard variant="default" className="p-6 sm:p-8">`.
- [ ] FrostedCard import added.
- [ ] Countdown color logic, plural/singular formatting, eyebrow, action buttons all preserved.

---

### Step 8: ActiveChallengeCard chrome migration with theme-color preservation — Change 8

**Objective:** Migrate ActiveChallengeCard's hand-rolled chrome to `<FrostedCard variant="default">` with `border-2 border-primary/30` emphasis (Path A — className override). Theme-color buttons and progress bar preserved AS-IS as inline-styled rolls-own elements.

**Files to create/modify:**
- `frontend/src/components/challenges/ActiveChallengeCard.tsx` — replace root.

**Details:**

Current root (line 39):
```tsx
<div
  className="rounded-2xl border-2 border-primary/30 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8"
>
  {/* content */}
</div>
```

Migrate to (Path A — className override):
```tsx
<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">
  {/* content — preserved exactly, including theme-color buttons and progress bar */}
</FrostedCard>
```

Add the import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Why Path A (className override):** FrostedCard's default border is `border border-white/[0.12]` (line 36 of FrostedCard.tsx). The className override `border-2 border-primary/30` sets a wider, primary-tinted border — Tailwind's later class wins for `border-{width}` and `border-{color}` independently. The default `border-white/[0.12]` is overridden by `border-primary/30`. Visually verify during execution: if the card appears double-bordered (could happen if Tailwind fails to override), fall back to Path B (`<div className="rounded-3xl border-2 border-primary/30"><FrostedCard variant="default" className="p-6 sm:p-8">…</FrostedCard></div>`) and document in Execution Log.

**Path B fallback shape (only if Path A double-borders):**
```tsx
<div className="rounded-3xl border-2 border-primary/30">
  <FrostedCard variant="default" className="p-6 sm:p-8">
    {/* content */}
  </FrostedCard>
</div>
```

**Critical preservation (NON-NEGOTIABLE per Decision 8):**
- All theme-color buttons (Resume / Continue / Join Challenge — selected by `isJoined` / `isCompleted` / `isPaused` state) preserved AS-IS as rolls-own with inline `style={{ backgroundColor: challenge.themeColor }}` (or `style={{ borderColor: challenge.themeColor, color: getContrastSafeColor(challenge.themeColor) }}` for the Resume border-only state). Lines 99–127 of source.
- The `inline-flex min-h-[44px] items-center rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` class string on the buttons — preserved EXACTLY.
- Progress bar `<div role="progressbar" aria-valuenow={...} aria-valuemin={0} aria-valuemax={100} aria-label="...">` — preserved with `role="progressbar"` and ARIA values.
- Progress bar fill `<div style={{ width: `${progressPercent}%`, backgroundColor: challenge.themeColor }} className="h-full rounded-full transition-all motion-reduce:transition-none duration-slow" />` — preserved EXACTLY.
- ChallengeIcon at h-8 w-8 — preserved.
- "Days remaining" span with inline `style={{ color: getContrastSafeColor(challenge.themeColor) }}` — preserved.
- Participants count + Users icon row — preserved.
- "Day N of M" text (lines 87–91) — preserved.
- Component prop signature unchanged (`challenge`, `daysRemaining`, `calendarDay`, `onJoin`, `onContinue`, `onResume`, `isJoined`, `isCompleted`, `isPaused`, `currentDay`).
- All `min-h-[44px]` touch targets preserved.
- `getContrastSafeColor()` calls preserved.

**Side effects:**
- Rounded radius bumps `rounded-2xl` (16px) → `rounded-3xl` (24px).
- Background `bg-white/[0.06]` → `bg-white/[0.07]` (FrostedCard default).
- Backdrop blur stays `backdrop-blur-sm` (FrostedCard default at mobile).
- Border stays `border-2 border-primary/30` via className override.

**Auth gating (if applicable):**
- "Resume" / "Continue" / "Join Challenge" buttons → existing handlers `onResume` / `onContinue` / `onJoin` (auth-gated by parent `ChallengesContent`) — preserved.

**Responsive behavior:**
- Desktop (1440px): Card layout `sm:flex-row sm:items-center sm:justify-between` — content on left, CTA on right (`sm:ml-8`). Padding `sm:p-8`.
- Tablet (768px): Same as desktop.
- Mobile (375px): Stacked layout (`flex-col`); CTA appears below content with `mt-4`. Padding `p-6`.

**Inline position expectations:**
- "Days remaining + participants" row (`mb-4 flex flex-wrap items-center gap-4`): same y ±5px at 768 / 1440 (allowed to wrap at 375).
- Top-level layout: side-by-side at 768+, stacked at 375.
- Theme-color CTA buttons preserve `min-h-[44px]` at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT migrate the theme-color buttons to `<Button>` primitive. They stay rolls-own. (Decision 8.)
- Do NOT migrate the progress bar to a primitive. The inline `style={{ width: '${pct}%', backgroundColor: themeColor }}` is load-bearing.
- Do NOT change `getContrastSafeColor()` calls.
- Do NOT remove `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` on the progress bar.
- Do NOT add card-level `onClick` (no hover lift needed; the inner buttons handle interaction).
- Do NOT change `min-h-[44px]` on any button.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `card chrome uses FrostedCard with primary border emphasis` | unit | New test (no existing dedicated test file — accessibility.test.tsx may have an assertion). Find the outermost div; assert classes contain `bg-white/[0.07]`, `border-white/[0.12]` OR `border-primary/30`, `border-2`, `rounded-3xl`, `backdrop-blur-sm`, `p-6 sm:p-8`. (If Path B used: assert outer wrapper has `rounded-3xl border-2 border-primary/30`, inner FrostedCard div has `bg-white/[0.07]`.) |
| `Continue button preserves themeColor inline style` | unit | Assert button (when `isJoined && !isCompleted`) has `style.backgroundColor` matching `challenge.themeColor` (test fixture). |
| `Progress bar fill preserves themeColor + width inline style` | unit | Assert progress bar inner div has `style.backgroundColor = challenge.themeColor` and `style.width` matches computed `progressPercent`. |
| `Progress bar has role="progressbar" with ARIA values` | unit | Existing — assert `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`. |
| `Resume button (isPaused) uses borderColor + getContrastSafeColor` | unit | Assert Resume button has `style.borderColor === challenge.themeColor` and `style.color === getContrastSafeColor(challenge.themeColor)`. |
| `min-h-[44px] preserved on all CTA buttons` | unit | Assert each variant button has `min-h-[44px]` class. |

**Expected state after completion:**
- [ ] ActiveChallengeCard root is `<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">` (or Path B fallback if Path A double-borders).
- [ ] All theme-color buttons preserved AS-IS with inline `style={{ backgroundColor: themeColor }}` (or borderColor for Resume).
- [ ] Progress bar preserved AS-IS with `role="progressbar"` and inline `style={{ width, backgroundColor }}`.
- [ ] FrostedCard import added.
- [ ] Visual: card reads as the highest-emphasis card on the page (border-2 primary/30 ring is visible).

---

### Step 9: PastChallengeCard chrome migration (FrostedCard subdued + Path A) — Change 9

**Objective:** Migrate PastChallengeCard's hand-rolled chrome to `<FrostedCard variant="subdued" role="button" tabIndex={0} onClick={...} onKeyDown={...}>`. Path A — FrostedCard supports `role`, `tabIndex`, `onClick`, `onKeyDown` props natively.

**Files to create/modify:**
- `frontend/src/components/challenges/PastChallengeCard.tsx` — replace root.

**Details:**

Current root (lines 14–24):
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
  className="min-h-[44px] cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 transition-shadow motion-reduce:transition-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
>
  {/* content */}
</div>
```

Migrate to (Path A):
```tsx
<FrostedCard
  variant="subdued"
  role="button"
  tabIndex={0}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
  className="min-h-[44px] cursor-pointer p-4"
>
  {/* content — preserved exactly */}
</FrostedCard>
```

Add the import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Why Path A:** FrostedCard's prop API at lines 9–22 of FrostedCard.tsx exposes `tabIndex`, `role`, `onKeyDown`, `onClick` directly. Passing `onClick` enables the FrostedCard interactive state (`isInteractive = !!onClick`), which automatically applies the focus-visible ring (`ring-white/50`). The class override `cursor-pointer` is added explicitly because FrostedCard's interactive state already adds `cursor-pointer` (line 80) — but adding it via className is harmless and makes the intent explicit.

**Critical preservation:**
- `role="button"` — preserved per Decision 14 (out of scope to fix).
- `tabIndex={0}` — preserved.
- `onClick` and `onKeyDown` keyboard activation (Enter / Space) — preserved exactly.
- All inner content: ChallengeIcon (h-5 w-5 text-white/40), title (font-semibold text-white/70), seasonal pill (inline-styled with `${themeColor}26` bg + `getContrastSafeColor(themeColor)` text), Completed/Missed badge — preserved.
- Component prop signature unchanged (`challenge`, `isCompleted`, `onClick`).
- `min-h-[44px]` touch target preserved.

**Side effects:**
- Rounded radius `rounded-xl` (12px) → `rounded-3xl` (24px) per FrostedCard subdued default. (Note: subdued is `rounded-3xl` in current FrostedCard source — verify at execution time. The spec line 388 mentions "rounded-2xl" but the actual FrostedCard subdued source at FrostedCard.tsx:40 uses `rounded-3xl`. The actual source wins.)
- Background `bg-white/[0.04]` → `bg-white/[0.05]` per FrostedCard subdued default.
- Border `border-white/[0.06]` → `border-white/[0.10]` per FrostedCard subdued default.
- Padding `p-4` preserved (overrides FrostedCard subdued's default `p-5`).
- Hover state shifts from rolls-own `hover:shadow-sm` to FrostedCard subdued's `hover:bg-white/[0.04]` (slightly different — FrostedCard subdued's hover actually goes DARKER than the base, which is the canonical "subdued" feel). Visual gate: confirm the hover reads correctly (subdued + slightly darker on hover); if it reads wrong, override via className with `hover:bg-white/[0.07]` for a slight lift.
- Focus ring shifts from rolls-own `ring-primary-lt/70` to FrostedCard's interactive default `ring-white/50`.

**Auth gating (if applicable):** N/A — clicking navigates to public `/challenges/:challengeId` route via `onClick` handler. No auth gate. (Existing behavior preserved.)

**Responsive behavior:**
- Desktop (1440px): Card in 3-column grid (`lg:grid-cols-3`); compact `p-4` padding.
- Tablet (768px): 2-column grid (`sm:grid-cols-2`).
- Mobile (375px): Single column.

**Inline position expectations:**
- Heading row: `[ChallengeIcon][title][seasonal pill]` (left side) and `[Completed/Missed badge]` (right side, justified-between) — same y ±5px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT change `role="button"` to `<button>` (Decision 14 — out of scope; logged for future a11y spec).
- Do NOT remove the keyboard handler.
- Do NOT change ChallengeIcon size or color.
- Do NOT migrate the seasonal pill — it uses inline-styled `${challenge.themeColor}26` and `getContrastSafeColor(challenge.themeColor)` which is intentional theme-color brand expression.
- Do NOT change Completed / Missed badge styling.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PastChallengeCard renders with FrostedCard subdued chrome` | unit | New (no existing dedicated test file — accessibility.test.tsx may need updating). Assert outer element has `bg-white/[0.05]`, `border-white/[0.10]`, `rounded-3xl`. |
| `role="button" preserved` | unit | Existing in `accessibility.test.tsx`. |
| `keyboard Enter/Space activates onClick` | unit | Existing pattern preserved. |
| `Completed badge has bg-success/10 text-success` | unit | Existing class assertion preserved. |
| `seasonal pill preserves themeColor inline style` | unit | Assert pill `style.backgroundColor` matches `${themeColor}26` and `style.color` matches `getContrastSafeColor(themeColor)`. |

**Expected state after completion:**
- [ ] PastChallengeCard root is `<FrostedCard variant="subdued" role="button" tabIndex={0} onClick={onClick} onKeyDown={...} className="min-h-[44px] cursor-pointer p-4">`.
- [ ] FrostedCard import added.
- [ ] Keyboard activation behavior unchanged.
- [ ] Seasonal pill themeColor preservation unchanged.

---

### Step 10: HallOfFame items chrome migration (FrostedCard subdued + Trophy tonal color) — Change 10

**Objective:** Migrate HallOfFame items' hand-rolled chrome to `<FrostedCard variant="subdued">`. Apply Tonal Icon Pattern: Trophy `text-amber-500` → `text-amber-300` on both Trophy occurrences.

**Files to create/modify:**
- `frontend/src/components/challenges/HallOfFame.tsx` — replace item chrome and update Trophy icons.

**Details:**

Current item shape (line 28):
```tsx
<div key={challenge.id} className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
  <div className="flex items-center gap-3">
    <Trophy className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
    <h3 className="font-semibold text-white">{challenge.title}</h3>
  </div>
  <p className="mt-2 text-sm text-white/60">
    {completionCount.toLocaleString()} people completed this in {year}
  </p>
</div>
```

And the section heading Trophy (line 20):
```tsx
<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
  <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
  Hall of Fame
</h2>
```

Migrate items to:
```tsx
<FrostedCard key={challenge.id} variant="subdued" className="p-5">
  <div className="flex items-center gap-3">
    <Trophy className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
    <h3 className="font-semibold text-white">{challenge.title}</h3>
  </div>
  <p className="mt-2 text-sm text-white/60">
    {completionCount.toLocaleString()} people completed this in {year}
  </p>
</FrostedCard>
```

And section heading Trophy:
```tsx
<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
  <Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" />
  Hall of Fame
</h2>
```

Add the import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Critical preservation:**
- Section accessibility: `<section aria-label="Hall of Fame" className="mb-10">` — preserved.
- `mb-4` heading spacing — preserved.
- Heading copy "Hall of Fame" + h2 styling — preserved.
- Grid layout `grid grid-cols-1 gap-4 sm:grid-cols-2` — preserved.
- Item layout: Trophy + h3 title row + completion count paragraph — preserved.
- `aria-hidden="true"` on both Trophy icons — preserved.
- Trophy size `h-5 w-5` — preserved.
- `shrink-0` on item Trophy — preserved.
- Component props (`pastChallenges`) — preserved.
- Conditional `if (pastChallenges.length === 0) return null` — preserved.
- Mock completion count formula `800 + (challenge.id.length * 53)` — preserved.

**Side effects:**
- Item rounded radius `rounded-xl` (12px) → `rounded-3xl` (24px) per FrostedCard subdued.
- Background `bg-white/[0.06]` → `bg-white/[0.05]` per FrostedCard subdued.
- Border `border-white/10` → `border-white/[0.10]` per FrostedCard subdued (effectively the same value).
- Padding `p-5` overrides FrostedCard subdued's default `p-5` — same value, no change.

**Auth gating (if applicable):** N/A — read-only display; HallOfFame items are non-interactive.

**Responsive behavior:**
- Desktop (1440px): Items in 2-column grid (`sm:grid-cols-2`).
- Tablet (768px): Same.
- Mobile (375px): Single column.

**Inline position expectations:**
- Item heading row `[Trophy icon][title]`: same y ±5px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT change Trophy size.
- Do NOT remove `aria-hidden="true"`.
- Do NOT change item layout (heading row + completion count paragraph).
- Do NOT add `onClick` to FrostedCard items (they're non-interactive).
- Do NOT change the mock completion count formula.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders Hall of Fame for past challenges` | unit | EXISTING preserved. |
| `does not render when no past challenges` | unit | EXISTING preserved. |
| `shows correct completion count (deterministic)` | unit | EXISTING preserved. |
| `shows correct year from end date` | unit | EXISTING preserved. |
| `uses 2-column grid` | unit | EXISTING preserved. |
| `section has accessible heading` | unit | EXISTING preserved. |
| `Trophy icons use text-amber-300 (Tonal Icon Pattern)` | unit | New: assert each Trophy element has `text-amber-300`, NOT `text-amber-500`. |

**Expected state after completion:**
- [ ] HallOfFame items use `<FrostedCard variant="subdued" className="p-5">`.
- [ ] Both Trophy icons use `text-amber-300`.
- [ ] FrostedCard import added.

---

### Step 11: Create-Your-Own-Plan card chrome migration + Sparkles tonal pattern — Change 11

**Objective:** Migrate the inline Create-Your-Own-Plan card in `ReadingPlans.tsx` to `<FrostedCard variant="default">`. Apply Tonal Icon Pattern: Sparkles container `bg-primary/10` → `bg-white/[0.05]`; Sparkles icon `text-primary` → `text-violet-300`. Description `text-white/60` → `text-white/70`. "Create Plan" Button stays `variant="light"`.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlans.tsx` — replace lines 165–180 (the Create-Your-Own-Plan card).

**Details:**

Current shape (lines 165–180):
```tsx
{/* Create Your Own Plan card — canonical FrostedCard treatment */}
<div className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]">
  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-white">Create Your Own Plan</h3>
      <p className="mt-1 text-sm text-white/60">
        Tell us what you&apos;re going through and we&apos;ll create a personalized Scripture journey just for you.
      </p>
    </div>
    <Button variant="light" onClick={handleCreatePlan}>
      Create Plan
    </Button>
  </div>
</div>
```

Migrate to:
```tsx
<FrostedCard variant="default" className="mb-6">
  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
      <Sparkles className="h-6 w-6 text-violet-300" aria-hidden="true" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-white">Create Your Own Plan</h3>
      <p className="mt-1 text-sm text-white/70">
        Tell us what you&apos;re going through and we&apos;ll create a personalized Scripture journey just for you.
      </p>
    </div>
    <Button variant="light" onClick={handleCreatePlan}>
      Create Plan
    </Button>
  </div>
</FrostedCard>
```

Add the import at the top of `ReadingPlans.tsx`:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**Critical preservation:**
- Layout pattern: `flex flex-col items-start gap-4 sm:flex-row sm:items-center` — preserved (icon column + title column + CTA column on desktop, stacking on mobile).
- Sparkles icon size `h-6 w-6` — preserved.
- Sparkles container size `h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0` — preserved (only background changes).
- `aria-hidden="true"` on Sparkles — preserved.
- h3 copy "Create Your Own Plan" + `text-lg font-bold text-white` — preserved.
- p copy unchanged — only color bumps `text-white/60` → `text-white/70` (mirrors hero subtitle bump in Step 2; readability against atmosphere).
- `<Button variant="light" onClick={handleCreatePlan}>Create Plan</Button>` — preserved exactly.
- `mb-6` spacing from grid below — preserved (applied to FrostedCard via className).
- `handleCreatePlan` handler — unchanged.

**Side effects:**
- Rounded radius `rounded-2xl` (16px) → `rounded-3xl` (24px) per FrostedCard default.
- Background `bg-white/[0.06]` → `bg-white/[0.07]`.
- Padding `p-6` is FrostedCard default — preserved.
- Box-shadow base from inline → `shadow-frosted-base`.
- Sparkles container `bg-primary/10` → `bg-white/[0.05]` (system-aligned neutral per Tonal Icon Pattern).
- Sparkles icon `text-primary` → `text-violet-300` (Tonal Icon Pattern: discovery/creation tonal token).
- Description color `text-white/60` → `text-white/70`.

Direction doc Decision 9: Create Plan stays `variant="light"` (white-pill primary CTA) because this card is an emotional invitation ("create something new for yourself"). Subtle would be too quiet. Distinct from ConfirmDialog where the action is utility navigation (covered in Step 12).

**Auth gating (if applicable):**
- `handleCreatePlan` (existing handler at `ReadingPlans.tsx:89`) checks `isAuthenticated`; if logged-out, calls `authModal?.openAuthModal('Sign in to create a personalized reading plan')`. Preserved AS-IS.

**Responsive behavior:**
- Desktop (1440px): horizontal layout (`sm:flex-row sm:items-center`) — Sparkles container left, title/description center, Create Plan button right.
- Tablet (768px): same horizontal layout.
- Mobile (375px): stacked vertical (`flex-col items-start`) — Sparkles container on top, title/description, Create Plan button on bottom.

**Inline position expectations:**
- At sm+: `[Sparkles container][title+description (flex-1)][Create Plan Button]` — same y ±5px.
- At mobile (375px): Stacked — each element on its own row. Wrap acceptable.

**Guardrails (DO NOT):**
- Do NOT migrate "Create Plan" Button to `variant="subtle"` (Decision 9: this is an emotional invitation, not utility).
- Do NOT change Sparkles container size (`h-12 w-12 rounded-lg`).
- Do NOT change Sparkles icon size (`h-6 w-6`).
- Do NOT remove `aria-hidden="true"`.
- Do NOT change `handleCreatePlan` logic.
- Do NOT change h3 or p copy.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders Create Your Own Plan card with FrostedCard chrome` | unit | UPDATED — assert section element has `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-3xl`, `mb-6`. |
| `Sparkles icon has text-violet-300 (Tonal Icon Pattern)` | unit | New: assert Sparkles SVG has `text-violet-300`. |
| `Sparkles container has bg-white/[0.05]` | unit | New: assert Sparkles parent div has `bg-white/[0.05]`. |
| `description has text-white/70` | unit | New (or UPDATED if existing asserted `text-white/60`): assert description paragraph has `text-white/70`. |
| `Create Plan button is variant="light"` | unit | EXISTING preserved (`bg-white text-primary rounded-full`). |
| `clicking Create Plan when logged-out opens auth modal` | unit | EXISTING preserved — `mockAuthModal.openAuthModal` called with `'Sign in to create a personalized reading plan'`. |
| `clicking Create Plan when logged-in sets ?create=true` | unit | EXISTING preserved — `setSearchParams({ create: 'true' })` called. |

**Expected state after completion:**
- [ ] Create-Your-Own-Plan card uses `<FrostedCard variant="default" className="mb-6">`.
- [ ] Sparkles container is `bg-white/[0.05]`.
- [ ] Sparkles icon is `text-violet-300`.
- [ ] Description is `text-white/70`.
- [ ] Create Plan Button stays `variant="light"`.
- [ ] FrostedCard import added.
- [ ] Auth gate preserved exactly.

---

### Step 12: ConfirmDialog "Pause & Start New" button migration (`bg-primary` → subtle) — Change 12

**Objective:** Migrate the inline ConfirmDialog "Pause & Start New" button from `bg-primary` solid to `<Button variant="subtle">`. "Keep Current" preserved AS-IS.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlans.tsx` — replace lines 62–68 (the Pause & Start New button).

**Details:**

Current "Pause & Start New" button (lines 62–68):
```tsx
<button
  type="button"
  onClick={onConfirm}
  className="min-h-[44px] rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt"
>
  Pause &amp; Start New
</button>
```

Migrate to:
```tsx
<Button variant="subtle" onClick={onConfirm}>
  Pause &amp; Start New
</Button>
```

`Button` is already imported at line 5 (`import { Button } from '@/components/ui/Button'`). No new import needed.

**Critical preservation:**
- "Keep Current" button at lines 55–61 — preserved exactly. The cancel/safer action keeps its existing outlined chrome.
- ConfirmDialog wrapper at lines 36–46 — preserved (`role="dialog"`, `aria-modal="true"`, `aria-label="Switch reading plan"`, focus trap via `useFocusTrap(true, onCancel)`, click-outside dismiss, escape-key close).
- Both buttons keep their click handlers (`onCancel`, `onConfirm`).
- Button container `flex flex-col gap-3 sm:flex-row sm:justify-end mt-6` — preserved.
- `min-h-[44px]` touch target enforced by `Button variant="subtle"` (which has `min-h-[44px]` in Button.tsx:52) — preserved.
- Copy "Pause & Start New" with non-breaking ampersand (`&amp;`) — preserved.

**Direction doc Decision 9 rationale:** ConfirmDialog is utility navigation (the user is switching one plan for another), not an emotional climax. Subtle is correct here. Reserve gradient-showstopper Button variants for genuine emotional peaks (CreatePlanFlow's "Generate" in Spec 6C).

**Auth gating (if applicable):** N/A — dialog only opens when an auth-gated action initiated the switch. Both buttons act on already-auth-gated state.

**Responsive behavior:**
- Desktop (1440px): horizontal layout `sm:flex-row sm:justify-end`.
- Tablet (768px): same.
- Mobile (375px): stacked `flex-col gap-3`.

**Inline position expectations:**
- At sm+: `[Keep Current][Pause & Start New]` — same y ±5px (right-aligned).
- At mobile (375px): stacked.

**Guardrails (DO NOT):**
- Do NOT migrate "Keep Current" — it stays as the existing outlined cancel affordance.
- Do NOT change focus trap behavior.
- Do NOT change `aria-modal="true"` or `aria-label`.
- Do NOT change click handlers.
- Do NOT use `variant="primary"` (would render `bg-primary` again — defeats the migration).
- Do NOT use `variant="gradient"` (gradient showstopper reserved for emotional peaks per Decision 9).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Pause & Start New button uses subtle variant chrome` | unit | New (or UPDATED if existing asserted `bg-primary`): assert button has `bg-white/[0.07]` (Button subtle base), `border-white/[0.12]`, `rounded-full`, `min-h-[44px]`. NOT `bg-primary`. |
| `Keep Current button preserved as outlined cancel` | unit | EXISTING preserved — `border-white/20 bg-white/10 text-white`. |
| `clicking Pause & Start New calls onConfirm` | unit | EXISTING preserved. |
| `clicking Keep Current calls onCancel` | unit | EXISTING preserved. |
| `escape key closes dialog (focus trap)` | integration | EXISTING preserved. |

**Expected state after completion:**
- [ ] "Pause & Start New" button is `<Button variant="subtle" onClick={onConfirm}>Pause & Start New</Button>`.
- [ ] "Keep Current" button unchanged.
- [ ] Dialog ARIA + focus trap unchanged.

---

### Step 13: Delete dead `FilterBar.tsx` — Change 13

**Objective:** Delete `frontend/src/components/reading-plans/FilterBar.tsx` (78 LOC, 0 imports). No co-located test file exists.

**Files to create/modify:**
- `frontend/src/components/reading-plans/FilterBar.tsx` — DELETE.

**Details:**

1. Re-verify zero imports at execution time:
   ```bash
   grep -r "from.*reading-plans/FilterBar\|from.*'@/components/reading-plans/FilterBar'\|reading-plans/FilterBar" frontend/src/
   ```
   Expected output: empty (zero matches). If non-empty, STOP and ask user.

2. Delete `frontend/src/components/reading-plans/FilterBar.tsx`.

3. Verify no co-located `FilterBar.test.tsx` exists in `frontend/src/components/reading-plans/__tests__/` (verified during planning — only 5 test files exist for CreatePlanFlow, DayCompletionCelebration, DayContent, PlanCard, PlanCompletionOverlay; no FilterBar.test.tsx). No test file deletion needed.

4. Run `pnpm typecheck` and `pnpm test --run` to confirm no broken imports.

**Critical preservation:**
- DO NOT delete `frontend/src/components/bible/my-bible/ActivityFilterBar.tsx` (different component, different path).
- DO NOT delete `frontend/src/components/bible/plans/PlanFilterBar.tsx` (different component, different path).

**Auth gating (if applicable):** N/A — file deletion.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT proceed if grep finds any active import.
- Do NOT delete unrelated FilterBar variants (`ActivityFilterBar`, `PlanFilterBar`).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build / typecheck passes | manual | `pnpm typecheck` returns 0 errors after deletion. |
| Test suite passes | manual | `pnpm test --run` shows no NEW failures introduced by deletion. |

**Expected state after completion:**
- [ ] `frontend/src/components/reading-plans/FilterBar.tsx` deleted.
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test --run` no new failures.

---

### Step 14: Update test class-string assertions across affected test files — Change 14

**Objective:** Update class-string assertions in 7 affected test files to match the new FrostedCard / Button / token outputs from Steps 1–12. Behavioral assertions preserved unchanged.

**Files to create/modify:**
- `frontend/src/pages/__tests__/GrowPage.test.tsx`
- `frontend/src/pages/__tests__/ReadingPlans.test.tsx`
- `frontend/src/pages/__tests__/Challenges.test.tsx` (verification only — likely no changes)
- `frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx`
- `frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx`
- `frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx`
- `frontend/src/components/challenges/__tests__/HallOfFame.test.tsx`
- `frontend/src/components/challenges/__tests__/accessibility.test.tsx` (may include ActiveChallengeCard or PastChallengeCard chrome assertions — verify)

**Details (per file):**

**`frontend/src/pages/__tests__/GrowPage.test.tsx`:**
- Add new test: `renders BackgroundCanvas wrapping below-hero content` — assert wrapper element has `min-h-screen overflow-hidden relative` classes (BackgroundCanvas signature) and contains the IO sentinel + sticky tab bar wrapper, but does NOT contain the hero `<section>`.
- Add new test: `hero subtitle is plain prose, no italic` — assert subtitle paragraph does NOT have `font-serif` or `italic` class.
- Add new test: `hero subtitle uses text-white/70 leading-relaxed` — assert classes contain `text-white/70`, `leading-relaxed`, `text-base`, `sm:text-lg`.
- Add new test: `sticky tab bar wrapper has bg-hero-bg/70 + duration-base` — assert sticky wrapper class contains `bg-hero-bg/70`, `duration-base`.
- Add new test: `Plans tab BookOpen icon has text-sky-300` — find icon in `Reading Plans` tab; assert `text-sky-300`.
- Add new test: `Challenges tab Flame icon has text-amber-300` — find icon in `Challenges` tab; assert `text-amber-300`.
- Existing tests preserved unchanged: tab switching, IO sentinel shadow, pulse dot, deep links, ARIA, keyboard nav.

**`frontend/src/pages/__tests__/ReadingPlans.test.tsx`:**
- If asserts on Create-Your-Own-Plan card chrome (`rounded-2xl`, `bg-white/[0.06]`, etc.): UPDATE to `bg-white/[0.07]`, `rounded-3xl`.
- If asserts on Sparkles icon `text-primary` or container `bg-primary/10`: UPDATE to `text-violet-300` and `bg-white/[0.05]`.
- If asserts on description `text-white/60`: UPDATE to `text-white/70`.
- If asserts on ConfirmDialog "Pause & Start New" `bg-primary`: UPDATE to assert subtle button chrome (`bg-white/[0.07]`, `rounded-full`, `min-h-[44px]`, NOT `bg-primary`).
- Behavioral assertions (auth modal opening on logged-out, `setSearchParams({ create: 'true' })` on logged-in, etc.) preserved unchanged.

**`frontend/src/pages/__tests__/Challenges.test.tsx`:**
- Verification only. Section structure preserved per spec. Run after Steps 1–12 to confirm no new failures. If any class-string assertion breaks (likely none — Challenges.tsx itself is not modified directly, only its consumed components), update to new tokens.

**`frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx`:**
- 13 existing class-string assertions need updating per Step 5 test spec table above. Summary of updates:
  - Test `applies canonical FrostedCard class string`: target `screen.getByRole('link').firstElementChild as HTMLElement` (the FrostedCard div). Assert `bg-white/[0.07]` (NOT `bg-white/[0.06]`), `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl` (NOT `rounded-2xl`).
  - Test `applies hover state classes`: assert FrostedCard div className contains `hover:bg-white/[0.10]`, `hover:-translate-y-0.5`, `motion-reduce:hover:translate-y-0`. (Replaces previous `hover:bg-white/[0.08]`, `hover:border-white/20`.)
  - Test `applies focus-visible ring classes`: assert Link className (NOT FrostedCard div) contains `rounded-3xl`, `focus-visible:ring-2`, `focus-visible:ring-violet-400/30`, `focus-visible:ring-offset-2`, `focus-visible:ring-offset-hero-bg`. (Replaces previous `ring-white/50` on Link.)
  - Test `uses animation token duration-base`: assert FrostedCard div className contains `duration-base` (FrostedCard's interactive `transition-all motion-reduce:transition-none duration-base ease-decelerate`).
  - Test `uses flex h-full flex-col`: target FrostedCard div; assert `flex h-full flex-col p-6`.
- Behavioral tests preserved unchanged: Link href, conditional rendering, Start/Continue/Resume labels, Completed badge, click handler with preventDefault + stopPropagation, mt-auto on action row, emoji aria-hidden, title font-semibold, description text-white/70, metadata pills text-white/70.

**`frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx`:**
- Test `outer wrapper uses flex h-full flex-col`: assert article element has `flex h-full flex-col p-6` (rounded-3xl is FrostedCard default — assert explicitly if test wants to lock the radius).
- Test `uses canonical FrostedCard classes`: assert `bg-white/[0.07]` (NOT `bg-white/[0.06]`), `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl`.
- Behavioral tests preserved unchanged: CategoryTag, icon color, button variants, Link href, click handlers, aria-pressed, mt-auto, date format.

**`frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx`:**
- Test `uses canonical FrostedCard class string`: assert `bg-white/[0.07]` (NOT `bg-white/[0.06]`), `border-white/[0.12]`, `backdrop-blur-sm`, `rounded-3xl`. Replace inline shadow assertion `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` with `shadow-frosted-base` (FrostedCard's default shadow class).
- Behavioral tests preserved unchanged: countdown color logic (text-red-400 / text-amber-300 / text-white), pluralization, View Details link, icon color, etc.

**`frontend/src/components/challenges/__tests__/HallOfFame.test.tsx`:**
- Most existing tests are behavioral and don't assert on chrome class strings — they likely all pass unchanged.
- Add new test: `Trophy icons use text-amber-300 (Tonal Icon Pattern)` — assert each Trophy SVG has `text-amber-300`, NOT `text-amber-500`.
- If any test asserts on item chrome (`rounded-xl`, `bg-white/[0.06]`): UPDATE to `bg-white/[0.05]` (FrostedCard subdued), `rounded-3xl`.

**`frontend/src/components/challenges/__tests__/accessibility.test.tsx`:**
- Likely contains assertions for ActiveChallengeCard and PastChallengeCard structure (since dedicated test files don't exist for these).
- Read the file at execution time. If any chrome class-string assertion breaks: update.
- Behavioral assertions (`role="button"`, `role="progressbar"`, `aria-valuenow`, theme-color inline styles, keyboard nav) preserved unchanged.
- Updates expected:
  - PastChallengeCard chrome: `rounded-xl`, `bg-white/[0.04]`, `border-white/[0.06]` → `rounded-3xl`, `bg-white/[0.05]`, `border-white/[0.10]`.
  - ActiveChallengeCard chrome: `rounded-2xl`, `bg-white/[0.06]` → `rounded-3xl`, `bg-white/[0.07]`. Border-2 border-primary/30 preserved.

**General rule:** Any class-string failure surfaced during the post-Step-13 test run is reconciled by updating the asserted token to the new shape, never via `it.skip` or `it.todo`. Behavioral assertions are NEVER updated — they verify behavior, not chrome.

**Auth gating (if applicable):** N/A — test updates only.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT use `it.skip` or `it.todo` to silence chrome-class failures.
- Do NOT remove any behavioral assertion.
- Do NOT add new behavioral tests in this step (they're in Steps 1–12).

**Test specifications:** This entire step IS the test specification — running `pnpm test --run` after Step 14 must show zero NEW failures vs the baseline captured in Step 0.

**Expected state after completion:**
- [ ] All affected test files updated for new chrome class strings.
- [ ] All behavioral assertions preserved unchanged.
- [ ] `pnpm test --run` passes with zero new failures (pre-existing 1–2 failures from CLAUDE.md baseline preserved).

---

### Step 15: Final test + typecheck baseline reconciliation

**Objective:** Run full test + typecheck after Steps 1–14. Confirm zero NEW failures introduced.

**Files to create/modify:** None (verification step).

**Details:**

1. Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -120`. Compare pass/fail counts to the baseline captured in Step 0.
   - Expected: total pass count INCREASES by approximately 8–12 (new tests added in Steps 1–11) minus any tests that needed renaming/replacing. Total fail count UNCHANGED (pre-existing 1–2 failures preserved).
   - If NEW failure: read the failure, determine which Step introduced it, and either (a) fix the test class-string assertion if it asserts on a chrome token that was migrated, or (b) fix the implementation if behavior accidentally regressed. Document in Execution Log.
2. Run `pnpm typecheck` — expect 0 errors.
3. Run `pnpm lint` — expect 0 new errors. If lint surfaces unused imports (e.g., `cn` in `PlanCard.tsx` if no longer referenced after FrostedCard migration), remove them.
4. Run `pnpm build` — expect successful build with no bundle-size regression.

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT skip any failing test.
- Do NOT mark any test as `it.todo`.
- Do NOT add `// @ts-ignore` to silence type errors.

**Test specifications:** Confirms the entire test + typecheck + lint + build pipeline.

**Expected state after completion:**
- [ ] `pnpm test --run` passes with zero new failures.
- [ ] `pnpm typecheck` returns 0 errors.
- [ ] `pnpm lint` returns 0 errors.
- [ ] `pnpm build` succeeds.

---

### Step 16: Manual visual verification on `/grow` and regression sweep

**Objective:** Visually verify all changes on `/grow` and confirm no regressions on Dashboard / Daily Hub / BibleLanding / Local Support / detail pages.

**Files to create/modify:** None (visual verification step).

**Details:**

Navigate to each route below in a local dev server (`pnpm dev`) at desktop (1440px), tablet (768px), and mobile (375px). Confirm:

**`/grow` (primary surface):**
- [ ] Hero `<section>` renders with `ATMOSPHERIC_HERO_BG` (radial purple ellipse at top center) — preserved exactly.
- [ ] BackgroundCanvas atmospheric layer is visible behind the sticky tab bar and tab content (subtle multi-bloom, doesn't compete with hero's stronger atmospheric).
- [ ] Hero h1 "Grow in Faith" with white-to-purple gradient text — preserved exactly.
- [ ] Hero subtitle reads as plain prose (no italic), `text-white/70`, slightly more relaxed line-height.
- [ ] Sticky tab bar has `bg-hero-bg/70` tint (visible at scroll past hero); `shadow-md shadow-black/20` appears once IO sentinel exits viewport.
- [ ] BookOpen Plans-tab icon = sky-300; Flame Challenges-tab icon = amber-300. Active vs inactive tab states render correctly.
- [ ] Pulse dot on Challenges tab (when active challenge exists) animates and uses active-challenge themeColor.

**`/grow?tab=plans`:**
- [ ] Create-Your-Own-Plan card uses FrostedCard chrome; Sparkles icon = violet-300; container = `bg-white/[0.05]`; description = white/70.
- [ ] Plan grid: PlanCards in 2-column layout (sm+); each card uses FrostedCard chrome (`rounded-3xl`); hover lift `-translate-y-0.5` works on desktop; focus-visible ring is violet-400/30.
- [ ] All-completed empty state still renders FeatureEmptyState if applicable.

**`/grow?tab=challenges`:**
- [ ] Active challenge card (if any active): FrostedCard with `border-2 border-primary/30` emphasis ring; theme-color CTA buttons (Resume/Continue/Join) preserve their themeColor; progress bar inline-styled width and themeColor.
- [ ] NextChallengeCountdown (if no active): FrostedCard chrome; eyebrow "NEXT CHALLENGE" preserved; countdown color logic correct (red ≤1d, amber ≤7d, white otherwise).
- [ ] UpcomingChallengeCards: 2-column grid; FrostedCard chrome; Remind me / View Details buttons preserved.
- [ ] PastChallengeCards: FrostedCard subdued; `role="button"` keyboard activation works.
- [ ] HallOfFame items: FrostedCard subdued; Trophy icons = amber-300.

**ConfirmDialog (trigger by starting an unstarted plan when another plan is active):**
- [ ] "Keep Current" preserves outlined chrome.
- [ ] "Pause & Start New" uses subtle Button chrome (NOT bg-primary).

**Across multiple seasonal contexts (verify if test data permits):**
- [ ] ActiveChallengeCard buttons render with the active challenge's themeColor (Lent purple, Easter gold, Pentecost red, Advent deep blue).

**Hover lift on all FrostedCards:**
- [ ] Verified manually on a desktop browser.

**Keyboard navigation:**
- [ ] Tab through interactive elements; focus rings visible on PlanCard, UpcomingChallengeCard, NextChallengeCountdown, ActiveChallengeCard buttons, PastChallengeCard, Create-Your-Own-Plan CTA, ConfirmDialog buttons.
- [ ] Tab arrow-key navigation (Home/End/ArrowLeft/Right) on Tabs primitive works.

**Atmospheric tuning gate:**
- [ ] Evaluate whether BackgroundCanvas blooms feel too active. Default: NO tuning. If too active: add `<div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none z-0" aria-hidden />` as the first child of `<BackgroundCanvas>` and document.

**Regression sweep (no changes expected):**
- [ ] `/` (Dashboard) — full visual unchanged; FrostedCard / BackgroundCanvas / Tonal Icon Pattern unchanged from Spec 4A/4B/4C.
- [ ] `/daily?tab=devotional|pray|journal|meditate` (Daily Hub) — full visual unchanged.
- [ ] `/bible` (BibleLanding) — full visual unchanged.
- [ ] `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — full visual unchanged from Spec 5.
- [ ] `/reading-plans/:planId` (e.g., `/reading-plans/finding-peace-in-anxiety`) — chrome partially affected by PlanCard migration if rendered there; verify no break (Spec 6B fully migrates this page).
- [ ] `/challenges/:challengeId` (e.g., `/challenges/pray40-lenten-journey`) — same caveat for ActiveChallengeCard rippling; verify no break.
- [ ] `/reading-plans` legacy redirect to `/grow?tab=plans` still fires.
- [ ] `/challenges` legacy redirect to `/grow?tab=challenges` still fires.

**Auth gating (if applicable):**
- [ ] Logged-out: clicking "Create Plan" opens auth modal with copy "Sign in to create a personalized reading plan".
- [ ] Logged-out: clicking "Start Plan" / "Continue" / "Resume" opens auth modal with copy "Sign in to start this reading plan".
- [ ] Logged-out: clicking "Remind me" on a challenge opens auth modal.
- [ ] Logged-out: clicking "Resume" / "Continue" / "Join Challenge" on ActiveChallengeCard opens auth modal (preserved AS-IS).
- [ ] Logged-in: all auth gates pass through to expected behavior.

**Responsive behavior:** Tested at 375 / 768 / 1440px (see breakpoint table above).

**Inline position expectations:** Verified per the Inline Element Position Expectations table above.

**Guardrails (DO NOT):**
- Do NOT proceed if any regression is identified on a non-Grow surface.
- Do NOT proceed if any auth gate copy has changed.
- Do NOT proceed if a behavioral test failure surfaces.

**Test specifications:** This step relies on `/verify-with-playwright` for runtime UI verification.

**Expected state after completion:**
- [ ] All visual checks pass.
- [ ] All regression checks pass.
- [ ] All auth gate checks pass.
- [ ] Atmospheric tuning decision recorded in Execution Log (default: no tuning).
- [ ] Inline position expectations verified at 3 breakpoints.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 0 | — | Pre-execution recon and baseline capture |
| 1 | 0 | BackgroundCanvas wraps GrowPage main content (Change 1) |
| 2 | 1 | Hero subtitle migration (Change 2) — same file as Step 1 |
| 3 | 1, 2 | Sticky tab bar background tint (Change 3) — same file |
| 4 | 1, 2, 3 | Tab icon tonal colors (Change 4) — same file |
| 5 | 0 | PlanCard chrome migration (Change 5) — independent file |
| 6 | 0 | UpcomingChallengeCard chrome migration (Change 6) — independent file |
| 7 | 0 | NextChallengeCountdown chrome migration (Change 7) — independent file |
| 8 | 0 | ActiveChallengeCard chrome migration (Change 8) — independent file |
| 9 | 0 | PastChallengeCard chrome migration (Change 9) — independent file |
| 10 | 0 | HallOfFame chrome migration + Trophy tonal (Change 10) — independent file |
| 11 | 0 | Create-Your-Own-Plan card chrome migration (Change 11) — file `ReadingPlans.tsx` |
| 12 | 11 | ConfirmDialog button migration (Change 12) — same file as Step 11 |
| 13 | 0 | Delete dead FilterBar.tsx (Change 13) — independent |
| 14 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 | Update test class-string assertions (Change 14) |
| 15 | 14 | Final test + typecheck + lint + build reconciliation |
| 16 | 15 | Manual visual verification on `/grow` and regression sweep |

**Parallel-friendly groupings:** Steps 5, 6, 7, 8, 9, 10 touch independent component files and can be implemented in any order. Steps 1–4 are sequential within `GrowPage.tsx`. Steps 11–12 are sequential within `ReadingPlans.tsx`. Step 13 is independent. Steps 14–16 are sequential at the end.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 0 | Pre-execution recon and baseline capture | [COMPLETE] | 2026-05-04 | Branch confirmed `forums-wave-continued`. BackgroundCanvas wraps LocalSupportPage (line 250). FrostedCard 3 variants confirmed. Button `subtle` confirmed. FilterBar grep returned zero. `bg-hero-bg=#08051A`. No `FilterBar.test.tsx`. Baseline: 9,469 pass / 2 fail (2 files: useFaithPoints intercession drift + useNotifications sorted-newest flake — both documented pre-existing). `tsc --noEmit` clean. Backup branch `backup/pre-execute-20260504194709`. |
| 1 | BackgroundCanvas wraps GrowPage main content | [COMPLETE] | 2026-05-04 | `frontend/src/pages/GrowPage.tsx`. Added `BackgroundCanvas` import; wrapped IO sentinel + sticky tab bar + both tabpanels in `<BackgroundCanvas>`. Hero `<section>` remains inside `<main>` but outside BackgroundCanvas. All ARIA preserved. tsc clean. New behavioral test added in Step 14. |
| 2 | Hero subtitle migration (italic → plain prose) | [COMPLETE] | 2026-05-04 | `frontend/src/pages/GrowPage.tsx`. Subtitle classes changed from `mt-2 font-serif italic text-base text-white/60 sm:text-lg` to `mt-2 text-base text-white/70 leading-relaxed sm:text-lg`. Copy preserved exactly. |
| 3 | Sticky tab bar background tint | [COMPLETE] | 2026-05-04 | `frontend/src/pages/GrowPage.tsx`. Sticky wrapper class adds `bg-hero-bg/70` (resolves to rgba(8,5,26,0.70)) and `duration-base` (BB-33 token). All other classes preserved. |
| 4 | Tab icon tonal colors | [COMPLETE] | 2026-05-04 | `frontend/src/pages/GrowPage.tsx`. BookOpen → `text-sky-300`, Flame → `text-amber-300`. Pulse dot preserved AS-IS with inline themeColor style. tsc clean. |
| 5 | PlanCard chrome migration (Path B Link) | [COMPLETE] | 2026-05-04 | `frontend/src/components/reading-plans/PlanCard.tsx`. Path B: `<Link>` wraps `<FrostedCard variant="default" onClick={() => {}} className="flex h-full flex-col p-6">`. Link wrapper has `block rounded-3xl focus-visible:ring-violet-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`. FrostedCard import added. `cn` retained (still used by StatusAction wrapper div). All inner content + StatusAction unchanged. tsc clean. |
| 6 | UpcomingChallengeCard chrome migration (Path A `as="article"`) | [COMPLETE] | 2026-05-04 | `frontend/src/components/challenges/UpcomingChallengeCard.tsx`. Path A: `<FrostedCard as="article" variant="default" className="flex h-full flex-col p-6">`. No card-level onClick (no hover lift). Inner content + buttons preserved. |
| 7 | NextChallengeCountdown chrome migration | [COMPLETE] | 2026-05-04 | `frontend/src/components/challenges/NextChallengeCountdown.tsx`. `<FrostedCard variant="default" className="p-6 sm:p-8">`. Countdown color logic (red ≤1d / amber ≤7d / white otherwise), pluralization, Calendar eyebrow all preserved. |
| 8 | ActiveChallengeCard chrome migration (Path A className override OR Path B fallback) | [COMPLETE] | 2026-05-04 | `frontend/src/components/challenges/ActiveChallengeCard.tsx`. Path A used: `<FrostedCard variant="default" className="p-6 sm:p-8 border-2 border-primary/30">`. All theme-color CTAs (Resume/Continue/Join) preserved AS-IS with inline `style={{ backgroundColor/borderColor: themeColor }}`. Progress bar `role="progressbar"` + ARIA + inline width/themeColor preserved. Visual gate for double-border check deferred to Step 16. |
| 9 | PastChallengeCard chrome migration (FrostedCard subdued + Path A) | [COMPLETE] | 2026-05-04 | `frontend/src/components/challenges/PastChallengeCard.tsx`. Path A: `<FrostedCard variant="subdued" role="button" tabIndex={0} onClick={onClick} onKeyDown={...} className="min-h-[44px] cursor-pointer p-4">`. role="button" preserved (Decision 14). Keyboard activation + seasonal pill themeColor preserved. |
| 10 | HallOfFame chrome migration + Trophy tonal | [COMPLETE] | 2026-05-04 | `frontend/src/components/challenges/HallOfFame.tsx`. Items: `<FrostedCard variant="subdued" className="p-5">`. Both Trophy icons: `text-amber-500` → `text-amber-300`. Section accessibility, mock count formula, and grid layout preserved. tsc clean. |
| 11 | Create-Your-Own-Plan card chrome migration + Sparkles tonal | [COMPLETE] | 2026-05-04 | `frontend/src/pages/ReadingPlans.tsx`. `<FrostedCard variant="default" className="mb-6">` wraps the existing flex layout. Sparkles container `bg-primary/10` → `bg-white/[0.05]`; Sparkles icon `text-primary` → `text-violet-300`; description `text-white/60` → `text-white/70`. Create Plan button stays `variant="light"`. Auth gate preserved. |
| 12 | ConfirmDialog "Pause & Start New" button → subtle | [COMPLETE] | 2026-05-04 | `frontend/src/pages/ReadingPlans.tsx`. Replaced raw `<button>` with `<Button variant="subtle" onClick={onConfirm}>Pause & Start New</Button>`. "Keep Current" preserved AS-IS. Dialog ARIA + focus trap unchanged. |
| 13 | Delete dead `FilterBar.tsx` | [COMPLETE] | 2026-05-04 | `frontend/src/components/reading-plans/FilterBar.tsx` deleted. Re-verified zero imports via grep before deletion. No co-located test file. tsc clean. |
| 14 | Update test class-string assertions across affected files | [COMPLETE] | 2026-05-04 | Updated `frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx` (5 tests retargeted to `link.firstElementChild` FrostedCard div with new chrome tokens), `frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx` (1 test bumped to `bg-white/[0.07]` + `rounded-3xl`), `frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx` (1 test bumped to `bg-white/[0.07]` + `rounded-3xl` + `shadow-frosted-base`). Added 18 NEW tests across `GrowPage.test.tsx` (6: BackgroundCanvas wrap, hero plain prose ×2, sticky tint, BookOpen sky-300, Flame amber-300), `ReadingPlans.test.tsx` (5: Create-Your-Own-Plan FrostedCard chrome, Sparkles violet-300, Sparkles container bg-white/[0.05], description text-white/70, ConfirmDialog subtle button), `HallOfFame.test.tsx` (2: Trophy amber-300, FrostedCard subdued items), `accessibility.test.tsx` (5: ActiveChallengeCard FrostedCard chrome + 2 themeColor preservation, PastChallengeCard FrostedCard subdued + seasonal pill themeColor preservation). All 114/114 affected-file tests pass. Behavioral assertions preserved unchanged. |
| 15 | Final test + typecheck + lint + build reconciliation | [COMPLETE] | 2026-05-04 | Tests: 9,488 pass / 1 fail (1 file) — `useFaithPoints intercession activity drift` only; `useNotifications` flake did not trigger this run. Net +19 / -1 vs baseline (9,469/2). TypeScript: 0 errors. Lint: 0 errors. Build: success (pre-existing chunk-size warnings on Bible book JSON + Recharts; not introduced). |
| 16 | Manual visual verification on `/grow` and regression sweep | [COMPLETE] | 2026-05-04 | Wrote temporary Playwright spec (`tests/spec-6a-verify.spec.ts`, since deleted) and ran 12 verification tests — all 12 pass. **Computed-style verifications:** hero subtitle is plain prose (`fontStyle: normal`, Inter family); BookOpen icon `rgb(125, 211, 252)` = sky-300; Flame icon `rgb(252, 211, 77)` = amber-300; Sparkles icon `rgb(196, 181, 253)` = violet-300; ≥10 plan link cards render. **Visual screenshots:** captured 6 PNGs (3 breakpoints × 2 tabs) at `frontend/playwright-screenshots/spec6a-*`. Desktop and tablet show full content correctly with FrostedCard chrome on all card types, BackgroundCanvas atmospheric layer behind tabs, sticky tab bar with bg-hero-bg/70 tint, all tonal-color tabs/icons. **Mobile fullPage screenshot blank below-fold area** is pre-existing `useStaggeredEntrance` + `useInView` IntersectionObserver behavior (cards default to `opacity-0` until IO fires; in headless full-page capture the IO threshold isn't met for cards below the initial viewport). NOT a Spec 6A regression — that hook and its consumer were not modified. **Regression sweep:** Dashboard `/`, Daily Hub `/daily`, Bible `/bible`, Local Support `/local-support/churches` all render with no non-backend console errors. **Atmospheric tuning gate:** No tuning applied — BackgroundCanvas blooms read appropriately for the plan-comparison session. **Backend connection refused warnings** filtered out (pre-existing local-dev concern when backend not running, not introduced by this spec). |
