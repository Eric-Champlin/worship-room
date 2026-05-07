# Spec 12 Recon — Site Chrome (Navbar + Error Boundaries + Cosmetic Fixes)

**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Subject:** Site chrome — `Navbar`, `MobileDrawer`, `Layout`, top-level error boundaries (`ErrorBoundary` / `ChunkErrorBoundary` / `RouteErrorBoundary`), `RouteLoadingFallback`, `index.html` meta + favicon. Plus the 11c-surfaced Navbar drift points (Caveat wordmark, active-link underline offset, FrostedCard saturation alignment, two pre-existing tests).
**Posture:** Analysis only. No spec language. No direction decisions. No code changes. Stay on `forums-wave-continued`. Eric handles all git operations.
**Inputs read:** `Navbar.tsx`, `MobileDrawer.tsx`, `Layout.tsx`, `ErrorBoundary.tsx`, `ChunkErrorBoundary.tsx`, `RouteErrorBoundary.tsx`, `App.tsx`, `SiteFooter.tsx`, `LocalSupportDropdown.tsx`, `DesktopUserActions.tsx`, `AvatarDropdown.tsx`, `PageHero.tsx`, `index.html`, `frontend/public/` directory listing, `Navbar.test.tsx`, `MobileDrawer.test.tsx` listing, `Layout.test.tsx`, `ErrorBoundary.test.tsx`, `ChunkErrorBoundary.test.tsx`, `useFaithPoints.test.ts`, `services/faith-points-storage.ts`, `pages/RoutinesPage.tsx`, `pages/Settings.tsx`, `pages/Insights.tsx`, `pages/MusicPage.tsx`, `pages/AskPage.tsx` (signature only), `pages/DailyHub.tsx` (verified via 09-design-system.md), `_plans/recon/routines-redesign-2026-05-06.md`, `_plans/direction/music-2026-05-06.md`, design system rules `04`, `06`, `09`, `10`, `12`. Test runs: full chrome batch (`Navbar`, `Layout`, `ErrorBoundary`, `ChunkErrorBoundary`, `useFaithPoints`).

---

## Section A — Current Navbar state

### A.1 DOM anatomy

`Navbar.tsx` exports:

- A skip-to-main-content link (line 173-178): `<a href="#main-content">Skip to content</a>` with sr-only base + visible-on-focus chrome (`focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white`). Mounted as the very first focusable element on every page that mounts Navbar.
- The outer `<nav aria-label="Main navigation">` (line 179-184) sits at `top-0 z-50` in BOTH transparent and opaque modes. Transparent: `absolute inset-x-0 bg-transparent`. Opaque: `bg-hero-dark`.
- An inner `mx-auto max-w-6xl px-4 pt-5 pb-2 sm:px-6` container (line 186) holds the rest of the chrome.
- An inner glass box (line 187-194) — the visible navbar plate — `rounded-2xl` with mode-dependent class:
  - Transparent: `liquid-glass` (custom CSS class — defined globally in `frontend/src/styles/global.css` or similar; not imported here)
  - Opaque: `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25`
- Inside the glass box: `<NavbarLogo>`, `<DesktopNav>` (5 nav links + Local Support dropdown), `<DesktopUserActions>` OR `<DesktopAuthActions>` (auth-state branched), `<button>` hamburger (md:hidden).
- BELOW the glass box (still inside the max-w-6xl container):
  - **Transparent-mode-only divider** (line 227-232): a `mt-1 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent` decorative line. NOT rendered in opaque mode.
  - `<MobileDrawer>` (always mounted; hidden via state).
  - `{!hideBanner && <SeasonalBanner />}` (line 240) — the seasonal liturgical banner can be suppressed via `hideBanner` prop. Currently used by `Home.tsx` and `RegisterPage.tsx`.
- OUTSIDE the `<nav>` (line 244-249): `<MobileNotificationSheet>` — auth-gated via `isAuthenticated` to keep `useNotificationActions`'s localStorage reads/writes out of demo-mode users' browsers.

### A.2 Transparent vs opaque mode usage in production

`Navbar` accepts `transparent?: boolean` (default `false`).

**Inner pages mount Navbar directly (NOT via Layout) and pass `transparent` explicitly.** Verified via `grep '<Navbar' src/pages/`:

Pages that mount `<Navbar transparent />` directly (transparent-mode):
- `Home.tsx`, `Dashboard.tsx`, `DailyHub.tsx`, `BibleLanding.tsx`, `BibleBrowse.tsx`, `MyBiblePage.tsx`, `BiblePlanDetail.tsx`, `BiblePlanDay.tsx`, `bible/PlanBrowserPage.tsx`, `MusicPage.tsx`, `MyPrayers.tsx`, `MonthlyReport.tsx`, `Friends.tsx`, `Insights.tsx`, `GrowPage.tsx`, `Settings.tsx`, `RegisterPage.tsx` (also `hideBanner`), `PrayerWall.tsx`, `GrowthProfile.tsx`, `SharedVerse.tsx` (also `<Navbar />` in error state), `SharedPrayer.tsx` (same).

Pages that use `<Layout>` wrapper (Layout decides transparent automatically):
- `<Layout>` default (`transparentNav` defaults `false` AND no `hero`): RoutinesPage, Health, PrivacyPolicyPage, TermsOfServicePage, ReadingPlanDetail, CommunityGuidelines, AccessibilityPage, all 6 meditate sub-pages, ChunkErrorBoundary fallback, RouteErrorBoundary fallback. **These render the navbar in OPAQUE mode.**
- `<Layout transparentNav>`: ChallengeDetail, AskPage. **Transparent mode.**
- `<Layout hero={...}>`: zero current consumers (the prop exists but no page passes a hero today). Would force transparent.

So the in-production matrix is:

| Mode | Page count | Surfaces |
|---|---|---|
| Transparent (direct `<Navbar transparent />`) | ~22 | Most inner pages + landing |
| Transparent (`<Layout transparentNav>`) | 2 | ChallengeDetail, AskPage |
| **Opaque (`<Layout>` default)** | **~12** | **RoutinesPage, Privacy/Terms/Community/Accessibility, ReadingPlanDetail, all 6 meditate sub-pages, error fallbacks** |
| Opaque (`<Navbar />` no prop) | 2 (error states) | SharedVerse error, SharedPrayer error |

Opaque mode is NOT dead code — RoutinesPage and the legal/policy/accessibility pages render the opaque chrome. The navbar test (`renderNavbar('/prayer-wall')` with no prop, line 378) tests opaque mode, which is what `<Layout>` default produces. Production `/prayer-wall` is transparent (PrayerWall.tsx:632 mounts `<Navbar transparent />` directly), so the test's opaque-mode assertion does not match the production `/prayer-wall` page — but it DOES match the production `/music/routines` page and the legal pages.

### A.3 NavbarLogo (the wordmark)

Source: `Navbar.tsx:54-67`.

```tsx
<Link to="/" className="flex items-center gap-1.5" aria-label="Worship Room home">
  <span className={cn(
    'font-script text-4xl font-bold',
    transparent ? 'text-white' : 'text-primary'
  )}>
    Worship Room
  </span>
</Link>
```

- **Font:** Caveat (cursive) via `font-script`. `text-4xl` = 36px. `font-bold` = 700.
- **Color:** White when transparent; **`text-primary` (`#6D28D9`) when opaque.**
- **Link:** routes to `/`. Aria-label: "Worship Room home".

Computed CSS at desktop 1280px: 36px Caveat Bold rendered on top of the inner glass-box border. In opaque mode the wordmark is solid violet on a white-tinted dark glass — that's the legacy "branding" treatment.

The wordmark is the primary visual identity element on every page. In transparent mode it's white-on-glass. In opaque mode it's `#6D28D9` on whatever's behind the glass — visually a saturated violet wordmark.

### A.4 Active-link underline

Source: `Navbar.tsx:34-52` (`getNavLinkClass`).

```
relative py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded
after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-base after:ease-decelerate after:origin-center after:content-['']
motion-reduce:after:transition-none
[transparent ? after:bg-white : after:bg-primary]
```

Active state: `after:scale-x-100` + `text-white` (transparent) OR `text-primary` (opaque).
Inactive state: `after:scale-x-0 hover:after:scale-x-100` + `text-white/90 hover:text-white` (transparent) OR `text-text-dark hover:text-primary` (opaque).

**Position math:**
- Container `<a>` has `py-2` (8px top, 8px bottom).
- The `::after` pseudo-element is `absolute` with `bottom-0 left-0 h-0.5 w-full`.
- Effective stack: text baseline → `pb-2` (8px gap) → underline (2px tall) → outer container edge.
- So the underline sits ~8px BELOW the visual text baseline, not snuggly under the text. The visual reads as "underline, then a small gap, then the next row of chrome."

**Animation:** Origin center, transform `scale-x` from 0 → 1 (underline grows from center outward) on hover/active. Duration `base` (250ms per BB-33 tokens), easing `decelerate`. `motion-reduce:after:transition-none` honors reduced motion.

### A.5 Comparison to other underline patterns in the app

Grep `after:bottom-` across `src/components/`:

| Surface | Underline offset class | Result |
|---|---|---|
| Navbar nav links (line 38) | `after:bottom-0` + `py-2` | ~8px gap from text |
| LocalSupportDropdown wrapper (line 118) | `after:bottom-0` + `py-2` | Matches Navbar (consistent) |
| LocalSupportDropdown panel link inner span (line 193) | `after:bottom-0` + `pb-0.5` | ~2px gap (TIGHT) |
| SiteFooter footer links (line 115) | `after:bottom-0` + `pb-0.5` | ~2px gap (TIGHT) |
| Auth login button in Navbar (line 115) | `after:bottom-0` + `py-2` | Matches Navbar primary nav |

Two consistent patterns: nav-tier (loose, `py-2`) and footer-tier (tight, `pb-0.5`). The Navbar primary nav uses the loose pattern. Both are documented in the design system; neither is canonical-wins-over-the-other. The 11c recon flagged the loose offset as a potential drift point because it's perceptually "underline floating below the text" rather than "underline anchored to the baseline."

### A.6 Auth state branching

When `isAuthenticated`:
- Right cluster renders `<DesktopUserActions>` (Navbar.tsx:199): offline indicator + `NotificationBell` (with badge count + `NotificationPanel` dropdown) + `AvatarDropdown` (8x8 round, `bg-primary text-white`, opens menu with Dashboard / My Prayers / Friends / Mood Insights / Settings / Log Out).
- The bell + avatar are in a wrapped `<div ... ref={wrapperRef}>` with click-outside + Escape handling. Both close on route change (`useLocation` watch).

When NOT authenticated:
- Right cluster renders `<DesktopAuthActions>` (Navbar.tsx:94-137): offline indicator + "Log In" link-button (opens AuthModal) + "Get Started" link (`/register`).
- "Log In" uses the same active-link underline pattern as nav links (no active state because it's a button).
- "Get Started" uses the **white pill primary CTA Pattern 2** in opaque mode (`bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)]`) and a **transparent-pill variant** in transparent mode (`bg-white/20 hover:bg-white/30 border border-white/30`). The opaque variant matches the canonical homepage primary CTA per `09-design-system.md` § White Pill CTA Patterns.

### A.7 Right-cluster icons (when authenticated)

Source: `DesktopUserActions.tsx`.

- **`NotificationBell`** at `frontend/src/components/dashboard/NotificationBell.tsx` (not read; component exists per import). Lucide `Bell` icon. Badge count for unread notifications (per `10-ux-flows.md` § Notification Flow).
- **`AvatarDropdown`** at `frontend/src/components/AvatarDropdown.tsx`:
  - Trigger: `h-8 w-8 rounded-full bg-primary text-white` with the user's first initial uppercased.
  - Menu panel: `bg-hero-mid border border-white/15 rounded-xl py-1.5 shadow-lg`. Note `border-white/15` — the same border-opacity as MobileDrawer (`bg-hero-mid border-l border-white/15`) but DIFFERENT from the LocalSupportDropdown opaque-mode panel (`bg-white border-gray-200` light-theme) and the LocalSupportDropdown transparent-mode panel (`bg-hero-bg/95 backdrop-blur-xl border border-white/10`).

### A.8 "Get Started" CTA flow

- Desktop: `<Link to="/register">` — direct navigation.
- Mobile drawer: same target.
- AuthModal does NOT mediate this CTA — Get Started goes to `/register` (the standalone register page, ✅ shipped per Forums Wave Phase 1 spec 1.5).
- "Log In" button in Navbar OPENS the AuthModal (`authModal?.openAuthModal(undefined, 'login')`) rather than navigating. This is a small modal-vs-page split: register is a page, login is a modal. Per `02-security.md` § Auth Lifecycle this is intentional.

### A.9 Mobile drawer (`MobileDrawer.tsx`)

- Anatomy: backdrop (`fixed inset-0 z-40 bg-black/20 md:hidden`) + slide-from-right drawer (`fixed right-0 top-0 bottom-0 z-50 w-[280px] overflow-y-auto bg-hero-mid border-l border-white/15 shadow-lg md:hidden`).
- Hamburger trigger lives in `Navbar.tsx:205-222` (44×44 touch target, lucide `Menu`/`X` toggle, `aria-expanded` reflecting state, `aria-controls="mobile-menu"`).
- Drawer animation: `motion-safe:animate-drawer-slide-in` and `motion-safe:animate-drawer-slide-out` (defined in Tailwind config; uses `decelerate` easing per BB-33 conventions).
- Backdrop animation: `motion-safe:animate-backdrop-fade-in/out`.
- Reduced motion: when `useReducedMotion()` returns true, the close path bypasses the 200ms timeout entirely (`onClose()` immediately).
- Item list: 5 sections via `renderSection`:
  - **Daily** → Daily Hub
  - **Study** → Study Bible / Grow / Ask God's Word (note: this is the only place "Ask God's Word" appears in nav — desktop nav drops it)
  - **Listen** → Music
  - **Community** → Prayer Wall
  - **Find Help** → LOCAL_SUPPORT_LINKS (Churches / Counselors / Celebrate Recovery)
- Logged-in extension: **MY WORSHIP ROOM** section with Dashboard / My Prayers / Friends / Mood Insights / Settings + a "Notifications" bell button + Log Out.
- Logged-out extension: Log In button + "Get Started" (transparent-pill variant: `bg-white/20 border border-white/30 hover:bg-white/30`).
- Active state on items: `border-l-2 border-primary bg-white/[0.04] text-white` (left-stripe accent + faint elevated bg + white text). Per the test at `Navbar.test.tsx:642-651`.
- Drawer sectional headers (`DrawerSectionHeader`): `text-xs uppercase tracking-wide text-white/50` with `role="heading" aria-level={2}`.
- Touch targets: every `DrawerLink` has `min-h-[44px]` (verified via test at `Navbar.test.tsx:673-685`).
- Focus trap: implemented inline in `MobileDrawer.tsx:124-151` via `keydown` listener that shifts Tab between first/last focusable. NOT using `useFocusTrap()` hook — local implementation.
- Escape closes mobile menu and returns focus to hamburger (Navbar.tsx:158-169).
- Route change closes mobile menu (Navbar.tsx:152-155).

### A.10 Layout wrapper (`Layout.tsx`)

```tsx
export function Layout({ children, hero, transparentNav = false }: LayoutProps) {
  const navTransparent = Boolean(hero) || transparentNav
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-hero-bg font-sans">
      <Navbar transparent={navTransparent} />
      {hero}
      <main id="main-content" className={cn(
        'flex-1',
        hero && 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        !hero && !transparentNav && 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        !hero && transparentNav && 'contents',
      )}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
```

Three modes:
- **Default** (no hero, no transparentNav): wraps children in `<main max-w-7xl py-8>`, navbar opaque
- **Hero mode** (hero passed): wraps in `<main max-w-7xl>` (no `py-8`), navbar transparent. Note: zero current consumers pass `hero={...}`.
- **Transparent-without-hero**: `<main>` uses `display: contents` (transparent in flow). Navbar transparent. Used by ChallengeDetail and AskPage so the page can apply its own top padding inside the navbar overlap.

**Layout always sets `bg-hero-bg` (#08051A) on the outer div.** Outer wrapper test in `Layout.test.tsx:62-68` enforces this — no `bg-neutral-bg` or `bg-dashboard-dark` legacy tokens. (The actual Settings/Insights/RoutinesPage use `ATMOSPHERIC_HERO_BG` from `PageHero.tsx` which sets `backgroundColor: '#0f0a1e'` (dashboard-dark) on their hero `<section>` only — that overrides Layout's hero-bg locally for the hero band, then the body returns to hero-bg. This is intentional drift for the inner-page atmospheric pattern documented in `_plans/direction/music-2026-05-06.md` Decision 1.)

The `<main>` element always carries `id="main-content"` (Layout.test.tsx:99-103 enforces this for skip-link integrity even in transparentNav-without-hero mode where the element is `display: contents`).

---

## Section B — Navbar drift points

### B.1 Wordmark — Caveat font on heading

**Drift:** `Navbar.tsx:54-67` uses `font-script text-4xl font-bold` (Caveat). Per `09-design-system.md` § Typography:

> **Decorative Font**: Caveat (cursive) — Tailwind: `font-script`
>   - Used for branding elements (logo) only.
>   - **Deprecated for headings.** Homepage and Daily Hub headings use `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) instead. Caveat has been fully removed from Daily Hub. Other inner pages should be migrated to gradient text in future redesigns.

The Navbar wordmark is "branding elements (logo)" — explicitly the documented exception that PRESERVES Caveat. So this is technically not a violation of the rule today.

**However**, the recon Investigation 2 from Spec 11B (referenced in the brief) flagged this as a possible migration target because the rest of the app's headings have moved to `GRADIENT_TEXT_STYLE`. The wordmark is the last remaining surface where the user encounters Caveat as a "primary identity" element. The peer SiteFooter wordmark also uses Caveat (`SiteFooter.tsx:96-99`: `font-script text-5xl font-bold text-white`) — the brief calls SiteFooter wordmark "grandfathered per design system, out of scope for migration."

Other Caveat survivors found via grep:
- `App.tsx:113` — `RouteLoadingFallback` Suspense fallback wordmark: `text-3xl font-script` with `animate-logo-pulse` when motion is allowed
- `App.tsx:135` — NotFound page "Go Home" link: `font-script text-2xl text-primary-lt`
- Multiple feature components (StartingPointQuiz, PrayerWallHero, GuidedPrayerPlayer, etc.)
- Test files asserting `font-script` (used by Caveat)

**The question of whether to migrate the Navbar wordmark, the SiteFooter wordmark, BOTH, or NEITHER is a design-decision question and lives in Section K.** This recon does not resolve it.

If the wordmark is migrated to `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`), the canonical class string would be:

```tsx
style={GRADIENT_TEXT_STYLE}
className="text-3xl sm:text-4xl font-bold leading-tight"
```

… replacing `font-script text-4xl font-bold text-white` (transparent) and `font-script text-4xl font-bold text-primary` (opaque). Note that `GRADIENT_TEXT_STYLE` requires the size to be on the heading itself rather than `text-4xl` because the gradient renders via `background-clip: text` — works on any size. Comparison sample: `RoutinesPage.tsx:148-151` h1 `text-3xl font-bold sm:text-4xl lg:text-5xl pb-2 style={GRADIENT_TEXT_STYLE}`.

### B.2 Active-link underline offset

**Drift:** Section A.4 + A.5 documented this. `after:bottom-0` + `py-2` produces ~8px gap from text baseline to underline. Footer + dropdown-panel-link patterns use `after:bottom-0` + `pb-0.5` for ~2px gap.

Computed sample at desktop 1280px (Inter Medium 14px text-sm in `py-2` container):
- Text height: ~20px (line-height 1.5 on 14px)
- Top padding: 8px
- Bottom padding: 8px
- Underline (`h-0.5`): 2px tall, sitting at `bottom-0`
- Visual gap from text descender to underline top: ~6-8px depending on Inter's metrics

Other navigation underlines in the app:
- Footer links (`SiteFooter.tsx:115`): `pb-0.5` — underline sits ~2px below text
- LocalSupportDropdown nested span (line 193): `pb-0.5` — same tight pattern
- DailyHub tab pill: NO underline; uses filled pill with violet glow shadow as active state
- Settings sidebar: NO underline; uses background tint as active state

**The 11c recon Investigation 2 (per brief) flagged the loose offset as a candidate for tightening to either `pb-1` (~4px) or `pb-0.5` (~2px) for visual coherence with footer links.**

Note: tightening means the underline anchors closer to the text baseline. The trade-off is that the underline-grow animation has less travel distance and may feel more abrupt. The current `py-2` is likely a deliberate choice to give the underline visual breathing room beneath the nav text. Direction phase decides whether the visual anchor or the animation breathing room wins.

### B.3 FrostedCard saturation alignment

**Drift:** Navbar opaque-mode glass box uses `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25`.

Canonical FrostedCard Tier 1 (per `09-design-system.md` § FrostedCard Tier System):
- `bg-white/[0.06]` (Navbar uses `0.08` — 33% more)
- `backdrop-blur-sm` (Navbar uses `backdrop-blur-xl` — 24px vs 4px)
- `border border-white/[0.12]` (Navbar uses `border-white/25` — more than 2x heavier)
- `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` dual shadow (Navbar uses single `shadow-lg`)
- NO `saturate-[1.8]` filter (Navbar adds saturation amplification)

The Navbar's glass treatment was specced before FrostedCard standardization. The chrome differences are:
- **Heavier border** (`white/25` vs `white/[0.12]`): Navbar reads as "elevated above content" with a clearly visible chrome edge. Canonical FrostedCard reads as "embedded in content."
- **Stronger blur** (`xl` vs `sm`): Navbar's backdrop is heavily blurred to read as a navigation chrome. FrostedCard `sm` is a quieter texture for content cards.
- **Saturation amplification** (`saturate-[1.8]`): boosts the saturation of whatever's behind the navbar by 1.8x. Marketing content with gradients behind the navbar appears more vivid; on inner pages where the backdrop is mostly dark hero-bg the effect is subtle.
- **Single shadow vs dual**: Navbar uses Tailwind's `shadow-lg` (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`). FrostedCard's dual shadow includes a violet outer glow for emotional warmth. Navbar's `shadow-lg` is purely physical-shadow.

The transparent-mode `liquid-glass` class is not defined in Navbar.tsx — it's a global utility class. Without reading its definition, the assumption from the test (`Navbar.test.tsx` doesn't assert anything about `liquid-glass`) is that it provides a similar glass-with-blur treatment for marketing/hero contexts.

Direction phase decides whether to:
- Migrate Navbar opaque mode to canonical FrostedCard chrome (`white/[0.12]` border, `backdrop-blur-sm`, no saturate, dual shadow)
- Keep Navbar's elevated-chrome treatment (heavier border, stronger blur) but drop saturate
- Leave entirely as-is

### B.4 Other deprecated patterns scan

Per the brief: "scan Navbar for `bg-primary` solid CTAs, `text-primary` body text outside active states, `font-serif italic`, `border-white/10` (should be `[0.12]`), `animate-glow-pulse`."

| Pattern | Found in Navbar? | Notes |
|---|---|---|
| `bg-primary` solid CTA | NO | "Get Started" uses white pill (`bg-white text-hero-bg`) opaque, transparent-pill (`bg-white/20`) transparent. Hamburger and "Log In" are not solid-primary. |
| `text-primary` body text | YES — but only as active-state color in opaque mode (`getNavLinkClass:43`). The opaque-mode wordmark is also `text-primary`. NOT used for body text. | Active-state color is canonical-acceptable per the brief; the opaque wordmark IS body-text-tier and is the drift point B.1. |
| `font-serif italic` | NO | |
| `border-white/10` (should be `[0.12]`) | NO — Navbar opaque uses `border-white/25` (heavier, separate drift B.3). MobileDrawer uses `border-white/15`. AvatarDropdown uses `border-white/15`. | The canonical `[0.12]` opacity is what most production cards use post-Spec 11A border unification; navbar chrome runs heavier. |
| `animate-glow-pulse` | NO (verified — not imported anywhere in Navbar/MobileDrawer/Layout) | |

Additional drift found beyond the brief's checklist:
- `text-text-dark` (light-theme color `#2C3E50`) used as inactive-link color in opaque mode (`getNavLinkClass:49`). On the rendered opaque navbar (white/[0.08] over `bg-hero-dark` #0D0620), this is a contrast failure — dark gray-blue text on a dark glass over dark purple. WCAG ratio against `#181336` (approximate rendered background) is roughly 1.5-2:1. **Real-world impact:** RoutinesPage and the legal pages render the navbar in opaque mode in production today and inactive nav-link text reads as effectively invisible until hover. The desktop test (Navbar.test.tsx:65-118) does not assert color contrast, only existence. The RoutinesPage 11B execution did not surface this because the recon Section A.1 mistakenly said "transparent on this page via Layout default" — Layout default is OPAQUE.
- Bridge mode used by `<Navbar />` (no `transparent` prop) on SharedVerse/SharedPrayer error states. Same contrast issue.

### B.5 SiteFooter wordmark

`SiteFooter.tsx:96-99`:

```tsx
<span className="font-script text-5xl font-bold text-white">
  Worship Room
</span>
```

Same Caveat treatment as Navbar but always white (no opaque/transparent variants — the footer always sits on `bg-hero-dark`). Per the brief and `09-design-system.md`, this is grandfathered: "branding elements only" exception. Out of scope for Spec 12 unless the direction phase explicitly opts to migrate both wordmarks for consistency.

The footer also has crisis-resource phone-link touch targets noted as a known issue in `09-design-system.md` § Known Issues (40px vs 44px minimum). NOT a Navbar concern; flagged here because chrome auditing typically batches with footer.

---

## Section C — Pre-existing test failures

Test runs verified by:

```
cd frontend && pnpm test --run \
  src/components/__tests__/Navbar.test.tsx \
  src/components/__tests__/Layout.test.tsx \
  src/components/__tests__/ErrorBoundary.test.tsx \
  src/components/__tests__/ChunkErrorBoundary.test.tsx \
  src/hooks/__tests__/useFaithPoints.test.ts
```

Results (2026-05-07): **2 failed / 133 passed** across the 5 test files.

### C.1 `Navbar.test.tsx:380` — Prayer Wall active-link color

```
FAIL src/components/__tests__/Navbar.test.tsx > Navbar > Active route > active top-level link has active styling

Expected: "text-white"
Received: "relative py-2 text-sm font-medium transition-colors ... after:bg-primary after:scale-x-100 text-primary active"
```

**Test code** (line 376-382):

```tsx
it('active top-level link has active styling', () => {
  renderNavbar('/prayer-wall')
  const link = screen.getByRole('link', { name: 'Prayer Wall' })
  expect(link.className).toContain('text-white')
  expect(link.className).not.toContain('after:scale-x-0')
})
```

**Test setup** (line 41-54): `renderNavbar` mounts `<Navbar />` (no `transparent` prop) inside MemoryRouter at the given route. Default `transparent=false` → opaque mode.

**Actual production behavior** for this test setup:
- Opaque mode active state: `text-primary` (per `getNavLinkClass:43`)
- Test expects: `text-white`

**What does production really render at `/prayer-wall`?** `pages/PrayerWall.tsx:632` mounts `<Navbar transparent />` directly. So real `/prayer-wall` is transparent mode → active = `text-white`. The test is testing OPAQUE mode behavior at the `/prayer-wall` path, which doesn't match production for that path.

**The other 9 active-route tests** (lines 384-432) only assert the absence of `after:scale-x-0` — they do NOT assert the text color. Those tests pass for both modes. Only the `/prayer-wall` test additionally asserts the text color, and it asserts the transparent-mode color while testing the opaque-mode default of `<Navbar />`.

**Two interpretations:**
- (a) The test intent was "verify active link shows white text" — and the test was originally written when the navbar was always-transparent or when opaque mode used white. Production has since drifted (or always was) to use `text-primary` as opaque-mode active. **Test should update** to either pass `transparent` to `renderNavbar` OR assert `text-primary` instead of `text-white`.
- (b) The test intent was "verify the active link is visually distinct" — and the production opaque-mode active color of `text-primary` is correct. **Test should update** to remove the color assertion (since the underline scale-x assertion already covers active-state visual distinction).

Direction phase resolves which interpretation matches design intent.

### C.2 `useFaithPoints.test.ts:96` — `intercession` field missing

```
FAIL src/hooks/__tests__/useFaithPoints.test.ts > useFaithPoints — unauthenticated > returns default values when not authenticated

Expected: { mood: false, pray: false, listen: false, prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false, challenge: false, localVisit: false, devotional: false }

Received: same fields PLUS { intercession: false }
```

**Production source of truth:** `services/faith-points-storage.ts:13-23`:

```ts
export function freshDailyActivities(): DailyActivities {
  return {
    mood: false, pray: false, listen: false,
    prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false,
    challenge: false,
    localVisit: false,
    devotional: false,
    intercession: false,  // ← added in spec-3-6
    pointsEarned: 0, multiplier: 1,
  }
}
```

`ACTIVITY_BOOLEAN_KEYS` (line 9-11) explicitly lists `intercession` as the 13th boolean activity field. The test at `useFaithPoints.test.ts:96-100` lists only 12 fields.

**Schema-change blame:**
```
commit e625a08  spec-3-6  2026-04-28
+ 'mood', 'pray', 'listen', 'prayerWall', 'readingPlan', 'meditate', 'journal', 'gratitude', 'reflection', 'challenge', 'localVisit', 'devotional', 'intercession',
+ intercession: false,
```

`intercession` was added in spec-3-6 (the Forums Wave Phase 3 prayer-wall spec at commit `e625a08`, 2026-04-28). The hook returns the 13-field object. The test was not updated when the schema was extended.

**Production is canonical.** The `intercession` field tracks a real activity type (prayer-wall intercession actions per the Phase 3 prayer-wall backend). The test expectation should add `intercession: false` to the assertion object.

This is unambiguous test-update territory — production behavior matches the master plan, tests didn't get updated when the schema extended.

### C.3 Other failing chrome-related tests

Full inventory of test runs:
- `Navbar.test.tsx`: 1/65 fail (C.1 only)
- `Layout.test.tsx`: 0/6 fail
- `ErrorBoundary.test.tsx`: 0/5 fail
- `ChunkErrorBoundary.test.tsx`: 0/9 fail (note: test output emits `[ErrorBoundary] Uncaught error` console noise from React's error logging during the throw-on-error tests; this is expected, not a test failure)
- `useFaithPoints.test.ts`: 1/50 fail (C.2 only)

Total: **2 fails, 133 passes across 5 chrome-related files**.

There are 3 other Navbar test files in the codebase (`Navbar-challenges.test.tsx`, `Navbar-offline.test.tsx`, `Navbar-seasonal.test.tsx`) and a `MobileDrawer.test.tsx` not run in this batch. Per the project regression baseline in CLAUDE.md, the post-Spec-5 baseline is "9,470 pass / 1 pre-existing fail" — the pre-existing failure listed is the `useFaithPoints — intercession` failure documented above. So the `Navbar.test.tsx:380` failure is either (a) flaky as the second listed flaky failure (`useNotifications — returns notifications sorted newest first`) — unlikely since this one has a deterministic assertion, OR (b) a regression that landed since Spec 5 wrap. Worth verifying via `git log` whether the assertion existed before Spec 5 — but for recon purposes, both failures are documented and reproducible against the current branch state.

---

## Section D — Error boundary state

### D.1 `ErrorBoundary.tsx` — generic top-level boundary

Anatomy (verified):
- Class component with `hasError` boolean state.
- `getDerivedStateFromError()` flips state on any thrown error.
- `componentDidCatch` calls `console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)`.
- Default fallback (rendered when no `fallback` prop):
  - Full-screen `min-h-screen bg-hero-bg` centered layout
  - Subtle violet glow orb behind the card (decorative, `rgba(139, 92, 246, 0.20)`, `blur(120px)`, 400×400)
  - Frosted card: `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8`
  - Card has `role="alert"` (announced as alert region)
  - Inline-styled gradient h1 ("Something went wrong") using `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)` + `WebkitBackgroundClip: 'text'`
  - Body copy: "Something broke on our end. Reload to try again — your other work is safe." (anti-pressure, blameless — passes the canonical Anti-Pressure Copy Checklist from `09-design-system.md`)
  - "Refresh Page" button: white pill (`bg-white text-hero-bg`) with white glow shadow — same chrome as the homepage primary CTA pattern but with `px-8 py-3`

**Mounting:** `App.tsx:198, 293` — wraps the entire provider tree (`AuthProvider`, `LegalVersionGate`, `InstallPromptProvider`, etc., the full app tree).

**Reset/recovery:** Button click sets `hasError: false` AND calls `window.location.reload()`. Setting state alone wouldn't trigger re-render of the children (already errored once); the page reload does the actual work.

**Error logging:** Just `console.error`. NO Sentry / external telemetry hook (Sentry was wired backend-only per Spec 1.10d; frontend Sentry is deferred to 1.10d-bis per `07-logging-monitoring.md`). Direction phase may consider whether Spec 12 should add Sentry hooks here or keep the deferral.

**A11y:** `role="alert"` on the card. The h1 is a real `<h1>` (semantic). Button has standard focus-visible ring. NO explicit `aria-live` (alert role implies polite/assertive default). The 5 ErrorBoundary tests verify the alert role and copy.

**Visual fidelity vs Round 3:** The frosted card uses canonical `border-white/[0.12]` and `bg-white/[0.06]`. The dual box-shadow style is present (`0_0_40px_rgba(139,92,246,0.15)` + `0_8px_30px_rgba(0,0,0,0.4)`). The button is canonical white-pill Pattern 2. The h1 uses an inline gradient (NOT the `GRADIENT_TEXT_STYLE` constant — re-rolled inline). **Drift:** the inline gradient (`linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)`) does NOT match the canonical `WHITE_PURPLE_GRADIENT` constant from `constants/gradients.tsx`. Direction may consider migrating to the constant for consistency.

### D.2 `ChunkErrorBoundary.tsx` — chunk-load-failure boundary

Anatomy (verified):
- Class component with `hasChunkError` boolean state.
- `getDerivedStateFromError()` ONLY catches:
  - `error.name === 'ChunkLoadError'`
  - `error.message?.includes('Failed to fetch dynamically imported module')`
  - `error.message?.includes('Loading chunk')`
  - `error.message?.includes('Loading CSS chunk')`
- Other errors RETURN `null` from `getDerivedStateFromError`, propagating to the outer `ErrorBoundary` (verified via `ChunkErrorBoundary.test.tsx:89-102`).
- Fallback is wrapped in `<Layout>` — so it shows the full chrome (Navbar + Footer) around the error message. (Layout's outer `bg-hero-bg` and inner `<main>` provide consistent chrome.)

Fallback content:
- Custom plus-shaped SVG icon (`<svg ... aria-hidden>`) — a literal cross pattern in `text-primary/60` violet
- h1 "Let's try that again" (`text-2xl font-bold text-white`)
- Body copy "Sometimes things don't load as expected. A quick refresh usually does the trick." (anti-pressure, warm)
- "Refresh Page" button: `rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-primary-lt` — **NOT a white pill.** This is a violet primary button using `bg-primary`. Per `09-design-system.md` § Deprecated Patterns / Primary CTA Buttons, `bg-primary` solid CTAs were deprecated in favor of white pill patterns during Spec 11A. ChunkErrorBoundary still uses the deprecated chrome.

**Mounting:** `App.tsx:215, 284` — INSIDE the outer `ErrorBoundary` and the provider tree, but OUTSIDE the per-route `Suspense` and the `<Routes>` block. So chunk errors are caught after providers initialize but during route lazy-load.

**Console error:** `console.error('[ChunkErrorBoundary] Chunk loading failed:', error, errorInfo)`. No Sentry hook.

**A11y:** No explicit `role="alert"` on the container. The h1 is semantic. The button has focus-visible ring. The cross SVG is `aria-hidden`. Compared to ErrorBoundary's `role="alert"` card, this is a regression in error-region announcement.

**Visual fidelity vs Round 3:**
- Wraps in `<Layout>` so the user sees the full Navbar + SiteFooter — better than ErrorBoundary's full-bleed treatment for situations where the user is mid-app and a single chunk failed
- Body chrome (h1 + p + button) is bare, no FrostedCard
- Button uses deprecated `bg-primary` solid chrome
- Icon is custom inline SVG rather than a lucide icon

### D.3 `RouteErrorBoundary.tsx` — route-level boundary

Anatomy (verified):
- Functional wrapper that mounts `<ErrorBoundary fallback={<RouteErrorFallback />}>` around its children.
- `RouteErrorFallback` content (line 6-36):
  - Wraps in `<Layout>`
  - h1 "This page couldn't load" (`text-2xl font-bold text-white`)
  - Body "Try refreshing or going back to the home page."
  - Two buttons side-by-side:
    - "Refresh" — `rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/15` (muted-white tier)
    - "Go Home" — `rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-lt` (deprecated `bg-primary` solid)

**Mounting:** Per-route inside `<Routes>` in `App.tsx:221-279`. ~16 routes wrap their `<Suspense>` in `<RouteErrorBoundary>`:
- `/` (Dashboard)
- `/insights`, `/friends`, `/settings`, `/my-prayers`
- `/daily`, `/grow`
- `/bible`, `/bible/browse`, `/bible/my`, `/bible/plans`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`
- `/profile/:userId`
- `/register`, `/community-guidelines`, `/terms-of-service`, `/privacy-policy`, `/accessibility`

**Routes that do NOT have `<RouteErrorBoundary>`:** `/health`, `/insights/monthly`, `/ask`, `/reading-plans/*`, `/challenges/*`, all 6 `/meditate/*` sub-pages, `/verse/:id`, `/prayer/:id`, `/scripture`, `/music`, `/music/playlists`, `/music/ambient`, `/music/sleep`, `/music/routines`, `/prayer-wall/*` except listing, `/local-support/*`, `/dev/mood-checkin`, `/login`, `/bible/search`, `/bible/:book/:chapter`, `*` (NotFound), tab redirects.

So MUSIC ROUTINES (one of the focus pages from Spec 11) does NOT wrap in `<RouteErrorBoundary>`. Music itself (`/music`) does not either. Bible reader (the busiest reading surface) does not. These rely on the outer `<ChunkErrorBoundary>` + `<ErrorBoundary>` only — meaning a render crash on `/music/routines` triggers the global ErrorBoundary's full-bleed fallback (no Layout chrome, no "Go Home" button).

**Visual fidelity:** Same as ChunkErrorBoundary — Layout-wrapped, no FrostedCard, deprecated `bg-primary` button. The "Refresh" muted-white tier IS canonical (`bg-white/10` is the documented muted-active tier per Spec 10A).

**A11y:** Like ChunkErrorBoundary, no explicit `role="alert"`. The button focus rings differ:
- "Refresh" button: `focus-visible:ring-2 focus-visible:ring-white/50` (no ring-offset-bg)
- "Go Home" link: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` (full ring-offset)

Inconsistent within the same component.

### D.4 Lazy-load / Suspense fallback

`RouteLoadingFallback` (App.tsx:103-118):

```tsx
function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
      <span className={cn(
        'text-3xl font-script select-none',
        prefersReduced ? 'text-white/30' : 'animate-logo-pulse text-white/20'
      )}>
        Worship Room
      </span>
    </div>
  )
}
```

- Full-bleed `bg-dashboard-dark` (NOT `bg-hero-bg` — drift from the rest of the chrome which uses hero-bg)
- Caveat wordmark ("Worship Room") `text-3xl font-script` with motion-respectful pulse
- Used by Bible plan routes, search redirect, accessibility/legal/community-guidelines routes — anywhere the brief lists `<Suspense fallback={<RouteLoadingFallback />}>`
- 11 routes use page-shaped skeletons instead (DashboardSkeleton, DailyHubSkeleton, etc.) — those are the canonical loading treatment per `09-design-system.md`

**Drift:** The Caveat wordmark is the same font-script branding pattern as Navbar/SiteFooter. If the wordmark migrates to `GRADIENT_TEXT_STYLE`, this fallback would also need to migrate. The `bg-dashboard-dark` background here is also drift from Layout's `bg-hero-bg`.

### D.5 Route render crash (when no `<RouteErrorBoundary>`)

If a route component crashes during render and the route is NOT wrapped in RouteErrorBoundary, the error propagates upward. The catch order is:

1. `<RouteErrorBoundary>` (if wrapped) → shows route fallback with Layout chrome
2. `<Suspense>` does NOT catch render errors — only catches thrown promises (the lazy-import deferred render)
3. `<ChunkErrorBoundary>` → ONLY catches chunk-load errors; non-chunk render crashes return `null` from getDerivedStateFromError and propagate up
4. `<ErrorBoundary>` (App-level) → catches everything else, shows full-bleed fallback (Section D.1)

So a render crash on `/music/routines` shows the ErrorBoundary full-bleed fallback. A render crash on `/insights` (which IS wrapped) shows the RouteErrorBoundary's Layout-wrapped fallback.

**This is asymmetric coverage.** Direction may consider extending `<RouteErrorBoundary>` to all routes uniformly (or add it to the routes that lack it).

### D.6 Network failure handling

Backend-unreachable scenarios (the brief's "11c localhost:8080 case") are handled by:
- `useOnlineStatus()` hook — surfaces the offline indicator in `Navbar.tsx:99-108` and `MobileDrawer.tsx:198-208`
- API-fetch errors in feature hooks (e.g., `useFaithPoints` 401 handling, BB-30/31/32 cache fallbacks) — caught at the feature layer, not at chrome level
- BB-39 PWA service worker provides offline cache for Bible chapters and search index

The chrome itself does NOT surface a global "backend unreachable" banner. The offline indicator appears whenever `navigator.onLine === false` (truly offline), but a backend-down-while-online state is invisible at the chrome level. This is consistent with the design — Worship Room degrades gracefully per feature, no global fail state.

---

## Section E — Cosmetic index.html / public assets

### E.1 `apple-mobile-web-app-capable` deprecation

`index.html:8` has `<meta name="apple-mobile-web-app-capable" content="yes">`.

The W3C and modern browsers have moved to `<meta name="mobile-web-app-capable" content="yes">`. Apple's variant is deprecated but still respected. Best practice is to ship BOTH:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

The fix is a single line addition. Modern browsers warn in DevTools console about the deprecation but continue to honor the apple-prefixed tag.

`index.html:9` also has `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` — Apple-specific tag that does NOT have a non-prefixed equivalent. Stays as-is.

### E.2 favicon.ico missing

`frontend/public/` directory listing:

```
apple-touch-icon.png        4 KB    (180×180 — for iOS home screen)
icon-192.png                4 KB    (192×192 — PWA manifest)
icon-512.png               16 KB    (512×512 — PWA manifest)
audio/                              (subdirectory)
font-preview.html          12 KB    (dev preview)
logo-preview.html          10 KB    (dev preview)
offline.html                3 KB    (PWA offline fallback)
robots.txt                            
search/                             (BB-42 inverted index)
sitemap.xml               203 KB    (BB-40 SEO sitemap)
```

Notably absent: `favicon.ico`. Browsers probe `/favicon.ico` regardless of manifest declarations. Without it, every page load logs a console 404 in DevTools (the Spec 11c console-residue findings).

`index.html` does NOT declare `<link rel="icon">` — only `<link rel="apple-touch-icon">`. Modern best practice is to declare:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="shortcut icon" href="/favicon.ico">
```

The simplest fix: add a `favicon.ico` to `public/` (a 32×32 multi-res ICO file derived from `icon-192.png`). This silences the 404 without changing any HTML. A more thorough fix adds the `<link>` declarations to `index.html` and ensures the icons match the new BB-39 PWA manifest.

### E.3 Other index.html observations

- `<meta charset="UTF-8">` ✓
- `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` ✓ (`viewport-fit=cover` is the iOS notch-friendly value)
- `<meta name="description" data-rh="true" ...>` — has `data-rh="true"` indicating react-helmet ownership. SEO description is set.
- `<meta name="theme-color" content="#08051A">` ✓ matches `bg-hero-bg`
- `<link rel="preconnect" href="https://fonts.googleapis.com">` + `gstatic.com` ✓
- Two Google Font preloads for Inter and Lora — `data-rh`-style preserved
- One Google Fonts CSS link with Inter + Lora + Caveat (Caveat still required for the wordmark)

NO `<meta name="color-scheme">` — would be nice to add `<meta name="color-scheme" content="dark">` so browser-rendered scrollbars / form elements respect the dark theme without a flash.

NO `<link rel="manifest" href="/manifest.json">` — but `vite-plugin-pwa` injects this at build time. Verified by checking the plugin config (not read here, but per `BB-39` shipping notes the plugin is wired). Dev mode should NOT emit the manifest (per project memory: "PWA must NOT affect dev mode") — would need to verify the vite-plugin-pwa devOptions are disabled.

NO `<title>` override is needed beyond "Worship Room" since react-helmet (`HelmetProvider` in App.tsx) handles per-page titles.

### E.4 PWA install machinery + dev mode

Per project memory and `09-design-system.md` § Infrastructure:
- vite-plugin-pwa is the PWA registration mechanism
- Should NOT register service worker in dev mode (would cause stale-cache pain during development)
- The favicon-404 issue does not affect PWA installability per se — installability requires the manifest + service worker, not favicon.ico
- iOS Safari 16.4+ supports BB-41 push only when the app is added to the home screen — favicon affects what shows in the home-screen shortcut, but `apple-touch-icon.png` already covers that

The `offline.html` in public is the PWA offline fallback per BB-39.

---

## Section F — Peer chrome consistency check

Walked Settings, Insights, MusicPage, RoutinesPage (post-11c), AskPage, DailyHub. Patterns observed:

### F.1 Layout pattern usage

| Page | Mounts | Hero pattern | Navbar mode |
|---|---|---|---|
| `Home.tsx` | direct Navbar/Footer | HeroSection (custom) | transparent (hideBanner) |
| `Dashboard.tsx` | direct Navbar/Footer | DashboardHero | transparent |
| `DailyHub.tsx` | direct Navbar/Footer | inline + HorizonGlow | transparent |
| `BibleLanding.tsx` | direct Navbar/Footer | inline | transparent |
| `MusicPage.tsx` | direct Navbar (PageHero)/Footer | PageHero | transparent |
| `Settings.tsx` | direct Navbar (inline ATMOSPHERIC_HERO_BG)/Footer | inline | transparent |
| `Insights.tsx` | direct Navbar (inline ATMOSPHERIC_HERO_BG)/Footer | inline | transparent |
| `RoutinesPage.tsx` | **`<Layout>`** | inline ATMOSPHERIC_HERO_BG hero | **OPAQUE (drift)** |
| `AskPage.tsx` | `<Layout transparentNav>` | inline ATMOSPHERIC_HERO_BG | transparent |
| `ChallengeDetail.tsx` | `<Layout transparentNav>` | (per challenge) | transparent |
| `ReadingPlanDetail.tsx` | `<Layout>` | (per plan) | **OPAQUE (drift)** |
| Meditate sub-pages (×6) | `<Layout>` | (per meditation) | **OPAQUE (drift)** |
| Privacy / Terms / Community / Accessibility | `<Layout>` | inline | **OPAQUE (drift)** |
| `Health.tsx` | `<Layout>` | (minimal) | **OPAQUE (drift)** |

**Drift summary:** Pages using `<Layout>` default render the navbar in opaque mode. ~12 production pages render in opaque mode today. The opaque-mode chrome (heavier border, saturate filter, `text-text-dark` inactive links) renders less polished than the transparent-mode chrome.

The pattern across most newer Round 3 inner pages is to mount `Navbar`/`SiteFooter` directly and pass `transparent` explicitly. Layout is used by older or transitional pages.

### F.2 Hero composition consistency

Most inner pages share the inline `ATMOSPHERIC_HERO_BG` (single radial purple ellipse on `bg-dashboard-dark`) hero pattern:
- Settings, Insights, RoutinesPage, AskPage all use `style={ATMOSPHERIC_HERO_BG}` on a `<section>` with the same `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` spacing.
- DailyHub uses the HorizonGlow pattern instead (Daily Hub-specific atmospheric layer, scoped by Decision 1 of the music direction doc).
- Homepage uses HeroSection (custom dark purple gradient typewriter input).

Hero h1 sizes vary:
- PageHero h1: `text-4xl sm:text-5xl lg:text-6xl`
- Settings, Insights, RoutinesPage h1: `text-3xl sm:text-4xl lg:text-5xl` (one tier smaller)
- AskPage h1: `text-4xl sm:text-5xl lg:text-6xl` + `animate-gradient-shift` (matches PageHero)
- ErrorBoundary fallback h1: `text-3xl sm:text-4xl`
- ChunkErrorBoundary / RouteErrorBoundary h1: `text-2xl`

**Drift:** Inner-page heroes use the smaller `text-3xl/4xl/5xl` tier; PageHero and AskPage use the larger `text-4xl/5xl/6xl`. `09-design-system.md` § Round 3 Visual Patterns documents the larger size as canonical for "section main heading." This is documented inconsistency, not a Spec 12 concern.

### F.3 Route-level error handling consistency

See Section D.3 — coverage is uneven. Some routes wrap RouteErrorBoundary; others don't. Music routes don't. Bible reader doesn't. Meditate sub-pages don't.

### F.4 Pages using non-Layout wrappers

The BibleReader (`/bible/:book/:chapter`) is the documented exception. Uses `ReaderChrome` (custom top + bottom toolbars) instead of Navbar + SiteFooter. Has its own root-level skip link. Does not mount Navbar AT ALL. This is canonical exception per `09-design-system.md` § Layout Exception: BibleReader.

NotFound (`App.tsx:120-142`) uses `<Layout>` default — opaque navbar with Caveat wordmark.

---

## Section G — Out-of-scope preservation list

Carry-forward from prior cluster decisions:

### G.1 SiteFooter Caveat wordmark

Per the brief and `09-design-system.md` § Typography, the SiteFooter wordmark is grandfathered as "branding elements only" exception. **Out of scope for migration in Spec 12** unless the direction phase explicitly couples the Navbar wordmark migration with footer.

### G.2 Daily Hub HorizonGlow

Daily Hub-only chrome primitive per Direction Decision 1 of the music direction doc and `09-design-system.md` § Daily Hub Visual Architecture. **Out of scope for Spec 12.**

### G.3 RoutinesPage chrome (post-11c shipped)

RoutinesPage chrome was redesigned in Spec 11c (per the 11c recon at `_plans/recon/routines-redesign-2026-05-06.md`). The atmospheric hero, RoutineCard chrome, step-icon color identity, eyebrow tier system — all out of scope unless Spec 12's chrome audit reveals a navbar-level regression specific to RoutinesPage.

The one connection point: RoutinesPage uses `<Layout>` (default), which means opaque navbar. If the direction phase decides to migrate Navbar's opaque chrome (Section B.3) or add Caveat → gradient migration (Section B.1), RoutinesPage WILL render the new chrome. That's a transitive consequence, not a Spec 12 RoutinesPage-direct change. Note in execution.

### G.4 Audio engine / AudioProvider / audioReducer

Decision 24 from the music direction doc: "Spec 11A and 11B are visual-migration ONLY. AudioProvider, audioReducer, lib/audio-engine.ts, and all hook internals are OUT OF SCOPE. Engine code does NOT change. Visual migration touches chrome only." This applies forward to Spec 12: any audio-related component (AudioPill, AudioDrawer, AmbientSoundPill, DailyAmbientPillFAB) is read-only chrome.

Spec 12 does not touch the audio cluster at all (it's a navbar/error-boundary spec), so this preservation rule is automatic. Flagged for completeness.

### G.5 Page-level content (heroes, cards, sections)

Spec 12 is chrome-level. Content tiers (cards, hero cards, FrostedCard tier system, gradient text headings inside content) are out of scope. The only content-adjacent surfaces are:
- Error boundary fallback content (D.1, D.2, D.3) — chrome-tier surface
- Suspense fallback (D.4) — chrome-tier surface
- NotFound page content (`App.tsx:120-142`) — chrome-tier surface

These are in scope.

### G.6 BibleReader

Per `09-design-system.md` § Layout Exception, BibleReader uses ReaderChrome instead of Navbar/SiteFooter. **Out of scope for Spec 12.** BibleReader's root-level skip link, immersive design, no-Navbar treatment all remain.

---

## Section H — Known invariants to preserve

Class strings, components, and behavioral patterns established by prior cluster work that Spec 12 MUST preserve:

### H.1 White-pill primary CTA Pattern 2

Used by:
- `<DesktopAuthActions>` "Get Started" button in opaque mode (Navbar.tsx:124-134)
- `ErrorBoundary` Refresh Page button (uses the equivalent `bg-white text-hero-bg` chrome with white glow shadow)
- Many inner-page primary CTAs (Help Me Pray, Save Entry, etc.)

Class string from `09-design-system.md` § White Pill CTA Patterns Pattern 2:

```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

Preserve verbatim. If error-boundary buttons get migrated FROM `bg-primary` TO white pill, this is the canonical chrome.

### H.2 `GRADIENT_TEXT_STYLE`

Located at `frontend/src/constants/gradients.tsx`. Constant CSSProperties object that produces the white-to-purple gradient via `background-clip: text`. Used by ~20+ headings across the app. Sample usage: `style={GRADIENT_TEXT_STYLE}` on h1.

If Section B.1 wordmark migration proceeds, this is the destination constant. The current ErrorBoundary inline gradient (`linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)`) DOES NOT match the constant — direction may consider unifying.

### H.3 `ATMOSPHERIC_HERO_BG`

`PageHero.tsx:10-14`:

```ts
export const ATMOSPHERIC_HERO_BG = {
  backgroundColor: '#0f0a1e',  // dashboard-dark
  backgroundImage: 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
} as const
```

Used by every inner-page hero. Layout itself does NOT apply this — pages apply it inline on their hero `<section>`.

### H.4 BB-33 animation tokens

Per `09-design-system.md` § Animation Tokens, all durations and easings come from `frontend/src/constants/animation.ts`. Spec 12's chrome work should not introduce new hardcoded `200ms` or `cubic-bezier(...)` strings.

The Navbar's `transition-[colors,transform] duration-fast` (line 127) and `after:duration-base after:ease-decelerate` (line 38) already use the canonical tokens. Preserve.

### H.5 Spec 11A/11B/11c chrome migrations

Per Spec 10A canonical patterns and Spec 11A music-cluster patterns:
- Active-state opacity: `bg-white/15 text-white`
- Border opacity unification: `border-white/[0.12]`
- Severity destructive: `bg-red-950/30 border border-red-400/30 text-red-100`
- Decorative tint preservation: `bg-primary/X` decorative tints preserved per Decision 11

Spec 12 chrome work should match these patterns where chrome-tier color choices are made.

### H.6 Skip-to-main-content link semantics

Navbar.tsx:173-178. Always the first focusable element. `href="#main-content"`. Preserved across modes. Layout's `<main id="main-content">` is the target. Layout.test.tsx:99-103 enforces the id-presence even in `display: contents` mode.

BibleReader has its own root-level skip link (documented exception). DO NOT remove either.

### H.7 Auth modal flow

`useAuthModal()` context (`AuthModalProvider`). Navbar's "Log In" button calls `authModal?.openAuthModal(undefined, 'login')`. The auth modal is real now (Forums Wave Phase 1 spec 1.5 + 1.9 shipped real JWT). DO NOT alter the Navbar→AuthModal flow.

---

## Section I — Mobile / responsive assessment

### I.1 Mobile drawer at 375px (iPhone SE width)

- Drawer width: `w-[280px]` — fixed 280px regardless of viewport. At 375px viewport, drawer occupies ~75% of screen width. Backdrop covers the remaining left ~25%.
- Hamburger position: top-right of the navbar's inner glass box. Standard iOS-thumb-reachable position.
- Drawer animations: 200ms slide-from-right + 200ms backdrop fade-in. Reduced motion: instant (no animation).
- Item layout: vertical list, `min-h-[44px]` per item. Inner padding `px-3`. Spacing between items `mt-1` after `DrawerSectionHeader`.
- Touch targets:
  - Hamburger: `min-h-[44px] min-w-[44px]` ✓
  - Each `DrawerLink`: `min-h-[44px]` ✓ (verified test Navbar.test.tsx:673-685)
  - "Notifications" button: `min-h-[44px]` ✓
  - "Log In" / "Get Started" / "Log Out" buttons: `min-h-[44px]` ✓
- Focus trap: implemented inline, keeps Tab within drawer (Section A.9).
- Escape closes drawer + returns focus to hamburger (Navbar.tsx:158-169).
- Backdrop dismiss: `onClick={handleAnimatedClose}` on the backdrop element (MobileDrawer.tsx:178).

### I.2 Tablet (768px) navbar

- The inner glass box `mx-auto max-w-6xl` width is 1152px > 768px, so at 768px the navbar fits within the viewport with the standard `px-6` padding.
- Nav links: `hidden md:flex` reveals the desktop nav at 768px+.
- BUT each link has `<link.icon className="hidden md:block lg:hidden" />` AND `<span className="hidden lg:inline">{label}</span>` — so at 768-1024px the navbar shows ICON-ONLY nav links (Daily Hub icon, Bible icon, etc.) and the label text reveals only at 1024px+. This is documented in `Navbar.test.tsx:112-118` ("tablet: nav links have aria-label for icon-only mode") and is the canonical pattern.
- "Local Support" dropdown trigger: same icon-only-on-tablet treatment? Per LocalSupportDropdown.tsx the label "Local Support" is rendered as text without an icon — so on tablet there's a text-only dropdown trigger sitting in a row of icons. Worth checking visually whether this looks coherent.
- Right cluster (auth state) appears in same form on tablet+.

### I.3 Wordmark + nav-link cluster wrapping behavior

At 1024px+ (lg): "Worship Room" wordmark (Caveat 36px ~= 290px wide at most) + 5 text-labelled links + Local Support dropdown (~120px) + auth/user actions. Total width comfortably fits within max-w-6xl (1152px).

At 768-1024px: same wordmark + 5 icon-only links (~30px each * 5 = 150px) + Local Support text dropdown (~120px) + auth/user. Comfortable fit.

Below 768px: hamburger replaces nav, drawer pattern engages.

NO known wrapping bugs in current chrome.

---

## Section J — Accessibility posture (preservation requirements)

Audit of the current chrome:

### J.1 Skip-to-main-content link

- Mounted in `Navbar.tsx:173-178` as the first focusable element on every page that mounts Navbar (every page except BibleReader).
- Keyboard reachable: Tab on any page lands here first.
- Visible on focus: `focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white`
- Target: `<main id="main-content">` in Layout, or in custom-mounting pages each page provides its own `<main id="main-content">` — verify per page if Spec 12 audits skip-link integrity.

### J.2 Navbar landmarks

- Outer `<nav aria-label="Main navigation">` ✓ (Navbar.tsx:184)
- LocalSupportDropdown wraps its trigger in a `<div>` not `<nav>` — single landmark per page is canonical, sub-navigation can be plain divs.
- MobileDrawer uses `<nav aria-label="Mobile navigation">` ✓ when open.

### J.3 Active-link `aria-current`

- Desktop `<NavLink>` from react-router-dom does NOT auto-set `aria-current` here — the component uses `<NavLink className={getNavLinkClass(...)({ isActive: active })}>` which receives the isActive prop but the NavLink itself defaults to setting `aria-current="page"` when active. NEED TO VERIFY by reading react-router-dom's NavLink behavior — but the current code passes the isActive boolean to the className resolver, suggesting the component is consuming isActive manually rather than letting NavLink set aria-current.

  Actually looking at line 80: `className={getNavLinkClass(transparent)({ isActive: active })}` — this calls the function with manually computed `isActive`. NavLink itself receives no other props. NavLink's default behavior IS to set `aria-current="page"` when its internal active state matches. With `isActive` computed externally (via `isNavActive()`), NavLink may still set its own aria-current based on its own URL match logic — which could differ from `isNavActive()`'s broader match logic. **This is a real ambiguity worth flagging in Spec 12 audit.**

- MobileDrawer's `DrawerLink` explicitly sets `aria-current={active ? 'page' : undefined}` (MobileDrawer.tsx:68) — explicit and correct.
- LocalSupportDropdown panel link explicitly sets `aria-current={location.pathname === link.to ? 'page' : undefined}` (LocalSupportDropdown.tsx:181) — correct.

### J.4 Mobile drawer accessibility

- `role="dialog"` is NOT explicitly set on the drawer `<nav>` — per spec for non-modal off-canvas navigation, `<nav aria-label>` is acceptable.
- `aria-modal` NOT set — current implementation is technically a "non-modal drawer" (clicking the backdrop doesn't trap focus to the drawer until you're inside it; the focus trap activates after the drawer opens). Worth direction discussion.
- Focus trap: implemented inline (Section A.9). Restores focus to hamburger on close.
- Escape closes ✓ (Navbar.tsx:158-169 — cross-component coordination via useEffect on isMenuOpen).
- Backdrop dismiss ✓.

### J.5 Notification bell

- `aria-label`: `getByLabelText(/^Notifications/)` matches in Navbar.test.tsx:446 — so the bell has a "Notifications" or similar label
- Unread badge: not explicitly verified, but per `10-ux-flows.md` § Notification Flow the badge should announce the count
- Click opens NotificationPanel; details in DesktopUserActions.tsx:97-113

### J.6 Avatar dropdown

- Trigger `aria-haspopup="menu"` ✓ (test Navbar.test.tsx:530-535)
- Trigger `aria-expanded={isOpen}` ✓ (AvatarDropdown.tsx:32)
- Trigger `aria-controls={isOpen ? 'user-menu-dropdown' : undefined}` ✓
- Trigger `aria-label="User menu"` ✓
- Menu has `role="menu"` ✓
- Menu items have `role="menuitem"` ✓
- Keyboard nav: Escape closes (DesktopUserActions.tsx:36-50), outside click closes (DesktopUserActions.tsx:52-63). Up/down arrow nav within menu items NOT implemented — `<Link>` and `<button>` are tabbable but Tab moves through them sequentially. Roving tabindex / arrow nav is not present. This is acceptable for a dropdown menu but not WAI-ARIA Menu Pattern strict.

### J.7 Color contrast on glass

- `bg-white/[0.08] saturate-[1.8]` background over `bg-hero-dark` (#0D0620): rendered approximate background ~`#181336`
- `text-white` (active): contrast ~16:1 — passes AAA easily
- `text-white/90` (transparent inactive): contrast ~14:1 — passes AA + AAA
- `text-text-dark` (#2C3E50, opaque inactive): contrast ~1.5-2:1 — **FAILS WCAG AA** (requires 4.5:1 for normal text)
- `text-primary` (#6D28D9, opaque active wordmark + active links): contrast ~3.5-4:1 — borderline; depends on the rendered chrome behind. Likely fails AA for normal text but passes for large text.

**This is the largest a11y gap in the current chrome.** ~12 production pages render the navbar in opaque mode (Section A.2 / F.1), and inactive nav links use `text-text-dark` — a dark light-theme color on a dark backdrop. Direction phase decides whether to:
- Migrate `text-text-dark` to a dark-theme-appropriate inactive color (e.g., `text-white/70`) — easy fix
- Migrate all opaque-mode pages to transparent mode — broader fix, requires touching 12 pages
- Accept the drift — WCAG-fail position not aligned with project standards

The transparent mode is fully WCAG-AA-compliant.

### J.8 Reduced-motion safety net

Per `09-design-system.md` § Reduced-Motion Safety Net, the global rule in `frontend/src/styles/animations.css` disables all animations site-wide. Navbar's `motion-reduce:after:transition-none` on the underline (line 38) is a belt-and-suspenders override. MobileDrawer's `useReducedMotion()` check bypasses the close timeout entirely.

---

## Section K — Open questions for direction phase

These are decisions the direction phase will need to lock. Recon does not resolve them. Listed in priority/coupling order.

### K.1 Wordmark migration scope

**The question:** Migrate the Navbar wordmark from Caveat (`font-script text-4xl font-bold`) to `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`)?

**Sub-questions:**
- Just the Navbar wordmark, or both Navbar AND SiteFooter for consistency?
- If migrating, does the size stay (`text-4xl`) or shift to a canonical size like `text-3xl sm:text-4xl`?
- If migrating both Navbar and SiteFooter, also migrate App.tsx:113 (RouteLoadingFallback) and App.tsx:135 (NotFound "Go Home" link)?
- Does Caveat get fully removed from the production bundle (saves ~10-30KB on the Google Fonts link), or stay loaded for future-use cases like StartingPointQuiz / GuidedPrayerPlayer / WelcomeWizard?

**Trade-offs:**
- Migrate: visual consistency with the rest of the dark-theme app, removes the "decorative font" exception that is increasingly out of step with the rest of Round 3
- Don't migrate: Caveat IS the brand identity (wordmark = logo), and the documented exception preserves it as such. Replacing the wordmark with another gradient text across 5+ surfaces changes the brand expression site-wide

### K.2 Active-link underline polish

**The question:** Tighten the active-link underline offset from `py-2` (~8px gap from text) to a smaller gap?

**Sub-questions:**
- `pb-1` (~4px gap, partial tightening), `pb-0.5` (~2px gap, matches footer), or different?
- Does the underline stay `h-0.5` or grow to `h-[3px]`/`h-1` for visual weight?
- Apply to LocalSupportDropdown wrapper (currently matches Navbar's `py-2`), or only Navbar primary links?

**Trade-offs:**
- Tighten: visual coherence with footer, underline reads as "anchored to the text" rather than "hovering below"
- Don't tighten: current breathing room makes the active-state animation more visible (underline grows from center across more travel distance)

### K.3 Navbar opaque-mode chrome alignment

**The question:** Migrate Navbar opaque-mode glass treatment to align with canonical FrostedCard (Section B.3)?

**Sub-questions:**
- Migrate `bg-white/[0.08]` → `bg-white/[0.06]`? `border-white/25` → `border-white/[0.12]`? Drop `saturate-[1.8]`? Drop `backdrop-blur-xl` → `backdrop-blur-sm`? Single `shadow-lg` → dual canonical shadow?
- All five at once, or selectively (e.g., just border opacity)?
- Migrate `text-text-dark` (light-theme color) inactive-link color to `text-white/70` to fix WCAG opaque-mode contrast (J.7)?
- Or: instead of fixing opaque mode, migrate the ~12 pages currently using `<Layout>` default to either explicit `<Layout transparentNav>` or direct `<Navbar transparent />` — eliminating opaque-mode renders entirely?

**Trade-offs:**
- Align chrome: opaque mode reads as canonical FrostedCard tier; consistent visual language
- Eliminate opaque mode: simpler navbar (one mode only); migrates pages forward
- Status quo: navbar dual-mode persists, opaque-mode contrast issues persist

### K.4 Test reconciliation strategy

**The question:** For each pre-existing failure, which side updates?

- **C.1 (Navbar.test.tsx:380):** Update test to assert `text-primary` (production canonical for opaque mode) OR update test to render with `<Navbar transparent />` (matching real `/prayer-wall` rendering) OR update production to use `text-white` in both modes.
- **C.2 (useFaithPoints.test.ts:96):** Update test to add `intercession: false` to the assertion (production is canonical; test is just stale schema).

C.2 is unambiguous: test update.
C.1 depends on K.3 — if Navbar opaque mode is migrated/eliminated, the test fix is determined by that direction.

### K.5 ErrorBoundary scope

**The question:** Spec 12 chrome migration of error fallbacks?

**Sub-questions:**
- ErrorBoundary inline gradient h1 (Section D.1) → `GRADIENT_TEXT_STYLE` constant?
- ChunkErrorBoundary `bg-primary` button → white-pill primary?
- RouteErrorBoundary "Go Home" `bg-primary` button → white-pill primary?
- Add `role="alert"` to ChunkErrorBoundary and RouteErrorBoundary fallbacks (currently missing — only ErrorBoundary has it)?
- Replace ChunkErrorBoundary's custom inline cross-SVG with a lucide icon (e.g., `RefreshCw` or `AlertCircle`)?
- Migrate RouteErrorBoundary "Refresh" button focus ring to match "Go Home" button focus ring (currently inconsistent)?
- Wrap in canonical FrostedCard tier (currently bare h1 + p + buttons under Layout)?
- Migrate Spec 1.9b's `<FormError>` / `<PageError>` deferred primitives? `09-design-system.md` § Error, Loading, and Empty States documents `PageError.tsx` as deferred — maybe Spec 12 ships it.
- Add Sentry frontend error capture (the deferred 1.10d-bis)?

The deferred 1.10d-bis Sentry frontend integration is a separate spec per `07-logging-monitoring.md`. Likely OUT of Spec 12 scope, but the boundaries should be redesigned in a way that anticipates a future hook insertion.

### K.6 ChunkErrorBoundary creation/extension

**The question:** Per the brief: "ChunkErrorBoundary creation: does this need a new component, or extend ErrorBoundary?"

**Already exists** at `frontend/src/components/ChunkErrorBoundary.tsx` with full feature set (verified in Section D.2). Only redesign questions remain:
- Visual chrome migration (K.5)
- Selective propagation logic — currently catches 4 specific error name/message patterns. Are there more chunk-error variants in the wild that should be caught? (E.g., `Module not available`, `Importing a module script failed` — these don't match the current patterns and would propagate to ErrorBoundary instead of showing the warm "Let's try that again" copy.)

### K.7 RouteErrorBoundary creation/extension

**Already exists** at `frontend/src/components/RouteErrorBoundary.tsx`. Only redesign questions:
- Coverage extension: ~16 routes use it; ~25 routes don't (Section D.3). Should Spec 12 wrap all routes uniformly? Specifically: Music routes (including Music Routines), Bible reader, meditate sub-pages, Reading Plan detail, Challenge detail, NotFound.
- If extending to all routes, define the route-wrap pattern: `<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><RouteComponent /></Suspense></RouteErrorBoundary>` is the current pattern. Apply uniformly.
- Visual chrome migration (K.5).

### K.8 RouteLoadingFallback wordmark

**The question:** RouteLoadingFallback (D.4) uses the same Caveat wordmark as Navbar/SiteFooter. If K.1 migrates the Navbar wordmark, does this fallback also migrate?

If yes: the `text-3xl font-script select-none` chrome → `text-3xl GRADIENT_TEXT_STYLE` chrome with `animate-logo-pulse` (or new pulse animation).
The `bg-dashboard-dark` background also drifts from `bg-hero-bg`. Does it migrate?

### K.9 NotFound page

**The question:** App.tsx:120-142. Uses `<Layout>` (opaque navbar). h1 is `text-3xl font-bold text-white`, paragraph is `text-base text-white/70`, CTA is `font-script text-2xl text-primary-lt` (Caveat link).

If K.1 migrates the wordmark, does the NotFound CTA also migrate? It's an inline-text Caveat usage that doesn't read as branding — it's a CTA dressed up as branding. Likely a candidate for migration to a regular text link.

### K.10 favicon.ico + apple-mobile-web-app-capable fixes

**The question:** Spec 12 includes the cosmetic index.html / public asset fixes from the brief:
- Add `<meta name="mobile-web-app-capable" content="yes">` to index.html (paired with the existing apple-prefixed tag)
- Add `favicon.ico` to `public/` (derived from existing icon assets)
- Add `<link rel="icon">` declarations to index.html (optional)
- Add `<meta name="color-scheme" content="dark">` to index.html (optional)

Trivial inclusions. The question is just whether they're folded into Spec 12 or punted to a separate cleanup spec.

### K.11 PageError primitive

Per `09-design-system.md` § Error, Loading, and Empty States Cross-spec guidance:

> `PageError.tsx` is deferred. The first Phase 3 migration spec that needs a page-level async-data-fetch error (likely the Prayer Wall feed backend migration) creates it in `ui/` following the conventions above.

If Spec 12 redesigns the error fallbacks, does it also ship `PageError.tsx` as the canonical async-data-fetch error primitive? Or stay deferred and only touch the existing boundaries?

### K.12 `aria-modal` and dialog role for MobileDrawer

The drawer is technically non-modal (clicking the backdrop dismisses but doesn't trap focus until inside). Direction may consider:
- Promote to `role="dialog" aria-modal="true"` — strict mobile-modal pattern
- Keep current pattern but add documentation that this is intentional non-modal navigation

### K.13 Layout opaque-mode pages migration

Per Section A.2 / F.1: ~12 pages mount `<Layout>` default and render the navbar in opaque mode. If K.3 eliminates opaque mode, those pages need migration:
- Easy: pass `<Layout transparentNav>` instead of `<Layout>` (2 keystrokes per page)
- Or: migrate to direct `<Navbar transparent />` mounting like newer Round 3 pages

This is a transitive consequence of K.3, not a Spec 12 navbar-direct change. Direction sequencing matters.

---

## Closing notes

This recon is analysis-only. No spec language, no direction decisions, no code changes. Stay on `forums-wave-continued`. Eric handles all git operations.

**Three observations worth highlighting for the direction phase:**

1. **Opaque-mode navbar is in production on ~12 pages** (Section A.2, F.1) and exhibits a real WCAG-AA failure on `text-text-dark` inactive links (J.7). This is the most impactful drift in the audit — invisible-until-hover nav links on legal/privacy/accessibility/meditate pages. Whether to fix opaque mode or eliminate it is a major direction call (K.3, K.13).

2. **The Caveat wordmark question couples Navbar + SiteFooter + RouteLoadingFallback + NotFound link** (K.1, K.8, K.9). Migrating just one creates inconsistency; migrating all four is a larger surface change but ends Caveat as a heading font in production. This is a brand-identity decision more than a chrome decision.

3. **Error boundary coverage is asymmetric** (D.3, D.5). ~16 routes wrap RouteErrorBoundary; ~25 don't. Music Routines, Bible reader, all 6 Meditate sub-pages, NotFound — render-crashes on these surface as the full-bleed ErrorBoundary fallback (no Layout chrome, no "Go Home" affordance) rather than the route-scoped fallback. Direction may decide to wrap all routes uniformly.

The pre-existing test failures (C.1, C.2) are well-understood: useFaithPoints is a stale-schema test bug (production canonical), Navbar/prayer-wall is dependent on K.3 / K.4 outcomes.

The cosmetic index.html / favicon fixes (E.1, E.2, K.10) are trivial single-line additions — fold them into whatever Spec 12 ships if direction agrees.

Sections G and H are the most important preservation lists. Audio engine, RoutinesPage post-11c chrome, BibleReader ReaderChrome, SiteFooter wordmark (unless coupled to K.1), Daily Hub HorizonGlow, white-pill primary CTA Pattern 2, GRADIENT_TEXT_STYLE constant, ATMOSPHERIC_HERO_BG constant, BB-33 animation tokens, skip-link semantics — all preserved verbatim.

Awaiting review and direction phase.
