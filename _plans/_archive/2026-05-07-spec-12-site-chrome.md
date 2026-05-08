# Implementation Plan: Spec 12 — Site Chrome (Opaque-Mode Elimination + Error Boundary Migration + Cosmetic Cleanup)

**Spec:** `_specs/spec-12-site-chrome.md`
**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/site-chrome-2026-05-07.md` (loaded)
**Master Spec Plan:** N/A — standalone bug-fix and drift cleanup spec

---

## Affected Frontend Routes

The Layout default flip in Step 1 affects every route in the app, but only the routes below render visibly different navbar chrome (opaque → transparent). All other routes continue to render their existing transparent navbar through explicit `<Navbar transparent />` or `<Layout transparentNav>`.

- `/music/routines`
- `/health`
- `/reading-plans/:planId`
- `/community-guidelines`
- `/terms-of-service`
- `/privacy-policy`
- `/accessibility`
- `/meditate/breathing`
- `/meditate/soaking`
- `/meditate/gratitude`
- `/meditate/acts`
- `/meditate/psalms`
- `/meditate/examen`
- `/some-nonexistent-route` (404 / NotFound — Layout default flip + "Go Home" link migration)
- `/verse/<id-that-does-not-exist>` (SharedVerse error state — `<Navbar />` → `<Navbar transparent />`)
- `/prayer/<id-without-id-param>` (SharedPrayer error state — `<Navbar />` → `<Navbar transparent />`)
- ChunkErrorBoundary fallback (route-independent — chrome migration)
- RouteErrorBoundary fallback (route-independent — chrome migration)

---

## Architecture Context

### Files this spec touches (production)

| File | Edit |
|---|---|
| `frontend/src/components/Layout.tsx` | Decision 4 — flip `transparentNav` default `false` → `true` |
| `frontend/src/pages/SharedVerse.tsx` | Step 2 — `<Navbar />` (line 27, error state) → `<Navbar transparent />` |
| `frontend/src/pages/SharedPrayer.tsx` | Step 2 — `<Navbar />` (line 28, error state) → `<Navbar transparent />` |
| `frontend/src/components/ErrorBoundary.tsx` | Decision 8 — inline gradient → `GRADIENT_TEXT_STYLE` |
| `frontend/src/components/ChunkErrorBoundary.tsx` | Decision 6 — full chrome migration (lucide RefreshCw, FrostedCard, white-pill CTA, role="alert") |
| `frontend/src/components/RouteErrorBoundary.tsx` | Decision 7 — full chrome migration (FrostedCard, role="alert", reconciled focus rings, white-pill "Go Home") |
| `frontend/src/App.tsx` | Decision 9 (wrap uncovered routes in `RouteErrorBoundary`), Decision 10 (`RouteLoadingFallback` bg-dashboard-dark → bg-hero-bg), Decision 2 (NotFound "Go Home" link — Caveat → plain text) |
| `frontend/index.html` | Decision 11 — `mobile-web-app-capable`, `color-scheme dark`, `<link rel="icon">`, `<link rel="shortcut icon">` |
| `frontend/public/favicon.ico` | NEW FILE — Decision 11 — multi-resolution ICO (16, 32, 48, 64) derived from `icon-192.png` |

### Files this spec touches (tests)

| File | Edit |
|---|---|
| `frontend/src/components/__tests__/Layout.test.tsx` | Update default-mode test (currently asserts `max-w-7xl py-8` — must flip to `contents` because Layout's default sends `<Layout>` no-prop into the transparentNav branch). Add test verifying default renders Navbar transparent. |
| `frontend/src/components/__tests__/Navbar.test.tsx` | No edits required — line 380 Prayer Wall failure resolves naturally because `renderNavbar('/prayer-wall')` now defaults to transparent (matches the existing `text-white` assertion). Verify no other regressions. |
| `frontend/src/components/__tests__/ErrorBoundary.test.tsx` | Add 1 assertion that h1 uses `GRADIENT_TEXT_STYLE` (or does not contain the legacy inline gradient string). |
| `frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx` | Add 5 assertions: role="alert", FrostedCard chrome, RefreshCw icon, white-pill primary, no `bg-primary`. |
| `frontend/src/components/__tests__/RouteErrorBoundary.test.tsx` | NEW FILE — 8 assertions for chrome canonicalization (role, FrostedCard, button chrome, copy preserved). |
| `frontend/src/__tests__/App-route-coverage.test.tsx` (or extend existing App.test.tsx if it exists) | NEW or extend — 4 integration tests verifying RouteErrorBoundary wraps Music Routines, Bible reader, NotFound, one Meditate sub-page. |
| `frontend/src/hooks/__tests__/useFaithPoints.test.ts` | Step 10 — add `intercession: false` to the expected default-activities object at line 96-100. |

### Patterns to follow

- **`<Navbar transparent />`** — canonical post-Spec-12 production navbar. White Caveat wordmark (`font-script text-4xl font-bold text-white`), `text-white` active link color, `text-white/90` inactive, `liquid-glass` glass treatment.
- **FrostedCard tier 1** — verbatim class string: `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`. Used for ChunkErrorBoundary + RouteErrorBoundary fallback content wraps.
- **White-pill primary CTA Pattern 2** — verbatim class string from `09-design-system.md` § "White Pill CTA Patterns" → ChunkErrorBoundary "Refresh Page" button.
- **Quieted white-pill peer-tier** — `inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` → RouteErrorBoundary "Go Home" link (peer-tier with "Refresh" muted-tier).
- **Muted-active button tier** — `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` → RouteErrorBoundary "Refresh" button (focus-ring reconciled to match "Go Home").
- **`GRADIENT_TEXT_STYLE`** at `@/constants/gradients` — replaces ErrorBoundary inline gradient. Style: `WHITE_PURPLE_GRADIENT` = `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text`.
- **`role="alert"`** on every error fallback container (ErrorBoundary already has it; Chunk + Route migrate to match).
- **Layout `transparentNav` prop** — Layout already supports the prop (confirmed at `Layout.tsx:18`). Decision 4 only flips the default value; no signature changes.

### Test patterns to match (provider wrapping)

- Layout/Navbar tests use `MemoryRouter` only (no Auth/AudioProvider — Layout mocks `useAuth` and other hooks at module scope).
- ChunkErrorBoundary tests mock `@/components/Layout` to a passthrough wrapper (line 7-11 of `ChunkErrorBoundary.test.tsx`); the chrome-migration tests should preserve this mock so they assert on the inner FrostedCard, not on Layout's chrome.
- RouteErrorBoundary tests follow the same Layout-mock pattern. Trigger a render error via a `ThrowingChild` component pattern (canonical example in `ChunkErrorBoundary.test.tsx:14-17`).

### Auth gating (none — chrome-only spec)

Spec 12 introduces no new auth gates. All existing gates preserved through chrome-only edits. See "Auth Gating Checklist" below.

---

## Auth Gating Checklist

Spec 12 introduces zero new auth gates. The following existing actions remain unchanged:

| Action | Auth required? | Path | Planned in step |
|---|---|---|---|
| Tap "Log In" in Navbar | NO | `useAuthModal.openAuthModal('login')` | Untouched |
| Tap "Get Started" in Navbar | NO | `<Link to="/register">` | Untouched |
| Tap "Refresh Page" on ChunkErrorBoundary | NO | `window.location.reload()` | Step 4 |
| Tap "Refresh" on RouteErrorBoundary | NO | `window.location.reload()` | Step 5 |
| Tap "Go Home" on RouteErrorBoundary | NO | `<Link to="/">` | Step 5 |
| Tap "Refresh Page" on ErrorBoundary | NO | `setState + window.location.reload()` | Untouched (chrome-only edit in Step 3) |
| Tap NotFound "Go Home" link | NO | `<Link to="/">` | Step 8 |

No spec-defined auth gates are missing — Spec 12 is chrome-only.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|---|---|---|---|
| Layout `transparentNav` prop | default | `true` (was `false`) | Decision 4 |
| ChunkErrorBoundary outer wrap | `<Layout>` (renders transparent navbar via new default) | NEW (chrome migration) | Decision 4 + Decision 6 |
| ChunkErrorBoundary fallback content wrap | `mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] text-center` + `role="alert"` | FrostedCard tier 1 (`09-design-system.md`) |
| ChunkErrorBoundary icon | `<RefreshCw className="mx-auto h-8 w-8 text-violet-300" aria-hidden="true" />` (replaces inline cross SVG) | lucide-react |
| ChunkErrorBoundary heading | `<h1 className="mt-4 text-2xl font-bold text-white">Let's try that again</h1>` (preserved copy) | Existing |
| ChunkErrorBoundary body | `<p className="mt-2 text-base text-white/70">Sometimes things don't load as expected. A quick refresh usually does the trick.</p>` (preserved copy) | Existing |
| ChunkErrorBoundary "Refresh Page" button | White-pill Pattern 2 verbatim: `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | `09-design-system.md` § White Pill CTA Patterns |
| ChunkErrorBoundary outer container | `flex min-h-[60vh] items-center justify-center px-4` | Vertical centering preserved |
| RouteErrorBoundary outer wrap | `<Layout>` (renders transparent navbar via new default) | Decision 4 |
| RouteErrorBoundary fallback content wrap | Same FrostedCard tier 1 as ChunkErrorBoundary (with `text-center`) + `role="alert"` | FrostedCard tier 1 |
| RouteErrorBoundary heading | `<h1 className="text-2xl font-bold text-white">This page couldn't load</h1>` (preserved copy) | Existing |
| RouteErrorBoundary body | `<p className="mt-2 text-base text-white/70">Try refreshing or going back to the home page.</p>` (preserved copy) | Existing |
| RouteErrorBoundary "Refresh" button | Muted-active tier: `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Reconciled focus ring to match "Go Home" |
| RouteErrorBoundary "Go Home" link | Quieted white-pill peer-tier: `inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Quieted Pattern 2 — px-6 py-2.5 text-sm peer-tier |
| RouteErrorBoundary button row | `mt-6 flex justify-center gap-3` | Preserved spacing |
| RouteErrorBoundary outer container | `flex min-h-[60vh] items-center justify-center px-4` | Preserved |
| ErrorBoundary heading style | `style={GRADIENT_TEXT_STYLE}` (replaces inline `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)`) | `@/constants/gradients` |
| RouteLoadingFallback bg | `bg-hero-bg` (was `bg-dashboard-dark`) | Decision 10 — aligns with Layout outer wrapper |
| NotFound "Go Home" link | `text-base text-white/70 hover:text-white underline transition-colors` (was `font-script text-2xl text-primary-lt transition-colors hover:text-primary`) | Decision 2 |
| favicon.ico | new file in `public/` (32×32 multi-res ICO derived from `icon-192.png`) | Decision 11 |
| index.html `<link rel="icon">` | `<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">` + `<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">` + `<link rel="shortcut icon" href="/favicon.ico">` | Decision 11 |
| index.html `mobile-web-app-capable` | `<meta name="mobile-web-app-capable" content="yes">` (paired with existing apple-prefixed tag) | Decision 11 |
| index.html `color-scheme` | `<meta name="color-scheme" content="dark">` | Decision 11 |

---

## Design System Reminder

Project-specific quirks `/execute-plan` displays before every UI step:

- **DO NOT migrate the Worship Room wordmark.** Caveat font, size, and color preserved on Navbar AND SiteFooter AND RouteLoadingFallback per Decision 1. The wordmark is the documented branding exception per `09-design-system.md` § Typography ("Used for branding elements (logo) only").
- **DO NOT change the active-link underline.** 8px gap and grow-from-center animation preserved per Decision 3.
- **DO NOT remove Caveat from Google Fonts.** Still loaded for wordmark + RouteLoadingFallback per Decision 5.
- **DO NOT touch SiteFooter.** Footer wordmark stays Caveat. Footer-link tightening is a separate concern.
- **DO NOT touch BibleReader.** Documented exception per `09-design-system.md` § Layout Exception (uses ReaderChrome instead of Navbar/SiteFooter).
- **DO NOT touch Daily Hub HorizonGlow.** Daily Hub-only chrome primitive.
- **DO NOT modify ChunkErrorBoundary's selective propagation logic.** Only chrome migrates. The `getDerivedStateFromError` logic that catches 4 specific error patterns and returns `null` for others must stay byte-for-byte unchanged.
- **DO NOT touch audio engine, AudioProvider, or audioReducer.** Decision 24 from music cluster still applies.
- **DO NOT touch RoutinesPage post-11c content.** Transitive navbar consequence only.
- **DO NOT add MobileDrawer aria-modal.** Deferred per direction.
- **DO NOT add Sentry frontend integration.** Stays deferred per spec 1.10d-bis.
- **DO NOT ship PageError primitive.** Stays deferred.
- **DO NOT extend ChunkErrorBoundary's catch patterns.** Current 4 patterns sufficient.
- **DO NOT use full Pattern 2 sizing for RouteErrorBoundary "Go Home".** Quieted peer-tier (`px-6 py-2.5 text-sm`) is intentional — two showstopper buttons side-by-side compete with each other (same hierarchy reasoning as Spec 11c Decision 9).
- **DO NOT use deprecated `bg-primary` solid CTAs.** Both ChunkErrorBoundary and RouteErrorBoundary currently use `bg-primary` — replace with white-pill patterns.
- **DO NOT remove Layout's opaque-mode code path.** Layout's `transparentNav` prop and Navbar's opaque-mode rendering stay as defensive fallback (a page can still explicitly opt out via `<Layout transparentNav={false}>`).

---

## Shared Data Models

N/A — chrome-only spec, no new data models. localStorage keys unchanged.

---

## Responsive Structure

| Breakpoint | Width | Key layout changes |
|---|---|---|
| Mobile | 375px | Navbar collapses to hamburger + MobileDrawer (unchanged). Error fallback FrostedCards center via `mx-auto max-w-md` with `px-4` outer padding. Button rows wrap below `sm:` if overflow, but Refresh + Go Home (~187px combined) fit comfortably inside `max-w-md` (384px) at all breakpoints. |
| Tablet | 768px | Navbar transparent mode, icon-only nav links (existing canonical pattern preserved). FrostedCards center, button rows side-by-side. |
| Desktop | 1440px | Navbar transparent mode, full text + icon nav links. FrostedCards center inside Layout's `<main>`. ChunkErrorBoundary "Refresh Page" button uses `sm:text-lg` for larger tap target. |

**Custom breakpoints (if any):** None.

---

## Inline Element Position Expectations

Spec 12 makes no inline-row layout changes. The only structural change is the FrostedCard wrap on ChunkErrorBoundary + RouteErrorBoundary fallback content, which centers the content via `mx-auto max-w-md` and stacks elements vertically.

The RouteErrorBoundary button row (Refresh + Go Home) uses `flex justify-center gap-3` and is the only inline-row layout in this spec.

| Element group | Elements | Expected alignment | Wrap tolerance |
|---|---|---|---|
| RouteErrorBoundary button row | "Refresh" button + "Go Home" link | Both buttons share `min-h-[44px]` and identical chrome height — top-y values match within ±5px at 1440px, 768px, and 375px | No wrap at any breakpoint (combined width ~187px ≪ max-w-md 384px minus p-8 padding 64px = 320px usable; both buttons stay on one row) |

---

## Vertical Rhythm

| From → To | Expected gap | Source |
|---|---|---|
| ChunkErrorBoundary icon → heading | `mt-4` (16px) | NEW |
| ChunkErrorBoundary heading → body | `mt-2` (8px) | Preserved copy spacing |
| ChunkErrorBoundary body → button | `mt-6` (24px) | Preserved |
| RouteErrorBoundary heading → body | `mt-2` (8px) | Preserved |
| RouteErrorBoundary body → button row | `mt-6` (24px) | Preserved |
| RouteErrorBoundary button row internal gap | `gap-3` (12px) between Refresh + Go Home | Preserved |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 11A + 11B + 11C shipped (verify via `git log --oneline | head -20`)
- [ ] `forums-wave-continued` branch active
- [ ] No uncommitted changes in working tree (note: `_specs/spec-12-site-chrome.md` and `_plans/recon/site-chrome-2026-05-07.md` are untracked but expected)
- [ ] `pnpm test` baseline (chrome-related): 133 pass / 2 known pre-existing fails (`useFaithPoints — intercession` + `Navbar Prayer Wall active link`). Project-wide baseline: 9,470+ pass / 2 known pre-existing fails.
- [ ] `RefreshCw` icon resolves cleanly from `lucide-react` (verify via `grep "RefreshCw" frontend/src` to find existing imports — already used elsewhere in codebase)
- [ ] `GRADIENT_TEXT_STYLE` exported from `@/constants/gradients` (verified at `frontend/src/constants/gradients.tsx:9-15`)
- [ ] `bg-hero-bg` token defined in `frontend/tailwind.config.js` (Layout already uses it on its outer div)
- [ ] `Layout.tsx` has `transparentNav` prop (verified at `frontend/src/components/Layout.tsx:18`) — Decision 4 flips default, no signature change
- [ ] No new dependencies needed
- [ ] favicon.ico generation tool available (online ICO converter favicon.io / convertico.com OR local `imagemagick` `convert` command)
- [ ] All auth-gated actions from the spec are accounted for (none — chrome-only)
- [ ] Design system values verified (from recon + `09-design-system.md`)
- [ ] All [UNVERIFIED] values flagged with verification methods (none — every value is from recon or canonical docs)
- [ ] Recon report loaded for visual verification during execution (`_plans/recon/site-chrome-2026-05-07.md`)
- [ ] No deprecated patterns introduced (Caveat headings on non-wordmark surfaces, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, `bg-primary` solid CTAs, PageTransition component)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page using `<Layout transparentNav>` explicitly | Continues to render transparent (no change) | Default flip doesn't affect explicit prop usage |
| Page using `<Layout transparentNav={false}>` explicitly | Continues to render opaque (defensive code path) | If a page intentionally wants opaque, explicit prop wins. Recon found ZERO such pages today, but the code path stays for defensive reasons |
| Page using `<Navbar />` directly (no prop, no Layout) | SharedVerse + SharedPrayer error states migrate to `<Navbar transparent />` in Step 2 | Decision 4 only flips Layout default; direct Navbar usage needs explicit prop |
| Render-crash on a route now wrapped in RouteErrorBoundary | Shows warm "couldn't load" fallback in canonical FrostedCard with white-pill "Go Home" | Decision 9 + Decision 7 |
| Render-crash on a route NOT yet wrapped (after Spec 12) | NONE — Decision 9 wraps all routes uniformly | After Spec 12, all routes covered |
| BibleReader render crash | Falls into RouteErrorBoundary's Layout chrome (Navbar + footer) — visually inconsistent with normal BibleReader's ReaderChrome but uniform error coverage wins | Per spec direction call: "WRAP IT ANYWAY" — uniform coverage > chrome continuity in error states |
| ChunkErrorBoundary selective propagation | Preserved byte-for-byte | Out of scope per "DO NOT modify selective propagation" |
| User on a route, backend down, then chunk-load fails | Same as before — chunk error boundary fires; backend status irrelevant | Chunk errors are independent of backend |
| favicon.ico request | Returns 32×32 multi-res ICO | Browsers probe regardless of manifest |
| User with prefers-reduced-motion | RouteLoadingFallback pulse respected via existing `prefersReduced` check (preserved) | No new motion |
| Layout default-mode test post-flip | Test must update — `<Layout>` (no prop) now uses the `!hero && transparentNav && 'contents'` branch, so `main.className` will contain `contents` and NOT `max-w-7xl py-8` | Layout.test.tsx:71-78 must be updated alongside the production change in Step 1 |
| Navbar Prayer Wall test (line 380) | Resolves naturally — `renderNavbar('/prayer-wall')` mounts `<Navbar />` no-prop, which after Decision 4 still defaults `transparent={false}` (Navbar's component default is independent of Layout's). Wait — verify direction note: per spec direction "Navbar Prayer Wall fixes naturally via Decision 4" implies that the test setup goes through Layout. Verify during execution. | If the test fails after Step 1, update test to render via Layout OR pass `transparent` to `renderNavbar`, OR remove the color assertion (matching recon Section C.1 interpretation) |
| Navbar `transparent` default | Preserved at `false` (defensive). Only Layout's default flips. | Decision 4 explicitly scopes the flip to Layout |

---

## Implementation Steps

### Step 1: Layout transparentNav default flip + Layout.test.tsx update

**Objective:** Flip `Layout`'s `transparentNav` default from `false` to `true`. Eliminates opaque mode on ~12 production pages without per-page edits. Update Layout.test.tsx to reflect the new default.

**Files to modify:**
- `frontend/src/components/Layout.tsx` — flip default
- `frontend/src/components/__tests__/Layout.test.tsx` — update default-mode test, add new explicit-false test

**Details:**

Locate the Layout function signature at `frontend/src/components/Layout.tsx:18`. Currently:

```tsx
export function Layout({ children, hero, transparentNav = false }: LayoutProps) {
```

Change to:

```tsx
export function Layout({ children, hero, transparentNav = true }: LayoutProps) {
```

That is the only production code change for this step.

**Test update — Layout.test.tsx:**

The test at lines 71-78 currently asserts `<Layout>` (no prop) wraps children in `<main max-w-7xl py-8>`. After the flip, that branch is unreachable for the no-prop case — the no-prop path now takes `!hero && transparentNav && 'contents'`. Update:

Existing test (lines 71-78):
```tsx
it('default mode wraps children in <main max-w-7xl py-8>', () => {
  mockSeason('ordinary-time')
  const { getByRole } = renderLayout()
  const main = getByRole('main')
  expect(main.className).toContain('max-w-7xl')
  expect(main.className).toContain('py-8')
  expect(main.className).not.toContain('contents')
})
```

Replace with:

```tsx
it('default mode (no hero, no prop) uses display:contents main (transparentNav=true is canonical default)', () => {
  mockSeason('ordinary-time')
  const { getByRole } = renderLayout()
  const main = getByRole('main')
  expect(main.className).toContain('contents')
  expect(main.className).not.toContain('max-w-7xl')
  expect(main.className).not.toContain('py-8')
})

it('explicit transparentNav={false} preserves legacy opaque main wrap', () => {
  mockSeason('ordinary-time')
  const { getByRole } = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout transparentNav={false}>
        <div>test content</div>
      </Layout>
    </MemoryRouter>,
  )
  const main = getByRole('main')
  expect(main.className).toContain('max-w-7xl')
  expect(main.className).toContain('py-8')
  expect(main.className).not.toContain('contents')
})
```

The "transparentNav without hero uses display:contents main" test at line 89-96 stays as-is (still valid for explicit `transparentNav={true}`). The `bg-hero-bg` outer-wrapper test at line 61-68 stays. The hero-mode test at line 80-87 stays. The skip-link integrity test at line 98-103 stays. The "hero mode takes precedence over transparentNav" test at line 105-114 stays.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): N/A — visual change is per-page consequence, not Layout-direct.
- Tablet (768px): N/A.
- Mobile (375px): N/A.

**Inline position expectations:** N/A — non-UI step (signature default change + test update).

**Guardrails (DO NOT):**
- DO NOT remove the `transparentNav` prop entirely. Stays for explicit opt-out.
- DO NOT remove Navbar's opaque-mode rendering code. Stays as defensive fallback.
- DO NOT touch any page that mounts `<Layout>` — they automatically inherit the new default.
- DO NOT change `bg-hero-bg` on Layout's outer div.
- DO NOT change the `<main id="main-content">` semantic anchor — skip link integrity.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| `Layout default mode (no hero, no prop) uses display:contents main` | unit (UPDATED) | Replaces existing test at line 71-78. Mounts `<Layout>` no-prop and asserts `main.className` contains `contents` and does NOT contain `max-w-7xl` or `py-8`. |
| `Layout explicit transparentNav={false} preserves legacy opaque main wrap` | unit (NEW) | Verifies the defensive code path still works when a page explicitly opts out. |
| Existing 5 tests | regression | All preserved — outer bg-hero-bg, hero mode, transparentNav-true, skip-link integrity, hero-precedence. |

**Expected state after completion:**
- [ ] `transparentNav = true` default in Layout signature
- [ ] Layout.test.tsx updated (1 test rewritten + 1 test added)
- [ ] `pnpm test --run frontend/src/components/__tests__/Layout.test.tsx` passes 7/7

---

### Step 2: SharedVerse + SharedPrayer error-state Navbar transparent migration

**Objective:** Two pages mount `<Navbar />` directly without Layout in error states. These bypass Decision 4. Migrate to explicit `<Navbar transparent />`.

**Files to modify:**
- `frontend/src/pages/SharedVerse.tsx` (line 27)
- `frontend/src/pages/SharedPrayer.tsx` (line 28)

**Details:**

In `SharedVerse.tsx:27`, replace:

```tsx
<Navbar />
```

With:

```tsx
<Navbar transparent />
```

In `SharedPrayer.tsx:28`, replace:

```tsx
<Navbar />
```

With:

```tsx
<Navbar transparent />
```

These are the only production usages of `<Navbar />` (no prop, no Layout) in the codebase per recon. Verify via `grep -rn '<Navbar />' frontend/src` after the edit — expect zero remaining matches in production code (test files may have `<Navbar />` for opaque-mode coverage; those are out of scope).

The success-state JSX in both files already uses `<Navbar transparent />` (verified at SharedVerse.tsx:63 and SharedPrayer.tsx:53).

Note that both error-state JSX blocks also have a stale `bg-neutral-bg` outer div (`SharedVerse.tsx:25` and `SharedPrayer.tsx:27`) and `text-text-dark` headings — these are separate drift points NOT in Spec 12 scope. Touching only the Navbar prop preserves the surgical scope of this spec.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Navbar renders transparent (white wordmark, white nav links, no opaque glass plate).
- Tablet (768px): Same transparent treatment.
- Mobile (375px): Same.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT touch the success-state JSX in either file (already uses `<Navbar transparent />` correctly).
- DO NOT modify error-state copy or surrounding structure.
- DO NOT migrate the `bg-neutral-bg` or `text-text-dark` legacy chrome on the error states (separate drift, out of scope).

**Test specifications:**

No new tests required. Existing SharedVerse / SharedPrayer tests cover error-state rendering; verify they still pass after the prop change. No tests assert Navbar's `transparent` prop directly on these pages.

**Expected state after completion:**
- [ ] SharedVerse.tsx:27 → `<Navbar transparent />`
- [ ] SharedPrayer.tsx:28 → `<Navbar transparent />`
- [ ] `grep -rn '<Navbar />' frontend/src/pages` returns zero matches
- [ ] `pnpm test --run frontend/src/pages/__tests__/SharedVerse.test.tsx frontend/src/pages/__tests__/SharedPrayer.test.tsx` (if these exist) — no regressions

---

### Step 3: ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE constant

**Objective:** Migrate the ErrorBoundary fallback h1 from inline gradient to canonical `GRADIENT_TEXT_STYLE` constant.

**Files to modify:**
- `frontend/src/components/ErrorBoundary.tsx`

**Details:**

Current h1 at `ErrorBoundary.tsx:41-51`:

```tsx
<h1
  className="text-3xl font-bold sm:text-4xl pb-1"
  style={{
    background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>
  Something went wrong
</h1>
```

Replace with:

```tsx
<h1
  className="text-3xl font-bold sm:text-4xl pb-1"
  style={GRADIENT_TEXT_STYLE}
>
  Something went wrong
</h1>
```

Add the import at the top of the file (alongside the existing imports):

```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

The inline gradient was `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)`. The canonical `GRADIENT_TEXT_STYLE` (defined at `constants/gradients.tsx:6`) is `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`. Subtle visual difference (different angle, different end color stop). Direction phase locked the migration for consistency — visual review during `/verify-with-playwright` confirms acceptable. Both render as a white-to-purple gradient via background-clip: text.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): h1 renders gradient at `text-4xl` (sm: prefix promotes from text-3xl).
- Tablet (768px): h1 at `text-4xl`.
- Mobile (375px): h1 at `text-3xl`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change the h1 className (`text-3xl font-bold sm:text-4xl pb-1`) — size, weight, leading, and gradient-clip-tax (`pb-1` to prevent descender clipping) preserved.
- DO NOT change the body copy "Something broke on our end. Reload to try again — your other work is safe."
- DO NOT change the surrounding `role="alert"` card chrome.
- DO NOT change the "Refresh Page" button — already canonical white-pill Pattern 2.
- DO NOT change the violet glow orb decoration.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| `ErrorBoundary fallback h1 uses GRADIENT_TEXT_STYLE constant` | unit (NEW) | When boundary catches, query the h1 by text "Something went wrong"; assert `style.backgroundImage === WHITE_PURPLE_GRADIENT` (or assert `style.backgroundImage` does NOT contain the legacy `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)` substring). |

Existing 5 ErrorBoundary tests preserved (role="alert", copy assertions, refresh button, etc.).

**Expected state after completion:**
- [ ] `GRADIENT_TEXT_STYLE` imported in ErrorBoundary.tsx
- [ ] h1 uses constant via `style={GRADIENT_TEXT_STYLE}`
- [ ] Inline gradient block removed
- [ ] 1 new test assertion + existing 5 preserved
- [ ] `pnpm test --run frontend/src/components/__tests__/ErrorBoundary.test.tsx` passes 6/6

---

### Step 4: ChunkErrorBoundary chrome migration

**Objective:** Migrate ChunkErrorBoundary fallback to canonical Round 3 chrome — lucide RefreshCw icon, FrostedCard wrap, white-pill primary CTA Pattern 2, role="alert".

**Files to modify:**
- `frontend/src/components/ChunkErrorBoundary.tsx`

**Details:**

**Step 4a — Add lucide import:**

At the top of the file (alongside existing imports):

```tsx
import { RefreshCw } from 'lucide-react'
```

**Step 4b — Replace fallback content render:**

Current structure (verified at `ChunkErrorBoundary.tsx:36-71`):

```tsx
<Layout>
  <div className="flex min-h-[60vh] items-center justify-center px-6">
    <div className="max-w-md text-center">
      <svg
        className="mx-auto mb-6 h-12 w-12 text-primary/60"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="24" y1="8" x2="24" y2="40" />
        <line x1="14" y1="18" x2="34" y2="18" />
      </svg>
      <h1 className="mb-3 text-2xl font-bold text-white">
        Let&apos;s try that again
      </h1>
      <p className="mb-8 text-base text-white/70">
        Sometimes things don&apos;t load as expected. A quick refresh usually does the trick.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
      >
        Refresh Page
      </button>
    </div>
  </div>
</Layout>
```

Replace with:

```tsx
<Layout>
  <div className="flex min-h-[60vh] items-center justify-center px-4">
    <div
      role="alert"
      className="mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] text-center"
    >
      <RefreshCw className="mx-auto h-8 w-8 text-violet-300" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-white">
        Let&apos;s try that again
      </h1>
      <p className="mt-2 text-base text-white/70">
        Sometimes things don&apos;t load as expected. A quick refresh usually does the trick.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        Refresh Page
      </button>
    </div>
  </div>
</Layout>
```

The button class string is white-pill Pattern 2 verbatim from `09-design-system.md`. The container class string is FrostedCard tier 1 verbatim.

**Step 4c — Preserve selective propagation logic:**

The `getDerivedStateFromError` logic at `ChunkErrorBoundary.tsx:18-30` stays UNCHANGED. The `componentDidCatch` console.error stays UNCHANGED. Only the fallback render replaces.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): FrostedCard centered, max-w-md (384px), button uses `sm:text-lg` for larger emphasis.
- Tablet (768px): Same FrostedCard centered, button at `text-base` (still ≥`sm:` breakpoint, gets `sm:text-lg`).
- Mobile (375px): FrostedCard centered with `px-4` outer padding (24px less than the previous `px-6` to give the card more room). Button at `text-base` with `min-h-[44px]` touch target.

**Inline position expectations:** Vertical stack — RefreshCw icon → heading → body → button. No inline-row layouts.

**Guardrails (DO NOT):**
- DO NOT change the heading or body copy.
- DO NOT change `getDerivedStateFromError` propagation logic.
- DO NOT change `componentDidCatch` console.error.
- DO NOT remove the `<Layout>` wrap.
- DO NOT use `bg-primary` solid (deprecated per `09-design-system.md`).
- DO NOT use the legacy inline cross SVG — replaced with lucide RefreshCw which is semantically aligned with the action.
- DO NOT use `focus-visible:ring-offset-dashboard-dark` — should be `ring-offset-hero-bg` to match Layout's outer wrapper.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Fallback container has `role="alert"` | unit (NEW) | Trigger chunk error via `error.message="Failed to fetch dynamically imported module"`. Query `[role="alert"]` and assert it contains the heading text "Let's try that again". |
| Fallback uses canonical FrostedCard chrome | unit (NEW) | The role="alert" element className contains all of: `border-white/[0.12]`, `bg-white/[0.06]`, `rounded-2xl`, `backdrop-blur-sm`, `mx-auto max-w-md`. |
| Fallback uses RefreshCw lucide icon | unit (NEW) | Trigger chunk error. Query for the SVG with `aria-hidden="true"` inside the alert. Assert it has `lucide-refresh-cw` in className (lucide adds this) OR matches RefreshCw's specific path data. Robust check: assert there is exactly one SVG with `aria-hidden="true"` inside `[role="alert"]`. |
| Fallback button is canonical white-pill primary | unit (NEW) | Find the "Refresh Page" button. className contains all of: `bg-white`, `text-hero-bg`, `min-h-[44px]`, `rounded-full`, `px-8`, `py-3.5`. |
| Fallback button does NOT use `bg-primary` | unit (NEW) | className does NOT contain `bg-primary`. |
| Existing tests | regression | All 9 existing ChunkErrorBoundary tests preserved (selective propagation, copy assertions, refresh action, child render). |

**Expected state after completion:**
- [ ] `RefreshCw` imported from `lucide-react`
- [ ] Fallback wrapped in canonical FrostedCard with `role="alert"`
- [ ] White-pill Pattern 2 replaces `bg-primary` button
- [ ] Selective propagation logic byte-for-byte unchanged
- [ ] 5 new test assertions + existing 9 preserved
- [ ] `pnpm test --run frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx` passes 14/14

---

### Step 5: RouteErrorBoundary chrome migration + new test file

**Objective:** Migrate RouteErrorBoundary fallback to canonical chrome. White-pill peer-tier "Go Home", reconciled focus rings, role="alert", FrostedCard wrap. Create RouteErrorBoundary.test.tsx (does not currently exist).

**Files to modify:**
- `frontend/src/components/RouteErrorBoundary.tsx` — chrome migration
- `frontend/src/components/__tests__/RouteErrorBoundary.test.tsx` — NEW FILE

**Details:**

Current `RouteErrorFallback` structure (verified at `RouteErrorBoundary.tsx:6-36`):

```tsx
<Layout>
  <div className="flex min-h-[60vh] items-center justify-center px-6">
    <div className="max-w-md text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">
        This page couldn&apos;t load
      </h1>
      <p className="mb-6 text-base text-white/70">
        Try refreshing or going back to the home page.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Refresh
        </button>
        <Link
          to="/"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          Go Home
        </Link>
      </div>
    </div>
  </div>
</Layout>
```

Replace with:

```tsx
<Layout>
  <div className="flex min-h-[60vh] items-center justify-center px-4">
    <div
      role="alert"
      className="mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] text-center"
    >
      <h1 className="text-2xl font-bold text-white">
        This page couldn&apos;t load
      </h1>
      <p className="mt-2 text-base text-white/70">
        Try refreshing or going back to the home page.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          Refresh
        </button>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          Go Home
        </Link>
      </div>
    </div>
  </div>
</Layout>
```

Changes:
- Wrap content in FrostedCard tier 1 with `role="alert"`
- "Refresh" button: keep muted `bg-white/10` chrome (canonical) and reconcile focus ring to match "Go Home" (`ring-offset-2 ring-offset-hero-bg` added)
- "Go Home" link: `bg-primary` solid → quieted white-pill peer-tier (`px-6 py-2.5 text-sm` peer-sized, NOT full Pattern 2 — see hierarchy reasoning below)
- Both buttons get `min-h-[44px]` touch target
- Button row gap `gap-4` → `gap-3` (12px, matches preserved spacing in spec)

**Hierarchy note:** The "Go Home" button uses a quieted white-pill (`px-6 py-2.5 text-sm`) rather than full Pattern 2 (`px-8 py-3.5 text-base sm:text-lg`) because two showstopper-tier buttons side-by-side compete with each other. Same hierarchy reasoning as Spec 11c Decision 9.

**Step 5b — Create RouteErrorBoundary.test.tsx:**

New file at `frontend/src/components/__tests__/RouteErrorBoundary.test.tsx`. Use the same test pattern as `ChunkErrorBoundary.test.tsx` (mock Layout to passthrough, ThrowingChild trigger):

```tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RouteErrorBoundary } from '../RouteErrorBoundary'

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error
  return <div>child content</div>
}

function renderBoundary(child: React.ReactNode) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteErrorBoundary>{child}</RouteErrorBoundary>
    </MemoryRouter>,
  )
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    renderBoundary(<div>hello world</div>)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('shows error fallback with role="alert" when child throws', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('error fallback uses canonical FrostedCard chrome', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('border-white/[0.12]')
    expect(alert.className).toContain('bg-white/[0.06]')
    expect(alert.className).toContain('rounded-2xl')
    expect(alert.className).toContain('backdrop-blur-sm')
    expect(alert.className).toContain('mx-auto')
    expect(alert.className).toContain('max-w-md')
  })

  it('preserves heading copy', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
  })

  it('preserves body copy', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByText(/Try refreshing or going back/)).toBeInTheDocument()
  })

  it('Refresh button has min-h-[44px] and reconciled focus ring', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const refresh = screen.getByRole('button', { name: 'Refresh' })
    expect(refresh.className).toContain('min-h-[44px]')
    expect(refresh.className).toContain('ring-offset-hero-bg')
  })

  it('Go Home link is canonical white-pill peer-tier', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const goHome = screen.getByRole('link', { name: 'Go Home' })
    expect(goHome.className).toContain('bg-white')
    expect(goHome.className).toContain('text-hero-bg')
    expect(goHome.className).toContain('rounded-full')
    expect(goHome.className).toContain('min-h-[44px]')
  })

  it('Go Home link does NOT use deprecated bg-primary', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const goHome = screen.getByRole('link', { name: 'Go Home' })
    expect(goHome.className).not.toContain('bg-primary')
  })
})
```

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): FrostedCard centered max-w-md, two buttons side-by-side, total ~187px well within 320px usable width.
- Tablet (768px): Same.
- Mobile (375px): FrostedCard centered with `px-4` outer padding. Button row stays inline (~187px combined ≪ 320px usable). Both buttons `min-h-[44px]` touch target.

**Inline position expectations:**

| Element group | Elements | Expected alignment | Wrap tolerance |
|---|---|---|---|
| RouteErrorBoundary button row | "Refresh" button + "Go Home" link | Top-y values match within ±5px at 1440px, 768px, and 375px (both share `min-h-[44px]` + identical `inline-flex items-center justify-center` chrome) | No wrap at any breakpoint |

**Guardrails (DO NOT):**
- DO NOT change heading or body copy.
- DO NOT change route coverage in this step (Step 6 handles coverage).
- DO NOT remove the `<Layout>` wrap.
- DO NOT use full showstopper Pattern 2 sizing (`px-8 py-3.5 text-base sm:text-lg`) for "Go Home" — quieted peer-tier is intentional.
- DO NOT use `focus-visible:ring-primary` on either button — both reconcile to `focus-visible:ring-white/50` for consistency within the row.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| `renders children when no error occurs` | unit (NEW) | Mount with non-throwing child; assert child renders. |
| `shows error fallback with role="alert"` | unit (NEW) | Trigger error via ThrowingChild; assert `[role="alert"]` is in document. |
| `error fallback uses canonical FrostedCard chrome` | unit (NEW) | Assert role="alert" element has `border-white/[0.12]`, `bg-white/[0.06]`, `rounded-2xl`, `backdrop-blur-sm`, `mx-auto`, `max-w-md`. |
| `preserves heading copy` | unit (NEW) | Assert "This page couldn't load" present. |
| `preserves body copy` | unit (NEW) | Assert /Try refreshing or going back/ regex match. |
| `Refresh button has min-h-[44px] and reconciled focus ring` | unit (NEW) | Assert `min-h-[44px]` and `ring-offset-hero-bg` in Refresh button className. |
| `Go Home link is canonical white-pill peer-tier` | unit (NEW) | Assert `bg-white`, `text-hero-bg`, `rounded-full`, `min-h-[44px]` in Go Home link className. |
| `Go Home link does NOT use deprecated bg-primary` | unit (NEW) | Assert `bg-primary` NOT in className. |

**Expected state after completion:**
- [ ] FrostedCard wrap with `role="alert"` on RouteErrorBoundary fallback
- [ ] Refresh button focus ring reconciled (`ring-offset-hero-bg`)
- [ ] Go Home link migrated to white-pill peer-tier
- [ ] Heading + body copy preserved
- [ ] RouteErrorBoundary.test.tsx created with 8 tests
- [ ] `pnpm test --run frontend/src/components/__tests__/RouteErrorBoundary.test.tsx` passes 8/8

---

### Step 6: Extend RouteErrorBoundary to all uncovered routes in App.tsx

**Objective:** Wrap every route in App.tsx uniformly with `<RouteErrorBoundary>`. Currently ~16 routes wrap; ~25 don't. After Spec 12, all routes covered.

**Files to modify:**
- `frontend/src/App.tsx`

**Details:**

Current state — routes already wrapped (verified at `App.tsx:220-280`):

- `/` (RootRoute), `/insights`, `/friends`, `/settings`, `/my-prayers`, `/daily`, `/grow`
- `/bible`, `/bible/browse`, `/bible/my`, `/bible/plans`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`
- `/profile/:userId`, `/register`, `/community-guidelines`, `/terms-of-service`, `/privacy-policy`, `/accessibility`
- `/music`, `/prayer-wall`

Routes that need wrapping (verified by reading App.tsx lines 220-280):

| Line | Route | Element | Wrap action |
|---|---|---|---|
| 222 | `/health` | `<Health />` | Wrap in `<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><Health /></Suspense></RouteErrorBoundary>` |
| 224 | `/insights/monthly` | `<MonthlyReport />` | Wrap with RouteLoadingFallback Suspense |
| 229 | `/ask` | `<AskPage />` | Wrap with RouteLoadingFallback Suspense |
| 233 | `/reading-plans/:planId` | `<ReadingPlanDetail />` | Wrap with RouteLoadingFallback Suspense |
| 235 | `/challenges/:challengeId` | `<ChallengeDetail />` | Wrap with RouteLoadingFallback Suspense |
| 244 | `/bible/:book/:chapter` | `<BibleReader />` | Wrap with RouteLoadingFallback Suspense (BibleReader uses ReaderChrome internally; the RouteErrorBoundary fallback is Layout-wrapped; visual inconsistency in error state is acceptable — see edge case decision) |
| 248 | `/meditate/breathing` | `<BreathingExercise />` | Wrap with RouteLoadingFallback Suspense |
| 249 | `/meditate/soaking` | `<ScriptureSoaking />` | Wrap with RouteLoadingFallback Suspense |
| 250 | `/meditate/gratitude` | `<GratitudeReflection />` | Wrap with RouteLoadingFallback Suspense |
| 251 | `/meditate/acts` | `<ActsPrayerWalk />` | Wrap with RouteLoadingFallback Suspense |
| 252 | `/meditate/psalms` | `<PsalmReading />` | Wrap with RouteLoadingFallback Suspense |
| 253 | `/meditate/examen` | `<ExamenReflection />` | Wrap with RouteLoadingFallback Suspense |
| 254 | `/verse/:id` | `<SharedVerse />` | Wrap with RouteLoadingFallback Suspense |
| 255 | `/prayer/:id` | `<SharedPrayer />` | Wrap with RouteLoadingFallback Suspense |
| 261 | `/music/routines` | `<RoutinesPage />` | Wrap with RouteLoadingFallback Suspense |
| 264 | `/prayer-wall/dashboard` | `<PrayerWallDashboard />` | Wrap with RouteLoadingFallback Suspense |
| 265 | `/prayer-wall/user/:id` | `<PrayerWallProfile />` | Wrap with RouteLoadingFallback Suspense |
| 266 | `/prayer-wall/:id` | `<PrayerDetail />` | Wrap with RouteLoadingFallback Suspense |
| 267 | `/local-support/churches` | `<Churches />` | Wrap with RouteLoadingFallback Suspense |
| 268 | `/local-support/counselors` | `<Counselors />` | Wrap with RouteLoadingFallback Suspense |
| 270 | `/local-support/celebrate-recovery` | `<CelebrateRecovery />` | Wrap with RouteLoadingFallback Suspense |
| 272 | `/dev/mood-checkin` (dev-only) | `<MoodCheckInPreview />` | Wrap with RouteLoadingFallback Suspense |
| 280 | `*` (NotFound) | `<NotFound />` | Wrap (note: NotFound is NOT lazy — it's defined inline at App.tsx:120-142; wrap directly without Suspense, OR wrap with Suspense+fallback=null since the component is synchronously available) |

Routes that should remain unwrapped (Navigate redirects, no element to crash):

| Line | Route | Reason |
|---|---|---|
| 230 | `/devotional` | Navigate redirect — no element, can't crash |
| 232 | `/reading-plans` | Navigate redirect |
| 234 | `/challenges` | Navigate redirect |
| 243 | `/bible/search` | Redirect component (BibleSearchRedirect) |
| 245-247 | `/pray`, `/journal`, `/meditate` | Navigate redirects |
| 256 | `/scripture` | Navigate redirect |
| 258-260 | `/music/playlists`, `/music/ambient`, `/music/sleep` | Navigate redirects |
| 274 | `/login` | Navigate redirect (`/?auth=login`) |

The spec direction call says wrap `/login` for uniformity, but the verified production code (`App.tsx:274`) shows `/login` IS a Navigate redirect (`<Navigate to="/?auth=login" replace />`). Skip wrapping `/login` — Navigate redirects can't render-crash. If recon's "wrap /login anyway" direction was based on a stale assumption, the production verification trumps it.

**Implementation pattern — for each row in the wrap-action table above:**

Example transformation (line 222, `/health`):

Before:
```tsx
<Route path="/health" element={<Health />} />
```

After:
```tsx
<Route path="/health" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><Health /></Suspense></RouteErrorBoundary>} />
```

For NotFound (line 280) — special case because `NotFound` is NOT lazy:

Before:
```tsx
<Route path="*" element={<NotFound />} />
```

After:
```tsx
<Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
```

(No Suspense needed since NotFound is synchronously defined at App.tsx:120-142.)

**BibleReader special case** — wrapping it works because RouteErrorBoundary's fallback uses Layout (transparent navbar after Decision 4). Normal BibleReader uses ReaderChrome instead — the error fallback being inconsistent with normal page chrome is acceptable per direction call. Uniform error coverage > chrome continuity in error states.

**Auth gating:** N/A.

**Responsive behavior:** N/A — wrap doesn't change layout when no error fires.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the existing 16 wrapped routes — only ADD wraps to uncovered ones.
- DO NOT wrap Navigate redirects — they have no element to crash.
- DO NOT change Suspense fallback — `<RouteLoadingFallback />` stays as the loading fallback inside each new wrap.
- DO NOT change route paths or element components.
- DO NOT remove BibleReader from coverage (per direction call, despite chrome inconsistency).
- DO NOT add RouteErrorBoundary at the top level of App — it goes per-route.
- DO NOT wrap `/login` (production code already shows it's a Navigate redirect, not an element).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| `Music Routines route is wrapped in RouteErrorBoundary` | integration (NEW) | Mount App routed to `/music/routines`. Mock the RoutinesPage module to throw on render. Assert RouteErrorBoundary's fallback ("This page couldn't load") renders, NOT global ErrorBoundary's fallback ("Something went wrong"). |
| `BibleReader route is wrapped in RouteErrorBoundary` | integration (NEW) | Mount App routed to `/bible/genesis/1`. Mock BibleReader to throw. Assert "This page couldn't load" renders. |
| `NotFound route is wrapped in RouteErrorBoundary` | integration (NEW) | Mount App routed to `/some-nonexistent-route`. NotFound renders normally (no throw). Then trigger a synthetic error inside NotFound (mock the NotFound subtree to throw). Assert "This page couldn't load" renders. |
| `Meditate Breathing route is wrapped` | integration (NEW) | Mount App routed to `/meditate/breathing`. Mock BreathingExercise to throw. Assert "This page couldn't load" renders. |

These integration-style tests live at `frontend/src/__tests__/App-route-coverage.test.tsx` (new file). They verify wrap presence by behavior, which is more robust than introspecting route definitions.

**Expected state after completion:**
- [ ] All 22+ uncovered routes (excluding Navigate redirects) wrapped uniformly in RouteErrorBoundary
- [ ] BibleReader, NotFound, Meditate sub-pages, Music Routines all covered
- [ ] App-route-coverage.test.tsx created with 4 integration tests
- [ ] `pnpm test` baseline preserved (no new regressions)

---

### Step 7: RouteLoadingFallback bg fix

**Objective:** Migrate RouteLoadingFallback from `bg-dashboard-dark` to `bg-hero-bg` to match Layout outer wrapper.

**Files to modify:**
- `frontend/src/App.tsx` (RouteLoadingFallback function at lines 103-118)

**Details:**

Current at `App.tsx:103-118`:

```tsx
function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
      <span
        className={cn(
          'text-3xl font-script select-none',
          prefersReduced ? 'text-white/30' : 'animate-logo-pulse text-white/20'
        )}
      >
        Worship Room
      </span>
    </div>
  )
}
```

Change `bg-dashboard-dark` → `bg-hero-bg`:

```tsx
function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-bg">
      <span
        className={cn(
          'text-3xl font-script select-none',
          prefersReduced ? 'text-white/30' : 'animate-logo-pulse text-white/20'
        )}
      >
        Worship Room
      </span>
    </div>
  )
}
```

That is the entire change. Caveat wordmark + pulse animation preserved per Decision 1 + Decision 5.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): full-bleed `bg-hero-bg` (#08051A) — matches Layout outer wrapper visually so route transitions don't show a color flash.
- Tablet (768px): same.
- Mobile (375px): same.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT touch the wordmark (Decision 1 — Caveat preserved).
- DO NOT touch the pulse animation (Decision 1).
- DO NOT touch the prefers-reduced-motion check (existing motion-respect logic preserved).

**Test specifications:** No new tests needed (visual change only). Verify in `/verify-with-playwright` that the loading fallback color matches the Layout outer wrapper color so route transitions don't flash.

**Expected state after completion:**
- [ ] `bg-dashboard-dark` → `bg-hero-bg` at App.tsx:107
- [ ] Wordmark + animation unchanged

---

### Step 8: NotFound "Go Home" link migration

**Objective:** Migrate the NotFound page's "Go Home" link from `font-script text-2xl text-primary-lt` (Caveat styled CTA) to a plain text link.

**Files to modify:**
- `frontend/src/App.tsx` (NotFound function at lines 120-142)

**Details:**

Current NotFound at `App.tsx:132-137`:

```tsx
<Link
  to="/"
  className="font-script text-2xl text-primary-lt transition-colors hover:text-primary"
>
  Go Home
</Link>
```

Replace with:

```tsx
<Link
  to="/"
  className="text-base text-white/70 underline transition-colors hover:text-white"
>
  Go Home
</Link>
```

Changes:
- `font-script text-2xl text-primary-lt` → `text-base text-white/70` (regular Inter, base size, canonical text-on-dark opacity)
- `hover:text-primary` → `hover:text-white`
- Adds `underline` (canonical link affordance)
- `transition-colors` preserved

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): plain Inter text base size with white/70 + underline.
- Tablet (768px): same.
- Mobile (375px): same.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the link or change its destination (`/`).
- DO NOT remove the surrounding NotFound page chrome (h1 "Page Not Found", body copy, max-w-md).
- DO NOT add `font-bold` or other emphasis — plain link.
- DO NOT touch the SEO component or other surrounding chrome.

**Test specifications:**

If App.test.tsx or NotFound-specific tests exist, extend; otherwise add to `frontend/src/__tests__/App-route-coverage.test.tsx` (created in Step 6):

| Test | Type | Description |
|---|---|---|
| `NotFound Go Home link uses plain text chrome` | unit (NEW) | Mount App routed to `/nonexistent`. Find link by text "Go Home"; className contains `text-base` and `underline` and does NOT contain `font-script`. |
| `NotFound Go Home link still routes to /` | unit (NEW) | href attribute (or React Router `to` prop accessible via getAttribute) equals `/`. |

**Expected state after completion:**
- [ ] Caveat removed from NotFound link
- [ ] Plain text link with `underline` + `hover:text-white` transition
- [ ] 2 test assertions (in App-route-coverage.test.tsx)

---

### Step 9: Cosmetic index.html fixes + favicon.ico

**Objective:** Add favicon.ico to public/, mobile-web-app-capable meta tag, link rel=icon, color-scheme dark.

**Files to modify:**
- `frontend/index.html`
- `frontend/public/favicon.ico` — NEW FILE

**Details:**

**Step 9a — Generate favicon.ico:**

Derive from existing `frontend/public/icon-192.png` (4 KB, 192×192). Use one of:

- `imagemagick` (recommended for automation): `convert frontend/public/icon-192.png -define icon:auto-resize=64,48,32,16 frontend/public/favicon.ico`
- Online ICO converter (favicon.io, convertico.com) — manual upload of icon-192.png, download multi-resolution ICO
- Hand-author with `sharp` or `pngquant` if neither tool is available

Resulting file: `frontend/public/favicon.ico` (~5-10 KB, multi-resolution: 16, 32, 48, 64).

**Step 9b — Edit index.html:**

Current `frontend/index.html` (verified):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" data-rh="true" content="..." />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#08051A">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <!-- Preload comments -->
    <link rel="preload" as="font" type="font/woff2" crossorigin href="..." />
    <link rel="preload" as="font" type="font/woff2" crossorigin href="..." />
    <link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet" />
    <title>Worship Room</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Replace the `<head>` to add the four new lines (mobile-web-app-capable, color-scheme, link rel=icon, link rel=shortcut icon). Insertion points specified below.

After existing line 8 (`<meta name="apple-mobile-web-app-capable" content="yes">`), add the modern equivalent line:

```html
<meta name="mobile-web-app-capable" content="yes">
```

After existing line 10 (`<meta name="theme-color" content="#08051A">`), add color-scheme:

```html
<meta name="color-scheme" content="dark">
```

After existing line 7 (`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`), add the icon links:

```html
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="shortcut icon" href="/favicon.ico">
```

Final `<head>` order:

1. charset
2. viewport
3. description
4. apple-touch-icon (existing)
5. **NEW** link rel=icon 192
6. **NEW** link rel=icon 512
7. **NEW** link rel=shortcut icon
8. apple-mobile-web-app-capable (existing)
9. **NEW** mobile-web-app-capable
10. apple-mobile-web-app-status-bar-style (existing)
11. theme-color (existing)
12. **NEW** color-scheme
13. preconnect googleapis
14. preconnect gstatic
15. preload Inter
16. preload Lora
17. Google Fonts CSS link
18. title

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the existing `apple-mobile-web-app-capable` meta tag (still needed for iOS pre-Safari 16.4).
- DO NOT modify viewport, theme-color, or charset meta tags.
- DO NOT modify the Google Fonts links (Caveat must stay loaded per Decision 5).
- DO NOT touch vite-plugin-pwa configuration.
- DO NOT change the title.
- DO NOT remove the description data-rh="true" attribute (react-helmet ownership marker).

**Test specifications:** None — visual verification via DevTools in `/verify-with-playwright` Step (no favicon 404 in Console, no deprecation warning).

**Expected state after completion:**
- [ ] favicon.ico generated and saved to `frontend/public/`
- [ ] mobile-web-app-capable meta tag added
- [ ] color-scheme dark meta tag added
- [ ] link rel=icon (192px, 512px) declarations added
- [ ] link rel=shortcut icon added
- [ ] DevTools Network tab shows no `/favicon.ico` 404 on next dev-server load

---

### Step 10: useFaithPoints test fix

**Objective:** Update the `useFaithPoints` test to include the `intercession: false` field that production has been returning since spec-3-6 (commit e625a08).

**Files to modify:**
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts`

**Details:**

Locate the failing test at lines 96-100. Current expectation:

```tsx
expect(result.current.todayActivities).toEqual({
  mood: false, pray: false, listen: false,
  prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false,
  challenge: false, localVisit: false, devotional: false,
});
```

Add `intercession: false`:

```tsx
expect(result.current.todayActivities).toEqual({
  mood: false, pray: false, listen: false,
  prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false,
  challenge: false, localVisit: false, devotional: false,
  intercession: false,
});
```

That is the entire change. Production `freshDailyActivities` (at `services/faith-points-storage.ts:13-23`) is the canonical source of truth; the test was stale since spec-3-6 (Phase 3 Prayer Wall backend wave, commit e625a08, 2026-04-28).

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the production `freshDailyActivities` function — production is canonical.
- DO NOT remove or modify other test assertions in the same file.
- DO NOT change other tests in the unauthenticated describe block.

**Test specifications:** This IS the test fix. The fix itself updates the assertion.

**Expected state after completion:**
- [ ] `useFaithPoints — unauthenticated > returns default values when not authenticated` test passes
- [ ] Pre-existing failure resolved
- [ ] Total chrome-related test suite: 134 pass / 1 known fail (Navbar Prayer Wall — resolves after Step 1 Layout default flip propagates through `renderNavbar` in Navbar.test.tsx if applicable)
- [ ] `pnpm test --run frontend/src/hooks/__tests__/useFaithPoints.test.ts` passes 50/50

---

## Step Dependency Map

| Step | Depends on | Description |
|---|---|---|
| 1 | — | Layout transparentNav default flip + Layout.test.tsx update |
| 2 | — | SharedVerse + SharedPrayer error states `<Navbar transparent />` |
| 3 | — | ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE |
| 4 | — | ChunkErrorBoundary chrome migration |
| 5 | — | RouteErrorBoundary chrome migration + new test file |
| 6 | 5 (RouteErrorBoundary chrome must be canonical before extending coverage) | Wrap all uncovered routes in App.tsx |
| 7 | — | RouteLoadingFallback bg-dashboard-dark → bg-hero-bg |
| 8 | — | NotFound Go Home link migration |
| 9 | — | Cosmetic index.html fixes + favicon.ico |
| 10 | 1 (Layout default flip provides the test setup change for the Navbar Prayer Wall pre-existing fail to resolve naturally — though this step is independent of Step 1's production code) | useFaithPoints test fix |

**Suggested execution order (batched, per spec direction):**

1. **Pass 1 — Layout + Navbar prop migrations** (Steps 1, 2): one edit pass on Layout.tsx + 2 page edits + Layout.test.tsx update. Run `pnpm test --run frontend/src/components/__tests__/Layout.test.tsx frontend/src/components/__tests__/Navbar.test.tsx`.
2. **Pass 2 — Error boundary chrome** (Steps 3, 4, 5): three error-boundary file edits + 1 new test file. Run boundary tests (`pnpm test --run frontend/src/components/__tests__/ErrorBoundary.test.tsx frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx frontend/src/components/__tests__/RouteErrorBoundary.test.tsx`).
3. **Pass 3 — Route coverage extension** (Step 6): one App.tsx edit pass adding wraps. Run `pnpm test --run frontend/src/__tests__/App-route-coverage.test.tsx` + full `pnpm test` smoke.
4. **Pass 4 — Misc fixes** (Steps 7, 8): one App.tsx edit (RouteLoadingFallback bg + NotFound link).
5. **Pass 5 — Cosmetic + tests** (Steps 9, 10): index.html + favicon + useFaithPoints test fix.
6. **Pass 6 — Full regression**: `pnpm test`. Confirm baseline 9,470+ pass / 0 known pre-existing fails (Step 1 resolves Navbar Prayer Wall, Step 10 resolves useFaithPoints).

---

## Pre-MR Checklist (per spec)

Before opening MR (when Eric is ready to commit):

- [ ] `pnpm test` — full suite passes; baseline 9,470+ pass / 0 known pre-existing fails
- [ ] `pnpm tsc --noEmit -p tsconfig.json` — clean
- [ ] `pnpm lint` — clean
- [ ] Visual verification at desktop 1280px on:
  - `/music/routines` — navbar wordmark white Caveat, nav links readable, no opaque-mode chrome
  - One Meditate sub-page (e.g., `/meditate/breathing`) — navbar transparent
  - `/privacy-policy` — navbar transparent
  - `/some-nonexistent-route` (NotFound) — Go Home link plain text + underline
  - `/health` — navbar transparent
- [ ] DevTools Console — no favicon 404
- [ ] DevTools Network tab — no `/favicon.ico` 404
- [ ] Trigger ChunkErrorBoundary fallback (mock chunk-load error) — visual check: FrostedCard, RefreshCw icon, white-pill button
- [ ] Trigger RouteErrorBoundary fallback (mock render error in any route) — visual check: FrostedCard, white-pill peer-tier "Go Home", reconciled focus rings, ±5px y-coordinate alignment between Refresh + Go Home
- [ ] Reduced-motion verification (browser prefers-reduced-motion: reduce) — confirm no animation regressions on RouteLoadingFallback or boundaries

---

## Out-of-Scope Reminder

- SiteFooter wordmark (Caveat preserved per Decision 1)
- SiteFooter footer-link tightening (separate concern)
- Daily Hub HorizonGlow (Daily Hub-only)
- BibleReader ReaderChrome (documented exception)
- Audio engine, AudioProvider, audioReducer (Decision 24 still applies)
- RoutinesPage post-11c content (transitive consequence only)
- Caveat usage in StartingPointQuiz, GuidedPrayerPlayer, WelcomeWizard (deferred — non-chrome surfaces)
- MobileDrawer aria-modal promotion (deferred)
- Sentry frontend integration (deferred per spec 1.10d-bis)
- PageError primitive (deferred)
- ChunkErrorBoundary catch-pattern extension (current 4 patterns sufficient)
- Active-link underline polish (preserved per Decision 3)
- SharedVerse/SharedPrayer error state `bg-neutral-bg` + `text-text-dark` legacy chrome migration (separate drift, surgical scope preserved)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Layout transparentNav default flip + test update | [COMPLETE] | 2026-05-07 | Layout.tsx + Layout.test.tsx; Navbar.test.tsx active-link test updated to render transparent directly |
| 2 | SharedVerse + SharedPrayer Navbar transparent migration | [COMPLETE] | 2026-05-07 | SharedVerse.tsx + SharedPrayer.tsx error-state Navbar |
| 3 | ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE | [COMPLETE] | 2026-05-07 | ErrorBoundary.tsx + ErrorBoundary.test.tsx |
| 4 | ChunkErrorBoundary chrome migration | [COMPLETE] | 2026-05-07 | ChunkErrorBoundary.tsx + ChunkErrorBoundary.test.tsx (4 new tests) |
| 5 | RouteErrorBoundary chrome migration + new test file | [COMPLETE] | 2026-05-07 | RouteErrorBoundary.tsx + RouteErrorBoundary.test.tsx (8 tests) |
| 6 | Extend RouteErrorBoundary to all uncovered routes | [COMPLETE] | 2026-05-07 | App.tsx (22+ routes wrapped) + App-route-coverage.test.tsx (4 tests) |
| 7 | RouteLoadingFallback bg fix | [COMPLETE] | 2026-05-07 | App.tsx line ~107 bg-dashboard-dark → bg-hero-bg |
| 8 | NotFound Go Home link migration | [COMPLETE] | 2026-05-07 | App.tsx NotFound inline; App-route-coverage.test.tsx (2 tests) |
| 9 | Cosmetic index.html fixes + favicon.ico | [COMPLETE] | 2026-05-07 | frontend/index.html (4 tags added); frontend/public/favicon.ico (generated via Python+sips — imagemagick unavailable) |
| 10 | useFaithPoints test fix | [COMPLETE] | 2026-05-07 | useFaithPoints.test.ts line 99 — added intercession: false |
| 11 | Code-review follow-up: PageShell.tsx Navbar transparent + button consistency | [COMPLETE] | 2026-05-07 | `frontend/src/components/prayer-wall/PageShell.tsx` — `<Navbar />` → `<Navbar transparent />` (Decision 4 gap; recon's `grep '<Navbar />'` only scanned `frontend/src/pages` and missed PageShell, which is the production chrome for `/prayer-wall/dashboard`, `/prayer-wall/user/:id`, and `/prayer-wall/:id`). Also reconciled the two new error-boundary buttons with the post-BB-33 button pattern: `duration-200` → `duration-base`, added `motion-reduce:transition-none` and `active:scale-[0.98]` to align with `ErrorBoundary`'s primary button. Removed a stale `ChunkErrorBoundary` test (`error fallback shows cross branding icon` — the icon is no longer a cross, and the assertion was duplicated by the more specific RefreshCw test added in Step 4). |
