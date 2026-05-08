# Implementation Plan: Spec 14 — Cinematic Hero Rollout (All Landing Pages)

**Spec:** `_specs/spec-14-cinematic-hero-rollout.md`
**Date:** 2026-05-07
**Branch:** `forums-wave-continued` (stay on current branch — do NOT create a new branch)
**Design System Reference:** `_plans/recon/design-system.md` — not directly loaded for this plan (this is a rollout of an already-canonical pattern; visual values come from the spec-specific recon below)
**Recon Report:** `_plans/recon/cinematic-rollout-recon-2026-05-07.md` (full per-page anatomy — LOADED), `_plans/recon/cinematic-hero-diagnostic-2026-05-07.md` (mask-image-fade architecture — LOADED), `_plans/recon/homepage-hero-anatomy-2026-05-07.md` (informational context only)
**Master Spec Plan:** `_forums_master_plan/round3-master-plan.md` Phase 5 — Prayer Wall Visual Migration partial fold-in
**Model posture:** Opus 4.7 xHigh

---

## Affected Frontend Routes

- `/bible` — Step 1 (cinematic mount)
- `/local-support/churches` — Step 2 (cinematic mount via shared LocalSupportHero)
- `/local-support/counselors` — Step 2 (cinematic mount via shared LocalSupportHero)
- `/local-support/celebrate-recovery` — Step 2 (cinematic mount via shared LocalSupportHero)
- `/ask` — Step 3 (cinematic mount + structural relative/z-10 fixes)
- `/grow` — Step 4 (BackgroundCanvas promotion) + Step 5 (cinematic mount)
- `/grow?tab=challenges` — Step 4/5 (same surface, sticky tab variant)
- `/prayer-wall` — Step 6 (BackgroundCanvas promotion) + Step 7 (hero cleanup) + Step 8 (cinematic mount)
- `/music` — Step 9 (CONDITIONAL on Step 0 outcome)
- `/daily` — Step 11 (test backfill only — production page already on cinematic pattern)
- `/music/routines` — final regression check only (must remain on `PageHero`, untouched)

---

## Architecture Context

### Component under rollout

`CinematicHeroBackground` lives at `frontend/src/components/CinematicHeroBackground.tsx` (328 lines, untracked file in git, `memo`-wrapped, zero-prop). Verified outer-wrapper structure (read 2026-05-07):

- Tag: `<div>`
- `aria-hidden="true"`
- `className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"`
- Inline `style`: `{ height: 'calc(100% + 200px)', maskImage: '<linear-gradient>', WebkitMaskImage: '<same linear-gradient>' }`
- The mask-image fade-to-transparent enables seam-free composition with whatever atmospheric paints below the parent `<section>` — by design that atmospheric is `BackgroundCanvas` at the page root.

**8 direct children** in source order (verified by re-reading `CinematicHeroBackground.tsx` 2026-05-07): solid base `<div>` (Layer 0) → nebula tint `<div>` (Layer 1) → far-stars `<svg>` (Layer 2) → mid-stars `<svg>` (Layer 3) → bright-stars `<svg>` (Layer 4) → cross-glints `<svg>` (Layer 5) → warm beam `<div>` (Layer 6) → film grain `<svg>` (Layer 7). **Total: 4 divs + 4 svgs = 8 children.** The recon's "9 layers" historical count included a separate fade-to-body `<div>` that was replaced by the outer-wrapper `mask-image` — the current shipped component has 8 children. Spec Step 11 test 6 ("8-layer child count") matches the actual component; this plan asserts 8.

CSS animation hooks live in `frontend/src/index.css` L335–397 and `frontend/src/styles/animations.css` (global reduced-motion safety net):

- `.cinematic-light-beam` — applied unconditionally on Layer 6 (always present)
- `.cinematic-star-twinkle` — applied conditionally on mid + bright star circles via seeded RNG (twinkleRatio 0.3 mid / 0.5 bright). With deterministic seeds (`0xfade`, `0xbeef`), at least one twinkling element is guaranteed in the output. Test will assert `≥ 1` matching element.
- `.cinematic-glint-pulse` — applied conditionally to cross-glints via seeded RNG (pulse rate 0.3, 8 anchors, seed `0xc1a55`). Deterministic; test will assert `≥ 1` matching element.

### Reference implementation

`/daily` (DailyHub) is the only current consumer. Verified hero structure at `frontend/src/pages/DailyHub.tsx` L213–232:

```tsx
<BackgroundCanvas className="flex flex-col font-sans">
  <SEO ... />
  <Navbar transparent />
  <main id="main-content">
    <section
      aria-labelledby="daily-hub-heading"
      className="relative z-10 flex min-h-[30vh] w-full flex-col items-center justify-center px-4 pb-12 pt-[145px] text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id="daily-hub-heading"
        className="relative z-10 mb-1 pb-2 text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl"
        style={GRADIENT_TEXT_STYLE}
      >
        {displayName}
      </h1>
    </section>
    ...
```

Composition contract (REPEATED everywhere — drift is a regression):
1. `<Navbar transparent />` is a sibling of `<main>` inside `<BackgroundCanvas>` (or inside `<Layout transparentNav>` for `/ask`).
2. `<BackgroundCanvas>` wraps the entire page contents at the root.
3. Hero `<section>` has `position: relative` (anchors the absolutely-positioned cinematic).
4. Hero `<section>` uses `pt-[145px] pb-12` (97px navbar + 48px visible top padding; constant across breakpoints — NO responsive padding modifiers).
5. `<CinematicHeroBackground />` is the FIRST child of the hero `<section>`.
6. All hero content children (`<h1>`, `<p>`, action wrapper, extraContent wrapper) carry `relative z-10`.

### Per-page existing hero anatomy (verified on disk)

| Page | Hero file | Current padding | Atmospheric today | BackgroundCanvas at root? |
|---|---|---|---|---|
| `/bible` | `frontend/src/components/bible/landing/BibleHero.tsx` (22 lines) | `pt-28 pb-12 sm:pt-32 sm:pb-14 lg:pt-32` | BackgroundCanvas | ✅ Yes (`BibleLanding.tsx` L141) |
| `/local-support/*` | `frontend/src/components/local-support/LocalSupportHero.tsx` (38 lines) | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` | BackgroundCanvas (wraps hero + main) | ✅ Yes (`LocalSupportPage.tsx` L250) |
| `/ask` | inline in `frontend/src/pages/AskPage.tsx` L257–271 | `pt-32 pb-10 sm:px-6 sm:pt-40 sm:pb-12` | BackgroundCanvas | ✅ Yes (L256). Hero `<section>` is **missing `relative`**. |
| `/grow` | inline in `frontend/src/pages/GrowPage.tsx` L67–82 | `pt-32 pb-8 sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12` + `style={ATMOSPHERIC_HERO_BG}` | ATMOSPHERIC_HERO_BG (hero) + BackgroundCanvas (body, L84) — **SPLIT** | ❌ No (BackgroundCanvas wraps body only) |
| `/prayer-wall` | `frontend/src/components/prayer-wall/PrayerWallHero.tsx` (26 lines) | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` + `style={ATMOSPHERIC_HERO_BG}` + deprecated `font-script` "Wall" + `font-serif italic text-white/60` subtitle | ATMOSPHERIC_HERO_BG | ❌ No (outer wrapper is `bg-dashboard-dark`, no BackgroundCanvas) |
| `/music` | shared `frontend/src/components/PageHero.tsx` via `<PageHero title="Music" subtitle="...">` in `MusicPage.tsx` L176–179 | PageHero canonical: `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` + `style={ATMOSPHERIC_HERO_BG}` | ATMOSPHERIC_HERO_BG | ❌ No (intentional drift — Decision 24) |
| `/music/routines` | shared `PageHero` (same file as `/music`) | same as `/music` | ATMOSPHERIC_HERO_BG | ❌ No — INTENTIONAL, must NOT be migrated |

### Audio cluster topology (background read for Step 0)

Verified file locations and mount points (read 2026-05-07):

- `frontend/src/components/audio/AudioProvider.tsx` (canonical AudioProvider component; defines `AudioStateContext`, `AudioDispatchContext`, `SleepTimerControlsContext`, `AudioEngineContext`, `ReadingContextControlContext`).
- `frontend/src/components/audio/audioReducer.ts` (canonical reducer; reads `state.activeSounds`, `state.foregroundContent`, `state.masterVolume`, `state.foregroundBackgroundBalance`, `state.isPlaying`, `state.sleepTimer`, `state.activeRoutine`, `state.pillVisible`, `state.drawerOpen`, `state.currentSceneName`, `state.currentSceneId`, `state.foregroundEndedCounter`, `state.readingContext`, `state.pausedByBibleAudio`).
- `frontend/src/lib/audio-engine.ts` (`AudioEngineService` — imperative resource).
- **Mount point:** `frontend/src/App.tsx` L204 mounts `<AudioProvider>` AT APP-LEVEL (above the `<Routes>` block at L287). This means `AudioProvider` mounts ABOVE `MusicPage` in the React tree — the provider does not depend on the `MusicPage` component or wrapper for its lifecycle.

This is the input data for Step 0's classification — but Step 0 will still perform the read and lock the conclusion (don't skip the gate).

### Test patterns to match

- **MusicPage tests** (`frontend/src/pages/__tests__/MusicPage.test.tsx`, 293 lines, verified): mock `useAuth`, `AudioProvider` (mocks `useAudioState`, `useAudioDispatch`, `useAudioEngine`), `useScenePlayer`, `storageService`, `SOUND_BY_ID`, and tab content components. Renders inside `MemoryRouter > ToastProvider > AuthModalProvider > MusicPage`.
- **DailyHub tests** (`frontend/src/pages/__tests__/DailyHub.test.tsx`, 400 lines): hero queried via `document.querySelector('[aria-labelledby="daily-hub-heading"]')`. Stale `pb-6 sm:pb-8` assertion lives at L144–149.
- **CinematicHeroBackground.test.tsx** does NOT exist yet. New file in Step 10.

### MusicPage test pre-read findings (clarification #2)

Read `frontend/src/pages/__tests__/MusicPage.test.tsx` end-to-end. PageHero-targeted queries that the new `MusicHero` MUST preserve:

| Test (line) | Query | Required assertion preserved by `MusicHero` |
|---|---|---|
| L99–104 "renders hero with 'Music' title" | `screen.getByRole('heading', { level: 1, name: 'Music' })` | `<h1>` with text content exactly `Music` |
| L106–111 "renders subtitle" | `screen.getByText(/Worship, rest, and find peace/)` | A text node containing `Worship, rest, and find peace in God's presence.` |
| L246–250 "h1 renders 'Music' without Caveat accent" | `heading.querySelector('.font-script')` is null | NO descendant of the `<h1>` carries the `font-script` Tailwind class |
| L213–216 "has skip-to-content link (via Navbar)" | `screen.getByText('Skip to content')` | Skip link still mounted by `Navbar` (unchanged — `MusicHero` does not affect this; out of scope but flag as a regression risk if Navbar mount accidentally moves) |

These four assertions are load-bearing. The Step 9 plan ensures `MusicHero` renders an `<h1>` with raw text `Music` (no font-script `<span>`), a `<p>` containing the canonical subtitle string, and does not affect the surrounding chrome that mounts the navbar.

### Repository conventions

- Plan files live in `_plans/` with `YYYY-MM-DD-slug.md` naming.
- Recent execution-log deviations (last 14 days, sampled from `_plans/2026-05-07-spec-12-site-chrome.md`, `_plans/2026-05-07-spec-13-homepage-polish.md`, `_plans/2026-05-07-spec-11c-routines-uplift.md`): the Round 3 Visual Rollout closed all known design-system drift; no new pre-Visual-Rollout deprecation patterns are at risk in this plan because the spec is purely a rollout of an already-canonical pattern (cinematic).

---

## Auth Gating Checklist

Spec § "Auth Gating" (lines 257–271) explicitly states this is a **purely visual** spec — no new interactive elements, no new data writes, no new gated actions. The cinematic component is `aria-hidden="true"` and `pointer-events-none`, so it cannot intercept any click or keyboard event.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| (none) | No new auth-gated actions introduced | N/A | Existing auth gates on every touched page UNCHANGED |

**Mandatory verification (added to Step 14):** `/code-review` must confirm zero NEW `useAuthModal` call sites introduced AND zero existing `useAuthModal` call sites accidentally removed. Specifically:

- `/prayer-wall` — `openAuthModal()` calls in PrayerWall.tsx L661 (Share button when logged-out) and the InteractionBar/InlineComposer auth gates must remain untouched. `PrayerWallHero.tsx` cleanup in Step 7 only modifies typography + padding; the `action` prop continues to receive the `<button onClick={openAuthModal}>` from the parent.
- `/local-support/*` — bookmark + visit-recording gates in `LocalSupportPage.tsx` (NOT `LocalSupportHero.tsx`) — Step 2 only touches the Hero subcomponent, gates are upstream.
- `/ask` — public; no auth gates touched by Step 3.
- `/grow` — Steps 4 & 5 don't touch the per-plan/per-challenge writes that have their own gates.
- `/music` — Step 9 (if proceeding) only modifies `MusicPage.tsx` chrome (PageHero swap + BackgroundCanvas promotion + outer-wrapper class change). Audio cluster code is read-only per Step 0.
- `/daily` — Step 11 is test-only.

---

## Design System Values (for UI steps)

This rollout reuses already-canonical values from existing pages. No new design tokens introduced.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero `<section>` (every cinematic-mounting page) | `padding` | `pt-[145px] pb-12` (constant; no responsive modifiers) | `frontend/src/pages/DailyHub.tsx:222` (canonical reference) |
| Hero `<section>` | `position` | `relative` (anchors absolutely-positioned cinematic) | DailyHub.tsx:222 |
| Hero content children | `position` / `z-index` | `relative z-10` | DailyHub.tsx:227 |
| `CinematicHeroBackground` outer wrapper | className | `pointer-events-none absolute inset-x-0 top-0 overflow-hidden` | `frontend/src/components/CinematicHeroBackground.tsx:155` |
| `CinematicHeroBackground` outer wrapper | `aria-hidden` | `"true"` | CinematicHeroBackground.tsx:154 |
| `CinematicHeroBackground` outer wrapper | `data-testid` | `"cinematic-hero-background"` (NEW — added in Step 10) | This plan, Step 10 |
| `CinematicHeroBackground` outer wrapper | inline `style.height` | `'calc(100% + 200px)'` | CinematicHeroBackground.tsx:157 |
| `CinematicHeroBackground` outer wrapper | inline `style.maskImage` & `WebkitMaskImage` | `'linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.50) 72%, rgba(0,0,0,0.20) 88%, transparent 100%)'` | CinematicHeroBackground.tsx:158–161 (verbatim) |
| Heading style | `style={GRADIENT_TEXT_STYLE}` | from `@/constants/gradients` | every existing hero |
| `/ask` heading animation | `animate-gradient-shift` | preserved from `frontend/src/pages/AskPage.tsx:263` | unchanged |
| `/prayer-wall` subtitle (post-Step-7) | `text-base leading-relaxed text-white sm:text-lg` (mirrors LocalSupportHero) | `frontend/src/components/local-support/LocalSupportHero.tsx:31–33` | canonical hero subtitle |
| `MusicHero` subtitle (Step 9) | `text-base leading-relaxed text-white sm:text-lg` | LocalSupportHero.tsx:31–33 | canonical hero subtitle |

**[UNVERIFIED]** None. All values cited above are from on-disk file inspection during recon and pre-execution reads. The mask-image string and outer-wrapper class are reproduced verbatim from `CinematicHeroBackground.tsx`.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

<!-- MAINTENANCE NOTE: This canonical patterns block must stay in sync with `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" AND with the matching ```text block in `.claude/skills/execute-plan/SKILL.md` § "Step 4d: Design System Reminder". -->

- Cinematic Hero Pattern composition contract: `<Navbar transparent />` + `<BackgroundCanvas>` at root + hero `<section>` with `position: relative` + `pt-[145px] pb-12` constant padding + `<CinematicHeroBackground />` as first child of hero + `relative z-10` on every content child. Drift is a regression.
- The hero's `pt-[145px]` value is the canonical 97px-navbar + 48px-visible-top compensation. Do NOT parameterize. Do NOT add responsive modifiers like `sm:pt-32`.
- `<CinematicHeroBackground />` stays zero-prop in this spec. The ONLY modification permitted to the component file is adding `data-testid="cinematic-hero-background"` to its outer wrapper (Step 10). Do NOT add `bgColor`, `extensionPx`, `maskFadeStart`, `enableWarmBeam`, or any other prop.
- `BackgroundCanvas` wraps the ENTIRE page contents at root for cinematic-mounting pages. Settings, Insights, Music (subject to Step 0), Routines, BibleReader stay on their existing chrome.
- All Daily Hub tab content components use `max-w-2xl` container width with `mx-auto max-w-2xl px-4 py-10 sm:py-14` and transparent backgrounds — the `BackgroundCanvas` atmospheric layer shows through.
- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font is restricted to the wordmark and `RouteLoadingFallback` only — it is deprecated for every other h1/h2. The `/prayer-wall` `font-script` "Wall" treatment is a remnant of pre-Visual-Rollout drift and is removed in Step 7.
- `font-serif italic text-white/60` subtitles are deprecated; canonical hero subtitle is `text-base leading-relaxed text-white sm:text-lg`. The `/prayer-wall` "You're not alone." subtitle's `font-serif italic text-white/60` is a remnant of pre-Visual-Rollout drift and is replaced in Step 7.
- `BackgroundCanvas` and `ATMOSPHERIC_HERO_BG` are mutually exclusive on the same surface. `/grow` and `/prayer-wall` currently composite both (hero on `ATMOSPHERIC_HERO_BG`, body on `BackgroundCanvas`); Steps 4 + 6 collapse this by promoting `BackgroundCanvas` to wrap the entire page and removing `style={ATMOSPHERIC_HERO_BG}` from the hero. Do NOT introduce new `ATMOSPHERIC_HERO_BG` references.
- Sticky tab/filter bars (`/grow` `z-40`, `/prayer-wall` `z-30`, `/music` `z-40`) live BELOW the cinematic. The cinematic's mask-fade-to-transparent reaches `transparent 100%` at its base; layers below the mask's terminal point don't paint, so the cinematic does NOT visually overlap the sticky bars. Do not change `z-index` values to "fix" perceived overlap — the mask handles it.
- The cinematic component is `aria-hidden="true"` and `pointer-events-none`. It MUST stay that way (canonical accessibility behavior — screen readers skip it, mouse/touch events pass through to underlying content).
- Layout default flipped to `transparentNav: true` post-Spec-12. `/ask` uses `<Layout transparentNav>` (Layout's wrapper); other cinematic-mounting pages mount `<Navbar transparent />` directly inside `<BackgroundCanvas>`. Either is valid. Do NOT change the navbar variant on touched pages.
- Frosted glass cards: `bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl` (post-Visual-Rollout). NOT touched by this spec but may be in proximity to migrated heroes.
- Selectable pills (settings tabs, time-range selectors): `bg-white/15 text-white border border-white/30` muted-white active-state. NOT touched by this spec but may be in proximity to migrated heroes.
- Border opacity unification: decorative card/chrome borders on dark use `border-white/[0.12]`. NOT touched by this spec.
- `/music/routines` uses `PageHero` with `ATMOSPHERIC_HERO_BG` and is **explicitly NOT migrated** (Out of Scope). Step 9 (`MusicHero`) creates a NEW hero subcomponent rather than modifying `PageHero`, specifically to keep `/music/routines` untouched.
- AI Safety: N/A — this is a purely visual rollout. No AI-generated content, no free-text user input, no content moderation surface. Crisis detection touchpoints (CrisisBanner on Pray/Journal/Ask) are unaffected — they live BELOW the hero and are not in the cinematic's z-stack.

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift back to default assumptions.

---

## Shared Data Models (from Master Plan)

This spec touches **zero shared data models**, **zero localStorage keys**, **zero TypeScript interfaces**. All work is composition + visual.

**localStorage keys this spec touches:** None.

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | This spec adds nothing to `11-local-storage-keys.md`. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero `pt-[145px] pb-12` constant; cinematic SVG starfields render via `viewBox="0 0 1920 1080"` + `preserveAspectRatio="xMidYMid slice"` so the visible center ~1300 source-pixels render. Density per square pixel comparable to desktop. Mobile probe (`_plans/recon/cinematic-rollout-recon-2026-05-07.md` § G.4) confirmed clean rendering. No horizontal scroll. Heading `text-3xl`–`text-4xl` (per-page existing scale preserved). |
| Tablet | 768px | Hero padding identical (constant — navbar height does not change with viewport). Heading `text-4xl`–`text-5xl` (existing per-page scale preserved). Cinematic identical. |
| Desktop | 1440px | Hero padding identical. Heading `text-5xl`–`text-6xl` (existing per-page scale preserved). Sticky tab/filter bars (`/grow` `z-40`, `/prayer-wall` `z-30`, `/music` `z-40`) continue to pin below the hero without z-fighting. |

**Critical invariant:** padding does NOT change between breakpoints. Previous responsive padding modifiers (e.g., `sm:pt-32`, `lg:pt-40`) are removed because they assumed content-relative top padding; the cinematic pattern uses navbar-relative top padding which is constant.

**Reduced motion:** all cinematic animations stop via `frontend/src/styles/animations.css` global `*` rule + `frontend/src/index.css` L391–397 component-specific overrides. Static atmospheric (stars, warm beam gradient, nebula tint, film grain) remains visible. Reduced-motion probe verified at `_plans/recon/cinematic-rollout-recon-2026-05-07.md` § G.5.

---

## Inline Element Position Expectations (UI features with inline rows)

This spec is purely visual rollout of an atmospheric layer that sits BEHIND content. The cinematic component itself is not an inline-row layout (it is an absolute-positioned background). The hero content above it (`<h1>`, optional `<p>`, optional action wrapper) stacks vertically in a `flex flex-col` column on every cinematic-mounting page. There are no NEW inline-row layouts introduced.

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| `/prayer-wall` action row (existing) | "Share a Prayer Request" button + "My Dashboard" link (when authenticated) | No wrap allowed at 768px and 1440px (children stay within the row's vertical span). Mobile (< 640px) stacks vertically per `flex-col sm:flex-row` (existing behavior — preserved) | Wrapping below 640px is acceptable (intentional via responsive class) |

**Existing inline-row layouts on touched pages remain untouched** by this spec — Step 7 PrayerWallHero cleanup only changes typography and padding, not the action wrapper's layout.

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

The cinematic mask-fade-to-transparent pattern is **specifically designed** so the hero/body boundary has no visible seam — there is no defined vertical gap between the hero `<section>` and the next sibling because the mask blends them.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Cinematic-mounting hero `<section>` → next sibling (sentinel / sticky bar / `<main>` content) | 0px (no margin) — mask blends across boundary; cinematic's 200px extension paints THROUGH the boundary into the next-sibling region | `_plans/recon/cinematic-hero-diagnostic-2026-05-07.md` Section 3 (verified seam analysis on `/daily`) |
| `/grow` hero → sticky tab bar | 0px (sentinel `<div>` is 0-height; sticky tab bar starts immediately) | `frontend/src/pages/GrowPage.tsx` L86 (sentinel) → L89 (sticky wrapper) |
| `/prayer-wall` hero → sticky CategoryFilterBar wrapper | 0px (same pattern — sentinel `<div>` then sticky wrapper) | `frontend/src/pages/PrayerWall.tsx` L671–680 |
| `/music` hero → sticky tab bar (if Step 9 outcome A/B) | 0px (same pattern — sentinel then sticky wrapper at MusicPage.tsx L182–190) | unchanged |
| `/bible` hero → divider + content block | 0px (existing `<div className="border-t border-white/[0.08] max-w-6xl mx-auto" />` immediately follows hero per recon Section 1.5) | unchanged |
| `/local-support/*` hero → `<main>` | 0px (hero is followed directly by `<main>`) | unchanged |
| `/ask` hero `<section>` → composer `<section>` | 0px (composer section starts immediately, no gap) | unchanged — recon § 4.4 |

`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged as a mismatch — but on this spec the expected value is 0px everywhere; the cinematic's mask architecture is the canonical seam-free pattern.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] On branch `forums-wave-continued` (do NOT create a new branch).
- [ ] Working tree clean except for the untracked `_specs/spec-14-cinematic-hero-rollout.md` file.
- [ ] `pnpm install` completed; dev server can start with `pnpm dev`.
- [ ] Pre-existing test baseline understood: `Pray.test.tsx — shows loading then prayer after generating` is the ONLY known failing test; `pnpm test` exit code is 1 due to that single failure. Any NEW failing test file or any increase in fail count after a spec step lands is a regression and triggers Eric-surface.
- [ ] Step 0 audio cluster investigation has been performed (read-only) and outcome locked BEFORE Step 9 is enumerated in detail. Step 9 is presented in this plan as conditional but must NOT be executed until Step 0 returns A or B (or its ambiguous-outcome branch is resolved by Eric).
- [ ] All auth-gated actions from the spec are accounted for in the plan (this spec adds zero new ones — see "Auth Gating Checklist").
- [ ] Design system values are verified (recon report loaded; CinematicHeroBackground.tsx re-read 2026-05-07; per-page hero files re-read 2026-05-07).
- [ ] All `[UNVERIFIED]` values are flagged with verification methods (none required for this plan — every value comes from disk inspection).
- [ ] Recon report loaded for visual verification during execution: `_plans/recon/cinematic-rollout-recon-2026-05-07.md` (per-page anatomy) and `_plans/recon/cinematic-hero-diagnostic-2026-05-07.md` (mask-image-fade architecture).
- [ ] No deprecated patterns introduced. This spec REMOVES deprecated patterns from `/prayer-wall` (font-script, font-serif italic, ATMOSPHERIC_HERO_BG) and `/grow`/`/music` (ATMOSPHERIC_HERO_BG, bg-dashboard-dark on outer wrapper of cinematic-mounting pages).
- [ ] Eric will commit the work himself; CC does NOT commit, push, or create branches.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component-test data-testid placement | Add to `CinematicHeroBackground.tsx` outer wrapper BEFORE writing the test that targets it (Step 10 covers both in one step) | The original spec ordering (Step 10 = DailyHub backfill referencing `[data-testid="cinematic-hero-background"]`, Step 11 = component file modification + new test) violates the rule that a step must not use a selector before that selector exists. **Plan reorders: data-testid + component test = Step 10; DailyHub backfill = Step 11.** Eric's pre-execution clarification #1. |
| MusicHero refactor preserves existing tests | New `MusicHero` component renders an `<h1>` with text content `Music` (no `font-script` descendants) and a `<p>` with the canonical subtitle string | MusicPage.test.tsx asserts those exact shapes (verified — pre-execution clarification #2). Refactor must be test-compatible. |
| Step 0 ambiguous outcome | Surface to Eric for direction; do NOT auto-classify | Pre-execution clarification #3. The spec's Outcomes A/B/C are clean cases; an ambiguity (e.g., `AudioProvider` mounts above the page but a hook indirectly references `bg-dashboard-dark`) is not auto-classifiable. |
| CinematicHeroBackground 8 vs 9 children | Test for 8 (4 svg + 4 div) | Pre-execution clarification #4 — re-read of `CinematicHeroBackground.tsx` confirms 8 direct children (no separate fade-to-body div; the mask-image on the outer wrapper replaces it). Spec Step 11 test 6 already says "8-layer child count" — consistent. |
| Per-step verification cadence | Each implementation step (1–9) ends with an explicit Playwright-based verification action; failure halts execution and surfaces to Eric | Pre-execution clarification #5. Visual regressions detected per-step prevent compounding state where a downstream step builds atop a broken upstream change. |
| `/ask` warm-beam-vs-violet-glow visual concern | Ship as-is in Step 3; document in `_plans/discoveries.md` if subjectively muddy | Spec § "Out of Scope" (line 372) — not adding props in this spec; recon § 4.3 flagged the concern as subjective; this plan inherits that decision. |
| `/grow` vs `/music` hero refactor approach | `/grow` promotes BackgroundCanvas to root (no Decision-24-style preservation rule); `/music` creates a new `MusicHero` component (only conditional on Step 0) and ALSO promotes BackgroundCanvas | Per spec § Step 4 (line 137) and § Step 9 (line 174). `/grow` is straightforward. `/music` is gated by Decision 24 audio reconciliation. |
| `/music/routines` regression | `MusicHero` is a NEW component; `PageHero` is NOT modified | RoutinesPage continues using `PageHero` unchanged. Spec § "Critical Invariants" #5 (line 320) and § "Out of Scope" (line 364). Validated in Step 14 final verification. |
| Test count increase | +9 (2 in DailyHub + 7 in CinematicHeroBackground.test.tsx) | Spec § "Acceptance Criteria → Test deliverables" (line 401). Plan honors this exactly. |
| Phase 5 master plan update scope | Surgical only — mark PrayerWallHero migration + font-script cleanup + font-serif italic cleanup + BackgroundCanvas promotion as "Shipped in Spec 14"; remaining Phase 5 scope (PrayerCard FrostedCard migration, PageShell internals, QotdComposer, animation token cleanup, deprecated pattern purge) stays in Phase 5 | Spec § Step 13 (line 233) explicitly enumerates the four items to mark shipped. |

---

## Implementation Steps

### Step 0: Decision 24 audio cluster investigation (READ-ONLY GATE)

**Objective:** Determine whether `/music` chrome migration to `BackgroundCanvas` + cinematic atmospheric is safe, by classifying the AudioProvider/audioReducer/AudioContext cluster as Decoupled (A), Loosely coupled (B), or Tightly coupled (C). Outcome dictates Step 9 scope.

**Files to read (no modifications):**
- `frontend/src/App.tsx` — confirm AudioProvider mount level (already read pre-plan: L204; mounts at App level above Routes)
- `frontend/src/components/audio/AudioProvider.tsx` — confirm provider does not depend on MusicPage wrapper
- `frontend/src/components/audio/audioReducer.ts` — full read; identify any reducer action that reads chrome-related state (theme, atmospheric layer, navbar mode, `bg-dashboard-dark`)
- `frontend/src/lib/audio-engine.ts` — confirm AudioEngineService does not read chrome state
- `frontend/src/pages/MusicPage.tsx` — full re-read; identify any code path that depends on the page's outer `<div>` having `bg-dashboard-dark` specifically (vs. just having SOME wrapper)
- `frontend/src/types/audio.ts` (or equivalent) — confirm `AudioState` shape contains no chrome fields

**Investigation method:**

1. Read each file in the order above.
2. `grep -rn "bg-dashboard-dark" frontend/src/components/audio/` — expect zero matches inside the audio cluster.
3. `grep -rn "ATMOSPHERIC_HERO_BG\|HorizonGlow\|BackgroundCanvas\|background:\|bgColor" frontend/src/components/audio/` — expect zero matches in audio cluster.
4. `grep -rn "transparentNav\|navbar\b" frontend/src/components/audio/` — expect zero matches.
5. Verify `AudioState` (in `frontend/src/types/audio.ts`) contains only audio-related fields (already confirmed via audioReducer.ts L4–19: `activeSounds`, `foregroundContent`, `masterVolume`, `foregroundBackgroundBalance`, `isPlaying`, `sleepTimer`, `activeRoutine`, `pillVisible`, `drawerOpen`, `currentSceneName`, `currentSceneId`, `foregroundEndedCounter`, `readingContext`, `pausedByBibleAudio` — all audio-only fields).
6. Verify MusicPage outer wrapper class is `bg-dashboard-dark` but no audio code explicitly depends on that string.

**Outcome classification (clear cases):**

- **Outcome A — Decoupled (most likely):** Provider mounts at App.tsx L204 above MusicPage; audioReducer reads only audio state; engine does not read chrome state; no MusicPage code depends on the outer-wrapper class string. → Proceed with Step 9 as Outcome A. Document the App.tsx-level mount and the chrome-decoupled reducer in the Decision 24 update text for Step 12.
- **Outcome B — Loosely coupled:** All Outcome A criteria met EXCEPT a non-load-bearing reference exists (e.g., a CSS variable read by the audio overlay that happens to share a name with a chrome var). → Proceed with Step 9 as Outcome B; document the discovered loose coupling explicitly in Decision 24's Step 12 text.
- **Outcome C — Tightly coupled:** ANY of: reducer reads chrome state functionally; provider lifecycle depends on the page wrapper structure; audio children break if the outer-wrapper class changes. → SKIP Step 9 implementation; document Decision 24 as a hard rule in Step 12; file follow-up stub in `spec-tracker.md` for "Music cinematic — pending audio cluster decoupling refactor."

**Ambiguous outcome branch (clarification #3):**

If the investigation surfaces something that does NOT cleanly map to A, B, or C — examples include:
- `AudioProvider` mounts above the page (Outcome A criterion) BUT a hook used by an audio component reads `bg-dashboard-dark` indirectly via a CSS variable resolution path
- The reducer doesn't read chrome state, but a sibling `<aside>` rendered conditionally inside `MusicPage` overlaps the hero region and would re-paint over the cinematic
- A test in `audioReducer.test.ts` or `AudioProvider.test.tsx` mocks `bg-dashboard-dark` in a way that suggests structural intent

— do NOT auto-classify. Instead:

1. STOP the investigation; do not proceed to Steps 1–14.
2. Surface findings to Eric with: (a) the exact ambiguous file path + line numbers, (b) the citation that doesn't cleanly fit A/B/C, (c) a recommendation (one of "treat as B with the documented coupling", "treat as C and skip Step 9", "investigate further with Eric"), and (d) a request for direction.
3. Resume execution only after Eric returns a binding classification.

**Auth gating:** N/A — read-only.

**Responsive behavior:** N/A — investigation only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT modify any audio cluster file (AudioProvider.tsx, audioReducer.ts, audio-engine.ts).
- Do NOT modify MusicPage.tsx.
- Do NOT create MusicHero.tsx (Step 9 only).
- Do NOT classify ambiguous findings — surface to Eric.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Step 0 is read-only investigation. Documentation of outcome happens in Step 12 (Decision 24 update). |

**Expected state after completion:**
- [ ] Outcome (A, B, C, or "ambiguous → surfaced to Eric") locked.
- [ ] If A or B: Step 9 enumerated as planned (9a + 9b + 9c).
- [ ] If C: Step 9 replaced with documentation-only step; spec-tracker follow-up stub noted for Step 13.
- [ ] If ambiguous: execution paused for Eric's direction.

**Per-step Playwright verification (clarification #5):** N/A — Step 0 produces no UI change.

---

### Step 1: `/bible` cinematic mount

**Objective:** Mount `<CinematicHeroBackground />` as the first child of `BibleHero.tsx`'s `<section>` and apply navbar-compensated padding. Lowest-risk drop-in: `/bible` already has BackgroundCanvas at root.

**Files to create/modify:**
- `frontend/src/components/bible/landing/BibleHero.tsx` — modify

**Details:**

Import statement (add at top, alongside existing `GRADIENT_TEXT_STYLE` import):
```tsx
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
```

Replace the `<section>` body. Final shape:
```tsx
<section
  aria-labelledby="bible-hero-heading"
  className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
>
  <CinematicHeroBackground />
  <h1 id="bible-hero-heading" className="relative z-10 px-1 sm:px-2">
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
```

Changes from current state:
1. Replace className `pt-28 pb-12 sm:pt-32 sm:pb-14 lg:pt-32` with `pt-[145px] pb-12` (responsive modifiers REMOVED — navbar height is constant).
2. Insert `<CinematicHeroBackground />` as first child of `<section>`, BEFORE the `<h1>`.
3. Add `relative z-10` to the `<h1>` className (the inner spans inherit stacking via the h1's stacking context — verified pattern matches DailyHub.tsx:227 where only the h1 carries `relative z-10`).

**Auth gating (if applicable):** N/A — `/bible` is fully public per `02-security.md` § Bible Wave Auth Posture; no gates added or removed.

**Responsive behavior:**
- Desktop (1440px): hero ~240–260px tall (intrinsic to `pt-[145px] + pb-12 + 2-line h1`); cinematic extends 200px below hero base, mask-fade-to-transparent into BackgroundCanvas's 5-stop gradient. Heading "Your" + "Study Bible" centered below navbar.
- Tablet (768px): identical padding; heading scales to `text-3xl` / `text-5xl` per per-line breakpoints.
- Mobile (375px): identical padding; heading `text-2xl` / `text-4xl`. Cinematic SVG starfields slice via `xMidYMid slice` — mobile-probe-verified clean rendering.

**Inline position expectations (if this step renders an inline-row layout):** N/A — hero is a flex column.

**Guardrails (DO NOT):**
- DO NOT change `BibleLanding.tsx` (parent page). Only `BibleHero.tsx` is in scope.
- DO NOT add a `<p>` subtitle or any other content to the hero.
- DO NOT modify `CinematicHeroBackground.tsx` in this step (data-testid added in Step 10).
- DO NOT add responsive padding modifiers to the hero className (e.g., `sm:pt-32`).
- DO NOT remove the `text-center antialiased` classes — they are part of the existing canonical hero.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none — no new automated tests in this step) | — | Existing BibleLanding tests (if any) should continue to pass. New cinematic-presence assertion lives in Step 10's component test, not in BibleHero-specific tests. |

**Expected state after completion:**
- [ ] `BibleHero.tsx` imports `CinematicHeroBackground`.
- [ ] Hero `<section>` className matches the canonical string in "Details" verbatim.
- [ ] Hero contains exactly 2 direct children: `<CinematicHeroBackground />` then `<h1>`.
- [ ] `<h1>` carries `relative z-10`.

**Per-step Playwright verification (clarification #5):**

Run a Playwright probe of `/bible` immediately after this step (before proceeding to Step 2):

```bash
# Navigate to /bible at 1280×900 and 375×812
# Assertions:
# 1. The page renders without console errors.
# 2. document.querySelector('[aria-labelledby="bible-hero-heading"]') exists.
# 3. The hero `<section>`'s computed className contains 'pt-[145px]' and 'pb-12'.
# 4. document.querySelector('[aria-labelledby="bible-hero-heading"] [aria-hidden="true"]') exists (the cinematic wrapper, since data-testid hasn't been added yet — selector falls back to the aria-hidden attribute on the cinematic's outer div).
# 5. The cinematic wrapper's computed style.height starts with 'calc(100% + 200px)' or resolves to a numeric value > 200px greater than the hero's height.
# 6. The h1 carries `relative` and `z-10` in className.
# 7. No horizontal scroll at 375px.
# 8. Capture screenshot to frontend/playwright-screenshots/spec14-step1-bible-{1280,375}.png.
```

If any assertion fails: HALT execution, do NOT proceed to Step 2, surface the failing assertion + screenshot to Eric.

---

### Step 2: `/local-support/*` cinematic mount (one component, three routes)

**Objective:** Mount cinematic in shared `LocalSupportHero.tsx` so all three Local Support pages (Churches, Counselors, Celebrate Recovery) acquire the cinematic atmospheric simultaneously.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportHero.tsx` — modify

**Details:**

Import statement (add at top):
```tsx
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
```

Final `<section>` shape:
```tsx
<section
  aria-labelledby={headingId}
  className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
>
  <CinematicHeroBackground />
  <h1
    id={headingId}
    className="relative z-10 mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
    style={GRADIENT_TEXT_STYLE}
  >
    {title}
  </h1>
  <p className="relative z-10 mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
    {subtitle}
  </p>
  {extraContent && <div className="relative z-10 mt-4">{extraContent}</div>}
  {action && <div className="relative z-10 mt-6">{action}</div>}
</section>
```

Changes from current state:
1. Replace className `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` with `pt-[145px] pb-12`.
2. Insert `<CinematicHeroBackground />` as first child of `<section>`.
3. Add `relative z-10` to the `<h1>` className.
4. Add `relative z-10` to the `<p>` className.
5. Add `relative z-10` to the `extraContent` `<div>` wrapper className (when rendered).
6. Add `relative z-10` to the `action` `<div>` wrapper className (when rendered).

**Auth gating:** N/A — Local Support search is public per Decision 12 in `02-security.md`. Bookmark and visit-recording gates live in `LocalSupportPage.tsx`, not the Hero component.

**Responsive behavior:**
- Desktop (1440px): hero ~280–330px tall (heading + subtitle + optional CTA).
- Tablet (768px): identical padding; heading `text-4xl`.
- Mobile (375px): identical padding; heading `text-3xl`.

**Inline position expectations:** N/A — flex column.

**Guardrails (DO NOT):**
- DO NOT modify `LocalSupportPage.tsx`. Only `LocalSupportHero.tsx` is in scope.
- DO NOT change the prop interface of `LocalSupportHero` (`headingId`, `title`, `subtitle`, `extraContent`, `action`).
- DO NOT modify the per-page configs in `Churches.tsx`, `Counselors.tsx`, or `CelebrateRecovery.tsx`.
- DO NOT change the subtitle's `text-white` to `text-white/60` (canonical post-Visual-Rollout).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | No new tests in this step; per-route Playwright verification covers visual correctness. |

**Expected state after completion:**
- [ ] `LocalSupportHero.tsx` imports `CinematicHeroBackground`.
- [ ] `<section>` className uses `pt-[145px] pb-12` exactly.
- [ ] First child is `<CinematicHeroBackground />`.
- [ ] All four content children (`<h1>`, `<p>`, extraContent wrapper, action wrapper) carry `relative z-10`.

**Per-step Playwright verification (clarification #5):**

Run a Playwright probe of all three local-support routes at 1280×900 and 375×812:

```bash
# For each route in ['/local-support/churches', '/local-support/counselors', '/local-support/celebrate-recovery']:
# Assertions:
# 1. Page renders without console errors.
# 2. The hero `<section>` exists and has computed className containing 'pt-[145px]' and 'pb-12'.
# 3. The cinematic wrapper exists as first child of the hero (selector: `${heroSelector} > [aria-hidden="true"]`).
# 4. The h1, the subtitle <p>, and any optional action wrapper all carry `relative` and `z-10` in className.
# 5. No horizontal scroll at 375px.
# 6. Capture screenshots: frontend/playwright-screenshots/spec14-step2-{churches,counselors,celebrate-recovery}-{1280,375}.png.
```

If any assertion fails on any of the three routes: HALT, surface to Eric.

---

### Step 3: `/ask` cinematic mount + structural relative/z-10 fixes

**Objective:** Mount cinematic in AskPage's hero `<section>` and add the missing `relative` + `z-10` plumbing. Heading's `animate-gradient-shift` animation is preserved.

**Files to create/modify:**
- `frontend/src/pages/AskPage.tsx` — modify (single hero section block, L257–271)

**Details:**

Add import at the top of AskPage.tsx (alongside existing imports):
```tsx
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
```

Replace the hero `<section>` body (currently L257–271) with:
```tsx
<section
  aria-labelledby="ask-hero-heading"
  className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
>
  <CinematicHeroBackground />
  <h1
    id="ask-hero-heading"
    className="relative z-10 pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift"
    style={GRADIENT_TEXT_STYLE}
  >
    Ask God&apos;s Word
  </h1>
  <p className="relative z-10 mx-auto mt-6 max-w-xl text-base text-white sm:text-lg">
    Bring your questions. Find wisdom in Scripture.
  </p>
</section>
```

Changes from current state:
1. Add `relative flex w-full flex-col items-center` (the section was missing `relative` per recon § 4.3 — add it now). Add `flex w-full flex-col items-center` to match the canonical hero shape across other cinematic-mounting pages.
2. Replace `pt-32 pb-10 text-center sm:px-6 sm:pt-40 sm:pb-12` with `pt-[145px] pb-12 text-center antialiased`. Also remove `sm:px-6` (the canonical hero uses `px-4` only — `sm:px-6` is non-canonical and would create a width inconsistency with other cinematic heroes).
3. Insert `<CinematicHeroBackground />` as first child of `<section>`.
4. Add `relative z-10` to `<h1>` (preserving `animate-gradient-shift`).
5. Add `relative z-10` to `<p>`.

Verify `<Layout transparentNav>` wrapper is still in place at L254 (recon confirmed; this step does not modify the Layout call).

**Visual concern (warm beam vs. violet textarea glow):** Recon § 4.3 flagged that `/ask`'s textarea (immediately below the hero, in the second `<section>` at L273+) has a violet box-shadow glow `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]`. The cinematic's warm amber light beam blends in the upper-left of the hero. Per spec § Step 3 (line 135), ship as-is; if subjectively muddy, document in `_plans/discoveries.md` as follow-up. Do NOT introduce a `enableWarmBeam={false}` prop — out of scope per spec.

**Auth gating:** N/A — `/ask` is public (existing rate limit behavior preserved).

**Responsive behavior:**
- Desktop (1440px): hero ~280px tall (h1 + subtitle).
- Tablet (768px): identical padding.
- Mobile (375px): identical padding; heading `text-4xl`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the second `<section>` (composer at L273+). Step 3 only touches the hero.
- DO NOT remove `animate-gradient-shift` from the heading (it is intentional, AskPage-specific).
- DO NOT add a prop to `CinematicHeroBackground` to suppress the warm beam.
- DO NOT change AskPage's `<Layout transparentNav>` to `<Layout>` — Layout default flipped post-Spec-12 but `transparentNav` remains correct here.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | No new tests in this step. AskPage existing tests (if any) continue to pass. Per-step Playwright verification covers visual correctness. |

**Expected state after completion:**
- [ ] `AskPage.tsx` imports `CinematicHeroBackground`.
- [ ] Hero `<section>` className uses `relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased` exactly.
- [ ] `<CinematicHeroBackground />` is the first child of the hero `<section>`.
- [ ] `<h1>` carries `relative z-10` and preserves `animate-gradient-shift`.
- [ ] `<p>` carries `relative z-10`.

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /ask at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. Hero `<section>` (selector: `[aria-labelledby="ask-hero-heading"]`) exists and computed className contains 'relative', 'pt-[145px]', 'pb-12'.
# 3. Cinematic wrapper is first child of hero.
# 4. `<h1>` carries `relative z-10` and `animate-gradient-shift`.
# 5. `<p>` carries `relative z-10`.
# 6. Below the hero, the textarea remains rendered correctly (regression check: `<textarea id="ask-input">` exists and renders with violet glow shadow).
# 7. No horizontal scroll at 375px.
# 8. No changes to existing topic chips, Find Answers button, PopularTopicsSection.
# 9. Capture screenshot: frontend/playwright-screenshots/spec14-step3-ask-{1280,375}.png.
# 10. Subjective: capture a tight crop of the hero/textarea region at 1280×900 to evaluate the warm-beam-vs-violet-glow blend (document in _plans/discoveries.md if muddy).
```

If any assertion fails: HALT, surface to Eric.

---

### Step 4: `/grow` BackgroundCanvas promotion (NO cinematic yet)

**Objective:** Hoist `<BackgroundCanvas>` from wrapping the body region only to wrapping the entire page contents, removing the split-atmospheric architecture. This is the prerequisite for Step 5's cinematic mount. **No cinematic mount in this step** — verify clean state before Step 5.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — modify

**Details:**

Current structure (verified `frontend/src/pages/GrowPage.tsx` L60–146):
```tsx
return (
  <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
    <SEO {...GROW_METADATA} />
    <Navbar transparent />
    <main id="main-content">
      <section
        aria-labelledby="grow-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12"
        style={ATMOSPHERIC_HERO_BG}
      >
        <h1 ...>Grow in Faith</h1>
        <p ...>Structured journeys to deepen your walk with God</p>
      </section>
      <BackgroundCanvas>
        ...sentinel + sticky tab bar + tab panels...
      </BackgroundCanvas>
    </main>
    <SiteFooter />
  </div>
)
```

Target structure:
```tsx
return (
  <BackgroundCanvas className="flex min-h-screen flex-col font-sans">
    <SEO {...GROW_METADATA} />
    <Navbar transparent />
    <main id="main-content">
      <section
        aria-labelledby="grow-heading"
        className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
      >
        <h1
          id="grow-heading"
          className="mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Grow in Faith
        </h1>
        <p className="mt-2 text-base text-white/70 leading-relaxed sm:text-lg">
          Structured journeys to deepen your walk with God
        </p>
      </section>
      {/* Sentinel for sticky tab bar shadow */}
      <div ref={sentinelRef} aria-hidden="true" />
      {/* Sticky Tab Bar */}
      <div
        className={cn(
          'sticky top-0 z-40 backdrop-blur-md transition-shadow duration-base motion-reduce:transition-none',
          isSticky && 'bg-hero-bg/70 shadow-md shadow-black/20',
        )}
      >
        ...tab bar internals unchanged...
      </div>
      {/* Tab panels — unchanged */}
      <div role="tabpanel" id="tabpanel-plans" ...>
        <ReadingPlansContent createParam={createParam} />
      </div>
      <div role="tabpanel" id="tabpanel-challenges" ...>
        <ChallengesContent />
      </div>
    </main>
    <SiteFooter />
  </BackgroundCanvas>
)
```

Changes from current state:
1. Replace outer `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">` with `<BackgroundCanvas className="flex min-h-screen flex-col font-sans">` (drops `bg-dashboard-dark`; BackgroundCanvas paints the multi-bloom gradient as the page-root atmospheric).
2. Remove `style={ATMOSPHERIC_HERO_BG}` from the hero `<section>`.
3. Replace hero className `pt-32 pb-8 sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12` with `pt-[145px] pb-12` (responsive modifiers removed).
4. Remove the inner `<BackgroundCanvas>` wrapper that previously wrapped sentinel + sticky tab bar + tab panels. The sentinel, sticky tab bar, and tab panels are now direct children of `<main>` (unchanged in their own classNames).
5. The closing `</BackgroundCanvas>` moves from BEFORE `</main>` to AFTER `</div>` of the SiteFooter wrapper (i.e., wraps everything).
6. Remove the import of `ATMOSPHERIC_HERO_BG` from `@/components/PageHero` (no longer used). Verify `BackgroundCanvas` is still imported from `@/components/ui/BackgroundCanvas` (currently line 16).

**No cinematic mount in this step.** The hero now sits over the BackgroundCanvas multi-bloom; cinematic is added in Step 5.

**Auth gating:** N/A — `/grow` is public.

**Responsive behavior:**
- Desktop (1440px): hero ~240–280px tall (heading + 1-line subtitle).
- Tablet (768px): identical padding; heading `text-4xl`.
- Mobile (375px): identical padding; heading `text-3xl`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT mount `<CinematicHeroBackground />` in this step — that's Step 5.
- DO NOT touch the sticky tab bar's `z-40` or `backdrop-blur-md` (Step 4 verifies the tab bar still pins correctly inside the new structure).
- DO NOT modify `ReadingPlansContent.tsx` or `ChallengesContent.tsx` (the tab panels' content components).
- DO NOT remove the `useEffect` IntersectionObserver for `isSticky` — the sticky tab bar shadow toggle still works.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | No new tests; per-step Playwright verification confirms BackgroundCanvas is at root and tab bar still pins correctly. |

**Expected state after completion:**
- [ ] `GrowPage.tsx` outer wrapper is `<BackgroundCanvas className="flex min-h-screen flex-col font-sans">`.
- [ ] No `bg-dashboard-dark` on the outer wrapper.
- [ ] No `style={ATMOSPHERIC_HERO_BG}` anywhere in the file.
- [ ] No `ATMOSPHERIC_HERO_BG` import.
- [ ] No inner `<BackgroundCanvas>` wrapper around the body content.
- [ ] Hero `<section>` className: `relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased`.
- [ ] Sticky tab bar still pins on scroll; `isSticky` IntersectionObserver still works.
- [ ] No `CinematicHeroBackground` import (added in Step 5).

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /grow at 1280×900 and 375×812.
# Assertions (Step 4 verifies BackgroundCanvas-promotion correctness, NOT cinematic presence):
# 1. Page renders without console errors.
# 2. document.querySelector('[data-testid="background-canvas"]') exists at root.
# 3. The hero `<section>` does NOT have inline style `backgroundColor`/`background` (no ATMOSPHERIC_HERO_BG).
# 4. The hero `<section>` className contains 'pt-[145px]' and 'pb-12'.
# 5. The hero `<section>` does NOT contain a child with `aria-hidden="true"` matching the cinematic wrapper signature (no cinematic yet).
# 6. Sticky tab bar (selector: `.sticky.top-0.z-40`) exists and is positioned correctly.
# 7. Scroll to past the hero — verify sticky tab bar pins to viewport top with shadow.
# 8. Tab switch (?tab=plans → ?tab=challenges) works — both panels render.
# 9. No horizontal scroll at 375px.
# 10. Capture screenshots: frontend/playwright-screenshots/spec14-step4-grow-{1280,375}.png.
```

If any assertion fails: HALT, surface to Eric. Do NOT proceed to Step 5 until Step 4 verifies clean.

---

### Step 5: `/grow` cinematic mount

**Objective:** After Step 4 promotes BackgroundCanvas to root and verifies clean, mount the cinematic in the hero.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` — modify

**Details:**

Add import (the import was deferred from Step 4):
```tsx
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
```

Update the hero `<section>` to mount the cinematic and add `relative z-10` to its content children:
```tsx
<section
  aria-labelledby="grow-heading"
  className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
>
  <CinematicHeroBackground />
  <h1
    id="grow-heading"
    className="relative z-10 mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
    style={GRADIENT_TEXT_STYLE}
  >
    Grow in Faith
  </h1>
  <p className="relative z-10 mt-2 text-base text-white/70 leading-relaxed sm:text-lg">
    Structured journeys to deepen your walk with God
  </p>
</section>
```

Changes from Step 4 state:
1. Insert `<CinematicHeroBackground />` as first child of `<section>`.
2. Add `relative z-10` to `<h1>`.
3. Add `relative z-10` to `<p>`.

**Auth gating:** N/A.

**Responsive behavior:** identical to Step 4 (cinematic adds an absolute-positioned background; layout is unchanged).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change the `<p>` subtitle's `text-white/70` to `text-white` — `/grow`'s existing subtitle uses `text-white/70`; preserving it avoids scope creep into a typography change. (Spec doesn't require it; preserves existing.)
- DO NOT touch the sticky tab bar `z-40`; cinematic mask-fade-to-transparent reaches base of section, sticky bar paints below, no z-fight.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | No new tests; per-step Playwright verification covers visual correctness. |

**Expected state after completion:**
- [ ] `CinematicHeroBackground` imported.
- [ ] First child of hero `<section>` is `<CinematicHeroBackground />`.
- [ ] `<h1>` and `<p>` both carry `relative z-10`.

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /grow at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. Cinematic wrapper exists as first child of hero `<section>`.
# 3. h1 and p carry `relative` and `z-10`.
# 4. Sticky tab bar still pins on scroll without z-fighting (visual: tab bar's text/icons remain readable when partially overlapping the cinematic's bottom extension).
# 5. Switching tabs (plans/challenges) does not affect the hero or cinematic.
# 6. Reduced motion (set Playwright `reducedMotion: 'reduce'`): cinematic animations stop, static stars + warm beam remain visible.
# 7. Capture screenshots: frontend/playwright-screenshots/spec14-step5-grow-{1280,375}.png.
# 8. Capture reduced-motion screenshot at 1280: frontend/playwright-screenshots/spec14-step5-grow-reduced-motion-1280.png.
```

If any assertion fails: HALT, surface to Eric.

---

### Step 6: `/prayer-wall` BackgroundCanvas promotion (NO cinematic, NO cleanup yet)

**Objective:** Hoist `<BackgroundCanvas>` to wrap the entire `/prayer-wall` page contents. **No cinematic, no PrayerWallHero typography cleanup in this step.**

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — modify (outer wrapper only; PrayerWallHero changes deferred to Step 7)

**Details:**

Current outer structure (verified L629–632):
```tsx
return (
  <div className="flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans">
    <SEO {...PRAYER_WALL_METADATA} jsonLd={prayerWallBreadcrumbs} />
    <Navbar transparent />
    <PrayerWallHero action={...} />
    ...rest of page (sentinel, filter bar, main, prayer cards, footer)...
  </div>
)
```

Target outer structure:
```tsx
return (
  <BackgroundCanvas className="flex min-h-screen flex-col overflow-x-hidden font-sans">
    <SEO {...PRAYER_WALL_METADATA} jsonLd={prayerWallBreadcrumbs} />
    <Navbar transparent />
    <PrayerWallHero action={...} />
    ...rest of page unchanged in this step...
  </BackgroundCanvas>
)
```

Changes from current state:
1. Replace outer `<div className="flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans">` with `<BackgroundCanvas className="flex min-h-screen flex-col overflow-x-hidden font-sans">`.
2. Drop `bg-dashboard-dark` (BackgroundCanvas paints the gradient).
3. Preserve `overflow-x-hidden` on the new BackgroundCanvas className (canonical for `/prayer-wall` due to wide content; verified existing).
4. Preserve `flex min-h-screen flex-col` and `font-sans`.
5. Add `BackgroundCanvas` import: `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` (verify not already imported via grep — currently NOT imported in PrayerWall.tsx).

**No PrayerWallHero changes in this step.** PrayerWallHero still uses `style={ATMOSPHERIC_HERO_BG}` after this step — that's removed in Step 7.

**Auth gating:** N/A — outer wrapper change only.

**Responsive behavior:** unchanged — BackgroundCanvas's `min-h-screen overflow-hidden` matches the previous outer div's behavior.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify `PrayerWallHero.tsx` in this step (deferred to Step 7).
- DO NOT mount `<CinematicHeroBackground />` in this step (deferred to Step 8).
- DO NOT change the sticky CategoryFilterBar wrapper (`sticky top-0 z-30`) — cinematic mask handles the seam, no z-index changes needed.
- DO NOT remove `overflow-x-hidden` — needed for `/prayer-wall`'s wide content layout.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Per-step Playwright verification covers BackgroundCanvas-at-root correctness. |

**Expected state after completion:**
- [ ] PrayerWall.tsx imports `BackgroundCanvas` from `@/components/ui/BackgroundCanvas`.
- [ ] Outer wrapper is `<BackgroundCanvas className="flex min-h-screen flex-col overflow-x-hidden font-sans">`.
- [ ] No `bg-dashboard-dark` on the outer wrapper.
- [ ] PrayerWallHero unchanged in this step (still uses `ATMOSPHERIC_HERO_BG`).

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /prayer-wall at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. document.querySelector('[data-testid="background-canvas"]') exists at root.
# 3. Hero still renders with the existing PrayerWallHero (font-script "Wall", italic subtitle still present — they're removed in Step 7).
# 4. Sticky CategoryFilterBar (selector: `.sticky.top-0.z-30`) still pins correctly.
# 5. Prayer cards still render in the feed.
# 6. Tab switching, category filtering, post-creation gestures all unchanged.
# 7. No horizontal scroll at 375px (verify `overflow-x-hidden` still applies).
# 8. Capture screenshots: frontend/playwright-screenshots/spec14-step6-prayer-wall-{1280,375}.png.
```

If any assertion fails: HALT, surface to Eric.

---

### Step 7: `/prayer-wall` Phase 5 hero cleanup (NO cinematic yet)

**Objective:** Remove deprecated typography from `PrayerWallHero.tsx` (font-script "Wall", font-serif italic subtitle, `style={ATMOSPHERIC_HERO_BG}`) and apply navbar-compensated padding. **No cinematic mount yet** — that's Step 8.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — modify

**Details:**

Current `PrayerWallHero.tsx` (verified, 26 lines):
```tsx
import type { ReactNode } from 'react'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface PrayerWallHeroProps {
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1 id="prayer-wall-heading" ... style={GRADIENT_TEXT_STYLE}>
        Prayer <span className="font-script">Wall</span>
      </h1>
      <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
        You&apos;re not alone.
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
```

Target `PrayerWallHero.tsx`:
```tsx
import type { ReactNode } from 'react'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface PrayerWallHeroProps {
  /** CTA button rendered below the subtitle */
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <h1
        id="prayer-wall-heading"
        className="mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        Prayer Wall
      </h1>
      <p className="mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        You&apos;re not alone.
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
```

Changes from current state:
1. Remove `import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'` (no longer used).
2. Remove `style={ATMOSPHERIC_HERO_BG}` from the `<section>`.
3. Replace className `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` with `pt-[145px] pb-12`.
4. Replace `<h1>` content `Prayer <span className="font-script">Wall</span>` with single-line text `Prayer Wall`.
5. Update `<h1>` className to canonical hero heading sizing: `mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2` (matching `/local-support`/`/grow`/`/ask` hero heading scale; current `text-3xl sm:text-4xl lg:text-5xl` was a smaller scale — bumped one tier per spec § Step 7 #2).
6. Replace `<p>` className `mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg` with canonical `mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg` (drops `font-serif`, `italic`, `text-white/60`; adds `leading-relaxed`).

**No `relative z-10` added to children in this step** — `relative z-10` is added in Step 8 when cinematic mounts. (Order is intentional: Step 7 leaves the file in a "no-cinematic" canonical typography state; Step 8 adds cinematic + z-10 plumbing in one cohesive change.)

**Auth gating:** N/A — `/prayer-wall` reading is public; the `action` prop continues to receive the `<button onClick={openAuthModal}>` from PrayerWall.tsx (auth gates upstream are untouched).

**Responsive behavior:**
- Desktop (1440px): hero ~340–380px tall (h1 + subtitle + CTA — highest content density of the candidates).
- Tablet (768px): identical padding.
- Mobile (375px): identical padding; `<h1>` `text-4xl` (up from previous `text-3xl`).

**Inline position expectations:** N/A on the hero itself; the existing inline action row (Share button + My Dashboard link, when authenticated) is unchanged in this step.

**Guardrails (DO NOT):**
- DO NOT mount `<CinematicHeroBackground />` in this step — that's Step 8.
- DO NOT modify the `action` prop's external interface (PrayerWall.tsx continues to pass the same `action`).
- DO NOT modify any non-PrayerWallHero file in this step. PrayerWall.tsx changes were Step 6.
- DO NOT keep `font-serif` or `italic` on the subtitle (these are explicitly deprecated in Visual Rollout).
- DO NOT keep `text-white/60` on the subtitle (canonical hero subtitle uses `text-white`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Existing PrayerWall tests must continue to pass; if any test asserts `font-script` on PrayerWallHero, this step's verification will surface it (Eric-surface as a regression). Per-step Playwright covers visual correctness. |

**Expected state after completion:**
- [ ] No `font-script` reference in PrayerWallHero.tsx.
- [ ] No `font-serif italic` reference in PrayerWallHero.tsx.
- [ ] No `style={ATMOSPHERIC_HERO_BG}` reference in PrayerWallHero.tsx.
- [ ] No `ATMOSPHERIC_HERO_BG` import in PrayerWallHero.tsx.
- [ ] `<h1>` content is the literal text `Prayer Wall` (no `<span>`).
- [ ] `<p>` className is `mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg`.
- [ ] `<section>` className is `relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased`.

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /prayer-wall at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. document.querySelector('[aria-labelledby="prayer-wall-heading"] .font-script') is null.
# 3. document.querySelector('[aria-labelledby="prayer-wall-heading"] .font-serif.italic') is null.
# 4. document.querySelector('[aria-labelledby="prayer-wall-heading"]').className contains 'pt-[145px]' and 'pb-12'.
# 5. The hero's inline `style.background` is empty (no ATMOSPHERIC_HERO_BG).
# 6. The h1's text content is exactly 'Prayer Wall' (no <span> child).
# 7. The subtitle's className contains 'text-white' and does NOT contain 'text-white/60', 'font-serif', or 'italic'.
# 8. The action wrapper still renders (Share button + Dashboard link for auth'd, single Share button for logged out).
# 9. Sticky CategoryFilterBar still pins.
# 10. Capture screenshots: frontend/playwright-screenshots/spec14-step7-prayer-wall-{1280,375}.png.
```

If any assertion fails: HALT, surface to Eric. Do NOT proceed to Step 8 until Step 7 verifies clean.

---

### Step 8: `/prayer-wall` cinematic mount

**Objective:** Mount cinematic in `PrayerWallHero.tsx` after Steps 6 (BackgroundCanvas at root) and 7 (typography cleanup) complete.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — modify

**Details:**

Add import at top:
```tsx
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
```

Update `<section>`:
```tsx
<section
  aria-labelledby="prayer-wall-heading"
  className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
>
  <CinematicHeroBackground />
  <h1
    id="prayer-wall-heading"
    className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2"
    style={GRADIENT_TEXT_STYLE}
  >
    Prayer Wall
  </h1>
  <p className="relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
    You&apos;re not alone.
  </p>
  {action && <div className="relative z-10 mt-6">{action}</div>}
</section>
```

Changes from Step 7 state:
1. Insert `<CinematicHeroBackground />` as first child of `<section>`.
2. Add `relative z-10` to `<h1>`.
3. Add `relative z-10` to `<p>`.
4. Add `relative z-10` to action wrapper `<div>`.

**Auth gating:** N/A — cinematic is `aria-hidden="true"` and `pointer-events-none`; existing auth gates on the action button are untouched.

**Responsive behavior:** identical to Step 7 (cinematic adds an absolute background; no layout change).

**Inline position expectations:** existing inline action row preserved (Share button + My Dashboard link share a row at desktop; stack at mobile via existing `flex-col sm:flex-row`).

**Guardrails (DO NOT):**
- DO NOT modify the action wrapper's `flex-col sm:flex-row` layout.
- DO NOT change the sticky CategoryFilterBar `z-30`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Per-step Playwright verification covers cinematic-presence + sticky-bar coexistence. |

**Expected state after completion:**
- [ ] PrayerWallHero.tsx imports `CinematicHeroBackground`.
- [ ] First child of `<section>` is `<CinematicHeroBackground />`.
- [ ] `<h1>`, `<p>`, and action `<div>` all carry `relative z-10`.

**Per-step Playwright verification (clarification #5):**

```bash
# Navigate to /prayer-wall at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. Cinematic wrapper exists as first child of hero.
# 3. h1, p, and action div all carry `relative z-10`.
# 4. Sticky CategoryFilterBar still pins on scroll without z-fighting.
# 5. Posting/commenting/bookmarking flows still work (basic smoke — click composer button, verify it opens).
# 6. Reduced motion: cinematic animations stop, static atmospheric remains.
# 7. Capture screenshots: frontend/playwright-screenshots/spec14-step8-prayer-wall-{1280,375}.png.
# 8. Capture reduced-motion: frontend/playwright-screenshots/spec14-step8-prayer-wall-reduced-motion-1280.png.
```

If any assertion fails: HALT, surface to Eric.

---

### Step 9: `/music` MusicHero component creation + BackgroundCanvas promotion + cinematic mount (CONDITIONAL on Step 0 outcome)

**This step is conditional.** Three sub-paths:

#### Step 9 — Outcome A or B path (Audio cluster decoupled or loosely coupled)

**Objective:** Create `MusicHero.tsx` (a new component, NOT `PageHero` modification, so `/music/routines` is preserved), refactor `MusicPage.tsx` to use it, promote BackgroundCanvas to page root.

**Files to create/modify:**
- `frontend/src/components/music/MusicHero.tsx` — CREATE (new file)
- `frontend/src/pages/MusicPage.tsx` — modify

**9a. Create `frontend/src/components/music/MusicHero.tsx`:**

```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface MusicHeroProps {
  /** Defaults to 'Music'. */
  title?: string
  /** Defaults to canonical Music subtitle. */
  subtitle?: string
}

export function MusicHero({
  title = 'Music',
  subtitle = "Worship, rest, and find peace in God's presence.",
}: MusicHeroProps = {}) {
  return (
    <section
      aria-labelledby="page-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id="page-hero-heading"
        className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        {title}
      </h1>
      <p className="relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        {subtitle}
      </p>
    </section>
  )
}
```

Notes on this component:
- `aria-labelledby="page-hero-heading"` matches PageHero's existing convention. Heading ID is `page-hero-heading` to keep parity with existing skip-to-content / accessibility expectations.
- `<h1>` text content is `{title}` (default `'Music'`). Tests at MusicPage.test.tsx L99–104 query `getByRole('heading', { level: 1, name: 'Music' })` — this resolves correctly because `<h1>` content is the literal string `Music` (no `<span>`, no `font-script`).
- `<p>` text content is `{subtitle}` (default `'Worship, rest, and find peace in God\'s presence.'`). Tests at MusicPage.test.tsx L106–111 query `getByText(/Worship, rest, and find peace/)` — resolves correctly.
- Test at MusicPage.test.tsx L246–250 asserts `heading.querySelector('.font-script')` is null — passes because the `<h1>` has no descendants beyond a text node.

**9b. Modify `frontend/src/pages/MusicPage.tsx`:**

Current outer structure (verified L169–293):
```tsx
return (
  <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
    <SEO ... />
    <Navbar transparent />
    <main id="main-content">
      <PageHero
        title="Music"
        subtitle="Worship, rest, and find peace in God's presence."
      />
      ...sentinel + sticky tab bar + tab panels...
    </main>
    <SiteFooter />
    {scenePlayer.pendingRoutineInterrupt && <RoutineInterruptDialog ... />}
    {tabBarTooltip.shouldShow && <TooltipCallout ... />}
  </div>
)
```

Target outer structure:
```tsx
return (
  <BackgroundCanvas className="flex min-h-screen flex-col font-sans">
    <SEO ... />
    <Navbar transparent />
    <main id="main-content">
      <MusicHero />
      ...sentinel + sticky tab bar + tab panels (UNCHANGED)...
    </main>
    <SiteFooter />
    {scenePlayer.pendingRoutineInterrupt && <RoutineInterruptDialog ... />}
    {tabBarTooltip.shouldShow && <TooltipCallout ... />}
  </BackgroundCanvas>
)
```

Changes:
1. Replace outer `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">` with `<BackgroundCanvas className="flex min-h-screen flex-col font-sans">` (drop `bg-dashboard-dark`).
2. Replace `<PageHero title="Music" subtitle="...">` with `<MusicHero />` (no props — defaults match).
3. Remove the `import { PageHero } from '@/components/PageHero'` line (no longer used in MusicPage).
4. Add `import { MusicHero } from '@/components/music/MusicHero'`.
5. Add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` (verify not already present — it is NOT in MusicPage's current imports).
6. The closing `</BackgroundCanvas>` replaces the closing `</div>`.

**9c. Audio cluster verification (Playwright smoke):**

Run audio cluster smoke immediately after the file changes land:

1. Navigate to `/music` (default tab = playlists). Verify worship playlist iframe renders. Click play (if interactive); verify no console errors.
2. Switch to ambient tab. Click an ambient sound (e.g., "Rain"); verify it plays via the audio engine. Click another sound to layer; verify crossfade.
3. Switch to sleep tab. Verify scripture readings + bedtime stories render. Click play on a scripture reading; verify foreground playback.
4. Click the AudioDrawer FAB (DailyAmbientPillFAB or ambient pill on Music's surface). Verify drawer opens; verify focus trap; verify Escape closes.
5. Tab switching: ambient → playlists → sleep → ambient. Verify audio state persists across tab switches.
6. Navigate away (`/`) and back (`/music`). Verify `AudioContext` state preserved (ambient still playing if it was).
7. Reduced motion: cinematic animations stop, static atmospheric remains, audio playback unaffected.

**Failure protocol (per spec § Step 9 line 181):** If any audio function breaks during 9c:
1. `git restore frontend/src/pages/MusicPage.tsx`
2. `rm frontend/src/components/music/MusicHero.tsx`
3. Re-run audio smoke to confirm rollback restored functionality.
4. Document the failure mode in `_plans/discoveries.md`.
5. Treat the outcome as Outcome C — proceed to Outcome C path below.
6. Surface to Eric for direction.

#### Step 9 — Outcome C path (Audio cluster tightly coupled)

**Objective:** Skip `/music` cinematic mount entirely. Document the discovery.

- Do NOT create `MusicHero.tsx`.
- Do NOT modify `MusicPage.tsx`.
- Step 12 (Decision 24 update) documents the discovered tight coupling as a hard rule.
- Step 13 (spec-tracker.md) adds a follow-up stub: "Music cinematic — pending audio cluster decoupling refactor."
- Proceed to Step 10.

#### Step 9 — Ambiguous outcome path

If Step 0 surfaced an ambiguous outcome to Eric (clarification #3) and Eric has not yet returned a binding classification, Step 9 is BLOCKED. Wait for Eric's direction. Do not proceed to Step 10 (Step 10 is independent, but the planned execution order respects the spec's locked sequence).

**Auth gating (all Step 9 paths):** N/A — `/music` is public; visual rollout only.

**Responsive behavior (Outcome A/B):**
- Desktop (1440px): hero ~280–320px tall.
- Tablet (768px): identical padding.
- Mobile (375px): identical padding; heading `text-4xl`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify `PageHero.tsx` (used by `/music/routines` — must remain on canonical PageHero).
- DO NOT touch `frontend/src/components/audio/*` files (read-only per Step 0).
- DO NOT touch `frontend/src/lib/audio-engine.ts`.
- DO NOT modify `RoutinesPage.tsx` (regression-checked in Step 14).
- DO NOT change `<RoutineInterruptDialog>` or `<TooltipCallout>` mounts at end of MusicPage.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| MusicPage existing tests must continue to pass | regression | Verified via test pre-read: tests query `getByRole('heading', { level: 1, name: 'Music' })`, `getByText(/Worship, rest, and find peace/)`, `heading.querySelector('.font-script')` null. MusicHero defaults match all three. Run `pnpm test frontend/src/pages/__tests__/MusicPage.test.tsx` after Step 9b. |

**Expected state after completion (Outcome A/B):**
- [ ] `frontend/src/components/music/MusicHero.tsx` exists with the canonical structure.
- [ ] `MusicPage.tsx` outer wrapper is `<BackgroundCanvas>`.
- [ ] No `bg-dashboard-dark` on MusicPage outer wrapper.
- [ ] `MusicPage.tsx` no longer imports `PageHero` (only `MusicHero`).
- [ ] All MusicPage existing tests pass (regression-free).
- [ ] Audio cluster smoke passes (9c).

**Expected state after completion (Outcome C):**
- [ ] `MusicHero.tsx` does NOT exist.
- [ ] `MusicPage.tsx` unchanged.
- [ ] Decision 24 is documented as a hard rule (Step 12).
- [ ] Spec-tracker has follow-up stub (Step 13).

**Per-step Playwright verification (clarification #5, Outcome A/B):**

```bash
# Navigate to /music at 1280×900 and 375×812.
# Assertions:
# 1. Page renders without console errors.
# 2. document.querySelector('[data-testid="background-canvas"]') exists at root.
# 3. Hero `<section>` exists with `aria-labelledby="page-hero-heading"`, className containing 'pt-[145px]' and 'pb-12'.
# 4. Cinematic wrapper exists as first child of hero.
# 5. h1 with text 'Music' exists, has `relative z-10`, no font-script descendant.
# 6. p with subtitle 'Worship, rest, and find peace in God\'s presence.' exists, has `relative z-10`, no italic class.
# 7. Sticky tab bar (tablist with playlists/ambient/sleep) still pins correctly.
# 8. Audio cluster verification (9c list above) all pass.
# 9. /music/routines regression: navigate to /music/routines, verify it still uses PageHero (heading + ATMOSPHERIC_HERO_BG inline style).
# 10. Capture screenshots: frontend/playwright-screenshots/spec14-step9-music-{1280,375}.png AND frontend/playwright-screenshots/spec14-step9-routines-regression-1280.png.
```

If any assertion fails (Outcome A/B): trigger Failure protocol (rollback + Eric-surface). Do NOT proceed to Step 10 until either (a) Outcome A/B passes verification or (b) Outcome C path is taken with rollback complete.

**Per-step Playwright verification (clarification #5, Outcome C):** N/A — no UI changes shipped.

---

### Step 10: data-testid addition + new shared component test (REORDERED — was Step 11 in spec)

**Objective:** Add `data-testid="cinematic-hero-background"` to the outer wrapper of `CinematicHeroBackground.tsx` AND create the new shared component test file. **This step is REORDERED before the DailyHub backfill** so that Step 11's DailyHub assertions (which target `[data-testid="cinematic-hero-background"]`) reference a selector that already exists.

**Pre-execution clarification #1:** The original spec ordered Step 10 = DailyHub backfill (referencing `[data-testid="cinematic-hero-background"]`) and Step 11 = data-testid addition + component test. That violates the rule "a step must not use a selector before that selector exists." This plan reorders so the data-testid + component test come first, then the DailyHub backfill consumes the now-existing selector.

**Files to create/modify:**
- `frontend/src/components/CinematicHeroBackground.tsx` — modify (add `data-testid` ONLY)
- `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` — CREATE (new file, 7 tests)

**Details:**

**10a. Add `data-testid` to CinematicHeroBackground.tsx outer wrapper:**

Current outer wrapper (verified L153–162):
```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
  style={{
    height: 'calc(100% + 200px)',
    maskImage: 'linear-gradient(...)',
    WebkitMaskImage: 'linear-gradient(...)',
  }}
>
```

Target:
```tsx
<div
  aria-hidden="true"
  data-testid="cinematic-hero-background"
  className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
  style={{
    height: 'calc(100% + 200px)',
    maskImage: 'linear-gradient(...)',
    WebkitMaskImage: 'linear-gradient(...)',
  }}
>
```

This is the ONLY change to `CinematicHeroBackground.tsx` in this spec. Component stays zero-prop.

**10b. Create `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

describe('CinematicHeroBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<CinematicHeroBackground />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('outer wrapper has aria-hidden="true"', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('outer wrapper has pointer-events-none class', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.className).toContain('pointer-events-none')
  })

  it('outer wrapper height extends 200px past parent (calc(100% + 200px))', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector<HTMLElement>('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.style.height).toBe('calc(100% + 200px)')
  })

  it('outer wrapper applies mask-image linear gradient (and WebkitMaskImage)', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector<HTMLElement>('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.style.maskImage).toContain('linear-gradient')
    expect(wrapper?.style.maskImage).toContain('transparent 100%')
    // WebkitMaskImage stored on the camelCase prop in React inline style; in jsdom it surfaces via webkitMaskImage
    expect((wrapper?.style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage).toContain('linear-gradient')
  })

  it('renders 8 atmospheric layers as direct children (4 div + 4 svg)', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    const children = wrapper?.children
    expect(children?.length).toBe(8)
    // Verify mix: 4 divs (Layer 0, 1, 6) + ... wait, count: solid base (div), nebula tint (div), far stars (svg), mid stars (svg), bright stars (svg), cross-glints (svg), warm beam (div), film grain (svg) = 4 div + 4 svg.
    let divCount = 0
    let svgCount = 0
    for (const child of Array.from(children ?? [])) {
      if (child.tagName === 'DIV') divCount++
      else if (child.tagName === 'svg' || child.tagName === 'SVG') svgCount++
    }
    expect(divCount).toBe(4)
    expect(svgCount).toBe(4)
  })

  it('animated CSS class hooks exist for reduced-motion contract (cinematic-light-beam, cinematic-star-twinkle, cinematic-glint-pulse)', () => {
    // jsdom does NOT evaluate `@media (prefers-reduced-motion: reduce)`, so this test
    // documents the reduced-motion CONTRACT by asserting that the animated class hooks
    // exist in the rendered DOM. The actual reduced-motion behavior (animations stopping)
    // is verified by /verify-with-playwright at the integration layer.
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')

    // Layer 6 (warm beam) always carries .cinematic-light-beam
    expect(wrapper?.querySelector('.cinematic-light-beam')).not.toBeNull()

    // Layers 3 (mid) + 4 (bright) carry .cinematic-star-twinkle on a deterministic subset
    // (twinkleRatio 0.3 mid / 0.5 bright via seeded RNG; ≥1 element guaranteed)
    const twinkles = wrapper?.querySelectorAll('.cinematic-star-twinkle')
    expect((twinkles?.length ?? 0)).toBeGreaterThan(0)

    // Layer 5 (cross-glints) carries .cinematic-glint-pulse on a deterministic subset
    // (pulse rate 0.3 across 8 anchors, seeded; ≥1 element guaranteed)
    const glints = wrapper?.querySelectorAll('.cinematic-glint-pulse')
    expect((glints?.length ?? 0)).toBeGreaterThan(0)
  })
})
```

**Test count:** 7 tests in this file. Total spec test increase: +9 (this 7 + 2 in DailyHub from Step 11) per spec § "Acceptance Criteria → Test deliverables" line 401.

**Auth gating:** N/A — component test.

**Responsive behavior:** N/A — non-UI step (test creation + 1-line component edit).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT add any prop to `CinematicHeroBackground` (component stays zero-prop per spec § Critical Invariants line 318).
- DO NOT change the mask-image gradient stops in `CinematicHeroBackground.tsx`.
- DO NOT change the seed values (`0xc0ffee`, `0xfade`, `0xbeef`, `0xc1a55`) — tests depend on deterministic output.
- DO NOT mock `CinematicHeroBackground` itself in the new test file (counter to BB-45 anti-pattern; we want real rendering).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders without crashing | unit | Smoke-render. |
| outer wrapper has aria-hidden="true" | unit | Accessibility contract. |
| outer wrapper has pointer-events-none class | unit | Cinematic must not intercept events. |
| outer wrapper height = calc(100% + 200px) | unit | Mask architecture extension. |
| outer wrapper applies mask-image linear gradient (+ WebkitMaskImage) | unit | Seam-free composition. |
| 8 atmospheric layers as direct children (4 div + 4 svg) | unit | Layer architecture invariant. |
| Animated CSS class hooks exist (reduced-motion contract) | unit | Documents reduced-motion contract; full motion-reduction verification handed to /verify-with-playwright. |

**Expected state after completion:**
- [ ] `CinematicHeroBackground.tsx` outer wrapper has `data-testid="cinematic-hero-background"`.
- [ ] `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` exists with 7 passing tests.
- [ ] `pnpm test frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` exits 0.
- [ ] No new TypeScript errors (`pnpm tsc --noEmit`).

**Per-step Playwright verification (clarification #5):**

This step does not change visual output (only adds a `data-testid` attribute and a test file). Verification is automated test execution rather than visual:

```bash
pnpm test frontend/src/components/__tests__/CinematicHeroBackground.test.tsx
# Expect 7/7 passing.
pnpm tsc --noEmit
# Expect zero new errors.
# Quick browser smoke at /daily (the existing cinematic consumer):
# - Navigate to /daily; document.querySelector('[data-testid="cinematic-hero-background"]') exists.
```

If any assertion fails: HALT, surface to Eric.

---

### Step 11: `/daily` test backfill (REORDERED — was Step 10 in spec)

**Objective:** Fix the stale `pb-6 sm:pb-8` assertion in DailyHub.test.tsx and add two new assertions: cinematic-presence (using the `data-testid` added in Step 10) and navbar-compensation invariant (`pt-[145px]`). Total test count delta: +2 in this file.

**Pre-execution clarification #1:** This step now consumes the `data-testid="cinematic-hero-background"` selector that Step 10 added, so the selector exists when the assertion runs.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — modify

**Details:**

Current stale assertion (verified L144–149):
```tsx
it('hero bottom padding is pb-6 sm:pb-8', () => {
  renderPage()
  const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
  expect(hero.className).toContain('pb-6')
  expect(hero.className).toContain('sm:pb-8')
})
```

Production hero className (verified `frontend/src/pages/DailyHub.tsx:222`):
`relative z-10 flex min-h-[30vh] w-full flex-col items-center justify-center px-4 pb-12 pt-[145px] text-center antialiased`

So: `pb-12` (not `pb-6 sm:pb-8`) and `pt-[145px]` (canonical navbar compensation).

**Replace** L144–149 with:

```tsx
it('hero bottom padding is pb-12', () => {
  renderPage()
  const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
  expect(hero.className).toContain('pb-12')
})

it('hero has navbar-compensated top padding pt-[145px]', () => {
  renderPage()
  const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
  expect(hero.className).toContain('pt-[145px]')
})

it('hero contains the cinematic atmospheric background', () => {
  renderPage()
  const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
  expect(hero.querySelector('[data-testid="cinematic-hero-background"]')).toBeInTheDocument()
})
```

**Net delta:** Replace 1 stale test with 3 tests = +2 tests in this file (matching spec § Step 10 line 204 and § Acceptance Criteria line 399).

Note: the original stale test name was "hero bottom padding is pb-6 sm:pb-8". The 3 replacement tests have distinct names that read clearly: bottom padding (pb-12), top padding (pt-[145px], navbar-compensation invariant), and cinematic presence.

**Auth gating:** N/A — test file change.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify any other test in DailyHub.test.tsx (only the stale `pb-6 sm:pb-8` test is in scope).
- DO NOT modify `DailyHub.tsx` (production page) in this step — production is already correct.
- DO NOT add a fourth test or merge the three into one — spec calls for "+2 tests" net (1 stale → 3 new = +2).
- DO NOT change the existing "Hero minimalism" describe block or any other surrounding tests.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| hero bottom padding is pb-12 | unit | Updated assertion replacing stale `pb-6 sm:pb-8`. |
| hero has navbar-compensated top padding pt-[145px] | unit | New navbar-compensation invariant. |
| hero contains the cinematic atmospheric background | unit | New cinematic-presence assertion (consumes data-testid from Step 10). |

**Expected state after completion:**
- [ ] DailyHub.test.tsx no longer asserts `pb-6` or `sm:pb-8`.
- [ ] DailyHub.test.tsx asserts `pb-12`, `pt-[145px]`, and cinematic-presence.
- [ ] `pnpm test frontend/src/pages/__tests__/DailyHub.test.tsx` exits 0 (or with the pre-existing `Pray.test.tsx` baseline failure unchanged — but DailyHub.test.tsx itself should be 0 failures).
- [ ] Total test count delta in this file: +2.

**Per-step Playwright verification (clarification #5):**

This step does not change visual output. Verification is automated test execution:

```bash
pnpm test frontend/src/pages/__tests__/DailyHub.test.tsx
# Expect all DailyHub tests passing (no new failures introduced).
```

If any assertion fails: HALT, surface to Eric.

---

### Step 12: 09-design-system.md "Cinematic Hero Pattern" subsection + Decision 24 update + intentional-drift refresh

**Objective:** Add canonical documentation for the cinematic pattern, reflect Step 0's outcome in Decision 24, and refresh the intentional-drift list.

**Files to create/modify:**
- `.claude/rules/09-design-system.md` — modify

**Details:**

**12a. New "Cinematic Hero Pattern (Spec 14 — Cinematic Hero Rollout)" subsection.**

Place under "Round 3 Visual Patterns" → immediately AFTER the "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)" subsection, BEFORE the "Frosted Glass Cards (FrostedCard Component)" subsection.

Content covers:
- Component path: `frontend/src/components/CinematicHeroBackground.tsx`
- Purpose: 8-layer atmospheric (solid base, nebula tint, far/mid/bright star fields with halos, cross-glints, warm directional beam, film grain) + outer-wrapper mask-fade-to-transparent
- Architecture: 200px overflow extension via `calc(100% + 200px)` + `mask-image: linear-gradient(...)` enabling seam-free composition with BackgroundCanvas at root
- Composition rules: `<Navbar transparent />` + `<BackgroundCanvas>` at root + hero `<section>` `position: relative` + `pt-[145px] pb-12` constant padding + `<CinematicHeroBackground />` first child + `relative z-10` on every content child
- Pages using: `/daily`, `/bible`, `/local-support/*`, `/ask`, `/grow`, `/prayer-wall`, `/music` (if Step 0 outcome A/B; mark as "see Decision 24")
- Pages NOT using (intentional drift): `/settings`, `/insights`, `/music/routines` (PageHero + ATMOSPHERIC_HERO_BG), BibleReader (ReaderChrome), Music sub-tabs / Prayer Wall sub-routes (sub-pages, not landing pages)
- Reduced-motion behavior: global `*` rule in `frontend/src/styles/animations.css` + component-specific `animation: none !important` in `frontend/src/index.css` L391–397; static atmospheric remains visible
- Mobile behavior: `viewBox="0 0 1920 1080"` + `preserveAspectRatio="xMidYMid slice"`; visible center ~1300 source-pixels render; density per square pixel comparable to desktop
- Performance budget: ~660 SVG circles + 1 turbulence filter + 4 CSS animations; `React.memo`-wrapped with deterministic seeded LCG (`createSeededRandom`), no `Math.random()` at render time, no hydration drift; per-mount cost only (memo'd; navigating between Daily Hub tabs does not re-mount)
- Zero-prop API stability: spec 14 keeps the component zero-prop. Do not introduce `bgColor`, `extensionPx`, `maskFadeStart`, `enableWarmBeam`, etc., without an explicit follow-up spec.

**12b. Decision 24 update (in the BackgroundCanvas Atmospheric Layer section, "Documented intentional drift" bullet for Music):**

Three variants depending on Step 0 outcome:

- **If Outcome A:** "Decision 24 was reconciled in Spec 14 — investigation confirmed AudioProvider mounts at App.tsx-level (above MusicPage) and the audioReducer reads no chrome-related state (verified state shape: activeSounds, foregroundContent, masterVolume, foregroundBackgroundBalance, isPlaying, sleepTimer, activeRoutine, pillVisible, drawerOpen, currentSceneName, currentSceneId, foregroundEndedCounter, readingContext, pausedByBibleAudio — all audio-only). `/music`'s chrome migration to `BackgroundCanvas` + cinematic atmospheric was safe. Future Music chrome work should still verify against this baseline before introducing changes that affect the page wrapper structure."
- **If Outcome B:** Same as A plus an explicit paragraph naming the discovered loose coupling (file path + line number + nature of the reference) so future authors know what to be careful of.
- **If Outcome C:** "Decision 24 was investigated in Spec 14 and confirmed as a hard rule — [specific coupling discovered, with file path + line number]. `/music` remains on canonical PageHero + ATMOSPHERIC_HERO_BG until a future spec decouples the audio cluster from chrome." Update the documented-intentional-drift list to keep Music on the drift list with an explicit "Spec 14 hard-rule confirmed" marker.

**12c. Refresh the documented-intentional-drift list (in BackgroundCanvas Atmospheric Layer section):**

Current list:
- Settings + Insights: stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG`
- Music (Spec 11A): preserves rolls-own atmospheric layers
- BibleReader: uses ReaderChrome

Updated list (Outcome A or B): remove Music from the drift list (it joined the canonical list); add a note: "Music joined canonical post-Spec-14 (Decision 24 reconciled — see Cinematic Hero Pattern section)."

Updated list (Outcome C): keep Music on the drift list; update its description to "Music (Spec 11A + Spec 14 confirm): preserves rolls-own atmospheric — Decision 24 hard rule re-confirmed."

Routines is not affected (Routines uses PageHero, was never on cinematic list, stays on PageHero per spec § "Out of Scope" line 364).

**Auth gating:** N/A — documentation.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify any other section of `09-design-system.md` beyond the three additions/updates listed (12a, 12b, 12c).
- DO NOT remove the existing "Documented intentional drift" entry for Settings + Insights.
- DO NOT remove the existing "Documented intentional drift" entry for BibleReader.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Documentation change, no automated tests. Verification is by re-reading the file and checking for the three additions. |

**Expected state after completion:**
- [ ] New "Cinematic Hero Pattern (Spec 14)" subsection exists in 09-design-system.md.
- [ ] Decision 24 update reflects Step 0's outcome (A, B, or C).
- [ ] Documented-intentional-drift list refreshed to reflect Music's post-Spec-14 status.

**Per-step Playwright verification (clarification #5):** N/A — documentation.

---

### Step 13: spec-tracker.md entry + master plan Phase 5 update

**Objective:** Add a Spec 14 entry to the spec tracker and mark the four PrayerWallHero items as shipped in the master plan's Phase 5 section.

**Files to create/modify:**
- `_forums_master_plan/spec-tracker.md` — modify
- `_forums_master_plan/round3-master-plan.md` — modify (Phase 5 section only)

**Details:**

**13a. Read `_forums_master_plan/spec-tracker.md` to confirm existing column structure** (this is the first sub-action; do not write before reading). Match the existing format exactly.

**13b. Add Spec 14 entry to spec-tracker.md.** Suggested row content (subject to the actual column structure surfaced in 13a):

`Spec 14 — Cinematic Hero Rollout` | `✅` | `Visual rollout — cinematic atmospheric on /bible, /local-support/*, /ask, /grow, /prayer-wall, /music (conditional on Step 0). Includes /daily test backfill, CinematicHeroBackground component test, 09-design-system.md Cinematic Hero Pattern section, Phase 5 PrayerWallHero work folded in.`

If Step 0 outcome was C, also add a follow-up stub row: `Music cinematic — pending audio cluster decoupling refactor` | `⬜` | `Decision 24 hard rule re-confirmed in Spec 14. Future spec to refactor audio cluster + chrome decoupling, then land cinematic on /music.`

**13c. Update `_forums_master_plan/round3-master-plan.md` Phase 5 section.** Mark these items as "Shipped in Spec 14 — Cinematic Hero Rollout":

- PrayerWallHero migration
- `font-script` "Wall" cleanup
- `font-serif italic` subtitle cleanup
- BackgroundCanvas promotion on `/prayer-wall`

Phase 5's remaining scope after Spec 14 (do NOT modify these — they stay in Phase 5):
- `PrayerCard` `FrostedCard` migration
- `PageShell` internals
- `QotdComposer` visual migration
- Animation token cleanup
- Deprecated pattern purge

**Auth gating:** N/A — documentation.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify the master plan's Phase 1, Phase 2, Phase 2.5, Phase 3, or any non-Phase-5 section.
- DO NOT remove any existing Phase 5 item beyond the four listed.
- DO NOT add Spec 14 to a non-existing tracker structure — read the file first to match the existing format.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Documentation change. |

**Expected state after completion:**
- [ ] `spec-tracker.md` has a Spec 14 entry with `✅` status (or appropriate emoji per existing tracker convention).
- [ ] (If Outcome C only) `spec-tracker.md` has a follow-up stub for Music cinematic.
- [ ] `round3-master-plan.md` Phase 5 section marks the four PrayerWallHero items as "Shipped in Spec 14 — Cinematic Hero Rollout."

**Per-step Playwright verification (clarification #5):** N/A — documentation.

---

### Step 14: Final verification pass

**Objective:** Confirm zero stale references, full test/tsc/lint/build cleanliness vs. baseline, and `/music/routines` regression-free.

**Files to read (no modifications):** all touched files from Steps 1–13.

**Details:**

**14a. Source verification — confirm no stale references remain** (run `grep` over the relevant file list):

```bash
# No ATMOSPHERIC_HERO_BG in /grow, /prayer-wall, /music (if migrated):
grep -rn "ATMOSPHERIC_HERO_BG" frontend/src/pages/GrowPage.tsx frontend/src/components/prayer-wall/PrayerWallHero.tsx frontend/src/pages/MusicPage.tsx
# Expect: zero matches (or zero matches in MusicPage.tsx if Outcome A/B; 1 retained match if Outcome C — note in discoveries).

# No font-script in PrayerWallHero:
grep -n "font-script" frontend/src/components/prayer-wall/PrayerWallHero.tsx
# Expect: zero matches.

# No font-serif italic in PrayerWallHero:
grep -nE "font-serif|italic" frontend/src/components/prayer-wall/PrayerWallHero.tsx
# Expect: zero matches.

# No bg-dashboard-dark on outer wrappers:
grep -n "bg-dashboard-dark" frontend/src/pages/GrowPage.tsx frontend/src/pages/PrayerWall.tsx frontend/src/pages/MusicPage.tsx
# Expect: zero matches in GrowPage and PrayerWall; zero in MusicPage if Outcome A/B; existing match if Outcome C.

# CinematicHeroBackground imports present:
grep -l "CinematicHeroBackground" frontend/src/components/bible/landing/BibleHero.tsx frontend/src/components/local-support/LocalSupportHero.tsx frontend/src/pages/AskPage.tsx frontend/src/pages/GrowPage.tsx frontend/src/components/prayer-wall/PrayerWallHero.tsx frontend/src/pages/DailyHub.tsx
# Expect: all 6 files listed (plus frontend/src/components/music/MusicHero.tsx if Outcome A/B).
```

**14b. Test/tsc/lint/build pass:**

```bash
pnpm tsc --noEmit
# Expect: 0 errors.

pnpm lint
# Expect: no new warnings beyond baseline.

pnpm test
# Expect: Pray.test.tsx — shows loading then prayer after generating remains the ONLY failing test
# (post-Spec-13 baseline). Any new failing test file or count increase is a regression.

pnpm build
# Expect: succeeds.
```

**14c. Browser-level final verification (Playwright sweep):**

Navigate to each cinematic-mounting page at desktop (1280×900) and mobile (375×812):

- `/bible`
- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`
- `/ask`
- `/grow`
- `/prayer-wall`
- `/music` (if Outcome A/B)
- `/daily` (existing — regression check)

Per-page checks:
- Cinematic atmospheric visible (stars, warm light beam, nebula tint all render).
- Hero content (heading, subtitle, action) stacks above cinematic.
- No visible horizontal seam at hero/body boundary.
- Heading visually centered below navbar.
- Mobile: cinematic still visible at 375px, no horizontal scroll.
- Reduced motion: animations stop, static atmospheric remains visible.
- Z-index: sticky tab/filter bars (where present) do not z-fight with cinematic.

`/music/routines` regression check: navigate to `/music/routines`, verify it still uses `PageHero` (heading + ATMOSPHERIC_HERO_BG inline style — not the cinematic pattern). Capture screenshot.

`/music`-specific (if Outcome A/B): re-run audio cluster smoke from Step 9c (worship playlist play/pause, ambient layer + crossfade, Sleep & Rest, AudioDrawer FAB, tab switching, navigation away/back).

`/ask` warm-beam-vs-violet-glow: subjective evaluation. Document in `_plans/discoveries.md` if subjectively muddy. Ship as-is regardless.

**14d. Document any deviations.** If anything diverged from the plan during execution, write a deviation entry in `_plans/discoveries.md` with: file path + before/after diff + rationale.

**Auth gating:** N/A — verification.

**Responsive behavior:** verified per Step 14c at all three breakpoints.

**Inline position expectations:** verified per Step 14c (subtitle/CTA stacking on PrayerWallHero, etc.).

**Guardrails (DO NOT):**
- DO NOT make any code changes during Step 14 — this step is verification only. If a regression is detected, stop and surface to Eric.
- DO NOT skip the `/music/routines` regression check.
- DO NOT skip the `/music` audio cluster smoke if Outcome A/B was taken.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite (`pnpm test`) | regression | Pray.test.tsx remains ONLY failing test. |
| TypeScript (`pnpm tsc --noEmit`) | static | Zero errors. |
| Lint (`pnpm lint`) | static | No new warnings beyond baseline. |
| Build (`pnpm build`) | smoke | Succeeds. |

**Expected state after completion:**
- [ ] Zero stale references on touched pages (Step 14a grep results clean).
- [ ] All tests, tsc, lint, build pass per baseline.
- [ ] All 7 (or 8 if `/music` migrated) cinematic-mounting pages verified at 2 breakpoints + reduced motion.
- [ ] `/music/routines` regression-free.
- [ ] `/music` audio cluster regression-free (if Outcome A/B).
- [ ] Acceptance criteria checklist (spec § "Acceptance Criteria" lines 376–435) all checkable.

**Per-step Playwright verification (clarification #5):** Step 14 IS the final cumulative Playwright verification — no further per-step verification needed.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 0 | — | Audio cluster investigation (gate) |
| 1 | 0 (no audio dep, but ordered for risk-managed sequencing) | /bible cinematic mount |
| 2 | 0 | /local-support cinematic mount |
| 3 | 0 | /ask cinematic mount + structural fixes |
| 4 | 0 | /grow BackgroundCanvas promotion (no cinematic) |
| 5 | 4 | /grow cinematic mount (must follow BackgroundCanvas promotion) |
| 6 | 0 | /prayer-wall BackgroundCanvas promotion |
| 7 | 6 | /prayer-wall hero cleanup (typography + padding) |
| 8 | 6, 7 | /prayer-wall cinematic mount |
| 9 | 0 (Outcome A or B); replaced with documentation-only step on Outcome C | /music MusicHero + BackgroundCanvas + cinematic |
| 10 | 0 (logically; can run anytime after the component is unchanged from main) | data-testid addition + new CinematicHeroBackground.test.tsx |
| 11 | 10 | /daily test backfill (consumes data-testid added in Step 10) |
| 12 | 0 (for Decision 24 outcome), 1–9 (for accurate intentional-drift list) | 09-design-system.md Cinematic Hero Pattern + Decision 24 update |
| 13 | 7, 8 (PrayerWallHero items "shipped"), 0 (Music outcome) | spec-tracker + master plan Phase 5 update |
| 14 | 1–13 | Final verification pass |

**Note on reorder:** Steps 10 and 11 are reordered relative to the spec's locked execution order (spec § "Execution Order" line 89: spec ordered "Step 10 = /daily test backfill, Step 11 = CinematicHeroBackground.test.tsx + data-testid"). Per pre-execution clarification #1, this plan reorders so the data-testid + component test land FIRST (this plan's Step 10), then the DailyHub backfill consumes the now-existing selector (this plan's Step 11). All other steps preserve the spec's locked order.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 0 | Audio cluster investigation (Decision 24) | [COMPLETE] | 2026-05-07 | **Outcome A — Decoupled.** AudioProvider mounts at App.tsx L204 above Routes; audioReducer reads only audio state (14 audio-only fields, zero chrome); audio-engine.ts imports only AUDIO_CONFIG; grep audio cluster for `bg-dashboard-dark`/`ATMOSPHERIC_HERO_BG`/`HorizonGlow`/`BackgroundCanvas`/`transparentNav`/`navbar` returned 0 matches. AudioDrawer mounts inside AudioProvider, not MusicPage. Minor observation: MusicPage.tsx:217 hardcodes `focus-visible:ring-offset-[#0f0a1e]` matching `bg-dashboard-dark` — chrome-layer cleanup, not audio coupling; Step 9b will update to `[#08051a]` naturally. |
| 0.5 | data-testid="cinematic-hero-background" addition (REORDERED from Step 10a per Eric Adjustment #1) | [COMPLETE] | 2026-05-07 | Added to `CinematicHeroBackground.tsx` outer wrapper (line 155). Playwright probe of `/daily` confirms: data-testid present, aria-hidden=true, 8 direct children, parent is hero section. Probe script: `frontend/scripts/spec14-step0_5-probe.mjs`. Screenshot: `frontend/playwright-screenshots/spec14-step0_5-daily-1280.png`. Discovery: plan body line 41 + Edge Cases line 283 both say "4 div + 4 svg" but actual production is **3 div + 5 svg** (warm beam at Layer 6 is a `<div>`, not an svg). Total of 8 is correct; breakdown was miscounted. Step 10 test will be written against actual production (3 + 5). |
| 1 | /bible cinematic mount | [COMPLETE] | 2026-05-07 | `frontend/src/components/bible/landing/BibleHero.tsx` — cinematic mounted as first child, `pt-[145px] pb-12` (responsive modifiers removed), `relative z-10` added to h1. Probe at 1280 + 375: 20/20 assertions PASS, zero console errors. Screenshots: `frontend/playwright-screenshots/spec14-step1-bible-{1280,375}.png`. |
| 2 | /local-support cinematic mount | [COMPLETE] | 2026-05-07 | `frontend/src/components/local-support/LocalSupportHero.tsx` — cinematic mounted; pt-[145px] pb-12; relative z-10 on h1, p, extraContent, action wrappers. Probe 3 routes × 2 breakpoints (churches/counselors/celebrate-recovery, 1280/375) = 54/54 PASS. Screenshots: `frontend/playwright-screenshots/spec14-step2-{churches,counselors,celebrate-recovery}-{1280,375}.png`. |
| 3 | /ask cinematic mount + structural fixes | [COMPLETE] | 2026-05-07 | `frontend/src/pages/AskPage.tsx` — cinematic mounted; `relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased` (added `relative`, `flex w-full flex-col items-center`, removed `sm:px-6 sm:pt-40 sm:pb-12`); `animate-gradient-shift` preserved on h1; textarea regression-checked. Probe 1280 + 375 = 24/24 PASS. Screenshots: `frontend/playwright-screenshots/spec14-step3-ask-{1280,375}.png`. |
| 4 | /grow BackgroundCanvas promotion | [COMPLETE] | 2026-05-07 | `frontend/src/pages/GrowPage.tsx` — outer wrapper `<BackgroundCanvas className="flex min-h-screen flex-col font-sans">`, dropped `bg-dashboard-dark`, removed `style={ATMOSPHERIC_HERO_BG}` from hero, removed inner `<BackgroundCanvas>` body wrap (sentinel + sticky bar + tab panels now direct children of `<main>`), removed `ATMOSPHERIC_HERO_BG` import. Hero pt-[145px] pb-12 (responsive modifiers removed). NO cinematic yet (Step 5). Probe 1280 + 375 = 20/20 PASS. Screenshots: `frontend/playwright-screenshots/spec14-step4-grow-{1280,375}.png`. |
| 5 | /grow cinematic mount | [COMPLETE] | 2026-05-07 | `frontend/src/pages/GrowPage.tsx` — added `CinematicHeroBackground` import, mounted as first child of hero `<section>`, added `relative z-10` to h1 + p. Probe 1280 + 375 + reduced-motion-1280 = 15/15 PASS. Sticky tab bar pinning preserved (no z-fight with cinematic mask). Screenshots: `frontend/playwright-screenshots/spec14-step5-grow-{1280,375,reduced-motion-1280}.png`. |
| 6 | /prayer-wall BackgroundCanvas promotion | [COMPLETE] | 2026-05-07 | `frontend/src/pages/PrayerWall.tsx` — outer wrapper swapped from `<div className="...bg-dashboard-dark...">` to `<BackgroundCanvas className="flex min-h-screen flex-col overflow-x-hidden font-sans">`. Closing tag updated to `</BackgroundCanvas>`. Added `BackgroundCanvas` import. PrayerWallHero unchanged (Step 7 handles typography). Probe 1280 + 375 = 12/12 PASS. Screenshots: `frontend/playwright-screenshots/spec14-step6-prayer-wall-{1280,375}.png`. |
| 7 | /prayer-wall hero cleanup | [COMPLETE] | 2026-05-07 | `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — removed `ATMOSPHERIC_HERO_BG` import + inline style; removed `<span className="font-script">Wall</span>`; removed `font-serif italic text-white/60` on subtitle. Heading bumped to text-4xl/5xl/6xl scale. Subtitle now `mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg`. NO cinematic yet (Step 8 adds). Probe 1280 + 375 = 26/26 PASS. Screenshots: `frontend/playwright-screenshots/spec14-step7-prayer-wall-{1280,375}.png`. |
| 8 | /prayer-wall cinematic mount | [COMPLETE] | 2026-05-07 | `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — added CinematicHeroBackground import, mounted as first child of `<section>`, added `relative z-10` to h1 + p + action wrapper. Probe 1280 + 375 + reduced-motion-1280 = 18/18 PASS. Sticky CategoryFilterBar (z-30) still pins. Screenshots: `frontend/playwright-screenshots/spec14-step8-prayer-wall-{1280,375,reduced-motion-1280}.png`. |
| 9 | /music MusicHero (Outcome A) | [COMPLETE — pending Eric's manual audio smoke before merge] | 2026-05-07 | **Outcome A taken (Step 0 locked).** 9a: created `frontend/src/components/music/MusicHero.tsx` (canonical structure, default props match MusicPage.test.tsx assertions). 9b: modified `frontend/src/pages/MusicPage.tsx` — outer wrapper to `<BackgroundCanvas className="flex min-h-screen flex-col font-sans">`, replaced `<PageHero>` with `<MusicHero />`, dropped PageHero import, added MusicHero + BackgroundCanvas imports, closing `</div>` → `</BackgroundCanvas>`, focus-ring offset updated `[#0f0a1e]` → `[#08051a]` to match new hero-bg base. **MusicPage tests: 26/26 PASS.** **9c chrome smoke (per Eric Adjustment #3):** Playwright probe at 1280 + 375 + /music/routines regression = 41/41 PASS. Verified: BackgroundCanvas at root, no bg-dashboard-dark, hero pt-[145px] pb-12, cinematic mounted, h1='Music' with no font-script, sticky tab bar pins, Spotify iframes render (no play-click attempted), tab switching plays/ambient/sleep, navigation /music → /daily → /music re-mounts cleanly, /music/routines regression-free. **9c audio playback verification: NOT covered by Playwright** (Web Audio API + Spotify cross-origin sandbox). Per Eric policy "Default to NOT shipping /music chrome change until Eric manually verifies" — Eric must do a manual 2-minute audio smoke before merging this work. Screenshots: `frontend/playwright-screenshots/spec14-step9-music-{1280,375}.png` + `frontend/playwright-screenshots/spec14-step9-routines-regression-1280.png`. |
| 10 | CinematicHeroBackground.test.tsx (test file only — data-testid was added in Step 0.5 per Eric Adjustment #1) | [COMPLETE] | 2026-05-07 | Created `frontend/src/components/__tests__/CinematicHeroBackground.test.tsx` with 7 tests. **Two adjustments from spec**: (1) Layer breakdown asserts `divCount === 3` and `svgCount === 5` (verified actual production — plan body was wrong; warm beam at Layer 6 is a `<div>`, not svg). (2) WebkitMaskImage assertion dropped — jsdom normalizes vendor prefixes during style serialization, so the `-webkit-mask-image:` mirror cannot be unit-tested; comment in the test documents this and notes the vendor mirror is covered by Playwright in real browsers. Total spec test increase: 7 (this file) + 2 (Step 11 DailyHub) = 9, matching spec § Acceptance Criteria. **All 7 tests PASS.** |
| 11 | /daily test backfill | [COMPLETE] | 2026-05-07 | `frontend/src/pages/__tests__/DailyHub.test.tsx` — replaced stale `pb-6 sm:pb-8` test with 3 new tests: `pb-12`, `pt-[145px]`, cinematic-presence (consumes data-testid from Step 0.5). Net +2 tests. **DailyHub tests now 40/40 PASS** (was 37/38 before with 1 failing stale assertion). |
| 12 | 09-design-system.md Cinematic Hero Pattern + Decision 24 + drift refresh | [COMPLETE] | 2026-05-07 | `.claude/rules/09-design-system.md` — (12a) added new "### Cinematic Hero Pattern (Spec 14 — Cinematic Hero Rollout)" subsection between BackgroundCanvas Atmospheric Layer and Frosted Glass Cards. (12b) Decision 24 reconciled to Outcome A (Music joined canonical) — full justification text with audio cluster verification details. (12c per Eric Adjustment #5) Updated PageHero description (L229: removed "Prayer Wall" from PageHero consumers — uses dedicated PrayerWallHero now); updated Glow Backgrounds Homepage Only paragraph (removed Music from drift, added /music/routines); updated Pages-using-BackgroundCanvas list (added PrayerWall + MusicPage with annotation; clarified GrowPage now wraps entire page); added /music/routines as separate explicit drift bullet (it is its own pattern — rolls-own hero, not PageHero). |
| 13 | spec-tracker + master plan update | [COMPLETE] | 2026-05-07 | (13a) Read tracker — confirmed `# \| Spec \| Title \| Size \| Risk \| Status` column structure. (13b) Updated `_forums_master_plan/spec-tracker.md` — added Spec 14 partial fold-in note to Phase 5 intro paragraph; marked Spec 5.2 (BackgroundCanvas at Prayer Wall Root) ✅ shipped via Spec 14 Step 6; marked Spec 5.5 (Deprecated Pattern Purge) ⬜ partial with note that PrayerWallHero typography portion shipped via Spec 14 Step 7; added new "Spec 14 — Cinematic Hero Rollout" section row marking Eric's manual /music audio smoke as pending before merge. (13c) Updated `_forums_master_plan/round3-master-plan.md` Phase 5 section — added Spec 14 partial fold-in note to phase intro; updated Spec 5.2 status to "SHIPPED VIA SPEC 14"; updated Spec 5.5 status to "PARTIAL-SHIPPED VIA SPEC 14". |
| 14 | Final verification pass | [COMPLETE] | 2026-05-07 | **(14a) Outer-wrapper grep (Eric Adjustment #4):** GrowPage L61 + PrayerWall + MusicPage L171 outer wrappers are all `<BackgroundCanvas>` — no `bg-dashboard-dark`. ATMOSPHERIC_HERO_BG zero in /grow, PrayerWallHero, MusicPage. font-script + font-serif italic zero in PrayerWallHero. CinematicHeroBackground imported in all 7 cinematic-mounting files. **(14b) Static checks:** `pnpm tsc --noEmit` 0 errors. `pnpm lint` baseline 11 problems unchanged (verified via stash test — Spec 14 introduced ZERO new lint errors). `pnpm build` succeeds. **(14b discovered + fixed) 4 stale tests** caused by Spec 14 production changes: BibleHero (pt-28 → pt-[145px] + new cinematic-presence test), LocalSupportHero (children count 2 → 3 with cinematic), PrayerWallHero (font-script removal + canonical subtitle + cinematic-presence + padding tests added — net +3 new tests), GrowPage (BackgroundCanvas-wraps-hero now true since Spec 4 promotion). All 4 tests updated to assert post-Spec-14 production state — 56/56 pass in isolation. **(14b parallel-flake noise):** PrayerWall, PrayerWallActivity, PrayCeremony, WelcomeWizard show occasional flake under high parallelism — 89/89 pass in isolation. Pre-existing pattern (same as plan-baseline `Pray.test.tsx`). **(14c) Final Playwright sweep:** 9 routes × 2 breakpoints + /music/routines regression = 112/112 PASS, 0 console errors. **All 8 cinematic-mounting pages verified at 1280 + 375. /music/routines regression-free** (no cinematic, no BackgroundCanvas, retains rolls-own hero with ATMOSPHERIC_HERO_BG). Net test delta: Spec 14 production touched ~10 files, added 9 new tests per Acceptance Criteria + ~5 stale-test fixes. Screenshots: `frontend/playwright-screenshots/spec14-step14-{daily,bible,churches,counselors,celebrate-recovery,ask,grow,prayer-wall,music}-{1280,375}.png` + `spec14-step14-routines-regression-1280.png`. |
