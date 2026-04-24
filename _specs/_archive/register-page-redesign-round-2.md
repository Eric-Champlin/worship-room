# Register Page Redesign — Round 2 (Amendment)

**Status:** Amendment to `_specs/register-page-redesign.md`. Read the original first — this document only covers diffs from Round 1.

**Master Plan Reference:** N/A — standalone feature polish, building on Round 1.

**Branch:** `claude/feature/register-page-redesign` (same branch as Round 1 — do NOT branch from main).

---

## ⚠️ CRITICAL EXECUTION RULES (read before planning/coding)

1. **CC MUST stay on `claude/feature/register-page-redesign`.** Do NOT cut a new branch, `git checkout main`, merge, rebase, or reset. Round 2 changes are additional commits stacked on top of the Round 1 commit on the existing branch. If Round 1 is not yet committed, Round 2 changes may be combined into the same commit at the user's discretion — but the branch does not change either way.
2. **CC does not run git commands.** The user handles all git operations manually. CC only edits source files.
3. **If CC finds itself on `main` or any branch other than `claude/feature/register-page-redesign` when starting execution, STOP and surface that to the user.** Do not proceed until the user confirms the branch is correct.
4. **No new files** are introduced in Round 2 except optionally a CSS keyframe addition in `frontend/src/index.css` or `frontend/tailwind.config.ts` (see Change 4). Every other change is to files already touched in Round 1.

---

## Overview

Round 1 shipped the register page hero + pillars + differentiator layout but had four rough edges:

1. "Free forever" language makes legal promises we can't guarantee if a premium tier ever ships.
2. `<GlowBackground variant="center">` wrapped only the hero, leaving a visible seam where the glow ended and flat `bg-hero-bg` took over.
3. 5 pillar cards produced an awkward `3 + 2` desktop layout with uneven card heights.
4. Scroll interactions were limited to basic fade + translate.

Round 2 resolves all four. The page should feel like a continuous, breathing sanctuary that descends smoothly from hero to footer, with truthful copy, a 6-pillar `3 × 2` grid of equal-height cards, and tasteful scroll/shimmer animations that respect `prefers-reduced-motion`.

## User Story

As a logged-out visitor considering signing up, I want the register page to feel like a cohesive, polished, honest marketing surface so that I trust the product and form an accurate expectation of what "free" means before I create an account.

## Requirements

### Functional Requirements

1. **Copy edits (no "free forever" claims)** — remove 4 specific phrases from Round 1 copy and replace with honest, specific alternatives. See "Change 1" below for exact strings.
2. **Continuous full-page glow** — a single `<GlowBackground variant="fullPage">` wraps `<main>` so orbs distribute across the full scroll length. No visual seams between sections.
3. **Six pillar cards** — add a 6th pillar (DISCOVER) so the grid lays out as a clean `3 × 2` on desktop, `2 × 3` on tablet, `1 × 6` on mobile. All cards in a row must be the same height.
4. **Scoped scroll animations** — add gradient-shift shimmer on hero H1, shine sweep on the two primary CTAs, and hover-lift on pillar + spotlight cards. All respect `prefers-reduced-motion`.

### Non-Functional Requirements

- **Performance:** Lighthouse Performance score ≥ 85 on `/register`. Bundle size delta vs. Round 1 < 2 KB.
- **Accessibility:** WCAG 2.2 AA. All new animations respect `prefers-reduced-motion: reduce`. Keyboard tab order unchanged (all new animations are decorative).
- **No new dependencies.** Framer Motion, GSAP, react-spring, Lottie, etc. are all explicitly out of scope.

## Change 1 — Remove "free forever" language

**Why:** A premium/pro tier is a future possibility. "Free forever" on a landing page is a legal promise that becomes bait-and-switch if pricing ever changes. Replace blanket eternal-free claims with specific, truthful statements: "No credit card to sign up", "No ads", "No upsells that interrupt you mid-prayer".

### Copy diffs (Round 1 → Round 2)

| Section | Round 1 copy | Round 2 copy |
|---|---|---|
| Hero subtitle | "A free, peaceful space for prayer, Scripture, community, and rest. Eighty-two features. Zero ads. No credit card." | "A peaceful space for prayer, Scripture, community, and rest. Eighty-two features. No ads. No credit card to sign up." |
| Pillars section heading | "Everything included. Free forever." | "Everything included when you sign up." |
| Pillars section subtitle | "Eighty-two shipped features across five pillars. No paywalls. No premium tier. No upsells inside the app." | "Eighty-two shipped features across six pillars. No ads. No dark patterns. No upsells that interrupt you mid-prayer." |
| Differentiator item #1 | "Free forever — no subscriptions, no trial periods, no 'premium' tier." | "No ads, ever. Your worship time is not monetizable through interruption." |
| Differentiator item #2 | "No ads. Your worship time is sacred, not monetizable." | (REMOVED — folded into the updated item #1) |
| Hero primary CTA | "Create Your Free Account" | "Create Your Account" |
| Final CTA button | "Create Your Free Account" | "Create Your Account" |
| Final reassurance line | "No credit card. No trial period. Just peace." | "No credit card. No commitment. Just peace." |

### Differentiator checklist (8 items after Round 2 edits)

Because item #2 was folded into item #1, one new item is added at position #5 to keep the count at 8 (visual balance for tablet `4 × 2` / desktop layouts):

1. No ads, ever. Your worship time is not monetizable through interruption.
2. No data harvesting. Your prayers and journal entries stay private.
3. Grace-based streaks that celebrate presence, never punish absence.
4. The entire Bible is free to read — no account required.
5. Your prayers, journals, and bookmarks are yours. Export or delete them anytime.
6. Crisis keyword detection with real hotline resources when you need them.
7. Works offline as an installable app (iOS, Android, desktop).
8. Real accessibility — WCAG 2.2 AA audited, not an afterthought.

---

## Change 2 — Continuous full-page glow background

**Why:** Round 1 `<GlowBackground variant="center">` wraps only the hero. Every section below sits on flat `bg-hero-bg`, creating a visible seam where orbs abruptly stop.

### 2a. Add a new `fullPage` variant to `GlowBackground.tsx`

**File:** `frontend/src/components/homepage/GlowBackground.tsx`

Add `fullPage` to the `GLOW_CONFIG` object and to the `variant` prop union type. The `fullPage` variant distributes orbs across a long-scroll page (roughly 0–500vh of content), not concentrated near the top.

Orb config for `fullPage` variant (append to `GLOW_CONFIG`):

```ts
fullPage: [
  // Near hero (top viewport)
  {
    opacity: 0.25,
    color: '139, 92, 246',
    size: 'w-[300px] h-[300px] md:w-[600px] md:h-[600px]',
    position: 'top-[5%] left-1/2 -translate-x-1/2',
  },
  // Upper-right, roughly behind pillars section
  {
    opacity: 0.18,
    color: '168, 130, 255',
    size: 'w-[250px] h-[250px] md:w-[450px] md:h-[450px]',
    position: 'top-[30%] left-[85%] -translate-x-1/2',
  },
  // Mid-left, behind dashboard preview / spotlight
  {
    opacity: 0.20,
    color: '139, 92, 246',
    size: 'w-[280px] h-[280px] md:w-[500px] md:h-[500px]',
    position: 'top-[55%] left-[10%] -translate-x-1/2',
  },
  // Lower-right, behind differentiator checklist
  {
    opacity: 0.16,
    color: '186, 156, 255',
    size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]',
    position: 'top-[75%] left-[80%] -translate-x-1/2',
  },
  // Near bottom, behind final CTA
  {
    opacity: 0.22,
    color: '139, 92, 246',
    size: 'w-[260px] h-[260px] md:w-[500px] md:h-[500px]',
    position: 'top-[92%] left-[50%] -translate-x-1/2',
  },
] as const,
```

Update the `variant` prop type and the internal `GlowOrbs` prop type:

```ts
variant?: 'center' | 'left' | 'right' | 'split' | 'fullPage' | 'none'
```

```ts
function GlowOrbs({ variant, glowOpacity }: { variant: 'center' | 'left' | 'right' | 'split' | 'fullPage'; glowOpacity?: number }) {
```

Everything else in the component is already variant-agnostic — it reads the orb array from `GLOW_CONFIG[variant]` and renders them absolutely positioned.

### 2b. Restructure `RegisterPage.tsx` to use one top-level `<GlowBackground variant="fullPage">`

**Before (Round 1 — conceptual):**

```tsx
<div className="bg-dashboard-dark">
  <Navbar />
  <main>
    <GlowBackground variant="center">
      <section>Hero</section>
    </GlowBackground>
    <section>Hook/Promise</section>
    <StatsBar />
    <section>Five Pillars</section>
    <DashboardPreview />
    <section>Spotlight</section>
    <section>Differentiator Checklist</section>
    <section>Content Depth</section>
    <section>Final CTA</section>
  </main>
  <SiteFooter />
</div>
```

**After (Round 2):**

```tsx
<div className="min-h-screen bg-hero-bg font-sans">
  <SEO {...REGISTER_METADATA} />
  <Navbar transparent />
  <GlowBackground variant="fullPage">
    <main id="main-content" className="relative z-10">
      <section>Hero (no inner GlowBackground — orbs come from the wrapper)</section>
      <section>Hook/Promise</section>
      <StatsBar />
      <section>Six Pillars</section>
      <DashboardPreview />
      <section>Spotlight</section>
      <section>Differentiator Checklist</section>
      <section>Content Depth</section>
      <section>Final CTA</section>
    </main>
  </GlowBackground>
  <SiteFooter />
</div>
```

**Key structural changes:**

1. Remove the inner `<GlowBackground variant="center">` that wrapped only the hero in Round 1. The hero is now just a plain `<section>`.
2. Wrap the entire `<main>` in a single `<GlowBackground variant="fullPage">`. The wrapper's internal `relative overflow-clip bg-hero-bg` covers the whole page with one flowing glow field.
3. SiteFooter stays OUTSIDE the GlowBackground — footers should be solid, not glowy.
4. Delete any ad-hoc `bg-hero-bg` classes on individual sections from Round 1. The wrapper provides the background; sections should have `bg-transparent` or no background class. **Exception:** `<StatsBar>` and `<DashboardPreview>` are shared components with their own internal `<GlowBackground>` — leave those untouched; they layer harmlessly on top of the page wrapper since children render in a `z-10` layer.
5. If any section was using `<GlowBackground variant="none">` as a styling hack in Round 1, remove it and let the wrapper handle it.

### 2c. CSS overflow + positioning

The existing `GlowBackground` root uses `overflow-clip`, which is fine for a full-page wrapper — orbs will be clipped to the page's content box. Because orbs are `position: absolute` with `top:` percentages, they position relative to the GlowBackground wrapper's total scroll height (not the viewport). That's the whole point of `fullPage` — orbs distribute across the full scrollable length.

If the initial render of `top-[5%]` and `top-[92%]` feels "off" once the real content length is measured, adjust the percentages in `GLOW_CONFIG.fullPage` during implementation.

### 2d. Animation on fullPage orbs

The orbs already inherit `animate-glow-float motion-reduce:animate-none` from the base `ORB_BASE` constant in `GlowBackground.tsx`. They animate automatically. No new keyframes needed for Change 2.

---

## Change 3 — Six pillars (was five), all equal height

### 3a. Add a sixth pillar: DISCOVER

**Why:** Round 1's 5 pillars (Pray/Read/Grow/Rest/Belong) covered the core user-facing verbs but left out the surprise-and-delight micro-features — the things that make visitors say "oh that's actually cool." The 6th pillar **DISCOVER** showcases them.

**Pillar 6 — DISCOVER** (Lucide icon: `Sparkles`)

- Tagline: "Small moments of surprise the app quietly plans for you."
- Features (5):
  - Midnight verse reveal when you're up past 11 PM
  - Verse echoes: we bring back what you highlighted months ago
  - Song of the Day: 30 rotating worship tracks to discover
  - Seasonal banners for Advent, Lent, Easter, and more
  - Anniversary celebrations on your 30-day, 100-day, and 1-year marks

### 3b. Grid layout — 3 × 2 on desktop, equal-height cards

Grid classes stay the same: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. With 6 items the desktop layout is now a clean `3 × 2`.

**Equal-height fix:** Each pillar card must fill its grid cell regardless of tagline/feature length.

Before implementing, verify whether `FrostedCard` accepts a `className` prop and passes it through (it almost certainly does — check the component). Whichever mechanism it supports natively is the one to use:

- Preferred: pass `className="h-full"` to `<FrostedCard>` directly.
- Fallback: wrap each `<FrostedCard>` in a `<div className="h-full">`.

**Internal card layout for equal heights:**

```tsx
<FrostedCard className="h-full">
  <div className="flex h-full flex-col">
    {/* Icon */}
    <div className="mb-4">
      <PillarIcon size={32} className="text-white" aria-hidden="true" />
    </div>

    {/* Name + tagline */}
    <h3 className="mb-2 text-xl font-semibold text-white">{pillarName}</h3>
    <p className="mb-4 text-sm leading-relaxed text-white/80">{pillarTagline}</p>

    {/* Feature list — mt-auto pushes it to the bottom */}
    <ul className="mt-auto space-y-1.5 text-sm text-white/80">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check size={16} className="mt-0.5 flex-shrink-0 text-white" aria-hidden="true" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </div>
</FrostedCard>
```

The `mt-auto` on the `<ul>` is the key trick — it pushes the feature list toward the bottom of the flex container so cards with shorter taglines align their feature lists at the same vertical position as cards with longer taglines. Combined with `h-full` on the card, every card in a row is the same height.

### 3c. Feature-count consistency

All 6 pillars must have **exactly 5 features** listed:

- PRAY: 5 ✓
- READ: 5 ✓
- GROW: 5 ✓
- REST: 5 ✓
- BELONG: 5 ✓
- DISCOVER: 5 (new — listed above)

---

## Change 4 — Scoped scroll-triggered animations

**Why:** Round 1's page is mostly static-fade-on-enter. The page should feel like it's breathing as you descend it, without tipping into slick-marketing-site territory. Use existing primitives only (`useScrollReveal`, Tailwind utilities, existing `animate-glow-float` keyframe). No new dependencies.

### 4a. In scope

| Animation | Where | How |
|---|---|---|
| Fade + translate-up on enter viewport | Every major section (8 total) | `useScrollReveal` + `scroll-reveal` / `is-visible` classes (already in codebase) |
| Staggered entry within sections | Pillar grid (6 cards), Spotlight grid (3 cards), Differentiator list (8 items), StatsBar (8 counters) | `staggerDelay(index)` helper (already in codebase) |
| Slow parallax drift on fullPage orbs | GlowBackground `fullPage` variant | Existing `animate-glow-float` keyframe — no code change |
| Counter animations on StatsBar | StatsBar numbers | Already via `useAnimatedCounter` — no change |
| Gradient-shift on hero H1 | Hero heading only | New `animate-gradient-shift` keyframe (see 4c), ~12s cycle, infinite, `motion-reduce:animate-none` |
| Hover lift on pillar + spotlight cards | All 9 cards (6 pillars + 3 spotlight) | `transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5` |
| "Shine" on primary CTAs | Hero CTA + Final CTA ONLY (not every white pill) | New `animate-shine` keyframe (see 4c), 6s loop with 2s delay |

### 4b. Explicitly OUT of scope

To keep Round 2 focused:

- ❌ No scroll-synced animations (e.g. "as you scroll, this rotates")
- ❌ No text character-by-character reveal animations
- ❌ No new animation libraries (Framer Motion, GSAP, react-spring, Lottie)
- ❌ No hero video or animated SVG illustrations
- ❌ No cursor-following effects
- ❌ No page-load splash screen
- ❌ No custom scrollbar styling
- ❌ No 3D transforms or perspective effects

If CC is tempted to add any of the above "for polish," STOP and surface to the user before proceeding.

### 4c. Two new keyframes

**Location:** Either `frontend/src/index.css` (preferred — simpler) or `frontend/tailwind.config.ts` under `keyframes` + `animation` extensions. Pick the file that matches the existing pattern used by `animate-glow-float` and follow the same pattern.

**Keyframe 1 — `gradient-shift` (hero H1):**

```css
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-gradient-shift {
  background-size: 200% 200%;
  animation: gradient-shift 12s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-gradient-shift {
    animation: none;
  }
}
```

**Keyframe 2 — `shine` (hero CTA + final CTA ONLY):**

```css
@keyframes shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shine {
  position: relative;
  overflow: hidden;
}

.animate-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: shine 6s ease-in-out infinite;
  animation-delay: 2s;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .animate-shine::after {
    animation: none;
    opacity: 0;
  }
}
```

### 4d. Where to apply

- **Hero H1:** add className `animate-gradient-shift` alongside existing gradient styles.
- **Hero CTA button:** add className `animate-shine`.
- **Final CTA button:** add className `animate-shine`.
- **Pillar cards (6):** add classNames `transition-transform duration-base motion-reduce:transition-none hover:-translate-y-0.5` to the outer `<FrostedCard>` (or the wrapper div if needed).
- **Spotlight cards (3):** same as pillar cards.
- **Nothing else** gets new animations beyond what Round 1 already specified with `useScrollReveal`.

### 4e. Performance check

After implementing, CC runs `pnpm build` and confirms the bundle size delta is < 2 KB. Two keyframes + Tailwind utility classes is essentially free — anything larger means a new dependency snuck in.

---

## Auth Gating

Round 2 introduces no new interactive elements that need auth gates. All auth behavior is inherited from Round 1:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click hero CTA ("Create Your Account") | Opens auth modal / navigates to sign-up (inherited from Round 1) | Same as Round 1 | (inherited from Round 1) |
| Click final CTA ("Create Your Account") | Same as hero CTA (inherited) | Same as Round 1 | (inherited) |
| Scroll / hover / view page | Free — no auth required | Free — no auth required | N/A |
| Hover over a pillar or spotlight card | Decorative 2px lift, no action | Decorative 2px lift, no action | N/A |

**No new auth gates required.** The animations are decorative-only. The copy edits change strings only, not gated behaviors.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px / 375px target) | Pillars stack 1 × 6. FullPage glow orbs render at smaller sizes (`w-[250-300px]`). Hero CTA and final CTA remain full-width. Shine animation still runs. |
| Tablet (640–1024px / 768px target) | Pillars lay out 2 × 3. Differentiator checklist lays out 4 × 2. FullPage orbs transition to larger `md:` sizes. Hover-lift suppressed on touch devices (via `@media (hover: hover)` or Tailwind's default — cards still accept click). |
| Desktop (≥ 1024px / 1440px target) | Pillars lay out 3 × 2 (clean grid, no orphan row). Differentiator checklist lays out 4 × 2. All animations active. Orbs use full `md:` sizes. |

**Equal-height invariant must hold at every breakpoint.** On mobile (1-column) this is trivially true. On tablet (2-column) cards within each row must match. On desktop (3-column) cards within each row must match.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No data written. Scrolling, hovering, and viewing the page persist nothing. (Aligns with `02-security.md` demo-mode zero-persistence policy.)
- **Logged-in users:** No data written. The register page is a marketing/sign-up surface — it does not track page visits, hover interactions, or scroll depth.
- **localStorage usage:** No new keys. No existing keys read or written. (Round 2 adds no keys to the `11-local-storage-keys.md` inventory.)

## Completion & Navigation

N/A — `/register` is a standalone marketing surface, not part of the Daily Hub completion tracking system.

## Design Notes

- **GlowBackground component inventory:** adds a new `fullPage` variant to `frontend/src/components/homepage/GlowBackground.tsx`. Existing `center`/`left`/`right`/`split`/`none` variants are untouched. Document the new variant in `.claude/rules/09-design-system.md` at execute-time under the GlowBackground entry.
- **FrostedCard usage:** reuse existing `FrostedCard` component. Verify `className` passthrough on first read; use `h-full` via the supported mechanism.
- **Lucide icon for DISCOVER pillar:** `Sparkles` (already imported elsewhere in the codebase).
- **Animation tokens:** `transition-transform duration-base` — `duration-base` is a project token from `frontend/src/constants/animation.ts` / Tailwind config. Do not hardcode `200ms` or raw `cubic-bezier(...)`. Confirm `duration-base` resolves to the expected value during execution.
- **Reduced-motion compliance:** every new animation MUST respect `prefers-reduced-motion: reduce` via `motion-reduce:*` Tailwind utilities or `@media (prefers-reduced-motion: reduce) { animation: none; }` in CSS. Global reduced-motion safety net exists at `frontend/src/styles/animations.css` — verify it catches anything we miss.
- **No new visual patterns are introduced** beyond the `fullPage` glow variant and the two keyframes. `gradient-shift` and `shine` are register-page-scoped and should not bleed into other pages.

## Files Changed in Round 2

| File | Change type |
|---|---|
| `frontend/src/pages/RegisterPage.tsx` | Major: Change 1 (copy), Change 2 (structural restructure), Change 3 (6th pillar + equal-height cards), Change 4 (animation classNames) |
| `frontend/src/components/homepage/GlowBackground.tsx` | Minor: add `fullPage` variant to `GLOW_CONFIG` and union type |
| `frontend/src/index.css` OR `frontend/tailwind.config.ts` | Minor: add `gradient-shift` and `shine` keyframes (pick file matching existing pattern) |
| `frontend/src/pages/__tests__/RegisterPage.test.tsx` | Update: assert 6 pillar cards, assert 8 differentiator items with new copy, assert no "free forever" string, assert `animate-gradient-shift` on H1 |
| `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` | Add case: `variant="fullPage"` renders 5 orbs with correct positions |

**No new files created.**
**No changes to `StatsBar.tsx`, `DashboardPreview.tsx`, `FrostedCard.tsx`, `SiteFooter.tsx`, `Navbar.tsx`, or any other shared component.**

## Testing Plan (Round 2 additions only)

On top of Round 1's test plan:

**Unit tests:**
- RegisterPage renders exactly 6 pillar cards (not 5).
- RegisterPage renders exactly 8 differentiator items using the new Round 2 strings (e.g. "No ads, ever. Your worship time is not monetizable through interruption.").
- RegisterPage does NOT contain the string "free forever" (case-insensitive).
- RegisterPage does NOT contain the string "premium tier" (case-insensitive).
- RegisterPage does NOT contain the string "no trial" (case-insensitive).
- RegisterPage H1 has className `animate-gradient-shift`.
- Hero CTA and Final CTA elements have className `animate-shine`.
- GlowBackground accepts `variant="fullPage"` and renders 5 orbs with the specified positions.
- Home page HeroSection / landing page unchanged — explicit snapshot or variant-prop test on HeroSection still passes.

**Manual QA:**
- Scroll `/register` top → footer: glow is continuous, no seams between sections.
- Hero H1 visibly shimmers over a ~12-second cycle.
- Hover each pillar card → 2px lift animates smoothly.
- Hover each spotlight card → 2px lift animates smoothly.
- Toggle `prefers-reduced-motion: reduce` in DevTools: all new animations stop (orbs freeze, H1 stops shimmering, CTAs stop shining, hover lifts disabled).
- 1440px viewport: pillar grid is 3 × 2, all cards equal height.
- 768px viewport: pillar grid is 2 × 3, cards equal height per row.
- 375px viewport: pillar grid stacks 1 × 6.
- Final CTA button: scroll into view, wait 2 seconds, shine sweep visible.

**Accessibility:**
- Axe extension: 0 critical issues.
- All new animations respect `prefers-reduced-motion`.
- Keyboard tab order unchanged (animations are decorative, not functional).

## Out of Scope

- Dark/light mode toggle on register page
- Video backgrounds or hero video
- Testimonials or user quotes (no real users yet)
- A/B testing different CTA copy
- Localization / i18n
- Skeleton loading states (page is mostly static, not data-driven)
- Pricing teaser ("premium coming soon" banner) — explicitly OUT, don't foreshadow what doesn't exist yet
- New animation libraries (Framer Motion, GSAP, react-spring, Lottie)
- Scroll-synced, cursor-following, or 3D transform effects

## Acceptance Criteria

After Round 2 is implemented, a reviewer opens `/register` and verifies every item below:

- [ ] Page scrolls from top to footer with continuous floating glow — no visible seams between sections.
- [ ] Hero subtitle reads "A peaceful space for prayer, Scripture, community, and rest. Eighty-two features. No ads. No credit card to sign up." (not "Free forever", not "Zero ads").
- [ ] Pillars section heading reads "Everything included when you sign up."
- [ ] Pillars section subtitle references "six pillars" (not "five").
- [ ] Exactly 6 pillar cards render: Pray / Read / Grow / Rest / Belong / Discover.
- [ ] DISCOVER pillar icon is Lucide `Sparkles`.
- [ ] DISCOVER pillar features (5): Midnight verse reveal past 11 PM / Verse echoes / Song of the Day (30 tracks) / Seasonal banners (Advent, Lent, Easter, etc.) / Anniversary celebrations (30-day, 100-day, 1-year).
- [ ] All 6 pillar cards in a given row are visually equal height (top border to bottom border, ±1 px).
- [ ] Feature bullet lists within cards align at the same vertical position across row-mates (achieved via `mt-auto` on the `<ul>`).
- [ ] At 1440px viewport, pillar grid lays out 3 × 2.
- [ ] At 768px viewport, pillar grid lays out 2 × 3.
- [ ] At 375px viewport, pillar grid stacks 1 × 6.
- [ ] All 6 pillar icons render `text-white` (no `text-primary` regressions).
- [ ] Differentiator checklist renders exactly 8 items with the Round 2 copy above.
- [ ] Hero CTA button text reads "Create Your Account" (not "Create Your Free Account").
- [ ] Final CTA button text reads "Create Your Account".
- [ ] Final reassurance line reads "No credit card. No commitment. Just peace." (not "No trial period").
- [ ] `grep -i "free forever"` on the rendered register page returns zero matches.
- [ ] `grep -i "premium tier"` on the rendered register page returns zero matches.
- [ ] `grep -i "no trial"` on the rendered register page returns zero matches.
- [ ] Hero H1 element has className `animate-gradient-shift` and visibly shimmers over a ~12-second cycle.
- [ ] Hero CTA and final CTA have className `animate-shine` and display a subtle shine sweep starting ~2 seconds after entering the viewport, looping every 6 seconds.
- [ ] All 6 pillar cards + 3 spotlight cards lift 2 px on hover (via `hover:-translate-y-0.5`) with `transition-transform duration-base`.
- [ ] `prefers-reduced-motion: reduce` suppresses: orb float, gradient shimmer, shine sweep, hover lift. No animation runs when the media query is active.
- [ ] `GlowBackground` accepts `variant="fullPage"` and renders 5 orbs at the documented positions.
- [ ] `SiteFooter` renders outside the `<GlowBackground>` wrapper on its original solid background (no orbs behind it).
- [ ] `StatsBar` and `DashboardPreview` still render correctly — their internal `<GlowBackground>` layers harmlessly on top of the page wrapper.
- [ ] Home page (`/`) renders unchanged — no regression on `HeroSection` or any other `<GlowBackground variant="center">` consumer.
- [ ] `pnpm build` succeeds. Bundle size delta vs. Round 1 baseline < 2 KB.
- [ ] `pnpm install` does not add new npm dependencies (no Framer Motion, GSAP, react-spring, Lottie).
- [ ] Lighthouse Performance score ≥ 85 on `/register`.
- [ ] Axe extension reports 0 critical accessibility issues on `/register`.
- [ ] All Round 1 acceptance criteria still pass (no regressions).
- [ ] CC stayed on branch `claude/feature/register-page-redesign` throughout execution (no branch switches, no git commands run by CC).
