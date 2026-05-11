/spec-forums spec-5-3

# Spec 5.3 — 2-Line Heading Treatment

**Master plan ID:** `round3-phase05-spec03-two-line-headings`
**Size:** M
**Risk:** Low (per master plan; bumped to Medium-ish by the CinematicHeroBackground composition concern and brand voice review surface)
**Prerequisites:** 5.1 (FrostedCard Migration) ✅ — master plan says 5.2 but 5.2 already shipped via Spec 14. Practical prereq is 5.1 ✅.
**Tier:** High

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout`
- `git checkout -b`
- `git switch`
- `git switch -c`
- `git branch`
- `git commit`
- `git commit -am`
- `git push`
- `git stash`
- `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

**Note:** 5.3 is small relative to 5.1. Two files modified, two canonical components consumed (PageHero, SectionHeading). The work is mechanical except for two sensitivities: composing the new PageHero usage with Spec 14's CinematicHeroBackground (D2) and brand voice review of eyebrow + headline pairs across dashboard sections (D5, Section 13).

---

## 2. Tier — High

**Why High (not Standard):**

- **CinematicHeroBackground composition with PageHero is the central architectural decision** (D2 / MPD-3). PageHero ships with its own `style={ATMOSPHERIC_HERO_BG}` (radial gradient). PrayerWallHero currently has CinematicHeroBackground (animated atmospheric layer, shipped in Spec 14). These two atmospheric layers can conflict, stack additively, or one can dominate. Standard tier sometimes ships whichever wins and breaks the Spec 14 visual.
- **Brand voice review of eyebrow + headline pairs** on the dashboard is subjective work where Standard tier picks weak copy (cheerleader, gamification, jargon).
- The dashboard section header inventory is unknown until plan recon. Standard tier sometimes ships 2-line treatment on 2 of 5 section headers and considers the migration done.
- **PageHero's API doesn't match the master plan body's `topLine`/`bottomLine` phrasing** (MPD-2). PageHero is `title`/`subtitle`. SectionHeading is `topLine`/`bottomLine`. Standard tier sometimes mixes these up.
- The `scriptWord` prop on PageHero exists for caveat-font emphasis. Spec 14 explicitly cleaned up the `font-script` 'Wall' treatment. 5.3 must NOT reintroduce scriptWord (W3). Standard tier sometimes 'helpfully' adds it.
- Visual regression risk: the 2-line treatment changes vertical rhythm, can shift content below it, can break layout in dashboard.

**Why not xHigh:**

- No new component creation; PageHero and SectionHeading both exist
- No schema, no backend, no novel coordination
- Only 2 files modify
- The architectural patterns are established (PageHero is in use on MonthlyReport and other pages)
- Brief covers all decisions and watch-fors explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC drops CinematicHeroBackground entirely in favor of PageHero's built-in atmospheric (D2 / W2 violation)
- If CC reintroduces `scriptWord` on 'Wall' (W3 violation — Spec 14 explicitly cleaned this up)
- If CC ships dashboard section headers with weak eyebrow copy ('Quick Stats!', 'Your Awesome Badges') — brand voice anti-patterns (W6)
- If CC mixes PageHero and SectionHeading prop APIs (W4)
- If layout shift or vertical rhythm breaks below the migrated headings (W8)
- If `aria-labelledby` chain breaks (W5)

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **PrayerWallHero — page-level hero migrated to PageHero**:
   - The `<h1>Prayer Wall</h1>` is rendered via `<PageHero title='Prayer Wall' subtitle="You're not alone.">` (or equivalent per D1)
   - Title uses GRADIENT_TEXT_STYLE (preserved — PageHero applies the gradient via its own implementation)
   - Subtitle renders below in calm prose (NOT italic, NOT serif — Spec 14 cleanup preserved)
   - 'Prayer Wall' renders with NO scriptWord emphasis on 'Wall' (W3)
   - CinematicHeroBackground still visible behind the hero (W2 / D2)
   - The `action` slot still renders the hero CTA button (per 4.7 chooser entry)
   - composerRef and TooltipCallout still target the same button (4.7 W5 still honored)
   - `aria-labelledby` chain works: `<section aria-labelledby='prayer-wall-heading'>` → `<h1 id='prayer-wall-heading'>` (or whatever PageHero uses, matching the wrapper's aria-labelledby)

2. **PrayerWallDashboard section headers migrated to SectionHeading**:
   - Each section header on `/prayer-wall/dashboard` renders via `<SectionHeading topLine='...' bottomLine='...' />`
   - `topLine` is the smaller eyebrow line
   - `bottomLine` is the larger headline
   - Visual hierarchy: small eyebrow on top, big headline below
   - Eyebrow text is brand-voice-aligned (no exclamations, no gamification, no jargon)
   - Section spacing preserved (no layout shift below)

3. **Visual hierarchy correct** in both contexts:
   - **Page hero (PrayerWallHero/PageHero)**: BIG title on top, SMALL subtitle below — traditional hero hierarchy
   - **Section headers (SectionHeading)**: SMALL eyebrow on top, BIG headline below — the canonical 'eyebrow-over-headline' pattern
   - The two patterns coexist by design; do NOT conflate them

4. **Brand voice on every eyebrow + headline pair**:
   - PrayerWallHero title 'Prayer Wall' — unchanged, plain wordmark
   - PrayerWallHero subtitle "You're not alone." — unchanged, calm assurance
   - Dashboard section eyebrows (per plan recon) — brief-time list of acceptable patterns in Section 13
   - No exclamations, no urgency, no gamification, no comparison

5. **No regression on existing flows**:
   - Hero CTA button still opens chooser (4.7 flow)
   - First-time TooltipCallout still fires on hero button (composerRef preserved)
   - PrayerWall.tsx imports of PrayerWallHero unchanged (PrayerWallHero stays as wrapper per D1)
   - PrayerWallDashboard page sections still render in correct order
   - PrayerWallDashboard data fetching unchanged
   - BackgroundCanvas still wraps all 4 Prayer Wall pages (5.2 ✅)
   - Universal Rule 17 axe-core tests still pass (no new violations)

6. **Mobile responsive** for both hero and dashboard:
   - PageHero on mobile renders title + subtitle without overflow
   - SectionHeading on mobile centers correctly per its `align` prop
   - Eyebrow text doesn't wrap awkwardly on narrow viewports
   - Headline gradient still renders correctly at small sizes

7. **Reduced-motion preference respected**:
   - PageHero's transitions (if any) respect `prefers-reduced-motion`
   - SectionHeading's reveal animations (if any) respect the preference
   - CinematicHeroBackground continues its existing reduced-motion handling

8. **No layout shift below migrated headings**:
   - Composer flow renders at the same vertical offset post-migration
   - QOTD card position unchanged
   - RoomSelector + CategoryFilterBar sticky behavior unchanged (4.8 D5 still works)
   - Dashboard widgets render at same vertical positions post-migration

9. **Dashboard heading count matches recon**:
   - Plan recon enumerates all section headers in PrayerWallDashboard
   - Every single-line heading migrated; nothing missed
   - Brief defers the exact count and eyebrow copy to plan recon (D5)

10. **No code path uses both PageHero AND SectionHeading on the same surface**:
    - PrayerWallHero uses ONLY PageHero (not SectionHeading)
    - Dashboard sections use ONLY SectionHeading (not PageHero)
    - The two components don't compose or nest

Minimum 10 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

Master plan body for 5.3 lives at `_forums_master_plan/round3-master-plan.md` lines ~4664–4684. Several drift items.

### MPD-1 — Prerequisite is 5.1, not 5.2

Master plan body says:

> Prerequisites: 5.2

But 5.2 (BackgroundCanvas at Prayer Wall Root) shipped via Spec 14 on 2026-05-07. The practical prerequisite is **5.1 (FrostedCard Migration)** — the most recent unshipped Phase 5 dependency. Verify in spec-tracker.md before proceeding.

If 5.1 is still ⬜, ship it first. (Should be ✅ by the time you read this.)

### MPD-2 — PageHero API is `title`/`subtitle`, NOT `topLine`/`bottomLine`

Master plan body says:

> Approach: Replace the existing PrayerWallHero heading treatment with the canonical `<PageHero ...`

5.0's catalog (now closed without ceremony) listed:

> Section heading: 2-line `<SectionHeading topLine bottomLine />` from `homepage/SectionHeading.tsx`

**These are TWO DIFFERENT components with TWO DIFFERENT APIs.** Recon confirms:

- **PageHero** at `frontend/src/components/PageHero.tsx`: props are `title`, `subtitle`, `showDivider`, `scriptWord`, `children` (R1)
- **SectionHeading** at `frontend/src/components/homepage/SectionHeading.tsx`: props are `heading` (legacy), `topLine`, `bottomLine`, `tagline`, `align`, `className`, `id` (R2)

**5.3 uses BOTH:**

- **PrayerWallHero** → migrate to use **PageHero** (`title='Prayer Wall'`, `subtitle="You're not alone."`)
- **PrayerWallDashboard section headers** → migrate to use **SectionHeading** (`topLine='<eyebrow>'`, `bottomLine='<headline>'`)

**Don't conflate these.** The page-level hero uses big-over-small (PageHero pattern). The section headers use small-over-big (SectionHeading topLine/bottomLine pattern). Different visual hierarchies, different components, different scales.

### MPD-3 — CinematicHeroBackground composition with PageHero

Master plan body says:

> Approach: Replace the existing PrayerWallHero heading treatment with the canonical `<PageHero ...`

It doesn't address the existing CinematicHeroBackground that Spec 14 shipped inside PrayerWallHero. Recon confirms (R3): PrayerWallHero currently renders:

```tsx
<section aria-labelledby="prayer-wall-heading" className="...">
  <CinematicHeroBackground />
  <h1 id="prayer-wall-heading" style={GRADIENT_TEXT_STYLE}>Prayer Wall</h1>
  <p>You're not alone.</p>
  {action && <div className="...">{action}</div>}
</section>
```

PageHero renders (R1):

```tsx
<section aria-labelledby="page-hero-heading" style={ATMOSPHERIC_HERO_BG}>
  ...
</section>
```

PageHero has its own `style={ATMOSPHERIC_HERO_BG}` (radial-gradient atmospheric). PrayerWallHero has CinematicHeroBackground (animated atmospheric layer from Spec 14). **These are two different atmospheric layers that conflict if both applied to the same section.**

**Decision: PrayerWallHero stays as a thin wrapper, composes PageHero AS A CHILD inside its existing `<section>` with CinematicHeroBackground.** (D2). The post-5.3 file:

```tsx
import type { ReactNode } from 'react'
import { PageHero } from '@/components/PageHero'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface PrayerWallHeroProps {
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section aria-labelledby="prayer-wall-heading" className="relative ...">
      <CinematicHeroBackground />
      <PageHero title="Prayer Wall" subtitle="You're not alone." />
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </section>
  )
}
```

This pattern:
- Preserves Spec 14's CinematicHeroBackground (W2)
- Lets PageHero handle the title/subtitle visual
- PageHero's ATMOSPHERIC_HERO_BG becomes irrelevant when wrapped inside an existing atmospheric section (the radial gradient is masked by CinematicHeroBackground's animation)
- composerRef on the action wrapper preserved (4.7 W5)
- `aria-labelledby` chain: outer `<section>` points to PageHero's internal h1 id

**Watch the `aria-labelledby` chain carefully** (D6 / W5). The outer wrapper's `aria-labelledby='prayer-wall-heading'` needs to match the id PageHero gives its h1. If PageHero uses `id='page-hero-heading'`, the outer wrapper needs that id (either by changing the wrapper's `aria-labelledby` to match, or by passing an `id` prop to PageHero if supported).

### MPD-4 — `scriptWord` NOT reintroduced on 'Wall'

Master plan body doesn't address scriptWord. The spec-tracker header block confirms Spec 14 explicitly cleaned up the `font-script` 'Wall' treatment:

> Spec 14 partial fold-in: ... `font-script` "Wall" cleanup ✅

PageHero supports an optional `scriptWord` prop for caveat-font emphasis on one word (e.g., 'Prayer **Wall**' where 'Wall' would render in script font). **5.3 does NOT pass scriptWord** — the wordmark stays as plain 'Prayer Wall' with GRADIENT_TEXT_STYLE.

If CC 'helpfully' adds `scriptWord='Wall'` to match a perceived design pattern, reject (W3).

### MPD-5 — Dashboard section header inventory is unknown

Master plan body's AC says:

> Dashboard section headers use the 2-line treatment

But master plan body doesn't enumerate which sections. Plan recon (R4) reads `PrayerWallDashboard.tsx` to:

- Identify every `<h1>`, `<h2>`, `<h3>` rendering a section title
- Identify any single-line headings that should become 2-line treatments
- Skip headings that are NOT section titles (e.g., card titles, modal titles)
- Propose eyebrow + headline pairs per section per brand voice (Section 13)

The brief leaves the exact count and copy to plan recon. Eric reviews the proposed eyebrow/headline pairs before /execute-plan-forums runs.

### MPD-6 — 5.0's catalog reference: `09-design-system.md`

Master plan body line 4583 says:

> The post-rollout canonical Phase 5 will apply (full reference: `09-design-system.md`)

Plan recon should read this design system doc for the canonical 2-line treatment specification, especially:

- Typography sizes for topLine vs bottomLine
- Color tokens for eyebrow text
- Vertical rhythm specifications
- Whether the canonical pattern includes a violet leading dot on the eyebrow

If `09-design-system.md` doesn't exist at the expected path or has different content than memory suggests, fall back to the reconciliation report at `_plans/reconciliation/2026-05-07-post-rollout-audit.md` and existing SectionHeading usage on other pages (e.g., MonthlyReport).

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-09)

Verified on disk at `/Users/eric.champlin/worship-room/`.

### R1 — PageHero component shape

`frontend/src/components/PageHero.tsx`:

```typescript
import { type ReactNode } from 'react'
import { HeadingDivider } from '@/components/HeadingDivider'
import { GRADIENT_TEXT_STYLE, renderWithScriptAccent } from '@/constants/gradients'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/utils'

const DASHBOARD_DARK_HEX = '#0f0a1e'

export const ATMOSPHERIC_HERO_BG = {
  backgroundColor: DASHBOARD_DARK_HEX,
  backgroundImage:
    'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
} as const

interface PageHeroProps {
  title: string
  subtitle?: string
  showDivider?: boolean
  scriptWord?: string
  children?: ReactNode
}

export function PageHero({ title, subtitle, showDivider, scriptWord, children }: PageHeroProps) {
  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()
  return (
    <section
      aria-labelledby="page-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-..."
      style={ATMOSPHERIC_HERO_BG}
    >
      ...
    </section>
  )
}
```

Key observations:

- `title` is the BIG line (h1)
- `subtitle` is the SMALLER line (likely p below h1)
- `scriptWord` enables caveat-font emphasis on one word within the title (renderWithScriptAccent helper)
- `showDivider` toggles a HeadingDivider element
- `children` renders below the headline area (used for CTA buttons or extra content)
- Outer section has `aria-labelledby='page-hero-heading'` — the h1 inside should have `id='page-hero-heading'`
- `style={ATMOSPHERIC_HERO_BG}` applies a radial-gradient atmospheric to the section

### R2 — SectionHeading component shape

`frontend/src/components/homepage/SectionHeading.tsx` (partial, from search):

```typescript
interface SectionHeadingProps {
  heading?: string         // legacy 1-line API
  topLine?: string         // 2-line eyebrow
  bottomLine?: string      // 2-line headline
  tagline?: string
  align?: 'center' | 'left'  // default 'center'
  className?: string
  id?: string
}

export function SectionHeading({
  heading,
  topLine,
  bottomLine,
  tagline,
  align = 'center',
  className,
  id,
}: SectionHeadingProps) {
  ...
}
```

Key observations:

- Component supports BOTH single-line (`heading`) and 2-line (`topLine` + `bottomLine`) modes
- 5.3 uses the 2-line mode exclusively
- `align` defaults to `'center'`
- `tagline` is a smaller third line below the headline (optional, probably unused on Prayer Wall)
- `className` for parent-applied overrides
- `id` for accessibility hooks

### R3 — PrayerWallHero current state (post-Spec 14)

`frontend/src/components/prayer-wall/PrayerWallHero.tsx` (30 lines total):

```tsx
import type { ReactNode } from 'react'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface PrayerWallHeroProps {
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id="prayer-wall-heading"
        className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl ..."
        style={GRADIENT_TEXT_STYLE}
      >
        Prayer Wall
      </h1>
      <p className="relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        You&apos;re not alone.
      </p>
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </section>
  )
}
```

State verified:
- Spec 14 ✅: cinematic atmosphere (CinematicHeroBackground), GRADIENT_TEXT_STYLE on h1, no font-script on 'Wall', no italic serif subtitle
- Single-line h1 + paragraph (NOT yet 2-line treatment)
- `action` slot for hero CTA
- `aria-labelledby` chain: outer section → h1 inside
- Padding: `pt-[145px]` (147px from top to account for transparent nav)

5.3 migrates this to compose PageHero inside, preserving CinematicHeroBackground and the action slot.

### R4 — PrayerWallDashboard section header inventory

Plan recon reads `frontend/src/pages/PrayerWallDashboard.tsx` and enumerates section headers. From session memory (not verified during this brief recon), PrayerWallDashboard likely has sections for:

- Badges / achievements
- Quick stats (post count, prayer count, etc.)
- Saved prayers list
- Recent activity
- Prayer history / timeline

Exact section count: unknown until plan recon. Brief defers to plan-time enumeration (D5).

**For each section header found, plan proposes:**

- topLine (eyebrow) — small contextual word(s), brand-voice-aligned
- bottomLine (headline) — the larger section title

Plan recon's output is a per-section table that Eric reviews. Section 13 has brand voice guardrails for the proposed copy.

### R5 — SectionHeading usage on other pages

Grep for `<SectionHeading topLine` across `frontend/src/pages/` identifies how other pages use the 2-line treatment. Plan recon catalogs:

- Which pages use it (likely MonthlyReport, Grow, others post-Round-3-Visual-Rollout)
- Typical eyebrow copy patterns (e.g., 'This Month' / 'June 2026', 'Your Practice' / 'Daily Devotional')
- Whether the violet leading dot accent is in use or absent

This benchmark calibrates the dashboard eyebrow copy choices to feel consistent with the rest of the app.

### R6 — GRADIENT_TEXT_STYLE export

`frontend/src/constants/gradients.ts` exports:

- `GRADIENT_TEXT_STYLE` — the canonical title gradient (likely `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` per session memory)
- `renderWithScriptAccent` — helper for scriptWord rendering (used by PageHero when scriptWord prop is set)

PageHero already applies GRADIENT_TEXT_STYLE to its title internally (verified via PageHero's import of GRADIENT_TEXT_STYLE on line 3). So PrayerWallHero migration doesn't need to pass the style explicitly — PageHero handles it.

### R7 — Existing component tests

Plan recon enumerates which tests exist:

- `PrayerWallHero.test.tsx` — exists (per R5 of 5.1 brief)
- `PageHero.test.tsx` — exists (at `frontend/src/components/__tests__/PageHero.test.tsx`)
- `SectionHeading.test.tsx` — likely exists in `homepage/__tests__/`
- `PrayerWallDashboard.test.tsx` — likely exists

**Test update strategy (D7):** existing tests should mostly pass without modification because the rendered output is intended to be visually similar (different markup, same content). The exceptions:

- PrayerWallHero tests that assert on inline `<h1>` or `<p>` markup — update to assert on PageHero's rendered output
- PrayerWallDashboard tests that assert on section header markup — update to assert on SectionHeading's rendered output
- Visual snapshot tests (if any) need regeneration

### R8 — BackgroundCanvas wraps Prayer Wall pages (5.2 shipped)

Per 5.2's status (✅ shipped via Spec 14). PrayerWall.tsx, PrayerWallDashboard.tsx, PrayerDetail.tsx, PrayerWallProfile.tsx all wrap their content with `<BackgroundCanvas>` at the page root.

5.3 does NOT touch BackgroundCanvas. The page-level atmospheric is separate from the hero-section atmospheric (CinematicHeroBackground). Both coexist on `/prayer-wall`.

### R9 — `aria-labelledby` chain in PrayerWallHero

Current: outer `<section aria-labelledby='prayer-wall-heading'>` references inner `<h1 id='prayer-wall-heading'>`. The id IS unique on the page.

After migration: PageHero internally uses `aria-labelledby='page-hero-heading'` on its own `<section>` and `id='page-hero-heading'` on its `<h1>`. If PrayerWallHero composes PageHero inside its OWN `<section>` (D2 pattern), there's a nested-section concern:

```tsx
<section aria-labelledby="prayer-wall-heading">     {/* outer wrapper */}
  <CinematicHeroBackground />
  <section aria-labelledby="page-hero-heading">     {/* PageHero's section */}
    <h1 id="page-hero-heading">Prayer Wall</h1>
    ...
  </section>
</section>
```

**Issue:** double `<section>` with two `aria-labelledby` references is semantically heavy and potentially confusing for screen readers.

**Resolution (D6):** drop the outer `aria-labelledby='prayer-wall-heading'` if PageHero provides its own. Or: keep the outer wrapper as a `<div>` (not `<section>`) and let PageHero be the only `<section>` element. Plan recon picks the cleaner approach.

Accessibility check: axe-core test (4.8 Universal Rule 17) re-runs after migration to confirm no violations.

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

5.3 is pure-frontend visual refactor. None of the Phase 3 backend gates apply.

| # | Gate | Applies to 5.3? |
| - | ---- | --- |
| 1-13 | All Phase 3 backend gates | N/A |
| 17 | Universal Rule 17 axe-core (from 4.8) | Indirect — the migration must NOT introduce new accessibility violations. Re-run 4.8's axe-core tests after migration. |
| 18 | Visual parity gate (from 5.1) | Applies but loosely — 5.3 INTENTIONALLY changes visual hierarchy on dashboard sections (single-line → 2-line). PrayerWallHero visual stays similar. |

**New addendum gate introduced by 5.3:**

**Gate 19: Eyebrow + headline brand voice gate.** Every eyebrow + headline pair on dashboard sections is brand-voice-reviewed per Section 13 before merge. Pure visual parity does NOT apply here; the dashboard sections will look DIFFERENT (better) post-migration.

---

## 7. Decisions and divergences

### D1 — PrayerWallHero stays as wrapper, composes PageHero internally

Per MPD-3. The post-5.3 PrayerWallHero file:

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

**Key changes from current:**

- Outer is now `<div>`, not `<section>` (avoids nested-section issue per R9)
- The `pt-[145px]` padding moves to the outer wrapper to preserve the transparent-nav clearance
- CinematicHeroBackground stays where it is (outer-most positioned absolute element)
- PageHero handles the title + subtitle rendering, the gradient, the responsive sizing, all the visual treatment
- The `action` slot is passed as `children` to PageHero (so it renders below the subtitle, inside PageHero's section)
- composerRef on the action wrapper preserved (PrayerWall.tsx passes the ref via the `action` slot; PageHero just renders it)
- `aria-labelledby` chain: PageHero provides its own; the outer div doesn't need its own

**Alternative considered and rejected:** REPLACING PrayerWallHero entirely with PageHero directly in PrayerWall.tsx. Rejected because PrayerWall.tsx already imports PrayerWallHero in multiple places and refactoring those is unnecessary churn. Keep PrayerWallHero as a thin compositional wrapper.

### D2 — CinematicHeroBackground preserved at outer layer

Per MPD-3 / W2. The CinematicHeroBackground stays as the outer-most positioned element of PrayerWallHero. It renders BEHIND PageHero (z-index ordering preserved by virtue of DOM order + relative/absolute positioning).

PageHero's built-in `ATMOSPHERIC_HERO_BG` (radial-gradient) renders on PageHero's own `<section>`. When PageHero is nested inside PrayerWallHero's outer div, PageHero's atmospheric layer sits ON TOP of CinematicHeroBackground but is mostly transparent (15% violet at center, fading to transparent). The two layers compose additively.

**Plan recon verifies the visual result.** If the additive composition is too busy or too dark, plan can:

- (a) Suppress PageHero's ATMOSPHERIC_HERO_BG via inline style override on the parent (e.g., wrap PageHero in a div that absolutely positions and overrides the background) — messy
- (b) Add a prop to PageHero `transparent: true` that skips ATMOSPHERIC_HERO_BG — cleaner, but scope creep (changes PageHero's API)
- (c) Accept the additive composition as the canonical look

**Default decision: (c).** Trust that the additive composition reads as intended (a subtle warming radial below an animated cinematic). If the visual is wrong, escalate.

### D3 — PageHero `title='Prayer Wall'`, `subtitle="You're not alone."`

The content stays identical to current. PageHero handles the rendering:

- `title='Prayer Wall'` — BIG h1 with gradient text (PageHero applies GRADIENT_TEXT_STYLE internally)
- `subtitle="You're not alone."` — smaller paragraph below

No `scriptWord` (per MPD-4 / W3). No `showDivider` (the hero has a feed below it, not a divider). The `children` slot carries the action button.

### D4 — Dashboard section headers use `<SectionHeading topLine bottomLine />`

Per MPD-2 / D5. For every section header in PrayerWallDashboard:

```tsx
// Before:
<h2 className="text-2xl font-bold">Badges</h2>
<div className="...">...badge cards...</div>

// After:
<SectionHeading topLine="Earned" bottomLine="Badges" align="left" />
<div className="...">...badge cards...</div>
```

Plan recon enumerates each section (R4) and proposes the topLine + bottomLine pair. Brand voice review (Section 13) ensures eyebrows aren't gamified or pressured.

**`align` choice per section:** plan picks based on existing layout. Centered headings stay centered (`align='center'`, default). Left-aligned section headings stay left (`align='left'`).

### D5 — Plan recon enumerates dashboard sections and proposes copy

The brief does NOT pre-specify topLine/bottomLine pairs for dashboard sections because the section inventory is unknown until plan recon. Plan-time deliverable:

A table of every section header in PrayerWallDashboard.tsx:

| Section | Current heading | Proposed topLine | Proposed bottomLine | Align |
| ------- | --------------- | ---------------- | ------------------- | ----- |
| Badges | 'Badges' | 'Earned' | 'Badges' | center |
| Stats | 'Quick Stats' | 'Your Activity' | 'This Month' | left |
| Saved | 'Saved Prayers' | 'Personal' | 'Saved Prayers' | left |
| ... | ... | ... | ... | ... |

Eric reviews this table before /execute-plan-forums runs. If any proposed copy feels off, Eric edits and re-runs plan.

### D6 — `aria-labelledby` chain: drop outer wrapper's reference; trust PageHero's

Per R9. After migration, PrayerWallHero's outer wrapper is `<div>` (not `<section>`) and does NOT have `aria-labelledby`. The accessible name is provided by PageHero's internal `<section aria-labelledby='page-hero-heading'>` → `<h1 id='page-hero-heading'>`.

This simplifies the markup and avoids nested-section semantics. Screen readers announce 'Prayer Wall' heading via the PageHero's section.

If the outer wrapper's `<div>` doesn't carry semantic role and the page navigation depends on the section structure, plan recon catches this. Likely the outer wrapper's removal is invisible to assistive tech.

### D7 — Test update strategy: minimal

Per R7. Existing tests should mostly pass without modification. Updates needed:

- `PrayerWallHero.test.tsx` — update assertions on inline `<h1>` and `<p>` markup; assert PageHero is rendered with correct props; preserve action-slot tests
- `PrayerWallDashboard.test.tsx` — update assertions on section headings; assert SectionHeading is rendered with correct topLine/bottomLine per section
- `PageHero.test.tsx` — no changes (PageHero unchanged)
- `SectionHeading.test.tsx` — no changes

**Add ~2 new tests:**

- 'PrayerWallHero composes PageHero with title="Prayer Wall" and subtitle="You\'re not alone."'
- 'PrayerWallHero preserves CinematicHeroBackground'

Total test changes: ~5-8 small updates + 2 new.

### D8 — NO new constants or shared utilities

5.3 is a consumer of existing primitives. Don't:

- Extract dashboard section eyebrows to a constants file (the copy is per-section context, not reusable)
- Create a `Tier1Heading` or `DashboardHeading` wrapper component
- Refactor PageHero to add new props
- Refactor SectionHeading to add new props

If plan recon discovers a clear pattern across multiple pages that could benefit from a shared helper, surface as a follow-up. Not 5.3.

### D9 — Migration order

1. **PrayerWallHero** (smaller surface, single migration point)
2. **PrayerWallDashboard sections** (multiple section headers, sequential migration)

Migrate PrayerWallHero first because:
- Single change, easier to verify in isolation
- Visual change is minimal (subtitle's typography may shift slightly via PageHero's rendering)
- Establishes the pattern before tackling dashboard's multiple sections

Dashboard sections after PrayerWallHero:
- Each section is its own logical commit
- Verify visual hierarchy and brand voice per section
- Eric reviews each before merge if uncertain about copy

### D10 — NO new visual regression infrastructure

Per 5.1 D9. 5.3 inherits 5.1's manual-visual-review approach. No screenshot baselines, no `toHaveScreenshot()` integration.

If 5.1 ended up establishing screenshot baselines (Eric's call during 5.1 execution), 5.3 regenerates them after manual review confirms parity for the hero and intentional change for the dashboard sections.

---

## 8. Watch-fors

### W1 — 5.1 must be ✅ before 5.3 starts

Verify spec-tracker.md shows 5.1 ✅. Master plan says 5.2 is prereq, but 5.2 already shipped via Spec 14. Effective prereq is 5.1.

### W2 — Don't drop CinematicHeroBackground

Per MPD-3 / D2. Spec 14 explicitly shipped CinematicHeroBackground on PrayerWallHero. 5.3 preserves it. If CC removes CinematicHeroBackground in favor of PageHero's built-in ATMOSPHERIC_HERO_BG, reject — that's a regression of Spec 14.

### W3 — Don't reintroduce `scriptWord` on 'Wall'

Per MPD-4. Spec 14 cleaned up the `font-script` 'Wall' treatment. PageHero supports `scriptWord` for caveat-font emphasis, but 5.3 does NOT pass it. The wordmark stays as plain 'Prayer Wall' with GRADIENT_TEXT_STYLE.

If CC adds `scriptWord='Wall'` to 'restore' the visual emphasis, reject — that's a regression of Spec 14.

### W4 — Don't mix PageHero and SectionHeading prop APIs

Per MPD-2 / D1 / D4. PageHero uses `title`/`subtitle`. SectionHeading uses `topLine`/`bottomLine`. Don't pass `topLine` to PageHero or `title` to SectionHeading.

If CC writes `<PageHero topLine='X' bottomLine='Y' />`, reject — wrong prop API.

### W5 — Don't break `aria-labelledby` chain

Per D6 / R9. The accessible name must remain in place after migration. If the outer wrapper becomes `<div>` (D1), PageHero's internal `<section aria-labelledby='page-hero-heading'>` carries the accessibility hook.

Axe-core test (4.8 Universal Rule 17) re-runs after migration to confirm.

### W6 — Don't ship dashboard section eyebrows with brand voice anti-patterns

Per Section 13. Anti-patterns:

- '✨ Your Awesome Badges' — emoji + 'awesome' (cheerleader)
- 'Hot This Week: Stats' — 'hot' (gamification, comparison)
- 'Trending: Recent Activity' — 'trending' (marketing voice)
- 'PRO TIP: Saved Prayers' — 'PRO TIP' (transactional, sales-y)
- 'Don't miss your stats!' — urgency / FOMO
- 'Section: Stats' — redundant 'Section:' prefix

If CC's proposed eyebrow copy drifts to these patterns, reject. Eric reviews the proposed table (D5) and approves before /execute-plan-forums runs.

### W7 — Don't preempt Spec 5.4 (animation tokens)

5.4 (Animation Token Migration) migrates hardcoded animation durations to imports from `constants/animation.ts`. If 5.3's migration touches a file with hardcoded animation values (e.g., a transition on PageHero or SectionHeading), DON'T 'fix it along the way'. Stay scoped.

### W8 — Don't introduce layout shift below migrated headings

PageHero's rendered output likely has a different padding/margin structure than the current inline h1+p. The composer flow below the hero must render at the same vertical offset (or close enough) post-migration.

Plan recon checks the padding values in PageHero vs current PrayerWallHero. If they differ significantly, the migration adds compensating padding/margin to keep the composer at the same vertical position.

Visual verification step: side-by-side screenshots of `/prayer-wall` pre- and post-migration; QOTD card should be at the same vertical position.

### W9 — Don't migrate other Prayer Wall page heros

5.3's scope is PrayerWallHero (used on `/prayer-wall`) and PrayerWallDashboard sections. NOT:

- PrayerDetail page (its own heading pattern, separate concern)
- PrayerWallProfile page (its own heading pattern, separate concern)
- Any page hero outside Prayer Wall

If those need 2-line treatment, file follow-ups. Not 5.3.

### W10 — Don't migrate card-level headings

PrayerCard's title (the post content's first line, if a heading exists) is NOT a section heading; don't apply SectionHeading.

QOTD card's 'Question of the Day' is rendered via FrostedCard's `eyebrow` prop (per 5.1 D4). Don't add SectionHeading to it.

Dialog titles ('Report this post', 'Delete prayer?', etc.) are NOT section headings; don't migrate.

If CC migrates card or dialog titles, reject. SectionHeading is for PAGE SECTIONS only.

### W11 — Don't change subtitle copy

The current subtitle 'You're not alone.' is brand-voice-aligned. Don't change it during migration. PageHero gets `subtitle="You're not alone."` verbatim.

If CC changes to 'Welcome back!' or 'Your prayers matter' or anything else, reject. The copy stays.

### W12 — Don't break composerRef preservation

The `action` slot on PrayerWallHero passes through to PrayerWall.tsx. The composerRef is attached inside the action slot (per 4.7 R2 / W5). After migration, the action renders inside PageHero's `children`. The ref-attached wrapper still works.

If CC moves the action slot somewhere that breaks the ref binding, reject.

### W13 — Don't touch BackgroundCanvas

5.2's BackgroundCanvas wraps Prayer Wall pages at the page root. 5.3 does NOT touch BackgroundCanvas. The page-level atmospheric is separate from the hero-section atmospheric.

If CC moves, removes, or modifies BackgroundCanvas usage, reject. That's 5.2's domain.

### W14 — Don't introduce new dependencies

5.3 is pure consumption of existing primitives. No new npm packages, no new utility libraries.

### W15 — Don't refactor PageHero or SectionHeading

If plan recon discovers PageHero's atmospheric conflicts with CinematicHeroBackground (D2's risk), and the cleanest fix is to add a `transparent: true` prop to PageHero, that's tempting BUT out of scope. Surface as a follow-up if needed.

5.3 uses PageHero and SectionHeading as they exist. Don't modify their internals.

### W16 — Don't compose PageHero AND SectionHeading on the same surface

Per Visual verification #10. The hero uses PageHero; sections use SectionHeading. They don't nest or compose with each other.

If CC creates a weird hybrid (e.g., 'use PageHero for the page hero, but ALSO add a SectionHeading below it for the feed eyebrow'), reject. Separate concerns.

### W17 — Don't break PrayerWall.tsx imports

The `PrayerWallHero` named export stays. PrayerWall.tsx imports `{ PrayerWallHero }` from `@/components/prayer-wall/PrayerWallHero` — that import statement is unchanged.

If CC renames PrayerWallHero or removes its export, PrayerWall.tsx breaks. Don't.

### W18 — Don't break the 4.7 chooser entry flow

The hero CTA button (composer entry per 4.7) still opens the ComposerChooser. The button is passed as `action` prop, rendered inside PageHero's children. Click handler unchanged.

If CC's migration somehow breaks the button or its click handler, reject.

### W19 — Don't update visual regression baselines for the hero without manual review

The hero's visual change should be subtle (PageHero's rendering may differ slightly from current inline JSX). Don't auto-regenerate baselines.

For dashboard sections, the visual change is INTENTIONAL (single-line → 2-line). Regenerate baselines AFTER manual review confirms each section's new look is brand-voice-approved.

### W20 — Don't add HeadingDivider on PageHero usage

PageHero supports an optional `showDivider` prop that renders a HeadingDivider element. 5.3 does NOT pass `showDivider` for the PrayerWallHero — the existing hero doesn't have a divider, and adding one is a visual change beyond 5.3's scope.

If CC adds `showDivider={true}` to 'enhance' the hero, reject. Visual additions are out of scope.

<!-- CHUNK_BOUNDARY_4 -->

---

## 9. Test specifications

Target: ~10 tests (mostly updates; small surface).

### Frontend tests

**`frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx`** (UPDATE — ~3-4 tests):

- Update existing assertions on inline `<h1>` and `<p>` markup to assert PageHero's rendered output
- ADD: 'composes PageHero with title="Prayer Wall"'
- ADD: 'composes PageHero with subtitle="You\'re not alone."'
- ADD: 'preserves CinematicHeroBackground'
- Preserve existing tests for action-slot rendering, composerRef binding, hero CTA behavior

**`frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx`** (UPDATE — ~4-6 tests):

- Update existing single-line heading assertions to assert SectionHeading rendering
- Per section migrated, assert `<SectionHeading topLine="X" bottomLine="Y" />` is rendered
- Preserve existing tests for section content (badges list, stats, etc.)

**`frontend/src/components/__tests__/PageHero.test.tsx`** (NO CHANGES):

PageHero is unchanged in 5.3. Existing tests remain valid.

**`frontend/src/components/homepage/__tests__/SectionHeading.test.tsx`** (NO CHANGES):

SectionHeading is unchanged in 5.3. Existing tests remain valid.

**`frontend/tests/playwright/accessibility.spec.ts`** (UPDATE — 0 new tests; re-run existing 4.8 axe-core tests after migration):

No new test code; just verify the existing axe-core scans on `/prayer-wall`, `/prayer-wall?postType=testimony`, `/prayer-wall?postType=encouragement&category=mental-health` still pass with the migrated headings.

Add 1 NEW route to axe-core: `/prayer-wall/dashboard`. This route's section headers are migrated in 5.3; scanning it for violations is a sensible 5.3 addition.

### Total test budget

- PrayerWallHero.test.tsx: 3-4 updates + adds
- PrayerWallDashboard.test.tsx: 4-6 updates
- Playwright accessibility: 1 new route added

**Total: ~7-10 changes + 1 new Playwright route.** Bounded; refactor with small new surface.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

(none)

### Files to Modify

**Frontend (the 2 migration targets per master plan body):**

- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — migrate to compose PageHero internally; preserve CinematicHeroBackground at outer wrapper; preserve action slot via PageHero's children
- `frontend/src/pages/PrayerWallDashboard.tsx` — migrate each section header to SectionHeading with topLine + bottomLine per D5 plan recon

**Test files:**

- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx` — ~3-4 changes
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` — ~4-6 changes
- `frontend/tests/playwright/accessibility.spec.ts` — add `/prayer-wall/dashboard` to axe-core scan routes

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 5.3 from ⬜ to ✅ AFTER successful merge AND manual visual review

### Files NOT to Modify

- `frontend/src/components/PageHero.tsx` — component unchanged; 5.3 is consumer (W15)
- `frontend/src/components/homepage/SectionHeading.tsx` — component unchanged; 5.3 is consumer (W15)
- `frontend/src/components/CinematicHeroBackground.tsx` — unchanged (5.3 preserves usage, doesn't modify)
- `frontend/src/constants/gradients.ts` — unchanged (GRADIENT_TEXT_STYLE used internally by PageHero)
- `frontend/src/pages/PrayerWall.tsx` — import unchanged; PrayerWallHero is composed inside it via existing import (W17)
- `frontend/src/pages/PrayerDetail.tsx`, `PrayerWallProfile.tsx` — W9; out of scope
- BackgroundCanvas usage anywhere — W13
- All backend files — pure frontend spec

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Hero migration:**

- [ ] PrayerWallHero composes PageHero internally
- [ ] PageHero receives `title='Prayer Wall'` and `subtitle="You're not alone."`
- [ ] NO `scriptWord` prop passed (W3)
- [ ] NO `showDivider` prop passed (W20)
- [ ] CinematicHeroBackground preserved at the outer wrapper
- [ ] Action slot (CTA button) renders inside PageHero's children
- [ ] composerRef binding on the action wrapper preserved
- [ ] First-time TooltipCallout still fires on hero button (per 4.7 W5)
- [ ] PrayerWall.tsx import of `{ PrayerWallHero }` works unchanged
- [ ] Outer wrapper is `<div>` (not `<section>`); no nested-section issue
- [ ] `aria-labelledby` chain via PageHero internal works for screen readers

**Dashboard section migration:**

- [ ] Plan recon output: table of all section headers with proposed topLine/bottomLine pairs
- [ ] Eric reviewed and approved the proposed table before execute
- [ ] Every dashboard section header migrated to `<SectionHeading topLine bottomLine align? />`
- [ ] Each eyebrow + headline pair passes brand voice review (Section 13)
- [ ] No card-level or dialog-level titles migrated (W10)
- [ ] No QOTD eyebrow conflict (W10; QOTD uses FrostedCard's eyebrow per 5.1)

**Visual parity (hero):**

- [ ] Manual visual review by Eric: hero looks substantially the same as before
- [ ] No layout shift below the hero; composer / QOTD positioned correctly
- [ ] Mobile responsive: title doesn't overflow, subtitle wraps cleanly
- [ ] Cinematic atmosphere visible behind PageHero (W2 confirmed)

**Visual change (dashboard sections):**

- [ ] Manual visual review by Eric: each section's new 2-line treatment reads as intended
- [ ] Vertical rhythm preserved or improved; no awkward gaps
- [ ] No layout shift below section headers
- [ ] Mobile responsive: eyebrow + headline pair fits without wrap weirdness

**Accessibility:**

- [ ] Universal Rule 17 axe-core tests pass on existing routes
- [ ] New axe-core route `/prayer-wall/dashboard` passes with zero violations
- [ ] Screen reader announces 'Prayer Wall' heading on `/prayer-wall`
- [ ] Screen reader announces each section heading on `/prayer-wall/dashboard`
- [ ] Tab order on hero preserved (button focus accessible via Tab)

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
- [ ] PrayerCard NOT touched (out of 5.3 scope)
- [ ] No animation token migration (W7; that's 5.4)
- [ ] No new dependencies (W14)

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 5.3 row flipped from ⬜ to ✅ AFTER manual visual review confirms hero parity and dashboard section voice approval

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 5.3:

- **PrayerDetail page hero migration** — W9; follow-up
- **PrayerWallProfile page hero migration** — W9; follow-up
- **Any page hero outside Prayer Wall** — different surface entirely
- **Card-level title migration to SectionHeading** — W10; cards have their own pattern
- **Dialog-title migration to SectionHeading** — W10
- **QOTD eyebrow migration to SectionHeading** — W10; QOTD uses FrostedCard's eyebrow per 5.1 D4
- **Subtitle copy changes** — W11; 'You're not alone.' stays
- **PageHero or SectionHeading refactors** — W15; consumers only
- **HeadingDivider addition on PrayerWallHero** — W20
- **Animation token migration** — W7; that's 5.4
- **Visual regression infrastructure setup** — D10
- **PageHero `scriptWord` reintroduction** — W3 / MPD-4
- **BackgroundCanvas changes** — W13
- **New dependencies** — W14
- **Tier1Heading or DashboardHeading wrapper components** — D8; use what exists
- **Visual changes to PageHero or SectionHeading internals** — use them as-is
- **Removing PrayerWallHero entirely and using PageHero directly in PrayerWall.tsx** — D1 explicitly keeps PrayerWallHero as a thin wrapper
- **Adding props to PrayerWallHero** — the `action` prop is the only API; don't extend
- **Section reordering on dashboard** — 5.3 migrates each existing section's heading; doesn't reorder sections

---

## 13. Brand voice quick reference

The dashboard section headers are the main brand voice surface in 5.3. Each section gets an eyebrow + headline pair where the eyebrow is the smaller contextual word(s) and the headline is the larger section title.

**Anti-patterns to flag during /code-review:**

- '✨ Your Awesome Badges' — emoji + 'awesome' (cheerleader voice)
- 'Hot This Week: Stats' — 'hot' (gamification, comparison)
- 'Trending: Recent Activity' — 'trending' (marketing voice)
- 'PRO TIP: Saved Prayers' — 'PRO TIP' (transactional, sales-y)
- 'Don't miss your stats!' — urgency / FOMO
- 'Section: Stats' — redundant 'Section:' prefix
- 'STREAK: 7 Days' — all caps + competitive framing
- 'Achievement Unlocked: Badges' — gamification, video-game speak
- 'Level Up Your Practice' — gamification
- 'Boost Your Faith' — transactional
- 'Premium Stats' — paid/exclusive framing
- 'Get more out of...' — transactional

**Good eyebrow patterns (calibrated to Worship Room's calm, present voice):**

- 'Earned' / 'Badges' — simple past tense
- 'Your Practice' / 'This Month' — ownership without competition
- 'Personal' / 'Saved Prayers' — quiet possessive
- 'Recent' / 'Activity' — simple time framing
- 'This Week' / 'Highlights' — temporal context
- 'Currently' / 'Active Streak' — if streaks are a thing, frame as state not score
- 'For You' / 'Recommendations' — if recommendations exist
- 'Quiet' / 'Reflections' — if a journaling section exists

**General voice principles for eyebrows:**

- One or two words
- No emoji
- No exclamation
- No comparison ('top', 'best', 'most', 'trending')
- No urgency ('now', 'today', 'don't miss')
- No gamification ('streak', 'level', 'unlock', 'achievement')
- Calm noun or simple temporal/possessive context
- If unsure: choose a quieter word over a louder one

**Headline (bottomLine) voice:**

- Plain section noun ('Badges', 'Stats', 'Saved Prayers')
- No marketing copy ('Your Amazing Stats')
- No 'My' prefix ('Saved Prayers' not 'My Saved Prayers' — the eyebrow already establishes ownership)

**Eric reviews every eyebrow + headline pair before /execute-plan-forums runs.** If anything feels off, edit the plan and re-run.

---

## 14. Tier rationale

Run at **High**. Justifications:

**Why not Standard:**

- CinematicHeroBackground composition with PageHero is subtle (MPD-3 / D2). Standard tier sometimes drops CinematicHeroBackground.
- `scriptWord` regression risk (W3). PageHero supports the prop; Standard tier might add it 'helpfully'.
- PageHero vs SectionHeading prop API confusion (MPD-2 / W4). Standard tier sometimes mixes them.
- Dashboard eyebrow brand voice is subjective. Standard tier sometimes ships cheerleader/gamification copy.
- `aria-labelledby` chain change is non-obvious (D6 / W5).
- Layout shift risk below migrated headings (W8).

**Why not xHigh:**

- No new component creation
- Only 2 files modify
- Components already exist and are battle-tested
- The brief covers all decisions and watch-fors explicitly
- The visual hierarchy patterns (PageHero vs SectionHeading) are well-defined

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC drops CinematicHeroBackground (W2 / D2)
- If CC reintroduces `scriptWord` on 'Wall' (W3)
- If CC mixes PageHero and SectionHeading prop APIs (W4)
- If dashboard eyebrow copy drifts to gamification / cheerleader (W6 / Section 13)
- If `aria-labelledby` breaks (W5)
- If layout shift introduced below hero or sections (W8)
- If CC migrates out-of-scope page heros or card/dialog titles (W9 / W10)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-5-3`:

```
/spec-forums spec-5-3

Write a spec for Phase 5.3: 2-Line Heading Treatment. Read /Users/eric.champlin/worship-room/_plans/forums/spec-5-3-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: High.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

This spec applies the canonical 2-line heading treatment to:
- PrayerWallHero (uses PageHero component with title + subtitle)
- PrayerWallDashboard section headers (use SectionHeading with topLine + bottomLine)

5.0 was closed without ceremony; reference is `_plans/reconciliation/2026-05-07-post-rollout-audit.md`. 5.2 already shipped via Spec 14 (BackgroundCanvas on Prayer Wall pages).

Prerequisites:
- 5.1 (FrostedCard Migration) must be ✅ in spec-tracker.md
- If 5.1 is still ⬜, STOP. Don't proceed.

Recon checklist (re-verify on disk before starting; brief recon was on date 2026-05-09):

1. `frontend/src/components/PageHero.tsx` — confirm props are `title`, `subtitle`, `showDivider`, `scriptWord`, `children`; confirm ATMOSPHERIC_HERO_BG is on its `<section>`
2. `frontend/src/components/homepage/SectionHeading.tsx` — confirm props are `heading`, `topLine`, `bottomLine`, `tagline`, `align`, `className`, `id`
3. `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — read full current state; identify CinematicHeroBackground composition for preservation per D2
4. `frontend/src/pages/PrayerWallDashboard.tsx` — enumerate every section header (h1/h2/h3); propose topLine + bottomLine pair per section per D5
5. SectionHeading usage on other pages (MonthlyReport, Grow, etc.) — calibrate eyebrow copy style to existing app patterns
6. `09-design-system.md` (or reconciliation report fallback) — read canonical 2-line treatment spec
7. `frontend/src/constants/gradients.ts` — confirm GRADIENT_TEXT_STYLE export (PageHero applies internally)
8. PrayerWall.tsx imports — verify `{ PrayerWallHero }` import location (preserve via W17)
9. Universal Rule 17 axe-core test config — add `/prayer-wall/dashboard` route to scan
10. PrayerWallHero.test.tsx and PrayerWallDashboard.test.tsx — plan minimal test updates per D7

Spec output structure:

- Title and metadata (size M, risk Low, prerequisites 5.1, branch forums-wave-continued)
- Goal — Apply canonical 2-line heading treatment to PrayerWallHero (via PageHero) and PrayerWallDashboard section headers (via SectionHeading)
- Approach — PrayerWallHero composes PageHero inside its existing outer wrapper, preserving CinematicHeroBackground at outer layer; PrayerWallDashboard's section headings migrate to <SectionHeading topLine bottomLine />; copy proposed per section in plan, reviewed by Eric, then executed
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - Effective prereq is 5.1 (5.2 already shipped via Spec 14) (MPD-1)
  - PageHero uses title/subtitle; SectionHeading uses topLine/bottomLine (MPD-2 / W4)
  - PrayerWallHero composes PageHero internally; CinematicHeroBackground preserved (MPD-3 / D1 / D2 / W2)
  - NO scriptWord on 'Wall' (MPD-4 / W3)
  - Dashboard section copy enumerated via plan recon, brand-voice-reviewed (MPD-5 / D5)
  - Brand voice guardrails in Section 13 are mandatory
  - All 20 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge AND manual visual review.
- Eric handles all git operations manually.
- Hero migration is mostly visual parity (subtle change). Dashboard sections are intentional visual change.
- Brand voice on eyebrow copy is sensitive; Section 13 anti-patterns are the test.
- This is a pure-frontend spec; no backend changes.

After writing the spec, run /plan-forums spec-5-3 with the same tier (High).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-5-3
```

The verifier exercises Section 3's 10 visual scenarios. Verifier writes to `_plans/forums/spec-5-3-verify-report.md`.

If verification flags any of:
- CinematicHeroBackground lost (W2 / D2)
- `scriptWord` reintroduced on 'Wall' (W3 / MPD-4)
- PageHero / SectionHeading prop APIs mixed (W4 / MPD-2)
- `aria-labelledby` chain broken (W5)
- Dashboard eyebrow copy contains anti-patterns (W6 / Section 13)
- Layout shift below hero or sections (W8)
- Out-of-scope migrations attempted (W9, W10)
- 'You're not alone.' subtitle changed (W11)
- composerRef binding broken (W12)
- BackgroundCanvas touched (W13)
- New dependencies (W14)
- PageHero or SectionHeading internals modified (W15)
- HeadingDivider added (W20)
- axe-core tests fail on existing or new route (4.8 / W5)

Abort and bump to MAX. Those are the canonical override moments.

**Manual visual review by Eric is required before merge.** Two distinct review surfaces:

1. **Hero**: side-by-side screenshot comparison (pre/post-migration). Visual change should be subtle. CinematicHeroBackground visible. Composer position unchanged below.
2. **Dashboard sections**: each section's 2-line treatment reviewed individually. Brand voice on each eyebrow + headline pair. Vertical rhythm preserved.

If any visual divergence is intentional and brand-voice-approved, Eric signs off; otherwise iterate.

---

## Prerequisites confirmed (as of 2026-05-09 brief authorship)

- ✅ Phase 4 complete (4.1–4.8 all ✅ per spec-tracker)
- ✅ 5.1 (FrostedCard Migration) status: verify ✅ in spec-tracker before 5.3 starts
- ✅ 5.2 (BackgroundCanvas) shipped via Spec 14 (2026-05-07)
- ✅ PageHero exists at `frontend/src/components/PageHero.tsx` (R1)
- ✅ PageHero has title/subtitle/showDivider/scriptWord/children props
- ✅ SectionHeading exists at `frontend/src/components/homepage/SectionHeading.tsx` (R2)
- ✅ SectionHeading supports topLine/bottomLine/tagline/align (2-line mode)
- ✅ PrayerWallHero currently has CinematicHeroBackground + single-line `<h1>Prayer Wall</h1>` + `<p>You're not alone.</p>` (R3, verified 2026-05-09)
- ✅ Spec 14 explicitly cleaned up `font-script` 'Wall' — 5.3 does NOT reintroduce (MPD-4 / W3)
- ✅ BackgroundCanvas wraps Prayer Wall pages at page root (5.2 — R8)
- ✅ Universal Rule 17 axe-core test infrastructure from 4.8 — 5.3 extends with `/prayer-wall/dashboard` route
- ⬜ PrayerWallDashboard section header inventory — plan recon enumerates (R4 / D5)
- ⬜ Eric review of proposed eyebrow + headline pairs — before /execute-plan-forums runs

**Brief authored:** 2026-05-09, on Eric's work laptop. Second real Phase 5 brief (5.0 closed without ceremony; 5.1 first; 5.2 shipped via Spec 14; 5.3 second). Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b, 4.8, 5.1 briefs. Phase 5 progresses through 5.3 → 5.4 (animation tokens) → 5.5 (deprecated pattern purge — remainder) → 5.6 (Redis Cache Foundation — infrastructure spec, tonally different from visual specs; warrants own brief-planning session).

The master plan re-review pass (60–90 min Claude Desktop session, targeted patches, bump to v3.0) remains deferred. Natural moment is between 5.4 and 5.5, or after Phase 5 closes entirely.

**End of brief.**
