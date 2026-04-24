# Implementation Plan: BB-51 — Bible Polish Round 3

**Spec:** `_specs/bible-polish-round-3.md`
**Date:** 2026-04-17
**Branch:** `claude/feature/bible-polish-round-2` (stay on current branch, per spec)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, 12 days old, fresh)
**Recon Report:** N/A (standalone polish spec)
**Master Spec Plan:** N/A (standalone spec following BB-47/48/49/50)

---

## Architecture Context

### Edge-to-edge background (Requirement 1 — root cause)

- `Layout.tsx` (`frontend/src/components/Layout.tsx`) lines 14-17: outer wrapper is `dark ? 'bg-dashboard-dark' : 'bg-neutral-bg'`. Without `dark`, the outer div renders `bg-neutral-bg` (`#F5F5F5` — the gray gutter color).
- `<main>` is `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` — the content zone. Pages typically wrap their content in an additional `<div className="min-h-screen bg-dashboard-dark">` which fills the `max-w-7xl` main zone BUT does not extend to the viewport edges when the outer wrapper is `bg-neutral-bg`.
- **Result:** at 1440px+ desktop, the outer gray `bg-neutral-bg` shows as gutters on either side of the main content.
- **BB-50 fix applied only to BibleLanding** (`BibleLanding.tsx:138` → `<Layout dark>`). MyBiblePage, BibleBrowse, PlanBrowserPage, and other inner pages (AskPage, ChallengeDetail, ReadingPlanDetail, RoutinesPage) still use `<Layout>` without `dark` and all show the same gray gutters.
- **The spec mandates a LAYOUT-LEVEL fix.** Changing `Layout.tsx` to use `bg-hero-bg` as its outer background (dropping the light fallback) fixes all Bible sub-routes AND the other inner pages without touching any individual page component.
- **`bg-neutral-bg` is only used as a standalone background by pages that do NOT use Layout** (`Home.tsx:44`, `SharedVerse.tsx:25`, `SharedPrayer.tsx:27`). Those pages are unaffected by a Layout change.

### BibleLanding & BibleHero (Requirement 2 — top padding)

- `BibleHero.tsx:8` currently: `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`.
- Daily Hub hero (`DailyHub.tsx:223`): `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` — MORE pt BUT the greeting visually sits closer because the Daily Hub greeting uses larger font sizes and tighter `mb-1` to the next content block.
- The spec prescribes `pt-12` or `pt-16`. That's 48-64px of top padding (the Navbar is rendered normally by `Layout`, not transparent, so it takes up its own ~80px of space before the hero starts). Final target: `pt-12 sm:pt-16 lg:pt-20` to match the spec's vertical rhythm intent.

### StreakChip (Requirement 3 — hide for logged-out)

- `StreakChip.tsx` has NO auth check. It renders whenever `streak.currentStreak > 0`.
- Rendered in 2 places:
  1. `BibleLanding.tsx:150-160` — wrapped in a `{streak.currentStreak > 0 && (...)}` conditional.
  2. `MyBiblePage.tsx:242-253` — the "Streak" stat card with a flame icon, rendered when `totalCounts.streak > 0`.
- `useAuth()` returns `{ isAuthenticated, user, login(), logout() }` from `AuthProvider` context. Import from `@/hooks/useAuth`. AuthProvider wraps the app at `App.tsx:213`.

### My Bible auth gate (Requirement 4)

- `MyBiblePage.tsx` currently renders the full experience for all users. The `MyBiblePageInner` function is the main component; `MyBiblePage` wraps it in `BibleDrawerProvider`.
- `AuthModalProvider` wraps the entire route tree at `App.tsx:216`, so `useAuthModal()` is available in any page component without additional wrapping.
- `useAuthModal()` returns `{ openAuthModal(subtitle?, initialView?) }` — the provider is globally mounted.
- `FrostedCard` component at `components/homepage/FrostedCard.tsx` provides the canonical frosted-glass card styling.

### Read in Context scroll fix (Requirement 5)

- `VerseOfTheDay.tsx:142-149` — "Read in context" Link: `to={`/bible/${entry.book}/${entry.chapter}?scroll-to=${scrollToParam}`}`.
- `BibleReader.tsx:408-418` — `scrollToParamRef` skips the initial `window.scrollTo({ top: 0 })` when `scroll-to` is present, then scrolls directly to the verse. This is the "mid-page scroll position" the user is seeing.
- `ScrollToTop.tsx` fires on `pathname` change — `/bible/:book/:chapter` IS a new pathname, so ScrollToTop DOES fire, but it is immediately countermanded by `BibleReader`'s verse-scroll logic.
- **Fix approach:** Drop the `?scroll-to=` param from the "Read in context" Link. The whole chapter IS the context — the user lands at top of chapter and scrolls to find the verse naturally. This matches the spec's acceptance criterion: "lands at the top of the destination page (no mid-page scroll position)."

### Browse Books animation (Requirement 6)

- `DrawerViewRouter.tsx` — manages push/pop transitions via a `transition` state that mounts BOTH views during the animation window.
- BB-50 already aligned `TRANSITION_MS = 250` (line 10) with the CSS animation duration. The stutter persists, indicating the root cause is not timing.
- Animations defined in `tailwind.config.js`: `view-slide-in`, `view-slide-out`, `view-slide-back-in`. During push, outgoing view has NO exit animation (`outAnim = ''`) while incoming slides in from the right (`view-slide-in`). Both are `absolute inset-0` — they overlap. The outgoing view does not animate out, it just sits until unmounted → the slide-in view covers it progressively. This produces the "cards overlap/stutter" feeling.
- **Per spec:** "If the root cause can be fixed cleanly, fix it. If not, REPLACE the sliding animation with an instant transition (no animation). A clean cut is better than a glitchy slide." Given BB-50's timing fix did not resolve it, go straight to the instant-swap replacement.

### Reading plan cards (Requirement 7)

- `PlanBrowseCard.tsx:14`, `PlanInProgressCard.tsx:16`, `PlanCompletedCard.tsx:24` — all use `bg-gradient-to-br ${plan.coverGradient}` producing the "garish brown/green/teal" backgrounds.
- Each card also has a `<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />` scrim used only to make text legible on top of the colored gradient.
- Cards are `aspect-[4/3]` — will look different once the gradient is gone (no image area to justify the aspect ratio). Per spec: match `DashboardPreviewCard` aesthetic with plain frosted-glass styling, no scrim.

### PlanBrowserPage (Requirement 8)

- `PlanBrowserPage.tsx:37-39` — the "Reading Plans" `<h1>` uses `GRADIENT_TEXT_STYLE` with `leading-tight`. Clipping happens because `background-clip: text` clips at the text baseline; a descender like the lowercase "g" in "Reading" is at the bottom of the font's em box and can be clipped. Fix: `pb-2` on the heading (matches `BibleHero.tsx:16` which already uses `pb-2` on the gradient span).
- `PlanBrowserPage.tsx:47-52` renders `<PlanFilterBar>`. The PlanFilterBar has two rows: Theme pills and Duration pills. Per spec BB-47/48 this should be removed.
- Cards laid out by `PlanBrowserSection.tsx:15`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`. Spec wants `grid-cols-1 sm:grid-cols-2` (no lg:3, no 2xl:4).
- `PlanBrowserPage.tsx:46` wrapper is `max-w-6xl` — fine for 2-column layout.
- `usePlanBrowser()` hook signature: returns `{ theme, duration, setTheme, setDuration, clearFilters, ... }`. If filters are removed from the UI, `theme`/`duration` can be set to their defaults ('all' / 'any') and `filteredBrowse` simply returns all plans. Check the hook for dependency on these values.

### BibleReader toolbar persistence (Requirement 9)

- `useFocusMode.ts:43` — default is already `{ enabled: false, ... }` (BB-50 change landed).
- `useFocusMode.ts:50-60` — `loadSettings()` reads `localStorage.getItem('wr_bible_focus_enabled')`. If `!== null`, parses it. If `null`, uses default (`false`).
- **Legacy user failure mode:** Users who opened the app before BB-50 may have `'true'` persisted by the pre-BB-50 `saveSettings()` call. Even though the default is now `false`, `loadSettings` reads their legacy `'true'` value and focus mode activates.
- **Fix:** One-time migration. Use a new flag `wr_bible_focus_v2_migrated`. On `loadSettings()`, if the flag is absent, the user is pre-migration — force `enabled` to `false` (remove any legacy `'true'`) and write the flag. Subsequent reads see the flag and honor whatever the user has set. User toggle action is still respected after migration.
- `ChapterHeading` component is rendered at `BibleReader.tsx:843` inside the loaded-chapter branch. It produces a large static `Book / Chapter-Number` display in the reader body. The top toolbar (`ReaderChrome.tsx:86-96`) already renders `John 3 ▾` and is now always visible (post-migration). The static ChapterHeading is redundant and should be removed from the render tree.

### My Bible heading style (Requirement 10)

- `MyBiblePage.tsx:174-177`:
  ```tsx
  <SectionHeading topLine="My" bottomLine="Bible" className="[&_span:last-child]:max-w-full [&_span:last-child]:break-words [&_span:last-child]:!text-3xl [&_span:last-child]:sm:!text-4xl" />
  ```
- This produces a 2-line layout: "My" white on top + "Bible" gradient below.
- PlanBrowserPage and BibleHero patterns:
  - PlanBrowserPage: single `<h1>` with `GRADIENT_TEXT_STYLE` and `text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl`.
  - BibleHero: 2-line with topLine white + bottomLine gradient (like current MyBible).
- Spec wants MyBible to match the single-line gradient pattern from PlanBrowserPage. Replace the SectionHeading with an inline `<h1>` mirroring PlanBrowserPage.

### BibleProgressMap contrast (Requirement 11)

- `BibleProgressMap.tsx:101-105` — currently: unread `bg-white/10`, read `bg-white/40`, highlighted `bg-white` (BB-50 applied white-only tiers).
- Spec wants a binary distinction: unread `bg-white/[0.06]`, read `bg-white/80`. The `highlighted` state (fully-read book chapters with highlights) stays at solid `bg-white` — the maximum tier.

### Test patterns

- Vitest + RTL. Existing tests follow these patterns:
  - `frontend/src/pages/__tests__/MyBiblePage.test.tsx`
  - `frontend/src/pages/__tests__/BibleLanding.test.tsx`
  - `frontend/src/components/bible/landing/__tests__/*.test.tsx`
  - `frontend/src/components/bible/my-bible/__tests__/BibleProgressMap.test.tsx`
  - `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx`
  - `frontend/src/hooks/__tests__/useFocusMode.test.ts`
- Tests render components inside `MemoryRouter`. Tests touching auth context need the `AuthProvider` (via `AuthContext`) mounted. Tests touching `useAuthModal()` need `AuthModalProvider`.

### Auth posture

- Existing Bible wave policy (`02-security.md`): no auth gates on Bible features.
- **This spec partially amends that policy**: two new gates added — streak UI hidden when logged out; My Bible page shows conversion card when logged out. Individual personal-layer actions (highlight, note, bookmark, memorization, AI Explain/Reflect) remain unauthenticated.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Render streak pill on `/bible` (BibleLanding) | Hide for logged-out users | Step 3 | `useAuth()` — skip render when `!isAuthenticated` |
| Render streak stat card on `/bible/my` (MyBiblePage) | Hide for logged-out users | Step 3 + Step 4 (only renders when logged in anyway — see Step 4 gate) | `useAuth()` — covered by My Bible page-level gate |
| View `/bible/my` | Show conversion card when logged out | Step 4 | `useAuth()` — early return with conversion card if `!isAuthenticated` |
| "Get Started — It's Free" CTA on conversion card | Trigger auth modal | Step 4 | `useAuthModal().openAuthModal('Sign in to track your Bible reading journey')` |

All other spec-defined behaviors (Bible reader, highlights, notes, bookmarks, memorization, AI features, search, browse books, reading plans, push notifications) remain unauthenticated — no auth checks added.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Layout outer bg (all pages) | background | `bg-hero-bg` (`#08051A`) | `09-design-system.md` § Color Palette; matches Daily Hub root per spec Design Notes |
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + dual box-shadow | `09-design-system.md` § Frosted Glass Cards |
| White pill CTA Pattern 2 (primary) | classes | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | `09-design-system.md` § White Pill CTA Patterns |
| GRADIENT_TEXT_STYLE | style | white-to-purple gradient via `background-clip: text` | `constants/gradients.tsx` |
| BibleHero pt | padding-top | `pt-12 sm:pt-16 lg:pt-20` | Spec §2 |
| Reading plan card bg | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | Spec §7 |
| Reading plan card hover | classes | `hover:bg-white/[0.08] hover:border-white/20 transition-all` | Spec §7 |
| Progress map unread cell | class | `bg-white/[0.06]` | Spec §11 |
| Progress map read cell | class | `bg-white/80` | Spec §11 |
| Progress map highlighted cell | class | `bg-white` | Existing, retained |
| Reading plan grid | classes | `grid-cols-1 sm:grid-cols-2` (no lg:/2xl:) | Spec §8 |
| Reading Plans heading | classes | `text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2` (added `pb-2`) | Spec §8 + `BibleHero.tsx:16` precedent |

**No [UNVERIFIED] values.** All values sourced from codebase inspection, spec, or design system reference.

---

## Design System Reminder

The executor must respect these project-specific rules:

- Worship Room is dark theme throughout. `bg-hero-bg` is the canonical root background (`#08051A`). The `bg-dashboard-dark` token (`#0f0a1e`) is a slightly different purple used historically on Bible pages; after this spec, we use `bg-hero-bg` at the Layout level and on Bible page inner divs to match Daily Hub exactly.
- Do NOT add `GlowBackground` or `BackgroundSquiggle` to any Bible section page. BibleLanding and MyBible use `BibleLandingOrbs` atmospheric layer — untouched by this spec.
- Do NOT use `Caveat` font for headings (deprecated — use `GRADIENT_TEXT_STYLE`).
- Do NOT use `animate-glow-pulse` or cyan glow (both deprecated).
- Do NOT hardcode animation durations. Import from `frontend/src/constants/animation.ts` (BB-33).
- White pill CTA Pattern 2 for primary actions (larger with white drop shadow); Pattern 1 for inline CTAs.
- Focus ring on every interactive element: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`.
- The BibleReader is a documented layout exception — uses `ReaderChrome`, not `Navbar`/`SiteFooter`. Do NOT wrap it in `<Layout>`.
- When consuming reactive stores (streak, bookmarks, etc.) use the store's hook or inline `subscribe()` — never local `useState` snapshot without subscription (BB-45 anti-pattern).
- When a "fix" didn't land previously (like BB-48 and BB-50 on the edge-to-edge issue), DO NOT blindly reapply the same fix. Trace from root cause. The current spec explicitly demands root-cause investigation.

---

## Shared Data Models

No new types. No new localStorage keys EXCEPT one migration flag.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_focus_enabled` | Read/Write | Legacy users with `'true'` are migrated to absent (default `false`) once per browser. |
| `wr_bible_focus_v2_migrated` | Write (once) | New one-time migration flag. Value: `'true'` after migration runs. Prevents re-migration on subsequent visits. Document in `11-local-storage-keys.md`. |

No new reactive stores. No BB-45 anti-pattern risk.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Edge-to-edge dark bg (no gutters at any width). Reading plan cards: 1-column. My Bible conversion card: full-width with padding. BibleHero heading: `pt-12`, smaller heading sizes per existing responsive classes. |
| Tablet | 768px | Reading plan cards: 2-column. Conversion card centered max-width ~480px. BibleHero `sm:pt-16`. Dark bg extends edge-to-edge. |
| Desktop | 1440px | Reading plan cards: 2-column (NOT 3 or 4). Conversion card centered max-width ~480px. BibleHero `lg:pt-20`. Dark bg extends edge-to-edge — no gray gutters on either side. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts introduced or modified in this feature. All layouts are block-stacked or grid-based.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar bottom → "Your Study Bible" heading | ~60-80px (post-fix) | Spec §2 — match Daily Hub vertical rhythm |
| Conversion card: heading → description | `mt-2` (~8px) | Standard text spacing |
| Conversion card: description → CTA | `mt-6` (~24px) | White pill CTA spacing |
| Reading Plans heading → filter area (now removed) → first card section | Heading margin `mt-3` to subtitle, `mt-8` from subtitle to "In progress" section | Existing pattern minus the filter bar |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/bible-polish-round-2` is checked out. Do NOT create a new branch per spec.
- [ ] BB-47, BB-48, BB-49, BB-50 all have their commits on this branch (already verified via `git status` showing modifications to files they touched).
- [ ] Layout-level fix (Step 1) is acceptable to change `Layout.tsx` behavior app-wide — this affects inner pages beyond Bible (AskPage, ChallengeDetail, ReadingPlanDetail, RoutinesPage, Health). Each of those pages already uses `bg-dashboard-dark` on their inner div, so their visible content is unchanged, but the outer gutters flip from light gray to dark. Spec anticipates this ("use `bg-hero-bg` globally since the entire app uses the dark theme").
- [ ] No [UNVERIFIED] values remain in this plan.
- [ ] All auth-gated actions accounted for in the Auth Gating Checklist.
- [ ] The `useAuthModal()` hook is available globally via `AuthModalProvider` at App.tsx:216 (verified).
- [ ] No deprecated patterns introduced (Caveat headings, GlowBackground on Bible pages, animate-glow-pulse, cyan glow, hardcoded animation durations, Lora italic on prose, BB-45 anti-pattern).
- [ ] New `wr_bible_focus_v2_migrated` key will be documented in `.claude/rules/11-local-storage-keys.md` as part of Step 9.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Edge-to-edge fix location | Change `Layout.tsx` outer div to always use `bg-hero-bg` (remove the `dark ? ... : bg-neutral-bg` branch; keep `dark` prop as a no-op for backward compat) | Spec demands LAYOUT-level fix. Every inner page uses Layout; all benefit. `bg-neutral-bg` is unused by non-Layout pages (Home, SharedVerse, SharedPrayer have their own light-bg wrappers). Zero regression risk. |
| Bible page inner div color | Change `bg-dashboard-dark` → `bg-hero-bg` on BibleLanding, BibleBrowse, MyBiblePage, PlanBrowserPage | Spec explicitly requires matching Daily Hub's `bg-hero-bg`. The inner div and outer wrapper then use the same color — truly seamless. |
| Other pages using Layout (AskPage, ChallengeDetail, ReadingPlanDetail, RoutinesPage) | Leave their inner `bg-dashboard-dark` divs unchanged | Out of scope for a Bible polish spec. The outer dark bg (from the Layout fix) means their gutters are now dark too — visual improvement without scope creep. Color mismatch between their inner `bg-dashboard-dark` (`#0f0a1e`) and outer `bg-hero-bg` (`#08051A`) is negligible (~5% luminance difference) and falls within existing Bible/Dashboard styling drift. |
| "Read in context" scroll-to behavior | Drop `?scroll-to=` entirely — navigate to bare `/bible/:book/:chapter` | Spec acceptance: "lands at the top of the destination page (no mid-page scroll position)". The whole chapter IS context. User scrolls to find verse. |
| Browse Books animation | Replace with instant swap (no animation) | Spec authorizes this when root cause cannot be fixed cleanly: "A clean cut is better than a glitchy slide." BB-50's timing fix did not resolve it. Root cause (overlapping absolute views with asymmetric animations) requires redesign; instant swap is the pragmatic win. |
| Plan card aspect ratio | Keep `aspect-[4/3]` | Still visually pleasing in frosted-glass form. Matches existing card sizing; grid math stays consistent. |
| Plan card dark scrim | Remove entirely | No colored gradient behind = no scrim needed. Text on frosted glass with dark outer bg is already high-contrast. |
| PlanFilterBar removal | Delete the `<PlanFilterBar>` JSX entirely. Keep the hook's theme/duration state defaulted to 'all'/'any'. | Minimal disruption: `usePlanBrowser` still runs, just with no UI to change filters. Leaves `filteredBrowse` as the full list. Future re-enable is a one-line JSX re-add. |
| Reading plan grid breakpoints | `grid-cols-1 sm:grid-cols-2` (drop `lg:grid-cols-3 2xl:grid-cols-4`) | Spec: 2-column desktop, 1-column mobile. At sm (640px+), 2 columns. Below sm, 1 column. Matches spec exactly. |
| Focus mode legacy migration | One-time `wr_bible_focus_v2_migrated` flag | Least-destructive: runs once per browser. Users who had explicit `'true'` lose their preference once — re-enabling is a single toggle. Prevents the silent "my toolbar is fading" bug from persisting. |
| ChapterHeading removal from BibleReader body | Delete the `<ChapterHeading>` JSX usage + remove the import | Spec: "Remove the static heading in the reader body. The top toolbar version is the canonical display". ChapterHeading component file can stay (unused components are fine; removing them is a separate concern). Actually: check whether ChapterHeading is imported elsewhere before leaving the file — if unused elsewhere, delete the file too. |
| My Bible heading style | Single-line `<h1>` with `GRADIENT_TEXT_STYLE` containing "My Bible" | Matches PlanBrowserPage single-line heading. Keeps visual-h1 hidden via `sr-only` class removal (the gradient h1 IS the h1 — no double h1). |
| Conversion card layout | Centered FrostedCard, max-width ~480px, vertical stack: h1 → description → CTA | Matches the minimal card aesthetic in the spec (§4). Use Pattern 2 primary CTA with the white drop shadow for emotional weight. |

---

## Implementation Steps

### Step 1: Layout Edge-to-Edge Dark Background

**Objective:** Eliminate light gray gutters from every route that uses `<Layout>`, by making the Layout outer wrapper always render `bg-hero-bg`.

**Files to create/modify:**
- `frontend/src/components/Layout.tsx` — change outer wrapper bg; `dark` prop becomes no-op.

**Details:**

Current `Layout.tsx:14-17`:
```tsx
<div className={cn(
  'flex min-h-screen flex-col overflow-x-hidden font-sans',
  dark ? 'bg-dashboard-dark' : 'bg-neutral-bg',
)}>
```

Change to:
```tsx
<div className="flex min-h-screen flex-col overflow-x-hidden bg-hero-bg font-sans">
```

Remove the `cn(...)` import if it becomes unused. Remove the `dark` prop from the `LayoutProps` interface (line 9) and from the destructuring (line 12). If any page passes `<Layout dark>`, the prop is now unknown but React will emit a TypeScript error — accept the compiler's help to find and update those call sites. (Known call sites: `AccessibilityPage.tsx:6`, `BibleLanding.tsx:138`. Both should drop the `dark` prop.)

Also update the two `.dark` callers:
- `frontend/src/pages/AccessibilityPage.tsx:6` — change `<Layout dark>` to `<Layout>`.
- `frontend/src/pages/BibleLanding.tsx:138` — change `<Layout dark>` to `<Layout>`.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): outer wrapper `bg-hero-bg` extends edge-to-edge. Content zone `max-w-7xl` centered. No gray gutters.
- Tablet (768px): same — dark bg fills viewport.
- Mobile (375px): no visual change; content was already full-width.

**Guardrails (DO NOT):**
- DO NOT remove the `<main>` wrapper or its `max-w-7xl` constraint — content width is intentional.
- DO NOT change the Layout's `hero` prop handling (still renders `<Navbar transparent />` when a hero is provided).
- DO NOT touch `Home.tsx`, `SharedVerse.tsx`, `SharedPrayer.tsx` — they do not use Layout.
- DO NOT change `bg-neutral-bg` references in Tailwind config or other files — the token is still valid for explicit use (e.g., on the homepage's light section).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Layout renders `bg-hero-bg` on outer wrapper | unit | Render `<Layout>children</Layout>`, query outermost div, assert class list contains `bg-hero-bg`. |
| Layout does NOT render `bg-neutral-bg` | unit | Same setup — assert outer div className does NOT contain `bg-neutral-bg`. |
| AccessibilityPage renders with Layout (no `dark` prop) | unit | Render AccessibilityPage, assert it still mounts without runtime error. |
| BibleLanding renders with Layout (no `dark` prop) | unit | Render BibleLanding, assert same. |

**Expected state after completion:**
- [ ] `Layout.tsx` outer div always has `bg-hero-bg`.
- [ ] `dark` prop removed from `LayoutProps`.
- [ ] AccessibilityPage and BibleLanding no longer pass `dark`.
- [ ] All Layout-consuming pages render without compile errors.
- [ ] Tests pass.

---

### Step 2: Align Bible Page Inner Backgrounds with `bg-hero-bg`

**Objective:** Ensure Bible page inner wrappers use `bg-hero-bg` so there is no color seam between Layout's outer div and the page's inner div.

**Files to create/modify:**
- `frontend/src/pages/BibleLanding.tsx` — inner div at line 140.
- `frontend/src/pages/MyBiblePage.tsx` — inner div at line 169.
- `frontend/src/pages/BibleBrowse.tsx` — inner div at line 12.
- `frontend/src/pages/bible/PlanBrowserPage.tsx` — inner div at line 31.

**Details:**

In each file, change `bg-dashboard-dark` → `bg-hero-bg` on the `<div className="...min-h-screen...">` wrapper that houses the page content.

Example — `BibleLanding.tsx:140`:
```tsx
<div className="relative min-h-screen bg-hero-bg">
```

Example — `MyBiblePage.tsx:169`:
```tsx
<div className="relative min-h-screen max-w-[100vw] overflow-hidden bg-hero-bg">
```

Example — `BibleBrowse.tsx:12`:
```tsx
<div className="min-h-screen bg-hero-bg">
```

Example — `PlanBrowserPage.tsx:31`:
```tsx
<div className="min-h-screen bg-hero-bg">
```

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop/Tablet/Mobile: inner and outer bg now match exactly. No seam at any viewport.

**Guardrails (DO NOT):**
- DO NOT change `bg-dashboard-dark` on BibleReader or any non-Bible page — that's out of scope.
- DO NOT modify the `BibleLandingOrbs` atmospheric layer or the z-index stacking.
- DO NOT change the `ATMOSPHERIC_HERO_BG` inline style on the hero sections — that's an overlay gradient layer on top of the solid bg.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleLanding inner div uses `bg-hero-bg` | unit | Render, query the inner wrapper, assert class includes `bg-hero-bg`. |
| MyBiblePage inner div uses `bg-hero-bg` | unit | Same pattern. |
| BibleBrowse inner div uses `bg-hero-bg` | unit | Same pattern. |
| PlanBrowserPage inner div uses `bg-hero-bg` | unit | Same pattern. |

**Expected state after completion:**
- [ ] No `bg-dashboard-dark` on Bible page inner wrappers.
- [ ] All 4 Bible page types show edge-to-edge dark bg at 1440px and below.
- [ ] Tests pass.

---

### Step 3: Reduce "Your Study Bible" Top Padding + Hide Streak for Logged-Out Users

**Objective:** Move the "Your Study Bible" heading closer to the navbar; hide StreakChip / streak stat card on Bible pages when logged out.

**Files to create/modify:**
- `frontend/src/components/bible/landing/BibleHero.tsx` — top padding.
- `frontend/src/pages/BibleLanding.tsx` — wrap StreakChip in auth check.
- `frontend/src/pages/__tests__/BibleLanding.test.tsx` — auth-gated streak tests.
- `frontend/src/components/bible/landing/__tests__/BibleHero.test.tsx` (if exists, else skip) — padding class assertion.

**Details:**

**3a — BibleHero padding:**

In `BibleHero.tsx:8`, change:
```tsx
className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
```
To:
```tsx
className="relative flex w-full flex-col items-center px-4 pt-12 pb-8 text-center antialiased sm:pt-16 sm:pb-12 lg:pt-20"
```

**3b — Hide StreakChip on BibleLanding:**

In `BibleLanding.tsx`, add at the top of `BibleLandingInner` (after existing `useState`/hook calls, e.g., right after `const { isOpen, close, toggle } = useBibleDrawer()` on line 82):
```tsx
import { useAuth } from '@/hooks/useAuth'
// ...
const { isAuthenticated } = useAuth()
```

Update the StreakChip render at line 150 from:
```tsx
{streak.currentStreak > 0 && (
  <div className="flex justify-center">
    <StreakChip ... />
  </div>
)}
```
To:
```tsx
{isAuthenticated && streak.currentStreak > 0 && (
  <div className="flex justify-center">
    <StreakChip ... />
  </div>
)}
```

Note: `MyBiblePage`'s streak stat card (line 242-253) is ALSO controlled by this — but since Step 4 auth-gates the entire MyBible page to render a conversion card for logged-out users, the streak stat card won't render for logged-out users by consequence. No additional change needed inside MyBiblePage for requirement 3.

**Auth gating:**
- BibleLanding StreakChip: hidden when `!isAuthenticated`. No auth modal. Simply absent.

**Responsive behavior:**
- Desktop (1440px): "Your Study Bible" heading at 80px from hero top (post-Navbar). Tighter vertical rhythm.
- Tablet (768px): 64px top padding — 16-24px below navbar.
- Mobile (375px): 48px top padding.

**Guardrails (DO NOT):**
- DO NOT remove the StreakChip component. It still runs for logged-in users.
- DO NOT remove `streak.currentStreak > 0` check — the logged-in user with zero streak still sees nothing.
- DO NOT modify `useStreakStore()` — the streak logic still runs for dev/demo purposes per spec.
- DO NOT change `pb-8` / `sm:pb-12` — only top padding is reduced. Bottom spacing to content divider is intentional.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleHero applies `pt-12 sm:pt-16 lg:pt-20` | unit | Render BibleHero, query `<section>`, assert className contains `pt-12`, `sm:pt-16`, `lg:pt-20`. |
| BibleLanding hides StreakChip when logged out | unit | Render BibleLanding with `AuthProvider` simulating logged-out state (`wr_auth_simulated=false`) + seeded streak value > 0 → assert `queryByLabelText(/Reading streak/i)` is null. |
| BibleLanding shows StreakChip when logged in with streak > 0 | unit | Same setup but logged-in + streak > 0 → assert StreakChip is present. |

**Expected state after completion:**
- [ ] "Your Study Bible" sits in the upper third of the viewport.
- [ ] Streak pill absent on `/bible` when logged out, present when logged in.
- [ ] No streak-related UI elsewhere on `/bible` (verify by search for `useStreakStore` calls on BibleLanding — only one usage).
- [ ] Tests pass.

---

### Step 4: Auth-Gate My Bible Page (Conversion Card for Logged-Out Users)

**Objective:** When `!isAuthenticated`, render a centered FrostedCard conversion prompt on `/bible/my` instead of the full activity feed.

**Files to create/modify:**
- `frontend/src/pages/MyBiblePage.tsx` — add auth check and conversion card branch.
- `frontend/src/pages/__tests__/MyBiblePage.test.tsx` — logged-in vs logged-out assertions.

**Details:**

In `MyBiblePage.tsx`, import `useAuth` and `useAuthModal`:
```tsx
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

Inside `MyBiblePageInner` (after the existing `useNavigate` + `useBibleDrawer` hooks, approximately line 63):
```tsx
const { isAuthenticated } = useAuth()
const authModal = useAuthModal()
```

After hook declarations but before all the `useActivityFeed()` + `useMemo()` blocks (to avoid running all that work for logged-out users), add an early return:
```tsx
if (!isAuthenticated) {
  return (
    <Layout>
      <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />
      <div className="relative min-h-screen bg-hero-bg">
        <BibleLandingOrbs />
        <section
          className="relative z-10 mx-auto flex min-h-[calc(100vh-20rem)] max-w-[480px] items-center justify-center px-4"
        >
          <FrostedCard as="article" className="w-full text-center">
            <h1
              className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
              style={GRADIENT_TEXT_STYLE}
            >
              My Bible
            </h1>
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              Track your reading journey, highlights, notes, and bookmarks across all your devices.
            </p>
            <button
              type="button"
              onClick={() => authModal?.openAuthModal('Sign in to track your Bible reading journey')}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
            >
              Get Started — It's Free
            </button>
          </FrostedCard>
        </section>
      </div>
    </Layout>
  )
}
```

Leave the rest of `MyBiblePageInner` untouched — it renders for authenticated users as before.

Verify that all stores/hooks still work for the logged-in branch (the existing code is unchanged).

**Auth gating:**
- `useAuth()` check at top of component.
- CTA button calls `authModal?.openAuthModal('Sign in to track your Bible reading journey')` — the existing auth modal flow handles the rest.

**Responsive behavior:**
- Desktop (1440px): conversion card centered horizontally, `max-w-[480px]`, vertically centered in viewport via `min-h-[calc(100vh-20rem)]` + flex centering.
- Tablet (768px): same centering, card fills width within 480px cap.
- Mobile (375px): card full-width within viewport padding; stacked vertically.

**Guardrails (DO NOT):**
- DO NOT remove the existing MyBiblePage content — it stays for logged-in users.
- DO NOT hoist the `useAuth` check into the `MyBiblePage` outer wrapper (`BibleDrawerProvider` still wraps the Inner component — keeping the check inside `MyBiblePageInner` is correct).
- DO NOT add a Redirect/Navigate — spec requires rendering the conversion card in place at `/bible/my`, not redirecting.
- DO NOT forget `focus-visible` ring on the CTA button (accessibility requirement from spec §Non-Functional).
- DO NOT hardcode colors in rgba — use the exact `shadow-[...]` class from the design system Pattern 2 CTA.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Shows conversion card when logged out | integration | Render MyBiblePage with `AuthProvider` in logged-out state. Assert `getByRole('heading', { name: /My Bible/i })` in the FrostedCard AND `getByRole('button', { name: /Get Started — It's Free/i })` are present. |
| Does not show heatmap/progress map when logged out | integration | Same setup — assert `ReadingHeatmap` and `BibleProgressMap` are NOT rendered (query by test id or heading absence). |
| CTA button opens auth modal when clicked | integration | Render MyBiblePage logged out. Click the CTA. Assert auth modal is visible with the correct subtitle "Sign in to track your Bible reading journey". |
| Shows full experience when logged in | integration | Render MyBiblePage with logged-in state. Assert ReadingHeatmap, BibleProgressMap, MemorizationDeck headings/landmarks are present. |
| CTA button has visible focus ring | unit | Focus the button; assert `focus-visible:ring-2` class is present and computes a visible ring. |

**Expected state after completion:**
- [ ] Logged-out users at `/bible/my` see the centered FrostedCard with "My Bible" heading, description, and white pill CTA.
- [ ] CTA opens auth modal with correct subtitle.
- [ ] Logged-in users see the full experience (heatmap, progress map, memorization deck, activity feed).
- [ ] No regression in tests.

---

### Step 5: "Read in Context" Scroll Fix

**Objective:** Clicking "Read in context" on Verse of the Day navigates to `/bible/:book/:chapter` (no `scroll-to` param) so the user lands at the top of the chapter.

**Files to create/modify:**
- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — remove `scroll-to` query param from the Link `to`.

**Details:**

In `VerseOfTheDay.tsx`, remove the `scrollToParam` construction (lines 111-116) and simplify the Link `to` prop.

Change line 113-116 (delete these lines):
```tsx
const scrollToParam =
  entry.endVerse > entry.startVerse
    ? `${entry.startVerse}-${entry.endVerse}`
    : String(entry.startVerse)
```

Change line 143:
```tsx
to={`/bible/${entry.book}/${entry.chapter}?scroll-to=${scrollToParam}`}
```
To:
```tsx
to={`/bible/${entry.book}/${entry.chapter}`}
```

After this change:
1. React Router navigates from `/bible` to `/bible/john/3`.
2. `ScrollToTop.tsx:8` fires `window.scrollTo(0, 0)` on pathname change.
3. `BibleReader.tsx:412-418` runs: `scroll-to` is absent → `scrollToParamRef.current` is null → the `else` branch runs → `window.scrollTo({ top: 0 })` (redundant but harmless).
4. User lands at top of chapter. They see verses 1, 2, 3, ... and scroll to find the target verse naturally.

**Auth gating:** N/A.

**Responsive behavior:** N/A — pure navigation change.

**Guardrails (DO NOT):**
- DO NOT change `BibleReader.tsx`'s `scroll-to` handling logic — other callers (deep links from search results, push notifications, memorization deck, progress map cells, echo cards) depend on verse-level scroll positioning.
- DO NOT remove the `scroll-to` param mechanism from `BibleReader` — it's still valid for deep links. Only this specific "Read in context" click changes.
- DO NOT change the verse `<cite>` or verse text rendering.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Read in context Link does not include scroll-to param | unit | Render VerseOfTheDay with seeded VotD. Query the "Read in context" link. Assert `getAttribute('href')` matches `/bible/:book/:chapter` EXACTLY (no query string). |
| Navigating to the Link lands user at pathname without scroll-to | integration | Click the Link via RTL. Assert `location.pathname` is `/bible/:book/:chapter` and `location.search` is empty. |

**Expected state after completion:**
- [ ] "Read in context" Link `to` prop has no `?scroll-to=`.
- [ ] Navigation lands at top of chapter — verified in Step 10 manual check.
- [ ] `scrollToParam` variable and its construction logic are removed.
- [ ] Tests pass.

---

### Step 6: Replace Browse Books Animation with Instant Swap

**Objective:** Remove the sliding animation in `DrawerViewRouter` that stutters when navigating book → chapters. Always render only the current view.

**Files to create/modify:**
- `frontend/src/components/bible/DrawerViewRouter.tsx` — remove transition state machine.
- `frontend/src/components/bible/__tests__/DrawerViewRouter.test.tsx` (if exists, else inline in existing drawer tests) — update assertions.

**Details:**

Simplify `DrawerViewRouter.tsx` to always render only the current view. Replace the full file body with:

```tsx
import { useBibleDrawer, type DrawerView } from '@/components/bible/BibleDrawerProvider'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'
import { ChapterPickerView } from '@/components/bible/books/ChapterPickerView'

const VIEW_COMPONENTS: Record<
  string,
  React.ComponentType<{ onClose: () => void }>
> = {
  books: BooksDrawerContent,
  chapters: ChapterPickerView,
}

interface DrawerViewRouterProps {
  onClose: () => void
}

export function DrawerViewRouter({ onClose }: DrawerViewRouterProps) {
  const { currentView } = useBibleDrawer()
  const Component = VIEW_COMPONENTS[currentView.type]
  if (!Component) return null

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full w-full">
        <Component onClose={onClose} />
      </div>
    </div>
  )
}
```

This removes:
- `TRANSITION_MS` constant
- `TransitionState` interface
- `transition` state + `setTransition` call
- The `useEffect` that orchestrated the transition
- The `prevViewRef` / `prevStackLenRef` refs
- The `useReducedMotion()` hook (now unneeded)
- The dual-mount branch during transitions
- The `renderView` helper

Remove the unused imports: `useEffect`, `useRef`, `useState` from React, `useReducedMotion`, `cn` from utils (unless used elsewhere — re-check after edit).

Also review `tailwind.config.js` to see if `animate-view-slide-in`, `animate-view-slide-out`, `animate-view-slide-back-in` are used anywhere else. If not, they can be removed in a future cleanup (DO NOT remove them in this spec — out of scope; they're deadweight but harmless until a separate sweep).

**Auth gating:** N/A.

**Responsive behavior:** N/A — no UI change at any breakpoint, just animation removal.

**Guardrails (DO NOT):**
- DO NOT delete `tailwind.config.js` keyframe definitions in this spec — future cleanup.
- DO NOT change `BibleDrawerProvider` or `BibleDrawer` — they still control drawer open/close independently of view transitions.
- DO NOT add a shorter animation instead — the spec says INSTANT swap is acceptable.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| DrawerViewRouter renders the books view initially | unit | Wrap in `BibleDrawerProvider` (default state is 'books'). Render. Assert BooksDrawerContent is in document. |
| DrawerViewRouter swaps to chapters view on `pushView` | unit | Render, call `pushView({ type: 'chapters', bookSlug: 'john' })` via provider API. Assert ChapterPickerView is in document AND BooksDrawerContent is NOT. |
| No transition class is applied | unit | Assert no element has `animate-view-slide-*` classes after a view change. |

**Expected state after completion:**
- [ ] DrawerViewRouter renders only the current view (no dual mount).
- [ ] Book → chapters transition is instant with no stutter.
- [ ] Reduced motion users see the same instant swap (consistent).
- [ ] Existing drawer tests still pass (may need updates for removed props/behavior).

---

### Step 7: Reading Plan Cards — Frosted Glass Redesign

**Objective:** Replace the colored gradient backgrounds on reading plan cards with frosted glass styling matching the homepage `DashboardPreviewCard` aesthetic.

**Files to create/modify:**
- `frontend/src/components/bible/plans/PlanBrowseCard.tsx` — card styling.
- `frontend/src/components/bible/plans/PlanInProgressCard.tsx` — card styling.
- `frontend/src/components/bible/plans/PlanCompletedCard.tsx` — card styling.
- `frontend/src/components/bible/plans/__tests__/*.test.tsx` (if exist) — update styling assertions.

**Details:**

**PlanBrowseCard.tsx** — replace the Link's className:

From:
```tsx
className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${plan.coverGradient} p-5 transition-all motion-reduce:transition-none duration-base motion-safe:hover:-translate-y-1 hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`}
```
To:
```tsx
className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
```

Remove the dark scrim `<div className="absolute inset-0 bg-gradient-to-t ..." />` (no longer needed — text already on dark background).

Keep the existing text classes: `text-white`, `text-white/60`, `text-white/50` per spec §7.

**PlanInProgressCard.tsx** — similar pattern. The card's outer div uses gradient; replace with frosted glass:

From:
```tsx
className={`relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${plan.coverGradient} p-5`}
```
To:
```tsx
className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.08] hover:border-white/20"
```

Remove the scrim div. The "Continue" button inside keeps its existing styling (already white-pill-styled).

**PlanCompletedCard.tsx** — similar pattern:

From:
```tsx
className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${plan.coverGradient} p-5 opacity-85 transition-all motion-reduce:transition-none duration-base motion-safe:hover:-translate-y-1 hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`}
```
To:
```tsx
className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 opacity-85 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
```

Remove the scrim div. Keep the "Completed" badge at top-right.

**Auth gating:** N/A.

**Responsive behavior:**
- All breakpoints: cards are now frosted glass with visible border. Identical look regardless of plan.

**Guardrails (DO NOT):**
- DO NOT remove the `aspect-[4/3]` aspect ratio — grid sizing depends on it.
- DO NOT delete `plan.coverGradient` from the `PlanMetadata` type — other features may use it (future visual treatments, shareable cards). Just stop using it in these three components.
- DO NOT change the hover `-translate-y-1` to spring or bounce — stays at linear `transition-all`.
- DO NOT change the "Continue" button style — it's already styled per white-pill Pattern 1.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PlanBrowseCard uses frosted glass classes | unit | Render with a plan. Query the Link. Assert className contains `bg-white/5`, `backdrop-blur-sm`, `border-white/10`, `rounded-2xl`. |
| PlanBrowseCard does NOT use gradient bg | unit | Assert className does NOT contain `bg-gradient-to-br`. |
| PlanBrowseCard does NOT render dark scrim | unit | Assert no child div with class `bg-gradient-to-t` exists inside the Link. |
| PlanInProgressCard uses frosted glass | unit | Same pattern. |
| PlanCompletedCard uses frosted glass | unit | Same pattern. |

**Expected state after completion:**
- [ ] All 3 plan card types use `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`.
- [ ] Hover: `hover:bg-white/[0.08] hover:border-white/20`.
- [ ] No colored gradient backgrounds.
- [ ] No dark scrim divs.
- [ ] Tests pass.

---

### Step 8: Reading Plans Page Fixes (Heading + Filters + Grid)

**Objective:** Fix clipped heading, remove Theme/Duration filter UI, change grid to 2-column desktop / 1-column mobile.

**Files to create/modify:**
- `frontend/src/pages/bible/PlanBrowserPage.tsx` — heading class + remove PlanFilterBar.
- `frontend/src/components/bible/plans/PlanBrowserSection.tsx` — grid classes.
- `frontend/src/pages/bible/__tests__/PlanBrowserPage.test.tsx` (if exists) — assertions.
- `frontend/src/components/bible/plans/__tests__/PlanBrowserSection.test.tsx` (if exists) — assertions.

**Details:**

**8a — Heading clip fix:**

In `PlanBrowserPage.tsx:37-39`, change:
```tsx
<h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
  Reading Plans
</h1>
```
To:
```tsx
<h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
  Reading Plans
</h1>
```

Adding `pb-2` provides 8px of bottom padding so the `background-clip: text` doesn't clip descenders on lowercase "g" in "Reading."

**8b — Remove PlanFilterBar:**

In `PlanBrowserPage.tsx`, delete lines 46-52:
```tsx
<PlanFilterBar
  theme={theme}
  duration={duration}
  onThemeChange={setTheme}
  onDurationChange={setDuration}
/>
```

Remove the import on line 6: `import { PlanFilterBar } from '@/components/bible/plans/PlanFilterBar'`.

Also remove the now-unused destructured values from `usePlanBrowser()`:
```tsx
const { sections, filteredBrowse, clearFilters, isEmpty, isFilteredEmpty, isAllStarted } = usePlanBrowser()
```
(drop `theme`, `duration`, `setTheme`, `setDuration`).

The hook still runs with its internal default filter state (`'all'` theme, `'any'` duration) which means `filteredBrowse` returns the full plan list — no plans filtered out. `clearFilters` is still used by the empty-state "filtered-out" variant, though with filters hidden the filtered-out state should never trigger; leave the prop for safety. Actually, `clearFilters` is still referenced in `PlanBrowserEmptyState variant="filtered-out"` — but the variant can no longer be reached with filters absent. That's fine; it's dead code under these conditions but not harmful.

Do NOT delete `PlanFilterBar.tsx` or `PlanFilterPill.tsx` files — future re-enable may need them. Just stop rendering PlanFilterBar.

**8c — Grid column change:**

In `PlanBrowserSection.tsx:15`, change:
```tsx
<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
```
To:
```tsx
<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
```

This produces 1-column below 640px (`sm`) and 2-column at 640px and above.

**Auth gating:** N/A.

**Responsive behavior:**
- Mobile (375px): 1-column grid of plan cards.
- Tablet (768px): 2-column grid.
- Desktop (1440px): 2-column grid (not 3, not 4).
- The cards may be wider at desktop due to the 2-column constraint and `max-w-6xl` container — that's acceptable and matches the spec intent of "not too spread."

**Guardrails (DO NOT):**
- DO NOT delete the PlanFilterBar / PlanFilterPill component files — potential future re-enable.
- DO NOT change the PlanFilterBar component's internals — only its render site is removed.
- DO NOT change `usePlanBrowser()` hook signature — filters can still be applied programmatically via future URL params.
- DO NOT change `max-w-6xl` on the content wrapper.
- DO NOT change "In progress" / "Browse plans" / "Completed" section headings or their order.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Reading Plans heading includes `pb-2` | unit | Render PlanBrowserPage. Query `<h1>`. Assert className contains `pb-2`. |
| Reading Plans heading uses gradient | unit | Assert `style.background` or `background-image` applied via `GRADIENT_TEXT_STYLE`. |
| PlanFilterBar is NOT rendered | unit | Render PlanBrowserPage. Assert `queryByRole('nav', { name: /Plan filters/i })` is null. |
| No Theme/Duration labels visible | unit | Render, assert `queryByText(/Theme/i)` and `queryByText(/Duration/i)` in the filter nav are null. |
| Grid uses `grid-cols-1 sm:grid-cols-2` | unit | Render `<PlanBrowserSection>` with 4 children. Query the inner grid div. Assert className includes `grid-cols-1` and `sm:grid-cols-2` and does NOT include `lg:grid-cols-3` or `2xl:grid-cols-4`. |

**Expected state after completion:**
- [ ] "Reading Plans" heading renders without clipping descenders.
- [ ] No filter UI on PlanBrowserPage.
- [ ] Plan cards in 2-column grid at tablet and desktop, 1-column mobile.
- [ ] Tests pass.

---

### Step 9: BibleReader Toolbar Persistence (Focus Mode Migration + Remove Static Chapter Heading)

**Objective:** Migrate legacy users stuck with `wr_bible_focus_enabled='true'` so their toolbar no longer fades; remove the redundant static ChapterHeading from the reader body.

**Files to create/modify:**
- `frontend/src/hooks/useFocusMode.ts` — add one-time migration in `loadSettings()`.
- `frontend/src/hooks/__tests__/useFocusMode.test.ts` — migration tests.
- `frontend/src/pages/BibleReader.tsx` — remove ChapterHeading usage.
- `frontend/src/pages/__tests__/BibleReader.test.tsx` (if exists) — assert no static chapter heading.
- `.claude/rules/11-local-storage-keys.md` — document `wr_bible_focus_v2_migrated`.

**Details:**

**9a — Focus mode migration:**

In `useFocusMode.ts`, add a constant and update `loadSettings`:

```tsx
const KEY_MIGRATION_V2 = 'wr_bible_focus_v2_migrated'

function loadSettings(): FocusModeSettings {
  // One-time migration: legacy users with wr_bible_focus_enabled='true' from
  // before BB-50 still have focus mode auto-activating. Reset to default (false)
  // once per browser, then honor the user's explicit toggle going forward.
  const migrated = localStorage.getItem(KEY_MIGRATION_V2)
  if (migrated !== 'true') {
    const legacyValue = localStorage.getItem(KEY_ENABLED)
    if (legacyValue === 'true') {
      localStorage.removeItem(KEY_ENABLED)
    }
    localStorage.setItem(KEY_MIGRATION_V2, 'true')
  }

  const enabled = localStorage.getItem(KEY_ENABLED)
  const delay = localStorage.getItem(KEY_DELAY)
  const dimOrbs = localStorage.getItem(KEY_DIM_ORBS)

  return {
    enabled: enabled !== null ? enabled === 'true' : DEFAULT_SETTINGS.enabled,
    delay: delay !== null ? Number(delay) : DEFAULT_SETTINGS.delay,
    dimOrbs: dimOrbs !== null ? dimOrbs === 'true' : DEFAULT_SETTINGS.dimOrbs,
  }
}
```

After this runs:
- New users: no change (both keys absent, settings default to `false`).
- Legacy users with `wr_bible_focus_enabled='true'`: legacy value is removed, migration flag set. `enabled` reads as `null` → default `false` → toolbar stays visible.
- Legacy users with `wr_bible_focus_enabled='false'`: legacy value preserved (no action; only `'true'` triggers the reset), migration flag set.
- Post-migration users who toggle focus mode ON: `updateFocusSetting('enabled', true)` writes `'true'` via `saveSettings`. Migration flag is already set, so next load reads their explicit preference.

**9b — Remove static ChapterHeading:**

In `BibleReader.tsx`:
- Line 10: remove the import `import { ChapterHeading } from '@/components/bible/reader/ChapterHeading'`.
- Line 843: remove the `<ChapterHeading bookName={book.name} chapter={chapterNumber} />` line.

The surrounding fragment becomes:
```tsx
) : (
  <>
    <ReaderBody
      verses={verses}
      bookSlug={bookSlug!}
      ...
    />
```

Check if `ChapterHeading` is imported elsewhere — if not, the component file `frontend/src/components/bible/reader/ChapterHeading.tsx` becomes orphaned. Per spec, we remove the in-body rendering. The component file itself can remain — a future cleanup spec can delete unused components; scope creep to delete it here.

**9c — Document localStorage key:**

In `.claude/rules/11-local-storage-keys.md`, under the "Bible Reader" section, add a new row:

```
| `wr_bible_focus_v2_migrated`              | `'true'`                                                                                                                      | One-time migration flag (BB-51). When absent, legacy `wr_bible_focus_enabled='true'` values are reset to default (`false`). Set once per browser. Does not track feature state, only migration completion. |
```

**Auth gating:** N/A.

**Responsive behavior:**
- All breakpoints: toolbar stays at full opacity (post-migration). No fade timer. No visual difference from user's perspective except the static chapter heading is gone from the reader body.

**Guardrails (DO NOT):**
- DO NOT delete `ChapterHeading.tsx` file in this spec — keep component files for potential reuse.
- DO NOT rename `KEY_ENABLED` or any other existing focus mode keys.
- DO NOT change the default value (`false`) in `DEFAULT_SETTINGS` — it was already correct post-BB-50.
- DO NOT skip writing the migration flag if the legacy value was `'false'` — still write the flag so migration runs once total per browser.
- DO NOT run the migration inside `useEffect` — it belongs in `loadSettings()` so the `useState(loadSettings)` call gets a clean initial value. Running migration via `useEffect` would cause a render with `enabled=true` before the reset takes effect (flash of focus mode).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Migration resets legacy `'true'` focus mode | unit | Set `localStorage.setItem('wr_bible_focus_enabled', 'true')` and ensure `wr_bible_focus_v2_migrated` is absent. Call `loadSettings()` (or render `useFocusMode`). Assert returned `settings.enabled === false` AND `localStorage.getItem('wr_bible_focus_enabled')` returns `null` AND `localStorage.getItem('wr_bible_focus_v2_migrated') === 'true'`. |
| Migration preserves legacy `'false'` focus mode | unit | Set `wr_bible_focus_enabled='false'` and flag absent. Call `loadSettings()`. Assert `settings.enabled === false` AND `wr_bible_focus_enabled === 'false'` (preserved) AND flag is `'true'`. |
| Migration does not re-run when flag is set | unit | Set both `wr_bible_focus_enabled='true'` and `wr_bible_focus_v2_migrated='true'`. Call `loadSettings()`. Assert `settings.enabled === true` (respected, no reset) AND `wr_bible_focus_enabled === 'true'` (preserved). |
| User can toggle focus mode on after migration | unit | After migration, call `updateFocusSetting('enabled', true)`. Reload via new `loadSettings()`. Assert `settings.enabled === true`. |
| New user defaults to `enabled: false` | unit | Clear localStorage. Call `loadSettings()`. Assert `settings.enabled === false` AND migration flag is set. |
| BibleReader no longer renders ChapterHeading | unit | Render BibleReader with a mocked chapter. Assert `queryByRole('heading', { level: 1 })` inside `<main>` (reader body) does NOT contain the large chapter number display. The top toolbar `{bookName} {chapter}` button remains. |

**Expected state after completion:**
- [ ] Legacy users no longer see the fading toolbar.
- [ ] New users see a persistent toolbar by default.
- [ ] Users can still opt into focus mode via the toolbar toggle.
- [ ] Static chapter heading removed from reader body.
- [ ] `wr_bible_focus_v2_migrated` documented in `11-local-storage-keys.md`.
- [ ] Tests pass.

---

### Step 10: My Bible Heading Style + BibleProgressMap Contrast

**Objective:** Change "My Bible" heading to single-line gradient; increase contrast between read and unread chapter cells.

**Files to create/modify:**
- `frontend/src/pages/MyBiblePage.tsx` — replace SectionHeading with inline gradient h1.
- `frontend/src/pages/__tests__/MyBiblePage.test.tsx` — heading assertions.
- `frontend/src/components/bible/my-bible/BibleProgressMap.tsx` — chapter cell bg classes.
- `frontend/src/components/bible/my-bible/__tests__/BibleProgressMap.test.tsx` — cell contrast assertions.

**Details:**

**10a — My Bible heading:**

In `MyBiblePage.tsx`, replace lines 174-177:

From:
```tsx
<div className="mx-auto max-w-2xl text-center">
  <h1 className="sr-only">My Bible</h1>
  <SectionHeading topLine="My" bottomLine="Bible" className="[&_span:last-child]:max-w-full [&_span:last-child]:break-words [&_span:last-child]:!text-3xl [&_span:last-child]:sm:!text-4xl" />
  <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
</div>
```
To:
```tsx
<div className="mx-auto max-w-2xl text-center">
  <h1
    className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
    style={GRADIENT_TEXT_STYLE}
  >
    My Bible
  </h1>
  <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
</div>
```

Remove the `sr-only` h1 (the gradient h1 IS the visible h1 now). Remove the `SectionHeading` import if unused elsewhere in the file. Add `GRADIENT_TEXT_STYLE` import from `@/constants/gradients` if not already imported.

**10b — BibleProgressMap contrast:**

In `BibleProgressMap.tsx:101-105`, change:
```tsx
state === 'unread' && 'bg-white/10',
state === 'read' && 'bg-white/40',
state === 'highlighted' && 'bg-white',
```
To:
```tsx
state === 'unread' && 'bg-white/[0.06]',
state === 'read' && 'bg-white/80',
state === 'highlighted' && 'bg-white',
```

`bg-white/[0.06]` is equivalent to `bg-white/6` but Tailwind only provides fixed percentages up to `/100` in steps of `/5` — use arbitrary value syntax `bg-white/[0.06]`.

**Auth gating:** N/A for the map. The heading is only seen by logged-in users per Step 4's auth gate.

**Responsive behavior:**
- My Bible heading: single line scales from `text-3xl` (30px mobile) to `text-5xl` (48px desktop). `pb-2` prevents gradient clip.
- Progress map cells: unchanged size (`h-1.5 w-1.5 sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5`), only contrast changes.

**Guardrails (DO NOT):**
- DO NOT remove the subhead `<p>` — dynamic subhead (e.g., "15 highlights, 3 notes, across 4 books") still renders.
- DO NOT change the `ChapterState` type or `getChapterState()` logic — only the CSS class values change.
- DO NOT alter the hover `hover:opacity-80` transition on the chapter cells.
- DO NOT add purple/primary colors back — white-only tiers.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| MyBible heading renders as single `<h1>` with gradient | unit | Render MyBiblePage logged-in. Query `<h1>`. Assert `textContent === 'My Bible'` (single element, not split across spans). Assert inline style contains `background-clip: text` or equivalent from `GRADIENT_TEXT_STYLE`. |
| MyBible heading includes `pb-2` | unit | Assert className includes `pb-2`. |
| MyBible heading is not split into "My" + "Bible" lines | unit | Assert no child `<span>` with `bottomLine` semantics. |
| Progress map unread cells use `bg-white/[0.06]` | unit | Render BookCard with an unread chapter. Assert cell className includes `bg-white/[0.06]`. |
| Progress map read cells use `bg-white/80` | unit | Render BookCard with a read chapter. Assert `bg-white/80`. |
| Progress map highlighted cells still use `bg-white` | unit | Render BookCard with a highlighted chapter. Assert `bg-white` (no opacity modifier). |
| No purple classes remain | unit | Guard: assert no rendered element has className containing `bg-primary`. |

**Expected state after completion:**
- [ ] "My Bible" renders as a single-line gradient heading.
- [ ] No descenders clipped.
- [ ] Progress map unread cells visible but subtle (`bg-white/[0.06]`).
- [ ] Progress map read cells clearly filled (`bg-white/80`).
- [ ] Tests pass.

---

### Step 11: Final Verification

**Objective:** Run all checks and manually verify integrated behavior across browsers.

**Files to create/modify:** None (verification only).

**Details:**

1. Run `pnpm lint` (from `frontend/`) — must be clean.
2. Run `pnpm test` (from `frontend/`) — all tests must pass (with updates from Steps 1-10).
3. Run `pnpm build` — must succeed.
4. Manual browser verification (user runs `pnpm dev`):
   - Navigate to `/bible` at 1440px — no gray gutters, heading sits in upper third.
   - Navigate to `/bible` at 375px — no regression, no horizontal scrolling.
   - Navigate to `/bible/my` while logged out — see centered FrostedCard with "My Bible" + description + "Get Started — It's Free" CTA. Click CTA → auth modal appears with correct subtitle.
   - Log in (via simulated auth) → navigate to `/bible/my` → see heatmap, progress map, memorization deck.
   - Verify "My Bible" heading is single-line gradient.
   - Verify progress map read cells are clearly filled (not washed out).
   - Navigate to `/bible` while logged out → streak pill absent.
   - Log in → streak pill visible (if streak > 0).
   - Navigate to `/bible/plans` → no filter UI above cards, cards in 2-column grid at desktop, frosted glass styling (no colored gradients), no text clipping on "Reading Plans" heading.
   - Verify Verse of the Day on `/bible` — click "Read in context" → lands at top of destination chapter (scroll position is 0).
   - Open the BibleDrawer (press 'b' or click Books). Click a book → chapters view swaps instantly (no slide animation, no stutter).
   - Open BibleReader (`/bible/john/3`) → top toolbar visible at full opacity, does not fade. No static chapter heading in reader body (only the "John 3 ▾" in toolbar).
   - Open typography panel → verify focus mode toggle still works and can still be enabled if desired.
   - With focus mode manually enabled → toolbar fades as expected (feature still works).
   - Clear localStorage, reload `/bible/john/3` → migration runs, toolbar stays visible.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm lint` | lint | Clean output. |
| `pnpm test` | unit/integration | All pass, 0 failures. |
| `pnpm build` | build | Successful production build. |

**Expected state after completion:**
- [ ] All lint, test, and build checks pass.
- [ ] All 16 acceptance criteria from the spec are satisfied (verified by manual walkthrough).

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Layout edge-to-edge dark background |
| 2 | 1 | Align Bible page inner backgrounds with `bg-hero-bg` |
| 3 | — | BibleHero padding + hide StreakChip for logged-out |
| 4 | — | Auth-gate My Bible page with conversion card |
| 5 | — | Read in context — drop scroll-to param |
| 6 | — | Browse Books animation → instant swap |
| 7 | — | Reading plan cards — frosted glass redesign |
| 8 | 7 (visual coherence) | Reading Plans page — heading + filter removal + grid |
| 9 | — | Focus mode migration + remove ChapterHeading |
| 10 | 4 | My Bible heading + progress map contrast (heading only visible to logged-in per Step 4) |
| 11 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Final verification |

Steps 1 and 2 are sequenced (1 enables 2 to visually merge). Step 4 gates Step 10's heading change. Step 7 sequenced before Step 8 (card redesign should be done before the grid-column change is verified). All others can run in any order.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Layout edge-to-edge dark background | [COMPLETE] | 2026-04-17 | Layout.tsx: outer bg always `bg-hero-bg`, `dark` prop removed. AccessibilityPage.tsx + BibleLanding.tsx dropped `<Layout dark>`. Layout.test.tsx updated: 2 tests assert `bg-hero-bg` present and `bg-neutral-bg`/`bg-dashboard-dark` absent. |
| 2 | Align Bible page inner backgrounds | [COMPLETE] | 2026-04-17 | BibleLanding.tsx, MyBiblePage.tsx, BibleBrowse.tsx, PlanBrowserPage.tsx: inner `min-h-screen` div swapped from `bg-dashboard-dark` → `bg-hero-bg`. BibleLanding + MyBiblePage tests still pass. |
| 3 | BibleHero padding + hide StreakChip | [COMPLETE] | 2026-04-17 | BibleHero.tsx: pt/sm:pt/lg:pt changed to 12/16/20. BibleLanding.tsx: added `useAuth` import + `isAuthenticated` gate on StreakChip render. Tests: BibleHero padding test added; BibleLanding streak-visible test updated to seed auth; new logged-out streak test added (uses `milestones: []` to avoid toast match). |
| 4 | Auth-gate My Bible page | [COMPLETE] | 2026-04-17 | MyBiblePage.tsx: **Deviation from plan** — extracted the authenticated body into `MyBibleAuthenticatedInner` and made `MyBiblePageInner` an auth dispatcher. Reason: the plan's pattern (useAuth → early return → more hooks below) violates React's Rules of Hooks when auth state toggles (post sign-in re-render). Split-component pattern preserves the plan's intent (no heavy hooks for logged-out users) while staying React-compliant. Conversion card JSX matches the plan exactly. Tests: mocked useAuth + useAuthModal; 4 new logged-out tests verify heading, description, CTA, modal subtitle, and absence of activity feed. 17 tests pass. |
| 5 | Read in context scroll fix | [COMPLETE] | 2026-04-17 | VerseOfTheDay.tsx: removed `scrollToParam` derivation and `?scroll-to=` from the Link `to`. Test updated to assert href is `/bible/psalms/23` (no query). 17 tests pass. |
| 6 | Browse Books animation → instant swap | [COMPLETE] | 2026-04-17 | DrawerViewRouter.tsx: rewrote to render only current view — removed TRANSITION_MS, TransitionState, transition useState, orchestration useEffect, refs, useReducedMotion import, dual-mount branch, renderView helper. DrawerViewRouter.test.tsx: rewritten; removed fake timers and reduced-motion branch, added "no slide animation classes" guard. 5 tests pass. Tailwind keyframes left in config (future cleanup). |
| 7 | Reading plan cards — frosted glass | [COMPLETE] | 2026-04-17 | PlanBrowseCard, PlanInProgressCard, PlanCompletedCard: swapped colored gradient → `bg-white/5 backdrop-blur-sm border border-white/10`, removed dark scrim divs, updated `ring-offset-dashboard-dark` → `ring-offset-hero-bg`. Tests: added frosted glass + no-scrim assertions to each card test file. 18 tests pass across 3 files. |
| 8 | Reading Plans page fixes | [COMPLETE] | 2026-04-17 | PlanBrowserPage.tsx: added `pb-2` on `<h1>`, removed PlanFilterBar import + JSX, dropped theme/duration/setTheme/setDuration from hook destructure. PlanBrowserSection.tsx: grid changed to `grid-cols-1 sm:grid-cols-2`. Tests: replaced "shows filter bar" with "does not render filter bar"; added `pb-2` heading assertion; reworded "URL params control filter state" to assert filteredBrowse drives card display. 11 tests pass. |
| 9 | Focus mode migration + ChapterHeading removal | [COMPLETE] | 2026-04-17 | useFocusMode.ts: added `KEY_MIGRATION_V2 = 'wr_bible_focus_v2_migrated'` + migration block at top of `loadSettings()`. BibleReader.tsx: removed `ChapterHeading` import + render. 11-local-storage-keys.md: added `wr_bible_focus_v2_migrated` row + corrected `wr_bible_focus_enabled` default to `false` (BB-50). Additional fixes: removed `dark` prop from NotFound, ChunkErrorBoundary, RouteErrorBoundary call sites (caught by typecheck — plan only listed 2 call sites but there were 3 more). useFocusMode tests: added `wr_bible_focus_v2_migrated='true'` to beforeEach so existing tests are post-migration, plus a new `BB-51 migration` describe block with 5 tests. 27 tests pass. |
| 10 | My Bible heading + progress map contrast | [COMPLETE] | 2026-04-17 | MyBiblePage.tsx: replaced `SectionHeading` + `sr-only` h1 with single `<h1>` using `GRADIENT_TEXT_STYLE` + `pb-2`; removed unused `SectionHeading` import. BibleProgressMap.tsx: unread `bg-white/10` → `bg-white/[0.06]`, read `bg-white/40` → `bg-white/80`, highlighted unchanged (`bg-white`). Tests updated: BibleProgressMap color assertions and MyBiblePage heading assertion. 30 tests pass across 2 files. |
| 11 | Final verification | [COMPLETE] | 2026-04-17 | `pnpm lint` clean. `pnpm test`: 8524 tests pass, 0 fail. 1 test FILE fails (`useBibleAudio.test.ts` — imports missing `../useBibleAudio` module) — pre-existing, not in this spec's diff, unrelated to BB-51. `pnpm build` succeeds (7.43s). Follow-up fixes during verification: (a) added `sr-only <h1>` to BibleReader body for a11y (every page needs exactly one h1 per 09-design-system.md; plan didn't specify but removing ChapterHeading left BibleReader h1-less); (b) updated 3 tests that asserted old behavior (ChunkErrorBoundary `data-dark` mock, BibleReader chapter heading visibility, BibleReaderNotes crash guard). Manual browser verification deferred to user (requires `pnpm dev`). |

**Post-review cleanup (2026-04-17, after `/code-review`):**
- Deleted orphaned `frontend/src/components/bible/reader/ChapterHeading.tsx` (zero imports after Step 9 — plan allowed keeping, review recommended removal per "delete completely if unused" rule).
- Consolidated `Layout.test.tsx` — merged the two redundant `renderLayout()` tests into a single test that asserts `bg-hero-bg` present AND both legacy tokens (`bg-neutral-bg`, `bg-dashboard-dark`) absent.
- Ancillary copy change out-of-spec: `MyBibleAuthenticatedInner` empty-state subhead changed from "Nothing yet. Tap a verse in the reader to start." → "Start reading to build your collection." Matches the warmer anti-pressure tone of the logged-out conversion card; tests updated to match. Not in the BB-51 spec but accepted as polish alignment.
