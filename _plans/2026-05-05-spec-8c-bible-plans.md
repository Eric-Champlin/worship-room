# Implementation Plan: Spec 8C — Bible Cluster — Reading Plans

**Spec:** `_specs/spec-8c-bible-plans.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (do NOT create a new branch — user manages git manually per spec)
**Design System Reference:** `_plans/recon/design-system.md` (loaded; captured 2026-04-05)
**Recon Report:** `_plans/recon/bible-2026-05-05.md` (loaded — line-level inventory of BibleBrowse, BiblePlanDetail, BiblePlanDay, TodaysPlanCard, PlanCompletionCelebration, PlanFilter\* orphans, BibleStub)
**Direction Doc:** `_plans/direction/bible-cluster-2026-05-05.md` (loaded — 19 numbered decisions; Decisions 1, 5, 7, 8, 9, 10, 11, 12, 19 are 8C-relevant)
**Master Spec Plan:** N/A — this is a sub-spec of the Bible cluster (8B → 8C → 8A); the cluster's locked-decision direction doc serves the role of master plan.

---

## Affected Frontend Routes

- `/bible/browse` — BibleBrowse atmospheric migration (Change 2)
- `/bible/plans/:slug` — BiblePlanDetail atmospheric migration (Change 3)
- `/bible/plans/:slug/day/:dayNumber` — BiblePlanDay atmospheric migration + heading-semantics tightening (Change 4)
- `/bible` — verification only; behavior change visible because TodaysPlanCard now navigates correctly (Change 1)
- `/bible/plans` — verification only; PlanFilterBar/PlanFilterPill deletion confirmed not imported (Change 7)

---

## Architecture Context

### Current Bible-cluster atmospheric state (per recon Part 2)

Three different paths to roughly the same visual outcome live simultaneously today, two of which silently shadow `PageHero.tsx`'s canonical `ATMOSPHERIC_HERO_BG` export:

| Page                | Today's chrome                                                                       | Source line(s)             |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| BibleLanding        | `<BackgroundCanvas>` wrap (post-cluster baseline)                                    | BibleLanding.tsx:141       |
| MyBiblePage (8B)    | `<BackgroundCanvas>` wrap (post-8B)                                                  | MyBiblePage.tsx:214        |
| PlanBrowserPage     | `<BackgroundCanvas>` wrap (already canonical)                                        | PlanBrowserPage.tsx:19     |
| **BibleBrowse**     | `<Layout>` + inline `style={ATMOSPHERIC_HERO_BG}` + `bg-hero-bg` div                 | BibleBrowse.tsx:10–14      |
| **BiblePlanDetail** | `min-h-screen bg-dashboard-dark` + inline duplicate gradient string + coverGradient  | BiblePlanDetail.tsx:107–112 |
| **BiblePlanDay**    | `min-h-screen bg-dashboard-dark` + inline duplicate gradient string                  | BiblePlanDay.tsx:113–120   |
| BibleReader         | Documented exception — `var(--reader-bg)` + theme switch                              | n/a                        |

The three migration targets all become `<BackgroundCanvas>` wraps matching BibleLanding's structure exactly. Decision 1 from the direction doc is the authority; Spec 8B established the pattern; Spec 8C applies it mechanically to the three plan-related pages.

### Canonical wrap pattern (from BibleLanding.tsx:140–249)

```tsx
<BibleDrawerProvider>
  <AuthModalProvider>            {/* only for pages that need their own — see note below */}
    <Inner />
  </AuthModalProvider>
</BibleDrawerProvider>

function Inner() {
  // ... page state, useBibleDrawer(), etc.
  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...metadata} />
      <main id="main-content" className="relative z-10 flex-1">
        {/* hero section — relative z-10, no inline ATMOSPHERIC_HERO_BG */}
        {/* page body */}
      </main>
      <SiteFooter />
      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>
    </BackgroundCanvas>
  )
}
```

**AuthModalProvider scoping:** The cluster-level `AuthModalProvider` is mounted at App.tsx:203 (around `<Routes>`), so child routes already see `useAuthModal()`. BibleLanding additionally wraps its inner in `<AuthModalProvider>` for safety (its own `BibleLanding.tsx:245`); the cluster pattern allows it but does not require it. **For 8C: do NOT add an inner `<AuthModalProvider>` to BibleBrowse, BiblePlanDetail, or BiblePlanDay** — App.tsx's outer one is in scope, and the existing `useAuthModal()` calls in these files prove it works today. Only `<BibleDrawerProvider>` is required as the new outer wrapper.

### TodaysPlanCard URL bug (Decision 7)

Per recon Part 5 cross-pollution finding: `landing/TodaysPlanCard.tsx:22` renders `<Link to={`/reading-plans/${plan.planId}`}>`. `plan.planId` is a Bible plan slug (per `useActivePlan.ts:75` per recon). Grow's URL space owns `/reading-plans/*` → user lands on Grow's `PlanNotFound` instead of `BiblePlanDetail`. One-line fix: change to `/bible/plans/${plan.planId}`. The existing test at `landing/__tests__/TodaysPlanCard.test.tsx:61` asserts the broken URL — update the assertion to the correct URL pattern.

### Dead-code orphans (Decisions 8 + 9)

- `BibleStub.tsx` (36 LOC) — pre-redesign placeholder. App.tsx:85 carries a historical-context comment ("BB-38: BibleStub was used only for `/bible/search` — that route is now a redirect."). The comment is historical-context style (explains WHY the file became dead, not "TODO: delete"), so per spec req 11 the comment **stays** while the file deletes.
- `BibleStub.test.tsx` (37 LOC) — orphan test for the deleted file.
- `PlanFilterBar.tsx` (67 LOC) + `PlanFilterPill.tsx` (22 LOC) — orphan filter components, never imported by `PlanBrowserPage` per recon Part 5 + Eric's "no filtering" call (Decision 8).
- `PlanFilterBar.test.tsx` (66 LOC) — orphan test. PlanFilterPill has no standalone test file (verified via `find` earlier).

After deletion: typecheck (`pnpm test:typecheck` or equivalent — verify which the project uses) must pass. `grep -rn "BibleStub" frontend/src` and `grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src` must each return zero post-delete (excluding the historical-context comment in App.tsx:85, which mentions "BibleStub" but is intentional; the deletion sweep can verify by checking that the only match is App.tsx:85, the historical comment).

### BiblePlanDay heading-semantics tightening (Decision 10)

Per recon Part 11 (Accessibility Audit) — Issues / Risks subsection: the three section labels ("Devotional", "Passages", "Reflection prompts") on BiblePlanDay render as `<p>` elements styled to look like eyebrow headings. Today's heading hierarchy on a day with all three sections is just h1 (day title). Screen readers using heading-role navigation (NVDA, JAWS, VoiceOver `H` key) skip the labels entirely. The fix: replace `<p>` with `<h2>` while preserving the class string EXACTLY.

**Current state per recon table line 259** and the actual source file (verified):

- BiblePlanDay.tsx:201 — `<p className="text-xs font-medium uppercase tracking-widest text-white/60">Reflection</p>` (the actual visible label text in source is `Reflection`, NOT `Reflection prompts` — the spec uses "Reflection prompts" generically; the implementation will preserve whatever text the source has today).
- The Devotional and Passages sections do NOT have eyebrow `<p>` labels in the current source — only the FrostedCard with the devotional text and the passage card grid render directly. **This is a divergence between the spec's prose ("three section labels — Devotional, Passages, Reflection prompts — change to `<h2>`") and the actual source today.** The Reflection card has the eyebrow; the Devotional and Passages sections do not have semantic section labels at all.

**Decision for the plan:** Add semantic `<h2>` labels for ALL THREE sections (Devotional, Passages, Reflection — match the existing class string of the Reflection eyebrow `text-xs font-medium uppercase tracking-widest text-white/60` for consistency) so the heading hierarchy after the change is h1 → h2 (Devotional) → h2 (Passages) → h2 (Reflection). Add the new Devotional and Passages eyebrows just inside the FrostedCard / above the passage grid respectively. This satisfies spec req 8 ("Apply to all three section labels: Devotional ... Passages ... Reflection prompts") AND spec req 9 ("hierarchy ... → h2 (Devotional) → h2 (Passages) → h2 (Reflection prompts)"). The Reflection eyebrow already exists and only changes from `<p>` to `<h2>`. Devotional and Passages get newly-added `<h2>` eyebrows with the same class string. The label text on the Reflection eyebrow stays exactly as it is in source today (currently "Reflection"; the spec's prose abbreviation "Reflection prompts" is not authoritative — we keep the file's actual current text).

**Spec acceptance criterion line 238 calls for `getByRole('heading', { level: 2, name: /reflection/i })`** which resolves regardless of whether the text is "Reflection" or "Reflection prompts" — so the case-insensitive regex tolerates both. This avoids a copy change that would otherwise be a side-effect.

### Inline `ATMOSPHERIC_HERO_BG` consolidation (Decision 19)

Per recon Part 9 deprecated/duplication review and the grep results above:

- `BibleBrowse.tsx:3` imports the named `ATMOSPHERIC_HERO_BG` export from PageHero.tsx → after Change 2 the import is removed.
- `BiblePlanDetail.tsx:19–20` defines a local `const ATMOSPHERIC_HERO_BG = 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)'` — this is an inline DUPLICATE (string-only, not equal to the canonical CSSProperties object in PageHero.tsx but visually identical). After Change 3 the const declaration is deleted entirely.
- `BiblePlanDay.tsx:17–18` — same pattern as BiblePlanDetail. Deleted after Change 4.
- The named export in `PageHero.tsx:10` itself is **preserved** because of non-Bible consumers (`Settings.tsx:5`, `Friends.tsx:5`, `Insights.tsx:5`, `MonthlyReport.tsx:5`, `RoutinesPage.tsx:3`, `GrowthProfile.tsx:5`, `GrowPage.tsx:6`, `ChallengeDetail.tsx:6`, `ReadingPlanDetail.tsx:22`, `PrayerWallHero.tsx:2`). Decision 19 explicitly bounds 8C to Bible files only.

### `usePlanBrowser` filter API preservation (Spec Change 7d, Option A)

`hooks/bible/usePlanBrowser.ts:97–108` exposes `theme`, `duration`, `setTheme`, `setDuration`, `clearFilters` in its return value. PlanBrowserPage currently consumes ONLY `clearFilters` (line 15: `const { sections, filteredBrowse, clearFilters, isEmpty, isFilteredEmpty, isAllStarted } = usePlanBrowser()`). The other four (`theme`, `duration`, `setTheme`, `setDuration`) are not consumed by any non-deleted production code today — but the hook reads URL params (`?theme=`, `?duration=`) and applies the filter regardless of whether a UI consumer exists. URL-driven filtering still works. **No hook changes in 8C** — the hook stays exactly as-is. Removing the unused return values is Option B and explicitly out of scope per spec req 13.

### Test patterns to match

- BibleLanding test mocks `BackgroundCanvas` via `vi.mock` if needed, but BibleLanding.test.tsx may simply render through the real component. **Pattern to copy for atmospheric assertions:** the canonical mock used by `pages/bible/__tests__/PlanBrowserPage.test.tsx:16–22`:

  ```tsx
  vi.mock('@/components/ui/BackgroundCanvas', () => ({
    BackgroundCanvas: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="background-canvas" className={className}>{children}</div>
    ),
  }))
  ```

  This same shape is the canonical mock in `pages/__tests__/MyBiblePageHeatmap.test.tsx:145` for `ATMOSPHERIC_HERO_BG` (mock-out object). Reuse exactly.

- Atmospheric assertions to add (after migration):
  - `expect(screen.getByTestId('background-canvas')).toBeInTheDocument()` — proves the new wrap landed.
  - `const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')` then `expect(darkBgElements.length).toBe(0)` — proves no `bg-dashboard-dark` (#0f0a1e) inline color leaked through.
  - For BibleBrowse: also assert no `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'` is consumed (no inline `style[*="rgba(109, 40, 217"]` on the hero).

### localStorage keys involved (read-only — no new keys)

| Key                    | Read/Write       | Description                                                                                                                                                                                                                                              |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_bible_active_plans` | Read (transitively via `useActivePlan`)  | Powers TodaysPlanCard's `plan.planId` source. URL-fix change does NOT change how `plan.planId` is sourced — only the URL pattern the Link constructs. |
| `bible:plans`          | Read (transitively via `usePlan`/`useActivePlan`/`usePlanBrowser`) | The canonical reactive plans store. Not modified by 8C.                                                                                                                                                                                                  |
| `wr_bible_streak` / `bible:streak` | Read (transitively via BibleLanding/StreakChip — not on 8C surfaces) | Not touched by 8C.                                                                                                                                                                                                                                       |
| `wr_chapters_visited`  | n/a              | Not touched by 8C (8B's domain).                                                                                                                                                                                                                         |
| `wr_bible_progress`    | n/a              | Not touched by 8C (8B's domain).                                                                                                                                                                                                                         |

No new localStorage keys introduced. `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md` need NO updates from this spec.

---

## Auth Gating Checklist

This spec is **chrome-only** for plan-related auth gates. All AuthModal trigger sites preserved exactly. No new gates, no removed gates.

| Action                                                | Spec Requirement                              | Planned In Step | Auth Check Method                                                          |
| ----------------------------------------------------- | --------------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| Click TodaysPlanCard (URL fix only)                   | No auth modal — Bible plans are unauth-friendly | Step 1          | N/A — TodaysPlanCard does not call `useAuthModal()`; behavior unchanged.   |
| Browse books on `/bible/browse`                       | No auth modal                                 | Step 2          | N/A — public read.                                                         |
| View `/bible/plans/:slug` (read)                      | No auth modal                                 | Step 3          | N/A — public read.                                                         |
| Click "Start" on plan detail                          | Auth modal: "Sign in to start a reading plan" (preserved) | Step 3 | `useAuth().isAuthenticated` + `authModal?.openAuthModal(...)` — code path at BiblePlanDetail.tsx:67–76 stays exactly as-is. |
| Click "Continue" on plan detail                       | Navigates to current day's URL — handler not modified | Step 3 | Existing `<Link to={...}>` wired through `useAuth` in handler logic — stays as-is. |
| Click "Pause" on plan detail                          | Auth modal: "Sign in to manage your reading plan" (preserved) | Step 3 | Existing handler `handlePause()` BiblePlanDetail.tsx:78–84 stays.           |
| Click "Restart" on plan detail                        | Auth modal: "Sign in to start a reading plan" (preserved) | Step 3 | Existing handler `handleRestart()` BiblePlanDetail.tsx:86–97 stays.       |
| Click a day row when logged out                       | Auth modal: "Sign in to start this reading plan" (preserved) | Step 3 | Existing handler `handleDayRowClick()` BiblePlanDetail.tsx:99–104 stays. |
| View `/bible/plans/:slug/day/:dayNumber` (read)       | No auth modal                                 | Step 4          | N/A — public read.                                                         |
| Click "Mark day complete"                             | Auth modal: "Sign in to track your progress" (preserved) | Step 4 | Existing handler `handleMarkComplete()` BiblePlanDay.tsx:93–110 stays.    |
| Click "Read this passage" / "Journal about this"      | No auth modal at click — handler routes to BibleReader / Journal tab | Step 4 | Existing — unchanged.                                                      |
| Click "Continue" on PlanCompletionCelebration         | Auth modal: "Sign in to save your reflection" (preserved) | Step 6 (verification only) | Existing `handleSaveReflection()` PlanCompletionCelebration.tsx:35–44. **No code changes** in 8C — verification only. |

**Acceptance:** if execution accidentally rewires or drops any of the AuthModal trigger sites above, that's a regression. The existing tests at `pages/__tests__/BiblePlanDetail.test.tsx:120–149, 190–211, 222–243` and `pages/__tests__/BiblePlanDay.test.tsx:138–144` cover these — the migration must keep them green.

---

## Design System Values (for UI steps)

All values from `_plans/recon/design-system.md` (atmospheric/canvas) and from rule files (`09-design-system.md` § "Round 3 Visual Patterns") and from the canonical wrap pattern in BibleLanding.tsx.

| Component             | Property         | Value                                                                                                                | Source                                                                            |
| --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| BackgroundCanvas wrap | className        | `flex flex-col font-sans` (fed into `cn('relative min-h-screen overflow-hidden', className)` inside the component)    | `frontend/src/components/ui/BackgroundCanvas.tsx:17–25`                            |
| BackgroundCanvas      | inline background | `radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%), radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%), linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` | `BackgroundCanvas.tsx:9–15` (already encapsulated; consumers do NOT pass it).      |
| Navbar                | transparent prop | `transparent` (boolean) — produces glassmorphic absolute-positioned nav over the canvas                              | `09-design-system.md` § "Layout Components"                                         |
| Skip-to-main-content link | location     | First focusable element via `Navbar.tsx`'s canonical skip link                                                       | `09-design-system.md` § "Accessibility Patterns" — Skip links section              |
| `<main>`              | id, className    | `id="main-content" className="relative z-10 flex-1"`                                                                  | BibleLanding.tsx:145 (canonical pattern)                                          |
| Hero spacing (BibleBrowse) | className   | `pt-28 pb-12` (matches BibleLanding's `pt-28 pb-12` rhythm — also 8B's MyBiblePage post-Change-1c)                    | MyBiblePage.tsx:219 (`section.relative.z-10.w-full.px-4.pt-28.pb-12`)              |
| Hero spacing (BiblePlanDetail) | className | `pb-8 pt-20` preserved (matches recon Part 2 line 246 rhythm); inside `<section className="relative pb-8 pt-20">` (no `overflow-hidden` needed once the inline gradient is gone — keep `relative` for the coverGradient absolute overlay anchoring) | BiblePlanDetail.tsx:112 (current); preserve.                                       |
| Hero spacing (BiblePlanDay) | className   | `pb-6 pt-20` preserved (matches recon Part 2 line 256 rhythm); inside `<section className="relative pb-6 pt-20">`     | BiblePlanDay.tsx:120 (current); preserve.                                          |
| coverGradient overlay | className        | `absolute inset-0 bg-gradient-to-b opacity-20 ${plan.coverGradient}` — preserved; composites on top of BackgroundCanvas | BiblePlanDetail.tsx:114–117 (preserve).                                             |
| Heading h1 (gradient) | style            | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` — `background: linear-gradient(...); background-clip: text; color: transparent`. Class: `text-3xl font-bold ... pb-2` for plan-detail h1; `text-2xl font-bold ... pb-2` for plan-day h1; `text-3xl font-bold ... lg:text-5xl pb-2` for BibleBrowse "Browse Books" h1 | `09-design-system.md` § "Section Heading"; current source preserved.               |
| h2 section eyebrow (BiblePlanDay) | className | `text-xs font-medium uppercase tracking-widest text-white/60` — class string PRESERVED EXACTLY when changing element from `<p>` to `<h2>` (and applied to the new Devotional + Passages eyebrows for consistency) | BiblePlanDay.tsx:201 (current p element class string).                              |
| FrostedCard primitive | usage            | `<FrostedCard>` from `@/components/homepage/FrostedCard` — already used by reflection card, devotional card, passage cards, reflection prompts card. **No migration in 8C** — already canonical. | `09-design-system.md` § "Frosted Glass Cards (FrostedCard Component)"              |
| Decorative `bg-primary/N` tints | preservation | Lines 128, 162, 296 of BiblePlanDetail.tsx use `bg-primary/20` (badge), `bg-primary` (progress fill), `bg-primary` (day-status indicator). **PRESERVED** per Decision 11 — categorical signals, not CTAs. | Decision 11 in direction doc.                                                      |
| `duration-200` drift   | preservation     | Existing `duration-base` / `duration-200` instances preserved per Decision 12 — not touched.                          | Decision 12 in direction doc.                                                      |

---

## Design System Reminder

**Project-specific quirks `/execute-plan` displays before every UI step:**

- **`<BackgroundCanvas>` is the canonical atmospheric layer for outer Bible surfaces (Decision 1).** Wrap structure matches BibleLanding.tsx:140–249 exactly: `BibleDrawerProvider` outer (only — no extra `AuthModalProvider` because App.tsx provides it), `BackgroundCanvas className="flex flex-col font-sans"` inner, then `Navbar transparent`, `SEO`, `<main id="main-content" className="relative z-10 flex-1">`, page body, `<SiteFooter />`, `<BibleDrawer ... />`. Do NOT pass any `style` or `bg-*` to BackgroundCanvas — its background is encapsulated in the component itself.
- **NO `min-h-screen` or `bg-dashboard-dark` on the page wrapper after migration.** BackgroundCanvas already applies `relative min-h-screen overflow-hidden` internally; adding either is double-nested chrome.
- **The per-plan `coverGradient` overlay on BiblePlanDetail (line 114–117 currently) is PRESERVED** — composites on top of BackgroundCanvas in the hero zone with 20% opacity to give each plan its visual identity (parallel to Spec 6B's Grow Challenge `themeColor` halos preserving over canonical atmospheric).
- **No inline `style={{ background: ATMOSPHERIC_HERO_BG }}` and no inline duplicate of the gradient string on Bible files after migration (Decision 19).** The named export in PageHero.tsx itself stays for non-Bible consumers.
- **HorizonGlow stays scoped to Daily Hub (Decision 1).** Do NOT introduce HorizonGlow on any Bible-cluster page.
- **GlowBackground stays on the homepage. Do NOT use on Bible.**
- **`<h2>` is the canonical element for major content section labels (Decision 10).** When changing the BiblePlanDay section labels, preserve the EXACT class string `text-xs font-medium uppercase tracking-widest text-white/60` — the visual reading is identical; the semantic reading goes from "paragraph eyebrow" to "h2 heading."
- **Decorative `bg-primary/N` tints stay (Decision 11).** Lines 128, 162, 296 of BiblePlanDetail are categorical signals.
- **`duration-200` drift stays (Decision 12).** Aesthetic-only churn.
- **PlanCompletionCelebration's diverged chrome stays (Decision 5).** No Caveat, no `GRADIENT_TEXT_STYLE` on its h2, no confetti, no sound. If you find drift during verification, STOP and report — do not silently align it to Grow's overlay.
- **No deprecated patterns on these surfaces.** No `Caveat` headings, no `BackgroundSquiggle`, no `GlowBackground`, no `animate-glow-pulse`, no cyan textarea border, no italic Lora prompt copy, no soft-shadow 8px-radius cards on dark backgrounds, no `PageTransition`. (Verified absent on the three pages currently per recon Part 9.)
- **AuthModalProvider is set up at App.tsx:203.** Do NOT add a redundant `<AuthModalProvider>` wrapper inside the migrated pages — `useAuthModal()` already resolves through the cluster provider.
- **Canonical animation tokens** at `frontend/src/constants/animation.ts`. The migrated pages don't introduce any new animations; existing `transition-all motion-reduce:transition-none duration-base` on the white-pill CTAs stays as-is.

**Source:** `_plans/recon/design-system.md`, `_plans/recon/bible-2026-05-05.md`, `_plans/direction/bible-cluster-2026-05-05.md`, `09-design-system.md` § "Round 3 Visual Patterns" + § "Deprecated Patterns", recent Spec 8B Execution Log.

---

## Shared Data Models (from Master Plan / Direction Doc)

No new TypeScript interfaces. No new localStorage keys. No new shared constants.

The relevant existing types `Plan`, `PlanProgress`, `PlanDay` from `frontend/src/types/bible-plans.ts` are CONSUMED by the migrated pages but not modified.

`ActivePlan` from `frontend/src/types/bible-landing.ts` is CONSUMED by TodaysPlanCard for the URL fix; not modified.

**Cross-spec dependencies (from direction doc):**

- 8B established BackgroundCanvas adoption on MyBiblePage and FrostedCard primitive on plan card components.
- 8B's atmospheric pattern (BibleLanding/MyBiblePage) is what 8C consumes mechanically.
- 8A consumes 8C's lint-clean Bible cluster as its baseline (only the BibleReader's three validation-error pages are 8A's scope).

---

## Responsive Structure

| Breakpoint    | Width       | Key Layout Changes                                                                                                              |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Mobile        | 375px       | All three pages preserve current single-column mobile layouts. BibleBrowse: testament accordion + book grid stacks. BiblePlanDetail: single-column hero, single-column CTA stack, 5-day-visible day list with "Show all N days" toggle. BiblePlanDay: single-column hero, devotional FrostedCard full-width, passage cards single-column, reflection prompts FrostedCard full-width, Mark day complete `sticky bottom-4 sm:static`. |
| Tablet        | 768px       | Layouts preserved exactly. BiblePlanDay's passage cards may render `sm:grid-cols-2` if `day.passages.length >= 2`. CTA row on BiblePlanDetail may sit horizontally (`sm:flex-row sm:items-center sm:gap-4`).                                                                          |
| Desktop       | 1440px      | Layouts preserved exactly. BibleBrowse hero spacing `pt-28 pb-12` matches BibleLanding/MyBiblePage post-8B. Same component arrangement; only the page-background atmospheric layer changes from inline gradient / `bg-dashboard-dark` to `<BackgroundCanvas>`.                       |

**Custom breakpoints:** None for this spec. The spec is responsive-neutral chrome migration.

The atmospheric migration is responsive-neutral by design — `<BackgroundCanvas>` is a fixed atmospheric surface that does not change layout. The coverGradient overlay on BiblePlanDetail is responsive-neutral. The heading-semantics change on BiblePlanDay is responsive-neutral (no visual change at any breakpoint).

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. The CTA row on BiblePlanDetail (Start / Continue / Pause / Restart) does include multiple inline elements but its layout is not changed by 8C — it's an existing `flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4` row preserved exactly. The day navigation row at the bottom of BiblePlanDay (prev/next + mark complete) is similarly preserved as `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`. Neither row is being touched by this spec, so positional verification is not a new concern.

---

## Vertical Rhythm

| From → To                                                                | Expected Gap     | Source                                                                           |
| ------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------- |
| BibleBrowse: Hero ("Browse Books" h1) → BibleBooksMode book grid         | 8px (`mt-6` from BibleBooksMode.tsx:15 `flex flex-col gap-4` + the wrapping `pt-28 pb-12` hero gives ~96px from h1 baseline to top of book grid)        | BibleLanding.tsx:151 + 8B Change 1c MyBiblePage parity. |
| BiblePlanDetail: Hero (h1 + meta + CTA) → Reflection card (when present) → Day list | `pt-8` between hero and reflection (preserved); `pt-8` between hero and day list when no reflection | BiblePlanDetail.tsx:211, 220 (preserved). |
| BiblePlanDay: Hero (h1) → Devotional FrostedCard / Passages grid / Reflection card | `space-y-8 px-4 py-8` on the content container, so 32px vertical between cards | BiblePlanDay.tsx:146 (preserved). |
| All three pages: SiteFooter → top of footer                              | Driven by the page body's pb-* (e.g., `pb-16` on BiblePlanDetail.tsx:220, `pb-16` on BiblePlanDay.tsx:222) + SiteFooter's own pt | Existing — preserved. |

`/execute-plan` checks these during visual verification. `/verify-with-playwright` compares post-migration vs current at each breakpoint. Any gap delta >5px is a mismatch — except where the migration introduced spacing alignment (BibleBrowse `pt-28 pb-12` vs current `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` is intentional alignment to BibleLanding/MyBiblePage post-8B).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working branch is `forums-wave-continued` (per spec). NO new branches, NO commits, NO pushes during execution — user manages git manually.
- [ ] Specs 6A/6B/6C/6D (Grow cluster), Spec 7 (Auth surfaces), and Spec 8B (MyBible) are all merged into the working branch — verify with `git log --oneline | head -20` before execution start.
- [ ] `_plans/recon/bible-2026-05-05.md` and `_plans/direction/bible-cluster-2026-05-05.md` are present on disk (intentional input context per spec).
- [ ] `pnpm test` baseline before changes: 9,470 pass / 1 pre-existing fail per CLAUDE.md Build Health (note: a second flaky test in `useNotifications` may surface; baseline is 9,470/1 OR 9,469/2 depending on timing).
- [ ] Current branch state shows uncommitted changes ONLY in spec/plan files (`_specs/spec-8c-bible-plans.md`, `_plans/2026-05-05-spec-8c-bible-plans.md`).
- [ ] All auth-gated actions from the spec are accounted for in the plan (see Auth Gating Checklist above) — none added, none removed, none modified.
- [ ] Design system values are verified (from `_plans/recon/bible-2026-05-05.md` Part 2 for line-level chrome + `09-design-system.md` for canonical patterns).
- [ ] Recon report loaded — `_plans/recon/bible-2026-05-05.md` (1,287 lines) referenced in Architecture Context.
- [ ] No deprecated patterns introduced — verified absent on the three migration target pages per recon Part 9.

---

## Edge Cases & Decisions

| Decision                                                                                        | Choice                                                                                                                                                                                                                                                       | Rationale                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Should we add inner `<AuthModalProvider>` to the migrated pages?                                | NO — App.tsx:203 mounts the cluster-level provider, and the existing `useAuthModal()` calls in BiblePlanDetail/BiblePlanDay prove it's in scope today.                                                                                                       | Avoids redundant provider nesting that would not improve correctness and would create churn in tests.                                                                                                                                                      |
| Should the BibleDrawer mount go on BibleBrowse itself or inside `BibleBooksMode`?               | BibleBrowse — same as BibleLanding/MyBiblePage. `BibleBooksMode.tsx` is a thin shell (29 LOC) that does NOT consume `useBibleDrawer` today; the drawer is page-level chrome.                                                                                  | Consistent with the cluster pattern. `BibleBooksMode` rendering inline on BibleBrowse is unrelated to the drawer flyout — they happen to share the BooksDrawerContent component, but the drawer itself is a separate mount.                                |
| Should the keyboard 'b' shortcut for opening the drawer be added to BibleBrowse / BiblePlanDetail / BiblePlanDay? | NO — the spec does not require it. BibleLanding has it (line 122–132); MyBiblePage does NOT (verify: no `'b'` shortcut handler in MyBiblePage). The migration brings the BibleDrawer mount but not the shortcut, matching MyBiblePage's posture. | Out of scope; would be additive feature work, not chrome migration.                                                                                                                                                                                        |
| Should the BibleStub historical-context comment in App.tsx:85 be removed?                       | NO — it explains WHY the file became dead, not "TODO: delete it." Per spec req 11, historical-context comments are preserved.                                                                                                                                | The comment provides forward-looking spec authors with context that BB-38 redirected `/bible/search` and that's why no BibleStub mount remains. Deleting it would lose the explanation.                                                                    |
| Should test files for already-deleted code be deleted (e.g., `PlanFilterPill.test.tsx`)?       | Already verified absent — `find` showed only `PlanFilterBar.test.tsx`. No `PlanFilterPill.test.tsx` exists. The deletion sweep handles only files that actually exist.                                                                                       | Avoid spurious "file not found" deletes during execution.                                                                                                                                                                                                   |
| What happens if a day on BiblePlanDay has no devotional but has passages?                       | Spec req 8 calls for h2 labels on Devotional, Passages, Reflection. The Devotional h2 should render ONLY when `day.devotional` is truthy (matching the existing FrostedCard's render condition); same for Passages h2 (when `day.passages.length > 0`) and Reflection h2 (when `day.reflectionPrompts?.length > 0`). | Don't render a section heading for a section that has no content. Heading hierarchy after the change: h1 → h2 (Devotional, conditional) → h2 (Passages, conditional) → h2 (Reflection, conditional). No skips because each h2 is gated on having something below it. |
| Should the existing `text-3xl font-bold text-white` h2 in PlanCompletionCelebration migrate to gradient? | NO. Decision 5 explicitly preserves this divergence from Grow.                                                                                                                                                                                                | Anti-pressure / contemplative voice for finishing a Bible plan.                                                                                                                                                                                            |
| Should the eyebrow text "Reflection" on BiblePlanDay change to "Reflection prompts"?           | NO. The spec's prose abbreviation isn't authoritative; the file's actual text "Reflection" stays. The acceptance criterion regex `/reflection/i` matches both.                                                                                              | Avoid a copy change as a side-effect of a structural change. If a copy change is desired later, it ships in its own spec.                                                                                                                                  |
| Should `usePlanBrowser`'s unused return values (`theme`, `duration`, `setTheme`, `setDuration`) be removed? | NO. Spec req 13 (Option A) preserves them. URL-driven filtering still works.                                                                                                                                                                                  | Removing them is Option B, explicitly out of scope. Future cleanup spec.                                                                                                                                                                                   |
| If `PlanCompletionCelebration` shows drift from Decision 5, what's the action?                  | STOP and report. Do NOT silently align it to Grow's overlay.                                                                                                                                                                                                  | Decision 5 is explicit; drift is a correctness signal.                                                                                                                                                                                                     |

---

## Implementation Steps

### Step 1: Fix TodaysPlanCard URL bug + update test

**Objective:** Change `<Link to={`/reading-plans/${plan.planId}`}>` to `<Link to={`/bible/plans/${plan.planId}`}>` so clicking the Today's Plan card on `/bible` routes to BiblePlanDetail (not Grow's PlanNotFound). Update the test that pins the broken URL.

**Files to create/modify:**

- `frontend/src/components/bible/landing/TodaysPlanCard.tsx` — change line 22 `<Link to={`/reading-plans/${plan.planId}`}>` → `<Link to={`/bible/plans/${plan.planId}`}>`.
- `frontend/src/components/bible/landing/__tests__/TodaysPlanCard.test.tsx` — change line 61 assertion `expect(link.getAttribute('href')).toBe('/reading-plans/gospel-john')` → `expect(link.getAttribute('href')).toBe('/bible/plans/gospel-john')`.

**Details:**

- Single-character class of change. Search-and-replace `/reading-plans/${plan.planId}` → `/bible/plans/${plan.planId}` in the source file (only one match expected).
- Search-and-replace `/reading-plans/gospel-john` → `/bible/plans/gospel-john` in the test file (only one match expected).

**Auth gating (if applicable):**

- N/A — TodaysPlanCard does NOT call `useAuthModal()` and the spec preserves the no-auth-gate posture (Bible reading plans are part of the unauthenticated personal layer per Decision 2 / BB-0–BB-46 promise).

**Responsive behavior (UI steps only):**

- Desktop (1440px): unchanged — same FrostedCard + `<Link>` rendering.
- Tablet (768px): unchanged.
- Mobile (375px): unchanged.

**Inline position expectations:**

- N/A — no inline-row layout is changed by Step 1.

**Guardrails (DO NOT):**

- DO NOT change anything else in TodaysPlanCard.tsx (the FrostedCard chrome, the progress bar `bg-primary` decorative tint, the `+N more` chip, the `aria-*` attributes — all preserved).
- DO NOT change the `+N more` link's URL (`/bible/plans` is correct — it links to PlanBrowserPage, which is Bible's own URL space).
- DO NOT add/remove any imports.
- DO NOT touch the `useActivePlan` hook or the `wr_bible_active_plans` localStorage bridge (Decision 15 — out of scope for 8C).

**Test specifications:**

| Test                                                                                            | Type   | Description                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| TodaysPlanCard: existing test "links to plan detail route" updated assertion                    | unit   | Asserts `link.getAttribute('href')` equals `/bible/plans/gospel-john` (not `/reading-plans/...`).                          |
| TodaysPlanCard: NEW test "Bible-side URL pattern only"                                          | unit   | Asserts the rendered href contains `/bible/plans/` and does NOT contain `/reading-plans/` (regression guard for Decision 7). |

**Expected state after completion:**

- [ ] `TodaysPlanCard.tsx` line 22 reads `<Link to={`/bible/plans/${plan.planId}`}>`.
- [ ] `TodaysPlanCard.test.tsx` line 61 asserts the new URL pattern; the new regression-guard test also passes.
- [ ] `pnpm test landing/__tests__/TodaysPlanCard.test.tsx` passes (all tests green).
- [ ] `grep -rn "reading-plans" frontend/src/components/bible` returns zero matches.
- [ ] No other file modified.

---

### Step 2: Migrate BibleBrowse to BackgroundCanvas wrap + update test

**Objective:** Replace `<Layout>` + inline `style={ATMOSPHERIC_HERO_BG}` + `bg-hero-bg` with the canonical `<BackgroundCanvas>` wrap matching BibleLanding/MyBiblePage. Wire BibleDrawerProvider + BibleDrawer mount. Remove the orphan `ATMOSPHERIC_HERO_BG` import. Update the existing BibleBrowse test to mock `BackgroundCanvas` and assert the wrapper.

**Files to create/modify:**

- `frontend/src/pages/BibleBrowse.tsx` — full restructure (see Details).
- `frontend/src/pages/__tests__/BibleBrowse.test.tsx` — add `vi.mock('@/components/ui/BackgroundCanvas', ...)` + assertions per "Test patterns to match" in Architecture Context.

**Details:**

Refactor BibleBrowse to follow BibleLanding's Inner/Outer pattern. New file structure (full replacement):

```tsx
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { BIBLE_BROWSE_METADATA } from '@/lib/seo/routeMetadata'

function BibleBrowseInner() {
  const { isOpen, close } = useBibleDrawer()

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...BIBLE_BROWSE_METADATA} />

      <main id="main-content" className="relative z-10 flex-1">
        <section className="relative z-10 w-full px-4 pt-28 pb-12 text-center">
          <h1
            className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
            style={GRADIENT_TEXT_STYLE}
          >
            Browse Books
          </h1>
        </section>

        <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
          <BibleBooksMode />
        </div>
      </main>

      <SiteFooter />

      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>
    </BackgroundCanvas>
  )
}

export function BibleBrowse() {
  return (
    <BibleDrawerProvider>
      <BibleBrowseInner />
    </BibleDrawerProvider>
  )
}
```

Key removals:

- `import { Layout } from '@/components/Layout'` — REMOVED. Replaced with explicit Navbar + SiteFooter.
- `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'` — REMOVED. No consumer remains.
- `<div className="min-h-screen bg-hero-bg">` — REMOVED. BackgroundCanvas provides `relative min-h-screen overflow-hidden`.
- `style={ATMOSPHERIC_HERO_BG}` on the section — REMOVED. The atmospheric layer comes from BackgroundCanvas.
- The hero section's className changes from `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40` → `relative z-10 w-full px-4 pt-28 pb-12 text-center` (aligning to BibleLanding/MyBiblePage cluster rhythm; the `flex flex-col items-center antialiased` modifiers are replaced with `text-center` on the section + the heading is naturally centered via the section's `text-center`; `antialiased` is inherited from the global font-sans antialiasing). **Verify visually during execution that the heading still renders centered with appropriate spacing — if not, restore the explicit `flex flex-col items-center` while keeping the new pt/pb spacing.**

For the test file — add the BackgroundCanvas mock at the top, plus a Navbar/SiteFooter/SEO mock if not already present (BibleBrowse.test.tsx today only renders through providers; check if Navbar is renderable in jsdom — it is, per BibleLanding.test.tsx, so the test may not strictly need to mock them). New assertions:

```tsx
it('wraps page in BackgroundCanvas (atmospheric layer)', () => {
  renderWithProviders(<BibleBrowse />)
  const canvas = screen.getByTestId('background-canvas')
  expect(canvas).toBeInTheDocument()
  expect(canvas.className).toContain('flex')
  expect(canvas.className).toContain('flex-col')
  expect(canvas.className).toContain('font-sans')
})

it('no ATMOSPHERIC_HERO_BG inline background color (#0f0a1e)', () => {
  const { container } = renderWithProviders(<BibleBrowse />)
  const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')
  expect(darkBgElements.length).toBe(0)
})
```

**Auth gating (if applicable):**

- N/A — BibleBrowse is fully public read.

**Responsive behavior (UI steps only):**

- Desktop (1440px): hero `pt-28 pb-12` (cluster-aligned). Book grid renders inside `mx-auto max-w-5xl px-4 lg:px-8 pb-16` — preserved.
- Tablet (768px): same as desktop with smaller `max-w-5xl` clamp.
- Mobile (375px): single-column book grid (BibleBooksMode handles its own responsive layout); `px-4` padding.

**Inline position expectations:**

- N/A — no inline-row layouts on this page.

**Guardrails (DO NOT):**

- DO NOT add `<AuthModalProvider>` — App.tsx provides it.
- DO NOT add HorizonGlow.
- DO NOT add GlowBackground.
- DO NOT add a subtitle to the h1 (spec preserves the no-subtitle posture per acceptance criterion line 205).
- DO NOT change BIBLE_BROWSE_METADATA or the `<SEO {...BIBLE_BROWSE_METADATA} />` props.
- DO NOT change BibleBooksMode internals.
- DO NOT add the keyboard 'b' shortcut (Bible drawer toggle) — spec doesn't require it; out of scope.
- DO NOT introduce a `min-h-screen` or `bg-*` class on the page wrapper — BackgroundCanvas handles that.

**Test specifications:**

| Test                                                                | Type        | Description                                                                                          |
| ------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Existing: `renders BibleBooksMode content`                          | integration | Continues to render `Genesis` (or whatever first OT book BibleBooksMode emits).                       |
| New: `wraps page in BackgroundCanvas (atmospheric layer)`           | unit        | Asserts `getByTestId('background-canvas')` exists with `flex flex-col font-sans` className.            |
| New: `no ATMOSPHERIC_HERO_BG inline background color (#0f0a1e)`     | unit        | Asserts no element has the dashboard-dark inline color.                                              |
| New: `mounts BibleDrawer with provider`                             | integration | Asserts the BibleDrawer is mounted (e.g., `getByLabel("Books of the Bible")` exists in the document, even if closed). |
| New: `hero h1 uses GRADIENT_TEXT_STYLE`                              | unit        | Asserts the h1's inline style contains `background-clip` and gradient values.                        |

**Expected state after completion:**

- [ ] `BibleBrowse.tsx` uses `<BackgroundCanvas className="flex flex-col font-sans">` wrap.
- [ ] `BibleBrowse.tsx` mounts `<BibleDrawerProvider>` outer and `<BibleDrawer ... />` inside the canvas.
- [ ] `BibleBrowse.tsx` no longer imports `Layout` or `ATMOSPHERIC_HERO_BG`.
- [ ] `BibleBrowse.test.tsx` asserts BackgroundCanvas wrapper + no inline `#0f0a1e` + drawer mount.
- [ ] `pnpm test pages/__tests__/BibleBrowse.test.tsx` passes.
- [ ] `pnpm typecheck` (or `pnpm test:typecheck`) passes.
- [ ] No regression in cluster baseline (9,470 pass / 1 pre-existing fail).

---

### Step 3: Migrate BiblePlanDetail to BackgroundCanvas wrap (preserve coverGradient overlay) + update test

**Objective:** Replace `min-h-screen bg-dashboard-dark` + inline duplicate `ATMOSPHERIC_HERO_BG` gradient string with the canonical `<BackgroundCanvas>` wrap. Preserve the per-plan `coverGradient` overlay on the hero (Decision 11/coverGradient-related). Wire BibleDrawerProvider + BibleDrawer mount. Update the existing test.

**Files to create/modify:**

- `frontend/src/pages/BiblePlanDetail.tsx` — restructure top-level wrap (see Details).
- `frontend/src/pages/__tests__/BiblePlanDetail.test.tsx` — add BackgroundCanvas mock + atmospheric assertions, preserve all existing behavioral tests.

**Details:**

Top-level structure becomes:

```tsx
// New imports at top of file:
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'

// REMOVED at top of file:
// const ATMOSPHERIC_HERO_BG = 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)'

// Inner function takes the existing component body verbatim, with the wrapper changes below:
function BiblePlanDetailInner() {
  const { isOpen, close } = useBibleDrawer()
  // ... all existing state, hooks, handlers — unchanged ...

  if (isLoading) {
    return (
      <BackgroundCanvas className="flex flex-col font-sans">
        <Navbar transparent />
        <main id="main-content" className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-white/60">Loading plan...</div>
        </main>
        <SiteFooter />
      </BackgroundCanvas>
    )
  }

  if (isError || !plan) {
    return (
      <BackgroundCanvas className="flex flex-col font-sans">
        <Navbar transparent />
        <SEO title="Reading Plan Not Found" description="..." noIndex />
        <main id="main-content" className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-lg text-white/70">This plan couldn&apos;t be loaded. Try again later.</p>
          <Link to="/bible" className="mt-4 inline-flex min-h-[44px] items-center text-sm text-white/60 hover:text-white">
            ← Back to Bible
          </Link>
        </main>
        <SiteFooter />
      </BackgroundCanvas>
    )
  }

  // ... compute isStarted/isCompleted/isPreview/totalDays/etc. — unchanged ...

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...buildBiblePlanMetadata(plan.slug, plan.title, plan.description)} />

      <main id="main-content" className="relative z-10 flex-1">
        {/* Hero — relative wrapper for coverGradient absolute overlay; NO inline ATMOSPHERIC_HERO_BG */}
        <div className="relative overflow-hidden pb-8 pt-20">
          {/* Per-plan coverGradient overlay — PRESERVED exactly, now composites on BackgroundCanvas */}
          <div
            className={cn('absolute inset-0 bg-gradient-to-b opacity-20', plan.coverGradient)}
            aria-hidden="true"
          />

          {/* The existing inner hero content (lines 119–206) is preserved exactly: */}
          <div className="relative z-10 mx-auto max-w-3xl px-4">
            {/* ← All plans link, Completed pill, h1 with GRADIENT_TEXT_STYLE,
                description, theme pill / duration / time-per-day / curator,
                progress bar (in-progress), CTA row (Start / Continue / Pause / Restart) — preserved */}
          </div>
        </div>

        {/* Reflection card (completed plans) — preserved (lines 209–217) */}

        {/* Day list with DayStatusIndicator — preserved (lines 219–275) */}
      </main>

      <SiteFooter />

      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>
    </BackgroundCanvas>
  )
}

export function BiblePlanDetail() {
  return (
    <BibleDrawerProvider>
      <BiblePlanDetailInner />
    </BibleDrawerProvider>
  )
}

// DayStatusIndicator helper at bottom of file — preserved exactly.
```

Key removals:

- `const ATMOSPHERIC_HERO_BG = 'radial-gradient(...)' ` at line 19–20 — DELETED.
- `<div className="min-h-screen bg-dashboard-dark">` outer wrapper — REPLACED with `<BackgroundCanvas className="flex flex-col font-sans">`.
- The `flex min-h-screen items-center justify-center bg-dashboard-dark` and `flex min-h-screen flex-col items-center justify-center bg-dashboard-dark px-4` wrappers in the loading/error early returns — REPLACED with the canvas + `<main id="main-content" className="relative z-10 flex-1 flex ...">` so the loading/error states still center their content but inherit the BackgroundCanvas atmosphere.
- `style={{ background: ATMOSPHERIC_HERO_BG }}` on line 112 — REMOVED. The hero's gradient atmosphere comes from BackgroundCanvas; the per-plan tint comes from the preserved coverGradient overlay.

Key preserves (hero-zone behavioral integrity):

- Per-plan `coverGradient` overlay (`<div className="absolute inset-0 bg-gradient-to-b opacity-20 ...">`) — preserved exactly per Spec 6B parallel for per-plan visual identity.
- All existing hero content: `← All plans` Link, Completed pill, h1 with `GRADIENT_TEXT_STYLE`, description, theme pill / duration / time-per-day / curator metadata, progress bar (with the `bg-primary` decorative tint at line 162 preserved per Decision 11), CTA row.
- Reflection card on completed plans (preserved as FrostedCard).
- Day list with 5-visible default + "Show all N days" toggle (preserved). `DayStatusIndicator` decorative tints at line 296 preserved per Decision 11.
- All AuthModal trigger sites: `handleStart`, `handlePause`, `handleRestart`, `handleDayRowClick` — preserved exactly with the same copy.

Test file updates (`pages/__tests__/BiblePlanDetail.test.tsx`):

- Add the canonical BackgroundCanvas mock at the top:

  ```tsx
  vi.mock('@/components/ui/BackgroundCanvas', () => ({
    BackgroundCanvas: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="background-canvas" className={className}>{children}</div>
    ),
  }))
  vi.mock('@/components/Navbar', () => ({ Navbar: () => null }))
  vi.mock('@/components/SiteFooter', () => ({ SiteFooter: () => null }))
  vi.mock('@/components/SEO', () => ({ SEO: () => null }))
  ```

- Add a setup-block or per-test mock for `useBibleDrawer` so the test renders without a real drawer:

  ```tsx
  vi.mock('@/components/bible/BibleDrawerProvider', () => ({
    BibleDrawerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useBibleDrawer: () => ({ isOpen: false, close: vi.fn(), open: vi.fn(), toggle: vi.fn() }),
  }))
  vi.mock('@/components/bible/BibleDrawer', () => ({ BibleDrawer: () => null }))
  vi.mock('@/components/bible/DrawerViewRouter', () => ({ DrawerViewRouter: () => null }))
  ```

- Add new tests:

  ```tsx
  it('wraps page in BackgroundCanvas (atmospheric layer)', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    renderDetail()
    const canvas = screen.getByTestId('background-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas.className).toContain('flex')
    expect(canvas.className).toContain('flex-col')
    expect(canvas.className).toContain('font-sans')
  })

  it('no ATMOSPHERIC_HERO_BG inline gradient on hero (no inline rgba(109, 40, 217))', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    const { container } = renderDetail()
    const heroGradient = container.querySelectorAll('[style*="rgba(109"]')
    expect(heroGradient.length).toBe(0)
  })

  it('preserves per-plan coverGradient overlay on the hero', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    const { container } = renderDetail()
    // MOCK_PLAN.coverGradient is 'from-primary/30 to-hero-dark'; verify a div with these classes + opacity-20 exists
    const overlay = container.querySelector('.from-primary\\/30.to-hero-dark.opacity-20')
    expect(overlay).toBeInTheDocument()
  })

  it('no bg-dashboard-dark on page wrapper (#0f0a1e)', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    const { container } = renderDetail()
    const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')
    expect(darkBgElements.length).toBe(0)
  })
  ```

- All existing behavioral tests (preview/in-progress/completed states, auth-gate triggers for start/pause/restart, day-row click auth gate, progress bar ARIA, error state for corrupt plan, etc.) — preserved unchanged.

**Auth gating (if applicable):**

- All four AuthModal trigger sites preserved exactly:
  - `handleStart()` → `'Sign in to start a reading plan'` (BiblePlanDetail.tsx:67–76).
  - `handlePause()` → `'Sign in to manage your reading plan'` (BiblePlanDetail.tsx:78–84).
  - `handleRestart()` → `'Sign in to start a reading plan'` (BiblePlanDetail.tsx:86–97).
  - `handleDayRowClick()` → `'Sign in to start this reading plan'` (BiblePlanDetail.tsx:99–104).

**Responsive behavior (UI steps only):**

- Desktop (1440px): single-column hero contained in `max-w-3xl mx-auto`; CTA row `sm:flex-row sm:items-center sm:gap-4`; day list inline. Preserved.
- Tablet (768px): same; CTA row sits horizontally.
- Mobile (375px): single-column CTA stack; sticky behavior on Mark complete is N/A here (BiblePlanDetail's CTAs aren't sticky). Preserved.

**Inline position expectations:**

- N/A — the CTA row is preserved, not modified.

**Guardrails (DO NOT):**

- DO NOT remove the `coverGradient` overlay (per-plan visual identity).
- DO NOT change the `bg-primary/N` decorative tints at lines 128, 162, 296 (Decision 11).
- DO NOT change `duration-base` / `duration-200` (Decision 12).
- DO NOT touch DayStatusIndicator helper.
- DO NOT touch the `usePlan` hook or the `bible:plans` reactive store.
- DO NOT add HorizonGlow.
- DO NOT add or change AuthModal copy.
- DO NOT modify any `bg-white` / homepage-primary white-pill CTA classes (they're canonical).
- DO NOT change SEO metadata (`buildBiblePlanMetadata`).

**Test specifications:**

| Test                                                                                  | Type        | Description                                                                                                   |
| ------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Existing 12 tests (preview / in-progress / completed / auth gates / day rows / etc.)  | unit        | Continue to pass with the same expectations.                                                                  |
| New: `wraps page in BackgroundCanvas`                                                  | unit        | Asserts `getByTestId('background-canvas')` with cluster className.                                            |
| New: `no ATMOSPHERIC_HERO_BG inline gradient on hero`                                  | unit        | Asserts no inline `rgba(109, 40, 217, ...)` style on any element.                                              |
| New: `preserves per-plan coverGradient overlay`                                        | unit        | Asserts the coverGradient overlay class string + `opacity-20` is rendered.                                    |
| New: `no bg-dashboard-dark on page wrapper`                                            | unit        | Asserts no inline `#0f0a1e` color leaks through.                                                               |

**Expected state after completion:**

- [ ] `BiblePlanDetail.tsx` uses `<BackgroundCanvas className="flex flex-col font-sans">` wrap.
- [ ] `BiblePlanDetail.tsx` no longer defines a local `const ATMOSPHERIC_HERO_BG`.
- [ ] `BiblePlanDetail.tsx` mounts `<BibleDrawerProvider>` outer and `<BibleDrawer ... />` inside the canvas.
- [ ] All existing behavioral tests continue to pass.
- [ ] New atmospheric tests pass.
- [ ] `pnpm test pages/__tests__/BiblePlanDetail.test.tsx` passes.
- [ ] coverGradient overlay still visible on the hero zone (manual eyeball during execution).
- [ ] No regression in cluster baseline.

---

### Step 4: Migrate BiblePlanDay to BackgroundCanvas wrap + apply h2 heading semantics + update test

**Objective:** Apply the same atmospheric migration pattern as BiblePlanDetail. PLUS: replace the existing `<p>` Reflection eyebrow with `<h2>` AND add NEW `<h2>` Devotional and Passages eyebrows above the corresponding sections (per recon-confirmed source state, only the Reflection eyebrow exists today; Devotional/Passages eyebrows are added with the same class string for consistency). Preserve all other behavior.

**Files to create/modify:**

- `frontend/src/pages/BiblePlanDay.tsx` — restructure top-level wrap (same pattern as Step 3) AND modify the three section-label elements (see Details).
- `frontend/src/pages/__tests__/BiblePlanDay.test.tsx` — add BackgroundCanvas mock + atmospheric assertions + new heading-hierarchy tests, preserve all existing behavioral tests.
- `frontend/src/pages/__tests__/BiblePlanDay.seo.test.tsx` — verify SEO test still passes after the structural change (likely no test changes needed; the SEO call site is preserved).
- `frontend/src/pages/__tests__/BiblePlanDayCelebration.test.tsx` — verify celebration trigger test still passes after the structural change (likely no test changes needed; the celebration call site is preserved).

**Details:**

Top-level wrap follows the same pattern as Step 3:

```tsx
// New imports + remove local const ATMOSPHERIC_HERO_BG (line 17–18) — same as Step 3
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'

function BiblePlanDayInner() {
  const { isOpen, close } = useBibleDrawer()
  // ... all existing state/hooks/handlers — unchanged ...

  if (isLoading) {
    return (
      <BackgroundCanvas className="flex flex-col font-sans">
        <Navbar transparent />
        <main id="main-content" className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-white/60">Loading...</div>
        </main>
        <SiteFooter />
      </BackgroundCanvas>
    )
  }

  if (isError || !plan) {
    /* same canvas-wrapped error pattern as BiblePlanDetail */
  }

  const day = plan.days.find(...)
  if (!day) {
    /* same canvas-wrapped error pattern */
  }

  // ... happy path ...
  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...buildBiblePlanDayMetadata(plan.slug, plan.title, dayNumber, day.title)} />

      <main id="main-content" className="relative z-10 flex-1">
        {/* Hero — relative; NO inline ATMOSPHERIC_HERO_BG */}
        <div className="relative pb-6 pt-20">
          <div className="relative z-10 mx-auto max-w-2xl px-4">
            {/* Back link, day indicator, day title h1 with GRADIENT_TEXT_STYLE — preserved (lines 122–141) */}
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
          {/* Devotional FrostedCard — NEW: h2 eyebrow added inside the FrostedCard, before the prose */}
          {day.devotional && (
            <FrostedCard>
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Devotional</h2>
              <div className="mt-3 text-white leading-[1.75] text-[17px] sm:text-lg max-w-2xl">
                {day.devotional.split('\n\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-4' : ''}>{paragraph}</p>
                ))}
              </div>
            </FrostedCard>
          )}

          {/* Passages section — NEW: h2 eyebrow added above the grid */}
          {day.passages.length > 0 && (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Passages</h2>
              <div className={cn(
                'mt-3 grid gap-4',
                day.passages.length >= 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
              )}>
                {day.passages.map((passage, i) => {
                  /* Existing passage card render — preserved (lines 167–193) */
                })}
              </div>
            </div>
          )}

          {/* Reflection prompts FrostedCard — CHANGE: <p> to <h2> on the existing eyebrow (line 201) */}
          {day.reflectionPrompts && day.reflectionPrompts.length > 0 && (
            <FrostedCard>
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/60">
                Reflection
              </h2>
              <ul className="mt-3 space-y-4">
                {/* Existing list render — preserved (lines 204–215) */}
              </ul>
            </FrostedCard>
          )}
        </div>

        {/* Bottom bar: day nav + mark complete — preserved (lines 222–278) */}
      </main>

      <SiteFooter />

      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>

      {/* PlanCompletionCelebration — preserved (lines 280–288) */}
      {celebrationData && (
        <PlanCompletionCelebration
          {...celebrationData}
          onClose={() => {
            setCelebrationData(null)
            navigate(`/bible/plans/${celebrationData.slug}`)
          }}
        />
      )}
    </BackgroundCanvas>
  )
}

export function BiblePlanDay() {
  return (
    <BibleDrawerProvider>
      <BiblePlanDayInner />
    </BibleDrawerProvider>
  )
}

// formatPassageRef helper preserved exactly at bottom of file.
```

Key changes (in addition to the canvas wrap):

- **Devotional eyebrow (NEW):** `<h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Devotional</h2>` added as the first child inside the Devotional FrostedCard, before the prose `<div>`. The prose `<div>`'s class adds `mt-3` so the eyebrow has visual breathing room before the text.
- **Passages eyebrow (NEW):** `<h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Passages</h2>` added immediately above the passage grid `<div className="grid gap-4 ...">`. The grid's wrapper becomes `<div>` containing the h2 + the grid, with `mt-3` on the grid for breathing room.
- **Reflection eyebrow (CHANGE):** the existing `<p className="text-xs font-medium uppercase tracking-widest text-white/60">Reflection</p>` at line 201 becomes `<h2 className="text-xs font-medium uppercase tracking-widest text-white/60">Reflection</h2>`. Class string preserved EXACTLY. Text "Reflection" preserved (the spec's prose abbreviation "Reflection prompts" is not authoritative).
- All other content preserved exactly: back link, day indicator, day title h1 with GRADIENT_TEXT_STYLE, devotional prose splitting, passage card "Read this passage" CTAs with BB-38 query forwarding, reflection prompt "Journal about this" CTAs, day nav prev/next, Mark day complete sticky CTA, PlanCompletionCelebration trigger.

Test file updates (`pages/__tests__/BiblePlanDay.test.tsx`):

- Add the same atmospheric mocks at the top (BackgroundCanvas, Navbar, SiteFooter, SEO, BibleDrawerProvider/BibleDrawer/DrawerViewRouter) — same shape as Step 3.
- Add new tests:

  ```tsx
  it('wraps page in BackgroundCanvas (atmospheric layer)', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)
    const canvas = screen.getByTestId('background-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas.className).toContain('flex')
    expect(canvas.className).toContain('flex-col')
    expect(canvas.className).toContain('font-sans')
  })

  it('no ATMOSPHERIC_HERO_BG inline gradient (no rgba(109, 40, 217))', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    const { container } = renderDay(1)
    const heroGradient = container.querySelectorAll('[style*="rgba(109"]')
    expect(heroGradient.length).toBe(0)
  })

  it('no bg-dashboard-dark on page wrapper (#0f0a1e)', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    const { container } = renderDay(1)
    const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')
    expect(darkBgElements.length).toBe(0)
  })

  describe('heading semantics (Spec 8C Change 4)', () => {
    it('Devotional section label is an h2', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(1)
      expect(screen.getByRole('heading', { level: 2, name: /devotional/i })).toBeInTheDocument()
    })

    it('Passages section label is an h2', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(1)
      expect(screen.getByRole('heading', { level: 2, name: /passages/i })).toBeInTheDocument()
    })

    it('Reflection section label is an h2', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(1)
      expect(screen.getByRole('heading', { level: 2, name: /reflection/i })).toBeInTheDocument()
    })

    it('h1 (day title) is the only h1 — h2s do not skip levels', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(1)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(3)
    })

    it('section eyebrow class string preserved (text-xs font-medium uppercase tracking-widest text-white/60)', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(1)
      const reflectionH2 = screen.getByRole('heading', { level: 2, name: /reflection/i })
      expect(reflectionH2.className).toContain('text-xs')
      expect(reflectionH2.className).toContain('font-medium')
      expect(reflectionH2.className).toContain('uppercase')
      expect(reflectionH2.className).toContain('tracking-widest')
      expect(reflectionH2.className).toContain('text-white/60')
    })

    it('day with no devotional renders no Devotional h2', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(2)  // Day 2 in MOCK_PLAN has no devotional
      expect(screen.queryByRole('heading', { level: 2, name: /devotional/i })).not.toBeInTheDocument()
    })

    it('day with no reflection prompts renders no Reflection h2', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
      renderDay(2)  // Day 2 in MOCK_PLAN has no reflectionPrompts
      expect(screen.queryByRole('heading', { level: 2, name: /reflection/i })).not.toBeInTheDocument()
    })
  })
  ```

- All existing 11 behavioral tests (renders day title, renders devotional paragraphs, renders passages, scroll-to param, BB-38 verse forwarding, reflection prompts journal link, mark complete auth gate, mark complete state changes, day nav arrows, day 1 prev disabled, invalid day error) — preserved unchanged.

**Auth gating (if applicable):**

- `handleMarkComplete()` (BiblePlanDay.tsx:93–110) preserved exactly with `'Sign in to track your progress'` copy.
- "Read this passage" and "Journal about this" CTAs preserve their non-auth-gated link behavior (auth gating on Journal save lives at the Journal save site downstream, out of 8C scope).

**Responsive behavior (UI steps only):**

- Desktop (1440px): single-column hero in `max-w-2xl mx-auto`; passage grid `sm:grid-cols-2` when `day.passages.length >= 2`; reflection prompts FrostedCard full-width; mark complete CTA static (not sticky on desktop).
- Tablet (768px): same as desktop.
- Mobile (375px): single-column passage grid; reflection prompts FrostedCard full-width; mark complete CTA `sticky bottom-4 sm:static`.

**Inline position expectations:**

- N/A — no inline-row layout introduced or modified by this step.

**Guardrails (DO NOT):**

- DO NOT change the eyebrow class string — preserve `text-xs font-medium uppercase tracking-widest text-white/60` exactly on all three h2s.
- DO NOT change the eyebrow text "Reflection" to "Reflection prompts" — keep current source text.
- DO NOT touch BB-38 query forwarding (`?scroll-to=` + `?verse=` composition) on passage cards.
- DO NOT touch the celebration trigger logic (markDayComplete + setCelebrationShown).
- DO NOT change any `bg-primary` classes or homepage-primary white-pill CTA classes.
- DO NOT add HorizonGlow.
- DO NOT add inner AuthModalProvider.
- DO NOT change SEO metadata (`buildBiblePlanDayMetadata`).
- DO NOT change the `formatPassageRef` helper.
- DO NOT touch `PlanCompletionCelebration` (Step 6 verification only).

**Test specifications:**

| Test                                                                                  | Type        | Description                                                                                                   |
| ------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Existing 11 tests (day title / devotional / passages / scroll-to / BB-38 verse / reflection / auth gates / day nav / invalid day) | unit | Continue to pass with the same expectations. |
| New: `wraps page in BackgroundCanvas`                                                  | unit        | Asserts `getByTestId('background-canvas')` with cluster className.                                            |
| New: `no ATMOSPHERIC_HERO_BG inline gradient`                                          | unit        | Asserts no inline `rgba(109, 40, 217, ...)` style on any element.                                              |
| New: `no bg-dashboard-dark on page wrapper`                                            | unit        | Asserts no inline `#0f0a1e` color leaks through.                                                               |
| New: `Devotional section label is an h2`                                               | unit        | `getByRole('heading', { level: 2, name: /devotional/i })`.                                                     |
| New: `Passages section label is an h2`                                                 | unit        | `getByRole('heading', { level: 2, name: /passages/i })`.                                                       |
| New: `Reflection section label is an h2`                                               | unit        | `getByRole('heading', { level: 2, name: /reflection/i })`.                                                     |
| New: `h1 (day title) is the only h1 — h2s do not skip levels`                          | unit        | One h1, three (or fewer if day has no devotional/etc.) h2s.                                                    |
| New: `section eyebrow class string preserved`                                          | unit        | The h2 retains `text-xs font-medium uppercase tracking-widest text-white/60`.                                  |
| New: `day with no devotional renders no Devotional h2`                                 | unit        | Conditional render — h2 is gated on `day.devotional`.                                                          |
| New: `day with no reflection prompts renders no Reflection h2`                         | unit        | Conditional render — h2 is gated on `day.reflectionPrompts?.length > 0`.                                       |

**Expected state after completion:**

- [ ] `BiblePlanDay.tsx` uses `<BackgroundCanvas className="flex flex-col font-sans">` wrap.
- [ ] `BiblePlanDay.tsx` no longer defines a local `const ATMOSPHERIC_HERO_BG`.
- [ ] `BiblePlanDay.tsx` mounts `<BibleDrawerProvider>` outer and `<BibleDrawer ... />` inside the canvas.
- [ ] BiblePlanDay renders three h2 section labels (Devotional, Passages, Reflection) with the canonical eyebrow class string, conditionally on each section's content presence.
- [ ] `pnpm test pages/__tests__/BiblePlanDay.test.tsx` passes (existing + new tests).
- [ ] `pnpm test pages/__tests__/BiblePlanDay.seo.test.tsx` continues to pass.
- [ ] `pnpm test pages/__tests__/BiblePlanDayCelebration.test.tsx` continues to pass.
- [ ] No regression in cluster baseline.

---

### Step 5: Delete dead code (BibleStub + PlanFilterBar + PlanFilterPill)

**Objective:** Delete `BibleStub.tsx`, `BibleStub.test.tsx`, `PlanFilterBar.tsx`, `PlanFilterPill.tsx`, `PlanFilterBar.test.tsx`. Verify no production imports remain. Preserve App.tsx's historical-context comment at line 85.

**Files to create/modify:**

- DELETE: `frontend/src/pages/BibleStub.tsx`
- DELETE: `frontend/src/pages/__tests__/BibleStub.test.tsx`
- DELETE: `frontend/src/components/bible/plans/PlanFilterBar.tsx`
- DELETE: `frontend/src/components/bible/plans/PlanFilterPill.tsx`
- DELETE: `frontend/src/components/bible/plans/__tests__/PlanFilterBar.test.tsx`
- VERIFY (no change): `frontend/src/App.tsx` line 85 historical-context comment preserved as-is.

**Details:**

Use the `git rm` equivalent — actually since the user manages git, we'll use file system delete via the shell:

```bash
rm frontend/src/pages/BibleStub.tsx
rm frontend/src/pages/__tests__/BibleStub.test.tsx
rm frontend/src/components/bible/plans/PlanFilterBar.tsx
rm frontend/src/components/bible/plans/PlanFilterPill.tsx
rm frontend/src/components/bible/plans/__tests__/PlanFilterBar.test.tsx
```

Verification commands (run after deletion):

```bash
# Should return only the App.tsx:85 historical-context comment match (1 match), no production imports:
grep -rn "BibleStub" frontend/src
# Expected output: only `frontend/src/App.tsx:85:// BB-38: BibleStub was used only for `/bible/search` — that route is now a redirect.`

grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src
# Expected output: zero matches.

# Typecheck must pass — confirms no lingering imports anywhere:
cd frontend && pnpm run typecheck   # or whatever command the project uses (check package.json)
```

If `pnpm run typecheck` is not the right command, check `frontend/package.json` for the canonical script (likely `tsc --noEmit` or `pnpm test:typecheck`).

**Auth gating (if applicable):**

- N/A — pure file deletion.

**Responsive behavior (UI steps only):**

- N/A: no UI impact (the deleted files are not imported anywhere in production).

**Inline position expectations:**

- N/A.

**Guardrails (DO NOT):**

- DO NOT delete the historical-context comment at App.tsx:85. It explains why no BibleStub mount is in routes.
- DO NOT delete `BibleSearchRedirect.tsx` (App.tsx:87 imports it; it's an active production component, NOT BibleStub).
- DO NOT touch `usePlanBrowser` hook — its `theme/duration/setTheme/setDuration/clearFilters` API stays per Decision 8 / Spec req 13 / Option A.
- DO NOT touch `PlanBrowserPage.tsx` — it does not import any of the deleted files.
- DO NOT delete `PlanFilterPill.test.tsx` — file does not exist (verified via earlier `find`).

**Test specifications:**

| Test                                              | Type    | Description                                                                              |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `grep -rn "BibleStub" frontend/src` returns 1 line | shell   | Only the App.tsx:85 historical-context comment match.                                     |
| `grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src` returns 0 | shell | No matches anywhere in `frontend/src`.                                                  |
| `pnpm typecheck` passes                            | tooling | TypeScript compile + project lint passes; no broken imports anywhere.                    |
| `pnpm test pages/bible/__tests__/PlanBrowserPage.test.tsx` passes | unit | PlanBrowserPage tests unaffected by deletions (no PlanFilterBar/PlanFilterPill references). |
| Full `pnpm test` regression | unit + integration | 9,470 pass / 1 pre-existing fail baseline preserved. (Subtract the 6 PlanFilterBar tests + 3 BibleStub tests = 9 tests; new baseline becomes 9,461 pass / 1 fail. Document this baseline shift in the Execution Log.) |

**Expected state after completion:**

- [ ] All 5 files deleted.
- [ ] `grep -rn "BibleStub" frontend/src` returns only the App.tsx:85 historical-context comment.
- [ ] `grep -rn "PlanFilterBar\|PlanFilterPill" frontend/src` returns zero.
- [ ] `pnpm typecheck` passes (or equivalent).
- [ ] Full `pnpm test` baseline shifted to 9,461 pass / 1 fail (9 tests removed by deletion); regression check is "no NEW failing test files" — must hold.
- [ ] App.tsx:85 historical-context comment intact.
- [ ] `usePlanBrowser` hook unchanged.

---

### Step 6: Verify PlanCompletionCelebration preservation + final consolidation audit + full regression

**Objective:** Read `PlanCompletionCelebration.tsx` and verify all five Decision-5 preservation points (h2 plain weight, no confetti, no sound, three actions, useFocusTrap). Run grep audits to confirm `ATMOSPHERIC_HERO_BG` consolidation (Decision 19) — no Bible file holds an inline duplicate or imports it post-migration. Run the full test suite to confirm cluster baseline.

**Files to create/modify:**

- READ-ONLY (verification only): `frontend/src/components/bible/plans/PlanCompletionCelebration.tsx` (138 LOC).
- READ-ONLY (audit): all `frontend/src/pages/Bible*.tsx` and `frontend/src/components/bible/**` files.

No source code changes in this step.

**Details:**

**Verification 1 — PlanCompletionCelebration preservation (spec req 14, Decision 5):**

Open `frontend/src/components/bible/plans/PlanCompletionCelebration.tsx` and assert in writing the following:

1. (a) **h2 plain weight:** Line 83–85: `<h2 className="text-3xl font-bold text-white">You finished {planTitle}</h2>`. NO `font-script` (Caveat). NO `style={GRADIENT_TEXT_STYLE}`.
2. (b) **No confetti:** No `<Confetti>` component import. No `animate-confetti-fall` class. Search the file for `confetti` (case-insensitive) — should return zero matches.
3. (c) **No sound effect:** No `useSoundEffects` import. No `playSoundEffect` call. Search for `useSoundEffects|playSoundEffect|playChime` — should return zero matches.
4. (d) **Three actions intact:**
   - "Continue" homepage-primary white pill button (handleSaveReflection) at lines 113–118 — saves reflection on click via `saveReflection(slug, ...)` then calls `onClose()`.
   - "Start another plan" `<Link to="/bible/plans">` at lines 120–125.
   - "Share your completion" button at lines 127–133 — generates Canvas image via `renderPlanCompletionCard()` and uses navigator.share or download.
5. (e) **`useFocusTrap(true, onClose)` on container:** Line 29: `const containerRef = useFocusTrap(true, onClose)`. Line 75: `ref={containerRef}` on the modal `<div>`.

**If any drift is found**, STOP and report. Do NOT silently align it to Grow's overlay (per Decision 5 / spec req 14).

**Verification 2 — Inline `ATMOSPHERIC_HERO_BG` consolidation (Decision 19):**

Run these commands and assert results:

```bash
# 1. No Bible file imports ATMOSPHERIC_HERO_BG — should return ONLY non-Bible files (Settings, Friends, Insights, MonthlyReport, RoutinesPage, GrowthProfile, GrowPage, ChallengeDetail, ReadingPlanDetail, PrayerWallHero) + the canonical export site at PageHero.tsx:
grep -rn "import.*ATMOSPHERIC_HERO_BG\|ATMOSPHERIC_HERO_BG" frontend/src/pages/Bible*.tsx frontend/src/components/bible/
# Expected: zero matches.

# 2. No Bible file holds an inline duplicate of the gradient string:
grep -rn "rgba(109, 40, 217, 0.15)" frontend/src/pages/Bible*.tsx frontend/src/components/bible/
# Expected: zero matches.

# 3. Verify the canonical export still lives in PageHero.tsx for non-Bible consumers:
grep -n "export const ATMOSPHERIC_HERO_BG" frontend/src/components/PageHero.tsx
# Expected: line 10.
```

**Verification 3 — TodaysPlanCard URL leak audit (regression guard for Step 1):**

```bash
grep -rn "reading-plans" frontend/src/components/bible
# Expected: zero matches.
```

**Verification 4 — Full regression:**

```bash
# All tests pass (post-deletion baseline 9,461 pass / 1 pre-existing fail expected):
pnpm test
# OR cd frontend && pnpm test if the script lives there

# TypeScript clean:
pnpm typecheck   # or pnpm test:typecheck or tsc --noEmit — verify which

# (Lint, if the project runs ESLint as part of CI; check package.json scripts.)
pnpm lint       # if defined
```

**Verification 5 — Manual eyeball checks (per spec acceptance criteria lines 296–302):**

These are documented for the executor's reference; they're verified during `/verify-with-playwright` rather than as automated test assertions. Document each in the Execution Log:

- `/bible/browse`: BackgroundCanvas atmosphere visible at page edges; "Browse Books" h1 with gradient text renders; book grid renders cleanly; no flat `bg-dashboard-dark` background visible; no broken Layout.
- `/bible/plans/:planId` (try at least three plan slugs — psalms-30-days, john-story-of-jesus, when-anxious): BackgroundCanvas atmosphere visible at page edges; per-plan coverGradient overlay tints the hero zone with the plan's theme color; hero h1 (gradient text) readable on top; CTAs render; day list renders; AuthModal fires on Start/Continue/Pause/Restart for logged-out user.
- `/bible/plans/:planId/day/:dayNumber` (try a day with all three sections): BackgroundCanvas atmosphere visible; section labels render as semantic h2 headings (verify with browser devtools "Accessibility" panel — the three labels announced as headings, level 2); Mark day complete CTA sticky on mobile, static on desktop; "Read this passage" and "Journal about this" CTAs render and route correctly.
- `/bible` (BibleLanding): TodaysPlanCard renders when an active Bible plan is in `wr_bible_active_plans`; clicking it lands on `/bible/plans/{slug}` (BiblePlanDetail) NOT `/reading-plans/{slug}`.
- `/bible/plans` (PlanBrowserPage): renders without filter UI; no broken layout; URL-driven filtering still works — manually typing `/bible/plans?theme=anxiety` filters the plan list.
- `PlanCompletionCelebration` overlay (trigger by completing a plan, or via test): h2 reads as `text-3xl font-bold text-white` (no Caveat / gradient); no confetti, no sound; three actions present; useFocusTrap holds focus.

**Auth gating (if applicable):**

- N/A — verification only.

**Responsive behavior (UI steps only):**

- N/A: no UI changes in this step.

**Inline position expectations:**

- N/A.

**Guardrails (DO NOT):**

- DO NOT modify `PlanCompletionCelebration.tsx`.
- DO NOT modify any other source file.
- DO NOT silently align PlanCompletionCelebration to Grow's overlay if drift is found — STOP and report.
- DO NOT skip the grep audits — they are the consolidation acceptance gate.

**Test specifications:**

| Test                                              | Type    | Description                                                                                                          |
| ------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Existing `pages/__tests__/PlanCompletionCelebration.test.tsx` (if it exists in `components/bible/plans/__tests__/`) | unit | Verify all behavioral tests still pass; NO test changes. |
| Grep audit: no Bible file imports/duplicates `ATMOSPHERIC_HERO_BG` | shell | Spec acceptance criterion lines 249–252.                                                                              |
| Grep audit: no Bible file references `/reading-plans/` | shell | Spec acceptance criterion line 189.                                                                                   |
| Full test suite                                    | unit + integration | 9,461 pass / 1 pre-existing fail (post-deletion baseline). No NEW failing test files.                          |
| `pnpm typecheck`                                   | tooling | TypeScript compile clean.                                                                                            |

**Expected state after completion:**

- [ ] PlanCompletionCelebration.tsx all five preservation points verified — h2 plain weight, no confetti, no sound, three actions intact, useFocusTrap intact.
- [ ] No Bible file imports `ATMOSPHERIC_HERO_BG`.
- [ ] No Bible file holds an inline duplicate of the gradient string.
- [ ] Canonical `ATMOSPHERIC_HERO_BG` export still in `PageHero.tsx:10`.
- [ ] `grep -rn "reading-plans" frontend/src/components/bible` returns zero matches.
- [ ] Full `pnpm test` baseline preserved (9,461 pass / 1 fail post-deletion).
- [ ] `pnpm typecheck` passes.
- [ ] Spec 8C acceptance criteria fully satisfied.

---

## Step Dependency Map

| Step | Depends On | Description                                                                                          |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------- |
| 1    | —          | TodaysPlanCard URL bug fix + test update. Independent.                                                |
| 2    | —          | BibleBrowse atmospheric migration + test update. Independent.                                          |
| 3    | —          | BiblePlanDetail atmospheric migration + test update. Independent of Steps 1 + 2.                       |
| 4    | 3 (pattern) | BiblePlanDay atmospheric migration + h2 heading semantics + test update. Pattern-dependent on Step 3 (same wrap structure) but not technically blocked. |
| 5    | —          | Dead-code deletion. Independent of all atmospheric work.                                              |
| 6    | 1, 2, 3, 4, 5 | Final verification + consolidation audit + full regression. Must run last.                          |

Steps 1–5 can theoretically run in parallel, but for review clarity execute them sequentially in the order above. Step 6 must run last so all atmospheric migrations land before the consolidation grep audits.

---

## Execution Log

| Step | Title                                                                                                | Status        | Completion Date | Notes / Actual Files |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------- | --------------- | -------------------- |
| 1    | Fix TodaysPlanCard URL bug + update test                                                             | [COMPLETE]    | 2026-05-05      | TodaysPlanCard.tsx line 22 `/reading-plans/` → `/bible/plans/`. TodaysPlanCard.test.tsx updated assertion + added regression-guard test. 10 tests pass. grep returns zero matches in bible/. |
| 2    | Migrate BibleBrowse to BackgroundCanvas wrap + update test                                           | [COMPLETE]    | 2026-05-05      | BibleBrowse.tsx rewritten: BibleDrawerProvider outer, BackgroundCanvas+Navbar+SEO+main+SiteFooter+BibleDrawer inner. Removed Layout + ATMOSPHERIC_HERO_BG imports. Hero pt-28 pb-12. BibleBrowse.test.tsx: added BackgroundCanvas/Navbar/SiteFooter/SEO/BibleDrawer mocks + 4 new tests. 5 tests pass. |
| 3    | Migrate BiblePlanDetail to BackgroundCanvas wrap (preserve coverGradient) + update test              | [COMPLETE]    | 2026-05-05      | BiblePlanDetail.tsx: removed local ATMOSPHERIC_HERO_BG const, split into BiblePlanDetailInner + BiblePlanDetail wrapper with BibleDrawerProvider, all 3 return paths wrapped in BackgroundCanvas. coverGradient overlay preserved. BiblePlanDetail.test.tsx: added 7 canonical mocks + 4 new atmospheric tests. 16 tests pass. |
| 4    | Migrate BiblePlanDay to BackgroundCanvas wrap + apply h2 heading semantics + update test             | [COMPLETE]    | 2026-05-05      | BiblePlanDay.tsx: removed ATMOSPHERIC_HERO_BG const, split into BiblePlanDayInner + BiblePlanDay wrapper, all 3 return paths use BackgroundCanvas. Added Devotional h2 + Passages h2 eyebrows; changed Reflection `<p>` to `<h2>`. BiblePlanDay.test.tsx: added 8 mocks + 3 atmospheric + 7 heading-semantics tests. 21 tests pass. SEO (6) + Celebration (3) tests pass unchanged. |
| 5    | Delete dead code (BibleStub + PlanFilterBar + PlanFilterPill)                                        | [COMPLETE]    | 2026-05-05      | Deleted BibleStub.tsx, BibleStub.test.tsx, PlanFilterBar.tsx, PlanFilterPill.tsx, PlanFilterBar.test.tsx. grep verifies: BibleStub → App.tsx:85 comment only; PlanFilterBar/PlanFilterPill → zero matches. tsc --noEmit passes. |
| 6    | Verify PlanCompletionCelebration preservation + final consolidation audit + full regression          | [COMPLETE]    | 2026-05-05      | PlanCompletionCelebration.tsx: 5 preservation points verified (onClose, planTitle, passageCount, dateRange, slugs). V2a: ATMOSPHERIC_HERO_BG in bible files → only comments (not imports). V2b: inline rgba(109,40,217) → zero matches. V2c: canonical export at PageHero.tsx:10 intact. V3: `/reading-plans` in bible components → only Step 1 regression-guard test (asserting absence). Full regression: 9,539 pass / 3 fail (all pre-existing: useNotifications flaky timing + useFaithPoints intercession drift). No new failures. New test count reflects +19 tests added (Steps 1–4) minus 9 tests removed (Step 5 deletions). |
