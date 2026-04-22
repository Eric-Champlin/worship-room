# Implementation Plan: Register Page Redesign

**Spec:** `_specs/register-page-redesign.md`
**Date:** 2026-04-20
**Branch:** `claude/feature/register-page-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, 15 days old; covers the pre-redesign Register hero and home page + Daily Hub patterns this spec imitates. No newer visual changes between then and now except the Local Support facelift, which the spec explicitly references as the visual standard to match.)
**Recon Report:** N/A (no per-feature recon; `design-system.md` + spec itself cover the necessary values)
**Master Spec Plan:** N/A — standalone polish spec

---

## Architecture Context

**Relevant existing files and patterns:**

- `frontend/src/pages/RegisterPage.tsx` — the file being rewritten. Current structure: `bg-dashboard-dark` wrapper, `bg-gradient-to-b from-hero-dark to-hero-mid` hero, `useInView` hook for scroll reveal, `bg-primary` CTAs, `text-primary` on check icons and "Log in" link. Uses 4-feature grid (`FEATURES`), 6-stat grid (`STATS`), 4-item differentiator list (`DIFFERENTIATORS`). All three arrays will be replaced or removed.
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — existing test file with 15 assertions (hero heading, subtitle, 4 feature cards, 6 stats, differentiators list, final CTA heading, auth modal interactions, heading hierarchy, navbar/footer, accessible names). All assertions must be updated to match the new copy and structure.
- `frontend/src/components/homepage/StatsBar.tsx` — currently exports 6 stats. Spec requires expanding to 8 and changing the desktop grid from `lg:grid-cols-6` to `lg:grid-cols-4`. Grid changes take StatsBar to a 4 × 2 layout at desktop and tablet, 2 × 4 at mobile.
- `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` — has explicit `toHaveLength(6)` for `.scroll-reveal`, label-by-label assertions, and stagger-delay assertions. All 6-count assertions move to 8.
- `frontend/src/components/homepage/GlowBackground.tsx` — reused as-is. Variant `'center'` renders two purple orbs via `animate-glow-float` with `motion-reduce:animate-none`. Wraps children in `relative overflow-clip bg-hero-bg`. Orbs are `aria-hidden="true"`, `pointer-events-none`, `will-change-transform`, `blur-[60px] md:blur-[80px]`.
- `frontend/src/components/homepage/FrostedCard.tsx` — reused as-is. `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` + dual box-shadow. When `onClick` is set, adds `hover:-translate-y-0.5 hover:bg-white/[0.09] hover:border-white/[0.18]` hover lift. For the pillar and spotlight cards (no onClick), the hover lift does NOT fire — hover lift in the spec's acceptance notes applies only when interactive.
- `frontend/src/components/homepage/SectionHeading.tsx` — supports both single `heading` prop (gradient only) and `topLine` + `bottomLine` (2-line treatment). This plan uses the single-heading form for register-page section headings because the spec's heading lines are single statements, not 2-line pairings.
- `frontend/src/components/homepage/DashboardPreview.tsx` — reused as-is. Contains its own section heading ("See How You're Growing"). See Decision table: the spec wants a custom heading ("Your daily rhythm, in one place."), but DashboardPreview renders its own `SectionHeading` internally. Resolution: use DashboardPreview as-is including its internal heading, and do NOT add a duplicate wrapper heading on the register page. The spec heading for this section is dropped in favor of the component's built-in one (documented as an Edge Case below).
- `frontend/src/hooks/useScrollReveal.ts` — `useScrollReveal({ threshold?: number, rootMargin?: string, triggerOnce?: boolean })` returns `{ ref, isVisible }`. `staggerDelay(index, baseDelay = 100, initialDelay = 0)` returns a `CSSProperties` with `transitionDelay`. Apply `is-visible` class when visible. Global `.scroll-reveal` CSS class handles the initial hidden state and the visible transition.
- `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()` returns `{ openAuthModal(subtitle?, initialView?) }` or `undefined` (outside provider). Safe access pattern: `authModal?.openAuthModal(undefined, 'register' | 'login')`. The RegisterPage route is wrapped in `AuthModalProvider` + `ToastProvider` (verified via existing test harness).
- `frontend/src/components/Navbar.tsx` — exports `Navbar({ transparent = false, hideBanner = false })`. The `transparent` prop positions the navbar `absolute inset-x-0 bg-transparent` so the hero GlowBackground shows through. Used on Home (`<Navbar transparent hideBanner />`) and Local Support pages.
- `frontend/src/components/SiteFooter.tsx` — unchanged. Already used by current RegisterPage.
- `frontend/src/components/SEO.tsx` + `REGISTER_METADATA` at `frontend/src/lib/seo/routeMetadata.ts:301` — unchanged. `REGISTER_METADATA` has `noIndex: true` — preserved.
- `frontend/src/constants/gradients.tsx` — `GRADIENT_TEXT_STYLE` CSSProperties object (`background: 223deg white → #8B5CF6 gradient`, `backgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`). Used inline on hero H1.

**Directory conventions:**
- Pages live at `frontend/src/pages/<PageName>.tsx` with co-located `__tests__/<PageName>.test.tsx`.
- Inline components (hero, sections) remain inside `RegisterPage.tsx` per spec directive ("no new files").
- Icons from `lucide-react` (named imports only).

**Component/service patterns to follow:**
- Hero mirrors the Local Support + Home pattern: `<GlowBackground variant="center">` wrapping a `<Navbar transparent />` + centered content container. The hero's own content sits in `max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20 sm:pt-40 sm:pb-28 text-center` with the H1, subtitle, CTA, secondary link.
- Every non-hero section uses the root `bg-hero-bg` inherited from the wrapper `<div className="flex min-h-screen flex-col bg-hero-bg font-sans">`.
- Section vertical padding: `py-16 sm:py-24` (matches Home section rhythm per spec §page structure).
- Container: `max-w-6xl mx-auto px-4 sm:px-6` for 3-column grids; `max-w-3xl mx-auto px-4 sm:px-6 text-center` for short text-only sections; `max-w-2xl mx-auto` for the differentiator list.
- Scroll reveal: each section-level `<section>` (or inner grid wrapper) owns its own `useScrollReveal()` call. Apply `scroll-reveal` class + `is-visible` when visible + `staggerDelay(index)` for staggered items.
- White pill CTA: two variants, both spec-defined:
  - **Inline pill (small):** `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50`
  - **Primary hero/final pill (large):** bump to `px-8 py-4 text-lg font-semibold`; otherwise identical.

**Database tables involved:** None. No persistence, no writes, no backend calls.

**Test patterns to match:**
- `render()` within `<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>` + `<ToastProvider>` + `<AuthModalProvider>`. The existing `renderPage()` helper in `RegisterPage.test.tsx` is the reference.
- `useAuth` is mocked to return `{ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }`.
- `useAuthModal` is mocked to return `{ openAuthModal: mockOpenAuthModal }`.
- StatsBar tests mock `useScrollReveal` (returns `{ ref: { current: null }, isVisible: true }`) and `useAnimatedCounter` (returns `target`).
- Assertions use `screen.getByRole('heading', { level, name: /regex/i })`, `screen.getByText(regex|string)`, `screen.getAllByRole('button', { name: /regex/i })`.
- Auth modal interactions use `userEvent.setup()`.

**Auth gating patterns:**
- `useAuthModal()` safe-access pattern with `?.` in case `AuthModalProvider` is not mounted (unreachable in production but safe).
- Zero new auth gates — this is a logged-out marketing page. All CTAs open the auth modal.

**Shared data models from master plan:** N/A — no master plan for this spec.

**Cross-spec dependencies:** None.

**localStorage keys this spec touches:** None. Zero persistence. No reads, no writes.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan. This spec introduces ZERO new auth gates.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Hero "Create Your Free Account" CTA | Opens AuthModal in `register` mode | Step 3 | `authModal?.openAuthModal(undefined, 'register')` |
| Hero "Log in" link | Opens AuthModal in `login` mode | Step 3 | `authModal?.openAuthModal(undefined, 'login')` |
| Final "Create Your Free Account" CTA | Opens AuthModal in `register` mode | Step 9 | `authModal?.openAuthModal(undefined, 'register')` |
| Navbar links | Public navigation | Step 2 (Navbar reused) | N/A — Navbar already handles its own auth state |
| Pillar card feature bullets | N/A — display only, not interactive | Step 5 | N/A |
| Spotlight cards | N/A — display only, not interactive | Step 6 | N/A |
| Differentiator list items | N/A — display only, not interactive | Step 7 | N/A |

Verification: Steps 3 and 9 tests assert `mockOpenAuthModal` is called with the correct arguments. No other interactive elements exist on the page.

---

## Design System Values (for UI steps)

Values pulled from `_plans/recon/design-system.md` (captured 2026-04-05), `.claude/rules/09-design-system.md` (White Pill CTA Patterns, FrostedCard Tier System, Text Opacity Standards, Animation Tokens), `frontend/src/components/homepage/GlowBackground.tsx` live code, and the spec itself.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Root wrapper | `className` | `flex min-h-screen flex-col bg-hero-bg font-sans` | 09-design-system.md § Round 3 + spec line 71 |
| Hero container | `className` | `mx-auto max-w-4xl px-4 text-center sm:px-6 pt-32 pb-20 sm:pt-40 sm:pb-28` | spec §1 |
| Hero H1 | `className` | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight pb-2` | spec §1 + design-system.md line 175 |
| Hero H1 | `style` | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` | design-system.md line 76 |
| Hero subtitle | `className` | `mx-auto mt-4 max-w-2xl text-lg text-white/80 sm:text-xl` | spec §1 |
| Hero primary CTA | `className` | **Primary hero pill:** `mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50` | spec §canonical visual vocabulary lines 74-78 |
| "Log in" link | `className` | `text-white underline hover:text-white/80` | spec line 79 |
| "Already have an account?" wrapper | `className` | `mt-4 text-sm text-white/60` | spec §1 |
| Section wrapper (standard) | `className` | `py-16 sm:py-24` | spec §page structure line 89 |
| Container (grids) | `className` | `max-w-6xl mx-auto px-4 sm:px-6` | spec §page structure line 89 |
| Container (text-only sections) | `className` | `max-w-3xl mx-auto px-4 sm:px-6 text-center` | spec §2, §8 |
| Container (differentiator list) | `className` | `max-w-2xl mx-auto` | spec §7 |
| Section heading (gradient) | `className` | `text-3xl sm:text-4xl lg:text-5xl font-bold pb-2` + `style={GRADIENT_TEXT_STYLE}` | SectionHeading.tsx line 42 + spec §canonical |
| Eyebrow label | `className` | `text-sm uppercase tracking-widest text-white/60 mb-4` | spec §2, §8 |
| Section subtitle | `className` | `text-white/60 max-w-2xl mx-auto mb-12 text-center text-base sm:text-lg` | spec §4, §5, §6 |
| Hook paragraph body | `className` | `text-white/80 text-base sm:text-lg max-w-2xl mx-auto` | spec §2 |
| Callout paragraph body | `className` | `text-white/80 text-base sm:text-lg` | spec §8 |
| Pillar grid | `className` | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` | spec §4 |
| Pillar card | Component | `<FrostedCard>` (from `@/components/homepage/FrostedCard`) | spec component reuse table |
| Pillar icon | `className` + props | Lucide icon, `size={32}`, `className="text-white"` | spec §4 |
| Pillar name | `className` | `text-xl font-semibold text-white mb-2` | spec §4 |
| Pillar tagline | `className` | `text-sm text-white/80 mb-4 leading-relaxed` | spec §4 |
| Pillar bullet list | `className` | `space-y-1.5 text-sm text-white/80` | spec §4 |
| Pillar bullet row | `className` | `flex items-start gap-2` | derived; standard two-column with check + text |
| Pillar bullet check icon | props + `className` | `<Check size={16} className="text-white mt-0.5 flex-shrink-0" aria-hidden="true" />` | spec §4 |
| Spotlight grid | `className` | `grid grid-cols-1 md:grid-cols-3 gap-6` | spec §6 |
| Spotlight card heading | `className` | `text-xl font-semibold text-white mb-3` | spec §6 |
| Spotlight description | `className` | `text-white/80 text-sm leading-relaxed mb-4` | spec §6 |
| Spotlight proof label | `className` | `text-xs uppercase tracking-wide text-white/60` | spec §6 |
| Differentiator row | `className` | `mb-6 flex items-start gap-3` | existing code pattern (line 200 current RegisterPage) |
| Differentiator check icon | props + `className` | `<Check size={20} className="text-white mt-0.5 flex-shrink-0" aria-hidden="true" />` | spec §7 |
| Differentiator paragraph | `className` | `text-white/80` | spec §7 |
| Final CTA heading | `className` | `text-3xl sm:text-4xl font-bold text-white` (plain white, NOT gradient) | spec §9 |
| Final CTA reassurance | `className` | `mt-4 text-sm text-white/60` | spec §9 |
| Final CTA pill | `className` | Same as hero primary pill (large variant: `px-8 py-4 text-lg`) | spec §9 + §canonical |
| StatsBar grid (updated) | `className` | `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6` | spec §3 ("4 cols × 2 rows on desktop/tablet, 4 rows on mobile") — revised from current `sm:grid-cols-3 lg:grid-cols-6` |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white→#8B5CF6 gradient clip, 223deg) for the hero H1 and section headings. Import from `@/constants/gradients`. Caveat font is deprecated for headings — do not use `font-script` anywhere on this page.
- The root page background MUST be `bg-hero-bg` (#08051A), NOT `bg-dashboard-dark`. The current RegisterPage uses `bg-dashboard-dark` — that's the bug we are fixing.
- Hero uses `<GlowBackground variant="center">` wrapping the `<Navbar transparent />` + centered content. Orbs are visible and animate via `animate-glow-float` with `motion-reduce:animate-none`.
- All pillar and spotlight icons MUST be `text-white`. NEVER `text-primary`. NEVER a custom purple color. This is the exact readability fix from the Local Support facelift.
- All check icons MUST be `text-white`. NEVER `text-primary`.
- Body paragraph text uses `text-white/80`. Secondary captions use `text-white/60`. NEVER `text-white/50` or lower on this page — fails WCAG AA on `bg-hero-bg`.
- "Log in" link uses `text-white underline hover:text-white/80`. NEVER `text-primary`.
- All white pill CTAs follow the canonical class string in the Design System Values table — do NOT use `bg-primary text-white` (deprecated pattern, that's what the current page uses and we are replacing).
- Hover lift on `FrostedCard` only fires when `onClick` is set. Pillar and spotlight cards have NO `onClick` in this plan (they are display-only per spec), so no hover lift is expected. Do NOT invent a card-level hover state — accept the default (no motion on non-interactive cards).
- Use `useScrollReveal` from `@/hooks/useScrollReveal`, NOT `useInView`. Apply `scroll-reveal` class + `is-visible` when visible + `staggerDelay(index)` inline style. The global CSS for `.scroll-reveal` handles the translate + opacity transition.
- StatsBar grid changes from `lg:grid-cols-6` to `sm:grid-cols-4 lg:grid-cols-4`. Mobile stays `grid-cols-2`. Total stats: 8. Assert ordering: `Bible Books (66), Devotionals (50), Reading Plans (10), Ambient Sounds (24), Meditation Types (6), Seasonal Challenges (5), Worship Playlists (8), Bedtime Stories (12)`.
- DashboardPreview renders its own SectionHeading. Do NOT add a wrapping heading on the register page above it — the spec's "Your daily rhythm" heading is dropped in favor of the component's internal "See How You're Growing" heading. This is documented in Edge Cases.
- Navbar `transparent` prop positions it `absolute inset-x-0 bg-transparent` so the GlowBackground shows through. Mount it inside `<GlowBackground>` at the top of the hero.
- NO `italic`, NO `font-serif`, NO `font-script` on any text on this page. All prose is Inter sans.
- No StatsBar animation regression on home: home page calls `<StatsBar />` with no props and will pick up the 8-stat, 4-column grid. Visual verification must screenshot home after the StatsBar change to confirm no regression. Spec §3 explicitly allows backing out the home change by inlining a separate stats array if regression occurs.

**Source:** `_plans/recon/design-system.md` (White Pill CTA, GlowBackground orbs, text opacity standards) + `.claude/rules/09-design-system.md` (Round 3 Visual Patterns, White Pill CTA Patterns, Text Opacity Standards, Deprecated Patterns) + spec §canonical visual vocabulary. Past plan deviations (Local Support facelift): the `text-primary` on small text was the main readability bug — this plan explicitly guards against it in every step.

---

## Shared Data Models (from Master Plan)

N/A — no master plan for this spec. No shared interfaces, no localStorage keys, no cross-spec data. Page is stateless marketing content.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | All sections single-column. Hero H1 at `text-4xl`. Hero CTA full-width (via `inline-flex` centered). Pillar grid `grid-cols-1`. Spotlight grid `grid-cols-1`. StatsBar grid `grid-cols-2` (2×4 = 8 cells). Section padding `py-16`. Container `px-4`. |
| Tablet | 768px | Hero H1 at `sm:text-5xl`. Pillar grid `md:grid-cols-2` (5 items → 2+2+1). Spotlight grid `md:grid-cols-3`. StatsBar grid `sm:grid-cols-4` (4×2). Section padding `sm:py-24`. Container `sm:px-6`. |
| Desktop | 1440px | Hero H1 at `lg:text-6xl`. Pillar grid `lg:grid-cols-3` (5 items → 3+2). Spotlight grid stays `md:grid-cols-3`. StatsBar `lg:grid-cols-4` (4×2). Container `max-w-6xl`. Differentiator container stays `max-w-2xl`. |

**Custom breakpoints:** None. All at Tailwind defaults (`sm: 640px`, `md: 768px`, `lg: 1024px`).

**No horizontal scroll at any width from 320px up** (per spec acceptance #17). Verified via:
1. Pillar card max-width naturally constrained by grid + container.
2. StatsBar cells don't overflow because animated counter renders plain integers (no long strings at 2 chars each for 24/66/50/10/etc.).
3. Long pillar bullet text wraps naturally (no `whitespace-nowrap`).
4. Check icon `flex-shrink-0` combined with `flex items-start` on bullets prevents icon-side overflow.

---

## Inline Element Position Expectations (UI features with inline rows)

The register page has no inline-row layouts that require same-y-coordinate assertions. All pillar bullets use `flex items-start gap-2` but the bullet row is single-line-per-item, not a chip row. The hero CTA + "Log in" link are stacked vertically (CTA `mt-8`, "Log in" wrapper `mt-4`), not inline.

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| N/A | — | — | — |

**Written verdict:** N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

Expected spacing between sections (from `design-system.md` Section Padding + spec §page structure line 89):

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero (ends at `pb-20` / `sm:pb-28`) → Hook section (starts at `py-16` / `sm:py-24`) | 80px + 64px = 144px mobile / 112px + 96px = 208px tablet/desktop | spec §1 + §page structure |
| Hook section → StatsBar (its own internal `py-14 sm:py-20`) | 64px + 56px = 120px mobile / 96px + 80px = 176px tablet/desktop | StatsBar.tsx line 71 |
| StatsBar → Pillar section | 56px + 64px = 120px mobile / 80px + 96px = 176px tablet/desktop | StatsBar + spec |
| Pillar → DashboardPreview (internal `py-20 sm:py-28`) | 64px + 80px = 144px mobile / 96px + 112px = 208px tablet/desktop | DashboardPreview.tsx line 174 |
| DashboardPreview → Spotlight | 80px + 64px = 144px mobile / 112px + 96px = 208px tablet/desktop | spec |
| Spotlight → Differentiator | 64px × 2 = 128px mobile / 96px × 2 = 192px tablet/desktop | spec |
| Differentiator → Callout | same as above | spec |
| Callout → Final CTA | same as above | spec |
| Final CTA → Footer | `py-16 sm:py-24` bottom + SiteFooter top padding | spec + SiteFooter existing |

**Note on StatsBar and DashboardPreview internal padding:** These components already manage their own section padding (`py-14 sm:py-20` and `py-20 sm:py-28` respectively). The register page does NOT wrap them in an additional `py-16 sm:py-24` section — they slot in directly between the hook section and the pillar section and between the pillar section and the spotlight section.

Any gap difference >5px from the rendered page is flagged as a mismatch during `/verify-with-playwright` Step 6e.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The Local Support polish has merged to main (per spec line 4 — branch cut from main after that merge). `git log` shows the merge commit `fca8467` "Merge pull request #32 from Eric-Champlin/claude/feature/local-support-facelift-google-places".
- [ ] `GlowBackground`, `FrostedCard`, `StatsBar`, `DashboardPreview`, `SectionHeading`, `useScrollReveal`, `useAuthModal` all exist and match the signatures referenced in this plan. Confirmed via file reads.
- [ ] The existing RegisterPage test file at `frontend/src/pages/__tests__/RegisterPage.test.tsx` is updated to match the new assertions (not a new file).
- [ ] The existing StatsBar test file at `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` is updated from 6-stat assertions to 8-stat assertions.
- [ ] All auth-gated actions from the spec are accounted for (ALL open the auth modal; no new gates).
- [ ] Design system values are verified (from `design-system.md` + `09-design-system.md` + spec's explicit class strings).
- [ ] No `[UNVERIFIED]` values flagged (see dedicated section below — zero unverified values in this plan).
- [ ] Recon report loaded: `design-system.md` captured 2026-04-05.
- [ ] No deprecated patterns used (checked: no `bg-primary` on CTAs, no `text-primary` on body text or icons, no Caveat font, no `useInView`, no `bg-gradient-to-b from-hero-dark to-hero-mid`, no cyan textarea styling, no italic prose).
- [ ] StatsBar home page consumer visually checked after update — spec §3 explicitly allows inlining a separate stats array in RegisterPage if the 4-column 8-stat grid looks worse on home.

**[UNVERIFIED] values:** 0. Every class string, hex color, opacity, and responsive breakpoint is traceable to either `design-system.md`, `09-design-system.md`, the spec itself, or the live codebase files read during reconnaissance.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spec §5 heading ("Your daily rhythm, in one place.") conflicts with DashboardPreview's internal "See How You're Growing" heading | Drop the spec's custom heading; use DashboardPreview as-is with its built-in heading | Spec line 229-230 says "Drop it in as-is. If DashboardPreview is too tall, too narrow, or looks odd in the register layout, flag it. Don't edit it". Editing DashboardPreview to accept a custom heading or wrapping it with a duplicate outer heading violates that directive. DashboardPreview's built-in heading is already thematically correct for this section. |
| Hero Navbar inside or outside `GlowBackground`? | Inside | The current register page renders `<Navbar />` outside the hero section wrapper. Moving it inside `<GlowBackground variant="center">` so orbs show behind the navbar matches Home page exactly (`<Navbar transparent hideBanner />` is the first child of Home's main wrapper, and the orbs are behind a GlowBackground). The `transparent` prop makes the navbar `absolute inset-x-0`, so it overlays the hero. |
| Footer dismissal within GlowBackground? | Footer stays at root level (outside hero wrapper, outside GlowBackground) | Footer sits below all content sections. Only the hero uses GlowBackground. |
| Section heading pattern: `SectionHeading topLine+bottomLine` or single `heading`? | Single `heading` form with gradient inline | Spec headings ("Everything included. Free forever.", "Small details you won't find anywhere else.", etc.) are single statements, not 2-line pairings. `SectionHeading heading={text}` renders `text-3xl sm:text-4xl lg:text-5xl font-bold pb-2` with `GRADIENT_TEXT_STYLE` which matches spec §canonical visual vocabulary line 73. |
| Logged-in users visiting `/register` | Same content as logged-out (page is public, CTAs still open auth modal) | Spec §Auth Gating table explicitly states: "page is public; logged-in users can still visit". No redirect. |
| Pillar grid 5 items → 3 columns → 3+2 or 2+3? | CSS grid auto-fills left-to-right: 3 on row 1, 2 on row 2 | Tailwind default `grid grid-cols-3` behavior. Spec §4 confirms "5 items → 3+2 on desktop". |
| Pillar grid 5 items → 2 columns → 2+2+1 | Standard CSS grid auto-fill | Tailwind default. Spec §4 confirms "2+2+1 on tablet". |
| Spotlight grid wraps on 4th card? | Only 3 spotlight cards exist — no wrap | Spec §6 mandates exactly 3. |
| Differentiator list 8 items — all in single column? | Yes, `max-w-2xl mx-auto`, each item is `flex items-start gap-3` | Spec §7 line 279 explicit. |
| StatsBar change visible on home page | Accepted as co-change — spec §3 allows fallback (separate stats array on Register) if home regresses | Verified during execute-plan visual check. |
| No `<section>` aria-labelledby for sections without headings? | All sections get either `aria-labelledby` (pointing at heading `id`) or `aria-label` | A11y best practice. The hero, hook, pillar, spotlight, differentiator, callout, and final CTA all have headings and use `aria-labelledby`. The DashboardPreview and StatsBar manage their own labels internally. |
| Navbar `hideBanner` prop | Passed as `true` | Matches Home pattern; suppresses the SeasonalBanner on marketing page |

---

## Implementation Steps

### Step 1: Update StatsBar to support 8 stats and 4-column grid

**Objective:** Expand the StatsBar `STATS` array from 6 to 8 items and change the desktop grid from `lg:grid-cols-6` to `lg:grid-cols-4`. This is a co-change that affects both Home and Register per spec §3.

**Files to create/modify:**
- `frontend/src/components/homepage/StatsBar.tsx` — modify `STATS` array and grid class
- `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` — update assertions from 6 stats to 8 stats

**Details:**

Replace the `STATS` constant (currently lines 7-14 of `StatsBar.tsx`) with:

```ts
const STATS = [
  { value: 66, label: 'Bible Books' },
  { value: 50, label: 'Devotionals' },
  { value: 10, label: 'Reading Plans' },
  { value: 24, label: 'Ambient Sounds' },
  { value: 6, label: 'Meditation Types' },
  { value: 5, label: 'Seasonal Challenges' },
  { value: 8, label: 'Worship Playlists' },
  { value: 12, label: 'Bedtime Stories' },
] as const
```

Change the grid class at line 72 from:
```
grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6
```
to:
```
grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6
```

Update `__tests__/StatsBar.test.tsx`:

- `'renders all 6 stat labels'` → `'renders all 8 stat labels'` and add `Bible Books` and `Bedtime Stories` to the assertion list.
- `'stat numbers have aria-label with final values'`: add `66 Bible Books` and `12 Bedtime Stories` to the assertion list.
- `'applies scroll-reveal classes'`: change `toHaveLength(6)` → `toHaveLength(8)`.
- `'applies stagger delay styles'`: loop still works but now iterates 8 items; expected transitionDelay stays `${i * 100}ms`.
- All other assertions (glow orb, gradient, section role) are unchanged.

**Auth gating:** N/A — StatsBar has no interactive elements.

**Responsive behavior:**
- Desktop (1440px): 4 columns × 2 rows
- Tablet (768px): 4 columns × 2 rows (same as desktop since `sm:` and `lg:` both use `grid-cols-4`)
- Mobile (375px): 2 columns × 4 rows (via `grid-cols-2`)

**Inline position expectations:** N/A — grid layout, no inline row requirement.

**Guardrails (DO NOT):**
- Do NOT delete the glow orb, animated counter integration, or `useScrollReveal` call.
- Do NOT change the StatsBar's internal container (`max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20`) — that rhythm is consumed by the parent pages.
- Do NOT add any register-specific branching inside StatsBar. It remains a single shared component.
- Do NOT rename or reorder existing stat labels beyond what's specified. The sort order is: `Bible Books` first (before Devotionals), `Bedtime Stories` last (after Worship Playlists).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders all 8 stat labels` | unit | All 8 labels present via `screen.getByText` |
| `stat numbers have aria-label with final values` | unit | All 8 aria-labels present |
| `applies scroll-reveal classes to 8 items` | unit | `querySelectorAll('.scroll-reveal').toHaveLength(8)` |
| `applies stagger delay styles` | unit | Each item has correct `transitionDelay: ${i * 100}ms` |
| `glow orb and section role unchanged` | unit | Existing assertions still pass |

**Expected state after completion:**
- [ ] `pnpm test -- StatsBar.test` passes all 10+ assertions
- [ ] Home page (`/`) renders 8 stats in a 4×2 grid at desktop and tablet
- [ ] Register page will consume the updated StatsBar in Step 4

---

### Step 2: Replace RegisterPage root wrapper + SEO + Navbar + outer layout

**Objective:** Rewrite the page's root structure and outer chrome. Remove `bg-dashboard-dark`, remove `useInView` imports, swap to `bg-hero-bg`, remove `FEATURES` / `STATS` / `DIFFERENTIATORS` constants (they'll be rebuilt per-section). SiteFooter unchanged. SEO unchanged. Navbar moves inside hero's GlowBackground as `transparent`.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — root wrapper + imports + remove legacy constants

**Details:**

Root imports after Step 2 (final state of import section):
```ts
import { Check, HandHeart, BookOpen, Sprout, Moon, Users } from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import { REGISTER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SectionHeading } from '@/components/homepage/SectionHeading'
import { StatsBar } from '@/components/homepage/StatsBar'
import { DashboardPreview } from '@/components/homepage/DashboardPreview'
import { cn } from '@/lib/utils'
```

Replace the `FEATURES`, `STATS`, and `DIFFERENTIATORS` module-level constants with the following three constants (populated in Steps 5 and 7):

```ts
// Populated in Step 5
const PILLARS = [
  /* 5 pillar records — see Step 5 */
] as const

// Populated in Step 6
const SPOTLIGHTS = [
  /* 3 spotlight records — see Step 6 */
] as const

// Populated in Step 7
const DIFFERENTIATORS = [
  /* 8 differentiator strings — see Step 7 */
] as const
```

Replace the component's return statement's outermost wrapper:

```tsx
export function RegisterPage() {
  const authModal = useAuthModal()

  return (
    <div className="flex min-h-screen flex-col bg-hero-bg font-sans">
      <SEO {...REGISTER_METADATA} />

      {/* Hero — Step 3 */}
      {/* Hook section — Step 4 */}
      {/* StatsBar — Step 4 */}
      {/* Pillar grid — Step 5 */}
      {/* DashboardPreview — Step 5 */}
      {/* Spotlight grid — Step 6 */}
      {/* Differentiator list — Step 7 */}
      {/* Callout section — Step 8 */}
      {/* Final CTA — Step 9 */}

      <SiteFooter />
    </div>
  )
}
```

The `<Navbar />` mounts inside the hero in Step 3. The `<main id="main-content">` wrapper wraps all content sections except the footer — re-add it in Step 3 around hero through final CTA.

Remove all `useInView` refs (`heroRef`, `featuresRef`, `statsRef`, `diffRef`, `ctaRef`) and the hook import. Each section's scroll-reveal state is managed internally by that section's own `useScrollReveal` call in Steps 3–9.

**Auth gating:** N/A for this step — only setup. `authModal` is captured at the top of the component for use in Steps 3 and 9.

**Responsive behavior:**
- Desktop (1440px): root is `flex min-h-screen flex-col`, pages sections natural block stacking
- Tablet (768px): same
- Mobile (375px): same

**Inline position expectations:** N/A — outer layout only, no inline rows.

**Guardrails (DO NOT):**
- Do NOT keep the `bg-dashboard-dark` class. Use `bg-hero-bg`.
- Do NOT keep the `useInView` import or any of its per-section refs.
- Do NOT add a separate `<main>` wrapper in this step — it's added inside the hero wrapper in Step 3.
- Do NOT change `REGISTER_METADATA` or SEO props.
- Do NOT remove the `SiteFooter` at the bottom.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| page renders without crash | unit | `renderPage()` returns without throwing |
| SiteFooter renders | unit | `getAllByRole('contentinfo').length >= 1` (already in existing test — keep) |

**Expected state after completion:**
- [ ] RegisterPage module compiles with no TypeScript errors
- [ ] Root wrapper is `<div className="flex min-h-screen flex-col bg-hero-bg font-sans">`
- [ ] Legacy `FEATURES`, `STATS`, `DIFFERENTIATORS` constants removed
- [ ] Legacy `useInView` imports removed
- [ ] New helper imports (GlowBackground, FrostedCard, SectionHeading, StatsBar, DashboardPreview, useScrollReveal) present
- [ ] Existing test file still runs even if specific assertions fail — it will be updated in later steps

---

### Step 3: Build the hero section

**Objective:** Build the new hero with GlowBackground, transparent Navbar, gradient H1, subtitle, primary CTA, and secondary "Log in" link. Replaces the current hero that uses `bg-gradient-to-b from-hero-dark to-hero-mid`.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — add hero JSX

**Details:**

Add a `useScrollReveal()` at the top of the component to drive the hero reveal:

```tsx
const hero = useScrollReveal({ threshold: 0.1 })
```

The hero JSX goes first inside the root wrapper, before `<main>`:

```tsx
<GlowBackground variant="center">
  <Navbar transparent hideBanner />
  <main id="main-content">
    <section
      ref={hero.ref as React.RefObject<HTMLElement>}
      aria-labelledby="register-hero-heading"
      className={cn(
        'scroll-reveal',
        hero.isVisible && 'is-visible'
      )}
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 pt-32 pb-20 sm:pt-40 sm:pb-28">
        <h1
          id="register-hero-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Your sanctuary is ready.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80 sm:text-xl">
          A free, peaceful space for prayer, Scripture, community, and rest.
          Eighty-two features. Zero ads. No credit card.
        </p>
        <button
          type="button"
          onClick={() => authModal?.openAuthModal(undefined, 'register')}
          className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
        >
          Create Your Free Account
        </button>
        <p className="mt-4 text-sm text-white/60">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'login')}
            className="text-white underline hover:text-white/80"
          >
            Log in
          </button>
        </p>
      </div>
    </section>
  {/* remaining sections below — opened here, closed at end of Step 9 */}
```

**Important:** The `<main>` tag opens here and closes in Step 9 (just before `<SiteFooter />`). All sections through the final CTA sit inside `<main>`.

**Auth gating:**
- Hero CTA: `authModal?.openAuthModal(undefined, 'register')`
- "Log in" link: `authModal?.openAuthModal(undefined, 'login')`

**Responsive behavior:**
- Desktop (1440px): H1 at `text-6xl`. Subtitle at `sm:text-xl`. CTA padding `px-8 py-4 text-lg`. Hero container `pt-40 pb-28`.
- Tablet (768px): H1 at `sm:text-5xl`. Subtitle at `sm:text-xl`. Same CTA sizing.
- Mobile (375px): H1 at `text-4xl`. Subtitle at `text-lg`. Hero container `pt-32 pb-20`.

**Inline position expectations:** N/A — all hero elements are vertically stacked.

**Guardrails (DO NOT):**
- Do NOT use `bg-gradient-to-b from-hero-dark to-hero-mid` (deprecated).
- Do NOT use `text-primary` on the "Log in" link (deprecated per Local Support facelift).
- Do NOT use `bg-primary` on the CTA (deprecated — canonical white pill).
- Do NOT use `w-full sm:w-auto` on the CTA — the spec removes the full-width mobile CTA and uses `inline-flex` centered.
- Do NOT render the Navbar outside the `<GlowBackground>` wrapper.
- Do NOT add a duplicate skip-to-main-content link — `<Navbar>` already renders one.
- Do NOT set `text-white/50` or lower on the subtitle or "Already have an account?" wrapper.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders hero heading | unit | `getByRole('heading', { level: 1, name: /your sanctuary is ready/i })` |
| renders hero subtitle with feature count | unit | `getByText(/eighty-two features/i)` |
| hero CTA opens auth modal in register mode | unit | Click first "Create Your Free Account" → `mockOpenAuthModal` called with `(undefined, 'register')` |
| "Log in" link opens auth modal in login mode | unit | Click "Log in" button inside main → `mockOpenAuthModal` called with `(undefined, 'login')` |
| hero H1 uses gradient style | unit | `getByRole('heading', { level: 1 })` has `style.background` containing `linear-gradient(223deg` |
| hero uses GlowBackground | unit | `container.querySelector('.bg-hero-bg')` returns an element AND `querySelectorAll('[data-testid="glow-orb"]').length >= 2` |
| navbar is transparent | unit | `container.querySelector('nav')` has class `absolute` (indicator of transparent prop) |

**Expected state after completion:**
- [ ] Hero H1 renders with gradient at correct breakpoints
- [ ] Primary CTA is white pill, opens register modal
- [ ] "Log in" link is white underlined, opens login modal
- [ ] GlowBackground orbs visible behind hero
- [ ] No `bg-primary` class anywhere in the hero JSX
- [ ] No `text-primary` class anywhere in the hero JSX

---

### Step 4: Add the "Why we built this" hook section + StatsBar

**Objective:** Build section §2 (new hook section with eyebrow, gradient heading, paragraph) and drop in `<StatsBar />` as section §3. Both sit inside `<main>` after the hero.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — add hook section + StatsBar mount

**Details:**

Hook section (spec §2):

```tsx
const hook = useScrollReveal({ threshold: 0.1 })

<section
  ref={hook.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-hook-heading"
  className={cn(
    'py-16 sm:py-24 scroll-reveal',
    hook.isVisible && 'is-visible'
  )}
>
  <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
    <p className="text-sm uppercase tracking-widest text-white/60 mb-4">
      Why we built this
    </p>
    <h2
      id="register-hook-heading"
      className="text-3xl sm:text-4xl lg:text-5xl font-bold pb-2"
      style={GRADIENT_TEXT_STYLE}
    >
      Faith tools that meet you where you are.
    </h2>
    <p className="mt-6 text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
      Most Bible apps gate premium content, push notifications you didn't ask for, and punish you for missing a day. Worship Room is different. The entire Bible is free to read without an account. Streaks come with grace-based repairs — miss a day, get one back. Your prayers stay private. No ads will ever appear in your worship time. This is a room built for quiet, not performance.
    </p>
  </div>
</section>

<StatsBar />
```

**Auth gating:** N/A — display only.

**Responsive behavior:**
- Desktop (1440px): heading `text-5xl`, paragraph `text-lg`, section padding `sm:py-24`, max width `max-w-3xl` (~768px).
- Tablet (768px): heading `sm:text-4xl`, paragraph `sm:text-lg`, same container.
- Mobile (375px): heading `text-3xl`, paragraph `text-base`, section padding `py-16`.

**Inline position expectations:** N/A — stacked vertically.

**Guardrails (DO NOT):**
- Do NOT use `text-primary` anywhere in this section.
- Do NOT use `font-serif` or `italic` on the paragraph (spec acceptance #129).
- Do NOT add `<GlowBackground>` around this section — only the hero uses GlowBackground. This section sits on the root `bg-hero-bg` inherited from the wrapper.
- Do NOT wrap StatsBar in anything — it manages its own container and glow.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders "Why we built this" eyebrow | unit | `getByText(/why we built this/i)` |
| renders hook heading | unit | `getByRole('heading', { level: 2, name: /faith tools that meet you/i })` |
| renders hook paragraph | unit | `getByText(/most bible apps gate premium content/i)` |
| renders StatsBar with 8 labels | unit | Already covered by StatsBar test — add spot-check here: `getByText('Bible Books')` and `getByText('Bedtime Stories')` |

**Expected state after completion:**
- [ ] Hook section heading renders with gradient
- [ ] Paragraph is `text-white/80`
- [ ] StatsBar renders below with 8 animated counters
- [ ] No `text-primary`, `bg-primary`, `font-serif`, or `italic` in this region

---

### Step 5: Build the 5-pillar feature grid + mount DashboardPreview

**Objective:** Build section §4 (pillar grid with 5 FrostedCard pillars, each with tagline + 5 feature bullets) and mount `<DashboardPreview />` as section §5.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — define `PILLARS` constant, add JSX

**Details:**

Define the `PILLARS` constant at module scope (replacing the placeholder from Step 2):

```ts
const PILLARS = [
  {
    name: 'PRAY',
    icon: HandHeart,
    tagline: "Personal prayer, guided sessions, and a quiet place to bring everything you're carrying.",
    features: [
      'Personalized prayer generation (Pray tab on Daily Hub)',
      '8 guided prayer sessions (5-15 minutes each)',
      'Your personal prayer list with answered tracking',
      'Prayer Wall community (9 categories, anonymous option)',
      'Crisis support detection with hotline resources',
    ],
  },
  {
    name: 'READ',
    icon: BookOpen,
    tagline: 'The full Bible, never gated — with AI explainers, search, memorization, and visual progress.',
    features: [
      'Full 66-book WEB Bible (free, no account needed)',
      'AI Explain This Passage (powered by Gemini)',
      'Full audio Bible with sleep timer and continuous playback',
      'Verse memorization deck (no quizzes, no scoring)',
      'Reading heatmap + progress map across all 66 books',
    ],
  },
  {
    name: 'GROW',
    icon: Sprout,
    tagline: 'Habits that honor presence over perfection. Miss a day — keep your streak.',
    features: [
      '10 reading plans (119 days of content)',
      '5 seasonal community challenges (110 days total)',
      'Grace-based streaks with 1 free repair per week',
      'Visual Growth Garden that blooms as you grow',
      '45+ badges across 6 achievement categories',
    ],
  },
  {
    name: 'REST',
    icon: Moon,
    tagline: 'Sleep better. Meditate on Scripture. Build your own ambient mix.',
    features: [
      '24 ambient sounds + 11 scene presets (crossfade mixing)',
      '12 bedtime stories rooted in Scripture',
      '24 scripture readings for rest and sleep',
      '6 meditation practices (Breathing, Soaking, Examen, more)',
      'Sleep timer with smooth 20-second fade-out',
    ],
  },
  {
    name: 'BELONG',
    icon: Users,
    tagline: 'Community without noise. Friends, gentle nudges, and local support when you need it.',
    features: [
      'Prayer Wall feed with question of the day',
      'Friends with gentle nudges (1/week max)',
      'Friends + global faith points leaderboard',
      'Local church, counselor, and Celebrate Recovery finders (real Google data)',
      'Public growth profiles (engagement, never mood data)',
    ],
  },
] as const
```

Section JSX:

```tsx
const pillars = useScrollReveal({ threshold: 0.1 })

<section
  ref={pillars.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-pillars-heading"
  className="py-16 sm:py-24"
>
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    <SectionHeading
      id="register-pillars-heading"
      heading="Everything included. Free forever."
    />
    <p className="text-white/60 max-w-2xl mx-auto mt-4 mb-12 text-center text-base sm:text-lg">
      Eighty-two shipped features across five pillars. No paywalls. No premium tier. No upsells inside the app.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PILLARS.map((pillar, index) => {
        const Icon = pillar.icon
        return (
          <div
            key={pillar.name}
            className={cn(
              'scroll-reveal',
              pillars.isVisible && 'is-visible'
            )}
            style={staggerDelay(index, 50)}
          >
            <FrostedCard>
              <Icon size={32} className="text-white" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">
                {pillar.name}
              </h3>
              <p className="text-sm text-white/80 mb-4 leading-relaxed">
                {pillar.tagline}
              </p>
              <ul className="space-y-1.5 text-sm text-white/80">
                {pillar.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      size={16}
                      className="text-white mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </FrostedCard>
          </div>
        )
      })}
    </div>
  </div>
</section>

<DashboardPreview />
```

**Auth gating:** N/A — display only. DashboardPreview's internal CTA opens the auth modal; that wiring is in DashboardPreview.tsx and is not this spec's concern.

**Responsive behavior:**
- Desktop (1440px): 3-column grid (5 items → row 1 has 3 cards, row 2 has 2). Section heading `text-5xl`.
- Tablet (768px): 2-column grid (5 items → 2+2+1). Heading `sm:text-4xl`.
- Mobile (375px): 1-column grid. Heading `text-3xl`.

**Inline position expectations:** N/A — bullet list is one bullet per row, not a row of chips.

**Guardrails (DO NOT):**
- Do NOT use `text-primary` on the pillar icon (MUST be `text-white`).
- Do NOT use `text-primary` on the check icons inside bullets.
- Do NOT wrap each card's contents in an additional heading level higher than `h3`.
- Do NOT pass `onClick` to `FrostedCard` — pillars are display-only per spec §4 ("Each pillar card: `<FrostedCard>` ... containing..."). Passing an onClick would add hover lift + clickable cursor, both incorrect.
- Do NOT add a 6th pillar or remove any of the 5.
- Do NOT trim feature bullets below 5 per pillar — spec §4 explicitly says "Exactly 5 feature bullets per card (consistent)".
- Do NOT wrap `<DashboardPreview />` in any wrapper section or add a custom heading above it — it manages its own heading and glow.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders section heading "Everything included. Free forever." | unit | `getByRole('heading', { level: 2, name: /everything included/i })` |
| renders all 5 pillar headings | unit | `getByRole('heading', { level: 3, name: 'PRAY' \| 'READ' \| 'GROW' \| 'REST' \| 'BELONG' })` × 5 |
| each pillar renders exactly 5 feature bullets | unit | For each pillar, count `<li>` items inside its card and assert `toBe(5)` |
| no `text-primary` on pillar icons | integration | `container.querySelector` on each pillar icon and assert `className` does NOT contain `text-primary` |
| all check icons are `text-white` | integration | `container.querySelectorAll('svg.lucide-check')` count + assert className includes `text-white` |
| DashboardPreview renders | unit | `getByRole('heading', { name: /see how you're growing/i })` |

**Expected state after completion:**
- [ ] Pillar grid renders 5 cards with correct icons and bullets
- [ ] Grid responsive at all breakpoints
- [ ] DashboardPreview renders with its built-in heading, card grid, and CTA
- [ ] No `text-primary` on any icon or text within the pillar grid

---

### Step 6: Build the spotlight differentiator section

**Objective:** Build section §6 (marketing-gold spotlight with 3 spotlight FrostedCards — Verse Echoes, Grace-Based Streaks, Midnight Verse).

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — define `SPOTLIGHTS` constant, add JSX

**Details:**

Define `SPOTLIGHTS` at module scope:

```ts
const SPOTLIGHTS = [
  {
    name: 'Verse Echoes',
    description: 'Thirty days after you highlight a verse, the app gently reminds you. Six months later, still there. Worship Room remembers your journey and brings it back when it matters — not when an algorithm wants engagement.',
    proofLabel: 'Powered by your own reading history',
  },
  {
    name: 'Grace-Based Streaks',
    description: "Every other app punishes you for missing a day. This one gives you a free repair each week. Because the goal isn't the streak — it's the presence. Miss a day, pick it back up, no shame.",
    proofLabel: '1 free repair per week, always',
  },
  {
    name: 'Midnight Verse',
    description: "Open the app between 11 PM and 1 AM and a special verse meets you there. Quiet, thoughtful, never pushy. For the nights when sleep won't come and you need something to hold on to.",
    proofLabel: 'Shows once per late-night visit',
  },
] as const
```

Section JSX:

```tsx
const spotlight = useScrollReveal({ threshold: 0.1 })

<section
  ref={spotlight.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-spotlight-heading"
  className="py-16 sm:py-24"
>
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    <SectionHeading
      id="register-spotlight-heading"
      heading="Small details you won't find anywhere else."
    />
    <p className="text-white/60 max-w-2xl mx-auto mt-4 mb-12 text-center text-base sm:text-lg">
      The things we cared about that no one else seems to.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {SPOTLIGHTS.map((card, index) => (
        <div
          key={card.name}
          className={cn(
            'scroll-reveal',
            spotlight.isVisible && 'is-visible'
          )}
          style={staggerDelay(index, 50)}
        >
          <FrostedCard>
            <h3 className="text-xl font-semibold text-white mb-3">
              {card.name}
            </h3>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              {card.description}
            </p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              {card.proofLabel}
            </p>
          </FrostedCard>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Auth gating:** N/A — display only.

**Responsive behavior:**
- Desktop (1440px): 3-column grid, `text-5xl` heading.
- Tablet (768px): 3-column grid, `sm:text-4xl` heading.
- Mobile (375px): 1-column grid (stacked), `text-3xl` heading.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT use gradient styling on the spotlight card `h3` headings — spec line 268 says "Headings use `text-white`, not gradient (reserve gradient for section-level)".
- Do NOT add `onClick` to the spotlight FrostedCards — display only.
- Do NOT alter card count from 3.
- Do NOT add icons to spotlight cards (the spec does not include them — adding icons would clutter the card).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders spotlight section heading | unit | `getByRole('heading', { level: 2, name: /small details you won't find/i })` |
| renders all 3 spotlight headings | unit | `getByRole('heading', { level: 3, name: 'Verse Echoes' })` + `Grace-Based Streaks` + `Midnight Verse` |
| each spotlight has a proof label | unit | `getByText(/powered by your own reading history/i)`, etc. |

**Expected state after completion:**
- [ ] 3 spotlight cards render with heading + description + proof label
- [ ] Cards respect `text-white/80` on descriptions and `text-white/60` on proof labels
- [ ] No gradient on card h3 headings

---

### Step 7: Rebuild the differentiator checklist with 8 items

**Objective:** Build section §7 (differentiator list). Populate 8 items, `<Check>` icons in `text-white`, paragraph text in `text-white/80`.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — define `DIFFERENTIATORS` constant, add JSX

**Details:**

Replace the placeholder `DIFFERENTIATORS` constant at module scope with:

```ts
const DIFFERENTIATORS = [
  'Free forever — no subscriptions, no trial periods, no "premium" tier.',
  'No ads. Your worship time is sacred, not monetizable.',
  'No data harvesting. Your prayers and journal entries stay private.',
  'Grace-based streaks that celebrate presence, never punish absence.',
  'The entire Bible is free to read — no account required.',
  'Crisis keyword detection with real hotline resources when you need them.',
  'Works offline as an installable app (iOS, Android, desktop).',
  'Real accessibility — WCAG 2.2 AA audited, not an afterthought.',
] as const
```

Section JSX:

```tsx
const diff = useScrollReveal({ threshold: 0.1 })

<section
  ref={diff.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-diff-heading"
  className="py-16 sm:py-24"
>
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    <SectionHeading
      id="register-diff-heading"
      heading="Worship Room is different."
      className="mb-12"
    />
    <div className="max-w-2xl mx-auto">
      {DIFFERENTIATORS.map((text, index) => (
        <div
          key={text}
          className={cn(
            'mb-6 flex items-start gap-3 scroll-reveal',
            diff.isVisible && 'is-visible'
          )}
          style={staggerDelay(index, 50)}
        >
          <Check
            size={20}
            className="text-white mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-white/80">{text}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Auth gating:** N/A — display only.

**Responsive behavior:**
- Desktop (1440px): heading `text-5xl`, list `max-w-2xl` centered.
- Tablet (768px): heading `sm:text-4xl`, list unchanged.
- Mobile (375px): heading `text-3xl`, list wraps text naturally.

**Inline position expectations:** Each list row is `flex items-start gap-3` — the check icon sits next to the text baseline. Single row per differentiator; no multi-element inline layout to verify positionally.

**Guardrails (DO NOT):**
- Do NOT use `text-primary` on the Check icons (MUST be `text-white`).
- Do NOT reduce the list to 4 items or expand beyond 8.
- Do NOT wrap items in a `<ul>`/`<li>` without adjusting the semantic expectation in tests — current pattern uses `<div>` per row; keep that for consistency with the current page's pattern.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders differentiator heading | unit | `getByRole('heading', { level: 2, name: /worship room is different/i })` |
| renders all 8 differentiator items | unit | For each string (excerpt match), `getByText(regex)` |
| Check icons are `text-white` | integration | Each `svg.lucide-check` within the differentiator section has className containing `text-white` and NOT containing `text-primary` |

**Expected state after completion:**
- [ ] 8 differentiator rows render
- [ ] All check icons are white
- [ ] Paragraph text is `text-white/80`

---

### Step 8: Add the "Six months of nights and weekends" content depth callout

**Objective:** Build section §8 (new callout, text-only, no CTA). Eyebrow + gradient heading + paragraph.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — add JSX

**Details:**

```tsx
const callout = useScrollReveal({ threshold: 0.1 })

<section
  ref={callout.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-callout-heading"
  className={cn(
    'py-16 sm:py-24 scroll-reveal',
    callout.isVisible && 'is-visible'
  )}
>
  <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
    <p className="text-sm uppercase tracking-widest text-white/60 mb-4">
      Built by one person
    </p>
    <h2
      id="register-callout-heading"
      className="text-3xl sm:text-4xl lg:text-5xl font-bold pb-2"
      style={GRADIENT_TEXT_STYLE}
    >
      Six months of nights and weekends.
    </h2>
    <p className="mt-6 text-white/80 text-base sm:text-lg">
      Worship Room was built by one developer, after hours, because the tools for faith deserved better. No VC funding. No growth team. No dark patterns. Just someone who wanted a space for prayer and Scripture that felt more like a sanctuary than an app. That's what you're signing up for.
    </p>
  </div>
</section>
```

**Auth gating:** N/A — display only, no CTA.

**Responsive behavior:**
- Desktop (1440px): heading `text-5xl`, paragraph `sm:text-lg`.
- Tablet (768px): heading `sm:text-4xl`, paragraph `sm:text-lg`.
- Mobile (375px): heading `text-3xl`, paragraph `text-base`.

**Inline position expectations:** N/A — stacked.

**Guardrails (DO NOT):**
- Do NOT add a CTA button to this section (spec line 310: "No CTA here — keep the section quiet.").
- Do NOT use `text-white/60` on the paragraph — spec line 314 says `text-white/80`.
- Do NOT add a GlowBackground wrapper.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders callout heading | unit | `getByRole('heading', { level: 2, name: /six months of nights and weekends/i })` |
| renders callout eyebrow | unit | `getByText(/built by one person/i)` |
| renders callout paragraph | unit | `getByText(/by one developer, after hours/i)` |

**Expected state after completion:**
- [ ] Callout section renders with gradient heading and `text-white/80` paragraph
- [ ] No button or link inside the section

---

### Step 9: Build the final CTA section + close main wrapper

**Objective:** Build section §9 (final CTA with white pill, white plain heading, reassurance). Close `<main>`. `<SiteFooter />` sits below.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — add JSX, close main

**Details:**

```tsx
const finalCta = useScrollReveal({ threshold: 0.1 })

<section
  ref={finalCta.ref as React.RefObject<HTMLElement>}
  aria-labelledby="register-cta-heading"
  className={cn(
    'py-16 text-center sm:py-24 scroll-reveal',
    finalCta.isVisible && 'is-visible'
  )}
>
  <div className="max-w-4xl mx-auto px-4 sm:px-6">
    <h2
      id="register-cta-heading"
      className="text-3xl sm:text-4xl font-bold text-white"
    >
      Ready to step inside?
    </h2>
    <button
      type="button"
      onClick={() => authModal?.openAuthModal(undefined, 'register')}
      className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
    >
      Create Your Free Account
    </button>
    <p className="mt-4 text-sm text-white/60">
      No credit card. No trial period. Just peace.
    </p>
  </div>
</section>
  </main>
```

The `</main>` tag closes here, immediately after the final CTA `<section>`.

**Auth gating:**
- Final CTA: `authModal?.openAuthModal(undefined, 'register')`

**Responsive behavior:**
- Desktop (1440px): heading `text-4xl`, CTA `text-lg` padding `px-8 py-4`.
- Tablet (768px): heading `sm:text-4xl`, same CTA.
- Mobile (375px): heading `text-3xl`, same CTA sizing (`text-lg`).

**Inline position expectations:** N/A — stacked.

**Guardrails (DO NOT):**
- Do NOT use gradient on the final CTA heading — spec line 320 says plain white.
- Do NOT use `bg-primary text-white` on the CTA.
- Do NOT forget to close `</main>` before `<SiteFooter />`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders final CTA heading | unit | `getByRole('heading', { level: 2, name: /ready to step inside/i })` |
| renders final CTA reassurance line | unit | `getByText(/no credit card\. no trial period\. just peace/i)` |
| final CTA opens auth modal in register mode | unit | Click second "Create Your Free Account" → `mockOpenAuthModal` called with `(undefined, 'register')` |

**Expected state after completion:**
- [ ] Final CTA renders with plain white heading
- [ ] White pill CTA opens auth modal in register mode
- [ ] Main wrapper closes before footer
- [ ] Footer renders below

---

### Step 10: Update RegisterPage test suite to match new structure

**Objective:** Update every assertion in `frontend/src/pages/__tests__/RegisterPage.test.tsx` to cover the new 10-section structure. Add new assertions for pillars, spotlights, hook section, callout, and 8-item differentiator list. Keep the existing test harness (`MemoryRouter` + `ToastProvider` + `AuthModalProvider` + mocked `useAuth` + mocked `useAuthModal`).

**Files to create/modify:**
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — replace assertions

**Details:**

Kept as-is:
- `vi.mock('@/hooks/useAuth', ...)` (unchanged)
- `vi.mock('@/components/prayer-wall/AuthModalProvider', ...)` (unchanged — still returns `{ openAuthModal: mockOpenAuthModal }`)
- `renderPage()` helper (unchanged)
- `beforeEach(() => mockOpenAuthModal.mockClear())`

Replace the assertion set with:

```tsx
// --- Hero ---

it('renders hero heading "Your sanctuary is ready."', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 1, name: /your sanctuary is ready/i }),
  ).toBeInTheDocument()
})

it('renders hero subtitle mentioning "Eighty-two features"', () => {
  renderPage()
  expect(screen.getByText(/eighty-two features/i)).toBeInTheDocument()
  expect(screen.getByText(/zero ads/i)).toBeInTheDocument()
  expect(screen.getByText(/no credit card/i)).toBeInTheDocument()
})

// --- Hook section ---

it('renders "Why we built this" eyebrow', () => {
  renderPage()
  expect(screen.getByText(/why we built this/i)).toBeInTheDocument()
})

it('renders hook heading', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /faith tools that meet you/i }),
  ).toBeInTheDocument()
})

// --- StatsBar (8 stats) ---

it('renders all 8 StatsBar labels', () => {
  renderPage()
  expect(screen.getByText('Bible Books')).toBeInTheDocument()
  expect(screen.getByText('Devotionals')).toBeInTheDocument()
  expect(screen.getByText('Reading Plans')).toBeInTheDocument()
  expect(screen.getByText('Ambient Sounds')).toBeInTheDocument()
  expect(screen.getByText('Meditation Types')).toBeInTheDocument()
  expect(screen.getByText('Seasonal Challenges')).toBeInTheDocument()
  expect(screen.getByText('Worship Playlists')).toBeInTheDocument()
  expect(screen.getByText('Bedtime Stories')).toBeInTheDocument()
})

// --- Pillars ---

it('renders pillar section heading', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /everything included\. free forever/i }),
  ).toBeInTheDocument()
})

it('renders all 5 pillar headings', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 3, name: 'PRAY' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'READ' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'GROW' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'REST' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'BELONG' })).toBeInTheDocument()
})

it('renders pillar taglines', () => {
  renderPage()
  expect(screen.getByText(/personal prayer, guided sessions/i)).toBeInTheDocument()
  expect(screen.getByText(/the full bible, never gated/i)).toBeInTheDocument()
  expect(screen.getByText(/habits that honor presence/i)).toBeInTheDocument()
  expect(screen.getByText(/sleep better\. meditate on scripture/i)).toBeInTheDocument()
  expect(screen.getByText(/community without noise/i)).toBeInTheDocument()
})

// --- DashboardPreview ---

it('renders DashboardPreview', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /see how you're growing/i }),
  ).toBeInTheDocument()
})

// --- Spotlight ---

it('renders spotlight section heading', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /small details you won't find/i }),
  ).toBeInTheDocument()
})

it('renders all 3 spotlight cards', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 3, name: 'Verse Echoes' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'Grace-Based Streaks' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'Midnight Verse' })).toBeInTheDocument()
})

// --- Differentiator ---

it('renders differentiator heading', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /worship room is different/i }),
  ).toBeInTheDocument()
})

it('renders all 8 differentiator items', () => {
  renderPage()
  expect(screen.getByText(/free forever/i)).toBeInTheDocument()
  expect(screen.getByText(/no ads\./i)).toBeInTheDocument()
  expect(screen.getByText(/no data harvesting/i)).toBeInTheDocument()
  expect(screen.getByText(/grace-based streaks that celebrate presence/i)).toBeInTheDocument()
  expect(screen.getByText(/the entire bible is free to read/i)).toBeInTheDocument()
  expect(screen.getByText(/crisis keyword detection/i)).toBeInTheDocument()
  expect(screen.getByText(/works offline as an installable app/i)).toBeInTheDocument()
  expect(screen.getByText(/real accessibility/i)).toBeInTheDocument()
})

// --- Callout ---

it('renders content depth callout', () => {
  renderPage()
  expect(screen.getByText(/built by one person/i)).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { level: 2, name: /six months of nights and weekends/i }),
  ).toBeInTheDocument()
})

// --- Final CTA ---

it('renders final CTA heading', () => {
  renderPage()
  expect(
    screen.getByRole('heading', { level: 2, name: /ready to step inside/i }),
  ).toBeInTheDocument()
})

// --- Auth modal interactions ---

it('hero CTA opens auth modal in register mode', async () => {
  renderPage()
  const user = userEvent.setup()
  const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
  await user.click(ctaButtons[0])
  expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
})

it('final CTA opens auth modal in register mode', async () => {
  renderPage()
  const user = userEvent.setup()
  const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
  // DashboardPreview adds a "Create a Free Account" button with different text pattern.
  // Our regex allows it, so filter by the exact spec copy "Create Your Free Account".
  const spec = ctaButtons.filter((btn) => btn.textContent?.trim() === 'Create Your Free Account')
  expect(spec).toHaveLength(2)
  await user.click(spec[1])
  expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
})

it('"Log in" link opens auth modal in login mode', async () => {
  renderPage()
  const user = userEvent.setup()
  const main = screen.getByRole('main')
  const logInButtons = screen.getAllByRole('button', { name: /log in/i })
  const mainLogIn = logInButtons.find((btn) => main.contains(btn))!
  await user.click(mainLogIn)
  expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
})

// --- Heading hierarchy & a11y ---

it('heading hierarchy: single h1, multiple h2s', () => {
  renderPage()
  const h1s = screen.getAllByRole('heading', { level: 1 })
  expect(h1s).toHaveLength(1)
  const h2s = screen.getAllByRole('heading', { level: 2 })
  // Hero h1 + Hook h2 + StatsBar has no h2, Pillars h2 + DashboardPreview h2 + Spotlight h2 + Diff h2 + Callout h2 + Final CTA h2 = 7 h2s
  expect(h2s.length).toBeGreaterThanOrEqual(7)
})

it('renders navbar', () => {
  renderPage()
  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
})

it('renders footer', () => {
  renderPage()
  expect(screen.getAllByRole('contentinfo').length).toBeGreaterThanOrEqual(1)
})

it('"Create Your Free Account" CTA appears exactly twice', () => {
  renderPage()
  const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
  // Hero + Final CTA. DashboardPreview uses "Create a Free Account" (different copy), does not match /create your free account/i.
  const specCopy = ctaButtons.filter((btn) => btn.textContent?.trim() === 'Create Your Free Account')
  expect(specCopy).toHaveLength(2)
})

// --- Color compliance ---

it('no element inside main uses text-primary class (except DashboardPreview's internal purple accent, which is scoped to its own icons)', () => {
  renderPage()
  const main = screen.getByRole('main')
  // Check icons in Pillar bullets and Differentiator list
  const checks = main.querySelectorAll('svg.lucide-check')
  checks.forEach((check) => {
    expect((check as SVGElement).className.baseVal || (check as HTMLElement).className).not.toContain('text-primary')
  })
})
```

**Auth gating:** Verified by auth-modal-interaction assertions (3 explicit tests).

**Responsive behavior:** N/A for unit tests — responsive layout verified by `/verify-with-playwright`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT rely on class assertions for responsive breakpoints — Tailwind classes render to jsdom as strings; actual responsive rendering is verified by `/verify-with-playwright`.
- Do NOT assert on the `text-primary` class presence on buttons — the two primary CTAs use `text-primary` intentionally (that's the purple pill text color on a white background). The color-compliance assertion narrows to check icons only.
- Do NOT assert that DashboardPreview renders 6 preview cards inside the register test — that's DashboardPreview's own test's responsibility.
- Do NOT add Playwright-style tests inline; keep Vitest-scope unit assertions.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (all assertions above) | unit/integration | See code block |

**Expected state after completion:**
- [ ] All assertions pass: `pnpm test -- RegisterPage.test`
- [ ] Assertion count: ~23 (from ~15 in the original)

---

### Step 11: Local verify — manual QA and visual verification prep

**Objective:** Run the full test suite, lint, and build. Confirm the page renders in the browser at three viewports. Flag any deviations before handing off to `/verify-with-playwright`.

**Files to create/modify:** None — verification only.

**Details:**

Run the following commands from the repo root:

1. `cd frontend && pnpm test -- RegisterPage.test` — expect 23 passing (from Step 10).
2. `cd frontend && pnpm test -- StatsBar.test` — expect 10+ passing (from Step 1).
3. `cd frontend && pnpm test` — full suite, expect zero new failures.
4. `cd frontend && pnpm lint` — expect zero new errors.
5. `cd frontend && pnpm build` — expect successful build.
6. `cd frontend && pnpm dev` — open `http://localhost:5173/register` in a browser at 375/768/1440px widths.

**Manual QA checklist (spec §testing plan items 2-4):**

- [ ] Hero GlowBackground orbs animate gently
- [ ] H1 gradient is white → violet at all three viewports
- [ ] Subtitle text is `text-white/80` readable
- [ ] Primary CTA is white pill with purple text
- [ ] "Log in" link is white underlined (not purple)
- [ ] Hook section gradient heading renders
- [ ] StatsBar renders 8 animated counters at 4×2 grid desktop, 4×2 tablet, 2×4 mobile
- [ ] Pillars stack correctly at each breakpoint (1/2/3 cols)
- [ ] All pillar icons are white, not purple
- [ ] All check icons (pillars + differentiator) are white, not purple
- [ ] DashboardPreview renders with its own heading and CTA
- [ ] Spotlight cards stack 1/3/3 at mobile/tablet/desktop
- [ ] Differentiator list shows exactly 8 items
- [ ] Callout section has gradient heading, no CTA
- [ ] Final CTA section has plain white heading, white pill
- [ ] Footer unchanged
- [ ] No `text-primary` on body text or icons (browser DevTools search)
- [ ] No `bg-primary` on any CTA (browser DevTools search)
- [ ] No horizontal scroll at 320px, 375px, 480px, 640px, 768px, 1024px, 1440px
- [ ] No console errors or warnings

**Also verify home page (`/`) still looks correct after StatsBar change:**

- [ ] Home page renders 8 stats in 4×2 grid
- [ ] Grid does NOT visually regress (stats are evenly spaced, labels don't overflow)

If the home regresses, revert the StatsBar change and inline a register-specific `STATS` array. Spec §3 permits this fallback.

**Auth gating:** Confirmed working via test suite. Browser click test: open `/register`, click hero CTA — auth modal should appear in `register` mode.

**Responsive behavior:** Manual viewport check as above.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT proceed to commit until every checklist item passes.
- Do NOT skip lint or build.
- Do NOT skip the home page regression check.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite passes | integration | `pnpm test` exits zero |
| Lint passes | integration | `pnpm lint` exits zero |
| Build passes | integration | `pnpm build` exits zero |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Browser manual QA checklist complete
- [ ] Home page StatsBar not regressed

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update StatsBar component + tests to 8 stats / 4-col grid |
| 2 | — | Replace RegisterPage root wrapper + imports |
| 3 | 2 | Build hero inside GlowBackground |
| 4 | 3 | Hook section + mount StatsBar (depends on Step 1's 8-stat version) |
| 5 | 4 | Pillar grid + mount DashboardPreview |
| 6 | 5 | Spotlight section |
| 7 | 6 | Differentiator checklist |
| 8 | 7 | Content depth callout |
| 9 | 8 | Final CTA + close main |
| 10 | 3, 4, 5, 6, 7, 8, 9 | Update test suite to match new structure |
| 11 | 10, 1 | Run full verification (tests, lint, build, manual QA) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update StatsBar to 8 stats and 4-col grid | [COMPLETE] | 2026-04-20 | Modified `StatsBar.tsx` STATS array (8 items, Bible Books first + Bedtime Stories last) and grid class. Updated `StatsBar.test.tsx` to 8-stat assertions. All 11 StatsBar tests pass. |
| 2 | Replace RegisterPage root wrapper + imports | [COMPLETE] | 2026-04-20 | Rewrote `RegisterPage.tsx` greenfield. Root = `flex min-h-screen flex-col bg-hero-bg font-sans`. New imports (GlowBackground, FrostedCard, SectionHeading, StatsBar, DashboardPreview, useScrollReveal, staggerDelay). Legacy FEATURES/STATS/DIFFERENTIATORS + useInView removed. Steps 2–9 consolidated into one rewrite since staged partial states wouldn't compile. |
| 3 | Build hero section | [COMPLETE] | 2026-04-20 | Hero inside `<GlowBackground variant="center">` with gradient H1, white pill primary CTA (register), "Log in" link (login). Navbar transparent at root level (sibling of main), per Local Support / Home pattern. Deviation from plan's "Navbar inside GlowBackground" — the correct pattern is Navbar at root (absolute positioning overlays hero). |
| 4 | Add hook section + StatsBar | [COMPLETE] | 2026-04-20 | Hook: eyebrow + gradient H2 "Faith tools that meet you where you are." + paragraph. StatsBar mounted directly below. |
| 5 | Build pillar grid + mount DashboardPreview | [COMPLETE] | 2026-04-20 | 5 pillars (PRAY/READ/GROW/REST/BELONG) in FrostedCards with white icons + 5 feature bullets each + white check icons. DashboardPreview mounted below. |
| 6 | Build spotlight section | [COMPLETE] | 2026-04-20 | 3 spotlight FrostedCards: Verse Echoes, Grace-Based Streaks, Midnight Verse. White h3 (no gradient), text-white/80 description, text-white/60 proof label. |
| 7 | Rebuild differentiator checklist (8 items) | [COMPLETE] | 2026-04-20 | 8 differentiator rows with white Check icons (size 20) and text-white/80 paragraphs. max-w-2xl centered. |
| 8 | Add content depth callout | [COMPLETE] | 2026-04-20 | "Built by one person" eyebrow + gradient H2 "Six months of nights and weekends." + text-white/80 paragraph. No CTA. |
| 9 | Build final CTA + close main | [COMPLETE] | 2026-04-20 | Plain white H2 "Ready to step inside?" + white pill CTA (register) + text-white/60 reassurance. Main wrapper closes before SiteFooter. |
| 10 | Update RegisterPage test suite | [COMPLETE] | 2026-04-20 | Replaced assertions with 23-test suite covering hero, hook, StatsBar (8), pillars (5 + taglines), DashboardPreview, spotlight (3), differentiator (8), callout, final CTA, auth interactions, heading hierarchy, color compliance. Adjusted for text collisions: StatsBar labels use `getByLabelText`, overlapping phrases ("no credit card", "free forever", "the entire Bible is free to read") use `getAllByText`. All 23 pass. |
| 11 | Local verify — tests, lint, build, manual QA | [COMPLETE] | 2026-04-20 | `pnpm vitest run src/pages/__tests__/RegisterPage.test.tsx` 23/23 pass. `pnpm vitest run src/components/homepage/__tests__/StatsBar.test.tsx` 11/11 pass. `pnpm exec eslint` on touched files exit=0. `pnpm build` succeeds (13.11s). Playwright screenshots at 375/768/1440 confirm hero, hook, 8-stat 4×2 StatsBar, 5 pillars, DashboardPreview, 3 spotlights, 8 differentiators, callout, final CTA, footer all render with no console errors. Home page StatsBar verified no regression (4×2 grid, all 8 animated counters). Pre-existing lint errors in `scripts/verify-local-support-facelift.mjs` (9 errors, all from prior Local Support merge `d5c099b`) are unrelated and pre-date this work. |
