# Implementation Plan: BB-52 Bible Polish Round 4 — Final Visual Parity and UX Fixes

**Spec:** `_specs/bible-polish-round-4.md`
**Date:** 2026-04-17
**Branch:** `claude/feature/bible-polish-round-2` (existing — do NOT create a new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded; 2026-04-05 capture, pre-dates BibleReader BB-51 focus-mode default flip but is still the canonical source for Daily Hub + homepage values)
**Recon Report:** N/A
**Master Spec Plan:** N/A — standalone polish spec; amends BB-51

---

## Architecture Context

**The core problem is architectural, not cosmetic.** Every previous polish round edited CSS inside `BibleBrowser` / `BibleHero` / plan cards. The visible "lighter purple box behind content" on every Bible route comes from TWO wrappers upstream of those components:

1. `Layout.tsx` at `frontend/src/components/Layout.tsx:16-22` — when called without a `hero` prop (as Bible routes do), wraps children in `<main className="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">`. The `max-w-7xl` creates horizontal "box" edges on any viewport wider than 1280px. The `py-8` creates vertical padding between the navbar and the content's top.
2. `BibleHero.tsx` at `frontend/src/components/bible/landing/BibleHero.tsx:9` and `MyBiblePage.tsx:216` and `PlanBrowserPage.tsx:30` — all apply `style={ATMOSPHERIC_HERO_BG}`, which is `{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(...)' }` per `frontend/src/components/PageHero.tsx:10-14`. **`#0f0a1e` (dashboard-dark) is lighter than `#08051A` (hero-bg)** — that mismatch is the "lighter purple rectangle behind the hero" the spec calls out.

The Daily Hub is architecturally different: it does NOT use `<Layout>` at all. `DailyHub.tsx:214` is `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">` with `<Navbar transparent />` mounted inside, and `<main id="main-content">` with NO `max-w-7xl` constraint. The hero section sets its OWN padding (`pt-36 sm:pt-40 lg:pt-44`) to clear the absolute-positioned transparent navbar. `<HorizonGlow />` is mounted directly after the root div. No `ATMOSPHERIC_HERO_BG` anywhere.

**The fix:** Restructure BibleLanding, MyBiblePage (logged-out + logged-in), and PlanBrowserPage to match DailyHub's three-layer pattern (root `bg-hero-bg` div → `<Navbar transparent />` + `<HorizonGlow />` → transparent page content). Remove `<Layout>` from all three routes. Remove `ATMOSPHERIC_HERO_BG` inline style from all three heroes. Replace `BibleLandingOrbs` with `HorizonGlow` on Bible routes (the orbs component is not the only atmospheric layer used elsewhere — a grep confirms it's only used on BibleLanding + MyBiblePage, so we can swap without breaking anything).

### Files touched

- `frontend/src/pages/BibleLanding.tsx` — remove Layout, use DailyHub root pattern
- `frontend/src/pages/MyBiblePage.tsx` — same, both branches (logged-out + logged-in)
- `frontend/src/pages/bible/PlanBrowserPage.tsx` — same
- `frontend/src/components/bible/landing/BibleHero.tsx` — remove ATMOSPHERIC_HERO_BG, adjust padding to match DailyHub hero
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — move chapter selector from center to right cluster; replace focus-mode icon; fix focus toggle click handler; show feedback hint
- `frontend/src/pages/BibleReader.tsx` — restore visible chapter heading; pass new focus-mode props (enabled state + updateFocusSetting)
- `frontend/src/components/bible/landing/QuickActionsRow.tsx` — auth-gate My Bible click
- `frontend/src/components/bible/plans/PlanBrowseCard.tsx` — restyle to match DashboardPreview card aesthetic
- (possibly new) `frontend/src/components/bible/plans/plan-icon-map.ts` — slug→icon+color mapping

### Related patterns to follow

- **Daily Hub root structure:** `DailyHub.tsx:214-232` — the canonical three-layer pattern (root div with bg-hero-bg, HorizonGlow, transparent content).
- **HorizonGlow:** `frontend/src/components/daily/HorizonGlow.tsx` — mounted as direct child of the page root before navbar. Canonical opacity values 0.28–0.35.
- **Transparent navbar + hero clearance:** DailyHub hero at `DailyHub.tsx:221-232` uses `pt-36 pb-6 ... sm:pt-40 sm:pb-8 lg:pt-44` to clear the absolute navbar.
- **Auth gating pattern:** `MeditateTabContent.tsx:105-120` — check `isAuthenticated`, call `authModal?.openAuthModal('message')` with `return` before navigation.
- **Dashboard preview card aesthetic:** `DashboardPreview.tsx:198-219` and `dashboard-preview-data.ts` — `bg-white/[0.04] border border-white/[0.12] rounded-2xl overflow-hidden`, icon color mapping, clear text below preview. Though the spec asks for `bg-white/[0.03]` + `border-white/[0.08]` + `border-t border-white/20` (brighter top edge) — implementer matches what the live dashboard preview card renders via DOM comparison.
- **FrostedCard component:** `frontend/src/components/homepage/FrostedCard.tsx` — available if needed.
- **useFocusMode hook:** `frontend/src/hooks/useFocusMode.ts` — exports `settings` (with `.enabled`), `updateFocusSetting(key, value)`, and `triggerFocused` (no-op when `settings.enabled === false`).

### Test patterns

- Vitest + React Testing Library, file at `frontend/src/components/<area>/__tests__/<Name>.test.tsx`.
- Auth gating tests: render with `AuthModalProvider` + `AuthProvider`, simulate logged-out by NOT setting `wr_auth_simulated`, click link, assert `openAuthModal` was called with expected message (see existing `QuickActionsRow.test.tsx` for render setup).
- Focus-mode tests: the existing `useFocusMode.test.ts` mocks localStorage. ReaderChrome test exists at `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx` — extend.

### localStorage keys referenced (no new keys)

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_focus_enabled` | Both | Focus mode enabled flag. Flipped by the new toggle handler. Existing key, default `false` per BB-50/51 migration. |
| `wr_notification_prompt_dismissed` | Both | BB-41 one-time dismissal flag. Read at `BibleReader.tsx:596`, written at `:929` and `:933`. Spec requirement 5 is a verification only. |
| `wr_push_subscription` | Read | BB-41 subscription record. No change. |

### Auth gating posture

Per `02-security.md` § "Bible Wave Auth Posture" and `10-ux-flows.md` § "Auth Gating — Implementation Details", the Bible wave adds ZERO new auth gates. This spec's Requirement 4 converts an existing behavior (logged-out user sees conversion card on `/bible/my` via URL navigation) into a better UX (in-app click opens the modal without URL change). **The fallback conversion card at `/bible/my` remains unchanged** — a logged-out user arriving via direct URL, deep link, or browser back/forward still sees it.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "My Bible" card in Bible browser three-card grid (QuickActionsRow) | Requirement 4 | Step 7 | `useAuth().isAuthenticated` + `useAuthModal()?.openAuthModal('Sign in to access your highlights, notes, and reading history.')` — logged-out path calls `event.preventDefault()` before modal |
| Direct URL navigation to `/bible/my` (logged out) | Requirement 4 fallback | Step 2 (unchanged from BB-51 other than visual parity) | Existing MyBiblePage logged-out branch already calls `authModal?.openAuthModal('Sign in to track your Bible reading journey')` from the conversion card's "Get Started" button |

No other actions in this spec gate auth. Focus-mode toggle, notification prompt, reading plan card restyle, and visual parity changes are all auth-independent.

---

## Design System Values (for UI steps)

**Source precedence:** The recon report (`_plans/recon/design-system.md`) takes precedence for CSS values. `09-design-system.md` takes precedence for patterns.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page root (Bible routes, post-fix) | className | `relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans` | `DailyHub.tsx:214` |
| Page root | bg color | `#08051A` (tailwind `bg-hero-bg`) | `09-design-system.md` Color Palette |
| Atmospheric layer | component | `<HorizonGlow />` | `frontend/src/components/daily/HorizonGlow.tsx` |
| HorizonGlow orb opacity range | — | 0.28–0.35 (already in component) | `09-design-system.md` § Daily Hub Visual Architecture |
| Navbar on hero pages | variant | `<Navbar transparent />` | `DailyHub.tsx:217`; `Layout.tsx:14` |
| Hero padding (to clear transparent navbar) | class | `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` | `DailyHub.tsx:223` |
| Hero heading (Daily Hub pattern — 2-line Bible hero stays 2-line) | top line | `block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight` | existing `BibleHero.tsx:12-14` |
| Hero heading | bottom line | `block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2` + `style={GRADIENT_TEXT_STYLE}` | existing `BibleHero.tsx:15-19` |
| Content container (below hero) | class | `relative z-10 mx-auto max-w-6xl space-y-8 px-4 pb-16` | existing BibleLanding pattern; content width unchanged |
| Section divider | class | `border-t border-white/[0.08] max-w-6xl mx-auto` | `09-design-system.md` § Section Dividers |
| Reading plan card (new) | className | `group relative flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base ease-standard hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | spec Requirement 6.1-6.3 |
| Reading plan card top-edge accent | class on inner absolute div | `absolute inset-x-0 top-0 h-px bg-white/20 rounded-t-xl` | spec Requirement 6.2 (brighter top edge) |
| Reading plan icon container | class | `flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]` | match `DashboardPreview.tsx:213` icon+title flex pattern |
| Reading plan icon colors | per-slug | `psalms-30-days: BookOpen text-blue-400`, `john-story-of-jesus: Star text-amber-400`, `when-youre-anxious: Heart text-teal-400`, `when-you-cant-sleep: Moon text-indigo-400`, fallback `BookOpen text-white/70` | spec Requirement 6.4 |
| Reading plan title | class | `text-base font-semibold text-white` | spec + DashboardPreview parity |
| Reading plan subtitle | class | `text-sm text-white/70` | spec Requirement 6.5 |
| Reading plan meta line | class | `text-xs text-white/50` | existing PlanBrowseCard pattern preserved |
| Chapter heading (restored in reader body) | class | `text-2xl font-semibold text-white/90 mb-6` + style `fontFamily: FONT_FAMILY_CLASSES[settings.fontFamily]` so it inherits reader font choice | derived from existing reader body styling; [UNVERIFIED] see note below |
| Focus toggle icon OFF state | icon | `Eye` from `lucide-react` | spec Design Notes |
| Focus toggle icon ON state | icon | `EyeOff` from `lucide-react` | spec Design Notes |
| Focus toggle transition | duration × easing | `duration-fast` (150ms) × `ease-sharp` | spec Requirement 3; `animation.ts` tokens |
| Focus hint toast class | — | `fixed bottom-20 left-1/2 -translate-x-1/2 z-30 rounded-full bg-hero-bg/90 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm text-white/90 shadow-lg` + fade in/out via opacity + pointer-events-none | [UNVERIFIED] derived from existing toast styling |

**[UNVERIFIED] chapter heading class**: Best guess is `text-2xl font-semibold text-white/90 mb-6`. Reader body font/size varies by user settings — this header should NOT take those settings (it's chrome-tier prose, not verse text), so use fixed Inter sans.
→ To verify: Run `/verify-with-playwright /bible/john/3` and compare the restored heading's rendering against the BB-50 screenshots showing the pre-removal state if available; otherwise test that the heading reads well in all three reader themes (midnight, parchment, sepia).
→ If wrong: Adjust size/weight/color to match visual review.

**[UNVERIFIED] focus-mode hint toast styling**: The spec calls for "subtle inline hint" with copy "Toolbar will auto-hide after inactivity" for ~2 seconds. No existing toast component fits — the app's `useToast` hook shows celebration-style toasts that are too loud for this micro-interaction.
→ To verify: Run `/verify-with-playwright /bible/john/3`, toggle focus mode, confirm the hint appears for 2s without drawing the eye away from the reading surface.
→ If wrong: Downgrade to a `role="status"` aria-live announcement only with no visual component; OR use the existing `useToast` with a minimal variant if one is added.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` must display before every UI step:**

- **Bible routes must match Daily Hub's root structure** — the root is a plain `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">`. Do NOT use `<Layout>`. Do NOT wrap in an inner `min-h-screen` div. The `<Navbar transparent />` and `<HorizonGlow />` are mounted inside.
- **`ATMOSPHERIC_HERO_BG` is the wrong pattern for Bible hero sections** — the `#0f0a1e` (dashboard-dark) background is the "lighter purple rectangle" the spec calls out. Remove the `style={ATMOSPHERIC_HERO_BG}` prop entirely on Bible heroes.
- **`<BibleLandingOrbs />` must be replaced with `<HorizonGlow />` on Bible routes** — HorizonGlow is the canonical Daily Hub atmospheric layer and produces the target visual. BibleLandingOrbs produced the wrong orb opacity + position and contributed to the structural mismatch.
- **Hero padding for transparent navbar clearance** — `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44`. The existing Bible hero uses `pt-12 sm:pt-16 lg:pt-20` which is too small; the transparent navbar will overlap content.
- **Default text opacity on Daily Hub / Round-3-standard pages is `text-white`** (not `text-white/70`). Per `09-design-system.md` § Text Opacity Standards, reserve muted opacities for placeholder/lock/decorative. Reading plan card titles use `text-white`, subtitles `text-white/70`, meta `text-white/50`.
- **`useFocusMode.triggerFocused` is a no-op when `settings.enabled === false`** — this is the focus-toggle-does-nothing bug. The toggle button must call `updateFocusSetting('enabled', !settings.enabled)`, NOT `triggerFocused`.
- **No heading on Daily Hub tabs; a static `<h1>` on Bible chapters** — "Genesis 1" restored in the reader body is THE page `<h1>`. The existing `sr-only` h1 at `BibleReader.tsx:842` must change to a visible heading. Remove `sr-only`.
- **Animation tokens mandatory** — import from `constants/animation.ts`. Focus toggle uses `fast` (150ms) + `sharp`; plan card hover uses `base` (250ms) + `standard`. Do NOT hardcode `ms` or `cubic-bezier(...)`.
- **No new localStorage keys** — every key referenced in this spec already exists. Do not introduce any new `wr_*` or `bible:*` keys.
- **Deprecated patterns forbidden** — no Caveat headings, no GlowBackground on Bible routes (Daily Hub pattern wins here), no `animate-glow-pulse`, no cyan textarea glow, no `font-serif italic` on prose, no `ATMOSPHERIC_HERO_BG`.

---

## Shared Data Models (from Master Plan)

N/A — no master plan. No new TypeScript interfaces. Existing types in use:

- `FocusModeSettings` from `frontend/src/hooks/useFocusMode.ts`
- `PlanMetadata` from `frontend/src/types/bible-plans.ts`

**localStorage keys this spec touches:** see Architecture Context above. No new keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Reading plan cards: 1-column grid. BibleLanding hero padding uses `pt-36`. BibleReader top bar: right cluster may compress — Typography, Audio, Focus, Books, Audio Play icons remain; chapter selector sits left of Typography. The "← Study Bible" back button shows icon only if label overflows. Static chapter heading renders at `text-2xl`. |
| Tablet | 768px | Reading plan cards: 2-column grid. Hero padding `sm:pt-40`. Top bar has space for chapter selector label `Genesis 1 ▾` alongside all icons. |
| Desktop | 1440px | Reading plan cards: 2-column grid (do NOT change to 3 or 4 — spec Requirement 6.6). Hero padding `lg:pt-44`. Top bar comfortable. Edge-to-edge dark background verified against Daily Hub reference: the `max-w-6xl` content container centers content while the root `bg-hero-bg` covers the full viewport — no visible edges. |

**Custom breakpoints:** None introduced.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| ReaderChrome top bar | `← Study Bible` (left), `Genesis 1 ▾` dropdown + `T` Typography + Volume2 + Focus toggle + Books + Audio Play (all right) | All items share y ±5px at 1440px and 768px | At ≤375px, labels may truncate/hide but icons must stay on one row |
| Reading plan card inner row | Icon container (40×40) + title line | Icon top-aligned with title text baseline within card padding | N/A — fixed widths, no wrapping risk |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification) to compare `boundingBox().y` values between elements.

---

## Vertical Rhythm

**Expected spacing between adjacent sections on `/bible` (post-fix):**

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar (transparent, z-10 overlay) → Hero heading top | Matches Daily Hub: `pt-36` = 144px from top of viewport to heading top (heading sits ~64px below the navbar bottom edge at navbar height ~80px) | `DailyHub.tsx:223` |
| Hero `pb-6` → first content section (streak chip or hero slot) | `pb-6 sm:pb-8` from hero section bottom (24px–32px) + `space-y-8` between content items | existing BibleLanding pattern preserved |
| Last content section → footer | `pb-16` (64px) at container bottom | existing BibleLanding pattern preserved |
| Reading plan cards — gap between cards in grid | `gap-4` (16px) | existing grid pattern; spec requirement 6.6 |

`/execute-plan` checks these during visual verification. `/verify-with-playwright` compares these in Step 6e.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BibleLandingOrbs component is only imported by BibleLanding.tsx and MyBiblePage.tsx (grep confirmed). Replacing with HorizonGlow will not break other pages.
- [ ] `HorizonGlow` can be used on Bible routes without contradiction with `09-design-system.md` § Daily Hub Visual Architecture note "Do not use on other pages without explicit reconsideration". This spec IS the explicit reconsideration. Document in post-execution PR description.
- [ ] The focus-mode toggle bug is reproducible: taps do nothing. Expected cause: `triggerFocused` no-ops because `settings.enabled` defaults to `false` (per BB-50/51 migration).
- [ ] The BB-41 notification prompt persistence is correct as written at `BibleReader.tsx:596`, `:929`, `:933` — a manual verification on existing code should suffice for acceptance criterion. If verification finds a bug, file a follow-up step.
- [ ] All auth-gated actions from the spec are accounted for in Step 7 only — Requirement 4 is the sole new auth gate.
- [ ] Design system values are verified (from reference or codebase inspection above).
- [ ] All [UNVERIFIED] values are flagged with verification methods — 2 items (chapter heading class, focus hint toast styling).
- [ ] No prior specs block this — BB-51 is committed (`223665b bible-polish-round-3` in git log is the head of the BB-47→BB-51 chain).
- [ ] No deprecated patterns introduced: no Caveat headings, no GlowBackground on Bible routes (HorizonGlow is now allowed on Bible routes), no `animate-glow-pulse`, no cyan borders, no `ATMOSPHERIC_HERO_BG`, no PageTransition, no `line-clamp` on plan cards, no soft-shadow 8px-radius cards.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Should HorizonGlow's "Daily-Hub-only" scoping be relaxed to cover Bible routes? | Yes | `09-design-system.md` itself leaves this as "without explicit reconsideration" — this spec IS the reconsideration. Bible routes sit in the same emotional register as Daily Hub (reading scripture, reflective). The decorative layer is a match, not a conflict. Document in `09-design-system.md` in a follow-up edit (not part of this spec's scope per spec Out of Scope). |
| Should the body heading on BibleReader be `<h1>` or `<h2>`? | `<h1>` | The existing `sr-only` element at `BibleReader.tsx:842` is already `<h1>` semantically. Keep it `<h1>`; the BibleReader page has no other visible heading of that level. The toolbar selector is a button, not a heading. |
| Should the chapter dropdown in the top bar become a text button "Genesis 1 ▾" with the same handler as before (opens chapters drawer)? | Yes | No change to behavior — only position changes. The existing `handleCenterClick` calls `bibleDrawer.open({ type: 'chapters', bookSlug })`. Preserve that. |
| How wide should the reading plan grid be on desktop? | `max-w-6xl mx-auto` (matches Daily Hub divider width); 2-column | Spec Requirement 6.6 is explicit: 2-column desktop/tablet, 1-column mobile. Do not expand to 3-column. |
| Should the notification prompt verification produce a test? | Yes — add one regression test | Even if current code is correct, a regression test guards the spec's requirement 5 going forward. Low cost, high leverage. |
| Should the Bible Browser's 3-card grid (`QuickActionsRow`) still use links for authenticated users? | Yes | Spec explicitly says "In-app `My Bible` click → auth modal ... If authenticated, navigate normally via `<Link>`". Preserve semantic `<Link>` for SEO/right-click-open-in-new-tab when logged in. |
| Should `MyBiblePage` logged-out conversion card ALSO be visually restructured in Step 2? | Yes | Spec Requirement 1 mandates "both logged-out conversion card and logged-in full view" match Daily Hub. Single step covers both branches. |
| If a user clicks "My Bible" while logged out and then successfully registers, should they auto-navigate to `/bible/my`? | No — follow existing Phase-2 pattern | AuthModal in Phase 2 is UI shell only; there's no real auth success event. Replicating the existing `MyBiblePage` conversion card behavior (modal shows, modal closes with toast, user stays where they are) is consistent with Phase 2. Phase 3 will add real onSuccess navigation. Spec acknowledges this in Out of Scope. |
| Should the focus-mode button hint use an existing toast or a new component? | New inline component scoped to ReaderChrome | `useToast` celebration toasts are too loud for this micro-interaction. A 2-second auto-dismiss inline label is the right tier. Mark styling [UNVERIFIED] for post-implementation polish. |

---

## Implementation Steps

### Step 1: Restructure BibleLanding to match Daily Hub root architecture

**Objective:** Make `/bible` visually indistinguishable from `/daily` at the structural layer. Remove the `<Layout>` wrapper. Use Daily Hub's three-layer pattern.

**Files to create/modify:**
- `frontend/src/pages/BibleLanding.tsx` — remove Layout, swap BibleLandingOrbs for HorizonGlow, restructure root

**Details:**

1. Remove `import { Layout } from '@/components/Layout'`.
2. Remove `import { BibleLandingOrbs } from '@/components/bible/landing/BibleLandingOrbs'`.
3. Add `import { Navbar } from '@/components/Navbar'`, `import { SiteFooter } from '@/components/SiteFooter'`, `import { HorizonGlow } from '@/components/daily/HorizonGlow'`.
4. In `BibleLandingInner()`, replace the returned JSX:

```tsx
return (
  <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
    <HorizonGlow />
    <Navbar transparent />
    <SEO {...seoMetadata} jsonLd={bibleBreadcrumbs} />

    <main id="main-content" className="relative z-10 flex-1">
      <BibleHero />

      {/* Section divider: hero → content */}
      <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />

      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-8">
        {/* existing streak-chip + conditional landing/search content — unchanged */}
        {isAuthenticated && streak.currentStreak > 0 && ( /* StreakChip block */ )}
        {isSearchMode ? ( /* search mode block */ ) : ( /* hero slot + today's plan + quick actions + search entry */ )}
      </div>
    </main>

    <SiteFooter />

    {/* Existing drawer + modals — unchanged */}
    <BibleDrawer /* ... */ />
    {modalOpen && ( <StreakDetailModal /* ... */ /> )}
    {showReset && ( <StreakResetWelcome /* ... */ /> )}
  </div>
)
```

5. All content children keep `relative z-10` via the `<main>` wrapper (the main itself has `relative z-10`, so inner divs need NOT redeclare it as long as they remain in the normal flow).
6. Delete the inner `<div className="relative min-h-screen bg-hero-bg">` wrapper — it was nested inside Layout's main and created a visible inner box.

**Auth gating:** N/A — this step does not touch auth.

**Responsive behavior:**
- Desktop (1440px): Full-bleed dark background. `max-w-6xl` content container centers content with natural left/right gutters that are transparent (root bg-hero-bg shows through). Hero top padding `lg:pt-44` puts "Your / Study Bible" heading ~64px below the navbar.
- Tablet (768px): `sm:pt-40` hero padding. Content width respects container.
- Mobile (375px): `pt-36` hero padding. Same bg-hero-bg coverage, no visible container edges.

**Inline position expectations:** N/A — no inline-row layouts affected by this step.

**Guardrails (DO NOT):**
- Do NOT keep `<Layout>` as a wrapper. The fix requires removing it.
- Do NOT re-add `BibleLandingOrbs` alongside HorizonGlow. Replace, don't stack.
- Do NOT use `ATMOSPHERIC_HERO_BG` anywhere in this file (it's Step 4's fix).
- Do NOT introduce a new background color. `bg-hero-bg` on the root div is the only background.
- Do NOT add `GlowBackground` — per `09-design-system.md` Deprecated Patterns, GlowBackground on Daily-Hub-style pages is replaced by HorizonGlow.
- Do NOT change the drawer/modal mounting — keep the existing BibleDrawer / StreakDetailModal / StreakResetWelcome tail.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders with HorizonGlow and transparent Navbar | integration | `render(<BibleLanding />)` with router, assert `document.querySelector('[data-testid="horizon-glow"]')` exists OR assert the class list of the HorizonGlow-rendered div. Assert Navbar renders with transparent variant (check for `transparent` class marker). |
| does NOT wrap in Layout's max-w-7xl main | unit | Assert there is no element with class containing `max-w-7xl` in the rendered tree. |
| hero heading is vertically positioned via pt-36 / sm:pt-40 / lg:pt-44 | unit | Assert BibleHero's section has `pt-36` / `sm:pt-40` / `lg:pt-44` classes (test against the rendered section element). |
| existing BibleLanding content still renders (streak chip, hero slot, quick actions, search entry) | integration | Render logged-in user with `wr_streak` set; assert StreakChip visible; assert QuickActionsRow, BibleSearchEntry render. |

**Expected state after completion:**
- [ ] BibleLanding uses Daily Hub three-layer root pattern.
- [ ] No `<Layout>` wrapper in BibleLanding.
- [ ] HorizonGlow replaces BibleLandingOrbs.
- [ ] `<Navbar transparent />` used.
- [ ] All existing BibleLanding features (streak chip, hero slot, today's plan, quick actions, search) still render.
- [ ] All existing tests pass or are updated.

---

### Step 2: Restructure MyBiblePage (both logged-out conversion card and logged-in full view) to match Daily Hub

**Objective:** Apply the Step 1 pattern to `/bible/my`. Cover both branches: the BB-51 conversion card (shown to logged-out users on direct URL) and the full authenticated view.

**Files to create/modify:**
- `frontend/src/pages/MyBiblePage.tsx` — both branches

**Details:**

1. Remove `import { Layout } from '@/components/Layout'`.
2. Remove `import { BibleLandingOrbs } from '@/components/bible/landing/BibleLandingOrbs'`.
3. Remove `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'`.
4. Add `import { Navbar } from '@/components/Navbar'`, `import { SiteFooter } from '@/components/SiteFooter'`, `import { HorizonGlow } from '@/components/daily/HorizonGlow'`.
5. In `MyBiblePageInner()` — logged-out branch (the conversion card):

```tsx
if (!isAuthenticated) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
      <HorizonGlow />
      <Navbar transparent />
      <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />

      <main id="main-content" className="relative z-10 flex-1">
        <section className="mx-auto flex min-h-[calc(100vh-20rem)] max-w-[480px] items-center justify-center px-4 pt-36 sm:pt-40 lg:pt-44">
          <FrostedCard as="article" className="w-full text-center">
            {/* existing h1 + description + Get Started button — unchanged */}
          </FrostedCard>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
```

6. In `MyBibleAuthenticatedInner()` — apply the same root pattern; remove the ATMOSPHERIC_HERO_BG inline style from the hero section at `MyBiblePage.tsx:216`:

```tsx
return (
  <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
    <HorizonGlow />
    <Navbar transparent />
    <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />

    <main id="main-content" className="relative z-10 flex-1">
      {/* Hero section — REMOVE style={ATMOSPHERIC_HERO_BG}, use Daily Hub pt-36 pattern */}
      <section className="relative z-10 w-full px-4 pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
            My Bible
          </h1>
          <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
        </div>
      </section>

      {/* Remaining content (section dividers, heatmap, progress map, memorization deck, activity feed) — unchanged */}
    </main>

    <SiteFooter />

    {/* existing action menu + drawer + settings modal + streak detail modal — unchanged */}
  </div>
)
```

7. Drop the inner `<div className="relative min-h-screen max-w-[100vw] overflow-hidden bg-hero-bg">` wrapper — redundant with root.

**Auth gating:** N/A — auth check already exists at `MyBiblePage.tsx:68`. This step only restructures the JSX around both branches.

**Responsive behavior:**
- Desktop (1440px): Full-bleed dark bg. Logged-out conversion card centered with `max-w-[480px]`. Logged-in hero has max-w-2xl text block.
- Tablet (768px): `sm:pt-40` hero padding. Stat card row scrolls horizontally if needed (existing snap scroll preserved).
- Mobile (375px): `pt-36` hero padding. Single column.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT remove the `ATMOSPHERIC_HERO_BG` import from `PageHero.tsx` — other pages (Local Support, Churches, etc.) still use it via the PageHero component. Only stop using it on Bible routes.
- Do NOT keep the inner min-h-screen div — it creates the "box" effect.
- Do NOT change the My Bible content structure (heatmap, progress map, memorization deck, activity feed).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| logged-out user sees conversion card with transparent Navbar | integration | Render without auth, assert FrostedCard with "Get Started — It's Free" button. Assert no Layout wrapper class. |
| logged-in user sees full My Bible view with HorizonGlow | integration | Render with `wr_auth_simulated=true`, assert ReadingHeatmap renders. |
| hero heading padding uses Daily Hub clearance | unit | Assert hero section has `pt-36 sm:pt-40 lg:pt-44`. |
| no ATMOSPHERIC_HERO_BG inline style is applied | unit | Assert `querySelectorAll('[style*="0f0a1e"]').length === 0`. |

**Expected state after completion:**
- [ ] MyBiblePage logged-out branch uses Daily Hub root pattern.
- [ ] MyBiblePage logged-in branch uses Daily Hub root pattern.
- [ ] `ATMOSPHERIC_HERO_BG` removed from MyBiblePage hero section.
- [ ] BibleLandingOrbs replaced with HorizonGlow.
- [ ] All existing MyBiblePage tests pass or are updated.

---

### Step 3: Restructure PlanBrowserPage to match Daily Hub

**Objective:** Apply the same pattern to `/bible/plans`.

**Files to create/modify:**
- `frontend/src/pages/bible/PlanBrowserPage.tsx`

**Details:**

1. Remove `import { Layout } from '@/components/Layout'`.
2. Remove `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'`.
3. Add `import { Navbar } from '@/components/Navbar'`, `import { SiteFooter } from '@/components/SiteFooter'`, `import { HorizonGlow } from '@/components/daily/HorizonGlow'`.
4. Replace the returned JSX:

```tsx
return (
  <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
    <HorizonGlow />
    <Navbar transparent />
    <SEO {...BIBLE_PLANS_BROWSER_METADATA} />

    <main id="main-content" className="relative z-10 flex-1">
      {/* Hero — REMOVE style={ATMOSPHERIC_HERO_BG}, use Daily Hub pt-36 pattern */}
      <section className="relative flex w-full flex-col items-center px-4 pt-36 pb-6 text-center antialiased sm:pt-40 sm:pb-8 lg:pt-44">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
          Reading Plans
        </h1>
        <p className="mt-3 text-base text-white/60 sm:text-lg">
          Guided daily reading to deepen your walk
        </p>
      </section>

      <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />

      {/* Content — unchanged except remove outer min-h-screen wrapper */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* existing empty state + in-progress + browse + completed sections */}
      </div>
    </main>

    <SiteFooter />
  </div>
)
```

5. Drop the outer `<div className="min-h-screen bg-hero-bg">` wrapper — redundant with root.

**Auth gating:** N/A.

**Responsive behavior:** same as Steps 1–2.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT keep the outer `min-h-screen bg-hero-bg` div.
- Do NOT keep `ATMOSPHERIC_HERO_BG` on this page's hero.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders with HorizonGlow and transparent Navbar | integration | Assert HorizonGlow and transparent Navbar. |
| hero heading uses Daily Hub pt-36/sm:pt-40/lg:pt-44 | unit | Assert hero section padding classes. |
| no ATMOSPHERIC_HERO_BG inline style | unit | Assert no `[style*="0f0a1e"]` elements. |
| plan browse sections still render | integration | Assert "Browse plans" and plan cards render. |

**Expected state after completion:**
- [ ] PlanBrowserPage uses Daily Hub root pattern.
- [ ] `ATMOSPHERIC_HERO_BG` removed from PlanBrowserPage hero.
- [ ] All existing PlanBrowserPage tests pass or are updated.

---

### Step 4: Remove ATMOSPHERIC_HERO_BG and increase top padding on BibleHero

**Objective:** Fix the "lighter purple rectangle behind the hero" by removing the `#0f0a1e` inline background on the BibleHero section, and align vertical positioning with Daily Hub's "Good Morning" hero.

**Files to create/modify:**
- `frontend/src/components/bible/landing/BibleHero.tsx`

**Details:**

1. Remove `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'`.
2. Update the section element:

```tsx
export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-36 pb-6 text-center antialiased sm:pt-40 sm:pb-8 lg:pt-44"
    >
      <h1 id="bible-hero-heading" className="px-1 sm:px-2">
        <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
          Your
        </span>
        <span
          className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Study Bible
        </span>
      </h1>
    </section>
  )
}
```

3. Changes:
   - Remove `style={ATMOSPHERIC_HERO_BG}` prop entirely.
   - Change `pt-12 pb-8` → `pt-36 pb-6`.
   - Change `sm:pt-16 sm:pb-12` → `sm:pt-40 sm:pb-8`.
   - Change `lg:pt-20` → `lg:pt-44`.

**Auth gating:** N/A.

**Responsive behavior:** The transparent `<Navbar transparent />` introduced in Step 1 is absolute-positioned; `pt-36 sm:pt-40 lg:pt-44` creates the exact clearance used by DailyHub hero, placing "Your / Study Bible" heading ~64px below the navbar bottom edge — the same visual relationship as "Good Morning!".

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT re-add the ATMOSPHERIC_HERO_BG inline style.
- Do NOT remove the 2-line heading (Your / Study Bible).
- Do NOT reduce the hero padding below pt-36 — the transparent navbar will overlap.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| section has no inline background style | unit | Assert `section.getAttribute('style')` does not contain `background`. |
| padding classes match Daily Hub clearance | unit | Assert classes `pt-36 sm:pt-40 lg:pt-44` present on section. |
| heading structure preserved (Your + Study Bible, 2 lines) | unit | Assert both spans render with expected text. |

**Expected state after completion:**
- [ ] BibleHero has no inline background style.
- [ ] Padding matches Daily Hub pattern.
- [ ] Heading lines unchanged.

---

### Step 5: Restore static chapter heading and move chapter dropdown to right cluster

**Objective:** (A) Restore visible "Book Chapter" heading in the reader body. (B) Move the "Genesis 1 ▾" dropdown from the center of the top bar to the right cluster (before the Typography button). Left side retains only the back button.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — change `sr-only` h1 to visible heading
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — move chapter selector to right cluster

**Details — (A) Static heading in body:**

1. In `BibleReader.tsx:842`, change:

```tsx
<h1 className="sr-only">{book.name} {chapterNumber}</h1>
```

to:

```tsx
<h1 className="mb-6 text-2xl font-semibold text-white/90">
  {book.name} {chapterNumber}
</h1>
```

[UNVERIFIED] — see Design System Values table note; final styling confirmed during `/verify-with-playwright`.

**Details — (B) Move chapter dropdown to right cluster in ReaderChrome:**

1. In `ReaderChrome.tsx`, delete the center button block (`lines 86-97` — the current `<button ref={centerRef}>` rendering the "Book Chapter ▾" dropdown).
2. Change the outer flex layout from `justify-between` to `justify-between` (keep — still correct, but the center slot now disappears; left and right clusters remain).
3. Add a new button INSIDE the right-side icon cluster as its FIRST child (before the Typography `Type` button), preserving the `handleCenterClick` handler:

```tsx
{/* Right: Chapter selector + Aa + Focus + Books icons */}
<div className="flex items-center gap-1">
  <button
    ref={centerRef}
    type="button"
    className="flex min-h-[44px] items-center gap-1 rounded-full px-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:text-base"
    aria-label="Open chapter picker"
    onClick={handleCenterClick}
  >
    <span>{bookName} {chapter}</span>
    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
  </button>
  {/* Aa Typography button — unchanged */}
  <button ref={aaRef} ... />
  {/* Ambient audio, Focus toggle, Books, Audio Play — unchanged positions */}
</div>
```

4. Left cluster stays as-is (just the `← Study Bible` back button).

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): All right-cluster items on one row. Chapter selector shows `Genesis 1` label.
- Tablet (768px): Same — comfortable spacing.
- Mobile (375px): Right cluster icons are 44x44 each; chapter selector label `Genesis 1` may compress to show abbreviated text like `Gen 1` if Tailwind text truncation is needed. For now, keep full label — validate during verification. Back button label `Study Bible` may need hiding on mobile (`sm:inline hidden`) — update during verification if overflow occurs.

**Inline position expectations:**
- At 1440px: Chapter selector, Typography, (Audio), Focus, Books, (Audio Play) ALL share y ±5px.
- At 768px: Same row maintained.
- At 375px: Same row maintained; icons truncate labels as needed, not wrap.

**Guardrails (DO NOT):**
- Do NOT remove the chapter selector — only move it.
- Do NOT change `handleCenterClick`'s logic. The drawer open call with `{ type: 'chapters', bookSlug }` must remain identical.
- Do NOT render the chapter selector in both center AND right positions — the center must be empty.
- Do NOT add a new localStorage key.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleReader renders visible chapter heading | unit | `render(<BibleReader />)` with valid params, assert `screen.getByRole('heading', { level: 1, name: 'Genesis 1' })` is visible (not sr-only). |
| ReaderChrome renders chapter selector in right cluster | unit | Assert the chapter selector button is a child of the right-side flex container and precedes the Typography button. |
| ReaderChrome does NOT render center-positioned chapter button | unit | Assert no center button between back and right cluster. |
| handleCenterClick still opens chapters drawer | unit | Click chapter selector button, assert `bibleDrawer.open` was called with `{ type: 'chapters', bookSlug }`. |

**Expected state after completion:**
- [ ] Static visible `<h1>` chapter heading in BibleReader body above verses.
- [ ] Chapter dropdown moved from center to right cluster in ReaderChrome.
- [ ] Left cluster of top bar contains only the back button.
- [ ] All ReaderChrome existing tests pass or are updated.

---

### Step 6: Fix focus-mode toggle handler, icon, and feedback

**Objective:** Fix the bug where tapping the focus-mode toggle does nothing. Replace the icon with Eye/EyeOff for clarity. Show a 2-second inline hint on toggle-ON.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — replace Minimize2 with Eye/EyeOff, accept new props
- `frontend/src/pages/BibleReader.tsx` — pass `focusEnabled` + `onFocusEnabledToggle` props; show/hide hint

**Details:**

1. In `ReaderChrome.tsx`, replace the `Minimize2` import with `import { Eye, EyeOff } from 'lucide-react'` (remove Minimize2 if no other usages).
2. Change the `ReaderChromeProps` interface:
   - Remove `isManuallyArmed: boolean` and `onFocusToggle: () => void`.
   - Add `focusEnabled: boolean` and `onFocusEnabledToggle: () => void`.
3. Replace the focus toggle button JSX:

```tsx
<button
  type="button"
  className={cn(
    ICON_BTN,
    'relative transition-colors duration-fast ease-sharp',
    focusEnabled && 'text-white bg-white/10',
  )}
  aria-label={
    focusEnabled
      ? 'Disable focus mode (keep toolbar visible)'
      : 'Enable focus mode (auto-hide toolbar)'
  }
  aria-pressed={focusEnabled}
  onClick={onFocusEnabledToggle}
>
  {focusEnabled ? (
    <EyeOff className="h-5 w-5" />
  ) : (
    <Eye className="h-5 w-5" />
  )}
</button>
```

4. In `BibleReader.tsx`:
   - Pass `focusEnabled={focusMode.settings.enabled}` and `onFocusEnabledToggle={() => { const next = !focusMode.settings.enabled; focusMode.updateFocusSetting('enabled', next); if (next) setShowFocusHint(true) }}` (where `showFocusHint` is a new local state).
   - Replace the existing `isManuallyArmed` and `onFocusToggle` props.
   - Remove the old `onFocusToggle={focusMode.triggerFocused}` line — the bug was that `triggerFocused` no-ops when `settings.enabled === false`.

5. Add hint state + auto-dismiss effect in `BibleReader.tsx`:

```tsx
const [showFocusHint, setShowFocusHint] = useState(false)
useEffect(() => {
  if (!showFocusHint) return
  const t = setTimeout(() => setShowFocusHint(false), 2000)
  return () => clearTimeout(t)
}, [showFocusHint])
```

6. Add hint UI below/near the ReaderChrome in BibleReader:

```tsx
{showFocusHint && (
  <div
    role="status"
    aria-live="polite"
    className="fixed left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-hero-bg/90 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm text-white/90 shadow-lg pointer-events-none"
  >
    Toolbar will auto-hide after inactivity
  </div>
)}
```

[UNVERIFIED] — positioning and styling polish via `/verify-with-playwright`.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop/tablet: Hint centered horizontally, positioned ~80px from top (below the top bar).
- Mobile: Same; the fixed positioning and narrow padding keep it readable at 375px.

**Inline position expectations:** The focus toggle button is part of the right cluster row (see Step 5 inline table). The hint is standalone and does not need alignment with other elements.

**Guardrails (DO NOT):**
- Do NOT call `focusMode.triggerFocused` from the button. That path no-ops when focus mode is disabled (the bug).
- Do NOT bypass the `updateFocusSetting` hook by writing to localStorage directly from ReaderChrome.
- Do NOT keep the `isManuallyArmed` / `pendingDot` micro-UI that the old Minimize2 button had — the new toggle's pressed state is carried by `aria-pressed` + `bg-white/10` + the Eye/EyeOff icon swap.
- Do NOT show the hint when toggling OFF — the spec only calls for it on ON.
- Do NOT show the hint for longer than ~2 seconds.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| toggle OFF → ON flips localStorage via updateFocusSetting | unit | Mount ReaderChrome inside a test harness wrapping useFocusMode, click button, assert `localStorage.getItem('wr_bible_focus_enabled')` is `'true'`. |
| toggle ON → OFF flips localStorage back | unit | Set enabled=true initial state, click button, assert localStorage flips to `'false'`. |
| aria-label changes between states | unit | Assert initial aria-label `'Enable focus mode (auto-hide toolbar)'`; after click, aria-label becomes `'Disable focus mode (keep toolbar visible)'`. |
| icon swaps Eye → EyeOff on toggle ON | unit | Assert `Eye` icon present initially (querySelectorAll by data-testid if Lucide supports, or by presence of aria-label); after click, `EyeOff` present. |
| hint appears for ~2s on toggle ON | integration | Use fake timers, click toggle, assert `getByRole('status')` visible; advance timer 2000ms, assert status disappears. |
| hint does NOT appear on toggle OFF | integration | Start with enabled=true, click toggle, assert status not present. |

**Expected state after completion:**
- [ ] Focus mode toggle actually flips `wr_bible_focus_enabled` localStorage key on every tap.
- [ ] Icon swaps between Eye and EyeOff based on state.
- [ ] aria-label reflects current state.
- [ ] 2-second inline hint appears only when toggling ON.
- [ ] Animation uses `fast` (150ms) + `sharp` easing tokens.
- [ ] ReaderChrome + BibleReader tests pass or are updated.

---

### Step 7: Auth-gate the "My Bible" click in QuickActionsRow

**Objective:** When a logged-out user clicks the "My Bible" card in the Bible browser three-card grid, intercept the click and open the auth modal instead of navigating. Logged-in users navigate normally.

**Files to create/modify:**
- `frontend/src/components/bible/landing/QuickActionsRow.tsx`

**Details:**

1. Add imports:

```tsx
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
```

2. In the component:

```tsx
export function QuickActionsRow() {
  const { open, triggerRef } = useBibleDrawer()
  const browseRef = useRef<HTMLButtonElement>(null)
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  // ...
```

3. For the My Bible card, intercept the click:

```tsx
{/* My Bible card — auth-gated click */}
<FrostedCard as="article" className="min-h-[44px]">
  <Link
    to="/bible/my"
    onClick={(e) => {
      if (!isAuthenticated) {
        e.preventDefault()
        authModal?.openAuthModal('Sign in to access your highlights, notes, and reading history.')
      }
    }}
    className="flex flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
  >
    <Bookmark className="h-6 w-6 text-white/70" aria-hidden="true" />
    <h3 className="text-base font-semibold text-white">My Bible</h3>
    <p className="text-sm text-white/60">Highlights, notes & bookmarks</p>
  </Link>
</FrostedCard>

{/* Reading Plans — unchanged, still auth-optional */}
<FrostedCard as="article" className="min-h-[44px]">
  <Link to="/bible/plans" className="...">
    <ListChecks className="h-6 w-6 text-white/70" aria-hidden="true" />
    <h3 className="text-base font-semibold text-white">Reading Plans</h3>
    <p className="text-sm text-white/60">Guided daily reading</p>
  </Link>
</FrostedCard>
```

4. Since the ROUTE_ACTIONS array has mixed behavior now (only My Bible needs auth gating), inline both cards separately instead of mapping over the array. Remove the `ROUTE_ACTIONS.map` block and replace with two explicit FrostedCards.

**Auth gating:**
- Logged-out user clicks "My Bible" card → `event.preventDefault()` stops navigation → `authModal?.openAuthModal('Sign in to access your highlights, notes, and reading history.')` → modal opens → URL unchanged.
- Logged-in user clicks "My Bible" → Link navigates to `/bible/my` normally.
- Keyboard: `Tab` + `Enter` on the `<Link>` triggers the onClick handler identically to mouse click (React Router Link + native `<a>` element handle this automatically).
- `e.preventDefault()` on the Link's onClick prevents React Router's click handler from navigating.

**Responsive behavior:**
- Desktop/tablet/mobile: same layout as today (3-column grid on sm+, 1-column on mobile). No visual change; only behavior.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT navigate to `/bible/my` first and then open the modal. The click must not change the URL for logged-out users.
- Do NOT remove the Link's `to` prop — logged-in users AND right-click-open-in-new-tab still need a valid href.
- Do NOT open the auth modal for logged-in users.
- Do NOT change the Reading Plans card behavior — it remains auth-optional.
- Do NOT remove the conversion card fallback in `MyBiblePage.tsx` — per spec, direct URL / deep link / browser back/forward users still see it.
- Do NOT attempt an `onSuccess` navigation callback. The AuthModalProvider does not support it in Phase 2 (AuthModal is UI shell only). Spec acknowledges this in Out of Scope.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| logged-out user clicking "My Bible" opens auth modal with expected message | integration | Render with no `wr_auth_simulated`, wrap in AuthModalProvider + AuthProvider + MemoryRouter, click My Bible Link, assert modal visible with text "Sign in to access your highlights, notes, and reading history." Assert URL did not change (MemoryRouter history length unchanged). |
| logged-out user clicking "My Bible" does NOT navigate | integration | Use MemoryRouter; after click, assert history.location.pathname is still the starting route (/bible). |
| logged-in user clicking "My Bible" navigates to /bible/my | integration | Set `wr_auth_simulated = 'true'`, click My Bible, assert router location updates to /bible/my. |
| Reading Plans card still navigates for both logged-in and logged-out | integration | Click Reading Plans Link, assert navigation occurs regardless of auth state. |
| keyboard Enter on My Bible Link triggers auth modal when logged-out | integration | Focus Link, press Enter, assert auth modal opens. |
| direct URL navigation to /bible/my (via the router history push) still renders the BB-51 conversion card | integration | `navigate('/bible/my')` programmatically without auth, assert `MyBiblePage` renders the FrostedCard with "Get Started — It's Free" button (unchanged from BB-51). |

**Expected state after completion:**
- [ ] In-app "My Bible" click triggers auth modal for logged-out users; URL unchanged.
- [ ] Logged-in users navigate normally.
- [ ] Direct URL to `/bible/my` still shows BB-51 conversion card for logged-out users (unchanged).
- [ ] Keyboard navigation (Enter / Space) works identically to click.
- [ ] Focus returns to the triggering link on modal close (AuthModal uses `useFocusTrap` which restores focus).

---

### Step 8: Verify BB-41 notification prompt dismissal persistence (no code change expected)

**Objective:** Per spec Requirement 5, verify that `wr_notification_prompt_dismissed = 'true'` persists correctly across navigation and re-reads. If verification passes, document in this plan's Execution Log and add a regression test. If verification fails, file a follow-up step.

**Files to create/modify:**
- `frontend/src/pages/__tests__/BibleReader.notification-prompt.test.tsx` (new test file — minimal scope, focused on dismissal persistence)

**Details (verification — manual):**

1. In a dev session: open `/bible/john/3`, trigger a 2nd reading session within the day (read chapter, navigate away, come back to a different chapter), see the prompt, click "Maybe later".
2. Reload the page. Navigate to `/bible/genesis/1` and trigger the 2nd-reading condition again.
3. Assert the prompt does NOT re-appear.
4. Verify `localStorage.getItem('wr_notification_prompt_dismissed')` equals `'true'` throughout.

**Details (regression test — always do):**

Create `frontend/src/pages/__tests__/BibleReader.notification-prompt.test.tsx`:

```tsx
// Setup: mock getPushSupportStatus to return 'supported', getPermissionState to return 'default',
// and recordReadToday to return { delta: 'same-day' } so the prompt would show.
//
// Test 1: prompt appears when dismiss flag absent
//   - Delete wr_notification_prompt_dismissed, mount BibleReader, trigger the effect,
//     assert prompt renders.
// Test 2: prompt does NOT appear when dismiss flag is 'true'
//   - Set localStorage.setItem('wr_notification_prompt_dismissed', 'true'), mount BibleReader,
//     trigger the effect, assert prompt does NOT render.
// Test 3: clicking "Maybe later" writes the flag AND hides the prompt
//   - Mount with prompt visible, click "Maybe later" button, assert localStorage flag set,
//     assert prompt hidden.
// Test 4: flag persists across component unmount/remount
//   - Mount, click Maybe later, unmount, remount, assert prompt does NOT render.
```

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT modify the notification prompt behavior unless the manual verification finds a bug. If the code at `BibleReader.tsx:596`, `:929`, `:933` is correct (which the static read suggests it is), DO NOTHING beyond the regression test.
- Do NOT change `wr_notification_prompt_dismissed` semantics.
- Do NOT add a "reset notifications" button — out of scope.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| prompt appears when dismiss flag absent + conditions met | integration | Clear flag, mount BibleReader, trigger 2nd-reading effect, assert prompt renders. |
| prompt suppressed when dismiss flag is 'true' | integration | Set flag, mount BibleReader, trigger effect, assert prompt does NOT render. |
| clicking "Maybe later" sets flag and hides prompt | integration | Mount with prompt visible, click "Maybe later", assert localStorage flag set to `'true'` AND prompt hidden. |
| flag persists across unmount/remount | integration | Mount, click "Maybe later", unmount, remount, re-trigger condition, assert prompt does NOT render. |

**Expected state after completion:**
- [ ] Manual verification documented in Execution Log: prompt does not re-appear after "Maybe later".
- [ ] 4 regression tests added.
- [ ] If a bug was found, documented in the Execution Log with root cause and separate commit.

---

### Step 9: Restyle reading plan cards to match DashboardPreview aesthetic

**Objective:** Replace the plain dark `PlanBrowseCard` with a frosted-glass card matching the homepage DashboardPreview cards. Add a colored Lucide icon per plan slug.

**Files to create/modify:**
- `frontend/src/components/bible/plans/plan-icon-map.ts` (new — small slug→icon+color lookup)
- `frontend/src/components/bible/plans/PlanBrowseCard.tsx` — restyle
- (possibly) `frontend/src/components/bible/plans/PlanInProgressCard.tsx` + `PlanCompletedCard.tsx` — match new aesthetic so in-progress/completed cards don't look different from browse cards

**Details — plan-icon-map.ts:**

```tsx
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Star, Heart, Moon } from 'lucide-react'

interface PlanIconConfig {
  icon: LucideIcon
  colorClass: string // Tailwind text color
}

// Slug → icon + color mapping. Extend when new plans are added.
// Unlisted slugs fall back to the default (BookOpen, white/70).
const PLAN_ICON_MAP: Record<string, PlanIconConfig> = {
  'psalms-30-days': { icon: BookOpen, colorClass: 'text-blue-400' },
  'john-story-of-jesus': { icon: Star, colorClass: 'text-amber-400' },
  'when-youre-anxious': { icon: Heart, colorClass: 'text-teal-400' },
  'when-you-cant-sleep': { icon: Moon, colorClass: 'text-indigo-400' },
}

const DEFAULT_ICON_CONFIG: PlanIconConfig = {
  icon: BookOpen,
  colorClass: 'text-white/70',
}

export function getPlanIconConfig(slug: string): PlanIconConfig {
  return PLAN_ICON_MAP[slug] ?? DEFAULT_ICON_CONFIG
}
```

**Details — PlanBrowseCard.tsx:**

```tsx
import { Link } from 'react-router-dom'
import type { PlanMetadata } from '@/types/bible-plans'
import { getPlanIconConfig } from './plan-icon-map'

interface PlanBrowseCardProps {
  plan: PlanMetadata
}

export function PlanBrowseCard({ plan }: PlanBrowseCardProps) {
  const { icon: Icon, colorClass } = getPlanIconConfig(plan.slug)

  return (
    <article aria-label={plan.title}>
      <Link
        to={`/bible/plans/${plan.slug}`}
        className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base ease-standard hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg min-h-[140px]"
      >
        {/* Brighter top-edge accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden="true" />

        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{plan.title}</h3>
            <p className="text-sm text-white/70">{plan.shortTitle}</p>
          </div>
        </div>

        {/* Meta line */}
        <p className="text-xs text-white/50">
          {plan.duration} days &middot; {plan.estimatedMinutesPerDay} min/day
        </p>
        <p className="text-xs text-white/50">By {plan.curator}</p>
      </Link>
    </article>
  )
}
```

Key differences vs existing card:
- Background `bg-white/[0.03]` instead of `bg-white/5` (lighter per spec 6.1).
- Border `border-white/[0.08]` instead of `border-white/10`.
- Added `rounded-xl` instead of `rounded-2xl` to match DashboardPreview cards' `rounded-2xl` — wait, DashboardPreview uses `rounded-2xl`. Use `rounded-xl` per spec 6.2 ("rounded-xl"). Match the spec here.
- Removed `aspect-[4/3]` and `justify-end` — those were for a poster-style card. New cards are content-first with icon + title at top, meta at bottom.
- Added `min-h-[140px]` to give cards consistent height across a grid row.
- Added absolute-positioned `h-px bg-white/20` top accent.
- Added icon container with `bg-white/[0.06]` and slug-mapped Lucide icon.
- `duration-base ease-standard` for hover animation (per spec 6.3 and animation token rules).

**Details — PlanInProgressCard / PlanCompletedCard:**

These cards already exist and render in-progress / completed plans (inspect files to confirm structure). Update them to use the same base styling so all three sections (in progress, browse, completed) look visually consistent. Preserve their existing progress UI (progress bars, completion badges).

**Details — PlanBrowserSection grid:**

Verify that `PlanBrowserSection` renders children in a grid that's 1-column on mobile and 2-column on tablet/desktop. Per spec Requirement 6.6 and BB-51 baseline, 2-column on desktop/tablet, 1-column on mobile. If the existing section already does this, no change needed.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): 2-column grid. Cards stretch to fill column width.
- Tablet (768px): 2-column grid.
- Mobile (375px): 1-column grid. Icon container stays at 40×40 (min 20×20 per spec 6 responsive note — not reduced unless needed); icon inside remains `h-5 w-5`.

**Inline position expectations:**
- Card inner: Icon container and title block are siblings in a `flex items-start gap-3` — no y-alignment verification needed (start-alignment is intentional and expected).

**Guardrails (DO NOT):**
- Do NOT use `animate-glow-pulse` or any deprecated animation.
- Do NOT hardcode `cubic-bezier(...)` or `ms` — use `duration-base` + `ease-standard` tokens.
- Do NOT apply `line-clamp` to descriptions — preserve card flex-layout so copy is visible.
- Do NOT use different card styling between PlanBrowseCard, PlanInProgressCard, and PlanCompletedCard — visual consistency matters.
- Do NOT introduce 3-column or 4-column grid on desktop. Keep 2-column.
- Do NOT remove the curator / duration metadata — it's useful info.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PlanBrowseCard renders with slug-mapped icon (Psalms → BookOpen blue) | unit | Render with `plan={slug: 'psalms-30-days', ...}`, assert BookOpen icon present and has `text-blue-400` class. |
| PlanBrowseCard renders Star amber for John | unit | Same, with `slug: 'john-story-of-jesus'` → Star icon with `text-amber-400`. |
| PlanBrowseCard renders Heart teal for Anxious | unit | Same, with `slug: 'when-youre-anxious'` → Heart icon with `text-teal-400`. |
| PlanBrowseCard renders Moon indigo for Sleep | unit | Same, with `slug: 'when-you-cant-sleep'` → Moon icon with `text-indigo-400`. |
| unknown slug falls back to default BookOpen white/70 | unit | `slug: 'unknown-plan'` → BookOpen icon with `text-white/70`. |
| card uses new frosted glass styling | unit | Assert `bg-white/[0.03]`, `border-white/[0.08]`, `rounded-xl`, `backdrop-blur-sm` classes present. |
| card has brighter top edge | unit | Assert `<div>` with `bg-white/20` absolute-positioned inside card. |
| card hover uses duration-base token | unit | Assert `duration-base` class present (not `duration-300` or `duration-200`). |
| title renders in text-white, subtitle in text-white/70, meta in text-white/50 | unit | Assert class matches per element. |

**Expected state after completion:**
- [ ] Reading plan cards visually match DashboardPreview cards (frosted glass, brighter top edge, colored icon left of title).
- [ ] Per-slug icon mapping implemented in `plan-icon-map.ts`.
- [ ] Unknown slugs fall back gracefully to default icon.
- [ ] 2-column desktop/tablet, 1-column mobile grid preserved.
- [ ] Existing PlanBrowseCard tests updated to match new structure.
- [ ] PlanInProgressCard and PlanCompletedCard updated to share the new aesthetic.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | BibleLanding: remove Layout, add HorizonGlow + transparent Navbar |
| 2 | 1 (pattern established) | MyBiblePage: same root restructure for both logged-out + logged-in branches |
| 3 | 1 (pattern established) | PlanBrowserPage: same root restructure |
| 4 | 1 (need Navbar transparent already wired) | BibleHero: remove ATMOSPHERIC_HERO_BG, add pt-36 padding |
| 5 | — | BibleReader + ReaderChrome: static heading + move chapter dropdown to right |
| 6 | 5 (same files) | BibleReader + ReaderChrome: fix focus toggle handler, icon, hint |
| 7 | — | QuickActionsRow: auth-gate My Bible click |
| 8 | — | Notification prompt verification + regression tests |
| 9 | — | PlanBrowseCard + plan-icon-map + sibling plan cards |

Steps 1–4 together resolve the Requirement 1 visual parity. Steps 5–6 resolve Requirements 2 + 3. Step 7 resolves Requirement 4. Step 8 resolves Requirement 5. Step 9 resolves Requirement 6. Steps are independent enough to be executed in order without tight coupling beyond the shared design pattern from Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Restructure BibleLanding to Daily Hub root pattern | [COMPLETE] | 2026-04-17 | `pages/BibleLanding.tsx`, `pages/__tests__/BibleLanding.test.tsx` — removed Layout + BibleLandingOrbs imports, added Navbar/SiteFooter/HorizonGlow. 18 tests pass. |
| 2 | Restructure MyBiblePage (both branches) | [COMPLETE] | 2026-04-17 | `pages/MyBiblePage.tsx`, `pages/__tests__/MyBiblePage.test.tsx` — both logged-out and logged-in branches use Daily Hub root pattern. Removed ATMOSPHERIC_HERO_BG. 19 tests pass. |
| 3 | Restructure PlanBrowserPage | [COMPLETE] | 2026-04-17 | `pages/bible/PlanBrowserPage.tsx`, `pages/bible/__tests__/PlanBrowserPage.test.tsx` — added Navbar/SiteFooter/HorizonGlow mocks to tests. 13 tests pass. |
| 4 | Remove ATMOSPHERIC_HERO_BG + add pt-36 on BibleHero | [COMPLETE] | 2026-04-17 | `components/bible/landing/BibleHero.tsx` + test file. 10 tests pass. |
| 5 | Restore static chapter heading + move chapter dropdown to right cluster | [COMPLETE] | 2026-04-17 | `components/bible/reader/ReaderChrome.tsx`, `pages/BibleReader.tsx` — visible `<h1>` with text-2xl; chapter selector moved to right cluster as first item. Tests updated. |
| 6 | Fix focus-mode toggle handler, icon, and 2s hint | [COMPLETE] | 2026-04-17 | `components/bible/reader/ReaderChrome.tsx` + `pages/BibleReader.tsx` — prop rename (`focusEnabled` + `onFocusEnabledToggle`), Eye/EyeOff icon swap, `aria-pressed`, 2s hint overlay on ON. Test 'provides an accessible chapter heading (sr-only — BB-51)' renamed to visible heading test. 24 ReaderChrome + 70 BibleReader tests pass. |
| 7 | Auth-gate "My Bible" click in QuickActionsRow | [COMPLETE] | 2026-04-17 | `components/bible/landing/QuickActionsRow.tsx` — inline auth check, `e.preventDefault()` + `openAuthModal()` for logged-out. 10 tests pass. |
| 8 | Verify BB-41 notification dismissal persistence (+ regression tests) | [COMPLETE] | 2026-04-17 | New `pages/__tests__/BibleReader.notification-prompt.test.tsx` with 4 regression tests covering flag-absent/flag-set/dismissal/persistence-across-unmount. Existing code at `BibleReader.tsx:610/:955/:959` verified correct — no source change needed. |
| 9 | Restyle reading plan cards to DashboardPreview aesthetic | [COMPLETE] | 2026-04-17 | New `components/bible/plans/plan-icon-map.ts` (slug→icon+color mapping); `PlanBrowseCard.tsx`, `PlanInProgressCard.tsx`, `PlanCompletedCard.tsx` restyled with `bg-white/[0.03]`, `border-white/[0.08]`, `rounded-xl`, top-edge accent, duration-base ease-standard. Icons: Psalms→blue BookOpen, John→amber Star, Anxious→teal Heart, Sleep→indigo Moon. 25 tests pass (13 PlanBrowseCard + 6 each of InProgress/Completed). |
