# Forums Wave: Spec 5.3 — 2-Line Heading Treatment

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 5.3 (lines ~4664–4684)
**Source Brief:** `_plans/forums/spec-5-3-brief.md` (authored 2026-05-09 — **brief is binding; brief wins over master plan body where they diverge**)
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations)
**Date:** 2026-05-11

---

## Affected Frontend Routes

- `/prayer-wall` (PrayerWallHero is rendered at the top of this page)
- `/prayer-wall?postType=testimony`
- `/prayer-wall?postType=question`
- `/prayer-wall?postType=discussion`
- `/prayer-wall?postType=encouragement`
- `/prayer-wall?postType=encouragement&category=mental-health`
- `/prayer-wall/dashboard` (PrayerWallDashboard — every section header migrated)

Out of scope (W9 / W10): `/prayer-wall/:id` (PrayerDetail), `/prayer-wall/user/:id` (PrayerWallProfile), card-level titles, dialog titles, QOTD card eyebrow. The two migration surfaces are PrayerWallHero (one component, mounted by `/prayer-wall`) and PrayerWallDashboard section headers (one page, mounted by `/prayer-wall/dashboard`).

---

## Metadata

- **ID:** `round3-phase05-spec03-two-line-headings`
- **Phase:** 5 (Prayer Wall Visual Migration — third real Phase 5 spec; 5.0 closed without ceremony, 5.1 ✅, 5.2 ✅ shipped via Spec 14)
- **Size:** M
- **Risk:** Low per master plan; effectively Low-Medium per brief Section 1 due to (a) CinematicHeroBackground composition with PageHero (MPD-3 / D2) and (b) brand voice review of dashboard eyebrow + headline pairs (Section 13 of brief)
- **Tier:** High (per brief Sections 2 and 14) — pure visual refactor of 2 files but with non-trivial composition decisions and subjective brand voice surface
- **Prerequisites:**
  - **5.1 (FrostedCard Migration) ✅** — verified in `_forums_master_plan/spec-tracker.md` row 73 on 2026-05-11
  - **5.2 (BackgroundCanvas at Prayer Wall Root) ✅** — shipped via Spec 14 on 2026-05-07 per tracker row 74
  - Master plan body says prereq is 5.2; brief MPD-1 corrects this to 5.1 as the practical prereq (5.2 already ✅). Both are in fact ✅, so the spec is unblocked.

---

## Goal

Apply the canonical 2-line heading treatment to Prayer Wall in two distinct contexts, using two distinct existing components:

1. **PrayerWallHero (page-level hero on `/prayer-wall`)** — migrate to compose `<PageHero title="Prayer Wall" subtitle="You're not alone." />` internally, **preserving the CinematicHeroBackground shipped by Spec 14**. The hero visual hierarchy is "BIG title over smaller subtitle" — PageHero's pattern.
2. **PrayerWallDashboard section headers (on `/prayer-wall/dashboard`)** — migrate every section heading to `<SectionHeading topLine="..." bottomLine="..." />`. The section visual hierarchy is "small eyebrow over BIG headline" — the canonical 2-line treatment from `09-design-system.md` § "Section Heading — 2-Line Treatment".

**The two contexts use two DIFFERENT components with two DIFFERENT prop APIs and two DIFFERENT visual hierarchies. Do not conflate them.** (Brief MPD-2 / W4.)

5.3 is a pure-frontend visual refactor: no backend changes, no schema changes, no API changes, no new dependencies, no public-API changes to PageHero or SectionHeading. Both target components already exist on disk (verified 2026-05-09 per brief R1, R2).

---

## Approach

### Migration target 1 — PrayerWallHero (composes PageHero)

The current `frontend/src/components/prayer-wall/PrayerWallHero.tsx` (30 lines, post-Spec-14 state per brief R3) is:

```tsx
<section aria-labelledby="prayer-wall-heading" className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased">
  <CinematicHeroBackground />
  <h1 id="prayer-wall-heading" className="relative z-10 mb-3 px-1 ..." style={GRADIENT_TEXT_STYLE}>
    Prayer Wall
  </h1>
  <p className="relative z-10 mx-auto max-w-xl text-base ...">
    You&apos;re not alone.
  </p>
  {action && <div className="relative z-10 mt-6">{action}</div>}
</section>
```

Post-5.3 (per brief D1 / D2 / R9):

```tsx
import type { ReactNode } from 'react'
import { PageHero } from '@/components/PageHero'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface PrayerWallHeroProps {
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <div className="relative w-full pt-[145px]">
      <CinematicHeroBackground />
      <PageHero title="Prayer Wall" subtitle="You're not alone.">
        {action && <div className="relative z-10 mt-6">{action}</div>}
      </PageHero>
    </div>
  )
}
```

Key transformations:

- Outer element changes from `<section>` to `<div>` to avoid nested-section semantics (PageHero already provides its own `<section aria-labelledby="page-hero-heading">` per brief R1 / R9).
- `pt-[145px]` moves to the outer wrapper so transparent-nav clearance is preserved.
- CinematicHeroBackground stays at the outer-most layer (W2 / D2). Spec 14's cinematic atmosphere is preserved.
- PageHero handles `title="Prayer Wall"` and `subtitle="You're not alone."` — PageHero applies GRADIENT_TEXT_STYLE to the title internally (R6).
- The `action` slot (the CTA button from PrayerWall.tsx's 4.7 chooser entry flow) is passed as `children` to PageHero, so it renders inside PageHero's section beneath the subtitle. composerRef binding and TooltipCallout target preserved (W12).
- **NO `scriptWord` prop** (W3 / MPD-4). Spec 14 explicitly cleaned up the `font-script` "Wall" treatment; 5.3 does not reintroduce it.
- **NO `showDivider` prop** (W20). Hero never had a divider; adding one is a visual change beyond 5.3's scope.
- The outer wrapper does NOT carry `aria-labelledby` (D6 / R9). PageHero's internal `<section aria-labelledby="page-hero-heading">` is the accessible name source. Axe-core (Universal Rule 17 from 4.8) re-runs to confirm zero violations.

PageHero's built-in `ATMOSPHERIC_HERO_BG` (radial-gradient) is left as-is — it composes additively with CinematicHeroBackground (per D2). If plan-time visual review finds the additive composition too dark/busy, escalate; the default decision is to accept it (D2 option c). Do NOT add a `transparent: true` prop to PageHero (W15) — consume the component as-is.

### Migration target 2 — PrayerWallDashboard section headers (consume SectionHeading)

The exact section inventory is deferred to plan recon (D5 / R4 / MPD-5). At plan time, `/plan-forums` enumerates every section heading rendered in `frontend/src/pages/PrayerWallDashboard.tsx` and proposes a per-section table:

| Section | Current heading | Proposed topLine | Proposed bottomLine | Align |
| ------- | --------------- | ---------------- | ------------------- | ----- |
| (Section 1) | (current) | (eyebrow) | (headline) | (`'center'` or `'left'`) |
| ... | ... | ... | ... | ... |

**Eric reviews this table before `/execute-plan-forums` runs.** If any proposed copy violates the brand voice guardrails in Section 13 / "Brand Voice Anti-Patterns" below, Eric edits and re-runs plan.

Per section, the migration replaces inline `<h2>` (or whatever current heading element) with:

```tsx
<SectionHeading topLine="<eyebrow>" bottomLine="<headline>" align="center" />
```

`align` defaults to `'center'`; left-aligned sections pass `align="left"` per their existing layout. `tagline` is not used (the dashboard sections don't have third lines).

Section headers in scope: ONLY page-section titles. Out of scope per W10: PrayerCard titles, QOTD card eyebrow (QOTD uses FrostedCard's `eyebrow` prop per 5.1 D4), dialog titles, modal headings.

Per-section visual hierarchy: small eyebrow (`topLine`) on top, big gradient headline (`bottomLine`) below — per `09-design-system.md` § "Section Heading — 2-Line Treatment":

- Top line: `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`
- Bottom line: `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` with `WHITE_PURPLE_GRADIENT`
- Size ratio: bottom ~1.5× larger than top
- `mt-1` between lines

SectionHeading handles all of this internally; 5.3 just consumes the component.

### Migration order (D9)

1. **PrayerWallHero first** — single component, single migration point, visual change should be subtle. Establishes the composition pattern before tackling dashboard.
2. **PrayerWallDashboard sections after** — multiple section headers; verify each per brand voice and vertical rhythm.

### Composition with adjacent surfaces

- **BackgroundCanvas (5.2)** wraps the page root on PrayerWall.tsx, PrayerWallDashboard.tsx, etc. 5.3 does NOT touch BackgroundCanvas (W13). The page-level atmospheric (BackgroundCanvas) is separate from the hero-section atmospheric (CinematicHeroBackground).
- **CinematicHeroBackground (Spec 14)** lives inside PrayerWallHero. 5.3 preserves it at the outer wrapper layer (W2 / D2).
- **4.7 chooser entry flow** — the hero CTA button is the entry point. 5.3 routes the `action` slot through PageHero's `children`, preserving composerRef and TooltipCallout binding (W12 / W18).
- **5.1 FrostedCard migration** — already ✅. PrayerCard, QOTD, etc. are migrated. 5.3 does NOT touch any FrostedCard consumer (out of scope).

---

## Recon Ground Truth (from brief, verified 2026-05-09)

### R1 — PageHero component shape

`frontend/src/components/PageHero.tsx` exports:

```ts
interface PageHeroProps {
  title: string
  subtitle?: string
  showDivider?: boolean
  scriptWord?: string
  children?: ReactNode
}
```

Renders `<section aria-labelledby="page-hero-heading" style={ATMOSPHERIC_HERO_BG}>` with internal `<h1 id="page-hero-heading">`. Applies GRADIENT_TEXT_STYLE to the title internally. `scriptWord` enables `renderWithScriptAccent` for caveat-font emphasis on one word — **5.3 does NOT pass this prop** (W3 / MPD-4). `showDivider` toggles a HeadingDivider — **5.3 does NOT pass this prop** (W20). `children` renders below the headline (used by 5.3 for the action button).

### R2 — SectionHeading component shape

`frontend/src/components/homepage/SectionHeading.tsx` exports:

```ts
interface SectionHeadingProps {
  heading?: string      // legacy 1-line API — NOT used by 5.3
  topLine?: string      // 2-line eyebrow
  bottomLine?: string   // 2-line headline (gradient)
  tagline?: string      // optional third line — NOT used by 5.3
  align?: 'center' | 'left'  // default 'center'
  className?: string
  id?: string
}
```

5.3 uses the 2-line mode exclusively. Visual sizes and gradient handled internally per `09-design-system.md` § "Section Heading — 2-Line Treatment".

### R3 — PrayerWallHero current state (post-Spec-14)

30 lines at `frontend/src/components/prayer-wall/PrayerWallHero.tsx`. Single-line `<h1>Prayer Wall</h1>` with GRADIENT_TEXT_STYLE, `<p>You're not alone.</p>`, CinematicHeroBackground at outer-most layer, `action` slot below subtitle. Padding `pt-[145px]` for transparent-nav clearance. Aria-labelledby chain: outer `<section>` → inner `<h1>`. Verified 2026-05-09.

### R4 — PrayerWallDashboard section header inventory

**Deferred to plan recon.** Brief notes likely sections include badges, quick stats, saved prayers, recent activity, prayer history / timeline — but the exact count and current heading element (h1/h2/h3) is unknown until `/plan-forums` reads the file. Plan output: a per-section table proposing topLine + bottomLine per section, reviewed by Eric.

### R5 — SectionHeading usage on other pages

Plan recon greps `<SectionHeading topLine` across `frontend/src/pages/` to calibrate eyebrow copy style to existing app patterns (likely MonthlyReport, Grow, others post-Round-3-Visual-Rollout). Per `09-design-system.md` line 608, surfaces using the verbatim treatment include: Daily Hub headings, Local Support hero, Grow hero, Ask hero, Settings hero, Insights hero, Music hero, RoutinesPage hero, RegisterPage hero, FinalCTA, DashboardPreview, DifferentiatorSection, StartingPointQuiz, and the homepage (Spec 13).

### R6 — GRADIENT_TEXT_STYLE

`frontend/src/constants/gradients.ts` exports `GRADIENT_TEXT_STYLE` and `renderWithScriptAccent`. PageHero imports and applies GRADIENT_TEXT_STYLE internally on its title; 5.3 does NOT pass the style explicitly.

### R7 — Existing tests

- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx` — exists (per 5.1's R5).
- `frontend/src/components/__tests__/PageHero.test.tsx` — exists.
- `frontend/src/components/homepage/__tests__/SectionHeading.test.tsx` — likely exists; plan recon confirms.
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` — likely exists; plan recon confirms.

Test update strategy: minimal. Update assertions on inline `<h1>` / `<p>` markup to assert PageHero's rendered output (PrayerWallHero) and SectionHeading's rendered output (PrayerWallDashboard). Add ~2 new tests for PageHero composition and CinematicHeroBackground preservation. Components themselves (PageHero, SectionHeading) are unchanged — no test changes for those.

### R8 — BackgroundCanvas wraps Prayer Wall pages (5.2 shipped via Spec 14)

`PrayerWall.tsx`, `PrayerWallDashboard.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx` all wrap content with `<BackgroundCanvas>`. 5.3 does NOT touch BackgroundCanvas (W13).

### R9 — aria-labelledby chain

Resolved by D6: outer wrapper becomes `<div>` (not `<section>`); PageHero's internal `<section aria-labelledby="page-hero-heading">` carries the accessible name. Axe-core (4.8 / Universal Rule 17) re-runs to confirm.

---

## Decisions (from brief Section 7)

### D1 — PrayerWallHero stays as a thin wrapper, composes PageHero internally

The `PrayerWallHero` named export is preserved. PrayerWall.tsx's existing `import { PrayerWallHero }` continues to work (W17). The component becomes a thin wrapper around PageHero with CinematicHeroBackground at the outer layer.

Alternative considered and rejected: removing PrayerWallHero entirely and using PageHero directly in PrayerWall.tsx. Rejected to avoid churn in PrayerWall.tsx and to keep CinematicHeroBackground composition encapsulated.

### D2 — CinematicHeroBackground preserved at outer layer

CinematicHeroBackground stays as the outer-most positioned element. PageHero's built-in `ATMOSPHERIC_HERO_BG` (radial-gradient at 15% violet center) composes additively with CinematicHeroBackground. Default decision: accept additive composition (D2 option c). If plan-time visual review finds the result too dark or busy, escalate — do NOT add a `transparent` prop to PageHero (W15).

### D3 — `title="Prayer Wall"`, `subtitle="You're not alone."`

Content stays identical to the pre-5.3 hero. No `scriptWord` (W3 / MPD-4). No `showDivider` (W20). Subtitle copy is brand-voice-aligned; do NOT change it during migration (W11).

### D4 — Dashboard section headers use `<SectionHeading topLine bottomLine />`

For every section header in PrayerWallDashboard, the inline single-line heading becomes a 2-line treatment via SectionHeading. `align='center'` by default; left-aligned sections pass `align='left'` per their existing layout.

### D5 — Plan recon enumerates dashboard sections and proposes copy

The brief intentionally does NOT pre-specify topLine/bottomLine pairs for dashboard sections — the inventory is unknown until plan recon reads `PrayerWallDashboard.tsx`. Plan output: per-section table reviewed by Eric before execute.

### D6 — aria-labelledby chain: drop outer wrapper's reference; trust PageHero's

Outer wrapper becomes `<div>` (not `<section>`); no `aria-labelledby` on it. PageHero's internal section + h1 is the accessible name source.

### D7 — Test update strategy: minimal

~5–8 small assertion updates + ~2 new tests for PageHero composition and CinematicHeroBackground preservation. PageHero and SectionHeading tests unchanged.

### D8 — NO new constants or shared utilities

5.3 is a consumer of existing primitives. Do NOT extract dashboard section eyebrows to a constants file, do NOT create a `Tier1Heading` or `DashboardHeading` wrapper, do NOT add props to PageHero or SectionHeading.

### D9 — Migration order

1. PrayerWallHero (smaller surface, single migration point).
2. PrayerWallDashboard sections (multiple sections, sequential migration).

### D10 — NO new visual regression infrastructure

5.3 inherits 5.1's manual-visual-review approach. No screenshot baselines, no `toHaveScreenshot()` integration. If 5.1 ended up establishing baselines, 5.3 regenerates them after Eric confirms parity for the hero and intentional change for the sections.

---

## Master Plan Divergences (from brief Section 4)

- **MPD-1** — Effective prereq is **5.1**, not 5.2 (5.2 already shipped via Spec 14). Both are ✅ in tracker.
- **MPD-2** — PageHero is `title`/`subtitle`; SectionHeading is `topLine`/`bottomLine`. **TWO DIFFERENT components, TWO DIFFERENT prop APIs.** Brief overrides master plan's looser phrasing (W4).
- **MPD-3** — Master plan body doesn't address CinematicHeroBackground composition with PageHero. Brief D2 resolves: PrayerWallHero wraps PageHero; CinematicHeroBackground stays at outer layer (W2).
- **MPD-4** — Master plan body doesn't address `scriptWord`. Spec 14 explicitly cleaned up `font-script` "Wall". **5.3 does NOT pass `scriptWord`** (W3).
- **MPD-5** — Master plan body doesn't enumerate dashboard sections. Plan recon enumerates per D5; Eric reviews proposed copy.
- **MPD-6** — Plan recon reads `09-design-system.md` § "Section Heading — 2-Line Treatment" (line 598) for the canonical 2-line spec. Fallback: `_plans/reconciliation/2026-05-07-post-rollout-audit.md` and existing SectionHeading usage on other pages.

---

## Watch-Fors (from brief Section 8 — all 20 are MANDATORY review checks)

- **W1** — 5.1 must be ✅ before 5.3 starts. **Verified 2026-05-11**: tracker row 73 shows ✅.
- **W2** — Do NOT drop CinematicHeroBackground. Spec 14 shipped it; 5.3 preserves it.
- **W3** — Do NOT reintroduce `scriptWord` on "Wall". Spec 14 cleaned it up.
- **W4** — Do NOT mix PageHero (`title`/`subtitle`) and SectionHeading (`topLine`/`bottomLine`) prop APIs.
- **W5** — Do NOT break `aria-labelledby` chain. Axe-core re-runs to confirm.
- **W6** — Do NOT ship dashboard section eyebrows with brand voice anti-patterns. See "Brand Voice Anti-Patterns" below.
- **W7** — Do NOT preempt Spec 5.4 (animation tokens). If 5.3 touches a file with hardcoded animation values, DON'T "fix them along the way".
- **W8** — Do NOT introduce layout shift below migrated headings. Composer / QOTD positions must be preserved.
- **W9** — Do NOT migrate other Prayer Wall page heros (PrayerDetail, PrayerWallProfile). Separate follow-ups.
- **W10** — Do NOT migrate card-level or dialog-level headings. SectionHeading is for PAGE SECTIONS only. QOTD eyebrow stays on FrostedCard's `eyebrow` prop (5.1 D4).
- **W11** — Do NOT change subtitle copy. "You're not alone." stays verbatim.
- **W12** — Do NOT break composerRef preservation. The `action` slot's ref binding must survive the migration through PageHero's `children`.
- **W13** — Do NOT touch BackgroundCanvas. That's 5.2's domain.
- **W14** — Do NOT introduce new npm dependencies.
- **W15** — Do NOT refactor PageHero or SectionHeading internals. Consume as-is.
- **W16** — Do NOT compose PageHero AND SectionHeading on the same surface. Hero uses PageHero; sections use SectionHeading. No nesting.
- **W17** — Do NOT break PrayerWall.tsx's `import { PrayerWallHero }`. The named export stays.
- **W18** — Do NOT break the 4.7 chooser entry flow. Hero CTA button still opens ComposerChooser.
- **W19** — Do NOT auto-regenerate visual regression baselines. Manual review by Eric is the gate (D10).
- **W20** — Do NOT add `HeadingDivider` via `showDivider={true}`. Pre-migration hero had no divider; adding one is a visual change beyond 5.3.

---

## Files to Create / Modify / NOT to Modify / Delete

### Files to Create

(none)

### Files to Modify

**Frontend (the 2 migration targets per master plan body):**

- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — migrate to compose PageHero internally; preserve CinematicHeroBackground at outer wrapper; preserve action slot via PageHero's children
- `frontend/src/pages/PrayerWallDashboard.tsx` — migrate every section header to `<SectionHeading topLine bottomLine align? />` per the plan-recon table (D5)

**Test files:**

- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx` — ~3–4 assertion updates + ~2 adds (PageHero composition, CinematicHeroBackground preservation)
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` — ~4–6 assertion updates per section migrated
- `frontend/tests/playwright/accessibility.spec.ts` (or wherever the 4.8 Universal Rule 17 axe-core suite lives — plan recon confirms exact path) — add `/prayer-wall/dashboard` to the scanned routes

**Operational:**

- `_forums_master_plan/spec-tracker.md` — Eric manually flips row 75 (Spec 5.3) from ⬜ to ✅ after merge AND manual visual review confirms hero parity and dashboard section voice approval

### Files NOT to Modify

- `frontend/src/components/PageHero.tsx` — component unchanged; 5.3 is a consumer (W15)
- `frontend/src/components/homepage/SectionHeading.tsx` — component unchanged; 5.3 is a consumer (W15)
- `frontend/src/components/CinematicHeroBackground.tsx` — preserved as outer-most layer; not modified
- `frontend/src/constants/gradients.ts` — `GRADIENT_TEXT_STYLE` applied internally by PageHero; not touched
- `frontend/src/pages/PrayerWall.tsx` — import of `{ PrayerWallHero }` unchanged (W17)
- `frontend/src/pages/PrayerDetail.tsx` — out of scope (W9)
- `frontend/src/pages/PrayerWallProfile.tsx` — out of scope (W9)
- Any BackgroundCanvas usage — out of scope (W13)
- All backend files — pure frontend spec
- All FrostedCard consumers — 5.1's domain, already ✅

### Files to Delete

(none)

---

## Acceptance Criteria (from brief Section 11)

**Hero migration:**

- [ ] PrayerWallHero composes PageHero internally
- [ ] PageHero receives `title='Prayer Wall'` and `subtitle="You're not alone."`
- [ ] NO `scriptWord` prop passed (W3)
- [ ] NO `showDivider` prop passed (W20)
- [ ] CinematicHeroBackground preserved at the outer wrapper
- [ ] Action slot (CTA button) renders inside PageHero's `children`
- [ ] composerRef binding on the action wrapper preserved
- [ ] First-time TooltipCallout still fires on hero button (per 4.7 W5)
- [ ] PrayerWall.tsx's `import { PrayerWallHero }` works unchanged
- [ ] Outer wrapper is `<div>` (not `<section>`); no nested-section issue
- [ ] `aria-labelledby` chain via PageHero internal works for screen readers

**Dashboard section migration:**

- [ ] Plan recon output: table of all section headers in PrayerWallDashboard with proposed topLine/bottomLine pairs and `align` per section
- [ ] Eric reviewed and approved the proposed table before `/execute-plan-forums` ran
- [ ] Every dashboard section header migrated to `<SectionHeading topLine bottomLine align? />`
- [ ] Each eyebrow + headline pair passes brand voice review (Brand Voice Anti-Patterns below)
- [ ] No card-level or dialog-level titles migrated (W10)
- [ ] No QOTD eyebrow conflict (W10; QOTD uses FrostedCard's eyebrow per 5.1 D4)

**Visual parity (hero) — subtle change expected:**

- [ ] Manual visual review by Eric: hero looks substantially the same as before
- [ ] No layout shift below the hero; composer / QOTD card positioned correctly
- [ ] Mobile responsive: title doesn't overflow, subtitle wraps cleanly
- [ ] Cinematic atmosphere visible behind PageHero (W2 confirmed)

**Visual change (dashboard sections) — intentional change expected:**

- [ ] Manual visual review by Eric: each section's new 2-line treatment reads as intended
- [ ] Vertical rhythm preserved or improved; no awkward gaps
- [ ] No layout shift below section headers (widgets render at same positions)
- [ ] Mobile responsive: eyebrow + headline pair fits without wrap weirdness

**Accessibility:**

- [ ] Universal Rule 17 axe-core tests pass on existing routes (`/prayer-wall` and its query variants)
- [ ] New axe-core route `/prayer-wall/dashboard` passes with zero violations
- [ ] Screen reader announces "Prayer Wall" heading on `/prayer-wall`
- [ ] Screen reader announces each section heading on `/prayer-wall/dashboard`
- [ ] Tab order on hero preserved (CTA button focus accessible via Tab)

**No regressions:**

- [ ] Hero CTA button still opens ComposerChooser (4.7 flow)
- [ ] All Prayer Wall feed functionality unchanged
- [ ] All dashboard widgets functional and rendering correct data
- [ ] BackgroundCanvas wraps all 4 Prayer Wall pages (5.2 unchanged)
- [ ] Per-type chrome on PrayerCard preserved (5.1 unchanged)
- [ ] Tests updated where needed; no broken tests

**Out of scope verification:**

- [ ] PrayerDetail page NOT touched (W9)
- [ ] PrayerWallProfile page NOT touched (W9)
- [ ] BackgroundCanvas NOT touched (W13)
- [ ] PageHero and SectionHeading internals NOT modified (W15)
- [ ] PrayerCard NOT touched (5.1's domain)
- [ ] No animation token migration (W7; that's 5.4)
- [ ] No new dependencies (W14)

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` row 75 (Spec 5.3) flipped from ⬜ to ✅ AFTER manual visual review confirms hero parity and dashboard section voice approval (Eric flips manually)

---

## Test Specifications (from brief Section 9)

Target: ~7–10 changes + 1 new Playwright route. Bounded surface, small new test load.

### Frontend (Vitest + RTL)

**`frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx`** (UPDATE — ~3–4 changes):

- Update existing assertions on inline `<h1>` and `<p>` markup to assert PageHero's rendered output
- ADD: 'composes PageHero with title="Prayer Wall"'
- ADD: 'composes PageHero with subtitle="You\'re not alone."'
- ADD: 'preserves CinematicHeroBackground'
- Preserve existing tests for action-slot rendering, composerRef binding, hero CTA behavior

**`frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx`** (UPDATE — ~4–6 changes):

- Per section migrated, assert `<SectionHeading topLine="X" bottomLine="Y" />` is rendered with the agreed copy from the plan-recon table
- Preserve existing tests for section content (badges list, stats, etc.)

**`frontend/src/components/__tests__/PageHero.test.tsx`** — NO CHANGES (PageHero unchanged in 5.3)

**`frontend/src/components/homepage/__tests__/SectionHeading.test.tsx`** — NO CHANGES (SectionHeading unchanged in 5.3)

### Playwright (Universal Rule 17 axe-core)

**`frontend/tests/playwright/accessibility.spec.ts`** (or the path confirmed by plan recon) — ADD 1 new route:

- ADD: `/prayer-wall/dashboard` to the axe-core scan list
- No new test code; just verify the existing scans on `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health` still pass with the migrated headings

### Total test budget

~7–10 small changes + 1 new Playwright scan route. No new test files created.

---

## Visual Verification Surface (from brief Section 3 — REQUIRED minimum 10 scenarios)

`/verify-with-playwright _specs/forums/spec-5-3.md` after `/code-review` passes. Verifier exercises:

1. **PrayerWallHero migrated**: `<h1>Prayer Wall</h1>` renders via PageHero; gradient applied; subtitle in calm prose; NO scriptWord on "Wall"; CinematicHeroBackground still visible; action slot still renders CTA; composerRef and TooltipCallout target the same button; aria-labelledby chain works.
2. **Dashboard sections migrated**: every section header renders `<SectionHeading topLine bottomLine />`; small eyebrow on top, big headline below; eyebrow text brand-voice-aligned; section spacing preserved (no layout shift below).
3. **Visual hierarchy correct**: hero is BIG-over-small (PageHero); sections are small-over-BIG (SectionHeading); the two patterns coexist intentionally.
4. **Brand voice**: hero title and subtitle unchanged; dashboard eyebrows per Section 13 brand voice (no exclamations, no urgency, no gamification, no comparison).
5. **No regressions**: hero CTA opens chooser; TooltipCallout fires; PrayerWall.tsx import works; PrayerWallDashboard order unchanged; data fetching unchanged; BackgroundCanvas wraps all 4 Prayer Wall pages; axe-core passes.
6. **Mobile responsive**: PageHero on mobile renders without overflow; SectionHeading centers correctly; eyebrow doesn't wrap awkwardly; gradient renders at small sizes.
7. **Reduced-motion**: PageHero transitions respect `prefers-reduced-motion`; SectionHeading reveals respect; CinematicHeroBackground continues its existing reduced-motion handling.
8. **No layout shift**: composer flow at same vertical offset; QOTD position unchanged; RoomSelector + CategoryFilterBar sticky behavior unchanged (4.8 D5); dashboard widgets render at same vertical positions.
9. **Dashboard heading count matches plan recon**: every single-line heading migrated; nothing missed.
10. **No code path uses both PageHero AND SectionHeading on the same surface**: hero uses ONLY PageHero; sections use ONLY SectionHeading. No nesting.

Verifier writes to `_plans/forums/spec-5-3-verify-report.md`.

**Manual visual review by Eric is required before merge** — two distinct review surfaces:

1. **Hero**: side-by-side screenshot comparison (pre vs post). Visual change subtle. CinematicHeroBackground visible. Composer position unchanged below.
2. **Dashboard sections**: each section reviewed individually for brand voice and vertical rhythm.

---

## Brand Voice Anti-Patterns (from brief Section 13 — MANDATORY review check for dashboard eyebrows)

The dashboard section eyebrows are the main brand voice surface in 5.3. Every proposed `topLine` is reviewed before execute; any of these patterns is a rejection trigger:

- "✨ Your Awesome Badges" — emoji + "awesome" (cheerleader)
- "Hot This Week: Stats" — "hot" (gamification, comparison)
- "Trending: Recent Activity" — "trending" (marketing voice)
- "PRO TIP: Saved Prayers" — "PRO TIP" (transactional, sales-y)
- "Don't miss your stats!" — urgency / FOMO
- "Section: Stats" — redundant prefix
- "STREAK: 7 Days" — all caps + competitive framing
- "Achievement Unlocked: Badges" — gamification, video-game speak
- "Level Up Your Practice" — gamification
- "Boost Your Faith" — transactional
- "Premium Stats" — paid/exclusive framing
- "Get more out of..." — transactional

**Good eyebrow patterns** (calibrated to Worship Room's calm, present voice):

- "Earned" / "Badges" — simple past tense
- "Your Practice" / "This Month" — ownership without competition
- "Personal" / "Saved Prayers" — quiet possessive
- "Recent" / "Activity" — simple time framing
- "This Week" / "Highlights" — temporal context
- "Currently" / "Active Streak" — frame as state, not score
- "For You" / "Recommendations" — soft framing
- "Quiet" / "Reflections" — if a journaling section exists

**General voice principles for eyebrows:**

- One or two words
- No emoji
- No exclamation
- No comparison ("top", "best", "most", "trending")
- No urgency ("now", "today", "don't miss")
- No gamification ("streak", "level", "unlock", "achievement")
- Calm noun or simple temporal/possessive context
- If unsure: choose a quieter word over a louder one

**Headline (bottomLine) voice:**

- Plain section noun ("Badges", "Stats", "Saved Prayers")
- No marketing copy ("Your Amazing Stats")
- No "My" prefix — eyebrow already establishes ownership

**Eric reviews every eyebrow + headline pair before `/execute-plan-forums` runs.** Edits to the plan loop back through plan generation.

---

## Out of Scope (from brief Section 12)

Explicit deferrals — do NOT include any of these in 5.3:

- PrayerDetail page hero migration (W9; follow-up)
- PrayerWallProfile page hero migration (W9; follow-up)
- Any page hero outside Prayer Wall
- Card-level title migration to SectionHeading (W10)
- Dialog-title migration to SectionHeading (W10)
- QOTD eyebrow migration to SectionHeading (W10; QOTD uses FrostedCard's eyebrow per 5.1 D4)
- Subtitle copy changes (W11; "You're not alone." stays)
- PageHero or SectionHeading refactors (W15)
- HeadingDivider addition on PrayerWallHero (W20)
- Animation token migration (W7; that's 5.4)
- Visual regression infrastructure setup (D10)
- PageHero `scriptWord` reintroduction (W3 / MPD-4)
- BackgroundCanvas changes (W13)
- New dependencies (W14)
- `Tier1Heading` or `DashboardHeading` wrapper components (D8)
- Visual changes to PageHero or SectionHeading internals
- Removing PrayerWallHero entirely and using PageHero directly in PrayerWall.tsx (D1)
- Adding props to PrayerWallHero (the `action` prop is the only API)
- Section reordering on dashboard (5.3 migrates each existing section's heading; doesn't reorder)

---

## Phase 3 Execution Reality Addendum — applicability

5.3 is pure-frontend visual refactor. None of the Phase 3 backend gates apply (items 1–13 from the Phase 3 Execution Reality Addendum). The relevant gates:

| # | Gate | Applies to 5.3? |
| - | ---- | --- |
| 1–13 | Phase 3 backend gates | N/A |
| 17 | Universal Rule 17 axe-core (from 4.8) | **Yes — indirect.** Migration must NOT introduce new accessibility violations. Existing axe-core suite re-runs; `/prayer-wall/dashboard` added to scan list. |
| 18 | Visual parity gate (from 5.1) | **Yes — loosely.** Hero is parity (subtle change). Dashboard sections are INTENTIONAL visual change (single-line → 2-line); pure parity does NOT apply there. |
| 19 (new) | Eyebrow + headline brand voice gate | **Yes — new gate introduced by 5.3.** Every eyebrow + headline pair brand-voice-reviewed per Section 13 before merge. |

---

## Out-of-Band Notes for the Executor

- **Effective prereq is 5.1, not 5.2** (5.2 already shipped via Spec 14) — MPD-1. Both ✅ in tracker.
- **PageHero uses `title`/`subtitle`; SectionHeading uses `topLine`/`bottomLine`** — MPD-2 / W4. The two components are NOT interchangeable.
- **PrayerWallHero composes PageHero internally; CinematicHeroBackground preserved at outer layer** — MPD-3 / D1 / D2 / W2.
- **NO `scriptWord` on "Wall"** — MPD-4 / W3. Spec 14 cleaned this up; 5.3 does not reintroduce.
- **Dashboard section copy enumerated via plan recon, brand-voice-reviewed** — MPD-5 / D5. Eric reviews proposed copy before execute.
- **Brand voice guardrails in Brand Voice Anti-Patterns section are mandatory** — Section 13 of brief.
- **All 20 watch-fors must be addressed.**
- **Single quotes throughout TypeScript and shell.**
- **Test convention:** `__tests__/` colocated with source files.
- **Tracker is source of truth.** Eric flips row 75 from ⬜ to ✅ after merge AND manual visual review.
- **Eric handles all git operations manually.** CC must NOT run `git checkout`, `git checkout -b`, `git switch`, `git switch -c`, `git branch`, `git commit`, `git commit -am`, `git push`, `git stash`, `git stash pop`, `git reset` (any flag), `git rebase`, `git cherry-pick`, `git merge`, `gh pr *`, `glab mr *` in any phase. Read-only git inspection (`git status`, `git diff`, `git log --oneline`, `git blame`, `git show`) is allowed.
- **Hero migration is mostly visual parity** (subtle change). **Dashboard sections are intentional visual change** (single-line → 2-line).
- **Brand voice on eyebrow copy is sensitive**; Section 13 anti-patterns are the rejection test.
- **Pure-frontend spec**; no backend changes, no Liquibase, no API contract impact.

---

## Tier Rationale (from brief Sections 2 and 14)

Run at **High**. Justifications:

**Why not Standard:**

- CinematicHeroBackground composition with PageHero is subtle (MPD-3 / D2). Standard tier sometimes drops CinematicHeroBackground.
- `scriptWord` regression risk (W3). PageHero supports the prop; Standard tier might add it "helpfully".
- PageHero vs SectionHeading prop API confusion (MPD-2 / W4). Standard tier sometimes mixes them.
- Dashboard eyebrow brand voice is subjective. Standard tier sometimes ships cheerleader/gamification copy.
- `aria-labelledby` chain change is non-obvious (D6 / W5).
- Layout shift risk below migrated headings (W8).

**Why not xHigh:**

- No new component creation
- Only 2 source files modify
- Components already exist and are battle-tested
- Brief covers all decisions and watch-fors explicitly
- Visual hierarchy patterns (PageHero vs SectionHeading) are well-defined in `09-design-system.md`

**Override moments — bump to MAX when:**

- CC drops CinematicHeroBackground (W2 / D2 violation)
- CC reintroduces `scriptWord` on "Wall" (W3 violation)
- CC mixes PageHero and SectionHeading prop APIs (W4)
- CC ships dashboard eyebrows with brand-voice anti-patterns (W6 / Section 13)
- CC breaks `aria-labelledby` chain (W5)
- CC introduces layout shift below hero or sections (W8)
- CC migrates out-of-scope page heros or card/dialog titles (W9 / W10)
- CC changes the subtitle copy (W11)

---

## Next Steps After This Spec Lands on Disk

1. Run `/plan-forums _specs/forums/spec-5-3.md` to generate the implementation plan (with the dashboard section inventory table)
2. Review the plan — Eric specifically reviews the per-section eyebrow + headline table for brand voice
3. Run `/execute-plan-forums _plans/<plan>.md` to execute (PrayerWallHero first per D9, then dashboard sections)
4. Run `/code-review` for pre-commit quality check (Forums Wave safety checks included)
5. Run `/verify-with-playwright _specs/forums/spec-5-3.md` for visual verification (10-scenario surface per Section 3 of brief; manual visual review by Eric required before merge — D10 / W19)
6. Eric manually flips `_forums_master_plan/spec-tracker.md` row 75 (Spec 5.3) from ⬜ to ✅ after merge AND manual visual review confirms (a) hero parity and (b) dashboard section voice approval

**Verification handoff (brief Section 16):** the verifier exercises Section 3's 10 scenarios and writes to `_plans/forums/spec-5-3-verify-report.md`. If verification flags any of the canonical override moments (CinematicHeroBackground lost, `scriptWord` reintroduced, prop APIs mixed, `aria-labelledby` broken, brand voice anti-patterns, layout shift, out-of-scope migrations, subtitle changed, composerRef broken, BackgroundCanvas touched, new dependencies, internal refactors, HeadingDivider added, axe-core failures), abort and bump to MAX. Manual visual review by Eric is the gate before merge.
