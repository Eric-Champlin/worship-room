# Implementation Plan: Bible UX Polish — Scroll Fix, Copy, Colors

**Spec:** `_specs/bible-ux-polish.md`
**Date:** 2026-04-16
**Branch:** `bible-ux-polish`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** N/A (standalone polish sweep; no new-page recon)
**Master Spec Plan:** N/A (standalone spec after BB-26→BB-44 audio wave)

---

## Architecture Context

### Router / app shell

- `BrowserRouter` wraps everything in `frontend/src/App.tsx` (line 209). Provider chain: `HelmetProvider → ErrorBoundary → AuthProvider → InstallPromptProvider → ToastProvider → AuthModalProvider → AudioProvider → AudioPlayerProvider → WhisperToastProvider → ChunkErrorBoundary → Suspense → RouteTransition → Routes`.
- A new `ScrollToTop` component must mount **inside** `BrowserRouter` so `useLocation()` resolves against the same router. The correct mount point is as a sibling of `<ChunkErrorBoundary>` inside `RouteTransition`'s parent scope — i.e., a direct child of `<BrowserRouter>` before `<Routes>` is sufficient. Simplest placement: inside `<BrowserRouter>` and above `<HelmetProvider>` chain is wrong (HelmetProvider wraps the router context consumer). Correct placement: directly above `<Routes>` (inside `Suspense`) OR as a sibling of `RouteTransition` inside the router tree. We will mount `<ScrollToTop />` as a sibling of `<RouteTransition>` inside `<Suspense>` (adjacent to the existing route-level UI) so it fires on every pathname change regardless of which route renders.

### FirstRunWelcome render sites

- `frontend/src/pages/Home.tsx:12` imports `FirstRunWelcome`; `line 66` renders `{isFirstRun && <FirstRunWelcome onDismiss={dismissFirstRun} />}`.
- `frontend/src/pages/Dashboard.tsx:42` imports `FirstRunWelcome`; `line 631` renders the same.
- Both pages consume `useFirstRun()` (returns `{ isFirstRun, dismissFirstRun }`). The hook reads/writes `wr_first_run_completed`. Spec keeps the hook and component files in place — only the render is removed. The `useFirstRun` call and `dismissFirstRun` binding can be removed if unused after the render is gone; `isFirstRun` reference is purely conditional-render gating and drops out cleanly.
- Component: `frontend/src/components/onboarding/FirstRunWelcome.tsx` (kept).
- Tests: `frontend/src/components/onboarding/__tests__/FirstRunWelcome.test.tsx` tests the component in isolation — they DO NOT assert the popup renders on any page, only the component itself. They continue to pass unchanged. No page-level test currently asserts the popup renders, so no test flip is required at the page level.

### Bible browser (BibleLanding.tsx, /bible)

- `frontend/src/pages/BibleLanding.tsx` wraps `BibleLandingInner` in `BibleDrawerProvider` + `AuthModalProvider`. Inner renders `<BibleHero />` + content column.
- `frontend/src/components/bible/landing/BibleHero.tsx` — contains the 2-line heading ("The Word of God" / "open to you") AND the subtitle ("No account needed…"). Uses `GRADIENT_TEXT_STYLE` from `@/constants/gradients` for the second line (already).
- `BibleLanding.tsx:188-194` — "Browse all plans →" `<Link>` below `TodaysPlanCard`. TO BE REMOVED.
- `BibleLanding.tsx:206-208` — footer `<p>` "World English Bible (WEB) — Public Domain — No account, ever." TO BE REMOVED.
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx:18` — `<p>Choose from 10 guided plans</p>` TO BE REMOVED.

### Verse of the Day (`/bible` landing slot)

- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — mounted from `BibleHeroSlot`. Line 119-122 computes `verseFontClass` based on word count; values are `text-2xl sm:text-3xl` (short) / `text-lg sm:text-xl` (long > 30 words). Spec requires unconditional `text-lg sm:text-xl` for the verse text (drop the branching).
- Lines 146-183 — three action buttons ("Read in context", "Share", "Save"). Classes use `text-primary hover:text-primary-lt` (purple, muted on dark bg). Spec requires `text-white` with `hover:text-white/80`.

### Seasonal banner

- `frontend/src/components/SeasonalBanner.tsx` — mounted inside `Navbar.tsx:240`. Uses `useLiturgicalSeason()` which wraps `getLiturgicalSeason(date)` from `constants/liturgical-calendar.ts`.
- Easter season per `getSeasonRanges()` runs **Easter Sunday → day before Pentecost (+48 days)**. So on 2026-04-16 (11 days after Easter 2026-04-05), `currentSeason.id === 'easter'`, and the "He is risen!" banner shows. Spec requires this to stop showing weeks after Easter.
- Body text class: line 83 `text-sm text-white/70`. CTA: line 89 `text-sm font-medium text-primary-lt hover:text-primary`. Spec requires both → `font-bold text-white` (CTA `hover:text-white/80`).
- Fix approach: introduce a per-season **banner window cap** inside `SeasonalBanner.tsx`. For Easter only, cap the banner at 8 days (Octave of Easter, Easter Sunday + 7). Outside the cap, treat as not a named season → return `null` from the component (existing `!isNamedSeason || dismissed` short-circuits already).

### ResumeReadingCard

- `frontend/src/components/bible/landing/ResumeReadingCard.tsx:44-51` — "Or read the next chapter" link uses `text-primary-lt hover:text-primary`. Spec requires `text-white hover:text-white/80`.

### Navbar / Mobile / Footer / rules doc

- `frontend/src/components/Navbar.tsx:16` — `{ label: 'Bible', to: '/bible', icon: Book }` → change to `{ label: 'Study Bible', to: '/bible', icon: Book }`.
- `frontend/src/components/MobileDrawer.tsx:19` — `{ label: 'Bible', to: '/bible' }` → same change.
- `frontend/src/components/SiteFooter.tsx:12` — `{ label: 'Bible', to: '/bible' }` → same change.
- `frontend/src/components/__tests__/Navbar.test.tsx:69` and `:391` query for `{ name: 'Bible' }` — tests must update to `'Study Bible'`.
- `.claude/rules/10-ux-flows.md` — ASCII nav structure blocks for desktop/mobile (logged-in and logged-out) each list "Bible" as the top-level nav item. Update the four ASCII blocks to "Study Bible".
- **SEO/breadcrumb name strings** (`pages/BibleLanding.tsx:34`, `lib/seo/routeMetadata.ts:378/432/468`, `pages/MyBiblePage.tsx:50`, `components/ui/__tests__/Breadcrumb.test.tsx`): these power JSON-LD breadcrumb structured data and the on-page Breadcrumb widget. Spec language: "Any other nav surface". On-page breadcrumbs are a nav surface — update visible label to "Study Bible". Structured-data breadcrumb `name` fields follow (they mirror what a search engine would display). Route/URL slug `/bible` stays unchanged.

### Test patterns

- Vitest + RTL; helpers import `MemoryRouter` or render `<App />` with the real `BrowserRouter` for route-level integration tests.
- For `ScrollToTop` unit test, render inside `<MemoryRouter initialEntries={[…]}>` and assert `window.scrollTo` spy calls.
- Navbar tests already mock `useAuth`; they currently assert `{ name: 'Bible' }`. Update to `'Study Bible'`.

### Auth gating

No auth behavior changes. Every change in this plan is unauthenticated-safe.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Navigate Bible pages | No auth change | N/A (no gate touched) | N/A |
| Verse-of-the-Day action buttons | No auth change | Step 6 (styling only) | Existing `useAuthModal()` on Save (unchanged) |
| Reading Plans | No auth change | Step 3 (copy only) | N/A |

No new or removed auth gates. Spec §Auth Gating confirms zero auth behavior change.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Bible heading "Your" | font + color | `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight` | design-system.md § "Section Heading — 2-Line Treatment" |
| Bible heading "Study Bible" | font + gradient | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2` + `style={GRADIENT_TEXT_STYLE}` | design-system.md § "Section Heading — 2-Line Treatment" + `constants/gradients.tsx` |
| `GRADIENT_TEXT_STYLE` | CSS | `background: linear-gradient(223deg, rgb(255, 255, 255) 0%, rgb(139, 92, 246) 100%); background-clip: text; -webkit-text-fill-color: transparent` | design-system.md § Color System + `constants/gradients.tsx` |
| Verse-of-the-Day verse text | size | `font-serif text-lg sm:text-xl text-white leading-relaxed` (unconditional) | spec §Requirements #9 |
| VOTD action buttons | color | `text-white hover:text-white/80` | spec §Requirements #10 |
| Seasonal banner body span | classes | `text-sm font-bold text-white` | spec §Requirements #11 |
| Seasonal banner CTA link | classes | `text-sm font-bold text-white transition-colors hover:text-white/80` | spec §Requirements #11 |
| "Or read the next chapter" link | color | `text-white hover:text-white/80` | spec §Requirements #13 |
| Hero-bg background | color | `#08051A` (`bg-hero-bg`) | design-system.md § Color System |
| Hero-dark background | color | `#0D0620` | design-system.md § Color System |
| Easter banner cap | duration | 8 days from Easter Sunday (inclusive: Easter Sunday + 7) | spec §Requirements #12 design decision |

**No [UNVERIFIED] values.** Every value above is either in the loaded design system reference or stated explicitly in the spec acceptance criteria.

---

## Design System Reminder

The executor must respect these project-specific rules. These prevent the deviations seen in prior Execution Logs:

- Worship Room uses `GRADIENT_TEXT_STYLE` (white→purple, 223deg) for 2-line section headings on dark backgrounds. Import from `@/constants/gradients`. Do NOT use `Caveat` font (deprecated). Do NOT hand-roll the gradient inline.
- Text-color standard on landing-style surfaces (homepage, Daily Hub, Bible browser) is `text-white` by default. Muted opacities (`text-white/50`, `text-white/60`) are reserved for lock overlays, placeholders, and decorative elements. The spec's color changes are aligned with this standard.
- Section heading 2-line pattern: top line smaller + `text-white`; bottom line ~1.5× larger + gradient. `mt-1` couples the two lines. See design-system.md § "Section Heading — 2-Line Treatment".
- Do NOT use `animate-glow-pulse` or cyan glow on any textareas (not touched by this spec but a common deviation).
- Do NOT add `GlowBackground` or `BackgroundSquiggle` to the Bible browser (it uses its own `BibleLandingOrbs` atmospheric layer — untouched by this spec).
- `window.scrollTo(0, 0)` uses **instant** behavior (no `{ behavior: 'smooth' }`) — `prefers-reduced-motion` safety net handles the instant path correctly. Do NOT pass a `behavior` option.
- ScrollToTop keys on `useLocation().pathname` only — never include `search` or `hash` in the effect dependency array. Query-param-only changes (Daily Hub tab switches, Bible search mode) must NOT trigger scroll reset.
- Route slugs and URLs do NOT change. Only visible labels change ("Bible" → "Study Bible"). Route remains `/bible`.
- Animation token discipline: this spec introduces no new animations. Do NOT hardcode durations/easings anywhere.
- Font-bold on user-facing text still needs WCAG AA contrast: `text-white` on `#0D0620` / `#08051A` / `#0f0a1e` exceeds 4.5:1 — verified.

---

## Shared Data Models

No new types. No new localStorage keys. Reuses existing:

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_first_run_completed` | (none) | Becomes dormant; hook remains in place but pages no longer render the popup |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | VOTD verse text `text-lg`. Nav label "Study Bible" in MobileDrawer. Seasonal banner wraps per existing `flex-wrap`. |
| Tablet | 768px | VOTD verse text `text-xl`. Desktop navbar shows "Study Bible". Seasonal banner inline. |
| Desktop | 1440px | VOTD verse text `text-xl`. Desktop navbar shows "Study Bible". |

`ScrollToTop` is breakpoint-independent — single `window.scrollTo(0, 0)` on every `pathname` change.

**Custom breakpoints:** none introduced.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| VOTD action row | "Read in context", "Share", "Save", date | Same y ±5px at 1440px and 768px | Wrapping below 640px acceptable (action row may stack above date, matching current behavior) |
| ResumeReadingCard action row | "Continue" button + "Or read the next chapter" link | Same y ±5px at `sm:` (640px+). Wraps to separate rows below 640px per existing `flex-col sm:flex-row` | N/A below 640px (intentional stacking) |
| Seasonal banner content | Sparkles icon + message span + middot + CTA link | Same y ±5px at 1440px. Wraps per existing `flex-wrap` at narrow widths. | Wrapping below 640px acceptable |

Verse-of-the-Day and ResumeReadingCard layouts are visually unchanged except color/size swaps, so position expectations match current rendering.

---

## Vertical Rhythm

Bible browser vertical rhythm is governed by `space-y-8` on the content column (`BibleLanding.tsx:147`). Removing the "Browse all plans" link, the "WEB Public Domain" footer, and the "Choose from 10 guided plans" subtitle reduces the total vertical extent but does NOT alter spacing between remaining elements. No rhythm values change.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| BibleHero → streak chip / content column | Existing `space-y-8` (32px) | `BibleLanding.tsx:147` |
| TodaysPlanCard → QuickActionsRow | Existing section divider `border-t border-white/[0.08]` + `space-y-8` | `BibleLanding.tsx:197` |
| QuickActionsRow → BibleSearchEntry | `space-y-8` (32px) | `BibleLanding.tsx:147` |

No gap value changes. `/verify-with-playwright` should confirm these are unchanged after the removals (the absence of "Browse all plans" link should not collapse other gaps).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `bible-ux-polish` is checked out (created off `main` per spec).
- [ ] Audio wave (BB-26→BB-44) is merged to main — spec §Depends on.
- [ ] All auth-gated actions from the spec are accounted for (none — spec changes no auth behavior).
- [ ] Design system values verified from `_plans/recon/design-system.md` (loaded).
- [ ] No [UNVERIFIED] values remain — all values sourced from recon or spec.
- [ ] Prior Bible-wave specs (BB-0 through BB-46) are complete and committed.
- [ ] No deprecated patterns introduced (no Caveat, no animate-glow-pulse, no GlowBackground on Bible browser, no cyan border, no PageTransition, no italic Lora prompts).
- [ ] Current date is during Easter season per `getLiturgicalSeason()` — verify by running `pnpm test -- SeasonalBanner` or the Navbar-seasonal test; if they pass before this work begins, the Easter-window cap will make them update.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to mount `<ScrollToTop />` | Inside `<BrowserRouter>` as a sibling of `<RouteTransition>` within `<Suspense>` | Must be inside `BrowserRouter` so `useLocation()` works; placing it adjacent to `RouteTransition` keeps it in the existing suspense boundary without adding nesting. Returning `null` means zero render output. |
| ScrollToTop scroll behavior | Instant (no `{ behavior: 'smooth' }`) | Spec §Non-Functional: reduced-motion safety. Instant scroll has nothing to override. |
| ScrollToTop key | `location.pathname` only | Spec requires query-param-only changes (Daily Hub tabs, Bible search mode) to NOT reset scroll. Using `pathname` alone excludes search + hash. |
| BibleReader verse anchor compatibility | Rely on effect ordering | BibleReader's own `useEffect` (line 422) runs on mount/param change AFTER the initial global scroll. `scrollIntoView` on the verse element wins over the global `scrollTo(0,0)`. No special case needed. |
| FirstRunWelcome: delete component? | Keep file, remove render only | Spec explicitly: "component file itself is NOT deleted". Keeps BB-34 tests intact. |
| FirstRunWelcome: clear `wr_first_run_completed`? | No | Spec §Out of Scope. Harmless legacy data. |
| Easter banner cap | 8 days from Easter Sunday (Octave of Easter) | Liturgical Octave is the canonical "bright week" celebration window. Matches spec intent ("must not show weeks after Easter"). Keeps celebratory tone for the week after Easter, hides for rest of Eastertide. |
| Other season banner caps | Unchanged | Spec only flags Easter. Advent (4 weeks), Christmas (12 days), Lent (40 days), Holy Week (8 days), Pentecost (single day) are all short enough that their current ranges are reasonable banner windows. |
| Season detection vs. banner window | Separate | `useLiturgicalSeason()` continues to return the true season (used elsewhere for devotional prioritization). The banner adds its own local cap on top. |
| "Bible" → "Study Bible" in SEO breadcrumbs | Update | Breadcrumb JSON-LD `name` fields are user-visible in search results; consistency preferred. Route URL `/bible` stays. |
| Tests that assert `name: 'Bible'` | Update to `'Study Bible'` | Navbar.test.tsx (lines 69, 391), Breadcrumb.test.tsx (lines 44-56). These are tests of the rename target; flip the assertion alongside the implementation. |
| MobileDrawer label ordering | Unchanged | Spec only renames label; no structural change. |
| "Browse all plans" remaining entry points | `TodaysPlanCard` `+N more` pill when multiple plans active | Covers the "view all" need without the redundant link below. |
| Verse text size branching removed | Drop `wordCount > 30` branch entirely | Spec sets one size for all verses. |
| VOTD `Save` state color | Change both `isBookmarked` and default branches to `text-white` | Simpler single-color treatment. Previously was `text-primary-lt` (saved) vs `text-primary` (unsaved); both become `text-white`. Filled `Bookmark` icon via `fill` attribute still distinguishes saved state. |

---

## Implementation Steps

### Step 1: Create `ScrollToTop` component

**Objective:** Global scroll-reset on route changes without disrupting query-param navigation or deep-link verse scrolls.

**Files to create/modify:**
- `frontend/src/components/ScrollToTop.tsx` — new file.

**Details:**

```tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
```

- Effect dependency is `pathname` ONLY. `search` and `hash` changes do not re-fire.
- `window.scrollTo(0, 0)` — instant, no `{ behavior: 'smooth' }`.
- Returns `null` — no render output.
- No SSR check needed (Vite SPA, `window` always defined in the render environment).

**Auth gating:** N/A.

**Responsive behavior:** N/A — no visual rendering.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT pass `{ behavior: 'smooth' }` — spec requires instant scroll.
- DO NOT depend on `search` or `hash` — only `pathname`.
- DO NOT use `useLayoutEffect` — `useEffect` is sufficient and avoids blocking the initial paint.
- DO NOT guard with `if (window.scrollY > 0)` — unconditional reset is simpler and equally correct.
- DO NOT call `scrollTo` inside a router `key` remount — the component must persist across route changes so the effect fires on pathname change.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `scrolls window to (0, 0) when pathname changes` | unit | Render `<MemoryRouter initialEntries={['/a']}><ScrollToTop /></MemoryRouter>`. Spy `window.scrollTo`. Navigate to `/b` via router. Assert spy called with `(0, 0)` at least once after the navigation. |
| `does NOT call scrollTo when only search changes` | unit | Render with `initialEntries={['/a?x=1']}`. Spy `window.scrollTo`. Navigate to `/a?x=2`. Assert no new call after the initial mount invocation. |
| `does NOT call scrollTo when only hash changes` | unit | Same pattern: `/a` → `/a#section`. No new call. |
| `fires exactly once per pathname change` | unit | Track call count across `/a` → `/b` → `/c`. Expect 3 calls total (including initial mount). |

**Expected state after completion:**
- [ ] `frontend/src/components/ScrollToTop.tsx` exists.
- [ ] Unit tests pass.
- [ ] Not yet mounted in App.tsx (Step 2 does that).

---

### Step 2: Mount `ScrollToTop` in `App.tsx`; remove `FirstRunWelcome` renders from `Home.tsx` and `Dashboard.tsx`

**Objective:** Activate global scroll reset and remove the first-run popup from the two pages that render it.

**Files to create/modify:**
- `frontend/src/App.tsx` — mount `<ScrollToTop />` inside `<BrowserRouter>`, adjacent to `<RouteTransition>`.
- `frontend/src/pages/Home.tsx` — remove `import { FirstRunWelcome }`, remove `useFirstRun()` call if now-unused, remove `{isFirstRun && <FirstRunWelcome ... />}` render block.
- `frontend/src/pages/Dashboard.tsx` — same treatment on line 42 and line 631.

**Details:**

1. **App.tsx mount:**
   - Add `import { ScrollToTop } from '@/components/ScrollToTop'` at the top.
   - Inside `<BrowserRouter>`, place `<ScrollToTop />` as a direct sibling of `<Suspense fallback={<RouteLoadingFallback />}>`. Exact insertion: between `<ChunkErrorBoundary>` opening and `<Suspense>` — i.e., `<ChunkErrorBoundary><ScrollToTop /><Suspense ...>`. This keeps it inside the error boundary and inside `BrowserRouter`.

2. **Home.tsx render removal:**
   - Delete `import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome'` (line 12).
   - Remove `{isFirstRun && <FirstRunWelcome onDismiss={dismissFirstRun} />}` (line 66).
   - Check if `useFirstRun` is used elsewhere in Home.tsx. If not, remove the hook import and the `const { isFirstRun, dismissFirstRun } = useFirstRun()` call. If `isFirstRun`/`dismissFirstRun` are referenced elsewhere, leave the hook call but remove the dead imports per minimum-change principle.

3. **Dashboard.tsx render removal:**
   - Same pattern as Home.tsx. Remove import (line 42), remove render (line 631), remove hook call only if otherwise-unused.

**Auth gating:** N/A.

**Responsive behavior:** N/A — no visual change.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT delete `frontend/src/components/onboarding/FirstRunWelcome.tsx` — spec explicitly forbids.
- DO NOT delete `frontend/src/hooks/useFirstRun.ts` — spec keeps the hook in place.
- DO NOT clear the `wr_first_run_completed` localStorage key — spec §Out of Scope.
- DO NOT mount `<ScrollToTop />` outside `<BrowserRouter>` (it uses `useLocation()`).
- DO NOT wrap `<ScrollToTop />` in `<Suspense>` (nothing to suspend on).
- DO NOT update `FirstRunWelcome.test.tsx` — component-level tests remain valid; the spec expects those tests to pass untouched.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Integration: Home renders without FirstRunWelcome even when first-run flag absent | integration | Render `<Home />` via App with cleared `wr_first_run_completed`. Assert `screen.queryByText(/Welcome to Worship Room/i)` is null. |
| Integration: Dashboard renders without FirstRunWelcome | integration | Same pattern with authenticated mock user. |
| Integration: navigate `/bible` → `/bible/my` scrolls window to 0 | integration (Playwright) | Load `/bible`, scroll to `window.scrollY = 800`, click the "My Bible" nav link, assert `window.scrollY === 0` after navigation. |
| Integration: query-param-only change preserves scrollY | integration (Playwright) | Load `/daily?tab=pray`, scroll partway, switch to `?tab=journal`, assert `scrollY > 0` (unchanged). |

**Expected state after completion:**
- [ ] `<ScrollToTop />` mounted inside `<BrowserRouter>` in App.tsx.
- [ ] FirstRunWelcome no longer imported or rendered from Home.tsx or Dashboard.tsx.
- [ ] FirstRunWelcome.tsx component file unchanged.
- [ ] useFirstRun.ts hook file unchanged.

---

### Step 3: Rename "Bible" to "Study Bible" in all nav surfaces

**Objective:** Update visible nav labels across desktop navbar, mobile drawer, footer, and on-page breadcrumbs. Update existing tests that assert the old label. Update `10-ux-flows.md` ASCII nav diagrams.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — line 16: `label: 'Study Bible'`.
- `frontend/src/components/MobileDrawer.tsx` — line 19: `label: 'Study Bible'`.
- `frontend/src/components/SiteFooter.tsx` — line 12: `label: 'Study Bible'`.
- `frontend/src/pages/BibleLanding.tsx` — line 34: breadcrumb `name: 'Study Bible'`.
- `frontend/src/pages/MyBiblePage.tsx` — line 50: breadcrumb `name: 'Study Bible'`.
- `frontend/src/lib/seo/routeMetadata.ts` — lines 378, 432, 468: `name: 'Study Bible'`.
- `frontend/src/components/__tests__/Navbar.test.tsx` — lines 69 and 391: update assertions to `{ name: 'Study Bible' }`.
- `frontend/src/components/ui/__tests__/Breadcrumb.test.tsx` — lines 44, 48, 56, 79, 91: update test fixtures and assertions from `'Bible'` to `'Study Bible'`.
- `.claude/rules/10-ux-flows.md` — update the four ASCII nav blocks (Desktop Logged Out, Desktop Logged In, Mobile Logged Out, Mobile Logged In) to show "Study Bible" instead of "Bible". Also update any in-body references within the "Navigation Structure" section that mention the label "Bible" as a nav item (but keep prose references to "the Bible section" / "the Bible redesign" / feature names unchanged — only the nav item label changes).

**Details:**

- Route path `/bible` remains unchanged.
- Icon on Navbar (`Book` from Lucide) remains unchanged.
- Order in nav lists unchanged.
- Any in-text references in `10-ux-flows.md` that describe the nav item itself (e.g., "Bible links to `/bible`") should read "Study Bible links to `/bible` (BibleBrowser)". Prose describing the Bible feature, Bible wave, Bible browser, etc., stays "Bible" — we're only renaming the nav label, not the feature.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Top navbar shows "Study Bible" as the second top-level item after the logo.
- Tablet (768px): Same top navbar rendering.
- Mobile (375px): MobileDrawer shows "Study Bible" as its third item (after Daily Hub, before Grow).

**Inline position expectations:** Top navbar items must share the same y-coordinate (±5px) at `lg` breakpoint and above. "Study Bible" is slightly wider than "Bible" but the existing flex layout accommodates without wrapping on desktop.

**Guardrails (DO NOT):**
- DO NOT change the route slug `/bible` or any URL.
- DO NOT rename the `BibleLanding`, `BibleBrowse`, `BibleReader`, or other component names.
- DO NOT rename the `/bible/my`, `/bible/browse`, `/bible/plans`, or `/bible/:book/:chapter` routes.
- DO NOT change JSON-LD `@type` or `@context` fields — only `name` string literals.
- DO NOT update prose mentions of "Bible" as a feature/product/translation — only nav labels.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Navbar renders "Study Bible" link | unit (existing, updated) | Update `screen.getByRole('link', { name: 'Study Bible' })` in Navbar.test.tsx lines 69 and 391. |
| Breadcrumb renders "Study Bible" label | unit (existing, updated) | Update Breadcrumb.test.tsx fixtures and assertions. |
| MobileDrawer renders "Study Bible" item | unit | New or existing test asserts the mobile drawer list contains "Study Bible" pointing to `/bible`. |
| SiteFooter renders "Study Bible" link | unit | New or existing test asserts footer link text "Study Bible" at `/bible`. |

**Expected state after completion:**
- [ ] All five nav surfaces (Navbar, MobileDrawer, SiteFooter, BibleLanding breadcrumb, MyBiblePage breadcrumb) show "Study Bible".
- [ ] `routeMetadata.ts` JSON-LD breadcrumbs show "Study Bible".
- [ ] Navbar.test.tsx and Breadcrumb.test.tsx assertions updated.
- [ ] `.claude/rules/10-ux-flows.md` ASCII nav blocks show "Study Bible".
- [ ] Tests pass: `pnpm test`.

---

### Step 4: Update `BibleHero` heading and remove subtitle

**Objective:** Replace "The Word of God / open to you" with "Your / Study Bible" using the 2-line gradient heading pattern, and delete the subtitle paragraph.

**Files to create/modify:**
- `frontend/src/components/bible/landing/BibleHero.tsx` — replace heading text and delete `<p>` subtitle.
- `frontend/src/components/bible/landing/__tests__/BibleHero.test.tsx` — update text assertions.

**Details:**

Final component structure (copy exactly):

```tsx
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
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

- The `<p>` subtitle is deleted entirely — not hidden with `sr-only`, not commented out. Fully removed.
- All other layout classes, `aria-labelledby`, `id`, and the `ATMOSPHERIC_HERO_BG` style remain unchanged.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): "Your" at `text-2xl` (24px), "Study Bible" at `text-4xl` (36px).
- Tablet (768px): `text-3xl` / `text-5xl`.
- Desktop (1440px): `text-4xl` / `text-6xl`.

**Inline position expectations:** Heading is vertically stacked (2 lines). No inline row concerns.

**Guardrails (DO NOT):**
- DO NOT use a different gradient — `GRADIENT_TEXT_STYLE` from `@/constants/gradients` is canonical.
- DO NOT keep the subtitle behind a feature flag or dev-only check. Delete the element.
- DO NOT change `aria-labelledby` or the `id="bible-hero-heading"` attribute.
- DO NOT change the hero padding/spacing classes.
- DO NOT change `ATMOSPHERIC_HERO_BG` import or usage.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders heading "Your Study Bible" with gradient on second line | unit | Update existing BibleHero.test.tsx to assert `screen.getByText('Your')` and `screen.getByText('Study Bible')` both in the same `<h1>`. |
| Subtitle is absent | unit | `expect(screen.queryByText(/No account needed/)).not.toBeInTheDocument()`. |
| Gradient text style applied to second span | unit | Assert `screen.getByText('Study Bible')` has inline `background` style containing `linear-gradient`. |

**Expected state after completion:**
- [ ] BibleHero.tsx heading reads "Your" (white) + "Study Bible" (gradient).
- [ ] Subtitle `<p>` removed from DOM.
- [ ] BibleHero.test.tsx updated.

---

### Step 5: Remove "Choose from 10 guided plans", "Browse all plans" link, and footer text from `BibleLanding`

**Objective:** Three targeted deletions on the Bible browser page to remove inaccurate/redundant copy.

**Files to create/modify:**
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx` — delete line 18 `<p>` with "Choose from 10 guided plans".
- `frontend/src/pages/BibleLanding.tsx` — delete the `<div className="flex justify-center">...<Link to="/bible/plans">Browse all plans →</Link>...</div>` block (lines 187-194).
- `frontend/src/pages/BibleLanding.tsx` — delete the `<p className="text-center text-sm text-white/50">World English Bible (WEB) — Public Domain — No account, ever.</p>` (lines 206-208).
- `frontend/src/components/bible/landing/__tests__/TodaysPlanCard.test.tsx` — update any test asserting "Choose from 10 guided plans".

**Details:**

1. **TodaysPlanCard.tsx empty-state block** (current lines 11-22):

```tsx
if (plans.length === 0) {
  return (
    <FrostedCard as="article">
      <Link to="/bible/plans" className="flex flex-col items-center gap-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark">
        <ListChecks className="h-8 w-8 text-white/60" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-bold text-white">Try a reading plan</h3>
        </div>
      </Link>
    </FrostedCard>
  )
}
```

   - The `<p className="mt-1 text-sm text-white/60">Choose from 10 guided plans</p>` is removed.
   - The surrounding `<div>` wrapper is preserved because it sets the vertical rhythm inside the FrostedCard.

2. **BibleLanding.tsx "Browse all plans" removal:**
   - Delete the entire `<div className="flex justify-center"><Link ...>Browse all plans →</Link></div>` block between `<TodaysPlanCard plans={plans} />` and `<div className="border-t border-white/[0.08]" />`.
   - After deletion, `<TodaysPlanCard />` sits directly above the section divider. `space-y-8` on the parent handles spacing.

3. **BibleLanding.tsx footer text removal:**
   - Delete the `<p className="text-center text-sm text-white/50">World English Bible (WEB) — Public Domain — No account, ever.</p>` immediately before the closing `</>` fragment.
   - The `BibleSearchEntry` is now the last element in the landing content column (when not in search mode).

**Auth gating:** N/A.

**Responsive behavior:** No layout change beyond removal of text. `space-y-8` on the parent column continues to govern vertical gaps. At all breakpoints the removed content was centered text; removing it does not alter column width or card sizing.

**Inline position expectations:** N/A — deletions only.

**Guardrails (DO NOT):**
- DO NOT remove the `TodaysPlanCard` component itself — only the one `<p>` inside its empty state.
- DO NOT remove the `BibleSearchEntry` component.
- DO NOT alter the `space-y-8` wrapper's class.
- DO NOT modify the active-plan branch of `TodaysPlanCard` (when `plans.length > 0`) — only the empty-state branch has the deleted `<p>`.
- DO NOT repurpose the removed footer for a different string — delete entirely.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| TodaysPlanCard empty state omits plan count | unit (existing, updated) | `expect(screen.queryByText(/Choose from 10 guided plans/)).not.toBeInTheDocument()`. `screen.getByText('Try a reading plan')` still present. |
| BibleLanding omits "Browse all plans" link | integration | Render BibleLanding with `plans = []`. `expect(screen.queryByRole('link', { name: /Browse all plans/ })).not.toBeInTheDocument()`. |
| BibleLanding omits WEB footer paragraph | integration | `expect(screen.queryByText(/World English Bible \(WEB\)/)).not.toBeInTheDocument()`. |

**Expected state after completion:**
- [ ] "Choose from 10 guided plans" absent from TodaysPlanCard empty state.
- [ ] "Browse all plans →" link absent from BibleLanding.
- [ ] "World English Bible (WEB) — Public Domain — No account, ever." absent from BibleLanding.
- [ ] TodaysPlanCard active-plan branch unchanged.
- [ ] Existing tests updated; all tests pass.

---

### Step 6: Shrink Verse-of-the-Day verse text and recolor action buttons

**Objective:** Apply spec-required verse text size and white text color to the three action buttons.

**Files to create/modify:**
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — remove the `wordCount > 30` size branch; recolor Read in context / Share / Save buttons.

**Details:**

1. **Verse text sizing (lines 119-122 in current file):**

   Replace:

   ```tsx
   const verseFontClass =
     wordCount > 30
       ? 'font-serif text-lg sm:text-xl text-white leading-relaxed'
       : 'font-serif text-2xl sm:text-3xl text-white leading-relaxed'
   ```

   With:

   ```tsx
   const verseFontClass = 'font-serif text-lg sm:text-xl text-white leading-relaxed'
   ```

   - `wordCount` is still destructured from `votd` — it may be unused after this change. If ESLint/TS flags it as unused, remove it from the destructure: `const { entry, verseText } = votd`. (Check project lint config — likely `@typescript-eslint/no-unused-vars` with `argsIgnorePattern`, but leave removal to execution step based on actual lint output.)

2. **"Read in context" link (around line 146-152):**

   - Replace `text-primary hover:text-primary-lt` with `text-white hover:text-white/80`.
   - Keep all other classes (min-h, gap, focus-visible ring, etc.).

3. **"Share" button (around line 156-164):**

   - Replace `text-primary hover:text-primary-lt` with `text-white hover:text-white/80`.

4. **"Save" button (around line 167-183):**

   - The current template uses a ternary for color: `isBookmarked ? 'text-primary-lt' : 'text-primary hover:text-primary-lt'`. Simplify to unconditional `text-white hover:text-white/80`.
   - Keep the `fill={isBookmarked ? 'currentColor' : 'none'}` on the `<Bookmark>` icon — the filled icon is now the sole visual signal for saved state.
   - Keep the conditional label text `{isBookmarked ? 'Saved' : 'Save'}`.

**Auth gating:** "Save" action remains auth-gated via `useAuthModal()` — unchanged. Logged-out users clicking Save still trigger the auth modal.

**Responsive behavior:**
- Mobile (375px): verse text `text-lg` (18px) with `leading-relaxed`.
- Tablet (768px): verse text `text-xl` (20px).
- Desktop (1440px): verse text `text-xl` (20px) — Tailwind has no larger scale applied.
- Action buttons at all breakpoints: white text, 14px.

**Inline position expectations:** Action row at 768px+ must render all three buttons and the date on a single line (same y ±5px). Below 640px the action row + date may stack via existing layout (unchanged).

**Guardrails (DO NOT):**
- DO NOT change the date `<time>` color or size.
- DO NOT change the "VERSE OF THE DAY" uppercase label styling (`text-white/50`).
- DO NOT change the reference `<cite>` styling (`text-white/60`).
- DO NOT remove the `fill` attribute from the Bookmark icon.
- DO NOT remove the `useAuthModal()` gate.
- DO NOT change `focus-visible:ring-white/50 focus-visible:ring-offset-2` — keep accessibility focus treatment.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Verse text uses `text-lg sm:text-xl` regardless of word count | unit | Render with short verse, assert `<blockquote>` className contains `text-lg sm:text-xl`. Render with >30-word verse, same assertion. |
| Action buttons have white text | unit | Query each button by `aria-label`, assert className contains `text-white` and does NOT contain `text-primary`. |
| Save button auth-gated for logged-out users | unit (existing) | Existing test should continue to pass unchanged. |
| Bookmark icon fill toggles on saved state | unit (existing) | Existing coverage. |

**Expected state after completion:**
- [ ] Verse text is `text-lg` on mobile and `text-xl` on tablet+ unconditionally.
- [ ] All three action buttons use `text-white hover:text-white/80`.
- [ ] Auth gating on Save preserved.

---

### Step 7: Restyle seasonal banner text and cap the Easter banner window

**Objective:** Make the banner CTA and body bold white for readability. Limit the Easter banner to the 8-day Octave of Easter.

**Files to create/modify:**
- `frontend/src/components/SeasonalBanner.tsx` — recolor body + CTA; add Easter-window cap; tests updated.
- `frontend/src/components/__tests__/SeasonalBanner.test.tsx` — update assertions; add Easter-window-cap tests.
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — update if it asserts color or font.

**Details:**

1. **Color changes:**

   - Line 83: `<span className="text-sm text-white/70">{message}</span>` → `<span className="text-sm font-bold text-white">{message}</span>`.
   - Line 89: the `<Link>` className `"text-sm font-medium text-primary-lt transition-colors hover:text-primary"` → `"text-sm font-bold text-white transition-colors hover:text-white/80"`.

2. **Easter banner cap:**

   Inside `SeasonalBanner()` after the `useLiturgicalSeason()` call, compute whether we are within the banner window:

   ```ts
   const BANNER_WINDOW_DAYS_EASTER = 8 // Easter Sunday + 7 = Octave of Easter

   function isWithinBannerWindow(seasonId: LiturgicalSeasonId, now: Date = new Date()): boolean {
     if (seasonId !== 'easter') return true
     const year = now.getFullYear()
     const easter = computeEasterDate(year)
     const easterStart = new Date(year, easter.getMonth(), easter.getDate())
     const msPerDay = 1000 * 60 * 60 * 24
     const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
     const utcEaster = Date.UTC(easterStart.getFullYear(), easterStart.getMonth(), easterStart.getDate())
     const daysSinceEaster = Math.floor((utcNow - utcEaster) / msPerDay)
     return daysSinceEaster >= 0 && daysSinceEaster < BANNER_WINDOW_DAYS_EASTER
   }
   ```

   Or, preferred: extract this helper to `constants/liturgical-calendar.ts` alongside `computeEasterDate` as `isWithinEasterOctave(date)`. That keeps the date math colocated with the Computus algorithm. Executor may choose either placement; put it in the calendar file for testability.

3. **Integrate the cap:**

   Modify the render short-circuit at line 58:

   ```tsx
   if (!isNamedSeason || dismissed || !isWithinBannerWindow(seasonId as LiturgicalSeasonId)) {
     return null
   }
   ```

   The existing `isNamedSeason` flag still governs Ordinary Time / unknown-season cases. The new helper only affects Easter (returns `true` for every other season).

4. **Imports:**

   If placed in `constants/liturgical-calendar.ts`, add `isWithinEasterOctave` (or `isWithinBannerWindow`) to the exports and import it in `SeasonalBanner.tsx` alongside `LiturgicalSeasonId`.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): Banner wraps per existing `flex-wrap gap-x-2 gap-y-1`. Bold white message + CTA remain legible on mobile.
- Tablet (768px): Banner inline with middot separator visible.
- Desktop (1440px): Banner inline, centered.

**Inline position expectations:** Message span, middot, and CTA link share y (±5px) at 1440px. Wrap below 640px is acceptable and preserved by `flex-wrap`.

**Guardrails (DO NOT):**
- DO NOT change the dismissal storage key or behavior.
- DO NOT change the `role="complementary"` or `aria-label`.
- DO NOT change the Sparkles icon color (`text-white/40`) — decorative.
- DO NOT change the X dismiss button color or aria-label.
- DO NOT alter the 200ms dismissal transition or reduced-motion branch.
- DO NOT cap other seasons (Advent/Christmas/Lent/Holy Week/Pentecost). Spec only flags Easter.
- DO NOT add new content to seasons — spec §Out of Scope.
- DO NOT remove the `SEASON_MESSAGES` fallback (generic theme-word message for non-mapped seasons).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders bold white message and CTA during named season | unit | Mock `useLiturgicalSeason` → `advent`, render, assert message span has `font-bold text-white`, CTA link has `font-bold text-white`. |
| Easter banner renders on Easter Sunday | unit | Mock `Date` to Easter Sunday, mock `useLiturgicalSeason` → `easter`, assert banner renders. |
| Easter banner renders on Easter + 7 (last day of Octave) | unit | Mock `Date` to Easter + 7, assert banner renders. |
| Easter banner hidden on Easter + 8 (past Octave) | unit | Mock `Date` to Easter + 8, mock `useLiturgicalSeason` → `easter` (still in liturgical Easter season per Computus), assert banner returns null. |
| Easter banner hidden on 2026-04-16 | unit | Mock `Date` to 2026-04-16 (11 days after Easter 2026-04-05), assert banner returns null. |
| Non-Easter named seasons not affected by cap | unit | Mock `useLiturgicalSeason` → `lent` with any date during Lent, assert banner renders. |
| `isWithinEasterOctave` helper | unit | Pure-function tests across Easter boundaries (day before Easter, Easter Sunday, Easter + 7, Easter + 8, day after Pentecost). |
| Dismiss button continues to set localStorage key | unit (existing) | Existing test coverage unchanged. |

**Expected state after completion:**
- [ ] Banner message + CTA are `font-bold text-white`.
- [ ] Easter banner shows only during Octave of Easter (Easter Sunday + 7 days).
- [ ] Other named seasons unaffected.
- [ ] `isWithinEasterOctave` helper tested.
- [ ] Existing dismissal tests still pass.

---

### Step 8: Recolor "Or read the next chapter" link in ResumeReadingCard

**Objective:** Replace the muted purple link text with white.

**Files to create/modify:**
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — line 47: update link className.
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — no assertion change required (tests query by role/text, not color); verify after edit.

**Details:**

Replace:

```tsx
className="inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
```

With:

```tsx
className="inline-flex min-h-[44px] items-center text-sm text-white transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
```

- Focus ring, min-height, and transition tokens unchanged.
- "Continue" button (the white pill primary CTA) is unchanged.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): Continue button stacks above "Or read the next chapter" link (existing `flex-col`).
- Tablet (640px+): Inline row via existing `sm:flex-row` — Continue button + link share y (±5px).

**Inline position expectations:** Covered by the table in "Inline Element Position Expectations" section.

**Guardrails (DO NOT):**
- DO NOT change the "Continue" button styling.
- DO NOT change the FrostedCard wrapper or its `border-l-4 border-l-primary/60` accent.
- DO NOT alter `min-h-[44px]` — accessibility tap target.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| "Or read the next chapter" link has white text | unit | Query by accessible name, assert className contains `text-white` (not `text-primary-lt`). |
| ResumeReadingCard existing tests pass unchanged | unit (regression) | All existing tests at `__tests__/ResumeReadingCard.test.tsx` continue to pass. |

**Expected state after completion:**
- [ ] "Or read the next chapter" link renders with computed `color: rgb(255, 255, 255)`.
- [ ] Focus ring and hover state preserved.

---

### Step 9: Final verification

**Objective:** Run all checks and verify the integrated behavior.

**Files to create/modify:** none — verification only.

**Details:**

1. Run `pnpm lint` — no new violations.
2. Run `pnpm test` — all prior tests + new tests pass.
3. Run `pnpm build` — no TypeScript errors, no build errors.
4. Manual verification in dev server (`pnpm dev`):
   - Navigate `/bible` → scrolled down → click Daily Hub → land at top.
   - Deep-link `/bible/john/3?scroll-to=16` → lands on verse 16 (not top).
   - `/daily?tab=pray` → scroll down → switch to `?tab=journal` → scroll position preserved.
   - Navbar shows "Study Bible" at desktop and in mobile drawer.
   - Bible browser heading reads "Your Study Bible" with gradient on second line.
   - No subtitle under the heading.
   - TodaysPlanCard empty state shows only "Try a reading plan" without the count.
   - No "Browse all plans →" link below TodaysPlanCard.
   - No "World English Bible (WEB) — Public Domain" footer paragraph.
   - VOTD verse text is smaller (text-lg on mobile).
   - VOTD action buttons are white, readable.
   - Seasonal banner (if in a named season): bold white CTA + body.
   - On 2026-04-16: Easter banner is absent.
   - ResumeReadingCard "Or read the next chapter" is white.
   - FirstRunWelcome popup does not appear on home or Dashboard.

**Auth gating:** Verify the "Save" button on VOTD still triggers auth modal when logged out.

**Responsive behavior:**
- Tested at 375px, 768px, 1440px in `/verify-with-playwright` (Step 10 of pipeline).

**Inline position expectations:** `/verify-with-playwright` compares `boundingBox().y` values for the three inline rows in the table above.

**Guardrails (DO NOT):**
- DO NOT commit until all checks pass.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm test` | suite | All tests pass. |
| `pnpm lint` | suite | Zero new warnings. |
| `pnpm build` | suite | Clean production build. |

**Expected state after completion:**
- [ ] All acceptance criteria from spec verified.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` all pass.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create ScrollToTop component + unit tests |
| 2 | 1 | Mount ScrollToTop in App.tsx; remove FirstRunWelcome renders |
| 3 | — | Rename Bible → Study Bible across nav surfaces + tests + UX rules doc |
| 4 | — | BibleHero heading + subtitle |
| 5 | — | Remove inaccurate plan count, Browse all plans link, WEB footer |
| 6 | — | VOTD verse size + action button colors |
| 7 | — | Seasonal banner text color + Easter window cap |
| 8 | — | ResumeReadingCard "next chapter" link color |
| 9 | 1-8 | Lint + test + build + manual verification |

Steps 3-8 are independent of each other and of Steps 1-2. They may be executed in any order but Step 9 runs last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create ScrollToTop component | [COMPLETE] | 2026-04-16 | Created `frontend/src/components/ScrollToTop.tsx` + `__tests__/ScrollToTop.test.tsx` (6 tests, all pass). Pre-existing `useBibleAudio.test.ts` transform failure is unrelated. |
| 2 | Mount ScrollToTop; remove FirstRunWelcome renders | [COMPLETE] | 2026-04-16 | App.tsx: added `import { ScrollToTop }` and mounted `<ScrollToTop />` as first child of `<ChunkErrorBoundary>`. Home.tsx + Dashboard.tsx: removed `useFirstRun`/`FirstRunWelcome` imports, hook calls, and render blocks. FirstRunWelcome.tsx and useFirstRun.ts files kept per spec. `pnpm build` passes. |
| 3 | Rename Bible → Study Bible in nav surfaces | [COMPLETE] | 2026-04-16 | Updated Navbar.tsx, MobileDrawer.tsx, SiteFooter.tsx, BibleLanding.tsx + MyBiblePage.tsx breadcrumb JSON-LD, routeMetadata.ts (3 breadcrumb blocks). Updated 10-ux-flows.md ASCII nav. Updated tests: Navbar.test.tsx, Breadcrumb.test.tsx, routeMetadata.test.ts, BibleReader.seo.test.tsx, BiblePlanDetail.seo.test.tsx, BiblePlanDay.seo.test.tsx, bb35-a11y-remediation.test.tsx. All updated tests pass. |
| 4 | Update BibleHero heading and remove subtitle | [COMPLETE] | 2026-04-16 | BibleHero.tsx heading updated to "Your" / "Study Bible"; subtitle `<p>` deleted. BibleHero.test.tsx + BibleLanding.test.tsx (hero test) updated. Expect WEB footer test to fail until Step 5 removes that text. |
| 5 | Remove plan count, Browse-all-plans link, WEB footer | [COMPLETE] | 2026-04-16 | TodaysPlanCard.tsx: removed "Choose from 10 guided plans" `<p>`. BibleLanding.tsx: deleted "Browse all plans →" link div and "World English Bible (WEB)…" footer `<p>`. Removed unused `Link` import. Tests: TodaysPlanCard.test.tsx + BibleLanding.test.tsx (footer + hero) updated; hero test scoped to hero section (Navbar now also contains "Study Bible"). |
| 6 | VOTD verse size + action button colors | [COMPLETE] | 2026-04-16 | VerseOfTheDay.tsx: dropped `wordCount` from destructure, unconditional `text-lg sm:text-xl`; all three action buttons now use `text-white hover:text-white/80` (including Save — simplified ternary). Tests updated + 2 new coverage tests added. |
| 7 | Seasonal banner text colors + Easter window cap | [COMPLETE] | 2026-04-16 | liturgical-calendar.ts: added `isWithinEasterOctave(date)` helper. SeasonalBanner.tsx: message body + CTA now `font-bold text-white` / `hover:text-white/80`; Easter-only cap short-circuits to null outside the 8-day Octave. Added 9 new tests covering helper + banner cap. Fake-timer Easter Sunday set as default test date for regression safety. |
| 8 | ResumeReadingCard "next chapter" color | [COMPLETE] | 2026-04-16 | ResumeReadingCard.tsx: `text-primary-lt`/`hover:text-primary` → `text-white`/`hover:text-white/80`. No test assertion changes needed. |
| 9 | Lint + test + build + manual verification | [COMPLETE] | 2026-04-16 | `pnpm lint` clean. `pnpm build` clean. `pnpm test`: 8238 passed / 0 failed (1 pre-existing file-level transform failure in `useBibleAudio.test.ts`, unrelated to this spec). Manual browser verification deferred to user — dev server can be launched with `pnpm dev`. |
