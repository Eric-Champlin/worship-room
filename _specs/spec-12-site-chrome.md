# Spec 12 — Site Chrome (Opaque-Mode Elimination + Error Boundary Migration + Cosmetic Cleanup)

**Branch:** `forums-wave-continued`
**Posture:** Bug-fix and drift cleanup. Mostly mechanical changes locked by direction.
**Direction doc:** locked in chat — recap in Section "Direction summary" below.
**Recon:** `_plans/recon/site-chrome-2026-05-07.md`

---

## Problem statement

Site chrome (Navbar, error boundaries, index.html, RouteLoadingFallback) accumulated drift across the visual rollout. Recon identified one accessibility bug, several deprecated-pattern survivors, one stale test, and missing PWA assets.

The biggest single issue: **~12 production pages render the Navbar in opaque mode**, which uses `text-text-dark` (#2C3E50, a light-theme color) for inactive nav links over a dark frosted backdrop. Contrast ratio ~1.5-2:1 — fails WCAG AA. Inactive nav links are nearly invisible until hover.

Pages affected: RoutinesPage, all 6 Meditate sub-pages, ReadingPlanDetail, Health, Privacy, Terms, Community Guidelines, Accessibility, plus error fallback chrome (ChunkErrorBoundary, RouteErrorBoundary).

Spec 12 is mostly bug fixes. ~90% bug-fix and drift cleanup, ~10% polish.

---

## Direction summary (locked)

Numbered decisions from chat, copied here for execution reference:

1. **Worship Room wordmark stays Caveat** on Navbar AND SiteFooter AND RouteLoadingFallback. Color, size, animation preserved.
2. **NotFound "Go Home" link migrates from Caveat to plain text link** (it's a CTA, not branding).
3. **Active-link underline stays as-is** (8px gap, grow-from-center animation preserved).
4. **Eliminate opaque mode**. Layout default flips to `transparentNav = true`. Navbar's opaque-mode code path stays in codebase as defensive fallback but no production page uses it.
5. **Caveat font stays loaded** in Google Fonts (still used by wordmark + RouteLoadingFallback).
6. **ChunkErrorBoundary chrome migration**: white-pill primary CTA, lucide RefreshCw icon, FrostedCard wrap, role="alert".
7. **RouteErrorBoundary chrome migration**: white-pill "Go Home", reconcile focus ring, role="alert".
8. **ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE constant**.
9. **Extend RouteErrorBoundary to all uncovered routes**.
10. **RouteLoadingFallback bg**: `bg-dashboard-dark` → `bg-hero-bg`.
11. **Cosmetic index.html fixes**: favicon.ico, mobile-web-app-capable, link rel=icon, color-scheme dark.
12. **Test fixes**: `useFaithPoints` add `intercession: false`. Navbar Prayer Wall fixes naturally via Decision 4.

---

## Affected frontend routes

This spec affects EVERY route in the app via the Layout default change (Decision 4). Direct-Navbar pages (Home, Dashboard, DailyHub, BibleLanding, MusicPage, etc.) are unaffected because they pass `transparent` explicitly.

Pages whose navbar mode CHANGES (opaque → transparent):
- `/music/routines`
- `/health`
- `/reading-plans/*`
- `/community-guidelines`, `/terms-of-service`, `/privacy-policy`, `/accessibility`
- `/meditate/*` (6 sub-pages)
- ChunkErrorBoundary + RouteErrorBoundary fallback chrome
- `/404` (NotFound) — also gets the link migration from Decision 2

Pages whose error-fallback coverage CHANGES (uncovered → wrapped in RouteErrorBoundary):
- `/music`, `/music/playlists`, `/music/ambient`, `/music/sleep`, `/music/routines`
- `/bible/*` (multiple — all currently uncovered)
- `/meditate/*` (6 sub-pages)
- `/health`, `/insights/monthly`, `/ask`
- `/reading-plans/*`, `/challenges/*`
- `/verse/:id`, `/prayer/:id`, `/scripture`
- `/local-support/*`
- `/dev/mood-checkin`, `/login`, `/bible/search`, `/bible/:book/:chapter`
- `*` (NotFound)

---

## Architecture context

### Files this spec touches (production)

- `frontend/src/components/Layout.tsx` — Decision 4 default flip
- `frontend/src/components/Navbar.tsx` — minor (no chrome changes; only `<Navbar />` no-prop usages on SharedVerse/SharedPrayer error states get explicit `transparent`)
- `frontend/src/components/ErrorBoundary.tsx` — Decision 8 (inline gradient → GRADIENT_TEXT_STYLE)
- `frontend/src/components/ChunkErrorBoundary.tsx` — Decision 6 (full chrome migration)
- `frontend/src/components/RouteErrorBoundary.tsx` — Decision 7 (full chrome migration)
- `frontend/src/App.tsx` — Decision 9 (wrap uncovered routes), Decision 10 (RouteLoadingFallback bg fix), Decision 2 (NotFound "Go Home" link)
- `frontend/src/pages/SharedVerse.tsx` — `<Navbar />` → `<Navbar transparent />` in error state
- `frontend/src/pages/SharedPrayer.tsx` — `<Navbar />` → `<Navbar transparent />` in error state
- `frontend/index.html` — Decision 11 (cosmetic meta + link tags)
- `frontend/public/favicon.ico` — Decision 11 (new file)

### Files this spec touches (tests)

- `frontend/src/hooks/__tests__/useFaithPoints.test.ts` — Decision 12 (add `intercession: false`)
- `frontend/src/components/__tests__/Layout.test.tsx` — update default-mode tests to reflect transparentNav default
- `frontend/src/components/__tests__/Navbar.test.tsx` — Prayer Wall test passes naturally; verify no other regression
- `frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx` — extend (white-pill chrome assertions, role="alert")
- `frontend/src/components/__tests__/RouteErrorBoundary.test.tsx` — extend if exists; create if absent
- `frontend/src/components/__tests__/ErrorBoundary.test.tsx` — verify GRADIENT_TEXT_STYLE migration doesn't regress
- `frontend/src/__tests__/App.test.tsx` (or wherever route-wrapping is tested) — verify uncovered routes now wrap correctly

### Files this spec does NOT touch

- `frontend/src/components/SiteFooter.tsx` — wordmark stays Caveat; footer-link tightening is separate concern
- `frontend/src/components/MobileDrawer.tsx` — aria-modal stays as-is per Decision 11 (deferred from spec)
- `frontend/src/components/BibleReader/*` — documented exception per 09-design-system.md
- All page-level content (heroes, cards, sections) — chrome-only spec
- `AudioProvider.tsx` / `audioReducer.ts` / `audio-engine.ts` — Decision 24 from music cluster still applies
- `frontend/src/pages/RoutinesPage.tsx` — post-11c chrome preserved; transitive consequence only (the navbar mode flips, not the page content)

### Patterns to follow

- **White-pill primary CTA Pattern 2** — verbatim class string from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. Used for ChunkErrorBoundary + RouteErrorBoundary primary actions.
- **FrostedCard tier 1** — `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6` plus dual box-shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`. Used for ChunkErrorBoundary fallback content wrap.
- **GRADIENT_TEXT_STYLE constant** — at `frontend/src/constants/gradients.tsx`. Replaces ErrorBoundary inline gradient.
- **role="alert" on error fallback containers** — ErrorBoundary already has it; Chunk + Route migrate to match.
- **Layout transparentNav** — Layout already supports `transparentNav` prop; Decision 4 just flips its default to `true`.

### Critical pre-execution recon notes

- **Layout transparentNav default flip is the load-bearing change.** All ~12 pages currently using `<Layout>` default automatically migrate to transparent navbar. No per-page edit needed.
- **`<Navbar />` (no prop) usages.** Two pages mount `<Navbar />` directly without going through Layout: SharedVerse error state, SharedPrayer error state. These need explicit `<Navbar transparent />` since Decision 4 only changes Layout's default, not the Navbar component's default. Verify locations during execution.
- **RouteLoadingFallback** uses `bg-dashboard-dark`. Other Layout-wrapped surfaces use `bg-hero-bg`. Decision 10 aligns to `bg-hero-bg`.
- **ChunkErrorBoundary's selective propagation logic** (catches 4 specific error patterns, propagates others to outer ErrorBoundary) — preserved per recon Section D.2. Spec 12 only touches chrome, not propagation behavior.
- **ChunkErrorBoundary wraps in `<Layout>`** — preserved. After Decision 4 lands, Layout's default transparent navbar shows; Spec 12 touches the inner content (button chrome, FrostedCard wrap, role).
- **RouteErrorBoundary wraps in `<Layout>`** — same as above.
- **NotFound page uses `<Layout>` default + Caveat "Go Home" link.** Decision 2 migrates the link to plain text. Layout's default flip (Decision 4) applies transitively.
- **Pre-existing test failures.** Decision 12 fixes the useFaithPoints failure (test update). Navbar Prayer Wall test failure resolves naturally because Decision 4 makes `<Navbar />` no-prop default = transparent, which renders `text-white` for active links, matching the test's existing assertion.

---

## Auth gating checklist

Spec 12 introduces NO new auth gates. Existing gates preserved through chrome-only edits:

| Action | Auth required | Path |
|---|---|---|
| Tap "Log In" in Navbar | NO | `useAuthModal.openAuthModal('login')` |
| Tap "Get Started" in Navbar | NO | `<Link to="/register">` direct nav |
| Tap "Refresh" on any error boundary | NO | `window.location.reload()` |
| Tap "Go Home" on RouteErrorBoundary | NO | `<Link to="/">` direct nav |
| Tap NotFound "Go Home" link | NO | direct nav |

---

## Design system values

| Component | Property | Value | Source |
|---|---|---|---|
| Layout transparentNav default | prop default | `true` (was `false`) | Decision 4 |
| `<Navbar />` no-prop fallback | (DEFENSIVE — not used in production after Spec 12) | preserved as-is | Decision 4 codebase guard |
| ChunkErrorBoundary outer wrap | `<Layout>` (renders transparent navbar via new default) | NEW | Decision 4 |
| ChunkErrorBoundary fallback content wrap | `mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` + `role="alert"` | FrostedCard tier 1 |
| ChunkErrorBoundary icon | `<RefreshCw className="h-8 w-8 text-violet-300" aria-hidden="true" />` (replaces inline cross SVG) | lucide-react |
| ChunkErrorBoundary heading | `<h1 className="mt-4 text-2xl font-bold text-white">Let's try that again</h1>` (preserved copy) | Existing |
| ChunkErrorBoundary body | `<p className="mt-2 text-base text-white/70">Sometimes things don't load as expected. A quick refresh usually does the trick.</p>` (preserved copy) | Existing |
| ChunkErrorBoundary "Refresh Page" button | Pattern 2 verbatim (see "Patterns to follow") | 09-design-system.md |
| RouteErrorBoundary outer wrap | `<Layout>` (renders transparent navbar via new default) | Decision 4 |
| RouteErrorBoundary fallback content wrap | `mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` + `role="alert"` | FrostedCard tier 1 |
| RouteErrorBoundary heading | `<h1 className="text-2xl font-bold text-white">This page couldn't load</h1>` (preserved copy) | Existing |
| RouteErrorBoundary body | `<p className="mt-2 text-base text-white/70">Try refreshing or going back to the home page.</p>` (preserved copy) | Existing |
| RouteErrorBoundary "Refresh" button | `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Muted-active tier; focus ring reconciled to match "Go Home" |
| RouteErrorBoundary "Go Home" button | Pattern 2 verbatim (was deprecated `bg-primary` solid) | 09-design-system.md |
| ErrorBoundary heading style | `style={GRADIENT_TEXT_STYLE}` (replaces inline `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)`) | constants/gradients.tsx |
| RouteLoadingFallback bg | `bg-hero-bg` (was `bg-dashboard-dark`) | Decision 10 |
| NotFound "Go Home" link | `text-base text-white/70 hover:text-white underline transition-colors` (was `font-script text-2xl text-primary-lt`) | Decision 2 |
| favicon.ico | new file in `public/` (32×32 multi-res ICO derived from icon-192.png) | Decision 11 |
| index.html `<link rel="icon">` | `<link rel="icon" type="image/png" href="/icon-192.png">` | Decision 11 |
| index.html `mobile-web-app-capable` | `<meta name="mobile-web-app-capable" content="yes">` (paired with existing apple-prefixed tag) | Decision 11 |
| index.html `color-scheme` | `<meta name="color-scheme" content="dark">` | Decision 11 |

---

## Design system reminder

- **DO NOT migrate the Worship Room wordmark.** Caveat font, size, and color are preserved per Decision 1.
- **DO NOT change the active-link underline.** 8px gap and grow-from-center animation preserved per Decision 3.
- **DO NOT remove Caveat from Google Fonts.** Still loaded for wordmark + RouteLoadingFallback per Decision 5.
- **DO NOT touch SiteFooter.** Footer wordmark stays Caveat. Footer-link tightening is a separate concern.
- **DO NOT touch BibleReader.** Documented exception per 09-design-system.md § Layout Exception.
- **DO NOT touch Daily Hub HorizonGlow.** Daily Hub-only chrome primitive.
- **DO NOT modify ChunkErrorBoundary's selective propagation logic.** Only chrome migrates.
- **DO NOT touch audio engine.** Decision 24 from music cluster still applies.
- **DO NOT touch RoutinesPage post-11c content.** Transitive navbar consequence only.
- **DO NOT add MobileDrawer aria-modal.** Deferred per direction.
- **DO NOT add Sentry frontend integration.** Stays deferred per spec 1.10d-bis.
- **DO NOT ship PageError primitive.** Stays deferred.
- **DO NOT extend ChunkErrorBoundary's catch patterns.** Current 4 patterns are sufficient.

---

## Responsive structure

- **Desktop (≥1024px):** Navbar transparent mode renders identically across all pages. Wordmark white Caveat. Nav links text + active underline. Right cluster auth/avatar.
- **Tablet (768–1024px):** Same as desktop but icon-only nav links. Existing canonical pattern preserved.
- **Mobile (<768px):** Hamburger + MobileDrawer. Drawer chrome unchanged.

Error boundary fallbacks use `mx-auto max-w-md` so they center at all breakpoints inside Layout's content area.

---

## Inline element position expectations

Spec 12 makes no inline-row layout changes. All chrome elements maintain their existing positions. The only structural change is FrostedCard wrap on ChunkErrorBoundary + RouteErrorBoundary fallback content — which centers the content via `mx-auto max-w-md` rather than the current full-width-text layout.

---

## Vertical rhythm

| From → To | Expected gap | Source |
|---|---|---|
| ChunkErrorBoundary icon → heading | `mt-4` (16px) | NEW |
| ChunkErrorBoundary heading → body | `mt-2` (8px) | Preserved |
| ChunkErrorBoundary body → button | `mt-6` (24px) | Preserved |
| RouteErrorBoundary heading → body | `mt-2` (8px) | Preserved |
| RouteErrorBoundary body → button row | `mt-6` (24px) | Preserved |
| RouteErrorBoundary button row internal gap | `gap-3` (12px) between Refresh + Go Home | Preserved |

---

## Assumptions & pre-execution checklist

Before executing this plan, confirm:

- [ ] Spec 11A + 11B + 11c shipped (verify via `git log --oneline | head -20`)
- [ ] `forums-wave-continued` branch active
- [ ] No uncommitted changes in working tree
- [ ] `pnpm test` baseline: 9,470+ pass / 2 known pre-existing fails (useFaithPoints intercession + Navbar Prayer Wall)
- [ ] `RefreshCw` icon exists in lucide-react (verify import resolves cleanly)
- [ ] `GRADIENT_TEXT_STYLE` exported from `constants/gradients.tsx` (verify)
- [ ] `bg-hero-bg` token defined in tailwind config (verify)
- [ ] `Layout.tsx` has `transparentNav` prop already (verified in recon — flip default only)
- [ ] No new dependencies needed
- [ ] favicon.ico generation tool available (online ICO converter or `imagemagick` for the build step)

---

## Edge cases & decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page using `<Layout transparentNav>` explicitly | Continues to render transparent (no change) | Default flip doesn't affect explicit prop usage |
| Page using `<Layout transparentNav={false}>` explicitly | Continues to render opaque (defensive) | If a page intentionally wants opaque, explicit prop wins. Recon found ZERO such pages, but the code path stays |
| Page using `<Navbar />` directly (no prop, no Layout) | SharedVerse + SharedPrayer error states migrate to `<Navbar transparent />` | Decision 4 only flips Layout default; direct Navbar usage needs explicit prop |
| Render-crash on a route now wrapped in RouteErrorBoundary | Shows warm "couldn't load" fallback in canonical FrostedCard with white-pill "Go Home" | Decision 9 + Decision 7 |
| Render-crash on a route NOT yet wrapped (after Spec 12) | NONE — Decision 9 wraps all routes uniformly | After Spec 12, all routes covered |
| ChunkErrorBoundary selective propagation | Preserved | Out of scope per "DO NOT modify selective propagation" |
| User on a route, backend down, then chunk-load fails | Same as before — chunk error boundary fires; backend status irrelevant | Chunk errors are independent of backend |
| favicon.ico request | Returns 32×32 multi-res ICO | Browsers probe regardless of manifest |
| User with prefers-reduced-motion | RouteLoadingFallback pulse respected via existing `prefersReduced` check (preserved) | No new motion |

---

## Implementation steps

### Step 1: Layout transparentNav default flip

**Objective:** Flip `Layout`'s `transparentNav` default from `false` to `true`. Eliminates opaque mode on ~12 production pages without per-page edits.

**Files to modify:**
- `frontend/src/components/Layout.tsx`

**Details:**

Locate the Layout function signature. Currently:

```tsx
export function Layout({ children, hero, transparentNav = false }: LayoutProps) {
```

Change to:

```tsx
export function Layout({ children, hero, transparentNav = true }: LayoutProps) {
```

That's the entire production change for this step.

**Auth gating:** N/A.

**Responsive behavior:** Same at all breakpoints — navbar transparent mode is the canonical Round 3 chrome.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the `transparentNav` prop entirely. The prop stays so a page can explicitly opt out via `<Layout transparentNav={false}>` (defensive — recon found zero current consumers but the code path stays).
- DO NOT remove Navbar's opaque-mode rendering code. Stays as defensive fallback.
- DO NOT touch any page that mounts `<Layout>` — they automatically inherit the new default.

**Test specifications (Layout.test.tsx):**

Update existing tests that assume `<Layout>` (no prop) renders opaque:

| Test | Type | Description |
|---|---|---|
| Layout default renders transparent navbar | unit | Mount `<Layout>{...}</Layout>` (no prop). Find the Navbar element; assert it received `transparent={true}` (or query for transparent-mode class names). |
| Layout transparentNav={false} renders opaque navbar | unit | Mount `<Layout transparentNav={false}>{...}</Layout>`. Assert navbar opaque. (Defensive; verifies prop still works.) |
| Existing test "Layout renders Navbar" | regression | Existing assertion preserved. |
| Existing test "Layout renders SiteFooter" | regression | Existing assertion preserved. |
| Existing test "main has id='main-content'" | regression | Existing assertion preserved. |

Re-read existing Layout.test.tsx assertions and update any that explicitly assume opaque-mode rendering.

**Expected state after completion:**
- [ ] `transparentNav = true` default in Layout signature
- [ ] All existing Layout tests pass (with updates if needed)
- [ ] 1 new test verifying default-mode is transparent

---

### Step 2: Migrate `<Navbar />` no-prop usages on error pages

**Objective:** Two pages (SharedVerse, SharedPrayer) mount `<Navbar />` directly without Layout in error states. These bypass Decision 4. Migrate to explicit `<Navbar transparent />`.

**Files to modify:**
- `frontend/src/pages/SharedVerse.tsx`
- `frontend/src/pages/SharedPrayer.tsx`

**Details:**

In each file, locate the error-state JSX that mounts `<Navbar />` (no prop). Read the file to confirm location — recon noted "SharedVerse error, SharedPrayer error" but exact line numbers not captured.

Replace:

```tsx
<Navbar />
```

With:

```tsx
<Navbar transparent />
```

These are the ONLY production usages of `<Navbar />` (no prop, no Layout). All other Navbar mounts go through Layout (which now defaults transparent) or explicitly pass `transparent`.

**Auth gating:** N/A.

**Responsive behavior:** Same as Layout default flip — transparent across all breakpoints.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT touch the success-state JSX in either file (they likely use `<Layout>` or transparent direct mount already — verify).
- DO NOT modify error-state copy or structure.

**Test specifications:** No new tests required. Existing SharedVerse / SharedPrayer tests cover error rendering; verify they still pass after the prop change.

**Expected state after completion:**
- [ ] SharedVerse error state mounts `<Navbar transparent />`
- [ ] SharedPrayer error state mounts `<Navbar transparent />`
- [ ] No other `<Navbar />` no-prop usages remain in production code (verify via grep)

---

### Step 3: ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE constant

**Objective:** Migrate the ErrorBoundary fallback h1 from inline gradient to canonical GRADIENT_TEXT_STYLE constant.

**Files to modify:**
- `frontend/src/components/ErrorBoundary.tsx`

**Details:**

Currently the h1 uses:

```tsx
<h1
  className="text-3xl sm:text-4xl font-bold leading-tight"
  style={{
    backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
  }}
>
  Something went wrong
</h1>
```

Replace with:

```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

// ... in JSX:
<h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={GRADIENT_TEXT_STYLE}>
  Something went wrong
</h1>
```

Add the import at the top of the file. The inline gradient direction (135deg) and color stops (#ffffff → #c4b5fd) are subtly different from GRADIENT_TEXT_STYLE — direction phase locked the migration anyway for consistency. Visual review during verify-with-playwright will confirm acceptable.

**Auth gating:** N/A.

**Responsive behavior:** Same — gradient renders at all breakpoints.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change the h1 size, weight, leading, or copy.
- DO NOT change the surrounding card chrome.

**Test specifications (ErrorBoundary.test.tsx):**

| Test | Type | Description |
|---|---|---|
| ErrorBoundary fallback h1 uses GRADIENT_TEXT_STYLE | unit | When boundary catches, find the h1 by text "Something went wrong"; assert `style.backgroundImage` matches the GRADIENT_TEXT_STYLE constant value (or assert it does NOT contain the old `linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)` string). |

Existing 5 ErrorBoundary tests preserved.

**Expected state after completion:**
- [ ] GRADIENT_TEXT_STYLE imported in ErrorBoundary.tsx
- [ ] h1 uses constant
- [ ] Inline gradient removed
- [ ] 1 new test assertion + existing 5 preserved

---

### Step 4: ChunkErrorBoundary chrome migration

**Objective:** Migrate ChunkErrorBoundary fallback to canonical Round 3 chrome: lucide RefreshCw icon, FrostedCard wrap, white-pill primary CTA, role="alert".

**Files to modify:**
- `frontend/src/components/ChunkErrorBoundary.tsx`

**Details:**

Read the current fallback render block. It currently uses:
- Custom inline cross SVG (`<svg>...</svg>`) → REPLACE with `<RefreshCw>` from lucide-react
- Bare h1 + p layout → WRAP in FrostedCard
- `bg-primary` solid button → REPLACE with white-pill primary CTA Pattern 2
- No role="alert" on container → ADD

**Step 4a — Add imports:**

```tsx
import { RefreshCw } from 'lucide-react'
```

**Step 4b — Replace fallback content render:**

Current structure (approximate, verify against actual file):

```tsx
<Layout>
  <div className="flex flex-col items-center text-center pt-32 pb-8">
    <svg /* inline cross SVG */>...</svg>
    <h1 className="text-2xl font-bold text-white mt-4">Let's try that again</h1>
    <p className="mt-2 text-base text-white/70 max-w-md">
      Sometimes things don't load as expected. A quick refresh usually does the trick.
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-6 rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-primary-lt"
    >
      Refresh Page
    </button>
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
        Let's try that again
      </h1>
      <p className="mt-2 text-base text-white/70">
        Sometimes things don't load as expected. A quick refresh usually does the trick.
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

The button class string is white-pill Pattern 2 verbatim from 09-design-system.md.

**Step 4c — Preserve selective propagation logic:**

The `getDerivedStateFromError` logic that catches only chunk-load errors stays UNCHANGED. Only the fallback render changes.

**Auth gating:** N/A.

**Responsive behavior:** FrostedCard wrap with `mx-auto max-w-md` centers content at all breakpoints. `min-h-[60vh]` ensures vertical centering inside Layout's main area.

**Inline position expectations:** Icon → heading → body → button vertical stack, centered.

**Guardrails (DO NOT):**
- DO NOT change the heading or body copy.
- DO NOT change `getDerivedStateFromError` propagation logic.
- DO NOT change `componentDidCatch` console.error.
- DO NOT remove the `<Layout>` wrap.

**Test specifications (ChunkErrorBoundary.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Fallback container has role="alert" | unit | Trigger chunk error. Query `[role="alert"]` and assert it contains the heading text. |
| Fallback uses canonical FrostedCard chrome | unit | The role="alert" element className contains `border-white/[0.12]` AND `bg-white/[0.06]` AND `rounded-2xl`. |
| Fallback uses RefreshCw lucide icon | unit | Trigger chunk error. Query for an SVG with `aria-hidden="true"` inside the alert. The SVG is the lucide RefreshCw (verify via class name or DOM structure). |
| Fallback button is canonical white-pill primary | unit | Find the "Refresh Page" button. className contains `bg-white` AND `text-hero-bg` AND `min-h-[44px]` AND `rounded-full`. |
| Fallback button does NOT use bg-primary | unit | className does NOT contain `bg-primary`. |

Existing 9 ChunkErrorBoundary tests preserved (selective propagation tests, etc.).

**Expected state after completion:**
- [ ] RefreshCw imported from lucide-react
- [ ] Fallback wrapped in canonical FrostedCard
- [ ] role="alert" on fallback container
- [ ] White-pill primary CTA replaces bg-primary button
- [ ] Selective propagation logic unchanged
- [ ] 5 new test assertions + existing 9 preserved

---

### Step 5: RouteErrorBoundary chrome migration

**Objective:** Migrate RouteErrorBoundary fallback to canonical chrome. White-pill "Go Home", reconcile focus rings, role="alert", FrostedCard wrap.

**Files to modify:**
- `frontend/src/components/RouteErrorBoundary.tsx`

**Details:**

Current `RouteErrorFallback` structure (approximate, verify):

```tsx
<Layout>
  <div className="flex flex-col items-center text-center pt-32 pb-8">
    <h1 className="text-2xl font-bold text-white">This page couldn't load</h1>
    <p className="mt-2 text-base text-white/70 max-w-md">
      Try refreshing or going back to the home page.
    </p>
    <div className="mt-6 flex gap-3">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        Refresh
      </button>
      <Link
        to="/"
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        Go Home
      </Link>
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
        This page couldn't load
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
- Wrap content in FrostedCard with `role="alert"`
- "Refresh" button: keep muted `bg-white/10` chrome (canonical) but reconcile focus ring to match "Go Home" (`ring-offset-2 ring-offset-hero-bg` added)
- "Go Home" link: `bg-primary` → white-pill (smaller `px-6 py-2.5 text-sm` peer-tier; full Pattern 2 with showstopper sizing would be too loud for a button-pair)
- Both buttons get `min-h-[44px]` touch target

Note: This uses a quieted white-pill (`px-6 py-2.5 text-sm`) for "Go Home" rather than full Pattern 2 because two buttons side-by-side at showstopper-tier compete with each other. Same hierarchy reasoning as Spec 11c Decision 9.

**Auth gating:** N/A.

**Responsive behavior:** FrostedCard centers via `mx-auto max-w-md`. Button row uses `justify-center` so buttons stay centered at all breakpoints.

**Inline position expectations:** Heading → body → button row. Buttons side-by-side, no wrap at any breakpoint (Refresh ~80px + Go Home ~95px + gap 12px = ~187px ≪ 384px max-w-md card width with p-8 padding).

**Guardrails (DO NOT):**
- DO NOT change heading or body copy.
- DO NOT change route coverage in this step (Step 6 handles coverage).
- DO NOT remove the `<Layout>` wrap.
- DO NOT use full showstopper Pattern 2 sizing for "Go Home" — quieted peer-tier is intentional.

**Test specifications:**

If `RouteErrorBoundary.test.tsx` doesn't exist, create it. Tests:

| Test | Type | Description |
|---|---|---|
| Fallback container has role="alert" | unit | Trigger render error. Query `[role="alert"]` is in document. |
| Fallback uses canonical FrostedCard chrome | unit | role="alert" element className contains `border-white/[0.12]` AND `bg-white/[0.06]` AND `rounded-2xl`. |
| Refresh button has min-h-[44px] | unit | className contains `min-h-[44px]`. |
| Refresh button focus ring is canonical | unit | className contains `ring-offset-hero-bg`. |
| Go Home link is canonical white-pill | unit | className contains `bg-white` AND `text-hero-bg` AND `rounded-full` AND `min-h-[44px]`. |
| Go Home link does NOT use bg-primary | unit | className does NOT contain `bg-primary`. |
| Heading text preserved | unit | screen.getByText("This page couldn't load"). |
| Body text preserved | unit | screen.getByText(/Try refreshing or going back/). |

**Expected state after completion:**
- [ ] FrostedCard wrap with role="alert"
- [ ] Refresh button focus ring reconciled
- [ ] Go Home link migrated to white-pill (peer-tier sizing)
- [ ] Heading + body copy preserved
- [ ] 8 test assertions (new file or extension)

---

### Step 6: Extend RouteErrorBoundary to all uncovered routes

**Objective:** Wrap every route in App.tsx uniformly with `<RouteErrorBoundary>`. Currently ~16 routes wrap; ~25 don't. After Spec 12, all routes covered.

**Files to modify:**
- `frontend/src/App.tsx`

**Details:**

Read App.tsx Routes section. For every `<Route>` that does NOT currently have `<RouteErrorBoundary>` wrapping its element, add the wrap.

Current pattern (already in use on ~16 routes):

```tsx
<Route
  path="/insights"
  element={
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Insights />
      </Suspense>
    </RouteErrorBoundary>
  }
/>
```

Apply this pattern to every uncovered route. Per recon Section D.3, uncovered routes include:
- `/health`
- `/insights/monthly`
- `/ask`
- `/reading-plans/*` (multiple)
- `/challenges/*` (multiple)
- `/meditate/*` (6 sub-pages)
- `/verse/:id`
- `/prayer/:id`
- `/scripture`
- `/music`, `/music/playlists`, `/music/ambient`, `/music/sleep`, `/music/routines`
- `/prayer-wall/*` except listing
- `/local-support/*`
- `/dev/mood-checkin`
- `/login`
- `/bible/search`, `/bible/:book/:chapter`
- `*` (NotFound)
- Tab redirect routes

Verify the full list during execution by reading App.tsx and identifying every `<Route>` element currently without RouteErrorBoundary wrap.

**Special case — BibleReader (`/bible/:book/:chapter`):**

BibleReader uses ReaderChrome (its own custom chrome) instead of Layout. Wrapping it in RouteErrorBoundary still works because RouteErrorBoundary's fallback uses Layout — but the user would see Layout chrome on BibleReader-error, which is inconsistent with normal BibleReader chrome. Direction call: WRAP IT ANYWAY. The error fallback being inconsistent with the normal page chrome is acceptable; uniform error coverage is more important than chrome continuity in error states.

**Special case — `/login`:**

Login is a route that opens AuthModal. It may not have a meaningful "render crash" path. Wrap it anyway for uniformity.

**Auth gating:** N/A.

**Responsive behavior:** N/A — wrap doesn't change layout.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the existing 16 wrapped routes — only ADD wraps to uncovered ones.
- DO NOT change Suspense fallback — `<RouteLoadingFallback />` stays as the loading fallback inside each wrap.
- DO NOT change the route paths or element components.
- DO NOT remove BibleReader from the coverage (per direction call).
- DO NOT add RouteErrorBoundary to top-level providers — it goes per-route, not at App root.

**Test specifications:**

Hard to write a full route-coverage test, but a regression test catches the most important cases:

| Test | Type | Description |
|---|---|---|
| Music Routines route is wrapped in RouteErrorBoundary | unit | Mount App with route `/music/routines`. Force-throw inside RoutinesPage during render (mock module to throw). Assert RouteErrorBoundary fallback renders ("This page couldn't load" text), NOT global ErrorBoundary fallback ("Something went wrong"). |
| Bible reader route is wrapped | unit | Same pattern for `/bible/genesis/1`. |
| NotFound route is wrapped | unit | Same pattern for `/some-nonexistent-route`. |
| Meditate sub-page route is wrapped | unit | Same pattern for one meditate path. |

These integration-style tests verify wrap presence by behavior. Optional: a more programmatic test that introspects route definitions and asserts each route's element JSX contains RouteErrorBoundary.

**Expected state after completion:**
- [ ] All routes in App.tsx wrapped uniformly in RouteErrorBoundary
- [ ] BibleReader, NotFound, Meditate sub-pages, Music routes all covered
- [ ] 4 integration tests verifying coverage on key routes

---

### Step 7: RouteLoadingFallback bg fix

**Objective:** Migrate RouteLoadingFallback from `bg-dashboard-dark` to `bg-hero-bg` to match Layout outer wrapper.

**Files to modify:**
- `frontend/src/App.tsx` (where `RouteLoadingFallback` is defined, lines 103-118 per recon)

**Details:**

Current:

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

Change `bg-dashboard-dark` → `bg-hero-bg`:

```tsx
function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-bg">
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

That's the entire change. Caveat wordmark + pulse animation preserved per Decision 1 + Decision 5.

**Auth gating:** N/A.

**Responsive behavior:** Same — full-bleed at all breakpoints.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT touch the wordmark (Decision 1).
- DO NOT touch the pulse animation (Decision 1).
- DO NOT touch the prefers-reduced-motion check.

**Test specifications:** No new tests needed (visual change only). Verify in /verify-with-playwright.

**Expected state after completion:**
- [ ] `bg-dashboard-dark` → `bg-hero-bg`
- [ ] Wordmark + animation unchanged

---

### Step 8: NotFound "Go Home" link migration

**Objective:** Migrate the NotFound page's "Go Home" link from `font-script text-2xl text-primary-lt` (Caveat styled CTA) to a plain text link.

**Files to modify:**
- `frontend/src/App.tsx` (where NotFound is defined, lines 120-142 per recon)

**Details:**

Current NotFound CTA (approximate):

```tsx
<Link to="/" className="font-script text-2xl text-primary-lt hover:text-primary">
  Go Home
</Link>
```

Replace with:

```tsx
<Link to="/" className="text-base text-white/70 hover:text-white underline transition-colors">
  Go Home
</Link>
```

Changes:
- `font-script text-2xl text-primary-lt` → `text-base` (regular Inter, base size)
- `hover:text-primary` → `hover:text-white`
- Adds `underline` (canonical link affordance)
- Adds `transition-colors` for smooth hover

**Auth gating:** N/A.

**Responsive behavior:** Same at all breakpoints.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the link or change its destination (`/`).
- DO NOT remove the surrounding NotFound page chrome (h1 "Page not found" or equivalent stays).
- DO NOT add font-bold or other emphasis — plain link.

**Test specifications (App.test.tsx if NotFound has tests; otherwise add):**

| Test | Type | Description |
|---|---|---|
| NotFound Go Home link uses plain text chrome | unit | Mount NotFound. Find link by text "Go Home"; className contains `text-base` AND does NOT contain `font-script`. |
| NotFound Go Home link still routes to / | unit | href attribute equals `/`. |

**Expected state after completion:**
- [ ] Caveat removed from NotFound link
- [ ] Plain text link with underline + hover
- [ ] 2 test assertions

---

### Step 9: Cosmetic index.html fixes

**Objective:** Add favicon.ico, mobile-web-app-capable meta tag, link rel=icon, color-scheme dark.

**Files to modify:**
- `frontend/index.html`
- `frontend/public/favicon.ico` — NEW FILE

**Details:**

**Step 9a — Generate favicon.ico:**

Derive from existing `public/icon-192.png`. Use any of:
- Online ICO converter (favicon.io, convertico.com) — manual
- `imagemagick`: `convert frontend/public/icon-192.png -define icon:auto-resize=64,48,32,16 frontend/public/favicon.ico` — automated
- Hand-author with Sharp / pngquant if neither available

Resulting file: `frontend/public/favicon.ico` (~5-10KB, multi-resolution: 16, 32, 48, 64).

**Step 9b — Add meta tags to index.html:**

In `<head>`, locate the existing `<meta name="apple-mobile-web-app-capable" content="yes">`. Add the modern equivalent ALONGSIDE (not replacing — apple-prefixed is still needed for iOS):

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

Also in `<head>`, add (location: near other meta tags, before the Google Fonts links):

```html
<meta name="color-scheme" content="dark">
```

**Step 9c — Add link rel=icon declarations:**

In `<head>`, locate the existing `<link rel="apple-touch-icon">`. Add icon links:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="shortcut icon" href="/favicon.ico">
```

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the existing apple-mobile-web-app-capable meta tag (still needed for iOS pre-Safari 16).
- DO NOT modify viewport, theme-color, or charset meta tags.
- DO NOT modify the Google Fonts links.
- DO NOT touch vite-plugin-pwa configuration.

**Test specifications:** None. Visual verification via DevTools (no favicon 404, no deprecation warning in Console) is sufficient.

**Expected state after completion:**
- [ ] favicon.ico generated and saved to public/
- [ ] mobile-web-app-capable meta tag added
- [ ] color-scheme dark meta tag added
- [ ] link rel=icon declarations added
- [ ] DevTools Network tab shows no favicon 404 on next load

---

### Step 10: useFaithPoints test fix

**Objective:** Update the `useFaithPoints` test to include the `intercession: false` field that production has been returning since spec-3-6 (commit e625a08).

**Files to modify:**
- `frontend/src/hooks/__tests__/useFaithPoints.test.ts`

**Details:**

Locate the failing test at line 96. Current expectation (approximate):

```tsx
expect(result.current.dailyActivities).toEqual({
  mood: false, pray: false, listen: false,
  prayerWall: false, readingPlan: false, meditate: false,
  journal: false, gratitude: false, reflection: false,
  challenge: false,
  localVisit: false,
  devotional: false,
})
```

Add `intercession: false` to the expected object:

```tsx
expect(result.current.dailyActivities).toEqual({
  mood: false, pray: false, listen: false,
  prayerWall: false, readingPlan: false, meditate: false,
  journal: false, gratitude: false, reflection: false,
  challenge: false,
  localVisit: false,
  devotional: false,
  intercession: false,  // added in spec-3-6 (commit e625a08)
})
```

That's the entire change.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the production `freshDailyActivities` function — production is canonical.
- DO NOT remove or modify other test assertions in the same file.

**Test specifications:** This IS a test fix. The fix itself is the test update.

**Expected state after completion:**
- [ ] useFaithPoints test passes
- [ ] Pre-existing failure resolved
- [ ] Total test suite: 9,470+ pass / 1 known fail (Navbar Prayer Wall, which Step 1 resolves)

---

## Step Dependency Map

| Step | Depends on | Description |
|---|---|---|
| 1 | — | Layout transparentNav default flip |
| 2 | — | SharedVerse + SharedPrayer error states `<Navbar transparent />` |
| 3 | — | ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE |
| 4 | — | ChunkErrorBoundary chrome migration |
| 5 | — | RouteErrorBoundary chrome migration |
| 6 | 5 (RouteErrorBoundary chrome must be canonical before extending coverage) | Wrap all uncovered routes |
| 7 | — | RouteLoadingFallback bg fix |
| 8 | — | NotFound Go Home link migration |
| 9 | — | Cosmetic index.html fixes + favicon.ico |
| 10 | 1 (Layout default flip resolves Navbar Prayer Wall test naturally) | useFaithPoints test fix |

**Suggested execution order (batched):**

1. **Pass 1 — Layout + Navbar prop migrations** (Steps 1, 2): one edit pass on Layout.tsx + 2 page edits. Run `pnpm test components/__tests__/Layout.test.tsx components/__tests__/Navbar.test.tsx`.

2. **Pass 2 — Error boundary chrome** (Steps 3, 4, 5): three error-boundary file edits. Run boundary tests.

3. **Pass 3 — Route coverage extension** (Step 6): one App.tsx edit pass adding wraps to all uncovered routes. Run integration tests + full smoke.

4. **Pass 4 — Misc fixes** (Steps 7, 8): one App.tsx edit (RouteLoadingFallback bg + NotFound link).

5. **Pass 5 — Cosmetic + tests** (Steps 9, 10): index.html + favicon + useFaithPoints test fix.

6. **Pass 6 — Full regression**: `pnpm test`. Confirm baseline 9,470+ pass / 0 known fails (Step 1 resolves Navbar Prayer Wall, Step 10 resolves useFaithPoints).

---

## Pre-MR checklist

Before opening MR (when Eric is ready to commit):

- [ ] `pnpm test` — full suite passes; baseline 9,470+ pass / 0 known pre-existing fails (both pre-existing failures resolved)
- [ ] `pnpm tsc --noEmit -p tsconfig.json` — clean
- [ ] `pnpm lint` — clean
- [ ] Visual verification at desktop 1280px on:
  - `/music/routines` — navbar wordmark white Caveat, nav links readable, no opaque-mode chrome
  - One Meditate sub-page (e.g., `/meditate/breathing`) — navbar transparent
  - `/privacy-policy` — navbar transparent
  - `/404` (NotFound) — Go Home link plain text
  - `/health` — navbar transparent
- [ ] DevTools Console — no favicon 404
- [ ] DevTools Network tab — no `/favicon.ico` 404
- [ ] Trigger ChunkErrorBoundary fallback (mock chunk-load error) — visual check: FrostedCard, RefreshCw icon, white-pill button
- [ ] Trigger RouteErrorBoundary fallback (mock render error in any route) — visual check: FrostedCard, white-pill "Go Home", reconciled focus rings
- [ ] Reduced-motion verification (browser prefers-reduced-motion: reduce) — confirm no animation regressions on RouteLoadingFallback or boundaries

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Layout transparentNav default flip | [NOT STARTED] | | |
| 2 | SharedVerse + SharedPrayer Navbar transparent migration | [NOT STARTED] | | |
| 3 | ErrorBoundary inline gradient → GRADIENT_TEXT_STYLE | [NOT STARTED] | | |
| 4 | ChunkErrorBoundary chrome migration | [NOT STARTED] | | |
| 5 | RouteErrorBoundary chrome migration | [NOT STARTED] | | |
| 6 | Extend RouteErrorBoundary to all uncovered routes | [NOT STARTED] | | |
| 7 | RouteLoadingFallback bg fix | [NOT STARTED] | | |
| 8 | NotFound Go Home link migration | [NOT STARTED] | | |
| 9 | Cosmetic index.html fixes + favicon.ico | [NOT STARTED] | | |
| 10 | useFaithPoints test fix | [NOT STARTED] | | |

---

## Out-of-scope reminder

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

---

## Pipeline

1. Eric reviews this brief
2. `/plan _specs/spec-12-site-chrome.md` (CC's plan-from-jira2 or equivalent)
3. `/execute-plan _plans/<plan-filename>`
4. `/verify-with-playwright /music/routines _plans/<plan-filename>` — verify navbar transparent + chrome canonical
5. Additional `/verify-with-playwright` calls on `/meditate/breathing`, `/privacy-policy`, `/404`, plus error-boundary fallback states
6. `/code-review _plans/<plan-filename>`
7. Eric commits when satisfied

Stay on `forums-wave-continued`. CC does NOT commit, push, or branch — Eric handles all git operations manually.
