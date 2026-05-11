# Spec 5.5 — Deprecated Pattern Purge and Visual Audit

**Master plan ID:** `round3-phase05-spec05-deprecated-pattern-purge`
**Size:** L (master plan body says M; brief expands to L given the visual unification scope Eric layered onto the master plan's grep-and-delete framing)
**Risk:** Medium (master plan body says Low; brief upgrades to Medium because visual change is intentional and noticeable, and there is real risk of missing a surface)
**Prerequisites:** 5.4 (Animation Token Migration) ⬜ — must ship before 5.5 execution begins
**Tier:** xHigh

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the
following commands in this session, in any phase (recon, plan, execute, verify,
review):

- `git checkout` / `git checkout -b`
- `git switch` / `git switch -c`
- `git branch`
- `git commit` / `git commit -am`
- `git push`
- `git stash` / `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation
and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection:
`git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

---

## 2. Tier — xHigh

### Why xHigh

5.5 is brand-defining work. Eric's expanded scope ("Prayer Wall must feel like
Daily Hub; make it look exquisite") elevates this from a mechanical pattern
sweep into a visual unification audit. The acceptance criterion "Prayer Wall
feels like Daily Hub" is a manual judgment AC that requires Eric's eye to
ratify, and the spec must structure the work so that judgment has somewhere to
land.

Three properties together make this xHigh:

1. **Multiple decision points per surface.** There are at least four Prayer
   Wall routes (`/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`,
   `/prayer-wall/profile/:id`). Each has multiple cards, inputs, empty states,
   and CTAs. Each needs an individual tier read against the Daily Hub canonical
   catalog. That is dozens of small calls, each with brand impact.

2. **Risk of missing surfaces.** Visual changes are noticeable when one card
   slips through. A single un-migrated `bg-white/[0.06]` panel inside a route
   that otherwise reads as canonical will visually jar. The spec must
   enumerate surfaces exhaustively, and the plan must catalog Daily Hub's
   canonical patterns exhaustively, so that no surface is migrated without an
   explicit canonical target.

3. **Reverses an earlier shipped directive.** Spec 5.1 W8 froze the
   per-type accent opacities at the deprecated `/[0.04]` tier and committed
   that freeze to a comment block in `post-type-chrome.ts`. 5.5 reverses that
   directive. The reversal must be framed cleanly in the spec so that
   execute-time CC does not encounter conflicting instructions across files.

### Why not High

High is judgment work with multiple decision points and ~10-20 file changes.
5.5 fits the file count but exceeds the judgment threshold: "feels like Daily
Hub" is not a checklist outcome, it's a curator's call. Eric's manual audit at
the end is the gate. That moves it past High.

### Why not MAX

MAX is for override moments: spec failures, scope explosions, recon ground
truth wrong. None of those have occurred yet. If plan-time CC's Daily Hub
Canonical Pattern Catalog surfaces patterns that contradict the D-decisions in
this brief, that triggers a MAX moment (advisor re-ranks the D-decisions
before spec finalizes). Until then, xHigh is the right tier.

### Override moments that should bump 5.5 to MAX

- Plan-time CC's Daily Hub Canonical Pattern Catalog reveals a canonical
  pattern that contradicts a D-decision in this brief. Advisor re-ranks
  the relevant D-decision and the spec consumes the corrected ranking.
- Spec-time recon finds a Prayer Wall surface not enumerated in Section 5 of
  this brief that requires its own tier read. Advisor decides whether to fold
  into 5.5 or split.
- Execute-time CC finds a surface where canonical opacity normalization
  produces a visual that Eric judges as "worse not better." Advisor decides
  whether to keep canonical (the spec's directive stands) or accept the
  surface as documented intentional drift in 09-design-system.md (separate
  follow-up spec).
- Any divergence from canonical opacity values that execute-time CC believes
  is warranted on a specific surface. Surface to Eric; do not silently
  preserve deprecated values.

---

## 3. Visual verification — REQUIRED

`/verify-with-playwright` must run after `/code-review` passes. Eric pairs the
automated verification with a manual visual audit of the rendered Prayer Wall
against the rendered Daily Hub on the same device.

### Routes to verify

1. `/prayer-wall` (feed view, logged-out)
2. `/prayer-wall` (feed view, logged-in)
3. `/prayer-wall/:id` (single prayer detail, logged-out)
4. `/prayer-wall/:id` (single prayer detail, logged-in)
5. `/prayer-wall/dashboard` (own dashboard, logged-in)
6. `/prayer-wall/profile/:userId` (another user's profile, logged-in)
7. `/daily` (regression — confirm no visual drift from Daily Hub during 5.5)
8. `/daily?tab=pray` (regression — confirm Pray tab canonical patterns intact)

### Breakpoints

Standard verify-with-playwright set: 375, 428, 768, 1024, 1440, 1920.

### Per-route verification scenarios (target: 18-22 scenarios total)

**`/prayer-wall` feed view (5 scenarios)**

- Feed cards render with `<FrostedCard variant="default">` chrome; computed
  background-color matches canonical `bg-white/[0.07]` for `prayer_request`
  type (no per-type overlay), or `bg-white/[0.07]` composited with per-type
  overlay at canonical `/[0.08]` opacity for other types
- Feed cards use `rounded-3xl` geometry (computed border-radius = 24px), not
  the deprecated `rounded-2xl` (16px)
- Per-type accent borders match canonical `/[0.12]` opacity, not deprecated
  `/10`
- "Share Something" hero CTA matches the canonical pattern decided at plan time
  (D10); confirm no deprecated `backdrop-blur` inline frosted chrome remains
- Empty state when no prayers exist uses `<FeatureEmptyState>`, not a
  rolls-own `rounded-2xl border border-white/10` card

**`/prayer-wall/:id` single prayer view (4 scenarios)**

- Main prayer card renders as Tier 1 accent: `<FrostedCard variant="accent">`
  with computed background-color matching canonical `bg-violet-500/[0.08]`
  composited with whatever FrostedCard's accent variant provides
- Comment list items use `<FrostedCard variant="default">` (Tier 2), not
  rolls-own `rounded-xl border border-white/10`
- "Prayer not found" empty state (navigate to nonexistent ID) uses
  `<FeatureEmptyState>`, not the rolls-own card at line 330 in the current
  source
- Destructive action buttons (Report, if visible) use muted treatment
  (`bg-red-950/30 border-red-500/40`), not saturated `bg-red-700`

**`/prayer-wall/dashboard` user dashboard (5 scenarios)**

- User header / stats section renders as Tier 1 accent
- Display name input uses canonical input chrome per Daily Hub Catalog (D9
  resolves at plan time)
- Bio textarea uses canonical violet textarea glow pattern matching Daily
  Hub's Pray/Journal textareas: computed box-shadow contains the
  `rgba(167,139,250,...)` violet glow values
- Comment list item card (line 600 in current source) uses `<FrostedCard
  variant="default">`, not rolls-own
- Notification preferences card (line 722 in current source) uses
  `<FrostedCard variant="default">`, not rolls-own

**`/prayer-wall/profile/:userId` profile view (4 scenarios)**

- User header card renders as Tier 1 accent
- Prayer history list cards render as Tier 2 default (`<FrostedCard
  variant="default">`)
- "User not found" empty state (navigate to nonexistent userId) uses
  `<FeatureEmptyState>`, not the rolls-own card at line 214 in current source
- Comment list items (line 412 in current source) use `<FrostedCard
  variant="default">`, not rolls-own

**Daily Hub regression (2 scenarios)**

- `/daily` renders identically to its pre-5.5 state (no FrostedCard variant
  drift, no opacity drift, no typography change). Screenshot diff against
  pre-5.5 baseline at 1440px and 375px shows zero meaningful change.
- `/daily?tab=pray` Pray tab textarea retains its canonical violet glow
  pattern; no regression introduced by 5.5's textarea migration on
  PrayerWallDashboard.

### Computed style assertion strategy

Per W16, runtime verification must use computed style assertions, not just
className grep. Specifically:

- For FrostedCard variant correctness: assert computed `background-color`
  matches the canonical RGB value (FrostedCard's variant CSS is sourced from
  the primitive; if the primitive renders the wrong color, that's a primitive
  bug, not a 5.5 bug — but the assertion catches both)
- For `rounded-3xl`: assert computed `border-radius` is exactly `24px`
- For per-type accent overlay: assert computed `background-color` of the
  overlay layer is at canonical alpha (0.08 for the `/[0.08]` Tailwind class)
- For textarea violet glow: assert computed `box-shadow` contains the
  canonical violet RGB values at the canonical opacity stops

The spec's test specifications (Section 9) define the exact assertion
predicates; verify-with-playwright executes them at runtime.

---

## 4. Master Plan Divergence

The master plan body for Spec 5.5 frames the work as a grep-and-delete sweep
of deprecated patterns inside `frontend/src/components/prayer-wall/` and
`frontend/src/pages/Prayer*`. Eric expanded the scope verbally on 2026-05-11
to a visual unification audit: Prayer Wall must inherit Daily Hub's visual
language wholesale, everywhere it currently deviates. This brief encodes that
expansion as binding for the spec.

The divergences from the master plan body are enumerated as MPD-N entries so
that execute-time CC can audit each one against the master plan and surface
any conflict cleanly.

### MPD-1 — Acceptance criteria expansion

Master plan AC list is the eight-item checklist plus visual regression and
manual audit. Brief expands AC to include:

- Opacity normalization to canonical Visual Rollout tiers across all four
  per-type accent backgrounds in `post-type-chrome.ts` (`/[0.04]` → `/[0.08]`)
- Eight pages-level inline frosted patterns migrated to `<FrostedCard>` with
  canonical variants (these were not in 5.1's scope and were verified on disk
  by the handoff author)
- Three "not found" empty states migrated to `<FeatureEmptyState>`
- Bio textarea on `PrayerWallDashboard` migrated to canonical violet textarea
  glow pattern
- Single-line inputs migrated to canonical input chrome per Daily Hub Catalog
- "Share Something" hero CTA migrated per plan-time decision (D10)
- `post-type-chrome.ts` comment block updated to remove the "NOT to be
  normalized — per Spec 5.1 W8" directive
- Tests assert canonical opacities and per-type colors; tests assert
  FeatureEmptyState presence on migrated empty-state surfaces
- Manual visual audit: Eric confirms "Prayer Wall feels like the same product
  as Daily Hub" across all four routes at 1440px and 375px

### MPD-2 — Size

Master plan body says M. Brief upgrades to L. Justification: 5.1 migrated
internal `components/prayer-wall/` files only; 5.5 migrates four pages-level
files plus the constants file plus tests. File count is ~10 modified, three
created, zero deleted. Net change footprint exceeds M by the master plan's
own sizing rubric.

### MPD-3 — Risk

Master plan body says Low. Brief upgrades to Medium. Justification: visual
change is intentional and noticeable. A missed surface produces a visible
inconsistency that Eric or a user will notice immediately. Manual audit is
the safety net but the spec's enumeration of surfaces must be exhaustive to
make the audit's job tractable.

### MPD-4 — W-OVERRIDE-5.1 introduction

Master plan did not anticipate that 5.1 W8 would freeze deprecated opacity
values in the canonical constants file. Brief introduces W-OVERRIDE-5.1 in
Section 8 as the central correction. The override is load-bearing: every
opacity value touched by 5.5 must move from deprecated to canonical, including
the comment block in `post-type-chrome.ts` that previously codified the
freeze.

### MPD-5 — Daily Hub Canonical Pattern Catalog

Master plan approach is "open 09-design-system.md § Deprecated Patterns and
grep." Brief expands the approach to include a mandatory pre-spec plan-time
recon phase that produces a Daily Hub Canonical Pattern Catalog. The catalog
is the shared language for every migration decision: "Prayer Wall surface X
currently has Y; canonical Daily Hub pattern per catalog item N is Z;
migration is Y→Z." This is the key innovation of 5.5 and the reason the brief
defers many ground-truth decisions to plan time rather than baking them in
from intent alone.

### MPD-6 — Scope explicitly excludes 09-design-system.md edits

Master plan body is silent on whether 5.5 edits the design system rules file.
Brief makes explicit: 5.5 consumes 09-design-system.md, it does not write to
it. Any pattern documentation drift discovered during 5.5 is a follow-up issue,
not a 5.5 deliverable. This prevents scope creep into rules maintenance.

---

## 5. Recon Ground Truth (2026-05-11)

Each finding is marked **VERIFIED** (verified on disk by the handoff author;
trust this in the spec) or **PLAN-RECON-REQUIRED** (handoff author could not
verify end-to-end; plan-time CC reads the source at plan time and produces
the catalog or finding then). Per Section 10 of the handoff (R-OVR pattern),
if any VERIFIED finding turns out to be wrong on disk at plan time, the spec
records an R-OVR entry; the brief's design intent stands.

### R1 — `post-type-chrome.ts` current state — VERIFIED

File: `frontend/src/constants/post-type-chrome.ts`

Current contents (verified by handoff author):

```ts
import type { PostType } from '@/constants/post-types'

/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides ONLY
 * the border tint and background tint; the frosted glass base chrome
 * (rounded-3xl, backdrop-blur, default surface opacity) is provided by
 * FrostedCard itself.
 *
 * Lifted verbatim from PrayerCard.tsx's per-type switch (Spec 5.1, 2026-05-11).
 * Opacities are NOT to be normalized — per Spec 5.1 W8, the migration preserves
 * the per-type accent opacity values exactly as they were in the inline switch.
 */
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/10 bg-amber-500/[0.04]',
  question: 'border-cyan-200/10 bg-cyan-500/[0.04]',
  discussion: 'border-violet-200/10 bg-violet-500/[0.04]',
  encouragement: 'border-rose-200/10 bg-rose-500/[0.04]',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
```

The comment block warning "NOT to be normalized" is the load-bearing 5.1 W8
artifact. 5.5 reverses both the values and the comment.

### R2 — Eight pages-level inline frosted patterns NOT in 5.1's scope — VERIFIED

These were not migrated by 5.1 because 5.1 was scoped to
`components/prayer-wall/` only. Verified by handoff author:

| File | Line | Pattern | Use |
|------|------|---------|-----|
| `pages/PrayerWallDashboard.tsx` | 381 | `bg-white/[0.06]` | display name input chrome |
| `pages/PrayerWallDashboard.tsx` | 418 | `bg-white/[0.06]` | bio textarea chrome |
| `pages/PrayerWallDashboard.tsx` | 600 | `rounded-xl border border-white/10 bg-white/[0.06]` | comment list item card |
| `pages/PrayerWallDashboard.tsx` | 722 | `rounded-xl border border-white/10 bg-white/[0.06]` | notification preferences card |
| `pages/PrayerDetail.tsx` | 330 | `rounded-xl border border-white/10` | "Prayer not found" empty state |
| `pages/PrayerWallProfile.tsx` | 214 | `rounded-xl border border-white/10` | "User not found" empty state |
| `pages/PrayerWallProfile.tsx` | 412 | `rounded-xl border border-white/10` | comment list item card |
| `pages/PrayerWall.tsx` | 822, 838 | `backdrop-blur` | "Share Something" CTA button (hero) |

Plan-time CC should re-verify these line numbers (the source may shift
between brief authorship and plan execution) and grep the same files for any
additional inline frosted patterns the handoff author missed.

### R3 — FrostedCard not imported in pages files — VERIFIED

`FrostedCard` is not currently imported in any of the four pages files listed
in R2 (verified by handoff author). Migration in 5.5 must add the import to
each page file before consuming the component.

### R4 — FeatureEmptyState already imported in PrayerWallProfile.tsx — VERIFIED

`FeatureEmptyState` is imported at line 14 of `pages/PrayerWallProfile.tsx`
and used at line 349 of the same file (verified by handoff author). This
confirms it is the canonical empty-state component. The migration in 5.5
extends its use to the "User not found" empty state at line 214 in the same
file, and adds the import to `pages/PrayerWallDashboard.tsx` and
`pages/PrayerDetail.tsx`.

### R5 — Already clean in Prayer Wall (master plan AC satisfied by absence) — VERIFIED

Handoff author verified zero source matches in `components/prayer-wall/` or
`pages/Prayer*` for:

- `font-script` / `Caveat` (only present in test negative assertions and one
  doc comment in `gradients.tsx`)
- `BackgroundSquiggle`
- `GlowBackground`
- `animate-glow-pulse`
- `font-serif italic` (only one negative test assertion verifying cleanup)
- `line-clamp-3` in `components/prayer-wall/`
- `cubic-bezier(` in `components/prayer-wall/`

These items in the master plan acceptance criteria list are satisfied by
absence. The spec records this in its acceptance criteria evidence column
("verified absent on 2026-05-11") rather than re-running grep at execute time.

### R6 — 5.1 W8 directive comment block — VERIFIED

The comment block in `post-type-chrome.ts` quoted in R1 contains the
load-bearing 5.1 W8 reference. Plan-time CC removes both the freeze directive
("Opacities are NOT to be normalized") and the W8 cross-reference, replacing
with a 5.5 reference that documents the canonical opacities and the rationale
for the reversal.

### R7 — FrostedCard variant CSS — PLAN-RECON-REQUIRED

File: `frontend/src/components/homepage/FrostedCard.tsx`

The handoff author confirmed FrostedCard exposes variants `accent | default |
subdued` but did not verify the full variant CSS end-to-end. Plan-time CC
must read this file in full and catalog:

- The exact Tailwind class string for each variant (background, border,
  border-radius, padding, shadow, backdrop-blur)
- The computed RGB values at each variant
- The component's prop signature, especially whether it accepts `as`,
  `className`, `children`, `onClick`, or other composition props
- Whether the component renders a `<div>`, `<section>`, or accepts `as`
- Default radius (likely `rounded-3xl` per 09-design-system.md canonical, but
  verify on disk)

This catalog feeds D-decisions about tinted card composition (D8) and
button-as-card patterns (D10).

### R8 — FeatureEmptyState props signature — PLAN-RECON-REQUIRED

File path: likely `frontend/src/components/FeatureEmptyState.tsx` or under a
`shared/` subdirectory; plan-time CC locates it.

Plan-time CC reads the source and catalogs:

- Prop signature (likely `icon`, `heading`, `body`, possibly `action`)
- Default styling (FrostedCard variant or rolls-own)
- Examples of existing usage to inform migration site rewrites
- Whether it accepts a `className` for one-off overrides

### R9 — Daily Hub Canonical Pattern Catalog — PLAN-RECON-REQUIRED (THE KEY DELIVERABLE)

Plan-time CC reads the following files end-to-end and produces a Daily Hub
Canonical Pattern Catalog. The catalog is prefixed as Section 5 of the spec
(before the migration plan). It is the shared language for every D-decision
in this brief and every migration choice in the plan.

Files to read end-to-end at plan time:

- `frontend/src/pages/DailyHub.tsx` — canonical page composition; imports
  BackgroundCanvas, CinematicHeroBackground, GRADIENT_TEXT_STYLE,
  SongPickSection, PrayTabContent, etc.
- `frontend/src/components/daily/PrayTabContent.tsx` — closest analog to a
  Prayer Wall content surface
- `frontend/src/components/SongPickSection.tsx` — canonical FrostedCard
  composition example
- `frontend/src/components/homepage/FrostedCard.tsx` — the primitive itself
- `frontend/src/components/PageHero.tsx` — canonical hero treatment
- `_plans/reconciliation/2026-05-07-post-rollout-audit.md` — the
  post-Visual-Rollout reconciliation report; documents canonical opacities
  and tier definitions

Catalog entries the plan-time recon must produce:

1. **Card composition** — how Daily Hub composes cards; which variants for
   which content types; example code patterns
2. **Color palette** — actual hex / Tailwind values in use; gradient
   definitions; per-content accent colors
3. **Tier hierarchy** — what reads as Tier 1 accent vs Tier 2 default vs
   Tier 3 subdued
4. **Geometry** — `rounded-3xl` confirmed default; padding; gaps
5. **Hero treatment** — gradient text on key word; 2-line vs 1-line; subtitle
   pattern
6. **Atmosphere** — BackgroundCanvas usage; CinematicHeroBackground usage;
   layering
7. **Hover / focus** — canonical interaction treatment
8. **Transitions** — token usage (matches 5.4's animation tokens)
9. **Empty states** — FeatureEmptyState canonical pattern
10. **Dialog chrome** — modal / dialog patterns; destructive button muting
11. **Form input chrome** — input / textarea canonical pattern (answers Q4 /
    D9 for single-line inputs)
12. **Button variants** — frosted button pattern if exists (answers Q5 / D10)

The catalog is the SHARED LANGUAGE for the migration plan. Every migration
decision in the plan references a catalog item: "Prayer Wall surface X
currently has Y; canonical Daily Hub pattern per catalog item N is Z;
migration is Y→Z."

### R10 — PrayerCard.tsx current FrostedCard composition — PLAN-RECON-REQUIRED

Handoff author understanding (not verified end-to-end): PrayerCard uses
`<FrostedCard variant="default" className={cn(getPerTypeChromeClass(...))}>`.
Plan-time CC reads PrayerCard.tsx and confirms the exact composition pattern,
including:

- The full className composition for each variant case
- Whether there's a wrapping `<div>` outside FrostedCard for any reason
- Whether the per-type chrome class is applied via `cn()` or direct concat
- Whether any tier escalation logic exists (e.g., highlighted prayer = accent
  variant)

### R11 — PrayerWallHero `action` prop interface — PLAN-RECON-REQUIRED

The "Share Something" CTA at `pages/PrayerWall.tsx:822, 838` is passed
through PrayerWallHero's `action` prop. Plan-time CC reads PrayerWallHero to
confirm:

- The `action` prop's expected type (likely `ReactNode`)
- How `action` renders inside the hero (its position, its container)
- Whether PrayerWallHero applies any chrome to the action wrapper or
  passes it through unchanged

This informs D10 (Share Something CTA migration).

### R12 — Existing Button variant set in codebase — PLAN-RECON-REQUIRED

To answer Q5 / D10, plan-time CC must enumerate the existing Button variants
in the codebase. Likely locations:

- `frontend/src/components/Button.tsx` (if exists)
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/homepage/` for canonical homepage CTA patterns

If a `frosted` or `subtle` variant exists that fits the "quiet hero CTA"
brief, D10 resolves to that. If not, D10 resolves to FrostedCard with `as`
(if FrostedCard supports `as`) or a thin button with FrostedCard variant
classes applied directly.

### R13 — Existing canonical input chrome pattern — PLAN-RECON-REQUIRED

To answer Q4 / D9 for single-line inputs (not the bio textarea), plan-time CC
locates Daily Hub's canonical single-line input pattern if one exists. Likely
locations: search forms, profile editors, settings panels. If Daily Hub has
no canonical single-line input pattern (it may not — Daily Hub is mostly
read-and-textarea-write), D9 partial-resolves by inheriting the textarea
violet glow pattern's input-appropriate equivalent (lighter shadow, same
border-violet treatment).

### R14 — Comprehensive Prayer Wall surface enumeration — PLAN-RECON-REQUIRED

The R2 table is the handoff author's verified inventory of inline frosted
patterns in pages-level files. Plan-time CC greps the four pages files and
all of `components/prayer-wall/` comprehensively for:

- `bg-white/[0.0` (catches any white-tinted surface at any opacity)
- `border-white/[0.0` and `border-white/1` (catches any white-tinted border)
- `rounded-2xl` (catches any deprecated radius)
- `rounded-xl` (likely intentional on small chips but verify; catches
  rolls-own cards using the wrong card radius)
- `backdrop-blur` (catches any inline frosted treatment not via FrostedCard)
- `shadow-` (catches rolls-own shadows that may be deprecated soft-shadow
  8px-radius cards per the master plan AC)
- `bg-red-7`, `bg-red-8` (catches saturated destructive)
- `text-primary` (catches deprecated text-button color)
- `ring-primary` (catches deprecated ring color)

Any surface surfaced by these greps that is not in R2 must be added to the
spec's migration list. The plan's R-OVR section records each addition.

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The Phase 3 Execution Reality Addendum is the post-Visual-Rollout doctrine
defining gates for visual / chrome migration work. 5.5 maps to those gates as
follows:

| Gate | Description | 5.5 applicability |
|------|-------------|-------------------|
| Gate 1 — Test coverage delta | Tests added / updated match the surface changes | **APPLIES** — see Section 9 |
| Gate 2 — Visual regression | All affected routes visually verified | **APPLIES** — verify-with-playwright Section 3 |
| Gate 3 — Cross-route consistency | Pattern applied identically across affected routes | **APPLIES** — Daily Hub Catalog references resolve identically |
| Gate 4 — Deprecation source audit | Source of deprecated pattern documented | **APPLIES** — `09-design-system.md` § Deprecated Patterns is the source |
| Gate 5 — Canonical primitive consumption | Migration uses canonical primitive, not rolls-own | **APPLIES** — FrostedCard and FeatureEmptyState exclusively |
| Gate 6 — Atomic per-surface migration | One PR, one phase scope; no partial migrations | **APPLIES** — 5.5 is its own commit |
| Gate 7 — Backward compatibility audit | Old code paths removed, not just hidden | **APPLIES** — inline classNames removed, not commented out |
| Gates 8-21 | (omitted; standard chrome migration gates) | applicable as standard |
| Gate 22 (NEW for 5.5) | Daily Hub Canonical Pattern Catalog produced at plan time | **APPLIES** — see R9; this is the spec's Section 5 prefix |

Gate 22 is introduced by 5.5 and may persist as a standard gate for future
visual unification work. The plan-time recon phase produces the catalog and
the spec consumes it; without the catalog, every migration decision is
either a guess or a separate ad-hoc recon, which is what the catalog
prevents.

---

## 7. Decisions and divergences

These D-decisions encode design intent. Where the handoff author has design
context to commit, the D-decision is stated declaratively. Where the
decision requires source reading the handoff author cannot complete, the
D-decision explicitly defers to plan-time CC's Daily Hub Catalog. Defer-
labeled D-decisions are not weakness — they are the R-OVR pattern's correct
posture for things the brief cannot verify.

### D1 — Tier hierarchy is the central organizing principle Prayer Wall inherits from Daily Hub

Above all other inheritance candidates, the tier hierarchy is the brand-
defining pattern that Prayer Wall must adopt. Daily Hub's visual language
is organized by tiers:

- **Tier 1 accent** for the primary anchor on a surface (today's devotional)
- **Tier 2 default** for secondary content (recent journal entries, today's
  prayer prompt)
- **Tier 3 subdued** for tertiary content (saint quotes, supporting metadata)

This hierarchy is what makes Daily Hub feel curated rather than flat. Every
Prayer Wall route must answer the question "what is Tier 1 on this route?"
explicitly. D2 below answers that question per route.

### D2 — Per-route tier reads on Prayer Wall

- **`/prayer-wall` (feed view):** No Tier 1 anchor. The feed is a stream of
  equally-weighted entries. All cards render as Tier 2 default. Per-type
  accent overlays provide visual variation without claiming hierarchy. This
  matches the social-feed metaphor: a feed is a flow, not a curated
  composition.
- **`/prayer-wall/:id` (single prayer detail):** The active prayer card is
  Tier 1 accent. It is the anchor of its own page. Comments below are Tier 2
  default. Related prayers (if surfaced in future specs) would be Tier 3
  subdued.
- **`/prayer-wall/dashboard` (own dashboard):** The user header / stats card
  at the top of the dashboard is Tier 1 accent. Sub-sections below (display
  name editor, bio editor, notification preferences, comment list) are Tier
  2 default.
- **`/prayer-wall/profile/:userId` (another user's profile):** The user
  header card is Tier 1 accent. Prayer history list cards are Tier 2 default.
  Comments are Tier 2 default.

This per-route tier read gives every Prayer Wall page a clear visual anchor
where one is appropriate (detail / dashboard / profile pages) and respects
the flow metaphor where it isn't (feed).

### D3 — Color restraint: mostly white / violet on dark; per-type accents stay quiet

Daily Hub's color language is mostly white-on-dark for body content and
violet for accents (active states, gradient anchor word, accent variant
borders). Per-type accent colors on Prayer Wall (amber for testimony, cyan
for question, violet for discussion, rose for encouragement) stay quiet —
they signal type, not importance. The canonical `/[0.08]` opacity is quiet
enough that the per-type tint reads as a subtle variation rather than a
loud chrome statement.

Important corollary: when normalizing per-type chrome from `/[0.04]` to
`/[0.08]`, the spec must verify the per-type COLORS stay as they are. We are
doubling the alpha, not changing the hue. testimony stays amber, question
stays cyan, discussion stays violet, encouragement stays rose.

### D4 — Geometry: `rounded-3xl` is the FrostedCard default; never `rounded-2xl` in 5.5 migration

Every FrostedCard composition in 5.5's migration must use `rounded-3xl` (or
rely on FrostedCard's own default radius, which per R7 is expected to be
`rounded-3xl`). The deprecated `rounded-2xl` default is canonical-out. Test
assertions verify computed `border-radius` of `24px`, not `16px`.

### D5 — Atmospheric layering: one continuous BackgroundCanvas at root

Prayer Wall already inherits BackgroundCanvas at root from Spec 14 Step 6.
5.5 does not modify that. What 5.5 ensures is that no per-section glow
background, no per-card glow overlay, no inline atmospheric treatment exists
on any Prayer Wall surface. The atmosphere is the canvas; the cards sit on
the canvas at canonical opacity. Anything else would re-introduce the kind
of layered glow that the Visual Rollout retired.

### D6 — Gradient typography stays reserved

Daily Hub uses gradient text on the wordmark and one anchor word in heroes.
It does not use gradient text on body content, card titles, or buttons.
5.5 must not introduce gradient text on any Prayer Wall surface beyond what
already exists in the hero treatment (Spec 14 Step 8 finalized the
PrayerWallHero typography). Specifically, do not migrate the per-type accent
into gradient text on card titles. That would cheapen the gradient.

### D7 — Empty states: `<FeatureEmptyState>` everywhere, no exceptions

The three "not found" cards (PrayerWallProfile L214, PrayerDetail L330,
PrayerWallProfile L412 if applicable) migrate to `<FeatureEmptyState>`. The
canonical FrostedCard treatment under FeatureEmptyState's hood is whatever
the primitive chooses; the migration site does not concern itself with
internal styling, only with consumption.

### D8 — Per-type accent on PrayerCard: className overlay, not variant="accent"

PrayerCard's current pattern is `<FrostedCard variant="default"
className={cn(getPerTypeChromeClass(prayer.postType), ...)}>`. 5.5
preserves this composition shape and normalizes the overlay opacities to
canonical. The variant stays `default` for all feed cards; the per-type
class string layered on top provides the type-specific tint.

The alternative (using `variant="accent"` for non-`prayer_request` types
with per-type color overrides) was considered and rejected. Reason: saturating
the feed with `variant="accent"` (which has its own background and border
treatment at canonical violet opacity) would make every non-prayer-request
card visually compete with whichever card is the true anchor. The current
composition pattern is correct; only the opacities are wrong. 5.5 fixes the
opacities and lets the composition stand.

Specifically, the canonical post-Spec-5.5 `post-type-chrome.ts` should read
(plan-time CC confirms exact border opacity from the catalog; canonical for
borders is `/[0.12]` per 09-design-system.md):

```ts
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/[0.12] bg-amber-500/[0.08]',
  question: 'border-cyan-200/[0.12] bg-cyan-500/[0.08]',
  discussion: 'border-violet-200/[0.12] bg-violet-500/[0.08]',
  encouragement: 'border-rose-200/[0.12] bg-rose-500/[0.08]',
}
```

Plan-time CC verifies that `border-{color}-200/[0.12]` is the canonical
per-type border treatment per the Catalog and adjusts if the Catalog's per-
type border opacity is different. The `/[0.08]` background opacity is
canonical and fixed by 09-design-system.md.

### D9 — Bio textarea: canonical violet textarea glow pattern; single-line inputs defer to plan-time recon

The bio textarea on `PrayerWallDashboard.tsx` L418 migrates to the canonical
violet textarea glow pattern documented in 09-design-system.md as the
canonical replacement for "cyan/purple textarea glow border" deprecation:

```
shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
border-violet-400/30
bg-white/[0.04]
```

This matches Daily Hub's Pray/Journal textareas, which are the canonical
textarea reference per the design system rules.

Single-line inputs (display name at L381) do not have an obvious canonical
analog. Plan-time CC catalogs Daily Hub's input chrome (if any single-line
input exists in Daily Hub source) and the spec adopts whatever pattern is
canonical. If Daily Hub has no single-line input canonical, plan-time CC
proposes an input-appropriate adaptation of the textarea pattern (lighter
shadow, same border treatment, same background) and the spec records this as
intentional new canonical pattern. This proposal triggers Eric review at
brief / spec review time.

### D10 — "Share Something" hero CTA: defer to plan-time recon for migration path

The "Share Something" hero CTA at `pages/PrayerWall.tsx:822, 838` currently
uses inline `backdrop-blur` frosted chrome. Three viable migration paths
exist; the right one depends on what the codebase actually offers, which
plan-time CC verifies:

1. **`<Button variant="frosted">`** if a frosted Button variant exists in the
   codebase
2. **`<FrostedCard as="button">`** if FrostedCard accepts an `as` prop
3. **Thin `<button>` with FrostedCard's default variant classes applied
   directly** if neither (1) nor (2) is available

Plan-time CC determines path 1, 2, or 3 based on the actual codebase state.
The migration target inherits the canonical default-variant FrostedCard
chrome with appropriate button affordances (hover state, focus ring, click
handler). The visual treatment matches feed cards at default variant; the
button affordance is layered on top via interaction state classes
(hover:bg-white/[0.10], focus-visible:ring-violet-400/60, etc.).

Whichever path resolves, the spec encodes the exact migration in Section 10
(Files to Modify).

### D11 — Destructive actions use muted treatment

Any destructive action button rendered on a Prayer Wall surface (Report,
Block, Delete prayer, Delete account) uses the canonical muted destructive
pattern from 09-design-system.md:

```
bg-red-950/30 border-red-500/40
```

The saturated `bg-red-700` / `bg-red-800` is canonical-out. Plan-time CC
greps the four pages files for any destructive button patterns and migrates
each one. The handoff author did not verify the exact destructive button
sites; plan-time CC catalogs them.

### D12 — `post-type-chrome.ts` comment block reversal

The comment block at the top of `frontend/src/constants/post-type-chrome.ts`
must be updated to reverse the 5.1 W8 directive. Proposed new comment block
(plan-time CC may revise wording but the substance is fixed):

```ts
/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides
 * the per-type border and background tint at canonical Visual Rollout
 * opacities (/[0.12] borders, /[0.08] backgrounds).
 *
 * Spec 5.5 (2026-05-??) normalized these opacities from the deprecated
 * /[0.04] backgrounds and /10 borders that Spec 5.1 W8 preserved during
 * the FrostedCard migration. The 5.1 W8 directive ("opacities NOT to be
 * normalized") was a scoping decision specific to that migration and is
 * reversed here. Canonical opacities are documented in
 * .claude/rules/09-design-system.md § Deprecated Patterns.
 *
 * Per-type COLORS (amber for testimony, cyan for question, violet for
 * discussion, rose for encouragement) are intentional and not affected
 * by the opacity normalization.
 */
```

This comment block is the load-bearing artifact of W-OVERRIDE-5.1. It exists
specifically so that a future engineer reading `post-type-chrome.ts` does
not misinterpret the canonical opacities as a 5.5 mistake and revert them
toward the 5.1 W8 freeze.

### D13 — Manual visual audit is the final gate

The "feels like Daily Hub" acceptance criterion is non-quantifiable. The
spec's structure makes it tractable by exhaustively enumerating surfaces
and canonical targets; the manual audit confirms that the rendered result
reads as one product, not two. Eric performs the audit by loading Daily Hub
and Prayer Wall side-by-side at 1440px and 375px and confirming visual
unity. If any surface reads as "off," that surface escalates to MAX (per
Section 2 override moments).

---

## 8. Watch-fors

### W-OVERRIDE-5.1 — Load-bearing reversal of Spec 5.1 W8

**This is the central correction of 5.5.** Spec 5.1 W8 directed preservation
of inline class strings during the FrostedCard migration to avoid visual
change. This was a mistake — it froze the deprecated Round-2-era opacity
values (`/[0.04]` backgrounds, `/10` borders) in the canonical constants
file. 5.5 reverses W8:

- Opacity values MUST be normalized to canonical Visual Rollout tiers
- The "Opacities are NOT to be normalized" comment in `post-type-chrome.ts`
  MUST be replaced with the D12 comment block
- Visual change is the GOAL of 5.5, not a regression
- Any preservation of deprecated opacities under a "we shipped 5.1 with
  these" rationale is the rationale that 5.5 explicitly reverses

When in conflict, W-OVERRIDE-5.1 wins over any 5.1-era directive. The spec
records this clearly so execute-time CC does not encounter a perceived
conflict.

### W1 — Branch discipline

Stay on `forums-wave-continued`. Never run git mutations. See Section 1.

### W2 — No backend changes in 5.5

5.5 is pure-frontend visual migration. Do not touch
`backend/src/main/java/` or any backend resource file. Do not touch
database changelogs. Do not propose backend changes as part of 5.5.

### W3 — No edits to rules files in 5.5

5.5 consumes `.claude/rules/09-design-system.md` and any other rules files;
it does not write to them. If pattern documentation drift is discovered
during 5.5, surface as a follow-up issue. Do not fold rule edits into 5.5.

### W4 — npm not pnpm; Maven not Gradle

This project uses npm for the frontend and Maven for the backend. Do not
introduce pnpm syntax in scripts or documentation. Do not introduce Gradle
syntax. (5.5 is frontend-only so Maven is unlikely to come up, but if a
backend reference is needed in passing, use Maven syntax.)

### W5 — Single quotes throughout TypeScript and shell

Project convention. No exceptions in 5.5 deliverables.

### W6 — Test convention: `__tests__/` colocated with source

New tests live in `__tests__/` directories adjacent to the source file under
test. Existing test layout follows this convention; 5.5 preserves it.

### W7 — No new dependencies

Migration uses existing primitives (FrostedCard, FeatureEmptyState) and
existing utilities (`cn`, Tailwind classes). Do not add new npm packages,
new TypeScript dependencies, or new internal utilities.

### W8 — FrostedCard composition: `variant` prop + `className` overlay

Every FrostedCard use in the 5.5 migration follows the composition pattern:
`<FrostedCard variant="..." className={cn(...)}>`. Never inline raw
`bg-white/[0.0X]` strings on a `<div>` to simulate frosted chrome. The
primitive is the only entry point.

### W9 — Canonical opacities: `/[0.08]` backgrounds, `/[0.12]` borders, `/70` accent borders

Per the canonical Deprecated Patterns table (handoff Section 5.F):

- Default tier background: `bg-white/[0.07]` (FrostedCard variant="default"
  provides this)
- Accent tier background: `bg-violet-500/[0.08]` (FrostedCard variant="accent")
- Subdued tier background: `bg-white/[0.05]` (FrostedCard variant="subdued")
- Per-type accent background: `bg-{color}-500/[0.08]` (overlay via className)
- Decorative borders: `border-white/[0.12]`
- Per-type accent borders: `border-{color}-200/[0.12]` (overlay via
  className; plan-time CC confirms exact opacity from Catalog)
- Accent tier border: `border-violet-400/70`

Deprecated values (`/[0.04]` backgrounds, `/10` borders, `/45` accent borders)
do not appear in 5.5 deliverables.

### W10 — `rounded-3xl` geometry; never `rounded-2xl` as default

Every FrostedCard composition uses `rounded-3xl` (or relies on FrostedCard's
own canonical default radius). The deprecated `rounded-2xl` default radius
is not reintroduced anywhere.

### W11 — `<FeatureEmptyState>` for empty states; never roll-own "not found" cards

The three "not found" cards listed in R2 migrate to FeatureEmptyState. Any
additional empty state encountered by plan-time CC's R14 recon also migrates
to FeatureEmptyState. Rolls-own `rounded-2xl border border-white/10 bg-white/[0.06]`
"not found" cards are canonical-out.

### W12 — Gradient typography stays reserved

Do not introduce gradient text on any new Prayer Wall surface. The
PrayerWallHero hero treatment (post-Spec-14) is the only gradient
appearance on Prayer Wall. Specifically: per-type accent does NOT manifest
as gradient text on card titles. See D6.

### W13 — Muted destructive: `bg-red-950/30 border-red-500/40`

Any destructive button on a Prayer Wall surface uses the muted treatment.
Saturated `bg-red-700` / `bg-red-800` is canonical-out. See D11.

### W14 — Don't preserve deprecated opacities under any rationale

If execute-time CC encounters source where the deprecated opacity "looks
right" or "matches the rest of the file," normalize anyway. The rest of
the file is being migrated in the same spec; pre-migration consistency is
not a constraint. The W-OVERRIDE-5.1 directive supersedes any local
consistency argument.

### W15 — All visual changes runtime-verified

`/verify-with-playwright` must use computed style assertions, not just
className grep. A class string can be present in source but overridden by
specificity; only computed style verifies the runtime treatment. Section 3
defines the assertion strategy; Section 9 defines the test predicates.

### W16 — Per-type ACCENT OPACITIES normalize; per-type COLORS do not

testimony stays amber, question stays cyan, discussion stays violet,
encouragement stays rose. The migration doubles the alpha (and adjusts
borders) without changing hue. Plan-time CC verifies the post-Spec-5.5
PER_TYPE_CHROME table matches D8.

### W17 — `prayer_request` stays untinted (no overlay)

`prayer_request` is the "neutral" default type. It does not receive a
per-type chrome overlay. PER_TYPE_CHROME.prayer_request remains the empty
string. The PrayerCard composition for prayer_request type renders as
`<FrostedCard variant="default">` with no className overlay — canonical
bg-white/[0.07] only.

### W18 — Comment block in `post-type-chrome.ts` must be updated

The current comment block contains the 5.1 W8 directive. 5.5 replaces it
with the D12 comment block. Leaving the old comment block in place is a
failure mode; future engineers reading `post-type-chrome.ts` must not
encounter the W8 directive after 5.5 ships.

### W19 — Tests in `__tests__/PrayerCard.test.tsx` asserting `/[0.04]` opacities update

Existing tests that assert the deprecated opacities (if any exist) must be
updated to assert canonical opacities. This is intentional, not a test
regression. Plan-time CC reads PrayerCard.test.tsx to enumerate assertions
that need updating.

### W20 — Tests assert FeatureEmptyState presence on migrated empty-state surfaces

New tests verify that the three migrated empty states render
`<FeatureEmptyState>` (or whatever DOM signature it produces). See Section 9.

### W21 — D10 resolution requires plan-time recon

The "Share Something" hero CTA migration path (path 1, 2, or 3 in D10) is
not determined by the brief. Plan-time CC reads PrayerWallHero,
codebase Button variants, and FrostedCard's `as` prop support to resolve.
Do not migrate the CTA until D10 resolves at plan time. Treat any execute-
time uncertainty as a halt condition; surface to Eric.

### W22 — Don't migrate non-Prayer-Wall surfaces in 5.5

Daily Hub, Bible, Music, Local Support, Ask, Grow, Routines, Homepage,
Landing — all out of scope. If plan-time CC's grep surfaces deprecated
patterns on those surfaces, log as a follow-up issue and do not fold into
5.5.

### W23 — Don't normalize third-party input chrome

Avatar uploader iframes, third-party widget chrome, embedded Spotify
players, etc. are not Worship Room-authored chrome and are not subject to
canonical opacity normalization. Plan-time CC distinguishes Worship-Room-
authored from third-party-rendered.

### W24 — Don't refactor Spec 5.1's `<FrostedCard>` migrations inside `components/prayer-wall/`

5.1 migrated the inline frosted patterns inside `components/prayer-wall/`.
Those migrations are correct in shape (FrostedCard composition); they are
wrong in opacity (5.1 W8 freeze). 5.5 normalizes the opacities via the
`post-type-chrome.ts` constants update — not by re-migrating the components.
The components consume the constants; updating the constants updates the
components.

If plan-time CC's R14 grep surfaces additional inline frosted patterns
inside `components/prayer-wall/` that 5.1 missed (i.e., not in the per-type
chrome overlay path), those CAN be migrated in 5.5 as scope-creep
authorized by Eric. Log each one explicitly in the plan's recon section.

### W25 — Spec-tracker update is Eric's

Eric flips ⬜→✅ in `_forums_master_plan/spec-tracker.md` after the merge
lands and the manual visual audit confirms "feels like Daily Hub." The spec
must not modify spec-tracker.md as part of execution. The plan must not
modify spec-tracker.md as part of execution. Eric handles the tracker
manually.

### W26 — Phase 5 cutover checklist is a 5.5 deliverable

The master plan AC includes "Phase 5 cutover checklist completed." Plan-
time CC produces a Phase 5 cutover checklist as part of the plan
deliverables. The checklist enumerates what counts as "Phase 5 complete"
post-5.5 (all Phase 5 specs shipped, manual audit confirmed, tracker
updated). The checklist is a markdown artifact saved to
`_plans/forums/spec-5-5-phase5-cutover.md` or similar; plan-time CC
proposes the exact path.

### W27 — Don't bundle the `frontend/tests/playwright-verify.spec.ts` cleanup with 5.5

A separate unresolved issue exists about `frontend/tests/playwright-verify.spec.ts`
being a Spec 11A leftover. That cleanup is not 5.5's concern. If
verify-with-playwright runs during 5.5 verification and writes to this path,
the path must be restored after the run (per the protocol that closed Spec 14).
5.5 does not delete or permanently modify this file.

---

## 9. Test specifications

The spec must specify the following test changes. Counts are approximate;
plan-time CC may refine based on actual file state.

### Test 1 — `post-type-chrome.test.ts` (NEW)

File: `frontend/src/constants/__tests__/post-type-chrome.test.ts`

New test file. Locks the canonical opacities in the constants:

- `PER_TYPE_CHROME.prayer_request === ''`
- `PER_TYPE_CHROME.testimony.includes('bg-amber-500/[0.08]')`
- `PER_TYPE_CHROME.testimony.includes('border-amber-200/[0.12]')` (or the
  canonical border opacity per the Catalog)
- Same for question / cyan, discussion / violet, encouragement / rose

These tests will fail if a future engineer accidentally reverts the
opacities toward `/[0.04]`. The test file is the canonical regression net
for the W-OVERRIDE-5.1 reversal.

### Test 2 — `__tests__/PrayerCard.test.tsx` (MODIFIED)

Existing test file. Updates:

- Any existing assertion against `bg-{color}-500/[0.04]` updates to
  `bg-{color}-500/[0.08]`
- Any existing assertion against `border-{color}-200/10` updates to
  `border-{color}-200/[0.12]` (or the canonical border opacity per the
  Catalog)
- Add a new assertion: computed `border-radius` of the rendered card is
  `24px` (canonical `rounded-3xl`), not `16px` (deprecated `rounded-2xl`)

Plan-time CC reads PrayerCard.test.tsx and enumerates the exact assertion
sites that need updating.

### Test 3 — `pages/__tests__/PrayerWallDashboard.test.tsx` (MODIFIED or NEW)

If a test file exists, update it. If not, create it.

Assertions:

- Display name input renders with canonical input chrome (per D9 plan-time
  resolution)
- Bio textarea renders with canonical violet textarea glow (computed
  `box-shadow` contains canonical violet RGB values; computed
  `border-color` matches `violet-400/30`)
- Comment list item card at L600 renders as `<FrostedCard variant="default">`
  (DOM presence assertion; computed background-color matches canonical)
- Notification preferences card at L722 renders as `<FrostedCard
  variant="default">`
- User header / stats section renders as `<FrostedCard variant="accent">`
  (D2 Tier 1)
- Empty state for "no data" cases (if any) renders as `<FeatureEmptyState>`

### Test 4 — `pages/__tests__/PrayerDetail.test.tsx` (MODIFIED or NEW)

Assertions:

- Active prayer card renders as `<FrostedCard variant="accent">` (D2 Tier 1)
- Comment list items render as `<FrostedCard variant="default">` (D2 Tier 2)
- "Prayer not found" empty state at L330 renders as `<FeatureEmptyState>`,
  not the deprecated rolls-own `rounded-xl border border-white/10` card

### Test 5 — `pages/__tests__/PrayerWallProfile.test.tsx` (MODIFIED)

Assertions:

- User header card renders as `<FrostedCard variant="accent">` (D2 Tier 1)
- Prayer history list cards render as `<FrostedCard variant="default">` (D2
  Tier 2)
- "User not found" empty state at L214 renders as `<FeatureEmptyState>`
- Comment list items at L412 render as `<FrostedCard variant="default">`,
  not the deprecated rolls-own card

### Test 6 — `pages/__tests__/PrayerWall.test.tsx` (MODIFIED)

Assertions:

- "Share Something" hero CTA renders per D10 plan-time resolution (the test
  predicate depends on which migration path resolves)
- Feed cards render with per-type chrome overlays at canonical opacities
  (integration test: load feed with one of each post type, assert each
  card's computed background-color matches the canonical composite)
- Empty feed state (no prayers) renders as `<FeatureEmptyState>`

### Net test count delta

Approximate: +25 to +35 new test assertions, ~10 assertion updates, ~2 new
test files. Plan-time CC refines this based on actual file state and
produces the exact delta in the plan deliverables.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### CREATE

- `frontend/src/constants/__tests__/post-type-chrome.test.ts` — new test
  file locking canonical opacities
- Possibly `frontend/src/pages/__tests__/PrayerWall.test.tsx` if it does not
  already exist; plan-time CC confirms

### MODIFY

- `frontend/src/constants/post-type-chrome.ts` — canonical opacities;
  comment block reversal per D12
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` —
  canonical opacity assertions; `rounded-3xl` assertion
- `frontend/src/pages/PrayerWall.tsx` — "Share Something" CTA migration per
  D10 resolution; feed card chrome confirmation (no direct edits if
  PrayerCard already consumes canonical constants); empty-state migration
  if applicable
- `frontend/src/pages/PrayerWallDashboard.tsx` — four inline frosted
  patterns (L381, L418, L600, L722) migrated; bio textarea → canonical
  violet glow; single-line input → canonical input pattern per D9; user
  header → Tier 1 accent; sections below → Tier 2 default
- `frontend/src/pages/PrayerDetail.tsx` — "Prayer not found" empty state at
  L330 → FeatureEmptyState; main prayer card → Tier 1 accent
- `frontend/src/pages/PrayerWallProfile.tsx` — "User not found" empty state
  at L214 → FeatureEmptyState; comment list items at L412 → FrostedCard;
  user header → Tier 1 accent; prayer history → Tier 2 default
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` — Test 3
  assertions
- `frontend/src/pages/__tests__/PrayerDetail.test.tsx` — Test 4 assertions
- `frontend/src/pages/__tests__/PrayerWallProfile.test.tsx` — Test 5
  assertions

Plus any test file MODIFY needed for the Test 6 PrayerWall.test.tsx
assertions if the file already exists.

### NOT TO MODIFY

- `.claude/rules/09-design-system.md` — 5.5 consumes; does not write
- Any other `.claude/rules/*.md` file
- `_forums_master_plan/spec-tracker.md` — Eric updates manually post-merge
- `_forums_master_plan/round3-master-plan.md` — no master plan edits in 5.5
- Backend (any `backend/src/main/java/` file, any database changelog, any
  `pom.xml`, any backend resource file)
- `frontend/src/pages/DailyHub.tsx` — read-only at plan time; do not
  modify
- `frontend/src/components/daily/*` — read-only at plan time; do not
  modify
- `frontend/src/components/PageHero.tsx` — read-only at plan time
- `frontend/src/components/SongPickSection.tsx` — read-only at plan time
- `frontend/src/components/homepage/FrostedCard.tsx` — read-only; do not
  modify the primitive
- `frontend/src/components/FeatureEmptyState.tsx` (or wherever the
  primitive lives) — read-only
- Any test file outside the four `__tests__/` directories enumerated above
- `_specs/forums/spec-5-1.md` — historical record; do not edit
- `_specs/forums/spec-5-3.md` — historical record
- `_specs/forums/spec-5-4.md` — separate spec; do not fold into 5.5
- `frontend/tests/playwright-verify.spec.ts` — Spec 11A leftover; do not
  delete; restore after verify-with-playwright runs per W27

### DELETE

None. 5.5 does not delete files. All migrations are replacements in place.

---

## 11. Acceptance criteria

The master plan AC list (verbatim, eight items):

- [ ] No `Caveat` font on Prayer Wall headings
- [ ] No `BackgroundSquiggle` on Prayer Wall
- [ ] No per-section `GlowBackground` on Prayer Wall
- [ ] No `animate-glow-pulse` on Prayer Wall textareas
- [ ] No `font-serif italic` on Prayer Wall labels
- [ ] No cyan textarea glow border
- [ ] No soft-shadow 8px-radius cards on dark backgrounds
- [ ] No `line-clamp-3` on Prayer Wall card descriptions

Per R5, the first seven of these are already satisfied by absence as of
2026-05-11. Plan-time CC re-verifies with comprehensive grep and the spec
records the evidence column.

Brief expansion AC (Section 4 MPD-1):

- [ ] All four per-type accent backgrounds in `post-type-chrome.ts` use
  canonical `/[0.08]` opacity
- [ ] All four per-type accent borders in `post-type-chrome.ts` use
  canonical border opacity per the Catalog (likely `/[0.12]`)
- [ ] The `post-type-chrome.ts` comment block is replaced per D12; the 5.1
  W8 reference is removed
- [ ] Eight pages-level inline frosted patterns from R2 migrated to
  `<FrostedCard>` with canonical variants
- [ ] Three "not found" empty states migrated to `<FeatureEmptyState>`:
  PrayerDetail L330, PrayerWallProfile L214, plus any additional surfaced
  by plan-time CC's R14 recon
- [ ] Bio textarea on PrayerWallDashboard L418 migrated to canonical violet
  textarea glow pattern
- [ ] Single-line inputs on PrayerWallDashboard L381 (and any other
  surfaced by plan-time CC) migrated to canonical input chrome per D9
- [ ] "Share Something" hero CTA at PrayerWall.tsx L822/L838 migrated per
  D10 plan-time resolution
- [ ] Per-route Tier 1 / Tier 2 / Tier 3 reads match D2
- [ ] All FrostedCard compositions use `variant` prop + `className` overlay
  (W8 enforcement)
- [ ] All FrostedCard compositions render `rounded-3xl` (computed 24px,
  per D4)
- [ ] Destructive action buttons (Report, Block, Delete) use muted
  treatment per D11
- [ ] Test deltas per Section 9 land (+25 to +35 new assertions, ~10
  updates, 2 new test files)
- [ ] `/code-review` passes with zero Blocker / zero Major findings
- [ ] `/verify-with-playwright` passes on all four Prayer Wall routes plus
  Daily Hub regression at all 6 breakpoints (375, 428, 768, 1024, 1440,
  1920)
- [ ] Daily Hub regression screenshots show zero meaningful drift from
  pre-5.5 baseline
- [ ] Phase 5 cutover checklist produced as plan deliverable (per W26)

Manual audit AC:

- [ ] Eric loads `/daily` and `/prayer-wall` side-by-side at 1440px and at
  375px and confirms visual unity. Prayer Wall reads as the same product
  as Daily Hub.
- [ ] Eric loads `/daily` and `/prayer-wall/:id` side-by-side and confirms
  the prayer detail page reads as a curated single-anchor surface (Tier 1
  accent identifies the main content; comments flow below at Tier 2
  default).
- [ ] Eric loads `/daily` and `/prayer-wall/dashboard` side-by-side and
  confirms the dashboard reads as a coherent settings surface, not a
  patchwork of inline frosted boxes.
- [ ] Eric loads `/daily` and `/prayer-wall/profile/:userId` side-by-side
  and confirms the profile reads similarly.

If any manual audit surface fails the "feels like Daily Hub" test, escalate
to MAX per Section 2 override moments.

---

## 12. Out of scope

Explicit deferrals — do not fold any of these into 5.5:

- **Backend changes.** No backend code, no database changelog, no resource
  file, no `pom.xml`, no controller, no service, no repository. 5.5 is
  pure-frontend.
- **New features.** 5.5 does not introduce new Prayer Wall functionality
  (no new post type, no new reaction, no new moderation flow, no new
  notification, no new badge, no new analytics event). Visual unification
  only.
- **Design system documentation edits.** 5.5 does not edit
  `09-design-system.md` or any other rules file. Any pattern documentation
  drift surfaces as a follow-up issue.
- **Non-Prayer-Wall surfaces.** Daily Hub, Bible, Music, Local Support,
  Ask, Grow, Routines, Homepage, Landing, Auth Modal, etc. — out of scope.
  Even if plan-time grep finds deprecated patterns on those surfaces, they
  are logged as follow-up issues, not folded into 5.5.
- **Daily Hub source modifications.** Daily Hub is the canonical reference;
  it is read-only at plan time. 5.5 does not change Daily Hub.
- **New dependencies.** No new npm packages, no new TypeScript libraries,
  no new internal utilities. Migration uses existing primitives.
- **Animation token migration.** That is Spec 5.4. 5.5 inherits 5.4's
  shipped token system but does not re-do or extend it.
- **Routing changes.** No new routes, no route renames, no redirects.
- **Test infrastructure changes.** No new test runners, no Vitest config
  changes, no new test utilities (use existing `cn`, RTL, etc.).
- **Permission / RBAC changes.** No changes to who can see what; no auth
  flow changes; no JWT updates.
- **Performance optimizations.** 5.5 may reduce render cost as a side
  effect of consolidating chrome via primitives, but performance is not a
  goal. Do not introduce React.memo, useMemo, useCallback, lazy imports,
  or virtualization as part of 5.5.
- **Accessibility audits.** 5.3 already added the axe-core dashboard
  route. 5.5 inherits whatever axe coverage exists; it does not extend
  accessibility infrastructure. (Per-surface a11y assertions that fall out
  naturally from FeatureEmptyState consumption are fine; do not add
  net-new a11y test files.)
- **Internationalization.** 5.5 does not localize strings, does not extract
  copy to a localization file, does not introduce i18n infrastructure.
- **Cleanup of `frontend/tests/playwright-verify.spec.ts`.** That file is a
  Spec 11A leftover; cleanup is not 5.5's concern. See W27.

---

## 13. Brand voice quick reference

The Worship Room voice is empathetic, restrained, beautiful, not
transactional. Specifically relevant for 5.5:

- **AuthModal subtitle pattern (if 5.5 surfaces any AuthModal copy):**
  Sentence-case subtitle without trailing period. "Your draft is safe — we'll
  bring it back after." not "Your draft is safe — we'll bring it back
  after." (with period). Per 09-design-system.md deprecation row.

- **Tinted card naming:** When PR descriptions or commit messages
  reference per-type cards, use the type names without religious literalism:
  "testimony", "question", "discussion", "encouragement", "prayer request".
  Not "prayer card with amber glow blessing" or similar.

- **Surface naming:** "Prayer Wall" capitalized; "Daily Hub" capitalized;
  "Profile" capitalized; "Dashboard" capitalized. Route paths lowercase
  with hyphens.

- **Test descriptions:** Calm and behavioral. "renders the main prayer
  card as Tier 1 accent" not "POWERFUL Tier 1 accent for the prayer card!"
  or "prayer card glows with Holy Spirit accent." Brand voice lives in
  test descriptions too.

- **Comment block tone (D12):** Matter-of-fact, citing the spec and rules
  file, no apology, no praise. The comment exists to inform future
  engineers, not to celebrate the change.

---

## 14. Tier rationale

### Why xHigh (extended)

5.5 has three rare properties together:

1. **Brand-defining acceptance criterion.** "Prayer Wall feels like Daily
   Hub" is a curator's judgment, not a checklist. The spec must structure
   the work to make that judgment tractable, which means exhaustive surface
   enumeration plus exhaustive canonical pattern cataloging. xHigh.

2. **High coupling to a separate canonical source.** Daily Hub is the
   reference; Prayer Wall is the target. Every migration decision
   references the Daily Hub Canonical Pattern Catalog, which itself
   requires end-to-end source reading at plan time. This dual-source
   dependency increases plan-time work and reduces execute-time
   determinism. xHigh.

3. **Reverses a shipped directive.** 5.1 W8 froze opacities; a comment
   block in the canonical constants file codifies the freeze. 5.5 reverses
   both the values and the comment. Without careful framing, execute-time
   CC encounters apparent contradictions ("the comment says NOT to
   normalize; the spec says normalize"). The W-OVERRIDE-5.1 directive
   exists specifically to defuse this, but the directive itself is load-
   bearing — getting it wrong corrupts the spec. xHigh.

### Override moments triggering MAX

Re-stated from Section 2 for visibility:

1. Plan-time CC's Daily Hub Canonical Pattern Catalog reveals a canonical
   pattern that contradicts a D-decision. Advisor re-ranks the D-decision.

2. Spec-time recon finds a Prayer Wall surface not enumerated in this
   brief that requires its own tier read. Advisor decides scope.

3. Plan-time CC produces a Catalog that fundamentally changes the Tier 1 /
   Tier 2 / Tier 3 understanding. Brief should bend; advisor formalizes
   the bend.

4. Execute-time CC finds a surface where canonical opacity normalization
   produces a visual that Eric judges worse not better. Advisor decides
   whether to keep canonical or document intentional drift.

5. Any divergence from canonical opacity values that execute-time CC
   believes is warranted on a specific surface. Surface to Eric; do not
   silently preserve deprecated values.

6. Eric's manual audit at the end concludes "Prayer Wall does not feel
   like Daily Hub" on one or more surfaces. Advisor diagnoses the gap and
   either scope-extends 5.5 (uncommon; 5.5 should not balloon) or
   opens a follow-up spec.

---

## 15. Recommended planner instruction

The exact prompt for `/spec-forums spec-5-5` that Eric pastes into Claude
Code:

```
/spec-forums spec-5-5

Brief: _plans/forums/spec-5-5-brief.md

Before writing the spec, perform the mandatory plan-time recon phase
defined in Section 5 R9 of the brief: produce the Daily Hub Canonical
Pattern Catalog by reading the following files end-to-end:

  - frontend/src/pages/DailyHub.tsx
  - frontend/src/components/daily/PrayTabContent.tsx
  - frontend/src/components/SongPickSection.tsx
  - frontend/src/components/homepage/FrostedCard.tsx
  - frontend/src/components/PageHero.tsx
  - _plans/reconciliation/2026-05-07-post-rollout-audit.md

Also read the following for ground-truth verification of the brief's R7,
R8, R10, R11, R12, R13, R14:

  - frontend/src/components/homepage/FrostedCard.tsx (R7 variant CSS)
  - frontend/src/components/FeatureEmptyState.tsx or equivalent (R8 props)
  - frontend/src/components/prayer-wall/PrayerCard.tsx (R10 composition)
  - frontend/src/components/prayer-wall/PrayerWallHero.tsx (R11 action prop)
  - frontend/src/components/Button.tsx or ui/Button.tsx (R12 variants)
  - whatever Daily Hub source surfaces a single-line input (R13 input chrome)
  - comprehensive grep across frontend/src/components/prayer-wall/ and
    frontend/src/pages/Prayer* per R14 enumeration

The Daily Hub Canonical Pattern Catalog goes into the spec as Section 5
(after the standard 1-4 sections, before the migration plan). Every
migration decision in subsequent sections references a catalog item.

If any VERIFIED finding in the brief turns out to be wrong on disk at plan
time, record an R-OVR entry in the spec's recon section. The brief's
design intent (D-decisions, W-watch-fors) is preserved verbatim; only the
ground truth is corrected.

Spec output path: _specs/forums/spec-5-5.md
Spec length expectation: 1400-1800 lines (matches 5.1's structure, slightly
larger given the visual unification scope and Catalog prefix)

Conventions:
- Stay on forums-wave-continued (long-lived branch; never switch)
- No git mutations from Claude Code at any phase
- Single quotes throughout TypeScript and shell
- Tests in __tests__/ colocated with source
- npm not pnpm; Maven not Gradle (5.5 is frontend-only)
- No new dependencies
- Spec-tracker update is Eric's manual responsibility post-merge

Prerequisites confirmation (block on these before writing the spec):
- 5.4 (Animation Token Migration) ⬜ — must ship before 5.5 execution.
  Confirm 5.4 status with Eric before /spec-forums proceeds. If 5.4 is
  not yet shipped, /spec-forums may still produce the spec (specs are
  serializable separately from execution); execute-time CC blocks until
  5.4 lands.
- FrostedCard variants (accent | default | subdued) verified at plan time
- FeatureEmptyState props verified at plan time
- Existing Button variant set verified at plan time

Tier: xHigh. Override moments per brief Section 2 / Section 14.
```

---

## 16. Verification handoff

After `/spec-forums spec-5-5` produces the spec, the pipeline continues:

1. **`/plan-forums _specs/forums/spec-5-5.md`** — Claude Code produces the
   detailed plan. Plan output path: `_plans/forums/spec-5-5.md`. Plan
   includes the Phase 5 cutover checklist as a deliverable per W26.

2. **Eric reviews the plan.** Particular attention to:
   - The Daily Hub Canonical Pattern Catalog (is it complete? does it
     match Eric's mental model of Daily Hub?)
   - The D10 resolution (Share Something CTA migration path 1/2/3)
   - The D9 single-line input resolution (canonical pattern found or
     proposed)
   - The R14 comprehensive grep results (any surfaces beyond the R2
     eight?)
   - The migration list completeness (are there 11+ surface migrations
     enumerated? if fewer than 8, something is missing)

3. **`/execute-plan-forums _plans/forums/spec-5-5.md`** — Claude Code
   executes the plan. Branch: forums-wave-continued. No commits. Per-step
   verification via Playwright probes at each surface change.

4. **`/code-review`** — Claude Code reviews the diff per the standard
   skill protocol. Acceptance criteria from Section 11 are the review
   checklist. Zero Blockers / zero Majors required to advance.

5. **`/verify-with-playwright`** — Claude Code runs the runtime
   verification per Section 3. All scenarios pass; computed style
   assertions all confirm canonical opacities / radii / box-shadows.

6. **Manual audit by Eric.** Per Section 11 manual audit AC. Side-by-side
   `/daily` vs each Prayer Wall route at 1440px and 375px. The "feels like
   Daily Hub" gate ratifies.

7. **Eric commits.** Suggested commit message structure (Eric may refine):

   ```
   spec5.5: prayer wall deprecated pattern purge + visual unification

   - post-type-chrome.ts: opacity normalization /[0.04]→/[0.08]; comment
     block reversal of 5.1 W8
   - 8 pages-level inline frosted patterns migrated to FrostedCard
     (PrayerWallDashboard L381/L418/L600/L722, PrayerDetail L330,
     PrayerWallProfile L214/L412, PrayerWall L822/L838)
   - 3 "not found" empty states migrated to FeatureEmptyState
   - Bio textarea migrated to canonical violet textarea glow
   - Per-route Tier 1 / Tier 2 reads applied per D2
   - Share Something hero CTA migrated per D10 resolution
   - Test deltas: +N new assertions, +M updates, +K new test files
   - Daily Hub Canonical Pattern Catalog produced at plan time and
     consumed throughout the spec

   Spec: _specs/forums/spec-5-5.md
   Plan: _plans/forums/spec-5-5.md
   Brief: _plans/forums/spec-5-5-brief.md
   ```

8. **Eric pushes.** `git push origin forums-wave-continued`.

9. **Eric flips spec-tracker.** `_forums_master_plan/spec-tracker.md` Spec
   5.5 status ⬜→✅ after merge confirmed and manual audit ratified.

10. **Eric considers Phase 5 closure.** If 5.5 is the last open Phase 5
    spec, Eric uses the Phase 5 cutover checklist (W26) to confirm Phase
    5 is fully shipped. Master plan tracker Phase 5 entry reflects
    closure.

### Override moments — escalation paths during verification handoff

- **Spec produces a Catalog item that contradicts a D-decision.** Spec
  records the contradiction in an R-OVR section; advisor reviews; brief is
  not edited (specs are historical); the spec's R-OVR governs execution.

- **Plan finds a surface not in the brief's R2 inventory.** Plan adds the
  surface to the migration list; spec already references R14 as
  authorizing this. No advisor needed unless the surface meaningfully
  changes scope (more than 2-3 additional surfaces).

- **Execute finds a migration where canonical opacity produces a visual
  Eric judges worse.** Execute halts on the specific surface; surfaces
  to Eric; advisor diagnoses. Outcome is either "keep canonical (spec
  stands)" or "document intentional drift in 09-design-system.md as a
  separate follow-up." Execute does not silently preserve deprecated.

- **Verify-with-playwright finds a computed-style mismatch on a migrated
  surface.** Execute returns to the surface and re-migrates; verify
  re-runs. If the mismatch persists across re-migration, advisor
  diagnoses whether the primitive (FrostedCard, FeatureEmptyState) is
  rendering the wrong canonical value — which is a primitive bug, not a
  5.5 bug, and triggers a separate follow-up issue.

- **Manual audit fails "feels like Daily Hub" on one surface.** Advisor
  diagnoses the gap. Options: scope-extend 5.5 (uncommon; 5.5 should not
  balloon), open a follow-up spec, or document the surface as intentional
  Prayer Wall divergence in 09-design-system.md (rare; would weaken the
  visual unification goal).

---

## Prerequisites confirmed (as of 2026-05-11 brief authorship)

- ✅ Branch: forums-wave-continued (long-lived; in active use)
- ✅ Phase 5 status: 5.0 closed, 5.1 shipped (with 5.1 W8 mistake to be
  reversed in 5.5), 5.2 shipped via Spec 14 Step 6, 5.3 closed as no-op,
  5.4 spec written / plan pending
- ⬜ 5.4 (Animation Token Migration) plan pending; must ship before 5.5
  execution begins (spec can be written in parallel; execution blocked)
- ✅ FrostedCard primitive exists at
  `frontend/src/components/homepage/FrostedCard.tsx` with variants
  `accent | default | subdued` (variant CSS verified at plan time per R7)
- ✅ FeatureEmptyState primitive exists and is already in use at
  PrayerWallProfile.tsx L14 / L349 (props verified at plan time per R8)
- ✅ Disk verification of the 8 pages-level inline frosted patterns (R2),
  the post-type-chrome.ts current state (R1), and the absence of
  master-plan-AC deprecated patterns (R5) all completed 2026-05-11 by the
  handoff author
- ⬜ Daily Hub Canonical Pattern Catalog production (R9) — plan-time
  deliverable; not blocking brief authorship
- ⬜ R10, R11, R12, R13, R14 — plan-time deliverables; not blocking brief
  authorship per the R-OVR pattern
- ✅ Conventions confirmed: npm not pnpm, Maven not Gradle (backend
  out-of-scope), single quotes, `__tests__/` colocated, no new
  dependencies, spec-tracker is Eric's, no git mutations from CC, branch
  discipline per Section 1
- ✅ Brief output path: `/Users/eric.champlin/worship-room/_plans/forums/spec-5-5-brief.md`
- ✅ Spec output path: `_specs/forums/spec-5-5.md`
- ✅ Plan output path: `_plans/forums/spec-5-5.md`
- ✅ Tier: xHigh; override-to-MAX moments enumerated in Section 2 / 14

---

**End of brief.**
