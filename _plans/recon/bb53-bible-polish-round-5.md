# Playwright Recon: BB-53 — Bible Polish Round 5

**Source URLs:**
- `http://localhost:5173/bible` (BibleLanding + BibleHeroSlot)
- `http://localhost:5173/bible/plans` (PlanBrowserPage)
- `http://localhost:5173/bible/plans/john-story-of-jesus` (BiblePlanDetail — added during recon to validate gradient clip + day-row auth gap)

**Captured:** 2026-04-17 (local dev, `claude/feature/bible-polish-round-2` branch)
**Capture age:** 0 days — fresh
**Purpose:** Validate BB-53 acceptance criteria against the live app before `/plan`
**Primary scope:** Confirming hero spacing, card-width parity, gradient-text descender clip, and Plan Overview day-row auth gap for BB-53
**Confidence:** HIGH — all four BB-53 requirements measured against live DOM + visual capture

**Auth state during capture:** logged out (`wr_auth_simulated: null`, `wr_user_name: null`) — which is the state BB-53 Req 4's acceptance criteria target.

> **Scope note:** This is a **targeted recon** scoped to BB-53's four narrow acceptance criteria, not the full 7-breakpoint × every-component protocol. Two breakpoints (1440px + 375px) on three pages (not all seven breakpoints on the full site). The skill's full protocol would produce thousands of lines for a polish spec with four concrete fixes. If the plan needs more breakpoints or per-component computed styles, re-run in full mode.

---

## Screen Inventory

**Flow type:** single-page routes (no multi-step flow)
**Terminal state:** n/a — each URL is a standalone page

| # | Screen Name | Navigation to Reach | Key Content | Shared Elements |
|---|------------|---------------------|-------------|------------------|
| 1 | Bible Landing | `/bible` | "Your Study Bible" hero, BibleHeroSlot (Continue Reading + Verse of the Day), Quick Actions grid | Navbar, HorizonGlow, SiteFooter |
| 2 | Plan Browser | `/bible/plans` | "Reading Plans" hero + subtitle, 2-col plan card grid ("Browse plans") | Navbar, HorizonGlow, SiteFooter |
| 3 | Plan Detail | `/bible/plans/john-story-of-jesus` | "The Story of Jesus" h1 (gradient), description, "Start this plan" CTA, Plan Overview day-row list | Layout (ATMOSPHERIC_HERO_BG), breadcrumb |

---

## Capture Scope

**Ticket:** BB-53
**PRIMARY screen(s):** Screen 1 (`/bible`), Screen 3 (`/bible/plans/:slug`) — these host BB-53's severe issues
**CONTEXT screen(s):** Screen 2 (`/bible/plans`) — measured but shown to already be near-balanced

**Breakpoints captured:** 1440px (desktop), 375px (mobile) on all three screens. Middle breakpoints skipped — BB-53 fixes are anchor-breakpoint based.

---

## Finding 1 — Hero spacing (BB-53 Requirement 1)

### Screen 1: `/bible` at 1440px

Hero padding: `176px / 16px / 32px / 16px` (top/right/bottom/left) — i.e. `pt-36 pb-8 sm:pt-40 sm:pb-8 lg:pt-44` computes to **176px top / 32px bottom** at lg+.

Navbar bottom: `97px`
Heading (`h1#bible-hero-heading`) top: `176px`, bottom: `288px` (height 112px — 2-line heading)
Section divider top: `320px`

| Gap | Measured | Implication |
|---|---|---|
| Navbar bottom → heading top | **79px** | excess top padding above heading |
| Heading bottom → section divider top | **32px** | tight bottom padding below heading |
| **Ratio (top : bottom)** | **2.47 : 1** | ❌ BB-53 Req 1 is valid — heading is pushed down, not centered |

### Screen 1: `/bible` at 375px

Hero padding: `144px 16px 24px` (top 144 / bottom 24).

| Gap | Measured |
|---|---|
| Navbar bottom → heading top | **43px** |
| Heading bottom → section divider top | **24px** |
| **Ratio** | **1.79 : 1** — still unbalanced, less acute than desktop |

### Screen 2: `/bible/plans` at 1440px

Hero padding: `176px / 16px / 32px / 16px` (identical to `/bible`).

Heading (`h1` "Reading Plans") is **1 line** with a subtitle paragraph below it. The hero contains both the h1 and the subtitle, so the gap heading→divider includes subtitle space.

| Gap | Measured | Implication |
|---|---|---|
| Navbar bottom → h1 top | **79px** | (same as /bible, expected — shared padding) |
| h1 bottom → section divider top | **72px** | ✅ already near-balanced |
| **Ratio (top : bottom)** | **1.10 : 1** | ✅ BB-53 Req 1 target already met on this page |

### Screen 2: `/bible/plans` at 375px

| Gap | Measured | Implication |
|---|---|---|
| Navbar bottom → h1 top | **43px** | |
| h1 bottom → section divider top | **60px** | bottom larger than top — already fine |
| **Ratio** | **0.72 : 1** | ✅ already balanced (slightly bottom-heavy, but within the ±1.2 window) |

### Verdict — narrower scope than BB-53 spec suggests

- **`/bible` is the only page with a severe imbalance.** Fix its hero padding.
- **`/bible/plans` is already balanced** because its h1 is 1 line AND has a subtitle that eats the bottom space.
- The BB-53 spec's acceptance criteria for `/bible/plans` hero spacing should either be **dropped** or downgraded to "no regression" since the page already passes the ratio target. Suggest the plan skip any `PlanBrowserPage.tsx` hero-padding change.

### Evidence

![bb53-bible-1440](screenshots/bb53-bible-1440.png) — the 2.47:1 imbalance is visible (large void above "Your / Study Bible" and a tight break below it).
![bb53-bible-plans-1440](screenshots/bb53-bible-plans-1440.png) — heading looks centered over the divider; BB-53 spec overreached on this page.

---

## Finding 2 — Card width parity (BB-53 Requirement 2)

### Screen 1: `/bible` at 1440px

`BibleHeroSlot` renders the Resume Reading card and the Verse of the Day card stacked. Measured widths:

| Card | `left` | `width` | Notes |
|---|---|---|---|
| Resume Reading (`<article>` with `border-l-primary`) | 160 | **1120px** | full width inside outer `max-w-6xl` (1152px - 16px padding × 2) |
| Verse of the Day (`<article>` inside `FrostedCard`) | 384 | **672px** | constrained by inner `max-w-*` wrapper (approx `max-w-2xl`) |
| **Width delta** | | **448px** | ❌ BB-53 Req 2 valid — clearly visible mismatch |

Related: the three Quick Actions cards below (Browse Books / My Bible / Reading Plans) each render at **363px** and are positioned at `left: 160 / 539 / 917` — they correctly fill the 1120px outer track in a 3-column grid. The VOTD card is the outlier.

### Screen 1: `/bible` at 375px

All cards render full-width within the mobile gutter:

| Card | `left` | `width` |
|---|---|---|
| Resume Reading | 16 | **343px** |
| Verse of the Day | 16 | **343px** |
| Browse Books / My Bible / Reading Plans | 16 | 343px each |

**Mobile already has parity.** The fix only needs to target the desktop width at ≥sm breakpoints.

### Recommended target

Pick one canonical width for the BibleHeroSlot stack. Options:
- Match VOTD's current width (`max-w-2xl` ≈ 672px) → both cards narrow
- Match Resume Reading's current width (full `max-w-6xl` inner ≈ 1120px) → both cards edge-to-edge
- Pick a middle ground (`max-w-4xl` ≈ 896px)

The spec leaves this to the implementer. I'd bias toward the middle ground (`max-w-4xl` ≈ 896px) — it keeps the VOTD card from looking lost in the full 1120px track while preventing the Resume Reading card from feeling overly wide for two-line content.

### Evidence

![bb53-bible-1440](screenshots/bb53-bible-1440.png) — Continue Reading card is clearly wider than Verse of the Day card.

---

## Finding 3 — Gradient-text descender clip (BB-53 Requirement 3)

### Screen 3: `/bible/plans/john-story-of-jesus` at 1440px — h1 "The Story of Jesus"

Computed styles on the h1:

| Property | Value | Risk |
|---|---|---|
| `font-size` | **48px** | — |
| `line-height` | **48px** | ❌ line-height exactly equal to font-size — zero room for descenders |
| `padding-bottom` | **0px** | ❌ no padding buffer |
| `background-clip` | `text` | confirms gradient text |
| `-webkit-background-clip` | `text` | |
| `color` | `rgb(255, 255, 255)` | white fallback (correct) |
| rect height | 48px | fills entire line-box — any descender below baseline clips |
| parent `overflow` | `visible` | parent allows overflow, but the gradient fill still cuts at the line-box |
| `descenderRisk` (computed: line-height ≤ font-size × 1.02) | **true** | |

**"J" in "Jesus" has a descender**, and with `line-height: 48px` === `font-size: 48px`, the gradient fill cuts off at the baseline. This is the BB-53 Req 3 bug.

### Fix target

Adding `pb-2` (8px) to this h1 eliminates the clip. Same fix applies to other gradient-text headings codebase-wide (BB-53 Req 3 audit list).

### Evidence

![bb53-plan-detail-1440](screenshots/bb53-plan-detail-1440.png) — the "J" in "Jesus" is clipped at the baseline (subtle but visible on a clean screen).

### Audit reference — already covered

Looking at the codebase, these gradient headings **already have** `pb-2` (added in earlier rounds):
- `BibleHero.tsx` → `pb-2` on line 14 ✅
- `PlanBrowserPage.tsx` → `pb-2` on line 33 ✅

These do **not** have padding yet and need the BB-53 Req 3 fix:
- `BiblePlanDetail.tsx:126` ❌ — `The Story of Jesus` h1 (captured above, clipping confirmed)
- `ReadingPlanDetail.tsx:199` (likely same pattern — not directly measured in this recon but same code pattern)
- Other gradient-text consumers listed in the BB-53 spec audit list — plan should verify each during execute-plan.

---

## Finding 4 — Plan Overview day-row auth gap (BB-53 Requirement 4)

### Screen 3: `/bible/plans/john-story-of-jesus` at 1440px — day rows

**DOM structure:** Plain `<a>` elements (5 visible, "Show all 21 days" toggle for the rest). No role, no click handler, default tabIndex 0.

```text
a[href="/bible/plans/john-story-of-jesus/day/1"]
  flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]
a[href="/bible/plans/john-story-of-jesus/day/2"] (same pattern)
a[href="/bible/plans/john-story-of-jesus/day/3"] (same pattern)
...
```

No `isAuthenticated` check at click time. No `useAuthModal()` wiring.

### Runtime test (logged out)

Starting state: `/bible/plans/john-story-of-jesus`, `wr_auth_simulated: null`.

Action: programmatic click on `a[href="/bible/plans/john-story-of-jesus/day/1"]`.

Result:
- Before URL: `/bible/plans/john-story-of-jesus`
- After URL: `/bible/plans/john-story-of-jesus/day/1`
- **Navigated: true** — no auth modal intercept

This confirms the BB-53 Req 4 gap exactly as the spec describes. The plan should replace each day-row `<Link>`/`<a>` with the `useAuthModal()` + `isAuthenticated` + `event.preventDefault()` pattern already used by `handleStart` at line 69 of the same file.

### Related — what IS already gated on the page

- `Start this plan` button (line 169) — correctly calls `authModal?.openAuthModal('Sign in to start a reading plan')` when `!isAuthenticated`
- `Pause plan` button — gated
- `Start again` button (completed state) — gated

So the gap is narrow: only the day-row `<a>` elements skip the gate.

---

## Color Palette (spot-checked on BB-53 scope only)

Page backgrounds match `bg-hero-bg` (#08051A) via body/root CSS from `index.css`. Heading gradient is `GRADIENT_TEXT_STYLE` → `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` (per `constants/gradients.tsx`). Gradient applied via `background-clip: text` + `-webkit-text-fill-color: transparent` (confirmed in computed styles).

No new colors needed for BB-53 — all changes are padding/width/auth-gate.

---

## Typography (spot-checked)

Heading h1 on `/bible/plans/john-story-of-jesus`:
- `font-size: 48px`, `line-height: 48px`, `font-weight: bold`, `font-family: Inter` (inherited)

No font-family changes needed for BB-53. The clip is a padding issue, not a font issue.

---

## Responsive Summary

**Only two breakpoints captured (1440px, 375px).** Based on these anchors:

- Hero spacing problem on `/bible` is **more severe at desktop** (2.47:1) than at mobile (1.79:1)
- Card width mismatch is **desktop-only** — mobile already has parity at 343px
- Gradient descender clip is **breakpoint-independent** — the ratio `line-height / font-size` stays at 1.0 across breakpoints
- Day-row auth gap is **breakpoint-independent** — DOM is the same at every width

**Tailwind breakpoint mapping:** no custom breakpoints needed; the page already uses `sm:` and `lg:` prefixes which match BB-53 requirements.

---

## Screenshots Captured

| Screen | 1440px | 375px |
|---|---|---|
| `/bible` | `screenshots/bb53-bible-1440.png` | `screenshots/bb53-bible-375.png` |
| `/bible/plans` | `screenshots/bb53-bible-plans-1440.png` | `screenshots/bb53-bible-plans-375.png` |
| `/bible/plans/john-story-of-jesus` | `screenshots/bb53-plan-detail-1440.png` | (not captured — BB-53 Req 4 is DOM-level, not visual) |

All screenshots saved under `_plans/recon/screenshots/`.

---

## Handoff to `/plan`

### Confirmed BB-53 scope changes to carry into the plan

1. **`/bible` hero padding** — Reduce top (`pt-36` / `sm:pt-40` / `lg:pt-44`) and/or increase bottom (`pb-6` / `sm:pb-8`) so the desktop ratio approaches 1.0–1.2. A concrete target: if nav+heading-top gap stays at 79px, bump bottom padding to ~60px (e.g., change `sm:pb-8 lg:pb-8` → `sm:pb-14 lg:pb-14`) to reach 79:60 ≈ 1.3:1. Or drop top padding: `pt-36 sm:pt-32 lg:pt-32` to reach ~50:32.

2. **`/bible` card width parity** — Wrap both cards in `BibleHeroSlot` (or the `BibleLandingInner` container around the slot) in a shared `max-w-* mx-auto` wrapper. Suggested: `max-w-4xl` or `max-w-3xl`. At 1440px, both should compute to the same width within ±1px.

3. **Gradient-text `pb-2` fix** — Add `pb-2` (or equivalent `leading` adjustment) to `BiblePlanDetail.tsx:126` h1, plus a codebase audit of every `GRADIENT_TEXT_STYLE` / `bg-clip-text` consumer. `BibleHero` and `PlanBrowserPage` already have `pb-2` — leave them alone.

4. **Plan Overview day-row auth-gating** — Replace each `<Link>` / `<a>` with an auth-aware click handler matching `handleStart` at `BiblePlanDetail.tsx:69`. Use the exact same message string `"Sign in to start this reading plan"`. Preserve `min-h-[44px]`, keyboard accessibility, and `aria-current="step"` on the current day.

### Scope reduction suggestion for the plan

- **Drop the `/bible/plans` hero spacing change from the acceptance criteria.** The page already meets the ratio target (1.10:1 desktop, 0.72:1 mobile). Updating the spec is optional — but the plan should at minimum note that no change is needed and avoid regressing it.

### Risk notes

- The `BibleHeroSlot` has four conditional render branches (active plan, active reader, lapsed reader, first-time). The shared `max-w-* mx-auto` wrapper must cover ALL four branches or the fix will be inconsistent based on user state. The fix should ideally live in `BibleLandingInner` around the `<BibleHeroSlot />` call, not inside the component's four return branches.
- `<Link>` → auth-gated button: keep the `<a>` for screen readers + SEO if possible (use `onClick={e => { if (!isAuth) { e.preventDefault(); openAuthModal(...) } }}`) rather than swapping to `<button>`. This preserves existing behavior for crawlers and assistive tech while closing the gap.

### Plan Handoff Checklist

| Section | Present? | Used By /plan For |
|---|---|---|
| Screen Inventory | YES | Scope mapping (3 pages) |
| Hero spacing measurements | YES | Exact padding target values for `/bible` |
| Card width measurements | YES | Exact width deltas (1120 vs 672) + fix suggestion |
| Gradient descender evidence | YES | Specific h1 location + the line-height=font-size trigger |
| Day-row auth-gate runtime test | YES | Documented bypass + fix pattern reference (handleStart line 69) |
| Screenshots | YES (5) | Visual verification baselines for `/verify-with-playwright` |
| Breakpoint-specific behavior | YES | Mobile-vs-desktop distinction (width parity is desktop-only) |

---

## Recon Completeness Checklist (scoped to BB-53)

- [x] Screen Inventory completed
- [x] Access validated (dev server at localhost:5173 returning 200)
- [x] Screenshots at 1440px + 375px for Screens 1 & 2
- [x] Screenshot at 1440px for Screen 3 (plan detail)
- [x] Hero padding computed styles captured (both pages, both breakpoints)
- [x] Card widths captured at 1440px AND 375px
- [x] Gradient h1 descender risk programmatically verified (line-height/font-size ratio)
- [x] Day-row DOM structure captured + runtime click test confirms unauthenticated navigation
- [x] Fix targets proposed with concrete pixel values
- [x] Scope reduction flagged (`/bible/plans` hero already balanced)

**Intentionally skipped (not in BB-53 scope):** all 7-breakpoint captures, exhaustive per-component CSS mapping tables, hover/focus states, form element tables, color palette audit, typography audit, carousel behavior, conditional content, z-index. If BB-53's plan needs any of these, re-run in full mode or narrow-scope for the specific gap.
