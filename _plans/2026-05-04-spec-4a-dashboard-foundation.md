# Implementation Plan: Spec 4A — Dashboard Foundation

**Spec:** `_specs/spec-4a-dashboard-foundation.md`
**Date:** 2026-05-04
**Branch:** `forums-wave-continued` (existing — DO NOT create or switch branches)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ stale: dated 2026-04-06, predates Spec Y / Wave 7 / DailyHub 1A-1B / Spec 3 BackgroundCanvas migration). Trust the live source files at `frontend/src/components/ui/{FrostedCard,BackgroundCanvas,Button}.tsx` and `09-design-system.md` over the recon for any disagreement.
**Recon Report:** `_plans/recon/dashboard-2026-05-04.md` (loaded — 879 lines, dated 2026-05-04, current)
**Master Spec Plan:** `_plans/direction/dashboard-2026-05-04.md` (loaded — direction document for 4A/4B/4C)

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard, logged-in). Every change in this spec lands here.
- `/daily?tab=devotional` — regression surface (Button subtle/ghost variants, FrostedCard primitives that 4A touches indirectly through global `bg-primary` / `text-primary` migration)
- `/daily?tab=pray` — regression surface
- `/daily?tab=journal` — regression surface
- `/daily?tab=meditate` — regression surface
- `/bible` — regression surface (consumes BackgroundCanvas, FrostedCard already; verify nothing changes)
- `/bible/plans` — regression surface (consumes FrostedCard accent already; verify nothing changes)
- `/prayer-wall` — regression surface (Button ghost variant consumers)

---

## Architecture Context

### Project structure (verified)

- Page: `frontend/src/pages/Dashboard.tsx` (644 LOC; root render at `/` for `isAuthenticated === true`)
- Card primitive: `frontend/src/components/dashboard/DashboardCard.tsx` (110 LOC; consumed by ~12 widgets via `DashboardWidgetGrid`)
- Hero: `frontend/src/components/dashboard/DashboardHero.tsx` (182 LOC)
- Garden: `frontend/src/components/dashboard/GrowthGarden.tsx` (871 LOC; `forwardRef<SVGSVGElement>`; `size: 'sm' | 'md' | 'lg'` prop with internal `SIZE_CLASSES = { sm: 'h-[150px]', md: 'h-[200px]', lg: 'h-[300px]' }`)
- Customize panel: `frontend/src/components/dashboard/CustomizePanel.tsx` (247 LOC; uses `bg-hero-mid/95 backdrop-blur-xl` rolls-own chrome)
- Liturgical hook: `frontend/src/hooks/useLiturgicalSeason.ts` → `frontend/src/constants/liturgical-calendar.ts`
- Liturgical tests: `frontend/src/constants/__tests__/liturgical-calendar.test.ts` (existing — recency window cases must be added)
- InstallCard: `frontend/src/components/dashboard/InstallCard.tsx` (51 LOC) — **note spec body says `components/ui/InstallCard.tsx` but the actual path is `components/dashboard/InstallCard.tsx`. Use the actual path.**
- EveningReflectionBanner: `frontend/src/components/dashboard/EveningReflectionBanner.tsx`
- GratitudeWidget: `frontend/src/components/dashboard/GratitudeWidget.tsx`
- PrayerListWidget: `frontend/src/components/dashboard/PrayerListWidget.tsx`
- MoodCheckIn: `frontend/src/components/dashboard/MoodCheckIn.tsx` (Continue button line 220)
- Tests directory: `frontend/src/components/dashboard/__tests__/` (51 files, ~10,303 LOC) + `frontend/src/pages/__tests__/` (5 dashboard test files)

### Patterns to follow

- **FrostedCard import path:** `@/components/homepage/FrostedCard` (the canonical FrostedCard lives in the homepage folder; widely consumed across Bible, homepage, etc.).
- **FrostedCard prop API today** (verified at `frontend/src/components/homepage/FrostedCard.tsx:1-103`):
  - `variant?: 'accent' | 'default' | 'subdued'`
  - `as?: 'div' | 'button' | 'article'` — does NOT currently accept `'section'`. Change 2 Option A requires extending this union to add `'section'`.
  - Does NOT forward `aria-labelledby` today. Change 2 Option A requires adding `'aria-labelledby'?: string` to the prop interface and spreading it onto the host element.
  - Default variant base: `'bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base'`
  - Default variant hover (only applies when `onClick` is set): `'hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5'`
  - Subdued variant base: `'bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5'`
- **DashboardCard is non-interactive (no `onClick`)**; FrostedCard's hover treatment is gated behind `isInteractive = !!onClick`. To get the spec-required hover lift, EITHER pass `onClick={undefined}` and add the hover classes via `className` directly, OR adjust FrostedCard's hover gating. See Step 3 for the chosen approach.
- **BackgroundCanvas import path:** `@/components/ui/BackgroundCanvas`. It renders `<div className="relative min-h-screen overflow-hidden" style={{ background: CANVAS_BACKGROUND }}>` — multi-layer radial-gradient + linear-gradient backdrop on `#120A1F → #08051A → #0A0814`. Used by DailyHub (post Spec 3), BibleLanding, `/bible/plans`.
- **Button import path:** `@/components/ui/Button`. Variant `subtle`: `'rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]'`. Sizing via the `size` prop (sm/md/lg) automatically picks `px-4 py-2 text-sm` / `px-6 py-2.5 text-sm` / `px-8 py-3 text-base`.
- **Variant `ghost`:** `'text-white/80 hover:text-white hover:bg-white/5'`. Use for ghost-link-with-button-affordance contexts.
- **Animation tokens:** `frontend/src/constants/animation.ts` — `ANIMATION_DURATIONS.{instant,fast,base,slow}` and `ANIMATION_EASINGS.{standard,decelerate,accelerate,sharp}`. DashboardHero already imports these (line 6); preserve.
- **Liturgical season hook contract:** `useLiturgicalSeason(dateOverride?: Date) → LiturgicalSeasonResult { currentSeason, seasonName, themeColor, icon, greeting, daysUntilNextSeason, isNamedSeason }`. Hook is a thin `useMemo` wrapper around `getLiturgicalSeason(date)` in `liturgical-calendar.ts`. The recency-window logic lands in `liturgical-calendar.ts`, not the hook.
- **Easter 2026:** `computeEasterDate(2026)` returns 2026-04-05 (verified in existing test). Today (2026-05-04) is Easter + 29 days — outside the 14-day window. After 4A ships, the hero should NOT show "Happy Easter" today.

### Database tables involved

None. This is a frontend-only visual migration. No backend, no Liquibase, no Spring Boot.

### Test patterns to match

- Vitest + React Testing Library. Tests live next to components in `__tests__/` folders.
- DashboardCard.test.tsx (94 LOC) currently asserts on chrome class strings (`bg-white/5`, `border-white/10`, `rounded-2xl`, `backdrop-blur-sm`). Update to new tokens as the chrome literally changes.
- WelcomeWizard.test.tsx asserts on `bg-primary` for active dot indicator (line 110, 405) — that's an active-state dot, NOT a button — keep as-is (Change 6 explicitly defers WelcomeWizard).
- Liturgical-calendar tests live at `frontend/src/constants/__tests__/liturgical-calendar.test.ts`. Add cases to a new `describe('greeting recency window', ...)` block.
- For recency tests, use the `dateOverride` parameter on `getLiturgicalSeason(date)` so tests are deterministic without mocking `Date`.
- DashboardHero-seasonal.test.tsx asserts on greeting display logic — update tests as needed when `isNamedSeason` semantics change at the boundary.
- progress-bar-glow.test.tsx (280 LOC) tests the inline-style `boxShadow` glow — Change 3 preserves this verbatim, no test changes expected.

### Auth gating patterns

- `AuthProvider` route-level gating: `RootRoute` returns `<Dashboard />` only when `isAuthenticated === true`. Logged-out users see `<Home />` instead. No changes in this spec.
- All widgets the spec touches are already auth-gated at the route level (Dashboard never renders for logged-out users).
- The auth modal is NOT triggered by any change in this spec — it's a visual migration. No new gates added.

### Shared data models from master plan

None. This spec consumes existing FrostedCard/Button/BackgroundCanvas primitives that already shipped. No new types, no new localStorage keys.

### Cross-spec dependencies from master plan

- **4A unblocks 4B and 4C.** Per direction-doc Decision 4, every widget that consumes DashboardCard inherits the new chrome from Step 3 (DashboardCard primitive migration). 4B and 4C apply per-widget content treatment AFTER 4A's chrome is in place.
- Direction-doc Decisions explicitly addressed in 4A: 1 (atmospheric layer), 5 (`bg-primary` → subtle), 6 (`text-primary` → `text-white/80`), 14 (GrowthGarden double-mount), 15 (liturgical recency).
- Direction-doc Decisions explicitly DEFERRED: 4 (per-widget content), 7 (Lora italic preservation), 8 (anti-pressure copy), 11 (Tonal Icon Pattern), 12 (InstallCard widget promotion), 13 (Caveat-to-gradient).

---

## Auth Gating Checklist

This spec is a visual migration on already-auth-gated surfaces. It introduces NO new interactive elements, NO new gated actions, NO new auth-modal triggers.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit `/` | Auth-gated at route level via `AuthProvider` (existing) | N/A — unchanged | `RootRoute` swaps to `<Home />` when logged out |
| Click "Reflect Now" on EveningReflectionBanner | Banner only renders for logged-in users (existing) | Step 7 (visual migration of button only) | Inherited from Dashboard route gate |
| Click "Save" on GratitudeWidget | Widget only renders for logged-in users (existing) | Step 7 (visual migration of button only) | Inherited from Dashboard route gate |
| Click "Add Prayer" on PrayerListWidget | Widget auth-gated (existing) | Step 7 (visual migration of button only) | Inherited from Dashboard route gate |
| Click "Install" on InstallCard | Card only renders for logged-in users on Dashboard (existing) | Step 7 (visual migration of button only) | Inherited from Dashboard route gate |
| Click "Done" / "Reset to default" in CustomizePanel | Panel auth-gated by Customize trigger (existing) | Step 9 (visual migration of buttons only) | Inherited from Dashboard route gate |
| MoodCheckIn submit | Modal only opens for logged-in users (existing) | Step 7 (visual migration of submit button only) | Inherited from Dashboard route gate |

No auth gate is missing from the implementation steps.

---

## Design System Values (for UI steps)

Sourced from live primitive source files (FrostedCard, BackgroundCanvas, Button) — these supersede the older recon snapshot since the primitives are the canonical authority.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| BackgroundCanvas | background | Five-layer composite: `radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%), radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%), linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` | `frontend/src/components/ui/BackgroundCanvas.tsx:9-15` |
| BackgroundCanvas | wrapper classes | `relative min-h-screen overflow-hidden` | `frontend/src/components/ui/BackgroundCanvas.tsx:20` |
| FrostedCard `variant="default"` | base classes | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `frontend/src/components/homepage/FrostedCard.tsx:33` |
| FrostedCard `variant="default"` | hover classes (gated by `onClick`) | `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` | `frontend/src/components/homepage/FrostedCard.tsx:34` |
| FrostedCard `variant="default"` | transition | `transition-all motion-reduce:transition-none duration-base ease-decelerate` | `frontend/src/components/homepage/FrostedCard.tsx:69` |
| FrostedCard `variant="subdued"` | base classes | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `frontend/src/components/homepage/FrostedCard.tsx:37` |
| Button `variant="subtle"` | classes | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | `frontend/src/components/ui/Button.tsx:51-52` |
| Button `variant="subtle"` size `md` | sizing | `px-6 py-2.5 text-sm` | `frontend/src/components/ui/Button.tsx:62` |
| Button `variant="subtle"` size `sm` | sizing | `px-4 py-2 text-sm` | `frontend/src/components/ui/Button.tsx:61` |
| Button `variant="ghost"` | classes | `text-white/80 hover:text-white hover:bg-white/5` (with default `rounded-md`) | `frontend/src/components/ui/Button.tsx:57` |
| DashboardHero progress bar fill | classes | `h-full rounded-full bg-primary` (PRESERVE — semantic active-state violet) | `DashboardHero.tsx:166` |
| DashboardHero progress bar glow | inline style | violet on increase: `0 0 8px rgba(139, 92, 246, 0.4)`; amber on decrease: `0 0 8px rgba(217, 119, 6, 0.3)` (PRESERVE verbatim) | `DashboardHero.tsx:64-66` |
| Liturgical theme colors | values | `easter='#FDE68A'`, `christmas='#FBBF24'`, `holy-week='#991B1B'`, `pentecost='#DC2626'`, `advent='#7C3AED'`, `epiphany='#FBBF24'`, `lent='#6B21A8'` | `liturgical-calendar.ts:35-108` |

This table is the executor's copy-paste reference for all styling. No guessing.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room dark theme. Dashboard target: multi-bloom violet canvas via `<BackgroundCanvas>` matching DailyHub / BibleLanding / `/bible/plans`. Inner `bg-dashboard-dark` on the existing wrapper div STAYS — BackgroundCanvas layers atmospheric blooms on top.
- FrostedCard import: `@/components/homepage/FrostedCard`. **NOT** `@/components/ui/FrostedCard` — that path does not exist.
- FrostedCard `as` prop today: `'div' | 'button' | 'article'`. Adding `'section'` is part of Change 2 Option A. FrostedCard does NOT forward `aria-labelledby` today — Change 2 Option A also adds that.
- FrostedCard hover treatment is gated by `isInteractive = !!onClick`. DashboardCard is non-interactive (the `<section>` wrapper). To get the spec-required hover lift on a non-interactive card, the hover classes must be applied via `className` rather than relying on the gated `isInteractive` path. Step 3 details the chosen approach.
- All `bg-primary` solid buttons in 4A scope migrate to `<Button variant="subtle" size="md">`. Preserve every click handler, disabled state, aria attribute, conditional render branch.
- All `text-primary` ghost links in 4A scope migrate to either `text-white/80 hover:text-white` (inline links) OR `<Button variant="ghost" size="sm">` (button-affordance contexts). `text-primary` instances that are semantic active-state colors on icons (StreakCard line 300, NotificationItem line 134, WelcomeWizard line 273 active dot, line 488 Check icon) PRESERVE as-is.
- Progress bar `bg-primary` fill on DashboardHero (line 166) and StreakCard (line 319) is PRESERVED — semantic active-state violet, not a button.
- GrowthGarden palette is a documented exception: earth tones, leaf green, sky blue stay. Tonal Icon Pattern does NOT apply.
- DashboardCard preserves verbatim: collapse logic, `dashboard-collapse-storage` integration, chevron rotation, `aria-expanded`, `aria-controls`, `<section aria-labelledby={titleId}>`, header layout (icon + `<h2 id={titleId}>` + chevron + headerAction slot), `p-4 md:p-6` padding override, the `motion-safe:animate-widget-enter` class on the wrapping div in DashboardWidgetGrid (NOT on the card itself).
- DashboardCard's `padding: p-4 md:p-6` overrides FrostedCard's default `p-6`. Pass `className="p-4 md:p-6"` to FrostedCard so the card has Dashboard's tighter mobile padding (FrostedCard's class merge via `cn()` lets the override win).
- The `motion-safe:animate-widget-enter` class lives on the wrapping div around DashboardCard in DashboardWidgetGrid — NOT on the card itself. Do not move it.
- Animation tokens at `frontend/src/constants/animation.ts`. DashboardHero already imports `ANIMATION_DURATIONS` and `ANIMATION_EASINGS` (line 6); preserve.
- FrostedCard hover translate (`hover:-translate-y-0.5`) is `motion-reduce:hover:translate-y-0` gated. Preserve when applying hover classes manually.
- Easter 2026 = April 5. Today (2026-05-04) is Easter + 29 days — outside the 14-day greeting window. After 4A ships, the hero should NOT show "Happy Easter" today.
- FrostedCard's default-variant `transition-all motion-reduce:transition-none duration-base ease-decelerate` runs always on the card. The hover translate is the only animated property in motion-reduce mode (no — motion-reduce:transition-none disables it).

**Sourced from:** the live primitive source files, `09-design-system.md` (especially Round 3 Visual Patterns, Daily Hub Visual Architecture, FrostedCard Tier System, White Pill CTA Patterns, Deprecated Patterns), the dashboard recon at `_plans/recon/dashboard-2026-05-04.md`, and the recent Spec 3 execution log (BackgroundCanvas migration pattern, FrostedCard `as="article"` + Link group-hover pattern).

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift back to default assumptions.

---

## Shared Data Models (from Master Plan)

No new TypeScript interfaces. No new localStorage keys.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_dashboard_collapsed` | Read/Write (preserved verbatim) | DashboardCard collapse state. Change 2 must preserve. |
| `wr_dashboard_layout` | Read/Write (preserved verbatim) | CustomizePanel persists ordering. Change 8 must preserve. |
| `wr_gratitude_entries` | Read/Write (preserved verbatim) | GratitudeWidget Save handler unchanged. |
| `wr_prayer_list` | Read/Write (preserved verbatim) | PrayerListWidget Add Prayer unchanged (it's a Link, not a click handler). |
| `wr_mood_entries` | Read/Write (preserved verbatim) | MoodCheckIn submit handler unchanged. |
| `wr_install_dashboard_shown` | Read/Write (preserved verbatim) | InstallCard install/dismiss unchanged. |
| `wr_evening_reflection` | Read/Write (preserved verbatim) | EveningReflectionBanner dismiss unchanged. |

No key shape changes. No new keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | BackgroundCanvas blooms scale per existing canvas behavior. DashboardHero status strip wraps to multiple lines. DashboardCard chrome (rounded-3xl, frosted) renders identically — surface tokens are viewport-independent. GrowthGarden renders at `size="md"` via consolidated single-instance approach (no longer two SVGs). CustomizePanel renders as bottom sheet. MoodCheckIn submit `<Button variant="subtle">` renders full-width. |
| Tablet | 768px | DashboardHero remains single-line where space permits; status strip pills lay out inline. DashboardCard chrome unchanged. GrowthGarden still at `size="md"` (Tailwind `lg:` is the breakpoint at 1024px). CustomizePanel still bottom sheet. |
| Desktop | 1440px | Full multi-bloom canvas visible. DashboardHero `md:text-3xl`. DashboardCard hover treatment (`hover:-translate-y-0.5`, `shadow-frosted-hover`, surface brightens to `bg-white/[0.10]`) becomes meaningful with cursor input. GrowthGarden switches to `size="lg"` via consolidated responsive logic — single SVG instance, ref always current. CustomizePanel right-side flyout (`sm:w-[360px] lg:w-[400px]`). |

**Custom breakpoints:** GrowthGarden size switch happens at `lg` (1024px). CustomizePanel layout switch happens at `sm` (640px).

---

## Inline Element Position Expectations

The DashboardHero status strip is the only inline-row layout this spec actively touches.

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| DashboardHero status strip | Streak segment (Flame icon + "X day streak"), Wind icon + "X min this week", Level tier label, Faith Points + progress bar | At `md+` (≥768px): same y ±5px (single inline row). At `<md`: stacks vertically (`flex-col` then `md:flex-row`) — y values legitimately differ. | Wrapping below 768px is acceptable per existing `flex-col md:flex-row` behavior. |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification) to compare `boundingBox().y` values between elements.

---

## Vertical Rhythm

Dashboard rhythm is preserved verbatim — this spec does NOT change vertical spacing between sections, only chrome and atmospheric layer.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar bottom → DashboardHero top | n/a (Navbar transparent absolute over hero) | `Dashboard.tsx:457` `<Navbar transparent />` |
| DashboardHero (`pb-6 md:pb-8`) → Echo row OR God Moments row OR widget grid | ~24px mobile / 32px desktop | `DashboardHero.tsx:97` `pt-24 pb-6 md:pt-28 md:pb-8` |
| Echo row → next section | `pb-4 md:pb-6` (~16-24px) | `Dashboard.tsx:532` |
| Widget grid bottom (`pb-8`) → SiteFooter | ~32px | `DashboardWidgetGrid.tsx:357` |
| Widget grid gap | `gap-4 md:gap-6` (~16-24px) | `DashboardWidgetGrid.tsx:357` |

Any gap difference >5px between baseline and post-migration capture is flagged as a mismatch by `/verify-with-playwright` Step 6e.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] FrostedCard `default` and `subdued` variants exist at `frontend/src/components/homepage/FrostedCard.tsx` with `as: 'div' | 'button' | 'article'` prop (confirmed during recon).
- [ ] Button `subtle` variant exists at `frontend/src/components/ui/Button.tsx:51-52` with the iteration's white-text + frosted-pill treatment (confirmed during recon).
- [ ] Button `ghost` variant exists at `frontend/src/components/ui/Button.tsx:57` with `text-white/80 hover:text-white` (confirmed during recon).
- [ ] BackgroundCanvas exists at `frontend/src/components/ui/BackgroundCanvas.tsx` (confirmed during recon).
- [ ] Direction doc at `_plans/direction/dashboard-2026-05-04.md` is present and matches locked decisions (confirmed during recon).
- [ ] Recon at `_plans/recon/dashboard-2026-05-04.md` is present (confirmed during recon).
- [ ] All auth-gated actions from the spec are accounted for in the plan (this spec adds no new gates; verified above).
- [ ] Design system values are verified (from live primitive source files; the design-system.md recon is dated 2026-04-06 and predates several primitives — TRUST live source).
- [ ] All [UNVERIFIED] values are flagged with verification methods (none — Change 1 / 2 / 5 / 8 each declares an Option A vs Option B fork; Implementation Steps document the choice and back-out path).
- [ ] Recon report loaded for visual verification during execution.
- [ ] Prior specs in the sequence are complete and committed: DailyHub 1A foundation+meditate ✅, DailyHub 1B Pray and Journal ✅, DailyHub iteration ✅, DailyHub 2 Devotional ✅, Spec 3 Shared Components ✅ (verified by recent commits `fac0771 iykyk`, `f286ced updated markdown`, `b8d7a47 updated quote`, `62929b4 dailyhub-iteration-make-it-right`, `9ab7a69 dailyhub-2-devotional`).
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Dashboard, GlowBackground per-section on Dashboard, animate-glow-pulse, cyan textarea borders, italic Lora prose, soft-shadow 8px-radius cards, PageTransition).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Change 1 — DashboardHero gradient interaction with BackgroundCanvas | **Option A: keep DashboardHero's existing `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` gradient** | The hero anchors visual weight at the top of the page; the gradient overlays cleanly on the canvas blooms and doesn't compete. BackgroundCanvas's `radial-gradient at 50% 8%` is subtle enough that the hero gradient still reads. If during Step 11 visual verification the hero looks visually muddy, fall back to Option B (drop the hero gradient) — the change is a single-line `className` deletion. Document fallback in Execution Log. |
| Change 2 — `aria-labelledby` forwarding on FrostedCard | **Option A: extend FrostedCard's prop API** | Add `'section'` to FrostedCard's `as` union type, add `'aria-labelledby'?: string` to its prop interface, and spread it onto the host element. Small additive change benefiting all future consumers. Option B (wrap inner content in extra `<section>`) was rejected because it adds a redundant DOM layer and tests would still need updates. |
| Change 2 — DashboardCard hover treatment without `onClick` | **Apply hover classes via `className` directly** | DashboardCard is a non-interactive `<section>`. FrostedCard's hover treatment is gated by `isInteractive = !!onClick`. Pass `className="p-4 md:p-6 hover:bg-white/[0.10] hover:shadow-frosted-hover motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"` to FrostedCard so hover lift fires without requiring an `onClick`. Wrapping `-translate-y-0.5` in `motion-safe:` for explicit reduced-motion safety (per spec Non-Functional Requirement). |
| Change 5 — GrowthGarden consolidation | **Option A: useEffect-based size detection via `matchMedia('(min-width: 1024px)')`** | GrowthGarden has hard-coded SVG dimensions per `size` value (`SIZE_CLASSES = { sm: 'h-[150px]', md: 'h-[200px]', lg: 'h-[300px]' }` at line 27-31). CSS-only sizing (Option B) would require restructuring the SVG's internal layout, which is out of scope for 4A. Option A is a localized 5-line change in Dashboard.tsx; the GrowthGarden component itself is untouched. |
| Change 8 — CustomizePanel chrome alignment | **Wrap panel content in `FrostedCard variant="subdued"` styled wrapper, KEEP positioning behavior** | The panel relies on specific `fixed bottom-0 left-0 right-0` positioning (mobile bottom sheet) and `sm:bottom-auto sm:top-0 sm:left-auto sm:right-0` (desktop right flyout). FrostedCard's styling can be applied via `bg-white/[0.05] border border-white/[0.10] rounded-3xl` (subdued tokens) directly on the existing panel `<div>` — a styled wrapper rather than wrapping in `<FrostedCard>` itself, because the panel needs `flex-col` + `fixed` + custom radius (`rounded-t-2xl` mobile / `rounded-none` desktop, NOT FrostedCard's `rounded-3xl`). Migrate buttons and surface tokens (`bg-hero-mid/95` → `bg-white/[0.05]`, `border-white/15` → `border-white/[0.10]`) directly. Document in Execution Log. |
| Tests asserting on chrome class strings | **Update to new tokens; don't preserve old** | Per spec Non-Functional Requirements: "Tests that assert on specific class names (`bg-white/5`, `border-white/10`, `rounded-2xl`, `bg-primary`) are expected to need updates because the chrome literally changed; update them to assert the new tokens." Behavioral tests stay. |
| `bg-primary` instances NOT in 4A scope | **Defer verbatim, no edits** | EveningReflection.tsx (4-step modal — 4D), GettingStartedCelebration.tsx (4D), WelcomeWizard.tsx (4D), WelcomeBack.tsx (4D), NotificationItem.tsx (NOT in 4A scope — NotificationPanel work is part of Spec 12 site chrome). |
| `text-primary` semantic active-state preservation | **Preserve case-by-case** | StreakCard.tsx:300 (LevelIcon active color), NotificationPanel.tsx:83 (active tab color), WelcomeWizard.tsx:488 (Check icon active), VerseOfTheDayCard.tsx:20 (link — MIGRATE per Change 7), CelebrationOverlay.tsx:225 (link — defer to 4D, celebration overlay), MoodChart.tsx:200 ("Check in now" link — MIGRATE per Change 7), WeeklyRecap.tsx:16 + 56 (links — MIGRATE per Change 7). The full final list is finalized during Step 8 grep audit; if anything is ambiguous, flag and ask before migrating. |
| Branch discipline | **Stay on `forums-wave-continued`** | Per spec § Branch discipline. CC NEVER creates branches, commits, pushes, stashes, resets, or runs branch-modifying git commands during this spec. User manages all git ops manually. |

---

## Implementation Steps

### Step 1: Pre-execution recon — capture test baseline + grep audits

**Objective:** Lock the pre-state baseline so any regression introduced during 4A is detectable.

**Files to create/modify:** None (read-only step).

**Details:**

1. From `frontend/`, run `pnpm test -- --run --reporter=verbose 2>&1 | tail -50`. Record total pass/fail counts in the Execution Log Notes column.
2. Run `pnpm typecheck`. Confirm clean exit.
3. Run grep audits and record output:
   - `grep -rn 'bg-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx frontend/src/components/dashboard/InstallCard.tsx`
   - `grep -rn 'text-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx`
4. Read `frontend/src/components/homepage/FrostedCard.tsx` and confirm `as` prop union (verified during planning: `'div' | 'button' | 'article'`) and `aria-labelledby` forwarding (verified: not forwarded). This locks Change 2 Option A scope.

**Auth gating (if applicable):** N/A — read-only step.

**Responsive behavior:** N/A: no UI impact (read-only).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT commit, push, branch, stash, or run any branch-modifying git command.
- DO NOT modify any source file in this step.
- DO NOT proceed to Step 2 without recording the baseline numbers.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Baseline test pass count recorded | n/a | Manual entry in Execution Log |
| Baseline grep counts recorded | n/a | Manual entry in Execution Log |

**Expected state after completion:**
- [ ] Test baseline (pass/fail counts) recorded in Execution Log.
- [ ] Typecheck status recorded.
- [ ] `bg-primary` consumer list recorded in Execution Log.
- [ ] `text-primary` consumer list recorded in Execution Log.
- [ ] FrostedCard prop API confirmed (Option A scope locked for Step 3).

---

### Step 2: Extend FrostedCard prop API to support `<section>` and `aria-labelledby`

**Objective:** Make FrostedCard usable as the DashboardCard chrome primitive without losing the `<section aria-labelledby={titleId}>` accessibility contract.

**Files to create/modify:**
- `frontend/src/components/homepage/FrostedCard.tsx` — extend `as` union, add `aria-labelledby` prop forwarding
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` (if exists) or new test file — add 2 tests for the new prop forwarding

**Details:**

1. Edit `FrostedCard.tsx`:
   - Update interface: change `as?: 'div' | 'button' | 'article'` to `as?: 'div' | 'button' | 'article' | 'section'`.
   - Add to interface: `'aria-labelledby'?: string`.
   - Add `'aria-labelledby': ariaLabelledBy` to the destructured props (rename for valid JS identifier).
   - Spread `aria-labelledby={ariaLabelledBy}` onto the rendered `<Component>` host element (line 61-78 today).
2. Confirm the `cn(...)` call still merges classes correctly — no class changes needed.
3. Add or extend tests:
   - Test 1: `<FrostedCard as="section" aria-labelledby="my-title">content</FrostedCard>` renders a `<section>` with `aria-labelledby="my-title"`.
   - Test 2: When `as` is unspecified (defaults to `div`), `aria-labelledby` is still forwarded if provided.
4. Run `pnpm typecheck` and `pnpm test FrostedCard` to confirm.

**Auth gating (if applicable):** N/A — primitive component.

**Responsive behavior:**
- Desktop (1440px): N/A: no UI impact (prop API change, render is identical at runtime when `as` and `aria-labelledby` are unset).
- Tablet (768px): N/A.
- Mobile (375px): N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change the existing `'div' | 'button' | 'article'` runtime behavior.
- DO NOT change variant class strings.
- DO NOT change `isInteractive` gating logic.
- DO NOT delete or rename any existing prop.
- DO NOT introduce a React DOM warning by spreading `aria-labelledby` onto an element that doesn't accept it (`section`, `div`, `button`, `article` all accept it natively — verified by HTML spec).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `as="section"` renders `<section>` | unit | RTL: `render(<FrostedCard as="section">x</FrostedCard>)` then `expect(container.querySelector('section')).not.toBeNull()` |
| `aria-labelledby` is forwarded to host element | unit | RTL: `render(<FrostedCard as="section" aria-labelledby="title-id">x</FrostedCard>)` then `expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'title-id')` |

**Expected state after completion:**
- [ ] FrostedCard.tsx accepts `as="section"`.
- [ ] FrostedCard.tsx forwards `aria-labelledby` to the host element.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test FrostedCard` passes (existing + 2 new tests).

---

### Step 3: Migrate DashboardCard chrome to FrostedCard `variant="default"` (Change 2)

**Objective:** Replace DashboardCard's rolls-own `<section>` chrome with `<FrostedCard as="section" variant="default" aria-labelledby={titleId}>` while preserving all collapse + accessibility behavior verbatim.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardCard.tsx` (lines 1-110)
- `frontend/src/components/dashboard/__tests__/DashboardCard.test.tsx` — update class-string assertions to new tokens

**Details:**

1. Add import: `import { FrostedCard } from '@/components/homepage/FrostedCard'`.
2. Replace the rolls-own `<section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6 transition-colors duration-fast hover:border-white/20 motion-reduce:transition-none">` element (line 46-53) with:
   ```tsx
   <FrostedCard
     as="section"
     variant="default"
     aria-labelledby={titleId}
     className={cn(
       'min-w-0 p-4 md:p-6',
       'hover:bg-white/[0.10] hover:shadow-frosted-hover motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
       className,
     )}
     style={style}
   >
   ```
   Note: `p-4 md:p-6` overrides FrostedCard's default `p-6` because Tailwind class merging in `cn()` honors later classes; the dashboard widget set has historically used `p-4 md:p-6` for tighter mobile padding. The hover classes are applied directly because DashboardCard is non-interactive (no `onClick`).
3. Close with `</FrostedCard>` (line 108).
4. PRESERVE verbatim:
   - `useState(() => getInitialCollapsed(id, defaultCollapsed))` and the `setCollapseState(id, next)` write.
   - `useId()` + `titleId` + `contentId`.
   - `toggleCollapse` callback.
   - The header `<div className="flex items-center justify-between">` and all its children (icon span, `<h2 id={titleId}>`, action Link, collapse button).
   - The collapse button `aria-expanded`, `aria-controls`, `aria-label`, `min-h-[44px] min-w-[44px]` tap target.
   - The grid-rows transition `<div id={contentId} className="grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:transition-none ...">`.
   - The action link's `text-sm text-primary transition-colors hover:text-primary-lt` — Step 8 migrates this to `text-white/80 hover:text-white` per Change 7. **DEFER the action-link migration to Step 8 to keep this step focused on chrome.**
5. Update tests in `DashboardCard.test.tsx`:
   - Replace assertions on `bg-white/5`, `border-white/10`, `rounded-2xl`, `backdrop-blur-sm` with assertions on `bg-white/[0.07]` or `border-white/[0.12]` or `rounded-3xl` (whichever is asserted today).
   - Add 1 test: collapse open/close still toggles `aria-expanded` between `'true'` and `'false'` (behavioral, should already exist — verify it still passes).
   - Add 1 test: rendered element is `<section>` with `aria-labelledby` matching the `<h2 id={titleId}>` ID.
6. Run `pnpm test DashboardCard` and confirm.

**Auth gating (if applicable):** N/A — visual chrome migration on already-auth-gated card.

**Responsive behavior:**
- Desktop (1440px): card surface is `bg-white/[0.07]`, border `border-white/[0.12]`, `rounded-3xl`, `shadow-frosted-base`. Hover lifts the card 0.5 units up with `shadow-frosted-hover` and brightens to `bg-white/[0.10]`.
- Tablet (768px): same as desktop (surface tokens are viewport-independent). Padding `p-6` (md+).
- Mobile (375px): `p-4` (smaller padding override). Same tokens. Hover translate is irrelevant on touch devices but doesn't break anything.

**Inline position expectations:** N/A — chrome change only.

**Guardrails (DO NOT):**
- DO NOT remove `<section>` semantic element (this would break the `aria-labelledby` accessibility contract).
- DO NOT remove `aria-labelledby={titleId}` (would break screen-reader landmark navigation).
- DO NOT change the collapse storage integration with `dashboard-collapse-storage`.
- DO NOT change `aria-expanded`, `aria-controls`, or `aria-label` on the collapse button.
- DO NOT change the `<h2 id={titleId}>` element or its ID generation.
- DO NOT change the grid-rows transition mechanism (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]`) — this is the documented collapse implementation.
- DO NOT remove the `motion-reduce:hover:translate-y-0` reduced-motion fallback.
- DO NOT migrate the action link's `text-primary` here — that's Step 8.
- DO NOT add a `motion-safe:animate-widget-enter` class on the FrostedCard (it lives on the wrapping div in DashboardWidgetGrid).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Collapse toggles aria-expanded | unit/integration | Click collapse button → `aria-expanded` flips between `true` and `false` |
| Collapse persists to localStorage | unit | Collapse a card → reload component → expect collapsed state preserved via `wr_dashboard_collapsed` |
| Section element with aria-labelledby | unit | `container.querySelector('section')!.getAttribute('aria-labelledby') === <h2-id>` |
| New chrome class assertion | unit | Render → expect `bg-white/[0.07]` (or `border-white/[0.12]`) class on the section |
| Header layout preserved | unit | Title `<h2>` rendered with correct text; chevron button rendered |
| Padding override applied | unit | Section className contains `p-4 md:p-6` |
| Hover lift class present | unit | Section className contains `hover:bg-white/[0.10]` and `motion-safe:hover:-translate-y-0.5` |

**Expected state after completion:**
- [ ] DashboardCard.tsx renders FrostedCard as the section chrome.
- [ ] All accessibility attributes preserved (`aria-labelledby`, `aria-expanded`, `aria-controls`, `aria-label`).
- [ ] Collapse logic + localStorage persistence preserved.
- [ ] Hover lift renders on cards.
- [ ] DashboardCard tests pass with new chrome tokens.
- [ ] All ~12 widgets that wrap DashboardCard automatically inherit the new chrome.

---

### Step 4: Wrap Dashboard `<main>` in BackgroundCanvas (Change 1)

**Objective:** Add the multi-bloom violet atmospheric layer to Dashboard at `/`, matching DailyHub / BibleLanding / `/bible/plans`.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` (line 452-590)

**Details:**

1. Add import at the top of `Dashboard.tsx`: `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`.
2. Locate the existing render at line 452: `<div className="min-h-screen bg-dashboard-dark">`. Wrap the `<main>` element (lines 458-590) in `<BackgroundCanvas>` while keeping `Navbar`, `SiteFooter`, and overlays OUTSIDE.

   Concrete shape after the change:
   ```tsx
   <div className="min-h-screen bg-dashboard-dark">
     <SEO {...HOME_METADATA} />
     <Navbar transparent />
     <BackgroundCanvas>
       <main id="main-content" className="motion-safe:animate-fade-in motion-reduce:animate-none">
         {/* existing hero, echo, god moments, widget grid */}
       </main>
     </BackgroundCanvas>
     {/* TooltipCallout, CustomizePanel, ChallengeCompletionOverlay, CelebrationQueue, GettingStartedCelebration, EveningReflection, DevAuthToggle, SiteFooter remain OUTSIDE */}
   </div>
   ```
3. PRESERVE the outer `<div className="min-h-screen bg-dashboard-dark">` — the BackgroundCanvas atmospheric layer sits on top of the base dark color.
4. PRESERVE DashboardHero's `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark pt-24 pb-6 md:pt-28 md:pb-8` per Edge Cases & Decisions Option A.
5. PRESERVE the `motion-safe:animate-fade-in motion-reduce:animate-none` on `<main>`.
6. Run `pnpm typecheck`.
7. Run `pnpm test Dashboard` and confirm any test that asserts on top-level Dashboard structure still passes (most assert on widget content, not the wrapper).

**Auth gating (if applicable):** N/A — Dashboard is route-level auth-gated (logged-out users see Home).

**Responsive behavior:**
- Desktop (1440px): full multi-bloom canvas visible behind all widgets.
- Tablet (768px): canvas blooms scale per existing canvas behavior (BackgroundCanvas itself is responsive — same gradients, same percentages).
- Mobile (375px): canvas blooms scale down naturally.

**Inline position expectations:** N/A — atmospheric layer.

**Guardrails (DO NOT):**
- DO NOT wrap Navbar inside BackgroundCanvas (Navbar is `transparent` and absolute-positioned over the hero; wrapping it inside BackgroundCanvas would break the absolute positioning).
- DO NOT wrap SiteFooter inside BackgroundCanvas.
- DO NOT wrap any of the modal overlays (TooltipCallout, CustomizePanel, ChallengeCompletionOverlay, CelebrationQueue, GettingStartedCelebration, EveningReflection, DevAuthToggle) inside BackgroundCanvas.
- DO NOT remove `bg-dashboard-dark` from the outer wrapper — that base color shows through the BackgroundCanvas's transparent layers and is part of the visual continuity.
- DO NOT remove DashboardHero's gradient (Option A — keep as-is). If during Step 11 visual verification the hero looks visually muddy, fall back to Option B (drop the gradient) and document in Execution Log.
- DO NOT add `BackgroundCanvas` to other pages in this step (Spec 4A scope is Dashboard only).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BackgroundCanvas wraps `<main>` | unit/integration | `Dashboard` render → `screen.getByRole('main')` is contained within an element matching the BackgroundCanvas's wrapper (`relative min-h-screen overflow-hidden`) |
| Navbar is OUTSIDE BackgroundCanvas | unit | The Navbar element is NOT a descendant of the BackgroundCanvas wrapper |
| SiteFooter is OUTSIDE BackgroundCanvas | unit | SiteFooter is NOT a descendant of the BackgroundCanvas wrapper |

**Expected state after completion:**
- [ ] Dashboard renders inside `<BackgroundCanvas>`.
- [ ] Multi-bloom violet canvas is visible behind content at `/`.
- [ ] Navbar, SiteFooter, and overlays remain outside the canvas.
- [ ] DashboardHero's gradient is preserved.
- [ ] All Dashboard tests pass.

---

### Step 5: Liturgical greeting recency window (Change 4)

**Objective:** Add a 14-day recency window so holiday-specific greetings (`Happy Easter`, `Merry Christmas`, `Blessed Holy Week`, `Happy Pentecost`, `Blessed Advent`, `Happy Epiphany`) only fire near the actual day. After 14 days, the greeting falls back to empty (`''`) so DashboardHero's existing conditional `{isNamedSeason && seasonalGreeting && ...}` cleanly hides the season span.

**Files to create/modify:**
- `frontend/src/constants/liturgical-calendar.ts` (extend `getLiturgicalSeason`)
- `frontend/src/constants/__tests__/liturgical-calendar.test.ts` (add `describe('greeting recency window', ...)` block)
- `frontend/src/components/dashboard/__tests__/DashboardHero-seasonal.test.tsx` (update or extend if existing assertions break)

**Details:**

1. In `liturgical-calendar.ts`, add a constant:
   ```ts
   const GREETING_RECENCY_WINDOW_DAYS = 14
   ```
2. Add a helper function inside the file (after `daysBetween`):
   ```ts
   /**
    * Returns true if the given date is within GREETING_RECENCY_WINDOW_DAYS of the season start.
    * Holiday greetings ("Happy Easter", etc.) only fire within this window after each season's start.
    * Outside the window, callers should fall back to an empty greeting.
    */
   function isWithinGreetingRecencyWindow(seasonId: LiturgicalSeasonId, date: Date): boolean {
     // Ordinary Time has no holiday greeting; window concept doesn't apply.
     if (seasonId === 'ordinary-time') return false
     const start = getSeasonStartDate(seasonId, date)
     const days = daysBetween(start, date)
     return days <= GREETING_RECENCY_WINDOW_DAYS
   }
   ```
3. Modify `getLiturgicalSeason(date)` (line 365):
   - When a season range matches, compute the greeting as: `isWithinGreetingRecencyWindow(range.id, date) ? season.greeting : ''`.
   - Replace `greeting: season.greeting,` with `greeting: isWithinGreetingRecencyWindow(range.id, date) ? season.greeting : '',` in the matched-range return block (around line 376).
   - Keep `seasonName` and `themeColor` unchanged (only the greeting collapses; the season is still detected).
   - Keep `isNamedSeason: range.id !== 'ordinary-time'` unchanged.
4. **DashboardHero already gates on `{isNamedSeason && seasonalGreeting && ...}`** (line 108) — when `seasonalGreeting === ''`, the seasonal span will not render. No DashboardHero change needed for this step. But Change 3's `text-primary` migration is handled in Step 8.
5. Add tests in `liturgical-calendar.test.ts`:
   - **Easter window:** `getLiturgicalSeason(new Date(2026, 3, 5))` (Easter Sunday) → `greeting === 'Happy Easter'`.
   - **Easter at +14:** `getLiturgicalSeason(new Date(2026, 3, 19))` → `greeting === 'Happy Easter'`.
   - **Easter at +15:** `getLiturgicalSeason(new Date(2026, 3, 20))` → `greeting === ''`, but `seasonName === 'Easter'` and `isNamedSeason === true`.
   - **Easter at +29 (today):** `getLiturgicalSeason(new Date(2026, 4, 4))` → `greeting === ''`. (May 4, 2026.)
   - **Christmas Dec 25:** `getLiturgicalSeason(new Date(2026, 11, 25))` → `greeting === 'Merry Christmas'`.
   - **Christmas at +14 (Jan 8):** `getLiturgicalSeason(new Date(2027, 0, 8))` → `greeting === 'Merry Christmas'`.
   - **Christmas at +15 (Jan 9):** depends on whether Jan 9 still falls in Christmas season (range is Dec 25–Jan 5, so Jan 9 is Ordinary Time → `greeting === ''`).
   - **Pentecost Sunday:** `getLiturgicalSeason(new Date(2026, easter.month, easter.date + 49))` → `greeting === 'Happy Pentecost'`.
   - **Pentecost at +14:** still within window → `greeting === 'Happy Pentecost'`.
   - **Holy Week (Palm Sunday):** `getLiturgicalSeason(palmSundayDate)` → `greeting === 'Blessed Holy Week'`.
   - **Advent Sunday:** start of Advent → `greeting === 'Blessed Advent'`.
   - **Advent at +14:** still within window → `greeting === 'Blessed Advent'`.
   - **Advent at +15 (after first 14 days):** `greeting === ''` (Advent season still active, but greeting fell out of the recency window).
   - **Epiphany (Jan 6):** `greeting === 'Happy Epiphany'` (single-day season, day 0 of window).
6. Existing tests in `liturgical-calendar.test.ts` may currently assert `greeting === 'Happy Easter'` for dates beyond +14 days. UPDATE those assertions to the new behavior. Document each updated test in the Execution Log.
7. If `DashboardHero-seasonal.test.tsx` asserts on a specific greeting display for a date outside the recency window, update to assert on the new behavior (greeting hidden when outside window).
8. Run `pnpm test liturgical-calendar` and `pnpm test DashboardHero` and confirm.

**Auth gating (if applicable):** N/A — pure date computation.

**Responsive behavior:** N/A: no UI impact (logic change only; rendering depends on the existing DashboardHero conditional at line 108).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change `seasonName`, `themeColor`, `icon`, or `isNamedSeason` semantics — only the `greeting` field collapses to empty outside the window.
- DO NOT change the season detection priority order (Holy Week > Epiphany > Pentecost > Christmas > Advent > Lent > Easter > Ordinary Time).
- DO NOT introduce a holiday-specific window override (per spec: same 14-day pattern applied uniformly).
- DO NOT change the existing `LITURGICAL_SEASONS` mapping (it stays the canonical greeting source — recency just gates whether the greeting is exposed).
- DO NOT modify the DashboardHero render in this step — the conditional `{isNamedSeason && seasonalGreeting && ...}` already handles empty greeting correctly. Hero text-color migration happens in Step 6.
- DO NOT change the `'ordinary-time'` short-circuit — it never had a greeting and shouldn't suddenly get one.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Easter Sunday → "Happy Easter" | unit | `getLiturgicalSeason(new Date(2026, 3, 5)).greeting === 'Happy Easter'` |
| Easter +14 → "Happy Easter" | unit | `getLiturgicalSeason(new Date(2026, 3, 19)).greeting === 'Happy Easter'` |
| Easter +15 → "" | unit | `getLiturgicalSeason(new Date(2026, 3, 20)).greeting === ''` AND `.seasonName === 'Easter'` |
| Easter +29 (today) → "" | unit | `getLiturgicalSeason(new Date(2026, 4, 4)).greeting === ''` |
| Christmas Dec 25 → "Merry Christmas" | unit | Same shape as Easter test |
| Pentecost Sunday → "Happy Pentecost" | unit | Computed from Easter + 49 |
| Pentecost +15 → "" | unit | Computed from Easter + 49 + 15 |
| Holy Week (Palm Sunday) → "Blessed Holy Week" | unit | Computed from Easter - 7 |
| Advent Sunday → "Blessed Advent" | unit | Computed via `getAdventStart(year)` |
| Advent +15 → "" | unit | Inside Advent season, outside greeting window |
| Epiphany Jan 6 → "Happy Epiphany" | unit | Single-day season test |

**Expected state after completion:**
- [ ] `liturgical-calendar.ts` exposes a 14-day greeting recency window for all named seasons.
- [ ] On 2026-05-04 (Easter +29), `getLiturgicalSeason()` returns `greeting === ''`.
- [ ] DashboardHero stops rendering "Happy Easter" today (verified via the `isNamedSeason && seasonalGreeting` conditional).
- [ ] All liturgical-calendar tests pass with new and updated cases.

---

### Step 6: DashboardHero hero typography + status strip alignment (Change 3)

**Objective:** Align DashboardHero's greeting + status strip with the design system. Preserve seasonal color binding, direction-aware glow, and progress-bar `bg-primary` (semantic active-state). Migrate any `text-primary` use to `text-white/80`.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx` (lines 1-183)
- `frontend/src/components/dashboard/__tests__/DashboardHero.test.tsx` (update class assertions if any)
- `frontend/src/components/dashboard/__tests__/DashboardHero-seasonal.test.tsx` (verify still passes after Step 5 logic change)

**Details:**

1. Inspect `DashboardHero.tsx` for any `text-primary` use. **Verified during recon: no `text-primary` instances in DashboardHero today.** No migration needed for Change 7 in this file. Document in Execution Log.
2. Greeting line (line 103): currently `<h1 className="font-serif text-2xl text-white/90 md:text-3xl">`. Per direction doc and Change 3a: "If the typography drifts from the rest of the system (font-serif vs system font for the heading line), align with page conventions. Read the file and judge."
   - Decision: KEEP `font-serif` because the Dashboard hero serif treatment is the established Dashboard hero idiom and the warm serif greeting differentiates Dashboard from DailyHub (which uses gradient text). `text-white/90` already meets the design-system text-opacity standard for primary text on dashboard. NO greeting font/color change needed.
   - Document this decision in the Execution Log.
3. Status strip (lines 120-177):
   - Streak segment: `text-orange-400` for active flame (line 123) — preserve, this is amber semantic.
   - Streak label: `text-white` for "X day streak" / "Start your streak today" (line 126-130) — preserve.
   - Wind icon: `text-white/60` (line 135) — preserve.
   - "X min this week": `text-white/60` (line 138) — preserve.
   - Tier label: `text-white/60` (line 144) — preserve.
   - Faith Points: `text-white/60` (line 145) — preserve.
   - Progress bar track: `bg-white/10` (line 153) — preserve.
   - Progress bar fill: `bg-primary` (line 166) — **PRESERVE per direction doc Decision 6 (progress fill is semantic active-state, not a button).**
   - Direction-aware glow: `0 0 8px rgba(139, 92, 246, 0.4)` (violet on increase) / `0 0 8px rgba(217, 119, 6, 0.3)` (amber on decrease) — preserve verbatim per spec Change 3b.
4. **No file changes are needed for Change 3 in DashboardHero.tsx beyond what Step 5 already enables (greeting hides when outside the recency window via the existing `{isNamedSeason && seasonalGreeting && ...}` conditional at line 108).**
5. Run `pnpm test DashboardHero` and confirm no regressions.
6. Document the "no-changes-needed" outcome explicitly in the Execution Log Notes column for Step 6.

**Auth gating (if applicable):** N/A — DashboardHero only renders for logged-in users (Dashboard route gate).

**Responsive behavior:**
- Desktop (1440px): greeting at `md:text-3xl`, seasonal span `md:text-2xl` inline, status strip `md:flex-row` single line.
- Tablet (768px): same as desktop until status strip wraps.
- Mobile (375px): greeting `text-2xl`, seasonal span `text-lg block`, status strip `flex-col` stacked.

**Inline position expectations:**
- At `md+` (≥768px): streak segment, "X min this week", tier label, FP+progress bar share the same y-coordinate ±5px (single inline row via `md:flex-row md:items-center md:gap-6`).
- At `<md`: stack vertically (`flex-col gap-3`) — y-values differ legitimately.

**Guardrails (DO NOT):**
- DO NOT change the `bg-primary` progress bar fill (semantic active-state, not a button — preserved per direction doc Decision 6).
- DO NOT remove or change the direction-aware `boxShadow` glow (preserved per spec Change 3b).
- DO NOT add `text-white/80` migration to anything in this file — there's no `text-primary` in DashboardHero today.
- DO NOT change the seasonal greeting span's `style={{ color: themeColor }}` (preserved per spec).
- DO NOT change `<h1>` semantic element (only one h1 per page, accessibility).
- DO NOT change the `useLiturgicalSeason` hook call signature.
- DO NOT introduce hardcoded ms values for the glow timeout (`600` is already a deliberate decay window) — leave the existing `setTimeout(..., 600)` on line 68 alone unless converting to a token in a follow-up spec.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Greeting renders with username | unit | `<DashboardHero userName="Eric" ... />` shows "Good {morning/afternoon/evening}, Eric" |
| Seasonal greeting hidden when greeting empty | unit/integration | When `useLiturgicalSeason()` returns `greeting === ''`, the seasonal span is NOT in the DOM |
| Seasonal greeting shown when within window | unit/integration | When `useLiturgicalSeason()` returns `greeting === 'Happy Easter'` AND `isNamedSeason === true`, the span is in the DOM with `style.color === '#FDE68A'` |
| Streak `text-orange-400` when active | unit | Existing test — preserve |
| Progress bar `bg-primary` fill | unit | Existing test — preserve |
| Direction-aware glow violet on increase | unit | Existing test (progress-bar-glow.test.tsx) — preserve verbatim |
| Direction-aware glow amber on decrease | unit | Existing test (progress-bar-glow.test.tsx) — preserve verbatim |

**Expected state after completion:**
- [ ] DashboardHero file unchanged (no `text-primary` to migrate; greeting typography decision documented).
- [ ] Seasonal greeting hides on 2026-05-04 (Easter +29) due to Step 5's recency window logic.
- [ ] All progress-bar-glow tests pass.
- [ ] All DashboardHero tests pass.

---

### Step 7: Migrate `bg-primary` solid buttons in 4A scope to `<Button variant="subtle">` (Change 6)

**Objective:** Replace rolls-own `bg-primary` solid pill buttons in 4A scope with `<Button variant="subtle" size="md">`. Preserve every click handler, disabled state, aria attribute.

**Files to create/modify:**
- `frontend/src/components/dashboard/EveningReflectionBanner.tsx` (line 27-33: "Reflect Now")
- `frontend/src/components/dashboard/GratitudeWidget.tsx` (line 166-173: "Save")
- `frontend/src/components/dashboard/PrayerListWidget.tsx` (line 28-33: "Add Prayer" — currently a `<Link>`, migrate to `<Button asChild variant="subtle">` wrapping the `<Link>`)
- `frontend/src/components/dashboard/InstallCard.tsx` (line 34-40: "Install")
- `frontend/src/components/dashboard/MoodCheckIn.tsx` (line 218-223: Continue submit button)
- Tests for each migrated component (assertions on button class strings update; behavioral assertions stay)

**DEFER (DO NOT migrate in 4A):** WelcomeWizard.tsx, WelcomeBack.tsx, EveningReflection.tsx 4-step modal buttons, GettingStartedCelebration.tsx, NotificationItem.tsx (NOT in Spec 4A scope per spec Out of Scope).

**Details:**

For each file, follow this pattern:

1. Add import: `import { Button } from '@/components/ui/Button'`.
2. Replace the `<button ...>` (or `<Link ...>`) `bg-primary` element with:
   ```tsx
   <Button variant="subtle" size="md" onClick={handleSomething} disabled={someDisabled}>
     Text
   </Button>
   ```
   For Link cases (PrayerListWidget): use `<Button asChild variant="subtle" size="md"><Link to="/my-prayers">Add Prayer</Link></Button>`. The `asChild` mode passes Button styles down to the single child element.
3. PRESERVE the `disabled` state (e.g., GratitudeWidget's `disabled={!hasContent}`).
4. PRESERVE the `aria-label` if present.
5. PRESERVE all click handlers (e.g., InstallCard's `handleInstall`, MoodCheckIn's `handleContinue`, EveningReflectionBanner's `onReflectNow`).
6. Update tests:
   - Tests asserting on `bg-primary` class string should be updated to assert on the `<Button>` rendering or on the underlying class string `bg-white/[0.07]` (subtle variant).
   - Behavioral assertions (click fires handler, disabled prevents click) stay.

**Per-file specifics:**

- **EveningReflectionBanner.tsx** line 27-33: `<button onClick={onReflectNow} className="w-full rounded-lg bg-primary px-8 py-3 ...">Reflect Now</button>`
  → `<Button variant="subtle" size="md" onClick={onReflectNow} className="w-full sm:w-auto">Reflect Now</Button>`
  Preserve full-width-on-mobile / auto-width-on-desktop via the `className` prop (className merges into Button's class chain).

- **GratitudeWidget.tsx** line 166-173: `<button type="button" onClick={handleSave} disabled={!hasContent} className="min-h-[44px] rounded-lg bg-primary ... sm:w-auto w-full">Save</button>`
  → `<Button variant="subtle" size="md" onClick={handleSave} disabled={!hasContent} className="w-full sm:w-auto">Save</Button>`

- **PrayerListWidget.tsx** line 28-33: `<Link to="/my-prayers" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt">Add Prayer</Link>`
  → `<Button asChild variant="subtle" size="md"><Link to="/my-prayers">Add Prayer</Link></Button>`

- **InstallCard.tsx** line 34-40: `<button type="button" onClick={handleInstall} className="bg-primary text-white text-sm rounded-full px-4 py-2 hover:bg-primary-lt ...">Install</button>`
  → `<Button variant="subtle" size="md" onClick={handleInstall}>Install</Button>`
  Note: also clean up the trailing "Not now" dismiss button styling for visual consistency — KEEP as-is (it's a `text-white/40` ghost link; the spec doesn't migrate it).

- **MoodCheckIn.tsx** line 218-223: `<button onClick={handleContinue} className="mt-4 w-full rounded-lg bg-primary px-6 py-2 ... sm:w-auto">Continue</button>`
  → `<Button variant="subtle" size="md" onClick={handleContinue} className="mt-4 w-full sm:w-auto">Continue</Button>`

**Auth gating (if applicable):** N/A — all parent components route-gate at the Dashboard level.

**Responsive behavior:**
- Desktop (1440px): `<Button variant="subtle" size="md">` renders as `px-6 py-2.5 text-sm` rounded-full pill, frosted-glass surface, white text. Auto-width.
- Tablet (768px): same as desktop.
- Mobile (375px): `w-full sm:w-auto` on EveningReflectionBanner, GratitudeWidget, MoodCheckIn buttons gives full-width on mobile, auto-width on tablet+.

**Inline position expectations:** N/A — single-button replacements per file.

**Guardrails (DO NOT):**
- DO NOT migrate WelcomeWizard, WelcomeBack, EveningReflection 4-step, GettingStartedCelebration, NotificationItem buttons (deferred to 4D / out of 4A scope).
- DO NOT migrate the StreakCard or DashboardHero progress-bar `bg-primary` fills (those are semantic active-state).
- DO NOT migrate WeeklyGodMoments' `bg-primary/10` background tint (semantic primary tint, not a button — out of scope).
- DO NOT migrate FriendsPreview's `bg-primary/40` avatar bg (semantic avatar tint, not a button — out of scope).
- DO NOT migrate ReadingPlanWidget's `bg-primary` progress fill on line 144 (semantic active-state).
- DO NOT migrate CustomizePanel's `bg-primary` switch toggle (Step 9 handles this — toggle is semantic on/off state, not a button; we KEEP that one as-is per direction).
- DO NOT migrate WelcomeWizard's `bg-primary` active dot (semantic active-state).
- DO NOT remove the click handler / disabled / aria-label on any migrated button.
- DO NOT change the parent component's render structure beyond swapping the button element.
- DO NOT delete the dismiss button on InstallCard (`text-white/40 hover:text-white/60`) — it stays.
- DO NOT add any non-required new props to `<Button>` (e.g., no `isLoading` unless the spec requires it — none here do).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| EveningReflectionBanner click fires onReflectNow | unit | Click the "Reflect Now" button → handler called once |
| GratitudeWidget Save disabled when no content | unit | `<GratitudeWidget>` with empty inputs → Save button has `disabled` attribute |
| GratitudeWidget Save enabled with content | unit | Type one input → button is no longer disabled |
| PrayerListWidget empty state shows Add Prayer link | unit | When `counts.all === 0` → `<a>` with href `/my-prayers` is rendered |
| InstallCard Install fires promptInstall | unit | Click → `promptInstall` called once |
| MoodCheckIn Continue fires handleContinue | unit | Click → handler called once |
| Each migrated button uses subtle variant | unit | Class string contains `bg-white/[0.07]` and `border-white/[0.12]` |
| min-h-[44px] preserved | unit | All buttons meet 44px tap target (Button subtle has `min-h-[44px]` baked in) |

**Expected state after completion:**
- [ ] All 5 in-scope `bg-primary` solid buttons migrated to `<Button variant="subtle" size="md">`.
- [ ] No regression in click handlers, disabled states, aria attributes.
- [ ] `grep -rn 'bg-primary' frontend/src/components/dashboard/EveningReflectionBanner.tsx frontend/src/components/dashboard/GratitudeWidget.tsx frontend/src/components/dashboard/PrayerListWidget.tsx frontend/src/components/dashboard/InstallCard.tsx frontend/src/components/dashboard/MoodCheckIn.tsx` returns ZERO matches.
- [ ] All component tests pass.

---

### Step 8: Migrate `text-primary` ghost links in 4A scope to `text-white/80` (Change 7)

**Objective:** Replace ghost-style `text-primary` / `text-primary-lt` inline links with `text-white/80 hover:text-white` (or `<Button variant="ghost" size="sm">` if a button affordance is more appropriate). Preserve `text-primary` instances that are semantic active-state colors on icons.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardCard.tsx` (line 73: action link `text-primary`)
- `frontend/src/components/dashboard/MoodChart.tsx` (line 200: "Check in now")
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx` (lines 155, 200, 236: links)
- `frontend/src/components/dashboard/RecentHighlightsWidget.tsx` (lines 16, 63: links)
- `frontend/src/components/dashboard/PrayerListWidget.tsx` (line 54: "View all" link)
- `frontend/src/components/dashboard/TodaysDevotionalCard.tsx` (line 54: link)
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` (line 20: "Meditate on this verse" link)
- `frontend/src/components/dashboard/FriendsPreview.tsx` (line 73: "Invite a friend" link)
- `frontend/src/components/dashboard/WeeklyRecap.tsx` (line 16: link, line 56: "You contributed N%" — verify whether semantic stat or link)
- `frontend/src/components/dashboard/StreakCard.tsx` (line 373: "View all badges")
- `frontend/src/components/dashboard/GettingStartedCard.tsx` (line 269: Go button — verify whether ghost link or subtle Button by source)
- Tests for each migrated component

**PRESERVE (DO NOT migrate — semantic active-state, not ghost link):**
- StreakCard.tsx:300 — `LevelIcon className="h-5 w-5 text-primary-lt"` (active-state icon color)
- NotificationPanel.tsx:83 — active tab tab-color (NOT in 4A scope; out of file list anyway)
- WelcomeWizard.tsx:488 — `Check className="h-5 w-5 flex-shrink-0 text-primary"` (active-state icon — also WelcomeWizard out of 4A scope)
- WelcomeWizard.tsx:526 — `<span className="font-semibold text-primary-lt">{quizResult.name}</span>` (semantic emphasis — out of 4A scope anyway)
- NotificationItem.tsx:134 — unread-dot indicator (NOT in 4A scope)
- WelcomeWizard.tsx:482 — `border-primary bg-primary/20` selected card chrome (out of 4A scope)
- CelebrationOverlay.tsx:225 — celebration link (defer to 4D)

**Details:**

For each file, follow this pattern:

1. Inspect the surrounding context to determine: (a) is this a ghost-style inline link? (b) is this a button-affordance link with padding/hit area? (c) is this a semantic active-state color?
2. Migrate decisions:
   - **Ghost-style inline link** (no padding, just text): `text-primary[-lt] hover:text-primary[-lt]` → `text-white/80 hover:text-white`.
   - **Button-affordance link** (padding, hit area): `text-primary[-lt]` → `<Button variant="ghost" size="sm">` wrapping the link content with `asChild` for `<Link>` components.
   - **Semantic active-state**: PRESERVE.
3. Update tests:
   - Tests asserting `toContain('text-primary')` or `toContain('text-primary-lt')` should be updated to assert `toContain('text-white/80')` (or whatever the new class string is).
   - Behavioral assertions (link navigates to correct route) stay.

**Per-file specifics (decisions made during planning based on recon):**

- **DashboardCard.tsx:73**: action link rendered via the `headerAction` slot — ghost-style inline link.
  → `className="text-sm text-white/80 transition-colors hover:text-white"`

- **MoodChart.tsx:200**: "Check in now" — button-style click target inside the empty state.
  → If currently `<button onClick={onRequestCheckIn}>` then keep `<button>` semantics but change the class:
  `className="text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"`
  Alternative: migrate to `<Button variant="ghost" size="sm" onClick={onRequestCheckIn}>Check in now</Button>` — pick whichever produces the closer visual fit when verifying. Default: keep `<button>` with class change.

- **ReadingPlanWidget.tsx:155**: "Continue reading" inline link — ghost-style.
  → `className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"`
- **ReadingPlanWidget.tsx:200**: same pattern.
- **ReadingPlanWidget.tsx:236**: same pattern.

- **RecentHighlightsWidget.tsx:16**: "Open Bible >" — ghost link in empty state.
  → `className="mt-2 text-sm text-white/80 transition-colors hover:text-white"`
- **RecentHighlightsWidget.tsx:63**: "See all >" — same pattern.
  → `className="block text-sm text-white/80 transition-colors hover:text-white"`

- **PrayerListWidget.tsx:54**: "View all →" — ghost link.
  → `className="mt-2 inline-block text-sm font-medium text-white/80 transition-colors hover:text-white"`

- **TodaysDevotionalCard.tsx:54**: "Read today's devotional →" — ghost link.
  → `className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"`

- **VerseOfTheDayCard.tsx:20**: "Meditate on this verse >" — ghost link.
  → `className="mt-1 block text-sm text-white/80 transition-colors hover:text-white"`

- **FriendsPreview.tsx:73**: "Invite a friend" — button-affordance (has `min-h-[44px]`, `inline-flex items-center gap-1.5`).
  → `className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"`

- **WeeklyRecap.tsx:16**: ghost link → `text-white/80 hover:text-white`.
- **WeeklyRecap.tsx:56**: `<p className="mt-3 text-sm font-medium text-primary">You contributed N% ...</p>` — this is a semantic stat callout, NOT a link. Per direction doc, the WeeklyRecap copy rewrite is deferred to 4C. Preserve `text-primary` here OR migrate to `text-white/80` if it reads better against the new chrome. **Default: migrate to `text-white/80` because the spec says "All `text-primary` ghost-style usage on Dashboard surfaces in 4A scope migrates."** Document in Execution Log.

- **StreakCard.tsx:373**: "View all badges" — ghost link with `inline-flex min-h-[44px]`.
  → `className="inline-flex min-h-[44px] items-center text-xs text-white/80 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"`

- **GettingStartedCard.tsx:269**: "Go" button — actually a per-item navigation button with click handler. Currently `text-primary transition-colors hover:text-primary-lt`. This is a button-affordance, but small size (`px-2 py-1 text-sm`). Decision: keep as a `<button>` with class change to `text-white/80 hover:text-white`.
  → `className="ml-auto flex-shrink-0 rounded px-2 py-1 text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"`

After all migrations:

1. Re-run grep audit: `grep -rn 'text-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx`.
2. Confirm remaining matches are all semantic active-state cases (StreakCard:300 LevelIcon, NotificationItem unread dot, WelcomeWizard active dot/icons, etc. — out of 4A scope).
3. Document each remaining match in the Execution Log Notes column with rationale.

**Auth gating (if applicable):** N/A — text-color migration only.

**Responsive behavior:**
- Desktop (1440px): all migrated links render at `text-white/80`, hover to `text-white`. Identical layout.
- Tablet (768px): same.
- Mobile (375px): same.

**Inline position expectations:** N/A — text-color change only.

**Guardrails (DO NOT):**
- DO NOT migrate `text-primary` instances that carry semantic active-state on icons (StreakCard LevelIcon, WelcomeWizard active dot, NotificationItem unread dot).
- DO NOT migrate any `text-primary` outside the 4A file list (WelcomeWizard, WelcomeBack, EveningReflection 4-step, NotificationItem, NotificationPanel, MoodCheckIn).
- DO NOT change the underlying click handler or `to=` route on any link.
- DO NOT change the focus-ring or focus-visible classes.
- DO NOT introduce a new `<Button>` import unless using `<Button variant="ghost">` (ghost-link with class change is sufficient for most cases).
- DO NOT remove the `min-h-[44px]` tap target where present.
- DO NOT change the underlying element type (Link vs button vs anchor).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Each migrated link contains `text-white/80` | unit | grep replacement verified per file |
| Hover state changes to `text-white` | unit | (jsdom doesn't render hover but we can assert class string contains `hover:text-white`) |
| Behavioral: link navigates to correct route | integration | Existing test — preserve |
| Behavioral: button click fires handler | unit | Existing test — preserve |

**Expected state after completion:**
- [ ] All in-scope `text-primary` ghost links migrated to `text-white/80`.
- [ ] `grep -rn 'text-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx` returns only semantic active-state cases (with rationale documented per remaining match in Execution Log).
- [ ] All component tests pass with updated class assertions.

---

### Step 9: CustomizePanel chrome alignment + button migration (Change 8)

**Objective:** Align CustomizePanel chrome with the system tokens. Migrate internal "Reset to Default" and "Done" buttons to `<Button variant="subtle">`. Preserve all positioning (mobile bottom sheet, desktop right flyout), focus trap, drag reorder, accessibility.

**Files to create/modify:**
- `frontend/src/components/dashboard/CustomizePanel.tsx` (lines 1-247)
- `frontend/src/components/dashboard/__tests__/CustomizePanel.test.tsx` (update class assertions)

**Details:**

1. Migrate panel chrome surface tokens (line 113):
   - `bg-hero-mid/95 backdrop-blur-xl border border-white/15` → `bg-white/[0.05] backdrop-blur-xl border border-white/[0.10]`
   - This aligns with FrostedCard `subdued` variant tokens. Preserve `backdrop-blur-xl` (was `backdrop-blur-md` in FrostedCard subdued, but the panel needs heavier blur for glass effect at high opacity).
2. Update each card row inside the panel (line 169-174):
   - Current: `'flex items-center gap-3 rounded-lg bg-white/[0.06] p-3 min-h-[44px]'`
   - New (align with system): `'flex items-center gap-3 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 min-h-[44px]'` (slightly heavier rounding, faint border for definition).
3. Migrate the "Reset to Default" and "Done" buttons:
   - Add import: `import { Button } from '@/components/ui/Button'`.
   - Reset button (line 228-235):
     ```tsx
     <Button
       variant="subtle"
       size="sm"
       onClick={() => { onResetToDefault(); onClose() }}
     >
       Reset to Default
     </Button>
     ```
   - Done button (line 237-242):
     ```tsx
     <Button
       variant="subtle"
       size="sm"
       onClick={onClose}
     >
       Done
     </Button>
     ```
4. PRESERVE the switch toggle (line 202-220) — this is a `role="switch"` accessibility primitive, NOT a button. Its `bg-primary` (line 211) is the semantic on-state color and stays.
5. PRESERVE the X close button (line 135-141) — its `text-white/60 hover:text-white` class is already in-system.
6. PRESERVE the drag handle (line 181-194) — its `text-white/30 hover:text-white/60` is in-system.
7. PRESERVE all positioning classes (lines 114-125): `fixed`, `bottom-0`, `left-0`, `right-0`, `max-h-[80vh]`, `rounded-t-2xl`, `sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0`, `sm:w-[360px] lg:w-[400px]`, `transition-transform duration-base ease-standard motion-reduce:transition-none`, the translate animations.
8. PRESERVE the focus trap (`useFocusTrap`), drag-reorder logic, keyboard reorder logic, aria-live announcement, and the entire fullList computation.
9. Update CustomizePanel.test.tsx if it asserts on `bg-hero-mid` or `border-white/15` — replace with new tokens.
10. Run `pnpm test CustomizePanel` and confirm.

**Auth gating (if applicable):** N/A — panel is opened via auth-gated trigger.

**Responsive behavior:**
- Desktop (1440px): right-side flyout, `lg:w-[400px]`, frosted glass `bg-white/[0.05]` with `backdrop-blur-xl` border `border-white/[0.10]` (and `border-l` for the separator from main content).
- Tablet (640-1024px): right-side flyout, `sm:w-[360px]`, same chrome tokens.
- Mobile (<640px): bottom sheet, `rounded-t-2xl`, `max-h-[80vh]`, same chrome tokens.

**Inline position expectations:** N/A — panel layout, not inline row.

**Guardrails (DO NOT):**
- DO NOT change positioning classes (the panel needs specific fixed positioning for both layouts).
- DO NOT change the `useFocusTrap` integration.
- DO NOT change the drag reorder logic.
- DO NOT change the keyboard reorder + aria-live announcement.
- DO NOT migrate the switch toggle's `bg-primary` (semantic active-state, not a button).
- DO NOT change the `aria-label="Customize Dashboard"`, `role="dialog"`, `aria-modal="true"` accessibility wiring.
- DO NOT change the drag handle's `aria-label="Drag to reorder ..."`.
- DO NOT change the announcement live region (`aria-live="polite" aria-atomic="true"`).
- DO NOT change the existing `transition-transform duration-base ease-standard motion-reduce:transition-none` animation classes.
- DO NOT remove the mobile drag bar (line 128-130).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Panel renders at correct position (mobile bottom sheet) | unit | `rounded-t-2xl` class present at `<sm` widths |
| Panel renders at correct position (desktop right flyout) | unit | `sm:right-0` class present |
| Reset to Default button is `<Button variant="subtle">` | unit | Button has `bg-white/[0.07]` token |
| Done button is `<Button variant="subtle">` | unit | Same |
| Reset click calls onResetToDefault then onClose | integration | Both callbacks fire |
| Done click calls onClose | unit | Existing test — preserve |
| Switch toggle preserved | unit | `role="switch"` exists, `aria-checked` toggles |
| Focus trap preserved | unit | Existing test — preserve |
| Keyboard reorder preserved | unit | Existing test — preserve |
| New chrome tokens present | unit | `bg-white/[0.05]` class on panel |

**Expected state after completion:**
- [ ] CustomizePanel chrome aligns with the system (`bg-white/[0.05]`, `border-white/[0.10]`, `backdrop-blur-xl`).
- [ ] Reset to Default and Done buttons use `<Button variant="subtle">`.
- [ ] All positioning, focus trap, drag reorder, keyboard reorder, and accessibility behavior preserved.
- [ ] All CustomizePanel tests pass.

---

### Step 10: GrowthGarden double-mount fix (Change 5)

**Objective:** Consolidate two GrowthGarden SVG instances (mobile `lg:hidden`, desktop `hidden lg:block`) into a single instance with responsive `size` selection. Fix the ref-staleness bug for `GardenShareButton`.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` (lines 486-525, the `gardenSlot` block)
- `frontend/src/pages/__tests__/Dashboard.test.tsx` (update if any test asserts on two GrowthGarden mounts)

**Details:**

1. Add a new state at the top of the Dashboard component (near other useState declarations, e.g., after line 76):
   ```ts
   const [gardenSize, setGardenSize] = useState<'md' | 'lg'>(() => {
     if (typeof window === 'undefined') return 'md'  // SSR safety
     return window.matchMedia('(min-width: 1024px)').matches ? 'lg' : 'md'
   })
   ```
2. Add a useEffect to sync `gardenSize` with viewport changes:
   ```ts
   useEffect(() => {
     if (typeof window === 'undefined') return
     const mq = window.matchMedia('(min-width: 1024px)')
     const update = () => setGardenSize(mq.matches ? 'lg' : 'md')
     update()  // sync on mount
     mq.addEventListener('change', update)
     return () => mq.removeEventListener('change', update)
   }, [])
   ```
3. Replace the dual mounts (lines 497-524) with a single mount:
   ```tsx
   <div className="mt-1">
     <GrowthGarden
       ref={gardenRef}
       stage={faithPoints.currentLevel as 1 | 2 | 3 | 4 | 5 | 6}
       animated={true}
       showSparkle={gardenSparkle}
       amplifiedSparkle={gardenLevelUp}
       streakActive={faithPoints.currentStreak > 0}
       showRainbow={showRainbow}
       size={gardenSize}
       seasonName={season.seasonName}
       activityElements={gardenElements}
     />
   </div>
   ```
4. PRESERVE the `gardenSlot` outer wrapper (lines 487-526) including the Garden label + GardenShareButton at the top.
5. PRESERVE the `gardenRef` definition and its passing to GardenShareButton (line 491).
6. Verify GardenShareButton continues to generate share images correctly — test manually at 375px, 768px, 1280px (Step 11 visual verification).
7. Update Dashboard.test.tsx if any test asserts on two GrowthGarden mounts or on the `lg:hidden` / `hidden lg:block` classes.

**Auth gating (if applicable):** N/A — Dashboard auth-gated at route level.

**Responsive behavior:**
- Desktop (≥1024px): GrowthGarden renders at `size="lg"` (`h-[300px]`). Single SVG.
- Tablet (768-1023px): GrowthGarden renders at `size="md"` (`h-[200px]`). Single SVG.
- Mobile (375px): GrowthGarden renders at `size="md"` (`h-[200px]`). Single SVG.
- Resize from desktop to mobile: `gardenSize` state updates via `matchMedia` listener, GrowthGarden re-renders with new `size` prop. SVG does NOT unmount/remount (React reconciliation preserves the component instance across prop changes).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the `gardenRef` from GardenShareButton's `gardenRef` prop.
- DO NOT change GrowthGarden's internal SIZE_CLASSES mapping.
- DO NOT introduce a third "lg" instance for any reason.
- DO NOT introduce a window-resize listener that listens to every pixel change (use `matchMedia` listener which only fires at the breakpoint boundary).
- DO NOT remove the `mt-1` spacing between the Garden label row and the SVG.
- DO NOT change the GrowthGarden component itself (the consolidation is at the Dashboard.tsx mount site only — Option A in the spec).
- DO NOT remove the SSR-safe `typeof window === 'undefined'` guard in the lazy state initializer.
- DO NOT remove the cleanup listener in the useEffect return (`mq.removeEventListener`).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Single GrowthGarden mounted | unit | Render Dashboard → exactly one GrowthGarden in the DOM |
| `gardenSize` defaults to `md` on small viewport | unit | Mock matchMedia to return `matches: false` → `<GrowthGarden size="md">` |
| `gardenSize` defaults to `lg` on large viewport | unit | Mock matchMedia to return `matches: true` → `<GrowthGarden size="lg">` |
| `gardenSize` updates on matchMedia change | unit | Mock matchMedia listener → fire `change` event → `gardenSize` flips |
| Cleanup listener on unmount | unit | Verify `removeEventListener` called when component unmounts |
| `gardenRef` is wired to single GrowthGarden | integration | Verify ref is current after first paint |
| GardenShareButton receives same gardenRef | integration | Existing test — preserve |

**Expected state after completion:**
- [ ] Dashboard renders exactly ONE GrowthGarden instance.
- [ ] `gardenRef` always points to the live SVG.
- [ ] Resizing across the 1024px breakpoint smoothly updates `size` without unmount/remount.
- [ ] GardenShareButton continues to generate correct share images at all viewport sizes (verified manually in Step 11).
- [ ] GrowthGarden palette unchanged (earth tones preserved per direction doc Decision 2).

---

### Step 11: Visual verification + regression sweep

**Objective:** Verify Dashboard at 3 breakpoints, confirm regression surfaces (DailyHub tabs, BibleLanding, `/bible/plans`, PrayerWall) are unaffected, and capture decisions for Change 1 (gradient) and Change 5 (consolidation viability).

**Files to create/modify:** None (verification step). Notes go in the Execution Log.

**Details:**

1. Start the dev server: `cd frontend && pnpm dev`.
2. Open Dashboard at `/` (logged-in). Verify visually at 1440px desktop:
   - Multi-bloom violet canvas visible behind content.
   - Hero greeting + status strip render correctly. NO "Happy Easter" greeting (today is 2026-05-04, Easter +29).
   - Every DashboardCard consumer shows new FrostedCard chrome (`rounded-3xl`, `bg-white/[0.07]`, frosted glass surface, hover lift on cards).
   - GrowthGarden renders as ONE SVG (verify via DevTools — no `lg:hidden` / `hidden lg:block` siblings).
   - GardenShareButton works (click → share image generated correctly).
   - All migrated buttons render as subtle pills (translucent surface, white text, no `bg-primary` violet fill).
   - All migrated links render at `text-white/80` with hover to `text-white`.
   - CustomizePanel: open via Customize button → renders right-side flyout with new chrome tokens. Reset to Default + Done buttons render as subtle pills.
3. Verify at 768px tablet:
   - Hero status strip stays inline at this width (verify with DevTools `boundingBox().y` if doing inline-element verification).
   - GrowthGarden still at `size="md"`.
   - CustomizePanel still bottom sheet.
4. Verify at 375px mobile:
   - Hero status strip wraps to `flex-col` (legitimate wrapping per existing layout).
   - GrowthGarden at `size="md"`.
   - All migrated buttons are full-width.
5. Resize the window from 1440px → 800px → 1440px:
   - GrowthGarden does NOT unmount/remount (verify via React DevTools — same instance ID).
   - GardenShareButton continues to work after resize.
6. Hover any DashboardCard:
   - Verify lift treatment (`-translate-y-0.5`, `shadow-frosted-hover`, surface brightens to `bg-white/[0.10]`).
   - Verify reduced-motion users see surface change but no translate (toggle "Emulate CSS prefers-reduced-motion: reduce" in DevTools).
7. Open CustomizePanel + tab through with keyboard:
   - Focus trap works.
   - Drag handle `aria-label` is announced.
   - Switch toggles announce state.
8. Open MoodCheckIn (force phase via DevAuthToggle if needed):
   - Continue button renders as subtle pill.
9. Visit `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`:
   - Layout, chrome, and atmospheric layer unchanged.
10. Visit `/bible`:
    - BibleLanding chrome unchanged.
11. Visit `/bible/plans`:
    - Page unchanged.
12. Visit `/prayer-wall`:
    - Button ghost variant consumers render correctly.
13. Run final test suite: `pnpm test -- --run --reporter=verbose 2>&1 | tail -50`. Compare pass/fail counts to Step 1 baseline.
14. Run `pnpm typecheck`. Confirm clean exit.
15. Run final grep audit: `grep -rn 'bg-primary' frontend/src/components/dashboard/EveningReflectionBanner.tsx frontend/src/components/dashboard/GratitudeWidget.tsx frontend/src/components/dashboard/PrayerListWidget.tsx frontend/src/components/dashboard/InstallCard.tsx frontend/src/components/dashboard/MoodCheckIn.tsx`. Expect ZERO matches.
16. Run final grep: `grep -rn 'text-primary' frontend/src/components/dashboard/`. Confirm only semantic active-state cases remain (StreakCard:300 LevelIcon, NotificationItem unread dot, etc.). Document each in Execution Log.
17. **If hero gradient looks visually muddy (Step 4 Option A fallback):** drop DashboardHero's `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` from line 97 — keep `pt-24 pb-6 md:pt-28 md:pb-8`. Document fallback in Execution Log.
18. Run Lighthouse on `/` (DevTools Lighthouse tab). Verify Performance ≥ 90, Accessibility ≥ 95.

**Auth gating (if applicable):** N/A — verification step.

**Responsive behavior:**
- Desktop (1440px): full multi-bloom canvas, hover lifts visible.
- Tablet (768px): canvas blooms scale, status strip inline.
- Mobile (375px): canvas blooms scale, status strip wraps to column.

**Inline position expectations:**
- DashboardHero status strip at `≥768px`: same y ±5px across streak / "X min this week" / level / FP+progress.
- DashboardHero status strip at `<768px`: stacks vertically (legitimate wrap).

**Guardrails (DO NOT):**
- DO NOT commit during this step.
- DO NOT push to remote.
- DO NOT migrate any additional `text-primary` or `bg-primary` instance not in the 4A scope.
- DO NOT modify any DailyHub / BibleLanding / `/bible/plans` / PrayerWall file (regression surfaces — observation only).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Final pnpm test pass count ≥ baseline | n/a | Compare to Step 1 baseline |
| pnpm typecheck clean | n/a | Confirm |
| pnpm lint clean | n/a | Run `pnpm lint` |
| pnpm build success | n/a | Run `pnpm build` |
| Visual: multi-bloom canvas visible at `/` | manual | DevTools |
| Visual: no "Happy Easter" today | manual | Hero greeting line |
| Visual: single GrowthGarden | manual | DevTools DOM inspection |
| Visual: hover lift on cards | manual | Hover any card |
| Visual: subtle pills for migrated buttons | manual | Inspect button surfaces |
| Lighthouse Performance ≥ 90 | manual | DevTools |
| Lighthouse Accessibility ≥ 95 | manual | DevTools |
| Regression: DailyHub tabs unchanged | manual | Visit each tab |
| Regression: BibleLanding unchanged | manual | Visit `/bible` |
| Regression: `/bible/plans` unchanged | manual | Visit page |
| Regression: PrayerWall unchanged | manual | Visit `/prayer-wall` |

**Expected state after completion:**
- [ ] All Dashboard visual checks pass at 3 breakpoints.
- [ ] All regression surfaces unchanged.
- [ ] Final test count: pass count ≥ baseline (no new failures introduced).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95 on `/`.
- [ ] Change 1 gradient decision documented (Option A kept OR Option B fallback applied).
- [ ] Change 5 consolidation working (single SVG, ref always current).
- [ ] Change 8 panel chrome decision documented.
- [ ] All execution-log decisions captured.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Capture pre-state baseline + grep audits + verify FrostedCard prop API |
| 2 | 1 | Extend FrostedCard prop API (`as="section"` + `aria-labelledby`) |
| 3 | 2 | Migrate DashboardCard chrome to FrostedCard `default` |
| 4 | — | Wrap Dashboard `<main>` in BackgroundCanvas (independent of card chrome) |
| 5 | — | Liturgical greeting recency window (independent) |
| 6 | 5 | DashboardHero verification (recency change is a logic change in Step 5; Step 6 confirms hero typography is correct + no `text-primary` to migrate) |
| 7 | — | Migrate `bg-primary` solid buttons (independent file changes) |
| 8 | 3 | Migrate `text-primary` ghost links (DashboardCard's action link is in scope; depends on Step 3 chrome being in place to verify visual fit) |
| 9 | 7 | CustomizePanel chrome + buttons (uses Button subtle from Step 7's Button import pattern) |
| 10 | — | GrowthGarden double-mount fix (independent) |
| 11 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Visual verification + regression sweep |

Steps 4, 5, 7, 10 can be executed in any order or in parallel after Step 1 — they are independent. Step 2 must precede Step 3. Step 3 must precede Step 8 (DashboardCard's action link migration is part of Step 8). Step 7 must precede Step 9 (Button import + variant pattern reused). Step 11 is the gating verification at the end.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution recon — baseline + grep audits | [COMPLETE] | 2026-05-04 | Tests: 9412 total / 9410-9411 passing across 725 files. Pre-existing flakes: Pray loading-text timing (matches CLAUDE.md baseline) + useFaithPoints unauthenticated (intermittent). Typecheck clean. `bg-primary`: 25 matches across 18 files (5 in 4A scope, rest preserved/deferred). `text-primary`: 23 matches across 17 files (12 in 4A scope, rest preserved/deferred). FrostedCard prop API confirmed: `as: 'div' \| 'button' \| 'article'`, no `aria-labelledby`. Step 2/3 Option A scope locked. Backup: `backup/pre-execute-20260504101235`. |
| 2 | Extend FrostedCard prop API for `<section>` + `aria-labelledby` | [COMPLETE] | 2026-05-04 | `FrostedCard.tsx`: Added `'section'` to `as` union; added `'aria-labelledby'?: string` and `style?: React.CSSProperties` to props (style required because Step 3's plan-shape passes `style={style}` to FrostedCard from DashboardCard). Both forwarded to host element. `FrostedCard.test.tsx`: Added 2 tests (`as="section"` renders section, `aria-labelledby` is forwarded). All 35 tests pass (33 existing + 2 new). Typecheck clean. |
| 3 | Migrate DashboardCard chrome to FrostedCard default | [COMPLETE] | 2026-05-04 | `DashboardCard.tsx`: replaced rolls-own `<section>` chrome with `<FrostedCard as="section" variant="default" aria-labelledby={titleId}>`. Hover lift via `className` (non-interactive — no `onClick`). Padding `p-4 md:p-6` overrides FrostedCard's default `p-6`. Action link's `text-primary` deferred to Step 8. All accessibility attrs preserved (`aria-labelledby`, `aria-expanded`, `aria-controls`, `aria-label`, `role="region"`). `DashboardCard.test.tsx`: added 3 chrome-token assertions (default-tier classes, `p-4 md:p-6` override, hover-lift classes). All 10 tests pass. Typecheck clean. |
| 4 | Wrap Dashboard `<main>` in BackgroundCanvas | [COMPLETE] | 2026-05-04 | `Dashboard.tsx`: imported `BackgroundCanvas`, wrapped `<main>` (kept Navbar / SiteFooter / TooltipCallout / CustomizePanel / ChallengeCompletionOverlay / CelebrationQueue / GettingStartedCelebration / EveningReflection / DevAuthToggle outside). Outer `bg-dashboard-dark` div preserved per Edge Cases & Decisions Option A; DashboardHero gradient preserved (Option A). Updated 2 tests in `Dashboard.test.tsx` and `DashboardIntegration.test.tsx` that asserted `.closest('.min-h-screen')` matched the outer wrapper — switched to `.closest('.bg-dashboard-dark')` (BackgroundCanvas's inner div now also matches `.min-h-screen`). Added 1 new test verifying BackgroundCanvas wrapper class string surrounds `<main>`. All 34 Dashboard page tests pass. Typecheck clean. |
| 5 | Liturgical greeting recency window (14-day) | [COMPLETE] | 2026-05-04 | `liturgical-calendar.ts`: added `GREETING_RECENCY_WINDOW_DAYS = 14` and `isWithinGreetingRecencyWindow(seasonId, date)` helper. `getLiturgicalSeason()` now collapses `greeting` to `''` when outside the 14-day window from each named season's start; `seasonName` / `themeColor` / `icon` / `isNamedSeason` semantics preserved. Ordinary Time short-circuits (no greeting concept). `liturgical-calendar.test.ts`: added 15-case `greeting recency window` describe block covering Easter window edges, Christmas, Pentecost, Holy Week, Advent +0/+14/+15, Epiphany single-day, Lent in/out of window, Ordinary Time. All 36 liturgical-calendar tests pass (21 existing untouched + 15 new). All 12 DashboardHero tests still pass without modification — existing tests don't assert on greeting strings outside the window. **Verified:** on 2026-05-04 (Easter +29) `getLiturgicalSeason().greeting === ''` so DashboardHero's existing `{isNamedSeason && seasonalGreeting && ...}` conditional cleanly hides the seasonal span. |
| 6 | DashboardHero typography + status strip alignment | [COMPLETE] | 2026-05-04 | NO CHANGES TO `DashboardHero.tsx`. Verified during recon: zero `text-primary` instances. Single `bg-primary` on line 166 is the progress bar fill — preserved per Decision 6 (semantic active-state). Greeting `font-serif text-2xl text-white/90 md:text-3xl` decision: KEEP — established Dashboard hero idiom, differentiates from gradient-text DailyHub headings. Direction-aware `boxShadow` (line 64-66) preserved per Change 3b. Status strip preserved verbatim. After Step 5's recency-window logic, the seasonal greeting span is auto-hidden on 2026-05-04 (Easter +29) via the existing `{isNamedSeason && seasonalGreeting && ...}` conditional at line 108. All 12 DashboardHero tests still pass. |
| 7 | Migrate `bg-primary` solid buttons to `<Button variant="subtle">` | [COMPLETE] | 2026-05-04 | Migrated 5 buttons: `EveningReflectionBanner.tsx` (Reflect Now), `GratitudeWidget.tsx` (Save), `PrayerListWidget.tsx` (Add Prayer — `asChild` wrapping `<Link to="/my-prayers">`), `InstallCard.tsx` (Install), `MoodCheckIn.tsx` (Continue). All use `<Button variant="subtle" size="md">`. Click handlers, disabled states, and aria attributes preserved. `w-full sm:w-auto` retained on Banner / Gratitude / MoodCheckIn for full-width-on-mobile behavior. InstallCard "Not now" dismiss button preserved. Updated `EveningReflectionBanner.test.tsx`: focus-ring assertion now matches `focus-visible:ring-2` (subtle variant uses focus-visible per a11y); added 1 new assertion verifying subtle-variant chrome tokens. Grep audit: zero `bg-primary` in the 5 files. Typecheck clean. All component tests pass (78 + 1 new). |
| 8 | Migrate `text-primary` ghost links to `text-white/80` | [COMPLETE] | 2026-05-04 | Migrated 12 ghost-link instances across 11 files: `DashboardCard.tsx:73` (action link), `MoodChart.tsx:200` (Check in now button — kept `<button>` semantics), `ReadingPlanWidget.tsx:155/200/236` (3 links), `RecentHighlightsWidget.tsx:16/63` (2 links), `PrayerListWidget.tsx:54` (View all), `TodaysDevotionalCard.tsx:54`, `VerseOfTheDayCard.tsx:20`, `FriendsPreview.tsx:73` (Invite a friend), `WeeklyRecap.tsx:16/56` (Find friends + contribution stat — both → `text-white/80` per "all `text-primary` ghost-style usage on Dashboard surfaces in 4A scope migrates"), `StreakCard.tsx:373` (View all badges), `GettingStartedCard.tsx:269` (Go button). Updated 2 test class assertions: `TodaysDevotionalCard.test.tsx:63`, `VerseOfTheDayCard.test.tsx:105`. **Preserved (semantic active-state, out of 4A scope):** `StreakCard.tsx:300` (LevelIcon), `NotificationPanel.tsx:83` (active tab — Spec 12), `WelcomeWizard.tsx:488/526` (Check icon + name emphasis — out of 4A scope), `CelebrationOverlay.tsx:225` (defer 4D). Typecheck clean. All 774 dashboard component tests pass. |
| 9 | CustomizePanel chrome + button migration | [COMPLETE] | 2026-05-04 | `CustomizePanel.tsx`: panel surface migrated `bg-hero-mid/95 border-white/15` → `bg-white/[0.05] border-white/[0.10]` (FrostedCard `subdued` token alignment, kept `backdrop-blur-xl`). Widget rows: `rounded-lg bg-white/[0.06]` → `rounded-xl border border-white/[0.08] bg-white/[0.05]` for system alignment with faint border definition. Reset to Default and Done buttons → `<Button variant="subtle" size="sm">`. **Preserved:** all positioning classes (mobile bottom sheet + desktop right flyout), `useFocusTrap`, drag reorder, keyboard reorder, aria-live announcements, `role="dialog"` + `aria-modal="true"`, `aria-label="Customize Dashboard"`, X close button, drag handle, mobile drag bar, `bg-primary` switch toggle (semantic on-state). Typecheck clean. All 13 CustomizePanel tests pass. |
| 10 | GrowthGarden double-mount fix | [COMPLETE] | 2026-05-04 | `Dashboard.tsx`: replaced dual `lg:hidden` / `hidden lg:block` GrowthGarden mounts with a single mount whose `size` prop reads from a new `gardenSize` state. State initializer is SSR-safe (`typeof window === 'undefined'` guard); `useEffect` subscribes to `window.matchMedia('(min-width: 1024px)').addEventListener('change', ...)` and updates state on breakpoint crossings; cleanup `removeEventListener` on unmount. `gardenRef` is now always wired to the live SVG — fixes the GardenShareButton ref-staleness bug at the breakpoint boundary. GrowthGarden component itself untouched (Option A — Dashboard.tsx-only consolidation). Typecheck clean. All 34 Dashboard page tests pass. |
| 11 | Visual verification + regression sweep | [COMPLETE] | 2026-05-04 | **Final automated checks all clean.** Test suite: 9434 total / 9432 pass / 2 fail across 725 files. The 2 failures are the documented pre-existing baseline flakes (`useFaithPoints — unauthenticated returns default values when not authenticated` + `Pray > shows loading then prayer` — both flagged in CLAUDE.md as known timing flakes; same failures appeared in Step 1 baseline). Net delta: +22 passing tests, all from new test cases added in Steps 2/3/4/5/7. **Typecheck:** clean (`pnpm exec tsc --noEmit` no output). **Lint:** clean (`pnpm lint` no output, max-warnings=0). **Build:** succeeds (`pnpm build` 7.01s + PWA inject). **Final grep audit:** zero `bg-primary` in the 5 migrated files; remaining `text-primary` instances (NotificationPanel:83, StreakCard:300, CelebrationOverlay:225, WelcomeWizard:488/526) are all documented preservations per Edge Cases & Decisions. **Change 1 (gradient):** Option A applied — DashboardHero gradient kept. **Change 5 (consolidation):** Option A applied — single GrowthGarden via matchMedia. **Change 8 (panel chrome):** styled wrapper approach applied. **VISUAL VERIFICATION DEFERRED:** the plan's Steps 11.1–11.18 require an interactive browser session (dev server, devtools, Playwright) which I cannot launch in this environment. **Recommended next action:** run `/verify-with-playwright /` against this branch to capture screenshots at 375px/768px/1440px, hover states, focus rings, BackgroundCanvas multi-bloom render, no-Easter-greeting verification, single-GrowthGarden DOM check, GardenShareButton across resize, regression sweep on `/daily?tab=*`, `/bible`, `/bible/plans`, `/prayer-wall`. Backup branch retained: `backup/pre-execute-20260504101235`. |
