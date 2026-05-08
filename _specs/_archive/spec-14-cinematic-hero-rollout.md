# Spec 14 — Cinematic Hero Rollout (All Landing Pages)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` (Phase 5 — Prayer Wall Visual Migration is partially folded into this spec; the remainder stays in Phase 5)

**Branch:** `forums-wave-continued` (stay on current branch — do NOT create a new branch)
**Status:** Brief — ready for `/plan`
**Model posture:** Opus 4.7 xHigh for `/plan`, `/execute-plan`, `/code-review`. Sonnet 4.6 High acceptable for `/verify-with-playwright`.
**Estimated execution time:** 4–6 hours end-to-end.

**Recon prior art (READ BEFORE PLANNING):**

- `_plans/recon/cinematic-rollout-recon-2026-05-07.md` — full per-page anatomy
- `_plans/recon/cinematic-hero-diagnostic-2026-05-07.md` — `/daily` seam diagnostic that established the mask-image-fade architecture
- `_plans/recon/homepage-hero-anatomy-2026-05-07.md` — homepage video-hero anatomy (informational context)

---

## Affected Frontend Routes

- `/bible`
- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`
- `/ask`
- `/grow`
- `/prayer-wall`
- `/music` _(conditional on Step 0 outcome — see Pre-execution Gate)_
- `/daily` _(test backfill only — page is already on the cinematic pattern)_
- `/music/routines` _(regression check only — must remain on `PageHero`, untouched)_

---

## Overview

The `CinematicHeroBackground` component (`frontend/src/components/CinematicHeroBackground.tsx`) was prototyped on `/daily` during the 2026-05-07 session. It composes a 9-layer atmospheric (solid base, nebula tint, far/mid/bright star fields with halos, cross-glints, warm directional light beam, film grain, plus a `mask-image` fade-to-transparent), extends `calc(100% + 200px)` past its parent's bottom edge, and uses a navbar-compensated `pt-[145px] pb-12` so the cinematic shows through under the absolute-positioned 97px transparent navbar. The architecture eliminates the hero-body seam by letting the page-level `BackgroundCanvas` paint continuously through the masked-out bottom of the cinematic.

This spec rolls that pattern out to every remaining landing page in the app, folds the deferred Phase 5 `PrayerWallHero` typography cleanup into `/prayer-wall` migration, backfills test coverage on `/daily`, adds a shared component test for `CinematicHeroBackground`, and documents the canonical pattern in `09-design-system.md`. Sanctuary aesthetics are part of this app's emotional-healing mission — consistent cinematic atmospheric across every entry surface gives users the same immersive sense of arrival regardless of which surface they land on.

## User Story

As a **logged-out visitor or logged-in user**, I want to **arrive on any landing page (Bible, Local Support, Ask, Grow, Prayer Wall, Music) and see the same cinematic atmospheric I already see on /daily** so that **the app feels like a continuous sanctuary instead of a collection of inconsistent pages**, with no jarring hero-body seam at the moment of entry.

## Requirements

### Functional Requirements

1. **`/bible`, `/local-support/*` (3 routes via shared hero), `/ask`, `/grow`, `/prayer-wall`** all mount `CinematicHeroBackground` as the first child of their hero `<section>`, with content children stacking via `relative z-10`.
2. **`/music`** mounts `CinematicHeroBackground` via a new `MusicHero` component **only if** the Step 0 audio cluster investigation classifies the audio cluster as decoupled (Outcome A) or loosely coupled (Outcome B). Outcome C (tightly coupled) skips `/music` migration; the discovered coupling becomes the canonical Decision 24 documentation.
3. **Hero `<section>` padding** uses `pt-[145px] pb-12` on every cinematic-mounting page (97px navbar + 48px visible top padding; navbar-compensated; works at all breakpoints because navbar height is constant).
4. **`<Navbar transparent />`** must be the navbar variant on every cinematic-mounting page.
5. **`BackgroundCanvas`** wraps the entire page contents at the page root on every cinematic-mounting page. For `/grow`, `/prayer-wall`, and `/music` (if migrated), this requires hoisting the existing `BackgroundCanvas` up out of the body region OR introducing it for the first time.
6. **`/grow` and `/prayer-wall`** are migrated in TWO discrete steps each: `BackgroundCanvas` promotion first (no cinematic), verify, then cinematic mount. Steps are not combined.
7. **`/prayer-wall` Phase 5 hero cleanup** lands as a discrete step BEFORE the cinematic mount: remove `style={ATMOSPHERIC_HERO_BG}`, replace `<span className="font-script">Wall</span>` with canonical single-line gradient treatment, replace `font-serif italic text-white/60` subtitle with canonical white non-italic style, navbar-compensate the padding.
8. **`/daily` test backfill** fixes the stale `pb-6 sm:pb-8` assertion (production is `pb-12 pt-[145px]`) and adds two new assertions: cinematic-presence and navbar-compensation invariant.
9. **Shared component test** at `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` covers smoke render, `aria-hidden="true"`, `pointer-events-none`, the `calc(100% + 200px)` height extension, the `mask-image` linear gradient (and `WebkitMaskImage`), 8-layer child count, and a documented contract test for `prefers-reduced-motion` (jsdom doesn't evaluate `@media`, so the assertion validates that animated layers exist; full reduced-motion verification is in `/verify-with-playwright`).
10. **Component change is additive only:** add `data-testid="cinematic-hero-background"` to `CinematicHeroBackground.tsx`'s outer wrapper for reliable test selectors. The component stays zero-prop. No prop API additions in this spec.
11. **Documentation** lands in `.claude/rules/09-design-system.md` (new "Cinematic Hero Pattern" subsection + Decision 24 update reflecting Step 0 outcome + intentional-drift list refresh), `_forums_master_plan/spec-tracker.md` (new Spec 14 entry), and `_forums_master_plan/round3-master-plan.md` Phase 5 section (mark PrayerWallHero items as shipped).
12. **Final verification pass** confirms zero stale `ATMOSPHERIC_HERO_BG`, `font-script`, `font-serif italic`, or `bg-dashboard-dark` references on touched pages, plus full `pnpm test` / `pnpm tsc --noEmit` / `pnpm lint` / `pnpm build` cleanliness vs. baseline.

### Non-Functional Requirements

- **Performance:** No regression vs. baseline. The cinematic component is `React.memo`-wrapped with deterministic `useMemo`-cached SVG positions (no `Math.random()` at render time, no hydration drift). `~660` SVG circles + 1 turbulence filter + 4 CSS-animated elements is the established budget.
- **Accessibility:** WCAG 2.2 AA must hold. Hero headings remain semantically `<h1>` and stack ABOVE the cinematic via `relative z-10` (cinematic carries `aria-hidden="true"` so it never enters the screen-reader tree). `prefers-reduced-motion: reduce` must disable cinematic animations via the global `animations.css` `*` rule plus the component-specific `animation: none !important` rules in `index.css`. Static atmospheric (stars, warm beam gradient, nebula tint) remains visible — only motion is removed.
- **Mobile:** SVG starfields use `viewBox="0 0 1920 1080"` with `preserveAspectRatio="xMidYMid slice"`. On 375px mobile viewports, the visible center ~1300 source-pixels of the 1920 starfield render. Density per square pixel is comparable to desktop. No mobile-specific adjustments.
- **Test baseline preservation:** Pre-existing `Pray.test.tsx — shows loading then prayer after generating` failure (post-Spec-13 baseline) must remain the ONLY failing test. Any new fail file or count increase is a regression.

## Pre-execution Gate (Step 0) — Decision 24 Audio Cluster Verification

This is the FIRST step `/plan` and `/execute-plan` must perform. The brief BLOCKS `/music` implementation until this gate completes and the outcome is locked.

**Required investigation (read-only):**

1. Read `frontend/src/contexts/AudioContext.tsx` (or whatever path `AudioProvider` lives at — find via `grep` if not at that exact path).
2. Read `frontend/src/pages/MusicPage.tsx` end-to-end.
3. Read `frontend/src/audio/audioReducer.ts` (or similar — find via `grep`).
4. Identify:
   - Where `AudioProvider` mounts in the React tree (`App.tsx`-level / `Layout`-level / `MusicPage`-level).
   - Whether the audio reducer reads any chrome-related state (theme, atmospheric layer, navbar mode).
   - Whether anything inside `MusicPage` depends on the page's wrapper being `<div className="bg-dashboard-dark">` specifically.

**Outcome classification:**

- **Outcome A — Decoupled (most likely):** Provider above the page, reducer reads no chrome state, children depend only on provider availability. → Proceed with `/music` as planned.
- **Outcome B — Loosely coupled:** Audio code references chrome state in a non-load-bearing way. → Proceed with `/music` AND document the discovered coupling in the Decision 24 update.
- **Outcome C — Tightly coupled:** Reducer reads chrome state functionally, OR provider lifecycle depends on the page wrapper, OR audio children break if the wrapper changes. → SKIP `/music` in this spec. Update Decision 24 in `09-design-system.md` as the canonical hard rule. File a follow-up stub in `spec-tracker.md` for "Music cinematic — pending audio cluster decoupling refactor."

The plan must include this gate as Step 0 explicitly. The plan must NOT enumerate `/music` implementation steps until Step 0 completes and the outcome is locked.

## Execution Order (locked)

```
Step 0   — Decision 24 audio cluster investigation (read-only, gates /music scope)
Step 1   — /bible cinematic mount
Step 2   — /local-support cinematic mount (one component, three routes)
Step 3   — /ask cinematic mount + structural relative/z-10 fixes
Step 4   — /grow BackgroundCanvas promotion
Step 5   — /grow cinematic mount
Step 6   — /prayer-wall BackgroundCanvas promotion
Step 7   — /prayer-wall Phase 5 hero cleanup (font-script + italic subtitle + ATMOSPHERIC_HERO_BG removal + navbar-compensated padding)
Step 8   — /prayer-wall cinematic mount
Step 9   — /music MusicHero component creation + BackgroundCanvas promotion + cinematic mount (only if Step 0 outcome A or B; otherwise replaced with documentation-only step)
Step 10  — /daily test backfill (fix stale pb-6 sm:pb-8 assertion, add cinematic-presence, add navbar-compensation invariant)
Step 11  — CinematicHeroBackground.test.tsx new file + data-testid addition to outer wrapper
Step 12  — 09-design-system.md Cinematic Hero Pattern section + Decision 24 update + intentional-drift list refresh
Step 13  — spec-tracker.md entry + master plan Phase 5 update
Step 14  — Final verification pass (no stale references, full test/tsc/lint/build clean vs. baseline)
```

Risk-managed sequencing: lowest-risk drop-ins first, structural promotions in the middle, audio-adjacent migration last, tests/docs last. Any partial execution leaves clean intermediate state.

## Per-Page Implementation Specifications

### Step 1 — `/bible` cinematic mount

**File:** `frontend/src/components/bible/landing/BibleHero.tsx`

Mount `<CinematicHeroBackground />` as the first child of the hero `<section>`. Add `relative z-10` to the `<h1>`. Replace existing `pt-28 pb-12 sm:pt-32 sm:pb-14 lg:pt-32` with `pt-[145px] pb-12` (responsive padding modifiers removed — navbar height is constant). Final hero className:

```tsx
className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
```

### Step 2 — `/local-support/*` cinematic mount

**File:** `frontend/src/components/local-support/LocalSupportHero.tsx` (single shared component consumed by Churches, Counselors, CelebrateRecovery)

Mount `<CinematicHeroBackground />` as first child. Add `relative z-10` to all four content children: `<h1>`, `<p>`, `extraContent` wrapper, `action` wrapper. Replace `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` with `pt-[145px] pb-12`.

### Step 3 — `/ask` cinematic mount + structural fixes

**File:** `frontend/src/pages/AskPage.tsx`

The existing hero `<section>` is missing `relative` (required to anchor the absolute-positioned cinematic). Add it. Replace `pt-32 pb-10 sm:px-6 sm:pt-40 sm:pb-12` with `pt-[145px] pb-12`. Mount `<CinematicHeroBackground />` as first child. Add `relative z-10` to `<h1>` (preserving `animate-gradient-shift`) and `<p>`. Verify `<Layout transparentNav>` wrapper is in place (recon confirmed it at L254).

**Visual concern flagged in recon:** `/ask`'s textarea has a violet glow (`shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]`). The cinematic's warm light beam blends in the upper-left. After mount, verify whether the warm beam + violet glow read as evocative or muddy. If muddy, document in `_plans/discoveries.md` as a follow-up consideration. Ship as-is — this spec does NOT add a prop to suppress the warm beam.

### Step 4 — `/grow` BackgroundCanvas promotion (NO cinematic yet)

**File:** `frontend/src/pages/GrowPage.tsx`

Currently `BackgroundCanvas` wraps only the body, not the hero, and the hero uses `ATMOSPHERIC_HERO_BG` (a static gradient). The split prevents the cinematic mask-fade-to-transparent architecture from working. Hoist `<BackgroundCanvas>` to wrap the entire page contents (mirroring `/daily` and `/bible`'s pattern). Remove `style={ATMOSPHERIC_HERO_BG}` from the hero section. Remove `bg-dashboard-dark` from the outer wrapper. Remove the inner `<BackgroundCanvas>` wrapper (now hoisted to root). Adjust hero padding to `pt-[145px] pb-12`.

### Step 5 — `/grow` cinematic mount

After Step 4 verifies clean. Add `relative` to hero className if not present, mount `<CinematicHeroBackground />` as first child, add `relative z-10` to `<h1>` and `<p>`. Sticky tab bar `z-40` should not z-fight with cinematic — verify by scrolling.

### Step 6 — `/prayer-wall` BackgroundCanvas promotion (NO cinematic, NO cleanup yet)

**File:** `frontend/src/pages/PrayerWall.tsx`

Hoist `<BackgroundCanvas>` to wrap the entire page (mirroring `/daily` / `/bible`). Remove `bg-dashboard-dark` from the outer wrapper. Preserve `overflow-x-hidden` on the new `BackgroundCanvas` className. Sticky `CategoryFilterBar` `z-30` must continue to pin.

### Step 7 — `/prayer-wall` Phase 5 hero cleanup (NO cinematic yet)

**File:** `frontend/src/components/prayer-wall/PrayerWallHero.tsx`

Cleanup-only step:

1. Remove `style={ATMOSPHERIC_HERO_BG}` from the section (Step 6's `BackgroundCanvas` provides the atmospheric).
2. Remove the `<span className="font-script">Wall</span>` treatment. Replace the heading with canonical single-line gradient treatment matching `/local-support`, `/grow`, `/ask`:
   ```tsx
   <h1 id="prayer-wall-heading" className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2" style={GRADIENT_TEXT_STYLE}>
     Prayer Wall
   </h1>
   ```
3. Remove `font-serif italic text-white/60` from the subtitle. Replace with canonical white non-italic treatment.
4. Update padding to `pt-[145px] pb-12`. Remove responsive padding modifiers.
5. Add `relative z-10` to action wrapper.

### Step 8 — `/prayer-wall` cinematic mount

After Steps 6 + 7. Mount `<CinematicHeroBackground />` as first child. All content children already have `relative z-10` from Step 7.

### Step 9 — `/music` (CONDITIONAL on Step 0 outcome)

**Outcome A or B path:**

- **9a.** Create new component `frontend/src/components/music/MusicHero.tsx` with optional `title`/`subtitle` props (defaults: `'Music'` / `"Worship, rest, and find peace in God's presence."`), mounting `<CinematicHeroBackground />` and using the canonical hero structure (`relative z-10` on `<h1>` / `<p>`, `pt-[145px] pb-12` padding, `GRADIENT_TEXT_STYLE` heading).
- **9b.** Modify `frontend/src/pages/MusicPage.tsx`: import `MusicHero`, replace `<PageHero title="..." subtitle="..." />` with `<MusicHero />` (no props — defaults match), hoist `<BackgroundCanvas>` to wrap the page contents, remove `bg-dashboard-dark` from outer wrapper, remove the now-unused `PageHero` import.
- **9c.** Audio cluster verification (Playwright): worship playlist play/pause, ambient sounds layer + crossfade, Sleep & Rest scripture readings + bedtime stories play, AudioDrawer FAB renders + opens, tab switching preserves audio state, route navigation away/back preserves `AudioContext` state.
- **Failure protocol:** if any audio function breaks, `git restore frontend/src/pages/MusicPage.tsx`, delete the new `MusicHero.tsx`, and proceed to Outcome C handling (skip `/music`).

**Outcome C path:**

- Skip Step 9 implementation entirely.
- Document the discovered coupling in `09-design-system.md` Decision 24 (Step 12).
- File follow-up stub in `spec-tracker.md` for "Music cinematic — pending audio cluster decoupling refactor."
- Proceed to Step 10.

### Step 10 — `/daily` test backfill

**File:** `frontend/src/pages/__tests__/DailyHub.test.tsx`

1. Locate the stale assertion (recon Section G.6 says lines 144–148, expecting `pb-6 sm:pb-8`; production is `pb-12 pt-[145px]`).
2. Update to:
   ```ts
   expect(heroSection.className).toContain('pt-[145px]')
   expect(heroSection.className).toContain('pb-12')
   ```
3. Add a new test asserting `CinematicHeroBackground` is present (selector targets `[data-testid="cinematic-hero-background"]` after Step 11 adds it).
4. Add a new test asserting `pt-[145px]` is present on the hero region (locks the navbar-compensation invariant).

Net: total test count increases by 2.

### Step 11 — Shared component test + `data-testid` addition

**Files:**
- Modify `frontend/src/components/CinematicHeroBackground.tsx` — add `data-testid="cinematic-hero-background"` to the outer wrapper. **This is the only modification to the component in this spec; the component stays zero-prop.**
- Create `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` with 7 tests:
  1. Renders without crashing.
  2. Outer wrapper has `aria-hidden="true"`.
  3. Outer wrapper has `pointer-events-none`.
  4. Outer wrapper height is `calc(100% + 200px)`.
  5. Outer wrapper applies `mask-image` linear gradient (and `WebkitMaskImage`).
  6. 8 atmospheric layers as direct children (4 svg + 4 div = solid base, nebula tint, far stars svg, mid stars svg, bright stars svg, cross-glints svg, warm beam, film grain svg).
  7. Animated CSS class hooks exist (`.cinematic-light-beam`, `.cinematic-star-twinkle`, `.cinematic-glint-pulse`) — documents the reduced-motion contract; full motion-reduction verification handed to `/verify-with-playwright`.

### Step 12 — Documentation (`09-design-system.md`)

**File:** `.claude/rules/09-design-system.md`

1. New subsection "Cinematic Hero Pattern (Spec 14 — Cinematic Hero Rollout)" placed under Round 3 Visual Patterns, immediately after the BackgroundCanvas Atmospheric Layer section. Content covers: component path, purpose (9-layer atmospheric breakdown), architecture (200px overflow + mask-image fade), composition rules (`<Navbar transparent />` + `BackgroundCanvas` at root + `relative` hero + `pt-[145px] pb-12` padding + `relative z-10` on all content children), pages using vs. pages NOT using (intentional drift), reduced-motion behavior, mobile behavior (viewBox + slice rationale), performance (`React.memo` + seeded LCG + `~660` circles), zero-prop API stability.
2. Decision 24 update reflecting Step 0's outcome:
   - **Outcome A:** "Decision 24 was reconciled in Spec 14 — investigation found AudioProvider mounts at [App.tsx-level OR Layout-level] and audioReducer reads no chrome-related state. /music's chrome migration to BackgroundCanvas + cinematic atmospheric was safe. Future Music chrome work should still verify against this baseline."
   - **Outcome B:** Same as A but explicitly include the discovered loose coupling for future reference.
   - **Outcome C:** "Decision 24 was investigated in Spec 14 and confirmed as a hard rule — [specific coupling discovered]. /music remains on canonical PageHero + ATMOSPHERIC_HERO_BG until a future spec decouples the audio cluster from chrome."
3. Refresh the documented-intentional-drift list (Settings, Insights, Music) to reflect `/music`'s post-Spec-14 status.

### Step 13 — Tracker + master plan updates

**File 1:** `_forums_master_plan/spec-tracker.md` — new Spec 14 entry with `✅` status. Match the existing tracker column structure (read first to confirm format). Suggested row content: `Cinematic Hero Rollout` | `✅` | `Visual rollout — cinematic atmospheric on /bible, /local-support/*, /ask, /grow, /prayer-wall, /music (conditional). Includes /daily test backfill, CinematicHeroBackground component test, 09-design-system.md Cinematic Hero Pattern section, Phase 5 PrayerWallHero work folded in.`

**File 2:** `_forums_master_plan/round3-master-plan.md` Phase 5 section — mark these items as "Shipped in Spec 14 — Cinematic Hero Rollout":
- PrayerWallHero migration
- `font-script` "Wall" cleanup
- `font-serif italic` subtitle cleanup
- BackgroundCanvas promotion on `/prayer-wall`

Phase 5's remaining scope after Spec 14: `PrayerCard` `FrostedCard` migration, `PageShell` internals, `QotdComposer` visual migration, animation token cleanup, deprecated pattern purge.

### Step 14 — Final verification pass

1. Read every touched file. Confirm no stale references remain:
   - `ATMOSPHERIC_HERO_BG` usage in `/grow`, `/prayer-wall`, `/music` — should be gone.
   - `font-script` in `PrayerWallHero` — should be gone.
   - `font-serif italic` in `PrayerWallHero` — should be gone.
   - `bg-dashboard-dark` on outer wrappers of `/grow`, `/prayer-wall`, `/music` — should be gone.
   - `CinematicHeroBackground` imports present in `BibleHero.tsx`, `LocalSupportHero.tsx`, `AskPage.tsx`, `GrowPage.tsx`, `PrayerWallHero.tsx`, `MusicHero.tsx` (if shipped), and `DailyHub.tsx` (existing).
2. `pnpm test` — `Pray.test.tsx` remains the ONLY failing test; `DailyHub.test.tsx` passes with new assertions; `CinematicHeroBackground.test.tsx` all 7 tests pass.
3. `pnpm tsc --noEmit` — clean.
4. `pnpm lint` — clean (no new warnings beyond baseline).
5. `pnpm build` — succeeds.
6. Document any deviations in `_plans/discoveries.md`.

---

## Auth Gating

This spec is **purely visual** — no new interactive elements, no new data writes, no new gated actions. Auth gating on every touched page is unchanged. The cinematic component is `aria-hidden="true"` and `pointer-events-none`, so it cannot intercept any click or keyboard event. Existing auth gates on each page continue to function exactly as before:

| Page | Existing auth behavior (UNCHANGED by this spec) |
|------|------------------------------------------------|
| `/bible`, `/bible/my` | Fully public (per `02-security.md` Bible Wave Auth Posture). Logged-out users see all device-local data. |
| `/local-support/*` | Public search/results/details/directions/share (Decision 12). Bookmark + visit-recording remain login-gated; auth modal copy unchanged. |
| `/ask` | Public (AI Bible chat — logged-out users can use the feature; existing rate limit behavior preserved). |
| `/grow` | Public (Reading Plans + Challenges browsing). Per-plan/per-challenge writes preserve existing auth gates. |
| `/prayer-wall` | Reading + sharing public; posting/commenting/bookmarking remain login-gated (Forums Wave Phase 3 — already shipped). All auth-modal copy unchanged. |
| `/music` (if migrated) | Public (worship playlists, ambient sounds, sleep & rest content). All audio playback works without login; preferences continue to use existing storage keys. |
| `/daily` | Tabs public, mood/journal/prayer save flows continue to gate per existing behavior. |

**Verification requirement:** `/code-review` must confirm zero new auth-modal invocations introduced and no existing auth gate accidentally bypassed (e.g., a hero rewrite must not strip an existing `useAuthModal` call from any page).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero `pt-[145px] pb-12` constant. Cinematic SVG starfields render the visible center of the 1920 source-pixel viewBox via `preserveAspectRatio="xMidYMid slice"` — density per square pixel comparable to desktop. Heading `text-3xl`–`text-4xl` (per-page existing scale preserved). All cinematic layers visible. No horizontal scroll. |
| Tablet (640–1024px) | Hero padding identical (constant; navbar height does not change with viewport). Heading `text-4xl`–`text-5xl` (existing per-page scale preserved). Cinematic identical. |
| Desktop (≥ 1024px) | Hero padding identical. Heading scales up to `text-5xl`–`text-6xl` (existing per-page scale preserved). Cinematic identical. Sticky tab/filter bars (where present) continue to pin without z-fighting the cinematic. |

**Critical invariant:** padding does NOT change between breakpoints. The previous responsive padding modifiers (e.g. `sm:pt-32 lg:pt-40`) are removed because they assumed a content-relative top padding; the cinematic pattern uses navbar-relative top padding which is constant.

**Reduced motion:** all animations stop; static atmospheric (stars, warm beam gradient, nebula tint) remains visible. Verified via `/verify-with-playwright` per breakpoint.

## AI Safety Considerations

N/A — This is a purely visual rollout. No AI-generated content. No free-text user input. No content moderation surface added or modified. No crisis detection touchpoints. The `/ask` and `/music` AI surfaces continue to use the backend proxy unchanged. Visual rollout does not interact with any safety-relevant code path.

## Auth & Persistence

- **Logged-out users:** Visual rollout has zero data effect. No new localStorage writes, no new database writes, no telemetry.
- **Logged-in users:** Same as logged-out — purely visual.
- **localStorage usage:** **Zero new keys.** This spec adds nothing to `11-local-storage-keys.md`. Existing per-page keys on touched pages continue to function exactly as before.

## Completion & Navigation

N/A — visual rollout. No completion tracking, no Daily Hub completion signals, no CTA flow changes. Navigation between pages is unchanged.

## Design Notes

- **Component:** `frontend/src/components/CinematicHeroBackground.tsx` is the canonical cinematic. Zero props in this spec.
- **Composition contract** (REQUIRED — drift is a regression):
  - `<Navbar transparent />` on every cinematic-mounting page.
  - `<BackgroundCanvas>` wraps the page contents at the page root.
  - Hero `<section>` has `position: relative` (anchor for absolute-positioned cinematic).
  - Hero `<section>` uses `pt-[145px] pb-12` (97 navbar + 48 visible top padding; constant across breakpoints).
  - All hero content children (`<h1>`, `<p>`, action buttons) carry `relative z-10`.
- **Gradient text on every hero heading:** continue using `style={GRADIENT_TEXT_STYLE}` from `@/constants/gradients` — matches every other Round 3 Visual Rollout heading. The `/ask` page's `animate-gradient-shift` heading animation is preserved.
- **Subtitle treatment (canonical):** `text-base leading-relaxed text-white sm:text-lg`. Non-italic, no `font-serif`, no `text-white/60`. The PrayerWallHero cleanup brings it into line with this canonical pattern.
- **Reference existing pages:** `/daily` and `/bible` (post-prototype) are the visual reference for "what right looks like." `/verify-with-playwright` should compare touched pages against `/daily` for hero structure parity.
- **Pages NOT migrated (intentional drift):** `/settings`, `/insights`, `/music/routines` stay on `PageHero` + `ATMOSPHERIC_HERO_BG`. `BibleReader` (`/bible/:book/:chapter`) has its own `ReaderChrome`. Music sub-tabs, Prayer Wall sub-routes, all sub-pages — not landing pages, not migrated.
- **No new visual patterns introduced.** The cinematic, `BackgroundCanvas`, `FrostedCard`, `GRADIENT_TEXT_STYLE`, and `Navbar transparent` patterns all already exist in `09-design-system.md` (or are being canonicalized into it as part of Step 12). This is a rollout spec, not a design spec.

## Critical Invariants (must hold across all steps)

1. No git commits — Eric handles all commits manually.
2. No new branches — stay on `forums-wave-continued`.
3. No changes to `CinematicHeroBackground` beyond adding `data-testid` (Step 11). Component stays zero-prop.
4. Pre-existing test baseline preserved — `Pray.test.tsx` remains the only failing test.
5. `/music/routines` page must continue using `PageHero` unchanged.
6. `AudioProvider`, `audioReducer`, `AudioContext` code is read-only.
7. Decision 24 outcome dictates `/music` scope — Step 0's investigation result is binding.
8. Mask-fade-to-transparent architecture is the canonical seam-free pattern. Do not introduce alternative architectures (e.g., self-contained cinematic with `bgColor` prop) in this spec.
9. Navbar height of 97px is the canonical compensation value. Use `pt-[145px]` on every cinematic-mounting hero. Do not parameterize.
10. All hero content children must have `relative z-10`. This is a composition contract for the cinematic pattern.

## Rollback Procedures

Per-step rollback (foreground-friendly — failed step doesn't block subsequent independent steps):

```bash
# Step 1 (/bible) failure
git restore frontend/src/components/bible/landing/BibleHero.tsx

# Step 2 (/local-support) failure
git restore frontend/src/components/local-support/LocalSupportHero.tsx

# Step 3 (/ask) failure
git restore frontend/src/pages/AskPage.tsx

# Step 4-5 (/grow) failure
git restore frontend/src/pages/GrowPage.tsx

# Step 6-8 (/prayer-wall) failure
git restore frontend/src/pages/PrayerWall.tsx
git restore frontend/src/components/prayer-wall/PrayerWallHero.tsx

# Step 9 (/music) failure (audio cluster issue)
git restore frontend/src/pages/MusicPage.tsx
rm frontend/src/components/music/MusicHero.tsx

# Full rollback (everything)
git restore frontend/src/
rm frontend/src/components/music/MusicHero.tsx
rm frontend/src/components/__tests__/CinematicHeroBackground.test.tsx
```

If a step fails and rollback is needed, document the failure in `_plans/discoveries.md`. Continue with remaining steps that don't depend on the failed step. Don't pile failed-step debugging on top of in-progress execution — extract the failure to a separate session.

## Out of Scope

- Adding props to `CinematicHeroBackground` (zero-prop API in this spec).
- Modifying `Navbar`, `BackgroundCanvas`, or `PageHero` internals.
- Changing existing `PageHero` consumers (only `/music` switches off `PageHero` — `RoutinesPage` stays).
- Migrating `/settings`, `/insights`, `/music/routines` to cinematic — they stay on `PageHero` with `ATMOSPHERIC_HERO_BG`.
- Touching `BibleReader`, Music sub-tabs, Prayer Wall sub-routes.
- Touching any audio code (`AudioProvider`, `audioReducer`, `AudioContext`) — read-only investigation only.
- Changing any test that already passes (only add new tests, fix the one stale assertion in `DailyHub.test.tsx`).
- Committing anything — Eric handles all git operations.
- Creating new branches.
- Modifying the master plan beyond the surgical Phase 5 update specified in Step 13.
- Adding props to address the `/ask` warm-beam-vs-violet-glow visual concern (document in discoveries, ship as-is).

## Acceptance Criteria

### Implementation completeness

- [ ] `/bible` shows cinematic atmospheric in the hero region; "Your" + "Study Bible" headings centered below the navbar with balanced spacing; no visible hero-body seam; `BibleHero.tsx` uses `pt-[145px] pb-12`.
- [ ] `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` all show cinematic; heading + subtitle + action stack correctly; no seam on any of the three routes; all four content children carry `relative z-10`.
- [ ] `/ask` shows cinematic; heading + subtitle stack correctly below navbar; existing `animate-gradient-shift` heading animation still works; textarea + chips + CTA below the hero render unchanged; hero `<section>` has `relative` and `pt-[145px] pb-12`.
- [ ] `/grow` renders with `BackgroundCanvas` as page-root atmospheric (Step 4); cinematic visible after Step 5; sticky tab bar (`z-40`) does not z-fight with cinematic; tab switching, panels, sticky behavior all unchanged.
- [ ] `/prayer-wall` renders with `BackgroundCanvas` as page-root atmospheric (Step 6); deprecated typography (`font-script` "Wall", `font-serif italic` subtitle, `ATMOSPHERIC_HERO_BG`) all gone (Step 7); cinematic visible after Step 8; sticky `CategoryFilterBar` (`z-30`) does not z-fight; post-creation, filtering, prayer card rendering all unchanged.
- [ ] `/music` shows cinematic AND audio plays correctly (worship playlist play/pause, ambient layer + crossfade, Sleep & Rest content, AudioDrawer FAB, tab switching, navigation away/back) — OR `/music` skipped per Step 0 outcome C with Decision 24 hard-rule documentation + spec-tracker follow-up stub.
- [ ] `/music/routines` renders unchanged with `PageHero` (the `MusicHero` refactor must not affect it).

### Hard invariants

- [ ] Zero stale references on any touched page: `ATMOSPHERIC_HERO_BG` (in `/grow`, `/prayer-wall`, `/music` if migrated), `font-script` (in `PrayerWallHero`), `font-serif italic` (in `PrayerWallHero`), `bg-dashboard-dark` (on outer wrappers of `/grow`, `/prayer-wall`, `/music` if migrated).
- [ ] `CinematicHeroBackground` imports present in: `BibleHero.tsx`, `LocalSupportHero.tsx`, `AskPage.tsx`, `GrowPage.tsx`, `PrayerWallHero.tsx`, `MusicHero.tsx` (if shipped), `DailyHub.tsx` (existing).
- [ ] Every cinematic-mounting hero `<section>` uses `position: relative` and `pt-[145px] pb-12` exactly (no responsive padding modifiers).
- [ ] Every cinematic-mounting hero's content children (`<h1>`, `<p>`, action wrapper, extraContent wrapper) carry `relative z-10`.
- [ ] `CinematicHeroBackground` outer wrapper carries `aria-hidden="true"`, `pointer-events-none`, `data-testid="cinematic-hero-background"`, height `calc(100% + 200px)`, and a `mask-image` linear gradient (with matching `WebkitMaskImage`).
- [ ] Component stays zero-prop — no prop API additions.

### Test deliverables

- [ ] `DailyHub.test.tsx` passes with no stale failures; the `pb-6 sm:pb-8` assertion is updated to `pt-[145px]` + `pb-12`.
- [ ] `DailyHub.test.tsx` includes a new cinematic-presence test (selector: `[data-testid="cinematic-hero-background"]`).
- [ ] `DailyHub.test.tsx` includes a new navbar-compensation test asserting `pt-[145px]` on the hero region.
- [ ] `CinematicHeroBackground.test.tsx` exists at `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` with 7 passing tests covering smoke render, `aria-hidden`, `pointer-events-none`, `calc(100% + 200px)` height, `mask-image` (+ `WebkitMaskImage`), 8-layer child count, and reduced-motion CSS-class contract.
- [ ] Total test count increases by 9 (2 in DailyHub + 7 in new file).

### Documentation deliverables

- [ ] `09-design-system.md` has new "Cinematic Hero Pattern (Spec 14)" subsection covering component path, 9-layer architecture, mask-fade-to-transparent rationale, composition rules, pages using vs. NOT using, reduced-motion behavior, mobile behavior, performance budget, and zero-prop API stability.
- [ ] `09-design-system.md` Decision 24 entry updated with Spec 14 outcome (A, B, or C as discovered).
- [ ] `09-design-system.md` documented-intentional-drift list refreshed to reflect `/music`'s post-Spec-14 status.
- [ ] `spec-tracker.md` has Spec 14 entry with `✅` status (or appropriate emoji per tracker convention).
- [ ] `round3-master-plan.md` Phase 5 section updated to mark PrayerWallHero migration, `font-script` cleanup, `font-serif italic` cleanup, and BackgroundCanvas promotion as "Shipped in Spec 14 — Cinematic Hero Rollout."

### Build/test/lint/type baselines

- [ ] `pnpm test` shows expected baseline — `Pray.test.tsx` remains the only failing test; no new fail file or count increase.
- [ ] `pnpm tsc --noEmit` clean (zero errors).
- [ ] `pnpm lint` clean (no new warnings beyond baseline).
- [ ] `pnpm build` succeeds.

### Visual verification (`/verify-with-playwright`)

- [ ] **Per-page on each of `/bible`, `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`, `/ask`, `/grow`, `/prayer-wall`, `/music` (if migrated)** at desktop (1280×900) and mobile (375×812):
  - Cinematic atmospheric visible in hero (stars, warm light beam, nebula tint all render).
  - Hero content (heading, subtitle, action) stacks above cinematic and is not occluded by stars.
  - No visible horizontal break line at the hero/body boundary (BackgroundCanvas paints continuously).
  - Heading visually centered below navbar (not bottom-heavy).
  - Mobile: cinematic still visible at 375px, density appropriate, no horizontal scroll.
  - Reduced-motion: animations stop, static atmospheric remains visible.
  - Z-index: sticky tab bars (where present) do not z-fight with cinematic.
- [ ] **`/music`-specific (if migrated):** worship playlist plays/pauses, ambient sounds layer + crossfade, Sleep & Rest scripture readings + bedtime stories play, AudioDrawer FAB renders + opens, tab switching preserves audio state, navigation away/back preserves `AudioContext` state.
- [ ] **`/music/routines` regression:** renders unchanged with `PageHero`.
- [ ] **`/ask` warm-beam-vs-violet-glow check:** subjective evaluation captured in `_plans/discoveries.md` if it reads muddy. Ship as-is regardless.

### Code review

- [ ] `/code-review` passes with no flagged issues. Spec-cross-reference confirms every acceptance criterion is met.
- [ ] No new auth-modal invocations introduced; no existing auth gate accidentally bypassed.

When all checkboxes are filled, the spec is ready for Eric's commit.

---

## Notes for `/plan`

- Step 0 is a HARD GATE. `/plan` must NOT enumerate `/music` implementation steps until Step 0's investigation has been performed and the outcome locked.
- Each implementation step should produce its own discrete file edits with verification before moving on. This is a long spec; intermediate verification keeps the working tree coherent.
- `/grow` and `/prayer-wall` each have TWO steps (BackgroundCanvas promotion, then cinematic mount). These are separated intentionally — promote first, verify, then mount. Don't combine.
- `/prayer-wall` hero cleanup (Step 7) is BEFORE the cinematic mount (Step 8). Clean up the deprecated typography first so the file is in canonical shape before adding cinematic.
- Test additions (Steps 10, 11) come AFTER all implementation. Tests validate the final shipped state, not intermediate states.
- Documentation (Steps 12, 13) comes LAST. Doc updates reflect the final shipped state including any deviations discovered during execution.

## Notes for `/execute-plan`

- Use `Edit`/`Write` for all file modifications; reserve `Bash` for git status checks, test runs, and verification greps.
- After every file edit, the harness already tracks file state. Do NOT re-read a file solely to verify the edit succeeded — `Edit`/`Write` would have errored otherwise.
- After every page mount step, hard-refresh the page in dev (`pnpm dev` running) and visually confirm the cinematic shows. Do NOT proceed to the next step if the current page shows visual regressions.
- For Step 9 (`/music`): proceed ONLY if Step 0 outcome was A or B. If outcome C, skip Step 9 entirely and document the audio cluster coupling.
- Pre-MR self-review: before declaring complete, re-read this spec's Acceptance Criteria checklist and verify each item.

---

## End of Spec 14

Hand to `/plan` for step-by-step plan generation, then to `/execute-plan` for implementation, then `/code-review`, then `/verify-with-playwright`. After all skills complete, surface to Eric for commit.
